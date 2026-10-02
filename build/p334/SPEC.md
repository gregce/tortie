# Phase 334 — the editor re-reads a file when you come back to it, and Redline keeps its place (issues 33 and 32 item 3)

The spec for `docs/BACKLOG.md`'s `## Phase 334` entry, reconciled with the tree at `d89d1ad1`
(origin/main). Every file:line below was re-read at that commit. Where this file and the entry
disagree, this file is the build's authority and §12 says why.

- **Subject.** `fix(editor): re-read an open file when you come back to it, and keep Redline's place`
- **First body line.** `Phase 334: the editor re-reads on return, and Redline remembers where you were`
- **Semver.** Patch, unreleased (no bump, no tag). **No contract change. No menu change.**
- **Parent measured for both items:** `d89d1ad1`. The entry says `28d89295`; this phase builds on `d89d1ad1`.

## 0. The two promises, and the one thing that matters more than either

1. **Item A (Tier 3).** A file an agent rewrote shows the agent's bytes when the person comes back to
   its tab or clicks into the editor, even in a folder the repository ignores.
2. **Item B (Tier 2).** A Redline tab opens where the person left it, and two Redline tabs no longer
   share one offset.

**What matters more:** item A decides WHEN a buffer's contents are replaced, which is the one thing in
the editor that can lose typing. This phase adds CALLERS of the existing walk and changes nothing about
the walk itself. `refreshRepo`, its serializer, its clean test (rules 22 and 26 of `conformance:save`),
the save doors and their sentences are not edited. A builder who finds they want to edit any of those has
left the phase, and stops and reports.

## 1. The reading (cited, do not re-derive)

### 1.1 The walk and its one gate — `src/renderer/editor/tab-io.ts`, `src/renderer/editor/store.ts`

- `refreshRepo` (`tab-io.ts:1827-1977`) walks `deps.worktreeTabsIn(repoPath)` in `tabs` order. Per tab:
  a draft never saved is skipped (`:1841`); an image tab re-reads through `loadImage` and bumps
  `imageRevision`, which changes the asset URL and refetches the picture (`:1846-1853`); then
  `fs:readDir` of the parent (existence, `deleted: true` when gone, `:1855-1869`); then, only when the LIVE
  tab is clean before and after the read, the same model is still there and `savedContents` has not
  moved, `savedContents` and the model take the disk's bytes (`:1902-1925`); then `git:showHead`, the
  HEAD and baseline patch, and `persistBaseline` (`:1934-1974`). The tab is patched with
  `headContents`/`baseline` on EVERY walk (`patchTab`, `store.ts:471-483`, always builds a new tab
  object), which is harmless to the Redline compose memo because the strings compare equal.
- The serializer `queuedRefresh` (`tab-io.ts:2021-2041`): one walk per repo running, at most one queued;
  every later call joins the queued one. It bounds CONCURRENCY, not RATE.
- **Which tabs the walk reads is decided in the store, not in tab-io:** `worktreeTabsIn`
  (`store.ts:596-608`) keeps `repoPath` equal, `commit === null`, `remote === undefined`, no `archMap`,
  no `diagnostics`, no `compare`. (The entry cites `tab-io.ts:20`, which is a header comment.)
- Three callers today: the bus, `onRepoChanged → io.refreshRepo` (`store.ts:851-854`, debounced 150 ms in
  `src/renderer/state/repo-changed.ts`); `rereadRepo` (`store.ts:1445-1447`, Phase 282.2), whose one
  caller is `RedlineDocument.tsx:929-933`, the clean transition under a landed rewind hold. The bus never
  fires for an ignored folder (`src/main/watcher/repo-watcher.ts:243-264`,
  `src/main/watcher/ignored-roots.ts:137-158`; research 83 §C.2: tracked 8/8, ignored 0/8).
  (The fix round, verifier A's V3i.) The bus never fires FOR an ignored folder, but when it fires for
  any tracked change its walk reads every open tab of the repository, ignored-folder tabs included
  (`worktreeTabsIn` has no ignore filter). So today's "stale until a save refuses" holds only while
  nothing tracked changes in that repository, and a probe arm's parent column reads 0 of N only if no
  tracked write raised the bus between its write and its look.

### 1.2 How a tab comes on screen — `store.ts`

| Path | Code | Calls `activate`? |
| --- | --- | --- |
| Strip click, Enter, right-click | `EditorTabs.tsx:115,122,126` | yes |
| ⌘⇧] / ⌘⇧[ | `cycleTab`, `store.ts:1336-1343` | yes |
| Re-open of an open file (tree, search hit, link) | `openFromRequest` existing branch, `store.ts:934` | yes |
| ⌃Tab steps | `cycleMru`, `store.ts:1345-1357`, `focusPatch` directly | **no** |
| ⌃Tab landing | `commitMru`, `store.ts:1359-1364`, on EVERY Control keyup in the window (`EditorPanel.tsx:705-707`), ⌃C in a terminal included | **no** |
| Project switch | `switchProject`, `store.ts:1616-1682`, from `init`'s subscription (`:842-846`) and `revealProject` (`:783-789`) | **no** |
| Close's successor | `forceCloseTab`, `store.ts:1263-1267` | no |
| Rename follow | `src/renderer/tree/editor-follow.ts:38-56`, sets `activeId` directly | no |
| Fresh open | `openFromRequest` new branch, `focusPatch` at `:1168` | no (its own `loadContents` reads) |

### 1.3 The two editor surfaces' focus

- **Monaco** (`MonacoHost.tsx`): one editor instance reused across tabs (no `key`, `EditorPanel.tsx:780`).
  The wiring effect (`:251-341`) disposes and re-creates `blurListener` (`:192`, `:277-278`,
  `:318-322`, torn down again at `:456`), then focuses the editor when a different tab arrives
  (`:331-333`). Monaco 0.56.0 has `onDidFocusEditorWidget`, a `BooleanEventEmitter` that fires only on a
  change to true, i.e. focus ENTERING the widget (`codeEditorWidget.js:125-127,1313-1317`), and
  `onDidFocusEditorText`, which also fires on moves inside the widget (find widget back to text).
- **Redline** (`RedlineDocument.tsx`): the scroller `.ed-redline-scroll` (`:1106-1150`) is focused by the
  view itself on every tab change (`:407-409`, `preventScroll`); its `onFocus` (`:1140-1146`) is React's
  focusin and today only makes a change current.

### 1.4 The Redline scroller — `RedlineDocument.tsx`, `EditorPanel.tsx:824`

- Mounted as `<RedlineDocument tab={activeTab} />` with no `key` (`EditorPanel.tsx:824`; the entry says
  `:828`), so two Redline tabs share one scroller element and one component instance. Leaving for another
  mode unmounts it and coming back mounts it at 0.
- Nothing reads or writes `scrollTop`. Only Monaco keeps per-tab view state (`monaco-loader.ts:290-307`).
- `doc` is null while the skeleton shows (`:734`, `:742-747`): a tab whose HEAD is still loading draws
  `<OpeningSkeleton />` inside the scroller, which shrinks it and clamps `scrollTop` to 0.
- **The stale first render.** On a Redline→Redline switch the component is reused and two hooks carry the
  departing tab's text for one or two commits: `useLiveTabText` keeps its `modelText` state until its
  effect runs (`live-text.ts`), and `useRedlineTyping` keeps `{ tabId, typing }` of the departing tab
  until its `[tabId]` effect resets it (`redline-edits.ts:269-303`). So the first commit composes the
  ARRIVING tab's baseline against the DEPARTING tab's text, and the picture converges one or two commits
  later. §3 D11 says what that does to a restore.

### 1.5 The resource sites a per-tab memory must join

`dropViewState` is called at exactly three places a tab leaves `tabs`: the preview slot reused
(`store.ts:1121`), LRU eviction (`:1158`), `forceCloseTab` (`:1243`, which `closeMany`,
`closeProjectTabs` and every close verb reach). A rename moves Monaco's resources in
`src/renderer/tree/editor-follow.ts:45` through `rekeyTabResources` (`monaco-loader.ts:86-99`).

## 2. The measurement that sets the floor

**Method.** The SHIPPING `createTabIo` (unchanged `tab-io.ts`), driven under vitest with no Electron, its
bridge doing what main's three handlers do: `fs:readDir` is `readdir(withFileTypes)`, `fs:readFile` is
`readTextCapped`'s open/stat/read, and `git:showHead` is main's own `GitService.showHead`
(`src/main/git/service.ts:697`), which spawns `git show HEAD:<path>`. A scratch git repo per size with N
committed ~20 KB markdown files, one tab each. Hermetic git (`GIT_CONFIG_GLOBAL=/dev/null`,
`GIT_CONFIG_NOSYSTEM=1`). 3 warm walks, then 20 timed; 10 walks with the FIRST and LAST tab's file
rewritten first, timing when each tab's `savedContents` patch lands; then 50 calls 20 ms apart through
the shipping serializer with no floor. Apple M4 Pro, 12 cores, load average 4.2–4.5 during the runs. Two
runs, both shown. The harness: `<scratchpad>/p334/spec/measure/walk-cost.measure.ts` (scratch, not
committed; the description above is enough to rebuild it). The three Electron IPC invokes per tab are
NOT in these numbers.

| Tabs | One walk, median (p90, max) ms | First tab's bytes land | Last tab's bytes land | 50 calls in 1 s, no floor |
| --- | --- | --- | --- | --- |
| 1 | 10.52 (11.39, 12.08) / 11.78 (13.24, 13.92) | 0.16 / 0.12 ms | same tab | 50 walks, 50 git spawns |
| 10 | 103.02 (115.23, 118.28) / 114.48 (119.46, 121.26) | 0.17 / 0.21 ms | 89.55 / 107.42 ms | 11 / 10 walks, 110 / 100 spawns, back to back |
| 30 | 341.72 (367.63, 394.31) / 354.70 (384.46, 404.03) | 0.21 / 0.18 ms | 313.49 / 337.39 ms | 4 / 4 walks, 120 spawns, 1,438 / 1,390 ms wall |

- One `git show` spawn alone: median 10.51 / 11.63 ms. **The walk is ~11 ms per tab and it is the git
  spawn**: the same walk over an instant bridge costs 0.02 ms at 10 tabs and 0.05–0.06 ms at 30.
- **Without a floor, a burst keeps git spawning back to back for the whole burst** (at 10 tabs the
  serializer ran 10–11 walks in ~1.1 s) and leaves up to two walks after it.
- **A tab's bytes land after every earlier tab's three calls.** At the 10-tab cap the 10th tab waits
  ~90–107 ms; at 30 tabs the 30th waits ~313–337 ms. A keystroke inside that window makes the tab dirty
  and rule 22 skips it, safely (§11 L2).
- **(The fix round.)** Ten CLEAN tabs per project is the reachable ceiling: `MAX_TABS` is 10 and the
  eleventh open evicts a clean tab (`store.ts`'s eviction seam). The 30-tab rows are reachable only with
  dirty tabs, or tabs auto save keeps, held past the cap; they stand as the worst case, not the usual one.

**What it decides.** `REREAD_FLOOR_MS = 1_000`, the entry's number, KEPT:

- It is ≥ 2.5× the slowest walk measured (404 ms at 30 tabs), so two door walks of one repo never queue
  behind each other.
- A burst costs one walk per repo per second: ~11 % of the time spent spawning git at the 10-tab cap and
  ~35 % at 30 tabs, where the unfloored burst runs git continuously.
- The arrival pair — `activate`, then the host's own programmatic focus in the passive effect of the same
  commit (`MonacoHost.tsx:331-333`, `RedlineDocument.tsx:407-409`) — is milliseconds apart, so it is ONE
  walk, not two (without the floor the serializer would run one and queue a second).
- What it costs is named in §11 L1: a look less than a second after the previous door's walk in the same
  repo is not a walk. 250 and 500 ms were weighed: both keep the pair at one walk, and both let a held
  ⌘⇧] over a 30-tab repo run git at 68–100 % of the time. The away-and-back faster than a second that 1 s
  drops is not a typing risk, because the save door still refuses honestly; it is a freshness cost.

## 3. The decisions

- **D1. One new store action, `rereadOnReturn(id)`, owns the doors.** It is NOT `rereadRepo` with a floor:
  `rereadRepo`'s one caller is Phase 282.2's clean transition (`RedlineDocument.tsx:929-933`), whose read
  is owed by that transition and must never be dropped, and `conformance:redline` rule 40 pins that
  `rereadRepo` reaches `refreshRepo`. `rereadOnReturn` calls `get().rereadRepo(tab.repoPath)` when
  admitted, so every door still takes the one road.
- **D2. Which tabs.** A door fires only for a tab the walk reads, by the SAME predicate:
  `worktreeTabsIn`'s filter is extracted to one module-level function `walkedByRefresh(t)` in
  `store.ts`, used by both. Plus one exclusion for the door only: a raster image tab (`t.image && !t.svg`),
  because the walk re-fetches an image by bumping its URL (`tab-io.ts:1846-1853`), an image has no
  buffer to protect, and a look at an image tab would otherwise refetch the picture on screen on every
  click. History, review, compare, map and diagnostics tabs: no door, no floor consumed. An empty
  `repoPath`: no door.
- **D3. Which arrivals are doors.** A tab comes on screen by the person's choice:
  (a) `activate` (strip click, Enter, right-click, ⌘⇧] ⌘⇧[, re-opening an open file), after the focus
  patch; (b) the ⌃Tab LANDING: `cycleMru` sets a run flag, `commitMru` doors only when that flag is set
  and always clears it, because `commitMru` runs on every Control keyup in the window and a door there
  would walk the repo on every ⌃C typed in a terminal; (c) `switchProject`, after its `set`, for the
  project's active tab when the panel is open, because coming back to a project is how Tortie comes back
  to a tab and a rendered `.md` (the default for markdown) has no focus door at all. NOT doors: a ⌃Tab
  step (the first step would take the floor and drop the landing), a fresh open (its own read is in
  flight), a close's successor (the person chose to close, not to look; when they look, (a) or a focus
  door answers: clicking the already-active tab calls `activate`), a rename follow.
- **D4. Which focus events are doors.** Focus ENTERING the editing surface from outside it, and nothing
  finer. Monaco: **`onDidFocusEditorWidget`**, not `onDidFocusEditorText` (the entry's word): the widget
  event is the exact partner of the shipped Phase 268 blur listener (`onDidBlurEditorWidget`) and fires
  only on entering, where the text event also fires on moving back from Monaco's own find widget, which
  is not a return. Redline: `onFocus` when `relatedTarget` is null or outside the scroller
  (`focusEntersFrom`), so moving between changes, the chip's buttons and the document is not a return.
  The views' own programmatic focus on arrival counts (it enters from outside) and collapses with the
  activation's door under the floor. **No window `focus` listener**: not measured necessary; when Tortie
  regains the window, the element that held focus receives its own focus event, which is the door above
  when that element is the editor.
- **D5. The floor.** `REREAD_FLOOR_MS = 1_000` (§2), per `repoPath`, leading edge only: admitted when no
  door was admitted for that repo in the last 1,000 ms, and the admission is recorded before the walk is
  asked for. A dropped call is dropped, not queued (a trailing walk would make every arrival two walks,
  because the host's own focus always follows the activation). Clock: `performance.now()`, read at the
  call, injected into the floor so tests own it; a reading earlier than the last admission admits, so a
  clock that went backwards never shuts the door. The predicate is asked BEFORE the floor, so a tab the
  walk does not read never consumes it.
- **D6. The floor's home and who shares it.** A pure module, `src/renderer/editor/reread-on-return.ts`,
  instantiated once inside the store factory beside `autoSave`. Shared by every door (D3, D4). **The bus
  does not share it** (it is already debounced at 150 ms and is the event that says the disk changed;
  dropping one would miss the write it was raised for), and **`rereadRepo` does not share it** (D1).
- **D7. What a door never does.** It never reloads a dirty tab, never re-reads a tab outside the walk's
  set, never shows a sentence of its own, never touches `refreshRepo`, the serializer or a save door. A
  walk that finds nothing new changes nothing visible; one that finds new bytes draws them exactly as the
  bus does, which includes the existing "This file was deleted on disk." state (`EditorPanel.tsx:978`)
  for a file gone from under a tab.
- **D8. Scroll memory's home.** NEW `src/renderer/editor/redline-scroll.ts`, a module-level
  `Map<tabId, number>`, in memory only (no `localStorage`, no `gmux.*` key, so no contract line moves).
  It matches rule 9's name pattern, so it may name no write and no bridge, and `REDLINE_FILES_FLOOR`
  rises 23 → 24.
- **D9. Save point.** The scroller's `onScroll`, keyed by the `tab.id` OF THAT RENDER, and refused while
  `doc === null` (the skeleton's clamp to 0 would otherwise overwrite the arriving tab's memory). Never in
  an effect cleanup: by the time a `[tab.id]` cleanup runs the shared scroller already holds the next
  tab's content and has been clamped to it.
- **D10. Restore point.** One `useLayoutEffect` with deps EXACTLY `[tab.id, ready]`, `ready = doc !== null`,
  declared directly after `composed`/`doc` and before the `[current, composed]` layout effect, setting
  `scrollTop = redlineScrollOf(tab.id) ?? 0`. The `?? 0` is half the fix: the shared scroller holds the
  departing tab's offset. Keyed on readiness and NOT on `composed`, so an agent's write while the person
  reads never moves them back.
- **D11. The stale first render (§1.4).** The restore runs on the first commit, which may hold a picture
  of the arriving baseline against the departing text. The pixel offset survives the convergence unless
  that interim picture is shorter than the remembered offset, which needs the arriving tab's own inserted
  text to be taller than the whole departing document. Accepted and stated (§11 L5): fixing it means
  editing `redline-edits.ts` or `live-text.ts`, both under rules this phase does not reopen, and the
  parent is worse in every case (it opens the arriving tab at the departing tab's offset).
- **D12. Drop and rekey.** `forgetRedlineScroll(id)` beside `dropViewState` at all three sites
  (`store.ts:1121`, `:1158`, `:1243`); `rekeyRedlineScroll(from, to)` beside `rekeyTabResources` in
  `src/renderer/tree/editor-follow.ts:45`. A mode change keeps it (Redline → Source → Redline returns to
  the place).
- **D13. No drive is added for the probe.** The parent `d89d1ad1` must be driven with the same script,
  so the probe uses only what the parent ships: `window.__gmuxShotDrive`, `window.__gmuxP268` (read,
  setPolicy, sourceMode, type, focusEditor, blur, explicitSave), the DOM and CDP input. Nothing in
  `probe-registry.ts` changes, so `assert-probe-containment` does not move.

## 4. The build, file by file

### 4.1 NEW `src/renderer/editor/reread-on-return.ts` — builder `store-and-monaco`

Pure: imports nothing from the store, React, Monaco or the bridge. Header comment states D5 and the §2
numbers in two lines and points here.

```ts
/** One look per repository per this many ms. Measured: build/p334/SPEC.md §2. */
export const REREAD_FLOOR_MS = 1_000;

export interface RereadFloor {
  /** True, and the time recorded, when no look at `repoPath` was admitted in the last floor. */
  admit(repoPath: string): boolean;
}

export function createRereadFloor(floorMs: number, now: () => number): RereadFloor;

/**
 * True when focus is ENTERING `container` from outside it: there was no previous holder, or the
 * previous holder is not inside it. Moving between a container's own children is not entering.
 */
export function focusEntersFrom(
  container: { contains(other: Node | null): boolean },
  previous: EventTarget | null
): boolean; // previous === null || !container.contains(previous as Node)
```

`admit`: `t = now()`; with `last = admitted.get(repoPath)`, refuse only when `last !== undefined &&
t >= last && t - last < floorMs`; otherwise record `t` and return true.

### 4.2 `src/renderer/editor/store.ts` — builder `store-and-monaco`

Do not reformat or touch `markDirty`, `patchTab`, `closeMany`, `refreshRepo`'s wiring in `init`, or
`rereadRepo`'s body: `ablation:p268` and `conformance:save` anchor on their exact text.

1. Imports: `createRereadFloor, REREAD_FLOOR_MS` from `./reread-on-return`; `forgetRedlineScroll` from
   `./redline-scroll`.
2. `walkedByRefresh(t: EditorTab): boolean`, module level, unexported, holding `worktreeTabsIn`'s five
   clauses and their comments; `worktreeTabsIn: (repoPath) => get().tabs.filter((t) => t.repoPath ===
   repoPath && walkedByRefresh(t))`. A pure move: the walked set is byte-for-byte the same.
3. Inside the factory, beside `autoSave`: `const returnFloor = createRereadFloor(REREAD_FLOOR_MS, () =>
   performance.now());` and `let mruRun = false;`.
4. Interface (`EditorState`, beside `rereadRepo` at `:339-351`):
   `rereadOnReturn(id: string): void;` with a doc comment of at most six lines: a person came back to
   this tab (it came on screen by their choice, or its editor took focus); read its repository again
   through `rereadRepo`, at most once per `REREAD_FLOOR_MS` per repository, never for a tab the walk
   does not read or an image.
5. The action:
   ```ts
   rereadOnReturn(id) {
     const tab = tabById(id);
     if (tab === undefined || tab.repoPath === '' || !walkedByRefresh(tab)) return;
     if (tab.image && !tab.svg) return;
     if (!returnFloor.admit(tab.repoPath)) return;
     get().rereadRepo(tab.repoPath);
   },
   ```
6. `activate`: after the existing `set((s) => focusPatch(s, projectId, id, true));`, add
   `get().rereadOnReturn(id);`.
7. `cycleMru`: inside `if (next !== undefined) { … }`, set `mruRun = true;`.
8. `commitMru`:
   ```ts
   commitMru() {
     const id = get().activeId;
     const landed = mruRun;
     mruRun = false;
     if (id !== null && tabById(id) !== undefined) {
       patchTab(id, { lastUsed: Date.now() });
       if (landed) get().rereadOnReturn(id);
     }
   },
   ```
9. `switchProject`: after its final `set({...})`, `if (activeId !== null && panelOpen)
   get().rereadOnReturn(activeId);`.
10. `forgetRedlineScroll(slot.id)`, `forgetRedlineScroll(evict.id)` and `forgetRedlineScroll(id)` each on
    the line after the `dropViewState(...)` at `:1121`, `:1158`, `:1243`, with one comment line at the
    first ("PHASE 334. The Redline view's remembered place goes with the tab, at every site").

### 4.3 `src/renderer/editor/MonacoHost.tsx` — builder `store-and-monaco`

- `const focusListener = useRef<monacoNs.IDisposable | null>(null);` beside `blurListener` (`:192`).
- In the wiring effect, `focusListener.current?.dispose(); focusListener.current = null;` beside the
  blur listener's (`:277-278`); and after the blur listener is created (`:318-322`) and BEFORE
  `ce?.focus()` (`:332`):
  ```ts
  // PHASE 334. Coming back into the editor is a look: read the file again, so an
  // agent's write in a folder the repository ignores is on screen before you type.
  focusListener.current =
    ce?.onDidFocusEditorWidget(() => {
      useEditor.getState().rereadOnReturn(tab.id);
    }) ?? null;
  ```
- `focusListener.current?.dispose();` in the unmount teardown beside `:456`.

### 4.4 `src/renderer/tree/editor-follow.ts` — builder `store-and-monaco`

`import { rekeyRedlineScroll } from '../editor/redline-scroll';` and at `:45`:
`for (const { from, to } of rekeys) { rekeyTabResources(from, to); rekeyRedlineScroll(from, to); }`.

### 4.5 NEW `src/renderer/editor/redline-scroll.ts` — builder `store-and-monaco`

Pure, module-level map, no import from the store, React, the bridge, or any write (rule 9).

```ts
export function rememberRedlineScroll(tabId: string, top: number): void; // ignores a non-finite top; stores Math.max(0, top)
export function redlineScrollOf(tabId: string): number | undefined;
export function forgetRedlineScroll(tabId: string): void;
/** Carry a tab's place to its new id; an absent source clears the destination. */
export function rekeyRedlineScroll(fromId: string, toId: string): void; // from === to: no-op
```

### 4.6 `src/renderer/editor/RedlineDocument.tsx` — builder `redline-view`

Touch only the three places below. Do not move, rename or re-dep any existing effect; `conformance:redline`
rules 18c and 40 find effects by their bodies and dependency arrays.

1. Imports: `focusEntersFrom` from `./reread-on-return`; `rememberRedlineScroll, redlineScrollOf` from
   `./redline-scroll`.
2. The restore (D10), immediately after `const doc = …` (`:747`):
   ```ts
   // PHASE 334. THE PLACE THIS TAB WAS LEFT AT, put back once the document is
   // drawn. Keyed on the tab and on readiness and never on the picture, so an
   // agent's write while you read never moves you. `?? 0` because the scroller
   // is shared with the tab you came from and still holds its offset.
   const ready = doc !== null;
   useLayoutEffect(() => {
     const el = hostRef.current;
     if (el === null || !ready) return;
     el.scrollTop = redlineScrollOf(tab.id) ?? 0;
   }, [tab.id, ready]);
   ```
3. On the scroller (`:1106`), beside `onCopy`:
   ```tsx
   // PHASE 334. Saved per scroll, keyed by THIS render's tab, and not while the
   // skeleton shows: it clamps the shared scroller to 0, and a cleanup would
   // read the next tab's clamp.
   onScroll={(event) => {
     if (doc !== null) rememberRedlineScroll(tab.id, event.currentTarget.scrollTop);
   }}
   ```
4. In the existing `onFocus` (`:1140-1146`), AFTER the `makeCurrent(…)` call:
   ```tsx
   if (focusEntersFrom(event.currentTarget, event.relatedTarget)) {
     useEditor.getState().rereadOnReturn(tab.id);
   }
   ```

### 4.7 NEW `build/p334/probe-p334.mjs` — builder `probe` (§6)

### 4.8 Shared files — the integrator

- `package.json`: `"probe:p334": "npm run build && node build/harness-socket.mjs --fresh gmux-p334 'node build/p334/probe-p334.mjs'"`.
- `build/verification-checks.mjs`: `electron('probe:p334')` with a comment in the `probe:p268` entry's
  shape (one Electron at a time, the parent first, scratch profile/HOME/socket, the `/bin/sh` writer, no
  agent, no token).
- `build/assert-electron-teardown.mjs:363`: `HELPER_USER_FLOOR` 158 → 159 (obligation 1). Another phase
  landing beside this one may take 159 first; the committer reconciles to the sum.
- `build/conformance-redline.mjs:716`: `REDLINE_FILES_FLOOR` 23 → 24, and `src/renderer/editor/redline-scroll.ts`
  added to `REDLINE_FILES_NAMED` with one reason line ("Phase 334: the per-tab scroll place, in memory.
  It writes nothing.") (obligation 4).
- `CLAUDE.md`: one `probe:p334` row in "Probes and app runs" (trigger: `reread-on-return.ts`, the door
  calls in `store.ts`, the focus listener in `MonacoHost.tsx`, `redline-scroll.ts`, the scroll wiring and
  focus door in `RedlineDocument.tsx`). The `conformance:redline` row's "floor 22" has been stale since the
  floor became 23; it now reads 24.
- `CHANGELOG.md`: §9's two items under `## Unreleased` → `### Fixed`, no link (the follow-up docs commit
  adds both).
- `docs/BACKLOG.md` (running log, the entry's reconciliation) is the committer's, not the integrator's.

## 5. The unit tests, and the clause each one owns

The vitest environment is `node` with no DOM, so behaviour is driven through the real store with a stub
bridge (the `p261-strip-high-water.test.ts` / `p225-shadow-baseline.test.ts` pattern) and wiring is read
from source (the `conformance:redline` rule 40 pattern: comments blanked, parentheses matched, each
clause proved on in-memory ablations that must go red). The store's clock is driven with
`vi.spyOn(performance, 'now')`. Every test that starts a walk awaits it before the next test.

**`src/renderer/editor/__tests__/p334-reread-floor.test.ts`** (store-and-monaco)
- F1 the first look at a repo is admitted; a second inside 1,000 ms is refused; one at exactly 1,000 ms is admitted.
- F2 two repos are independent.
- F3 a clock that reads earlier than the last admission admits.
- F4 `focusEntersFrom`: null → true; a node the container contains → false; one it does not → true.

**`src/renderer/editor/__tests__/p334-reread-on-return.test.ts`** (store-and-monaco)
- R1 `activate` on a worktree tab runs exactly one walk (counted as `readFile` calls ÷ tabs in the repo);
  on a history tab, a review tab, a compare tab, a map tab and a diagnostics tab, none; on a raster image
  tab, none; on an SVG tab, one.
- R2 two activations inside the floor, one walk; past it, two.
- R3 a tab the door refuses does not consume the floor (a history-tab activation, then a worktree-tab
  activation 10 ms later, walks).
- R4 `cycleTab` walks; `cycleMru` steps walk nothing; `commitMru` after a run walks once; `commitMru` with
  no run (a bare Control release) walks nothing and leaves `lastUsed` stamping exactly as today.
- R5 `switchProject` into a project whose panel is open on a worktree tab walks; with its panel closed,
  none; into a project with no tabs, none.
- R6 THE SAFETY CLAUSE, through the door: a DIRTY tab whose file changed on disk is activated and focused
  (`rereadOnReturn`) and keeps its buffer and `savedContents`; the same tab clean takes the new bytes.
- R7 the same tick: `activate` and `markDirty(id, true)` in one synchronous turn, file changed on disk;
  after the walk settles the buffer is the typed one and `savedContents` did not move.
- R8 the bus is not floored: a door walk, then two `onRepoChanged` deliveries inside 1,000 ms, still walk
  (through the real bus with fake timers past its 150 ms debounce).
- R9 `rereadRepo` is not floored: a door walk then `rereadRepo` 10 ms later still walks (serializer
  permitting).
- R10 the burst: 50 `activate` calls alternating two tabs of one repo over 1 s of driven clock → exactly
  1 door walk; over 2.5 s → 3.
- R11 MonacoHost wiring, read from source: an `onDidFocusEditorWidget` handler calls
  `rereadOnReturn(tab.id)`; it is assigned BEFORE the `ce?.focus()` call in the wiring effect; its
  disposable is disposed in the same two places `blurListener`'s is. Ablations: the handler removed,
  `onDidFocusEditorText` substituted, the assignment moved after `ce?.focus()`, one dispose removed —
  each red.
- R12 every door in the store goes through one action: `activate`, `commitMru` and `switchProject` name
  `rereadOnReturn(` and none names `rereadRepo(` or `refreshRepo(` directly (source read, ablations red).

**`src/renderer/editor/__tests__/p334-redline-scroll-memory.test.ts`** (store-and-monaco)
- S1 the module: remember/of; a negative top stores 0; NaN and Infinity store nothing; forget; rekey moves,
  displaces an existing destination, an absent source clears the destination, from === to is a no-op.
- S2 the three drop sites through the real store: `forceCloseTab`, the preview slot reused by a new
  preview open, and the LRU eviction of the eleventh open each leave `redlineScrollOf(id)` undefined; a
  `setMode` round trip keeps it.
- S3 the rename: `followMoves` (the real `editor-follow.ts`) carries a remembered place to the new id and
  leaves nothing at the old one.

**`src/renderer/editor/__tests__/p334-redline-view-wiring.test.ts`** (redline-view), source of
`RedlineDocument.tsx`, each clause with ablations that must go red:
- W1 the element whose `className` is `ed-redline-scroll` carries `onScroll`, whose body calls
  `rememberRedlineScroll(tab.id,` with `currentTarget.scrollTop`, under `doc !== null`. Ablations: the
  guard removed; the key changed to anything but `tab.id`.
- W2 no function returned from a `useEffect`/`useLayoutEffect` names `rememberRedlineScroll`. Ablation:
  the save moved into a `[tab.id]` cleanup.
- W3 exactly one `useLayoutEffect` names `redlineScrollOf(tab.id)`; it assigns `scrollTop`, falls back with
  `?? 0`, and its dependency array is exactly `[tab.id, ready]` where `ready` is `doc !== null`.
  Ablations: `composed` added to the deps; the `?? 0` removed; `useEffect` substituted.
- W4 the `onFocus` handler calls `rereadOnReturn(tab.id)` only inside `focusEntersFrom(event.currentTarget,
  event.relatedTarget)`. Ablations: the guard removed; `event.target` substituted for `currentTarget`.
- W5 the Phase 282.2 effect (deps exactly `[tab.dirty]`) still calls `rereadRepo(` and not
  `rereadOnReturn(` (the floor must never reach the owed read). Ablation: swapped → red.

**Existing tests.** `activate` now starts a walk, so a store test that calls `activate` and keeps going
may find a walk in flight (`p225-shadow-baseline.test.ts:344-362` asserts synchronously and stays green;
`p260-tabs-follow-the-project.test.ts:433,475`, `p2822-second-undo.test.ts:867-869` and the
`p282-typing-rig.ts:386` rig call it too). Builder `store-and-monaco` runs the whole `npm test` and lists
every existing test whose reading moved, with the reason. Only the integrator edits an existing test file,
and only where the old assertion depended on activation reading nothing (named in the commit body); a
safety assertion is never weakened.

## 6. `probe:p334` — the one app run, at the parent and at HEAD

**Shape.** `build/p334/probe-p334.mjs`, `probe:p331`'s two-build shape and `probe:p268`'s arm shape. Two
Electrons ONE AFTER THE OTHER, never at once: the parent first (`P334_PARENT_CHECKOUT`, a BUILT checkout of
`d89d1ad1`; absent, the same checkout, or no `out/main/index.js` → exit 2 with the sentence, because the
parent measurement is mandatory), then HEAD. Each through `withElectron` (`cwd` the build's checkout,
`--remote-debugging-port=0`, `--use-mock-keychain`, `env: withoutDevRenderer({ HOME: <scratch home>,
GMUX_TMUX_SOCKET: <the harness socket>, GMUX_PROBES: '1' })`) on its own scratch profile under
`GMUX_HARNESS_DIR`. Before each launch `writeHiddenAgents(profile, 'p334')` and `hiddenAgentsPrecheck`
for that checkout; after it, `AGENTS_LIST_EXPR` read back and `hiddenAgentsScanVerdict` must be ok, or
exit 2 before any arm. `Emulation.setFocusEmulationEnabled` on (p268's arm H measured that Monaco's focus
events need it in a probe window). It names no `-L gmux` (the helper's census is the only read of his
server), takes no screenshot, starts no agent and spends no token. Every process it starts is a
synchronous `git` or `/bin/sh` that has exited before the call returns. `--self-test` proves the grader on
fixtures (a clean row, each arm's disagreement named, an unreadable arm is exit 2 and never a pass) and
launches nothing.

**The project, built fresh for each build before its launch.** `proj/`: `git init`; `.gitignore` holding
`notes/`; `notes/a.md`, `b.md`, `c.md`, `d.md` (short prose) CREATED BEFORE THE APP STARTS, because the
watcher reads ignored roots once; `docs/tracked.md`; `docs/long-a.md` (~3,000 lines of prose) and
`docs/long-b.md` (~1,500); `src/x.ts`. Commit all but `notes/`, then change one paragraph near the top of
each long file so it differs from HEAD and Redline is offered. Precondition, graded: `git check-ignore
notes/a.md` exits 0. `proj2/` with one file, for A5.

**The writer.** `spawnSync('/bin/sh', ['-c', 'printf "%s" "$1" > "$2"', 'sh', bytes, path])` (in place),
`rm -f` for A8; each write carries a fresh marker line. Reads of disk are `readFileSync`.

**Gestures**, chosen to be what a person does: strip click = a click on the `.ed-tab` whose
`.ed-tab-name` is the file; mode = the chip button by label (the `modeButton` pattern in
`redline-shot-probe.ts`); focus into Monaco = `__gmuxP268.blur()` then `__gmuxP268.focusEditor()`;
focus into Redline from outside = focus the strip tab element, then `.ed-redline-scroll`.focus(); ⌃Tab =
CDP `Input.dispatchKeyEvent` Control down, Tab down/up with the ctrl modifier, Control up; project switch
= a click on the `.ptab` whose `.ptab-name` is the project. Reading the buffer = `__gmuxP268.read()`'s
`value`/`savedContents`/`dirty`/`stopped` and `toasts`; reading Redline's picture = the
`.ed-redline-doc` text; reading a place = `.ed-redline-scroll`.`scrollTop` after two animation frames and
150 ms. **Every door is at least 1,200 ms after the previous door in the same repo**, so the floor is never
what an arm measures except A11.

| Arm | What | HEAD | Parent |
| --- | --- | --- | --- |
| A0 | Control, the blind bus: `notes/a.md` in Source and focused, written, 2,500 ms, no gesture | unchanged | unchanged |
| A0b | Control, the live bus: `docs/tracked.md` in Source, written | updated within 2,500 ms | updated |
| A1 | Activation, ×5: click `x.ts`, 1,200 ms, write `notes/a.md`, 200 ms, click `a.md`, 1,000 ms, read | 5 of 5 seen | 0 of 5 |
| A2 | Monaco focus, ×5: `a.md` active, blur, 1,200 ms, write, 200 ms, focus, 1,000 ms, read | 5 of 5 | 0 of 5 |
| A3 | Redline focus, ×5: `notes/b.md` in Redline, focus the strip, 1,200 ms, write, focus the scroller | 5 of 5 (`savedContents` and the drawn text hold the marker) | 0 of 5 |
| A4 | ⌃Tab landing, ×3, focus in the editor on `x.ts`, `a.md` the MRU target | 3 of 3 | 0 of 3 |
| A5 | Project switch, ×3: `a.md` active in `proj`, click `proj2`, 1,200 ms, write, click `proj`, 1,000 ms | 3 of 3 | 0 of 3 |
| A6 | Auto save (`setPolicy('afterDelay', 500)`): type `P` into `a.md`, it lands; write; click away, 1,200 ms, back; type `Q` | disk = the writer's bytes then `Q`; no stop; no toast naming a change on disk | stop `stale`; one toast naming `'a.md' changed on disk`; disk = the writer's bytes |
| A7 | Dirty is never reloaded: `notes/c.md`, auto save off, type `D`; write; away, back, focus | buffer = old + `D`, dirty, disk = writer's; ⌘S (`explicitSave`) opens the three-answer dialog, Cancel | identical |
| A8 | Deleted under a clean tab: `notes/d.md` clean; `rm`; away and back | "This file was deleted on disk." shown, buffer text intact | not shown, buffer intact |
| A9 | Same tick: write, 1,200 ms, `__gmuxP268.type(a.md, 'T', 0)` (activate and edit in one turn), 1,500 ms | buffer = old + `T`, dirty, disk = writer's | identical |
| A10 | Burst: write, then 50 strip clicks alternating `a.md`/`x.ts` over ~1 s ending on `a.md`, 1,500 ms | `a.md` shows the writer's bytes; the app answers; walk count if `window.gmux.fs.readFile` accepts a counting wrapper, else UNREADABLE (the unit count R10 is the authority) | old bytes |
| A11 | Inside the floor (the stated limit): click `x.ts`, write at once, click `a.md` at +300 ms, 1,000 ms; then blur, focus at ≥1,200 ms after the last admitted door | stale after the click (equal to parent), FRESH after the focus | stale, stale |
| B1 | `long-a` in Redline, `scrollTop := 4000`; click `x.ts`; click `long-a` | 4,000 ±1 | 0 |
| B2 | `long-b` in Redline at 1,200; click `long-a`, read; click `long-b`, read | 4,000 then 1,200 | `long-a` at 1,200, `long-b` at 4,000 (or its clamp) |
| B3 | Mode round trip on `long-a` at 4,000: chip Source, chip Redline | 4,000 ±1 | 0 |
| B4 | Close `long-b`, open it again, Redline | 0 | recorded |
| B5 | `long-a` at 4,000 on screen; append to the END of `long-a.md` (tracked, the bus recomposes) | 4,000 ±1 (a recompose never restores) | 4,000 ±1 |

**Exit.** 0 when every row grades at both builds; 1 with every disagreeing row named; 2 when a
precondition or an arm cannot be read (never a pass). The report (every reading, both builds) is written to
`P334_REPORT` or beside the harness directory, never under `out/`. `P334_ARMS` picks arms;
`P334_KEEP=1` keeps the scratch project for re-derivation. Not yet measured; expect about 8 minutes.

## 7. Gates, obligations, menus

- **Battery** (integrator): `npm run typecheck && npm run build && npm test && npm run smoke:t1 && npm run
  smoke && npm run smoke:t3 && npm run package`.
- **Path-triggered** (integrator): `conformance:save` (the eviction seam in `store.ts` moves),
  `conformance:redline` (rule 9's derived set, rule 40's `store.ts` and `RedlineDocument.tsx` readers),
  `ablation:p268` (its `store.ts` anchors must still match), `gate:checks` (new test files; the new
  probe's classification; inside `build`), `gate:electron` (inside `build`).
- **Builders** run `npm run typecheck` and their own test files; `store-and-monaco` runs all of `npm test`
  (§5's last paragraph). Builders and the integrator launch no Electron.
- **Obligations:** `HELPER_USER_FLOOR` 158 → 159; `REDLINE_FILES_FLOOR` 23 → 24 with the named-list line.
  **No contract change** (no IPC, no settings field, no storage key, no env name, no smoke mode); if
  `contract-inventory --check` moves, a builder left the phase. **Menus do not change.**

## 8. Verification, per item at its own tier

**Item A, Tier 3.** The gates; `probe:p334` A0–A11 at both builds (real files, a real ignored folder, a
real outside writer: the per-row matrix); and two independent methods, one an attack:
1. **The attack** (the verifier's own harness, not the builders' tests): a rewind's `adoptWritten`
   landing while a door's read is held open over real files (`p282-watcher-race.test.ts`'s gate pattern)
   must leave the adopted bytes; typing in the same tick as an activation and as a focus; a dirty tab under
   every door; a file deleted and recreated under a clean tab; a burst of 50 switches counted against the
   floor in a counting harness the verifier writes itself; ⌃C in a terminal (a bare Control keyup) costing
   no walk; and the sub-floor away-and-back (A11), which must be honest: stale, then the save door's
   three-answer refusal, never a silent overwrite.
2. **The parent** `d89d1ad1`: the A arms read 0 of N there and N of N at HEAD; A0, A7 and A9 read
   identically at both (no scenario worse).
3. Optional and cheap: re-derive §2's per-tab cost with the verifier's own walk timer, and run `probe:p268`
   at HEAD (its drive calls `activate` before every save), which must read as it did.

**Item B, Tier 2.** The gates; the same app run's B1–B5; and the parent measurement of B1–B4. The attack
worth its cost: the stale first render (D11, §11 L5), with the arriving tab carrying unsaved Redline
typing taller than the departing document.

**Lock.** Verifiers only: phone phases first (do not take the lock while
`<scratchpad>/electron.phone-wait` holds a file), then `mkdir <scratchpad>/electron.lock` with `p334` in
`owner`, released with `rm -rf` on the same command line as the work. Count Electrons once, at the end.

## 9. CHANGELOG items (`## Unreleased`, `### Fixed`, the follow-up commit adds the links)

- A file an agent changed now shows its new contents when you switch back to its tab, return to its project or click into the editor, even in a folder your repository ignores, where it used to keep the old text until a save refused because the file had changed on disk; a file in an ignored folder still does not update while you watch it without looking away and back
- A Redline tab now opens where you left it, instead of at the top or at the place you had reached in another Redline tab; a tab you close and open again starts at the top

## 10. What is NOT in this phase

- **No directory watch for open files under ignored roots** (research 83 §C.8 point 2). Its own later phase.
- **No change to `refreshRepo`, its order, the serializer, `adoptWritten`, the save doors or their
  sentences.** Reading the arriving tab first (§11 L2) is a change to the walk and is refused here.
- **No floor on the bus or on `rereadRepo`.**
- **No window-focus listener, no polling, no timer.**
- **No door for a close's successor, a rename follow, a ⌃Tab step or a fresh open; none for an image.**
- **None of issue 32's items 1, 2, 4 and 5.**
- **No scroll memory across a relaunch or a close**, none for Preview, Diff or Source (Monaco keeps its own),
  and no text anchor (the place is a pixel offset).
- **No new probe drive, no change to `probe-registry.ts`.**
- **No release.**

## 11. Stated limits (true at HEAD, each no worse than the parent)

- **L1.** A look less than a second after the previous door's walk in the same repository is not a walk
  (A11). The save door still refuses a stale buffer honestly. Every look that IS a walk reads every open
  tab of that repository, so the cost is one `git show` per open tab per admitted look (verifier B's
  scripted session: 569 `git show` spawns at HEAD against 45 at the parent, with 10 tabs open).
- **L2.** A tab's bytes land after every earlier tab's three calls: measured ~90–107 ms for the 10th of 10
  and ~313–337 ms for the 30th of 30. Typing inside that window keeps the old buffer (rule 22), and a save
  then refuses as it does today.
- **L3.** A door's walk is the bus's walk whole: it re-reads every open tab of that repository, including a
  file opened from outside the root with the project's repository (a Context detail tab), re-fetches open
  images in that repository that are not on screen, can raise the walk's existing toast when an image's
  committed version cannot be read, and shows "This file was deleted on disk." for a file gone from under a
  tab. (The entry's "never reads a file outside a project" is not true of the walk; it reads only files
  already open in a tab.) **The fix round's two additions, both the bus's existing behaviour, now reached
  by a look in an ignored folder:** (a) a DIRTY tab whose file is deleted or moved away is marked deleted
  too, with its typing kept in the buffer: the buffer goes read-only, ⌘S writes nothing and says nothing,
  the banner's Close tab discards the typing without asking (`EditorPanel.tsx`'s banner calls
  `forceCloseTab`), and the tab is editable again, typing and all, when the file comes back. The parent
  reaches this same state on the next tracked change anywhere in the repository, because the bus's walk
  reads every open tab, ignored ones included (verifier A's V3g and V3i); (b) a rename that changes only
  case (`notes/a.md` to `notes/A.md` on a case-insensitive volume) reads as deleted, because the walk
  compares entry names exactly and CLAUDE.md forbids case-folding a comparison (V3h).
- **L4.** A file in an ignored folder does not update while it is watched without a look (A0).
- **L5.** Redline→Redline: if the arriving tab's own unsaved inserted text is taller than the whole
  departing document and the person was in that excess, the first interim picture clamps the place (D11),
  and the clamped place is what is remembered for the next visit too, because the restore's own
  `scrollTop` assignment fires a scroll event (measured in the app: 3000 read back as 189.5, then 189.5
  again on the next visit; the parent read 0 and 0).
- **L6.** The place is a pixel offset; a window resized while away puts the person near, not at, the text.
- **L7 (the fix round, verifier B).** After a door reloads a file while its tab was away, the caret goes
  back to its old line and column in the NEW text, not to its place in the text: Monaco's saved view state
  is restored over a buffer the reload replaced whole. If the agent inserted lines above, the first
  keystroke lands there, mid-word in the agent's text, and auto save writes it without asking. This is
  exactly what a tracked file does today through the bus (measured at the parent: `A tr|trk2|acked file.`);
  the phase makes it reachable for a file in an ignored folder, where today the save was refused with a
  toast instead. Not fixed here: carrying the view state through the reload's edit is a change to how the
  walk applies bytes, which §10 refuses; it is queued as its own follow-up.
- **L8 (the fix round, verifier A).** `commitMru`'s run flag is cleared only by a Control release. If a
  ⌃Tab step's release is lost (the window loses the key mid-run), the next bare Control release, a ⌃C in a
  terminal a minute later included, counts as a landing and walks the repository once, under the floor.
  It only reads and refuses a dirty tab, so it costs one walk and changes no buffer the person is typing
  in.

## 12. What the entry got wrong, and what this spec changed

1. "History and review tabs are already refused inside `refreshRepo` (`tab-io.ts:20`)": the refusal is
   `worktreeTabsIn` in `store.ts:596-608` (and covers compare, map and diagnostics too); `:20` is a comment.
2. `activate` is not the only way a tab comes on screen (§1.2): ⌃Tab and project switches bypass it. The
   ⌃Tab landing and `switchProject` are added as doors; `commitMru` needs a run flag because it runs on
   every Control keyup.
3. Monaco's door is `onDidFocusEditorWidget`, not `onDidFocusEditorText` (D4).
4. The floor cannot live in `rereadRepo` (D1); it is a separate action.
5. The rekey site is `src/renderer/tree/editor-follow.ts:45`, not `store.ts`.
6. `EditorPanel.tsx:824`, not `:828`; the serializer is `tab-io.ts:2021-2041`.
7. Raster image tabs are not doors (D2), which the entry did not consider.
8. "Never reads a file outside a project" and "never shows a sentence" are not true of the walk (L3).
9. The Redline view composes one or two interim pictures after a Redline→Redline switch (§1.4, D11).
10. The parent is `d89d1ad1`, not `28d89295`.
11. `CLAUDE.md`'s `conformance:redline` row says floor 22; the tree says 23, and this phase makes it 24.
12. The 1,000 ms floor is kept, now with a measurement (§2) rather than a guess.

## 13. Who owns what (disjoint)

| Builder | Owns | Does not touch |
| --- | --- | --- |
| `store-and-monaco` | `src/renderer/editor/reread-on-return.ts` (new), `src/renderer/editor/redline-scroll.ts` (new), `src/renderer/editor/store.ts`, `src/renderer/editor/MonacoHost.tsx`, `src/renderer/tree/editor-follow.ts`, `__tests__/p334-reread-floor.test.ts`, `__tests__/p334-reread-on-return.test.ts`, `__tests__/p334-redline-scroll-memory.test.ts` | `tab-io.ts`, `RedlineDocument.tsx`, any existing test |
| `redline-view` | `src/renderer/editor/RedlineDocument.tsx`, `__tests__/p334-redline-view-wiring.test.ts` | everything else; imports §4.1 and §4.5 by the signatures above |
| `probe` | `build/p334/probe-p334.mjs` (new) | `package.json`, every renderer file |
| integrator | `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `build/conformance-redline.mjs` (floor and named list only), `CLAUDE.md`, `CHANGELOG.md`, any existing test edit §5 allows | the builders' files except to reconcile |

## §As built (the integrator, 2026-10-01, at `d89d1ad1` plus the working tree; nothing committed)

### Files

| File | Who | What |
| --- | --- | --- |
| `src/renderer/editor/reread-on-return.ts` (new) | store-and-monaco | §4.1 as written |
| `src/renderer/editor/redline-scroll.ts` (new) | store-and-monaco | §4.5, with one change: the rekey writes the destination BEFORE it clears the source, so the `from === to` guard is load bearing (in §4.5's order it could never fail its own test) |
| `src/renderer/editor/store.ts` | store-and-monaco | §4.2 items 1–10 as written. `walkedByRefresh` is a pure move: the only removed lines in the file are `worktreeTabsIn`'s filter and its comments |
| `src/renderer/editor/MonacoHost.tsx` | store-and-monaco | §4.3 as written |
| `src/renderer/tree/editor-follow.ts` | store-and-monaco | §4.4 as written |
| `src/renderer/editor/RedlineDocument.tsx` | redline-view | §4.6 items 1–4 as written; no existing effect moved or re-depped |
| `__tests__/p334-reread-floor.test.ts`, `p334-reread-on-return.test.ts`, `p334-redline-scroll-memory.test.ts` (new) | store-and-monaco | F1–F4, R1–R12, S1–S3 |
| `__tests__/p334-redline-view-wiring.test.ts` (new) | redline-view | W1–W5, 26 in-memory ablations and 3 respellings that must stay green |
| `build/p334/probe-p334.mjs` (new) | probe | §6, never run (no Electron in a build round) |
| `__tests__/p334-arrival.ts` (new) | integrator | the arrival and the owned clock for the three Phase 282 rigs below |
| `__tests__/p282-view-presses.test.ts`, `p2822-after-undo.test.ts`, `p2822-second-undo.test.ts` | integrator | §5's allowance: the old setup depended on arriving at the view reading nothing |
| `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 158 → 159), `build/conformance-redline.mjs` (`REDLINE_FILES_FLOOR` 23 → 24, `redline-scroll.ts` named), `CLAUDE.md` (the `probe:p334` row; the redline row's floor 22 → 24), `CHANGELOG.md` (§9's two items, no link) | integrator | §4.8 |

`tab-io.ts` is byte for byte the parent's (`git diff --quiet d89d1ad1`). Read with the integrator's own TypeScript reader (every named member of `store.ts` at the parent and here): `markDirty`, `patchTab`, `closeMany`, `rereadRepo` and `init` are BYTE-IDENTICAL; the changed members are exactly `io` (only `worktreeTabsIn`), `openFromRequest` (two `forgetRedlineScroll` lines), `activate`, `forceCloseTab`, `cycleMru`, `commitMru`, `switchProject`. No contract line moved (`gate:contract` byte for byte). No menu changed.

### The existing tests §5 underestimated, and what was done

§5 expected one moved reading. **Eighteen cases across three files depend on arriving at the Redline view reading nothing**, and a normal run showed only five of them because the store's floor is store state on REAL time: a case passed or failed by whether an earlier case's door was under a second old. The integrator's measurement, the whole suite in a scratch copy with the floor forced each way:

| Floor | Failed, outside the p334 files |
| --- | --- |
| 0 (every door admitted) | 18: `p282-view-presses` 4, `p2822-after-undo` 7, `p2822-second-undo` 7 |
| 10^12 (only the first door per repo per file) | 2: one in each `p2822` file |
| 1,000 (shipping), normal run | 5 |

Every other file that reaches a door (`p225`, `p260`, `p261`, the typing rigs, …) passed at both extremes, so none of them depends on the clock.

Two causes, and neither is the product's: the rigs mount the view over an agent's write the tab had not taken (the arrival now reads it, which is this phase's promise, and the case each test presses is a write the person has NOT looked at since arriving); and `./p282-gated-fs` is one file wide, so the arrival's walk of a second tab read the first tab's bytes into it (`CONTROL: a hold belongs to the tab…`).

The fix, one helper, `__tests__/p334-arrival.ts`: (1) `ownTheStoreClock()` spies `performance.now`, moves 60 s per case and holds still inside one, so the arrival is always admitted and nothing after it depends on how long a case took; (2) `arrivalOver(main)` answers each tab's OWN bytes by path while the view arrives, then hands back to the rig's main; each mount ASSERTS the arrival (each open tab read once, git asked once per tab) and the counters start after it. `MEASURED AT THE 282.1 BYTES` stubs `rereadRepo` and so takes the arrival's read away with it (`rereadOnReturn` asks `rereadRepo`), so that one case declares zero looks. **No assertion after the mount changed**: every read label, every count, every `dirty`/`saved`/`disk`/`model`/`baseline`/drawn/toast reading is the Phase 282 text.

Proof it is not vacuous and hides nothing:
- The Redline focus door removed (in a scratch copy): 21 of 22 rig cases red at the mount assertion (the 22nd is the 282.1 case, which declares none). So these rigs now also pin the arrival door through the real mounted view and the real store, which the wiring test reads only as source.
- Every door admitted (floor 0, the committed rigs): 20 of 22 pass; the two that fail are `A TAB SWITCH AND BACK` (`reads 1 → 3`, `walks 0 → 4`) and `A LOOK AT THE FILE VIEW AND BACK` (`walks 0 → 1`), counts only. With those two counters left out, all 7 `p2822-second-undo` cases pass to the end of the chain, so no safety reading in the 22 cases depends on how many doors are admitted.
- Four shuffled orders (`--sequence.shuffle`, seeds 1, 7, 42, 99): 22 of 22 each time.

### The integrator's own re-derivations

- The floor, transpiled from the shipping module and run against a model written from D5's sentence: 2,000 runs, 120,000 calls over three repositories with 7,117 backward clock steps and steps of exactly 1,000 and 999 ms: 0 disagreements (74,126 admitted, 45,874 refused). `focusEntersFrom`: null → true, inside → false, outside → true.
- Call sites, by an AST reader of the integrator's own: `rememberRedlineScroll` once, under `jsx:onScroll` and `if (doc !== null)`, in no effect and no returned function; `redlineScrollOf` once, in `useLayoutEffect[tab.id, ready]`; `rereadOnReturn` in `RedlineDocument` once, under `jsx:onFocus` and `focusEntersFrom(event.currentTarget, event.relatedTarget)`; the 282.2 `rereadRepo` still in `useEffect[tab.dirty]`; MonacoHost names `onDidFocusEditorWidget` and not `onDidFocusEditorText`. No added line in `src/renderer` names `savedContents` as a write, `resetWorkingModel`, `deps.patch`, `markDirty(` or a write door.

### Commands (integrator)

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,386 production files, 0 boundary violations, 0 runtime cycles |
| `npm test` | 0 | 18,048 passed, 7 skipped, 0 failed (68 s) |
| the three rigs, 4 shuffled orders | 0 ×4 | 22 of 22 |
| `npm run conformance:save` | 0 | every rule |
| `npm run conformance:redline` | 0 | rule 9: 24 files, floor 24, 24 named; rule 18c 5 of 5 plants; rule 40 15 of 15 ablations red |
| `npm run ablation:p268` | 0 | 32 ablations red, tree restored by sha256 |
| `npm run gate:contract` | 0 | byte for byte |
| `npm run gate:checks` | 0 | 246 check scripts classified, `probe:p334` among the 140 electron harnesses |
| `npm run gate:electron` | 0 | 159 helper users against a floor of 159 |
| `npm run gate:background` | 0 | 4 starters, all in a `finally`; 19 of 19 fixtures |
| `node build/p334/probe-p334.mjs --self-test` | 0 | 84 breaks each turning its own row; nothing launched |
| `npm run -s build` | 0 | 37 s, every inside gate green |

Not run, by the round's rule (no Electron for a builder or the integrator): `smoke`, `smoke:t1`, `smoke:t3` and `probe:p334`. `package` was not run.

### What this file got wrong, found in the build

1. §5: eighteen existing cases, not one (above).
2. D3 against D4. D3 lists a fresh open, a close's successor, a rename follow and a ⌃Tab step as "not doors", but D4 (and R11, which pins the Monaco listener BEFORE `ce?.focus()`) makes the view's own arrival focus a door wherever focus enters from outside. So a fresh open into Source, a mode chip into Redline, a close's successor and a ⌃Tab step from outside the editor each walk the repository once, under the floor. The fresh open's walk runs after its own read has landed (the wiring effect waits for `contentReady`). Built as D4 and R11 say; the cost is one walk.
3. §4.5's rekey order made its own guard untestable; reordered (above).
4. L5 is slightly worse than written: the restore's own `scrollTop` assignment fires a scroll event, so in L5's case the CLAMPED place is also remembered for the next visit, not only shown on this one.
5. `focusEntersFrom`'s `previous === null` adds nothing in a real DOM (`contains(null)` is already false); it is pinned by a row that the container is never asked about null.
6. The probe (its builder's notes, unverified): B2's parent column cannot be read as written and is graded as arrival, long-a, long-b; A11 writes before the `x.ts` click and waits for that click's walk; A10's walk count is unreadable (the bridge is frozen) and is left out of the exit; and `__gmuxP268.focusEditor()` looks for `textarea.inputarea`, which Monaco 0.56 under Electron 43 does not draw (`editContext` is on, it draws `.native-edit-context`), so the probe focuses that itself, and **`probe:p268`'s arm H may be reading the wrong thing today**.

### Open concerns for the verifiers

1. **The probe has never run.** Untested gestures, each UNREADABLE (exit 2) if it does not take: the project tabs' names read `proj` and `proj2`; a ⌃Tab over CDP reaching `EditorPanel`'s window listener; focusing `.native-edit-context` firing `onDidFocusEditorWidget` under focus emulation; a click on `.ed-tab-close`. Expect about 8 minutes, two Electrons one after the other, and the parent must already be built.
2. **Run `probe:p268` at HEAD** (§8 item 3), and read whether its arm H's `focusEditor()` focuses anything on this tree (concern 6 above).
3. **The attack list in §8 item 1 is not covered by any unit test the builders wrote over real files**: an `adoptWritten` landing while a door's read is held open; a Phase 268 blur save followed at once by a refocus (the blur is the save, the focus is the door); typing in the same tick as an activation and as a focus; a file deleted and recreated under a clean tab; ⌃C in a terminal (a bare Control keyup) costing no walk.
4. **The caret after a click into a clean, stale Monaco tab.** The click places the caret on the old text and the door's reload lands after the walk reaches that tab (about 11 ms per earlier tab, §2). A keystroke before it is kept and the reload is skipped (rule 22). A keystroke after it types into the new text wherever Monaco's full-range replace left the caret. Not a loss of typing; read where the first keystroke lands.
5. **A return to the window with the editor focused is a door** (D4, no window listener needed). Confirm one walk per return, not one for Monaco's focus and another for anything else.
6. **D11 / L5** at Tier 2: Redline→Redline where the arriving tab's unsaved Redline typing is taller than the whole departing document, and the clamp now remembered (item 4 of the list above).
7. **Phase 282 holds in the app.** The rigs prove every reading after the arrival is the Phase 282 reading and that only counts move when every door is admitted; the app run is where a door during a landed hold, a rewind's write and a focus all meet for real.
8. **Duplicated blocks.** The scan of this phase's new code found only house copies that predate it: the `EditorTab` literal every store test builds, and `cdpForAppWindow`, which 54 files under `build/` each carry. Neither was extracted here.

## §As built, the fix round (the fixer, 2026-10-01, at `d89d1ad1` plus the working tree; nothing committed)

Two verdicts: verifier A (the attack, its own harness over real files and main's own handlers) **approved**,
with one minor and four nits; verifier B (the app run with its own drivers and a `git` counter on the app's
PATH) **needs_work**, with one major, two minors and two nits. Every major and minor is fixed below; the
nits are fixed where they cost a sentence or a test, and the one that would need product code (L8) is
stated instead. **No product file changed in this round.** `store.ts`, `MonacoHost.tsx`,
`RedlineDocument.tsx`, `editor-follow.ts`, `reread-on-return.ts` and `redline-scroll.ts` are byte for byte
what the verifiers measured, and `tab-io.ts` is still the parent's (`git diff --quiet d89d1ad1` exit 0).
Nothing was removed for regressing: neither verifier found a scenario worse than today (A's 14 rows and
B's 13 rows all read `worse: false`).

### What changed, and why

| Finding | Severity | File | The fix |
| --- | --- | --- | --- |
| B1. `probe:p334` exits 1 on a false A9 FAIL. `ensureSource(a.md)` strip-clicks a.md, which is a door at HEAD; the arm read `previous` and wrote at once, so the write landed inside that click's walk, the clean buffer took the writer's bytes before the typing, and `previous` was stale. The product outcome was safe: `T` kept on the writer's bytes, `savedContents` equal to the disk | major | `build/p334/probe-p334.mjs` | A new kit step, `quiet(path)`: wait 1,200 ms counted from NOW (the view's own arrival focus is a door the probe cannot timestamp), then require the tab clean with `value` and `savedContents` both equal to the disk. A9 and A10 call it after their setup and read `previous` only after it; both record `inStepBefore`, and `gradeA9`/`gradeA10` answer UNREADABLE when it is not `true`, so this setup fault can never again read as a safety FAIL. A10 had the same opening: its HEAD "seen" could have been the setup walk's rather than the burst's |
| B2. A4 UNREADABLE at both builds: "⌃Tab did not go back to x.ts". The landing can leave focus outside the panel, and `EditorPanel`'s guard `panelRef.current?.contains(document.activeElement)` refuses the return key; the looks already made were thrown away | minor | `build/p334/probe-p334.mjs` | Before the return ⌃Tab the arm focuses the editor (`focusMonaco`) when the landing left it unfocused, and records `focusedAfterLanding`; a return that still does not take goes back by a strip click and says so in a note and in `back`, because the return is setup and the LANDING is the reading. An `Unreadable` anywhere in the loop returns `{ iterations, unreadable }`, so the report keeps every look made and the row still grades UNREADABLE, never a pass |
| B3. Nobody stated where the caret goes after a reload made while the tab was away: its old line and column in the new text, so a first keystroke can land mid-word and auto save writes it. Today's tracked files do exactly this through the bus | minor | `SPEC.md` §11 | **L7** added. Not fixed here (it is a change to how the walk applies bytes, refused by §10); queued as its own follow-up |
| A1. L3 did not name the DIRTY case: a dirty tab whose file is deleted or moved in an ignored folder is marked deleted on the next look, read-only, ⌘S silent, and the banner's Close tab calls `forceCloseTab`, discarding the typing without asking. The parent reaches the same state on the next tracked change in the repository | minor | `SPEC.md` §11 | **L3** amended with (a) the dirty case and its parent equivalence and (b) the case-only rename (A's nit V3h). The banner's Close tab going through `closeTab`'s dirty prompt is EditorPanel's existing banner and is not this phase; it is named for the operator below |
| A2. The phase's own tests stayed green with each of tab-io's three post-read clauses removed (A's X11, X12, X13), because no arm typed, adopted or replaced the model while a door's read was in the air | nit | `__tests__/p334-reread-on-return.test.ts` | **R7b, R7c, R7d** added over a held read (`holdNextRead`: the read takes the disk's bytes when called, as an open descriptor does, and counts as in flight until released): a keystroke after the read was opened; a rewind adopted through the store's own `adoptWritten` while the read answers the pre-rewind bytes; the model disposed and rebuilt mid-read. Each was proved red on its own clause by ablating `tab-io.ts` in a `cp -Rc` clone, restored by sha256 (below) |
| A3 and B5. §1.1 said the bus never fires for an ignored folder, true, but it walks every open tab, ignored ones included, whenever anything tracked changes | nit | `SPEC.md` §1.1 | One paragraph added: the parent's "stale" holds only while nothing tracked changes, so a parent column's 0 of N is valid only if no tracked write raised the bus inside the arm |
| A4. `mruRun` survives a lost Control release, so a later bare Control keyup walks once | nit | `SPEC.md` §11 | **L8** added rather than a store change: it costs one floored walk that refuses dirty tabs, and clearing the flag in `activate` would drop the landing door if anything activates during a run |
| B4. L5 understated the clamp: the clamped place is remembered for the next visit too (B measured 3000 → 189.5, then 189.5) | nit | `SPEC.md` §11 | **L5** reworded with B's numbers |
| B5. 30 clean tabs cannot be open in one repository (`MAX_TABS` is 10, the eleventh open evicts a clean tab); and each admitted look walks every open tab (569 `git show` at HEAD against 45 at the parent in B's session) | nit | `SPEC.md` §2, §11 L1 | §2 says 10 clean tabs is the reachable ceiling and the 30-tab rows are the worst case; L1 states the per-look cost |
| B's measurement | — | `CLAUDE.md` | The `probe:p334` row's cost reads B's measured 4 min 19 s for both builds instead of "not yet measured, expected about 8 minutes" |

### Commands (the fixer)

| Command | Exit | Reading |
| --- | --- | --- |
| `node build/p334/probe-p334.mjs --self-test` | 0 | 87 breaks (84 + the round's three: A9 and A10 not in step before the write, A4 stopped partway with its looks kept), each turning exactly its own row; nothing launched |
| `node --check build/p334/probe-p334.mjs` | 0 | — |
| `vitest run __tests__/p334-reread-on-return.test.ts` | 0 | 51 passed (48 + R7b, R7c, R7d) |
| the three tab-io ablations, in a `cp -Rc` clone of this worktree | 1, 1, 1 | `!live.dirty` removed: R7b red alone among the R7 rows; `live.savedContents === savedBefore` removed: R7c; `getWorkingModel(tab.id) === model` removed: R7d. `tab-io.ts` restored and checked by sha256 in a `finally`; this worktree's `tab-io.ts` never touched |
| `npm run -s typecheck` | 0 | 1,386 production files, 0 boundary violations, 0 runtime cycles |
| `npm test` | 0 | 1,031 files, 18,051 passed, 7 skipped (51 s) |
| `npm run conformance:save` | 0 | every rule |
| `npm run conformance:redline` | 0 | rule 9: 24 files, floor 24, 24 named; every rule |
| `npm run ablation:p268` | 0 | 32 ablations red, tree restored by sha256 |
| `npm run gate:contract` | 0 | byte for byte; no contract line moved |
| `npm run gate:checks` | 0 | — |
| `npm run gate:electron` | 0 | 159 helper users against a floor of 159 (no new launcher this round) |
| `npm run gate:background` | 0 | 4 starters, all in a `finally`; 19 of 19 fixtures |
| `npm run -s build` | 0 | 30 s, every inside gate green (`gate:electron`, `gate:background`, `gate:simulator`, `gate:knownhosts`, `gate:checks`, `conformance:ios`, `gate:contract`) |

Not run, by the round's rule (no Electron for anyone but a verifier): `probe:p334`, `smoke`, `smoke:t1`,
`smoke:t3`, `package`. **The reverify owes the live re-run of B1 and B2**: `probe:p334` at both builds must
read A9 ok at HEAD with `inStepBefore: true` and A4 graded (3 of 3 at HEAD, 0 of 3 at the parent), with
`back` read per look; if A4's return still needs the strip click at both builds, that is a reading about
the app's ⌃Tab focus that predates this phase, not a failure of the landing.

### For the operator, not fixed here

1. **The deleted banner's Close tab discards a dirty tab's typing without asking** (`EditorPanel.tsx`'s
   banner calls `forceCloseTab`). Pre-existing: the parent shows the same banner over the same dirty tab
   after any tracked change in the repository. This phase makes it reachable sooner for a file in an
   ignored folder whose file an agent deleted. Both verifiers judged the scenario no worse than today; a
   one-line follow-up (`closeTab`'s dirty prompt when the tab is dirty) would close it.
2. **L7, the caret after a reload made while away**, wants its own phase: transform the saved view state
   through the reload's edit, or apply the reload with the model attached.
3. **The entry (`docs/BACKLOG.md`) was not edited.** It is queued and has no limits section; §11 here is
   where L7 and L8 live, and the committer may carry them into the commit body.

## §As built, the landing fix (the main session, 2026-10-01, on his ruling "Land with the test fixed")

The reverify answered needs_work on the probe alone: every product row read no worse than the parent. Its major was arm
A4, whose ⌃Tab landed on nothing at BOTH builds, and whose recovery then left A5 to A11 and B1 to B5 unreadable. Its
own K2 found the cause: setup opened the second project before any arm ran, and with two projects open Ctrl+Tab is
`project.next` before it is `editor.recentTabs` (the app's capture-phase handler cycles projects first; identical at the
parent), so ⌃Tab never reached `cycleMru` or `commitMru`. Its K1, with ONE project open, measured the door as built: 3 of 3
landings on `a.md`, the writer's bytes seen in 135 to 138 ms at HEAD, 3 of 3 stale at the parent.

The fix is in the probe only. `setup` no longer opens `proj2`; a new `openSecondProject` opens it on first use, and A5
calls it, so A4 runs with one project open and every arm from A5 on runs with two, as before. `--self-test` still passes
(87 breaks). D3(b), §1.2's ⌃Tab row and §12 item 2 hold for ONE open project; with two or more, ⌃Tab switches projects and
`switchProject`'s door (D3(c)) is the one that re-reads, which is older behaviour and not this phase's to change.
