#!/usr/bin/env bash
# Respaldo diario de la base de producción (Supabase) con pg_dump.
# Las credenciales las inyecta `railway run`; nunca se escriben en disco.
set -euo pipefail

PG_DUMP="/c/Program Files/PostgreSQL/18/bin/pg_dump.exe"
BACKUP_DIR="/c/Users/ACER/Desktop/Jok One/backups"
KEEP_DAYS=30
STAMP="$(date +%Y-%m-%d_%H-%M)"
OUT="$BACKUP_DIR/jokone_$STAMP.dump"

mkdir -p "$BACKUP_DIR"
cd "$(dirname "$0")"

export PG_DUMP OUT
railway run --service awake-grace bash ./backup-db-inner.sh

if [ ! -s "$OUT" ]; then
  echo "ERROR: el respaldo quedó vacío" >&2
  rm -f "$OUT"
  exit 1
fi

find "$BACKUP_DIR" -name 'jokone_*.dump' -mtime +$KEEP_DAYS -delete
echo "OK: $OUT ($(du -h "$OUT" | cut -f1))"
