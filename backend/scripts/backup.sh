#!/bin/bash
# Backup automático de base de datos SQLite
# Se recomienda ejecutar desde cron o PM2 cron

BACKUP_DIR="$(dirname "$0")/backups"
DB_PATH="$(dirname "$0")/data/cmdb.sqlite"
MAX_BACKUPS=30

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Base de datos no encontrada en $DB_PATH"
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="$BACKUP_DIR/cmdb-backup-$TIMESTAMP.sqlite"

cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup exitoso: $BACKUP_FILE"
else
  echo "ERROR: Fallo al crear backup"
  exit 1
fi

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/cmdb-backup-*.sqlite 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  ls -1t "$BACKUP_DIR"/cmdb-backup-*.sqlite | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
  echo "Rotación completada. Backups antiguos eliminados."
fi

echo "Backups actuales: $(ls -1 "$BACKUP_DIR"/cmdb-backup-*.sqlite 2>/dev/null | wc -l)"
