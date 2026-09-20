#!/usr/bin/env node
/**
 * probe-p293.mjs. THE PHASE 293 APP RUN: the session manager, direction D, the
 * Tabbed sheet.
 *
 * ONE Electron through build/electron-run.mjs's `withElectron`, on a scratch
 * profile, a scratch HOME and the tmux socket build/harness-socket.mjs hands
 * it, over four scratch git projects it builds inside its own run directory,
 * and, for the `R` arm, the loopback scratch machine from
 * build/scratch-machine.mjs. It drives REAL pointer and key events over the
 * DevTools protocol and reads the sheet's DOM contract (build/p293/SPEC.md
 * §2.14). It spawns no agent and spends no token: every session is a shell.
 *
 * ## What the drive supplies, and nothing else
 *
 * `window.__p293` (src/renderer/app/p293-session-manager-drive.ts) does only
 * what a probe cannot do from outside: the menu door through `runMenuAction`
 * (a native menu bar item cannot be clicked from a probe), the ellipsis's
 * native menu as labels with a captured item run late, one held needs_input
 * (a shell never asks), and the set up (a folder opened, a shell created, a
 * tab closed). A native `<select>`'s popup cannot be driven either, so a
 * filter is chosen by setting the select's value and dispatching its `change`,
 * which is the event React's handler reads. Every lifecycle press is a real
 * click on the sheet.
 *
 * ## The arms (P293_ARMS, a comma separated subset; all by default)
 *
 *   1   both doors with NO project open: Manage opens Managed, Past opens Past
 *   2   a closed tab project's sessions are drawn under `Tab closed`
 *   3   End, Cancel once, then Confirm: the row reads ended and stays
 *   4   Remove to Past: the row leaves Managed and both counts move
 *   5   Restore from Past into a closed project: the inline ask, the tab
 *       opens, the row is Managed and live, and (the fix round, W1) the
 *       sheet CLOSES and the person is in the session, keyboard in its
 *       terminal, as today's Past Sessions put them there
 *   6   a restore whose folder was renamed away says so on the FIRST press
 *       (the fix round, W7: no ask promising a shell in a folder that is not
 *       there) and KEEPS its row, then Retry succeeds once the folder is back
 *   7   select-all under Running checks exactly the live rows, a second click
 *       clears
 *   8   the batch confirmation's eligible and skipped counts against the
 *       fixture's own truth
 *   9   a batch in which the probe ends one target out of band at the press:
 *       that target reads Already ended and the rest end, read from MAIN
 *   10  the matrix of §8.1 for the rows this run stands up: group against
 *       targetKey, state against statusVisual, the visible button, the
 *       checkbox, batchEligibility, and the sheet's menu against the policy's
 *       item for item
 *   11  THE SHEET'S GEOMETRY, ITS INTERACTION STATES AND ITS TYPE, read as
 *       rectangles and computed styles and never as a photograph (Phase 298).
 *       It runs in two stages, 11a where the arm has always been and 11c after
 *       every other arm, because the density stage stands up twenty one rows of
 *       its own and nothing downstream should see them.
 *
 *       THE CONTROL, AND IT MUST NOT MOVE. Both toolbar modes at 47px and the
 *       title bar at 52px, at the parent and at HEAD, graded by
 *       `geometryFindings` exactly as Phase 293 wrote it. Phase 298's own
 *       formula answers 44 for both and the entry names that and REFUSES it:
 *       they are the operator's geometry from the design study and shortening
 *       them would put a 6px change to the sheet's frame inside a phase about
 *       its rows. A reading that moves is a finding on either base.
 *
 *       11a  the box of `tr.sm-row`, `.sm-past-row`, `.sm-skeleton`,
 *            `thead th`, `tr.sm-group > th` and `[data-sm="foot"]`, and the
 *            PITCH between consecutive row tops read SEPARATELY, because the
 *            two layout models differ by one pixel on purpose and a single
 *            reading would conflate them; EVERY INTERACTIVE TARGET, enumerated
 *            by its own role rather than from a list, each at or above the
 *            parent's reading for the same control, with one ADMITTED exception
 *            named with its arithmetic, and each against WCAG 2.2 AA 2.5.8's
 *            24 x 24 as a clause of its own;
 *            `--sm-name-min` and `--sm-actions-min` MEASURED
 *            against what the stylesheet declares; the computed hover, checked,
 *            open and focus fills against the tokens' own resolved values; the
 *            transition and the same three under an emulated
 *            `prefers-reduced-motion`; every icon size; and every text node's
 *            contrast through the app's OWN `contrastOf`, on BOTH bases
 *            11b  the clipping attack at three widths
 *            11c  the rows a 900px sheet holds, MEASURED and not computed
 *   12  Go to session on a live session in a closed project: the sheet closes,
 *       the tab opens, and the keyboard is in that session's terminal
 *   13  F2 on a sheet row with an active session behind: the row's rename
 *       opens and the active session's name is byte identical after
 *   14  after arm 9's batch under Running, the keyboard is inside the sheet
 *   15  the machine that comes back (§8.2's first attack): NOT DRIVEN here and
 *       said so. The spec gives it to the verifier unless the sshd restart is
 *       stable in the harness, and this run does not claim it is
 *   R   the scratch machine: one live session on it, its matrix row (the
 *       group is `<machine>:<path>`, the menu matches the policy), and Go to
 *       session on it. STATED, from the matrix verifier's P3: creating a
 *       session on a machine leaves that folder open as a tab (and main's
 *       re-home puts back a remote tab a person closed), so this Go to
 *       session lands in an OPEN tab. The remote half of §8.4's "in a closed
 *       project" is not driven here; the local half is arm 12
 *   L   (the fix round, W1) Restore from Past into a project that is open but
 *       NOT the active one: the sheet closes, that project is switched to,
 *       the session selected and the keyboard in its terminal
 *   O   (the fix round, W3) Session → Past Sessions… with the Catch Me Up page
 *       open draws the sheet OVER the page; Escape closes the sheet and the
 *       page is still there
 *   J   (the fix round, W6) ⌘J with the sheet open closes the sheet FIRST and
 *       opens the list over the app; nothing is stacked on the sheet
 *   D   (the fix round, the batch attack's P1) a DOUBLE click at the centre of
 *       `End 2 sessions`, whose panel closes by itself and slides an ended
 *       row's Restore under the pointer: the second click restores nothing
 *
 * Arms 9 and 14 are one batch and run together; 12 closes the sheet and the
 * run reopens it. Arms that depend on another's state (4 on 3, 8 on 3) are
 * satisfied by the set up whichever subset is chosen.
 *
 * ## What it refuses
 *
 *   - No `GMUX_TMUX_SOCKET`, or the socket `gmux` or `default`, by name.
 *   - No `GMUX_HARNESS_DIR`.
 *   - `out/main/index.js` missing, or any session manager source newer than
 *     the newest bundle under out/renderer/assets: "build first", exit 2,
 *     before anything is launched. Asked of the checkout the Electron will
 *     actually run, which is `P293_PARENT_CHECKOUT` when one is named.
 *   - An unknown arm name.
 *   - `P293_PARENT_CHECKOUT` naming a directory that is not there.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET   the scratch socket; build/harness-socket.mjs sets it
 *   GMUX_HARNESS_DIR   the scratch directory; the same wrapper sets it
 *   P293_ARMS          a subset of 1..15,R. All by default
 *   P293_OUT_DIR       where the readings go. Default out/p293
 *   P293_HIT_PARENT    a PARENT run's readings.json. Arm 11's hit-area floors are
 *                      RAISED to whatever that run measured for the same role key,
 *                      which is how "no hit area smaller than today" is asserted
 *                      about every control and not only about the ones whose
 *                      numbers are pinned in `HIT_PARENT`. A file may only raise a
 *                      floor, never lower one. Optional; without it the arm says
 *                      which controls it therefore did not assert about
 *   P293_PARENT_CHECKOUT
 *                      a BUILT worktree at the parent commit (Phase 298's is
 *                      `f6c11f57`, Phase 293's own HEAD). The SAME run is
 *                      pointed at it: the Electron is launched with that
 *                      checkout as its cwd, so `.` is that app, and every
 *                      Phase 298 grader switches to its PARENT column. The
 *                      readings still land under this checkout's out/p293, so
 *                      the two runs are compared side by side. ONE Electron at
 *                      a time and never both at once: run it, then run the
 *                      other. Mandatory for this phase, because the operator
 *                      reported the rows himself and CLAUDE.md makes the
 *                      parent-commit measurement mandatory whatever the tier.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p293                                   build, then every arm
 *   node build/harness-socket.mjs --fresh gmux-p293 'P293_ARMS=1,2,3 node build/p293/probe-p293.mjs'
 *   node build/harness-socket.mjs --fresh gmux-p293-11 'P293_ARMS=11 node build/p293/probe-p293.mjs'
 *   node build/harness-socket.mjs --fresh gmux-p293-11p 'P293_ARMS=11 P293_PARENT_CHECKOUT=/private/tmp/wt-p293-parent P293_OUT_DIR=out/p293-parent node build/p293/probe-p293.mjs'
 *   node build/harness-socket.mjs --fresh gmux-p293-11h 'P293_ARMS=11 P293_HIT_PARENT=out/p293-parent/readings.json node build/p293/probe-p293.mjs'
 *   node build/p293/probe-p293.mjs --self-test           the graders, nothing launched
 *
 * ## SAFETY
 *
 * The Electron is started through `withElectron`, which ends the tree it
 * started, and the scratch tmux server it was handed, in a `finally` whatever
 * happened. The scratch machine's sshd, agent and tmux server are started by
 * build/scratch-machine.mjs, every pid recorded as it starts, and stopped in
 * this file's own `finally` by `machine.stop()` and the recorded pids alone.
 * Every ssh goes through build/ssh-run.mjs. Every other process is a
 * synchronous git, or arm 11's one synchronous `tsx` (below), that has exited
 * before its call returns. Exit 0 with no finding, 1 with findings, 2 on a
 * refusal.
 *
 * NO PHOTOGRAPH. `npm run shot` may never run in this repository, so every
 * claim arm 11 makes is a rectangle or a computed style read out of the running
 * window.
 *
 * ## The one synchronous child arm 11 adds, and why it is not a second reader
 *
 * The contrast half must be judged by the app's OWN helper, `contrastOf`
 * (src/renderer/theme/hue.ts), rather than by a second WCAG implementation that
 * could disagree with the floors the theme is solved against. That helper is
 * TypeScript and imports `culori/fn`, so this file writes a four line bridge
 * module into its own scratch directory, hands it the pairs the window read as
 * JSON, and runs it through the pinned tsx from build/ts-runner.mjs with
 * `spawnSync`. It has exited before the call returns, so it is not the family
 * build/assert-background-teardown.mjs asks about (that gate exempts the
 * `*Sync` forms by name). The import is `../ts-runner.mjs` because this file
 * sits in a subdirectory, which is what build/p293/conformance-manager.mjs:52
 * already does. The bridge imports the helper from the checkout the Electron is
 * running, so the parent run is judged by the parent's own helper.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { refuseRealSockets, scratchMachine, scratchYard } from '../scratch-machine.mjs';
import { keyscanText } from '../ssh-run.mjs';
import { tsxCli } from '../ts-runner.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p293]';
const CALLER = 'build/p293/probe-p293.mjs';
const t0 = Date.now();
const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1)}s ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers the sheet is held to, BY VALUE from the spec (§2.2), so a wrong
// constant in the stylesheet cannot agree with itself here.
// ---------------------------------------------------------------------------
const TOOLBAR_H = 47;
const TITLE_H = 52;
const TOL = 0.5;
export const ALL_ARMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', 'R', 'L', 'O', 'J', 'D'];

// ---------------------------------------------------------------------------
// PHASE 298. The two columns arm 11 grades against, BY VALUE from the Phase 298
// backlog entry's own measurement tables, so a stylesheet cannot agree with
// itself here either. `parent` is Phase 293's HEAD, f6c11f57, reached with
// P293_PARENT_CHECKOUT; `head` is Phase 298's pick.
//
// WHY THE GRID HAS ONE NUMBER AND THE PAST LIST HAS TWO, and a later round must
// NOT "restore" a 40 to `rowBox` from the entry's table. The two lists use two
// layout models and the reading is a fact about each model:
//
//   * THE GRID IS `border-collapse: collapse`, where the hairline sits BETWEEN
//     two rows. `getBoundingClientRect()` on a `tr` under a collapsed border
//     INCLUDES that border, so the row's own rect and the distance between two
//     rows' tops are THE SAME NUMBER — 41 at HEAD and 74 at the parent — and
//     there is no separate box to assert. `rowBox` and `managedPitch` are kept as
//     two keys because two selectors answer them and a selector that stops
//     matching must still be caught, but they are held to one value.
//   * THE PAST LIST IS A FLEX ROW and `styles/globals.css:13-15` sets
//     `* { box-sizing: border-box }`, so it holds its own hairline INSIDE its
//     declared `min-height`: `pastRowBox` and `pastPitch` are BOTH 40, and a
//     build that let the hairline out of the box would separate them. That pair
//     is a real two-number reading and the CSS must deliver it.
//
// THE PHASE 298 ENTRY'S TABLE IS WRONG ABOUT WHICH MODEL THE GRID USES: it reads
// the collapsed border as one pixel of pitch on top of a 40px box. The app run
// measured 74 against its 73 at the parent and 41 against its 40 at HEAD — ONE
// wrong expectation read twice rather than two defects, and both readings are
// correct. Fixed in the arm, because the only stylesheet change that could make
// the rect read 40 would be taking the border off the row.
// ---------------------------------------------------------------------------
export const GEOM = {
  head: {
    rowBox: 41,
    pastRowBox: 40,
    skeletonBox: 40,
    headThBox: 28,
    groupThBox: 28,
    footBox: 29,
    managedPitch: 41,
    pastPitch: 40,
    // `.sm-loading`'s gap goes to 0, so the skeleton's pitch is the row's own.
    // At the parent 62 + the `--space-4` gap is 70, which is exactly the old
    // two-line pitch the skeleton was derived from, and against a 40px row the
    // loading state was 30px per row too tall and the list visibly resettled.
    skeletonPitch: 40,
    managedRows: 17,
    pastRows: 19
  },
  parent: {
    // 74, not the entry's 73, for the collapsed-border reason above.
    rowBox: 74,
    pastRowBox: 64,
    skeletonBox: 62,
    headThBox: 44,
    groupThBox: 40,
    footBox: 45,
    managedPitch: 74,
    pastPitch: 64,
    skeletonPitch: 70,
    managedRows: 9,
    pastRows: 11
  }
};

/**
 * PHASE 298 FIX ROUND. THE HIT AREAS, AND WHY THE TABLE IS KEYED BY A ROLE
 * RATHER THAN BY A NAME SOMEBODY REMEMBERED TO WRITE DOWN.
 *
 * The build round's reader asked `q('[data-manage-check]')` and nothing else.
 * That attribute is on the body row's checkbox alone (ManagedGrid.tsx:357),
 * while the entry's refusal — docs/BACKLOG.md:31720, "No hit area smaller than
 * today ... and the arm fails on any reading below the parent's", and :31575,
 * "no hit area gets smaller" — is unqualified and is about all of them. The
 * select-all carries `id="sm-select-all"` and no such attribute (:459-462), and
 * neither the row's name button nor a column's sort button was measured at all.
 * ALL THREE SHRANK AND THE ARM COULD NOT GO RED. A promise that is never asked
 * is the exact defect Phase 296 landed to repair, in this repository, in this
 * release.
 *
 * So `targets()` below ENUMERATES instead: everything inside the sheet that is
 * focusable or clickable BY ITS OWN ROLE — a button, an input, a select, a
 * textarea, a link, an explicit interactive `role`, a non-negative `tabindex`,
 * and the `label` a checkbox sits in, which is what a finger actually lands on.
 * A control added by a later round is measured because it is a control, never
 * because somebody listed it.
 *
 * THE ROLE KEY is built from the target's tag, its input type, its id, its
 * sorted class list and the NAMES of its data attributes — never their values,
 * which are session UUIDs — so every row's own copy of a control collapses to
 * one key and the reading is graded at its SMALLEST instance in either
 * dimension. The keys below are those role keys verbatim.
 *
 * `width: null` means the width is content sized and only the height is held.
 * `source` is where the number came from, because a floor with no provenance is
 * a number somebody chose.
 *
 * AND `hitFindings` FAILS ON A KEY THAT MATCHED NOTHING. A hand-written key that
 * silently stops matching is this same defect wearing a different coat, so the
 * table's own spelling is asserted against the running DOM every time.
 */
export const HIT_PARENT = {
  'label.sm-check > input[type=checkbox][data-manage-check]': {
    width: 32,
    height: 32,
    source: 'the body row\'s check target. 32 x 32 at both commits: `--sm-check-target` is 32 and `td.sm-col-select` keeps zero vertical padding on both (session-manager.css:609-621), which is what lets the target keep its size inside a 40px row'
  },
  'label.sm-check > input[type=checkbox]#sm-select-all': {
    width: 32,
    height: 32,
    source: 'the column heading\'s select-all. 32 x 32 = 1024px2 at f6c11f57, MEASURED by the Phase 298 verify. See HIT_EXCEPTIONS: this is the one key the judge admitted a smaller HEAD reading for, and the admitted number is checked like any other floor'
  },
  'button.sm-name[data-manage-name]': {
    width: null,
    height: 37,
    source: 'the row\'s NAME button, the only control in the Session cell and the ONLY door to Details, because `tr.sm-row` carries no click handler. 37 tall at f6c11f57 — the old `.sm-name-text` column, 20 + 2 + 15 — in a 73px content box, MEASURED by the Phase 298 verify. At HEAD the row is `--sm-row-h` 40 and `tbody td` takes `--space-3` above and below, so 28 is all the CELL\'S CONTENT BOX holds and this floor is reachable only by giving the button the cell itself. "no stretch" is what the verify named as the cause of the 20 that shipped'
  },
  'button.sm-sort[data-sort]': {
    width: null,
    height: 20,
    source: 'a column\'s SORT button. 20 tall at f6c11f57: `font: inherit` off a `th` that set no line-height, so it took `body`\'s 20px length. At HEAD `thead th` states `line-height: var(--lh-xs)` and `.sm-sort` keeps `padding: 0`, which is the 16. The heading row is `--sm-head-h` 28, so a sort button that takes its own row clears this floor with 8px to spare'
  },
  'button.btn.btn-secondary.btn-sm.sm-end[data-manage-primary][data-verb]': {
    width: null,
    height: 24,
    source: 'the row\'s End button. 24 AT BOTH COMMITS, because the row draws `.btn.btn-sm` (app.css:2731). The build round wrote 28 here and 28 WAS NEVER WHAT THE ROW DREW on either commit — a mis-authored expectation rather than a regression, and the Phase 298 verify measured 24 at both. It is not a target and nothing about it is being fixed'
  },
  'button.sm-icon-btn[data-manage-more]': {
    width: 28,
    height: 28,
    source: 'the row\'s ellipsis. `--sm-icon-btn` 28 at HEAD (session-manager.css:292-299), 28 at the parent. THE KEY NAMES `sm-icon-btn` ALONE and not the `icon-btn` mechanism 8 adds beside it: a key naming both matched nothing at the parent, so its floor asserted nothing, which the Phase 298 verify caught. That the shared class is now there is conformance:manager\'s clause, not this arm\'s'
  },
  'button.sm-icon-btn': {
    width: 28,
    height: 28,
    source: 'the title bar\'s refresh and close, and the selection toolbar\'s own clear. ONE key: all three are `icon-btn sm-icon-btn` with nothing in the cascade to tell them apart but an aria-label, so the reading is graded at the SMALLEST of them and the count is reported beside it'
  }
};

/**
 * WCAG 2.2 AA, success criterion 2.5.8 Target Size (Minimum): 24 CSS pixels on
 * BOTH dimensions, not on area alone. It is its own clause and it is independent
 * of what the parent read, because "no smaller than today" protects nothing that
 * was already too small.
 */
export const WCAG_MIN = 24;

/**
 * PHASE 298 FIX ROUND. THE ONE ADMITTED EXCEPTION TO THE PARENT CLAUSE, and it is
 * written down BECAUSE an exception that is written down and checked against the
 * floor is a promise, while a number quietly reduced is how this phase nearly
 * shipped.
 *
 * THE JUDGE'S RULING, followed here rather than re-litigated: the select-all in
 * the column heading is admissible as an exception ON THE MERITS and inadmissible
 * as the refusal is currently WRITTEN. The arithmetic is its own:
 *
 *   * 32 x 28 = 896px2 against the parent's 32 x 32 = 1024px2, so it is 128px2
 *     smaller and four pixels shorter.
 *   * It clears WCAG 2.2 AA 2.5.8's 24 x 24 on BOTH dimensions, not on area.
 *   * It is EVERY REACHABLE PIXEL OF ITS OWN ROW. The heading row is 28 because
 *     six text headings each draw `--space-3` + `--lh-xs` + `--space-3` = 6 + 16
 *     + 6, and a taller target could only take pixels from the toolbar above or,
 *     under this cell's `z-index: 1`, from the first data row's own checkbox
 *     below — which is worse than four missing pixels
 *     (session-manager.css:637-657 is where that reasoning already lives).
 *
 * So it CANNOT be made as large as today without breaking something else, which
 * is what makes it an exception rather than an oversight. It is graded against
 * `width` and `height` here exactly as any other floor is graded, and against
 * `WCAG_MIN` as well: A LATER ROUND THAT SHRINKS IT FURTHER STILL GOES RED.
 */
export const HIT_EXCEPTIONS = {
  'label.sm-check > input[type=checkbox]#sm-select-all': {
    width: 32,
    height: 28,
    parentWidth: 32,
    parentHeight: 32,
    why: 'the column heading\'s select-all is every reachable pixel of its own 28px row (six text headings draw 6 + 16 + 6) and 32 x 28 = 896px2 clears WCAG 2.2 AA 2.5.8\'s 24 x 24 on both dimensions; a taller target could only come out of the toolbar above or, under this cell\'s z-index, out of the first data row\'s own checkbox'
  },
  // THE SECOND ADMITTED EXCEPTION, and the operator ruled on this one himself on
  // 2026-09-20 after the arm measured it, because it is the trade his standing
  // rule exists to surface rather than a defect to fix.
  //
  // The row's NAME button is the only control in the Session cell and the only
  // door to Details, because `tr.sm-row` carries no click handler. It reads 37
  // tall at the parent, in a 73px content box, and 28 at HEAD in a 28px content
  // box. So it is NINE PIXELS SHORTER and it is also ALL OF ITS CELL, where the
  // parent's was barely half of one: 37 of 73 is 51 percent, 28 of 28 is 100.
  //
  // THE REFUSAL IT BREAKS WAS UNSATISFIABLE AS WRITTEN. The entry said "no hit
  // area smaller than today", unqualified, in a phase whose entire deliverable is
  // a shorter row — and a control whose height comes from the row cannot keep its
  // absolute pixels while the row loses 33 of them. The choices were this, or
  // giving back three of the seventeen rows to hold one target at 37, or making
  // the whole row clickable, which is a behaviour change and not a density fix.
  // He took this one, so the refusal is amended in the entry in the same commit:
  // never below the WCAG floor, and never smaller than today EXCEPT where the
  // row's own height bounds it, each such case named here with its arithmetic.
  //
  // It is graded like any other floor, so a later round that shrinks it further
  // still goes red, and `WCAG_MIN` is asked of it independently: 28 tall against
  // a floor of 24, and never narrower than 68 by construction, being the 16px
  // agent mark plus the `--space-4` gap plus the measured `--sm-name-min` of 44.
  'button.sm-name[data-manage-name]': {
    width: null,
    height: 28,
    parentWidth: null,
    parentHeight: 37,
    why: 'the row\'s name button is every reachable pixel of its own cell\'s 28px content box (--sm-row-h 40 less tbody td\'s --space-3 above and below), and 28 clears WCAG 2.2 AA 2.5.8\'s 24 on the bounded dimension while its width never falls under 68; it was 37 in the parent\'s 73px box, which is 51 percent of that cell against 100 percent of this one, and the only ways to keep 37 were to give back three of the seventeen rows or to make the whole row clickable, which the operator refused on 2026-09-20'
  },
  // THE THIRD ADMITTED EXCEPTION, and it was found only because the fix round made
  // this refusal able to fail. The app run's own PASS was obtained with eight of
  // the thirteen enumerated targets carrying NO parent floor at all — the arm said
  // so in its notes — and the reverifier ran it the way the fix round intends,
  // with a parent run's readings fed back through `P293_HIT_PARENT`, which is what
  // surfaced this one. That is worth writing down: a promise asserted about 7 of 13
  // controls read PASS, and the same promise asserted about all 13 read FAIL.
  //
  // The Managed tab is 1.1px NARROWER, 101.2 against the parent's 102.3, and its
  // height does not move. The cause is mechanism 6 doing what the entry asked:
  // `span.sm-count` at 19x17 with `padding: 2px 5px` becomes
  // `span.chip-sm.sm-count` at 16x16, because 19, 5 and 1 are on no grid and the
  // app's own chip primitive is 16. The Past tab got WIDER by the same change,
  // 129.08 to 129.76, which is the clearest sign this is the chip's size and not a
  // shrinking tab. 101 x 51 against a 24 x 24 floor is not close to anything.
  //
  // The operator ruled on 2026-09-20 to name it rather than to add a min-width or
  // to keep a chip size that exists nowhere else in Tortie. Graded like any other
  // floor, so a tab that shrinks FURTHER still goes red.
  'button#sm-tab-managed.sm-tab': {
    width: 101,
    height: 51,
    parentWidth: 102.3,
    parentHeight: 51,
    why: 'the Managed tab is 1.1px narrower because its count chip became the app\'s own 16x16 .chip-sm primitive, replacing an ad-hoc 19x17 whose 19, 5 and 1 sit on no grid; the Past tab got WIDER by the same change, the height does not move, and 101 x 51 clears WCAG 2.2 AA 2.5.8\'s 24 x 24 on both dimensions by a wide margin'
  }
};

/**
 * `<Codicon>`'s own scale is 12/14/16 and 24 is the one sanctioned exception
 * this sheet may reach (the activity bar's size). The parent holds a 19 on
 * `AgentIcon` (ManagedGrid.tsx:234) and a 28 on a codicon
 * (SessionManagerSheet.tsx:156), which are the two readings this phase removes,
 * so the parent column asserts they ARE there rather than that they are not.
 */
export const ICON_SIZES = [12, 14, 16, 24];
export const PARENT_ICON_STRAYS = [19, 28];

/**
 * The operator's own twelve project names, BY VALUE from
 * build/probe-p189-tabs.mjs:95-108, which is where they live and which
 * build/assert-tab-floor.mjs derives `.ptab-name`'s 46px floor from.
 *
 * ENTRY DEFECT. The Phase 298 entry calls this "the Phase 137 corpus". There is
 * no name corpus under a p137 name: Phase 137's corpus is 35 real overview
 * sessions across twelve providers, and the NAMES are Phase 189's. Named here
 * rather than fixed silently.
 */
export const NAME_CORPUS = [
  'extract-agentic-engineering',
  'gmux',
  'test-prime-agent',
  'getspecstory',
  'runstory',
  'tortiedotsh',
  'deadreckon',
  'golden-storm-31-aug',
  'get-stats',
  'dev',
  'herdr',
  'rookery'
];

/**
 * The floor is four characters of a name, which is what `.ptab-name`'s measured
 * 46px is built from (app.css:198-220, and build/probe-p189-tabs.mjs's
 * READABLE_CHARS): the shortest prefix that both reads as a word and tells the
 * operator's twelve apart.
 */
export const READABLE_CHARS = 4;
/** Spacing is a 4px grid, so a measured floor is rounded up onto it. */
export const GRID_PX = 4;

/**
 * The longest strings the sheet can say, from the honesty words `copy.ts` draws
 * and one 60 character folder. A long word must WIDEN the table and scroll
 * `.sm-scroll` sideways rather than be clipped, which is what protects the
 * words the type change touches.
 */
export const CLIP_STRINGS = [
  'Replies not recorded',
  'Partial history',
  'Session updated',
  'Conversation saved',
  'Nothing saved',
  'Not applicable',
  'Unreachable',
  'a-sixty-character-folder/that/keeps/going/and/going/and/goes'
];

/**
 * PHASE 298 FIX ROUND. The three elements this sheet may ellipsis, BY SELECTOR,
 * each with the tab that draws it. `session-manager.css` declares
 * `text-overflow: ellipsis` in exactly three places and these are they: `:672`
 * (`.session-sheet .sm-name strong`), `:807` (`.session-sheet .sm-group-path`)
 * and `:541` (`.session-sheet .sm-past-row .sm-name-line .sm-cell-small`).
 *
 * WHY THE ARM ASKS WHICH OF THEM IS DRAWN RATHER THAN COUNTING TO THREE.
 * `SessionManagerSheet.tsx:419-431` renders `ManagedGrid` OR `PastList` and never
 * both, so no single tab holds all three: the Managed tab has the name and the
 * group path, the Past tab under All has the name and the folder line. The
 * clipping attack runs at three widths on whatever state 11a left, which is
 * Managed, so it read "2 kind(s) …, want exactly 3" at HEAD **and identically at
 * the parent** — the third clause was never EXERCISED, and a fixture with longer
 * folders would not have changed that. `build/p298/SPEC.md` A10 item 1 named this
 * and left the choice to the app run, which is why it is decided here: the arm
 * grades the SET against the kinds this tab can hold, keeps catching a fourth
 * kind and a kind that stopped ellipsising, and SAYS PLAINLY which clause was not
 * asked instead of failing for a question it never put.
 */
export const ELLIPSIS_ALLOWED = [
  { what: 'the session name', selector: '.sm-name strong', where: 'either tab' },
  { what: 'the group header\'s path', selector: '.sm-group-path', where: 'the Managed tab' },
  { what: 'the Past row\'s folder line', selector: '.sm-past-row .sm-name-line .sm-cell-small', where: 'the Past tab' }
];

/** The widths the clipping attack is run at, as WINDOW widths and why each. */
export const CLIP_WIDTHS = [
  { width: 1440, why: 'the sheet at its full 1180px' },
  { width: 1100, why: 'the @media (max-width: 1100px) breakpoint itself' },
  { width: 1024, why: 'calc(100vw - 48px), so the sheet is 976px' }
];

/** WCAG AA, the floor DESIGN.md pins and `hue.ts`'s own TEXT_FLOOR. */
export const TEXT_FLOOR = 4.5;

/**
 * PHASE 298 FIX ROUND. The tokens that tell the two BASES apart, so an
 * impossible pairing can be refused by name rather than reported as a contrast
 * number that cannot happen. Every one of these nine has a different value on
 * each base — `tokens.css:15-22` and `:35-42` against `:472`'s light block — so a
 * resolved colour that is in one base's set and not in the other's names the base
 * it came from.
 *
 * They are the GROUNDS and the TEXTS this sheet paints with, and nothing else:
 * an accent, a status hue or a `--border` is either shared between the bases or
 * not a contrast pair, and a token that is shared cannot accuse anybody. The arm
 * reads their RESOLVED values under each base rather than their declarations, so
 * a retune moves the accusation with it and no literal colour is written here.
 */
export const PALETTE_TOKENS = [
  '--bg-canvas',
  '--bg-sidebar',
  '--bg-surface',
  '--bg-raised',
  '--bg-active',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-disabled'
];

/**
 * How many rows arm 11c stands up in its own project. It must exceed BOTH
 * columns' rows-per-sheet expectation — 17 at HEAD and 9 at the parent on
 * Managed, 19 and 11 on Past — or a count bounded by the fixture would be
 * mistaken for a count bounded by the sheet. Twenty one clears the largest of
 * them by two.
 */
export const DENSE_ROWS = 21;

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

export function chooseArms(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { arms: [...ALL_ARMS], bad: [] };
  const names = text.split(',').map((s) => s.trim().toUpperCase()).filter((s) => s !== '');
  const bad = names.filter((n) => !ALL_ARMS.includes(n));
  return { arms: ALL_ARMS.filter((a) => names.includes(a)), bad };
}

/** Arm 1. The sheet is drawn, on the tab the door named. */
export function doorFindings(label, s, wantTab) {
  const out = [];
  if (!s.sheet) out.push(`${label}: no .modal.session-sheet is drawn`);
  else if (s.tab !== `sm-tab-${wantTab}`) out.push(`${label}: the selected tab is ${String(s.tab)}, want sm-tab-${wantTab}`);
  if (s.store.projects.length !== 0) out.push(`${label}: ${String(s.store.projects.length)} project(s) are open, so this is not the no-project door`);
  return out;
}

/** Arm 11. Both toolbar modes at 47px and the title bar at 52px. */
export function geometryFindings(filters, selection) {
  const out = [];
  const near = (a, b) => typeof a === 'number' && Math.abs(a - b) <= TOL;
  if (filters.toolbar.mode !== 'filters') out.push(`11 the toolbar reads mode ${String(filters.toolbar.mode)} with nothing checked, want filters`);
  if (!near(filters.toolbar.height, TOOLBAR_H)) out.push(`11 the filters toolbar is ${String(filters.toolbar.height)}px, want ${String(TOOLBAR_H)}`);
  if (selection.toolbar.mode !== 'selection') out.push(`11 the toolbar reads mode ${String(selection.toolbar.mode)} with a row checked, want selection`);
  if (!near(selection.toolbar.height, TOOLBAR_H)) out.push(`11 the selection toolbar is ${String(selection.toolbar.height)}px, want ${String(TOOLBAR_H)}`);
  if (!near(filters.titleHeight, TITLE_H)) out.push(`11 the title bar is ${String(filters.titleHeight)}px, want ${String(TITLE_H)}`);
  return out;
}

// ---------------------------------------------------------------------------
// PHASE 298. Arm 11's graders. Every one is pure, exported and proved both ways
// under --self-test, because a grader nobody has seen fail is a grader nobody
// has seen work.
// ---------------------------------------------------------------------------
const nearly = (a, b) => typeof a === 'number' && Number.isFinite(a) && Math.abs(a - b) <= TOL;
/** Round up onto the 4px grid. */
export const onGrid = (px) => Math.ceil(px / GRID_PX) * GRID_PX;

/**
 * 11a and 11c. Every box and every pitch against the column this run is on.
 * `read` carries one key per GEOM key; a key the run could not read at all is a
 * finding of its own, because a selector that stops matching is exactly how a
 * geometry claim quietly stops being asserted.
 */
export function boxFindings(base, read, keys = Object.keys(GEOM[base])) {
  const want = GEOM[base];
  const out = [];
  for (const key of keys) {
    const got = read[key];
    if (got === null || got === undefined) {
      out.push(`11 ${key} was not read at all on the ${base} base; want ${String(want[key])}`);
      continue;
    }
    if (!nearly(got, want[key])) {
      out.push(`11 ${key} reads ${String(got)} on the ${base} base, want ${String(want[key])}`);
    }
  }
  return out;
}

/**
 * The two stages between them must have graded EVERY key of GEOM. Arm 11a can
 * only read what the Managed tab draws and 11c owns the Past tab and the
 * densities, so without this a key could quietly stop being asked by falling out
 * of both lists.
 */
export function coverageFindings(keys) {
  const want = Object.keys(GEOM.head).sort();
  const got = [...new Set(keys)].sort();
  if (J(got) === J(want)) return [];
  const missing = want.filter((k) => !got.includes(k));
  const extra = got.filter((k) => !want.includes(k));
  const out = [];
  if (missing.length > 0) out.push(`11 ${J(missing)} was never graded by either stage`);
  if (extra.length > 0) out.push(`11 ${J(extra)} was graded and is not a GEOM key`);
  return out;
}

/**
 * PHASE 298 FIX ROUND. Every interactive target the reader enumerated, collapsed
 * to one row per ROLE KEY and held at its SMALLEST reading in each dimension
 * separately — never by area, because a target that grew wider and lost eight
 * pixels of height has lost eight pixels of height.
 *
 * `count` is how many copies of that role the sheet drew, and `examples` name a
 * few of them, so a finding can be read by a person and the reading says how much
 * of the sheet it stands for.
 */
export function collapseTargets(targets) {
  const by = new Map();
  for (const one of targets ?? []) {
    if (one === null || one === undefined || typeof one.key !== 'string') continue;
    const at = by.get(one.key);
    if (at === undefined) {
      by.set(one.key, {
        key: one.key,
        width: one.width,
        height: one.height,
        count: 1,
        examples: [one.what],
        cellHeight: one.cellHeight ?? null,
        rowHeight: one.rowHeight ?? null
      });
      continue;
    }
    at.width = Math.min(at.width, one.width);
    at.height = Math.min(at.height, one.height);
    at.count += 1;
    if (at.examples.length < 3 && !at.examples.includes(one.what)) at.examples.push(one.what);
  }
  return [...by.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * The floors this run grades against: the pinned `HIT_PARENT` table, RAISED by a
 * parent run's own readings when `P293_HIT_PARENT` names one.
 *
 * A FILE MAY ONLY RAISE A FLOOR, NEVER LOWER ONE. The pinned table is a value
 * read out of a measurement and written down on purpose; a JSON file produced by
 * a run is exactly the kind of input that could quietly relax the promise it is
 * supposed to prove, so the larger of the two wins and a disagreement is SAID
 * (`hitNotes`) rather than resolved in silence.
 */
export function parentTable(fromFile) {
  const out = {};
  for (const [key, one] of Object.entries(HIT_PARENT)) out[key] = { ...one };
  for (const one of fromFile ?? []) {
    if (one === null || typeof one.key !== 'string') continue;
    const was = out[one.key];
    if (was === undefined) {
      out[one.key] = {
        width: one.width,
        height: one.height,
        fromFileOnly: true,
        source: 'the parent run\'s own reading, and this key is not in the pinned table'
      };
      continue;
    }
    out[one.key] = {
      width: was.width === null ? null : Math.max(was.width, one.width),
      height: Math.max(was.height, one.height),
      source: `${was.source} (the parent run read ${String(one.width)}x${String(one.height)})`
    };
  }
  return out;
}

/**
 * 11a. THE PARENT CLAUSE. Every target at or above the parent's reading for the
 * SAME control, which is what "no hit area smaller than today" promises. Smaller
 * fails; larger does not.
 *
 * The one admitted exception is graded against `HIT_EXCEPTIONS`'s own number and
 * says so in the finding, so a further shrink is still red.
 *
 * A key the table names and the DOM did not answer is a finding of its own: a
 * floor that matches nothing asserts nothing, and that is the defect this whole
 * table was rewritten to end.
 */
export function hitFindings(base, collapsed, parent = HIT_PARENT) {
  const rows = collapsed ?? [];
  if (rows.length === 0) {
    return ['11 not one interactive target was enumerated in the sheet, so "no hit area smaller than today" is asserted about nothing at all'];
  }
  const out = [];
  // The PINNED keys only. A key that came from a parent run's readings alone may
  // name a control this tab is not drawing at this moment, which is a question
  // rather than a defect, so `hitNotes` says that one instead.
  for (const key of [...new Set([...Object.keys(HIT_PARENT), ...Object.keys(HIT_EXCEPTIONS)])]) {
    if (rows.some((one) => keyMatches(key, one.key))) continue;
    out.push(`11 the hit-area table names ${J(key)} and NOTHING in the sheet matched that role key, so its floor asserts nothing. Either the markup moved and the key must move with it, or the control is gone and the entry must go in the same commit`);
  }
  for (const one of rows) {
    const exception = HIT_EXCEPTIONS[pinFor(HIT_EXCEPTIONS, one.key) ?? ''] ?? null;
    const floor = exception ?? parent[pinFor(parent, one.key) ?? ''] ?? null;
    if (floor === null) continue;
    const against = exception === null
      ? `the parent's ${String(floor.width ?? '(content)')}x${String(floor.height)}`
      : `the ADMITTED exception's ${String(floor.width)}x${String(floor.height)} (the parent read ${String(exception.parentWidth)}x${String(exception.parentHeight)}; ${exception.why})`;
    if (floor.width !== null && one.width < floor.width - TOL) {
      out.push(`11 on the ${base} base the hit area ${one.key} is ${String(one.width)}px wide across ${String(one.count)} copy(ies), BELOW ${against}`);
    }
    if (one.height < floor.height - TOL) {
      out.push(`11 on the ${base} base the hit area ${one.key} is ${String(one.height)}px tall across ${String(one.count)} copy(ies), BELOW ${against}`);
    }
  }
  return out;
}

/**
 * 11a. THE WCAG CLAUSE, AND IT IS ITS OWN. WCAG 2.2 AA 2.5.8 asks 24 CSS pixels
 * on both dimensions. A target under it is a finding when the parent's KNOWN
 * reading cleared the floor, because then this build is what broke it.
 *
 * A target that was ALREADY under the floor at the parent, and a target with no
 * parent reading at all, are not findings here: the first is a defect in the
 * shipping app and belongs in the queue rather than in this phase, and the second
 * is a question this run cannot answer. `wcagNotes` says both, by name, with the
 * numbers, so neither disappears.
 */
export function wcagFindings(collapsed, parent = HIT_PARENT) {
  const out = [];
  for (const one of collapsed ?? []) {
    const short = [];
    if (one.width < WCAG_MIN - TOL) short.push(`${String(one.width)}px wide`);
    if (one.height < WCAG_MIN - TOL) short.push(`${String(one.height)}px tall`);
    if (short.length === 0) continue;
    const was = parent[one.key] ?? null;
    if (was === null) continue;
    const wasShort = (was.width !== null && was.width < WCAG_MIN - TOL) || was.height < WCAG_MIN - TOL;
    if (wasShort) continue;
    out.push(`11 ${one.key} is ${short.join(' and ')}, under WCAG 2.2 AA 2.5.8's ${String(WCAG_MIN)}x${String(WCAG_MIN)} floor, and the parent read ${String(was.width ?? '(content)')}x${String(was.height)}, which clears it — THIS BUILD is what put it under`);
  }
  return out;
}

/**
 * PHASE 298 FIX ROUND. What the hit-area clauses did NOT assert, and every WCAG
 * reading, said once. These are NOTES and never findings: a clause this run could
 * not put is not a clause that failed, and a gate that reports a false failure
 * teaches people to ignore it — which is how the gate Phase 296 repaired rotted
 * for 25 days.
 */
export function hitNotes(base, collapsed, parent = HIT_PARENT) {
  const out = [];
  const rows = collapsed ?? [];
  const pass = [];
  const fail = [];
  for (const one of rows) {
    const line = `${one.key} ${String(one.width)}x${String(one.height)}${one.count > 1 ? ` (smallest of ${String(one.count)})` : ''}`;
    if (one.width < WCAG_MIN - TOL || one.height < WCAG_MIN - TOL) fail.push(line);
    else pass.push(line);
  }
  out.push(`11 WCAG 2.2 AA 2.5.8 on the ${base} base: ${String(pass.length)} of ${String(rows.length)} target(s) clear ${String(WCAG_MIN)}x${String(WCAG_MIN)}. CLEAR: ${pass.join('; ') || 'none'}. UNDER: ${fail.join('; ') || 'none'}`);
  for (const one of rows) {
    if (one.width >= WCAG_MIN - TOL && one.height >= WCAG_MIN - TOL) continue;
    const was = parent[one.key] ?? null;
    if (was === null) continue;
    if ((was.width !== null && was.width < WCAG_MIN - TOL) || was.height < WCAG_MIN - TOL) {
      out.push(`11 PRE-EXISTING, QUEUED AND NOT FIXED HERE: ${one.key} is ${String(one.width)}x${String(one.height)} and the parent read ${String(was.width ?? '(content)')}x${String(was.height)}, so it was ALREADY under WCAG 2.2 AA 2.5.8's ${String(WCAG_MIN)}x${String(WCAG_MIN)} in the shipping app. That is a finding about the app and it belongs in the queue, not in this phase's fix round`);
    }
  }
  const drawn = new Set(rows.map((one) => one.key));
  for (const [key, one] of Object.entries(parent)) {
    if (one.fromFileOnly !== true || drawn.has(key)) continue;
    out.push(`11 the parent run read ${key} at ${String(one.width)}x${String(one.height)} and this run drew nothing matching it, so its floor was not asserted. The sheet draws one tab's list at a time and a control can be state-dependent, so this is a question rather than a defect — if the control was REMOVED, say so in the phase entry`);
  }
  const unknown = rows.filter((one) => parent[one.key] === undefined);
  if (unknown.length > 0) {
    out.push(`11 NO PARENT READING EXISTS for ${String(unknown.length)} enumerated target(s), so "no hit area smaller than today" is NOT asserted about them and a WCAG reading under the floor cannot be blamed on this build. Recorded at: ${unknown.map((one) => `${one.key} ${String(one.width)}x${String(one.height)}`).join('; ')}. Run the same arm with P293_PARENT_CHECKOUT and point a HEAD run at its readings.json with P293_HIT_PARENT, or paste the numbers into HIT_PARENT with their provenance`);
  }
  for (const [key, one] of Object.entries(HIT_EXCEPTIONS)) {
    const got = rows.find((row) => row.key === key) ?? null;
    if (got === null) continue;
    out.push(`11 ADMITTED EXCEPTION APPLIED: ${key} is held to ${String(one.width)}x${String(one.height)} rather than the parent's ${String(one.parentWidth)}x${String(one.parentHeight)} — ${String(one.width * one.height)}px2 against ${String(one.parentWidth * one.parentHeight)}px2 — because ${one.why}. It reads ${String(got.width)}x${String(got.height)} here and it is still graded against that number and against the ${String(WCAG_MIN)}x${String(WCAG_MIN)} floor, so a later round that shrinks it further goes red`);
  }
  return out;
}

/**
 * 11a. Every icon in the sheet. At HEAD every reading is in {12, 14, 16, 24}; at
 * the parent the strays 19 and 28 must BE there, so the grader proves the phase
 * had something to fix rather than only that it is now clean.
 */
export function iconFindings(base, read) {
  const out = [];
  const sizes = read.sizes ?? [];
  if (sizes.length === 0) return ['11 no icon was read in the sheet at all'];
  if (base === 'head') {
    for (const one of sizes) {
      if (!ICON_SIZES.includes(one.px)) {
        out.push(`11 ${one.what} draws at ${String(one.px)}px, outside {${ICON_SIZES.join(', ')}}`);
      }
    }
    return out;
  }
  const seen = new Set(sizes.map((one) => one.px));
  for (const stray of PARENT_ICON_STRAYS) {
    if (!seen.has(stray)) {
      out.push(`11 the parent draws no ${String(stray)}px icon, so this checkout is not the parent this phase measured`);
    }
  }
  return out;
}

/**
 * 11a. The interaction states, read as computed styles against the tokens' own
 * RESOLVED values rather than against a literal, so a token whose value moves
 * moves this reading with it.
 *
 * At the parent the row has no transition at all, which is the finding: a
 * `transition-property` of `all` with a `transition-duration` of `0s` is what an
 * element with nothing declared computes to.
 *
 * UNDER THE REDUCED MOTION QUERY, tokens.css:691-697 sets
 * `transition-property: none !important` on `*` — Phase 200's leak fix, whose
 * comment says why 1ms was not enough — so the property reads `none` on BOTH
 * bases. Only the DURATION separates them: 1ms at HEAD, because the shorthand
 * names `var(--dur-fast)` and tokens.css:657 drops that token to 1ms, which is
 * the proof the duration is a token and not a literal; and 0s at the parent,
 * where nothing is declared. A grader that expected `background` here would fail
 * on a correct build.
 */
export function transitionFindings(base, label, got, tokens) {
  const out = [];
  const t = got ?? {};
  const term = (name, has, want) => {
    if (String(has ?? '') !== String(want ?? '')) {
      out.push(`11 ${label}'s transition-${name} reads ${J(has ?? null)}, want ${J(want ?? null)}`);
    }
  };
  if (base === 'head') {
    term('property', t.property, 'background');
    term('duration', t.duration, tokens?.durFast);
    term('timing-function', t.timing, tokens?.easeOut);
  } else {
    // Nothing is declared at the parent, and that IS the finding this phase
    // fixes: `all` with `0s` is what an element with no transition computes to.
    term('property', t.property, 'all');
    term('duration', t.duration, '0s');
  }
  return out;
}

export function stateFindings(base, read) {
  const out = [];
  const fill = (label, got, want) => {
    if (String(got ?? '') !== String(want ?? '')) out.push(`11 ${label} reads ${J(got ?? null)}, want the resolved ${J(want ?? null)}`);
  };
  fill('a row at rest has a background that', read.rest?.background, read.tokens?.transparent);
  fill('a row under a real pointer fills to', read.hover?.background, read.tokens?.bgRaised);
  fill('a checked row fills to', read.checked?.background, read.tokens?.bgActive);
  fill("a checked row's hairline is", read.checked?.borderBottom, read.tokens?.borderActive);
  fill('a row with its panel open fills to', read.open?.background, read.tokens?.bgActive);
  fill('the focus ring on the FIRST row control is', read.focusFirst?.boxShadow, read.tokens?.focusRing);
  fill('the focus ring on the LAST row control is', read.focusLast?.boxShadow, read.tokens?.focusRing);
  out.push(...transitionFindings(base, 'a data cell', read.transition, read.tokens));
  const r = read.reduced ?? {};
  fill('under prefers-reduced-motion the transition-property is', r.property, 'none');
  fill(
    'under prefers-reduced-motion the transition-duration is',
    r.duration,
    base === 'head' ? read.tokens?.durFastReduced : '0s'
  );
  if (read.prefersColorSchemeQueries !== 0) {
    out.push(
      `11 ${String(read.prefersColorSchemeQueries)} stylesheet rule(s) key on prefers-color-scheme; the theme flips by data-scheme alone, which is what lets ONE Electron read both bases`
    );
  }
  return out;
}

/**
 * 11b. The clipping attack. EXACTLY THREE things may ellipsis — the session
 * name, the group header's path and the Past row's folder — and each carries its
 * whole value as a hover `title`. Everything else must widen the table instead,
 * and `.sm-scroll` is the one thing allowed to overflow, because scrolling
 * sideways IS the promise.
 *
 * The reading walks from each text node UP to `.sm-scroll`, because an element
 * whose own box grew is not clipped while an ancestor of it may be, and the
 * naive per-element `scrollWidth <= clientWidth + 1` cannot see that.
 */
export function clipFindings(read) {
  const out = [];
  for (const at of read.widths ?? []) {
    for (const bad of at.clipped) {
      out.push(`11 at ${String(at.width)}px (${at.why}) ${bad.what} is CLIPPED by ${bad.by} while drawing ${J(bad.text)}`);
    }
    const kinds = [...at.ellipsisKinds].sort();
    // PHASE 298 FIX ROUND. The want is the kinds THIS TAB CAN HOLD, not three:
    // see ELLIPSIS_ALLOWED above for why no single tab holds all three. A reading
    // that does not say which are drawn is held to all of them, so an older
    // reading is never quietly relaxed.
    const canHold = at.ellipsisReachable ?? ELLIPSIS_ALLOWED.map((one) => one.what);
    if (kinds.length !== canHold.length) {
      out.push(`11 at ${String(at.width)}px ${String(kinds.length)} kind(s) of element ellipsis, want exactly ${String(canHold.length)} — the tab drawn here can ellipsis ${canHold.join(', ')}: ${J(kinds)}`);
    }
    for (const missing of at.ellipsisWithoutTitle) {
      out.push(`11 at ${String(at.width)}px ${missing} ellipsises and carries no hover title holding its whole value`);
    }
  }
  if ((read.widths ?? []).length !== CLIP_WIDTHS.length) {
    out.push(`11 the clipping attack ran at ${String((read.widths ?? []).length)} width(s), want ${String(CLIP_WIDTHS.length)}`);
  }
  return out;
}

/**
 * PHASE 298 FIX ROUND. What the clipping attack did NOT ask, said once per
 * distinct set rather than three times. This is a NOTE and never a finding: a
 * clause the fixture never exercised is not a clause that failed, and a gate that
 * reports a false failure teaches people to ignore it.
 */
export function clipNotes(read) {
  const out = [];
  const said = new Set();
  for (const at of read.widths ?? []) {
    const notDrawn = at.ellipsisNotDrawn ?? [];
    if (notDrawn.length === 0) continue;
    const key = J([...notDrawn].sort());
    if (said.has(key)) continue;
    said.add(key);
    out.push(`11b NOT EXERCISED: ${notDrawn.join(' and ')} was not in the DOM while the clipping attack ran, so its ellipsis and its hover title were not asked about. The sheet draws one tab's list at a time (SessionManagerSheet.tsx:419-431) and 11b runs on the tab 11a left. This is not a missing truncation.`);
  }
  return out;
}

/**
 * PHASE 298 FIX ROUND. Which base's palette one resolved colour belongs to, or
 * null when it is in both bases' palettes or in neither. A colour in both cannot
 * accuse anybody and a colour in neither is an accent, a status hue or a blend
 * this arm has no opinion about.
 */
export function baseOfColor(value, palettes) {
  const bases = Object.keys(palettes ?? {});
  const at = bases.filter((b) => Object.values(palettes[b] ?? {}).includes(value));
  if (at.length !== 1) return null;
  const token = Object.keys(palettes[at[0]]).find((t) => palettes[at[0]][t] === value) ?? null;
  return { base: at[0], token };
}

/**
 * PHASE 298 FIX ROUND. IS THIS PAIR IMPOSSIBLE? A text colour that belongs to one
 * base alone over a ground that belongs to the OTHER base alone never coexist in a
 * real render, so the ratio between them is not a reading about anything.
 *
 * WHAT THIS EXISTS FOR, and it is the second lock rather than the fix. Arm 11's
 * `pairs` flips `data-scheme` on `<html>` and reads the two bases in ONE
 * synchronous turn. `color` re-resolves the instant it is asked; `background` does
 * NOT, because `session-manager.css:478` and `:835`, `globals.css:135`, `:208` and
 * `:287` all declare `transition: background var(--dur-fast) var(--ease-out)`, and
 * `getComputedStyle` on a transitioning property answers the value the animation
 * is AT — which at the first frame after the flip is still the OLD base's colour.
 * The app run read eight of these on the light base at HEAD and several at the
 * parent, the loudest being a light `--text-primary` over a DARK `--bg-raised`.
 * The FIX is the freeze in `pairs` itself, and this grader is what makes the next
 * one of these say what it is instead of printing a ratio nobody can act on: a
 * gate that reports a false failure teaches people to ignore it.
 *
 * IT ASKS THE GROUND AND NEVER THE COMPOSITE (the fix round's second pass).
 * `bgGround` is the first OPAQUE background under the text and it is a token's own
 * value, so it can name a base; `bg` is that ground with every translucent wash
 * above it blended in, which is a number no token holds. Asking the composite would
 * have quietly switched this refusal off for every washed element in the sheet —
 * the selection toolbar among them, where `--accent-wash` sits over the panel.
 */
export function impossiblePair(row, palettes) {
  const fg = baseOfColor(row.fg, palettes);
  const bg = baseOfColor(row.bgGround ?? row.bg, palettes);
  if (fg === null || bg === null || fg.base === bg.base) return null;
  return { fg, bg };
}

/**
 * PHASE 298 FIX ROUND, SECOND PASS. THE GROUND WAS TRANSLUCENT AND WAS NOT
 * COMPOSITED, said loudly, once per element, state and text colour.
 *
 * The build round's reader took the FIRST background that was not fully
 * transparent and called it the ground. In the selection toolbar that is
 * `--accent-wash`, `rgba(77, 157, 232, 0.14)` (session-manager.css:352-354), and a
 * ratio computed against a 14 percent wash is a number about a render that cannot
 * happen: the arm printed 1.11:1 where the Phase 298 verify, compositing properly,
 * measured 5.38:1 on dark and 6.27:1 on light for the worst real pair.
 *
 * `groundOf` in the reader composites source-over from the first opaque ancestor
 * upward, so the honest case needs no refusal at all. This grader is what happens
 * when it CANNOT: nothing opaque anywhere up the tree, or a background IMAGE in the
 * stack, which is not one colour and cannot be blended into one. Such a row is
 * dropped from the grading by `gradablePairs` and named here — never handed a
 * ratio. A gate that cries wolf teaches people to ignore it, which is exactly how
 * the gate Phase 296 repaired rotted for 25 days.
 */
export function compositeFindings(rows) {
  const out = [];
  const said = new Set();
  for (const row of rows ?? []) {
    if (row.composited !== false) continue;
    const key = `${String(row.what)}|${String(row.base)}|${String(row.state)}|${String(row.fg)}`;
    if (said.has(key)) continue;
    said.add(key);
    const layers = (row.bgLayers ?? []).map((one) => `${String(one.what)} ${String(one.color)}`);
    out.push(
      `11 THIS BACKGROUND IS TRANSLUCENT AND WAS NOT COMPOSITED, so no contrast ratio is claimed for it: ${row.what} (${row.base}, ${row.state}) draws ${J(row.fg)} and ${String(row.why)}. The layers under it are ${J(layers)}`
    );
  }
  return out;
}

/** One computed colour as numbers, or null. The reader's own parse, in this module. */
export function colorOf(text) {
  const raw = String(text ?? '').trim();
  // String.match and NOT a regex literal's own .exec: the list in
  // gate:background names exec, and it reads a call by NAME, so a regex's
  // .exec is taken for child_process.exec and the gate goes red naming a
  // child that does not exist. That blind spot is real and is queued as its
  // own entry; this file simply does not hand the gate the shape.
  const m = raw.match(/^rgba?\(([^)]*)\)$/i);
  if (m === null) return null;
  const parts = m[1].split(/[,\s/]+/).filter((x) => x !== '').map((x) => Number.parseFloat(x));
  if (parts.length < 3) return null;
  const a = parts.length > 3 ? parts[3] : 1;
  for (const n of [parts[0], parts[1], parts[2], a]) if (!Number.isFinite(n)) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a };
}

/**
 * PHASE 298 FIX ROUND, SECOND PASS. THE BLEND, RE-DERIVED IN THIS MODULE.
 *
 * `groundOf` in the reader composites inside the running window, where nothing can
 * be unit tested. This is the SAME arithmetic written a second time on this side,
 * source-over from the opaque layer upward — out = src * a + dst * (1 - a) — and
 * `compositeCheckFindings` below makes the two answer the same bytes or says so.
 * That is the point: a compositing step nobody has seen agree with a second
 * derivation is a compositing step nobody has seen work, and the reading it
 * replaces was wrong by a factor of five.
 *
 * `layers` is the reader's own list, innermost first, its last entry opaque.
 */
export function compositeOf(layers) {
  const list = layers ?? [];
  if (list.length === 0) return null;
  const deepest = colorOf(list[list.length - 1].color);
  if (deepest === null || deepest.a < 1) return null;
  let out = deepest;
  for (let i = list.length - 2; i >= 0; i -= 1) {
    const over = colorOf(list[i].color);
    if (over === null) return null;
    out = {
      r: over.r * over.a + out.r * (1 - over.a),
      g: over.g * over.a + out.g * (1 - over.a),
      b: over.b * over.a + out.b * (1 - over.a),
      a: 1
    };
  }
  return `rgb(${String(Math.round(out.r))}, ${String(Math.round(out.g))}, ${String(Math.round(out.b))})`;
}

/**
 * PHASE 298 FIX ROUND, SECOND PASS. Does the window's blend agree with this
 * module's? Asked of every composited row, said once per distinct disagreement.
 */
export function compositeCheckFindings(rows) {
  const out = [];
  const said = new Set();
  for (const row of rows ?? []) {
    if (row.composited !== true) continue;
    const layers = row.bgLayers ?? [];
    if (layers.length < 2) continue;
    const mine = compositeOf(layers);
    if (mine === String(row.bg)) continue;
    const key = `${String(row.bg)}|${String(mine)}`;
    if (said.has(key)) continue;
    said.add(key);
    out.push(
      `11 THE TWO BLENDS DISAGREE: the window composited ${J(row.bgLayers)} to ${J(row.bg)} and this module's own arithmetic answers ${J(mine)}. One of the two is wrong, so no contrast number over this ground is trustworthy (${row.what}, ${row.base}, ${row.state})`
    );
  }
  return out;
}

/** PHASE 298 FIX ROUND. The refusal, once per element, state and pair. */
export function crossBaseFindings(rows, palettes) {
  if (rows.length === 0) return [];
  const bases = Object.keys(palettes ?? {});
  if (bases.length < 2) {
    return ['11 the contrast reading carries no per-base palette, so a pair that mixes the two bases could not be refused'];
  }
  const out = [];
  // A token that stopped resolving is a hole in the refusal below AND a token the
  // sheet paints with that has gone missing, so it is said rather than shrugged at.
  for (const base of bases) {
    const missing = PALETTE_TOKENS.filter((t) => palettes[base][t] === undefined);
    if (missing.length > 0) {
      out.push(`11 the ${base} base resolved ${String(PALETTE_TOKENS.length - missing.length)} of ${String(PALETTE_TOKENS.length)} palette tokens, so a cross-base pair could go unrefused: ${J(missing)}`);
    }
  }
  const said = new Set();
  for (const row of rows) {
    const bad = impossiblePair(row, palettes);
    if (bad === null) continue;
    const key = `${String(row.what)}|${String(row.base)}|${String(row.state)}|${String(row.fg)}|${String(row.bg)}`;
    if (said.has(key)) continue;
    said.add(key);
    out.push(
      `11 THE THEME FLIP DID NOT REACH THIS BACKGROUND: ${row.what} (${row.base}, ${row.state}) draws ${bad.fg.token} from the ${bad.fg.base} base (${J(row.fg)}) over ${bad.bg.token} from the ${bad.bg.base} base (${J(row.bg)}). Those two never coexist in a real render, so no contrast number is claimed for this pair.`
    );
  }
  return out;
}

/**
 * PHASE 298 FIX ROUND. The rows a contrast ratio may be claimed about. An
 * impossible pair is dropped from the grading and reported by the refusal above,
 * never silently.
 */
export function gradablePairs(rows, palettes) {
  // A ground that could not be composited is dropped FIRST and for the same
  // reason: `compositeFindings` names it, and a ratio against a translucent wash
  // is not a reading about anything either.
  const real = (rows ?? []).filter((row) => row.composited !== false);
  if (Object.keys(palettes ?? {}).length < 2) return real;
  return real.filter((row) => impossiblePair(row, palettes) === null);
}

/**
 * 11a. Contrast, judged by the ratios the app's own `contrastOf` answered. Body
 * text at or above 4.5 on both bases, in every state. A disabled control's label
 * is exempt and the exemption is NAMED in the reading rather than assumed here,
 * so a row that claims it has to say which control it is.
 */
export function contrastFindings(rows) {
  const out = [];
  if (rows.length === 0) return ['11 no text was measured for contrast at all'];
  for (const row of rows) {
    if (row.exemptBecause !== null && row.exemptBecause !== undefined) continue;
    if (typeof row.ratio !== 'number' || !Number.isFinite(row.ratio)) {
      out.push(`11 contrast could not be computed for ${row.what} (${row.base}, ${row.state}): ${J(row.fg)} on ${J(row.bg)}`);
      continue;
    }
    if (row.ratio < TEXT_FLOOR) {
      out.push(`11 ${row.what} on the ${row.base} base, ${row.state}, is ${row.ratio.toFixed(2)}:1 (${J(row.fg)} on ${J(row.bg)}), under ${String(TEXT_FLOOR)}`);
    }
  }
  return out;
}

/**
 * 11a. The two custom properties this phase MEASURES rather than chooses. The
 * grader answers what the stylesheet must say, so the finding hands the builder
 * the number instead of only refusing the one that is there.
 *
 * IT IS GRADED AS A BAND, and the band is why. For `--sm-name-min` the entry
 * says to measure it "the way `app.css:198-220` records for `.ptab-name`'s
 * 46px", and that record takes the widest FOUR CHARACTER PREFIX and rounds it up
 * with headroom; `build/p298/SPEC.md` §7 says the prefix PLUS the ellipsis glyph.
 * The two are 44 and 56 on this machine and both are defensible — the strict
 * form guarantees four characters are still visible once the ellipsis has taken
 * its own width, the shipping precedent does not. The entry wins over SPEC.md by
 * the phase's own rule, so the PREFIX is the floor and the prefix plus the
 * ellipsis is the ceiling: a number below the floor draws fewer characters than
 * even the loose model allows, and a number above the ceiling is larger than the
 * strictest measurement can justify and was therefore chosen rather than
 * measured. The reading prints both, so a later round can tighten it on purpose.
 * `--sm-actions-min` has one defensible value and its band is that one number.
 *
 * IT GRADES AT HEAD ONLY, and the measurement is recorded on both bases. The
 * parent declares no `--sm-name-min` at all and declares `--sm-actions-min: 170`,
 * a number nothing derived; holding the parent to a value this phase computes
 * would fail a correct parent build for being the parent.
 */
export function measuredFindings(base, read) {
  if (base !== 'head') return [];
  const out = [];
  for (const one of read ?? []) {
    const band = one.floor === one.ceiling ? `${String(one.floor)}px` : `${String(one.floor)}px to ${String(one.ceiling)}px`;
    if (one.declared === null || one.declared === undefined) {
      out.push(`11 ${one.property} is not declared on .modal.session-sheet; the measurement says ${band} (${one.how})`);
      continue;
    }
    if (one.declared < one.floor - TOL || one.declared > one.ceiling + TOL) {
      out.push(`11 ${one.property} declares ${String(one.declared)}px and the measurement says ${band} (${one.how}); set the property from the reading and write the reading and the date in its comment`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PHASE 298 FIX ROUND. 11d, THE TOAST DOCK.
//
// The entry's rough edge 1 moves the toast stack, while the session manager
// sheet is open, out of its window-fixed corner and into a strip the sheet
// draws between its scroller and its footer. It is THE ONE CHANGE IN THIS PHASE
// THAT COSTS A PERSON A CLICK TODAY, and until this round the arm never drove
// it: `stacked()` answered { outlet: 0, toasts: 0 } on every run, because
// nothing had raised a toast, so the clause was a promise that could not fail.
//
// THE MEASUREMENT THAT MADE IT A DEFECT, and the numbers below are it. `.toasts`
// is `position: fixed; right: var(--space-6); bottom: var(--space-6)` at
// `--z-toast` 700 and 360px wide; the sheet draws at `--z-modal` 500 inside a
// scrim that leaves it `--space-8` of bottom gutter. So a `.toast` of its own
// `min-height` reaches `44 - (24 - 16) = 36`px up past the sheet's bottom edge,
// two reach 88 and three reach 140, and at 1512 logical px the stack covers the
// sheet's rightmost 210px while the End/Restore column is 190px plus its cell
// padding. With TWO toasts up the last row's End button is under a toast and the
// click lands on the toast.
//
// WHAT IS ASSERTED, AND ON WHICH BASE. Every clause is geometry: a rect, an
// intersection, or `elementFromPoint`, never the presence of a class on its own.
// At HEAD the intersection with that End button must be EMPTY and the point at
// its centre must resolve into the button. At the parent the same reading must
// FIND the intersection, and the point must resolve into the stack — a dock
// assertion that passed on both bases would have asserted nothing.
// ---------------------------------------------------------------------------

/**
 * Does a PINNED role key name the control a DRAWN role key describes?
 *
 * BY CLASS SUBSET AND NOT BY STRING EQUALITY, and the reason is measured. A role
 * key is a DESCRIPTION the arm builds from a control's own tag and class list,
 * so a control that gains a class between two commits gets two different keys —
 * and Phase 298's mechanism 8 adds `icon-btn` beside `sm-icon-btn` on the row's
 * ellipsis and the title bar's buttons. With string equality, a key naming both
 * classes matched at HEAD and NOTHING at the parent, while a key naming one
 * matched the parent and nothing at HEAD. Either way two floors asserted nothing
 * and the arm said so, which is how this was found.
 *
 * So the pinned key names the classes a control MUST have, the drawn key may
 * carry more, and every other fragment of the pinned key — an attribute, an id,
 * a descendant step — must still appear. A pinned key can therefore never match
 * MORE loosely than its own text: adding a class to the table narrows it.
 */
export function keyMatches(pinned, drawn) {
  const p = String(pinned ?? '');
  const d = String(drawn ?? '');
  if (p === d) return true;
  const classesOf = (s) => (s.match(/\.[A-Za-z0-9_-]+/g) ?? []).map((one) => one.slice(1));
  const restOf = (s) => s.replace(/\.[A-Za-z0-9_-]+/g, '');
  if (restOf(p) !== restOf(d)) return false;
  const have = new Set(classesOf(d));
  return classesOf(p).every((one) => have.has(one));
}

/** The pinned key in `table` that names the control `drawn` describes, or null. */
export function pinFor(table, drawn) {
  for (const key of Object.keys(table ?? {})) if (keyMatches(key, drawn)) return key;
  return null;
}

/** One decimal, for a difference a finding has to be readable about. */
const round1 = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : n);

/** `.toast`'s own `min-height` (styles/app.css). Every reach below derives from it. */
export const TOAST_BOX_H = 44;
/** `Toasts.tsx` draws the last three and counts the rest on a `+n more` line. */
export const TOAST_CAP = 3;
/** The counts 11d raises and reads, one reading each. */
export const TOAST_COUNTS = [1, 2, 3];
/**
 * The sheet heights 11d tries, tallest first, until the grid really OVERFLOWS
 * its scroller. The clause that matters only exists in that state: over a list
 * shorter than its scroller the last row is nowhere near the sheet's bottom and
 * the parent's own defect reads clean, which would make the HEAD assertion a
 * promise that cannot fail — the exact shape this fix round exists to remove. So
 * the size is RESOLVED by measurement and the reading says which one it used.
 *
 * THE FLOOR IS NOT ARBITRARY EITHER. A height is only accepted if the scroller,
 * once the docked strip has taken its height at the deepest count, still holds
 * the sticky heading and one whole row. Below that no End button sits wholly
 * inside the scroller, `end` reads null, and every clause about it would answer
 * "not asked" instead of answering. That floor is measured off the sheet's own
 * boxes rather than assumed.
 */
export const TOAST_SHEET_HEIGHTS = [480, 420, 380];
/**
 * How far a window-fixed stack reaches up past the sheet's bottom edge, by
 * count, BY VALUE from the entry's own table so a stylesheet cannot agree with
 * itself here. Held at the PARENT, where the stack is still fixed.
 */
export const PARENT_SHEET_REACH = { 1: 36, 2: 88, 3: 140 };

/**
 * 11d. One count of toasts, with the sheet open, on the base this run is on.
 *
 * The clauses that are the same on both bases come first, because they are the
 * premises the rest are derived from: the box is its own `min-height`, the toast
 * is sticky (this arm raises errors on purpose — the store's only auto dismiss
 * is a flat 5s timer with no hover pause, so a reading taken against a toast
 * that leaves by itself would be a race), its × is reachable, an End button was
 * found at the bottom of the scroller, and the grid really overflows.
 */
export function dockFindings(base, n, geo) {
  const at = `11d with ${String(n)} toast(s) up (${base}): `;
  if (geo === null || geo === undefined) return [`${at}nothing was read at all`];
  if (geo.stack === null) return [`${at}no .toasts is drawn, so the stack was never raised and nothing was measured`];
  if (geo.sheet === null) return [`${at}no sheet is drawn, so this is not the docked reading`];
  const out = [];
  if (geo.count !== n) out.push(`${at}${String(geo.count)} toast(s) are drawn, want ${String(n)}`);
  for (const one of geo.toasts) {
    const who = one.stamp === null ? 'an unstamped toast' : `toast ${one.stamp}`;
    // A FLOOR AND NOT AN EQUALITY, because `TOAST_BOX_H` is `min-height`. The
    // first driven run of this arm read 45 for every toast on BOTH bases and
    // called it a finding seven times over, which is the gate crying wolf: a
    // sentence one pixel taller than its own minimum is the box working, not a
    // geometry defect. What this arm is for is the INTERSECTION below, and a
    // taller toast only makes that stricter. A toast SHORTER than its minimum is
    // still a finding, because then the fill has lost its box.
    if (one.rect.height + TOL < TOAST_BOX_H) {
      out.push(`${at}${who} is ${String(one.rect.height)}px tall, UNDER the box's own min-height of ${String(TOAST_BOX_H)}, so the fill has lost its box`);
    }
    if (one.sticky !== true) out.push(`${at}${who} reads sticky ${String(one.sticky)}; this arm raises errors on purpose so nothing leaves by itself mid-reading`);
    if (one.dismiss === null) out.push(`${at}${who} draws no × , and that × is a sticky toast's only exit`);
    else if (one.dismiss.hit === null || one.dismiss.hit.inDismiss !== true) {
      out.push(`${at}the point at the centre of ${who}'s × resolves to ${String(one.dismiss.hit === null ? 'nothing' : one.dismiss.hit.desc)}, so the one exit a sticky toast has is not reachable`);
    }
  }
  if (geo.end === null) {
    out.push(`${at}no row's End button sits wholly inside the scroller, so the clause that matters was not asked`);
  }
  if (geo.scroller === null || geo.scroller.scrolls !== true) {
    out.push(`${at}the grid does not overflow its scroller (${J(geo.scroller)}), so the last row is not at the sheet's bottom and a window-fixed stack could not reach its End button whatever it did`);
  }
  if (base === 'head') {
    if (geo.stack.docked !== true) out.push(`${at}the stack does not carry toasts-docked`);
    if (geo.stack.position !== 'static') out.push(`${at}the stack computes position ${J(geo.stack.position)}, want static`);
    if (geo.outlet === null) out.push(`${at}the sheet draws no [data-sm="toast-outlet"] strip, so there is nothing to dock into`);
    else if (geo.stack.inOutlet !== true) out.push(`${at}the stack is not inside the sheet's own strip, so it was not portalled`);
    if (geo.insideSheet !== true) out.push(`${at}the stack's rect ${J(geo.stack.rect)} is not inside the sheet's ${J(geo.sheet)}`);
    if (geo.belowScroller !== true) out.push(`${at}the stack's top ${String(geo.stack.rect.top)} is not below the scroller's bottom ${String(geo.scroller === null ? null : geo.scroller.rect.bottom)}`);
    if (geo.aboveFoot !== true) out.push(`${at}the stack's bottom ${String(geo.stack.rect.bottom)} is not above the footer's top ${String(geo.foot === null ? null : geo.foot.top)}`);
    for (const one of geo.toasts) {
      if (one.insideSheet !== true) out.push(`${at}${one.stamp === null ? 'a toast' : `toast ${one.stamp}`} at ${J(one.rect)} is drawn outside the sheet ${J(geo.sheet)}`);
    }
    if (geo.end !== null) {
      if (geo.overlapEnd === null || geo.overlapEnd.area !== 0) {
        out.push(`${at}the stack overlaps ${geo.end.verb === null ? 'the' : geo.end.verb} button of row ${String(geo.end.row)} by ${J(geo.overlapEnd)}; a docked stack must intersect it nowhere`);
      }
      if (geo.endHit === null || geo.endHit.inPrimary !== true) {
        out.push(`${at}the point at the centre of row ${String(geo.end.row)}'s ${J(geo.end.text)} resolves to ${String(geo.endHit === null ? 'nothing' : geo.endHit.desc)}, so a click there does not reach the button`);
      }
    }
  } else {
    if (geo.stack.docked === true) out.push(`${at}the stack carries toasts-docked at the PARENT, which has no dock`);
    if (geo.stack.position !== 'fixed') out.push(`${at}the stack computes position ${J(geo.stack.position)} at the parent, want fixed`);
    if (geo.outlet !== null) out.push(`${at}the parent draws a [data-sm="toast-outlet"] strip, so this is not the parent`);
    const want = PARENT_SHEET_REACH[n];
    if (want !== undefined && !nearly(geo.sheetBottomReach, want)) {
      out.push(`${at}the fixed stack reaches ${String(geo.sheetBottomReach)}px up past the sheet's bottom edge; the entry's table says ${String(want)}`);
    }
    /* The parent's own End-button reading is graded over the SET rather than per
       count, by `dockCoverFindings` below, and the reason is there. */
  }
  return out;
}

/**
 * 11d. THE CLAUSE PROVED ABLE TO FAIL, graded over the whole set of counts.
 *
 * At the PARENT the window-fixed stack must be SHOWN to intersect the End button
 * at the bottom of the scroller and to take the click aimed at its centre. The
 * DEEPEST reading is the one held, being three toasts and 140px of reach past the
 * sheet's bottom edge, because that clears the button by a margin no row height
 * can close. One toast reaches 36px and does not reach it at all, and whether two
 * reach it at 88 depends on where a 24px button sits inside the parent's 74px row
 * — about 70 to 94px above the sheet's bottom edge on this build, which is inside
 * 88 by roughly 6px. Pinning an assertion to a 6px margin would make a correct
 * parent build fail for a row-height change that is not the subject, so those two
 * counts are RECORDED and the deepest one is graded.
 *
 * At HEAD the same set must show the opposite at every count. `dockFindings`
 * already grades that per count; this is the summary clause, so a HEAD run cannot
 * pass with the readings missing altogether.
 */
export function dockCoverFindings(base, reads) {
  const out = [];
  if (reads.length !== TOAST_COUNTS.length) return [`11d ${String(reads.length)} count(s) were read, want ${String(TOAST_COUNTS.length)} (${J(TOAST_COUNTS)})`];
  const withEnd = reads.filter((one) => one.geo !== null && one.geo !== undefined && one.geo.end !== null);
  if (withEnd.length !== reads.length) {
    return [`11d only ${String(withEnd.length)} of ${String(reads.length)} reading(s) found an End button wholly inside the scroller, so the clause was not asked at every count`];
  }
  if (base === 'head') {
    const reached = withEnd.filter((one) => {
      const area = one.geo.overlapEnd === null ? 0 : one.geo.overlapEnd.area;
      const onToast = one.geo.endHit !== null && one.geo.endHit.inToasts === true;
      return area > 0 || onToast;
    });
    if (reached.length > 0) out.push(`11d the docked stack still reaches the End button at ${J(reached.map((one) => one.n))} toast(s) up`);
    return out;
  }
  const deepest = withEnd[withEnd.length - 1];
  const who = `row ${String(deepest.geo.end.row)}'s ${J(deepest.geo.end.text)}`;
  if (deepest.geo.overlapEnd === null || deepest.geo.overlapEnd.area <= 0) {
    out.push(`11d THE CLAUSE PROVED NOTHING: at the parent with ${String(deepest.n)} toast(s) the fixed stack intersects ${who} nowhere (${J(deepest.geo.overlapEnd)}), so the empty intersection HEAD is graded on was never shown able to happen`);
  }
  if (deepest.geo.endHit === null || deepest.geo.endHit.inToasts !== true) {
    out.push(`11d THE CLAUSE PROVED NOTHING: at the parent with ${String(deepest.n)} toast(s) the point at the centre of ${who} resolves to ${String(deepest.geo.endHit === null ? 'nothing' : deepest.geo.endHit.desc)} rather than into the stack, so the click this fix is about was never shown to land on a toast`);
  }
  return out;
}

/**
 * 11d. The promises the stack keeps WHEREVER it is drawn, read with one more
 * toast up than the cap: the last three drawn and the rest counted on a `+n
 * more` line above them, in the order they were raised.
 *
 * `stamps` is `stampToast`'s answer in DOM order. With four raised it must read
 * the second, third and fourth, because the cap keeps the NEWEST three and the
 * oldest is the one that goes.
 */
export function dockCapFindings(base, geo, stamps, raised) {
  const at = `11d with ${String(raised)} raised (${base}): `;
  if (geo === null || geo.stack === null) return [`${at}no .toasts is drawn`];
  const out = [];
  const hidden = raised - TOAST_CAP;
  if (geo.count !== TOAST_CAP) out.push(`${at}${String(geo.count)} toast(s) are drawn, want the cap of ${String(TOAST_CAP)}`);
  const wantLine = `+${String(hidden)} more`;
  if (geo.overflow !== wantLine) out.push(`${at}the overflow line reads ${J(geo.overflow)}, want ${J(wantLine)}`);
  const wantStamps = [];
  for (let i = raised - TOAST_CAP + 1; i <= raised; i += 1) wantStamps.push(String(i));
  if (J(stamps) !== J(wantStamps)) out.push(`${at}the drawn toasts read ${J(stamps)} in DOM order, want ${J(wantStamps)} — the newest ${String(TOAST_CAP)}, oldest first`);
  if (J(geo.stack.stamps) !== J(wantStamps)) out.push(`${at}the same reading through toastGeo answers ${J(geo.stack.stamps)}, want ${J(wantStamps)}`);
  /* The line is ABOVE the toasts it counts, which is where Toasts.tsx puts it. */
  const top = geo.toasts.length === 0 ? null : geo.toasts[0].rect.top;
  if (top !== null && geo.stack.rect.top > top + 0.5) out.push(`${at}the overflow line is not above the first toast`);
  if (base === 'head' && geo.insideSheet !== true) out.push(`${at}the stack with the overflow line is not inside the sheet`);
  return out;
}

/**
 * 11d. WHAT THE DOCK TAKES ITS HEIGHT FROM, which is the whole claim that it
 * "covers nothing". At HEAD the scroller must lose exactly the strip's height
 * and the sheet must not change at all. At the parent there IS no strip, the
 * scroller keeps every pixel it had, and the rows are covered instead — which is
 * the defect, stated as a reading rather than as prose.
 */
export function dockHeightFindings(base, zero, full) {
  const at = `11d the strip's height (${base}): `;
  if (zero === null || full === null || zero.scroller === null || full.scroller === null) return [`${at}the scroller was not read on both readings`];
  const out = [];
  if (!nearly(full.sheet === null ? null : full.sheet.height, zero.sheet === null ? -1 : zero.sheet.height)) {
    out.push(`${at}the sheet was ${String(zero.sheet === null ? null : zero.sheet.height)}px with nothing up and ${String(full.sheet === null ? null : full.sheet.height)}px with the stack up; the sheet's own box may not move`);
  }
  if (base === 'head') {
    if (zero.outlet === null) out.push(`${at}the sheet draws no strip with nothing toasted`);
    else {
      if (zero.outlet.display !== 'none') out.push(`${at}the empty strip computes display ${J(zero.outlet.display)}, want none — an empty strip takes no height, which is what holds the rows-per-sheet reading`);
      if (!nearly(zero.outlet.rect.height, 0)) out.push(`${at}the empty strip is ${String(zero.outlet.rect.height)}px tall, want 0`);
    }
    if (full.outlet === null) out.push(`${at}the sheet draws no strip with the stack up`);
    else {
      const lost = zero.scroller.rect.height - full.scroller.rect.height;
      if (!nearly(lost, full.outlet.rect.height)) {
        out.push(`${at}the scroller lost ${String(round1(lost))}px and the strip is ${String(full.outlet.rect.height)}px tall; the strip must take its height FROM the scroller and from nothing else`);
      }
      if (lost <= 0) out.push(`${at}the scroller lost no height at all, so the stack is drawn over the rows rather than beside them`);
    }
  } else {
    if (zero.outlet !== null || full.outlet !== null) out.push(`${at}the parent draws a strip, so this is not the parent`);
    if (!nearly(full.scroller.rect.height, zero.scroller.rect.height)) {
      out.push(`${at}the parent's scroller went from ${String(zero.scroller.rect.height)} to ${String(full.scroller.rect.height)}; at the parent a toast takes NO height from it and covers the rows instead, so a change here means this is not the parent`);
    }
  }
  return out;
}

/**
 * 11d. THE HALF MOST LIKELY TO HAVE BROKEN: the sheet closed, one toast raised,
 * and the stack back exactly where every other surface in the app relies on it
 * being — window-fixed, bottom right, `--space-6` from each edge, at `--z-toast`.
 * Held on BOTH bases and to the same values, because this is the reading that
 * must not have moved.
 */
export function dockClosedFindings(base, geo, spacePx, zToast) {
  const at = `11d with the sheet closed (${base}): `;
  if (geo === null || geo.stack === null) return [`${at}no .toasts is drawn, so the undocked stack was never read`];
  const out = [];
  if (geo.sheet !== null) out.push(`${at}the sheet is still drawn, so this is not the closed reading`);
  if (geo.outlet !== null) out.push(`${at}a [data-sm="toast-outlet"] strip is still in the document`);
  if (geo.stack.docked === true) out.push(`${at}the stack still carries toasts-docked with no sheet open`);
  if (geo.stack.position !== 'fixed') out.push(`${at}the stack computes position ${J(geo.stack.position)}, want fixed`);
  if (spacePx === null || !Number.isFinite(spacePx)) out.push(`${at}--space-6 did not resolve, so the gaps are held to nothing`);
  else {
    if (!nearly(geo.stack.gapRight, spacePx)) out.push(`${at}the stack is ${String(geo.stack.gapRight)}px from the window's right edge, want --space-6 (${String(spacePx)})`);
    if (!nearly(geo.stack.gapBottom, spacePx)) out.push(`${at}the stack is ${String(geo.stack.gapBottom)}px from the window's bottom edge, want --space-6 (${String(spacePx)})`);
  }
  if (zToast !== null && zToast !== undefined && String(geo.stack.zIndex) !== String(zToast)) {
    out.push(`${at}the stack computes z-index ${J(geo.stack.zIndex)}, want --z-toast (${String(zToast)})`);
  }
  if (geo.count !== 1) out.push(`${at}${String(geo.count)} toast(s) are drawn, want 1`);
  for (const one of geo.toasts) {
    // The same floor, for the same reason, on the sheet-closed reading. What this
    // clause is really for is that a toast with no sheet open is still FIXED in
    // the window's corner, which is asserted above and is what every other
    // surface in the app relies on.
    if (one.rect.height + TOL < TOAST_BOX_H) out.push(`${at}the toast is ${String(one.rect.height)}px tall, UNDER its own min-height of ${String(TOAST_BOX_H)}`);
    if (one.dismiss === null || one.dismiss.hit === null || one.dismiss.hit.inDismiss !== true) {
      out.push(`${at}the toast's × resolves to ${String(one.dismiss === null || one.dismiss.hit === null ? 'nothing' : one.dismiss.hit.desc)}`);
    }
  }
  return out;
}

/**
 * 11d. One dismissal, read from the store rather than from the DOM: a click on a
 * × takes exactly one toast off the queue. The DOM count is read beside it,
 * because dismissing one of the three drawn while a fourth is hidden brings that
 * fourth back and the drawn count does NOT fall.
 */
export function dockDismissFindings(base, steps) {
  const out = [];
  if (steps.length === 0) return [`11d the dismissals (${base}): nothing was dismissed`];
  for (const step of steps) {
    const at = `11d dismissal ${String(step.press)} (${base}): `;
    if (step.clicked !== true) out.push(`${at}the × would not take a click: ${String(step.why)}`);
    if (step.after !== step.before - 1) out.push(`${at}the queue went from ${String(step.before)} to ${String(step.after)}, want exactly one fewer`);
    if (step.drawn !== Math.min(TOAST_CAP, step.after)) out.push(`${at}${String(step.drawn)} toast(s) are drawn over a queue of ${String(step.after)}, want ${String(Math.min(TOAST_CAP, step.after))}`);
  }
  const last = steps[steps.length - 1];
  if (last.after !== 0) out.push(`11d the dismissals (${base}): ${String(last.after)} toast(s) are still up after the last ×`);
  if (last.after === 0 && last.stackDrawn !== false) out.push(`11d the dismissals (${base}): the queue is empty and a .toasts element is still in the document`);
  return out;
}

/** Arm 7. The ids checked after each click, against the live rows the filter leaves. */
export function selectAllFindings(liveIds, afterFirst, afterSecond) {
  const out = [];
  const a = [...afterFirst].sort();
  const want = [...liveIds].sort();
  if (J(a) !== J(want)) out.push(`7 the first select-all click checked ${J(a)}, want exactly the live rows ${J(want)}`);
  if (afterSecond.length !== 0) out.push(`7 the second click left ${J(afterSecond)} checked, want none`);
  return out;
}

/** Arm 8. The confirmation names n and counts the rest by reason. */
export function batchCountFindings(label, batch, wantNamed, wantSkipped) {
  const out = [];
  if (batch === null) return [`${label}: no batch confirmation is drawn`];
  if (batch.phase !== 'confirm') out.push(`${label}: the batch reads phase ${String(batch.phase)}, want confirm`);
  const ids = batch.targets.map((t) => t.id).sort();
  if (J(ids) !== J([...wantNamed].sort())) out.push(`${label}: the confirmation names ${J(ids)}, want ${J([...wantNamed].sort())}`);
  const n = wantNamed.length;
  const heading = `End ${String(n)} running session${n === 1 ? '' : 's'}?`;
  if (batch.heading !== heading) out.push(`${label}: the heading reads ${J(batch.heading)}, want ${J(heading)}`);
  if (wantSkipped === null) {
    if (batch.skipped !== null) out.push(`${label}: a skipped line is drawn (${J(batch.skipped)}) with nothing skipped`);
  } else if (batch.skipped === null || !batch.skipped.includes(wantSkipped)) {
    out.push(`${label}: the skipped line reads ${J(batch.skipped)}, want it to say ${J(wantSkipped)}`);
  }
  return out;
}

/**
 * Arm 10. One matrix line. The sheet's menu, less its own rows, must equal the
 * policy's item for item in label and in `disabled`.
 */
export function matrixFindings(row) {
  const out = [];
  const at = `10 ${row.tab} ${row.id} (${row.status}${row.machineId ? ` on ${row.machineId}` : ''})`;
  if (row.groupDrawn !== row.groupWant) out.push(`${at}: drawn under ${J(row.groupDrawn)}, its target key is ${J(row.groupWant)}`);
  if (row.tab === 'managed' && row.stateDrawn !== row.stateWant) out.push(`${at}: the state reads ${J(row.stateDrawn)}, statusVisual says ${J(row.stateWant)}`);
  if (row.tab === 'managed' && !row.checkbox) out.push(`${at}: no checkbox is drawn`);
  if (row.tab === 'past' && row.checkbox) out.push(`${at}: a checkbox is drawn on the Past tab`);
  const live = ['running', 'idle', 'needs_input'].includes(row.status);
  const p = row.primary;
  if (p === null) out.push(`${at}: no visible button`);
  else if (row.tab === 'managed' && live && !(p.verb === 'end' && p.disabled === false)) out.push(`${at}: the visible button is ${J(p)}, want End enabled`);
  else if (row.status === 'unknown' && !(p.verb === 'end' && p.disabled === true)) out.push(`${at}: the visible button is ${J(p)}, want End disabled`);
  else if (!live && row.status !== 'unknown' && p.verb !== 'restore') out.push(`${at}: the visible button is ${J(p)}, want Restore`);
  if (row.tab === 'managed') {
    const want = live ? (row.eligibilityWant ?? 'yes') : row.status === 'unknown' ? 'unreachable' : 'ended';
    if (row.eligibility !== want) out.push(`${at}: batchEligibility ${J(row.eligibility)}, want ${J(want)}`);
  }
  if (J(row.menuSheet) !== J(row.menuPolicy)) {
    out.push(`${at}: the sheet's menu ${J(row.menuSheet)} is not the policy's ${J(row.menuPolicy)}`);
  }
  return out;
}

/** The session manager sources the drawn sheet is built from. */
export const SHEET_SOURCES = [
  'src/renderer/session-manager',
  'src/renderer/app/p293-session-manager-drive.ts',
  'src/renderer/app/probe-registry.ts',
  'src/renderer/app/session-actions.tsx',
  'src/renderer/state/session-manager-slice.ts',
  'src/renderer/state/sessions-slice.ts'
];

export function staleSentence(sources, bundle) {
  if (bundle === null) return 'out/renderer/assets holds no index-*.js; build first.';
  const newer = sources.filter(([, mtime]) => mtime > bundle[1]).map(([path]) => path);
  return newer.length === 0 ? null : `out/ is older than ${newer.join(', ')}; build first.`;
}

function readStaleness(checkoutDir) {
  const sources = [];
  for (const rel of SHEET_SOURCES) {
    const path = join(checkoutDir, rel);
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) {
      for (const name of readdirSync(path)) {
        if (/\.(tsx?|css)$/.test(name)) sources.push([join(rel, name), statSync(join(path, name)).mtimeMs]);
      }
    } else {
      sources.push([rel, statSync(path).mtimeMs]);
    }
  }
  const assets = join(checkoutDir, 'out', 'renderer', 'assets');
  let bundle = null;
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^index-[^.]+\.js$/.test(name)) continue;
      const mtime = statSync(join(assets, name)).mtimeMs;
      if (bundle === null || mtime > bundle[1]) bundle = [name, mtime];
    }
  }
  return staleSentence(sources, bundle);
}

function selfTest() {
  const store = { projects: [], sessions: [], past: [], toasts: [] };
  const st = (over) => ({ sheet: true, tab: 'sm-tab-managed', store, toolbar: { mode: 'filters', height: 47 }, titleHeight: 52, ...over });
  const batch = (over) => ({ phase: 'confirm', heading: 'End 2 running sessions?', targets: [{ id: 'a' }, { id: 'b' }], skipped: '1 selected session stays unchanged: 1 already ended', confirmDisabled: false, ...over });
  const mrow = (over) => ({ id: 'x', tab: 'managed', status: 'idle', machineId: null, groupDrawn: '/w/a', groupWant: '/w/a', stateDrawn: 'idle', stateWant: 'idle', primary: { verb: 'end', disabled: false, title: null, text: 'End session…' }, checkbox: true, eligibility: 'yes', menuSheet: [{ label: 'Rename', disabled: false }], menuPolicy: [{ label: 'Rename', disabled: false }], ...over });
  // Phase 298. One clean reading of the interaction states, with the resolved
  // token values a dark window really answers, so an override names the one
  // thing under test.
  const headStates = (over = {}) => ({
    tokens: {
      transparent: 'rgba(0, 0, 0, 0)',
      bgRaised: 'rgb(32, 35, 41)',
      bgActive: 'rgb(37, 41, 49)',
      borderActive: 'rgb(45, 48, 56)',
      focusRing: 'rgba(77, 157, 232, 0.6) 0px 0px 0px 2px',
      // Chromium computes a duration in seconds, so the arm never compares a
      // reading to the token's TEXT: both sides are read through
      // getComputedStyle, here and in the window.
      durFast: '0.12s',
      durFastReduced: '0.001s',
      easeOut: 'cubic-bezier(0.2, 0, 0, 1)'
    },
    rest: { background: 'rgba(0, 0, 0, 0)' },
    hover: { background: 'rgb(32, 35, 41)' },
    checked: { background: 'rgb(37, 41, 49)', borderBottom: 'rgb(45, 48, 56)' },
    open: { background: 'rgb(37, 41, 49)' },
    focusFirst: { boxShadow: 'rgba(77, 157, 232, 0.6) 0px 0px 0px 2px' },
    focusLast: { boxShadow: 'rgba(77, 157, 232, 0.6) 0px 0px 0px 2px' },
    transition: { property: 'background', duration: '0.12s', timing: 'cubic-bezier(0.2, 0, 0, 1)' },
    reduced: { property: 'none', duration: '0.001s' },
    prefersColorSchemeQueries: 0,
    ...over
  });
  // PHASE 298 FIX ROUND. The two bases' palettes as a dark window really answers
  // them, being `tokens.css:15-22` and `:35-42` resolved to rgb, against the light
  // block at `:472`. Written out here ONLY so the refusal can be proved both ways
  // with no Electron; the run itself reads them through the cascade and never from
  // this table, so a retune reddens nothing but this one fixture's last clause.
  const PAL = {
    dark: {
      '--bg-canvas': 'rgb(19, 20, 23)',
      '--bg-sidebar': 'rgb(14, 15, 19)',
      '--bg-surface': 'rgb(25, 27, 32)',
      '--bg-raised': 'rgb(32, 35, 41)',
      '--bg-active': 'rgb(37, 41, 49)',
      '--text-primary': 'rgb(201, 202, 205)',
      '--text-secondary': 'rgb(156, 161, 171)',
      '--text-muted': 'rgb(131, 137, 150)',
      '--text-disabled': 'rgb(86, 91, 102)'
    },
    light: {
      '--bg-canvas': 'rgb(245, 247, 250)',
      '--bg-sidebar': 'rgb(237, 239, 243)',
      '--bg-surface': 'rgb(252, 252, 254)',
      '--bg-raised': 'rgb(229, 231, 237)',
      '--bg-active': 'rgb(217, 220, 227)',
      '--text-primary': 'rgb(53, 54, 57)',
      '--text-secondary': 'rgb(79, 83, 92)',
      '--text-muted': 'rgb(98, 103, 116)',
      '--text-disabled': 'rgb(146, 151, 164)'
    }
  };
  // PHASE 298 FIX ROUND. 11d's readings, so every clause of the dock can be
  // proved both ways with no Electron.
  //
  // THE GEOMETRY IS THE ONE THE ARM REALLY RESOLVES, worked out by hand from the
  // stylesheet rather than copied out of a run: a 1440x528 window, so the sheet
  // is 480 tall between the scrim's two `--space-8` gutters and spans y 24..504,
  // and 1180 wide and centred, so x 130..1310. At HEAD the footer is 29 tall
  // (475..504) and the strip for three toasts is 148 + 2 * `--space-4` = 164
  // (311..475), which leaves the scroller 123..311; the strip's own `--space-8`
  // of side padding and `align-items: flex-end` put the 360px stack at
  // x 926..1286 and its `--space-4` gap makes the three toasts 319..363,
  // 371..415 and 423..467. At the parent there is no strip: the stack is fixed
  // `--space-6` from the window's right and bottom, so x 1064..1424 and bottom
  // 512, and its top is 512 less its height — 468, 416 and 364 by count, which
  // is 504 - top = 36 / 88 / 140 of reach past the sheet's bottom edge, the
  // entry's own table. The parent's footer is 45 (459..504), so its scroller ends
  // at 459 and the last of its 74px rows is 385..459 with a 24px button centred
  // at 410..434.
  const rct = (top, left, height, width) => ({ top, left, width, height, bottom: top + height, right: left + width });
  const okToast = (stamp, top, left, over = {}) => ({
    stamp: stamp,
    text: 'That folder does not exist.',
    sticky: true,
    rect: rct(top, left, TOAST_BOX_H, 360),
    insideSheet: true,
    dismiss: { rect: rct(top + 8, left + 320, 28, 28), hit: { desc: 'span.codicon', inToasts: true, inPrimary: false, inDismiss: true } },
    ...over
  });
  /** The docked reading at HEAD, at n toasts. */
  const dockedGeo = (n, over = {}) => {
    const strip = n * TOAST_BOX_H + (n - 1) * 8 + 16;
    const scrollBottom = 475 - strip;
    const tops = [];
    for (let i = 0; i < n; i += 1) tops.push(475 - strip + 8 + i * (TOAST_BOX_H + 8));
    const toasts = tops.map((top, i) => okToast(String(i + 1), top, 926));
    const stackRect = rct(tops[0], 926, n * TOAST_BOX_H + (n - 1) * 8, 360);
    return {
      window: { width: 1440, height: 528 },
      count: n,
      stack: { rect: stackRect, docked: true, position: 'static', right: 'auto', bottom: 'auto', zIndex: 'auto', gapRight: 1440 - stackRect.right, gapBottom: 528 - stackRect.bottom, inOutlet: true, stamps: toasts.map((one) => one.stamp) },
      overflow: null,
      toasts: toasts,
      sheet: rct(24, 130, 480, 1180),
      scroller: { rect: rct(123, 130, scrollBottom - 123, 1180), scrollTop: 100, scrollHeight: 427, clientHeight: scrollBottom - 123, scrolls: true },
      foot: rct(475, 130, 29, 1180),
      outlet: { rect: rct(475 - strip, 130, strip, 1180), display: 'flex' },
      rowsDrawn: 7,
      lastRow: 'z',
      end: { rect: rct(scrollBottom - 41 + 8.5, 1129, 24, 121), row: 'z', verb: 'end', text: 'End session…' },
      endHit: { desc: 'button.btn.btn-sm', inToasts: false, inPrimary: true, inDismiss: false },
      overlapEnd: { width: 0, height: 0, area: 0 },
      overlapSheet: { width: 360, height: stackRect.height, area: 360 * stackRect.height },
      insideSheet: true,
      belowScroller: true,
      aboveFoot: true,
      sheetBottomReach: 504 - stackRect.top,
      ...over
    };
  };
  /** The window-fixed reading at the parent, at n toasts. */
  const fixedGeo = (n, over = {}) => {
    const h = n * TOAST_BOX_H + (n - 1) * 8;
    const stackRect = rct(512 - h, 1064, h, 360);
    const tops = [];
    for (let i = 0; i < n; i += 1) tops.push(512 - h + i * (TOAST_BOX_H + 8));
    const toasts = tops.map((top, i) => okToast(String(i + 1), top, 1064, { insideSheet: false }));
    const button = rct(410, 1129, 24, 121);
    const covered = stackRect.top <= button.top + 12;
    return {
      window: { width: 1440, height: 528 },
      count: n,
      stack: { rect: stackRect, docked: false, position: 'fixed', right: '16px', bottom: '16px', zIndex: '700', gapRight: 16, gapBottom: 16, inOutlet: false, stamps: toasts.map((one) => one.stamp) },
      overflow: null,
      toasts: toasts,
      sheet: rct(24, 130, 480, 1180),
      scroller: { rect: rct(123, 130, 336, 1180), scrollTop: 400, scrollHeight: 722, clientHeight: 336, scrolls: true },
      foot: rct(459, 130, 45, 1180),
      outlet: null,
      rowsDrawn: 7,
      lastRow: 'z',
      end: { rect: button, row: 'z', verb: 'end', text: 'End session…' },
      endHit: covered
        ? { desc: 'div.toast.toast-sticky', inToasts: true, inPrimary: false, inDismiss: false }
        : { desc: 'button.btn.btn-sm', inToasts: false, inPrimary: true, inDismiss: false },
      overlapEnd: stackRect.top >= button.bottom ? { width: 0, height: 0, area: 0 } : { width: 121, height: button.bottom - Math.max(stackRect.top, button.top), area: 121 * (button.bottom - Math.max(stackRect.top, button.top)) },
      overlapSheet: { width: 360, height: 504 - stackRect.top, area: 360 * (504 - stackRect.top) },
      insideSheet: false,
      belowScroller: false,
      aboveFoot: false,
      sheetBottomReach: 504 - stackRect.top,
      ...over
    };
  };
  const dockedReads = TOAST_COUNTS.map((n) => ({ n, stamps: [], geo: dockedGeo(n) }));
  const fixedReads = TOAST_COUNTS.map((n) => ({ n, stamps: [], geo: fixedGeo(n) }));
  /** Four raised, the newest three drawn, the `+n more` line above them. */
  const capGeoFx = (over = {}) => {
    const g = dockedGeo(TOAST_CAP);
    const toasts = g.toasts.map((one, i) => ({ ...one, stamp: String(i + 2) }));
    return {
      ...g,
      count: TOAST_CAP,
      toasts: toasts,
      overflow: '+1 more',
      stack: { ...g.stack, stamps: toasts.map((one) => one.stamp), rect: rct(g.stack.rect.top - 28, g.stack.rect.left, g.stack.rect.height + 28, 360) },
      ...over
    };
  };
  /** The same sheet with NOTHING toasted: the strip is `:empty` and takes no height. */
  const zeroGeo = (over = {}) => ({
    window: { width: 1440, height: 528 },
    count: 0,
    stack: null,
    overflow: null,
    toasts: [],
    sheet: rct(24, 130, 480, 1180),
    scroller: { rect: rct(123, 130, 352, 1180), scrollTop: 0, scrollHeight: 427, clientHeight: 352, scrolls: true },
    foot: rct(475, 130, 29, 1180),
    outlet: { rect: rct(475, 130, 0, 1180), display: 'none' },
    rowsDrawn: 7,
    lastRow: 'z',
    end: null,
    endHit: null,
    overlapEnd: null,
    overlapSheet: null,
    insideSheet: null,
    belowScroller: null,
    aboveFoot: null,
    sheetBottomReach: null,
    ...over
  });
  /** The parent with nothing toasted: no strip at all, and a 45px footer. */
  const zeroParentGeo = (over = {}) => ({
    ...zeroGeo(),
    outlet: null,
    scroller: { rect: rct(123, 130, 336, 1180), scrollTop: 0, scrollHeight: 722, clientHeight: 336, scrolls: true },
    foot: rct(459, 130, 45, 1180),
    ...over
  });
  /** One toast with the sheet CLOSED, which must read the same on both bases. */
  const closedGeoFx = (over = {}) => ({
    window: { width: 1440, height: 528 },
    count: 1,
    stack: { rect: rct(512 - TOAST_BOX_H, 1064, TOAST_BOX_H, 360), docked: false, position: 'fixed', right: '16px', bottom: '16px', zIndex: '700', gapRight: 16, gapBottom: 16, inOutlet: false, stamps: ['5'] },
    overflow: null,
    toasts: [okToast('5', 512 - TOAST_BOX_H, 1064, { insideSheet: null })],
    sheet: null,
    scroller: null,
    foot: null,
    outlet: null,
    rowsDrawn: 0,
    lastRow: null,
    end: null,
    endHit: null,
    overlapEnd: null,
    overlapSheet: null,
    insideSheet: null,
    belowScroller: null,
    aboveFoot: null,
    sheetBottomReach: null,
    ...over
  });
  const count = (l) => l.length;
  // PHASE 298 FIX ROUND. THE HIT-AREA READING as a running Managed tab answers it
  // once the two regressions are fixed, so an override names the one thing under
  // test. The keys are the role keys `targets()` builds, written out here so a
  // typo in HIT_PARENT cannot agree with a typo in the reader; `over` carries a
  // per-key patch, `drop` takes a control out of the DOM and `extra` adds one the
  // table has never seen.
  const KEY = {
    check: 'label.sm-check > input[type=checkbox][data-manage-check]',
    selectAll: 'label.sm-check > input[type=checkbox]#sm-select-all',
    name: 'button.sm-name[data-manage-name]',
    sort: 'button.sm-sort[data-sort]',
    tabManaged: 'button#sm-tab-managed.sm-tab',
    end: 'button.btn.btn-secondary.btn-sm.sm-end[data-manage-primary][data-verb]',
    more: 'button.sm-icon-btn[data-manage-more]',
    title: 'button.sm-icon-btn'
  };
  const oneTarget = (key, width, height) => ({ key, what: key, width, height, disabled: false, cellHeight: null, rowHeight: null });
  const headHits = (over = {}, drop = null, extra = []) =>
    collapseTargets(
      [
        oneTarget(KEY.check, 32, 32),
        // The ADMITTED exception's own reading: 32 x 28, every reachable pixel of
        // a 28px heading row.
        oneTarget(KEY.selectAll, 32, 28),
        // The name button given its CELL, which is the fix for the 20 that
        // shipped: the Session cell is 40 tall at `--sm-row-h`.
        oneTarget(KEY.name, 240, 40),
        // The sort button given its own 28px heading row, which is the fix for
        // the 16 that shipped.
        oneTarget(KEY.sort, 60, 28),
        // `.btn.btn-sm` is 24 tall on both commits (app.css:2731).
        oneTarget(KEY.end, 96, 24),
        oneTarget(KEY.more, 28, 28),
        oneTarget(KEY.title, 28, 28),
        // The THIRD admitted exception's own reading. 1.1px narrower than the
        // parent's 102.3 because the count chip became the app's 16x16 primitive,
        // and the height does not move.
        oneTarget(KEY.tabManaged, 101.2, 51),
        ...extra
      ]
        .filter((one) => one.key !== drop)
        .map((one) => (over[one.key] === undefined ? one : { ...one, ...over[one.key] }))
    );
  // PHASE 298 FIX ROUND, SECOND PASS. `--accent-wash` over the panel, which is the
  // reading the build round printed 1.11:1 for. `rgba(77, 157, 232, 0.14)` over
  // `--bg-surface` rgb(25, 27, 32) composites to rgb(32, 45, 60): 77 * 0.14 +
  // 25 * 0.86 = 32.28, 157 * 0.14 + 27 * 0.86 = 45.2, 232 * 0.14 + 32 * 0.86 = 60.
  const WASH_LAYERS = [
    { what: 'div.sm-toolbar', color: 'rgba(77, 157, 232, 0.14)', alpha: 0.14 },
    { what: 'div.sm-panel', color: 'rgb(25, 27, 32)', alpha: 1 }
  ];
  const washRow = (over = {}) => ({
    what: 'strong.sm-selected',
    base: 'dark',
    state: 'checked',
    fg: 'rgb(201, 202, 205)',
    bg: 'rgb(32, 45, 60)',
    bgGround: 'rgb(25, 27, 32)',
    bgLayers: WASH_LAYERS,
    composited: true,
    why: null,
    exemptBecause: null,
    ...over
  });
  const fixtures = [
    ['1 the door opened on the tab it named', () => doorFindings('1', st({}), 'managed'), []],
    ['1 the wrong tab is named', () => count(doorFindings('1', st({ tab: 'sm-tab-managed' }), 'past')), 1],
    ['1 no sheet is a finding', () => count(doorFindings('1', st({ sheet: false }), 'managed')), 1],
    ['1 an open project is not the no-project door', () => count(doorFindings('1', st({ store: { ...store, projects: [{ id: 'p' }] } }), 'managed')), 1],
    ['11 both modes at 47 and the title at 52', () => geometryFindings(st({}), st({ toolbar: { mode: 'selection', height: 47 } })), []],
    ['11 the study\'s 45px arithmetic is caught', () => count(geometryFindings(st({}), st({ toolbar: { mode: 'selection', height: 45 } }))), 1],
    ['11 a 20px title is caught', () => count(geometryFindings(st({ titleHeight: 20 }), st({ toolbar: { mode: 'selection', height: 47 } }))), 1],
    // Phase 298. Every new grader both ways.
    ['11 HEAD\'s own boxes and pitches pass', () => boxFindings('head', { ...GEOM.head }), []],
    ['11 the parent\'s own boxes and pitches pass', () => boxFindings('parent', { ...GEOM.parent }), []],
    ['11 HEAD graded against the parent\'s readings is one finding per key', () => count(boxFindings('head', { ...GEOM.parent })), Object.keys(GEOM.head).length],
    ['11 a stage grades only the keys it names', () => boxFindings('head', { rowBox: 41 }, ['rowBox']), []],
    // The collapsed border is INSIDE the `tr`'s rect, so the grid has one number
    // and this fixture is what stops a later round splitting it back into two.
    ['11 the grid\'s box IS its pitch on both columns', () => [GEOM.head.rowBox === GEOM.head.managedPitch, GEOM.parent.rowBox === GEOM.parent.managedPitch], [true, true]],
    ['11 the Past row\'s box IS its pitch on both columns, for the other reason', () => [GEOM.head.pastRowBox === GEOM.head.pastPitch, GEOM.parent.pastRowBox === GEOM.parent.pastPitch], [true, true]],
    ['11 every GEOM key covered by the two stages passes', () => coverageFindings(Object.keys(GEOM.head)), []],
    ['11 a GEOM key neither stage graded is caught', () => count(coverageFindings(Object.keys(GEOM.head).filter((k) => k !== 'pastPitch'))), 1],
    ['11 a key that is not a GEOM key is caught', () => count(coverageFindings([...Object.keys(GEOM.head), 'invented'])), 1],
    ['11 the entry\'s own 40px grid BOX is caught, which is the wrong layout model', () => count(boxFindings('head', { ...GEOM.head, rowBox: 40 })), 1],
    ['11 a 40px PITCH on the grid is caught, which is the hairline lost from between two rows', () => count(boxFindings('head', { ...GEOM.head, managedPitch: 40 })), 1],
    ['11 a 41px Past row is caught, which is the hairline out of its border box', () => count(boxFindings('head', { ...GEOM.head, pastRowBox: 41 })), 1],
    ['11 a box that was not read at all is caught', () => count(boxFindings('head', { ...GEOM.head, footBox: null })), 1],
    ['11 half a pixel of rounding is inside tolerance', () => boxFindings('head', { ...GEOM.head, rowBox: 41.4 }), []],
    // PHASE 298 FIX ROUND. THE HIT AREAS, and every clause both ways. The build
    // round's arm measured ONE target and the entry promised "no hit area smaller
    // than today" about all of them; these are what make that promise able to
    // fail.
    ['11 a clean hit-area reading passes the parent clause', () => hitFindings('head', headHits()), []],
    ['11 the same reading passes the WCAG clause', () => wcagFindings(headHits()), []],
    ['11 a target LARGER than the parent read passes', () => hitFindings('head', headHits({ [KEY.more]: { width: 36, height: 36 } })), []],
    ['11 the 20px NAME BUTTON that shipped is caught against the parent\'s 37', () => count(hitFindings('head', headHits({ [KEY.name]: { height: 20 } }))), 1],
    ['11 that same 20 is under WCAG 24 and the parent\'s 37 cleared it, so THIS BUILD is blamed', () => count(wcagFindings(headHits({ [KEY.name]: { height: 20 } }))), 1],
    ['11 the 16px SORT BUTTON that shipped is caught against the parent\'s 20', () => count(hitFindings('head', headHits({ [KEY.sort]: { height: 16 } }))), 1],
    ['11 the parent\'s own 20px sort button was ALREADY under WCAG 24, so the 16 is queued and not re-blamed', () => [count(wcagFindings(headHits({ [KEY.sort]: { height: 16 } }))), hitNotes('head', headHits({ [KEY.sort]: { height: 16 } })).filter((l) => l.includes('PRE-EXISTING')).length], [0, 1]],
    ['11 the SELECT-ALL is held to the admitted 32x28 and not to the parent\'s 32x32', () => hitFindings('head', headHits()), []],
    ['11 a select-all shrunk BELOW the admitted exception is still caught, so the exception cannot be widened', () => count(hitFindings('head', headHits({ [KEY.selectAll]: { height: 24 } }))), 1],
    ['11 the exception carries its arithmetic and clears the WCAG floor on both dimensions', () => [HIT_EXCEPTIONS[KEY.selectAll].width * HIT_EXCEPTIONS[KEY.selectAll].height, HIT_EXCEPTIONS[KEY.selectAll].parentWidth * HIT_EXCEPTIONS[KEY.selectAll].parentHeight, HIT_EXCEPTIONS[KEY.selectAll].width >= WCAG_MIN && HIT_EXCEPTIONS[KEY.selectAll].height >= WCAG_MIN], [896, 1024, true]],
    // TWO admitted exceptions since the operator's 2026-09-20 ruling: the column
    // heading's select-all and the row's name button. Both are SAID in the notes,
    // and this count is what stops a third being added in silence.
    ['11 the exception is SAID in the notes rather than tolerated in silence', () => hitNotes("head", headHits()).filter((l) => l.includes("ADMITTED EXCEPTION APPLIED")).length, 3],
    ['11 the PRIMARY\'s floor is 24 and not the build round\'s 28, which the row never drew on either commit', () => [HIT_PARENT[KEY.end].height, count(hitFindings('head', headHits({ [KEY.end]: { height: 24 } })))], [24, 0]],
    ['11 a 23px primary is still caught, so the 24 is a floor and not a shrug', () => count(hitFindings('head', headHits({ [KEY.end]: { height: 23 } }))), 1],
    ['11 a pinned key the DOM never answered is caught, which is the defect this table was rewritten to end', () => count(hitFindings('head', headHits({}, KEY.more))), 1],
    ['11 nothing enumerated at all is caught', () => count(hitFindings('head', [])), 1],
    ['11 a control the table has never seen is measured, not a finding, and NAMED in the notes', () => [count(hitFindings('head', headHits({}, null, [oneTarget('input[type=text]#sm-search.input', 200, 28)]))), hitNotes('head', headHits({}, null, [oneTarget('input[type=text]#sm-search.input', 200, 28)])).filter((l) => l.includes('NO PARENT READING')).length], [0, 1]],
    ['11 a NEW control under the WCAG floor with no parent reading is a note and never a finding', () => [count(wcagFindings(headHits({}, null, [oneTarget('button.invented', 20, 20)]))), hitNotes('head', headHits({}, null, [oneTarget('button.invented', 20, 20)])).filter((l) => l.includes('NO PARENT READING')).length], [0, 1]],
    ['11 the WCAG roll-up is said once and names both sides', () => hitNotes('head', headHits()).filter((l) => l.includes('WCAG 2.2 AA 2.5.8 on the head base')).length, 1],
    ['11 the smallest copy of a role is what is graded', () => collapseTargets([oneTarget(KEY.more, 28, 28), oneTarget(KEY.more, 28, 20)]).map((o) => [o.width, o.height, o.count]), [[28, 20, 2]]],
    ['11 the smallest WIDTH and the smallest HEIGHT are taken separately, never by area', () => collapseTargets([oneTarget(KEY.more, 100, 20), oneTarget(KEY.more, 20, 100)]).map((o) => [o.width, o.height]), [[20, 20]]],
    ['11 a parent readings file may RAISE a pinned floor and never lower one', () => { const p = parentTable([{ key: KEY.check, width: 40, height: 40 }, { key: KEY.more, width: 2, height: 2 }]); return [p[KEY.check].height, p[KEY.more].height]; }, [40, 28]],
    ['11 a raised floor really grades: a 32px check under the parent run\'s 40 is caught', () => count(hitFindings('head', headHits(), parentTable([{ key: KEY.check, width: 40, height: 40 }]))), 2],
    ['11 a file-only key nothing matched is a note, because a control can be state dependent', () => { const p = parentTable([{ key: 'button.gone', width: 30, height: 30 }]); return [count(hitFindings('head', headHits(), p)), hitNotes('head', headHits(), p).filter((l) => l.includes('drew nothing matching it')).length]; }, [0, 1]],
    ['11 a target ALREADY under the floor at the parent is queued rather than failed', () => { const p = parentTable([{ key: 'button.tiny', width: 20, height: 20 }]); const t = collapseTargets([oneTarget('button.tiny', 20, 20)]); return [count(wcagFindings(t, p)), hitNotes('head', t, p).filter((l) => l.includes('PRE-EXISTING')).length]; }, [0, 1]],
    ['11 WCAG 2.2 AA 2.5.8 is 24, on both dimensions', () => WCAG_MIN, 24],
    ['11 icons inside the set pass', () => iconFindings('head', { sizes: [{ what: 'a', px: 12 }, { what: 'b', px: 16 }, { what: 'c', px: 24 }] }), []],
    ['11 a 19px agent mark is caught at HEAD', () => count(iconFindings('head', { sizes: [{ what: 'AgentIcon', px: 19 }] })), 1],
    ['11 a 28px codicon is caught at HEAD', () => count(iconFindings('head', { sizes: [{ what: 'Codicon', px: 28 }] })), 1],
    ['11 no icon at all is caught', () => count(iconFindings('head', { sizes: [] })), 1],
    ['11 the parent must HOLD both strays', () => iconFindings('parent', { sizes: [{ what: 'a', px: 19 }, { what: 'b', px: 28 }] }), []],
    ['11 a parent with no stray is not the parent', () => count(iconFindings('parent', { sizes: [{ what: 'a', px: 16 }] })), 2],
    ['11 HEAD\'s states pass', () => stateFindings('head', headStates()), []],
    ['11 a row that does not fill on hover is caught', () => count(stateFindings('head', headStates({ hover: { background: 'rgba(0, 0, 0, 0)' } }))), 1],
    ['11 a checked row keeping --border is caught', () => count(stateFindings('head', headStates({ checked: { background: 'rgb(37, 41, 49)', borderBottom: 'rgb(38, 40, 46)' } }))), 1],
    ['11 an `all 0s` transition at HEAD is three findings, one per term', () => count(stateFindings('head', headStates({ transition: { property: 'all', duration: '0s', timing: 'ease' } }))), 3],
    ['11 the parent\'s missing transition is what the parent must read', () => stateFindings('parent', headStates({ transition: { property: 'all', duration: '0s', timing: 'ease' }, reduced: { property: 'none', duration: '0s' } })), []],
    ['11 a reduced-motion duration of 0.12s is caught, so the duration is a literal', () => count(stateFindings('head', headStates({ reduced: { property: 'none', duration: '0.12s' } }))), 1],
    ['11 a reduced-motion property of background is caught', () => count(stateFindings('head', headStates({ reduced: { property: 'background', duration: '0.001s' } }))), 1],
    ['11 the Past row\'s own transition is graded by the same grader', () => transitionFindings('head', '.sm-past-row', { property: 'background', duration: '0.12s', timing: 'cubic-bezier(0.2, 0, 0, 1)' }, { durFast: '0.12s', easeOut: 'cubic-bezier(0.2, 0, 0, 1)' }), []],
    ['11 a Past row with no transition is caught three ways at HEAD', () => count(transitionFindings('head', '.sm-past-row', { property: 'all', duration: '0s', timing: 'ease' }, { durFast: '0.12s', easeOut: 'cubic-bezier(0.2, 0, 0, 1)' })), 3],
    ['11 one prefers-color-scheme query is caught', () => count(stateFindings('head', headStates({ prefersColorSchemeQueries: 1 }))), 1],
    ['11 a clean clipping attack passes', () => clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['name', 'path', 'folder'], ellipsisWithoutTitle: [] })) }), []],
    ['11 a clipped honesty word is caught', () => count(clipFindings({ widths: [{ width: 1440, why: 'x', clipped: [{ what: 'the Messages small line', by: 'td.sm-col-messages', text: 'Replies not recorded' }], ellipsisKinds: ['name', 'path', 'folder'], ellipsisWithoutTitle: [] }, ...CLIP_WIDTHS.slice(1).map((w) => ({ ...w, clipped: [], ellipsisKinds: ['name', 'path', 'folder'], ellipsisWithoutTitle: [] }))] })), 1],
    ['11 a fourth ellipsising kind is caught', () => count(clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['name', 'path', 'folder', 'state'], ellipsisWithoutTitle: [] })) })), 3],
    ['11 an ellipsis with no hover title is caught', () => count(clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['name', 'path', 'folder'], ellipsisWithoutTitle: ['.sm-name strong'] })) })), 3],
    ['11 a width the attack never reached is caught', () => count(clipFindings({ widths: [{ width: 1440, why: 'x', clipped: [], ellipsisKinds: ['name', 'path', 'folder'], ellipsisWithoutTitle: [] }] })), 1],
    // PHASE 298 FIX ROUND. The Managed tab holds two of the three kinds, which is
    // what the app run read at HEAD and identically at the parent.
    ['11 the three allowed kinds are three, and a fourth entry would move the want', () => ELLIPSIS_ALLOWED.length, 3],
    ['11 the Managed tab\'s two kinds are not a finding when only two are drawn', () => clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['strong in .sm-name-line', 'span.sm-group-path'], ellipsisReachable: [ELLIPSIS_ALLOWED[0].what, ELLIPSIS_ALLOWED[1].what], ellipsisNotDrawn: [ELLIPSIS_ALLOWED[2].what], ellipsisWithoutTitle: [] })) }), []],
    ['11 a DRAWN kind that stopped ellipsising is still caught at every width', () => count(clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['strong in .sm-name-line'], ellipsisReachable: [ELLIPSIS_ALLOWED[0].what, ELLIPSIS_ALLOWED[1].what], ellipsisNotDrawn: [ELLIPSIS_ALLOWED[2].what], ellipsisWithoutTitle: [] })) })), 3],
    ['11 a fourth kind is still caught on a tab that holds two', () => count(clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['a', 'b', 'c'], ellipsisReachable: [ELLIPSIS_ALLOWED[0].what, ELLIPSIS_ALLOWED[1].what], ellipsisNotDrawn: [ELLIPSIS_ALLOWED[2].what], ellipsisWithoutTitle: [] })) })), 3],
    ['11 all three drawn and all three ellipsising passes', () => clipFindings({ widths: CLIP_WIDTHS.map((w) => ({ ...w, clipped: [], ellipsisKinds: ['a', 'b', 'c'], ellipsisReachable: ELLIPSIS_ALLOWED.map((one) => one.what), ellipsisNotDrawn: [], ellipsisWithoutTitle: [] })) }), []],
    ['11 the clause that was not asked is said ONCE, not once per width', () => count(clipNotes({ widths: CLIP_WIDTHS.map((w) => ({ ...w, ellipsisNotDrawn: ['the Past row\'s folder line (the Past tab)'] })) })), 1],
    ['11 nothing undrawn says nothing', () => clipNotes({ widths: CLIP_WIDTHS.map((w) => ({ ...w, ellipsisNotDrawn: [] })) }), []],
    ['11 contrast at the floor passes', () => contrastFindings([{ what: 'a name', base: 'dark', state: 'rest', fg: 'a', bg: 'b', ratio: 4.5, exemptBecause: null }]), []],
    ['11 contrast under the floor is caught', () => count(contrastFindings([{ what: 'a small line', base: 'light', state: 'hover', fg: 'a', bg: 'b', ratio: 4.15, exemptBecause: null }])), 1],
    ['11 a NAMED disabled label is exempt', () => contrastFindings([{ what: 'Restore, disabled', base: 'dark', state: 'rest', fg: 'a', bg: 'b', ratio: 2.1, exemptBecause: 'the button is disabled and its reason is its title' }]), []],
    ['11 a pair that would not parse is caught', () => count(contrastFindings([{ what: 'a name', base: 'dark', state: 'rest', fg: 'a', bg: 'b', ratio: null, exemptBecause: null }])), 1],
    ['11 nothing measured for contrast is caught', () => count(contrastFindings([])), 1],
    // PHASE 298 FIX ROUND. The cross-base refusal, both ways, over the two bases'
    // REAL resolved values: dark --bg-raised is rgb(32, 35, 41) (tokens.css:19),
    // light --text-primary is rgb(53, 54, 57) (:520), light --bg-raised is
    // rgb(229, 231, 237). That first pair is the one the app run read eight times.
    ['11 an honest light pair is not a cross-base pair', () => crossBaseFindings([{ what: 'strong in .sm-name-line', base: 'light', state: 'hover', fg: 'rgb(53, 54, 57)', bg: 'rgb(229, 231, 237)', exemptBecause: null }], PAL), []],
    ['11 the app run\'s own impossible pair is refused by name', () => crossBaseFindings([{ what: 'strong in .sm-name-line', base: 'light', state: 'hover', fg: 'rgb(53, 54, 57)', bg: 'rgb(32, 35, 41)', exemptBecause: null }], PAL), ['11 THE THEME FLIP DID NOT REACH THIS BACKGROUND: strong in .sm-name-line (light, hover) draws --text-primary from the light base ("rgb(53, 54, 57)") over --bg-raised from the dark base ("rgb(32, 35, 41)"). Those two never coexist in a real render, so no contrast number is claimed for this pair.']],
    ['11 an impossible pair is refused once however often it is read', () => count(crossBaseFindings([{ what: 'a', base: 'light', state: 'hover', fg: 'rgb(53, 54, 57)', bg: 'rgb(32, 35, 41)', exemptBecause: null }, { what: 'a', base: 'light', state: 'hover', fg: 'rgb(53, 54, 57)', bg: 'rgb(32, 35, 41)', exemptBecause: null }], PAL)), 1],
    ['11 an impossible pair is never handed a ratio', () => gradablePairs([{ what: 'a', base: 'light', state: 'hover', fg: 'rgb(53, 54, 57)', bg: 'rgb(32, 35, 41)', exemptBecause: null }, { what: 'b', base: 'dark', state: 'rest', fg: 'rgb(201, 202, 205)', bg: 'rgb(32, 35, 41)', exemptBecause: null }], PAL).map((r) => r.what), ['b']],
    ['11 an accent in neither palette is graded rather than refused', () => [count(crossBaseFindings([{ what: 'a link', base: 'dark', state: 'rest', fg: 'rgb(77, 157, 232)', bg: 'rgb(32, 35, 41)', exemptBecause: null }], PAL)), gradablePairs([{ what: 'a link', base: 'dark', state: 'rest', fg: 'rgb(77, 157, 232)', bg: 'rgb(32, 35, 41)', exemptBecause: null }], PAL).length], [0, 1]],
    ['11 a colour BOTH bases share accuses nobody', () => baseOfColor('rgb(1, 2, 3)', { dark: { '--border': 'rgb(1, 2, 3)' }, light: { '--border': 'rgb(1, 2, 3)' } }), null],
    ['11 a reading with no palette at all is caught', () => count(crossBaseFindings([{ what: 'a', base: 'dark', state: 'rest', fg: 'x', bg: 'y', exemptBecause: null }], null)), 1],
    ['11 no palette grades every pair rather than dropping them', () => gradablePairs([{ what: 'a', base: 'dark', state: 'rest', fg: 'x', bg: 'y', exemptBecause: null }], null).length, 1],
    ['11 nothing measured needs no cross-base refusal', () => crossBaseFindings([], null), []],
    ['11 the palette tells the two bases apart on every token', () => PALETTE_TOKENS.filter((t) => PAL.dark[t] === PAL.light[t]), []],
    ['11 a whole palette resolves and says nothing extra', () => crossBaseFindings([{ what: 'a', base: 'dark', state: 'rest', fg: PAL.dark['--text-primary'], bg: PAL.dark['--bg-raised'], exemptBecause: null }], PAL), []],
    ['11 a token that stopped resolving is said, so the refusal cannot rot quietly', () => count(crossBaseFindings([{ what: 'a', base: 'dark', state: 'rest', fg: PAL.dark['--text-primary'], bg: PAL.dark['--bg-raised'], exemptBecause: null }], { dark: { ...PAL.dark, '--bg-active': undefined }, light: PAL.light })), 1],
    // PHASE 298 FIX ROUND, SECOND PASS. THE TRANSLUCENT GROUND. The build round
    // read `--accent-wash`, rgba(77, 157, 232, 0.14), as if a 14 percent wash were
    // a ground, and printed 1.11:1 where the verify measured 5.38:1 dark and
    // 6.27:1 light for the worst real pair.
    ['11 the blend is arithmetic and this module re-derives it: the wash over the panel is rgb(32, 45, 60)', () => compositeOf(WASH_LAYERS), 'rgb(32, 45, 60)'],
    ['11 a single opaque layer composites to itself', () => compositeOf([{ what: 'x', color: 'rgb(25, 27, 32)', alpha: 1 }]), 'rgb(25, 27, 32)'],
    ['11 two washes stack, the outer one applied last', () => compositeOf([{ what: 'a', color: 'rgba(255, 255, 255, 0.5)', alpha: 0.5 }, { what: 'b', color: 'rgba(255, 255, 255, 0.5)', alpha: 0.5 }, { what: 'c', color: 'rgb(0, 0, 0)', alpha: 1 }]), 'rgb(191, 191, 191)'],
    ['11 a stack whose deepest layer is NOT opaque cannot be composited', () => compositeOf([{ what: 'a', color: 'rgba(0, 0, 0, 0.5)', alpha: 0.5 }]), null],
    ['11 no layer at all cannot be composited', () => compositeOf([]), null],
    ['11 the space-separated serialisation parses the same as the comma one', () => [colorOf('rgb(1 2 3 / 0.5)'), colorOf('rgba(1, 2, 3, 0.5)')], [{ r: 1, g: 2, b: 3, a: 0.5 }, { r: 1, g: 2, b: 3, a: 0.5 }]],
    ['11 a colour this reader cannot parse is null rather than a guess', () => [colorOf('color(srgb 1 0 0)'), colorOf('transparent'), colorOf(null)], [null, null, null]],
    ['11 a composited row is graded and never refused', () => [compositeFindings([washRow()]), compositeCheckFindings([washRow()]), gradablePairs([washRow()], null).length], [[], [], 1]],
    ['11 a ground that could not be composited REFUSES LOUDLY and is never handed a ratio', () => { const row = washRow({ bg: null, composited: false, why: 'a background IMAGE is painted in this stack' }); return [count(compositeFindings([row])), gradablePairs([row], null).length]; }, [1, 0]],
    ['11 that refusal is said once however often the pair is read', () => { const row = washRow({ bg: null, composited: false, why: 'x' }); return count(compositeFindings([row, row])); }, 1],
    ['11 an older reading with no composited field is left alone, so nothing is refused retroactively', () => compositeFindings([{ what: 'a', base: 'dark', state: 'rest', fg: 'x', bg: 'y' }]), []],
    ['11 a window blend that disagrees with this module\'s is caught, both ways', () => [count(compositeCheckFindings([washRow({ bg: 'rgb(32, 45, 61)' })])), count(compositeCheckFindings([washRow()]))], [1, 0]],
    ['11 the cross-base refusal asks the GROUND and not the composite, so a wash cannot switch it off', () => count(crossBaseFindings([{ what: 'strong.sm-selected', base: 'light', state: 'checked', fg: PAL.light['--text-primary'], bg: 'rgb(60, 70, 80)', bgGround: PAL.dark['--bg-raised'], composited: true, exemptBecause: null }], PAL)), 1],
    ['11 an honest washed pair, whose composite is in neither palette, is graded rather than refused', () => [count(crossBaseFindings([washRow()], PAL)), gradablePairs([washRow()], PAL).length], [0, 1]],
    ['11 a declared property at the band\'s floor passes', () => measuredFindings('head', [{ property: '--sm-name-min', declared: 44, floor: 44, ceiling: 56, how: 'x' }]), []],
    ['11 a declared property at the band\'s ceiling passes', () => measuredFindings('head', [{ property: '--sm-name-min', declared: 56, floor: 44, ceiling: 56, how: 'x' }]), []],
    ['11 a declared property under the floor is caught', () => count(measuredFindings('head', [{ property: '--sm-name-min', declared: 40, floor: 44, ceiling: 56, how: 'x' }])), 1],
    ['11 a declared property over the ceiling is caught, so it was chosen', () => count(measuredFindings('head', [{ property: '--sm-name-min', declared: 60, floor: 44, ceiling: 56, how: 'x' }])), 1],
    ['11 a one-value band is exact', () => count(measuredFindings('head', [{ property: '--sm-actions-min', declared: 160, floor: 156, ceiling: 156, how: 'x' }])), 1],
    ['11 an undeclared property at HEAD is caught', () => count(measuredFindings('head', [{ property: '--sm-name-min', declared: null, floor: 44, ceiling: 56, how: 'x' }])), 1],
    ['11 an undeclared property at the parent is not a finding', () => measuredFindings('parent', [{ property: '--sm-name-min', declared: null, floor: 44, ceiling: 56, how: 'x' }]), []],
    ['11 the parent\'s own 170px --sm-actions-min is not a finding either', () => measuredFindings('parent', [{ property: '--sm-actions-min', declared: 170, floor: 108, ceiling: 108, how: 'x' }]), []],
    ['11 the grid rounds up and never down', () => [onGrid(52.93), onGrid(56), onGrid(56.01)], [56, 56, 60]],
    // PHASE 298 FIX ROUND. 11d, the toast dock, every clause proved both ways.
    ['11d the cap is three, the counts are three and the reach table has one row each', () => [TOAST_CAP, TOAST_COUNTS.length, Object.keys(PARENT_SHEET_REACH).length], [3, 3, 3]],
    ['11d the entry\'s reach table falls out of the fixture\'s own arithmetic', () => TOAST_COUNTS.map((n) => fixedGeo(n).sheetBottomReach), [36, 88, 140]],
    ['11d a clean docked reading passes at every count', () => TOAST_COUNTS.flatMap((n) => dockFindings('head', n, dockedGeo(n))), []],
    ['11d a clean fixed reading passes at every count at the parent', () => TOAST_COUNTS.flatMap((n) => dockFindings('parent', n, fixedGeo(n))), []],
    ['11d nothing read at all is caught', () => count(dockFindings('head', 1, null)), 1],
    ['11d no .toasts drawn at all is caught, which is what a raise that did not raise reads as', () => count(dockFindings('head', 1, dockedGeo(1, { stack: null }))), 1],
    ['11d no sheet in the docked reading is caught', () => count(dockFindings('head', 1, dockedGeo(1, { sheet: null }))), 1],
    ['11d a stack still window-fixed at HEAD is caught three ways', () => count(dockFindings('head', 1, dockedGeo(1, { stack: { ...dockedGeo(1).stack, docked: false, position: 'fixed', inOutlet: false } }))), 3],
    ['11d THE DEFECT ITSELF at HEAD, the stack over the End button, is caught twice', () => count(dockFindings('head', 2, dockedGeo(2, { overlapEnd: { width: 121, height: 18, area: 2178 }, endHit: { desc: 'div.toast.toast-sticky', inToasts: true, inPrimary: false, inDismiss: false } }))), 2],
    ['11d a stack drawn outside the sheet at HEAD is caught', () => count(dockFindings('head', 1, dockedGeo(1, { insideSheet: false }))), 1],
    ['11d a stack over the scroller rather than below it is caught', () => count(dockFindings('head', 1, dockedGeo(1, { belowScroller: false }))), 1],
    ['11d a stack under the footer is caught', () => count(dockFindings('head', 1, dockedGeo(1, { aboveFoot: false }))), 1],
    ['11d a missing strip at HEAD is caught once, not twice', () => count(dockFindings('head', 1, dockedGeo(1, { outlet: null }))), 1],
    ['11d a grid that does not overflow its scroller is caught, so a short list can never read clean', () => count(dockFindings('head', 1, dockedGeo(1, { scroller: { ...dockedGeo(1).scroller, scrolls: false } }))), 1],
    ['11d no End button inside the scroller is caught', () => count(dockFindings('head', 1, dockedGeo(1, { end: null }))), 1],
    // The box's height is a FLOOR, so a TALLER toast is the box working and draws
    // no finding: a real sentence read 45 against a 44 min-height on both bases and
    // the first driven run called that a defect seven times over.
    ['11d a toast TALLER than its min-height is the box working, not a finding', () => count(dockFindings('head', 1, dockedGeo(1, { toasts: [okToast('1', 423, 926, { rect: rct(423, 926, 60, 360) })] }))), 0],
    // A toast SHORTER than its own minimum has lost its fill, and that still fails.
    ['11d a toast UNDER its min-height has lost its box and IS a finding', () => count(dockFindings('head', 1, dockedGeo(1, { toasts: [okToast('1', 423, 926, { rect: rct(423, 926, 30, 360) })] }))), 1],
    ['11d a toast that leaves by itself is caught', () => count(dockFindings('head', 1, dockedGeo(1, { toasts: [okToast('1', 423, 926, { sticky: false })] }))), 1],
    ['11d a sticky toast with no × is caught', () => count(dockFindings('head', 1, dockedGeo(1, { toasts: [okToast('1', 423, 926, { dismiss: null })] }))), 1],
    ['11d an × something else covers is caught, which is why pointer-events was refused', () => count(dockFindings('head', 1, dockedGeo(1, { toasts: [okToast('1', 423, 926, { dismiss: { rect: rct(431, 1246, 28, 28), hit: { desc: 'div.modal-scrim', inToasts: false, inPrimary: false, inDismiss: false } } })] }))), 1],
    ['11d a parent reach that is not the entry\'s number is caught', () => count(dockFindings('parent', 2, fixedGeo(2, { sheetBottomReach: 60 }))), 1],
    ['11d a docked class at the parent is caught twice', () => count(dockFindings('parent', 1, fixedGeo(1, { stack: { ...fixedGeo(1).stack, docked: true, position: 'static' } }))), 2],
    ['11d a strip at the parent is caught', () => count(dockFindings('parent', 1, fixedGeo(1, { outlet: { rect: rct(0, 0, 0, 0), display: 'none' } }))), 1],
    ['11d the cover clause passes over a clean docked set', () => dockCoverFindings('head', dockedReads), []],
    ['11d the cover clause FINDS the parent\'s defect at the deepest count', () => dockCoverFindings('parent', fixedReads), []],
    ['11d a parent set in which the button was never covered is caught twice, which is the clause proving nothing', () => count(dockCoverFindings('parent', TOAST_COUNTS.map((n) => ({ n, stamps: [], geo: fixedGeo(n, { overlapEnd: { width: 0, height: 0, area: 0 }, endHit: { desc: 'button.btn.btn-sm', inToasts: false, inPrimary: true, inDismiss: false } }) })))), 2],
    ['11d a docked set in which the stack still reaches the button is caught', () => count(dockCoverFindings('head', dockedReads.map((one) => (one.n === 3 ? { ...one, geo: { ...one.geo, overlapEnd: { width: 121, height: 5, area: 605 } } } : one)))), 1],
    ['11d a set short of a count is caught', () => count(dockCoverFindings('head', dockedReads.slice(0, 2))), 1],
    ['11d a set whose readings found no End button is caught', () => count(dockCoverFindings('head', dockedReads.map((one) => ({ ...one, geo: { ...one.geo, end: null } })))), 1],
    ['11d a clean cap reading passes', () => dockCapFindings('head', capGeoFx(), ['2', '3', '4'], 4), []],
    ['11d a fourth toast DRAWN is caught', () => count(dockCapFindings('head', capGeoFx({ count: 4 }), ['2', '3', '4'], 4)), 1],
    ['11d a missing +n more line is caught', () => count(dockCapFindings('head', capGeoFx({ overflow: null }), ['2', '3', '4'], 4)), 1],
    ['11d a +n more line counting the wrong number is caught', () => count(dockCapFindings('head', capGeoFx({ overflow: '+2 more' }), ['2', '3', '4'], 4)), 1],
    ['11d the OLDEST three kept rather than the newest is caught', () => count(dockCapFindings('head', capGeoFx(), ['1', '2', '3'], 4)), 1],
    ['11d the two readings of the order disagreeing is caught twice', () => count(dockCapFindings('head', capGeoFx({ stack: { ...capGeoFx().stack, stamps: ['4', '3', '2'] } }), ['4', '3', '2'], 4)), 2],
    ['11d an overflow line drawn BELOW the toasts it counts is caught', () => count(dockCapFindings('head', capGeoFx({ stack: { ...capGeoFx().stack, rect: rct(capGeoFx().toasts[0].rect.top + 20, 926, 100, 360) } }), ['2', '3', '4'], 4)), 1],
    ['11d the strip takes its height FROM the scroller and the sheet does not move', () => dockHeightFindings('head', zeroGeo(), dockedGeo(3)), []],
    ['11d a scroller that lost nothing is caught twice, which is a stack drawn OVER the rows', () => count(dockHeightFindings('head', zeroGeo(), dockedGeo(3, { scroller: { ...zeroGeo().scroller } }))), 2],
    ['11d a sheet that grew to hold the strip is caught', () => count(dockHeightFindings('head', zeroGeo(), dockedGeo(3, { sheet: rct(24, 130, 644, 1180) }))), 1],
    ['11d an EMPTY strip that takes height is caught twice, which is what holds the rows-per-sheet reading', () => count(dockHeightFindings('head', zeroGeo({ outlet: { rect: rct(455, 130, 20, 1180), display: 'flex' } }), dockedGeo(3))), 2],
    ['11d the parent losing no height at all is what the parent must read', () => dockHeightFindings('parent', zeroParentGeo(), fixedGeo(3)), []],
    ['11d a parent whose scroller shrank is caught, so this grader cannot pass a mislabelled base', () => count(dockHeightFindings('parent', zeroParentGeo(), fixedGeo(3, { scroller: { ...fixedGeo(3).scroller, rect: rct(123, 130, 200, 1180) } }))), 1],
    ['11d the closed reading passes on BOTH bases and to the same values', () => [dockClosedFindings('head', closedGeoFx(), 16, '700'), dockClosedFindings('parent', closedGeoFx(), 16, '700')], [[], []]],
    ['11d a stack still docked with no sheet open is caught twice', () => count(dockClosedFindings('head', closedGeoFx({ stack: { ...closedGeoFx().stack, docked: true, position: 'static' } }), 16, '700')), 2],
    ['11d a stack that moved off the corner is caught twice', () => count(dockClosedFindings('head', closedGeoFx({ stack: { ...closedGeoFx().stack, gapRight: 24, gapBottom: 0 } }), 16, '700')), 2],
    ['11d a stack that left --z-toast is caught', () => count(dockClosedFindings('head', closedGeoFx({ stack: { ...closedGeoFx().stack, zIndex: 'auto' } }), 16, '700')), 1],
    ['11d a sheet still open in the closed reading is caught', () => count(dockClosedFindings('head', closedGeoFx({ sheet: rct(24, 130, 480, 1180) }), 16, '700')), 1],
    ['11d an unresolved --space-6 is caught once, not twice', () => count(dockClosedFindings('head', closedGeoFx(), null, '700')), 1],
    ['11d four clean dismissals pass, the hidden toast coming back included', () => dockDismissFindings('head', [
      { press: 1, before: 4, after: 3, drawn: 3, stackDrawn: true, clicked: true, why: '' },
      { press: 2, before: 3, after: 2, drawn: 2, stackDrawn: true, clicked: true, why: '' },
      { press: 3, before: 2, after: 1, drawn: 1, stackDrawn: true, clicked: true, why: '' },
      { press: 4, before: 1, after: 0, drawn: 0, stackDrawn: false, clicked: true, why: '' }
    ]), []],
    ['11d an × that dismissed nothing is caught twice', () => count(dockDismissFindings('head', [{ press: 1, before: 4, after: 4, drawn: 3, stackDrawn: true, clicked: true, why: '' }])), 2],
    ['11d an × that would not take a click is caught three ways', () => count(dockDismissFindings('head', [{ press: 1, before: 1, after: 1, drawn: 1, stackDrawn: true, clicked: false, why: 'nothing drawn' }])), 3],
    ['11d a .toasts left in the document over an empty queue is caught', () => count(dockDismissFindings('head', [{ press: 1, before: 1, after: 0, drawn: 0, stackDrawn: true, clicked: true, why: '' }])), 1],
    ['11d nothing dismissed at all is caught', () => count(dockDismissFindings('head', [])), 1],
    ['7 exactly the live rows, then none', () => selectAllFindings(['a', 'b'], ['b', 'a'], []), []],
    ['7 an ended row checked by select-all is caught', () => count(selectAllFindings(['a'], ['a', 'e'], [])), 1],
    ['7 a second click that keeps a row is caught', () => count(selectAllFindings(['a'], ['a'], ['a'])), 1],
    ['8 two named, one already ended', () => batchCountFindings('8', batch({}), ['a', 'b'], '1 already ended'), []],
    ['8 the heading counts what is named', () => count(batchCountFindings('8', batch({ heading: 'End 3 running sessions?' }), ['a', 'b'], '1 already ended')), 1],
    ['8 one named is singular', () => batchCountFindings('8', batch({ heading: 'End 1 running session?', targets: [{ id: 'a' }], skipped: null }), ['a'], null), []],
    ['8 an extra named id is caught', () => count(batchCountFindings('8', batch({}), ['a'], '1 already ended')) >= 1, true],
    ['8 no panel is a finding', () => count(batchCountFindings('8', null, ['a'], null)), 1],
    ['10 a clean row', () => matrixFindings(mrow({})), []],
    ['10 a split group is caught', () => count(matrixFindings(mrow({ groupDrawn: 'app' }))), 1],
    ['10 a menu that differs from the policy is caught', () => count(matrixFindings(mrow({ menuSheet: [] }))), 1],
    ['10 an unknown row with End enabled is caught', () => count(matrixFindings(mrow({ status: 'unknown', stateWant: 'idle', eligibility: 'unreachable' }))), 1],
    ['10 an ended row whose button says End is caught', () => count(matrixFindings(mrow({ status: 'exited', eligibility: 'ended' }))), 1],
    ['10 a Past row with a checkbox is caught', () => count(matrixFindings(mrow({ tab: 'past', status: 'discarded', primary: { verb: 'restore', disabled: false, title: null, text: 'Restore' } }))), 1],
    ['arms: empty means all', () => chooseArms('').arms.length, ALL_ARMS.length],
    ['arms: a subset keeps the file\'s order', () => chooseArms('r, 3, 1'), { arms: ['1', '3', 'R'], bad: [] }],
    ['arms: an unknown name is named', () => chooseArms('1,z'), { arms: ['1'], bad: ['Z'] }],
    ['stale: a source newer than the build is refused', () => staleSentence([['a.ts', 3000]], ['index-x.js', 2000]), 'out/ is older than a.ts; build first.'],
    ['stale: a build newer than every source is measured', () => staleSentence([['a.ts', 1000]], ['index-x.js', 2000]), null],
    ['stale: no bundle is a refusal', () => staleSentence([['a.ts', 1000]], null), 'out/renderer/assets holds no index-*.js; build first.']
  ];
  let ok = true;
  for (const [label, run, want] of fixtures) {
    let got;
    try {
      got = run();
    } catch (err) {
      got = `THREW ${err instanceof Error ? err.message : String(err)}`;
    }
    const good = J(got) === J(want);
    ok = ok && good;
    say(`${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)} want ${J(want)}`);
  }
  say(ok ? `self-test PASS: ${String(fixtures.length)} fixtures behaved` : 'self-test FAIL');
  return ok;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals
// ---------------------------------------------------------------------------
const refuse = (why) => {
  console.error(`${TAG} REFUSED. ${why}`);
  process.exit(2);
};
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p293`, which wraps this file in build/harness-socket.mjs.');
refuseRealSockets(socket, 'p293');
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run it through build/harness-socket.mjs.');
// PHASE 298. The checkout the Electron will actually run. `P293_PARENT_CHECKOUT`
// points the SAME run at Phase 293's HEAD (f6c11f57), which is the parent-commit
// measurement CLAUDE.md makes mandatory here because the operator reported the
// rows himself. One Electron at a time and never both at once.
const parentCheckout = (process.env['P293_PARENT_CHECKOUT'] ?? '').trim();
const appRoot = parentCheckout === '' ? REPO : resolve(parentCheckout);
/** Which column of GEOM and of the state table this run is graded against. */
const BASE = parentCheckout === '' ? 'head' : 'parent';
if (parentCheckout !== '' && !existsSync(appRoot)) refuse(`P293_PARENT_CHECKOUT names ${appRoot}, which is not there.`);
if (!existsSync(join(appRoot, 'out', 'main', 'index.js'))) refuse(`${join(appRoot, 'out/main/index.js')} is missing. Build there first.`);
{
  const stale = readStaleness(appRoot);
  if (stale !== null) refuse(stale);
}
const { arms: chosen, bad: badArms } = chooseArms(process.env['P293_ARMS']);
if (badArms.length > 0) refuse(`P293_ARMS names ${badArms.join(', ')}; the arms are ${ALL_ARMS.join(', ')}.`);
const outDir = resolve(REPO, (process.env['P293_OUT_DIR'] ?? '').trim() || join('out', 'p293'));
mkdirSync(outDir, { recursive: true });
const on = (arm) => chosen.includes(arm);

// PHASE 298 FIX ROUND. `P293_HIT_PARENT` names a PARENT run's readings.json, and
// the hit-area floors are raised to whatever it measured for the same role key.
// It is how the refusal is asserted about EVERY control rather than about the
// seven whose numbers are pinned in HIT_PARENT, and it may only RAISE a floor
// (see `parentTable`), so a file can never relax the promise it exists to prove.
// Absent, the pinned table alone is the floor and `hitNotes` says which controls
// were therefore not asserted about.
const hitParentPath = (process.env['P293_HIT_PARENT'] ?? '').trim();
let hitParentFile = null;
let hitParentFrom = null;
if (hitParentPath !== '') {
  const at = resolve(hitParentPath);
  if (!existsSync(at)) refuse(`P293_HIT_PARENT names ${at}, which is not there.`);
  let parsed = null;
  try {
    parsed = JSON.parse(readFileSync(at, 'utf8'));
  } catch (err) {
    refuse(`P293_HIT_PARENT names ${at}, which is not JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const rows = parsed?.readings?.p298?.targets ?? null;
  if (!Array.isArray(rows) || rows.length === 0) {
    refuse(`P293_HIT_PARENT names ${at}, which holds no readings.p298.targets. Run arm 11 with P293_PARENT_CHECKOUT first.`);
  }
  if ((parsed?.readings?.p298?.base ?? '') !== 'parent') {
    refuse(`P293_HIT_PARENT names ${at}, whose readings.p298.base is ${J(parsed?.readings?.p298?.base ?? null)}. Only a PARENT run's readings may raise a parent floor.`);
  }
  hitParentFile = rows;
  hitParentFrom = at;
  say(`the hit-area floors are raised by the parent run's own ${String(rows.length)} reading(s) from ${at}`);
}

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p293'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p293'));
const home = join(root, 'h');
const profile = join(root, 'profile');
const configDir = join(profile, 'gmux', 'config');
// `dense` is Phase 298's own: arm 11c stands twenty one rows up in it, so the
// rows-per-sheet reading is bounded by the sheet's geometry and never by how
// many sessions the fixture happens to hold. It is created like the others and
// nothing else touches it.
const P = { alpha: join(root, 'alpha'), beta: join(root, 'beta'), gamma: join(root, 'gamma'), delta: join(root, 'delta'), far: join(root, 'far'), dbl: join(root, 'dbl'), dense: join(root, 'dense') };
for (const d of [home, profile, ...Object.values(P)]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
mkdirSync(configDir, { recursive: true });
writeFileSync(join(home, '.zshrc'), "PS1='p293 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
for (const [name, dir] of Object.entries(P)) {
  writeFileSync(join(dir, 'README.md'), `# ${name}\n`);
  const git = (...a) => {
    const r = spawnSync('git', ['-C', dir, ...a], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
    });
    if (r.status !== 0) throw new Error(`git ${a.join(' ')} in ${name}: ${r.stderr}`);
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'p293@example.invalid');
  git('config', 'user.name', 'p293');
  git('config', 'commit.gpgsign', 'false');
  git('add', '.');
  git('commit', '-q', '-m', 'first');
}

// The scratch machine, only when the R arm is chosen. Every pid is recorded
// as it starts and only recorded pids are ever signalled.
const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};
let machine = null;
let yard = null;
const MACHINE_ID = 'p293';
if (on('R')) {
  yard = scratchYard({ root, prefix: 'p293', record });
  if (yard.authSock === '') refuse('no ssh agent holds this run\'s key, so nothing could sign in to the scratch machine.');
  machine = scratchMachine(yard, { id: 'one', port: 41_000 + (process.pid % 2000) });
}

// ---------------------------------------------------------------------------
// The DevTools side
// ---------------------------------------------------------------------------
async function cdpForAppWindow(profileDir, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      port = 0;
    }
    if (port > 0) {
      let list = [];
      try {
        list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl);
          const a = await cdpEval(cdp, `typeof window.__p293 === 'object' ? location.href : null`, 5000);
          if (typeof a === 'string') return cdp;
          cdp.close();
        } catch {
          try {
            cdp?.close();
          } catch {
            /* already closed */
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window carrying window.__p293');
    await sleep(250);
  }
}

const KEYS = { Tab: [9, 'Tab'], Escape: [27, 'Escape'], Enter: [13, 'Enter'], F2: [113, 'F2'], j: [74, 'KeyJ'] };
/** A REAL key, down and up, to whatever holds the keyboard. `modifiers` 4 is ⌘. */
async function pressKey(cdp, name, modifiers = 0) {
  const [vk, code] = KEYS[name];
  const base = { key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  const text = name === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {};
  await cdp.call('Input.dispatchKeyEvent', { type: name === 'Enter' ? 'keyDown' : 'rawKeyDown', ...base, ...text });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(150);
}
/** Lowercase letters, one real key each, carrying their text. */
async function typeText(cdp, text) {
  for (const ch of text) {
    const vk = ch.toUpperCase().charCodeAt(0);
    const base = { key: ch, code: `Key${ch.toUpperCase()}`, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, ...base });
    await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  await sleep(120);
}
/** A REAL click at the centre of the first element a selector names. */
async function click(cdp, selector, settleMs = 250) {
  const box = await cdpEval(
    cdp,
    `(() => { const el = document.querySelector(${J(selector)}); if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.left + b.width / 2, y: b.top + b.height / 2, disabled: el.disabled === true } : null; })()`,
    10_000
  );
  if (box === null) return { ok: false, why: `nothing drawn at ${selector}` };
  if (box.disabled) return { ok: false, why: `${selector} is disabled` };
  const m = (type, extra) => cdp.call('Input.dispatchMouseEvent', { type, x: Math.round(box.x), y: Math.round(box.y), ...extra });
  await m('mouseMoved', { button: 'none', buttons: 0 });
  await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
  await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
  if (settleMs > 0) await sleep(settleMs);
  return { ok: true, why: '' };
}
/** A native select's value, chosen the one way a probe can, and its change dispatched. */
const choose = (cdp, selector, value) =>
  cdpEval(
    cdp,
    `(() => { const el = document.querySelector(${J(selector)}); if (!el) return false; el.value = ${J(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value === ${J(value)}; })()`,
    10_000
  );
const d = (cdp, call) => cdpEval(cdp, `window.__p293.${call}`, 120_000);
const state = (cdp) => d(cdp, 'state()');
/** Poll the drive's state until a predicate holds, and answer the last state read. */
async function until(cdp, pred, timeoutMs = 10_000) {
  const started = Date.now();
  let s = await state(cdp);
  while (!pred(s)) {
    if (Date.now() - started > timeoutMs) return { s, ok: false };
    await sleep(150);
    s = await state(cdp);
  }
  return { s, ok: true };
}
const rowIn = (s, id) => s.rows.find((r) => r.id === id);
const checkedIds = (s) => s.rows.filter((r) => r.checked).map((r) => r.id);
const LIVE = new Set(['running', 'idle', 'needs_input']);

// ---------------------------------------------------------------------------
// PHASE 298. Arm 11's readers, installed on `window.__p298` ONCE.
//
// They live here and NOT in src/renderer/app/p293-session-manager-drive.ts,
// which is in no builder's file set this phase: the drive supplies only what a
// probe cannot do from outside, and reading a rectangle out of the document is
// not that. Nothing here changes a session, presses a verb or writes a setting.
// Every reading is a `getBoundingClientRect` or a `getComputedStyle`.
//
// The one thing that touches the DOM is the clipping attack, which puts a long
// string into a text node, reads the layout and puts the original text back in
// the same synchronous turn, and the skeleton reading, which plants a
// `.sm-loading` inside the sheet's own subtree because the real one is a
// transient the sheet draws only while the Past tab first loads. Both are
// measurements of the shipping cascade rather than of a copy of it.
//
// Written with no template literals, because this whole script is itself
// interpolated into one.
// ---------------------------------------------------------------------------
// `__PALETTE_TOKENS__` is the ONE interpolation, filled from the module's own
// `PALETTE_TOKENS` at the install call below, so the base-telling tokens are
// written down once and the reader cannot drift from the grader.
const P298_READERS = String.raw`
(() => {
  const PALETTE_TOKENS = __PALETTE_TOKENS__;
  const ELLIPSIS_ALLOWED = __ELLIPSIS_ALLOWED__;
  const SHEET = '.modal.session-sheet';
  const sheet = () => document.querySelector(SHEET);
  const scope = () => sheet();
  const scroller = () => { const s = sheet(); return s === null ? null : s.querySelector('.sm-scroll'); };
  const hOf = (el) => (el === null ? null : el.getBoundingClientRect().height);
  const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, left: b.left, width: b.width, height: b.height, bottom: b.bottom, right: b.right }; };
  const q = (sel) => { const s = sheet(); return s === null ? null : s.querySelector(sel); };
  const all = (sel) => { const s = sheet(); return s === null ? [] : Array.prototype.slice.call(s.querySelectorAll(sel)); };
  const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : n);

  /* The distance between the tops of ADJACENT rows, which is the pitch. Only
     siblings that both match are counted, so a group header between two runs
     never enters the number, and the whole set is reported beside it. */
  const pitchOf = (sel) => {
    const rows = all(sel);
    const gaps = [];
    for (const el of rows) {
      const next = el.nextElementSibling;
      if (next === null || !next.matches(sel)) continue;
      gaps.push(round(next.getBoundingClientRect().top - el.getBoundingClientRect().top));
    }
    if (gaps.length === 0) return { pitch: null, gaps: [] };
    const sorted = gaps.slice().sort((a, b) => a - b);
    return { pitch: sorted[Math.floor(sorted.length / 2)], gaps: sorted };
  };

  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t;
  };
  const pureText = (el) => {
    if (el.childNodes.length === 0) return false;
    for (const n of el.childNodes) if (n.nodeType !== 3) return false;
    return ownText(el).trim() !== '';
  };
  /* A stable name for one element, so a SET of kinds can be counted and a
     finding can be read by a person. State classes are dropped, because a
     hovered row and a resting one are not two kinds. */
  const kindOf = (el) => {
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter((c) => c !== '' && c !== 'checked' && c !== 'sm-row-open');
    const host = el.closest('[class*="sm-"]');
    const hostCls = host === null || host === el ? '' : (host.getAttribute('class') || '').split(/\s+/)[0];
    return el.tagName.toLowerCase() + (cls.length > 0 ? '.' + cls.join('.') : '') + (hostCls === '' ? '' : ' in .' + hostCls);
  };
  /* One computed colour as numbers, or null. Chromium serialises a computed
     background as 'rgb(r, g, b)' or 'rgba(r, g, b, a)'; the split takes commas,
     spaces and the slash so a newer serialisation ('rgb(0 0 0 / 0.5)') reads the
     same rather than silently becoming unparseable. */
  const parseColor = (text) => {
    const raw = String(text === null || text === undefined ? '' : text).trim();
    // String.match and NOT a regex literal's own .exec: the list in
    // gate:background names exec, and it reads a call by NAME, so a regex's
    // .exec is taken for child_process.exec and the gate goes red naming a
    // child that does not exist. That blind spot is real and is queued as its
    // own entry; this file simply does not hand the gate the shape.
    const m = raw.match(/^rgba?\(([^)]*)\)$/i);
    if (m === null) return null;
    const parts = m[1].split(/[,/\s]+/).filter((x) => x !== '').map((x) => parseFloat(x));
    if (parts.length < 3) return null;
    const a = parts.length > 3 ? parts[3] : 1;
    for (const n of [parts[0], parts[1], parts[2], a]) if (!isFinite(n)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: a };
  };

  /* PHASE 298 FIX ROUND, SECOND PASS. THE GROUND UNDER ONE TEXT NODE, COMPOSITED.
     ------------------------------------------------------------------------
     This replaced a reader that returned the FIRST background that was not fully
     transparent and called it the ground. In the selection toolbar that is
     '--accent-wash', rgba(77, 157, 232, 0.14) (session-manager.css:352-354), and
     a WCAG ratio computed against a 14 percent wash is a number about a render
     that cannot happen: the build round printed 1.11:1 where the Phase 298 verify
     measured 5.38:1 dark and 6.27:1 light for the worst real pair.

     So the walk COLLECTS every painted layer from the text outward and stops at
     the first OPAQUE one, then blends the translucent layers back down onto it
     source-over, bottom layer first: out = src * a + dst * (1 - a). 'html' and
     'body' both carry '--bg-canvas' (globals.css:17-22, :55-57) and '.modal'
     carries '--bg-surface', so an opaque ground is always there in this app and
     the refusal below should never fire — which is the point of writing it as a
     refusal rather than as a lowered expectation.

     IT REPORTS BOTH. 'bgGround' is the opaque token value, which is what can name
     a base, and 'bg' is the composite, which is what a ratio may be computed
     against. A background IMAGE anywhere in the stack is not one colour and
     cannot be blended into one, so that case refuses too. */
  const groundOf = (el) => {
    const layers = [];
    let imaged = null;
    let at = el;
    while (at !== null) {
      const cs = getComputedStyle(at);
      const img = cs.backgroundImage;
      if (imaged === null && img !== undefined && img !== '' && img !== 'none') imaged = kindOf(at) + ' paints ' + img;
      const c = parseColor(cs.backgroundColor);
      if (c !== null && c.a > 0) {
        layers.push({ what: kindOf(at), color: cs.backgroundColor, alpha: c.a });
        if (c.a >= 1) break;
      }
      at = at.parentElement;
    }
    const deepest = layers.length === 0 ? null : layers[layers.length - 1];
    const fail = (why) => ({ bg: null, bgGround: deepest === null ? null : deepest.color, layers: layers, composited: false, why: why });
    if (deepest === null) return fail('nothing between this text and the document root paints a background at all, so there is no ground to measure against');
    if (deepest.alpha < 1) return fail('every background above this text is translucent and the walk reached the document root without an opaque one, so there is nothing to composite onto');
    if (imaged !== null) return fail('a background IMAGE is painted in this stack (' + imaged + ') and an image is not one colour, so it cannot be composited into one');
    let out = parseColor(deepest.color);
    for (let i = layers.length - 2; i >= 0; i -= 1) {
      const over = parseColor(layers[i].color);
      if (over === null) return fail('the layer ' + layers[i].what + ' computes ' + layers[i].color + ', which this reader could not parse as a colour');
      out = {
        r: over.r * over.a + out.r * (1 - over.a),
        g: over.g * over.a + out.g * (1 - over.a),
        b: over.b * over.a + out.b * (1 - over.a),
        a: 1
      };
    }
    const bg = 'rgb(' + Math.round(out.r) + ', ' + Math.round(out.g) + ', ' + Math.round(out.b) + ')';
    return { bg: bg, bgGround: deepest.color, layers: layers, composited: true, why: null };
  };
  const disabledBy = (el) => {
    const off = el.closest('[disabled],[aria-disabled="true"]');
    return off === null ? null : "a disabled control's label: " + kindOf(off);
  };
  /* Does anything between this element and the scroller CLIP it? An element
     whose own box grew is not clipped, and the naive per-element
     scrollWidth <= clientWidth + 1 cannot see an ancestor that is. The
     scroller itself is allowed to overflow: scrolling sideways IS the promise. */
  const clipperOf = (el) => {
    const stop = scroller();
    let at = el;
    while (at !== null && at !== stop && at !== document.body) {
      if (at.scrollWidth > at.clientWidth + 1 && getComputedStyle(at).overflowX !== 'visible') return kindOf(at);
      at = at.parentElement;
    }
    return null;
  };
  const declaresEllipsis = (el) => {
    const cs = getComputedStyle(el);
    return cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible';
  };
  const titleHolding = (el) => {
    const text = ownText(el).trim();
    let at = el;
    while (at !== null && at !== document.body) {
      const t = at.getAttribute('title');
      if (t !== null && t.indexOf(text) >= 0) return true;
      at = at.parentElement;
    }
    return false;
  };
  /* WHAT IS NOT A TEXT NODE OF THIS SURFACE, and each exclusion is a reason.
     A native select's options are drawn by the platform and never by the
     cascade. A '.sr-only' label is DELIBERATELY clipped to one pixel for a
     screen reader, so it is neither a clipping defect nor a contrast pair. A box
     with no area draws nothing at all. */
  const SKIP_TAGS = ['select', 'option', 'optgroup', 'textarea', 'script', 'style', 'title'];
  const textElements = () => all('*').filter((el) => {
    if (SKIP_TAGS.indexOf(el.tagName.toLowerCase()) >= 0) return false;
    if (el.closest('.sr-only') !== null) return false;
    if (ownText(el).trim() === '') return false;
    const b = el.getBoundingClientRect();
    return b.width >= 1 && b.height >= 1;
  });

  window.__p298 = {
    sheetHeight: () => hOf(sheet()),
    scrollerHeight: () => hOf(scroller()),
    innerHeight: () => window.innerHeight,
    /* Is the pointer on a row right now? A resting reading taken while a row is
       hovered would read the hover fill and call it the rest. */
    rowHovered: () => q('tr.sm-row:hover') !== null || q('.sm-past-row:hover') !== null,

    /* 11a. The boxes and pitches this tab can answer. A key the tab cannot draw
       answers null and the arm's own key list decides whether that is a
       finding. */
    boxes: () => {
      const s = sheet();
      if (s === null) return null;
      const managed = pitchOf('tr.sm-row');
      const past = pitchOf('.sm-past-row');
      return {
        rowBox: round(hOf(q('tr.sm-row'))),
        pastRowBox: round(hOf(q('.sm-past-row'))),
        headThBox: round(hOf(q('.sm-grid thead th'))),
        groupThBox: round(hOf(q('tr.sm-group > th')) ?? hOf(q('.sm-past .sm-group'))),
        footBox: round(hOf(q('[data-sm="foot"]'))),
        managedPitch: managed.pitch,
        pastPitch: past.pitch,
        managedGaps: managed.gaps,
        pastGaps: past.gaps,
        rowCount: all('tr.sm-row').length,
        pastCount: all('.sm-past-row').length
      };
    },

    /* 11a. The skeleton is a transient: SessionManagerSheet.tsx draws it only
       while the Past tab first loads and nothing is held yet, so a probe cannot
       catch it reliably. One is planted inside the sheet's own subtree instead
       and the SHIPPING cascade is what sizes it. Two rows, so the gap is read
       as a pitch as well as a box.

       IT IS PLANTED IN '.sm-scroll', which is where the real one lives and
       which is a BLOCK container. '.sm-panel' is a flex column, where the
       wrapper's default 'flex: 0 1 auto' would let it shrink when the panel is
       out of room and the reading would be short by however much. */
    plantSkeleton: () => {
      const host = q('.sm-scroll') ?? q('.sm-panel') ?? sheet();
      if (host === null) return null;
      const wrap = document.createElement('div');
      wrap.className = 'sm-loading';
      wrap.setAttribute('data-p298', 'planted');
      for (let i = 0; i < 2; i += 1) {
        const one = document.createElement('div');
        one.className = 'sm-skeleton';
        wrap.appendChild(one);
      }
      host.appendChild(wrap);
      const rows = Array.prototype.slice.call(wrap.querySelectorAll('.sm-skeleton'));
      const out = {
        skeletonBox: rows.length === 0 ? null : round(rows[0].getBoundingClientRect().height),
        skeletonPitch: rows.length < 2 ? null : round(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top),
        loadingGap: getComputedStyle(wrap).rowGap
      };
      wrap.remove();
      return out;
    },

    /* 11a. EVERY INTERACTIVE TARGET IN THE SHEET, BY ROLE.
       ------------------------------------------------------------------------
       THIS REPLACED A READER THAT MEASURED ONE. The build round asked
       q('[data-manage-check]'), an attribute only the body row's checkbox carries
       (ManagedGrid.tsx:357), while the entry promises "no hit area smaller than
       today" about all of them. The select-all, the row's NAME button and a
       column's SORT button were never measured, and all three shrank.

       WHAT COUNTS AS A TARGET is its ROLE and never a list: a native button,
       input, select, textarea or link; an element carrying an explicitly
       interactive ARIA role; or an element with a non-negative tabindex. The
       sheet's own root is role="dialog" with tabIndex={-1}
       (SessionManagerSheet.tsx:444-447), so the negative tabindex is what keeps
       the dialog itself out. A control added by a later round is measured because
       it is a control.

       THE CHECK TARGET IS THE LABEL AROUND THE INPUT, which is what a finger
       lands on: a form control inside a label answers the label's rect and the
       label's own role key carries the control's, so the heading's select-all and
       a body row's checkbox can never collapse into one reading.

       THE ROLE KEY collapses instances and no values: the tag, the input type, the
       id, the SORTED class list and the NAMES of the data attributes. A session
       UUID in an id or a class is rewritten to <id> so a per-session control has
       one key across runs. State classes are dropped, because a checked row and a
       resting one are not two roles.

       The row and cell heights ride along, because the arithmetic of the one
       admitted exception is "every reachable pixel of its own row" and a reading
       that cannot show the row cannot show that. */
    targets: () => {
      const s = sheet();
      if (s === null) return null;
      const NATIVE = ['button', 'input', 'select', 'textarea'];
      const ROLES = ['button', 'tab', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'link', 'slider', 'spinbutton', 'searchbox', 'textbox', 'combobox'];
      const STATE_CLASSES = ['checked', 'sm-row-open', 'open', 'active', 'selected', 'busy', 'is-open', 'past-restore'];
      const noIds = (text) => String(text).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>');
      const isTarget = (el) => {
        const tag = el.tagName.toLowerCase();
        if (NATIVE.indexOf(tag) >= 0) return true;
        if (tag === 'a' && el.getAttribute('href') !== null) return true;
        if (el.getAttribute('contenteditable') === 'true') return true;
        const role = el.getAttribute('role');
        if (role !== null && ROLES.indexOf(role) >= 0) return true;
        const ti = el.getAttribute('tabindex');
        if (ti === null) return false;
        const n = parseInt(ti, 10);
        return isFinite(n) && n >= 0;
      };
      const sigOf = (el) => {
        const tag = el.tagName.toLowerCase();
        const type = tag === 'input' ? '[type=' + (el.getAttribute('type') || 'text') + ']' : '';
        const id = el.getAttribute('id');
        const idPart = id === null || id === '' ? '' : '#' + noIds(id);
        const cls = (el.getAttribute('class') || '')
          .split(/\s+/)
          .filter((c) => c !== '' && STATE_CLASSES.indexOf(c) < 0)
          .map((c) => noIds(c))
          .sort();
        const data = [];
        for (const a of Array.prototype.slice.call(el.attributes)) {
          if (a.name.indexOf('data-') === 0) data.push(a.name);
        }
        data.sort();
        return tag + type + idPart + cls.map((c) => '.' + c).join('') + data.map((n) => '[' + n + ']').join('');
      };
      const label = (el) => {
        const text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
        return noIds(text).replace(/\s+/g, ' ').slice(0, 40);
      };
      const out = [];
      const done = [];
      for (const el of all('*')) {
        if (!isTarget(el)) continue;
        if (el.closest('.sr-only') !== null) continue;
        /* The label around a form control IS the target, and the control itself
           is then not a second one. */
        const tag = el.tagName.toLowerCase();
        const wrap = NATIVE.indexOf(tag) >= 0 && tag !== 'button' ? el.closest('label') : null;
        const target = wrap !== null && s.contains(wrap) ? wrap : el;
        if (done.indexOf(target) >= 0) continue;
        const b = box(target);
        if (b.width < 1 || b.height < 1) continue;
        done.push(target);
        const key = target === el ? sigOf(el) : sigOf(target) + ' > ' + sigOf(el);
        const cell = el.closest('td,th');
        const tr = el.closest('tr');
        out.push({
          key: key,
          what: key + (label(el) === '' ? '' : ' (' + label(el) + ')'),
          width: round(b.width),
          height: round(b.height),
          disabled: el.matches('[disabled],[aria-disabled="true"]'),
          cellHeight: cell === null ? null : round(cell.getBoundingClientRect().height),
          rowHeight: tr === null ? null : round(tr.getBoundingClientRect().height)
        });
      }
      return out;
    },

    /* The tokens' own RESOLVED values, read the same way the readings are, so a
       token whose value moves moves the expectation with it and no literal
       colour or duration is ever written down. */
    tokens: () => {
      const probe = document.createElement('div');
      probe.setAttribute('data-p298', 'token-probe');
      document.body.appendChild(probe);
      const read = (css, prop) => {
        probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;' + css;
        return getComputedStyle(probe)[prop];
      };
      const out = {
        transparent: 'rgba(0, 0, 0, 0)',
        bgRaised: read('background: var(--bg-raised)', 'backgroundColor'),
        bgActive: read('background: var(--bg-active)', 'backgroundColor'),
        borderActive: read('border-bottom: 1px solid var(--border-active)', 'borderBottomColor'),
        focusRing: read('box-shadow: var(--focus-ring)', 'boxShadow'),
        durFast: read('transition: background var(--dur-fast) var(--ease-out)', 'transitionDuration'),
        easeOut: read('transition: background var(--dur-fast) var(--ease-out)', 'transitionTimingFunction')
      };
      probe.remove();
      return out;
    },

    /* One element's computed interaction state. */
    computedAt: (sel) => {
      const el = q(sel);
      if (el === null) return null;
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        borderBottom: cs.borderBottomColor,
        boxShadow: cs.boxShadow,
        property: cs.transitionProperty,
        duration: cs.transitionDuration,
        timing: cs.transitionTimingFunction,
        color: cs.color,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight
      };
    },

    /* Focus one control and read the ring. ':focus-visible' is reported rather
       than assumed: a programmatic focus only matches it when the last
       interaction was a keyboard one, so a reading with 'visible: false' is a
       finding about the PROBE and never a claim about the ring. */
    focusAndRead: (sel, last) => {
      const els = all(sel);
      const el = last ? (els[els.length - 1] ?? null) : (els[0] ?? null);
      if (el === null) return null;
      el.focus();
      const cs = getComputedStyle(el);
      return { boxShadow: cs.boxShadow, visible: el.matches(':focus-visible'), active: document.activeElement === el, what: kindOf(el) };
    },

    /* Every icon in the sheet. A codicon's size is its font size (the vendor
       sheet's own 'font: normal normal normal 16px/1 codicon'); an AgentIcon is
       a 'span.gmux-icon' whose width and height are set inline. */
    icons: () => {
      const out = [];
      for (const el of all('.codicon')) {
        out.push({ what: 'codicon ' + kindOf(el), px: Math.round(parseFloat(getComputedStyle(el).fontSize)) });
      }
      for (const el of all('.gmux-icon')) {
        const cs = getComputedStyle(el);
        const w = Math.round(parseFloat(cs.width));
        const h = Math.round(parseFloat(cs.height));
        out.push({ what: 'AgentIcon wrapper ' + kindOf(el), px: w, height: h });
      }
      return { sizes: out };
    },

    /* '--sm-name-min', MEASURED. Canvas measureText with the live element's own
       computed font, over the run's own session names AND the operator's twelve,
       taking the first 'chars' characters of each — the method app.css:198-220
       records for the 46px floor on .ptab-name, where four characters is both
       the shortest prefix that reads as a word and the shortest that tells his
       twelve apart. */
    nameMin: (corpus, chars) => {
      const el = q('.sm-name strong');
      if (el === null) return null;
      const cs = getComputedStyle(el);
      const font = cs.font !== '' ? cs.font : cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = font;
      const drawn = all('.sm-name strong').map((n) => n.textContent || '');
      const names = [];
      for (const n of drawn.concat(corpus)) if (n !== '' && names.indexOf(n) < 0) names.push(n);
      const per = names.map((n) => ({ name: n, prefix: round(ctx.measureText(n.slice(0, chars)).width) }));
      const ellipsis = round(ctx.measureText('…').width);
      let widest = 0;
      let by = '';
      for (const p of per) if (p.prefix > widest) { widest = p.prefix; by = p.name; }
      return { font, ellipsis, widest: round(widest), by, per, measured: round(widest + ellipsis) };
    },

    /* '--sm-actions-min', re-derived from what the cell actually HOLDS.
       ----------------------------------------------------------------------
       It is measured across the block's CHILDREN and never from the block
       itself: '.sm-row-actions' is a block inside a 'td' that 'table-layout:
       auto' has already made wider than its content, so its own
       'getBoundingClientRect().width' and its 'scrollWidth' both answer the
       COLUMN's width and not the buttons'. The rightmost child's right edge
       less the leftmost child's left edge is the button, the gap and the
       ellipsis, which is what the floor is for. */
    actionsMin: () => {
      const rows = all('.sm-row-actions');
      if (rows.length === 0) return null;
      let widest = 0;
      let parts = 0;
      for (const el of rows) {
        const kids = Array.prototype.slice.call(el.children);
        if (kids.length === 0) continue;
        let left = Infinity;
        let right = -Infinity;
        for (const kid of kids) {
          const b = kid.getBoundingClientRect();
          if (b.width === 0 && b.height === 0) continue;
          left = Math.min(left, b.left);
          right = Math.max(right, b.right);
        }
        if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
        if (right - left > widest) { widest = right - left; parts = kids.length; }
      }
      return widest === 0 ? null : { measured: round(widest), of: rows.length, parts: parts };
    },

    /* What the stylesheet DECLARES for one custom property on the sheet, or null
       when it declares nothing, which is what the parent answers. */
    declaredPx: (prop) => {
      const s = sheet();
      if (s === null) return null;
      const raw = getComputedStyle(s).getPropertyValue(prop).trim();
      if (raw === '') return null;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? round(n) : null;
    },

    /* No stylesheet rule may key on prefers-color-scheme: the theme flips by the
       data-scheme attribute alone, and that is what lets ONE Electron read both
       bases. A sheet a different origin blocks is counted as unreadable rather
       than as clean. */
    colorSchemeQueries: () => {
      let hits = 0;
      let unreadable = 0;
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.media !== undefined && String(rule.media.mediaText).indexOf('prefers-color-scheme') >= 0) hits += 1;
          if (rule.cssRules !== undefined && rule.cssRules !== null) {
            try { walk(rule.cssRules); } catch (e) { unreadable += 1; }
          }
        }
      };
      for (const s of Array.prototype.slice.call(document.styleSheets)) {
        try { walk(s.cssRules); } catch (e) { unreadable += 1; }
      }
      return { hits: hits, unreadable: unreadable };
    },

    /* Rows WHOLLY inside the scroller's rect, scrolled to the top. The sticky
       heading and the group header take the top of the scroller, so this reading
       is exactly the arithmetic the entry states and refutes it if it is wrong. */
    rowsInside: (sel) => {
      const s = scroller();
      if (s === null) return null;
      s.scrollTop = 0;
      const rect = s.getBoundingClientRect();
      let n = 0;
      for (const el of all(sel)) {
        const b = el.getBoundingClientRect();
        if (b.top >= rect.top - 0.5 && b.bottom <= rect.bottom + 0.5) n += 1;
      }
      return { inside: n, drawn: all(sel).length, scroller: round(rect.height), scrollTop: s.scrollTop };
    },

    /* Is anything stacked in the sheet that would take height from the scroller?
       The rows-per-sheet reading is taken with no toast up, so it says so. */
    stacked: () => {
      const outlet = q('[data-sm="toast-outlet"]');
      return {
        outlet: outlet === null ? null : round(outlet.getBoundingClientRect().height),
        toasts: document.querySelectorAll('.toast').length,
        batch: q('section.sm-batch') !== null
      };
    },

    /* ------------------------------------------------------------------- 11d
       THE TOAST DOCK, READ AS RECTANGLES.

       PHASE 298 FIX ROUND, AND WHY THESE READERS EXIST. The dock is the one
       change in this phase that costs a person a CLICK today, and the arm never
       drove it: 'stacked()' above answered { outlet: 0, toasts: 0 } on every run,
       which says nothing was ever raised, so nothing was ever measured. The
       verify accepted it on a code read and said so. Everything below is a
       getBoundingClientRect, a getComputedStyle or an elementFromPoint. Nothing
       here raises a toast — the run does that through the app's own door — and
       nothing here dismisses one, because the dismissal is a real click. */

    /* One length off the ROOT, so '--space-6' is never written as 16 in this
       file. 'declaredPx' above reads the SHEET's own properties and a spacing
       token is not one of them. */
    rootPx: (prop) => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
      if (raw === '') return null;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? round(n) : null;
    },

    /* The grid scrolled to its END, which is the ONLY state in which the last
       row sits at the bottom of the scroller and a window-fixed stack can reach
       its End button. A list shorter than its scroller answers scrolls: false,
       and the arm makes that a finding rather than a pass: the parent's own
       defect would read clean over a short list, which is exactly the shape of
       promise-that-cannot-fail this fix round exists to remove. */
    scrollToEnd: () => {
      const sc = scroller();
      if (sc === null) return null;
      sc.scrollTop = sc.scrollHeight;
      return {
        scrollTop: round(sc.scrollTop),
        scrollHeight: round(sc.scrollHeight),
        clientHeight: round(sc.clientHeight),
        scrolls: sc.scrollHeight > sc.clientHeight + 1
      };
    },

    /* Stamp the newest UNSTAMPED toast, and answer every stamp in DOM order.

       WHY A STAMP AND NOT THE TEXT. Every toast this arm raises carries the same
       sentence, because the door it raises them through is one door, so the
       order cannot be read off the words. React keys each toast by its store id,
       so the node of a toast that is still visible SURVIVES the render that adds
       the next one and carries its stamp with it, while the node of the one the
       cap dropped is removed. Reading the stamps in DOM order therefore says
       which of the store's toasts are drawn and in which order, which no reading
       of the text could. The attribute is the probe's own, in the 'data-p298'
       family the skeleton reading already plants, and it changes no layout. */
    stampToast: (n) => {
      const nodes = Array.prototype.slice.call(document.querySelectorAll('.toast'));
      for (const el of nodes) {
        if (el.getAttribute('data-p298-toast') === null) {
          el.setAttribute('data-p298-toast', String(n));
          break;
        }
      }
      return nodes.map((el) => el.getAttribute('data-p298-toast'));
    },

    /* Every rectangle the dock is judged on, in one synchronous read, so no two
       numbers in it come from two layouts. */
    toastGeo: () => {
      const rbox = (el) => {
        if (el === null) return null;
        const b = el.getBoundingClientRect();
        return { top: round(b.top), left: round(b.left), width: round(b.width), height: round(b.height), bottom: round(b.bottom), right: round(b.right) };
      };
      /* THE INTERSECTION RECTANGLE, and an EMPTY one is empty on both axes. The
         first form of this reader reported the x overlap on its own when the y
         spans missed, so a stack that reaches the End button's column but not
         its rows read "121 wide, 0 tall" — a number that says the wrong thing in
         a finding. Two boxes that do not intersect share no rectangle at all. */
      const overlap = (a, b) => {
        if (a === null || b === null) return null;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w <= 0 || h <= 0) return { width: 0, height: 0, area: 0 };
        return { width: round(w), height: round(h), area: round(w * h) };
      };
      const within = (a, b) => (a === null || b === null ? null : a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5 && a.left >= b.left - 0.5 && a.right <= b.right + 0.5);
      /* WHAT IS AT THIS POINT. The honest hit test, and the reason the arm never
         clicks the End button to find out: a click that landed would end a
         person's session, so the question is asked of the layout instead. */
      const hitAt = (b) => {
        if (b === null) return null;
        const el = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
        if (el === null) return { desc: 'nothing', inToasts: false, inPrimary: false, inDismiss: false };
        return {
          desc: kindOf(el),
          inToasts: el.closest('.toasts') !== null,
          inPrimary: el.closest('[data-manage-primary]') !== null,
          inDismiss: el.closest('[aria-label="Dismiss"]') !== null
        };
      };
      const stack = document.querySelector('.toasts');
      const s = sheet();
      const sc = scroller();
      const footEl = q('[data-sm="foot"]');
      const outletEl = q('[data-sm="toast-outlet"]');
      const stackRect = rbox(stack);
      const sheetRect = rbox(s);
      const scRect = rbox(sc);
      const footRect = rbox(footEl);
      /* THE END BUTTON CLOSEST TO THE SHEET'S BOTTOM that is wholly inside the
         scroller's own rect. That is the one a window-fixed stack can cover and
         the one the entry measured; taking the LAST row in DOM order alone would
         answer a row that is scrolled out of sight, or none at all when the last
         row happens to draw no verb. The row it belongs to is named, so a reading
         is legible rather than silent. */
      let end = null;
      if (scRect !== null) {
        for (const el of all('tr.sm-row [data-manage-primary]')) {
          const b = rbox(el);
          if (b.width < 1 || b.height < 1) continue;
          if (b.top < scRect.top - 0.5 || b.bottom > scRect.bottom + 0.5) continue;
          if (end === null || b.bottom > end.rect.bottom) {
            const row = el.closest('tr.sm-row');
            end = {
              rect: b,
              row: row === null ? null : row.getAttribute('data-manage-row'),
              verb: el.getAttribute('data-verb'),
              text: (el.textContent || '').replace(/\s+/g, ' ').trim()
            };
          }
        }
      }
      const rows = all('tr.sm-row');
      const cs = stack === null ? null : getComputedStyle(stack);
      const toasts = Array.prototype.slice.call(document.querySelectorAll('.toast')).map((el) => {
        const x = el.querySelector('[aria-label="Dismiss"]');
        const textEl = el.querySelector('.toast-text');
        const xRect = rbox(x);
        return {
          stamp: el.getAttribute('data-p298-toast'),
          text: textEl === null ? null : (textEl.textContent || '').replace(/\s+/g, ' ').trim(),
          sticky: el.classList.contains('toast-sticky'),
          rect: rbox(el),
          insideSheet: within(rbox(el), sheetRect),
          dismiss: xRect === null ? null : { rect: xRect, hit: hitAt(xRect) }
        };
      });
      const overflowEl = document.querySelector('.toast-overflow');
      return {
        window: { width: window.innerWidth, height: window.innerHeight },
        count: toasts.length,
        stack: stack === null ? null : {
          rect: stackRect,
          docked: stack.classList.contains('toasts-docked'),
          position: cs.position,
          right: cs.right,
          bottom: cs.bottom,
          zIndex: cs.zIndex,
          gapRight: round(window.innerWidth - stackRect.right),
          gapBottom: round(window.innerHeight - stackRect.bottom),
          inOutlet: outletEl !== null && outletEl.contains(stack),
          stamps: toasts.map((one) => one.stamp)
        },
        overflow: overflowEl === null ? null : (overflowEl.textContent || '').replace(/\s+/g, ' ').trim(),
        toasts: toasts,
        sheet: sheetRect,
        scroller: sc === null ? null : {
          rect: scRect,
          scrollTop: round(sc.scrollTop),
          scrollHeight: round(sc.scrollHeight),
          clientHeight: round(sc.clientHeight),
          scrolls: sc.scrollHeight > sc.clientHeight + 1
        },
        foot: footRect,
        outlet: outletEl === null ? null : { rect: rbox(outletEl), display: getComputedStyle(outletEl).display },
        rowsDrawn: rows.length,
        lastRow: rows.length === 0 ? null : rows[rows.length - 1].getAttribute('data-manage-row'),
        end: end,
        endHit: end === null ? null : hitAt(end.rect),
        overlapEnd: end === null ? null : overlap(stackRect, end.rect),
        overlapSheet: overlap(stackRect, sheetRect),
        insideSheet: within(stackRect, sheetRect),
        belowScroller: stackRect === null || scRect === null ? null : stackRect.top >= scRect.bottom - 0.5,
        aboveFoot: stackRect === null || footRect === null ? null : stackRect.bottom <= footRect.top + 0.5,
        /* How far the stack reaches UP from the sheet's bottom edge. At the
           parent that is the entry's own table, 36 / 88 / 140 by count. */
        sheetBottomReach: stackRect === null || sheetRect === null ? null : round(Math.max(0, sheetRect.bottom - stackRect.top))
      };
    },

    /* 11b. THE CLIPPING ATTACK. Exactly three kinds may ellipsis, each carrying
       its whole value as a hover title; every other text node must widen the
       table instead, so a long honesty word is never quietly cut. */
    clipAt: (strings) => {
      const s = sheet();
      if (s === null) return null;
      /* WHICH OF THE THREE ALLOWED KINDS THIS TAB CAN EVEN HOLD. The sheet draws
         one list at a time, so the attack must say what it did not ask rather
         than fail for a clause that was never in the DOM. Asked by SELECTOR,
         which is what the stylesheet scopes the ellipsis to, and a box with no
         area counts as not drawn for the same reason textElements does. */
      const reachable = [];
      const notDrawn = [];
      for (const one of ELLIPSIS_ALLOWED) {
        const el = s.querySelector(one.selector);
        const b = el === null ? null : el.getBoundingClientRect();
        if (b !== null && b.width >= 1 && b.height >= 1) reachable.push(one.what);
        else notDrawn.push(one.what + ' (' + one.where + ')');
      }
      const els = textElements();
      const kinds = [];
      const withoutTitle = [];
      const allowed = [];
      for (const el of els) {
        if (!declaresEllipsis(el)) continue;
        allowed.push(el);
        const k = kindOf(el);
        if (kinds.indexOf(k) < 0) kinds.push(k);
        if (!titleHolding(el) && withoutTitle.indexOf(k) < 0) withoutTitle.push(k);
      }
      const clipped = [];
      let injected = 0;
      for (const el of els) {
        if (allowed.indexOf(el) >= 0) continue;
        const resting = clipperOf(el);
        if (resting !== null) clipped.push({ what: kindOf(el), by: resting, text: ownText(el).trim().slice(0, 60) });
        if (!pureText(el)) continue;
        const was = el.textContent;
        for (const text of strings) {
          el.textContent = text;
          injected += 1;
          const by = clipperOf(el);
          if (by !== null) clipped.push({ what: kindOf(el), by: by, text: text });
        }
        el.textContent = was;
      }
      return {
        width: window.innerWidth,
        sheetWidth: round(hOf(s) === null ? 0 : s.getBoundingClientRect().width),
        ellipsisKinds: kinds,
        ellipsisReachable: reachable,
        ellipsisNotDrawn: notDrawn,
        ellipsisWithoutTitle: withoutTitle,
        clipped: clipped,
        texts: els.length,
        injected: injected,
        scrollerScrollsSideways: (() => { const sc = scroller(); return sc === null ? null : sc.scrollWidth > sc.clientWidth + 1; })()
      };
    },

    /* 11a. Contrast pairs, on BOTH bases, in whatever pointer and checked state
       the caller has already set. Deduped by what-plus-pair so the bridge is
       handed tens of pairs rather than thousands. The scheme is flipped and put
       back inside this one synchronous call, so nothing races the app's own
       appearance effect.

       PHASE 298 FIX ROUND. THE FREEZE IS THE FIX FOR A MEASUREMENT BUG, and it
       must not be removed. Reading both bases in one turn works for the color
       property, which re-resolves the instant it is asked, and NOT for
       background: session-manager.css:478 (the grid's cell) and :835 (the Past
       row), globals.css:135 (.btn), :208 (.icon-btn) and :287 (.dot) all declare
       transition: background var(--dur-fast) var(--ease-out), and
       getComputedStyle on a TRANSITIONING property answers the value the
       animation is AT rather than the value it is going to. At the first frame
       after the flip that is still the OLD base's colour, so a light
       --text-primary was read over a DARK --bg-raised: eight of them at HEAD,
       all on the light base, because the window ships dark and the dark read is
       the one that flips nothing. The freeze is tokens.css:691-697's own recipe
       (Phase 200's leak fix). transition-property: none cancels a running
       transition and makes both properties snap, so the reading is the resting
       resolved colour, which is what contrast is about. It goes in BEFORE the
       first flip and comes out AFTER the scheme is put back, so no transition
       runs on the way out either. */
    pairs: (stateName) => {
      const root = document.documentElement;
      const was = root.getAttribute('data-scheme');
      const freeze = document.createElement('style');
      freeze.setAttribute('data-p298', 'freeze');
      freeze.textContent = '*, *::before, *::after { transition-property: none !important; }';
      document.head.appendChild(freeze);
      /* The BASE'S OWN resolved palette, read under the base it belongs to and
         through the same cascade the readings come from, so the refusal above can
         name which base a colour came from and no literal colour is written into
         the probe. */
      const palette = () => {
        const probe = document.createElement('div');
        probe.setAttribute('data-p298', 'palette-probe');
        document.body.appendChild(probe);
        const out = {};
        for (const token of PALETTE_TOKENS) {
          /* cssText and not the backgroundColor setter, which is the pattern the
             tokens() reader above already proves in this cascade. A token that
             resolves to nothing would come back transparent, and a transparent
             entry could not tell the bases apart, so it is left out instead. */
          probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;background: var(' + token + ')';
          const got = getComputedStyle(probe).backgroundColor;
          if (got !== 'rgba(0, 0, 0, 0)' && got !== 'transparent') out[token] = got;
        }
        probe.remove();
        return out;
      };
      const readOne = (baseName) => {
        const out = [];
        const seen = {};
        for (const el of textElements()) {
          const cs = getComputedStyle(el);
          const fg = cs.color;
          /* The ground COMPOSITED, and the opaque token value beside it. A
             translucent wash is blended down rather than handed to WCAG as if it
             were a ground; see groundOf. */
          const ground = groundOf(el);
          const what = kindOf(el);
          const key = baseName + '|' + what + '|' + fg + '|' + String(ground.bg) + '|' + String(ground.bgGround);
          if (seen[key] === true) continue;
          seen[key] = true;
          out.push({
            what: what,
            base: baseName,
            state: stateName,
            fg: fg,
            bg: ground.bg,
            bgGround: ground.bgGround,
            bgLayers: ground.layers,
            composited: ground.composited,
            why: ground.why,
            exemptBecause: disabledBy(el)
          });
        }
        return out;
      };
      /* The scheme goes back and the freeze comes out WHATEVER HAPPENED, in that
         order. A throw in the middle would otherwise leave the operator's window
         on the wrong base with every transition in the app switched off, and the
         next reading would be taken through it. */
      try {
        root.setAttribute('data-scheme', 'dark');
        const darkPalette = palette();
        const dark = readOne('dark');
        root.setAttribute('data-scheme', 'light');
        const lightPalette = palette();
        const light = readOne('light');
        return {
          shipped: was,
          rows: dark.concat(light),
          palettes: { dark: darkPalette, light: lightPalette }
        };
      } finally {
        if (was === null) root.removeAttribute('data-scheme');
        else root.setAttribute('data-scheme', was);
        freeze.remove();
      }
    }
  };
  return true;
})()
`;

/** Arm 11's one door into the readers above. */
const p = (cdp, call) => cdpEval(cdp, `window.__p298.${call}`, 120_000);

/** Move the REAL pointer, which is the only thing that sets `:hover`. */
async function movePointer(cdp, x, y) {
  await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(x), y: Math.round(y), button: 'none', buttons: 0 });
  await sleep(180);
}
/** The pointer at the centre of the first element a selector names. */
async function hoverAt(cdp, selector) {
  const at = await cdpEval(cdp, `(() => { const el = document.querySelector(${J(selector)}); if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null; })()`);
  if (at === null) return false;
  await movePointer(cdp, at.x, at.y);
  return true;
}
/** The pointer somewhere that is not a row, so a resting reading is at rest. */
const pointerAway = (cdp) => movePointer(cdp, 4, 4);

/**
 * Resize until the SHEET resolves to `wantH`. Measured rather than computed: the
 * scrim's headroom and gutter are the difference between the window and the
 * sheet, and a build that changed either would silently move the rows-per-sheet
 * reading if the arm assumed 48.
 */
async function sizeSheetTo(cdp, wantH, width) {
  let height = wantH + 48;
  let got = null;
  for (let i = 0; i < 5; i += 1) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    got = await p(cdp, 'sheetHeight()');
    if (typeof got === 'number' && Math.abs(got - wantH) <= 0.5) return { ok: true, window: height, sheet: got };
    if (typeof got !== 'number') return { ok: false, window: height, sheet: got };
    height += Math.round(wantH - got);
  }
  return { ok: false, window: height, sheet: got };
}

/**
 * The ratios, from the app's OWN `contrastOf`. One synchronous tsx that has
 * exited before this call returns; see the header. The bridge imports the helper
 * from the checkout the Electron is running, so a parent run is judged by the
 * parent's own helper.
 */
function contrastRatios(pairs) {
  try {
    return contrastRatiosOrThrow(pairs);
  } catch (err) {
    return { ratios: [], why: `the contrast bridge could not run: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function contrastRatiosOrThrow(pairs) {
  if (pairs.length === 0) return { ratios: [], why: null };
  const bridgePath = join(root, 'p298-contrast-bridge.mts');
  const pairsPath = join(root, 'p298-contrast-pairs.json');
  writeFileSync(
    bridgePath,
    [
      '// Written by build/p293/probe-p293.mjs arm 11. It imports the SHIPPING',
      '// helper rather than re-implementing WCAG contrast, so the probe cannot',
      '// disagree with the floors the theme is solved against.',
      "import { readFileSync } from 'node:fs';",
      `import { contrastOf } from ${J(join(appRoot, 'src', 'renderer', 'theme', 'hue'))};`,
      "const pairs = JSON.parse(readFileSync(process.argv[2], 'utf8'));",
      "console.log('P298_CONTRAST:' + JSON.stringify(pairs.map((one) => contrastOf(one.fg, one.bg))));",
      ''
    ].join('\n'),
    'utf8'
  );
  writeFileSync(pairsPath, `${J(pairs.map((one) => ({ fg: one.fg, bg: one.bg ?? '' })))}\n`, 'utf8');
  const r = spawnSync(process.execPath, [tsxCli(), bridgePath, pairsPath], {
    cwd: appRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 90_000
  });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('P298_CONTRAST:'));
  if (line === undefined) {
    return {
      ratios: [],
      why: `the contrast bridge printed no answer (exit ${String(r.status)}): ${`${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-6).join(' // ')}`
    };
  }
  return { ratios: JSON.parse(line.slice('P298_CONTRAST:'.length)), why: null };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
const findings = Object.fromEntries([...ALL_ARMS, 'RUN'].map((a) => [a, []]));
const readings = { socket, arms: chosen, base: BASE, appRoot, notes: [], matrix: [], main: {} };
if (BASE === 'parent') say(`the PARENT reading: the Electron runs ${appRoot}, and arm 11 grades against GEOM.parent`);
const note = (l) => {
  readings.notes.push(l);
  say(`note: ${l}`);
};
const f = (arm, text) => {
  findings[arm].push(text);
  say(`FINDING ${arm}: ${text}`);
};
findings['15'].push('NOT DRIVEN: the machine that comes back (SPEC §8.2) is the verifier\'s, because this run does not claim the scratch sshd restarts stably inside the harness. Stated, never a pass.');
class Refusal extends Error {}

let refused = null;
let runError = null;
try {
  if (machine !== null) {
    if (!machine.start()) throw new Refusal(`the scratch sshd did not answer on ${String(machine.port)}`);
    if (!machine.isolated()) throw new Refusal('the scratch machine shares this Mac\'s tmux server');
    const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
    mkdirSync(dirname(knownMachines), { recursive: true });
    writeFileSync(knownMachines, keyscanText({ host: '127.0.0.1', port: machine.port, caller: CALLER }), 'utf8');
    writeFileSync(
      join(configDir, 'machines.json'),
      `${J({ schema: 1, machines: [{ id: MACHINE_ID, label: 'p293 loopback', color: 'blue', host: '127.0.0.1', user: yard.user, port: machine.port, remoteTmuxPath: yard.tmuxPath }] })}\n`,
      'utf8'
    );
    say(`scratch machine on 127.0.0.1:${String(machine.port)}`);
  }
  await withElectron(
    {
      label: 'p293',
      userDataDir: profile,
      tmuxSocket: socket,
      // PHASE 298. `.` is resolved from here, so this is what points the same
      // run at the parent build.
      cwd: appRoot,
      args: [
        '--remote-debugging-port=0',
        '--use-mock-keychain',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: withoutDevRenderer({
        HOME: home,
        GMUX_TMUX_SOCKET: socket,
        GMUX_PROBES: '1',
        GMUX_CONFIG_ROOT: configDir,
        GMUX_SPECSTORY_NO_CLOUD: '1',
        ...(yard !== null ? { SSH_AUTH_SOCK: yard.authSock } : {})
      }),
      graceMs: 10_000,
      // PHASE 298 raised this from four minutes. Arm 11c stands twenty one rows
      // up, kills them and tombstones them, and arm 11a drives four interaction
      // states, three window widths and both colour bases. The ceiling is the
      // Electron's outer bound and not a budget: withElectron ends the tree it
      // started in a `finally` whatever happened, and this number only decides
      // how long a HUNG run is allowed to hang.
      ceilingMs: 8 * 60 * 1000
    },
    async (handle) => {
      const cdp = await cdpForAppWindow(profile, 60_000);
      say(`app window up, pid ${String(handle.appPid())}`);
      try {
        await cdp.call('Runtime.enable');
        await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(600);
        await drive(cdp);
      } catch (err) {
        if (err instanceof Refusal) throw err;
        runError = err instanceof Error ? err.message : String(err);
      } finally {
        cdp.close();
      }
    }
  );
} catch (err) {
  if (err instanceof Refusal) refused = err.message;
  else runError = runError ?? (err instanceof Error ? err.message : String(err));
} finally {
  // The scratch machine: its sshd, its agent and its tmux server, by the pids
  // this run recorded and by nothing else.
  if (machine !== null) {
    try {
      const serverPid = machine.serverPid(socket);
      if (serverPid !== null) record(serverPid);
    } catch {
      /* nothing answered */
    }
    try {
      machine.stop();
    } catch {
      /* already down */
    }
    for (const pid of recordedPids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    try {
      machine.cleanup();
    } catch {
      /* nothing to remove */
    }
  }
}
if (refused !== null) refuse(refused);
if (runError !== null) findings.RUN.push(`the run stopped ${runError}`);

// ---------------------------------------------------------------------------
// The drive, in one app session
// ---------------------------------------------------------------------------
async function drive(cdp) {
  let stage = 'setup';
  const ids = {};
  // PHASE 298. Which GEOM keys arm 11's two stages between them graded. 11a can
  // only read what the Managed tab draws and 11c owns the Past tab and the
  // densities, so `coverageFindings` at the end is what stops a key falling out
  // of both lists and quietly ceasing to be asserted.
  const p298Keys = [];
  try {
    // ------------------------------------------------------------------ 1
    if (on('1')) {
      stage = '1';
      let s = await d(cdp, "open('managed')");
      findings['1'].push(...doorFindings('1 Manage Sessions…', s, 'managed'));
      const closed = await click(cdp, '.session-sheet [aria-label="Close session manager"]');
      if (!closed.ok) f('1', `the close button: ${closed.why}`);
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('1', 'the close button left the sheet open');
      s = await d(cdp, "open('past')");
      findings['1'].push(...doorFindings('1 Past Sessions…', s, 'past'));
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('1', 'Escape left the sheet open with nothing else in it');
    }

    // --------------------------------------------------------------- set up
    stage = 'setup';
    await d(cdp, `addProject(${J(P.alpha)})`);
    ids.a1 = await d(cdp, `createSession(${J({ path: P.alpha, name: 'p293-a1' })})`);
    ids.a2 = await d(cdp, `createSession(${J({ path: P.alpha, name: 'p293-a2' })})`);
    for (const [key, dir, names] of [
      ['beta', P.beta, ['b1', 'b2', 'b3']],
      ['gamma', P.gamma, ['g1']],
      ['delta', P.delta, ['d1']]
    ]) {
      await d(cdp, `addProject(${J(dir)})`);
      for (const n of names) ids[n] = await d(cdp, `createSession(${J({ path: dir, name: `p293-${n}` })})`);
      if (!(await d(cdp, `closeTab(${J(dir)})`))) f('RUN', `the ${key} tab did not close`);
    }
    if (Object.values(ids).some((v) => typeof v !== 'string')) throw new Error(`a session was not created: ${J(ids)}`);
    // Main's own list is the truth each session is live in before any arm.
    const live = await until(cdp, (x) => Object.values(ids).every((id) => x.store.sessions.some((one) => one.id === id && LIVE.has(one.status))), 20_000);
    if (!live.ok) throw new Error(`the sessions did not all read live: ${J(live.s.store.sessions)}`);
    // ONE held status, the only one this run supplies (§8.1).
    if (!(await d(cdp, `hold(${J(ids.b2)})`))) f('10', 'the needs_input hold did not take');
    say(`set up: alpha open with a1 a2; beta, gamma and delta closed; ${String(Object.keys(ids).length)} shells; b2 held at needs_input`);

    // ------------------------------------------------------------------ R
    if (on('R') && machine !== null) {
      stage = 'R';
      const rows = await cdpEval(cdp, 'window.gmux.machines.reload().then(() => window.gmux.machines.rows())', 60_000);
      const row = (rows?.rows ?? []).find((r) => r.id === MACHINE_ID);
      if (row === undefined) throw new Error(`the machine row was not read: ${J(rows?.errors ?? rows)}`);
      const confirmed = await cdpEval(cdp, `window.gmux.machines.confirm(${J({ id: MACHINE_ID, hashRead: row.hash, linesRead: row.lines })})`, 60_000);
      if (confirmed?.state !== 'confirmed') throw new Error(`the machine is ${String(confirmed?.state)}, not confirmed`);
      let prep = await cdpEval(cdp, `window.gmux.machines.prepare(${J(MACHINE_ID)})`, 90_000);
      if (prep?.class === 'version-unmeasured' && prep?.acceptSheet != null) {
        await cdpEval(cdp, `window.gmux.machines.acceptVersion(${J({ id: MACHINE_ID, version: prep.version, hashRead: prep.acceptSheet.hash, linesRead: prep.acceptSheet.lines })})`, 60_000);
        prep = await cdpEval(cdp, `window.gmux.machines.prepare(${J(MACHINE_ID)})`, 90_000);
      }
      if (prep?.class !== 'prepared') throw new Error(`prepare said ${String(prep?.class)}: ${String(prep?.detail)}`);
      ids.r1 = await d(cdp, `createSession(${J({ path: P.far, name: 'p293-r1', machineId: MACHINE_ID })})`);
      const r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.r1 && LIVE.has(one.status) && one.machineId === MACHINE_ID), 20_000);
      if (!r.ok) f('R', `the remote session did not read live on ${MACHINE_ID}: ${J(r.s.store.sessions.find((one) => one.id === ids.r1))}`);
      else say(`R: one live shell on the scratch machine in ${P.far}; its tab ${r.s.store.projects.some((p) => p.path === P.far && p.machineId === MACHINE_ID) ? 'is OPEN (creating it opened one)' : 'is not open'}`);
    }

    let s = await d(cdp, "open('managed')");
    if (!s.sheet) throw new Error('the manager did not open for the arms');

    // ------------------------------------------------------------------ 2
    if (on('2')) {
      stage = '2';
      await choose(cdp, '#sm-filter-tab', 'closed');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => r.tabOpen === 'no'), 5000));
      const drawn = s.rows.map((r) => r.id);
      for (const k of ['b1', 'b2', 'b3', 'g1', 'd1']) if (!drawn.includes(ids[k])) f('2', `${k}, in a closed project, is not drawn under Tab closed`);
      for (const k of ['a1', 'a2']) if (drawn.includes(ids[k])) f('2', `${k}, in the open project, is drawn under Tab closed`);
      for (const r of s.rows) if (r.tabOpen !== 'no') f('2', `${r.id} is drawn under a group reading tab-open ${String(r.tabOpen)}`);
      await choose(cdp, '#sm-filter-tab', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a1), 5000);
    }

    // ----------------------------------------------------------------- 11a
    //
    // THE CONTROL IS FIRST AND IT MUST NOT MOVE: both toolbar modes at 47px and
    // the title bar at 52px, graded by `geometryFindings` exactly as Phase 293
    // wrote it, on the parent and on HEAD alike. Phase 298's own formula answers
    // 44 for both and the entry names that and refuses it.
    //
    // THE ORDER OF THE READINGS IS LOAD BEARING. The focus ring is read BEFORE
    // any pointer event, because `:focus-visible` only follows a programmatic
    // focus while the last interaction was a keyboard one; the arm presses Tab
    // first and reports `matches(':focus-visible')` rather than assuming it, so a
    // reading it could not take is a finding about the probe and never a claim
    // about the ring.
    if (on('11')) {
      stage = '11a';
      const filters = await state(cdp);
      const installed = await cdpEval(
        cdp,
        P298_READERS
          .replace('__PALETTE_TOKENS__', () => J(PALETTE_TOKENS))
          .replace('__ELLIPSIS_ALLOWED__', () => J(ELLIPSIS_ALLOWED))
      );
      if (installed !== true) f('11', 'the arm 11 readers would not install');
      const g11 = {};
      const keys11a = ['rowBox', 'headThBox', 'groupThBox', 'footBox', 'managedPitch', 'skeletonBox', 'skeletonPitch'];
      const pairRows = [];
      // PHASE 298 FIX ROUND. The two bases' own resolved palettes, kept from the
      // first reading that answered them, so `crossBaseFindings` can name the base
      // a colour came from. Every call reads the same two.
      let pairPalettes = null;
      const readPairs = async (stateName) => {
        const read = await p(cdp, `pairs(${J(stateName)})`);
        if (read === null) {
          f('11', `no contrast pairs could be read in the ${stateName} state`);
          return;
        }
        if (pairPalettes === null) pairPalettes = read.palettes ?? null;
        pairRows.push(...(read.rows ?? []));
      };

      const tokens = await p(cdp, 'tokens()');
      const scheme = await p(cdp, 'colorSchemeQueries()');
      const boxes = await p(cdp, 'boxes()');
      const skeleton = await p(cdp, 'plantSkeleton()');
      const targets = await p(cdp, 'targets()');
      const icons = await p(cdp, 'icons()');
      // The state block's own mark is 24 at HEAD and 28 at the parent
      // (SessionManagerSheet.tsx:156), and it is only in the DOM while something
      // REPLACES the grid, so the arm drives one: a search nothing matches. The
      // first Escape layer is a non-empty search, so the same key puts the grid
      // back.
      let stateIcons = { sizes: [] };
      const searchField = await click(cdp, '#sm-search');
      if (!searchField.ok) f('11', `the search field: ${searchField.why}`);
      else {
        await typeText(cdp, 'zzzzzz');
        const blocked = await until(cdp, (x) => x.rows.length === 0, 5000);
        const drawn = await cdpEval(cdp, "document.querySelector('.modal.session-sheet .sm-state-block') !== null");
        if (!blocked.ok || drawn !== true) f('11', 'a search nothing matches drew no state block, so the state block\'s own mark was not read');
        else stateIcons = (await p(cdp, 'icons()')) ?? { sizes: [] };
        // Escape's FIRST layer is a non-empty search in the focused field, so
        // the same key puts the grid back. If the search never took, Escape
        // falls through to the sheet and closes it, which would take every
        // reading below with it: the arm re-opens and says so rather than
        // running on against a sheet that is not there.
        await pressKey(cdp, 'Escape');
        let back = await until(cdp, (x) => x.sheet && x.rows.length > 0, 5000);
        if (!back.s.sheet) {
          note('11: Escape closed the sheet rather than clearing the search, so the arm re-opened it');
          await d(cdp, "open('managed')");
          back = await until(cdp, (x) => x.sheet && x.rows.length > 0, 5000);
        }
        if (!back.ok) f('11', 'the grid did not come back after the state block was read');
      }
      const nameMin = await p(cdp, `nameMin(${J(NAME_CORPUS)}, ${String(READABLE_CHARS)})`);
      const actionsMin = await p(cdp, 'actionsMin()');
      const declaredNameMin = await p(cdp, "declaredPx('--sm-name-min')");
      const declaredActionsMin = await p(cdp, "declaredPx('--sm-actions-min')");
      Object.assign(g11, boxes ?? {}, skeleton ?? {});

      // The ring, before anything touches the mouse.
      await pressKey(cdp, 'Tab');
      const focusFirst = await p(cdp, "focusAndRead('[data-manage-primary]', false)");
      const focusLast = await p(cdp, "focusAndRead('[data-manage-primary]', true)");
      for (const [which, read] of [['first', focusFirst], ['last', focusLast]]) {
        if (read === null) f('11', `no [data-manage-primary] to read the ring on (${which})`);
        else if (read.visible !== true) f('11', `the probe could not put the ring on the ${which} row's ${read.what}: it is focused ${String(read.active)} and matches :focus-visible ${String(read.visible)}, so the boxShadow reading ${J(read.boxShadow)} is not a claim about the ring`);
      }

      // At rest, with nothing hovered.
      if ((await p(cdp, 'rowHovered()')) === true) f('11', 'a row is already hovered, so the resting reading is not at rest');
      const rest = await p(cdp, "computedAt('tr.sm-row > td')");
      await readPairs('rest');

      // Reduced motion. tokens.css:691-697 sets `transition-property: none
      // !important` on `*` under this query (Phase 200's leak fix), so the
      // PROPERTY reads `none` on both bases and only the DURATION separates
      // them: the token's own 1ms at HEAD, 0s at the parent where nothing is
      // declared. The token is re-resolved under the emulation, so the
      // expectation is the token and never the string "1ms".
      await cdp.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await sleep(250);
      const reduced = await p(cdp, "computedAt('tr.sm-row > td')");
      tokens.durFastReduced = (await p(cdp, 'tokens()'))?.durFast ?? null;
      await cdp.call('Emulation.setEmulatedMedia', { features: [] });
      await sleep(250);

      // Under a REAL pointer.
      if (!(await hoverAt(cdp, 'tr.sm-row'))) f('11', 'no tr.sm-row to put the pointer on');
      const hover = await p(cdp, "computedAt('tr.sm-row > td')");
      await readPairs('hover');

      // Checked, which is also the control's selection mode.
      const c = await click(cdp, `[data-manage-check="${ids.a1}"]`);
      if (!c.ok) f('11', `a1's checkbox: ${c.why}`);
      const { s: selection } = await until(cdp, (x) => x.toolbar.mode === 'selection', 3000);
      await pointerAway(cdp);
      const checked = await p(cdp, `computedAt('[data-manage-row="${ids.a1}"] > td')`);
      await readPairs('checked');
      await click(cdp, `[data-manage-check="${ids.a1}"]`);
      await until(cdp, (x) => x.toolbar.mode === 'filters', 3000);

      // With its panel open, which is the fourth fill and the one a person sees
      // while they read what a row is about to do.
      let open = null;
      const opened = await click(cdp, `[data-manage-name="${ids.a1}"]`);
      if (!opened.ok) f('11', `a1's name button: ${opened.why}`);
      else {
        const r = await until(cdp, (x) => x.inline?.id === ids.a1, 3000);
        if (!r.ok) f('11', `the name button opened ${J(r.s.inline)}, want a1's panel`);
        await pointerAway(cdp);
        open = await p(cdp, `computedAt('[data-manage-row="${ids.a1}"] > td')`);
        await pressKey(cdp, 'Escape');
        const shut = await until(cdp, (x) => x.inline === null, 3000);
        if (!shut.ok) f('11', 'Escape left a1\'s panel open');
      }

      const states = {
        tokens,
        rest,
        hover,
        checked,
        open,
        focusFirst,
        focusLast,
        transition: rest,
        reduced,
        prefersColorSchemeQueries: scheme?.hits ?? -1
      };
      const allIcons = { sizes: [...(icons?.sizes ?? []), ...stateIcons.sizes.map((one) => ({ ...one, what: `${one.what} (state block)` }))] };
      if (nameMin === null) f('11', 'no `.sm-name strong` to measure --sm-name-min on, so the number in the CSS is not held to anything');
      if (actionsMin === null) f('11', 'no `.sm-row-actions` to measure --sm-actions-min on');
      for (const one of allIcons.sizes) {
        if (typeof one.height === 'number' && one.height !== one.px) {
          f('11', `${one.what} is ${String(one.px)}px wide and ${String(one.height)}px tall; an agent mark is square`);
        }
      }
      const measured = [
        ...(nameMin === null
          ? []
          : [{
              property: '--sm-name-min',
              declared: declaredNameMin,
              floor: onGrid(nameMin.widest),
              ceiling: onGrid(nameMin.measured),
              how: `the widest ${String(READABLE_CHARS)} character prefix is ${String(nameMin.widest)}px (${String(nameMin.by)}), the ellipsis is ${String(nameMin.ellipsis)}px, at ${String(nameMin.font)} — the entry's model is the prefix alone and SPEC.md §7's is the prefix plus the ellipsis`
            }]),
        ...(actionsMin === null
          ? []
          : [{
              property: '--sm-actions-min',
              declared: declaredActionsMin,
              floor: onGrid(actionsMin.measured),
              ceiling: onGrid(actionsMin.measured),
              how: `${String(actionsMin.measured)}px across the ${String(actionsMin.parts)} children of the widest .sm-row-actions, over ${String(actionsMin.of)} row(s)`
            }])
      ];

      findings['11'].push(...geometryFindings(filters, selection));
      p298Keys.push(...keys11a);
      findings['11'].push(...boxFindings(BASE, g11, keys11a));
      // PHASE 298 FIX ROUND. EVERY interactive target, by role, against the
      // parent's own reading for the same control — and the WCAG floor as its own
      // clause beside it. A control with no parent number and a pre-existing WCAG
      // failure are NOTES: see hitNotes for why neither is a red gate here.
      const hitParent = parentTable(hitParentFile);
      const hitTargets = collapseTargets(targets ?? []);
      findings['11'].push(...hitFindings(BASE, hitTargets, hitParent));
      findings['11'].push(...wcagFindings(hitTargets, hitParent));
      for (const line of hitNotes(BASE, hitTargets, hitParent)) note(line);
      findings['11'].push(...iconFindings(BASE, allIcons));
      findings['11'].push(...stateFindings(BASE, states));
      findings['11'].push(...measuredFindings(BASE, measured));
      if ((scheme?.unreadable ?? 0) > 0) f('11', `${String(scheme.unreadable)} stylesheet(s) could not be read, so the prefers-color-scheme count is not a proof`);

      readings.geometry = { filters: { toolbar: filters.toolbar, title: filters.titleHeight }, selection: selection.toolbar };
      readings.p298 = { base: BASE, appRoot, keys11a, boxes: g11, targets: hitTargets, targetsRaw: targets, targetsDrawn: (targets ?? []).length, hitParentFrom: hitParentFrom, icons: allIcons, states, measured, nameMin, actionsMin, scheme, pairRows: pairRows.length };
      say(`11a: base ${BASE}; toolbar ${String(filters.toolbar.height)}/${String(selection.toolbar.height)}px, title ${String(filters.titleHeight)}px (the control); row ${String(g11.rowBox)} box / ${String(g11.managedPitch)} pitch, thead ${String(g11.headThBox)}, group ${String(g11.groupThBox)}, foot ${String(g11.footBox)}, skeleton ${String(g11.skeletonBox)}/${String(g11.skeletonPitch)}`);
      // The whole hit-area reading, one line per role, so the two runs are read
      // side by side without opening the JSON: width x height, how many copies,
      // the WCAG verdict, and the floor it was held to.
      for (const one of hitTargets) {
        const floor = HIT_EXCEPTIONS[one.key] ?? hitParent[one.key] ?? null;
        const held = floor === null
          ? 'no parent reading'
          : `${HIT_EXCEPTIONS[one.key] === undefined ? 'parent' : 'ADMITTED'} ${String(floor.width ?? '(content)')}x${String(floor.height)}`;
        const wcag = one.width < WCAG_MIN - TOL || one.height < WCAG_MIN - TOL ? 'UNDER 24x24' : 'clears 24x24';
        say(`11a hit: ${String(one.width)}x${String(one.height)} x${String(one.count)}  ${wcag}  vs ${held}  ${one.key}`);
      }
      say(`11a: --sm-name-min prefix ${String(nameMin?.widest)} (${String(nameMin?.by)}) + ellipsis ${String(nameMin?.ellipsis)} = ${String(nameMin?.measured)}, so the band is ${String(onGrid(nameMin?.widest ?? 0))} to ${String(onGrid(nameMin?.measured ?? 0))} and the CSS declares ${String(declaredNameMin)}; --sm-actions-min measured ${String(actionsMin?.measured)} -> ${String(onGrid(actionsMin?.measured ?? 0))}, declared ${String(declaredActionsMin)}`);
      say(`11a: ${String(allIcons.sizes.length)} icon(s) at ${J([...new Set(allIcons.sizes.map((one) => one.px))].sort((a, b) => a - b))}, the state block's own included`);

      // --------------------------------------------------------------- 11b
      // THE CLIPPING ATTACK, and it is what protects the honesty words the type
      // change touches. Three widths: the sheet at its full 1180, the 1100
      // breakpoint itself, and calc(100vw - 48px) on a 1024 wide window.
      stage = '11b';
      const clip = { widths: [] };
      for (const at of CLIP_WIDTHS) {
        await cdp.call('Emulation.setDeviceMetricsOverride', { width: at.width, height: 900, deviceScaleFactor: 1, mobile: false });
        await sleep(350);
        const read = await p(cdp, `clipAt(${J(CLIP_STRINGS)})`);
        if (read === null) {
          f('11', `the clipping attack found no sheet at ${String(at.width)}px`);
          continue;
        }
        clip.widths.push({ ...read, why: at.why, width: at.width });
      }
      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await sleep(300);
      findings['11'].push(...clipFindings(clip));
      // PHASE 298 FIX ROUND. A clause this tab could not exercise is SAID, never
      // counted as a failure. See ELLIPSIS_ALLOWED for why no tab holds all three.
      for (const line of clipNotes(clip)) note(line);
      readings.p298.clip = clip;
      say(`11b: ${clip.widths.map((w) => `${String(w.width)}px -> ${String(w.injected)} injections over ${String(w.texts)} text node(s), ${String(w.clipped.length)} clipped, ellipsis kinds ${J(w.ellipsisKinds)} of ${J(w.ellipsisReachable)} reachable`).join('; ')}`);

      // The ratios, from the app's own contrastOf.
      //
      // PHASE 298 FIX ROUND. A pair that mixes the two bases' palettes is refused
      // BY NAME and never handed a ratio, because the ratio would be a number
      // about a render that cannot happen. The freeze inside `pairs` is what stops
      // one being read at all; this is the lock that makes the next one legible.
      //
      // PHASE 298 FIX ROUND, SECOND PASS. A translucent ground is COMPOSITED over
      // what is beneath it before any ratio is asked for, and a ground that could
      // not be composited refuses loudly instead of printing a ratio that cannot
      // happen. The build round read `--accent-wash`, rgba(77, 157, 232, 0.14) on
      // the selection toolbar, as a ground and printed 1.11:1 where the real
      // reading is 5.38:1 dark and 6.27:1 light.
      findings['11'].push(...compositeFindings(pairRows));
      findings['11'].push(...compositeCheckFindings(pairRows));
      findings['11'].push(...crossBaseFindings(pairRows, pairPalettes));
      const composited = pairRows.filter((one) => one.composited !== false);
      const uncomposited = pairRows.length - composited.length;
      const realPairs = gradablePairs(pairRows, pairPalettes);
      const impossible = composited.length - realPairs.length;
      const washed = composited.filter((one) => (one.bgLayers ?? []).length > 1).length;
      const unique = [];
      const seenPair = new Map();
      for (const row of realPairs) {
        const key = `${String(row.fg)}|${String(row.bg)}`;
        if (!seenPair.has(key)) {
          seenPair.set(key, unique.length);
          unique.push({ fg: row.fg, bg: row.bg });
        }
      }
      const { ratios, why } = contrastRatios(unique);
      if (why !== null) f('11', why);
      else {
        const graded = realPairs.map((row) => ({ ...row, ratio: ratios[seenPair.get(`${String(row.fg)}|${String(row.bg)}`)] ?? null }));
        findings['11'].push(...contrastFindings(graded));
        const worst = graded.filter((one) => one.exemptBecause === null).reduce((a, b) => (a === null || b.ratio < a.ratio ? b : a), null);
        readings.p298.contrast = { pairs: unique.length, rows: graded.length, impossible, uncomposited, washed, palettes: pairPalettes, exempt: graded.filter((one) => one.exemptBecause !== null).length, worst };
        say(`11a: ${String(graded.length)} text reading(s) over ${String(unique.length)} unique pair(s) on both bases, ${String(washed)} over a COMPOSITED translucent wash, ${String(impossible)} refused as a cross-base pair, ${String(uncomposited)} refused because the ground could not be composited; the worst is ${worst === null ? 'none' : `${worst.what} at ${Number(worst.ratio).toFixed(2)}:1 (${worst.base}, ${worst.state})`}`);
      }
    }

    // ------------------------------------------------------------------ 10
    if (on('10') || on('R')) {
      stage = '10';
      s = await state(cdp);
      const rows = await d(cdp, 'matrix()');
      for (const row of rows) {
        if (row.tab !== 'managed' || !s.rows.some((r) => r.id === row.id)) continue;
        readings.matrix.push(row);
        const arm = row.machineId !== null ? 'R' : '10';
        if (on(arm)) findings[arm].push(...matrixFindings(row));
      }
      say(`10: ${String(readings.matrix.length)} Managed row(s) graded: ${readings.matrix.map((r) => `${r.status}${r.machineId ? '@' + r.machineId : ''}`).join(', ')}`);
    }

    // ------------------------------------------------------------------ 13
    if (on('13')) {
      stage = '13';
      const before = await state(cdp);
      const active = before.store.sessions.find((one) => one.id === before.store.activeSessionId);
      if (active === undefined) f('13', 'no active session is behind the sheet, so F2 has nothing to reach');
      const focused = await cdpEval(cdp, `(() => { const el = document.querySelector('[data-manage-name="${ids.b1}"]'); if (!el) return false; el.focus(); return document.activeElement === el; })()`);
      if (!focused) f('13', 'b1\'s name button would not take the keyboard');
      await pressKey(cdp, 'F2');
      const opened = await until(cdp, (x) => x.inline?.id === ids.b1 && x.inline?.kind === 'rename', 3000);
      if (!opened.ok) f('13', `F2 on b1 opened ${J(opened.s.inline)}, want b1's rename`);
      if (opened.s.store.renamingSessionId !== null) f('13', `F2 renamed the session BEHIND the sheet: renamingSessionId ${String(opened.s.store.renamingSessionId)}`);
      await typeText(cdp, 'zz');
      await pressKey(cdp, 'Enter');
      const renamed = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.b1 && one.name === 'zz'), 5000);
      if (!renamed.ok) f('13', `b1 was not renamed to zz: ${J(renamed.s.store.sessions.find((one) => one.id === ids.b1))}`);
      const after = renamed.s.store.sessions.find((one) => one.id === active?.id);
      if (active !== undefined && after?.name !== active.name) f('13', `the active session's name moved from ${J(active.name)} to ${J(after?.name)}`);
      say(`13: F2 renamed b1 to ${J(renamed.s.store.sessions.find((one) => one.id === ids.b1)?.name)}; the active session reads ${J(after?.name)}`);
    }

    // ------------------------------------------------------------------ 3
    const endRow = async (arm, key, cancelFirst) => {
      const id = ids[key];
      let c = await click(cdp, `[data-manage-primary="${id}"][data-verb="end"]`);
      if (!c.ok) return f(arm, `${key}'s End: ${c.why}`);
      let r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'end', 3000);
      if (!r.ok) return f(arm, `End on ${key} opened ${J(r.s.inline)}`);
      if (cancelFirst) {
        c = await click(cdp, `[data-manage-inline="${id}"] .sm-inline-actions .btn-secondary`);
        if (!c.ok) return f(arm, `Cancel: ${c.why}`);
        r = await until(cdp, (x) => x.inline === null, 3000);
        if (!r.ok) f(arm, 'Cancel left the panel open');
        if (!LIVE.has(rowIn(r.s, id)?.status ?? '')) f(arm, `Cancel ended ${key}: it reads ${String(rowIn(r.s, id)?.status)}`);
        c = await click(cdp, `[data-manage-primary="${id}"][data-verb="end"]`);
        r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'end', 3000);
        if (!c.ok || !r.ok) return f(arm, `End on ${key} did not open again after Cancel`);
      }
      c = await click(cdp, '[data-sm-confirm="end"]');
      if (!c.ok) return f(arm, `Confirm: ${c.why}`);
      r = await until(cdp, (x) => ['exited', 'restorable'].includes(rowIn(x, id)?.status ?? '') && x.inline === null, 10_000);
      if (!r.ok) return f(arm, `${key} after Confirm: row ${J(rowIn(r.s, id))}, panel ${J(r.s.inline)}`);
      return null;
    };
    if (on('3') || on('4') || on('8')) {
      stage = '3';
      await endRow('3', 'a2', true);
      if (on('3')) say(`3: a2 ended through Cancel then Confirm, and its row reads ${String(rowIn(await state(cdp), ids.a2)?.status)}`);
    }

    // ------------------------------------------------------------------ 7
    if (on('7')) {
      stage = '7';
      await choose(cdp, '#sm-filter-state', 'running');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => LIVE.has(r.status ?? '')), 5000));
      const liveIds = s.rows.map((r) => r.id);
      let c = await click(cdp, '#sm-select-all');
      if (!c.ok) f('7', `select-all: ${c.why}`);
      const first = checkedIds((await until(cdp, (x) => checkedIds(x).length > 0, 3000)).s);
      c = await click(cdp, '#sm-select-all');
      const second = checkedIds((await until(cdp, (x) => checkedIds(x).length === 0, 3000)).s);
      findings['7'].push(...selectAllFindings(liveIds, first, second));
      say(`7: select-all under Running checked ${String(first.length)} of ${String(liveIds.length)} live rows, the second click left ${String(second.length)}`);
      await choose(cdp, '#sm-filter-state', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a2), 5000);
    }

    // ------------------------------------------------------------------ 8
    if (on('8')) {
      stage = '8';
      for (const k of ['a1', 'b1', 'a2']) await click(cdp, `[data-manage-check="${ids[k]}"]`);
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch !== null, 3000));
      findings['8'].push(...batchCountFindings('8', s.batch, [ids.a1, ids.b1], '1 already ended'));
      say(`8: ${J(s.batch?.heading)} / ${J(s.batch?.skipped)}`);
      await click(cdp, '[aria-label="Cancel ending selected sessions"]');
      ({ s } = await until(cdp, (x) => x.batch === null, 3000));
      if (s.batch !== null) f('8', 'the confirmation did not close on Cancel');
      if (checkedIds(s).length !== 3) f('8', `Cancel kept ${J(checkedIds(s))} checked, want the three it had`);
      await click(cdp, '[aria-label="Clear selection"]');
      await until(cdp, (x) => checkedIds(x).length === 0, 3000);
    }

    // ------------------------------------------------------------------ 4
    const removeRow = async (arm, key) => {
      const id = ids[key];
      const items = await d(cdp, `menuItemsFor(${J(id)})`);
      const remove = items.find((i) => i.label === 'Remove');
      if (remove === undefined || remove.disabled) return f(arm, `${key}'s menu offers ${J(remove ?? null)} for Remove`);
      if (!(await d(cdp, `runMenuItem(${J(id)}, 'Remove')`))) return f(arm, 'the Remove item did not run');
      let r = await until(cdp, (x) => x.inline?.id === id && x.inline?.kind === 'remove', 3000);
      if (!r.ok) return f(arm, `Remove on ${key} opened ${J(r.s.inline)}`);
      const c = await click(cdp, '[data-sm-confirm="remove"]');
      if (!c.ok) return f(arm, `Confirm Remove: ${c.why}`);
      r = await until(cdp, (x) => !x.rows.some((one) => one.id === id) && x.store.past.includes(id), 10_000);
      if (!r.ok) return f(arm, `${key} did not leave Managed for Past`);
      return null;
    };
    if (on('4')) {
      stage = '4';
      const before = await state(cdp);
      await removeRow('4', 'a2');
      const after = (await until(cdp, (x) => x.counts.past !== before.counts.past, 3000)).s;
      if (Number(after.counts.managed) !== Number(before.counts.managed) - 1) f('4', `the Managed count read ${String(before.counts.managed)} then ${String(after.counts.managed)}`);
      if (Number(after.counts.past) !== Number(before.counts.past) + 1) f('4', `the Past count read ${String(before.counts.past)} then ${String(after.counts.past)}`);
      say(`4: counts Managed ${String(before.counts.managed)} to ${String(after.counts.managed)}, Past ${String(before.counts.past)} to ${String(after.counts.past)}`);
      // The Past rows of the matrix, now that one exists: its group, its
      // visible Restore, no checkbox, and its menu against the policy's.
      if (on('10')) {
        await click(cdp, '#sm-tab-past');
        const past = await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.a2), 5000);
        const drawnPast = new Set(past.s.rows.map((r) => r.id));
        for (const row of await d(cdp, 'matrix()')) {
          if (row.tab !== 'past' || !drawnPast.has(row.id)) continue;
          readings.matrix.push(row);
          findings['10'].push(...matrixFindings(row));
        }
        await click(cdp, '#sm-tab-managed');
        await until(cdp, (x) => x.tab === 'sm-tab-managed', 3000);
      }
    }

    // ------------------------------------------------------------------ 5
    if (on('5')) {
      stage = '5';
      await endRow('5', 'b3', false);
      await removeRow('5', 'b3');
      await click(cdp, '#sm-tab-past');
      await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.b3), 5000);
      let c = await click(cdp, `[data-manage-primary="${ids.b3}"]`);
      if (!c.ok) f('5', `b3's Restore: ${c.why}`);
      let r = await until(cdp, (x) => x.inline?.kind === 'restore-open', 3000);
      if (!r.ok) f('5', `Restore on a row whose tab is closed opened ${J(r.s.inline)}, want the inline ask`);
      c = await click(cdp, '[data-sm-confirm="restore-open"]');
      if (!c.ok) f('5', `Open project and restore: ${c.why}`);
      r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.b3 && LIVE.has(one.status)), 15_000);
      if (!r.ok) f('5', `b3 is not Managed and live after the restore: ${J(r.s.store.sessions.find((one) => one.id === ids.b3) ?? null)}`);
      if (!r.s.store.projects.some((p) => p.path === P.beta)) f('5', 'beta\'s tab did not open');
      // The fix round, W1: a Past restore lands, as today's Past Sessions did.
      const landed = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === ids.b3 && x.focus.terminal, 5000);
      if (landed.s.sheet) f('5', 'the sheet stayed open after a Past restore; today\'s Past Sessions closed and landed');
      if (landed.s.store.activeSessionId !== ids.b3) f('5', `the active session is ${String(landed.s.store.activeSessionId)} after the restore, want b3`);
      if (!landed.s.focus.terminal) f('5', `after the restore the keyboard is on ${landed.s.focus.desc}, want b3's terminal`);
      say(`5: b3 restored into beta; beta open ${String(landed.s.store.projects.some((p) => p.path === P.beta))}, sheet open ${String(landed.s.sheet)}, active ${String(landed.s.store.activeSessionId === ids.b3 ? 'b3' : landed.s.store.activeSessionId)}, keyboard ${landed.s.focus.desc}`);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ 6
    if (on('6')) {
      stage = '6';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await endRow('6', 'g1', false);
      await removeRow('6', 'g1');
      const away = `${P.gamma}-away`;
      renameSync(P.gamma, away);
      try {
        await click(cdp, '#sm-tab-past');
        await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.g1), 5000);
        await click(cdp, `[data-manage-primary="${ids.g1}"]`);
        // The fix round, W7. The FIRST press says the folder is gone, as
        // today's Past Sessions said it; an ask promising a shell in that
        // folder is the first build's shape and is a finding here.
        const first = await until(cdp, (x) => x.inline?.kind === 'failed' || x.inline?.kind === 'restore-open', 5000);
        if (first.s.inline?.kind === 'restore-open') {
          f('6', `the first press on a restore whose folder is gone drew the ask ${J(first.s.inline?.text)}, which promises a shell in it`);
          await click(cdp, '[data-sm-confirm="restore-open"]');
        }
        const failed = await until(cdp, (x) => x.inline?.kind === 'failed', 10_000);
        if (!failed.ok) f('6', `a restore whose folder is gone drew ${J(failed.s.inline)}, want the failed panel`);
        if (!failed.s.rows.some((r) => r.id === ids.g1)) f('6', 'the failed restore did not keep its row');
        // The sentence must be true of THIS row. A removed session runs
        // nowhere, so a refusal that says it "is still running" is a sentence
        // written for Go to session read out over a restore (SPEC §8.2 names
        // the Restore sentence as the folder no longer existing).
        const said = failed.s.inline?.text ?? '';
        if (/still running/i.test(said)) f('6', `the failed restore of a REMOVED session says it is still running: ${J(said)}`);
        say(`6: the failed panel reads ${J(failed.s.inline?.error ?? failed.s.inline?.text ?? null)}`);
      } finally {
        renameSync(away, P.gamma);
      }
      const retry = await click(cdp, '[data-manage-inline] .sm-inline-actions .btn-primary');
      if (!retry.ok) f('6', `Retry: ${retry.why}`);
      let r = await until(cdp, (x) => x.inline?.kind === 'restore-open' || x.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status)), 5000);
      if (r.s.inline?.kind === 'restore-open') {
        await click(cdp, '[data-sm-confirm="restore-open"]');
        r = await until(cdp, (x) => x.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status)), 15_000);
      }
      if (!r.s.store.sessions.some((one) => one.id === ids.g1 && LIVE.has(one.status))) f('6', 'Retry did not restore g1 once its folder was back');
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      else {
        await click(cdp, '#sm-tab-managed');
        await until(cdp, (x) => x.tab === 'sm-tab-managed', 3000);
      }
    }

    // ------------------------------------------------------------------ L
    // The fix round, W1, the verifier's P14: a removed session whose project
    // is OPEN but not the active one. Today one press switched to it.
    if (on('L')) {
      stage = 'L';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      const activeBefore = s.store.activeProjectId;
      const alpha = s.store.projects.find((p) => p.path === P.alpha)?.id ?? null;
      if (alpha === null) f('L', 'alpha is not open');
      else if (activeBefore === alpha) note('L: alpha is already the active project, so this arm shows the landing and not the switch');
      await endRow('L', 'a1', false);
      await removeRow('L', 'a1');
      await click(cdp, '#sm-tab-past');
      await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.some((r) => r.id === ids.a1), 5000);
      const c = await click(cdp, `[data-manage-primary="${ids.a1}"]`);
      if (!c.ok) f('L', `a1's Restore: ${c.why}`);
      const r = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === ids.a1 && x.focus.terminal, 15_000);
      if (r.s.sheet) f('L', 'the sheet stayed open after a Past restore into an open project');
      if (r.s.store.activeProjectId !== alpha) f('L', `the active project is ${String(r.s.store.activeProjectId)}, want alpha (${String(alpha)})`);
      if (r.s.store.activeSessionId !== ids.a1) f('L', `the active session is ${String(r.s.store.activeSessionId)}, want a1`);
      if (!r.s.focus.terminal) f('L', `the keyboard is on ${r.s.focus.desc}, want a1's terminal`);
      if (r.s.store.toasts.some((t) => /restored/.test(t.text) && t.kind !== 'success')) f('L', `the restore said ${J(r.s.store.toasts.slice(-1))}`);
      say(`L: a1 restored from Past; sheet ${String(r.s.sheet)}, active project ${r.s.store.activeProjectId === alpha ? 'alpha' : String(r.s.store.activeProjectId)} (was ${activeBefore === alpha ? 'alpha' : String(activeBefore)}), keyboard ${r.s.focus.desc}`);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ O
    // The fix round, W3. Today Past Sessions opens OVER the Catch Me Up page
    // and closes back onto it; the first build's door refused, with no word.
    if (on('O')) {
      stage = 'O';
      s = await state(cdp);
      if (s.sheet) {
        await pressKey(cdp, 'Escape');
        ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      }
      s = await d(cdp, "menu('show-overview')");
      ({ s } = await until(cdp, (x) => x.store.overview, 5000));
      if (!s.store.overview) f('O', 'View → Catch Me Up did not open the page, so the arm has nothing to open over');
      s = await d(cdp, "open('past')");
      if (!s.sheet) f('O', 'Session → Past Sessions… with the Catch Me Up page open drew nothing');
      else if (s.tab !== 'sm-tab-past') f('O', `the sheet opened on ${String(s.tab)}, want the Past tab`);
      if (!s.store.overview) f('O', 'the page closed when the sheet opened; today it stays under it');
      const inSheet = (await until(cdp, (x) => x.focus.inSheet, 2000)).s.focus.inSheet;
      if (!inSheet) f('O', 'the keyboard is not in the sheet it opened over the page');
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.sheet, 3000));
      if (s.sheet) f('O', 'Escape did not close the sheet over the page');
      if (!s.store.overview) f('O', 'Escape closed the page with the sheet; the sheet alone should close');
      say(`O: the sheet opened over the page ${String(inSheet)}; after Escape sheet ${String(s.sheet)}, page ${String(s.store.overview)}`);
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.store.overview, 5000));
      if (s.store.overview) f('O', 'a second Escape did not close the page');
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ J
    // The fix round, W6. Today ⌘J draws its list ABOVE Past Sessions and a
    // person uses it there; under the sheet it closes the sheet first.
    if (on('J')) {
      stage = 'J';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await pressKey(cdp, 'j', 4);
      ({ s } = await until(cdp, (x) => x.store.attention, 3000));
      if (!s.store.attention) f('J', '⌘J under the sheet opened nothing');
      if (s.sheet) f('J', '⌘J left the sheet open under the list, which stacks a layer on it');
      say(`J: after ⌘J the list is ${String(s.store.attention)} and the sheet ${String(s.sheet)}`);
      await pressKey(cdp, 'Escape');
      ({ s } = await until(cdp, (x) => !x.store.attention, 3000));
      if (s.store.attention) f('J', 'Escape did not close the list');
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------------ D
    // The fix round, the batch attack's P1 (major). A double click at the
    // centre of `End 2 sessions`: the first click runs the batch, both local
    // targets end at once and the panel closes by itself, the grid slides up
    // by the panel's height, and the second click lands on an ENDED row's
    // Restore. Built as the attack built it: two ended rows first, then two
    // live ones, the project filter on that folder alone.
    if (on('D')) {
      stage = 'D';
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      await d(cdp, `addProject(${J(P.dbl)})`);
      for (const k of ['ra', 'rb', 'ta', 'tb']) ids[k] = await d(cdp, `createSession(${J({ path: P.dbl, name: `p293-${k}` })})`);
      await until(cdp, (x) => ['ra', 'rb', 'ta', 'tb'].every((k) => x.store.sessions.some((one) => one.id === ids[k] && LIVE.has(one.status))), 20_000);
      for (const k of ['ra', 'rb']) await d(cdp, `killOutOfBand(${J(ids[k])})`);
      await until(cdp, (x) => ['ra', 'rb'].every((k) => ['exited', 'restorable'].includes(x.store.sessions.find((one) => one.id === ids[k])?.status ?? '')), 15_000);
      s = await state(cdp);
      if (!s.sheet) s = await d(cdp, "open('managed')");
      const option = await cdpEval(cdp, `[...document.querySelectorAll('#sm-filter-project option')].map((o) => [o.value, o.textContent]).find(([, l]) => (l ?? '').split(' · ')[0] === 'dbl') ?? null`);
      if (option === null) f('D', 'no project filter option for the dbl folder');
      else await choose(cdp, '#sm-filter-project', option[0]);
      await until(cdp, (x) => x.rows.length === 4, 5000);
      for (const k of ['ta', 'tb']) await click(cdp, `[data-manage-check="${ids[k]}"]`);
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch?.phase === 'confirm', 3000));
      const box = await cdpEval(cdp, `(() => { const el = document.querySelector('[data-sm="batch-confirm"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
      if (box === null) f('D', 'no End 2 sessions button');
      else {
        const m = (type, extra) => cdp.call('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, ...extra });
        await m('mouseMoved', { button: 'none', buttons: 0 });
        await m('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
        await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
        await sleep(200);
        const under = await cdpEval(cdp, `(() => { const el = document.elementFromPoint(${String(box.x)}, ${String(box.y)}); const b = el && el.closest('button, input'); const row = el && el.closest('[data-manage-row]'); return { tag: el ? el.tagName : null, verb: b ? b.getAttribute('data-verb') : null, row: row ? row.getAttribute('data-manage-row') : null, panel: document.querySelector('section.sm-batch') !== null }; })()`);
        await m('mousePressed', { button: 'left', buttons: 1, clickCount: 2 });
        await m('mouseReleased', { button: 'left', buttons: 0, clickCount: 2 });
        await sleep(3000);
        const after = await state(cdp);
        const statusOf = (k) => after.store.sessions.find((one) => one.id === ids[k])?.status ?? null;
        for (const k of ['ra', 'rb']) {
          if (LIVE.has(statusOf(k) ?? '')) f('D', `${k}, ended and never named, reads ${String(statusOf(k))} after the double click: the second click restored it`);
        }
        for (const k of ['ta', 'tb']) {
          if (LIVE.has(statusOf(k) ?? '')) f('D', `${k} was named and reads ${String(statusOf(k))} after the batch`);
        }
        if (after.store.toasts.some((t) => /restored/.test(t.text))) f('D', `a restore was said after the double click: ${J(after.store.toasts.slice(-2))}`);
        readings.doubleClick = { at: box, underAtSecond: under, after: ['ra', 'rb', 'ta', 'tb'].map((k) => `${k}:${String(statusOf(k))}`) };
        say(`D: under the second click ${J(under)}; after it ${readings.doubleClick.after.join(' ')}`);
      }
      await choose(cdp, '#sm-filter-project', 'all');
      await until(cdp, (x) => x.rows.some((r) => r.id === ids.a2), 5000);
      s = await state(cdp);
    }

    // ------------------------------------------------------------------ 12
    if (on('12') || on('R')) {
      stage = '12';
      const goTo = async (arm, key, path, machineId) => {
        const id = ids[key];
        s = await state(cdp);
        if (!s.sheet) s = await d(cdp, "open('managed')");
        const items = await d(cdp, `menuItemsFor(${J(id)})`);
        if (!items.some((i) => i.label === 'Go to session')) return f(arm, `${key}'s menu offers no Go to session: ${J(items.map((i) => i.label))}`);
        await d(cdp, `runMenuItem(${J(id)}, 'Go to session')`);
        const r = await until(cdp, (x) => !x.sheet && x.store.activeSessionId === id, 15_000);
        if (!r.ok) return f(arm, `Go to session on ${key}: sheet ${String(r.s.sheet)}, active ${String(r.s.store.activeSessionId)}; toasts ${J(r.s.store.toasts.slice(-2))}`);
        if (!r.s.store.projects.some((p) => p.path === path && p.machineId === machineId)) f(arm, `${key}'s project did not open as its own target`);
        const k = await until(cdp, (x) => x.focus.terminal, 3000);
        if (!k.ok) f(arm, `after Go to session the keyboard is on ${k.s.focus.desc}, want the terminal`);
        say(`${arm}: Go to session on ${key} landed; the keyboard is on ${k.s.focus.desc}`);
        return null;
      };
      if (on('12')) await goTo('12', 'd1', P.delta, null);
      if (on('R') && typeof ids.r1 === 'string') await goTo('R', 'r1', P.far, MACHINE_ID);
      s = await d(cdp, "open('managed')");
    }

    // ------------------------------------------------------------- 9 and 14
    if (on('9') || on('14')) {
      stage = '9';
      await choose(cdp, '#sm-filter-state', 'running');
      ({ s } = await until(cdp, (x) => x.rows.length > 0 && x.rows.every((r) => LIVE.has(r.status ?? '')), 5000));
      await click(cdp, '#sm-select-all');
      ({ s } = await until(cdp, (x) => checkedIds(x).length > 0, 3000));
      await click(cdp, '[data-sm="end-selected"]');
      ({ s } = await until(cdp, (x) => x.batch?.phase === 'confirm', 3000));
      const named = s.batch?.targets.map((t) => t.id) ?? [];
      const last = named[named.length - 1];
      if (named.length < 2) f('9', `the confirmation names ${String(named.length)} session(s); the arm needs two or more`);
      // THE PRESS, and at once, with no settle after the release, the probe
      // ends the LAST target out of band, as another window would. The press
      // has frozen it as a target already (the renderer had not heard of the
      // kill), so what decides it is the loop's own fresh read before its
      // call: it must read Already ended and End must never be called for it.
      const c = await click(cdp, '[data-sm="batch-confirm"]', 0);
      if (!c.ok) f('9', `the batch confirm: ${c.why}`);
      await d(cdp, `killOutOfBand(${J(last)})`);
      const done = await until(cdp, (x) => x.batch === null || x.batch.phase === 'done', 30_000);
      if (!done.ok) f('9', `the batch did not finish: ${J(done.s.batch)}`);
      const truth = await cdpEval(cdp, 'window.gmux.sessions.list().then((l) => l.map((x) => ({ id: x.id, status: x.status })))', 30_000);
      readings.main.afterBatch = truth;
      for (const id of named) {
        const row = truth.find((x) => x.id === id);
        if (row === undefined || LIVE.has(row.status)) f('9', `${id} was named and reads ${J(row ?? null)} in main's list after the batch`);
      }
      const outcomes = done.s.batch?.targets ?? [];
      const lastOutcome = outcomes.find((t) => t.id === last)?.outcome ?? null;
      readings.batch = { named, last, phase: done.s.batch?.phase ?? 'closed', outcomes };
      if (done.s.batch !== null && lastOutcome !== 'skipped' && lastOutcome !== 'ended') {
        f('9', `the target ended out of band reads outcome ${J(lastOutcome)}, want Already ended (skipped) or, if the kill lost the race, ended`);
      }
      for (const t of outcomes) {
        if (t.id !== last && t.outcome !== 'ended') f('9', `${t.id} reads ${J(t.outcome)}; every other target must end`);
      }
      note(`9: ${String(named.length)} named; the probe ended the last out of band at the press; the panel ${done.s.batch === null ? 'closed by itself (every target reads ended)' : `reads ${J(done.s.batch.heading)} and the last target's outcome is ${J(lastOutcome)}`}`);
      if (on('14')) {
        await sleep(300);
        const k = await state(cdp);
        if (!k.focus.inSheet) f('14', `after the batch the keyboard is on ${k.focus.desc}, outside the sheet`);
        say(`14: after the batch the keyboard is on ${k.focus.desc}`);
      }
    }

    // ----------------------------------------------------------------- 11c
    //
    // HOW MANY ROWS A 900px SHEET HOLDS, MEASURED AND NOT COMPUTED, plus the
    // Past row's own box, pitch and transition, which no other stage can read
    // because the Past tab is empty until something has been removed.
    //
    // IT RUNS LAST ON PURPOSE. It stands twenty one rows up so the count is
    // bounded by the sheet's geometry and never by how many sessions the fixture
    // happens to hold, and nothing downstream should have to see them. In ONE
    // project, because the entry's arithmetic subtracts ONE group header: the
    // project filter is what makes the Managed reading exactly the sum it
    // refutes or confirms.
    //
    // THE FIXTURE IS BUILT THROUGH MAIN'S OWN DOORS, `sessions.kill` then
    // `sessions.discard`, and NOT through the sheet's verbs. The verbs are arms
    // 3 to 6's claim and they press them for real; this is a geometry
    // measurement that needs twenty one tombstones, and twenty one confirmations
    // would cost a minute and prove nothing arm 4 has not already proved.
    // `removeSession` refuses a live session (core.ts's `removeRefusal`), so the
    // kills are awaited as a batch before any discard.
    if (on('11')) {
      stage = '11c';
      const keys11c = ['pastRowBox', 'pastPitch', 'managedRows', 'pastRows'];
      p298Keys.push(...keys11c);
      let sheetOpen = await state(cdp);
      if (!sheetOpen.sheet) sheetOpen = await d(cdp, "open('managed')");
      if (!sheetOpen.sheet) f('11', '11c could not open the sheet');
      await d(cdp, `addProject(${J(P.dense)})`);
      const dense = [];
      for (let i = 0; i < DENSE_ROWS; i += 1) {
        const id = await d(cdp, `createSession(${J({ path: P.dense, name: `p298-d${String(i + 1).padStart(2, '0')}` })})`);
        if (typeof id === 'string') dense.push(id);
      }
      if (dense.length !== DENSE_ROWS) f('11', `11c stood up ${String(dense.length)} of ${String(DENSE_ROWS)} rows, so a count bounded by the fixture could be mistaken for one bounded by the sheet`);

      // One group, nothing filtered out by a search or a state.
      await choose(cdp, '#sm-filter-tab', 'all');
      await choose(cdp, '#sm-filter-state', 'all');
      const option = await cdpEval(cdp, `[...document.querySelectorAll('#sm-filter-project option')].map((o) => [o.value, o.textContent]).find(([, l]) => (l ?? '').split(' · ')[0] === 'dense') ?? null`);
      if (option === null) f('11', 'the project filter offers no `dense` option, so 11c cannot reduce the grid to one group');
      else await choose(cdp, '#sm-filter-project', option[0]);
      await until(cdp, (x) => x.rows.length >= DENSE_ROWS, 15_000);

      const fit = await sizeSheetTo(cdp, 900, 1440);
      if (!fit.ok) f('11', `the sheet would not resolve to 900px of height: it read ${String(fit.sheet)} in a ${String(fit.window)}px window`);
      const stacked = await p(cdp, 'stacked()');
      if ((stacked?.toasts ?? 0) > 0 || (stacked?.batch ?? false) === true || (stacked?.outlet ?? 0) > 0) {
        f('11', `the rows-per-sheet reading is taken with nothing stacked, and ${J(stacked)} says otherwise`);
      }
      const managedRows = await p(cdp, "rowsInside('tr.sm-row')");
      const groupsDrawn = await cdpEval(cdp, "document.querySelectorAll('.modal.session-sheet tr.sm-group').length");
      if (groupsDrawn !== 1) f('11', `the Managed reading wants exactly one group header, and ${String(groupsDrawn)} are drawn`);

      // The same rows, tombstoned, so the Past tab has twenty one of its own.
      for (const id of dense) await cdpEval(cdp, `window.gmux.sessions.kill(${J(id)})`, 30_000);
      const ended = await until(cdp, (x) => dense.every((id) => !LIVE.has(x.store.sessions.find((one) => one.id === id)?.status ?? '')), 40_000);
      if (!ended.ok) f('11', '11c could not end its own rows, so the Past reading has nothing to draw');
      for (const id of dense) await cdpEval(cdp, `window.gmux.sessions.discard(${J(id)})`, 30_000);
      const tombstoned = await until(cdp, (x) => dense.every((id) => x.store.past.includes(id)), 40_000);
      if (!tombstoned.ok) f('11', '11c could not tombstone its own rows');

      // The Past tab draws ONE list with no heading and no group header, which is
      // the arithmetic the entry states for it, so the project filter goes back
      // to all.
      await choose(cdp, '#sm-filter-project', 'all');
      await click(cdp, '#sm-tab-past');
      await until(cdp, (x) => x.tab === 'sm-tab-past' && x.rows.length >= DENSE_ROWS, 15_000);
      const fitPast = await sizeSheetTo(cdp, 900, 1440);
      if (!fitPast.ok) f('11', `the Past sheet would not resolve to 900px: it read ${String(fitPast.sheet)} in a ${String(fitPast.window)}px window`);
      const stackedPast = await p(cdp, 'stacked()');
      if ((stackedPast?.toasts ?? 0) > 0 || (stackedPast?.batch ?? false) === true || (stackedPast?.outlet ?? 0) > 0) {
        f('11', `the Past rows-per-sheet reading is taken with nothing stacked, and ${J(stackedPast)} says otherwise`);
      }
      const pastRows = await p(cdp, "rowsInside('.sm-past-row')");
      const pastBoxes = await p(cdp, 'boxes()');
      const pastGroups = await cdpEval(cdp, "document.querySelectorAll('.modal.session-sheet .sm-past .sm-group').length");
      if (pastGroups !== 0) f('11', `the Past reading wants one list with no group header, and ${String(pastGroups)} are drawn`);
      const pastTokens = await p(cdp, 'tokens()');
      const pastState = await p(cdp, "computedAt('.sm-past-row')");
      findings['11'].push(...transitionFindings(BASE, '.sm-past-row', pastState, pastTokens));

      const g11c = {
        pastRowBox: pastBoxes?.pastRowBox ?? null,
        pastPitch: pastBoxes?.pastPitch ?? null,
        managedRows: managedRows?.inside ?? null,
        pastRows: pastRows?.inside ?? null
      };
      findings['11'].push(...boxFindings(BASE, g11c, keys11c));
      findings['11'].push(...coverageFindings(p298Keys));

      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await sleep(250);
      readings.p298 = { ...(readings.p298 ?? {}), keys11c, dense: dense.length, fit, fitPast, stacked, stackedPast, managedRows, pastRows, pastBoxes, pastState, groupsDrawn, pastGroups, boxes11c: g11c };
      say(`11c: the sheet at ${String(fit.sheet)}px in a ${String(fit.window)}px window; Managed ${String(g11c.managedRows)} of ${String(managedRows?.drawn)} rows wholly inside a ${String(managedRows?.scroller)}px scroller; Past ${String(g11c.pastRows)} of ${String(pastRows?.drawn)} inside ${String(pastRows?.scroller)}px, box ${String(g11c.pastRowBox)} / pitch ${String(g11c.pastPitch)}`);
    }

    // ----------------------------------------------------------------- 11d
    //
    // THE TOAST DOCK, DRIVEN. Real toasts, raised through the app's own door and
    // read as rectangles at one, two, three and four; four real clicks on four
    // ×s; then the sheet CLOSED and one raised again, which is the half every
    // other surface in the app relies on.
    //
    // WHY IT IS HERE AT ALL (the Phase 298 fix round). The dock is the one change
    // in this phase that costs a person a click today and it was never driven:
    // `stacked()` answered { outlet: 0, toasts: 0 } on every run, which says
    // nothing was ever raised, so the clause was a promise that could not fail.
    // The verify accepted it on a code read and said so, which is not proof.
    //
    // THE DOOR IS THE APP'S OWN, and it is not the store reached from outside.
    // `window.__p293.addProject(path)` is `projects-slice.ts`'s `addProjectPath`,
    // which is what the folder picker, a window drop, New Project, Clone and
    // every Open Recent row reach; over a folder that is not there main refuses
    // it in `sessions/core.ts`'s `addProject` with "That folder does not exist."
    // and the slice raises ONE sticky error toast. That is exactly what a person
    // gets from the Open Recent row of a folder they have since moved, the case
    // `recents/open-recent-menu.ts` names in its own header. It adds no project,
    // sets no active project and records no recent, because main throws before
    // `rememberProject`.
    //
    // WHY ERRORS AND NOT INFO. The store's only auto dismiss is a flat 5s timer
    // with no hover pause (`notices-slice.ts`), and `sticky` defaults to true for
    // the error kind alone, so an info toast would leave in the middle of a
    // reading. Sticky is also what makes the × clause real: a sticky toast's only
    // exits are that × and its action button, which is the second reason
    // `pointer-events: none` was refused as the fix.
    //
    // IT RUNS LAST, after 11c, because 11c's rows-per-sheet reading is taken with
    // NOTHING stacked and grades that it was. This stage raises the run's first
    // toast and clears every one of them before it ends.
    if (on('11')) {
      stage = '11d';
      // The Managed tab with nothing filtered out: End lives on a Managed row,
      // and after 11c the sheet is on Past, where the verb is Restore.
      let live11d = await state(cdp);
      if (!live11d.sheet) live11d = await d(cdp, "open('managed')");
      if (!live11d.sheet) f('11', '11d could not open the sheet');
      if (live11d.tab !== 'sm-tab-managed') {
        await click(cdp, '#sm-tab-managed');
        const onManaged = await until(cdp, (x) => x.tab === 'sm-tab-managed', 5000);
        if (!onManaged.ok) f('11', `11d could not reach the Managed tab: it reads ${String(onManaged.s.tab)}`);
      }
      await choose(cdp, '#sm-filter-project', 'all');
      await choose(cdp, '#sm-filter-tab', 'all');
      await choose(cdp, '#sm-filter-state', 'all');
      // A MANAGED row, asked for by tab: `readState().rows` carries both lists,
      // so `rows.length > 0` would be true on the Past tab 11c leaves behind.
      const rowsUp = await until(cdp, (x) => x.rows.some((r) => r.tab === 'managed'), 10_000);
      if (!rowsUp.ok) f('11', `11d has no Managed row to read an End button on: the tab is ${String(rowsUp.s.tab)} and ${String(rowsUp.s.rows.length)} row(s) are drawn`);

      // The size, resolved rather than chosen, and its floor MEASURED off the
      // sheet's own boxes. See TOAST_SHEET_HEIGHTS for both halves of the rule.
      const space4 = await p(cdp, "rootPx('--space-4')");
      const gap4 = space4 === null ? 8 : space4;
      const box11d = await p(cdp, 'boxes()');
      const deepest = TOAST_COUNTS[TOAST_COUNTS.length - 1];
      // The strip is n boxes, n - 1 gaps between them, and its own gap of
      // padding top and bottom.
      const stripDeep = deepest * TOAST_BOX_H + (deepest - 1) * gap4 + 2 * gap4;
      const needRoom = BASE === 'head' ? stripDeep + (box11d?.headThBox ?? 0) + (box11d?.rowBox ?? 0) : 0;
      let usedFit = null;
      let usedScroll = null;
      for (const want of TOAST_SHEET_HEIGHTS) {
        const fitTo = await sizeSheetTo(cdp, want, 1440);
        const scrolled = await p(cdp, 'scrollToEnd()');
        usedFit = { want, ...fitTo };
        usedScroll = scrolled;
        if (fitTo.ok && scrolled !== null && scrolled.scrolls === true && scrolled.clientHeight >= needRoom) break;
      }
      if (usedScroll === null || usedScroll.scrolls !== true) {
        f('11', `11d could not make the grid overflow its scroller at any of ${J(TOAST_SHEET_HEIGHTS)}; the last reading was ${J(usedScroll)} in a ${String(usedFit?.window)}px window, so the End button is not at the sheet's bottom and neither base's clause means anything`);
      } else if (usedScroll.clientHeight < needRoom) {
        f('11', `11d settled on a ${String(usedScroll.clientHeight)}px scroller and the docked strip at ${String(deepest)} toasts takes ${String(stripDeep)}, which leaves less than the heading (${String(box11d?.headThBox)}) plus one row (${String(box11d?.rowBox)}); no End button would sit wholly inside the scroller and every clause about it would read as not asked`);
      }
      say(`11d: the sheet at ${String(usedFit?.sheet)}px (asked ${String(usedFit?.want)}) in a ${String(usedFit?.window)}px window; the scroller is ${String(usedScroll?.clientHeight)} of ${String(usedScroll?.scrollHeight)} and scrolls ${String(usedScroll?.scrolls)}; the floor for a docked ${String(deepest)}-toast strip is ${String(needRoom)}`);

      const spaceSix = await p(cdp, "rootPx('--space-6')");
      const zToast = await cdpEval(cdp, "getComputedStyle(document.documentElement).getPropertyValue('--z-toast').trim()");
      const zero = await p(cdp, 'toastGeo()');
      if (zero === null) f('11', '11d read no geometry with nothing toasted');
      else if (zero.count !== 0) f('11', `11d starts with ${String(zero.count)} toast(s) already up, so what it raises is not its own`);

      /** One real toast through the app's own door, settled and stamped. */
      const raise = async (n) => {
        // A folder inside the run's own scratch directory that was never made.
        const gone = join(root, 'p298-gone', String(n));
        const made = await d(cdp, `addProject(${J(gone)})`);
        if (made !== null) f('11', `11d's door opened ${J(gone)} as project ${J(made)}; that folder must not exist, so no toast was raised`);
        // `.toast` animates in over --dur-base, and a rect read mid-animation is
        // up to 8px out (the keyframe's own translateY).
        await sleep(500);
        return p(cdp, `stampToast(${String(n)})`);
      };

      const reads = [];
      for (const n of TOAST_COUNTS) {
        const stamps = await raise(n);
        const queued = await state(cdp);
        if (queued.store.toasts.length !== n) f('11', `11d raised ${String(n)} toast(s) and the store holds ${J(queued.store.toasts)}`);
        await p(cdp, 'scrollToEnd()');
        const geo = await p(cdp, 'toastGeo()');
        findings['11'].push(...dockFindings(BASE, n, geo));
        reads.push({ n, stamps, geo });
        say(`11d: ${String(n)} toast(s) — stack ${J(geo?.stack?.rect ?? null)} (${String(geo?.stack?.position)}, docked ${String(geo?.stack?.docked)}); ${geo?.end === null ? 'no End button inside the scroller' : `row ${String(geo.end.row)}'s ${J(geo.end.text)} at ${J(geo.end.rect)}, overlap ${J(geo.overlapEnd)}, the point at its centre is ${String(geo.endHit?.desc)}`}; the stack reaches ${String(geo?.sheetBottomReach)}px up past the sheet's bottom`);
      }

      // The End button over the whole set, which is where the clause is proved
      // able to fail. See dockCoverFindings for which count is graded and why.
      findings['11'].push(...dockCoverFindings(BASE, reads));
      note(`11d: the End button against the stack, by toast count on the ${BASE} base — ${reads.map((one) => `${String(one.n)}: reach ${String(one.geo?.sheetBottomReach)}px, overlap ${String(one.geo?.overlapEnd?.area ?? null)}px2, the point at its centre is ${String(one.geo?.endHit?.desc)}`).join('; ')}`);

      // The cap, the `+n more` line and the order, with one more than the cap up.
      const capRaised = TOAST_CAP + 1;
      const capStamps = await raise(capRaised);
      const capQueue = await state(cdp);
      if (capQueue.store.toasts.length !== capRaised) f('11', `11d raised ${String(capRaised)} and the store holds ${String(capQueue.store.toasts.length)}`);
      await p(cdp, 'scrollToEnd()');
      const capGeo = await p(cdp, 'toastGeo()');
      findings['11'].push(...dockCapFindings(BASE, capGeo, capStamps, capRaised));
      say(`11d: ${String(capRaised)} raised — ${String(capGeo?.count)} drawn, overflow ${J(capGeo?.overflow)}, stamps ${J(capStamps)}`);

      // Where the strip's height comes from, against the reading with nothing up.
      findings['11'].push(...dockHeightFindings(BASE, zero, reads[reads.length - 1]?.geo ?? null));

      // FOUR REAL CLICKS ON FOUR ×s. The queue falling is the proof the × took
      // the click, because `dismissToast` is reachable from nothing else.
      const dismissals = [];
      for (let press = 1; press <= capRaised; press += 1) {
        const before = (await state(cdp)).store.toasts.length;
        const hit = await click(cdp, '.toast [aria-label="Dismiss"]');
        const gone = await until(cdp, (x) => x.store.toasts.length < before, 5000);
        const drawn = await cdpEval(cdp, "document.querySelectorAll('.toast').length");
        const stackDrawn = await cdpEval(cdp, "document.querySelector('.toasts') !== null");
        dismissals.push({ press, before, after: gone.s.store.toasts.length, drawn, stackDrawn, clicked: hit.ok, why: hit.why });
      }
      findings['11'].push(...dockDismissFindings(BASE, dismissals));
      say(`11d: the ×s took ${J(dismissals.map((one) => `${String(one.before)}->${String(one.after)} (${String(one.drawn)} drawn)`))}`);

      // THE HALF MOST LIKELY TO HAVE BROKEN: the sheet closed, the stack back
      // exactly where it has always been.
      const shut = await click(cdp, '.session-sheet [aria-label="Close session manager"]');
      if (!shut.ok) f('11', `11d could not close the sheet: ${shut.why}`);
      const noSheet = await until(cdp, (x) => !x.sheet, 5000);
      if (!noSheet.ok) f('11', '11d left the sheet open, so the undocked reading is not an undocked reading');
      const closedStamps = await raise(capRaised + 1);
      const closedGeo = await p(cdp, 'toastGeo()');
      findings['11'].push(...dockClosedFindings(BASE, closedGeo, spaceSix, zToast));
      say(`11d: with the sheet closed the stack is ${String(closedGeo?.stack?.position)} at ${J(closedGeo?.stack?.rect ?? null)}, ${String(closedGeo?.stack?.gapRight)}px from the right and ${String(closedGeo?.stack?.gapBottom)}px from the bottom of a ${String(closedGeo?.window?.width)}x${String(closedGeo?.window?.height)} window (--space-6 is ${String(spaceSix)}), z-index ${String(closedGeo?.stack?.zIndex)} against --z-toast ${String(zToast)}`);

      // Nothing downstream inherits a toast.
      await click(cdp, '.toast [aria-label="Dismiss"]');
      const cleared = await until(cdp, (x) => x.store.toasts.length === 0, 5000);
      if (!cleared.ok) f('11', `11d left ${String(cleared.s.store.toasts.length)} toast(s) up`);

      await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await sleep(250);
      readings.p298 = {
        ...(readings.p298 ?? {}),
        toast: { spaceSix, space4, zToast, usedFit, usedScroll, needRoom, stripDeep, box11d, zero, reads, capRaised, capStamps, capGeo, dismissals, closedStamps, closedGeo }
      };
    }
    stage = 'done';
  } catch (err) {
    throw new Error(`during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    try {
      await d(cdp, 'release()');
    } catch {
      /* the window may be gone; withElectron ends the tree anyway */
    }
  }
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------
writeFileSync(join(outDir, 'readings.json'), `${J({ findings, readings })}\n`);
say('');
for (const arm of ALL_ARMS) {
  const n = findings[arm].length;
  const verdict = !on(arm) ? 'not run' : arm === '15' ? 'NOT DRIVEN' : n === 0 ? 'PASS' : `FAIL ${String(n)}`;
  say(`arm ${arm.padEnd(3)} ${verdict}`);
}
const failures = [];
for (const arm of [...ALL_ARMS, 'RUN']) {
  if (arm === '15') continue;
  if (arm !== 'RUN' && !on(arm)) continue;
  for (const x of findings[arm]) failures.push(`${arm}: ${x}`);
}
say(`readings: ${join(outDir, 'readings.json')}`);
if (failures.length > 0) {
  for (const x of failures) process.stderr.write(`${TAG}   ${x}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`PASS: 0 findings on ${chosen.join(', ')}.${on('15') ? ' 15 was not driven.' : ''}`);
process.exit(0);
