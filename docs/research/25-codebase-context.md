# 25 — Codebase context: the re-baseline that Phase 16 is driven from

**Phase 15.5. Read-only survey. Baseline: `main` @ `3fc6369`, measured 2026-08-11.**
**This document supersedes the file/line figures in the Phase 16 BACKLOG entry.** Those figures
(`store.ts ~950`, `main/ipc.ts ~1,019`, `app.css ~1,528`) were written at Phase 9. All three files
are now roughly **twice** those sizes, and the four largest sources of reader pain in the tree today
are not named in that entry at all.

Assembled from four independent read-only surveys — A (domain model + cohesion + import graph),
B (duplication), C (guardrail audit), D (dead code, Monaco, dependency weight) — plus direct
verification by the synthesizer of the tmux-safety and tmux-vocabulary guardrails, the test
inventory, and the npm script battery. No file under `src/` was modified by any survey.

**The headline.** The tree is 107,529 lines across 474 files, and **most of it is well organized**:
32 domain folders have honest barrels and one job each. The accretion is concentrated in about
**eight places**, and it is not where the stale spec points. Two findings are not refactor items at
all but latent defects that should be fixed regardless of whether Phase 16 happens: the durability
database is missing a `busy_timeout` its own clone has (§3, B2), and a CSS class collision is
mis-padding every text input in the New Project and ⌘T sheets today (§3, B3).

---

## 0. The tree, measured

| slice | lines |
|---|---|
| non-test `.ts` / `.tsx` | 77,341 |
| `__tests__` | 21,906 |
| CSS | 8,635 |
| **total `src/`** | **107,529** across 474 files |

Two measurements worth carrying forward:

- **~6,100 non-test lines (7.9%) are test/screenshot harness code that ships in the production
  bundles.** Five `shot-probe.ts` files + `editor/shot-hook.ts` (3,061), `main/conformance/**`
  (1,782), and the smoke/shot half of `main/index.ts` (~1,258). Confirmed in built output:
  `out/renderer/assets/index-*.js` contains `gmuxShotDrive`; `out/main/index.js` contains the
  `GMUX-T3-MARKER` smoke fixtures. `App.tsx` and `EditorPanel.tsx` import the probes **statically**,
  so nothing tree-shakes them.
- **Exact-clone density is low**: jscpd at `--min-lines 12` over the whole tree finds 6 clones /
  104 lines / **0.12%**. The dup-scan guardrail largely held. The duplication that matters (§3) is
  *conceptual* — parallel implementations of one idea — which no clone detector sees.
- **No file in `src/` is unreachable.** Zero modules have no importer.

---

## 1. The current domain model, and where the boundaries leak

**40 domains: 22 in main, 15 in the renderer, 3 shared.** Grouped by the domain each module
*actually serves*, not the folder it sits in.

### 1.1 Main process (22)

| # | Domain | Where it actually lives | Public surface | Boundary |
|---|---|---|---|---|
| 1 | tmux control (private `-L gmux` server, resolution, supervisor, control-mode client, session verbs, copy-mode scroll) | `main/tmux/**` (10 files, 2,201) | `tmux/index.ts` | **Leaks** — see L4 |
| 2 | session durability (SQLite manifest, per-agent session-id harvest, snapshots) | `main/manifest/**` (1,141 + 1,058) | `manifest/index.ts` | Clean. DO NOT TOUCH |
| 3 | restore | `main/restore/**` (590) | `restore/*` | Clean. DO NOT TOUCH |
| 4 | **session orchestration** (create/rename/kill/attach/detach/resize/restore, reconcile, status watcher, capture-sync queue, scroll, projects API) | **`main/ipc.ts:280-1733`, `class GmuxCore`, 1,453 lines** | `getGmuxCore()` | **Leaks** — see L1 |
| 5 | agents (12-agent registry, detection, flag presets, availability) | `main/agents/**` (2,311) | `agents/index.ts` | Clean, data-shaped |
| 6 | activity / status oracles | `main/activity/**` (1,983) | `activity/index.ts` | Clean. DO NOT TOUCH |
| 7 | attach host (node-pty `tmux attach` clients) | `main/attach/**` (474) | `attach/index.ts` | Clean |
| 8 | git | `main/git/**` (3,209) | `git/index.ts` | Clean |
| 9 | file ops + images | `main/fs/**` (1,130) | `fs/index.ts` + 2 registrars | Clean |
| 10-12 | search / quickopen / symbols | `main/search/**` (1,323), `main/quickopen/**` (1,517), `main/symbols/**` (2,368) | three barrels | Clean and deliberately seamed (`search/resolve.ts`, `search/files-args.ts` shared). Guardrail 3 held — but see B7 |
| 13 | diagnostics (scrollback facts, owned-process enumeration, process helpers) | `main/scrollback/**` (554) + `main/diagnostics/**` (219) + `main/proc/**` (591) | three barrels | **Leaks** — see L7 |
| 14 | SpecStory capture | `main/specstory/**` (1,308) **+ `main/settings/specstory-ipc.ts` (318) + `specstory-login.ts` (209)** | `specstory/index.ts` | **Leaks** — see L2 |
| 15 | settings | `main/settings/**` (1,001, of which 527 is SpecStory) | `settings/index.ts` | Two domains in one folder |
| 16-20 | image drop · terminal capture · tray · native menu · projects · asset protocol | `main/drop`, `main/capture`, `main/tray`, `main/menu.ts`, `main/projects`, `main/assets` | barrels | Clean |
| 21 | IPC plumbing | `main/typed-ipc.ts` (36) + 10 per-domain registrars | `handle()` | **Leaks** — two private `handle<>` copies survive |
| 22 | harness | `main/conformance/**` (1,782) **+ `main/index.ts:232-1490`** | CLI entries | **Leaks** — see L8 |

### 1.2 Renderer (15)

| # | Domain | Where | Boundary |
|---|---|---|---|
| 1 | app shell chrome (titlebar, activity bar, sidebar frame, empty states, toasts, confirm, native context-menu bridge) | `renderer/app/*` subset | **no barrel** — see L3 |
| 2 | session UI (tab strip, dock, identity strip, restore bar, create modal, agent grid, session menus, attention overlay, status vocabulary) | `renderer/app/*` subset + `app/split/**` | interleaved with #1 in one folder |
| 3 | split layout | `app/split/**` (1,066) + `state/layout.ts` (543) + `state/split-tree.ts` (236) | **Leaks** — see L5 |
| 4 | terminal | `renderer/terminal/**` (1,111 + capture 1,069 + drop 1,768 + keys 223 + scroll 565) | Exemplary barrels. Clean |
| 5 | editor | `renderer/editor/**` (4,605 + image 1,122 + markdown 1,288) + `renderer/pierre/**` (673) | Clean; smallest public surface relative to size in the tree (3 exports) |
| 6 | SCM | `renderer/scm/**` (8,494 + graph 853) **+ `renderer/state/git.ts` (337)** | **Leaks** — see L0, L6 |
| 7 | explorer / tree | `renderer/tree/**` (3,681) | Clean, two documented reach-ins |
| 8 | search + symbols | `renderer/search/**` (3,703) | Two surfaces in one folder **by an argued decision stated in the barrel**. Cohesion, not accretion |
| 9 | quick open | `renderer/quickopen/**` (1,491) | Clean |
| 10 | zoom | `renderer/zoom/**` (1,145) | Clean |
| 11 | settings | `renderer/settings/**` (3,650) | Dual role (standalone window + selector library), documented. Acceptable |
| 12 | presentation primitives | `renderer/icons` (382, 36 importers), `controls` (165), `keys` (63) | Clean leaves |
| 13 | global state | `renderer/state/**` (2,862) | **no barrel** — see L3 |
| 14 | styles | `renderer/styles/**` (2,742) | `app.css` = 13 region stylesheets; every other domain colocates |
| 15 | harness | 5 × `shot-probe.ts` + `editor/shot-hook.ts` (3,061) | cross-cuts 6 domains, wired into production entry points |

### 1.3 Shared (3)

`shared/types.ts` (1,060, 17 "APPENDED by …" blocks) and `shared/ipc.ts` (2,333, **35** APPENDED
markers) are the **contract** domain; `shared/keymap.ts` (1,066) is genuinely single-source; eight
small single-purpose modules (`settings`, `fs-ops`, `symbols`, `scrollback`, `image-types`,
`specstory-status`, `sessions-position`, `project-create`) are all clean.

`shared/ipc.ts` is the append-only rule's unreconciled residue: **24 per-stream channel-map
interfaces** chained through a **nine-level intersection ladder** whose names encode BUILD ORDER,
not domains — `InvokeChannelMap → Extended → All → Full → Complete → Depth → Registry → Gmux`, with
`Branches` hanging off the side. Grepping every alias family outside `shared/ipc.ts`:

- `Full*`, `Complete*`, `Depth*`, `Registry*`, `Branches*` — **referenced nowhere. Five dead alias families.**
- `Extended*` — only in a comment in `typed-ipc.ts`.
- `All*` — only in `restore/ipc.ts`, kept alive solely by that file's duplicate `handle<>`.
- `Gmux*` — the live one.

### 1.4 The nine boundary problems, named

- **L0 — Renderer git is two stores in two folders.** `state/git.ts` (`useGit`: status, staging,
  commit, flat log) and `scm/depth.ts` (`useGitDepth`: branches, graph log, divergence, commit
  details, push/pull/sync). Each has its own per-repo record type, its own `git:changed`
  subscription, its own debounce constant (`depth.ts:302` literally comments "mirrors useGit"), its
  own toast helper. `state/git.ts` imports *back* into `scm/groups`, so the folders are mutually
  dependent. **Highest-value renderer consolidation.** See B4.
- **L1 — Session orchestration has no folder and no name.** A 1,453-line domain lives inside a file
  called `ipc.ts`; seven modules import a file named `ipc.ts` to reach a service object.
- **L2 — SpecStory is split across two folders** by a parallel-build collision its own header
  documents ("so two parallel builders could finish without writing the same file twice"). The
  blocker no longer exists.
- **L3 — Two large renderer folders have no declared public surface.** `renderer/app/` (31 files,
  6,469 lines, six domains, no `index.ts`) and `renderer/state/` (7 files, 2,862 lines, ten
  domains, no `index.ts`). Eleven other domains import from `app/` anyway (`app/format.ts` has 11
  importers, `app/status.ts` 5, `app/focus-trap.ts` 5).
- **L4 — The app-wide error vocabulary is parked in `main/tmux/errors.ts`** (`GmuxError`,
  `gmuxError`, `isGmuxError`), imported by 20 modules across 8 domains, ~14 of them nothing to do
  with tmux (fs, git, search, drop, capture, projects). It is `main/errors.ts`.
- **L5 — Split layout is view/model split across `app/split/**` and `state/{layout,split-tree}.ts`**
  — defensible, except `state/store.ts` imports `app/split/pointer-drag.ts`, closing a cycle. The
  "state layer" is therefore not a layer.
- **L6 — Commit-graph topology is in `scm/graph/**` (barrel, pure) but SVG geometry
  (`scm/graph-geometry.ts`, 499) and the component (`scm/CommitGraph.tsx`, 332) sit outside it**
  among 20 unrelated SCM files. Pure file move.
- **L7 — Diagnostics is one user-facing feature in three folders** (`scrollback`, `diagnostics`,
  `proc`) with a dynamic import between two of them. Scattered, not broken.
- **L8 — The harness is a domain in its own right, smeared across `main/index.ts`,
  `main/conformance/`, and six renderer folders**, statically wired into two production entry points.

### 1.5 The missing abstraction: there is no command layer

`shared/keymap.ts` is the single source of *which chord*, but the *action* is implemented **twice
inside `App.tsx`** — once in the global `keydown` switch (318-370) and once in `runMenuAction`
(435-560) for the native menu — with subtly different guards. ⌘T is byte-identical in both:

```ts
if (s.projects.length === 0) {
  s.toast('info', `Open a project first (${keyDisplay('project.open')})`);
} else if (s.bootBlock === null) {
  s.setCreateOpen(true);
}
```

⌘J / ⌘/ / ⌘B / ⌘O / ⌘P are near-identical pairs. Third and fourth expressions of the same verbs live
in `terminal/terminal-menu.ts`, `app/session-actions.tsx` and `app/new-session-menu.ts`. A
`commands` module (id → run + enablement, consumed by the keydown map, the native-menu bridge and
every context menu) would collapse all of it and is **the single highest-leverage new abstraction in
the renderer**. It is also where the Phase 12.5 ⇧↩ class of bug recurs: a keymap row and its
handler can silently disagree and no test catches it (`App.tsx` dispatches by hand-written
comparison — `e.key === 'F2'` :223, `e.key === 'F4'` :236, `key === 'c' || code === 'KeyC'` :254).

### 1.6 The hubs

| Module | Non-test importers | Verdict |
|---|---|---|
| `shared/types.ts` | 84 | Legitimate contract |
| **`renderer/state/store.ts`** | **61, spanning 12 domains** | **Junk drawer** (see §2 #3) |
| `shared/ipc.ts` | 55 | Legitimate contract; internally an append-log |
| `renderer/icons/index.ts` | 36 | Healthy leaf |
| `shared/keymap.ts` | 26 | Healthy single source (for display + accelerators) |
| **`main/tmux/errors.ts`** | **20, ~14 non-tmux** | Misfiled hub (L4) |
| `main/agents/registry.ts` | 15 | Legitimate — it is data |
| `renderer/editor/store.ts`, `renderer/settings/settings-store.ts` | 15 each | Legitimate domain stores |
| `main/proc/guarded.ts` (11), `renderer/app/format.ts` (11), `main/typed-ipc.ts` (10) | | Legitimate shared infra; `app/format.ts` sits in a folder with no barrel |
| **`main/ipc.ts`** | **7** | Hub by accident: everyone imports it for `getGmuxCore()` |

---

## 2. Cohesion ranking — what actually warrants splitting

**Ranked by how many unrelated things a reader must hold at once, NOT by line count.** 80 non-test
files exceed 300 lines; these eleven are the ones that fail the cohesion test.

| # | File | Lines | Unrelated responsibilities held at once | Reader cost |
|---|---|---|---|---|
| 1 | `src/main/ipc.ts` | 1,998 | **4**: `GmuxCore` session orchestrator (1,453, itself 10 labelled sub-areas) · native popup-menu bridge with accelerator + icon mapping (110) · a private duplicate `handle<>` (23) · the invoke registrar (85). The filename names none of it | **Highest in the tree** |
| 2 | `src/main/index.ts` | 1,658 | **3, and ~76% of it is not the file's job**: bootstrap + window + native-module proof + quit flow (~400) · eight CLI harnesses (~1,060, lines 232-1310) · the screenshot harness `runShot` (176) | To edit boot order you scroll past 1,250 lines of tmux fixtures |
| 3 | `src/renderer/state/store.ts` | 1,255 | **8 state domains** (boot · projects · sessions · restore · attention · dialog/menu/toast service · sidebar+layout prefs · sessions-position↔menu sync) **+ 4 utility layers** (error formatting, localStorage, native-menu types, bridge feature-detection). 61 importers | Any change has 12-domain blast radius |
| 4 | `src/renderer/app/App.tsx` | 1,039 | **6**: composition root (80) · global keydown dispatch (278) · native-menu dispatch (150) · screenshot layout harness (293) · quit-request flow · window title. Two of them duplicate each other | The composition root is 8% of the file |
| 5 | `src/renderer/styles/app.css` | 2,174 | **13 region stylesheets**, two of which duplicate declarations that already live in colocated stylesheets | Every other domain already colocates |
| 6 | `src/shared/ipc.ts` | 2,333 | Nominally one domain, but 24 stream-named interfaces + a 9-deep alias ladder + 35 APPENDED blocks; **5 alias families dead** | A reader must reconstruct the ladder to know which map is authoritative |
| 7 | `src/renderer/editor/shot-hook.ts` | 997 | Harness reaching into **6 domains**, imported by production `EditorPanel.tsx` | Not a split — a **segregation** |
| 8 | `src/renderer/scm/HistorySection.tsx` | 962 | **5**: commit list + graph gutter host · inline per-commit file expansion · hover-card timing · context menus + verbs · sync-note derivation · `MiniModal` host | |
| 9 | `src/renderer/tree/FileTree.tsx` | 964 | **4**: a 720-line tree component · localStorage expansion persistence · DOM hit-test helpers · **53 lines of shadow-DOM CSS as a TS template literal** (`TREE_UNSAFE_CSS`) | The CSS-in-TS is invisible to the stylesheet story |
| 10 | `src/renderer/scm/ScmSection.tsx` | 946 | **5**: changes list · file row · commit-box controller hook · section-order/drag host · init-repo stub · discard-confirm copy | |
| 11 | `src/renderer/app/TerminalRegion.tsx` | 915 | **5 surfaces**, and shares 36 duplicated lines with `SessionDock`/`SplitSurface` | |

Borderline, below the line: `shared/types.ts` (1,060, ~10 type domains — cohesive *as the contract*
but ungrouped), `scm/BranchesView.tsx` (568), `app/CreateSessionModal.tsx` (531).

### 2.1 Big but cohesive — DO NOT SPLIT

Length here is subject matter. Splitting these raises reader cost.

- `main/agents/registry.ts` (1,277) — 660 lines is one `AGENT_REGISTRY` literal.
- `main/git/service.ts` (1,593) — one repo façade, six labelled sub-areas, all git. *One* worthwhile
  extraction: the four argument validators (`assertSafeRef`, `assertSha`, `assertRelPath`,
  `toPathspecs`, ~60 lines) into `git/safety.ts`, because they are the injection-safety boundary and
  deserve to be found and tested as one thing.
- `main/manifest/store.ts` (832) — durability-critical, **do-not-touch** except B2.
- `main/manifest/harvest/stores.ts` (703) — per-agent data table; generic algorithm already next door
  in `watch.ts`. Exemplary seam.
- `main/conformance/resume.ts` (798), `main/agents/flags.ts` (652), `main/git/parse.ts` (625).
- `renderer/scm/depth.ts` (843) — its problem is that it is the *second* git store, not its length.
  Fix by consolidation (L0), never by splitting.
- `renderer/editor/store.ts` (741) — one tab state machine; IO already extracted to `tab-io.ts` in
  Phase 12. **This is what the guardrail looks like when it works.**
- `state/layout.ts` (543), `search/store.ts` (600), `quickopen/scorer.ts` (555, vendored VS Code
  `fuzzyScorer`), `tree/tree-ops.ts` (562), `main/search/engine.ts` (460), `main/symbols/store.ts`
  (437), `main/attach/attach-host.ts` (446), `scm/graph-geometry.ts` (499),
  `terminal/capture/index.ts` (442).

**The stale spec would have over-corrected**: its "SCM components > 700 lines" line points at
`depth.ts` (843, cohesive) while missing `FileTree.tsx` (964) and `TerminalRegion.tsx` (915), which
are the ones actually mixing domains.

---

## 3. Duplication, ordered by "can these two copies disagree?"

### Tier 1 — copies that CAN disagree today (correctness, not tidiness)

**B1 · Three `stripAnsi` implementations, two exported under the same name, one materially weaker.**
`restore/command.ts:64-77` (CSI + OSC + two-byte ESC; re-exported from `restore/index.ts:27`) ·
`conformance/report.ts:164-188` (verbatim copy of all three regexes, with a comment admitting it) ·
`agents/detection.ts:115-119`, exported as `stripAnsi` from `agents/index.ts:22`:
```
text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b[@-Z\\-_]/g, '')
```
**No OSC branch at all**, and the CSI class omits `:`. An agent whose `--version` output uses
colon-separated SGR (`\x1b[38:2:255:0:0m`, valid ITU-T T.416, emitted by several TUI toolkits) or an
OSC title sequence is cleaned by restore's stripper and **not** by detection's, so
`extractVersion()` (`detection.ts:126`) returns escape residue. That string is the
`helpVerifiedVersion` comparand and the text in Settings → Agents. Two same-named exports with
different behaviour is also an import-site trap.
*Fix:* keep restore's (strictest, already unit-tested), move to a pure leaf module, re-export from
the other two.

**B2 · The manifest DB is missing the `busy_timeout` its clone has.** `manifest/store.ts:468-504`
and `symbols/persist.ts:120-154` are a byte-identical 24-line `private migrate()` plus identical
open sequence — **except** persist.ts adds:
```ts
this.db.pragma('busy_timeout = 5000');
// A concurrent writer is not an error, it is a wait. Without this a
// parallel build in a second window throws SQLITE_BUSY and loses a batch.
```
**The durability-critical database is the one WITHOUT the pragma, and the comment explaining why it
is needed lives only on the copy that has it.** Any second writer to `manifest.db` — a second
window, `conformance:resume` against a live userData dir, harvest racing a session insert — throws
`SQLITE_BUSY` out of `insertSession`, and the row recording a just-spawned session is never written.
**That session is unrestorable after a quit.** This is the "can lose the user's work" class.
*Fix:* one line, do it regardless of any refactor. Extraction of a shared `openSqlite` +
`runMigrations` is a separate, optional step.

**B3 · `.field` means two different things in two global stylesheets, and the collision is live.**
`styles/app.css:1110` (`.field` = modal form-field wrapper) vs
`controls/filter-field.css:18-38` (`.field` = search filter field, **plus
`.field > .input { --input-pad-start: … ; --input-pad-end: … }`**, specificity 0,2,0, which beats
`.input`'s own defaults regardless of load order). `NewProjectModal.tsx:156-163` and
`CreateSessionModal.tsx:399-403,417-422` render `<div className="field">…<input className="input"/>`
as a direct child, so **every text field in the New Project and ⌘T sheets has ~34px of phantom
leading padding and ~26px trailing, reserved for a search glyph and a clear button that are not
there.** Verifiable now.
*Fix:* rename the filter control to `.filter-field` / `.filter-field-icon` (5 sites). Do not rename
the modal `.field`.

**B4 · Four independent `git:changed` subscribers with four different debounce windows.**

| file | line | window |
|---|---|---|
| `renderer/state/git.ts` | 195-211 (`CHANGED_DEBOUNCE_MS`, :117) | **200 ms** |
| `renderer/scm/depth.ts` | 336-349 (`CHANGED_DEBOUNCE_MS`, :303) | **250 ms** |
| `renderer/editor/store.ts` | 407-418 (`GIT_REFRESH_DEBOUNCE_MS`, :313) | **300 ms** |
| `renderer/tree/FilesSection.tsx` | 114-121 (inline literal) | **150 ms** |

(plus a fifth, undebounced, at `search/SearchView.tsx:165`.) Two files declare the **same constant
name with different values**. Commit from a session terminal → the tree redecorates at 150 ms,
Changes clears at 200 ms, History reloads at 250 ms, editor tabs re-diff at 300 ms: **150 ms of a
sidebar visibly contradicting itself, on every commit, checkout and stage**, plus four `git
status`/`git log` bursts per event per repo.
*Fix:* one `onRepoChanged(repoPath, cb)` in `state/git.ts` owning a single timer map at the smallest
window (150 ms).

**B5 · The tree keeps a second, independently-fetched copy of `git status`.**
`tree/git-status.ts`'s own header says the DESIGN intent is that decorations come from the SCM
store. `Sidebar.tsx:169-173` does pass `statusFiles` when `scmStatusFiles !== null`, so the second
fetcher is **dormant, not removed** — and in the null window the tree's own catch
(`git-status.ts:54-58`) sets `isRepo: false`, stripping **every** decoration rather than keeping the
last-known set. Two error policies for one piece of state. *Fix is a net deletion.*

**B6 · `runGuarded` is not the one way main spawns a child.** `proc/guarded.ts:1-38` documents, from
a measured 19-hour orphan leak, that `execFile` never settles when the child forks and silently
drops `detached`. Yet `activity/process.ts:96-100` uses `execFileP('/bin/ps', …)` **on a 1 Hz poll**
and `manifest/harvest/stores.ts:663` uses `execFileAsync('ps', …)`. Four further spawns never call
`trackGuardedChild`, so `reapGuardedChildren()` on `before-quit` does not know about them:
`quickopen/worker.ts:197`, `symbols/files.ts:58`, `search/engine.ts:207`, `git/exec.ts:78` —
quitting mid-`rg` on a large tree leaves ripgrep running. `descendantsOf` (`ps.ts:66-83`) and
`descendants` (`activity/process.ts:107-121`) are a ~16-line near-clone down to the `4_096` bound.
**This is the orphan class Phase 13.8 fixed, re-entering through the doors 13.8 did not close.**

**B7 · Two independent `rg --files` streaming implementations.** `quickopen/worker.ts:182-250`
(chunk splitter, `MAX_PATHS` cap, SIGKILL on cap) vs `symbols/files.ts:51-108` (`carry`/`indexOf`
loop, **no cap**, AbortSignal). Both re-implement the same 4096-byte stderr cap;
`search/engine.ts` carries a third line-splitter for NDJSON. The *arguments* are single-sourced
(`rgBinaryPath`, `buildListFilesArgs`) which is exactly why the remaining duplication is invisible.
Only one of the two survives a pathological monorepo.

**B8 · The typed preload bridge covers 3 of 10 event channels.** `preload/index.ts:94-103` types
`on<C extends EventChannel>` over the **base** `EventPayloadMap` — `sessions:changed`,
`git:changed`, `status:changed`. The other seven each got a hand-written 8-line raw `ipcRenderer.on`
block (:282 scrollback, :302 search, :333 symbols, :370 capture, :457 quit, :469 menu action,
:484 activity, :496 settings). **This is the preload-wrapper-generations pattern the guardrail was
written to kill, still alive on the event half.** Two supporting facts: `AllEventPayloadMap`
(`shared/ipc.ts:1337-1342`) unions activity + scrollback + capture but is **imported only by main**;
`SymbolsEventPayloadMap` (`shared/ipc.ts:1963`) is in **no composed map at all**, so
`symbols:progress` is sent and received with **zero shared type checking on either side**. Change
`SymbolIndexProgress`'s shape and nothing fails to compile.

**B9 · A third `handle<C>` generation survives.** `typed-ipc.ts` is documented as THE wrapper and
its docblock narrates consolidating four earlier copies ("it does not start a fifth generation").
`main/ipc.ts:1803` is a harmless 9-line shorthand that delegates. **`restore/ipc.ts:24-34` is a full
independent copy** typed over `AllInvokeChannel`, calling `ipc.handle` directly — and it is the sole
remaining consumer of the `AllInvoke*` aliases.

### Tier 2 — surviving exact clones (jscpd, all 6)

| lines | where | what it means |
|---|---|---|
| 27 | `manifest/store.ts:480` ↔ `symbols/persist.ts:129` | = B2. Missing `main/db/migrate.ts` |
| 20 | `app/TerminalRegion.tsx:206` ↔ `app/split/SplitSurface.tsx:127` | The end-session `×` button JSX; a third near-copy in `SessionDock.tsx`. Missing `<EndSessionButton>` in a session-UI module that does not exist |
| 16 | `app/SessionDock.tsx:183` ↔ `app/TerminalRegion.tsx:264` | The dock and the tab strip are two renderings of one list |
| 13 | `app/CreateSessionModal.tsx:96` ↔ `app/TerminalRegion.tsx:679` | Agent-option construction |
| 21 | `editor/image/image.css` self-clone | Cosmetic |
| 13 | `styles/app.css:358` ↔ `:829` | The 36px header-band rule, twice |

### Tier 3 — second sources of truth (no clone detector sees these)

| constant / concept | declared | mirrored |
|---|---|---|
| `MAX_DROP_BYTES` 25 MB | `main/drop/store.ts:27` | `renderer/terminal/drop/acquire.ts:24` |
| `DEFAULT_MULTILINE_KEY` | `main/agents/registry.ts:411` | `renderer/terminal/keys/multiline.ts:28` — **same exported name, two modules** |
| `DEFAULT_IMAGE_DROP` | `main/agents/registry.ts:367` | `FALLBACK_IMAGE_DROP`, `renderer/terminal/drop/strategy.ts:18` |
| launchable agent ids + order (10) | `main/agents/registry.ts` | `LAUNCHABLE_OPTIONS`, `renderer/state/agents.ts:116` |
| `IDLE_EVICT_MS` 30 min | `main/symbols/pool.ts:29` | `main/symbols/service.ts:48` — same process, twice |
| tmux socket name | `main/tmux/supervisor.ts:42` `TMUX_SOCKET = 'gmux'` | `main/attach/attach-host.ts:176` `this.opts.socketName ?? 'gmux'` — a literal default, not the import |
| Monaco theme name | `monaco-impl.ts:63` `GMUX_MONACO_THEME` | `MonacoHost.tsx:225` hardcodes `'gmux-dark'` |
| packaged-resources path shape | `tmux/resolve.ts:345` | `tray/index.ts:46` (comment admits it), `specstory/resolve.ts:125`, `symbols/paths.ts:40,59` |
| basename | `editor/paths.baseName` (header confesses) | `tree/tree-paths.baseNameOf`, `scm/format.splitPath` |
| relative time | `app/format.formatAge` | `scm/format.formatRelative`/`formatRelativeLong` |
| localStorage access | `state/store.ts` exports `loadLocal`/`saveLocal` | 11 modules call `localStorage.getItem/setItem` directly; only 2 use the helpers |

The registry mirror is the expensive one: an 11th launchable agent needs a renderer edit that nothing
type-checks. The short labels ("Cursor" vs registry "Cursor CLI") are a deliberate difference — fix
with a `shortLabel` registry field, not by deleting the map. **One mirror that must STAY:**
`renderer/pierre/theme-bridge.ts` mirrors `tokens.css` because Pierre renders into shadow DOM where
custom properties cannot cascade.

---

## 4. Guardrail audit

| # | Guardrail | Verdict |
|---|---|---|
| G1 | One typed preload bridge | **PASS renderer-side / FAIL main-side** |
| G2 | Keymap single-source | **PASS** (the only one with an automated test) |
| G3 | tmux binary/config resolution in one module | **PASS** |
| G4 | One open-file bus | **PASS** |
| G5 | Colours via tokens only | **FAIL** (narrow but real) |
| G6 | Native menus only, no DOM-drawn menu | **PASS** |
| G7 | tmux safety — only ever `-L gmux` | **PASS** (one literal caveat) |
| G8 | No tmux vocabulary in user-facing UI | **PASS** (justified exceptions) |
| G9 | `src/shared/*` append-only, integrators reconcile | **FAIL** — never reconciled |
| G10 | After parallel work, scan for duplicated 10+ line blocks | **PARTIAL** — exact clones 0.12%, conceptual duplication unswept |

**G1 — FAIL on the main side.** Renderer side is clean: exactly one `contextBridge.exposeInMainWorld`
(`preload/index.ts:501`), **zero** `ipcRenderer` references outside the preload, one `invoke<>`, one
`on<>`, and **complete channel closure** — 94 main handler channels vs 95 preload invoke sites diffed
to 0 orphans either way. Main side breaks it three ways: (a) `restore/ipc.ts:24` is a second wrapper
generation (B9); (b) **21 of 94 handlers bypass the typed wrapper** with raw `ipc.handle('…')` and
hand-cast payloads — `settings/ipc.ts` (4), `settings/specstory-ipc.ts` (5), `agents/index.ts` (4),
`drop/ipc.ts` (3), `attach/index.ts` (3), `index.ts` (1, `app:quit`), `ipc.ts` (1, `ui:popupMenu`);
(c) the event half is untyped for 7 of 10 channels (B8).
*Smallest fix:* delete `restore/ipc.ts:24-35` and import `handle`; convert the 21 raw calls
(mechanical, and it **adds** type checking); add `SymbolsEventPayloadMap` to `AllEventPayloadMap` and
retype `on<>`.

**G2 — PASS.** `shared/__tests__/keymap-single-source.test.ts` enforces "a modifier glyph in
executable source is a bug" across all of `src/` with a 5-entry mechanism-justified allow-list;
**re-run during this survey: 2 passed**. 39 import sites. `main/menu.ts` has **21 `accel(id)` calls
and 0 literal accelerators**. Residual drift worth one line each (does not flip the verdict): four
hand-written hints where a keymap id exists — `hint: 'F2'` at `tree/tree-menu.ts:106`,
`app/session-actions.tsx:108`, `app/split/split-menu.ts:68` (keymap has `session.rename`), and
`hint: '⌫'` at `tree/tree-menu.ts:121` (keymap has `files.trash`; the glyph test misses `⌫` because
it is not a *modifier*); plus the literal `'Cmd+V'` at `terminal/terminal-menu.ts:126` and
`terminal/drop/pipeline.ts:117`, which should read `NATIVE_ROLE_CHORDS['Cmd+V']`.
**Structural caveat:** single-source for *display and native accelerators*, not for *renderer
binding* (§1.5).

**G3 — PASS.** `main/tmux/resolve.ts` is the sole owner of `findTmuxBinary()` and
`resolveConfPath()`; the only hardcoded tmux paths in non-test code are its own lines 330-332; both
consumers import it (`attach/attach-host.ts:45`, `tmux/supervisor.ts:29`, which re-exports so the
barrel keeps one name). One construction site for `gmux-tmux.conf`. *Adjacent:* the
packaged-resources two-liner is reimplemented four times (§3 Tier 3) — one `main/paths.ts`
`resourcesDir()` fixes it.

**G4 — PASS.** `renderer/state/open-file.ts` is the only definition of
`OPEN_FILE_EVENT`/`requestOpenFile`/`onOpenFile`. All eight emitters route through it (tree click,
tree new-file, SCM row, SCM history, search hit, symbols, quick-open, markdown link), exactly **one**
consumer wires it to the editor (`editor/store.ts:406`) plus one passive observer
(`quickopen/recents.ts:104`), and the preview/pinned semantics are consistent ("browse gestures
preview, commitments pin") with the one deviation documented in-line at both sites.
*Cleanup:* `scm/open-file.ts` and `tree/open-file.ts` are now pure re-export shims from the Phase-4
merge with 5 importers between them. Delete both, repoint.

**G5 — FAIL.** Sanctioned mirrors (`monaco-impl.ts`, `pierre/theme-bridge.ts`, `terminal/theme.ts`)
each carry a header naming the token they mirror and are fine. Three violations:
1. `renderer/terminal/terminal.css` — **11 hex + 2 rgba literals as `var()` fallbacks**
   (`var(--bg-canvas, #131417)` :11,:25; `--text-muted, #838996` :68,:109; `--text-secondary,
   #a8adb8` :75,:93; `--text-primary, #e8eaed` :100,:120; `--border-strong, #3a3e48` :117;
   `--bg-raised, #22252b` :119; `--bg-active, #2a2e36` :127; `--bg-scrim` :92; `--focus-ring` :132).
   A silent second copy of the dark ramp that no test compares against `tokens.css`. Since
   `tokens.css` is always loaded, **the fallback can only ever fire as a wrong colour** — strip them.
2. `#131417` in `main/index.ts:172` and `main/settings/window.ts:47` (`backgroundColor`). Main cannot
   read `tokens.css`; fix with one exported `WINDOW_BACKGROUND` in `src/shared/`, annotated in
   `tokens.css`.
3. `terminal/capture/{index.ts,serialize.ts}` — 7 last-resort literals that should fall back to
   `terminalTheme.background/foreground` three lines away.
*Not violations:* `#000`/`#fff` gradient and mask stops, `agent-menu-icon.ts:30`'s `currentColor`
substitution, and the light-background HTML-export branch in `serialize.ts`.

**G6 — PASS.** `app/ContextMenu.tsx` renders **no JSX at all** despite the extension — it is the
single `ui:popupMenu` bridge helper and a silent no-op without the bridge ("the former DOM-rendered
fallback menu is gone"). Only two callers of `showNativeMenu`: `state/store.ts:1040` (inside
`setMenu`, the one choke point) and `editor/EditorTabs.tsx`.

**G7 — PASS** (verified by the synthesizer). `'-L'` appears at exactly two non-test sites:
`tmux/supervisor.ts:88` (`['-L', ctx.socket, '-f', ctx.confPath, …]` from `TMUX_SOCKET = 'gmux'`) and
`attach/attach-host.ts:189`. *Caveat:* attach-host's socket comes from
`this.opts.socketName ?? 'gmux'` (:176) — a literal default rather than importing `TMUX_SOCKET`,
which it could do since it already imports from `tmux/resolve`. Same value today; a second source
tomorrow. One-line fix, and it is durability-adjacent so it rides the full battery.

**G8 — PASS** (verified by the synthesizer). The only user-visible "tmux" strings are the deliberate
missing-dependency copy in `EmptyStates.tsx:213-216` and `TerminalPane.tsx:83-86`, which must name
the thing the user has to `brew install`, and which already say gmux "never touches your own tmux
setup". Every other hit is an internal CSS class (`.split-pane`, `.imgc-pane`, `.ed-split-pane`), a
boot-block enum (`'tmux-missing'`), or a comment. No "prefix", no "window", no "pane" in copy.

**G9 — FAIL.** The append-only rule was correct during parallel builds and **the reconciliation half
never happened**: `shared/ipc.ts` carries 35 APPENDED blocks, a nine-level alias ladder, five dead
alias families, 33 `Gmux*Extras` interfaces re-intersected by hand at `preload/index.ts:388-406`, and
14 orphan `<X>InvokeReq`/`<X>InvokeRes` pairs; `shared/types.ts` carries 17. *Smallest fix:* delete
the dead alias families (provably behaviour-free, type-only), then collapse the ladder to
`GmuxInvokeChannelMap` over a flat set of per-domain maps.

**G10 — PARTIAL.** Exact 10+ line clones are down to 0.12% (6 clones, 104 lines), so the mechanical
half of the rule held. The conceptual half — "parallel implementations of the same concept" — was
never swept, which is how B1, B4, B6, B7 and eleven second sources of truth accumulated.

---

## 5. Dead code

Method: `knip@5` with an electron-vite-aware config (three main entries — `index`,
`quickopen-worker`, `symbols-worker` — both renderer HTML entries, preload, tests, `build/*.cjs`),
then every candidate re-checked by hand with a repo-wide word-boundary grep over
`src/ build/ resources/ electron-builder.yml package.json`. `ts-prune` was skipped: it cannot see the
worker entries. **Of 350 knip reports, ~91% are noise for this codebase** — 102 of them are symbols
whose only reference is their own domain barrel (32 such barrels exist).

### 5.1 Confident delete list

**Dependencies:** `uuid` and `@types/uuid` — zero imports; all ids come from `node:crypto`
`randomUUID` (10 sites). Also drop the now-meaningless `!node_modules/uuid/**` at
`electron-builder.yml:43`. Saves no runtime bytes; it is a truthfulness fix.

**29 truly dead symbols** (identifier appears exactly once in the repo — its declaration):

- *Values (12):* `getFlagCatalog` `flags.ts:621`, `verifiedPresets` `:634`, `appendPresets` `:650`,
  `resetSpecStoryStatusCache` `specstory-ipc.ts:314`, `PROJECT_SHORTCUT_DIGITS`
  `project-shortcuts.ts:20`, `onRecentsChanged` `recents.ts:87`, `resetRecents` `:117`,
  `isAgentAvailable` `state/agents.ts:73`, `firstAvailableAgent` `:81`, `projectExtras`
  `state/store.ts:1244`, `appExtras` `:1248`, `__setImageDropTable` `drop/strategy.ts:59`.
- *Types (17):* `ExtractFailure` `symbols/extract.ts:77`, `ListedFile` `symbols/files.ts:25`,
  `SymbolsEventPayloadMap` `shared/ipc.ts:1963` (**but see B8 — the right fix is to USE it, not
  delete it**), and the 14 orphan `<X>InvokeReq`/`<X>InvokeRes` aliases in `shared/ipc.ts` at
  67/68, 354/356, 554/556, 594/596, 674/676, 748/750, 926/928.
- *Class members (5):* `ClaudeSessionRegistry.unmapped`, `AttachHost.isAttached`,
  `SymbolPool.workerCount`, and — **durability-critical** — `ManifestStore.listSessionsForProject`
  (:577), `.touchSession` (:694), `.getProject` (:807). No callers exist so deletion is provably
  behaviour-preserving, but gate those three behind `smoke:t3` + `conformance:resume:capture`, not
  Tier 1.

**Cascade warning.** `getFlagCatalog` is the only reader of `NON_REGISTRY_FLAG_PRESETS`
(`flags.ts:516`, ~105 lines) and `appendPresets` the only caller of `presetArgs` (:639).
**Do not delete `NON_REGISTRY_FLAG_PRESETS`** — its docblock parks it deliberately for BACKLOG item
8. Delete the four helpers, keep the table, annotate it. *Why those helpers are dead is itself a
finding:* there are two implementations of "checked presets → argv". The live one is in the renderer
(`CreateSessionModal.tsx:260` builds `extraArgs`, `state/store.ts:793` passes them); main's
`appendPresets` is a dead parallel implementation, and main's real surface is
`getFlagCatalogViews()` at `settings/ipc.ts:34`, which builds its own wire view.

**Two lower-risk bulk categories.** *Barrel-only exports (102)* — **do not hand-audit these.** Change
the barrel doctrine (each `index.ts` exports only what crosses the domain boundary), re-run knip, and
the list collapses. Densest: `main/tmux/index.ts` (8, durability-adjacent — narrowing is type-only
but rides the full battery), `main/specstory/index.ts` (10), `main/git/index.ts` (9),
`main/symbols/index.ts` (6), `main/settings/index.ts` (5), `renderer/terminal/index.ts` (5).
*Internal-only exports (~90)* — used inside their own file, exported for no reason. Zero-risk: drop
the `export` keyword and `noUnusedLocals` keeps them honest. Clusters: `shared/ipc.ts` (42),
`scm/graph-geometry.ts` (8), `quickopen/scorer.ts` (5).

### 5.2 "Looks dead but is NOT" — the list that stops a future agent breaking things

1. **`src/renderer/env.d.ts`** — knip's only "unused file". Ambient declaration pulled in by
   `tsconfig.web.json`'s `include`; it declares `Window.gmux`. **134 `window.gmux` references across
   44 files stop compiling if it is deleted.**
2. **`@vscode/ripgrep`** — dynamic require at `main/search/resolve.ts:46`, platform sub-package
   unpacked by `electron-builder.yml:174`. Deleting breaks all search.
3. **`@vscode/tree-sitter-wasm`** — `require.resolve` at `main/symbols/paths.ts:42`, extraResources at
   `electron-builder.yml:133`. Deleting breaks symbols.
4. **`renderer/quickopen/quickopen.css`** (302 lines) — imported at `QuickOpenPalette.tsx:34`.
   Several greps returned nothing for its importer and Survey D nearly condemned it. Recorded because
   the shape recurs.
5. **`fenceLanguages` / `prepareHighlighter` / `MarkdownDocument`** in `markdown-impl.tsx` — reached
   via the lazy `markdown-loader.ts` dynamic import.
6. **`grammarPath`** `symbols/paths.ts:46` — used by `symbols/worker.ts` and the extractor test.
7. **`NON_REGISTRY_FLAG_PRESETS`** — deliberately parked future data.
8. **`onOpenFileRequest`** `state/open-file.ts:188` — knip's one "duplicate export"; a deliberate
   alias of `onOpenFile`, both names live.
9. **The three "test seam" exports** (`__setImageDropTable`, `resetRecents`,
   `resetSpecStoryStatusCache`) are on the delete list *only because nothing calls them*. Either
   delete them or write the test that justifies them — do not leave them unexplained.
10. **Assets:** all 12 agent SVGs are `?raw` imports at `AgentIcon.tsx:35-46`; `brand/tortie-128.png`
    at `EmptyStates.tsx:35`. The only orphan is `src/renderer/assets/.DS_Store`.
11. **All 23 CSS files are reachable** — `styles/globals.css` `@import`s `tokens.css` + `app.css`;
    the other 20 are component-imported. No orphaned stylesheet.

---

## 6. The Monaco recommendation, decided on today's evidence

### Is Pierre `/edit` GA? No — shipped and stable-tagged, but still labelled experimental.

`@pierre/diffs` dist-tags: `latest = 1.3.5` (also `beta = 1.3.0-beta.11`, `rc = 1.3.0-rc.4`); gmux
pins exactly 1.3.5, so **we are on latest**. 1.3.5 physically ships `/edit`: `dist/edit/index.d.ts`
exports `Editor`, `TextDocument`, `EditorCommand`, `EditorKeymap`, `IStateStorage`,
`PersistStateStorage`, `Position`, `Range`, `TextEdit`, implemented across 21 modules / ~344 KB
(piece table, edit stack, tokenizer, bracket matching, search panel, selection engine). A real
editor, not a stub. **But** the v1.3.0 release notes (2026-08-01) say verbatim: *"Edit mode is
**experimental** in 1.3 — the API may still shift — but it is fully functional."* diffs.com/edit
still says "Edit mode (experimental)". Five patches followed in six days (1.3.1→1.3.5), the last two
fixing newline handling, empty-file edits and editor state persistence. Materially better than
research 12's "beta", but the API is explicitly not frozen.

### What deletion would save — measured

| | |
|---|---|
| `node_modules/monaco-editor` | **98 MB** (2nd heaviest after electron's 296 MB) — **dev-time only, never shipped as node_modules** |
| Renderer JS attributable to Monaco | **42.2 MB raw / 7.1 MB gzip across 92 chunks** |
| …share of renderer | **74% of 57.1 MB raw / 70% of 10.1 MB gzip** |
| Largest files in the app | `monaco-impl-*.js` 24.8 MB, `ts.worker-*.js` 12.7 MB — #1 and #2 of 3,147 |
| Installed `.app` / `.dmg` | 452 MB / 169 MB |
| LOC deleted outright | **722** (`monaco-impl.ts` 156 + `monaco-loader.ts` 169 + `MonacoHost.tsx` 397) |

Method for the 42.2 MB: walked the emitted chunk import graph from both HTML entries and every
worker, re-walked with the five Monaco roots blocked, differenced. **Honest framing: this is not
primarily a size win** — 42.2 MB off a 452 MB `.app` is ~9% on disk and ~4% of the download.

### What deletion would cost — precisely

Monaco is unusually well encapsulated: everything outside `MonacoHost.tsx` goes through
`monaco-loader.ts`'s registry. Six consumers total, no CSS anywhere names a Monaco class, and
`shot-hook.ts` has a single `.monaco-editor` readiness selector. A swap reimplements one module's
API. Capability ledger: editing/undo/multi-caret/bracket-match all present on Pierre;
find-and-replace is a **gain**; per-tab state restore, the Phase-14 reveal+select+flash landing
(`MonacoHost.tsx:263-319` documents two ordering traps a rewrite re-encounters), read-only history
tabs, zoom-by-font-size and live text all need rebuilding. Two real losses: **the Phase 12.11 minimap
(Pierre has no minimap and no overview ruler)** and **syntax diagnostics for ts/js/json/css/html**
(the four language workers are 18.7 MB of the 42.2 — the half whose replacement costs the most).
One real gain beyond size: **one highlighter app-wide** — today Split mode renders the same fenced
block twice, Monarch on the left and Shiki on the right, and `monaco-impl.ts:120-152` spends 30 lines
making them agree.

### Recommendation: **KEEP Monaco through Phase 16. Do not delete it in this refactor.**

1. **The stated blocker has not cleared.** The deferral said "blocked on Pierre `/edit` GA". It is
   working and in the stable line, but its author says the API may still shift, and it is eleven days
   old. gmux's editing surface is the user's unsaved buffer — exactly the class CLAUDE.md reserves
   Tier 3 for, and exactly the class not to build on a moving API.
2. **The size case is weaker than the BACKLOG implies, and is not even the biggest size win
   available** (§6.1 finds ~45 MB of shipped bytes no code reads, plus minification — both config
   changes). Spending a library swap to win less than the config changes win is the wrong order.
3. **Phase 16 is explicitly behaviour-preserving.** Swapping the editor is a feature replacement with
   one guaranteed regression (minimap) and one likely (syntax markers). It does not belong in the same
   phase as splitting `store.ts`.
4. **Nothing is lost by waiting.** The seam is good and not degrading: 722 deletable lines, six
   consumers. The cost of deferral is 42 MB of disk.

**Do these three instead, in Phase 16:** turn on renderer `build.minify` and measure the packaged
delta (esbuild samples: monaco 26.0→21.0 MB (−19%), `ts.worker` 12.7→6.7 MB (−47%), the app's own
`index-*.js` 2.86→1.70 MB (−41%); **the renderer build is currently unminified and the asar carries
255,065 readable lines of `monaco-impl`**); fix the one real Monaco defect found — `monaco-impl.ts:63`
exports `GMUX_MONACO_THEME = 'gmux-dark'` and `MonacoHost.tsx:225` hardcodes the string; and write the
swap down as a **named future phase with acceptance criteria already fixed** — Pierre `/edit` drops
"experimental" **or** two consecutive minors ship with no `Editor` API break, and the phase must
deliver a minimap and a marker source or explicitly retire them with the user's agreement.

### 6.1 Three shipping-weight findings bigger than Monaco, costing no capability

1. **`@vscode/tree-sitter-wasm` ships TWICE and the 21 MB copy is never read.**
   `electron-builder.yml:133` already copies six filtered grammars (4.8 MB) to
   `Contents/Resources/tree-sitter`, and `symbols/paths.ts:40` reads them from `process.resourcesPath`
   when packaged — but the `files` denylist does not exclude the package, so the **entire 21.02 MB
   `node_modules/@vscode/tree-sitter-wasm` also rides inside `app.asar`**, including
   `tree-sitter-cpp.wasm` (5.14 MB) and `tree-sitter-c-sharp.wasm` (4.87 MB) for languages the code
   explicitly refuses to index. **~21 MB, pure deletion, zero behaviour change.**
2. **`better-sqlite3` ships all eight prebuilds — 14.2 MB of binaries that can never execute on this
   target** — plus `deps/` (9.8 MB, dominated by `sqlite3.c` at 9.08 MB) and `src/`. **~24 MB.**
   Lives in `app.asar.unpacked`, so it is invisible to an asar-only inspection.
3. **`web-tree-sitter` ships its sourcemaps and its 2.65 MB `debug/` directory.**

Together **~45 MB, slightly more than the entire Monaco prize**, with no capability loss and no
library swap. Every one is invisible in `out/`, which is precisely why they survived fifteen phases —
**gate on the packaged-app smoke, not `out/`.**

**Four phantom dependencies** resolve today only as hoisted transitives; a lockfile refresh that
dedupes differently breaks `npm run typecheck` with no code change: `unified`
(`editor/markdown/pipeline.ts:26`), `unist-util-visit` (pipeline test), `hast` /`@types/hast`
(`markdown-impl.tsx:24`), `@shikijs/types` (`markdown-impl.tsx:25`, `pipeline.ts:25`). Add all four to
`devDependencies` at their resolved versions. **`@pierre/trees@1.0.0-beta.6` is correct and current** —
`latest` *is* that beta; nothing to do, re-check quarterly. `material-icon-theme` is build-time-only
yet in `dependencies`, shipping 1.5 MB into the asar (already on the Phase 16 list, confirmed).

---

## 7. The prioritized Phase 16 plan

Ordered by **reader-pain-per-unit-of-risk**. Each step names how it would be proven
behaviour-preserving; where nothing covers it, that is stated as a prerequisite rather than glossed.

### DO NOT TOUCH — durability-critical, unless the change is provably behaviour-preserving

| Area | Files | Why |
|---|---|---|
| tmux control | `main/tmux/**` | Sessions live here; a wrong edit orphans live sessions |
| manifest | `main/manifest/**` (incl. `harvest/**`) | Source of truth for restore |
| restore | `main/restore/**` | Rebuilds the user's work after a quit |
| activity | `main/activity/**` | Status oracles; a wrong edit lies to the user about their agents |
| SpecStory wrap/resume | `main/specstory/wrap*`, the recorded-bin re-resolution in `restore/restore.ts` | A wrong edit means the conversation does not come back |
| session orchestration | `GmuxCore` **behaviour** | Move it, do not rewrite it (step 6) |

Anything landing in these areas runs the full battery **plus** `conformance:resume:capture`, per
CLAUDE.md. "Provably behaviour-preserving" here means: a pure file move with no edit to the moved
lines, a type-only deletion, or a change covered by a named existing test that is run before and
after. Nothing else qualifies.

### Coverage inventory (what exists to prove things with)

`npm run typecheck` · `npm run build` · `npm run test` (105 vitest files) · `smoke:t1` (create +
verify) · `smoke:t3` (claude and non-claude restore shapes) · `smoke:capture` · `smoke:identity` ·
`smoke:procid` · `conformance:resume:capture` (~16 s, no turns) · `conformance:resume` (~3 min, real
turns) · `npm run package` · `npm run shot` (screenshot).
**The gaps that shape this plan:** there is **no test for `renderer/state/store.ts`** (only `agents`,
`capture-wiring`, `rename-drag`, `split-tree` touch its neighbourhood), **no test for the preload
bridge**, **no test for `GmuxCore`**, and **no CSS regression harness** beyond before/after
screenshots from `npm run shot`.

### The order

**Step 0 — Two defect fixes that are not refactors. Land these first, on their own commit.**
- `manifest/store.ts`: add `this.db.pragma('busy_timeout = 5000')` with the comment from
  `symbols/persist.ts` (B2). *Proof:* `main/manifest/__tests__/*` (harvest, reconcile,
  resume-capture, specstory-capture) + `smoke:t3` + `conformance:resume:capture`. Durability-critical
  → Tier 3.
- Rename `.field`→`.filter-field` in `controls/filter-field.css` + `FilterField.tsx:46` and its
  pass-throughs (B3). *Proof:* `npm run shot` before/after on the New Project and ⌘T sheets — the
  padding **should** change, and that is the point; capture it deliberately. Tier 2.

**Step 1 — Type-only deletions in `shared/ipc.ts`. Highest pain, near-zero risk.**
Delete the five dead alias families (`Full*`, `Complete*`, `Depth*`, `Registry*`, `Branches*`) and the
14 orphan `Req`/`Res` pairs; drop the `export` keyword from the 42 internal-only exports.
*Proof:* `npm run typecheck` is a complete proof for type-only deletion — if a type is referenced,
compilation fails. Tier 1.

**Step 2 — Close guardrail 1 on the main side.** Delete `restore/ipc.ts:24-35` and import `handle`
from `typed-ipc`; convert the 21 raw `ipc.handle` calls; add `SymbolsEventPayloadMap` to
`AllEventPayloadMap`, retype `on<C extends AllEventChannel>`, and replace the seven raw preload
blocks (~60 lines deleted, seven channels newly type-checked).
*Proof:* `typecheck` proves the conversions (they only add checking); the seven event channels have
**no test** — `smoke:t1` + a targeted probe of each channel's consumer is the minimum, and
`restore/ipc.ts` rides `smoke:t3` because it is restore. Tier 2, except the restore file at Tier 3.

**Step 3 — Segregate the harness out of production bundles.** Move the eight CLI harnesses and
`runShot` out of `main/index.ts` into `main/harness/**` (a pure move); make the six renderer
`shot-probe`/`shot-hook` imports dynamic and dev/flag-gated so ~6,100 lines stop shipping.
*Proof:* the harnesses **are** the proof — every `smoke:*` and `conformance:*` script must still run,
which is exactly what they exercise. Then confirm `out/main/index.js` no longer contains
`GMUX-T3-MARKER` and `out/renderer/assets/index-*.js` no longer contains `gmuxShotDrive`, and that
`npm run shot` still works with the flag on. Tier 2 (the harness is not user-facing, but a mistake
here silently disarms the T3 gate — verify the scripts, do not assume).

**Step 4 — Consolidate the two renderer git stores and the four `git:changed` subscribers** (L0, B4,
B5). One `onRepoChanged(repoPath, cb)` at 150 ms; delete `tree/git-status.ts`'s dormant fetcher and
make `statusFiles` required.
*Proof:* **no existing test covers this** — `scm/__tests__/{groups,freshness,selection}.test.ts` cover
derivation, not subscription. **This step needs a test first**: a subscription test asserting one
timer, one refresh per event, and unsubscribe on unmount. Then a Tier 2 probe: commit from a session
terminal and read one screenshot at ~200 ms to confirm the sidebar no longer contradicts itself.

**Step 5 — Introduce the command layer** (§1.5). `commands.ts`: id → `{ run, enabled }`, consumed by
the `App.tsx` keydown map, `runMenuAction`, and the context menus. Collapses ~430 lines of duplicated
dispatch in one file and closes the "keymap row and handler disagree" hole.
*Proof:* `keymap-single-source.test.ts` stays green, and this step **earns a new test that
`keymap.ts`'s ids and `commands.ts`'s ids are the same set** — that test is the reason to do the step
at all. Then a Tier 2 pass driving each ⌘ chord and its menu twin and asserting the same effect.

**Step 6 — Give session orchestration a folder** (L1). Move `class GmuxCore` verbatim from
`main/ipc.ts` to `main/sessions/core.ts`; move the popup-menu bridge to `main/menu-popup.ts`; leave
`main/ipc.ts` as the registrar it is named for. **Move only — no edit to the moved lines.**
*Proof:* it is durability-critical, so the bar is "pure move": review the diff for content changes
(`git diff -M --stat` should show a rename), then the full battery + `smoke:t3` +
`conformance:resume:capture`. Tier 3.

**Step 7 — `renderer/state/store.ts` into slices** (§2 #3). Extract the four non-state layers first
(native-menu vocabulary → `state/menu-types.ts`, `errorText`/`errorPayload` → `state/errors.ts`,
`loadLocal`/`saveLocal` → `state/local.ts`, bridge feature-detection → `state/bridge.ts`), then split
the eight state domains into composed slices, then break the `state/store.ts → app/split/pointer-drag`
cycle. Add the missing `state/index.ts` and `app/index.ts` barrels.
*Proof:* **the weakest-covered step in the plan** — 61 importers, 12 domains, and only four adjacent
tests. `typecheck` proves the moves resolve; it does not prove the store still behaves. Do the four
utility extractions first (pure moves, `typecheck` suffices), and gate the slice split on a Tier 2
screenshot sweep of every surface that reads `useApp` plus `smoke:t1`. If that feels thin, it is —
consider deferring the slice split until a store test exists.

**Step 8 — `app.css` colocation** (§2 #5). Move the 13 region blocks to colocated stylesheets beside
their components; keep `tokens.css` + a small global layer; kill the duplicate `.branch-header`
declaration and the twice-declared 36px header-band rule; pull `TREE_UNSAFE_CSS` out of
`FileTree.tsx` into a real stylesheet (it is shadow-DOM CSS, so it needs the string form — but it can
be its own module).
*Proof:* **no CSS regression harness exists.** `npm run shot` before/after is the only instrument;
cascade order changes when files move, so this step is riskier than it looks. Tier 2 with a
deliberate before/after screenshot set, and do it **after** step 0's `.field` fix so the two
padding changes are not confused.

**Step 9 — The rest of the boundary moves, cheapest first.** `main/tmux/errors.ts` → `main/errors.ts`
(L4, pure move, `typecheck`); `settings/specstory-*.ts` → `main/specstory/` (L2, pure move + the
barrel, `main/specstory/__tests__/*` + `smoke:capture`); `scm/graph-geometry.ts` +
`CommitGraph.tsx` → `scm/graph/` (L6, pure move, `scm/graph/__tests__/*`); delete the
`scm/open-file.ts` and `tree/open-file.ts` shims (G4 cleanup, `typecheck`); one `main/paths.ts`
`resourcesDir()` for the four packaged-path copies (**touches `tmux/resolve.ts` and
`specstory/resolve.ts` → full battery**); `attach-host.ts` to import `TMUX_SOCKET` instead of the
`'gmux'` literal (**durability-adjacent → `smoke:t3`**); the four keymap display-hint fixes
(`typecheck` + `keymap-single-source.test.ts`); extract `git/safety.ts` (the four validators are the
injection boundary — **they deserve their own test as part of the move**).

**Step 10 — Dead code and shipping weight.** Delete `uuid`/`@types/uuid` and the 29 dead symbols
(keeping `NON_REGISTRY_FLAG_PRESETS` and resolving the three test seams either way); add the four
phantom deps to `devDependencies`; move `material-icon-theme` to `devDependencies`; **turn
`electron-builder.yml`'s `files` into an allowlist** and reclaim the ~45 MB in §6.1; turn on renderer
`build.minify`.
*Proof:* `typecheck` for the deletions; the three `ManifestStore` members are durability-critical and
ride `smoke:t3` + `conformance:resume:capture`; **every packaging change gates on the packaged-app
smoke and `npm run package`, never on `out/`** — that is exactly why these survived fifteen phases.

**Step 11 — The remaining cohesion splits, if appetite remains.** `App.tsx` (after step 5 it is much
smaller), `HistorySection.tsx`, `ScmSection.tsx`, `FileTree.tsx`, `TerminalRegion.tsx` +
`SessionDock` + `SplitSurface` (extract `<EndSessionButton>` and the shared agent-option builder,
which kills three of the six exact clones). *Proof:* component-level; Tier 2 with screenshots.

**Deliberately NOT in Phase 16:** the Monaco swap (§6); splitting `main/git/service.ts`,
`agents/registry.ts`, `scm/depth.ts`, `manifest/store.ts`, `editor/store.ts` (§2.1 — cohesive);
merging `renderer/search`'s two surfaces (argued and documented); reorganizing the diagnostics
trio (L7 — real but low pain, and `proc/guarded.ts` has 11 importers).

---

## 8. What this survey could not determine

1. **Two of the four source surveys reached the synthesizer truncated.** Survey B's report was cut
   mid-B9, and Survey C's was cut mid-G6, and neither wrote a scratchpad file. **B's Tier-2/Tier-3
   sections and any guardrail C audited after G6 are therefore not represented here except where the
   synthesizer re-derived them directly** (G7 and G8 in §4 are the synthesizer's own verification,
   not C's). Surveys A and D are complete
   (`scratchpad/survey-a.md`, `scratchpad/survey-D-section.md`). If Phase 16 wants B's and C's tails,
   re-run those two surveys — they are cheap and read-only.
2. **Whether the B1 `stripAnsi` divergence bites any agent gmux actually launches.** The mechanism is
   proven; no agent in the 12-agent registry was observed emitting colon-SGR or OSC in `--version`
   output. Fix it anyway — the cost is a deletion.
3. **Whether the B2 `SQLITE_BUSY` window has ever fired in practice.** No log evidence was gathered;
   the reasoning is from the absent pragma and the presence of concurrent writers.
4. **Runtime cost of the four-subscriber `git:changed` fan-out.** The 150 ms disagreement window is
   derived from the four constants, not measured on a live repo. Step 4's Tier 2 probe should measure
   it before and after.
5. **Whether the ~6,100 harness lines cost anything at runtime beyond bundle size.** They ship and
   are statically imported; whether they execute or merely sit there was not traced.
6. **Whether the `renderer/settings` dual role (standalone window + selector library for 15
   main-window modules) is a boundary problem or a deliberate seam.** It is documented as deliberate;
   this survey did not test whether the main window pulls in settings-window-only code.
7. **CSS cascade risk in step 8.** Without a regression harness, "colocation changes nothing visible"
   is an assumption, not a measurement. Screenshots are a weak instrument for a 2,174-line move.
8. **Pierre `/edit` API stability going forward.** The recommendation rests on release notes eleven
   days old. Re-check on the next `@pierre/diffs` minor; the acceptance criteria in §6 are written so
   the re-check is mechanical.
