# Build Phases (test each before starting the next)

## Phase 0 – Setup (30 min)
- [ ] Create repo with the folder structure from ARCHITECTURE.md
- [ ] Copy all plan files into the repo root, `.env.example` → `.env`
- [ ] Create PostgreSQL DB (Supabase or local), run DATABASE.sql
- [ ] Node 20 installed, `npm init` in server/ and web/

## Phase 1 – Data first
- [ ] config.js, db.js, crypto.js (encrypt/decrypt test passes)
- [ ] mock collector + scheduler every 5 min (use 1 min while testing)
- [ ] Readings saved to DB, no duplicates
- [ ] Real collector for your brand (after discovery) returns normalized data
- [ ] CHECK: new row every 5 min for 1 full day; numbers match the vendor app

## Phase 2 – API and login
- [ ] seed.sql: admin user + plant; bcrypt hashing; JWT
- [ ] /auth/login, /me, /plants, /plants/:id/live, /plants/:id/history
- [ ] Role + plant_access checks (viewer cannot read other plants)
- [ ] /ingest with device key
- [ ] CHECK: test with curl/Postman; wrong password gives 401; viewer gets 403

## Phase 3 – App version 1
- [ ] Vite React app, routing, API client with token, i18n file
- [ ] Login, Plant list, Plant dashboard (+ today curve)
- [ ] Status dot, last updated, auto refresh, light/dark
- [ ] CHECK: works on real phone at 360px; numbers equal DB values

## Phase 4 – Version 2
- [ ] daily_summary job + History screen (day/month/year)
- [ ] ₹ savings (energy × unit rate)
- [ ] Alert rules (offline, low generation, error) + Alerts screen
- [ ] Admin screen: plants, users, access, test collector
- [ ] CHECK: turn collector off → offline alert after 20 min daytime

## Phase 5 – Polish and deploy
- [ ] PWA manifest, icons, service worker (shows cached last data)
- [ ] VPS, domain, HTTPS (Caddy or Nginx + Let's Encrypt), process manager (pm2/docker)
- [ ] Daily DB backup (pg_dump cron) + restore test
- [ ] Rate limit login, helmet, CORS only for your domain
- [ ] Optional v3: push notifications (web push), multiple-plant summary, user invites
- [ ] CHECK: install on Android + iPhone home screen; family can log in

## Version scope
v1: power now, today kWh, total kWh, status. v2: graphs, ₹ savings, alerts, admin.
v3: push notifications, many plants, extra users.
