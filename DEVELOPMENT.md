# Tortie

A calm, durable place for agentic work: **durable named terminal sessions**
(backed by a private tmux server that survives app quit/crash/update), project
tabs, a VS Code-grade git sidebar, a git-decorated file tree, and a Monaco
editor with diff-vs-HEAD — in one window. tmux is invisible: the GUI is the
whole interface.

Philosophy and naming: [`docs/ZEN-OF-TORTIE.md`](docs/ZEN-OF-TORTIE.md).
Architecture authority: [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md) (§2).

> **The app was called `gmux` until Phase 16.5.** The product name, bundle id
> (`com.specstory.tortie`) and data directory (`~/Library/Application
> Support/Tortie`) all changed; the first launch under the new name copies the
> old `~/Library/Application Support/gmux` across and leaves the original in
> place as a backup (`src/main/migrate/`). Several INTERNAL identifiers keep
> the old spelling ON PURPOSE — most importantly the private tmux socket
> `-L gmux`, which live sessions are bound to and which must never be renamed.
> See "What is still called gmux, and why" below.

## Dev quickstart

Requirements: macOS (arm64), Node 22+, system `tmux` (3.6+ via Homebrew:
`brew install tmux`), Xcode Command Line Tools (for native module builds), and
`git` on PATH.

```sh
npm install        # postinstall runs electron-rebuild for node-pty + better-sqlite3
npm run dev        # electron-vite dev server + Electron with HMR
```

### Scripts

| Script              | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Dev mode with HMR (renderer) and hot restart (main/preload)          |
| `npm run build`     | Production bundles into `out/`                                       |
| `npm run typecheck` | Strict `tsc --noEmit` over node (main/preload/shared) + web configs  |
| `npm run smoke`     | Build, then headless boot check: window + native modules + private tmux server reachable, exits 0 in <15 s |
| `npm run shot`      | Build, then screenshot the window after 3 s (`GMUX_SHOT=/path.png npm run shot`) |
| `npm run package`   | electron-builder `--dir` build (unsigned dev packaging stub)         |

## tmux safety

Tortie only ever talks to its **private** tmux server:

```sh
tmux -L gmux -f resources/gmux-tmux.conf <command>
```

It never reads `~/.tmux.conf`, never touches the default `tmux` server, and
its config keeps the private server alive with zero sessions (`exit-empty off`)
— that server, not the GUI, is the durability boundary. The system tmux is the
dev target today; a pinned, bundled tmux is planned (FINAL-REPORT §5, Stream A1).

## Layout

```
src/main/       Electron main: window, (later) tmux/, manifest/, attach/, git/, watcher/, fs/, ipc.ts
src/preload/    The typed window.gmux bridge (contextBridge, isolation on)
src/shared/     FROZEN contracts: types.ts (domain), ipc.ts (channels + GmuxApi)
src/renderer/   React app: app/ (shell), terminal/, scm/, tree/, editor/, styles/
resources/      gmux-tmux.conf (private server config)
```

`src/shared/` is the contract every work stream codes against: append new
types/channels, never change existing declarations.

## What is still called gmux, and why

The Phase 16.5 rename changed what the USER sees. It deliberately changed none
of the identifiers that live data is already bound to, because renaming those
would strand it:

| Still `gmux` | Why it can never change |
| --- | --- |
| tmux socket `-L gmux` | Every live session is on that socket. Rename it and the app starts a second, empty server while the user's work sits unreachable on the first. |
| `resources/gmux-tmux.conf` | Passed as `-f` to the running server; paired with the socket above. |
| tmux session options `@gmux-id`, `@gmux-agent`, `@gmux-session-id` | Stamped into sessions that are running RIGHT NOW. They are how the app proves a live session is its own — and, by the same rule, how it knows not to touch anyone else's. |
| `GMUX_SESSION_ID`, `GMUX_MANAGED` pane env | Same argument, plus users' own tooling may read them. |
| `<userData>/gmux/` (manifest, snapshots, hooks, dropped images) | Copied wholesale by the migration; renaming it inside the copy would be a second migration for no gain. |
| `window.gmux` preload bridge, `gmux-asset:` scheme, `gmux.*` localStorage keys, `gmux-*` CSS classes | Private to the process. The localStorage keys in particular carry the user's tab order, layouts and one-time-tip flags. |
| `GMUX_*` env vars and `[gmux]` log prefixes | Developer surface: harness switches and greppable log lines, never shown in the UI. |
