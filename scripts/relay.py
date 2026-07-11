#!/usr/bin/env python3
"""
The Hangar — Raspberry Pi Relay Script

Runs on a Raspberry Pi at the house. Polls the Starlink dish via local gRPC
and pushes status to the cloud API. Also handles future sensors (water tanks,
gas bottles, pool temperature) via the same endpoint.

INSTALL:
  pip3 install grpcio grpcio-tools

USAGE:
  python3 relay.py --server https://your-domain.com --token YOUR_INGEST_TOKEN

Run as a systemd service for reliability. See relay.service template below.
"""

import argparse
import json
import signal
import sys
import time
import urllib.request

try:
    import grpc
    sys.path.insert(0, "/opt/starlink-grpc-tools")
    import starlink_grpc
except ImportError:
    print("Starlink gRPC tools not found. Install with:")
    print("  pip3 install grpcio grpcio-tools")
    print("  git clone https://github.com/sparky8512/starlink-grpc-tools /opt/starlink-grpc-tools")
    sys.exit(1)


class HangarRelay:
    def __init__(self, server_url: str, token: str, interval: int = 60):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.interval = interval
        self.running = True

    def stop(self, *_args):
        self.running = False
        print("\n[relay] Shutting down...")

    def push(self, source: str, payload: dict):
        url = f"{self.server_url}/api/ingest"
        body = json.dumps({"source": source, "payload": payload}).encode()
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    print(f"[relay] Pushed {source} data OK")
                else:
                    print(f"[relay] Push {source} failed: HTTP {resp.status}")
        except Exception as e:
            print(f"[relay] Push {source} error: {e}")

    def poll_starlink(self) -> dict:
        try:
            status = starlink_grpc.status_data()
            obstruction = starlink_grpc.obstruction_stats()

            return {
                "connected": True,
                "obstructionAvg": obstruction.get("fraction_obstructed", 0) * 100,
                "uptimeSeconds": status.get("device_info", {}).get("uptime", 0),
                "downlinkThroughputBps": status.get("device_info", {}).get("downlink_throughput_bps", 0),
                "uplinkThroughputBps": status.get("device_info", {}).get("uplink_throughput_bps", 0),
                "latencyMs": status.get("pop_ping_latency_ms", 0),
                "firmwareVersion": status.get("device_info", {}).get("software_version", ""),
            }
        except Exception as e:
            print(f"[relay] Starlink poll error: {e}")
            return {"connected": False}

    def run(self):
        print(f"[relay] Starting — server={self.server_url} interval={self.interval}s")
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

        while self.running:
            try:
                starlink_data = self.poll_starlink()
                self.push("starlink", starlink_data)
            except Exception as e:
                print(f"[relay] Loop error: {e}")

            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)

        print("[relay] Stopped.")


def main():
    parser = argparse.ArgumentParser(description="The Hangar — Pi Relay")
    parser.add_argument("--server", required=True, help="Cloud server URL (e.g. https://hangar.example.com)")
    parser.add_argument("--token", required=True, help="Ingest API token (must match INGEST_TOKEN on server)")
    parser.add_argument("--interval", type=int, default=60, help="Polling interval in seconds (default: 60)")
    args = parser.parse_args()

    relay = HangarRelay(args.server, args.token, args.interval)
    relay.run()


if __name__ == "__main__":
    main()
