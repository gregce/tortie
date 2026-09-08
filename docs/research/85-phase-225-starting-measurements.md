# 85. The redline baseline: starting measurements for Phase 225

The measure step of Phase 225, taken on 2026-09-07 in the worktree `/private/tmp/wt-p225` at
`54a5e96`, which is the parent every number below is a reading of. Nothing was built. No Electron
was launched, socket `gmux` was never addressed, no agent took a turn, nothing under the person's
home was written, `package.json` and the lockfile did not move. One scratch git repository was made
under the worktree's `.p225/` for one measurement and removed in the same command; one throwaway
vitest file was written beside the editor tests, run, and deleted, and `git status` was empty after
it.

The charter is the Phase 225 entry in `docs/BACKLOG.md` and research 83 sections 0, 1, A, C and F.
This document does not re-derive what research 83 measured. It confirms what the charter cites
against the tree, records two things the charter inherits from research 83 that the tree
contradicts, takes the parent readings, and names the smallest set of files the builder must
touch.

## 0. The three findings a builder needs before the first edit

1. **The untracked-file mechanism the charter states is not the tree's.** Research 83 A1.2 property
   2 says `git show HEAD:untracked.md` exits 128, `loadHead` catches that and patches
   `canDiff: false`, and the charter repeats it: *"Today `loadHead` catches git's exit 128 and sets
   `canDiff: false`."* Real git 2.50.1 does exit 128 with `fatal: path 'untracked.md' exists on
   disk, but not in 'HEAD'`, measured in a scratch repository (section 5). But
   `src/main/git/service.ts:84` matches that sentence with `MISSING_IN_REV_RE`, `showAtRefBuffer`
   answers **null** rather than throwing, and `src/main/git/ipc.ts:229` answers the renderer
   `(await svc.showHead(input.path)) ?? ''` under a comment calling that a frozen contract. So
   `loadHead` never throws for an untracked file and never sets `canDiff: false` for one. What keeps
   an untracked prose file from a Redline tab at open is `store.ts:424`, `wantsDiff = req.mode ===
   'diff' && fileInRepo(...)`, and the tree sends `mode: 'file'` for an untracked or ignored status
   (`src/renderer/tree/decorations.ts:107`, `openModeFor`). Driven under node with the shipping
   store, the shipping tab IO and the frozen `''` answer (section 5): at open the tab reads
   `canDiff: false`, `headContents: null`, zero `showHead` calls; **after ONE `refreshRepo` tick it
   reads `canDiff: true`, `headContents: ''`**, because `tab-io.ts:647` flips `canDiff` whenever
   `head !== savedContents` and `''` differs from any non-empty file. So the app today offers Diff
   AND Redline on an open untracked prose file after the first watcher tick, and the redline it
   draws is the whole file inserted against nothing. The charter's claim, *"an untracked prose file
   that is OPEN when an agent writes to it gets a redline where today it gets none"*, is true of
   the moment of the open and false from the first tick; what this phase really changes for that
   file is the LEFT SIDE, from `''` to the first bytes read.
2. **The renderer cannot tell an empty HEAD version from no HEAD version.** The `''` above is the
   same `''` a committed empty file answers. The rule *"a HEAD version Tortie has not seen before
   wins outright"* applied to a `''` answer on the first tick would re-seed the untracked file's
   baseline to nothing and draw everything green, which is exactly the picture this phase exists
   to stop. The builder has to decide this before writing the seeding function, and the smallest
   honest rule is that a `''` answer from `git:showHead` never seeds a baseline, with the committed
   empty file stated as the limit; widening the contract to carry null is a `gate:contract` line
   and belongs to no phase in this trio.
3. **Two line citations drifted, and one gate the charter does not name must be touched.**
   `EditorPanel.tsx:217` is `:219` at this tree; `monaco-loader.ts:135` names the function and the
   `setValue` call is `:138`. And `EditorPanel.tsx:685` to `:690` falls a `redline` tab back to
   `file` whenever `!canDiff`, which the charter's two named gates at `:219` and `:236` do not
   cover; ungating the option without ungating the fallback draws Source under a Redline chip.

## 1. The drift list, every citation against `54a5e96`

| Cited | At this tree | Holds |
| --- | --- | --- |
| `RedlineDocument.tsx:89` `composeRedlineDocument(tab.headContents ?? '', workingText)` | `:89`, byte for byte | yes |
| `RedlineDocument.tsx:120` the `ed-note` banner with `role="status"` | `:120` | yes |
| `store.ts:587` `void io.loadContents(id, req.path);` inside `openFromRequest` | `:587`, and `:588` is the `loadHead` beside it | yes |
| `store.ts:100` `MAX_TABS = 10` | `:100` | yes |
| `store.ts:353` the editor store's `onRepoChanged` subscription | `:353` | yes |
| `EditorPanel.tsx:217` the `if (tab.canDiff)` that wraps the Diff option | **`:219`** | drifted by two |
| `EditorPanel.tsx:236` `if (isRedlinePath(tab.path))` | `:236` | yes |
| `EditorPanel.tsx` fallback of a HEAD-needing mode when `!canDiff` | `:685` to `:690`, NOT cited by the charter | must be touched |
| `tab-io.ts:616` `if (!tab.dirty)` in `refreshRepo` | `:616` | yes |
| `tab-io.ts:640` `gmux.git.showHead` on every tick | `:640`, with the `canDiff` flip at `:647` | yes |
| `tab-io.ts:465` and `:552` `if (tab.deleted \|\| tab.truncated \|\| tab.error !== null) return false` | `:465`, `:552` | yes |
| `tab-io.ts:114` `loadContents`, `:133` `loadHead` | `:114`, `:133` | yes |
| `repo-watcher.ts` worktree and dotgit subscriptions | `:250` and `:431` | yes |
| `redline-document.ts` `redlineDocumentNote` | `:496`; `whole` at `:145` | yes |
| `monaco-loader.ts:135` `model.setValue` in `resetWorkingModel` | function at `:135`, **call at `:138`** | drifted by three |
| `src/main/fs/ipc.ts:57` `READ_CAP_BYTES`, `:238` `writeFile` | `:57`, `:238` | yes |
| `MonacoHost.tsx:167` read-only for truncated | `:167` | yes |
| `src/main/git/ipc.ts:109` `ensureWatcher` | `:109` | yes |
| research 83 A1.2 property 2, `loadHead` catches exit 128 | wrong; see section 0 finding 1 | **contradicted** |
| `CLAUDE.md:269` "fourteen rulings" for `conformance:redline` | the gate prints sixteen; owed by a later commit, recorded in research 83 section 2 | stale, not this phase's |

`docs/arch/` does not exist in this tree, so no standing contract binds these files.

## 2. The data flow, in ten lines

1. A tree click calls `requestOpenFile` with `mode: 'diff'` only when `openModeFor` reads a git
   status that is not untracked, ignored or absent (`FileTree.tsx:493`, `decorations.ts:107`);
   otherwise `mode: 'file'`.
2. `openFromRequest` (`store.ts:380`) raises an already open tab without any read (`:391`); a new
   tab is built with `canDiff: wantsDiff`, `savedContents: ''`, `headContents: null`,
   `loading: true` (`:424`, `:480`, `:516`, `:517`), and past ten tabs the stalest clean one is
   evicted with its model disposed (`:540`).
3. `io.loadContents` runs from that one call site (`store.ts:587` to `tab-io.ts:114`):
   `gmux.fs.readFile` lands `{savedContents, truncated, loading: false, error: null,
   deleted: false}`, and a throw lands `error` with `loading: false`. This is the first successful
   read the charter names, and it happens when the person opens the file.
4. `io.loadHead` runs only if `wantsDiff` (`store.ts:588` to `tab-io.ts:133`): outside the
   repository it patches `canDiff: false` with no git call; otherwise `git.showHead` lands
   `headContents`, which is `''` for a path missing in HEAD (finding 1) and throws only for a real
   git failure, which lands `canDiff: false` plus a toast (`:158`). `loadContents` and `loadHead`
   are both `void` and land in either order.
5. `setMode(id, 'redline' | 'diff')` (`store.ts:676`) is refused for a worktree tab outside the
   repository and calls `loadHead` when `headContents === null` (`:705`); `activate` stamps
   `lastUsed` and reads nothing (`:592`).
6. `RepoWatcher` (`repo-watcher.ts:250` worktree, `:431` dotgit) coalesces to `onChange` on a
   300 ms non-resetting window, the bus carries it to the renderer, `repo-changed.ts` adds a
   shared 150 ms debounce, and `store.ts:353` calls `io.refreshRepo(repoPath)` when any tab is in
   that repository.
7. `refreshRepo` (`tab-io.ts:573`) walks `worktreeTabsIn` (no commit, remote, map or report
   tabs), skips an unsaved draft, marks a vanished file `deleted`, and for a CLEAN tab (`:616`)
   re-reads the file; a changed read lands `savedContents` and `truncated` and calls
   `resetWorkingModel`, which is Monaco `setValue` (`monaco-loader.ts:138`) and clears the undo
   stack. A dirty tab is not re-read at all.
8. The same tick then asks `showHead` for every in-repo tab (`:640`), lands `headContents` every
   time, and flips `canDiff` to true when `head !== savedContents` (`:647`). Nothing ever flips it
   back.
9. `RedlineDocument` (`RedlineDocument.tsx:54`) takes `workingText` from `useLiveTabText(tab.id,
   tab.savedContents, !historical)`: the Monaco working model's text when a model exists, debounced
   150 ms on `onDidChangeContent` (`live-text.ts:19`), else `savedContents`. So the right side is
   the buffer when File mode has ever mounted and the disk read otherwise.
10. `:84` to `:91`: `contentsLoading = tab.loading || tab.headContents === null` draws the
    skeleton; otherwise `composeRedlineDocument(tab.headContents ?? '', workingText)` is memoised
    on that pair, `:92` derives the note, `:93` names `against` as `HEAD` or the commit in the
    scroller's `aria-label`, and `RedlineRuns` draws one flat list of `<del data-redline-del>`,
    `<ins data-redline-ins>` and `<span>` children inside `.ed-redline-doc[data-redline]`
    (`RedlineRow.tsx:56`).

Two consequences for the phase's proof. An untracked file never has `headContents` set at open,
so the `contentsLoading` gate at `:84` would show the skeleton for ever unless it asks the baseline
instead. And the projection property off the live DOM is the concatenation of every top level
child of `.ed-redline-doc` that is not `INS` against the baseline and every child that is not `DEL`
against the file, which is exactly what `oldTextOf` and `newTextOf` compute under node.

## 3. What the face says today, and where

`redlineDocumentNote` (`redline-document.ts:496`) answers null unless the line partition gave up
(`approximate`) or a block drew whole, and then one or two sentences: *"Too many changed lines to
pair up, so the changed stretch is drawn as one block."* and *"N changes drawn whole rather than
word by word (a rewritten, b too long, c past the first 60)."* It is drawn at
`RedlineDocument.tsx:119` to `:123` as `<div class="banner ed-note" role="status">` under the
scroller, so it is absent under ordinary editing and it is a live region when present. The only
other place the baseline is named is the `aria-label` at `:103`, *"Redline vs HEAD, name"*.

The charter puts the baseline's name, its lifetime and the dirty-tab limit in that slot. Two
things follow that the builder should decide deliberately rather than discover. The banner will now
be present on every redline, and a `role="status"` region announces its text on change, so the
sentence must change only on a re-seed and never on a tick, and the caps note may deserve the live
role while the baseline name does not. And the `aria-label` at `:93` still says `HEAD`; the face
naming the baseline includes that label.

## 4. The parent readings

`npm run conformance:redline` at `54a5e96`, log at `.p225/parent-conformance-redline.log`, load
average 5.30 at the start: **sixteen rules, every rule passed, exit 0**. Rule 5's wall clock read
**157 ms against the 400 ms ceiling**, which sits beside research 83's 156 ms at load 4.98 and its
487 to 695 ms at load 97.48; a red rule 5 is a question about the machine first. Rule 9 printed its
own sentence, *no redline file names a bridge, a write or an accept, so nothing here can change a
file*, and it must print it again after this phase.

`npx vitest run src/renderer/editor` at the parent, log at `.p225/parent-vitest-editor.log`:
**27 files passed, 279 tests passed, 705 ms**. `p194-redline-document.test.ts` holds 21 of them.

## 5. The two measurements this step took itself

**Real git, scratch repository, git 2.50.1 (Apple Git-155).** `git show HEAD:untracked.md` in a
repository with one commit: `fatal: path 'untracked.md' exists on disk, but not in 'HEAD'`,
exit 128. On an unborn branch: `fatal: invalid object name 'HEAD'.`, exit 128. Both sentences
match a regex in `service.ts:75` and `:84`, so both answer null in main and `''` at the bridge.

**The shipping store and tab IO under node, over the frozen `''` answer.** The throwaway test
opened `/repo/untracked.md` with `mode: 'file'`, flushed, then ran `createTabIo(...).refreshRepo`
once with `readDir` answering the file present and `showHead` answering `''`. Result, verbatim
from `.p225/measure-untracked-tick.log`:

```
atOpen:    mode "preview", canDiff false, headContents null, showHead calls 0
afterTick: mode "preview", canDiff true,  headContents "",   showHead calls 1
```

That is finding 1. The renderer's own vitest stubs were enough to take it, so the builder's test
can take the same reading before and after the change.

## 6. How the editor store tests are shaped

Every store test under `src/renderer/editor/__tests__/` (`tab-error-close.test.ts`,
`out-of-repo-tab.test.ts`, the remote and image suites) has one shape, and the new test should
match it so it reads like its neighbours:

- `vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, dispatchEvent: () =>
  true, gmux: { fs: { readFile, readImage, writeFile, readDir }, git: { showHead, onChanged: () =>
  () => undefined } } })`, with each bridge method a `vi.fn`; `localStorage` and `document.body`
  stubbed the same way.
- `const { useEditor } = await import('../store')` at top level AFTER the stubs, and
  `createTabIo` from `../tab-io` when the IO is driven by hand with a deps object of `patch`,
  `byId` and `worktreeTabsIn`.
- `useEditor.getState().openFromRequest(req())`, `await flush()` (one `setTimeout(0)`), then read
  `useEditor.getState().activeTab()`; `beforeEach` resets `{tabs: [], activeId: null, panelOpen:
  false}` and clears the mocks.
- Assertions on WHICH bridge method was called and how often, the way the image suite does, because
  the regression shape is a doomed call a person only sees as an error.
- `vitest.config.ts` includes `src/**/__tests__/**/*.test.ts` under `environment: 'node'`; the file
  name convention is `pNNN-<subject>.test.ts`.

The charter's test, being that the baseline never advances on a file change, a look, a save or a
tab switch and does advance on an unseen HEAD version, is four `refreshRepo` or store calls with
the mocks answering different bytes, and each clause is one `vi.fn` return value; the ablation
that must turn each red is the corresponding clause of the seeding function.

## 7. `P167_SURFACES` in `build/probe-p167-scale.mjs`

`SURFACES` is `process.env['P167_SURFACES'] ?? 'overview,arch,file,diff,preview'`, split on commas
and trimmed (`:211`), and `wantSurface(name)` is `SURFACES.includes(name)`; an unknown name is
silently never driven. `cycleSurfaces` (`:971`) runs one `if (wantSurface(...))` block per surface:
`drive(cdp, spec)` calls `window.__gmuxShotDrive(spec)` over CDP (`:691`), `until(cdp, expr, ms)`
waits on a DOM expression and a miss goes into `log.openMisses`, then `press(cdp,
CHORD.closeEditorTab)` (Cmd-W) and `closeOrCount` waits for the surface's selector to be gone. The
fixture `repo-a` (`:531`) commits `README.md`, `notes.md` and `src/app.js`, then modifies
`README.md` so the diff has rows; both `.md` files pass `isRedlinePath`.

Adding `redline` needs exactly this, in the same shape as the `diff` block at `:1010`:

```js
if (wantSurface('redline')) {
  await drive(cdp, { projectPath: repoA, openRel: 'README.md', mode: 'diff', editorMode: 'redline' });
  if (!(await until(cdp, `document.querySelector('.ed-redline-doc') !== null`, 15000))) log.openMisses.push('redline');
  await press(cdp, CHORD.closeEditorTab);
  await closeOrCount('redline', `document.querySelector('.ed-redline-doc') === null`);
}
```

`editorMode: 'redline'` is already in the drive spec's type (`shot-hook.ts:146`) and is applied
through the real `setMode` after the diff surface settles (`:903`), so no harness change is needed.
The default list at `:212` gains `redline`, and the words "five surfaces" at `:141`, `:201`, `:970`
and `:977` are then wrong by one. `probe:p167` is classified `electron` in
`build/verification-checks.mjs:396`, is not in the commit battery, takes ten to twenty minutes,
and `P167_PROFILES=c P167_SURFACES=redline` drives this surface alone. Driving it with a file
being rewritten under it is Phase 227's obligation, not this one's. No new file reaches
`build/electron-run.mjs` for this change, so `HELPER_USER_FLOOR` in `gate:electron` does not
move; if the builder writes a NEW app-run probe file for this phase, the floor is raised in the
same commit.

## 8. The smallest set of files the builder must touch

1. **`src/renderer/editor/tab-types.ts`** — the one field, optional like `remote` and `draft` so
   every hand written fixture stays a valid tab: the baseline text, a generation counter, and the
   last HEAD bytes seen, because `headContents` is overwritten every tick and cannot itself say
   whether HEAD moved.
2. **A new small pure module beside `redline-document.ts`**, say `src/renderer/editor/baseline.ts`,
   holding one function that takes the tab's current baseline state and one event (first read,
   HEAD seen, tick) and answers the next state. It is the thing the charter's test ablates clause by
   clause, it needs no bridge and no React, and it is where the `''` decision of finding 2 is
   written down once. It must name no bridge, no write and no accept, so rule 9's scan stays green.
3. **`src/renderer/editor/tab-io.ts`** — three call sites into that function: `loadContents`
   (`:114`) seeds at the first successful read; `loadHead` (`:133`) and the tick's HEAD read
   (`:640`) apply the unseen-HEAD rule. Nothing in `refreshRepo`'s file re-read (`:616`) touches
   the baseline, which is policy Z refused.
4. **`src/renderer/editor/store.ts`** — the initial field on the tab at `:516`, and nothing else.
5. **`src/renderer/editor/RedlineDocument.tsx`** — `:84` asks the baseline rather than
   `headContents` for `contentsLoading`; `:89` composes against the baseline; `:93` names it in
   the `aria-label`; the `ed-note` slot carries the baseline's name, its lifetime ("as long as this
   tab is open"), the dirty-tab limit when `tab.dirty`, and the existing caps note. The resting
   markup of the document itself stays byte identical.
6. **`src/renderer/editor/EditorPanel.tsx`** — `:219` and `:236`, lifting the Redline option out
   of the Diff gate so it is offered when the path is prose and a baseline exists; and `:685` to
   `:690`, so a `redline` mode with a baseline and no `canDiff` is not sent to `file`.
7. **`build/probe-p167-scale.mjs`** — section 7.
8. **`src/renderer/editor/__tests__/p225-shadow-baseline.test.ts`** — section 6.

Not touched: `redline-document.ts`, `redline.ts`, `redline-copy.ts`, `RedlineRow.tsx`,
`redline.css`, `monaco-loader.ts`, `live-text.ts`, `repo-watcher.ts`, anything under `src/main`,
`src/shared/ipc`, `docs/audits/contract-baseline.txt`, `package.json`.

## 9. What was NOT measured here

- No Electron ran, so nothing in the running app was observed; the app run is the builder's and the
  verifier's, and research 83 section H says it is the first thing a build phase owes.
- The `''` answer was driven from a stub of the bridge, not from main; the bridge's own `?? ''` was
  read from `src/main/git/ipc.ts:229` and real git's exit 128 was measured, so the two halves of
  finding 1 are each measured and the join between them is read.
- The order in which `loadContents` and `loadHead` land for one open was not measured; both are
  `void` at `store.ts:587` and `:588`, and the seeding function must give the same answer in either
  order.
