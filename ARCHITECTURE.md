# Architecture

## Flow
```
 [Inverter] --RS485/WiFi--> [Data logger / dongle]
                                   |
         +-------------------------+---------------------------+
         |                         |                           |
   Vendor cloud API         (ESP32 on RS485)             Manual entry
         |                         |                           |
   [Server collector job]   POST /ingest (device key)     Admin form
         \_________________________|___________________________/
                                   |
                         normalizeReading()
                                   |
                        PostgreSQL: readings
                                   |
                  alerts job, daily_summary job
                                   |
                      REST API (JWT auth, roles)
                                   |
                          PWA (React, Vite)
```
Rule: the **app never talks to the inverter or vendor**. It reads only from your server.

## Normalized reading (the contract every collector must return)
```json
{
  "plantId": 1,
  "time": "2026-11-23T09:35:00Z",
  "powerKw": 3.42,
  "todayKwh": 12.8,
  "totalKwh": 4521.3,
  "voltage": 231.2,
  "temperature": 41.5,
  "status": "online",          // online | offline | fault
  "faultCode": null
}
```

## Folder structure
```
solar-monitor/
├─ README.md  ARCHITECTURE.md  API_SPEC.md  SCREENS.md
├─ COLLECTOR.md  PHASES.md  PROMPTS.md  .env.example
├─ db/
│  ├─ DATABASE.sql
│  └─ seed.sql                  # 1 admin + 1 demo plant
├─ server/
│  ├─ package.json
│  └─ src/
│     ├─ index.js               # start express + scheduler
│     ├─ config.js              # read .env
│     ├─ db.js                  # pg pool
│     ├─ middleware/
│     │  ├─ auth.js             # verify JWT
│     │  ├─ requireAdmin.js
│     │  └─ deviceKey.js        # for /ingest
│     ├─ routes/
│     │  ├─ auth.routes.js
│     │  ├─ plants.routes.js
│     │  ├─ users.routes.js
│     │  ├─ alerts.routes.js
│     │  └─ ingest.routes.js
│     ├─ collectors/
│     │  ├─ index.js            # picks collector by plant.source_type
│     │  ├─ mock.collector.js
│     │  ├─ manual.collector.js
│     │  ├─ vendorCloud.collector.js   # brand-specific, written in Phase 1
│     │  └─ officialApi.collector.js
│     ├─ jobs/
│     │  ├─ scheduler.js        # node-cron
│     │  ├─ fetchReadings.js    # every 5 min
│     │  ├─ checkAlerts.js      # after each reading
│     │  └─ dailySummary.js     # midnight
│     ├─ services/
│     │  ├─ readings.service.js
│     │  └─ alerts.service.js
│     └─ utils/
│        ├─ crypto.js           # AES-256-GCM encrypt/decrypt credentials
│        └─ time.js
├─ web/
│  ├─ package.json  vite.config.js
│  ├─ public/manifest.webmanifest, icons/
│  └─ src/
│     ├─ main.jsx  App.jsx  api.js  theme.css  i18n.js
│     ├─ pages/ Login, PlantList, PlantDashboard, History, Alerts, Admin
│     └─ components/ PowerCard, StatusDot, EnergyChart, LastUpdated, Layout
└─ docker-compose.yml           # optional: server + postgres + caddy
```

## Tech choices
- Auth: email/phone + password, bcrypt hash, JWT (7 days), roles `admin` / `viewer`.
- Charts: Recharts. PWA: `vite-plugin-pwa`. Scheduler: `node-cron`.
- Credentials of vendor accounts stored encrypted (AES-256-GCM, key in `.env`).
- Time: store UTC, show in `Asia/Kolkata`.
