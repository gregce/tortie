# Research 76: where a file has been, and how to find one in the history

Answers the entry in `docs/BACKLOG.md` headed "Research 76: the history of one file, and finding a
file in the history". Three studies fed it: a tree study that read every channel and component
named below at its line, a reference study that read GitLens, VS Code, Sublime Merge, Fork and tig
at their source, and a walk study that timed git on copies of two real repositories. This document
re-derived the parts that sounded like measurements rather than copying them. Section 4.3 says what
was re-run and where it disagreed, and section 5 corrects one count.

Nothing in the operator's checkout was touched. Every git command below ran on a copy under the
scratchpad. No Electron was launched.

## 1. What he asked for, and what the screenshot shows

His words, 2026-09-01: "if you're looking at a particular file, in the file explorer, you can trace
back through all of the changes to that file", and "in the SCM pane, search for files through the
commit history", leveraging open source and the libraries already incorporated.

The screenshot is GitLens inside VS Code. It shows:

- a FILE HISTORY section listing that one file's commits newest first, each with author, age and an
  M mark
- a VISUAL FILE HISTORY of dots on a time axis
- the chosen commit's diff of that file open in the editor
- a LINE HISTORY section, collapsed
- a SEARCH AND COMPARE box that takes a message, an author, a SHA, a file or a change

Two asks, and they are different sizes. File history is one walk per file plus the diff open that
already exists. Search is the same walk with filters, plus one field. Line history and the dots are
out of scope by the entry's own terms and are named in section 9.

## 2. What Tortie already has

All paths are under `/private/tmp/wt-r76` at `da4b02e`. The entry's five claims all hold, with one
correction in the fourth.

### 2.1 One walk feeds the history pane

`src/main/git/graph-parse.ts:4` to `:7` documents it and `src/main/git/service.ts:369` to `:380`
runs it:

```
git log -z --topo-order --decorate=full --ignore-missing --stdin --max-count=<N+1>
        --format=%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s
```

with the ref set on stdin. `GRAPH_LOG_FORMAT` is at `graph-parse.ts:37`. The handler is
`git:graphLog` at `src/main/git/depth-ipc.ts:159`. Research 24 section 5.2
(`docs/research/24-git-graph.md:412` to `:434`) decided that shape: topo order because the swimlane
fold needs a parent never to precede a child, `%D` so refs are pinned by the walk, stdin so 129 refs
do not hit an argv limit.

It cannot take a path today. `GitGraphLogInput` at `src/shared/types.ts:1533` to `:1551` carries
`repoPath`, `maxCount`, `scope` and `refs` and nothing else, and the argv has no `--` pathspec, no
`--follow`, no `--grep` and no `--author`. The two pieces a pathspec would reuse already exist for
the stage and restore verbs: `assertRelPath` at `service.ts:1452` refuses absolute paths and `..`,
and `literalSpec` at `service.ts:1474` wraps a path as `:(literal)<path>` so `*` and `[` never glob.

A row is a `GitGraphLogEntry` (`types.ts:1487`) extending `GitLogEntryDetailed` (`:686`) extending
`GitLogEntry` (`:636`): hash, parents, author name and email, author date, subject, short SHA, ISO
date, typed decorations, and the unpushed or unpulled marks. No file list and no status letter on
the row. Those arrive from `git:commitDetail` when a row is expanded.

### 2.2 The history pane, its scope and its paging

`src/renderer/scm/HistorySection.tsx` (1,029 lines) draws the rows. `HistoryScopeControl.tsx` and
`history-scope.ts:35` to `:42` scope the walk to `branch`, `local` or `everything`, default
`branch`, persisted per repository, and `HistorySection.tsx:180` and `:208` to `:211` push the
chosen scope into the walk. The window is `HISTORY_PAGE = 50` at `src/renderer/scm/depth.ts:81`,
requested as `maxCount + 1` so the "Load 50 more" row at `HistorySection.tsx:635` knows whether to
exist. Lane stability across pages rests on pinning the ref list, `types.ts:1541` to `:1550`.

Clicking a commit row toggles inline expansion and fetches detail (`HistorySection.tsx:796` to
`:800`, `:425` to `:433`). The expanded files come from `git:commitDetail`, whose service arm at
`service.ts:871` to `:930` runs `git show <sha> -z --name-status -M` and the same with `--numstat`,
parsed by `parseNameStatusZ` at `src/main/git/parse.ts:388`, which already reads the two path
tokens of an `R` or `C` entry into `path` and `origPath`.

### 2.3 The diff of one file at one commit is entirely existing glue

Choosing a file row calls `openCommitFile` at `HistorySection.tsx:440` to `:459`, which emits
`requestOpenFile` with `mode: 'diff'`, `source: 'history'` and a `commit` block carrying `sha`,
`shortSha`, `status`, `origPath` when present, and `subject`. Single click passes `preview` true,
double click and Enter pass false (`:869` to `:872`). The open file bus documents the contract at
`src/renderer/state/open-file.ts:170` to `:178`: the tab is keyed `${sha}:${relPath}`
(`src/renderer/editor/tab-identity.ts:37`), the editor forces diff mode for any commit open
(`src/renderer/editor/store.ts:466` to `:480`), and `loadCommitDiff` at
`src/renderer/editor/tab-io.ts:181` to `:224` calls `git.commitFileDiff` and hands the pair to
`PierreDiff.tsx`.

`git:commitFileDiff` is declared at `src/shared/ipc/git.ts:221` to `:224` and implemented at
`service.ts:945` to `:975`. It resolves the first parent with `rev-parse --verify --quiet <sha>^1`,
reads `<parent>:<origPath ?? path>` and `<sha>:<path>`, detects binary, and leaves a side null for
an add or a delete so the diff renders all green or all red. It already takes `origPath`. That one
field is what makes the rename boundary in section 5 a solved problem.

### 2.4 The correction, and two things that are not there

The entry says "the existing parser in parse.ts". `parse.ts:196` to `:204` records that the flat
`LOG_FORMAT` and `parseLog` pair was removed in Phase 14.5, so the existing log parser is
`parseGraphLog` in `graph-parse.ts`. It splits records on NUL and fields on 0x1f with the subject as
the tail, and it silently discards anything that is not a record, which matters in section 7.

`fuzzysort` 4.0.1 is in `package.json:184` and is used only by quick open, at
`src/main/quickopen/worker.ts:66`, `:351`, `:386` and `:396` as the stage one gate before the
vendored VS Code scorer. Nothing in the SCM pane filters text except `BranchesView.tsx:82` to
`:128`, which is a substring match over branch names.

The Explorer has no selection accessor. `TreeHandle` at `src/renderer/tree/tree-handle.ts:20` to
`:56` exposes `paths()`, `newEntryTarget()` and file verbs; selection reaches code only
imperatively through the tree model's `getSelectedPaths` (`FileTree.tsx:263`, `:581`,
`use-tree-menu.ts:171`). Explorer and SCM are separate sidebar views
(`src/renderer/state/sidebar-views.ts:23` to `:29`). The Explorer row menu at
`src/renderer/tree/tree-menu.ts:144` to `:304` carries Open, Open in New Tab, Open With, New File,
New Folder, Rename, Duplicate, Move to Trash, Reveal in Finder and the two Copy Path items. The
editor's mode chips at `src/renderer/editor/EditorPanel.tsx:222` to `:293` are Diff, Redline,
Preview, Source, Split, Image and File, chosen per tab.

### 2.5 Which ask is plumbing

Neither is pure plumbing, and both are close. File history needs a pathspec on the walk, `--follow`
for one path, and a name status field per row that the current record does not carry. The diff open
is finished. Search needs `--grep`, `--author` and a pathspec as argv lines in the same walk
function, a one row `rev-parse` for a SHA, and a text field. Neither needs a new parser family, a
new IPC family, a new diff surface or any third party code.

## 3. The references, mechanically

Read at the source, from depth 1 clones under the scratchpad on 2026-09-01.

| Product | Entered from | A row shows | Choosing a row | Renames | Search scope and cost |
| --- | --- | --- | --- | --- | --- |
| GitLens | File History view, follows the active editor; an Explorer command | short SHA, subject, author, age, status mark | opens that commit's diff of the file in the editor | `--follow`, `packages/git-cli/src/providers/commits.ts:728`; carries `originalPath` on the row | operators `author:` `message:` `commit:` `file:` `change:` mapped one to one onto `--author=`, `--grep=`, a sha, a pathspec, `-S` (`packages/git/src/utils/search.utils.ts:141` to `:378`); anchored author `^Name <email>$` with regex escaping (`commits.ts:559`); runs on Enter; pages 200 plus one (`package.json:1528` to `:1530`) |
| VS Code Timeline | Timeline view under the Explorer, follows the active editor | subject, author, age | opens the diff | `follow: true` since December 2023 (`timelineProvider.ts:145`), but both sides use one uri, so diffs before a rename open blank (vscode issue 205244, open) | none in Timeline; SCM search is a message filter of the loaded rows |
| Sublime Merge | file row context menu | subject, author, age | shows the commit, file filtered | follows renames; blame does not follow all of them (forum 39085) | search on a keystroke, over its own git reading library and index; not shelling git |
| Fork | file row context menu | subject, author, age | opens the commit with that file selected | follows renames | quick launch and a filter field; runs on Enter |
| tig | `tig <path>` or `tig log -- <path>` | one line log | opens the commit view | `--follow` when told to; one path | relaunches git per query; the manual advises `-n400` or `--since=1.month` (`doc/manual.adoc:572`) |

Three things fall out of the table.

1. The only reference that draws the rename boundary correctly is the one that carries the old path
   on the row. VS Code has `--follow` and still opens blank diffs before the rename because its diff
   uses one uri for both sides. Tortie's `commitFileDiff` already takes `origPath`, so the boundary
   costs nothing new if the walk emits the old path.
2. Every reference pages, and every one asks for one row more than it shows. Tortie already does
   that at `depth.ts:81` and `service.ts:376`.
3. Search on a keystroke exists only in Sublime Merge, which does not shell git. Every product that
   shells git searches on Enter. Section 4 says which parts of a search can run on a keystroke
   anyway, because the measurements say the references were being cautious rather than correct.

## 4. The walks, measured

Two copies. The operator's gmux, copied with its `.git`: 741 commits, 87.40 MiB of pack. git/git,
cloned into the scratchpad: 82,130 commits, 314.65 MiB of pack, and no commit graph file, because a
fresh clone does not write one. The walk study ran each command once to warm the cache and then five
times on gmux and three on git/git, reporting the median. Its format was
`%H%x1f%an%x1f%at%x1f%s`. The commit graph rows were taken after `git commit-graph write
--reachable`, which took 0.68 s on git/git.

### 4.1 git/git, 82,130 commits

| Walk | Rows | No commit graph, ms | With commit graph, ms |
| --- | --- | --- | --- |
| `--follow -- builtin/log.c` | 609 | 935 | 586 |
| same, no follow | 636 | 362 | 245 |
| `--follow -n 200` | 200 | 338 | 225 |
| `--grep=fix`, whole history | 17,847 | 544 | 585 |
| `--grep=fix -n 50` | 50 | 16 | 19 |
| `--author='Junio C Hamano'`, whole history | 28,529 | 608 | 698 |
| same, `-n 50` | 50 | 15 | 17 |
| `-Sstrbuf_addstr`, whole history | 994 | 8,724 | not run |
| `-Sstrbuf_addstr -n 20` | 20 | 333 | not run |
| `-Sstrbuf_addstr -- builtin/log.c` | 8 | 368 | not run |
| `-Gstrbuf_addstr`, whole history | 1,288 | 20,834 | not run |
| `-Gstrbuf_addstr -n 20` | 20 | 472 | not run |
| `--all -- builtin/log.c` | 640 | 390 | 261 |
| whole history, no filter | 82,130 | 593 | 589 |
| the pane walk, `--topo-order -n 201` | 201 | 418 | 20 |

Two more whole history pickaxes, one run each: `-Sstruct` 11,406 rows in 11,851 ms, `-Gstruct`
14,265 rows in 21,234 ms, `-Spickaxe` 149 rows in 10,575 ms, `-Gpickaxe` 237 rows in 20,898 ms.
The cost of a pickaxe does not depend on how many rows it returns. It depends on how many blobs it
must diff, which is every touched blob in the walk.

### 4.2 gmux, 741 commits, with its commit graph

| Walk | Rows | ms |
| --- | --- | --- |
| `--follow -- src/renderer/machines/presentation.ts` | 31 | 55 |
| same, no follow | 2 | 33 |
| `--grep=the`, whole history | 679 | 24 |
| `--grep=the -n 50` | 50 | 15 |
| `--author='Greg Ceccarelli'`, whole history | 741 | 25 |
| whole history, no filter | 741 | 23 |
| the pane walk | 201 | 23 |

The walk study removed gmux's commit graph and measured again, and nothing moved at 741 commits.
The commit graph is the single largest lever at git/git's size (the pane walk drops from 418 ms to
20 ms) and is irrelevant at gmux's. Modern git writes one during gc by default, and the operator's
own checkout already has one. Whether Tortie should ever write one into somebody's repository is a
policy question and is not answered here.

### 4.3 What this document re-ran, and where it disagreed

Re-run on the scratch copies, three runs each, minimum reported, git 2.50.1, while the operator's
Tortie was running:

| Walk | Study said | Re-derived | Agrees |
| --- | --- | --- | --- |
| git/git `--follow -- builtin/log.c`, no commit graph | 609 rows, 935 ms | 609 rows, 1,514 ms | rows yes, time within 2x |
| git/git same, no follow | 636 rows, 362 ms | 636 rows, 601 ms | rows yes, time within 2x |
| git/git `--grep=fix -n 50` | 16 ms | 49 ms | same order |
| git/git `--author -n 50` | 15 ms | 33 ms | same order |
| git/git `-Sstrbuf_addstr -- builtin/log.c` | 8 rows, 368 ms | 8 rows, 390 ms | yes |
| git/git the pane walk | 418 ms | 423 ms | yes |
| gmux `--follow -- presentation.ts` | 31 rows, 55 ms | 31 rows, 72 ms | yes |
| gmux same, no follow | 2 rows, 33 ms | 2 rows, 53 ms | yes |
| gmux `--grep=the`, whole | 679 rows, 24 ms | 679 rows, 47 ms | yes |

Every row count agreed exactly. Every timing agreed in order of magnitude, and the re-runs were
slower by up to 1.7x, which is the difference between a quiet machine and one with an Electron and
several agents up. Treat every number in this section as an order of magnitude and never as a
budget.

Three numbers the re-run added that the study did not have:

- a rare term is the worst case for a capped walk, because git reads every commit before giving up:
  `--grep=zzqxv -n 50` on git/git returned 0 rows in 501 ms, and on gmux in 50 ms
- a pickaxe is slow at gmux's size too: `-SrunGit` over the whole of gmux returned 23 rows in
  1,806 ms and `-GrunGit` 24 rows in 2,786 ms, at 741 commits, because gmux's commits are large
- `--follow` with two paths fails: `fatal: --follow requires exactly one pathspec`

### 4.4 The verdict: keystroke or button

Keystroke safe, with a debounce and a cancelled previous walk: message (`--grep`), author
(`--author`), SHA (one `rev-parse`), and path (a pathspec), all under `-n 51`. The typical case is
15 to 50 ms on 82,130 commits. The worst case, a term that matches nothing, is one whole history
read, 501 to 600 ms at that size and 50 ms at gmux's. That worst case is what the debounce is for,
and it is what the cancel is for: `src/main/git/exec.ts:115` already kills a child that exceeds
its timeout, so the only new thing is killing the previous walk when the query changes.

Button only: changes (`-S`, `-G`) over the whole history. It is 8.7 to 21 s on git/git and 1.8 to
2.8 s on gmux, its cost is unknown until the walk finishes, and `-n` does not bound it when the
term is rare. One shape is cheap and belongs elsewhere: `-S<term>` restricted to one path is 368 to
390 ms on git/git, which makes "when did this token change in this file" affordable beside a file
history rather than in a repository search.

Parse cost never matters. The walk study ran the shipping `parseGraphLog` over 82,130 rows in
93 ms, about 1.1 to 1.5 microseconds a row. This document did not re-run that measurement.

## 5. Renames, honestly

`--follow` is one path, and it is a heuristic. Everything below was run on a scratch repository
built for the purpose and on the two copies.

- It follows copies as well as renames. The lab repository copied `a.txt` to `b.txt` and kept
  `a.txt`; `git log --follow -- b.txt` returned four commits, the boundary row reading
  `C100 a.txt b.txt`, and then `a.txt`'s own add. That is the source's `find_copies_harder`
  setting, documented in `tree-diff.c` and not in the manual. A file created by copying will show
  its source's history under the copy. The row copy should say so.
- It drops merge commits. On `builtin/log.c` the plain walk returns 636 rows and the follow walk
  609. The walk study read that as 27 missing rows. Re-derived by set difference, 205 rows of the
  plain walk are absent from the follow walk, every one of them a merge, and 178 rows are present
  in the follow walk only, being the file's life as `builtin-log.c` before the rename
  (`R100 builtin-log.c builtin/log.c`). The net is 27 and the truth is 205 out and 178 in. Do not
  build a check that expects one list to contain the other.
- It cannot take two paths, and it cannot take a directory as one path either. A folder's history
  is the plain walk with a pathspec and no follow.
- At the boundary the row carries the status letter `R` and both paths from `--name-status -M`,
  and `parseNameStatusZ` at `parse.ts:388` already reads that shape. Rows above the boundary carry
  the new path, rows below it the old one. `commitFileDiff` takes `origPath`, so the boundary
  commit's diff reads old path against new path, and every older row diffs the old path against
  itself. That is the case VS Code gets wrong and GitLens gets right, and Tortie has the right
  shape already.
- On gmux the difference is real, not academic. `src/renderer/machines/presentation.ts` has 2
  commits without follow and 31 with, because it was `src/renderer/app/machine-copy.ts` first.
  A file history that does not follow would tell the operator that file is two commits old.

## 6. The scope guardrail

CLAUDE.md caps parity work after Phase 14 and asks, before building anything an IDE has, whether it
serves the agentic coding workflow or exists because IDEs have it. Each ask is put to that test
separately.

### 6.1 File history

Passes. Agents rewrite files, several at once, under one user account, and the person's question
after an hour away is "what happened to this file" rather than "what happened to the repository".
The History section answers the second question and answers the first only by expanding every
commit and reading every file list. A file scoped walk is the direct answer, and with `--follow`
it survives an agent moving the file, which agents do. The proof it is a workflow need rather than
furniture: the operator's own repository has a file whose history is 2 commits without follow and
31 with, and the difference is one agent's refactor.

What it must not become: a blame view, a line history, or a timeline drawing. Those are the parts
of the screenshot that exist because GitLens has them.

### 6.2 Search across the history

Passes on three of its four inputs and fails on the fourth as a keystroke feature. Finding the
commit where a thing changed, by a word in the message, by which agent or person wrote it, by a
SHA pasted from a log, or by a path, is how a person audits what agents did while they were away.
The tree has no way to do that today except scrolling the History section fifty rows at a time.
The fourth input, changes by content, is the same need and serves it, but at 1.8 s on 741 commits
and 21 s on 82,130 it is a deliberate action rather than a filter, and building it as a filter
would make the pane feel broken.

What it must not become: a separate results view, a saved search, a query language of its own, or
a second walk with a second parser. The results are commits, and the pane already draws commits.

## 7. Two designs for each, and one recommendation for each

### 7.1 File history

Design A, a section in the SCM pane scoped to one file. A fourth section under History, headed
with the file's name, drawing rows in the History section's own row shape, following the editor's
active tab (`src/renderer/editor/store.ts:117` holds `activeId`) rather than the Explorer's
selection, because the Explorer exposes selection only imperatively and the two are different
sidebar views. An Explorer row menu item, History, opens the file and switches the sidebar to SCM.
Choosing a row calls the existing `openCommitFile` with the row's own status and old path, so a
single click previews the diff in the editor and a double click pins it, exactly as a file row in a
commit does today.

Design B, a mode on the file's own tab. A History chip beside Diff and File at
`EditorPanel.tsx:222` to `:293`, in the pattern Phase 194 used for Redline. The tab draws the list
where the file was. Choosing a row opens the commit diff, which is a different tab keyed
`${sha}:${relPath}`, so the list leaves the screen on every click, or the mode grows a two column
layout with the list beside a Pierre diff, which is new layout code that nothing in the editor has.

Recommendation: A, the section in the SCM pane, and the Explorer menu item as the way in.

The reason is the loop. A file history is read by clicking row after row and watching the diff
change, and that loop needs the list and the diff on screen together. A gives that with zero new
diff code, because the History section's file rows already do it. B either breaks the loop on every
click or invents a layout. The second reason is that his ask names the SCM pane for the second
feature and the two belong side by side: a search result and a file history are both lists of
commits drawn the same way. The third is that a section can be empty and collapsed when no file is
open, and a mode chip cannot be absent without explaining why.

What is reused: `GitService.walk` with a pathspec, `parseGraphLog`, `parseNameStatusZ`,
`git:commitDetail`, `openCommitFile`, the open file bus, `commitFileDiff`, PierreDiff, the History
row and badge styles, `HISTORY_PAGE` and "Load 50 more", and `usePersistedBool` for collapse.

What is new glue:

- `GitGraphLogInput` gains `path?: string` and `follow?: boolean`, and `GitGraphLogEntry` gains an
  optional `file?: { path: string; origPath?: string; status: GitCommitFileState }`; the contract
  baseline is regenerated in the same commit
- `walk` at `service.ts:363` appends `--name-status -M` and `-- :(literal)<path>` when a path is
  given, and `--follow` when asked, refusing `follow` without exactly one path
- one reader for the name status chunk that follows each record when a path is given, because
  `parseGraphLog` discards those chunks today; about thirty lines beside `parseNameStatusZ`
- a per path window in `depth.ts`, the shape of the per repository one
- `FileHistorySection.tsx`, drawing rows with the status badge from `file.status` and passing
  `file.origPath` through to `openCommitFile`
- one Explorer menu item and one native menu line, in the same commit
- when the file is renamed at a row, the row's directory span shows the old path, and a title says
  the file was renamed from it, in the words `HistorySection.tsx:861` already uses

### 7.2 Search across the history

Design C, a field at the head of the History section that narrows the existing walk. The field
sits in the header at `HistorySection.tsx:902` to `:940` beside the scope control. What the person
types goes to the same `walk`, with the same ref set and the same `-n 51`. Bare text is a message
search. GitLens's operators are borrowed as vocabulary and not as a parser: `author:` becomes
`--author=`, `message:` becomes `--grep=`, `commit:` or a bare string that `rev-parse --verify` accepts becomes one
`rev-parse` and one row, `file:` becomes a pathspec after `--`. Each keystroke, after a short debounce,
cancels the walk in flight and starts one. The rows are the History rows, they expand,
their files open the diff, and "Load 50 more" still works because `hasMore` is computed the same
way. While a query is active the graph gutter is hidden, because a filtered walk has parents that
are not in the list and the fold would draw lanes to nowhere. `change:` does not run on a
keystroke: it shows a Search button, and the button runs `-S` with the scope's ref set and a
spinner, cancelable, with the time printed when it finishes. Escape clears the field and the pane
returns to the plain walk.

Design D, a separate results list. A Search section or a search view of its own, with its own rows
and its own paging, fed by a new `git:searchLog` channel.

Recommendation: C, the field at the head of the History section.

The reason is that a search result is a commit, and 1,029 lines of `HistorySection.tsx` already
know how to draw a commit, expand it, open its files as diffs, page it and scope it to a ref set. D
would copy that or wrap it, and either way it is a second list with a second paging contract to
keep in step. The second reason is the timings: with `-n 51` every input but changes is 15 to
50 ms at 82,130 commits, so narrowing the walk the person is already looking at is honest, and a
separate list would only exist to hide a delay that is not there. The third is the scope control:
a search in the History section is scoped by the control that is already in its header, and the
tag that names the scope already tells the person what the list contains.

What is reused: `walk`, `parseGraphLog`, the History rows, expand and file open, paging, the scope
control and its tag, `exec.ts`'s kill, and `BranchesView.tsx`'s field styling.

What is new glue:

- `GitGraphLogInput` gains `grep?: string`, `author?: string` and the `path` from 7.1; the
  contract baseline is regenerated in the same commit
- `walk` appends `--grep=<text> -i --regexp-ignore-case` and `--author=<text>` when given, and
  `-S<text>` only from the button's own input
- an operator splitter of about forty lines, proved on fixtures including a value with a colon in
  it, a quoted value, and a bare SHA
- a cancel token on the walk so the previous child is killed when a keystroke supersedes it
- the field, the button for changes, the gutter hide while a query is active, and the Escape clear
- the native menu gains Search History under the SCM items, in the same commit

`fuzzysort` stays where it is. Git does the filtering, and a local fuzzy pass over fifty rows would
only reorder what git already ranked by history order.

## 8. The first phase, as a charter

Phase: file history, being the section and the walk, with search queued as the phase after it,
because search reuses the widened input and the cancel token file history introduces.

Subject: `feat(scm): a file's history, followed through its renames`. First body line: `Phase N:
file history`. Semver: minor.

Tier 2. It spawns git, which the SCM pane already spawns, and reads nothing new under the person's
home; it holds no credentials and sends nothing anywhere; it cannot lose work, because it writes
nothing. It is a rendered surface with one new piece of state, the per path window.

The independent methods, named so the verifier's choice is reviewable before the work starts:

- run over real data: the operator's own gmux copy, with `src/renderer/machines/presentation.ts`
  as the fixture, because it must show 31 rows and a boundary row reading renamed from
  `src/renderer/app/machine-copy.ts`, and every row above the boundary must open a diff with two
  sides
- re-derive independently: a verifier's own reader for the `--name-status` chunks, written
  without reading the phase's, agreeing on every row over `builtin/log.c` in the git/git copy, 609
  rows with the one `R100`, and the 205 merges absent by set difference against the plain walk
- attack: a path with `*` and `[` in it, a path that is a directory, a file copied rather than
  moved, and a deleted file, each of which must either draw or refuse with a sentence rather than
  crash

The proof the phase produces, run rather than read: `npm run typecheck`, `npm run build` with the
contract gate green on the regenerated baseline, `npm run smoke:t1`, a conformance script that
runs the shipping walk over the scratch repository with the copy, the rename and the wholesale
rewrite and pins every row's path, old path and status, and one app run over the gmux copy that
clicks the boundary row and reads a two sided diff.

What is NOT in that phase: search of any kind, the changes button, `-S` on a path, line history,
blame, the dots on a time axis, any change to the graph fold, any commit graph written into a
person's repository, any new package.

## 9. What is not in this document

- No queued phase. Section 8 is a charter to write one from, and he picks.
- No line history and no blame. The screenshot's collapsed LINE HISTORY section is a different
  data source, `git log -L`, which GitLens routes through the same provider at
  `commits.ts:721` to `:726` and which refuses to combine with `--follow`. It is named for later.
- No visual timeline. The dots on a time axis are a drawing over the same rows and cost a
  component and nothing in main. Not designed here.
- No product change. The only file this research wrote is this one. No file under
  `/Users/gdc/gmux` was read by a git command that writes, and no Electron was launched.
- No claim about Sublime Merge's internals beyond what its forum threads say. Its source is not
  public.
- No timing of a repository larger than 82,130 commits, and no timing on a machine that was quiet.
