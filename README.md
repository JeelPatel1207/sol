# Solar Monitor – Project README

## Goal
A private web app (PWA) to monitor solar plants for family and friends (max ~20 users).
It shows power now, today's energy, total energy, online/offline status, history graphs,
savings in ₹ and alerts. No public sign-up. Only the admin creates users.

## Key idea
A monitoring app only shows data the inverter already has. So:

    Inverter -> Collector -> Your server (DB) -> App

Only the **collector** changes between inverter brands. The server and app are built once.

## Default decisions
| Topic | Decision |
|---|---|
| App type | PWA (React + Vite), installable on Android and iPhone |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL (Supabase free tier or self-hosted in Docker) |
| Data source | Pluggable collectors: `mock`, `manual`, `vendor_cloud`, `official_api`, `esp32` |
| Polling | Every 5 minutes via `node-cron` |
| Hosting | Small VPS (Ubuntu), Caddy automatic HTTPS with Let's Encrypt |
| Language | English first, text in `i18n.js` |
| Offline | Service worker caches last known plant data |

## Run locally
    cp .env.example .env        # fill values
    cd server && npm install && npm run migrate && npm run seed && npm run dev
    cd web && npm install && npm run dev

## Run with Docker Compose
    cp .env.example .env        # set APP_DOMAIN, passwords, secrets
    docker compose up -d

---

## Database Backup & Restore Instructions

### 1. Automatic Daily Backups (14-day retention)
The backup script is located at `scripts/backup.sh`. It automatically dumps the database, gzips it, and purges files older than 14 days.

Set up a daily cron job at 2:00 AM:
```bash
chmod +x /opt/solar-monitor/scripts/backup.sh
crontab -e
```
Add the following line:
```cron
0 2 * * * /opt/solar-monitor/scripts/backup.sh >> /var/log/solar_backup.log 2>&1
```

### 2. Manual Backup On-Demand
```bash
./scripts/backup.sh
# Output saved to: /var/backups/solar-monitor/solar_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Restore Database from Backup
To restore a backup into the running PostgreSQL container:

```bash
# 1. Identify your backup file
BACKUP_FILE="/var/backups/solar-monitor/solar_backup_YYYYMMDD_HHMMSS.sql.gz"

# 2. Decompress and restore via docker exec into postgres
gunzip < "$BACKUP_FILE" | docker exec -i solar_postgres psql -U solar_user -d solar_monitor

# 3. Restart the server container to reload state
docker compose restart server
```
