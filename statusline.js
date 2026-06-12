#!/usr/bin/env node
/**
 * deals.dev statusline for Claude Code.
 *
 * Claude Code invokes this command for every status-line refresh and pipes
 * session JSON to stdin. We print one sponsored line; each ~10 seconds of
 * activity becomes a confirmed impression worth 70% of the current bid.
 *
 * Configure via ~/.deals-dev/config.json (written by install.sh) or the
 * DEALS_DEV_API_KEY environment variable. Zero dependencies.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const CONFIG_DIR = path.join(os.homedir(), ".deals-dev");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const CACHE_FILE = path.join(CONFIG_DIR, "claude-cache.json");
const AD_TTL_MS = 10_000;
const FETCH_TIMEOUT_MS = 1_500;

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

/** Strip terminal control chars from advertiser text (anti escape-injection). */
function sanitizeText(s) {
  // eslint-disable-next-line no-control-regex
  return String(s == null ? "" : s).replace(/[\x00-\x1f\x7f-\x9f]/g, "");
}

/** Only http(s) URLs may be embedded as hyperlinks. */
function safeUrl(url) {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

/** OSC 8 terminal hyperlink — cmd/ctrl+click registers a tracked click (50x payout). */
function osc8(text, url) {
  const safe = safeUrl(url);
  if (!safe) return text;
  return `\x1b]8;;${safe}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

function getConfig() {
  const cfg = readJson(CONFIG_FILE, {});
  return {
    apiKey: process.env.DEALS_DEV_API_KEY || cfg.apiKey || "",
    apiUrl: (process.env.DEALS_DEV_API_URL || cfg.apiUrl || "https://deals.dev").replace(/\/$/, ""),
  };
}

async function confirmPending(cache, cfg) {
  const pending = cache.pendingConfirms || [];
  if (pending.length === 0) return cache;
  try {
    await fetch(`${cfg.apiUrl}/api/v1/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: pending.slice(0, 50).map((impressionId) => ({
          type: "impression",
          impressionId,
        })),
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    cache.pendingConfirms = pending.slice(50);
  } catch {}
  return cache;
}

async function main() {
  try {
    process.stdin.resume();
    process.stdin.unref();
  } catch {}

  const cfg = getConfig();
  if (!cfg.apiKey) {
    process.stdout.write(
      `${DIM}deals.dev: get an API key at https://deals.dev/dashboard, then run install.sh${RESET}`
    );
    return;
  }

  let cache = readJson(CACHE_FILE, {});
  const fresh = cache.ad && Date.now() - (cache.fetchedAt || 0) < AD_TTL_MS;

  if (!fresh) {
    // The previous ad has been on screen for its full display window — queue + confirm.
    if (cache.ad) {
      cache.pendingConfirms = [...(cache.pendingConfirms || []), cache.ad.impressionId];
    }
    cache = await confirmPending(cache, cfg);
    try {
      const res = await fetch(`${cfg.apiUrl}/api/v1/ad`, {
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "X-Deals-OS": process.platform,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        cache.ad = data.ad || null;
        cache.fetchedAt = Date.now();
      }
    } catch {
      if (cache.ad) cache.fetchedAt = Date.now(); // offline: reuse silently
    }
    writeJson(CACHE_FILE, cache);
  }

  if (!cache.ad) {
    process.stdout.write(`${DIM}deals.dev · no ads live${RESET}`);
    return;
  }
  const brand = sanitizeText(cache.ad.brandName);
  const line = sanitizeText(cache.ad.adLine);
  const label = brand ? `${brand} — ${line}` : line;
  process.stdout.write(
    `${CYAN}${osc8(label, cache.ad.clickUrl)}${RESET} ${DIM}· you earn 70%${RESET}`
  );
}

main().then(() => process.exit(0), () => process.exit(0));
