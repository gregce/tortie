#!/usr/bin/env node
/**
 * probe:p316 — the Tortie iPhone app, driven in the Simulator against the door
 * on loopback (Phase 316.2, build/p316/SPEC.md §4 S2, "Proof").
 *
 * WHAT IS REAL IN A RUN
 *   - The Mac: ONE Electron through build/electron-run.mjs's `withElectron`, on
 *     a scratch profile, a scratch HOME and the socket `gmux-p316-<pid>`, with
 *     `GMUX_POCKET_LOOPBACK=1`, so the door binds 127.0.0.1 and nothing else.
 *     The door is switched on, confirmed, and paired through the app's own
 *     `pocket:*` channels, pressed through `window.gmux.pocket` exactly as
 *     Settings then Phone presses them.
 *   - The phone: the DEBUG build of `ios/Tortie.xcodeproj`, signed ad hoc with
 *     no team, on Simulators made ONE AT A TIME by build/simulator-run.mjs's
 *     `withSimulator`, which shuts each down and deletes it in a `finally` and
 *     on SIGINT, SIGTERM and SIGHUP. Simulator.app is never started.
 *   - The UI tests and the ATS unit test, which print what they read (frames
 *     and labels, never a photograph) as `P316|<run>|{…}` lines this probe
 *     reads live from xcodebuild's own output (SPEC §3.4 pitfall a: `simctl
 *     launch --stdout` writes nothing).
 *
 * WHAT IS SUPPLIED
 *   - The `claude` on the scratch PATH: a /bin/sh script this probe writes. It
 *     prints the COMMITTED Phase 312 dialog fixture for one session, so the
 *     shipped screen tier reads `needs_input`, and plants the COMMITTED research
 *     63 transcript for another. NO VENDOR PROCESS RUNS AND NO TOKEN IS SPENT.
 *   - The tailnet key: a MADE-UP `tskey-auth-…` string. No real key exists in
 *     this run, and at the end the app's own container and keychain on every
 *     device, and every file under the Mac's scratch profile and HOME, are
 *     scanned for its bytes, which must be absent.
 *   - Method A's reader: build/p316/node-phone.mjs, a phone written in node from
 *     the wire format, paired as a second phone. It computes what each screen
 *     must say, and the labels XCUITest read are compared with that: the Swift
 *     is never the judge of the Swift.
 *   - Method B's door: build/p316/hostile-door.mjs, run as its OWN PROCESS on
 *     loopback (pitfall b), and the ATS arm's two stand-ins from the same file.
 *
 * THE ORDER
 *   B0  preflight: a build, Xcode, both runtimes, the device type, the port
 *   B1  build-for-testing twice: the SHIPPING Info.plist, and a scratch copy of
 *       ios/ with the one ATS key removed. Neither boots anything.
 *   Electron:
 *   D0  sessions: a shell, a planted conversation, a waiting session
 *   D1  switch on → confirm → listening on 127.0.0.1:8823
 *   D2  the node reader pairs (window 1) with the made-up key, the Mac allows
 *   iOS 26.3 Simulator:
 *   P1  the app is handed window 2's QR through the DEBUG injection; the UI test
 *       prints the fingerprint it DRAWS; this probe compares it with the Mac
 *       sheet's and presses Allow; the app's first SIGNED read is what makes it
 *       paired (316.1's nit P2b: "allowed" alone is not success)
 *   L1  the list: "Needs your input (n)", "Everything else (m)", the rows, their
 *       order, the ages, the foot — against the node reader's own reads — and
 *       the frames the mocks' CSS gives: a 16 pt gutter on the left AND the
 *       right, 28 pt section headers, 6/16 row padding (read from
 *       docs/design/phone/Main.html at run time)
 *   S1  a working session: its status title, agent and project, counts, the
 *       last answer drawn as markdown
 *   T1  its conversation paged to the first turn: the turns drawn equal the
 *       door's turnCount; an ask with `**x**` reads back WITH its asterisks
 *       and an answer with `**x**` WITHOUT them; the terminal line is there.
 *       The planted conversation is 41 turns longer than the fixture, so it is
 *       at least three of the door's 20-turn pages and T1 cannot pass on one;
 *       the `**x**` turn is the OLDEST planted, so it is read only by paging
 *   R1  Remove on the Mac, re-confirm the door, and the app draws its unpaired
 *       line
 *   A1  the ATS arm: a unit test HOSTED IN THE APP, so it runs under the
 *       shipping Info.plist, dials 100.64.0.1 through a loopback SOCKS5
 *       stand-in (ATYP=1, `allowFailover` off, so no packet goes to 100.x):
 *       200 with the key, -1200 and 0 requests served with it removed
 *   K1  the made-up key is in nothing the app wrote on the device
 *   iOS 18.3 Simulator (THE FLOOR ARM, MANDATORY: his iPhone runs 18.x and the
 *   ATS exception was measured on 26.3 only):
 *   F1  pairing and the list again, and A1 again, and K1 again
 *   iOS 26.3 Simulator, the hostile door (Method B):
 *   H*  every arm of build/p316/hostile-door.mjs: each must end in a drawn
 *       sentence (the honest control, the long ask and the two unknown words
 *       end drawn instead), the app still running, no half-drawn screen; the
 *       sentence must be drawn WHERE the arm says and be the `Copy.swift` word
 *       the arm names (its `at` and `expect`); the list arms pair honestly and
 *       meet their body on the list's refresh; the wrong key must leave the
 *       door with 0 requests served
 *   After: the key scan of the Mac's scratch world, the Electron count and the
 *   Simulator count, once each.
 *
 * THE LINE PROTOCOL the Swift tests speak, which this file is the reader of.
 * Every line is `P316|<run>|<one JSON object>` on the test runner's stdout,
 * written unbuffered, AND appended to the file `P316_LINES` names, because
 * whether xcodebuild relays a runner's output as it happens is unmeasured.
 * Every object carries `seq`, and a line is read once from whichever channel
 * brought it first. The environment arrives through xcodebuild's `TEST_RUNNER_`
 * prefix, so the test reads `P316_*`.
 *
 *   TortieUITests / P316DriveUITests / testDrive     (XCTSkip when P316_RUN is unset)
 *     P316_RUN, P316_LINES, P316_PAYLOAD (the QR text), P316_STEPS (comma
 *     separated), P316_WAIT_S (seconds per wait). It launches the app with
 *     `-TortieDebugForgetPairing -TortieDebugStill -TortieDebugPairingPayload
 *     <payload>` (the last two DEBUG only: the attention dot held still so
 *     XCUITest can see the app idle, and the code the camera would read). A
 *     step that cannot find its screen dumps "<step>-missing" and the steps
 *     after it are not run. The steps:
 *       pair            wait for `pairing-fingerprint`, print
 *                       {"step":"fingerprint","text":<its label>} (or
 *                       "text":null when it never appears), then wait for
 *                       `screen-list` or `pairing-again` (a pairing that
 *                       stopped), and dump the screen as "pair-end"
 *       list            wait for `screen-list` to settle, print
 *                       {"step":"list-before"}, pull to refresh 2 s later,
 *                       dump "list" 3 s after that (the probe reads the door on
 *                       both lines, so the two reads bracket the app's)
 *       open:<id>       tap `row-<id>`, wait for `screen-session`, dump "session"
 *       conversation    tap `session-open-conversation`, wait, dump "conversation"
 *       first           scroll toward the oldest turn until `conversation-older`
 *                       is gone and three swipes add nothing (or a
 *                       `conversation-failure` or `conversation-older-line`
 *                       appears), then print
 *                       {"step":"turns","indexes":[…],"asks":{i:label},
 *                       "answers":{i:label},"absences":{i:label}} over every
 *                       `turn-<i>` seen on the way, and dump "conversation-top"
 *       unpaired        print {"step":"ready-for-remove"}, then every 2 s:
 *                       back to the list, and pull it to refresh (or press
 *                       `list-failure-retry`), until `screen-pairing` is
 *                       drawn, and dump "unpaired"
 *       sentence        wait for a sentence drawn in place of a screen (a
 *                       `*-failure`, `pairing-line` or
 *                       `conversation-older-line` with words), and dump
 *                       "sentence": the hostile list arms, whose body arrives on
 *                       the list's refresh, some only after the client's 15 s
 *     and ends with {"step":"alive","state":<XCUIApplication.State raw>} and
 *     {"step":"done"}. A dump is {"step":"screen","name":…,"window":[w,h],
 *     "elements":[{"id","label","frame":[x,y,w,h]}]} over every element with
 *     an accessibility identifier (ios/Tortie/Screens/Identifiers.swift).
 *   TortieTests / P316ATSTests / testDialThroughSocks  (XCTSkip when P316_RUN is unset)
 *     P316_RUN, P316_LINES, P316_ATS_HOST, P316_ATS_PORT, P316_ATS_PIN, P316_SOCKS_PORT.
 *     One `DoorClient.present` of `{}` to the door at that host through a
 *     `.socks5` route to 127.0.0.1, and one line:
 *     {"step":"ats","ok":true,"answer":"pending"} or
 *     {"step":"ats","ok":false,"failure":"<DoorFailure case>","code":<int|null>}.
 *     It asserts nothing: this probe grades both directions.
 *   A run whose test prints no P316 line is UNREADABLE (exit 2), never a pass.
 *
 * WHAT IT REFUSES TO DO. It never binds a real interface (the QR's host is
 * asserted to be 127.0.0.1 before anything is dialled), never runs a
 * `tailscale` command, never signs into anything and touches no keychain of
 * the person's. It signals nothing it did not start. It takes NO screenshot
 * and no screen recording. Its report holds no key, no signature and no
 * conversation line, only lengths, counts and digests. `npm run shot` is not
 * called.
 *
 * VERIFIERS ONLY: it starts an Electron and boots Simulators, so take the
 * orchestrator's lock first. It runs for about 17 minutes, and
 * build/electron-run.mjs's guard over the person's own `-L gmux` server
 * compares that server's sessions before and after: a session HE creates or
 * ends while it runs reads as this run's, and the run ends in that guard's
 * error although nothing here touched `-L gmux`. Run it while he is not
 * creating or ending sessions. It carries no `npm run build &&`; it refuses
 * (exit 2) when the checkout has no build.
 *
 *   npm run -s probe:p316
 *   P316_ARMS=order,ats,floor,hostile     which arms (default all)
 *   P316_HOSTILE=honest,wrong-key         which hostile arms (default all)
 *   P316_DERIVED_DATA=<dir>               derived data (never the repo, never home; kept, with <dir>-nokey)
 *   P316_KEEP=1                           keep the scratch world
 *   P316_PARENT_CHECKOUT=<dir>            the parent reading: whether it has ios/
 *   node build/p316/probe-p316.mjs --grader-self-test   the list grader on its own dumps; launches nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { connect as netConnect } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import {
  RUNTIME_CURRENT,
  RUNTIME_FLOOR,
  countDevicesNamed,
  simulatorHarnessMissing,
  withSimulator,
  xcodebuildRun
} from '../simulator-run.mjs';
import { HOSTILE_ARMS, UNKNOWN_STATUS_TITLE, hostileDoorArgv } from './hostile-door.mjs';
import { fingerprintDigits, makePhone, pageBack, present, sealPresentation, shaHex, signedGet } from './node-phone.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p316]';
const say = (line) => console.log(`${TAG} ${line}`);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const J = JSON.stringify;

// ---------------------------------------------------------------------------
// The parent reading, which is only whether ios/ exists
// ---------------------------------------------------------------------------

const PARENT = (process.env['P316_PARENT_CHECKOUT'] ?? '').trim();
if (PARENT !== '') {
  const has = existsSync(join(resolve(PARENT), 'ios'));
  say(`the parent reading: ${resolve(PARENT)} ${has ? 'HAS' : 'has no'} ios/ directory; 0 write routes are used by a phone that does not exist`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// B0: the preflight, synchronous, before anything is started or served
// ---------------------------------------------------------------------------

const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
const ARMS = new Set(((process.env['P316_ARMS'] ?? '').trim() || 'order,ats,floor,hostile').split(',').map((s) => s.trim()));
const runtimes = ARMS.has('floor') ? [RUNTIME_CURRENT, RUNTIME_FLOOR] : [RUNTIME_CURRENT];

/** B0, asked once, synchronously, before anything is started or served. */
function preflight() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) {
    console.error(`${TAG} this checkout has no build at out/main/index.js. Run npm run build first.`);
    process.exit(2);
  }
  if (!existsSync(PROJECT)) {
    console.error(`${TAG} there is no ${relative(ROOT, PROJECT)}, so there is no app to drive.`);
    process.exit(2);
  }
  const missing = simulatorHarnessMissing({ runtimes });
  if (missing !== null) {
    console.error(`${TAG} ${missing}`);
    process.exit(2);
  }
}

const SCHEME = 'Tortie';
const BUNDLE_ID = 'com.itavero.tortie.phone';
const UI_TEST = 'TortieUITests/P316DriveUITests/testDrive';
const ATS_TEST = 'TortieTests/P316ATSTests/testDialThroughSocks';
const PORT = 8823;
const RUN = `/private/tmp/p316-probe-${String(process.pid)}`;
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const WORK = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const XCODE = join(RUN, 'xcode');
const DD = resolve((process.env['P316_DERIVED_DATA'] ?? '').trim() || join(XCODE, 'dd'));
const DD_NOKEY = `${DD}-nokey`;
const IOS_NOKEY = join(XCODE, 'ios-nokey');
const SOCKET = `gmux-p316-${String(process.pid)}`;
const KEEP = (process.env['P316_KEEP'] ?? '') === '1';
const NEXT = join(RUN, 'fake-next');
const STOP = join(RUN, 'fake-stop');
const TALK_SID = join(RUN, 'talk-sid');
const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const STORE_SRC = join(ROOT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
const N = { shell: 'p316-shell', talk: 'p316-talk', ask: 'p316-ask' };

/** THE TAILNET KEY. Made up here; nothing in this run dials anything but 127.0.0.1. */
const KEY = `tskey-auth-kP316probe${randomBytes(6).toString('hex')}-CNTRLp316probe${randomBytes(18).toString('hex')}`;
const unkeyed = (text) => String(text).split(KEY).join('<the made-up key>');

// What the mocks' CSS says a frame must be, read from the approved mock itself.
const MAIN_HTML = readFileSync(join(ROOT, 'docs', 'design', 'phone', 'Main.html'), 'utf8');
const cssRule = (selector) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(MAIN_HTML)?.[1] ?? '';
const px = (text, prop) => {
  // `padding: 0 16px` writes its zero with no unit, so the unit is optional.
  const m = new RegExp(`${prop}\\s*:\\s*([0-9.]+)(?:px)?(?:\\s+([0-9.]+)(?:px)?)?`).exec(text);
  return m === null ? null : [Number(m[1]), m[2] === undefined ? Number(m[1]) : Number(m[2])];
};
/** A text run's CSS line box in the mock, found by its font size (`font-size: 17px; line-height: 22px`). */
const lineBoxOf = (size) => {
  const m = new RegExp(`font-size:\\s*${String(size)}px;\\s*line-height:\\s*([0-9.]+)px`).exec(MAIN_HTML);
  return m === null ? null : Number(m[1]);
};
const FRAMES = {
  headerHeight: px(cssRule('.hdr'), 'height')?.[0] ?? null,
  gutter: px(cssRule('.hdr'), 'padding')?.[1] ?? null,
  rowPadding: px(cssRule('.row'), 'padding'),
  // Grading a row by its LINE BOXES and its HEIGHT, never by glyph boxes
  // (Phase 316.2's fix round). XCUITest reports a Text by the glyphs it drew
  // (a 15 pt line reads 18 tall inside its 20 pt box) and a section header's
  // container by the union of its children (the header read 15.67 tall, the
  // text's own box), so the first grader measured those against the CSS box and
  // failed a list that matched Main.html. These are the numbers the CSS box
  // model is made of, read from the mock: the row's `gap`, the hairline under
  // every row and header, and the two lines' `line-height`.
  rowGap: px(cssRule('.row'), 'gap')?.[0] ?? null,
  hairline: Number(/border-bottom:\s*([0-9.]+)px/.exec(cssRule('.row'))?.[1] ?? Number.NaN) || null,
  nameLine: lineBoxOf(17),
  secondLine: lineBoxOf(15)
};
// The phone's own words, from Copy.swift, for the lines main does not send.
const COPY_SWIFT = (() => {
  try {
    return readFileSync(join(ROOT, 'ios', 'Tortie', 'Style', 'Copy.swift'), 'utf8');
  } catch {
    return '';
  }
})();
const copyOf = (name) => {
  const m = new RegExp(`static let ${name}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(COPY_SWIFT);
  return m === null ? null : m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
};
/** Every `static let` word in Copy.swift, by name, so a drawn sentence can be named. */
const COPY_WORDS = Object.fromEntries(
  [...COPY_SWIFT.matchAll(/static let ([A-Za-z0-9]+)\s*=\s*"/g)].map((m) => [m[1], copyOf(m[1])]).filter(([, text]) => text !== null)
);
const COPY = {
  needsLead: copyOf('needsYourInputLead'),
  othersLead: copyOf('everythingElseLead'),
  close: copyOf('countClose'),
  notPaired: copyOf('notPaired'),
  terminal: copyOf('terminalStaysOnMac'),
  readLead: copyOf('readLead')
};

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const report = { runtimes, arms: [], readings: { frames: FRAMES }, copyFound: Object.fromEntries(Object.entries(COPY).map(([k, v]) => [k, v !== null])) };
let failures = 0;
const arm = (id, ok, said) => {
  const text = unkeyed(said);
  report.arms.push({ id, ok, said: text });
  if (ok === false) failures += 1;
  say(`${ok === null ? 'UNREADABLE' : ok ? 'PASS' : 'FAIL'} ${id}: ${text}`);
};

// ---------------------------------------------------------------------------
// The Mac, through its own bridge
// ---------------------------------------------------------------------------

const INHERITED_CLAUDE = Object.fromEntries(Object.keys(process.env).filter((n) => /^(?:CLAUDECODE|CLAUDE_)/.test(n)).map((n) => [n, undefined]));

async function attach(timeoutMs) {
  const started = Date.now();
  let why = 'no DevToolsActivePort yet';
  for (;;) {
    try {
      const port = Number(readFileSync(join(PROFILE, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) return await wsConnect(picked.target.webSocketDebuggerUrl);
        why = picked.why;
      }
    } catch (err) {
      why = String(err?.message ?? err);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`no app window: ${why}`);
    await sleep(300);
  }
}

async function armed(cdp) {
  await cdp.call('Runtime.enable');
  for (let i = 0; i < 200; i += 1) {
    if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined')) === true) return true;
    await sleep(300);
  }
  return false;
}

async function pocket(cdp, method, arg) {
  const call = arg === undefined ? `window.gmux.pocket[${J(method)}]()` : `window.gmux.pocket[${J(method)}](${J(arg)})`;
  return JSON.parse(
    await cdpEval(cdp, `(async () => { try { const v = await ${call}; return JSON.stringify({ ok: true, value: v === undefined ? null : v }); } catch (e) { return JSON.stringify({ ok: false, error: String((e && e.message) || e) }); } })()`)
  );
}

async function mainSessions(cdp) {
  return JSON.parse(await cdpEval(cdp, 'window.gmux.sessions.list().then((s) => JSON.stringify(s.map((x) => ({ id: x.id, name: x.name, status: x.status, createdAt: x.createdAt }))))'));
}

async function waitStatus(cdp, test, ms) {
  const started = Date.now();
  let last = null;
  for (;;) {
    const got = await pocket(cdp, 'status');
    last = got.ok ? got.value : null;
    if (last !== null && test(last)) return { ok: true, status: last };
    if (Date.now() - started >= ms) return { ok: false, status: last };
    await sleep(400);
  }
}

/** Confirm the door as it now stands, and wait until it listens. */
async function confirmListening(cdp) {
  const now = await pocket(cdp, 'status');
  if (!now.ok) return { ok: false, why: now.error };
  if (now.value.state === 'listening' && now.value.confirmState === 'confirmed') return { ok: true };
  const c = await pocket(cdp, 'confirmDoor', { linesRead: now.value.confirmLines, hashRead: now.value.confirmHash });
  const l = await waitStatus(cdp, (s) => s.state === 'listening', 20_000);
  return { ok: c.ok && c.value.allowed === true && l.ok, why: c.ok ? `confirm allowed=${String(c.value.allowed)}, state ${String(l.status?.state)}` : c.error };
}

/** Open a pairing window with the made-up key; the offer's host must be loopback. */
async function openWindow(cdp) {
  const offered = await pocket(cdp, 'beginPairing', { tailnetKey: KEY });
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const offer = JSON.parse(offered.value.payload);
  if (offer.host !== '127.0.0.1' || offer.port !== PORT) return { ok: false, why: `the QR names ${J(offer.host)}:${J(offer.port)}, which is not this run's loopback door; nothing was dialled` };
  return { ok: true, payload: offered.value.payload, offer };
}

function portAnswers() {
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port: PORT });
    const finish = (v) => {
      socket.destroy();
      done(v);
    };
    socket.setTimeout(3_000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

// ---------------------------------------------------------------------------
// The planted conversation, and the turn appended to it
// ---------------------------------------------------------------------------

function talkRecord() {
  if (!existsSync(TALK_SID)) return null;
  const sid = readFileSync(TALK_SID, 'utf8').trim();
  if (sid === '') return null;
  return { sid, file: join(HOME, '.claude', 'projects', WORK.replace(/[^a-zA-Z0-9]/g, '-'), `${sid}.jsonl`) };
}

/** How many turns are appended to the planted conversation (see D0). */
const PLANTED_TURNS = 41;

/** One exchange appended to the scratch COPY of the record. The committed fixture is never touched. */
function appendTurn(record, nth, askText, answerText) {
  // Distinct, rising, in the last minute: after the fixture's own turns, and
  // never in the future.
  const at = new Date(Date.now() - (PLANTED_TURNS + 1 - nth) * 1_000).toISOString();
  const base = { isSidechain: false, userType: 'external', entrypoint: 'cli', cwd: WORK, sessionId: record.sid, version: '2.1.238', gitBranch: 'main' };
  const pad = String(nth).padStart(4, '0');
  const lines = [
    J({ parentUuid: null, ...base, type: 'user', message: { role: 'user', content: askText }, uuid: `3160${pad}-1111-4111-8111-111111111111`, timestamp: at, promptSource: 'typed', promptId: `p316-${pad}`, origin: { kind: 'human' } }),
    J({ parentUuid: null, ...base, message: { model: 'claude-opus-5', id: `msg_p316${pad}`, type: 'message', role: 'assistant', content: [{ type: 'text', text: answerText }] }, requestId: `req_p316${pad}`, type: 'assistant', uuid: `3161${pad}-1111-4111-8111-111111111111`, timestamp: at })
  ];
  appendFileSync(record.file, `${lines.join('\n')}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// The key scan
// ---------------------------------------------------------------------------

function filesHolding(root, needles) {
  const hits = [];
  let files = 0;
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!st.isFile() || st.size > 64 * 1024 * 1024) continue;
      files += 1;
      let bytes;
      try {
        bytes = readFileSync(path);
      } catch {
        continue;
      }
      for (const [needle, what] of needles) if (bytes.indexOf(needle) !== -1) hits.push(`${name} (${what})`);
    }
  };
  if (existsSync(root)) walk(root);
  return { hits, files };
}
const KEY_NEEDLES = [
  [Buffer.from(KEY, 'utf8'), 'the key as UTF-8'],
  [Buffer.from(KEY, 'utf16le'), 'the key as UTF-16'],
  [Buffer.from(KEY.slice(11), 'utf8'), 'the key without its prefix']
];

// ---------------------------------------------------------------------------
// The Swift tests, driven and read
// ---------------------------------------------------------------------------

let runCounter = 0;
/**
 * One xcodebuild test run on `sim`, whose `P316|<run>|` lines are parsed as
 * they arrive and handed to `onEvent`, which may act on the Mac. Reactions are
 * queued, so a slow press never blocks the reading of the next line.
 */
async function drive(sim, { test, env, derivedDataPath, label, onEvent = null, timeoutMs = 900_000 }) {
  runCounter += 1;
  const run = `${String(process.pid)}-${String(runCounter)}`;
  const marker = `P316|${run}|`;
  const events = [];
  const reactions = [];
  const reactionErrors = [];
  // TWO CHANNELS, ONE READING (integrator, Phase 316.2). The Swift writes every
  // line to its stdout AND appends it to this file, because whether xcodebuild
  // relays a runner's output AS IT HAPPENS is unmeasured, and P1's Allow is a
  // reaction to a line the test prints while it waits. Each object carries
  // `seq`, so a line is read once, from whichever channel brought it first.
  // The file is read with fs/promises, never synchronously (pitfall b).
  const linesFile = join(XCODE, `lines-${run}.txt`);
  rmSync(linesFile, { force: true });
  const seen = new Set();
  const take = (line) => {
    const at = line.indexOf(marker);
    if (at === -1) return;
    let event;
    try {
      event = JSON.parse(line.slice(at + marker.length).trim());
    } catch {
      return;
    }
    if (event !== null && typeof event === 'object' && event.seq !== undefined) {
      if (seen.has(event.seq)) return;
      seen.add(event.seq);
    }
    events.push(event);
    if (onEvent !== null) reactions.push(Promise.resolve().then(() => onEvent(event)).catch((err) => reactionErrors.push(String(err?.message ?? err))));
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
    let at;
    while ((at = partial.indexOf('\n')) !== -1) {
      take(partial.slice(0, at));
      partial = partial.slice(at + 1);
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
  let r;
  try {
    r = await sim.xcodebuild(['test-without-building', '-project', test.project ?? PROJECT, '-scheme', SCHEME, `-only-testing:${test.id}`], {
      label,
      timeoutMs,
      derivedDataPath,
      testEnv: { P316_RUN: run, P316_LINES: linesFile, ...env },
      onLine: take
    });
  } finally {
    tailing = false;
    await tail;
  }
  await Promise.all(reactions);
  events.sort((a, b) => Number(a?.seq ?? 0) - Number(b?.seq ?? 0));
  const text = `${r.stdout}${r.stderr}`;
  const executed = /Executed (\d+) tests?/.exec(text)?.[1] ?? null;
  const skipped = /with (\d+) tests? skipped/.exec(text)?.[1] ?? '0';
  return { code: r.code, ms: r.ms, timedOut: r.timedOut, events, reactionErrors, executed: executed === null ? null : Number(executed), skipped: Number(skipped) };
}

const dumps = (events, name) => events.filter((e) => e.step === 'screen' && e.name === name);
const lastDump = (events, name) => dumps(events, name).at(-1) ?? null;
const el = (dump, id) => dump?.elements?.find((e) => e.id === id) ?? null;
const els = (dump, prefix) => (dump?.elements ?? []).filter((e) => typeof e.id === 'string' && e.id.startsWith(prefix));
const near = (a, b, tol = 0.5) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tol;
const aliveOf = (events) => events.find((e) => e.step === 'alive')?.state ?? null;
/** XCUIApplication.State.runningForeground. */
const RUNNING_FOREGROUND = 4;

/**
 * THE LIST, Method A: what the node reader's own reads say the list must draw,
 * against the labels and frames XCUITest read. `reads` is one or two answers
 * taken around the dump, so an age that ticked between them is either.
 */
function gradeList(dump, reads) {
  const problems = [];
  if (dump === null) return ['the UI test printed no "list" dump'];
  const first = reads[0];
  const rows = first.rows ?? [];
  const others = first.others ?? [];
  const wantBlocked = `${COPY.needsLead}${String(rows.length)}${COPY.close}`;
  // The count is every other session, the ones the door left out included
  // (`othersOmitted`), which is what "Everything else (n)" claims.
  const wantOthers = `${COPY.othersLead}${String(others.length + Math.max(0, Number(first.othersOmitted ?? 0)))}${COPY.close}`;
  /** A header's words: its text element's label, else its own. */
  const said = (id) => {
    const text = el(dump, `${id}-text`)?.label;
    return typeof text === 'string' && text !== '' ? text : (el(dump, id)?.label ?? null);
  };
  if (rows.length > 0 && said('section-blocked') !== wantBlocked) problems.push(`the blocked header reads ${J(said('section-blocked'))}, not ${J(wantBlocked)}`);
  if (others.length > 0 && said('section-others') !== wantOthers) problems.push(`the second header reads ${J(said('section-others'))}, not ${J(wantOthers)}`);
  // The order: every row main sent, blocked first, in main's order, drawn top to bottom.
  const want = [...rows, ...others].map((r) => r.sessionId);
  const drawn = els(dump, 'row-')
    .filter((e) => /^row-[^-]/.test(e.id) && !/^row-(dot|name|machine|age|line)-/.test(e.id))
    .sort((a, b) => a.frame[1] - b.frame[1])
    .map((e) => e.id.slice('row-'.length));
  const visible = want.filter((id) => drawn.includes(id));
  if (visible.length === 0) problems.push('no row main sent was drawn');
  if (J(drawn.filter((id) => want.includes(id))) !== J(visible)) problems.push(`the rows are drawn in the order ${J(drawn)}, and main sent ${J(want)}`);
  for (const row of [...rows, ...others]) {
    if (!drawn.includes(row.sessionId)) continue;
    const name = el(dump, `row-name-${row.sessionId}`)?.label;
    if (name !== row.name) problems.push(`row ${row.sessionId} draws the name ${J(name)}, not ${J(row.name)}`);
    const ages = reads.map((r) => [...(r.rows ?? []), ...(r.others ?? [])].find((x) => x.sessionId === row.sessionId)?.ageText).filter((a) => a !== undefined);
    const age = el(dump, `row-age-${row.sessionId}`)?.label;
    if (!ages.includes(age)) problems.push(`row ${row.sessionId} draws the age ${J(age)}; main said ${J(ages)}`);
    const machine = el(dump, `row-machine-${row.sessionId}`);
    if ((row.machine === null) !== (machine === null)) problems.push(`row ${row.sessionId} ${machine === null ? 'draws no machine badge for' : 'draws a machine badge on'} a session ${row.machine === null ? 'on this Mac' : 'elsewhere'}`);
    const line = el(dump, `row-line-${row.sessionId}`)?.label ?? '';
    // Main.html's two shapes: a WAITING row reads `project · question`, and
    // every other row reads `status · project` (ListScreen.swift's RowDrawing).
    // A row that is not waiting may still carry a question the feed has not
    // cleared yet; its second line is the status title all the same.
    const asking = rows.includes(row) && row.question !== null;
    const second = asking ? row.question : row.statusTitle;
    if (!line.includes(row.project) || !line.includes(second)) problems.push(`row ${row.sessionId}'s second line ${J(line.slice(0, 80))} does not carry the project and ${asking ? 'the question' : 'the status title'}`);
  }
  const note = el(dump, 'list-age-note')?.label;
  if (note !== first.ageNote) problems.push(`the age note reads ${J(note)}, not main's ${J(first.ageNote)}`);
  const read = el(dump, 'list-read')?.label ?? '';
  if (COPY.readLead !== null && !read.startsWith(COPY.readLead)) problems.push(`the foot reads ${J(read)}, which does not start with ${J(COPY.readLead)}`);
  // THE FRAMES, from the mock's own CSS, measured from POSITIONS: a text's
  // centre is the centre of its line box whatever height its glyphs read, and a
  // row's top and height are the row's own. Never a glyph box against a CSS box.
  const frames = [];
  const screenX = el(dump, 'screen-list')?.frame?.[0] ?? 0;
  const round = (n) => Math.round(n * 100) / 100;
  const centre = (e) => e.frame[1] + e.frame[3] / 2;
  const rowBoxes = drawn.map((id) => el(dump, `row-${id}`)).filter((e) => e !== null);
  const known = (...values) => values.every((n) => typeof n === 'number' && Number.isFinite(n));
  for (const id of ['section-blocked', 'section-others']) {
    // The header's words, else the header itself. SwiftUI reports a header
    // container by the union of its children, so its own frame is the text's.
    const t = el(dump, `${id}-text`) ?? el(dump, id);
    if (t === null) continue;
    if (FRAMES.gutter !== null && !near(t.frame[0] - screenX, FRAMES.gutter)) problems.push(`${id}'s words start at x ${String(round(t.frame[0] - screenX))}; the gutter is ${String(FRAMES.gutter)}`);
    // `.hdr { height: 28px; align-items: center; border-bottom: 1px }`: the
    // words sit in the middle of the 28 pt box and the next row starts one
    // hairline below it, so the box is twice the distance from the words'
    // centre to the hairline.
    const next = rowBoxes.filter((r) => r.frame[1] >= centre(t)).sort((a, b) => a.frame[1] - b.frame[1])[0] ?? null;
    let height = null;
    if (next !== null && known(FRAMES.headerHeight, FRAMES.hairline)) {
      height = round(2 * (next.frame[1] - FRAMES.hairline - centre(t)));
      if (!near(height, FRAMES.headerHeight, 1)) problems.push(`${id} is ${String(height)} pt tall (its words centred at y ${String(round(centre(t)))}, the next row at ${String(round(next.frame[1]))}); the mock's .hdr is ${String(FRAMES.headerHeight)}`);
    }
    frames.push({ id, textX: round(t.frame[0] - screenX), textCentre: round(centre(t)), nextRowTop: next === null ? null : round(next.frame[1]), height });
  }
  const [vertical, horizontal] = FRAMES.rowPadding ?? [null, null];
  const lineBoxes = known(vertical, horizontal, FRAMES.rowGap, FRAMES.hairline, FRAMES.nameLine, FRAMES.secondLine);
  // THE RIGHT GUTTER (his nit of 2026-09-23: the grader measured the left one
  // and never the right). A row's own frame spans the window, because the
  // whole row is the tap target, so its right edge is its WORDS' right edge:
  // the rightmost of its parts, which is the age, `.row`'s right padding in
  // from the window's edge.
  const windowWidth = Array.isArray(dump.window) && known(dump.window[0]) && dump.window[0] > 0 ? dump.window[0] : (() => {
    const screen = el(dump, 'screen-list')?.frame;
    return screen === undefined ? null : screen[0] + screen[2];
  })();
  if (!lineBoxes && drawn.length > 0) problems.push(`the mock's row box could not be read from Main.html (${J(FRAMES)}), so the rows were not measured`);
  for (const id of lineBoxes ? drawn : []) {
    const row = el(dump, `row-${id}`);
    const dot = el(dump, `row-dot-${id}`);
    const name = el(dump, `row-name-${id}`);
    const line = el(dump, `row-line-${id}`);
    if (row === null) continue;
    const top = row.frame[1];
    // `.row { padding: 6px 16px; gap: 2px; border-bottom: 1px }` around a 22 pt
    // name line and a 20 pt second line; the very last row has no hairline.
    const last = id === drawn.at(-1);
    const wantHeight = vertical + FRAMES.nameLine + FRAMES.rowGap + FRAMES.secondLine + vertical + (last ? 0 : FRAMES.hairline);
    const wantName = vertical + FRAMES.nameLine / 2;
    const wantLine = vertical + FRAMES.nameLine + FRAMES.rowGap + FRAMES.secondLine / 2;
    if (dot !== null && !near(dot.frame[0] - row.frame[0], horizontal)) problems.push(`row ${id}'s dot sits ${String(round(dot.frame[0] - row.frame[0]))} pt in; the mock's row padding is ${String(horizontal)}`);
    const parts = ['dot', 'name', 'machine', 'age', 'line'].map((part) => el(dump, `row-${part}-${id}`)).filter((e) => e !== null && Array.isArray(e.frame));
    const rightEdge = parts.length === 0 ? null : Math.max(...parts.map((e) => e.frame[0] + e.frame[2]));
    const rightGutter = rightEdge === null || windowWidth === null ? null : windowWidth - rightEdge;
    if (el(dump, `row-age-${id}`) === null) problems.push(`row ${id} draws no age, so its right gutter was not measured`);
    else if (rightGutter === null) problems.push(`row ${id}'s right gutter could not be measured (window ${J(dump.window ?? null)})`);
    else if (!near(rightGutter, horizontal)) problems.push(`row ${id}'s words end ${String(round(rightGutter))} pt from the window's right edge (${String(round(windowWidth))} − ${String(round(rightEdge))}); the mock's row padding is ${String(horizontal)}`);
    if (!near(row.frame[3], wantHeight, 0.75)) problems.push(`row ${id} is ${String(round(row.frame[3]))} pt tall; the mock's row box is ${String(wantHeight)} (${String(vertical)}+${String(FRAMES.nameLine)}+${String(FRAMES.rowGap)}+${String(FRAMES.secondLine)}+${String(vertical)}${last ? ', the last row, no hairline' : `+${String(FRAMES.hairline)}`})`);
    if (name !== null && !near(centre(name) - top, wantName, 1)) problems.push(`row ${id}'s name is centred ${String(round(centre(name) - top))} pt down its row; the mock's padding and line box put it at ${String(wantName)}`);
    if (line !== null && !near(centre(line) - top, wantLine, 1)) problems.push(`row ${id}'s second line is centred ${String(round(centre(line) - top))} pt down its row; the mock's padding, gap and line boxes put it at ${String(wantLine)}`);
    frames.push({
      id: `row ${id.slice(0, 8)}`,
      height: round(row.frame[3]),
      dotInset: dot === null ? null : round(dot.frame[0] - row.frame[0]),
      rightGutter: rightGutter === null ? null : round(rightGutter),
      nameCentre: name === null ? null : round(centre(name) - top),
      lineCentre: line === null ? null : round(centre(line) - top)
    });
  }
  if (frames.length === 0) problems.push('no section header or row frame was read, so the frames were not measured');
  return problems.length > 0 ? problems : { frames };
}

// ---------------------------------------------------------------------------
// The hostile door, in a process of its own
// ---------------------------------------------------------------------------

/** Start one arm's door as a child under tsx; resolves with its first line and a live event list. */
function startDoorChild(armName) {
  return new Promise((done) => {
    const child = spawn(process.execPath, hostileDoorArgv(['serve', '--arm', armName]), {
      cwd: ROOT,
      env: { ...process.env, P316_HOSTILE_INNER: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const events = [];
    let buf = '';
    let facts = null;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const timer = setTimeout(() => finish({ child, facts: null, events, why: 'the hostile door printed nothing in 60 s' }), 60_000);
    child.stdout.on('data', (c) => {
      buf += c.toString('utf8');
      let at;
      while ((at = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        if (line.startsWith('P316_DOOR_EVENT:')) events.push(JSON.parse(line.slice('P316_DOOR_EVENT:'.length)));
        else if (line.startsWith('P316_DOOR:')) {
          facts = JSON.parse(line.slice('P316_DOOR:'.length));
          clearTimeout(timer);
          finish({ child, facts, events, why: null });
        }
      }
    });
    child.stderr.on('data', () => undefined);
    child.on('exit', (code) => {
      clearTimeout(timer);
      finish({ child, facts: null, events, why: `the hostile door exited ${String(code)} before it served` });
    });
  });
}

/** End a hostile door child: close its stdin, SIGTERM, then SIGKILL. */
async function endDoorChild(child) {
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

/** A sentence the app drew in place of a screen: any failure element or pairing line with words. */
function drawnSentence(events) {
  for (const d of [...events].reverse().filter((e) => e.step === 'screen')) {
    // `conversation-older-line` is where the conversation says a page of older
    // turns was refused (ConversationScreen.swift): the turns already read stay
    // above it, and paging stops with it.
    const hit = (d.elements ?? []).find((e) => (/-failure$/.test(e.id) || e.id === 'pairing-line' || e.id === 'conversation-older-line') && typeof e.label === 'string' && e.label.trim() !== '');
    if (hit !== undefined) {
      // The `Copy.swift` word it is, by name, or null. The report keeps the
      // name, the length and a digest; the words stay out of it.
      const word = Object.entries(COPY_WORDS).find(([, text]) => text === hit.label)?.[0] ?? null;
      return { id: hit.id, length: hit.label.length, rows: els(d, 'row-').length, sha: shaHex(hit.label).slice(0, 12), word };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// --grader-self-test: the list grader, proved on dumps written here. Nothing launches.
// ---------------------------------------------------------------------------

function selfTest() {
  const reads = [
    {
      rows: [{ sessionId: 'a', name: 'fix-login', project: 'webapp', machine: null, question: 'Edit x?', statusTitle: 'Needs input', ageText: '2m' }],
      others: [{ sessionId: 'b', name: 'talk', project: 'api', machine: 'Mac Pro', question: null, statusTitle: 'Working', ageText: 'now' }],
      ageNote: 'the age note'
    }
  ];
  // THE HONEST DUMP IS A REAL ONE's SHAPE (Phase 316.2's fix round): the
  // frames XCUITest read from the app on iOS 26.3 against the real door, as
  // verifier A dumped them. A header's container reads the same frame as its
  // words (SwiftUI reports a container by the union of its children), a Text
  // reads its glyph box (a 15 pt line 18 tall inside its 20 pt line box), a row
  // reads 57 with its hairline and the very last row 56. The first grader
  // judged glyph boxes against CSS boxes and failed exactly this list.
  const rowAt = (id, y, name, age, line, machine, last) => [
    { id: `row-${id}`, label: '', frame: [0, y, 402, last ? 56 : 57] },
    { id: `row-dot-${id}`, label: '', frame: [16, y + 12, 10, 10] },
    { id: `row-name-${id}`, label: name, frame: [34, y + 6.8333, 60.33, 20.3333] },
    { id: `row-age-${id}`, label: age, frame: [361, y + 9.1667, 25, 15.6667] },
    { id: `row-line-${id}`, label: line, frame: [16, y + 31, 200, 18] },
    ...(machine === null ? [] : [{ id: `row-machine-${id}`, label: machine, frame: [300, y + 9, 50, 16] }])
  ];
  const good = {
    step: 'screen',
    name: 'list',
    window: [402, 874],
    elements: [
      { id: 'screen-list', label: '', frame: [0, 0, 402, 874] },
      { id: 'list-title', label: 'Sessions', frame: [16, 62.1667, 115, 33.6667] },
      { id: 'section-blocked', label: '', frame: [16, 110.1667, 156.6667, 15.6667] },
      { id: 'section-blocked-text', label: `${String(COPY.needsLead)}1${String(COPY.close)}`, frame: [16, 110.1667, 156.6667, 15.6667] },
      ...rowAt('a', 133, 'fix-login', '2m', 'webapp · Edit x?', null, false),
      { id: 'section-others', label: '', frame: [16, 216.1667, 149.6667, 15.6667] },
      { id: 'section-others-text', label: `${String(COPY.othersLead)}1${String(COPY.close)}`, frame: [16, 216.1667, 149.6667, 15.6667] },
      ...rowAt('b', 239, 'talk', 'now', 'api · Working', 'Mac Pro', true),
      { id: 'list-age-note', label: 'the age note', frame: [16, 312, 357, 33.6667] },
      { id: 'list-read', label: `${String(COPY.readLead)}4:32 PM`, frame: [306, 351.6667, 80, 15.6667] }
    ]
  };
  const edit = (fn) => {
    const d = structuredClone(good);
    fn(d.elements);
    return d;
  };
  const find = (list, id) => list.find((e) => e.id === id);
  const move = (list, pattern, dy) => {
    for (const e of list) if (pattern.test(e.id)) e.frame[1] += dy;
  };
  const cases = [
    { what: 'the honest dump, read from the app on iOS 26.3', dump: good, red: false },
    { what: 'the honest dump with the header containers drawn as 28 pt boxes', dump: edit((l) => { find(l, 'section-blocked').frame = [0, 104, 402, 28]; find(l, 'section-others').frame = [0, 210, 402, 28]; }), red: false },
    { what: 'a header count that is not main\'s', dump: edit((l) => (find(l, 'section-blocked-text').label = `${String(COPY.needsLead)}2${String(COPY.close)}`)), red: true },
    { what: 'the two rows drawn in the other order', dump: edit((l) => move(l, /-a$/, 400)), red: true },
    { what: 'a gutter of 24.17 pt, the defect SPEC §3.4 measured', dump: edit((l) => (find(l, 'section-blocked-text').frame[0] = 24.17)), red: true },
    { what: 'a right gutter of 24 pt: every row\'s words end 24 pt from the window\'s right edge', dump: edit((l) => { for (const id of ['a', 'b']) find(l, `row-age-${id}`).frame[0] = 402 - 24 - 25; }), red: true },
    { what: 'a right gutter of 24 pt on one row only', dump: edit((l) => (find(l, 'row-age-b').frame[0] = 402 - 24 - 25)), red: true },
    { what: 'a 30 pt section header (its words 1 pt lower, its rows 2 pt lower)', dump: edit((l) => { move(l, /^section-others/, 1); move(l, /-b$/, 2); }), red: true },
    { what: 'a 26 pt section header', dump: edit((l) => { move(l, /^section-others/, -1); move(l, /-b$/, -2); }), red: true },
    { what: 'an age main did not send', dump: edit((l) => (find(l, 'row-age-a').label = '3m')), red: true },
    { what: 'no machine badge on a session elsewhere', dump: edit((l) => l.splice(l.indexOf(find(l, 'row-machine-b')), 1)), red: true },
    { what: 'a name 4 pt down in its row', dump: edit((l) => (find(l, 'row-name-a').frame[1] += 4)), red: true },
    { what: 'a second line 3 pt low, so 3 pt of bottom padding', dump: edit((l) => (find(l, 'row-line-a').frame[1] += 3)), red: true },
    { what: 'a row that is not the last drawn without its hairline', dump: edit((l) => (find(l, 'row-a').frame[3] = 56)), red: true },
    { what: 'the last row drawn with a hairline under it', dump: edit((l) => (find(l, 'row-b').frame[3] = 57)), red: true },
    { what: 'rows with 8/16 padding', dump: edit((l) => { find(l, 'row-a').frame[3] = 61; move(l, /^row-(name|age|line|dot)-a$/, 2); }), red: true },
    { what: 'the question missing from the second line', dump: edit((l) => (find(l, 'row-line-a').label = 'webapp')), red: true }
  ];
  let bad = 0;
  for (const c of cases) {
    const got = gradeList(c.dump, reads);
    const red = Array.isArray(got);
    const ok = red === c.red;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${red ? `red (${got[0]})` : 'green'}`);
  }
  console.log(bad === 0 ? `${TAG} self-test PASS: ${String(cases.length)} dumps graded as they must be, against the mock's own frames ${J(FRAMES)}.` : `${TAG} self-test FAIL: ${String(bad)} dump(s) graded wrongly.`);
  process.exit(bad === 0 ? 0 : 1);
}
// NOT `--self-test`: build/cdp-target.mjs, imported above, runs ITS fixtures
// and exits when argv holds that exact word.
if (process.argv.includes('--grader-self-test')) selfTest();
preflight();

const doorChildren = new Set();
let ran = false;
let appText = '';
let shimPid = 0;
let appPid = 0;

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, WORK, BIN, XCODE, join(HOME, '.claude')]) mkdirSync(dir, { recursive: true });
  if (await portAnswers()) {
    arm('the run', null, `something already accepts on 127.0.0.1:${String(PORT)}, the door's confirmed port`);
    throw new Error('port taken');
  }

  // ---- B1: the two builds, before anything serves ------------------------
  const built = await xcodebuildRun({
    label: 'shipping',
    scratch: XCODE,
    derivedDataPath: DD,
    args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
  });
  cp(join(ROOT, 'ios'), IOS_NOKEY);
  const plistPath = join(IOS_NOKEY, 'Tortie', 'Info.plist');
  const plist = readFileSync(plistPath, 'utf8');
  const stripped = plist.replace(/\s*<key>NSAppTransportSecurity<\/key>\s*<dict>[\s\S]*?<\/dict>\s*<\/dict>\s*<\/dict>/, '');
  writeFileSync(plistPath, stripped);
  const builtNoKey = stripped !== plist && !stripped.includes('NSAppTransportSecurity')
    ? await xcodebuildRun({
        label: 'nokey',
        scratch: XCODE,
        derivedDataPath: DD_NOKEY,
        args: ['build-for-testing', '-project', join(IOS_NOKEY, 'Tortie.xcodeproj'), '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
      })
    : { code: 1, ms: 0 };
  report.readings.builds = { shipping: { code: built.code, ms: built.ms }, nokey: { code: builtNoKey.code, ms: builtNoKey.ms, keyRemoved: stripped !== plist } };
  arm('B1 the app builds for the Simulator, ad hoc with no team, with the ATS key and without it', built.code === 0 && builtNoKey.code === 0, `shipping exited ${String(built.code)} in ${String(built.ms)} ms; the copy without the key exited ${String(builtNoKey.code)} in ${String(builtNoKey.ms)} ms`);
  if (built.code !== 0) throw new Error('no build');

  // ---- the fake claude and the project ------------------------------------
  writeFileSync(
    join(BIN, 'claude'),
    `#!/bin/sh
# probe:p316. Not Claude Code. It prints a committed fixture and waits.
case "$1" in
  -v|--version) echo "2.1.238 (Claude Code)"; exit 0;;
esac
sid=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--session-id" ] || [ "$prev" = "--resume" ]; then sid="$a"; fi
  prev="$a"
done
mode=""
if [ -n "$P316_NEXT" ] && [ -f "$P316_NEXT" ]; then
  mode=$(cat "$P316_NEXT")
  rm -f "$P316_NEXT"
fi
if [ "$mode" = "talk" ] && [ -n "$sid" ]; then
  slug=$(printf '%s' "$PWD" | sed 's|[^a-zA-Z0-9]|-|g')
  d="$HOME/.claude/projects/$slug"
  mkdir -p "$d"
  if [ ! -f "$d/$sid.jsonl" ]; then
    sed -e "s|${FIXTURE_SID}|$sid|g" -e "s|${FIXTURE_CWD}|$PWD|g" "$P316_STORE" > "$d/$sid.jsonl"
  fi
  printf '%s\\n' "$sid" > "$P316_TALK_SID"
  echo "p316 a planted conversation"
fi
if [ "$mode" = "ask" ]; then
  sleep 2
  cat "$P316_DIALOG"
fi
while [ ! -f "$P316_STOP" ]; do sleep 1; done
exit 0
`,
    'utf8'
  );
  chmodSync(join(BIN, 'claude'), 0o755);
  writeFileSync(join(HOME, '.zprofile'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  writeFileSync(join(HOME, '.zshrc'), `export PATH="${BIN}:$PATH"\n`, 'utf8');
  const git = (args) => spawnSync('git', args, { cwd: WORK, encoding: 'utf8', env: { ...process.env, HOME } });
  git(['init', '-q']);
  writeFileSync(join(WORK, 'note.txt'), 'hello\n');
  git(['add', '-A']);
  git(['-c', 'user.email=p@x', '-c', 'user.name=p', 'commit', '-qm', 'seed']);

  // ---- Electron ------------------------------------------------------------
  await withElectron(
    {
      label: 'p316',
      userDataDir: PROFILE,
      cwd: ROOT,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: withoutDevRenderer({
        ...INHERITED_CLAUDE,
        HOME,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '1',
        GMUX_LOG_FILE: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        GMUX_CONFIG_ROOT: join(PROFILE, 'gmux', 'config'),
        GMUX_HARNESS_DIR: HARNESS,
        // THE LOOPBACK BIND: src/main/pocket/bind.ts binds 127.0.0.1 under
        // this and nothing else. No real interface is bound in this run.
        GMUX_POCKET_LOOPBACK: '1',
        P316_NEXT: NEXT,
        P316_STOP: STOP,
        P316_TALK_SID: TALK_SID,
        P316_DIALOG: DIALOG,
        P316_STORE: STORE_SRC
      }),
      graceMs: 8_000,
      ceilingMs: 3_600_000
    },
    async (handle) => {
      try {
        const cdp = await attach(150_000);
        if (!(await armed(cdp))) {
          arm('the run', null, 'the app never armed its bridge and the harness drives');
          return;
        }

        // ---- D0: sessions ------------------------------------------------
        await cdpEval(cdp, `window.__gmuxP93.setup(${J({ path: WORK, names: [N.shell] })}).then(() => true)`);
        writeFileSync(NEXT, 'talk', 'utf8');
        await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.talk)}, 'claude').then(() => true).catch(() => false)`);
        for (let i = 0; i < 60 && talkRecord() === null; i += 1) await sleep(500);
        rmSync(NEXT, { force: true });
        writeFileSync(NEXT, 'ask', 'utf8');
        await cdpEval(cdp, `window.__gmuxP202.createSession(${J(N.ask)}, 'claude').then(() => true).catch(() => false)`);
        const record = talkRecord();
        // The Method A turns. The first holds **x** in its ask and its answer,
        // and 40 more follow it, so the conversation is three of the door's
        // 20-turn pages and the **x** turn is on the OLDEST of them: T1 reads
        // it only if the app paged back (Phase 316.2's fix round; the first
        // build planted one turn, the conversation fit on one page, and T1
        // passed while paging back had never worked). Every answer carries
        // markdown, so S1's last answer is read as rendered too.
        if (record !== null) {
          appendTurn(record, 1, 'p316 the ask keeps **x** as typed', 'p316 the answer draws **x** in bold');
          for (let nth = 2; nth <= PLANTED_TURNS; nth += 1) appendTurn(record, nth, `p316 ask ${String(nth)}`, `p316 answer **${String(nth)}**`);
        }

        // ---- D1: on, confirm, listening ----------------------------------
        const on = await pocket(cdp, 'setDoor', { on: true });
        const opened = on.ok ? await confirmListening(cdp) : { ok: false, why: on.error };
        const listening = await waitStatus(cdp, (s) => s.state === 'listening', 20_000);
        arm('D1 the door switched on and confirmed, listening on loopback', opened.ok && listening.ok && listening.status.address === '127.0.0.1' && listening.status.port === PORT, `${opened.why ?? ''}; status ${J({ state: listening.status?.state, address: listening.status?.address, port: listening.status?.port })}`);
        if (!listening.ok) return;

        // ---- D2: the node reader pairs, window 1 --------------------------
        const w1 = await openWindow(cdp);
        if (!w1.ok) {
          arm('D2 the node reader pairs', false, w1.why);
          return;
        }
        const reader = makePhone('p316 reader', w1.offer.dx);
        const readerDoor = { port: PORT, pin: w1.offer.fp };
        const presented = await present(readerDoor, sealPresentation(w1.offer.ps, reader));
        const sheet = await pocket(cdp, 'pairingState');
        const allowReader = sheet.ok && sheet.value.state === 'presented' ? await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash }) : { ok: false };
        await pocket(cdp, 'cancelPairing');
        const readerCheck = await signedGet(reader, readerDoor, '/v1/blocked');
        arm('D2 the node reader pairs and reads', presented.status === 200 && allowReader.ok && readerCheck.status === 200, `present ${String(presented.status)}, Allow ${allowReader.ok ? 'pressed' : 'FAILED'}, first read ${String(readerCheck.status)}`);
        if (readerCheck.status !== 200) return;
        /** One read by the node reader, or null when the door did not answer it. */
        const readJson = async (target) => {
          const a = await signedGet(reader, readerDoor, target);
          try {
            return a.status === 200 ? JSON.parse(a.body) : null;
          } catch {
            return null;
          }
        };
        const readBlocked = () => readJson('/v1/blocked');

        // The waiting session must really be waiting before the list is graded.
        for (let i = 0; i < 90; i += 1) {
          if ((await mainSessions(cdp)).find((s) => s.name === N.ask)?.status === 'needs_input') break;
          await sleep(1_000);
        }
        const talk = (await mainSessions(cdp)).find((s) => s.name === N.talk);

        /**
         * One pairing of the app on `sim`, and everything that follows it. The
         * reactions press the Mac's own buttons when the UI test says so.
         */
        const pairAndRead = async (sim, steps, label) => {
          const w = await openWindow(cdp);
          if (!w.ok) return { ok: false, why: w.why };
          let macFingerprint = null;
          let drawnFingerprint = null;
          let allowed = false;
          let simPhoneId = null;
          const readsAroundList = [];
          const opened = steps.find((st) => st.startsWith('open:'));
          const sessionIdOpened = opened === undefined ? null : opened.slice('open:'.length);
          let sessionAround = null;
          let removed = null;
          const phonesBefore = ((await pocket(cdp, 'status')).value?.phones ?? []).map((p) => p.id);
          const result = await drive(sim, {
            test: { id: UI_TEST },
            label,
            env: { P316_PAYLOAD: w.payload, P316_STEPS: steps.join(','), P316_WAIT_S: '150' },
            onEvent: async (event) => {
              if (event.step === 'fingerprint') {
                drawnFingerprint = String(event.text ?? '');
                // The Mac draws the phone's fingerprint once it has presented.
                for (let i = 0; i < 40; i += 1) {
                  const v = await pocket(cdp, 'pairingState');
                  if (v.ok && v.value.state === 'presented') {
                    macFingerprint = v.value.fingerprint;
                    if (fingerprintDigits(macFingerprint) === fingerprintDigits(drawnFingerprint) && fingerprintDigits(drawnFingerprint).length === 24) {
                      const a = await pocket(cdp, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
                      allowed = a.ok && a.value.allowed === true;
                    }
                    break;
                  }
                  await sleep(500);
                }
              }
              if (event.step === 'list-before') {
                // Paired: the app's first SIGNED read succeeded. Shut the
                // window so "allowed" is answered to nobody else (P2b), and read
                // BEFORE the app's refresh, so the two reads bracket it and an
                // age that ticks over a minute in between is one of them.
                await pocket(cdp, 'cancelPairing');
                readsAroundList.push(await readBlocked());
              }
              if (event.step === 'screen' && event.name === 'list') {
                await pocket(cdp, 'cancelPairing');
                readsAroundList.push(await readBlocked());
              }
              if (event.step === 'screen' && event.name === 'session' && sessionIdOpened !== null) {
                // The session as the door answered it at the moment the app drew
                // it, not minutes later when the run is over.
                sessionAround = (await readJson(`/v1/session?id=${encodeURIComponent(sessionIdOpened)}`))?.session ?? null;
              }
              if (event.step === 'ready-for-remove') {
                const phones = ((await pocket(cdp, 'status')).value?.phones ?? []).map((p) => p.id);
                simPhoneId = phones.find((id) => !phonesBefore.includes(id)) ?? null;
                const r = simPhoneId === null ? { ok: false, error: 'no new phone listed' } : await pocket(cdp, 'removePhone', simPhoneId);
                // A Remove closes a listening door until the person confirms
                // again (316.1 as built, row 19); confirm, so the app's next
                // read is answered — refused, as unpaired — rather than cut.
                const again = await confirmListening(cdp);
                removed = { ok: r.ok, reopened: again.ok };
              }
            }
          });
          if (readsAroundList.length > 0) readsAroundList.push(await readBlocked());
          return { ok: true, result, macFingerprint, drawnFingerprint, allowed, readsAroundList: readsAroundList.filter((r) => r !== null), removed, simPhoneId, sessionAround };
        };

        /** The ATS arm on `sim`: key and no key. */
        const atsArm = async (sim, tag) => {
          const door = await startDoorChild('ats');
          doorChildren.add(door.child);
          try {
            if (door.facts === null) {
              arm(`A1 ${tag} the ATS arm`, null, door.why ?? 'the stand-ins did not start');
              return;
            }
            const env = { P316_ATS_HOST: door.facts.atsHost, P316_ATS_PORT: String(door.facts.port), P316_ATS_PIN: door.facts.pin, P316_SOCKS_PORT: String(door.facts.socksPort) };
            const withKey = await drive(sim, { test: { id: ATS_TEST }, label: `ats-key-${tag}`, env, derivedDataPath: DD, timeoutMs: 300_000 });
            const servedWithKey = door.events.filter((e) => e.kind === 'request').length;
            const socksWithKey = door.events.filter((e) => e.kind === 'socks');
            const before = door.events.length;
            const noKey = builtNoKey.code === 0
              ? await drive(sim, { test: { id: ATS_TEST, project: join(IOS_NOKEY, 'Tortie.xcodeproj') }, label: `ats-nokey-${tag}`, env, derivedDataPath: DD_NOKEY, timeoutMs: 300_000 })
              : null;
            const later = door.events.slice(before);
            const a = withKey.events.find((e) => e.step === 'ats') ?? null;
            const b = noKey?.events.find((e) => e.step === 'ats') ?? null;
            report.readings[`ats-${tag}`] = { withKey: a, noKey: b, servedWithKey, socks: socksWithKey.map((s) => ({ atyp: s.atyp, host: s.host, allowed: s.allowed })), servedNoKey: later.filter((e) => e.kind === 'request').length };
            if (a === null || b === null) {
              arm(`A1 ${tag} the ATS arm`, null, `the ATS test printed ${a === null ? 'nothing with the key' : 'its line'} and ${b === null ? 'nothing without it' : 'its line'} (xcodebuild ${String(withKey.code)}/${String(noKey?.code)}, ${String(withKey.executed)} test(s), ${String(withKey.skipped)} skipped); is TortieTests/P316ATSTests there?`);
              return;
            }
            arm(
              `A1 ${tag} 100.64.0.1 through the SOCKS stand-in: answered with the ATS key, refused -1200 without it`,
              a.ok === true && a.answer === 'pending' && servedWithKey >= 1 && socksWithKey.length >= 1 && socksWithKey.every((s) => s.atyp === 1 && s.host === '100.64.0.1' && s.allowed) &&
                b.ok === false && Number(b.code) === -1200 && later.filter((e) => e.kind === 'request').length === 0,
              `with the key: ${J(a)}, ${String(servedWithKey)} request(s) served, CONNECTs ${J(socksWithKey.map((s) => `ATYP=${String(s.atyp)} ${String(s.host)}`))}; without it: ${J(b)}, ${String(later.filter((e) => e.kind === 'request').length)} request(s) served`
            );
          } finally {
            await endDoorChild(door.child);
            doorChildren.delete(door.child);
          }
        };

        /** K1 on `sim`: the made-up key in nothing the app wrote. */
        const keyScan = async (sim, tag) => {
          const container = await sim.simctl('get_app_container', BUNDLE_ID, 'data');
          const roots = [container.code === 0 ? container.stdout.trim() : null, join(sim.dataPath(), 'Library', 'Keychains')].filter((p) => p !== null && p !== '');
          const scanned = roots.map((r) => filesHolding(r, KEY_NEEDLES));
          const hits = scanned.flatMap((s) => s.hits);
          arm(`K1 ${tag} the made-up tailnet key is in nothing the app wrote`, scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) in the app's container and the device keychain read; ${hits.length === 0 ? 'none holds the key' : `the key is in ${J(hits)}`}`);
        };

        // ==================================================================
        // iOS 26.3: the order
        // ==================================================================
        if (ARMS.has('order') || ARMS.has('ats')) {
          await withSimulator({ label: 'p316-order', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-order'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            if (ARMS.has('order')) {
              const steps = ['pair', 'list', ...(talk !== undefined ? [`open:${talk.id}`, 'conversation', 'first'] : []), 'unpaired'];
              const run = await pairAndRead(sim, steps, 'order');
              if (!run.ok) {
                arm('P1 pairing', false, run.why);
                return;
              }
              const ev = run.result.events;
              report.readings.order = { xcodebuild: run.result.code, ms: run.result.ms, lines: ev.length, executed: run.result.executed, reactionErrors: run.result.reactionErrors };
              if (ev.length === 0) {
                arm('P1 pairing', null, `the UI test printed no P316 line (xcodebuild exited ${String(run.result.code)}, ${String(run.result.executed)} test(s), ${String(run.result.skipped)} skipped); is ${UI_TEST} there?`);
                return;
              }
              // P1
              const listDrawn = lastDump(ev, 'list') !== null && el(lastDump(ev, 'list'), 'screen-list') !== null;
              arm(
                'P1 the fingerprint the app draws is the Mac\'s, Allow, and the first SIGNED read makes it paired',
                run.drawnFingerprint !== null && run.macFingerprint !== null && fingerprintDigits(run.drawnFingerprint) === fingerprintDigits(run.macFingerprint) && run.allowed && listDrawn,
                `drawn ${J(fingerprintDigits(run.drawnFingerprint ?? '').length)} hex digits, the Mac's ${run.macFingerprint === null ? 'never shown' : fingerprintDigits(run.drawnFingerprint ?? '') === fingerprintDigits(run.macFingerprint) ? 'THE SAME' : 'DIFFERENT'}${run.drawnFingerprint === run.macFingerprint ? ', byte for byte' : ''}; Allow ${run.allowed ? 'pressed' : 'NOT pressed'}; the list ${listDrawn ? 'drawn' : 'NOT drawn'}`
              );
              // L1
              const listGrade = run.readsAroundList.length === 0 ? ['the node reader read nothing around the list'] : gradeList(lastDump(ev, 'list'), run.readsAroundList);
              arm('L1 the list says what main sent, in its order, at the mocks\' frames', !Array.isArray(listGrade), Array.isArray(listGrade) ? listGrade.slice(0, 8).join('; ') : `sections and ${String(run.readsAroundList[0].rows.length + run.readsAroundList[0].others.length)} row(s) agree; frames ${J(listGrade.frames)}`);
              report.readings.frames.measured = Array.isArray(listGrade) ? null : listGrade.frames;
              // S1
              if (talk !== undefined) {
                const detail = run.sessionAround ?? (await readJson(`/v1/session?id=${encodeURIComponent(talk.id)}`))?.session ?? null;
                const d = lastDump(ev, 'session');
                const problems = [];
                if (detail === null) problems.push('the node reader could not read the session, so there is nothing to compare with');
                else if (d === null) problems.push('no "session" dump');
                else {
                  if (el(d, 'session-status')?.label !== detail.statusTitle) problems.push(`the status reads ${J(el(d, 'session-status')?.label)}, not ${J(detail.statusTitle)}`);
                  const agent = el(d, 'session-agent')?.label ?? '';
                  if (!agent.includes(detail.agentLabel) || !agent.includes(detail.project)) problems.push(`the agent line ${J(agent)} does not carry ${J(detail.agentLabel)} and ${J(detail.project)}`);
                  if (detail.catchUp !== null && !(el(d, 'session-outcome')?.label ?? '').includes(detail.catchUp.outcome)) problems.push('the Catch Me Up outcome is not main\'s');
                  const last = el(d, 'session-last-message-small')?.label ?? el(d, 'session-last-message')?.label ?? '';
                  if (detail.lastMessageText === null && /(^|\s)0(\s|$)/.test(last)) problems.push('a missing last message is drawn as 0');
                  const answer = el(d, 'session-answer')?.label ?? null;
                  if (detail.lastAnswer !== null && (answer === null || answer.includes('**'))) problems.push(`the last answer is ${answer === null ? 'not drawn' : 'drawn with its asterisks, so not as markdown'}`);
                }
                arm('S1 one session, in main\'s words', problems.length === 0, problems.length === 0 ? `status, agent and project, the outcome, the counts and the last answer (markdown, ${String(detail?.lastAnswer?.length ?? 0)} characters) agree with the door` : problems.join('; '));
                // T1
                const turnsEvent = ev.find((e) => e.step === 'turns') ?? null;
                const paged = await pageBack(reader, readerDoor, talk.id, 20);
                const all = paged.pages.slice().reverse().flatMap((p) => p.turns);
                const planted = all.find((t) => typeof t.askText === 'string' && t.askText.includes('**x**'));
                const tProblems = [];
                if (detail === null) tProblems.push('the node reader could not read the session');
                else if (turnsEvent === null) tProblems.push('no "turns" line');
                else {
                  const drawnIdx = [...new Set((turnsEvent.indexes ?? []).map(Number))].sort((a, b) => a - b);
                  if (paged.pages.length < 2) tProblems.push(`the door holds this conversation on ${String(paged.pages.length)} page(s), so paging back was not proved (it must be at least two)`);
                  if (drawnIdx.length !== detail.turnCount) tProblems.push(`${String(drawnIdx.length)} turn(s) drawn, and the door's turnCount is ${String(detail.turnCount)}`);
                  if (J(drawnIdx) !== J(all.map((t) => t.index))) tProblems.push('the indexes drawn are not the indexes the door holds');
                  if (planted !== undefined) {
                    const ask = turnsEvent.asks?.[String(planted.index)] ?? null;
                    const ans = turnsEvent.answers?.[String(planted.index)] ?? null;
                    if (ask === null || !ask.includes('**x**')) tProblems.push(`the planted ask reads back ${ask === null ? 'nowhere' : 'WITHOUT its asterisks'}: it was drawn as markdown`);
                    if (ans === null || ans.includes('**')) tProblems.push(`the planted answer reads back ${ans === null ? 'nowhere' : 'WITH its asterisks'}: it was not drawn as markdown`);
                  } else tProblems.push('the planted turn is not in the door\'s record');
                  const top = lastDump(ev, 'conversation-top') ?? lastDump(ev, 'conversation');
                  if (COPY.terminal !== null && el(top, 'conversation-terminal-line')?.label !== COPY.terminal && el(lastDump(ev, 'conversation'), 'conversation-terminal-line')?.label !== COPY.terminal) tProblems.push('the terminal line is not drawn');
                }
                arm('T1 the conversation, paged to the first turn, ask plain and answer formatted', tProblems.length === 0, tProblems.length === 0 ? `${String(all.length)} turn(s) drawn of ${String(detail.turnCount)} over the door's ${String(paged.pages.length)} pages; **x** kept in the ask, rendered in the answer; the terminal line drawn` : tProblems.join('; '));
              }
              // R1
              const unpaired = lastDump(ev, 'unpaired');
              const line = unpaired === null ? null : (unpaired.elements ?? []).find((e) => e.label === COPY.notPaired) ?? null;
              arm('R1 Remove on the Mac, and the app draws its unpaired line', run.removed?.ok === true && unpaired !== null && el(unpaired, 'screen-pairing') !== null && line !== null && aliveOf(ev) === RUNNING_FOREGROUND, `Remove ${run.removed === null ? 'never pressed (no ready-for-remove line)' : run.removed.ok ? 'pressed' : 'FAILED'}, the door ${run.removed?.reopened ? 'confirmed again' : 'NOT reopened'}; the app ${unpaired === null ? 'drew no unpaired screen' : line === null ? 'drew the pairing screen without the line' : 'drew the line'}; state ${J(aliveOf(ev))}`);
            }
            if (ARMS.has('ats')) await atsArm(sim, 'iOS 26.3');
            await keyScan(sim, 'iOS 26.3');
          });
        }

        // ==================================================================
        // iOS 18.3: THE FLOOR ARM
        // ==================================================================
        if (ARMS.has('floor')) {
          await confirmListening(cdp);
          await withSimulator({ label: 'p316-floor', runtime: RUNTIME_FLOOR, scratch: join(XCODE, 'sim-floor'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            const run = await pairAndRead(sim, ['pair', 'list'], 'floor');
            if (!run.ok) {
              arm('F1 iOS 18.3 pairing', false, run.why);
            } else if (run.result.events.length === 0) {
              arm('F1 iOS 18.3 pairing', null, `the UI test printed no P316 line on iOS ${sim.runtime} (xcodebuild exited ${String(run.result.code)})`);
            } else {
              const listGrade = run.readsAroundList.length === 0 ? ['the node reader read nothing around the list'] : gradeList(lastDump(run.result.events, 'list'), run.readsAroundList);
              arm(`F1 iOS ${sim.runtime}: the fingerprint matches, Allow, the signed read, the list`, fingerprintDigits(run.drawnFingerprint ?? '') === fingerprintDigits(run.macFingerprint ?? 'x') && run.allowed && !Array.isArray(listGrade), Array.isArray(listGrade) ? listGrade.slice(0, 6).join('; ') : `paired and the list agrees; frames ${J(listGrade.frames)}`);
            }
            await atsArm(sim, `iOS ${sim.runtime}`);
            await keyScan(sim, `iOS ${sim.runtime}`);
          });
        }

        // ==================================================================
        // iOS 26.3: the hostile door
        // ==================================================================
        if (ARMS.has('hostile')) {
          const wanted = ((process.env['P316_HOSTILE'] ?? '').trim() || Object.keys(HOSTILE_ARMS).filter((a) => a !== 'ats').join(',')).split(',').map((s) => s.trim());
          await withSimulator({ label: 'p316-hostile', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-hostile'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            for (const name of wanted) {
              const spec = HOSTILE_ARMS[name];
              if (spec === undefined || name === 'ats') continue;
              await sim.simctl('keychain', 'reset');
              const door = await startDoorChild(name);
              doorChildren.add(door.child);
              try {
                if (door.facts === null) {
                  arm(`H ${name}`, null, door.why ?? 'the hostile door did not start');
                  continue;
                }
                const conversationArm = /^(pages-|more-|long-ask|honest)/.test(name);
                const steps = [
                  'pair',
                  ...(name === 'wrong-key' || name === 'pair-word' ? [] : ['list']),
                  ...(conversationArm ? [`open:${door.facts.sessionToOpen}`, 'conversation', 'first'] : []),
                  // A list arm's body arrives on the list's refresh, and the
                  // one that never completes is said after the client's 15 s.
                  ...(spec.list === true ? ['sentence'] : [])
                ];
                const r = await drive(sim, { test: { id: UI_TEST }, label: `hostile-${name}`, env: { P316_PAYLOAD: door.facts.payload, P316_STEPS: steps.join(','), P316_WAIT_S: '60' } });
                const alive = aliveOf(r.events);
                const sentence = drawnSentence(r.events);
                const served = door.events.filter((e) => e.kind === 'request').length;
                const verified = door.events.filter((e) => e.kind === 'request' && e.verified !== undefined);
                report.readings[`hostile-${name}`] = { lines: r.events.length, alive, sentence, served, signedReads: verified.length, signaturesHeld: verified.every((e) => e.verified === 'ok') };
                if (r.events.length === 0) {
                  arm(`H ${name}: ${spec.what}`, null, `the UI test printed no P316 line (xcodebuild exited ${String(r.code)})`);
                  continue;
                }
                let ok;
                let said;
                if (name === 'honest') {
                  const t = r.events.find((e) => e.step === 'turns');
                  const drawn = new Set((t?.indexes ?? []).map(Number));
                  ok = alive === RUNNING_FOREGROUND && sentence === null && lastDump(r.events, 'list') !== null && drawn.size === door.facts.turnCount && verified.length > 0 && verified.every((e) => e.verified === 'ok');
                  said = `the control: the list drawn, ${String(drawn.size)} of ${String(door.facts.turnCount)} turns drawn, ${String(verified.length)} signed read(s) all verified by the door's own reader, no sentence`;
                } else if (name === 'unknown-status' || name === 'unknown-dot') {
                  // Drawn, not refused (hostile-door.mjs's table says why): the
                  // list is there, every row has its dot, nothing is a failure
                  // sentence, and an unknown word is drawn as main sent it.
                  const d = lastDump(r.events, 'list');
                  const dots = els(d, 'row-dot-');
                  const word = name === 'unknown-status' ? dots.some((e) => e.label === UNKNOWN_STATUS_TITLE) : true;
                  ok = alive === RUNNING_FOREGROUND && sentence === null && d !== null && dots.length > 0 && word;
                  said = `${d === null ? 'NO list drawn' : `the list drawn with ${String(dots.length)} dot(s)`}${name === 'unknown-status' ? `, main's unknown word ${word ? 'drawn as sent' : 'NOT drawn'}` : ''}; ${sentence === null ? 'no failure sentence' : `a sentence in ${sentence.id}`}; state ${J(alive)}`;
                } else if (name === 'long-ask') {
                  const t = r.events.find((e) => e.step === 'turns');
                  const top = Math.max(...(t?.indexes ?? [-1]).map(Number));
                  const ask = t?.asks?.[String(top)] ?? '';
                  const d = lastDump(r.events, 'conversation');
                  const frame = el(d, `turn-ask-${String(top)}`)?.frame ?? null;
                  ok = alive === RUNNING_FOREGROUND && ask.length === 4_000 && frame !== null && frame[0] >= 0 && frame[0] + frame[2] <= (d?.window?.[0] ?? 0) + 0.5;
                  said = `the ask drawn ${String(ask.length)} characters long, its frame ${J(frame)} inside a window ${J(d?.window)}; state ${J(alive)}`;
                } else {
                  const halfDrawn = sentence !== null && sentence.rows > 0 && sentence.id === 'list-failure';
                  // WHERE and WHICH (Phase 316.2's fix round): the first build
                  // passed an arm on any sentence anywhere, and every list arm
                  // was in fact ending on the pairing screen.
                  const where = spec.at === undefined || sentence?.id === spec.at;
                  const which = spec.expect === undefined || (sentence?.word !== null && spec.expect.includes(sentence?.word));
                  const honestFirst = spec.list !== true || door.events.some((e) => e.kind === 'request' && e.honestFirst === true);
                  ok = alive === RUNNING_FOREGROUND && sentence !== null && !halfDrawn && where && which && honestFirst && (name !== 'wrong-key' || served === 0);
                  said = `${sentence === null ? 'NO sentence drawn' : `a sentence drawn in ${sentence.id} (${String(sentence.length)} characters, Copy.${String(sentence.word ?? 'none of its words')})`}${halfDrawn ? ' BESIDE rows' : ''}${where ? '' : `, NOT in ${String(spec.at)}`}${which ? '' : `, NOT ${String(spec.expect.join(' or '))}`}${spec.list === true ? `; pairing's first read ${honestFirst ? 'answered honestly' : 'NEVER answered honestly'}` : ''}; state ${J(alive)}; the door served ${String(served)} request(s)`;
                }
                arm(`H ${name}: ${spec.what}`, ok, said);
              } finally {
                await endDoorChild(door.child);
                doorChildren.delete(door.child);
              }
            }
          });
        }
        ran = true;
      } finally {
        appText += `\n${handle.text()}`;
        shimPid = handle.pid;
        try {
          appPid = handle.appPid();
        } catch {
          appPid = 0;
        }
      }
    }
  );
} catch (err) {
  if (!['port taken', 'no build'].includes(String(err?.message ?? err))) arm('the run', false, `it threw: ${String(err?.message ?? err)}`);
} finally {
  for (const child of [...doorChildren]) await endDoorChild(child);
  try {
    writeFileSync(STOP, 'stop\n', 'utf8');
  } catch {
    /* the world may already be gone */
  }
}

// ---- K2: the key, anywhere on the Mac's side -------------------------------
if (ran) {
  const scanned = [HARNESS, HOME].map((root) => filesHolding(root, KEY_NEEDLES));
  const hits = scanned.flatMap((s) => s.hits);
  const printed = appText.includes(KEY) || appText.includes(KEY.slice(11));
  arm('K2 the made-up key is in no file of the Mac\'s scratch world and in nothing the app printed', scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0 && !printed, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) read; ${hits.length === 0 ? 'none holds it' : J(hits)}; the app's output ${printed ? 'CARRIES it' : 'does not'}`);
}
if (!KEEP) rmSync(RUN, { recursive: true, force: true });

// ---- counted once, at the end ----------------------------------------------
const ps = spawnSync('ps', ['-Ao', 'pid,ppid,rss,comm'], { encoding: 'utf8' });
const electronLines = (ps.stdout ?? '').split('\n').filter((l) => /Electron|Tortie$|chrome_crashpad/.test(l) && !/defunct/.test(l));
const ours = electronLines.filter((l) => {
  const [pid, ppid] = l.trim().split(/\s+/).map(Number);
  return (appPid > 0 && (pid === appPid || ppid === appPid)) || (shimPid > 0 && (pid === shimPid || ppid === shimPid));
});
arm('no Electron of this run is left', ours.length === 0, `${String(electronLines.length)} Electron line(s) on the machine, ${String(ours.length)} of this run`);
const devices = countDevicesNamed('p316-');
arm('no p316- Simulator is left, and none is booted', devices.readable && devices.named === 0 && devices.booted === 0, `${String(devices.named)} device(s) named p316-, ${String(devices.booted)} booted`);

const OUT = join(ROOT, 'out', 'p316');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'probe-p316.json'), `${unkeyed(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p316.json')}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p316 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(failures > 0 ? `probe:p316 FAILED ${String(failures)} arm(s)` : !ran ? 'probe:p316 did not complete' : 'probe:p316 OK');
process.exit(failures > 0 ? 1 : ran ? 0 : 2);

/** A clone of a directory tree, APFS clonefile where it can. */
function cp(from, to) {
  rmSync(to, { recursive: true, force: true });
  const r = spawnSync('cp', ['-Rc', from, to], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -Rc ${from} failed: ${String(r.stderr).trim()}`);
}
