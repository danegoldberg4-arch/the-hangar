# Deploying The Hangar to Vercel and Neon

## 1. Provision Neon

Create the database in an Australian region. Use the pooled Neon endpoint for
the Vercel `DATABASE_URL` and require certificate verification with
`sslmode=verify-full`.

Do not put connection URLs directly in commands. Store them in `.env` locally
and in the Vercel environment settings.

## 2. Configure Environment

Start from `.env.example`. Production requires:

- `DATABASE_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN` during initial setup
- `INVITE_CODE`
- `INGEST_TOKEN` when the Pi relay is enabled
- `SELECT_LIVE_EMAIL`, `SELECT_LIVE_PWD`, and `SELECT_LIVE_SYSTEM` for power polling

`AUTH_RATE_LIMIT_SECRET` is recommended so rate-limit identifiers use a
separate HMAC key; the server falls back to `AUTH_SECRET` when it is omitted.
Generate every secret independently with a cryptographically secure generator.
Missing bootstrap, invite, or rate-limit storage configuration fails closed.

## 3. Apply Database Migrations

Create a Neon branch or backup before applying migrations. The monitoring
migration runs transactionally and is expand-compatible with the old
application: old writers receive database defaults while the deployment rolls
forward, but their receipt timestamps remain untrusted and are never presented
as live telemetry. Existing telemetry and its original units are preserved.
Legacy receipt timestamps receive deterministic millisecond offsets before the
new uniqueness constraints are added, so duplicate rows are retained.

For a fresh, empty Neon database:

```bash
npm ci
npx prisma migrate deploy
```

For an existing Neon database previously created with `prisma db push`, first
verify that its tables match `20260713000000_baseline`. Register the baseline
without executing its `CREATE TABLE` statements, then apply the delta
migrations:

```bash
npm ci
npx prisma migrate resolve --applied 20260713000000_baseline
npx prisma migrate deploy
```

The resolve command is a one-time transition. Do not run it on a fresh database
or mark a migration applied unless that schema already exists. Do not use
`prisma db push` in production, and do not run concurrent migrations from
multiple application instances.

The monitoring migration retains legacy power, weather, fire-danger, system,
and Starlink rows. It marks their receipt timestamps untrusted, so they cannot
be presented as live observations. New collectors explicitly mark validated
source timestamps trusted; the next successful poll repopulates each current
view.

Apply migrations before application code. Authentication intentionally fails
closed if the durable rate-limit table is unavailable.

## 4. Deploy

Import `danegoldberg4-arch/the-hangar` into Vercel, configure all environment
variables, and deploy from `main`. Require the GitHub CI check before promotion.
Smoke-test `/login`, the dashboard, and `/api/cron/poll` with its bearer token.

## 5. Bootstrap Access

Create the first administrator with `ADMIN_BOOTSTRAP_TOKEN`, then remove that
variable from the deployment. Later accounts require `INVITE_CODE` and receive
the family role.

While signed in as the administrator, seed the maintenance schedule from the
application origin:

```js
await fetch("/api/seed", { method: "POST" }).then((response) => response.json());
```

The seed endpoint is admin-only and refuses to run after maintenance data
exists. Do not expose an empty database before the intended administrator can
claim it.

## 6. Schedule Telemetry

Configure an external scheduler to call `/api/cron/poll` every 15 minutes with:

```text
Authorization: Bearer <CRON_SECRET>
```

For example:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/poll
```

The daily `0 0 * * *` entry in `vercel.json` is a safety run only. Vercel Hobby
permits built-in cron schedules no more frequently than once per day and may
invoke them at any point during the configured hour. The external scheduler is
the primary 15-minute poller. Check the current
[Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) before
changing the built-in schedule.

The endpoint returns structured per-source health. It returns `502` if an
observation is missing or stale, or if retention fails. Raw power, weather,
fire, and system telemetry is retained for 90 days; minute-level Starlink data
is retained for 30 days. Alert on failed and missed scheduler runs.

## 7. Install the Raspberry Pi Relay

Install the relay under a dedicated unprivileged account. It targets the
`starlink-grpc-tools` v1.2.5 API:

```bash
sudo install -d -m 0755 /opt/hangar-relay
sudo install -m 0755 scripts/relay.py /opt/hangar-relay/relay.py
sudo install -m 0644 scripts/relay-requirements.txt /opt/hangar-relay/relay-requirements.txt
sudo git clone --branch v1.2.5 --depth 1 \
  https://github.com/sparky8512/starlink-grpc-tools.git \
  /opt/starlink-grpc-tools
sudo python3 -m venv /opt/hangar-relay/.venv
sudo /opt/hangar-relay/.venv/bin/pip install \
  --requirement /opt/hangar-relay/relay-requirements.txt
```

Keep the ingest token out of command arguments and shell history:

```bash
sudoedit /etc/the-hangar-relay.env
# Add one line: INGEST_TOKEN=<the same random token configured in Vercel>
sudo chown root:root /etc/the-hangar-relay.env
sudo chmod 0600 /etc/the-hangar-relay.env

sudo install -m 0644 scripts/relay.service /etc/systemd/system/the-hangar-relay.service
sudo systemctl daemon-reload
sudo systemctl enable --now the-hangar-relay.service
sudo systemctl status the-hangar-relay.service
```

The relay writes each observation to a protected SQLite outbox before sending
it. Samples keep their UTC observation time and idempotency key across transient
retries. Flushes are time/count bounded, and invalid payload responses move to
a bounded local quarantine instead of blocking newer telemetry. Authentication
and routing failures remain queued so a corrected deployment or rotated token
can recover them without data loss.

Restart the updated relay before deploying the stricter ingestion API. The API
requires `observedAt` and Starlink operational `state`; it never records a
collection failure as a fresh offline sample.

## Rollback and Recovery

1. Stop the rollout if migrations or smoke checks fail.
2. Restore the last verified Neon backup when a migration cannot be rolled forward.
3. Redeploy the last known-good application commit.
4. Rotate any credential exposed in logs, Git history, or shell history.
5. Record the affected data window and corrective action.
