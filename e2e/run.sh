#!/usr/bin/env bash
# e2e/run.sh
#
# Isolated end-to-end test runner for path-scout.
#
# What it does:
#   1. Builds the full monorepo from source.
#   2. Creates a temp HOME directory so the server is completely isolated
#      from any real user config or stats database on this machine.
#   3. Copies the fixture config into that temp HOME so the server has
#      known routes to serve.
#   4. Starts the server as a background subprocess.
#   5. Runs e2e/test.mjs which polls until ready, then makes HTTP assertions.
#   6. Always cleans up the server process and temp dirs on exit.
#
# Usage (from monorepo root):
#   bash e2e/run.sh
#
# In CI this script is called directly by the GitHub Actions workflow.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E_DIR="$ROOT/e2e"
CLI_ENTRY="$ROOT/packages/cli/dist/index.js"
PORT=7801

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------

SERVER_PID=""
TEMP_HOME=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    echo "→ Stopping server (pid $SERVER_PID)…"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "$TEMP_HOME" ]]; then
    rm -rf "$TEMP_HOME"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

echo "→ Building monorepo…"
cd "$ROOT"
pnpm build

# ---------------------------------------------------------------------------
# Isolated config
# ---------------------------------------------------------------------------

TEMP_HOME="$(mktemp -d)"
CONFIG_DIR="$TEMP_HOME/.config/path-scout"
mkdir -p "$CONFIG_DIR"
cp "$E2E_DIR/fixtures/path-scout.config.ts" "$CONFIG_DIR/path-scout.config.ts"
echo "→ Config written to $CONFIG_DIR"

# ---------------------------------------------------------------------------
# Start server
# ---------------------------------------------------------------------------

echo "→ Starting path-scout on port $PORT…"
HOME="$TEMP_HOME" PATH_SCOUT_PORT="$PORT" node "$CLI_ENTRY" start &
SERVER_PID=$!

# ---------------------------------------------------------------------------
# Run tests
# ---------------------------------------------------------------------------

echo "→ Running e2e tests…"
PATH_SCOUT_PORT="$PORT" node "$E2E_DIR/test.mjs"

echo ""
echo "✓ All e2e tests passed"
