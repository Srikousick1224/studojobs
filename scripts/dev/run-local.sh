#!/usr/bin/env bash
# LOCAL DEV/TEST ONLY: build + serve the app against the local stand-in (never writes .env.local).
set -euo pipefail
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54331
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_localstandin0000000000
export NEXT_PUBLIC_SITE_URL=http://localhost:3060
cd "$(dirname "$0")/../.."
if [ "${1:-}" != "--no-build" ]; then npm run build >/tmp/claude-0/next-build.log 2>&1 || { tail -30 /tmp/claude-0/next-build.log; exit 1; }; fi
pkill -f "next start -p 3060" 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true; sleep 1
nohup npx next start -p 3060 >/tmp/claude-0/next-start.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3060/ && break; sleep 1; done
echo "app on http://localhost:3060"
