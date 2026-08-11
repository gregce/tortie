# Agent workspace product inventory

**Snapshot:** 2026-08-11  
**Purpose:** Track products that overlap Tortie’s promise, identify the weaker product shapes that keep reappearing, and distinguish real threats from superficial similarity.

This inventory extends [research 04](04-agent-managers.md), [research 03](03-existing-terminals.md), [research 10](10-multi-project-ux.md), and [The Zen of Tortie](../ZEN-OF-TORTIE.md). Research 04 contains the deeper architecture, licensing and survival analysis. This document is the faster-moving market map.

The comparison is intentionally narrow. “Weaker” means weaker at Tortie’s job:

> Keep the work alive. Keep the machinery invisible. Bring the human only what needs a human.

It does not mean the product is bad. Many products below are better at worktree isolation, pull-request production, mobile control, terminal performance or full IDE behavior because they optimize for a different job.

## 1. The Tortie lens

| Axis | The Tortie bar |
| --- | --- |
| **Live continuity** | Closing or crashing the interface does not kill arbitrary local processes. |
| **Recovery continuity** | After reboot, the exact agent conversation, project, command, name and layout can be restored without reconstruction. |
| **Attention routing** | One quiet cross-project surface answers “what needs me now?” Questions, approvals and failures outrank activity. |
| **Spatial identity** | Projects and named sessions retain stable places. Work is not reduced to an undifferentiated chat/task inbox. |
| **CLI openness** | Any real terminal agent or ordinary shell works; first-class integrations improve fidelity but are not admission tickets. |
| **Familiar workbench** | Files, source control, editing and shortcuts are where VS Code-trained hands expect them. |
| **Invisible machinery** | No multiplexer rituals, mandatory worktrees, recovery commands or orchestration vocabulary leak into normal use. |

The market usually delivers two or three of these. Tortie matters only if it delivers the combination.

## 2. The recurring weaker product shapes

### A. The terminal grid

Several terminals put four agents side by side and call the concurrency problem solved. This improves visibility but still makes the human scan every pane. Without durable identity, cross-project attention and recovery semantics, it is a tidier wall of terminals.

Typical loss: **organization without continuity; visibility without attention compression.**

### B. The tmux wrapper

Tmux-backed TUIs often have excellent app-quit durability and weak everything else. Sessions become list rows, worktrees and keybindings; files, source control and editing live elsewhere. The durable machinery is exposed rather than absorbed into the product.

Typical loss: **durability without a humane workbench.**

### C. The worktree factory

The dominant orchestrator model is task → branch → worktree → agent → diff → PR → archive. It is excellent for separable delegated tickets. It is a poor description of exploratory, long-lived work in which shells, agents, servers and investigations accumulate around a project.

Typical loss: **throughput replaces continuity; the developer becomes a queue manager.**

### D. The chat control plane

Chat-first products preserve conversations and produce reviewable changes, but the underlying terminal, process and development environment become secondary. They often support only agents with an adapter, SDK or provider account.

Typical loss: **conversation history is mistaken for the whole working state.**

### E. The agent sidebar inside an IDE

Full IDEs have the editor, tree and SCM already. Their weaker implementations treat agents as chat history attached to one editor window. Local terminals and arbitrary processes remain owned by the UI lifecycle, while cross-project work leaks into more windows or a global inbox.

Typical loss: **excellent coding furniture without trustworthy process continuity or coherent project spatiality.**

### F. The remote-control relay

Mobile and browser relays make terminals reachable elsewhere. They solve access, not the local workbench: no project-scale file context, SCM, editing surface or calm cross-project spatial model.

Typical loss: **reachability without orientation.**

### G. The orchestration dashboard

Kanban boards, activity feeds, progress counts and agent trees make parallelism observable. They also invite the human to watch the machinery. This is the clearest violation of the Zen.

Typical loss: **progress theatre consumes the attention the product claims to protect.**

## 3. Direct terminal and session products

| Product | Primary object | What genuinely works | Where it is weaker for Tortie’s job | Threat |
| --- | --- | --- | --- | --- |
| [cmux](https://cmux.com/) | Native terminal workspace | Excellent native terminal, vertical workspaces, splits, notification rings, agent hooks, browser and automation API. | Current restore docs say layout and metadata return and supported agents resume from captured tokens; arbitrary live process state is not checkpointed. No file tree, SCM or editor. | **High** |
| [Mosaic Terminal](https://mosaicterminal.dev/) | Project workspace | Relaunches Claude, Codex, OpenCode and Goose with resume flags; activity center and notifications span projects; saved visual layouts. | Relaunch continuity rather than live-process reattachment; no VS Code-grade SCM, decorated tree or editor. | **High** |
| [Airport](https://get-airport.com/) | Agent session grid | One window, active/working/waiting state, direct attention language, open source. | Public material establishes visibility and status, but not app-quit/reboot durability, deep project restoration or IDE furniture. | **High watch** |
| [wmux](https://github.com/openwong2kim/wmux) | Persistent PTY fleet | A daemon owns PTYs and scrollback; reboot conversation resume, Git/worktree tab and fleet approval inbox. This is the closest P1 reference architecture. | Young product; no full editor or decorated project tree; fleet/worktree framing can become operational rather than spatial. | **High architecture** |
| [Agent of Empires](https://www.agent-of-empires.com/) | tmux session | Same sessions through TUI and web, status overview, worktrees, Docker isolation, ACP structured views, MIT. | Tmux and task machinery remain first-class; no familiar editor/SCM workbench; browser/TUI dashboard rather than one calm project shell. | Medium |
| [agent-deck](https://github.com/asheshgoplani/agent-deck) | Named tmux session | SQLite registry, tmux durability, reboot resume, groups, remote sessions, MCP pooling and escalation integrations. | TUI with no editor/tree/SCM; substantial session-management vocabulary; closer to a fleet console. | Medium |
| [claude-squad](https://github.com/smtg-ai/claude-squad) | Worktree instance | Proven tmux detach model, central list, preview and diff flow. | No reboot recovery, editor, file explorer or real SCM; single-repo/worktree-centric and AGPL. | Medium-low |
| [dmux](https://dmux.ai/) | Worktree pane | Tmux panes, worktrees, multi-repo attachment, file browsing and code/diff preview. | Worktree/pane mechanics are the product; no durable reboot story or full project workbench. | Medium |
| [ccmux](https://github.com/epilande/ccmux) | Existing tmux pane | Background daemon observes sessions and jumps directly to agents that need attention. | Adds an attention sidebar to tmux rather than absorbing tmux into a coherent application; no files, SCM or editor. | Medium pattern |
| [tmux-agent-sidebar](https://github.com/hiroppy/tmux-agent-sidebar) | Existing tmux pane | Real-time state across tmux windows plus worktree creation and cleanup. | A plugin for people who already accept tmux’s model and rituals; narrow attention tool, not a workbench. | Low |
| [ccmanager](https://github.com/kbwo/ccmanager) | Worktree/agent session | Broad CLI-agent support, multi-project discovery, status hooks and agent-native session-file handling. | Own PTYs die with the app; resume papers over process loss; TUI and worktree organization only. | Medium pattern |
| [SlyCode](https://www.slycode.ai/) | Task card workspace | Each card retains context, terminal and recoverable history; task continuity across desktop and phone. | The card is the spine, and the site explicitly expects a separate editor for manual work. It preserves task history more than a complete live project environment. | Medium-high |
| [StarkIDE](https://www.starkide.com/) | Named agent pane | Multi-terminal splits, named panes, agent state and a broader IDE loop. | Public claims emphasize parallel organization and review; true PTY ownership, reboot semantics and global attention fidelity are not established. | **Watch** |
| [strIDEterm](https://strideterm.com/) | Terminal workspace/run | Cross-platform terminal workspace with Git, Docker and a supervised Worker/Judge verification loop. | Orchestration and autonomous loops are central; long-lived cross-project spatial continuity and quiet human attention are secondary. | Medium |
| [Dorchestrator](https://dorchestrator.app/) | Planned agent run | Local-first planning, multi-agent coordination, terminal sessions, Skills and run review. | A run/orchestration product rather than a durable everyday shell; public material does not establish arbitrary-process reattachment or VS Code-grade project furniture. | Watch |
| [QuadCode](https://getquadcode.com/) | Four-agent comparison | Very legible side-by-side multi-agent comparison and prompt broadcast. | Concurrency is capped and comparison-oriented; no durable identity, attention routing, project context, SCM or editor story. | Low |
| [Shunt](https://shunt.app/) | Remote tmux session | Secure remote access to existing tmux sessions and permission prompts. | Solves remote reachability, not the local project workbench or hidden machinery. | Low |
| [VibeTunnel](https://github.com/amantus-ai/vibetunnel) | Browser terminal session | Server-owned sessions, browser/mobile access and named session support. | Remote terminal dashboard; no editor/SCM/tree, partial reboot story and faded release momentum in the August research. | Low |
| [Happy](https://github.com/slopus/happy) | Mobile agent conversation | Strong device switching, E2E encryption, voice and broad reach. | Agent wrapper/relay with no project workbench, Git surface or arbitrary terminal-process continuity. | Low |

## 4. Worktree, task and pull-request control planes

| Product | Primary object | What genuinely works | Where it is weaker for Tortie’s job | Threat |
| --- | --- | --- | --- | --- |
| [Conductor](https://www.conductor.build/) | Isolated workspace/branch | Polished native Mac experience, clear parallel workspace model, status, diff, test, merge and PR flow. It now supports both isolated workspaces and multiple agents sharing one workspace. | Work starts as a task stream and ends as a reviewed branch. Persistent ordinary shells and exploratory sessions are not the primary object; editor/SCM depth is below VS Code. | **High** |
| [T3 Code](https://t3.codes/) | Agent thread/branch | Open-source multi-agent control plane, BYO subscriptions, per-thread branches and one-click PR production. | Chat/thread and PR first; the terminal is something it says agents deserve better than. Conversation/branch continuity is not arbitrary process continuity. | **High watch** |
| [Superset](https://github.com/superset-sh/superset) | Worktree workspace | Persistent agent workspaces, diff editing, branch isolation and monitoring at scale. | Heavy orchestrator, worktree-first, incomplete IDE furniture and ELv2 constraints. | High |
| [coder/mux](https://github.com/coder/mux) | Agent workspace/chat | Local, worktree and SSH isolation; plan/exec modes, review, divergence and cost visibility. | Chat/review control plane rather than terminal-native project home; AGPL and task-oriented. | Medium-high |
| [Vibe Kanban](https://www.vibekanban.com/docs/core-features/monitoring-task-execution) | Kanban task attempt | Broad agent support, automatic worktrees, logs, approvals, process views, diffs and repeatable task lifecycle. | Ephemeral task attempts and kanban status are the spine. It exposes activity rather than compressing it and historically demonstrated weak free-tool economics. | Medium |
| [Nimbalyst](https://github.com/nimbalyst/nimbalyst) | Session/card/workspace | Closest open-source combination of Monaco, project tree, Git operations, visual documents and agent sessions. | Visual workspace/kanban center of gravity; agent-resume continuity rather than a durable named PTY substrate; broad surface area. | **High** |
| [Hyperlane](https://hyperlaneide.com/) | Parallel agent task | Full cross-platform IDE, CLI/ACP agent transport, state and review in one product. | Public positioning is orchestration/review/ship; process durability, reboot semantics and quiet cross-project attention require verification. | **High watch** |
| [Sculptor](https://github.com/imbue-ai/sculptor) | Containerized agent workspace | Strong isolation and clean pairing back into the user’s existing IDE. | Docker-per-agent is heavy; editing remains elsewhere; the product coordinates delegated tasks rather than preserving one coherent local place. | Medium |
| [HumanLayer](https://humanlayer.com/) | Worktree task/session | Local/cloud daemons, parallel sessions and a disciplined review workflow. | Closed rebuild, expensive team product and worktree process; more production control plane than personal durable shell. | Medium |
| [Crystal](https://github.com/stravu/crystal) | Worktree session | Important early precedent for parallel agent sessions in an Electron app. | Deprecated in favor of Nimbalyst; no longer a live product bet. | Historical |
| [Terragon OSS](https://github.com/terragon-labs/terragon-oss) | Cloud task | Background sandbox and automatic PR architecture. | Company shut down; cloud job dashboard, not a local persistent workbench. | Historical |

## 5. Full IDEs and large-platform convergence

| Product | What now overlaps | Where Tortie can still be better | Threat |
| --- | --- | --- | --- |
| [VS Code Agent Sessions and Agents window](https://code.visualstudio.com/docs/agents/agents-window) | Cross-workspace session list, names/status, multiple sessions side by side, changes panel, workspace file explorer, local/background/cloud/third-party agents, remote access and a separate Agent Host that owns sessions independently from display clients. | Tortie must win on real CLI terminals and arbitrary local processes, app-quit continuity, account/provider independence, project tabs as spatial memory, and a sharper global “needs me” signal rather than a general agent inbox. | **Very high** |
| [Warp](https://www.warp.dev/) | Agent panes, named sessions, blocks, cloud agents and relaunch-style session recovery in a high-quality terminal. | No true local process reattachment, limited IDE furniture, cloud/account gravity and a busier agentic product surface. | High |
| [Zed](https://zed.dev/) | Excellent editor, Git panel, decorated project tree, worktrees and agent support in a fast native app. | Terminal PTYs still belong to the editor lifecycle in the August research; no proven durable terminal substrate or Tortie-style attention layer. | High if durable PTYs ship |
| [Wave Terminal](https://www.waveterm.dev/) | Persistent workspace/block model, editor blocks, tabs, files and durable remote SSH sessions. | Local terminals are not durable; no VS Code-grade SCM/decorated tree; block abstraction can feel like a dashboard. | Medium-high |
| [iTerm2](https://iterm2.com/) | Gold-standard per-session server reattachment and deep tmux control-mode integration. | No project model, SCM, tree, editor or agent attention routing; machinery remains terminal-centric. | Architecture precedent |
| [WezTerm](https://wezterm.org/) | Detached mux server provides real live-process durability under an MIT terminal. | No reboot recovery or IDE/attention layer; release stability and mux maintenance concerns in the August research. | Architecture precedent |
| [Ghostty](https://ghostty.org/) | Best-in-class native terminal and increasingly embeddable libghostty foundation. | No session durability, project model or agent attention surface by itself. | Component, not competitor |

## 6. The products closest to the Tortie thesis

### 1. VS Code Agents window — strongest distribution and convergence threat

This is no longer merely “VS Code with chat.” Microsoft now describes sessions as the unit of agent work, presents them across workspaces in a dedicated window, allows side-by-side chats, includes changes and file panels, supports third-party agents, and is moving ownership into a client-independent Agent Host.

Tortie cannot position itself as “the place that shows multiple agents beside code.” VS Code now does that. Tortie’s proof must be stronger and more concrete:

- close Tortie while a shell, server and agent continue running;
- reopen into the same named project geometry;
- recover the exact agent after reboot;
- use Claude, Codex, OpenCode or an ordinary shell without routing the workflow through Copilot;
- surface only true questions, approvals and failures across projects.

### 2. cmux — closest terminal-native experience

cmux is the best benchmark for native terminal quality, universal CLI compatibility, panes, workspace identity and agent notification rings. It proves this category can feel fast and Mac-native.

Its current documentation is also a precise boundary: layout and metadata restore, and supported agent sessions can resume when hooks captured a token, but arbitrary terminal applications do not checkpoint live process state. Tortie’s bundled tmux layer is meaningful only if that difference is reliable and invisible.

### 3. Mosaic and Airport — closest language-level competitors

Both market the emotional problem Tortie identified: stop hunting through windows, know what needs attention, and start where you stopped. Mosaic documents cross-project activity and resume-flag recovery. Airport documents active/working/waiting states in one view.

These products are the warning that the tagline is not a moat. Tortie must demonstrate a deeper workbench and more trustworthy continuity.

### 4. wmux — closest durability architecture

wmux is the clearest evidence that a GUI-independent PTY owner, persisted scrollback, agent resume and a fleet attention inbox can work together. Tortie’s advantage is not the existence of this architecture; it is using an older, bundled tmux substrate and presenting it as a calmer, more familiar project shell.

### 5. Conductor and Nimbalyst — strongest product-shape competitors

Conductor is the polish benchmark for Mac-native parallel work. Nimbalyst is the breadth benchmark for an open Electron workspace with editor, files, Git and agents. Tortie’s narrower thesis must produce a more coherent everyday home rather than competing feature for feature.

## 7. What the inventory says Tortie must not become

1. **Another four-pane terminal.** Splits are presentation, not product value.
2. **Another worktree kanban.** Worktrees are an option, not the ontology of all work.
3. **Another agent inbox.** A list of everything running is not attention routing.
4. **Another chat history browser.** Conversation persistence does not preserve servers, shells, scrollback, cwd, layout and project state.
5. **Another partial IDE.** Familiar files/SCM/editing are supporting furniture; recreating extensions, debugging and language tooling would lose the plot.
6. **Another orchestration spectacle.** Agent trees, throughput counters and live activity feeds reward hovering.
7. **Another provider shell.** Tortie should become more useful as CLI agents proliferate, not wait for integrations before they are usable.

## 8. Defensible product claims

Claims that are already crowded:

- “Run multiple coding agents.”
- “One window for all your agents.”
- “Know when an agent needs attention.”
- “Persistent sessions.”
- “Bring your own Claude/Codex subscription.”
- “Parallel worktrees with review.”

Claims Tortie can still make if the implementation proves them:

- **Closing the app does not stop the work.** This includes arbitrary shells and local processes, not only supported agent conversations.
- **Every project returns as a place, not a list.** Named sessions, splits, focus, editor state and project boundaries return together.
- **Reboot recovery restores intent.** The exact agent conversation and command are restored, not merely the terminal layout.
- **Attention is semantic and cross-project.** Questions, approvals and failures rise; ordinary activity stays quiet.
- **Any terminal tool belongs immediately.** Hooks improve signals, but a CLI agent needs no bespoke transport or provider account to exist in Tortie.
- **VS Code habits transfer without bringing VS Code’s window model.** Familiar furniture, one coherent multi-project shell.

## 9. Watchlist

Review monthly:

1. **VS Code Agent Host / Agents window:** app-quit ownership, arbitrary terminal support, cross-workspace attention states and account requirements.
2. **cmux:** whether session restore gains arbitrary live-process reattachment, file/Git surfaces or a stronger global attention view.
3. **Mosaic and Airport:** durability architecture, licensing, editor/SCM expansion and traction.
4. **wmux:** stability, daemon/scrollback behavior and movement toward editor/tree surfaces.
5. **Hyperlane and StarkIDE:** what “state,” persistence and IDE depth mean in shipping builds.
6. **Conductor:** movement from isolated task workspaces toward shared long-lived project work.
7. **Nimbalyst and T3 Code:** whether chat/card/worktree products become complete everyday workbenches.

New entrants should be added only when they have a working build, public code or sufficiently concrete documentation. A landing page claiming “parallel agents” is a watchlist item, not evidence of continuity.

## 10. Sources and evidence standard

The detailed rows inherited from research 03/04 were verified against official repositories, product documentation, release notes and shutdown notices on 2026-08-09. The following products were rechecked or added from official sources on 2026-08-11:

- [VS Code: Your Home for Multi-Agent Development](https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development)
- [VS Code Agents window](https://code.visualstudio.com/docs/agents/agents-window)
- [VS Code Agent Host architecture](https://code.visualstudio.com/docs/agents/concepts/agent-host)
- [cmux](https://cmux.com/) and [session restore behavior](https://cmux.com/docs/getting-started)
- [Mosaic Terminal](https://mosaicterminal.dev/)
- [Airport](https://get-airport.com/)
- [Agent of Empires](https://www.agent-of-empires.com/)
- [SlyCode](https://www.slycode.ai/)
- [StarkIDE](https://www.starkide.com/)
- [strIDEterm](https://strideterm.com/)
- [Dorchestrator](https://dorchestrator.app/)
- [QuadCode](https://getquadcode.com/)
- [Hyperlane](https://hyperlaneide.com/)
- [T3 Code](https://t3.codes/)
- [Conductor parallel agents](https://www.conductor.build/docs/concepts/parallel-agents)
- [Vibe Kanban task execution](https://www.vibekanban.com/docs/core-features/monitoring-task-execution)
- [awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) for discovery only; individual claims require a primary source.

This is a source-based inventory, not a hands-on usability ranking. “Not established” means the public primary source did not prove the behavior; it does not mean the behavior is impossible or absent.
