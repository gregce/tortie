# Research 96 — Phase 236's starting measurements: where the redline's controls can go

**Date.** 2026-09-08. **Phase.** 236, *the redline's controls, visible*. **Step.** The measure step.
Nothing is built here.

**What this document is for.** Phase 227 shipped four chords and nothing on the face says them. The
operator used the rewind for the first time on 2026-09-08 and said *"feels like the commands should
be more visual in the interface itself actually. also i don't know if having them in edit view makes
sense."* He could not find the keys. This document is the reading a builder starts from: what a
`.ed-redline-change` element carries today, where focus lives, how a command reaches the view, where
an overlay can mount so that no reader of the document sees it, what the Edit menu can and cannot
show, and — the number the whole phase turns on — **the parent layout of the drawn document, so the
chip that Phase 236 adds can be proved to have moved nothing.**

**What was run.** One Electron, on a scratch profile with a scratch `HOME` and this run's own tmux
socket, launched through `build/electron-run.mjs`'s `withElectron` and torn down in its `finally`;
`build/harness-socket.mjs` owned the socket and unlinked it in its own teardown. It spawned no agent,
spent no token, opened no keychain, made no request and read nothing under the person's home. The
"agent" that edited the file was a plain `/bin/sh` running `cat`. The operator's own `-L gmux`
session count was 15 before and 15 after. The script is `.p236/layout.mjs`, its output is
`.p236/out-layout.json` and its log is `.p236/out-layout.txt`.

---

## 1. What the view holds today, read from the tree

### 1.1 What a `.ed-redline-change` element carries

`DocumentRuns` in `src/renderer/editor/RedlineDocument.tsx:100-139` wraps each change — research 83
B.2's unit, being adjacent non-`same` runs collapsed into one — in exactly one element:

```
<span class="ed-redline-change"
      tabindex="-1"
      role="group"
      aria-label="Change N of M"
      data-change="<index in this draw>"
      data-change-off="<baseline offset>"
      data-change-del="<the deleted text>"
      data-change-ins="<the inserted text>"
      data-change-gen="<the baseline generation>">
   … the change's own runs, drawn by RedlineRuns …
</span>
```

Four facts about it bind this phase.

- **It carries no `data-redline*` attribute of its own, deliberately.** `redline-copy.ts:158` removes
  every `[data-redline-del]` and `[data-redline-tag]` from the clone it builds, so a wrapper named
  that way would take the inserted words off the clipboard with it. `p227-redline-changes.test.tsx`
  at line 154 iterates every attribute of every wrapper and fails on any name starting
  `data-redline`. **A chip must therefore never put `data-redline-tag` on the WRAPPER**; it puts it on
  the chip's own element, which is a different node.
- **It is `tabindex="-1"`**, so it is out of the tab order and is reached only by the view's own
  chords or a click.
- **It holds no other element.** `p227-redline-changes.test.tsx:166` asserts the drawn body contains
  no `<button`, no `data-redline-tag` and no tag outside `{span, del, ins}`. That test reads the
  document element's markup only (§1.4), so a chip outside the document leaves it untouched — and a
  chip inside it turns it red.
- **The identity is the picture's, not a list's.** `focusedChange` (`RedlineDocument.tsx:149`) reads
  the four attributes off the focused wrapper rather than off any array in memory, so a press is bound
  to exactly what the person is looking at, generation included (research 83 B.8a).

### 1.2 Where focus lives

Three places, and they are not the same place.

1. **The scroller** `.ed-redline-scroll` is `tabIndex={0}`, `role="region"`, and takes focus on mount
   (`RedlineDocument.tsx:221-223`, `focus({ preventScroll: true })` keyed on `tab.id`). It is
   `hostRef`, and it is the `host` every reader below is given.
2. **A change wrapper** takes focus through `moveFocus(host, ±1)` (`RedlineDocument.tsx:192-210`),
   which lists `.ed-redline-change` under the host, finds the current one by
   `activeElement.closest('.ed-redline-change')`, and calls `items[next].focus()`. Research 83 D.3
   measured `focus()` alone scrolling a change into view on a 3,670px document with no
   `scrollIntoView` call, and that is why there is no scroll call in the tree.
3. **Nothing else.** The document itself is not editable and offers no caret
   (`redline-shot-probe.ts:244` reads `isContentEditable` and `[contenteditable], textarea, input`
   inside it, and both are the refusal Phase 194 shipped).

**THE TRAP THIS PUTS IN FRONT OF A CHIP WITH BUTTONS, and it is the finding of this section.** Both
`focusedChange` and `moveFocus` read `document.activeElement`. A `<button>` in a chip takes focus on
a click. So:

- If the chip's Rewind button is a plain focusable button, clicking it moves focus off the change,
  `focusedChange(host)` answers **null** (the button is not inside a `.ed-redline-change` once the
  chip lives outside the document), and `pressRedline` returns `{ outcome: 'nothing' }`: **no read, no
  write, no word.** The press silently does nothing.
- And `moveFocus` with the focus on a button computes `current === -1`, whose branch sends **next to
  the FIRST change and previous to the LAST**, not to the neighbour of the change the person was on.
  So the chip's own arrows would jump to the top of the document.

There are two honest ways out and the builder picks one, in the brief:

- **Never let the chip take focus**: `tabIndex={-1}` on its buttons plus `preventDefault()` on
  `mousedown`, so `document.activeElement` stays on the change; everything downstream is unchanged.
- **Hand the identity in**, which the tree already allows: `pressRedline`'s `deps.focused` is an
  injected `() => PressedChange | null` (`redline-press.ts:67-74`), so a chip can pass a closure that
  answers the change the chip is drawn FOR. This keeps the module's one rule — the identity is read
  once, before any await — because the closure is still called once, before any await.

Whichever is chosen, `moveFocus` still needs the focus to be on a change for its arrows to step, so
the first option is needed for the arrows even if the second is used for the writes.

### 1.3 How a command reaches the view today

There is exactly one road and it has two mouths.

```
⌥↓ ⌥↑ ⌥⌫ ⌥⇧⌫ ──> .ed-redline-scroll onKeyDown ──> redlineCommandOf(event) ─┐
                                                                          ├─> runCommand(cmd)
Edit menu row ──> sendMenuAction('redline-*') ──> ui:menuAction ──>        │      │
   menu-actions.ts:201-212 ──> runRedlineCommand(cmd) ──> installed handler ┘     │
                                                                                  v
                                            'next' / 'prev' ──> moveFocus(host, ±1)
                                            'rewind' / 'undo' ──> press(kind, host)
                                                                   └─> pressRedline(kind, tab, deps)
                                                                         └─> deps.apply = applyRewind
                                                                               (redline-write.ts,
                                                                                the ONE call site)
```

- `redlineCommandOf` (`RedlineDocument.tsx:171-183`) is the only place the four chords are decoded.
  Anything carrying ⌘ or ⌃ is refused outright, so the editor panel's and the shell's chords pass
  untouched.
- `installRedlineCommands` (`redline-commands.ts:29`) is a one-slot leaf that imports nothing, so the
  menu controller reaches the redline without loading the editor panel. The view installs on mount
  and removes on unmount; `runRedlineCommand` answers `false` when no view is mounted.
- `press` (`RedlineDocument.tsx:253-282`) reads the LIVE tab out of the store at the press, composes
  the `PressTab`, and hands `focused`, `apply` and `refuse` to `pressRedline`.

**A chip adds no new road.** Its buttons call `runCommand(command)` — the same function the chord and
the menu both reach — which is what the charter means by "nothing new is wired to the write". The
gate's rule 9 stays exactly as it is: one write channel, one call site, and this phase adds none.

### 1.4 Where an overlay can mount so that no reader of the document sees it

Four readers walk the document today, and each one draws its own boundary:

| Reader | Where it looks | What a chip inside the document would do to it |
| --- | --- | --- |
| `redline-copy.ts` `rebuildCopyText` | the clone of a Range, minus `[data-redline-del], [data-redline-tag]` | a chip's glyphs enter the clipboard unless the chip carries `data-redline-tag` (research 83 D.2 measured `…closed**rewind**. This release…`) |
| `redline-shot-probe.ts` `leavesOf` | `.ed-redline-doc`'s child nodes, walking into `.ed-redline-change` | a chip becomes a leaf and is read as a `same` run, so `runsOf` and both projections break |
| `p225-redline-projection.test.tsx` `runs()` | the markup from `<div class="ed-redline ed-redline-doc" data-redline="">` to the **first `</div>`** | a chip that is a `<div>` truncates the document; a chip that is a `<span>` is counted as a run |
| `p227-redline-changes.test.tsx` `documentOf` / line 166 | the same slice; asserts no `<button`, no `data-redline-tag`, and tags ⊆ `{span, del, ins}` | red on the first of those three |

So the rule is exact: **the chip must live outside the `.ed-redline-doc` element**. Measured on the
running app, the view is a two-child flex column and the containing block is already there:

```
.ed-redline-view      position: absolute, display: flex   rect 569,110  871 × 775
├─ .ed-redline-scroll position: static, overflow: auto    rect 569,110  871 × 739
│  └─ .ed-redline-doc position: static                    rect 726.09,110  556.81 × 411.13
└─ .banner.ed-note.ed-redline-since  position: static     rect 569,849  871 × 36
```

`.ed-redline-view` is the **nearest positioned ancestor of everything in the view**, so an
absolutely-positioned chip mounted as a third child of the view is laid out against the view's own
box: a client rect read from `getClientRects()[0]` becomes chip coordinates by subtracting
`view.rect.left` and `view.rect.top`. Nothing else in the view is positioned, so no other box can
capture it.

**Two limits that follow, stated so the builder does not discover them in an app run.**

1. **A chip outside the scroller does not scroll with the document.** The scroller is
   `overflow: auto` and the chip is not inside its scrolling box, so the anchor has to be recomputed
   on `scroll` (and on resize), or the chip will detach from its change the moment the person scrolls.
   In this run the document fit its scroller at both widths (`scrollHeight === clientHeight === 739`),
   so **the run did not exercise a scrolled document and this is unmeasured**; the app run must.
2. **A chip outside the scroller is not clipped by it**, so a chip anchored on a change near the
   bottom of the view can paint over the `ed-note` banner or past the view's own bottom edge. The
   chip owns its own clamp.

A third mount point exists and is worth naming rather than leaving to be re-derived: a portal at
`document.body` with `position: fixed`, which needs no coordinate translation at all and is invisible
to every reader above, at the cost of leaving the view's stacking context.

**One trap in the tests that is not about the document at all.** `p225-redline-projection.test.tsx`'s
`aria()` helper is `html.match(/aria-label="([^"]*)"/)` — the **first** `aria-label` in the whole
rendered markup, which today is the scroller's, and four assertions pin its exact string. A chip
rendered **before** the scroller and carrying an `aria-label` turns those four red without touching
the document at all. Rendered after the scroller, as a third child, it does not.

---

## 2. The Edit menu: what it can show, and how it would learn to be disabled

### 2.1 What the four rows are today

`src/main/menu.ts:637-640`, inside the Edit submenu, after a separator following the seven AppKit
roles:

```
item('Next Change', 'redline-next'),
item('Previous Change', 'redline-prev'),
item('Rewind Change', 'redline-rewind'),
item('Undo Rewind', 'redline-undo')
```

`item(label, action, accelerator?, mark?)` at `menu.ts:233-246` composes `{ label, accelerator?,
glyph?, click }`. These four pass **no accelerator, no mark and no enabled**, so today each row is
always enabled and says nothing about its key. The comment above them at `menu.ts:630-636` gives the
reason for the missing accelerator and it stands: **a native accelerator in the application menu is
app-wide, and ⌥↓, ⌥↑ and ⌥⌫ are bytes a session's terminal reads.**

### 2.2 A hint without an accelerator, and what that costs on macOS

**The `hint` field the brief points at is the POPUP menu's, not the menu bar's.** `PopupMenuItem.hint`
(`src/shared/ipc/app.ts:225-226`) is what `EditorTabs.tsx:42` passes as `keyDisplay('editor.close')`,
and `menu-popup.ts:30-39`'s `hintToAccelerator` turns `"⌘W"` back into `"Cmd+W"` and sets it as the
popup item's **accelerator**. That is safe there for the reason its own header gives: a popup menu's
accelerators are never registered globally and only render the keycap while the menu is open. **It is
not safe in the application menu, where the same field registers the chord app-wide** — which is the
thing `menu.ts:630-636` refuses.

Electron's one documented way to say "display only", `MenuItem.registerAccelerator`, is **Linux and
Windows only**. This tree already records that twice, in `src/main/tray/index.ts:136` and
`src/main/harness/p156-menus.ts:131`, and it is why the tray phase had to measure rather than assert.
So on darwin there are exactly two honest ways to put the chord on an Edit row, and neither is an
accelerator:

| Way | Mechanism | Cost |
| --- | --- | --- |
| **`sublabel`** | `MenuItemConstructorOptions.sublabel`, already used by `open-recent-menu.ts:136` for "on Mac Pro" | a grey **second line** under the label, not the right-hand keycap column; macOS 14.4+ and silently ignored below (this machine is macOS 15.7.9, so it draws) |
| **the label itself** | `'Rewind Change  ⌥⌫'` | one line, but the glyph is left-aligned with the label rather than in the key column, and it is a string the keymap does not own unless it is composed from `keyDisplay` |

Both draw the chord and neither registers it. The `sublabel` route is the one with a precedent in
this tree and it is the one to price first; the phase brief should say which it chose and why, because
neither reproduces the right-hand keycap column a native accelerator gives, and pretending otherwise
in the entry would be a claim the app run refutes.

### 2.3 How the renderer tells main whether a redline is mounted — it does not, today

**There is no push of any kind.** `buildTemplate()` reads its state synchronously as the template is
built, from main's own sources: `getSettings()` for `archRowsOn()`, `currentMachines()` for
`anyConfirmedMachine()` at `menu.ts:1108-1112`, `recents.json` for Open Recent. **Main knows nothing
about which editor tab is open or which mode it is in, and nothing in `src/shared/ipc/` carries it.**
`grep` for a channel that would: there is none.

**The smallest honest way is the pattern this tree already has for exactly this problem**, being the
sessions-position radios (Phase 14.7, `menu.ts:307-345` and `ipc.ts:100-102`). Its own header states
the shape:

> ONE direction only. The store pushes over `ui:sessionsPosition` on every change and once as the app
> loads; main caches that value below and builds the template FROM it. Main never reads localStorage,
> never runs executeJavaScript, and never sniffs a string to guess the position.

Applied here that is four small pieces and nothing else:

1. One invoke channel, `'ui:redlineMounted': { req: [mounted: boolean]; res: void }`, added to the
   shared contract beside `ui:sessionsPosition` / `ui:projectsPosition` in
   `src/shared/ipc/app.ts`'s `ViewMenuInvokeChannelMap`, with the preload line beside
   `setSessionsPosition` (`src/preload/index.ts:159`).
2. One handler in `registerIpcHandlers` (`src/main/ipc.ts:100`), calling into menu.ts.
3. One module-level cache in `menu.ts` beside `let sessionsPosition`, read by the four rows'
   `enabled`, exactly the way `anyConfirmedMachine()` is read by Open Folder on a Machine's. **The
   cache is what makes a rebuild safe**, which is the lesson `menu.ts:316-320` records: `rebuildAppMenu()`
   runs on every hotkey change, and a template that hardcoded its answer silently moved the checkmark.
4. The push itself in the view's existing mount effect — the same effect that already calls
   `installRedlineCommands` (`RedlineDocument.tsx:293`), whose cleanup is the unmount.

**Two things a builder must not skip.** A live menu is updated in place the way
`setSessionsPositionRadios` does it, by `Menu.getApplicationMenu()` then `getMenuItemById`, or the
rows will not change until something else rebuilds the menu; that needs an `id` on each of the four
rows, which they do not have today. And **an added invoke channel moves `docs/audits/contract-baseline.txt`**,
so `npm run gate:contract` fails unless the baseline is regenerated with
`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` **in the same commit**,
with the moved lines named in the commit body. The baseline reads `count=223` at this parent, and
`ui:projectsPosition` / `ui:sessionsPosition` are its lines 219 and 220, so the new line lands beside
them.

---

## 3. What each chord should show, computed from the keymap rather than typed

`keyDisplay(id)` (`src/shared/keymap.ts:1191`) answers `keymapEntry(id).keys[0].display`, which `k()`
composed at module load through `acceleratorToDisplay(normalizeAccelerator(accel))`. Modifier order is
canonicalised to `Ctrl, Alt, Shift, Cmd` and then printed in the macOS glyph order `⌃⌥⇧⌘`, with
`KEY_GLYPHS` supplying the arrows and `⌫`. Re-derived by hand from those three functions:

| keymap id | accelerator in the entry | normalized | `keyDisplay` | code points |
| --- | --- | --- | --- | --- |
| `redline.next` | `Alt+Down` | `Alt+Down` | **⌥↓** | U+2325 U+2193 |
| `redline.prev` | `Alt+Up` | `Alt+Up` | **⌥↑** | U+2325 U+2191 |
| `redline.rewind` | `Alt+Backspace` | `Alt+Backspace` | **⌥⌫** | U+2325 U+232B |
| `redline.undo` | `Shift+Alt+Backspace` | `Alt+Shift+Backspace` | **⌥⇧⌫** | U+2325 U+21E7 U+232B |

Two notes. The undo entry is written `Shift+Alt+Backspace` in the keymap and normalises to
`Alt+Shift+Backspace`; the display is `⌥⇧⌫` either way, and the view already draws that string in its
undo sentence (`RedlineDocument.tsx:336`). And the house already has the chip to draw them in: `.key`
in `src/renderer/styles/globals.css:372-386` — inline-flex, 18px tall, `--bg-raised`,
`--text-secondary`, `--font-ui`, tokens only, and the file's own comment says why it is sans and not
mono. **A chip that wants to be 24px per WCAG 2.2 (research 83 D.2 measured the in-flow button at
20.15px, under the target) sizes its TARGET to 24px; it does not restyle `.key`.**

---

## 4. THE PARENT LAYOUT READING — the number the chip must not move

One Electron, one window, `innerWidth` 1440, `devicePixelRatio` 2, `prefers-reduced-motion: reduce`
emulated. A ten-line prose file committed as the baseline, then eight scattered replacements written
over it from a plain shell, opened as a diff and switched to Redline through the real segmented
control. The composer drew **15 changes** over **40 leaves**, being 16 `same` spans, 9 `del` and 15
`ins`.

### 4.1 The document, at both widths

| | wide | narrow |
| --- | --- | --- |
| `.ed-panel` clientWidth | **871px** | **319px** |
| `.ed-redline-doc` rect (x, y, w, h) | **726.09, 110, 556.81, 411.13** | **1121, 110, 319, 582.69** |
| `scrollHeight` / `offsetHeight` | 411 / 411 | 583 / 583 |
| computed `max-width` | 556.816px | 556.816px |
| `font-size` / `line-height` | 13px / 21.45px | 13px / 21.45px |
| `padding` top / left | 20px / 24px | 20px / 24px |
| `white-space` | `pre-wrap` | `pre-wrap` |
| free space left of the column | **157.09px** | **0.00px** |
| free space right of the column | **157.09px** | **0.00px** |
| line boxes holding a mark | 7 | 11 |
| `<button>` in the document | **0** | **0** |
| `[data-redline-tag]` in the document | **0** | **0** |
| document `outerHTML` length | 4711 | 4711 |

The narrow width reads 319px because the divider's `Home` clamps to `EDITOR_MIN`, which is 320
(`chrome-geometry.ts:97`), and `.ed-panel` carries a `border-left: 1px` (`editor.css:18`) that
`clientWidth` does not count. Four `ArrowRight` steps were
dispatched afterwards and did not take, so **the narrow reading is at the panel's own floor rather
than at research 83's 380px** — which is the harder case, not the easier one.

**`0.00px` of free space at 319px is research 83 D.3 option 4's margin refusal, re-measured on the
real view rather than on a harness page.** A margin control has nowhere to be at the floor. The
refusal stands and this phase does not re-open it.

### 4.2 The document does not move on its own

The wide reading was taken three times in one session: at rest, again after a whole-document copy,
and again after the pane was squeezed to 319px and put back with `End`. **All three are byte
identical** — the same `x`, `y`, `w`, `h` to two decimal places, the same `scrollHeight`, the same
margins, the same 15 changes with the same rectangles. That repeatability is what makes the
before-and-after comparison the phase's independent method meaningful: any difference the verifier
finds after the chip lands is the chip's.

### 4.3 Every change's `getClientRects()[0]`, wide

`i` is the wrapper's `data-change`. `first` is `getClientRects()[0]`. `union` is
`getBoundingClientRect()`. All numbers are CSS pixels to two decimal places.

| i | del → ins | rects | line boxes | first (left, top, w, h) | union (left, top, w, h) | union.left − first.left |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `keeps` → `holds` | 2 | 1 | 788.31, 133, 37.95, 15 | 788.31, 133, 72.98, 15 | 0.00 |
| 1 | `alive` → `open` | 2 | 1 | 950.91, 133, 29.52, 15 | 950.91, 133, 61.84, 15 | 0.00 |
| 2 | `closing` → `quitting` | 2 | 1 | 750.09, 154.45, 45.23, 15 | 750.09, 154.45, 93.52, 15 | 0.00 |
| 3 | `window` → `app` | 2 | 1 | 870.34, 154.45, 47.89, 15 | 870.34, 154.45, 72.71, 15 | 0.00 |
| 4 | → `that is ` | 1 | 1 | 784.09, 218.78, 42.99, 15 | 784.09, 218.78, 42.99, 15 | 0.00 |
| 5 | → `the ` | 1 | 1 | 865.23, 218.78, 25.16, 15 | 865.23, 218.78, 25.16, 15 | 0.00 |
| 6 | `disposable client` → `throwaway viewer` | 2 | 1 | 870.82, 283.12, 104.17, 15 | 870.82, 283.12, 213.63, 15 | 0.00 |
| 7 | `gets` → `stays` | 2 | 1 | 1115.58, 283.12, 28.45, 15 | 1115.58, 283.12, 62.13, 15 | 0.00 |
| 8 | → `the ` | 1 | 1 | 907.65, 347.45, 25.16, 15 | 907.65, 347.45, 25.16, 15 | 0.00 |
| 9 | → ` one` | 1 | 1 | 960.76, 347.45, 28.05, 15 | 960.76, 347.45, 28.05, 15 | 0.00 |
| 10 | ` and` → `,` | 2 | 1 | 950.58, 433.23, 28.1, 15 | 950.58, 433.23, 33.89, 15 | 0.00 |
| 11 | → ` and a power cut` | 1 | 1 | 1038.53, 433.23, 102.46, 15 | 1038.53, 433.23, 102.46, 15 | 0.00 |
| **12** | `comes back` → `returns` | **3** | **2** | **1185.82, 433.23, 44.7, 15** | **750.09, 433.23, 480.43, 36.45** | **−435.73** |
| 13 | `its` → `the whole` | 2 | 1 | 858.23, 454.68, 16.39, 15 | 858.23, 454.68, 77.27, 15 | 0.00 |
| 14 | → ` intact` | 1 | 1 | 1016.68, 454.68, 39.95, 15 | 1016.68, 454.68, 39.95, 15 | 0.00 |

### 4.4 Every change's `getClientRects()[0]`, narrow (319px)

| i | rects | line boxes | first (left, top, w, h) | union (left, top, w, h) | union.left − first.left |
| --- | --- | --- | --- | --- | --- |
| 0 | 2 | 1 | 1183.22, 133, 37.95, 15 | 1183.22, 133, 72.98, 15 | 0.00 |
| 1 | 2 | 1 | 1345.82, 133, 29.52, 15 | 1345.82, 133, 61.84, 15 | 0.00 |
| 2 | 2 | 1 | 1311.2, 154.45, 45.23, 15 | 1311.2, 154.45, 93.52, 15 | 0.00 |
| 3 | 2 | 1 | 1168.16, 175.89, 47.89, 15 | 1168.16, 175.89, 72.71, 15 | 0.00 |
| 4 | 1 | 1 | 1145, 261.67, 42.99, 15 | 1145, 261.67, 42.99, 15 | 0.00 |
| 5 | 1 | 1 | 1226.14, 261.67, 25.16, 15 | 1226.14, 261.67, 25.16, 15 | 0.00 |
| **6** | **3** | **2** | **1265.73, 347.45, 70.13, 15** | **1145, 347.45, 190.85, 36.45** | **−120.73** |
| 7 | 2 | 1 | 1319.64, 368.9, 28.45, 15 | 1319.64, 368.9, 62.13, 15 | 0.00 |
| 8 | 1 | 1 | 1302.55, 433.23, 25.16, 15 | 1302.55, 433.23, 25.16, 15 | 0.00 |
| 9 | 1 | 1 | 1355.66, 433.23, 28.05, 15 | 1355.66, 433.23, 28.05, 15 | 0.00 |
| 10 | 2 | 1 | 1345.48, 561.91, 28.1, 15 | 1345.48, 561.91, 33.89, 15 | 0.00 |
| 11 | 1 | 1 | 1184.8, 583.35, 102.46, 15 | 1184.8, 583.35, 102.46, 15 | 0.00 |
| **12** | **3** | **2** | **1332.09, 583.35, 44.7, 15** | **1145, 583.35, 231.8, 36.45** | **−187.09** |
| 13 | 2 | 1 | 1253.13, 604.8, 16.39, 15 | 1253.13, 604.8, 77.27, 15 | 0.00 |
| **14** | **2** | **2** | **1411.59, 604.8, 4.59, 15** | **1145, 604.8, 271.17, 36.45** | **−266.59** |

### 4.5 The mandatory rule, driven on the real view — and it is WORSE than research 83 said

Research 83 D.3 measured a wrapped change's union rect sitting **239.29px** to the left of where the
change starts, on a harness page at a 380px pane, and made one rule mandatory: **anchor to
`getClientRects()[0]`, never to `getBoundingClientRect()`.** Driven here on the shipped view inside
the real `EditorPanel` tree:

- **At the WIDE pane, 871px, change 12 wraps and its union rect sits 435.73px to the left of where the
  change starts.** A chip anchored on the bounding box would point at empty margin nearly half a
  column away — **at the pane a person actually works in**, not only at a squeezed one. The wrapped
  change is not a narrow-pane problem; a wider column means a longer wrap-back.
- **At 319px, three of fifteen changes wrap**, at −120.73, −187.09 and −266.59px.
- **`union.top − first.top` is 0.00px for every change at both widths**, and the union's height is
  36.45px against a fragment's 15px wherever it wraps. So the union's TOP is safe and its LEFT is not,
  which is exactly the shape of the rule.
- A change that wraps is exactly a change whose rects carry **more than one distinct `top`**. That is
  the test to write, and it is not `rects.length > 1`: **ten of the fifteen wide changes have two or
  three rects on ONE line box**, because a wrapper holding a `<del>` and an `<ins>` fragments its
  inline box around them.

**A second finding falls out of that last line and research 83 did not state it.**
`getClientRects()[0]` is the right ANCHOR POINT — where the change starts — but **it is not the
change's extent, even on an unwrapped change**. Change 0 is the clearest: `rects[0]` is 37.95px wide,
being the struck `keeps` alone, while the change's line spans 72.98px through `holds`. A chip placed
at `rects[0].right` would sit **between the deletion and the insertion, mid-change**. A chip that
wants to sit AFTER the change must take the union of the rects sharing `rects[0].top`, and a chip
that wants to sit BEFORE it takes `rects[0].left`. Either is fine; guessing is not.

### 4.6 What a copy of the whole document gives

Taken through the SHIPPING handler: a real selection of every child of `.ed-redline-doc`, then a
`copy` event carrying a `DataTransfer` of its own dispatched at the scroller, then what the handler
wrote into it read back. **Limit, stated rather than hidden: this does not touch the system
pasteboard.** `probe-p194-redline-view.mjs` already proves that half by running the window's own Copy
command and reading the pasteboard in main; this run deliberately leaves the operator's clipboard
alone.

| | wide | narrow |
| --- | --- | --- |
| the handler took the event | **true** | **true** |
| `Selection.toString()`, the interleaved reading the handler replaces | 679 chars | 679 chars |
| what the handler wrote | **619 chars** | **619 chars** |
| equal to the working file byte for byte | **true** | **true** |

619 is the working file exactly. The 679-character reading is what the browser would have written
unaided, being both sides interleaved; the nine `del` leaves total 61 characters, and
`Selection.toString()` comes back one short of 619 + 61, which is the trailing newline it drops and
is not a finding. **This 619-character string
is the second number the chip must not move**, and it is the reading that catches a chip whose glyphs
leak into the clipboard: research 83 D.2 measured an untagged in-flow button producing
`…when the window is closed**rewind**. This release…`.

### 4.7 The projection property, off the live DOM at the parent

Taken from the document's leaves as `redline-shot-probe.ts`'s `leavesOf` reads them, at both widths:

- every leaf that is not an `INS`, concatenated → **the baseline, byte for byte** ✓
- every leaf that is not a `DEL`, concatenated → **the working file, byte for byte** ✓

This is the property `p225-redline-projection.test.tsx` and `p227-redline-changes.test.tsx` pin under
`npm test` and research 83 D.1 took off the live DOM. **It holding here at the parent is what makes it
evidence when it holds again after the chip**: a chip inside the document would break it, and that is
the whole reason the chip goes outside.

---

## 5. The gates at the parent, so a later red one is the phase's

Run in this worktree at `cceb7bd6`, before a line was changed.

| Gate | Result | Log |
| --- | --- | --- |
| `npm run conformance:redline` | **every rule passed** — 16 rules, 14 redline files scanned against a floor of 14, 9 of 9 planted redline sets behaved, 7 of 7 rule-8 ablations moved their arm's reading | `.p236/out-conformance-redline-parent.txt` |
| `npx vitest run src/renderer/editor` | **35 files, 360 tests, all passed**, 1.01 s | `.p236/out-vitest-editor-parent.txt` |
| `npm run build` | **exit 0**, and its last line is `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte` | — |

**Rule 9's floor is 14 and the derived set is 14 today.** Adding a redline file — a chip component, a
chip module — can never turn the gate red; the floor moves only if one is deleted or renamed, in the
same commit, per the gate's own rule. **A new file whose name does not begin `redline`, `Redline`,
`rewind` or `baseline` is invisible to rule 9**, which is the gate's stated limit, so a chip module
should be named into the prefix (`redline-chip.tsx`) rather than out of it, or the phase inherits a
scanner blind spot the Phase 227 verifier already walked past twice.

---

## 6. What this measure step did NOT verify

Named so a builder does not read absence as permission.

- **A scrolled document.** The fixture fit its scroller at both widths
  (`scrollHeight === clientHeight === 739`), so nothing here says how a chip anchored outside the
  scrolling box behaves when the person scrolls. §1.4 limit 1 is unmeasured and the app run owes it.
- **The system pasteboard.** §4.6 reads the handler's own `DataTransfer`, not the clipboard.
- **A chip at all.** Nothing was built and nothing was drawn; every "after" number is the phase's to
  take.
- **The Edit menu drawn.** §2.2 reads Electron's documented behaviour and this tree's two existing
  records of it. No menu was photographed and no `sublabel` was rendered, so which of the two ways
  actually draws on macOS 15.7.9 is the app run's reading, not this document's.
- **380px.** The narrow reading is 319px because the divider's `ArrowRight` steps did not take after
  `Home`. The floor is the harder case, so this is a strengthening rather than a gap, but the exact
  380px figure research 83 used was not reproduced.
- **A wrapped change under `focus()`.** Chromium paints one focus box per fragment (research 83 D.3);
  that was not re-measured here.

---

## 7. What a builder should carry out of this document

1. **The chip lives outside `.ed-redline-doc`**, as a third child of `.ed-redline-view`, which is the
   only positioned box in the view. Four readers draw that boundary and §1.4 names each.
2. **Anchor on `getClientRects()[0]`.** The union rect is 435.73px wrong at the wide pane on this
   fixture. And `rects[0]` is the anchor point, not the extent — §4.5's second finding.
3. **The chip must not take focus**, or `focusedChange` answers null and the press does nothing while
   `moveFocus` jumps to the first change. §1.2 gives the two ways out.
4. **`⌥↓ ⌥↑ ⌥⌫ ⌥⇧⌫`**, from `keyDisplay`, never typed. `.key` is the chip the house already has.
5. **The Edit rows cannot carry a real accelerator on macOS.** `sublabel` or the label; say which, and
   prove it drawn.
6. **The menu-state push is `ui:sessionsPosition`'s shape**, and it moves the contract baseline, which
   is regenerated in the same commit or `npm run build` goes red.
7. **The three numbers to hold before and after**: the document rect `726.09, 110, 556.81, 411.13`,
   every change's first client rect in §4.3, and the 619-character copy. All three were taken three
   times in one session and did not move.
