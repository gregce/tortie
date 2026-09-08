# 92. Phase 233, starting measurements

Phase 233 measure step. Written 2026-09-08 against the tree at `a03e472` (`docs(backlog): the
liveness gate, per verb`), driven against `gregs-mac-pro.tail2ddfe1.ts.net` under Phase 224's bounds
plus the two its later committers added, being that a scratch tmux socket on EITHER machine is
unlinked in the same `finally` that kills its server. Nothing here is built. This document says what
the charter cites and whether the tree still says it, what the parent draws for the two halves, which
numbers the phase must move, and where a rebase will fight.

The probe that took the readings is `.p233/probe-p233-parent.mjs` with `.p233/far-fixture.mjs`, and
its report is committed beside it as `.p233/report-parent-79732.json`. The gate exit codes are in
`.p233/logs/exit-codes.txt`; the logs themselves are kept out by the tree's `*.log` ignore rule, as
every phase's since 224.

## 1. The answer first

Every citation in the charter resolves, and four of them have drifted in ways the builder has to know
before typing.

**`historyFilesElsewhere` is already gone.** The charter cites it at `RemoteHistorySection.tsx:477`
and says mechanism 2 deletes it. Phase 228 deleted it on 2026-09-08, and
`src/renderer/machines/__tests__/p228-off-the-face.test.ts:111` now FORBIDS the identifier and the
words "The files one commit changed are not read" from ever coming back under any name. What
remains of gap 17 is behaviour, not a sentence: a `.rhist-row` is a `div` with `role="listitem"`,
no `aria-expanded`, no handler and `cursor: default`, and rule 4 of the file's own header says a
row is not a control. Two tests pin that shape and the builder inverts them.

**The drag refusal is four doors, not one.** The charter names `use-tree-model.ts:427`. That line is
`if (isRemote) return false;` inside `canDrag`, exactly as cited. The same word refuses again in
`canDropInto` twelve lines below, a third time in `use-tree-drag.ts:239` on the host's own
`dragstart`, and the fourth door is silent: `tree-ops.ts`'s `drop` verb lands in `applyMove`, which
calls `fsOps.move`, this Mac's `fs:move`, and has no remote branch at all. A capability check at the
first door alone would send a far-side path to this Mac's file system.

**A rename has no `denied` word.** The charter says the drop composes the same rename call the menu
does "with the same refusals: exists, gone, denied, outside root". `MachineRenameOutcome` at
`src/shared/ipc/machines/filesystem.ts:518` is `moved`, `done`, `exists`, `gone`, `writesOff` and
`outsideRoot`; `denied` is a `makeDir` word. The four refusals the drop inherits are exists, gone,
writes off and outside root.

**The new read cannot live in `remote-history.ts`.** Condition 57i of `build/conformance-machines.mjs`
(:5033) fails the build if that module makes more than ONE remote read or names any catalogue script
but `repo-history`. The reader for a commit's files goes in a module of its own, the way
`remote-review.ts` sits beside it, and the gate's `REMOTE_SCRIPT_COUNT` at :2926 moves from 25 to 26
in one place, which four count sites read. `show` is already in `ALLOWED_GIT_VERBS` at :2778, so the
script needs no verb widening; the branch read in Phase 229 needed one and this one does not.

The two things the charter says are wrong were both read off the DOM at the parent and are exactly
as research 85 described them. Clicking, double clicking and pressing Enter on every one of the four
remote History rows changed nothing: the row's children, the group's text, the editor tab strip and
the Changes group all read the same before and after, for all four rows and all three gestures. The
local History over the same repository shape expanded on the first click, drew the file rows with
their badges, and opened a diff tab carrying the sha. On the remote tree with saving ON for the
scratch folder, a `dragstart` on a file row came back `defaultPrevented: true` with NO type stamped
on the transfer; on the local tree the same event came back `false` with `text/plain` and
`application/x-gmux-tree-drag` stamped. Nothing moved on either disk, and section 4.3 says why the
local half of that sentence is a limit of the probe rather than a reading of the product.

## 2. What the charter cites, and whether the tree still says it

| Charter says | Tree at a03e472 | Drift |
|---|---|---|
| `historyFilesElsewhere` at `RemoteHistorySection.tsx:477` says the files are not read | the identifier is in no component; the file is 502 lines, its header rule 4 (:24-28) says "A ROW IS NOT A CONTROL" and names the export in prose; `machines/history.ts:27` records the deletion; `p228-off-the-face.test.ts:111` and `:237` forbid its return | **already deleted by Phase 228.** Mechanism 2's "is deleted" is done; the header rule and the two p107 tests are what change |
| the row does nothing when clicked | `renderRow` at :237-297 draws a `div role="listitem"` with `data-rhist`, no `onClick`, no `aria-expanded`; `remote-history.css:90-99` sets `cursor: default` and its header says "THE ROW IS NOT AN AFFORDANCE" | none |
| the Phase 107 entry's evidence line asked for it | BACKLOG.md:8179 "open a commit's file diff"; :8268 "Tortie does not draw the files one commit changed on another machine … Row 20 measured the two `git show` calls that read would need" | none |
| rename at `tree-menu.ts:238` | `canRename` at :238-239, the `Rename…` item at :241-249, gated on `caps.remoteWriteEntries === true` | none |
| `use-tree-model.ts:427` refuses drag at the model | :427 is `if (isRemote) return false;` in `canDrag` (:418-432); `canDropInto` refuses at :441 | **three more doors**: `use-tree-drag.ts:239` (`if (e.defaultPrevented \|\| isRemote)`), and `tree-ops.ts:1125` `drop` → `applyMove` (:697-778) → `fsOps.move`, which is this Mac's `fs:move` with no remote arm |
| `entry-rename` on the far side already moves a path | catalogue row `remote-scripts.ts:2907`; `renameRemoteEntry` in `remote-entry.ts:297-356` sends `[writeRoot, relFrom, relTo]` after `relativeUnderRoot` on BOTH paths; the menu reaches it through `use-tree-rename.ts:126` (`remoteEntry`) and `tree-ops.ts:540` (`finishRemoteRename`) | none. `TreeOpsContext.remoteEntry` (tree-ops.ts:154) is already the object a remote `drop` needs |
| "the same refusals: exists, gone, denied, outside root" | `MachineRenameOutcome` (filesystem.ts:518) has no `denied`; `renameRefusal` (tree-ops.ts:439) maps exists, gone, writesOff, outsideRoot; `denied` is `makeDirRefusal`'s at :419 | **one word**: `denied` is not a rename refusal |
| `readNameStatusChunk` in `parse.ts` reads the list locally | :430, and it reads the chunk that follows ONE record of a `git log -z --name-status` WALK (tokens beginning with a newline). The ONE-commit reader the local history row uses is `parseNameStatusZ` at :388 over `git show <sha> -z --name-status -M --format= --diff-merges=first-parent --` composed at `service.ts:1029-1049`, merged with `--numstat` by `mergeCommitFiles` (:528) | **the sibling is `parseNameStatusZ` and `commitDetail`**, not the Phase 198 chunk reader. Same status letters, same rename pairing; the chunk reader's newline strip does not apply to a `git show` |
| the Pierre diff for one file, under the 90,000 byte ceiling, refused above it with the editor's sentence | the local pair is `git:commitFileDiff` (`git.ts:221`, `service.ts:1069`, `<sha>^ → <sha>`), loaded by `tab-io.ts:203` `loadCommitDiff`; the REMOTE working-copy pair is `machines:reviewFile` → `review-file` (`remote-scripts.ts:713`, `HEAD:$2` against the folder), loaded by `tab-io.ts:265` `loadRemoteDiff`, capped at `REMOTE_REVIEW_MAX_BYTES` = 2,097,152 (`remote-review.ts:117`); the 90,000 figure is the SAVE cap (`tab-io.ts:298`) and the open refusal is `remoteOpenTooLarge` (`editor.ts:199`) | **the read sibling caps at 2 MiB, the charter says 90,000.** The charter binds; the builder should say in the commit body that the commit diff is capped below the working-copy diff and why |
| `ALLOWED_WRITERS` does not grow; the count moves 25 to 26 | `ALLOWED_WRITERS` at `conformance-machines.mjs:2860`, eight ids; `REMOTE_SCRIPT_COUNT = 25` at :2926, read at :4601, :4867, :5111, :5205; the gate prints "25 scripts of which 8 write" | none, and `show` is already allowed (:2781) |
| `remoteWriteEntries` is the capability | `tree-menu.ts:93`, composed at `use-tree-menu.ts:218` as `isRemote && ops !== null && remoteWriteRoot !== null && canWriteEntries()`; `canWriteEntries` at `remote-bridge.ts:58` asks the preload for `makeDir` AND `renameEntry` | none; `use-tree-model.ts:329` already computes the same predicate as `canRenameHere` |

### The data flow this phase touches, in ten lines

1. `RemoteHistorySection.tsx` → `useRemoteHistory.ensure(target)` (renderer store, `remote-history.ts`) → `window.gmux.machines.readHistory` (preload, `machines.ts:156`) → `machines:readHistory` (`ipc.ts:1586`) → `readHistoryOnMachine` (`remote-history.ts:350`) → ONE `runRemoteRead(ctx, 'repo-history', [cwd, count+1])` → `git log --branches --tags --remotes -z --topo-order` on the machine, base64 back.
2. The answer is `MachineHistoryResult` (`scm.ts:688`): `entries: GitGraphLogEntry[]` with full `hash`, `headSha`, `upstreamSha`, `mergeBase`, the three cut flags. Nothing per commit beyond the walk row.
3. Locally the same row expands through `toggleExpanded` (`HistorySection.tsx:482`) → `depth.detail(repoPath, sha)` (`depth.ts:776`) → `git:commitDetail` → `GitService.commitDetail` (`service.ts:1005`) → two `git show` calls → `files: GitCommitFileChange[]`.
4. A local file row opens through `requestCommitFileOpen` (`open-commit-file.ts:19`) → `requestOpenFile({mode:'diff', source:'history', commit:{sha, status, origPath}})` → `tab-io.ts:203` `loadCommitDiff` → `git:commitFileDiff`.
5. A REMOTE working-copy row opens through `ScmSection.tsx:1233` with `remote: {machineId, machineLabel, repoPath, origPath}` → `tab-io.ts:265` `loadRemoteDiff` → `machines:reviewFile`. `tab-types.ts:174` carries `remote?` and `commit` on one tab; no loader today reads both, and `tab-io.ts:583` already branches on `tab.remote` for the save.
6. The remote tree: `FileTree.tsx:183` computes `isRemote`, `:189` `remoteWriteRoot`, hands both to `useTreeModel` (`:194`) and `isRemote` to `useTreeDrag` (`:613`).
7. `useTreeModel` gives Pierre `dragAndDrop: {canDrag, canDrop, onDropComplete, onDropError}` (`:501`); `canDrag` refuses remote at `:427`, `canDropInto` at `:441`. Pierre stamps `draggable="true"` on every row regardless and asks `canDrag` at `dragstart`, refusing by `preventDefault`.
8. `useTreeDrag.onDragStart` (`:227`) returns early on `isRemote` (`:239`) BEFORE `beginTreeDrag`, which would arm the terminal ATTACH contract with ABSOLUTE paths (`tree-drag.ts:96-121`); that is the reason the comment gives and it still holds at HEAD for a far-side path.
9. A drop, whichever side owns the model update, reaches `opsRef.current.drop(dragged, destDir, modelAlreadyMoved)` (`use-tree-model.ts:452-476`) → `tree-ops.ts:1125` `drop` → `planMoves` → `applyMove` (`:697`) → `fsOps.move` → `fs:move` on THIS Mac. There is no remote arm.
10. The menu's Rename reaches `finishRemoteRename` (`tree-ops.ts:540`) → `ctx.remoteEntry.renameEntry(fromAbs, toAbs, kind)` → `machines:renameEntry` → `renameRemoteEntry` → `entry-rename` on the machine, then `followMoves` and `remote.refresh()`. That is the call a remote drop composes, once per dragged path.

## 3. The p224 probes, and which of them the verifier can re-run for the parent reading

- `.p224/far-fixture.mjs` is the scratch repository shape every remote phase since has copied; `.p233/far-fixture.mjs` is the same file with the prefix changed and two things added to the commits so `git show --name-status` has every letter to say: the second commit RENAMES `docs/design.md` to `docs/design-renamed.md` and the third DELETES `tests/core.test.ts`. The base commit adds 22 files, the side branch modifies one. The same script runs locally under the run directory, so the two History groups draw the same repository shape.
- `.p224/driver.mjs:207` calls `machines.readHistory` straight off the bridge and times it; `.p233`'s launch C does the same to get the FULL shas the group draws, because a `.rhist-row` carries only the short one in `data-rhist`.
- `.p224/probe-p224e.mjs` reads both Explorer trees side by side off Pierre's shadow root by `[role="treeitem"]`; `.p233`'s `treeArm` reuses that reach, reading `[data-item-path]` rows and their `draggable` attribute.
- `.p224/far-final.mjs` and `far-sockets-remove.mjs` are the closing count and the socket sweep; the `.p233` probe's `finally` does both for its own socket on both machines, the way `.p231`'s did.
- Nothing in `.p224` clicks a History row or dispatches a drag. Those two arms are new in `.p233/probe-p233-parent.mjs` (`HISTORY_ARM`, `TREE_ARM`) and are what the verifier re-runs at HEAD: `GMUX_REAL_MACHINE_HOST=… GMUX_REAL_MACHINE_CONFIRM=… node .p233/probe-p233-parent.mjs`, then read `C.remoteHistory.rows[*].afterClick` against `C.localHistory.rows[*].afterClick`, `C.remoteHistory.rows[*].fileRowsAfterClick` against `farNameStatus[<sha>]`, and `C.remoteTree.dragstartPrevented` with `farTreeAfter`.

## 4. The parent reading, taken 2026-09-08 at a03e472 against his Mac Pro

Three launches on one scratch profile and the socket `gmux-p233-79732`: A confirmed the row and turned saving on for the scratch folder through the real Settings controls (`sheetLines` read `May replace files under this folder on that machine: /Users/gdc/tortie-p233-scratch-79732`, the row `confirmed`, `usable: true`, `writeRoot` set); B registered the local and the remote project; C drove both halves on both tabs in 58 s of wall time. The link read `connected` 0 ms after the tab was selected.

### 4.1 The remote History group: four rows, and nothing any gesture changes

`machines:readHistory` answered `ok` with four entries, newest first: `16a5745` (side branch), `ce80143`, `53ba88f`, `ad8e816`. The group expanded on its chevron and drew four `.rhist-row` elements. Each row read, before anything was done to it:

| row | tag / role | aria-expanded | tabindex | cursor | children |
|---|---|---|---|---|---|
| `16a5745` p224 fourth: on the side branch | `div` / `listitem` | none | none | `default` | 6 |
| `ce80143` p224 third: a changelog, and a delete | `div` / `listitem` | none | none | `default` | 6 |
| `53ba88f` p224 second: another helper, and a rename | `div` / `listitem` | none | none | `default` | 5 |
| `ad8e816` p224 base: twenty files | `div` / `listitem` | none | none | `default` | 5 |

Then, for every row, a bubbling `click`, a `dblclick` and a `keydown Enter`, with 1.5 s, 1 s and 0.8 s waits. **After every gesture on every row the row's own reading was byte identical to the one above, the group's `innerText` was unchanged, the editor tab strip held 0 tabs, and no element carrying a file-row class appeared anywhere under the Source control view.** The probe's file-row selector also matched the remote CHANGES group's four `.scm-hfile` rows (two modified, two untracked; `ScmSection.tsx:1373`), and that count read 4 before and 4 after every gesture, which is the constant it should be. **THIS IS THE NUMBER THE DIFF HALF MUST MOVE**: twelve gestures over four rows, zero changes.

What the far side says for each sha, run by ssh through `build/ssh-run.mjs` before the app touched the folder, is the list the group must draw at HEAD:

| sha | `git show <sha> --name-status -M --format= --diff-merges=first-parent --` |
|---|---|
| `ce801432…` third | `A docs/changelog.md`, `D tests/core.test.ts` |
| `16a57457…` fourth (side) | `M docs/changelog.md` |
| `53ba88fe…` second | `R100 docs/design.md → docs/design-renamed.md`, `A lib/helper5.ts` |
| `ad8e8167…` base | 22 `A` rows, `.gitignore` through `tests/core.test.ts` |

### 4.2 The local History group over the same shape, read in the same session

The local group drew THREE rows, not four: the local walk is HEAD's first-parent history and the remote walk is `--branches --tags --remotes`, so the side branch commit is a remote row with no local twin. The verifier's side-by-side must pair rows by sha and not by position.

| row | before click | after click | file rows drawn |
|---|---|---|---|
| `ce80143` third | `role="option"`, `aria-expanded="false"`, class `scm-hrow` | `aria-expanded="true"`, class `scm-hrow selected expanded` | 2: `changelog.md, added` (title `docs/changelog.md`), `core.test.ts, deleted` (title `tests/core.test.ts`) |
| `53ba88f` second | same | same | 2: `design-renamed.md, renamed` (title `docs/design-renamed.md — renamed from docs/design.md`), `helper5.ts, added` |
| `ad8e816` base | same | same | 22, `.gitignore, added` through the last |

Every local file row's title and badge word agrees with the far side's `--name-status` line for the same sha, name for name and letter for letter, which is what the remote group must match at HEAD. Enter on an expanded local row collapsed it again (`aria-expanded="false"`, 0 file rows), so Enter is a toggle there and the remote row must answer it the same way. A click on the first file row, `changelog.md, added`, opened a second editor tab named `changelog.md` carrying the sha chip `ce80143`, active, with the diff surface mounted. That is the two-sided diff the remote row must open.

One probe artefact worth naming so nobody reads it as a finding: the remote arm's "file open" step clicked the first element its selector found, which was the remote CHANGES row `helper1.ts, modified, in lib`, and that opened a working-copy diff tab `helper1.ts` with no sha chip through `loadRemoteDiff`. It proves the remote diff surface and its loader exist and says nothing about history.

### 4.3 The trees: `draggable` is stamped on both, and the refusal is at `dragstart`

With saving ON for the scratch folder (the write root confirmed in launch A, so this is the parent's true limit and not the writes-off refusal), both Explorer trees drew ten rows after `docs/` was expanded, and every row on BOTH trees carried `draggable="true"` and `role="treeitem"`. Pierre stamps the attribute on every row and asks `canDrag` only when a drag starts, so the attribute is not the reading. The event is:

| | remote tree, `docs/notes.md` → `lib/` | local tree, same |
|---|---|---|
| `dragstart` `defaultPrevented` | **`true`** | `false` |
| types stamped on the transfer | **none** | `text/plain`, `application/x-gmux-tree-drag` |
| `dragenter` / `dragover` / `drop` prevented on `lib/` | `false` / `false` / `false` | `false` / `true` / `true` |
| toasts, sentences | none | none |
| disk after (`ls docs lib`, `git status --porcelain`) | `notes.md` still in `docs`, status unchanged | `notes.md` still in `docs`, status unchanged |

**THIS IS THE NUMBER THE MOVE HALF MUST MOVE**: `dragstartPrevented` reads `true` on the remote tree and the far side's tree is unchanged. At HEAD it must read `false` with the two types stamped, and the far side must hold `lib/notes.md` after the drop.

**The local arm did not move the file either, and that is the probe's limit, not the product's.** A synthetic `DragEvent` sequence dispatched from JavaScript does not carry Chromium's real drag session, so Pierre's controller never reaches its own drop path; the local `dragover` and `drop` reading `true` is the host's handlers accepting, not a completed move. So the synthetic sequence is a control for the FIRST event only. The verifier at HEAD takes the move with real Input-domain events through the harness, the way Phase 213's launch E drove a slider, or takes the far side's tree after a hand-driven drop; the `defaultPrevented` flip is the cheap reading and the far tree is the proof.

### 4.4 The face, side by side

Under the operator's rule the verifier reads every sentence on the remote face against the local one. At the parent, on the Explorer, the remote sidebar read `EXPLORER / Read at 12:28. Press Refresh to read it again.` and the local read `EXPLORER`. That sentence is Phase 228's clock, and Phase 230 takes it off (`wt-p230` commit `70d1ca18`, "the stale sentence becomes nothing, and the clock comes off"); it is not this phase's to add or remove, and a verifier who finds it at HEAD should check whether 230 landed under 233 before charging it. The remote History group's own text was the four rows and nothing else. The remote Source control view carried no sentence about commits at all.

### 4.5 What was left on both sides, counted at the end

Far side: `gmux-control created 1787879931 attached 1` before and after, ONE session, the `gmux` socket alone in `/private/tmp/tmux-501` before and after, the scratch server `gmux-p233-79732` killed and its socket `SOCKET-GONE`, the scratch directory `GONE`, no process naming `p233`, exactly the two tmux processes that were there before (the bundled server up 11 days, his client holding `gmux-control`), `~/.gitconfig` 140 bytes at mtime 1715199342 with no global `user.name` (rc=1) before and after, `~/.ssh` holding `authorized_keys` alone at 88 bytes and no `known_hosts`. This Mac: `/private/tmp/tmux-501` holding `gmux` alone before and after, the local scratch socket `gmux-p233-79732` unlinked after `lsof` found no holder, 14 sessions on the operator's `gmux` server before and after, Tortie's record file 113 bytes and his `known_hosts` 2,215 bytes unmoved, the ssh agent holding no identity, and eleven Electron-family processes at the end, every one his own (three name his Application Support profile, the rest are Screen Studio, Granola, Slack and the dev Electron under `/Users/gdc/gmux` that has been up a day) and none naming the run's profile. After the smoke run, taken last, the count read sixteen and `/private/tmp/tmux-501` held `gmux-p230-3461` beside `gmux`: a Phase 230 verifier was running on this Mac at the time under `/private/tmp/p230-verify-head-3461/profile`, its socket held by two processes, so it is that phase's and was left alone.

## 5. The gates at the parent, run to logs

| gate | exit | what it printed |
|---|---|---|
| `npm run typecheck` | 0 | 42 boundary fixtures, 1198 production files, 0 violations |
| `npm run build` | 0 | contract inventory matches `docs/audits/contract-baseline.txt` byte for byte; 171 check scripts hermetic |
| `npm run conformance:machines` | 0 | PASS; "the catalogue now holds 25 scripts of which 8 write" |
| `npm run conformance:remoteclose` | 0 | 11 of 11 |
| `npm run gate:knownhosts` | 0 | 281 files read, 19 reach `build/ssh-run.mjs`, 36 fixtures, 32 fail as they must |
| `npm run smoke:t1` | 0 | 6 of 6, "T1 restart acceptance test complete", the scratch server on `gmux-smoke-t1-wt-p233-6321` ended by the harness; run after the probe because it rebuilds `out/` |

## 6. The smallest set of files, and where a rebase will fight

### The builder touches

| File | Why |
|---|---|
| `src/main/machines/remote-scripts.ts` | the one new read script, a `git show <sha> --name-status -M --format= --diff-merges=first-parent` for the list and a `git show <sha>^:<path>` / `<sha>:<path>` pair for one file, both under the ceiling, the `review-file` shape (:713) with the `$2` path guard; catalogue row with `mode: 'read'` and a reason of 30 characters or more |
| a NEW `src/main/machines/remote-commit-files.ts` (or the like) | the reader, because condition 57i pins `remote-history.ts` to one read naming `repo-history`; parse with `parseNameStatusZ` from `../git/parse.ts` |
| `src/shared/ipc/machines/scm.ts` | the input, the answer and the channel(s), beside `machines:readHistory` at :916; one baseline line per channel |
| `src/preload/machines.ts` | one line per channel, the way `readHistory` is at :156 |
| `src/main/machines/ipc.ts` | the handler beside `machines:readHistory` at :1586 |
| `src/renderer/scm/remote-history.ts` | per-sha detail held in the store, keyed the way `depth.ts:197` keys `details`; no timer, or condition 57l goes red |
| `src/renderer/scm/RemoteHistorySection.tsx` | the row becomes `role="option"` with `aria-expanded`, a click toggles, file rows draw with `fileBadge`, a file row calls `requestOpenFile` with BOTH `commit` and `remote`; header rule 4 rewritten |
| `src/renderer/scm/remote-history.css` | the row gains the hover, selected and pointer rules the local `.scm-hrow` has (`scm.css:662-710`), because the header says the absence was deliberate while the row could do nothing |
| `src/renderer/editor/tab-io.ts` | a tab carrying both `remote` and `commit` needs a loader that asks the new channel rather than `loadRemoteDiff`'s `reviewFile`; the branch is beside :265 |
| `src/renderer/machines/history.ts` | any new sentence, so the vocabulary audit reads it; under the operator's rule there should be none beyond a disabled control's label |
| `src/renderer/tree/use-tree-model.ts` | `canDrag` :427 and `canDropInto` :441 become the `canRenameHere` predicate (:329) |
| `src/renderer/tree/use-tree-drag.ts` | :239 stops returning on `isRemote`; `beginTreeDrag` must NOT be armed with far-side absolute paths, so the remote branch either skips it or the ATTACH contract learns to refuse a machine path |
| `src/renderer/tree/tree-ops.ts` | `drop` :1125 and `applyMove` :697 gain a remote arm composing `ctx.remoteEntry.renameEntry` per path, with `renameRefusal` (:439) for the four words and `revertModel` on refusal, as `finishRemoteRename` (:540) does |
| `build/conformance-machines.mjs` | `REMOTE_SCRIPT_COUNT` 25 → 26 at :2926; the new id classified as a read by condition 35's own walk |
| `docs/audits/contract-baseline.txt` | regenerated with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`; the commit body names the line(s) |
| tests | `p107-remote-history.test.tsx:575` (`never gives a row a control`) and `:728` (`draws a row that does not expand`) invert; `p228-off-the-face.test.ts` must stay green, so no sentence with the forbidden words returns; a drag test beside `p903-b-tree-menu-remote.test.ts` |

### Where another phase in flight is likely to touch the same lines

- **Phase 230**, `/private/tmp/wt-p230` at `6c41b4c4`, five commits above merge-base `41405d7`, plus untracked verify files, and NOT landed. It touches, against this phase's set: `src/renderer/scm/RemoteHistorySection.tsx` (66 lines: removes `onRefresh` and the Refresh button, removes the read-at clock, adds `useRemoteReread`, rewrites header rules 2 and the last paragraph), `src/renderer/scm/remote-history.ts` (39 lines: adds `refused` to the entry and the store's two refused paths), `src/renderer/tree/tree-ops.ts` (23 lines: `announceRemoteWrite` after a remote create, folder and rename land, which a remote MOVE should announce too), `src/renderer/tree/use-tree-rename.ts` (25 lines: `refreshRemoteTree` re-reads the decorations with the rows), `src/renderer/tree/FilesSection.tsx` (218 lines), `src/renderer/scm/ScmSection.tsx` (146 lines), `build/conformance-machines.mjs` (12 lines) and `src/renderer/machines/__tests__/p228-off-the-face.test.ts` (36 lines). **Every renderer file this phase's history half edits is on that list.** Whichever lands second rebases across the other's header rewrite of `RemoteHistorySection.tsx`, and if 233 lands first, 230's removal of `onRefresh` meets 233's new row props in the same component signature.
- **Phase 232**, `/private/tmp/wt-p232` at `982153c5`, five commits above `8e5694c`, not landed. It touches `src/main/machines/ipc.ts` (11 lines), `src/main/sessions/core.ts`, `src/main/machines/sign-in-retry.ts` (new), `src/renderer/scm/ScmSection.tsx` (8 lines), `src/renderer/tree/FilesSection.tsx` (10 lines) and `src/renderer/state/machines-slice.ts`. The `ipc.ts` overlap is one registration block each and should merge clean; nothing else meets this phase.
- **Phase 227** landed at `e5300ec` and **Phase 225** at `c8855fe`; their redline files do not meet this phase. The only shared surface is `build/` for `gate:knownhosts` and `gate:electron`, and `HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` if the phase adds a probe under `build/` rather than under `.p233/`.
- Last commits to the shared files at `a03e472`: `RemoteHistorySection.tsx` by `7ad54d71` (Phase 228), `use-tree-model.ts` and `use-tree-drag.ts` by `aca5af4f`, `remote-scripts.ts` by `43f8dd70` (Phase 229). In `wt-p230`, `RemoteHistorySection.tsx` by `71e9049b` and `tree-ops.ts` by `81689392`.

## 7. What was not measured

- A real drop on either tree. The synthetic sequence stops at Pierre's controller (section 4.3), so the far tree after a completed remote move is a HEAD reading the verifier takes with real input events.
- The bytes and the seconds of the two `git show` calls over the link. Phase 107's row 20 measured them outside the product on the loopback machine and this phase did not repeat that on his Mac Pro; the new script's answer size is bounded by the ceiling the charter names.
- Enter and arrow keys on a remote row once it can expand; the parent has no keyboard path to read.
- The remote rename's `done` outcome, which a move over a lost answer would hit; `renameEntry(absent)` in Phase 231's matrix answered `gone`, and `done` needs the end state already held.
