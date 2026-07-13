# The Hangar — Home Automation & Monitoring

## What This Is

A cloud-hosted platform for monitoring and automating "The Hangar" — an off-grid steel-and-glass pavilion holiday house in Upper Kangaroo River, NSW. It provides remote visibility into all house systems (power, generator, water, gas, internet) and automates maintenance scheduling with reminders and a digital logbook.

## Core Value

Know exactly what's happening at the house from anywhere, and never miss a maintenance task again.

## The Property

- **Name:** The Hangar (Protohouse No. V)
- **Location:** Upper Kangaroo River, NSW
- **Type:** Off-grid, 15 kW solar + 26 kWh battery, Generac 8 kVA LPG backup generator
- **Water:** Rain + spring, 2x ~11,000 L tanks, Puretec Hybrid G6 UV filtration
- **Gas:** 4x 45 kg LPG + 1 reserve, auto-changeover (hot water + heating)
- **Internet:** Starlink (best-effort)
- **Size:** ~396 m² building on 46.33 ha rainforest
- **Other:** Pool (AstralPool XC-Series), AWTS wastewater, signature hangar door

## Requirements

### Active

- [ ] **Monitoring dashboard** — live status of all house systems, viewable from anywhere
  - [ ] Power: Selectronic SP PRO SPMC482 via select.live API
  - [ ] Generator: Generac Guardian 8 kVA via Mobile Link
  - [ ] Internet: Starlink dishy status
  - [ ] Water: tank levels (requires hardware — ultrasonic sensors + ESP32)
  - [ ] Gas: bottle status / changeover alerts (requires hardware)
- [ ] **Maintenance scheduling system**
  - [ ] CRUD for all maintenance items (UV lamp, filters, AWTS, generator, gas, grounds)
  - [ ] Automated reminders via email (and optionally SMS/push)
  - [ ] Digital logbook — record what was done, when, by whom, parts used
  - [ ] Status dashboard — overdue / due soon / upcoming / done
  - [ ] Alert when items go overdue (e.g., current UV lamp alert)
- [ ] **House handbook as web app** — convert the HTML handbook to Next.js pages
  - [ ] Guest-facing quick facts (Wi-Fi, power etiquette, troubleshooting)
  - [ ] QR codes in the house linking to relevant pages
  - [ ] Systems overview, hangar door instructions
- [ ] **Cron jobs** — periodic API polling for monitoring data + maintenance reminder checks
- [ ] Responsive PWA — works on mobile for guest access

### Out of Scope (v1)

- Smart home device control (lighting, heating, locks) — defer to Phase 2 with Home Assistant
- Security cameras — defer to Phase 2
- Guest booking/calendar integration — defer to Phase 2
- Automated ordering of parts/gas — reminder only, manual ordering

## Context

- House is sometimes unoccupied for weeks — need remote visibility
- Starlink is best-effort — cloud-hosted app must handle data gaps gracefully
- Off-grid power means monitoring power status is critical (battery low = no power)
- Maintenance items are well-defined from the house handbook
- Current urgent item: Puretec UV lamp overdue (beeping, needs RL6 lamp + cartridges)

## Constraints

- **Internet reliability:** Starlink only — monitoring must tolerate outages and show "last known" data
- **Hardware for some sensors:** Water tank levels and gas bottle status require physical sensors not yet installed
- **Single user/family:** No auth system beyond basic access protection
- **Hosting:** Hetzner VPS (same as FinPulse, separate app/port)
- **API availability:** Need to verify Selectronic, Generac, and Starlink API access

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cloud-hosted over local hub | House is sometimes unoccupied; Starlink may drop; cloud app accessible from anywhere | Pending |
| Next.js + Prisma + PostgreSQL | Same stack as FinPulse; developer familiarity; single deploy | Pending |
| Maintenance system first | No hardware dependencies; immediately useful; data ready from handbook | Pending |
| Monitoring APIs phased in | Research API access per system; start with what's available | Pending |
| Separate project from FinPulse | Different domain, different concerns, different deployment | Pending |

## Stack

- **Next.js 15** (App Router, RSC) — server-side API calls, API routes for cron
- **React 19** + **TypeScript 5**
- **PostgreSQL 16** + **Prisma 6**
- **Tailwind CSS 4** + **shadcn/ui**
- **Recharts** — for power/battery trend charts
- **node-cron** — in-process scheduled jobs
- **Decimal.js** — for any numeric sensor data
- **Resend** or **nodemailer** — for email reminders

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-07-11 — project initialization*
