#!/usr/bin/env node
/**
 * stapler.mjs. Apple's stapler, read by what it says: a ticket lookup that
 * did not answer is tried again, and nothing else is (Phase 356).
 *
 * ## Why this file exists
 *
 * Every failed attempt of the 0.113.0 and 0.114.0 releases was one thing.
 * Apple's CloudKit ticket lookup lost its connection
 * (`NSURLErrorDomain Code=-1005 "The network connection was lost."`) and
 * stapler said `Error 68.`, at every place the lane asks it: the DMG step's
 * staple, the DMG's validate, the loose app's and a copy inside the ZIP or the
 * DMG. Apple had accepted every notarization, and every rerun that reached
 * Apple passed. build/verify-signed.mjs read ANY nonzero answer on an inner
 * copy as "no ticket in this copy", a WARN the lane fails on, and failed the
 * loose app and the DMG on it at once, so one dropped connection cost a whole
 * release run.
 *
 * ## What it reads (build/p356/SPEC.md §2.3: 84 runs of stapler on this Mac)
 *
 * stdout and stderr together; stapler wrote everything to stdout in 84 of 84.
 * In this order:
 *
 *   K1 ok       exit 0.
 *   P5 stopped  a try this file stopped at its limit is failed (below).
 *   K3 lookup   exit 68 AND `Error Domain=NSURLErrorDomain` or
 *               `Error Domain=NSPOSIXErrorDomain` with `Code=<n> "<words>"`.
 *               The POSIX domain is what a denied network reads here (34 of
 *               34) and the URL domain is the CI's. The exit keeps out a path
 *               that does not exist, whose words name NSPOSIXErrorDomain
 *               Code=2 at exit 66. The CloudKit sentence printed beside it is
 *               not read: it carries Apple's own typo, the likeliest words to
 *               change.
 *   K2 missing  exit 65 AND stapler's own words for a copy with no ticket:
 *               validate's `<name> does not have a ticket stapled to it.`,
 *               which never asks the network, or staple's
 *               `failed due to "Record not found".`
 *   K4 failed   anything else. A ticket that is not this copy's, or one cut
 *               short, exits 65 and says only `Processing:`: that is neither
 *               a ticket nor no ticket.
 *
 * ## The bound
 *
 * Only a lookup is tried again (P1): at most 4 tries (P2), waiting 10, 30 and
 * 60 s before tries 2, 3 and 4 (P3), and no try starting more than 150 s after
 * the first began (P4). The first try is run as build/verify-signed.mjs always
 * ran stapler, with nothing to stop it: an answer that comes late is still an
 * answer, and the lane has always waited for it. A try after it, which only
 * this file starts, is stopped at 120 s and is then failed (P5). A try took at
 * most 798 ms online and 190 ms denied, so the waits are the budget: four
 * tries within two minutes. The verdict is the last try's (P6). A missing
 * ticket and a failed answer are never tried again, and nothing this file
 * adds waits without a bound.
 *
 * ## What a caller prints (R1 to R5)
 *
 *   ok       PASS, and after more than one try "took N tries in S s".
 *   missing  WARN on a copy inside the ZIP or the DMG, in the words
 *            build/verify-signed.mjs has always printed, and FAIL with
 *            stapler's last line on the loose app and the DMG: as before.
 *   lookup   FAIL "Apple's ticket lookup did not answer after N tries in
 *            S s:" and the error's words, on every copy.
 *   failed   FAIL "exit N," and stapler's last line, or why there was no
 *            answer, on every copy.
 *
 * A RETRY note names the error's domain and code and no word stapler chose,
 * and an ok after a retry is a PASS, so a run that passes prints no WARN for
 * the release lane's zero-warnings check to find.
 *
 * ## Where it runs
 *
 *   - build/verify-signed.mjs asks it for the loose app, the app inside the
 *     ZIP, the app on the mounted DMG and the DMG.
 *   - .github/workflows/release.yml's DMG step runs
 *     `node build/stapler.mjs staple "$dmg"`, then the same with `validate`.
 *   - `npm run gate:stapler` runs the self-test alone, and so does every
 *     `npm run build`.
 *
 * ## It proves itself
 *
 * `node build/stapler.mjs --self-test` reads build/fixtures/stapler/answers.json:
 * stapler's answers recorded on this Mac byte for byte, the CI's words set in
 * the measured shape, what spawnSync answers for a child it stopped and for
 * one that never started, and an error whose words hold the lane's grep word
 * `WARN`; and sequences of them, each with its tries, waits, seconds and
 * words written out as literals rather than through this file's constants.
 * Every answer must read as recorded and every sequence as written, over a
 * fake runner, sleep and clock; the fake runner stops a try whose recorded
 * cost passes the limit it was handed, as spawnSync's timeout does, and
 * answers for it what spawnSync answers (`c-stopped`). Then 28 ablations each
 * break one clause in memory and must turn red every fixture they name, each
 * of which owns that clause. Nothing but the self-test selects an ablated
 * rule: no export, argument, flag or environment variable can.
 *
 * ## Limits, stated rather than fixed
 *
 *   - The CI's own words are constructed from the backlog's quotes until its
 *     job logs are read with a credential (build/p356/SPEC.md §11).
 *   - An ok after a retry cannot be driven with the real stapler here, since
 *     a sandbox cannot hand a running process its network back; the recorded
 *     answers hold that path.
 *   - The self-test holds which tries are handed the 120 s limit, not that
 *     spawnSync honours it: a live run against a stand-in xcrun holds that
 *     (build/p356/SPEC.md §As built, the fix round).
 *   - A staple with the network gone cannot tell a missing ticket from a
 *     lookup: it reads as a lookup, is tried again and ends a FAIL, never a
 *     PASS.
 *   - build/notarize-local.mjs, the post-hoc path a person runs and watches,
 *     still runs stapler itself.
 *
 * It reads no environment variable and prints none; stapler inherits the
 * environment, as it always has. The self-test spawns nothing and sleeps
 * nothing. Exit 0 for a PASS or a green self-test, 1 otherwise, and 2 for a
 * command line it cannot read.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIONS = Object.freeze(['staple', 'validate']);

const OK = 'ok';
const MISSING = 'missing';
const LOOKUP = 'lookup';
const FAILED = 'failed';
const VERDICTS = Object.freeze([OK, MISSING, LOOKUP, FAILED]);

const PASS = 'PASS';
const WARN = 'WARN';
const FAIL = 'FAIL';
const LEVELS = Object.freeze([PASS, WARN, FAIL]);

/** build/verify-signed.mjs's two stapleMode values: the loose app or the DMG, and a copy inside the ZIP or the DMG. */
const REQUIRED = 'required';
const INNER = 'inner';

/** The clauses of build/p356/SPEC.md §4.2, which every fixture and every ablation names. */
const CLAUSES = Object.freeze([
  'K1', 'K2', 'K3', 'K4',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
  'R1', 'R2', 'R3', 'R4', 'R5'
]);

/** K2: validate's words for a copy with no ticket. It never asks the network. */
const NO_TICKET = /^.+ does not have a ticket stapled to it\.$/m;
/** K2: staple's words when Apple holds no ticket for the copy. */
const NO_RECORD = /failed due to "Record not found"\.$/m;
/** K3: the URL session's error. Its groups are the domain, the code and the description. */
const LOOKUP_WORDS = /Error Domain=(NSURLErrorDomain|NSPOSIXErrorDomain) Code=(-?\d+) "([^"\n]*)"/;

/** R2: what build/verify-signed.mjs has always printed for an inner copy with no ticket. */
const INNER_WORDS =
  'no ticket in this copy — the archive was cut before the staple ' +
  '(post-hoc flow). Offline first launch from this artifact prompts; ' +
  'the inline notarization path staples before packaging.';

const textOf = (answer) => `${answer.stdout}${answer.stderr}`;
/** As build/verify-signed.mjs has always read it. */
const lastLine = (answer) => textOf(answer).trim().split('\n').pop();
const triesWord = (n) => `${String(n)} ${n === 1 ? 'try' : 'tries'}`;
const messageOf = (error) => (error instanceof Error ? error.message : String(error));

/** R4: why a failed answer failed, in stapler's words where it had any. */
function failedWords(answer, rules) {
  if (answer.error === 'ETIMEDOUT') {
    return `stapler gave no answer in ${String(rules.tryLimitMs / 1000)} s and was stopped`;
  }
  if (answer.status === null && answer.signal !== null) return `stapler ended on ${answer.signal}`;
  if (answer.status === null) return `stapler did not start (${String(answer.error)})`;
  const last = lastLine(answer);
  return last === '' ? `exit ${String(answer.status)}` : `exit ${String(answer.status)}, ${last}`;
}

// ---------------------------------------------------------------------------
// The rules. staplerSelfTest() alone swaps a member for an ablation; every
// export and the command line use SHIPPED, and nothing selects anything else.
// ---------------------------------------------------------------------------

const SHIPPED = Object.freeze({
  /** K1 ok: stapler exited 0. */
  ok: (answer) => answer.status === 0,
  /** K2 missing: exit 65 and stapler's own words for a copy with no ticket. */
  missing: (answer, text) => answer.status === 65 && (NO_TICKET.test(text) || NO_RECORD.test(text)),
  /** K3 lookup: exit 68 and the URL session's error words; the match is the lookup's words. */
  lookup: (answer, text) => (answer.status === 68 ? text.match(LOOKUP_WORDS) : null),
  /** K4 failed: the verdict of everything else, an answer with no exit status included. */
  otherwise: FAILED,
  /** P1: only a lookup is tried again. */
  retried: (verdict) => verdict === LOOKUP,
  /** P2: at most four tries. */
  tries: 4,
  /** P3: the waits before tries 2, 3 and 4. */
  waitsMs: Object.freeze([10_000, 30_000, 60_000]),
  /** P4: no try starts more than 150 s after the first began. */
  budgetMs: 150_000,
  /** P5: the first try has no limit, as stapler always ran: a late answer is still an answer ... */
  firstTryLimitMs: null,
  /** P5: ... a try after it, which only this file starts, is stopped at 120 s ... */
  tryLimitMs: 120_000,
  /** P5: ... and a stopped try is failed, never tried again. */
  stoppedVerdict: FAILED,
  /** P6: the verdict is the last try's. */
  pick: (answers) => answers[answers.length - 1],
  /** R1: ok is a PASS; after more than one try it says how many it took and how long. */
  okReading: (result, where, rules) =>
    result.tries === 1
      ? { level: PASS, detail: null }
      : {
          level: rules.retriedOkLevel,
          detail: `took ${triesWord(result.tries)} in ${String(result.seconds)} s`
        },
  /** R2: a missing ticket WARNs on an inner copy and FAILs with stapler's last line elsewhere, as before. */
  missingReading: (result, where, rules) =>
    where === INNER
      ? { level: WARN, detail: rules.innerWords }
      : { level: FAIL, detail: lastLine(result.last) },
  /** R2: the inner copy's words, byte for byte what build/verify-signed.mjs printed before. */
  innerWords: INNER_WORDS,
  /** R3: a lookup that never answered FAILs in its own words, on every copy. */
  lookupReading: (result, where, rules) => ({
    level: FAIL,
    detail:
      `Apple's ticket lookup did not answer after ${triesWord(result.tries)} ` +
      `in ${String(result.seconds)} s: ${lookupMatch(rules, result.last)[0]}`
  }),
  /** R4: anything else FAILs on every copy, with stapler's exit and last line or why there was none. */
  failedReading: (result, where, rules) => ({ level: FAIL, detail: failedWords(result.last, rules) }),
  /** R5: the RETRY note names the error's domain and code, never a word stapler chose. */
  retryNote: (match, next, rules, waitMs) =>
    `Apple's ticket lookup did not answer (${match[1]} ${match[2]}); ` +
    `try ${String(next)} of ${String(rules.tries)} in ${String(waitMs / 1000)} s`,
  /** R5: an ok that took more than one try is still a PASS, so a passing run prints no WARN. */
  retriedOkLevel: PASS
});

/** K1, then P5's stop, then K3, then K2, else K4. */
function classify(rules, answer) {
  const text = textOf(answer);
  if (rules.ok(answer, text)) return OK;
  if (answer.error === 'ETIMEDOUT') return rules.stoppedVerdict;
  if (rules.lookup(answer, text)) return LOOKUP;
  if (rules.missing(answer, text)) return MISSING;
  return rules.otherwise;
}

/** K3's match for an answer read as a lookup. A rule that asks for words an answer lacks throws. */
function lookupMatch(rules, answer) {
  const match = rules.lookup(answer, textOf(answer));
  if (!match) throw new Error(`no lookup words to quote in an answer that exited ${String(answer.status)}`);
  return match;
}

/**
 * The loop, over the rules and a runner, a sleep and a clock: run (the first
 * try with no limit, a later one with the per-try limit, P5), classify, and
 * stop unless the verdict is tried again (P1) and tries remain (P2); stop if
 * the next wait would start a try past the budget (P4); otherwise say why,
 * wait (P3) and run again. The verdict is the picked answer's (P6).
 */
function ask(rules, action, path, tools, { onAnswer, onRetry } = {}) {
  const answers = [];
  const started = tools.now();
  for (let n = 1; ; n += 1) {
    const answer = tools.run(action, path, n === 1 ? rules.firstTryLimitMs : rules.tryLimitMs);
    answers.push(answer);
    if (onAnswer !== undefined) onAnswer(answer, n);
    if (!rules.retried(classify(rules, answer)) || n >= rules.tries) break;
    const waitMs = rules.waitsMs[n - 1];
    if (tools.now() - started + waitMs > rules.budgetMs) break;
    const note = rules.retryNote(lookupMatch(rules, answer), n + 1, rules, waitMs);
    if (onRetry !== undefined) onRetry(note, n);
    tools.sleep(waitMs);
  }
  const last = rules.pick(answers);
  return {
    action,
    path,
    verdict: classify(rules, last),
    tries: answers.length,
    seconds: Math.round((tools.now() - started) / 1000),
    last
  };
}

function readingOf(rules, result, where) {
  if (where !== REQUIRED && where !== INNER) {
    throw new Error(`a reading is for a '${REQUIRED}' or an '${INNER}' copy, not ${String(where)}`);
  }
  switch (result.verdict) {
    case OK:
      return rules.okReading(result, where, rules);
    case MISSING:
      return rules.missingReading(result, where, rules);
    case LOOKUP:
      return rules.lookupReading(result, where, rules);
    default:
      return rules.failedReading(result, where, rules);
  }
}

/** The real stapler, run as build/verify-signed.mjs always ran it, the real sleep and the real clock. */
const LIVE = Object.freeze({
  run: (action, path, limitMs) => {
    // No limit is build/verify-signed.mjs's own call, byte for byte: `{ encoding: 'utf8' }`.
    const options =
      limitMs === null ? { encoding: 'utf8' } : { encoding: 'utf8', timeout: limitMs, killSignal: 'SIGTERM' };
    const r = spawnSync('/usr/bin/xcrun', ['stapler', action, path], options);
    return {
      status: r.status,
      signal: r.signal,
      stdout: r.stdout ?? '',
      stderr: r.stderr ?? '',
      error: r.error ? (r.error.code ?? String(r.error)) : null
    };
  },
  sleep: (ms) => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  },
  now: () => performance.now()
});

/**
 * Runs `xcrun stapler <action> <path>` under the shipped rules, trying a lookup
 * that did not answer again within the bound. `onAnswer(answer, n)` runs after
 * try n and `onRetry(note, n)` before the wait for try n + 1. Returns
 * `{ action, path, verdict, tries, seconds, last }`.
 */
export function askStapler(action, path, { onAnswer, onRetry } = {}) {
  if (!ACTIONS.includes(action)) throw new Error(`stapler is asked to staple or validate, not ${String(action)}`);
  if (typeof path !== 'string' || path === '') throw new Error('stapler is asked about one path');
  return ask(SHIPPED, action, path, LIVE, { onAnswer, onRetry });
}

/** The line a caller prints for an answer: `{ level, detail }` for a 'required' or an 'inner' copy. */
export function staplerReading(result, where) {
  return readingOf(SHIPPED, result, where);
}

// ---------------------------------------------------------------------------
// The self-test
// ---------------------------------------------------------------------------

/** R5, by shape: the one way a RETRY note may read, and the one detail a PASS may carry. */
const NOTE_SHAPE =
  /^Apple's ticket lookup did not answer \((NSURLErrorDomain|NSPOSIXErrorDomain) -?\d+\); try \d+ of \d+ in \d+ s$/;
const PASS_SHAPE = /^took \d+ tries in \d+ s$/;
/** The recorded answer the fake runner gives for a try it stopped: spawnSync's, measured (build/p356/SPEC.md §2.7). */
const STOPPED = 'c-stopped';

/** Each arm breaks one clause in memory and must turn red every fixture it names. */
const ABLATIONS = Object.freeze([
  { arm: 'X1', clause: 'K1', rule: 'ok unless the words say no ticket', change: { ok: (answer, text) => !/does not have a ticket stapled to it/.test(text) && !/Record not found/.test(text) }, reddens: ['lookup-validate-dmg', 'failed-wrong-ticket', 'failed-zip', 'ci-lookup-validate'] },
  { arm: 'X2', clause: 'K2', rule: 'missing on exit 65 alone', change: { missing: (answer) => answer.status === 65 }, reddens: ['failed-wrong-ticket', 'failed-broken-ticket'] },
  { arm: 'X3', clause: 'K2', rule: "missing without validate's sentence", change: { missing: (answer, text) => answer.status === 65 && NO_RECORD.test(text) }, reddens: ['missing-validate-unstapled-app', 'missing-validate-unsigned-app', 'missing-validate-plain-dmg'] },
  { arm: 'X4', clause: 'K2', rule: 'missing without "Record not found"', change: { missing: (answer, text) => answer.status === 65 && NO_TICKET.test(text) }, reddens: ['missing-staple-unsigned-app', 'missing-staple-plain-dmg'] },
  { arm: 'X5', clause: 'K3', rule: 'lookup on the words without exit 68', change: { lookup: (answer, text) => text.match(LOOKUP_WORDS) }, reddens: ['failed-no-such-path'] },
  { arm: 'X6', clause: 'K3', rule: 'lookup on exit 68 without the words', change: { lookup: (answer, text) => (answer.status === 68 ? text.match(/[\s\S]*/) : null) }, reddens: ['c-68-no-error-words'] },
  { arm: 'X7', clause: 'K3', rule: 'NSURLErrorDomain alone (the entry taken literally)', change: { lookup: (answer, text) => (answer.status === 68 ? text.match(/Error Domain=(NSURLErrorDomain) Code=(-?\d+) "([^"\n]*)"/) : null) }, reddens: ['lookup-validate-dmg', 'lookup-validate-zip-app', 'lookup-validate-dmg-app', 'lookup-validate-zip-app-ip', 'lookup-staple-dmg', 'lookup-staple-unstapled-app', 'lookup-staple-unsigned-app'] },
  { arm: 'X8', clause: 'K3', rule: 'NSPOSIXErrorDomain alone', change: { lookup: (answer, text) => (answer.status === 68 ? text.match(/Error Domain=(NSPOSIXErrorDomain) Code=(-?\d+) "([^"\n]*)"/) : null) }, reddens: ['ci-lookup-staple', 'ci-lookup-validate', 's-ci-staple-ok-on-2nd'] },
  { arm: 'X9', clause: 'K4', rule: "missing on any exit but 0 (the parent's reading)", change: { otherwise: MISSING }, reddens: ['failed-wrong-ticket', 'failed-zip', 'c-not-started'] },
  { arm: 'X10', clause: 'P1', rule: 'a missing ticket tried again', change: { retried: (verdict) => verdict === LOOKUP || verdict === MISSING }, reddens: ['s-missing', 's-lookup-then-missing'] },
  { arm: 'X11', clause: 'P1', rule: 'a failed answer tried again', change: { retried: (verdict) => verdict === LOOKUP || verdict === FAILED }, reddens: ['s-failed', 's-lookup-then-failed'] },
  { arm: 'X12', clause: 'P2', rule: 'five tries', change: { tries: 5, waitsMs: [10_000, 30_000, 60_000, 1_000] }, reddens: ['s-lookup-always'] },
  { arm: 'X13', clause: 'P2', rule: 'three tries', change: { tries: 3 }, reddens: ['s-ok-on-4th', 's-lookup-always'] },
  { arm: 'X14', clause: 'P3', rule: 'no waits', change: { waitsMs: [0, 0, 0] }, reddens: ['s-ok-on-2nd', 's-ok-on-4th', 's-lookup-always'] },
  { arm: 'X15', clause: 'P4', rule: 'no budget', change: { budgetMs: Infinity }, reddens: ['s-slow-lookups'] },
  { arm: 'X16', clause: 'P5', rule: 'no limit on a try after the first', change: { tryLimitMs: null }, reddens: ['s-lookup-then-stopped'] },
  { arm: 'X17', clause: 'P5', rule: 'a stopped try read as a lookup', change: { stoppedVerdict: LOOKUP }, reddens: ['c-stopped', 's-lookup-then-stopped'] },
  { arm: 'X18', clause: 'P6', rule: "the first try's verdict", change: { pick: (answers) => answers[0] }, reddens: ['s-ok-on-2nd', 's-lookup-then-missing', 's-lookup-then-failed'] },
  { arm: 'X19', clause: 'R1', rule: 'ok after a retry says nothing of the tries', change: { okReading: () => ({ level: PASS, detail: null }) }, reddens: ['s-ok-on-2nd', 's-staple-ok-on-2nd'] },
  { arm: 'X20', clause: 'R2', rule: 'a missing inner copy reads FAIL', change: { missingReading: (result, where, rules) => ({ level: FAIL, detail: where === INNER ? rules.innerWords : lastLine(result.last) }) }, reddens: ['s-missing', 's-missing-staple'] },
  { arm: 'X21', clause: 'R2', rule: "today's words with the first — made -", change: { innerWords: INNER_WORDS.replace('—', '-') }, reddens: ['s-missing'] },
  { arm: 'X22', clause: 'R3', rule: "a lookup on an inner copy reads WARN in today's words (the parent's reading)", change: { lookupReading: (result, where, rules) => (where === INNER ? { level: WARN, detail: rules.innerWords } : SHIPPED.lookupReading(result, where, rules)) }, reddens: ['s-lookup-always'] },
  { arm: 'X23', clause: 'R3', rule: 'a lookup reads PASS', change: { lookupReading: () => ({ level: PASS, detail: null }) }, reddens: ['s-lookup-always'] },
  { arm: 'X24', clause: 'R4', rule: "a failed inner copy reads WARN in today's words", change: { failedReading: (result, where, rules) => (where === INNER ? { level: WARN, detail: rules.innerWords } : SHIPPED.failedReading(result, where, rules)) }, reddens: ['s-failed', 's-not-started'] },
  { arm: 'X25', clause: 'R5', rule: "the RETRY note quotes stapler's description", change: { retryNote: (match, next, rules, waitMs) => `Apple's ticket lookup did not answer (${match[1]} ${match[2]} "${match[3]}"); try ${String(next)} of ${String(rules.tries)} in ${String(waitMs / 1000)} s` }, reddens: ['s-ok-on-2nd', 's-warning-words-always'] },
  { arm: 'X26', clause: 'R5', rule: 'ok after a retry reads WARN', change: { retriedOkLevel: WARN }, reddens: ['s-ok-on-2nd'] },
  { arm: 'X27', clause: 'P5', rule: 'the first try stopped at 120 s too (the lane has always waited for it)', change: { firstTryLimitMs: 120_000 }, reddens: ['s-ok', 's-slow-ok', 's-slow-first-lookup'] },
  { arm: 'X28', clause: 'P4', rule: 'no try may start at 150 s exactly', change: { budgetMs: 149_999 }, reddens: ['s-budget-edge'] }
]);

const isText = (value) => typeof value === 'string';
const isTextOrNull = (value) => value === null || typeof value === 'string';
const isCount = (value) => Number.isInteger(value) && value >= 0;
const isNumbers = (value) => Array.isArray(value) && value.every((v) => typeof v === 'number');
/** The limit each try was handed: a number, or null for the first try's none. */
const isLimits = (value) => Array.isArray(value) && value.every((v) => v === null || typeof v === 'number');

/** Deep equality over what JSON holds, key order aside. */
function equal(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => equal(v, b[i]));
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]));
  }
  return Object.is(a, b);
}

/** (1) The file's shape: ids unique, verdicts and readings from the closed sets, every name present. */
function shapeProblems(file) {
  if (file === null || typeof file !== 'object' || !Array.isArray(file.answers) || !Array.isArray(file.sequences)) {
    return ['it holds no answers list and sequences list'];
  }
  const problems = [];
  const ids = new Set();
  const answers = new Map();
  const named = (fixture, kind) => {
    if (!isText(fixture?.id) || fixture.id === '') {
      problems.push(`${kind} has no id`);
      return false;
    }
    if (ids.has(fixture.id)) problems.push(`${fixture.id} is named twice`);
    ids.add(fixture.id);
    if (!Array.isArray(fixture.owns) || fixture.owns.length === 0 || !fixture.owns.every((c) => CLAUSES.includes(c))) {
      problems.push(`${fixture.id} owns ${JSON.stringify(fixture.owns)}, not clauses of build/p356/SPEC.md §4.2`);
    }
    return true;
  };
  const isReading = (reading) =>
    reading !== null && typeof reading === 'object' && LEVELS.includes(reading.level) && isTextOrNull(reading.detail);

  for (const answer of file.answers) {
    if (!named(answer, 'an answer')) continue;
    answers.set(answer.id, answer);
    const bad = [];
    if (!ACTIONS.includes(answer.action)) bad.push('action');
    if (!(answer.status === null || Number.isInteger(answer.status))) bad.push('status');
    if (!isTextOrNull(answer.signal)) bad.push('signal');
    if (!isTextOrNull(answer.error)) bad.push('error');
    if (!isText(answer.stdout)) bad.push('stdout');
    if (!isText(answer.stderr)) bad.push('stderr');
    if (!VERDICTS.includes(answer.verdict)) bad.push('verdict');
    if (bad.length > 0) problems.push(`${answer.id} has no usable ${bad.join(', ')}`);
  }
  if (!answers.has(STOPPED)) problems.push(`${STOPPED}, what spawnSync answers for a try it stopped, is not an answer`);
  for (const sequence of file.sequences) {
    if (!named(sequence, 'a sequence')) continue;
    const bad = [];
    if (!ACTIONS.includes(sequence.action)) bad.push('action');
    if (!Array.isArray(sequence.answers) || sequence.answers.length === 0) bad.push('answers');
    if (sequence.ms !== undefined && (!isNumbers(sequence.ms) || sequence.ms.length === 0)) bad.push('ms');
    if (!VERDICTS.includes(sequence.verdict)) bad.push('verdict');
    if (!isCount(sequence.tries) || sequence.tries === 0) bad.push('tries');
    if (!isNumbers(sequence.waitsMs)) bad.push('waitsMs');
    if (!isLimits(sequence.limitsMs)) bad.push('limitsMs');
    if (!isCount(sequence.seconds)) bad.push('seconds');
    if (!isReading(sequence.required)) bad.push('required');
    if (!isReading(sequence.inner)) bad.push('inner');
    if (!Array.isArray(sequence.notes) || !sequence.notes.every(isText)) bad.push('notes');
    if (bad.length > 0) problems.push(`${sequence.id} has no usable ${bad.join(', ')}`);
    for (const id of Array.isArray(sequence.answers) ? sequence.answers : []) {
      const answer = answers.get(id);
      if (answer === undefined) problems.push(`${sequence.id} asks for ${String(id)}, which is not an answer`);
      else if (answer.action !== sequence.action) {
        problems.push(`${sequence.id} is a ${String(sequence.action)} and asks for ${id}, a ${answer.action}`);
      }
    }
  }
  return problems;
}

/**
 * One sequence over a fake runner, sleep and clock: every field a sequence
 * records, as read. A try whose recorded cost passes the limit it was handed
 * is stopped at that limit and answers `c-stopped`, as spawnSync's timeout does.
 */
function replay(rules, sequence, answers) {
  let clock = 0;
  let asked = 0;
  const limitsMs = [];
  const waitsMs = [];
  const notes = [];
  const at = (list, i) => list[Math.min(i, list.length - 1)];
  const fake = {
    run: (action, path, limitMs) => {
      limitsMs.push(limitMs);
      const costMs = sequence.ms === undefined ? 0 : at(sequence.ms, asked);
      const stopped = typeof limitMs === 'number' && costMs > limitMs;
      const { status, signal, stdout, stderr, error } = answers.get(stopped ? STOPPED : at(sequence.answers, asked));
      clock += stopped ? limitMs : costMs;
      asked += 1;
      return { status, signal, stdout, stderr, error };
    },
    sleep: (ms) => {
      waitsMs.push(ms);
      clock += ms;
    },
    now: () => clock
  };
  const result = ask(rules, sequence.action, `fixture/${sequence.id}`, fake, {
    onRetry: (note) => notes.push(note)
  });
  return {
    verdict: result.verdict,
    tries: result.tries,
    waitsMs,
    limitsMs,
    seconds: result.seconds,
    required: readingOf(rules, result, REQUIRED),
    inner: readingOf(rules, result, INNER),
    notes
  };
}

/** (2) and (3) for one sequence: every recorded field as written, and R5 by shape. */
function sequenceRed(rules, sequence, answers) {
  const got = replay(rules, sequence, answers);
  const red = [];
  for (const [field, value] of Object.entries(got)) {
    if (!equal(value, sequence[field])) {
      red.push(`${field} read ${JSON.stringify(value)}, written ${JSON.stringify(sequence[field])}`);
    }
  }
  for (const note of got.notes) {
    if (!NOTE_SHAPE.test(note)) red.push(`R5: a RETRY note says more than a domain and a code: ${note}`);
  }
  for (const where of [REQUIRED, INNER]) {
    const { level, detail } = got[where];
    if (level === PASS && detail !== null && !PASS_SHAPE.test(String(detail))) {
      red.push(`R5: a PASS says more than its tries: ${String(detail)}`);
    }
    // The level, not the words: a FAIL may quote whatever stapler said, and it fails the step before any grep.
    const missingInner = got.verdict === MISSING && where === INNER;
    if (!missingInner && level === WARN) {
      red.push(`R5: the ${where} reading of a ${String(got.verdict)} answer is a ${WARN}`);
    }
  }
  return red;
}

/** Every answer and every sequence under one set of rules: the red ones, a throw included. */
function runSuite(rules, file) {
  const red = [];
  const answers = new Map(file.answers.map((answer) => [answer.id, answer]));
  for (const answer of file.answers) {
    let got;
    try {
      got = classify(rules, answer);
    } catch (error) {
      got = `a throw (${messageOf(error)})`;
    }
    if (got !== answer.verdict) red.push({ id: answer.id, text: `${answer.id} read ${got}, recorded ${answer.verdict}` });
  }
  for (const sequence of file.sequences) {
    let wrong;
    try {
      wrong = sequenceRed(rules, sequence, answers);
    } catch (error) {
      wrong = [`threw: ${messageOf(error)}`];
    }
    for (const text of wrong) red.push({ id: sequence.id, text: `${sequence.id} ${text}` });
  }
  return red;
}

/**
 * Reads build/fixtures/stapler/answers.json, reads every answer and sequence
 * with the shipped rules and then under each ablation, and spawns and sleeps
 * nothing: `{ answers, sequences, ablations, problems }`.
 */
export function staplerSelfTest() {
  let file;
  try {
    file = JSON.parse(readFileSync(new URL('./fixtures/stapler/answers.json', import.meta.url), 'utf8'));
  } catch (error) {
    return { answers: 0, sequences: 0, ablations: 0, problems: [`build/fixtures/stapler/answers.json: ${messageOf(error)}`] };
  }
  const shape = shapeProblems(file);
  if (shape.length > 0) {
    return {
      answers: Array.isArray(file?.answers) ? file.answers.length : 0,
      sequences: Array.isArray(file?.sequences) ? file.sequences.length : 0,
      ablations: 0,
      problems: shape.map((line) => `the file's shape: ${line}`)
    };
  }
  const problems = runSuite(SHIPPED, file).map((bad) => `the shipped rules: ${bad.text}`);
  const owners = new Map([...file.answers, ...file.sequences].map((fixture) => [fixture.id, fixture.owns]));
  let ablations = 0;
  for (const arm of ABLATIONS) {
    const label = `${arm.arm} (${arm.clause}: ${arm.rule})`;
    const strangers = arm.reddens.filter((id) => !(owners.get(id) ?? []).includes(arm.clause));
    if (strangers.length > 0) {
      problems.push(`${label} names ${strangers.join(', ')}, not a fixture of ${arm.clause}`);
      continue;
    }
    ablations += 1;
    const red = new Set(runSuite(Object.freeze({ ...SHIPPED, ...arm.change }), file).map((bad) => bad.id));
    const missed = arm.reddens.filter((id) => !red.has(id));
    if (missed.length > 0) problems.push(`${label} left ${missed.join(', ')} reading as written`);
  }
  return { answers: file.answers.length, sequences: file.sequences.length, ablations, problems };
}

// ---------------------------------------------------------------------------
// The command line: staple or validate one path, or run the self-test
// ---------------------------------------------------------------------------

/** One line in build/verify-signed.mjs's own format. */
const line = (level, name, detail) => `  ${level.padEnd(5)} ${name}${detail ? ` — ${detail}` : ''}`;

function main(args) {
  if (args.length === 1 && args[0] === '--self-test') {
    const test = staplerSelfTest();
    if (test.problems.length > 0) {
      const n = test.problems.length;
      console.error(
        [`stapler self-test: ${String(n)} problem${n === 1 ? '' : 's'}:`, ...test.problems.map((p) => `  ${p}`)].join('\n')
      );
      return 1;
    }
    console.log(
      `stapler self-test: ${String(test.answers)} answers read as recorded, ` +
        `${String(test.sequences)} sequences as written, ` +
        `${String(test.ablations)} ablations each red on the clause it breaks`
    );
    return 0;
  }
  const [action, path] = args;
  if (args.length !== 2 || !ACTIONS.includes(action) || path === '') {
    console.error('stapler: give staple or validate and one path, or --self-test');
    return 2;
  }
  const name = `stapler ${action} (${basename(path)})`;
  const result = askStapler(action, path, {
    onAnswer: (answer) => {
      process.stdout.write(answer.stdout);
      process.stderr.write(answer.stderr);
    },
    onRetry: (note) => console.log(line('RETRY', name, note))
  });
  const { level, detail } = staplerReading(result, REQUIRED);
  console.log(line(level, name, detail));
  return level === PASS ? 0 : 1;
}

/** By realpath, because /var is a link to /private/var and a gate that runs nothing exits 0. */
function invokedDirectly() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`stapler: ${messageOf(error)}`);
    process.exitCode = 1;
  }
}
