# gmux pre-build architecture assessment

**Date:** 2026-08-09
**Status:** Historical decision record. It synthesizes `docs/research/01–10` and `docs/designs/design-{a,b,c,d}` from before implementation. Use the [current architecture follow-up](2026-08-16-electron-typescript-architecture.md) for the as-built source map and current recommendations.

---

## 1. Executive summary

**Build gmux as a single-window Electron app on top of a bundled, pinned tmux server.** The verdict on the shell, stated plainly: **Electron wins, Tauri is the runner-up, native Swift is deferred to a possible "gmux 2.0"** once libghostty's Swift terminal framework ships (research 08 decision matrix: Electron 54/60, Tauri 49, native 43; agents — your actual dev team — are strongest in TypeScript and demonstrably weakest in Swift).

The killer feature (P1) is delivered by two battle-proven mechanisms, neither invented here:

1. **App-restart survival:** every named terminal is a named session on a private tmux 3.7b server (ISC, bundled inside gmux.app, socket in `~/Library/Application Support/gmux/`). Quit, crash, or update gmux and every agent keeps running with full scrollback — the architecture iTerm2 has run in production for a decade (research 01).
2. **Reboot survival:** a gmux-owned **session manifest** records `{name, project, cwd, argv, agent, agent_session_id}` at spawn — pre-assigning Claude Code's UUID via `claude --session-id` — and replays `claude --resume <uuid>` / `codex resume <id>` at login. This restores the *specific conversation*, which tmux-resurrect and zellij structurally cannot do (research 02, 09).

Everything else — VS Code-grade git sidebar, git-decorated file tree, Monaco editor with its diff view, project tabs — is mature MIT web componentry (research 05–07, 10). No shipping product combines these properties; the bar is unclaimed (research 03, 04). Schedule: **a dogfoodable, signed alpha in one ultracode day** — ~14–18 h wall clock, a fleet of parallel Claude Code agents building against frozen interface contracts, conditional on §5's Phase-0 gates passing; full bar: **+~40–60 agent-hours across subsequent fleet days**, with the calendar-bound residue (7-day socket soak, dogfood stability, cert/notarization latency) named in §5's ledger, not denied.

---

## 2. The recommendation in depth

### 2.1 What this is, relative to the four candidate designs

The recommendation is **Design A's shell with Design C/D's durability layer**: a greenfield single-window Electron app (Design A) whose session daemon is not a home-grown Node PTY host but the bundled pinned tmux server that Designs B, C, and D — and both dedicated durability deep-dives (research 01, 09) — all converged on. Design A itself concedes this swap is possible behind its narrow session API (Design A §4, risk #1); this report makes it the primary plan rather than the contingency, because P1 is the one feature that must not be flaky, and tmux's 20-year server beats any new ~3k-LOC daemon on exactly that axis. Design A's genuine advantages (no terminal-in-the-middle, one language) are retained as the documented fallback if the Phase-0 fidelity spike fails (§5).

Why tmux over the bespoke daemon, decisively:

- **The durability research says so, twice.** Research 01's bottom line: *"tmux is the only layer that is simultaneously alive (3.7b, July 2026), liberally licensed, battle-tested as a GUI backend (iTerm2), scriptable enough for a product, and honest about reboots."* Research 09 built the entire reboot-survival recipe on it.
- **Zero-loss T1 by construction, not by new code.** A gmux-ptyd crash (Design A's T2) kills every live agent and loses scrollback since the last snapshot. A tmux server crash is the same event — but tmux's crash rate is two decades of hardening lower, and gmux writes no durability-critical code at all.
- **Backpressure has the right failure mode.** A slow renderer stalls only the `tmux attach` client; the tmux server keeps absorbing agent output into server-side history regardless (Design C §5). With raw daemon-owned PTYs, backpressure eventually reaches the agent itself or memory grows.
- **The fidelity risk is small and testable.** tmux is a terminal-in-the-middle (no kitty keyboard protocol beyond CSI-u extended-keys; exotic passthrough needs `allow-passthrough`), but "millions of agent-hours run inside tmux today" — claude-squad, agent-deck, and the whole tmux-MCP ecosystem run agents under it at scale (research 01 §3.2, §11). Phase 0 verifies it hands-on before anything is built on top.

### 2.2 Chosen stack and OSS bill of materials

All versions/licenses verified 2026-08-09 (research 05–08; design docs).

| Component | Role | License | State |
|---|---|---|---|
| [Electron 43.x](https://releases.electronjs.org/) | App shell, one `BrowserWindow` | MIT | 43.3.0 (2026-08-04), 8-week cadence |
| [tmux 3.7b](https://github.com/tmux/tmux/releases) — **bundled, pinned, private socket** | Durability daemon: owns every PTY, named sessions, server-side scrollback, control-mode event bus | **ISC** (bundle-friendly) | Released 2026-07-01; commits within days; iTerm2-proven GUI backend 10+ yrs |
| [xterm.js 6](https://github.com/xtermjs/xterm.js) + `@xterm/addon-webgl` | Terminal rendering (visible panes only) | MIT | 6.0.0 (2025-12-22); daily beta train |
| [node-pty 1.1](https://github.com/microsoft/node-pty) | PTYs hosting `tmux attach` clients (in an Electron `utilityProcess` attach-host) | MIT | 1.1.0 (2025-12-22), Microsoft-maintained |
| VS Code `extensions/git` parsers (ported) | Git plumbing: `status --porcelain=v2 -z`, log/refs parsers, decoration model | MIT | Continuously maintained in [microsoft/vscode](https://github.com/microsoft/vscode/tree/main/extensions/git) |
| System `git` CLI (spawned) | All git operations; inherits hooks/signing/credentials/fsmonitor | GPL-2.0 — **invoked across a process boundary, never linked; no copyleft coupling** | Ships with Xcode CLT |
| [@parcel/watcher](https://www.npmjs.com/package/@parcel/watcher) | FSEvents watching (VS Code's own watcher) | MIT | 2.6.0 (2026-07-20) |
| [Monaco 0.56](https://github.com/microsoft/monaco-editor) | Editor + best-in-class diff view (P4), lazy-loaded | MIT | 0.56.0 (2026-07-20) |
| [react-arborist](https://github.com/jameskerr/react-arborist) | Virtualized file tree (P3) | MIT | Pushed 2026-07-25 |
| better-sqlite3 | Session manifest store | MIT | Current |
| [lazygit](https://github.com/jesseduffield/lazygit) (optional pane) | Git power escape hatch (line staging, interactive rebase, bisect) | MIT | v0.64.0 (2026-08-04) |
| electron-builder / electron-updater | Signing, notarization, GitHub-Releases auto-update | MIT | Current |

**Deliberately excluded, with license reasons:** cmux (GPL-3.0 — imitate its restore UX, never copy), iTerm2 (GPL-2.0 — architecture reference only), claude-squad and coder/mux (AGPL-3.0), Superset (Elastic License 2.0 — source-available, not OSS), GitButler (FSL-1.1-MIT — Fair Source, "Competing Use" clause; each release converts to MIT only after 2 years), Warp core (AGPL-3.0), STTextView (GPLv3/commercial dual), tmux-resurrect/continuum (MIT but dormant since Aug 2024 and structurally unable to know agent session IDs), zellij (MIT but no control mode — open issue [zellij#3965](https://github.com/zellij-org/zellij/issues/3965)), wezterm-mux-server (MIT but private lockstep protocol, no stable release since Feb 2024), nodegit/objective-git (dormant).

### 2.3 Architecture

```
┌──────────────────────────── macOS login session ─────────────────────────────┐
│                                                                               │
│  SMAppService login item ──► gmux.app starts hidden at login                  │
│                              │ (gmux.app spawns the tmux server itself:       │
│                              │  TCC "responsible process" = gmux.app)         │
│                              ▼                                                │
│  ╔═══════════ tmux server 3.7b — bundled, pinned (ISC) ════════════════════╗  │
│  ║  socket: ~/Library/Application Support/gmux/   conf: gmux-tmux.conf     ║  │
│  ║  (exit-empty off · status off · history-limit 50000 · extended-keys on  ║  │
│  ║   · allow-passthrough on)                        OUTLIVES gmux.app      ║  │
│  ║  session webapp/claude-auth ── PTY ── claude --session-id <uuid>        ║  │
│  ║  session webapp/codex-migr ── PTY ── codex                              ║  │
│  ║  session infra/shell       ── PTY ── zsh                                ║  │
│  ╚═══════╤══════════════════════════════════════╤═══════════════════════════╝  │
│          │ per visible pane:                    │ one event bus:              │
│          │ `tmux attach -t <name>`              │ `tmux -C attach -f          │
│          ▼                                      ▼  no-output`                 │
│  ┌── gmux.app (Electron 43, ONE BrowserWindow) ─────────────────────────────┐ │
│  │ utilityProcess "attach-host": node-pty × visible panes                   │ │
│  │   watermark flow control · MessagePorts straight to renderer             │ │
│  │ main process (thin): window, updater, manifest svc (SQLite),             │ │
│  │   agent adapters (--session-id pre-assign, ~/.codex/sessions watch)      │ │
│  │ renderer:  [ webapp 🟡2 ] [ infra 🔵 ] [ + ]          ⌘J attention 🔔    │ │
│  │   ┌───────────────┬──────────────────┬──────────────────────────┐        │ │
│  │   │ SCM + file    │ Monaco editor    │ terminal stack:          │        │ │
│  │   │ tree (P2/P3)  │ + diff (P4)      │ xterm.js 6 + WebGL (P1)  │        │ │
│  │   └───────────────┴──────────────────┴──────────────────────────┘        │ │
│  │ git svc: spawn `git` CLI (GIT_OPTIONAL_LOCKS=0) + @parcel/watcher        │ │
│  └───────────────────────────────────────────────────────────────────────---┘ │
│                                                                               │
│  On disk, survives reboot:  manifest.db + scrollback snapshots                │
│                             ~/.claude/projects/**.jsonl  ~/.codex/sessions/** │
└───────────────────────────────────────────────────────────────────────────────┘
```

Two planes: tmux is the **durability boundary** (everything left of the renderer dies with the app and is rebuilt from tmux + manifest); the Electron app is a **disposable client**. (Session names in the diagram are gmux display names; the tmux-side names are their sanitized forms — gmux rewrites `.`/`:` at create/rename, since tmux 3.7b no longer does — and commands target immutable `$-ids`, per §2.4 Step 0.) Hidden sessions cost the renderer nothing — no PTY, no xterm.js instance — until viewed (the biggest scalability lever; 30 named sessions are free until shown).

### 2.4 P1 lifecycle walkthrough — exactly what survives at each step

Terminology from research 09: **T1** = app quit/crash, **T2** = tmux server death (rare), **T3** = machine reboot. The user-visible session name is the primary key: gmux name == tmux session name == manifest key, renames flow both ways via `%session-renamed`. One parser caveat guards this claim: as of the pinned tmux 3.7b, tmux no longer rewrites `.` or `:` in session names — `check_name()` rejects only invalid UTF-8 and `clean_name()` escapes C0/invisible characters (and `#(` in untrusted contexts), so `.`/`:` are accepted verbatim ([`check_name`/`clean_name`, tmux.c @ 3.7b](https://github.com/tmux/tmux/blob/3.7b/tmux.c); behavior changed in tmux 3.7, CHANGES 3.6b→3.7 "Sanitize pane titles and window and session names more consistently and strictly", issue 4999). Accepted-verbatim `.`/`:` names are ambiguous in `-t` target syntax (`session:window.pane`), and `/`-containing names like `webapp/auth-refactor` can collide with tmux's path-like target resolution — so gmux must enforce its own mapping of the display name to a sanitized tmux name at create/rename (`.`/`:` → `-`; tmux won't do it for us) and addresses live sessions by their immutable `$-id` (with `=`-prefixed exact match wherever a name must be a `-t` target), per the Control Mode wiki best practice already cited in research 01 §3.1.

**Step 0 — Create.** User hits ⌘T: "auth-refactor", project `webapp`, agent Claude Code.
1. gmux generates a UUID and writes the manifest row **before spawn**: `{name, project, cwd, argv: ["claude","--session-id","<uuid>"], agent: "claude-code", agent_session_id: <uuid>, resume_argv: ["claude","--resume","<uuid>", ...original flags]}`. Full original argv is recorded because `--resume` does **not** restore `--mcp-config`/`--add-dir`/`--settings` ([Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference); research 02).
2. `tmux new-session -d -s "webapp/auth-refactor" -c ~/src/webapp 'claude --session-id <uuid>'`; metadata mirrored into tmux user options (`@gmux-agent`, `@gmux-session-id`) so the durable server is self-describing even if the manifest is lost.
3. Per-agent ID capture where pre-assignment doesn't exist: **Codex** — FSEvents watch on `~/.codex/sessions/YYYY/MM/DD/` for the rollout file created after spawn: `rollout-YYYY-MM-DDThh-mm-ss-<uuid>.jsonl`, which may be zstd-compressed (`.jsonl.zst`) and later moved to the sibling `archived_sessions` subdir, so the watcher must match both extensions and tolerate the move ([codex-rs `rollout/src/list.rs`](https://github.com/openai/codex/blob/main/codex-rs/rollout/src/list.rs)); **cursor-agent** — `create-chat`; **Amp** — `threads new`; **opencode** — newest row in `opencode.db`; plain shells — argv+cwd only (research 02 matrix).
4. The attach-host spawns a node-pty running `tmux attach -t "=webapp/auth-refactor"` (exact-match `=` per Step 0's addressing rule); xterm.js renders it; the `-C` control client streams `%sessions-changed` / format subscriptions for status dots.

**Step 1 — gmux quits, crashes, or updates (T1).** Agent process, PTY, scrollback, names: **all survive untouched** — they live in the tmux server, which never noticed. The agent keeps working while gmux is gone. On relaunch: ping/start server → `tmux ls -F '#{session_name}'` → reconcile against manifest → reattach; scrollback backfills instantly via `capture-pane -p -e -J` up to the renderer's scrollback cap (e.g. `-S -10000` for the last 10k lines, ANSI colors intact) — the full 50k-line history stays server-side in tmux and is reachable on demand (scrollback search, or a "load full history" re-render; xterm.js cannot prepend older lines after initialization). **Zero data loss, by construction.** UX label: *"your sessions were never interrupted."* (VS Code needed a 60-second reconnect grace window; tmux's is infinite — research 09 Part D.)

**Step 2 — Machine reboots (T3).** Processes cannot survive a reboot — no tool's can; "reboot survival" is always serialize-then-relaunch (research 01 §1). What survives on disk: the manifest, scrollback snapshots (captured in the MVP at app quit, session close/detach, and control-client `%exit` — research 09 §B.4; a hard crash without a quit can lose scrollback *text* until v1's timed snapshots land), and — crucially — the agents' own transcripts (`~/.claude/projects/**.jsonl`, `~/.codex/sessions/**`), which every major agent writes continuously (research 02).

**Step 3 — Restore at login.**
1. SMAppService login item starts gmux.app hidden; **gmux.app itself spawns the tmux server as its child** — deliberate, so TCC attributes the whole agent process tree to gmux.app (the failure mode cmux ships today: [cmux#2866](https://github.com/manaflow-ai/cmux/issues/2866); research 09 §C.2).
2. `tmux ls` is empty; every manifest row with `status != exited` enters restore: `tmux new-session -d -s <name> -c <cwd>` → `select-layout` from the stored `#{window_layout}` → pane launched as `cat <scrollback-snapshot>; exec $SHELL` so prior output is inert history above a fresh prompt (tmux-resurrect's one great trick — steal the design, not the dormant plugin).
3. Each agent's **recorded resume command is armed, not fired**: `claude --resume <uuid>` / `codex resume <id>` pre-typed in the pane, one Enter (or "Resume all") to execute. Ten agents silently re-reading 150k-token transcripts is real money and surprise; auto-resume is per-session opt-in (research 02, 09 §B.4).
4. What is honestly lost and labeled as such: interactive shell env (exports, venvs, ssh-agent), background processes the agent spawned, side effects of in-flight tool calls (the transcript survives; reconciliation is the user's). Same line VS Code draws; users accept it when labeled.

**T2 — tmux server dies (rare).** Control client sees `%exit` → gmux offers the manifest restore path (Step 3 minus the login trigger). This is why the manifest updates event-driven on `%sessions-changed`/`%session-renamed`, not on a timer.

**Acceptance tests (P1 is only real if these pass — adopted from research 09):** `kill -9` gmux mid-run → same agent PID on relaunch, full scrollback; quit 30 min while agent works → all detached output visible; reboot mid-conversation → session recreated in cwd with armed `claude --resume <uuid>` that reloads the full conversation; 12 sessions / 3 projects restore < 5 s; TCC self-test reads `~/Documents` from inside a restored pane; socket reachable after 7 days uptime; `tmux kill-server` detected and recovered.

### 2.5 P2–P6 in brief (fully specified in research 06, 07, 10)

- **P2 Git GUI:** port VS Code's MIT `extensions/git` plumbing — it spawns the git CLI, not libgit2 (verified from `git.ts`; research 06). One call (`git status --porcelain=v2 --branch -z`) powers branch + ahead/behind + all file states; four resource groups (Merge/Staged/Changes/Untracked); `git commit -F` inherits hooks and signing; history via `git log --format=%H%x00… -z` with one-click copy-SHA. All background reads use `GIT_OPTIONAL_LOCKS=0` so gmux never fights an agent's git commands for the index lock. One-click `git config core.fsmonitor true` (git ≥2.37, FSEvents-backed: 3.2 s → 0.15 s status on 50k files). Optional lazygit pane — near-zero code given durable panes — exceeds VS Code SCM depth.
- **P3 File tree:** react-arborist fed by the same porcelain-v2 map: path → (M/A/D/R/U badge, color) with parent-folder propagation — VS Code's `decorationProvider.ts` model exactly. VS Code's watcher recipe: worktree watcher excluding `.git/`, dotgit watcher with `.git/HEAD` for instant branch flips, throttled status, ~500 ms debounced repaint.
- **P4 Editor:** Monaco in its native habitat. Default click-action on a modified file = **diff against HEAD** (the dominant gesture is "see what the agent changed"); only the web stack ships this free (research 07's dimension verdict). Lazy-loaded on first file open.
- **P5 Multi-project tabs:** research 10's Layout C — project tabs as the spine (one tab = one repo checkout, everything scoped per tab: the isolation VS Code refuses to ship, [vscode#322745](https://github.com/microsoft/vscode/issues/322745) closed as duplicate), plus a ⌘J attention overlay + Dock badge listing NEEDS_INPUT sessions across all projects. Status via the layered detector: Claude Code `Notification`/`Stop` hooks and Codex `notify` (auto-injected) > terminal BEL/OSC 9 > OSC 133 prompt marks > content-hash silence heuristic — any CLI agent works day one.
- **P6 Lightweight:** the honest numbers — Electron single-window realistic baseline ~250–400 MB RSS vs Tauri ~100–200 MB vs Ghostty's 24–45 MB (research 08 §2). Acceptable *for this user* because the baseline replaced is 4–6 full Cursor windows, each an Electron app with extension host and language servers: net RAM goes down and cmd+` juggling goes away. Enforced by CI gates: < 400 MB with 10 live sessions, < 1.5 s cold start, WebGL renderers only for visible terminals, renderer scrollback capped at ~10k lines (tmux holds the full 50k server-side; reattach backfills only to the cap, with full history loadable on demand — §2.4 Step 1), Monaco lazy. Hyper and Tabby died of neglect, not Electron; Wave's 400–800 MB is the cautionary tale, not the destiny.

---

## 3. Why not the alternatives

**Design A as written (Electron + home-grown Node PTY daemon).** The shell is right; the durability layer is the wrong risk. A new gmux-ptyd owns the killer feature with new code: every daemon crash is a total session loss (scrollback since last snapshot, all live agents), and the compensating machinery (snapshot cadence, KeepAlive, recovery paths) is engineering spent recreating guarantees tmux gives free. Its real advantages — no terminal-in-the-middle, all-TypeScript — are preserved here as the documented fallback: the session API is narrow (create/attach/detach/rename/kill/list/snapshot), so if Phase 0 shows agent TUIs degrading under tmux, the daemon slots in behind the same API with no UI changes. Start with the 20-year server; build the bespoke one only if tmux's ceiling is actually hit.

**Design B (native Swift + SwiftTerm + tmux).** The best P6 story (well under ~150 MB) and the cleanest PTY path — and the right durability layer. But it is 1.5–2× the calendar to the same bar (MVP 10–14 wk vs 5–7 at the §4 solo baseline; the gap only widens under §5's fleet execution, where agent velocity is the multiplier): no native SCM components, no native diff view at all (+3–6 weeks DIY on the single most important P4 feature), CodeEditSourceEditor is pre-1.0 and self-declared "not production ready," and AI agents are documented weakest at Swift/SwiftUI — CodeEdit, a whole community on this scope, is still pre-1.0 after 4+ years (research 07, 08). The tmux + manifest durability layer built now lives *outside* the app and carries over unchanged, so native Swift remains the plausible gmux 2.0 once libghostty's Swift framework ships (demoed Dec 2025, still alpha; re-evaluate 2027).

**Design C (Tauri + tmux).** The closest call — same durability layer, ~150–250 MB lighter, all-permissive licensing. It loses on three compounding costs: Tauri IPC measurably cannot carry PTY firehoses (events can't take ArrayBuffers; ~200 ms for 3 MB — [tauri#13405](https://github.com/tauri-apps/tauri/issues/13405)), so gmux must own a bespoke localhost WebSocket transport with backpressure that Electron gets from VS Code prior art; WKWebView is unproven terminal territory (60 fps rAF cap on macOS 13–15, open xterm.js dead-key bug [#5894](https://github.com/xtermjs/xterm.js/issues/5894), thin IME mileage) — nobody has shipped a many-PTY terminal on Tauri; and a two-language codebase slows the solo+agents loop. Design C's own kill-switch is "port the Rust core under an Electron shell" — evidence that Electron is the safe center of gravity. If the memory answer to open question #1 (§7) is "unacceptable," this is the design to revisit first.

**Design D (hard-fork Wave Terminal).** Wave already ships Monaco+diff, a persistent layout store, and packaging — but the one thing gmux exists for is the one thing Wave explicitly does not do and closed as not-planned: local terminal durability ([docs: "Local terminals … use standard sessions"](https://docs.waveterm.dev/durable-sessions)). The fork buys ~6–10 weeks of shell plumbing at the price of 1–2 weeks of codebase comprehension, permanent divergence tax in exactly the areas being modified (tab strip, block registry), inherited surface bugs, and Wave's 400–800 MB in-the-wild footprint as the starting point. Once Monaco wiring is subtracted (a solved problem greenfield too), the savings shrink below the ownership cost. Wave remains the architecture reference for the detached-backend pattern.

### "Why build at all?" — adopting an existing tool instead

- **Wave Terminal as-is:** local sessions die on app quit (SSH-only durable sessions, by explicit doc scope); no git GUI, no decorated tree; one active workspace per window (modal switch, not tabs). Fails P1-local, P2, P3, P5.
- **iTerm2 + tmux -CC (+ tmux-resurrect):** the reference P1-restart implementation — and nothing else on the bar. No SCM panel, no file tree, no editor, no project tabs; GPL-2.0 Obj-C monolith forecloses extension; reboot restore via resurrect is dormant (last push Aug 2024) and structurally cannot resume the *specific* agent conversation (it ps-sniffs; it can replay `claude`, never `claude --resume <uuid>`). This is the tool the user effectively has today, minus the shell they actually live in.
- **VS Code/VSCodium + tmux inside integrated terminals:** P2/P3/P4 free, T1 via tmux — and **P5 refused upstream**: project-tabs-in-one-window was requested and closed ([vscode#322745](https://github.com/microsoft/vscode/issues/322745)); multi-root workspaces merge folders into one shared environment. The cmd+` pain that motivated gmux remains untouched, and named-session UX stays trapped in tmux keybindings. **Recommended as the stopgap while gmux is built** (Design D §2.1) — a window of hours under §5's one-day cut, longer only if a Phase-0 gate goes red — not the destination.
- **cmux:** the closest architectural precedent (native, named workspaces, reboot-surviving agent resume, 25.8k★) — and deliberately terminal-only: no stage/commit UI, no explorer, no editor. GPL-3.0-or-later, so extending it makes gmux GPL. It is the existence proof to imitate, and it also ships the TCC bug gmux must avoid ([cmux#2866](https://github.com/manaflow-ai/cmux/issues/2866)).
- **claude-squad / Crystal:** claude-squad is AGPL-3.0, a TUI, single-repo-centric, with no reboot story. Crystal was deprecated Feb 2026 in favor of Nimbalyst. **Nimbalyst** earns its own sentence: MIT and the closest OSS to the bar on P2–P4 and P5 (Monaco editor, in-app git ops, multi-project) — but it is kanban/worktree-centric, its durability is agent-resume only, and it has no durable named-terminal model at all (research 04 §3.2, §5).
- **Superset:** research 04 §5 ranks it among the four closest tools, so "why not just use it" deserves an answer beyond §2.2's license exclusion: its P1 is agent-resume relaunch, not process reattach (PTYs die with the app); its IA is worktree-task-centric, so there is no VS Code-grade SCM panel (P2), no decorated explorer (P3), and no editor beyond editing inside its diff viewer (P4); the Electron+Bun stack fails P6; and ELv2 (source-available, not OSS) forecloses extension (research 04 §3.5).
- **Zed:** the mirror image — P2/P3/P4/P5 world-class, **no P1**: terminals die on restart; the pty-host RFC ([discussion #50584](https://github.com/zed-industries/zed/discussions/50584)) has had no maintainer response since March 2026. Watch it: if Zed ships persistent terminals it becomes gmux's closest competitor.
- **Conductor:** the closed-source polish benchmark; task/worktree-centric, no editor/SCM in the VS Code sense, nothing to fork.

The competitive fact (research 03, 04): in August 2026, every active tool has either durable-session machinery without IDE furniture (iTerm2, WezTerm, cmux) or IDE furniture without durability (Zed, Nimbalyst), and the two agentic terminals (Warp, Wave) both stop short of local process reattach — with user demand for exactly P1 on record: [warp#10185](https://github.com/warpdotdev/warp/issues/10185) (closed 2026-06-02 unshipped, as overlapping the earlier requests #4763/#7712 — GitHub displays it as "completed" only because the author closed it) and [waveterm#747](https://github.com/wavetermdev/waveterm/issues/747) (closed as not-planned). Nobody ships named-terminal-first + VS Code-grade SCM + decorated tree + editor + multi-project tabs in one lightweight window. That gap is the product.

---

## 4. Decision matrix

Scored 1–5 against the bar; P1, P6, and solo-dev velocity double-weighted (they are, respectively, the killer feature, the stated constraint, and the thing that determines whether this ships at all). Traceable to research 08 §10 and the four design docs.

| Criterion (weight) | A: Electron + own daemon | B: Native Swift + tmux | C: Tauri + tmux | D: Wave fork + tmux | **Recommended: Electron + tmux** |
|---|---|---|---|---|---|
| P1 durable named sessions (×2) | 4 — machinery is MIT prior art, but new daemon owns the killer feature | 5 — tmux + manifest, both battle-proven | 5 — same | 5 — same | **5** — same |
| P2 git GUI | 5 — VS Code parsers, native habitat | 3 — hand-built SwiftUI views | 4 | 4 — new block in fork | **5** |
| P3 decorated tree | 5 | 3 — NSOutlineView + DIY decorations | 5 | 4 | **5** |
| P4 editor + diff | 5 — Monaco | 2 — no native diff view; pre-1.0 editor | 4 — CodeMirror merge | 5 — Monaco already wired | **5** |
| P5 multi-project tabs | 5 | 4 | 5 | 4 — risks fighting Wave's layout engine | **5** |
| P6 lightweight (×2) | 2 — ~250–400 MB | 5 — <150 MB, Ghostty class | 4 — ~100–200 MB | 2 — Wave's 400–800 MB starting point | **2.5** — ~250–400 MB, CI-gated; no gmux-ptyd daemon RSS (rationale below) |
| Solo+agents velocity (×2) | 5 — one language, agents strongest | 2 — agents weakest at Swift | 3 — two languages, slower loop | 4 — comprehension + divergence tax | **4.5** — TS + a thin tmux client |
| **Weighted total (/50)** | **42** | **36** | **42** | **39** | **44** |
| MVP / full-bar calendar† | 4.5–6 / 10–13 wk | 10–14 / 20–24 wk | 5–7 / 12–15 wk | 6–8 / 12–15 wk | **dogfoodable alpha in ~14–18 h wall clock (one ultracode day, gate-conditional); full bar +~40–60 agent-h over following fleet days** |

† Calendar row: the A–D figures remain the solo-dev(+AI) baseline used for cross-design comparison throughout this report; the recommended plan is executed ultracode-style — a fleet of parallel Claude Code agents against frozen interface contracts, per §5 — and its own solo baseline was the same 5–7 / 11–14 wk cut.

The recommendation wins because it takes each column's best defensible score: Design B/C/D's durability layer under Design A's shell and component set. Design C ties Design A on points at 42, two behind the recommendation's 44 — which strengthens, not weakens, §3's "closest call" framing of C; the tie-breaker between A and C is Electron's proven PTY transport and one-language velocity versus C's bespoke WebSocket transport and WKWebView risk. The recommendation's only conceded column is P6 — accepted with eyes open and CI-enforced, because the honest comparison is the multiple Cursor windows it replaces (§2.5). Its P6 scores 2.5 where Design A scores 2 because delegating durability to tmux removes Design A's ~40–60 MB Node gmux-ptyd and its per-session `@xterm/headless` buffer replicas; the tmux server left outside the renderer is far lighter (design-a §11.3).

---

## 5. Phased roadmap

**Denomination change, and what it does and does not buy.** This section is cut in wall-clock hours, not weeks, because the execution model is not a solo dev typing: it is a fleet of parallel Claude Code agents, each building one work stream against a frozen interface contract, with the user at the machine all day as orchestrator and sole executor of the human-gated steps (real reboots, TCC grants, signing/notarization, eyeball fidelity checks). Two currencies, kept strictly separate because only one of them parallelizes:

- **Agent-hours parallelize.** The MVP is ~40–60 agent-hours of stream work (Phase 0 ~6–9, fan-out ~25–35, integration ~6–10, ship ~1–2), and the code volume is small and almost entirely ports of documented MIT prior art (Design A §13's basis holds: git ≈ `extensions/git`, attach-host ≈ `ptyService.ts` patterns, status ≈ published recipes; the gmux-original surface is a few thousand LOC). Nine concurrent sessions turn those agent-hours into one day.
- **Wall clock does not.** Real reboot cycles (~10–15 min each, several needed — and a reboot is stop-the-world for every local agent in the fleet, so each must land at a wave boundary with every session checkpointed); notarization latency (Apple's queue, minutes to hours, external); Developer ID cert enrollment if one isn't in the Keychain at H+0 (hours-to-days); integration convergence (merging N parallel streams always costs a tail — budgeted, not wished away); and soak time (a stability claim needs runtime; acceptance test 6 needs seven days of it by definition). These are the critical path. They are named below, not hidden.

**The critical path, stated up front** (`H+N` = hours after start; every phase boundary is a verifiable gate, not a time guess):

```
H+0 ────  preflight: cert check + §7 answers (15 min, human) ────────  H+0:15
H+0 ────  Phase 0 gates (3 in parallel; floor = eyeballs + reboot #1)  H+3:30
H+3:30 ─  go/no-go; contract freeze (drafted during Phase 0) ────────  H+4
H+4 ────  Wave 1: session core (4 sub-agents) ∥ six parallel streams   H+9
H+9 ────  Wave 2: integration — real core replaces mocks, N-way merge  H+12
H+12 ───  acceptance block: batched reboots #2–#3, tests 1–5, 7 ─────  H+14
H+14 ───  Wave 3: final sign + notarize (external) + dogfood begins ─  H+16
```

**~14–18 h wall clock to a dogfoodable, signed alpha.** After the freeze, agent throughput is not on the critical path — verification is. The day's length is set by the serial spine, and every hour on it is human-gated or external: one eyeball session, three reboots, one merge tail, one Apple queue. The widest error bar is integration (+2–6 h); its most plausible slip pushes the reboot battery and the notarized DMG to tomorrow morning — said now, not discovered at H+13.

**H+0 preflight (15 min, human; blocks nothing but starts first):** confirm a Developer ID Application cert + `notarytool` credentials in the Keychain — if absent, start enrollment *now* (external, hours-to-days; see the ledger) and the day proceeds on dev-signed builds. Answer §7 questions 1 (memory bar), 4 (armed-not-auto resume default), and 8 (macOS version, ProMotion, keyboard layouts/IME in daily use) — they set gate 1's test matrix and Phase 0's coverage.

### Phase 0 — the gated spike (H+0 to H+3:30). Validate the riskiest assumption first.

**The riskiest assumption, named (unchanged from the week-cut — compression does not soften it):** *that the P1 chain works end-to-end through parts gmux does not control — specifically, (a) that Claude Code and Codex CLI render and accept input with full fidelity through a pinned tmux 3.7b into xterm.js, and (b) that agent-native resume (`claude --resume` with a pre-assigned `--session-id`, `codex resume` with a harvested rollout ID) deterministically restores the exact conversation after a real reboot, including sessions interrupted mid-tool-call.* Both are asserted from docs and ecosystem evidence, neither was verified hands-on by any research doc (explicit gaps in research 01, 02, 09), and the entire reboot half of P1 rests on them. No wave-1 stream starts until all three gates rule.

The three gates run **concurrently** — separate agents build each harness; the human verifies. Two sequencing rules: the go/no-go cannot be called before reboot #1's verdict, so ~H+3–3:30 is the earliest honest decision point no matter how fast the agent work lands; and reboot #1 fires only after all in-flight agent work is committed, because it takes down the local fleet.

1. **Gate 1 — Fidelity** (agents build H+0→H+1:30; human eyeballs H+1:30→H+2:30). An agent assembles the minimal harness — pinned tmux 3.7b + `gmux-tmux.conf` (status off, extended-keys on, allow-passthrough on) rendered via `tmux attach` in xterm.js 6 inside a bare Electron window; the throwaway harness seeds Stream A2. Then the human runs Claude Code and Codex TUIs inside it and tests keys (incl. option/meta, dead keys), colors, paste, resize, and a full-repo-diff firehose. The pass/fail call is a human eyeball, not an agent's claim, and that half-hour is irreducible. **Fail → swap to Design A's own-daemon layer behind the same session API; the shell and UI are unchanged.** Re-denominated honestly: that fallback (node-pty + `@xterm/headless` + serialize, Design A §13's phase-1 line) is ~40–60 agent-hours of *new durability-critical code* plus full re-verification — deliberately multi-day, not fleet-rushed. On a fail, today re-scopes: wave-1 UI streams still proceed against the unchanged session API; the P1 spine lands across subsequent sessions.
2. **Gate 2 — Resume** (agents script H+0→H+1; reboot #1 ~H+2; verdict by H+3). Pre-assign `claude --session-id <uuid>`, do real work, include a run killed mid-tool-call; probe `--session-id` reuse after `/clear` (research 02's open gap). Harvest a Codex rollout UUID by FSEvents watch — matching both `.jsonl` and `.jsonl.zst` filenames and tolerating the move to `archived_sessions` — with both agents' state staged **before** the reboot so one cycle tests both. Reboot the machine (stop-the-world, ~10–15 min, fleet checkpointed), then human-verify `claude --resume <uuid>` and `codex resume <id>` reload the full conversations. **Fail → the reboot story is rescoped to cwd-scoped `--continue`/`resume --last` + honest UX, and the product thesis is re-examined before further build.** Scope effect on Stream G: it shrinks to cwd-restore plus an armed `--continue`/`resume --last` per session; per-session-ID agent adapters leave today's scope, and reboot restore loses per-conversation determinism wherever several sessions share one cwd.
3. **Gate 3 — TCC** (agents build H+0→H+2; human grants + tests H+2→H+3). Named sub-task first — **minimal bundled-tmux build**: relocate the Homebrew bottle with `install_name_tool` (Appendix F blesses relocation for the throwaway spike; the static-linked shipping build is Stream A1's job), copy into a stub .app's `Contents/MacOS`, Developer ID-sign with hardened runtime. Then, from a pane whose tmux server is the **signed bundled tmux binary spawned from the stub .app** (not a Homebrew tmux) with FDA granted, `ls ~/Documents` on current macOS (Tahoe). The FDA grant and the pass/fail read are human acts. **Fail → design the fallback grant flow (FDA on the bundled tmux binary) before, not after, shipping.** The stub's signed bundle path is pinned now and never moves — Streams A1 and F must reproduce it exactly, so the grant survives into the shipping app (§6 risk #1).

*(The old Phase-0 item 4 — baseline perf capture — moves to Wave 2 (~H+11), where a real app exists to measure; a harness-only number would not honestly seed the CI gates.)*

**Go/no-go (~H+3:30, human).** All three gates green → freeze and fan out. Any gate red → its named fallback executes and the remaining hours re-plan before another line of wave-1 code is written. Hour honesty, replacing the old calendar-honesty clause: everything below is conditional on the gates passing, exactly as the week figures were — and Design A §13's ~30% overhead assumption for the macOS-specific tail (TCC, notarization, launchd edge cases) does not vanish under parallelism; it relocates into Wave 2/3 debugging and the dogfood week.

### The freeze (H+3:30 to H+4) — contracts before fleet

A contracts agent drafts this packet **during** Phase 0 (H+1→H+3) so ratification at the go/no-go is a review, not a writing session — the single highest-leverage half-hour of the day, because every later merge conflict is a contract that wasn't really frozen. Nothing in wave 1 may depend on anything not in the packet; anything not frozen here is stream-internal.

1. **Session API** — `create/attach/detach/rename/kill/list/snapshot` as a typed IPC interface (§2.1's narrow API verbatim; also the swap point for the own-daemon fallback), plus a **mock implementation** (in-memory fake emitting canned events) that every UI stream codes against until integration.
2. **Manifest schema** — the research 09 §B.4 record (`{name, project, cwd, argv, env-delta, agent, agent_session_id, resume_argv, window_layout, status, timestamps}`), SQLite DDL frozen, incl. the `@gmux-*` tmux user-option mirrors.
3. **Naming rules** — display-name → sanitized tmux name (`.`/`:` → `-`), `$`-id addressing, `=`-exact `-t` targets (§2.4 Step 0). Frozen now because two streams (A, G) and the manifest all touch it.
4. **Event bus** — control-client notifications → typed events (`%sessions-changed`, `%session-renamed`, `%exit`, format subscriptions) and the session-status enum (WORKING / NEEDS_INPUT / IDLE) that tabs and dots consume.
5. **Git status-map store** — the porcelain-v2 `path → state` contract Stream B produces and Streams C (tree decorations) and E (dirty counts) consume.
6. **UI shell slots + IPC** — one stub `BrowserWindow` shell with named mount points (tab spine, left sidebar, Monaco center, terminal stack; props and events only), plus MessagePort channel names and the flow-control protocol (~100 KB acks, 500 KB high-water).
7. **Repo layout + module ownership map** — one stream = one directory; merges are adds, not edits.
8. **`gmux-tmux.conf` + the pinned bundle path** from gate 3 — the TCC grant targets this path; it never moves.

### Wave 1 (H+4 to H+9) — the spine and six streams

**Stream A is the critical path.** It is the old M1 decomposed into four sub-agents against internal contracts, converging by ~H+8:30:

| Sub-stream | Contents (unchanged in substance from M1) | Agent-h |
|---|---|---|
| A1 tmux bundle supervisor | Productionize gate 3's spike bundle into the research 09 **Appendix F** shipping recipe: static libevent/ncurses into one Mach-O, terminfo strategy (`tic -x` + `TERMINFO_DIRS`), hardened-runtime signing of the nested daemonizing binary, **same pinned bundle path as gate 3's stub**; spawn/ping/lifecycle, private socket under `~/Library/Application Support/gmux/`, conf | 2–3 |
| A2 attach-host | `utilityProcess`, node-pty per visible pane running `tmux attach -t "=<name>"`, MessagePorts to renderer, watermark flow control, `capture-pane -p -e -J` backfill to the 10k cap (seeded by gate 1's harness) | 2–3 |
| A3 control-mode client | Events-only `-C attach -f no-output` bus — `%begin/%end/%error` framing, `%sessions-changed`/`%session-renamed`/`%exit`, format subscriptions; the hybrid pattern is ~10% of full `-CC` protocol work (research 01 §3.2), which stays deferred | 1.5–2 |
| A4 manifest service | SQLite per the frozen schema; event-driven updates; create/rename/kill with name sanitization + `$`-id addressing; UUID pre-assignment at create | 1–1.5 |
| A5 converge | Wire A1–A4; **T1 gate: `kill -9` gmux mid-run → same agent PID, instant `capture-pane -p -e -J` backfill** | 1.5–2 |

**Streams B–G run beside it, fully parallel, mocks in, no cross-dependencies.** This is the real dependency structure: after the freeze, none of these touches another's surface, and each develops against the system tmux and mocks of its frozen contracts until integration:

| Stream | Contents (old M2–M4, re-hung) | Codes against (frozen) | Agent-h | Human touch |
|---|---|---|---|---|
| B Git sidebar | Ported VS Code `extensions/git` parsers; `git status --porcelain=v2 --branch -z`; four resource groups; stage/unstage/commit (`commit -F`); 200-commit history + copy-SHA; @parcel/watcher recipe; `GIT_OPTIONAL_LOCKS=0` | git CLI; **produces** the status-map store | 3–4 | — |
| C File tree | react-arborist + decorations from the status map, parent propagation, `.git/HEAD` watcher for instant branch flips | status-map mock until merge | 2–3 | — |
| D Editor | Monaco lazy-loaded; **diff-against-HEAD as the default click on modified files**; plain-editor toggle | file-open contract; status-map mock | 2–3 | — |
| E Shell: tabs + status | One `BrowserWindow`; project tabs (one tab = one repo, everything scoped) with branch/dirty/status chrome; terminal stack; ⌘T create flow; heuristic status detector (BEL + OSC 133 + silence hash) — hooks-based detection stays in the v1 tail | session-API mock; UI slots | 3–4 | — |
| F Packaging | electron-builder config; sign every nested Mach-O (`mac.binaries`); SMAppService login-item wiring; auto-update; DMG; **notarization dry-run submitted ~H+6 on the Phase-0 stub** to flush signing rejects while the fleet has slack | bundle layout + pinned path | 2–3 | cert/creds; Apple queue |
| G Reboot restore | Scrollback snapshot capture on app quit / session close-detach / control-client `%exit` (research 09 §B.4); restore algorithm (new-session → select-layout → `cat snapshot; exec $SHELL` → **armed-not-fired resume**) for Claude Code (`--session-id`) and Codex (rollout watch: `.jsonl`/`.jsonl.zst`, `archived_sessions`); TCC first-run self-test | manifest schema; session-API mock; A1's supervisor API | 3–4 | login-item approval (verification lands at H+12) |

Wave-1 wall clock is bounded by the longest stream plus orchestration overhead — the user reviewing seven streams' checkpoints is real work, budgeted, not free. Nothing in Wave 1 blocks on anything else in Wave 1.

### Wave 2 (H+9 to H+12) — integration: the merge tail, budgeted

One integrator agent + the user; merge order is dependency order.

1. **Core dock (~1 h):** the real session service (Stream A) replaces the mock under E's terminal stack — the P1 spine lands. Acceptance test 1 re-runs on the integrated app. **Dogfooding starts here (~H+10):** durable named terminals in project tabs already beats the status quo, and gmux is built inside gmux from this point — itself the first soak test.
2. **Panel dock (~1–2 h):** B lands; C and E swap status-map mocks for B's real store; then D.
3. **G merge**, then **F's packaging over the lot**.
4. **Overlapped, not skipped:** acceptance test 2's 30-minute detached window starts ~H+9 and runs *under* the merge; test 7 is scripted; at ~H+11 the **baseline perf capture** (old Phase-0 item 4) runs on the integrated app — RSS @ 10 sessions (2 visible), cold start, backfill latency — recorded as the CI-gate seed numbers (< 400 MB @ 10 sessions, < 1.5 s cold start; the release-blocking CI rig is v1).

**Budget 2–4 h of convergence debug; realistic variance +2–6 h — the widest error bar of the day, and the honest cost of N parallel streams.** Contract-drift adjudication between streams is a human call and the single most likely thing to push the reboot battery into tomorrow morning. Overrun rule, decided now: integration overruns shed D/E polish (diff-editor keybindings, tab chrome), never the P1 spine.

### Acceptance block (H+12 to H+14) — the tests are the gate; reboots are batched

The MVP acceptance tests, unchanged from §2.4 (adopted from research 09) — none deleted, none weakened; P1 is only real if these pass:

1. `kill -9` gmux mid-run → same agent PID on relaunch, full scrollback *(first passed at A5, re-run at the core dock)*.
2. Quit 30 min while agent works → all detached output visible *(window started ~H+9, read here)*.
3. Reboot mid-conversation → session recreated in cwd with armed `claude --resume <uuid>` that reloads the full conversation.
4. 12 sessions / 3 projects restore < 5 s *(stopwatch — human)*.
5. TCC self-test reads `~/Documents` from inside a restored pane.
6. Socket reachable after 7 days uptime — **structurally cannot pass today.** The soak *starts* today (server up, socket in App Support); the clock concludes at H+168. Ledger item, not a deletion.
7. `tmux kill-server` detected via `%exit` and recovered *(scripted, ~10 min, no reboot needed)*.

Reboot batching: **reboot #2** (~H+12:30) carries tests 3 + 5; **reboot #3** (~H+13:15) carries test 4 + a test-5 re-run. Each cycle is ~10–15 min down + ~15 min verify, fleet checkpointed before each. A fourth reboot stays in reserve for a failed run.

### Wave 3 (H+14 to H+16) — sign, notarize, dogfood

Sign inside-out (nested tmux binary first — Appendix F.3), `notarytool submit --wait` (the wait is Apple's, not ours — F's dry-run at ~H+6 exists to make this submission boring), staple, DMG. Install to /Applications, register the SMAppService login item, run the first-run TCC self-test, and re-verify the FDA grant against the final .app (same pinned bundle path as gate 3, so it should hold; verify anyway). Auto-update arms by cutting release 0.0.1 on GitHub Releases; the perf numbers are re-measured on the built app and recorded as release-blocking thresholds. Then the only milestone that matters: **dogfood continues on this build — gmux built inside gmux — and every local Claude Code session moves into it.** Today buys a working alpha; the *stability claim* is bought by the soak, not the build day.

### The v1 tail — explicitly not today (~40–60 further agent-hours across later fleet days)

- ⌘J attention overlay + Dock badge; Claude `Notification`/`Stop` and Codex `notify` hook auto-injection for deterministic NEEDS_INPUT.
- Remaining agent adapters (cursor-agent `create-chat`, Amp `threads new`, opencode DB read, aider, Gemini-legacy) + per-session restore policy (auto / armed / shell-only) + "Resume all".
- Timed scrollback snapshots; ahead/behind push/pull/branch switching; optional lazygit pane; one-click fsmonitor.
- Worktree-aware creation ("new session in worktree…" — aware, not required); splits with `window_layout` restore; command palette; scrollback search; F2 rename everywhere.
- CI perf gates enforced per release (< 400 MB @ 10 sessions, < 1.5 s cold start); optional SpecStory-wrap toggle per terminal as transcript insurance.

**Deferred beyond v1 (unchanged):** full `-CC` control-mode rendering (native panes, lazy attach, remote tmux-over-SSH — the same architecture extends to devboxes), worktree lifecycle automation (Conductor's product), plugin system, any cloud component. Native-Swift rewrite: re-evaluate when libghostty's Swift framework tags a release (2027 check-in) — the tmux + manifest layer carries over unchanged.

### What realistically spills past today — the ledger

Parallelism compresses agent-hours; it compresses nothing below, and pretending otherwise is how week-plans become quarter-plans:

- **Acceptance test 6 (7-day socket longevity):** physics. The soak starts today; the verdict lands at H+168; an overnight check is the first data point.
- **The stability claim itself:** "I can move off Cursor" is earned by days of living in the build, not by agents. Today ends with an alpha in daily use with tests 1–5 and 7 green — not a verdict.
- **Signed distribution, if the cert is missing at H+0:** Apple Developer enrollment is 24–48 h+. Today's build dogfoods locally dev-signed; only distribution slips, and gate 3's grant is re-verified once the real cert lands (TCC attribution follows the signed binary at its pinned path).
- **Integration convergence variance (+2–6 h):** the most plausible slip pushes the reboot battery and the notarized DMG to tomorrow morning.
- **Fidelity long tail:** gate 1's eyeball hour covers the user's layouts, not certification of dead keys/IME/non-US layouts/ProMotion subtleties — expect dogfood-week regressions; §6 risk #2 stays open past today, with the own-daemon fallback behind the frozen session API as the designed escape.
- **The macOS ~30% tail:** Design A §13's overhead assumption (TCC attribution quirks, SMAppService/launchd edge cases, notarization rejections) lands disproportionately after H+12 and is the single most plausible cause of H+16 becoming tomorrow.
- **Static-linked tmux bundle:** if A1's from-source static build fights past its budget, today ships the gate-3 relocated-bottle bundle (three signed Mach-Os at the same pinned path — Appendix F rates it acceptable) and the single-Mach-O static build lands with v1.
- **Crash-without-quit scrollback text:** timed snapshots are v1; today ships quit/close/`%exit` snapshots only, so the loss window §2.4 Step 2 documents remains.
- **CI perf-gate enforcement:** numbers seeded today; the release-blocking harness is v1.
- **Gate-failure re-plans:** gate 1 red converts the day into the own-daemon build (~40–60 agent-hours of durability-critical code, deliberately multi-day; UI streams unaffected behind the frozen API); gate 2 red rescopes Stream G to cwd-restore and forces the thesis re-examination *before* further build — that conversation is human, and it is allowed to end the day early.

What "done today" honestly means: a T1-complete, reboot-restoring, signed-or-dev-signed alpha in daily dogfood by tonight, with acceptance tests 1–5 and 7 green and clocks started on test 6 and the soak — not a stable v1. That is the compression ultracode actually buys: weeks of agent-hours into one day, with the calendar-bound residue named and scheduled instead of denied.

---

## 6. Risk register

| # | Risk | L/I | Mitigation |
|---|---|---|---|
| 1 | **macOS TCC/FDA misattribution breaks agents' file access in restored sessions** — launchd-spawned trees don't inherit terminal grants; shipping today in cmux ([#2866](https://github.com/manaflow-ai/cmux/issues/2866)); semantics changed across 11.4 and Tahoe | High/High | gmux.app spawns the tmux server itself (responsible-process = gmux.app); SMAppService registration from the app bundle, never AppleScript/raw plists; one-time FDA grant + first-run self-test that stats `~/Documents` from inside a pane; fallback grant on the bundled tmux binary — sequenced deliberately: Phase 0's minimal bundled-tmux sub-task (gate 3) produces the signed binary at the pinned path the grant targets, and Stream A1 (§5 Wave 1) productionizes it per research 09 Appendix F without moving that path; regression test every macOS major. Phase-0 gate 3. |
| 2 | **tmux-in-the-middle fidelity gaps** — no kitty keyboard protocol (CSI-u only), exotic sequences need passthrough, attach-race class of bugs (cf. iTerm2 #11174) | Med/High | Phase-0 gate 1 gates the whole plan; pinned bundled binary kills version skew (the historical #1 -CC pain); hybrid pattern keeps protocol surface tiny (plain attach renders; `-C` is events-only); **designed fallback: Design A's own PTY daemon behind the same narrow session API**. |
| 3 | **Agent resume breaks or drifts** — `--session-id` reuse after `/clear` untested; Codex rollout-format drift ([#21761](https://github.com/openai/codex/issues/21761)); `--resume` doesn't restore launch flags; 30-day transcript retention defaults | Med/High | Phase-0 gate 2; record full original argv + agent CLI version per manifest row; **armed-not-auto default** so a failed resume is a visible pre-typed command, never silent loss; cwd-scoped `--continue`/`resume --last` fallback; per-agent adapter tests against pinned CLI versions; optional SpecStory markdown insurance. |
| 4 | **P6 failure by a thousand cuts** — drift toward Wave's 400–800 MB | Med/High | Hard CI gates (< 400 MB @ 10 sessions, < 1.5 s cold start) that block release; one BrowserWindow forever; WebGL only for visible terminals; renderer scrollback capped (tmux holds history); Monaco lazy-loaded; profile every release. |
| 5 | **tmux server or socket failure (T2)** — server crash kills all live sessions; macOS /tmp cleanup orphans default sockets | Low/High | Private socket dir under `~/Library/Application Support/gmux/` (sidesteps /tmp cleanup entirely); event-driven manifest + scrollback snapshots on quit/close/`%exit` (timed snapshots in v1) make T2 degrade to the reboot path, never a void; `%exit` detection offers restore immediately; 7-day socket longevity in acceptance tests. |
| 6 | **Platform treadmill** — Electron 8-week majors, node-pty ABI rebuilds, xterm.js 6.1 beta churn | Med/Low | Pin stable xterm.js; electron-builder handles rebuilds routinely (prebuilt node-pty forks exist); quarterly, time-boxed upgrade window. |
| 7 | **Competitive convergence** — Zed staffs its pty-host RFC; Anthropic's `claude agents` view grows beyond a research preview; Wave ships local durable sessions | Med/Med | Ship the MVP in days, not quarters (§5's hour-cut); gmux's moat is the *combination* (named terminals + SCM + tree + tabs), which no single mover closes quickly; re-check cmux/zellij (#1663, #3965), Zed #50584, and Wave #747 at each phase boundary. |
| 8 | **Category churn in dependencies** — five gmux-adjacent projects died or stalled within ~12 months (Terragon, Vibe Kanban, Crystal, old-HumanLayer, VibeTunnel) | Low/Med | Every load-bearing dependency is boring and diversified: tmux, git, Electron, xterm.js, Monaco — all with decade-scale track records; nothing depends on any agent-manager project's continued health; designs mined (wmux, agent-deck schemas) were vendored as ideas, not dependencies. |

---

## 7. Open questions for the user

1. **Memory bar:** is ~250–400 MB RSS for the one gmux window acceptable given it replaces several Cursor windows? A hard "no" flips the recommendation to Design C (Tauri, ~100–200 MB) and adds the bespoke-transport/WKWebView risk (~1 wk at the solo baseline; a full re-plan of §5's fleet day) — say so at the H+0 preflight, before Phase 0.
2. **Concurrency profile:** do you regularly run >5 agents racing on *one* repo? Research 10 states this falsifier explicitly: if yes, the IA should flip from project-tabs to session-first with mandatory worktrees (Conductor's design point), and that changes the MVP.
3. **License/distribution intent:** is gmux a personal tool, an OSS project, or a potential product? Everything recommended is ISC/MIT/BSD-clean either way, but the answer governs whether GPL codebases (cmux) could ever move from "imitate" to "fork," and what license gmux itself ships under.
4. **Resume default:** confirm "armed, not auto-run" as the reboot default. If you'd rather pay tokens for zero-click restoration, auto-resume becomes the default and the restore prompt disappears.
5. **Agent priority:** MVP covers Claude Code + Codex. Which of cursor-agent, Amp, opencode, aider do you actually run today, in what order? (Amp resume requires network; Gemini CLI is legacy after the June 2026 consumer shutdown.)
6. **Remote hosts:** are devbox/SSH sessions on the horizon? If yes, the Phase-2 `-CC` control-mode client rises in priority — the tmux architecture extends to remote hosts for free; the own-daemon fallback does not.
7. **Stopgap:** want the interim setup (VSCodium/Cursor + `tmux -L gmux` + a resume script implementing the manifest pattern) while §5's build day runs — or as the fallback if a Phase-0 gate goes red? It delivers P1-restart immediately and exercises the exact tmux config gmux will ship.
8. **Environment facts for Phase 0:** current macOS version (Tahoe?), ProMotion display, non-US keyboard layouts/IME in daily use — each changes what the spike must cover.

---

*Index of underlying documents: see [README.md](README.md). Every claim above traces to `research/01–10` or `designs/design-{a,b,c,d}`, all verified against primary sources on 2026-08-09.*
