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

## 8. Measured over the wire, 2026-08-31, Phase 181 step one

Sections 1 to 7 read orca's source and trusted its in-code comments. Nothing there was called. This
section replaces that admission with bytes. On 2026-08-31 both endpoints were called exactly ONCE
each on the operator's own logged-in machine, with his own token and the CLI's own headers, and both
answered 200. Claude Code 2.1.251, codex-cli 0.150.1, `CLAUDE_CONFIG_DIR` unset.

Nothing was written, refreshed, rotated or copied. No token, account id, user id, email address,
request id or organization id appears anywhere below; where a value is an identifier the field is
named and the value is not recorded. The measurement scripts were deleted after the run.

### 8.1 Where the credentials actually are on this machine

**Claude: the keychain, and only the keychain.** `~/.claude/.credentials.json` DOES NOT EXIST here.
A builder that reads the file first finds nothing and must fall through, not conclude signed out.
The live source is a login keychain generic password whose service is the plain string
`Claude Code-credentials`, with **no sha256 config-dir suffix**, because `CLAUDE_CONFIG_DIR` is
unset. Section 3's scoped-service note is real in orca but does not apply to a default install, so
the reader tries the scoped name only when a config dir is set and always tries the plain name.
`security find-generic-password -s "Claude Code-credentials" -w` returned the payload with no GUI
consent prompt, because `security` is itself the app that created the item.

The payload is JSON with two top-level keys. `mcpOAuth` is a map of unrelated OAuth entries, one per
configured MCP server, each carrying its own access token; **Tortie reads `claudeAiOauth` and must
never touch, copy or log `mcpOAuth`.** `claudeAiOauth` carries exactly these fields:

| Field | Type | Note |
| --- | --- | --- |
| `accessToken` | string | the bearer, value never recorded |
| `refreshToken` | string | present, and Tortie never reads it in this phase |
| `expiresAt` | number | **milliseconds** since epoch |
| `refreshTokenExpiresAt` | number | milliseconds since epoch |
| `scopes` | array of string | five entries |
| `subscriptionType` | string | short plan word |
| `rateLimitTier` | string | a tier name |

The measured item's `expiresAt` fell 50 minutes after the call, and the keychain item's own
modification date was that same morning. **Claude Code rewrites this item roughly hourly.** That is
the whole argument for the no-refresh rule: an access token found stale simply means the agent has
not run recently, and the honest answer is to say run claude to refresh rather than to take custody
of a single-use refresh token. Note also that `expiresAt` is advisory; orca's comment that the
server decides is the right posture, because the item can be rewritten under the reader at any time.

**Codex: a file, no keychain.** `~/.codex/auth.json` exists, mode 0600. Fields: `auth_mode`
(string, measured `chatgpt`), `OPENAI_API_KEY` (null on a subscription login, so its presence is how
API-key billing announces itself), `tokens.id_token`, `tokens.access_token`, `tokens.refresh_token`,
`tokens.account_id` (a uuid, an identifier), and `last_refresh` (ISO 8601 with a `Z`).

### 8.2 Claude, GET https://api.anthropic.com/api/oauth/usage

Headers sent, exactly orca's: `Authorization: Bearer <accessToken>`, `anthropic-beta:
oauth-2025-04-20`, `User-Agent: claude-code/2.1.0`. Answer: **200**, `application/json`, 2032 bytes.

Response headers carry `request-id` and `anthropic-organization-id`. Both are identifiers and
neither may reach a log.

**A window object is this shape, and it repeats:**

```
{ "limit_dollars": null, "locked_reason": null, "remaining_dollars": null,
  "resets_at": "2026-08-31T20:00:00.282569+00:00", "used_dollars": null, "utilization": 2.0 }
```

Five findings that change what the parser may assume.

1. **The percentage field is `utilization`, a float on a 0 to 100 scale.** `used_percentage` DOES
   NOT EXIST in a live response. Section 3's "or `used_percentage`" came from orca's defensive code,
   not from bytes. Read `utilization`, tolerate the other, invent neither.
2. **`resets_at` is an ISO 8601 STRING**, with microseconds and an explicit `+00:00` offset. It is
   not seconds and it is not milliseconds. `Date.parse` reads it.
3. **The API states no window duration anywhere.** Nothing in the body says five hours or seven
   days. The key names are the only durations, so the client labels 300 and 10080 minutes itself,
   exactly as section 3 said.
4. **A window object can be present with `resets_at: null`.** The measured body carried a populated
   `nimbus_quill` window at `utilization: 0.0` with a null reset. A parser that assumes a present
   window has a reset time crashes on it.
5. **Money is minor units plus an exponent, never a float**, in `spend.cap.credits`,
   `spend.limit` and `spend.used`. Out of scope for Phase 181 and recorded so nobody parses it as
   dollars later.

**`five_hour` and `seven_day` were both present and populated**, at `utilization` 2.0 and 56.0.

**`limits[]` is an array of objects**, three on this account, each exactly:
`{ group, is_active, kind, percent, resets_at, scope, severity }`. `percent` is an INTEGER where the
window objects give a float, and on the measured account they agreed (2 against 2.0, 56 against
56.0). Measured `kind` values were `session` (group `session`), `weekly_all` (group `weekly`) and
`weekly_scoped` (group `weekly`). Measured `severity` values were `normal` and `critical`.
`is_active` was true on exactly one row, the one at 100 percent.

**The Fable window exists ONLY inside `limits[]`.** It is the row with `kind === "weekly_scoped"`
and `scope.model.display_name === "Fable"`, **capital F**, so the comparison lowercases or it misses.
`scope` is `{ model: { display_name, id }, surface }`, and `id` and `surface` were both null. There
is **no top-level `fable_weekly`, `fable_seven_day` or `seven_day_fable` key**; orca probes three
such names and this account's response carries none of them. Do not build on them.

**Present-and-null top-level keys, which the parser ignores whole:** `amber_ladder`, `cinder_cove`,
`iguana_necktie`, `juniper_tide`, `omelette_promotional`, `tangelo`, `seven_day_cowork`,
`seven_day_oauth_apps`, `seven_day_omelette`, `seven_day_opus`, `seven_day_sonnet`. These are code
names for buckets this account does not have, and the set will move without notice, which is the
argument for reading the two named windows plus `limits[]` and nothing else.

**The rest of the top level:** `member_dashboard_available` (boolean), `extra_usage`
(`credits_ever_enabled`, `currency`, `daily`, `decimal_places`, `disabled_reason`, `is_enabled`,
`monthly_limit`, `spend_limit_reached`, `used_credits`, `user_disabled`, `utilization`, `weekly`)
and `spend` (`auto_reload`, `balance`, `can_purchase_credits`, `can_toggle`, `cap`,
`disabled_reason`, `disclaimer`, `enabled`, `limit`, `percent`, `severity`, `used`). The
`disclaimer` string contains a markdown link, so it is untrusted text and is never rendered as
markup. None of this is in Phase 181.

**No identifier appears in the Claude response body.** Unlike Codex, below.

### 8.3 Codex, GET https://chatgpt.com/backend-api/wham/usage

Headers sent, exactly orca's: `Authorization: Bearer <tokens.access_token>`, `User-Agent:
codex-cli`, `OpenAI-Beta: codex-1`, `originator: Codex Desktop`, `ChatGPT-Account-Id:
<tokens.account_id>`. Answer: **200**, `application/json`, 1503 bytes, served through Cloudflare.

**THE HANDLING FACT, and it is the most important one in this section. The body carries the
person's `email`, `user_id` and `account_id` at the top level.** The Codex usage response is itself
personal data. It may never be logged, never written to the manifest or any store, and never crossed
whole over IPC. The main process parses it and sends the renderer numbers and timestamps only.

`plan_type` is a top-level string, measured `pro`.

`rate_limit` is `{ allowed: bool, limit_reached: bool, primary_window, secondary_window }`, and a
window is:

```
{ "limit_window_seconds": 604800, "reset_after_seconds": 559202,
  "reset_at": 1788747997, "used_percent": 2 }
```

**THE TRAP, and it is the finding that decides the parser.** On the measured account
`rate_limit.primary_window` was the **WEEKLY** window, `limit_window_seconds` 604800, and
`secondary_window` was **null**. There was no five hour window in `rate_limit` at all. A parser that
assumes primary is the five hour window draws the weekly number in the five hour slot and is wrong
by 100 percent of the value with no visible symptom. **Classify by `limit_window_seconds`, being
18000 for the five hour window and 604800 for the weekly, and never by position.** orca already does
this in `codex-rate-limit-window-classification.ts` with a one minute tolerance, and this
measurement is the reason it must.

Two more, both concrete:

1. **`reset_at` is UNIX SECONDS**, not milliseconds. The measured 1788747997 is 2026-09-06.
   Multiply by 1000 before it meets a `Date`.
2. **`reset_after_seconds` is also given**, a relative countdown, and it is the sturdier of the two
   because it needs no agreement about the machine's clock.

**`additional_rate_limits[]` exists and section 3 never mentioned it.** One entry was measured:
`{ limit_name: "GPT-5.3-Codex-Spark", metered_feature: "codex_bengalfox", rate_limit: { allowed,
limit_reached, primary_window, secondary_window } }`, and **this is where the 18000 second five hour
window lived** on the measured account, at 0 percent used. Phase 181 does not draw it. It is
recorded so that a later phase has the shape and so that nobody mistakes a per model bucket for the
account's main window.

**The rest of the top level:** `credits` (`approx_cloud_messages` and `approx_local_messages`, each
an array of two integers, `balance` which is a **STRING** and not a number, `has_credits`,
`overage_limit_reached`, `unlimited`), `rate_limit_reset_credits`
(`applicable_available_count`, `available_count`), `spend_control` (`individual_limit`, `reached`),
and three that were null: `code_review_rate_limit`, `promo`, `rate_limit_reached_type`.

### 8.4 What Phase 181 may now assume, in one place

| Question | Claude | Codex |
| --- | --- | --- |
| Credential source | keychain `Claude Code-credentials`, file fallback absent here | `~/.codex/auth.json` |
| Percentage field | `utilization`, float, 0 to 100 | `used_percent`, int, 0 to 100 |
| Reset time | ISO 8601 string | UNIX seconds, plus `reset_after_seconds` |
| Window duration stated | NO, the client labels it | YES, `limit_window_seconds` |
| Which window is which | by key name, `five_hour` and `seven_day` | by `limit_window_seconds`, NEVER by position |
| Fable or per model window | `limits[]`, `weekly_scoped`, `scope.model.display_name` lowercased | `additional_rate_limits[]`, not drawn in 181 |
| Identifiers in the body | none | **`email`, `user_id`, `account_id`** |
| Identifiers in the headers | `request-id`, `anthropic-organization-id` | Cloudflare ray id |

### 8.5 What is STILL not verified, and the builder may not pretend otherwise

- **No failure path was exercised.** The charter allowed one call per endpoint and both returned 200,
  so the 401, 403 and 429 bodies are unmeasured, and whether Anthropic sends `Retry-After` on a 429
  is unmeasured. Error handling therefore stands on orca's code, being
  `claude-oauth-usage-error.ts`, rather than on bytes: 429 message fixed, otherwise `error.message`
  from the body if it is a non-empty string, `Retry-After` read as seconds or as an HTTP date and
  clamped to 24 hours. Treat every one of those as unproven and make the parser survive the shape
  being different.
- **Nothing was measured with an expired access token**, so what either endpoint answers to one is
  unknown. The stale-under-a-glyph policy must not depend on guessing that answer.
- **Nothing on API key billing was measured.** There is no API-key account on this machine, so the
  honest `API key billing` face of section 3 is inherited from orca and not confirmed.
- **The statusline behaviour and the per-session `statusLine` override under tmux were not touched.**
  They remain Phase 182's first measurement, and Phase 182 still stops if the override needs a global
  settings edit.
- **`additional_rate_limits[]` had exactly one entry** and whether it grows, or reorders, is unknown.
- **One account, one plan, one moment.** Every shape above is one subscription's answer on one
  morning. A field that was null here may be populated for somebody else, which is the argument for
  a parser that reads the fields it names and drops everything else whole.

## 9. What Phase 181 built on top of section 8, and what it read

Phase 181 shipped the meter. This section records the differences between what
section 3 inferred from orca's source and what the shipped parser actually
does, so a later round does not re-derive them, plus the one real reading the
build was proved against.

### 9.1 Where the build differs from section 3, and why

| Section 3 said | The build does | Because |
| --- | --- | --- |
| `utilization` or `used_percentage` | reads `utilization`, tolerates the other, invents neither | section 8.2: `used_percentage` is not in a live response |
| the Fable window may be a top level key | reads `limits[]` only | section 8.2: none of the three top level names exists |
| orca refreshes Claude tokens itself | NOTHING refreshes anything | section 8.1: the item is rewritten hourly by the agent, and a rotated refresh token logs the person out |
| `primary_window` and `secondary_window` | classified by `limit_window_seconds` with a one minute tolerance, never by position | section 8.3: the measured primary window was the WEEKLY one |
| a base URL is a detail | the two hosts are frozen constants and no configuration can name a third | a bearer token may go to its issuer and nowhere else |

Two more decisions the bytes forced. A number that is not finite draws NOTHING
rather than a full bar, because 1e309 parses out of JSON as Infinity and a bar
at full is a claim about the account. And the transport is `node:https` rather
than a fetch, because Chromium's stack honours the system proxy, which would
make a third host a routine recipient of the token.

### 9.2 The real reading, 2026-08-31, both endpoints 200

The snapshot the renderer received, which is the whole of what crosses IPC:

- claude: five hour 5 percent, seven day 56 percent, and the per model weekly
  row `Fable` at 100 percent, which is the `limits[]` row with
  `kind === "weekly_scoped"` and `is_active` true.
- codex: NO five hour window at all, and the weekly window at 2 percent. The
  section 8.3 trap reproduced exactly: `primary_window` was the weekly one.

### 9.3 The leak check, run over the real Codex body

The measured body carried `email`, `user_id` and `account_id`, all three
present and non empty, and the parsed snapshot carried none of the three
values and no part of the access token. Response 200, 1503 bytes, matching
section 8.3. The unit suite pins the same property over sentinel values so it
is checkable without a network call.

### 9.4 Still not verified, and Phase 182 inherits the list

Everything in section 8.5 stands. No failure path has been exercised on either
endpoint, nothing has been measured with an expired access token, and nothing
on API key billing has been measured. The error handling in
`src/main/usage/service.ts` maps by STATUS ONLY and reads nothing out of an
error body, precisely because no error body has ever been seen.
