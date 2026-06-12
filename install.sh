#!/usr/bin/env bash
# deals.dev for Claude Code — installer
# Usage: ./install.sh dd_live_yourkey
set -euo pipefail

KEY="${1:-}"
if [[ ! "$KEY" == dd_* ]]; then
  echo "Usage: ./install.sh dd_live_yourkey"
  echo "Get your key at https://deals.dev/dashboard"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.deals-dev"
# Pass the key through the environment (never interpolated into the script
# body) so a crafted key string can't break out and execute code.
DEALS_DEV_KEY="$KEY" node -e '
const fs = require("fs");
const file = process.env.HOME + "/.deals-dev/config.json";
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
cfg.apiKey = process.env.DEALS_DEV_KEY;
fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
'

mkdir -p "$HOME/.claude"
DEALS_DEV_SCRIPT_DIR="$SCRIPT_DIR" node -e '
const fs = require("fs");
const file = process.env.HOME + "/.claude/settings.json";
let settings = {};
try { settings = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
settings.statusLine = {
  type: "command",
  command: "node " + JSON.stringify(process.env.DEALS_DEV_SCRIPT_DIR + "/statusline.js"),
  refreshInterval: 10,
};
fs.writeFileSync(file, JSON.stringify(settings, null, 2));
'

echo "✓ deals.dev installed. Restart Claude Code and watch the status line earn."
echo "  Balance: https://deals.dev/dashboard"
