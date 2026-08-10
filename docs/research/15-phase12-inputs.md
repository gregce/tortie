# 15 — Phase 12 implementable inputs (consolidated)

Synthesis of the three Phase 12 research dimensions into one build-ready
document. Source reports, each of which stays authoritative for its own detail:

| Dim | Report | Covers BACKLOG items |
| --- | --- | --- |
| A | [`17-terminal-capture.md`](./17-terminal-capture.md) | 2 (capture) + the Copy-as-HTML half of 1 |
| B | [`15-historical-commit-diffs.md`](./15-historical-commit-diffs.md) | 4 (bug), input to 5 |
| C | [`16-markdown-preview-minimap-tabs.md`](./16-markdown-preview-minimap-tabs.md) | 6 (preview + minimap), 5 (tabs) |

**Filename note:** this doc is `15-phase12-inputs.md` as briefed; the number `15`
is already taken by `15-historical-commit-diffs.md`. They are different files.

**Not covered here:** BACKLOG items 3 (push/pull/remotes), 7 (empty state),
8 (image drag-drop). No research was commissioned for those.

### Verification status of this synthesis

Re-verified **live in this session (2026-08-10)**, not taken on trust:

- every npm package below — latest version, license, publish date, peer deps,
  dependency pinning — against `registry.npmjs.org`;
- installed tree versions (`@xterm/xterm` 6.0.0, `@pierre/diffs` 1.3.5
  **apache-2.0**, `monaco-editor` 0.56.0, `shiki` 4.4.3, `react` 19.2.8,
  `electron` 43.3.0) and the current `dependencies` block;
- every `file:line` cited in §B and the load-bearing ones in §A/§C, read
  read-only from `src/**` (no writes; another workflow's fixer may be editing).

Carried forward **unverified in this session** and marked `[A-measured]`,
`[B-verified]`, `[C-verified]` at point of use: the probe timings, pixel caps
and fidelity table from A (its evidence PNGs do exist —
`docs/research/assets/17-terminal-capture/P2-live-webgl.png` and
`P2-html-foreignobject.png`); B's and C's readings of `microsoft/vscode` source;
C's bundlephobia sizes and GitHub repo-health figures.

---

## 0. Cross-cutting integration points — read before splitting the work

Four places where two or three items collide. If parallel builders each land
their own version, the phase produces exactly the duplication the standing
guardrails forbid.

**1. `OpenFileRequest` is touched by BOTH item 4 and item 5.**
`src/renderer/state/open-file.ts` gains `commit?: {...}` (§B.6) *and*
`preview?: boolean` (§C.4). Both are optional, both keep every existing emitter
compiling, and all three emitters (`FileTree.tsx:321`, `ScmSection.tsx:529`,
`HistorySection.tsx:336`) are edited by both items. **Land the bus change once,
first**, as a shared prerequisite commit, then let 4 and 5 proceed.

**2. `ui:popupMenu` is a FLAT list, and three items want a menu.**
Verified: `PopupMenuItem` (`src/shared/ipc.ts:480-491`) has `id`, `label`,
`enabled`, `destructive`, `hint`, `type:'item'|'separator'` — **no `submenu`
field**, and `registerPopupMenuHandler` maps items 1:1. Item 1 (terminal menu),
item 2 (capture entries inside it) and item 5 (tab context menu) must all be
flat, and must share one builder helper rather than three copies.

**3. `resolvePaneTarget` must be promoted, not copied.** Verified:
`src/main/restore/snapshots.ts:53-61` holds a private `resolvePaneTarget()` and
its own doc comment (lines 49-51) already names the latent sibling bug:
*"tmux.capturePane('=name') has the same problem."* Capture (§A) is the second
caller. Promote it into `src/main/tmux/` and have both use it — guardrail 3.

**4. Every new IPC channel goes into the ONE map.** Guardrail 1: append to the
existing per-domain maps in `src/shared/ipc.ts`
(`GitDepthInvokeChannelMap` at line 600 already carries `git:commitDetail` at
line 616). No new "generation", no new superset alias, no new preload wrapper.

**Recommended build order** (each stage unblocks the next):

```
S0  bus prerequisite: OpenFileRequest += commit? , preview?      (shared)
S0  promote resolvePaneTarget into src/main/tmux/                (shared)
S0  add will-navigate guard to main/index.ts                     (§C.3, security)
S1  item 4 (diff bug)        ─┐   independent, main-side heavy
S1  item 1 + 2 (menu+capture)─┤   independent, renderer+main
S1  item 6 (md preview)      ─┘   independent, renderer only
S2  item 5 (tabs)                 consumes S0's preview? field; multi-file
                                  commit opening (§B.5) rides on it
```

---

## A. Terminal capture + Copy as HTML (items 2 and 1)

### RECOMMENDATION

**Build it. Three code paths, one new dependency, no new window, no new build
entry.**

| Need | Path | Cost |
| --- | --- | --- |
| Capture visible viewport | `webContents.capturePage(rect)`, rect = `.xterm-screen` bbox | 0 deps, ~6–13 ms `[A-measured]`, pixel-exact |
| Capture selection (on screen) | same, rect from `getSelectionPosition()` + measured cell metrics | 0 deps |
| Capture N lines beyond viewport | **`tmux capture-pane -e`** → off-screen `Terminal` → `serializeAsHTML({range})` → SVG `foreignObject` → canvas → PNG | 1 dep, ~200 LOC, ~183 ms for 300 lines `[A-measured]` |
| Copy as HTML (item 1) | `serializeAsHTML({onlySelection:true})` → `clipboard.write({text, html})` | same dep, ~20 LOC |

**The one design-changing finding: source beyond-viewport capture from tmux, not
from the xterm buffer.** BACKLOG item 2 assumes the xterm scrollback holds the
history. It does not. `attach-host.ts` uses `tmux attach-session`, which redraws
only the current screen, and `TerminalHost` disposes the `Terminal` for hidden
panes — so the renderer's 10k-line scrollback holds only bytes streamed since
*this* attach. Switch tabs and back: empty. The real history is tmux's
`history-limit 50000`. Sourcing from `capture-pane` also makes "capture this
session" work for unmounted and invisible sessions.

### Rationale

- **`capturePage` is already proven in this app** (the `GMUX_SHOT` harness at
  `src/main/index.ts:645,680`), captures the composited result (WebGL glyphs +
  DOM overlays + selection) by construction, and works on hidden windows
  `[A-measured]`. Nothing beats it for the viewport.
- **No HTML→image library is needed or even usable.** Under the WebGL renderer
  `.xterm-rows` is **null** and `.xterm-screen` innerHTML is 864 chars
  `[A-measured]` — a DOM snapshot captures an empty rectangle. (Precision:
  `html-to-image` does special-case `HTMLCanvasElement`→`toDataURL`, so it could
  accidentally grab the WebGL viewport — same undefined-buffer caveat as reading
  the canvas directly, and never any scrollback.) The HTML we generate is
  already fully inline-styled with a system font, so 35 LOC of
  `XMLSerializer → foreignObject → img.decode() → drawImage → toBlob` replaces
  the entire category. Verified untainted `[A-measured]`.
- **Do not read the WebGL canvas.** gmux calls `new WebglAddon()` →
  `preserveDrawingBuffer: false`. `toDataURL()` happened to return real pixels
  (Chromium lazy-clear) but that is spec-undefined, viewport-only, and misses
  the sibling `xterm-link-layer` canvas.
- **Do not use `webPreferences.offscreen: true`** — `webgl2 === false` and dpr
  forced to 1 `[A-measured]`.

### Exact packages

| Package | Version | License | Published | Verified today | Verdict |
| --- | --- | --- | --- | --- | --- |
| `@xterm/addon-serialize` | **0.14.0** | **MIT** | 2025-12-22 | ✅ latest, **no `peerDependencies`, zero runtime deps** | **ADOPT** — same release train as the installed `@xterm/xterm@6.0.0`; 205,802 B unpacked / ~16 KB shipped JS |
| `html-to-image` 1.11.13 · `modern-screenshot` 4.7.0 · `dom-to-image-more` 3.10.2 · `html2canvas` 1.4.1 | — | MIT | — | — | Reject — solve a problem we don't have; viewport-only at best |
| `satori` 0.29.0 | — | **MPL-2.0** | — | — | Reject — JSX objects only, fonts as ArrayBuffers only (no system fonts), flexbox subset, emits SVG needing resvg |
| `@xterm/addon-canvas` 0.7.0 | — | MIT | 2024-04-05 | — | Reject — peer `@xterm/xterm:^5.0.0`, absent from the 6.0 train, unmaintained |
| `@xterm/addon-image` 0.9.0 | — | MIT | — | — | Not applicable — *displays* SIXEL/iTerm images in the terminal; no export API |
| `terminal-screenshot` 1.1.0 | — | MIT | 2024-02-07 | — | Reject — ships puppeteer 21 inside Chromium |

Net: **+1 dependency, MIT, ~16 KB.**

### Implementation musts (each is a bug if skipped)

1. **`open()` the capture Terminal.** The palette comes from
   `_core._themeService`, which only exists after `open()`. A never-opened
   Terminal serializes gmux green `#6BC46D` as xterm-default `#4e9a06`
   `[A-measured]`. Open it into `position:absolute; left:-99999px` — **not**
   `display:none`, which also breaks font measurement. `await
   document.fonts.ready` first, as `TerminalPane` already does.
2. **Use `serializeAsHTML`, never `serialize`, for rendering.**
   `serialize({range})` reads `buffer.**normal**` and appends the whole alt
   buffer; in alt screen it returns the wrong content. `serializeAsHTML` reads
   `buffer.active`. If you must use `serialize()` (e.g. to seed a Terminal),
   pass `excludeAltBuffer:true, excludeModes:true`.
3. **Read cell metrics, never compute them.** Measured **7.5 × 18.5 CSS px** for
   Menlo 13 / lineHeight 1.25 — note `13 × 1.25 = 16.25 ≠ 18.5`. Take
   `screenEl.getBoundingClientRect().height / term.rows` (public DOM, no
   `_core`). Computing it produces a visibly squashed image.
4. **Fix the tmux call.** Verified in tree: `src/main/tmux/sessions.ts:218
   capturePane()` hardcodes `-J` (line 227) and passes
   `formatSessionTarget(target)` → `=name` (line 229). `-J` joins wrapped lines
   and destroys the wrapping a screenshot must reproduce → add a
   `{ join:false }` option to the **existing** helper (guardrail 3, do not fork
   it). `capture-pane -t '=name'` fails with `can't find pane: =name`
   `[A-measured]` — route through the promoted `resolvePaneTarget` (§0.3).
   Range: `-S -(N - rows)` with **no `-E`** (`-E -1` *excludes* the visible
   screen).
5. **Deliver bytes as `ArrayBuffer`, never a data URL.** A 2,000-line data URL
   measured 79 MB as a string (the PNG itself 47 MB) `[A-measured]`.
6. **Correct the ~1.5% horizontal drift** with
   `letterSpacing = cellW - naturalAdvance`, measuring `naturalAdvance` once via
   a canvas `measureText('M'.repeat(100)).width / 100` in the same font.

### Menu (flat — see §0.2)

```
Copy                    ⌘C        Paste ⌘V   Select All ⌘A
Copy as HTML                       ← includeGlobalBackground:false (black-on-white)
──────────
Capture Visible         ⇧⌘4       → clipboard (⌥ = save…)
Capture Selection                 → enabled only when hasSelection()
Capture Last 250 Lines            ┐ disabled when buffer.active.type === 'alternate'
Capture Last 1000 Lines           ┘
──────────
New Terminal · Split Terminal · Clear ⌘K
```

⌘C with a selection copies; **without a selection it must still send SIGINT** —
do not break ⌘C-as-interrupt (BACKLOG item 1's explicit constraint).

### Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **Powerline / Nerd-Font PUA (U+E0B0…) render as tofu** in HTML-path captures — xterm draws those itself via `customGlyphs`; no installed font has them | Medium, cosmetic | Documented limitation. Viewport capture is always pixel-exact, so only *scrollback* captures are affected. Fallback A (tall hidden window) exists if users complain |
| **Alt screen has no history** anywhere — tmux or xterm. "Last N lines" cannot exist for full-screen TUI agents (codex/ratatui) | High if unhandled | Detect `buffer.active.type === 'alternate'`, grey the two "Last N" items with a hint. Flat menu, so no submenu gymnastics |
| Size blowup: 2,000-row PNG measured 47 MB / ~468 MB canvas RAM `[A-measured]` | Medium | Cap the UI at 1,000 rows, warn past 500. Hard caps: hidden-window `capturePage` ~8,192 CSS px ≈ **442 rows** @dpr2 (16,000 → `UnknownVizError`); `foreignObject`→canvas ~65,535 device px ≈ **1,770 rows** |
| `img.decode()` rejects on malformed XHTML | Low | Wrap; fall back to viewport capture with a toast |
| Fidelity deltas: curly/dotted underlines flatten to plain; inverse hardcoded `#000 on #BFBFBF`; no cursor/selection/link overlay | Low | Correct-by-intent for a screenshot; document in DESIGN-SPEC |
| Clipboard clobbered silently | Low | Toast "Captured 250 lines → clipboard" |

**Fallbacks, if the Powerline gap ever matters:** (A) tall hidden
`BrowserWindow` with a real WebGL xterm — proven working and pixel-exact, but
needs a second renderer entry in `electron.vite.config.ts`, ~1 s per capture and
tiling past 442 rows; (B) scroll-and-stitch on the live pane — exact, zero deps,
but visibly scrolls the user's terminal and races live output.

---

## B. Historical commit diffs render incorrectly (item 4)

### RECOMMENDATION

**Add one read-only IPC channel (`git:commitFileDiff`) that returns the
parent→commit pair, give `EditorTab` a commit-aware identity, and make commit
tabs immutable. No new preload generation, no new superset type.**

### The defect, precisely (all line numbers re-verified in tree today)

> Opening a file from a historical commit renders **`HEAD:<path>` vs the working
> tree** — the identical pair you get clicking that file in Changes — because
> the commit SHA is dropped at the bus boundary and the editor store has exactly
> one loading path.

| # | File:line | What it does wrong |
| --- | --- | --- |
| 1 | `src/renderer/scm/HistorySection.tsx:329-345` | `openCommitFile(file)` takes **no `entry`** — it emits `requestOpenFile({repoPath, relPath, path, mode:'diff', source:'history'})`. No sha, no `origPath`, no `status`. Lines 331-334 additionally refuse to open `status === 'D'` at all (toast only) |
| 2 | `src/renderer/state/open-file.ts:17-36` | `OpenFileRequest` has no commit identity; `source` is documented *"Safe to ignore in v1"* |
| 3 | `src/renderer/editor/store.ts:240-295` | `openFromRequest` ignores `req.source`. Line 242 dedupes tabs by absolute path. **Line 293** `loadContents` → `fs.readFile` (working tree); **line 294** `loadHead` → `git:showHead` |
| 4 | `src/main/git/service.ts:148-164` | `showHeadBuffer` hard-codes `git show HEAD:<rel>` |
| 5 | `src/renderer/editor/PierreDiff.tsx:96-111` | `oldFile = tab.headContents` (HEAD), `newFile = workingText` (line 72) |

Observable: an unchanged-since-HEAD file shows "No changes"; a later-modified
file shows unrelated edits; an added file shows nothing; a deleted file never
opens; a renamed file diffs the new path against HEAD; a merge shows HEAD vs
worktree.

**The file list is already correct.** `commitDetail`
(`src/main/git/service.ts:434-489`) runs
`git show <sha> -z --name-status --format= --diff-merges=first-parent --`
(verified at lines 456-464), which is root-safe and first-parent-correct. Only
the content pair is wrong. Its one gap: **no explicit `-M`**, so a user with
`diff.renames=false` sees renames degrade to D+A `[B-verified live]`.

**Four latent hazards the fix must dodge:** `PierreDiff` reads
`getWorkingModel(tab.path)` (a commit tab keyed by path inherits the live
worktree buffer); `disposeModels(path)` on close would nuke the worktree tab's
model for the same path; `refreshRepoTabs` (`store.ts:162-213`) would overwrite
immutable commit content on every `git:changed`; `save()` (`store.ts:372-387`)
would write a historical blob to disk.

### VS Code semantics `[B-verified against current microsoft/vscode]`

`historyProvider.ts`: `historyItemParentId ?? getEmptyTree()` →
`toMultiFileDiffEditorUris(change, parentId, commitId)`. `uri.ts`: **ADDED** →
original `undefined`; **DELETED** → modified `undefined`; **RENAMED** → original
at `change.originalUri`. LEFT = first parent, RIGHT = the commit.
`@pierre/diffs` supports this directly — `DiffFileInput`
(`dist/types.d.ts:38-47`) allows `oldFile: null` or `newFile: null`, so **pass
`null`, not `''`**.

### Exact git plumbing `[B-verified live, git 2.50.1]`

| Need | Command | Behaviour |
| --- | --- | --- |
| First parent | `git rev-parse --verify --quiet <sha>^1` | full parent sha, exit 0; **empty + exit 1 on a root commit**; first parent on merges; accepts abbreviated shas |
| Left content | `git show <parent>:<oldPath>` | raw blob bytes |
| Right content | `git show <sha>:<newPath>` | raw blob bytes |
| Missing path | `git show <sha>:<nope>` | `fatal: path 'nope' does not exist in '<sha>'`, exit 128 |
| File list | `git show <sha> -z --name-status -M --format= --diff-merges=first-parent --` | root → `A` entries; merge → first-parent; rename → `R100\0old\0new\0` |

Traps:

- **Never `<root>^`** → `fatal: invalid object name`. Use `rev-parse ^1` and
  treat empty as "root commit".
- **`diff-tree -m --first-parent` is wrong for merges** — it emits the union of
  both parents' diffs (3 files where 1 changed). Only `--diff-merges=first-parent`
  is correct; plain `diff-tree` prints nothing for a merge and needs `--root`
  for a root commit. `git show` needs neither — prefer it.
- `<rev>:<path>` is **repo-top-level relative** (consistent with porcelain-v2 /
  name-status output).
- `git show <sha>:<dir>` prints a tree listing, not an error — only call it for
  blob paths.

### The change, file by file

**types** (`src/shared/types.ts`, append):

```ts
export interface GitCommitFileDiffInput {
  repoPath: string; sha: string; path: string;
  origPath?: string; status: GitCommitFileState;
}
export interface GitCommitFileDiff {
  sha: string; parentSha: string | null;
  oldPath: string | null;  newPath: string | null;
  oldContents: string | null; newContents: string | null;
  binary: boolean;
}
```

**ipc** (`src/shared/ipc.ts`): append `'git:commitFileDiff'` **into the existing
`GitDepthInvokeChannelMap`** (verified: line 600, `git:commitDetail` at line
616). It flows into `GmuxInvokeChannelMap` and `depth-ipc.ts`'s typed `handle()`
for free — no new superset alias, no new preload generation (guardrail 1). Plus
one line in `GmuxGitDepthExtras` (line 631) and one in the preload's `git`
object.

**main** (`src/main/git/depth-ipc.ts`): one handler beside `git:commitDetail`,
read-only, **no `deps.broadcast`**.

**service** (`src/main/git/service.ts`):

- **Generalize, don't add** (guardrail 3): `showHeadBuffer` →
  `showAtRefBuffer(ref, path)`; `showHeadBuffer` becomes a one-liner.
- **Widen the missing-path regex.** Verified at line 45: `MISSING_AT_HEAD_RE`'s
  `does not exist in` arm requires a literal `'?HEAD'?` after it, so it will
  **not** match `fatal: path 'x' does not exist in '<sha>'` and the null-side
  case would throw. Replace with a rev-agnostic
  `MISSING_IN_REV_RE = /does not exist in|exists on disk, but not in|invalid object name|unknown revision|bad revision/i`.
- Add `firstParent(sha)` and `commitFileDiff(input)`. **A `null` buffer is the
  authority on which side exists** — the caller's `status`/`origPath` is only a
  hint, so a stale status letter degrades to a correct add/delete rather than a
  wrong diff. `parentSha === null` collapses the left side; **no `4b825dc6…`
  empty-tree constant** (wrong under SHA-256).
- `binary = buf.subarray(0,8000).includes(0)` (git's own heuristic) — a genuine
  improvement over the worktree path, which renders binary bytes as mojibake.
- **One-line robustness fix:** add `-M` to `commitDetail`'s `showArgs`
  (lines 456-464), so rename pairing does not depend on the user's
  `diff.renames`. Both `--name-status` and `--numstat` go through it, so
  `mergeCommitFiles` keys stay aligned.

**renderer:**

- `open-file.ts`: one optional `commit?: {sha, shortSha, status, origPath?}`
  (see §0.1 — coordinate with item 5's `preview?`).
- `HistorySection.tsx`: thread `entry` into `openCommitFile`, **drop the
  `status === 'D'` early return**, pass the commit block. Three call sites need
  the entry: line ~526 (Enter → `entryBySha.get(current.sha)`), line ~646 (file
  row click, `entry` in scope), and `openChanges` (line 347-359). Update the
  stale file header comment (lines 16-19).
- `store.ts`: **`EditorTab` gains `id`** (`${sha}:${relPath}` for commit tabs,
  `path` otherwise) and every path-keyed operation switches to it —
  `activePath`, `patchTab`, `activate`, `closeTab`, `forceCloseTab`, `cycleTab`,
  `setMode`, `pin`, `markDirty`, `activeTab`, and the dedupe at line 242. **Key
  the Monaco model registry and view-state maps by `id` too**
  (`monaco-loader.ts`, `MonacoHost.tsx:100,105,121,131,136,140,154`) — this is
  what stops a commit tab from sharing or disposing the worktree tab's buffer.
  Commit tabs: forced `mode:'diff'`, `canDiff:true`, never preview-reuse a dirty
  tab, `setMode(…,'file')` is a no-op, `save()` returns early, and
  `refreshRepoTabs` filters them out. Load via feature-detected
  `gmux.git.commitFileDiff?.(…)` (older preload → toast, same discipline as
  `depth.ts:396`).
- `PierreDiff.tsx`: **skip the Monaco-model subscription entirely** for commit
  tabs (lines 50-72); pass `null` for an absent side; `oldFile.name =
  tab.commit.origPath ?? tab.name` so renames read `old → new`; cache keys
  `${sha}^:${oldPath}` / `${sha}:${newPath}`; replace the hard-wired "vs HEAD"
  copy (lines 134, 141-143) with "Changes in `<shortSha>`"; render a
  "Binary file not shown" state when `binary`.
- `EditorPanel.tsx`: hide `ModeToggle` for commit tabs (line 401), show a
  `shortSha` chip, key the tab list by `tab.id` not `tab.path` (line 395).

### Multi-file commits (feeds item 5)

`openChanges` (`HistorySection.tsx:347-359`) opens only `detail.files[0]` —
verified. Looping it today still leaves one tab, because `openFromRequest`
reuses the single preview tab and `MAX_TABS = 5` LRU-evicts. So whole-commit
opening is genuinely **blocked on item 5's tab model**. Two coherent endpoints:
N accumulating pinned tabs (the BACKLOG text), or — closer to VS Code and
cheaper — **one commit tab stacking a `FileDiff` per changed file**, which
sidesteps tab explosion entirely. Item 4's per-file correctness is independently
shippable either way.

### Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Tab identity re-key (`path` → `id`) touches ~10 store actions plus two Monaco registries | **High — the biggest blast radius in Phase 12** | Land it as its own commit with the existing tab tests green before adding commit tabs. It is also exactly the refactor item 5 needs |
| `MISSING_AT_HEAD_RE` not widened → null-side cases throw instead of rendering add/delete | High if missed | Covered by the add/delete/root rows of the test matrix |
| Commit tab leaks into `save()` / `refreshRepoTabs` → historical blob written to disk or clobbered | High | Guard both; assert in tests |
| `${repoPath}/${relPath}` in the renderer is only right when the project folder *is* the git top level | Low | **Pre-existing**, out of scope — do not "fix" it here |

### Test matrix

Main-side, `src/main/git/__tests__/depth.integration.test.ts`, reusing
`harness.ts` (it isolates `GIT_CONFIG_GLOBAL/SYSTEM`): modify · add · delete ·
rename · **rename with `diff.renames=false`** (proves the `-M` fix) · **root
commit** (`parentSha: null`, must not throw on `<root>^`) · **merge commit**
(first-parent pair) · binary · path absent in that commit (null side, no throw)
· bad sha / bad path (`INVALID_INPUT`).

Operator acceptance: hunks match `git show <sha> -- <path>`; added file all
green; **deleted file opens at all** and is all red; renamed file shows the old
path on the left; the same path from two different commits gives two tabs; a
worktree tab's unsaved edits survive opening and closing a commit tab for the
same path.

---

## C. Markdown preview + minimap + editor tabs (items 6 and 5)

### RECOMMENDATION — markdown preview

**`react-markdown` + `remark-gfm` + `rehype-raw` + `rehype-sanitize`, with code
fences highlighted by the Shiki highlighter gmux ALREADY OWNS via
`@pierre/diffs`.** Serve relative images through a new `gmux-asset:` privileged
protocol. Never produce an HTML string.

The headline finding: **`@pierre/diffs@1.3.5` re-exports the shared Shiki
highlighter** (`getSharedHighlighter`, `getHighlighterIfLoaded`,
`preloadHighlighter`, `codeToHtml`, `getFiletypeFromFileName`). Reading
`dist/highlighter/shared_highlighter.js`: it is a module singleton that
*attaches* langs and themes incrementally on every call. So

```ts
const hl = await getSharedHighlighter({ themes: [GMUX_THEME_NAME], langs });
```

gives markdown fences **the same engine and the same registered gmux-dark theme
as the diff viewer** — zero new highlighter, zero new theme registration, zero
drift between "code in a diff" and "code in a README". Verified in tree today:
`shiki@4.4.3` MIT is installed; `@shikijs/rehype@4.4.3` pins `"shiki": "4.4.3"`
**exactly**, so it dedupes to that copy, and its `./core` export exists. Engine
is `shiki-js` (no oniguruma WASM); Shiki's own compat report (2026-07-31) puts
237/238 grammars working, only `ahk2` failing. Language chunks are already
code-split (419 in `out/renderer/assets`, incl. `markdown-*.js`).

### Exact packages (all re-verified on the registry today)

| Package | Version | License | Published | Size (min/gzip) `[C]` | Why |
| --- | --- | --- | --- | --- | --- |
| `react-markdown` | **10.1.0** | MIT | 2025-03-07 | 111 / 33 KB | mdast→React elements, **never an HTML string** |
| `remark-gfm` | **4.0.1** | MIT | 2025-02-10 | 30 / 10 KB | tables, task lists, strikethrough, autolinks, **footnotes** (via `mdast-util-gfm-footnote`, no extra plugin) |
| `rehype-sanitize` | **6.0.0** | MIT | 2023-08-26 | 8 / 3 KB | tree-level allowlist, no DOM round-trip |
| `rehype-raw` | **7.0.0** | MIT | 2023-08-26 | 188 / 59 KB | raw HTML in READMEs (badges, `<p align=center>`, `<details>`) — 56% of the weight, see risk table |
| `@shikijs/rehype` | **4.4.3** | MIT | **2026-08-10** (today) | ~5 KB | `/core` exports a **sync** `rehypeShikiFromHighlighter(highlighter, opts)` accepting `DiffsHighlighter` directly |

Peer deps verified: only `react-markdown` has any (`react >=18`,
`@types/react >=18`) — satisfied by the installed React 19.2.8.

**Total ~340 KB min / ~105 KB gzip**, against a `monaco-impl` chunk that is
**25 MB** today. Noise.

Optional, defer: `remark-frontmatter@5.0.0` (MIT) if leading YAML renders as
`<hr>` + text; `remark-math` + `rehype-katex` — **defer**, KaTeX pulls fonts and
breaks `font-src 'self'`.

**Not recommended:** `rehype-slug` / `rehype-autolink-headings` — react-markdown
passes the hast `node` to every component (`passNode: true`), so heading ids are
~15 lines with an id scheme we control (`md-<slug>`) instead of sanitize's
`user-content-` clobber prefix. **Avoid DOMPurify** — `MPL-2.0 OR Apache-2.0`,
and it only exists transitively via Monaco (as does `marked`); both vanish the
day Monaco is deleted.

### Why react-markdown over markdown-it 15.0.0 / marked 18.0.9

1. **No HTML string ever exists** → no `dangerouslySetInnerHTML` in a renderer
   that has a preload bridge to the filesystem and tmux. Sanitization becomes
   defence in depth rather than the only wall.
2. All five overrides item 6 needs (`a`, `img`, `input`, `h1..h6`, `table`) are
   one-liners in `components`; in markdown-it they are renderer-rule surgery.
3. hast is the same currency Shiki speaks — no serialize/reparse round trip.

**Honest counter-argument, recorded:** react-markdown's last release is
2025-03-07 and last commit 2025-04-21 — frozen, not abandoned (15.8k★, 5 open
issues) `[C-verified]`; markdown-it and marked both shipped within the last two
weeks. Mitigation: isolate behind one `MarkdownPreview.tsx` module; nothing else
in gmux imports it.

### Two silent-failure traps — both are bugs with NO error message

Verified against `hast-util-sanitize@5.0.2/lib/schema.js` `[C-verified]`:

1. **Plugin order must be `rehypeRaw → rehypeSanitize → rehypeShikiFromHighlighter`.**
   `style` is **not** in the default `'*'` attribute allowlist. Highlight before
   sanitize and every fence renders monochrome, silently. Highlight after and
   the styles survive because we generated them. (`code[className=/^language-./]`
   *does* survive the default schema — the source even comments on it.)
2. **`protocols.src` defaults to `['http','https']`** → every local image is
   stripped unless `gmux-asset` is added to the schema.

Encode **both** in a unit test: assert a `style` attribute survives, and assert
an `img[src^=gmux-asset]` survives.

Third: **`lazy` must stay `false`** in the Shiki options (its own doc comment:
enabling it *"requires the unified pipeline to be async"*, and `<Markdown>` is
synchronous). Satisfy it by **scan-then-render**: regex the source for fence
infostrings, `await getSharedHighlighter({themes, langs})` once per file open,
then render synchronously. `MarkdownHooks` with `lazy:true` is the escape hatch,
not the default — it paints a fallback first.

### Relative images: a protocol, not IPC

`fs:readFile` (`src/main/fs/ipc.ts:130`) is UTF-8-text-and-capped — it cannot
serve a PNG, and base64 data URIs for README screenshots are a memory disaster.
Register a privileged scheme in main (`registerSchemesAsPrivileged` +
`protocol.handle` + `net.fetch(pathToFileURL(...))`), scoped to **registered
project roots only**, with the `path.relative` escape guard. Pattern taken from
the Electron **v43.3.0** docs — the exact version installed (verified).

**Required CSP edit**, one line in `src/renderer/index.html` (current value
verified at line 8: `img-src 'self' data:`):

```
img-src 'self' data: gmux-asset:;
```

**Remote `https:` images stay blocked deliberately** — a badge is the exact
shape of a tracking pixel, and gmux opens arbitrary checked-out repositories.
Render an inline "remote image blocked" chip via `img`'s `onError`; a
per-project opt-in can come later. No CSP change is needed for Shiki's inline
`style` attributes — `style-src` already carries `'unsafe-inline'` and
`style-src-attr` falls back to it.

### Two hardening gaps found in existing code (report, don't defer)

1. **No `will-navigate` guard.** Verified: `src/main/index.ts:131` has
   `setWindowOpenHandler`, and a repo-wide grep for `will-navigate` returns
   **nothing**. `setWindowOpenHandler` only covers `window.open` /
   `target=_blank`. Rendering user-authored markdown makes a plain
   `<a href="https://…">` click able to navigate the *renderer itself* away from
   the app — the window becomes a browser and **every terminal attachment
   dies**. This must land with item 6 (it is in the §0 S0 stage above).
2. **External links need no new IPC.** Renderer-side
   `window.open(href,'_blank','noopener')` already routes through the existing
   handler with scheme validation in main. Zero new surface, guardrail 1 clean.

### RECOMMENDATION — minimap

**Phase 12 ships the Monaco built-in only, behind a `minimapEnabled` flag, plus
a `MinimapSource` adapter interface written into the module header. That
interface is the answer to the deferred-Monaco-deletion question.**

- Confirmed: `IEditorMinimapOptions` at `monaco-editor@0.56.0/monaco.d.ts:4787`;
  gmux hard-codes `minimap: { enabled: false }` at
  `src/renderer/editor/MonacoHost.tsx:34` (verified in tree). Toggling is
  `editor.updateOptions()` — **no re-create, no model churn, no scroll loss**.
- **Themeable, and mostly already correct:** `minimap.background` falls back to
  `#131417` ✅ and `minimap.selectionHighlight` inherits `#4D9DE84D` ✅, but
  `minimapSlider.*` derives to ~α.30 and is **too faint**. The source report
  gives 8 explicit token-derived hex values to add to `GMUX_MONACO_THEME`.
- **There is no `minimapGutter.*` in standalone Monaco** — the git added/
  modified/deleted stripes are a VS Code *workbench* contribution (whole `esm/`
  tree grepped). **Do not promise them.**
- Recommended defaults: `renderCharacters:true`, `showSlider:'always'` (gmux is
  a supervision tool — hidden affordances are worse), `size:'proportional'`,
  `maxColumn:100`, `autohide:'none'`, default **off**. Auto-disable below ~560px
  pane width (same reflex as `SIDE_BY_SIDE_MIN_PX`); at `MIN_DRAG_PX` 320px a
  120-column minimap eats a third of the pane.
- **Scope the acceptance criterion.** "ALL files get a minimap" is not
  achievable: `@pierre/diffs` has **zero** occurrences of `minimap` or
  `overviewRuler` in `dist` `[C-verified]`, so Diff mode can never have one, and
  a character minimap over rendered prose is meaningless. Read it as **"every
  *text-editing* surface"**, and give preview its own **heading overview ruler**
  instead (§ below).
- **Reject `@replit/codemirror-minimap`** (0.5.2, MIT, published 2023-12-12,
  last commit 2024-01-16; open bugs for line wrapping and inline widgets). An
  npm search found **no generic DOM/text minimap package** — every hit is
  editor- or graph-bound. If Monaco goes, the replacement is a **custom canvas
  minimap fed by Shiki's `codeToTokens`**: ~180 LOC, zero dependencies,
  theme-correct by construction, surface-agnostic. It slots in behind the same
  `minimapEnabled` flag with **no call-site changes**.

```ts
interface MinimapSource {
  text(): string; lang(): string;
  scroll(): { top: number; height: number; viewport: number };
  scrollTo(top: number): void;
  onChange(cb: () => void): () => void;
}
```

### Preview-pane scroll indicator — the load-bearing detail

A heading overview ruler, not a character minimap: a 12px strip with a tick per
heading (width 10/7/4px, opacity 1.0/.7/.45 for depth 1/2/3+), a viewport rect
floored at 4% so it stays grabbable, click-to-jump and drag with pointer
capture, and `role="scrollbar"` **or** `aria-hidden` with the native scrollbar
left visible — never a bare div as the only way to navigate.

**The one that bites: re-measure on late layout.** Rendered markdown changes
height *after* first paint — images decode, fonts settle, `<details>` toggles.
Without a `ResizeObserver` on the content root **plus** a per-image
`decode().then(remeasure)`, both coalesced into one `requestAnimationFrame`
pass, every tick is wrong on any README with a screenshot.

Scroll-sync with the source pane comes free: `passNode: true` (verified in
`react-markdown/lib/index.js:355`) means every component can read
`node.position.start.line` → set `data-line`, map both directions, guard with an
`isSyncing` flag.

Mode set for `.md` tabs becomes `Preview | Source | Split` alongside the
existing `Diff | File` radiogroup; `EditorMode = 'diff'|'file'|'preview'|'split'`;
`preview` is the default for clean `.md`, `diff` still wins for `.md` with
tracked changes. **The preview must not import Monaco** — it reads
`tab.savedContents`; only `split` subscribes to the working model, through the
existing `getWorkingModel()` accessor, so the dependency is one-directional and
dies cleanly with Monaco.

### RECOMMENDATION — editor tabs (item 5)

**The tab store is already ~80% right. The bug is in the bus, and it is one
field.**

Already present and verified in `store.ts` / `EditorPanel.tsx`: multi-tab array,
`preview` italic, preview-reuse, promote-on-edit, promote-on-double-click, dirty
dot, `MAX_TABS=5` LRU excluding dirty, ⌘W, ⌘⇧]/[, middle-click close, per-tab
Monaco view-state, horizontally scrollable strip.

**Why files appear to "replace":** `OpenFileRequest` has **no `preview` field**
(verified — the interface is `repoPath, relPath, path, mode, source`), and all
three emitters fire on single click, so the preview tab recycles forever.

The six deltas:

1. **`preview?: boolean` on `OpenFileRequest`** (default `true`); tree / SCM /
   history rows emit `preview:false` on **double-click** and **Enter**. One
   field, three call sites — see §0.1, this is the same edit item 4 makes.
2. **Bind ⌘⌥← / ⌘⌥→** as primary cycle keys, keeping ⌘⇧[ / ⌘⇧] as secondaries.
   `cycleTab(delta)` already exists; `lastUsed` is already on the tab so ⌃Tab
   MRU is a sort, not new state.
3. **Raise `MAX_TABS`** to 10 (VS Code's opt-in limit; its shipped default is
   unlimited), same dirty-excluding LRU. Add `scrollIntoView` on the active tab —
   today ⌘⌥→ can focus a tab that is scrolled out of sight.
4. **Tab context menu** through `ui:popupMenu` — Close · Close Others · Close to
   the Right · Close Saved · Close All · Keep Open · Copy Path · Reveal in
   Finder. **Share the flat-menu plumbing with item 1** (§0.2).
5. **Three-way dirty-close dialog.** `closeTab` currently raises a 2-button
   destructive confirm that can only lose work; VS Code offers **Save / Don't
   Save / Cancel**, and `save()` already exists.
6. **Defer sticky pins.** With a 10-tab dirty-excluding LRU the pin's main job is
   covered. **Keep the vocabulary straight in code** — *preview* (italic, one at
   a time, promoted by ⌘K Enter) and *sticky* (pin glyph, moves left, survives
   Close All, ⌘K ⇧Enter) are two different things that the BACKLOG phrase
   "preview-vs-pinned" conflates `[C-verified from VS Code source]`.

"Applies to both file and diff views" already holds — `mode` lives on the tab.
Two pre-existing nits the builder will stand on: `.ed-tabs` is `height:32px`
while DESIGN-SPEC S5 says 36px; and check `app/split/surface-dnd.ts` before
writing a third drag-reorder implementation (Phase 14's dup-scan already flags
that file for self-duplication).

### Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Shiki-before-sanitize → every fence monochrome, **silently** | **High if made** | Unit test asserting a `style` attribute survives the pipeline |
| `gmux-asset` missing from `protocols.src` → every image stripped, **silently** | **High if made** | Same test file: assert `img[src^=gmux-asset]` survives |
| **No `will-navigate` guard** → a link click kills every terminal | **High** | Ship the guard with item 6 (S0 stage) |
| CSP not amended → images 404 with a console CSP error | Medium | Ship the `index.html` edit in the same commit |
| `rehype-raw` is 59 KB gzip, 56% of the stack | Low | Lazy chunk (`markdown-impl.ts`, mirroring `monaco-loader.ts`); fallback is `skipHtml:true`, **not** the default literal-text rendering, which looks broken |
| react-markdown quiet since 2025-04 | Medium | Frozen API; isolate behind one module |
| **~30 new remark/rehype/micromark packages** worsen the Phase 14 item *"electron-builder `files` should become an allowlist"* — that item already names `micromark-util-*` and `unist-*` as shipping strays | Medium | **Flag, do not fix here.** Reinforces the Phase 14 case; the denylist will need new entries in the meantime |
| Item 5's tab work collides with item 4's `path`→`id` re-key | Medium | Sequence them: §B's re-key first, then item 5 builds on `id` |

---

## Consolidated new dependencies

| Package | Version | License | Peer deps | Item |
| --- | --- | --- | --- | --- |
| `@xterm/addon-serialize` | 0.14.0 | MIT | **none** | 1, 2 |
| `react-markdown` | 10.1.0 | MIT | `react >=18`, `@types/react >=18` | 6 |
| `remark-gfm` | 4.0.1 | MIT | none | 6 |
| `rehype-raw` | 7.0.0 | MIT | none | 6 |
| `rehype-sanitize` | 6.0.0 | MIT | none | 6 |
| `@shikijs/rehype` | 4.4.3 | MIT | none (pins `shiki@4.4.3` exactly → dedupes to the installed copy) | 6 |

**Six packages, all MIT, ~356 KB minified / ~121 KB gzipped total.** No new
Electron windows, no new renderer entry points, no new preload generation. All
versions, licenses, publish dates and peer/dependency fields re-verified against
`registry.npmjs.org` on 2026-08-10.
