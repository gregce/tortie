# 22 — Resume audit: correcting the registry's resume data

**Status:** synthesis of three hands-on probe runs (PROBE A = pi, PROBE B = muse+qwen,
PROBE C = full re-audit) plus this synthesizer's own independent re-verification.
**Date:** 2026-08-10. **Machine:** darwin 24.6.0, tmux 3.6a on private socket `-L gmux`.
**Supersedes** every `resume` claim in `docs/research/11-agent-registry.md`.

---

## 0. Verdict

The user's report was right, and the problem is larger than pi.

> `src/main/agents/registry.ts:49` — `/** No resume mechanics exist (pi v1). */`

is false. pi ships `--session-id <id>` — *"Use exact project session ID, creating it if
missing"* — which is **idempotent**: the same argv both creates a conversation and
resumes it. That is a *stronger* primitive than claude's, because launch argv and resume
argv are literally the same string.

Re-auditing the other eight launchable CLIs on the mission's hypothesis found:

| | count | agents |
|---|---|---|
| Resume template **flatly wrong** (produces a dead pane) | 2 | `pi`, `deepseek` |
| Resume template **correct**, now verified hands-on | 7 | claude, codex, cursor, gemini, antigravity, muse, qwen |
| Capture strategy **understated** — a deterministic mechanism exists that the registry says does not | 3 | `pi`, `gemini`, `cursor` |
| `sessionStore` **stale or wrong in wording** | 2 | `gemini` (glob), `qwen` (two errors) |
| Not installed, docs-only | 1 | `droid` |

**Only claude's row survives fully intact.** Nine of the ten launchable rows need an edit.

The single most consequential number: `buildLaunchSpec()` in
`/Users/gdc/gmux/src/main/manifest/agents.ts` arms `resumeArgv` for exactly **one** agent
(claude). Every other agent falls into the `default:` branch, gets
`idCapture: 'store-watch'`, and leaves `resumeArgv` undefined forever, because **no
store-watcher was ever built**. After a reboot those panes come back as bare directories
with replayed scrollback and nothing armed — exactly the user's live-manifest evidence.
This audit shows **three of them can be armed at launch today with no watcher at all**
(pi, gemini, cursor), and the remaining four have exact, non-heuristic harvest keys.

---

## 1. The corrected per-agent resume table

Legend for **capture**:
- **pre-assign** — gmux generates (or is handed) the id *before* the process starts and
  passes it on the launch argv. `resumeArgv` is armed at spawn. No watcher, no race.
- **harvest** — the id only exists once the agent has written it; gmux must read it back
  out of the agent's store and *then* arm `resumeArgv`.
- **none** — no conversation id exists.

### 1.1 Master table

| agent | deterministic resume template | capture | harvest key (exact, not heuristic) | session store | status |
|---|---|---|---|---|---|
| **claude** 2.1.227 | `claude --resume <uuid>` | **pre-assign** `--session-id <uuid>` | n/a | `~/.claude/projects/<dashEncode(realpath(cwd))>/<id>.jsonl` | **VERIFIED** |
| **codex** 0.147.0 | `codex resume <uuid>` *(subcommand)* | **harvest** | `~/.codex/state_5.sqlite` → `threads(id, cwd, rollout_path, created_at_ms)`; or the shipped rollout-filename watch | `${CODEX_HOME:-~/.codex}/sessions/<Y>/<M>/<D>/rollout-<ts>-<uuid>.jsonl[.zst]` | **VERIFIED** |
| **cursor** 2026.08.04 | `cursor-agent --resume <id>` | **pre-assign** via `cursor-agent create-chat` → prints a fresh id on stdout | n/a | `~/.cursor/chats/<md5hex(verbatim cwd, no trailing slash)>/<id>/store.db` | **VERIFIED** |
| **gemini** 0.54.0 | `gemini --resume <full-uuid>` | **pre-assign** `--session-id <uuid>` | n/a | `~/.gemini/tmp/<projectDir>/chats/session-<ts>-<first8>.**jsonl**` | **VERIFIED (pre-assign + store); resume restore source-verified only** |
| **deepseek** 0.8.26 | `deepseek resume <id>` **— SUBCOMMAND, not a flag** | **harvest** | none exact; flat global store, cwd only from `metadata.workspace` inside the file | `~/.deepseek/sessions/<id>.json` | **VERIFIED broken + VERIFIED fix** |
| **antigravity** 1.1.11 | `agy --conversation <id>` | **harvest**, time-correlation only | **none** — nothing on disk links id → cwd | `~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl` | **VERIFIED (template); harvest is WEAK** |
| **muse** 0.1.0 | `muse resume <full-uuid>` *(subcommand)* | **harvest** | `runtime.session.route_facts` → `tmux_pane` + `tmux_socket_path` in line ~2 of `session.jsonl` — **exact pane correlation** | `${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<Y>/<M>/<D>/<id>/session.jsonl` | **VERIFIED** |
| **qwen** 0.21.7 | `qwen --resume <full-uuid>` | **harvest** | `<sessionId>.runtime.json` sidecar → `{pid, session_id, work_dir}` — **exact pid correlation**; or `qwen sessions list` | `~/.qwen/projects/<charSub(realpath(cwd))>/chats/<id>.jsonl` | **VERIFIED** |
| **pi** 0.84.1 | `pi --session-id <id>` — **identical to launch argv** | **pre-assign** `--session-id <id>` (idempotent) | harvest is **impossible**, see §1.3 | `~/.pi/agent/sessions/--<cwdEncoded>--/<ISO ts>_<id>.jsonl` | **VERIFIED** |
| **droid** | `droid --resume <id>` | docs suggest `-s/--session-id <id>` pre-assign | unknown | `~/.factory/sessions/…` | **UNVERIFIED — not installed** |
| cursoride / copilotide | n/a — IDE row-insert, capture-only | none | n/a | see registry | unchanged |

### 1.2 How each row was checked

Everything marked VERIFIED was exercised in tmux on socket `-L gmux` under `zz`-prefixed
scratch sessions (all killed) by PROBE A/B/C: launch → send a unique marker turn → quit →
relaunch with the resume argv → assert the marker is in the scrollback. This synthesizer
then independently re-derived the load-bearing facts from `--help` output and from the
user's real on-disk stores, without launching anything:

| claim | independent re-verification by this synthesis |
|---|---|
| pi has resume | `pi --help` → `--session-id <id>  Use exact project session ID, creating it if missing`, plus `--session`, `--fork`, `-c`, `-r`. **Registry's "none" is definitively false.** |
| pi has a version command | `pi -v` → `0.84.1`. Registry's `versionProbe: null` + "no version command is confirmed upstream" is **wrong**. |
| pi partial-id collisions are real | Scanned the user's whole `~/.pi/agent/sessions`: exactly one 8-char prefix collision exists today — `--Users-gdc-rookery--`, prefix `019ed309`, two distinct sessions 25 s apart. **Confirmed.** |
| deepseek `--resume` is not a flag | `deepseek --help` full option list contains **no** `--resume`; `resume` is listed under `Commands:` and `deepseek resume --help` → *"Resume a saved TUI session — Usage: deepseek resume [ARGS]…"*. **Confirmed dead-pane bug.** |
| gemini has `--session-id` | `gemini --help` → `--session-id  Start a new session with a manually provided UUID. [string]`. **Pre-assignment confirmed.** Also `--session-file <path>` (cwd-proof fallback) and `--list-sessions`. |
| gemini's `--resume` help lies | `gemini --help` → `-r, --resume  Resume a previous session. Use "latest" for most recent or index number (e.g. --resume 5)` — no mention of UUID, yet PROBE C's source read shows `findSession` matches full UUID *first*. **Confirmed the help text is incomplete.** |
| gemini store glob is stale | Extension census under `~/.gemini/tmp/*/chats/`: **11 `.json` (all ≤ 2026-05, in 64-hex sha256 dirs) and 10 `.jsonl` (2026-08, in basename dirs)**. A watcher on `session-*.json` sees zero current sessions. **Confirmed.** |
| gemini projectDir is now a basename | `~/.gemini/tmp/gm2/.project_root` contains the plain absolute cwd. Both encodings coexist on this machine. **Confirmed — and `.project_root` makes dir → cwd recoverable, unlike cursor's md5.** |
| cursor pre-assignment exists | `cursor-agent --help` → `create-chat  Create a new empty chat and return its ID`. **Confirmed.** |
| muse's tmux harvest key is real | Grepped a real muse session file: `"tmux_pane":"$357:@357.%358"`, `"tmux_socket_path":"/private/tmp/tmux-501/gmux"`, `"terminal_title_identity":"43e79899bdea"`. **Confirmed — and the socket path is gmux's own private socket.** |
| qwen's runtime.json harvest key is real | Read a live sidecar: `{"schema_version":1,"pid":40151,"session_id":"bc6bc9af-…","work_dir":"/private/tmp/…/probeC/qw"}`. **Confirmed.** |
| qwen dir names are not a hash | Real dir names are plainly readable: `-private-tmp-claude-501--Users-gdc-gmux-…-scratchpad-probeC-qw`. **Registry's word "hashes" is wrong.** |
| codex SQLite index exists | `sqlite3 ~/.codex/state_5.sqlite .schema threads` → `id TEXT PRIMARY KEY, rollout_path, cwd, created_at_ms, has_user_event, archived…`. **Confirmed — id and cwd in one row.** |
| codex resume is a subcommand | `codex resume --help` → `Usage: codex resume [OPTIONS] [SESSION_ID] [PROMPT]`, *"picker by default; use --last…"*. Accepts a UUID **or a session name**. **Confirmed.** |
| claude / agy / muse / qwen templates | `claude --help` → `--session-id <uuid>`, `-r, --resume [value]`. `agy --help` → `--conversation  Resume a previous conversation by ID`. `muse --help` → `resume  Resume a previous session (--last or <session-uuid>)`. `qwen --help` → `-r, --resume  Resume a specific session by its ID`. **All confirmed.** |
| droid | `command -v droid` → MISSING; `~/.factory` contains only `skills/`. **Cannot be verified on this machine.** |

### 1.3 Per-agent detail that must survive into the registry

**pi — the flagship correction.**
`--session-id` takes any `^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$` — *not* only a
UUID, so gmux can pass its own pane id verbatim. Precedence in `dist/main.js:283-348`:
`--no-session` > `--fork` > `--session` > `--resume` > `--continue` > `--session-id` >
create. Store dir derivation (`dist/core/session-manager.js:242`):

```js
const safePath = `--${resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
```

Harvest is **not viable** for pi and this is the decisive measurement: launching bare `pi`
creates the project directory immediately but writes **no file at all** until the first
turn. PROBE A polled at 50 ms for 30 s against a live idle prompt and saw nothing; the file
appeared **1931 ms after the first keystroke**. A codex-style "watch for the newest file"
would therefore return nothing for exactly the panes the user has not yet talked to — the
panes that come back empty. Pre-assignment is not merely preferable for pi, it is the only
strategy that can work. (Corollary trap for anyone who tries anyway: the filename timestamp
is the *process start* time while the file is flushed lazily, so filename order and mtime
order can disagree.)

**pi trap — never pass a partial id.** `resolveSessionPath` uses
`.find(s => s.id.startsWith(arg))` with no ambiguity check. pi ids are UUIDv7 whose first
8 hex chars are the top 32 bits of a 48-bit millisecond clock, so the prefix only changes
every 2^16 ms ≈ **65.5 s**; any two sessions started in the same ~65 s window in one project
collide, silently. Tie-break is the highest `modified` = last in-file message timestamp, so
the winner can *change over time*. A real collision already exists in the user's store.

**pi trap — cwd is load-bearing.** `findLocalSessionByExactId` searches only the current
project. From the wrong cwd, `--session-id <id>` yields a **new empty session under the
same id** plus a yellow stderr warning; the original file is untouched but the pane comes
back blank. `pi --session <absolute path>` bypasses lookup entirely and is cwd-proof —
store the absolute path as a repair fallback. Conversely `pi --session <id>` found in
*another* project **blocks on an interactive `Fork this session into current directory?
[y/N]` prompt** — never use that form in a restored pane.

**pi bonus.** pi records `model_change` / `thinking_level_change` entries and replays them,
so model and thinking level *are* restored from the session — unlike claude. Ctrl-D quits;
double Ctrl-C does not; `/exit` is not a command and is sent to the model as a prompt.

**deepseek — the second dead-pane bug.** `deepseek --resume <id>` exits RC=2 with
`error: unexpected argument '--resume <id>' found`. `deepseek --resume=<id>` fails
differently. Only `deepseek resume <id>` works. Note the CLI's own `deepseek sessions`
output prints the broken advice `Resume with: deepseek --resume <session-id>` — that is
very likely where the original research got it, and it is wrong at the source.

**gemini — the worst trap in the set.** Bare `--resume` with no value does **not** show a
picker; it silently attaches to the **most recent** session. Every other agent's bare
resume shows a picker (claude `-r [value]`, cursor `--resume [chatId]`, qwen `-r`, codex
`resume`, pi `-r`) or errors. So for gemini alone, a resume argv that loses its id argument
does not fail — it opens **the wrong conversation**, silently. `registryResumeArgv()`
substitutes `SESSION_ID_SLOT` unconditionally, so an empty-string id yields
`gemini --resume ''`; guard against that (§3.4).

**qwen — two registry errors and one hard constraint.**
1. `SanitizeQwenCwd` (`path_utils.go:59`) replaces every char outside `[a-zA-Z0-9]` with
   `-`. It is **character substitution, not a hash** — confirmed by reading real dir names.
2. "no realpath" is wrong **in effect**. PROBE B launched qwen from a symlink `pb-link →
   pb-real`; the store dir created was `…-pb-real`. `process.cwd()` returns the resolved
   path, so gmux must key on the **realpath**. specstory's own `candidateProjectDirNames`
   (`path_utils.go:86`) already tries canonical first — only its *code comment* says
   "verbatim", and the registry inherited that loose wording and hardened it into a claim.
   (PROBE C reported "verbatim confirmed"; that probe simply had no symlink in its cwd, so
   the two paths were identical. **PROBE B's symlink test is the discriminating experiment
   and wins.**)
3. `--resume` is **cwd-scoped**: from the wrong directory it fails outright with
   `No saved session found with ID …`. Unlike muse, the id alone is not sufficient.
4. A non-UUID argument is matched **by title**, so a truncated id can silently resume a
   different conversation if it happens to match a title. Full UUID only.
5. `--chat-recording false` disables recording, and per its own help "`--continue`/
   `--resume` will not work".

**muse — the template was right, the capture story was missing.**
`muse exec --session-id <uuid>` exists but is the **headless** subcommand; the interactive
TUI rejects it (`invalid TUI options: error: unexpected argument '--session-id' found`).
An implementer reading only `muse exec --help` would wire up a pre-assignment that cannot
work in a tmux pane. Harvest instead — and muse's harvest is the *best* of any agent,
because it stamps `tmux_pane` and `tmux_socket_path` into its own transcript at session
**open**, before any prompt. gmux already knows the pane it spawned into, so the
correlation is exact even when several muse sessions share one cwd — something cwd-matching
can never resolve. specstory only ever matches on `workspace_root`, so this channel is
gmux-specific upside. Resume works from any cwd, **but muse adopts the launch cwd as the
new workspace**, so relaunch in the original directory anyway.

**codex — correct, with an easier channel now available.** The shipped
`watchForRollout()` works and is well tested. `~/.codex/state_5.sqlite` `threads` now
carries `id`, `cwd`, and `rollout_path` in one row — no JSONL parse, no fd-heavy date-shard
watching, and it resolves the cwd-attribution ambiguity that `classifyCandidate()` handles
with a 3 s grace timer. Treat it as a **corroborator and fast path**, not a replacement:
it is an undocumented internal file whose name is version-stamped (`state_5`), so the
rollout watch must remain the fallback.

**antigravity — the weak one, and honestly so.** The template `--conversation <id>` is
correct. But **nothing on disk links a conversation id to a cwd**: `history.jsonl` has
`workspace` + timestamp but no id; `conversation_summaries.db` has `conversation_id` +
`workspace_uris` but is stale since May with `workspace_uris` empty. Harvest is
time-correlation only. The registry's existing "fragile" warning is justified and should be
strengthened, not softened.

---

## 2. Exact registry.ts edits, entry by entry

All line numbers are against `/Users/gdc/gmux/src/main/agents/registry.ts` as of this audit
(889 lines). **This synthesis wrote nothing under `src/**` — the tree is read-only for this
workflow.**

### 2.0 Type-level edits (do these first — the rest depends on them)

**(a) `registry.ts:45-52` — fix the `ResumeStrategy` doc comment and add a value.**

The comment `/** No resume mechanics exist (pi v1). */` on `'none'` is the root of the pi
bug. Replace, and add the strategy the type system is currently missing:

```ts
/** How a session id is fed back to the agent to resume a conversation. */
export type ResumeStrategy =
  /** `<bin> [--resume|resume|--conversation|--session-id] <sessionId>` per template. */
  | 'flag-uuid'
  /**
   * No conversation id exists for this agent at all. As of 2026-08-10 NO
   * launchable agent is in this state — every installed CLI has a working
   * deterministic resume (docs/research/22-resume-audit.md). Reserved for a
   * future agent that genuinely has none; do NOT use it to mean "gmux has not
   * implemented capture yet" — that is what idCapture records.
   */
  | 'none'
  /** IDE store row-insert; not driveable from a terminal (cursoride/copilotide). */
  | 'session-file-harvest';
```

**(b) `registry.ts:83-94` — `AgentResumeInfo` has nowhere to record how the id is obtained.**
This is the schema gap that *caused* the observed failure: muse and qwen are `'flag-uuid'`,
indistinguishable from claude's pre-assigned `--session-id`, so `buildLaunchSpec` could
only conclude "resume exists but I have no id" and drop them into `store-watch` forever.
Add:

```ts
export type AgentIdCapture =
  /** gmux fixes the id before spawn and passes it on the launch argv. */
  | { mode: 'pre-assign'; launchFlag: string[] }
  /** gmux fixes the id by running a side command whose stdout is the id. */
  | { mode: 'pre-assign-cmd'; argv: string[]; parse: 'stdout-trim' }
  /** The id only exists after the agent writes it; read it back out. */
  | {
      mode: 'harvest';
      /** How a store record is proven to be THIS pane's session. */
      key: 'tmux-pane' | 'pid' | 'cwd-newest' | 'sqlite-index' | 'time-only';
      /** Human-readable pointer to the field that carries the key. */
      source: string;
      /** When the record first becomes readable. */
      availableAt: 'session-open' | 'first-turn';
    }
  | { mode: 'none' };

export interface AgentResumeInfo {
  strategy: ResumeStrategy;
  template: string[];
  sessionStore: string;
  /** How the id in `template` is obtained. NEW — see research 22 §2.0(b). */
  idCapture: AgentIdCapture;
  /**
   * TRUE when resume only finds the conversation from the ORIGINAL cwd
   * (qwen: hard failure; pi: silent empty session). Restore must not
   * substitute a fallback directory for these agents. NEW — research 22 §3.5.
   */
  requiresOriginalCwd?: boolean;
  /**
   * TRUE when a resume argv that loses its id attaches to the WRONG
   * conversation instead of failing (gemini). NEW — research 22 §1.3.
   */
  bareResumeIsDangerous?: boolean;
  notes: string;
}
```

### 2.1 `pi` — `registry.ts:632-681` (the headline fix)

Six separate wrong fields. Replace the whole entry's `status`, `confidence`, `storeDirs`,
`versionProbe`, `launch.quirks`, `resume`, `unverified`, and `notes`:

```ts
  {
    id: 'pi',
    displayName: 'Pi',
    kind: 'cli',
    launchable: true,
    // was: 'remote-branch-unreleased (… SpecStory v1 is READ-ONLY)'
    status: 'upstream-verified-hands-on (pi 0.84.1). SpecStory v1 is READ-ONLY for pi — that is a fact about specstory-cli, NOT about pi.',
    confidence: 'high',                                    // was 'low'
    binaries: ['pi'],
    extraProbeDirs: ['~/.npm-global/bin', '~/.local/bin'], // was []
    storeDirs: [
      '$PI_CODING_AGENT_SESSION_DIR',
      '$PI_CODING_AGENT_DIR/sessions',   // was '$PI_CODING_AGENT_DIR' — that var is the
                                         // CONFIG dir (default ~/.pi/agent); sessions live
                                         // one level down. Verified in `pi --help`.
      '~/.pi/agent/sessions'
    ],
    // was: null, "no version command is confirmed upstream"
    // `pi -v` prints a BARE semver ("0.84.1") with no product token, so there is no
    // identitySubstring to gate on; identity comes from storeDirs (~/.pi/agent).
    versionProbe: { args: ['-v'] },
    launch: {
      // was: ['pi'] with quirk "binary name and launch argv are gmux's best guess"
      argv: ['pi', '--session-id', SESSION_ID_SLOT],
      quirks: [
        'PRE-ASSIGN: --session-id accepts ANY [A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9] id, not just a uuid — pass the gmux pane id directly.',
        'Post-spawn harvest is NOT viable: the project dir is created at launch but NO session file is written until the first turn (measured: nothing after 30 s idle; file appears 1931 ms after the first keystroke).',
        'First launch with a fresh id prints a yellow "No project session found with id …; creating a new session with that id." to stderr. Cosmetic — screen-scrapers must not treat it as an error.',
        'Ctrl-D quits; double Ctrl-C does NOT. "/exit" is not a command and is sent to the model.',
        '--session-id cannot be combined with --session/--continue/--resume (hard exit 1).'
      ]
    },
    resume: {
      strategy: 'flag-uuid',                          // was 'none'
      template: ['--session-id', SESSION_ID_SLOT],    // was []
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      requiresOriginalCwd: true,
      sessionStore:
        '~/.pi/agent/sessions/--<cwd sans leading /, [/\\:]→->--/<ISO ts, : . →->_<sessionId>.jsonl',
      notes:
        'VERIFIED HANDS-ON 2026-08-10 (pi 0.84.1, tmux). --session-id is BOTH pre-assignment and resume: launch argv === resume argv, idempotent. ' +
        'Model + thinking level are restored FROM the session (model_change / thinking_level_change entries) — unlike claude, they need no re-appending. ' +
        'CWD IS LOAD-BEARING: --session-id searches only the current project, so a drifted cwd silently starts an EMPTY session under the same id (original file untouched). Store the absolute session path too and fall back to `pi --session <abs path>`, which bypasses lookup and is cwd-proof. ' +
        'NEVER pass a partial id: ids are UUIDv7 whose first 8 hex chars are the top 32 bits of a 48-bit ms clock, so the prefix only changes every ~65.5 s and any two same-minute sessions in a project collide; pi resolves ties with .find(startsWith) → most-recent-last-message, SILENTLY, and the winner can change over time. A real collision already exists in the user store (--Users-gdc-rookery--, prefix 019ed309). ' +
        'Interactive fallbacks only: `pi -r` / `/resume` picker, `pi -c` (most recent by mtime). `pi --session <id>` resolved in ANOTHER project BLOCKS on "Fork this session into current directory? [y/N]" — never use it in a restored pane. ' +
        'Store root precedence: --session-dir > $PI_CODING_AGENT_SESSION_DIR > $PI_CODING_AGENT_DIR/sessions > ~/.pi/agent/sessions (the first two are FLAT — no per-cwd key).'
    },
    reconstructionTarget: true,   // was false — the JSONL format is documented in the
                                  // shipped docs/session-format.md and is writable
    // …iconKey / defaultHotkeyHint / multilineKey / imageDrop unchanged…
    defaultHotkeyHint: 'p',       // was null
    unverified: false,            // was true
    notes: undefined              // DELETE 'every mechanic is UNVERIFIED upstream'
  },
```

> `launch.argv` now contains `SESSION_ID_SLOT`. `registryLaunchArgv()` (`registry.ts:790`)
> does **not** substitute slots — it must, or `buildLaunchSpec` must special-case pi. See
> §2.10.

### 2.2 `deepseek` — `registry.ts:485-491`

```ts
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],   // was ['--resume', SESSION_ID_SLOT]
      idCapture: {
        mode: 'harvest',
        key: 'cwd-newest',
        source: 'metadata.workspace inside ~/.deepseek/sessions/<id>.json',
        availableAt: 'first-turn'
      },
      sessionStore: '~/.deepseek/sessions/<sessionId>.json',
      notes:
        'RESUME IS A SUBCOMMAND. `deepseek --resume <id>` exits RC=2 with ' +
        '"error: unexpected argument \'--resume <id>\' found" — a DEAD PANE. ' +
        'Verified 2026-08-10 against 0.8.26 both hands-on and from `deepseek --help` ' +
        '(no --resume appears in the top-level option list; `resume` is a Command). ' +
        "TRAP AT THE SOURCE: the CLI's own `deepseek sessions` output prints the broken " +
        'advice "Resume with: deepseek --resume <session-id>" — do not copy it. ' +
        'Flat GLOBAL store; project identity via metadata.workspace inside the file. ' +
        'New sibling checkpoints/ dir as of 0.8.26.'
    },
```

Also update the `resume`-is-a-subcommand rule in the **file header**, `registry.ts:19-21`:

```ts
 *  - Resume is a SUBCOMMAND for codex/muse/DEEPSEEK, a flag for the rest, the
 *    different `--conversation` flag for antigravity, and for pi the SAME
 *    `--session-id` flag it launches with — all encoded in `resume.template`.
```

### 2.3 `gemini` — `registry.ts:401-434`

Three edits: pre-assignment, the stale glob, and the bare-resume trap.

```ts
    launch: {
      argv: ['gemini', '--session-id', SESSION_ID_SLOT],   // was ['gemini'], quirks []
      quirks: [
        'PRE-ASSIGN: `--session-id <uuid>` — "Start a new session with a manually provided UUID." Verified in --help and hands-on (0.54.0).'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      bareResumeIsDangerous: true,
      sessionStore: '~/.gemini/tmp/<projectDir>/chats/session-<ts>-<first8>.jsonl',
      notes:
        'STORE GLOB CORRECTED: 0.54.0 writes .jsonl, not .json — a watcher on session-*.json sees NOTHING. ' +
        'Both extensions coexist on disk: on this machine 11 legacy .json files (all <= 2026-05, under 64-hex sha256 dirs) and 10 .jsonl (2026-08, under basename dirs). ' +
        'projectDir is now the cwd BASENAME with a `.project_root` marker file that contains the plain absolute cwd — so unlike cursor, dir -> cwd IS recoverable. Legacy sha256(canonicalCwd) dirs remain; keep the 3-tier resolution for reads. ' +
        'The FILENAME carries only the first 8 chars of the uuid; the full id is the `sessionId` field on line 1. ' +
        'TRAP: `--help` documents only "latest" or an index for --resume, but findSession() matches a FULL UUID first — the uuid template is correct despite the docs. ' +
        'WORST TRAP IN THE REGISTRY: bare `--resume` with NO value silently attaches to the MOST RECENT session instead of erroring or showing a picker. A resume argv that loses its id opens the WRONG conversation. Never emit `--resume` with an empty slot. ' +
        '`--session-file <path>` loads a session from an explicit file — a cwd-proof repair fallback.'
    },
```

### 2.4 `cursor` — `registry.ts:326-337`

```ts
    launch: {
      argv: ['cursor-agent'],
      env: { FORCE_COLOR: '1' },
      quirks: [
        'FORCE_COLOR=1 is the sole env injection SpecStory makes for any agent',
        'PRE-ASSIGN via a SIDE COMMAND: `cursor-agent create-chat` prints a fresh chat id on stdout ("Create a new empty chat and return its ID"); launching `cursor-agent --resume <that id>` starts INTO it. So the first launch and every later restore use the SAME argv.'
      ]
    },
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],
      idCapture: { mode: 'pre-assign-cmd', argv: ['create-chat'], parse: 'stdout-trim' },
      sessionStore: '~/.cursor/chats/<md5hex(cwd)>/<sessionId>/store.db',
      notes:
        'VERIFIED 2026-08-10 (2026.08.04). store.db is SQLite; the md5 is of the VERBATIM cwd string with NO trailing slash (confirmed byte-for-byte) and is one-way — a cwd can never be recovered from the dir name, so pre-assignment is the only clean capture. ' +
        'TRAP: `--resume [chatId]` takes an OPTIONAL value; bare `--resume` opens a picker. ' +
        'Flag restoration inconclusive: `--force --trust` state persisted across resume, but --trust writes to GLOBAL config, so that is config stickiness, not flag restoration. Keep re-appending extras.'
    },
```

### 2.5 `muse` — `registry.ts:573-579`

Template unchanged (verified correct); add the capture story and the two traps.

```ts
    resume: {
      strategy: 'flag-uuid',
      template: ['resume', SESSION_ID_SLOT],   // UNCHANGED — verified hands-on
      idCapture: {
        mode: 'harvest',
        key: 'tmux-pane',
        source: 'payload.record.tmux_pane + tmux_socket_path in the runtime.session.route_facts record of session.jsonl',
        availableAt: 'session-open'
      },
      sessionStore:
        '${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<YYYY>/<MM>/<DD>/<sessionId>/session.jsonl',
      notes:
        'VERIFIED HANDS-ON 2026-08-10 (0.1.0, --provider echo). Resume is a SUBCOMMAND; root flags may sit on EITHER side of it (`muse --provider echo --yolo resume <id>` works). ' +
        'NO PRE-ASSIGNMENT on the path gmux uses: `muse exec --session-id <uuid>` is the HEADLESS subcommand; the interactive TUI rejects the flag with "invalid TUI options: error: unexpected argument \'--session-id\' found". ' +
        'HARVEST KEY IS EXACT AND GMUX-SPECIFIC: muse stamps tmux_pane ("$357:@357.%358") and tmux_socket_path ("/private/tmp/tmux-501/gmux") into its own transcript at session OPEN, before any prompt — so gmux correlates on the pane it spawned into, with no ambiguity even when several muse sessions share one cwd. specstory only ever matches workspace_root (path_utils.go:157), which cannot disambiguate that case. ' +
        'Session id == directory name == stream.id; cwd is payload.record.workspace_root in the first line. Exclude subagent/ subdirs (path_utils.go:30). ' +
        'FULL UUID ONLY — `muse resume ec346a09` → "invalid resume session uuid". No partial form. ' +
        'Resume works from ANY cwd (global store), BUT muse ADOPTS the launch cwd as the new workspace — relaunch in the original directory or the workspace silently rebinds. ' +
        'Fallbacks: `muse resume --last` (workspace-scoped most recent, no picker), bare `muse resume` (picker).'
    },
```
Bump `confidence: 'medium'` → `'high'` (`registry.ts:563`).

### 2.6 `qwen` — `registry.ts:610-616`

Template unchanged; the `sessionStore` note contains two factual errors and is missing the
hard cwd constraint.

```ts
    resume: {
      strategy: 'flag-uuid',
      template: ['--resume', SESSION_ID_SLOT],   // UNCHANGED — verified hands-on
      idCapture: {
        mode: 'harvest',
        key: 'pid',
        source: '~/.qwen/projects/<dir>/chats/<sessionId>.runtime.json → {pid, session_id, work_dir}',
        availableAt: 'session-open'
      },
      requiresOriginalCwd: true,
      sessionStore: '~/.qwen/projects/<charSubstitute(realpath(cwd))>/chats/<sessionId>.jsonl',
      notes:
        'VERIFIED HANDS-ON 2026-08-10 (0.21.7). ' +
        'CORRECTION 1 — NOT A HASH: SanitizeQwenCwd (path_utils.go:59) replaces every char outside [a-zA-Z0-9] with "-". Real dir names are plainly readable ("-Users-gdc-painpoints"). ' +
        'CORRECTION 2 — REALPATH, NOT VERBATIM: qwen sanitizes process.cwd(), which is OS-resolved. Launched from a symlink pb-link -> pb-real, the dir created was "…-pb-real". specstory\'s candidateProjectDirNames (path_utils.go:86) already tries canonical first; only its CODE COMMENT says "verbatim". Key on the realpath. ' +
        'CORRECTION 3 — the sibling .runtime.json is NOT noise for gmux. Ignoring it is right for RECONSTRUCTION (jsonl_parser.go:247, watcher.go:208) and exactly backwards for RESUME CAPTURE: it carries {pid, session_id, work_dir}, and gmux knows the pane\'s child pid, so pid -> session_id is exact. Written at session open. ' +
        'HARD CONSTRAINT: --resume is CWD-SCOPED. From the wrong directory it fails outright ("No saved session found with ID <uuid>"). Unlike muse, the id alone is not sufficient. ' +
        'FULL UUID ONLY, and a non-id string is matched BY TITLE ("No saved session found with title \\"8afda31e\\"") — a truncated id can silently resume the wrong conversation. ' +
        '`qwen sessions list` is a built-in cwd-scoped index (SESSION ID / STARTED / TITLE / BRANCH / PROMPT), usable mid-session, as a harvest cross-check. ' +
        'Fallback: `-c/--continue` (most recent for the cwd); bare `-r` shows a picker. ' +
        'CAVEAT: `--chat-recording false` disables recording and, per its own help, "--continue/--resume will not work" — never add it to a preset.'
    },
```
Bump `confidence: 'medium'` → `'high'` (`registry.ts:601`).

### 2.7 `codex` — `registry.ts:373-380`

Template unchanged. Add the SQLite index and the measured flag-restoration fact.

```ts
      idCapture: {
        mode: 'harvest',
        key: 'sqlite-index',
        source: '~/.codex/state_5.sqlite → threads(id, cwd, rollout_path, created_at_ms); fallback: rollout filename watch',
        availableAt: 'session-open'
      },
      notes:
        'Resume is a SUBCOMMAND, not a flag; SESSION_ID may be a UUID or a session NAME (UUIDs take precedence). Global date-sharded store; cwd attribution via line-1 session_meta. Bound watchers to ~7 days (fd-exhaustion lesson). ' +
        'NEW 2026-08-10 (0.147.0): ~/.codex/state_5.sqlite has a `threads` table carrying id, cwd, rollout_path, created_at_ms, has_user_event and archived in ONE row — id and cwd together, no JSONL parse and no cwd-attribution grace timer. Use it as the fast path, but KEEP watchForRollout() as the fallback: the filename is version-stamped (state_5) and undocumented. ' +
        'MEASURED, not assumed: launch flags are NOT restored — launched with --dangerously-bypass-approvals-and-sandbox the header reads "permissions: YOLO mode"; after `codex resume` that row is gone. Re-append extras. ' +
        'Fallbacks: bare `codex resume` (picker), `--last` (most recent), `--all` (disables cwd filtering).'
```

### 2.8 `antigravity` — `registry.ts:529-536`

Template unchanged; make the harvest weakness explicit rather than implied.

```ts
      idCapture: {
        mode: 'harvest',
        key: 'time-only',
        source: 'newest ~/.gemini/antigravity-cli/brain/<id>/ directory created after spawn',
        availableAt: 'session-open'
      },
      notes:
        'Resume flag is --conversation, NOT --resume — VERIFIED hands-on 2026-08-10 (1.1.11). ' +
        'HARVEST IS WEAK AND MUST BE LABELLED AS SUCH IN THE UI: nothing on disk links a conversation id to a cwd. history.jsonl has workspace+timestamp but no id; conversation_summaries.db has conversation_id + workspace_uris but is STALE SINCE MAY with workspace_uris EMPTY. Time-correlation only — two agy sessions started together are not separable. ' +
        'NOT a cross-agent resume target (real state is protobuf-in-SQLite conversations/<id>.db).'
```

### 2.9 `claude` — `registry.ts:282-293` (the only near-clean row)

One stale hedge to delete. `launch.quirks` still says pre-assignment is *"UNVERIFIED in
SpecStory code — fall back to store-watch harvest if it regresses"*. It has now been
verified end-to-end twice (PROBE A synthesis run and PROBE C: gmux's uuid became the store
filename). Replace with:

```ts
      quirks: [
        'PRE-ASSIGN: `claude --session-id <uuid>` — VERIFIED end-to-end 2026-08-10 (2.1.227): the uuid gmux passes becomes the store filename. (It appears nowhere in specstory-cli, which always harvests; that is a fact about specstory, not about claude.)'
      ]
```
and add to `resume`:
```ts
      idCapture: { mode: 'pre-assign', launchFlag: ['--session-id'] },
      notes:
        '--resume does not restore launch flags — MEASURED: --dangerously-skip-permissions gives "bypass permissions on"; after --resume it reads "auto mode on". Record the full original argv and re-append extras (claudeResumeArgv). ' +
        'Resume works from a DIFFERENT cwd (id lookup is global) — claude is the only agent with no cwd constraint. ' +
        'TRAP: `-r/--resume [value]` takes an OPTIONAL value; bare `--resume` opens a picker.'
```

### 2.10 Helper edits — `registry.ts:786-820`

**`registryLaunchArgv()` (line 790) does not substitute `SESSION_ID_SLOT`.** With pi's and
gemini's launch argv now carrying the slot, it must, or it will literally launch
`pi --session-id '<sessionId>'` — which pi's permissive id regex would happily *accept*,
creating a real session literally named `<sessionId>` shared by every pane. Add a
`sessionId` parameter, or (cleaner) keep the registry's launch argv slot-free and let
`buildLaunchSpec` compose it from `resume.idCapture.launchFlag`. Prefer the latter: one
place owns id injection.

**`registryResumeArgv()` (line 806)** currently:
```ts
  if (entry.resume.strategy !== 'flag-uuid') return [];
```
Once pi is `'flag-uuid'` this stops silently returning `[]` for pi. Two hardening additions:
```ts
  if (sessionId.length === 0) return [];   // never emit `gemini --resume ''`
```
and, given `bareResumeIsDangerous`, assert the substituted template still contains the id.

**`registry.ts:161`** — the comment `/** null when there is no safe subprocess probe (IDEs,
pi UNVERIFIED). */` must drop the pi clause; pi now has `versionProbe: { args: ['-v'] }`.

### 2.11 The tests currently ENFORCE the wrong data — fix them in the same commit

`/Users/gdc/gmux/src/main/agents/__tests__/registry.test.ts` will fail CI on the correct
registry. These assertions encode the bugs:

| line | assertion | required change |
|---|---|---|
| 106 | `if (id === 'pi') expect(entry.versionProbe).toBeNull()` | delete the exception — pi has `-v` |
| 111-115 | `it('pi is flagged UNVERIFIED with no resume mechanics')` — asserts `unverified === true`, `strategy === 'none'`, `template === []` | **delete the whole test**; replace with one asserting pi's `--session-id` template and `pre-assign` capture |
| 118-120 | `it('only pi is UNVERIFIED')` | droid is now the only docs-only row; either drop the test or flip it to droid |
| 143-148 | `expect(getRegistryEntry(id).resume.template[0]).toBe('--resume')` for a list including `'deepseek'` | move `deepseek` into the subcommand group with codex/muse |
| 152-154 | `expect(getRegistryEntry('pi').reconstructionTarget).toBe(false)` | pi's JSONL format is documented and writable → `true` |
| 188 | `expect(registryResumeArgv('pi', 'ID')).toEqual([])` | → `['pi', '--session-id', 'ID']` |

Add new tests that would have caught this class of bug:
- every launchable entry has `resume.strategy !== 'none'` (with an explicit allowlist of
  genuinely-none agents, currently empty) — this alone would have failed on pi;
- every launchable entry has an `idCapture` whose mode is not `'none'`;
- `resume.template[0]` is asserted against a per-agent literal, so a wrong verb
  (`--resume` vs `resume`) fails loudly rather than passing a shape check.

### 2.12 `docs/research/11-agent-registry.md` corrections

- **:43** — "Resume is a *subcommand* for codex and muse … a **flag** for
  claude/cursor/gemini/droid/**deepseek**/qwen" → move deepseek to the subcommand group.
- **:28, :38, :392, :310-314** — every pi statement ("v1 is READ-ONLY", "resume mechanics
  unimplemented", "ship pi as detect + session-browse only") describes **specstory-cli's
  provider**, not pi. Rewrite each to name the subject explicitly. See §5.
- **Cross-cutting mechanic 1** ("four cwd→store encodings") — qwen's line says *verbatim*;
  correct to *realpath*. Add gemini's current basename+`.project_root` scheme as a fifth.
- **Cross-cutting mechanic 4** ("Claude alone allows pre-assigning the UUID") — false.
  claude, pi and gemini all pre-assign by flag; cursor pre-assigns by side command. Four of
  ten, not one.
- **Gap 2** ("Pi is a stub … ship pi as detect + session-browse only") — delete outright.
- **Gap 3** ("Claude `--session-id` … appears nowhere in SpecStory's code") — keep the
  observation, delete the implied doubt; it is verified against claude itself.

---

## 3. The capture work gmux must do at launch

This is the part the registry has no field for and the codebase has never built. Today
`buildLaunchSpec()` (`/Users/gdc/gmux/src/main/manifest/agents.ts:97-152`) arms
`resumeArgv` for claude only; codex has a harvester (`watchForRollout`) that fills it in
later; everything else hits the `default:` branch at line 132 and gets
`idCapture: 'store-watch'` with `resumeArgv` permanently undefined — because no store
watcher exists. **That default is the bug the user observed**, and it is worth naming
plainly: `'store-watch'` reads like a strategy but is really a TODO with a nice name.

### 3.1 Tier 1 — arm at launch, no watcher, ship first (4 agents)

Zero new infrastructure. Each is a new `case` in `buildLaunchSpec`, structurally identical
to claude's.

| agent | launch argv | resume argv | notes |
|---|---|---|---|
| **claude** | `claude --session-id <uuid>` | `claude --resume <uuid>` | already shipped |
| **pi** | `pi --session-id <id>` | `pi --session-id <id>` | **identical** — the simplest case in the whole registry |
| **gemini** | `gemini --session-id <uuid>` | `gemini --resume <uuid>` | |
| **cursor** | run `cursor-agent create-chat` → id, then `cursor-agent --resume <id>` | `cursor-agent --resume <id>` | one extra sub-process before spawn; if it fails, fall back to a bare launch + Tier 3 |

```ts
// pi — the whole implementation
case 'pi': {
  const bin = binPath ?? 'pi';
  const id = randomUUID();          // or the gmux pane id — pi accepts either
  return {
    agent,
    agentSessionId: id,
    argv: [bin, '--session-id', id, ...extraArgs],
    resumeArgv: [bin, '--session-id', id, ...extraArgs],
    idCapture: 'preassigned'
  };
}
```

Shipping Tier 1 alone takes armed-resume coverage from **1 of 10 agents to 4 of 10**, with
no watcher, no race, and no timeout path.

### 3.2 Tier 2 — exact-key harvest (3 agents)

A real watcher, but the correlation key is *exact*, so there is no attribution guesswork
and no grace timer:

| agent | watch | key | available |
|---|---|---|---|
| **qwen** | `~/.qwen/projects/<charSub(realpath(cwd))>/chats/` — **one deterministic directory**, derived from cwd, so no scan | `<id>.runtime.json` → `pid` matches the pane's child pid | session open |
| **muse** | `${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<today>/` | `route_facts.tmux_pane` + `tmux_socket_path` match the pane gmux spawned into | session open |
| **codex** | `~/.codex/state_5.sqlite` `threads` (poll), rollout-filename watch as fallback | `threads.cwd` + `created_at_ms`; already shipped as `watchForRollout` | session open |

qwen is the cheapest of the three: the directory is a pure function of the cwd, so gmux
watches exactly one path. muse is the most *robust*, because `tmux_pane` is a true identity
rather than a proxy — it survives two sessions in one cwd, which cwd-matching never does.

### 3.3 Tier 3 — weak harvest, must be labelled (2 agents)

| agent | why it is weak |
|---|---|
| **deepseek** | flat global store; the only cwd signal is `metadata.workspace` **inside** the file, and the file is written on the first turn. Newest-after-spawn + cwd match. Two deepseek panes in one directory started together are not separable. |
| **antigravity** | **no id→cwd link exists on disk at all.** Time-correlation only. |

These two must never be reported to the user as "will come back with its conversation"
until the id is actually in the manifest. Which is exactly §4.

### 3.4 Cross-cutting rules for whatever builds this

1. **Never write a resume argv with an empty or partial id.** For gemini an id-less
   `--resume` silently opens the most recent conversation; for pi and qwen a truncated id
   silently opens a *different* one. Validate before persisting: full id or nothing.
2. **Persist the absolute session-file path alongside the id.** pi (`--session <abs path>`)
   and gemini (`--session-file <path>`) both accept a path that bypasses all cwd-scoped
   lookup — the only repair route when a project moves.
3. **Re-append the original extra flags to every resume argv.** Now measured, not assumed,
   on four agents: claude, codex, muse and qwen all lose their permission flags across
   resume (`bypass permissions on` → `auto mode on`, `YOLO mode` → `Auto mode`, and so on).
   cursor is inconclusive (its `--trust` writes global config). pi is unresolved — pi also
   persists last-used model in settings, so do not conclude either way.

   > **CORRECTION, Phase 13.5.1 (measured by `conformance:resume`, then hands-on in tmux):**
   > the rule holds, but *where* the flags go does not. deepseek's usage is
   > `deepseek [OPTIONS] <COMMAND> [ARGS]`, so `deepseek resume <id> --skip-onboarding`
   > exits with `error: unexpected argument` — a DEAD restored pane — while
   > `deepseek --skip-onboarding resume <id>` brings the conversation back. Dropping the
   > extras there would also have cost something real: `--skip-onboarding` is what keeps the
   > restored pane out of the first-run workspace-trust dialog. Carried as registry data
   > (`AgentResumeInfo.resumeExtrasPosition: 'leading'`), honoured in `registryResumeArgv()`.
   > Before writing "the CLI refuses this flag", check whether it refuses it *in that position*.
4. **Record the agent CLI version in the manifest row** at capture time. Two of this
   audit's corrections (gemini `.json` → `.jsonl`, codex's new SQLite index) are version
   drift in stores gmux reads. A row captured under a version gmux no longer sees should be
   treated as suspect, not trusted.
5. **Do not let a harvest timeout look like success.** `watchForRollout` already rejects
   after 120 s with a message that says the session is fine but the id was not recorded.
   Every new harvester must do the same, and the failure must reach §4's indicator.

### 3.5 A restore-path bug this audit exposes

`restoreSessionInTmux()` (`/Users/gdc/gmux/src/main/restore/restore.ts:59-63`):

```ts
  const cwd = existsSync(rec.cwd)
    ? rec.cwd
    : existsSync(rec.projectPath)
      ? rec.projectPath
      : null;
```

The silent fallback from the recorded `cwd` to `projectPath` is safe for claude (global id
lookup) and muse (global store), but it is **actively harmful** for the cwd-scoped agents:

- **qwen** → `No saved session found with ID <uuid>`. Loud, recoverable, merely confusing.
- **pi** → **a new EMPTY session under the same id.** The pane looks resumed. The
  conversation is not there. The original file is untouched on disk but nothing in the UI
  says so. This is precisely the failure mode the mission is about, reproduced by gmux's
  own restore path rather than by a wrong template.

Recommendation: when `resume.requiresOriginalCwd` is true and `rec.cwd` no longer exists,
**do not substitute** `projectPath`. Restore the pane without arming resume and say why —
and, for pi, offer the `pi --session <abs path>` repair using the stored session path from
§3.4 rule 2.

> **IMPLEMENTED, Phase 13.5.1** (`src/main/restore/restore.ts`). Two deviations from the
> recommendation above, both deliberate: (a) the refusal is the friendly INVALID_INPUT state
> naming the missing folder, rather than a silent unarmed restore — a pane that comes back
> with no explanation is how this class of bug hides; (b) it fires only when a resume is
> actually ARMED, because with nothing to type there is no false resume to prevent and the
> user should still get their directory and scrollback. Restore re-derives the flag from the
> registry: `AgentLaunchSpec.requiresOriginalCwd` is set at create time and never persisted,
> so it cannot answer this question after a reboot.

---

## 4. UI honesty requirement — before the reboot, not after

**Requirement.** A session whose conversation will come back must be visibly distinguishable
from one that will come back as a bare directory, *at the moment the user is looking at a
running session*, not after they restore it.

**Today it is only discoverable after the fact**, in exactly two places, both post-restore:

- `/Users/gdc/gmux/src/renderer/app/TerminalRegion.tsx:823` — the restore panel's body text
  branches on `(active.resumeArgv?.length ?? 0) > 0` between *"Restore brings back its saved
  scrollback and types the resume command for you"* and *"Restore reopens it in the same
  directory with its saved scrollback above a fresh prompt."*
- `/Users/gdc/gmux/src/renderer/state/store.ts:774` — the same boolean picks between two
  success toasts, after the restore has already run.

Both are correct and both are too late. The user learns their four muse/qwen/pi panes were
never resumable **after** the reboot has already happened.

### 4.1 What to add

1. **A per-session resume indicator in the live session row**
   (`/Users/gdc/gmux/src/renderer/app/SessionDock.tsx:98-113`, beside the existing
   `srow-saved` history glyph, which today only appears when `status === 'restorable'`).
   Three states, driven by data gmux already has:

   | state | condition | meaning |
   |---|---|---|
   | **conversation armed** | `resumeArgv` non-empty and id validated | reboot restores the conversation |
   | **capturing** | `idCapture` is a harvest mode and no id yet | transient; resolves within seconds for every Tier-2 agent |
   | **directory only** | agent has no capture path, or harvest timed out/failed | reboot restores the folder and scrollback, **not the conversation** |

   Follow the codebase's own rule from `status.ts` — *"Status is never color-alone"*: shape
   plus a text label plus the existing tooltip (`sessionTooltip`, line 75).

2. **Never let "capturing" be a permanent resting state.** A harvest that has not resolved
   within its timeout must flip to **directory only**, not sit spinning. A hopeful
   indeterminate state is how this bug hid in the first place.

3. **A project-level pre-reboot summary.** Where "Restore all" lives
   (`store.ts:791 restoreAllSessions`), state the split plainly before the user acts:
   *"6 sessions saved — 4 will resume their conversation, 2 will reopen as folders."*

4. **Say which agent and why, in the tooltip.** "Pi has no resume id yet — it writes one on
   the first message" is actionable (send a message). "Antigravity conversations cannot be
   matched to this folder reliably" is honest about a limitation gmux cannot fix. Generic
   "no resume available" teaches nothing and is what the current registry data would
   produce.

5. **Distinguish *cannot* from *not yet built*.** Under the corrected data no installed
   agent genuinely lacks resume. Any "directory only" the user sees today is gmux's missing
   capture work, and the UI should not imply the agent is at fault.

---

## 5. Why the original research got this wrong

**The registry was mined from specstory-cli, which is a capture tool.** specstory-cli's job
is to watch where each agent *writes* its transcript and mirror it. It never needs to
resume anything. So its provider SPI is rich and reliable about `storeDirs`, file formats,
and cwd encodings, and near-silent about resume — and where it does speak, it speaks about
*its own* capabilities.

The tell is visible in the data itself. **pi's `storeDirs` were already correct while its
`resume` was entirely wrong.** That is the exact signature of a capture-derived entry: the
half a capture tool needs is right; the half it never needed is invented or inherited.

The specific inference error, in one line:

> specstory-cli's pi provider returns *"not yet supported"* for run/watch/resume
> → therefore **pi** has no resume mechanics.

That is a statement about specstory-cli. Nothing about it constrains pi. And pi's resume
surface required no reverse engineering to find: `--session-id` is in `pi --help`, in the
shipped `docs/sessions.md`, and in readable JS in `dist/`. One `pi --help` would have caught
it. The same substitution produced the registry's *"binary name and launch argv are gmux's
best guess"* (the binary is `pi` and bare launch works), *"no version command is confirmed
upstream"* (`pi -v` → `0.84.1`), and `confidence: 'low'` on what is now the best-documented
resume surface in the set.

The second failure was subtler and hit the agents whose templates were *right*:
**specstory harvests every id asynchronously, so nothing in its code distinguishes "there
is no id yet" from "there is no way to pre-assign an id".** The registry inherited that
flattening. muse and qwen were typed `'flag-uuid'` — indistinguishable from claude's
pre-assigned `--session-id` — with no field anywhere to record how the id is obtained. So
`buildLaunchSpec` had no data to act on and defaulted them to `store-watch`, a strategy no
one had implemented. **Correct templates plus a missing capture field still produce a dead
pane.** This is why §2.0(b) adds `idCapture` to the type, not just corrected strings to the
data.

A third, smaller mechanism: **the registry hardened loose upstream comments into claims.**
qwen's "sanitize hashes the VERBATIM cwd" came from a specstory code *comment* that says
"verbatim" while the code beside it (`candidateProjectDirNames`) correctly tries the
canonical path first. And *"Ignore sibling .runtime.json"* was true guidance for
reconstruction (specstory filters it) and exactly backwards for resume capture — the same
file is the best harvest key qwen has. Guidance copied across a purpose boundary inverts.

### Rules for the next synthesis

1. **Name the subject of every claim.** "specstory-cli cannot resume pi" and "pi cannot be
   resumed" are different sentences. Where a claim comes from a tool *about* an agent,
   write the tool's name into the note.
2. **A capture tool is not a resume oracle.** Trust a mined store path; never trust a mined
   *absence* of a capability.
3. **Run `<bin> --help` before writing `UNVERIFIED`.** It is seconds of work and it would
   have caught pi, deepseek, gemini's `--session-id`, and cursor's `create-chat` — four of
   this audit's five substantive corrections.
4. **Copy behaviour, never guidance, across purposes.** "Ignore this file" from a
   reconstruction context says nothing about a capture context.
5. **A field with no place to live gets guessed.** The absence of an `idCapture` field did
   not make the question go away; it pushed the answer into a default branch where nobody
   reviewed it. When a synthesis cannot express a distinction, add the field.
6. **Do not encode a hedge as a passing test.** `expect(pi.resume.strategy).toBe('none')`
   turned an unverified guess into a CI-enforced invariant, so the false claim would have
   survived a casual fix. Assert what was *measured*, and leave what was not measured
   unasserted.

---

## 6. Still unverified

| # | item | why it is open | how to close it |
|---|---|---|---|
| 1 | **droid** — the whole row | not installed (`command -v droid` fails; `~/.factory` has only `skills/`) | install droid; confirm `--resume [sessionId]` (bare = last modified per docs), `-s/--session-id <id>` pre-assignment, `--fork <id>`, and whether `~/.factory/sessions/<dashEncode(realpath(cwd))>/` matches claude's encoding as claimed. Its docs suggest **Tier 1** pre-assignment; if so, five of ten agents arm at launch. Keep `confidence` docs-only until then. |
| 2 | **gemini** — that `--resume <uuid>` actually restores the conversation | pre-assignment and the store layout were verified hands-on, but the account returns API 400, so the *restore* is **source-verified only** (`findSession` matches full UUID first) | one authenticated marker round-trip |
| 3 | **pi** — whether resume restores launch flags | the resumed pane showed `thinking off` and the same model without those flags, but pi also persists last-used model in settings, so the two explanations are not separated | launch with a non-default model *and* a settings value that disagrees, then resume |
| 4 | **cursor** — same question | `--force --trust` persisted, but `--trust` writes to global config → config stickiness, not flag restoration | use a flag with no config side effect |
| 5 | **codex** — `state_5.sqlite` stability | undocumented internal file with a version-stamped name; verified present and correctly shaped today | keep `watchForRollout` as the fallback permanently; add a schema probe before trusting the table |
| 6 | **antigravity** — any id→cwd link at all | none found: `conversation_summaries.db` stale since May with empty `workspace_uris` | re-check after the next `agy` release; until then this agent is honestly Tier 3 |
| 7 | **deepseek** — exact harvest timing | the file appears on the first turn (like pi), but the pre-first-turn window was not measured to pi's precision | poll at 50 ms against an idle prompt, as PROBE A did for pi |
| 8 | **All agents** — behaviour when two panes in one cwd start within the same second | only pi's collision was proven (and it is a *partial-id* collision, a different mechanism). **Guarded since Phase 32 (2026-08-14)** by the deterministic unit gate `src/main/manifest/__tests__/harvest-claim-race.test.ts`, which scripts both watches, one candidate and the timers, and runs on every `npm test`. The operator hit the antigravity race live that day; docs/research/40-antigravity-claim-race.md records the mechanism and the fix | matters only for Tier 2/3; muse (`tmux_pane`) and qwen (`pid`) are immune by construction. antigravity moved from "not immune" to **immune while its process lives**: its owning `agy` holds open fds under `brain/<id>` and is a descendant of the pane, an exact confirm now keys on that (`fd-owner`), and a grace guess stays provisional so the rightful session reclaims it (research 40). deepseek is still not immune |
| 9 | **pi** — `activity` profile | still `tier: 'screen'`, `verified: 'unverified'`; unchanged by this audit | the Phase-13 activity matrix, not this workstream |
| 10 | **The `.zst` path for codex rollouts** | `classifyCandidate` returns `'unknown'` for compressed rollouts and falls back to the grace timer | the SQLite `threads` fast path sidesteps this entirely — another reason to add it |

---

## Appendix — files this audit touches or names

Written by this workflow:
- `/Users/gdc/gmux/docs/research/22-resume-audit.md` (this file)

Needs edits (**not made — `src/**` is read-only for this workflow**):
- `/Users/gdc/gmux/src/main/agents/registry.ts` — §2
- `/Users/gdc/gmux/src/main/agents/__tests__/registry.test.ts` — §2.11
- `/Users/gdc/gmux/src/main/manifest/agents.ts` — §3.1, §3.2
- `/Users/gdc/gmux/src/main/restore/restore.ts` — §3.5
- `/Users/gdc/gmux/src/renderer/app/SessionDock.tsx` — §4.1
- `/Users/gdc/gmux/src/renderer/app/TerminalRegion.tsx` — §4 (existing, too-late surface)
- `/Users/gdc/gmux/src/renderer/state/store.ts` — §4 (existing, too-late surface)
- `/Users/gdc/gmux/docs/research/11-agent-registry.md` — §2.12

Read-only evidence consulted: `~/.pi/agent/sessions/`, `~/.qwen/projects/`,
`~/.local/share/muse/sessions/`, `~/.gemini/tmp/`, `~/.codex/state_5.sqlite`, and the
`--help` output of claude, codex, cursor-agent, gemini, deepseek, agy, muse, qwen, pi.
`/Users/gdc/getspecstory` was never touched.
