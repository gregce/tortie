#!/usr/bin/env node
/**
 * probe-p284.mjs. THE PHASE 284 APP RUN: the work gets the one outline, and the
 * surround goes quiet.
 *
 * ONE Electron at a time on a scratch profile, a scratch HOME and the tmux
 * socket build/harness-socket.mjs hands it, over one git project it builds
 * inside its own scratch directory. Its sessions are plain shells
 * (`agent: 'shell'`): it spawns no agent, spends no token, opens no keychain
 * and makes no request. It adds NO renderer hook. Everything it drives goes
 * through the harness seams that already ship under `GMUX_PROBES=1`
 * (`window.__gmuxShotDrive`, `window.gmux.settingsSet`) or through real
 * pointer and key events sent over the DevTools protocol, and everything it
 * reads is this file's own page kit, injected from here.
 *
 * ## It judges rectangles, computed styles and hit tests, and ONE pixel per corner
 *
 * The photographs under `out/p284/` are for a person to hold beside the study
 * (`design/prototypes/index.html#surround`). One reading is taken off a
 * capture, and it is the fix round's correction: R7's OUTER point, 2px inside
 * each corner of the frame, is judged by the colour painted there and not by
 * `elementFromPoint`. The first run judged it by the hit test and read a
 * "SQUARE bottom-right corner" in six states whose photographs showed a round
 * one: the terminal's `.xterm-viewport` is a scroll container with a 10px
 * native vertical scrollbar, and Chromium hit-tests a scrollbar against its
 * rectangular box, ignoring the ancestor's rounded `overflow: clip`. The hit
 * was real and the paint was round, and the claim is about the paint. The
 * INNER point, 5px in, is still a hit test: a person can click there and
 * reach the work.
 *
 * A limit of the photographs, stated: the run emulates a 1440 by 900 viewport
 * at `deviceScaleFactor: 1`, and on a 2x display xterm's canvas then draws its
 * glyphs at half scale in the A to G captures. A person judging them by eye
 * may read that as the font shrinking. It is not: every rect and every tmux
 * pane size is read from the layout and is unaffected, and the parent's
 * captures share the artefact.
 *
 * ## The states, in this order, in ONE session (build/p284/SPEC.md S11.1)
 *
 *   A  sessions on the right, sidebar shown, one shell with 300 lines of
 *      scrollback so a thumb exists. Source Control is the default view, so
 *      A ends by asking for the Explorer once, reading R5 alone there
 *      (`.view-header` is drawn in no other state) and going back
 *   B  sessions on top
 *   C  a two-way split, and a tab dragged over it with real pointer events
 *   D  a file open at 1440 wide, which is the editor SPLIT
 *   M  THE EDITOR'S FOOT (Phase 284.1): a 400 line file scrolled to its end
 *      beside the terminal, then the Architecture map opened over the scratch
 *      repository through the pane's own door, the shape probe:p258 uses (the
 *      Architecture switch is seeded ON in each scratch profile with
 *      build/probe-arch-switch.mjs, and the map spawns no agent because the
 *      seed names none). Both are read against the body and the frame. If the
 *      pane does not open in the harness the run says so in a NOTE and reads
 *      a stand-in root wearing the map's own class instead, never nothing.
 *      Then back to D's shape, so E reads what D left
 *   E  the same at 1200 wide, which is the editor OVERLAY and its scrim
 *   F  the file filling the window
 *   G  sidebar hidden and the session list collapsed to its 48px rail
 *   H  focus mode, in and out, with the flying copy's corners recorded at the
 *      moment it is appended. THE WAY OUT IS A CLICK AND THE CHORD. Until
 *      Phase 286 entering the mode took the keyboard out of the session
 *      (`document.activeElement` became `body`, because the flight hides the
 *      surface for a moment and Chromium blurs a hidden element), and the
 *      chord is routed by where the keyboard is, so a second chord with
 *      nothing focused did nothing. The first run pressed it twice with no
 *      click between, never left, and read K, I and J INSIDE the mode, where
 *      the frame is off by design; 16 of its 33 findings were that. Since
 *      Phase 286 the flight gives the keyboard back, so a keyboard outside
 *      the session after the enter is a FINDING here; the click before the
 *      leave stays, because a person may still click, and it keeps K, I and
 *      J readable. If the chord still does not leave, Escape is tried with
 *      the keyboard out of the terminal, and if THAT does not leave the run
 *      stops, so K, I and J can never again be read with the frame off
 *   K  the projects on the left, which is the only state that draws the
 *      project rail's band and the activity bar's ROW form
 *   I  the light base
 *   J  one turned hue on the dark base (`P284_HUE`, 150 by default)
 *
 * ## The readings (SPEC S11.2)
 *
 *   R1   the gutters: 8px to each sidebar, 8px right and bottom, 0 on top
 *   R2   the line: `.work-area::after`, four 1px sides, 14px, 1px OUTSIDE the
 *        work's box, `pointer-events: none`, z-index 301, in `--border-strong`
 *   R3   the clip: every child of the frame clips itself, 13px on the outer
 *        corners and 0 on the inner ones
 *   R4   ONE complete outline in the window, and with a split exactly one
 *        more, which is Phase 40's focused-split box and is named as such;
 *        and that box's corner follows the curve wherever it is the frame's
 *        own corner, read on both panes of the split in turn (fix round)
 *   R5   quiet: the eight hairlines of SPEC S9.3, and Source Control's own
 *        header as a ninth, read alpha 0 and STILL 1px
 *   R6   the line's contrast against BOTH grounds, computed here from the
 *        computed colours, never lower than the hairline it replaces (1.297)
 *   R7   inside the curve: the pixel 2px in from each corner of the frame is
 *        painted in the SURROUND's colour, a hit test 5px in lands inside the
 *        work, and the scroll thumb's foot clears the arc by 8px
 *   R8   the drop zone a dragged tab arms sits inside the clip
 *   R9   both resizers sit in the gutter clear of the line, answer a real
 *        pointer, show `:focus-visible` in accent and move on an arrow key.
 *        THE POINTER READING SETTLES (Phase 284.1). The first form moved the
 *        pointer once and read `:hover` once, 350 ms later, and one HEAD run
 *        produced four R9 findings with boxes, gutters and keyboard widths
 *        identical to two runs that passed. MEASURED IN ONE ENVIRONMENT, and
 *        not established as the cause: in the fixer's run a
 *        `Page.captureScreenshot` between the move and the read moved the
 *        `:hover` chain from the handle to the terminal's canvas every time
 *        (0 of 6 samples lit after a forced frame, 10 of 10 without one),
 *        which reads as Blink re-dispatching hover at the OS pointer's own
 *        position when a frame is produced; the Phase 284.1 reverifier, with
 *        the OS pointer over the window, did NOT reproduce it (14 of 14 lit
 *        behind a forced frame), and its own record holds a clearing that
 *        landed inside the sleep after the second move with no frame at all.
 *        So a single sample was a coin for a reason not fully known, and the
 *        poll below is an improvement and not a closure. The arm now moves
 *        the pointer, moves it again by 1px so the last known position is
 *        the handle's, and polls `:hover` for up to about 800 ms WITHOUT
 *        forcing a frame, grading the first sample that lit, or the last one
 *        when none did, which is still a finding and never a pass. This
 *        is the one poll in the file that must not go through `settled()`,
 *        whose forced frame is the very thing that clears the reading
 *   R10  the band still reads the accent colour while a terminal has the
 *        keyboard, and the active tab still melts and follows the curve
 *   R11  selection: no marker bar, a soft fill, and the row's restrained
 *        outline
 *   R12  no pixel lost: regions plus gutters sum to the window exactly
 *   R13  the titlebar is still 38px
 *   R14  focus mode turns the frame OFF, and the flying copy wears the curve
 *   R15  THE EDITOR'S FOOT (Phase 284.1): `.ed-body` ends 8px above the frame,
 *        every root it draws starts at the body's top and ends at the body's
 *        foot, whatever its `position`, and Monaco's vertical slider with a
 *        long file scrolled to its end clears the arc by the same 8px. The
 *        fix round lifted the roots with a padding plus a per-child
 *        `bottom`, and the map, the one RELATIVE root, moved up 8px under it:
 *        it painted over the tab strip and ended 16px above the frame while
 *        every unit test stayed green, which is why this is read rendered
 *
 * The xterm columns and rows are read off THIS RUN'S tmux server at every
 * state and printed, HEAD beside the parent, so the 8 or 16px is on the page.
 * They are printed and not judged: the resize proof is `probe:sessionfocus`,
 * `probe:p1811` and `probe:p167`, which the main session runs.
 *
 * ## The parent (SPEC S11.3)
 *
 * `P284_PARENT_CHECKOUT=<a BUILT worktree at the parent commit>` runs a SECOND
 * Electron from that checkout, AFTER the first has ended and never beside it,
 * through the same readings, and prints one table with a HEAD and a PARENT
 * column. The parent is expected to FAIL. The run passes when HEAD has 0
 * findings AND the parent has at least one finding on each of R1, R2, R4, R5,
 * R11 and R15: an arm the parent also passes asserts nothing, and that is
 * itself a finding. R15 joined the list in Phase 284.1 by reasoning rather
 * than by a run: the parent has no lift at all, so its editor body ends AT
 * the frame and the body reading alone fails there.
 *
 * ## What it refuses, and what it does not drive
 *
 *   - The socket `gmux` and the socket `default`, by name, before anything
 *     launches, and a run with no `GMUX_TMUX_SOCKET` at all re-runs itself
 *     under build/harness-socket.mjs rather than guessing one.
 *   - `-L gmux` is not named by this file (Phase 353, D-P2). Each build's
 *     launch names the scratch socket, so build/electron-run.mjs's census
 *     reads the operator's server around it, read only and BY IDENTITY, which
 *     is his allowance of 2026-11-02; the identity census this file used to
 *     take itself, and the findings it raised, are gone with it.
 *   - Any agent, even for its version: every probed registry row is hidden
 *     in each build's profile before its launch (build/hidden-agents.mjs),
 *     and the app's own `agents:list` is read back before any state is
 *     driven, a row that resolved being a finding that stops that build.
 *   - Any byte outside `GMUX_HARNESS_DIR` and the photograph directory.
 *   - `conformance:hue`, and every other gate. It reads the running app.
 *   - NOT DRIVEN, and said so in the report rather than passed: a FILE dragged
 *     from Finder over a pane (`.attach-drop-zone` is lit by an OS drag no
 *     DevTools event can start), the native menus, and the View menu's radio
 *     pairs. R8 prints NOT DRIVEN when the tab drag does not arm and then
 *     asserts only the structural half, which is never a pass of the rest.
 *
 * ## Environment
 *
 *   GMUX_TMUX_SOCKET      The scratch socket. build/harness-socket.mjs sets it.
 *   GMUX_HARNESS_DIR      The scratch directory. Set by the same wrapper.
 *   P284_PARENT_CHECKOUT  A BUILT worktree at the parent commit. Optional.
 *   P284_OUT_DIR          Where the photographs and the two readings files go.
 *                         Default `out/p284`. `out/` is gitignored, and
 *                         electron-builder packs `out/**`, so remove the
 *                         directory before a package.
 *   P284_HUE              The turned hue for state J, a whole degree. 150.
 *
 * `npm run probe:p284` builds first. `--self-test` grades this file's own
 * fixtures both ways, HEAD shaped and parent shaped, and launches nothing.
 *
 * ## SAFETY
 *
 * Every Electron is started through build/electron-run.mjs's `withElectron`,
 * which ends the tree it started in a `finally` block whatever happened. The
 * socket is handed in by build/harness-socket.mjs, which names it
 * `gmux-p284-<slug>-<pid>`, ends the server afterwards and unlinks its socket
 * and marker, and since Phase 353 each launch hands that server to the helper
 * too, which ends it in its own `finally`. Every other process this script
 * starts is a synchronous `git` or `tmux` that has exited before the call
 * returns.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import { decodePng, pixel } from '../png-read.mjs';
import { AGENTS_LIST_EXPR, hiddenAgentsBesides, standInsOnlyVerdict, writeHiddenAgents } from '../hidden-agents.mjs';
import { seedArchSwitchOn } from '../probe-arch-switch.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p284]';
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------------------
// The numbers this run holds the rendering against.
//
// BY VALUE, and on purpose. A build script cannot import TypeScript, and a
// probe that read FRAME_GAP out of chrome-geometry.ts would agree with a wrong
// constant. These are the operator's chosen look (build/p284/SPEC.md S0), and
// `chrome-geometry.test.ts` is what holds the CSS and the constants to one
// number; this file holds the PAINTED WINDOW to the same one.
// ---------------------------------------------------------------------------
const GAP = 8;
const EDGE = 1;
const RADIUS = 14;
const INNER = RADIUS - EDGE;
const LINE_Z = '301';
const TITLEBAR_H = 38;
const ROW_RADIUS = 6;
/**
 * Today's hairline, `--border` on `--bg-sidebar`, dark (SPEC S1.2). It is a
 * number at THREE PLACES, and it is compared at three places: the hairline's
 * own exact reading is 1.29663, so a raw comparison against 1.297 would refuse
 * the very line the floor is named after.
 */
const HAIRLINE_FLOOR = 1.297;
const underFloor = (ratio) => Number(ratio.toFixed(3)) < HAIRLINE_FLOOR;
/** The smallest box R4 calls region sized. A row, a field and a chip are under it. */
const REGION_MIN = 240;
const ARMS = [
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'RUN'
];
/** The arms the parent MUST fail, or the arm asserts nothing (SPEC S11.3; R15 since Phase 284.1). */
const PARENT_MUST_FAIL = ['R1', 'R2', 'R4', 'R5', 'R11', 'R15'];
/** How long R9 polls `:hover` for after the second pointer move, in ms. */
const HOVER_SETTLE_MS = 800;
/**
 * The eight rules of SPEC S9.3, by the key the page kit reads them under, and
 * a NINTH the spec's census missed and the SURROUND builder found:
 * `.branch-header` is Source Control's own view header (styles/app.css says
 * why it went quiet with the rest). Source Control is the DEFAULT view, so in
 * every state but one the ninth rule is the header on screen and
 * `.view-header` is not drawn at all; `A-explorer` below is the one state that
 * asks for the Explorer so the fifth rule is read too. The integrator added
 * both on 2026-09-17, before this file had ever run.
 */
const QUIET_RULES = [
  'titlebar.bottom',
  'activitybar.right',
  'activitybar-row.bottom',
  'sidebar.right',
  'view-header.bottom',
  'branch-header.bottom',
  'session-dock.left',
  'dock-toolbar.bottom',
  'prail-band.bottom'
];

// ---------------------------------------------------------------------------
// The graders. Pure, exported, and proved both ways under --self-test.
// ---------------------------------------------------------------------------

const near = (a, b, tol = 0.5) =>
  typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
const r2 = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : n);
/** Two resolved colours, `[r, g, b, a]` in 0..255, equal within one step. */
export const sameColour = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === 4 && b.length === 4 &&
  a.every((v, i) => Math.abs(v - b[i]) <= 1);
const shown = (c) => (Array.isArray(c) ? `rgba(${c.join(', ')})` : String(c));

/** WCAG relative luminance of an sRGB triple in 0..255. */
export function luminance(rgb) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** `fg` laid over an opaque `bg`, so a line with alpha is judged as painted. */
export function over(fg, bg) {
  const a = (fg[3] ?? 255) / 255;
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
}

/** WCAG contrast of two colours, the first composited over the second. */
export function contrast(fg, bg) {
  const l1 = luminance(over(fg, bg));
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * R1. `rects` holds `work`, `titlebar`, `viewport` and whichever of `sidebar`,
 * `activitybar`, `rail` and `dock` is DRAWN (null otherwise). The left gap is 8
 * against the sidebar and 0 against anything else, which is SPEC S5.2's table.
 */
export function gutterFindings(state, rects) {
  const { work, titlebar, viewport } = rects;
  if (!work) return [`${state} no .work-area is drawn, so no gutter was measured`];
  const out = [];
  const want = (label, got, wanted) => {
    if (!near(got, wanted)) out.push(`${state} ${label}: ${String(r2(got))}px want ${String(wanted)}px`);
  };
  const lefts = [
    ['the sidebar', rects.sidebar, GAP],
    ['the activity bar', rects.activitybar, 0],
    ['the project rail', rects.rail, 0]
  ].filter(([, b]) => b);
  lefts.sort((a, b) => b[1].right - a[1].right);
  const neighbour = lefts[0];
  if (neighbour === undefined) want('the gap from the window edge to the work', work.left, 0);
  else want(`the gap from ${neighbour[0]} to the work`, work.left - neighbour[1].right, neighbour[2]);
  if (rects.dock) want('the gap from the work to the session list', rects.dock.left - work.right, GAP);
  else want('the right inset', viewport.width - work.right, GAP);
  want('the bottom inset', viewport.height - work.bottom, GAP);
  if (titlebar) want('the gap under the titlebar', work.top - titlebar.bottom, 0);
  return out;
}

/** R2. `after` is `getComputedStyle(work, '::after')`, flattened by the kit. */
export function lineFindings(state, after, borderStrong) {
  if (!after || after.content === 'none' || after.content === 'normal') {
    return [`${state} .work-area has no ::after, so the work has no outline`];
  }
  const out = [];
  const is = (label, got, wanted) => {
    if (J(got) !== J(wanted)) out.push(`${state} the line's ${label}: ${J(got)} want ${J(wanted)}`);
  };
  is('display', after.display === 'none' ? 'none' : 'drawn', 'drawn');
  is('position', after.position, 'absolute');
  is('pointer-events', after.pointerEvents, 'none');
  is('z-index', after.zIndex, LINE_Z);
  is('four border widths', after.widths, Array(4).fill(`${String(EDGE)}px`));
  is('four border styles', after.styles, Array(4).fill('solid'));
  is('four radii', after.radii, Array(4).fill(`${String(RADIUS)}px`));
  is('inset', after.inset, Array(4).fill(`${String(-EDGE)}px`));
  for (const [i, c] of (after.colours ?? []).entries()) {
    if (!sameColour(c, borderStrong)) {
      out.push(`${state} the line's colour on side ${String(i)}: ${shown(c)} want --border-strong ${shown(borderStrong)}`);
    }
  }
  return out;
}

/** R3. `children` are the frame's drawn element children, in document order. */
export function clipFindings(state, children) {
  if (!Array.isArray(children) || children.length === 0) {
    return [`${state} the frame has no drawn child, so no clip was measured`];
  }
  const out = [];
  const inner = `${String(INNER)}px`;
  children.forEach((c, i) => {
    const first = i === 0;
    const last = i === children.length - 1;
    if (c.overflow.some((o) => o !== 'clip')) {
      out.push(`${state} ${c.name} overflow: ${c.overflow.join(' ')} want clip clip`);
    }
    const want = [first ? inner : '0px', first ? inner : '0px', last ? inner : '0px', last ? inner : '0px'];
    if (J(c.radii) !== J(want)) {
      out.push(`${state} ${c.name} radii (tl tr br bl): ${c.radii.join(' ')} want ${want.join(' ')}`);
    }
  });
  return out;
}

/**
 * R4. Every region-sized complete outline the kit found. With a split on
 * screen exactly one more is sanctioned, Phase 40's focused-split box.
 */
export function outlineFindings(state, outlines, split) {
  const out = [];
  const frames = outlines.filter((o) => o.isFrame);
  const focus = outlines.filter((o) => o.isSplitFocus);
  const others = outlines.filter((o) => !o.isFrame && !o.isSplitFocus);
  if (frames.length !== 1) {
    out.push(`${state} ${String(frames.length)} complete outline(s) on .work-area::after, want exactly 1`);
  }
  if (split && focus.length !== 1) {
    out.push(`${state} ${String(focus.length)} focused-split box(es) (Phase 40), want exactly 1 beside the frame`);
  }
  if (!split && focus.length !== 0) {
    out.push(`${state} a focused-split box is drawn with no split on screen`);
  }
  for (const o of others) {
    out.push(`${state} a SECOND region-sized outline: ${o.name} (${o.kind}, ${String(Math.round(o.width))} by ${String(Math.round(o.height))})`);
  }
  return out;
}

/** R5. `rows` maps a QUIET_RULES key to `{ width, style, colour }` or null. */
export function quietFindings(state, rows) {
  const out = [];
  for (const [key, row] of Object.entries(rows)) {
    if (row === null) continue;
    if (row.colour[3] !== 0) {
      out.push(`${state} ${key} still draws a hairline: ${shown(row.colour)} want alpha 0`);
    }
    if (row.width !== '1px') {
      out.push(`${state} ${key} lost its pixel: border width ${row.width} want 1px (the colour goes and the pixel stays)`);
    }
  }
  return out;
}

/** R5's coverage, asked once per build: a rule nobody read proved nothing. */
export function quietCoverageFindings(seen) {
  return QUIET_RULES.filter((k) => !seen.has(k)).map((k) => `${k} was never on screen in any state, so it was never read`);
}

/** R6. The ratios are returned beside the findings so the report prints them. */
export function contrastReading(state, line, surround, work) {
  if (!Array.isArray(line) || line[3] === 0) {
    return { onSurround: null, onWork: null, findings: [`${state} there is no line to read a contrast from`] };
  }
  const onSurround = contrast(line, surround);
  const onWork = contrast(line, work);
  const findings = [];
  if (underFloor(onSurround)) {
    findings.push(`${state} the line reads ${onSurround.toFixed(3)} on the surround, under the ${String(HAIRLINE_FLOOR)} hairline it replaces`);
  }
  if (underFloor(onWork)) {
    findings.push(`${state} the line reads ${onWork.toFixed(3)} on the work, under the ${String(HAIRLINE_FLOOR)} hairline it replaces`);
  }
  return { onSurround, onWork, findings };
}

/** `[r, g, b, a]` in 0..255 as `#rrggbb`, the form png-read.mjs's `pixel` returns. */
export const hexOf = (c) => `#${[0, 1, 2].map((i) => Math.round(c[i]).toString(16).padStart(2, '0')).join('')}`;
/** Two `#rrggbb` within `levels` per channel. A capture may round a channel by one. */
export function nearColour(a, b, levels = 2) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return x.every((v, i) => !Number.isNaN(v) && Math.abs(v - y[i]) <= levels);
}

/**
 * R7. Four corners. The OUTER point, 2px in on both axes, is 15.56px from the
 * arc's centre and so outside the 14px line: what is painted there must be
 * the surround (`outer.colour`, read off a capture, against `outer.surround`,
 * the resolved ground of `.shell-body`). The INNER point, 5px in, is 11.31px
 * from the centre and inside the curve: a hit test there must reach the work.
 * The outer point WAS a hit test, and the header says why it is not any more.
 */
export function cornerFindings(state, corners) {
  if (!Array.isArray(corners) || corners.length !== 4) return [`${state} the frame's corners were not read`];
  const out = [];
  for (const c of corners) {
    if (typeof c.outer.colour !== 'string' || typeof c.outer.surround !== 'string') {
      out.push(`${state} the ${c.name} corner's outer pixel was not read`);
    } else if (!nearColour(c.outer.colour, c.outer.surround)) {
      out.push(`${state} a SQUARE ${c.name} corner: 2px in from it the pixel is ${c.outer.colour}, not the surround ${c.outer.surround} (the pointer there is over ${c.outer.name})`);
    }
    if (!c.inner.insideWork) {
      out.push(`${state} the ${c.name} corner, 5px in, is over ${c.inner.name}, which is NOT the work`);
    }
  }
  return out;
}

/**
 * R4's second half (fix round). `ring` is the focused pane's rect, the work's
 * rect and the four radii of the pane's `::after`, Phase 40's box. A bottom
 * corner the pane shares with the frame must carry the inner radius, so the
 * box follows the arc instead of being cut by the clip; every other corner
 * stays square. A pane whose TOP corner is the frame's is named: nothing above
 * the tree should ever let that happen.
 */
export function ringFindings(state, ring) {
  if (!ring || !ring.pane || !ring.work) return [`${state} no focused split pane to read the box's corners from`];
  const out = [];
  const inner = `${String(INNER)}px`;
  const shared = (px, py, wx, wy) => near(px, wx, 0.5) && near(py, wy, 0.5);
  const corners = [
    ['top-left', shared(ring.pane.left, ring.pane.top, ring.work.left, ring.work.top), ring.radii[0], true],
    ['top-right', shared(ring.pane.right, ring.pane.top, ring.work.right, ring.work.top), ring.radii[1], true],
    ['bottom-right', shared(ring.pane.right, ring.pane.bottom, ring.work.right, ring.work.bottom), ring.radii[2], false],
    ['bottom-left', shared(ring.pane.left, ring.pane.bottom, ring.work.left, ring.work.bottom), ring.radii[3], false]
  ];
  for (const [name, isFrames, radius, top] of corners) {
    if (isFrames && top) out.push(`${state} the focused pane's ${name} corner is the frame's, which no band above the tree should allow`);
    const want = isFrames && !top ? inner : '0px';
    if (radius !== want) {
      out.push(`${state} the focused-split box's ${name} radius is ${String(radius)} want ${want}${isFrames ? ' (the corner is the frame\'s)' : ''}`);
    }
  }
  return out;
}

/** R7's scroll thumb. `must` is true in the state that seeded 300 lines. */
export function thumbFindings(state, thumbs, must) {
  if (thumbs.length === 0) {
    return must ? [`${state} no scroll thumb is drawn over 300 lines of history, so its foot was not measured`] : [];
  }
  return thumbs
    .filter((t) => t.gap < GAP - 0.5)
    .map((t) => `${state} a scroll thumb's foot is ${String(r2(t.gap))}px above its pane's, want at least ${String(GAP)} so the curve cannot cut it`);
}

/** R7 and R8's containment: `box` lies wholly inside `work`. */
export function insideFindings(state, label, box, work) {
  if (!box) return [`${state} ${label} is not drawn`];
  if (!work) return [`${state} no .work-area to hold ${label} against`];
  const ok = box.left >= work.left - 0.5 && box.top >= work.top - 0.5 &&
    box.right <= work.right + 0.5 && box.bottom <= work.bottom + 0.5;
  return ok ? [] : [`${state} ${label} (${String(r2(box.left))},${String(r2(box.top))} to ${String(r2(box.right))},${String(r2(box.bottom))}) reaches outside the work`];
}

/**
 * R9. `gutter` is `[from, to]`, the x range the handle may occupy: the 8px gap
 * less the pixel the line takes, which is the one nearest the work.
 */
export function resizerFindings(state, name, r, tokens) {
  if (!r || !r.box) return [`${state} the ${name} resizer is not drawn`];
  const out = [];
  if (r.box.left < r.gutter[0] - 0.5 || r.box.right > r.gutter[1] + 0.5) {
    out.push(`${state} the ${name} resizer spans x ${String(r2(r.box.left))} to ${String(r2(r.box.right))}, want inside the gutter ${String(r2(r.gutter[0]))} to ${String(r2(r.gutter[1]))}, clear of the line`);
  }
  if (!r.hover) out.push(`${state} the ${name} resizer's :hover was never read under the pointer`);
  else {
    if (!r.hover.hovered) out.push(`${state} the ${name} resizer does not match :hover under a real pointer${r.hoverSamples === undefined ? '' : ` (${String(r.hoverSamples)} sample(s) over ${String(HOVER_SETTLE_MS)} ms)`}`);
    if (!sameColour(r.hover.background, tokens.borderStrong)) {
      out.push(`${state} the ${name} resizer under the pointer reads ${shown(r.hover.background)} want --border-strong ${shown(tokens.borderStrong)}`);
    }
  }
  if (!r.focus.active) out.push(`${state} the ${name} resizer could not take the keyboard`);
  if (!r.focus.focusVisible) out.push(`${state} the ${name} resizer does not match :focus-visible after a real Tab`);
  if (!sameColour(r.focus.background, tokens.accent)) {
    out.push(`${state} the ${name} resizer with the keyboard reads ${shown(r.focus.background)} want --accent ${shown(tokens.accent)}`);
  }
  if (near(r.widths[0], r.widths[1], 0.01)) {
    out.push(`${state} an arrow key did not move the ${name}: ${String(r2(r.widths[0]))}px before and after`);
  }
  return out;
}

/**
 * R9's settle (Phase 284.1). The `:hover` reading to grade, out of the samples
 * the poll took after the second pointer move: the FIRST sample in which the
 * handle matched, because the question is whether a real pointer lit it at
 * all, and when no sample did, the LAST one, so the report names what the
 * pointer left behind and a poll that never lit is a finding, never a pass.
 */
export function hoverPick(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  return samples.find((s) => s && s.hovered === true) ?? samples[samples.length - 1];
}

/**
 * R15. The editor's foot. `foot` is the kit's reading: the frame's box, the
 * body's box and every drawn direct child of the body with its computed
 * `position`; `slider` and `track` are Monaco's vertical slider and its
 * lane, read when a file is open, and `mustSlider` says a long file was
 * scrolled to its end so the slider's foot is owed.
 */
export function footFindings(state, foot, mustSlider = false) {
  if (!foot || !foot.frame || !foot.body) return [`${state} no editor body to read the foot of`];
  const out = [];
  const want = foot.frame.bottom - GAP;
  if (!near(foot.body.bottom, want)) {
    out.push(`${state} the editor body ends ${String(r2(foot.frame.bottom - foot.body.bottom))}px above the frame, want ${String(GAP)}`);
  }
  const roots = Array.isArray(foot.roots) ? foot.roots : [];
  if (roots.length === 0) out.push(`${state} the editor body draws no root, so no foot was read`);
  for (const r of roots) {
    const who = `${r.name} (${r.position}${r.standIn ? ', a stand-in' : ''})`;
    if (!near(r.box.top, foot.body.top)) {
      out.push(`${state} ${who} starts at y ${String(r2(r.box.top))}, ${String(r2(foot.body.top - r.box.top))}px above the body's top ${String(r2(foot.body.top))}, over the tab strip`);
    }
    if (!near(r.box.bottom, want)) {
      out.push(`${state} ${who} ends ${String(r2(foot.frame.bottom - r.box.bottom))}px above the frame, want ${String(GAP)}`);
    }
  }
  if (mustSlider) {
    if (!foot.slider || !foot.track) out.push(`${state} no vertical slider is drawn over a 400 line file, so its foot was not measured`);
    else if (!near(foot.slider.bottom, foot.track.bottom, 1)) {
      out.push(`${state} the file was not scrolled to its end (slider ${String(r2(foot.slider.bottom))}, lane ${String(r2(foot.track.bottom))}), so the slider's foot was not measured`);
    } else if (foot.slider.bottom > want + 0.5) {
      out.push(`${state} Monaco's slider ends ${String(r2(foot.frame.bottom - foot.slider.bottom))}px above the frame, want at least ${String(GAP)} so the curve cannot cut it`);
    }
  }
  return out;
}

/** R10. `band.orientation` says which child draws the hairline. */
export function bandFindings(state, band, tokens) {
  const out = [];
  if (!band.focused) out.push(`${state} no .term-header.term-focused after a real click into the terminal`);
  const drawer = band.orientation === 'right' ? band.identity : band.filler;
  const drawerName = band.orientation === 'right' ? 'the identity strip' : 'the tab filler';
  if (!drawer) out.push(`${state} ${drawerName} is not drawn, so the band's hairline was not read`);
  else if (!sameColour(drawer, tokens.accent)) {
    out.push(`${state} ${drawerName}'s bottom border reads ${shown(drawer)} want --accent ${shown(tokens.accent)}`);
  }
  if (band.orientation === 'top') {
    const tab = band.activeTab;
    if (!tab) return [...out, `${state} no active tab is drawn`];
    if (tab.bottom[3] !== 0) out.push(`${state} the active tab no longer melts: its bottom border reads ${shown(tab.bottom)} want alpha 0`);
    if (!sameColour(tab.shadowColour, tokens.accent)) {
      out.push(`${state} the active tab's top inset reads ${shown(tab.shadowColour)} want --accent ${shown(tokens.accent)}`);
    }
    if (tab.first && tab.topLeftRadius !== `${String(INNER)}px`) {
      out.push(`${state} the first tab's top-left radius is ${tab.topLeftRadius} want ${String(INNER)}px, so the curve cuts its accent bar`);
    }
  }
  return out;
}

/** R11. Each of the four keys is read only in the state that draws it. */
export function selectionFindings(state, sel, tokens) {
  const out = [];
  const noBar = (label, before) => {
    if (before !== 'none') out.push(`${state} ${label} still draws its marker bar (::before content ${J(before)})`);
  };
  if (sel.row) {
    noBar('the selected session row', sel.row.before);
    if (!sameColour(sel.row.background, tokens.bgActive)) out.push(`${state} the selected row's ground reads ${shown(sel.row.background)} want --bg-active ${shown(tokens.bgActive)}`);
    if (sel.row.outlineStyle !== 'solid' || sel.row.outlineWidth !== '1px') out.push(`${state} the selected row's outline is ${sel.row.outlineWidth} ${sel.row.outlineStyle} want 1px solid`);
    else if (!sameColour(sel.row.outlineColour, tokens.borderActive) && !sameColour(sel.row.outlineColour, tokens.borderStrong)) {
      // SPEC S1.4 names --border-strong as the one stated fallback on this
      // declaration, so either token is the phase's and anything else is not.
      out.push(`${state} the selected row's outline reads ${shown(sel.row.outlineColour)} want --border-active ${shown(tokens.borderActive)}`);
    }
    if (sel.row.radius !== `${String(ROW_RADIUS)}px`) out.push(`${state} the selected row's radius is ${sel.row.radius} want ${String(ROW_RADIUS)}px`);
  }
  if (sel.item) {
    noBar('the active activity item', sel.item.before);
    if (!sameColour(sel.item.background, tokens.bgActive)) out.push(`${state} the active item's ground reads ${shown(sel.item.background)} want --bg-active ${shown(tokens.bgActive)}`);
    if (sel.item.clip !== 'content-box') out.push(`${state} the active item's background-clip is ${sel.item.clip} want content-box, the chip`);
  }
  if (sel.hovered) {
    if (!sameColour(sel.hovered.background, tokens.bgRaised)) out.push(`${state} an inactive item under a real pointer reads ${shown(sel.hovered.background)} want --bg-raised ${shown(tokens.bgRaised)}`);
    if (sel.hovered.clip !== 'content-box') out.push(`${state} an inactive item under a real pointer has background-clip ${sel.hovered.clip}: the hover rule used the background shorthand and squared the chip`);
  }
  if (sel.railItem) noBar('the selected item on the collapsed session rail', sel.railItem.before);
  if (sel.prailRow) noBar('the selected row on the project rail', sel.prailRow.before);
  return out;
}

/** R12. `regions` are `.shell-body`'s drawn children, left to right. */
export function sumFindings(state, regions, viewportWidth) {
  if (regions.length === 0) return [`${state} .shell-body draws no region`];
  const out = [];
  let expectGaps = 0;
  let at = 0;
  regions.forEach((r, i) => {
    const prev = regions[i - 1];
    let want = 0;
    if (r.isWork && prev && prev.isSidebar) want = GAP;
    if (prev && prev.isWork) want = GAP;
    expectGaps += want;
    if (!near(r.left - at, want)) out.push(`${state} ${String(r2(r.left - at))}px before ${r.name} want ${String(want)}px`);
    at = r.right;
  });
  const tail = regions[regions.length - 1].isWork ? GAP : 0;
  expectGaps += tail;
  if (!near(viewportWidth - at, tail)) out.push(`${state} ${String(r2(viewportWidth - at))}px after ${regions[regions.length - 1].name} want ${String(tail)}px`);
  const sum = regions.reduce((n, r) => n + r.width, 0) + expectGaps;
  if (!near(sum, viewportWidth, 0.01)) out.push(`${state} the regions and gutters sum to ${String(r2(sum))}px in a ${String(viewportWidth)}px window`);
  return out;
}

/** R13. */
export function titlebarFindings(state, titlebar) {
  if (!titlebar) return [`${state} no .titlebar is drawn`];
  return near(titlebar.height, TITLEBAR_H, 0.01) ? [] : [`${state} the titlebar is ${String(r2(titlebar.height))}px tall want ${String(TITLEBAR_H)}px`];
}

/** `"13px"` or `"10.4px 9.75px"` as `[rx, ry]`, and `""` as `[0, 0]`. */
export function radiusPair(text) {
  const parts = String(text ?? '').trim().split(/\s+/).filter((p) => p !== '').map((p) => parseFloat(p));
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return [0, 0];
  return parts.length === 1 ? [parts[0], parts[0]] : [parts[0], parts[1]];
}

/**
 * R14. `on` is the frame read WHILE focus mode is on. `enter` and `leave` are
 * the copies the observer recorded at the moment each was appended, with
 * `first` the surface's rect read before the chord (SPEC S3.8).
 */
export function focusFindings(on, enter, leave, viewport) {
  const out = [];
  if (!on.focused) return ['H the chord did not turn focus mode on, so nothing about it was read'];
  const want = { left: 0, top: TITLEBAR_H, width: viewport.width, height: viewport.height - TITLEBAR_H };
  for (const k of Object.keys(want)) {
    if (!near(on.work?.[k], want[k])) out.push(`H in focus mode the work's ${k} is ${String(r2(on.work?.[k]))} want ${String(want[k])}`);
  }
  if (J(on.radii) !== J(Array(4).fill('0px'))) out.push(`H in focus mode the work's radii are ${on.radii.join(' ')} want 0px on all four`);
  if (on.after && on.after.content !== 'none' && on.after.display !== 'none') out.push('H in focus mode the line is still drawn: ::after display is not none');
  if (!enter) out.push('H no flying copy was appended on the way in');
  else if (!enter.first || !(enter.box?.width > 0) || !(enter.box?.height > 0)) {
    out.push('H the copy on the way in has no measured start or no laid out box, so its scale cannot be derived');
  } else {
    const last = enter.box;
    const sx = enter.first.width / last.width;
    const sy = enter.first.height / last.height;
    const got = radiusPair(enter.radii.bottomLeft);
    const wanted = [INNER / sx, INNER / sy];
    if (!near(got[0], wanted[0], 0.05) || !near(got[1], wanted[1], 0.05)) {
      out.push(`H on the way in the copy's bottom-left radius is ${J(enter.radii.bottomLeft)} want ${wanted[0].toFixed(2)}px ${wanted[1].toFixed(2)}px, which is ${String(INNER)}px after its scale`);
    }
  }
  if (!leave) out.push('H no flying copy was appended on the way out');
  else {
    const got = radiusPair(leave.radii.bottomLeft);
    if (!near(got[0], INNER, 0.05) || !near(got[1], INNER, 0.05)) {
      out.push(`H on the way out the copy's bottom-left radius is ${J(leave.radii.bottomLeft)} want ${String(INNER)}px`);
    }
  }
  return out;
}

/** SPEC S11.3. An arm the parent also passes asserts nothing. */
export function parentVerdict(parentArms) {
  return PARENT_MUST_FAIL.filter((a) => (parentArms[a] ?? []).length === 0).map(
    (a) => `the parent build ALSO passes ${a}, so that arm asserts nothing about this phase`
  );
}


// ---------------------------------------------------------------------------
// --self-test. Every grader on a HEAD shaped fixture and a parent shaped one.
// ---------------------------------------------------------------------------
function selfTest() {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);
  const T = {
    borderStrong: hex('#353943'), borderActive: hex('#2d3038'), bgActive: hex('#252931'),
    bgRaised: hex('#1e2026'), accent: hex('#5b8def'), border: hex('#25282e')
  };
  const sidebar = hex('#0e0f13');
  const canvas = hex('#131417');
  const clear = [0, 0, 0, 0];
  const vp = { width: 1440, height: 900 };
  const box = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
  const headRects = {
    viewport: vp, titlebar: box(0, 0, 1440, 38), activitybar: box(0, 38, 48, 900), rail: null,
    sidebar: box(48, 38, 328, 900), work: box(336, 38, 1232, 892), dock: box(1240, 38, 1440, 900)
  };
  const parentRects = { ...headRects, work: box(328, 38, 1240, 900) };
  const headAfter = {
    content: '""', display: 'block', position: 'absolute', pointerEvents: 'none', zIndex: '301',
    widths: Array(4).fill('1px'), styles: Array(4).fill('solid'), radii: Array(4).fill('14px'),
    inset: Array(4).fill('-1px'), colours: Array(4).fill(T.borderStrong)
  };
  const frame = { isFrame: true, isSplitFocus: false, name: 'div.work-area::after', kind: 'border', width: 898, height: 856 };
  const splitBox = { isFrame: false, isSplitFocus: true, name: 'div.split-pane.focused::after', kind: 'border', width: 548, height: 818 };
  const stray = { isFrame: false, isSplitFocus: false, name: 'aside.sidebar', kind: 'border', width: 280, height: 862 };
  const quietRow = (colour, width = '1px') => ({ colour, width, style: 'solid' });
  /** A corner whose outer pixel is `painted` (a hex) and whose inner hit is or is not the work. */
  const corner = (painted, innerIn, name = 'bottom-right') => ({
    name, outer: { colour: painted, surround: hexOf(sidebar), name: 'div.xterm-viewport' },
    inner: { insideWork: innerIn, name: innerIn ? 'main.center' : 'div.shell-body' }
  });
  const ringOf = (pane, radii) => ({ pane, work: headRects.work, radii });
  const goodResizer = {
    box: box(329, 38, 334, 900), gutter: [328, 335],
    hover: { hovered: true, background: T.borderStrong },
    focus: { active: true, focusVisible: true, background: T.accent }, widths: [280, 296]
  };
  const headRow = { before: 'none', background: T.bgActive, outlineStyle: 'solid', outlineWidth: '1px', outlineColour: T.borderActive, radius: '6px' };
  const headItem = { before: 'none', background: T.bgActive, clip: 'content-box' };
  const regions = (workLeft, workRight) => [
    { name: 'activity-bar', left: 0, right: 48, width: 48 },
    { name: 'sidebar', left: 48, right: 328, width: 280, isSidebar: true },
    { name: 'work-area', left: workLeft, right: workRight, width: workRight - workLeft, isWork: true },
    { name: 'session-dock', left: 1240, right: 1440, width: 200 }
  ];
  const first = box(336, 74, 1232, 892);
  const last = box(0, 38, 1440, 900);
  const enterCopy = (radius) => ({ first, box: last, radii: { bottomLeft: radius } });
  const sx = first.width / last.width;
  const sy = first.height / last.height;
  const onFocus = { focused: true, work: { left: 0, top: 38, width: 1440, height: 862 }, radii: Array(4).fill('0px'), after: { content: '""', display: 'none' } };
  /** R15's reading: the editor beside the terminal, its body ending at `bodyBottom`, over the roots given as [name, position, top, bottom, standIn?]. */
  const footOf = (bodyBottom, roots) => ({
    frame: headRects.work, tabs: box(577, 38, 1232, 74), body: box(577, 74, 1232, bodyBottom),
    roots: roots.map(([name, position, top, bottom, standIn]) => ({ name, position, box: box(577, top, 1232, bottom), standIn: standIn === true }))
  });
  const count = (list) => list.length;

  const fixtures = [
    // The arithmetic, against the numbers SPEC S1.1 computed on 2026-09-17.
    ['the line on the dark surround reads 1.658', () => contrast(T.borderStrong, sidebar).toFixed(3), '1.658'],
    ['the line on the dark canvas reads 1.594', () => contrast(T.borderStrong, canvas).toFixed(3), '1.594'],
    ['the line on the light surround reads 1.866', () => contrast(hex('#adb1ba'), hex('#edeff3')).toFixed(3), '1.866'],
    ['the line on the light canvas reads 2.002', () => contrast(hex('#adb1ba'), hex('#f5f7fa')).toFixed(3), '2.002'],
    ["today's hairline reads 1.297, the floor", () => contrast(T.border, sidebar).toFixed(3), '1.297'],
    ['a half transparent line is judged as painted', () => contrast([255, 255, 255, 128], [0, 0, 0, 255]) < contrast([255, 255, 255, 255], [0, 0, 0, 255]), true],
    // R1
    ['R1 HEAD has no findings', () => gutterFindings('A', headRects), []],
    ['R1 the parent is caught three times: 0, 0 and 0', () => count(gutterFindings('A', parentRects)), 3],
    ['R1 with the sidebar away the left gap is 0 against the activity bar', () => gutterFindings('G', { ...headRects, sidebar: null, work: box(48, 38, 1232, 892) }), []],
    ['R1 with no session list the right INSET is 8', () => gutterFindings('B', { ...headRects, dock: null, work: box(336, 38, 1432, 892) }), []],
    ['R1 a work that keeps the 8px with the sidebar away is caught', () => count(gutterFindings('G', { ...headRects, sidebar: null, work: box(56, 38, 1232, 892) })), 1],
    // R2
    ['R2 HEAD has no findings', () => lineFindings('A', headAfter, T.borderStrong), []],
    ['R2 the parent has no ::after', () => lineFindings('A', { content: 'none' }, T.borderStrong), ['A .work-area has no ::after, so the work has no outline']],
    ['R2 a line drawn INSIDE the box is caught', () => count(lineFindings('A', { ...headAfter, inset: Array(4).fill('0px') }, T.borderStrong)), 1],
    ['R2 a line that takes the pointer is caught', () => count(lineFindings('A', { ...headAfter, pointerEvents: 'auto' }, T.borderStrong)), 1],
    ['R2 a line in the weaker hairline token is caught on all four sides', () => count(lineFindings('A', { ...headAfter, colours: Array(4).fill(T.border) }, T.borderStrong)), 4],
    // R3
    ['R3 one child carries all four corners', () => clipFindings('A', [{ name: 'div.work-row', overflow: ['clip', 'clip'], radii: Array(4).fill('13px') }]), []],
    ['R3 a strip over a row splits the corners between them', () => clipFindings('B', [
      { name: 'div.term-header', overflow: ['clip', 'clip'], radii: ['13px', '13px', '0px', '0px'] },
      { name: 'div.work-row', overflow: ['clip', 'clip'], radii: ['0px', '0px', '13px', '13px'] }
    ]), []],
    ['R3 the parent clips nothing and rounds nothing', () => count(clipFindings('A', [{ name: 'div.work-row', overflow: ['visible', 'visible'], radii: Array(4).fill('0px') }])), 2],
    ['R3 a hidden box, which is a scroll container, is caught', () => count(clipFindings('A', [{ name: 'div.work-row', overflow: ['hidden', 'hidden'], radii: Array(4).fill('13px') }])), 1],
    // R4
    ['R4 one outline and it is the frame', () => outlineFindings('A', [frame], false), []],
    ['R4 a split adds exactly the Phase 40 box', () => outlineFindings('C', [frame, splitBox], true), []],
    ['R4 the parent draws no outline', () => count(outlineFindings('A', [], false)), 1],
    ['R4 a second region sized outline is named', () => outlineFindings('A', [frame, stray], false), ['A a SECOND region-sized outline: aside.sidebar (border, 280 by 862)']],
    ['R4 a split with no focus box is caught', () => count(outlineFindings('C', [frame], true)), 1],
    // R5
    ['R5 a quiet rule has no findings', () => quietFindings('A', { 'titlebar.bottom': quietRow(clear), 'prail-band.bottom': null }), []],
    ['R5 the parent hairline is caught', () => count(quietFindings('A', { 'titlebar.bottom': quietRow(T.border) })), 1],
    ['R5 a DELETED border is caught: the pixel went with the colour', () => count(quietFindings('A', { 'titlebar.bottom': quietRow(clear, '0px') })), 1],
    ['R5 a rule never on screen is named', () => count(quietCoverageFindings(new Set(QUIET_RULES.slice(0, 6)))), QUIET_RULES.length - 6],
    ['R5 the list holds the ninth rule, Source Control\'s own header', () => QUIET_RULES.includes('branch-header.bottom') && QUIET_RULES.length, 9],
    // R6
    ['R6 the dark line passes on both grounds', () => contrastReading('A', T.borderStrong, sidebar, canvas).findings, []],
    ['R6 a line in the hairline token fails on the canvas', () => count(contrastReading('A', T.border, sidebar, canvas).findings), 1],
    ['R6 no line is a finding, not a pass', () => count(contrastReading('A', clear, sidebar, canvas).findings), 1],
    // R7
    ['R7 a round corner has no findings', () => cornerFindings('A', Array(4).fill(corner(hexOf(sidebar), true))), []],
    ['R7 a capture one level off is still the surround', () => cornerFindings('A', Array(4).fill(corner('#0e0f12', true))), []],
    ['R7 the parent has four square corners: the canvas is painted there', () => count(cornerFindings('A', Array(4).fill(corner(hexOf(canvas), true)))), 4],
    ['R7 a square corner names the pixel, the surround and what the pointer is over', () => cornerFindings('A', [corner(hexOf(canvas), true), ...Array(3).fill(corner(hexOf(sidebar), true))]), [`A a SQUARE bottom-right corner: 2px in from it the pixel is ${hexOf(canvas)}, not the surround ${hexOf(sidebar)} (the pointer there is over div.xterm-viewport)`]],
    ['R7 a corner under the line\'s own colour is caught', () => count(cornerFindings('A', [corner(hexOf(T.borderStrong), true), ...Array(3).fill(corner(hexOf(sidebar), true))])), 1],
    ['R7 a corner the work does not reach is caught', () => count(cornerFindings('A', [corner(hexOf(sidebar), false), ...Array(3).fill(corner(hexOf(sidebar), true))])), 1],
    ['R7 an unread pixel is a finding, not a pass', () => count(cornerFindings('A', [{ name: 'top-left', outer: { name: 'div.shell-body' }, inner: { insideWork: true, name: 'main.center' } }, ...Array(3).fill(corner(hexOf(sidebar), true))])), 1],
    ['a hex is read back from a channel triple', () => hexOf([14, 15, 19, 255]), '#0e0f13'],
    ['near colour: two levels is near and three is not', () => [nearColour('#0e0f13', '#0c0d11'), nearColour('#0e0f13', '#0b0f13')], [true, false]],
    // R4's second half: the focused-split box at the frame's corner.
    ['R4 the left pane of a split rounds its bottom-left corner alone', () => ringFindings('C', ringOf(box(336, 74, 783, 892), ['0px', '0px', '0px', '13px'])), []],
    ['R4 the right pane rounds its bottom-right corner alone', () => ringFindings('C', ringOf(box(785, 74, 1232, 892), ['0px', '0px', '13px', '0px'])), []],
    ['R4 a pane beside a split editor shares only the bottom-left, and its right stays square', () => ringFindings('D', ringOf(box(336, 74, 700, 892), ['0px', '0px', '0px', '13px'])), []],
    ['R4 the parent box is square at the frame\'s corner and is caught', () => count(ringFindings('C', ringOf(box(336, 74, 783, 892), Array(4).fill('0px')))), 1],
    ['R4 a box rounded at a corner that is not the frame\'s is caught', () => count(ringFindings('C', ringOf(box(336, 74, 783, 892), ['0px', '0px', '13px', '13px']))), 1],
    ['R4 a pane whose top corner is the frame\'s is named', () => count(ringFindings('C', ringOf(box(336, 38, 783, 892), ['0px', '0px', '0px', '13px']))), 1],
    ['R4 no focused pane is a finding, not a pass', () => count(ringFindings('C', { pane: null, work: headRects.work, radii: [] })), 1],
    ['R7 a thumb 8px up is clear', () => thumbFindings('A', [{ gap: 8 }], true), []],
    ['R7 a thumb at the foot is under the curve', () => count(thumbFindings('A', [{ gap: 0 }], true)), 1],
    ['R7 no thumb over 300 lines is a finding, not a pass', () => count(thumbFindings('A', [], true)), 1],
    ['R7 a panel inside the work has no findings', () => insideFindings('E', 'the editor overlay', box(700, 38, 1232, 892), headRects.work), []],
    ['R7 a panel that reaches over the session list is caught', () => count(insideFindings('E', 'the editor overlay', box(700, 38, 1240, 900), headRects.work)), 1],
    // R9
    ['R9 a handle in the gutter that answers has no findings', () => resizerFindings('A', 'sidebar', goodResizer, T), []],
    ['R9 the parent handle overhangs a divider that is gone', () => count(resizerFindings('A', 'sidebar', { ...goodResizer, box: box(325, 38, 330, 900) }, T)), 1],
    ['R9 a handle with no focus state is caught', () => count(resizerFindings('A', 'dock', { ...goodResizer, focus: { active: true, focusVisible: true, background: clear } }, T)), 1],
    ['R9 a handle an arrow key cannot move is caught', () => count(resizerFindings('A', 'dock', { ...goodResizer, widths: [200, 200] }, T)), 1],
    // R9's settle (Phase 284.1): the poll's samples, and what is graded.
    ['R9 the settle grades the first sample that lit, and that sample passes', () => resizerFindings('A', 'sidebar', { ...goodResizer, hover: hoverPick([{ hovered: false, background: clear }, { hovered: true, background: T.borderStrong }, { hovered: false, background: clear }]), hoverSamples: 3 }, T), []],
    ['R9 a pointer that never lit the handle grades the LAST sample, which is two findings', () => count(resizerFindings('A', 'sidebar', { ...goodResizer, hover: hoverPick([{ hovered: false, background: clear }, { hovered: false, background: clear }]), hoverSamples: 2 }, T)), 2],
    ['R9 the never-lit finding names the sample count and the budget', () => resizerFindings('A', 'sidebar', { ...goodResizer, hover: hoverPick([{ hovered: false, background: T.borderStrong }]), hoverSamples: 1 }, T), [`A the sidebar resizer does not match :hover under a real pointer (1 sample(s) over ${String(HOVER_SETTLE_MS)} ms)`]],
    ['R9 no sample at all is a finding, not a pass and not a crash', () => count(resizerFindings('A', 'sidebar', { ...goodResizer, hover: hoverPick([]) }, T)), 1],
    ['R9 the pick over one lit sample is that sample', () => hoverPick([{ hovered: true, background: T.borderStrong }]), { hovered: true, background: T.borderStrong }],
    // R10
    ['R10 the focused band on the right', () => bandFindings('A', { focused: true, orientation: 'right', identity: T.accent }, T), []],
    ['R10 the focused band on top, melted and curved', () => bandFindings('B', { focused: true, orientation: 'top', filler: T.accent, activeTab: { bottom: clear, shadowColour: T.accent, first: true, topLeftRadius: '13px' } }, T), []],
    ['R10 a band that lost its rule is caught', () => count(bandFindings('A', { focused: true, orientation: 'right', identity: clear }, T)), 1],
    ['R10 the parent first tab is square', () => count(bandFindings('B', { focused: true, orientation: 'top', filler: T.accent, activeTab: { bottom: clear, shadowColour: T.accent, first: true, topLeftRadius: '0px' } }, T)), 1],
    // R11
    ['R11 the soft fill and the restrained outline', () => selectionFindings('A', { row: headRow, item: headItem, hovered: { background: T.bgRaised, clip: 'content-box' } }, T), []],
    ['R11 the stated fallback token on the row outline is accepted', () => selectionFindings('A', { row: { ...headRow, outlineColour: T.borderStrong } }, T), []],
    ['R11 the parent draws two marker bars', () => count(selectionFindings('A', {
      row: { ...headRow, before: '""', outlineStyle: 'none', outlineWidth: '0px' },
      item: { ...headItem, before: '""', clip: 'border-box' }
    }, T)), 4],
    ['R11 the background shorthand on hover squares the chip', () => count(selectionFindings('A', { hovered: { background: T.bgRaised, clip: 'border-box' } }, T)), 1],
    // R12, R13
    ['R12 HEAD sums to the window', () => sumFindings('A', regions(336, 1232), 1440), []],
    ['R12 the parent has no gutters to find', () => count(sumFindings('A', regions(328, 1240), 1440)), 3],
    ['R13 38 is 38', () => titlebarFindings('A', box(0, 0, 1440, 38)), []],
    ["R13 the study's 44 is caught", () => count(titlebarFindings('A', box(0, 0, 1440, 44))), 1],
    // R14
    ['R14 the frame off, and the copy curved both ways', () => focusFindings(onFocus, enterCopy(`${String(13 / sx)}px ${String(13 / sy)}px`), { radii: { bottomLeft: '13px' } }, vp), []],
    ['R14 the parent copy is square both ways', () => count(focusFindings(onFocus, enterCopy(''), { radii: { bottomLeft: '' } }, vp)), 2],
    ['R14 a frame left on in focus mode is caught', () => count(focusFindings({ ...onFocus, work: { left: 0, top: 38, width: 1432, height: 854 }, radii: Array(4).fill('13px'), after: { content: '""', display: 'block' } }, enterCopy(`${String(13 / sx)}px ${String(13 / sy)}px`), { radii: { bottomLeft: '13px' } }, vp)), 4],
    ['R14 an unscaled 13px on the way in is caught', () => count(focusFindings(onFocus, enterCopy('13px'), { radii: { bottomLeft: '13px' } }, vp)), 1],
    ['R14 a copy with no measured start is a finding, not a crash', () => count(focusFindings(onFocus, { first: null, box: last, radii: { bottomLeft: '13px' } }, { radii: { bottomLeft: '13px' } }, vp)), 1],
    ['R14 a chord that did nothing is one finding', () => count(focusFindings({ focused: false }, null, null, vp)), 1],
    ['a radius pair reads one value twice', () => radiusPair('13px'), [13, 13]],
    ['a radius pair reads an ellipse', () => radiusPair('10.5px 9.25px'), [10.5, 9.25]],
    // R15 (Phase 284.1). The numbers are the fixer's own readings on 2026-09-17,
    // frame 38..892, tab strip 38..74, the body under it, the map as the root.
    ['R15 HEAD: the body ends 8px up and the map fills it', () => footFindings('M map', footOf(884, [['div.arch-map-tab', 'relative', 74, 884]])), []],
    ['R15 HEAD: the file, host and slider at the lane\'s foot, 8px up', () => footFindings('M file', { ...footOf(884, [['div.ed-host', 'absolute', 74, 884]]), slider: box(1222, 794, 1232, 884), track: box(1222, 74, 1232, 884) }, true), []],
    ['R15 the fix round: the map moved UP 8px under `bottom`, three findings', () => footFindings('M map', footOf(892, [['div.arch-map-tab', 'relative', 66, 876]])), [
      'M map the editor body ends 0px above the frame, want 8',
      'M map div.arch-map-tab (relative) starts at y 66, 8px above the body\'s top 74, over the tab strip',
      'M map div.arch-map-tab (relative) ends 16px above the frame, want 8'
    ]],
    ['R15 the fix round with the padding read as the body\'s foot still names the map', () => count(footFindings('M map', { ...footOf(884, [['div.arch-map-tab', 'relative', 66, 876]]) })), 2],
    ['R15 the parent: no lift, the body and the root end AT the frame', () => count(footFindings('M map', footOf(892, [['div.arch-map-tab', 'relative', 74, 892]]))), 2],
    ['R15 a stand-in root is graded like the map and named as a stand-in', () => footFindings('M map', footOf(892, [['div.arch-map-tab', 'relative', 74, 892, true]])), [
      'M map the editor body ends 0px above the frame, want 8',
      'M map div.arch-map-tab (relative, a stand-in) ends 0px above the frame, want 8'
    ]],
    ['R15 no root drawn is a finding, not a pass', () => count(footFindings('M map', footOf(884, []))), 1],
    ['R15 no body is a finding, not a crash', () => count(footFindings('M map', null)), 1],
    ['R15 a file not scrolled to its end is a finding, not a pass', () => count(footFindings('M file', { ...footOf(884, [['div.ed-host', 'absolute', 74, 884]]), slider: box(1222, 141, 1232, 231), track: box(1222, 74, 1232, 884) }, true)), 1],
    ['R15 the parent slider at the frame is caught', () => count(footFindings('M file', { ...footOf(892, [['div.ed-host', 'absolute', 74, 892]]), slider: box(1230, 802, 1240, 892), track: box(1230, 74, 1240, 892) }, true)), 3],
    ['R15 no slider over a long file is a finding, not a pass', () => count(footFindings('M file', { ...footOf(884, [['div.ed-host', 'absolute', 74, 884]]), slider: null, track: null }, true)), 1],
    // The parent rule and the census.
    ['a parent that fails all six says nothing', () => parentVerdict({ R1: ['x'], R2: ['x'], R4: ['x'], R5: ['x'], R11: ['x'], R15: ['x'] }), []],
    ['a parent that passes R4 is named', () => parentVerdict({ R1: ['x'], R2: ['x'], R4: [], R5: ['x'], R11: ['x'], R15: ['x'] }), ['the parent build ALSO passes R4, so that arm asserts nothing about this phase']],
    ['a parent that passes R15, the foot, is named (Phase 284.1)', () => parentVerdict({ R1: ['x'], R2: ['x'], R4: ['x'], R5: ['x'], R11: ['x'], R15: [] }), ['the parent build ALSO passes R15, so that arm asserts nothing about this phase']]
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
// The socket wrapper, and the refusals.
// ---------------------------------------------------------------------------
const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(REPO, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p284', `node ${process.argv[1]}`],
    { cwd: REPO, stdio: 'inherit' }
  );
  process.exit(w.status ?? 1);
}
if (socket === 'gmux' || socket === 'default') {
  console.error(`${TAG} refusing socket ${socket}`);
  process.exit(2);
}
const harnessDir = process.env['GMUX_HARNESS_DIR'] ?? '';
if (harnessDir === '') {
  console.error(`${TAG} no GMUX_HARNESS_DIR`);
  process.exit(2);
}
if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build.`);
  process.exit(2);
}
const parentCheckout = (process.env['P284_PARENT_CHECKOUT'] ?? '').trim();
if (parentCheckout !== '' && !existsSync(join(parentCheckout, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} P284_PARENT_CHECKOUT ${parentCheckout} holds no build under out/. Build it first.`);
  process.exit(2);
}
const hueRaw = Number((process.env['P284_HUE'] ?? '').trim() || '150');
const TURNED_HUE = Number.isInteger(hueRaw) && hueRaw >= 0 && hueRaw <= 359 ? hueRaw : 150;
const outDir = resolve(REPO, (process.env['P284_OUT_DIR'] ?? '').trim() || join('out', 'p284'));
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// The scratch world: one git project, one HOME, one profile per build.
// ---------------------------------------------------------------------------
mkdirSync(join(harnessDir, 'p284'), { recursive: true });
const root = realpathSync(join(harnessDir, 'p284'));
const home = join(root, 'h');
const project = join(root, 'alpha');
const profiles = { head: join(root, 'p-head'), parent: join(root, 'p-parent') };
for (const d of [home, project, profiles.head, profiles.parent]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
// M needs the Architecture pane, which ships behind a switch that is OFF in a
// fresh profile. The seed is Phase 200's helper, one settings file in each
// scratch profile naming no agent and no model, so the map spawns nothing.
for (const profile of Object.values(profiles)) seedArchSwitchOn(profile);
// PHASE 353 (D-P2). Every probed registry row hidden in both profiles.
for (const profile of Object.values(profiles)) writeHiddenAgents(profile, 'p284', hiddenAgentsBesides([]));
// A scratch HOME with no .zshrc makes zsh open its new-user questionnaire in
// the pane instead of a prompt, and `seq 1 300` would be typed into that.
writeFileSync(join(home, '.zshrc'), "PS1='p284 %# '\n");
writeFileSync(join(home, '.hushlogin'), '');
mkdirSync(join(project, 'src'), { recursive: true });
writeFileSync(join(project, 'README.md'), '# Phase 284\n');
writeFileSync(join(project, 'src', 'one.ts'), 'export const one = 1;\nexport const two = 2;\n');
// M's long file: 400 lines, so Monaco draws a vertical slider and its end is
// well below the first screen. Short lines, so no horizontal lane shortens
// the vertical one.
const LONG_LINES = 400;
writeFileSync(
  join(project, 'src', 'long.ts'),
  `${Array.from({ length: LONG_LINES }, (_, i) => `export const v${String(i)} = ${String(i)};`).join('\n')}\n`
);

const git = (...a) => {
  const r = spawnSync('git', ['-C', project, ...a], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'p284@example.invalid');
git('config', 'user.name', 'p284');
git('config', 'commit.gpgsign', 'false');
git('add', '.');
git('commit', '-q', '-m', 'first');

// PHASE 353 (D-P2). The read of the operator's own server this file used to
// take before and after, by identity, is gone: each launch below names its
// scratch socket, so build/electron-run.mjs's census reads his server around
// it, read only and by identity, and is the one reader of that server.
say(`harness socket ${socket}`);

/** THIS RUN'S panes, by session name, as `WxH`. The ground truth for a resize. */
function paneSizes() {
  const r = spawnSync(
    'tmux',
    ['-L', socket, 'list-panes', '-a', '-F', '#{session_name} #{pane_width}x#{pane_height}'],
    { encoding: 'utf8' }
  );
  const panes = {};
  if (r.status !== 0) return panes;
  for (const line of (r.stdout ?? '').split('\n')) {
    const [name, size] = line.trim().split(/\s+/);
    if (name !== undefined && size !== undefined && name !== '') panes[name] = size;
  }
  return panes;
}

// ---------------------------------------------------------------------------
// The page kit. One expression, evaluated once per launch, that puts every
// reader this probe needs on window.__p284. It is this probe's own code,
// injected from here, and no product file gains a hook for it. It is the same
// text at HEAD and at the parent, which is what makes the two columns one
// measurement.
// ---------------------------------------------------------------------------
const PAGE_KIT = String.raw`
(() => {
  const kit = {};
  const q = (s, root) => (root || document).querySelector(s);
  const all = (s, root) => Array.from((root || document).querySelectorAll(s));
  const drawn = (el) => {
    if (!el) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const box = (el) => {
    if (!drawn(el)) return null;
    const b = el.getBoundingClientRect();
    return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
  };
  const px = (v) => parseFloat(v) || 0;
  const nameOf = (el, pseudo) => {
    if (!el) return 'nothing';
    const cls = typeof el.className === 'string' && el.className.trim() !== ''
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + cls + (pseudo || '');
  };

  // Any CSS colour, as [r, g, b, a] in 0..255. rgb() and rgba() are parsed;
  // anything else (color(srgb ...), oklch) is painted into one canvas pixel
  // and read back, so the answer never depends on how a token was spelled.
  const cv = document.createElement('canvas');
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => {
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(String(c).trim());
    if (m) {
      let a = 1;
      if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3]), Math.round(a * 255)];
    }
    if (String(c).trim() === 'transparent') return [0, 0, 0, 0];
    if (!ctx) return [0, 0, 0, 0];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillStyle = String(c);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  };
  kit.rgba = rgba;

  /** A token, resolved the way the cascade resolves it for the app. */
  const token = (name) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;color:var(' + name + ')';
    (q('.shell') || document.body).appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return rgba(c);
  };
  kit.tokens = () => {
    const rs = getComputedStyle(document.documentElement);
    return {
      borderStrong: token('--border-strong'), borderActive: token('--border-active'),
      bgActive: token('--bg-active'), bgRaised: token('--bg-raised'),
      bgSidebar: token('--bg-sidebar'), bgCanvas: token('--bg-canvas'),
      border: token('--border'), accent: token('--accent'),
      rFrame: rs.getPropertyValue('--r-frame').trim(),
      frameGap: rs.getPropertyValue('--frame-gap').trim(),
      frameEdge: rs.getPropertyValue('--frame-edge').trim(),
      scheme: document.documentElement.getAttribute('data-scheme')
    };
  };

  /** The first ancestor-or-self ground that is not see-through. */
  const groundOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) return c;
    }
    return [0, 0, 0, 255];
  };

  const work = () => q('.work-area');
  const column = () => all('.activitybar').find((el) => !el.classList.contains('activitybar-row') && drawn(el)) || null;
  kit.rects = () => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    titlebar: box(q('.titlebar')),
    work: box(work()),
    center: box(q('.center')),
    sidebar: box(q('[data-slot="sidebar"]')),
    dock: box(q('[data-slot="session-dock"]')),
    activitybar: box(column()),
    rail: box(q('[data-slot="project-rail"]'))
  });

  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'];
  kit.line = () => {
    const w = work();
    if (!w) return null;
    const cs = getComputedStyle(w, '::after');
    return {
      content: cs.content, display: cs.display, position: cs.position,
      pointerEvents: cs.pointerEvents, zIndex: cs.zIndex,
      widths: sides.map((s) => cs['border' + s + 'Width']),
      styles: sides.map((s) => cs['border' + s + 'Style']),
      colours: sides.map((s) => rgba(cs['border' + s + 'Color'])),
      radii: corners.map((c) => cs['border' + c + 'Radius']),
      inset: [cs.top, cs.right, cs.bottom, cs.left]
    };
  };

  kit.children = () => {
    const w = work();
    if (!w) return [];
    return Array.from(w.children).filter(drawn).map((el) => {
      const cs = getComputedStyle(el);
      return { name: nameOf(el), overflow: [cs.overflowX, cs.overflowY], radii: corners.map((c) => cs['border' + c + 'Radius']) };
    });
  };

  // R4. Every element and both pseudo-elements under .shell, outside a dialog,
  // whose painted box is at least min by min and which has four borders of 1px
  // or more that are not see-through, or a painted outline.
  kit.outlines = (min) => {
    const shell = q('.shell');
    if (!shell) return [];
    const found = [];
    const visible = (c) => rgba(c)[3] > 0;
    const judge = (el, pseudo, hostBox) => {
      const cs = getComputedStyle(el, pseudo || undefined);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      let w = hostBox.width;
      let h = hostBox.height;
      if (pseudo) {
        if (cs.content === 'none' || cs.content === 'normal') return;
        const extra = cs.boxSizing === 'border-box' ? 0 : 1;
        w = px(cs.width) + extra * (px(cs.borderLeftWidth) + px(cs.borderRightWidth) + px(cs.paddingLeft) + px(cs.paddingRight));
        h = px(cs.height) + extra * (px(cs.borderTopWidth) + px(cs.borderBottomWidth) + px(cs.paddingTop) + px(cs.paddingBottom));
      }
      if (w < min || h < min) return;
      const four = sides.every((s) =>
        cs['border' + s + 'Style'] !== 'none' && cs['border' + s + 'Style'] !== 'hidden' &&
        px(cs['border' + s + 'Width']) >= 1 && visible(cs['border' + s + 'Color']));
      const outlined = cs.outlineStyle !== 'none' && px(cs.outlineWidth) > 0 && visible(cs.outlineColor);
      if (!four && !outlined) return;
      found.push({
        name: nameOf(el, pseudo), kind: four ? 'border' : 'outline', width: w, height: h,
        isFrame: pseudo === '::after' && el.classList.contains('work-area'),
        isSplitFocus: pseudo === '::after' && el.classList.contains('split-pane') && el.classList.contains('focused')
      });
    };
    for (const el of [shell, ...all('*', shell)]) {
      const b = el.getBoundingClientRect();
      // A pseudo-element at a negative inset is at most a few px larger than
      // its host, so a host well under the floor cannot carry a region box.
      if (b.width < min - 40 || b.height < min - 40) continue;
      if (el.closest('[role="dialog"], [role="alertdialog"]')) continue;
      judge(el, null, b);
      judge(el, '::before', b);
      judge(el, '::after', b);
    }
    return found;
  };

  const QUIET = [
    ['titlebar.bottom', () => q('.titlebar'), 'Bottom'],
    ['activitybar.right', column, 'Right'],
    ['activitybar-row.bottom', () => q('.activitybar.activitybar-row'), 'Bottom'],
    ['sidebar.right', () => q('[data-slot="sidebar"]'), 'Right'],
    ['view-header.bottom', () => q('.view-header'), 'Bottom'],
    ['branch-header.bottom', () => q('.branch-header'), 'Bottom'],
    ['session-dock.left', () => q('[data-slot="session-dock"]'), 'Left'],
    ['dock-toolbar.bottom', () => q('.dock-toolbar'), 'Bottom'],
    ['prail-band.bottom', () => q('.prail-band'), 'Bottom']
  ];
  kit.quiet = () => {
    const rows = {};
    for (const [key, find, side] of QUIET) {
      const el = find();
      if (!drawn(el)) { rows[key] = null; continue; }
      const cs = getComputedStyle(el);
      rows[key] = { width: cs['border' + side + 'Width'], style: cs['border' + side + 'Style'], colour: rgba(cs['border' + side + 'Color']) };
    }
    return rows;
  };

  kit.grounds = () => {
    const w = work();
    const line = kit.line();
    return {
      line: line && line.content !== 'none' && line.content !== 'normal' ? line.colours[0] : [0, 0, 0, 0],
      surround: groundOf(q('.shell-body') || document.body),
      work: groundOf(w || document.body)
    };
  };

  const hit = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return { insideWork: !!(el && el.closest('.work-area')), name: nameOf(el) };
  };
  // The outer point carries its coordinates and the surround's colour; the
  // node side reads the pixel there off a capture (the header says why it is
  // not a hit test) and keeps the hit's name for the report.
  kit.corners = () => {
    const b = box(work());
    if (!b) return [];
    const at = (d) => [
      ['top-left', b.left + d, b.top + d], ['top-right', b.right - d, b.top + d],
      ['bottom-right', b.right - d, b.bottom - d], ['bottom-left', b.left + d, b.bottom - d]
    ];
    const outer = at(2);
    const inner = at(5);
    const surround = groundOf(q('.shell-body') || document.body);
    return outer.map((o, i) => ({
      name: o[0],
      outer: { x: o[1], y: o[2], surroundRgba: surround, ...hit(o[1], o[2]) },
      inner: hit(inner[i][1], inner[i][2])
    }));
  };
  // R4's second half: the focused pane's box, its rect and the work's, so the
  // grader can say which corners the two share.
  kit.ring = () => {
    const pane = all('.split-pane.focused').find(drawn) || null;
    const w = box(work());
    if (!pane || !w) return { pane: null, work: w, radii: [] };
    const cs = getComputedStyle(pane, '::after');
    return { pane: box(pane), work: w, radii: corners.map((c) => cs['border' + c + 'Radius']) };
  };
  kit.thumbs = () => all('.gmux-terminal-scrollbar-thumb').filter(drawn).map((t) => {
    const lane = t.closest('.gmux-terminal-scrollbar');
    const pane = lane && lane.parentElement ? lane.parentElement.getBoundingClientRect() : t.getBoundingClientRect();
    const b = t.getBoundingClientRect();
    return { bottom: b.bottom, paneBottom: pane.bottom, gap: pane.bottom - b.bottom };
  });

  kit.editor = () => {
    const panel = q('.ed-panel');
    return {
      panel: box(panel), overlay: !!(panel && panel.classList.contains('ed-overlay')),
      fill: !!(panel && panel.classList.contains('ed-fill')), scrim: box(q('.ed-scrim')),
      tabs: all('.ed-tab').length
    };
  };
  // R15 (Phase 284.1). The editor's foot: the frame, the body and every drawn
  // direct child of the body with its computed position, whatever it is, so
  // a root of a kind nobody listed is still read. The slider and its lane are
  // Monaco's, present only while a file is open.
  kit.foot = () => {
    const w = box(work());
    const body = q('.ed-body');
    if (!w || !drawn(body)) return null;
    const roots = Array.from(body.children).filter(drawn).map((el) => ({
      name: nameOf(el), position: getComputedStyle(el).position, box: box(el),
      standIn: el.hasAttribute('data-p284-standin')
    }));
    const slider = q('.ed-host .monaco-editor .scrollbar.vertical .slider');
    const track = q('.ed-host .monaco-editor .scrollbar.vertical');
    return { frame: w, tabs: box(q('.ed-tabs')), body: box(body), roots, slider: box(slider), track: box(track) };
  };
  // The fallback when the pane cannot open in the harness: one element wearing
  // the map's own class and nothing else, appended to the body, so the same
  // stylesheet places it. Named as a stand-in in every reading, and removed.
  kit.standInMap = () => {
    const body = q('.ed-body');
    if (!body) return false;
    const el = document.createElement('div');
    el.className = 'arch-map-tab';
    el.setAttribute('data-p284-standin', '1');
    body.appendChild(el);
    return true;
  };
  kit.removeStandIn = () => {
    all('[data-p284-standin]').forEach((el) => el.remove());
    return true;
  };

  kit.split = () => ({
    panes: all('.split-pane').filter(drawn).length,
    focused: all('.split-pane.focused').filter(drawn).length,
    drop: box(q('.split-drop-zone')),
    dropInsideRow: !!(q('.split-drop-zone') && q('.split-drop-zone').closest('.work-row')),
    leavesInsideRow: !!(q('[data-surface-leaves]') && q('[data-surface-leaves]').closest('.work-row')),
    leaves: box(q('[data-surface-leaves]'))
  });

  const beforeOf = (el) => {
    if (!drawn(el)) return null;
    const b = getComputedStyle(el, '::before');
    return { before: b.content, barWidth: b.width, barColour: rgba(b.backgroundColor) };
  };
  kit.selection = () => {
    const out = {};
    const row = q('.srow.selected');
    if (drawn(row)) {
      const cs = getComputedStyle(row);
      out.row = { ...beforeOf(row), background: rgba(cs.backgroundColor), outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth, outlineColour: rgba(cs.outlineColor), radius: cs.borderTopLeftRadius };
    }
    const item = q('.ab-item.active');
    if (drawn(item)) {
      const cs = getComputedStyle(item);
      out.item = { ...beforeOf(item), background: rgba(cs.backgroundColor), clip: cs.backgroundClip, row: !!item.closest('.activitybar-row') };
    }
    const railItem = q('.rail-item.selected');
    if (drawn(railItem)) out.railItem = { ...beforeOf(railItem), background: rgba(getComputedStyle(railItem).backgroundColor) };
    const prailRow = q('.prail-row.selected');
    if (drawn(prailRow)) out.prailRow = { ...beforeOf(prailRow), background: rgba(getComputedStyle(prailRow).backgroundColor) };
    return out;
  };
  kit.look = (sel) => {
    const el = q(sel);
    if (!drawn(el)) return null;
    const cs = getComputedStyle(el);
    return {
      box: box(el), background: rgba(cs.backgroundColor), clip: cs.backgroundClip,
      hovered: el.matches(':hover'), focusVisible: el.matches(':focus-visible'),
      active: document.activeElement === el
    };
  };
  kit.inactiveItem = () => {
    const el = all('.ab-item').find((i) => drawn(i) && !i.classList.contains('active') && !i.classList.contains('update-ring'));
    if (!el) return null;
    el.setAttribute('data-p284-hover', '1');
    return box(el);
  };

  kit.regions = () => {
    const body = q('.shell-body');
    if (!body) return [];
    return Array.from(body.children).filter(drawn).map((el) => {
      const b = el.getBoundingClientRect();
      return {
        name: el.getAttribute('data-slot') || nameOf(el), left: b.left, right: b.right, width: b.width,
        isWork: el.classList.contains('work-area'), isSidebar: el.getAttribute('data-slot') === 'sidebar'
      };
    }).sort((a, b) => a.left - b.left);
  };

  kit.band = () => {
    const header = q('.term-header');
    const identity = q('.identity-strip');
    const filler = q('.stab-filler');
    const tab = q('.stab.active');
    const out = {
      focused: !!q('.term-header.term-focused'),
      orientation: drawn(q('[data-slot="session-strip"]')) ? 'top' : 'right',
      headerDrawn: drawn(header),
      identity: drawn(identity) ? rgba(getComputedStyle(identity).borderBottomColor) : null,
      filler: drawn(filler) ? rgba(getComputedStyle(filler).borderBottomColor) : null,
      activeTab: null
    };
    if (drawn(tab)) {
      const cs = getComputedStyle(tab);
      const m = /(rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]+)/i.exec(cs.boxShadow);
      out.activeTab = {
        bottom: rgba(cs.borderBottomColor), shadow: cs.boxShadow,
        shadowColour: m ? rgba(m[1]) : [0, 0, 0, 0],
        topLeftRadius: cs.borderTopLeftRadius,
        first: tab.parentElement !== null && tab.parentElement.firstElementChild === tab
      };
    }
    return out;
  };

  kit.centre = (sel, text) => {
    let el = null;
    if (text === undefined || text === null) el = all(sel).find(drawn) || null;
    else el = all(sel).find((n) => drawn(n) && (n.textContent || '').includes(text)) || null;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  };

  // R14. The copy is a fixed node appended to document.body for one flight, so
  // its inline corners are read by an observer AT THE MOMENT IT IS APPENDED.
  kit.copies = [];
  kit.watchCopies = () => {
    if (kit.observer) return true;
    kit.observer = new MutationObserver((records) => {
      for (const rec of records) {
        for (const n of Array.from(rec.addedNodes)) {
          if (!(n instanceof HTMLElement) || !n.classList.contains('gmux-focus-copy')) continue;
          const s = n.style;
          kit.copies.push({
            at: performance.now(),
            box: { left: px(s.left), top: px(s.top), width: px(s.width), height: px(s.height) },
            transform: s.transform,
            radii: { topLeft: s.borderTopLeftRadius, topRight: s.borderTopRightRadius,
              bottomRight: s.borderBottomRightRadius, bottomLeft: s.borderBottomLeftRadius }
          });
        }
      }
    });
    kit.observer.observe(document.body, { childList: true });
    return true;
  };
  kit.pressFocusChord = () => {
    // Capture phase keydown on window is where App.tsx listens, which is how
    // src/renderer/app/focus-shot-drive.ts presses it too.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', metaKey: true, shiftKey: true, bubbles: true }));
    return true;
  };
  kit.focusState = () => {
    const w = work();
    const shell = q('.shell');
    const cs = w ? getComputedStyle(w) : null;
    const after = w ? getComputedStyle(w, '::after') : null;
    // Where the keyboard is. The chord is routed by this (app/fill-chord.ts
    // asks document.activeElement which region it is in), so a chord pressed
    // with the keyboard in no region does nothing, silently.
    const ae = document.activeElement;
    return {
      focused: !!(shell && shell.classList.contains('session-focus')),
      shellClasses: shell ? shell.className : '',
      keyboard: {
        active: nameOf(ae),
        inSession: !!(ae && ae.closest('.gmux-terminal-mount, [data-slot="session-dock"], [data-slot="session-strip"]'))
      },
      work: box(w), surface: box(q('[data-surface-leaves]')),
      radii: cs ? corners.map((c) => cs['border' + c + 'Radius']) : [],
      after: after ? { content: after.content, display: after.display } : null,
      copies: kit.copies.length
    };
  };

  kit.readAll = () => ({
    rects: kit.rects(), line: kit.line(), children: kit.children(), outlines: kit.outlines(${String(REGION_MIN)}),
    quiet: kit.quiet(), grounds: kit.grounds(), corners: kit.corners(), thumbs: kit.thumbs(),
    editor: kit.editor(), split: kit.split(), selection: kit.selection(), regions: kit.regions(),
    tokens: kit.tokens()
  });

  window.__p284 = kit;
  return true;
})()
`;

// ---------------------------------------------------------------------------
// The DevTools side: finding the window, real pointer and key events, frames.
// ---------------------------------------------------------------------------
async function cdpForAppWindow(profile, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let port = 0;
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
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
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' ? location.href : null`,
            5000
          );
          if (typeof a === 'string') return { cdp, url: a };
          cdp.close();
        } catch {
          if (cdp) {
            try {
              cdp.close();
            } catch {
              /* already closed */
            }
          }
        }
      }
    }
    if (Date.now() - started > timeoutMs) throw new Error('no app window');
    await sleep(200);
  }
}

const mouse = (cdp, type, x, y, extra = {}) =>
  cdp.call('Input.dispatchMouseEvent', {
    type, x: Math.round(x), y: Math.round(y), button: 'none', buttons: 0, clickCount: 0, ...extra
  });
/** A REAL mouse move, which is what makes :hover true. */
async function movePointer(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y);
  await sleep(200);
}
/** A REAL click: a move, a press and a release at one point, no travel. */
async function clickAt(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y);
  await mouse(cdp, 'mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
  await mouse(cdp, 'mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 });
  await sleep(250);
}
const KEYS = { Tab: 9, Escape: 27, ArrowLeft: 37, ArrowRight: 39, ArrowDown: 40 };
/** CDP's modifier bits. */
const META = 4;
/** A REAL key, down and up, delivered to whatever holds the keyboard. */
async function pressKey(cdp, key, modifiers = 0) {
  const base = { key, code: key, windowsVirtualKeyCode: KEYS[key], nativeVirtualKeyCode: KEYS[key], modifiers };
  await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(150);
}

/**
 * FORCE A FRAME, DO NOT JUST SLEEP. build/probe-p1811-strip-fit.mjs measured
 * what a sleep costs on 2026-08-31: Electron throttles a window that is not in
 * front, a ResizeObserver needs a rendering update to deliver, and a whole
 * width ladder came back as a picture of a window that had stopped rendering.
 * A screenshot request makes the compositor produce a frame whatever the
 * window's state.
 */
async function forceFrame(cdp) {
  await cdp.call('Page.captureScreenshot', { format: 'png' }, 30_000).catch(() => undefined);
}
/** Read twice with a frame forced before each, and keep a reading two agree on. */
async function settled(cdp, expression, tries = 8) {
  let previous = null;
  let seen = null;
  for (let i = 0; i < tries; i += 1) {
    await forceFrame(cdp);
    seen = await cdpEval(cdp, expression, 60_000);
    const key = J(seen);
    if (previous === key) return seen;
    previous = key;
    await sleep(200);
  }
  return seen;
}
async function setViewport(cdp, width, height) {
  await cdp.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
}

// ---------------------------------------------------------------------------
// One build, driven through every state.
// ---------------------------------------------------------------------------
const drive = (cdp, spec) => cdpEval(cdp, `window.__gmuxShotDrive(${J(spec)}).then(() => true)`, 180_000);
const kit = (cdp, call) => cdpEval(cdp, `window.__p284.${call}`, 60_000);

async function runBuild(tag, cwd, profile) {
  const arms = Object.fromEntries(ARMS.map((a) => [a, []]));
  const readings = { tag, cwd, states: {}, sizes: [], contrast: {}, notes: [] };
  const quietSeen = new Set();
  let stage = 'launch';
  const note = (l) => {
    readings.notes.push(l);
    say(`  ${tag} note: ${l}`);
  };

  // A launch the helper refuses (a socket in the wrong shape, an announcement
  // that names another server) throws out of withElectron. It is a finding of
  // this build and the other build is still measured.
  try {
    await withElectron(
      {
        label: `p284-${tag}`,
        userDataDir: profile,
        // PHASE 353 (D-P2): named, so the helper's census guards this launch
        // and ends the scratch server in its finally; the next build's launch
        // starts its own, and nothing reads the server after a launch returns.
        tmuxSocket: socket,
        cwd,
        args: ['--remote-debugging-port=0', '--use-mock-keychain'],
        env: withoutDevRenderer({ HOME: home, GMUX_TMUX_SOCKET: socket, GMUX_PROBES: '1' }),
        ceilingMs: 15 * 60 * 1000
      },
      async (handle) => {
        const { cdp, url } = await cdpForAppWindow(profile, 90_000);
        say(`${tag}: app window at ${url}, pid ${String(handle.appPid())}`);

        /** One capture of the emulated viewport, decoded, or null. */
        const capture = async () => {
          try {
            const reply = await cdp.call('Page.captureScreenshot', { format: 'png' }, 30_000);
            const data = reply.result?.data;
            if (typeof data === 'string' && data.length > 0) return decodePng(Buffer.from(data, 'base64'));
          } catch {
            /* the caller names it */
          }
          return null;
        };
        const photograph = async (name) => {
          const path = join(outDir, `${tag}-${name}.png`);
          try {
            const reply = await cdp.call('Page.captureScreenshot', { format: 'png' }, 30_000);
            const data = reply.result?.data;
            if (typeof data === 'string' && data.length > 0) {
              writeFileSync(path, Buffer.from(data, 'base64'));
              say(`  ${tag} photograph ${path}`);
              return;
            }
          } catch {
            /* named below */
          }
          arms.RUN.push(`${name} no photograph came back, and the phase's proof asks for one`);
        };
        /**
         * R7's outer reading: the pixel painted 2px inside each corner, off one
         * capture taken right after the kit read the corners' coordinates. The
         * capture is the emulated 1440 by 900 viewport at scale 1, so a CSS
         * pixel is an image pixel; a capture that comes back another size, or
         * not at all, leaves the colour unread, which the grader names.
         */
        const withPixels = async (corners, viewport) => {
          const img = await capture();
          const usable = img !== null && img.width === viewport.width && img.height === viewport.height;
          return corners.map((c) => ({
            ...c,
            outer: {
              ...c.outer,
              colour: usable ? pixel(img, c.outer.x, c.outer.y) : null,
              surround: Array.isArray(c.outer.surroundRgba) ? hexOf(c.outer.surroundRgba) : null
            }
          }));
        };
        const sizes = (state) => {
          const panes = paneSizes();
          readings.sizes.push({ state, panes });
          say(`  ${tag} ${state} panes: ${Object.entries(panes).map(([n, s]) => `${n} ${s}`).join(', ') || 'none'}`);
        };
        /** Read everything static and grade the arms a state owns. */
        const read = async (state, want) => {
          const all = await settled(cdp, 'window.__p284.readAll()');
          readings.states[state] = all;
          const t = all.tokens;
          if (want.gutters !== false) arms.R1.push(...gutterFindings(state, all.rects));
          arms.R2.push(...lineFindings(state, all.line, t.borderStrong));
          arms.R3.push(...clipFindings(state, all.children));
          arms.R4.push(...outlineFindings(state, all.outlines, want.split === true));
          arms.R5.push(...quietFindings(state, all.quiet));
          for (const [k, row] of Object.entries(all.quiet)) if (row !== null) quietSeen.add(k);
          if (want.contrast === true) {
            const c = contrastReading(state, all.grounds.line, all.grounds.surround, all.grounds.work);
            readings.contrast[state] = { onSurround: c.onSurround, onWork: c.onWork, scheme: t.scheme };
            arms.R6.push(...c.findings);
          }
          if (want.corners === true) {
            all.corners = await withPixels(all.corners, all.rects.viewport);
            arms.R7.push(...cornerFindings(state, all.corners));
          }
          arms.R7.push(...thumbFindings(state, all.thumbs, want.thumb === true));
          arms.R11.push(...selectionFindings(state, all.selection, { ...t }));
          arms.R12.push(...sumFindings(state, all.regions, all.rects.viewport.width));
          arms.R13.push(...titlebarFindings(state, all.rects.titlebar));
          say(
            `  ${tag} ${state}: work ${all.rects.work ? `${String(r2(all.rects.work.left))},${String(r2(all.rects.work.top))} ${String(r2(all.rects.work.width))}x${String(r2(all.rects.work.height))}` : 'ABSENT'}` +
              `, .center ${all.rects.center ? String(r2(all.rects.center.width)) : '-'}px wide, ${String(all.outlines.length)} region outline(s)`
          );
          return all;
        };
        const clickOn = async (sel, text = null) => {
          const at = await kit(cdp, `centre(${J(sel)}, ${J(text)})`);
          if (at === null || at === undefined) return false;
          await clickAt(cdp, at.x, at.y);
          return true;
        };
        const intoTerminal = () => clickOn('.gmux-terminal-mount .xterm-screen');
        const bandArm = async (state) => {
          const clicked = await intoTerminal();
          await sleep(400);
          const band = await settled(cdp, 'window.__p284.band()');
          const tokens = await kit(cdp, 'tokens()');
          readings.states[`${state}-band`] = band;
          if (!clicked) arms.R10.push(`${state} no terminal screen to click into`);
          arms.R10.push(...bandFindings(state, band, tokens));
        };
        const resizerArm = async (state, name, sel, regionSel) => {
          const rects = await kit(cdp, 'rects()');
          const look0 = await kit(cdp, `look(${J(sel)})`);
          if (look0 === null || look0 === undefined) {
            arms.R9.push(`${state} the ${name} resizer is not drawn`);
            return;
          }
          // The gutter less the pixel the line takes, the one nearest the work.
          const gutter = name === 'sidebar'
            ? [rects.sidebar?.right ?? 0, (rects.work?.left ?? 0) - EDGE]
            : [(rects.work?.right ?? 0) + EDGE, rects.dock?.left ?? 0];
          const cx = look0.box.left + look0.box.width / 2;
          const cy = look0.box.top + look0.box.height / 2;
          // THE SETTLE (Phase 284.1, the header says why). Two real moves, the
          // second 1px along the handle so Blink's last known pointer position
          // is the handle's own, then `:hover` polled for up to
          // HOVER_SETTLE_MS and the first lit sample graded. NO FRAME IS
          // FORCED in this poll, on purpose: in the fixer's environment a
          // Page.captureScreenshot between the move and the read cleared the
          // handle's :hover every time (0 of 6) while a poll without one
          // read true (10 of 10); the reverifier's environment did not
          // reproduce that (14 of 14 lit), so the mechanism is not
          // established and this poll is an improvement, not a closure (the
          // header says so). A poll that never lit grades its last sample,
          // which is a finding with the sample count in it.
          await movePointer(cdp, cx, cy);
          await movePointer(cdp, cx + 1, cy);
          const hoverSamples = [];
          const hoverStarted = Date.now();
          for (;;) {
            const sample = await kit(cdp, `look(${J(sel)})`);
            hoverSamples.push(sample);
            if (sample && sample.hovered === true) break;
            if (Date.now() - hoverStarted > HOVER_SETTLE_MS) break;
            await sleep(100);
          }
          const hoverMs = Date.now() - hoverStarted;
          const hover = hoverPick(hoverSamples);
          await movePointer(cdp, (rects.work?.left ?? 400) + 200, (rects.work?.top ?? 100) + 200);
          // A real Tab puts the page in keyboard modality, which is what makes a
          // focus() that follows it match :focus-visible, as it does for a person
          // who tabbed there. The blur first keeps the Tab out of the shell.
          await cdpEval(cdp, `(document.activeElement instanceof HTMLElement && document.activeElement.blur(), true)`);
          await pressKey(cdp, 'Tab');
          await cdpEval(cdp, `(document.querySelector(${J(sel)}).focus(), true)`);
          await sleep(350);
          await forceFrame(cdp);
          const focus = await kit(cdp, `look(${J(sel)})`);
          const width = async () => (await kit(cdp, `look(${J(regionSel)})`))?.box?.width ?? null;
          const w0 = await width();
          await pressKey(cdp, 'ArrowRight');
          await sleep(400);
          await forceFrame(cdp);
          const w1 = await width();
          await pressKey(cdp, 'ArrowLeft');
          await sleep(400);
          await forceFrame(cdp);
          const w2 = await width();
          await cdpEval(cdp, `(document.activeElement instanceof HTMLElement && document.activeElement.blur(), true)`);
          const tokens = await kit(cdp, 'tokens()');
          const r = { box: look0.box, gutter, hover, hoverSamples: hoverSamples.length, hoverMs, focus, widths: [w0, w1, w2] };
          readings.states[`${state}-resizer-${name}`] = r;
          say(`  ${tag} ${state} ${name} resizer: :hover ${hover && hover.hovered ? 'lit' : 'NOT lit'} on sample ${String(hoverSamples.length)} after ${String(hoverMs)} ms`);
          arms.R9.push(...resizerFindings(state, name, r, tokens));
          if (!near(w0, w2, 0.01)) note(`${state} the ${name} did not come back to ${String(w0)}px after the opposite arrow (${String(w2)}px)`);
        };

        try {
          await cdp.call('Runtime.enable');
          // PHASE 353 (D-P2). The app's own scan, read back before any state:
          // nothing resolved, since this run has no stand-in.
          stage = 'agents';
          let agents = { ok: false, said: 'agents:list was not read' };
          try {
            agents = standInsOnlyVerdict(JSON.parse(await cdpEval(cdp, AGENTS_LIST_EXPR, 90_000)), { standIns: [] });
          } catch (err) {
            agents = { ok: false, said: `agents:list could not be read: ${err instanceof Error ? err.message : String(err)}` };
          }
          readings.agents = agents;
          say(`${tag}: agents ${agents.ok ? 'ok' : 'NOT OK'}: ${agents.said}`);
          if (!agents.ok) throw new Error(`an agent resolved in the app's own scan: ${agents.said}`);
          // The window is never in front during a probe run, and a page Chromium
          // believes is unfocused never matches :focus-visible.
          await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
          for (;;) {
            if ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0].loadEventEnd`)) > 0) break;
            await sleep(50);
          }
          await setViewport(cdp, 1440, 900);

          // ------------------------------------------------------------- A
          stage = 'A';
          await drive(cdp, {
            projectPath: project,
            orientation: 'right',
            session: { agent: 'shell', name: 'p284-a' },
            scrollback: { commands: ['seq 1 300'], settleMs: 1500, minHistory: 100, notches: 0 }
          });
          await sleep(1200);
          await cdpEval(cdp, PAGE_KIT);
          const a = await read('A', { contrast: true, corners: true, thumb: true });
          sizes('A');
          await photograph('A-right');
          await bandArm('A');
          const idle = await kit(cdp, 'inactiveItem()');
          if (idle) {
            await movePointer(cdp, idle.left + idle.width / 2, idle.top + idle.height / 2);
            await sleep(350);
            const hovered = await kit(cdp, `look('[data-p284-hover="1"]')`);
            readings.states['A-hovered-item'] = hovered;
            arms.R11.push(...selectionFindings('A', { hovered }, a.tokens));
            await movePointer(cdp, (a.rects.work?.left ?? 400) + 200, (a.rects.work?.top ?? 100) + 200);
          } else {
            arms.R11.push('A no inactive activity item to put a real pointer over');
          }
          await resizerArm('A', 'sidebar', '.sidebar-resizer', '[data-slot="sidebar"]');
          await resizerArm('A', 'dock', '.dock-resizer', '[data-slot="session-dock"]');

          // ----------------------------------------------------- A-explorer
          // Source Control is the default view and its header is
          // `.branch-header`, so `.view-header` is drawn in NO other state and
          // R5's coverage arm would name it as never read. One ask for the
          // Explorer through the drive's own `sidebarView`, R5 alone read
          // there, and back, so every later state is the view A was.
          stage = 'A-explorer';
          await drive(cdp, { projectPath: project, sidebarView: 'explorer' });
          await sleep(600);
          const explorerQuiet = await settled(cdp, 'window.__p284.quiet()');
          readings.states['A-explorer'] = { quiet: explorerQuiet };
          arms.R5.push(...quietFindings('A-explorer', explorerQuiet));
          for (const [k, row] of Object.entries(explorerQuiet)) if (row !== null) quietSeen.add(k);
          if (explorerQuiet['view-header.bottom'] === null) arms.RUN.push('A-explorer the Explorer was asked for and no .view-header is drawn');
          await photograph('A-explorer');
          await drive(cdp, { projectPath: project, sidebarView: 'scm' });
          await sleep(600);

          // ------------------------------------------------------------- B
          stage = 'B';
          await drive(cdp, { projectPath: project, orientation: 'top' });
          await sleep(900);
          await read('B', { corners: true });
          sizes('B');
          await photograph('B-top');
          await bandArm('B');

          // ------------------------------------------------------------- C
          stage = 'C';
          await drive(cdp, { projectPath: project, splitGroup: { count: 2, focus: 0 } });
          await sleep(1200);
          const c = await read('C', { split: true, corners: true });
          if (c.split.panes !== 2) arms.RUN.push(`C the split drew ${String(c.split.panes)} pane(s), want 2`);
          sizes('C');
          await photograph('C-split');

          // R4's second half. The focused pane is the LEFT one, whose
          // bottom-left corner is the frame's; then a real click into the
          // other pane, whose bottom-right corner is the frame's because no
          // editor is beside the stack; then back, so the drag below starts
          // from the state it was written for.
          const ringLeft = await settled(cdp, 'window.__p284.ring()');
          readings.states['C-ring-left'] = ringLeft;
          arms.R4.push(...ringFindings('C left pane focused', ringLeft));
          if (await clickOn('.split-pane:not(.focused) .xterm-screen')) {
            const ringRight = await settled(cdp, 'window.__p284.ring()');
            readings.states['C-ring-right'] = ringRight;
            if (near(ringRight.pane?.left, ringLeft.pane?.left)) arms.RUN.push('C the click into the other pane did not move the focus, so its corner was not read');
            else arms.R4.push(...ringFindings('C right pane focused', ringRight));
            if (!(await clickOn('.split-pane:not(.focused) .xterm-screen'))) arms.RUN.push('C could not click back into the left pane');
          } else {
            arms.RUN.push('C no unfocused pane to click into, so the bottom-right corner of the box was not read');
          }

          // R8. The single session's tab, dragged over the split with a real
          // pointer held down, which is the gesture that arms a drop zone.
          stage = 'C drop';
          const from = await kit(cdp, `centre('.stab', 'p284-a')`);
          if (from && c.split.leaves) {
            const to = { x: c.split.leaves.left + c.split.leaves.width * 0.25, y: c.split.leaves.top + c.split.leaves.height * 0.5 };
            await mouse(cdp, 'mouseMoved', from.x, from.y);
            await mouse(cdp, 'mousePressed', from.x, from.y, { button: 'left', buttons: 1, clickCount: 1 });
            for (let i = 1; i <= 12; i += 1) {
              await mouse(cdp, 'mouseMoved', from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12, { button: 'left', buttons: 1 });
              await sleep(30);
            }
            await sleep(300);
            await forceFrame(cdp);
            const armed = await kit(cdp, 'split()');
            readings.states['C-drop'] = armed;
            if (armed.drop) {
              const rects = await kit(cdp, 'rects()');
              arms.R8.push(...insideFindings('C', 'the armed drop zone', armed.drop, rects.work));
              if (!armed.dropInsideRow) arms.R8.push('C the armed drop zone is not a descendant of .work-row, so the clip cannot reach it');
              arms.R8.push(...cornerFindings('C with a drop zone armed', await withPixels(await kit(cdp, 'corners()'), rects.viewport)));
              await photograph('C-drop');
            } else {
              note('R8 NOT DRIVEN: the tab drag did not arm a drop zone, so only the structural half is asserted. This is a stated limit, never a pass.');
              if (!armed.leavesInsideRow) arms.R8.push('C the drop overlay\'s mount ([data-surface-leaves]) is not a descendant of .work-row');
            }
            // Esc cancels an armed drag with no motion and no drop; the release
            // that follows is then an ordinary click on the terminal.
            await pressKey(cdp, 'Escape');
            await mouse(cdp, 'mouseReleased', to.x, to.y, { button: 'left', buttons: 0, clickCount: 1 });
            await sleep(400);
            const afterDrag = await kit(cdp, 'split()');
            if (afterDrag.panes !== 2) note(`C the cancelled drag left ${String(afterDrag.panes)} panes, not 2`);
          } else {
            note('R8 NOT DRIVEN: no p284-a tab or no split surface to drag over. Stated limit, never a pass.');
            const s = await kit(cdp, 'split()');
            if (!s.leavesInsideRow) arms.R8.push('C the drop overlay\'s mount ([data-surface-leaves]) is not a descendant of .work-row');
          }
          note('R8 NOT DRIVEN for a FILE dragged from Finder: .attach-drop-zone is lit by an OS drag no DevTools event can start. p284-work-frame.test.ts pins its radius as text.');

          // Back to the single session, the way a person goes back: its tab.
          if (!(await clickOn('.stab', 'p284-a'))) arms.RUN.push('C could not find the p284-a tab to go back to the single session');
          await sleep(600);
          await drive(cdp, { projectPath: project, orientation: 'right' });
          await sleep(900);

          // ------------------------------------------------------------- D
          stage = 'D';
          await drive(cdp, { projectPath: project, openRel: 'src/one.ts', mode: 'file', editorWidth: 520 });
          await sleep(1500);
          const d = await read('D', { corners: true });
          if (d.editor.panel === null) arms.RUN.push('D no editor panel is drawn');
          else if (d.editor.overlay) arms.RUN.push('D the editor is an overlay at 1440 wide, want the split');
          arms.R7.push(...insideFindings('D', 'the editor panel', d.editor.panel, d.rects.work));
          sizes('D');
          await photograph('D-editor');

          // ------------------------------------------------------------- M
          // The editor's foot (Phase 284.1), rendered. First the long file
          // scrolled to its end: a real click into the HOST's visible centre
          // so Monaco holds the keyboard (never `.view-lines`, which is the
          // whole 7,600px lines box whose centre is off screen, so a click
          // there lands nowhere and blurs the editor), then ⌘↓, which is
          // Monaco's own cursorBottom on a Mac. The slider is read against
          // its lane so a scroll that stopped short is a finding rather than
          // a vacuous pass.
          stage = 'M';
          await drive(cdp, { projectPath: project, openRel: 'src/long.ts', mode: 'file' });
          await sleep(1200);
          if (await clickOn('.ed-host')) {
            await pressKey(cdp, 'ArrowDown', META);
            await sleep(500);
          } else {
            arms.RUN.push('M no editor host to click into, so the long file was not scrolled');
          }
          const mFile = await settled(cdp, 'window.__p284.foot()');
          readings.states['M-file'] = mFile;
          arms.R15.push(...footFindings('M file', mFile, true));
          const rootLine = (f) => (f && f.roots ? f.roots.map((r) => `${r.name} ${r.position} ${String(r2(r.box.top))}..${String(r2(r.box.bottom))}`).join(', ') : 'none');
          say(`  ${tag} M file: frame foot ${mFile ? String(r2(mFile.frame.bottom)) : '-'}, body ${mFile ? `${String(r2(mFile.body.top))}..${String(r2(mFile.body.bottom))}` : '-'}, roots ${rootLine(mFile)}, slider ${mFile && mFile.slider ? `${String(r2(mFile.slider.top))}..${String(r2(mFile.slider.bottom))}` : 'none'}`);
          await photograph('M-file');

          // Then the Architecture map over the scratch repository, through
          // the pane's own door, the shape probe:p258 uses. The door needs
          // the Architecture view on screen, which the drive's `sidebarView`
          // puts there; the map tab is the body's ONE relative root.
          stage = 'M map';
          await drive(cdp, { projectPath: project, sidebarView: 'arch' });
          await sleep(600);
          let mapDrawn = false;
          if (await clickOn('.arch-map-open')) {
            for (let i = 0; i < 40 && !mapDrawn; i += 1) {
              mapDrawn = (await cdpEval(cdp, `document.querySelector('.ed-body > .arch-map-tab') !== null`)) === true;
              if (!mapDrawn) await sleep(250);
            }
          }
          if (!mapDrawn) {
            note('M the Architecture pane did not open in the harness (no .arch-map-open door, or no .arch-map-tab within 10 s), so a STAND-IN root wearing the map\'s own class was appended to the body and read in its place. The stylesheet places it exactly as it places the map; what it does not prove is the map\'s own content. Stated limit.');
            await kit(cdp, 'standInMap()');
          }
          await sleep(800);
          const mMap = await settled(cdp, 'window.__p284.foot()');
          readings.states['M-map'] = mMap;
          arms.R15.push(...footFindings('M map', mMap));
          say(`  ${tag} M map: ${mapDrawn ? 'the pane opened' : 'STAND-IN'}; frame foot ${mMap ? String(r2(mMap.frame.bottom)) : '-'}, tab strip foot ${mMap && mMap.tabs ? String(r2(mMap.tabs.bottom)) : '-'}, body ${mMap ? `${String(r2(mMap.body.top))}..${String(r2(mMap.body.bottom))}` : '-'}, roots ${rootLine(mMap)}`);
          sizes('M');
          await photograph('M-map');
          await kit(cdp, 'removeStandIn()');

          // Back to D's shape, so E reads what D left: the map tab and the
          // long file's tab closed by their own close controls, one.ts
          // opened again, and Source Control back in the sidebar.
          for (const name of ['Architecture map', 'long.ts']) {
            if (name === 'Architecture map' && !mapDrawn) continue;
            const at = await kit(cdp, `centre('.ed-tab', ${J(name)})`);
            if (!at) {
              note(`M no "${name}" tab to close; E is read with it still open`);
              continue;
            }
            await clickAt(cdp, at.x, at.y);
            if (!(await clickOn('.ed-tab.active .ed-tab-close'))) note(`M the "${name}" tab's close control was not found; E is read with it still open`);
            await sleep(400);
          }
          await drive(cdp, { projectPath: project, openRel: 'src/one.ts', mode: 'file' });
          await sleep(800);
          await drive(cdp, { projectPath: project, sidebarView: 'scm' });
          await sleep(600);
          const afterM = await kit(cdp, 'editor()');
          if ((afterM.tabs ?? 0) !== 1) note(`M left ${String(afterM.tabs)} editor tab(s) open rather than one; E, F and the close loop read that`);

          // ------------------------------------------------------------- E
          stage = 'E';
          await setViewport(cdp, 1200, 900);
          const e = await read('E', { corners: true });
          if (!e.editor.overlay) arms.RUN.push('E the editor is not an overlay at 1200 wide');
          arms.R7.push(...insideFindings('E', 'the editor overlay', e.editor.panel, e.rects.work));
          arms.R7.push(...insideFindings('E', "the overlay's scrim", e.editor.scrim, e.rects.work));
          sizes('E');
          await photograph('E-overlay');

          // ------------------------------------------------------------- F
          stage = 'F';
          await setViewport(cdp, 1440, 900);
          if (!(await clickOn('button[aria-label="Fill the window"]'))) arms.RUN.push('F no Fill the window button to press');
          await sleep(900);
          const f = await read('F', { corners: true });
          if (!f.editor.fill) arms.RUN.push('F the file is not filling the window');
          arms.R7.push(...insideFindings('F', 'the filling file', f.editor.panel, f.rects.work));
          sizes('F');
          await photograph('F-fill');
          await clickOn('button[aria-label="Fill the window"]');
          await sleep(900);
          for (let i = 0; i < 4 && ((await kit(cdp, 'editor()')).tabs ?? 0) > 0; i += 1) {
            await clickOn('.ed-tab .ed-tab-close');
            await sleep(500);
          }
          if (((await kit(cdp, 'editor()')).tabs ?? 0) > 0) note('the editor tab did not close, so G, H, K, I and J are read with the file still open');

          // ------------------------------------------------------------- G
          stage = 'G';
          await drive(cdp, { projectPath: project, sidebar: false });
          if (!(await clickOn('button[aria-label="Collapse session list"]'))) arms.RUN.push('G no Collapse session list button to press');
          await sleep(900);
          const g = await read('G', { corners: true });
          if (g.rects.sidebar !== null) arms.RUN.push('G the sidebar is still drawn');
          if (!g.selection.railItem) arms.RUN.push('G no selected item on the collapsed session rail, so its marker was not read');
          sizes('G');
          await photograph('G-bare');
          await clickOn('button[aria-label="Show session names"]');
          await drive(cdp, { projectPath: project, sidebar: true });
          await sleep(900);

          // ------------------------------------------------------------- H
          stage = 'H';
          await intoTerminal();
          await kit(cdp, 'watchCopies()');
          const ordinary = await settled(cdp, 'window.__p284.focusState()');
          if (!ordinary.keyboard.inSession) arms.RUN.push(`H the click into the terminal did not put the keyboard in the session (active element ${ordinary.keyboard.active})`);
          await kit(cdp, 'pressFocusChord()');
          await sleep(1500);
          const on = await settled(cdp, 'window.__p284.focusState()');
          sizes('H');
          await photograph('H-focus');
          let leftBy = 'the chord';
          if (on.focused) {
            // THE KEYBOARD, asserted since Phase 286. Entering the mode used to
            // leave the keyboard in no region (the flight hid the surface and
            // Chromium blurred the focused textarea), and the chord does
            // nothing there. The flight now gives the keyboard back, so a
            // keyboard outside the session after the enter is a finding. The
            // click before the leave stays, because a person may still click.
            if (!on.keyboard.inSession) {
              arms.RUN.push(`H entering focus mode took the keyboard out of the session (active element ${on.keyboard.active})`);
            }
            await intoTerminal();
            await kit(cdp, 'pressFocusChord()');
            await sleep(1500);
          }
          let off = await settled(cdp, 'window.__p284.focusState()');
          if (on.focused && off.focused) {
            arms.R14.push('H the second chord did not leave focus mode, with the keyboard clicked back into the terminal first');
            // The other way out, so K, I and J are still read with the frame
            // on: Escape leaves the mode when the keyboard is NOT in a
            // terminal (app/keyboard.ts). If that does not leave either, the
            // run stops here rather than read three states in the wrong one.
            await cdpEval(cdp, `(document.activeElement instanceof HTMLElement && document.activeElement.blur(), true)`);
            await pressKey(cdp, 'Escape');
            await sleep(1500);
            off = await settled(cdp, 'window.__p284.focusState()');
            if (off.focused) throw new Error('H is still in focus mode after the chord and after Escape, so K, I and J cannot be read with the frame on');
            leftBy = 'Escape';
            note('H left focus mode by Escape and not by the chord; K, I and J below are read with the frame on');
          }
          const copies = await cdpEval(cdp, 'window.__p284.copies');
          const enter = copies[0] ? { ...copies[0], first: ordinary.surface } : null;
          const leave = copies[1] ?? null;
          readings.states.H = { ordinary, on, off, copies, leftBy };
          arms.R14.push(...focusFindings(on, enter, leave, a.rects.viewport));
          if (!off.focused) {
            const back = await kit(cdp, 'rects()');
            arms.R14.push(...gutterFindings('H after leaving', back).map((x) => `${x} (the frame did not come back)`));
          }

          // ------------------------------------------------------------- K
          stage = 'K';
          if (await clickOn('.projects-position')) {
            await sleep(1200);
            const k = await read('K', { corners: true });
            if (k.rects.rail === null) arms.RUN.push('K the project rail is not drawn after its position control was pressed');
            if (!k.selection.prailRow) arms.RUN.push('K no selected row on the project rail, so its marker was not read');
            sizes('K');
            await photograph('K-rail');
            await clickOn('.projects-position');
            await sleep(1200);
          } else {
            // The control lives in the titlebar, and focus-mode.css hides
            // every titlebar child, so the one way this happens is H having
            // left the app in the mode. Say what the shell was wearing.
            const shellNow = await kit(cdp, 'focusState()');
            arms.RUN.push(`K no projects position control to press, so the rail band and the activity ROW were never read (the shell's classes: "${String(shellNow.shellClasses)}")`);
          }

          // ------------------------------------------------------------- I, J
          stage = 'I';
          const canSet = await cdpEval(cdp, `typeof window.gmux.settingsSet === 'function'`);
          if (canSet === true) {
            await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'light' }).then(() => true)`, 30_000);
            await sleep(1500);
            const i = await read('I', { contrast: true, corners: true });
            if (sameColour(i.tokens.bgCanvas, a.tokens.bgCanvas)) arms.RUN.push('I the canvas did not move, so the light base was never on screen');
            await photograph('I-light');

            stage = 'J';
            await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'dark', chromeHue: ${String(TURNED_HUE)} }).then(() => true)`, 30_000);
            await sleep(1500);
            const j = await read('J', { contrast: true, corners: true });
            if (sameColour(j.tokens.bgSidebar, a.tokens.bgSidebar) && sameColour(j.tokens.borderStrong, a.tokens.borderStrong)) {
              arms.RUN.push(`J neither the surround nor the line moved at hue ${String(TURNED_HUE)}, so the treatment did not turn with the Appearance controls`);
            }
            await photograph('J-hue');
            await cdpEval(cdp, `window.gmux.settingsSet({ colorScheme: 'dark', chromeHue: 222 }).then(() => true)`, 30_000);
          } else {
            note('I and J NOT TURNED: window.gmux.settingsSet is not on the bridge. Stated limit, never a pass.');
            arms.RUN.push('I and J were not driven, so the light base and a turned hue were never read');
          }

          arms.R5.push(...quietCoverageFindings(quietSeen));
          stage = 'done';
        } catch (err) {
          arms.RUN.push(`the run stopped during ${stage}: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          try {
            await cdpEval(cdp, `window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true`, 30_000);
          } catch {
            /* best effort; withElectron ends the tree anyway */
          }
          cdp.close();
        }
      }
    );
  } catch (err) {
    arms.RUN.push(`the launch did not complete: ${err instanceof Error ? err.message : String(err)}`);
  }
  writeFileSync(join(outDir, `readings-${tag}.json`), `${J({ arms, readings })}\n`);
  return { arms, readings };
}

// ---------------------------------------------------------------------------
// The run: HEAD, then the parent, one after the other and never at once.
// ---------------------------------------------------------------------------
const head = await runBuild('head', REPO, profiles.head);
let parent = null;
if (parentCheckout !== '') {
  say('the PARENT build, one Electron after the first and never at once, on a profile of its own');
  parent = await runBuild('parent', parentCheckout, profiles.parent);
} else {
  say('(P284_PARENT_CHECKOUT not set: the parent build was not measured)');
}


// -- the report -------------------------------------------------------------
say('');
say('the line against both grounds (SPEC S1.1 predicts 1.658 and 1.594 dark, 1.866 and 2.002 light):');
for (const [state, c] of Object.entries(head.readings.contrast)) {
  say(`  HEAD ${state} (${String(c.scheme)}): ${c.onSurround === null ? 'no line' : c.onSurround.toFixed(3)} on the surround, ${c.onWork === null ? 'no line' : c.onWork.toFixed(3)} on the work; floor ${String(HAIRLINE_FLOOR)}`);
}
say('');
say('panes on this run\'s own tmux server, state by state (printed, not judged):');
const sizeRow = (r) => Object.entries(r.panes).map(([n, s]) => `${n} ${s}`).join(', ') || 'none';
for (const [i, row] of head.readings.sizes.entries()) {
  const p = parent?.readings.sizes[i];
  say(`  ${row.state.padEnd(3)} HEAD ${sizeRow(row)}${p ? `   |   PARENT ${sizeRow(p)}` : ''}`);
}
const centerOf = (b) => b?.readings.states.A?.rects.center?.width ?? null;
say(`  .center in A: HEAD ${String(centerOf(head))}px${parent ? `, PARENT ${String(centerOf(parent))}px` : ''}`);
say('');
say(`arm   HEAD${parent ? '   PARENT' : ''}`);
for (const arm of ARMS) {
  const h = head.arms[arm].length;
  const p = parent ? parent.arms[arm].length : null;
  say(`${arm.padEnd(5)} ${h === 0 ? 'PASS' : `FAIL ${String(h)}`.padEnd(4)}${p === null ? '' : `   ${p === 0 ? 'passes' : `${String(p)} finding(s)`}`}`);
}

const failures = [];
for (const arm of ARMS) for (const f of head.arms[arm]) failures.push(`HEAD ${arm} ${f}`);
if (parent) {
  say('');
  say('what the parent reads, which is what this phase changed:');
  for (const arm of ARMS) for (const f of parent.arms[arm]) say(`  PARENT ${arm} ${f}`);
  failures.push(...parentVerdict(parent.arms));
}

say('');
say(`photographs and readings: ${outDir}. Hold them beside design/prototypes/index.html#surround. Remove the directory before a package: electron-builder packs out/**.`);
if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${TAG}   ${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(parent ? 'PASS: HEAD has 0 findings and the parent fails every arm it must.' : 'PASS: HEAD has 0 findings. The parent was not measured.');
process.exit(0);
