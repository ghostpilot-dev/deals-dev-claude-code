# deals.dev for Claude Code

**Earn while Claude thinks.** This plugin turns your Claude Code status line
into a paid ad slot: while Claude works, one quiet sponsored line rides along
in the status line — and **70% of what the advertiser paid lands in your
balance**, in real time.

Zero dependencies. One auditable script. No popups, no noise, nothing touches
your code.

## What is deals.dev?

[deals.dev](https://deals.dev) is a marketplace for coding-agent idle time:

- **Advertisers** bid for the sponsored line in a live auction. One *block*
  buys 1,000 five-second impressions; the highest bid serves first.
- **Developers** (you) run a small client like this one. Every confirmed
  five-second impression credits **70% of the bid** to your account.
- **Clicks pay 50×** an impression. Cmd/ctrl-click the sponsored line in
  OSC 8-capable terminals (iTerm2, Kitty, WezTerm, VS Code's terminal) to
  open the sponsor through a tracked link.
- **Cash out from $25** — instantly via Stripe Connect, or manually
  (PayPal/Venmo/Wise/ACH) from your [dashboard](https://deals.dev/dashboard).

Everything is tracked in an auditable ledger: every impression, click, and
cent is visible at [deals.dev/dashboard](https://deals.dev/dashboard).

## Install

1. Create a free account at [deals.dev](https://deals.dev) and generate a
   device API key (`dd_live_...`) in the
   [dashboard](https://deals.dev/dashboard).
2. Clone this repo and run the installer:

```bash
./install.sh dd_live_yourkey
```

3. Restart Claude Code. Done — the sponsored line appears the next time
   Claude is working and there's a live campaign.

The installer writes your key to `~/.deals-dev/config.json` and sets the
`statusLine` entry in `~/.claude/settings.json`.

## Manual setup

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/this/repo/statusline.js"
  }
}
```

Provide your key either in `~/.deals-dev/config.json`:

```json
{ "apiKey": "dd_live_yourkey" }
```

…or as an environment variable:

```bash
export DEALS_DEV_API_KEY=dd_live_yourkey
```

Optional: point at a different API host (e.g. for self-hosting) with
`DEALS_DEV_API_URL` or `"apiUrl"` in the config file.

## How it works

1. Claude Code invokes `statusline.js` on every status-line refresh and pipes
   session JSON to stdin (the script reads and ignores it — nothing is sent
   anywhere).
2. The script fetches the current top-bidding ad from
   `GET https://deals.dev/api/v1/ad` and caches it for ~6 seconds — one
   five-second display block plus slack.
3. When the block is up, the impression is confirmed via
   `POST /api/v1/events` and the next ad is fetched. Confirmation is what
   credits your balance; amounts are computed server-side only.
4. The line is wrapped in an OSC 8 hyperlink — cmd/ctrl-click registers a
   click (50× payout) and opens the sponsor in your browser.

Offline or no campaigns live? The line stays quiet and nothing breaks —
failed confirmations queue up and retry on the next refresh.

## Privacy

The script sends exactly three things to deals.dev: your API key (to credit
the right account), your OS platform (`darwin`/`linux`/`win32`, used only for
advertiser OS targeting), and impression confirmations. **No code, no
prompts, no file paths, no session contents — ever.** It's ~150 lines;
read it yourself.

## Fair-play rules

- Impressions are rate-limited server-side to human-plausible speeds.
- An impression only pays after a full five-second display block is confirmed.
- One click per impression, within 10 minutes of a confirmed view.
- Scripted farming earns nothing and gets the API key revoked.

## Uninstall

Remove the `statusLine` entry from `~/.claude/settings.json` and delete
`~/.deals-dev`.

## License

MIT
