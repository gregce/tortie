# Research dimension 04 — Coding-agent session managers (gmux's direct competitor/precedent set)

**Date:** 2026-08-09. All facts below were verified against primary sources (GitHub repos, product docs, shutdown notices) in August 2026, not training data. Star counts and activity are as reported by GitHub at fetch time.

**gmux bar being scored against:**
- **P1** Durable *named* terminal sessions (survive app restart; ideally reboot via layout restore + `claude --resume` / `codex resume`)
- **P2** Git GUI comparable to VS Code SCM (branch always visible, stage/commit, history, copy SHA)
- **P3** File explorer with git-status decorations
- **P4** Click-to-view/edit files with syntax highlighting
- **P5** Tabs across multiple projects in ONE window
- **P6** Lightweight (native vs Electron vs Tauri weighed)

---

## 1. The category, in one paragraph

Between mid-2025 and mid-2026 an entire product category emerged around "run many CLI coding agents at once." It has already had its first extinction events: **Terragon** (cloud background agents) shut down 2026-01-16 and open-sourced its code ([terragon-labs/terragon-oss](https://github.com/terragon-labs/terragon-oss)); **Vibe Kanban** maker Bloop shut down 2026-04-10, leaving the project community-maintained ([shutdown notice](https://www.vibekanban.com/blog/shutdown)); **Crystal** was deprecated in Feb 2026 in favor of its successor Nimbalyst ([stravu/crystal](https://github.com/stravu/crystal)). The survivors cluster into four architectures: (a) **tmux-wrapper TUIs** (claude-squad, agent-deck, dmux), (b) **Electron worktree-orchestrator apps** (Superset, coder/mux, Nimbalyst, wmux, Sculptor), (c) **native macOS terminals with agent smarts** (cmux, Conductor, plus a long tail of small Swift apps), and (d) **remote-control relays** (VibeTunnel, Happy, Omnara). The dominant design bet across the category is *worktree-per-task fan-out with a diff-review flow* — which is notably NOT the gmux user's workflow (many long-lived named terminals across many projects, with IDE furniture around them).

A useful census of the whole field (100+ projects, categorized, with an "inactive" graveyard section) is [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators).

---

## 2. At-a-glance comparison table

| Project | Type / stack | License | Status (Aug 2026) | P1 named durable sessions | Reboot survival | P2 Git GUI | P3 explorer | P4 editor | P5 multi-project one window |
|---|---|---|---|---|---|---|---|---|---|
| [claude-squad](https://github.com/smtg-ai/claude-squad) | TUI, Go + tmux + worktrees | **AGPL-3.0** | Active (v1.0.19, Jun 17 2026), 8.3k★ | Partial (tmux detach; named instances) | No | Diff/checkout only | No | No | Weak (instance list) |
| [Crystal](https://github.com/stravu/crystal) | Electron + React | MIT | **Deprecated Feb 2026** → Nimbalyst, 3.1k★ | Session list persists; agent resume | Partial | Basic (rebase/squash buttons) | Partial | Partial | Yes (projects) |
| [Nimbalyst](https://github.com/nimbalyst/nimbalyst) | Electron + React + Monaco | MIT | Active, 1.4k★, 5.5k commits | Sessions + kanban persist; resume | Partial | Git state tracking, rebase/squash | Yes | Yes (Monaco + Lexical) | Yes |
| [Conductor](https://conductor.build) ([docs](https://www.conductor.build/docs/)) | Native Mac app (Melty Labs, YC, $22M Series A) | **Closed source** (free app) | Active, fast cadence | Workspace-per-task persists | Partial | Diff review, PR, merge | Yes (workspace files) | Basic | Yes (repos + workspaces) |
| [cmux](https://github.com/manaflow-ai/cmux) | **Native Swift/AppKit + libghostty** | **GPL-3.0-or-later** (+ commercial licensing) | Very active (nightlies), 25.8k★ | **Yes** — named workspaces/tabs, layout + scrollback restore | **Yes** — "survives a full computer restart"; agents resume via saved session IDs ([cmux.com](https://cmux.com/)) | Branch + PR status in sidebar only | No | No | **Yes** (vertical tabs = workspaces) |
| [Superset](https://github.com/superset-sh/superset) | Electron + React + Bun | **Elastic License 2.0** (source-available, NOT OSS) | Very active (daily releases), 12.8k★ | Yes — "persistent sessions that survive restarts" | Partial | Diff viewer, branch per workspace | Partial | Diff editing; hand-off to VS Code/Cursor | Yes (10+ workspaces) |
| [coder/mux](https://github.com/coder/mux) | Electron/web (TS), chat-style UI | **AGPL-3.0** | Active, 2k★, 3.5k commits | Workspaces persist (git-based state) | Partial | Divergence viewer, review UI | Partial | Markdown-rich, not code editor | Yes (local/worktree/SSH) |
| [wmux](https://github.com/openwong2kim/wmux) | Electron + React 19 + **Node daemon owning PTYs** (xterm.js/node-pty) | MIT | Active but young (since Mar 2026), 334★ | **Yes** — daemon holds PTYs + scrollback on disk | **Yes** — daemon service + one-click resume of agent conversations | Git tab (worktrees, PRs), per-hunk adoption | Partial | Diff-level only | Yes (fleet view) |
| [agent-deck](https://github.com/asheshgoplani/agent-deck) | TUI, Go + Bubble Tea + tmux + SQLite | MIT | Very active, 691★, 2.8k commits | **Yes** — named sessions in SQLite (`state.db`), tmux panes | **Yes** — restart resumes via `--resume` | No (worktree mgmt only) | No | No | Yes (groups, multi-repo, remote SSH) |
| [ccmanager](https://github.com/kbwo/ccmanager) | TUI, TypeScript, **own PTY (no tmux)** | MIT | Active, 1.2k★ | Named by worktree; state via agent's own session files | Partial (agent resume, not process) | Status display only | No | No | Yes (multi-project discovery) |
| [Sculptor](https://github.com/imbue-ai/sculptor) (Imbue) | Desktop app + **Docker container per agent** | MIT (repo); free beta | Active (repo pushed May 2026), 213★ | Workspaces persist (containers) | Partial | Branch/PR/commit, Pairing Mode sync to IDE | Partial | Via your own IDE (Pairing Mode) | Yes |
| CodeLayer / [HumanLayer](https://github.com/humanlayer/humanlayer) | Was: Electron+Go daemon, Apache-2.0. Now: rebuilt closed product at [humanlayer.com](https://humanlayer.com) | Old repo Apache-2.0 (deprecated); **rebuild not open source** | Old repo deprecated; new product live, $100/user/mo Pro | Sessions + tasks persist (cloud/local daemon) | Yes (daemon/cloud) | Worktree-centric review | Partial | Partial | Yes (multi-repo worktrees) |
| [VibeTunnel](https://github.com/amantus-ai/vibetunnel) | Mac menu-bar app (Swift) + Node/TS server, browser terminal | MIT | **Stalled** — last release ~Oct 2025 (1.0.0-beta.15.1), 4.6k★ | Yes — named (`vt title`), server-owned sessions | Partial (server restart = relaunch needed) | Follow-mode only | No | No | Dashboard of sessions |
| [Happy](https://github.com/slopus/happy) (happy-coder) | React Native/Expo + Node relay, E2E-encrypted | MIT | Active, 23.2k★ | Wraps `claude`/`codex`; sessions switch across devices | Partial (agent resume) | No | No | No | Session list |
| [Omnara](https://github.com/omnara-ai/omnara) | Was mobile/web command center; **repo pivoted 2026** to "API for production-grade agents" (Go + Postgres) | Apache-2.0 | Active but pivoted; command center at remote.omnara.com | Relay sessions; new platform: durable agent state in Postgres | Yes (server-side) | No | No | No | Dashboard |
| [Terragon](https://github.com/terragon-labs/terragon-oss) | Cloud orchestrator (Node, Docker, Postgres) | Apache-2.0 (snapshot) | **Dead** — shut down 2026-01-16 | Cloud tasks, not terminals | n/a | PR-based | No | No | Web dashboard |
| [Vibe Kanban](https://www.vibekanban.com/blog/shutdown) | Web kanban for agents | Apache-2.0 | **Bloop dead 2026-04-10**; community-maintained | Task-based, not terminals | n/a | Diff commenting | No | Click-to-edit | Board |

---

## 3. Deep dives

### 3.1 claude-squad — the canonical tmux+worktree TUI
- **What:** Go TUI managing Claude Code / Codex / Gemini / Aider instances, each in a tmux session + its own git worktree/branch. Central instance list, preview pane, diff tab, auto-accept background mode. 8.3k★, latest release v1.0.19 (published Jun 17 2026) — actively maintained. ([repo](https://github.com/smtg-ai/claude-squad), [releases](https://github.com/smtg-ai/claude-squad/releases))
- **P1:** Instances are named and detach into tmux, so they survive quitting the TUI — but nothing survives a reboot, and there's no relaunch/resume story.
- **P2–P5:** Diff view, checkout, commit/push helpers — but no SCM panel, no file explorer, no editor, single-repo-centric.
- **License:** **AGPL-3.0** — effectively rules it out as a fork base for gmux unless gmux itself is AGPL. Also Go/Bubble Tea TUI is the wrong stack for a Mac GUI app.

### 3.2 Crystal → Nimbalyst — the Electron lineage
- **Crystal** (stravu): Electron+React app running parallel Claude Code/Codex sessions in worktrees. MIT, 3.1k★, **deprecated Feb 2026** with users directed to Nimbalyst ([repo](https://github.com/stravu/crystal), [nimbalyst.com/crystal](https://nimbalyst.com/crystal/)).
- **Nimbalyst**: the successor. MIT, Electron + React + TypeScript, **Monaco editor** + Lexical + Excalidraw, session kanban, git operations (rebase/squash/inspection) in-app, embedded terminals, worktree management, multi-agent (Claude Code, Codex, OpenCode, Copilot), macOS/Windows/Linux + iOS/Android companions. 1.4k★ but 5,522 commits and heavy active development; "free for individuals" with a team/cloud business attached ([repo](https://github.com/nimbalyst/nimbalyst), [site](https://nimbalyst.com/)).
- **Assessment:** Nimbalyst is the closest *open-source* thing to "IDE furniture around agent sessions" (editor ✓, git ops ✓, multi-project ✓). But its center of gravity is session/kanban/worktree orchestration and visual docs — not durable named terminals. Terminal durability is agent-resume-based, not PTY-daemon-based.

### 3.3 Conductor — the polished closed-source native benchmark
- Mac app by Melty Labs (YC), free, **closed source**, reported $22M Series A and ~6-person team with fast release cadence. Runs Claude Code / Codex / Cursor / OpenCode in parallel; each task = workspace = worktree with its own branch, terminal, diff, review path; review → PR → merge → archive flow ([docs](https://www.conductor.build/docs/), [HN launch](https://news.ycombinator.com/item?id=44594584), [YC page](https://www.ycombinator.com/companies/conductor)).
- **Assessment:** Closest UX comp for "Mac-native, lightweight, multi-agent" — but closed source (nothing to fork), task/worktree-centric rather than named-terminal-centric, and no real editor or SCM panel in the VS Code sense. It is the product gmux must beat on the P1 axis, and its existence (plus funding) says the category is real.

### 3.4 cmux — the closest architectural precedent to gmux
- **What:** Native macOS terminal (Swift + AppKit) using **libghostty as a rendering library** (explicitly "not a fork of Ghostty"). Vertical tabs/workspaces showing git branch, cwd, ports, PR status; notification rings/badges for agents needing attention; embedded browser; SSH; extensive CLI/socket API; iOS beta. 25.8k★, ~9k commits, nightly builds ([repo](https://github.com/manaflow-ai/cmux), [site](https://cmux.com/)).
- **P1 — verified:** cmux restores windows, workspaces, panes, working directories and scrollback on relaunch, and the state "survives a full computer restart, not just quitting the app." Supported agent sessions resume automatically where hooks have saved a native session ID (i.e., layout-restore + `--resume`, not process reattach) ([cmux.com](https://cmux.com/)).
- **Gaps vs bar:** no Git GUI beyond branch/PR display (no stage/commit panel), no file explorer, no editor. Terminal-first by philosophy.
- **License:** **GPL-3.0-or-later with optional commercial licensing.** Forking means gmux is GPL (fine for a personal/OSS tool; a constraint if it ever becomes a product). Stack fit for a native gmux is otherwise perfect — it is a live proof that Swift+AppKit+libghostty+reboot-surviving-sessions works.

### 3.5 Superset — the Electron terminal-orchestrator
- Electron + React + Bun "terminal for orchestrating coding agents": each task in an isolated worktree with its own branch/terminal/env, built-in diff viewer with editing, sidebar monitoring of 10+ workspaces, command palette, one-click handoff to VS Code/Cursor. macOS primary, Linux experimental. 12.8k★, daily releases; app "free forever" ([repo](https://github.com/superset-sh/superset), docs: [Agents concept](https://superset-sh-superset.mintlify.app/concepts/agents)).
- **P1:** advertises persistent sessions that survive restarts (agent-resume-based).
- **License:** **Elastic License 2.0 — source-available, not OSI open source.** You can use/fork/modify/self-host, but not offer it as a commercial service. As a fork base for a distributed app it's legally murky and culturally awkward; as a reference implementation it's excellent.

### 3.6 coder/mux — AGPL desktop multiplexer from Coder
- "Desktop & browser app for parallel agentic development." Three isolation modes: local dir, git worktrees, SSH remote. Git divergence viewer, review interface, Plan/Exec modes, model routing (Anthropic/OpenAI/Ollama/OpenRouter), token/cost visibility. 2k★, 3.5k commits, active ([repo](https://github.com/coder/mux)). Chat/workspace UI rather than a terminal grid. **AGPL-3.0** — same fork problem as claude-squad. Coder Registry distributes it as a module ([registry](https://dev.registry.coder.com/modules/coder/mux)).

### 3.7 wmux — the P1 architecture done properly (and MIT)
- Electron + React 19 + TypeScript; **a standalone Node daemon owns every PTY** (node-pty) and persists scrollback to disk; the app talks to it over named-pipe RPC. Sessions survive app quits, crashes, **and OS reboots** (daemon runs as a background service); on relaunch the app reconnects and offers one-click "Resume" restoring exact agent conversations. Also: prompt fan-out to up to 8 worktree missions, per-hunk diff adoption combined into one atomic `git apply`, native Git tab (worktrees/PRs/comments), approval gates for dangerous commands, fleet approval inbox. Windows + macOS (arm64). MIT. But young: 334★, pre-1.0, building in the open since March 2026 ([repo](https://github.com/openwong2kim/wmux)).
- **Assessment:** the single best *reference architecture* for gmux's P1 (daemon-owned PTYs + scrollback persistence + resume), under the friendliest license. Too small/young to bet on as an upstream, but its design is directly liftable.

### 3.8 agent-deck — best-in-class session durability in a TUI
- Go + Bubble Tea TUI on tmux, with **SQLite state** (`~/.local/share/agent-deck/<profile>/state.db`) capturing tmux pane ID, cwd, tool command, conversation file path. Sessions survive restart and reboot: stopping suspends the pane; restart resumes with `--resume` when the tool supports it. Rich extras: session forking with context inheritance, MCP server pooling (85–90% memory savings claimed), cost dashboard, "conductor" supervisor sessions, webhooks/Telegram/Slack escalation, remote SSH instances, full worktree lifecycle incl. setup/teardown scripts. MIT, 691★, 2,778 commits, very active with fast PR turnaround ([repo](https://github.com/asheshgoplani/agent-deck)).
- **Assessment:** proof that P1-including-reboot is solvable with tmux + a state DB + agent resume flags. Wrong stack to fork for a GUI, ideal to study for the session-state schema.

### 3.9 ccmanager — the no-tmux TUI
- TypeScript TUI managing Claude Code / Gemini / Codex / Cursor / Copilot / Cline / OpenCode / Kimi sessions across worktrees and projects, using **its own PTY rather than tmux** (explicitly contrasted with claude-squad). Durability comes from the agents' own session files (`~/.claude/projects/...`) — it can copy session data between worktrees to carry context. Multi-project discovery, status hooks, devcontainer support. MIT, 1.2k★, active ([repo](https://github.com/kbwo/ccmanager), [npm](https://www.npmjs.com/package/ccmanager)).
- **Lesson for gmux:** in-process PTYs mean sessions die with the app; ccmanager papers over it with agent-level resume. That's the cheap 80% of P1.

### 3.10 Sculptor (Imbue) — container isolation instead of worktrees
- Desktop app running parallel Claude Code agents in **isolated Docker containers**; Pairing Mode bi-directionally syncs any agent's work into your own IDE. Branch/worktree/PR integration, multiple workspaces, Mac (Apple Silicon) + Linux. Repo is MIT, 213★, 1,819 commits, pushed May 2026 (v0.30 docs); free while in beta, BYO Claude subscription/API key ([repo](https://github.com/imbue-ai/sculptor), [site](https://imbue.com/sculptor/), [announcement](https://imbue.com/blog/sculptor-announce)).
- **Assessment:** heavyweight isolation model (Docker per agent) is the opposite of gmux's "lightweight shell" goal; Pairing Mode is a clever answer to "where do I edit?" (delegate to the user's IDE).

### 3.11 CodeLayer / HumanLayer — pivoted behind a paywall
- The famous monorepo ([humanlayer/humanlayer](https://github.com/humanlayer/humanlayer), 11.2k★, Apache-2.0, Electron WUI + Go daemon + claudecode-go) is now explicitly **deprecated**: "the code here is pretty much all deprecated — you can try the rebuild of humanlayer at humanlayer.com." The rebuilt product is a keyboard-first AI IDE with parallel sessions, multi-repo worktrees, QRSPI workflow, local + cloud daemons; Free tier (3 users / 200 sessions/mo), **Pro $100/user/mo**; the rebuild is **not open source** (they say they'll open-source "some building blocks") ([humanlayer.com](https://humanlayer.com)).
- **Assessment:** the deprecated Apache-2.0 code (including `claudecode-go` and their session-daemon design) is legally clean to mine, but it's an abandoned codebase now.

### 3.12 Remote-control relays: VibeTunnel, Happy, Omnara
These solve a different problem (control agents from elsewhere) but overlap on session plumbing:
- **VibeTunnel** — browser-terminal for your Mac: Swift menu-bar app + Node/TS server + Rust `vt-fwd` forwarder; named sessions (`vt title`), activity states, asciinema recording, Git follow-mode. MIT, 4.6k★. **Momentum has faded: last release 1.0.0-beta.15.1 ~Oct 2025** ([repo](https://github.com/amantus-ai/vibetunnel), [releases](https://github.com/amantus-ai/vibetunnel/releases), [origin story](https://steipete.me/posts/2025/vibetunnel-turn-any-browser-into-your-mac-terminal)). Its server-owns-the-PTY design is another P1 reference.
- **Happy (slopus/happy)** — MIT, 23.2k★, very active. E2E-encrypted mobile/web/CLI wrapper around `claude`/`codex` with instant device switching and voice. No git UI/editor; it's a remote control, not a workbench ([repo](https://github.com/slopus/happy)).
- **Omnara** — YC S25 "command center" (terminal+web+mobile). The repo has **pivoted in 2026** to "the API for production-grade agents" (Go + Postgres, durable agent state, Apache-2.0, 2.7k★); the original command-center lives at remote.omnara.com with a hosted plan (~$9/mo) ([repo](https://github.com/omnara-ai/omnara), [YC launch](https://www.ycombinator.com/launches/OCT-omnara-the-first-command-center-for-ai-agents-terminal-web-and-mobile)).

### 3.13 The dead: Terragon, Vibe Kanban (cautionary tales)
- **Terragon** — cloud background-agent orchestrator (web dashboard, `terry` CLI, GitHub-comment triggers, sandbox per task, auto-PRs). Shut down **2026-01-16**; full Node/Docker/Postgres codebase open-sourced Apache-2.0 as-is ([terragon-oss](https://github.com/terragon-labs/terragon-oss)).
- **Vibe Kanban** — the canonical agent kanban (Apache-2.0). Bloop shut down **2026-04-10**: "the vast majority of users were free users" and no viable business model; project handed to the community ([shutdown post](https://www.vibekanban.com/blog/shutdown)).
- **Lesson:** free-tool economics in this category are brutal; building gmux for yourself on OSS is the right frame, and picking dependencies requires checking pulse, not just stars (Crystal, HumanLayer-old, VibeTunnel, Terragon, Vibe Kanban all decayed within ~a year).

### 3.14 The wider field (from the [awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) census)
Adjacent entrants worth knowing exist (not individually deep-dived): native-macOS minis — **agterm** (umputun; workspaces + dashboard), **clave** (split layouts + SSH), **diri** (parallel agents "with persistence"), **constellagent** (terminal + editor + worktree per agent), **supacode**, **aizen**, **Fletch**, **GraphCode**; TUIs — **dmux** (standardagents; worktrees over tmux), **herdr** ("persistent workspaces, tabs, panes"), **amux** (andyrewlee, minimal worktree TUI; note a separate [mixpeek/amux](https://github.com/mixpeek/amux) web control-plane also exists), **NTM** (named tmux manager), **agent-console** (Rust, reads providers' own transcripts); Electron/web — **Emdash**, **parallel-code**, **jean**, **CodeNomad**, **tlbx** ("persistent PTY sessions"), **Tempest** (Tauri); plus AWS Labs' [cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator). None of these checked all of P1–P5 either; the pattern of the whole category is orchestration-first, IDE-furniture-last.

---

## 4. How the category solves (or dodges) P1 — the three durability architectures

1. **tmux underneath** (claude-squad, agent-deck, dmux, NTM, AWS CAO): sessions survive the manager's exit for free; **reboot does not preserve them**. agent-deck gets to reboot-survival by pairing tmux with a SQLite session registry and re-launching tools with `--resume`. Cost: tmux dependency, escape-sequence quirks, "terminal inside terminal" rendering, no GUI affordances.
2. **Daemon-owned PTYs** (wmux's Node daemon over named pipes; VibeTunnel's server; tlbx): the GUI is a thin client; quit/crash of the UI never kills a shell; scrollback persisted to disk; reboot survival = auto-start daemon + agent resume. This is the architecture that actually delivers gmux's P1 end-to-end, and wmux proves it works in Electron at pre-1.0 scale.
3. **Layout-restore + agent-native resume** (cmux, Superset, ccmanager, Crystal/Nimbalyst): PTYs die with the app; on relaunch the app restores tabs/cwd/scrollback and re-attaches *agent conversations* via saved session IDs (`claude --resume <id>`, `codex resume`). cmux demonstrates this feels like full persistence in practice — including across reboots — for agent workloads, though arbitrary long-running processes (dev servers) are not preserved.

**Implication for gmux:** the honest P1 answer is a hybrid — (2) for app-restart survival of *everything*, plus (3) for reboot recovery of *agents*. Both halves have MIT/GPL reference implementations to read (wmux, cmux) and a state schema to steal (agent-deck's SQLite: name, cwd, command, conversation-file path).

---

## 5. Who comes closest to the full gmux bar — and what every one of them is missing

**Closest overall:**
1. **cmux** — nails P1 (named workspaces, restart+reboot survival, agent resume), P5 (vertical tabs across projects), P6 (native Swift/AppKit + libghostty). Missing P2 (no stage/commit UI), P3, P4 entirely — deliberately terminal-only. GPL.
2. **Nimbalyst** — nails P4 (Monaco), most of P2 (git ops in-app), P5 (multi-project), MIT. But it's session/kanban-centric: no durable *named terminal* model (P1 is agent-resume only), and it's a heavyish Electron visual workspace, not a lightweight shell (P6 middling).
3. **Superset** — strong P1 (persistent sessions)/P5, good diff UX; but ELv2 license, Electron+Bun+Postgres stack is heavy, and no SCM panel/explorer/editor beyond diffs.
4. **Conductor** — best Mac-native polish and closest product philosophy; closed source, so it's a benchmark, not a base.

**What literally nobody in the category ships:** the gmux combination — *long-lived named terminals as the primary object* (not tasks/worktrees) + a VS Code-grade SCM panel + a git-decorated file tree + a click-to-edit editor + multi-project tabs in one lightweight window. Every product bets on worktree-per-task fan-out and diff-review because their imagined user delegates to agents and reviews output. The gmux user *lives in* the terminals and wants IDE furniture around them. That gap is the product.

Secondary gaps across the board: (a) reboot survival of non-agent processes — no one does it (would need launchd-managed daemon + declared restart commands per session, which is exactly gmux's "relaunch the agent that was running" idea); (b) VS Code-quality git-status *decorations on a file tree* — absent everywhere except full IDEs; (c) copy-SHA-grade commit history UI — absent everywhere in this category.

---

## 6. Forkability assessment

| Candidate | License verdict | Stack fit for gmux | Code-quality/maturity signal | Verdict |
|---|---|---|---|---|
| **wmux** | MIT — clean | Electron path: high (daemon+node-pty+xterm.js is exactly P1) | Pre-1.0, 1 primary author, 334★ | **Best architecture donor; risky as upstream — vendor the design, not the dependency** |
| **cmux** | GPL-3.0-or-later — forces gmux to be GPL if forked/linked | Native path: perfect (Swift+AppKit+libghostty) | 9k commits, nightlies, huge traction | **Fork only if gmux commits to GPL; otherwise the existence-proof to imitate (libghostty + session-restore + hooks-saved resume IDs)** |
| **Nimbalyst** | MIT — clean | Electron path: high (Monaco, git ops, sessions already built) | 5.5k commits, active company behind it | **Best "strip it down" base on the Electron path: delete kanban/visual-doc layers, add named-terminal daemon** |
| **Crystal** | MIT but deprecated | Electron | Frozen Feb 2026 | Mine for worktree/session plumbing only |
| **agent-deck** | MIT | TUI (Go/Bubble Tea) — wrong shape | Very active solo-led | Don't fork; **copy its SQLite session-state schema + resume logic** |
| **ccmanager** | MIT | TUI (TS) — wrong shape | Active | Reference for agent session-file handling (`~/.claude/projects`) |
| **claude-squad** | **AGPL-3.0** | TUI | Active | Avoid as code source |
| **coder/mux** | **AGPL-3.0** | Electron/web | Active, corporate-backed | Avoid as code source |
| **Superset** | **ELv2 (source-available, not OSS)** | Electron | Very active | Read, don't fork |
| **HumanLayer (old monorepo)** | Apache-2.0 but deprecated | Electron WUI + Go daemon | Abandoned | Mine `claudecode-go` + daemon/session design freely |
| **Terragon-oss** | Apache-2.0 snapshot | Cloud orchestrator — wrong shape | Dead | Ignore except for resume/sandbox patterns |
| **VibeTunnel** | MIT | Swift app + Node server | Stalled (~Oct 2025) | Mine the server-owned-PTY + `vt` wrapper design |

---

## 7. Bottom line for gmux

1. **The exact product gmux wants does not exist.** The category (30+ live projects, two funded companies, several corpses) is uniformly *task/worktree-orchestration-first*. Nobody ships "many long-lived named terminals across many projects + VS Code-grade SCM + decorated file tree + editor, in one lightweight window." Conductor and cmux prove demand for the Mac-native shell; Nimbalyst proves the IDE-furniture parts are buildable in Electron; nobody has combined them.
2. **P1 is a solved problem in pieces — steal the proven hybrid.** (a) A small background daemon (launchd) owns PTYs and persists scrollback (wmux, MIT, is the working reference; VibeTunnel's Swift+forwarder is another). (b) A session registry (agent-deck's SQLite schema: name, cwd, command, agent conversation-file/ID) enables reboot recovery by relaunching `claude --resume <id>` / `codex resume` per named session (cmux proves the UX of this feels like true persistence). Do both; do not depend on tmux.
3. **Fork-base decision tree:** Native path → don't fork cmux unless GPL is acceptable; instead use **libghostty** directly (as cmux demonstrates is viable) and imitate its restore/resume mechanics. Electron path → **Nimbalyst (MIT)** is the strongest legal+feature base (Monaco editor, git ops, session management already present) with the kanban/visual layers stripped and a wmux-style PTY daemon added. Avoid AGPL bases (claude-squad, coder/mux) and ELv2 (Superset) entirely.
4. **Treat sustainability as a first-class selection criterion.** In 12 months this category killed Terragon, Vibe Kanban, Crystal, old-HumanLayer, and stalled VibeTunnel. Prefer designs you can vendor/own over upstreams you must track; prefer boring durable primitives (PTY daemon, SQLite, git CLI, agent `--resume`) over any single tool's ecosystem.
5. **Differentiators to keep (nobody has them):** named-terminal-as-primary-object; VS Code SCM-grade staging/history with copy-SHA; git-decorated file explorer; multi-project tabs replacing cmd+` window juggling; reboot restoration that relaunches the exact agent per named session.

### Sources (primary)
- https://github.com/smtg-ai/claude-squad · https://github.com/smtg-ai/claude-squad/releases
- https://github.com/stravu/crystal · https://nimbalyst.com/crystal/ · https://github.com/nimbalyst/nimbalyst
- https://www.conductor.build/docs/ · https://news.ycombinator.com/item?id=44594584 · https://www.ycombinator.com/companies/conductor
- https://github.com/manaflow-ai/cmux · https://cmux.com/
- https://github.com/superset-sh/superset · https://superset-sh-superset.mintlify.app/concepts/agents
- https://github.com/coder/mux · https://dev.registry.coder.com/modules/coder/mux
- https://github.com/openwong2kim/wmux
- https://github.com/asheshgoplani/agent-deck
- https://github.com/kbwo/ccmanager
- https://github.com/imbue-ai/sculptor · https://imbue.com/sculptor/
- https://github.com/humanlayer/humanlayer · https://humanlayer.com
- https://github.com/amantus-ai/vibetunnel · https://github.com/amantus-ai/vibetunnel/releases
- https://github.com/slopus/happy
- https://github.com/omnara-ai/omnara · https://www.ycombinator.com/launches/OCT-omnara-the-first-command-center-for-ai-agents-terminal-web-and-mobile
- https://github.com/terragon-labs/terragon-oss
- https://www.vibekanban.com/blog/shutdown
- https://github.com/andyrewlee/awesome-agent-orchestrators
- https://github.com/awslabs/cli-agent-orchestrator
