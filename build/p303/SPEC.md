# Phase 303 — the lifecycle question before the state detail

Written against `dc226df6` (origin/main, Phase 298 landed). Every `file:line` below was read from
that tree, not copied from the backlog entry. **Where this file and the entry disagree, the entry
wins**, and §8 lists every place the entry's own citations drifted or its claims did not hold.

## §1 The phase

- **Subject.** `feat(sessions): the lifecycle question before the state detail`
- **First body line.** `Phase 303: Active or Ended, with State as the refinement`
- **Semver.** Minor.
- **Tier 2**, with two raisers inside that budget: the parent-commit measurement is mandatory
  (the operator reported it), and the independent method is **re-derivation** (§6.2). The parent
  build is `/private/tmp/wt-p299` at `b6f04ab0`, which differs from `dc226df6` in two docs files.
- **What a person notices.** The sheet says whether a session is alive or over without opening
  anything: a segmented control `All | Active | Ended` sits before the State dropdown, and the State
  dropdown keeps all seven options as a refinement inside the chosen lifecycle.
- **The two rulings, not reopened.** (1) Segmented control before State, State kept. (2) The row
  keeps its one detailed word; no second word, no group header.

## §2 File ownership — three builders, no file twice

Verified against the tree. **Two changes to the brief's rough table, each with its reason.**

| Builder | Owns | Why it moved, where it did |
| --- | --- | --- |
| **A — store and view** | `src/renderer/state/session-manager-slice.ts`; `src/renderer/session-manager/view.ts`; `src/renderer/session-manager/use-sheet-refresh.ts`; NEW `src/renderer/session-manager/__tests__/p303-lifecycle-partition.test.ts`; `src/renderer/session-manager/__tests__/p293-view.test.ts`; `src/renderer/state/__tests__/p293-session-manager-slice.test.ts`; `src/renderer/session-manager/__tests__/p293-sheet-refresh.test.ts`; `src/renderer/session-manager/__tests__/p293-projection.test.ts`; `src/renderer/app/__tests__/saved-output.test.tsx` | The slice test lives under `src/renderer/state/__tests__/`, not the session-manager directory the brief implied. `p293-projection.test.ts:544` and `saved-output.test.tsx:225` each build a literal `SessionSheetState`; the second is TYPED (`tsconfig.tests.json` is in `tsc -b`), so a missing `lifecycle` reddens `typecheck`. Both are the store field's blast radius, so A. |
| **B — the face** | `src/renderer/session-manager/SessionManagerSheet.tsx`; `src/renderer/session-manager/copy.ts`; `src/renderer/session-manager/session-manager.css`; `src/renderer/session-manager/__tests__/p293-sheet-render.test.tsx`; `src/renderer/session-manager/__tests__/p293-css-tokens.test.ts`; `src/renderer/session-manager/__tests__/p293-copy.test.ts` | `p293-sheet-render.test.tsx:143-173`'s `open()` builds a typed literal sheet, so it must gain the field. `p293-copy.test.ts:56-90` pins the toolbar's sentences byte for byte and should pin the three new labels and hovers the same way. |
| **C — gates, probe, re-derivation** | `build/p293/conformance-manager.mjs`; `build/p293/ablation.mjs`; `build/p293/manager-conformance-probe.mts`; `build/p293/probe-p293.mjs`; `build/p293/SPEC.md` (§2.14 only); NEW `build/p303/rederive.mjs`; **`src/renderer/app/p293-session-manager-drive.ts`** | The drive is ADDED to C. The proof needs a session forced to `unknown` (§6.1 step 4), main writes `unknown` only when the tmux list fails (`src/main/sessions/core.ts:2123`), and the renderer store is not on `window`, so a probe cannot paint a status from outside. That is exactly the drive's charter (`p293-session-manager-drive.ts:12`: "each one is something a probe cannot do from outside"), and `hold(id)` at `:371-389` already paints ONE status over a live row. Phase 298 left the drive out because its readers only READ; this arm must WRITE one status. |

Nobody edits: `src/shared/types.ts`, `src/renderer/state/resume.ts`, `src/renderer/state/login-switch.ts`,
`src/main/sessions/lifecycle-gate.ts`, `src/renderer/app/status.ts`, `src/renderer/session-manager/projection.ts`,
`src/renderer/styles/tokens.css`, `src/main/menu.ts`, `package.json`, `docs/audits/contract-baseline.txt`.
`docs/BACKLOG.md` and `CHANGELOG.md` are the integrator's.

## §3 The partition, as the exact clause

**Main's refusal set**, `src/main/sessions/lifecycle-gate.ts:95-117`, `removeRefusal`:

```ts
switch (record.status) {                 // :101
  case 'running':                        // :102
  case 'idle':                           // :103
  case 'needs_input':                    // :104
    return REMOVE_REFUSED_LIVE;          // :105
  case 'unknown':                        // :108
    return REMOVE_REFUSED_UNKNOWN;       // :109
  case 'exited':                         // :110
  case 'restorable':                     // :111
  case 'discarded':                      // :114
    return null;                         // :115
}
```

Refuses `running`, `idle`, `needs_input`, `unknown`; passes `exited`, `restorable`, `discarded`. The
machine guard at `:98-100` returns null first for a remote record, so the partition test passes
`machineId: undefined` to reach the switch.

**The renderer's four booleans**, `src/renderer/state/resume.ts:903-953`, `sessionActionGates`
(type `SessionActionGates` at `:852-883`):

```ts
const unknown = status === 'unknown';                                        // :908
const removed = status === 'discarded';                                      // :909
const ended = status === 'exited' || status === 'restorable';                // :910
const live = status === 'running' || status === 'idle' || status === 'needs_input'; // :911-912
```

**The truth table** over `SESSION_STATUSES` (`src/shared/types.ts:83-91`, seven members):

| status | `gates.live` | `gates.unknown` | `gates.ended` | `removeRefusal` | Segment |
| --- | --- | --- | --- | --- | --- |
| `running` | 1 | 0 | 0 | refused | **Active** |
| `idle` | 1 | 0 | 0 | refused | **Active** |
| `needs_input` | 1 | 0 | 0 | refused | **Active** |
| `unknown` | 0 | 1 | 0 | refused | **Active** |
| `exited` | 0 | 0 | 1 | null | **Ended** |
| `restorable` | 0 | 0 | 1 | null | **Ended** |
| `discarded` | 0 | 0 | 0 | null | neither (Past tab only) |

**The clause:** Active is `row.gates.live || row.gates.unknown`; Ended is `row.gates.ended`. Active
equals main's refusal set; Ended equals main's pass set minus `discarded`. Total over the six
statuses Managed draws. No fourth spelling of "live" anywhere.

Why `unknown` is Active: `primaryOf` (`projection.ts:278-303`, the `gates.unknown` arm at `:295-297`)
gives it a DISABLED End and never a Restore, and `offersRestore` (`resume.ts:920-926`) is gated on
`acts = !unknown && !removed` (`:916`). Ended means "can be restored"; `unknown` cannot.

The one disagreement, stated: `statusVisual` (`src/renderer/app/status.ts:296-352`) draws `unknown`
with `dot: 'ended'` at `:345`. The dot is not touched. The Active hover says what Active means.

## §4 The store and the filter

| Item | File:line at dc226df6 | What lands |
| --- | --- | --- |
| The field | `session-manager-slice.ts:146-172` `SessionSheetState` | `lifecycle: 'all' \| 'active' \| 'ended';` after `stateFilter` (`:152-159`) |
| The patch's `Pick` | `:179-184` `SessionSheetFilterPatch` | `'lifecycle'` joins `'search' \| 'project' \| 'tabFilter' \| 'stateFilter' \| 'sort' \| 'listError'` (`:182`) |
| Initial value | `:290-304` `freshSheet`, `stateFilter: 'all'` at `:296` | `lifecycle: 'all'` beside it |
| Copied by name | `:461-508` `patchSessionSheet`; the `stateFilter` arm at `:481-487` | A fifth `if (patch.lifecycle !== undefined && patch.lifecycle !== sheet.lifecycle) { next = {...next, lifecycle: patch.lifecycle}; filtersMoved = true; }`, so a change clears the selection as the four do (`:504-506`). The comment at `:464` ("six fields") becomes seven. The doc at `:202-205` names it. |
| Tab reset | `:510-532` `setSessionSheetTab`, `stateFilter: 'all'` at `:520` | `lifecycle: 'all'` on the line beside it |
| `ManageFilters` | `view.ts:54-57` | `'lifecycle'` joins the `Pick` |
| `DEFAULT_FILTERS` | `view.ts:62-67` | `lifecycle: 'all'` |
| `rowPasses` | `view.ts:95-109` | Two lines after the `stateFilterKeeps` line (`:104`): `if (filters.lifecycle === 'active' && !(row.gates.live \|\| row.gates.unknown)) return false;` and `if (filters.lifecycle === 'ended' && !row.gates.ended) return false;`. The doc comment at `:94` ("all four controls") becomes five. NO status literal in this function. |
| Memo key — **correctness clause** | `use-sheet-refresh.ts:154-162` | `sheet.lifecycle` joins the array. Left out, `selectSheetView` answers a stale view and the prune at `:329-338` reads the previous visible set. |
| The filters object | `use-sheet-refresh.ts:170-175` | `lifecycle: sheet.tab === 'managed' ? sheet.lifecycle : ('all' as const)` beside `stateFilter`'s coercion at `:174`. **The entry names two Past-tab mechanisms; this is a third the tree already has for `stateFilter`, and the new field takes all three.** |
| `clearFilters` | `SessionManagerSheet.tsx:368-378` (B's file) | `lifecycle: 'all'` in the patch at `:371-376` |
| `STATE_FILTER_KEEPS` / `STATE_FILTER_OPTIONS` | `view.ts:74-84`, `copy.ts:79-90` | UNTOUCHED |

**The partition test** (A, new): `src/renderer/session-manager/__tests__/p303-lifecycle-partition.test.ts`.
Imports `SESSION_STATUSES` from `@shared/types`, `sessionActionGates` from `../../state/resume` (as
`p293-batch-end.test.ts:25` does), and `removeRefusal` from `../../../main/sessions/lifecycle-gate`
(legal: tests are exempt from every boundary rule, `build/assert-import-boundaries.mjs:135-138`; five
renderer tests already import from `../../../main/`). For each status `s`: `gates.live || gates.unknown`
is `true` exactly when `removeRefusal({ status: s, machineId: undefined }) !== null`; `gates.ended` is
`true` exactly when the refusal is null and `s !== 'discarded'`; and exactly one of active / ended /
`gates.removed` holds. Seven rows, each named.

**The view test fixture** (A): `p293-view.test.ts:57-88`'s `row()` stubs `gates` as `{ remote }` only,
so `gates.live` is undefined and every row would fall out of Active. The fixture hands each row
`sessionActionGates(session, status, env)` from `../../state/resume` — the shipping function, no
hand-written set. Then: `'the four filters combine with AND'` (`:131`) becomes five and `'all four at
once'` (`:163`) adds `lifecycle`; `'the state filter's table'` (`:205`) gains a lifecycle table beside
`:218`, `:222`, `:231`: Active over `GROUPS` is `a, c, d, e`, Ended is `b, f`, `Running ∧ Ended` is
empty, `Ended ∧ ended` is `b, f`, and `visibleIds` under Active is in drawn order.

**The slice test** (A): `p293-session-manager-slice.test.ts:178-190`'s exact `toEqual` gains
`lifecycle: 'all'`; `:245-258`'s moves gain `{ lifecycle: 'active' as const }`; `:304-329` asserts
`sheet().lifecycle` is `'all'` after the tab change. **The refresh test** (A): a sibling of `:268-282`
where the filter is `{ lifecycle: 'active' }` and a push that ends a checked row unchecks it.

## §5 The face

**DOM contract, verbatim** (goes into `build/p293/SPEC.md` §2.14, `:648-667`, as two lines):

```
`div.sm-lifecycle[role="radiogroup"][aria-label][data-sm="lifecycle"]`, Managed tab only, between
`#sm-search` and `#sm-filter-project`, holding three
`button[role="radio"][aria-checked][data-manage-lifecycle="all|active|ended"]`, the chosen one `.on`.
```

**Where** (B): `SessionManagerSheet.tsx`'s filters branch (`:582-660`), after the `FilterField`
(`:584-597`) and BEFORE the project `<select>` at `:598`, wrapped `{managed ? ... : null}` exactly as
the State select is at `:641-659`. Markup copied from `AppearanceSection.tsx:167-186`: `type="button"`,
`role="radio"`, `aria-checked={on}`, `title={hover}`, `className={on ? 'sm-lifecycle-opt on' :
'sm-lifecycle-opt'}`, `onClick={() => useApp.getState().patchSessionSheet({ lifecycle: value })}`.
Three ordinary tab stops, no roving tabindex, no arrow keys (the two shipping precedents have none).

**Copy** (B), in `copy.ts` beside `FILTER_STATE_LABEL` (`:61`), one export per string, no sentence
holding pane / window / prefix / attach / detach / socket / server (T10, `conformance-manager.mjs:488`):

```ts
export const FILTER_LIFECYCLE_LABEL = 'Filter by active or ended';
export const LIFECYCLE_OPTIONS: readonly {
  value: SessionSheetState['lifecycle']; label: string; hover: string;
}[] = [
  { value: 'all',    label: 'All',    hover: 'Every session, alive or over' },
  { value: 'active', label: 'Active', hover: 'Alive, or unreachable right now. One that just ended can read Active for a moment.' },
  { value: 'ended',  label: 'Ended',  hover: 'Over, and can be restored' }
];
```

The Active hover carries the one-clause limit: a death is noticed by the monitor's tick
(`core.ts:555-556`, 1 s focused, 2 s not) and `reapDeadSession` (`:1001`, `:2330`), so a row can read
Active for about one tick after its process is gone. Nothing else is said on the face.

**CSS** (B), in `session-manager.css` beside `.sm-select` (`:386-418`), shaped on `.set-segments`
(`settings.css:393-431`). **One correction to the entry's letter, forced by a gate the entry itself
names:** `.set-segments` has `padding: 1px; gap: 1px`, and T20 (`conformance-manager.mjs:94`,
`p293-css-tokens.test.ts:327-357`) refuses any padding or gap that is not a `--space-*` step, a `--sm-*`
property of the sheet, `0` or `auto`. `--space-1` is 2px (`tokens.css:165`), so the 1px inset is
written as the sheet's own geometry, which is what the stylesheet's header (`:6-10`) says a non-token
number is and what T20 admits by name. It is not a token: `tokens.css` is not edited.

```css
/* on .modal.session-sheet, :45-178, beside --sm-toolbar-h at :49 */
  --sm-segment-inset: 1px;

/* Phase 303. The lifecycle control, shaped on .set-segments (settings.css:393-431)
   as .ed-mode already did: the select's own height, hairline and radius. */
.session-sheet .sm-lifecycle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: stretch;
  box-sizing: border-box;
  height: var(--field-h);
  padding: var(--sm-segment-inset);
  gap: var(--sm-segment-inset);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
}
.session-sheet .sm-lifecycle-opt {
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--r-xs);
  background: none;
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  line-height: var(--lh-sm);
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.session-sheet .sm-lifecycle-opt:hover { background: var(--bg-raised); color: var(--text-primary); }
.session-sheet .sm-lifecycle-opt.on { background: var(--accent); color: var(--on-accent); }
.session-sheet .sm-lifecycle-opt:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```

Rules this satisfies and the builder checks: T17 (`line-height` is a `--lh-*`, never `.set-segment`'s
literal `20px`), T18 (font-size paired), T20 (see above), T21 (no uppercase), no colour literal, no
literal width (content-sized: three labels at 12px plus 8px each side, about 160px, fits 624 + 8 + 160
in 1140 at 1180 and in 1012 at the 1100 breakpoint, `:1180-1188`). The segment has NO declared height:
`align-items: stretch` on a 28px border-box with 1px border and 1px inset gives 24px, and a button
centres its text. `--dur-fast` and `--ease-out` are `tokens.css:380`, `:383`, dropped to 1ms under
reduced motion at `:655-657`, so no media block here. The toolbar (`:361-372`) is `height` AND
`min-height` `var(--sm-toolbar-h)` = 47px (`:49`); a 28px control cannot move it.

**Tests** (B): `p293-sheet-render.test.tsx` — the DOM-contract describe (`:188`) gains the radiogroup,
three radios with `aria-checked` one true, `data-manage-lifecycle` in order `all, active, ended`, drawn
between `#sm-search` and `#sm-filter-project`, absent on Past; the 47px describe (`:244`) reads
`data-sm="lifecycle"` in filters mode and not in selection mode; `open()` (`:143-173`) gains the field.
`p293-css-tokens.test.ts` — nothing to add unless the block trips a rule; the builder runs it.
`p293-copy.test.ts:56-90` — the label and the three options pinned byte for byte.

## §6 The proof

### 6.1 `probe:p293`, arm 11 unchanged, one new arm `16`

Arm 11's readings (`probe-p293.mjs:220-221` `TOOLBAR_H = 47`, `TITLE_H = 52`; `geometryFindings`
`:618`; self-tests `:1993-1995`) must not move, read with the control present. **Arm 16** joins
`ALL_ARMS` (`:223`) and the header list (`:26-98`), runs after arm 10 and before 11c, and:

1. Opens Managed, reads `[data-sm="lifecycle"]` through `cdpEval` (`build/cdp-client.mjs:179`,
   imported at `:203`; the Phase 298 readers at `:2441-2462` are the precedent for reading the DOM
   from the probe rather than the drive): three `button[role="radio"]`, exactly one
   `aria-checked="true"` and it is `all`.
2. Clicks each segment with the REAL `click(cdp, '[data-manage-lifecycle="active"]')` (`:2401`) and
   reads `aria-checked` back: one true each time, and the `.on` class on the same button.
3. **The partition the arm computes itself:** `const ACTIVE = new Set(['running','idle','needs_input','unknown'])`,
   `const ENDED = new Set(['exited','restorable'])`, written in the probe (outside the domain T23
   reads). For each segment, the drawn `tr.sm-row[data-manage-row][data-status]` ids equal the
   ids whose `data-status` the set admits, read from the same DOM.
4. **The unreachable row:** `window.__p293.hold(id, 'unknown')` over a live shell (C widens `hold` at
   `p293-session-manager-drive.ts:371-389` with an optional second argument
   `status: 'needs_input' | 'unknown' | 'restorable'`, default `'needs_input'`, still applied only over
   a `running` or `idle` row main pushed; the header's item 3 at `:23-27` says so). Under Active the
   row is drawn; under Ended it is not; its `stateLabel` is `Unreachable` (the drive's
   `P293Row.stateLabel`, `:70`) and its `primary` is `{ verb: 'end', disabled: true }` (`:71`). Then
   `release()`.
5. **The State dropdown under every segment:** `#sm-filter-state` holds seven `<option>` values
   `all, running, working, needs-input, idle, ended, unreachable` under each of the three.
6. **The batch invariant:** `All`, check every visible row through `[data-manage-check]` clicks, click
   `Ended`, read `checked` back from the drive's `state()` (`:73`) and from the DOM: every remaining id
   is in the drawn set. Then `Active`, and the same.
7. **Every reachable pair** over a fixture holding all six Managed statuses: two live shells
   (`running` while a command runs, `idle` at the prompt), one `hold(id)` needs_input, one really
   `exited` (`killOutOfBand`, `:153`), one `hold(id, 'unknown')`, one `hold(id, 'restorable')` — the
   arm SAYS which three are painted. Today `held` (`:313`) is one subscription for one row (`:372`,
   `:386`); C makes it a `Map<id, status>` re-applied on every push, with the per-row guard unchanged
   and `release()` (`:391-396`) clearing them all, so the six stand at once. For each of 3 × 7 pairs chosen with
   `choose(cdp, '#sm-filter-state', v)` (`:2418`) and a segment click: drawn ids equal
   `ACTIVE/ENDED ∩ STATE_KEEPS[v]` computed in the arm from `data-status`. A pair that intersects to
   nothing (`ended` × `working`) draws `[data-sm="clear-filters"]` with `NO_MATCH_HEADING`, and one
   click on it restores the full list, `aria-checked` back on `all`, `#sm-filter-state` back on `all`.
8. Past tab: no `[data-sm="lifecycle"]`; back on Managed after a segment was chosen, the store reads
   `lifecycle: 'all'` (the reset at `:520`).

**The no-regression table**, the same arm at `P293_PARENT_CHECKOUT=/private/tmp/wt-p299` (steps 1, 2,
4, 6, 7, 8 skipped there: the parent has no control, and the arm says so) and at HEAD, one Electron at
a time, reported as scenario / today / HEAD. **The parent run is for its `readings.json` and not for its
exit code** (the fix round, Lens 1's minor): `GEOM.parent` and the parent state table are Phase 293's
`f6c11f57` by value, so a parent checkout that already carries Phase 298 is graded there against the
wrong column and arm 11 reports Phase 298's own rows as findings (41 at wt-p299, none about this phase).
The HEAD run reads that file through `P293_HIT_PARENT` and compares `readings.p303.byState`; the
parent's findings are read by arm, and the ones that are not arm 11's column are the verdict.

| Scenario | Read |
| --- | --- |
| Each of the seven state options' drawn ids under `All` | byte-identical |
| `Running` is exactly the live three | identical |
| Arm 7's select-all under `Running` | identical |
| The Past list's ids and order | identical |
| Toolbar height, both modes; title bar | 47 / 47 / 52 on both |
| Each existing control's height; the three selects' widths | HEAD = parent (28 each; 170, 136, 114) |
| The search field's width (`.filter-field.sm-search`, `flex: 1 1 auto`, `min-width: 180px`) | **The `HEAD ≥ parent` clause is REMOVED, not repaired** (the fix round). It is the toolbar's slack and yields exactly the control's box plus one gap: 694 − 138.93 − 8 = 547.07 at the 1440px window, read 547.08; ≥ its 180px floor at both bases and at the 960px minimum window (about 280px); never overflowing. Held to an ADMITTED 547 × 28 in `HIT_EXCEPTIONS` with that arithmetic, so a further narrowing still goes red; queued for the operator's ruling by the docs follow-up |

A scenario worse at HEAD has its clause REMOVED and queued — and the search field's is the one this
phase removed.

### 6.2 `build/p303/rederive.mjs` — the independent method (C)

Plain node, `import ts from 'typescript'` as `conformance-manager.mjs:63` does, no Electron, no tmux,
reads three files under `src/` and `src/shared/types.ts`, writes nothing into the tree. Its OWN
readers, none shared with the gate:

- **Reader 1, main.** Parse `src/main/sessions/lifecycle-gate.ts`, find the `FunctionDeclaration`
  named `removeRefusal`, walk its `SwitchStatement`: a `CaseClause` group's statuses go to REFUSED if
  the return expression of the clause they fall to is an `Identifier`, and to PASSED if it is the
  `null` keyword.
- **Reader 2, renderer.** Parse `src/renderer/state/resume.ts`, find `sessionActionGates`, and for
  the `VariableDeclaration`s named `unknown`, `ended` and `live` collect every `StringLiteral` on the
  right of a `===` in the initializer.
- **Reader 3, the dot.** Parse `src/renderer/app/status.ts`, find `statusVisual`, and for each
  `CaseClause` take the `dot` property of the FIRST `ReturnStatement`'s object literal (for `exited`
  that is the `!endedBadly` branch, `ended`).
- **Reader 0.** `SESSION_STATUSES` from `src/shared/types.ts` as the array literal's strings.

Assertions, each printed with the sets it compared: (a) every reader saw seven statuses and every
status once; (b) REFUSED equals `live ∪ unknown` as sets; (c) PASSED minus `discarded` equals `ended`;
(d) the statuses that are Active by (b) AND whose dot is `'ended'` is EXACTLY `{ unknown }` — the
disagreement asserted as one, so an empty read fails. Exit 0 green, 1 red, 2 when a reader found
nothing to read. **`--self-test`**: copies the three files into the scratchpad, applies one edit per
file (move `'idle'` from `live` to `ended` in the resume copy; move `case 'unknown'` under `return
null` in the gate copy; change `unknown`'s dot to `'idle'` in the status copy), runs the readers over
each edited copy in turn with the others pristine, and requires red each time; the copies are removed
in a `finally`. Not in `package.json` this phase (a new script must be classified in
`build/verification-checks.mjs` for `gate:checks`); the verifier runs `node build/p303/rederive.mjs`.
It starts no Electron, so `HELPER_USER_FLOOR` does not move.

### 6.3 The gates

- **T23** (C), in `TEXT_RULES` (`conformance-manager.mjs:71-97`), read with the parser as T4, T10, T12
  are: `['T23', 'Phase 303, mechanism 1', 'the domain names no second live-status set: rowPasses reads row.gates and no status literal, and the only array holding two or more statuses is STATE_FILTER_KEEPS']`.
  Two clauses over `view.ts`: (i) the `FunctionDeclaration` `rowPasses` contains `PropertyAccessExpression`s
  ending `gates.live`, `gates.unknown` and `gates.ended`, and no `StringLiteral` whose text is in
  `SESSION_STATUSES`; (ii) over every domain file, every `ArrayLiteralExpression` or `new Set([...])`
  with two or more status strings sits inside the `VariableDeclaration` named `STATE_FILTER_KEEPS`.
  Each clause increments `checked('T23')`.
- **Two ablations** (C) in `ablation.mjs` (`:105-767`, 69 entries; the header count at `:51`
  becomes 71), rule `T23`, both `file: VIEW` (a new constant beside `:85-98`):
  `{ n: 'L1', from: "if (filters.lifecycle === 'active' && !(row.gates.live || row.gates.unknown)) return false;", to: "if (filters.lifecycle === 'active' && row.status !== 'running' && row.status !== 'idle' && row.status !== 'needs_input' && row.status !== 'unknown') return false;" }`
  and `{ n: 'L2', from: "export function stateFilterKeeps(", to: "const LIVE_AGAIN: readonly SessionStatus[] = ['running', 'idle', 'needs_input'];\nexport function stateFilterKeeps(" }`.
  Each must newly redden T23 alone.
- **`manager-conformance-probe.mts`** (C): `ALL` at `:814` gains `lifecycle: 'all'`; a new `V6`,
  `'§2.4, Phase 303'`: over `STATUSES` minus `discarded` in one projection, `visibleIds` under
  `{ ...ALL, lifecycle: 'active' }` is the four and under `'ended'` the two, and under
  `{ lifecycle: 'ended', stateFilter: 'working' }` is empty. Its own `LIVE` at `:208` is untouched
  (it is not in the domain).
- The battery: `typecheck`, `build`, `test`, `smoke:t1`, `conformance:manager`, `ablation:p293`,
  `probe:p293`. `conformance:hue` is out (no token value moves). `gate:contract` untouched
  (`contract-baseline.txt` holds no sheet filter, checked). Native menus untouched (`menu.ts:940`,
  `:951` name the doors and no filter).

### 6.4 Every builder's own check

`npm run -s typecheck`, then targeted `npx vitest run --no-cache <path>` on each test file touched,
each under 90 s, exit codes reported. `LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` on every file
touched. Nobody runs `npm run build`, `npm test` whole, a smoke, a probe, `npm run shot` or `package`.

## §7 What is NOT in this phase — the entry's refusals, in full

- No change to the Past order the operator ruled on. One list in main's order, newest removal first,
  grouped under a project heading only when the project filter names one project. The new control is
  absent on Past and its value is reset on the tab change, so it cannot reach that list.
- No change to what any verb does. End, Remove, Restore, the batch loop, every gate in
  `sessionMenuItems()` and every re-check at the press are the same code, and `conformance:manager`'s
  driven half must read exactly what it reads today.
- No status added to `SESSION_STATUSES`, and no status's meaning changed. `src/shared/types.ts:83-91`
  is not edited.
- No state option removed and no state word changed. All seven options stay, the seven keep rows stay,
  no option list is narrowed, no value is coerced, and the row's detailed word is byte-identical —
  ruling 2.
- `login-switch.ts:39`'s `LIVE_STATUSES` stays untouched, and it is not tidying to be folded in later.
  It answers a DIFFERENT question, being which sessions a login switch can restart, and it legitimately
  excludes `unknown`: a session Tortie cannot see is not one it may restart. Merging it with the
  lifecycle partition would silently widen a restart.
- No exhaustive switch added to `sessionActionGates`. Its `===` comparisons are the gap named in
  mechanism 1, they are the gap today, and closing them belongs to a phase about the gates.
- No second word and no group header on the row. Ruling 2 again, and it is what protects 298's density.
- Nothing about the monitor's lag. Active means what Tortie BELIEVES is alive: the death is noticed by
  the activity monitor's tick and `reapDeadSession` (`core.ts:1001`, `:2330`) writes `exited`, and the
  timer is 1 s while a window has focus and 2 s without (`core.ts:555-556`), so a row can read Active
  for about one tick plus the reap's snapshot capture after its process is gone. That is stated as the
  limit in one clause on the Active hover's own terms and is NOT closed here — a lost tombstone and the
  reap's own windows are Phase 302's.
- No new token, no change to the dot, and no change to the 47px toolbar or the 52px title bar.
  (`--sm-segment-inset` is sheet geometry under the stylesheet's own header, not a token; `tokens.css`
  is not edited.)
- No shared segmented-control component, and no roving tabindex added to this one or to the two that
  already ship.
- No release.

## §8 Where the entry's citations drifted or its claims did not hold at dc226df6

Each is a pointer the entry gave, then what the tree says. The MECHANISM is unchanged by every one.

| Entry says | Tree at dc226df6 |
| --- | --- |
| `view.ts:50-56` `ManageFilters`, `:58-63` `DEFAULT_FILTERS`, `:70-80` `STATE_FILTER_KEEPS`, `:91-101` `rowPasses` | `:54-57`, `:62-67`, `:74-84`, `:95-109` (a longer header comment) |
| `SessionManagerSheet.tsx:355-365` `clearFilters`; `:522-524` `data-mode`; `:575` project select; `:618-640` State select; `:399` clear-filters button | `:368-378`; `:539-543`; `:598`; `:641-659`; `:412` |
| `copy.ts:793-795` `NO_MATCH_*` | `:868-870` |
| `session-manager.css:198-209` `.sm-toolbar`; `:37` `--sm-toolbar-h`; `:215-247` the field and selects | `:361-372`; `:49`; `:378-418` |
| `probe-p293.mjs:145`, `:171-178` pin 47 | `:220-221` (`TOOLBAR_H`, `TITLE_H`), `geometryFindings` `:618`, self-tests `:1993-1995` |
| `p293-sheet-render.test.tsx:232` (47px describe), `:176` (DOM contract) | `:244`, `:188` |
| `projection.ts:286-289` `primaryOf`'s unknown arm | `:295-297` (function `:278-303`) |
| `status.ts:338-346` | holds (`:338-345`; `statusVisual` is `:296-352`) |
| `session-manager-slice.ts:146-171`, `:180-184`, `:296`, `:461-508`, `:510-528` / `:520` | `:146-172`, `:179-184`, `:296`, `:461-508`, `:510-532` / `:520` — hold within a line |
| `resume.ts:852-882`, `:903-953`; `lifecycle-gate.ts:95-117`; `login-switch.ts:39`; `types.ts:83-91`; `use-sheet-refresh.ts:8`, `:154-162`, `:329-338`; `assert-import-boundaries.mjs:135-138`; `core.ts:555-556`, `:1001`, `:2330`; `menu.ts:940`, `:951`; `AppearanceSection.tsx:167-186`; `settings.css:393-431`; `EditorPanel.tsx:362-380` / `editor.css:362` | hold (`SessionActionGates` closes at `:883`; `.ed-mode` is `editor.css:365`) |
| "`AppearanceSection.tsx:558-570` is the second use of the same class" | **Wrong.** `:558-570` is `role="radiogroup"` with class `set-frame-colors`, not `.set-segments`; `.set-segments` has ONE use, `:167`. The conclusion (nothing exported, copy the shape) still holds. |
| "`p293-session-manager-slice.test.ts`" under `src/renderer/session-manager/__tests__/` (implied) | It is `src/renderer/state/__tests__/p293-session-manager-slice.test.ts` |
| "The Past tab is already safe, by two mechanisms" | Three: `selectSheetView` already coerces `stateFilter` to `'all'` off Managed at `use-sheet-refresh.ts:174`. The new field takes all three (§4). |
| Mechanism 6: "`padding` and `gap` 1px" | A literal 1px reddens T20 in both the gate and the test. Written as `--sm-segment-inset`, sheet geometry, per §5. The NUMBER is the entry's. |
| "`ablation:p293` … 60 ablations" (CLAUDE.md's table) | 69 entries at `ablation.mjs:105-767`; the header at `:51` says 69. Becomes 71. |
| "a session forced to `unknown`" with no mechanism | Needs the drive (§2, §6.1 step 4); the drive joins C's files. |
| The toolbar math "624 of 1140 at 1180; 624 of 1012 at 1100" | 180 + 170 + 136 + 114 + 3 × 8 = 624, holds; the control adds about 168 and fits both. |

## §As built — every difference from the spec above, and why (the integrator, 2026-09-21)

Reconciled over `git status` and `git diff` at `dc226df6`: 22 tracked files changed, 2 new
(`build/p303/rederive.mjs`, `src/renderer/session-manager/__tests__/p303-lifecycle-partition.test.ts`),
plus the integrator's three edits below. Each file was touched by ONE builder; the two files no
builder was assigned are the first row. Where this section and the entry disagree, the entry wins.

| Where | The spec said | What was built, and why |
| --- | --- | --- |
| `src/renderer/session-manager/actions.ts:948`, `__tests__/p293-actions.test.ts` | Not assigned to anybody (§2), and the entry's `checked ⊆ visibleIds` clause named only the PRUNE via `selectSheetView` | `managedView`, the batch's OWN by-name copy of the filters (`startBatch` names from it and `batchTargetsNow` re-checks against it, rule B8: the batch never trusts that the prune has run), gained `lifecycle: sheet.lifecycle` — one line, by A. Without it `typecheck` is red (TS2345) AND the Semver paragraph's claim that the control "cannot put a row in front of a batch" is false: ablating it to `'all'` names a live row hidden under Ended. Two tests under `THE FREEZE` pin it; the integrator re-ran that ablation and both go red, restore sha256-identical. **The entry missed this second reader of the filters.** |
| `session-manager.css` | §5's block carried `font-family`, `border: 0`, `background: none`, `cursor: pointer` on the segment | Left out: `globals.css:103` already resets every `button` to exactly those. Only what the segment adds is stated. The 1px inset is `--sm-segment-inset` on `.modal.session-sheet` as §5 said (the entry's letter said a literal 1px, which T20 refuses). |
| `conformance-manager.mjs` T23 | Owner string `'Phase 303, mechanism 1'` | `'§2.4, Phase 303'`, the `§, Phase` shape every other row of `TEXT_RULES` uses. §6.3's "or `new Set([...])`" collapses into the array-literal walk, since a `new Set([...])` holds an array literal. The alphabet is read from `SESSION_STATUSES`'s array literal, so the gate carries no list. 13 checks. |
| `ablation.mjs` | `VIEW` "a new constant beside `:85-98`" | `VIEW` already existed at `:82`; nothing added. L1 and L2 as written, header count 69 → 71. Whole list run by the integrator: 71 of 71 red on their own rule, 79.0 s. |
| `manager-conformance-probe.mts` V6 | Three checks | 14: the four/two/six sets, four pairs, the MEMO KEY driven through the real store (`selectSheetView` under All, `patchSessionSheet({ lifecycle })`, read again — a key without the field answers the stale six), the tab-change reset and the off-Managed coercion over a Past list. |
| `probe-p293.mjs` arm 16 | "runs after arm 10 and before 11c" | Runs after 10 and before 13, which is also before 11c (`:5007`). Ordering intent kept. |
| §6.1 step 4 | The row's `stateLabel` is `Unreachable` | The DOM text node is `unreachable`; the capital is `::first-letter` CSS (`copy.ts:236-243`). The arm and the render test assert the lowercase word. |
| §6.1 step 6 | "click `Ended`" over a checked selection | Impossible in the app: the toolbar draws no filters in selection mode. The attack is ONE raw store write through the drive's new item 6, `attackPrune(lifecycle, ids)`, past `patchSessionSheet`'s own clear — the shape the conformance probe's B8 drives — and the arm asserts the control's ABSENCE in selection mode first. The prune must then answer, from the store (`sheetChecked`) and from the DOM. |
| §6.1 step 7 | "two live shells (`running` while a command runs, `idle` at the prompt)" with no mechanism | `typeIntoPane`: one SYNCHRONOUS `tmux send-keys` on the scratch socket (the checkout's vendored tmux when present, else PATH), typing `sleep 600` into l1's pane; the arm's `finally` types `C-c`. `P293State.store.sessions[]` gains `tmuxName` for it. At the parent the drive carries no `tmuxName`, so l1 is not typed into there and the arm says so. |
| `p293-session-manager-drive.ts` | `hold(id, status?)`, `held` a `Map`, `release()` clears all | As said, plus: a status off the closed `P293_HELD_STATUSES` list is REFUSED (returns false); `release(id?)` releases one or all and calls `refreshSessions()` so main's list comes back at once; `applyHolds()` paints only over a running/idle row main pushed and never re-writes a row already painted, so its own write does not re-fire the subscription. |
| Arm 11's readers | Nothing | Two edits the spec did not foresee: `'on'` joins `STATE_CLASSES` (a chosen and a resting segment are one role key, not two), and `[data-sm="lifecycle"] button` is named NOT INJECTED by 11b — the sixty-character token 11b types into every pure-text element overflows a nowrap segment, a fact about the fixture; the RESTING clip is still asserted and `clipNotes` says the skip once. Without these 11b is red at HEAD. |
| `rederive.mjs --self-test` | "copies the three files into the scratchpad" | A `mkdtemp` under the system temp dir, removed in a `finally`, so the script runs from any checkout. Five fixtures, not three: pristine-green, the three edits, and an exit-2 fixture (a file with none of the shapes). `--root <dir>` runs it over another checkout; over `/private/tmp/wt-p299` it is green too. |
| The no-regression table | Scenario / today / HEAD | Arm 16 records `readings.p303.byState` keyed `name:status` per State option at BOTH bases; at the parent it skips steps 1, 2, 4, 6, 7, 8 with a note and reads step 5 plus the drawn set under every State option. **Not yet run — the verifiers' job.** |
| The memo-key tests | "a sibling of `:268-282` under `{ lifecycle: 'active' }`" | That sibling alone stays GREEN with the field out of the key (a projection change refreshes the memo anyway). A added a DISCRIMINATOR: no projection change, batch RUNNING so the patch does not clear the selection itself, `patchSessionSheet({ lifecycle })` alone must prune. The integrator ablated `sheet.lifecycle` out of the key: exactly that test and the render test's memo-key case go red (2 of 70), restore sha256-identical. |
| `p293-copy.test.ts` | Labels and hovers byte for byte | Also: each label one capitalised word, each hover under 100 characters, `STATE_FILTER_OPTIONS.length === 7`. |
| `build/p293/SPEC.md` | §2.14 only (C) | §2.14 as specified. The integrator also corrected §2.4's stale line 209: it said the selects are `--text-xs` (they are `--text-sm` since Phase 298) and "the four controls combine with AND" (five). |
| `build/verification-checks.mjs:551-552` | Not named | Comment said the drive supplies "one held needs_input"; the integrator made it say what the drive now does. `gate:checks` and `gate:background` re-run green after. |
| `CHANGELOG.md` | The integrator's | One unwrapped line under `## Unreleased` → `### Added`, no commit link, the one limit in one clause. |

**Entry citations that drifted beyond §8's list.** `state()` in the drive is `:144`, not `:73` (`:73`
is `P293Row.checked`). §2's "five renderer tests already import from `../../../main/`" — the tree has 7.
After the edits the memo key is `use-sheet-refresh.ts:157-167` and the prune `:337-346`.

**Unchanged, confirmed by the integrator.** `STATE_FILTER_KEEPS` and `STATE_FILTER_OPTIONS` are
byte-identical to `dc226df6` (`git diff` over `view.ts` holds four hunks and none touches them);
`src/main/sessions/lifecycle-gate.ts`, `src/renderer/state/resume.ts`, `login-switch.ts`,
`src/main/logins/`, `src/main/credentials/`, `src/shared/types.ts`, `status.ts`, `projection.ts`,
`tokens.css`, `menu.ts`, `package.json` and `contract-baseline.txt` are untouched;
`gate:contract` byte-identical; `HELPER_USER_FLOOR` at 145.

**The verdict the verifiers still owe.** Every claim above about the RUNNING app — arm 16 at HEAD, arm
16 at the parent, arm 11's 47/47/52 with the control present, and the side-by-side table — has not
been driven by anybody. The builders and the integrator ran no Electron.

### §As built, the fix round (2026-09-21) — one fix, then an independent reverify

Two verdicts came in: Lens 1 (the Electron verifier) `needs_work` with two majors and two minors, Lens 2
(the store and lexer verifier) `approved` with one minor. Every major and minor is fixed at its named
place below, or said to be NOT this phase's and why. The fix ran ONCE. Nothing here widens the phase:
no source file under `src/renderer/session-manager/` or `src/renderer/state/` moved, no verb, no
status, no token, no copy on the face, no menu.

| Problem | Where | What was done |
| --- | --- | --- |
| **Lens 1 major 1.** Arm 16 never stood up a `running` row while the pairs ran, and hid it: the six were checked at fixture time only (when two fresh shells still read the transient `running`), the 21 pairs then ran over five statuses, the three `working` pairs were computed over an empty set, and the arm printed "0 disagreeing". Two causes, both proved live by the verifier: `send-keys -t =<name>` is no pane target on the vendored tmux 3.7b, and with the target fixed a scratch-HOME zsh shows `keypad_flag` 0 under `sleep`, while `nativeVerdict` (`src/main/activity/state-machine.ts:227-232`) answers nothing for a shell pane until `sawKeypad`. | `build/p293/probe-p293.mjs` (arm 16, `typeIntoPane`, `tmuxBinFor`, the header), `src/renderer/app/p293-session-manager-drive.ts` (`P293_HELD_STATUSES`, `applyHolds`, `P293State`), `build/verification-checks.mjs:551-554` (the comment) | **The typist is gone and `running` is painted like the other three.** `P293_HELD_STATUSES` is `['needs_input', 'unknown', 'restorable', 'running']`; the arm's `PAINTED` is `{ l1: 'running', l3: 'needs_input', l5: 'unknown', l6: 'restorable' }` and the fixture line says so; `typeIntoPane`, `tmuxBinFor`, the `send-keys` child, its `C-c` in the `finally`, the `typed` flag, the header's "ONE SHELL IS MADE TO RUN A COMMAND" paragraph and the SAFETY line naming the tmux child are removed, and `P293State.store.sessions[].tmuxName` with them (its only reader was the typist). The probe now runs NO tmux of its own. **Why painting `running` is safe:** `applyHolds` paints only over a `running` or `idle` row main pushed, so `running` is only ever painted over a row that IS live and never over one main says has stopped, which is the row a batch could otherwise be made to name; the drive's comment says so in place of its old "a hold never paints a LIVE status" sentence. **One clause the paint needed:** `applyHolds` now returns a row unchanged when `x.status === status` BEFORE the live guard — a row painted `running` still passes that guard, and without the clause the subscription re-fired on its own write. **The arm now FAILS when a status is absent at the moment a reading is taken:** a new pure grader `fixtureFindings(label, taken)` is asked of every step-3 segment reading and every one of the 21 pair readings, each recorded as `{ at, truth }` with the store's list of that turn, and names the reading and the status it lacked; every pair's `readings.p303.pairs[].held` records what the fixture held in that turn, and `readings.p303.heldWhilePairsRead` / `readingsMissingAStatus` say it once. **And the empty-pair count is held to the tables:** `DISJOINT_PAIRS`, computed from `LIFECYCLE_ADMITS` and `STATE_KEEPS` rather than written down, is six (`active x ended`, `ended x running/working/needs-input/idle/unreachable`); over a complete fixture exactly those are empty, and the arm fails on any other count — eight is what five statuses read as. Eight self-test fixtures: a complete fixture passes; a reading with no running row is caught and NAMED (`all x working (no running row)`, `1 of 2`); complete at fixture time and incomplete at a pair is still caught (the check is per reading); two missing statuses both named; the six disjoint pairs by name; exactly those empty over the six-row fixture; and two MORE empty with no running row, which is the build round's 8. |
| **Lens 1 major 2 / Lens 2 minor.** `probe:p293` exits 1 at HEAD on `input#sm-search` at 547.08px wide, BELOW the parent's 694x28 — the search field is `flex: 1 1 auto` with `min-width: 180px` in a `flex-wrap: nowrap` toolbar, so it is the toolbar's slack and yields exactly the control's box plus one gap (694 − 138.93 − 8 = 547.07). The entry's proof bullet 5 ("no control narrower or shorter than today") and its toolbar arithmetic (which counted the field at its 180px minimum) cannot hold with ruling 1's control in that bar. | `build/p293/probe-p293.mjs` `HIT_EXCEPTIONS`, its self-tests; this file §6.1 | **THE SCENARIO THAT READ WORSE THAN TODAY IS REMOVED, NOT REPAIRED**, under the operator's standing rule and the entry's own sentence: the search field's `HEAD ≥ parent` width clause is out of the no-regression proof. Mechanically that is the FOURTH row of `HIT_EXCEPTIONS`, `'input[type=text]#sm-search.input': { width: 547, height: 28, parentWidth: 694, parentHeight: 28, why }`, Phase 298's exact shape: the exception wins over the parent's file-fed floor, it is SAID in the notes ("ADMITTED EXCEPTION APPLIED"), and it is graded like any other floor, so a later round that narrows the field FURTHER at the 1440px window still goes red; the height is still held to the parent's 28 (only the width was removed) and both clear WCAG 24 x 24. The `why` carries the arithmetic, the app's 960px minimum window (sheet 912, inner 872, less 170 + 136 + 114 + 138.93 and four 8px gaps: about 280px over the 180 floor, never overflowing) and the word REMOVED. Four self-tests: held to 547 and not to a parent file's 694; 540 is caught; 27 tall is caught; narrower than the parent, equal in height, WCAG on both, and the `why` names 138.93. The "never seen" fixture that used the search key now uses `textarea#sm-invented.input`, and the ADMITTED count is 4. §6.1's table row is restated as Lens 2 asked: heights and the three selects' widths equal at both bases; the search field's clause REMOVED with the arithmetic. **Not decided here and queued for the operator by the docs follow-up:** whether the search field's width is elastic by design (then this row is its ruling, as the Managed tab's was) or the control should sit elsewhere. `docs/BACKLOG.md`'s proof bullet 5 and its "624px of 1140px" arithmetic are the entry's to amend in that follow-up; this round did not edit the entry. |
| **Lens 1 minor 3.** Pointing `P293_PARENT_CHECKOUT` at wt-p299 (Phase 298's build) grades arm 11 against `GEOM.parent` = Phase 293's `f6c11f57`: 41 findings at the parent, none about this phase, and neither the header nor §6.1 said the parent run's exit code is not a verdict. | `build/p293/probe-p293.mjs` header (`P293_PARENT_CHECKOUT`) and the `BASE === 'parent'` `say`; this file §6.1 | The sentence, in all three places: the parent run is FOR its `readings.json` (the hit-area floors a HEAD run reads through `P293_HIT_PARENT`, and `readings.p303.byState`), its exit code is not a verdict for a later phase, and its findings are read by arm with the ones that are not arm 11's column being the verdict. The `P293_PARENT_GEOM=head` switch the lens offered as the alternative was NOT added: it is machinery in a fix round, and the sentence is what was asked first. |
| **Lens 1 minor 4.** Eight findings read identically at BOTH bases with the whole battery: 6 x 11b (3 ellipsis kinds from arm R's machine badge; `span.sm-group-path` with no hover title, at 1440/1100/1024) and 2 x 11c (arm 9's done panel left open so 11c reads `{batch:true}` and 10 managed rows). The arm 9/14 and 11c blocks are diff-identical between `dc226df6` and HEAD. | `probe-p293.mjs` arms 9/14, 11b, 11c | **Not this phase's, and not fixed here — said so.** Phase 298's verification ran arm 11 alone, which is why they never showed. Its own entry: 11c presses `[data-sm="batch-done"]` before its reading, and 11b's ellipsis expectation and the group-path title are decided. The docs follow-up queues it. |
| **Lens 2 nit (fixed, one word).** CHANGELOG's "can read Active for about a second" put a number where the house rules forbid one and understated the unfocused case. | `CHANGELOG.md:11` | "…can read Active for a moment." — the hover's own words. |
| **Lens 1 nit / Lens 2 nit (NOT changed).** `LIFECYCLE_OPTIONS.ended.hover` "Over, and can be restored" over-promises for an `exited` row with nothing saved. | `copy.ts:85` | Left as built: both lenses called it a copy ruling for the operator rather than a defect, and the row itself reads "Nothing saved" with a disabled Restore. Queued beside the search field. |
| **Lens 1 nit (NOT changed).** `.sm-lifecycle-opt.on` reads 4.504:1 in the light base, 0.004 above AA. | `session-manager.css` | The app's own `--accent`/`--on-accent` pair, not this phase's token; `conformance:hue` owns it. Noted, nothing moved. |
| **Lens 1 nit.** A sibling verifier left `src/renderer/session-manager/__tests__/p303-verifier-hostile-filters.test.ts` in the worktree. | the tree | Lens 2 kept it deliberately (9 tests, 756 filter combinations through the real store with a running batch, ~160 ms; `gate:checks` green with it). It was run in this round's vitest batch and passes; whether it stays is the main session's call. |

**Commands this round ran, with exit codes.** `node build/p293/probe-p293.mjs --self-test`: exit 0,
**231 fixtures behaved** (219 + 4 arm 11 + 8 arm 16). `npm run -s typecheck`: exit 0 (0 violations,
0 cycles). `node build/p303/rederive.mjs`: exit 0; `--self-test`: exit 0, 5 fixtures.
`node build/p293/conformance-manager.mjs`: exit 0, 58 rules, 2307 checks, T23 13 checks.
`node build/p293/ablation.mjs`: exit 0, 71 ablations each red on its own rule, 75.2 s.
`npx vitest run --no-cache` over 12 files (p303-lifecycle-partition, p293-view, p293-sheet-render,
p293-sheet-refresh, p293-actions, p293-copy, p293-css-tokens, p303-verifier-hostile-filters,
p293-session-manager-slice, saved-output, p293-doors, p293-menu-host): exit 0, **446 passed**.
`node build/assert-hermetic-checks.mjs`, `assert-background-teardown.mjs` (444 files, 2 starts, both
in a finally), `assert-electron-teardown.mjs` (145 against floor 145): exit 0 each. `node --check`
on the probe: ok. `LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over the five files touched: nothing.

**What this round did NOT run, by the lane.** No Electron and no `npm run build`: `probe:p293` at HEAD
(arm 16 with `running` painted and the fixture held at every pair, arm 11 with the search exception
applied and the 47/47/52 re-read) and the parent run for its readings are the REVERIFIER's, one Electron
at a time under the lock. The expectation, stated so it can be held to: at HEAD arm 16 reads
`l1=running (painted)`, all six statuses in every one of the 24 readings, exactly 6 empty pairs, 0
disagreeing, and arm 11 reads 547.08 x 28 as an ADMITTED exception with 0 findings of this phase's — the
8 pre-existing findings of Lens 1 minor 4 remain at both bases and are said to be not this phase's.

**Files this round touched.** `build/p293/probe-p293.mjs`, `src/renderer/app/p293-session-manager-drive.ts`,
`build/verification-checks.mjs` (one comment), `CHANGELOG.md` (one word), `build/p303/SPEC.md` (§6.1 and
this section). Nothing under `src/renderer/session-manager/`, `src/renderer/state/`, `src/main/`,
`docs/`, `package.json` or the contract baseline.
