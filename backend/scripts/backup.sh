#!/bin/bash
# Backup automático de base de datos PostgreSQL
# Se recomienda ejecutar desde cron o PM2 cron

BACKUP_DIR="$(dirname "$0")/backups"
MAX_BACKUPS=30
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_DATABASE="${PG_DATABASE:-cmdb_hiberus}"
PGPASSWORD="${PG_PASSWORD:-}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="$BACKUP_DIR/cmdb-backup-$TIMESTAMP.dump"

PGPASSWORD="$PGPASSWORD" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" -Fc -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup exitoso: $BACKUP_FILE"
else
  echo "ERROR: Fallo al crear backup"
  exit 1
fi

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/cmdb-backup-*.dump 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  ls -1t "$BACKUP_DIR"/cmdb-backup-*.dump | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
  echo "Rotación completada. Backups antiguos eliminados."
fi

echo "Backups actuales: $(ls -1 "$BACKUP_DIR"/cmdb-backup-*.dump 2>/dev/null | wc -l)"
