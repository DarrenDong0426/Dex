#!/usr/bin/env bash
# scripts/backup-db.sh — dumps the live database to backups/ before any risky
# schema/migration work. Uses plain pg_dump (postgresql@17 via brew) rather
# than `supabase db dump`, which requires Docker Desktop running locally —
# too heavy a dependency for a simple backup script.
#
# Why this exists: on 2026-08-15, `prisma migrate diff --shadow-database-url`
# was pointed at DIRECT_URL believing it was a disposable shadow database —
# it wasn't (DIRECT_URL and DATABASE_URL are the same live DB, just pooled vs
# direct connection), and it wiped nearly every table. There was no backup to
# restore from. See the CLAUDE.md "RECURRING GOTCHAS" entry for the full story.
#
# Usage: ./scripts/backup-db.sh [label]
#   ./scripts/backup-db.sh              -> backups/2026-08-16_1430.sql
#   ./scripts/backup-db.sh pre-migration -> backups/2026-08-16_1430_pre-migration.sql
set -euo pipefail
cd "$(dirname "$0")/.."

DIRECT_URL=$(grep '^DIRECT_URL=' .env | head -1 | cut -d'=' -f2- | tr -d '"')
if [ -z "$DIRECT_URL" ]; then
  echo "DIRECT_URL not found in .env" >&2
  exit 1
fi

PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
if [ ! -x "$PG_DUMP" ]; then
  echo "pg_dump not found at $PG_DUMP — brew install postgresql@17" >&2
  exit 1
fi

# Parse DIRECT_URL into components rather than passing the URL string
# straight to pg_dump — the password in .env contains a literal '@', which
# breaks pg_dump's URI parser (it splits at the first '@', not the last).
# PGPASSWORD as a plain env var sidesteps any URL-encoding issue entirely.
eval "$(node -e "
const u = new URL(process.argv[1]);
console.log('export PGHOST=' + JSON.stringify(u.hostname));
console.log('export PGPORT=' + JSON.stringify(u.port || '5432'));
console.log('export PGUSER=' + JSON.stringify(decodeURIComponent(u.username)));
console.log('export PGPASSWORD=' + JSON.stringify(decodeURIComponent(u.password)));
console.log('export PGDATABASE=' + JSON.stringify(u.pathname.replace(/^\//, '')));
" "$DIRECT_URL")"

mkdir -p backups
STAMP=$(date +%Y-%m-%d_%H%M)
LABEL="${1:-}"
FILE="backups/${STAMP}${LABEL:+_${LABEL}}.sql"

echo "Dumping database to $FILE ..."
"$PG_DUMP" --no-owner --no-privileges -f "$FILE"
echo "Done: $FILE ($(du -h "$FILE" | cut -f1))"
