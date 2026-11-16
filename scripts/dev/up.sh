#!/usr/bin/env bash
# LOCAL DEV/TEST ONLY: bring the whole local stack up (Postgres 16 -> schema+seed -> Supabase stand-in -> app).
#   bash scripts/dev/up.sh            # start everything (rebuilds the DB, builds the app)
#   bash scripts/dev/up.sh --keep-db  # keep the existing local DB contents
#   WITH_009=1 bash scripts/dev/up.sh # also apply migration 009 (after the seed)
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN=/usr/lib/postgresql/16/bin
PGDATA=/home/claude/.pgdata/main
mkdir -p /tmp/claude-0
if ! $PGBIN/pg_isready -h 127.0.0.1 -p 54329 >/dev/null 2>&1; then
  [ -d "$PGDATA" ] || { mkdir -p "$(dirname $PGDATA)"; chown postgres "$(dirname $PGDATA)" 2>/dev/null || true; su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null; }
  chown -R postgres "$(dirname $PGDATA)" 2>/dev/null || true
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p 54329 -k /home/claude/.pgdata -c listen_addresses=127.0.0.1 -c fsync=off -c max_connections=60' -l /home/claude/.pgdata/pg.log -w start" >/dev/null
fi
export DATABASE_ADMIN_URL=postgres://postgres@127.0.0.1:54329/postgres
if [ "${1:-}" != "--keep-db" ]; then node scripts/dev/local-db.mjs --proposed --seed ${WITH_009:+--with-009}; fi
pkill -f local-supabase.mjs 2>/dev/null || true; sleep 1
STANDIN_LOG=${STANDIN_LOG:-} DATABASE_URL=postgres://postgres@127.0.0.1:54329/studojob_local nohup node scripts/dev/local-supabase.mjs >/tmp/claude-0/ns.log 2>&1 &
for i in $(seq 1 20); do curl -s localhost:54331/__health >/dev/null && break; sleep 1; done
bash scripts/dev/run-local.sh
