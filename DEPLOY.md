# Solar Monitor – Production Deployment Guide

This guide walks you through deploying **Solar Monitor** onto a clean Ubuntu VPS (DigitalOcean, Hetzner, Oracle Cloud, Linode, AWS Lightsail) with Docker, automatic Let's Encrypt HTTPS (via Caddy), and automated daily database backups.

---

## 1. Prerequisites

- A Linux VPS with Ubuntu 22.04 or 24.04 LTS (minimum 1 GB RAM, 1 vCPU).
- A domain name (e.g. `solar.example.com` or `monitor.mydomain.in`).
- Root or sudo user access to the VPS.

---

## 2. Configure Domain DNS

In your domain registrar (Namecheap, Cloudflare, GoDaddy, Porkbun):
1. Create an **A record**:
   - **Host / Name**: `solar` (for `solar.example.com`) or `@` (for root domain).
   - **Points to (Value)**: Your VPS Public IPv4 Address.
   - **TTL**: Auto or 300 seconds.
2. If using Cloudflare, set proxy status to **DNS only** initially until SSL certificates issue.

---

## 3. Server Initial Setup & Docker Installation

SSH into your server:
```bash
ssh root@YOUR_VPS_IP
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw gzip ca-certificates
```

Configure the UFW firewall:
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt challenge)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

Install Docker and Docker Compose plugin:
```bash
# Install Docker via official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

---

## 4. Deploy Solar Monitor Application

### A. Clone the Repository
```bash
sudo mkdir -p /opt/solar-monitor
sudo git clone https://github.com/your-username/solar-monitor.git /opt/solar-monitor
cd /opt/solar-monitor
```

### B. Configure Production `.env`
Create your `.env` file from `.env.example`:
```bash
cp .env.example .env
nano .env
```

Generate secure random secrets:
```bash
# Generate 64-char hex key for CREDENTIALS_KEY (AES-256):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Fill in the `.env` settings:
```ini
NODE_ENV=production
PORT=4000
APP_DOMAIN=solar.example.com
CORS_ORIGIN=https://solar.example.com
APP_BASE_URL=https://solar.example.com

# PostgreSQL container credentials
POSTGRES_DB=solar_monitor
POSTGRES_USER=solar_user
POSTGRES_PASSWORD=your_strong_generated_password

# Database connection URL for backend container
DATABASE_URL=postgres://solar_user:your_strong_generated_password@postgres:5432/solar_monitor

# Auth secrets
JWT_SECRET=your_generated_jwt_secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# 32-byte hex encryption key
CREDENTIALS_KEY=your_generated_64_hex_credentials_key

# Polling and Timezones
COLLECT_CRON=*/5 * * * *
DAILY_SUMMARY_CRON=5 0 * * *
DEFAULT_TIMEZONE=Asia/Kolkata
DAYTIME_START_HOUR=7
DAYTIME_END_HOUR=18

# First Admin Credentials (seeded on first boot)
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

---

## 5. Initialize Database & Seed First Admin

Start PostgreSQL and run migrations:
```bash
# 1. Start postgres in background
docker compose up -d postgres

# 2. Wait 5 seconds for healthy state, then run migrations:
docker compose run --rm server npm run migrate

# 3. Seed initial admin user and default demo plant:
docker compose run --rm server npm run seed
```

---

## 6. Build and Launch Containers

Build and run all services (PostgreSQL, Node.js API server, Web builder, and Caddy HTTPS reverse proxy):
```bash
docker compose up -d --build
```

Check running container status:
```bash
docker compose ps
```

Verify Caddy certificates and logs:
```bash
docker compose logs -f caddy
```
Caddy will automatically contact Let's Encrypt, verify your domain, obtain an SSL certificate, and serve your app over HTTPS!

---

## 7. Setup Automated Daily Backups

Make backup script executable:
```bash
chmod +x /opt/solar-monitor/scripts/backup.sh
```

Add a root cron job to run the backup every morning at 02:00 UTC:
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/solar-monitor/scripts/backup.sh >> /var/log/solar_backup.log 2>&1") | crontab -
```

Backups are stored at `/var/backups/solar-monitor/` and automatically pruned after 14 days.

---

## 8. Installing the PWA on Mobile Devices

1. Open `https://solar.example.com` on your mobile browser (Chrome on Android or Safari on iOS).
2. **Android (Chrome)**: Tap the 3 dots menu $\rightarrow$ **"Install app"** or **"Add to Home Screen"**.
3. **iPhone (Safari)**: Tap the Share button $\rightarrow$ **"Add to Home Screen"**.
4. The Solar Monitor app installs with its app icon, launches full screen without browser bars, and functions offline using cached data.

---

## 9. How to Update the App

When you push new code to your repository:
```bash
cd /opt/solar-monitor
git pull

# Rebuild containers and restart
docker compose build
docker compose up -d

# Run migrations if schema changed:
docker compose run --rm server npm run migrate
```
Zero data is lost because PostgreSQL data resides in the Docker named volume `pgdata`.
