# Research 52. The unit of work, and what a session digit counts

**Decision document. Written 2026-08-18.** It rules on six questions about the shape of Tortie's
work model and about its keyboard. GitHub issues 2, 3 and 4 cannot be built until these six answers
exist. Issue 4 in particular cannot start, because nobody had decided whether a session may exist
before it has been started. Section 0 carries all six answers in one table. The headline is that the
project stays the primary unit of work, because the one recorded test that could have moved it has
not fired.

**What this document extends.** `docs/research/10-multi-project-ux.md`, written 2026-08-09, chose
the information architecture and left one falsification test behind in its section 9. This document
takes that test for the first time against real data, then answers the five questions research 10
could not reach. The ten row product comparison in its section 2.1 is cited here and is not
repeated.

**Provenance and safety.** Every claim about the tree was read from the working tree at `d1fea2c` on
2026-08-18. Line numbers drift and symbol names do not. The one measurement is a read of the
operator's session manifest and it was taken from a copy, under the protocol in section 2.2. His
database was never opened in place. The private tmux server was counted twice with
`tmux -L gmux list-sessions`, read only, and it held 32 sessions both times. No file under `src/`
was written, added or deleted in this round, no application was launched, and no keystroke was sent
to a running window.

---

## 0. The six answers

| Question | The answer |
| --- | --- |
| 1. What is the unit of work | The project stays the primary unit of work, because the falsification test in research 10 section 9 has not fired on either half, and the session-first model would cost a migration past manifest schema 14 for behaviour the product already has |
| 2. Does the create verb change, and where | Yes. The create verb is renamed so it states its scope, becoming `New Session in This Project…` in the menus and `New session in <project name>` in the create sheet, across 14 strings in 10 files, and the two flows that create or choose a codebase move next to it rather than being built again |
| 3. May an unstarted session exist | Yes. An unstarted session may exist, and it is renderer state only, with no manifest row, no tmux session, no status and no place in any count |
| 4. Which modifier carries a positional session shortcut | ⌥⌘ plus a digit, because it takes no byte away from a running agent and sessions already live on ⌥⌘ through ⌥⌘↑ and ⌥⌘↓ |
| 5. Does a session digit count surfaces or sessions | Surfaces. A digit selects the nth surface in visual order, and inside a split group it focuses that surface's focused leaf |
| 6. Who owns the zoom reset chord | `view.zoomReset` keeps ⌘0, because the session family lands on ⌥⌘ and nothing else claims it |

---

## 1. What research 10 decided, and what this document adds

Research 10 answered one question, being how many projects fit in one window and how they are
arranged. It chose Layout C, which is project tabs as the spine with a global attention overlay
across all of them. All seven points of its section 9 are shipped code today, being the tabs in
`src/renderer/app/Titlebar.tsx`, the per tab sidebar, editor and session stack in
`src/renderer/state/layout.ts`, the overlay in `src/renderer/app/AttentionOverlay.tsx`, the layered
status detector in `src/main/activity/state-machine.ts`, rename on F2 at `src/shared/keymap.ts:218`,
and worktree awareness through `isOutsideProject` in `src/renderer/app/session-actions.tsx:36`.

Five things research 10 did not decide, and those are questions 2 to 6 here. It never named the
create verb. It never said whether a session may exist before it has started. It never assigned a
modifier to a positional session shortcut. It never said whether a digit counts sessions or the
surfaces the session strip actually draws. It never ruled on the zoom reset chord, which shipped
later in Phase 12.11.

One thing research 10 deliberately left as a test rather than a decision, and it is the only
recorded way to move question 1. It is quoted here up to the clause that follows, because the source
joins that clause with an em dash and the writing rules forbid one. The dropped clause says that
gmux should then look much more like an open Conductor than a multi project Cursor shell.

> **What would falsify this recommendation:** if the user's real fleet is >5 concurrent agents per
> project racing on one repo, the session-first model (Layout B) and mandatory worktrees move from
> "overlay/option" to "spine".

That sentence has two halves joined by "and". The first half is a count of agents on one project.
The second half is worktrees becoming mandatory, which is what "racing on one repo" brings with it,
because agents that race on one repository need separate checkouts. Section 2 takes both halves.

---

## 2. The measurement. Has the falsification condition fired

**It has not fired.** Neither half of the condition is met. The largest number of live agent
sessions on any one project is 5, against a threshold of more than 5. The number of sessions that
have ever run outside their own project directory is 0, so the worktree half has never been
exercised at all. The margin is one session, and section 2.5 records what would reopen the
question.

### 2.1 The decision rule, fixed before the numbers were read

This rule was written into the phase spec before the manifest was queried, so that the answer
follows the measurement rather than the writer's preference. It counts agents and not shells,
because a shell is not an agent.

- Both halves met, being more than 5 live non `shell` sessions on one project and sessions running outside their project directory, means the condition has fired and this document recommends the redesign research 10 section 9 names.
- One half met means the condition has not fired. Name which half, state the margin in whole sessions, and record the number that reopens the question.
- Neither half met means the condition has not fired and the model stays.

The numbers below land in the third case.

### 2.2 How the read was taken

The operator was using the app while this was measured. His manifest is at
`/Users/gdc/Library/Application Support/Tortie/gmux/manifest.db` and it was never opened in place. A
directory listing of that folder was saved first. `manifest.db` was copied to a scratch path,
holding 659,456 bytes, and `manifest.db-wal` was copied beside it, holding 3,234,232 bytes. The log
is five times the size of the database file, so a read that skipped it would have missed most of the
recent rows. `manifest.db-shm` was not copied, because SQLite rebuilds it and a copied one can
disagree with the copied log. Every query ran against the copy. The listing was taken again
afterwards, and every file carries the same size and the same modification time as before.

### 2.3 The figures

Read at 2026-08-18 03:50 local time. "Live" means `removed_at IS NULL` and a status other than
`discarded` or `exited`.

| Figure | Value |
| --- | --- |
| Rows in `sessions` | 57 |
| Rows in `projects` | 6 |
| Status breakdown | `idle` 28, `discarded` 26, `running` 3 |
| Live rows | 31 |
| Distinct directories those 31 live rows sit in | 9 |
| Largest live count on one project, all agents including `shell` | 6, at `~/extract-agentic-engineering`, of which 5 are `shell` |
| Largest live count on one project, excluding `shell` | 5, at `~/getspecstory`, and 5 at `~/the-zen-of-tortie` |
| Largest ever coexisting count on one project, including `shell` | 9, at `~/gmux` |
| Largest ever coexisting count on one project, excluding `shell` | 6, at `~/getspecstory`, from 2026-08-12 20:17:31 to 2026-08-15 02:16:47 |
| Largest number of non `shell` rows created on one project inside any 60 minute window | 5, at `~/the-zen-of-tortie` on 2026-08-14 |
| Rows where `cwd` differs from `project_path` | 0 |
| Live sessions on the private tmux server | 32 |
| Span of recorded rows | 2026-08-09 20:09:30 to 2026-08-17 21:07:14, being 8 days and 1 hour |

The live rows, per project, with shells kept separate.

| Project | Shells | Agents | Total |
| --- | --- | --- | --- |
| `~/getspecstory` | 0 | 5 | 5 |
| `~/the-zen-of-tortie` | 0 | 5 | 5 |
| `~/gmux` | 1 | 3 | 4 |
| `~/hyperframes` | 1 | 2 | 3 |
| `~/deadreckon` | 0 | 2 | 2 |
| `~/extract-agentic-engineering` | 5 | 1 | 6 |
| `~/pi` | 3 | 1 | 4 |
| `~/tortiedotsh` | 0 | 1 | 1 |
| `~/verified-gate-harness` | 1 | 0 | 1 |

The 31 live manifest rows were compared name by name against the 32 sessions on the private tmux
server. All 31 are present there. The one session tmux holds that the manifest does not is
`gmux-control`, which the app owns. Nothing is missing in either direction, so the manifest and the
server agree exactly.

### 2.4 The zero is the strongest number in the table

Not one session in the whole recorded history ran anywhere except its own project directory. The
query is `select count(*) from sessions where cwd <> project_path` and it returns 0 across all 57
rows. Research 10 ties the move to Layout B to two things at once, and worktrees becoming mandatory
is one of them. That half has not been approached, let alone met. The product already has the code
that would light up if it changed. `isOutsideProject` in
`src/renderer/app/session-actions.tsx:36` returns true when a session's `cwd` is neither the project
path nor inside it, and the surfaces then draw a small mark. Against these 57 rows it returns false
every time.

### 2.5 The margin, stated plainly

The count half is close. Two projects carry 5 live agent sessions each, against a threshold of more
than 5. The number to watch is therefore 6 live non `shell` sessions on one project. Reaching it
does not on its own move the model, because the condition needs both halves, but it is the number
that makes this document worth re-reading. The peak of 6 the history already contains, at
`~/getspecstory` between 2026-08-12 and 2026-08-15, is weaker than it looks, and section 9 says why.
Five of those six rows are still `idle` today with a `last_seen` of 2026-08-17. They coexisted in
the sense that all six had a live row at one moment. They were not six agents racing on one
repository.

---

## 3. Question 1. The unit of work

**The project stays the primary unit of work.** A session belongs to a project and keeps
`project_path` as a required column. The session-first model is rejected for now, not refuted
forever, and section 2.5 holds the number that reopens it.

### 3.1 The options

| Option | What it does | Verdict | Deciding reason |
| --- | --- | --- | --- |
| Keep projects primary and change nothing else | The tab is a project. A session belongs to it. `New Session` keeps its name | Rejected | It leaves issue 3 unanswered. The operator says the verb does not say what it does, and he is right. Rejecting a change of model is not the same as rejecting his complaint |
| Keep projects primary, rename the create verb so it states its scope, and put the two existing new work entries beside it | The model does not move. 14 strings across 10 files change. No schema change, no migration, no restore change | **Recommended** | The falsification condition has not fired, and this is the smallest change that answers the complaint the operator actually filed |
| Make sessions primary and demote the project path to a property | The tab is a session. `project_path` stops being the spine | Rejected | Cost in files. `project_path` is `NOT NULL` in `src/main/manifest/schema.ts:32` and carries the index `idx_sessions_project`. 9 files in `src/` use `project_path` and 114 use `projectPath`. It needs a manifest migration past version 14. It also needs three files under `src/main/restore/` rewritten, being `restore.ts`, `ask-open-project.ts` and `snapshots.ts`, with the six tests beside them under `src/main/restore/__tests__/`, and every durable session must stay attached to its directory across the migration. Research 10 section 9 makes this conditional on a test that has not fired |

### 3.2 The three definitions issue 3 asks for

Issue 3's first acceptance line asks for project, session and tab defined in one sentence each.
Here they are, and they are written to be copied into the product documentation without editing.

- A **project** is one folder you have opened, and it is the scope of the file tree, source control, search and every session created inside it.
- A **session** is one named terminal running one agent or one shell, and it lives in the private tmux server, so it keeps running when you quit Tortie and it comes back when you open the app again.
- A **tab** is a control that selects something, and Tortie has two kinds, being the project tabs across the top of the window and the editor tabs above the editor.

The word "tab" is the one that needs care. Tortie already uses it for two different controls, so the
documentation should always write "project tab" or "editor tab" and never a bare "tab". Issue 4 is
titled "Make New Tab immediate", and the tab it means is a session surface, which is a third sense
again. Whoever implements issue 4 should call it a session and not a tab.

Issue 3 is closed on GitHub. Its request still gives the shape of the answer, because the operator
wrote in it what the verb fails to say and what the three words should mean, and neither of those
changed when the issue was closed.

### 3.3 The nuance the manifest exposed, and it strengthens the answer

The project is already a view and the session is already the durable thing. That is how the shipped
product behaves, and the manifest shows the operator using it that way.

- Closing a project deletes its `projects` row and leaves its sessions alone. `src/main/sessions/core.ts:3176` calls `deleteProject` with the comment "sessions keep their history". The confirmation body the user reads says "Its sessions keep running and reappear when you reopen it."
- The operator's manifest holds 6 `projects` rows and 31 live sessions spread over 9 directories. 13 of those live sessions sit in 4 directories that have no `projects` row at all, being `~/getspecstory`, `~/the-zen-of-tortie`, `~/deadreckon` and `~/tortiedotsh`.

So 42 percent of his live sessions currently outlive their project tab. Making sessions primary in
the schema would not buy that behaviour, because the product already has it. What the operator is
missing is not a different model. It is a verb that says which project a new session lands in, and
that is question 2.

---

## 4. Question 2. The create verb, and every surface that carries it

**Yes. The create verb is renamed so that it states its scope.** The noun does not move. A session
is still called a session. The recommended menu string is `New Session in This Project…`, and the
full drafted set is in section 4.3.

### 4.1 The inventory, and the charter's list was short

The Phase 75 charter names four surfaces plus two toasts, which is six, and it names the File menu
when the item is in fact in the Session menu, which is built at `src/main/menu.ts:439`. The tree
carries 14 strings across 10 files. Anybody implementing this from the charter's list alone would
leave 8 strings behind.

The 10 files are `src/main/menu.ts`, `src/main/tray/index.ts`,
`src/renderer/terminal/terminal-menu.ts`, `src/renderer/app/CreateSessionModal.tsx`,
`src/renderer/app/App.tsx`, `src/renderer/app/SessionDock.tsx`,
`src/renderer/app/SessionStrip.tsx`, `src/renderer/terminal/TerminalHost.tsx`,
`src/renderer/settings/integration.ts` and `src/shared/keymap.ts`. Section 4.3 lists every string with its line, what it says today and what it
should say instead, in one table, so the implementer reads one place rather than two.

Rows 7, 8 and 15 of that table are the same sentence written three times, in two files, for the
same condition. Two of them sit in `App.tsx` and the third sits in `launchAgent` in
`src/renderer/settings/integration.ts:36`, which is the per-agent hotkey create path. That third
one is the reason this count was wrong at first reading. Whoever implements this lifts all three to
one exported constant. The house rule about
duplicated blocks applies to copy as much as it applies to code, and
`src/renderer/app/focus-trap.ts:52` records what happened the last time a modal was copied by hand.

### 4.2 Why the verb does not become "New Agent"

Issue 3 suggests "New agent in this project". The word agent is already taken. In Tortie an agent is
the thing you pick inside the create sheet, and `src/main/agents/registry.ts` defines 13 of them,
being Claude Code, Codex and the rest. A menu item called `New Agent…` would collide with that noun,
and it would also be wrong for the shell rows, which are sessions and are not agents. The operator's
own manifest holds 18 `shell` rows out of 57.

### 4.3 The drafted copy

Every string here obeys the writing rules. Both columns print the source form rather than the
rendered glyph, because `src/shared/keymap.ts` requires `keyDisplay()` and forbids typing a chord
string into a component. Rows 9, 11 and 13 already call it today, so no hardcoded glyph is waiting
to be found in those three files. The table has 15 rows for 14 strings, because the tray string has
two states and each state gets its own row.

| # | Surface, file and line | Today | Proposed |
| --- | --- | --- | --- |
| 1 | Session menu, `src/main/menu.ts:441` | `New Session…` | `New Session in This Project…` |
| 2 | Tray, a project is open, `src/main/tray/index.ts:84` | `New Session` | `New Session…`. It does not name the project, and section 4.4 gives the reason |
| 3 | Tray, no project is open, same line | `New Session`, which leads to a toast | `Open a Project…`, forwarding the existing `open-project` action |
| 4 | Session right click menu, `src/renderer/terminal/terminal-menu.ts:120` | `New Session…` | `New Session in This Project…` |
| 5 | Create sheet title, `CreateSessionModal.tsx:683` | `New session` | `New session in <project name>` |
| 6 | Create sheet `aria-label`, `CreateSessionModal.tsx:673` | `New session` | `New session in <project name>` |
| 7 | Toast on the ⌘T path, `App.tsx:461` | `Open a project first (${keyDisplay('project.open')})` | `No project is open. Press ${keyDisplay('project.open')} to open a folder, or ${keyDisplay('project.new')} to create one.` |
| 8 | Toast on the menu action path, `App.tsx:573` | The same string again | The same new string, read from one shared constant |
| 9 | Dock button, `SessionDock.tsx:388` and `:389` | `New session (${keyDisplay('session.new')})` | `New session in this project (${keyDisplay('session.new')})` |
| 10 | Dock split button, `SessionDock.tsx:397` and `:398` | `New session options` | `New session with options` |
| 11 | Strip button, `SessionStrip.tsx:77` and `:78` | `New session (${keyDisplay('session.new')})` | `New session in this project (${keyDisplay('session.new')})` |
| 12 | Strip split button, `SessionStrip.tsx:86` and `:87` | `New session options` | `New session with options` |
| 13 | Empty state, `TerminalHost.tsx:47` | `Press {keyDisplay('session.new')} to start a new session.` | `Press {keyDisplay('session.new')} to start a new session in this project.` |
| 14 | Keymap `action`, `src/shared/keymap.ts:208` | `New session` | `New session here` |
| 15 | Toast on the per-agent hotkey path, `integration.ts:36` in `launchAgent` | The same string as rows 7 and 8 | The same new string, read from the same shared constant |

### 4.4 Three notes the implementer needs

**The keymap label has a character budget.** The header of `src/shared/keymap.ts` states that
`action` is the short scannable label at about 24 characters or fewer, and the ⌘/ overlay renders it.
`New session in this project` is 27 characters and would not fit. Row 14 proposes `New session here`
at 16 characters. The `explain` sentence under it already reads "for the project you are looking
at", so it needs no change.

**The tray cannot name a scope, so it names none.** The tray reads `core.listProjects()`, so it
knows whether any project is open and can make the branch in row 3 with no new plumbing. It does not
know which project is active, because `activeProjectId` exists only in the renderer, in
`src/renderer/state/projects-slice.ts:24`. Two tray wordings were considered and both are rejected.
Naming the project outright costs a new piece of state crossing into main. Saying `New Session in
This Project…` is worse, because a person opens the tray with the window hidden, so the tray would
claim a scope that is nowhere on screen. Row 2 therefore keeps the plain verb and adds only the
ellipsis, and the create sheet it opens names the project under rows 5 and 6. Row 1 does not have
this problem, because the window is in front when a person reads the menu bar.

**The rename and issue 4 have to be done together, or the ellipsis lies.** A trailing "…" on a macOS
menu item means the item opens something that asks for more input. If issue 4 lands and ⌘T creates a
session immediately, the ellipsis on rows 1, 2 and 4 becomes wrong and must be dropped in the same
commit. Section 5 of this document answers whether issue 4 can land at all. A phase that renames a
user facing surface updates the native menus in the same commit, and rows 1 to 4 of section 4.3 are
that update. Row 4 belongs in that set because `src/renderer/terminal/terminal-menu.ts:120` builds a
native macOS menu through the `ui:popupMenu` bridge rather than drawing one in the DOM.

### 4.5 The direct new work flow, and the honest finding

Issue 3 also asks to "add a direct new-work flow that can create or choose a codebase". Both flows
already exist and neither is missing.

- `project.open` is ⌘O. Its `explain` reads "Adds a folder as a project tab. Opening one that is already open just brings its tab forward."
- `project.new` is ⇧⌘N. It creates the folder, offers `git init` and opens the result as a tab. `src/shared/keymap.ts:324` and `src/main/projects/create.ts`.

What is missing is placement and wording, not capability. Neither entry appears anywhere near the
create verb, and the toast a person hits when no project is open names only one of the two. The
recommendation is therefore that the Session menu carries `Open Project…` and `New Project…` in a
group directly under the create verb, that the toast in row 7 names both chords, and that no new
flow is built. The cost is two menu rows that forward to menu actions that already exist.

---

## 5. Question 3. May an unstarted session exist

**Yes.** An unstarted session may exist. It is renderer state and nothing else. It has no manifest
row, no tmux session, no process, no status and no place in any count. Nothing durable is created
until the person starts the agent.

The answer is only useful to the next phase if the boundary comes with it. Six rules bound the
thing, and each protects an invariant the product already holds.

| Rule | The invariant it protects |
| --- | --- |
| It lives in renderer state only, beside the existing overlay and layout state | The manifest is the source of truth for restore. A row with no process behind it would make restore lie about what can come back |
| It never gets a manifest row until the moment the agent is launched | Issue 4's own acceptance line, quoted below |
| It never gets a tmux session and never gets a pane | Sessions live in the private tmux server and the app is a disposable client. An unstarted session is client side and has no durable half at all |
| It dies with the window and is never restored | Nothing durable exists for restore to find. A restore that recreated one would be inventing state |
| It has no status, and it never reaches the attention overlay, the tray or any count | The status rule says "needs input" may only be triggered by session behavior. A session that has not started has produced no behavior |
| Starting it is a human act at the confirmation boundary the product already has | Refusal 8. Nothing may cause a process to start on a configuration change alone |

Rules 1 and 2 are not this document's invention. They are read straight off the acceptance list of
GitHub issue 4, which carries this line.

> Escape or closing an unstarted tab leaves no manifest row, process, or tmux session behind.

Issue 4 is closed on GitHub. The line still gives the shape of the answer, because it names the
three durable things Tortie owns and says an unstarted session produces none of them.

### 5.1 The one seam that forces rule 1

The draft cannot be pushed into the existing session list. `applySessions` at
`src/renderer/state/sessions-slice.ts:370` replaces the whole `sessions` array with main's list on
every hydration and every `sessions:changed` broadcast, from `subscriptions.ts:88` and `:484`. A
draft parked in that array would be deleted by the next broadcast, and the person would watch their
new tab vanish while typing a name into it. The draft needs its own slice, which is rule 1.

Rule 4 has a mechanism too. Split layouts persist to `localStorage` under `gmux.splitLayouts`
(`src/renderer/state/layout.ts:147`) as an ordered list of ids, so a draft id written into
`layout.order` would sit in that storage after the window closed. `deriveSurfaces` drops ids it does
not recognise, so nothing breaks on screen, but the stored list would grow and never shrink. The
layout store must never learn a draft id. The draft joins the surface list at derivation time and is
not serialized.

### 5.2 What it costs, counted in files

Fourteen files. One is new and thirteen are edits. This is a reading of the tree at `d1fea2c` and
not a measured diff, because nothing was built in this phase.

| File | What changes |
| --- | --- |
| A new slice under `src/renderer/state/` | Holds the draft records and the verbs to add, edit and discard one |
| `src/renderer/state/app-state.ts` | Adds the slice to the `AppState` union |
| `src/renderer/state/store.ts` | Spreads the slice into `useApp` at line 85 |
| `src/renderer/state/layout.ts` | `deriveSurfaces` at line 162 accepts draft ids as valid, so a draft is not dropped by the `valid` set |
| `src/renderer/app/surfaces.ts` | The one shared derivation feeds the draft ids in beside `sessionIdsKey` |
| `src/renderer/app/App.tsx` | The ⌘T branch at line 458 creates a draft instead of calling `setCreateOpen(true)` |
| `src/renderer/app/CreateSessionModal.tsx` | Becomes the options flow reached after the tab exists, rather than the required first step |
| `src/renderer/app/TerminalRegion.tsx` | Draws a setup panel for a draft leaf, because a draft has no terminal to mount |
| `src/renderer/app/SessionStrip.tsx` | Draws a draft tab |
| `src/renderer/app/SessionDock.tsx` | Draws a draft row and passes it down |
| `src/renderer/app/SessionRail.tsx` | Draws a draft row. It takes `surfaces` as a prop from the dock at line 283 rather than calling the hook itself |
| `src/renderer/app/session-actions.tsx` | `closeSession` at line 347 takes a `Session` and calls `endSession` or `removeSession`. A draft is neither, so the close path needs a branch that just forgets the record |
| `src/shared/keymap.ts` | Adds the second command issue 4 asks for, being the one that opens the options flow up front |
| `src/main/menu.ts` | Carries that command, because a phase that adds a user facing surface updates the native menus in the same commit |

Two modal free paths already exist and neither is what issue 4 asks for. `quickCreate` at
`src/renderer/state/sessions-slice.ts:467` and the ˅ menu in `src/renderer/app/new-session-menu.ts`
both skip the sheet, and both still call `createSession`, which reaches `gmux.sessions.create` and
writes a manifest row at once. They are modal free, not row free. The implementing phase should not
mistake one for the other.

### 5.3 Limits of this section

Nothing was built and no app was driven, so the count of fourteen files is a reading of the tree and
not a measured diff. An implementer may find a fifteenth file. No draft record shape is proposed
here, because the charter does not ask for one and a shape written without an implementation would
be guessed.

---

## 6. Question 5. Does a session digit count surfaces or sessions

**Surfaces.** A digit selects the nth surface in visual order, and inside a split group it lands on
that surface's focused leaf. The rule is that the number a person can see is the number the
keystroke honours, and what a person sees in the strip, the rail and the dock is a surface.

### 6.1 The evidence, read from the tree

`deriveSurfaces` at `src/renderer/state/layout.ts:162` returns one entry per single session and one
per split group, so the two lists are identical whenever no split group is open and the surface list
is shorter exactly when one is.

Every session list on screen draws surfaces, and none of them draws sessions.

| Component | Line | What it maps |
| --- | --- | --- |
| `src/renderer/app/SessionStrip.tsx` | 456 | `surfaces.map` |
| `src/renderer/app/SessionRail.tsx` | 325 | `surfaces.map`, from the `surfaces` prop declared at line 283 |
| `src/renderer/app/SessionDock.tsx` | 417 | `surfaces.map` |

`src/renderer/app/surfaces.ts` is the one derivation they share. Four modules call
`useProjectSurfaces`, being `App.tsx:1207`, `SessionDock.tsx:246`, `SessionStrip.tsx:531` and
`TerminalRegion.tsx:471`. The rail receives the answer from the dock rather than deriving a second.

`focusedLeafOf` at `src/renderer/state/layout.ts:213` already answers which leaf inside a surface
holds focus. It prefers the active session, then the group's remembered `focused` id, then the first
leaf. No new decision is needed for the split case, because this function is the decision.

### 6.2 One correction to the brief, and it matters

The brief handed to this builder said the shipped relative shortcut steps surfaces at
`SessionDock.tsx:288`. That is half right, and the wrong half would send an implementer to the wrong
function. `SessionDock.tsx:288` is `onListKeyDown`, the dock list's own ArrowUp and ArrowDown
handler, which runs only when the list itself has keyboard focus. It does step surfaces by index,
landing on `next.leafIds[0]`.

The chord ⌥⌘↑ and ⌥⌘↓ does not reach that function at all. `session.next` and `session.prev` carry
`menuAction: 'next-session'` and `'prev-session'` (`src/shared/keymap.ts:239` and `:251`), handled
at `src/renderer/app/App.tsx:594` and `:600`, and both call `useLayout.getState().navigate('down')`
or `navigate('up')`. `navigate` at `src/renderer/state/layout.ts:516` steps to the nearest leaf
inside the group first, and only when there is no leaf in that direction does it fall through to
`cycleSurface` at line 539. So the shipped chord steps leaves inside a group and surfaces at the
group edge, which is what its own `explain` string says.

`cycleSurface` is the function that already steps surfaces the way a positional digit needs, and it
is the one to reuse, because it lands on `focusedLeafOf(next, null, layouts)` rather than on the
first leaf. The dock list arrow and the chord therefore disagree today about which leaf inside a
group they select. That disagreement is small and it is not this document's to fix, but an
implementer who copies the wrong one inherits it.

### 6.3 The cost of counting surfaces, stated plainly

When a split group is open, one digit reaches two sessions and the second is only reachable by
moving focus inside the group with ⌥⌘← or ⌥⌘→. That is the price, and the alternative is worse. With
four sessions where the middle two are split, the strip shows three tabs, so a digit that counted
sessions would make ⌥⌘3 land on a session the third tab does not represent. A number that promises a
jump the keystroke will not make is worse than no number.

The project family already holds this rule and it holds it in one module.
`src/renderer/app/project-shortcuts.ts` carries `digitToIndex` for the keystroke and `tabDigit` for
the number a tab shows, and the round trip between them is a unit test rather than a comment. The
session family reuses that module. It does not get a second implementation.

### 6.4 One thing the implementing phase will hit

The hold to reveal gesture does not work for a two modifier chord today.
`src/renderer/app/modifier-held.ts:60` returns early when Meta goes down with `e.altKey` already
set, so holding ⌥⌘ reveals nothing. Making the session digits as discoverable as the project digits
means generalising that hook from "⌘ alone" to a named modifier pair. It is one file with one
existing consumer, being `src/renderer/app/Titlebar.tsx:41`.

### 6.5 Limits of this section

The charter cut the measurement of surfaces against sessions in the operator's window and this
builder did not take it. `deriveSurfaces` decides the question in code, so a count of how often a
split is open would say how often the two numbers differ and would not say which one a digit should
honour. Every claim above about what a chord does today is read from `KEYMAP`, from the handlers in
`App.tsx` and from the layout store, and not from a live window.

---

## 7. Question 4. Which modifier carries a positional session shortcut

**The answer is ⌥⌘ plus a digit.** ⌥⌘1 to ⌥⌘8 select the surface at that position, ⌥⌘9 selects the
last surface however many are open, and ⌥⌘0 is not bound. The Control family that issue 2 asks for is
refused, and the reason is measured rather than argued.

### 7.1 The evidence, reproduced

The shipped terminal is `@xterm/xterm` version 6.0.0, read from
`node_modules/@xterm/xterm/package.json`. One expression in
`node_modules/@xterm/xterm/lib/xterm.js` decides what Control plus a digit sends.

```
e.keyCode>=51&&e.keyCode<=55?o.key=String.fromCharCode(e.keyCode-51+27):56===e.keyCode?o.key=s.C0.DEL
```

Key codes 51 to 55 are the digits 3 to 7, and the arithmetic maps them to bytes 27 to 31. Key code 56
is the digit 8 and it maps to DEL, which is byte 127. The raw grep and the wider surrounding branch
are saved at `p75-scratch/p75-xterm-grep.txt`.

Tortie intercepts these chords in one place, being the capture phase `keydown` listener registered at
`src/renderer/app/App.tsx:547`. That listener runs before xterm sees the key and it calls
`e.preventDefault()`. So a chord Tortie takes is taken from every live session at once, not from the
focused one. The registry at `src/main/agents/registry.ts` holds 13 agents, of which 11 carry
`kind: 'cli'` and can run inside a session.

### 7.2 The size of the loss, counted byte by byte

The loss is smaller than "six bytes" and it is not zero. It was counted by searching the whole bundle
for every place each byte is produced, rather than by reading the ASCII convention and assuming the
bundle follows it. The counts are in `p75-scratch/p75-xterm-grep.txt`.

| Byte | Decimal | The Control digit chord | Every other key in this bundle that produces the same byte |
| --- | --- | --- | --- |
| ESC | 27 | ⌃3 | The Escape key at key code 27, and ⌃[ at key code 219 |
| FS | 28 | ⌃4 | ⌃\ at key code 220 |
| GS | 29 | ⌃5 | ⌃] at key code 221 |
| RS | 30 | ⌃6 | None. `C0.RS` appears zero times in the bundle, and there is no `⌃^` handler at all, so the ASCII spelling of RS is not implemented here |
| US | 31 | ⌃7 | ⌃_ , which is ⌃⇧hyphen on a US layout. It is matched on `e.key` rather than on a key code |
| DEL | 127 | ⌃8 | The Delete key at key code 8, pressed without Control. The forward Delete key at key code 46 sends `ESC[3~` and is not a substitute |

One byte would be lost outright. RS is produced only by the arithmetic
`String.fromCharCode(e.keyCode-51+27)` at key code 54, so ⌃6 is the only way to send byte 30 and
taking it removes the byte from the product. The other five keep a producer, and each of those
survivors is a chord a person is less likely to have learned, being ⌃[, ⌃\, ⌃] and ⌃⇧hyphen.

### 7.3 The four criteria, fixed before the table

1. It takes no byte away from a running agent.
2. It does not move a chord family that has already shipped.
3. It is typeable with one hand on a Mac keyboard.
4. It is free in `KEYMAP` and free in `RESERVED_MACOS_CHORDS`.

### 7.4 The five options

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| ⌃ plus a digit | Rejected | Fails criterion 1. It removes byte 30 from the product outright, because ⌃6 is its only producer, and it degrades five more bytes to a single less familiar encoding each. The cost lands in every live session at once, not in the focused one |
| Move projects off ⌘ plus a digit to free it for sessions | Rejected | Fails criterion 2. ⌘1 to ⌘9 have shipped since round 1, `useCommandHeld` in `src/renderer/app/modifier-held.ts` teaches them by revealing a number on each tab, and ⌘ plus a digit for tabs is the browser convention a user already carries |
| ⌥⌘ plus a digit | Recommended | Passes all four. The check in section 7.5 found it free in both tables, and sessions already live on ⌥⌘ because ⌥⌘↑ and ⌥⌘↓ are previous and next session at `src/shared/keymap.ts:243` and `:231`. It also passes criterion 1 permanently rather than conditionally, because macOS never delivers a Command chord to a pty, which `src/shared/keymap.ts:822` states in those words |
| ⌃⌥ plus a digit | Rejected | Fails criterion 3, and it holds criterion 1 only conditionally. It is a three finger chord, and it buys nothing ⌥⌘ does not already give. Tortie leaves `macOptionIsMeta` at the xterm default, which is false, so ⌥ currently produces the macOS alternate character rather than an ESC prefix. A later phase that turned that setting on would make this family start costing bytes, and a ⌘ chord could not |
| No positional session shortcut at all | Rejected | Issue 2 is a request the operator filed himself, and ⌥⌘↑ and ⌥⌘↓ move one step per press, so reaching the fifth surface costs four keystrokes |

### 7.5 The conflict check, reported as a result rather than asserted

`grep -n 'Alt+Cmd' src/shared/keymap.ts` returns 8 lines. They are `Alt+Cmd+Down`, `Alt+Cmd+Up`,
`Alt+Cmd+Left`, `Alt+Cmd+Right` twice, `Alt+Cmd+C`, `Alt+Cmd+W` and `Alt+Cmd+R`. No digit appears. A
grep for every digit chord in the file returns `Cmd+1` to `Cmd+8`, `Cmd+9`, `Cmd+0` and
`Shift+Cmd+0`, and again no ⌥⌘ digit. That grep also matched `Shift+F4` at
`src/shared/keymap.ts:732`, which is a function key and not a digit chord, so it is not one of them.
`RESERVED_MACOS_CHORDS` at `src/renderer/settings/chords.ts:119` to `:133` lists 13 chords, and the
only digits in it are ⇧⌘3, ⇧⌘4 and ⇧⌘5 for screenshots. ⌥⌘ plus a digit is free in both tables.

The runtime handler agrees with the tables. `src/renderer/app/App.tsx:234` defines its gate as
`e.metaKey && !e.ctrlKey && !e.altKey`, and the project digit branch at `:509` sits behind that gate.
So the shipped handler already ignores every ⌥⌘ digit, and ⌥⌘1 cannot be mistaken for ⌘1 today.

There is a second benefit that costs nothing. `RESERVED_APP_CHORDS` is derived from `KEYMAP`, so the
moment these nine chords are added the Settings recorder refuses them, and a per-agent hotkey can no
longer be recorded on top of one.

### 7.6 The digit rule, which mirrors the project rule rather than inventing a second

⌥⌘1 to ⌥⌘8 are positions. ⌥⌘9 is the last surface however many are open. ⌥⌘0 is not bound. The
reason is mechanical. `src/renderer/app/project-shortcuts.ts` already holds both directions of that
rule, being `digitToIndex` for what the keystroke does and `tabDigit` for the number a row claims
while the modifier is held, and their round trip is asserted in
`src/renderer/app/__tests__/project-shortcuts.test.ts`. `digitToIndex` returns null for digit 0 and
`tabDigit` never returns 0, so reusing the module gives the answer for ⌥⌘0 for free. Binding 0 would
mean writing a second rule beside a tested one.

### 7.7 Issue 2, answered in its own terms

The document does not give issue 2 the family it asked for, so it says so plainly and says what the
person gets instead. Issue 2 carries 14 acceptance lines. The table below covers the 6 that this
document rules on, and the paragraph after it says where the other 8 are handled.

| What issue 2 asks for | What this document answers |
| --- | --- |
| `Control 1` through `Control 0` select sessions | Refused. Section 7.2 is the measurement. The person gets ⌥⌘1 to ⌥⌘9 instead |
| `Command 0` selects the tenth project | Refused. Section 8 keeps ⌘0 on zoom reset and keeps ⌘9 as the last project |
| The defaults can be reassigned or disabled | Not answered here, and it is a new capability rather than a wiring job. All 61 static entries in `KEYMAP` carry `assignable: false`, and the only assignable entries are the per-agent ones built at runtime by `agentKeymapEntries` |
| The terminal control behaviour of Control plus a digit is documented | Answered. The table in section 7.2 is that documentation, and it is more exact than the issue assumed |
| Holding the modifier shows number hints on the rows the shortcut targets | Accepted, and section 10 costs it. `hintDigit` renders only in `src/renderer/app/Titlebar.tsx` today |
| A shortcut for a position that does not exist is a no-op | Free. `digitToIndex` returns null and the caller does nothing |

The other 8 lines are implementation work rather than decisions, and each has a home. Visual order
after a drag reorder, session selection focusing the work surface, consistency across every layout
and reachability past position 10 all follow from section 6, because a digit selects a surface in
visual order and `focusedLeafOf` picks the leaf inside it. Project selection restoring that
project's previously selected session is existing behaviour that this document does not change.
Listing the shortcuts in the overlay and in Keyboard settings follows from `KEYMAP` on its own,
which is item 3 of section 10.2. Restoring the underlying chord to the terminal on reassignment
depends on the reassignment capability that row 3 above leaves unanswered. Tests covering all 20
positions belong to the implementing phase.

Issue 2 wrote that capturing Control plus a digit inside a terminal is "a deliberate product choice
that must be documented and configurable". The choice this document makes is not to capture it. The
documentation the issue asked for is section 7.2, and it is written whether or not the chords are
ever taken.

### 7.8 Limits of this section

- The per agent matrix of what ⌃3 to ⌃8 do to each of the 13 agents was not run. The charter cut it, and the one expression in section 7.1 decides the mechanism without it. What the matrix would have added is how much each agent minds, which does not change the verdict.
- The byte table was read from the shipped bundle only, by counting symbol occurrences in the minified file. A future xterm upgrade could add or remove a producer, and nothing in the repository would fail if it did.
- The alternate producers were read from the code and not typed on a keyboard. ⌃_ and ⌃⇧hyphen are the same chord only on layouts where Shift and the hyphen key give `_`, and no other layout was checked.
- The ASCII convention is not a safe guide to this bundle, and anyone re-checking this table should count the `C0.` symbols in the file rather than reason from the convention. A first pass at the table did reason from it and got US wrong, because `⌃_` is matched on `e.key` instead of on a key code and is easy to miss.
- Whether ⌥⌘ plus a digit is comfortable on a non Apple keyboard was not tested.
- The ⌃⌥ path was read from the minified bundle and not pressed. What it sends today depends on `macOptionIsMeta`, which Tortie never sets, so the claim rests on the xterm default staying false.

---

## 8. Question 6. Who owns the zoom reset chord

**`view.zoomReset` keeps ⌘0.** Nothing contests it once the session family lands on ⌥⌘.

The chain is short. Issue 2 asked for ⌘0 to become the tenth project, and it asked for that only so
the project family could run 1 to 0 while sessions took ⌃1 to ⌃0. Section 7 refuses the Control
family, so the pressure on ⌘0 goes away with it. The chord itself is not loosely held. It shipped in
Phase 12.11, it is written into `DESIGN.md:301` as "Reset the focused region / every region to
100 %", and it is defined once at `src/shared/keymap.ts:870`. `view.zoomResetAll` sits beside it on
⇧⌘0 at `src/shared/keymap.ts:880`.

| Claimant on ⌘0 | Verdict | Deciding reason |
| --- | --- | --- |
| `view.zoomReset`, the incumbent | Keeps it | It shipped in Phase 12.11 and it is the only shortcut that undoes ⌘+ and ⌘-, which have no other undo |
| The tenth project, as issue 2 asks | Rejected | It was only wanted to complete a 1 to 0 run that section 7 does not create. ⌘9 already reaches the tail of the strip, so the tenth project is not unreachable, it just has no digit of its own |
| A tenth session | Rejected | The session family is on ⌥⌘, so it never reaches ⌘0 at all |

Issue 2's acceptance line asks that `Command 0` no longer has an unresolved conflict with focused
region zoom reset, and that zoom reset receives a documented replacement or remains available
through a configurable binding. This document satisfies the first half by removing the conflict
rather than resolving it. Zoom reset needs no replacement, because nothing takes its chord.

### 8.1 The tenth project, ruled on rather than left open

⌘9 stays "the last project" and does not become "the ninth". That is the Phase 12.12 rule and it is
recorded in the header of `src/renderer/app/project-shortcuts.ts`, which states that the earlier
meaning left every project past the ninth with no shortcut at all. The middle of a long strip
therefore has no digit, and that is deliberate. `tabDigit` returns null for those positions rather
than a number, because a tab showing a digit the keystroke would not honour is worse than a tab
showing none. ⌃Tab cycling and the pointer already reach the middle.

### 8.2 Limits of this section

- The incumbent's behaviour is read from `KEYMAP` and `DESIGN.md` rather than observed, because no chord was pressed in a running app during this phase.
- Whether a person actually wants a tenth project digit was not asked. The ruling rests on ⌘9 reaching the tail, which makes the tail reachable but not addressable by its own number.
- Making built-in chords reassignable is named in section 7.7 as unanswered. If that capability is ever built, ⌘0 becomes contestable by the person rather than by the product, and this section does not decide what happens then.

---

## 9. Limits. What is not true, what was not measured, and what was assumed

**The copy is not atomic.** The database file and the write ahead log were copied one after the
other while the app was running, so a row written between the two copies could be torn. No row read
looked malformed, and the live row count agreed exactly with the private tmux server, which is the
best available cross check.

**"Concurrent" is inferred, and it is an upper bound.** The manifest holds no history of status. A
session's interval was taken as `created_at` to `coalesce(removed_at, last_seen)`, which is how long
a row existed and not how long an agent was working. A session that sat idle for three days counts
as coexisting for all three. The peak of 6 at `~/getspecstory` is exactly this case, because 5 of
those 6 rows are still `idle` today. A measure of how many agents were actually working at once
would need per session status history, and Tortie does not keep it. Bulk cleanups distort the same
measure in the other direction. 9 sessions on `~/gmux`, created between 2026-08-09 and 2026-08-16,
were all discarded inside 48 seconds on 2026-08-16 between 18:43:28 and 18:44:16. Their intervals
overlap because nobody closed them, not because they ran together.

**This is one person, on one machine, over 8 days.** 57 rows from 2026-08-09 20:09:30 to 2026-08-17
21:07:14. It is evidence about this operator's workflow and it is not evidence about users in
general. The falsification condition in research 10 is written about "the user's real fleet", so one
operator is the right population for that specific test and the wrong population for anything else.

**The `projects` table is the set of open tabs and not the set of known projects.** That reading
comes from `src/main/sessions/core.ts:3167` and from the confirmation copy in
`src/renderer/state/projects-slice.ts:172`. It was read from the code and was not verified by
closing a project in a running app.

**Three things were not measured, and two were cut deliberately.** The per agent matrix of what ⌃3
to ⌃8 do to each of the 13 agents was cut by the charter, and section 7.8 gives the reason. A count
of surfaces against sessions in the operator's window was cut by the charter, and section 6.5 gives
the reason. Nothing was measured about how long the create sheet takes a person to complete, so the
claim in issue 4 that the sheet is too heavy is taken from the operator's report and not from a
timing.

**Two assumptions are recorded rather than checked.** The ten row product comparison in research 10
section 2.1 is assumed to still hold, and it was not re-checked against live pages, which matters
because that table was dated 2026-08-09 and it already marks two of its ten rows as deprecated or
sunsetting, being Crystal and Vibe Kanban. The drafted copy in section 4.3 is assumed to fit the
surfaces it lands on, and it was not rendered, so the two button labels in rows 9 and 11 could still
overflow their controls at the narrowest dock width.

---

## 10. What this document does not decide, and the checklist for the phase that implements it

### 10.1 Five things a reader might expect here and will not find

- **Fonts.** Phase 78 shipped three terminal font presets on 2026-08-17, and `docs/DESIGN-SPEC.md:601` records that the size stepper was withdrawn rather than deferred. Issue 1 is Phase 76's, and only the part Phase 78 did not build.
- **The SpecStory sign in.** It sits in Phase 74 as a caption change only, because the real fix is in SpecStory Cloud and not in this product.
- **Project naming.** Phase 74 owns the two defects that are real, and the rest of issue 6 is closed as written.
- **The shortcuts overlay filter.** Phase 76 owns it, and it is gated on a measured condition rather than a preference. Phase 76 measured the built-in rows at 677 px against 733 px available, so the sheet fits today and overflows only once the per agent chords are in normal use.
- **Any code.** This phase writes none, opens no pull request, touches no manifest schema, and changes nothing a person can see.

### 10.2 The checklist for the phase that implements these answers

The order matters, because the copy decides the menus and the menus decide the native rows.

1. **Lift the duplicated toast to one constant first.** `src/renderer/app/App.tsx:461`, `src/renderer/app/App.tsx:573` and `src/renderer/settings/integration.ts:36` hold the same sentence three times for the same condition. Fix that before rewording it, so the new words are written once.
2. **Change the 14 create verb strings from section 4.3** across the 10 files named in section 4.1. The keymap `action` field has a budget of about 24 characters stated in its own header, so the overlay label and the menu label are not the same string.
3. **Add the 9 session chords to `KEYMAP` and nothing else.** The file header states the contract, being that adding a shortcut is a one line change to `KEYMAP` and no surface keeps its own list. The ⌘/ overlay, the Settings recorder and the conflict table all follow from it in the same commit.
4. **Reuse `project-shortcuts.ts` rather than writing a second digit rule.** `digitToIndex` and `tabDigit` already answer both directions and their round trip is a test. If the session family needs its own module, it imports these two functions rather than copying them.
5. **Match on `e.code`, not on `e.key`, and add a branch rather than widening the gate.** With ⌥ held, macOS rewrites the character a digit produces, so a handler that tests `/^[1-9]$/` against `e.key`, which is what the project family does at `App.tsx:509`, will not fire. `eventKeyToken` in `src/renderer/settings/chords.ts` already reads `Digit([0-9])` off `e.code` for this reason. The comment at `App.tsx:523` records the same trap for letters, and digits were not tested in a live window during this phase. The gate at `App.tsx:234` excludes `altKey`, so the session family needs its own branch beside `onKeyDownArrows` and must not relax that gate, which is what keeps ⌘1 and ⌥⌘1 apart.
6. **Generalise the hold to reveal hook, or accept no hints.** `useCommandHeld` matches `e.key === 'Meta'` and returns early when `altKey` is set, so it cannot report a ⌥⌘ hold as written. `hintDigit` renders only in `Titlebar.tsx`, so the three session surfaces named in section 6 have no hint today. This is the one item on the list that is new UI rather than wiring.
7. **Build the unstarted session as renderer state only**, under the six rules in section 5. No manifest row, no tmux session, no status, no place in any count.
8. **Update the native menus in the same commit.** The Session menu is built at `src/main/menu.ts:439`. The positional family adds no row there, and the precedent is the project family, which has no native menu row either and lives in the renderer handler and the overlay. The rows that do change are the create verb at `src/main/menu.ts:441`, the session right click menu at `src/renderer/terminal/terminal-menu.ts:120` and the tray item at `src/main/tray/index.ts:84`.
9. **Close issue 2 with the part that was refused stated in the comment.** The person asked for Control plus a digit and is getting ⌥⌘ instead. Section 7.2 is the reason, and it belongs in the reply rather than only in this file.
