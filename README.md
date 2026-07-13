# The Hangar

The Hangar is a private operations dashboard for an off-grid family property. It combines power and connectivity monitoring, maintenance records, visits, restocking, weather, fire-danger information, and a wall-display kiosk in one installable Next.js application.

## Architecture

- Next.js 16 App Router and React 19
- PostgreSQL on Neon through Prisma 7 and the `pg` adapter
- Auth.js credentials authentication with JWT sessions
- Select.live power ingestion, Open-Meteo forecasts, and NSW BOM/RFS feeds
- Raspberry Pi relay for Starlink and future on-property sensors
- Serwist service worker for the installable PWA

Browser requests render server components or call authenticated route handlers. Scheduled collectors persist upstream readings. The on-property relay sends authenticated telemetry to `/api/ingest`.

## Requirements

- Node.js 22
- npm 11
- A Neon PostgreSQL database

## Local Setup

```bash
nvm use
npm ci
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. Populate every required secret in `.env`; never reuse the example values.

## Commands

```bash
npm run dev        # local development
npm run check      # lint, typecheck, and unit tests
npm run test:watch # unit tests in watch mode
npm run build      # production build
npm start          # serve the production build
```

## Database Changes

Create and review a migration for every schema change:

```bash
npx prisma migrate dev --name describe_the_change
npm run check
```

Production releases run `npx prisma migrate deploy` once before the application rollout. Do not use `prisma db push` against production.

## Operations

- Use Neon's pooled connection endpoint for `DATABASE_URL` in serverless deployments.
- Generate independent high-entropy values for `AUTH_SECRET`, `CRON_SECRET`, `INGEST_TOKEN`, and `INVITE_CODE`.
- Treat monitoring timestamps as part of the reading: stale data must never be presented as live.
- Rotate a credential immediately if it appears in a command line, shell history, build log, or issue.
- Back up the database and verify a restore before destructive schema or retention changes.

See [DEPLOY.md](./DEPLOY.md) for deployment and relay details.
