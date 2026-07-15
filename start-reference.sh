#!/usr/bin/env bash
# One-shot launcher for the composition REFERENCE app (integration branch export).
# Run:  bash "/home/shaka/Downloads/BAGONG BUHAY/unc-lpms-react/start-reference.sh"
#
# Requires: the reference was already exported to ~/Downloads/integration-reference
# and its DB (MySQL 3306, user root / rootdevpass, db lpms_composition) is seeded.
set -e

REF="$HOME/Downloads/integration-reference/composition"

if [ ! -d "$REF/client" ] || [ ! -d "$REF/server" ]; then
  echo "ERROR: reference not found at $REF"
  echo "Re-export it first:"
  echo '  cd "/home/shaka/Downloads/BAGONG BUHAY/unc-lpms-react"'
  echo '  git archive feature/learning-plan-integration --prefix=integration-reference/ | tar -x -C "$HOME/Downloads/"'
  exit 1
fi

echo "==> [1/5] Freeing ports 5001 (backend) and 5174 (client)..."
lsof -ti tcp:5001 tcp:5174 2>/dev/null | xargs -r kill -9 2>/dev/null || true

echo "==> [2/5] Pointing the client at the reference backend (5001)..."
echo "VITE_API_BASE=http://localhost:5001" > "$REF/client/.env"

echo "==> [3/5] Installing deps (first run may take a minute)..."
( cd "$REF/server" && npm install --no-audit --no-fund --silent )
( cd "$REF/client" && npm install --no-audit --no-fund --silent )

echo "==> [4/5] Starting reference BACKEND on 5001 (log: /tmp/ref-backend.log)..."
( cd "$REF/server" && env PORT=5001 node server.js > /tmp/ref-backend.log 2>&1 & )
sleep 3
if lsof -i tcp:5001 >/dev/null 2>&1; then
  echo "    backend OK on 5001"
else
  echo "    WARNING: backend not listening on 5001 — check /tmp/ref-backend.log"
  echo "    (usually means MySQL on 3306 isn't running or isn't seeded)"
fi

echo "==> [5/5] Starting reference CLIENT on 5174..."
echo "    When it's ready, open http://localhost:5174 in an INCOGNITO window."
cd "$REF/client" && npm run dev
