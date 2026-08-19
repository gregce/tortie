# Research 56, investigator 1: which model, and whether B and C are one design

Measured against the worktree at HEAD `50deb20` on 2026-08-18. Every path, symbol and count below
was read or run this session. Nothing is quoted from an earlier document, and where an earlier
document's number was re-measured and came out different, the difference is called out.

## 0. The answer

**Build C. Do not build B. Do not build A.**

Three sentences carry the whole ruling.

1. **B is already shipped, and nobody named it.** A remote session's `projectPath` is the local
   project's path and its `cwd` is the path on the other machine. That pair is written by
   `createSession` in `src/renderer/state/sessions-slice.ts` and carried into `remoteCreate` in
   `src/main/machines/remote-sessions.ts`. So a session already knows both halves of the mapping, one
   tab already holds sessions from two machines, and the split grid already mixes them. What B adds
   on top of that is a project level table that would hold the same two strings a second time.
2. **C is the only one of the three that changes what a person sees.** It is 8 call sites that turn
   the active project into a filesystem root, plus one that turns every open project into a root.
   Each is one line or one `useEffect` dependency. The mechanism it needs, being re-root the sidebars
   when the target changes, is the mechanism that already runs on every project tab switch.
3. **A is wrong for this operator's machines, and the reason is countable.** The identity used
   across the renderer is the absolute path STRING, not the project id. I counted 11 persisted
   `localStorage` records and 9 in-memory records keyed by an absolute project path. On a Mac and a
   Mac Pro that both hold `/Users/gdc/gmux`, two tabs at that path collide in all 20.

There is a fourth shape and it is the one I recommend shipping first, described in section 6. It is
C reduced to the part that is a defect fix rather than a feature, and it is about a tenth of C.

## 1. What is already true in this tree, before any of the three is built

This section exists because two of the three candidates propose building something the tree
partly has.

### 1.1 A session already carries the mapping

`createSession` in `src/renderer/state/sessions-slice.ts` sends `projectPath: project.path` on every
create, whatever machine was chosen. The machine choice only adds `machineId`. The directory field is
sent as `cwd`, and it is sent only when it differs from the project path.

The create sheet blanks the directory the moment a machine is chosen. In
`src/renderer/app/CreateSessionModal.tsx` the machine `select`'s `onChange` runs
`setCwd(next === 'local' ? (project?.path ?? '') : '')`, and its comment says Tortie holds no list of
home directories on other machines. So the person types the remote path by hand, once per session.

The result on the wire is a session row whose `projectPath` names a folder on this Mac and whose
`cwd` names a folder on the Mac Pro. `remoteCreate` in `src/main/machines/remote-sessions.ts` then
stamps that local path onto the far machine's tmux server as `@gmux-project`, one of the four
`REMOTE_STAMPS`.

**That row IS model B, at session granularity.** B as the operator described it moves the same two
strings up to the project and stores them once instead of once per session.

### 1.2 One tab already holds both machines

Every place that decides which sessions belong to a tab is the same string equality,
`session.projectPath === project.path`. I found 8 of them in the renderer outside tests.

| # | File | Symbol or site | What it drives |
| --- | --- | --- | --- |
| 1 | `src/renderer/state/layout.ts` | `projectSessions` | Which leaves the split grid may hold |
| 2 | `src/renderer/app/surfaces.ts` | `useProjectSurfaces` | The surfaces the strip, the region and the dock draw |
| 3 | `src/renderer/app/Titlebar.tsx` | the `tabs` memo | The tab's rollup dot and its attention count |
| 4 | `src/renderer/app/App.tsx` | the window title effect | The window title |
| 5 | `src/renderer/app/CreateSessionModal.tsx` | the name dedupe memo | Silent name dedupe inside a project |
| 6 | `src/renderer/state/sessions-slice.ts` | the selection repair in `applySessions` | Keeps the per project selection valid |
| 7 | `src/renderer/state/sessions-slice.ts` | `projectSessions` | The slice's public list |
| 8 | `src/renderer/state/sessions-slice.ts` | `attentionCountFor` | The attention count for one path |

Because a remote session's `projectPath` is the local path, all 8 already put it in the local tab.
Nothing needs building for that. The split grid already accepts it too, because
`src/main/attach/attach-host.ts` chooses its client per request, and `AttachRequest.machine` is the
only thing that separates a remote attach from a local one. A local pane and a remote pane can sit
side by side in one surface today.

### 1.3 One surface already follows a session rather than the project

The Context view has a session mode. `openSessionContext` in
`src/renderer/context/open-session.ts` pins the view to one session id, and
`useSessionContext` in `src/renderer/state/context-session.ts` reads that session's launch snapshot.
So the pattern C proposes, being a workspace surface targeted by a session rather than by the tab,
is not new to this codebase. Two things are different. It is opened by an explicit menu gesture
rather than by focus, and its root is still the project path: `ContextView.tsx` computes
`cwd` as `projects.find((p) => p.id === activeProjectId)?.path ?? null`. So the session mode of the
Context view, opened on a remote session, reads this Mac's roots and this Mac's `HOME`
(`src/main/context/env.ts` falls back to `homedir()`), and reports them as that session's context.

## 2. The counts, taken this session

All greps exclude `__tests__`. The commands are given so they can be re-run.

| # | Thing counted | Number | How |
| --- | --- | --- | --- |
| 1 | Renderer `.ts` and `.tsx` files | 328 | `find src/renderer -name '*.ts' -o -name '*.tsx'` |
| 2 | Files naming `projectPath`, `project.path` or `projectRoot` | 41 | `grep -rlE` over the renderer |
| 3 | Reads of `project?.path` or `activeProject()?.path` | 64 lines in 25 files | `grep -rnE "\bproject\??\.path\|activeProject\(\)\??\.path"` |
| 4 | Of those, screenshot probes rather than product code | 3 files, 3 reads | `editor/shot-hook.ts`, `quickopen/shot-probe.ts`, `search/shot-probe.ts` |
| 5 | Files also naming `repoPath` or `rootPath` | 85 | the union grep |
| 6 | Sites turning the ACTIVE project into a filesystem root | 8 | section 3 |
| 7 | Sites turning EVERY open project into a root | 1 | `rootsFor` in `src/renderer/quickopen/store.ts` |
| 8 | Session to tab equality tests | 8 | section 1.2 |
| 9 | `localStorage` records keyed by an absolute path | 11 | section 4 |
| 10 | In-memory renderer records keyed by an absolute path | 9 | section 4 |
| 11 | `git:` channels declared in `src/shared/ipc/git.ts` | 28, of which `git:changed` is an event and 27 are invokes | `grep -rhoE "'git:[A-Za-z]+'"` |
| 12 | `fs:` channels | 13 | same method |
| 13 | Lines in `src/main` naming `runGit` or `runGitOrThrow`, excluding imports and the declaration | 54 | `grep -rn` over `src/main` |
| 14 | Files in `src/main` naming a project or repo path | 71 | `grep -rlE "projectPath\|repoPath\|projectRoot\|listProjects"` |
| 15 | Live sessions on the operator's own tmux server | 38, across 11 distinct directories | `tmux -L gmux list-sessions -F '#{session_path}'`, read only |

Counts 2, 3 and 5 match research 55 investigator 1 exactly at 41, 64 and 85. Count 9 does not match
that document, which reported 2. The correction is in section 4 and it matters, because it is the
count that rules A out.

## 3. The 8 root conversions, which are the whole of C

These are the lines where the active project becomes a path a workspace surface reads from.

| # | File | Site | Surface | Can it cross to another machine today |
| --- | --- | --- | --- | --- |
| 1 | `src/renderer/tree/FilesSection.tsx` | `setRoot(project?.path ?? null)` in the "Follow the active project" effect | Explorer tree | Yes, on the new listing script research 55 priced at 65.5 ms for a whole repository |
| 2 | `src/renderer/tree/FilesSection.tsx` | `setRepo(project?.path ?? null)` in the same effect | Tree git decorations | Yes, read only, on `review-list` |
| 3 | `src/renderer/scm/ScmSection.tsx` | `const repoPath = project?.path ?? null` | Changes group | Partly. The Changes list crosses read only. Every write refuses |
| 4 | `src/renderer/scm/BranchHeader.tsx` | `const repoPath = project?.path ?? null` | Branch, sync, actions, refresh | No. All four are writes or lead to writes |
| 5 | `src/renderer/search/store.ts` | `repoPath: useApp.getState().activeProject()?.path ?? null` | Search | No. `rgBinaryPath` in `src/main/search/resolve.ts` resolves a binary inside the signed bundle |
| 6 | `src/renderer/search/symbols-store.ts` | `repoPath: project.path` on `ensure`, `query` and `release` | Symbol palette | No. Same binary, plus an index written here |
| 7 | `src/renderer/context/actions.ts` | `const cwd = projects.find(...)?.path ?? null` | Context, the skills flow | No. Installing a skill writes to the far machine's home |
| 8 | `src/renderer/context/ContextView.tsx` | `const cwd = projects.find(...)?.path ?? null` | Context, the readout | The SCAN could cross. Nobody has written the script |
| 9 | `src/renderer/quickopen/store.ts` | `rootsFor(allProjects)` | Quick Open | No. The correct file list needs `git ls-files` on the far machine |

Of the 9, two cross cleanly, one crosses in half, and six refuse. That ratio is not a reason to skip
C. It is the reason C has to be built as a re-target that CAN end in a refusal, and the refusal has
to be visible.

**The mechanism C needs already exists.** `FilesSection.tsx` re-roots on a `useEffect` whose
dependency is `project`. `ScmSection.tsx` and `BranchHeader.tsx` recompute `repoPath` on every
render. `search/store.ts` reads the active project at query time. Switching a project tab already
re-roots all of them, today, with no new machinery. C changes what those sites read, from
"the active project's path" to "the focused session's root", and changes nothing about when or how
the re-root happens.

The focused session is already derived in exactly one place. `useProjectSurfaces` in
`src/renderer/app/surfaces.ts` returns `selectedId`, resolved against sessions that exist. So C has
one input and it is already computed.

## 4. The 20 records keyed by an absolute path, which is what rules A out

Research 55 investigator 1 reported that exactly two persisted records are keyed by a project path
and concluded the collision surface is small. I re-measured and it is 11 persisted records, not 2,
plus 9 in-memory ones.

Persisted, in `localStorage`.

| # | Key | Module | Shape |
| --- | --- | --- | --- |
| 1 | `gmux.splitLayouts` | `LS_LAYOUTS` in `src/renderer/state/layout.ts` | One record, keyed by absolute project path |
| 2 | `gmux.editorWidth` | `LS_EDITOR_WIDTH` in `src/renderer/editor/panel-width.ts` | One record, keyed by absolute project path |
| 3 | `gmux.treeOpen.<rootPath>` | `LS_OPEN_PREFIX` in `src/renderer/tree/FileTree.tsx` | One key per root |
| 4 | `gmux.scm.branchesCollapsed.<repoPath>` | `src/renderer/scm/BranchesView.tsx` | One key per repo |
| 5 | `gmux.scm.historyCollapsed.<repoPath>` | `src/renderer/scm/HistorySection.tsx` | One key per repo |
| 6 | `gmux.scm.historyScope.<repoPath>` | `src/renderer/scm/history-scope.ts` | One key per repo |
| 7 | `gmux.scm.runsCollapsed.<repoPath>` | `src/renderer/scm/RunsSection.tsx` | One key per repo |
| 8 | `gmux.context.agent.<cwd>` | `AGENT_KEY` in `src/renderer/context/store.ts` | One key per project root |
| 9 | `gmux.context.collapsed.<id>.<cwd>` | `src/renderer/context/ContextView.tsx` | One key per agent per root |
| 10 | `gmux.context.bundled.<id>.<cwd>` | `src/renderer/context/ContextView.tsx` | One key per agent per root |
| 11 | `gmux.quickopen.recents` | `STORAGE_KEY` in `src/renderer/quickopen/recents.ts` | Array of `{ repoPath, relPath, at }` |

In memory, in the renderer's stores.

| # | Record | Module |
| --- | --- | --- |
| 1 | `layouts` | `src/renderer/state/layout.ts` |
| 2 | `repos` | `src/renderer/state/git.ts` |
| 3 | `committing` | `src/renderer/state/git.ts` |
| 4 | `messages` | `src/renderer/state/git.ts` |
| 5 | `pending` | `src/renderer/state/git.ts` |
| 6 | `repos` | `src/renderer/scm/runs.ts` |
| 7 | `repos` | `src/renderer/scm/depth.ts` |
| 8 | `details`, keyed by `detailKey(repoPath, sha)` | `src/renderer/scm/depth.ts` |
| 9 | `entriesByDir`, keyed by an absolute directory path | `src/renderer/tree/store.ts` |

Under A, two tabs named `/Users/gdc/gmux`, one local and one on mac-pro, share every one of those 20
records. Three of the consequences are not cosmetic.

- `gmux.splitLayouts` would hold one layout for two tabs, so arranging panes in one rearranges the
  other. The guard in `write` at `src/renderer/state/layout.ts` only checks that the key starts with
  `/`, and a remote absolute path passes it.
- `repos` in `src/renderer/state/git.ts` would hold one git state for two repositories. This is the
  charter's own red line. A local write would show its result in the remote tab's Changes list,
  which is a local write masquerading as a remote one.
- `rootsFor` in `src/renderer/quickopen/store.ts` dedupes roots with
  `ordered.filter((p) => p !== active.path)`, so the two tabs collapse to one root and Quick Open
  silently searches one of them.

Fixing that means re-keying 20 records on a pair rather than a string. **That is a bigger change than
C is.** A was presented as the simpler shape and it is not, because it introduces a duplicate key
where the tree has no duplicate key today.

A also carries the manifest cost that research 55 investigator 1 priced, and I re-checked both parts
of it this session. `src/main/manifest/schema.ts` declares `path TEXT NOT NULL UNIQUE` on `projects`,
`upsertProject` in `src/main/manifest/projects-repository.ts` depends on that through
`ON CONFLICT(path)`, and `MANIFEST_MIN_COMPATIBLE_VERSION` in `src/main/manifest/schema.ts` is 13.
There are 19 `addColumnIfMissing` or `CREATE TABLE IF NOT EXISTS` statements in that file and no
table rebuild.

There is one more A cost nobody has priced. `writeManifest` in `src/main/manifest/reconstruct.ts`
writes a project row for every distinct `projectPath` it finds, with
`name: basename(path) || path`. If A moved a remote session's `projectPath` to the remote path so the
tab grouping worked, a manifest rebuild would create local project tabs for folders that are not on
this Mac, and `missingRecents` in `src/main/recents/store.ts` would `stat` them and mark them missing
on every launch.

## 5. Are B and C one design

**They are separable, and the correct split is not the one the charter proposes.** The charter says B
answers what a project IS and C answers what the sidebars SHOW, and that the interesting design is B
plus C. The first half is right and the conclusion is wrong, for one reason.

C needs a root for the focused session. It does not need a project level mapping to get one, because
the session already carries its own root in `session.cwd`. Every remote session in this tree has a
`cwd` on the far machine, typed by the person at create time, and `session.machine` names the
machine. So C's input is `{ machine: session.machine, root: session.cwd }`, read straight off the
session row that `useProjectSurfaces` already returns as `selectedId`.

What B would add, on top of that, is three things.

| # | What B adds beyond what a session already carries | Is it needed for C |
| --- | --- | --- |
| 1 | A root for a machine that has NO session open right now | No. With no session there is nothing focused and nothing to re-target to |
| 2 | One place to type the remote path instead of once per session | No. It is a convenience on the create sheet, not a model change |
| 3 | A durable statement that two folders are the same work | No. The tab already says that, because both sessions are in it |

So C is buildable with zero model change. B is buildable with zero user visible change. Neither
needs the other. They are two designs, and only one of them is worth building now.

Row 2 is the only part of B I would keep, and it is not a model change. It is a per project
remembered default for the directory field, so the second session on mac-pro does not need the path
typed again. That could be one string on the project row, or one entry in `localStorage`, and it
would not be read by any workspace surface.

## 6. The fourth shape, and it should ship before C

Call it **C-zero: the surfaces say which machine they are about, and refuse rather than lie.**

C-zero is C with the re-target removed and only the labelling kept. It ships the "Files live on
`<machine>`" label that research 54 item 15 asked for and that no file in `src/` contains today, I
checked with a grep over the whole tree. It costs the 8 sites in section 3 reading one boolean,
being whether the focused session has a machine, and drawing a label when it does. It re-targets
nothing and it fetches nothing.

The reason to ship it first is that six of the nine sites in section 3 refuse anyway. C, built in
full, is 3 sites that re-target and 6 that put up a refusal. C-zero is those same 6 refusals with the
3 re-targets deferred. It is therefore not a stopgap for C. It is the first two thirds of C, and the
part that removes the lie.

| Shape | What it changes | Sites touched | Model change | Reversible |
| --- | --- | --- | --- | --- |
| C-zero | The 9 surfaces name the machine they are about, and refuse where they cannot cross | 9 | None | Yes, delete the label |
| C | C-zero plus the Explorer, the tree decorations and the SCM Changes list re-target | 9, of which 3 gain a transport | None | Yes, the re-target falls back to the project path |
| B | A project holds a root per machine | 8 equality tests become membership tests, plus a manifest column | Yes, additive | Mostly. The column can be ignored |
| A | A remote project is its own tab | 20 path keyed records, a `projects` table rebuild, `MANIFEST_MIN_COMPATIBLE_VERSION` 13 to 15 | Yes, breaking | **No.** A rebuilt table and a raised floor cannot be walked back for a person who downgrades |

The last column answers the charter's question 7 without ambiguity. A is the only one of the four
that a later round could not undo.

## 7. Three defects found this session, none of which needs a model

All three are the product saying something that is not true about a machine. All three are in the
current tree. None depends on any of the four shapes shipping.

### 7.1 A remote session in a split pane shows a worktree icon and no machine badge

`isOutsideProject` in `src/renderer/app/session-actions.tsx` is
`session.cwd !== session.projectPath && !session.cwd.startsWith(session.projectPath + '/')`, with no
machine test. A remote session's `cwd` is on another machine and its `projectPath` is on this Mac, so
it is true for every remote session unless the two strings happen to match.

Three surfaces draw a mark from it. Two of them draw the machine badge beside it, so the reader has a
second mark to correct the first. The third does not.

| Surface | Draws `isOutsideProject` | Draws `MachineBadge` |
| --- | --- | --- |
| `src/renderer/app/SessionDock.tsx` | Yes, the `⎇wt` chip | Yes |
| `src/renderer/app/SessionStrip.tsx` | Yes | Yes |
| `src/renderer/app/split/SplitSurface.tsx` | Yes, a `git-branch` codicon | **No** |

`grep -c MachineBadge src/renderer/app/split/SplitSurface.tsx` returns 0. The four files that import
it are `SessionDock.tsx`, `SessionStrip.tsx`, `SessionRail.tsx` and `TerminalRegion.tsx`.

So in a split, the only mark on a remote pane is a git branch icon meaning worktree. This matters
more than it looks, because section 1.2 established that a split can already mix machines today.

### 7.2 The Context view's session mode reads this Mac for a remote session

`ContextView.tsx` computes `cwd` from the active project, not from the pinned session, and
`src/main/context/env.ts` falls back to `homedir()` on this Mac. So opening the readout on a
mac-pro session lists this Mac's skills, MCP servers and instruction chain, and presents them as that
session's context. There is no label saying whose machine those files are on.

This is the single strongest argument for C over doing nothing. Context is the view whose whole job
is to say what the agent runs on, and for a remote agent every row in it is currently about the wrong
computer.

### 7.3 The far machine holds a durable record of a folder it does not have

`remoteCreate` in `src/main/machines/remote-sessions.ts` stamps
`'@gmux-project': oneLine(input.projectPath)` on the far machine's tmux server, and `input.projectPath`
is this Mac's path. So mac-pro's tmux server is right now recording that a session belongs to a folder
that does not exist there. Research 55 investigator 1 found this and it is unchanged at `50deb20`.

Under C it stays wrong and stays invisible. Under B it becomes correct as a side effect. That is B's
only real argument, and it is an argument about a string in a tmux option that no user reads.

## 8. What I did not measure

| # | Item | What would measure it |
| --- | --- | --- |
| 1 | The wall clock of a re-target in the running app | I read the re-root effects and did not drive the app. Driving it with a remote session focused, with a timer around `setRoot`, would measure it. That is investigator 2's question |
| 2 | Whether re-keying the 20 records on a pair is one day or one week | I counted the records and read four of them. I did not attempt the change |
| 3 | Whether any of the 54 `runGit` lines is reachable from a focused remote session today | I counted the lines and did not trace reachability from a session focus |
| 4 | The manifest table rebuild's cost | I may not open the operator's manifest, and I built no synthetic one |
| 5 | How many of the operator's 38 live sessions are remote | `tmux -L gmux list-sessions` on this Mac lists only this Mac's server, and I did not query mac-pro |
| 6 | Whether `@gmux-project` being wrong has ever caused a visible failure | I read `writeManifest` in `reconstruct.ts` and reasoned about it. I ran no rebuild |
| 7 | Whether Quick Open's `rootsFor` dedupe has ever collided in practice | It cannot today, because two tabs cannot share a path. It is a prediction about A, not an observation |
| 8 | The Context scan's exact remote cost | Research 55 priced a listing at 30.8 ms and a subtree at 65.5 ms. A context scan reads many small files across several roots and nobody has counted them |

## 9. What I recommend, in order

1. **Ship C-zero.** The 9 sites in section 3 learn whether the focused session has a machine and say
   so, and the 6 that cannot cross refuse in words rather than showing this Mac's answer. This is
   Phase 90's floor and it is where research 54 item 15's label lands.
2. **Ship the three fixes in section 7 in the same commit.** They are the product being wrong, not
   the product being incomplete. 7.1 is two lines and one import. 7.2 is one line if the readout
   reads the session's `cwd`. 7.3 is one line in `remoteCreate`.
3. **Then build C's three crossings**, being the Explorer root, the tree decorations and the SCM
   Changes list, on the frozen listing script research 55 already ruled on.
4. **Do not build B.** If typing the remote path twice is the actual complaint, remember the last
   directory used per project and per machine, and read it only on the create sheet.
5. **Do not build A.** It is the only shape a later round cannot undo, and it is the only one that
   introduces a duplicate key into 20 records that have never had one.
