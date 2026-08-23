# Research 56, investigator 5: what the tab spine and the session list become, and which choice is cheapest to reverse

Measured against the worktree at HEAD `50deb20` on 2026-08-18. Every path, symbol, count and
measurement below was read or run in this session. Nothing is quoted from an earlier document. Where
an earlier document made a claim I re-checked, I say whether it held.

## 0. The answer

**The spine does not change. The session list gains one badge on five more surfaces. The worktree
chip is deleted for a remote row and nothing is put in its place. The cheapest choice to reverse is
the one that writes no durable bytes, which is candidate C, and the one door this round should refuse
to close is the meaning of `sessions.project_path` and of the `@gmux-project` stamp.**

Four rulings, each with its own section.

1. A remote session's row stays in the local project's tab. It is already there, and moving it costs
   a manifest table rebuild that this schema has never performed in 14 migrations.
2. The machine badge keeps saying the machine's label and only the label. It is drawn at 6 places
   today, in 4 files. It should be drawn at 10 places, in 8 files, because 5 surfaces that can show a
   remote session say nothing about a machine at all.
3. Nothing replaces the worktree chip. The chip is deleted for a remote row, and the folder it was
   standing in for moves into the tooltip that already exists, from a field Tortie does not read yet.
4. Candidate C writes nothing durable and is free to undo. Candidate B is cheap to undo only if it is
   forbidden to touch two existing fields. Candidate A cannot be undone, because part of its state
   lives on other people's computers and Tortie cannot rewrite a machine that is asleep.

**The charter's premise about the chip is wrong, and the correction matters.** The charter says the
worktree chip "fires for nearly every remote row today". I measured the three cases and the chip
fires in one of them. In the other two it stays silent and the row then claims the local project's
folder as the session's folder, which is worse than the chip. Section 3 has the case table and the
tmux measurement behind it.

## 1. What the spine and the session list are today

### 1.1 The spine is project tabs, and it holds no machine

`Titlebar.tsx` draws the spine. `ProjectTab` renders a status dot, a name, an attention count, a
close button and a hold-Command digit hint. There is no machine mark anywhere in the file.
`grep -c MachineBadge src/renderer/app/Titlebar.tsx` returns 0.

The tab's roll-up dot and its attention count come from one loop in the `tabs` `useMemo` in
`Titlebar.tsx`, and its whole membership test is one line.

```
if (sess.projectPath !== project.path) continue;
```

So a remote session already contributes its status and its attention count to a local project tab.
The tab's tooltip is `project.path`, a path on this Mac.

The tab's size is measured. `.ptab` in `src/renderer/styles/app.css` sets `max-width: 200px` with
`padding: 0 26px 0 10px`, and `ProjectTab` runs the name through `truncateMiddle(project.name, 24)`.
`.machine-badge` in `src/renderer/app/machine-badge.css` sets `max-width: 88px`.

### 1.2 A session belongs to a project by one string comparison

`useProjectSurfaces` in `src/renderer/app/surfaces.ts` is the single derivation three surfaces read,
and its filter is `sessions.filter((x) => x.projectPath === project.path)`.

Counted this session, excluding tests and excluding the screenshot harness
`src/renderer/editor/shot-hook.ts`, the renderer reads `Session.projectPath` 19 times across 11
files.

| What the read does | Count | Where |
| --- | --- | --- |
| Decides which project tab a session appears under, or which tab a verb lands in | 12 | `App.tsx`, `session-focus.ts`, `CreateSessionModal.tsx`, `Titlebar.tsx`, `surfaces.ts`, `AttentionOverlay.tsx`, `resume.ts`, `sessions-slice.ts` (4 reads), `layout.ts` |
| Decides whether the worktree chip is drawn | 2 | `session-actions.tsx`, inside `isOutsideProject` |
| Search text, a prop passthrough, or the restore-into-a-closed-project ask | 5 | `PastSessionsModal.tsx`, `SessionRail.tsx`, `sessions-slice.ts` (3 reads) |

A wider net, being any renderer file matching `projectPath`, `project.path`, `activeProject` or
`repoRoot`, hits 62 files, of which 47 are not tests. The charter's figure of 60 is close and I
confirm it at 62.

### 1.3 A remote session's `projectPath` is a path on this Mac

`createSession` in `src/renderer/state/sessions-slice.ts` sends `projectPath: project.path` on every
create, whatever machine was chosen, and adds `machineId` only. `createSession` in
`src/main/sessions/core.ts` then calls `remoteCreate` with `projectPath: input.projectPath` and
`cwd: input.cwd ?? input.projectPath`.

`remoteCreate` in `src/main/machines/remote-sessions.ts` writes that same local path into two durable
places. It writes it into the manifest row through `writeRemoteRow`, and it stamps it onto the far
machine's own tmux server as `@gmux-project`, listed in `REMOTE_STAMPS` beside `@gmux-id`,
`@gmux-agent` and `@gmux-name`.

The poll reads it back. `REMOTE_LIST_FORMAT` in the same file names ten fields, and the eighth is
`#{q:@gmux-project}` while the ninth is `#{q:session_path}`. `projectRow` in that file builds the
`Session` the renderer sees with `projectPath: row.projectPath` and `cwd: row.cwd`.

So the pair a remote row carries is a path on this Mac and a path on the other machine, and the tab
membership test compares the first one to an open tab.

### 1.4 Nine surfaces draw a session, and they disagree about machines

Counted by reading each file this session.

| Surface | File and symbol | Machine badge | Worktree chip | Folder text |
| --- | --- | --- | --- | --- |
| Project tab | `Titlebar.tsx`, `ProjectTab` | No | No | `project.path` in the tooltip |
| Session tab | `SessionStrip.tsx`, `SessionTab` | Yes | Yes, a `git-branch` codicon | In the tooltip, when the chip fires |
| Group tab | `SessionStrip.tsx`, `GroupTab` | No | No | None |
| Dock row | `SessionDock.tsx` | Yes | Yes, the text `⎇wt` | In the tooltip, when the chip fires |
| Split header | `split/SplitSurface.tsx` | No | Yes, a `git-branch` codicon | `session.cwd` in the chip's tooltip |
| Rail hover card | `SessionRail.tsx`, `RailCard` | Yes | No | None |
| Identity strip | `TerminalRegion.tsx` | Yes | No | None |
| Attention row | `AttentionOverlay.tsx` | No | No | Project name, empty when the tab is closed |
| Past session row | `PastSessionsModal.tsx` | No, only `machineGone` words | No | `displayPath(session.cwd)` |

`MachineBadge` is rendered at 6 places in 4 files, being `SessionDock.tsx` once, `SessionStrip.tsx`
once, `SessionRail.tsx` once and `TerminalRegion.tsx` three times. Two of those three are the
unreachable condition bar rather than a session row.

Five of the nine surfaces can show a remote session and say nothing about a machine. Three of those
five are the split header, the group tab and the attention row, and all three are reachable while a
remote session is the thing the person is looking at.

The vocabulary audit at `src/renderer/app/__tests__/machine-vocabulary.test.ts` reads a hand written
list of 13 files and checks them against 15 forbidden words. `split/SplitSurface.tsx`,
`AttentionOverlay.tsx`, `PastSessionsModal.tsx` and `Titlebar.tsx` are not on that list.

## 2. The one measurement this round needed, and its result

The chip's behaviour turns on what the far machine reports as a session's directory, so I measured
tmux directly. Run on this Mac with tmux 3.6a, on a private socket named `r56probe2-<pid>` and
`r56probe3-<pid>`, killed after. The operator's `-L gmux` server was not touched.

```
tmux -L <probe> new-session -d -s p3 -c /nope/not/here -- /bin/sh -c 'sleep 8'
tmux -L <probe> list-sessions -F '#{q:session_path} | #{q:pane_current_path}'
  -> /nope/not/here | /Users/gdc

tmux -L <probe> new-session -d -s p4 -c /usr/local -- /bin/sh -c 'sleep 8'
tmux -L <probe> list-sessions -F '#{q:session_path} | #{q:pane_current_path}'
  -> /nope/not/here | /Users/gdc
  -> /usr/local    | /usr/local
```

Three facts, and all three are load bearing.

1. tmux 3.6a accepts a `-c` path that does not exist. The session is created and no error is printed.
2. `#{session_path}` returns the path that was ASKED for, verbatim, whether or not it exists. It is a
   record of the request.
3. `#{pane_current_path}` returns the directory the process is ACTUALLY in. In the failing case it is
   the home directory, which is where tmux fell back to. A separate run confirmed the process agrees,
   because `pwd` inside the pane printed `/Users/gdc`.

`REMOTE_LIST_FORMAT` reads `#{q:session_path}` and does not read `#{q:pane_current_path}`. So
`Session.cwd` for a remote row is the folder Tortie asked for and not the folder the agent is in.

## 3. The worktree chip, case by case

`isOutsideProject` in `src/renderer/app/session-actions.tsx` is the whole predicate.

```
session.cwd !== session.projectPath &&
!session.cwd.startsWith(`${session.projectPath}/`)
```

For a remote row the two strings are paths on two different computers, so the predicate is comparing
things that cannot be compared. Here is what it actually produces, using the mechanism in sections
1.3 and 2.

| Case | What the person did | `cwd` | `projectPath` | Chip | What the row then claims |
| --- | --- | --- | --- | --- | --- |
| 1 | Left the directory field empty, which the sheet invites | The local project path | The local project path | Silent | That the session's folder is the local project's folder. The agent is in the home directory on the other machine |
| 2 | Typed a folder on the other machine | A far path | The local project path | Fires | That the session runs in a git worktree outside the checkout. It means another computer |
| 3 | Typed a path that also exists here, on a second Mac | The same string | The same string | Silent | That the session's folder is the local project's folder. It is a different copy on a different disk |

Case 1 is the default path through the create sheet. `CreateSessionModal.tsx` blanks the directory
the moment a machine is chosen, in the machine `select`'s `onChange`, which runs
`setCwd(next === 'local' ? (project?.path ?? '') : '')`. `CREATE_DIR_EMPTY_HINT` in
`src/renderer/machines/presentation.ts` then tells the person to leave it empty to start in their home
directory. They do, and `core.ts` substitutes the local project path, and `remoteCreateArgs` sends
that as `-c`.

So the charter's sentence should be replaced. The chip is not firing for nearly every remote row. The
chip fires in one of three cases and lies when it does, and it stays silent in the other two while
the row asserts a folder on the wrong computer. The silence is the more serious half, because a mark
that is present can be read as wrong and a mark that is absent cannot be read at all.

Research 55 investigator 1 section 7.2 and research 56 investigator 1 section 7.1 both state that the
predicate is true "for every remote session unless the two strings happen to match". Cases 1 and 3
are not a coincidence of matching strings. Case 1 is what the product does by default.

## 4. Two more defects in the session list, found this session

Neither needs a model change and neither is in an earlier document.

### 4.1 Another Mac's home directory is drawn as this Mac's

`displayPath` in `src/renderer/format.ts` is four lines.

```
const m = /^\/Users\/[^/]+(\/.*)?$/.exec(path);
if (m) return `~${m[1] ?? ''}`;
return path;
```

It rewrites any path under `/Users/<anyone>` to a tilde, whoever that person is and whatever computer
the path is on. There are 9 call sites in the renderer. Two of them can receive a remote path today.

| Call site | What it draws |
| --- | --- |
| `session-actions.tsx`, inside `sessionTooltip` | The session's folder, when the chip fires |
| `PastSessionsModal.tsx` | The session's folder, on every past row |

A session on a second Mac at `/Users/them/proj` is therefore drawn as `~/proj`, which reads as this
Mac's home. That is a local surface claiming a remote path as its own, which is the shape of research
54 finding 15.

### 4.2 A manifest rebuild would turn a remote path into a local project tab

This is why the `@gmux-project` stamp cannot be changed casually, and it is the mechanism behind
ruling 4.

`writeManifest` in `src/main/manifest/reconstruct.ts` loops over the recovered rows and does this.

```
for (const path of new Set(rows.map((r) => r.projectPath))) {
  const project: Project = { id: randomUUID(), path, name: basename(path) || path };
  store.upsertProject(project);
}
```

There is no existence check. Every distinct `projectPath` in the recovered rows becomes a project row
and therefore a tab. Today that is safe, because every `projectPath` is a path on this Mac. If
`@gmux-project` were changed to hold the far machine's path, a rebuild would create tabs for folders
that are not on this Mac, and `addProject` in `src/main/sessions/core.ts` would refuse to open them
by hand with "That folder does not exist."

## 5. Ruling 1: the spine does not change

**A remote session's row sits in the local project's tab, and no remote project gets a tab of its
own.** Three measured reasons.

| Reason | The measurement |
| --- | --- |
| The row is already there and nothing has to be built | `surfaces.ts` and `Titlebar.tsx` join on `projectPath === project.path`, and `remoteCreate` writes the local path into that field |
| A tab per remote project needs a manifest table rebuild, and this schema has never done one | `projects` declares `path TEXT NOT NULL UNIQUE` in `src/main/manifest/schema.ts`, and `upsertProject` in `projects-repository.ts` depends on it through `ON CONFLICT(path)`. Across the 14 entries in `MIGRATIONS` I counted 15 `addColumnIfMissing` calls, 3 `CREATE TABLE IF NOT EXISTS` statements, 1 `UPDATE`, and 0 statements that drop, rename or rebuild a table |
| Two tabs at one path collide in the stores that key by path | 3 persisted stores carry an absolute project path, being `gmux.splitLayouts` as a record keyed by the path, `gmux.treeOpen.<path>` as a key prefix, and `gmux.quickopen.recents` whose entries carry `repoPath` |

**No machine badge on a project tab.** `.ptab` is at most 200px wide and the badge is at most 88px,
so the badge would claim 44 percent of a tab's maximum width. It would also be claiming something
untrue in the common case, because a tab can hold sessions from this Mac and from two machines at
once and a single badge cannot say that.

**The one change the spine takes** is a second line in the tab's `title` attribute naming the
machines its sessions run on, when there are any. That costs zero pixels, it uses the tooltip
`ProjectTab` already composes from `project.path`, and it is the only place on the spine where a
sentence fits.

## 6. Ruling 2: the badge says the machine's label and only that

**Keep `MachineBadge` exactly as it is.** It draws `machine.label` with `badgeTitle(label)` as the
sentence, it dims and switches to `badgeQuietTitle(label)` when the machine did not answer, and it
draws nothing for a session on this Mac. That design is right and section 1.4 shows the problem is
not what it says but where it is missing.

**Draw it on every surface that draws a session row.** That takes the count from 6 render sites in 4
files to 10 render sites in 8 files.

| Surface to add | File | Why it matters |
| --- | --- | --- |
| Split header | `split/SplitSurface.tsx` | A split can already mix machines, and this surface draws the worktree chip with no badge beside it |
| Group tab | `SessionStrip.tsx`, `GroupTab` | A group tab collapses several sessions and says nothing about where any of them run |
| Attention row | `AttentionOverlay.tsx` | This is the surface a person uses when something needs them, and it names a project rather than a machine |
| Past session row | `PastSessionsModal.tsx` | It draws `machineGone` words for a removed machine but nothing for a live one |

All four files should join the 13 file list in `machine-vocabulary.test.ts` in the same commit.

**Do not put the folder in the badge.** The badge is 88px at most and a path does not fit. The folder
belongs in the tooltip, which is ruling 3.

**Do not put the folder in the badge's sentence until section 7's field lands**, because the folder
Tortie holds today is the folder it asked for and not the folder the agent is in.

## 7. Ruling 3: nothing replaces the worktree chip

**Delete the chip for a remote row and put nothing in the slot it vacates.** The machine badge
already occupies that meaning, and a second mark beside it would be a second thing to read for the
same fact.

The change is one line in `isOutsideProject` in `src/renderer/app/session-actions.tsx`.

```
if (session.machine !== undefined) return false;
```

The predicate keeps its original meaning for a local session, which is the only case where its two
strings are on the same computer. Three surfaces stop drawing the chip for a remote row, being
`SessionDock.tsx`, `SessionStrip.tsx` and `split/SplitSurface.tsx`.

**The folder does not disappear, it moves.** `sessionTooltip` in the same file appends the folder
only when the chip fires, so suppressing the chip would take the path away too. Instead
`sessionTooltip` gains a remote branch that appends the folder unconditionally for a remote row, and
appends the raw string rather than `displayPath(...)`, because of section 4.1.

**The folder must come from a field Tortie does not read yet.** Section 2 measured that
`#{session_path}` is the request and `#{pane_current_path}` is the truth, and that
`list-sessions -F '#{pane_current_path}'` resolves correctly per session. The change is mechanical.

| Symbol | File | Change |
| --- | --- | --- |
| `REMOTE_LIST_FORMAT` | `src/main/machines/remote-sessions.ts` | Append `#{q:pane_current_path}` |
| `REMOTE_LIST_FIELDS` | same file | 10 becomes 11 |
| `RemoteListRow` | same file | One more readonly field |
| `parseRemoteListLine` | same file | One more index |
| `projectRow` | same file | `Session.cwd` reads the new field |

The restore path is not disturbed. `restoreRemoteSession` in `src/main/machines/remote-restore.ts` sends
`cwd: record.cwd`, which comes from the manifest row written at create time by `writeRemoteRow`, and
`remote-store-sync.ts` contains no `cwd` at all, so the feed never overwrites it. The request stays
the request and the observation stays the observation.

**Two caveats, stated rather than hidden.** `pane_current_path` follows the shell, so a session
running a plain shell where the person types `cd` will report the new folder. That is correct and it
is what a person would expect. And `pane_current_path` resolves against the session's active pane, so
a remote session with more than one pane would report only that pane. Tortie creates remote sessions
with one pane through `remoteCreateArgs`, so this does not arise today, and it would if a later phase
adds remote splits.

**A fix in the create path should ship with it.** `core.ts` substituting `input.projectPath` for a
missing `cwd` is what makes case 1 in section 3 possible. For a remote create, an absent directory
should be sent as an absent directory rather than as this Mac's project path, so tmux's own home
directory behaviour is what happens rather than a fallback from a path that was never meant for that
machine.

## 8. Ruling 4: which shape is cheapest to reverse, and what is stranded

The metric is durable bytes. A shape that writes nothing durable can be undone by deleting code. A
shape that writes into Tortie's own SQLite can be undone with a migration, because this tree has done
14 of them. A shape that writes into a store Tortie does not own cannot be undone at all, because the
undo would have to reach machines that are offline.

There are four durable stores in play, and I checked each one this session.

| Store | Where | Can Tortie rewrite it alone |
| --- | --- | --- |
| The manifest `sessions` table, including `project_path`, `cwd` and `machine_id` | `src/main/manifest/schema.ts` | Yes, by migration |
| The manifest `projects` table, with `path TEXT NOT NULL UNIQUE` | same file | Only by a table rebuild, which has never been done here |
| `gmux.splitLayouts`, `gmux.treeOpen.<path>`, `gmux.quickopen.recents` | renderer localStorage | Yes, by dropping a key |
| The four `@gmux-*` session options on every other machine's tmux server | `REMOTE_STAMPS` in `src/main/machines/remote-sessions.ts` | **No.** A machine that is asleep cannot be rewritten, and a live session's options can only be changed by reaching that session |

Against that, the three candidates.

| Candidate | Durable bytes it writes | Cost to undo | What is stranded on the undo |
| --- | --- | --- | --- |
| **C**, the surfaces follow the focused session | None. The re-target is derived from the focused session at render time | Delete the branches. No migration, no key drop | Nothing |
| **B**, a project is a mapping | One additive column, e.g. `addColumnIfMissing(db, 'projects', 'machine_paths', 'TEXT')`, which is the shape all 15 existing column migrations already use | Stop reading the column | The column's bytes, which are inert. Nothing a person can see |
| **A**, a remote project is its own tab | A rebuilt `projects` table with a composite key, a moved `MANIFEST_MIN_COMPATIBLE_VERSION` from 13 to 15, new entries in 3 path keyed stores, and a changed meaning for `@gmux-project` on every machine | A second table rebuild, plus reaching every machine | Every remote project row and its tab order position, its split layout under `gmux.splitLayouts`, its open folder set under `gmux.treeOpen.<path>`, its Quick Open recents, and every `@gmux-project` value on any machine that is offline at undo time |

**So the order is C, then B, then A, and the gap between B and A is not a matter of degree.** C and B
are undone inside this Mac. A cannot be undone inside this Mac.

**B and C are one design, and I confirm it from this seat.** B answers where a row sits and C answers
what the sidebars show, and the row placement B would formalise is already what the tree does. What B
adds on top is a project level record of the same two strings a session already carries. From the
spine and the session list's point of view B is not visible at all, because no surface in section 1.4
would draw anything different. B earns its place only if a later phase needs to know a project's
remote path when no session exists yet, and no surface needs that today.

## 9. The one rule that keeps every door open

This is the answer to "which door is the product closing", and it is a single sentence a later phase
can be held to.

> No phase may change the value written to `sessions.project_path`, or to the `@gmux-project` stamp,
> for a session on another machine. Both continue to hold the path of the project tab on this Mac.

Everything else in this document survives being undone. That one field does not, for three reasons I
measured.

1. It is the join. 12 renderer reads in section 1.2 place a session under a tab by comparing it to an
   open project's path. Changing it to a far path makes every remote session vanish from every
   surface at once, because no far path equals a local project path.
2. It is written on other people's computers. `remoteCreate` and `restoreRemoteSession` both stamp it, and
   Tortie cannot reach a machine that is asleep to change it back.
3. A rebuild turns it into tabs. Section 4.2 shows `writeManifest` creating a project row for every
   distinct `projectPath` with no existence check, so a far path in that field becomes a tab pointing
   at a folder this Mac does not have.

Research 56 investigator 1 recommendation 2 proposes fixing the "far machine holds a durable record
of a folder it does not have" defect with one line in `remoteCreate`. **I disagree with that item and
only that item.** That one line is the irreversible move. The stamp is not wrong, it is a record of
which tab on this Mac the work belongs to, and the honest fix is to name it that in a comment rather
than to change what it holds. The far machine's own folder is already available from
`#{pane_current_path}`, at no extra round trip, which is section 7.

## 10. What I did not measure

Named so nothing here is silently trusted.

| # | Item | What would measure it |
| --- | --- | --- |
| 1 | How many of the operator's remote sessions fall into each of the three cases in section 3 | It needs his manifest or a query to his machines, and I may open neither. A count of remote rows grouped by whether `cwd` equals `project_path` would answer it |
| 2 | Whether tmux on the Mac Pro behaves as tmux 3.6a did here for a `-c` path that does not exist | The same two probe commands, run on that machine. The fallback is in tmux's own spawn path and is not platform specific, but I ran it only on this Mac |
| 3 | The rendered width of a session tab with a badge and no chip | jsdom does not lay out, and I did not build or drive the app. `src/renderer/editor/shot-hook.ts` contains 0 occurrences of the word machine, so the screenshot harness cannot draw a remote row at all. Adding a fake remote spectrum beside `fakeResumeSpectrum` and running `npm run shot` would measure it without a machine |
| 4 | Whether `pane_current_path` drifts in practice for an agent that is not a shell | It should not, because the agent process does not chdir, but I ran only `/bin/sh -c sleep` |
| 5 | The wall clock of a `projects` table rebuild on a real manifest | I may not open the operator's manifest and I built no synthetic one |
| 6 | Whether any installed Tortie build older than schema 13 still exists | It decides what the `MANIFEST_MIN_COMPATIBLE_VERSION` move under candidate A actually costs. I did not look at the installed app |
| 7 | Whether the 3 path keyed localStorage stores are the complete set | I read the definition site of every one of the 24 `gmux.*` keys and found 3 that carry an absolute project path. Research 56 investigator 1 counts 20 records using a wider definition that includes in-memory ones, and I did not reconcile the two definitions record by record |

## 11. The order of work, if this ruling is taken

Every item is a defect fix. None of them needs a model to be chosen first, which is the point.

1. `isOutsideProject` returns false for a session with a machine. One line, three surfaces stop
   lying.
2. `sessionTooltip` appends a remote row's folder unconditionally, as a raw string, and
   `PastSessionsModal` stops passing `session.cwd` through `displayPath`.
3. `MachineBadge` is added to `split/SplitSurface.tsx`, `GroupTab`, `AttentionOverlay.tsx` and
   `PastSessionsModal.tsx`, and all four files are added to the vocabulary audit's list.
4. `REMOTE_LIST_FORMAT` gains `#{q:pane_current_path}` and `projectRow` uses it for `Session.cwd`.
5. The remote create stops substituting this Mac's project path for an empty directory field.
6. `ProjectTab`'s tooltip gains a line naming the machines its sessions run on.

Items 1 to 3 are Tier 1, because they remove marks and add an existing component to existing rows.
Item 4 touches the remote feed's parse and is Tier 2, with one probe against a real machine. Item 5
changes what is sent to another computer at create time and is Tier 3, because it is the session
lifecycle.
