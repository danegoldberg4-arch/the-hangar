# Deploying The Hangar to Vercel + Supabase

## Step 1: Create Supabase Project

1. Go to https://supabase.com → Sign up (free)
2. New Project → name it "the-hangar" → pick a region close to AU (Singapore)
3. Wait for provisioning (~2 min)
4. Go to Settings → Database → Connection string → URI
5. Copy the connection string (looks like `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`)

## Step 2: Set Environment Variables Locally

Edit `.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
AUTH_SECRET="run: openssl rand -base64 32"
CRON_SECRET="run: openssl rand -base64 32"
INVITE_CODE="pick any word your family will know"
```

## Step 3: Push Database Schema

```bash
npx prisma db push
```

This creates all tables in Supabase.

## Step 4: Seed Maintenance Data

Start the dev server:
```bash
npm run dev
```

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/seed
```

## Step 5: Deploy to Vercel

1. Push the project to GitHub
2. Go to https://vercel.com → New Project → import the repo
3. Add all environment variables (same as .env):
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `CRON_SECRET`
   - `INVITE_CODE`
   - `SELECT_LIVE_EMAIL` (optional)
   - `SELECT_LIVE_PWD` (optional)
   - `SELECT_LIVE_SYSTEM` (optional)
   - `INGEST_TOKEN` (optional)
4. Deploy

## Step 6: Sign Up

Visit your Vercel URL → /signup → create your account (first user = admin)

## Vercel Cron

The app has one cron job configured in `vercel.json`:
- `/api/cron/poll` — runs every 15 minutes, fetches weather + fire danger from BOM/RFS

This keeps data fresh even when nobody's looking at the dashboard. The dashboard also fetches on page load if data is >15 min stale, so cron is a bonus, not a requirement.

## Costs

| Service | Free tier | Enough? |
|---------|-----------|---------|
| Vercel | 100GB bandwidth, unlimited serverless | Yes for 8 users |
| Supabase | 500MB DB, 50k MAU, 2GB bandwidth | Yes |
| Total | €0/month | |

## Optional: Raspberry Pi Relay

For Starlink monitoring, deploy a Pi at the house:
1. Copy `scripts/relay.py` to the Pi
2. Set `INGEST_TOKEN` in Vercel env vars
3. Run: `python3 relay.py --server https://your-app.vercel.app --token YOUR_TOKEN`
