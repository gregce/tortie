#!/usr/bin/env node
/**
 * probe:p3334 — the phone app driven on the devices App Review uses (Phase
 * 333.4, build/p3334/SPEC.md §5.4; research 136 §7, the charter; widened by
 * Phase 333.4.1, build/p33341/SPEC.md §4.7: G1 reads every drive's crash
 * reports, `touch-26` passes G7, and G11 to G14 and the K drive are new).
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
 *       included, then Leave. Since 333.4.1 it also turns the sample's live
 *       Codex Terminal sideways and back between two inventories
 *       (`sample-inventory:turn-before`, `landscape`, `portrait`,
 *       `sample-inventory:turn-after`), reads the key bar (`keys-read`) and
 *       pans the Terminal sideways at the reading size (`pan-sideways`).
 *   K   the largest text size (Debug, no code, 333.4.1): `P316_TEXT_SIZE=
 *       UICTContentSizeCategoryAccessibilityXXXL`, which the UI test hands to
 *       every launch as UIKit's own argument, and `setup-read, sample-see,
 *       terminal-open:<T>, keys-read`.
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
 *       `error:` named). EVERY drive has its crash reports read, alive or not
 *       (333.4.1, D8): a report is the drive's when it is this app's, its
 *       process path names the row's device, its `procLaunch` is at or after
 *       the drive's start less CRASH_SKEW_MS and its `captureTime` before the
 *       drive's end plus CRASH_WAIT_MS, and its pid and capture time were not
 *       claimed by an earlier drive of the row. A drive whose app is gone, or
 *       that ended with the app running but has a report (XCUITest's crash
 *       the app came back from), DIED: XCUITest's own report (SPEC F3:
 *       XCTAutomationSupport's snapshot code under os_log's quarantine, on
 *       iOS 18.3, at any load) is driven AGAIN on the same device, up to three
 *       drives in all, and its readings are never graded as the app's; a death
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
 *       and every frame (SPEC F6). Since 333.4.1 no row is STATED:
 *       `touch-26` (SPEC F2, the bars 10 points high at the parent) passes
 *       only when it reads back exactly, and its line prints the parent's
 *       reading beside HEAD's (live with P3334_PARENT_IOS, else recorded). A
 *       row a later round marks `stated: 'G7'` passes as STATED only when
 *       every reading after the turn equals the parent's.
 *   G8  Release: install 0, appinfo 0 with the project's build, and the
 *       Release drive's G1, G3, G4 and G6.
 *   G9  the sample: `sample-label` in every dump inside it, left onto
 *       Pairing, and G3 to G5 for the sample's End.
 *   G10 the kind: the helper's `biometryKind` is the row's.
 *   G11 the sample's turn (333.4.1, F2 inside See a sample): in
 *       `sample-inventory:turn-after` the Sample bar, its label, Leave sample,
 *       the navigation bar's `BackButton` and the Terminal's grid each equal
 *       `sample-inventory:turn-before` within 0.5 pt, with the device turned
 *       sideways and back between them (an iPad's window does not turn, F6,
 *       so it reads equal). iOS 18.3 names no `BackButton`; where neither
 *       reading holds one the grid holds the bar's place. At the parent
 *       `touch-26` reads the bar 20 high.
 *   G12 the key bar (333.4.1, D7): in S's `keys-read` (the default size) and
 *       K's (the largest), all ten keys, each inside the window and the bar;
 *       esc and tab at least 33.5 wide, ⇧tab and ctrl at least 41 (their
 *       words' own widths, read sideways where nothing is squeezed); return
 *       at least 59 (its word) or within 0.5 of every arrow's width (its
 *       glyph); and every key's frame at the largest size equal to the
 *       default's within 0.5 (the cap). That the size took is read from K's
 *       own ⋯ menu, whose rows grow with it (Catch Me Up 42 tall at the
 *       default, 118 and more at the largest): a K drive whose rows did not
 *       grow is UNREADABLE, never a pass of the cap.
 *   G13 the fill (333.4.1, D4): every live row of every P and T reading
 *       (the honest door's columns, the vectors' `screen-sample`) is as wide
 *       as the grid on a 2x row (`touch-*`, `ipad-*`), and on a 3x row
 *       (`face-*`, `none-*`) `columns × floor(grid × 3 ÷ columns) ÷ 3` (400
 *       of 402 upright at 120 columns, the parent's); upright the grid is the
 *       window's width. At the parent the SE reads 360.
 *   G14 the lock (333.4.1, D6): in S's `pan-sideways` every live row read
 *       before and after keeps its y within 0.5 pt, and the first of them
 *       moved left by at least 100 pt, or by all the room it had when that is
 *       less (the pan happened). At the parent the rows move down with the
 *       finger (38 pt on the SE).
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
 *                               T is driven over it too, and its reading is
 *                               printed beside HEAD's (and a STATED row, if a
 *                               later round marks one, is compared with it
 *                               rather than the recorded one).
 *   P3334_KEEP=1                keep the run directory: every drive's lines,
 *                               the door's routes and the derived data.
 *
 *   node build/p3334/probe-p3334.mjs --grader-self-test
 *       every grader over the readings in build/p3334/fixtures/, cut from the
 *       spec step's own drives of the parent, each grade red on one broken
 *       reading and green on the honest one; and since 333.4.1's fix round the
 *       retry loop itself, driveWithRetry, DRIVEN over attempts cut from those
 *       readings with a reader of its own that asks the shipping deathReports
 *       over the committed crash report (an attempt alive at its end has its
 *       reports read, unwaited, into the row's claims). It starts nothing.
 *
 * Its cost, from the spec step's runs: three builds (about 20, 60 and 20 s
 * unloaded), then per row a boot (16 to 47 s) and four or five drives (45 to
 * 150 s each), about 8 to 12 minutes a row and 70 to 90 minutes for rows 1 to
 * 8. Measured by the verify round on 2026-10-14: 4,614 s (77 minutes) for rows
 * 1 to 8 with P3334_PARENT_IOS, four builds included. One lock slot, and no
 * other Simulator run beside it (SPEC §13 concern 1). Phase 333.4.1 added a
 * K drive to every row and six steps to S, and its verifier measured it on
 * 2026-10-16: 2,377 s (40 minutes) for touch-26, touch-18 and face-26 with
 * P3334_PARENT_IOS, the four builds 150 s of it (21, 75, 28 and 26 s), so
 * about 11 to 13 minutes a row; face-26 alone with warm derived data, 717 s.
 * A verifier's, never the battery's. It runs only as the entry: importing it
 * for its graders starts nothing.
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
 * `stated` names the grade a row passes as STATED; since 333.4.1 none does
 * (F2 is kept by the app's root). `scale` is the device's pixels per point,
 * which decides G13's fill (2x fills the grid, 3x keeps today's whole-pixel
 * cells). A row with a `unmeasured` reason is measured only when this Mac has
 * its runtime and its device type; row 11 has no measured name, so it never is until a later round
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
      scale: 2,
      window: [375, 667],
      sideways: null,
      why: 'App Review\'s iPad (forums 815079, 820096); the app runs in iPhone compatibility mode'
    },
    { id: 'ipad-18', deviceType: DEVICE_TYPE_IPAD, runtime: '18.3', kind: 'touchID', enrolled: true, release: true, ipad: true, scale: 2, window: [375, 667], sideways: null, why: 'the same on the floor runtime' },
    {
      id: 'touch-26',
      deviceType: DEVICE_TYPE_TOUCH_ID,
      runtime: '26.3',
      kind: 'touchID',
      enrolled: true,
      release: true,
      ipad: false,
      scale: 2,
      window: [375, 667],
      sideways: [0, 0, 667, 375],
      why: '317\'s End on a Touch ID iPhone; F2\'s row'
    },
    { id: 'touch-18', deviceType: DEVICE_TYPE_TOUCH_ID, runtime: '18.3', kind: 'touchID', enrolled: true, release: true, ipad: false, scale: 2, window: [375, 667], sideways: [0, 0, 667, 375], why: 'the same on his phone\'s line (18.x)' },
    { id: 'none-26', deviceType: DEVICE_TYPE_NAME, runtime: '26.3', kind: 'faceID', enrolled: false, release: false, ipad: false, scale: 3, window: [402, 874], sideways: [62, 0, 750, 382], why: 'nothing enrolled: the passcode path (SPEC D9)' },
    { id: 'none-18', deviceType: DEVICE_TYPE_NAME, runtime: '18.3', kind: 'faceID', enrolled: false, release: false, ipad: false, scale: 3, window: [402, 874], sideways: [62, 0, 750, 381], why: 'the same on the floor' },
    { id: 'face-26', deviceType: DEVICE_TYPE_NAME, runtime: '26.3', kind: 'faceID', enrolled: true, release: true, ipad: false, scale: 3, window: [402, 874], sideways: [62, 0, 750, 382], why: 'the control: the row that passes today' },
    { id: 'face-18', deviceType: DEVICE_TYPE_NAME, runtime: '18.3', kind: 'faceID', enrolled: true, release: false, ipad: false, scale: 3, window: [402, 874], sideways: [62, 0, 750, 381], why: 'the control on the floor' },
    { id: 'ipad-27', deviceType: DEVICE_TYPE_IPAD, runtime: '27', kind: 'touchID', enrolled: true, release: true, ipad: true, scale: 2, window: null, sideways: null, why: 'App Review\'s iPad on iOS 27', unmeasured: IOS_27_WHY },
    { id: 'face-27', deviceType: 'iPhone 17 Pro', runtime: '27', kind: 'faceID', enrolled: true, release: true, ipad: false, scale: 3, window: null, sideways: null, why: 'the newest iPhone on iOS 27', unmeasured: IOS_27_WHY },
    {
      id: 'duo-27.1',
      deviceType: null,
      runtime: '27.1',
      kind: null,
      enrolled: true,
      release: true,
      ipad: false,
      scale: null,
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

/** The largest text size (Phase 333.4.1, G12): UIKit's own name, handed to the K drive as P316_TEXT_SIZE. */
export const LARGEST_TEXT = 'UICTContentSizeCategoryAccessibilityXXXL';

const b64u = (text) => Buffer.from(text, 'utf8').toString('base64url');

/** One drive's steps. `sid` is the honest door's session; `cast` the sample's waiting Claude Code (A), live Claude Code (R) and live Codex (T). K is S's key bar again at {@link LARGEST_TEXT}. */
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
        // Phase 333.4.1: G11 (the sample's turn), G12 (the key bar) and G14 (the lock).
        'sample-inventory:turn-before',
        'landscape',
        'portrait',
        'sample-inventory:turn-after',
        'keys-read',
        'pan-sideways',
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
    case 'K':
      // Phase 333.4.1 (G12): the key bar at the largest text size, which the drive's env names.
      return ['setup-read', 'sample-see', `terminal-open:${cast.T}`, 'keys-read'];
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

/** Every CURRENT_PROJECT_VERSION the project writes, in order. */
export function projectVersions(pbxproj) {
  return [...String(pbxproj).matchAll(/CURRENT_PROJECT_VERSION = ([^;\n]+);/g)].map((m) => m[1].trim());
}

/** The project's build number: every CURRENT_PROJECT_VERSION, which must agree, or null. */
export function projectVersion(pbxproj) {
  const all = projectVersions(pbxproj);
  return all.length > 0 && all.every((v) => v === all[0]) ? all[0] : null;
}

/**
 * The build number conformance:ios rule (s) pins, `PHONE_BUILD`, read from
 * build/conformance-ios.mjs AS TEXT (Phase 333.4.1, D10: a literal here went
 * stale when Phase 345 moved the build), or null.
 */
export function pinnedPhoneBuild(text = readFileSync(join(ROOT, 'build', 'conformance-ios.mjs'), 'utf8')) {
  return /export const PHONE_BUILD = '([^']+)'/.exec(String(text))?.[1] ?? null;
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
export const CRASH_WAIT_MS = 10_000;
/** A report written up to this long before the drive's own start is not this drive's. */
export const CRASH_SKEW_MS = 2_000;

/**
 * A crash report's time as the report writes it, `YYYY-MM-DD HH:MM:SS.ffff
 * ±hhmm` (`procLaunch`, `captureTime`), in milliseconds since the epoch, or
 * null when it is not that shape. Pure.
 */
export function ipsTime(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))? ([+-])(\d{2})(\d{2})$/.exec(String(text ?? ''));
  if (m === null) return null;
  const [, y, mo, d, h, mi, sec, frac, sign, oh, om] = m;
  const fraction = frac === undefined ? 0 : Number(`0.${frac}`) * 1000;
  const offset = (Number(oh) * 60 + Number(om)) * 60_000 * (sign === '-' ? -1 : 1);
  const at = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec)) + fraction - offset;
  return Number.isFinite(at) ? at : null;
}

/**
 * One crash report's text (an `.ips`: a JSON header line, then a JSON body)
 * read as the death of THIS app on the device `udid`, or null when it is
 * another app's, another device's, or not a report at all. The body comes
 * back with its pid and its two times read (Phase 333.4.1, D8): `launchedAt`
 * from `procLaunch` and `capturedAt` from `captureTime`, null when unread.
 * Pure.
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
  return { ...body, pid: typeof body.pid === 'number' ? body.pid : null, launchedAt: ipsTime(body.procLaunch), capturedAt: ipsTime(body.captureTime) };
}

/** The key a report is claimed by, once per row: its pid and its capture time as written, or its file's name when it writes neither. */
export const crashKey = (body, name = '') => (typeof body?.pid === 'number' && typeof body?.captureTime === 'string' ? `${String(body.pid)}@${body.captureTime}` : `file:${String(name)}`);

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
 * The reports of this app's deaths on the device `udid` inside one drive's
 * window, from directory entries `{ name, mtimeMs, text }`, each with its
 * class, its pid and its claim key (Phase 333.4.1, D8). A report is the
 * drive's when its process LAUNCHED at or after `sinceMs` less
 * {@link CRASH_SKEW_MS} and it was CAPTURED before `untilMs` plus
 * {@link CRASH_WAIT_MS}, read from the report's own `procLaunch` and
 * `captureTime` (the file's time stands in for a time the report does not
 * write), and its key is not in `claimed`, so no report counts for two drives
 * of a row. The file's time is a first sieve only: a report older than the
 * drive is never opened. Pure.
 */
export function deathReports(entries, udid, sinceMs, untilMs = Infinity, claimed = new Set()) {
  return (entries ?? [])
    .filter((e) => CRASH_NAME.test(String(e?.name)) && typeof e?.mtimeMs === 'number' && e.mtimeMs >= sinceMs - CRASH_SKEW_MS)
    .map((e) => ({ name: e.name, mtimeMs: e.mtimeMs, body: crashOn(e.text, udid) }))
    .filter((e) => e.body !== null)
    .filter((e) => {
      const launched = e.body.launchedAt ?? e.mtimeMs;
      const captured = e.body.capturedAt ?? e.mtimeMs;
      return launched >= sinceMs - CRASH_SKEW_MS && captured < untilMs + CRASH_WAIT_MS && !claimed.has(crashKey(e.body, e.name));
    })
    .map((e) => ({ name: e.name, class: crashClass(e.body), pid: e.body.pid, key: crashKey(e.body, e.name) }));
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
  const names = reports.map((r) => `${r.name}${r.pid === null || r.pid === undefined ? '' : ` (pid ${String(r.pid)})`}`).join(', ');
  const came = death.alive === true ? ', and the app came back (alive 4), so its readings are not the app\'s' : '';
  return deathClass(death) === 'app' ? `${names}, the app's own crash` : `${names}, XCUITest's own crash (SPEC F3)${came}`;
}

/**
 * Whether an attempt DIED (Phase 333.4.1, D8): its app is not running at its
 * end, or it is and a crash report of the app on the row's device falls inside
 * the drive, which is XCUITest's crash the app came back from (the 333.4
 * reverify's R1 `ipad-18`, Tortie-2026-10-15-002047.ips). Pure.
 */
export const diedIn = (attempt) => needsAgain(attempt?.events ?? []) || (attempt?.death?.reports?.length ?? 0) > 0;

/** A drive whose LAST attempt ended with the app running after a crash report inside it (D8): its readings are not the app's. Pure. */
export const cameBack = (drive) => drive?.attempts?.at(-1)?.death?.alive === true;

/**
 * What one attempt's death reads, from its events and the reports
 * {@link deathReports} attributed to it, or undefined when it ran whole with
 * none. Pure.
 */
export function attemptDeath(events, reports) {
  const alive = !needsAgain(events ?? []);
  const found = reports ?? [];
  if (alive && found.length === 0) return undefined;
  return { during: diedDuring(events ?? [], { alive }), alive, reports: found };
}

/**
 * Whether the drive is driven again after its last attempt: only when that
 * attempt died ({@link diedIn}: its app gone, or back after a crash report
 * inside the drive), fewer than {@link DRIVES_AT_MOST} drives were made, and
 * the death is not the app's own; a death that left no report is driven again
 * only after the first drive. Pure.
 */
export function driveAgain(attempts) {
  const last = attempts?.at(-1);
  if (last === undefined || !diedIn(last)) return false;
  if (attempts.length >= DRIVES_AT_MOST) return false;
  const whose = deathClass(last.death);
  if (whose === 'app') return false;
  if (whose === null) return attempts.length === 1;
  return true;
}

/**
 * The crash reports macOS wrote for this app on `udid` inside the drive
 * `sinceMs` to `untilMs` ({@link deathReports}), waited for up to `wait` ms
 * (CRASH_WAIT_MS when the app is gone, 0 when it is running: a crash it came
 * back from was written long before the drive ended). Reads only `Tortie-*.ips`
 * newer than the drive, keeps only those naming that device, and CLAIMS each
 * one it returns in `claimed`, the row's, so no later drive counts it.
 */
async function readDeath(udid, sinceMs, untilMs, { wait = CRASH_WAIT_MS, claimed = new Set() } = {}) {
  const deadline = Date.now() + wait;
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
    const found = deathReports(entries, udid, sinceMs, untilMs, claimed);
    if (found.length > 0 || Date.now() >= deadline) {
      for (const r of found) claimed.add(r.key);
      return found;
    }
    await sleep(1_000);
  }
}

const deadWindow = (w) => Array.isArray(w) && w.length === 2 && w[0] === 0 && w[1] === 0;

/**
 * The step during which the app ended: the first line read with no window,
 * else the first `-missing` dump, else the last line; for a drive whose app
 * came back (`alive`), a step its lines do not show when neither is there.
 */
export function diedDuring(events, { alive = false } = {}) {
  const gone = events.find((e) => deadWindow(e?.window) && e?.step !== 'screen');
  if (gone !== undefined) return `${gone.step}${gone.key ? `:${gone.key}` : gone.letter ? `:${gone.letter}` : ''}`;
  const missing = events.find((e) => e?.step === 'screen' && /-missing$/.test(String(e.name)));
  if (missing !== undefined) return String(missing.name).replace(/-missing$/, '');
  if (alive) return 'a step its lines do not show';
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
  // Phase 333.4.1 (D8): the app was running at the end, but a crash report of
  // its own falls inside the drive, so XCUITest's crash ended it and a later
  // step launched it again: nothing the drive read after is the app's.
  if (diedIn(finalOf(drive))) {
    const during = diedDuring(events, { alive: true });
    if (attempts.length >= 2) {
      return verdict(UNREADABLE, `the app came back after a crash on all ${String(attempts.length)} drives on ${device}, the last during ${during}: ${attempts.map((a, i) => `drive ${String(i + 1)} ${deathWords(a.death)}`).join('; ')}`);
    }
    return verdict(UNREADABLE, `the app came back (alive ${String(RUNNING_FOREGROUND)}) after a crash during ${during} (${deathWords(finalOf(drive)?.death)}) and the drive was not driven again`);
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
  const earlier = attempts.slice(0, -1).map((a, i) => `drive ${String(i + 1)}'s app ${a?.death?.alive === true ? 'came back after a crash' : 'ended'} during ${a?.death?.during ?? diedDuring(a.events ?? [])} (${deathWords(a.death)})`);
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

/**
 * G7, the turn drive, against the parent's readings for a STATED row.
 * `afterReadings` is T's {@link AFTER_READINGS}; only the self-test names
 * fewer, for a kept drive that read fewer (the spec step's `headP`).
 */
export function gradeTurn(row, drive, { parent = null, afterReadings = AFTER_READINGS } = {}) {
  const t = turnReadings(eventsOf(drive));
  if (t === null) return verdict(UNREADABLE, 'no reading before the turn, or no sideways reading');
  if (![3, 4].includes(t.side.orientation)) return verdict(UNREADABLE, `the device was not turned (orientation ${String(t.side.orientation)})`);
  if (t.afters.length < afterReadings) return verdict(UNREADABLE, `${String(t.afters.length)} readings after the turn, not ${String(afterReadings)}`);
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
  // Phase 333.4.1 (D8): a drive whose app came back after XCUITest's crash is read by its G1 alone.
  if (cameBack(drive)) return worst(parts);
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

// ---------------------------------------------------------------------------
// G11 to G14 (Phase 333.4.1, build/p33341/SPEC.md §4.7)
// ---------------------------------------------------------------------------

/**
 * The elements G11 holds across the sample's turn: the Sample bar, its label,
 * Leave sample, the navigation bar's back button and, below the bar, the
 * Terminal's grid. iOS 18.3 gives the back button no `BackButton` identifier
 * (the spec step's 18.3 readings name none; 26.3 names it), so where neither
 * reading holds it the grid, which moves with the bar (158 to 138 at the
 * parent on the SE), holds the bar's place, and the sentence says so.
 */
export const SAMPLE_TURN_IDS = Object.freeze(['sample-bar', 'sample-label', 'sample-leave', 'BackButton', 'screen-grid']);
const UNNAMED_ON_SOME_IOS = new Set(['BackButton']);

/** The first element of an inventory carrying `id`, its frame, or null. */
const inventoryFrame = (inv, id) => {
  const f = (inv?.elements ?? []).find((x) => x?.id === id)?.frame;
  return isFrame(f) ? f : null;
};

/** G11, the sample's turn: S's two inventories either side of a turn sideways and back. */
export function gradeSampleTurn(row, drive) {
  const events = eventsOf(drive);
  const inv = (tag) => events.filter((e) => e?.step === 'sample-inventory' && e.for === tag && e.read === true).at(-1);
  const before = inv('turn-before');
  const after = inv('turn-after');
  if (before === undefined || after === undefined) return verdict(UNREADABLE, 'no sample-inventory:turn-before or turn-after line');
  const side = events.find((e) => e?.step === 'landscape' && e.seq > before.seq && e.seq < after.seq);
  const back = events.find((e) => e?.step === 'portrait' && e.seq > before.seq && e.seq < after.seq);
  if (side === undefined || ![3, 4].includes(side.chrome?.orientation)) return verdict(UNREADABLE, `the device was not turned sideways between the two readings (orientation ${String(side?.chrome?.orientation ?? null)})`);
  if (back === undefined || back.chrome?.orientation !== 1) return verdict(UNREADABLE, `the device was not turned back upright before the second reading (orientation ${String(back?.chrome?.orientation ?? null)})`);
  const problems = [];
  const unread = [];
  if (!sameSize(before.window, after.window)) problems.push(`the window ${J(before.window)} then ${J(after.window)}`);
  const unnamed = [];
  for (const id of SAMPLE_TURN_IDS) {
    const b = inventoryFrame(before, id);
    const a = inventoryFrame(after, id);
    if (b === null && a === null && UNNAMED_ON_SOME_IOS.has(id)) unnamed.push(id);
    else if (b === null) unread.push(`${id} was not read before the turn`);
    else if (a === null) problems.push(`${id} ${fr(b)} before the turn and gone after`);
    else if (!sameFrame(a, b)) problems.push(`${id} ${fr(b)} then ${fr(a)}`);
  }
  if (problems.length > 0) return verdict(FAIL, `after the turn ${problems.join('; ')}`);
  if (unread.length > 0) return verdict(UNREADABLE, unread.join('; '));
  const held = SAMPLE_TURN_IDS.filter((id) => !unnamed.includes(id));
  const note = unnamed.length > 0 ? `; no element is named ${unnamed.join(', ')} on this iOS, so the grid below the bar holds its place` : '';
  return verdict(PASS, `${held.map((id) => `${id} ${fr(inventoryFrame(before, id))}`).join(', ')}, each read back after the turn${row.ipad ? ' (the iPad\'s window does not turn, F6)' : ''}${note}`);
}

/** The key bar's ten keys by their short names (Identifiers.swift's `screen-key-<short>`). */
export const KEY_SHORTS = Object.freeze(['esc', 'tab', 'btab', 'left', 'up', 'down', 'right', 'ctrl', 'return', 'hide']);
const ARROWS = Object.freeze(['left', 'up', 'down', 'right']);
/** The narrowest each key's word is drawn where nothing squeezes it (build/p33341/SPEC.md §2.4, read sideways): esc and tab 34, ⇧tab and ctrl 41.5 (41.3 at 3x), return 60 (59.7). */
export const KEY_FLOORS = Object.freeze({ esc: 33.5, tab: 33.5, btab: 41, ctrl: 41 });
export const RETURN_WORD_FLOOR = 59;
/** How much taller the ⋯ menu's Catch Me Up row must read in K than in S for the largest text size to have taken (42 against 118 and 191.5 measured). */
const SIZE_TOOK_POINTS = 20;

/** A keys-read line's keys by short name. */
const keysByShort = (reading) => Object.fromEntries((reading?.keys ?? []).filter((k) => typeof k?.id === 'string' && k.id.startsWith('screen-key-')).map((k) => [k.id.slice('screen-key-'.length), k]));

/** Everything wrong with one keys-read reading (SPEC §4.7 G12). */
export function keyBarProblems(reading) {
  const keys = keysByShort(reading);
  const problems = [];
  const absent = KEY_SHORTS.filter((k) => !isFrame(keys[k]?.frame));
  if (absent.length > 0) problems.push(`no ${absent.join(', ')} key`);
  const w = Array.isArray(reading?.window) && reading.window.length === 2 ? reading.window : null;
  const bar = isFrame(reading?.bar) ? reading.bar : null;
  if (w === null) problems.push('the window was not read');
  if (bar === null) problems.push('the bar was not read');
  const inside = (f, box) => f[0] >= box[0] - TOLERANCE && f[1] >= box[1] - TOLERANCE && f[0] + f[2] <= box[0] + box[2] + TOLERANCE && f[1] + f[3] <= box[1] + box[3] + TOLERANCE;
  for (const k of KEY_SHORTS) {
    const f = keys[k]?.frame;
    if (!isFrame(f)) continue;
    if (w !== null && !inside(f, [0, 0, w[0], w[1]])) problems.push(`${k} ${fr(f)} outside the window ${J(w)}`);
    if (bar !== null && !inside(f, bar)) problems.push(`${k} ${fr(f)} outside the bar ${fr(bar)}`);
  }
  for (const [k, floor] of Object.entries(KEY_FLOORS)) {
    const f = keys[k]?.frame;
    if (isFrame(f) && f[2] < floor) problems.push(`${k} squeezed to ${fr(f)}, under its word's ${String(floor)}`);
  }
  const ret = keys.return?.frame;
  const arrows = ARROWS.map((k) => keys[k]?.frame).filter(isFrame);
  if (isFrame(ret) && arrows.length === ARROWS.length) {
    const word = ret[2] >= RETURN_WORD_FLOOR;
    const glyph = arrows.every((a) => Math.abs(a[2] - ret[2]) <= TOLERANCE);
    if (!word && !glyph) problems.push(`return ${fr(ret)}: neither its word (at least ${String(RETURN_WORD_FLOOR)}) nor its glyph at an arrow's width (${arrows.map((a) => String(Math.round(a[2] * 100) / 100)).join(', ')})`);
  }
  return problems;
}

/** How return is drawn in a reading: `word`, `glyph`, or null. */
const returnDrawn = (reading) => {
  const f = keysByShort(reading).return?.frame;
  if (!isFrame(f)) return null;
  return f[2] >= RETURN_WORD_FLOOR ? 'word' : 'glyph';
};

/** The height of Catch Me Up's row in the drive's first opened ⋯ menu, or null. */
const menuRowHeight = (events) => {
  const m = events.find((e) => e?.step === 'terminal-menu' && e.opened === true && isFrame(e.catchUp?.frame));
  return m === undefined ? null : m.catchUp.frame[3];
};

/** G12, the key bar: S's `keys-read` at the default text size, K's at {@link LARGEST_TEXT}. */
export function gradeKeys(row, { S, K }) {
  const parts = [];
  const readOf = (drive) => eventsOf(drive).filter((e) => e?.step === 'keys-read').at(-1);
  const sRead = S ? readOf(S) : undefined;
  const kRead = K ? readOf(K) : undefined;
  const one = (label, reading, size) => {
    if (reading === undefined) return { label, v: verdict(UNREADABLE, 'no keys-read line') };
    if (reading.keyboard === false && (reading.keys ?? []).length === 0) return { label, v: verdict(UNREADABLE, 'the keyboard did not rise, so no key was read') };
    if ((reading.textSize ?? null) !== size) return { label, v: verdict(UNREADABLE, `the drive carried the text size ${J(reading.textSize ?? null)}, not ${J(size)}`) };
    const p = keyBarProblems(reading);
    return { label, v: p.length > 0 ? verdict(FAIL, p.join('; ')) : verdict(PASS, `every word at its own width, return as its ${String(returnDrawn(reading))}`) };
  };
  parts.push(one('default', sRead, null));
  parts.push(one('largest', kRead, LARGEST_TEXT));
  if (sRead !== undefined && kRead !== undefined) {
    const sh = menuRowHeight(eventsOf(S));
    const kh = menuRowHeight(eventsOf(K));
    if (sh === null || kh === null) parts.push({ label: 'took', v: verdict(UNREADABLE, 'the ⋯ menu was not read in both drives, so whether the largest text size took is unknown') });
    else if (kh < sh + SIZE_TOOK_POINTS) parts.push({ label: 'took', v: verdict(UNREADABLE, `Catch Me Up's row reads ${String(Math.round(kh * 100) / 100)} tall at the largest size and ${String(Math.round(sh * 100) / 100)} at the default: the size did not take, so the cap was not tested`) });
    else {
      parts.push({ label: 'took', v: verdict(PASS, `Catch Me Up's row ${String(Math.round(kh * 100) / 100)} tall against ${String(Math.round(sh * 100) / 100)}`) });
      const sk = keysByShort(sRead);
      const kk = keysByShort(kRead);
      const moved = KEY_SHORTS.filter((k) => isFrame(sk[k]?.frame) && isFrame(kk[k]?.frame) && !sameFrame(sk[k].frame, kk[k].frame)).map((k) => `${k} ${fr(sk[k].frame)} then ${fr(kk[k].frame)}`);
      parts.push({ label: 'cap', v: moved.length > 0 ? verdict(FAIL, `the bar moved at the largest text size: ${moved.join('; ')}`) : verdict(PASS, 'every key\'s frame at the largest size is the default\'s') });
    }
  }
  return worst(parts);
}

/** The honest door's columns: the vectors' `screen-sample`, which the door serves to P and T. */
export function doorColumns() {
  const vectors = readJson(join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json'));
  return JSON.parse(vectors.answers['screen-sample'].json).screen?.cols ?? null;
}

/**
 * The width a fitted row must read in a grid `width` points wide (SPEC D4):
 * below 3x the grid's own width, every column edge on a pixel; at 3x today's
 * cell, its width snapped down to a pixel, `columns × floor(width × 3 ÷
 * columns) ÷ 3`.
 */
export function fittedRowWidth(scale, width, columns) {
  if (typeof width !== 'number' || typeof columns !== 'number' || columns <= 0) return null;
  if (scale === 2) return width;
  if (scale === 3) return (columns * Math.floor((width * 3) / columns + 1e-9)) / 3;
  return null;
}

/** G13, the fill: every live row of every P and T reading against {@link fittedRowWidth}. `drives` is [{ label, drive }]. */
export function gradeFill(row, drives, { columns }) {
  if (row.scale !== 2 && row.scale !== 3) return verdict(UNREADABLE, `the row names no scale (${J(row.scale ?? null)})`);
  if (typeof columns !== 'number') return verdict(UNREADABLE, 'the honest door\'s columns were not read');
  const problems = [];
  const wants = new Set();
  let read = 0;
  for (const { label, drive } of drives) {
    for (const e of eventsOf(drive)) {
      if (!['chrome', 'landscape', 'portrait'].includes(e?.step) || !e.chrome) continue;
      const live = (e.reading?.live ?? []).filter((r) => isFrame(r?.frame));
      if (live.length === 0) continue;
      const grid = isFrame(e.chrome.grid?.frame) ? e.chrome.grid.frame : isFrame(e.reading?.grid) ? e.reading.grid : null;
      if (grid === null) continue;
      read += 1;
      const upright = ![3, 4].includes(e.chrome.orientation);
      const w = e.chrome.window;
      if (upright && Array.isArray(w) && Math.abs(grid[2] - w[0]) > TOLERANCE) problems.push(`${label} ${e.step} ${String(e.seq)}: the grid ${fr(grid)} is not the window's ${String(w[0])} wide`);
      const want = fittedRowWidth(row.scale, grid[2], columns);
      wants.add(`${String(Math.round(want * 100) / 100)} in ${String(Math.round(grid[2] * 100) / 100)}`);
      const off = [...new Set(live.filter((r) => Math.abs(r.frame[2] - want) > TOLERANCE).map((r) => Math.round(r.frame[2] * 100) / 100))];
      if (off.length > 0) problems.push(`${label} ${e.step} ${String(e.seq)}: rows ${off.join(', ')} wide in a ${String(Math.round(grid[2] * 100) / 100)}-point grid, not ${String(Math.round(want * 100) / 100)}`);
    }
  }
  if (read === 0) return verdict(UNREADABLE, 'no reading drew a live row');
  if (problems.length > 0) return verdict(FAIL, `${String(row.scale)}x at ${String(columns)} columns: ${problems.join('; ')}`);
  return verdict(PASS, `${String(read)} readings at ${String(columns)} columns, ${String(row.scale)}x: every live row ${[...wants].join(', ')}`);
}

/** How far left the first live row must move for the pan to count (SPEC §4.7 G14), or all the room it had when that is less. */
export const PAN_LEFT_AT_LEAST = 100;
/** Less room than this and a sideways pan cannot be told from none. */
const PAN_ROOM_AT_LEAST = 20;

/** G14, the lock: S's `pan-sideways`, the rows before and after one slow drag 30 points down along its way. */
export function gradeLock(row, drive) {
  const pan = eventsOf(drive).filter((e) => e?.step === 'pan-sideways').at(-1);
  if (pan === undefined) return verdict(UNREADABLE, 'no pan-sideways line');
  if (pan.before?.face !== 'terminal' || pan.after?.face !== 'terminal') return verdict(UNREADABLE, `the pan was not read on the Terminal (${J(pan.before?.face ?? null)}, ${J(pan.after?.face ?? null)})`);
  const byN = (reading) => new Map((reading?.live ?? []).filter((r) => typeof r?.n === 'number' && isFrame(r.frame)).map((r) => [r.n, r.frame]));
  const b = byN(pan.before);
  const a = byN(pan.after);
  const common = [...b.keys()].filter((n) => a.has(n)).sort((x, y) => x - y);
  if (common.length === 0) return verdict(UNREADABLE, 'no live row was read both before and after the pan');
  const grid = isFrame(pan.before.grid) ? pan.before.grid : null;
  const first = common[0];
  const fb = b.get(first);
  const fa = a.get(first);
  const room = grid === null ? null : fb[0] + fb[2] - (grid[0] + grid[2]);
  if (room === null) return verdict(UNREADABLE, 'the grid was not read before the pan');
  if (room < PAN_ROOM_AT_LEAST) return verdict(UNREADABLE, `the first live row ${fr(fb)} had ${String(Math.round(room * 100) / 100)} points to move left in the grid ${fr(grid)}, too little to tell a pan from none`);
  const need = Math.min(PAN_LEFT_AT_LEAST, room);
  const left = fb[0] - fa[0];
  const problems = [];
  const drifted = common.filter((n) => Math.abs(a.get(n)[1] - b.get(n)[1]) > TOLERANCE);
  if (drifted.length > 0) {
    const n = drifted[0];
    problems.push(`${String(drifted.length)} of ${String(common.length)} rows moved up or down with the finger, row ${String(n)} from y ${String(b.get(n)[1])} to ${String(a.get(n)[1])}`);
  }
  if (left < need - TOLERANCE) problems.push(`the first live row moved ${String(Math.round(left * 100) / 100)} points left, not at least ${String(Math.round(need * 100) / 100)}: the Terminal did not pan sideways`);
  if (problems.length > 0) return verdict(FAIL, problems.join('; '));
  return verdict(PASS, `the first live row ${fr(fb)} then ${fr(fa)}: ${String(Math.round(left * 100) / 100)} points left, and all ${String(common.length)} rows read both times kept their y`);
}

/**
 * Every arm of one row, from what its drives read. `r` holds the drives
 * (P, T, S, K, R, TP), the install, the kind, the words and, since 333.4.1,
 * the honest door's columns (`columns`, read from the vectors when absent).
 */
export function gradeRow(row, r) {
  const arms = {};
  const drives = [
    { label: 'P', drive: r.P },
    { label: 'T', drive: r.T },
    { label: 'S', drive: r.S },
    { label: 'K', drive: r.K }
  ].filter((x) => x.drive !== undefined && x.drive !== null);
  arms.G1 = worst(drives.map(({ label, drive }) => ({ label, v: gradeRun(drive, { udid: r.udid ?? null }) })));
  // Phase 333.4.1 (D8): a drive whose app came back after XCUITest's crash is
  // read by G1 (and G8's own G1) alone; every other arm grades without it and
  // says so, so nothing it read after the crash is graded as the app's.
  const use = (k) => (cameBack(r[k]) ? null : r[k] ?? null);
  const back = (keys, v) => {
    const gone = keys.filter((k) => cameBack(r[k]));
    if (gone.length === 0) return v;
    return worst([{ label: 'read', v }, ...gone.map((k) => ({ label: k, v: verdict(UNREADABLE, `the ${k} drive's app came back after XCUITest's crash on its last drive, so none of its readings is the app's`) }))]);
  };
  const P = use('P');
  const T = use('T');
  const S = use('S');
  const K = use('K');
  const graded = [{ label: 'P', drive: P }, { label: 'T', drive: T }, { label: 'S', drive: S }, { label: 'K', drive: K }].filter((x) => x.drive !== null);
  arms.G2 = back(['P', 'T', 'S', 'K', 'R'], gradeWindow(row, [...graded, ...(use('R') ? [{ label: 'R', drive: use('R') }] : [])]));
  arms.G3 = back(['P'], P ? gradeEndMark(row, P) : verdict(UNREADABLE, 'no paired drive'));
  if (row.enrolled) arms.G4 = back(['P'], P ? gradeOwnerCheck(row, P, { confirm: r.talkConfirm, withDoor: true, inSample: false }) : verdict(UNREADABLE, 'no paired drive'));
  else arms.G5 = back(['P'], P ? gradePasscode(row, P, { confirm: r.talkConfirm, withDoor: true, inSample: false, runtime: r.runtime, notConfirmed: r.notConfirmed }) : verdict(UNREADABLE, 'no paired drive'));
  arms.G6 = back(['P', 'S'], gradeTurns([P ? { label: 'P', drive: P } : null, S ? { label: 'S', drive: S } : null].filter(Boolean)));
  const parent = row.stated === 'G7' ? parentTurn(row.id, r.TP ?? null) : null;
  const tp = r.TP ? gradeRun(r.TP, { udid: r.udid ?? null }) : null;
  arms.G7 = back(['T'], T ? gradeTurn(row, T, { parent: tp !== null && tp.grade !== PASS && row.stated === 'G7' ? null : parent }) : verdict(UNREADABLE, 'no turn drive'));
  if (row.release) arms.G8 = gradeRelease(row, { install: r.install ?? null, version: r.version ?? null, drive: r.R ?? null, confirm: r.sampleConfirm, runtime: r.runtime, notConfirmed: r.notConfirmed });
  arms.G9 = back(['S'], S ? gradeSample(row, S, { confirm: r.sampleConfirm, runtime: r.runtime, notConfirmed: r.notConfirmed }) : verdict(UNREADABLE, 'no sample drive'));
  arms.G10 = gradeKind(row, r.kind);
  arms.G11 = back(['S'], S ? gradeSampleTurn(row, S) : verdict(UNREADABLE, 'no sample drive'));
  arms.G12 = back(['S', 'K'], S || K ? gradeKeys(row, { S, K }) : verdict(UNREADABLE, 'no sample drive and no K drive'));
  const fill = [P ? { label: 'P', drive: P } : null, T ? { label: 'T', drive: T } : null].filter(Boolean);
  arms.G13 = back(['P', 'T'], fill.length > 0 ? gradeFill(row, fill, { columns: r.columns === undefined ? doorColumns() : r.columns }) : verdict(UNREADABLE, 'no paired drive and no turn drive'));
  arms.G14 = back(['S'], S ? gradeLock(row, S) : verdict(UNREADABLE, 'no sample drive'));
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

async function selfTest() {
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
  const pbx = readFileSync(join(PROJECT, 'project.pbxproj'), 'utf8');
  const pinned = pinnedPhoneBuild();
  add('PHONE_BUILD is read from build/conformance-ios.mjs as text', typeof pinned === 'string' && /^\d+$/.test(pinned), true);
  add('the project\'s build number agrees six times with PHONE_BUILD', `${String(projectVersions(pbx).length)} x ${String(projectVersion(pbx))}`, `6 x ${String(pinned)}`);
  add('a PHONE_BUILD line that is not there reads null', pinnedPhoneBuild('export const PHONE_BUILD = 11;'), null);
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
  add('no row is STATED since 333.4.1 (F2 kept by the root)', MATRIX.filter((r) => r.stated).map((r) => `${r.id}:${r.stated}`).join(','), '');
  add('the 2x rows are the Touch ID iPhone\'s and the iPad\'s, the 3x the iPhone 16 Pro\'s', ['touch', 'ipad', 'face', 'none'].map((k) => `${k}:${[...new Set(MATRIX.filter((r) => r.id.startsWith(`${k}-`)).map((r) => r.scale))].join('/')}`).join(','), 'touch:2,ipad:2,face:3,none:3');
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
  const sSteps = stepsFor('S', rowOf('touch-26'), { cast });
  const atT = sSteps.indexOf(`terminal-open:${cast.T}`);
  add('S turns the live Codex, reads its key bar and pans it, right after opening it', sSteps.slice(atT, atT + 7).join(','), 'terminal-open:sample-4,sample-inventory:turn-before,landscape,portrait,sample-inventory:turn-after,keys-read,pan-sideways');
  add('K reads the live Codex\'s key bar and nothing else', stepsFor('K', rowOf('ipad-26'), { cast }).join(','), 'setup-read,sample-see,terminal-open:sample-4,keys-read');
  add('K asks UIKit\'s largest text size by its own name', LARGEST_TEXT, 'UICTContentSizeCategoryAccessibilityXXXL');
  // The UI test is the probe's hands: every step the probe names is one it dispatches.
  const uiTest = readFileSync(join(ROOT, 'ios', 'TortieUITests', 'P316DriveUITests.swift'), 'utf8');
  const named = [...new Set(['R', 'P', 'T', 'S', 'K'].flatMap((k) => stepsFor(k, rowOf('touch-26'), { sid: 's', cast })))];
  const unknownToUi = named.filter((st) => (st.includes(':') ? !uiTest.includes(`step.hasPrefix("${st.slice(0, st.indexOf(':') + 1)}")`) : !uiTest.includes(`step == "${st}"`)));
  add('the UI test dispatches every step the probe names', unknownToUi.join(','), '');
  add('the UI test hands P316_TEXT_SIZE to UIKit by its own argument', /env\["P316_TEXT_SIZE"\]/.test(uiTest) && uiTest.includes('"-UIPreferredContentSizeCategoryName"'), true);

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
  add('deathReports keeps this device\'s Tortie report newer than the drive, and nothing else', J(deathReports(entries, f3Udid, since)), J([{ name: 'Tortie-2026-10-14-172906.ips', class: 'xcuitest', pid: null, key: 'file:Tortie-2026-10-14-172906.ips' }]));
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
  // Phase 333.4.1 (D8): every drive's reports read, alive or not, by device, time and pid.
  const aliveReport = fixture('g1-alive-crash-report');
  const aliveUdid = /\/Devices\/([0-9A-F-]{36})\//.exec(aliveReport.body.procPath)[1];
  const aliveText = `${J(aliveReport.header)}\n${J(aliveReport.body)}`;
  const launched = ipsTime(aliveReport.body.procLaunch);
  const captured = ipsTime(aliveReport.body.captureTime);
  add('a report\'s time is read as it writes it, its zone applied', launched, Date.UTC(2026, 9, 15, 4, 18, 44) + 73.7);
  add('the alive report\'s capture time', captured, Date.UTC(2026, 9, 15, 4, 20, 30) + 222);
  add('a time in another shape is not read', ipsTime('2026-10-15T00:18:44Z'), null);
  add('the alive report is this app\'s on its device, pid 21356', crashOn(aliveText, aliveUdid)?.pid, 21356);
  add('the alive report is XCUITest\'s (SPEC F3)', crashClass(aliveReport.body), 'xcuitest');
  const aliveEntry = { name: 'Tortie-2026-10-15-002047.ips', mtimeMs: captured + 500, text: aliveText };
  const aliveSince = launched - 30_000;
  const aliveUntil = captured + 5_000;
  const inWindow = deathReports([aliveEntry], aliveUdid, aliveSince, aliveUntil);
  add('a report inside the drive is the drive\'s', J(inWindow.map((r) => [r.name, r.class, r.pid])), J([['Tortie-2026-10-15-002047.ips', 'xcuitest', 21356]]));
  add('a report whose app launched before the drive is not the drive\'s', deathReports([aliveEntry], aliveUdid, launched + CRASH_SKEW_MS + 1, aliveUntil).length, 0);
  add('a report captured after the drive and its wait is not the drive\'s', deathReports([aliveEntry], aliveUdid, aliveSince, captured - CRASH_WAIT_MS - 1).length, 0);
  add('a report on another device is not the drive\'s', deathReports([aliveEntry], '00000000-0000-0000-0000-000000000000', aliveSince, aliveUntil).length, 0);
  add('a report is claimed by its pid and its capture time', inWindow[0].key, '21356@2026-10-15 00:20:30.2220 -0400');
  add('a report an earlier drive of the row claimed is not counted again', deathReports([aliveEntry], aliveUdid, aliveSince, aliveUntil, new Set([inWindow[0].key])).length, 0);
  const whole = clone(ipadP.attempts.at(-1));
  const withReports = (reports) => ({ ...clone(whole), death: attemptDeath(whole.events, reports) });
  const backAgain = withReports(inWindow);
  add('an alive drive with XCUITest\'s report inside it DIED', diedIn(backAgain) && backAgain.death.alive === true, true);
  add('an alive drive with XCUITest\'s report inside it is driven again', driveAgain([backAgain]), true);
  const outside = withReports(deathReports([aliveEntry], aliveUdid, launched + CRASH_SKEW_MS + 1, aliveUntil));
  add('an alive drive whose report fell outside it ran whole and is not driven again', outside.death === undefined && driveAgain([outside]) === false, true);
  add('G1 an alive drive with no report inside it: PASS', g(gradeRun({ attempts: [outside] })), PASS);
  const elsewhere = withReports(deathReports([aliveEntry], '00000000-0000-0000-0000-000000000000', aliveSince, aliveUntil));
  add('an alive drive with a report on another device is not driven again', driveAgain([elsewhere]), false);
  const appBody = clone(aliveReport.body);
  appBody.usedImages.push({ name: 'Tortie' });
  appBody.threads[0].frames.unshift({ imageIndex: appBody.usedImages.length - 1, symbol: 'ScreenCell.x(_:)' });
  const appAlive = withReports(deathReports([{ ...aliveEntry, text: `${J(aliveReport.header)}\n${J(appBody)}` }], aliveUdid, aliveSince, aliveUntil));
  add('an alive drive with the app\'s own report is never driven again', driveAgain([appAlive]), false);
  add('G1 an alive drive with the app\'s own report: FAIL', g(gradeRun({ attempts: [appAlive] })), FAIL);
  add('G1 an alive XCUITest death not driven again: UNREADABLE, never PASS', g(gradeRun({ attempts: [backAgain] })), UNREADABLE);
  add('G1 an alive XCUITest death, then a whole drive: PASS', g(gradeRun({ attempts: [backAgain, clone(whole)] })), PASS);
  add('G1 three alive XCUITest deaths: UNREADABLE, never PASS', g(gradeRun({ attempts: [backAgain, backAgain, backAgain] })), UNREADABLE);
  add('G1 says the app came back after a crash', /came back after a crash/.test(gradeRun({ attempts: [backAgain, backAgain, backAgain] }).why), true);
  add('never a fourth drive after three alive deaths', driveAgain([backAgain, backAgain, backAgain]), false);
  add('a drive whose last attempt came back is read as such', cameBack({ attempts: [backAgain] }) && !cameBack({ attempts: [backAgain, clone(whole)] }), true);
  const backS = { attempts: [backAgain, backAgain, backAgain].map((a) => ({ ...clone(fixture('touch-26-parent-sample-turn').attempts[0]), death: a.death })) };
  add('the sample read after the crash would FAIL G11 as the app\'s', g(gradeSampleTurn(rowOf('touch-26'), { attempts: [backS.attempts.at(-1)] })), FAIL);
  const backRow = gradeRow(rowOf('touch-26'), { S: backS, kind: 'touchID', talkConfirm: talkConfirm(), sampleConfirm: sampleConfirm(), notConfirmed: copyWord('endNotConfirmed'), runtime: '26.3.1' });
  add('a sample drive that came back after XCUITest\'s crash: G11 UNREADABLE, never graded as the app\'s', backRow.G11.grade, UNREADABLE);
  add('...and says why', /came back after XCUITest's crash/.test(backRow.G11.why), true);
  add('...and its G1 is UNREADABLE', backRow.G1.grade, UNREADABLE);
  // The run's own loop, DRIVEN (Phase 333.4.1's fix round): driveWithRetry
  // over attempts cut from the fixtures and a reader of its own that asks the
  // shipping deathReports over the committed report, the directory left out.
  // Reports are read after EVERY attempt, alive or not, waited for only when
  // the app is gone, into the row's own claims, before the loop may end.
  const retryOf = async (attempts, window) => {
    const rowClaims = new Set();
    const reads = [];
    const told = [];
    const read = async (u, since, until, opts) => {
      reads.push({ u, wait: opts?.wait, rowClaims: opts?.claimed === rowClaims });
      const found = deathReports(window.entries, u, since, until, opts?.claimed ?? new Set());
      for (const r of found) opts?.claimed?.add(r.key);
      return found;
    };
    const attempt = async (n) => ({ ...clone(attempts[Math.min(n, attempts.length) - 1]), startedAt: window.since, endedAt: window.until });
    const drive = await driveWithRetry('self-test', attempt, window.udid, rowClaims, { read, tell: (line) => told.push(line) });
    return { drive, reads, told };
  };
  const alongside = { entries: [aliveEntry], udid: aliveUdid, since: aliveSince, until: aliveUntil };
  const aliveBack = await retryOf([whole, whole], alongside);
  add('an alive drive with XCUITest\'s report inside it has its reports read and is driven again', aliveBack.drive.attempts.length, 2);
  add('...its first attempt came back after that one report, the second ran whole', aliveBack.drive.attempts.length === 2 && aliveBack.drive.attempts[0].death?.alive === true && aliveBack.drive.attempts[0].death.reports.length === 1 && aliveBack.drive.attempts[1].death === undefined, true);
  add('...every read of a running app waited 0 ms', J(aliveBack.reads.map((r) => r.wait)), J([0, 0]));
  add('...and says the app was running after a crash, driven again', aliveBack.told.some((l) => /running at the end, after a crash inside the drive.*driven again, alone/.test(l)), true);
  add('...G1 PASS on the second drive', g(gradeRun(aliveBack.drive)), PASS);
  const deadBack = await retryOf([death.attempts[0], whole], alongside);
  add('a dead drive\'s reports are waited for CRASH_WAIT_MS and the whole drive after it\'s are not', J(deadBack.reads.map((r) => r.wait)), J([CRASH_WAIT_MS, 0]));
  add('...two attempts, G1 PASS', `${String(deadBack.drive.attempts.length)} ${g(gradeRun(deadBack.drive))}`, `2 ${PASS}`);
  const aliveClean = await retryOf([whole], { ...alongside, since: launched + CRASH_SKEW_MS + 1 });
  add('an alive drive with no report in its window: one read, unwaited, one attempt that ran whole', J([aliveClean.reads.map((r) => r.wait), aliveClean.drive.attempts.length, aliveClean.drive.attempts[0].death ?? null]), J([[0], 1, null]));
  const appOwn = await retryOf([whole, whole], { ...alongside, entries: [{ ...aliveEntry, text: `${J(aliveReport.header)}\n${J(appBody)}` }] });
  add('an alive drive with the app\'s own report: read once, never driven again, G1 FAIL', `${String(appOwn.reads.length)} ${String(appOwn.drive.attempts.length)} ${g(gradeRun(appOwn.drive))}`, `1 1 ${FAIL}`);
  add('every read is handed the row\'s own claims and the row\'s device', [aliveBack, deadBack, aliveClean, appOwn].every((r) => r.reads.every((one) => one.rowClaims && one.u === aliveUdid)), true);
  const retrySource = driveWithRetry.toString();
  add('the run reads with readDeath and says with say unless a self-test hands its own', /\{\s*read = readDeath,\s*tell = say\s*\}\s*=\s*\{\}/.test(retrySource), true);
  const mainSource = main.toString();
  add('every row runs the K drive at the largest text size, after S, with the row\'s claims', /kind: 'K'[^)]*textSize: LARGEST_TEXT[^)]*\), sim\.udid, ctx\.claimed\)/.test(mainSource) && mainSource.indexOf("kind: 'S'") < mainSource.indexOf("kind: 'K'"), true);
  add('every drive of a row shares the row\'s claims', (mainSource.match(/sim\.udid, ctx\.claimed\)/g) ?? []).length, 6);

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
  // Phase 333.4.1: touch-26 is no longer STATED; the STATED mechanism stays, held on a row a later round may mark.
  const stated26 = { ...touch26, stated: 'G7' };
  add('G7 touch-26 at the parent: FAIL, F2 is no longer stated', g(gradeTurn(touch26, t26, { parent: recorded })), FAIL);
  add('G7 touch-26 at the parent with no parent reading: FAIL', g(gradeTurn(touch26, t26)), FAIL);
  const headTurn = fixture('touch-26-head-turn');
  add('G7 touch-26 at HEAD: every frame read back after the turn: PASS', g(gradeTurn(touch26, headTurn, { afterReadings: 3 })), PASS);
  add('G7 the HEAD drive asked for T\'s five readings: UNREADABLE, it kept three', g(gradeTurn(touch26, headTurn)), UNREADABLE);
  add('G7 touch-26 at HEAD with the bar 10 high after the turn: FAIL', g(gradeTurn(touch26, edited(headTurn, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 10, 375, 54]; })), { afterReadings: 3 })), FAIL);
  add('G7 the parent\'s paired turn read live: FAIL (F2)', g(gradeTurn(touch26, fixture('touch-26-parent-paired'), { afterReadings: 2 })), FAIL);
  add('G7 face-26 at HEAD: every frame as before the turn: PASS', g(gradeTurn(rowOf('face-26'), fixture('face-26-head-turn'), { afterReadings: 3 })), PASS);
  add('G7 a STATED row at the parent: STATED (F2)', g(gradeTurn(stated26, t26, { parent: recorded })), STATED);
  add('G7 a STATED row with the bars 12 points high', g(gradeTurn(stated26, edited(t26, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 12, 375, 54]; })), { parent: recorded })), FAIL);
  const healed = edited(t26, (ev) => {
    const before = ev.find((e) => e.seq === 8);
    for (const e of ev) if (e.seq > 9 && e.chrome) e.chrome = { ...clone(before.chrome), orientation: 1, menu: e.chrome.menu ? clone(before.chrome.menu) : null, status: e.chrome.status ? clone(before.chrome.status) : null, grid: e.chrome.grid ? clone(before.chrome.grid) : null };
  });
  add('G7 touch-26 reading back exactly: PASS, F2 gone', g(gradeTurn(touch26, healed, { parent: recorded })), PASS);
  add('G7 a STATED row reading back exactly: PASS, F2 gone', g(gradeTurn(stated26, healed, { parent: recorded })), PASS);
  add('G7 a STATED row against a live parent that read the same', g(gradeTurn(stated26, t26, { parent: parentTurn('touch-26', t26) })), STATED);
  add('G7 a STATED row against a live parent that read back exactly', g(gradeTurn(stated26, t26, { parent: parentTurn('touch-26', healed) })), FAIL);
  add('G7 a STATED row shifted with no parent reading', g(gradeTurn(stated26, t26, { parent: null })), UNREADABLE);
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
  add('G7 touch-26, 333.4\'s drive with the bars 10 high, buttons not widened: FAIL now', g(gradeTurn(touch26, settled, { parent: recorded })), FAIL);
  add('G7 a STATED row, buttons not widened, against the recorded parent: STATED', g(gradeTurn(stated26, settled, { parent: recorded })), STATED);
  add('G7 a STATED row, buttons not widened, against a live parent that caught the widening: STATED', g(gradeTurn(stated26, settled, { parent: parentTurn('touch-26', t26) })), STATED);
  add('G7 a STATED row, buttons widened, against a live parent that did not: STATED', g(gradeTurn(stated26, t26, { parent: parentTurn('touch-26', settled) })), STATED);
  add('G7 a STATED row, buttons not widened, with the bars 12 points high', g(gradeTurn(stated26, edited(settled, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.chrome.nav = [0, 12, 375, 54]; })), { parent: recorded })), FAIL);
  add('G7 a STATED row, buttons not widened, with the grid moved', g(gradeTurn(stated26, edited(settled, (ev) => replaceEvent(ev, (e) => e.seq === 20, (e) => { e.chrome.grid.frame = [0, 96, 375, 488]; })), { parent: recorded })), FAIL);
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
  // Phase 333.4.1 (D8): a Release drive that came back after XCUITest's crash is read by its G1 alone.
  const rOffered = edited(ipadR, (ev) => replaceEvent(ev, (e) => e.step === 'terminal-menu' && e.for === 'end-after', (e) => { e.end = { enabled: true, label: 'End session…' }; }));
  const rBack = { ...rOffered, attempts: [{ ...rOffered.attempts.at(-1), death: { during: 'a step its lines do not show', alive: true, reports: [{ name: 'Tortie-x.ips', class: 'xcuitest', pid: 1, key: '1@x' }] } }] };
  add('G8 a Release drive that came back: UNREADABLE, its End never graded as the app\'s', g(rel(rBack)), UNREADABLE);

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

  // G11, the sample's turn (Phase 333.4.1).
  const sHead = fixture('touch-26-head-sample-turn');
  const afterEl = (id, change) => (ev) => replaceEvent(ev, (e) => e.step === 'sample-inventory' && e.for === 'turn-after', (e) => {
    const el = e.elements.find((x) => x.id === id);
    if (el === undefined) throw new Error(`the self-test edits ${id}, which the fixture does not hold`);
    change(el, e);
  });
  add('G11 touch-26 at HEAD: every element read back after the turn', g(gradeSampleTurn(touch26, sHead)), PASS);
  add('G11 touch-26 at the parent: the Sample bar 44 tall after the turn (F2)', g(gradeSampleTurn(touch26, fixture('touch-26-parent-sample-turn'))), FAIL);
  add('G11 says the parent\'s bar went from 64 to 44', /sample-bar \[0, 0, 375, 64\] then \[0, 0, 375, 44\]/.test(gradeSampleTurn(touch26, fixture('touch-26-parent-sample-turn')).why), true);
  add('G11 face-26 at HEAD', g(gradeSampleTurn(rowOf('face-26'), fixture('face-26-head-sample-turn'))), PASS);
  const s18 = gradeSampleTurn(rowOf('touch-18'), fixture('touch-18-parent-sample-turn'));
  add('G11 touch-18 at the parent: no F2 on iOS 18.3', s18.grade, PASS);
  add('G11 on iOS 18.3, which names no BackButton, the grid holds the bar\'s place', /no element is named BackButton/.test(s18.why), true);
  add('G11 ipad-26 at the parent: the window does not turn (F6)', g(gradeSampleTurn(rowOf('ipad-26'), fixture('ipad-26-parent-sample-turn'))), PASS);
  add('G11 a HEAD reading with the Sample bar 44 tall after the turn', g(gradeSampleTurn(touch26, edited(sHead, afterEl('sample-bar', (el) => { el.frame = [0, 0, 375, 44]; })))), FAIL);
  add('G11 Leave sample 20 points up after the turn', g(gradeSampleTurn(touch26, edited(sHead, afterEl('sample-leave', (el) => { el.frame = [276.5, 0, 82.5, 44]; })))), FAIL);
  add('G11 the back button gone after the turn', g(gradeSampleTurn(touch26, edited(sHead, afterEl('BackButton', (el, e) => { e.elements = e.elements.filter((x) => x !== el); })))), FAIL);
  add('G11 the grid 20 points up after the turn', g(gradeSampleTurn(touch26, edited(sHead, afterEl('screen-grid', (el) => { el.frame = [0, 138, 375, 446]; })))), FAIL);
  add('G11 the Sample bar not read before the turn', g(gradeSampleTurn(touch26, edited(sHead, (ev) => replaceEvent(ev, (e) => e.step === 'sample-inventory' && e.for === 'turn-before', (e) => { e.elements = e.elements.filter((x) => x.id !== 'sample-bar'); })))), UNREADABLE);
  add('G11 the Sample bar read in neither reading: UNREADABLE, only the back button may go unnamed', g(gradeSampleTurn(touch26, edited(sHead, (ev) => { for (const e of ev) if (e.step === 'sample-inventory') e.elements = e.elements.filter((x) => x.id !== 'sample-bar'); }))), UNREADABLE);
  add('G11 the device never turned sideways', g(gradeSampleTurn(touch26, edited(sHead, (ev) => replaceEvent(ev, (e) => e.step === 'landscape', (e) => { e.chrome.orientation = 1; })))), UNREADABLE);
  add('G11 no reading after the turn', g(gradeSampleTurn(touch26, edited(sHead, (ev) => ev.splice(ev.findIndex((e) => e.step === 'sample-inventory' && e.for === 'turn-after'), 1)))), UNREADABLE);

  // G12, the key bar (Phase 333.4.1).
  const kSE = fixture('keys-touch-26').drives;
  const kPro = fixture('keys-face-26').drives;
  const keysOf = (d) => eventsOf(d).find((e) => e.step === 'keys-read');
  const keyEdit = (d, short, change) => edited(d, (ev) => replaceEvent(ev, (e) => e.step === 'keys-read', (e) => change(e.keys.find((k) => k.id === `screen-key-${short}`), e)));
  add('G12 touch-26 at HEAD: return its glyph, every word at its width, the bar the same at the largest size', g(gradeKeys(touch26, { S: kSE.headS, K: kSE.headK })), PASS);
  add('G12 touch-26 at the parent: return 41.5, and 34 at the largest size', g(gradeKeys(touch26, { S: kSE.parentS, K: kSE.parentK })), FAIL);
  add('G12 return 41.5 is neither its word nor its glyph', keyBarProblems(keysOf(kSE.parentS)).map((x) => x.split(' ')[0]).join(','), 'return');
  add('G12 at the parent\'s largest size ⇧tab, ctrl and return are squeezed', keyBarProblems(keysOf(kSE.parentK)).map((x) => x.split(' ')[0]).join(','), 'btab,ctrl,return');
  add('G12 face-26 at HEAD: return keeps its word at both sizes', g(gradeKeys(rowOf('face-26'), { S: kPro.headS, K: kPro.headK })), PASS);
  add('G12 face-26 at HEAD reads return as its word', /return as its word/.test(gradeKeys(rowOf('face-26'), { S: kPro.headS, K: kPro.headK }).why), true);
  add('G12 face-26 at the parent\'s default size: every word at its width', keyBarProblems(keysOf(kPro.parentS)).length, 0);
  add('G12 face-26 at the parent: squeezed at the largest size', g(gradeKeys(rowOf('face-26'), { S: kPro.parentS, K: kPro.parentK })), FAIL);
  add('G12 return 41.5 at the default size', g(gradeKeys(touch26, { S: keyEdit(kSE.headS, 'return', (k) => { k.frame = [300, 394, 41.5, 36]; }), K: kSE.headK })), FAIL);
  add('G12 return its glyph but ctrl squeezed to 34', g(gradeKeys(touch26, { S: keyEdit(kSE.headS, 'ctrl', (k) => { k.frame = [256.5, 394, 34, 36]; }), K: kSE.headK })), FAIL);
  add('G12 a key missing', g(gradeKeys(touch26, { S: keyEdit(kSE.headS, 'hide', (k, e) => { e.keys = e.keys.filter((x) => x !== k); }), K: kSE.headK })), FAIL);
  add('G12 a key outside the bar', g(gradeKeys(touch26, { S: keyEdit(kSE.headS, 'esc', (k) => { k.frame = [13, 380, 34, 36]; }), K: kSE.headK })), FAIL);
  add('G12 a key outside the window', g(gradeKeys(touch26, { S: keyEdit(kSE.headS, 'hide', (k) => { k.frame = [360, 394, 30, 36]; }), K: kSE.headK })), FAIL);
  const lowered = edited(kSE.headK, (ev) => replaceEvent(ev, (e) => e.step === 'keys-read', (e) => { e.bar[1] += 4; for (const k of e.keys) k.frame[1] += 4; }));
  add('G12 the bar 4 points lower at the largest size, every word still at its width', keyBarProblems(keysOf(lowered)).length, 0);
  add('G12 the bar 4 points lower at the largest size: the cap', g(gradeKeys(touch26, { S: kSE.headS, K: lowered })), FAIL);
  add('G12 a K drive whose ⋯ rows did not grow: the size did not take', g(gradeKeys(touch26, { S: kSE.headS, K: edited(kSE.headK, (ev) => replaceEvent(ev, (e) => e.step === 'terminal-menu', (e) => { e.catchUp.frame = [116, 77.5, 250, 42]; })) })), UNREADABLE);
  add('G12 a K drive that carried no text size', g(gradeKeys(touch26, { S: kSE.headS, K: edited(kSE.headK, (ev) => replaceEvent(ev, (e) => e.step === 'keys-read', (e) => { e.textSize = null; })) })), UNREADABLE);
  add('G12 no K drive', g(gradeKeys(touch26, { S: kSE.headS, K: null })), UNREADABLE);
  add('G12 a keyboard that did not rise', g(gradeKeys(touch26, { S: edited(kSE.headS, (ev) => replaceEvent(ev, (e) => e.step === 'keys-read', (e) => { e.keyboard = false; e.keys = []; })), K: kSE.headK })), UNREADABLE);

  // G13, the fill (Phase 333.4.1).
  const cols = doorColumns();
  add('the honest door draws the vectors\' 120 columns', cols, 120);
  add('the 3x row at 402 points: 400 at 80, 120 and 200 columns, 378.67 at 142 (§2.2)', [80, 120, 142, 200].map((c) => Math.round(fittedRowWidth(3, 402, c) * 100) / 100).join(','), '400,400,378.67,400');
  add('the 3x row in the 750-point grid sideways: 720', fittedRowWidth(3, 750, 120), 720);
  add('the 2x row is the grid\'s width', fittedRowWidth(2, 375, 120), 375);
  const parentPaired = fixture('touch-26-parent-paired');
  add('G13 touch-26 at HEAD: 375 upright, 667 sideways', g(gradeFill(touch26, [{ label: 'P', drive: headTurn }], { columns: cols })), PASS);
  add('G13 touch-26 at the parent: 360 upright, 660 sideways', g(gradeFill(touch26, [{ label: 'P', drive: parentPaired }], { columns: cols })), FAIL);
  add('G13 the parent reads 360 in the 375-point grid', /rows 360 wide in a 375-point grid/.test(gradeFill(touch26, [{ label: 'P', drive: parentPaired }], { columns: cols }).why), true);
  const proTurn = fixture('face-26-head-turn');
  add('G13 face-26 at HEAD: 400 upright, 720 sideways, the parent\'s', g(gradeFill(rowOf('face-26'), [{ label: 'P', drive: proTurn }], { columns: cols })), PASS);
  const allRows = (f, seq, width) => edited(f, (ev) => replaceEvent(ev, (e) => e.seq === seq, (e) => { for (const r of e.reading.live) r.frame[2] = width; }));
  add('G13 an SE row 360 wide', g(gradeFill(touch26, [{ label: 'P', drive: allRows(headTurn, 8, 360) }], { columns: cols })), FAIL);
  add('G13 an iPhone 16 Pro row 402 wide: the 3x path must not fill', g(gradeFill(rowOf('face-26'), [{ label: 'P', drive: allRows(proTurn, 8, 402) }], { columns: cols })), FAIL);
  add('G13 one row of forty a pixel short', g(gradeFill(touch26, [{ label: 'P', drive: edited(headTurn, (ev) => replaceEvent(ev, (e) => e.seq === 11, (e) => { e.reading.live[7].frame[2] = 374; })) }], { columns: cols })), FAIL);
  add('G13 an upright grid narrower than the window', g(gradeFill(touch26, [{ label: 'P', drive: edited(headTurn, (ev) => replaceEvent(ev, (e) => e.seq === 8, (e) => { e.chrome.grid.frame = [0, 104, 360, 480]; for (const r of e.reading.live) r.frame[2] = 360; })) }], { columns: cols })), FAIL);
  add('G13 a row that names no scale', g(gradeFill({ ...touch26, scale: undefined }, [{ label: 'P', drive: headTurn }], { columns: cols })), UNREADABLE);
  add('G13 no reading drew a live row', g(gradeFill(touch26, [{ label: 'T', drive: t26 }], { columns: cols })), UNREADABLE);

  // G14, the lock (Phase 333.4.1).
  const pans = { 'touch-26': fixture('pan-touch-26').drives, 'touch-18': fixture('pan-touch-18').drives, 'ipad-26': fixture('pan-ipad-26').drives };
  for (const [id, d] of Object.entries(pans)) {
    add(`G14 ${id} at HEAD: the rows keep their y`, g(gradeLock(rowOf(id), d.head)), PASS);
    add(`G14 ${id} at the parent: the rows move down with the finger`, g(gradeLock(rowOf(id), d.parent)), FAIL);
  }
  add('G14 the SE at 26.3 reads 164 left and 38 down at the parent', /moved up or down with the finger, row 0 from y 377 to 415/.test(gradeLock(touch26, pans['touch-26'].parent).why), true);
  const panEdit = (d, change) => edited(d, (ev) => replaceEvent(ev, (e) => e.step === 'pan-sideways', change));
  add('G14 a pan that did not move sideways', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { e.after = clone(e.before); }))), FAIL);
  add('G14 one row half a point and more down', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { e.after.live[3].frame[1] += 0.75; }))), FAIL);
  add('G14 a pan of 80 points with 164 of room', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { for (const r of e.after.live) r.frame[0] = -101; }))), FAIL);
  add('G14 a pan to the end of a smaller room counts', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { for (const r of e.before.live) r.frame[0] = -125; for (const r of e.after.live) r.frame[0] = -185; }))), PASS);
  add('G14 no room to pan', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { for (const r of e.before.live) r.frame[0] = -180; }))), UNREADABLE);
  add('G14 the pan read on Catch Me Up', g(gradeLock(touch26, panEdit(pans['touch-26'].head, (e) => { e.after.face = 'catch-up'; }))), UNREADABLE);
  add('G14 no pan-sideways line', g(gradeLock(touch26, { attempts: [{ events: [] }] })), UNREADABLE);

  // The row's arms together.
  const together = gradeRow(touch26, { T: t26, kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1' });
  add('a touch-26 row whose turn reads as the parent\'s: G7 FAIL', together.G7.grade, FAIL);
  add('a STATED row reads G7 STATED from the recorded parent', gradeRow(stated26, { T: t26, kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1' }).G7.grade, STATED);
  add('a parent turn drive that died leaves a STATED row\'s G7 UNREADABLE', gradeRow(stated26, { T: t26, TP: { attempts: [{ events: [] }] }, kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1' }).G7.grade, UNREADABLE);
  add('a row with no sample drive and no K drive reads G11, G12 and G14 UNREADABLE', [together.G11.grade, together.G12.grade, together.G14.grade].join(','), [UNREADABLE, UNREADABLE, UNREADABLE].join(','));
  const fullRow = gradeRow(touch26, { P: headTurn, S: fixture('touch-26-head-sample-turn'), kind: 'touchID', talkConfirm: talk, sampleConfirm: sample, notConfirmed, runtime: '26.3.1', columns: doorColumns() });
  add('a touch-26 row at HEAD reads G11 and G13 PASS', [fullRow.G11.grade, fullRow.G13.grade].join(','), [PASS, PASS].join(','));
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
  const endedAt = Date.now();
  await Promise.all(reactions);
  events.sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0));
  return { code: r.code, ms: r.ms, timedOut: r.timedOut === true, startedAt, endedAt, firstError: r.code === 0 ? null : firstErrorIn(r.logFile), events, marks, reactionErrors, door: null, why: r.why ?? null };
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
 * One drive, driven again when it DIED (SPEC G1, F3; Phase 333.4.1, D8): after
 * EVERY attempt, alive or not, the crash reports macOS wrote for the device
 * `udid` inside that attempt are read from its own DiagnosticReports (waited
 * for only when the app is gone) and claimed in the row's `claimed`, and
 * {@link driveAgain} decides. `attempt(n)` makes one attempt and returns it.
 * `read` and `tell` are the run's {@link readDeath} and `say`; since the fix
 * round the self-test hands it its own, over the committed crash report, and
 * DRIVES it, because a read of its text left D8's rule, a report read after
 * an attempt the app was alive at the end of, undoable with the self-test
 * green (the verify round put `!alive && ` back in front of the read and 299
 * cases still passed).
 */
async function driveWithRetry(label, attempt, udid, claimed = new Set(), { read = readDeath, tell = say } = {}) {
  const attempts = [];
  for (;;) {
    const a = await attempt(attempts.length + 1);
    attempts.push(a);
    tell(`  ${label}${attempts.length > 1 ? ` (drive ${String(attempts.length)})` : ''}: exited ${String(a.code)} in ${String(Math.round((a.ms ?? 0) / 1000))} s, ${String(a.events.length)} lines, alive ${String(aliveOf(a.events))}`);
    const alive = !needsAgain(a.events);
    const reports = typeof a.startedAt === 'number' ? await read(udid, a.startedAt, a.endedAt ?? Date.now(), { wait: alive ? 0 : CRASH_WAIT_MS, claimed }) : [];
    a.death = attemptDeath(a.events, reports);
    if (a.death === undefined) break;
    const again = driveAgain(attempts);
    const what = alive ? `the app was running at the end, after a crash inside the drive (during ${a.death.during}; ${deathWords(a.death)})` : `the app was not running at the end (during ${a.death.during}; ${deathWords(a.death)})`;
    tell(`  ${label}: ${what}${again ? '; driven again, alone' : '; not driven again'}`);
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

/** A drive with no Mac (R, S and K): See a sample, no code; K at the text size it names. */
function sampleAttempt(sim, ctx, { label, kind, configuration, derivedDataPath, textSize = null }) {
  return async (n) => {
    await sim.simctl('keychain', 'reset');
    const steps = stepsFor(kind, ctx.row, { cast: ctx.cast });
    const env = { P316_PAYLOAD: '', P316_STEPS: steps.join(','), ...(textSize === null ? {} : { P316_TEXT_SIZE: textSize }) };
    const out = await driveOnce(sim, ctx, { label: `${label}${n > 1 ? '-again' : ''}`, configuration, derivedDataPath, project: PROJECT, steps, env });
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
    const words = { talk: talkConfirm(), sample: sampleConfirm(book), notConfirmed: copyWord('endNotConfirmed'), columns: doorColumns() };

    for (const row of plan.run) {
      const started = Date.now();
      const r = { kind: undefined, udid: null, runtime: null, install: null, version, talkConfirm: words.talk, sampleConfirm: words.sample, notConfirmed: words.notConfirmed, columns: words.columns };
      // Phase 333.4.1 (D8): the crash reports this row's drives have claimed, so none counts twice.
      const ctx = { row, runDir, cast, doorConfirm: null, claimed: new Set() };
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
            r.R = await driveWithRetry('R', sampleAttempt(sim, ctx, { label: `${row.id}-R`, kind: 'R', configuration: 'Release', derivedDataPath: DD.release }), sim.udid, ctx.claimed);
            await sim.simctl('uninstall', BUNDLE_ID);
          }
          // P, paired.
          r.P = await driveWithRetry('P', pairedAttempt(sim, ctx, { label: `${row.id}-P`, kind: 'P', configuration: 'Debug', derivedDataPath: DD.debug, project: PROJECT }), sim.udid, ctx.claimed);
          if (ctx.doorConfirm !== null) r.talkConfirm = ctx.doorConfirm;
          // T, the turn.
          r.T = await driveWithRetry('T', pairedAttempt(sim, ctx, { label: `${row.id}-T`, kind: 'T', configuration: 'Debug', derivedDataPath: DD.debug, project: PROJECT }), sim.udid, ctx.claimed);
          if (parentProject !== null) {
            await sim.simctl('uninstall', BUNDLE_ID);
            r.TP = await driveWithRetry('T at the parent', pairedAttempt(sim, ctx, { label: `${row.id}-TP`, kind: 'T', configuration: 'Debug', derivedDataPath: DD.parent, project: parentProject }), sim.udid, ctx.claimed);
            await sim.simctl('uninstall', BUNDLE_ID);
          }
          // S, See a sample.
          r.S = await driveWithRetry('S', sampleAttempt(sim, ctx, { label: `${row.id}-S`, kind: 'S', configuration: 'Debug', derivedDataPath: DD.debug }), sim.udid, ctx.claimed);
          // K, the key bar at the largest text size (Phase 333.4.1, G12).
          r.K = await driveWithRetry('K', sampleAttempt(sim, ctx, { label: `${row.id}-K`, kind: 'K', configuration: 'Debug', derivedDataPath: DD.debug, textSize: LARGEST_TEXT }), sim.udid, ctx.claimed);
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
      else if (PARENT_TURNS[row.id] !== undefined) say(`  T recorded:  ${turnLine(parentTurn(row.id))} (the parent, ${PARENT_TURNS[row.id].source})`);
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
          ['R', 'P', 'T', 'TP', 'S', 'K']
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
  if (process.argv.includes('--grader-self-test')) process.exitCode = await selfTest();
  else await main();
}
