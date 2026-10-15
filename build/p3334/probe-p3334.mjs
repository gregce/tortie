#!/usr/bin/env node
/**
 * probe:p3334 — the phone app driven on the devices App Review uses (Phase
 * 333.4, build/p3334/SPEC.md §5.4; research 136 §7, the charter).
 *
 * WHAT IT DRIVES
 *   The SAME UI test `probe:p316` drives, `TortieUITests/P316DriveUITests/
 *   testDrive`, against the SAME door, build/p316/hostile-door.mjs's `honest`
 *   arm (its own process on 127.0.0.1, one per paired drive, ended in a
 *   `finally` that names it), on Simulators made ONE AT A TIME by the SAME
 *   helper, build/simulator-run.mjs's `withSimulator`, over the rows of
 *   {@link MATRIX}: the iPad Air 11-inch (M3) App Review uses, a Touch ID
 *   iPhone, an iPhone 16 Pro with nothing enrolled (the passcode) and the
 *   iPhone 16 Pro with Face ID (the controls, his no-regression rule), each on
 *   iOS 26.3 and 18.3. The iOS 27 rows and iPhone Duo are printed UNMEASURED
 *   with their reasons on every run, and change no exit.
 *
 * WHAT IT REFUSES
 *   No Electron, no Tailscale (real or stand-in), no DNS, no APNs, no model
 *   turn: for these readings the honest door is the Mac. No photograph and no
 *   screen recording: every claim is a frame or a label XCUITest read. No
 *   device it did not make (the helper names each `p316-<pid>-<n>`, deletes it
 *   in its `finally`, and prints and leaves alone every other `p316-` device),
 *   and Simulator.app is never started. Nothing is installed: no runtime, no
 *   Xcode, no download. Nothing of his is read (no keychain, no credentials,
 *   no live Tortie profile): the door's answers are the committed vectors,
 *   the sample is the committed book, and the derived data and every line
 *   file live in a scratch directory. The one thing it reads under the home
 *   (since the fix round) is the crash report macOS writes when the app dies
 *   on a device this run made: `~/Library/Logs/DiagnosticReports` and its
 *   `Retired/`, only files named `Tortie-*.ips` newer than the drive, kept
 *   only when the process path names that device, and of those only the
 *   crashed thread's image names.
 *
 * THE ORDER
 *   B0  The preflight, synchronous, before anything is built or served:
 *       `simulatorHarnessMissing` for the harness itself (exit 2 with its
 *       sentence), then for every row's runtime and device type. A row this
 *       Mac cannot run is UNMEASURED with that sentence, printed, never a pass
 *       and never a failure.
 *   B1  Three builds through `xcodebuildRun` (nothing boots): Debug
 *       build-for-testing; Release build-for-testing with
 *       `ENABLE_TESTABILITY=YES`, test:ios's own Release setting (without it
 *       the unit tests do not compile, SPEC D8); and Release `build`, the app
 *       as it ships. A fourth, the parent's Debug build-for-testing, when
 *       P3334_PARENT_IOS names one. A refused build exits 1 with its tail.
 *   Per measurable row, ONE device, and in order:
 *   K   the kind: the handle's `biometryKind` is the row's (the helper reads
 *       it from the device type's own capabilities.plist), and an enrolled row
 *       is enrolled through `sim.biometry('enrol')`.
 *   R   Release (rows that App Review installs: ipad-26, ipad-18, touch-26,
 *       touch-18, face-26): the shipping Tortie.app installed, read back by
 *       `appinfo` with the project's CFBundleVersion, uninstalled; then the
 *       Release drive into See a sample and its End.
 *   P   paired (Debug): a fresh honest door, the device's keychain reset,
 *       `pair, list, open:<sid>, chrome, catch-up, <E>, first, settings,
 *       open:<sid>, chrome`.
 *   T   the turn (Debug, a fresh door): the Terminal turned sideways and
 *       back, read at once, after `idle:5`, after Back and reopen, and after a
 *       tab switch. With P3334_PARENT_IOS, the parent's own app and UI test
 *       drive the same steps on the same device right after, and both
 *       readings are printed side by side.
 *   S   See a sample (Debug, no code): the walk of SPEC §5.4 S, its End
 *       included, then Leave.
 *   <E> is `end` on an enrolled row and `end-passcode:1234` on a row with
 *   nothing enrolled (the UI test types the digits where iOS draws its
 *   passcode field; a Simulator takes any passcode, SPEC D9).
 *   After the rows, `countDevicesNamed('p316-<pid>-')` reads 0 named and 0
 *   booted, an arm of its own.
 *
 * THE LINE PROTOCOL, exactly as probe:p316 reads it: every line the UI test
 * prints is `P316|<run>|<one JSON object>` on the runner's stdout AND appended
 * to the file P316_LINES names; each object carries `seq`, so a line is read
 * once from whichever channel brought it first. The reactor writes the
 * `screen-`, `reply-`, `sample-` and `setup-<seq>` acks into P316_ACKS at once
 * for every line, and `auth-<seq>` only once `end-auth-up` is answered: an
 * enrolled row by `sim.biometry('match')` (the device's own BiometricKit name,
 * the helper's to choose), a row with nothing enrolled by nothing at all,
 * because the drive types the passcode itself.
 *
 * THE GRADES, each arm `<row>:<grade>` reading PASS, FAIL, STATED or
 * UNREADABLE with its sentence; a missing reading is UNREADABLE, never a FAIL:
 *   G1  run: every drive printed lines, a `done`, `alive` 4, no
 *       `<step>-missing` dump and no `unknown-step`, and xcodebuild exited 0
 *       (a whole drive that exited otherwise is UNREADABLE, its log's first
 *       `error:` named). A drive whose app is not running at its end has its
 *       crash report read: XCUITest's own (SPEC F3: XCTAutomationSupport's
 *       snapshot code under os_log's quarantine, on iOS 18.3, at any load) is
 *       driven AGAIN on the same device, up to three drives in all; a death
 *       that left no report, once; a report that is the app's own is a FAIL
 *       and is never driven again. A last death is UNREADABLE, never a PASS.
 *   G2  the window: every dump at the row's measured window upright, the
 *       navigation bar below the status bar before any turn, the tab bar's
 *       bottom at the window's. Frames read inside an open menu, and an iPad's
 *       own status bar, are in the iPad's points and never compared (SPEC F5).
 *   G3  End's mark: Touch ID `touchID`/`touchid`, Face ID `faceID`/`faceid`,
 *       nothing enrolled `passcode`/`lock`, enabled; no label on a Touch ID row
 *       holds "Face ID".
 *   G4  the owner check (enrolled rows): the Mac's confirmation word for word,
 *       `end-auth-up` confirming, iOS's Touch ID prompt and no first-use
 *       question on a Touch ID row, a Face ID first-use question accepted when
 *       asked, and exactly ONE `POST /v1/end` answered 200, none before the
 *       answer.
 *   G5  the passcode (rows with nothing enrolled): the prompt found where its
 *       runtime draws it (CoreAuthUI on 18.x with its words, SpringBoard on
 *       26.x), the digits typed, then exactly ONE write, none before the probe
 *       let the drive type; or, when iOS ended its own check before a field was
 *       found, "Not confirmed. Nothing was changed." and ZERO writes.
 *   G6  Catch Me Up: turn 0 reached on the paired drive and on the sample.
 *   G7  the turn: an iPhone sideways draws no navigation bar and no tab bar
 *       (and its grid where the parent measured it), and upright again the
 *       navigation bar, the ⋯, the status line, the grid and the tab bar each
 *       equal the reading before the turn within 0.5 pt, and the tab buttons
 *       keep their number, their row and their height inside the tab bar (iOS
 *       26.3 widens them after a turn at both builds, now and then, so their x
 *       and width are not compared: the fix round); an iPad keeps its window
 *       and every frame (SPEC F6). `touch-26` is STATED: it passes
 *       as STATED only when every reading after the turn equals the parent's
 *       (SPEC F2, the bars 10 points high), PASS when it reads back exactly
 *       (and the line says F2 no longer reproduces), and FAIL otherwise.
 *   G8  Release: install 0, appinfo 0 with the project's build, and the
 *       Release drive's G1, G3, G4 and G6.
 *   G9  the sample: `sample-label` in every dump inside it, left onto
 *       Pairing, and G3 to G5 for the sample's End.
 *   G10 the kind: the helper's `biometryKind` is the row's.
 * Exit 0 when every measurable row's every arm is PASS or STATED, 1 when one
 * FAILED, 2 when one is UNREADABLE or no row is measurable.
 *
 * THE ENVIRONMENT
 *   P316_DEVICE, P316_RUNTIME   narrow the matrix to the rows whose device
 *                               type and runtime match (each optional), the
 *                               names test:ios reads.
 *   P3334_ROWS=<id,…>           pick rows by id; a requested row that is
 *                               UNMEASURED or absent exits 2 with its reason,
 *                               nothing created.
 *   P3334_DERIVED_DATA=<dir>    the builds' derived data, `<dir>-debug`,
 *                               `<dir>-release`, `<dir>-shipping` (and
 *                               `<dir>-parent`), refused in the repository and
 *                               the home; by default under a scratch mkdtemp.
 *                               Removed at the end either way unless
 *                               P3334_KEEP=1.
 *   P3334_PARENT_IOS=<dir>      a directory holding the parent's `ios/`
 *                               (`git archive 5f5efba2 ios | tar -x -C <dir>`):
 *                               T is driven over it too, and G7's STATED row
 *                               is compared with that live reading rather than
 *                               the recorded one.
 *   P3334_KEEP=1                keep the run directory: every drive's lines,
 *                               the door's routes and the derived data.
 *
 *   node build/p3334/probe-p3334.mjs --grader-self-test
 *       every grader over the readings in build/p3334/fixtures/, cut from the
 *       spec step's own drives of the parent, each grade red on one broken
 *       reading and green on the honest one; it starts nothing.
 *
 * Its cost, from the spec step's runs: three builds (about 20, 60 and 20 s
 * unloaded), then per row a boot (16 to 47 s) and four or five drives (45 to
 * 150 s each), about 8 to 12 minutes a row and 70 to 90 minutes for rows 1 to
 * 8. Measured by the verify round on 2026-10-14: 4,614 s (77 minutes) for rows
 * 1 to 8 with P3334_PARENT_IOS, four builds included. One lock slot, and no
 * other Simulator run beside it (SPEC §13 concern 1). A verifier's, never the
 * battery's. It runs only as the entry: importing it for its graders starts
 * nothing.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEVICE_TYPE_IPAD,
  DEVICE_TYPE_NAME,
  DEVICE_TYPE_TOUCH_ID,
  RUNTIME_CURRENT,
  countDevicesNamed,
  refuseScratchReason,
  simulatorHarnessMissing,
  withSimulator,
  xcodebuildRun
} from '../simulator-run.mjs';

const TAG = '[probe:p3334]';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const FIXTURES = join(HERE, 'fixtures');
const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
const SCHEME = 'Tortie';
const BUNDLE_ID = 'com.itavero.tortie.phone';
const UI_TEST = 'TortieUITests/P316DriveUITests/testDrive';
/** The passcode the UI test types where iOS asks for one. A Simulator takes any (SPEC D9). */
export const PASSCODE = '1234';
/** XCUIApplication.State.runningForeground. */
const RUNNING_FOREGROUND = 4;
/** Two frames are the same frame within this many points (SPEC §5.4 G7). */
const TOLERANCE = 0.5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = JSON.stringify;
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

// ---------------------------------------------------------------------------
// The matrix (SPEC §2)
// ---------------------------------------------------------------------------

/** Why the iOS 27 rows cannot be measured on this Mac today (SPEC §11). */
const IOS_27_WHY =
  'No iOS 27 Simulator runtime is installed: Xcode 26.3 offers iOS SDK 26.2 at most, the iOS 27 runtime comes with Xcode 27, ' +
  'and Xcode 27 needs macOS Tahoe 26.6 on Apple silicon (this Mac measured macOS 15.7.9). He installs them; agents install nothing.';

/**
 * The eleven rows. `window` is the app's window upright as the spec step
 * measured it at the parent, and `sideways` the Terminal's grid sideways,
 * measured likewise (337.3's [62, 0, 750, 382] and [62, 0, 750, 381] on the
 * iPhone 16 Pro, the whole window on the SE); null where nothing was measured.
 * `stated` names the grade a row passes as STATED (SPEC F2). A row with a
 * `unmeasured` reason is measured only when this Mac has its runtime and its
 * device type; row 11 has no measured name, so it never is until a later round
 * writes the name here.
 */
export const MATRIX = Object.freeze(
  [
    {
      id: 'ipad-26',
      deviceType: DEVICE_TYPE_IPAD,
      runtime: '26.3',
      kind: 'touchID',
      enrolled: true,
      release: true,
      ipad: true,
      window: [375, 667],
      sideways: null,
      why: 'App Review\'s iPad (forums 815079, 820096); the app runs in iPhone compatibility mode'
    },
    { id: 'ipad-18', deviceType: DEVICE_TYPE_IPAD, runtime: '18.3', kind: 'touchID', enrolled: true, release: true, ipad: true, window: [375, 667], sideways: null, why: 'the same on the floor runtime' },
    {
      id: 'touch-26',
      deviceType: DEVICE_TYPE_TOUCH_ID,
      runtime: '26.3',
      kind: 'touchID',
      enrolled: true,
      release: true,
      ipad: false,
      window: [375, 667],
      sideways: [0, 0, 667, 375],
      stated: 'G7',
      why: '317\'s End on a Touch ID iPhone; F2\'s row'
    },
    { id: 'touch-18', deviceType: DEVICE_TYPE_TOUCH_ID, runtime: '18.3', kind: 'touchID', enrolled: true, release: true, ipad: false, window: [375, 667], sideways: [0, 0, 667, 375], why: 'the same on his phone\'s line (18.x)' },
    { id: 'none-26', deviceType: DEVICE_TYPE_NAME, runtime: '26.3', kind: 'faceID', enrolled: false, release: false, ipad: false, window: [402, 874], sideways: [62, 0, 750, 382], why: 'nothing enrolled: the passcode path (SPEC D9)' },
    { id: 'none-18', deviceType: DEVICE_TYPE_NAME, runtime: '18.3', kind: 'faceID', enrolled: false, release: false, ipad: false, window: [402, 874], sideways: [62, 0, 750, 381], why: 'the same on the floor' },
    { id: 'face-26', deviceType: DEVICE_TYPE_NAME, runtime: '26.3', kind: 'faceID', enrolled: true, release: true, ipad: false, window: [402, 874], sideways: [62, 0, 750, 382], why: 'the control: the row that passes today' },
    { id: 'face-18', deviceType: DEVICE_TYPE_NAME, runtime: '18.3', kind: 'faceID', enrolled: true, release: false, ipad: false, window: [402, 874], sideways: [62, 0, 750, 381], why: 'the control on the floor' },
    { id: 'ipad-27', deviceType: DEVICE_TYPE_IPAD, runtime: '27', kind: 'touchID', enrolled: true, release: true, ipad: true, window: null, sideways: null, why: 'App Review\'s iPad on iOS 27', unmeasured: IOS_27_WHY },
    { id: 'face-27', deviceType: 'iPhone 17 Pro', runtime: '27', kind: 'faceID', enrolled: true, release: true, ipad: false, window: null, sideways: null, why: 'the newest iPhone on iOS 27', unmeasured: IOS_27_WHY },
    {
      id: 'duo-27.1',
      deviceType: null,
      runtime: '27.1',
      kind: null,
      enrolled: true,
      release: true,
      ipad: false,
      window: null,
      sideways: null,
      why: 'iPhone Duo, which ships on iOS 27.1',
      unmeasured:
        'No device type on this Mac names Duo (121 read) and a third-party report says its Simulator ships with the Xcode 27.1 beta. ' +
        'Its exact name and biometry are read when it exists, from the device type list and its capabilities.plist, and written into MATRIX by a later round; never guessed.'
    }
  ].map((row) => Object.freeze(row))
);

/**
 * The rows the environment asks for (SPEC §5.4 "The environment"). P3334_ROWS
 * picks by id, in MATRIX order; P316_DEVICE and P316_RUNTIME narrow by device
 * type and runtime. `explicit` says the rows were named, so one that cannot be
 * measured refuses the run rather than being skipped.
 */
export function selectRows(env, matrix = MATRIX) {
  const device = String(env?.P316_DEVICE ?? '').trim();
  const runtime = String(env?.P316_RUNTIME ?? '').trim();
  const ids = String(env?.P3334_ROWS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  const unknown = ids.filter((id) => !matrix.some((r) => r.id === id));
  if (unknown.length > 0) {
    return { rows: [], explicit: true, refused: `P3334_ROWS names ${unknown.join(', ')}, which no row of the matrix is; the rows are ${matrix.map((r) => r.id).join(', ')}.` };
  }
  const runtimeMatches = (row) => runtime === '' || row.runtime === runtime || row.runtime.startsWith(`${runtime}.`);
  const deviceMatches = (row) => device === '' || row.deviceType === device;
  const rows = matrix.filter((r) => (ids.length === 0 || ids.includes(r.id)) && runtimeMatches(r) && deviceMatches(r));
  if (rows.length === 0) {
    return { rows, explicit: ids.length > 0, refused: `no row of the matrix matches${device === '' ? '' : ` P316_DEVICE='${device}'`}${runtime === '' ? '' : ` P316_RUNTIME=${runtime}`}${ids.length === 0 ? '' : ` P3334_ROWS=${ids.join(',')}`}.` };
  }
  return { rows, explicit: ids.length > 0, refused: null };
}

/**
 * Which selected rows run, and which are UNMEASURED with their reasons.
 * `absence(row)` is the preflight's sentence for that row, or null; it is
 * injected so the self-test asks no Simulator anything.
 */
export function planRows(env, absence, matrix = MATRIX) {
  const sel = selectRows(env, matrix);
  if (sel.refused !== null) return { run: [], unmeasured: [], refuse: sel.refused };
  const run = [];
  const unmeasured = [];
  for (const row of sel.rows) {
    const why = absence(row);
    if (why === null) run.push(row);
    else unmeasured.push({ row, why });
  }
  if (sel.explicit && unmeasured.length > 0) {
    return { run: [], unmeasured, refuse: `P3334_ROWS asks for ${unmeasured.map((u) => u.row.id).join(', ')}, which this Mac cannot measure. Nothing was created.` };
  }
  if (run.length === 0) return { run, unmeasured, refuse: 'no selected row of the matrix can be measured on this Mac. Nothing was created.' };
  return { run, unmeasured, refuse: null };
}

// ---------------------------------------------------------------------------
// The steps (SPEC §5.4 "The order")
// ---------------------------------------------------------------------------

/** End's step on this row: Face ID or Touch ID answered from the host, or the passcode typed by the drive. */
export function endStep(row) {
  return row.enrolled ? 'end' : `end-passcode:${PASSCODE}`;
}

/** The `for` End's lines carry on this row. */
export const endFor = (row) => (row.enrolled ? 'end' : 'end-passcode');

/** How the reactor answers `end-auth-up` on this row: the device's own match, or nothing (the drive types). */
export const answerFor = (row) => (row.enrolled ? 'match' : 'none');

const b64u = (text) => Buffer.from(text, 'utf8').toString('base64url');

/** One drive's steps. `sid` is the honest door's session; `cast` the sample's waiting Claude Code (A), live Claude Code (R) and live Codex (T). */
export function stepsFor(kind, row, { sid = null, cast = null } = {}) {
  const E = endStep(row);
  switch (kind) {
    case 'R':
      return ['setup-read', 'sample-see', 'tab:needs', `terminal-open:${cast.A}`, 'reply-press:0', 'tab:needs', `terminal-open:${cast.R}`, 'first', 'back', `terminal-open:${cast.R}`, E, 'tab:settings', 'sample-inventory:settings', 'sample-leave'];
    case 'P':
      return ['pair', 'list', `open:${sid}`, 'chrome', 'catch-up', E, 'first', 'settings', `open:${sid}`, 'chrome'];
    case 'T':
      return ['pair', 'list', `open:${sid}`, 'chrome', 'landscape', 'portrait', 'chrome', 'idle:5', 'chrome', 'back', `open:${sid}`, 'chrome', 'tab:settings', 'tab:sessions', `open:${sid}`, 'chrome'];
    case 'S':
      return [
        'setup-read',
        'setup-scan',
        'sample-see',
        'tab:needs',
        'sample-inventory:needs',
        `terminal-open:${cast.A}`,
        'sample-inventory:terminal',
        'reply-press:0',
        'tab:needs',
        `terminal-open:${cast.T}`,
        `screen-type:${b64u('ls -la')}`,
        'screen-ctrl:c',
        'screen-key:return',
        'back',
        `terminal-open:${cast.R}`,
        'first',
        'sample-inventory:catch-up',
        'back',
        `terminal-open:${cast.R}`,
        E,
        'tab:settings',
        'sample-inventory:settings',
        'sample-leave'
      ];
    default:
      throw new Error(`${TAG} no drive is named ${String(kind)}`);
  }
}

// ---------------------------------------------------------------------------
// What the tree says (read, never written)
// ---------------------------------------------------------------------------

/** The sample's start-state cast, by the book's own variants and agents, as probe:p316's sampleCast finds it. */
export function sampleCast(book) {
  const start = (id) => book.variants[book.ids.indexOf(id)][0];
  const agentOf = (id) => {
    const a = book.session?.[id]?.[start(id)];
    return (a?.session ?? a)?.agent ?? null;
  };
  const pick = (variant, agent) => book.ids.find((id) => start(id) === variant && agentOf(id) === agent) ?? null;
  return { A: pick('waiting', 'claude'), R: pick('live', 'claude'), T: pick('live', 'codex') };
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sampleBook = () => readJson(join(ROOT, 'ios', 'Tortie', 'Sample', 'sample.json'));

/** The confirmation the sample's live Claude Code (the session the walks End) carries in its start state. */
export function sampleConfirm(book = sampleBook()) {
  const id = sampleCast(book).R;
  const a = book.session?.[id]?.live;
  return (a?.session ?? a)?.endConfirm ?? null;
}

/** The honest door's `talk` row's confirmation: the committed vectors' own, which the door serves. */
export function talkConfirm() {
  const vectors = readJson(join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json'));
  return JSON.parse(vectors.answers['session-talk'].json).session?.endConfirm ?? null;
}

/** One Copy.swift word, by its name, read from the source the app is built from. */
export function copyWord(name) {
  const text = readFileSync(join(ROOT, 'ios', 'Tortie', 'Style', 'Copy.swift'), 'utf8');
  const m = new RegExp(`static let ${name} = "((?:[^"\\\\]|\\\\.)*)"`).exec(text);
  return m === null ? null : m[1];
}

/** The project's build number: every CURRENT_PROJECT_VERSION, which must agree, or null. */
export function projectVersion(pbxproj) {
  const all = [...String(pbxproj).matchAll(/CURRENT_PROJECT_VERSION = ([^;\n]+);/g)].map((m) => m[1].trim());
  return all.length > 0 && all.every((v) => v === all[0]) ? all[0] : null;
}

/** CFBundleVersion as `appinfo` printed it, or null. */
export function appinfoVersion(text) {
  const m = /CFBundleVersion = ([^;\n]+);/.exec(String(text));
  // A quoted value loses its quotes (\u0022, so no regular expression here holds a quote character).
  return m === null ? null : m[1].trim().replace(/^\u0022(.*)\u0022$/, '$1');
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

const PASS = 'PASS';
const FAIL = 'FAIL';
const STATED = 'STATED';
const UNREADABLE = 'UNREADABLE';
const verdict = (grade, why) => ({ grade, why });
const RANK = { [PASS]: 0, [STATED]: 1, [UNREADABLE]: 2, [FAIL]: 3 };

/** The worst of several verdicts, each one's sentence kept under its label. FAIL outranks UNREADABLE, which outranks STATED. */
export function worst(parts) {
  const list = parts.filter((p) => p !== null && p !== undefined);
  if (list.length === 0) return verdict(UNREADABLE, 'nothing was read');
  const grade = list.reduce((g, p) => (RANK[p.v.grade] > RANK[g] ? p.v.grade : g), PASS);
  const shown = list.filter((p) => p.v.grade === grade || grade === PASS || grade === STATED);
  return verdict(grade, shown.map((p) => `${p.label}: ${p.v.why}`).join('; '));
}

// ---------------------------------------------------------------------------
// Reading one drive
// ---------------------------------------------------------------------------

/** A drive's last attempt, which is the one graded. */
const finalOf = (drive) => drive?.attempts?.at(-1) ?? null;
const eventsOf = (drive) => finalOf(drive)?.events ?? [];
const doorOf = (drive) => finalOf(drive)?.door ?? drive?.door ?? null;
const marksOf = (drive) => finalOf(drive)?.marks ?? drive?.marks ?? { auth: [] };
const aliveOf = (events) => events.find((e) => e?.step === 'alive')?.state ?? null;

/** A drive whose app is not running in the foreground at its end, or that printed no `alive`, died (SPEC G1). */
export function needsAgain(events) {
  return aliveOf(events ?? []) !== RUNNING_FOREGROUND;
}

// ---------------------------------------------------------------------------
// A death, read from the crash report macOS wrote for it (the fix round)
// ---------------------------------------------------------------------------

/**
 * At most this many drives of one step list (the fix round, 2026-10-14): the
 * first, then again after each death whose crash report is XCUITest's own
 * (SPEC F3), and once more after a death that left no report. A death whose
 * report is the app's own is never driven again: it is G1's FAIL. Measured
 * by the devices lens on iOS 18.3: 15 deaths in 69 drives (8 of 42 at HEAD, 7
 * of 27 at the parent), 0 in 61 on 26.3, at load averages of 7 to 78, so one
 * drive again left a row UNREADABLE about one run in four for no defect.
 */
export const DRIVES_AT_MOST = 3;

/** Where macOS writes a Simulator app's crash report, and where it moves an older one. */
const CRASH_DIRS = Object.freeze([join(homedir(), 'Library', 'Logs', 'DiagnosticReports'), join(homedir(), 'Library', 'Logs', 'DiagnosticReports', 'Retired')]);
/** A report is the app's `Tortie-<date>-<time>.ips`. */
const CRASH_NAME = /^Tortie-[^/]*\.ips$/;
/** How long a death waits for its report to appear (macOS writes it a moment after the process ends). */
const CRASH_WAIT_MS = 10_000;
/** A report written up to this long before the drive's own start is not this drive's. */
const CRASH_SKEW_MS = 2_000;

/**
 * One crash report's text (an `.ips`: a JSON header line, then a JSON body)
 * read as the death of THIS app on the device `udid`, or null when it is
 * another app's, another device's, or not a report at all. Pure.
 */
export function crashOn(text, udid) {
  if (typeof text !== 'string' || typeof udid !== 'string' || udid.length === 0) return null;
  const nl = text.indexOf('\n');
  if (nl === -1) return null;
  let head;
  let body;
  try {
    head = JSON.parse(text.slice(0, nl));
    body = JSON.parse(text.slice(nl + 1));
  } catch {
    return null;
  }
  if (head?.bundleID !== BUNDLE_ID) return null;
  if (typeof body?.procPath !== 'string' || !body.procPath.includes(`/Devices/${udid}/`)) return null;
  return body;
}

/**
 * Whose crash a report is, read from its crashed thread alone (SPEC F3):
 * `xcuitest` when a frame of that thread is XCTAutomationSupport's and no
 * frame NEARER THE FAULT than the first of them is Tortie's (so Tortie's own
 * frames are only below it, its entry on the main run loop, symbolicated or
 * not); `app` otherwise, a report with no crashed thread included. All 27
 * Tortie reports on this Mac on 2026-10-14 (19 from the verify round's
 * devices, 8 older) read `xcuitest`, each with XCTAutomationSupport's
 * `runtime_issue_os_log_fault_callback` at frame 1 under `_platform_strcmp`.
 * Pure.
 */
export function crashClass(body) {
  const images = Array.isArray(body?.usedImages) ? body.usedImages : [];
  const thread = (Array.isArray(body?.threads) ? body.threads : []).find((t) => t?.triggered === true);
  if (thread === undefined || !Array.isArray(thread.frames) || thread.frames.length === 0) return 'app';
  const imageOf = (f) => String(images[f?.imageIndex]?.name ?? '');
  const first = thread.frames.findIndex((f) => imageOf(f) === 'XCTAutomationSupport');
  if (first === -1) return 'app';
  return thread.frames.slice(0, first).some((f) => imageOf(f) === 'Tortie') ? 'app' : 'xcuitest';
}

/**
 * The reports of this app's deaths on the device `udid` since `sinceMs`, from
 * directory entries `{ name, mtimeMs, text }`, each with its class. Pure.
 */
export function deathReports(entries, udid, sinceMs) {
  return (entries ?? [])
    .filter((e) => CRASH_NAME.test(String(e?.name)) && typeof e?.mtimeMs === 'number' && e.mtimeMs >= sinceMs - CRASH_SKEW_MS)
    .map((e) => ({ name: e.name, body: crashOn(e.text, udid) }))
    .filter((e) => e.body !== null)
    .map((e) => ({ name: e.name, class: crashClass(e.body) }));
}

/** One death's class: `app` when any report is the app's, `xcuitest` when there are reports and all are XCUITest's, null when none was found. */
export function deathClass(death) {
  const reports = death?.reports ?? [];
  if (reports.some((r) => r.class === 'app')) return 'app';
  return reports.length > 0 ? 'xcuitest' : null;
}

/** One death in words, for G1's sentence. */
function deathWords(death) {
  const reports = death?.reports ?? [];
  if (death === undefined || death === null) return 'no crash report was read';
  if (reports.length === 0) return 'no crash report was found for it';
  const names = reports.map((r) => r.name).join(', ');
  return deathClass(death) === 'app' ? `${names}, the app's own crash` : `${names}, XCUITest's own crash (SPEC F3)`;
}

/**
 * Whether the drive is driven again after its last attempt: only when that
 * attempt's app died, fewer than {@link DRIVES_AT_MOST} drives were made, and
 * the death is not the app's own; a death that left no report is driven again
 * only after the first drive. Pure.
 */
export function driveAgain(attempts) {
  const last = attempts?.at(-1);
  if (last === undefined || !needsAgain(last.events)) return false;
  if (attempts.length >= DRIVES_AT_MOST) return false;
  const whose = deathClass(last.death);
  if (whose === 'app') return false;
  if (whose === null) return attempts.length === 1;
  return true;
}

/** The crash reports macOS wrote for this app on `udid` since `sinceMs`, waited for up to {@link CRASH_WAIT_MS}. Reads only `Tortie-*.ips` newer than the drive, and keeps only those naming that device. */
async function readDeath(udid, sinceMs) {
  const deadline = Date.now() + CRASH_WAIT_MS;
  for (;;) {
    const entries = [];
    for (const dir of CRASH_DIRS) {
      let names = [];
      try {
        names = readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        if (!CRASH_NAME.test(name)) continue;
        try {
          const st = statSync(join(dir, name));
          if (!st.isFile() || st.mtimeMs < sinceMs - CRASH_SKEW_MS) continue;
          entries.push({ name, mtimeMs: st.mtimeMs, text: readFileSync(join(dir, name), 'utf8') });
        } catch {
          /* a report moved or unreadable is not this drive's to read */
        }
      }
    }
    const found = deathReports(entries, udid, sinceMs);
    if (found.length > 0 || Date.now() >= deadline) return found;
    await sleep(1_000);
  }
}

const deadWindow = (w) => Array.isArray(w) && w.length === 2 && w[0] === 0 && w[1] === 0;

/** The step during which the app ended: the first line read with no window, else the first `-missing` dump, else the last line. */
export function diedDuring(events) {
  const gone = events.find((e) => deadWindow(e?.window) && e?.step !== 'screen');
  if (gone !== undefined) return `${gone.step}${gone.key ? `:${gone.key}` : gone.letter ? `:${gone.letter}` : ''}`;
  const missing = events.find((e) => e?.step === 'screen' && /-missing$/.test(String(e.name)));
  if (missing !== undefined) return String(missing.name).replace(/-missing$/, '');
  const last = events.at(-1);
  if (last === undefined) return 'the launch';
  return `the step after its last line (${String(last.step)}${last.name ? ` ${String(last.name)}` : ''}${last.for ? ` for ${String(last.for)}` : ''})`;
}

/** G1, one drive. */
export function gradeRun(drive, { udid = null } = {}) {
  const attempts = drive?.attempts ?? [];
  if (attempts.length === 0) return verdict(UNREADABLE, 'the drive did not run');
  const events = eventsOf(drive);
  const device = udid === null ? 'this row\'s device' : `device ${udid}`;
  // A death whose report is the app's own fails the drive, whichever drive it was.
  const crashed = attempts.find((a) => deathClass(a?.death) === 'app');
  if (crashed !== undefined) {
    return verdict(FAIL, `the app crashed during ${diedDuring(crashed.events ?? [])} on ${device}: ${deathWords(crashed.death)}, a frame of Tortie's nearer the fault than any of XCUITest's, which is not SPEC F3`);
  }
  if (events.length === 0) return verdict(UNREADABLE, `the drive printed no line${finalOf(drive)?.why ? ` (${finalOf(drive).why})` : ''}`);
  if (needsAgain(events)) {
    const during = diedDuring(events);
    if (attempts.length >= 2) {
      return verdict(UNREADABLE, `the app ended on all ${String(attempts.length)} drives on ${device}, the last during ${during}: ${attempts.map((a, i) => `drive ${String(i + 1)} ${deathWords(a.death)}`).join('; ')}`);
    }
    return verdict(UNREADABLE, `the app ended during ${during} (${deathWords(finalOf(drive)?.death)}) and the drive was not driven again`);
  }
  const problems = [];
  if (!events.some((e) => e?.step === 'done')) problems.push('no `done` line');
  const missing = events.filter((e) => e?.step === 'screen' && /-missing$/.test(String(e.name))).map((e) => e.name);
  if (missing.length > 0) problems.push(`the drive stalled at ${missing.join(', ')}`);
  const unknown = events.filter((e) => e?.step === 'unknown-step').map((e) => e.name ?? '?');
  if (unknown.length > 0) problems.push(`the UI test knows no step ${unknown.join(', ')}`);
  if (problems.length > 0) return verdict(FAIL, problems.join('; '));
  // The fix round: XCTest records a failure the lines may not show (the drive
  // runs on after one), so a whole drive that exited non-zero is not read as a pass.
  const code = finalOf(drive)?.code;
  if (typeof code === 'number' && code !== 0) {
    const first = finalOf(drive)?.firstError;
    return verdict(UNREADABLE, `the drive ran whole but xcodebuild exited ${String(code)}${typeof first === 'string' && first.length > 0 ? `, first saying: ${first}` : ', and its log names no error'}`);
  }
  const earlier = attempts.slice(0, -1).map((a, i) => `drive ${String(i + 1)}'s app ended during ${diedDuring(a.events ?? [])} (${deathWords(a.death)})`);
  const again = earlier.length > 0 ? `; ${earlier.join('; ')}, and drive ${String(attempts.length)} ran whole` : '';
  return verdict(PASS, `${String(events.length)} lines, done, alive ${String(RUNNING_FOREGROUND)}${again}`);
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

const isFrame = (f) => Array.isArray(f) && f.length === 4 && f.every((n) => typeof n === 'number');
const sameFrame = (a, b, tol = TOLERANCE) => isFrame(a) && isFrame(b) && a.every((n, i) => Math.abs(n - b[i]) <= tol);
const sameSize = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === 2 && b.length === 2 && Math.abs(a[0] - b[0]) <= TOLERANCE && Math.abs(a[1] - b[1]) <= TOLERANCE;
const fr = (f) => (isFrame(f) ? `[${f.map((n) => String(Math.round(n * 100) / 100)).join(', ')}]` : 'none');

/** What one `chrome`, `landscape` or `portrait` line read, as frames. */
export function readingOf(event) {
  const c = event?.chrome;
  if (c === null || typeof c !== 'object') return null;
  return {
    seq: event.seq,
    step: event.step,
    face: event.reading?.face ?? null,
    window: c.window ?? null,
    orientation: c.orientation ?? null,
    nav: isFrame(c.nav) ? c.nav : null,
    navs: c.navs ?? null,
    menu: isFrame(c.menu?.frame) ? c.menu.frame : null,
    status: isFrame(c.status?.frame) ? c.status.frame : null,
    grid: isFrame(c.grid?.frame) ? c.grid.frame : null,
    tabBar: isFrame(c.tabBar) ? c.tabBar : null,
    tabBars: c.tabBars ?? null,
    tabButtons: (c.tabButtons ?? []).map((b) => b?.frame).filter(isFrame),
    statusBar: isFrame(event.statusBar) ? event.statusBar : null
  };
}

/**
 * How a tab button is held after a turn (the fix round, 2026-10-14). iOS 26.3
 * draws the tab bar's three buttons either 100 points wide or 108.5 (99.67 or
 * 108.33 on the iPhone 16 Pro) from one reading to the next after a turn, and
 * back once the Terminal is opened again, AT BOTH BUILDS of a byte-identical
 * app: the attack lens's six T drives on the iPhone SE at 26.3 caught it in 1
 * of 6, its three on the iPhone 16 Pro in 1 of 3, and the devices lens's ABBA
 * order in 3 of 8 with the bars 10 points high in all 8. So a button's x and
 * width are never compared; its row (y), its height and that it lies inside
 * its own reading's tab bar are, and so is how many there are. F2 is held by
 * the bars it moves: the navigation bar, the ⋯, the status line, the grid and
 * the tab bar itself.
 */
function tabButtonDifferences(a, b) {
  const out = [];
  if (a.tabButtons.length !== b.tabButtons.length) {
    out.push(`${String(a.tabButtons.length)} tab buttons then ${String(b.tabButtons.length)}`);
    return out;
  }
  a.tabButtons.forEach((f, i) => {
    const g = b.tabButtons[i];
    if (Math.abs(f[1] - g[1]) > TOLERANCE || Math.abs(f[3] - g[3]) > TOLERANCE) out.push(`tab button ${String(i)} ${fr(f)} then ${fr(g)}`);
    else if (isFrame(b.tabBar) && (g[0] < b.tabBar[0] - TOLERANCE || g[0] + g[2] > b.tabBar[0] + b.tabBar[2] + TOLERANCE)) {
      out.push(`tab button ${String(i)} ${fr(g)} outside the tab bar ${fr(b.tabBar)}`);
    }
  });
  return out;
}

/**
 * Every way reading `b` differs from reading `a`. The navigation bar and the
 * tab bar are compared always; the ⋯, the status line and the grid only when
 * both readings were taken on the same face (Catch Me Up draws none of them);
 * the tab buttons by {@link tabButtonDifferences}, never by x or width.
 */
export function frameDifferences(a, b) {
  const out = [];
  if (!sameSize(a.window, b.window)) out.push(`window ${J(a.window)} then ${J(b.window)}`);
  for (const key of ['nav', 'tabBar']) {
    if (a[key] === null || b[key] === null) {
      if (a[key] !== b[key]) out.push(`${key} ${fr(a[key])} then ${fr(b[key])}`);
    } else if (!sameFrame(a[key], b[key])) out.push(`${key} ${fr(a[key])} then ${fr(b[key])}`);
  }
  if (a.face === b.face) {
    for (const key of ['menu', 'status', 'grid']) {
      if (a[key] === null && b[key] === null) continue;
      if (!sameFrame(a[key], b[key])) out.push(`${key} ${fr(a[key])} then ${fr(b[key])}`);
    }
  }
  out.push(...tabButtonDifferences(a, b));
  return out;
}

/** T's readings: the last one before the turn, the sideways one, and every one after it. */
export function turnReadings(events) {
  const all = events.filter((e) => ['chrome', 'landscape', 'portrait'].includes(e?.step) && e?.chrome).map(readingOf);
  const sideAt = all.findIndex((r) => r.step === 'landscape');
  if (sideAt < 1) return null;
  return { before: all[sideAt - 1], side: all[sideAt], afters: all.slice(sideAt + 1) };
}

/** How many readings T takes after the turn: `portrait`'s, at once, after idle, after reopen, after a tab switch. */
export const AFTER_READINGS = 5;

// ---------------------------------------------------------------------------
// G2, the window
// ---------------------------------------------------------------------------

/** G2 over several drives of one row: `drives` is [{ label, drive }]. */
export function gradeWindow(row, drives) {
  let want = row.window;
  const problems = [];
  const notes = new Set();
  let read = 0;
  for (const { label, drive } of drives) {
    if (drive === null || drive === undefined) continue;
    let turned = false;
    for (const e of eventsOf(drive)) {
      if (e?.step === 'landscape') {
        turned = true;
        continue;
      }
      if ((e?.step === 'screen' || e?.step === 'sample-inventory') && Array.isArray(e.window)) {
        if (deadWindow(e.window)) continue; // the app was gone: G1's to say
        if (want === null) want = e.window;
        read += 1;
        if (!sameSize(e.window, want)) problems.push(`${label} ${e.step === 'screen' ? `dump ${String(e.name)}` : e.step} at ${J(e.window)}`);
        continue;
      }
      if ((e?.step === 'chrome' || e?.step === 'portrait') && e.chrome) {
        const r = readingOf(e);
        if (deadWindow(r.window)) continue;
        if (want === null) want = r.window;
        read += 1;
        if (!sameSize(r.window, want)) problems.push(`${label} ${e.step} ${String(e.seq)} at ${J(r.window)}`);
        if (r.tabBar !== null && Array.isArray(r.window) && Math.abs(r.tabBar[1] + r.tabBar[3] - r.window[1]) > TOLERANCE) {
          problems.push(`${label} ${e.step} ${String(e.seq)}: the tab bar ${fr(r.tabBar)} ends at ${String(r.tabBar[1] + r.tabBar[3])}, not the window's ${String(r.window[1])}`);
        }
        if (!turned && r.nav !== null && r.statusBar !== null && Array.isArray(r.window)) {
          if (Math.abs(r.statusBar[2] - r.window[0]) > TOLERANCE) {
            notes.add(`the status bar ${fr(r.statusBar)} is read in the device's own points, not the window's, and is not compared (SPEC F5)`);
          } else if (r.nav[1] < r.statusBar[1] + r.statusBar[3] - TOLERANCE) {
            problems.push(`${label} ${e.step} ${String(e.seq)}: the navigation bar ${fr(r.nav)} starts under the status bar ${fr(r.statusBar)}`);
          }
        }
      }
    }
  }
  if (read === 0) return verdict(UNREADABLE, 'no dump read a window');
  if (problems.length > 0) return verdict(FAIL, `the window is ${J(want)}${row.window === null ? ' (first read here)' : ''}, and ${problems.join('; ')}`);
  return verdict(PASS, `${String(read)} readings at ${J(want)} upright${row.window === null ? ' (first read here; nothing was measured before)' : ''}${notes.size > 0 ? `; ${[...notes].join('; ')}` : ''}`);
}

// ---------------------------------------------------------------------------
// G3, End's mark
// ---------------------------------------------------------------------------

/** End's expected mark on this row (SPEC §5.4 G3). */
export function expectedMark(row) {
  if (!row.enrolled) return { kind: 'passcode', glyph: 'lock' };
  return row.kind === 'touchID' ? { kind: 'touchID', glyph: 'touchid' } : { kind: 'faceID', glyph: 'faceid' };
}

/** The glyph a line names, without the identifier prefix the Catch Me Up face reads it by. */
const glyphName = (g) => String(g ?? '').replace(/^session-end-glyph-/, '');

/** Every string value in a reading, keys left out. */
function stringsIn(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsIn(v, out);
  else if (value !== null && typeof value === 'object') for (const v of Object.values(value)) stringsIn(v, out);
  return out;
}

/** G3, one drive's End. */
export function gradeEndMark(row, drive) {
  const E = endFor(row);
  const events = eventsOf(drive);
  const bar = events.find((e) => e?.step === 'end-bar' && e.for === E);
  if (bar === undefined) return verdict(UNREADABLE, `no end-bar line for ${E}`);
  const want = expectedMark(row);
  const problems = [];
  if (bar.kind !== want.kind) problems.push(`its kind is ${String(bar.kind)}, not ${want.kind}`);
  if (glyphName(bar.glyph) !== want.glyph) problems.push(`its glyph is ${String(bar.glyph)}, not ${want.glyph}`);
  if (bar.enabled !== true) problems.push('End cannot be pressed');
  if (row.kind === 'touchID') {
    const face = stringsIn(events).filter((s) => /Face ID/.test(s));
    if (face.length > 0) problems.push(`a Touch ID iPhone drew ${J([...new Set(face)].slice(0, 3))}`);
  }
  if (problems.length > 0) return verdict(FAIL, `End's mark: ${problems.join('; ')}`);
  return verdict(PASS, `${want.kind} with ${want.glyph}, enabled`);
}

// ---------------------------------------------------------------------------
// G4 and G5, the owner check
// ---------------------------------------------------------------------------

/** The Mac's confirmation, word for word, on End's dialog. */
function dialogProblems(events, E, confirm) {
  const dialog = events.find((e) => e?.step === 'end-dialog' && e.for === E);
  if (dialog === undefined) return { unreadable: `no end-dialog line for ${E}` };
  if (confirm === null || typeof confirm !== 'object') return { unreadable: 'no confirmation to hold the dialog to' };
  const out = [];
  if (dialog.title !== confirm.title) out.push(`the dialog's title is ${J(dialog.title)}, not the Mac's ${J(confirm.title)}`);
  if (!(dialog.texts ?? []).includes(confirm.body)) out.push(`the dialog does not say the Mac's ${J(confirm.body)}`);
  if (!(dialog.buttons ?? []).includes(confirm.confirmLabel)) out.push(`the dialog has no ${J(confirm.confirmLabel)} press`);
  return { problems: out };
}

/** Every `POST /v1/end` the door served. */
const endWrites = (door) => (door ?? []).filter((e) => e?.route === 'POST /v1/end');

/** The probe's answer to this drive's `end-auth-up` for E. */
function markFor(drive, up) {
  return (marksOf(drive).auth ?? []).find((m) => m.seq === up.seq) ?? null;
}

/** End's menu read again after End, on the Terminal: whether End is still offered, or null when unread. */
function endAfter(events, E) {
  const menu = events.filter((e) => e?.step === 'terminal-menu' && e.for === `${E}-after`).at(-1);
  if (menu === undefined || menu.opened !== true) return null;
  return menu.end !== null && menu.end !== undefined;
}

/**
 * Exactly one write answered 200, none at or before `bound` (the moment the
 * probe answered, or let the drive type). Times are the door's and this
 * process's own clocks, on one Mac.
 */
function oneWriteAfter(door, bound, what) {
  const writes = endWrites(door);
  if (writes.length !== 1) return `the door counted ${String(writes.length)} POST /v1/end, not one`;
  const w = writes[0];
  if (w.status !== 200) return `the one POST /v1/end was answered ${String(w.status)}`;
  if (typeof w.at === 'number' && typeof bound === 'number' && w.at < bound) return `the write came ${String(bound - w.at)} ms before ${what}`;
  if (typeof w.at !== 'number' || typeof bound !== 'number') return `the write's time or ${what}'s was not read`;
  return null;
}

/** G4 (an enrolled row), one drive's End. `withDoor` reads the door; `inSample` reads End gone from the menu after. */
export function gradeOwnerCheck(row, drive, { confirm, withDoor, inSample }) {
  const E = endFor(row);
  const events = eventsOf(drive);
  const problems = [];
  const unread = [];
  const d = dialogProblems(events, E, confirm);
  if (d.unreadable) unread.push(d.unreadable);
  else problems.push(...d.problems);
  const up = events.find((e) => e?.step === 'end-auth-up' && e.for === E);
  if (up === undefined) return verdict(UNREADABLE, `no end-auth-up line for ${E}${unread.length ? `; ${unread.join('; ')}` : ''}`);
  if (up.confirming !== true) problems.push('the owner check was not up when End waited for it (`confirming` false)');
  const answered = events.find((e) => e?.step === 'end-auth-answered' && e.for === E);
  if (answered?.acked !== true) unread.push('the drive did not see the probe\'s answer');
  const mark = markFor(drive, up);
  if (mark === null) unread.push('the probe recorded no answer to end-auth-up');
  else if (mark.code !== 0) unread.push(`the probe's match did not post (exit ${String(mark.code)})`);
  const perms = events.filter((e) => e?.step === 'faceid-permission' && e.for === E);
  if (row.kind === 'touchID') {
    if (perms.some((p) => p.seen === true)) problems.push('a first-use question was asked on a Touch ID iPhone');
    const drew = perms.flatMap((p) => p.drew ?? []).map((x) => String(x?.label ?? ''));
    if (!drew.some((l) => /Touch ID/.test(l))) problems.push(`iOS's prompt did not say Touch ID (it drew ${J(drew)})`);
  } else {
    for (const p of perms.filter((x) => x.seen === true)) {
      if (!['OK', 'Allow'].includes(p.pressed)) problems.push(`iOS's first-use question ${J(p.title ?? '')} was answered ${J(p.pressed ?? null)}, not allowed`);
    }
  }
  if (withDoor) {
    const door = doorOf(drive);
    if (door === null) unread.push('the door\'s requests were not read');
    else {
      const w = oneWriteAfter(door, mark?.at ?? null, 'the answer');
      if (w !== null) problems.push(w);
    }
  }
  if (inSample) {
    const still = endAfter(events, E);
    if (still === null) unread.push('End\'s menu was not read again after End');
    else if (still) problems.push('End is still offered after the sample\'s session ended');
  }
  if (problems.length > 0) return verdict(FAIL, problems.join('; '));
  if (unread.length > 0) return verdict(UNREADABLE, unread.join('; '));
  const question = perms.some((p) => p.seen === true) ? ', iOS\'s first-use question accepted' : '';
  return verdict(PASS, `the Mac's confirmation, ${row.kind === 'touchID' ? 'Touch ID\'s prompt' : 'Face ID'}${question}, ${withDoor ? 'one write after the answer' : 'End gone after'}`);
}

/** The surface a runtime draws its passcode prompt on, measured (SPEC F4), or null where nothing was measured. */
export function passcodeSurface(runtime) {
  const v = String(runtime ?? '');
  if (v === '18' || v.startsWith('18.')) return 'coreAuth';
  if (v === '26' || v.startsWith('26.')) return 'springboard';
  return null;
}

/** The words CoreAuthUI says over its passcode field (SPEC F4). */
const CORE_AUTH_ASK = 'Enter iPhone Passcode for “Tortie”';

/** The session's End line after the re-read: the dump named E, then any chrome line after the prompt. */
function endLineAfter(events, E, afterSeq) {
  const dump = events.filter((e) => e?.step === 'screen' && e.name === E).at(-1);
  const el = (dump?.elements ?? []).find((x) => x?.id === 'session-end-line');
  if (el !== undefined) return el.label ?? '';
  const chrome = events.find((e) => e?.chrome && e.seq > afterSeq && e.chrome.endLine);
  return chrome === undefined ? null : chrome.chrome.endLine.label ?? '';
}

/** G5 (a row with nothing enrolled), one drive's End. */
export function gradePasscode(row, drive, { confirm, withDoor, inSample, runtime, notConfirmed }) {
  const E = endFor(row);
  const events = eventsOf(drive);
  const problems = [];
  const unread = [];
  const d = dialogProblems(events, E, confirm);
  if (d.unreadable) unread.push(d.unreadable);
  else problems.push(...d.problems);
  const up = events.find((e) => e?.step === 'end-auth-up' && e.for === E);
  if (up === undefined) return verdict(UNREADABLE, `no end-auth-up line for ${E}${unread.length ? `; ${unread.join('; ')}` : ''}`);
  const mark = markFor(drive, up);
  if (mark === null) unread.push('the probe recorded no moment it let the drive type');
  const prompt = events.find((e) => e?.step === 'passcode-prompt' && e.for === E);
  if (prompt === undefined) return verdict(UNREADABLE, `no passcode-prompt line for ${E}`);
  const typed = events.find((e) => e?.step === 'passcode-typed' && e.for === E);
  const door = withDoor ? doorOf(drive) : null;
  if (withDoor && door === null) unread.push('the door\'s requests were not read');
  let how;
  if (prompt.field === true) {
    const surface = passcodeSurface(runtime);
    if (!['coreAuth', 'springboard'].includes(prompt.in)) problems.push(`the field was found in ${J(prompt.in)}`);
    else if (surface !== null && prompt.in !== surface) problems.push(`iOS ${String(runtime)} drew the field in ${prompt.in}, where ${surface} was measured`);
    if (prompt.in === 'coreAuth') {
      const texts = prompt.texts ?? [];
      if (!texts.includes(CORE_AUTH_ASK)) problems.push(`CoreAuthUI did not say ${J(CORE_AUTH_ASK)} (it said ${J(texts.slice(0, 6))})`);
      if (confirm && !texts.includes(confirm.confirmLabel)) problems.push(`CoreAuthUI did not name the press ${J(confirm?.confirmLabel)}`);
    }
    if (typed === undefined) problems.push('the field was found and nothing was typed');
    if (typed !== undefined && typed.in !== prompt.in) problems.push(`typed into ${J(typed.in)}, found in ${J(prompt.in)}`);
    if (withDoor && door !== null) {
      // The drive types only after the probe's ack; a line's own clock, when it carries one, is tighter.
      const bound = Math.max(mark?.at ?? -Infinity, typeof prompt.at === 'number' ? prompt.at : -Infinity);
      const w = oneWriteAfter(door, Number.isFinite(bound) ? bound : null, 'the drive could type');
      if (w !== null) problems.push(w);
    }
    if (inSample) {
      const still = endAfter(events, E);
      if (still === null) unread.push('End\'s menu was not read again after End');
      else if (still) problems.push('End is still offered after the sample\'s session ended');
    }
    how = `the field in ${String(prompt.in)}, ${PASSCODE} typed, ${withDoor ? 'one write after it could be' : 'End gone after'}`;
  } else {
    if (typed !== undefined) problems.push('a passcode was typed where no field was found');
    const line = endLineAfter(events, E, prompt.seq);
    if (line === null) unread.push('no End line was read after the check');
    else if (line !== notConfirmed) problems.push(`no field was found and End says ${J(line)}, not ${J(notConfirmed)}`);
    if (withDoor && door !== null && endWrites(door).length !== 0) problems.push(`no field was found and the door counted ${String(endWrites(door).length)} POST /v1/end`);
    how = `iOS ended its own check before a field was found: ${J(notConfirmed)}, no write`;
  }
  if (problems.length > 0) return verdict(FAIL, problems.join('; '));
  if (unread.length > 0) return verdict(UNREADABLE, unread.join('; '));
  return verdict(PASS, how);
}

// ---------------------------------------------------------------------------
// G6, Catch Me Up
// ---------------------------------------------------------------------------

/** G6 over drives that press `first`: each reaches turn 0. */
export function gradeTurns(drives) {
  const parts = drives.map(({ label, drive }) => {
    const turns = eventsOf(drive).filter((e) => e?.step === 'turns');
    if (turns.length === 0) return { label, v: verdict(UNREADABLE, 'no turns line') };
    const reached = turns.some((t) => (t.indexes ?? []).includes(0));
    const seen = turns.flatMap((t) => t.indexes ?? []);
    return { label, v: reached ? verdict(PASS, `turn 0 reached (${String(seen.length)} turns)`) : verdict(FAIL, `turn 0 not reached; the earliest read is ${String(Math.min(...seen))}`) };
  });
  return worst(parts);
}

// ---------------------------------------------------------------------------
// G7, the turn
// ---------------------------------------------------------------------------

/**
 * The parent's own reading of `touch-26`'s turn, recorded by the spec step on
 * an iPhone SE (3rd generation), iOS 26.3.1, at 5f5efba2 (keep/results/
 * se-26-turn.json, cut into build/p3334/fixtures/touch-26-turn.json; the
 * self-test holds this table to that file). After the turn every top bar
 * sits 10 points high (SPEC F2). Its buttons were caught widened after the
 * turn, which iOS does from one drive to the next at both builds and G7 does
 * not compare (see {@link tabButtonDifferences}); the reading is kept as it
 * was recorded, and the self-test grades both states STATED against it.
 */
export const PARENT_TURNS = Object.freeze({
  'touch-26': Object.freeze({
    source: 'the spec step\'s se-26-turn drive at the parent, 5f5efba2',
    before: { face: 'terminal', window: [375, 667], nav: [0, 20, 375, 54], menu: [319, 24, 36, 36], status: [16, 80, 224, 18], grid: [0, 104, 375, 480], tabBar: [0, 584, 375, 83], tabButtons: [[46, 588, 100, 54], [138, 588, 100, 54], [230, 588, 100, 54]] },
    afters: [
      { face: 'terminal', window: [375, 667], nav: [0, 10, 375, 54], menu: [319, 14, 36, 36], status: [16, 70, 224, 18], grid: [0, 94, 375, 490], tabBar: [0, 584, 375, 83], tabButtons: [[33, 588, 108.5, 54], [133.5, 588, 108.5, 54], [234, 588, 108.5, 54]] },
      { face: 'terminal', window: [375, 667], nav: [0, 10, 375, 54], menu: [319, 14, 36, 36], status: [16, 70, 224, 18], grid: [0, 94, 375, 490], tabBar: [0, 584, 375, 83], tabButtons: [[33, 588, 108.5, 54], [133.5, 588, 108.5, 54], [234, 588, 108.5, 54]] },
      { face: 'catch-up', window: [375, 667], nav: [0, 10, 375, 54], menu: null, status: null, grid: null, tabBar: [0, 584, 375, 83], tabButtons: [[46, 588, 100, 54], [138, 588, 100, 54], [230, 588, 100, 54]] },
      { face: 'terminal', window: [375, 667], nav: [0, 10, 375, 54], menu: [319, 14, 36, 36], status: [16, 70, 224, 18], grid: [0, 94, 375, 490], tabBar: [0, 584, 375, 83], tabButtons: [[46, 588, 100, 54], [138, 588, 100, 54], [230, 588, 100, 54]] },
      { face: 'terminal', window: [375, 667], nav: [0, 10, 375, 54], menu: [319, 14, 36, 36], status: [16, 70, 224, 18], grid: [0, 94, 375, 490], tabBar: [0, 584, 375, 83], tabButtons: [[46, 588, 100, 54], [138, 588, 100, 54], [230, 588, 100, 54]] }
    ]
  })
});

/** A recorded reading in the shape `readingOf` gives. */
const asReading = (r) => ({ seq: null, step: null, face: r.face, window: r.window, orientation: null, nav: r.nav, navs: r.nav ? 1 : 0, menu: r.menu, status: r.status, grid: r.grid, tabBar: r.tabBar, tabBars: r.tabBar ? 1 : 0, tabButtons: r.tabButtons, statusBar: null });

/** The parent's turn as `turnReadings` gives it, from the recorded table or from a live parent drive. */
export function parentTurn(rowId, liveDrive = null) {
  if (liveDrive !== null && liveDrive !== undefined) {
    const t = turnReadings(eventsOf(liveDrive));
    return t === null ? null : { ...t, from: 'the parent\'s live drive' };
  }
  const p = PARENT_TURNS[rowId];
  return p === undefined ? null : { before: asReading(p.before), side: null, afters: p.afters.map(asReading), from: p.source };
}

/** One line of a turn's readings, for printing side by side. */
export function turnLine(t) {
  if (t === null) return 'unread';
  const one = (r) => `${r.face ?? '?'} nav ${fr(r.nav)} grid ${fr(r.grid)} tab ${fr(r.tabBar)}`;
  return `before ${one(t.before)}${t.side ? ` | sideways ${J(t.side.window)} grid ${fr(t.side.grid)} navs ${String(t.side.navs)} tabBars ${String(t.side.tabBars)}` : ''} | after ${t.afters.map(one).join(' ; ')}`;
}

/** G7, the turn drive, against the parent's readings for a STATED row. */
export function gradeTurn(row, drive, { parent = null } = {}) {
  const t = turnReadings(eventsOf(drive));
  if (t === null) return verdict(UNREADABLE, 'no reading before the turn, or no sideways reading');
  if (![3, 4].includes(t.side.orientation)) return verdict(UNREADABLE, `the device was not turned (orientation ${String(t.side.orientation)})`);
  if (t.afters.length < AFTER_READINGS) return verdict(UNREADABLE, `${String(t.afters.length)} readings after the turn, not ${String(AFTER_READINGS)}`);
  const sideProblems = [];
  if (row.ipad) {
    // SPEC F6: an iPad keeps the iPhone window upright; nothing moves.
    sideProblems.push(...frameDifferences(t.before, t.side).map((d) => `sideways ${d}`));
  } else {
    if (t.side.nav !== null || (t.side.navs ?? 0) !== 0) sideProblems.push(`sideways a navigation bar is drawn at ${fr(t.side.nav)}`);
    if (t.side.tabBar !== null || (t.side.tabBars ?? 0) !== 0) sideProblems.push(`sideways a tab bar is drawn at ${fr(t.side.tabBar)}`);
    if (!(Array.isArray(t.side.window) && Array.isArray(t.before.window) && sameSize(t.side.window, [t.before.window[1], t.before.window[0]]))) {
      sideProblems.push(`sideways the window is ${J(t.side.window)}`);
    }
    if (row.sideways !== null && !sameFrame(t.side.grid, row.sideways)) sideProblems.push(`sideways the grid is ${fr(t.side.grid)}, not the measured ${fr(row.sideways)}`);
  }
  const afterProblems = t.afters.flatMap((a, i) => frameDifferences(t.before, a).map((d) => `after ${String(i + 1)}: ${d}`));
  if (sideProblems.length > 0) return verdict(FAIL, sideProblems.join('; '));
  if (afterProblems.length === 0) {
    return verdict(PASS, `${row.ipad ? 'the window and every frame unchanged by the turn' : `sideways ${fr(t.side.grid)} with no bars; upright every frame equal ${String(t.afters.length)} times`}${row.stated === 'G7' ? '; SPEC F2 no longer reproduces' : ''}`);
  }
  if (row.stated !== 'G7') return verdict(FAIL, afterProblems.join('; '));
  if (parent === null || parent.afters.length < t.afters.length) return verdict(UNREADABLE, `the turn moved the bars (${afterProblems[0]}) and the parent's reading to state it against was not read`);
  const toParent = [
    ...frameDifferences(parent.before, t.before).map((d) => `before: ${d}`),
    ...t.afters.flatMap((a, i) => frameDifferences(parent.afters[i], a).map((d) => `after ${String(i + 1)}: ${d}`))
  ];
  if (toParent.length > 0) return verdict(FAIL, `the turn moved the bars, and not as at the parent (${parent.from}): ${toParent.join('; ')}`);
  return verdict(STATED, `SPEC F2, as at the parent (${parent.from}): after the turn the navigation bar reads ${fr(t.afters[0].nav)} against ${fr(t.before.nav)} before`);
}

// ---------------------------------------------------------------------------
// G8, G9, G10
// ---------------------------------------------------------------------------

/** G8: the shipping app installed and read back, and the Release drive. */
export function gradeRelease(row, { install, version, drive, confirm, runtime, notConfirmed }) {
  const parts = [];
  if (install === null || install === undefined) parts.push({ label: 'install', v: verdict(UNREADABLE, 'the shipping app was not installed') });
  else {
    const p = [];
    if (install.code !== 0) p.push(`install exited ${String(install.code)}`);
    if (install.appinfoCode !== 0) p.push(`appinfo exited ${String(install.appinfoCode)}`);
    if (version === null) parts.push({ label: 'install', v: verdict(UNREADABLE, 'the project\'s build number was not read') });
    else if (install.version !== version) p.push(`appinfo reads CFBundleVersion ${J(install.version)}, the project ${J(version)}`);
    parts.push({ label: 'install', v: p.length > 0 ? verdict(FAIL, p.join('; ')) : verdict(PASS, `install 0, appinfo 0, CFBundleVersion ${String(install.version)}`) });
  }
  parts.push({ label: 'R G1', v: gradeRun(drive) });
  parts.push({ label: 'R G3', v: gradeEndMark(row, drive) });
  parts.push({ label: 'R G4', v: row.enrolled ? gradeOwnerCheck(row, drive, { confirm, withDoor: false, inSample: true }) : gradePasscode(row, drive, { confirm, withDoor: false, inSample: true, runtime, notConfirmed }) });
  parts.push({ label: 'R G6', v: gradeTurns([{ label: 'R', drive }]) });
  return worst(parts);
}

/** Each stretch of a drive with the sample open: from `sample-open` to `sample-leaving`. */
function sampleStretches(events) {
  const out = [];
  let cur = null;
  for (const e of events) {
    if (e?.step === 'sample-open') {
      cur = [];
      out.push(cur);
      continue;
    }
    if (e?.step === 'sample-leaving' || e?.step === 'sample-left') {
      cur = null;
      continue;
    }
    if (cur !== null) cur.push(e);
  }
  return out;
}

/** G9: the sample's label everywhere inside it, left onto Pairing, and its End. */
export function gradeSample(row, drive, { confirm, runtime, notConfirmed }) {
  const events = eventsOf(drive);
  const parts = [];
  const stretches = sampleStretches(events);
  if (stretches.length === 0) parts.push({ label: 'label', v: verdict(UNREADABLE, 'the sample was never opened') });
  else {
    const inside = stretches.flat().filter((e) => (e?.step === 'screen' || e?.step === 'sample-inventory') && !deadWindow(e.window));
    const bare = inside.filter((e) => e.sampleLabel !== true).map((e) => (e.step === 'screen' ? String(e.name) : `${e.step}:${String(e.for)}`));
    parts.push({ label: 'label', v: inside.length === 0 ? verdict(UNREADABLE, 'no dump inside the sample') : bare.length > 0 ? verdict(FAIL, `the sample's label is missing from ${bare.join(', ')}`) : verdict(PASS, `in all ${String(inside.length)} dumps inside the sample`) });
  }
  const left = events.filter((e) => e?.step === 'sample-left').at(-1);
  parts.push({ label: 'left', v: left === undefined ? verdict(UNREADABLE, 'no sample-left line') : left.landed === true && left.page === 'pairing' ? verdict(PASS, 'onto Pairing') : verdict(FAIL, `left onto ${J(left.page)} (landed ${String(left.landed)})`) });
  parts.push({ label: 'G3', v: gradeEndMark(row, drive) });
  parts.push({ label: row.enrolled ? 'G4' : 'G5', v: row.enrolled ? gradeOwnerCheck(row, drive, { confirm, withDoor: false, inSample: true }) : gradePasscode(row, drive, { confirm, withDoor: false, inSample: true, runtime, notConfirmed }) });
  return worst(parts);
}

/** G10: the helper's own reading of the device type's biometry. */
export function gradeKind(row, kind) {
  if (kind === undefined) return verdict(FAIL, 'the helper\'s handle carries no biometryKind');
  if (kind === null) return verdict(UNREADABLE, 'the helper could not read the device type\'s capabilities.plist');
  if (kind !== row.kind) return verdict(FAIL, `the device reads ${String(kind)}, the row is ${String(row.kind)}`);
  return verdict(PASS, String(kind));
}

/**
 * Every arm of one row, from what its drives read. `r` holds the drives
 * (P, T, S, R, TP), the install, the kind and the words.
 */
export function gradeRow(row, r) {
  const arms = {};
  const drives = [
    { label: 'P', drive: r.P },
    { label: 'T', drive: r.T },
    { label: 'S', drive: r.S }
  ].filter((x) => x.drive !== undefined && x.drive !== null);
  arms.G1 = worst(drives.map(({ label, drive }) => ({ label, v: gradeRun(drive, { udid: r.udid ?? null }) })));
  arms.G2 = gradeWindow(row, [...drives, ...(r.R ? [{ label: 'R', drive: r.R }] : [])]);
  arms.G3 = r.P ? gradeEndMark(row, r.P) : verdict(UNREADABLE, 'no paired drive');
  if (row.enrolled) arms.G4 = r.P ? gradeOwnerCheck(row, r.P, { confirm: r.talkConfirm, withDoor: true, inSample: false }) : verdict(UNREADABLE, 'no paired drive');
  else arms.G5 = r.P ? gradePasscode(row, r.P, { confirm: r.talkConfirm, withDoor: true, inSample: false, runtime: r.runtime, notConfirmed: r.notConfirmed }) : verdict(UNREADABLE, 'no paired drive');
  arms.G6 = gradeTurns([r.P ? { label: 'P', drive: r.P } : null, r.S ? { label: 'S', drive: r.S } : null].filter(Boolean));
  const parent = row.stated === 'G7' ? parentTurn(row.id, r.TP ?? null) : null;
  const tp = r.TP ? gradeRun(r.TP, { udid: r.udid ?? null }) : null;
  arms.G7 = r.T ? gradeTurn(row, r.T, { parent: tp !== null && tp.grade !== PASS && row.stated === 'G7' ? null : parent }) : verdict(UNREADABLE, 'no turn drive');
  if (row.release) arms.G8 = gradeRelease(row, { install: r.install ?? null, version: r.version ?? null, drive: r.R ?? null, confirm: r.sampleConfirm, runtime: r.runtime, notConfirmed: r.notConfirmed });
  arms.G9 = r.S ? gradeSample(row, r.S, { confirm: r.sampleConfirm, runtime: r.runtime, notConfirmed: r.notConfirmed }) : verdict(UNREADABLE, 'no sample drive');
  arms.G10 = gradeKind(row, r.kind);
  return arms;
}

// ---------------------------------------------------------------------------
// --grader-self-test
// ---------------------------------------------------------------------------

const clone = (x) => structuredClone(x);
const fixture = (name) => readJson(join(FIXTURES, `${name}.json`));
const rowOf = (id) => MATRIX.find((r) => r.id === id);
/** A fixture's drive with `edit` applied to its last attempt's events (and the fixture itself). */
function edited(f, edit) {
  const g = clone(f);
  edit(g.attempts.at(-1).events, g);
  return g;
}
const replaceEvent = (events, pred, change) => {
  const e = events.find(pred);
  if (e === undefined) throw new Error('the self-test edits a line the fixture does not hold');
  change(e);
};

function selfTest() {
  const cases = [];
  const add = (what, got, want) => cases.push({ what, got, want });
  const g = (v) => v.grade;
  const notConfirmed = copyWord('endNotConfirmed');
  const talk = talkConfirm();
  const sample = sampleConfirm();

  // What the tree says.
  add('Copy.endNotConfirmed is read from Copy.swift', notConfirmed, 'Not confirmed. Nothing was changed.');
  add('the talk row\'s confirmation is the vectors\' own', talk?.title, "End 'talk'?");
  add('the sample End\'s confirmation is the live Claude Code\'s', sample?.title, "End 'add-rate-limits'?");
  add('the sample cast is A sample-1, R sample-3, T sample-4', J(sampleCast(sampleBook())), J({ A: 'sample-1', R: 'sample-3', T: 'sample-4' }));
  add('the project\'s build number reads 10 and agrees six times', projectVersion(readFileSync(join(PROJECT, 'project.pbxproj'), 'utf8')), '10');
  add('a project whose builds disagree reads null', projectVersion('CURRENT_PROJECT_VERSION = 10;\nCURRENT_PROJECT_VERSION = 11;\n'), null);
  add('appinfo\'s CFBundleVersion is read', appinfoVersion('    CFBundleVersion = 10;\n'), '10');
  add('a quoted CFBundleVersion is read', appinfoVersion('CFBundleVersion = "10.1";'), '10.1');

  // The matrix and the environment.
  add('the matrix has eleven rows', MATRIX.length, 11);
  add('the rows have eleven ids', new Set(MATRIX.map((r) => r.id)).size, 11);
  add('eight rows carry no UNMEASURED reason', MATRIX.filter((r) => r.unmeasured === undefined).length, 8);
  add('three rows carry one: ipad-27, face-27, duo-27.1', MATRIX.filter((r) => typeof r.unmeasured === 'string' && r.unmeasured.length > 0).map((r) => r.id).join(','), 'ipad-27,face-27,duo-27.1');
  add('the iPad rows name the helper\'s iPad', MATRIX.filter((r) => r.ipad).every((r) => r.deviceType === DEVICE_TYPE_IPAD), true);
  add('the Touch ID iPhone rows name the helper\'s SE', MATRIX.filter((r) => r.id.startsWith('touch-')).every((r) => r.deviceType === DEVICE_TYPE_TOUCH_ID), true);
  add('the none and face rows name the helper\'s iPhone 16 Pro', MATRIX.filter((r) => /^(none|face)-(26|18)$/.test(r.id)).every((r) => r.deviceType === DEVICE_TYPE_NAME), true);
  add('Release is driven on rows 1 to 4 and 7 of the measured eight', MATRIX.filter((r) => r.unmeasured === undefined && r.release).map((r) => r.id).join(','), 'ipad-26,ipad-18,touch-26,touch-18,face-26');
  add('only touch-26 is STATED', MATRIX.filter((r) => r.stated).map((r) => `${r.id}:${r.stated}`).join(','), 'touch-26:G7');
  const here = (row) => (row.unmeasured === undefined ? null : `this Mac has no iOS ${row.runtime} runtime`);
  const plan = (env) => planRows(env, here);
  add('by default the eight measured rows run', plan({}).run.map((r) => r.id).join(','), 'ipad-26,ipad-18,touch-26,touch-18,none-26,none-18,face-26,face-18');
  add('by default the three are UNMEASURED and printed', plan({}).unmeasured.map((u) => u.row.id).join(','), 'ipad-27,face-27,duo-27.1');
  add('P316_RUNTIME=27 runs nothing and refuses', plan({ P316_RUNTIME: '27' }).refuse !== null && plan({ P316_RUNTIME: '27' }).run.length === 0, true);
  add('P316_RUNTIME=27 names the iOS 27 reason', plan({ P316_RUNTIME: '27' }).unmeasured.map((u) => u.row.id).join(','), 'ipad-27,face-27,duo-27.1');
  add('P3334_ROWS=duo-27.1 refuses with nothing to run', plan({ P3334_ROWS: 'duo-27.1' }).refuse !== null && plan({ P3334_ROWS: 'duo-27.1' }).run.length === 0, true);
  add('P3334_ROWS naming no row refuses', plan({ P3334_ROWS: 'ipad-99' }).refuse !== null, true);
  add('P3334_ROWS naming a row and a name no row has refuses the run', plan({ P3334_ROWS: 'face-26,ipad-99' }).refuse !== null && plan({ P3334_ROWS: 'face-26,ipad-99' }).run.length === 0, true);
  add('P3334_ROWS naming a measurable row and an UNMEASURED one refuses the run', plan({ P3334_ROWS: 'face-26,ipad-27' }).refuse !== null && plan({ P3334_ROWS: 'face-26,ipad-27' }).run.length === 0, true);
  add('P3334_ROWS=face-26,ipad-18 runs them in matrix order', plan({ P3334_ROWS: 'face-26,ipad-18' }).run.map((r) => r.id).join(','), 'ipad-18,face-26');
  add('P3334_ROWS naming a row this Mac lacks refuses the run', planRows({ P3334_ROWS: 'face-26' }, () => 'no runtime').refuse !== null, true);
  add('P316_DEVICE=iPad runs the two iPad rows and prints the third', `${plan({ P316_DEVICE: DEVICE_TYPE_IPAD }).run.map((r) => r.id).join(',')}|${plan({ P316_DEVICE: DEVICE_TYPE_IPAD }).unmeasured.map((u) => u.row.id).join(',')}`, 'ipad-26,ipad-18|ipad-27');
  add('P316_DEVICE with P316_RUNTIME=18.3 runs one row', plan({ P316_DEVICE: DEVICE_TYPE_TOUCH_ID, P316_RUNTIME: '18.3' }).run.map((r) => r.id).join(','), 'touch-18');
  add('a device no row names refuses', plan({ P316_DEVICE: 'iPhone 99' }).refuse !== null, true);

  // The steps.
  const cast = sampleCast(sampleBook());
  add('End is `end` on an enrolled row', endStep(rowOf('touch-26')), 'end');
  add('End is `end-passcode:1234` with nothing enrolled', endStep(rowOf('none-18')), 'end-passcode:1234');
  add('an enrolled row is answered by its match', answerFor(rowOf('face-26')), 'match');
  add('a row with nothing enrolled is answered by nothing', answerFor(rowOf('none-26')), 'none');
  add('P holds End between Catch Me Up and first', stepsFor('P', rowOf('none-26'), { sid: 's' }).join(','), 'pair,list,open:s,chrome,catch-up,end-passcode:1234,first,settings,open:s,chrome');
  add('T turns and reads five times after', stepsFor('T', rowOf('face-26'), { sid: 's' }).filter((s) => s === 'chrome' || s === 'portrait').length, AFTER_READINGS + 1);
  add('S types ls -la into the live Codex and Ends the live Claude Code', ['terminal-open:sample-4', 'screen-type:bHMgLWxh', 'terminal-open:sample-3', 'end'].every((s) => stepsFor('S', rowOf('ipad-26'), { cast }).includes(s)), true);
  add('R walks the sample to End and leaves', stepsFor('R', rowOf('touch-18'), { cast }).slice(-5).join(','), 'terminal-open:sample-3,end,tab:settings,sample-inventory:settings,sample-leave');

  // G1.
  const ipadP = fixture('ipad-26-paired');
  const death = fixture('touch-18-sample-death');
  add('G1 ipad-26 paired at the parent', g(gradeRun(ipadP)), PASS);
  add('G1 a <step>-missing dump', g(gradeRun(edited(ipadP, (ev) => ev.splice(-2, 0, { seq: 900, step: 'screen', name: 'first-missing', window: [375, 667] })))), FAIL);
  add('G1 an unknown step', g(gradeRun(edited(ipadP, (ev) => ev.splice(-2, 0, { seq: 900, step: 'unknown-step', name: 'end-passcode:12' })))), FAIL);
  add('G1 no done line', g(gradeRun(edited(ipadP, (ev) => ev.pop()))), FAIL);
  add('G1 the app ended once and the drive again ran whole', g(gradeRun(death)), PASS);
  add('G1 the app ended on both drives', g(gradeRun({ ...death, attempts: [death.attempts[0], death.attempts[0]] })), UNREADABLE);
  add('G1 a drive whose app ended, not driven again', g(gradeRun(fixture('none-18-passcode'))), UNREADABLE);
  add('G1 a drive that printed nothing', g(gradeRun({ attempts: [{ code: 65, events: [] }] })), UNREADABLE);
  add('G1 the app ended during screen-key:return', diedDuring(death.attempts[0].events), 'screen-key:return');
  add('a dead drive is driven again', needsAgain(death.attempts[0].events), true);
  add('a whole drive is not', needsAgain(death.attempts[1].events), false);
  // The fix round: a death read from its crash report, and up to three drives.
  const f3 = fixture('f3-crash-report');
  const f3Udid = /\/Devices\/([0-9A-F-]{36})\//.exec(f3.body.procPath)[1];
  const f3Text = `${J(f3.header)}\n${J(f3.body)}`;
  const appCrash = clone(f3.body);
  appCrash.usedImages.push({ name: 'Tortie' });
  appCrash.threads[0].frames.unshift({ imageIndex: appCrash.usedImages.length - 1, symbol: 'ScreenCell.wide(_:scale:)' });
  const noXct = clone(f3.body);
  noXct.threads[0].frames = noXct.threads[0].frames.filter((fr) => noXct.usedImages[fr.imageIndex]?.name !== 'XCTAutomationSupport');
  const bare = clone(f3.body);
  for (const fr of bare.threads[0].frames) if (bare.usedImages[fr.imageIndex]?.name === 'Tortie') fr.symbol = null;
  add('a real F3 report is read as this app on its device', crashOn(f3Text, f3Udid) !== null, true);
  add('a report of another device is not read', crashOn(f3Text, '00000000-0000-0000-0000-000000000000'), null);
  add('a report of another app is not read', crashOn(`${J({ ...f3.header, bundleID: 'com.example.other' })}\n${J(f3.body)}`, f3Udid), null);
  add('a file that is not a report is not read', crashOn('not a report', f3Udid), null);
  add('a real F3 report is XCUITest\'s', crashClass(f3.body), 'xcuitest');
  add('the same with Tortie\'s entry frames unsymbolicated is still XCUITest\'s', crashClass(bare), 'xcuitest');
  add('a Tortie frame nearer the fault than XCUITest\'s is the app\'s', crashClass(appCrash), 'app');
  add('a crashed thread with no XCUITest frame is the app\'s', crashClass(noXct), 'app');
  add('a report with no crashed thread is the app\'s', crashClass({ threads: [], usedImages: [] }), 'app');
  const since = 1_792_017_000_000;
  const entries = [
    { name: 'Tortie-2026-10-14-172906.ips', mtimeMs: since + 60_000, text: f3Text },
    { name: 'Tortie-2026-10-14-160000.ips', mtimeMs: since - 60_000, text: f3Text },
    { name: 'Other-2026-10-14-172906.ips', mtimeMs: since + 60_000, text: f3Text },
    { name: 'Tortie-2026-10-14-172907.ips', mtimeMs: since + 61_000, text: f3Text.replace(f3Udid, '00000000-0000-0000-0000-000000000000') }
  ];
  add('deathReports keeps this device\'s Tortie report newer than the drive, and nothing else', J(deathReports(entries, f3Udid, since)), J([{ name: 'Tortie-2026-10-14-172906.ips', class: 'xcuitest' }]));
  const died = (d) => ({ ...clone(death.attempts[0]), death: d });
  const f3Death = { during: 'screen-key:return', reports: [{ name: 'Tortie-x.ips', class: 'xcuitest' }] };
  const appDeath = { during: 'screen-key:return', reports: [{ name: 'Tortie-y.ips', class: 'app' }] };
  const silent = { during: 'screen-key:return', reports: [] };
  add('a death that is XCUITest\'s is driven again', driveAgain([died(f3Death)]), true);
  add('a second death that is XCUITest\'s is driven a third time', driveAgain([died(f3Death), died(f3Death)]), true);
  add('never a fourth drive', driveAgain([died(f3Death), died(f3Death), died(f3Death)]), false);
  add('a death that is the app\'s is never driven again', driveAgain([died(appDeath)]), false);
  add('a death with no report is driven again once', driveAgain([died(silent)]), true);
  add('a second death with no report is not', driveAgain([died(f3Death), died(silent)]), false);
  add('a whole drive is not driven again', driveAgain([death.attempts[1]]), false);
  add('G1 two XCUITest deaths, then a whole drive: PASS', g(gradeRun({ attempts: [died(f3Death), died(f3Death), clone(death.attempts[1])] })), PASS);
  add('G1 three XCUITest deaths: UNREADABLE, never PASS', g(gradeRun({ attempts: [died(f3Death), died(f3Death), died(f3Death)] })), UNREADABLE);
  add('G1 a death that is the app\'s: FAIL', g(gradeRun({ attempts: [died(appDeath)] })), FAIL);
  add('G1 the app\'s crash, even with a later whole drive: FAIL', g(gradeRun({ attempts: [died(appDeath), clone(death.attempts[1])] })), FAIL);
  add('G1 a whole drive that xcodebuild failed: UNREADABLE, never PASS', g(gradeRun({ attempts: [{ ...clone(ipadP.attempts.at(-1)), code: 65, firstError: 'P316DriveUITests.swift:1: error: -[P316DriveUITests testDrive] : failed' }] })), UNREADABLE);
  add('G1 the same with the stall that failed it: FAIL', g(gradeRun(edited({ ...ipadP, attempts: [{ ...clone(ipadP.attempts.at(-1)), code: 65 }] }, (ev) => ev.splice(-2, 0, { seq: 900, step: 'screen', name: 'first-missing', window: [375, 667] })))), FAIL);

  // G2.
  const ipad = rowOf('ipad-26');
  const touch26 = rowOf('touch-26');
  const t26 = fixture('touch-26-turn');
  add('G2 ipad-26 paired, the iPad\'s own status bar not compared', g(gradeWindow(ipad, [{ label: 'P', drive: ipadP }])), PASS);
  add('G2 ipad-26 sample and Release', g(gradeWindow(ipad, [{ label: 'S', drive: fixture('ipad-26-sample') }, { label: 'R', drive: fixture('ipad-26-release') }])), PASS);
  add('G2 touch-26 turn: F2 is after the turn, not G2\'s', g(gradeWindow(touch26, [{ label: 'T', drive: t26 }])), PASS);
  add('G2 none-26 at 402 x 874', g(gradeWindow(rowOf('none-26'), [{ label: 'P', drive: fixture('none-26-passcode') }])), PASS);
  add('G2 an iPad dump at the iPhone 16 Pro\'s window', g(gradeWindow(ipad, [{ label: 'P', drive: edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'screen' && e.name === 'list', (e) => { e.window = [402, 874]; })) }])), FAIL);
  add('G2 the navigation bar under the status bar before any turn', g(gradeWindow(touch26, [{ label: 'T', drive: edited(t26, (ev) => replaceEvent(ev, (e) => e.seq === 8, (e) => { e.chrome.nav = [0, 10, 375, 54]; })) }])), FAIL);
  add('G2 a tab bar that does not reach the window\'s bottom', g(gradeWindow(touch26, [{ label: 'T', drive: edited(t26, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.tabBar = [0, 574, 375, 83]; })) }])), FAIL);
  add('G2 frames read inside an open menu are never compared (F5)', eventsOf(ipadP).some((e) => e.step === 'end-bar' && e.nav?.[0] === 79), true);
  add('G2 nothing read', g(gradeWindow(ipad, [{ label: 'P', drive: { attempts: [{ events: [] }] } }])), UNREADABLE);

  // G3.
  const face18P = fixture('face-18-paired');
  const none26 = fixture('none-26-passcode');
  add('G3 Touch ID on the iPad', g(gradeEndMark(ipad, ipadP)), PASS);
  add('G3 Face ID on the iPhone 16 Pro', g(gradeEndMark(rowOf('face-18'), face18P)), PASS);
  add('G3 the lock with nothing enrolled', g(gradeEndMark(rowOf('none-26'), none26)), PASS);
  add('G3 Face ID\'s glyph on a Touch ID device', g(gradeEndMark(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'end-bar', (e) => { e.glyph = 'faceid'; })))), FAIL);
  add('G3 Face ID\'s kind on a Touch ID device', g(gradeEndMark(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'end-bar', (e) => { e.kind = 'faceID'; })))), FAIL);
  add('G3 a Face ID word drawn on a Touch ID device', g(gradeEndMark(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'screen' && e.name === 'session', (e) => { e.elements.push({ id: 'session-end-line', label: 'Use Face ID to end it.' }); })))), FAIL);
  add('G3 End that cannot be pressed with nothing enrolled', g(gradeEndMark(rowOf('none-26'), edited(none26, (ev) => replaceEvent(ev, (e) => e.step === 'end-bar', (e) => { e.enabled = false; })))), FAIL);
  add('G3 a lock on an enrolled row', g(gradeEndMark(rowOf('face-18'), edited(face18P, (ev) => replaceEvent(ev, (e) => e.step === 'end-bar', (e) => { e.kind = 'passcode'; e.glyph = 'lock'; })))), FAIL);
  add('G3 no end-bar', g(gradeEndMark(ipad, edited(ipadP, (ev) => ev.splice(ev.findIndex((e) => e.step === 'end-bar'), 1)))), UNREADABLE);

  // G4.
  const ownP = (row, d) => gradeOwnerCheck(row, d, { confirm: talk, withDoor: true, inSample: false });
  add('G4 ipad-26: the Mac\'s words, Touch ID, one write', g(ownP(ipad, ipadP)), PASS);
  add('G4 face-18: iOS\'s first-use question accepted, one write', g(ownP(rowOf('face-18'), face18P)), PASS);
  const twoWrites = clone(ipadP);
  twoWrites.door.push({ ...endWrites(twoWrites.door)[0] });
  add('G4 two writes', g(ownP(ipad, twoWrites)), FAIL);
  const early = clone(ipadP);
  endWrites(early.door)[0].at = early.marks.auth[0].at - 400;
  add('G4 a write before the answer', g(ownP(ipad, early)), FAIL);
  const refused = clone(ipadP);
  endWrites(refused.door)[0].status = 500;
  add('G4 the write answered 500', g(ownP(ipad, refused)), FAIL);
  const noWrite = clone(ipadP);
  noWrite.door = noWrite.door.filter((e) => e.route !== 'POST /v1/end');
  add('G4 no write', g(ownP(ipad, noWrite)), FAIL);
  add('G4 a dialog not in the Mac\'s words', g(ownP(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'end-dialog', (e) => { e.title = 'End this session?'; })))), FAIL);
  add('G4 no Touch ID prompt seen', g(ownP(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'faceid-permission', (e) => { e.drew = []; })))), FAIL);
  add('G4 a first-use question on a Touch ID iPhone', g(ownP(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'faceid-permission', (e) => { e.seen = true; e.pressed = 'OK'; })))), FAIL);
  add('G4 Face ID\'s first-use question refused', g(ownP(rowOf('face-18'), edited(face18P, (ev) => replaceEvent(ev, (e) => e.step === 'faceid-permission' && e.seen === true, (e) => { e.pressed = 'Don’t Allow'; })))), FAIL);
  add('G4 the owner check not up', g(ownP(ipad, edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'end-auth-up', (e) => { e.confirming = false; })))), FAIL);
  const noMatch = clone(ipadP);
  noMatch.marks.auth[0].code = 1;
  add('G4 the probe\'s match that did not post', g(ownP(ipad, noMatch)), UNREADABLE);
  const ipadS = fixture('ipad-26-sample');
  add('G4 the sample\'s End, gone after', g(gradeOwnerCheck(ipad, ipadS, { confirm: sample, withDoor: false, inSample: true })), PASS);
  add('G4 the sample\'s End still offered after', g(gradeOwnerCheck(ipad, edited(ipadS, (ev) => replaceEvent(ev, (e) => e.step === 'terminal-menu' && e.for === 'end-after', (e) => { e.end = { enabled: true, label: 'End session…' }; })), { confirm: sample, withDoor: false, inSample: true })), FAIL);

  // G5.
  const pc = (row, d, runtime) => gradePasscode(row, d, { confirm: talk, withDoor: true, inSample: false, runtime, notConfirmed });
  const none26Row = rowOf('none-26');
  const none18Row = rowOf('none-18');
  const none18 = fixture('none-18-passcode');
  const notConf = fixture('none-26-not-confirmed');
  add('G5 none-26: SpringBoard\'s field, typed, one write', g(pc(none26Row, none26, '26.3.1')), PASS);
  add('G5 none-18: CoreAuthUI\'s words and field, typed, one write', g(pc(none18Row, none18, '18.3.1')), PASS);
  add('G5 none-26: iOS ended its own check, Not confirmed, no write', g(pc(none26Row, notConf, '26.3.1')), PASS);
  const pcTwo = clone(none26);
  pcTwo.door.push({ ...endWrites(pcTwo.door)[0] });
  add('G5 two writes', g(pc(none26Row, pcTwo, '26.3.1')), FAIL);
  const pcEarly = clone(none26);
  endWrites(pcEarly.door)[0].at = pcEarly.marks.auth[0].at - 50;
  add('G5 a write before the drive could type', g(pc(none26Row, pcEarly, '26.3.1')), FAIL);
  const promptAt = edited(none26, (ev) => replaceEvent(ev, (e) => e.step === 'passcode-prompt', (e) => { e.at = endWrites(none26.door)[0].at + 5; }));
  add('G5 a write before the prompt\'s own clock', g(pc(none26Row, promptAt, '26.3.1')), FAIL);
  const ncWrite = clone(notConf);
  ncWrite.door.push({ route: 'POST /v1/end', status: 200, at: ncWrite.marks.auth[0].at + 10 });
  add('G5 no field found AND a write sent', g(pc(none26Row, ncWrite, '26.3.1')), FAIL);
  add('G5 no field found and End says something else', g(pc(none26Row, edited(notConf, (ev) => replaceEvent(ev, (e) => e.step === 'screen' && e.name === 'end-passcode', (e) => { e.elements = [{ id: 'session-end-line', label: 'Ended.' }]; })), '26.3.1')), FAIL);
  add('G5 the field in SpringBoard on iOS 18.3', g(pc(none18Row, edited(none18, (ev) => { for (const e of ev) if (e.step === 'passcode-prompt' || e.step === 'passcode-typed') e.in = 'springboard'; }), '18.3.1')), FAIL);
  add('G5 CoreAuthUI without its ask', g(pc(none18Row, edited(none18, (ev) => replaceEvent(ev, (e) => e.step === 'passcode-prompt', (e) => { e.texts = ['User Authentication', 'End session', 'Passcode field']; })), '18.3.1')), FAIL);
  add('G5 CoreAuthUI without the press it confirms', g(pc(none18Row, edited(none18, (ev) => replaceEvent(ev, (e) => e.step === 'passcode-prompt', (e) => { e.texts = ['User Authentication', 'Enter iPhone Passcode for “Tortie”', 'Passcode field']; })), '18.3.1')), FAIL);
  add('G5 a field found and nothing typed', g(pc(none26Row, edited(none26, (ev) => ev.splice(ev.findIndex((e) => e.step === 'passcode-typed'), 1)), '26.3.1')), FAIL);
  add('G5 typed where no field was found', g(pc(none26Row, edited(notConf, (ev) => ev.splice(ev.findIndex((e) => e.step === 'passcode-prompt') + 1, 0, { seq: 901, step: 'passcode-typed', for: 'end-passcode', in: 'springboard' })), '26.3.1')), FAIL);
  add('G5 no passcode-prompt line', g(pc(none26Row, edited(none26, (ev) => ev.splice(ev.findIndex((e) => e.step === 'passcode-prompt'), 1)), '26.3.1')), UNREADABLE);
  add('G5 a runtime nothing measured accepts either surface', g(pc(none26Row, none26, '27.0')), PASS);

  // G6.
  add('G6 the paired drive and the sample reach turn 0', g(gradeTurns([{ label: 'P', drive: ipadP }, { label: 'S', drive: ipadS }])), PASS);
  add('G6 turn 0 not reached', g(gradeTurns([{ label: 'P', drive: edited(ipadP, (ev) => replaceEvent(ev, (e) => e.step === 'turns', (e) => { e.indexes = e.indexes.filter((i) => i > 2); })) }])), FAIL);
  add('G6 no turns line', g(gradeTurns([{ label: 'P', drive: edited(ipadP, (ev) => ev.splice(ev.findIndex((e) => e.step === 'turns'), 1)) }])), UNREADABLE);

  // G7.
  const recorded = parentTurn('touch-26');
  const shape = (r) => [r.face, r.window, r.nav, r.menu, r.status, r.grid, r.tabBar, r.tabButtons];
  add('G7 the recorded parent readings after the turn are the kept ones', J(recorded.afters.map(shape)), J(turnReadings(eventsOf(t26)).afters.map(shape)));
  add('G7 the recorded parent reading before the turn is the kept one', J(shape(recorded.before)), J(shape(turnReadings(eventsOf(t26)).before)));
  add('G7 touch-26 at the parent: STATED (F2)', g(gradeTurn(touch26, t26, { parent: recorded })), STATED);
  add('G7 touch-26 with the bars 12 points high', g(gradeTurn(touch26, edited(t26, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 12, 375, 54]; })), { parent: recorded })), FAIL);
  const healed = edited(t26, (ev) => {
    const before = ev.find((e) => e.seq === 8);
    for (const e of ev) if (e.seq > 9 && e.chrome) e.chrome = { ...clone(before.chrome), orientation: 1, menu: e.chrome.menu ? clone(before.chrome.menu) : null, status: e.chrome.status ? clone(before.chrome.status) : null, grid: e.chrome.grid ? clone(before.chrome.grid) : null };
  });
  add('G7 touch-26 reading back exactly: PASS, F2 gone', g(gradeTurn(touch26, healed, { parent: recorded })), PASS);
  add('G7 touch-26 against a live parent that read the same', g(gradeTurn(touch26, t26, { parent: parentTurn('touch-26', t26) })), STATED);
  add('G7 touch-26 against a live parent that read back exactly', g(gradeTurn(touch26, t26, { parent: parentTurn('touch-26', healed) })), FAIL);
  add('G7 touch-26 shifted with no parent reading', g(gradeTurn(touch26, t26, { parent: null })), UNREADABLE);
  const t18 = fixture('touch-18-turn');
  add('G7 touch-18: every frame back', g(gradeTurn(rowOf('touch-18'), t18)), PASS);
  add('G7 touch-18 one point off', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 29, (e) => { e.chrome.grid.frame = [0, 95, 375, 524]; })))), FAIL);
  add('G7 touch-18 with a tab button moved down after the turn', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 10, (e) => { e.chrome.tabButtons[1].frame = [127, 640, 121, 48]; })))), FAIL);
  // The fix round: a button's x and width are iOS's to move after a turn (see tabButtonDifferences).
  add('G7 touch-18 with a tab button only narrower after the turn: not compared', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 10, (e) => { e.chrome.tabButtons[1].frame = [133.5, 619, 108.5, 48]; })))), PASS);
  add('G7 touch-18 with the status line moved after the turn', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.status.frame = [16, 60, 224, 18]; })))), FAIL);
  add('G7 touch-18 with the ⋯ gone after the turn', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 29, (e) => { e.chrome.menu = null; })))), FAIL);
  add('G7 touch-18 shifted like F2 is not STATED', g(gradeTurn(rowOf('touch-18'), edited(t18, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 10, 375, 44]; })))), FAIL);
  const f26 = fixture('face-26-turn');
  add('G7 face-26: sideways [62, 0, 750, 382], every frame back', g(gradeTurn(rowOf('face-26'), f26)), PASS);
  add('G7 face-26 with the bar at 52', g(gradeTurn(rowOf('face-26'), edited(f26, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.nav = [0, 52, 402, 54]; })))), FAIL);
  add('G7 face-26 sideways grid moved', g(gradeTurn(rowOf('face-26'), edited(f26, (ev) => replaceEvent(ev, (e) => e.step === 'landscape', (e) => { e.chrome.grid.frame = [0, 0, 874, 402]; })))), FAIL);
  add('G7 face-26 sideways with a navigation bar', g(gradeTurn(rowOf('face-26'), edited(f26, (ev) => replaceEvent(ev, (e) => e.step === 'landscape', (e) => { e.chrome.nav = [0, 24, 874, 54]; e.chrome.navs = 1; })))), FAIL);
  add('G7 face-18: sideways [62, 0, 750, 381]', g(gradeTurn(rowOf('face-18'), fixture('face-18-turn'))), PASS);
  const i18 = fixture('ipad-18-turn');
  add('G7 ipad-18: the window and every frame stay (F6)', g(gradeTurn(rowOf('ipad-18'), i18)), PASS);
  add('G7 an iPad that turned its window', g(gradeTurn(rowOf('ipad-18'), edited(i18, (ev) => replaceEvent(ev, (e) => e.step === 'landscape', (e) => { e.chrome.window = [667, 375]; })))), FAIL);
  add('G7 an iPad bar moved after the turn', g(gradeTurn(rowOf('ipad-18'), edited(i18, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.nav = [0, 30, 375, 44]; })))), FAIL);
  add('G7 the device not turned', g(gradeTurn(rowOf('face-26'), edited(f26, (ev) => replaceEvent(ev, (e) => e.step === 'landscape', (e) => { e.chrome.orientation = 1; })))), UNREADABLE);
  add('G7 fewer readings after the turn', g(gradeTurn(rowOf('face-26'), edited(f26, (ev) => ev.splice(ev.findIndex((e) => e.seq === 29), 1)))), UNREADABLE);
  // The fix round: iOS widens the tab buttons after a turn now and then, at
  // both builds. Two real drives at HEAD, one in each state, beside the
  // recorded parent, which caught the widening.
  const settled = fixture('touch-26-turn-settled');
  const widened = fixture('face-26-turn-widened');
  const widthsAfter = (f) => turnReadings(eventsOf(f)).afters[0].tabButtons.map((b) => b[2]).join(',');
  add('G7 the settled touch-26 drive reads 100-point buttons after the turn', widthsAfter(settled), '100,100,100');
  add('G7 the recorded parent reads 108.5-point buttons after the turn', recorded.afters[0].tabButtons.map((b) => b[2]).join(','), '108.5,108.5,108.5');
  add('G7 the widened face-26 drive reads 108.33-point buttons after the turn', widthsAfter(widened).split(',').map((w) => w.slice(0, 6)).join(','), '108.33,108.33,108.33');
  add('G7 touch-26, buttons not widened, against the recorded parent: STATED', g(gradeTurn(touch26, settled, { parent: recorded })), STATED);
  add('G7 touch-26, buttons not widened, against a live parent that caught the widening: STATED', g(gradeTurn(touch26, settled, { parent: parentTurn('touch-26', t26) })), STATED);
  add('G7 touch-26, buttons widened, against a live parent that did not: STATED', g(gradeTurn(touch26, t26, { parent: parentTurn('touch-26', settled) })), STATED);
  add('G7 touch-26, buttons not widened, with the bars 12 points high', g(gradeTurn(touch26, edited(settled, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 12, 375, 54]; })), { parent: recorded })), FAIL);
  add('G7 touch-26, buttons not widened, with the grid moved', g(gradeTurn(touch26, edited(settled, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.grid.frame = [0, 96, 375, 488]; })), { parent: recorded })), FAIL);
  add('G7 face-26 with the buttons widened after the turn: PASS', g(gradeTurn(rowOf('face-26'), widened)), PASS);
  add('G7 face-26 widened and the bar moved', g(gradeTurn(rowOf('face-26'), edited(widened, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 52, 402, 54]; })))), FAIL);
  add('G7 face-26 widened and the tab bar moved', g(gradeTurn(rowOf('face-26'), edited(widened, (ev) => replaceEvent(ev, (e) => e.seq === 10, (e) => { e.chrome.tabBar = [0, 780, 402, 94]; })))), FAIL);
  add('G7 a tab button outside the tab bar after the turn', g(gradeTurn(rowOf('face-26'), edited(widened, (ev) => replaceEvent(ev, (e) => e.seq === 10, (e) => { e.chrome.tabButtons[2].frame = [320, 795, 108.33, 54]; })))), FAIL);
  add('G7 a tab button gone after the turn', g(gradeTurn(rowOf('face-26'), edited(widened, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.tabButtons.pop(); })))), FAIL);
  add('G7 a tab button taller after the turn', g(gradeTurn(rowOf('face-26'), edited(widened, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.tabButtons[0].frame = [47, 795, 99.67, 60]; })))), FAIL);

  // G8.
  const ipadR = fixture('ipad-26-release');
  const rel = (f, extra = {}) => gradeRelease(ipad, { install: f.install, version: '10', drive: f, confirm: sample, runtime: f.runtime, notConfirmed, ...extra });
  add('G8 ipad-26 Release: installed, read back, driven', g(rel(ipadR)), PASS);
  add('G8 appinfo with another build', g(rel({ ...clone(ipadR), install: { ...ipadR.install, version: '9' } })), FAIL);
  add('G8 an install that failed', g(rel({ ...clone(ipadR), install: { ...ipadR.install, code: 1 } })), FAIL);
  add('G8 the Release End still offered after', g(rel(edited(ipadR, (ev) => replaceEvent(ev, (e) => e.step === 'terminal-menu' && e.for === 'end-after', (e) => { e.end = { enabled: true, label: 'End session…' }; })))), FAIL);
  add('G8 the Release drive short of turn 0', g(rel(edited(ipadR, (ev) => replaceEvent(ev, (e) => e.step === 'turns', (e) => { e.indexes = [3]; })))), FAIL);
  add('G8 the project\'s build unread', g(rel(ipadR, { version: null })), UNREADABLE);

  // G9.
  const samp = (row, d) => gradeSample(row, d, { confirm: sample, runtime: d.runtime, notConfirmed });
  add('G9 ipad-26 sample', g(samp(ipad, ipadS)), PASS);
  add('G9 touch-18 sample, the drive again after the app ended', g(samp(rowOf('touch-18'), death)), PASS);
  add('G9 a dump inside the sample without its label', g(samp(ipad, edited(ipadS, (ev) => replaceEvent(ev, (e) => e.step === 'screen' && e.name === 'terminal', (e) => { e.sampleLabel = false; })))), FAIL);
  add('G9 the sample left onto the Sessions tab', g(samp(ipad, edited(ipadS, (ev) => replaceEvent(ev, (e) => e.step === 'sample-left', (e) => { e.page = 'sessions'; })))), FAIL);
  add('G9 the sample\'s End under Face ID\'s glyph on the iPad', g(samp(ipad, edited(ipadS, (ev) => replaceEvent(ev, (e) => e.step === 'end-bar', (e) => { e.glyph = 'faceid'; })))), FAIL);
  add('G9 a sample never opened', g(samp(ipad, edited(ipadS, (ev) => ev.splice(ev.findIndex((e) => e.step === 'sample-open'), 1)))), UNREADABLE);

  // G10.
  add('G10 the iPad reads Touch ID', g(gradeKind(ipad, 'touchID')), PASS);
  add('G10 the iPhone 16 Pro with nothing enrolled is still Face ID\'s device', g(gradeKind(none26Row, 'faceID')), PASS);
  add('G10 the iPad read as Face ID', g(gradeKind(ipad, 'faceID')), FAIL);
  add('G10 a handle with no biometryKind', g(gradeKind(ipad, undefined)), FAIL);
  add('G10 says the handle carries none', /carries no biometryKind/.test(gradeKind(ipad, undefined).why), true);
  add('G10 a capabilities.plist that was not read', g(gradeKind(ipad, null)), UNREADABLE);

  // The row's arms together.
  const together = gradeRow(touch26, { T: t26, kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1' });
  add('a touch-26 row reads G7 STATED from the recorded parent', together.G7.grade, STATED);
  add('a parent turn drive that died leaves G7 UNREADABLE', gradeRow(touch26, { T: t26, TP: { attempts: [{ events: [] }] }, kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1' }).G7.grade, UNREADABLE);
  add('worst: FAIL outranks UNREADABLE', worst([{ label: 'a', v: verdict(UNREADABLE, 'x') }, { label: 'b', v: verdict(FAIL, 'y') }]).grade, FAIL);
  add('worst: UNREADABLE outranks STATED', worst([{ label: 'a', v: verdict(STATED, 'x') }, { label: 'b', v: verdict(UNREADABLE, 'y') }]).grade, UNREADABLE);
  add('worst: STATED outranks PASS', worst([{ label: 'a', v: verdict(PASS, 'x') }, { label: 'b', v: verdict(STATED, 'y') }]).grade, STATED);

  let bad = 0;
  for (const c of cases) {
    const ok = c.got === c.want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${String(c.got)}${ok ? '' : ` (wanted ${String(c.want)})`}`);
  }
  const used = readdirSync(FIXTURES).filter((n) => n.endsWith('.json')).length;
  console.log(
    bad === 0
      ? `${TAG} self-test PASS: ${String(cases.length)} cases over ${String(used)} fixtures, every grade green on the parent's own reading and red, or UNREADABLE, on its break.`
      : `${TAG} self-test FAIL: ${String(bad)} of ${String(cases.length)} case(s) graded wrongly.`
  );
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** B0: the harness itself, synchronously, before anything is built or served. */
function preflight() {
  const missing = simulatorHarnessMissing({ runtimes: [RUNTIME_CURRENT] });
  if (missing !== null) {
    console.error(`${TAG} ${missing}`);
    process.exit(2);
  }
}

/** B0 for one row: why this Mac cannot run it, or null. */
function absence(row) {
  if (row.deviceType === null) return row.unmeasured ?? 'the row names no device type';
  const sentence = simulatorHarnessMissing({ runtimes: [row.runtime], deviceType: row.deviceType });
  if (sentence === null) return null;
  return row.unmeasured === undefined ? sentence : `${row.unmeasured} ${sentence}`;
}

/** A directory a person named, refused where simulator-run refuses scratch. */
function refuseOr(dir, what) {
  const why = refuseScratchReason(dir);
  if (why !== null) {
    console.error(`${TAG} ${what}: ${why}`);
    process.exit(2);
  }
  return resolve(dir);
}

/** Start the honest door as its own process; resolves with its facts and a live list of its requests. */
async function startDoor() {
  const { hostileDoorArgv } = await import('../p316/hostile-door.mjs');
  return new Promise((done) => {
    const child = spawn(process.execPath, hostileDoorArgv(['serve', '--arm', 'honest']), {
      cwd: ROOT,
      env: { ...process.env, P316_HOSTILE_INNER: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const requests = [];
    let buf = '';
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const timer = setTimeout(() => finish({ child, facts: null, requests, why: 'the honest door printed nothing in 60 s' }), 60_000);
    child.stdout.on('data', (c) => {
      buf += c.toString('utf8');
      let at;
      while ((at = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        if (line.startsWith('P316_DOOR_EVENT:')) {
          try {
            const e = JSON.parse(line.slice('P316_DOOR_EVENT:'.length));
            if (e?.kind === 'request') requests.push({ route: e.route ?? null, status: e.status ?? null, at: typeof e.at === 'number' ? e.at : Date.now() });
          } catch {
            /* a line that is not JSON is not a request */
          }
        } else if (line.startsWith('P316_DOOR:')) {
          clearTimeout(timer);
          try {
            finish({ child, facts: JSON.parse(line.slice('P316_DOOR:'.length)), requests, why: null });
          } catch {
            finish({ child, facts: null, requests, why: 'the honest door\'s first line was not JSON' });
          }
        }
      }
    });
    child.stderr.on('data', () => undefined);
    child.on('exit', (code) => {
      clearTimeout(timer);
      finish({ child, facts: null, requests, why: `the honest door exited ${String(code)} before it served` });
    });
  });
}

/** End a door child: close its stdin, SIGTERM, then SIGKILL. Only the pid this process started. */
async function endDoor(child) {
  if (child === null || child === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.stdin.end();
  } catch {
    /* already closed */
  }
  child.kill('SIGTERM');
  const deadline = Date.now() + 3_000;
  while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await sleep(100);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

let runCounter = 0;

/**
 * One run of the UI test on `sim`, its lines read live from both channels,
 * the acks written as SPEC §5.4 says, and `end-auth-up` answered as the row
 * asks. Never rejects.
 */
async function driveOnce(sim, ctx, { label, configuration, derivedDataPath, project, steps, env }) {
  runCounter += 1;
  const run = `${String(process.pid)}-${String(runCounter)}`;
  const marker = `P316|${run}|`;
  const linesFile = join(ctx.runDir, 'lines', `${label}-${run}.txt`);
  const acks = join(ctx.runDir, 'acks', `${label}-${run}`);
  mkdirSync(dirname(linesFile), { recursive: true });
  mkdirSync(acks, { recursive: true });
  const events = [];
  const marks = { auth: [] };
  const reactionErrors = [];
  const reactions = [];
  const seen = new Set();
  const ack = (name) => writeFileSync(join(acks, name), 'ok\n');
  const react = async (e) => {
    if (e.seq === undefined) return;
    if (e.step !== 'end-auth-up') {
      for (const prefix of ['screen', 'reply', 'sample', 'setup']) ack(`${prefix}-${String(e.seq)}`);
      return;
    }
    if (answerFor(ctx.row) === 'match') {
      // iOS's prompt settles first, as the spec step measured it.
      await sleep(1000);
      const at = Date.now();
      let code = null;
      let why = null;
      try {
        const r = await sim.biometry('match');
        code = r.code;
        if (r.code !== 0) why = r.stderr.trim().slice(0, 200);
      } catch (err) {
        why = String(err?.message ?? err).slice(0, 200);
      }
      marks.auth.push({ seq: e.seq, for: e.for ?? null, answer: 'match', at, code, why });
    } else {
      // Nothing enrolled: the drive types the passcode itself once it sees this.
      marks.auth.push({ seq: e.seq, for: e.for ?? null, answer: 'none', at: Date.now(), code: null, why: null });
    }
    ack(`auth-${String(e.seq)}`);
  };
  const take = (line) => {
    const at = line.indexOf(marker);
    if (at === -1) return;
    let e;
    try {
      e = JSON.parse(line.slice(at + marker.length).trim());
    } catch {
      return;
    }
    if (e === null || typeof e !== 'object') return;
    if (e.seq !== undefined) {
      if (seen.has(e.seq)) return;
      seen.add(e.seq);
    }
    e.receivedAt = Date.now();
    events.push(e);
    reactions.push(react(e).catch((err) => reactionErrors.push(String(err?.message ?? err))));
  };
  let offset = 0;
  let partial = '';
  const readNew = async () => {
    let buf;
    try {
      buf = await readFileAsync(linesFile);
    } catch {
      return;
    }
    if (buf.length <= offset) return;
    partial += buf.subarray(offset).toString('utf8');
    offset = buf.length;
    let i;
    while ((i = partial.indexOf('\n')) !== -1) {
      take(partial.slice(0, i));
      partial = partial.slice(i + 1);
    }
  };
  let tailing = true;
  const tail = (async () => {
    while (tailing) {
      await readNew();
      await sleep(250);
    }
    await readNew();
  })();
  let r = { code: null, ms: 0, timedOut: false, stdout: '', stderr: '' };
  const startedAt = Date.now();
  try {
    r = await sim.xcodebuild(['test-without-building', '-project', project, '-scheme', SCHEME, '-configuration', configuration, `-only-testing:${UI_TEST}`], {
      label,
      derivedDataPath,
      timeoutMs: 1_200_000,
      resultBundle: false,
      testEnv: { P316_RUN: run, P316_LINES: linesFile, P316_ACKS: acks, P316_WAIT_S: '60', ...env },
      onLine: take
    });
  } catch (err) {
    r = { ...r, why: String(err?.message ?? err) };
  } finally {
    tailing = false;
    await tail;
  }
  await Promise.all(reactions);
  events.sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0));
  return { code: r.code, ms: r.ms, timedOut: r.timedOut === true, startedAt, firstError: r.code === 0 ? null : firstErrorIn(r.logFile), events, marks, reactionErrors, door: null, why: r.why ?? null };
}

/** The first line of a drive's own xcodebuild log that says `error:`, clipped, or null. */
function firstErrorIn(logFile) {
  if (typeof logFile !== 'string') return null;
  try {
    const line = readFileSync(logFile, 'utf8').split('\n').find((l) => /\berror:/.test(l));
    return line === undefined ? null : line.trim().slice(0, 300);
  } catch {
    return null;
  }
}

/**
 * One drive, driven again when its app is not running at its end (SPEC G1,
 * F3, as the fix round reads it): each death's crash report is read from
 * macOS's own DiagnosticReports for the device `udid`, and {@link driveAgain}
 * decides. `attempt(n)` makes one attempt and returns it.
 */
async function driveWithRetry(label, attempt, udid) {
  const attempts = [];
  for (;;) {
    const a = await attempt(attempts.length + 1);
    attempts.push(a);
    say(`  ${label}${attempts.length > 1 ? ` (drive ${String(attempts.length)})` : ''}: exited ${String(a.code)} in ${String(Math.round((a.ms ?? 0) / 1000))} s, ${String(a.events.length)} lines, alive ${String(aliveOf(a.events))}`);
    if (!needsAgain(a.events)) break;
    a.death = { during: diedDuring(a.events), reports: typeof a.startedAt === 'number' ? await readDeath(udid, a.startedAt) : [] };
    const again = driveAgain(attempts);
    say(`  ${label}: the app was not running at the end (during ${a.death.during}; ${deathWords(a.death)})${again ? '; driven again, alone' : '; not driven again'}`);
    if (!again) break;
  }
  return { label, attempts };
}

/** A paired drive (P, T or the parent's T): a fresh honest door, the keychain reset, the drive, the door ended in a `finally`. */
function pairedAttempt(sim, ctx, { label, kind, configuration, derivedDataPath, project }) {
  return async (n) => {
    await sim.simctl('keychain', 'reset');
    let door = null;
    try {
      door = await startDoor();
      if (door.facts === null) return { code: null, ms: 0, events: [], marks: { auth: [] }, reactionErrors: [], door: [], why: door.why };
      ctx.doorConfirm = door.facts.endConfirm ?? ctx.doorConfirm;
      const sid = door.facts.sessionToOpen;
      const steps = stepsFor(kind, ctx.row, { sid });
      const out = await driveOnce(sim, ctx, {
        label: `${label}${n > 1 ? '-again' : ''}`,
        configuration,
        derivedDataPath,
        project,
        steps,
        env: { P316_PAYLOAD: door.facts.payload, P316_STEPS: steps.join(','), P330_DOOR_ENDPOINT: `127.0.0.1:${String(door.facts.port)}` }
      });
      out.door = door.requests.slice();
      out.steps = steps;
      return out;
    } finally {
      await endDoor(door?.child ?? null);
    }
  };
}

/** A drive with no Mac (R and S): See a sample, no code. */
function sampleAttempt(sim, ctx, { label, kind, configuration, derivedDataPath }) {
  return async (n) => {
    await sim.simctl('keychain', 'reset');
    const steps = stepsFor(kind, ctx.row, { cast: ctx.cast });
    const out = await driveOnce(sim, ctx, { label: `${label}${n > 1 ? '-again' : ''}`, configuration, derivedDataPath, project: PROJECT, steps, env: { P316_PAYLOAD: '', P316_STEPS: steps.join(',') } });
    out.steps = steps;
    return out;
  };
}

/** The tail of a refused build's log. */
function logTail(path, lines = 30) {
  try {
    return readFileSync(path, 'utf8').split('\n').filter((l) => /error|fail|refused|Unable/i.test(l)).slice(-lines).join('\n');
  } catch {
    return '(the log could not be read)';
  }
}

async function main() {
  preflight();
  const env = process.env;
  const KEEP = env.P3334_KEEP === '1';
  const plan = planRows(env, absence);
  // Rows 9 to 11 print on every run, with their reasons, whatever was selected.
  const printed = new Set();
  for (const u of plan.unmeasured) {
    printed.add(u.row.id);
    say(`${u.row.id}: UNMEASURED: ${u.why}`);
  }
  for (const row of MATRIX.filter((r) => typeof r.unmeasured === 'string' && !printed.has(r.id) && !plan.run.includes(r))) {
    const why = absence(row);
    say(why === null ? `${row.id}: measurable on this Mac now, and not selected` : `${row.id}: UNMEASURED: ${why}`);
  }
  if (plan.refuse !== null) {
    say(plan.refuse);
    process.exitCode = 2;
    return;
  }
  if (!existsSync(PROJECT)) {
    say(`there is no ${PROJECT}, so there is no app to drive.`);
    process.exitCode = 2;
    return;
  }
  const parentIos = env.P3334_PARENT_IOS ? refuseOr(env.P3334_PARENT_IOS, 'P3334_PARENT_IOS') : null;
  const parentProject = parentIos === null ? null : join(parentIos, 'ios', 'Tortie.xcodeproj');
  if (parentProject !== null && !existsSync(parentProject)) {
    say(`P3334_PARENT_IOS holds no ios/Tortie.xcodeproj (${parentProject}). Nothing was created.`);
    process.exitCode = 2;
    return;
  }

  // A named derived data directory is refused BEFORE anything is made.
  const named = env.P3334_DERIVED_DATA ? refuseOr(env.P3334_DERIVED_DATA, 'P3334_DERIVED_DATA') : null;
  const suffixes = { debug: '-debug', release: '-release', shipping: '-shipping', parent: '-parent' };
  if (named !== null) for (const [name, suffix] of Object.entries(suffixes)) refuseOr(`${named}${suffix}`, `the ${name} derived data`);
  const runDir = mkdtempSync(join(tmpdir(), 'p3334-'));
  const runWhy = refuseScratchReason(runDir);
  if (runWhy !== null) {
    rmSync(runDir, { recursive: true, force: true });
    say(`the run directory ${runWhy}`);
    process.exitCode = 2;
    return;
  }
  const ddBase = named ?? join(runDir, 'dd');
  const DD = Object.fromEntries(Object.entries(suffixes).map(([name, suffix]) => [name, `${ddBase}${suffix}`]));
  const report = { at: new Date().toISOString(), rows: [], unmeasured: plan.unmeasured.map((u) => ({ row: u.row.id, why: u.why })), arms: [] };
  const arms = report.arms;
  const arm = (row, grade, v) => {
    arms.push({ row, grade, verdict: v.grade, why: v.why });
    say(`${row}:${grade} ${v.grade}: ${v.why}`);
  };
  say(`run directory ${runDir}${KEEP ? ' (kept)' : ''}; derived data ${ddBase}-*; rows ${plan.run.map((r) => r.id).join(', ')}`);

  try {
    // B1, the builds. Nothing boots.
    const version = projectVersion(readFileSync(join(PROJECT, 'project.pbxproj'), 'utf8'));
    const builds = [
      { name: 'Debug for testing', dd: DD.debug, project: PROJECT, args: ['build-for-testing', '-configuration', 'Debug'] },
      { name: 'Release for testing', dd: DD.release, project: PROJECT, args: ['build-for-testing', '-configuration', 'Release', 'ENABLE_TESTABILITY=YES'] },
      { name: 'Release as it ships', dd: DD.shipping, project: PROJECT, args: ['build', '-configuration', 'Release'] },
      ...(parentProject === null ? [] : [{ name: 'the parent, Debug for testing', dd: DD.parent, project: parentProject, args: ['build-for-testing', '-configuration', 'Debug'] }])
    ];
    for (const b of builds) {
      const [action, ...rest] = b.args;
      const r = await xcodebuildRun({
        label: b.name.replace(/[^A-Za-z0-9]+/g, '-'),
        scratch: join(runDir, 'xb'),
        derivedDataPath: b.dd,
        args: [action, '-project', b.project, '-scheme', SCHEME, ...rest, '-destination', 'generic/platform=iOS Simulator']
      });
      say(`B1 ${b.name}: exited ${String(r.code)} in ${String(Math.round(r.ms / 1000))} s`);
      if (r.code !== 0) {
        say(`B1 ${b.name} was refused; its log ${r.logFile} ends:\n${logTail(r.logFile)}`);
        process.exitCode = 1;
        return;
      }
    }
    const shippingApp = join(DD.shipping, 'Build', 'Products', 'Release-iphonesimulator', 'Tortie.app');
    const book = sampleBook();
    const cast = sampleCast(book);
    const words = { talk: talkConfirm(), sample: sampleConfirm(book), notConfirmed: copyWord('endNotConfirmed') };

    for (const row of plan.run) {
      const started = Date.now();
      const r = { kind: undefined, udid: null, runtime: null, install: null, version, talkConfirm: words.talk, sampleConfirm: words.sample, notConfirmed: words.notConfirmed };
      const ctx = { row, runDir, cast, doorConfirm: null };
      say(`${row.id}: ${row.deviceType} on iOS ${row.runtime} (${row.why})`);
      try {
        await withSimulator({ label: `p3334-${row.id}`, deviceType: row.deviceType, runtime: row.runtime, scratch: join(runDir, `sim-${row.id}`), derivedDataPath: DD.debug, keep: KEEP }, async (sim) => {
          r.udid = sim.udid;
          r.runtime = sim.runtime;
          // K, the kind, read by the helper from the device type itself.
          r.kind = sim.biometryKind;
          say(`  K: ${String(sim.deviceType)} reads ${String(sim.biometryKind)}`);
          if (row.enrolled) {
            try {
              const e = await sim.biometry('enrol');
              r.enrol = e.code;
              say(`  K: enrolled, exit ${String(e.code)}`);
            } catch (err) {
              r.enrol = String(err?.message ?? err);
              say(`  K: enrolment refused: ${r.enrol}`);
            }
          }
          // R, Release.
          if (row.release) {
            const inst = await sim.simctl('install', shippingApp);
            const info = await sim.simctl('appinfo', BUNDLE_ID);
            r.install = { code: inst.code, appinfoCode: info.code, version: appinfoVersion(info.stdout), why: inst.code === 0 ? null : inst.stderr.trim().slice(0, 300) };
            say(`  R: install exited ${String(inst.code)}, appinfo ${String(info.code)}, CFBundleVersion ${String(r.install.version)}`);
            await sim.simctl('uninstall', BUNDLE_ID);
            r.R = await driveWithRetry('R', sampleAttempt(sim, ctx, { label: `${row.id}-R`, kind: 'R', configuration: 'Release', derivedDataPath: DD.release }), sim.udid);
            await sim.simctl('uninstall', BUNDLE_ID);
          }
          // P, paired.
          r.P = await driveWithRetry('P', pairedAttempt(sim, ctx, { label: `${row.id}-P`, kind: 'P', configuration: 'Debug', derivedDataPath: DD.debug, project: PROJECT }), sim.udid);
          if (ctx.doorConfirm !== null) r.talkConfirm = ctx.doorConfirm;
          // T, the turn.
          r.T = await driveWithRetry('T', pairedAttempt(sim, ctx, { label: `${row.id}-T`, kind: 'T', configuration: 'Debug', derivedDataPath: DD.debug, project: PROJECT }), sim.udid);
          if (parentProject !== null) {
            await sim.simctl('uninstall', BUNDLE_ID);
            r.TP = await driveWithRetry('T at the parent', pairedAttempt(sim, ctx, { label: `${row.id}-TP`, kind: 'T', configuration: 'Debug', derivedDataPath: DD.parent, project: parentProject }), sim.udid);
            await sim.simctl('uninstall', BUNDLE_ID);
          }
          // S, See a sample.
          r.S = await driveWithRetry('S', sampleAttempt(sim, ctx, { label: `${row.id}-S`, kind: 'S', configuration: 'Debug', derivedDataPath: DD.debug }), sim.udid);
        });
      } catch (err) {
        say(`${row.id}: the device could not be made or driven: ${String(err?.message ?? err)}`);
        r.error = String(err?.message ?? err);
      }
      const graded = gradeRow(row, r);
      if (row.enrolled && r.enrol !== undefined && r.enrol !== 0) {
        graded.G4 = worst([{ label: 'enrolment', v: verdict(UNREADABLE, `enrolling exited ${String(r.enrol)}`) }, { label: 'G4', v: graded.G4 }]);
      }
      if (r.error !== undefined) {
        // No device: nothing was read, so nothing is graded. A device that broke mid-row keeps what it read.
        for (const k of Object.keys(graded)) {
          if (r.udid === null || graded[k].grade === PASS) graded[k] = verdict(UNREADABLE, `the row did not finish: ${r.error}`);
        }
      }
      for (const [grade, v] of Object.entries(graded)) arm(row.id, grade, v);
      const turnHere = r.T ? turnReadings(eventsOf(r.T)) : null;
      say(`  T at HEAD:   ${turnLine(turnHere)}`);
      if (r.TP) {
        const tp = gradeRun(r.TP, { udid: r.udid });
        say(`  T at parent: ${turnLine(turnReadings(eventsOf(r.TP)))} (its drive: ${tp.grade}, ${tp.why})`);
      }
      else if (row.stated === 'G7') say(`  T recorded:  ${turnLine(parentTurn(row.id))}`);
      report.rows.push({
        row: row.id,
        deviceType: row.deviceType,
        runtime: r.runtime,
        udid: r.udid,
        kind: r.kind ?? null,
        enrol: r.enrol ?? null,
        install: r.install,
        ms: Date.now() - started,
        drives: Object.fromEntries(
          ['R', 'P', 'T', 'TP', 'S']
            .filter((k) => r[k])
            .map((k) => [k, r[k].attempts.map((a) => ({ code: a.code, ms: a.ms, lines: a.events.length, alive: aliveOf(a.events), steps: a.steps ?? null, writes: endWrites(a.door).map((w) => ({ status: w.status, at: w.at })), marks: a.marks, reactionErrors: a.reactionErrors, firstError: a.firstError ?? null, death: a.death ?? null, why: a.why ?? null }))])
        ),
        turn: { head: turnHere, parent: r.TP ? turnReadings(eventsOf(r.TP)) : null }
      });
    }
  } finally {
    if (!KEEP) {
      rmSync(runDir, { recursive: true, force: true });
      for (const dir of Object.values(DD)) rmSync(dir, { recursive: true, force: true });
    }
  }

  // Counted once, at the end: this run's devices only.
  const mine = countDevicesNamed(`p316-${String(process.pid)}-`);
  const ok = mine.readable && mine.named === 0 && mine.booted === 0;
  arm('run', 'devices', ok ? verdict(PASS, `0 devices named p316-${String(process.pid)}-…, none booted`) : verdict(mine.readable ? FAIL : UNREADABLE, `${String(mine.named)} device(s) named p316-${String(process.pid)}-…, ${String(mine.booted)} booted`));

  const out = join(ROOT, 'out', 'p3334');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'probe-p3334.json'), `${J(report, null, 1)}\n`, 'utf8');
  say(`wrote ${join(out, 'probe-p3334.json')}`);
  const failed = arms.filter((a) => a.verdict === FAIL).length;
  const unread = arms.filter((a) => a.verdict === UNREADABLE).length;
  const stated = arms.filter((a) => a.verdict === STATED).length;
  say(`${String(arms.length)} arms: ${String(arms.length - failed - unread - stated)} PASS, ${String(stated)} STATED, ${String(failed)} FAIL, ${String(unread)} UNREADABLE`);
  process.exitCode = failed > 0 ? 1 : unread > 0 ? 2 : 0;
}

// ---------------------------------------------------------------------------
// The entry, last, so every declaration above is initialised before it runs
// ---------------------------------------------------------------------------

/**
 * Run only as the entry, never on import (the fix round: a verifier that
 * imported this file for its graders started the builds outside any lock).
 * Both sides through realpath, so a run through /tmp's link still counts.
 */
function invokedDirectly() {
  try {
    return process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  if (process.argv.includes('--grader-self-test')) process.exitCode = selfTest();
  else await main();
}
