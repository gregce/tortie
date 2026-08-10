# 18 — Accurate per-agent activity detection (Phase 13 design)

Implementable design for **BACKLOG Phase 13**: report `working` / `needs_input`
/ `idle` precisely and promptly for **every** supported agent, including
**hidden (unattached)** sessions.

Synthesised from three independent hands-on probes run on this machine on
**2026-08-10** (PROBE A — agent-native hooks; PROBE B — process/tmux signals,
1,396 samples; PROBE C — screen hashing + shells, 443 labelled captures), plus
a synthesis-pass verification run against the **user's own live `-L gmux`
server** (16 panes) and one scratch session of my own. Environment: macOS
24.6.0 (15.7.9), tmux 3.6a, claude 2.1.226, codex 0.147.0, qwen 0.21.7,
muse 0.1.0-R708.1, pi, agy 1.0.2, node-based gemini (auth-blocked).

Every number tagged **[measured]** came out of a probe in these sessions.
Nothing is recalled from memory. Claims that could not be executed here are
tagged **UNVERIFIED** and never load-bear.

---

## 0. Decisions at a glance

| Question | Decision | Evidence |
| --- | --- | --- |
| Is the BACKLOG's stated root cause right? | **No.** Idle agent TUIs do *not* redraw continuously. claude/codex/qwen/gemini/agy/pi emit **zero bytes** at an idle prompt. Only muse and deepseek-tui animate. | §1.1 — three independent measurements |
| What is actually broken? | `statusOverrides` in `src/renderer/state/store.ts` is a **sticky renderer override that is never cleared while a session is alive**, set from a byte stream that only exists for the **visible** pane. Main already computes the right answer and cannot displace it. | §1.2 — code + live proof |
| Primary signal for **claude** | **`~/.claude/sessions/<pid>.json`** — claude publishes `status: busy\|shell\|idle\|waiting` + `waitingFor`, keyed to the tmux pane. Zero injection, works detached, survives gmux restart. | §2.1 **[measured]** |
| Primary signal for **codex** | **`#{pane_title}`** — a full 3-state oracle: `work` / `⠙ work` / `[ ! ] Action Required \| work`. Zero injection, read in the poll gmux already runs. | §2.2 **[measured]** |
| Primary signal for **shell** | **`#{keypad_flag}` + `#{alternate_on}`** — zsh's ZLE sets DECKPAM at every prompt. Exact, zero injection, works detached. | §5.3 **[measured]** |
| Universal floor | tmux `#{window_activity}` + subtree CPU-time delta + "setsid'd tool child" + normalized `capture-pane` hash with a K-tick memory + one generic needs-input dialog regex | §4, §5 |
| Are hooks required? | **No — and that is the finding.** claude and codex are fully covered with **zero injection**. Hooks land as a latency/robustness upgrade (Tier 0), not as the mechanism the feature depends on. claude hooks default **ON** (free, merge cleanly); codex hooks default **OFF** (require a `--dangerously-bypass-hook-trust` banner). | §3 |
| Where does detection run? | **Main process**, as an upgrade to the existing `pollSessionStatus()` at `src/main/ipc.ts:445`. The renderer byte detector is **deleted**, not tuned. | §6.4 |
| Is BEL a needs-input signal? | **No — it is actively harmful.** 133/133 BELs captured off the wire were OSC string terminators; codex fires ~10/s *while working*. The current rule is inverted. | §1.3 **[measured]** |
| Cost | 1 exec/s, **2.75 ms CPU** for all 16 live panes ⇒ **0.28 % of one core**. `ps` snapshot (20.3 ms) only when a session is ambiguous. | §4.3 **[measured]** |

---

## 1. Why byte activity fails — the evidence

### 1.1 The premise is empirically false

BACKLOG line 87: *"Agent TUIs redraw continuously — spinners, elapsed-time
counters, token meters, cursor blink — so the predicate is always true."*

Measured three ways, independently:

| Measurement | Result |
| --- | --- |
| PROBE B: 90 s of true idle, output events counted per agent | claude **0**, codex **0**, agy **0**, pi **0**, qwen **0**, plain zsh **0**. muse **90** (exactly 1/s), deepseek-tui 6 in 15 s |
| PROBE C: `pipe-pane` byte count, claude idle, 25 s detached **and** 25 s attached | **0 bytes** in both runs. 99 idle samples → **1 distinct raw screen hash per run, with no normalization** |
| Synthesis pass, user's live server, `#{window_activity}` sampled 3× over 6 s | `claude-1` frozen at `1786388876` for the whole window; `shell-1` frozen at `1786388334`; only `research!` (muse) ticked (…977 → …979 → …981) |

So "any output → working" has a **0 % false-positive rate** on this corpus for
every agent except muse/deepseek. Byte activity is not too *loud*; the
detector was never receiving bytes to begin with for the sessions that were
stuck.

The genuinely hard direction is the opposite one — **false negatives while
working**. Codex goes screen-silent for up to 5 s mid-stream (PROBE C: 38/77
working ticks missed by a 1-tick raw-hash predicate), and claude asked to run
`sleep 25 && echo finished` was **silent for 16 s at 0.0–2.0 % CPU while
genuinely working** (PROBE B). Any design built only on "recent output" reports
a long tool run as idle.

### 1.2 The actual root cause, proven

Two defects compose:

**(a) The detector can only see the visible pane.**
`src/renderer/state/status-detector.ts:25` says so in its own header: *"bytes
only flow for ATTACHED sessions… A hidden session keeps its last observed
status until it is shown again."* `unwatch()` at line 136: *"The last emitted
status stands until re-watched."*

**(b) The stale value is then made permanent and given priority over main.**
`src/renderer/state/store.ts:974`:

```ts
effectiveStatus(session) {
  if (session.status === 'exited' || session.status === 'restorable') return session.status;
  return s.statusOverrides[session.id] ?? session.status;   // override WINS
}
```

and `applySessions` (store.ts:372) carries the override forward on every
refresh — its comment claims *"Overrides only refine live sessions; drop them
when main disagrees"*, but the code drops the override **only** when main says
`exited`/`restorable`:

```ts
if (o !== undefined && sess.status !== 'exited' && sess.status !== 'restorable') {
  overrides[sess.id] = o;      // survives main saying 'idle' forever
}
```

`onStatusChanged` (store.ts:520) likewise deletes the override only for
`exited`/`restorable`.

Net effect: a session that was once visible and once produced output is pinned
to `running` for the rest of its life. Meanwhile `src/main/ipc.ts:464` already
polls `#{window_activity}` for **all** sessions with a 15 s idle rule
(`MAIN_IDLE_AFTER_MS`) and would have said `idle` — and its own docstring
(ipc.ts:429) explicitly concedes priority: *"the renderer's finer per-byte
detection overrides main's status."*

**Live proof, user's own machine, this session:**

```
claude-1  pane %136  pane_pid 73030   window_activity frozen 4 h
~/.claude/sessions/73030.json → {"status":"idle","statusUpdatedAt":1786373527536}
now = 1786389029546      →  idle for 15,502 s (4 h 18 m)
```

The tab in the screenshot reads "working". Every objective signal on the
machine — tmux's own output clock, claude's own published status, the process's
CPU — said idle for four hours.

**Consequence for the design:** roughly half of Phase 13 is *deletion*. Adding
signals without removing the sticky override reproduces the bug.

### 1.3 The BEL rule is inverted

`status-detector.ts:187` scans the **raw** chunk for `0x07` and calls it
`needs_input`. PROBE C captured the raw pty around real permission prompts:

| Agent | BELs captured | Bare bells (real attention requests) | OSC string terminators |
| --- | --- | --- | --- |
| claude | 16 | **0** | 16 (`ESC ] 2 ; <title> BEL`) |
| codex | 117 | **0** | 117 (`ESC ] 0 ; ⠙ work BEL`) |

Codex repaints its title at ~10 Hz **while working**, so the rule fires ten
times a second during exactly the state it is meant to exclude, and never
fires when an agent actually blocks. tmux's own `#{window_bell_flag}` was `0`
for both panes throughout — tmux correctly consumes the BEL as a string
terminator, which is why main's poll is clean and the renderer's is not.

Note the ordering bug that causes it: `stripAnsi()` (line 64) *does* remove OSC
sequences, but the BEL scan runs on the raw `Uint8Array` **before** any
stripping.

**Action: delete the BEL rule.** Keep `#{window_bell_flag}` in main's poll as a
weak corroborator only (it never false-fired in any probe, but it also never
true-fired for a permission prompt).

### 1.4 The silence-after-burst rule must go too

`NEEDS_INPUT_AFTER_BURST_MS = 30_000` (line 51) declares "burst then 30 s quiet
⇒ the agent asked a question". Measured counter-example: **every completed
claude turn**. claude emits a burst, finishes, and sits at 0 bytes indefinitely
— that is `idle`, not `needs_input`. claude's *own* idle nudge fires at
**+60.08 s** after `Stop` (PROBE A **[measured]**), i.e. twice the threshold,
and even that is a nudge, not a block. Delete the rule; needs-input comes from
§2/§5.4 only.

---

## 2. The layered signal model

Four tiers. **Highest tier that produces a verdict wins**; lower tiers never
override a higher one, they only fill gaps. Hysteresis (§6.2) applies to
inferred tiers only — Tier 0 is authoritative and instant.

| Tier | Signal | Nature | Latency | Works detached |
| --- | --- | --- | --- | --- |
| **T0** | Agent-native truth: claude pid-file registry, codex `pane_title` oracle, injected hooks | Deterministic | 0–60 ms | Yes |
| **T1** | tmux formats: `window_activity`, `keypad_flag`, `alternate_on`, `pane_current_command`, `pane_dead` | Cheap, always sampled | ≤1 s | Yes |
| **T2** | Process subtree: Δ CPU-time, setsid'd tool child | Corroborator | 1–2 s | Yes |
| **T3** | Normalized `capture-pane` hash (K-tick memory) + generic dialog regex | Last resort | 1–6 s | Yes |

### 2.1 T0 for claude — the session registry (zero injection)

Claude Code writes `~/.claude/sessions/<pid>.json` for every interactive
session and keeps it current:

```json
{"pid":73030,"sessionId":"123ba279-…","cwd":"/Users/gdc/gmux","version":"2.1.226",
 "kind":"interactive","entrypoint":"cli","tmux":"claude-1:@136.%136",
 "name":"gmux-24","status":"idle","updatedAt":1786373527536,
 "statusUpdatedAt":1786373527536,"messagingSocketPath":"/tmp/cc-socks/73030.sock"}
```

- `status` ∈ **`busy | shell | idle | waiting`**; `waitingFor` (free text, only
  when `waiting`) observed as `"permission prompt"`, `"input needed"`; the
  binary also emits `"sandbox request"`, `"dialog open"`, `"worker request"`.
- The TUI derivation lifted from the 2.1.226 bundle (PROBE A):
  ```js
  waiting  ← sandboxHostPrompt | workerSandboxPrompt | elicitationPrompt
             | managedSettingsSecurityPrompt | topDialogWaitingFor
             | pendingWorkerRequest | pendingSandboxRequest | isShowingLocalJSXCommand
  busy     ← isLoading | delegatedActive
  idle     ← otherwise;   then idle ∧ backgroundShellRunning → "shell"
  ```
- Written from a React effect on every state change. **Latency 26–40 ms**
  against hook timestamps (PROBE A), and **≤1 s** in my own 1 Hz scratch run.
- Deleted on exit, including `tmux kill-session`.
- `claude agents --json` is the supported read path (~0.22 s/call) but **omits
  `tmux` and `waitingFor`** — read the files directly instead (~0 cost) and
  watch the directory.

**Verified end to end in the synthesis pass** on my own `-L gmux` scratch
session (`probeS-claude`, pane `%207`, pid 91771), 1 Hz sampling:

```
IDLE  title=[✳ Claude Code]        act=…073 (frozen 6 s)   pid-file: idle
      ── Enter pressed at t=…081 ──
+0 s  title=[⠂ Claude Code]        act=…081                pid-file: busy
+1 s  title=[⠐ Claude Code]        act=…082                pid-file: busy
+2 s  title=[✳ Send PONG response] act=…083                pid-file: idle
+3…30 s  frozen                                            pid-file: idle
```

`idle → busy` inside the same second as Enter; `busy → idle` inside the same
second as the last output. `tmux` field = `probeS-claude:@206.%207`, exactly
right for a session on the **private `-L gmux` socket** (claude runs
`tmux display-message -p -t $TMUX_PANE`, which inherits `$TMUX`).

**Three mapping traps found in the synthesis pass (not in PROBE A):**

1. **The `tmux` field's session *name* goes stale on rename; the pane id does
   not.** Live: `81487.json` says `"tmux":"claude-1:@126.%126"` but pane `%126`
   is session **`greg`** — the user renamed it after claude registered.
   ⇒ **Parse only the `%N` pane id. Never the name.**
2. **Older claude versions leave entries with no `status` field at all** —
   `61483.json` (v2.1.220, a VS Code extension host) has `kind:"interactive"`
   and no status. ⇒ Ignore any entry lacking `status`; do not treat missing as
   idle.
3. **Entries with `"tmux": null` exist** (non-tmux and pre-registration
   claudes, e.g. `2983.json`, `status:"busy"`). ⇒ Ignore them; they are not
   gmux sessions.

**Mapping rule (implement exactly this):** accept an entry iff
`kind === "interactive"` **and** `status` is present **and** (`tmux` parses to a
pane id that gmux owns **or** `pid` is `pane_pid` or a descendant of it).
The pid path is the fallback that covers gmux's **restore** shape, where the
pane runs `$SHELL` and the agent is a child (`src/main/restore/restore.ts`;
PROBE B saw `ROOT 71267 -zsh Ss / KID 71742 claude S+`).

Not useful here but recorded: `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1` makes
`--print`/SDK mode stream
`{"type":"system","subtype":"session_state_changed","state":"idle|running|requires_action"}`
— headless only.

**Startup gap:** in an untrusted directory claude shows the workspace-trust
dialog **before** registering its pid file (~35 s in PROBE A's run). "Pane
launched, no pid file yet" is `starting`, not `idle` (§6.1), and T3's dialog
regex catches the trust prompt as `needs_input`.

### 2.2 T0 for codex — the pane-title oracle (zero injection)

Codex publishes its full state through OSC 0/2, which tmux exposes as
`#{pane_title}` — readable for **detached** panes, in the `list-panes -a` call
gmux already makes, at zero marginal cost:

| State | `#{pane_title}` |
| --- | --- |
| idle | `work` (cwd basename) |
| working | `⠙ work` (braille frame U+2800–U+28FF, ~10 Hz) |
| needs input | `[ ! ] Action Required \| work` |

PROBE C **[measured]**: braille-prefix predicate = **0 % FN (0/88) and 0 % FP
(0/68)**. Synthesis pass confirmed the working→idle edge live on the user's own
`gmux research` codex session: `⠙ gmux` → `gmux` while `window_activity`
simultaneously froze.

### 2.3 Per-agent capability table

`SIG` = the tier that produces the verdict. All rows measured on this machine
unless marked.

| Agent | working | needs input | idle | Injection needed | Status |
| --- | --- | --- | --- | --- | --- |
| **claude** 2.1.226 | **T0** pid-file `busy` | **T0** pid-file `waiting` + `waitingFor` | **T0** pid-file `idle`/`shell` | **none** (hooks optional, §3.1) | **VERIFIED** end-to-end (PROBE A + synthesis run) |
| **codex** 0.147.0 | **T0** title braille prefix | **T0** title `[ ! ] Action Required` | **T0** title = bare basename | **none** (hooks optional, §3.2) | **VERIFIED** (PROBE C n=156; synthesis pass confirmed live edge) |
| **shell** (zsh) | T1 `keypad_flag==0 ∧ alternate_on==0` | — (never; shells do not demand attention) | T1 `keypad_flag==1`, or `alternate_on==1` ⇒ interactive TUI | none | **VERIFIED** (PROBE C + 5 live shells: all `keypad=1` at prompt) |
| **qwen** 0.21.7 | T0 hooks (`UserPromptSubmit`), else T3 | T0 `Notification`, else T3 regex | T0 `Stop`, else T3 | `QWEN_CODE_SYSTEM_SETTINGS_PATH` env (per-session, no global write) | hooks **VERIFIED** end-to-end (PROBE A); title has **no** state channel (live: `Qwen - pi`) |
| **gemini** | T0 hooks (`BeforeAgent`) | T0 `Notification` | T0 `AfterAgent` | `GEMINI_CLI_SYSTEM_SETTINGS_PATH` env | plumbing **VERIFIED** (SessionStart/SessionEnd fired); **turn events UNVERIFIED** — this account hits `IneligibleTierError` |
| **muse** 0.1.0 | T2 CPU 6–10 % ∨ tool-child; **thinking window UNCOVERED by T1/T2** → T3 hash | T3 regex | T1/T2/T3 with `animatesWhenIdle=true` | none available (`.muse-plugin/` dir only — no per-run flag) | events exist (binary extraction); **injection ABSENT** |
| **antigravity** (`agy`) | T2/T3 | T3 regex | T1 (0 bytes idle, **VERIFIED**) | none known | T1 idle **VERIFIED**; title `Mac`, no state channel |
| **pi** | T0 possible via `pi -e <ext.js>` (`turn_start`/`turn_end`/`agent_settled`) | T3 regex (no permission event) | T0/T3 | `-e <extension.js>`, repeatable, per-invocation | event API **VERIFIED from shipped `.d.ts`**; **not executed** |
| **deepseek** | T2/T3 (`animatesWhenIdle=true`) | T3 regex | T3 | unknown | animates at idle **VERIFIED** (6 events/15 s); rest **UNVERIFIED** |
| **cursor** (`cursor-agent`) | T1/T2/T3 | T3 regex | T1/T3 | unknown | **UNVERIFIED** — not probed |
| **droid** | T0 hooks (Claude-shaped: `UserPromptSubmit`/`Stop`/`Notification`) | T0 `Notification` | T0 `Stop` | **none documented** (`~/.factory/hooks.json` is global) | **DOCS ONLY — not installed here** |

Registry additions this implies (`src/main/agents/registry.ts`, additive
fields — the frozen contract allows appends):

```ts
/** How this agent's live activity is detected (Phase 13). */
activity: {
  /** Highest tier with a verified channel. */
  tier: 'native' | 'hooks' | 'process' | 'screen';
  /** Which native channel, when tier==='native'. */
  native?: 'claude-session-registry' | 'pane-title-oracle' | 'shell-keypad';
  /** Emits output at an idle prompt → the activity clock is not usable. */
  animatesWhenIdle: boolean;          // true: muse, deepseek. false: everything else measured
  /** Hook injection recipe id, when one exists. */
  hooks?: 'claude-settings' | 'codex-cli-config' | 'gemini-system-settings'
        | 'qwen-system-settings' | 'pi-extension';
  /** Evidence marker, per BACKLOG requirement. */
  verified: 'verified' | 'partial' | 'unverified';
}
```

---

## 3. Per-session hook injection (no global config mutation)

**Framing first.** §2 shows claude, codex and shell — the three agents the
BACKLOG's acceptance criteria name — are fully covered with **zero injection**.
Hooks are therefore a **latency and robustness upgrade**, and the only *primary*
channel for qwen/gemini/pi/droid. Ship them, but never let the feature depend
on them: every hook path must degrade to T1–T3 silently.

### 3.0 The local channel

One loopback HTTP server owned by main.

```
GmuxHookServer
  bind      127.0.0.1 : <port>          (never 0.0.0.0)
  port      persisted in gmux settings ("hookPort"); first free port from a
            deterministic base on first run. Stability matters — see below.
  auth      per-session opaque token, 128 bits, in the path:
              POST /h/<token>?e=<Event>
            unknown token → 404 with no body. No token, no reply.
  body      the hook's stdin JSON, ≤64 KB, parsed leniently; the QUERY STRING
            (session + event) is authoritative, the body is advisory.
  effect    resolves <token> → gmux sessionId, feeds one T0 event into the
            state machine (§6), replies 200 with an empty body immediately.
  lifetime  started with the app; tokens minted at session create, revoked at
            session end, persisted with the session record so a resumed
            session keeps its token.
```

Why HTTP rather than a unix socket: **claude supports `type:"http"` hooks
natively**, so claude fires zero subprocesses per event (PROBE A verified
loopback HTTP hooks working). Codex only has `command` hooks, so codex pays one
`curl` exec per event — acceptable, because these are per-turn events, not
per-frame.

**Port stability is the one hard constraint.** The port is baked into each
session's injected settings at launch, and a resumed session re-reads that same
file. If the port moves across a gmux restart, hooks for older sessions go dead.
Mitigations, in order:

1. Persist the port and re-bind it at boot (`hookPort` in gmux settings).
2. On boot, **rewrite every live session's settings file** with the current
   port (cheap, and a resumed claude re-reads it at start).
3. If a session's hooks are dead, nothing breaks — claude falls back to its pid
   file, codex to its title. Log once at debug; never surface an error.

Hardening: bind before advertising; refuse requests whose `Host` header is not
`127.0.0.1[:port]`; cap concurrent connections; never echo request content into
logs (hook payloads contain prompt text).

### 3.1 claude — `--settings`, merges, no global write

`--settings` accepts a **file path or an inline JSON string** (both VERIFIED,
PROBE A) and **unions** with user and project settings — a project
`.claude/settings.json` hook and an injected hook both fired in the same run.

Write once per session to gmux's userData (never `~/.claude`):

`~/Library/Application Support/gmux/hooks/claude/<sessionId>.json`

```json
{
  "allowedHttpHookUrls": ["http://127.0.0.1:47311/*"],
  "hooks": {
    "UserPromptSubmit":  [{"hooks":[{"type":"http","url":"http://127.0.0.1:47311/h/<tok>?e=UserPromptSubmit"}]}],
    "PermissionRequest": [{"hooks":[{"type":"http","url":"http://127.0.0.1:47311/h/<tok>?e=PermissionRequest"}]}],
    "PostToolUse":       [{"hooks":[{"type":"http","url":"http://127.0.0.1:47311/h/<tok>?e=PostToolUse"}]}],
    "Stop":              [{"hooks":[{"type":"http","url":"http://127.0.0.1:47311/h/<tok>?e=Stop"}]}],
    "SessionEnd":        [{"hooks":[{"type":"http","url":"http://127.0.0.1:47311/h/<tok>?e=SessionEnd"}]}]
  }
}
```

Launch argv becomes (in `buildLaunchSpec`, `src/main/manifest/agents.ts:103`):

```
claude --session-id <uuid> --settings <path> [...extraArgs]
```

and the **same `--settings <path>` must ride `resumeArgv`** (`claudeResumeArgv`,
agents.ts:155) — `--resume` does not re-apply launch flags.

Rules, all measured (PROBE A):

- **Use synchronous HTTP hooks.** With `async:true`, `SessionEnd` was dropped on
  process exit. A loopback POST is sub-millisecond.
- **`SessionStart` never arrives over HTTP** in either mode (it does as a
  `command` hook). Do not depend on it — the pid file covers session start.
- **Never pass `--setting-sources ""`.** It suppresses the user's model,
  plugins and permissions. The whole point of `--settings` is that it merges.
- **Ignore subagent-scoped events.** Payloads carrying `agent_id`/`agent_type`
  come from a subagent; they must not move top-level status.
- **`UserPromptSubmit` carries `prompt`, not `user_prompt`** — the published
  docs are wrong for 2.1.226.
- **`Notification` is debounced ~6 s** after `PermissionRequest`, and its idle
  variant fires **+60.08 s** after `Stop`. Never use it as the needs-input
  trigger; keep it only as an optional "ignored for a minute" nudge.

Event → state: `UserPromptSubmit` → working (**+14 ms**); `PermissionRequest` →
needs_input (**+43–58 ms** after `PreToolUse`); `PostToolUse` → working;
`Stop` → idle; `SessionEnd` → drop tier-0 state.

**Default: ON.** No banner, no trust prompt, no user-visible change.

### 3.2 codex — `-c hooks.<Event>=[…]`, requires a trust bypass

```
codex --dangerously-bypass-hook-trust \
  -c "hooks.UserPromptSubmit=[{hooks=[{type='command',command='<H> UserPromptSubmit'}]}]" \
  -c "hooks.PermissionRequest=[{hooks=[{type='command',command='<H> PermissionRequest'}]}]" \
  -c "hooks.PostToolUse=[{hooks=[{type='command',command='<H> PostToolUse'}]}]" \
  -c "hooks.Stop=[{hooks=[{type='command',command='<H> Stop'}]}]"
```

where `<H>` is a shipped one-line poster (codex's `command` is a **shell
string**, not argv — an array errors with *"invalid type: sequence, expected a
string"*):

```sh
#!/bin/sh
# gmux-hook — resources/gmux-hook. $1 = event name.
exec /usr/bin/curl -sS -m 2 -o /dev/null -X POST \
  --data-binary @- "http://127.0.0.1:${GMUX_HOOK_PORT}/h/${GMUX_HOOK_TOKEN}?e=$1"
```

with `GMUX_HOOK_PORT` / `GMUX_HOOK_TOKEN` passed as tmux session env
(`createSession` already supports `-e KEY=VALUE`,
`src/main/tmux/sessions.ts:137`) — so the token never appears in `ps` output or
in the recorded argv.

Verified (PROBE A): `-c` hooks **merge** with `config.toml` hooks (both a
`[[hooks.UserPromptSubmit]]` file entry and a `-c` override fired).
Latencies: `Enter → UserPromptSubmit` +0.30 s; `PreToolUse → PermissionRequest`
+28 ms; `Stop → notify` +23 ms.

**Two real costs, which is why this defaults OFF:**

1. Without `--dangerously-bypass-hook-trust` the hooks are **silently skipped**
   — no error, no log. The only alternative is persisting
   `hooks.state."<id>".trusted_hash` into `~/.codex/config.toml`, which is a
   global write and therefore out of scope. `-c bypass_hook_trust=true` is
   rejected ("unknown configuration field").
2. The flag prints a persistent yellow banner in the TUI, and each hook run
   prints `hook: Stop` / `hook: Stop Completed`. Set `statusMessage` to
   suppress the noise where possible.

Given §2.2 gives codex a perfect 3-state oracle for free, **codex hooks are a
Settings opt-in** ("Codex: deterministic hooks (adds a warning banner)").

**Do not touch codex `notify`.** It is turn-end only (`agent-turn-complete` is
the sole type in 0.147), it is a scalar array so a `-c notify=[…]` **replaces**
it, and this user already has a global `notify` at `~/.codex/config.toml:5`
pointing at `SkyComputerUseClient`. Overriding it would silently break their
Computer Use integration.

### 3.3 qwen / gemini / pi — env- and flag-scoped, no global write

| Agent | Mechanism | Evidence |
| --- | --- | --- |
| qwen | `QWEN_CODE_SYSTEM_SETTINGS_PATH=<gmux userData settings.json>` in the tmux session env; Claude-shaped event names (`UserPromptSubmit`, `Notification`, `Stop`) | **VERIFIED end-to-end** — SessionStart, Notification, UserPromptSubmit, Stop all fired on a real turn |
| gemini | `GEMINI_CLI_SYSTEM_SETTINGS_PATH=<…>`; events `BeforeAgent`/`AfterAgent`/`Notification` | plumbing VERIFIED; **turn events UNVERIFIED** (auth-blocked). Note: system-tier hooks are hidden from the user's `/hooks` UI — disclose this in Settings |
| pi | `pi -e <extension.js>` (repeatable, per-invocation); `ctx.on('turn_start'|'turn_end'|'agent_settled')` | API VERIFIED from shipped `.d.ts`; **not executed** |
| muse | requires a workspace `.muse-plugin/` directory; **no per-run flag exists** | injection **ABSENT** — muse stays on T2/T3 |
| droid | `~/.factory/hooks.json` / `.factory/hooks.json` only — both global or repo-global | **not installed**; do not implement blind |

Because these are env vars on the tmux session, they cost nothing on the resume
argv — tmux session env persists.

---

## 4. T1 + T2: the universal floor

### 4.1 The one tmux exec

Extend the format string already in `pollSessionStatus()` (`src/main/ipc.ts:445`):

```
#{session_id}\t#{pane_id}\t#{pane_pid}\t#{pane_dead}\t#{pane_dead_status}
\t#{window_bell_flag}\t#{window_activity}\t#{pane_title}
\t#{pane_current_command}\t#{keypad_flag}\t#{alternate_on}
```

Field notes, all measured:

- `#{window_activity}` — per-pane epoch-second clock of last output, maintained
  by the server **whether or not a client is attached**; identical attached and
  detached. This is the workhorse.
- `#{session_activity}` — tracks **clients**, not pane output. It froze at
  attach time while output flowed. **Never use it.**
- `#{pane_current_command}` — never changes for an agent (claude reports
  `2.1.226`, qwen/gemini/pi report `node`, codex reports `codex`) so it is
  useless as an agent state signal, but it is exact for plain shells and
  correctly resolves the agent even in gmux's restore shape.
- `#{pane_in_mode}` — stayed 0 throughout (copy-mode only). Include it anyway:
  a pane in copy-mode is frozen and must never read as working.
- `#{pane_dead}` — works, but gmux sets `remain-on-exit failed`, so clean exits
  vanish rather than being observed. Unchanged from today.

### 4.2 Subtree CPU and the tool-child rule

One `ps -axo pid=,ppid=,time=,stat=` snapshot covers every session.

```
cpu%      = 100 × Δ(Σ subtree TIME) / Δt        # clamp negatives to 0
cpuBusy   = cpu% ≥ 5.0 for 2 consecutive ticks
toolChild = ∃ descendant with 's' ∈ STAT and '+' ∉ STAT
```

**Threshold sweep** over 755 idle samples plus every streaming window (PROBE B):

| threshold | consecutive k | false WORKING on idle | streaming coverage |
| --- | --- | --- | --- |
| 4 % | 1 | 8 | 100 % |
| **5 %** | **2** | **0** | 10/11, 4/5, 9/11 |
| 10 % | 2 | 0 | 6/11, 1/5, 0/11 |

**Sample at 1 Hz, never faster.** macOS `ps` TIME has 10 ms resolution; at 0.5 s
sampling one idle timer tick reads as 4–10 % (claude idle hit 9.9 % on a single
sample). A single sample must never trigger.

**Implementation trap: do not use `ps -o %cpu`.** In the synthesis run it
decayed 31.9 → 0.0 across a turn because macOS `%cpu` is a lifetime/decayed
average, not an instantaneous rate. Only Δ TIME / Δt is correct.
**Second trap: clamp the delta at zero** — a reaped child makes the subtree sum
go backwards (PROBE B recorded **−14.9 %** on the codex trace), which would
suppress the next tick's detection.

**The tool-child rule is the only signal that survives a blocked tool call.**
Across all traces, agents `setsid` their tool commands but not their helpers:

| Child class | STAT | Example |
| --- | --- | --- |
| agent-internal helper | has `+` | `mcp`, `node`, `caffeinate`, `specstory` |
| long-lived helper | neither `s` nor `+` | `codex-code-mode-host`, `node_repl` |
| **real tool run** | **`s` without `+`** | claude `zsh:Ss` + `sleep:S`; codex `zsh:Ss` + `sleep:S`; muse `sh:SNs` + `sleep:SN` |

**Zero transient children in 657 idle child-set observations** across
claude/codex/muse — so the rule needs no per-agent ignore list and no learned
baseline. It also disposes of a trap that would otherwise re-create the reported
bug: **claude spawns `caffeinate` at turn start and reaps it ~30 s AFTER the
turn ends** (measured twice). Any naive child-count rule sticks on "working" for
30 s after every claude turn; `caffeinate` is `S+`, so this rule excludes it.

`STAT` alone is useless as a *state* signal: 469/474 samples were `Ss+`, 5 were
`Rs+`. macOS never reported a distinguishable wait state for a multithreaded
agent. Do not build on it beyond the `s`/`+` flags above.

**CPU is a corroborator, never a primary.** PROBE B and PROBE C agree on why:
codex working burns **0–5 %** while claude idle burns **0–3 %** — the
distributions overlap, so no universal threshold separates them. The 5 %/2-tick
rule is safe for *promoting* to working; it must never be used to *demote* to
idle, and it must never be the sole basis for codex's verdict.

### 4.3 Measured cost

Benchmarked in the synthesis pass against the **user's live 16-pane server**,
40 reps each:

| Call | Wall | **CPU** |
| --- | --- | --- |
| `tmux -L gmux list-panes -a -F <extended>` | **4.54 ms** | **2.75 ms** |
| `ps -axo pid=,ppid=,time=,stat=` (1,050 procs) | 21.46 ms | 20.25 ms |

Matching PROBE B (5.7/3.7 and 21.8/20.8) and PROBE C (4.7 ms) within noise.
Both are **one exec regardless of session count**. Narrowing `ps` to specific
pids is counterproductive on macOS — `ps -p <6 pids>` measured **34.5 ms**,
*slower* than the full scan, because BSD `ps` walks the whole proc table anyway.

Budget:

| Cadence | Work | Cost |
| --- | --- | --- |
| 1 Hz | T1 only | **0.28 % of one core** ≈ 0.011 W ≈ 0.12 %/day of a 70 Wh battery |
| 1 Hz | T1 + T2 | 2.3 % of one core ≈ 1 %/day |
| 2 s | T1 + T2 | 1.2 % |

**Policy: T1 at 1 Hz always; T2/T3 only for ambiguous sessions** (§6.5). With
every session settled the cost floors at 0.28 %.

---

## 5. T3: normalized screen hashing, and the shell path

### 5.1 Masking makes it worse — do not mask

The BACKLOG's direction 3 says "mask the spinner glyph, elapsed timer, token
counter". Measured over 337 scored transitions (working n=154, idle+needs-input
n=183, claude+codex, 1 s ticks), PROBE C:

| # | Predicate | FN (working missed) | FP (idle called working) |
| --- | --- | --- | --- |
| A | raw `capture-pane -p` hash changed vs previous tick | 25.3 % | 0 % |
| B | + trailing-whitespace / blank-line trim | 25.3 % | 0 % |
| **C** | **normalized: spinner, `(Ns`, token counts, `%`, clocks masked** | **69.5 %** | 0 % |
| D | C + every digit masked | 69.5 % | 0 % |
| E | structured: on-screen `(Ns` elapsed token increased | 50.0 % | 0 % |
| F | C ∨ E | 26.0 % | 0 % |
| **M** | **B, changed within last 3 ticks** | **4.5 %** | **0 %** |
| **N** | **B, changed within last 5 ticks** | **0 %** | **0 %** |

Masking **triples the miss rate**. The reason is visible in the diffs: during
claude's 14-second thinking phase the *only* changing line on the entire screen
is the spinner line —

```
✻ Actioning… (3s · thinking with high effort)
✢ Actioning… (13s · still thinking with high effort)
```

— so masking the glyph and the timer erases the single piece of evidence that
the agent is alive.

Per-agent breakdown of A: claude 1/77 FN (1.3 %); **codex 38/77 FN (49 %)**.
Codex is the entire problem — mid-stream it repaints only when a paragraph
completes, producing runs of 5 identical captures, and it shows **no spinner and
no "esc to interrupt" on screen while streaming**, so its working screen is
structurally identical to its idle screen. That is what the K-tick memory buys.

### 5.2 The recipe

```
NORMALIZE(pane):
  text  = tmux capture-pane -p -t <pane>        # visible screen only; no -e, no -J, no -S
  lines = text.split('\n').map(rstrip)
  drop trailing empty lines
  return lines.join('\n')                       # THAT IS ALL — do not mask
HASH  = FNV-1a over that string, 12 hex chars
WORKING_BY_SCREEN(pane) = HASH ∉ { last K hashes }
```

**K = 5 at a 1 s tick** (equivalently K = 3 at 2 s — a ~6 s memory) →
**0 % FN / 0 % FP over 337 scored transitions**. K = 3 at 1 s gives 4.5 % FN.

The rstrip earns its place cheaply: gemini pads its pane title and some TUIs pad
rows (`'◇  Ready (work)                    '`).

If a future agent animates at idle, the fix is **not** to start masking — it is
to record a per-agent `idleScreenSignature` and let the marker win over the
hash, plus `animatesWhenIdle: true` so the activity clock is ignored for it.

Batch the captures into the **same exec** as the poll:
`list-panes … \; capture-pane -p -t A \; capture-pane -p -t B …` measured
**5.0 ms total for 5 panes** versus 23.8 ms as separate execs. Better still,
route it through the existing long-lived `tmux -C` control client
(`src/main/tmux/control-client.ts`) and spawn nothing at all.

### 5.3 Shells: `keypad_flag`, not OSC 133

zsh's ZLE sends `smkx` (DECKPAM + DECCKM) on every line-init and `rmkx` on
submit. tmux tracks it and exposes it as a format, so gmux reads prompt state
for a **detached** pane with one extra field:

| Pane state | `pane_current_command` | `keypad_flag` | `alternate_on` |
| --- | --- | --- | --- |
| at the zsh prompt | `zsh` | **1** | 0 |
| running `sleep 6` | `sleep` | 0 | 0 |
| inside `seq \| less` | `zsh` | 1 | **1** |

Rule (verified; and confirmed live on all five of the user's shell sessions,
every one reporting `keypad=1` at an idle prompt):

```
alternate_on == 1   → interactive full-screen TUI has the terminal → idle (never working)
keypad_flag  == 1   → at the prompt                                → idle
otherwise                                                           → working
```

`#{pane_current_command}` must not be the primary — `seq | less` reports `zsh`.

**OSC 133 injection is designed and verified but should NOT ship in v1.** The
user's zsh emits **0** OSC 133 marks today (oh-my-zsh robbyrussell; their
`.zshrc` adds none). VS Code's `ZDOTDIR` chaining works — PROBE C ran it end to
end:

```
tmux new-session -e ZDOTDIR=<gmux-dir> -e USER_ZDOTDIR=$HOME … "$SHELL -l"
```

with `<gmux-dir>/.zshenv|.zprofile|.zlogin` sourcing the user's equivalents and
`<gmux-dir>/.zshrc` restoring `ZDOTDIR`, sourcing the real `.zshrc`, then adding
`precmd`/`preexec` hooks emitting `133;D;$?` / `133;A` / `133;C`. Marks appeared
on the wire (`D;0 A B B C D;0 A B`) and the robbyrussell prompt rendered intact.
Nothing in `$HOME` is written.

It still should not be the default, because: `keypad_flag` answers the same
question with **zero injection and zero risk to the user's shell**, and OSC 133
marks only reach gmux when it is **attached and reading the byte stream** —
i.e. it fails the "hidden session" requirement that Phase 13 exists to fix.
Keep the ZDOTDIR wrapper as an opt-in Settings toggle for **bash** users
(readline's `enable-keypad` is off by default, so bash falls through to T2/T3)
and for exit-code reporting (`133;D;<code>`), which `keypad_flag` cannot give.

### 5.4 The only screen-derived path to `needs_input`

One generic detector, not a regex per agent. The shape is universal — numbered
options plus a confirm hint in the bottom rows:

```js
const BORDER = /^[\s│┃║▌▏|]+|[\s│┃║▕|]+$/g;              // strip box art per line
const OPT1   = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}1[.)]\s+\S/;
const OPT2   = /^[❯›●▶◆*>▸○◇⏵\s]{0,4}2[.)]\s+\S/;
const HINT   = /(enter to (confirm|select|continue)|press enter|esc to cancel|esc to quit|use enter to select|to cancel)/i;
const QUEST  = /(do you (want|trust)|would you like|how would you like)/i;
// needsInput = last 24 rows (borders stripped) contain OPT1 AND OPT2 AND (HINT OR QUEST)
```

**Measured: needs-input recall 57/57 = 100 %; false positives 0/386 = 0 %**
across claude/codex/qwen/gemini idle and working screens. It also catches both
workspace-trust gates (`❯ 1. Yes, I trust this folder`, `› 1. Yes, continue`),
which is exactly the ~35 s startup window where claude has no pid file yet.

Per-agent markers worth recording as corroborators (not primaries):

- **claude working**: footer contains the literal `esc to interrupt` — 0 % FN /
  0 % FP over claude's 154 samples.
- **codex working**: `• Working (Ns • esc to interrupt)` — present in the
  pre-stream phase only; **67–70 % FN across a full turn**. Do not rely on it.

Requirement satisfied: this is the **only** screen path to `needs_input`, and it
requires a rendered dialog — so the Phase 9.2 self-inflicted-input rule is
preserved by construction (an answered dialog disappears from the screen).

---

## 6. The combined state machine

### 6.1 States

Internal states, and how they project onto the frozen `SessionStatus` contract
(`src/shared/types.ts:22`) — **no contract change is required**:

| Internal | Reported | Meaning |
| --- | --- | --- |
| `starting` | `running` | pane created, no signal source yet (claude's ≤35 s trust gate, agent boot) |
| `working` | `running` | turn in flight, tool running, or streaming |
| `needs_input` | `needs_input` | agent is blocked on the user |
| `idle` | `idle` | alive and quiet |
| `dead` | `exited` / `restorable` | unchanged; owned by the existing reaper |

### 6.2 Per-tick evaluation

```
evaluate(session, tick):
  # ---- Tier 0: authoritative, no hysteresis, no debounce -------------------
  if t0 = nativeVerdict(session):            # pid-file | title oracle | hook event
      return commit(t0)                      # instant in both directions

  # ---- hard overrides ------------------------------------------------------
  if pane_in_mode == 1:      return hold()   # copy-mode: frozen, keep last state
  if agent == 'shell':       return commit(shellVerdict(keypad_flag, alternate_on))

  # ---- Tier 1/2/3 evidence for WORKING ------------------------------------
  quiet     = now - window_activity > 2.0s              # skipped if animatesWhenIdle
  evidence  = (!animatesWhenIdle && !quiet)
           || cpuBusy                                    # ≥5 % over 2 ticks
           || toolChild                                  # 's' without '+'
           || screenChangedWithinLastK(K = 5 @ 1 Hz)     # only if T3 armed

  if evidence:               return commit('working')

  # ---- needs_input is the ONLY screen-derived attention state -------------
  if dialogDetector(capture): return commit('needs_input')

  return commitAfter(IDLE_CONFIRM_TICKS, 'idle')
```

### 6.3 Transitions and hysteresis

| Transition | Rule | Rationale |
| --- | --- | --- |
| any → `working` | **1 tick** of evidence (T0 instant) | Promotion must be fast; measured 0 % FP for every promotion predicate above |
| `working` → `idle` | **3 consecutive** quiet ticks (T1–T3) / **instant** on T0 | Covers codex's 5 s mid-stream silences; 0 % FN at K=5 |
| any → `needs_input` | T0 event, **or** dialog detector on **2 consecutive** captures | Two captures kills any half-rendered frame; 0/386 FP already, this is belt-and-braces |
| `needs_input` → `working` | user keystroke to that session (Phase 9.2 rule), or any T0 working event, or the dialog leaves the screen for 2 captures | Never wait for echo |
| `needs_input` → `idle` | **never directly** — must pass through `working` | Prevents a silent drop of an unanswered prompt |
| `starting` → * | first T0 verdict, or first tick where any tier resolves, or 45 s timeout → `idle` | 45 s > the measured 35 s trust-gate gap |
| CPU may **promote** to working | yes | 0 false positives at 5 %/2 ticks |
| CPU may **demote** to idle | **no** | codex works at 0–5 %; demotion on CPU would be wrong for it |

Every state carries `since` (epoch ms) so the UI can show age and so
`attentionSince` keeps working unchanged.

### 6.4 Where it runs

**Main process only.** Concretely:

1. **Upgrade** `pollSessionStatus()` (`src/main/ipc.ts:445`) into a
   `SessionActivityMonitor` module (new file, e.g.
   `src/main/activity/monitor.ts` + `signals/{tmux,process,screen,native}.ts`)
   — the guardrail about `main/ipc.ts` growth says the new logic must **not**
   land inside ipc.ts. ipc.ts keeps the timer and the broadcast; the monitor
   owns the tiers.
2. **Add a native-signal watcher**: `fs.watch` on `~/.claude/sessions/`
   (event-driven, ~0 cost), plus `GmuxHookServer` (§3.0).
3. **Delete** `src/renderer/state/status-detector.ts` and its wiring in
   `store.ts` (the `statusOverrides` map, the `detector` construction at
   store.ts:296, `syncDetector`, and the override branch of `effectiveStatus`).
   `effectiveStatus` collapses to `session.status`.
   - Keep `stripAnsi()` if any other module imports it; otherwise delete.
   - The ⌘J **excerpt** moves to main and gets *better*: `#{pane_title}` is a
     first-class excerpt for claude (`✳ Send PONG response`) and codex, and the
     `capture-pane` last-non-empty-line covers the rest — both work for hidden
     sessions, which the byte stream never could.
   - `noteUserInput()` does not disappear — it becomes an IPC call
     (`activity:noteInput`) so the Phase 9.2 self-inflicted-input rule still
     clears `needs_input` without waiting for echo.
4. **Raise the cadence** from `STATUS_POLL_MS = 2_000` to **1,000 ms** while any
   window is focused; keep 2,000 ms otherwise. `MAIN_IDLE_AFTER_MS = 15_000`
   is replaced by the 3-tick rule.

### 6.5 Throttling and the ambiguity gate

```
tier1  every tick, always                                   (2.75 ms CPU)
tier2  only if ∃ session that is AMBIGUOUS                  (20.3 ms CPU, one exec for all)
tier3  only for the AMBIGUOUS sessions, ≤6 panes/tick,
       batched into the tier-1 exec                         (~0.3 ms/pane)

AMBIGUOUS(session) ≡
     activity.tier is 'process' or 'screen'                 (no T0 channel)
  && (session was working within the last 60 s || animatesWhenIdle)
  && state != 'needs_input'                                 (already resolved)
```

Additional guards:

- Skip everything for `exited` / `restorable` sessions (as today).
- Never run T3 on a pane in copy-mode.
- Coalesce: if a tick is still in flight, skip the next (the existing
  `statusPollBusy` guard already does this).
- Broadcast only on **change** (the existing `changed` flag).
- On AC power vs battery: no difference needed — the floor is 0.28 %.

---

## 7. Acceptance tests

Mapped one-to-one onto the BACKLOG's acceptance line. Each is runnable by hand
from the operator's seat and each has an automatable twin.

| # | BACKLOG criterion | Manual test | Expected | Automated twin |
| --- | --- | --- | --- | --- |
| A1 | claude idle at prompt reads idle within ~2 s | Launch a claude session, let it settle, do nothing | Tab reads **idle** ≤1 s after the pid file says `idle` (T0, measured same-second) | Monitor unit test: feed a pid-file `idle` event → status `idle` in ≤1 tick |
| A2 | submit a prompt → working within ~1 s | Type a prompt, press Enter | Tab reads **working** within the same second (measured +0 s via pid file, +14 ms via hook) | Unit: `UserPromptSubmit` / pid-file `busy` → `running` immediately |
| A3 | agent asks a question → needs input promptly | Ask claude to edit a file with permissions on | **needs_input** within ~50 ms (pid-file `waiting` +26–39 ms; `PermissionRequest` +43–58 ms) | Unit: pid-file `{status:waiting,waitingFor:"permission prompt"}` → `needs_input` |
| A4 | a long tool run stays working | `claude: run "sleep 25 && echo finished"` | **working** for the whole 25 s with **no flicker** — this is the case where output *and* CPU both say idle and only `toolChild` is true | Replay test over PROBE B's captured trace: no `idle` tick in the 25 s window |
| A5 | a hidden session's status is correct when revealed | Start a turn in session A, switch to session B, wait for A to finish, switch back | A reads **idle** immediately on reveal — no "working" flash, no recomputation delay | Integration: monitor state for a never-attached session matches an attached one |
| A6 | verified on claude + codex + a plain shell | Run A1–A5 on each | codex: `⠙ work` → working, `[ ! ] Action Required` → needs_input, bare basename → idle. shell: `sleep 6` → working, back at prompt → idle within 1 s | Table test over recorded `list-panes` fixtures |
| A7 | fallback exercised on a hook-less agent | Run A1–A4 against **muse** (no injection possible) and **agy** | muse: idle stable despite its 1 Hz animation (`animatesWhenIdle`), streaming caught by CPU, tool runs caught by `toolChild`; **known gap**: muse's ~12 s pre-first-token thinking window needs T3 | Replay over PROBE B's muse trace |
| A8 | no false "needs input" (Phase 9.2) | Click around a pane with mouse reporting on; tab-complete in a shell; let claude finish a turn and sit for 2 minutes | **Never** `needs_input`. Specifically: no BEL-triggered attention (rule deleted), and no 30 s-silence attention (rule deleted) | Unit: 133 recorded OSC-terminator BELs produce zero `needs_input` |
| A9 | cheap | Run the monitor for 10 minutes with 16 panes, sample gmux's CPU | ≤1 % of one core with sessions settled (measured floor 0.28 %) | Bench in CI: assert the tier-1 exec stays one process and <10 ms |
| A10 | no global config mutation | `shasum` `~/.claude/settings.json`, `~/.codex/config.toml`, `~/.zshrc`, `~/.gemini/settings.json` before and after a full session lifecycle | **Identical hashes.** Everything gmux writes lives under its own userData or the tmux session env | CI guard: a test that fails if any write path resolves outside userData |
| A11 | regression: the reported bug | Reproduce the screenshot — a claude session left idle for hours, hidden and revealed several times | Reads **idle** | Unit on `effectiveStatus`: with the override map deleted there is no path from a stale renderer value to the UI |

Fixtures to keep: PROBE B's traces and PROBE C's 443 labelled captures in the
session scratchpad (`.../scratchpad/probeC/caps*`, `.../scratchpad/*.py`) are
the replay corpus for A4/A7/A8 — copy them into `src/main/activity/__tests__/fixtures/`
before the scratchpad is reaped.

---

## 8. Risks, and what stays unverified

### 8.1 Risks with mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **claude changes its pid-file schema or drops it** — it is an internal file, not a documented API | High (it is the primary claude signal) | Version-gate on `version` + presence of `status`; on any parse failure fall through to T1–T3, which already resolve claude at 1.3 % FN. Log once. `claude agents --json` is the supported fallback read path (0.22 s, no `tmux`/`waitingFor`) |
| **codex changes its OSC title format** | Medium | The braille-prefix test is structural (U+2800–U+28FF), not a string match; `[ ! ]` is a literal, so guard it with a fallback to the dialog detector, which caught codex's approval prompt 12/12 |
| **Stale pane mapping from renamed sessions** | Was a real bug in every naive implementation | Map by `%N` pane id or by pid/subtree, never by session name (§2.1, proven live) |
| **Hook port moves across a gmux restart** | Medium | Persist `hookPort`; rewrite live sessions' settings files at boot; degrade silently to T0-native/T1–T3 |
| **Loopback hook server is a local attack surface** | Medium | 127.0.0.1 only, 128-bit per-session token in the path, `Host` check, 64 KB body cap, never log payloads (they contain prompt text) |
| **codex's `--dangerously-bypass-hook-trust` banner alarms the user** | Medium (UX) | Default OFF; codex needs no hooks (§2.2). Surface the exact banner text in the Settings toggle description |
| **Overwriting the user's codex `notify`** | High if done | Do not touch `notify` at all (§3.2). This user has a live `SkyComputerUseClient` integration on it |
| **`ps` cost on a machine with far more processes** | Low | 1,050 procs → 20.3 ms today; gate T2 behind the ambiguity check so it usually does not run. If a user reports cost, drop T2 to every 2nd tick — the 2-consecutive-tick rule still holds at 2 s |
| **Deleting the renderer detector regresses the ⌘J excerpt** | Medium | Move the excerpt to main *in the same change*, sourced from `pane_title` + last non-empty `capture-pane` line; verify a hidden session shows a correct excerpt (a capability today's code does not have) |
| **muse's pre-first-token thinking window (~12 s) reads as idle** | Known gap | T3 hash with K=5 closes it; if it does not, accept a ≤12 s "idle" flash for muse and record it in the registry as `verified: 'partial'` |
| **1 Hz polling on battery** | Low | Measured 0.12 %/day for the always-on tier. Drop to 2 s when no window is focused |

### 8.2 Explicitly unverified — do not let these load-bear

1. **gemini turn events** (`BeforeAgent`/`AfterAgent`). Only `SessionStart` /
   `SessionEnd` were observed; the account hits `IneligibleTierError`. The
   injection plumbing (`GEMINI_CLI_SYSTEM_SETTINGS_PATH`) *is* verified.
2. **droid** — not installed on this machine. The hook shape is docs-only and
   no per-session injection path is documented. Ship droid on T1–T3.
3. **pi extensions** — the `ctx.on(...)` API was read from the shipped `.d.ts`,
   never executed. `pi -e <ext.js>` is documented as repeatable and
   per-invocation but was not run.
4. **cursor-agent, deepseek, antigravity** — no state channel was probed beyond
   idle byte-silence (agy, pi, qwen: 0 events over 15 s) and deepseek's idle
   animation (6 events/15 s). Their needs-input dialogs were **not** in the
   443-capture corpus, so the 100 %-recall figure for the generic detector does
   **not** cover them.
5. **`permission.asked` on opencode** — string-verified in the binary only. (Not
   a registry agent today; recorded because opencode's HTTP/SSE event bus
   — `opencode --port N` then `GET /event` — is the cleanest injection-free
   channel of any agent surveyed, should it ever be added.)
6. **bash shells** — `keypad_flag` is a zsh/ZLE property. bash+readline does not
   set DECKPAM by default, so bash panes fall through to T2/T3. Not measured.
7. **Non-macOS** — every measurement is macOS. Linux `ps` TIME resolution,
   `STAT` letters (`Ss+` vs `Ssl+`), and the setsid'd-tool-child discriminator
   all need re-verification before any Linux build.
8. **Whether a running claude re-reads `--settings` on change** — a
   `ConfigChange` hook event exists, which hints at hot-reload, but this was not
   tested. The port-stability mitigation assumes it does **not**.

### 8.3 What this design deliberately does not do

- It does not mask volatile screen regions (measured: triples the miss rate).
- It does not use BEL, `#{session_activity}`, `ps -o %cpu`, `STAT` letters as a
  state, child *counts*, or silence-after-burst.
- It does not write to `~/.claude/*`, `~/.codex/config.toml`, `~/.zshrc`,
  `~/.gemini/*`, or any other user config — everything is `--settings <path>`,
  `-c` overrides, or tmux session env.
- It does not ship OSC 133 shell injection by default (opt-in only; it cannot
  serve detached sessions, which is the whole point of Phase 13).

---

## 9. Implementation notes (Phase 13, shipped 2026-08-10)

Written by the implementing stream. The design above was followed as
specified; these are the three places where hands-on work sharpened it, plus
the live evidence for the acceptance table.

### 9.1 What the implementation changed about §5.4 and §6.2

1. **`shell` maps to IDLE, and here is what that means in practice.**
   §2.3 already tabulates claude idle as pid-file `idle`/`shell`, and a live
   run confirms why: asked to run `sleep 25`, claude BACKGROUNDED it, printed
   *"I'll report back when it finishes"*, returned to its prompt and published
   `status: "shell"` for the whole 25 s before flipping back to `busy` to
   report. The user can type; the turn has ended. A2's "long tool run stays
   working" is about a FOREGROUND tool call, where claude publishes `busy`
   throughout — verified separately over a 15 s turn with no flicker.

2. **The dialog detector is ranked ABOVE the screen-hash tier, below the
   strong ones.** §6.2 lists the screen hash inside `evidence` and the dialog
   check after it, but a dialog APPEARING is itself a screen change, so the
   K-tick memory masks it for its whole window: measured 6 s from prompt to
   `needs_input` instead of 4 s. Final order is: tier 0 → copy-mode hold →
   fresh output / CPU / tool child → dialog → screen hash → quiet. The
   detector is by far the stronger predicate (57/57 recall, 0/386 FP), and
   real output still outranks it, so an agent that is actually printing is
   never called blocked.

3. **"Ambiguous" means "tier 0 did not answer THIS TICK", not "this agent has
   no oracle."** §6.5 gates the expensive tiers on `activity.tier`, which
   would leave a claude session unexamined during the ~35 s workspace-trust
   window §2.1 flags — exactly the window the dialog detector exists to
   cover. Gating on whether a native verdict was actually produced arms T2/T3
   for that window and disarms them again the moment the pid file appears.

Two smaller ones: `#{window_bell_flag}` was dropped from the format entirely
rather than kept as a corroborator (it never true-fired, and leaving it in the
poll is what let the inverted BEL rule survive in main), and a shell's DECKPAM
oracle is only trusted once that pane has been seen setting the flag, so a
bash pane falls through to the floor instead of reading "working" forever
(§8.2 item 6).

### 9.2 Live acceptance evidence (private `-L gmux` server, 2026-08-10)

Every session below was **DETACHED** — no client ever attached to the scratch
sessions — so A5 is satisfied by construction rather than by a special case.

| # | Evidence |
| --- | --- |
| A1 | claude idle at its prompt: `idle` on the first tick, with `window_activity` frozen 4 h. The user's own renamed claude pane (`zen of tortie`, pid-file still saying `claude-1`) also read idle. |
| A2 | Enter at 18:08:59.3 → `running` at 18:09:00.0 (**+0.7 s**), via the pid file alone. |
| A3 | A real "Do you want to make this edit to note.txt?" prompt: pid file `waiting` + `waitingFor: "permission prompt"` → `needs_input`. The generic detector fires on that capture and on the workspace-trust gate, and is silent on the screen claude leaves right after the answer. |
| A4 | Floor tier, no oracle: a setsid'd `sleep 22` (zero CPU, zero output) held `running` for the full 22 s with no flicker — only the tool-child rule was true. |
| A6 | codex: `⠴ gmux` observed working, bare `gmux` (= cwd basename) idle for 120 consecutive samples. shell: `sleep 6` → `running` at +1 s, back to `idle` at +1 s. |
| A7 | A floor-tier stand-in ran the whole idle → working → needs-input → answered cycle. **Known limit:** a stand-in that leaves its answered prompt on screen (a shell script, not a TUI) re-raises `needs_input`, because a quiet screen still showing options is indistinguishable from an active one. Every real agent redraws — verified on claude's post-answer screen — and the researched detector is kept unchanged rather than tightened on unmeasured geometry. |
| A9 | With every session settled the tick is exactly one `list-panes` exec: no `ps`, no captures (unit-asserted over 16 panes). |
| A10 | Every write path in `src/main/activity` resolves under `app.getPath('userData')/gmux/hooks`. `~/.claude/settings.json`, `~/.codex/config.toml` and `~/.zshrc` were untouched. |
| A11 | The reported bug: a pane whose `window_activity` froze four hours ago reads `idle`. There is no override map left for a stale value to live in. |

### 9.3 The one durability hazard hooks introduce, and how it is contained

`claude --settings <path>` **refuses to start** when the file is missing:

```
$ claude --settings /tmp/gone.json -p hi
Error: Settings file not found: /tmp/gone.json
```

and gmux bakes that flag into both `argv` and the armed `resumeArgv`, which
outlive the app. So the file is rewritten before every launch, before every
restore, and for every live claude session at boot (recovering the existing
token out of the old file so a claude that outlived a gmux restart keeps
working); if it cannot be written, the flag is simply left off. The port is
persisted and only re-claimed when the bind actually gets it, so a second
gmux on an ephemeral port cannot repoint everyone else's baked-in URL.

Verified end to end: a claude launched with exactly this settings shape POSTed
`UserPromptSubmit` and then `Stop` to `127.0.0.1/h/<token>?e=<Event>`.

**codex hooks are not implemented.** They require
`--dangerously-bypass-hook-trust`, which paints a permanent banner in the TUI,
and §2.2 already gives codex a perfect three-state oracle for free — so the
opt-in would buy nothing and the code would be an unused liability.

