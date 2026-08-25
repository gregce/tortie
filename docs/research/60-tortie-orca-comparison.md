# Research 60. Tortie and Orca product comparison

**Research phase R60. Study document. Written 2026-08-21.**

Author's note. Three investigators independently mapped Tortie, mapped Orca, and compared the
two products. I reconciled their findings against both source trees before writing this document.
Tortie was read at commit `58b3a9e676e8`, where `package.json` says 0.65.0. The latest public tag
is `v0.62.1`, 11 commits behind that tree. Orca was read at commit `4fd93ead1999`, where
`package.json` says 1.4.178-rc.2. Orca was clean. Tortie had one unrelated modified file,
`.claude/scheduled_tasks.lock`, which this study did not touch.

This was a read-only product and architecture study. Nobody launched either app, ran a
performance test, contacted a remote machine, or tested reliability. The findings describe the
behavior present in source and documentation. They are not a benchmark of runtime stability,
visual polish, or usability. Tree-only Tortie work and experimental Orca work are named rather
than silently counted as released core functionality.

---

## 0. The answer

Orca wins the broad task-to-merge agent workflow. Tortie wins the narrower job of keeping many
named agent threads alive, understandable, and quiet.

Orca is a strong source of individual workflow ideas and a poor product template for Tortie as a
whole. Its defining unit is usually a task, isolated worktree, and agent. Tortie's defining unit
is a project and a durable named session. Orca optimizes distribution, orchestration, review, and
shipping. Tortie optimizes continuity, recovery, spatial memory, and the question "what needs me
now?"

Both products have real terminal durability. It would be false to say that Orca merely restores
tabs. Orca has a separate daemon, live PTYs after app relaunch, restart-safe scrollback, and
provider-aware cold resume. Tortie's advantage is not sole ownership of persistence. Its
advantage is making a narrower continuity guarantee legible and explicit through a private
bundled tmux server, manifest-first creation, saved output, restore evidence, and a resume command
that waits for the human to press Enter.

The useful adoption path is small:

1. Close the remote attention gap.
2. Let review notes travel from a diff back to a chosen session.
3. Make return after time away easier with a structural Catch Me Up view.
4. Add optional worktree grouping and comparison without making worktrees mandatory.

Do not copy Orca's runtime marketplace, scheduled automation, dashboards, task-manager spine,
general computer control, or cloud command plane. Those additions would replace Tortie's promise
rather than deepen it.

## 1. The two promises

| Question | Tortie | Orca |
| --- | --- | --- |
| Primary unit | A project containing durable named sessions | A task, isolated worktree, and agent |
| Core promise | Work continues, attention stays with the human, and important context is recoverable | Agents can be distributed, steered, reviewed, and shipped across the whole development loop |
| Best fit | A developer keeping several long-running conversations, shells, and repositories open | A developer sending separable tasks across agents, worktrees, hosts, and devices |
| Product character | Calm, session-first macOS workbench | Broad, cross-platform agent development control plane |
| Primary strength | Continuity, recovery, attention, and explicit state | Isolation, orchestration, review, automation, and platform coverage |
| Deliberate boundary | Not a dashboard, task manager, full IDE, automation engine, or extension host | Accepts a much larger product, platform, and security surface |

Tortie's promise is stated most directly in `docs/ZEN-OF-TORTIE.md:129-132`: work continues,
attention stays with the human, and nothing important gets lost. `PRODUCT.md:15-21` makes the
target job concrete. One developer is replacing four to six VS Code or Cursor windows while
keeping parallel agent threads alive.

Orca's README at `/Users/gdc/orca/README.md:18-21` calls it "The AI Orchestrator for 100x
builders" and leads with agents working side by side in isolated worktrees. Its product then
extends from that unit into terminal, editor, Git, task providers, remote execution, mobile
control, browser and computer use, skills, plugins, artifacts, and scheduled automation.

## 2. Tortie feature map

### 2.1 Workspace and entry

- One main window holds project tabs. The active tab scopes sessions, files, source control,
  editor state, search, and sidebar state.
- Home can open a folder, open one on a machine, create a project and initialize Git, clone a
  repository, or reopen a recent project. Folder drop, Finder Open With, and `tortie .` are also
  supported.
- The four project views are Explorer, Search, Source Control, and Context.
- Project switching, session switching, splits, focus, zoom, and common file and Git actions have
  central keyboard commands in `src/shared/keymap.ts`.

### 2.2 Agents and sessions

- The registry contains 13 entries. Eleven are launchable terminal CLIs. Cursor IDE and VS Code
  Copilot are capture-only watchers. The distinction is recorded in
  `src/main/agents/registry.ts:18-27`.
- First-class entries describe launch arguments, executable discovery, exact binary selection,
  resume behavior, transcript harvesting, status evidence, image delivery, multiline input,
  capture, and install provenance.
- A user can add or patch an agent with JSON. Tortie loads data rather than third-party runtime
  code, and any process-bearing result still requires confirmation.
- Named sessions can be created, renamed, attached, detached, resized, ended, restarted, restored,
  split, grouped, moved between focus regions, and reopened through Past Sessions.
- Removed sessions are tombstoned for 90 days rather than immediately forgotten.

### 2.3 Durability and recovery

- Live sessions run in a private tmux server outside Electron. Quitting, crashing, or updating the
  app does not end them. The packaged application carries a pinned tmux and ignores the user's
  tmux server and configuration.
- Reboot cannot preserve a live OS process. Tortie instead recreates a shell, replays saved
  scrollback, and types the exact agent-specific resume command without pressing Enter.
- Absolute executable paths and resume arguments reduce accidental changes caused by later PATH
  drift.
- A SQLite manifest, restore journal, verified backup ring, durable transactions, and fault harness
  make partial creation and restoration inspectable rather than ambiguous.
- Restore results distinguish failure, shell-only recovery, transcript recovery, and an armed
  agent conversation. Exit status, signal, saved-output age, recent output, and shortfalls remain
  visible.

This is Tortie's most defensible differentiator. It is a recovery contract, not only a persistent
terminal implementation.

### 2.4 Attention

- Main evaluates local sessions and publishes running, idle, and needs-input state with recent
  output and activity time.
- Cmd+J lists sessions needing input across projects. Project dots, session dots, and the Dock
  signal make the answer visible without creating a monitoring dashboard.
- Remote sessions deliberately do not produce needs-input today. The current backlog records that
  native agent status evidence is local and the remote feature is not queued at
  `docs/BACKLOG.md:11319-11324`.

The last point is the largest gap inside Tortie's own promise. A remote session can be alive and
asking a question while Tortie's cross-project attention surface remains silent.

### 2.5 Terminal, files, editor, and previews

- xterm terminals attach lazily and support configurable scrollback, copying, rich HTML copy,
  viewport or pane image capture, saved output, image drop, and agent-specific multiline input.
- The file tree shows Git state, propagates changed state to parents, dims ignored files, filters
  entries, and supports local create, rename, move, duplicate, trash, reveal, and Open With.
- Modified files open as a read-only diff against HEAD by default. Monaco editing is one explicit
  switch away.
- Markdown, SVG, and HTML support source and preview modes. Raster images can be viewed and
  compared with their HEAD version.
- Friendly previews refuse secret-looking files. HTML is scriptless and networkless by policy.

### 2.6 Search, Git, and CI

- Cmd+P searches files in the active project or all open projects, including remote projects.
- Ripgrep content search supports regex, case, whole word, includes, excludes, ignore control,
  streaming counts, result caps, stale state, and refresh.
- Content search currently sends one active `repoPath` from
  `src/renderer/search/store.ts:444-453` and `:523-575`. The README sentence saying that ripgrep
  searches every open project is false. Cmd+P has that scope. Content search does not.
- Local symbol navigation uses a tree-sitter index and VS Code fuzzy scoring. Remote symbol parity
  does not exist.
- Source Control covers staged, unstaged, untracked, and merge changes, plus stage, unstage,
  discard, commit, branch operations, fetch, pull, push, sync, publish, history, commit details,
  tags, cherry-pick, and opening a commit on GitHub.
- GitHub Actions runs, jobs, and steps are read through the local `gh` CLI. The surface is read
  only.

### 2.7 Context, capture, settings, and system behavior

- Context inventories the skills, MCP servers, hooks, plugins, and instruction files each agent
  will load. It exposes source, scope, precedence, and reload behavior rather than flattening them
  into one misleading list.
- Local skills can be searched, planned, installed, removed, audited, previewed, and pinned.
- The launch-time context snapshot is advisory and attached to the session.
- Optional SpecStory capture writes a conversation to `.specstory/history`. Cloud sync happens
  only when the user chooses it and signs in.
- Settings cover general behavior, agents, keyboard commands, launch defaults, capture,
  appearance, machines, and diagnostics.
- The app is signed and notarized, supports self-update, retains bounded local logs and crash
  dumps, redacts home paths, and does not upload diagnostics.

### 2.8 Remote machines

- A machine can be added, confirmed, tested, prepared, and scanned through direct SSH. Tortie can
  install its own SSH key but installs no Tortie application or proprietary service on the far
  machine.
- Remote sessions can be launched, typed into, renamed, ended, restored, and reopened. Remote
  restore also arms the conversation command without pressing Enter.
- A remote folder is a first-class project tab with tree, content search, Cmd+P, changed files,
  branches, history, Actions runs, Context, saved output, image delivery, counterpart lookup,
  clone, and copy.
- The current 0.65.0 tree, beyond public tag `v0.62.1`, adds opt-in save under one confirmed write
  root, new folder, rename, stage, and unstage. The current API is visible at
  `src/shared/ipc/machines.ts:1361-1390`.
- Remote new-file creation, trash, delete, move, duplicate, discard, commit, push, pull, sync,
  fetch, branch mutation, symbols, Context writes, and needs-input are not present.

Remote is correctly marked Early in the README. It has meaningful read and session capability,
but it does not yet provide the same human loop as local work.

## 3. Orca feature map

### 3.1 Tasks, worktrees, and agent execution

- Orca creates local, SSH, runtime, and experimental VM workspaces from repositories, folders,
  tasks, base branches, setup instructions, sparse checkout rules, prompts, and agents.
- Managed worktrees can be related, grouped, compared, slept, cleaned up, and merged.
- The README promises one-prompt fan-out across several isolated worktrees. The underlying
  worktree and CLI orchestration model is strong. The present GUI quick-create path queues
  separate creations in `useComposerState.ts:4593` rather than exposing one atomic fan-out and
  rollback operation, so the exact GUI claim is ahead of the implementation.
- Orca recognizes roughly 35 named agent types and can launch arbitrary terminal commands. Twelve
  named agents have explicit cold-resume arguments in
  `/Users/gdc/orca/src/shared/agent-session-resume.ts:5-20` and `:242-279`.
- Agent surfaces include working, blocked, waiting, done, model, prompt, account, usage, subagent,
  and tool information where the provider exposes it.

### 3.2 Persistence, terminal, and orchestration

- A separate daemon owns durable PTYs. Terminals can remain live when the desktop app closes and
  regain restart-safe scrollback when it returns.
- Cold restoration retains enough provider data to resume supported conversations.
- Terminals support flexible splits, GPU rendering, rich interaction, and cross-platform use.
- The CLI exposes worktree, terminal, agent, task, worker, mailbox, message, gate, browser,
  computer, mobile, and orchestration commands with structured output.
- Coordinators can dispatch workers, send messages, wait on gates, inspect progress, stop work,
  and release resources.

This is the main difference in product stance. Tortie makes the human the attended operator of
durable sessions. Orca also makes agents and scripts operators of the development environment.

### 3.3 Editor, files, review, and Git

- Orca has Monaco editing, autosave, combined diffs, conflict handling, inline review comments,
  PDF, CSV, notebook, rich Markdown, Mermaid, image, and other previews.
- Review notes can identify a file and line range and be sent directly to an agent. The send loop
  is implemented in
  `/Users/gdc/orca/src/renderer/src/components/editor/ReviewNotesSendMenuContent.tsx:43`.
- Source control extends through worktree lifecycle, branches, checks, pull requests, merge
  requests, conflicts, review, and merge.
- Task intake covers GitHub, GitLab, Linear, and Jira through
  `/Users/gdc/orca/src/shared/task-providers.ts:1`. Hosted review creation also covers Bitbucket,
  Azure DevOps, and Gitea in `hosted-review-creation-providers.ts:3`.

Orca closes the loop from task intake to isolated implementation to human review to hosted merge.
Tortie currently covers the middle review and local Git portion of that loop.

### 3.4 Browser, computer use, remote execution, and mobile

- An embedded Chromium browser can provide page, element, HTML, CSS, and screenshot context to an
  agent. Design Mode and browser CLI commands make the page an agent-controlled development
  surface.
- The CLI also drives desktop applications and mobile emulators.
- SSH development includes remote files, search, Git, worktrees, setup hooks, detached terminals,
  reconnection, and port forwarding.
- WSL and headless `orca serve` extend the same control model beyond the desktop app.
- Mobile surfaces cover monitoring, steering, terminal, files, source control, browser, native
  chat, and notifications. Relay-backed parts of this system are beta.

### 3.5 History, accounts, skills, plugins, automations, and artifacts

- AI Vault and native chat keep conversation history and support continuation across agents.
- Account and usage surfaces expose provider identity, allowance, and rate-limit information.
- Skills can be installed, updated, bundled, and shared.
- Third-party plugins can add workers and panels through consented capabilities and isolated host
  processes. The product itself labels plugins experimental at
  `/Users/gdc/orca/src/renderer/src/components/settings/plugins-search.ts:5`.
- Scheduled automations have prechecks, run history, and execution controls.
- Artifacts can be produced, published, and shared.
- Workspace Space is marked Beta. Native chat, Activity and Agents views, the agent dashboard,
  terminal attention and hibernation, ephemeral VMs, plugins, and parts of mobile relay are
  experimental or beta rather than one uniformly mature core.

### 3.6 Platform reach

Orca targets macOS on Arm and Intel, Windows, Linux, WSL, headless servers, and iOS and Android
companions. That reach is a decisive functional advantage and a permanent engineering cost.
Tortie's Apple silicon-only stance gives up reach in return for a much smaller durability and UI
test matrix.

## 4. Direct comparison

| User job | Tortie | Orca | Verdict |
| --- | --- | --- | --- |
| Keep work alive after closing the UI | Private tmux owns live processes outside Electron | Daemon owns live PTYs outside the desktop app | Real capability in both. Tortie makes the contract clearer. Orca exposes more control |
| Recover after reboot | Replays saved output and arms the exact resume command for human confirmation | Performs provider-aware cold restoration and can continue automatically | Tortie wins explicit safety. Orca wins automation breadth |
| Manage many independent repositories | Project tabs are the stable spatial spine | Rich workspace, group, task, and worktree hierarchy | Tortie is calmer for persistent repos. Orca is stronger for task-shaped checkouts |
| Run competing solutions to one task | Several sessions can run, but Tortie does not isolate or compare candidates | Managed worktrees and orchestration support parallel candidates | Orca decisively |
| Know which local session needs input | Cmd+J, project and session marks, recent output, and Dock signal | Notifications, unread state, activity and agent views | Tortie for quiet local attention |
| Know what needs attention across machines and devices | Remote needs-input is absent | Remote state, mobile, notifications, and broader activity history | Orca decisively |
| Support many agent CLIs | 11 launchable agents plus two capture sources, each with an explicit behavior contract | Roughly 35 known agents, arbitrary CLI commands, and 12 explicit cold-resume recipes | Orca for breadth. Tortie for clarity about deep support |
| Use a powerful terminal | Durable xterm, splits, groups, focus, zoom, scrollback, images, and tmux behavior | Durable cross-platform terminal with broader daemon and orchestration features | Orca for breadth |
| Review agent changes | Diff-first editor, staging, history, branches, and Actions runs | Rich diff, conflicts, inline notes to agents, hosted review, and checks | Orca closes more of the loop |
| Keep review minimal and familiar | Modified files open against HEAD by default | More surfaces and modes surround the review | Tortie has the sharper default |
| Manage worktrees | Worktree-aware project tabs, without a managed lifecycle | Create, relate, configure, compare, clean, and merge managed worktrees | Orca decisively |
| Search and navigate | Cmd+P across projects, active-project ripgrep, and local symbols | Quick navigation across worktrees, files, agents, commands, and context | Orca for breadth. Tortie's content search claim needs correction |
| Work with Git and hosted providers | Strong local Git, history graph, and read-only GitHub Actions | Full worktree, checks, issue, PR, MR, review, and merge workflow | Orca decisively |
| Bring external work into the app | GitHub Actions runs only | GitHub, GitLab, Linear, Jira, and other hosted review providers | Orca decisively |
| Understand agent context | Inventory and precedence across skills, MCP, hooks, plugins, and instructions | Skill management, bundles, plugins, and agent context surfaces | Tortie wins "what will load and which copy wins?" Orca wins distribution and extension |
| Develop on another machine | Direct SSH, no installed Tortie service, strong read surfaces, and bounded writes | Full remote development, WSL, headless runtime, ports, and richer mutation | Orca for capability. Tortie for the smaller trust footprint |
| Automate browser or computer actions | Deliberately absent, apart from safe HTML preview | Embedded browser, design mode, browser CLI, desktop control, and emulators | Orca, by product choice |
| Control work programmatically | `tortie .` opens a project. Session control remains attended in the app | Broad JSON CLI, worker orchestration, messages, gates, and automation | Orca decisively |
| Continue from another device | No mobile or browser client | Mobile and headless surfaces | Orca decisively |
| Recover conversation history | Optional SpecStory Markdown capture and session-linked snapshots | AI Vault, native chat, account-aware continuation, and cross-agent history | Orca is richer. Tortie is simpler and file-based |
| Extend the product | Config can describe agents but cannot load third-party runtime code | Capability-gated plugins, panels, workers, and marketplace behavior | Orca for extensibility. Tortie for auditability |
| Run across operating systems | macOS Apple silicon | macOS Arm and Intel, Windows, Linux, WSL, headless, iOS, and Android | Orca decisively |
| Keep the product promise coherent | Explicit refusal of dashboards, task-running, debugging, LSP, and extensions | Broad all-in-one platform | Tortie for focus. Orca for coverage |

## 5. Similar words that hide different products

### 5.1 Supported agents

An arbitrary CLI command can run in both products. That is shallow support. Deep support means the
product also knows how to find the executable, launch it, detect state, capture its conversation,
resume it, deliver files, handle multiline text, and explain failure. Orca has the larger roster.
Tortie makes the smaller deep contract easier to audit. Marketing should say "11 launchable agents
plus two IDE capture sources" until the distinction changes.

### 5.2 Persistent terminals

Both products keep real processes beyond the desktop window. Tortie's authority is a private
bundled tmux server. Orca's authority is its daemon. After a reboot, both need a replacement
process and provider-specific resume evidence. Tortie exposes the boundary and asks the human to
fire the command. Orca owns a broader continuation path. Architecture should be judged against
the product promise rather than copied for its own sake.

### 5.3 Projects and workspaces

A Tortie project is usually a repository or folder the human wants to keep open. An Orca workspace
is often an isolated checkout created for one task. Similar tab bars therefore support different
time horizons and different cleanup expectations.

### 5.4 Skills and plugins

Tortie's Context view explains the complete context stack and its precedence. Orca installs,
updates, shares, and bundles skills. Tortie can display plugins that an agent loads but Tortie does
not execute product plugins. Orca does. Calling both features "plugin support" would erase the
important security difference.

### 5.5 Remote development

Both products can run agents and inspect work remotely. Orca owns a full remote development and
relay stack. Tortie uses direct SSH, installs no application service remotely, treats authority as
`{machineId, path}`, and currently offers uneven capability. Tortie's model is smaller and easier
to explain. It is not functional parity.

## 6. Architecture choices behind the result

| Choice | What it enables | What it constrains |
| --- | --- | --- |
| Tortie's private bundled tmux | App-quit and crash survival without owning a PTY daemon or touching user tmux | Reboot recovery still needs snapshots and provider resume evidence |
| Tortie's manifest-first durability | Inspectable partial creates, explicit restore outcomes, backup generations, and fault testing | Considerable correctness work for every new session mutation |
| Tortie's declarative agent registry | Honest per-agent launch, status, resume, capture, image, and input behavior | Provider drift must be continuously verified |
| Tortie's explicit workspace authority | A remote path cannot accidentally become a local file or process target | Every local capability needs a separate remote implementation |
| Tortie's direct SSH and allowlisted scripts | Small remote footprint with no Tortie service installed | More round trips, dependency on far-side tools, and incomplete parity |
| Tortie's refusal of a runtime extension host | Small execution and consent boundary | No marketplace-level extensibility or product panels |
| Orca's daemon and CLI control plane | Durable terminals, headless control, automation, workers, and other clients | Orca must own a larger privileged API and compatibility surface |
| Orca's worktree-first task model | Parallel isolated candidates, clean comparison, review, and merge | Exploratory and long-lived work can be forced toward task lifecycle vocabulary |
| Orca's browser, computer, remote, and mobile stack | A complete cross-device agent control plane | Cloud, transport, identity, permissions, and automation become core ownership |
| Orca's plugins and provider state | Fast extension and a richer integrated environment | Third-party execution and credential surfaces require permanent security work |

Production TS and TSX, excluding tests, was about 785 files and 240,566 lines in Tortie and 8,057
files and 487,560 lines in Orca during the study. The exact counts are not quality measures. They
show that product breadth carries ownership cost even when total lines differ by only about two
times.

## 7. Additions worth considering for Tortie

| Addition | User value | Fit | Effort | Strategic risk | Smallest useful form |
| --- | --- | --- | --- | --- | --- |
| Remote needs-input detection | Makes the core attention promise true for remote sessions | High | High | High | Read allowlisted status evidence through the existing SSH connection, install no daemon, and keep unknown first-class |
| Diff review notes sent to a session | Turns a discovered problem into precise agent feedback without changing tools | High | High | Medium | Record file, range, and note, let the human choose a session, then require an explicit Send |
| Structural Catch Me Up | Removes reconstruction after time away | High | High | Medium | Show changed files, recent commands, last agent output, current state, and transcript links with no model call |
| Worktree sibling groups and compare | Supports competing approaches without becoming a task orchestrator | High | High | High | Discover existing worktrees, group their project tabs, and compare changed-file summaries |
| Open captured conversation from Past Sessions | Makes existing SpecStory capture useful for recovery and handoff | Medium | High | Low | Open the Markdown in Tortie's existing preview and editor |
| Session purpose and links | Preserves why a long-running session exists | Medium | High | Low | Optional one-line intent plus an issue, PR, or documentation URL that opens externally |
| Correct or build global content search | Aligns the product claim with actual behavior | Medium | High | Medium | Fix README wording immediately, then fan search across explicit workspace targets with source labels and caps |
| Narrow macOS notifications | Reaches the human when Tortie is hidden | Medium | Medium | Medium | Opt-in needs-input and failure notifications with no count, feed, or history |
| Remote development port forwarding | Makes a far-side web app inspectable without manual SSH setup | High | Medium | High | Detect ports only for the active remote project and expose explicit Forward, Open, and Stop actions |
| Durability confidence detail | Makes the strongest architecture legible | Medium | High | Low | On demand show live state, last snapshot, resumability, saved-output age, and remote connection age |
| Provider availability hint | Helps choose an agent that can finish before launching it | Medium | Medium | Medium | On-demand last-known reset and availability in Create Session, with no account switching or credential ownership |

### 7.1 Recommended order

1. Build review notes sent to a session. It closes a daily loop with moderate implementation risk.
2. Ship structural Catch Me Up and open captured conversations. They directly deepen return and
   recovery without introducing an automation platform.
3. Research remote needs-input again. It is the largest promise gap and the hardest correctness
   problem. The recorded decision not to build it must be explicitly revisited.
4. Prototype worktree sibling grouping and comparison. Keep existing worktrees optional and do not
   auto-fan prompts or auto-merge in the first version.
5. Add explicit remote port forwarding only after remote state and write parity are trustworthy.

## 8. Orca ideas Tortie should refuse

| Orca capability | Ruling | Reason |
| --- | --- | --- |
| Third-party runtime plugins, panels, and marketplace | Refuse | Directly crosses the permanent no-extension-runtime boundary in `CLAUDE.md:20-32` |
| Scheduled automations and configuration-triggered runs | Refuse | Tortie requires an attended human confirmation before process-bearing bytes run |
| Agent dashboards, Kanban boards, activity feeds, and maps | Refuse | The Zen rejects supervisor surfaces that reward watching the machinery |
| Full native issue and project management | Refuse | It changes the product unit from durable work to tickets. Optional links are enough |
| Mandatory worktree-per-session | Refuse | Exploratory, operational, and long-lived sessions do not all belong to task branches |
| General browser automation, desktop control, and mobile emulator control | Refuse | These create a separate automation product and security boundary |
| Full mobile steering and cloud relay | Refuse unless strategy changes | Command and control requires cloud identity, sync, transport, and permissions ownership |
| Provider credential and account switching | Refuse | A read-only availability hint captures much of the value without owning secrets |
| Cross-platform parity as a near-term goal | Refuse | The compatibility matrix would compete with durability and remote correctness work |
| Orca's custom daemon architecture | Refuse as a goal | Tortie's private tmux is already the smaller mechanism that fits its promise |

## 9. Product and documentation corrections

Three statements should be made precise before adding anything:

1. Replace “13 agents” with “11 launchable agents plus two IDE capture sources” wherever launch
   capability could be inferred.
2. Say that Cmd+P can search files across open projects while ripgrep content search currently
   searches the active project.
3. Keep remote save, mkdir, rename, stage, and unstage labeled as tree-only 0.65.0 behavior until a
   public release contains them. Keep Remote marked Early after that release because attention,
   file mutation, Git mutation, symbols, and Context still lack parity.

Orca needs the same honesty discipline in this comparison. Its daemon persistence and cold resume
are real. Its one-action GUI fan-out claim is not yet an atomic workflow. Workspace Space, mobile
relay, plugins, VMs, native chat, dashboard, and several activity surfaces remain beta or
experimental.

## 10. Final position

Tortie should not compete on the number of panels, providers, platforms, or agent-controlled
surfaces. Orca wins that contest and demonstrates how much continuing ownership it requires.

Tortie can win a smaller and more coherent promise:

> Tortie is the calm place where long-running agent work survives and asks for attention only when
> necessary.

The next additions should make that sentence more true. Remote attention, return-after-absence,
and a direct path from review note to session all qualify. Dashboards, automation, product plugins,
and a task-manager spine do not.
