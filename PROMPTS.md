# Prompts for Antigravity

How to use: put the MASTER PROMPT in the project's rules/instructions (or paste it at the start of
each new session). Make sure README.md, ARCHITECTURE.md, DATABASE.sql, API_SPEC.md, SCREENS.md,
COLLECTOR.md, PHASES.md are in the repo root so the agent can read them. Then paste ONE phase prompt
at a time. After each phase, run the CHECK from PHASES.md before going on.

---
## MASTER PROMPT
```
You are building "Solar Monitor", a private solar plant monitoring PWA for family and friends
(max 20 users). Read README.md, ARCHITECTURE.md, DATABASE.sql, API_SPEC.md, SCREENS.md,
COLLECTOR.md and PHASES.md first. They are the source of truth.

Stack: Node.js 20 + Express, PostgreSQL (pg), node-cron, bcrypt, jsonwebtoken, zod for validation;
frontend React + Vite + Recharts + vite-plugin-pwa. Plain JavaScript (no TypeScript).

Rules:
1. Work on ONE phase at a time (I will tell you which). Do not build later phases.
2. Keep files small (<200 lines), one job per file, follow the folder structure in ARCHITECTURE.md.
3. Do not change the DB schema or API shape without asking me.
4. Secrets only from .env. Never log passwords, tokens or vendor credentials.
5. Every collector returns the normalized reading from ARCHITECTURE.md.
6. Validate all input. Use parameterized SQL only. Hash passwords with bcrypt.
7. After coding, tell me exactly how to run it and how to test it (commands), and list any
   assumptions. If something is unclear, ask me before guessing.
8. Store time in UTC, display in Asia/Kolkata. Mobile first UI, light and dark mode.
```

---
## PHASE 0 – Project setup
```
Do Phase 0 from PHASES.md. Create the folder structure from ARCHITECTURE.md with empty or
minimal placeholder files, package.json for server/ and web/ with the needed dependencies,
a root .gitignore (node_modules, .env), and a db/migrate script (server/src/migrate.js) that runs
db/DATABASE.sql. Add npm scripts: server "dev", "start", "migrate", "seed". Do not write features yet.
```

## PHASE 1 – Data first
```
Do Phase 1 from PHASES.md.
1. server/src/config.js (read and validate .env), db.js (pg pool), utils/crypto.js (AES-256-GCM
   encrypt/decrypt with CREDENTIALS_KEY) with a small test.
2. collectors/index.js, mock.collector.js (bell curve 6:30-18:30, zero at night, small noise) and
   manual.collector.js following COLLECTOR.md.
3. services/readings.service.js: saveReading() with ON CONFLICT DO NOTHING.
4. jobs/scheduler.js + jobs/fetchReadings.js: for every active plant call its collector, catch errors
   per plant, save the reading. Cron from COLLECT_CRON.
5. Script `npm run seed` that inserts one demo plant with source_type 'mock'.
Do not build the API yet. Show me how to verify that a row appears every 5 minutes (give a SQL query).
```

## PHASE 1b – Real collector (after I give inverter details)
```
My inverter brand/model is: <BRAND MODEL>. My logger/app is: <e.g. SmartClient / Eybond dongle>.
Here are the sanitized network requests and one sample JSON response from the vendor portal
(passwords and tokens removed): <PASTE>.
Write collectors/vendorCloud.collector.js (or officialApi.collector.js) per COLLECTOR.md: login with
credentials from the encrypted plant record, cache the token, fetch data, map it to the normalized
reading, handle wrong password / timeout / empty response, and add a unit test using the sample
response. Keep all field mapping in one object at the top of the file. Do not invent endpoints:
use only the ones I pasted; if something is missing, ask me.
```

## PHASE 2 – API and login
```
Do Phase 2 from PHASES.md using API_SPEC.md exactly.
- seed script creates the admin from ADMIN_* env vars.
- middleware: auth.js (JWT), requireAdmin.js, deviceKey.js.
- routes: auth, plants (list, live, history for day/month/year), ingest.
- Viewers can only access plants in plant_access; admin sees all. Return 403 otherwise.
- Rate limit login (10 per 15 min per IP), use helmet and CORS from CORS_ORIGIN.
- "status" in live/list is 'offline' when no reading within plant.offline_after_min during daytime.
- savings = kWh * unit_rate_inr.
Write curl examples for each endpoint in docs/CURL_TESTS.md and run through them with me.
```

## PHASE 3 – App version 1
```
Do Phase 3 from PHASES.md using SCREENS.md. In web/: Vite React app with react-router,
api.js (adds Bearer token, redirects to login on 401), i18n.js (English strings only), theme.css
with light/dark CSS variables. Build Login, PlantList, PlantDashboard (today's power curve with
Recharts) and components StatusDot, PowerCard, LastUpdated, Layout with bottom nav.
Auto refresh every 60 seconds. Big readable numbers, works at 360px width. Show loading skeletons
and a clear error banner. Do not build History, Alerts or Admin yet.
```

## PHASE 4 – Version 2
```
Do Phase 4 from PHASES.md.
Server: jobs/dailySummary.js (midnight), history endpoints use daily_summary for month/year,
jobs/checkAlerts.js + services/alerts.service.js with rules: offline (no reading for
offline_after_min in daytime), low_generation (today's kWh below low_gen_percent of the average of
the last 5 days at the same time), error (status fault). Avoid duplicate open alerts; set
resolved_at when the condition clears. Routes: alerts list, mark seen, users CRUD, plants CRUD
(credentials encrypted, deviceKey shown once), PUT users/:id/plants, test-collector.
Web: History screen (day/month/year bar charts), savings in ₹ with Indian number format,
Alerts screen with unseen badge, Admin screen (plants, users, access, Test collector button).
```

## PHASE 5 – Polish and deploy
```
Do Phase 5 from PHASES.md.
1. PWA: manifest, icons, service worker that shows the last cached data when offline.
2. Deployment files: Dockerfile for server, docker-compose.yml (server + postgres + caddy) with
   automatic HTTPS for my domain from env, serving the built web app from the server or caddy.
3. Daily pg_dump backup script with 14-day retention and a restore instructions section in README.md.
4. Security pass: check no secrets in logs, CORS, helmet, rate limit, input validation, password rules.
5. Write DEPLOY.md with step-by-step VPS setup (Ubuntu), domain DNS, first admin creation, update steps.
```

## PHASE 6 (optional, v3) – Push notifications and extras
```
Add web push notifications (VAPID keys in .env) for 'offline' and 'error' alerts, a subscription table
(user_id, endpoint, keys), a settings toggle per user, and a multi-plant summary on the plant list
(total power of all plants the user can see). Ask me before changing the schema.
```

---
## Handy fix-it prompts
- "Run the app, reproduce this error: <error>. Find the root cause, fix it, and explain in 3 lines."
- "Review the code for this phase against API_SPEC.md and SCREENS.md and list differences. Don't fix yet."
- "Add tests for the alert rules with fake readings (offline, low generation, error, normal)."
- "Refactor files over 200 lines into smaller ones without changing behavior."
