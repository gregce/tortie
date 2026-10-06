#!/usr/bin/env node
/**
 * `npm run probe:p340`. Phase 340's app run (build/p340/SPEC.md §10): adding a
 * machine by picking it, Tortie checking and preparing it with one Add press,
 * and the compact row with its native ⋯ menu, graded at HEAD with the
 * parent's reading printed beside it. VERIFIERS ONLY, UNDER THE LOCK.
 *
 * ## It sanitises ITSELF first (D26 as revised by the attack)
 *
 * `npm run probe:p340` inherits the person's environment, and
 * build/scratch-machine.mjs's `scratchYard` lists `$HOME/.ssh/*.pub` and asks
 * `ssh-add -L` of whatever agent `SSH_AUTH_SOCK` names. So the FIRST
 * statements of this file, before any import that runs code of ours (every
 * module of this repository but build/electron-run.mjs is imported inside
 * run(); that one defines constants and functions at load, reads no
 * environment until a launch, and is imported statically because gate:electron
 * counts a helper user by its static import), point
 * `HOME` and `ZDOTDIR` at a scratch folder under the harness directory, set
 * `HISTFILE=/dev/null`, delete `SSH_AUTH_SOCK` and `TERM_SESSION_ID`, set
 * `SCRATCH_MACHINE_NO_OWN_KEYS=1` (Phase 337's switch; harmless before it
 * lands), and exit 2 BY NAME if `SSH_AUTH_SOCK` is still set.
 *
 * ## What it drives, one Electron at a time
 *
 * THE PARENT FIRST (`P340_PARENT_CHECKOUT`, a built checkout of `ae38b831`),
 * then HEAD, each launch through build/electron-run.mjs's `withElectron`,
 * ended in its `finally`, on a fresh scratch profile and a scratch HOME of its
 * own, the harness socket, `--use-mock-keychain`, and a scratch agents.json
 * renaming the Gemini, Qwen, Antigravity, Grok and Droid binaries (read back
 * through agents:list, the probe:p332 practice). The launches and their arms:
 *
 *   main     A1 the path (Add a machine → the peer → whatever each build asks
 *            → Ready, presses and typed fields counted; tmux only in
 *            /opt/homebrew/bin), A13 Open a folder on it…, A12 the row at rest
 *            and its menu, A9 a changed machine (the port rewritten; Confirm,
 *            then Prepare), A14 a machine that stops answering. The PARENT's
 *            main launch runs A1 and A12, and its profile is the one A11 then
 *            relaunches at HEAD.
 *   checks   A6 host keys (first seen: the ask's fingerprint against the
 *            yard's key, Stop, then Trust; changed: a wrong key planted in the
 *            profile's own record), A3 none found, A2 the login route, A5 noise
 *            (a, b, c), A4 planted earlier.
 *   key      A7 a refused key install (a wrapper with no identity, a dummy
 *            password), A7b the key signs in (Tortie's key appended to the
 *            yard's authorized file, then Check again; restored by sha256).
 *   version  A8 an untested version (a logging stand-in printing tmux 3.9z for
 *            -V and exec'ing the real tmux for everything else).
 *   agent    A10 an agent between check and press (HEAD).
 *   picks    A15 two picks in a row (HEAD).
 *   a11      A11 the parent's confirmed row relaunched at HEAD (with a parent).
 *   RUN      what was left, what the sampler saw, his history.
 *
 * It never opens the native ⋯ menu (an OS menu an unattended run cannot
 * dismiss); it reads and runs its rows through `window.__gmuxP340Menu`, which
 * calls the same `runMachineMenuItem` a pick does. Presses are a `click` on
 * the real element, one each, counted; a typed field is the native value
 * setter plus an `input` event, counted. Words are `innerText` (a closed
 * disclosure is excluded by rendering). No photograph is taken.
 *
 * ## The far side is ONLY its own loopback machine (D26)
 *
 * `scratchYard` + `scratchMachine` from build/scratch-machine.mjs, built HERE
 * after the sanitising (never build/with-scratch-machine.mjs, whose
 * `isolated()` runs ssh with no `-F` and reads the person's ~/.ssh/config),
 * with `SCRATCH_MACHINE_QUIET_SHELL=1` and `SCRATCH_MACHINE_SCRATCH_HOME=1`, so
 * the far `ZDOTDIR` and `HOME` are the yard's own. The app reaches it ONLY
 * through an ssh wrapper named by `GMUX_SSH_BIN`:
 *
 *   exec /usr/bin/ssh -F none -p <yard port> -o IdentitiesOnly=yes -o IdentityFile=<yard key> "$@"
 *
 * The first value of a repeated option wins (M15), so the yard's port stands
 * in front of whatever the product composes; `-F none` keeps his ssh
 * configuration closed; and an `IdentityFile` is always named (arm A7's
 * wrapper names a file that does not exist), so ssh never falls back to the
 * default identity files of the account record. The tailnet is
 * build/p340/tailscale-peers.mjs behind a wrapper named by
 * `GMUX_TAILSCALE_BIN`. Both wrappers, the stand-in and its fixture are
 * PREFLIGHTED BY SHA256 before every launch and kept until the `finally`,
 * because `resolveSsh` FALLS BACK to /usr/bin/ssh when `GMUX_SSH_BIN` stops
 * naming an executable file, and the real client with no `-F none` and no
 * port would open his ~/.ssh/config and dial 127.0.0.1:22.
 *
 * WHILE AN ELECTRON RUNS, a sampler reads `ps -Ao pid,ppid,args` every second
 * and FAILS THE RUN, ending the app, on any /usr/bin/ssh of this run (a
 * descendant of the launch, or a command line naming this run's directory)
 * whose first two arguments are not `-F none`, and on any real Tailscale of
 * this run. After every launch `app.log` is read for the override warnings
 * (`GMUX_SSH_BIN does not name an absolute executable file`, and its
 * Tailscale twin), and every `StartedTest.sshPath` the check drew must be a
 * wrapper. Its own far reads are direct reads of the yard's files on this Mac,
 * because the far side IS this Mac; it runs no ssh of its own.
 *
 * Every arm starts with no far tmux server, and the `finally` ends the far
 * server on the harness socket under the machine's `TMUX_TMPDIR` (it
 * daemonises out of sshd's tree, so `machine.stop()` does not reach it),
 * through `refuseRealSockets`, then the yard; RUN asserts no server answers
 * there afterwards. No `-L gmux` anywhere in this file.
 *
 * ## The grader is pure and proved before it is trusted
 *
 * `--grader-self-test` grades the recorded fixtures in build/p340/fixtures/
 * (an honest HEAD record and an honest parent record, HAND-WRITTEN to the shape
 * an honest run records, because no builder launches Electron) and, for EVERY
 * clause, the honest reading broken on that clause alone, which must fail on
 * that clause; and it proves the sampler's and the log reader's own rules on
 * recorded lines. The probe review (method rule 9) added its own fixtures,
 * review-head-honest.json and review-parent-honest.json, an honest pair
 * derived from the source by somebody who did not write the graders, and
 * review-hostile.json, realistic broken readings for every grader (a product
 * defect or a drifted selector each), every one of which must fail EXACTLY
 * the clauses it names. It starts nothing. `P340_KEEP=1` keeps a real run's records
 * for a verifier, who may replace the fixtures with them.
 *
 * Knobs: `P340_PARENT_CHECKOUT` (a built checkout of ae38b831), `P340_ARMS`
 * (a comma list of arm ids), `P340_KEEP=1`, `P340_OUT_DIR`. Exit 0 when every
 * arm passed, 1 when one failed, 2 when it could not run or an arm could not
 * be READ, which is never a pass; an arm that was read and failed answers 1
 * even when another could not be read, and the last line prints both counts.
 * Cost: not yet measured; the verifier records it.
 *
 *   npm run -s probe:p340
 *   node build/p340/probe-p340.mjs --grader-self-test
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { createServer } from 'node:net';
import { userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The one module of this repository imported statically: build/electron-run.mjs
// defines constants and functions at load and reads no environment until a
// launch, and gate:electron counts a probe as a helper user by this static
// import. Every other module of this repository is loaded inside run(), after
// the sanitising below.
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';

// ===========================================================================
// 0. THE SANITISING. First, before any module of this repository runs code.
// ===========================================================================

const SELF_TEST = process.argv.includes('--grader-self-test');
/** His real home, from the account record, used ONLY to stat two history files. */
const REAL_HOME = userInfo().homedir;
const HARNESS_DIR = (process.env['GMUX_HARNESS_DIR'] ?? '').trim();
const SCRATCH_HOME = HARNESS_DIR === '' ? '/var/empty' : join(HARNESS_DIR, 'p340', 'home');
process.env['HOME'] = SCRATCH_HOME;
process.env['ZDOTDIR'] = SCRATCH_HOME;
process.env['HISTFILE'] = '/dev/null';
delete process.env['SSH_AUTH_SOCK'];
delete process.env['TERM_SESSION_ID'];
process.env['SCRATCH_MACHINE_NO_OWN_KEYS'] = '1';
if (process.env['SSH_AUTH_SOCK'] !== undefined) {
  process.stderr.write('[p340] REFUSED. SSH_AUTH_SOCK is still set after the sanitising, so the yard would ask his agent for his keys.\n');
  process.exit(2);
}

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const FIXTURES = join(dirname(HERE), 'fixtures');
const J = JSON.stringify;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ===========================================================================
// 1. THE PURE RULES the run and the self-test share. Nothing here starts a
//    process.
// ===========================================================================

/** The machine every HEAD arm adds, by the name the tailnet fixture gives it. */
export const LOOP = 'p340-loop';
export const LOOP2 = 'p340-loop2';
/** D20's five rows and the separator, in order. */
export const D20_MENU = ['Prepare this machine', 'Test the connection', 'What Tortie runs there…', null, 'Stop trusting this machine', 'Remove…'];
/**
 * D20's rows enabled on a CHANGED row (not confirmed, nothing in flight):
 * Prepare, Test and Stop trusting are enabled only when confirmed, What Tortie
 * runs there… always, Remove… whenever nothing is in flight. The separator is
 * null.
 */
export const D20_CHANGED_ENABLED = [false, false, true, null, false, true];
/** The override warnings `resolveSsh` and `resolveTailscale` log when the override is not a file (carriage.ts, tailscale.ts). */
export const OVERRIDE_WARNINGS = ['GMUX_SSH_BIN does not name an absolute executable file', 'GMUX_TAILSCALE_BIN does not name an absolute executable file'];
/** The hover a login-shell find wears (machines-copy.ts FOUND_SOURCE_HOVER.login). */
export const LOGIN_HOVER = 'Found by its login shell.';

/** Words a person reads: whitespace-separated tokens holding a letter or a digit. */
export function wordCount(text) {
  return String(text ?? '')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** How many times the override warnings appear in a log text. */
export function overrideWarningsIn(text) {
  return OVERRIDE_WARNINGS.reduce((n, w) => n + (String(text ?? '').split(w).length - 1), 0);
}

/**
 * One `ps -Ao pid=,ppid=,args=` table, parsed: `[{ pid, ppid, args }]`.
 */
export function parsePs(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (m !== null) out.push({ pid: Number(m[1]), ppid: Number(m[2]), args: m[3] });
  }
  return out;
}

/** Every pid descended from `root` in a parsed table, `root` excluded. */
export function descendantsIn(rows, root) {
  const kids = new Map();
  for (const r of rows) kids.set(r.ppid, [...(kids.get(r.ppid) ?? []), r.pid]);
  const out = new Set();
  const stack = [root];
  while (stack.length > 0) {
    for (const k of kids.get(stack.pop()) ?? []) {
      if (!out.has(k)) {
        out.add(k);
        stack.push(k);
      }
    }
  }
  return out;
}

/**
 * The sampler's rule for ONE table (D26 as revised): every ssh client OF THIS
 * RUN, being a descendant of the launch or a command line naming the run's
 * directory, must be /usr/bin/ssh with `-F none` as its first two arguments,
 * which is what the wrappers exec; and no real Tailscale may be of this run.
 * Answers the violating lines, each with a reason; empty when the table is
 * clean. A process of somebody else's is not looked at.
 */
export function samplerViolations(rows, { launchPid, runDir }) {
  const mine = descendantsIn(rows, launchPid);
  const out = [];
  for (const r of rows) {
    const ours = mine.has(r.pid) || (typeof runDir === 'string' && runDir !== '' && r.args.includes(runDir));
    if (!ours) continue;
    const argv0 = r.args.split(/\s+/)[0] ?? '';
    if (argv0 === '/usr/bin/ssh' || argv0 === 'ssh') {
      if (!r.args.startsWith('/usr/bin/ssh -F none ')) out.push({ pid: r.pid, args: r.args.slice(0, 200), why: 'an ssh of this run without -F none first, which is the product falling back to the real client' });
    }
    if (/(?:^|\/)Tailscale\.app\/|^\/(?:usr\/local|opt\/homebrew)\/bin\/tailscaled?(?:\s|$)|^tailscaled?(?:\s|$)/.test(r.args)) {
      out.push({ pid: r.pid, args: r.args.slice(0, 200), why: 'a real Tailscale of this run' });
    }
  }
  return out;
}

/** The `SHA256:…` token in a line, or null. */
export function fingerprintIn(text) {
  const m = /SHA256:[A-Za-z0-9+/=]+/.exec(String(text ?? ''));
  return m === null ? null : m[0];
}

/** How many times a command line names `IdentityFile="<key>"` for exactly this key. */
export function identityNamed(commandLine, keyPath) {
  if (typeof commandLine !== 'string' || typeof keyPath !== 'string' || keyPath === '') return 0;
  return commandLine.split(`IdentityFile="${keyPath}"`).length - 1;
}

/** The menu's rows as labels, a separator as null. */
export function menuShape(items) {
  return (Array.isArray(items) ? items : []).map((i) => (i?.type === 'separator' ? null : (i?.label ?? '?')));
}

/** The menu's rows as enabled flags (an absent flag reads enabled, as the native menu reads it), a separator as null. */
export function menuEnabled(items) {
  return (Array.isArray(items) ? items : []).map((i) => (i?.type === 'separator' ? null : i?.enabled !== false));
}

/**
 * A9's last step (the ruled round, from the reverify): press Prepare this
 * machine only when the product DREW it after Confirm. The reverify's build drew
 * Open a folder on it… there, the press found no Prepare button, threw, and the
 * whole arm read UNREADABLE when the product had answered and was wrong. A
 * product that draws another next step, or none, is recorded as it is, and the
 * clause that asks for Prepare reads FAIL. `press` and `ready` are the run's own;
 * a press that throws for a button that IS drawn still makes the arm unreadable.
 */
export async function prepareAfterConfirm(nextAfterConfirm, press, ready) {
  if (nextAfterConfirm !== 'prepare') return { preparePressed: false, readyAfterPrepare: null };
  await press();
  return { preparePressed: true, readyAfterPrepare: await ready() };
}

// ===========================================================================
// 2. THE GRADERS. Pure functions of a recorded reading. A reading for an arm
//    is the HEAD record's with the parent's for the same arm as `parent`, and
//    `wantParent` saying whether a parent was asked for.
// ===========================================================================

const same = (a, b) => J(a) === J(b);
const withParent = (r, test) => (r.wantParent ? r.parent !== null && r.parent !== undefined && test(r.parent) : true);
const isText = (v) => typeof v === 'string' && v !== '';

export const GRADERS = {
  A1: {
    title: 'the path: Add a machine to Ready',
    clauses: [
      ['HEAD reached Ready', (r) => r.ready === true],
      ['in 4 presses or fewer and no typed field', (r) => Number.isInteger(r.presses) && r.presses <= 4 && r.typed === 0],
      ['Advanced was never opened', (r) => r.advancedOpened === false],
      ['the check ran through the wrapper', (r) => isText(r.wrapper) && r.sshPath === r.wrapper && typeof r.commandLine === 'string' && r.commandLine.startsWith(r.wrapper)],
      ["HEAD's words at Add rest are fewer than the parent's", (r) => withParent(r, (p) => Number.isInteger(r.wordsAtRest) && Number.isInteger(p.wordsAtRest) && r.wordsAtRest < p.wordsAtRest)],
      ["the parent's presses and typed fields were counted", (r) => withParent(r, (p) => p.ready === true && Number.isInteger(p.presses) && Number.isInteger(p.typed))]
    ]
  },
  A2: {
    title: "the login route: a folder only on that machine's login PATH",
    clauses: [
      ["HEAD found the login folder's program, by its login shell", (r) => r.cls === 'ok' && isText(r.want) && r.found === `Found ${r.want}` && r.foundTitle === LOGIN_HOVER],
      ['the parent answered no-program', (r) => withParent(r, (p) => p.cls === 'no-program')]
    ]
  },
  A3: {
    title: 'none found at a typed path',
    clauses: [
      ['it said nothing that runs is at the path', (r) => r.cls === 'no-program' && isText(r.path) && typeof r.failedTitle === 'string' && r.failedTitle.includes(`Nothing that runs is at ${r.path}`)],
      ['no Add was drawn', (r) => r.addDrawn === false]
    ]
  },
  A4: {
    title: 'planted earlier: a stand-in first on the login PATH',
    clauses: [
      ['HEAD asked which, naming both, the plant first', (r) => r.cls === 'program-choice' && Array.isArray(r.want) && same(r.candidates, r.want)],
      ["the plant's log was empty through the choice", (r) => r.logAfterChoice === 0],
      ['pressing the real one reached Ready', (r) => r.ready === true],
      ["the plant's log was empty to the end", (r) => r.logAtEnd === 0],
      ['the parent answered no-program', (r) => withParent(r, (p) => p.cls === 'no-program')]
    ]
  },
  A5: {
    title: 'noise from login files',
    clauses: [
      ['a: a banner changed nothing, Found names the real path', (r) => r.a?.cls === 'ok' && isText(r.a?.want) && r.a?.found === `Found ${r.a.want}`],
      ['b: a whole fake block printed BEFORE is unknown, with no Add', (r) => r.b?.cls === 'unknown' && r.b?.addDrawn === false],
      ['c: a whole fake block printed AFTER by an EXIT trap is unknown, with no Add', (r) => r.c?.cls === 'unknown' && r.c?.addDrawn === false],
      ['nothing was started on that machine', (r) => r.farServer === false],
      ["the parent's three readings were recorded", (r) => withParent(r, (p) => ['a', 'b', 'c'].every((k) => typeof p[k]?.cls === 'string'))]
    ]
  },
  A6: {
    title: 'host keys: first seen, Stop, Trust, and changed',
    clauses: [
      ["the ask's fingerprint is the yard's host key", (r) => isText(r.fingerprint) && r.fingerprint === r.wantFingerprint],
      ["Stop left Tortie's record file as it was", (r) => r.recordAfterStop === r.recordBefore],
      ['Trust added one entry', (r) => Number.isInteger(r.entriesBefore) && r.entriesAfterTrust === r.entriesBefore + 1],
      ['a changed key raised the alarm, with no Trust and no Add', (r) => r.changed?.cls === 'host-key-changed' && r.changed?.alarm === 'yes' && r.changed?.trustDrawn === false && r.changed?.addDrawn === false],
      ["the app's second record file stayed absent", (r) => r.userRecordBefore === false && r.userRecordAfter === false]
    ]
  },
  A7: {
    title: 'a refused key install',
    clauses: [
      ['the check answered auth-refused and the key step was drawn', (r) => r.cls === 'auth-refused' && r.keyStep === true],
      ['the install answered refused', (r) => ['refused', 'auth-refused', 'password-required'].includes(r.installClass)],
      // Scanned while the app ran AND after it quit (probe review).
      ['the dummy password is in no file', (r) => Number.isInteger(r.filesScanned) && r.filesScanned > 0 && Array.isArray(r.dummyHits) && r.dummyHits.length === 0 && Number.isInteger(r.filesScannedAfterQuit) && r.filesScannedAfterQuit > 0 && Array.isArray(r.dummyHitsAfterQuit) && r.dummyHitsAfterQuit.length === 0],
      ["the yard's authorized file did not move", (r) => isText(r.authorizedBefore) && r.authorizedBefore === r.authorizedAfter],
      ['the key pair was made', (r) => r.keyMade === true]
    ]
  },
  A7b: {
    title: "Tortie's key signs in",
    clauses: [
      ["HEAD signed in with Tortie's key, named once and quoted", (r) => r.cls === 'ok' && r.identityNamed === 1],
      ['the parent asked again', (r) => withParent(r, (p) => ['auth-refused', 'password-required'].includes(p.cls))],
      ['the authorized file was restored by sha256', (r) => r.restored === true]
    ]
  },
  A8: {
    title: 'an untested version, accepted on the Add press',
    clauses: [
      ['the Add button carried Accepts version 3.9z', (r) => r.accepts === '3.9z'],
      ['one Add press', (r) => r.addPresses === 1],
      ['the row accepts 3.9z and its confirmed lines say so', (r) => r.rowAccepted === '3.9z' && r.linesHoldAccepts === true],
      // A run of the stand-in logged AFTER the Add press: the check's own -V
      // is already in the log before it (probe review).
      ['Prepare ran the stand-in and answered prepared', (r) => Number.isInteger(r.standinBeforeAdd) && Number.isInteger(r.standinRan) && r.standinRan > r.standinBeforeAdd && r.prepared === true],
      ["the parent's presses to the same state were counted", (r) => withParent(r, (p) => Number.isInteger(p.presses))]
    ]
  },
  A9: {
    title: 'a changed machine: Review…, Confirm, then Prepare',
    clauses: [
      ['the chip read Changed with Review… and both lists', (r) => r.chip === 'changed' && r.next === 'review' && r.bothLists === true],
      ['the review panel opened by itself', (r) => r.panelOpenedItself === true],
      // No server before the press, none in any sample of the window after it,
      // and a chip that was READ and is not Ready (probe review).
      ['Confirm started nothing and left Prepare as the next step', (r) => r.farServerBeforeConfirm === false && r.farServerAfterConfirm === false && isText(r.chipAfterConfirm) && r.chipAfterConfirm !== 'ready' && r.nextAfterConfirm === 'prepare'],
      ['Prepare this machine reached Ready', (r) => r.readyAfterPrepare === true],
      // §10 A12 "the menu's rows per state equal D20": this is the changed
      // state, where D20 enables What Tortie runs there… and Remove… only.
      ["a changed row's menu is D20's, with only What and Remove enabled", (r) => same(r.menuChanged, D20_MENU) && same(r.menuChangedEnabled, D20_CHANGED_ENABLED)]
    ]
  },
  A10: {
    title: 'an agent writes a row between the check and the press',
    clauses: [
      ['main listed the planted row before the press', (r) => r.listedBeforePress === true],
      ['the Add press refused with its sentence', (r) => typeof r.error === 'string' && r.error.includes('already a machine called')],
      // The planted row is still there by its id and was not confirmed: a
      // missing row reads null, and null is not "not confirmed" (probe review).
      ['no row was added and nothing was confirmed', (r) => r.rowsAfter === 1 && isText(r.plantedState) && r.plantedState !== 'confirmed'],
      ['nothing was prepared', (r) => r.farServer === false]
    ]
  },
  A11: {
    title: 'a machine confirmed at the parent, relaunched at HEAD',
    clauses: [
      ['the row is confirmed at HEAD', (r) => r.state === 'confirmed'],
      ["its hash is the parent's, byte for byte", (r) => isText(r.parentHash) && r.hash === r.parentHash],
      ['the chip read Ready after the launch sign-in', (r) => r.chip === 'ready']
    ]
  },
  A12: {
    title: 'the row at rest, and its native menu',
    clauses: [
      ['HEAD at rest is 16 words or fewer', (r) => Number.isInteger(r.wordsAtRest) && r.wordsAtRest <= 16],
      ["no more words than the parent's shut row", (r) => withParent(r, (p) => Number.isInteger(p.wordsShut) && r.wordsAtRest <= p.wordsShut)],
      ["a confirmed row's menu is D20's, every row enabled", (r) => same(r.menu, D20_MENU) && r.menuAllEnabled === true],
      ['no DOM menu was drawn', (r) => r.domMenus === 0]
    ]
  },
  A13: {
    title: 'Open a folder on it…',
    clauses: [
      ["the main window's sheet opened with p340-loop chosen", (r) => r.open === true && r.chosen === LOOP],
      ['Escape closed it', (r) => r.closedByEscape === true]
    ]
  },
  A14: {
    title: 'a machine that stops answering',
    clauses: [
      ['the link read quiet', (r) => r.linkQuiet === true],
      // Every sample a chip that was READ: a selector that matched nothing
      // answers null, and null is not "not Ready" (probe review).
      ['the chip never read Ready once quiet', (r) => Array.isArray(r.chipsWhileQuiet) && r.chipsWhileQuiet.length > 0 && r.chipsWhileQuiet.every((c) => isText(c) && c !== 'ready')],
      // §10 A14's "Passes when": it reads Offline (D11 as revised: link quiet).
      ['the chip read Offline while quiet', (r) => Array.isArray(r.chipsWhileQuiet) && r.chipsWhileQuiet.includes('offline')],
      ['ready stayed true on the row view', (r) => r.readyWhileQuiet === true],
      ["the yard's sshd was started again", (r) => r.restarted === true]
    ]
  },
  A15: {
    title: 'two picks in a row',
    clauses: [
      ['the second check was named p340-loop2', (r) => typeof r.runningText === 'string' && r.runningText.includes(LOOP2)],
      ['the Add button named p340-loop2', (r) => r.addLabel === `Add ${LOOP2}`],
      ['the draft id was p340-loop2', (r) => same(r.addedIds, [LOOP2])]
    ]
  },
  RUN: {
    title: 'the run left nothing and touched nothing of his',
    clauses: [
      ['the parent ran every arm it was asked for', (r) => !r.wantParent || (Array.isArray(r.parentArms) && r.parentWanted.every((id) => r.parentArms.includes(id)))],
      ['every launch passed its preflight', (r) => Array.isArray(r.preflights) && r.preflights.length > 0 && r.preflights.every((p) => p === true)],
      ['the sampler saw no ssh without -F none and no real Tailscale', (r) => Number.isInteger(r.samples) && r.samples > 0 && r.violations === 0],
      ['app.log held no override warning', (r) => Number.isInteger(r.logsRead) && r.logsRead > 0 && r.overrideWarnings === 0],
      ['every check ran through a wrapper', (r) => Array.isArray(r.sshPaths) && r.sshPaths.length > 0 && Array.isArray(r.wrappers) && r.sshPaths.every((p) => r.wrappers.includes(p))],
      // build/p340/tailscale-peers.mjs logs every call; its header promises the
      // probe fails on anything but the one read (probe review: nothing read it).
      ['the Tailscale stand-in was asked for status --json and nothing else', (r) => Number.isInteger(r.tailscaleAnswered) && r.tailscaleAnswered > 0 && r.tailscaleRefused === 0 && r.tailscaleOther === 0],
      ["no tmux server answers on the harness socket under the machine's TMUX_TMPDIR", (r) => r.farServerLeft === false],
      ['nothing of this run was left running', (r) => r.leftProcesses === 0],
      ['his history stats did not move', (r) => isText(r.historyBefore) && r.historyBefore === r.historyAfter]
    ]
  }
};

/** Grade one arm's reading: `{ ok, failed }`. */
export function grade(id, reading) {
  const failed = [];
  for (const [name, test] of GRADERS[id].clauses) {
    let ok = false;
    try {
      ok = test(reading) === true;
    } catch {
      ok = false;
    }
    if (!ok) failed.push(name);
  }
  return { ok: failed.length === 0, failed };
}

/** The arms a parent is asked for (§10's "Both builds?" column, plus A7 to make A7b's key). */
export const PARENT_ARMS = ['A1', 'A2', 'A4', 'A5', 'A6', 'A7b', 'A8', 'A12'];

/** One arm's reading out of a HEAD record and a parent record. */
export function readingOf(id, head, parent) {
  if (id === 'RUN') {
    return { ...(head.run ?? {}), wantParent: parent !== null, parentArms: parent === null ? [] : Object.keys(parent.arms ?? {}), parentWanted: head.run?.parentWanted ?? [] };
  }
  const wantParent = parent !== null && (head.run?.parentWanted ?? []).includes(id);
  return { ...(head.arms?.[id] ?? {}), parent: parent === null ? null : (parent.arms?.[id] ?? null), wantParent };
}

/** Every clause broken alone, on a copy of the honest reading. */
const BREAKS = {
  A1: {
    'HEAD reached Ready': (r) => { r.ready = false; },
    'in 4 presses or fewer and no typed field': (r) => { r.typed = 1; },
    'Advanced was never opened': (r) => { r.advancedOpened = true; },
    'the check ran through the wrapper': (r) => { r.sshPath = '/usr/bin/ssh'; },
    "HEAD's words at Add rest are fewer than the parent's": (r) => { r.wordsAtRest = r.parent.wordsAtRest; },
    "the parent's presses and typed fields were counted": (r) => { r.parent.presses = null; }
  },
  A2: {
    "HEAD found the login folder's program, by its login shell": (r) => { r.foundTitle = 'Found in a usual install folder.'; },
    'the parent answered no-program': (r) => { r.parent.cls = 'ok'; }
  },
  A3: {
    'it said nothing that runs is at the path': (r) => { r.cls = 'ok'; },
    'no Add was drawn': (r) => { r.addDrawn = true; }
  },
  A4: {
    'HEAD asked which, naming both, the plant first': (r) => { r.candidates = [...r.candidates].reverse(); },
    "the plant's log was empty through the choice": (r) => { r.logAfterChoice = 1; },
    'pressing the real one reached Ready': (r) => { r.ready = false; },
    "the plant's log was empty to the end": (r) => { r.logAtEnd = 1; },
    'the parent answered no-program': (r) => { r.parent.cls = 'program-choice'; }
  },
  A5: {
    'a: a banner changed nothing, Found names the real path': (r) => { r.a.cls = 'unknown'; },
    'b: a whole fake block printed BEFORE is unknown, with no Add': (r) => { r.b.cls = 'ok'; r.b.addDrawn = true; },
    'c: a whole fake block printed AFTER by an EXIT trap is unknown, with no Add': (r) => { r.c.addDrawn = true; },
    'nothing was started on that machine': (r) => { r.farServer = true; },
    "the parent's three readings were recorded": (r) => { delete r.parent.c; }
  },
  A6: {
    "the ask's fingerprint is the yard's host key": (r) => { r.fingerprint = 'SHA256:somethingElse'; },
    "Stop left Tortie's record file as it was": (r) => { r.recordAfterStop = 'f'.repeat(64); },
    'Trust added one entry': (r) => { r.entriesAfterTrust = r.entriesBefore + 2; },
    'a changed key raised the alarm, with no Trust and no Add': (r) => { r.changed.trustDrawn = true; },
    "the app's second record file stayed absent": (r) => { r.userRecordAfter = true; }
  },
  A7: {
    'the check answered auth-refused and the key step was drawn': (r) => { r.keyStep = false; },
    'the install answered refused': (r) => { r.installClass = 'key-installed'; },
    'the dummy password is in no file': (r) => { r.dummyHits = ['logs/app.log']; },
    "the yard's authorized file did not move": (r) => { r.authorizedAfter = '0'.repeat(64); },
    'the key pair was made': (r) => { r.keyMade = false; }
  },
  A7b: {
    "HEAD signed in with Tortie's key, named once and quoted": (r) => { r.identityNamed = 0; r.cls = 'auth-refused'; },
    'the parent asked again': (r) => { r.parent.cls = 'ok'; },
    'the authorized file was restored by sha256': (r) => { r.restored = false; }
  },
  A8: {
    'the Add button carried Accepts version 3.9z': (r) => { r.accepts = null; },
    'one Add press': (r) => { r.addPresses = 2; },
    'the row accepts 3.9z and its confirmed lines say so': (r) => { r.linesHoldAccepts = false; },
    'Prepare ran the stand-in and answered prepared': (r) => { r.prepared = false; },
    "the parent's presses to the same state were counted": (r) => { r.parent.presses = undefined; }
  },
  A9: {
    'the chip read Changed with Review… and both lists': (r) => { r.bothLists = false; },
    'the review panel opened by itself': (r) => { r.panelOpenedItself = false; },
    'Confirm started nothing and left Prepare as the next step': (r) => { r.farServerAfterConfirm = true; },
    'Prepare this machine reached Ready': (r) => { r.readyAfterPrepare = false; },
    "a changed row's menu is D20's, with only What and Remove enabled": (r) => { r.menuChangedEnabled = [true, true, true, null, true, true]; }
  },
  A10: {
    'main listed the planted row before the press': (r) => { r.listedBeforePress = false; },
    'the Add press refused with its sentence': (r) => { r.error = null; },
    'no row was added and nothing was confirmed': (r) => { r.rowsAfter = 2; },
    'nothing was prepared': (r) => { r.farServer = true; }
  },
  A11: {
    'the row is confirmed at HEAD': (r) => { r.state = 'changed'; },
    "its hash is the parent's, byte for byte": (r) => { r.hash = 'e'.repeat(64); },
    'the chip read Ready after the launch sign-in': (r) => { r.chip = 'not-ready'; }
  },
  A12: {
    'HEAD at rest is 16 words or fewer': (r) => { r.wordsAtRest = 17; },
    "no more words than the parent's shut row": (r) => { r.parent.wordsShut = r.wordsAtRest - 1; },
    "a confirmed row's menu is D20's, every row enabled": (r) => { r.menu = r.menu.slice(1); },
    'no DOM menu was drawn': (r) => { r.domMenus = 1; }
  },
  A13: {
    "the main window's sheet opened with p340-loop chosen": (r) => { r.chosen = 'another'; },
    'Escape closed it': (r) => { r.closedByEscape = false; }
  },
  A14: {
    'the link read quiet': (r) => { r.linkQuiet = false; },
    'the chip never read Ready once quiet': (r) => { r.chipsWhileQuiet = [...r.chipsWhileQuiet, 'ready']; },
    'the chip read Offline while quiet': (r) => { r.chipsWhileQuiet = r.chipsWhileQuiet.map(() => 'connecting'); },
    'ready stayed true on the row view': (r) => { r.readyWhileQuiet = false; },
    "the yard's sshd was started again": (r) => { r.restarted = false; }
  },
  A15: {
    'the second check was named p340-loop2': (r) => { r.runningText = `Checking ${LOOP}…`; },
    'the Add button named p340-loop2': (r) => { r.addLabel = `Add ${LOOP}`; },
    'the draft id was p340-loop2': (r) => { r.addedIds = [LOOP]; }
  },
  RUN: {
    'the parent ran every arm it was asked for': (r) => { r.parentArms = r.parentArms.filter((id) => id !== 'A6'); },
    'every launch passed its preflight': (r) => { r.preflights = [...r.preflights, false]; },
    'the sampler saw no ssh without -F none and no real Tailscale': (r) => { r.violations = 1; },
    'app.log held no override warning': (r) => { r.overrideWarnings = 1; },
    'every check ran through a wrapper': (r) => { r.sshPaths = [...r.sshPaths, '/usr/bin/ssh']; },
    'the Tailscale stand-in was asked for status --json and nothing else': (r) => { r.tailscaleAnswered = 0; },
    "no tmux server answers on the harness socket under the machine's TMUX_TMPDIR": (r) => { r.farServerLeft = true; },
    'nothing of this run was left running': (r) => { r.leftProcesses = 1; },
    'his history stats did not move': (r) => { r.historyAfter = '733354 1791256766|23166 1790702242'; }
  }
};

/** Realistic wrong readings, each refused by the clause named. */
const REFUSED_EDITS = {
  A1: [
    { what: 'a sampler-blind run whose check named /usr/bin/ssh', clause: 'the check ran through the wrapper', edit: (r) => { r.commandLine = `/usr/bin/ssh ${r.commandLine}`; r.sshPath = '/usr/bin/ssh'; } },
    { what: 'Ready reached with a typed path', clause: 'in 4 presses or fewer and no typed field', edit: (r) => { r.presses = 6; r.typed = 1; } }
  ],
  A5: [{ what: "the parent's defect at HEAD (the sheet naming /evil/tmux)", clause: 'b: a whole fake block printed BEFORE is unknown, with no Add', edit: (r) => { r.b = { cls: 'ok', addDrawn: true, found: 'Found /evil/tmux' }; } }],
  A10: [
    { what: 'the press writing over the planted row', clause: 'the Add press refused with its sentence', edit: (r) => { r.error = null; r.plantedState = 'confirmed'; } },
    { what: 'the planted row gone and one other row in its place (probe review)', clause: 'no row was added and nothing was confirmed', edit: (r) => { r.plantedState = null; } }
  ],
  A14: [
    { what: 'the draft table drawing Ready on a sleeping machine (§Attack R1)', clause: 'the chip never read Ready once quiet', edit: (r) => { r.chipsWhileQuiet = ['ready']; } },
    { what: 'a chip selector that matched nothing, read as six nulls (probe review)', clause: 'the chip never read Ready once quiet', edit: (r) => { r.chipsWhileQuiet = r.chipsWhileQuiet.map(() => null); } }
  ],
  A7: [
    { what: 'the dummy written to app.log only at quit (probe review)', clause: 'the dummy password is in no file', edit: (r) => { r.dummyHitsAfterQuit = ['/head-key/profile/logs/app.log']; } },
    { what: 'no scan after quit, as when the launch stopped early (probe review)', clause: 'the dummy password is in no file', edit: (r) => { delete r.dummyHitsAfterQuit; delete r.filesScannedAfterQuit; } }
  ],
  A8: [{ what: "Prepare running some other program, so the log holds only the check's own -V (probe review)", clause: 'Prepare ran the stand-in and answered prepared', edit: (r) => { r.standinRan = r.standinBeforeAdd; } }],
  A9: [
    { what: 'a chip selector that matched nothing after Confirm (probe review)', clause: 'Confirm started nothing and left Prepare as the next step', edit: (r) => { r.chipAfterConfirm = null; } },
    { what: 'a server that was already up when Confirm was pressed (probe review)', clause: 'Confirm started nothing and left Prepare as the next step', edit: (r) => { r.farServerBeforeConfirm = true; } },
    // THE RULED ROUND: what the reverify's build drew, recorded as
    // prepareAfterConfirm records it, so it reads FAIL and never UNREADABLE.
    { what: 'Ready with Open a folder on it… drawn after Confirm, so Prepare was never pressed (the reverify)', clause: 'Confirm started nothing and left Prepare as the next step', edit: (r) => { r.chipAfterConfirm = 'ready'; r.nextAfterConfirm = 'open-folder'; r.preparePressed = false; r.readyAfterPrepare = null; } },
    { what: 'Ready with Open a folder on it… drawn after Confirm, so Prepare was never pressed (the reverify)', clause: 'Prepare this machine reached Ready', edit: (r) => { r.chipAfterConfirm = 'ready'; r.nextAfterConfirm = 'open-folder'; r.preparePressed = false; r.readyAfterPrepare = null; } },
    { what: 'a Confirm the product did not take: still Changed, Review… drawn (the ruled round)', clause: 'Confirm started nothing and left Prepare as the next step', edit: (r) => { r.chipMovedAfterConfirm = false; r.chipAfterConfirm = 'changed'; r.nextAfterConfirm = 'review'; r.preparePressed = false; r.readyAfterPrepare = null; } }
  ],
  RUN: [{ what: 'the app asking the Tailscale stand-in for something other than status --json (probe review)', clause: 'the Tailscale stand-in was asked for status --json and nothing else', edit: (r) => { r.tailscaleRefused = 1; } }]
};

function fixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
}

/** The grader self-test: fixtures, every clause broken alone, and the pure rules. Starts nothing. */
export async function graderSelfTest(write = (line) => process.stdout.write(`${line}\n`)) {
  const { gradeFixtures } = await import('../probe-graders.mjs');
  let head;
  let parent;
  try {
    head = fixture('head-record.json');
    parent = fixture('parent-record.json');
  } catch (err) {
    write(`[p340] grader self-test FAIL: the fixtures did not load: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
  let bad = 0;
  let checks = 0;
  const say = (ok, text) => {
    checks += 1;
    if (!ok) bad += 1;
    write(`[p340] ${ok ? 'ok  ' : 'BAD '} ${text}`);
  };
  const fixtures = Object.fromEntries(Object.keys(GRADERS).map((id) => [id, { pass: readingOf(id, head, parent), breaks: BREAKS[id] ?? {}, refused: REFUSED_EDITS[id] ?? [] }]));
  const clauses = gradeFixtures({ graders: GRADERS, fixtures, grade, clone: (v) => JSON.parse(J(v)), say, J });

  // The whole records: every arm of the honest pair passes; with no parent,
  // every arm still passes (the parent clauses are not asked); a parent
  // record missing an arm it was asked for fails RUN.
  for (const id of Object.keys(GRADERS)) {
    if (id !== 'RUN' && head.arms?.[id] === undefined) say(false, `head-record.json records no ${id}`);
  }
  for (const id of PARENT_ARMS) {
    if (parent.arms?.[id] === undefined) say(false, `parent-record.json records no ${id}, which the parent is asked for`);
  }
  {
    const noParent = Object.keys(GRADERS).filter((id) => id !== 'A11').every((id) => grade(id, readingOf(id, head, null)).ok);
    say(noParent, 'with no parent asked for, every arm but A11 passes on its HEAD half');
    const short = JSON.parse(J(parent));
    delete short.arms.A6;
    const missing = grade('RUN', readingOf('RUN', head, short));
    say(!missing.ok && missing.failed.includes('the parent ran every arm it was asked for'), 'a parent record missing an arm it was asked for fails RUN');
  }

  // THE PROBE REVIEW'S OWN FIXTURES (rule 9): an honest pair written by the
  // reviewer from the source, independently of the two above, and realistic
  // broken readings for every grader, each failing EXACTLY the clauses it names.
  {
    let rHead;
    let rParent;
    let hostile;
    try {
      rHead = fixture('review-head-honest.json');
      rParent = fixture('review-parent-honest.json');
      hostile = fixture('review-hostile.json');
    } catch (err) {
      say(false, `the review fixtures did not load: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (rHead !== undefined && rParent !== undefined && hostile !== undefined) {
      for (const id of Object.keys(GRADERS)) {
        const g = grade(id, readingOf(id, rHead, rParent));
        say(g.ok, `review honest ${id} passes${g.ok ? '' : `, failing ${J(g.failed)}`}`);
      }
      const covered = new Set();
      for (const v of hostile.variants ?? []) {
        if (GRADERS[v.arm] === undefined) {
          say(false, `review-hostile.json names ${String(v.arm)}, which is no arm`);
          continue;
        }
        const unknown = (v.mustFail ?? []).filter((c) => !GRADERS[v.arm].clauses.some(([name]) => name === c));
        if (unknown.length > 0) {
          say(false, `review hostile ${v.arm} (${v.what}) names ${J(unknown)}, which no clause of its grader is`);
          continue;
        }
        const r = JSON.parse(J(readingOf(v.arm, rHead, rParent)));
        Object.assign(r, v.set ?? {});
        if (v.parentSet !== undefined && r.parent !== null && r.parent !== undefined) Object.assign(r.parent, v.parentSet);
        const g = grade(v.arm, r);
        const want = J([...(v.mustFail ?? [])].sort());
        const got = J([...g.failed].sort());
        say(!g.ok && want === got, `review hostile ${v.arm} (${v.what}) fails exactly ${want}${want === got ? '' : `, but it failed ${got}`}`);
        covered.add(v.arm);
      }
      for (const id of Object.keys(GRADERS)) {
        if (!covered.has(id)) say(false, `review-hostile.json holds no broken reading for ${id}`);
      }
    }
  }

  // The sampler's own rule, on recorded tables.
  {
    const RUN_DIR = '/private/var/folders/x/T/gmux-p340-wt-p340-123/p340';
    const table = (lines) => parsePs(lines.join('\n'));
    const base = ['  100     1 /Users/x/gmux/node_modules/.bin/electron . --user-data-dir=' + RUN_DIR + '/head-main/profile', '  101   100 /Users/x/gmux/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .'];
    const wrapped = [...base, '  102   101 /usr/bin/ssh -F none -p 50123 -o IdentitiesOnly=yes -o IdentityFile=' + RUN_DIR + '/yard/p340-userkey -o BatchMode=no 127.0.0.1'];
    const fallback = [...base, '  103   101 /usr/bin/ssh -o BatchMode=no -o ConnectTimeout=10 127.0.0.1'];
    const orphan = [...base, '  104     1 /usr/bin/ssh -o ControlPath=' + RUN_DIR + '/head-main/profile/gmux/cm -N 127.0.0.1'];
    const his = [...base, '  105     1 /usr/bin/ssh macpro.local'];
    const realTs = [...base, '  106   101 /Applications/Tailscale.app/Contents/MacOS/Tailscale status --json'];
    const ourTs = [...base, '  107   101 /bin/sh ' + RUN_DIR + '/bin/tailscale status --json', '  108   107 /usr/local/bin/node /Users/x/gmux/build/p340/tailscale-peers.mjs ' + RUN_DIR + '/tailnet.json ' + RUN_DIR + '/ts.log status --json'];
    const opts = { launchPid: 100, runDir: RUN_DIR };
    say(samplerViolations(table(wrapped), opts).length === 0, 'the sampler passes the wrapper\'s ssh (-F none first)');
    say(samplerViolations(table(fallback), opts).length === 1, 'the sampler fails a descendant /usr/bin/ssh with no -F none (the fallback)');
    say(samplerViolations(table(orphan), opts).length === 1, 'the sampler fails an orphaned ssh whose command line names this run');
    say(samplerViolations(table(his), opts).length === 0, "the sampler leaves somebody else's ssh alone");
    say(samplerViolations(table(realTs), opts).length === 1, 'the sampler fails a real Tailscale of this run');
    say(samplerViolations(table(ourTs), opts).length === 0, 'the sampler passes the Tailscale stand-in');
  }
  // The log reader, the word counter and the small readers.
  say(overrideWarningsIn('x GMUX_SSH_BIN does not name an absolute executable file, so it is ignored. The value was /x.') === 1, 'an ssh override warning is counted');
  say(overrideWarningsIn('GMUX_TAILSCALE_BIN does not name an absolute executable file, so it is ignored.') === 1, 'a Tailscale override warning is counted');
  say(overrideWarningsIn('the connection test could not start /x/ssh: posix_spawnp failed.') === 0, 'a client-failed line is not an override warning');
  say(wordCount('Add a machine  Cancel\nYour tailnet · Look again') === 8, 'the word counter counts words and skips a lone dot');
  say(fingerprintIn('256 SHA256:AbC+/9= p340 (ED25519)') === 'SHA256:AbC+/9=', 'a fingerprint is read out of ssh-keygen -l');
  say(identityNamed('/x/ssh -o IdentityFile="/p/keys/machine-1" 127.0.0.1', '/p/keys/machine-1') === 1, 'an IdentityFile named once and quoted is counted once');
  say(identityNamed('/x/ssh -o IdentityFile=/p/keys/machine-1 127.0.0.1', '/p/keys/machine-1') === 0, 'an unquoted IdentityFile is not the product\'s');
  say(same(menuShape([{ label: 'A' }, { type: 'separator', label: '' }, { label: 'B' }]), ['A', null, 'B']), 'the menu shape reads a separator as null');

  // A9's last step (the ruled round): another next step after Confirm is a
  // reading, graded FAIL, and never a throw that makes the arm UNREADABLE. The
  // stand-in press throws as the run's own press does for a missing button.
  {
    const missing = () => Promise.reject(new Error('.mach-row [data-machines-next="prepare"]: missing'));
    let threw = null;
    let got = null;
    try {
      got = await prepareAfterConfirm('open-folder', missing, () => Promise.resolve(true));
    } catch (err) {
      threw = err instanceof Error ? err.message : String(err);
    }
    say(threw === null && got?.preparePressed === false && got?.readyAfterPrepare === null, `another next step after Confirm presses nothing and throws nothing${threw === null ? '' : `, but it threw ${threw}`}`);
    const reading = JSON.parse(J(readingOf('A9', head, parent)));
    Object.assign(reading, { chipAfterConfirm: 'ready', nextAfterConfirm: 'open-folder' }, got ?? {});
    const g = grade('A9', reading);
    say(!g.ok && g.failed.includes('Confirm started nothing and left Prepare as the next step'), 'that reading grades FAIL on the Prepare clause');
    let pressed = 0;
    const once = await prepareAfterConfirm('prepare', () => { pressed += 1; return Promise.resolve(); }, () => Promise.resolve(true));
    say(pressed === 1 && once.preparePressed === true && once.readyAfterPrepare === true, 'Prepare drawn after Confirm is pressed once and its Ready read');
    const none = await prepareAfterConfirm(null, missing, () => Promise.resolve(true)).catch(() => null);
    say(none?.preparePressed === false && none?.readyAfterPrepare === null, 'no next step after Confirm presses nothing and throws nothing');
  }

  write(bad === 0 ? `[p340] grader self-test PASS: ${String(clauses)} clauses, ${String(checks)} checks, nothing was started.` : `[p340] grader self-test FAIL on ${String(bad)} of ${String(checks)}`);
  return bad === 0;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (isMain && SELF_TEST) process.exit((await graderSelfTest()) ? 0 : 1);
if (isMain) await run();

// ===========================================================================
// 3. THE RUN. Everything below starts processes; builders never reach it.
// ===========================================================================

async function run() {
  const TAG = '[p340]';
  const t0 = Date.now();
  const say = (l) => console.log(`${TAG} ${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${l}`);
  const refuse = (why) => {
    console.error(`${TAG} REFUSED. ${why}`);
    process.exit(2);
  };

  // ---- the refusals, in the order they are asked -------------------------
  const SOCKET = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (SOCKET === '') refuse('no GMUX_TMUX_SOCKET. Run `npm run probe:p340`, which wraps this file in build/harness-socket.mjs.');
  if (SOCKET === 'gmux' || SOCKET === 'default' || !/^gmux-p340[a-z0-9-]*-\d+$/.test(SOCKET)) refuse(`"${SOCKET}" is not a gmux-p340 harness socket ending in its pid.`);
  if (HARNESS_DIR === '') refuse('no GMUX_HARNESS_DIR, so there is nowhere scratch to put the HOME, the yard and the profiles.');
  if (process.env['SCRATCH_MACHINE_QUIET_SHELL'] !== '1' || process.env['SCRATCH_MACHINE_SCRATCH_HOME'] !== '1') {
    refuse('SCRATCH_MACHINE_QUIET_SHELL=1 and SCRATCH_MACHINE_SCRATCH_HOME=1 are both required: without them the loopback far shell reads his rc files and its HOME is his (D26).');
  }
  const PARENT = (process.env['P340_PARENT_CHECKOUT'] ?? '').trim();
  const KEEP = process.env['P340_KEEP'] === '1';
  const ARMS = (process.env['P340_ARMS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const wants = (id) => ARMS.length === 0 || ARMS.includes(id);
  for (const checkout of [ROOT, ...(PARENT === '' ? [] : [resolve(PARENT)])]) {
    if (!existsSync(join(checkout, 'out', 'main', 'index.js'))) refuse(`${join(checkout, 'out', 'main', 'index.js')} is missing. Build that checkout first.`);
  }
  const SOURCES = ['src/main/machines/check-script.ts', 'src/main/machines/connection-test.ts', 'src/renderer/settings/AddMachine.tsx', 'src/renderer/settings/MachineRow.tsx'];
  const newer = SOURCES.filter((s) => existsSync(join(ROOT, s)) && statSync(join(ROOT, s)).mtimeMs > statSync(join(ROOT, 'out', 'main', 'index.js')).mtimeMs);
  if (newer.length > 0) refuse(`out/ is older than ${newer.join(', ')}; build first.`);
  const REAL_TMUX = ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'].find((p) => existsSync(p)) ?? null;
  if (REAL_TMUX === null) refuse('no tmux at /opt/homebrew/bin or /usr/local/bin, so the loopback machine has nothing to find.');

  // His history, size and modified time only, read from the account record's home.
  const historyStat = () =>
    ['.zsh_history', '.bash_history']
      .map((name) => {
        try {
          const s = statSync(join(REAL_HOME, name));
          return `${String(s.size)} ${String(Math.floor(s.mtimeMs / 1000))}`;
        } catch {
          return 'absent';
        }
      })
      .join('|');
  const historyBefore = historyStat();
  say(`his history (size, mtime): ${historyBefore}`);

  // ---- the modules, loaded only now -----------------------------------------
  const { cdpEval, wsConnect } = await import('../cdp-client.mjs');
  const { pickRendererTarget } = await import('../cdp-target.mjs');
  const { scratchYard, scratchMachine, refuseRealSockets } = await import('../scratch-machine.mjs');
  const { quietAgentsHeld, writeQuietAgents } = await import('../p332/dns-standin.mjs');
  const { readLog: readTailscaleLog } = await import('./tailscale-peers.mjs');
  refuseRealSockets(SOCKET, 'p340');

  // ---- the scratch world ----------------------------------------------------
  mkdirSync(join(HARNESS_DIR, 'p340'), { recursive: true, mode: 0o700 });
  const RUN_DIR = realpathSync(join(HARNESS_DIR, 'p340'));
  mkdirSync(SCRATCH_HOME, { recursive: true, mode: 0o700 });
  const BIN = join(RUN_DIR, 'bin');
  const FAR = join(RUN_DIR, 'far');
  mkdirSync(BIN, { recursive: true, mode: 0o700 });
  mkdirSync(FAR, { recursive: true, mode: 0o700 });
  if (/['"\s$`\\]/.test(RUN_DIR)) refuse(`${RUN_DIR} holds a quote, a space or a shell character, and it is written into wrappers and far rc files.`);
  const OUT = resolve(ROOT, (process.env['P340_OUT_DIR'] ?? '').trim() || join('out', 'p340'));

  const started = [];
  const record = (pid) => {
    if (Number.isInteger(pid) && pid > 0) started.push(pid);
  };
  const freePort = () =>
    new Promise((done, fail) => {
      const server = createServer();
      server.once('error', fail);
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        server.close(() => done(port));
      });
    });

  const report = { checkout: ROOT, parent: PARENT === '' ? null : resolve(PARENT), records: {}, arms: [] };
  const run = {
    parentWanted: PARENT === '' ? [] : PARENT_ARMS.filter(wants),
    preflights: [],
    samples: 0,
    violations: 0,
    violationLines: [],
    overrideWarnings: 0,
    logsRead: 0,
    sshPaths: [],
    wrappers: [],
    farServerLeft: null,
    leftProcesses: null,
    tailscaleAnswered: null,
    tailscaleRefused: null,
    tailscaleOther: null,
    historyBefore,
    historyAfter: null
  };
  let failures = 0;
  let unreadable = 0;

  let yard = null;
  let machine = null;
  /** The tmux clients that can end a far server, every one tried in the finally. */
  const tmuxClients = [...new Set([REAL_TMUX, '/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'].filter((p) => existsSync(p)))];
  const farEnv = () => ({ PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: machine?.scratchHome ?? SCRATCH_HOME, TMUX_TMPDIR: machine?.tmuxTmp ?? '/nonexistent', LC_ALL: 'C' });
  /** True when a tmux server answers on the harness socket under the machine's TMUX_TMPDIR. */
  const farServer = () => {
    if (machine === null) return false;
    return tmuxClients.some((tmux) => spawnSync(tmux, ['-L', SOCKET, 'list-sessions'], { env: farEnv(), encoding: 'utf8', timeout: 10_000 }).status === 0);
  };
  /** End the far server on the harness socket, never any other. */
  const endFarServer = () => {
    if (machine === null) return;
    refuseRealSockets(SOCKET, 'p340');
    for (const tmux of tmuxClients) spawnSync(tmux, ['-L', SOCKET, 'kill-server'], { env: farEnv(), encoding: 'utf8', timeout: 10_000 });
  };

  /** The far login files (D2's fixtures), written into the yard's own ZDOTDIR. */
  const zdot = () => join(yard.root, 'zdot');
  const setLoginFiles = ({ zshenv = null, zprofile = null } = {}) => {
    for (const [name, text] of [['.zshenv', zshenv], ['.zprofile', zprofile]]) {
      const path = join(zdot(), name);
      if (text === null) rmSync(path, { force: true });
      else writeFileSync(path, text, { mode: 0o600 });
    }
  };
  const standin = (dir, version, log, execReal = false) => {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const path = join(dir, 'tmux');
    const tail = execReal ? `exec ${REAL_TMUX} "$@"\n` : `echo "tmux ${version}"\n`;
    writeFileSync(path, `#!/bin/sh\necho "RAN $*" >> ${log}\nif [ "$1" = "-V" ]; then echo "tmux ${version}"; exit 0; fi\n${tail}`, { mode: 0o755 });
    chmodSync(path, 0o755);
    return path;
  };
  const logLines = (path) => (existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter((l) => l.trim() !== '').length : 0);

  // ---- the wrappers ---------------------------------------------------------
  const wrappers = {};
  const writeWrapper = (name, text) => {
    const path = join(BIN, name);
    writeFileSync(path, text, { mode: 0o755 });
    chmodSync(path, 0o755);
    wrappers[name] = { path, sha: sha256(readFileSync(path)) };
    return path;
  };
  const TS_SCRIPT = join(ROOT, 'build', 'p340', 'tailscale-peers.mjs');
  const TS_FIXTURE = join(ROOT, 'build', 'p340', 'fixtures', 'tailnet.json');
  const TS_LOG = join(RUN_DIR, 'tailscale.log');
  // This run's calls only: RUN grades every line in it (probe review).
  rmSync(TS_LOG, { force: true });
  const pinned = { [TS_SCRIPT]: sha256(readFileSync(TS_SCRIPT)), [TS_FIXTURE]: sha256(readFileSync(TS_FIXTURE)) };
  /** Every wrapper and stand-in byte for byte as written, before a launch. */
  const preflight = (sshWrapper) => {
    const problems = [];
    for (const w of [sshWrapper, wrappers['tailscale']]) {
      try {
        const st = statSync(w.path);
        if (!st.isFile() || (st.mode & 0o111) === 0) problems.push(`${w.path} is not an executable file`);
        if (sha256(readFileSync(w.path)) !== w.sha) problems.push(`${w.path} changed since it was written`);
      } catch {
        problems.push(`${w.path} is gone`);
      }
    }
    for (const [path, want] of Object.entries(pinned)) {
      if (!existsSync(path) || sha256(readFileSync(path)) !== want) problems.push(`${path} changed since the run began`);
    }
    return problems;
  };

  // ---- the app ----------------------------------------------------------------
  const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));
  /** One profile per launch: `<run>/<build>-<name>`. */
  const profileOf = (build, name) => join(RUN_DIR, `${build}-${name}`, 'profile');
  const appHomeOf = (build, name) => join(RUN_DIR, `${build}-${name}`, 'home');
  const appLogOf = (profile) => join(profile, 'logs', 'app.log');
  const machinesJsonOf = (profile) => join(profile, 'gmux', 'config', 'machines.json');
  const knownMachinesOf = (profile) => join(profile, 'gmux', 'machines', 'known-machines');
  const keysDirOf = (profile) => join(profile, 'gmux', 'machines', 'keys');

  const devtoolsPort = (profile) => {
    try {
      return Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
    } catch {
      return 0;
    }
  };
  const targets = async (profile) => {
    const port = devtoolsPort(profile);
    if (!(port > 0)) return [];
    try {
      return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
    } catch {
      return [];
    }
  };

  /**
   * The in-page helpers, injected as a function's own source so nothing is
   * escaped twice. Every press is one `click` on the real element.
   */
  function pageLib() {
    if (window.__p340 !== undefined) return true;
    const q = (s) => document.querySelector(s);
    const words = (t) => String(t ?? '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    window.__p340 = {
      has: (s) => q(s) !== null,
      text: (s) => {
        const el = q(s);
        return el === null ? null : (el.innerText ?? el.textContent ?? '');
      },
      raw: (s) => {
        const el = q(s);
        return el === null ? null : el.textContent;
      },
      attr: (s, a) => {
        const el = q(s);
        return el === null ? null : el.getAttribute(a);
      },
      attrs: (s, a) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(a)),
      press: (s) => {
        const el = q(s);
        if (el === null) return 'missing';
        if (el.disabled === true) return 'disabled';
        el.click();
        return 'pressed';
      },
      pressText: (s, text) => {
        const el = Array.from(document.querySelectorAll(s)).find((one) => (one.innerText ?? one.textContent ?? '').includes(text));
        if (el === undefined) return 'missing';
        if (el.disabled === true) return 'disabled';
        el.click();
        return 'pressed';
      },
      pressSummaryOf: (s) => {
        const el = q(s);
        const d = el === null ? null : el.tagName === 'DETAILS' ? el : el.closest('details');
        const summary = d === null ? null : d.querySelector('summary');
        if (summary === null) return 'missing';
        summary.click();
        return 'pressed';
      },
      isOpen: (s) => {
        const el = q(s);
        const d = el === null ? null : el.tagName === 'DETAILS' ? el : el.closest('details');
        return d !== null && d.open === true;
      },
      type: (s, value) => {
        const el = q(s);
        if (el === null) return 'missing';
        const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return 'typed';
      },
      words: (s, exclude) => {
        const el = q(s);
        if (el === null) return null;
        let n = words(el.innerText);
        if (exclude) for (const one of el.querySelectorAll(exclude)) n -= words(one.innerText);
        return n;
      },
      domMenus: () => document.querySelectorAll('[role="menu"], [role="menuitem"]').length
    };
    return true;
  }
  const PAGE_LIB = `(${pageLib.toString()})()`;

  /** One expression in a window: `{ ok, value }` or `{ ok: false, error }`. */
  const bridge = async (cdp, expr) =>
    JSON.parse(await cdpEval(cdp, `(async () => { try { const v = await (${expr}); return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`, 120_000));
  const page = async (cdp, call) => {
    await cdpEval(cdp, PAGE_LIB);
    return cdpEval(cdp, `window.__p340.${call}`);
  };

  /** The launch in progress: the sampler's verdict and its pid, for every wait to ask. */
  let current = null;
  const guard = () => {
    if (current?.abort) throw new Error(`the sampler stopped the run: ${current.abort}`);
  };
  const until = async (cdp, expr, ms, what) => {
    const deadline = Date.now() + ms;
    for (;;) {
      guard();
      let v = null;
      try {
        v = await cdpEval(cdp, expr);
      } catch {
        v = null;
      }
      if (v) return v;
      if (Date.now() > deadline) throw new Error(`timed out after ${String(ms)} ms waiting for ${what}`);
      await sleep(250);
    }
  };

  const startSampler = (launchPid) => {
    const state = { abort: null };
    const timer = setInterval(() => {
      const ps = spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,args='], { encoding: 'utf8', timeout: 5_000 });
      run.samples += 1;
      const bad = samplerViolations(parsePs(ps.stdout), { launchPid, runDir: RUN_DIR });
      if (bad.length > 0) {
        run.violations += bad.length;
        run.violationLines.push(...bad);
        state.abort = `${bad[0].why}: ${bad[0].args}`;
      }
    }, 1_000);
    return { state, stop: () => clearInterval(timer) };
  };

  /**
   * One launch: preflight, agents.json, the sampler, the main window and the
   * Settings window on Machines, then `body`, then the app.log reading.
   */
  const launch = async ({ build, name, profile = profileOf(build, name), sshWrapper = wrappers['ssh'] }, body) => {
    const checkout = build === 'parent' ? resolve(PARENT) : ROOT;
    const home = appHomeOf(build, name);
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const problems = preflight(sshWrapper);
    run.preflights.push(problems.length === 0);
    if (problems.length > 0) throw new Error(`the preflight refused the launch: ${problems.join('; ')}`);
    writeQuietAgents(profile);
    endFarServer();
    const options = {
      label: `p340-${build}-${name}`,
      userDataDir: profile,
      cwd: checkout,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        ...INHERITED_CLAUDE,
        HOME: home,
        ZDOTDIR: home,
        HISTFILE: '/dev/null',
        TERM_SESSION_ID: undefined,
        SSH_AUTH_SOCK: undefined,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_HARNESS_DIR: HARNESS_DIR,
        GMUX_SSH_BIN: sshWrapper.path,
        GMUX_TAILSCALE_BIN: wrappers['tailscale'].path
      }),
      graceMs: 8_000
    };
    say(`launch ${build} ${name}`);
    try {
      return await withElectron(options, async (handle) => {
        const sampler = startSampler(handle.pid);
        current = sampler.state;
        let main = null;
        let settings = null;
        try {
          const startedAt = Date.now();
          for (;;) {
            const picked = pickRendererTarget(await targets(profile));
            if (picked.target !== null) {
              main = await wsConnect(picked.target.webSocketDebuggerUrl);
              await main.call('Runtime.enable');
              break;
            }
            if (Date.now() - startedAt > 150_000) throw new Error(`no app window: ${picked.why}`);
            guard();
            await sleep(300);
          }
          await until(main, "typeof window.gmux === 'object' && typeof window.gmux.machines === 'object'", 120_000, 'window.gmux.machines in the main window');
          const list = JSON.parse(await cdpEval(main, 'window.gmux.agentsList().then((r) => JSON.stringify(r))'));
          const held = quietAgentsHeld(list);
          if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
          await cdpEval(main, 'window.gmux.openSettings()');
          const settingsAt = Date.now();
          for (;;) {
            const all = await targets(profile);
            const one = all.find((t) => t?.type === 'page' && /\/renderer\/settings\/index\.html(?:[?#]|$)/.test(String(t.url ?? '')) && typeof t.webSocketDebuggerUrl === 'string');
            if (one !== undefined) {
              settings = await wsConnect(one.webSocketDebuggerUrl);
              await settings.call('Runtime.enable');
              break;
            }
            if (Date.now() - settingsAt > 30_000) throw new Error('the Settings window never listed');
            guard();
            await sleep(300);
          }
          await until(settings, "document.readyState === 'complete' && typeof window.gmux === 'object'", 60_000, 'the Settings window');
          await cdpEval(settings, "location.hash = '#machines'");
          await until(settings, 'document.querySelector(\'section[aria-label="Machines"]\') !== null', 30_000, 'Settings › Machines');
          await cdpEval(settings, PAGE_LIB);
          return await body({ main, settings, handle, profile, home, sshWrapper });
        } finally {
          sampler.stop();
          current = null;
          main?.close();
          settings?.close();
        }
      });
    } finally {
      const log = appLogOf(profile);
      if (existsSync(log)) {
        run.logsRead += 1;
        const warnings = overrideWarningsIn(readFileSync(log, 'utf8'));
        run.overrideWarnings += warnings;
        if (warnings > 0) say(`FINDING: ${log} holds ${String(warnings)} override warning(s)`);
      }
      endFarServer();
    }
  };

  // ---- the drives both builds share, by build ------------------------------
  /** The Settings rows main answers now. */
  const rowsOf = async (cdp) => {
    const got = await bridge(cdp, 'window.gmux.machines.rows()');
    return got.ok ? (got.value?.rows ?? []) : [];
  };
  const rowOf = async (cdp, id) => (await rowsOf(cdp)).find((r) => r.id === id) ?? null;
  const linkOf = async (cdp, id) => {
    const got = await bridge(cdp, 'window.gmux.machines.state()');
    const list = got.ok ? (Array.isArray(got.value) ? got.value : []) : [];
    return list.find((v) => v.id === id)?.link ?? null;
  };
  const counter = () => ({ presses: 0, typed: 0 });
  const press = async (cdp, n, selector) => {
    const got = await page(cdp, `press(${J(selector)})`);
    if (got !== 'pressed') throw new Error(`${selector}: ${String(got)}`);
    if (n !== null) n.presses += 1;
    await sleep(250);
  };
  const typeInto = async (cdp, n, selector, value) => {
    const got = await page(cdp, `type(${J(selector)}, ${J(value)})`);
    if (got !== 'typed') throw new Error(`${selector}: ${String(got)}`);
    if (n !== null) n.typed += 1;
    await sleep(150);
  };
  const testIdOf = async (cdp) => page(cdp, "attr('[data-test-id]', 'data-test-id')");

  /**
   * Wait for a check that is not `prevId` to end, answering a first-seen
   * question with Trust it (HEAD) or `yes` and Send (the parent) when one is
   * asked. Answers the reading the build draws.
   */
  const finishCheck = async (cdp, build, n, prevId, { trust = true, onAsk = null } = {}) => {
    const deadline = Date.now() + 90_000;
    let asked = false;
    let fingerprint = null;
    let runningText = null;
    for (;;) {
      guard();
      const id = await testIdOf(cdp);
      if (id !== null && id !== prevId) {
        const cls = await page(cdp, "attr('[data-outcome-class]', 'data-outcome-class')");
        if (cls !== null) {
          await sleep(300);
          return { testId: id, cls, asked, fingerprint, runningText, ...(await readCheck(cdp, build)) };
        }
        if (build === 'head') {
          if (runningText === null) runningText = await page(cdp, "text('[data-machines-check-row=\"running\"]')");
          if (!asked && (await page(cdp, "has('[data-machines-ask=\"host-key\"]')"))) {
            asked = true;
            fingerprint = fingerprintIn(await page(cdp, "text('[data-machines-ask=\"host-key\"] .mach-ask-fingerprint')"));
            if (onAsk !== null) {
              const done = await onAsk();
              if (done === 'stopped') return { testId: id, cls: 'cancelled', asked, fingerprint, runningText };
            }
            if (trust) await press(cdp, n, '[data-machines-action="trust"]');
          }
        } else {
          const transcript = (await page(cdp, "raw('[data-machines-transcript]')")) ?? '';
          if (!asked && /Are you sure you want to continue connecting/.test(transcript)) {
            asked = true;
            fingerprint = fingerprintIn(/key fingerprint is (SHA256:\S+)/.exec(transcript)?.[1] ?? null);
            if (onAsk !== null) {
              const done = await onAsk();
              if (done === 'stopped') return { testId: id, cls: 'cancelled', asked, fingerprint, runningText };
            }
            if (trust) {
              await typeInto(cdp, n, '[data-machines-field="answer"]', 'yes');
              await press(cdp, n, '[data-machines-action="send"]');
            }
          }
        }
      }
      if (Date.now() > deadline) throw new Error('a check did not end within 90 s');
      await sleep(250);
    }
  };
  /** What a finished check drew, by build. */
  const readCheck = async (cdp, build) => {
    const common = {
      // textContent: at HEAD these sit inside Details, which is shut.
      sshPath: await page(cdp, "raw('.mach-test-path')"),
      commandLine: await page(cdp, "attr('[data-command-line]', 'data-command-line')")
    };
    if (typeof common.sshPath === 'string') run.sshPaths.push(common.sshPath.trim());
    if (build === 'parent') {
      return { ...common, detail: await page(cdp, "text('.mach-outcome-detail')"), addDrawn: await page(cdp, "has('[data-machines-action=\"add-confirm\"]')") };
    }
    return {
      ...common,
      alarm: await page(cdp, "attr('[data-alarm]', 'data-alarm')"),
      found: await page(cdp, "text('[data-machines-check-row=\"found\"]')"),
      foundTitle: await page(cdp, "attr('[data-machines-check-row=\"found\"]', 'title')"),
      version: await page(cdp, "text('[data-machines-check-row=\"version\"]')"),
      failedTitle: await page(cdp, "attr('[data-machines-check-row=\"failed\"]', 'title')"),
      candidates: await page(cdp, "attrs('[data-machines-candidate]', 'data-machines-candidate')"),
      addDrawn: await page(cdp, "has('[data-machines-step=\"add\"]')"),
      addLabel: await page(cdp, "text('[data-machines-action=\"add-confirm\"]')"),
      accepts: await page(cdp, "attr('[data-machines-accepts]', 'data-machines-accepts')"),
      trustDrawn: await page(cdp, "has('[data-machines-action=\"trust\"]')")
    };
  };
  /** Open Add a machine from nothing (closing an open one first). HEAD looks at the tailnet by itself. */
  const openAdd = async (cdp, build, n) => {
    if (await page(cdp, "has('[data-machines-add]')")) await press(cdp, null, '[data-machines-action="add-cancel"]');
    await press(cdp, n, '[data-machines-action="open-add"]');
    if (build === 'head') await until(cdp, `document.querySelector('[data-machines-peer="127.0.0.1"]') !== null`, 30_000, 'the tailnet list');
  };
  /** Pick the loopback peer (the parent then presses Test the connection). */
  const pickLoop = async (cdp, build, n, host = '127.0.0.1') => {
    const prev = await testIdOf(cdp);
    if (build === 'parent') {
      if (!(await page(cdp, `has('[data-machines-peer="${host}"]')`))) await press(cdp, n, '[data-machines-action="find-tailnet"]');
      await until(cdp, `document.querySelector('[data-machines-peer="${host}"]') !== null`, 30_000, 'the tailnet list');
      await press(cdp, n, `[data-machines-peer="${host}"]`);
      await press(cdp, n, '[data-machines-action="test-draft"]');
    } else {
      await press(cdp, n, `[data-machines-peer="${host}"]`);
    }
    return prev;
  };
  /** Type a path under Advanced, opening it with one press. */
  const typePath = async (cdp, n, path, counted = true) => {
    if (!(await page(cdp, "isOpen('[data-machines-field=\"remoteTmuxPath\"]')"))) {
      const got = await page(cdp, "pressSummaryOf('[data-machines-field=\"remoteTmuxPath\"]')");
      if (got !== 'pressed') throw new Error(`Advanced: ${String(got)}`);
      if (counted && n !== null) n.presses += 1;
    }
    await sleep(200);
    await typeInto(cdp, counted ? n : null, '[data-machines-field="remoteTmuxPath"]', path);
  };
  /** Type an address and Check it (HEAD: Type an address… first). */
  const checkTyped = async (cdp, build, n, host) => {
    const prev = await testIdOf(cdp);
    if (build === 'head' && !(await page(cdp, "has('[data-machines-field=\"host\"]')"))) await press(cdp, n, '[data-machines-action="type-address"]');
    await typeInto(cdp, n, '[data-machines-field="host"]', host);
    await press(cdp, n, '[data-machines-action="test-draft"]');
    return prev;
  };
  /** Wait for a machine to be Ready (HEAD: the ready line; the parent: main says ready). */
  const waitReady = async (settings, build, id, ms = 120_000) => {
    if (build === 'head') {
      await until(settings, `document.querySelector('[data-machines-ready="${id}"]') !== null || document.querySelector('.mach-row[data-machine-id="${id}"] [data-machine-chip="ready"]') !== null`, ms, `${id} ready`);
      return true;
    }
    const deadline = Date.now() + ms;
    for (;;) {
      guard();
      if ((await rowOf(settings, id))?.ready === true) return true;
      if (Date.now() > deadline) return false;
      await sleep(500);
    }
  };
  const chipOf = (settings, id) => page(settings, `attr('.mach-row[data-machine-id="${id}"] [data-machine-chip]', 'data-machine-chip')`);
  const nextOf = (settings, id) => page(settings, `attr('.mach-row[data-machine-id="${id}"] [data-machines-next]', 'data-machines-next')`);

  // ===========================================================================
  // The arms, by launch.
  // ===========================================================================
  const records = { head: { arms: {}, run }, parent: { arms: {} } };
  const put = (build, id, reading) => {
    records[build].arms[id] = reading;
  };
  const cannotRead = (build, id, why) => {
    unreadable += 1;
    report.arms.push({ id, build, ok: null, said: why });
    say(`UNREADABLE ${build} ${id}: ${why}`);
  };
  /** An arm runs when it is wanted, or when an arm that is wanted stands on it (A1 makes the machine the main launch's later arms and A11 read; A7 makes A7b's key). */
  const DEPENDS = { A1: ['A9', 'A11', 'A12', 'A13', 'A14'], A7: ['A7b'] };
  const armRuns = (id) => wants(id) || (DEPENDS[id] ?? []).some(wants);
  const attempt = async (build, id, fn) => {
    if (!armRuns(id)) return;
    try {
      await fn();
    } catch (err) {
      cannotRead(build, id, err instanceof Error ? err.message : String(err));
      if (current?.abort) throw err;
    }
  };

  // The far landscape A1 rests on (M3): one tmux, in /opt/homebrew/bin, and
  // none in /usr/local/bin, which his login PATH searches.
  const precondition = existsSync('/opt/homebrew/bin/tmux') && !existsSync('/usr/local/bin/tmux');

  /** main: A1, A13, A12, A9, A14 (the parent: A1 and A12). */
  const mainLaunch = (build) =>
    launch({ build, name: 'main' }, async ({ main, settings, profile }) => {
      await attempt(build, 'A1', async () => {
        if (!precondition) throw new Error('this Mac does not hold tmux in /opt/homebrew/bin alone (M3), which A1 rests on');
        const n = counter();
        await openAdd(settings, build, n);
        const wordsAtRest = await page(settings, "words('[data-machines-add]', '.mach-peers')");
        let advancedOpened = false;
        if (build === 'head') {
          const prev = await pickLoop(settings, build, n);
          const got = await finishCheck(settings, build, n, prev);
          if (got.cls !== 'ok') throw new Error(`the check answered ${got.cls}`);
          // Read before the Add press: the ready step replaces the pick step.
          advancedOpened = (await page(settings, "isOpen('[data-machines-field=\"remoteTmuxPath\"]')")) === true;
          await press(settings, n, '[data-machines-action="add-confirm"]');
          const ready = await waitReady(settings, build, LOOP).catch(() => false);
          put(build, 'A1', { ready, presses: n.presses, typed: n.typed, advancedOpened, wordsAtRest, sshPath: got.sshPath, commandLine: got.commandLine, wrapper: wrappers['ssh'].path });
        } else {
          const prev = await pickLoop(settings, build, n);
          let got = await finishCheck(settings, build, n, prev);
          if (got.cls !== 'ok') {
            advancedOpened = true;
            await typePath(settings, n, REAL_TMUX);
            const again = await testIdOf(settings);
            await press(settings, n, '[data-machines-action="test-draft"]');
            got = await finishCheck(settings, build, n, again);
          }
          if (got.cls !== 'ok') throw new Error(`the parent's check answered ${got.cls} even with the path typed`);
          await press(settings, n, '[data-machines-action="add-confirm"]');
          await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"]') !== null`, 20_000, 'the parent row');
          await press(settings, n, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="toggle-lines"]`);
          await press(settings, n, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="prepare"]`);
          const ready = await waitReady(settings, build, LOOP);
          put(build, 'A1', { ready, presses: n.presses, typed: n.typed, advancedOpened, wordsAtRest, hash: (await rowOf(settings, LOOP))?.hash ?? null });
        }
      });

      if (build === 'head') {
        await attempt(build, 'A13', async () => {
          if ((await rowOf(settings, LOOP))?.ready !== true) throw new Error('A1 did not leave a ready machine');
          await press(settings, null, '[data-machines-action="open-folder"]');
          await until(main, `document.querySelector('[role="dialog"] #remote-project-machine') !== null`, 20_000, 'the main window sheet');
          const chosen = await cdpEval(main, "document.querySelector('[role=\"dialog\"] #remote-project-machine')?.value ?? null");
          await cdpEval(main, "document.querySelector('[role=\"dialog\"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
          let closed = false;
          for (let i = 0; i < 20 && !closed; i += 1) {
            await sleep(150);
            closed = (await cdpEval(main, "document.querySelector('[role=\"dialog\"] #remote-project-machine') === null")) === true;
          }
          put(build, 'A13', { open: true, chosen, closedByEscape: closed });
        });
      }

      await attempt(build, 'A12', async () => {
        if (await page(settings, "has('[data-machines-add]')")) {
          await press(settings, null, build === 'head' ? '[data-machines-action="add-done"]' : '[data-machines-action="add-cancel"]').catch(() => undefined);
        }
        await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"]') !== null`, 20_000, 'the row');
        if (build === 'head') {
          const wordsAtRest = await page(settings, `words('.mach-row[data-machine-id="${LOOP}"]')`);
          const items = await cdpEval(settings, `(window.__gmuxP340Menu && window.__gmuxP340Menu.items(${J(LOOP)})) || null`);
          put(build, 'A12', { wordsAtRest, menu: menuShape(items), menuAllEnabled: Array.isArray(items) && items.filter((i) => i.type !== 'separator').every((i) => i.enabled !== false), domMenus: await page(settings, 'domMenus()') });
        } else {
          const toggle = `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="toggle-lines"]`;
          // The parent's row may still be open from A1's Show what it runs.
          if ((await page(settings, `attr(${J(toggle)}, 'aria-expanded')`)) === 'true') await press(settings, null, toggle);
          const wordsShut = await page(settings, `words('.mach-row[data-machine-id="${LOOP}"]')`);
          await press(settings, null, toggle);
          const wordsOpen = await page(settings, `words('.mach-row[data-machine-id="${LOOP}"]')`);
          put(build, 'A12', { wordsShut, wordsOpen });
        }
      });

      if (build !== 'head') return;

      await attempt(build, 'A9', async () => {
        if ((await rowOf(settings, LOOP))?.state !== 'confirmed') throw new Error('A1 did not leave a confirmed row');
        // The port rewritten (the wrapper's first -p still reaches the yard, M15),
        // then the far server ended, so "nothing started" is a reading.
        const file = machinesJsonOf(profile);
        const parsed = JSON.parse(readFileSync(file, 'utf8'));
        parsed.machines = parsed.machines.map((m) => (m.id === LOOP ? { ...m, port: 2222 } : m));
        writeFileSync(file, `${J(parsed, null, 2)}\n`);
        endFarServer();
        await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"] [data-machine-chip="changed"]') !== null`, 20_000, 'the Changed chip');
        await sleep(600);
        const panelOpenedItself = await page(settings, `has('.mach-row[data-machine-id="${LOOP}"] [data-machines-panel="review"]')`);
        const reviewText = (await page(settings, `text('.mach-row[data-machine-id="${LOOP}"] [data-machines-panel="review"]')`)) ?? '';
        const chip = await chipOf(settings, LOOP);
        const next = await nextOf(settings, LOOP);
        const changedItems = await cdpEval(settings, `(window.__gmuxP340Menu && window.__gmuxP340Menu.items(${J(LOOP)})) || null`);
        const menuChanged = menuShape(changedItems);
        const menuChangedEnabled = menuEnabled(changedItems);
        // PROBE REVIEW: whatever happened between the rewrite and now (a sign-in
        // retry racing the watcher, say), the far server is ended again and
        // READ as down before the press, so a server seen after it is Confirm's.
        endFarServer();
        const farServerBeforeConfirm = farServer();
        await press(settings, null, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="confirm"]`);
        // A chip still Changed after 20 s is a product that did not take the
        // Confirm: recorded and graded, never a reason to stop reading (the
        // ruled round).
        const chipMovedAfterConfirm = await until(settings, `(() => { const c = document.querySelector('.mach-row[data-machine-id="${LOOP}"] [data-machine-chip]'); return c !== null && c.getAttribute('data-machine-chip') !== 'changed'; })()`, 20_000, 'the chip after Confirm').then(() => true, () => false);
        // A window of samples rather than one at 3 s, so a start Confirm set off
        // late is still seen (probe review).
        let farServerAfterConfirm = false;
        for (let i = 0; i < 8; i += 1) {
          guard();
          await sleep(1_000);
          if (farServer()) farServerAfterConfirm = true;
        }
        const chipAfterConfirm = await chipOf(settings, LOOP);
        const nextAfterConfirm = await nextOf(settings, LOOP);
        const { preparePressed, readyAfterPrepare } = await prepareAfterConfirm(
          nextAfterConfirm,
          () => press(settings, null, `.mach-row[data-machine-id="${LOOP}"] [data-machines-next="prepare"]`),
          () => until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"] [data-machine-chip="ready"]') !== null`, 120_000, 'Ready after Prepare').then(() => true, () => false)
        );
        put(build, 'A9', { chip, next, bothLists: reviewText.includes('You confirmed:') && reviewText.includes('It now says:'), panelOpenedItself, farServerBeforeConfirm, farServerAfterConfirm, chipMovedAfterConfirm, chipAfterConfirm, nextAfterConfirm, preparePressed, readyAfterPrepare, menuChanged, menuChangedEnabled });
      });

      await attempt(build, 'A14', async () => {
        if ((await chipOf(settings, LOOP)) !== 'ready') throw new Error('the row was not Ready before the machine stopped answering');
        machine.stop();
        const chipsWhileQuiet = [];
        let linkQuiet = false;
        let readyWhileQuiet = null;
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          guard();
          if ((await linkOf(settings, LOOP)) === 'quiet') {
            linkQuiet = true;
            for (let i = 0; i < 6; i += 1) {
              await sleep(500);
              chipsWhileQuiet.push(await chipOf(settings, LOOP));
            }
            readyWhileQuiet = (await rowOf(settings, LOOP))?.ready ?? null;
            break;
          }
          await sleep(1_000);
        }
        const restarted = machine.start();
        put(build, 'A14', { linkQuiet, chipsWhileQuiet, readyWhileQuiet, restarted });
      });
    });

  /** checks: A6, A3, A2, A5, A4. */
  const checksLaunch = (build) =>
    launch({ build, name: 'checks' }, async ({ settings, profile, home }) => {
      const record = knownMachinesOf(profile);
      const userRecord = join(home, '.ssh', 'known_hosts');
      const recordSha = () => (existsSync(record) ? sha256(readFileSync(record)) : 'absent');
      const entries = () => (existsSync(record) ? readFileSync(record, 'utf8').split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#')).length : 0);

      await attempt(build, 'A6', async () => {
        const wantFingerprint = fingerprintIn(spawnSync('/usr/bin/ssh-keygen', ['-lf', `${yard.hostKey}.pub`], { encoding: 'utf8' }).stdout);
        const userRecordBefore = existsSync(userRecord);
        const recordBefore = recordSha();
        const entriesBefore = entries();
        await openAdd(settings, build, null);
        let prev = await pickLoop(settings, build, null);
        let recordAfterStop = null;
        const stopped = await finishCheck(settings, build, null, prev, {
          trust: false,
          onAsk: async () => {
            await press(settings, null, '[data-machines-action="cancel-test"]');
            await sleep(800);
            recordAfterStop = recordSha();
            return 'stopped';
          }
        });
        // Trust, on a fresh check of the same machine. The stopped check's end
        // is drawn first (probe review: an 800 ms wait was a guess).
        prev = await testIdOf(settings);
        const again = build === 'head' ? '[data-machines-action="check-again"]' : '[data-machines-action="test-draft"]';
        await until(settings, `(() => { const b = document.querySelector(${J(again)}); return b !== null && b.disabled !== true; })()`, 30_000, `${again} after Stop`);
        await press(settings, null, again);
        const trusted = await finishCheck(settings, build, null, prev);
        const entriesAfterTrust = entries();
        // Changed: the right entry replaced by a wrong key for the same name.
        const good = readFileSync(record);
        const wrongKey = join(RUN_DIR, `wrong-${build}`);
        rmSync(wrongKey, { force: true });
        rmSync(`${wrongKey}.pub`, { force: true });
        spawnSync('/usr/bin/ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', wrongKey], { encoding: 'utf8' });
        const name = `[127.0.0.1]:${String(machine.port)}`;
        writeFileSync(record, `${name} ${readFileSync(`${wrongKey}.pub`, 'utf8').trim().split(' ').slice(0, 2).join(' ')}\n`);
        await openAdd(settings, build, null);
        prev = await pickLoop(settings, build, null);
        const changed = await finishCheck(settings, build, null, prev, { trust: false });
        writeFileSync(record, good);
        put(build, 'A6', {
          fingerprint: stopped.fingerprint ?? trusted.fingerprint,
          wantFingerprint,
          recordBefore,
          recordAfterStop,
          entriesBefore,
          entriesAfterTrust,
          changed: { cls: changed.cls, alarm: changed.alarm ?? null, trustDrawn: changed.trustDrawn ?? false, addDrawn: changed.addDrawn ?? false },
          userRecordBefore,
          userRecordAfter: existsSync(userRecord)
        });
      });

      if (build === 'head') {
        await attempt(build, 'A3', async () => {
          const path = join(FAR, 'missing', 'tmux');
          await openAdd(settings, build, null);
          await typePath(settings, null, path, false);
          const prev = await checkTyped(settings, build, null, '127.0.0.1');
          const got = await finishCheck(settings, build, null, prev);
          put(build, 'A3', { cls: got.cls, path, failedTitle: got.failedTitle, addDrawn: got.addDrawn });
        });
      }

      await attempt(build, 'A2', async () => {
        const loginbin = join(FAR, 'loginbin');
        mkdirSync(loginbin, { recursive: true, mode: 0o700 });
        rmSync(join(loginbin, 'tmux'), { force: true });
        symlinkSync(REAL_TMUX, join(loginbin, 'tmux'));
        setLoginFiles({ zprofile: `PATH=${loginbin}:"$PATH"\n` });
        try {
          await openAdd(settings, build, null);
          const prev = await pickLoop(settings, build, null);
          const got = await finishCheck(settings, build, null, prev);
          put(build, 'A2', build === 'head' ? { cls: got.cls, found: got.found, foundTitle: got.foundTitle, want: join(loginbin, 'tmux') } : { cls: got.cls, detail: got.detail });
        } finally {
          setLoginFiles({});
        }
      });

      await attempt(build, 'A5', async () => {
        const FAKE = "printf '%s\\n' __TORTIE_CHECK__ user=evil os=Darwin login=read 'cand=login /evil/tmux' count=1 'version=tmux 3.6a' __TORTIE_PATH__/evil/tmux__TORTIE_PATH__ __TORTIE_CHECK__";
        const one = async (files) => {
          setLoginFiles(files);
          try {
            await openAdd(settings, build, null);
            const prev = await pickLoop(settings, build, null);
            const got = await finishCheck(settings, build, null, prev);
            return build === 'head' ? { cls: got.cls, found: got.found, addDrawn: got.addDrawn, want: REAL_TMUX } : { cls: got.cls, detail: got.detail };
          } finally {
            setLoginFiles({});
          }
        };
        const a = await one({ zshenv: "echo 'p340 banner, line one'\necho 'p340 banner, line two'\n", zprofile: "echo 'p340 profile line'\n" });
        const b = await one({ zshenv: `${FAKE}\n` });
        // The EXIT trap the outer zsh runs AFTER the script (§Attack T1). FAKE
        // holds single quotes and no double quote, so it sits inside one.
        const c = await one({ zshenv: `trap "${FAKE}" EXIT\n` });
        put(build, 'A5', { a, b, c, farServer: farServer() });
      });

      await attempt(build, 'A4', async () => {
        const plantLog = join(FAR, 'plant.log');
        rmSync(plantLog, { force: true });
        const plant = standin(join(FAR, 'plant'), '3.6a', plantLog);
        setLoginFiles({ zprofile: `PATH=${dirname(plant)}:"$PATH"\n` });
        try {
          await openAdd(settings, build, null);
          const prev = await pickLoop(settings, build, null);
          const got = await finishCheck(settings, build, null, prev);
          if (build !== 'head') {
            put(build, 'A4', { cls: got.cls, detail: got.detail });
            return;
          }
          const logAfterChoice = logLines(plantLog);
          let ready = false;
          if (got.cls === 'program-choice') {
            const again = await testIdOf(settings);
            await press(settings, null, `[data-machines-candidate="${REAL_TMUX}"]`);
            const picked = await finishCheck(settings, build, null, again);
            if (picked.cls === 'ok') {
              await press(settings, null, '[data-machines-action="add-confirm"]');
              ready = await waitReady(settings, build, LOOP).catch(() => false);
            }
          }
          put(build, 'A4', { cls: got.cls, candidates: got.candidates, want: [plant, REAL_TMUX], logAfterChoice, ready, logAtEnd: logLines(plantLog) });
        } finally {
          setLoginFiles({});
        }
      });
    });

  /** The dummy password A7 types; never a password of anybody's. */
  const DUMMY = `p340-dummy-${String(process.pid)}-not-a-password`;
  /** Every regular file under `dirs`, scanned for `needle`: `{ hits, filesScanned }`, hits relative to the run. */
  const scanFor = (dirs, needle) => {
    const hits = [];
    let filesScanned = 0;
    const scan = (dir) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) scan(path);
        else if (entry.isFile()) {
          filesScanned += 1;
          try {
            if (readFileSync(path).includes(needle)) hits.push(path.slice(RUN_DIR.length));
          } catch {
            /* a socket or a file that went away */
          }
        }
      }
    };
    for (const dir of dirs) scan(dir);
    return { hits, filesScanned };
  };

  /** key: A7 then A7b, through the wrapper that names no identity of the yard's. */
  const keyLaunch = (build) =>
    launch({ build, name: 'key', sshWrapper: wrappers['ssh-noid'] }, async ({ settings, profile, home }) => {
      const authorizedBefore = sha256(readFileSync(yard.authorized));
      let keyPub = null;
      await attempt(build, 'A7', async () => {
        await openAdd(settings, build, null);
        const prev = await pickLoop(settings, build, null);
        const got = await finishCheck(settings, build, null, prev);
        const keyStep = await page(settings, "has('[data-machines-field=\"machine-password\"]')");
        let installClass = null;
        if (keyStep) {
          await typeInto(settings, null, '[data-machines-field="machine-password"]', DUMMY);
          await press(settings, null, '[data-machines-action="install-key"]');
          const deadline = Date.now() + 60_000;
          while (Date.now() < deadline && installClass === null) {
            guard();
            await sleep(500);
            installClass = await page(settings, "attr('[data-key-class]', 'data-key-class')");
          }
        }
        const keys = existsSync(keysDirOf(profile)) ? readdirSync(keysDirOf(profile)).filter((f) => f.endsWith('.pub')) : [];
        keyPub = keys.length === 1 ? join(keysDirOf(profile), keys[0]) : null;
        // Every file of the profile, the scratch HOME and app.log, scanned for
        // the dummy while the app runs; scanned AGAIN once it has quit (below).
        const { hits, filesScanned } = scanFor([profile, home], DUMMY);
        if (build === 'head') put(build, 'A7', { cls: got.cls, keyStep, installClass, dummyHits: hits, filesScanned, authorizedBefore, authorizedAfter: sha256(readFileSync(yard.authorized)), keyMade: keyPub !== null });
      });
      await attempt(build, 'A7b', async () => {
        if (keyPub === null) throw new Error('no key pair was made by the key step, so there is nothing to sign in with');
        const original = readFileSync(yard.authorized);
        const originalSha = sha256(original);
        let restored = false;
        try {
          appendFileSync(yard.authorized, `${readFileSync(keyPub, 'utf8').trim()}\n`);
          const prev = await testIdOf(settings);
          if (build === 'head') await press(settings, null, '[data-machines-action="check-again"]');
          else await press(settings, null, '[data-machines-action="test-draft"]');
          const got = await finishCheck(settings, build, null, prev);
          const keyPath = keyPub.replace(/\.pub$/, '');
          put(build, 'A7b', build === 'head' ? { cls: got.cls, identityNamed: identityNamed(got.commandLine, keyPath), keyPath } : { cls: got.cls });
        } finally {
          writeFileSync(yard.authorized, original);
          restored = sha256(readFileSync(yard.authorized)) === originalSha;
          if (build === 'head' && records.head.arms['A7b'] !== undefined) records.head.arms['A7b'].restored = restored;
        }
      });
    });

  /** version: A8, a stand-in printing 3.9z for -V and exec'ing the real tmux otherwise. */
  const versionLaunch = (build) =>
    launch({ build, name: 'version' }, async ({ settings }) => {
      await attempt(build, 'A8', async () => {
        const log = join(FAR, `odd-${build}.log`);
        rmSync(log, { force: true });
        const odd = standin(join(FAR, `odd-${build}`), '3.9z', log, true);
        const n = counter();
        await openAdd(settings, build, n);
        await typePath(settings, n, odd);
        const prev = await pickLoop(settings, build, n);
        const got = await finishCheck(settings, build, n, prev);
        if (got.cls !== 'ok') throw new Error(`the check answered ${got.cls}`);
        if (build === 'head') {
          const before = n.presses;
          // PROBE REVIEW: the check itself runs the typed stand-in's -V once, so
          // "Prepare ran the stand-in" is a run logged AFTER the Add press, never
          // the log merely holding a line.
          const standinBeforeAdd = logLines(log);
          await press(settings, n, '[data-machines-action="add-confirm"]');
          const addPresses = n.presses - before;
          const prepared = await waitReady(settings, build, LOOP).catch(() => false);
          const row = await rowOf(settings, LOOP);
          put(build, 'A8', { accepts: got.accepts, addPresses, rowAccepted: row?.acceptedTmuxVersion ?? null, linesHoldAccepts: (row?.confirmedLines ?? []).some((l) => String(l).startsWith('Accepts this version') && String(l).includes('3.9z')), standinBeforeAdd, standinRan: logLines(log), prepared, presses: n.presses });
        } else {
          await press(settings, n, '[data-machines-action="add-confirm"]');
          await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"]') !== null`, 20_000, 'the parent row');
          await press(settings, n, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="toggle-lines"]`);
          await press(settings, n, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="prepare"]`);
          await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"] [data-machines-action="accept-version"]') !== null`, 60_000, "the parent's acceptance sheet");
          await press(settings, n, `.mach-row[data-machine-id="${LOOP}"] [data-machines-action="accept-version"]`);
          const prepared = await waitReady(settings, build, LOOP);
          put(build, 'A8', { presses: n.presses, typed: n.typed, accepted: (await rowOf(settings, LOOP))?.acceptedTmuxVersion ?? null, prepared });
        }
      });
    });

  /** agent: A10. */
  const agentLaunch = () =>
    launch({ build: 'head', name: 'agent' }, async ({ settings, profile }) => {
      await attempt('head', 'A10', async () => {
        await openAdd(settings, 'head', null);
        const prev = await pickLoop(settings, 'head', null);
        const got = await finishCheck(settings, 'head', null, prev);
        if (got.cls !== 'ok' || got.addDrawn !== true) throw new Error(`the check answered ${got.cls} with no Add`);
        const file = machinesJsonOf(profile);
        mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
        writeFileSync(file, `${J({ schema: 1, machines: [{ id: LOOP, label: 'Planted by an agent', host: '127.0.0.1', remoteTmuxPath: REAL_TMUX }] }, null, 2)}\n`);
        let listedBeforePress = false;
        for (let i = 0; i < 40 && !listedBeforePress; i += 1) {
          await sleep(250);
          listedBeforePress = (await rowOf(settings, LOOP)) !== null;
        }
        await press(settings, null, '[data-machines-action="add-confirm"]');
        await sleep(1_500);
        const error = await page(settings, "text('[data-machines-step=\"add\"] .set-row-error')");
        await sleep(2_000);
        const rows = await rowsOf(settings);
        put('head', 'A10', { listedBeforePress, error, rowsAfter: rows.length, plantedState: rows.find((r) => r.id === LOOP)?.state ?? null, farServer: farServer() });
      });
    });

  /** picks: A15. */
  const picksLaunch = () =>
    launch({ build: 'head', name: 'picks' }, async ({ settings }) => {
      await attempt('head', 'A15', async () => {
        await openAdd(settings, 'head', null);
        let prev = await pickLoop(settings, 'head', null);
        await finishCheck(settings, 'head', null, prev);
        prev = await pickLoop(settings, 'head', null, 'localhost');
        const got = await finishCheck(settings, 'head', null, prev);
        if (got.cls !== 'ok') throw new Error(`the second check answered ${got.cls}`);
        const addLabel = got.addLabel;
        await press(settings, null, '[data-machines-action="add-confirm"]');
        await sleep(2_000);
        put('head', 'A15', { runningText: got.runningText, addLabel, addedIds: (await rowsOf(settings)).map((r) => r.id) });
      });
    });

  /** a11: the parent's main profile, relaunched at HEAD. */
  const a11Launch = () =>
    launch({ build: 'head', name: 'a11', profile: profileOf('parent', 'main') }, async ({ settings }) => {
      await attempt('head', 'A11', async () => {
        const parentHash = records.parent.arms['A1']?.hash ?? null;
        await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"]') !== null`, 30_000, 'the row');
        const row = await rowOf(settings, LOOP);
        const chip = await until(settings, `document.querySelector('.mach-row[data-machine-id="${LOOP}"] [data-machine-chip="ready"]') !== null`, 120_000, 'Ready after the launch sign-in').then(() => 'ready', async () => chipOf(settings, LOOP));
        put('head', 'A11', { state: row?.state ?? null, hash: row?.hash ?? null, parentHash, chip });
      });
    });

  // ===========================================================================
  // Run it, end everything, grade.
  // ===========================================================================
  try {
    const port = await freePort();
    yard = scratchYard({ root: join(RUN_DIR, 'yard'), prefix: 'p340', record });
    if (yard.authSock !== '') say('the yard started its own agent for its own key; the app is never handed it');
    machine = scratchMachine(yard, { id: 'loop', port });
    if (machine.scratchHome === null || !machine.scratchHome.startsWith(`${RUN_DIR}/`)) throw new Error('the far HOME is not the yard\'s own (SCRATCH_MACHINE_SCRATCH_HOME)');
    // A signal or an exit that skips the finally still ends the yard's sshd
    // and the far server: every pid here is one this run recorded.
    process.on('exit', () => {
      for (const pid of started) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* gone */
        }
      }
    });
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      process.once(sig, () => {
        try {
          endFarServer();
          machine?.stop();
          machine?.cleanup();
        } finally {
          process.exit(130);
        }
      });
    }
    if (!machine.start()) throw new Error('the yard\'s sshd did not answer on its port');
    const userKey = join(yard.root, `${yard.prefix}-userkey`);
    writeWrapper('ssh', `#!/bin/sh\n# Phase 340 probe: the loopback machine only. -F none first, the yard's port first (M15), the yard's key only.\nexec /usr/bin/ssh -F none -p ${String(port)} -o IdentitiesOnly=yes -o IdentityFile=${userKey} "$@"\n`);
    writeWrapper('ssh-noid', `#!/bin/sh\n# Phase 340 probe, arm A7: names an identity that does not exist, so ssh offers no key of the yard's and reads no default one.\nexec /usr/bin/ssh -F none -p ${String(port)} -o IdentitiesOnly=yes -o IdentityFile=${join(RUN_DIR, 'no-such-key')} "$@"\n`);
    writeWrapper('tailscale', `#!/bin/sh\n# Phase 340 probe: the tailnet stand-in, status --json only.\nexec ${process.execPath} ${TS_SCRIPT} ${TS_FIXTURE} ${TS_LOG} "$@"\n`);
    run.wrappers = [wrappers['ssh'].path, wrappers['ssh-noid'].path];
    say(`yard at ${yard.root}, sshd on 127.0.0.1:${String(port)}, far HOME ${machine.scratchHome}, far TMUX_TMPDIR ${machine.tmuxTmp}`);

    const any = (ids) => ids.some(armRuns);
    if (PARENT !== '') {
      if (any(['A1', 'A12'])) await mainLaunch('parent');
      if (any(['A2', 'A4', 'A5', 'A6'])) await checksLaunch('parent');
      if (wants('A7b')) await keyLaunch('parent');
      if (wants('A8')) await versionLaunch('parent');
    }
    if (any(['A1', 'A9', 'A12', 'A13', 'A14'])) await mainLaunch('head');
    if (any(['A2', 'A3', 'A4', 'A5', 'A6'])) await checksLaunch('head');
    if (any(['A7', 'A7b'])) {
      await keyLaunch('head');
      // PROBE REVIEW: the app has quit, so whatever Chromium or the log
      // transport flushes at quit is on disk now. The same scan, again.
      if (records.head.arms['A7'] !== undefined) {
        const after = scanFor([profileOf('head', 'key'), appHomeOf('head', 'key')], DUMMY);
        records.head.arms['A7'].dummyHitsAfterQuit = after.hits;
        records.head.arms['A7'].filesScannedAfterQuit = after.filesScanned;
      }
    }
    if (wants('A8')) await versionLaunch('head');
    if (wants('A10')) await agentLaunch();
    if (wants('A15')) await picksLaunch();
    if (PARENT !== '' && wants('A11')) await a11Launch();
  } catch (err) {
    unreadable += 1;
    say(`THE RUN STOPPED: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    endFarServer();
    run.farServerLeft = machine === null ? false : farServer();
    try {
      machine?.stop();
      machine?.cleanup();
    } catch {
      /* already gone */
    }
    for (const pid of started) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* gone */
      }
    }
    await sleep(500);
    for (const pid of started) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        /* gone */
      }
    }
    const left = parsePs(spawnSync('/bin/ps', ['-Ao', 'pid=,ppid=,args='], { encoding: 'utf8' }).stdout).filter((r) => r.args.includes(RUN_DIR) && r.pid !== process.pid);
    run.leftProcesses = left.length;
    for (const one of left) say(`LEFT: ${String(one.pid)} ${one.args.slice(0, 160)}`);
    // Every call the app made to the Tailscale stand-in (probe review).
    {
      const ts = readTailscaleLog(existsSync(TS_LOG) ? readFileSync(TS_LOG, 'utf8') : '');
      run.tailscaleAnswered = ts.answered;
      run.tailscaleRefused = ts.refused;
      run.tailscaleOther = ts.other;
      if (ts.refused > 0 || ts.other > 0) say(`FINDING: the Tailscale stand-in was asked for something other than status --json: ${readFileSync(TS_LOG, 'utf8').split('\n').filter((l) => l !== '' && l !== 'ANSWERED status --json').slice(0, 5).join(' | ')}`);
    }
    run.historyAfter = historyStat();
    if (!KEEP) {
      for (const dir of [yard?.root, FAR, BIN].filter(Boolean)) rmSync(dir, { recursive: true, force: true });
    }
  }

  // ---- grade --------------------------------------------------------------
  const head = records.head;
  const parent = PARENT === '' ? null : records.parent;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'head-record.json'), `${J(head, null, 2)}\n`);
  if (parent !== null) writeFileSync(join(OUT, 'parent-record.json'), `${J(parent, null, 2)}\n`);
  for (const id of Object.keys(GRADERS)) {
    if (!wants(id) && id !== 'RUN') continue;
    if (id === 'A11' && parent === null) continue;
    if (id !== 'RUN' && head.arms[id] === undefined) {
      if (!report.arms.some((a) => a.id === id && a.build === 'head')) cannotRead('head', id, 'the arm recorded nothing');
      continue;
    }
    const got = grade(id, readingOf(id, head, parent));
    report.arms.push({ id, ok: got.ok, failed: got.failed });
    if (!got.ok) failures += 1;
    say(`${got.ok ? 'PASS' : 'FAIL'} ${id} ${GRADERS[id].title}${got.ok ? '' : `: ${got.failed.join('; ')}`}`);
    if (parent !== null && parent.arms[id] !== undefined) say(`     parent: ${J(parent.arms[id]).slice(0, 300)}`);
  }
  writeFileSync(join(OUT, 'report.json'), `${J(report, null, 2)}\n`);
  say(`his history (size, mtime) after: ${String(run.historyAfter)}${run.historyAfter === historyBefore ? ', unchanged' : ', MOVED'}`);
  say(`records in ${OUT}`);
  // A sampler finding or an override warning is a FAILURE of the run, not an
  // unreadable one, even though it stopped the launch it was found in. So is
  // an arm that was read and FAILED, whatever else could not be read: exit 2
  // reads as "the probe could not judge", and a graded failure must never hide
  // behind it (probe review). Both counts are always printed.
  const verdict = run.violations > 0 || run.overrideWarnings > 0 || failures > 0 ? 1 : unreadable > 0 ? 2 : 0;
  const counts = `${String(failures)} arm(s) failed, ${String(unreadable)} could not be read`;
  say(verdict === 0 ? 'PASS' : verdict === 1 ? `FAIL: ${counts}` : `UNREADABLE: ${counts}`);
  process.exit(verdict);
}
