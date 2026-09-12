# HT — Hospitality Talent Exchange

> A pan-India SaaS that lets hoteliers **redeploy staff across the country by season** — turning off-season payroll overhead into on-demand talent for peak-season hotels. No layoffs, no frantic rehiring.

The housekeeper who is idle payroll overhead in **Goa's monsoon** is scarce, premium labour in the **Himalayan summer**. HT monetizes that *temporal arbitrage* and turns a 6–8 month seasonal job into a 10–12 month "follow-the-season" career.

This repo is **Product Slice 1**: a real, runnable MVP that exercises the full loop end-to-end, architected for the full vision (pan-India, three personas, modular monetization).

---

## Business model

**Core:** B2B SaaS subscription for hotels. **Every other revenue stream is a toggleable module** an admin flips on/off with configurable rates (see `/admin/revenue`):

| Module | Mechanism | Default |
|---|---|---|
| Subscription (SaaS) | Tiered plan per property | **ON** |
| Deputation commission | % of wage bill (+ optional lending fee to home hotel) | **ON** |
| Verification & onboarding | Per-worker KYC/background fee | Off |
| Managed payroll / EOR | Margin + inter-state compliance during deputation | Off |
| Insurance | Per-day accident/health cover | Off |
| Travel & relocation | Booking markup | Off |
| Fintech (EWA/wallet) | Earned-wage access, savings, micro-credit | Off |
| Skilling & certification | Course marketplace (Skill India tie-in) | Off |
| Promoted listings | Featured supply/demand posts | Off |
| Data & analytics | Seasonal labour-demand intelligence | Off |

The **Fee Engine** (`src/core/monetization`) computes each deputation's money split honouring only the enabled modules — flipping a toggle in admin immediately changes deputation pricing.

---

## Features by persona

- **Hotelier** — onboard + subscribe, declare `SURPLUS`/`DEMAND`, see the national season map + counter-seasonal corridors, browse ranked matched staff, run the deputation lifecycle, transparent money split, two-way ratings.
- **Worker** — profile, skills, reputation, availability, and their deputations across the season.
- **Platform admin** — network overview, **revenue-module toggles + rates**, hotels, and the seasonal calendar that drives matching.

---

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript) · **Tailwind CSS**
- **Prisma** ORM · **SQLite** for local dev (zero external deps), **Postgres-portable** schema
- Custom **JWT-cookie auth** (`jose` + `bcryptjs`), role-based route guards
- **Vitest** unit + integration tests
- Pure, framework-free domain logic in `src/core` (seasonal, matching, monetization, deputation state machine)

---

## Quick start

Requires **Node ≥ 18.18** and npm. No Docker or Postgres needed.

```bash
npm install
cp .env.example .env      # defaults work out of the box for local dev
npm run setup             # apply migrations + seed pan-India data
npm run dev               # http://localhost:3000
```

`npm run setup` = `prisma migrate deploy` + seed. To reset: `npm run db:reset`.

### Demo logins (password: `password123`)

| Email | Role | Context |
|---|---|---|
| `goa@ht.test` | Hotelier | Sunset Sands Resort, Goa — **off-season (SURPLUS)** |
| `hills@ht.test` | Hotelier | Himalayan Vista Inn, Manali — **peak (DEMAND)** |
| `worker@ht.test` | Worker | Ramesh Kumar (housekeeping, home: Goa) |
| `admin@ht.test` | Platform admin | Revenue modules, network, seasons |

### Guided demo (the "aha")

1. Log in as **`hills@ht.test`** (Manali, peaking now). The dashboard shows the national map and "source staff" corridors.
2. Go to **Marketplace** → you see **Goa's surplus housekeeping** with workers ranked (counter-seasonal workers score highest). Click **Request** on a worker.
3. On the deputation page, advance **Accept → Sign agreement**. At *Sign agreement* the **money split** is written: borrower pays wage + 15% commission, worker gets the full wage, platform keeps the fee.
4. Log in as **`admin@ht.test`** → **Revenue modules** → enable **Managed payroll / EOR** (8%) and **Verification**. Reopen a fresh deputation's page → the platform's cut has grown. That's the "toggle any revenue stream" model, live.

---

## Testing

```bash
npm test         # 16 tests: core engines (unit) + ledger split (integration vs SQLite)
npm run typecheck
npm run build
```

There is also an authenticated route smoke test: with the dev server running, `node --env-file=.env --import tsx scripts/smoke-auth.ts`.

---

## Project structure

```
prisma/schema.prisma        # data model (SQLite, PG-portable) + seed.ts
src/core/                    # pure domain logic (unit-tested, framework-free)
  seasonal/                  #   region state, national heatmap, corridors
  matching/                  #   ranked worker↔demand scoring
  monetization/              #   revenue-module catalog + Fee Engine
  deputation/                #   lifecycle state machine + guards
src/lib/                     # db, auth, constants, season/fee server helpers
src/actions/                 # server actions (auth, declarations, deputations, subscription, admin, worker)
src/components/              # UI kit + AppShell + NationalSeasonMap
src/app/                     # routes: (auth) · hotel · worker · admin
```

Money is stored as **integer paise** (₹1 = 100 paise) to avoid float drift.

---

## Production notes

- **Postgres:** change `datasource.provider` to `postgresql` and set a Postgres `DATABASE_URL`, then `prisma migrate deploy`. The schema is already portable (string-union "enums", JSON-as-text config, no scalar lists).
- **Data residency & compliance:** deploy in an India region; the OSH Code 2020 (ex-ISMW Act) governs inter-state deputation — handled by the Managed payroll/EOR module.
- **Swap the stubs for real integrations:** payments (Razorpay/RazorpayX behind a `PaymentProvider`), eKYC (DigiLocker/Aadhaar), e-sign (Digio/Leegality), notifications (WhatsApp/MSG91).

## Roadmap

Native worker app · real payments/eKYC/e-sign/WhatsApp · full compliance engine · ML matching & demand forecasting · PMS integrations · worker fintech · chain & tourism-board analytics.

---

_MVP built as an end-to-end vertical slice. See the plan doc for the full business case and phased roadmap._
