#!/usr/bin/env bash
# e2e/run.sh
#
# Isolated end-to-end test runner for path-scout.
#
# What it does:
#   1. Builds the full monorepo from source.
#   2. Creates a temp HOME directory so the CLI and server are completely
#      isolated from any real user config or stats database on this machine.
#   3. Drives the CLI interactively via expect (PTY):
#        a. "path-scout init" — sets the port to 7000.
#        b. "path-scout recipe apply ServiceNow" — configures a ServiceNow
#           environment named "dev" pointing at e2etest.service-now.com.
#      A preload module (e2e/preload.mjs) is injected via --import to work
#      around a Node.js readline bug that causes p.confirm() to stop
#      receiving keypresses when preceded by p.text() prompts.
#   4. Starts the server as a background subprocess using the generated config.
#      JITI_ALIAS is set so the config's ServiceNow plugin import resolves to
#      the locally-built plugin without needing a separate npm install.
#   5. Runs e2e/test.mjs which polls until ready, then makes HTTP assertions
#      against the ServiceNow routes that were just configured interactively.
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
PRELOAD="$E2E_DIR/preload.mjs"
PORT=7000

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
# Isolated environment
# ---------------------------------------------------------------------------

TEMP_HOME="$(mktemp -d)"
echo "→ Temp HOME: $TEMP_HOME"

# ---------------------------------------------------------------------------
# Drive interactive CLI prompts
# ---------------------------------------------------------------------------

echo "→ Driving interactive CLI prompts via expect…"
expect "$E2E_DIR/interact.exp" "$CLI_ENTRY" "$PRELOAD" "$TEMP_HOME"

echo "→ Generated config:"
cat "$TEMP_HOME/.config/path-scout/path-scout.config.ts"
echo ""

# ---------------------------------------------------------------------------
# Start server
# ---------------------------------------------------------------------------

# Symlink the locally-built plugin into the config dir's node_modules so
# jiti's CJS resolver finds it when loading the generated config.
PLUGIN_SRC="$ROOT/plugins/servicenow"
CONFIG_NM="$TEMP_HOME/.config/path-scout/node_modules/@path-scout"
mkdir -p "$CONFIG_NM"
ln -s "$PLUGIN_SRC" "$CONFIG_NM/plugin-servicenow"

echo "→ Starting path-scout on port $PORT…"
HOME="$TEMP_HOME" node "$CLI_ENTRY" start &
SERVER_PID=$!

# ---------------------------------------------------------------------------
# Run tests
# ---------------------------------------------------------------------------

echo "→ Running e2e tests…"
PATH_SCOUT_PORT="$PORT" node "$E2E_DIR/test.mjs"

echo ""
echo "✓ All e2e tests passed"
