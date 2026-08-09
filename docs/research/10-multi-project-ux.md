# Research: One-Window Multi-Project UX (P5) and the Overall Interface Model

**Dimension:** P5 — tabs across the top spanning multiple projects in one window; plus the overall information architecture (IA) that P1–P4 hang off of.
**Date researched:** 2026-08-09. All claims verified against live sources (URLs inline); licenses and maintenance status noted per project.

---

## 1. Why this dimension matters

The user's core pain is not "I need a better terminal" — it's *"I juggle many projects across many Cursor windows via cmd+` and hate it."* Every tool the user could adopt today fails P5 in a specific, documented way. The IA decision (project tabs vs. global session list vs. hybrid) is the single most consequential UX choice for gmux, because it determines where terminals, git state, and agent status live in the hierarchy.

---

## 2. How existing tools model multi-project

### 2.1 Summary table

| Tool | Multi-project model | One window? | License | Maintenance (as of Aug 2026) |
|---|---|---|---|---|
| VS Code / Cursor | Multi-root workspace (folders merged into ONE workspace) or 1 window/project | No (in practice) | MIT (Code-OSS); Cursor proprietary | Very active |
| Zed | 1 window = 1 project, explicit team position | No | GPL-3.0 (editor), AGPL (collab server), Apache-2.0 (GPUI) | Very active |
| Wave Terminal | Workspaces (named, icon+color), but 1 active workspace per window | No (switch, not tabs) | Apache-2.0 | Active — v0.14.5, Apr 16 2026; ~22k stars |
| tmux + sesh/tmuxinator | Session-per-project; picker to switch | Yes (1 client, switch sessions) | tmux ISC; sesh MIT; tmuxinator MIT | All active |
| iTerm2 | Window arrangements + profiles | No (arrangements restore windows) | GPL-2.0 | Active |
| claude-squad | Flat instance list (per repo run from) | Yes (TUI) | **AGPL-3.0** | Active — last release v1.0.19, Jun 17 2026; 8.3k stars |
| Conductor | Workspace list per repo, multiple repos in one window | Yes | Proprietary freeware (Melty Labs, YC S24) | Active |
| Crystal → Nimbalyst | Sidebar: projects → sessions (worktrees) | Yes | MIT (both) | Crystal **deprecated Feb 2026**; Nimbalyst active |
| Vibe Kanban | Kanban board of tasks across projects | Yes (web UI) | Apache-2.0 | **Sunsetting**, community-maintained; v0.1.41 Apr 3 2026; 27.7k stars |
| Claude Code `claude agents` (agent view) | Global session table grouped by state or directory | Yes (TUI) | Proprietary (Anthropic) | Active, research preview |

### 2.2 VS Code / Cursor multi-root workspaces — and why the user still has many windows

VS Code's multi-root workspaces let you add several folders to *one* workspace ([docs](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces)). But the folders are **merged, not isolated**: one shared terminal panel, one search index, one settings blend, one debug configuration namespace. The exact complaint is captured in [microsoft/vscode#322745 "Single Window Multi-Project Workspaces with Project Tabs"](https://github.com/microsoft/vscode/issues/322745) (filed June 24, 2026 — i.e., people are asking for gmux's P5 *right now*): multi-root "still behave[s] as one workspace" and doesn't provide "fully isolated project environments" — separate terminals, tasks, debug configs per project tab. It was **closed as duplicate**; VS Code has no plan to ship project tabs. Related: [#293272](https://github.com/microsoft/vscode/issues/293272) asks to open multiple workspaces in a single window.

**Lesson for gmux:** the demand for "project tabs, each an isolated environment, one window" is validated by the VS Code issue tracker itself. gmux's tab must scope *everything* (terminals, git sidebar, file tree) to the project — the thing VS Code refuses to do.

### 2.3 Zed

Zed is explicit: **each window = one project**; the team has said they have no plans to change it ([discussion #39292](https://github.com/zed-industries/zed/discussions/39292), [#8611](https://github.com/zed-industries/zed/discussions/8611)). Mitigations are a recent-projects switcher (`alt-cmd-o`, `projects: open recent`) that *focuses the existing window* for an already-open project — a nice touch worth copying for gmux's "open project" flow (idempotent open: never two tabs for the same project). Zed's [Parallel Agents docs](https://zed.dev/docs/ai/parallel-agents) push worktrees for parallel agent work, confirming the industry pattern (§7).

### 2.4 Wave Terminal

Wave's [workspaces](https://docs.waveterm.dev/workspaces) are named environments with icon + color, each holding its own tabs and layouts; saved workspaces persist "tabs, layouts, and terminal and AI histories" automatically. But **only one workspace can be active per window** — switching swaps the whole window's content, and if the workspace is open in another window, focus jumps to that window. So Wave models multi-project as *switch*, not *tabs side-by-side*. Ephemeral-until-saved is an interesting wrinkle: "A new workspace is ephemeral. When a window closes, its workspace, along with all its tabs, is deleted unless the workspace is saved."

Wave is Electron + Go backend, Apache-2.0, ~22k stars, latest release v0.14.5 (Apr 16, 2026) with tab F2-rename and cached tabs for fast switching ([repo](https://github.com/wavetermdev/waveterm), [releases](https://github.com/wavetermdev/waveterm/releases), [tabs docs](https://docs.waveterm.dev/tabs)).

**Lesson for gmux:** Wave's workspace = the right *unit* (name, icon, color, persisted tab set) but the wrong *navigation* (modal switch). gmux should lift the unit and put it in an always-visible tab strip. Wave's F2-rename and per-workspace accent color are directly stealable UX.

### 2.5 tmux session-per-project conventions

The dominant terminal-native convention: **one tmux session per project, named after the project directory**. [sesh](https://github.com/joshmedeski/sesh) (MIT, active, 2.7k stars) automates it — "automatically names sessions based on git repo, git remote, or directory," detects the git root, integrates zoxide, and gives a fuzzy picker to jump between project-sessions ([write-up](https://www.joshmedeski.com/posts/smart-tmux-sessions-with-sesh/)). [tmuxinator](https://github.com/tmuxinator/tmuxinator) (MIT) is the declarative variant: a YAML per project (`~/.config/tmuxinator/<project>.yml`) describing windows/panes/commands, so a project's terminal layout is *reproducible*.

**Lesson for gmux:** (a) default project/session names should be derived (git root basename), never demanded from the user; (b) a per-project declarative "what terminals to launch" manifest (tmuxinator-style) is the proven pattern for P1's reboot-restore story — restore layout, re-run each pane's configured command (`claude --resume`, `codex resume`).

### 2.6 iTerm2 arrangements / restoration

iTerm2's [session restoration](https://iterm2.com/documentation-restoration.html) runs jobs in long-lived server processes so sessions survive app crash/upgrade; window arrangements save window/tab/pane layout with profiles. But: **"Rebooting terminates jobs entirely; only window contents restore afterward"** — arrangements restore the *shape*, not the *running programs*. There is no first-class project concept; arrangements are global, manually saved snapshots.

**Lesson for gmux:** iTerm2 proves layout-restore and process-restore are separate problems. gmux's P5 IA should store per-project layout declaratively (so reboot-restore is "replay the manifest"), independent of the reattach mechanism (P1 dimension).

### 2.7 Agent orchestrators: claude-squad, Conductor, Crystal/Nimbalyst, Vibe Kanban, Claude Code agent view

These are the closest relatives to gmux and the best source of status-UX patterns.

**claude-squad** ([repo](https://github.com/smtg-ai/claude-squad), AGPL-3.0 — *forking is viral-license territory; read-for-ideas only*): TUI with a flat **instance list + preview pane + diff tab**. Each instance = tmux session (`claudesquad_<title>_<timestamp>`) + git worktree in `~/.claude-squad/worktrees/` on branch `<prefix>_<name>_<timestamp>`. Four statuses: `Ready` (awaiting input), `Running`, `Loading`, `Paused`. Status detection is a **silence heuristic**: it polls tmux pane content and SHA256-hashes it — content changing ⇒ `Running`; no change for a while ⇒ `Ready` ([architecture per DeepWiki](https://deepwiki.com/smtg-ai/claude-squad); preview refresh 100ms, metadata/diff poll 500ms). Pause = commit changes, detach tmux, remove worktree; resume recreates it. Last release v1.0.19, Jun 17 2026 — actively maintained (research 04 §3.1).

**Conductor** ([conductor.build](https://conductor.build), [docs](https://www.conductor.build/docs/)): free proprietary **native Mac app** by Melty Labs. Left sidebar lists **workspaces** (each = a git worktree + branch + its own agent, terminal, diff, review path) and supports multiple repos in one window; the list shows "who is working and what needs attention," with **notifications when an agent requires input** and a history view filterable by repo/branch/PR ([overview](https://codepick.dev/en/guides/conductor-build-intro/), [Grokipedia entry](https://grokipedia.com/page/Conductorbuild)). Conductor's own guidance: 3–5 parallel workspaces is the sweet spot.

**Crystal → Nimbalyst** ([stravu/crystal](https://github.com/stravu/crystal), MIT, Electron; **deprecated Feb 2026** in favor of [Nimbalyst](https://nimbalyst.com/)): Crystal pioneered "run N Claude Code sessions in parallel git worktrees, one desktop app" with project-level workspace management, session status tracking, diff view, and detection of uncommitted changes. Nimbalyst (MIT desktop app, Electron, free for individuals) keeps parallel sessions + kanban organization and makes **worktrees optional per session** — an important design retreat: not every session wants isolation (see §7).

**Vibe Kanban** ([BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban), Apache-2.0, 27.7k stars, **sunsetting** as of 2026, community-maintained): tasks-as-cards across projects, agents execute in worktree-isolated workspaces, board filterable to "unblocked work," desktop notifications jump you back to the card. The kanban IA is optimized for *task throughput review*, not for *living inside terminals* — a different animal than gmux, but its "filter to what needs me" idea matters.

**Claude Code agent view** (`claude agents`, [docs](https://code.claude.com/docs/en/agent-view), research preview): the most refined status UX to date. A single table of background sessions **grouped by state with "needs input" pinned to the top** (groups: Pinned / Ready for review / Needs input / Working / Completed), toggle to group **by directory** instead (`Ctrl+S`). Each row: status icon (Working animated / Needs-input yellow / Idle dimmed / Completed green / Failed red / Stopped grey), session name (auto-generated by a Haiku-class model from the first prompt, renameable `Ctrl+R`, settable via `claude --bg --name`, resumable via `claude --resume <name>`), a one-line AI summary of what the session is doing, age, and linked PR number. `Space` peeks without attaching; `Enter` attaches. **The terminal tab title shows the awaiting-input count while agent view is open.**

**Lesson for gmux:** the field has converged on a small set of states (Working / Needs input / Idle / Done / Failed), on "needs input floats to top," and on cheap-to-scan rows (name + status + one-liner + age). Two of the five orchestrators surveyed (Crystal, Vibe Kanban) died in the last 6 months — the category churns fast; gmux building on boring primitives (tmux, git, libgit2) rather than on any of these apps is the safer bet. The only OSI-licensed, alive, desktop-app option to *fork* would have been Crystal (MIT, Electron) — now deprecated. Nimbalyst is MIT but is a much bigger product (kanban, mockups, teams) than gmux wants.

---

## 3. UI pattern analysis: project tabs vs. global session list

Two IA archetypes appear across the field:

**A. Project-first (spatial):** top-level tabs, one per project; inside each tab, that project's terminals + git sidebar + file tree. You *go to* a project. (What the user does today with Cursor windows; what VS Code users beg for in #322745; Wave workspaces minus the tab strip.)

**B. Session-first (status-driven):** one global list of agent sessions across all projects, sorted/grouped by "needs me." You *triage* sessions. (claude-squad, Conductor, agent view, Vibe Kanban.)

| Criterion | A: Project tabs | B: Global session list |
|---|---|---|
| Matches user's current mental model (Cursor windows → tabs) | ✅ direct upgrade | ❌ new model to learn |
| P2/P3/P4 (git sidebar, file tree, editor) have an obvious home | ✅ per-tab | ⚠️ awkward — which project's tree? |
| "Which agent needs me right now?" across 8 projects | ⚠️ needs per-tab badges | ✅ core strength |
| Scales to many sessions per project | ✅ terminal stack inside tab | ✅ list grows |
| Wall-clock cost of checking everything | O(tabs) clicks | O(1) glance |

**Neither alone is right.** The user's workflow is project-spatial (they live inside a project: terminals + git + files), but the *interrupt* workflow ("an agent somewhere is blocked") is status-driven. The resolved pattern — used in effect by Conductor (workspace list + per-row attention state) and by agent view's tab-title count — is:

> **Project tabs as the primary IA, plus (a) status badges on every tab and (b) a global cross-project "attention" overlay (popover/palette) that lists sessions needing input and jumps you to the right tab + terminal.**

This is Archetype A wearing Archetype B as a heads-up display, and it's the recommendation (§9).

---

## 4. Session naming & renaming UX

Verified patterns worth adopting:

- **Derived defaults, never prompts.** sesh names the session from the git root basename ([sesh](https://github.com/joshmedeski/sesh)); Claude Code auto-names from the first prompt via a small model ([agent view docs](https://code.claude.com/docs/en/agent-view)). gmux: project tab = repo dir name; terminal session default = agent name + ordinal ("claude-1") or, if cheap, a summary of the first prompt line.
- **Rename in place, single keystroke.** Wave: F2 on tab ([release notes](https://docs.waveterm.dev/releasenotes)); agent view: `Ctrl+R`; also double-click-to-rename is table stakes in every tabbed macOS app. Names must persist across restart (P1) — the name is the durable identity users reattach by (`claude --resume <name>` works by name).
- **Name = address.** claude-squad embeds the title in the tmux session name (`claudesquad_<title>_<ts>`); agent view resumes by name. gmux should make the user-visible session name the stable key for the underlying tmux/session primitive so restore-by-name is trivial.
- **Uniqueness by suffix, not rejection.** claude-squad appends a timestamp; do the same rather than erroring on duplicate names.

---

## 5. Per-tab visual indicators

What each project tab should carry (all precedented):

1. **Project name** (+ optional user-set color/icon, per Wave workspaces).
2. **Git branch** — always visible (P2 requirement); VS Code shows it in the status bar per window; with tabs it moves onto/near the tab or into the per-tab status strip.
3. **Dirty count** — modified/untracked file count, same data as P3's tree decorations, rolled up (e.g., `●7`).
4. **Agent status roll-up** — the max-urgency status across the tab's sessions, as a colored dot: 🟡 needs input > 🔵 working > ⚪ idle, plus a numeral when >1 session needs input. Precedent: agent view's state colors and its tab-title awaiting-count; Conductor's "needs attention" list; [tmux-agent-status](https://github.com/partner0/tmux-agent-status) (working/waiting/idle circles in tmux window status for Claude Code/OpenCode) proves the same taxonomy in the tmux world.
5. Optional: linked PR indicator per session (agent view shows `#1234`).

Dock/menu-bar level: total "needs input" count as an app badge, so the user can leave gmux entirely (precedent: every notification-hook blog post exists because people leave the terminal — e.g. [alexop.dev](https://alexop.dev/posts/claude-code-notification-hooks/)).

---

## 6. Detecting "agent awaiting input" — the signal stack

No single reliable signal exists; every shipping tool layers heuristics. Ordered from most to least reliable for gmux (which owns the terminal, so it can read *all* of these):

1. **Agent-native hooks (highest fidelity, agent-specific).**
   - *Claude Code:* the `Notification` hook fires when Claude is waiting for input/permission; `Stop` fires when a turn ends ([hooks guide](https://code.claude.com/docs/en/hooks-guide); demand documented in [issues #13024](https://github.com/anthropics/claude-code/issues/13024), [#36885](https://github.com/anthropics/claude-code/issues/36885)). gmux can inject a hook config that POSTs `{session, state}` to a local gmux socket — deterministic per-session state.
   - *Codex CLI:* `notify = ["…script"]` in `~/.codex/config.toml`, invoked with a JSON payload on `agent-turn-complete` ([how the notify hook works](https://backgrind.com/blog/codex-cli-notifications/), [example](https://github.com/Stovoy/codex-notify-chime)). Coarser (turn-complete only, no "awaiting approval" event), so it needs layering with 3–4.
2. **Terminal bell / desktop-notification escape codes (agent-agnostic, cheap).** Claude Code can be told to ring the bell instead of sending its own notification: `claude config set --global preferredNotifChannel terminal_bell` ([terminal config docs](https://code.claude.com/docs/en/terminal-config)); by default it emits desktop notifications only in Ghostty/Kitty/iTerm2. gmux's embedded terminal sees BEL (and OSC 9/777 notify sequences) directly and can badge the tab — the classic "bell on inactive tab" pattern every terminal ships.
3. **OSC 133 prompt marks (agent-agnostic, shell-level).** FTCS semantic prompts: `OSC 133;A` prompt start, `B` prompt end, `C` pre-execution, `D;<exit>` command finished ([spec via Contour](https://contour-terminal.org/vt-extensions/osc-133-shell-integration/); VS Code implements them plus its richer OSC 633 set with auto-injection of shell-integration scripts and success/failure decorations — [VS Code shell integration](https://code.visualstudio.com/docs/terminal/shell-integration)). For gmux: `C` seen without a following `D` ⇒ a command (the agent) is running; `D` then `A`/`B` ⇒ back at shell prompt (agent exited). This cleanly detects *agent process running vs. shell idle* — but NOT "agent is running yet blocked on an approval prompt," because the agent draws its own TUI prompt without emitting 133 marks.
4. **Silence heuristic on pane content (the fallback that closes the gap in 3).** claude-squad's method: hash the pane's visible content (SHA256) on a 500ms tick; output changing ⇒ Working; output static while the agent process is alive (per OSC 133 / process tree) ⇒ probably waiting ([claude-squad internals](https://deepwiki.com/smtg-ai/claude-squad)). Refinable by pattern-matching the static screen for known prompt shapes ("❯ 1. Yes", "Do you want to", "Allow?") — brittle across agent versions (see hardening pain in [live-log-viewer#18](https://github.com/Latand/live-log-viewer-next/issues/18)) but effective as tie-breaker.
5. **Terminal title parsing.** Agents set OSC 0/2 titles; community setups derive tab-title status indicators from them ([multi-level notification gist](https://gist.github.com/michael-swann-rp/6112d64456b49ec606d7fdbe1e2bd310), [tmux/iTerm2 integration post](https://gamov.io/posts/tmux-iterm2-claude-code/)). Cheap corroboration, not a primary.

**Recommended state machine for gmux v1:** per session, `IDLE` (shell prompt, via OSC 133) → `WORKING` (process running + output changing) → `NEEDS_INPUT` (hook event, bell, or output-static-while-running > N seconds) → back. Hooks (1) override heuristics (3+4) whenever present; heuristics make gmux work with *any* CLI agent on day one. This layered design is exactly what the surveyed tools converge on, and gmux — owning the emulator — is better positioned than tmux-scraping tools like claude-squad.

---

## 7. Git worktrees as first-class citizens?

The field says yes-but-optional:

- **Conductor:** every workspace *is* a worktree + branch — worktree-required ([Conductor docs](https://www.conductor.build/docs/)).
- **claude-squad:** worktree per instance, auto-created under `~/.claude-squad/worktrees/`, auto-branched, committed on pause, deleted on kill ([DeepWiki](https://deepwiki.com/smtg-ai/claude-squad)).
- **Crystal:** worktree per session was the founding idea ([repo](https://github.com/stravu/crystal)); its successor **Nimbalyst made worktrees optional per session** ([nimbalyst.com](https://nimbalyst.com/)) — evidence that mandatory worktrees over-rotated.
- **Vibe Kanban:** worktree-isolated task workspaces with orphan/expired cleanup machinery ([repo](https://github.com/BloopAI/vibe-kanban)) — note that cleanup is real engineering.
- **Zed:** recommends worktrees for parallel agents ([docs](https://zed.dev/docs/ai/parallel-agents)); **Claude Code** now has its own worktrees concept distinct from agent-view sessions ([agent view docs](https://code.claude.com/docs/en/agent-view)).

**For gmux:** the user's stated workflow is *named terminals in the project checkout* — not N agents racing on one repo. So v1 should be **worktree-aware, not worktree-required**:

- v1: if a terminal's cwd is a worktree, show it honestly (branch + `⎇ worktree` badge in the session row; the git sidebar targets that worktree's HEAD). "New session in worktree…" can be a create-flow option that shells out to `git worktree add` with the claude-squad naming scheme.
- Defer to v1.x: auto-create/auto-cleanup lifecycles, pause-commits, merge-back flows — that's Conductor's whole product and a big liability surface (Vibe Kanban needed orphan-cleanup tooling).

---

## 8. Wireframes

### Layout A — Project tabs, per-tab {sidebar | editor | terminal stack} (recommended)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⬤ gmux   [ api-server 🟡2 ]  [ webapp 🔵 ]  [ infra ⚪ ]  [ + ]        🔔 3  │ ← project tabs
├────────────────┬────────────────────────────┬────────────────────────────────┤
│ ⎇ main  ●7     │  src/routes/auth.ts   ×    │ ▸ claude-auth      🟡 needs you│
│ ─ SCM ──────── │ ┌────────────────────────┐ │ ┌────────────────────────────┐ │
│  Staged (2)    │ │ 42  export async fn …  │ │ │ ❯ Do you want to run       │ │
│   M auth.ts    │ │ 43    const tok = …    │ │ │   `npm test`?  1.Yes 2.No  │ │
│  Changes (5)   │ │ 44    …                │ │ └────────────────────────────┘ │
│   M db.ts      │ └────────────────────────┘ │ ▸ codex-migrate    🔵 working  │
│   U new.sql    │  [Commit msg…      ][✓]    │ ┌────────────────────────────┐ │
│ ─ Files ────── │                            │ │ ▮ editing migrations/003…  │ │
│  ▸ src/   ●    │                            │ └────────────────────────────┘ │
│  ▸ test/       │                            │ ▸ shell            ⚪ idle     │
│  ▸ HISTORY     │                            │ [ + new session ▾ ]            │
└────────────────┴────────────────────────────┴────────────────────────────────┘
  sidebar: branch, SCM,      editor (P4),        named terminal stack (P1),
  file tree w/ git deco      opened on click      status per session
  (P2+P3)
```

### Layout B — Global session list (claude-squad / agent-view style), project as grouping

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sessions (grouped: needs-input first)              [group: state ▾]  🔔 3   │
├──────────────────────────────────┬───────────────────────────────────────────┤
│ NEEDS INPUT                      │  preview: claude-auth (api-server)        │
│ 🟡 claude-auth   api-server  4m  │ ┌───────────────────────────────────────┐ │
│ 🟡 codex-fix     webapp     12m  │ │ ❯ Do you want to run `npm test`?      │ │
│ WORKING                          │ │   1. Yes  2. No                       │ │
│ 🔵 codex-migrate api-server  1m  │ └───────────────────────────────────────┘ │
│ 🔵 claude-docs   infra      33m  │  [Enter] attach  [Space] peek  [d] diff   │
│ IDLE                             │                                           │
│ ⚪ shell         webapp      2h  │  ⎇ feat/auth   +214 −38   PR #482         │
└──────────────────────────────────┴───────────────────────────────────────────┘
  Triage-optimal, but P2/P3/P4 (git sidebar, tree, editor) have no home —
  this is a monitor, not a shell to live in.
```

### Layout C — Hybrid: Layout A + global attention overlay (⌘K-style)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⬤ gmux   [ api-server 🟡2 ] [ webapp 🔵 ] [ infra ⚪ ]              🔔 3    │
│          ┌──────────────── Needs your input (3) ─────────────────┐           │
│   …      │ 🟡 claude-auth    api-server   "run npm test?"    4m  │    …      │
│          │ 🟡 codex-fix      webapp       "overwrite cfg?"  12m  │           │
│          │ 🟡 claude-review  infra        "push to main?"   40m  │           │
│          │            ↩ Enter: jump to tab + focus session       │           │
│          └───────────────────────────────────────────────────────┘           │
│   (Layout A underneath; overlay summoned by ⌘J or clicking 🔔)               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Bottom line for gmux

**Recommended information architecture for v1: Layout C — project tabs as the spine, attention overlay as the nervous system.**

1. **Top-level project tabs in one window** (P5). One tab = one project = one repo checkout (or worktree). Tab shows: name, optional color, branch, dirty-count, agent-status roll-up dot with needs-input numeral. Opening an already-open project focuses its tab (Zed's idempotent-open behavior). This is the direct upgrade path from the user's Cursor-windows habit, and the exact thing VS Code users are asking for and being refused ([vscode#322745](https://github.com/microsoft/vscode/issues/322745)).
2. **Inside each tab, fixed tripartite layout:** left sidebar (branch header + SCM view + file tree with git decorations — P2, P3), center editor opened on file click (P4), right terminal stack of **named, durable sessions** (P1) each with a status dot and rename-on-F2/double-click. Persist per-project layout + each session's {name, cwd, command} declaratively (tmuxinator's lesson) so reboot-restore = replay manifest with `claude --resume <name>` / `codex resume`.
3. **Global attention layer:** a hotkey overlay (and 🔔 badge + macOS Dock badge) listing all NEEDS_INPUT sessions across projects, newest-blocked first, Enter jumps to tab+session. This imports the one genuine superpower of the session-list tools (Conductor, `claude agents`) without surrendering the spatial model.
4. **Status via a layered detector** (§6): agent hooks (Claude Code `Notification`/`Stop`, Codex `notify`) > bell/OSC-9 > OSC 133 prompt marks > content-hash silence heuristic. Ship the heuristic path so any agent works; auto-inject hook configs for Claude Code/Codex to upgrade fidelity.
5. **Session naming:** derived defaults (repo basename for tabs; `<agent>-<n>` or first-prompt summary for sessions), rename inline, name = durable resume key, dedupe by suffix.
6. **Worktrees: aware, not required** in v1 (§7). Show worktree badges truthfully; offer "new session in worktree…" as an option; defer full lifecycle automation (Conductor's territory) to v1.x.
7. **Do not fork an orchestrator.** claude-squad is AGPL (and a TUI); Crystal (MIT) is deprecated; Vibe Kanban is sunsetting. Build the IA on boring primitives; steal only *patterns*: claude-squad's status taxonomy + hashing heuristic, Conductor's needs-attention list, agent view's grouping/naming/peek, Wave's workspace identity (name/icon/color) and F2-rename.

**What would falsify this recommendation:** if the user's real fleet is >5 concurrent agents per project racing on one repo, the session-first model (Layout B) and mandatory worktrees move from "overlay/option" to "spine" — that's Conductor's design point, and gmux should then look much more like an open Conductor than a multi-project Cursor-shell.
