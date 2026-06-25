#!/usr/bin/env bash
# Ensure the project is ready to build, lint, and test in a fresh web session.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  npm install --no-audit --no-fund
fi

echo "Brain Dump is ready. Try: npm run dev | npm run build | npm run typecheck"
