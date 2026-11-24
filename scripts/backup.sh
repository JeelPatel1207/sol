#!/bin/bash
# ==============================================================================
# Solar Monitor – PostgreSQL Backup Script with 14-Day Retention
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/solar-monitor}"
CONTAINER_NAME="${CONTAINER_NAME:-solar_postgres}"
DB_USER="${POSTGRES_USER:-solar_user}"
DB_NAME="${POSTGRES_DB:-solar_monitor}"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/solar_backup_${TIMESTAMP}.sql.gz"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting database backup for '${DB_NAME}'..."

# Dump database through docker container and gzip
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
else
  # Fallback for direct host pg_dump
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
fi

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup successful: ${BACKUP_FILE} (${FILESIZE})"

# Enforce 14-day retention policy
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "solar_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} +

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup process finished."
