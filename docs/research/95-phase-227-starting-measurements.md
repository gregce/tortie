# 95. Rewind, starting measurements (Phase 227, measure step)

Read from the tree at `6b8b1c1` on 2026-09-07, in the worktree `/private/tmp/wt-p227`, which holds
Phase 225 (the shadow baseline, read only) and Phase 226 (the guarded write channel). Nothing was
built. Every line number below was read from the file it names in this tree, not remembered. The
gate and test logs are in `.p227/` in the worktree, which is untracked and is not committed; the two
scripts that measured something ran under node over scratch directories they removed in a
`finally`, and nothing under the operator's home was opened.

The charter is the Phase 227 entry in `docs/BACKLOG.md` (line 23109 onward) and research 83
sections B, D.3, E.5, E.7, E.7a, E.7b, E.8, B.8a and F. The three rulings that are not re-opened:
whose bytes are whose does not matter, so no author detection and every change gets the same
control; three phases not one; no typing and no accept. By the first ruling the undo journal is load
bearing, because pressing one's own uncommitted paragraph is an ordinary act (research 83 A8a
measured 149 bytes gone from every place Tortie holds anything).

---

## 1. The redline modules as they stand, and where a press lands

Seven files. Six are scanned by `conformance:redline` rule 9 (`build/conformance-redline.mjs:127`
to `139`); the seventh, `src/renderer/editor/redline-shot-probe.ts`, is the Phase 194 harness
driver installed by `./shot-hook` on a harness launch only, and it is NOT in `REDLINE_FILES`. The
charter says the write does not go into a seventh file so the scanner misses it; that file is the
seventh file, and the builder puts nothing writing in it.

| file | lines | what it is |
| --- | --- | --- |
| `redline.ts` | 392 | Phase 191's engine. `RedlineRun = { kind: 'same' \| 'del' \| 'ins'; text }` (line 160). `redlineRuns(old, new)` (line 232) is jsdiff `diffWords` with an `Intl.Segmenter` under `REDLINE_MAX_EDIT_LENGTH = 200` (142); `REDLINE_MAX_BLOCK_CHARS = 4_000` (150); `REDLINE_MAX_BLOCKS = 60` (157). `newTextOf` (370) drops the `del` runs. The header's last paragraph (104 to 107) refuses accept, reject, opening a file and reaching a bridge. |
| `redline-document.ts` | 515 | Phase 194's composer. `composeRedlineDocument(oldText, newText)` (422) partitions by `diffLines` under `REDLINE_DOC_MAX_LINE_EDITS = 1_000` (129), falls back to head-and-tail with `approximate: true` (377 to 413), runs `redlineRuns` per block, repairs through `exactRuns` (182) so BOTH sides rebuild byte for byte, and peels shared whitespace (303). `push` (166) refuses `''`, which is why a `same` run is never empty and why adjacent non-`same` runs are one place in the document. `oldTextOf` (267). The header's last paragraph (106 to 108) is the same refusal. |
| `baseline.ts` | 190 | Phase 225. Below. |
| `RedlineDocument.tsx` | 162 | The view. Below. |
| `RedlineRow.tsx` | 96 | `RedlineRuns` (57 to 79) draws one element per run: `<del data-redline-del>`, `<ins data-redline-ins>`, or a bare `<span>`, keyed by run index. `RedlineRow` itself is dead code since Phase 194 (research 83 D.1). |
| `redline-copy.ts` | 189 | The copy handler. `rebuildCopyText` (131) clones the selection and removes `[data-redline-del], [data-redline-tag]` (159); `handleRedlineCopy` (176) sets `text/plain`. A wrapper element per change must not carry either attribute and must not be a `data-redline` element, or `redlineOf` (93) and `clipToOnlyDocument` (107, which requires EXACTLY ONE `[data-redline]` under the host) change their answers. |
| `redline.css` | 123 | Tokens only. `.ed-redline-scroll:focus-visible` (97) is already `outline: 1px solid var(--accent); outline-offset: -1px`, which is the ring the charter's rule 8 sentence points at; `--border-strong` is used at line 70. |

### 1.1 What a run is, and what a change is

A run is `{ kind, text }` with the text in file bytes, newlines included, so that the composed
list satisfies one property: the runs with every `ins` dropped equal the old side and with every
`del` dropped equal the new side, byte for byte (`redline-document.ts:12` to `18`). Adjacent runs
never share a kind (`push` merges), and an adjacent `del` and `ins` never share whitespace at either
end (`peelSharedSpace`). The order is jsdiff's own and an `ins` may come before its `del` or stand
alone (`redline.ts` ruling 6, and `conformance:redline` rule 14 pins it).

A change, research 83's unit and the charter's, is a maximal stretch of consecutive non-`same`
runs. Over the B.1 fixture the shipping composer on this tree gives **23 runs and 8 changes at
baseline offsets 7, 27, 62, 74, 183, 244, 322, 450** (measured, section 4). The largest group ever
seen over 3,999 fuzz pairs was three runs, always the whitespace repair's `del "\nclient" / ins " "`
shape (research 83 B.4a). A pure spacing change is a change with invisible bytes, and it gets the
same control, because the control is keyed on the group and nothing on the face names an author or
a kind.

### 1.2 The flat DOM

`RedlineDocument.tsx:139` to `141`:

```
<div className="ed-redline ed-redline-doc" data-redline="">   ← ONE data-redline element
  <RedlineRuns runs={doc.runs} />                             ← span | del | ins, flat, one per run
</div>
```

inside `div.ed-redline-scroll` (`tabIndex={0}`, `role="region"`, `aria-label`, `onCopy`) inside
`div.ed-redline-view`, followed by up to two `div.banner.ed-note` siblings: the caps note with
`role="status"` and the Phase 225 `ed-redline-since` sentence with no role. Research 83 D.1
measured 21 top level children for its fixture and NO element that means "this change"; a `del`
and its `ins` are siblings, adjacent by convention. The probe of Phase 225 reads the projection off
exactly these children (`build/probe-p225-baseline.mjs:267`: every child node, `DEL` → `del`,
`INS` → `ins`, anything else → `same`) and its `X.resting` check pins the document element's
opening tag byte for byte (`probe-p225-baseline.mjs:574`).

So a wrapper per change changes three readers at once and the builder owes all three: the probe's
`READ` (a wrapper is a non-INS non-DEL child whose `textContent` is BOTH sides, so the projection
read off top level children breaks unless it descends), the copy handler (section 1 table), and
`p225-redline-projection.test.tsx`, which takes the same property off `renderToStaticMarkup`. The
charter says the projection property and `redline-copy.ts` must be unchanged by the wrapper and the
gate proves both; the honest reading is that the PROPERTY is unchanged and the READERS must walk
into the wrapper, or the wrapper must be an element the readers already skip.

### 1.3 How the generation reaches the view

`BaselineState` (`baseline.ts:40` to `58`): `text`, `from: 'commit' | 'read' | null`, `generation`,
`headSeen`. `nextBaseline` (85) moves `generation` by exactly one on the first `read` and on every
HEAD version not seen before, and answers the SAME object otherwise. It lives on the tab as
`tab.baseline?: BaselineState` (`tab-types.ts:245`), set to `NO_BASELINE` at creation
(`store.ts:521`), and patched at three places in `tab-io.ts`: `loadContents` (line 125, the seed),
`loadHead` (170) and the watcher tick in `refreshRepo` (676). The view receives the whole `tab` as
its one prop (`RedlineDocument.tsx:51` to `57`) and composes at line 99 to 104:

```
const baseSide = redlineBaseSide(tab.baseline, tab.headContents);
const doc = useMemo(() => contentsLoading ? null : composeRedlineDocument(baseSide, workingText),
  [contentsLoading, baseSide, workingText]);
```

`tab.baseline.generation` is therefore in scope at the compose site and nowhere else needs to
carry it. The draw's generation is `tab.baseline?.generation ?? 0` read in the same render that
composed `doc`; a press that arrives later reads `useEditor.getState()`'s tab afresh and compares.
The right side, `workingText`, is `useLiveTabText(tab.id, tab.savedContents, !historical)`
(`live-text.ts:21`): the Monaco model's value debounced at `MODEL_SYNC_DEBOUNCE_MS = 150` while a
model exists, else `tab.savedContents`. Neither is the disk. `tab.savedContents` is refreshed only
by the watcher tick and only while `!tab.dirty` (`tab-io.ts:637` to `648`), which is the stale
thing research 83 E.7 step 1 names.

### 1.4 Where a press handler would live

There is no key handling in the redline files today. The scroller has `tabIndex={0}` and
`onCopy` and nothing else (`RedlineDocument.tsx:123` to `133`). The window-level maps are:

- `src/renderer/app/keyboard.ts`, ONE capture-phase listener on `window` for command chords and
  F2; its header measures that it runs about 5 ms BEFORE the native menu accelerator and that a
  branch calling `preventDefault()` is the only path that runs.
- `src/renderer/editor/EditorPanel.tsx:532` to `679`, two bubble-phase `keydown` listeners on
  `window`: `onKeyDown` takes Escape, ⇧⌘B, ⌘S, ⌘E, ⌘W; `onKeyDownNav` takes ⌘⌥←/→, ⌘⇧[/], ⌃Tab,
  each only while `ed.panelOpen` and, for the focus-scoped ones, while
  `panelRef.current?.contains(document.activeElement)`.

So the natural home for the chord and the rewind key is a `onKeyDown` on the scroller, or on each
focusable change, inside `RedlineDocument.tsx`, where the handler sees the event first and where
`tab` is already in scope. Two facts for the key choice:

- **⌘Z is a native menu role and nothing in the renderer claims it.** `src/main/menu.ts:620` and
  `621` are `{ role: 'undo' }` and `{ role: 'redo' }`; `grep` for `'z'`, `"z"` and `KeyZ` under
  `src/renderer` (tests excluded) finds no claimant. Whether a keydown for ⌘Z reaches the renderer
  before the role fires, and whether `preventDefault()` there suppresses the role, is UNMEASURED
  and the builder measures it before choosing ⌘Z for the journal's undo, or chooses a key no role
  owns.
- Plain keys reach the scroller only while it or a descendant has focus; the terminal owns the
  keyboard otherwise, which is the shape the charter wants (nothing drawn, keyboard only).

The native menus rule in CLAUDE.md applies: a phase that adds a user-facing surface updates the
native menus in the same commit and says so in the brief. `src/main/menu.ts` has no item naming
the redline today; the editor's items are under `File` (542) and `Close Editor Tab` (598).

---

## 2. The channel, and what a caller must pass

### 2.1 The contract

`src/shared/ipc/files.ts:468`: `'fs:writeGuarded': { req: [input: FsGuardedWriteInput]; res:
FsGuardedWriteResult }`. Preload: `src/preload/files.ts:44`, `writeGuarded: (input) =>
invoke('fs:writeGuarded', input)`, so the renderer reaches it as
`gmuxBridge().fs.writeGuarded(input)`. Main: `src/main/fs/ipc.ts:265`, one line handing
`{ listProjectRoots }` and the input to `writeGuarded` in `src/main/fs/guarded-write.ts:263`.
Nothing under `src/renderer` names either the channel or the preload method
(`conformance:redline-write` rule 5, green at the parent).

`FsGuardedWriteInput` (`src/shared/fs-ops.ts:314` to `323`):

| field | what it must be |
| --- | --- |
| `root` | An ABSOLUTE path that is one of the folders Tortie has open, compared as real paths against `listProjectRoots()` (`src/main/fs/paths.ts:122`, `resolveOpenProjectRoot`). Anything else is `refused/outside`. |
| `path` | Absolute inside `root`, or relative to it; `.git` refused at any depth (`resolveInsideRoot`, `paths.ts:150`). |
| `expect` | Lowercase hex sha256 of THE BYTES ON DISK when the caller read them, checked by `SHA256_HEX` (`guarded-write.ts:184`). Malformed is `refused/input`. |
| `contents` | The whole new file as a string, written as UTF-8. |

**What the renderer can hand as `root`.** A worktree tab's `tab.repoPath` is documented as the
"absolute project/repo root" (`src/renderer/state/open-file.ts:112`) and the tree sets it to
`ctx.rootPath`, the opened folder (`src/renderer/tree/tree-ops.ts:378`, `387`, `634`). The
redline is offered only for a tab where `fileInRepo(tab.repoPath, tab.path)` holds
(`baseline.ts:145` to `154`, a string prefix test at `tab-identity.ts:125`), so `path` can be
`tab.path` absolute and `root` can be `tab.repoPath`. Whether every `repoPath` a tab can carry is
an OPEN PROJECT ROOT rather than a repository root under one is not proved here; the channel
refuses the difference, and the refusal sentence is `resolveOpenProjectRoot`'s "That folder is
not an open project." The context detail path (`src/renderer/context/open-detail.ts:36`) and
`session-actions.tsx:571` also compose a `repoPath`; the builder confirms those tabs never reach
the redline (a context detail tab is outside the repository and `fileInRepo` already refuses it).

### 2.2 Every word it can answer, in the order it decides them

`FsGuardedWriteResult` (`fs-ops.ts:359` to `362`) is `wrote | stale | refused`, and it never
throws to the renderer. From `guarded-write.ts`, the order is the design (header lines 18 to 75):

| step | line | answer | why |
| --- | --- | --- | --- |
| 1 | 268 to 278 | `refused/input` | A field missing, or `expect` not 64 hex. |
| 2 | 281 to 287 | `refused/outside` | Root not open, path escapes it, or names `.git`. `reason` is the thrown gate's own sentence. |
| 3 | 300 to 311 | `refused/missing` (ENOENT), `refused/link` (ELOOP/EMLINK: `O_NOFOLLOW`), `refused/io` (any other errno) | The open, with `O_NONBLOCK` so a FIFO cannot freeze main (the Phase 226 verifier measured 5,002 ms without it). |
| 3 | 313 to 320 | `refused/io` (not a regular file), `refused/readOnly` (owner write bit clear) | Decided on `fstat` before anything is read. |
| 4 | 321 to 332 | `refused/tooLarge` | File size over `READ_CAP_BYTES`, or the payload over it, or the bytes read to EOF over it (a file growing during the read). |
| 5 | 339 to 346 | `stale`, with `sha256` of what the file holds NOW and a reason | The compare-and-swap. |
| 6 | 348 to 354 | `refused/notUtf8` | `raw.toString('utf8')` re-encoded does not equal `raw`. |
| 7 | 357 to 389 | `refused/io` | The staged copy `<dir>/.<basename>.tortie-swap` could not be created exclusively or written. |
| 8 | 395 to 415 | `refused/raced` | The target went away, became a link, or is not the same inode/size/mtime/ctime the read saw; or the staged copy is not the one this call wrote. |
| 9 | 416 to 422 | `wrote`, with `sha256` of the payload and `bytes` | The atomic rename. `refused/io` if the rename itself fails. |

Every refusal carries `reason`, a sentence already written for a person, naming the file's basename
and never its bytes. The `stale` answer carries the digest the file holds now, so a caller could
re-read and try again without a second hash of its own.

### 2.3 MEASURED: from the renderer's seat, a latin-1 file answers `stale`, not `notUtf8`

The charter's fourth refusal (E.7b) is answered by step 6, but step 5 runs first, and the
renderer's only reader hands it a STRING. `fs:readFile` → `readTextCapped` (`src/main/fs/ipc.ts:62`
to `89`) decodes with `toString('utf8')` and returns `{ contents, encoding: 'utf8', truncated }`
(`src/shared/types.ts:751`); the raw bytes never reach the renderer, and the renderer's existing
digest helper `sha256Hex` (`tab-io.ts:443`) hashes `new TextEncoder().encode(text)`, being the
string re-encoded. For a UTF-8 file those bytes equal the disk. For a latin-1 file they do not,
because the decode already put U+FFFD in the string.

Driven under node over a scratch directory (`.p227/m1-latin1-digest.mts`, output in
`.p227/m1-latin1-digest.out`), the SHIPPING `writeGuarded` with a two-line latin-1 `notes.txt`:

| `expect` computed from | outcome | file |
| --- | --- | --- |
| the decoded string re-encoded (what a renderer can do) | **`stale`**, "notes.txt changed since it was read, so nothing was written." | untouched |
| the raw bytes (what the gate does) | `refused/notUtf8`, "…is not UTF-8 text, and rewriting it whole would damage it." | untouched |
| a clean UTF-8 file, decoded string re-encoded | `wrote`, 19 bytes, and the file holds the new text | replaced |

So the file is safe either way, which is Phase 226's promise kept, but the SENTENCE a person
reads is wrong: they are told the file changed when it did not. Three honest answers, and the
phase brief chooses one: (a) the renderer refuses before the call when
`contents.includes('�')`, which is cheaper than the channel's check but also refuses a UTF-8
file that legitimately holds U+FFFD, a case `conformance:redline-write`'s `utf8WithFffd` reading
deliberately writes; (b) `fs:readFile` grows a raw-byte digest so the renderer's `expect` is the
disk's, which touches the read channel every open goes through and moves `gate:contract`; (c)
the renderer reads `stale` and re-reads once, and if the second read decodes with a U+FFFD says the
encoding sentence rather than the stale one. Whichever is chosen, the E.7b arm the charter owes the
gate must drive the renderer-shaped digest and not the raw one, or it proves the wrong seat.

### 2.4 What the caller gets back for its next move

After `wrote` the tab's `savedContents` still holds the old bytes and the Monaco model, if one is
mounted, still holds the old text. The watcher tick will re-read the file (`refreshRepo`,
`tab-io.ts:637`) and call `resetWorkingModel` (`monaco-loader.ts:135`), which `setValue`s the model
and DESTROYS ITS UNDO STACK (research 83 A3.4, E.8), roughly 600 to 800 ms later in the good case
(research 83 B.4d). Until then the redline's right side is stale by exactly the rewind, so the
pressed change is still drawn; a second press in that window re-reads the file, finds the change
gone, and refuses with the "already back to what it was" sentence, which is correct (research 83
B.4c). The builder decides whether to patch `savedContents` from the written contents at once, as
`saveOnMachine` does on `wrote` (`tab-io.ts:507`), so the view recomposes without waiting for
the tick; if it does, the same patch must NOT run `resetWorkingModel` on a dirty model.

---

## 3. Rule 9, what it is and what it must become

### 3.1 What it is

`build/conformance-redline.mjs:241` to `255`:

```
const WRITE_WORDS = /\b(gmuxBridge|writeFile|writeFileSync|acceptChange|rejectChange|applyChange)\b|['"`]fs:[a-zA-Z]/;
function findWritePaths(source) { … per line, block comments stripped, lines starting `*` or `//` skipped, WRITE_WORDS.test … }
```

and lines 507 to 514: for each of the seven `REDLINE_FILES` (127 to 139), any hit fails
`9. <file> names a write path: <line>`, and it prints `9. no redline file names a bridge, a write
or an accept, so nothing here can change a file`. The scanner is proved on three fixtures at lines
967 to 990: `await gmuxBridge.invoke('fs:write', …)` must hit, `export function acceptChange` must
hit, `newTextOf` must not. Twelve fixtures in all behave across the three scanners.

Note what it scans FOR: the word `gmuxBridge` (so `import { gmuxBridge } from …` is a hit on the
import line alone), any `writeFile`, and any string beginning `fs:` followed by a letter, which is
every fs channel name including `'fs:readFile'`. So the re-read the rule requires cannot be spelled
as a channel string in a redline file today either; `tab-io.ts` reaches the read through
`gmux.fs.readFile(path)` with no channel string, and the redline module will reach both the read
and the write the same way.

### 3.2 What it must become, in words

Rule 9 is narrowed, never deleted, to the shape `conformance:logins` rule 2 uses for the two
deletions in that domain (`build/conformance-logins.mjs:172` to `208`, `deletionsIn` and
`guardsThisCall`, applied at 242 to 272 with the count pinned at exactly two):

1. **Over the same seven files**, every `WRITE_WORDS` hit is still a failure EXCEPT the one
   permitted shape: the preload method `writeGuarded` reached through the bridge, at **exactly one
   call site** in exactly one of the seven files. A second call site, a `writeFile`, an
   `acceptChange`, or a channel string `'fs:…'` anywhere in the seven remains a failure. The count
   is pinned at one the way the logins count is pinned at two, so a second write has to be argued
   for rather than added.
2. **The function holding that call site**, found by `functionBodyOf(code, name)` from
   `build/scan-source.mjs:458` (a declared `function name(`, its parameter list skipped through
   `closeOf`, its body read by `blockAt` matching braces, comments stripped first with
   `stripComments`), must, in the text BEFORE the call, ask the generation guard first and the
   re-read second: the body's text up to the call must contain the generation comparison before it
   contains the read, and both before the call. Read by braces and by position, never by searching
   the file for a word, because a guard in some other function is not a guard on this one.
3. **The scanner is proved on fixtures the gate writes**, in the pattern at lines 899 to 1001: a
   function that writes with no guard must fail, one that reads before it compares generations must
   fail, one that calls the method twice must fail, one that names `writeFile` beside the permitted
   call must fail, and the shipping shape must pass. A scan that cannot fail proves nothing.
4. The printed sentence changes from "no redline file names a bridge, a write or an accept" to one
   that says what is now true: one write channel, one call site, the guard and the re-read in
   front of it, and no accept.

`functionBodyOf` finds a DECLARED function only (`function name(` or `async function name(`); an
arrow held in a `const` is invisible to it. So the function holding the call must be a declared
function, and the gate should say so in its failure sentence when it finds none.

---

## 4. The mix rule, and the reference implementation confirmed on this tree

Research 83 B.3, for the drawn runs and `T ⊆ E` the edits taking the INSERTED side:

```
mix(runs, T) = concat over runs r:
    same → r.text | ins → r.text if edit(r) ∈ T else '' | del → '' if edit(r) ∈ T else r.text
rewind edit e : file := mix(freshRuns, E' \ {e})     (the baseline does not move)
```

The proved reference is `.p222/fix/mix.ts` (36 lines, tracked, 113 files under `.p222/` are):
`editsOf(runs)` groups consecutive non-`same` runs into `{ off, del, ins, runs }` where `off` is
the BASELINE offset, advanced by `same` and `del` text only; `mix(runs, edits, take)` is the rule
above. `.p222/b-rewind/rewind.ts` is the earlier form with `project(runs, reverted)` by run index,
superseded by the offset identity. The identity resolution used by every fix-round script
(`f2-baseline-moved.ts:51`, `f5-own-prose.ts:35`) is one filter:

```
edits.filter((x) => x.off === pressed.off && x.del === pressed.del && x.ins === pressed.ins)
```

exactly one → write; none → refuse; more than one → refuse as ambiguous (never observed over 1,500
draws, because baseline offsets are strictly increasing across one draw).

Run on THIS tree over the shipping composer (`.p227/m2-mix-reference.mts`, output in
`.p227/m2-mix-reference.out`): 23 runs, 8 edits at offsets 7, 27, 62, 74, 183, 244, 322, 450;
`mix(∅)` equals the baseline (md5 `32119ae9`) and `oldTextOf`; `mix(E)` equals the current file
(md5 `8cc5e7a6`) and `newTextOf`; rewinding E4 (`disposable client` → `throwaway viewer` at
baseline offset 183) gives 465 bytes, md5 **`cd918864`**, which is B.3's number. The builder ports
`editsOf` and `mix` as they are, keyed on the group, and adds nothing to them.

Two sentences the refusal owes (research 83 E.7's last two rows): when the identity resolves to
none, "no longer in the file" is right when the fresh file holds something ELSE at that place, and
"already back to what it was" is right when the fresh file holds the DELETED text there, being the
baseline's bytes at `pressed.off` spanning `pressed.del`. The second is decidable from the fresh
compose alone: no edit at that offset and the fresh new side's projection carrying `pressed.del`
where the baseline does.

---

## 5. The two gates at the parent

`.p227/parent-conformance-redline.log`, exit 0, sixteen rules green. The lines that matter:

- `9. no redline file names a bridge, a write or an accept, so nothing here can change a file`
- `13. the pasteboard is put back in a finally at 1 call site(s) (4 scanner fixtures behaved)`
- `15. 26 whole file fixtures re-derived by plain joins … the fuzz held over 3000 pairs in 40 ms`
- `16. 96 adjacent deletion and insertion pairs … 6 last word fixtures drew exactly the runs pinned`
- `12 fixtures behaved, so the three scanners above can fail`

`.p227/parent-conformance-redline-write.log`, exit 0: `28 of 28 readings are what the channel must
say`; rule 4, the channel is named once under `src/main` and once under `src/preload` and not in
the module; rule 5, **nothing under `src/renderer` names the channel or the preload method, so it
ships unwired**, which is the line this phase turns; `15 of 15 ablations went red`. The gate
stages its ablation copies at `src/main/.p226-ablation-<pid36>-<n>/` and removes them in a
`finally` (`build/conformance-redline-write.mjs:548` to `556`); they were seen while the gate ran
and were gone after, and `git status` is clean. This gate must print exactly this after the phase,
except that rule 5 will name the one renderer file that reaches the method, so **rule 5 changes
too**, and the builder reads its text before writing the call.

## 6. The tests at the parent

`npx vitest run src/renderer/editor` (`.p227/parent-vitest-editor.log`): **29 files, 307 tests,
all passing, 642 ms**. The redline's own: `p194-redline-document.test.ts` (367 lines, 21 cases),
`p225-shadow-baseline.test.ts` (399 lines, 16 cases, the SHIPPING store and tab IO driven under
node over bridge stubs, `../monaco-loader` mocked at lines 34 to 46 with `resetWorkingModel` a
no-op), `p225-redline-projection.test.tsx` (225 lines, 12 cases, `renderToStaticMarkup` of the
shipping view). The Phase 225 suite's bridge stub shape (`readFile`, `showHead`, `writeFile`,
`readDir` as `vi.fn()` on a stubbed `window`) is where a `writeGuarded` stub goes for a unit test
of the press, and the stubbed `writeFile` answering `undefined` is the reminder that a test double
for the new channel must answer a WORD or it proves the wrong thing.

## 7. The app run this phase extends

`build/probe-p225-baseline.mjs` (590 lines, `npm run probe:p225`, outside the commit battery).
The shape to keep: one Electron through `withElectron` on a scratch profile, a scratch HOME and
the `gmux-p225` socket handed in by `build/harness-socket.mjs` (`gmux` and `default` refused by
name, lines 172 to 181); a scratch repository built by the script (219 to 240) with `main` and
`alt`; the outside writer is `/bin/sh -c 'cat > "$1"'` (212 to 215), which is the charter's wording
for an agent's write and spends no token; the operator's `-L gmux` sessions counted before and
after (192, 585); readings written to a JSON file in a `finally` (578 to 581); `--self-test` proves
the projection grader on seven fixtures (116 to 167) and launches nothing.

The readers it already has and the rewind run reuses: `READ` (245 to 285) reaches the live tab
through the React fiber of `.ed-redline-view`, picking the newer of the two fibers by generation
(253), and reads the runs off the document's top level children, the caps note, the since sentence,
the aria label, the mode options and whether Monaco is up; `clickMode`, `clickTab`, `docHasChange`,
`docSettled`; `press` (318 to 322) dispatches real key events through CDP with `rawKeyDown`/`keyUp`
and `keyDown` when there is text; `DIRTY_ON_FACE` (329) reads dirtiness off the close button's
class rather than the fiber, the committer's round having found the fiber pick stale for `dirty`.

Two things the extension must add and the parent probe has no reader for: focus, being which
change holds `document.activeElement` after the chord, and the file ON DISK after a press read
through `disk(rel)` (216) against `mix`'s answer computed in the probe itself over the runs it read,
which is the charter's "read the file from disk and prove the phrase is back and every other edit
stands". The stub write between the draw and the press is `shellWrite` again, timed against the
press so it lands after the draw's generation was read and before the channel call; the verifier's
named attack is its OWN timing of that write, with at least one arm the builder's gate lacks.

---

## 8. Things the builder should know that are in none of the seven questions

1. **The Monaco trap (research 83 E.6) is live.** `save()` writes `model.getValue()` over the whole
   file, so a rewind written to disk while the tab is DIRTY is undone by the next ⌘S. Phase 225
   already states the dirty tab as a limit on the face (`baselineSentence`, `baseline.ts:180`).
   The first version refuses a press while `tab.dirty`, with a sentence, which is E.6's answer 2.
2. **`tab.truncated` exists** (`tab-types.ts:137`) and `refreshRepo` keeps it fresh (`tab-io.ts:642`).
   E.7a's renderer-side clause is to refuse the press on it before any read, and the channel refuses
   again on size, so a truncated file is refused twice and the sentence is the renderer's.
3. **The renderer already has a sha256** (`tab-io.ts:443`, `crypto.subtle`, null when absent) and
   the remote save already shows the shape of a word-answering write with a per-word sentence
   (`tab-io.ts:500` to `533`, `remoteSaveRefusal`). The redline module cannot import `tab-io.ts`
   without importing `gmuxBridge` into a scanned file; the digest helper moves to a small module
   both can import, or the press handler lives in `tab-io.ts`'s neighbourhood and the redline file
   holds only the pure parts. Either way exactly one file of the seven holds the call.
4. **`fs:readFile` is not in `WRITE_WORDS` by name but `'fs:` is** (section 3.1), so the re-read is
   spelled through the preload method, `gmux.fs.readFile`, never as a channel string.
5. **A rewind is a rename-over**, so an `fs.watch` on the FILE would go deaf (research 83 C.2); the
   bus watches the directory and the tick will see it. The staged name `.<basename>.tortie-swap`
   appears in the directory for about 24 ms at the cap and a crash leaves it; the next write to the
   same file removes it.
6. **`useLiveTabText` trails disk by 600 to 800 ms** (research 83 B.4d), so the stale draw is the
   ordinary case and not the attack; the press must never read `tab.savedContents` or the drawn
   runs as the file.
7. **`P167_SURFACES` already carries `redline`** (`build/probe-p167-scale.mjs:213`), so the
   plateau obligation is to drive it with a file being rewritten under it, not to add the surface.
8. **`gate:contract` must not move.** The contract line for `fs:writeGuarded` is already in
   `docs/audits/contract-baseline.txt` from Phase 226, and this phase adds no channel, no env name
   and no smoke mode. A journal is renderer state and needs none.
9. **Rule 25-style bytes:** `src/main` and `src/shared` should be byte identical to `6b8b1c1`
   after this phase unless section 2.3's option (b) is chosen, in which case the brief says so
   before any code is written.
10. **What was left running.** The operator's own Tortie was up throughout: the Electron count by
    the CLAUDE.md command read 11 before this step's two node scripts and the gates and 11 after,
    none of them started here. No tmux server was started; no Electron was started; the two
    measurement scripts spawned nothing.
