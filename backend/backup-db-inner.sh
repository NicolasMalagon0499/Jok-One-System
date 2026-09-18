#!/usr/bin/env bash
# Corre dentro de `railway run` (ahí existe DIRECT_URL). No llamar directo.
set -euo pipefail
URL="${DIRECT_URL%%\?*}"
"$PG_DUMP" --format=custom --no-owner --no-privileges --schema=public --file="$OUT" "$URL"
