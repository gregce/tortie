# Phase 298 — the builder contract

**This file is derived from `docs/BACKLOG.md`'s Phase 298 entry (`grep -n "^## Phase 298 " docs/BACKLOG.md`).
The ENTRY IS AUTHORITATIVE. Where this file and the entry disagree, the entry wins and the builder says so
in its report.** Everything below is either copied from the entry or read out of the tree at
`be0c22aa`, with the `file:line` said so a builder can check it. Where the entry gives no number, this
file says **MEASURE** and names the command.

Seven builders work in one worktree at once. **Edit only the files §2 gives you.**

---

## §1 The phase, copied from the entry

**Subject.** `fix(sessions): the session manager's rows on the app's own scale`

**First body line.** `Phase 298: one row scale, one type scale, one icon scale`

**Semver.** Patch. The sheet Phase 293 built shows 9 managed rows where the window has room for 17, draws
its second line in a 10px step whose own token says "never body text", draws its agent mark at a size that
appears nowhere else in the codebase, and has not one transition in either of its stylesheets while every
comparable row in Tortie eases. After this, a 900px sheet holds 17 managed rows and 19 past ones, every
size in it is a size the app already draws, and a row under the pointer fades the way the session rail and
the SCM list fade. No verb changes, no column is added or removed, and no hit area gets smaller.

**Tier 2**, with two floors raised inside the budget: the operator reported it personally, so the
**parent-commit measurement at `f6c11f57` is mandatory**, and the independent method is **re-derivation** —
a verifier computes each row's height from the cascade with its own reader and compares the sum to the
rectangle the app draws. The clipping attack rides in the same app run.

**The one rule that decides every number below:** *row height = tallest child + 2 × `--space-n`*. The
tallest child any row in this sheet carries is a 28px `.btn` (`src/renderer/styles/globals.css:127`, a
literal there), so the row is `28 + 2 × var(--space-3)` = **40**.

---

## §2 File ownership

No file appears twice. A file not in your row belongs to somebody who is editing it right now.

| | Builder | Files |
|---|---|---|
| **A** | the sheet's stylesheet | `src/renderer/session-manager/session-manager.css` |
| **B** | the panels' stylesheet | `src/renderer/session-manager/session-manager-panels.css` |
| **C** | the components | `src/renderer/session-manager/ManagedGrid.tsx`, `SessionManagerSheet.tsx`, `PastList.tsx` |
| **D** | the words and the projection | `src/renderer/session-manager/copy.ts`, `projection.ts`, `view.ts` |
| **E** | the gates | `src/renderer/session-manager/__tests__/p293-css-tokens.test.ts`, `build/p293/conformance-manager.mjs`, `build/p293/ablation.mjs`, `build/p293/manager-conformance-probe.mts` |
| **F** | the proof and the documents | `build/p293/probe-p293.mjs`, `docs/DESIGN-SPEC.md`, `build/p293/SPEC.md` |
| **G** | the toast host | `src/renderer/app/Toasts.tsx`, and the `.toasts` rules inside `src/renderer/styles/app.css` |

**ENTRY/PROMPT DEFECT 1.** The prompt says builder G owns `src/renderer/app/app.css`. **There is no such
file.** `.toasts` is at `src/renderer/styles/app.css:2106` (`.toast` at `:2116`, `.toast-text` at `:2158`,
`.toast-sticky .toast-text` at `:2181`, `.toast-overflow` at `:2185`). G owns those rules and nothing else
in that 2,200-line file.

**ENTRY/PROMPT DEFECT 2.** Rough edge 2 requires `src/renderer/session-manager/__tests__/p293-copy.test.ts`
to move in the same commit (it pins `small: 'Replies not recorded'` at `:481`). **No builder's row holds
it.** It is assigned to **D**, who owns the function it tests; E must not touch it.

### Ownership of the entry's items

Every mechanism item and every rough edge has ONE primary owner: the builder whose absence leaves the item
undone. A CSS-and-TSX item names its second half, and the second half is that builder's obligation.

| Entry item | Primary | Second half |
|---|---|---|
| Mechanism 1, the 40px row | A | — |
| Mechanism 2, one name size | A | C (no class change needed; `.sm-name strong` stays a `strong`) |
| Mechanism 3, one secondary field | A | C (`<small className="sm-cell-small">` at `ManagedGrid.tsx:103`, `:316`, `:240`) |
| Mechanism 4, the heading idiom | A | — |
| Mechanism 5, the titles | A | C (`sm-state-heading` / `sm-state-body` classes, `SessionManagerSheet.tsx:157-158`) |
| Mechanism 6, the chip primitive | C (`chip-sm` on `SessionManagerSheet.tsx:196` and `ManagedGrid.tsx:80`) | A (drops the two literal paddings) |
| Mechanism 7, the transitions | A | — |
| Mechanism 8, one icon-button vocabulary | C (`icon-btn` at `ManagedGrid.tsx:205`, `SessionManagerSheet.tsx:496`, `:505`, `:530`) | A (`.sm-icon-btn` keeps placement, size, hover) |
| Mechanism 9, the icon sizes | C | — |
| Mechanism 10, the tab underline | A | — |
| Mechanism 11, the focus rules | A (`.sm-select:focus-visible`) | B (deletes `panels.css:114-120`, keeps `.sm-rename-input`/panel-button rings to the global) |
| Mechanism 12, the keyboard cursor | A | — |
| Mechanism 13, declared not changed | A (the comments) | — |
| Mechanism 14, the breakpoint | A | E (the unit case that narrow ≤ wide) |
| Mechanism 15, the skeleton | A | — |
| Mechanism 16, the derived numbers | A (the block, `--sm-head-h`, `--sm-actions-min`, `--sm-past-identity-min`) | B (`scroll-margin-top`, `144px`, `96px`/`320px`) |
| Mechanism 17, classes for four bare selectors | C | A (the four rules) |
| Mechanism 18, the new gate rules | E | F (`build/p293/SPEC.md` §2.2) |
| The one reversal (`saved-output-*`) | B | — |
| Rough edge 1, the docked toast | G | C (the outlet element), A (`.sm-toasts` strip) — §5 |
| Rough edge 2, `0+` beside `No messages yet` | D | E (the probe's cell fixture), F (§3.4's table) |
| Rough edge 3, a sort at 300 sessions | C | — |
| Rough edge 4, a machine named twice | D (the shorter sentence in `copy.ts`) | C (`PastList.tsx:146` reads D's export, not `machines-copy.ts`) |
| Rough edge 5, `Nothing saved` | D (the label) | C (`endedSmall`, `ManagedGrid.tsx:124-131`) |
| Rough edge 6, `— / Shell` on a remote shell | F (§3.4's table) | E (the driven case) — **no product code changes and no word a person reads changes** |

### The three seams that are not §5's

1. **`--sm-head-h` (A defines, B consumes).** `panels.css:36`'s `scroll-margin-top: 60px` becomes
   `calc(var(--sm-head-h) + var(--space-6))`. **The entry names `--sm-head-h` as if it existed; it does
   not** — `session-manager.css:33-59` has no such property. A adds it (§3). B may not land before A.
2. **The Past row's inline parts (D composes, C draws, A styles).** Inline rule 3 makes the folder the
   field that gives way and rule 5 makes the removal date content-sized, so the folder and the promise
   cannot stay inside one joined string. `copy.ts:760-768`'s `pastRowSmall` returns
   `{ agent: string; folder: string | null; promise: 'continues' | 'fresh' | null; tombstone: string | null }`
   instead of a joined line, and D keeps the joined form exported under its current name for
   `p293-copy.test.ts`'s existing rows OR moves those rows; C draws one span per part inside
   `.sm-name-line`. **`conformance:manager` T16 reads `PastList.tsx` as TEXT between `function smallOf` and
   `function promiseOf` (`build/p293/conformance-manager.mjs:560-596`)**: `smallOf` must keep its name, must
   still call `displayPath(session.cwd)`, must still ask `!underHead`, must contain no `.split(`, `.slice(`,
   `.pop(` or `basename`, must not name `group.label` or `group.machineLabel`, `promiseOf` must remain the
   next function, and `title={row.session.cwd}` must stay in the file (`PastList.tsx:123`).
3. **`NOTHING_SAVED` (D exports, C reads).** `endedSmall` returns it where it returns `null` today;
   `NOTHING_TO_RESTORE_TITLE` (`copy.ts:195`) stays the hover.

---

## §3 The geometry block, written out

**BEFORE — `src/renderer/session-manager/session-manager.css:33-59`, read from the tree:**

```css
.modal.session-sheet {
  --sm-width: 1180px;
  --sm-gutter: 48px;
  --sm-title-h: 52px;
  --sm-toolbar-h: 47px;
  --sm-select-col: 46px;
  --sm-check-target: 32px;
  --sm-check-box: 14px;
  --sm-icon-btn: 28px;
  --sm-session-min: 155px;
  --sm-name-max: 175px;
  --sm-actions-min: 170px;
  --sm-past-state: 145px;
  --sm-past-row: 64px;
  --sm-skeleton-row: 62px;
  --sm-state-pad: 70px;
  --sm-state-max: 540px;
  width: min(var(--sm-width), calc(100vw - var(--sm-gutter)));
  /* … the eight layout declarations at :50-58 do not move … */
}
```

**AFTER — builder A produces exactly this. Every comment below is required; the ones on unchanged
properties are not added.**

```css
.modal.session-sheet {
  --sm-width: 1180px;
  --sm-gutter: 48px;
  --sm-title-h: 52px;
  --sm-toolbar-h: 47px;
  /* THE ROW, and every row in this sheet is this one number. 28px is `.btn`'s
     own height (styles/globals.css:127, a literal there too) and the tallest
     child any row here carries: the primary button, the ellipsis and — inside
     the 40 with 4px to spare — the 32px check target. `--space-3` is the
     padding above and below it. It is written as the sum and not as `40px`
     because 40 says nothing about what decides it: a later round that wants a
     shorter row has to shorten the button first. 32px rows would have RENDERED
     at 40 and 44 with a declared 32 no browser draws, and 28px rows put the
     2px outer focus ring wholly outside the row, where `.sm-scroll`'s
     unreachable block-start overflow cuts it and the sticky `thead` paints
     over it. */
  --sm-row-h: calc(28px + 2 * var(--space-3));
  /* The sticky column heading: one `--lh-xs` line box in the row's own
     padding. 44px before this phase. `scroll-margin-top` in
     ./session-manager-panels.css reads this, which is what 60px always was —
     the sticky heading plus a gap. */
  --sm-head-h: calc(var(--lh-xs) + 2 * var(--space-3));
  --sm-select-col: 46px;
  --sm-check-target: 32px;
  --sm-check-box: 14px;
  --sm-icon-btn: 28px;
  --sm-session-min: 155px;
  --sm-name-max: 175px;
  /* MEASURED, NEVER CHOSEN, the way app.css:198-220 records `.ptab-name`'s
     46px: canvas `measureText` on the live `.sm-name strong`, with that
     element's own computed font, over real session names. <N> is the reading
     from build/p293/probe-p293.mjs arm 11 on <date>; a later round
     re-measures rather than nudges it. It is NOT a row in
     `gate:tab-floor`'s table: that gate measures a different surface at a
     different size. */
  --sm-name-min: <MEASURE>px;
  /* Re-derived from what the cell actually holds — a `.btn.btn-sm` reading
     `End session…`, a 28px ellipsis and one `--space-3` gap — rather than the
     170px it was given. <N> is arm 11's reading of `.sm-row-actions`, rounded
     up to the 4px grid. */
  --sm-actions-min: <MEASURE>px;
  /* The Past row's identity block had `--sm-actions-min` as its flex basis,
     which is a different job under one name. It holds what the Managed
     Session cell holds, so it reads that cell's floor. */
  --sm-past-identity-min: var(--sm-session-min);
  --sm-state-pad: 70px;
  --sm-state-max: 540px;
  /* :50-58 unchanged */
}
```

**Deleted:** `--sm-past-state: 145px` (mechanism 16: the date is content-sized by inline rule 5),
`--sm-past-row: 64px` and `--sm-skeleton-row: 62px` (mechanism 1 and 15: both read `--sm-row-h`).

**The literals question.** The prompt allows one geometry literal. The block above already holds sixteen
(`session-manager.css:34-49`) and the sheet's own header at `:6-10` says geometry lives here as custom
properties; the two MEASURE values join them. No literal is added anywhere ELSE in either stylesheet, and
the `@media (max-width: 1100px)` keeps its 1100 with the comment mechanism 14 requires.

**The rules that consume the block (A):**

- `.sm-grid tbody td` (`:317-322`): `padding: var(--space-3) var(--space-5)`.
- `.sm-grid tr.sm-row`: `height: var(--sm-row-h)` — 6 + 28 + 6 in the actions cell, 6 + 20 + 6 = 32 in a
  text cell, so the declaration is what makes every row 40. Box 40, pitch **41** (`border-collapse:
  collapse` puts the hairline between two rows).
- `.sm-past-row` (`:540-548`): `min-height: var(--sm-row-h)`, `padding: var(--space-3) var(--space-8)`.
  **Only the vertical term moves.** The horizontal stays `--space-8` so the row stays aligned with its own
  group header at `:473`, and nothing in the entry derives a new horizontal term for it. Box 40, pitch
  **40** (`box-sizing: border-box` from `globals.css:13-15` puts the hairline inside the declared
  min-height).
- `.sm-grid thead th` (`:289-301`): `padding: var(--space-3) var(--space-5)` → 6 + 16 + 6 = **28**.
- `tr.sm-group > th` (`:464-470`) and `.sm-past .sm-group` (`:472-476`): `padding: var(--space-2)
  var(--space-8)` → 4 + 20 + 4 = **28**, pitch **29**.
- `.sm-foot` (`:631-640`): `padding: var(--space-3) var(--space-8)` → 6 + 16 + 6 + the 1px top border =
  **29**.
- `.sm-skeleton` (`:623-627`): `height: var(--sm-row-h)`; `.sm-loading` (`:611-616`) `gap: 0`.
- `.sm-past-state` (`:569-574`): `flex: 0 0 auto`, no `width`.
- `.sm-past-identity` (`:559-562`): `flex: 0 1 auto; min-width: var(--sm-past-identity-min)`.
- `@media (max-width: 1100px)` (`:645-653`): `td { padding: var(--space-3) var(--space-4) }` — the vertical
  term is the wide row's, so the narrow row can never be taller. The comment says the 1100 is a literal
  because a custom property is not readable in a media query.

**The sheet's arithmetic, which the probe refutes or confirms.** 900 − 52 − 47 − 29 = 772 of scroller;
Managed − 28 − 29 = 715 ÷ 41 = **17**; Past 772 ÷ 40 = **19**.

---

## §4 The type table

Old pairs read from the tree; `--text-2xs` 10/`--lh-2xs` 16, `--text-xs` 11/16, `--text-sm` 12/18,
`--text-base` 13/20, `--text-md` 15/22, `--text-lg` 20/28 (`styles/tokens.css:226-237`). "20 inh." is
`body { line-height: var(--lh-base) }` at `globals.css:55-61` inheriting as a LENGTH.

| Selector | file:line | Old | New | Why |
|---|---|---|---|---|
| `.sm-heading` | `sm.css:95` | `--text-md`, 20 inh. | `--text-lg` / `--lh-lg` | mech 5, `.modal-title` |
| `.sm-tab` | `:109` | `--text-sm`, 20 inh. | `--text-base` / `--lh-base` | mech 5, `.ptab`/`.stab` |
| `.sm-count` | `:145` | `--text-xs`, 20 inh. | **no font-size**: `.chip-sm` serves (`globals.css:345-349`); the rule keeps `min-width: 16px` (from `.ab-badge`, `app.css:494`), the ground and the colour | mech 6 |
| `.sm-select` | `:221` | `--text-xs`, none | `--text-sm` / `--lh-sm` | mech 5, `--view-field-text` |
| `.sm-selected` | `:249` | `--text-sm`, none | `--text-sm` / `--lh-sm` — size unchanged, the pair added | mech 18 |
| `.sm-selection-summary` | `:256` | `--text-xs`, none | `--text-xs` / `--lh-xs` — size unchanged | mech 18 |
| `.sm-grid` | `:278` | `--text-sm` | **deleted**; the grid inherits `body`'s `--text-base`/`--lh-base` | mech 2 |
| `.sm-grid thead th` | `:289` | `--text-2xs`, 20 inh., medium, no caps, no tracking | `--text-xs` / `--lh-xs`, `--weight-medium`, `text-transform: uppercase`, `letter-spacing: var(--track-caps)`; colour STAYS `--text-secondary` | mech 4; `.diag-table th` (`diagnostics.css:211-217`) for the type, `.section-header` (`app.css:707`) for the idiom. `--text-muted` is 4.15 on `--bg-raised` and is refused |
| `.sm-grid td > small` | `:324` | `--text-2xs`, **ratio 1.5** = 15, `display: block`, `margin-top: var(--space-3)` | **`.sm-cell-small`**: `--text-xs` / `--lh-xs`, `--text-secondary`, INLINE, `margin-left: var(--space-3)`, no `display: block`, no `margin-top` | mech 3 + 17 |
| `.sm-name small` | `:420` | `--text-2xs`, **ratio 1.5**, `margin-top: var(--space-1)` | the SAME `.sm-cell-small` rule; the two gaps were two spellings of one thing | mech 3 + 17 |
| `.sm-name strong` | `:412` | none (12 from the table) | `--text-base` / `--lh-base`, `--weight-medium` kept; `flex: 0 1 auto`, `min-width: var(--sm-name-min)`, `max-width: var(--sm-name-max)` | mech 2, inline rule 2 |
| `.sm-group-name strong` | `:498` | `--text-sm`, 20 inh., semibold | `--text-base` / `--lh-base`, semibold | it is what makes the 28px group header exact: 20 + 2 × `--space-2` |
| `.sm-group-count` | `:503` | `--text-xs`, none | `--text-xs` / `--lh-xs`; `--text-muted` stays (ground is `--bg-surface`) | mech 18 |
| `.sm-chip` | `:508` | `--text-2xs`, `padding: 1px 6px` | **no font-size and no padding**: `.chip-sm` serves; the rule keeps the border and the colour | mech 6 |
| `.sm-group-path` | `:525` | `--text-xs`, none | `--text-xs` / `--lh-xs` | mech 18 |
| `.sm-past-state` | `:569` | `--text-xs`, none | `--text-xs` / `--lh-xs` | mech 18 |
| `.sm-past-note` | `:576` | `--text-xs` / `--lh-xs` | unchanged | it is the one row allowed above 40px |
| `.sm-state-block h2` | `:598` | `--text-md`, 20 inh. | **`.sm-state-heading`**: `--text-lg` / `--lh-lg` | mech 5 + 17 |
| `.sm-state-block p` | `:605` | `--text-sm` / `--lh-base` | **`.sm-state-body`**: `--text-base` / `--lh-base` | mech 5 + 17, `.empty-body` |
| `.sm-loading-label` | `:618` | `--text-sm`, none | `--text-sm` / `--lh-sm` | mech 18 |
| `.sm-foot` | `:631` | `--text-2xs`, 20 inh. | `--text-2xs` / `--lh-2xs` — **kept at 10px deliberately: a footer is a footnote, which is what the step is for** | the pick table |
| `panels.css .sm-details-facts dt` | `p.css:145` | `--text-2xs`, none | `--text-xs` / `--lh-xs` | one of the entry's five prose users of the chip step |
| `panels.css .sm-details-facts dd` | `:151` | `--text-sm`, none | `--text-sm` / `--lh-sm` | mech 18 |
| `panels.css .sm-details-help` | `:158` | `--text-xs`, none | `--text-xs` / `--lh-xs` | mech 18 |
| `panels.css .sm-batch-targets li` | `:224` | `--text-sm`, none | `--text-sm` / `--lh-sm` | mech 18 |
| `panels.css .sm-batch-skipped` | `:258` | `--text-xs`, none | `--text-xs` / `--lh-xs` | mech 18 |

**The four bare-element selectors of mechanism 17 and their new classes:** `td > small` → **`.sm-cell-small`**;
`.sm-name small` → **`.sm-cell-small`** (one class, one rule); `.sm-state-block h2` →
**`.sm-state-heading`**; `.sm-state-block p` → **`.sm-state-body`**. The panels' `dt`/`dd` stay bare, as the
entry says.

**The pairing count, measured.** 21 declarations in the two stylesheets set a `font-size` with no
`line-height` (16 in `session-manager.css`, 5 in `session-manager-panels.css`), and two more set a RATIO.
The entry says twenty; the difference is `.sm-grid`, whose declaration mechanism 2 deletes rather than
pairs. After this phase every `font-size` in the domain is paired and `--text-2xs` appears once,
on `.sm-foot`.

---

## §5 The toast outlet seam

Read first: `src/renderer/app/Toasts.tsx` (77 lines), `SessionManagerSheet.tsx:641-663`,
`styles/app.css:2106-2190`, `src/renderer/app/App.tsx:301` and `:411`.

**Only `App.tsx:411`'s `<Toasts />` matters.** `:301` is inside the boot-block early return, which never
renders the rest of the app, so the sheet and that mount never coexist. **No builder edits `App.tsx`.**

**The outlet is a DOM contract, not a ref.** A shared ref would need a module both `../app/Toasts.tsx` and
the session-manager domain import, and an eager import from `app` into that domain pulls the lazily loaded
sheet (`session-manager/lazy.tsx`) into the first bundle. So:

- **C renders, inside `.sm-panel`, between `.sm-scroll`'s closing `</div>` (`SessionManagerSheet.tsx:652`)
  and `<footer className="sm-foot">` (`:654`):**
  `<div className="sm-toasts" data-sm="toast-outlet" />` — always present while the sheet is drawn, never
  conditional, so the host never races the sheet's own mount.
- **A styles it:** `.session-sheet .sm-toasts { display: flex; flex-direction: column; align-items:
  flex-end; gap: var(--space-4); flex: 0 0 auto; padding: var(--space-4) var(--space-8); }` and
  `.session-sheet .sm-toasts:empty { display: none; padding: 0; }` — empty it takes no height, so the 17
  and 19 row readings hold with nothing toasted.
- **G reads the store, not a prop:** `const docked = useApp((s) => s.sessionSheet !== null)` — `useApp` is
  already imported at `Toasts.tsx:17` and `sessionSheet` already exists, so **no new state and no new
  channel**. In a layout effect keyed on `docked`, G resolves
  `document.querySelector('[data-sm="toast-outlet"]')` into component state, and renders
  `createPortal(stack, outlet)` when `docked && outlet !== null`. `createPortal` from `react-dom` is the
  app's own idiom (`ProjectRail.tsx:33`, `SessionRail.tsx`, `HoverCard.tsx:22`).
- **The container's class is `toasts` plus `toasts-docked` only while it is portalled.** `.toasts`
  (`app.css:2106-2114`) is NOT edited; `.toasts-docked` is a new modifier beside it that undoes the
  fixed placement: `position: static; right: auto; bottom: auto; z-index: auto;`.
- **With no outlet present, Toasts.tsx draws EXACTLY where it draws today**: same element, same `.toasts`
  class, same `role="status" aria-live="polite"`, same three-visible / `+n more` rule, same order. That
  covers the boot-block mount, every surface that is not the sheet, and the frame between the sheet
  mounting and the effect running.

**`pointer-events: none` is refused.** Two reasons, and the second is the load-bearing one: it would break
the S10 pause-on-hover promise the entry names, and — measured in the tree — a sticky toast's only exit is
the × at `Toasts.tsx:61-70` and its action button at `:49-60`, while the store's only auto-dismiss is a
flat 5s timer with no hover pause (`src/renderer/state/notices-slice.ts:43`). With pointer events off, a
sticky error would be undismissable for the life of the window.

**The stated fallback, which G takes only if the outlet cannot be made to work:** bottom padding on
`.sm-scroll` equal to the stack's height, so the last row can always be scrolled clear (A's file, and G
says so in its report). **G MUST TRY THE OUTLET FIRST.** The fallback leaves the toast over the sheet and
only makes the row reachable; the outlet is what makes the toast cover nothing.

---

## §6 The new gate rules (builder E)

**The numbering.** `p293-css-tokens.test.ts` uses no rule numbers — it is four `describe` blocks of
`it()` cases. The highest numbered rule in E's file set is **T16**, in
`build/p293/conformance-manager.mjs:59-76`'s `TEXT_RULES`. The six new rules are therefore **T17 to T22**.

They go in **both** files, and this is deliberate: `ablation:p293` reddens a GATE RULE BY ID
(`build/p293/ablation.mjs:100+`, `rule: 'T…'`), so a rule that exists only as a vitest case cannot be
ablated; and the entry requires the test file to hold them for the fast local read. E writes the reader
once per file. **`conformance-manager.mjs` reads only `.ts`/`.tsx` today (`sourcesUnder`, `:91-108`)** — E
adds a stylesheet reader beside it; the test file already has one (`rulesOf`, `:69-88`, comments stripped).

| Rule | Asserts | File set | The ablation that must redden it |
|---|---|---|---|
| **T17** | no ratio line-height: every `line-height` value in the domain matches `/^var\(--lh-[a-z0-9-]+\)$/` or is `normal`. The 1.5 at `:328` and `:423` is the only one today and lands one pixel off `--lh-2xs` | every `*.css` under `src/renderer/session-manager/` | `.sm-cell-small`'s `line-height: var(--lh-xs)` → `1.5` |
| **T18** | every rule that sets `font-size` sets `line-height` in the same block | same | drop `line-height` from `.sm-cell-small` |
| **T19** | every value containing `var(--text-2xs)` sits on a selector matching `/\.sm-foot\|chip\|\.sm-count/` — the footer and a chip, nothing else. After this phase there is exactly ONE such declaration, `.sm-foot` | same | `.sm-past-state`'s `font-size` → `var(--text-2xs)` |
| **T20** | every `padding`, `padding-*`, `margin`, `margin-*`, `gap`, `row-gap`, `column-gap` value is composed only of `var(--space-*)`, a `var(--sm-*)` declared on `.modal.session-sheet`, `0`, `auto`, and `calc()` over those. **One named exception**, which must still match something: `.session-sheet .sr-only` (`:69-79`), whose `margin: -1px` is the app's visually-hidden clip idiom and not spacing | same | `.sm-grid tbody td`'s padding → `6px 12px` |
| **T21** | every rule that sets `text-transform: uppercase` also sets `letter-spacing: var(--track-caps)`. **One named exception**: a `::first-letter` selector — `.sm-state-label::first-letter` (`:439-441`) raises ONE letter and tracking it would add a space after it | same | drop `letter-spacing` from `thead th` |
| **T22** | every `size=` passed to `Codicon` or `AgentIcon` in the domain is one of `'sm'`, `'md'`, `'lg'`, `16`, `24`. Read from the AST, over `*.tsx` under the domain | `conformance-manager.mjs`'s existing `astOf`/`nodesOf` (`:112-138`) | restore `size={19}` on `ManagedGrid.tsx`'s `AgentIcon` |

**Also E's, and not a new numbered rule:** mechanism 14's unit case — the `@media (max-width: 1100px)`
`td` padding's vertical term is never larger than the wide rule's — and rough edge 2's cell fixture and
rough edge 6's driven case in `build/p293/manager-conformance-probe.mts`.

**Rough edge 6 changes no code and no word.** `messagesCell` (`copy.ts:328-329`) decides `shell` BEFORE
`remote`, on purpose; the driven case pins that a remote shell reads `— / Shell`, and F fixes §3.4's table
to match its own prose.

---

## §7 Arm 11's readings (builder F)

Arm 11 lives at `build/p293/probe-p293.mjs:690-706`; its grader is `geometryFindings` (`:172-181`) over
`TOOLBAR_H = 47`, `TITLE_H = 52`, `TOL = 0.5` (`:145-147`). `P293_ARMS=11` runs it alone;
`P293_PARENT_CHECKOUT` points the same run at `f6c11f57`.

**The control, and it must not move.** `filters.toolbar.height` **47**, `selection.toolbar.height` **47**,
`filters.titleHeight` **52**, at the parent and at HEAD. A reading that moves fails the arm. The entry
refuses shortening them: by the phase's own formula the token answer is 44, and that is named and refused
because they are the operator's geometry from the design study.

**F reads the new rectangles with its own `cdpEval` expression** (`cdpEval` is already imported at
`:129`), NOT by growing `src/renderer/app/p293-session-manager-drive.ts` — that renderer harness is in no
builder's file set this phase.

| Reading | How | Parent `f6c11f57` | HEAD |
|---|---|---|---|
| `tr.sm-row` box | `getBoundingClientRect().height` | **74** (not 73 — see A11) | **41** (not 40 — see A11) |
| `.sm-past-row` box | same | 64 | **40** |
| `.sm-skeleton` box | same | 62 | **40** |
| `thead th` box | same | 44 | **28** |
| `tr.sm-group > th` box | same | 40 | **28** |
| `[data-sm="foot"]` box | same | 45 | **29** |
| Managed pitch | distance between consecutive `tr.sm-row` tops | 74 | **41** |
| Past pitch | distance between consecutive `.sm-past-row` tops | 64 | **40** |
| Managed rows wholly inside `.sm-scroll`'s rect, sheet resolved to 900px tall, no toast up | count | 9 | **17** |
| Past rows, same window | count | 11 | **19** |
| `[data-manage-check]`'s label | `width`×`height` | 32×32 | **32×32**, never below the parent |
| `[data-manage-primary]` | `height` | 28 | **28** |
| the ellipsis, the title bar's two | `width`×`height` | 28×28 | **28×28** |
| every `.codicon` in the sheet | computed `fontSize` | holds 28 (`SessionManagerSheet.tsx:156`) | every value in {12, 14, 16, 24} |
| every `AgentIcon` wrapper | computed `width`/`height` | holds 19 (`ManagedGrid.tsx:234`) | 16 |
| a row's `transitionProperty` / `Duration` / `TimingFunction` | `getComputedStyle` | `all` / `0s` | `background` / `120ms` / `cubic-bezier(0.2, 0, 0, 1)` |
| the same three under `Emulation.setEmulatedMedia` forcing `prefers-reduced-motion: reduce` | same | `all` / `0s` | `transitionDuration` **1ms** — the proof the duration is a token (`tokens.css:657`) — and `transitionProperty` **`none`**, NOT `background`: `tokens.css:691-697` sets `transition-property: none !important` on `*` under that query, which is Phase 200's leak fix and its comment says why. An arm that expects `background` here fails on a correct build |

**`--sm-name-min` is measured, not chosen.** Inside arm 11, with the sheet open on Managed:

```js
const nameMin = await cdpEval(cdp, `(() => {
  const el = document.querySelector('.sm-name strong');
  if (el === null) return null;
  const cs = getComputedStyle(el);
  const font = cs.font && cs.font.length > 0
    ? cs.font
    : `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = font;
  const names = [ /* the run's own session names, read from the DOM */
    ...new Set(Array.from(document.querySelectorAll('.sm-name strong'), (n) => n.textContent ?? ''))
  ].concat(CORPUS);
  const per = names.map((n) => ({ name: n, four: ctx.measureText(n.slice(0, 4)).width }));
  return { font, ellipsis: ctx.measureText('…').width, per,
           widest: Math.max(...per.map((p) => p.four)) };
})()`);
```

`CORPUS` is the twelve real names at **`build/probe-p189-tabs.mjs:95-108`** (`extract-agentic-engineering`,
`gmux`, `test-prime-agent`, `getspecstory`, `runstory`, `tortiedotsh`, `deadreckon`,
`golden-storm-31-aug`, `get-stats`, `dev`, `herdr`, `rookery`). **ENTRY DEFECT 3: the entry calls this "the
Phase 137 corpus"; there is no name corpus under a `p137` name — Phase 189's probe is where the operator's
twelve live**, and `build/assert-tab-floor.mjs:97-121` is the gate that holds `FLOOR_PX = 46` derived from
them. The value written into `--sm-name-min` is `widest` plus the ellipsis width, rounded up to the 4px
grid, with the reading and the date in the comment. If the measurement proves unstable across runs, the
entry's stated fallback is a row in `gate:tab-floor`'s table rather than a chosen number.

**Nothing is clipped that must not be** (the attack, same arm): exactly three elements may ellipsis — the
session name, the group header's path, the Past row's folder — each carrying its whole value as a `title`,
**and the arm grades the set against the kinds the DRAWN TAB can hold rather than counting to three** (A13).
Every other text node reads `scrollWidth <= clientWidth + 1`, over `Replies not recorded`,
`Partial history`, `Session updated`, `Conversation saved`, `Nothing saved`, `Not applicable`,
`Unreachable` and a 60-character folder, at 1180px, at the 1100px breakpoint, and at
`calc(100vw - 48px)` on a 1024-wide window.

**Contrast** through `contrastOf` (`src/renderer/theme/hue.ts:87`), every text node against its nearest
painted ancestor, at rest and under the pointer and checked, on both bases by flipping `data-scheme` on
`<html>`. Every body text at or above 4.5; a disabled control's label is exempt and named. **The flip
freezes transitions first and the reading refuses a pair that mixes the two bases** (A12) — without the
freeze the flip reaches `color` and not `background`, and the arm reported eight contrast failures that
cannot happen.

**F's other two files.** `docs/DESIGN-SPEC.md` S15's geometry table (`:915-944`) — the rows that must move
are **Title** (`:921`), **Grid** (`:928`, drops `font-size: var(--text-sm)`), **Sticky headings**
(`:929`), **Data cell** (`:930`), **Session column** (`:933`, "agent mark 19px" → 16), **Group header**
(`:935`), **Inline panel** (`:937`, `scroll-margin-top`), **Batch panel** (`:938`, `144px`), **Past row**
(`:939`, `min-height: 64px` and the 145px slot), **State block** (`:940`, the 28px codicon and the 62px
skeletons), **Footer** (`:941`), **Narrow** (`:944`) — plus `build/p293/SPEC.md` §2.2 and §3.4. No build
story in either document.

---

## §8 What is NOT in this phase

Copied from the entry. A builder that widens the work past this list has broken the phase.

- **No new column and no new data.** The seven columns stay, the activity aggregate is untouched, and no
  channel is added, changed or read differently.
- **No change to what any verb does.** End, Remove, Restore, the batch loop, every gate in
  `sessionMenuItems()` and every re-check at the press are the same code; `conformance:manager`'s driven
  half must read exactly what it reads today.
- **No change to the Past order the operator ruled on.** One list in main's order, newest removal first,
  grouped under a project's heading only when the project filter names one project.
- **No change to any sentence a person reads**, with three named exceptions: the machine's name dropped
  from the refusal on a tombstoned row, `Nothing saved` in a slot that was empty, and `No messages yet`
  where `0+` contradicted the cell beside it. The state words, the confirmations and the batch report are
  byte-identical.
- **No new token.** `styles/tokens.css` is not edited, so nothing needs re-solving on the light base and no
  contrast floor moves.
- **No hit area smaller than today.** The 32×32 check target, the 28×28 icon buttons, the 28px primary
  button and the 2px focus ring keep their sizes, and the arm fails on any reading below the parent's.
- **The 52px title bar and the 47px toolbar do not move.** The token answer for both is 44 and it is
  refused here: they are the operator's own geometry, arm 11 pins them, and moving them would put a 6px
  change to the sheet's frame inside a phase about its rows.
- **No hover-revealed row actions**, no fifth selected-row treatment, no row radius, and no `:active`
  state: the sheet's fill-only selection and its permanent verbs are DECLARED in the file rather than
  changed (mechanism 13).
- **No `prefers-reduced-motion` block** in either stylesheet: `tokens.css:655-697` covers it app-wide,
  which is the reason to write the durations as tokens.
- **The state does not become a chip**, the machine is not repeated as text, and the promise sentence does
  not go inline — it becomes the ↺ mark the app already draws (`.srow-saved`,
  `session-rail.css:207-218`) with the sentence in the row's `title` and in the inline panel.
- **`conformance:hue` is out of the proof.** No token's value moves. If a builder adds a token or reaches
  for `--text-muted` on `--bg-raised` or `--bg-active`, it runs and the pairing is refused.
- **`gate:contract` untouched, `HELPER_USER_FLOOR` does not move.** No channel, no new script reaching
  `build/electron-run.mjs`.
- **No release.**

### One more ENTRY DEFECT, and builder B must not act on it

The entry's "One reversal" paragraph ends: *"The five duplicated type declarations beside them are deleted
and `saved-output.css` serves."* **It cannot serve.** Every rule in `src/renderer/app/saved-output.css` is
scoped to `.modal.saved-output-modal` (`:30`, `:40`, `:49`, `:58`, `:77`), which no node inside the sheet
carries — which is exactly what `panels.css:164-168`'s own comment says. Deleting the restated
declarations would drop the font size, the line height and the mono family inside the panel, a visible
regression against today, which the operator's standing no-regression rule forbids. **B keeps the block,
adds the missing comment the same paragraph asks for (the ground is `--bg-raised`, where `--text-muted` is
below the floor, so the flattening to `--text-secondary` at `:173`, `:181` and `:206` is correct and is not
a lost subordination), pairs the two unpaired sizes above, and reports the refusal.** If the operator wants
`saved-output.css` to serve both grounds, that is a change to a file no builder owns and its own entry.

---

## §As built

Written by the integrator after the seven builders, from the tree as it stands rather than from their
reports. Every entry is a place the build differs from §1 to §8 above, or from the entry, with the
reason. **The entry is still authoritative; where this section departs from it, it says so and says
why.**

### A1. The name cell was still two lines, and the row was 48 rather than 40

**The one defect that would have failed the phase's headline claim.** `NameButton` rendered a
`.sm-name-text` flex COLUMN holding `.sm-name-line` over the `<small>`, and builder A's
`.sm-name-text` rule kept `flex-direction: column`. So the Session cell was 20 + 16 + 2 ×
`--space-3` = 48, and `tr.sm-row`'s `height` is a MINIMUM on a table row, which cannot pull a cell
back down. Mechanism 3 says the secondary field is drawn **inline**; nothing was inline.

Builder F found it by reading both files and named it; neither file was F's. The integrator moved the
`<small>` inside `.sm-name-line` and **deleted the `.sm-name-text` wrapper and its rule outright**,
because a single-child column is the same landmine one commit later. `.sm-name-line`'s own
`gap: var(--space-3)` is now the inline gap the mechanism names, and A's
`.sm-name-line .sm-cell-small { margin-left: 0 }` — written for exactly this shape — finally matches
something.

### A2. `.sm-past-identity` keeps its flex BASIS, against §3

§3 asked for `flex: 0 1 auto; min-width: var(--sm-past-identity-min)`. **The entry wins and it is
mechanical.** Mechanism 16 says the 170px had "its second job as the Past row's `flex-basis`" and
that this phase gives that job "its own name" — a rename, not a change of kind. §3 turned the basis
into `auto` with the number moved to `min-width`, and `.sm-past-row` is `flex-wrap: wrap` (it has to
be: `.sm-past-note` is `flex: 1 0 100%`). A flex line BREAKS on its items' base sizes before anything
shrinks, so with a basis of `auto` a long folder makes the identity block's base size the whole line,
`.sm-row-actions` wraps below it, and the 40px row is two rows tall. As built it is
`flex: 1 1 var(--sm-past-identity-min)` with **no `min-width`**: a flex item's automatic minimum is
its content-based minimum, which here is the name's own measured floor plus the marks beside it, and
that is the floor that should hold rather than a number. `.sm-past-state` accordingly lost the
`margin-left: auto` builder A added, because a growing identity block already takes every pixel of
slack.

### A3. The give-way field is the joined secondary line, scoped to the Past row

Inline rules 3 and 6 want the FOLDER to be the field that gives way and to truncate from the right.
As built, the whole secondary line is one `.sm-cell-small` element and **that element** is the field
that gives way — `flex: 0 100 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis` — at a
shrink factor an order of magnitude above the name's `flex: 0 1 auto`, which is the ordering
`search.css:328-333` measured. `white-space: nowrap` is on the class for both surfaces and is
load-bearing rather than decoration: `.sm-past-row` sets none of its own, and a secondary line that
wraps makes the 40px row 56.

The ellipsis is **scoped to `.sm-past-row`** on purpose. In the grid the same class draws the agent's
short label in a cell `table-layout: auto` has already made as wide as its content, so there is no
pressure on it and nothing to hide, and leaving the ellipsis off there keeps the grid's own promise
that a long honesty word WIDENS the table and scrolls `.sm-scroll` sideways rather than being cut.

`NameButton` gained one optional prop, `smallTitle`, which PastList passes and the grid does not: a
line that can be truncated says all of itself on hover, which the entry's clipping clause requires,
and a hover repeating a word a person can already read is noise. `.sm-past-identity`'s own
`title={row.session.cwd}` is untouched, so `conformance:manager` T16 still reads what it read.

### A4. The per-part split and the ↺ mark are DEFERRED, and the documents were corrected to say so

§2.3's seam 2 asked builder C to draw one span per part inside `.sm-name-line`; C did not, and asked
the integrator to assign it with names fixed in writing or record it as deferred. **It is deferred**,
and builders F's two documents — which had already been written as though it were built — were
corrected by the integrator rather than left describing a shape the tree does not have.

The reason is the entry's own: the split only earns its keep together with turning the promise into
the ↺ mark `.srow-saved` draws, with the sentence in the hover and the inline panel, and **that takes
`Starts fresh` off a resting row — a fourth change to what a person reads, where the entry's "What is
NOT in this phase" allows three and names them.** The entry asks for both things and its refusal list
forbids one of them; the integrator took the refusal list, because it is the half the operator's
standing no-regression rule points at. Nothing measured by this phase depends on it: the 40px row,
the 41 and 40 pitches and the 17 and 19 row counts are all decided by the row's own padding and its
tallest child.

What the follow-up needs, so it is not re-derived: a four-part answer (agent, folder, promise,
tombstone), which `PastList.tsx`'s `promiseOf` computes and collapses into one `detail` string before
`copy.ts` ever sees it; a named class per part so A's rules can match them; and a prop reshape on a
`NameButton` the Managed grid shares. Builder D's `pastRowSmallParts`, an identity repackaging of the
same three arguments that nothing called, was **removed** in the same pass: it is not that seam.

### A5. Builder A's three unrendered rules were deleted

`.sm-name-folder`, `.sm-name-slack` and `.sm-name-mark` matched no element in the tree, because they
are A4's deferred shape. Dead CSS naming a shape the DOM does not have is what a later round builds
back by accident, so they are gone; their reasoning survives on the rules that replaced them and in
A3 and A4 above.

### A6. The three test files no builder owned

§2 gives `p293-sheet-render.test.tsx` and `p293-projection.test.ts` to nobody, and its own DEFECT 2
gives `p293-copy.test.ts` to D, whose prompt then forbade editing a test file. The integrator moved
all three:

- `p293-sheet-render.test.tsx`: 13 failing cases, every one a literal HTML string that gained a class
  — `<small class="sm-cell-small">`, `<h2 class="sm-state-heading">`, `<span class="chip-sm
  sm-count">` — plus the tombstone sentence. **And two assertions that had become vacuous**, which
  matters more than the red ones: `expect(state('e2')).not.toContain('<small>')` and the same for
  `e3` could never fail again once every `<small>` carried a class, and the first of them was the
  only thing guarding the slot rough edge 5 fills, so `Nothing saved` had landed reddening nothing.
  They now read `not.toContain('<small')`, and `e2` — local, exited, nothing kept — asserts
  `Nothing saved`. The three Past-row reads are `<small class="sm-cell-small"[^>]*>` so the class
  stays pinned while A3's `title` is tolerated; the Managed reads keep the exact closing form.
- `p293-projection.test.ts`: one case pinned the Past Restore hover as
  `tombstoneRestoreRefused('Old Mini')` and now reads `copy.TOMBSTONE_RESTORE_REFUSED`.
- `p293-copy.test.ts`: needed no change and gained one case anyway, because rough edge 2's clause was
  otherwise pinned only in the driven probe — `messagesCell` on `partial`/`ask-only`/`userMessages: 0`
  /`agentMessages: null` reads `—` and `No messages yet`, `drawnMessageTotal` answers null, and a
  record that KEPT both halves at zero still draws its `0` and sorts as `0`.

### A7. Builder B's refused deletion is upheld

The entry's "One reversal" ends "The five duplicated type declarations beside them are deleted and
`saved-output.css` serves." B refused, verified the premise itself, and the integrator upholds the
refusal: every rule in `src/renderer/app/saved-output.css` is scoped `.modal.saved-output-modal`, and
`SavedOutputBody` renders the bare `saved-output-*` classes with no such ancestor inside the panel, so
the deletion would drop the size, the line height and the mono family from a person's saved output.
That is a visible regression against today. B kept the block and added the comment the same paragraph
asks for. **§8's own last section already recorded this; it is repeated here because the ENTRY still
says the opposite and the entry is what a later round reads.**

### A8. Builder B's batch-list line height, and why 144 did not move

§4's table assigns `.sm-batch-targets li` the pair `--text-sm`/`--lh-sm`. Mechanism 16 states the
list's cap as `calc(4 * 33px + var(--space-5))`, and the 33 is that row's real height today — 20
inherited + 2 × `--space-3` + its 1px rule. Taking `--lh-sm` shortens the row to 31, at which 144
shows four rows and 20px of a 31px fifth, which is the mid-row cut the number exists to remove. B
wrote `--lh-base`, the only pair that satisfies mechanism 18 and mechanism 16 at once, and it is also
what the row draws today, so zero pixels move. The entry wins over §4 and the documents say 144.

### A9. Corrections to the entry itself, measured

- **"Twenty declarations set a size and no line height."** 21 at the parent, 16 in
  `session-manager.css` and 5 in `session-manager-panels.css`. §4 already carried the correction and
  builder E measured it independently with its own reader.
- **"`--text-2xs` is used seven times today."** 6. The "five of those are prose" half is right.
- **"a `.btn`, a 28px ellipsis and a `--space-3` gap measure about 106px."** Arithmetically
  impossible: 106 − 28 − 6 leaves 72 for a button whose chrome alone is 42. The cell really measures
  155.41 with `End session…` on it, and `--sm-actions-min` is 156.
- **The row's tallest child is the 28px ELLIPSIS, not the primary button.** `.btn.btn-sm` is 24. The
  arithmetic 40 = 6 + 28 + 6 is unaffected and `globals.css:127` is still the honest source of the
  28, because `--sm-icon-btn` is set from it.
- **`tombstoneRestoreRefused` is TWO sentences**, not one: "Tortie can no longer reach `<label>`, so
  it cannot bring this session back. Add the machine again to work with it." So rough edge 4 is that
  function's own second sentence retargeted, and the only thing dropped is the machine-naming half.
- **The name corpus is Phase 189's twelve**, not Phase 137's; §7 already carried that.
- **Rough edge 6's direction**, confirmed: the product is right and §3.4's table was wrong, and the
  prose under the same table already blessed the code.

### A10. What the integrator asserted by READING and could not run

The app run is the verifier's. Three things below are cascade arithmetic and source reading, not
readings off a running app, and the arm that grades them is builder F's:

1. **`clipFindings` demands exactly THREE ellipsising kinds at every width, and only one sheet state
   has three.** With A3 as built the three are `strong in .sm-name-line` (the name),
   `span.sm-group-path` (the group header's path) and `small.sm-cell-small` (the Past row's secondary
   line). The Managed tab has the first two and not the third; the Past tab under All has the first
   and third and not the second. **Only the Past tab with the project filter naming one project has
   all three**, and 11b runs at three widths on whatever state 11a left. This was not introduced by
   A3 — the assertion is unsatisfiable on the Managed tab in any shape, split parts included — and it
   was deliberately NOT edited blind. The verifier drives it and decides between leaving 11b on
   Past-filtered and grading the SET against an allowlist of the three kinds rather than counting to
   three.
2. **`--sm-name-min: 44px` sits exactly at the top of arm 11's band.** The band is
   `[onGrid(widest 4-char prefix), onGrid(prefix + ellipsis)]`. Builder A measured `dead…` at 42.04px
   with CoreText and cross-checked the method against `probe:p189`'s own live canvas reading of the
   same pair, 41.90, so the band should be `[32, 44]` and 44 passes at the ceiling — which is one of
   F's own self-test cases. It fails only if the live reading drops below 40, about 2px of margin.
   **Builder F's report estimates the same two numbers as "~44 and ~56", which cannot both be right;
   F could not launch Electron and A measured. The verifier's reading settles it.**
3. **`--sm-actions-min: 156px` is graded against a ONE-VALUE band**, `onGrid(measured)`, so the live
   reading must land in (152, 156]. It is measured across `.sm-row-actions`'s children, so it is the
   widest button the fixture actually draws: a fixture with no row reading `End session…` measures
   `Restore` instead, about 124, and the arm fails for the fixture rather than for the CSS.

Also read rather than run: the docked toast's rects (there is no DOM in this repository's unit suite,
so `Toasts.tsx`'s portal has no unit coverage at all and builder G proved the UNDOCKED render
byte-identical instead), and the per-cell heights in A's own table above, which the integrator
re-derived with its own reader from `tokens.css` and the two stylesheets and which agree with the
entry on every one of 40 / 40 / 40 / 28 / 28 / 29, pitch 41 and 40, and 17 and 19 rows.

---

## §As measured — the app run's fix round

The app run drove the sheet at HEAD and at the parent. Three of its findings were the ARM's and not the
build's, and they are settled here so a later round inherits the measurement instead of re-deriving it.
The two files this round touched are `build/p293/probe-p293.mjs` and this document. **Nothing in this
section was proved by launching Electron** — the fixer could not — so each claim below says how it was
established, and the re-run of `probe:p293` is what confirms the arm now reads clean.

### A11. The grid's box IS its pitch, and the entry's 40/41 pair is one wrong expectation read twice

The arm asserted `rowBox` **40** at HEAD and read **41**; it asserted **73** at the parent and read **74**.
That is not two defects and it is not a CSS defect at all. `getBoundingClientRect()` on a `tr` under
`border-collapse: collapse` **includes the collapsed border**, and that border sits BETWEEN two rows, so
the row's own rect and the distance between two rows' tops are the same number. There is no separate box
to assert on the grid.

The Past list genuinely has two numbers, and the reason is the other layout model: `globals.css:13-15`
sets `* { box-sizing: border-box }`, so `.sm-past-row`'s flex box holds its own hairline INSIDE its
declared `min-height` and `pastRowBox` and `pastPitch` are both **40**. That pair stays asserted as two
readings, because a build that let the hairline out of the box would separate them.

Fixed in the arm: `GEOM.head.rowBox` is **41** and `GEOM.parent.rowBox` is **74**, with the reason written
above the table. Two self-test fixtures now pin the invariant both ways — the grid's box equals its pitch
on both columns, and the entry's own 40 is caught as the wrong layout model — so a later round reading the
entry's table cannot "restore" the 40 without reddening the self-test and being told why. **The only
stylesheet change that could make the rect read 40 would be taking the border off the row.**

### A12. Eight of the contrast failures were the arm's own measurement bug, and the cause is a transition

The arm reported, at HEAD and identically at the parent, pairs like `strong in .sm-name-line` on the light
base, hovered, at **1.30:1** — `rgb(53, 54, 57)` on `rgb(32, 35, 41)`. Those are the LIGHT base's
`--text-primary` (`tokens.css:520`) over the DARK base's `--bg-raised` (`:19`), and the light base's own
`--bg-raised` is `#e5e7ed`. They never coexist in a render.

**The cause, read in the arm and in the stylesheets.** `pairs` flips `data-scheme` on `<html>` and reads
both bases in ONE synchronous turn. `color` re-resolves the instant it is asked. `background` does not:
`session-manager.css:478` (the grid's cell), `:835` (the Past row), `globals.css:135` (`.btn`), `:208`
(`.icon-btn`) and `:287` (`.dot`) each declare `transition: background var(--dur-fast) var(--ease-out)`,
`--dur-fast` is **120ms** (`tokens.css:380`), and `getComputedStyle` on a transitioning property answers
the value the animation is AT rather than the value it is going to — at the first frame after the flip,
the OLD base's colour. It showed up on the LIGHT base only because the window ships dark, the dark read
is the one that flips nothing, and the dark read is taken first. It showed up on hovered and checked rows
rather than resting ones because a resting cell is transparent and `paintedBehind` walks up to `.modal`,
whose `background: var(--bg-surface)` (`app.css:1469`) carries no transition and therefore re-resolved
correctly.

**The fix is a freeze, and it is the cause and not the number.** `pairs` now inserts
`*, *::before, *::after { transition-property: none !important; }` before the first flip and removes it
after the scheme is put back, inside a `finally` so a throw cannot leave the window on the wrong base with
every transition switched off. That is `tokens.css:691-697`'s own recipe, which is Phase 200's leak fix:
`transition-property: none` cancels a running transition and makes both properties snap, so the reading is
the resting resolved colour, which is what contrast is about.

**What the readings become.** Measured through the shipping `contrastOf`
(`src/renderer/theme/hue.ts`), with no Electron:

| Pair | Ratio |
|---|---|
| what the arm REPORTED: light `--text-primary` on DARK `--bg-raised` | **1.30:1** — the 1.30 the run printed, which is what confirms the diagnosis |
| what is really drawn: light `--text-primary` on light `--bg-raised` | **9.77:1** |
| the same element on the dark base: dark `--text-primary` on dark `--bg-raised` | **9.61:1** |

So the true pairing clears the 4.5 floor by more than double and no colour moves.

**The second lock, because a fix is not a guard.** `crossBaseFindings` refuses a pair whose text resolves
to one base's palette alone while its ground resolves to the other's alone: it names the element, both
tokens, both bases and both values, says *the theme flip did not reach this background*, and that pair is
dropped from the contrast grading rather than handed a ratio. The two palettes are read through the
cascade under each base from the nine tokens that tell the bases apart (`PALETTE_TOKENS`), so no literal
colour is written into the probe and a retune moves the accusation with it; a token that stops resolving
is itself a finding, so the refusal cannot rot quietly. **A gate that reports a false failure teaches
people to ignore it, which is how Phase 296's gate rotted for 25 days.**

### A13. The third ellipsis kind was never ASKED, and no fixture length would have changed that

`11b` read *"2 kind(s) of element ellipsis, want exactly 3"* at all three widths, **identically at the
parent**. The cause is not short folders. `session-manager.css` declares `text-overflow: ellipsis` in
exactly three places — `:672` (`.sm-name strong`), `:807` (`.sm-group-path`) and `:541`
(`.sm-past-row .sm-name-line .sm-cell-small`) — and the reading is a COMPUTED STYLE question, not a
truncation question, so length never entered it. `SessionManagerSheet.tsx:419-431` renders `ManagedGrid`
OR `PastList` and never both, so the Past row's folder line is not in the DOM while 11b runs, and 11b runs
on the tab 11a left, which is Managed. A10 item 1 predicted this exactly and left the choice to the app
run.

**Taken: the second of A10's two options.** The arm now carries the three allowed kinds as
`ELLIPSIS_ALLOWED` — what, selector, and which tab draws it — asks the DOM which of them is drawn at each
width, and grades the SET against that. A fourth kind is still caught, a DRAWN kind that stopped
ellipsising is still caught, and the kind this tab cannot hold is reported through `clipNotes` as
**NOT EXERCISED**, said once rather than once per width, naming the tab reason. The expectation was not
lowered to 2 and no folder was lengthened: a fixture change would have bought a green reading and lost the
clause, and lowering the number would have stopped it catching a real loss of truncation. A reading that
does not say which kinds are drawn is still held to all three, so an older reading cannot be quietly
relaxed.

### A14. What this round proved and what it did not

- `node --check` on the probe, and the same on the reader string after both interpolations are filled, so
  the injected source parses as JS.
- `node build/p293/probe-p293.mjs --self-test`: **77 fixtures before this round, 99 after, all passing.**
  The 22 are the four retuned box fixtures plus 18 new ones, and every new grader is proved both ways.
- The contrast table in A12, through the shipping helper over `tsx`, no Electron.
- **Not proved here:** the reader half runs only in a renderer, so the freeze's effect on a live
  `getComputedStyle`, the palette probe's resolved values and the reachability walk are established by
  reading the cascade and by the arithmetic above. The `probe:p293` re-run is what confirms them, and the
  number to watch is the `11a` line's new `… refused as a cross-base pair` count: **it should read 0**. A
  non-zero count means the freeze did not take, and the refusal will then name the element instead of
  printing a ratio nobody can act on.

---

## §As driven — the verify's fix round (the toast dock, arm 11d)

The Tier 2 verify returned needs_work with three readings shorter than today and one promise that was
never asked at all. **This section is the second of those**, and it is the one the verify called out as
accepted on a code read: the toast dock.

### A15. THE TOAST DOCK WAS NEVER DRIVEN, and the arm now drives it

**What was wrong.** Rough edge 1 is the one change in this phase that costs a person a CLICK today, and
the arm's own readings said it was never exercised: `stacked()` answered `{ outlet: 0, toasts: 0 }` on
every run, at both bases. Nothing had raised a toast, so the strip was always `:empty` and the stack was
never in the document. Every claim in §5 above — that a docked toast covers nothing, that the strip takes
its height from the scroller, that the stack draws exactly where it drew before once the sheet closes —
was established by reading `Toasts.tsx` and `app.css`. That is not proof, and it is the same shape of
defect Phase 296 landed to remove: a promise that cannot fail.

**The door, and it is the app's own.** `window.__p293.addProject(path)` is `projects-slice.ts`'s
`addProjectPath`, the function the folder picker, a window drop, New Project, Clone and every Open Recent
row reach. Over a folder that is not there main refuses it in `sessions/core.ts`'s `addProject` with
`That folder does not exist.` and the slice raises **one sticky error toast**. That is exactly what a
person gets from the Open Recent row of a folder they have since moved — the case
`recents/open-recent-menu.ts` names in its own header. It adds no project, sets no active project and
records no recent, because main throws before `rememberProject`. No new drive method was added and
`p293-session-manager-drive.ts` was not edited.

**Why errors and not info.** `notices-slice.ts:43`'s only auto dismiss is a flat 5s timer with no hover
pause, and `sticky` defaults to true for the error kind alone. An info toast would leave in the middle of
a reading. Sticky is also what makes the × clause real, and the × is the second reason
`pointer-events: none` was refused.

**Why the order is read from a STAMP.** All four toasts carry the same sentence, because the door is one
door, so the order cannot be read off the text. `Toasts.tsx` keys each toast by its store id, so the DOM
node of a toast that is still visible survives the render that adds the next one, while the node of the
one the cap dropped is removed. `stampToast(n)` marks the newest unstamped node with `data-p298-toast`,
in the `data-p298` family the skeleton reading already plants, and reading the stamps in DOM order says
which of the store's toasts are drawn and in which order.

**Why the sheet is SHRUNK first, and it is resolved rather than chosen.** The clause that matters only
exists while the grid OVERFLOWS its scroller: over a short list the last row is nowhere near the sheet's
bottom, and the parent's own defect reads clean — which would make the HEAD assertion another promise
that cannot fail. After 11c the Managed tab holds about seven rows in four groups, which does not fill a
900px sheet. So 11d steps through `TOAST_SHEET_HEIGHTS = [480, 420, 380]` until `.sm-scroll` really
scrolls, scrolls it to its end before every reading, and records which height it used. A run in which
none of the three overflows is a finding, not a pass.

**And the floor under that search is measured, not assumed.** A height is only accepted if the scroller,
once the docked strip has taken its height at three toasts, still holds the sticky heading plus one whole
row. Below that no End button sits wholly inside the scroller, `end` reads `null`, and every clause about
it would answer *not asked* rather than answering — which is the same failure in a new place. The floor is
`3 x 44 + 2 x --space-4 + 2 x --space-4` for the strip plus `headThBox + rowBox` read off the sheet by
`boxes()`, which is 164 + 28 + 41 = **233 at HEAD**, and zero at the parent because the parent has no
strip. Both `--space-4` and `--space-6` are resolved from `:root` through `rootPx`, never written as 8 and
16 in the arm. A settled height that clears the overflow test and not the floor is its own finding.

**What is asserted, and it is geometry.** Six graders, each pure, exported and proved both ways under
`--self-test`: `dockFindings` (per count), `dockCoverFindings` (over the set), `dockCapFindings`,
`dockHeightFindings`, `dockClosedFindings` and `dockDismissFindings`. The End-button clause is an
intersection rectangle plus `document.elementFromPoint` at the button's centre — never the presence of a
class. The arm never CLICKS that button, because a click that landed would end a person's session, so the
question is asked of the layout instead. The ×s are clicked for real, four times, and the store's queue
falling is the proof the button took the click.

#### What the app run must read, at 1440 x 528 with the sheet at 480

`--space-6` resolves to 16, `--z-toast` to 700, `.toast`'s own `min-height` to 44, and the scrim leaves
`--space-8` of gutter above and below the sheet, so the sheet spans y 24 to 504 and is 1180 wide and
centred (x 130 to 1310). Every number below follows from those and from §3's own box table.

| Reading | HEAD | Parent (`f6c11f57`) |
| --- | --- | --- |
| `.toasts` class | `toasts toasts-docked` | `toasts` |
| computed `position` | `static` | `fixed` |
| computed `z-index` | `auto` | `700` |
| inside `[data-sm="toast-outlet"]` | yes | the strip does not exist |
| `insideSheet` / `belowScroller` / `aboveFoot` | `true` / `true` / `true` | `false` / `false` / `false` |
| strip height, 1 / 2 / 3 toasts | 60 / 112 / 164 (`44n + 8(n-1)` + 2 x `--space-4`) | no strip |
| `.sm-scroll` height, 0 then 1 / 2 / 3 | 352 then 292 / 240 / 188 | 336 at every count |
| sheet height at every count | 480, unchanged | 480, unchanged |
| reach past the sheet's bottom edge, 1 / 2 / 3 | n/a (the stack is in flow) | **36 / 88 / 140** |
| `overlapEnd.area`, 1 / 2 / 3 | **0 / 0 / 0** | ~0 / ~2178 / ~2904 |
| point at the End button's centre | the button (`inPrimary`) | a toast (`inToasts`) at 3 |

The parent's 36 / 88 / 140 is the entry's own table, held exactly: a stack `--space-6` from the window's
bottom whose height is `44n + 8(n-1)` reaches `44n + 8(n-1) - (24 - 16)` past a sheet bottom that sits
`--space-8` above the window's, which is 36, 88 and 140.

**Only the DEEPEST parent count is graded on the button, and that is deliberate.** One toast reaches 36px
and does not reach the button at all. The parent's last row is 74 tall and its 24px `.btn.btn-sm` sits
roughly 70 to 94px above the sheet's bottom edge, so whether two toasts at 88 reach it turns on about
6px. Pinning a mandatory assertion to a 6px margin would fail a correct parent build for a row-height
change that is not the subject, so counts 1 and 2 are RECORDED in a `note` and count 3, with 140px of
reach and 46px of margin, is the one held. That is still the clause proved able to fail: if the parent
run finds no intersection at three toasts, `dockCoverFindings` says
`THE CLAUSE PROVED NOTHING` and the arm fails, because the empty intersection HEAD is graded on was never
shown able to happen.

#### The cap, the order and the dismissals

With a fourth raised: **3 drawn**, `+1 more`, and the stamps read `["2","3","4"]` in DOM order from both
`stampToast` and `toastGeo` — two readings of one fact, so they cannot quietly disagree. The overflow
line is above the first toast. Then four real clicks on four ×s: the queue reads **4 → 3 → 2 → 1 → 0**
and the drawn count reads **3 → 2 → 1 → 0**, because dismissing one of the three while a fourth is hidden
brings that fourth back — the queue falls and the drawn count does not, at the first press only. After
the last × no `.toasts` element is in the document at all.

#### The half most likely to have broken

The sheet is then CLOSED and one more toast raised. On **both** bases and to the same values:
`position: fixed`, `docked` false, no strip in the document, 16px from the window's right edge and 16px
from its bottom (each read against `--space-6` resolved from `:root`, never against the literal), and
`z-index` 700 read against `--z-toast`. Every other surface in the app relies on that reading.

#### What this round proved and what it did not

- `node --check` on the probe, and the same on the reader string with both interpolations filled.
- `node build/p293/probe-p293.mjs --self-test`: **52 new 11d fixtures, 186 in the file, 0 BAD.** Every
  one of the six graders is proved both ways, the entry's reach table falls out of the fixture's own
  arithmetic rather than being asserted against itself, and the HEAD defect — the stack over the End
  button — is caught twice.
- **An independent exercise of the readers over a hand-built DOM stub**, in the scratchpad, with the two
  scenes' rects put in by hand from the stylesheet: `toastGeo` answered the same stack rect, the same
  `insideSheet` / `belowScroller` / `aboveFoot` triple, the same `overlapEnd` (`0` docked,
  `121 x 24 = 2904` fixed), the same `sheetBottomReach` of 140 at three toasts, and `elementFromPoint` at
  the button's centre resolved into the button when docked and into a toast when fixed. **It caught a
  real defect in the reader**: the first form of `overlap()` clamped each axis independently, so a stack
  that shared the button's column but not its rows read `121 wide, 0 tall` — a number that says the wrong
  thing in a finding. Two boxes that do not intersect share no rectangle, and the reader now returns the
  empty one on both axes. The self-test's own fixtures were derived by hand from the same stylesheet and
  agree with the stub to the pixel, which is two derivations of one set of numbers.
- **Not proved here:** no Electron was launched in this round, so the enter animation's 160ms settle, the
  React reconciliation that makes the stamps survive, the portal landing in the strip, and every computed
  style are established by the arithmetic above and by reading the cascade. **The `probe:p293` run at
  both bases is what confirms them**, and the lines to read are the four `11d:` lines and the one `note:`
  line. The number to watch at the parent is `overlap` at three toasts: **it must not be 0.**
