#!/usr/bin/env bash
# Runs the database integration tests against a disposable Postgres + Supabase
# Auth (GoTrue) + PostgREST stack with this repo's migrations applied.
# Requires Docker and psql. Pass --keep to leave the stack running afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f supabase/tests/harness/docker-compose.yml"
DB=postgres://postgres:postgres@127.0.0.1:54422/postgres

$COMPOSE down --volumes >/dev/null 2>&1 || true
$COMPOSE up -d db auth
echo "Waiting for Auth migrations..."
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:54499/health >/dev/null && break; sleep 1; done

for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
done

$COMPOSE up -d rest
for _ in $(seq 1 30); do curl -sf http://127.0.0.1:54430/ >/dev/null && break; sleep 1; done

status=0
node --test supabase/tests/api.test.mjs || status=$?
[[ "${1:-}" == "--keep" ]] || $COMPOSE down --volumes >/dev/null 2>&1
exit $status
