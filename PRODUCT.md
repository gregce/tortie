# Product

<!-- impeccable:product-schema 1 -->

## Platform

macos-desktop

(Electron 43 single-window app. Native-macOS design expectations apply — menu bar, traffic lights, standard shortcuts — even though the rendering stack is web tech.)

## Stack

Locked by the build brief (do not relitigate): Electron 43.x + electron-vite + React + TypeScript strict + zustand · @xterm/xterm 6 (webgl/fit/web-links addons) · node-pty · better-sqlite3 · @parcel/watcher · react-arborist · monaco-editor · system git CLI (`GIT_OPTIONAL_LOCKS=0`) · private tmux server (socket `-L gmux`, `resources/gmux-tmux.conf`) · npm.

## Users

Developers who run many CLI coding agents (Claude Code, Codex, plain shells) across several repos at once. Today they juggle 4–6 Cursor/VS Code windows with cmd+`, lose running agents to app restarts and reboots, and constantly ask "which agent needs me right now?" They live keyboard-first, in the terminal, on macOS.

## Product Purpose

Tortie is a calm, durable place for agentic work: one window where named terminal sessions host coding agents, survive app quit/crash/update (private tmux server) and reboots (SQLite manifest + armed `--resume` commands), surrounded by a VS Code-grade git sidebar, a git-decorated file tree, and a Monaco editor whose default gesture is diff-vs-HEAD. Success: the user closes their 4–6 editor windows and lives in Tortie; no session or agent conversation is ever silently lost.

## Positioning

The only tool that combines durable named terminals + VS Code-grade SCM + decorated file tree + editor-with-diff + isolated project tabs in one lightweight window ([pre-build architecture assessment](docs/audits/2026-08-09-prebuild-architecture-assessment.md) §3: every competitor has durability without IDE furniture, or IDE furniture without durability). The durability claim is structural, not best-effort: sessions live outside the app process, and reboot restore re-arms the *specific agent conversation* (`claude --resume <uuid>`), which tmux-resurrect/zellij structurally cannot do.

## Operating Context

- macOS 15+ (arm64 dev target), system tmux 3.6a during development; bundled pinned tmux is planned, out of scope today.
- Agent CLIs (`claude`, `codex`) installed by the user on PATH; git via Xcode CLT.
- One project tab = one repo checkout (worktree-aware, not worktree-required).
- tmux is INVISIBLE: no tmux concept, term, or keybinding ever reaches the UI. Sessions have names; that is the entire model the user learns.
- The app is a "disposable client" over the durable server: quitting Tortie must feel safe, and the UI must say so.

## Capabilities and Constraints

The six product properties ([pre-build architecture assessment](docs/audits/2026-08-09-prebuild-architecture-assessment.md) §2):

- **P1 Durable named sessions** — survive quit/crash/update untouched; reboot restore recreates sessions with scrollback history and an armed (pre-typed, not auto-run) resume command per agent conversation.
- **P2 Git GUI** — VS Code-grade: branch + ahead/behind always visible, Merge/Staged/Changes/Untracked groups, stage/unstage/commit (inherits hooks/signing), history with copy-SHA.
- **P3 Decorated file tree** — M/A/D/R/U badges + colors from porcelain-v2, parent-folder propagation, instant branch-flip refresh.
- **P4 Editor** — Monaco, lazy-loaded; clicking a modified file opens **diff against HEAD** by default; plain-file toggle; ⌘S save.
- **P5 Multi-project tabs** — project tabs as the spine (everything scoped per tab), per-tab status roll-up, plus a global ⌘J attention overlay and Dock badge for NEEDS_INPUT sessions across all projects.
- **P6 Lightweight** — < 400 MB RSS @ 10 sessions, < 1.5 s cold start; WebGL renderers only for visible terminals; renderer scrollback capped ~10k lines; Monaco lazy.

Session status enum (frozen contract): WORKING / NEEDS_INPUT / IDLE, plus manifest `exited`.

Constraints: single BrowserWindow forever; no cloud component; session kill is always explicit and confirmed (inferred from durability positioning — losing an agent by accident is the one unforgivable act); errors surface as friendly UI states, never silently.

## Brand Commitments

- Name: **Tortie**, capitalised as a proper noun (Phase 16.5; it was `gmux`, always lowercase, before the rename). The private tmux socket is still `-L gmux` and always will be — see README, "What is still called gmux, and why".
- Native-macOS feel over web-app expressiveness; brand lives in precise details (status dots, restore moments, copy), not decoration.
- Dark-first (terminal-centric tool; DESIGN.md commits the final call).
- Vocabulary ban: "tmux", "pane", "attach", "detach", "socket", "daemon", "PTY", "mux" never appear in UI copy (single exception: the tmux-missing install error, where naming the dependency is honesty).
- UX label for restart recovery, verbatim from the architecture doc: "Your sessions were never interrupted."

## Evidence on Hand

- `docs/audits/2026-08-14-electron-typescript-architecture.md` is the current architecture authority. The pre-build assessment and `docs/research/01–10` preserve the design evidence verified on 2026-08-09; `docs/research/10-multi-project-ux.md` carries the Layout C IA decision and wireframes.
- No customers, benchmarks, or testimonials exist; nothing may fabricate them.

## Product Principles

1. **Never lose a session.** Durability is the product; every design choice defends it, and the UI says out loud when work was preserved.
2. **Zero new concepts.** Sessions have names. Projects are folders. That's the whole model — no multiplexer vocabulary, no modes.
3. **The glance answers "who needs me."** Status is visible from anywhere: dots on sessions, roll-ups on tabs, ⌘J across projects, badge on the Dock.
4. **First run to first running agent in under 60 seconds, zero docs.** Every flow has an obvious next click and a keyboard path.
5. **One window, everything scoped.** A project tab isolates its sessions, git state, tree, and editor — the isolation VS Code refuses to ship.

## Accessibility & Inclusion

Keyboard-first: every action reachable without the pointer; complete shortcut map under ⌘/. Text contrast ≥ 4.5:1 (≥ 3:1 for large text) on all surfaces. Status is never color-alone: dots pair with shape (hollow/solid/pulse) and text labels. `prefers-reduced-motion` disables the needs-input pulse in favor of a static badge.
