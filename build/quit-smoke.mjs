#!/usr/bin/env node
/**
 * build/quit-smoke.mjs — the launcher and the verdict of `npm run smoke:quit`
 * and `npm run smoke:quitdoors` (Phase 357.1's landing round, F2).
 *
 * ## Why the verdict moved out of the exit code
 *
 * Phase 36 wrote `smoke:quit` to catch the quit that was secretly a crash: a
 * watcher close still pending when Node's environment teardown ran made every
 * real quit a SIGABRT. Its verdict was the process's exit code, 0 the pass and
 * 134 the bug, and Phase 144's `smoke:quitdoors` ended the same way. Since
 * Phase 357.1 the session list's connection is held at every quit and the
 * process ends at `will-quit` with a SIGKILL to itself (src/main/index.ts),
 * because Node's teardown would close that connection through a page cache that
 * can be damaged in a way no read sees (research 143 §2.3). So both smokes now
 * end by a signal, and an exit code can no longer tell a healthy quit from a
 * broken one. This file launches each one itself, through
 * build/electron-run.mjs (the Electron binary, so the signal is the app's own
 * and no shim stands between), reads how it ended and says PASS or FAIL with
 * the reason.
 *
 * ## The legs
 *
 *   quit        `smoke:quit`, two launches one after the other:
 *     held        GMUX_SMOKE=quit, the core booted. PASS is the will-quit hard
 *                 exit: killed by SIGKILL, the store's "left open at quit" line
 *                 said, the run sentinel armed and then cleared, no Crashpad
 *                 dump and no macOS crash report since the launch (by name and
 *                 time; none is opened). An abort (SIGABRT, 134), a crash
 *                 (SIGSEGV, 139), an exit 0 (its reason worded by whether the
 *                 store said it held the list: held and then closed by Node's
 *                 teardown, or never held at all), or a SIGKILL that Phase
 *                 36's wedged-watcher escape sent instead is a FAIL with its
 *                 reason.
 *     teardown    GMUX_SMOKE=quit-teardown, the same race with the core never
 *                 booted, so nothing is held and the quit runs Node's teardown:
 *                 PHASE 36'S GUARD WHERE IT STILL APPLIES. Exit 0 is the pass
 *                 and 134 its failure, as before; a SIGKILL there is a FAIL
 *                 too, because a quit holding nothing must reach teardown.
 *                 Since Phase 362 (build/p362/SPEC.md D4) the pass also needs
 *                 the run sentinel LEFT MARKED: the log's own will-quit
 *                 listener rewrites it with `quitAt` and the dump inventory of
 *                 that moment instead of deleting it, so a crash in the
 *                 teardown that follows is still noticed at the next launch,
 *                 and a clean one reads as a quit there. A sentinel left
 *                 unmarked (the next launch would say Tortie quit
 *                 unexpectedly), cleared before the teardown (a crash there
 *                 would go unnoticed, the parent's quit) or never armed is a
 *                 FAIL.
 *   quit-doors  `smoke:quitdoors`, one launch of GMUX_SMOKE=quit-doors: every
 *               door verdict is the smoke's own (its `9/9 PASS` line, or its
 *               `FAIL` line and exit 1), and its end is read as `held`'s.
 *
 * Every launch is ONE Electron through `withElectron`, which ends its whole
 * tree in a `finally`, on a fresh profile and a scratch HOME (ZDOTDIR the same,
 * HISTFILE=/dev/null) inside the run folder build/harness-socket.mjs hands it,
 * on that script's scratch socket. GMUX_LOG_FILE=1, so the run sentinel is
 * armed and can be read: cleared after the held quit (the hard exit's
 * `finally` clears it after the log's mark), marked after the teardown quit.
 * The verdicts are pure functions, and every invocation first grades its own
 * fixtures with them, and the sentinel reader over its own texts
 * (`--self-test` does only that), so a verdict that stopped telling the
 * shapes apart cannot pass.
 *
 * Usage (always through the npm scripts, which build first and wrap this in
 * build/harness-socket.mjs):
 *   npm run smoke:quit                  the held leg, then the teardown leg
 *   npm run smoke:quitdoors             the doors smoke
 *   node build/quit-smoke.mjs --self-test   the verdicts over their fixtures; starts nothing
 *   QUIT_SMOKE_CHECKOUT=<a built checkout>  launch that checkout's app instead
 *                                       of this one's (a parent, a scratch copy)
 *
 * Exit 0 when every leg passed, 1 when one failed, 2 when it could not run.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot, withElectron, withoutDevRenderer } from './electron-run.mjs';

const TAG = '[quit-smoke]';

// ---------------------------------------------------------------------------
// What the app says, and the verdicts (pure)
// ---------------------------------------------------------------------------

/** The store's line when the quit's close holds its connection (src/main/manifest/store.ts). */
export const HELD_LINE = 'the session list connection is left open at quit, so no close walks its cache';
/** Phase 36's last resort, written with writeSync before its own SIGKILL (src/main/capabilities.ts). */
export const WEDGED_LINE = /still pending after 15 s more; ending the process hard because environment teardown would abort/;
/** The in-app smoke's own failure (src/main/harness/support.ts `smokeFail`). */
export const SMOKE_FAIL_LINE = /\[gmux-smoke\] FAIL: ([^\n]*)/;
/** Each leg's last step, said by the in-app smoke just before the real quit. */
export const LAST_STEP = Object.freeze({
  held: '[gmux-smoke] 4/4 calling the REAL app.quit()',
  teardown: '[gmux-smoke] 4/4 calling the REAL app.quit()',
  doors: '[gmux-smoke] 9/9 PASS (quit-doors)'
});

/**
 * True when the run sentinel's text carries the will-quit mark (Phase 362
 * D4): a JSON object whose `quitAt` is a string, the rule src/main/log/
 * sentinel.ts reads it by. No file (`null`), a damaged file or a mark of any
 * other type is false.
 */
export function sentinelMarkedText(text) {
  if (typeof text !== 'string') return false;
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' && typeof parsed.quitAt === 'string';
  } catch {
    return false;
  }
}

const isAbort = (f) => f.signal === 'SIGABRT' || f.code === 134;
const isCrash = (f) => f.signal === 'SIGSEGV' || f.signal === 'SIGBUS' || f.code === 139 || f.code === 138;
const said = (f, needle) => typeof f.text === 'string' && f.text.includes(needle);

/** What every leg holds in common: it ran, its own steps held, nothing crashed on the way out. */
function commonReasons(f, lastStep) {
  const r = [];
  if (f.started !== true) {
    r.push(`the app never started: ${String(f.why ?? 'no reason given')}`);
    return r;
  }
  if (typeof f.why === 'string' && f.why !== '') r.push(`the launch failed: ${f.why}`);
  const own = SMOKE_FAIL_LINE.exec(typeof f.text === 'string' ? f.text : '');
  if (own !== null) r.push(`the smoke itself failed: ${own[1]}`);
  else if (!said(f, lastStep)) r.push(`the smoke never reached its last step ("${lastStep}")`);
  if (f.ceiling === true) r.push('the app was still running at the ceiling, so the quit never ended');
  if (Array.isArray(f.dumpsNew) && f.dumpsNew.length > 0) r.push(`Crashpad wrote ${String(f.dumpsNew.length)} dump(s) in this run's profile (${f.dumpsNew.join(', ')})`);
  if (f.reports === null) r.push('the macOS crash report folder could not be read, so a report cannot be ruled out');
  else if (Array.isArray(f.reports) && f.reports.length > 0) r.push(`macOS wrote ${String(f.reports.length)} crash report(s) since the launch, read by name and time only and none opened (${f.reports.join(', ')})`);
  return r;
}

/**
 * The held quit (`smoke:quit`'s first leg, and `smoke:quitdoors`' end): the
 * will-quit hard exit, and nothing else.
 */
export function heldVerdict(f, lastStep = LAST_STEP.held) {
  const reasons = commonReasons(f, lastStep);
  if (f.started === true) {
    if (f.manifestMade === false) reasons.push('no session list was made in this launch, so the quit held nothing and this leg says nothing about the hold');
    if (isAbort(f)) reasons.push("the quit aborted (SIGABRT, 134): a close was still pending when Node's environment teardown ran, Phase 36's bug");
    else if (isCrash(f)) reasons.push(`the quit crashed (${String(f.signal ?? `exit ${String(f.code)}`)}, 139)`);
    else if (f.signal === 'SIGKILL' && WEDGED_LINE.test(String(f.text ?? ''))) reasons.push("the SIGKILL was Phase 36's wedged-watcher escape, not the will-quit hard exit: the watcher closes outlived both drains");
    else if (f.signal === 'SIGKILL') {
      if (!said(f, HELD_LINE)) reasons.push(`the store never said it held the session list at quit ("${HELD_LINE}")`);
      if (f.sentinelSeen !== true) reasons.push('the run sentinel was never seen armed, so its clear cannot be read');
      // Phase 362: the log's will-quit listener marks the sentinel, then the
      // hard exit's `finally` clears it before the signal. Marked and left
      // means that clear never ran; the next launch would read it as a quit
      // (no dump follows a SIGKILL), but the hard exit clears it by design.
      else if (f.sentinelAfter !== false && f.sentinelMarked === true) reasons.push("the run sentinel was left behind, marked at will-quit: the hard exit's finally never cleared it before its SIGKILL (Phase 362 D4 keeps that clear)");
      else if (f.sentinelAfter !== false) reasons.push('the run sentinel was left behind, so the next launch would say Tortie quit unexpectedly');
    } else if (f.code === 0 && f.signal === null) {
      // Round A (the drop round's reverify, a nit): the reason names what the
      // run showed. With the held line said, the store held the connection and
      // the will-quit hard exit never came, so Node's teardown closed it; with
      // no held line, the quit closed the connection itself (today's quit, the
      // parent's), and no hold was ever taken.
      if (said(f, HELD_LINE)) reasons.push("the app exited 0 with the session list held open: the will-quit hard exit never came, so Node's environment teardown closed that connection (Phase 357.1 D2)");
      else reasons.push("the app exited 0 and the store never said it held the session list: the quit closed that connection itself instead of holding it, then ran Node's environment teardown (Phase 357.1 D1, D2)");
    } else reasons.push(`the app ended with exit code ${String(f.code)} and signal ${String(f.signal)}, not by the will-quit SIGKILL`);
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * The teardown quit (`smoke:quit`'s second leg): Phase 36's verdict, where it
 * still applies. Nothing is held, so the quit must run Node's teardown and
 * exit 0; 134 is the abort it was written for. Since Phase 362 the run
 * sentinel must be left MARKED by the log's will-quit listener (D4), the one
 * quit a smoke can read that mark on.
 */
export function teardownVerdict(f) {
  const reasons = commonReasons(f, LAST_STEP.teardown);
  if (f.started === true) {
    if (f.manifestMade === true) reasons.push('a session list was made in a launch that must open none, so this quit did not run with nothing held');
    if (said(f, HELD_LINE)) reasons.push('the store held a session list connection in a launch that opened none');
    if (isAbort(f)) reasons.push("the quit aborted in Node's environment teardown (SIGABRT, 134): a close was still pending at FreeEnvironment, Phase 36's bug");
    else if (isCrash(f)) reasons.push(`the quit crashed in Node's environment teardown (${String(f.signal ?? `exit ${String(f.code)}`)}, 139)`);
    else if (f.signal === 'SIGKILL' && WEDGED_LINE.test(String(f.text ?? ''))) reasons.push("Phase 36's wedged-watcher escape ended the quit (SIGKILL): the watcher closes outlived both drains");
    else if (f.signal === 'SIGKILL') reasons.push("the quit ended by SIGKILL with nothing held; a quit that holds no session list must run Node's teardown and exit 0 (Phase 357.1)");
    else if (f.code !== 0 || f.signal !== null) reasons.push(`the app ended with exit code ${String(f.code)} and signal ${String(f.signal)}, not 0`);
    else if (f.sentinelAfter !== true && f.sentinelSeen !== true) reasons.push('the run sentinel was never seen armed, so its mark cannot be read');
    else if (f.sentinelAfter !== true) reasons.push("the run sentinel was cleared before Node's teardown, so a crash in that teardown would go unnoticed at the next launch; the log's will-quit listener marks it instead (Phase 362 D4)");
    else if (f.sentinelMarked !== true) reasons.push('the run sentinel was left unmarked, so the next launch would say Tortie quit unexpectedly');
  }
  return { pass: reasons.length === 0, reasons };
}

/** `smoke:quitdoors`: the smoke's own door verdicts, then its end read as the held quit's. */
export function doorsVerdict(f) {
  return heldVerdict(f, LAST_STEP.doors);
}

// ---------------------------------------------------------------------------
// The verdicts' own fixtures, graded on every run
// ---------------------------------------------------------------------------

const RAN = Object.freeze({ started: true, ceiling: false, dumpsNew: [], reports: [], sentinelSeen: true, sentinelAfter: false, sentinelMarked: false });
/** The teardown leg's run: the sentinel armed, then left marked by the log's will-quit listener (Phase 362 D4). */
const TORN = Object.freeze({ ...RAN, sentinelAfter: true, sentinelMarked: true });
const heldText = `${LAST_STEP.held}; …\n[gmux-manifest] ${HELD_LINE}\n`;
const doorsText = `${LAST_STEP.doors}; releasing the hold so the real quit ends\n[gmux-manifest] ${HELD_LINE}\n`;
const teardownText = `${LAST_STEP.teardown}; …\n`;
const wedgedText = '[gmux] quit: 1 watcher close(s) still pending after 15 s more; ending the process hard because environment teardown would abort\n';

/** [name, verdict, facts, pass, a reason's words when it fails] */
export const FIXTURES = Object.freeze([
  ['held: the will-quit SIGKILL', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText }, true, null],
  ['held: an abort', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGABRT', text: heldText }, false, 'SIGABRT, 134'],
  ['held: exit 134', heldVerdict, { ...RAN, manifestMade: true, code: 134, signal: null, text: heldText }, false, 'SIGABRT, 134'],
  ['held: a segfault', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGSEGV', text: heldText }, false, 'the quit crashed'],
  ['held: exit 0 with the session list held open', heldVerdict, { ...RAN, manifestMade: true, code: 0, signal: null, text: heldText }, false, 'exited 0 with the session list held open'],
  ['held: exit 0 with no hold said (the parent’s quit)', heldVerdict, { ...RAN, manifestMade: true, code: 0, signal: null, text: `${LAST_STEP.held}; …\n` }, false, 'never said it held the session list: the quit closed that connection itself'],
  ['held: Phase 36’s SIGKILL instead', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText + wedgedText }, false, "wedged-watcher escape"],
  ['held: no held line', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: `${LAST_STEP.held}\n` }, false, 'never said it held'],
  ['held: the sentinel left behind', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, sentinelAfter: true }, false, 'sentinel was left behind, so the next launch'],
  ['held: the sentinel marked but left', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, sentinelAfter: true, sentinelMarked: true }, false, 'marked at will-quit'],
  ['held: the sentinel never armed', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, sentinelSeen: false }, false, 'never seen armed'],
  ['held: a Crashpad dump', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, dumpsNew: ['x.dmp'] }, false, 'Crashpad wrote'],
  ['held: a macOS report', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, reports: ['Tortie-2026-11-06-180000.ips'] }, false, 'macOS wrote'],
  ['held: the report folder unread', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, reports: null }, false, 'could not be read'],
  ['held: the smoke failed itself', heldVerdict, { ...RAN, manifestMade: true, code: 1, signal: null, text: '[gmux-smoke] FAIL: agents.json watcher failed to start\n' }, false, 'the smoke itself failed'],
  ['held: never reached its last step', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: `[gmux-manifest] ${HELD_LINE}\n` }, false, 'never reached its last step'],
  ['held: still running at the ceiling', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, ceiling: true }, false, 'still running at the ceiling'],
  ['held: no session list made', heldVerdict, { ...RAN, manifestMade: false, code: null, signal: 'SIGKILL', text: heldText }, false, 'no session list was made'],
  ['held: never started', heldVerdict, { started: false, why: 'the binary is missing' }, false, 'never started'],
  ['held: the launch failed after it started (the census)', heldVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: heldText, why: 'a session appeared on -L gmux' }, false, 'the launch failed'],
  ['teardown: exit 0 with the sentinel left marked', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: teardownText }, true, null],
  ['teardown: the late drain settled, exit 0', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: `${teardownText}[gmux] quit: the late watcher close(s) settled after 812 ms; quitting cleanly\n` }, true, null],
  ['teardown: an abort', teardownVerdict, { ...TORN, manifestMade: false, code: null, signal: 'SIGABRT', text: teardownText }, false, "aborted in Node's environment teardown"],
  ['teardown: exit 134', teardownVerdict, { ...TORN, manifestMade: false, code: 134, signal: null, text: teardownText }, false, "aborted in Node's environment teardown"],
  ['teardown: a segfault', teardownVerdict, { ...TORN, manifestMade: false, code: null, signal: 'SIGSEGV', text: teardownText }, false, 'crashed in Node'],
  ['teardown: Phase 36’s SIGKILL', teardownVerdict, { ...TORN, manifestMade: false, code: null, signal: 'SIGKILL', text: teardownText + wedgedText }, false, 'wedged-watcher escape'],
  ['teardown: a SIGKILL with nothing held', teardownVerdict, { ...TORN, manifestMade: false, code: null, signal: 'SIGKILL', text: teardownText }, false, 'SIGKILL with nothing held'],
  ['teardown: a session list made', teardownVerdict, { ...TORN, manifestMade: true, code: 0, signal: null, text: teardownText }, false, 'must open none'],
  ['teardown: a held line', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: `${teardownText}${HELD_LINE}\n` }, false, 'held a session list connection'],
  ['teardown: exit 1', teardownVerdict, { ...TORN, manifestMade: false, code: 1, signal: null, text: teardownText }, false, 'not 0'],
  ['teardown: the sentinel left unmarked', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: teardownText, sentinelMarked: false }, false, 'left unmarked, so the next launch would say Tortie quit unexpectedly'],
  ['teardown: the sentinel cleared before the teardown (the parent’s quit)', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: teardownText, sentinelAfter: false, sentinelMarked: false }, false, "cleared before Node's teardown"],
  ['teardown: the sentinel never armed', teardownVerdict, { ...TORN, manifestMade: false, code: 0, signal: null, text: teardownText, sentinelSeen: false, sentinelAfter: false, sentinelMarked: false }, false, 'never seen armed, so its mark cannot be read'],
  ['doors: 9/9 and the will-quit SIGKILL', doorsVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGKILL', text: doorsText }, true, null],
  ['doors: a door failed', doorsVerdict, { ...RAN, manifestMade: true, code: 1, signal: null, text: '[gmux-smoke] FAIL: fs:writeFile was NOT refused after quit started: the handler ran\n' }, false, 'the smoke itself failed'],
  ['doors: 9/9 but exit 0', doorsVerdict, { ...RAN, manifestMade: true, code: 0, signal: null, text: doorsText }, false, 'exited 0 with the session list held open'],
  ['doors: 9/9, exit 0 and no hold said', doorsVerdict, { ...RAN, manifestMade: true, code: 0, signal: null, text: `${LAST_STEP.doors}; releasing the hold so the real quit ends\n` }, false, 'never said it held the session list: the quit closed that connection itself'],
  ['doors: 9/9 but an abort', doorsVerdict, { ...RAN, manifestMade: true, code: null, signal: 'SIGABRT', text: doorsText }, false, 'SIGABRT, 134']
]);

/**
 * The sentinel reader's own texts (Phase 362): [name, the file's text or null
 * for no file, whether it reads as marked]. `sentinelMarked` decides the
 * teardown leg, so the reader is graded beside the verdicts it feeds.
 */
export const SENTINEL_TEXTS = Object.freeze([
  ['marked at will-quit', '{"pid":4242,"version":"0.120.0","bootTs":"2026-11-08T20:00:00.000Z","dumpNames":["older.dmp"],"quitAt":"2026-11-08T21:00:00.000Z"}\n', true],
  ['as the boot armed it', '{"pid":4242,"version":"0.120.0","bootTs":"2026-11-08T20:00:00.000Z","dumpNames":[]}\n', false],
  ['a mark that is not a string', '{"pid":4242,"version":"0.120.0","bootTs":"2026-11-08T20:00:00.000Z","dumpNames":[],"quitAt":1793987027}\n', false],
  ['a damaged file', '{"pid":4242,"quitAt":"2026-11-08T2', false],
  ['no file', null, false]
]);

/** Every fixture against its verdict, and every sentinel text against the reader; true when each answers as it says. */
export function selfTest(write = (line) => process.stdout.write(`${line}\n`)) {
  let bad = 0;
  for (const [name, verdict, facts, pass, words] of FIXTURES) {
    const v = verdict(facts);
    const ok = pass ? v.pass && v.reasons.length === 0 : !v.pass && v.reasons.some((x) => x.includes(words));
    if (!ok) bad += 1;
    write(`${TAG} ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` (answered ${v.pass ? 'PASS' : `FAIL: ${JSON.stringify(v.reasons)}`})`}`);
  }
  let badTexts = 0;
  for (const [name, text, marked] of SENTINEL_TEXTS) {
    const read = sentinelMarkedText(text);
    const ok = read === marked;
    if (!ok) badTexts += 1;
    write(`${TAG} ${ok ? 'ok  ' : 'FAIL'} the sentinel reader: ${name} reads ${marked ? 'marked' : 'unmarked'}${ok ? '' : ` (read ${read ? 'marked' : 'unmarked'})`}`);
  }
  const pass = bad === 0 && badTexts === 0;
  write(
    `${TAG} self-test ${pass ? 'PASS' : 'FAIL'}: ${String(FIXTURES.length - bad)} of ${String(FIXTURES.length)} fixtures answered as they say, ` +
      `and ${String(SENTINEL_TEXTS.length - badTexts)} of ${String(SENTINEL_TEXTS.length)} sentinel texts read as they say`
  );
  return pass;
}

// ---------------------------------------------------------------------------
// The launches
// ---------------------------------------------------------------------------

/** Crashpad's dump files in a profile (names only). */
function dumpsIn(profile) {
  const out = [];
  for (const sub of ['pending', 'completed', 'new']) {
    try {
      for (const n of readdirSync(join(profile, 'Crashpad', sub))) if (n.endsWith('.dmp')) out.push(`${sub}/${n}`);
    } catch {
      /* no such folder: no dump there */
    }
  }
  return out;
}

/**
 * macOS crash reports named like the app, modified since `sinceMs`. Names and
 * modification times only: no report is opened. The folder is the person's
 * own, so it is read through the account's home, whatever HOME says.
 */
function reportsSince(sinceMs) {
  const dir = join(userInfo().homedir, 'Library', 'Logs', 'DiagnosticReports');
  try {
    return readdirSync(dir).filter((n) => /^(Electron|Tortie)/.test(n)).filter((n) => {
      try {
        return statSync(join(dir, n)).mtimeMs >= sinceMs;
      } catch {
        return false;
      }
    });
  } catch {
    return null;
  }
}

/** True when this build's main bundle can dispatch `mode`, read as text. */
function buildHasMode(checkout, mode) {
  try {
    return readFileSync(join(checkout, 'out', 'main', 'index.js'), 'utf8').includes(`smoke === "${mode}"`);
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A file's text, or null when it cannot be read (no file among them). */
function textOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** One leg: one launch, its facts read, its verdict. */
async function runLeg({ leg, mode, checkout, harness, socket, verdict }) {
  const base = join(harness, leg);
  const profile = join(base, 'profile');
  const home = join(base, 'home');
  mkdirSync(profile, { recursive: true });
  mkdirSync(home, { recursive: true });
  const sentinel = join(profile, 'logs', 'run.json');
  if (!buildHasMode(checkout, mode)) {
    return { leg, mode, facts: { started: false }, verdict: { pass: false, reasons: [`this build (${checkout}) has no GMUX_SMOKE=${mode}, so the leg cannot run`] } };
  }
  const dumpsBefore = new Set(dumpsIn(profile));
  const startedAt = Date.now();
  const facts = { started: false, sentinelSeen: false };
  try {
    await withElectron(
      {
        label: `quit-smoke-${leg}`,
        userDataDir: profile,
        cwd: checkout,
        tmuxSocket: socket,
        program: 'app',
        env: withoutDevRenderer({
          GMUX_SMOKE: mode,
          GMUX_TMUX_SOCKET: socket,
          GMUX_HARNESS_DIR: harness,
          GMUX_LOG_FILE: '1',
          HOME: home,
          ZDOTDIR: home,
          HISTFILE: '/dev/null',
          TERM_SESSION_ID: undefined,
          TERM_PROGRAM: undefined
        }),
        graceMs: 8_000,
        ceilingMs: 180_000,
        echo: true
      },
      async (handle) => {
        facts.started = true;
        const ceiling = Date.now() + 150_000;
        let done = false;
        void handle.exited.then(() => {
          done = true;
        });
        while (!done && Date.now() < ceiling) {
          if (!facts.sentinelSeen && existsSync(sentinel)) facts.sentinelSeen = true;
          await sleep(25);
        }
        facts.ceiling = !done;
        // The app's last lines can follow its exit on the pipe.
        await sleep(500);
        facts.code = handle.child.exitCode;
        facts.signal = handle.child.signalCode;
        facts.text = handle.text();
      }
    );
  } catch (err) {
    facts.why = String(err?.message ?? err);
    if (facts.started !== true) facts.started = false;
  }
  facts.ms = Date.now() - startedAt;
  facts.sentinelAfter = existsSync(sentinel);
  facts.sentinelMarked = sentinelMarkedText(textOrNull(sentinel));
  facts.manifestMade = existsSync(join(profile, 'gmux', 'manifest.db'));
  facts.dumpsNew = dumpsIn(profile).filter((n) => !dumpsBefore.has(n));
  facts.reports = reportsSince(startedAt);
  return { leg, mode, facts, verdict: verdict(facts) };
}

const LEG_SETS = Object.freeze({
  quit: [
    { leg: 'held', mode: 'quit', verdict: heldVerdict },
    { leg: 'teardown', mode: 'quit-teardown', verdict: teardownVerdict }
  ],
  'quit-doors': [{ leg: 'doors', mode: 'quit-doors', verdict: doorsVerdict }]
});

async function main() {
  const okFixtures = selfTest();
  if (process.argv.includes('--self-test')) process.exit(okFixtures ? 0 : 1);
  if (!okFixtures) {
    process.stderr.write(`${TAG} the verdicts did not answer their own fixtures, so no launch is read with them\n`);
    process.exit(2);
  }
  const set = process.argv[2];
  const legs = LEG_SETS[set];
  if (legs === undefined) {
    process.stderr.write(`${TAG} usage: node build/quit-smoke.mjs quit|quit-doors|--self-test\n`);
    process.exit(2);
  }
  const harness = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
  const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (harness === '' || socket === '') {
    process.stderr.write(`${TAG} run me through build/harness-socket.mjs (npm run smoke:quit or smoke:quitdoors), which hands me a run folder and a scratch socket\n`);
    process.exit(2);
  }
  const checkout = resolve((process.env['QUIT_SMOKE_CHECKOUT'] ?? '').trim() || repoRoot);
  const results = [];
  for (const l of legs) {
    process.stdout.write(`${TAG} ${l.leg}: GMUX_SMOKE=${l.mode} in ${checkout}\n`);
    const r = await runLeg({ ...l, checkout, harness, socket });
    results.push(r);
    const f = r.facts;
    if (f.started !== true && f.ms === undefined) process.stdout.write(`${TAG} ${l.leg}: not launched\n`);
    else {
      process.stdout.write(
        `${TAG} ${l.leg}: ended with exit code ${String(f.code ?? null)}, signal ${String(f.signal ?? null)} after ${String(f.ms ?? 0)} ms; ` +
          `held line ${String(typeof f.text === 'string' && f.text.includes(HELD_LINE))}, sentinel armed ${String(f.sentinelSeen)}, left ${String(f.sentinelAfter)} and marked ${String(f.sentinelMarked)}, ` +
          `session list made ${String(f.manifestMade)}, dumps ${String((f.dumpsNew ?? []).length)}, macOS reports ${f.reports === null ? 'unread' : String((f.reports ?? []).length)}\n`
      );
    }
    process.stdout.write(`${TAG} ${r.verdict.pass ? 'PASS' : 'FAIL'} ${l.leg}${r.verdict.pass ? '' : `: ${r.verdict.reasons.join('; ')}`}\n`);
  }
  const failed = results.filter((r) => !r.verdict.pass);
  process.stdout.write(`${TAG} ${failed.length === 0 ? 'PASS' : 'FAIL'}: ${String(results.length - failed.length)} of ${String(results.length)} leg(s) passed (${set})\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
