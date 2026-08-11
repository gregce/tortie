# gmux — docs index

gmux is a lightweight macOS shell for agentic coding: durable named terminal sessions (survive app restarts and reboots), a VS Code-grade git sidebar, a git-decorated file tree, a click-to-edit editor, and multi-project tabs in one window. All research verified against live sources in August 2026.

## Start here

- **[FINAL-REPORT.md](FINAL-REPORT.md)** — the decision document: recommended architecture (single-window Electron + bundled pinned tmux + session manifest with agent-native resume), the Electron-vs-Tauri-vs-native verdict, why the alternatives lost, decision matrix, phased roadmap, risk register, and open questions.

## research/ — the ten dimension deep-dives

| Doc | One-liner |
|---|---|
| [01-durability-layer.md](research/01-durability-layer.md) | tmux vs zellij vs screen vs shpool vs wezterm-mux as the layer that keeps named sessions alive independent of the GUI — tmux wins. |
| [02-agent-resume.md](research/02-agent-resume.md) | How every CLI agent (Claude Code, Codex, cursor-agent, Amp, opencode, aider, Gemini) persists and resumes conversations; the session-manifest strategy and per-agent ID capture. |
| [03-existing-terminals.md](research/03-existing-terminals.md) | iTerm2, Wave, WezTerm, Ghostty, Kitty, Hyper, Rio, Zed, Warp scored against the gmux bar — nobody clears it; the gap is real. |
| [04-agent-managers.md](research/04-agent-managers.md) | The 30+ agent-session-manager category (cmux, wmux, Nimbalyst, Conductor, claude-squad, agent-deck…): licenses, durability architectures, forkability, extinction events. |
| [05-terminal-components.md](research/05-terminal-components.md) | Embeddable terminal widgets/engines per stack — xterm.js+node-pty, SwiftTerm, libghostty, alacritty_terminal, rio-vt — and VS Code's persistence machinery as the reference design. |
| [06-git-components.md](research/06-git-components.md) | How to build the VS Code-grade SCM panel and tree decorations: spawn the git CLI (VS Code's own approach), the ~6 commands needed, watchers, fsmonitor, lazygit as escape hatch. |
| [07-editor-file-tree.md](research/07-editor-file-tree.md) | Editor + file-tree components per stack (Monaco, CodeMirror 6, CodeEdit packages, STTextView, react-arborist) — only the web stack ships a diff view for free. |
| [08-shell-architecture.md](research/08-shell-architecture.md) | Native Swift vs Electron vs Tauri weighed on footprint, PTY/IPC throughput, P1 prior art, signing, and solo+AI-agent dev velocity — Electron 54/60, Tauri 49, native 43. |
| [09-reboot-survival.md](research/09-reboot-survival.md) | The full P1 recipe: tmux server mechanics, tmux-resurrect/zellij internals, the gmux session manifest, macOS TCC/launchd landmines, lifecycle spec, and acceptance tests. |
| [10-multi-project-ux.md](research/10-multi-project-ux.md) | The one-window multi-project IA: project tabs + attention overlay (Layout C), session naming, agent-status detection stack, worktrees aware-not-required. |

## Living market map

- **[24-agent-workspace-product-inventory.md](research/24-agent-workspace-product-inventory.md)** — current inventory of agent terminals, session managers, worktree control planes and converging IDEs, evaluated against Tortie’s continuity-and-attention thesis.
- **[26-tortie-durability-architecture-and-recovery.md](research/26-tortie-durability-architecture-and-recovery.md)** — scored audit of Tortie’s current promise, exact failure boundaries, 30 architecture/mechanism/backup improvements, adversarial keep/defer/cut review, and release fault matrix.

## designs/ — the four candidate designs

| Doc | One-liner |
|---|---|
| [design-a-electron.md](designs/design-a-electron.md) | Greenfield Electron with a home-grown launchd Node PTY daemon (VS Code's pty host promoted to a user daemon); tmux as its documented contingency. |
| [design-b-native-swift.md](designs/design-b-native-swift.md) | Native Swift/AppKit with SwiftTerm views attached to a bundled tmux server — the lightest path (<150 MB) at ~1.5–2× the calendar. |
| [design-c-tauri.md](designs/design-c-tauri.md) | Tauri 2 + Rust core supervising bundled tmux, PTY bytes over a localhost WebSocket bypassing Tauri IPC, CodeMirror UI — half Electron's memory, first-of-kind risk. |
| [design-d-fork-existing.md](designs/design-d-fork-existing.md) | Hard-fork Wave Terminal (Apache-2.0) and close the bar with four deltas — plus the "no new app" VSCodium+tmux stopgap analysis. |

**The final recommendation synthesizes these:** Design A's Electron shell and component set with the tmux durability layer that Designs B/C/D (and research 01/09) converged on. See FINAL-REPORT.md §2.1 for the adjudication.
