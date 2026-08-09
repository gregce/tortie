# Research 02 — Resuming CLI coding agents after process death (reboot)

**Dimension:** the "resurrection" half of P1 (durable named sessions). Companion to research 01 (keeping live processes attached across app restarts).
**Date:** 2026-08-09. All claims verified against current docs/repos as of this date.

---

## The mental model: transcripts, not process state

Every major CLI agent implements "resume" the same way: the agent **continuously appends the conversation transcript to disk** (JSONL, JSON, SQLite, or a server-side thread), and `resume` **starts a brand-new process that replays the transcript** into the model's context. Nothing about the old OS process survives — no shell state, no environment mutations, no in-flight tool calls. This is exactly what gmux needs after a reboot: the conversation is durable even though the process is not.

Consequences that hold for *all* agents below:

- **Restored:** full conversation history (messages, tool calls, tool results), usually the model choice, sometimes permission mode.
- **Lost, always:** running/background shell processes the agent spawned; pending (unanswered) tool-approval prompts; MCP server *state* (servers are cold-restarted from config on the new launch); terminal scrollback (unless the terminal layer restores it — that's research 01's job); any context that only lived in the model's KV cache (rebuilt by re-reading the transcript, at re-tokenization cost).
- **Fragile:** flags passed at the original launch (MCP config paths, extra dirs, permission bypass) generally must be **re-passed** on resume — the transcript does not store the launch command. This is the single strongest argument for gmux recording the *exact launch invocation* per named terminal.

---

## Per-agent findings

### Claude Code (Anthropic)

- **License / status:** Proprietary ("© Anthropic PBC. All rights reserved."; npm `@anthropic-ai/claude-code`, "SEE LICENSE IN README.md"). Not open source — confirmed via [openhands.dev analysis](https://www.openhands.dev/blog/is-claude-code-open-source) and the [open-source feature request issue #22002](https://github.com/anthropics/claude-code/issues/22002). Very actively maintained (v2.1.2xx line in mid-2026).
- **Persistence:** Sessions saved **continuously** as JSONL to `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is the cwd path with non-alphanumerics replaced by `-`. `~/.claude/history.jsonl` is a global index (prompt, timestamp, project path, session ID). Location movable via `CLAUDE_CONFIG_DIR`; retention default 30 days (`cleanupPeriodDays`). The JSONL entry format is explicitly documented as internal/unstable. Source: [Manage sessions docs](https://code.claude.com/docs/en/sessions).
- **Resume commands:**
  - `claude --continue` / `-c` — most recent session in the current directory.
  - `claude --resume <session-id|name>` — direct, non-interactive selection; opens a picker if no argument. Since **v2.1.223** the ID is searched across *every project on the machine*, so resume works from any cwd.
  - `claude -p --resume <session-id> "prompt"` — fully headless resume (print mode), works even for sessions the picker hides.
  - `claude --resume <x> --fork-session` — resume into a *new* session ID (branch).
- **Killer feature for gmux:** **`--session-id <uuid>`** lets the launcher *pre-assign* the session ID at start ([CLI reference](https://code.claude.com/docs/en/cli-reference)). gmux can generate a UUID per named terminal, launch `claude --session-id <uuid>`, and later resurrect deterministically with `claude --resume <uuid>` — no parsing of `~/.claude` needed. Also: `-n <name>` names the session, and `claude --resume <name>` resolves names.
  - Secondary capture channels: hooks (`SessionStart`/`SessionEnd`) and the statusline command receive `session_id` and `transcript_path` as JSON input — a zero-cost way for gmux to learn/confirm IDs of sessions it didn't launch ([sessions docs → "Access conversations from scripts"](https://code.claude.com/docs/en/sessions)).
- **What resume restores / loses** (explicitly documented): restores history, model, agent, permission mode (except `plan` and `bypassPermissions`, never restored), active goal, unexpired scheduled tasks. **Not restored:** background Bash tasks and monitors, `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model`, `--add-dir` directories — these flags must be re-passed. Long-idle >100k-token sessions get a "resume from summary vs. full" dialog on Pro/Max.
- **Verdict for gmux:** best-in-class. Deterministic ID pre-assignment + cross-directory resume by ID + headless resume = fully scriptable resurrection.

### OpenAI Codex CLI

- **License / status:** **Apache-2.0**, Rust, [github.com/openai/codex](https://github.com/openai/codex) — ~100k stars, v0.12x line, very actively maintained in 2026 ([Apache-2.0 confirmed](https://toknow.ai/posts/openai-codex-cli-rust-coding-agent-open-source/)).
- **Persistence:** every session auto-saved as a JSONL "rollout" file: `~/.codex/sessions/YYYY/MM/DD/rollout-YYYY-MM-DDThh-mm-ss-<uuid>.jsonl[.zst]` — full transcript incl. prompts, responses, tool calls/results ([session/rollout files discussion #3827](https://github.com/openai/codex/discussions/3827), [Inventive HQ guide](https://inventivehq.com/knowledge-base/openai/how-to-resume-sessions)). Rollouts may be **zstd-compressed** (`.jsonl.zst`), and archived sessions move to a sibling `archived_sessions` subdirectory — the layout and filename pattern are documented in [codex-rs `rollout/src/list.rs`](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/list.rs) (verified 2026-08-09). `codex exec --ephemeral` skips persistence (those runs can't be resumed).
- **Resume commands** ([CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) — formerly developers.openai.com/codex/cli/reference, which now 308-redirects there; picker, `--last`, resume-by-SESSION_ID, and `codex exec resume` all re-verified at the new URL 2026-08-09 — and [DeepWiki resume commands](https://deepwiki.com/openai/codex/4.2.2-resume-and-review-commands)):
  - `codex resume` — interactive picker (scoped to cwd; `--all` widens; `--include-non-interactive` adds exec sessions).
  - `codex resume --last` — most recent in cwd.
  - `codex resume <SESSION_ID>` — direct by UUID (works even for sessions the picker doesn't list — [issue #20165](https://github.com/openai/codex/issues/20165)).
  - **`codex exec resume <SESSION_ID|--last> "follow-up"`** — non-interactive scripted resume with an immediate prompt.
  - Cwd mismatch: Codex prompts to pick session-dir vs current-dir; `tui.resume_cwd = "current"|"session"` in `~/.codex/config.toml` or `--cd` suppresses the prompt — relevant to gmux automation.
- **ID capture:** the session ID is embedded in the rollout filename and inside the JSONL; `codex exec --json` emits a `thread.started` event with the thread id. For interactive launches, gmux must discover the ID by watching `~/.codex/sessions/` for the newest rollout created after launch (filename contains the UUID) — the watcher must match both `.jsonl` and `.jsonl.zst` and tolerate files later moving to the `archived_sessions` subdir (see Persistence above). No `--session-id` pre-assignment equivalent as of v0.12x.
- **Lost on resume:** model in-context working state (rebuilt by transcript replay), MCP servers are respawned at startup (Codex spawns them once in `McpConnectionManager::new` — [issue #4955](https://github.com/openai/codex/issues/4955)), any sandboxed processes. Old rollouts with event variants the current parser doesn't know can fail to load ([issue #21761](https://github.com/openai/codex/issues/21761)) — pin-version caution for long-lived sessions.
- **Verdict:** fully scriptable resurrection; ID discovery requires a filesystem watch or `--json` exec mode, both workable.

### Gemini CLI (Google) — ⚠ status change in 2026

- **License / status:** Apache-2.0, [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli). **BUT:** Google retired Gemini CLI for free/Pro/Ultra consumer accounts on **June 18, 2026**, pushing users to the **closed-source Go "Antigravity CLI"**; only paid Gemini Code Assist Standard/Enterprise keep Gemini CLI service ([official transition discussion #27274](https://github.com/google-gemini/gemini-cli/discussions/27274), [The Register coverage](https://www.theregister.com/ai-ml/2026/05/20/bye-bye-gemini-cli-google-nudges-devs-toward-antigravity/5243605), [TechTimes](https://www.techtimes.com/articles/318660/20260618/gemini-cli-shutdown-takes-effect-ci-cd-pipelines-break-go-based-antigravity-cli-arrives.htm)). The Apache-2.0 repo remains public. Antigravity CLI's repo has **no source code** published.
- **Persistence:** sessions auto-recorded to `~/.gemini/tmp/<project_hash>/chats/` (project hash = hash of project root). Full history: prompts, responses, tool inputs/outputs, token usage. Retention default 30 days / max 50 sessions, configurable (`maxAge`, `maxCount`, `minRetention`) ([session-management docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/session-management.md), [Google blog announcement](https://developers.googleblog.com/pick-up-exactly-where-you-left-off-with-session-management-in-gemini-cli/)).
- **Resume commands:** `gemini --resume` (latest), `gemini --resume <index>`, `gemini --resume <uuid>`; `/resume` in-session opens a browser with search. Named checkpoints: `/resume save <name>` / `/resume resume <name>`.
- **Known resume bugs (2026):** resuming can drop the latest chat from `/chat list` ([issue #27368](https://github.com/google-gemini/gemini-cli/issues/27368)); plans/trackers stay bound to the startup session ID ([issue #24639](https://github.com/google-gemini/gemini-cli/issues/24639)).
- **ID capture:** no pre-assignment; discover by watching `~/.gemini/tmp/<hash>/chats/` for the new session file after launch. Resume is cwd-sensitive (project hash), so gmux must restore in the same cwd.
- **Verdict:** mechanically fine (UUID resume exists), but gmux should treat Gemini CLI as **legacy** for consumer accounts and expect users to migrate to Antigravity CLI, whose resume story is undocumented (gap).

### opencode (Anomaly, ex-SST)

- **License / status:** **MIT**, [github.com/anomalyco/opencode](https://github.com/anomalyco/opencode) (org renamed from `sst` to `anomalyco`; old URLs 301-redirect). ~180k stars mid-2026, extremely active ([LICENSE](https://github.com/anomalyco/opencode/blob/dev/LICENSE)).
- **Persistence:** historically JSON files under `~/.local/share/opencode/storage/` (`session/`, `message/`, `part/`); **migrated in 2025–2026 to a SQLite database `opencode.db`** in the same data dir — a migration that notoriously did not import legacy JSON sessions ([issue #34445](https://github.com/anomalyco/opencode/issues/34445), [ccusage opencode docs](https://ccusage.com/guide/opencode/)). Storage grows unboundedly; no built-in prune yet ([issue #22110](https://github.com/anomalyco/opencode/issues/22110)).
- **Resume commands** ([CLI docs](https://opencode.ai/docs/cli/)): `opencode --continue`/`-c` (last session), `opencode --session <id>`/`-s` (by ID), `--fork` to branch on resume; same flags on non-interactive `opencode run`. Client/server architecture also exposes sessions over a local HTTP server — a future deep-integration path for gmux.
- **Caveats:** `-s` from a different directory has resumed in the launch dir instead of the session's stored dir ([issue #28581](https://github.com/anomalyco/opencode/issues/28581)) — gmux should always restore with the recorded cwd; `--continue --session` syntax has had regressions ([issue #11680](https://github.com/anomalyco/opencode/issues/11680)).
- **ID capture:** session IDs visible in TUI and DB; no documented `--session-id` pre-assignment. Simplest: launch, then read newest session row from `opencode.db` (SQLite is easy to query read-only) or use the server API.
- **Verdict:** resurrection workable via `-s <id>` + recorded cwd; the local server API is the most robust integration if gmux ever wants first-class opencode support.

### Amp (Sourcegraph / ampcode.com)

- **License / status:** proprietary SaaS; CLI is npm-distributed; threads are the product's core unit. Actively developed through 2026.
- **Persistence:** threads **sync to ampcode.com** (server-side is the source of truth; cross-device by design). Local disk is a cache — the manual documents no offline mode ([Owner's Manual](https://ampcode.com/manual)).
- **Resume commands** ([Amp CLI guide](https://github.com/sourcegraph/amp-examples-and-guides/blob/main/guides/cli/README.md)): `amp threads new`, `amp threads list`, `amp threads continue <threadId>` (interactive resume), `amp threads continue <threadId> -x "message"` (non-interactive execute mode: sends message, prints final reply, exits), `amp threads fork <threadId>`, `amp threads compact <threadId>`.
- **ID capture:** thread IDs are printed/listable (`T-<uuid>` format) and stable; `amp threads new` can pre-create one before first use — same pre-provisioning trick as Claude Code.
- **Lost on resume:** same as the general model; additionally resume requires network + auth (server-side threads).
- **Verdict:** cleanly scriptable (`new` → record ID → `continue <id>`), but resurrection depends on Amp's cloud being reachable.

### aider — ⚠ maintenance mode

- **License / status:** Apache-2.0, [github.com/Aider-AI/aider](https://github.com/Aider-AI/aider). **Last feature release v0.86.0 on Aug 9, 2025**; only maintenance patches since (v0.86.3.dev, Feb 2026); community openly describes it as maintenance mode ([releases](https://github.com/Aider-AI/aider/releases), [HN thread](https://news.ycombinator.com/item?id=46067907), [future-direction issue #4751](https://github.com/Aider-AI/aider/issues/4751)).
- **Persistence:** markdown chat log `.aider.chat.history.md` in the repo root (plus `.aider.input.history`). Not a structured session store — it's one rolling history file per project, no session IDs.
- **Resume:** `aider --restore-chat-history` (or `AIDER_RESTORE_CHAT_HISTORY=true` / `.aider.conf.yml`) reloads prior history on launch, summarizing older chunks to fit the token budget ([options reference](https://aider.chat/docs/config/options.html)). No per-session selection — you get "the" project history. Restore has known summarization bugs ([issue #2979](https://github.com/Aider-AI/aider/issues/2979)).
- **Verdict:** resurrection = relaunch `aider --restore-chat-history` in the recorded cwd with recorded flags. Crude but dead simple; no ID bookkeeping possible or needed. Deprioritize given maintenance status.

### Cursor CLI (`cursor-agent`)

- **License / status:** proprietary (Anysphere); actively developed 2026.
- **Persistence:** CLI chats stored under **`~/.cursor/chats`** — a store *separate* from the Cursor IDE's chat storage; staff-confirmed they don't sync ([Cursor forum: separate session stores](https://forum.cursor.com/t/local-ide-agent-chats-and-the-agent-cli-still-use-separate-session-stores/165486)).
- **Resume commands** ([CLI parameters docs](https://cursor.com/docs/cli/reference/parameters)): `cursor-agent ls` (list sessions), `cursor-agent resume` (latest), `cursor-agent --resume=<chat-id>` (specific), `--continue` = alias for `--resume=-1`. Works with `-p/--print` for non-interactive resumed runs.
- **Killer detail:** **`cursor-agent create-chat`** creates an empty chat and prints its ID — pre-provisioning support like Claude Code's `--session-id`. Coder's registry work confirms the practical pattern: capture chat ID at launch, persist it, resume on warm start ([coder/registry issue #747](https://github.com/coder/registry/issues/747)). Ctrl-C interrupt also prints a resumable chat ID.
- **Verdict:** fully scriptable: `create-chat` → launch with `--resume=<id>` from the start → resurrect with the same command.

---

## Resurrection matrix

| Agent | Persists to disk? | Where | Resume latest | Resume by ID (non-interactive capable) | Pre-assign/pre-create ID | What's lost on resume | License / maintenance |
|---|---|---|---|---|---|---|---|
| **Claude Code** | Yes, continuous JSONL | `~/.claude/projects/<proj>/<uuid>.jsonl` | `claude --continue` | `claude --resume <uuid\|name>`; headless: `claude -p --resume <uuid>`; works from any cwd (≥v2.1.223) | **Yes: `--session-id <uuid>`**, plus `-n <name>` | bg Bash/monitors; `--mcp-config`/`--add-dir`/`--settings` flags; bypass/plan mode | Proprietary; very active |
| **Codex CLI** | Yes, JSONL rollouts | `~/.codex/sessions/YYYY/MM/DD/rollout-*-<uuid>.jsonl[.zst]` (may move to `archived_sessions/`) | `codex resume --last` (cwd-scoped) | `codex resume <uuid>`; scripted: `codex exec resume <uuid> "msg"` | No; discover via rollout filename or `exec --json` thread id | model working state (replayed); MCP servers cold-restart; sandbox procs | Apache-2.0; very active |
| **Gemini CLI** | Yes, per-project chats | `~/.gemini/tmp/<project_hash>/chats/` | `gemini --resume` | `gemini --resume <uuid>` (also by index) | No; watch chats dir | general model; resume bugs (#27368, #24639); cwd-bound (project hash) | Apache-2.0 repo, but consumer service killed 2026-06-18 → closed-source Antigravity CLI |
| **opencode** | Yes, SQLite | `~/.local/share/opencode/opencode.db` (was `storage/` JSON) | `opencode --continue` | `opencode --session <id>` (also on `opencode run`); `--fork` to branch | No; query newest session in DB or server API | general model; cwd bugs (#28581) → always restore in recorded cwd | MIT; very active (anomalyco) |
| **Amp** | Server-side threads (local cache) | ampcode.com (thread `T-…` IDs) | — (use thread ID) | `amp threads continue <id>`; scripted: `… continue <id> -x "msg"` | **Yes: `amp threads new`** | general model; needs network/auth | Proprietary SaaS; active |
| **aider** | Yes, markdown log | `.aider.chat.history.md` in repo | `aider --restore-chat-history` | No IDs — one history per project | N/A | general model; history summarized to fit budget | Apache-2.0; **maintenance mode** (last feature rel. Aug 2025) |
| **cursor-agent** | Yes | `~/.cursor/chats` | `cursor-agent resume` / `--continue` | `cursor-agent --resume=<chat-id>` (works with `-p`) | **Yes: `cursor-agent create-chat`** | general model; separate store from IDE chats | Proprietary; active |

---

## Strategies for gmux to resurrect agents after reboot

### 1. The session manifest (recommended core mechanism)

gmux controls every terminal it creates, so it can do far better than tmux-resurrect's process-table archaeology. Per **named terminal**, persist a manifest record at launch time and update it as the session evolves:

```json
{
  "terminalName": "auth-refactor",
  "workspace": "~/code/myapp",
  "cwd": "~/code/myapp",
  "agent": "claude",
  "launchArgv": ["claude", "--session-id", "550e8400-…", "-n", "auth-refactor", "--mcp-config", "./mcp.json"],
  "env": {"CLAUDE_CONFIG_DIR": null},
  "sessionId": "550e8400-…",
  "resumeArgv": ["claude", "--resume", "550e8400-…", "--mcp-config", "./mcp.json"],
  "lastAlive": "2026-08-09T17:40:00Z"
}
```

Key points:

- **Record the full original argv**, not just the session ID — Claude Code explicitly does not restore `--mcp-config`/`--add-dir`/etc., and every agent needs its original flags re-passed.
- **Capture the session ID as early as possible**, per-agent:
  - *Claude Code:* generate the UUID yourself, pass `--session-id`. Deterministic; nothing to parse. (Confirm behavior when the same ID is reused after `/clear` — see gaps.)
  - *cursor-agent:* `cursor-agent create-chat` → launch with `--resume=<id>` from the first run.
  - *Amp:* `amp threads new` → `amp threads continue <id>`.
  - *Codex / Gemini / opencode:* launch normally, then watch the storage location (`~/.codex/sessions/**`, `~/.gemini/tmp/<hash>/chats/`, `opencode.db`) for the entry created immediately after spawn; write it into the manifest. FSEvents on macOS makes this cheap.
  - *Claude Code fallback for sessions gmux didn't launch:* a `SessionStart` hook that POSTs `session_id` + `transcript_path` to gmux.
- **On reboot restore:** for each manifest entry whose process is gone, recreate the named terminal at `cwd` and run `resumeArgv`. Offer three per-terminal policies (mirrors what users expect from tmux-resurrect): *auto-resume*, *type-but-don't-run* (pre-fill the command line so the user hits Enter — safest default, avoids surprise token spend), and *shell only*.
- **Two-tier durability:** tier 1 (app restart, machine still up) = reattach to live processes via the persistence layer from research 01 (tmux server / detached PTY daemon); tier 2 (reboot) = this manifest replay. The manifest is also the recovery path when tier 1's daemon itself died.

### 2. How tmux-resurrect does it (the prior art)

[tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) (MIT, 13k★, **dormant: last push Aug 2024**, not archived) saves, on demand, a text file describing every session/window/pane: layout, cwd, and the running command (captured via `ps`, pluggable via `@resurrect-save-command-strategy` strategy scripts). On restore it recreates panes and **retypes the command only for whitelisted programs** — default list `vi vim nvim emacs man less more tail top htop irssi weechat mutt` ([restoring_programs.md](https://github.com/tmux-plugins/tmux-resurrect/blob/master/docs/restoring_programs.md)):

- `set -g @resurrect-processes 'ssh psql claude codex'` — add programs to auto-restart.
- `~` prefix = match anywhere in the ps string; `->` = substitute a custom restore command; `*` = re-append saved arguments. Example of an agent-aware rule:
  `set -g @resurrect-processes '"~claude->claude --continue" "~codex->codex resume --last"'`
  This is the community pattern for agent resurrection under tmux, and it works precisely because both agents have a "resume most recent in this cwd" command — the pane's restored cwd selects the right session.
- `:all:` restores everything verbatim (documented as dangerous — it re-runs arbitrary commands).
- Companion plugin tmux-continuum auto-saves every 15 min and auto-restores when the tmux server starts.

**Lessons for gmux:** (a) per-program restore strategies are exactly the right shape — gmux should implement them natively per agent rather than shelling out to a dormant plugin; (b) `ps`-based command capture is lossy (Node-based CLIs mangle argv — the docs call out gulp/grunt/npm), which gmux avoids entirely because it *is* the launcher; (c) cwd-scoped "resume latest" (`--continue` / `resume --last`) is a robust fallback when no session ID was captured, but explicit IDs are strictly better with many sessions per project — which is gmux's core use case (several named terminals in the *same* repo would all match "`--continue` in this cwd" and resume the wrong conversation). **Session-ID-based resume is mandatory for gmux's multi-terminal-per-project model; cwd-scoped resume is only a fallback.**
- If gmux uses tmux as its terminal persistence layer (research 01), tmux-resurrect can be adopted wholesale for tier-2 restore with custom strategy entries per agent — but given the project's dormancy and the manifest's superiority, prefer the native manifest and use resurrect only as a stopgap in early prototypes.

### 3. SpecStory and session recording — complementary, not a resume mechanism

[SpecStory CLI](https://specstory.com/specstory-cli) (`brew install specstory`; `specstory run claude|codex|cursor|gemini|droid`) wraps a terminal agent and auto-saves the conversation as markdown to `.specstory/history/` in the project; `specstory sync` exports all locally stored sessions for the current project across agents ([docs](https://docs.specstory.com/integrations/terminal-coding-agents)). Relevance to gmux:

- It does **not** resurrect sessions — the agents' native stores do that. Its markdown is human/LLM-readable, not replayable into an agent's native resume path.
- It *is* a useful **insurance layer**: agents' native stores are internal-format, retention-limited (Claude Code and Gemini CLI default to 30-day cleanup), and occasionally lossy across migrations (opencode's SQLite migration dropped legacy JSON sessions; Codex parser breaks on old rollouts). A markdown archive survives all of that, and a resurrected session that *can't* be natively resumed (expired, corrupted, migrated) can be re-seeded by pasting/`@`-referencing the markdown history as context.
- Because gmux owns the launch command, wrapping a launch as `specstory run claude -- <args>` (or offering it as a per-terminal toggle) is trivial if the user wants recording. gmux should not *depend* on it for P1.

---

## Bottom line for gmux

1. **Resurrection after reboot is a solved problem for every agent that matters, via transcript replay — gmux just has to be the bookkeeper.** Implement the **session manifest**: per named terminal, persist `{name, cwd, agent, full launch argv, env deltas, session/thread/chat ID, resume argv}`; update `lastAlive` via heartbeat; on post-reboot start, recreate each terminal and run (or pre-type) the recorded resume command.
2. **Capture IDs proactively, per-agent:** pre-assign for Claude Code (`--session-id <uuid>` — the strongest primitive in the field), pre-create for cursor-agent (`create-chat`) and Amp (`threads new`), and filesystem/DB-watch for Codex (`~/.codex/sessions`), Gemini (`~/.gemini/tmp/<hash>/chats`), and opencode (`opencode.db`). Fall back to cwd-scoped `--continue`/`resume --last` only when no ID was captured — it's ambiguous when multiple named terminals share one project directory, which is gmux's normal case.
3. **Always restore in the recorded cwd and re-pass recorded flags.** Multiple agents are cwd-sensitive (Codex `--last` scoping, Gemini project hash, opencode's `-s` cwd bug), and Claude Code documents that MCP/config flags are not restored by `--resume`.
4. **Default restore policy: pre-type, don't auto-run.** Match tmux-resurrect's conservatism — an auto-resumed agent immediately re-reading a 150k-token transcript across ten terminals has real cost and surprise factor. Make auto-resume an opt-in per terminal.
5. **Tiering:** treat reboot-resurrection (this doc) as the fallback beneath live-process reattachment (research 01). The manifest doubles as the crash-recovery record for the persistence daemon itself.
6. **Agent support priority given 2026 realities:** Claude Code and Codex CLI first (excellent primitives, dominant usage), cursor-agent and Amp next (good primitives), opencode next (MIT, huge momentum, server API for deep integration later), aider as a simple `--restore-chat-history` special case (maintenance mode), Gemini CLI as legacy with an eye on Antigravity CLI's undocumented session story.
7. **Don't build on tmux-resurrect** (dormant since Aug 2024, `ps`-based capture is lossy, per-cwd ambiguity) — but do steal its UX: whitelisted auto-restore, per-program strategies, and an explicit "restore everything" danger mode. Offer optional SpecStory wrapping as a durability/insurance layer, not as the resume mechanism.

## Open gaps

- **Claude Code `--session-id` edge cases:** behavior when the pre-assigned ID's session was `/clear`-ed or compacted mid-run, and whether relaunching with the *same* `--session-id` (instead of `--resume`) errors or forks — needs hands-on testing before relying on it.
- **Antigravity CLI** (Gemini CLI's closed-source successor): session persistence and resume commands are undocumented; no source to inspect. Needs empirical testing once installed.
- **opencode SQLite schema stability:** reading `opencode.db` directly is unversioned territory; the local server API may be the stable path but its session-listing endpoints weren't verified here.
- **Amp offline behavior:** manual documents no offline mode; whether `amp threads continue` works with cached thread data while ampcode.com is unreachable is unverified.
- **Codex rollout-format drift:** resuming very old sessions after CLI upgrades can fail on unknown event variants (#21761); gmux may want to record the codex version per session.
- **MCP server side effects:** all agents cold-restart MCP servers on resume; stateful MCP servers (e.g., a browser session) lose state invisibly — gmux can't fix this, only surface it.
- Exact 2026 feature deltas of `cursor-agent ls` output format (machine-readable?) and whether Claude Code's `-p --resume` respects `--session-id` re-assignment were not verified against a live install.
