# gmux

A lightweight macOS shell for agentic coding: **durable named terminal sessions**
(backed by a private tmux server that survives app quit/crash/update), project
tabs, a VS Code-grade git sidebar, a git-decorated file tree, and a Monaco
editor with diff-vs-HEAD — in one window. tmux is invisible: the GUI is the
whole interface.

Architecture authority: [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md) (§2).

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

gmux only ever talks to its **private** tmux server:

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
