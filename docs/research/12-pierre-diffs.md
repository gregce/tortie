# gmux research 12 — Pierre diffs + trees: fit, swap plan, deletion inventory

**Dimension:** replacing gmux's diff viewing (Monaco diff editor) and file tree (react-arborist) with Pierre's open-source libraries (`@pierre/diffs`, `@pierre/trees`), and deleting everything that becomes unnecessary. Synthesized from the Pierre-library survey (Dimension 1) and the gmux surface inventory (Dimension 2); package/repo facts re-verified live against the npm registry and GitHub API on **2026-08-09**.

**Bottom line first:** both libraries fit. `@pierre/diffs` (stable 1.3.5) can replace **all** of gmux's diff *viewing* and is an upgrade on highlighting quality, word-level diffing, and large-file performance. `@pierre/trees` (1.0.0-beta.6 — beta caveat) covers every arborist feature gmux actually uses *plus* built-in VS Code-style git decorations we currently hand-roll. The one thing Pierre does not safely replace today is Monaco's **editing** role — Pierre's edit mode exists but is beta — so Phase 11 keeps Monaco for File-mode editing and the big Monaco deletion (~98 MB node_modules, ~43 MB of built assets) is deferred to a follow-on phase.

---

## 1. What Pierre actually ships (verified)

Monorepo: [github.com/pierrecomputer/pierre](https://github.com/pierrecomputer/pierre) — Apache-2.0, 5,970★, created 2025-09-19, last push **2026-08-10** (active daily). Packages: `diffs`, `trees`, `theme`, `theming`, `path-store`, `pipes`, `tree-test-data`. First-party agent-skill docs in [`skills/`](https://github.com/pierrecomputer/pierre/tree/main/skills) (`npx skills add pierrecomputer/pierre --skill diffs|trees`) are the best API reference.

| | [`@pierre/diffs`](https://www.npmjs.com/package/@pierre/diffs) | [`@pierre/trees`](https://www.npmjs.com/package/@pierre/trees) |
|---|---|---|
| Latest (verified vs registry 2026-08-09) | **1.3.5** (2026-08-07) — stable | **1.0.0-beta.6** (2026-07-25) — **beta** |
| License | Apache-2.0 | Apache-2.0 |
| Unpacked size | 6.9 MB | 1.46 MB |
| Weekly downloads | ~2.36 M | ~474 K |
| Entry points (verified) | `.`, `/react`, `/edit`, `/ssr`, `/worker` | `.`, `/react`, `/ssr`, `/web-components` |
| Deps | `diff@9`, `shiki ^3\|\|^4`, `lru_map`, `@pierre/theme`, `@pierre/theming`, `hast-util-to-html`, `@shikijs/transformers` | `preact@11-beta` (internal), `@pierre/theming`, `preact-render-to-string` |
| Peer deps | `react ^18.3.1 \|\| ^19`, `react-dom` (React entry) — gmux is React 19.2.8 ✓ | same ✓ |
| Docs | [diffs.com](https://diffs.com) | [trees.software](https://trees.software) |

**Naming traps — do not install:** `@pierre/precision-diffs` (pre-rename predecessor, stale) and `@pierre/file-tree` (abandoned 0.0.1-beta.1 experiment). The real packages are exactly `@pierre/diffs` and `@pierre/trees`. Transitive `@pierre/theme` (theme pack) and `@pierre/theming` (runtime theme controller, VS Code workbench-color normalization) come along and are useful for our theme bridge.

### `@pierre/diffs` capability summary
- **React components by input:** `MultiFileDiff` (old + new `FileContents` — diffs internally via `diff@9`), `PatchDiff` (unified patch string), `FileDiff` (pre-parsed metadata), `File` (single file), `UnresolvedFile` (conflict markers), `CodeView` (one scroll region, many files, virtualized). ([recipe-react.md](https://github.com/pierrecomputer/pierre/tree/main/skills/diffs/references))
- **Display:** `diffStyle: 'split' | 'stacked'`; inline diff granularity word / alternate-word / character / none; line numbers, wrapping, hunk separators, context expansion (`HunkExpansionRegion`), custom file headers/fonts.
- **Interaction:** line selection across sides, token hover, annotations framework (line comments / CI-style / arbitrary UI), accept/reject hunk controls. **Edit mode (`/edit`, `EditProvider`) is beta**: selection, auto-indent, undo, find-in-file, lint markers.
- **Highlighting:** Shiki (TextMate grammars — VS Code-fidelity, better than standalone Monaco's Monarch regex tokenizer), JS or WASM engine, optional worker pool (`/worker`), LRU-cached ASTs.
- **Performance:** virtualization-first (`Virtualizer`, `VirtualizedFileDiff`, `CodeView`); Pierre's engineering post claims Linux-kernel-scale patches render "nearly instantly" — public demo [diffshub.com](https://diffshub.com), write-up [pierre.computer/writing/on-rendering-diffs](https://pierre.computer/writing/on-rendering-diffs).
- **Rendering:** CSS Grid + Shadow DOM, pure browser — no Node APIs, no SSR requirement. No Electron blockers.
- **No git integration built in** — you supply contents or patches. Our `src/main/git/**` keeps that job unchanged.

### `@pierre/trees` capability summary
- Path-first **file** tree (state keyed by canonical path strings, dirs end `/`), shadow-root rendering. Vanilla model + `/react` (`<FileTree model={...}/>`, `useFileTree*` hooks).
- Model API: `add/move/remove/batch/resetPaths`, `getSelectedPaths/getFocusedPath/scrollToPath/focusPath`, `subscribe`/`onMutation`, search sessions, rename, drag-and-drop, context-menu trigger modes, `flattenEmptyDirectories`, `prepareFileTreeInput` for large lists. **Virtualization built into the model.**
- **Git decorations first-class:** `setGitStatus(entries)` / `applyGitStatusPatch(patch)` with `GitStatus = added|deleted|ignored|modified|renamed|untracked` and **automatic directory aggregation** (`changeCountByDirectoryPath`) — the parent-folder dirty-dot propagation gmux hand-rolls today comes free. `renderRowDecoration` gives a custom per-row lane alongside the built-in git lane.
- **Icons:** built-in sets (`minimal|standard|complete`, `colored`) or **custom SVG `spriteSheet`** injected into the shadow DOM with `byFileName`/`byFileExtension` mapping — our Phase 9 material-icon-theme subset is portable.
- **Theming:** host-level CSS custom properties (`--trees-fg-override`, `--trees-selected-bg-override`, `--trees-theme-*`), `themeToTreeStyles(theme)`, and an `unsafeCSS` escape hatch into the shadow root.

---

## 2. Fit verdicts

### 2.1 `@pierre/diffs` vs Monaco diff editor — **FIT (strong yes) for all diff viewing**

gmux's entire diff pipeline is "two full strings" (working model + `git:showHead` HEAD contents; there is **no** patch/hunk code anywhere — `src/shared/ipc.ts:59`, `src/main/git/service.ts:142-163`). `MultiFileDiff` consumes exactly that shape, so the existing IPC contract is already the right one. No main-process changes required.

| | Monaco diff (today) | `@pierre/diffs` |
|---|---|---|
| Inputs | two full strings (models) | two full strings (`MultiFileDiff`) — same; unified patches also supported (`PatchDiff`) if we ever want them |
| Word-level quality | intra-line char diff, good | word / alternate-word / **character**-level, configurable — parity or better |
| Syntax highlighting in diff | Monarch regex tokens | **Shiki/TextMate — VS Code-fidelity grammars, strictly better than standalone Monaco** |
| Side-by-side / inline | both (we auto-switch at 900px) | both (`split`/`stacked`) — keep the ResizeObserver switch |
| Perf on huge diffs | struggles on very large files | virtualization-first, proven at Linux-kernel scale ([diffshub.com](https://diffshub.com)) |
| Context expansion, hunk UI | limited | first-class (`HunkExpansionRegion`, accept/reject hunks, annotations) — headroom for future SCM features |
| **Editing inside the diff** | **yes — modified side is our shared writable model** | **no (display path); edit mode is beta** |
| Find widget (⌘F) inside diff | yes | find-in-file only in beta edit mode |
| Bundle | included in Monaco's 26 MB chunk | +6.9 MB unpacked (+ shiki), shadow-DOM CSS self-contained |

**What's lost:** the editable modified side. Today edits made in Diff mode *are* the buffer (shared `ITextModel`, `MonacoHost.tsx:2-8`). With Pierre, Diff mode becomes read-only and edits happen in File mode via the existing toggle. That's a real UX change (VS Code's inline SCM diff is editable), but it matches most review tools and gmux's dominant gesture is "glance at diff → maybe tweak → save", where the tweak can be one toggle away. Accept/reject-hunk controls partially compensate.

**What's gained:** better highlighting in diffs than Monaco offers, character-level inline diffs, virtualized giant-diff handling, hunk context expansion, an annotations hook for future agent/CI overlays, and a maintained library whose entire purpose is diff rendering.

### 2.2 `@pierre/trees` vs react-arborist — **FIT (yes, with beta caveat)**

gmux uses a *small* slice of arborist: virtualized list, controlled expand state, focus/keyboard, custom row renderer. DnD, rename, multi-select, inline edit are all **explicitly disabled** (`FileTree.tsx:386-389`). Every used feature has a direct `@pierre/trees` equivalent, and two things gmux hand-rolls come built in:

1. **Git decorations with directory aggregation** — `setGitStatus`/`applyGitStatusPatch` replaces our custom badge/tint/folder-dot rendering (`FileTree.tsx:115-194`) and the aggregation logic; our status source (SCM store feed / `git-status.ts`) maps 1:1 onto `GitStatusEntry {path, status}`.
2. **Virtualization without pixel plumbing** — arborist needs explicit width/height from a ResizeObserver hook (`FileTree.tsx:200-225,375-397`); Pierre's model virtualizes internally.

Our Phase 9 file icons (`src/renderer/icons/fileIcon.ts`, 257-icon material subset) port via the custom `spriteSheet` + `byFileName`/`byFileExtension` config. Row decorations we can't express in the built-in git lane (e.g., exact badge letters) go through `renderRowDecoration` or `unsafeCSS`.

**Caveats (why "yes, with caveat" and not "unqualified yes"):**
- **1.0.0-beta.6.** API may shift before 1.0. Mitigate: pin exact version, wrap all usage in one `PierreFileTree` component.
- **Lazy loading is ours to drive.** Pierre is path-first — you `add`/`batch` paths. Our on-expand `fs:readDir` flow (`tree/store.ts:105-126`) keeps working (feed newly listed paths via `batch`), but expand-triggered listing + per-dir cache stays our code. Verify during implementation that a directory can render as expandable before its children are added.
- **Expansion-state persistence** (localStorage per project root) must be re-plumbed onto Pierre's model events (`subscribe`/`onMutation`) — arborist's `initialOpenState`/`openState` has no verbatim twin; confirm the exact expanded-paths read/write API during the spike.
- **Shadow DOM**: `tree.css` styling won't cascade in; restyle via `--trees-*` vars / `themeToTreeStyles` / `unsafeCSS`.

### 2.3 The editing question — **Pierre is NOT display-only, but its edit mode is beta → keep Monaco for editing in Phase 11**

`@pierre/diffs/edit` (`EditProvider`) exists — selection, auto-indent, undo, find, lint markers — but is explicitly beta. gmux's editing surface (save pipeline, dirty tracking, external-change reload, per-file view state, 5 language workers) is the app's core "tweak and save" loop; betting it on a beta surface is the one genuinely risky part of "delete Monaco". **Recommendation: Phase 11 swaps diff viewing and the tree only; Monaco remains the File-mode editor.** Named alternative for the follow-on phase (Phase 12, "delete Monaco"): `@pierre/diffs/edit` once it leaves beta, or **CodeMirror 6** (~150-300 KB, `@codemirror/merge` not needed since Pierre owns diffs — see research 07 §1.2). Until then the 98 MB Monaco dep and 26 MB `monaco-impl` chunk stay; that deletion is deferred, not lost.

---

## 3. THE SWAP PLAN (Phase 11 spec)

### Packages
- **In:** `@pierre/diffs@1.3.5` (exact), `@pierre/trees@1.0.0-beta.6` (exact pin). Transitives `@pierre/theme`/`@pierre/theming` arrive automatically; use `@pierre/theming` directly for the theme bridge.
- **Out:** `react-arborist` (^3.16.0).
- **Unchanged:** `monaco-editor` (File-mode editing), all `@xterm/*`, `material-icon-theme` (icon generation source).

### Step order
1. **Theme bridge (do first — everything renders through it).** Build a small module that produces a Shiki/VS Code-format theme object from gmux's CSS custom-property tokens (or adopt a stock Shiki theme pair and map only our diff add/del/modified colors). Feed it to `@pierre/diffs` as `ThemesType` (light/dark, mode `system|light|dark`) and to the tree via `themeToTreeStyles` + `--trees-*` host overrides. Shadow DOM means page-level CSS vars do **not** cascade in — this bridge is the only theming path.
2. **`PierreDiff` component** (new, `src/renderer/editor/PierreDiff.tsx`): wraps `MultiFileDiff` with old = HEAD contents (existing `loadHead` / `git:showHead` — **IPC unchanged**), new = working model text (`getWorkingModel(path).getValue()`, subscribed to `onDidChangeContent` so unsaved edits show live in the diff). `diffStyle` driven by the existing ≥900 px ResizeObserver rule; word-level inline diffs on; read-only.
3. **Rewire `MonacoHost`/`EditorPanel`:** delete the `createDiffEditor` half of `MonacoHost` (`MonacoHost.tsx:130-154, 205-215, 230-241`); mode `'diff'` now renders `PierreDiff`, mode `'file'` renders the (kept) Monaco code editor. The Diff | File segmented control, diff-by-default open rules, `canDiff` growth, HEAD refresh on `git:changed` (`store.ts:160-236`) all survive verbatim — only the renderer behind mode `'diff'` changes. HEAD strings move from Monaco `headModels` to plain component state/props (delete the registry, `monaco-loader.ts:47-48,71-85`).
4. **`PierreFileTree` component** (rewrite of `src/renderer/tree/FileTree.tsx`): `new FileTree(options)` model + `/react` component. Feed lazy `fs:readDir` results via `batch`; wire `setGitStatus`/`applyGitStatusPatch` from the SCM store feed (drop hand-rolled aggregation); port Enter/arrow behavior onto `focusPath`/model events; context menu via Pierre's trigger modes calling the existing `fs-bridge.ts` actions; icons via custom `spriteSheet` from the Phase 9 generated subset; expansion persistence re-plumbed onto `subscribe`. `openModeFor` and the open-file bus are untouched.
5. **IPC: unchanged.** No new channels; `git:showHead`, `fs:readDir`, `fs:readFile/writeFile`, `git:changed` all keep their exact roles. (A unified-patch `git:diff` channel is *not* needed — `MultiFileDiff` diffs contents client-side, same as Monaco did. Optional future: `PatchDiff` for multi-file review views.)
6. **Screenshot harness:** swap the `.monaco-editor` readiness selector in `shot-hook.ts:134-138` for the Pierre diff host element (diff mode) while keeping the Monaco selector for file mode.
7. **CSS cleanup:** delete diff theme keys from `monaco-impl.ts:120-128`, prune `tree.css` to the host-container shell, delete arborist-specific rules.
8. Optional hardening: move Shiki highlighting to `@pierre/diffs/worker` if main-thread highlight cost shows up on large files.

### Coordination note
A parallel workflow is actively rewriting `src/renderer/app` + `src/renderer/scm`. The swap touches `App.tsx` (mount, menu) and consumes the SCM status feed — sequence Phase 11 after that lands, and treat `Sidebar.tsx:390-392` / `ScmSection.tsx:640-661` wiring points as owned by that workflow.

### Risk list
| Risk | Severity | Mitigation |
|---|---|---|
| `@pierre/trees` beta API drift | Med | Pin exact; single wrapper component; re-check on bump |
| Diff mode becomes read-only (UX change) | Med | File-mode one toggle away; revisit with Pierre edit mode post-beta |
| Shadow DOM theming mismatch with gmux tokens | Med | Theme bridge first; `unsafeCSS`/`--trees-*` escape hatches |
| Lazy-load + expand-persistence mapping onto path-first model | Med | Spike step 4 early; `prepareFileTreeInput` for big dirs |
| Live diff refresh while agent edits (model → Pierre re-render perf) | Low-Med | Debounce `onDidChangeContent`; Pierre virtualizes; worker pool if needed |
| Two highlighters shipped (Shiki for diffs, Monarch for File mode) — slight visual inconsistency between modes | Low | Accept for Phase 11; resolves when Monaco goes in Phase 12 |
| Bundle grows before it shrinks (+~8 MB Pierre/Shiki while Monaco stays) | Low | Known; Phase 12 recovers 26-43 MB |

---

## 4. DELETION INVENTORY

### Phase 11 (this swap)
| Deleted | What / where | LOC |
|---|---|---|
| dep `react-arborist` | package.json, 1.4 MB node_modules | — |
| `FileTree.tsx` arborist wiring | Tree/NodeApi usage, `useElementSize` pixel plumbing, custom row renderer, manual folder-dot logic | ~170 of 403 |
| `tree.css` row/badge styling | rows now render in Pierre's shadow DOM | ~150 of 199 |
| `decorations.ts` render-side logic | badge letter/tint/folder aggregation superseded by built-in git lane (keep `openModeFor` + status mapping + tests for it) | ~60 of 118 |
| `MonacoHost.tsx` diff half | `createDiffEditor`, options, model-pair wiring, responsive switch, dual mount divs | ~60 of 277 |
| `monaco-loader.ts` HEAD registry | `headModels`, `resetHeadModel` | ~20 of 131 |
| `monaco-impl.ts` diff theme keys | 8 diff color keys | ~9 of 133 |
| `editor/store.ts` + `EditorPanel.tsx` diff glue | model-registry diff calls, monacoError diff paths (mode toggle, loadHead, canDiff all KEPT) | ~35 |
| **Total deleted** | | **~505 LOC + react-arborist** |
| **Added** | `PierreDiff` (~120), `PierreFileTree` (~230), theme bridge (~80), shot-hook/selector + misc rewiring (~40) | **~470 LOC** |
| **Net** | | **≈ −35 to −100 app LOC; −1.4 MB dep out, +~8.4 MB deps in (diffs 6.9 MB + trees 1.46 MB unpacked, + shiki transitives); Monaco's 98 MB unchanged** |

Phase 11 is a *capability* trade (better diffs, free git decorations, less bespoke code to maintain), not a size win. Explicitly **not deletable** in Phase 11: `git:showHead` + `loadHead` (Pierre needs the HEAD string), the open-file bus, `tree/store.ts` lazy-fs cache, `git-status.ts`, `fs-bridge.ts`, `FilesSection.tsx` shell, all of `src/main/git/**`.

### Phase 12 (deferred: delete Monaco — the big prize)
Blocked on Pierre `/edit` leaving beta (or a CodeMirror 6 swap for File mode). When unblocked:
| Deleted | Size |
|---|---|
| dep `monaco-editor` | **98 MB node_modules** |
| Built assets: `monaco-impl-*.js` 26.0 MB + ts/css/html/json workers 17.4 MB + 224 KB CSS (verified in `out/renderer/assets/`) | **~43 MB of the app bundle** — the dominant non-Electron chunk in the 134 MB DMG |
| `monaco-impl.ts` (133) + `monaco-loader.ts` (131) + `MonacoHost.tsx` (remaining ~217) | **~480 LOC** |
| Kept even then | `EditorPanel.tsx` tabs/panel, `store.ts` tabs/LRU/save/dirty (re-pointed at the new editor), frozen IPC handlers (`fs:readFile/writeFile` stay registered per contract, `shared/ipc.ts:61-62`) |

---

## 5. Open questions for the user
1. **Side-by-side vs inline default:** keep today's responsive rule (split ≥900 px, stacked below), or make it a persisted user preference now that Pierre makes both first-class?
2. **Read-only diff acceptable?** Phase 11 makes Diff mode view-only (edit = toggle to File). OK as the v1 behavior, or is editable-diff a hard requirement (which forces waiting on Pierre edit-beta or keeping Monaco diff)?
3. **Diff word-level granularity:** `word`, `alternate word`, or `character`? (Recommend `word` to start.)
4. **Tree v2 features:** Pierre gives rename + drag-and-drop nearly free — enable them in Phase 11, or keep the v1 "no inline file ops" stance?
5. **Theme source:** build a bespoke Shiki theme from gmux tokens (exact brand match, more work) or adopt a stock VS Code theme pair and only override the add/del/modified colors?
6. **Staged-row diff semantics:** while touching open pathways, fix the documented v1 shortcut (staged rows diff worktree-vs-HEAD, not index-vs-HEAD — `open-file.ts:31-36`)? Would need a new `git:show :0:path` IPC channel; otherwise carry the shortcut forward.
7. **Phase 12 commitment:** when Pierre `/edit` stabilizes, is the intent Pierre-everywhere (one rendering stack) or Monaco-for-editing indefinitely?

---

### Key references
[pierrecomputer/pierre](https://github.com/pierrecomputer/pierre) · [@pierre/diffs on npm](https://www.npmjs.com/package/@pierre/diffs) · [@pierre/trees on npm](https://www.npmjs.com/package/@pierre/trees) · [diffs.com](https://diffs.com) · [trees.software](https://trees.software) · [diffshub.com](https://diffshub.com) · [On rendering diffs](https://pierre.computer/writing/on-rendering-diffs) · skill docs: [skills/diffs](https://github.com/pierrecomputer/pierre/tree/main/skills/diffs/references), [skills/trees](https://github.com/pierrecomputer/pierre/tree/main/skills/trees/references) · gmux inventory: research 07 (editor/tree survey), Dimension 2 report (2026-08-09 working tree)
