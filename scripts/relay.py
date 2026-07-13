#!/usr/bin/env python3
"""Raspberry Pi relay with a disk-backed telemetry outbox."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
import signal
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import uuid

try:
    import grpc  # noqa: F401
    sys.path.insert(0, "/opt/starlink-grpc-tools")
    import starlink_grpc
except ImportError:
    print(
        "Starlink gRPC tools not found. Install relay-requirements.txt and "
        "starlink-grpc-tools v1.2.5."
    )
    sys.exit(1)


DEFAULT_QUEUE = os.path.expanduser("~/.local/state/the-hangar-relay/outbox.sqlite3")
FLUSH_LIMIT = 20
FLUSH_BUDGET_SECONDS = 8.0
HTTP_TIMEOUT_SECONDS = 5.0
QUEUE_RETENTION_SECONDS = 30 * 24 * 60 * 60
QUARANTINE_RETENTION_SECONDS = 30 * 24 * 60 * 60
QUARANTINE_MAX_ROWS = 2_000

PUSH_SENT = "sent"
PUSH_TRANSIENT = "transient"
PUSH_PERMANENT = "permanent"

STARLINK_STATES = {
    "CONNECTED",
    "BOOTING",
    "SEARCHING",
    "STOWED",
    "THERMAL_SHUTDOWN",
    "NO_SATS",
    "OBSTRUCTED",
    "NO_DOWNLINK",
    "NO_PINGS",
    "UNKNOWN",
}


class HangarRelay:
    def __init__(
        self,
        server_url: str,
        token: str,
        queue_path: str,
        interval: int = 60,
    ):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.interval = interval
        self.running = True
        queue_dir = os.path.dirname(queue_path)
        if queue_dir:
            os.makedirs(queue_dir, exist_ok=True)
        self.db = sqlite3.connect(queue_path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS outbox (
                id TEXT PRIMARY KEY,
                body TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                next_attempt_at REAL NOT NULL DEFAULT 0,
                created_at REAL NOT NULL
            )
            """
        )
        self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS quarantine (
                id TEXT PRIMARY KEY,
                body TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at REAL NOT NULL,
                quarantined_at REAL NOT NULL
            )
            """
        )
        self.db.commit()

    def stop(self, *_args):
        self.running = False
        print("\n[relay] Shutting down...")

    def enqueue(self, source: str, payload: dict):
        sample_id = str(uuid.uuid4())
        envelope = {
            "source": source,
            "payload": payload,
            "observedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "idempotencyKey": sample_id,
        }
        self.db.execute(
            "INSERT INTO outbox (id, body, created_at) VALUES (?, ?, ?)",
            (sample_id, json.dumps(envelope), time.time()),
        )
        self.db.commit()

    def push(self, body: str, timeout: float) -> tuple[str, str | None]:
        request = urllib.request.Request(
            f"{self.server_url}/api/ingest",
            data=body.encode(),
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if 200 <= response.status < 300:
                    return PUSH_SENT, None
                return PUSH_TRANSIENT, f"HTTP {response.status}"
        except urllib.error.HTTPError as error:
            detail = error.read(300).decode(errors="replace")
            reason = f"HTTP {error.code} {detail}".strip()
            if error.code in (400, 409, 413, 415, 422):
                print(f"[relay] Permanent push rejection: {reason}")
                return PUSH_PERMANENT, reason
            print(f"[relay] Transient push failure: {reason}")
        except Exception as error:
            reason = f"{type(error).__name__}: {error}"
            print(f"[relay] Transient push error: {reason}")
        return PUSH_TRANSIENT, reason

    def flush(
        self,
        limit: int = FLUSH_LIMIT,
        budget_seconds: float = FLUSH_BUDGET_SECONDS,
    ):
        started = time.monotonic()
        now = time.time()
        expired = self.db.execute(
            "DELETE FROM outbox WHERE created_at < ?",
            (now - QUEUE_RETENTION_SECONDS,),
        ).rowcount
        expired_quarantine = self.db.execute(
            "DELETE FROM quarantine WHERE quarantined_at < ?",
            (now - QUARANTINE_RETENTION_SECONDS,),
        ).rowcount
        rows = self.db.execute(
            """
            SELECT id, body, attempts, created_at
            FROM outbox
            WHERE next_attempt_at <= ?
            ORDER BY created_at
            LIMIT ?
            """,
            (time.time(), limit),
        ).fetchall()
        sent = 0
        quarantined = 0
        attempted = 0
        for sample_id, body, attempts, created_at in rows:
            remaining = budget_seconds - (time.monotonic() - started)
            if remaining <= 0.25:
                break

            attempted += 1
            outcome, reason = self.push(
                body,
                timeout=max(0.25, min(HTTP_TIMEOUT_SECONDS, remaining)),
            )
            if outcome == PUSH_SENT:
                self.db.execute("DELETE FROM outbox WHERE id = ?", (sample_id,))
                sent += 1
                continue

            if outcome == PUSH_PERMANENT:
                self.db.execute(
                    """
                    INSERT OR REPLACE INTO quarantine (
                        id, body, reason, created_at, quarantined_at
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        sample_id,
                        body,
                        reason or "permanent rejection",
                        created_at,
                        time.time(),
                    ),
                )
                self.db.execute("DELETE FROM outbox WHERE id = ?", (sample_id,))
                quarantined += 1
                continue

            next_attempt = time.time() + min(300, 2 ** min(attempts + 1, 8))
            self.db.execute(
                "UPDATE outbox SET attempts = ?, next_attempt_at = ? WHERE id = ?",
                (attempts + 1, next_attempt, sample_id),
            )
            # A network failure will affect later rows too; retry them next loop.
            break
        trimmed_quarantine = self.db.execute(
            """
            DELETE FROM quarantine
            WHERE rowid IN (
                SELECT rowid
                FROM quarantine
                ORDER BY quarantined_at DESC
                LIMIT -1 OFFSET ?
            )
            """,
            (QUARANTINE_MAX_ROWS,),
        ).rowcount
        self.db.commit()
        queued = self.db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]
        quarantine_count = self.db.execute(
            "SELECT COUNT(*) FROM quarantine"
        ).fetchone()[0]
        elapsed = time.monotonic() - started
        print(
            f"[relay] Flush attempted {attempted}, sent {sent}, "
            f"quarantined {quarantined}, dropped {expired} expired; "
            f"{queued} queued, {quarantine_count} quarantined "
            f"({expired_quarantine} expired, {trimmed_quarantine} over cap); "
            f"{elapsed:.1f}s"
        )

    def poll_starlink(self) -> dict | None:
        try:
            status, _obstruction, _alerts = starlink_grpc.status_data()
        except Exception as error:
            print(f"[relay] Starlink poll error: {error}")
            return None

        if not isinstance(status, dict):
            print(
                "[relay] Starlink poll error: status_data returned invalid status data"
            )
            return None

        raw_state = status.get("state")
        if not isinstance(raw_state, str) or not raw_state.strip():
            print("[relay] Starlink poll error: status data has no usable state")
            return None

        state = raw_state.strip().upper()
        if state not in STARLINK_STATES:
            print(f"[relay] Unrecognized Starlink state {state!r}; recording UNKNOWN")
            state = "UNKNOWN"
        payload = {
            "state": state,
            "connected": state == "CONNECTED",
            "uptimeSeconds": status.get("uptime"),
            "downlinkThroughputBps": status.get("downlink_throughput_bps"),
            "uplinkThroughputBps": status.get("uplink_throughput_bps"),
            "latencyMs": status.get("pop_ping_latency_ms"),
            "firmwareVersion": status.get("software_version"),
        }
        fraction_obstructed = status.get("fraction_obstructed")
        if isinstance(fraction_obstructed, (int, float)):
            payload["obstructionAvg"] = fraction_obstructed * 100
        return {key: value for key, value in payload.items() if value is not None}

    def run(self):
        print(f"[relay] Starting: server={self.server_url} interval={self.interval}s")
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

        try:
            while self.running:
                sample = self.poll_starlink()
                if sample is not None:
                    self.enqueue("starlink", sample)
                self.flush()
                for _ in range(self.interval):
                    if not self.running:
                        break
                    time.sleep(1)
        finally:
            self.db.close()
        print("[relay] Stopped.")


def main():
    parser = argparse.ArgumentParser(description="The Hangar Pi relay")
    parser.add_argument("--server", required=True, help="Cloud server URL")
    parser.add_argument(
        "--interval", type=int, default=60, help="Poll interval in seconds"
    )
    parser.add_argument("--queue", default=DEFAULT_QUEUE, help="SQLite outbox path")
    args = parser.parse_args()

    token = os.environ.get("INGEST_TOKEN", "").strip()
    if not token:
        parser.error("INGEST_TOKEN must be set in the environment")

    HangarRelay(args.server, token, args.queue, max(10, args.interval)).run()


if __name__ == "__main__":
    main()
