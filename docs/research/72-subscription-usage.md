# Research 72 — logged-in subscription usage in the sessions pane: what orca does, and what Tortie may do

Date: 2026-08-30. Operator requested. Read-only exploration of `/Users/gdc/orca` at its checkout state on this date; nothing there was modified. This document authorizes nothing by itself; the phases it proposes are queued only at the operator's word.

## 1. The ask

The operator wants orca-style subscription usage meters in Tortie: per provider, an icon, a small
progress bar, and text like `58% 5h · 41% wk` — the five-hour window and the weekly window of his
logged-in subscription, with a refresh control. His placement: **the sessions pane**. His screenshot
shows exactly two providers, Claude and OpenAI, which are also the two with the best-supported
mechanisms below.

## 2. The finding that shapes everything

**The numbers are served, not computed.** Every percentage in orca's bar comes from a vendor
endpoint answering with explicit fields; the client only labels the windows and draws the fill
width. There is no estimation, no token counting, no log parsing. That means the feature's whole
cost is: reading a credential the agent CLI already stored, making one HTTPS request the CLI itself
makes, and rendering four numbers.

The second finding is the boundary: **this would be the first time Tortie reads a person's stored
agent credential and reaches a network endpoint of its own.** Today Tortie holds no API key and
reaches no endpoint; the only model path is a confirmed agent binary. Orca crosses that line
routinely; Tortie crossing it is a deliberate act that needs its own rules, written in section 5.

## 3. How orca does it, provider by provider

Verified against orca's source on 2026-08-30. File references are into `/Users/gdc/orca`.

### Claude — three sources, tried in order

1. **The usage endpoint.** `GET https://api.anthropic.com/api/oauth/usage` with
   `Authorization: Bearer <oauth token>`, `anthropic-beta: oauth-2025-04-20`, and a claude-code
   User-Agent (`src/main/rate-limits/claude-oauth-usage-request.ts`). The response carries
   `five_hour` and `seven_day` objects, each with `utilization` (or `used_percentage`) and
   `resets_at`, plus a `limits[]` array from which orca extracts the **Fable weekly window**
   (`kind === 'weekly_scoped'`, scope display name `fable`). The client tags them 300 and 10080
   minutes; the API does not state durations.
2. **The statusline tap — the clever one, and free.** Claude Code ≥ 2.1.80 pipes a `rate_limits`
   block to the `statusLine` hook on every turn, piggybacked on Messages API responses, so reading
   it costs no usage-endpoint budget. Orca installs a managed statusline script that posts the
   block to a localhost hook server (`src/main/claude/statusline-script.ts`), self-throttled to one
   post per 15 s per pane, emitting no stdout so the user's own status line is unchanged. A fresh
   live snapshot suppresses the endpoint poll for five minutes.
3. **A hidden PTY fallback** that spawns `claude`, types `/usage`, and screen-scrapes the TUI.

Credentials: the macOS Keychain item `Claude Code-credentials` (config-dir-scoped in 2.1+, service
name suffixed with the first 8 hex of sha256 of `CLAUDE_CONFIG_DIR`), falling back to
`~/.claude/.credentials.json` (`claudeAiOauth.{accessToken, refreshToken, expiresAt}`). Orca
refreshes Claude tokens itself against `https://platform.claude.com/v1/oauth/token` and persists
the rotated refresh token atomically, because losing a single-use refresh token logs the person
out. A person on API-key billing gets an honest `No subscription plan — API key billing` and no bar.

### Codex — three sources

1. **Local JSON-RPC**: spawn `codex -c approval_policy=never -s read-only -a never app-server` and
   call `account/rateLimits/read` over stdio (`src/main/rate-limits/codex-rpc-rate-limit-probe.ts`).
2. **The backend endpoint**: `GET https://chatgpt.com/backend-api/wham/usage` with the token from
   `~/.codex/auth.json` plus headers `OpenAI-Beta: codex-1`, `originator: Codex Desktop`, and
   `ChatGPT-Account-Id`. The response states `plan_type` and `rate_limit.primary_window` /
   `secondary_window`, each `{used_percent, limit_window_seconds, reset_at}` — this API does state
   window durations, and orca classifies 300 or 10080 minutes with a one-minute tolerance.
3. **A PTY fallback** typing `/status` and parsing `5h limit …%` / `weekly limit …%` lines.

### The other six, briefly

gemini (`POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`, per-model buckets
with `remainingFraction`, credentials from `~/.gemini/oauth_creds.json`, opt-in only because the
fallback sources live in other apps' data folders); grok
(`https://cli-chat-proxy.grok.com/v1/billing`, token from grok's `auth.json`, weekly plus monthly);
kimi (`GET <base>/usages`, token file read-only — orca **never** refreshes it because a rotated
refresh token would log out a live kimi session); minimax and opencode (pasted browser cookies, the
latter scraping an embedded page payload); antigravity (no request at all — it relabels a
successful gemini result, and reports honestly unavailable otherwise).

## 4. The disciplines orca learned that Tortie should inherit on day one

- **Poll gently.** 15-minute default, and only while the window is visible and focused. The
  in-source comment: Claude's usage endpoint has a tight budget; prefer a recent snapshot over
  polling into 429s. Honour `Retry-After` on a 429, clamped to 24 h.
- **Stale beats blank.** A failed refresh keeps the previous snapshot visible under a small warning
  glyph for 30 minutes (24 h after a rate-limit) rather than flapping to an error face.
- **A sign-in prompt only on a confirmed sign-out.** Credential-refresh and network failures can
  mention auth while live sessions remain valid; only `missing-credentials` earns the CTA.
- **Never lie across accounts.** Live statusline posts are dropped unless their `configDir` matches
  the selected account, because another account's quota in this account's bar is a lie.
- **Read-only where refresh is dangerous.** Kimi and grok token files are never rewritten.
- **Display is served percent, clamped and rounded once**, with a "% used" / "% left" preference,
  bar colour stepping at 60 and 80 percent used, and a reset countdown that schedules one timeout
  to the next label boundary instead of ticking every second.

## 5. The boundary ruling Tortie needs before any phase builds

Three postures, ranked for Tortie. The proposal is to take the first two and refuse the third.

1. **The statusline tap first, for Claude.** Zero credentials read, zero endpoints reached, zero
   usage budget spent: Claude Code itself delivers `rate_limits` to a statusLine hook Tortie
   configures for the sessions it launches, posting to a localhost server Tortie owns. The limits:
   Claude only, and only while a session is actually running. This is the posture most consistent
   with Tortie's standing boundary, and it can ship alone.
2. **The read-only endpoint fetch, gated in Settings.** Tortie reads the CLI's stored token
   (keychain item or credentials file), calls the vendor's usage endpoint over TLS with exactly the
   headers the CLI sends, and writes nothing back — **no token refresh in the first phase**: an
   expired token shows "run claude to refresh" the way orca's kimi arm does, rather than Tortie
   taking custody of a rotating refresh token. Off by default; a person turns each provider on in
   Settings. This is Tier 3 by the house rule — it holds his credentials and sends them somewhere —
   and the somewhere is only ever the vendor that issued them.
3. **PTY probes: refused.** Spawning an agent under his account on a timer to type `/usage` is a
   process start no person asked for, against the spirit of refusal 8, and it is the least honest
   of the three sources. If sources 1 and 2 both fail, the meter says so.

Also carried over as hard rules for any phase: no credential ever leaves the machine except to its
own issuer; no credential is ever logged, stored, or copied into Tortie's data; the meter reads
sessions it did not launch never; a provider whose usage cannot be read shows nothing rather than a
guess; and the feature is one read-only surface — no "buy more", no reset-credit redemption, no
account switching in v1.

## 6. What Tortie already has that this lands on

The greyscale AgentIcon set (every provider icon already drawn, currentColor); the sessions pane
with room at its foot for a one-line strip; tokens.css for the three bar colours; the Settings
surface for per-provider opt-in; tmux-launched sessions whose env Tortie already stamps, which is
where a managed statusLine config can be injected per session without touching `~/.claude` global
settings — whether Claude Code accepts a per-session statusline override this way is the one open
mechanism question a phase must measure first. Tortie has no localhost hook server today; the tap
needs a small one, bound to 127.0.0.1 with a per-boot token, which is new attack surface and gets
Tier 3 eyes.

## 7. Proposed phases, for the operator to pick from

- **Phase A — the meter, served.** Claude + Codex read-only endpoint fetch (posture 2), the strip
  in the sessions pane: icon, 48×6 bar, `N% 5h · N% wk`, refresh control, stale-under-a-glyph
  policy, per-provider opt-in in Settings, default off. Tier 3. Small-to-medium.
- **Phase B — the free tap.** The Claude statusline sidecar (posture 1): localhost server, managed
  script, live updates that suppress the poll. Can land before or after A; if the mechanism
  question in section 6 answers well, B can even ship first and A becomes the fallback. Medium.
- **Phase C — more providers.** gemini, grok, kimi per orca's map, each with its stated limit.
  Only after A soaks. Small each.

Nothing is queued by this document; the operator picks, as with research 71.

## 8. What was NOT verified here

This research read orca's source and trusted its in-code comments; no endpoint was called, no
credential was read, and no request shape was replayed. The exact response bytes of
`api.anthropic.com/api/oauth/usage` and `chatgpt.com/backend-api/wham/usage` on HIS account, the
statusline behaviour of his installed Claude Code version, and whether a per-session statusLine
override works under tmux are all measurements the first phase must make before building on them.
