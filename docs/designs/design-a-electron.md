# Design A — gmux on Electron: "VS Code's parts bin, rebuilt around a session daemon"

**Status:** candidate design (one of several)
**Date:** 2026-08-09
**Grounding:** research docs 01–10 in `docs/research/` (all facts verified against live sources on 2026-08-09); inline URLs cite primary sources.

---

## 1. One-paragraph pitch

Build gmux as a single-window Electron app whose terminals are thin clients of a tiny, separately-running **PTY-host daemon** (`gmux-ptyd`, Node, launchd-managed). The daemon owns every `node-pty` session keyed by a persistent user-visible name, keeps a DOM-less `@xterm/headless` buffer replica per session, and continuously persists a **session manifest** (name, project, cwd, exact launch argv, agent type, agent session ID). App quit/crash/upgrade never touches a running agent — the app reattaches and replays the buffer. Reboot restore is deterministic: the manifest replays layout and re-arms `claude --resume <uuid>` / `codex resume <id>` per named terminal. Everything else — the VS Code-grade git sidebar, the git-decorated file tree, the Monaco editor, project tabs — is commodity MIT web componentry that a solo dev's AI agents are maximally fluent in. This is exactly VS Code's proven terminal-persistence architecture ([docs](https://code.visualstudio.com/docs/terminal/advanced), [`ptyService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts), MIT) with its one known flaw fixed: the pty host is promoted from app child process to user daemon, so sessions survive app quits outright.

Why this is credible rather than hopeful: **wmux** (MIT, Electron + Node daemon owning PTYs over named-pipe RPC) already ships this exact P1 architecture — sessions survive app quits, crashes, *and* OS reboots with one-click agent resume ([repo](https://github.com/openwong2kim/wmux); research 04 §3.7). **cmux** proves the reboot-restore-via-agent-resume UX "feels like full persistence" in production ([cmux.com](https://cmux.com/)). And VS Code proves the renderer side (dozens of concurrent xterm.js terminals with flow control) at massive scale.

---

## 2. Start from scratch, or build on Wave / VS Code workbench / Nimbalyst?

Considered explicitly, per the brief:

| Base | License | Verdict |
|---|---|---|
| **From scratch, porting VS Code *pieces*** | MIT pieces | ✅ **Chosen.** Port `ptyService.ts` patterns, the `extensions/git` plumbing (`git.ts`, `GitStatusParser`, `parseGitCommits`, `decorationProvider.ts` — ~2–3k LOC, nearly dependency-free TS; research 06 §1.5), and the shell-integration (OSC 633/133) addon. You take the battle-tested 10%, not the 5M-LOC workbench. |
| **VS Code workbench / Code-OSS fork** | MIT | ❌ Rejected. The workbench tree/SCM widgets are not published standalone (research 07 §4); reusing `vscode.git` verbatim requires embedding an extension host (Theia-style), which fails P6 outright (research 06 §1.5). Forking Code-OSS means inheriting an IDE gmux explicitly is not. |
| **Wave Terminal fork** | Apache-2.0 | ❌ Rejected as base, kept as reference. Closest product shape, but its Durable Sessions are **SSH-only — "Local terminals … use standard sessions"** ([docs](https://docs.waveterm.dev/durable-sessions), [issue #747](https://github.com/wavetermdev/waveterm/issues/747)); you'd rewrite the one thing you came for, inside a large Go+Electron block-model codebase measured at **400–800 MB in day-to-day use** ([review](https://moltamp.com/blog/wave-terminal-review-2026/)) — the anti-pattern for P6. Its `wavesrv` detached-backend pattern is the architectural template we follow (research 08 §8). |
| **Nimbalyst strip-down** | MIT | ❌ Rejected. Strongest legal+feature Electron base on paper (Monaco, git ops, sessions; research 04 §6), but its center of gravity is kanban/worktree orchestration — P1 there is agent-resume only, no PTY daemon. Deleting a 5.5k-commit product's spine costs more than assembling ~6 mature components around our own daemon. |

The from-scratch surface is small because every hard part is a mature MIT component (§5): gmux-original code is roughly the daemon (~2–3k LOC), the manifest/restore engine, the git sidebar UI over ported parsers, and the tab/layout shell.

---

## 3. Architecture

```
┌─────────────────────────── macOS login session ────────────────────────────────┐
│                                                                                │
│  launchd (SMAppService.agent, RunAtLoad)                                       │
│      │ starts at login, keeps alive                                            │
│      ▼                                                                         │
│  ╔══════════════════ gmux-ptyd (Node daemon, ~2-3k LOC) ═════════════════════╗ │
│  ║  • node-pty session per NAMED terminal   (survives app quit/crash)        ║ │
│  ║  • @xterm/headless buffer replica per session (scrollback lives here)     ║ │
│  ║  • serialize-addon snapshots → disk (crash-safe scrollback)               ║ │
│  ║  • SESSION MANIFEST (SQLite): name, project, cwd, argv, env delta,        ║ │
│  ║    agent, agent_session_id, resume argv, layout, last_seen                ║ │
│  ║  • agent adapters: pre-assign claude --session-id; watch ~/.codex/        ║ │
│  ║    sessions for rollout UUID; SessionStart-hook listener                  ║ │
│  ║  • JSON-RPC + raw byte streams over unix socket                           ║ │
│  ║    ~/Library/Application Support/gmux/ptyd.sock                           ║ │
│  ╚═══════╤═══════════════════════════════════════════╤════════════════════════╝ │
│          │ attach/detach, bytes, flow-control acks   │ spawns                  │
│          ▼                                           ▼                         │
│  ┌── gmux.app (Electron 43, ONE BrowserWindow) ──┐  claude / codex / shells    │
│  │ main process (thin: window, updater, socket)  │  (children of daemon,      │
│  │   │ MessagePorts (PTY bytes bypass main)      │   NOT of gmux.app)         │
│  │   ▼                                           │                            │
│  │ renderer: ┌ project tabs (P5) ──────────────┐ │  ┌─ git repos ───────────┐ │
│  │           │ ┌─────────┬─────────┬─────────┐ │ │  │ spawn `git` CLI        │ │
│  │           │ │ SCM +   │ Monaco  │ terminal│ │ │◄─┤ status/log/add/commit  │ │
│  │           │ │ file    │ editor+ │ stack:  │ │ │  │ GIT_OPTIONAL_LOCKS=0   │ │
│  │           │ │ tree    │ diff    │ xterm.js│ │ │  │ @parcel/watcher +      │ │
│  │           │ │ (P2/P3) │ (P4)    │ 6+WebGL │ │ │  │ .git/HEAD watcher      │ │
│  │           │ └─────────┴─────────┴─────────┘ │ │  └────────────────────────┘ │
│  │           │  🔔 attention overlay (⌘J)      │ │                            │
│  │           └────────────────────────────────-┘ │                            │
│  └────────────────────────────────────────────---┘                            │
└────────────────────────────────────────────────────────────────────────────────┘
   App quits → daemon + agents keep running.  Reboot → manifest replay + --resume.
```

Key data paths:

- **PTY bytes:** agent → node-pty (daemon) → unix socket → Electron main → **MessagePort → renderer** (bytes never transit main-process JS logic; Electron's `utilityProcess`/MessagePorts pattern, [docs](https://www.electronjs.org/docs/latest/api/utility-process)). Watermark flow control end-to-end: renderer acks every ~100 KB; daemon pauses the PTY at ≥500 KB unacked (`pty.pause()`/`resume()`) — the documented xterm.js recipe ([flow-control guide](https://xtermjs.org/docs/guides/flowcontrol/)).
- **Attach:** renderer requests session → daemon replies with serialized buffer (ANSI-preserving, `@xterm/addon-serialize`) → replay into fresh xterm.js → live deltas follow. Exactly VS Code's reconnection flow (research 05 §2).
- **Git/state:** renderer-side services spawn `git` and watch the filesystem directly (no daemon involvement) — the repos are local and the app is present whenever the UI is.

---

## 4. The durability-layer decision: own PTY host vs tmux control mode vs zellij

This is the load-bearing choice; the brief demands it argued, not asserted.

| Criterion | **Own PTY host (chosen)** | tmux (bundled, control mode) | zellij |
|---|---|---|---|
| Survives app quit/crash (T1) | ✅ daemon process | ✅ server process | ✅ server process |
| Battle-tested-ness | ⚠️ VS Code pty-host pattern proven for a decade *as app child*; daemon promotion proven by wmux/Wave-remote, but *our* daemon is new code | ✅✅ 20 years; iTerm2 -CC for a decade | ⚠️ server solid; GUI-embedding path unproven (cmux attempting, [#1663](https://github.com/manaflow-ai/cmux/issues/1663)) |
| External GUI integration API | ✅ we define it (typed JSON-RPC, same language as app) | ⚠️ control mode: real but gnarly — octal-escaped `%output`, unversioned protocol, ~2–4 wk client library (research 01 §3.2); or hybrid `tmux attach`-in-a-PTY | ❌ none — no control mode, open request [#3965](https://github.com/zellij-org/zellij/issues/3965) |
| Scrollback queryable/replayable | ✅ `@xterm/headless` + serialize addon, ANSI-perfect, MIT, exists today | ✅ `capture-pane -e -J -S -` | ⚠️ opt-in serialization to disk |
| Rendering fidelity | ✅ agent talks straight to xterm.js — no terminal-in-the-middle | ⚠️ tmux re-parses and re-emits; unsupported sequences dropped; no kitty keyboard protocol (research 01 §3.2 pain #3) | ⚠️ same class of issue, fewer introspection tools |
| Reboot restore | Manifest replay (ours either way) | Manifest replay (tmux-resurrect dormant since 2024 and can't know session UUIDs — research 09 §B.1) | Built-in serialization restores a *shell*, not the agent conversation ([docs](https://zellij.dev/documentation/session-resurrection.html); reliability caveats [#4129](https://github.com/zellij-org/zellij/issues/4129)) |
| Stack coherence (Electron) | ✅ one language, one process model, agents strongest in TS | ⚠️ adds a C daemon + protocol client; scrollback lives outside xterm.js | ⚠️ adds Rust daemon driven blind via CLI |
| License | MIT throughout | ISC (bundle-friendly) | MIT |

**Choice: own PTY host.** Rationale, in order of weight:

1. **The hard machinery already exists as MIT code in this exact stack.** VS Code's pty host ships the four pieces durability needs — daemon-owned PTYs, headless buffer replicas, serialize/replay on attach, revive-state-on-disk (`reviveTerminalProcesses`) — as documented, working TypeScript ([Terminal Advanced](https://code.visualstudio.com/docs/terminal/advanced), [`ptyService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts)). Research 05's cross-cutting verdict: *"xterm.js/VS Code is the only stack where all four pieces already exist under MIT."* Choosing tmux here means writing a control-mode client (weeks; iTerm2 is the only production-grade consumer ever) to end up with *less* (scrollback trapped in tmux's grid, re-emitted escape sequences) in exchange for durability we can get from a 2–3k-LOC daemon.
2. **Reboot survival — the "ideal" half of P1 — is manifest work regardless of layer.** No mux survives reboot (research 01 §1: T3 is *never* process survival). tmux-resurrect is dormant (last push 2024-08) and structurally cannot express "resume the specific conversation that was in this pane" (research 09 §B.1); zellij's serializer ps-sniffs and restores `claude`, never `claude --resume <the-right-uuid>` (research 09 §B.3). Since gmux is the launcher, the manifest beats all of them — and it's identical work under any durability layer. So the mux's one unique gift shrinks to T1, where a daemon is equivalent.
3. **Rendering fidelity and future-proofing.** With the daemon, agent TUIs talk directly to xterm.js — no tmux-in-the-middle dropping sequences it doesn't model, no `allow-passthrough` config, kitty-protocol keys work if xterm.js supports them. cmux picked zellij partly *because* tmux lacks the kitty keyboard protocol ([cmux #1663](https://github.com/manaflow-ai/cmux/issues/1663)); we sidestep the whole issue.
4. **Solo-dev/agent velocity.** One TypeScript codebase end-to-end is the single biggest multiplier for a developer whose team is Claude Code/Codex (research 08 §7). A bundled tmux adds a second runtime, a protocol client, version pinning, and a class of integration tests in exchange for solving a problem the daemon already solves.

**What we give up and how we compensate:** tmux's 20-year server is more crash-proof than a new Node daemon. Mitigations: (a) the daemon is deliberately tiny and dependency-light (node-pty, @xterm/headless, better-sqlite3 — no framework); (b) the manifest + periodic buffer snapshots make daemon death a T2 event with a defined recovery path (§6.3), exactly the insurance research 01 §3.4 prescribes even for tmux ("server crash = all sessions die… persist restore metadata continuously"); (c) the app↔daemon session API is deliberately narrow (create/attach/detach/rename/kill/list/snapshot), so **if the daemon disappoints, a bundled pinned tmux (`-L gmux`, ISC, research 01's recommendation) can be slotted in behind the same API as a fallback implementation** — the UI, manifest, and resume engine don't change. That contingency is priced into risk #1 (§11).

**zellij is rejected outright** for this design: no control mode means an Electron GUI drives it blind (research 01 §4 calls this "the disqualifier"), and its own resurrection still can't restore agent conversations.

---

## 5. Bill of materials — exact OSS components and licenses

All verified current as of 2026-08-09 (research docs 05–08; registry/repo checks therein).

| Component | Role | License | Version / activity (verified) |
|---|---|---|---|
| [Electron](https://releases.electronjs.org/) | app shell | MIT | 43.3.0 (2026-08-04), Chromium 150, Node 24; 8-week cadence |
| [xterm.js (`@xterm/xterm`)](https://github.com/xtermjs/xterm.js) | terminal widget | MIT | 6.0.0 (2025-12-22); 6.1 betas daily — beta.300 on 2026-08-09 |
| `@xterm/addon-webgl` | GPU renderer (visible terminals only) | MIT | 0.19.0 (~Apr 2026); ships in VS Code |
| `@xterm/headless` + `@xterm/addon-serialize` | daemon-side buffer replica + ANSI-preserving snapshots | MIT | released in lockstep with xterm.js |
| [node-pty](https://github.com/microsoft/node-pty) | PTY spawning (daemon) | MIT | 1.1.0 (2025-12-22); 1.2.0-beta.15 (2026-08-03); Microsoft-maintained |
| VS Code `extensions/git` parsers (ported) | git plumbing spec + code (`git.ts`, `GitStatusParser`, `parseGitCommits`, `decorationProvider.ts`) | MIT | continuously maintained in [microsoft/vscode](https://github.com/microsoft/vscode/tree/main/extensions/git) |
| VS Code `ShellIntegrationAddon` (ported/lifted) | OSC 633/133 prompt marks → run/idle detection | MIT | in-tree, current |
| [@parcel/watcher](https://www.npmjs.com/package/@parcel/watcher) | FSEvents recursive watching (what VS Code uses) | MIT | 2.6.0 (2026-07-20) |
| [Monaco editor](https://github.com/microsoft/monaco-editor) | editor + best-in-class diff view (P4) | MIT | 0.56.0 (2026-07-20) |
| [react-arborist](https://github.com/jameskerr/react-arborist) | virtualized file tree (P3) | MIT | pushed 2026-07-25 |
| React + Vite + electron-builder/updater | UI + packaging + Sparkle-free auto-update via GitHub Releases | MIT | current; [electron-builder mac docs](https://www.electron.build/docs/mac/) |
| better-sqlite3 (or JSON files) | session manifest store | MIT | current |
| [lazygit](https://github.com/jesseduffield/lazygit) | optional embedded git power pane (user-installed or bundled) | MIT | v0.64.0 (2026-08-04) |
| System `git` CLI | all git operations | GPL-2.0 — **invoked as a subprocess, never linked**; no license coupling | ships with Xcode CLT; fsmonitor built-in ≥2.37 |

Deliberately avoided: nodegit (stuck pre-release since 2020 — research 06), tmux-resurrect/continuum (dormant since 2024), Wave fork (Apache-2.0 but wrong center of mass), Superset (ELv2, not OSS), claude-squad / coder-mux (AGPL-3.0), GitButler crates (FSL-1.1, non-OSS for 2 years). SpecStory CLI wrapping offered as an optional per-terminal transcript-insurance toggle, never a dependency (research 02 §3).

---

## 6. P1 — durable named sessions, the full lifecycle (the killer feature, end-to-end)

Session identity: the **user-visible name is the primary key** (renameable; uniqueness by `-2` suffix, never rejection — research 10 §4). A session row exists in the manifest from the moment of creation to explicit deletion, across any number of process generations.

### 6.0 Create
`⌘T → "auth-refactor", project webapp, agent Claude Code`:
1. App asks daemon: `create({name, cwd, agent:"claude-code"})`.
2. Daemon generates UUID, writes manifest row `{name, project, cwd, argv:["claude","--session-id","<uuid>"], agent_session_id:<uuid>, resumeArgv:["claude","--resume","<uuid>", ...original flags], status:"running"}` — **before** spawn. Claude Code's `--session-id` pre-assignment makes resume deterministic with zero parsing ([CLI reference](https://code.claude.com/docs/en/cli-reference); research 02 calls it "the strongest primitive in the field"). Full original argv is recorded because `--resume` does **not** restore `--mcp-config`/`--add-dir`/`--settings` — those flags must be re-passed (research 02, documented behavior).
3. Per-agent ID capture where pre-assignment doesn't exist: **Codex** — FSEvents watch on `~/.codex/sessions/YYYY/MM/DD/` for the rollout file created after spawn (filename embeds the UUID: `rollout-YYYY-MM-DDThh-mm-ss-<uuid>.jsonl[.zst]` — files may be zstd-compressed and later moved to the sibling `archived_sessions` subdir, so match both extensions and tolerate the move; [codex-rs `rollout/src/list.rs`](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/list.rs)); **cursor-agent** — `create-chat` pre-provisioning; **Amp** — `amp threads new`; **opencode** — newest row in `opencode.db`; plain shells — argv+cwd only (research 02 matrix). A Claude Code `SessionStart` hook POSTing `{session_id, transcript_path}` to the daemon's socket is the belt-and-braces channel for sessions gmux didn't launch.
4. node-pty spawns the agent **as a child of the daemon** (critical: not of gmux.app); `@xterm/headless` replica starts consuming.

### 6.1 App quits, crashes, or updates (T1) — zero loss, by construction
Agent process, PTY, and full scrollback live in the daemon; nothing observable happens to them. On relaunch: app connects to `ptyd.sock` → `list()` → reconciles with manifest → for each visible terminal, serialize-addon snapshot replays instantly, live `%`-free byte stream resumes. Names, layout, scrollback, running processes: all intact. VS Code needed a 60-second reconnection grace window; our daemon's is infinite (research 09 Part D). *UX label: "your sessions were never interrupted."*

### 6.2 Reboot (T3) — restore + deterministic agent resume
Processes cannot survive reboot (research 01 §1); every agent that matters persists its transcript continuously and resumes by replaying it (research 02). The flow:
1. **At login:** `SMAppService.agent(plistName:)`-registered launchd job starts `gmux-ptyd` (RunAtLoad, KeepAlive). Registered from inside gmux.app so it's user-visible in System Settings → Login Items and TCC attribution stays with the app bundle (research 09 §C.1).
2. Daemon loads manifest, finds rows `status=running` with no live process → marks `awaiting-restore`.
3. For each: recreate the named session at recorded `cwd`; paint saved scrollback snapshot as inert history above a fresh prompt (marked "History restored", VS Code-style); **arm** the recorded resume command — `claude --resume <uuid>`, `codex resume <id>` (or cwd-scoped `codex resume --last` fallback when no ID was captured), `cursor-agent --resume=<chat-id>`, `amp threads continue <id>`, `aider --restore-chat-history`, per the research-02 matrix.
4. **Default policy: armed, not auto-run** — the command is pre-typed; one Enter (or the "Resume all" button) executes. Ten agents silently re-reading 150k-token transcripts is real money and surprise; auto-resume is per-session opt-in. This mirrors zellij's ENTER-to-run guard and tmux-resurrect's allowlist conservatism (research 09 §B.4).
5. Always restore in the recorded cwd with recorded flags — Codex `--last` is cwd-scoped, Gemini hashes the project path, opencode has a cwd bug ([#28581](https://github.com/anomalyco/opencode/issues/28581)) (research 02 §bottom line 3).

What's honestly lost at reboot and labeled as such in UX: interactive shell env (exports, venvs), background processes the agent spawned, in-flight tool calls (transcript survives; side effects are the user's to reconcile). Same line VS Code draws; users accept it when labeled (research 09 §E).

### 6.3 Daemon dies (T2 — rare) 
Manifest + last buffer snapshots are on disk (snapshots on a timer + on every detach + on daemon SIGTERM). launchd KeepAlive restarts the daemon; recovery = the reboot path minus login. This is the same insurance tmux would need anyway (its server crash also kills everything — research 01 §3.4).

### 6.4 Sleep/wake, logout
Sleep: non-event; processes and PTYs survive; tolerate an output burst on wake. Logout-without-reboot: treated as reboot (LaunchAgents stop at logout on macOS; no `loginctl enable-linger` equivalent — research 01 §1); documented, not engineered around.

### 6.5 Acceptance tests (from research 09 — P1 is only real if these pass)
1. `kill -9` gmux.app mid-agent-run → relaunch → same agent PID, full scrollback, name intact.
2. Quit gmux 30 min while agent works → relaunch shows everything produced while detached.
3. Reboot mid-conversation → session exists in right cwd, prior scrollback visible, `claude --resume <uuid>` armed; running it shows full conversation.
4. Reboot with 12 sessions across 3 projects → all restored under correct tabs, correct resume IDs, < 5 s.
5. TCC: restored agent can read `~/Documents` after one-time FDA grant to gmux.app.
6. Daemon killed → app detects, offers manifest restore.

---

## 7. P2 — Git GUI (VS Code SCM-grade)

The decisive research-06 finding: VS Code's git UX **is** a spawner of the system `git` CLI plus parsers — no libgit2. We port that MIT plumbing directly (same language!):

- **Data:** `git status --porcelain=v2 --branch -z` (one call: branch, upstream, ahead/behind, all file states), `git log --format=%H%x00…-z` for history (full SHA is field one → copy-SHA is a clipboard write), `git for-each-ref` for branches. All background reads run with `GIT_OPTIONAL_LOCKS=0` so gmux never contends with an agent's git commands in the same worktree — a correctness feature unique to CLI-shelling (research 06 §2 conclusion).
- **UI:** exactly VS Code's four resource groups — Merge / Staged / Changes / Untracked — with stage/unstage/discard, commit box (`git commit -F` inherits the user's hooks and signing, which libgit2 would not), branch + ahead/behind always visible in the tab's sidebar header, history list with one-click copy-SHA.
- **Refresh:** VS Code's exact recipe — @parcel/watcher on the worktree (excluding `.git/`) + a dotgit watcher (`.git/HEAD` → instant branch updates; ignore `index.lock`), throttled status, ~500 ms debounced decoration repaint, `statusLimit`-style huge-repo guard (research 06 §1.2).
- **Speed under agent churn:** one-click "enable fast status" runs `git config core.fsmonitor true` (git ≥2.37 built-in FSEvents daemon; 3.2 s → 0.15 s on a 50k-file repo, [GitHub eng blog](https://github.blog/engineering/infrastructure/improve-git-monorepo-performance-with-a-file-system-monitor/)).
- **Escape hatch:** optional dedicated pane running **lazygit** (MIT) — because gmux's core primitive is durable terminal panes, embedding it costs ~zero code and instantly exceeds VS Code's SCM depth (line staging, interactive rebase, bisect). Command configurable (lazygit/gitu/gitui, all MIT).

## 8. P3 — File explorer with git decorations

react-arborist virtualized tree (fine at 100k files) fed by the same porcelain-v2 status map: path → badge/color (M amber, A/U green, D strikethrough) with parent-folder propagation — a direct port of VS Code's `decorationProvider.ts` model (research 06 §1.3). FSEvents-driven refresh shares the P2 watcher. Click → opens in the editor (P4); files an agent just touched are visible at a glance, which is the actual job.

## 9. P4 — Click-to-view/edit

Monaco 0.56 — the literal VS Code editor, at home in Electron (its native habitat; the WKWebView worker pains of the Tauri path don't exist here — research 07 §1.1). The dominant gesture is "see what the agent changed": Monaco's built-in diff editor (side-by-side + inline, intra-line highlighting) is the single biggest free win of the web stack — research 07's dimension verdict: *only the web stack ships the diff view*. Default click-action on a modified file = diff against HEAD (`git diff` → diff editor); Enter/edit toggles to the plain editor. Full VS Code keybindings = zero muscle-memory tax for a Cursor refugee. Bundle only needed languages; lazy-load Monaco on first file open (it's ~5 MB gz + workers — noise inside Electron, but no reason to pay it at startup).

## 10. P5 — Multi-project tabs in one window

Research 10's Layout C, verbatim:
- **One `BrowserWindow`, project tabs in DOM.** One tab = one repo checkout (worktree-aware, not worktree-required). Each tab scopes *everything* — terminal stack, SCM sidebar, file tree, editor — which is precisely what VS Code multi-root refuses to do and users beg for ([vscode#322745](https://github.com/microsoft/vscode/issues/322745), filed June 2026, closed as duplicate).
- Tab chrome: project name (+ color), current branch, dirty-count roll-up, agent-status dot (🟡 needs-input count > 🔵 working > ⚪ idle). Idempotent open (Zed's behavior): opening an already-open project focuses its tab.
- **Attention overlay (⌘J) + Dock badge:** global list of NEEDS_INPUT sessions across all projects, Enter jumps to tab + session. Status via the layered detector of research 10 §6: Claude Code `Notification`/`Stop` hooks and Codex `notify` (auto-injected configs) > terminal BEL/OSC 9 > OSC 133 prompt marks (ported VS Code addon) > content-hash silence heuristic — so any agent works day one, first-class agents get deterministic state.
- Since the window is DOM, tab drag-reorder, split-terminal stacks, and per-project layout persistence are ordinary React work.

## 11. P6 — "Lightweight": the objection, with numbers, faced head-on

**The honest numbers (research 08 §2):**
- Electron single-window baseline: **~250–400 MB** RSS with panels loaded. Identical-app benchmark: Tauri ~172 MB vs Electron ~409 MB at 6 windows ([Hopp benchmark](https://www.gethopp.app/blog/tauri-vs-electron)); idle singles ~30–40 MB (Tauri) vs ~200–300 MB (Electron).
- Cautionary tale: Wave (Electron, undisciplined) runs 400–800 MB. Native ceiling: Ghostty idles at 24–45 MB. Electron will never match that; this design doesn't pretend it will.
- Bundle: ~120–160 MB installed (Chromium tax) vs ~10 MB for Tauri.

**Why the number is acceptable *for this user*:** the baseline being replaced is **multiple full Cursor windows** — each an entire Electron app with an extension host, language servers, and indexers. One gmux window at ≤400 MB replacing 4–6 Cursor windows is a large net RAM *reduction* plus the cmd+` juggling gone (research 08 §2's mitigating fact). P6 says lightweight; for a working tool, the meaningful metrics are startup time, input latency, and marginal cost per session — addressed below.

**Engineering budget and mitigations (design commitments, not hopes):**
1. **One BrowserWindow forever.** Chromium's per-window renderer-process cost is the thing that blows Electron apps up; project tabs are DOM (P5), so the tax is paid exactly once.
2. **Terminal discipline:** WebGL renderer instances only for *visible* terminals (WebGL context caps at ~8–16 anyway); backgrounded terminals hold no renderer; renderer-side scrollback capped (~5–10k lines) because the daemon's headless replica holds the full history and can page it in (VS Code's exact pattern, research 05 §1).
3. **The daemon stays skinny:** ~40–60 MB for Node + N headless buffers; no Chromium. Marginal cost per additional named session ≈ a PTY + a headless buffer (a few MB), not a window.
4. **Lazy everything:** Monaco loads on first file-open; git history pane on first expand; single React bundle, no extension host, no plugin system in v1.
5. **Hard performance gates in CI:** cold start < 1.5 s to interactive; RSS < 400 MB with 10 live sessions across 3 projects; input latency in terminals indistinguishable from iTerm2 at 60fps. Regressions block release — this is how the design avoids Wave's fate (Hyper and Tabby died of neglect and bloat, not of Electron — research 08 §8).
6. **Flow control everywhere** (§3) so an agent dumping a 50 MB diff can't balloon renderer memory — xterm.js hard-caps its input buffer at 50 MB and the watermark protocol keeps us far below it.

**Native/Tauri counterfactual, stated fairly:** Tauri would save ~150–250 MB RSS but costs a two-language codebase, a hand-rolled localhost WebSocket PTY transport (Tauri IPC measurably can't carry PTY firehoses — [#7146](https://github.com/orgs/tauri-apps/discussions/5690), [#13405](https://github.com/tauri-apps/tauri/issues/13405)), and WKWebView's pre-Tahoe 60 fps rAF cap + dead-key bug ([xterm.js#5894](https://github.com/xtermjs/xterm.js/issues/5894)). Native Swift wins footprint decisively but has no reusable SCM/tree/diff components, agents are demonstrably weakest at Swift, and CodeEdit — a whole community on the same scope — is still pre-1.0 after 4+ years (research 08 §10 decision matrix: Electron 54/60, Tauri 49, native 43). Those are other candidate designs' briefs; this design's position is that the ~200 MB delta buys the only stack where P1's machinery, P2's plumbing, and P4's diff editor all pre-exist as maintained MIT code in one language.

---

## 12. MVP vs full scope

### MVP (the "I can move off Cursor" cut)
- `gmux-ptyd` daemon: named sessions, create/attach/detach/rename/kill, headless replicas, serialize snapshots, manifest (SQLite), launchd registration via SMAppService.
- **T1 complete:** app quit/crash/update never kills a session; instant buffer replay on reattach.
- **T3 for Claude Code + Codex:** manifest replay, armed resume (`--session-id` pre-assignment; Codex rollout watch). Other agents restore as shell-in-cwd.
- Single window; project tabs; terminal stack per tab with per-session status dots (heuristic detector: OSC 133 + silence hash + BEL).
- Git sidebar: branch header, four groups, stage/unstage/commit, history-with-copy-SHA (flat list).
- File tree with decorations; Monaco view/edit + diff-on-click.
- Signed, notarized, auto-updating build (electron-builder + GitHub Releases); first-run TCC/FDA self-test.

### Full bar (everything the brief demands, polished)
- All research-02 agent adapters (cursor-agent, Amp, opencode, aider, Gemini-legacy) + `SessionStart`-hook listener + per-session restore policies (auto / armed / shell-only) + "Resume all".
- Attention overlay (⌘J), Dock badge, hook-injected deterministic status for Claude/Codex.
- Ahead/behind + push/pull/branch-switch UI; commit detail view; optional lazygit pane; fsmonitor one-click.
- Worktree-aware session creation ("new session in worktree…"); per-project declarative layout manifests (tmuxinator's lesson).
- Scrollback search, split panes within a tab, keyboard-first command palette, per-project accent colors/F2 rename (Wave's stealable UX).
- Performance-gate CI; crash-safe snapshot cadence tuning; daemon self-update handshake (drain + handoff on app update).

**Deferred beyond full scope:** remote/SSH sessions, plugin system, mandatory-worktree orchestration flows (Conductor's territory), team features.

## 13. Effort estimate (strong solo dev + AI agents, TS-fluent)

| Phase | Work | Estimate |
|---|---|---|
| 1 | Daemon + manifest + attach/replay + flow control (port of VS Code patterns) | 1.5–2 wk |
| 2 | Shell UI: window, project tabs, terminal stack, xterm.js wiring | 1 wk |
| 3 | Git sidebar + tree + decorations (port `extensions/git` parsers) | 1–1.5 wk |
| 4 | Monaco + diff-on-click; reboot restore for Claude/Codex; packaging/signing/TCC | 1–1.5 wk |
| **MVP total** | | **4.5–6 wk** |
| 5–8 | Remaining agent adapters, attention overlay + hooks, git depth, worktrees, polish, perf gates, acceptance-test hardening across macOS updates | +5–7 wk |
| **Full bar** | | **10–13 wk** |

Basis: every subsystem is either a port of documented MIT prior art (daemon ≈ `ptyService.ts`; git ≈ `extensions/git`; status ≈ published recipes) or commodity UI in the stack agents are strongest at (research 08 §7). The estimate assumes ~30% overhead for the macOS-specific tail (TCC, notarization, launchd edge cases) that agents can't fully automate.

## 14. Top 5 risks and mitigations

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| 1 | **Home-grown daemon is less battle-tested than tmux** — a daemon crash kills all sessions (T2) | Med / High | Keep it tiny and dependency-light; launchd KeepAlive; continuous manifest + snapshot-on-timer/detach/SIGTERM so T2 degrades to the reboot path, never data-void; ship research-09's acceptance tests as CI; **contingency: the narrow session API allows swapping a bundled pinned tmux (`-L gmux`, ISC) behind it without UI changes** |
| 2 | **macOS TCC breaks agents in daemon-spawned sessions** — `ls ~/Documents` → "Operation not permitted"; shipping *today* in a competitor ([cmux#2866](https://github.com/manaflow-ai/cmux/issues/2866)) | High / Med | Register the daemon via SMAppService from gmux.app so TCC attributes to the app bundle; one-time FDA grant with first-run explainer + self-test that stats `~/Documents` from inside a session; regression-test each macOS major (attribution semantics have changed repeatedly — research 09 §C.2) |
| 3 | **Agent resume breaks or drifts** — Claude `--session-id` reuse edge cases (open gap, research 02), Codex rollout-format drift ([#21761](https://github.com/openai/codex/issues/21761)), flags not restored by `--resume` | Med / Med | Record full original argv + agent version per session; armed-not-auto default so a failed resume is a visible pre-typed command, not silent loss; cwd-scoped `--continue`/`resume --last` fallback; per-agent adapter tests against pinned CLI versions; optional SpecStory markdown insurance layer |
| 4 | **P6 failure by a thousand cuts** — gmux drifts into Wave's 400–800 MB | Med / High (it's the thesis) | Hard CI gates (< 400 MB @ 10 sessions, < 1.5 s cold start); one-window architecture makes the worst case structural, not behavioral; WebGL-only-visible + capped renderer scrollback + lazy Monaco; profile in every release |
| 5 | **PTY firehose overwhelms the pipeline** — agents in "dump the whole diff" mode; xterm.js absorbs only 5–35 MB/s | Med / Med | The documented watermark flow-control recipe end-to-end (daemon `pty.pause()` at 500 KB unacked, ~100 KB acks — [xterm.js guide](https://xtermjs.org/docs/guides/flowcontrol/)); MessagePorts bypass the main process; daemon replica keeps full history so the renderer can drop and re-request; VS Code proves this exact pipeline at scale |

Watchlist (not top-5): Electron's 8-week major cadence + node-pty ABI rebuilds (routine with electron-builder; prebuilt fallbacks exist); xterm.js 6.1 beta churn (pin stable); Zed shipping its pty-host RFC ([#50584](https://github.com/zed-industries/zed/discussions/50584) — still no maintainer response as of Aug 2026) which would create the closest competitor.

---

## 15. Why this design wins (and what would falsify it)

**Wins because:** every property lands on maintained, MIT, in-training-data components — P1 is VS Code's persistence architecture with the pty host promoted to a daemon (wmux proves it; cmux proves the resume UX); P2/P3 are ports of VS Code's own MIT git plumbing; P4 is Monaco in its native habitat; P5 is DOM; and the whole thing is one TypeScript codebase, which for a solo dev working through coding agents is the highest-velocity path available in 2026 (research 08 decision matrix: 54/60, first).

**Falsified if:** (a) the 250–400 MB baseline is genuinely unacceptable to the user despite replacing multiple Cursor windows — then Design B/C territory (Tauri or native + SwiftTerm/libghostty); (b) prototype week 1 shows daemon-owned node-pty + replay failing the §6.5 acceptance tests in some macOS-specific way tmux doesn't — then trigger the tmux contingency in risk #1 before building upward.

## Sources

Primary grounding: `docs/research/01`–`10` (all facts re-verified 2026-08-09). Key primary URLs: [VS Code terminal persistence](https://code.visualstudio.com/docs/terminal/advanced) · [`ptyService.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts) · [xterm.js flow control](https://xtermjs.org/docs/guides/flowcontrol/) · [xterm.js releases](https://github.com/xtermjs/xterm.js/releases) · [node-pty](https://github.com/microsoft/node-pty) · [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) · [Claude Code sessions](https://code.claude.com/docs/en/sessions) · [Codex CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) (formerly developers.openai.com/codex/cli/reference, which now 308-redirects there; content re-verified 2026-08-09) · [wmux](https://github.com/openwong2kim/wmux) · [cmux](https://cmux.com/) · [Wave durable sessions (SSH-only)](https://docs.waveterm.dev/durable-sessions) · [Hopp Electron/Tauri benchmark](https://www.gethopp.app/blog/tauri-vs-electron) · [VS Code `extensions/git`](https://github.com/microsoft/vscode/tree/main/extensions/git) · [git fsmonitor](https://github.blog/engineering/infrastructure/improve-git-monorepo-performance-with-a-file-system-monitor/) · [Monaco](https://github.com/microsoft/monaco-editor) · [react-arborist](https://github.com/jameskerr/react-arborist) · [lazygit](https://github.com/jesseduffield/lazygit) · [zellij control-mode gap #3965](https://github.com/zellij-org/zellij/issues/3965) · [tmux Control Mode wiki](https://github.com/tmux/tmux/wiki/Control-Mode) · [cmux TCC issue #2866](https://github.com/manaflow-ai/cmux/issues/2866) · [vscode project-tabs demand #322745](https://github.com/microsoft/vscode/issues/322745) · [Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process) · [electron-builder mac](https://www.electron.build/docs/mac/).
