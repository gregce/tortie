#!/usr/bin/env node
/**
 * probe-p334.mjs. THE PHASE 334 APP RUN, at the parent and at HEAD
 * (build/p334/SPEC.md §6 and §8; issues 33 and 32 item 3).
 *
 * ## What it proves, and why it has to be a run
 *
 * Item A (Tier 3): a file an agent rewrote shows the agent's bytes when the
 * person comes back to its tab, returns to its project, lands on it with ⌃Tab
 * or clicks into the editor, EVEN IN A FOLDER THE REPOSITORY IGNORES, where the
 * watcher never fires (research 83 §C.2: ignored 0 of 8). And the thing that
 * matters more than the promise: a door never replaces a buffer the person is
 * typing in. The unit tests drive the store; only a run reads what a real
 * click, a real focus and a real ⌃Tab do to a real Monaco model over a real
 * ignored folder with a real outside writer.
 *
 * Item B (Tier 2): a Redline tab opens where the person left it, and two
 * Redline tabs no longer share one offset.
 *
 * He reported both, so THE PARENT MEASUREMENT IS MANDATORY: the same script
 * drives the parent build first and HEAD second, and every row is graded at
 * both. No drive is added for this phase (SPEC D13): the probe uses only what
 * the parent already ships, being `window.__gmuxShotDrive`, `window.__gmuxP268`
 * (read, setPolicy, type, focusEditor, blur, explicitSave, pressOverwrite,
 * clearToasts), the DOM and CDP input.
 *
 * ## The arms (SPEC §6's table; every door at least 1,200 ms after the
 * previous door in the same repository, except A11, which measures the floor)
 *
 *   A0   control, the blind bus: notes/a.md focused, written, 2,500 ms, no
 *        gesture. Unchanged at both builds.
 *   A0b  control, the live bus: docs/tracked.md written. Updated at both.
 *   A1   activation ×5: click x.ts, 1,200 ms, write, 200 ms, click a.md.
 *   A2   Monaco focus ×5: blur, 1,200 ms, write, 200 ms, focus.
 *   A3   Redline focus ×5 on notes/b.md: focus the strip, write, focus the
 *        scroller; `savedContents` and the drawn text both read.
 *   A4   ⌃Tab landing ×3 from x.ts onto a.md.
 *   A5   project switch ×3: proj2, 1,200 ms, write, back to proj.
 *   A6   auto save after a delay: type P, write, away and back, type Q. HEAD
 *        saves the writer's bytes then Q; the parent stops with one toast.
 *   A7   dirty is never reloaded, under every door, and ⌘S still asks.
 *   A8   a file deleted under a clean tab shows "This file was deleted on disk."
 *   A9   typing in the same turn as an activation keeps the typing.
 *   A10  50 strip clicks in about a second: the bytes land and the app answers.
 *   A11  inside the floor (the stated limit L1): stale after the click, fresh
 *        after a focus past the floor.
 *   B1   Redline long-a at 4,000, away to x.ts and back.
 *   B2   two Redline tabs, long-a at 4,000 and long-b at 1,200.
 *   B3   mode round trip Redline, Source, Redline.
 *   B4   close long-b and open it again: from the top.
 *   B5   an append the bus recomposes never moves the place.
 *
 * ## What it refuses, exit 2 as UNREADABLE rather than pass what it never saw
 *
 * `P334_PARENT_CHECKOUT` absent, equal to this checkout, without
 * `out/main/index.js`, or already holding this phase's two new files; this
 * checkout unbuilt or missing them; a scratch project whose `notes/a.md` git
 * does not ignore; a build whose own overlay parser does not hide gemini,
 * qwen, antigravity, grok and droid; an `agents:list` read back from the app
 * that resolves any of them (checked before any arm); a gesture that did not
 * take. An unreadable arm is never a pass.
 *
 * ## SAFETY
 *
 * Two Electrons ONE AFTER THE OTHER, never at once, each through
 * build/electron-run.mjs, whose `finally` ends the tree it started, on its own
 * scratch profile, scratch HOME and project under `GMUX_HARNESS_DIR`, with
 * this run's tmux socket handed in by build/harness-socket.mjs and named to the
 * helper so its census is the only read of the operator's own server. This
 * script never names that server. Every other process it starts is a
 * synchronous `git`, a synchronous `/bin/sh` (the outside writer), or the
 * pinned tsx of `hiddenAgentsPrecheck`, each exited before the call returns.
 * It starts no agent, spends no token, opens no keychain (`--use-mock-keychain`)
 * and takes no screenshot: a claim is a model value, a `scrollTop`, a
 * rectangle or a label read off the page.
 *
 *   P334_PARENT_CHECKOUT=/path/to/built/parent npm run -s probe:p334
 *   P334_ARMS=A1,A3,B2 ...      named arms only (each sets its own preconditions)
 *   P334_KEEP=1 ...             keep the scratch projects, profiles and homes
 *   P334_REPORT=/tmp/x.json     the report's path, outside this checkout
 *   node build/p334/probe-p334.mjs --self-test   the graders over fixtures, launches nothing
 *
 * Exit 0 when every row grades at both builds, 1 when a row disagrees (each
 * named), 2 when a precondition or an arm could not be read.
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import { cdpEval, wsConnect } from '../cdp-client.mjs';
import * as hidden from '../hidden-agents.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p334]';
const J = JSON.stringify;
const say = (l) => console.log(`${TAG} ${l}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The arms, in the order they run. */
export const ALL_ARMS = Object.freeze([
  'A0', 'A0b', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11',
  'B1', 'B2', 'B3', 'B4', 'B5'
]);
/** How many looks each counting arm makes. */
export const LOOKS = Object.freeze({ A1: 5, A2: 5, A3: 5, A4: 3, A5: 3 });
/** The two files this phase adds; a parent holds neither, HEAD holds both. */
export const PHASE_FILES = Object.freeze([
  'src/renderer/editor/reread-on-return.ts',
  'src/renderer/editor/redline-scroll.ts'
]);
/** The three answers ⌘S offers over a file that changed on disk, in drawn order. */
export const THREE_ANSWERS = Object.freeze(['Overwrite', 'Cancel', 'Compare']);
/** The sentence a tab whose file is gone draws (EditorPanel.tsx). */
export const DELETED_SENTENCE = 'This file was deleted on disk.';
/** B's places, in CSS pixels, and the tolerance SPEC §6 allows. */
export const PLACE_A = 4000;
export const PLACE_B = 1200;
export const PLACE_TOLERANCE = 1;

// ---------------------------------------------------------------------------
// The graders, pure, so --self-test can prove each one can say no.
// ---------------------------------------------------------------------------

/** Is `got` a number within `tol` of `want`? */
export const within = (got, want, tol = PLACE_TOLERANCE) =>
  typeof got === 'number' && Number.isFinite(got) && Math.abs(got - want) <= tol;

/**
 * One look at a Monaco tab, classified. `seen`: the buffer AND what the tab
 * believes is on disk are the writer's bytes and the tab is clean. `stale`:
 * both are still what they were before the write. Anything else is `other`.
 */
export function outcomeOf(after, previous, written) {
  if (after === null || after === undefined || typeof after.value !== 'string') return 'unreadable';
  if (after.value === written && after.savedContents === written && after.dirty === false) return 'seen';
  if (after.value === previous && after.savedContents === previous) return 'stale';
  return 'other';
}

/**
 * One look at a Redline tab, classified by `savedContents` and by whether the
 * DRAWN document holds the writer's marker (a Redline tab may have no model).
 */
export function redlineOutcomeOf(after, previous, written) {
  if (after === null || after === undefined || typeof after.savedContents !== 'string' || typeof after.drawnHasMarker !== 'boolean') {
    return 'unreadable';
  }
  if (after.savedContents === written && after.drawnHasMarker) return 'seen';
  if (after.savedContents === previous && !after.drawnHasMarker) return 'stale';
  return 'other';
}

const unreadableOf = (reading) =>
  reading === undefined || reading === null
    ? 'it was not read'
    : typeof reading.unreadable === 'string'
      ? reading.unreadable
      : null;

/**
 * A counting arm (A1 to A5): HEAD must see every write, the parent none, and
 * every parent look must be stale rather than something else.
 */
export function gradeLooks(build, reading, n, classify = outcomeOf) {
  const why = unreadableOf(reading);
  if (why !== null) return { ok: null, said: why };
  const its = Array.isArray(reading.iterations) ? reading.iterations : [];
  if (its.length !== n) return { ok: null, said: `${String(its.length)} of ${String(n)} looks were made` };
  const missed = its.findIndex((it) => it.gesture !== true);
  if (missed >= 0) return { ok: null, said: `look ${String(missed + 1)}: the gesture did not take (${String(its[missed].why ?? 'no reason recorded')})` };
  const outcomes = its.map((it) => classify(it.after, it.previous, it.written));
  const bad = outcomes.indexOf('unreadable');
  if (bad >= 0) return { ok: null, said: `look ${String(bad + 1)} could not be read` };
  const seen = outcomes.filter((o) => o === 'seen').length;
  const stale = outcomes.filter((o) => o === 'stale').length;
  const other = outcomes.filter((o) => o === 'other').length;
  const tally = `${String(seen)} of ${String(n)} seen, ${String(stale)} stale, ${String(other)} neither`;
  if (build === 'head') return { ok: seen === n, said: `${tally} (want ${String(n)} of ${String(n)} seen)` };
  return { ok: seen === 0 && stale === n, said: `${tally} (want 0 seen, ${String(n)} stale)` };
}

/** A0, the blind bus: nothing re-reads an ignored file without a look, at either build. */
export function gradeA0(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.gesture !== true) return { ok: null, said: 'the editor did not hold focus when the file was written' };
  const o = outcomeOf(r.after, r.previous, r.written);
  if (o === 'unreadable') return { ok: null, said: 'the buffer could not be read' };
  return { ok: o === 'stale', said: `the buffer read ${o} after 2,500 ms with no gesture (want stale)` };
}

/** A0b, the live bus: a tracked file updates by itself, at either build. */
export function gradeA0b(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  const o = outcomeOf(r.after, r.previous, r.written);
  if (o === 'unreadable') return { ok: null, said: 'the buffer could not be read' };
  return { ok: o === 'seen', said: `the tracked buffer read ${o} within 2,500 ms (want seen)` };
}

const toastsNaming = (toasts, text) => (Array.isArray(toasts) ? toasts : []).filter((t) => String(t).includes(text));

/** A6, auto save across an agent's write. */
export function gradeA6(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.landedP !== true) return { ok: null, said: 'the typed P never reached the disk, so the arm has no starting point' };
  const problems = [];
  const onDisk = toastsNaming(r.toasts, 'changed on disk');
  if (build === 'head') {
    if (r.disk !== `${String(r.written)}Q`) problems.push(`the disk is not the writer's bytes then Q (${J(String(r.disk).slice(-40))})`);
    if (r.stopped !== null) problems.push(`auto save stopped (${String(r.stopped)})`);
    if (onDisk.length !== 0) problems.push(`${String(onDisk.length)} toast(s) name a change on disk`);
    return { ok: problems.length === 0, said: problems.join('; ') || "the writer's bytes then Q are on disk; no stop; no toast" };
  }
  if (r.stopped !== 'stale') problems.push(`the stop record reads ${J(r.stopped)} (want "stale")`);
  if (toastsNaming(r.toasts, "'a.md' changed on disk").length !== 1) problems.push(`${String(toastsNaming(r.toasts, "'a.md' changed on disk").length)} toast(s) name 'a.md' changed on disk (want 1)`);
  if (r.disk !== r.written) problems.push("the disk is not the writer's bytes");
  return { ok: problems.length === 0, said: problems.join('; ') || "stopped stale with one toast; the writer's bytes kept" };
}

/** A7, a dirty tab under every door: identical at both builds. */
export function gradeA7(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.typed !== true) return { ok: null, said: 'the D never reached the buffer' };
  if (r.focused !== true) return { ok: null, said: 'the focus door did not take' };
  const problems = [];
  const a = r.after ?? {};
  if (a.value !== `${String(r.previous)}D`) problems.push('the buffer is not the old text plus D: a door replaced typing');
  if (a.dirty !== true) problems.push('the tab is not dirty');
  if (a.savedContents !== r.previous) problems.push('savedContents moved under a dirty tab');
  if (r.disk !== r.written) problems.push("the writer's bytes are not on disk");
  if (r.dialog?.open !== true) problems.push('⌘S did not ask');
  else if (J(r.dialog.buttons) !== J(THREE_ANSWERS)) problems.push(`⌘S offered ${J(r.dialog.buttons)}`);
  if (r.afterCancel?.open !== false) problems.push('the dialog stayed open after Cancel');
  if (r.afterCancel?.dirty !== true) problems.push('the tab went clean after Cancel');
  if (r.afterCancel?.disk !== r.written) problems.push('Cancel wrote the disk');
  return { ok: problems.length === 0, said: problems.join('; ') || 'buffer kept, dirty, the writer kept; ⌘S asked and Cancel wrote nothing' };
}

/** A8, a file deleted under a clean tab. */
export function gradeA8(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.removed !== true) return { ok: null, said: 'the file was still on disk after rm' };
  if (r.gesture !== true) return { ok: null, said: 'the tab did not come back on screen' };
  const intact = r.value === r.previous;
  const want = build === 'head';
  return {
    ok: r.banner === want && intact,
    said: `the deleted sentence ${r.banner ? 'is' : 'is not'} shown (want ${want ? 'shown' : 'not shown'}); the buffer is ${intact ? 'intact' : 'NOT intact'}`
  };
}

/**
 * A9 and A10 begin from a clean tab in step with its disk, with no walk in
 * the air, or `previous` is not what the gesture goes onto (the fix round: the
 * verifier's ST2 found A9 reading the writer's bytes into the clean buffer
 * through the setup's own strip click, and FAIL on a safe outcome).
 */
const NOT_IN_STEP = 'a.md was not clean and in step with its disk before the write, so the arm has no starting point';

/** A9, an edit in the same turn as an activation: identical at both builds. */
export function gradeA9(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.inStepBefore !== true) return { ok: null, said: NOT_IN_STEP };
  const a = r.after ?? {};
  const problems = [];
  if (a.value !== `${String(r.previous)}T`) problems.push('the buffer is not the old text plus T');
  if (a.dirty !== true) problems.push('the tab is not dirty');
  if (a.savedContents !== r.previous) problems.push('savedContents moved');
  if (r.disk !== r.written) problems.push("the writer's bytes are not on disk");
  return { ok: problems.length === 0, said: problems.join('; ') || "the typing kept, dirty, the writer's bytes on disk" };
}

/** A10, the burst. The walk count is a reading, never the grade (R10 is the authority). */
export function gradeA10(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (r.inStepBefore !== true) return { ok: null, said: NOT_IN_STEP };
  if (r.active !== 'a.md') return { ok: null, said: `the burst ended on ${J(r.active)}, not a.md` };
  if (r.answers !== true) return { ok: false, said: 'the app did not answer after the burst' };
  const o = outcomeOf(r.after, r.previous, r.written);
  if (o === 'unreadable') return { ok: null, said: 'the buffer could not be read' };
  const want = build === 'head' ? 'seen' : 'stale';
  return { ok: o === want, said: `${String(r.clicks)} clicks in ${String(r.durationMs)} ms; a.md read ${o} (want ${want}); the app answered` };
}

/**
 * A11, inside the floor. HEAD: the x.ts door walked (m1 landed), the a.md
 * click 300 ms later did not (m2 not seen), and the focus past the floor did.
 * The parent: nothing re-read, before or after.
 */
export function gradeA11(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (typeof r.clickAtMs !== 'number' || r.clickAtMs < 250 || r.clickAtMs >= 900) {
    return { ok: null, said: `the a.md click landed at +${String(r.clickAtMs)} ms, not inside the floor` };
  }
  if (typeof r.focusAtMs !== 'number' || r.focusAtMs < 1200) return { ok: null, said: `the focus came at +${String(r.focusAtMs)} ms, not past the floor` };
  if (r.focused !== true) return { ok: null, said: 'the focus did not take' };
  const click = r.afterClick?.value;
  const focus = r.afterFocus?.value;
  if (typeof click !== 'string' || typeof focus !== 'string') return { ok: null, said: 'the buffer could not be read' };
  const name = (v) => (v === r.m2 ? 'the second write' : v === r.m1 ? 'the first write' : v === r.previous ? 'the old text' : 'something else');
  if (build === 'head') {
    const ok = click === r.m1 && focus === r.m2 && r.afterFocus?.savedContents === r.m2;
    return { ok, said: `after the click: ${name(click)} (want the first write: stale inside the floor); after the focus: ${name(focus)} (want the second write)` };
  }
  return { ok: click === r.previous && focus === r.previous, said: `after the click: ${name(click)}; after the focus: ${name(focus)} (want the old text both times)` };
}

/** B1: away to Source and back. */
export function gradeB1(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (!within(r.set, PLACE_A)) return { ok: null, said: `the place could not be set to ${String(PLACE_A)} (read ${String(r.set)})` };
  const want = build === 'head' ? PLACE_A : 0;
  return { ok: within(r.read, want), said: `long-a came back at ${String(r.read)} (want ${String(want)} ±${String(PLACE_TOLERANCE)})` };
}

/**
 * B2: two Redline tabs. HEAD keeps one place per tab. The parent shares ONE
 * offset: long-b arrives at long-a's (or its clamp), long-a then reads
 * long-b's, and long-b reads whatever long-a held (or its clamp).
 */
export function gradeB2(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (!within(r.setA, PLACE_A)) return { ok: null, said: `long-a could not be set to ${String(PLACE_A)} (read ${String(r.setA)})` };
  if (!within(r.setB, PLACE_B)) return { ok: null, said: `long-b could not be set to ${String(PLACE_B)} (read ${String(r.setB)})` };
  if (typeof r.maxB !== 'number') return { ok: null, said: "long-b's scroll range could not be read" };
  const read = `long-b arrived at ${String(r.arrival)}, long-a read ${String(r.a2)}, long-b read ${String(r.b2)}`;
  if (build === 'head') {
    const ok = within(r.arrival, 0) && within(r.a2, PLACE_A) && within(r.b2, PLACE_B);
    return { ok, said: `${read} (want 0, ${String(PLACE_A)}, ${String(PLACE_B)})` };
  }
  const arrivalWant = Math.min(PLACE_A, r.maxB);
  const b2Want = typeof r.a2 === 'number' ? Math.min(r.a2, r.maxB) : NaN;
  const ok = within(r.arrival, arrivalWant) && within(r.a2, PLACE_B) && within(r.b2, b2Want);
  return { ok, said: `${read} (want the shared offset: ${String(arrivalWant)}, ${String(PLACE_B)}, ${String(b2Want)})` };
}

/** B3: Redline, Source, Redline on one tab. */
export function gradeB3(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (!within(r.set, PLACE_A)) return { ok: null, said: `the place could not be set to ${String(PLACE_A)} (read ${String(r.set)})` };
  const want = build === 'head' ? PLACE_A : 0;
  return { ok: within(r.read, want), said: `after Source and back, long-a read ${String(r.read)} (want ${String(want)})` };
}

/** B4: a closed tab opened again starts at the top; the parent is recorded. */
export function gradeB4(build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (!within(r.set, PLACE_B)) return { ok: null, said: `long-b could not be set to ${String(PLACE_B)} before the close (read ${String(r.set)})` };
  if (typeof r.read !== 'number') return { ok: null, said: 'the reopened tab had no place to read' };
  if (build === 'head') return { ok: within(r.read, 0), said: `the reopened long-b read ${String(r.read)} (want 0)` };
  return { ok: true, said: `recorded: the reopened long-b read ${String(r.read)}` };
}

/** B5: an append the bus recomposes never moves the place, at either build. */
export function gradeB5(_build, r) {
  const why = unreadableOf(r);
  if (why !== null) return { ok: null, said: why };
  if (!within(r.set, PLACE_A)) return { ok: null, said: `the place could not be set to ${String(PLACE_A)} (read ${String(r.set)})` };
  if (r.recomposed !== true) return { ok: null, said: 'the appended line never reached the drawn document, so no recompose was seen' };
  return { ok: within(r.read, PLACE_A), said: `after the recompose long-a read ${String(r.read)} (want ${String(PLACE_A)})` };
}

const GRADERS = {
  A0: gradeA0,
  A0b: gradeA0b,
  A1: (b, r) => gradeLooks(b, r, LOOKS.A1),
  A2: (b, r) => gradeLooks(b, r, LOOKS.A2),
  A3: (b, r) => gradeLooks(b, r, LOOKS.A3, redlineOutcomeOf),
  A4: (b, r) => gradeLooks(b, r, LOOKS.A4),
  A5: (b, r) => gradeLooks(b, r, LOOKS.A5),
  A6: gradeA6,
  A7: gradeA7,
  A8: gradeA8,
  A9: gradeA9,
  A10: gradeA10,
  A11: gradeA11,
  B1: gradeB1,
  B2: gradeB2,
  B3: gradeB3,
  B4: gradeB4,
  B5: gradeB5
};

/** Every asked arm at both builds, graded. A build that was never read grades null. */
export function rowsFor(arms, readings) {
  const rows = [];
  for (const build of ['parent', 'head']) {
    for (const arm of arms) {
      const g = GRADERS[arm];
      const r = readings?.[build]?.[arm];
      const graded = g === undefined ? { ok: null, said: 'no grader' } : g(build, r);
      rows.push({ arm, build, ok: graded.ok, said: graded.said });
    }
  }
  return rows;
}

/**
 * 1 when any row disagrees; 2 when nothing disagrees and something could not
 * be read (or there is nothing at all); 0 only when every row graded.
 */
export function exitCodeOf(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 2;
  if (rows.some((r) => r.ok === false)) return 1;
  if (rows.some((r) => r.ok !== true)) return 2;
  return 0;
}

export const formatRow = (r) =>
  `${r.ok === true ? 'ok  ' : r.ok === false ? 'FAIL' : 'UNREADABLE'} ${r.arm} (${r.build}): ${r.said}`;

/** Why this run may not start with these two checkouts, or null. */
export function parentRefusal({ parent, root, built, holds, same }) {
  if (typeof parent !== 'string' || parent.trim() === '') {
    return 'P334_PARENT_CHECKOUT names no checkout. Point it at a BUILT checkout of the phase parent (d89d1ad1); the parent measurement is mandatory.';
  }
  if (same(parent, root)) return 'P334_PARENT_CHECKOUT is this checkout. The parent must be a separate built checkout of the phase parent.';
  if (!built(parent)) return `the parent (${parent}) has no build at out/main/index.js. Run npm run build there first.`;
  if (!built(root)) return `this checkout (${root}) has no build at out/main/index.js. Run npm run build first.`;
  const inParent = PHASE_FILES.filter((f) => holds(parent, f));
  if (inParent.length > 0) return `the parent (${parent}) already holds ${inParent.join(' and ')}, so it is not this phase's parent.`;
  const missing = PHASE_FILES.filter((f) => !holds(root, f));
  if (missing.length > 0) return `this checkout lacks ${missing.join(' and ')}, so it is not this phase's HEAD.`;
  return null;
}

/** P334_ARMS read: the canonical names asked, or the refusal. */
export function armsAsked(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return { arms: [...ALL_ARMS], bad: [] };
  const asked = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const bad = asked.filter((a) => !ALL_ARMS.some((x) => x.toLowerCase() === a.toLowerCase()));
  const arms = ALL_ARMS.filter((x) => asked.some((a) => a.toLowerCase() === x.toLowerCase()));
  return { arms, bad };
}

// ---------------------------------------------------------------------------
// The fixtures, and the self-test.
// ---------------------------------------------------------------------------

function fixtureLooks(build, n, redline) {
  const iterations = [];
  for (let i = 0; i < n; i += 1) {
    const previous = `old ${String(i)}\n`;
    const written = `new ${String(i)}\n`;
    const after = redline
      ? build === 'head'
        ? { savedContents: written, drawnHasMarker: true }
        : { savedContents: previous, drawnHasMarker: false }
      : build === 'head'
        ? { value: written, savedContents: written, dirty: false }
        : { value: previous, savedContents: previous, dirty: false };
    iterations.push({ gesture: true, previous, written, after });
  }
  return { iterations };
}

/** Readings a correct build would produce, per SPEC §6's table. */
export function fixtureReadings(build) {
  const head = build === 'head';
  const P = 'prev\n';
  const W = 'writer\n';
  const clean = (v) => ({ value: v, savedContents: v, dirty: false });
  return {
    A0: { gesture: true, previous: P, written: W, after: clean(P) },
    A0b: { previous: P, written: W, after: clean(W) },
    A1: fixtureLooks(build, LOOKS.A1, false),
    A2: fixtureLooks(build, LOOKS.A2, false),
    A3: fixtureLooks(build, LOOKS.A3, true),
    A4: fixtureLooks(build, LOOKS.A4, false),
    A5: fixtureLooks(build, LOOKS.A5, false),
    A6: head
      ? { landedP: true, written: W, disk: `${W}Q`, stopped: null, toasts: [], dirty: false }
      : {
          landedP: true,
          written: W,
          disk: W,
          stopped: 'stale',
          toasts: ["'a.md' changed on disk, so nothing was written. Tortie stopped saving it on its own — press ⌘S when you are ready."],
          dirty: true
        },
    A7: {
      typed: true,
      focused: true,
      previous: P,
      written: W,
      after: { value: `${P}D`, savedContents: P, dirty: true },
      disk: W,
      dialog: { open: true, buttons: [...THREE_ANSWERS] },
      afterCancel: { open: false, dirty: true, disk: W }
    },
    A8: { removed: true, gesture: true, previous: P, banner: head, value: P },
    A9: { inStepBefore: true, previous: P, written: W, after: { value: `${P}T`, savedContents: P, dirty: true }, disk: W },
    A10: { inStepBefore: true, previous: P, written: W, active: 'a.md', answers: true, clicks: 50, durationMs: 1100, after: head ? clean(W) : clean(P) },
    A11: {
      previous: P,
      m1: 'm1\n',
      m2: 'm2\n',
      clickAtMs: 300,
      focusAtMs: 1350,
      focused: true,
      afterClick: head ? clean('m1\n') : clean(P),
      afterFocus: head ? clean('m2\n') : clean(P)
    },
    B1: { set: PLACE_A, read: head ? PLACE_A : 0 },
    B2: { setA: PLACE_A, maxB: 3100, arrival: head ? 0 : 3100, setB: PLACE_B, a2: head ? PLACE_A : PLACE_B, b2: PLACE_B },
    B3: { set: PLACE_A, read: head ? PLACE_A : 0 },
    B4: { set: PLACE_B, read: 0 },
    B5: { set: PLACE_A, recomposed: true, read: PLACE_A }
  };
}

const clone = (v) => JSON.parse(J(v));
function both() {
  return { parent: fixtureReadings('parent'), head: fixtureReadings('head') };
}

/**
 * One break per clause: [label, arm, build, mutate, expected ok]. Each must
 * turn exactly that row and no other.
 */
export const BREAKS = Object.freeze([
  ['A0: the bus walked an ignored file', 'A0', 'head', (r) => { r.after = { value: r.written, savedContents: r.written, dirty: false }; }, false],
  ['A0b: the live bus did not update', 'A0b', 'parent', (r) => { r.after = { value: r.previous, savedContents: r.previous, dirty: false }; }, false],
  ['A1: the parent saw a write', 'A1', 'parent', (r) => { const it = r.iterations[2]; it.after = { value: it.written, savedContents: it.written, dirty: false }; }, false],
  ['A1: HEAD missed one look', 'A1', 'head', (r) => { const it = r.iterations[4]; it.after = { value: it.previous, savedContents: it.previous, dirty: false }; }, false],
  ['A1: a parent look that is neither seen nor stale', 'A1', 'parent', (r) => { const it = r.iterations[0]; it.after = { value: 'x', savedContents: it.previous, dirty: true }; }, false],
  ['A2: HEAD reloaded the model but left the tab dirty', 'A2', 'head', (r) => { const it = r.iterations[1]; it.after = { value: it.written, savedContents: it.written, dirty: true }; }, false],
  ['A2: HEAD reloaded the model and not savedContents', 'A2', 'head', (r) => { const it = r.iterations[1]; it.after = { value: it.written, savedContents: it.previous, dirty: false }; }, false],
  ['A3: HEAD read the bytes and never drew them', 'A3', 'head', (r) => { r.iterations[3].after.drawnHasMarker = false; }, false],
  ['A3: the parent drew the marker', 'A3', 'parent', (r) => { r.iterations[3].after.drawnHasMarker = true; }, false],
  ['A4: the parent saw a ⌃Tab landing', 'A4', 'parent', (r) => { const it = r.iterations[0]; it.after = { value: it.written, savedContents: it.written, dirty: false }; }, false],
  ['A5: HEAD missed a project switch', 'A5', 'head', (r) => { const it = r.iterations[2]; it.after = { value: it.previous, savedContents: it.previous, dirty: false }; }, false],
  ['A6: HEAD stopped auto save', 'A6', 'head', (r) => { r.stopped = 'stale'; }, false],
  ['A6: HEAD raised a change-on-disk toast', 'A6', 'head', (r) => { r.toasts = ["'a.md' changed on disk, so nothing was written."]; }, false],
  ['A6: HEAD wrote over the writer', 'A6', 'head', (r) => { r.disk = 'prevPQ'; }, false],
  ['A6: the parent raised no toast', 'A6', 'parent', (r) => { r.toasts = []; }, false],
  ['A6: the parent recorded no stop', 'A6', 'parent', (r) => { r.stopped = null; }, false],
  ['A6: the parent overwrote the writer', 'A6', 'parent', (r) => { r.disk = 'prevPQ'; }, false],
  ['A7: a door replaced the typing', 'A7', 'head', (r) => { r.after = { value: r.written, savedContents: r.written, dirty: false }; }, false],
  ['A7: savedContents moved under the typing', 'A7', 'head', (r) => { r.after.savedContents = r.written; }, false],
  ['A7: ⌘S did not ask', 'A7', 'parent', (r) => { r.dialog = { open: false, buttons: [] }; }, false],
  ['A7: ⌘S offered two answers', 'A7', 'head', (r) => { r.dialog.buttons = ['Overwrite', 'Cancel']; }, false],
  ['A7: Cancel wrote the disk', 'A7', 'head', (r) => { r.afterCancel.disk = `${r.previous}D`; }, false],
  ['A7: Cancel left the dialog open', 'A7', 'head', (r) => { r.afterCancel.open = true; }, false],
  ['A7: the tab went clean after Cancel', 'A7', 'head', (r) => { r.afterCancel.dirty = false; }, false],
  ['A8: HEAD never said the file was deleted', 'A8', 'head', (r) => { r.banner = false; }, false],
  ['A8: the parent said it', 'A8', 'parent', (r) => { r.banner = true; }, false],
  ['A8: the buffer was emptied', 'A8', 'head', (r) => { r.value = ''; }, false],
  ['A9: the typing was lost', 'A9', 'head', (r) => { r.after = { value: r.written, savedContents: r.written, dirty: false }; }, false],
  ['A9: savedContents moved', 'A9', 'parent', (r) => { r.after.savedContents = r.written; }, false],
  ['A9: the tab is not dirty', 'A9', 'head', (r) => { r.after.dirty = false; }, false],
  ['A10: HEAD kept the old bytes', 'A10', 'head', (r) => { r.after = { value: r.previous, savedContents: r.previous, dirty: false }; }, false],
  ['A10: the parent re-read', 'A10', 'parent', (r) => { r.after = { value: r.written, savedContents: r.written, dirty: false }; }, false],
  ['A10: the app stopped answering', 'A10', 'head', (r) => { r.answers = false; }, false],
  ['A11: HEAD re-read inside the floor', 'A11', 'head', (r) => { r.afterClick = { value: r.m2, savedContents: r.m2, dirty: false }; }, false],
  ['A11: HEAD did not re-read past the floor', 'A11', 'head', (r) => { r.afterFocus = { value: r.m1, savedContents: r.m1, dirty: false }; }, false],
  ["A11: HEAD's first door never walked", 'A11', 'head', (r) => { r.afterClick = { value: r.previous, savedContents: r.previous, dirty: false }; }, false],
  ['A11: the parent re-read on focus', 'A11', 'parent', (r) => { r.afterFocus = { value: r.m2, savedContents: r.m2, dirty: false }; }, false],
  ['B1: HEAD came back at the top', 'B1', 'head', (r) => { r.read = 0; }, false],
  ['B1: the parent kept the place', 'B1', 'parent', (r) => { r.read = PLACE_A; }, false],
  ['B1: HEAD two pixels off', 'B1', 'head', (r) => { r.read = PLACE_A - 2; }, false],
  ['B2: HEAD long-b inherited long-a', 'B2', 'head', (r) => { r.arrival = PLACE_A; }, false],
  ["B2: HEAD long-a read long-b's place", 'B2', 'head', (r) => { r.a2 = PLACE_B; }, false],
  ['B2: HEAD long-b lost its place', 'B2', 'head', (r) => { r.b2 = PLACE_A; }, false],
  ['B2: the parent kept two places', 'B2', 'parent', (r) => { r.a2 = PLACE_A; }, false],
  ['B3: HEAD lost the place across Source', 'B3', 'head', (r) => { r.read = 0; }, false],
  ['B3: the parent kept it', 'B3', 'parent', (r) => { r.read = PLACE_A; }, false],
  ['B4: HEAD restored a closed tab', 'B4', 'head', (r) => { r.read = PLACE_B; }, false],
  ['B5: HEAD moved the reader on a recompose', 'B5', 'head', (r) => { r.read = 0; }, false],
  ['B5: the parent moved the reader', 'B5', 'parent', (r) => { r.read = 3000; }, false],
  ['A9: the writer was overwritten', 'A9', 'head', (r) => { r.disk = `${r.previous}T`; }, false],
  ['A11: HEAD drew the second write and kept the old savedContents', 'A11', 'head', (r) => { r.afterFocus = { value: r.m2, savedContents: r.m1, dirty: true }; }, false],
  ['A11: the parent re-read on the click', 'A11', 'parent', (r) => { r.afterClick = { value: r.m1, savedContents: r.m1, dirty: false }; }, false],
  ["B2: the parent's long-b arrived at the top", 'B2', 'parent', (r) => { r.arrival = 0; }, false],
  ["B2: the parent's long-b kept a place of its own", 'B2', 'parent', (r) => { r.b2 = PLACE_A; }, false],
  ['A1: the parent moved savedContents under the old buffer', 'A1', 'parent', (r) => { const it = r.iterations[1]; it.after = { value: it.previous, savedContents: it.written, dirty: true }; }, false],
  ['A7: the D vanished from the buffer', 'A7', 'parent', (r) => { r.after = { value: r.previous, savedContents: r.previous, dirty: true }; }, false],
  ['A7: the tab went clean with the D in it', 'A7', 'head', (r) => { r.after.dirty = false; }, false],
  ['A7: the writer was overwritten', 'A7', 'head', (r) => { r.disk = `${r.previous}D`; }, false],
  ['A7: the dialog read as closed', 'A7', 'head', (r) => { r.dialog.open = false; }, false],
  ['A9: the T vanished from the buffer', 'A9', 'parent', (r) => { r.after = { value: r.previous, savedContents: r.previous, dirty: true }; }, false],
  ["B2: the parent's long-a did not read long-b's offset", 'B2', 'parent', (r) => { r.a2 = 2000; r.b2 = 2000; }, false],
  // UNREADABLE, never a pass:
  ['A7: a focus door that did not take is unreadable', 'A7', 'parent', (r) => { r.focused = false; }, null],
  ['A8: a tab that did not come back is unreadable', 'A8', 'parent', (r) => { r.gesture = false; }, null],
  ['A11: a click before the first walk could land is unreadable', 'A11', 'parent', (r) => { r.clickAtMs = 100; }, null],
  ['A11: a focus that did not take is unreadable', 'A11', 'head', (r) => { r.focused = false; }, null],
  ['B2: long-a not set is unreadable', 'B2', 'head', (r) => { r.setA = 0; }, null],
  ["B2: long-b's range unread is unreadable", 'B2', 'head', (r) => { r.maxB = null; }, null],
  ['B3: a place not set is unreadable', 'B3', 'parent', (r) => { r.set = null; }, null],
  ['B4: no place read after the reopen is unreadable', 'B4', 'parent', (r) => { r.read = null; }, null],
  ['B5: a place not set is unreadable', 'B5', 'parent', (r) => { r.set = 10; }, null],
  ['A2: a focus that did not take is unreadable', 'A2', 'head', (r) => { r.iterations[0].gesture = false; r.iterations[0].why = 'the editor did not take focus'; }, null],
  ['A1: four looks of five is unreadable', 'A1', 'head', (r) => { r.iterations.pop(); }, null],
  ['A0: an unfocused editor is unreadable', 'A0', 'parent', (r) => { r.gesture = false; }, null],
  ['A6: a P that never landed is unreadable', 'A6', 'head', (r) => { r.landedP = false; }, null],
  ['A7: a D that never landed is unreadable', 'A7', 'head', (r) => { r.typed = false; }, null],
  ['A8: a file still on disk is unreadable', 'A8', 'head', (r) => { r.removed = false; }, null],
  ['A10: a burst that ended elsewhere is unreadable', 'A10', 'head', (r) => { r.active = 'x.ts'; }, null],
  ['A11: a click outside the floor is unreadable', 'A11', 'head', (r) => { r.clickAtMs = 950; }, null],
  ['A11: a focus inside the floor is unreadable', 'A11', 'head', (r) => { r.focusAtMs = 900; }, null],
  ['B1: a document too short to scroll is unreadable', 'B1', 'head', (r) => { r.set = 812; }, null],
  ['B2: long-b not set is unreadable', 'B2', 'parent', (r) => { r.setB = null; }, null],
  ['B4: no place before the close is unreadable', 'B4', 'head', (r) => { r.set = 0; }, null],
  ['B5: no recompose seen is unreadable', 'B5', 'head', (r) => { r.recomposed = false; }, null],
  ['an arm that threw is unreadable', 'A9', 'head', (r) => { for (const k of Object.keys(r)) delete r[k]; r.unreadable = 'it threw: boom'; }, null],
  // The fix round's three:
  ['A9: a write made before the setup walk was over is unreadable', 'A9', 'head', (r) => { r.inStepBefore = false; }, null],
  ['A10: a write made before the setup walk was over is unreadable', 'A10', 'parent', (r) => { delete r.inStepBefore; }, null],
  ['A4: a return that stopped the arm keeps its looks and is unreadable', 'A4', 'head', (r) => { r.iterations.pop(); r.unreadable = 'look 3: the strip tab x.ts could not be clicked'; }, null]
]);

function selfTest() {
  const bad = [];
  const expect = (label, got, want) => {
    if (J(got) !== J(want)) bad.push(`${label}: got ${J(got)}, want ${J(want)}`);
  };

  // A clean row at both builds is every row ok, and exit 0.
  const cleanRows = rowsFor(ALL_ARMS, both());
  expect('clean: every row ok', cleanRows.filter((r) => r.ok !== true).map(formatRow), []);
  expect('clean: exit 0', exitCodeOf(cleanRows), 0);
  expect('clean: 36 rows', cleanRows.length, ALL_ARMS.length * 2);

  // Each break turns exactly its own row, and names its arm.
  for (const [label, arm, build, mutate, want] of BREAKS) {
    const readings = clone(both());
    mutate(readings[build][arm]);
    const rows = rowsFor(ALL_ARMS, readings);
    const mine = rows.find((r) => r.arm === arm && r.build === build);
    const others = rows.filter((r) => !(r.arm === arm && r.build === build) && r.ok !== true);
    expect(`${label}: its row`, mine === undefined ? 'missing' : mine.ok, want);
    expect(`${label}: no other row moved`, others.map(formatRow), []);
    expect(`${label}: exit`, exitCodeOf(rows), want === false ? 1 : 2);
    expect(`${label}: the line names the arm`, formatRow(mine).includes(` ${arm} (${build}):`), true);
  }

  // A build never read is unreadable at every arm, so exit 2, never a pass.
  const noHead = rowsFor(ALL_ARMS, { parent: fixtureReadings('parent') });
  expect('no HEAD readings: exit 2', exitCodeOf(noHead), 2);
  expect('no HEAD readings: every HEAD row null', noHead.filter((r) => r.build === 'head').every((r) => r.ok === null), true);
  expect('nothing: exit 2', exitCodeOf([]), 2);
  expect('an ok that is undefined is not a pass', exitCodeOf([{ arm: 'A1', build: 'head', ok: undefined, said: '' }]), 2);
  expect('a failure beside an unreadable is exit 1', exitCodeOf([{ ok: false }, { ok: null }, { ok: true }]), 1);

  // The classifiers.
  expect('outcome: seen', outcomeOf({ value: 'w', savedContents: 'w', dirty: false }, 'p', 'w'), 'seen');
  expect('outcome: a dirty reload is not seen', outcomeOf({ value: 'w', savedContents: 'w', dirty: true }, 'p', 'w'), 'other');
  expect('outcome: stale', outcomeOf({ value: 'p', savedContents: 'p', dirty: false }, 'p', 'w'), 'stale');
  expect('outcome: an old buffer over a moved savedContents is not stale', outcomeOf({ value: 'p', savedContents: 'w', dirty: true }, 'p', 'w'), 'other');
  expect('outcome: no model', outcomeOf({ value: null, savedContents: 'p', dirty: false }, 'p', 'w'), 'unreadable');
  expect('redline: seen needs the drawn marker', redlineOutcomeOf({ savedContents: 'w', drawnHasMarker: false }, 'p', 'w'), 'other');
  expect('redline: stale', redlineOutcomeOf({ savedContents: 'p', drawnHasMarker: false }, 'p', 'w'), 'stale');
  expect('within: one pixel', within(4001, 4000), true);
  expect('within: two pixels', within(3998, 4000), false);
  expect('within: null', within(null, 0), false);

  // The parent refusals.
  const fs = (builtSet, holdsSet) => ({
    built: (d) => builtSet.includes(d),
    holds: (d, f) => holdsSet.includes(`${d}:${f}`),
    same: (a, b) => a === b
  });
  const heads = PHASE_FILES.map((f) => `/head:${f}`);
  expect('refuse: absent', parentRefusal({ parent: '', root: '/head', ...fs(['/head'], heads) })?.startsWith('P334_PARENT_CHECKOUT names no checkout'), true);
  expect('refuse: this checkout', parentRefusal({ parent: '/head', root: '/head', ...fs(['/head'], heads) })?.includes('is this checkout'), true);
  expect('refuse: unbuilt parent', parentRefusal({ parent: '/p', root: '/head', ...fs(['/head'], heads) })?.includes('has no build'), true);
  expect('refuse: unbuilt HEAD', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p'], heads) })?.includes('this checkout'), true);
  expect('refuse: a parent that is not one', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], [...heads, `/p:${PHASE_FILES[0]}`]) })?.includes('not this phase'), true);
  expect('refuse: a HEAD without the phase', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], []) })?.includes("not this phase's HEAD"), true);
  expect('accept: a built parent and HEAD', parentRefusal({ parent: '/p', root: '/head', ...fs(['/p', '/head'], heads) }), null);

  // The arm list.
  expect('arms: all by default', armsAsked('').arms, [...ALL_ARMS]);
  expect('arms: case and order', armsAsked('b2, a0B,A1').arms, ['A0b', 'A1', 'B2']);
  expect('arms: an unknown name is refused', armsAsked('A1,A99').bad, ['A99']);

  if (bad.length > 0) {
    process.stdout.write(`${TAG} --self-test FAIL, ${String(bad.length)}:\n${bad.map((b) => `  - ${b}`).join('\n')}\n`);
    return false;
  }
  say(`--self-test PASS: a clean row at both builds, ${String(BREAKS.length)} breaks each turning exactly its own row, the refusals and the classifiers. Nothing was launched.`);
  return true;
}
if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

// ---------------------------------------------------------------------------
// The refusals, before anything is created.
// ---------------------------------------------------------------------------

class Unreadable extends Error {}
class Fatal extends Error {}
function refuse(why) {
  console.error(`${TAG} UNREADABLE: ${why}`);
  process.exit(2);
}

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  say('no GMUX_TMUX_SOCKET; wrapping in build/harness-socket.mjs');
  const w = spawnSync(
    process.execPath,
    [join(ROOT, 'build', 'harness-socket.mjs'), '--fresh', 'gmux-p334', `node ${process.argv[1]}`],
    { cwd: ROOT, stdio: 'inherit' }
  );
  process.exit(w.status ?? 2);
}
if (socket === 'gmux' || socket === 'default' || !socket.startsWith('gmux-')) refuse(`refusing the socket ${J(socket)}: not a scratch socket.`);
const harnessDir = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
if (harnessDir === '') refuse('no GMUX_HARNESS_DIR. Run me through build/harness-socket.mjs.');

const realOr = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const PARENT_RAW = (process.env['P334_PARENT_CHECKOUT'] ?? '').trim();
const PARENT_DIR = PARENT_RAW === '' ? '' : realOr(PARENT_RAW);
const parentWhy = parentRefusal({
  parent: PARENT_DIR,
  root: realOr(ROOT),
  built: (d) => existsSync(join(d, 'out', 'main', 'index.js')),
  holds: (d, f) => existsSync(join(d, f)),
  same: (a, b) => realOr(a) === realOr(b)
});
if (parentWhy !== null) refuse(parentWhy);

const { arms: ASKED, bad: BAD_ARMS } = armsAsked(process.env['P334_ARMS']);
if (BAD_ARMS.length > 0) refuse(`P334_ARMS names ${BAD_ARMS.join(', ')}, which is no arm (${ALL_ARMS.join(', ')}).`);
const want = (arm) => ASKED.includes(arm);
const KEEP = (process.env['P334_KEEP'] ?? '') === '1';

mkdirSync(harnessDir, { recursive: true });
const HARNESS = realOr(harnessDir);
const SCRATCH = join(HARNESS, 'p334');
const REPORT_PATH = resolve((process.env['P334_REPORT'] ?? '').trim() || `${HARNESS}-probe-p334.json`);
const insideOf = (p, dir) => p === dir || p.startsWith(`${dir}${sep}`);
if (insideOf(REPORT_PATH, realOr(ROOT)) || insideOf(REPORT_PATH, ROOT)) {
  refuse(`P334_REPORT (${REPORT_PATH}) must sit outside this checkout: electron-builder packs out/, and the repository is not a report shelf.`);
}
if (!KEEP && insideOf(REPORT_PATH, SCRATCH)) refuse(`P334_REPORT (${REPORT_PATH}) sits inside the scratch directory, which is removed at the end.`);

const PREFIX = 'p334';
/** Every Claude Code and zsh dotfile name this process inherited, REMOVED from the app's environment. */
const STRIPPED = Object.fromEntries(
  Object.keys(process.env)
    .filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n) || n === 'ZDOTDIR' || n === 'HISTFILE' || n === 'GMUX_CONFIG_ROOT')
    .map((n) => [n, undefined])
);

// ---------------------------------------------------------------------------
// The scratch world: two git projects, `notes/` ignored and present BEFORE the
// app starts, because the watcher reads ignored roots once.
// ---------------------------------------------------------------------------

const NOTE = (name) =>
  `# ${name}\n\nShort notes the probe wrote before the app started. An agent rewrites this file from outside the editor.\n`;
const TRACKED_TEXT = '# Tracked\n\nA tracked file the repository watcher reports on.\n';
function longProse(tag, lines) {
  const out = [`# ${tag}`, ''];
  for (let i = 1; out.length < lines; i += 1) {
    out.push(`Paragraph ${String(i)} of ${tag}: plain prose an agent might have written, long enough to wrap once in a narrow column of the editor.`);
    out.push('');
  }
  return `${out.join('\n')}\n`;
}

function gitIn(cwd, home, ...args) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_TERMINAL_PROMPT: '0'
    }
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}
function gitOk(cwd, home, ...args) {
  const r = gitIn(cwd, home, ...args);
  if (r.status !== 0) throw new Fatal(`git ${args.join(' ')} in ${cwd}: ${r.stderr.trim()}`);
  return r.stdout;
}

function buildWorld(base) {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  const root = realpathSync(base);
  const home = join(root, 'h');
  const profile = join(root, 'p');
  const proj = join(root, 'proj');
  const proj2 = join(root, 'proj2');
  for (const d of [home, profile, join(proj, 'notes'), join(proj, 'docs'), join(proj, 'src'), proj2]) mkdirSync(d, { recursive: true });
  const files = {
    x: join(proj, 'src', 'x.ts'),
    tracked: join(proj, 'docs', 'tracked.md'),
    a: join(proj, 'notes', 'a.md'),
    b: join(proj, 'notes', 'b.md'),
    c: join(proj, 'notes', 'c.md'),
    d: join(proj, 'notes', 'd.md'),
    longA: join(proj, 'docs', 'long-a.md'),
    longB: join(proj, 'docs', 'long-b.md'),
    p2: join(proj2, 'p2.md')
  };
  writeFileSync(join(proj, '.gitignore'), 'notes/\n');
  for (const k of ['a', 'b', 'c', 'd']) writeFileSync(files[k], NOTE(`${k}.md`));
  writeFileSync(files.tracked, TRACKED_TEXT);
  writeFileSync(files.longA, longProse('long-a', 3000));
  writeFileSync(files.longB, longProse('long-b', 1500));
  writeFileSync(files.x, 'export const x = 1;\n');
  writeFileSync(files.p2, '# p2\n\nThe other project.\n');
  for (const dir of [proj, proj2]) {
    gitOk(dir, home, 'init', '-q', '-b', 'main');
    gitOk(dir, home, 'config', 'user.email', 'p334@example.invalid');
    gitOk(dir, home, 'config', 'user.name', 'p334');
  }
  gitOk(proj, home, 'add', '.gitignore', 'docs', 'src');
  gitOk(proj, home, 'commit', '-q', '-m', 'first');
  gitOk(proj2, home, 'add', '.');
  gitOk(proj2, home, 'commit', '-q', '-m', 'first');
  // One paragraph near the top of each long file now differs from HEAD, so
  // Redline is offered and draws a change.
  for (const [path, tag] of [[files.longA, 'long-a'], [files.longB, 'long-b']]) {
    const text = readFileSync(path, 'utf8');
    writeFileSync(path, text.replace(`Paragraph 3 of ${tag}: plain prose`, `Paragraph 3 of ${tag}, CHANGED SINCE THE COMMIT: plain prose`));
  }
  // THE PRECONDITION, graded: git itself says the notes are ignored.
  const ignored = gitIn(proj, home, 'check-ignore', '-q', 'notes/a.md').status;
  const tracked = gitOk(proj, home, 'ls-files', 'notes').trim();
  return { root, home, profile, proj, proj2, files, ignored, trackedNotes: tracked };
}

/** The outside writer: a synchronous /bin/sh, which is what an agent's write is. */
function shWrite(path, bytes) {
  const r = spawnSync('/bin/sh', ['-c', 'printf "%s" "$1" > "$2"', 'sh', bytes, path], { encoding: 'utf8' });
  if (r.status !== 0) throw new Unreadable(`the writer failed on ${basename(path)}: ${String(r.stderr).trim()}`);
}
function shAppend(path, bytes) {
  const r = spawnSync('/bin/sh', ['-c', 'printf "%s" "$1" >> "$2"', 'sh', bytes, path], { encoding: 'utf8' });
  if (r.status !== 0) throw new Unreadable(`the appender failed on ${basename(path)}`);
}
function shRemove(path) {
  const r = spawnSync('/bin/sh', ['-c', 'rm -f "$1"', 'sh', path], { encoding: 'utf8' });
  if (r.status !== 0) throw new Unreadable(`rm failed on ${basename(path)}`);
}
const disk = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// The page: readers and gestures.
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
        list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
      } catch {
        list = [];
      }
      for (const t of list) {
        if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue;
        let cdp = null;
        try {
          cdp = await wsConnect(t.webSocketDebuggerUrl, { collect: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown'] });
          const a = await cdpEval(
            cdp,
            `typeof window.gmux === 'object' && typeof window.__gmuxShotDrive === 'function' && typeof window.__gmuxP268 === 'object' ? location.href : null`,
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
    if (Date.now() - started > timeoutMs) throw new Unreadable('no app window carrying the shot and Phase 268 drives');
    await sleep(200);
  }
}

/** One tab as the Phase 268 drive reads it, plus what is drawn around it. */
const TAB = (path, marker) => `(() => {
  const p = window.__gmuxP268;
  if (p === undefined || p === null) return null;
  const r = p.read();
  const t = r.tabs.find((x) => x.path === ${J(path)}) ?? null;
  const doc = document.querySelector('.ed-redline-doc');
  return {
    activeId: r.activeId,
    editorFocused: r.editorFocused,
    autoSave: r.mode,
    toasts: r.toasts,
    confirm: r.confirm,
    tab: t === null ? null : { name: t.name, dirty: t.dirty, mode: t.mode, value: t.value, savedContents: t.savedContents, stopped: t.stopped },
    drawnHas: ${marker === undefined ? 'null' : `doc === null ? false : (doc.textContent ?? '').includes(${J(marker)})`},
    doc: doc !== null,
    skeleton: document.querySelector('.ed-skeleton') !== null,
    deletedBanner: Array.from(document.querySelectorAll('.banner-warning')).some((b) => (b.textContent ?? '').includes(${J(DELETED_SENTENCE)}))
  };
})()`;

/** The centre of a strip tab's NAME, scrolled into view, and whether a click there lands on that tab. */
const TAB_BOX = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${J(name)});
  if (!el) return { found: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = (el.querySelector('.ed-tab-name') ?? el).getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, hit: hit !== null && hit.closest('.ed-tab') === el && hit.closest('.ed-tab-close') === null };
})()`;
const CLOSE_BOX = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${J(name)});
  const b = el?.querySelector('.ed-tab-close') ?? null;
  if (!b) return { found: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = b.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, hit: hit !== null && hit.closest('.ed-tab-close') === b };
})()`;
const PTAB_BOX = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ptab')).find((t) => (t.querySelector('.ptab-name')?.textContent ?? '').trim() === ${J(name)});
  if (!el) return { found: false };
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, hit: hit !== null && hit.closest('.ptab') === el };
})()`;
const SELECTED_PROJECT = `(document.querySelector('.ptab.selected .ptab-name')?.textContent ?? '').trim()`;
const ACTIVE_NAME = `(document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim()`;
/** The mode chip by label, the modeButton pattern of redline-shot-probe.ts. */
const CHIP = (label) => `(() => {
  const b = document.querySelector('.ed-tabs-actions .ed-mode [aria-label=${J(label)}]');
  if (b === null || b.disabled) return false;
  b.click();
  return true;
})()`;
/**
 * Focus into Monaco. The Phase 268 drive's own `focusEditor` first; it names
 * `textarea.inputarea`, which Monaco 0.56 does not draw when the page has
 * EditContext (it draws `.native-edit-context`), so the element Monaco itself
 * focuses is focused next when the drive's did not take. Same at both builds.
 */
const FOCUS_MONACO = `(() => {
  const inEd = () => document.activeElement !== null && document.activeElement.closest('.monaco-editor') !== null;
  const was = inEd();
  window.__gmuxP268.focusEditor();
  let how = 'focusEditor';
  if (!inEd()) {
    const ed = Array.from(document.querySelectorAll('.monaco-editor')).find((e) => e.offsetParent !== null) ?? null;
    const el = ed === null ? null : (ed.querySelector('.native-edit-context') ?? ed.querySelector('textarea'));
    if (el !== null) {
      el.focus();
      how = String(el.className || el.tagName);
    } else {
      how = 'nothing to focus';
    }
  }
  return { was, focused: inEd(), how };
})()`;
const FOCUS_STRIP = (name) => `(() => {
  const el = Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.querySelector('.ed-tab-name')?.textContent ?? '').trim() === ${J(name)});
  if (!el) return false;
  el.focus();
  return document.activeElement === el;
})()`;
const FOCUS_SCROLLER = `(() => {
  const el = document.querySelector('.ed-redline-scroll');
  if (!el) return { focused: false, from: null };
  const from = document.activeElement === null ? null : String(document.activeElement.className || document.activeElement.tagName);
  el.focus();
  return { focused: document.activeElement === el, from };
})()`;
/** A place, after two animation frames and 150 ms, with a fallback if frames never come. */
const PLACE = `new Promise((resolve) => {
  let done = false;
  const finish = (raf) => {
    if (done) return;
    done = true;
    setTimeout(() => {
      const el = document.querySelector('.ed-redline-scroll');
      resolve({
        top: el === null ? null : el.scrollTop,
        max: el === null ? null : el.scrollHeight - el.clientHeight,
        raf,
        active: (document.querySelector('.ed-tab.active .ed-tab-name')?.textContent ?? '').trim()
      });
    }, 150);
  };
  requestAnimationFrame(() => requestAnimationFrame(() => finish(true)));
  setTimeout(() => finish(false), 1500);
})`;
const SET_PLACE = (n) => `(() => {
  const el = document.querySelector('.ed-redline-scroll');
  if (el === null) return null;
  el.scrollTop = ${String(n)};
  return el.scrollTop;
})()`;
const DIALOG = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return { open: false, buttons: [] };
  return {
    open: true,
    title: modal.querySelector('.modal-title')?.textContent ?? null,
    buttons: Array.from(modal.querySelectorAll('.modal-actions button')).map((b) => (b.textContent ?? '').trim())
  };
})()`;
const PRESS_CANCEL = `(() => {
  const modal = document.querySelector('.modal[role="alertdialog"]');
  if (!modal) return false;
  const b = Array.from(modal.querySelectorAll('.modal-actions button')).find((x) => (x.textContent ?? '').trim() === 'Cancel');
  if (!b) return false;
  b.click();
  return true;
})()`;
/**
 * SPEC §6 A10: a counting wrapper on `window.gmux.fs.readFile`, if the bridge
 * accepts one. contextBridge freezes it (build/probe-redline-move-on.mjs), so
 * this is expected to answer `installed: false`; the walk count is then
 * UNREADABLE and the unit count R10 is the authority. Never part of the grade.
 */
const COUNTER_INSTALL = `(() => {
  try {
    const fs = window.gmux.fs;
    const orig = fs.readFile;
    window.__p334Reads = [];
    const wrap = function (...args) { window.__p334Reads.push(String(args[0])); return orig.apply(this, args); };
    try { fs.readFile = wrap; } catch (e) { return { installed: false, why: String(e && e.message || e) }; }
    if (fs.readFile !== wrap) return { installed: false, why: 'the assignment did not take (a frozen bridge)' };
    window.__p334Orig = orig;
    return { installed: true, why: null };
  } catch (e) {
    return { installed: false, why: String(e && e.message || e) };
  }
})()`;
const COUNTER_READ = `(() => {
  const reads = Array.isArray(window.__p334Reads) ? window.__p334Reads : [];
  try { if (window.__p334Orig) window.gmux.fs.readFile = window.__p334Orig; } catch { /* frozen */ }
  return reads;
})()`;

function makeKit(cdp, world, build) {
  const { proj, proj2, files } = world;
  const NAMES = {
    [files.x]: 'x.ts',
    [files.tracked]: 'tracked.md',
    [files.a]: 'a.md',
    [files.b]: 'b.md',
    [files.c]: 'c.md',
    [files.d]: 'd.md',
    [files.longA]: 'long-a.md',
    [files.longB]: 'long-b.md'
  };
  const BASE = {
    [files.a]: NOTE('a.md'),
    [files.b]: NOTE('b.md'),
    [files.c]: NOTE('c.md'),
    [files.d]: NOTE('d.md'),
    [files.tracked]: TRACKED_TEXT
  };
  const lastDoor = new Map();
  let seq = 0;
  const ev = (expr, ms = 20000) => cdpEval(cdp, expr, ms);
  const k = {
    build,
    notes: [],
    note(l) {
      k.notes.push(l);
      say(`(${build}) ${l}`);
    },
    /** A gesture that may be a door into `repo`. */
    doorAt(repo = proj) {
      lastDoor.set(repo, Date.now());
    },
    /** Wait until `ms` have passed since the last door into `repo`. */
    async settle(repo, ms) {
      const t = lastDoor.get(repo);
      if (t === undefined) return;
      const left = t + ms - Date.now();
      if (left > 0) await sleep(left);
    },
    /**
     * THE FIX ROUND (the Phase 334 verifier's ST2). Wait out every walk a
     * setup step may have started, then answer the tab's reading and whether it
     * is clean and in step with its disk. Counted from NOW, not from the last
     * recorded door, because the view's own arrival focus is a door the probe
     * cannot timestamp (SPEC §As built, D3 against D4). A write made before
     * this answers lands inside that walk at HEAD and puts the writer's bytes in
     * the clean buffer before the gesture an arm measures; A9 read FAIL on a
     * safe outcome that way, with `previous` read too early.
     */
    async quiet(path, repo = proj) {
      k.doorAt(repo);
      await k.settle(repo, 1200);
      const inStep = (t) => t.tab?.dirty === false && t.tab?.savedContents === disk(path) && t.tab?.value === disk(path);
      const r = await k.waitTab(path, inStep, 2000);
      return { ...r, inStep: inStep(r) };
    },
    async tab(path, marker) {
      const r = await ev(TAB(path, marker));
      if (r === null || r === undefined) throw new Unreadable('the Phase 268 drive is not on the page');
      return r;
    },
    /** Poll a tab until `pred` holds or `ms` pass; answer the last reading. */
    async waitTab(path, pred, ms, marker) {
      const until = Date.now() + ms;
      let r = await k.tab(path, marker);
      while (!pred(r) && Date.now() < until) {
        await sleep(50);
        r = await k.tab(path, marker);
      }
      return r;
    },
    async waitFor(expr, ms, every = 100) {
      const until = Date.now() + ms;
      for (;;) {
        let v = null;
        try {
          v = await ev(expr, 10000);
        } catch {
          v = null;
        }
        if (v === true) return true;
        if (Date.now() > until) return false;
        await sleep(every);
      }
    },
    /** Write fresh bytes to a file from outside, with a marker line of their own. */
    fresh(path, label) {
      seq += 1;
      const marker = `P334 MARKER ${label} ${String(seq)} ${randomBytes(4).toString('hex')}`;
      const bytes = `${BASE[path] ?? ''}\n${marker}\n`;
      shWrite(path, bytes);
      if (disk(path) !== bytes) throw new Unreadable(`the writer's bytes are not on disk for ${basename(path)}`);
      return { bytes, marker };
    },
    async mouseClick(x, y) {
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await cdp.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    },
    /** A strip click, by the tab's name, with a real pointer. */
    async clickTab(name, { wait = true } = {}) {
      const box = await ev(TAB_BOX(name));
      if (box?.found !== true) throw new Unreadable(`no strip tab named ${name}`);
      if (box.hit !== true) throw new Unreadable(`a click at the strip tab ${name} would land on something else`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(proj);
      if (wait && !(await k.waitFor(`${ACTIVE_NAME} === ${J(name)}`, 3000, 25))) {
        throw new Unreadable(`the strip click on ${name} did not make it the active tab`);
      }
    },
    async clickProject(name) {
      const box = await ev(PTAB_BOX(name));
      if (box?.found !== true) throw new Unreadable(`no project tab named ${name}`);
      if (box.hit !== true) throw new Unreadable(`a click at the project tab ${name} would land on something else`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(name === basename(proj2) ? proj2 : proj);
      if (!(await k.waitFor(`${SELECTED_PROJECT} === ${J(name)}`, 4000, 25))) {
        throw new Unreadable(`the click on the project tab ${name} did not select it`);
      }
    },
    async closeTab(name) {
      const box = await ev(CLOSE_BOX(name));
      if (box?.found !== true || box.hit !== true) throw new Unreadable(`the close button of ${name} could not be clicked`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(proj);
      const gone = await k.waitFor(
        `!Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).some((n) => (n.textContent ?? '').trim() === ${J(name)})`,
        4000
      );
      if (!gone) throw new Unreadable(`${name} is still on the strip after its close button`);
    },
    async chip(label, path) {
      const modeOf = { Source: 'file', Redline: 'redline', Diff: 'diff', Preview: 'preview' }[label];
      const now = await k.tab(path);
      if (now.tab?.mode === modeOf) return;
      if ((await ev(CHIP(label))) !== true) throw new Unreadable(`the mode chip has no enabled ${label} for ${basename(path)}`);
      k.doorAt(proj);
      const r = await k.waitTab(path, (t) => t.tab?.mode === modeOf, 5000);
      if (r.tab?.mode !== modeOf) throw new Unreadable(`${basename(path)} did not go to ${label}`);
      if (label === 'Source') {
        const m = await k.waitTab(path, (t) => typeof t.tab?.value === 'string', 15000);
        if (typeof m.tab?.value !== 'string') throw new Unreadable(`${basename(path)} has no Monaco model in Source`);
      }
      if (label === 'Redline') await k.waitRedline(path);
      await sleep(300);
    },
    async waitRedline(path) {
      const r = await k.waitTab(path, (t) => t.activeId === path && t.tab?.mode === 'redline' && t.doc && !t.skeleton, 20000);
      if (!(r.activeId === path && r.tab?.mode === 'redline' && r.doc && !r.skeleton)) {
        throw new Unreadable(`the Redline document of ${basename(path)} never drew`);
      }
      await sleep(300);
    },
    async ensureActive(path) {
      const r = await k.tab(path);
      if (r.tab === null) throw new Unreadable(`${basename(path)} is not open`);
      if (r.activeId !== path) {
        await k.settle(proj, 1200);
        await k.clickTab(NAMES[path]);
      }
    },
    async ensureSource(path) {
      await k.ensureActive(path);
      await k.chip('Source', path);
    },
    async ensureRedline(path) {
      await k.ensureActive(path);
      await k.chip('Redline', path);
      await k.waitRedline(path);
    },
    async focusMonaco() {
      const r = await ev(FOCUS_MONACO);
      k.doorAt(proj);
      return r;
    },
    async blur() {
      const r = await ev('window.__gmuxP268.blur()');
      return r;
    },
    async ctrlTab() {
      const key = (type, keyName, code, vk, modifiers) =>
        cdp.call('Input.dispatchKeyEvent', { type, key: keyName, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
      await key('rawKeyDown', 'Control', 'ControlLeft', 17, 2);
      await key('rawKeyDown', 'Tab', 'Tab', 9, 2);
      await key('keyUp', 'Tab', 'Tab', 9, 2);
      await sleep(60);
      await key('keyUp', 'Control', 'ControlLeft', 17, 0);
      k.doorAt(proj);
    },
    async type(path, text) {
      const r = await ev(`window.__gmuxP268.type(${J(path)}, ${J(text)}, 0).then((x) => x.activeId)`, 60000);
      k.doorAt(proj);
      return r;
    },
    async setPolicy(mode, delayMs) {
      return ev(`window.__gmuxP268.setPolicy(${J(mode)}, ${String(delayMs)}).then((x) => x.mode)`, 30000);
    },
    async clearToasts() {
      await ev('window.__gmuxP268.clearToasts() && true');
    },
    async dialog() {
      return ev(DIALOG);
    },
    async explicitSave(path) {
      await ev(`window.__gmuxP268.explicitSave(${J(path)}).then(() => true)`, 60000);
      k.doorAt(proj);
    },
    /** Make a tab clean and its idea of the disk true, through the shipped doors only. */
    async syncWithDisk(path) {
      let r = await k.tab(path);
      if (r.tab === null) throw new Unreadable(`${basename(path)} is not open`);
      if (r.tab.dirty) {
        await k.settle(proj, 1200);
        await k.explicitSave(path);
        await sleep(400);
        if ((await k.dialog()).open) {
          await ev('window.__gmuxP268.pressOverwrite() && true');
          await k.waitFor(`document.querySelector('.modal[role="alertdialog"]') === null`, 5000);
        }
        r = await k.waitTab(path, (t) => t.tab?.dirty === false, 5000);
        if (r.tab?.dirty !== false) throw new Unreadable(`${basename(path)} could not be made clean`);
      }
      if (r.tab.savedContents !== disk(path)) {
        // The live bus is the one road that re-reads a clean tab at BOTH
        // builds: a tracked file written from outside walks the repository.
        k.fresh(files.tracked, 'sync');
        r = await k.waitTab(path, (t) => t.tab?.savedContents === disk(path), 5000);
        if (r.tab?.savedContents !== disk(path)) throw new Unreadable(`${basename(path)} could not be brought back in step with its disk`);
        await sleep(1500);
      }
      await k.clearToasts();
    },
    async place() {
      return ev(PLACE, 10000);
    },
    async setPlace(n) {
      const r = await ev(SET_PLACE(n));
      if (r === null) return null;
      return (await k.place()).top;
    },
    async drive(spec) {
      await ev(`window.__gmuxShotDrive(${J(spec)}).then(() => true)`, 180000);
      k.doorAt(spec.projectPath);
    },
    async recover() {
      try {
        if ((await k.dialog()).open) await ev(PRESS_CANCEL);
      } catch {
        /* best effort */
      }
      try {
        await k.setPolicy('off', 1000);
      } catch {
        /* best effort */
      }
      try {
        await k.clearToasts();
      } catch {
        /* best effort */
      }
    }
  };
  return k;
}

const pick = (r) => (r?.tab === null || r?.tab === undefined ? null : { value: r.tab.value, savedContents: r.tab.savedContents, dirty: r.tab.dirty });
const seenAs = (bytes) => (r) => r.tab?.value === bytes && r.tab?.savedContents === bytes && r.tab?.dirty === false;

// ---------------------------------------------------------------------------
// The arms. Each sets its own preconditions, so P334_ARMS may pick any.
// ---------------------------------------------------------------------------

const ARMS = {
  async A0(k, w) {
    const A = w.files.a;
    await k.ensureSource(A);
    const f = await k.focusMonaco();
    // Any door the activation or the focus raised has walked and finished
    // before the write, so nothing but a bus could carry it.
    await sleep(1200);
    const before = await k.tab(A);
    const previous = before.tab?.value;
    const { bytes } = k.fresh(A, 'A0');
    await sleep(2500);
    const after = await k.tab(A);
    return { gesture: f.focused === true && before.editorFocused === true, how: f.how, previous, written: bytes, after: pick(after) };
  },

  async A0b(k, w) {
    const T = w.files.tracked;
    const before = await k.tab(T);
    if (typeof before.tab?.value !== 'string') throw new Unreadable('tracked.md has no Monaco model');
    const previous = before.tab.value;
    const { bytes } = k.fresh(T, 'A0b');
    const after = await k.waitTab(T, seenAs(bytes), 2500);
    // The bus's walk re-reads every open tab of the repository, a.md
    // included; it is let finish before any arm that counts looks.
    await sleep(2500);
    return { previous, written: bytes, after: pick(after) };
  },

  async A1(k, w) {
    const A = w.files.a;
    await k.ensureSource(A);
    const iterations = [];
    for (let i = 1; i <= LOOKS.A1; i += 1) {
      await k.settle(w.proj, 1200);
      await k.clickTab('x.ts');
      await sleep(1200);
      const previous = (await k.tab(A)).tab?.value;
      const { bytes } = k.fresh(A, `A1-${String(i)}`);
      await sleep(200);
      await k.clickTab('a.md');
      const after = await k.waitTab(A, seenAs(bytes), 1000);
      iterations.push({ gesture: after.activeId === A, previous, written: bytes, after: pick(after) });
    }
    return { iterations };
  },

  async A2(k, w) {
    const A = w.files.a;
    await k.ensureSource(A);
    const iterations = [];
    for (let i = 1; i <= LOOKS.A2; i += 1) {
      const blurred = await k.blur();
      await sleep(1200);
      await k.settle(w.proj, 1000);
      const previous = (await k.tab(A)).tab?.value;
      const { bytes } = k.fresh(A, `A2-${String(i)}`);
      await sleep(200);
      const f = await k.focusMonaco();
      const after = await k.waitTab(A, seenAs(bytes), 1000);
      const gesture = blurred?.editorFocused === false && f.was === false && f.focused === true && after.activeId === A;
      iterations.push({
        gesture,
        why: gesture ? null : `blurred ${String(blurred?.editorFocused === false)}, focus ${String(f.focused)} by ${f.how}`,
        how: f.how,
        previous,
        written: bytes,
        after: pick(after)
      });
    }
    return { iterations };
  },

  async A3(k, w) {
    const B = w.files.b;
    await k.ensureRedline(B);
    const iterations = [];
    for (let i = 1; i <= LOOKS.A3; i += 1) {
      const left = await k.tab(B);
      const stripped = await cdpEval(k.cdp, FOCUS_STRIP('b.md'));
      await sleep(1200);
      await k.settle(w.proj, 1000);
      const previous = left.tab?.savedContents;
      const { bytes, marker } = k.fresh(B, `A3-${String(i)}`);
      await sleep(200);
      const f = await cdpEval(k.cdp, FOCUS_SCROLLER);
      k.doorAt(w.proj);
      const after = await k.waitTab(B, (t) => t.tab?.savedContents === bytes && t.drawnHas === true, 1000, marker);
      const gesture = stripped === true && f.focused === true && after.activeId === B;
      iterations.push({
        gesture,
        why: gesture ? null : `strip focused ${String(stripped)}, scroller focused ${String(f.focused)} from ${String(f.from)}`,
        previous,
        written: bytes,
        after: after.tab === null ? null : { savedContents: after.tab.savedContents, drawnHasMarker: after.drawnHas === true }
      });
    }
    return { iterations };
  },

  async A4(k, w) {
    const A = w.files.a;
    const X = w.files.x;
    await k.ensureSource(A);
    // a.md the most recent before x.ts, so ⌃Tab from x.ts lands on it.
    await k.settle(w.proj, 1200);
    await k.clickTab('a.md');
    await k.settle(w.proj, 1200);
    await k.clickTab('x.ts');
    if (!(await k.tab(X)).editorFocused) await k.focusMonaco();
    const iterations = [];
    // THE FIX ROUND. The arm read UNREADABLE at both builds on its return trip:
    // the landing can leave focus outside the editor panel, and EditorPanel's
    // ⌃Tab guard (`panelRef.current?.contains(document.activeElement)`) then
    // refuses the return key. The return is setup and the LANDING is the
    // reading, so the return focuses the editor first, falls back to a strip
    // click when the key still does not take, and the looks already made are
    // kept in the report whatever stops the arm.
    try {
      for (let i = 1; i <= LOOKS.A4; i += 1) {
        const start = await k.tab(X);
        if (start.activeId !== X || start.editorFocused !== true) {
          throw new Unreadable(`look ${String(i)}: x.ts is not active with the editor focused before the ⌃Tab`);
        }
        await k.settle(w.proj, 1000);
        const previous = (await k.tab(A)).tab?.value;
        const { bytes } = k.fresh(A, `A4-${String(i)}`);
        await sleep(200);
        await k.ctrlTab();
        const after = await k.waitTab(A, seenAs(bytes), 1000);
        const look = { gesture: after.activeId === A, why: after.activeId === A ? null : `⌃Tab landed on ${String(after.activeId)}`, previous, written: bytes, after: pick(after) };
        iterations.push(look);
        // Back to x.ts, past the floor, with focus in the editor so the key is
        // the panel's to take.
        await k.settle(w.proj, 1200);
        const landed = await k.tab(A);
        look.focusedAfterLanding = landed.editorFocused === true;
        if (!look.focusedAfterLanding) {
          const f = await k.focusMonaco();
          if (f?.focused !== true) throw new Unreadable(`look ${String(i)}: the editor would not take focus on a.md for the return (${String(f?.how)})`);
        }
        await k.ctrlTab();
        look.back = 'ctrl-tab';
        if (!(await k.waitFor(`${ACTIVE_NAME} === 'x.ts'`, 1500, 25))) {
          look.back = 'strip click';
          k.note(`A4 look ${String(i)}: ⌃Tab did not go back to x.ts with the editor focused; went back by a strip click`);
          await k.clickTab('x.ts');
        }
        if (!(await k.tab(X)).editorFocused) await k.focusMonaco();
      }
    } catch (err) {
      if (!(err instanceof Unreadable)) throw err;
      await k.recover();
      return { iterations, unreadable: err.message };
    }
    const x = await k.tab(X);
    if (x.tab?.dirty) k.note('A4: x.ts went dirty under ⌃Tab (a Tab reached the buffer)');
    return { iterations, xDirty: x.tab?.dirty ?? null };
  },

  async A5(k, w) {
    const A = w.files.a;
    await k.ensureSource(A);
    await openSecondProject(k, w);
    const iterations = [];
    for (let i = 1; i <= LOOKS.A5; i += 1) {
      await k.clickProject(basename(w.proj2));
      await sleep(1200);
      await k.settle(w.proj, 1000);
      const previous = (await k.tab(A)).tab?.value;
      const { bytes } = k.fresh(A, `A5-${String(i)}`);
      await sleep(200);
      await k.clickProject(basename(w.proj));
      const after = await k.waitTab(A, seenAs(bytes), 1000);
      iterations.push({ gesture: after.activeId === A, why: after.activeId === A ? null : `the project came back on ${String(after.activeId)}`, previous, written: bytes, after: pick(after) });
    }
    return { iterations };
  },

  async A6(k, w) {
    const A = w.files.a;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(A);
    await k.ensureSource(A);
    await k.clearToasts();
    await k.setPolicy('afterDelay', 500);
    try {
      await k.settle(w.proj, 1200);
      await k.type(A, 'P');
      const until = Date.now() + 3000;
      let landedP = false;
      while (Date.now() < until) {
        if ((disk(A) ?? '').endsWith('P')) {
          landedP = true;
          break;
        }
        await sleep(50);
      }
      await sleep(400);
      const { bytes } = k.fresh(A, 'A6');
      await k.settle(w.proj, 1200);
      await k.clickTab('x.ts');
      await sleep(1200);
      await k.settle(w.proj, 1200);
      await k.clickTab('a.md');
      // The look's read lands before the typing, or the typing is the old
      // buffer's (L2); the parent never lands it, so this waits out its 1.5 s.
      await k.waitTab(A, (t) => t.tab?.savedContents === bytes, 1500);
      await k.type(A, 'Q');
      await sleep(2500);
      const after = await k.tab(A);
      return { landedP, written: bytes, disk: disk(A), stopped: after.tab?.stopped ?? null, toasts: after.toasts, dirty: after.tab?.dirty ?? null };
    } finally {
      await k.setPolicy('off', 1000);
    }
  },

  async A7(k, w) {
    const C = w.files.c;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(C);
    await k.ensureSource(C);
    await k.settle(w.proj, 1200);
    const previous = (await k.tab(C)).tab?.value;
    await k.type(C, 'D');
    const typed = (await k.tab(C)).tab?.value === `${String(previous)}D`;
    const { bytes } = k.fresh(C, 'A7');
    // Under every door: away (an activation of another tab), back (an
    // activation of this one), then a focus past the floor.
    await k.settle(w.proj, 1200);
    await k.clickTab('x.ts');
    await sleep(1200);
    await k.settle(w.proj, 1200);
    await k.clickTab('c.md');
    await sleep(1000);
    await k.blur();
    await k.settle(w.proj, 1200);
    const f = await k.focusMonaco();
    await sleep(1000);
    const after = await k.tab(C);
    await k.settle(w.proj, 1200);
    await k.explicitSave(C);
    await sleep(400);
    const dialog = await k.dialog();
    if (dialog.open) await cdpEval(k.cdp, PRESS_CANCEL);
    await k.waitFor(`document.querySelector('.modal[role="alertdialog"]') === null`, 4000);
    await sleep(300);
    const cancelled = await k.tab(C);
    const open = (await k.dialog()).open;
    return {
      typed,
      focused: f.focused === true,
      previous,
      written: bytes,
      after: pick(after),
      disk: disk(C),
      dialog: { open: dialog.open, title: dialog.title ?? null, buttons: dialog.buttons },
      afterCancel: { open, dirty: cancelled.tab?.dirty ?? null, disk: disk(C) }
    };
  },

  async A8(k, w) {
    const D = w.files.d;
    await k.syncWithDisk(D);
    await k.ensureSource(D);
    const previous = (await k.tab(D)).tab?.value;
    shRemove(D);
    const removed = !existsSync(D);
    await k.settle(w.proj, 1200);
    await k.clickTab('x.ts');
    await sleep(1200);
    await k.settle(w.proj, 1200);
    await k.clickTab('d.md');
    const after = await k.waitTab(D, (t) => t.deletedBanner === true, 1000);
    return { removed, gesture: after.activeId === D, previous, banner: after.deletedBanner === true, value: after.tab?.value ?? null };
  },

  async A9(k, w) {
    const A = w.files.a;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(A);
    await k.ensureSource(A);
    // ensureSource's strip click is a door at HEAD: the write waits until its
    // walk is over, and `previous` is read after that (the fix round).
    const before = await k.quiet(A);
    const previous = before.tab?.value;
    const { bytes } = k.fresh(A, 'A9');
    await sleep(1200);
    await k.settle(w.proj, 1200);
    // `type` activates the tab and edits it in ONE synchronous turn: the door's
    // walk is in flight while the tab goes dirty.
    await k.type(A, 'T');
    await sleep(1500);
    const after = await k.tab(A);
    return { inStepBefore: before.inStep, previous, written: bytes, after: pick(after), disk: disk(A) };
  },

  async A10(k, w) {
    const A = w.files.a;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(A);
    await k.ensureSource(A);
    const counter = await cdpEval(k.cdp, COUNTER_INSTALL);
    // The same opening as A9: no setup walk may still be in the air when the
    // writer writes, or HEAD's "seen" would be that walk's and not the burst's.
    const before = await k.quiet(A);
    const previous = before.tab?.value;
    const { bytes } = k.fresh(A, 'A10');
    await k.settle(w.proj, 1200);
    const clicks = 50;
    const t0 = Date.now();
    for (let i = 0; i < clicks; i += 1) {
      const name = i % 2 === 0 ? 'x.ts' : 'a.md';
      const box = await cdpEval(k.cdp, TAB_BOX(name));
      if (box?.found !== true || box.hit !== true) throw new Unreadable(`burst click ${String(i + 1)}: the strip tab ${name} could not be clicked`);
      await k.mouseClick(box.x, box.y);
      k.doorAt(w.proj);
      const next = t0 + (i + 1) * 20;
      if (Date.now() < next) await sleep(next - Date.now());
    }
    const durationMs = Date.now() - t0;
    await sleep(1500);
    let answers = false;
    try {
      answers = (await cdpEval(k.cdp, '1 + 1', 5000)) === 2;
    } catch {
      answers = false;
    }
    const after = await k.tab(A);
    const active = await cdpEval(k.cdp, ACTIVE_NAME);
    let walks = { readable: false, said: `the counting wrapper did not take (${String(counter?.why)}); the unit count R10 is the authority` };
    if (counter?.installed === true) {
      const reads = await cdpEval(k.cdp, COUNTER_READ);
      const ofA = reads.filter((p) => p === A).length;
      walks = { readable: true, readsOfA: ofA, reads: reads.length, said: `${String(ofA)} read(s) of a.md over ${String(durationMs)} ms` };
    }
    return { inStepBefore: before.inStep, previous, written: bytes, clicks, durationMs, answers, active, after: pick(after), walks };
  },

  async A11(k, w) {
    const A = w.files.a;
    await k.setPolicy('off', 1000);
    await k.syncWithDisk(A);
    await k.ensureSource(A);
    const previous = (await k.tab(A)).tab?.value;
    // m1 is on disk BEFORE the first door, so that door's own walk (which reads
    // every open tab of the repository, L3) is observed landing it at HEAD and
    // is finished before m2 is written; "write at once" would race that walk.
    const m1 = k.fresh(A, 'A11-m1').bytes;
    await k.settle(w.proj, 1200);
    const t0 = Date.now();
    await k.clickTab('x.ts');
    await k.waitTab(A, (t) => t.tab?.value === m1, Math.max(0, t0 + 700 - Date.now()));
    const m2 = k.fresh(A, 'A11-m2').bytes;
    const wroteAtMs = Date.now() - t0;
    if (Date.now() < t0 + 300) await sleep(t0 + 300 - Date.now());
    const clickAtMs = Date.now() - t0;
    await k.clickTab('a.md');
    await sleep(1000);
    const afterClick = await k.tab(A);
    await k.blur();
    if (Date.now() < t0 + 1200) await sleep(t0 + 1200 - Date.now());
    const focusAtMs = Date.now() - t0;
    const f = await k.focusMonaco();
    const afterFocus = await k.waitTab(A, seenAs(m2), 1000);
    return { previous, m1, m2, wroteAtMs, clickAtMs, focusAtMs, focused: f.focused === true, how: f.how, afterClick: pick(afterClick), afterFocus: pick(afterFocus) };
  },

  async B1(k, w) {
    await k.ensureRedline(w.files.longA);
    const set = await k.setPlace(PLACE_A);
    await k.settle(w.proj, 1200);
    await k.clickTab('x.ts');
    await k.settle(w.proj, 1200);
    await k.clickTab('long-a.md');
    await k.waitRedline(w.files.longA);
    const back = await k.place();
    return { set, read: back.top, max: back.max, raf: back.raf };
  },

  async B2(k, w) {
    await k.ensureRedline(w.files.longA);
    const setA = await k.setPlace(PLACE_A);
    await k.settle(w.proj, 1200);
    await k.clickTab('long-b.md');
    await k.waitRedline(w.files.longB);
    const arrival = await k.place();
    const setB = await k.setPlace(PLACE_B);
    await k.settle(w.proj, 1200);
    await k.clickTab('long-a.md');
    await k.waitRedline(w.files.longA);
    const a2 = await k.place();
    await k.settle(w.proj, 1200);
    await k.clickTab('long-b.md');
    await k.waitRedline(w.files.longB);
    const b2 = await k.place();
    return { setA, arrival: arrival.top, maxB: arrival.max, setB, a2: a2.top, b2: b2.top, raf: [arrival.raf, a2.raf, b2.raf] };
  },

  async B3(k, w) {
    const L = w.files.longA;
    await k.ensureRedline(L);
    const set = await k.setPlace(PLACE_A);
    await k.settle(w.proj, 1200);
    await k.chip('Source', L);
    await sleep(600);
    await k.settle(w.proj, 1200);
    await k.chip('Redline', L);
    const back = await k.place();
    return { set, read: back.top, raf: back.raf };
  },

  async B4(k, w) {
    const L = w.files.longB;
    await k.ensureRedline(L);
    const set = await k.setPlace(PLACE_B);
    await k.settle(w.proj, 1200);
    await k.closeTab('long-b.md');
    await k.settle(w.proj, 1200);
    await k.drive({ projectPath: w.proj, openRel: 'docs/long-b.md', mode: 'diff' });
    await k.settle(w.proj, 1200);
    await k.chip('Redline', L);
    const back = await k.place();
    return { set, read: back.top, raf: back.raf };
  },

  async B5(k, w) {
    const L = w.files.longA;
    await k.ensureRedline(L);
    const set = await k.setPlace(PLACE_A);
    const marker = `P334 APPENDED ${randomBytes(4).toString('hex')}`;
    shAppend(L, `\n${marker}\n`);
    const r = await k.waitTab(L, (t) => t.drawnHas === true, 5000, marker);
    const back = await k.place();
    return { set, recomposed: r.drawnHas === true, read: back.top, raf: back.raf };
  }
};

/**
 * The second project, for A5 and every arm after it: added, then left by its
 * own tab. Opened on first use rather than in setup, so A4's Ctrl+Tab runs with
 * ONE project open (with two, Ctrl+Tab cycles projects). Idempotent.
 */
async function openSecondProject(k, w) {
  const { proj, proj2 } = w;
  const names = await cdpEval(k.cdp, `Array.from(document.querySelectorAll('.ptab .ptab-name')).map((n) => (n.textContent ?? '').trim())`);
  if (Array.isArray(names) && names.includes(basename(proj2))) return;
  await k.drive({ projectPath: proj2 });
  if (!(await k.waitFor(`${SELECTED_PROJECT} === ${J(basename(proj2))}`, 5000))) throw new Unreadable('the second project never became the selected one');
  await sleep(600);
  await k.settle(proj, 1200);
  await k.clickProject(basename(proj));
}

/** Open every file the arms use, each in the view its arm needs (the second project opens with A5). */
async function setup(k, w) {
  const { proj, proj2, files } = w;
  await k.drive({ projectPath: proj, editorWidth: 1100 });
  await sleep(800);
  const open = async (rel, mode) => {
    await k.drive({ projectPath: proj, openRel: rel, mode });
    await sleep(300);
  };
  await open('src/x.ts', 'file');
  for (const [rel, path] of [['docs/tracked.md', files.tracked], ['notes/a.md', files.a], ['notes/c.md', files.c], ['notes/d.md', files.d]]) {
    await open(rel, 'file');
    await k.chip('Source', path);
  }
  await open('notes/b.md', 'file');
  await k.chip('Redline', files.b);
  await open('docs/long-a.md', 'diff');
  await k.chip('Redline', files.longA);
  await open('docs/long-b.md', 'diff');
  await k.chip('Redline', files.longB);
  // THE SECOND PROJECT IS NOT OPENED HERE (the landing fix, 2026-10-01). With
  // two projects open, Ctrl+Tab is `project.next` before it is
  // `editor.recentTabs` (the app's capture-phase handler cycles projects
  // first, at the parent too), so A4's landing never reached cycleMru. A5
  // opens proj2 itself, after A4 has run with one project open.
  const names = await cdpEval(k.cdp, `Array.from(document.querySelectorAll('.ed-tab .ed-tab-name')).map((n) => (n.textContent ?? '').trim())`);
  const wanted = ['x.ts', 'tracked.md', 'a.md', 'c.md', 'd.md', 'b.md', 'long-a.md', 'long-b.md'];
  const missing = wanted.filter((n) => !names.includes(n));
  if (missing.length > 0) throw new Unreadable(`the strip lacks ${missing.join(', ')} after setup (it holds ${J(names)})`);
  // Let every walk the setup raised finish before the first arm.
  await sleep(2000);
  return names;
}

// ---------------------------------------------------------------------------
// The run: the parent first, then HEAD, one Electron at a time.
// ---------------------------------------------------------------------------

const headOf = (dir) => {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }
  });
  return r.status === 0 ? r.stdout.trim() : null;
};
const report = {
  phase: 334,
  started: new Date().toISOString(),
  root: ROOT,
  parent: PARENT_DIR,
  parentSha: headOf(PARENT_DIR),
  headSha: headOf(ROOT),
  socket,
  arms: ASKED,
  builds: {},
  rows: [],
  exit: null
};
const readings = {};
let fatal = null;
const runRows = [];

say(`parent ${PARENT_DIR} at ${String(report.parentSha)}, HEAD ${ROOT} at ${String(report.headSha)}; arms ${ASKED.join(',')}`);
mkdirSync(SCRATCH, { recursive: true });

for (const build of ['parent', 'head']) {
  if (fatal !== null) break;
  const checkout = build === 'parent' ? PARENT_DIR : ROOT;
  const b = { checkout, sha: build === 'parent' ? report.parentSha : report.headSha, notes: [] };
  report.builds[build] = b;
  readings[build] = {};
  let world = null;
  try {
    world = buildWorld(join(SCRATCH, build));
  } catch (err) {
    fatal = `(${build}) the scratch project could not be built: ${String(err?.message ?? err)}`;
    break;
  }
  b.world = { root: world.root, proj: world.proj, proj2: world.proj2, profile: world.profile, home: world.home };
  b.checkIgnore = world.ignored;
  if (world.ignored !== 0 || world.trackedNotes !== '') {
    fatal = `(${build}) git does not ignore notes/a.md in the scratch project (check-ignore exit ${String(world.ignored)}, tracked ${J(world.trackedNotes)})`;
    break;
  }
  const pre = hidden.hiddenAgentsPrecheck({ checkout, prefix: PREFIX, home: world.home, userPath: process.env['PATH'] ?? '' });
  b.hiddenPrecheck = pre;
  if (!pre.ok) {
    fatal = `(${build}) ${checkout}'s own overlay parser does not hide the five agents: ${pre.said}`;
    break;
  }
  hidden.writeHiddenAgents(world.profile, PREFIX);
  say(`(${build}) launching from ${checkout}`);
  try {
    await withElectron(
      {
        label: `p334-${build}`,
        userDataDir: world.profile,
        tmuxSocket: socket,
        cwd: checkout,
        args: [
          '--remote-debugging-port=0',
          '--use-mock-keychain',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-timer-throttling'
        ],
        env: withoutDevRenderer({
          ...STRIPPED,
          HOME: world.home,
          GMUX_TMUX_SOCKET: socket,
          GMUX_PROBES: '1',
          GMUX_SPECSTORY_NO_CLOUD: '1'
        }),
        graceMs: 8000,
        ceilingMs: 30 * 60 * 1000
      },
      async (handle) => {
        const { cdp, url } = await cdpForAppWindow(world.profile, 90000);
        say(`(${build}) app window at ${url}, pid ${String(handle.appPid())}`);
        try {
          await cdp.call('Runtime.enable');
          // Monaco's focus tracker needs real focus EVENTS, which Chromium
          // suppresses for a document it does not believe is focused (probe:p268
          // arm H measured it). A2, A4, A7 and A11 depend on it.
          try {
            await cdp.call('Emulation.setFocusEmulationEnabled', { enabled: true });
          } catch {
            b.notes.push('focus emulation is unavailable');
          }
          await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
          const loadBy = Date.now() + 30000;
          while ((await cdpEval(cdp, `performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? 0`)) <= 0) {
            if (Date.now() > loadBy) throw new Unreadable('the page never finished loading');
            await sleep(50);
          }
          // THE GUARD, READ BACK before any arm: none of the five may resolve.
          let scan = null;
          try {
            scan = JSON.parse(await cdpEval(cdp, hidden.AGENTS_LIST_EXPR, 90000));
          } catch {
            scan = null;
          }
          const verdict = hidden.hiddenAgentsScanVerdict(scan);
          b.agentsScan = verdict;
          if (!verdict.ok) throw new Fatal(`(${build}) the app's own detection was not kept off the hidden agents: ${verdict.said}`);
          const k = makeKit(cdp, world, build);
          k.cdp = cdp;
          b.strip = await setup(k, world);
          for (const arm of ALL_ARMS) {
            if (!want(arm)) continue;
            const t = Date.now();
            try {
              readings[build][arm] = await ARMS[arm](k, world);
            } catch (err) {
              if (err instanceof Fatal) throw err;
              readings[build][arm] = { unreadable: err instanceof Unreadable ? err.message : `it threw: ${String(err?.stack ?? err).slice(0, 600)}` };
              await k.recover();
            }
            const g = GRADERS[arm](build, readings[build][arm]);
            say(`(${build}) ${arm} in ${String(Date.now() - t)} ms: ${g.ok === true ? 'ok' : g.ok === false ? 'DISAGREES' : 'UNREADABLE'}: ${g.said}`);
          }
          b.notes.push(...k.notes);
        } finally {
          try {
            await cdpEval(cdp, 'window.__gmuxShotCleanup ? window.__gmuxShotCleanup().then(() => true) : true', 30000);
          } catch {
            /* the helper ends the tree anyway */
          }
          cdp.close();
        }
      }
    );
  } catch (err) {
    if (err instanceof Fatal) fatal = err.message;
    else runRows.push({ arm: 'the run', build, ok: null, said: String(err?.message ?? err).slice(0, 800) });
  }
}

if (fatal !== null) {
  runRows.push({ arm: 'the preconditions', build: '-', ok: null, said: fatal });
}
report.readings = readings;
report.rows = [...runRows, ...(fatal === null ? rowsFor(ASKED, readings) : [])];
report.exit = exitCodeOf(report.rows);
report.ended = new Date().toISOString();

for (const r of report.rows) (r.ok === true ? process.stdout : process.stderr).write(`${TAG} ${formatRow(r)}\n`);
for (const build of ['parent', 'head']) {
  const walks = readings[build]?.A10?.walks;
  if (walks !== undefined) say(`(${build}) A10 walk count: ${walks.said}`);
}

try {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${J(report, null, 1)}\n`);
  say(`wrote ${REPORT_PATH}`);
} catch (err) {
  say(`could not write the report: ${String(err?.message ?? err)}`);
}
if (!KEEP) rmSync(SCRATCH, { recursive: true, force: true });
else say(`KEPT ${SCRATCH}: both builds' projects, profiles and homes`);

const fails = report.rows.filter((r) => r.ok === false).length;
const unread = report.rows.filter((r) => r.ok !== true && r.ok !== false).length;
if (report.exit === 1) say(`probe:p334 FAILED: ${String(fails)} row(s) disagree${unread > 0 ? `, and ${String(unread)} could not be read` : ''}.`);
else if (report.exit === 2) say(`probe:p334 could not READ ${String(unread)} row(s); that is not a pass.`);
else say(`probe:p334 PASS: ${String(report.rows.length)} rows graded at both builds.`);
process.exit(report.exit);
