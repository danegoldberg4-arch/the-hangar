# Deploying The Hangar to Vercel and Neon

## 1. Provision Neon

Create the database in an Australian region. Use the pooled Neon connection endpoint for the Vercel `DATABASE_URL` and require certificate verification with `sslmode=verify-full`.

Do not place connection URLs directly in commands. Store them in `.env` locally and in the Vercel environment settings.

## 2. Configure Environment

Start from `.env.example`. The required production values are:

- `DATABASE_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN` during initial setup
- `INVITE_CODE`

`AUTH_RATE_LIMIT_SECRET` is recommended so rate-limit identifiers use a separate HMAC key; the server falls back to `AUTH_SECRET` when it is omitted. `INGEST_TOKEN` is required when the Pi relay is enabled. The optional power integration uses `SELECT_LIVE_EMAIL`, `SELECT_LIVE_PWD`, and `SELECT_LIVE_SYSTEM`.

Generate each secret independently with a cryptographically secure generator. Missing bootstrap, invite, or rate-limit storage configuration fails closed rather than opening registration or login.

## 3. Apply the Schema

Review committed SQL under `prisma/migrations`, take a backup, then run:

```bash
npm ci
npx prisma migrate deploy
```

Run migrations once as a release step. Do not run concurrent migrations from multiple application instances and do not use `prisma db push` in production.

For an existing Neon database that was created with `prisma db push`, first verify that it matches `prisma/schema.prisma`, then register the baseline without executing it:

```bash
npx prisma migrate resolve --applied 20260713000000_baseline
```

This baseline command is a one-time transition step. Fresh databases should use `prisma migrate deploy` normally.

Apply migrations before deploying new application code. Authentication intentionally fails closed if the durable rate-limit table is unavailable.

## 4. Deploy

Import `danegoldberg4-arch/the-hangar` into Vercel, configure all environment variables, and deploy from `main`. Before promoting a release, require the GitHub CI check and verify `/login`, the dashboard, and the scheduled poll endpoint.

The application cron is defined in `vercel.json`. Confirm that the selected Vercel plan supports its frequency. Monitor missed runs and upstream failures; a successful HTTP response should mean at least one collector completed successfully.

## 5. Bootstrap Access

Create the initial administrator immediately after deployment using `ADMIN_BOOTSTRAP_TOKEN`. Later accounts require `INVITE_CODE` and receive the family role. Remove `ADMIN_BOOTSTRAP_TOKEN` from the deployment environment after the administrator exists.

While signed in as that administrator, seed the maintenance schedule from the application origin:

```js
await fetch("/api/seed", { method: "POST" }).then((response) => response.json());
```

The seed endpoint is admin-only and refuses to run after maintenance data exists. Do not expose an application connected to an empty database before the intended administrator can claim it.

## 6. Raspberry Pi Relay

Install the relay under a dedicated unprivileged account. Keep its ingest token in a root-readable environment file or systemd credential rather than in `ExecStart` or shell history. Copy `scripts/relay.service`, replace the example domain, then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now relay.service
sudo systemctl status relay.service
```

Verify that the dashboard reports a recent relay timestamp. The relay should queue readings during internet outages and replay them using stable event identifiers.

## Rollback and Recovery

1. Stop the rollout if migrations or smoke checks fail.
2. Restore the last verified Neon backup when a migration cannot be rolled forward safely.
3. Redeploy the last known-good application commit.
4. Rotate any credential exposed in logs or command history.
5. Record the incident, affected data window, and corrective action.
