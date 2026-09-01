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
  is unmeasured. **Two of them have been measured since: see section 9.5, written on the same day.** Error handling therefore stands on orca's code, being
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

Section 8.5 stands except for the two failure paths section 9.5 measures.
Nothing has been measured with an expired access token, and nothing on API key
billing has been measured. The error handling in `src/main/usage/service.ts`
maps by STATUS ONLY and reads nothing out of an error body, precisely because
almost no error body has ever been seen.

### 9.5 The two failure paths that ARE now measured, 2026-08-31

The phase's verification and its fix round each exercised one, so this is the
first entry in this document written from a refusal rather than from a 200.

**Codex refuses a bad bearer with 401, and the face is right.** A deliberately
wrong token to `chatgpt.com/backend-api/wham/usage` answered 401. The service
maps that to `expired`, and the meter drew `Codex. Run Codex to refresh the
login.` beside a healthy Claude row. That is the branch working end to end.

**Claude refuses with 429, not 401, at least when there is no credential at
all.** A GET to `api.anthropic.com/api/oauth/usage` carrying the beta header
and the user agent but NO `Authorization` header answers **429**, with
`Retry-After` present and an `error.type` of `rate_limit_error` in a 107 byte
body. Measured twice: `Retry-After: 3438` during the verification and
`Retry-After: 3600` when the fix round re-derived it, which reads as a per IP
anonymous bucket rather than an account one. So Anthropic DOES send
`Retry-After` on a 429, which section 8.5 listed as unknown, and the shipped
reader of it is exercised.

What this does NOT tell us, and a later round must not read it as if it did:
what Claude answers to a request carrying a real but REFUSED token. Tortie
never sends the no header shape, because a provider with no credential answers
`signed-out` before any request is made. So the 401 and 403 branch is still
unexercised for Claude, and it is possible that a refused token also arrives
as a 429. That would draw the old numbers under the stale glyph for up to
twenty four hours rather than the line telling the person to run the agent.

The mapping was deliberately NOT changed for it. Mapping 429 to `expired` on
this evidence would be reading an unauthenticated refusal as if it were an
authenticated one, and it would break the rate limit policy that this same
measurement just proved is real, being a genuine `Retry-After` the service
already honours. The honest next step is one measurement with a token the
vendor will refuse, which needs an expired login and therefore Phase 182.

## 10. The Phase 182 condition, measured 2026-08-31: yes, per session, without touching his settings.json

Section 6 left one open mechanism question and Phase 182 was told to stop if the answer was no.
The answer is **yes**, and the lever is not the environment and not the config directory. It is a
command line flag Claude Code already ships.

Everything below was measured against **Claude Code 2.1.252** on the operator's own machine, in tmux
panes stamped exactly the way `paneEnvFor` in `src/main/sessions/launch-plan.ts` stamps them.
`~/.claude/settings.json` was read once and never written. Five claude processes were started and
**exactly one real turn was spent**, a three word prompt answered with one word. Every tmux server
was a scratch socket of this measurement's own and every one was killed.

### 10.1 The mechanism, in one line

```
claude --settings <absolute path to a JSON file> …
```

`--settings <file-or-json>` is a documented Claude Code option, printed by `claude --help` as "Path
to a settings JSON file or a JSON string to load additional settings from". A settings file supplied
this way becomes a settings SOURCE that Claude Code calls `flagSettings`. It is per process, so it
is per session, and it touches nothing on disk that the person owns.

### 10.2 Precedence, and it is the fact that decides the design

Claude Code's own source order, read out of the 2.1.252 binary, is

```
["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"]
```

and the vendor's own option copy inside the same binary states the direction plainly, for a
different setting: "Honored from managed settings, a `--settings`/SDK-supplied settings file, and
user settings, in that precedence order". So **managed beats flag beats user**.

Measured directly rather than inferred: one session was launched with a `--settings` file naming
statusLine script A while its working directory carried a `.claude/settings.json` naming statusLine
script B. **A ran. B never ran at all**, its log file was never created.

**The consequence the phase must answer.** A statusLine is a whole block and the highest precedence
source that defines one wins outright, with no merging across sources. The operator has NO
`statusLine` in `~/.claude/settings.json` today, so nothing is displaced now. But if he ever adds
one, Tortie's flag settings would REPLACE it inside Tortie launched sessions and his own status line
would vanish there. Phase 182 either composes his command inside Tortie's own and passes its stdout
through, or refuses to install when a user statusLine exists and says so. It may not silently win.

### 10.3 The proof that it carries the numbers

A statusLine script that emits nothing on stdout and appends its stdin to a scratch file, given
only through `--settings`, in a tmux pane carrying `GMUX_MANAGED=1` and `GMUX_SESSION_ID`:

- **It ran, and it ran twice**, once at startup and once for the turn.
- **Both invocations saw the pane env.** `GMUX_SESSION_ID` and `GMUX_MANAGED` were readable from the
  script's own environment, with the values Tortie stamped. So a Tortie session's identity reaches
  the managed script without anything being parsed out of the payload.
- **The startup invocation carried NO `rate_limits`.** The key was simply absent.
- **The turn invocation carried it.** `rate_limits` was present with `five_hour` and `seven_day`,
  each `{ used_percentage, resets_at }`.

That is the whole condition met: numbers, per session, no edit to his settings.

### 10.4 The tap's wire shape is NOT the endpoint's wire shape, and this is the trap

Section 8.2 measured the served endpoint and ruled that the percentage field is `utilization`, a
float, and that `used_percentage` does not exist. **The statusLine payload is the other way round.**

| | Endpoint, section 8.2 | statusLine tap, measured here |
| --- | --- | --- |
| Percentage field | `utilization`, float, 0 to 100 | **`used_percentage`, INTEGER**, 0 to 100 |
| Reset time | ISO 8601 string with microseconds | **UNIX SECONDS**, integer, 10 digits |
| Windows delivered | `five_hour`, `seven_day`, plus `limits[]` | `five_hour`, `seven_day` only |
| Per model weekly row | present in `limits[]`, Fable at 100 percent | **ABSENT on this account** |

The reset time being seconds is corroborated by the binary, which multiplies the statusLine
`resets_at` by 1000 before it meets a `Date`. A parser shared between the two sources that assumes
one field name or one time unit is wrong for the other source by construction. **Two parsers, or one
parser told which source it is reading.**

The absent per model row matters for the surfaces Phase 181 shipped: the Fable row can come only
from the endpoint. A live tap that suppresses the poll therefore also suppresses that row unless the
phase keeps the last endpoint answer for it.

### 10.5 The full statusLine payload, keys and types only

Measured on the turn invocation. No value is recorded. Several of these are personal, being `cwd`,
`transcript_path`, `session_name`, `prompt_id`, `session_id` and the whole `cost` block, so the
managed script posts the `rate_limits` block and the session id stamp and NOTHING else.

```
context_window { context_window_size, current_usage { cache_creation_input_tokens,
  cache_read_input_tokens, input_tokens, output_tokens }, remaining_percentage,
  total_input_tokens, total_output_tokens, used_percentage }   all int
cost { total_api_duration_ms, total_cost_usd, total_duration_ms,
  total_lines_added, total_lines_removed }
cwd, prompt_id, session_id, session_name, transcript_path, version   string
effort { level }, model { display_name, id }, output_style { name },
thinking { enabled }, workspace { added_dirs[], current_dir, project_dir }
exceeds_200k_tokens, fast_mode   bool
prompt_cache { cache_write_tokens, caching_observed, expected_rebuilds, expires_at,
  hit_ratio, last_miss_at, miss_recache_tokens, misses, recache_tokens_if_cold,
  requests, ttl, warm }
rate_limits { five_hour { used_percentage, resets_at }, seven_day { … } }
```

Four things the schema in the binary declares that this account did NOT receive, so the reader names
what it wants and drops the rest whole: `rate_limits_available` (declared as false when plan limits
do not apply, meaning API key, Bedrock, Vertex or a missing profile scope), `rate_limits.model_scoped`
(the per model weekly rows, "present only when the server emits them"), `rate_limits.extra_usage`,
and `rate_limits.spend_limit`. The binary gates the whole block on
`five_hour || seven_day || spend_limit`, which is why the key is simply absent rather than null.

`rate_limits` appears in the payload only when it is really there, so a plain substring guard on the
text before any JSON work is sound, which is the orca discipline section 3 records.

### 10.6 Cadence, measured and not measured

Two invocations for one startup and one short turn, which is the honest number and no more. The
binary re-runs the status line whenever any of `tokenUsage`, `permissionMode`, `vimMode`,
`mainLoopModel`, `fastMode`, `effortValue`, `thinkingEnabled` or `prStatus` changes, when the last
assistant message id changes, and on the optional `refreshInterval` seconds. Token usage changes
during streaming, so a long turn spawns the script many more times than this measurement saw.
**The self throttle is not optional**, and the substring guard is what keeps the common tick cheap.

Measured free, by editing only the script file and pressing shift+tab, which changes
`permissionMode` and re-runs it: a script that PRINTS puts its line in the pane above the mode hint,
and a script that prints NOTHING leaves the pane with no extra row at all. That is the stdout
negative control at the shape level, and it holds.

### 10.7 Three failure modes the builder inherits, all measured

1. **A missing settings file KILLS the session at launch.** `claude --settings <path that does not
   exist>` prints `Error: Settings file not found: <path>` and exits 1 immediately. The pane is dead
   before the TUI draws. Tortie persists argv in the manifest and replays it at restore, so a
   settings file written under a temporary directory, or deleted by a later cleanup, turns every
   restore of that session into an instant death. **The file lives in durable userData and is
   written before the launch and before every restore.**
2. **A malformed settings file BLOCKS the session on a modal.** A file holding invalid JSON draws a
   "Settings Error" dialog naming the file, with three choices and "Enter to confirm", before the
   session is usable. Its own copy is "Files with errors are skipped entirely, not just the invalid
   settings." So the write is atomic, and a byte that is not valid JSON stops every Claude session
   Tortie launches until a person presses a key.
3. **Workspace trust gates it.** In a directory Claude Code has not been trusted in, the trust
   question comes first and the binary logs "Status line command skipped: workspace trust not
   accepted" until it is answered. This is not new, every Claude session in a new project already
   meets it, but it means the tap is silent for a session's whole first run in a new folder.

A fourth, read from the binary rather than measured: `disableAllHooks: true` in a higher precedence
source disables the status line, and `--bare` skips hooks entirely. Both are honest silences and the
meter should treat a tap that never posts as no answer rather than as zero.

### 10.8 Why CLAUDE_CONFIG_DIR is the WRONG lever, recorded so nobody tries it

The charter pointed at the config directory because section 8.1 recorded that Claude Code 2.1 plus
scopes its keychain item per config dir. That is real, and it is exactly the reason not to use it
here. Pointing a session at a scratch `CLAUDE_CONFIG_DIR` moves the whole world with it:

- **The login.** A different config dir means a different keychain item, so the session is signed
  out and there are no rate limits to report at all.
- **The conversation store.** The registry's `sessionStore` for claude is
  `~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl`, and `storeDirs` names
  `~/.claude/projects`. Move the config dir and resume, harvest and SpecStory capture all look at an
  empty tree.
- **His history, his skills, his plugins and his agents**, none of which the person asked to lose
  for one meter.

`--settings` moves one key and nothing else. It is the correct lever and the config dir is not.

### 10.9 File or inline JSON, and where the token may not go

Both shapes work. `--settings '{"statusLine":{"type":"command","command":"…"}}'` was measured and
its script ran at startup with the pane env intact, so inline JSON avoids failure mode 1 entirely,
there being no file to lose. The cost is that everything in it lands in the process argv, which is
world readable through `ps` on this machine, and in the manifest row.

So the ruling for Phase 182: **the loopback server's per boot token never goes in the argv, and it
never goes in the settings JSON if the settings JSON is inline.** The pane environment Tortie
already stamps is the right carrier, or a file under userData at mode 0600 whose path the pane env
names. Both keep the secret out of every other user's `ps`.

### 10.10 What this section does NOT settle

- **Nothing was measured with a long turn**, so the real invocation rate under streaming is unknown
  and the throttle must be designed for the worst case rather than for the two ticks seen here.
- **The flag against USER settings was not measured directly**, because measuring it would mean
  writing a statusLine into his `~/.claude/settings.json`, which the phase forbids. The direction is
  taken from Claude Code's own source order and its own option copy, corroborated by the flag
  against project settings measurement, which is as far as an honest measurement can go here.
- **One account, one plan, one machine, one version.** `rate_limits_available`, `model_scoped`,
  `extra_usage` and `spend_limit` were all absent here and none of their populated shapes has been
  seen.
- **Nothing was measured on API key billing**, where the binary says `rate_limits` is null and
  `rate_limits_available` is false. That face is still inherited rather than confirmed.

## 11. What Phase 182 built on section 10, and the two things it changed

Section 10 answered the condition and named a trap. This section records what the build did with
both, so a later round reads the decisions beside the measurement rather than out of a commit body.

### 11.1 It opened NO second socket and minted NO second token

The phase brief asked for a loopback server bound to 127.0.0.1 on an ephemeral port with a per boot
token. Tortie has had one since Phase 13: `GmuxHookServer` in `src/main/activity/hooks.ts`, bound to
127.0.0.1, `Host` checked, bodies capped, with a **per session** 128 bit token in the path, and it is
already reachable from a claude session because the settings file naming it is already on the argv.
So the tap is one more route on that server, `POST /u/<token>`, one more key in the settings file
that server already writes, and a small shell script in the same directory.

A per session token is stronger than the per boot one the brief described, and it is what lets the
route hand the ingest layer a SESSION rather than a claim. It also survives a Tortie restart,
because the token is recovered out of the file rather than re-minted, which is what makes a claude
that outlived the app post to the current port instead of a dead one.

### 11.2 The refusal, and why it is not a composition

Section 10.2 measured that a `statusLine` is one command and the highest precedence source wins
outright, and named the two answers: compose the person's command inside Tortie's own, or refuse to
install when the person already has one. **Phase 182 refuses.** Composing would mean Tortie's own
script reading a command out of a configuration file and running it, which is the boundary the
project already draws: configuration selects from choices the compiled world already contains, or
names an executable the person has personally confirmed, and `~/.claude/settings.json` is neither of
those to Tortie.

The check reads three files and writes none: the user file at `<CLAUDE_CONFIG_DIR or ~/.claude>/
settings.json`, and, when the session's working directory is known, `<cwd>/.claude/settings.json`
and `<cwd>/.claude/settings.local.json`. Every one of those is a source Tortie's flag file outranks,
so every one of them is a status line Tortie would silently replace. A file that does not parse
names nothing, which is claude's own rule for it.

**The limit a person will meet:** the refusal is a log line and nothing on a surface. A person who
has their own status line and turns the meter on gets the fifteen minute endpoint poll and no live
numbers, and nothing tells them why.

### 11.3 What a post has to survive

Five rules in order, in `src/main/usage/service.ts`, and any one of them drops the post whole.

| Rule | Drops | Because |
| --- | --- | --- |
| The Claude switch is off | `off` | Nothing while off is the whole permission this feature has |
| The body did not parse, or named no window | `shape` | An absent window is silence, never a cleared meter |
| The body claims a session the token does not own | `session` | The token is the identity; the claim is not |
| The config directory is not the account main reads | `account` | Another account's quota under this account's plan word is a lie |
| The same numbers again inside thirty seconds | `duplicate` | A long turn re-runs the status line and two panes post the same thing |

A post that survives all five sets the two windows, moves the read time, and **keeps the per model
weekly row and the plan word**, which is section 10.4's consequence answered directly: the tap
carries `five_hour` and `seven_day` and nothing else, so a tap that overwrote the whole parse would
take the Fable row off the hover card for as long as it kept suppressing the poll. It does not clear
a `Retry-After` either, because a wait the vendor asked for is not answered by a number that arrived
another way.

A fresh post suppresses the endpoint POLL for five minutes. It never suppresses the refresh control,
because that is a person asking, and because the endpoint is the only source of the row above.

### 11.4 The switch now decides that something runs, and the boundary still holds

Phase 181 recorded that turning a meter on starts nothing. That is no longer true: with the Claude
switch on, a claude session Tortie launches from then on carries a managed status line, and claude
runs it on the person's own turns. What the switch cannot do is decide WHAT runs. The script is
generated whole by Tortie from `src/main/usage/statusline.ts`, it lives under Tortie's own userData,
and no field of any settings file reaches its bytes or its argv. That is the line refusal 8 draws.

It reaches a session at its NEXT launch or restore, because claude reads its settings once at
process start. Turning the switch off stops the numbers at once and every later post is dropped, but
a session launched while it was on goes on running the script until it ends.

### 11.5 What is still not verified

- **No long turn has been measured**, so the real invocation rate under streaming is still unknown
  and the throttle is still designed for the worst case rather than for a measurement.
- **Nothing was measured on API key billing**, where the binary says `rate_limits` is null.
- **The workspace trust gate is inherited rather than driven**: a folder claude has not been trusted
  in logs "Status line command skipped: workspace trust not accepted", so the tap is silent for a
  session's whole first run in a new project and the endpoint poll is what draws the meter there.

## 12. What the independent verification measured, 2026-09-01, and what its fix round changed

Phase 182's verification came back needs_work with two blocking findings and three notes. Every one
of them was reproduced before anything was changed, and one of the notes was settled by measurement
rather than left as a risk. This section is the measurements, so a later round inherits them.

### 12.1 argv really is readable by every account on this machine

Section 10.9 rules that a token never rides in an argv "because argv is world readable through `ps`
on this machine". That premise was checked rather than assumed, since a ruling built on a false
premise is worth less than no ruling. As uid 501, `ps -Ao user=,args=` prints the complete **24
argument** command line of a root owned process, `/usr/local/vanta/osqueryd --verbose=false
--config_tls_refresh=1200 …`, and of every other account's processes too. So the premise holds and
the exposure is every account on the machine rather than only this one.

### 12.2 The first build honoured that rule for two argvs and broke it in a third

The `statusLine` command in the settings file carries no token and no URL, and the `sh -c` argv the
binary composes carries none either. Both were dumped and both are clean. The script then composed
this, recorded by a PATH of shims that write down every command they are given before becoming it:

```
curl -s -m 3 --noproxy * -o /dev/null -H content-type: application/x-www-form-urlencoded \
  --data-binary @- http://127.0.0.1:59132/u/deadbeefdeadbeefdeadbeefdeadbeef
```

One post per pane per fifteen seconds, readable for as long as the three second timeout runs. The
impact is bounded, that token authorises posting usage numbers and activity hook events for one
session to Tortie's own loopback server and it is not a vendor credential, but the source said
plainly that it never happens.

**The fix keeps the rule rather than correcting the sentence.** The destination goes into a file
beside the throttle stamp, created under `umask 077` after an unlink so an older mode cannot survive
a truncating redirect, and curl is given `-K <file>`. The body already rode stdin through
`--data-binary @-`, so nothing else moved. Re-measured through the same shims: **zero** of the
commands the script runs carries the token, the post still lands on `/u/<token>` with a byte
identical body, and the file is unlinked the moment curl returns. The reason this needed a run at
all is that the offending argv is composed at run time, so reading the script could not see it.

### 12.3 An unauthenticated caller could erase the log through the new route

Every check on `/u/` happens BEFORE the token is looked up, so the caller driving a refusal is
unauthenticated by construction: any process on the machine, and a web page too, since a form
encoded POST is CORS simple and the `Host` a browser sends to `127.0.0.1:PORT` passes the loopback
check. The first build wrote one `warn` per refused post with no bound.

Measured over the real bound server: **500 anonymous posts produced 500 log lines in 47 ms**, which
is 10,638 a second, and the same 500 posts to `/h/` produced **none**, so the asymmetry arrived with
this route. `src/main/log/transport.ts` caps `app.log` at 2 MiB with one archive, so this was never
disk fill, it was diagnostic **erasure**: the real line through the real envelope builder is **138
bytes**, so **30,394 posts evict `app.log` and `app.log.1` both**, which is **2.9 seconds** at the
measured rate, and the log is what a later incident is read out of.

The fix is the bound that was already in the same file for the not-installed reasons: one line per
reason per process. The reasons are a closed set of four, being `method`, `route`, `token` and
`oversized`, so the route's whole lifetime cost is four lines and the diagnostic value of seeing
each reason once survives.

### 12.4 Claude Code reads the CHECKOUT ROOT's `settings.local.json`, not the working directory alone

This was left as an unsettled risk by the verification and it is settled here, against the real
2.1.252 binary, with `--debug --debug-file`, which names every settings path it tries. No turn was
spent: `ANTHROPIC_BASE_URL` pointed at a closed loopback port and the runs stop at "Not logged in"
with a scratch `HOME` and `CLAUDE_CONFIG_DIR`, so nothing under the person's own home was read or
written.

From a working directory three levels below a git root, the paths it tried were:

| Path | |
| --- | --- |
| `<configDir>/settings.json` | the user file |
| `/Library/Application Support/ClaudeCode/managed-settings.json` | the managed file |
| `<cwd>/.claude/settings.json` | the project file |
| `<cwd>/.claude/settings.local.json` | the local file |
| `<gitRoot>/.claude/settings.local.json` | **the one Tortie was missing** |

and its own watch line named `<gitRoot>/.claude/settings.local.json` as well. Three controls make it
decisive. Moving the working directory deeper moved four of those paths and left the fifth on the
root exactly, so it is the checkout root and not the parent directory. Removing the `.git` made the
fifth disappear entirely, so it is discovered through git. And `<gitRoot>/.claude/settings.json` is
absent from the tried list in **every** run including the one where no settings file existed
anywhere, so that one is genuinely not read.

Without this, a session whose working directory is a subdirectory of a repository whose root carries
a `statusLine` would have had Tortie's installed over the person's, silently, which is the exact
outcome the refusal exists to prevent. `personStatusLineFiles` now walks up to the checkout root by
looking for `.git` (a directory in a clone, a file in a worktree or a submodule) and adds both of the
root's files. The `settings.json` at the root is checked even though claude does not read it, because
the two costs are not the same size: refusing when claude would not have been overridden costs the
live meter and keeps the fifteen minute poll, which is this feature's documented fallback, while not
refusing when it would have costs the person the status line they wrote, with nothing on screen to
say why.

### 12.5 Two smaller things, both measured

**The token carrier was 0644 where 10.9 asks for 0600.** `writeFileAtomic` used `writeFileSync` with
no mode, which under the ordinary umask 022 is 0644, measured here and measured again on the
operator's own install where all 26 settings files read `-rw-r--r--`. In practice the secret was
protected by an ancestor, `~/Library` being `drwx------`, but an ancestor is somebody else's
decision. It is 0600 now, and because the file is rewritten before every launch, every restore and
at boot, existing installs reach it with no migration. The chmod is separate from the write because
the `mode` option only applies to a file the write CREATES.

**The boot sweep reached one of the three name shapes in that directory.** `<id>.json.<pid>.tmp`,
left by a crash between the atomic write and its rename, does not end in `.json` and would have
survived every sweep forever; the throttle stamps under `stamps/` were correctly untouched by the
`.json` filter and were never removed by anything else. Both are bytes rather than faults, and both
are swept now.

### 12.6 What the verification could not fault

The five ingest rules, the clamp, the dedupe, the five minute poll suppression that does not suppress
the refresh control and does not clear a vendor `Retry-After`, the decision to keep the per model
weekly row and the plan word, the separate reader for the tap's seconds against the endpoint's ISO
8601, the base64url config key surviving a path with a space, the atomic settings write, and the
whole refusal. Each of those was driven under attack and held.
