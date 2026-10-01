#!/usr/bin/env node
/**
 * probe:p316 — the Tortie iPhone app, driven in the Simulator against the
 * Mac's door published through a STAND-IN Tailscale (Phase 316.2,
 * build/p316/SPEC.md §4 S2, "Proof"; re-pointed by Phase 330,
 * build/p330/SPEC.md §5.4 and §7.3).
 *
 * WHAT IS REAL IN A RUN
 *   - The Mac: ONE Electron through build/electron-run.mjs's `withElectron`, on
 *     a scratch profile, a scratch HOME and the socket `gmux-p316-<pid>`. The
 *     door (a `utilityProcess` on 127.0.0.1) is switched on, confirmed and
 *     paired through the app's own `pocket:*` channels, pressed through
 *     `window.gmux.pocket` exactly as Settings then Phone presses them, and it
 *     is PUBLISHED through build/p330/tailscale-standin.mjs, named by
 *     `GMUX_TAILSCALE_BIN`: the stand-in's funnel is a loopback forwarder that
 *     writes a PROXY v2 header and pipes to the door, the way tailscaled does.
 *     The PREFLIGHT refuses the launch unless that variable is the stand-in's
 *     wrapper, and the process table is sampled through the run: a real
 *     Tailscale program under the app, or run as a command, FAILS the run.
 *   - The phone: the DEBUG build of `ios/Tortie.xcodeproj`, signed ad hoc with
 *     no team, on Simulators made ONE AT A TIME by build/simulator-run.mjs's
 *     `withSimulator`. It dials `-TortieDebugDoorEndpoint 127.0.0.1:<port>`
 *     (DEBUG only), which keeps the code's public NAME as the TLS server name
 *     and the Host: THE TRANSPORT ARM, on iOS 26.3 and 18.3 alike, is the app
 *     reaching the Mac's door through the stand-in's forwarder with its client
 *     identity on every connection. The endpoint is a relay this probe holds
 *     on 127.0.0.1 that dials the CURRENT forwarder per connection, because a
 *     Remove and a re-confirm restart the Funnel child and its forwarder moves.
 *   - The UI tests, which print what they read (frames and labels, never a
 *     photograph) as `P316|<run>|{…}` lines this probe reads live.
 *
 * WHAT IS SUPPLIED
 *   - The `claude` on the scratch PATH: a /bin/sh script this probe writes. It
 *     prints the COMMITTED Phase 312 dialog fixture for one session and plants
 *     the COMMITTED research 63 transcript for another. NO VENDOR PROCESS RUNS
 *     AND NO TOKEN IS SPENT.
 *   - Method A's reader: build/p316/node-phone.mjs, a phone written in node from
 *     the wire format, paired as a second phone through the same forwarder.
 *   - Method B's door: build/p316/hostile-door.mjs, run as its OWN PROCESS on
 *     loopback (pitfall b), with the HTTP arms Phase 330's hand-written reader
 *     must refuse (SPEC §6.4 (t)).
 *   - NO KEY: a v:3 code carries none. What is scanned for instead is every
 *     window's one-shot secret, which must be in nothing the app wrote on the
 *     device (its container and the device keychain) and nothing under the
 *     Mac's scratch world, and any PEM private key on the Mac's side.
 *   - APPLE (Phase 316.5, build/p3165/SPEC.md §7.4): Phase 314's APNs stand-in,
 *     build/p314/apns-stand-in.mjs, IN THIS PROCESS on 127.0.0.1 (two h2c
 *     listeners, one per environment), seeded with the topic
 *     `com.itavero.tortie.phone`, the scratch public key and each phone's
 *     token and the environment it was minted in. The Mac is handed
 *     `GMUX_HARNESS_ALERTS=<harness>/alerts`, whose `alerts.json` names the
 *     stand-in's two origins and the scratch key file; the PREFLIGHT refuses
 *     the launch unless every origin is `http://127.0.0.1:<port>` and the key
 *     file sits inside the harness directory. THE KEY is a scratch P-256 key
 *     made here, written 0600 as `<harness>/alerts/AuthKey_P3165SCRAT.p8` and
 *     deleted in the `finally` whatever happened, kept world or not. HIS KEY
 *     IS NEVER READ. No request reaches Apple's real hosts: the phone's token
 *     is a DEBUG seam value (`-TortieDebugPushToken`), a Debug build never asks
 *     Apple for one, and a notification reaches the Simulator only through
 *     build/simulator-run.mjs's `handle.push`, with a body the stand-in
 *     recorded or this file composed.
 *
 * THE ORDER
 *   B0  preflight: a build, Xcode, both runtimes, the device type
 *   B1  build-for-testing, the SHIPPING project. It boots nothing.
 *   Electron:
 *   D0  sessions: a shell, a planted conversation, a waiting session
 *   D1  switch on → confirm → published through the stand-in at <name>:8443
 *   D2  the node reader pairs (window 1) through the forwarder, the Mac allows,
 *       and it reads with its client certificate
 *   iOS 26.3 Simulator:
 *   P1  the app is handed window 2's QR through the DEBUG injection; the UI test
 *       prints the fingerprint it DRAWS; this probe compares it with the Mac
 *       sheet's and presses Allow; the app's first SIGNED read is what makes it
 *       paired
 *   L1  the list, its order, ages, foot and the mocks' frames
 *   S1  a working session
 *   T1  its conversation paged to the first turn
 *   R1  Remove on the Mac, re-confirm the door, and the app draws its unpaired line
 *   M1  every signed read the app made presented its client identity (its pin
 *       among the Mac's phones), over TLS 1.3, with the code's name as SNI
 *   K1  the windows' secrets are in nothing the app wrote on the device
 *   iOS 18.3 Simulator (THE FLOOR ARM, MANDATORY: his iPhone runs 18.x):
 *   F1  pairing and the list again, through the forwarder, and K1 again
 *   iOS 26.3 Simulator, the hostile door (Method B):
 *   H*  every arm of build/p316/hostile-door.mjs, the HTTP arms included:
 *       each must end in a drawn sentence (the honest control, the long ask and
 *       the two unknown words end drawn instead) WHERE and WHICH its row says,
 *       the app still running, no half-drawn screen; every signed read with the
 *       client identity and the code's name; the wrong key with 0 requests served
 *   After: the secret scan of the Mac's scratch world, the stand-in's own
 *   reading (no real Tailscale, nothing forbidden, nothing left), the Electron
 *   count and the Simulator count, once each.
 *
 * PHASE 316.5, THE ALERTS (build/p3165/SPEC.md §7.4), woven into that order.
 * Every arm that needs a session to block is graded in TWO STEPS: main must
 * read the block first, and an arm whose block main never read is UNREADABLE
 * (exit 2), never a pass. A tap whose banner XCUITest could not find is
 * UNREADABLE too (SPEC §12 concern 1).
 *   N1  after D1: `pocket.choosePushKey()` through the bridge takes the harness
 *       key file; `pushKeyId` reads P3165SCRAT; the sealed file under the
 *       profile's gmux/push is not the PEM and holds no line of it
 *   D2+ the node reader presents a PRODUCTION token; the sheet's lines at
 *       Allow read `Alerts for "p316 reader" go through Apple (production),
 *       device <8 hex>`
 *   iOS 26.3, the order Simulator, FIRST DRIVE, while the Mac holds the key
 *   and its alert switch is still OFF (research 136, which binds over the
 *   SPEC: alerts are his alone by default, so a phone is asked only when the
 *   Mac it pairs with CAN send, meaning it holds a key AND the switch is on,
 *   and the pairing answer tells the phone which):
 *   N11 it pairs WITHOUT being asked (`asked:false`) although it was handed a
 *       seam token; the Mac holds no `Alerts for` line for it and its row reads
 *       `none`; a relaunch with another token draws no `Pair again to get
 *       alerts.`; and no word of Copy.swift that names alerts is drawn on any
 *       screen of the run
 *   N2  alerts on, and Allow through the sheet's own lines: `phone alerts
 *       armed` in app.log once, and 0 requests at the stand-in, because D0's
 *       waiting session was waiting before alerts armed
 *   iOS 26.3, the order Simulator, SECOND DRIVE, now that the Mac can send,
 *   handed P316_PUSH_TOKEN and P316_NOTIFICATIONS=allow:
 *   N0  the Mac could send when the window opened; iOS asked AFTER the
 *       fingerprint line and before the Mac allowed the phone (research 136
 *       moves the SPEC's "while the Mac still read waiting": the phone learns
 *       that the Mac can send from the Mac's answer to its presentation, so
 *       the Mac may already read `presented`); answered allow; the Mac's lines
 *       AT ALLOW hold the development line for sha256(the seam token); the
 *       phone's row reads alerts `on`. This file presses Allow only after the
 *       phone has said how the question was answered, or that none came,
 *       because a person answers iOS before they reach for the Mac
 *   N3  a new `ask` session blocks: one request at the development origin for
 *       the app's token, one at the production origin for the reader's, both
 *       200, the single shape, the JWT verifying under the scratch public key,
 *       `apns-topic` the phone's bundle id, and the body byte for byte this
 *       file's own composition from the reader's `/v1/blocked` rows
 *   N4  `alert`: N3's recorded body delivered; the tap opens that session.
 *       N3 is done INSIDE this step: its session is made when the UI test
 *       says it is ready for the alert, so the block cannot disturb L1's list
 *       reads, and the UI test waits its step's P316_WAIT_S (150 s) for the
 *       banner while main reads the block and the engine sends
 *   N5  `alert-cold`: the app terminated, then N3's body: the tap cold-
 *       launches it onto that session. It runs BEFORE N6 because N6 removes
 *       that session. A launch by iOS carries no XCUITest argument, so the
 *       DEBUG app carries its endpoint, stillness and token seams over from
 *       the launch before (ios/Tortie/App/DebugLaunch.swift); a cold launch
 *       that could not reach the door reads as a session failure, by name
 *   N6  `back` to the list, then `alert-gone`: that session ended and
 *       removed on the Mac, the door answering 404 for it, then this file's
 *       own composition of the same alert, TAPPED FROM THE LIST: the list,
 *       with the Mac's own `Tortie no longer has a record of that session.`
 *       Until the 316.5 fix round N6 was tapped over the very session it
 *       names (N5 leaves it on screen), which changed nothing on screen and
 *       so passed while every tap from anywhere else drew no sentence; the
 *       grader now reads the dump before the ready line and a tap that was not
 *       arranged from the list is UNREADABLE
 *   N6b `visit:<talk>` then `alert-gone` again: the same alert tapped from
 *       ANOTHER session's screen: the list, with the Mac's sentence
 *   N7  `alert-list` twice: a count body, then a single body naming `../x`:
 *       the list each time, no notice
 *   N8  `relaunch-token:<another>` then `relaunch-token:<the paired one>`:
 *       `Pair again to get alerts.` the first time, absent the second
 *   N9  after R1: alerts off, and a new `ask` session blocks: `phone alerts
 *       disarmed` once, 0 requests in 15 s. R1's Remove moves the door's hash,
 *       so alerts disarm and re-arm around its re-confirm; N9 reads the
 *       disarm lines it GAINED and is UNREADABLE unless alerts were armed when
 *       it began. THEN ALERTS GO BACK ON and are confirmed, and the armed line
 *       it gains is read, because the floor and the denied phone must each be
 *       ASKED, and a phone is asked only when the Mac can send (research 136)
 *   F1+ iOS 18.3, after F1: the Mac could send, the floor phone was asked and
 *       allowed, and `alert` with a single body naming a live session,
 *       composed here: the tap opens it on the floor
 *   ND  a new iOS 26.3 Simulator, P316_NOTIFICATIONS=deny (arm `deny`): the
 *       Mac could send, so it was asked; denied, it pairs with no `Alerts for`
 *       line for it although it was handed a seam token, its row reads
 *       `none`, the list, a session and its conversation are drawn, and a
 *       delivered body shows no banner in 20 s
 *   N10 after the app is gone: app.log holds no token, no JWT, no PEM line
 *       and no alert body
 * The arms are reported in the SPEC's order: N3 is graded during N4's step
 * and written to the report with the order Simulator's other arms.
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
 *   Every UI test run is also handed P330_DOOR_ENDPOINT (`127.0.0.1:<port>`),
 *   which the test passes to the app as `-TortieDebugDoorEndpoint` (Phase 330).
 *   A run whose test prints no P316 line is UNREADABLE (exit 2), never a pass.
 *
 *   PHASE 316.5 adds two inputs and six steps (build/p3165/SPEC.md §7.4,
 *   pinned; P316DriveUITests.swift is their writer):
 *     P316_PUSH_TOKEN      hex; every launch passes `-TortieDebugPushToken
 *                          <hex>` when it is set (DEBUG only: the app's
 *                          address, never Apple's answer)
 *     P316_NOTIFICATIONS   `allow` (the default) or `deny`
 *     pair, after the fingerprint, waits up to 10 s for springboard's
 *       notification question. When it appears it prints
 *       {"step":"notifications","asked":true,"title":…,"buttons":[…]}, presses
 *       by label (`Allow`, or `Don’t Allow` / `Don't Allow`) and prints
 *       {"step":"notifications","answered":"allow"|"deny"}; when none appears
 *       it prints {"step":"notifications","asked":false}. Since research 136
 *       the question comes only when the Mac can send, which the phone learns
 *       from the Mac's answer to its presentation, so the 10 s run from the
 *       fingerprint across that first answer; a Mac that cannot send is
 *       answered `asked:false` (N11).
 *     alert             press Home, print {"step":"ready-for-alert"}, wait for
 *                       a banner from Tortie in springboard, print
 *                       {"step":"banner","label":…} (null when none came), tap
 *                       it, wait for `screen-session` or `screen-list`, dump
 *                       "alert"
 *     alert-cold        the same after `app.terminate()`, the ready line
 *                       carrying "cold":true; the app must reach running-
 *                       foreground from the tap
 *     alert-gone, alert-list    as `alert`, dumping under their own names
 *     back              the navigation bar's back button until the list is on
 *                       top, dump "back" (the 316.5 fix round: where N6 taps)
 *     visit:<id>        as `open:<id>`, dumping "visit" (where N6b taps)
 *     relaunch-token:<hex>      terminate, relaunch WITHOUT
 *                       `-TortieDebugForgetPairing` and with that token, dump
 *                       "relaunch" once the list settles
 *     no-banner:<s>     press Home, print {"step":"ready-for-alert"}, wait that
 *                       long, and print {"step":"banner","label":null} when
 *                       none came
 *   THIS FILE delivers ONE queued body for each `ready-for-alert` it reads, in
 *   order, through `handle.push`, and reads each tap from the `banner` line and
 *   the first dump after that ready line, and where the tap was made from from
 *   the last dump BEFORE it. It never matches a tap to a body by
 *   anything the phone chose. A `ready-for-alert` with nothing queued, and a
 *   queued body with no `ready-for-alert`, are both reported by name.
 *
 * PHASE 332: THE NAME CHECK, AGAINST A LOOPBACK DNS STAND-IN. A published door
 * now asks the `ts.net` zone's own servers whether its public name answers
 * before a code may show. The Mac is handed `GMUX_POCKET_NAME_SERVERS`, naming
 * build/p332/dns-standin.mjs IN THIS PROCESS on 127.0.0.1, answering the
 * Tailscale stand-in's made-up name, so no question reaches real DNS; the
 * preflight refuses unless that value names 127.0.0.1 alone and the stand-in
 * answers. Every window waits for main's `pairable` (`confirmListening`), and
 * Q1 grades every question the Mac asked: an `A` question, RD 0, for that
 * name (Phase 332 called it N1; Phase 316.5 renamed it, because SPEC §7.4
 * gives N1 to the push key). Before the launch the profile's agents.json renames the Gemini, Qwen,
 * Antigravity, Grok and Droid binaries and `agents:list` is read back, so no
 * agent's `--version` ever runs.
 *
 * WHAT IT REFUSES TO DO. It never binds a real interface and dials nothing but
 * 127.0.0.1 (the code's host is a public NAME nobody resolves here), never runs
 * a `tailscale` command, never signs into anything and touches no keychain of
 * the person's. It never reads his APNs key or any `.p8` of his, and nothing
 * it starts can reach Apple: the Mac's alerts go to the stand-in named in
 * alerts.json, and without that file a harness launch refuses Apple's hosts
 * before any socket. It signals nothing it did not start. It takes NO
 * screenshot and no screen recording. Its report holds no key, no signature,
 * no device token, no alert body and no conversation line, only lengths,
 * counts and digests. `npm run shot` is not called. It spends NO model turn.
 *
 * VERIFIERS ONLY: it starts an Electron and boots Simulators, so take the
 * orchestrator's lock first. It ran for about 17 minutes before Phase 316.5,
 * which adds a fourth Simulator, a second drive on the first (N11) and a few
 * minutes of alerts (budget 20 to 25 minutes, unmeasured until a verifier runs
 * it), and
 * build/electron-run.mjs's guard over the person's own `-L gmux` server
 * compares that server's sessions before and after: a session HE creates or
 * ends while it runs reads as this run's, and the run ends in that guard's
 * error although nothing here touched `-L gmux`. Run it while he is not
 * creating or ending sessions. It carries no `npm run build &&`; it refuses
 * (exit 2) when the checkout has no build.
 *
 *   npm run -s probe:p316
 *   P316_ARMS=order,floor,deny,hostile    which arms (default all; `order` holds N11 and N0 to N8)
 *   P316_HOSTILE=honest,wrong-key         which hostile arms (default all)
 *   P316_DERIVED_DATA=<dir>               derived data (never the repo, never home; kept)
 *   P316_KEEP=1                           keep the scratch world, and write
 *                                         <run>/rederive/records.json (0600): the
 *                                         reader's /v1/blocked rows at N3's block,
 *                                         every stand-in record, every body
 *                                         delivered, the scratch PUBLIC key and
 *                                         each phone's token, for the verifier's
 *                                         own re-derivation. The private key is
 *                                         deleted whatever this says.
 *   P316_PARENT_CHECKOUT=<dir>            the parent reading: whether it has ios/
 *   node build/p316/probe-p316.mjs --grader-self-test   every grader on its own fixtures; launches nothing
 *
 * Exit 0 when every arm passed, 1 when one failed, 2 when it could not run or
 * an arm could not be READ.
 */

import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
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
import { connect as netConnect, createServer as createNetServer } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wsConnect, cdpEval } from '../cdp-client.mjs';
import { pickRendererTarget } from '../cdp-target.mjs';
import { withElectron, withoutDevRenderer } from '../electron-run.mjs';
import {
  RUNTIME_CURRENT,
  RUNTIME_FLOOR,
  countDevicesNamed,
  pushPayloadRefusal,
  simulatorHarnessMissing,
  withSimulator,
  xcodebuildRun
} from '../simulator-run.mjs';
import { startApnsStandIn } from '../p314/apns-stand-in.mjs';
import { DEFAULT_SCENARIO, endStandinProcesses, makeStandin, preflightStandin, watchForRealTailscale } from '../p330/tailscale-standin.mjs';
import { NAME_SERVERS_VAR, loopbackOnlyServers, makeDnsStandin, nameQuestionsSelfTest, nameQuestionsVerdict, quietAgentsHeld, writeQuietAgents } from '../p332/dns-standin.mjs';
import { HOSTILE_ARMS, HOSTILE_NAME, HOSTILE_PUBLIC_PORT, UNKNOWN_STATUS_TITLE, hostileDoorArgv } from './hostile-door.mjs';
import { fingerprintDigits, makePhone, pageBack, pairThrough, readOffer, shaHex, signedGet } from './node-phone.mjs';

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
// `deny` is Phase 316.5's (SPEC §7.4 ND): a fourth Simulator, notifications denied.
const ARMS = new Set(((process.env['P316_ARMS'] ?? '').trim() || 'order,floor,deny,hostile').split(',').map((s) => s.trim()));
if (ARMS.has('ats')) {
  // The ATS arm left with TailscaleKit (Phase 330): the phone has no tailnet
  // and no ATS exception, so there is nothing for it to prove.
  console.error(`${TAG} the ats arm was retired in Phase 330; the transport is the order and floor arms, through the stand-in's forwarder.`);
  ARMS.delete('ats');
}
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
const RUN = `/private/tmp/p316-probe-${String(process.pid)}`;
const HOME = join(RUN, 'home');
const HARNESS = join(RUN, 'harness');
const PROFILE = join(HARNESS, 'profile');
const WORK = join(RUN, 'project');
const BIN = join(HOME, '.local', 'bin');
const XCODE = join(RUN, 'xcode');
const DD = resolve((process.env['P316_DERIVED_DATA'] ?? '').trim() || join(XCODE, 'dd'));
/** OUTSIDE the profile, so the helper's profile sweep never takes the stand-in's children for the app's. */
const STANDIN_DIR = join(RUN, 'standin');
const PUBLIC_NAME = DEFAULT_SCENARIO.dnsName.replace(/\.$/, '');
const SOCKET = `gmux-p316-${String(process.pid)}`;
const KEEP = (process.env['P316_KEEP'] ?? '') === '1';
const NEXT = join(RUN, 'fake-next');
const STOP = join(RUN, 'fake-stop');
const TALK_SID = join(RUN, 'talk-sid');
const DIALOG = join(ROOT, 'src/main/activity/__tests__/fixtures/claude-permission-prompt.txt');
const STORE_SRC = join(ROOT, 'docs/research/assets/63-fixtures/claude-session.jsonl');
const FIXTURE_SID = '11111111-2222-4333-8444-555555555555';
const FIXTURE_CWD = '/Users/dev/demo-app';
const N = { shell: 'p316-shell', talk: 'p316-talk', ask: 'p316-ask', alert: 'p316-alert', quiet: 'p316-quiet' };

// ---------------------------------------------------------------------------
// Phase 316.5: the alerts' scratch world (build/p3165/SPEC.md §7.4)
// ---------------------------------------------------------------------------

/** Ten capitals or digits, the shape of Apple's own key file name. A scratch key's, never his. */
const KEY_ID = 'P3165SCRAT';
/** Inside the harness directory, which the Mac's override requires of its key file. */
const ALERTS_DIR = join(HARNESS, 'alerts');
const KEY_FILE = join(ALERTS_DIR, `AuthKey_${KEY_ID}.p8`);
const ALERTS_JSON = join(ALERTS_DIR, 'alerts.json');
/** Where the Mac seals the provider key it keeps: `apnsKeyDir()`, `<userData>/gmux/push`. */
const SEALED_KEY_DIR = join(PROFILE, 'gmux', 'push');
/** The phone app's bundle id is the topic an alert is sent under. */
const TOPIC = BUNDLE_ID;
/**
 * Every device token this run hands out, 64 lowercase hex each, and the
 * environment each was minted in. `other` is only ever a relaunch's (N8,
 * N11), `deny` is handed to a phone that denies notifications (ND) and
 * `nosend` to a phone pairing with a Mac that cannot send (N11): none of them
 * may reach the Mac, so none is seeded at the stand-in.
 */
const TOKENS = Object.freeze({
  reader: randomBytes(32).toString('hex'),
  app: randomBytes(32).toString('hex'),
  other: randomBytes(32).toString('hex'),
  floor: randomBytes(32).toString('hex'),
  deny: randomBytes(32).toString('hex'),
  nosend: randomBytes(32).toString('hex')
});
const SEEDED = Object.freeze({ [TOKENS.reader]: 'production', [TOKENS.app]: 'development', [TOKENS.floor]: 'development' });
/** Which phone a token is, for the report, which never carries a token. */
const tokenName = (token) => Object.entries(TOKENS).find(([, t]) => t === token)?.[0] ?? (token === null ? 'none' : 'unknown');
/** The Mac's short digest of a token, as its `Alerts for …` line draws it (pairing.ts, pushTokenDigest). */
const deviceDigest = (token) => shaHex(String(token).toLowerCase()).slice(0, 8);
/** The engine's first send waits COALESCE_MS; a quiet this long says nothing was sent. */
const QUIET_AFTER_ARM_MS = 10_000;
/** N9's window, the SPEC's 15 s. */
const QUIET_AFTER_OFF_MS = 15_000;
/** N7's hostile tap: a session id no door could hold, which must open the list. */
const HOSTILE_TAP_SESSION = '../x';
/**
 * How long a pairing's Allow waits for the phone's word on iOS's question
 * (answered, or `asked:false` after its own 10 s), from the fingerprint line.
 * A person answers iOS before reaching for the Mac, and an Allow pressed
 * before the phone presents its address pairs a phone the Mac cannot alert.
 */
const NOTIFICATIONS_SETTLE_MS = 30_000;
/** How long, after an `allow`, the Allow waits for the Mac's lines to name the phone's address. */
const ADDRESS_LINE_WAIT_MS = 20_000;

/** Every window's one-shot secret this run opened. The report never holds them. */
const SECRETS = [];
const unsecret = (text) => SECRETS.reduce((t, secret) => t.split(secret).join('<a one-shot secret>'), String(text));

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

/**
 * A word the MAC spells, read from its own TypeScript source (Phase 316.5), so
 * the phone's copy of it is judged by the Mac's and never by itself.
 */
const macWord = (file, name) => {
  try {
    const m = new RegExp(`export const ${name}\\s*=\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(readFileSync(join(ROOT, file), 'utf8'));
    return m === null ? null : m[1];
  } catch {
    return null;
  }
};
const MAC = {
  /** The Mac's sentence for exactly an unknown session (SPEC §5.6.4). */
  noSuchSession: macWord('src/renderer/app/reach-copy.ts', 'NO_SUCH_SESSION'),
  /** The count alert's title word (src/main/tray/attention.ts), for this file's own composer. */
  needsYourInput: macWord('src/main/tray/attention.ts', 'NEEDS_YOUR_INPUT')
};
/** Pinned by build/p3165/SPEC.md §5.6.5. Copy.swift's `pairAgainForAlerts` must say exactly it. */
const PAIR_AGAIN = 'Pair again to get alerts.';
/**
 * Every phone word that names alerts (research 136: a phone paired to a Mac
 * that cannot send draws none of them): Copy.swift's words that say "alert",
 * and the pinned line whether Copy.swift has it or not.
 */
const ALERT_WORDS = [...new Set([PAIR_AGAIN, ...Object.values(COPY_WORDS).filter((text) => /alert/i.test(text))])];

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const report = {
  runtimes,
  arms: [],
  readings: { frames: FRAMES },
  copyFound: {
    ...Object.fromEntries(Object.entries(COPY).map(([k, v]) => [k, v !== null])),
    // Phase 316.5: the phone's two new words, each equal to the one it names.
    pairAgainForAlerts: copyOf('pairAgainForAlerts') === PAIR_AGAIN,
    noSuchSession: MAC.noSuchSession !== null && copyOf('noSuchSession') === MAC.noSuchSession,
    macNoSuchSession: MAC.noSuchSession !== null,
    macNeedsYourInput: MAC.needsYourInput !== null
  },
  // Phase 316.5: no model turn is spent by any arm (SPEC §7.8).
  modelTurns: 0
};
let failures = 0;
const arm = (id, ok, said) => {
  const text = unsecret(said);
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
    if ((await cdpEval(cdp, 'window.gmux !== undefined && window.gmux.pocket !== undefined && window.__gmuxP93 !== undefined && window.__gmuxP202 !== undefined')) === true) {
      // NO AGENT STARTS (Phase 332): the renamed rows must read not installed.
      const held = quietAgentsHeld(JSON.parse(await cdpEval(cdp, 'window.gmux.agentsList().then((r) => JSON.stringify(r))')));
      agentsHeld.push(held.ok);
      if (!held.ok) throw new Error(`agents:list says the renamed agents are not all absent: ${held.problems.join('; ')}`);
      return true;
    }
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

/**
 * Confirm the door as it now stands, and wait until it listens.
 *
 * THE LINES FIRST (the Phase 330 fix round). `setDoor({ on: true })` answers
 * once its read is QUEUED, so the status it answers with holds lines over
 * empty fields (`https://:0`). The first build confirmed those, the read then
 * moved the hash, and nothing published (lens 2's D1). It waits for main's own
 * `confirmable`, lines that name the stand-in's name, and no read under way;
 * main now refuses a confirm over lines that name nothing, too.
 */
async function confirmListening(cdp) {
  const now = await waitStatus(
    cdp,
    (s) =>
      (s.state === 'listening' && s.confirmState === 'confirmed') ||
      (s.confirmable === true &&
        s.state !== 'opening' &&
        s.confirmLines.some((l) => l.includes(`https://${PUBLIC_NAME}:${String(s.publicPort)}`))),
    30_000
  );
  if (!now.ok) return { ok: false, why: `the lines never named ${PUBLIC_NAME}: ${J({ state: now.status?.state, confirmable: now.status?.confirmable, refusal: now.status?.refusal })}` };
  if (now.status.state === 'listening' && now.status.confirmState === 'confirmed') {
    const p = await waitStatus(cdp, pairableNow, 65_000);
    return { ok: p.ok, why: `already confirmed, pairable ${String(p.status?.pairable)}` };
  }
  const c = await pocket(cdp, 'confirmDoor', { linesRead: now.status.confirmLines, hashRead: now.status.confirmHash });
  // Phase 332: listening is not enough; a code shows once main says the name
  // answers (one round of the DNS stand-in). A parent answers no
  // `pairable`, so listening is its word.
  const l = await waitStatus(cdp, pairableNow, 65_000);
  return { ok: c.ok && c.value.allowed === true && l.ok, why: c.ok ? `confirm allowed=${String(c.value.allowed)}, state ${String(l.status?.state)}, pairable ${String(l.status?.pairable)}` : c.error };
}

/** Main's word that a code may show (Phase 332), or `listening` from a build that has no such word. */
const pairableNow = (s) => s.pairable === true || (s.pairable === undefined && s.state === 'listening');

/**
 * Open a pairing window. The code must read the phone's way (v:3: the public
 * name, 8443 or 10000, no tailnet key, no address), and its host must be the
 * stand-in's name: nothing it names is ever dialled.
 */
async function openWindow(cdp) {
  const offered = await pocket(cdp, 'beginPairing');
  if (!offered.ok) return { ok: false, why: offered.error.slice(0, 200) };
  const read = readOffer(offered.value.payload);
  if (!read.ok) return { ok: false, why: `the code does not read the phone's way: ${read.why}` };
  if (read.offer.host !== PUBLIC_NAME) return { ok: false, why: `the code names ${J(read.offer.host)}, which is not the stand-in's ${PUBLIC_NAME}` };
  SECRETS.push(read.offer.ps);
  return { ok: true, payload: offered.value.payload, offer: read.offer };
}

let standin = null;
/** The name check's zone servers (Phase 332), in this process on 127.0.0.1. */
let dns = null;
const dnsPreflights = [];
const agentsHeld = [];
/** The live Funnel child's forwarder port, or 0 while nothing is published. */
const forwarderPort = () => standin?.readFunnel()[0]?.forwarderPort ?? 0;

/**
 * THE APP'S ENDPOINT: a TCP relay on 127.0.0.1 that dials the CURRENT
 * forwarder per connection, so a restarted Funnel child (a Remove, a
 * re-confirm) moves nothing the app was told. It adds no byte and reads none.
 * In this process; closed in the `finally`.
 */
async function startRelay() {
  const sockets = new Set();
  const server = createNetServer((client) => {
    sockets.add(client);
    client.on('close', () => sockets.delete(client));
    client.on('error', () => undefined);
    const port = forwarderPort();
    if (port === 0) {
      client.destroy();
      return;
    }
    const upstream = netConnect({ host: '127.0.0.1', port });
    sockets.add(upstream);
    upstream.on('close', () => {
      sockets.delete(upstream);
      client.destroy();
    });
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    client.pipe(upstream);
    upstream.pipe(client);
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok());
  });
  return {
    port: server.address().port,
    close: () =>
      new Promise((done) => {
        for (const s of sockets) s.destroy();
        server.close(() => done());
      })
  };
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
/** Every window's secret, as text and as bytes, read when asked (windows open through the run). */
const secretNeedles = () =>
  SECRETS.flatMap((secret) => [
    [Buffer.from(secret, 'utf8'), 'a window’s secret as text'],
    [Buffer.from(secret, 'utf16le'), 'a window’s secret as UTF-16'],
    [Buffer.from(secret, 'base64url'), 'a window’s secret as bytes']
  ]);

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
    // When THIS process first read the line (Phase 316.5). A line is printed
    // before it is read, and a pairing only moves forward, so a Mac state
    // sampled AT OR AFTER this moment that still reads `waiting` was `waiting`
    // when the phone printed the line (N0).
    if (event !== null && typeof event === 'object') event.receivedAt = Date.now();
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
// Phase 316.5: this file's OWN composer of Phase 314's alert JSON
// ---------------------------------------------------------------------------
//
// Written from build/p314/SPEC.md §2.2 to §2.4 and build/p3165/SPEC.md §5.4,
// never imported from src/main/push/, so N3's byte comparison is two
// implementations agreeing rather than one agreeing with itself. The key
// order is the pinned one: aps { alert { title, body }, badge, sound,
// thread-id }, then tortie. The clip past 4096 bytes is not written here: every
// row this probe makes is a few dozen bytes, and a composition over the cap is
// refused rather than guessed at.

/** Tortie's one separator between two facts. */
const SEPARATOR = ' · ';
/** The count alert's thread (src/main/push/alert.ts's WAITING_THREAD, spelled again on purpose). */
const COUNT_THREAD = 'tortie-waiting';

/** The single shape for one blocked row, or null when it would not fit. */
function composeSingleAlert(row, badge) {
  const body = [row.project, row.agentLabel, ...(row.machine !== null && row.machine !== undefined ? [row.machine] : [])].join(SEPARATOR);
  const text = J({
    aps: { alert: { title: `${row.name} ${row.statusLabel}`, body }, badge, sound: 'default', 'thread-id': row.sessionId },
    tortie: { v: 1, session: row.sessionId }
  });
  return pushPayloadRefusal(text) === null ? text : null;
}

/** The count shape over names, or null when it would not fit or the Mac's title word could not be read. */
function composeCountAlert(names, badge) {
  if (MAC.needsYourInput === null) return null;
  const text = J({
    aps: { alert: { title: `${MAC.needsYourInput} (${String(badge)})`, body: names.join(SEPARATOR) }, badge, sound: 'default', 'thread-id': COUNT_THREAD },
    tortie: { v: 1 }
  });
  return pushPayloadRefusal(text) === null ? text : null;
}

// ---------------------------------------------------------------------------
// Phase 316.5: the preflight of the Mac's override, and the graders
// ---------------------------------------------------------------------------

/** The ONE origin shape alerts.json may name: cleartext to 127.0.0.1 on a port. */
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:([0-9]{1,5})$/;

/**
 * Why the override this file wrote may not be handed to the Mac, or null
 * (SPEC §7.4: "The preflight refuses unless the override names only
 * 127.0.0.1"). Both environments, each `http://127.0.0.1:<port>`, and a key
 * file inside the harness directory.
 */
function alertsOverrideRefusal(json, harness) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return 'alerts.json is not an object';
  const origins = json.origins;
  if (origins === null || typeof origins !== 'object' || Array.isArray(origins)) return 'alerts.json names no origins';
  const names = Object.keys(origins).sort();
  if (J(names) !== J(['development', 'production'])) return `alerts.json names the origins ${J(names)}, not development and production`;
  for (const name of names) {
    const hit = LOOPBACK_ORIGIN.exec(String(origins[name]));
    if (hit === null || Number(hit[1]) < 1 || Number(hit[1]) > 65_535) return `the ${name} origin ${J(origins[name])} is not http://127.0.0.1:<port>`;
  }
  const root = `${resolve(harness)}/`;
  if (typeof json.keyFile !== 'string' || !resolve(json.keyFile).startsWith(root)) return 'the key file alerts.json names is not inside the harness directory';
  const extra = Object.keys(json).filter((k) => k !== 'origins' && k !== 'keyFile');
  if (extra.length > 0) return `alerts.json carries ${J(extra)} beside its two fields`;
  return null;
}

/** One verdict: `ok` true, false, or null for UNREADABLE (exit 2, never a pass). */
const verdict = (ok, said) => ({ ok, said });
/** Problems first (a FAIL), then what could not be read (UNREADABLE), then the pass. */
const decide = (problems, unreadable, green) =>
  problems.length > 0 ? verdict(false, problems.join('; ')) : unreadable.length > 0 ? verdict(null, unreadable.join('; ')) : verdict(true, green);

/** N1: the key, through the bridge. */
function gradeKey(r) {
  const p = [];
  if (!r.bridge.ok) p.push(`pocket.choosePushKey() did not answer: ${String(r.bridge.error).slice(0, 160)}`);
  else {
    if (r.bridge.value?.kept !== true) p.push(`the key was not kept (${J(r.bridge.value)})`);
    if (r.bridge.value?.refusal !== null) p.push(`the pick answered a refusal (${J(r.bridge.value?.refusal)})`);
  }
  if (r.statusKeyId !== KEY_ID) p.push(`pushKeyId reads ${J(r.statusKeyId)}, not ${KEY_ID}`);
  if (r.sealed.length === 0) p.push('nothing is sealed under the profile\'s gmux/push');
  for (const f of r.sealed) {
    if (f.bytes.indexOf('PRIVATE KEY') !== -1 || f.bytes.indexOf(r.pemText) !== -1 || r.pemLines.some((line) => f.bytes.indexOf(line) !== -1)) p.push(`the sealed file ${f.name} holds the PEM or a line of it`);
  }
  return decide(p, [], `kept; pushKeyId ${KEY_ID}; ${String(r.sealed.length)} sealed file(s) under gmux/push, none holding the PEM or any of its ${String(r.pemLines.length)} lines`);
}

/** The exact line the Mac's sheet draws for a phone's alert address (pairing.ts, describePocketDoor). */
const alertLineFor = (label, environment, token) => `Alerts for "${label}" go through Apple (${environment}), device ${deviceDigest(token)}`;
const alertLines = (lines) => (lines ?? []).filter((l) => typeof l === 'string' && l.startsWith('Alerts for "'));

/** D2+: the reader's production address, in the lines the Mac asked Allow over. */
function gradeReaderLine(r) {
  if (r.lines === null) return verdict(null, 'the sheet\'s lines were never read at the reader\'s Allow, so what they held is unknown');
  const want = alertLineFor(r.label, 'production', r.token);
  const got = alertLines(r.lines);
  return decide(got.includes(want) ? [] : [`the lines hold ${J(got.map((l) => l.replace(/device [0-9a-f]{8}$/, 'device …')))}, and not the production line for the reader's token`], [], `the sheet's lines at Allow hold "Alerts for "${r.label}" go through Apple (production), device ${deviceDigest(r.token)}"`);
}

/** N2: alerts on and allowed: armed once, and nothing announced of a wait that began before. */
function gradeArmed(r) {
  if (!r.askWaiting) return verdict(null, 'D0\'s waiting session was not needs_input in main when alerts armed, so "not announced" says nothing');
  const p = [];
  if (!r.confirmed) p.push(`the door was not confirmed after alerts were turned on (${J(r.confirmWhy)})`);
  if (r.pushAlerts !== true) p.push('pocket:status does not read pushAlerts on');
  if (r.armedLines !== 1) p.push(`app.log holds ${String(r.armedLines)} "phone alerts armed" line(s), not one`);
  if (r.requests !== 0) p.push(`the stand-in took ${String(r.requests)} request(s): a wait that began before alerts armed was announced`);
  if (r.waitedMs < QUIET_AFTER_ARM_MS) p.push(`only ${String(r.waitedMs)} ms were waited, under the ${String(QUIET_AFTER_ARM_MS)} that outlast the engine's first coalesce`);
  return decide(p, [], `armed once, confirmed through the sheet's own lines; D0's waiting session read needs_input and 0 requests reached the stand-in in ${String(r.waitedMs)} ms`);
}

/** The notification lines of one pairing drive. */
function notificationEvents(events) {
  return {
    fingerprint: events.find((e) => e.step === 'fingerprint') ?? null,
    asked: events.find((e) => e.step === 'notifications' && e.asked !== undefined) ?? null,
    answered: events.find((e) => e.step === 'notifications' && e.answered !== undefined) ?? null
  };
}
/** The first Mac pairing state sampled at or after `at`, or null. */
const stateAtOrAfter = (samples, at) => samples.find((s) => s.at >= at)?.state ?? null;
/**
 * The most a P316 line can wait between the phone printing it and this
 * process reading it: the file is tailed every 250 ms, and the stdout channel
 * is at least as fast. A Mac state sampled more than this BEFORE a line was
 * read was sampled before the line was printed.
 */
const LINE_LAG_MS = 1_000;
/** When the Mac first read the phone as allowed, or null. */
const firstAllowedAt = (samples) => samples.find((s) => s.state === 'allowed')?.at ?? null;
/**
 * Whether the Mac could send when a window opened (research 136): it held a
 * key AND its alert switch was on, over fields a person confirmed (the Mac's
 * own `alertsCanSend`, src/main/pocket/ipc.ts). Read from `pocket:status` as
 * it stood.
 */
const macCanSend = (status) =>
  status !== null && status !== undefined && status.pushAlerts === true && status.confirmState === 'confirmed' && typeof status.pushKeyId === 'string' && status.pushKeyId !== '';

/**
 * N0 (and the floor's pairing in F1+): the Mac could send, iOS asked after the
 * fingerprint and before the Mac allowed the phone, the answer was allow, and
 * the Mac held the phone's development address when Allow was pressed.
 *
 * RESEARCH 136 moved the SPEC's order. The phone is asked only when the Mac
 * can send, and it learns that from the Mac's answer to its presentation, so
 * the Mac may read `presented` when iOS asks; what must hold is that the
 * question came before the Mac ALLOWED the phone, and that the address
 * reached the Mac before Allow was pressed.
 */
function gradeAsked(r) {
  if (r.canSend !== true) return verdict(null, 'the Mac could not send when this window opened (no key kept, or the alert switch off), so whether the phone was asked says nothing');
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  const u = [];
  if (n.fingerprint === null) p.push('no fingerprint line');
  if (n.asked === null) p.push('no notifications line: the UI test did not look for the question');
  else if (n.asked.asked !== true) p.push('XCUITest saw no notification question in the 10 s after the fingerprint, although the Mac could send');
  else {
    if (n.fingerprint !== null && Number(n.asked.seq) <= Number(n.fingerprint.seq)) p.push('the question came before the fingerprint line');
    // THE ORDER, in three answers. A `waiting` or `presented` sampled at or
    // after the moment this process READ the question line was true after the
    // phone printed it: proof the Mac had not allowed the phone. An `allowed`
    // sampled more than the lines' lag BEFORE that moment was true before the
    // line was printed: the phone was allowed first, a FAIL, because its
    // address could no longer reach the Mac. Anything between is a reading
    // that could not separate the two, never a pass.
    const state = stateAtOrAfter(r.samples, n.asked.receivedAt);
    const allowedAt = firstAllowedAt(r.samples);
    if (state === 'waiting' || state === 'presented') {
      /* proved */
    } else if (allowedAt !== null && allowedAt < n.asked.receivedAt - LINE_LAG_MS) {
      p.push(`the Mac's pairing read allowed ${String(n.asked.receivedAt - allowedAt)} ms before the question line was read: the phone was allowed before it asked`);
    } else if (state === null) u.push('the Mac\'s pairing was not sampled after the question was read');
    else u.push(`the Mac's pairing read ${J(state)} at the first sample after the question line was read, within the ${String(LINE_LAG_MS)} ms a line can lag, so the order could not be read`);
  }
  // The UI test says `answered: null` when it saw the question and found no
  // button it could press: a reading it could not take, never a FAIL.
  if (n.answered !== null && n.answered.answered === null) u.push('XCUITest saw iOS\'s question and found no Allow button to press');
  else if (n.answered?.answered !== 'allow') p.push(`the question was answered ${J(n.answered?.answered ?? null)}, not allow`);
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else if (!alertLines(r.macLines).includes(alertLineFor(r.label, 'development', r.token))) p.push(`the Mac's lines at Allow hold no development line for sha256(the seam token) (${String(alertLines(r.macLines).length)} alert line(s))`);
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'on') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not on`);
  return decide(p, u, `the Mac could send; iOS asked after the fingerprint and before the Mac allowed the phone, answered allow; the Mac's lines at Allow hold "Alerts for "${String(r.label)}" go through Apple (development), device ${deviceDigest(r.token)}" and the row reads on`);
}

/**
 * N11 (research 136): a phone pairing with a Mac that CANNOT send is never
 * asked, presents no address although it was handed one, draws no `Pair again
 * to get alerts.` on a relaunch with another token, and draws no word that
 * names alerts anywhere in the run.
 */
function gradeNoSend(r) {
  if (r.canSend !== false) return verdict(null, `the Mac ${r.canSend === true ? 'COULD send' : 'was not read'} when this window opened, so "never asked" says nothing`);
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  if (n.asked === null) p.push('no notifications line: the UI test did not look for the question');
  else if (n.asked.asked !== false) p.push('iOS asked for notifications although the Mac cannot send');
  if (n.answered !== null) p.push(`the UI test answered a question (${J(n.answered.answered)}) that must not have been asked`);
  if (!r.allowed) p.push('the phone did not pair');
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else {
    if (alertLines(r.macLines).some((l) => l.endsWith(`device ${deviceDigest(r.token)}`))) p.push('the Mac holds an alert address for the seam token the phone was handed, which it was never asked to present');
    if (alertLines(r.macLines).length !== r.alertLinesBefore) p.push(`the lines hold ${String(alertLines(r.macLines).length)} alert line(s), and held ${String(r.alertLinesBefore)} before this phone`);
  }
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'none') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not none`);
  const relaunch = lastDump(r.events, 'relaunch');
  if (relaunch === null) p.push('no "relaunch" dump after a relaunch with another token');
  else {
    if (el(relaunch, 'screen-list') === null) p.push('the relaunch did not settle on the list');
    if ((el(relaunch, 'list-alerts-line')?.label ?? '') !== '') p.push('the relaunch draws a line asking to pair again for alerts, from a Mac that cannot send');
  }
  const promised = r.events
    .filter((e) => e.step === 'screen')
    .flatMap((d) => (d.elements ?? []).filter((e) => typeof e.label === 'string' && r.alertWords.some((w) => e.label.includes(w))).map((e) => `${String(d.name)}/${String(e.id)}`));
  if (promised.length > 0) p.push(`a word that names alerts is drawn at ${J(promised.slice(0, 4))}`);
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, [], `the Mac could not send (key kept, switch off); never asked, paired with no alert line and its row none although it was handed a seam token; a relaunch with another token draws no line; none of ${String(r.alertWords.length)} alert word(s) drawn`);
}

/** F1+: the floor phone was asked and allowed while the Mac could send, and the tap opens the session. */
function gradeFloorTap(r) {
  const asked = gradeAsked(r.pairing);
  if (asked.ok !== true) return verdict(asked.ok, `the floor's pairing: ${asked.said}`);
  const tap = gradeTap(r.tap);
  return tap.ok === true ? verdict(true, `the floor phone was asked and allowed and its address reached the Mac; ${tap.said}`) : tap;
}

/** Whether a body is the single shape for `sessionId`. */
function singleFor(bodyText, sessionId) {
  try {
    const b = JSON.parse(bodyText);
    return b?.tortie?.v === 1 && b.tortie.session === sessionId && b?.aps?.['thread-id'] === sessionId && typeof b?.aps?.alert?.title === 'string';
  } catch {
    return false;
  }
}

/** N3: one send per phone, each at its own environment's origin, signed, and byte for byte the composition. */
function gradeSent(r) {
  if (!r.mainBlocked) return verdict(null, `main never read ${N.alert} needs_input, so no alert was owed`);
  const p = [];
  const at = (origin) => r.requests.filter((x) => x.origin === origin);
  const want = [
    ['development', r.appToken, 'the app'],
    ['production', r.readerToken, 'the reader']
  ];
  for (const [origin, token, who] of want) {
    const hits = at(origin);
    if (hits.length !== 1) {
      p.push(`${String(hits.length)} request(s) at the ${origin} origin (${J(hits.map((x) => tokenName(x.token)))}), not one for ${who}`);
      continue;
    }
    const rec = hits[0];
    if (rec.token !== token) p.push(`the ${origin} origin was sent ${tokenName(rec.token)}'s token, not ${who}'s`);
    if (rec.method !== 'POST') p.push(`the ${origin} request is ${J(rec.method)}`);
    if (rec.status !== 200) p.push(`the ${origin} request was answered ${String(rec.status)} ${String(rec.reason ?? '')}`.trim());
    if (rec.jwt?.verifies !== true) p.push(`the ${origin} request's provider token does not verify under the scratch public key`);
    if (rec.headers?.['apns-topic'] !== r.topic) p.push(`the ${origin} request's apns-topic is ${J(rec.headers?.['apns-topic'])}`);
    if (!singleFor(rec.body, r.sessionId)) p.push(`the ${origin} body is not the single shape for ${N.alert}`);
    else if (r.composed !== null && rec.body !== r.composed) p.push(`the ${origin} body (${String(rec.bodyBytes)} bytes, sha ${shaHex(rec.body).slice(0, 12)}) is not this file's composition (${String(Buffer.byteLength(r.composed))} bytes, sha ${shaHex(r.composed).slice(0, 12)})`);
  }
  // No third clause for "more requests": the stand-in has two origins, so a
  // request beside the two wanted ones moves a count above or is the lone
  // request at its origin carrying the wrong token.
  const unread = r.composed === null ? ['the reader could not read /v1/blocked at the block, so no composition to compare with'] : [];
  return decide(p, unread, `one request at each origin, the app's at development and the reader's at production, both 200, signed under the scratch key, topic ${r.topic}, the single shape, byte for byte this file's composition (${String(Buffer.byteLength(r.composed ?? ''))} bytes)`);
}

/** How a session screen is titled: the navigation bar's identifier is its title, or a `session-title`. */
const titledWith = (dump, name) => el(dump, 'session-title')?.label === name || (dump?.elements ?? []).some((e) => e.id === name);

/** What must be true before a tap can be graded at all: delivered, and a banner seen. */
function tapUnreadable(r) {
  const u = [];
  if (r.delivery === null) u.push('nothing was delivered for this step (no ready-for-alert, or nothing to deliver)');
  else if (r.delivery.code !== 0) u.push(`the delivery answered ${String(r.delivery.code)}`);
  if (r.banner === null) u.push('the UI test printed no banner line');
  else if (r.banner.label === null) u.push('XCUITest found no banner from Tortie (SPEC §12 concern 1)');
  return u;
}

/** N4, N5 and F1+: the tap opens the session the alert names. */
function gradeTap(r) {
  const u = tapUnreadable(r);
  if (u.length > 0) return verdict(null, u.join('; '));
  const p = [];
  if (r.cold === true && r.ready?.cold !== true) p.push('the ready line does not say the app was terminated first');
  if (r.dump === null) p.push('no screen was dumped after the tap');
  else {
    if (String(r.dump.name).endsWith('-missing')) p.push(`the UI test dumped ${J(r.dump.name)}: no session or list after the tap`);
    if (el(r.dump, 'screen-session') === null) p.push(`the tap opened no session${el(r.dump, 'screen-list') !== null ? ' (the list is drawn)' : ''}`);
    else if (el(r.dump, 'session-failure') !== null) p.push(`the session drew a failure${r.cold === true ? ' (a tap that launches the app carries none of the DEBUG launch arguments, so the door endpoint seam is absent unless the app keeps it)' : ''}`);
    else if (!titledWith(r.dump, r.name)) p.push(`the session is not titled with the door's name for it (${String(r.name).length} characters)`);
  }
  return decide(p, [], `the banner tapped${r.cold === true ? ' with the app terminated' : ''}; the session opened, titled with the name the door holds for it`);
}

/**
 * Where a gone-session tap must be made from, read from the last dump before
 * its ready line (the 316.5 fix round): N6 from the list (`back`), N6b from
 * another session's screen (`visit`). A tap over the very session it names
 * changes nothing on screen, which is how N6 passed over a defect every other
 * tap showed, so a tap not arranged as named is UNREADABLE, never a pass.
 */
const TAP_FROM = {
  list: { name: 'back', holds: (d) => el(d, 'screen-list') !== null && el(d, 'screen-session') === null },
  session: { name: 'visit', holds: (d) => el(d, 'screen-session') !== null }
};

/** N6 and N6b: a gone session draws the Mac's own sentence on the list. */
function gradeGone(r) {
  if (!r.gone404) return verdict(null, 'the door still answered for that session after End and Remove, so "gone" was not set up');
  const from = TAP_FROM[r.from] ?? null;
  if (from === null) return verdict(null, `no arrangement named ${J(r.from)}`);
  if (r.before === null || r.before === undefined || r.before.name !== from.name || !from.holds(r.before)) {
    return verdict(null, `the tap was not made from ${r.from === 'list' ? 'the list' : 'another session\'s screen'}: the screen before it was ${r.before?.name === undefined || r.before === null ? 'never dumped' : J(r.before.name)}`);
  }
  const u = tapUnreadable(r);
  if (u.length > 0) return verdict(null, u.join('; '));
  const p = [];
  if (r.word === null) p.push('the Mac\'s NO_SUCH_SESSION could not be read from src/renderer/app/reach-copy.ts');
  if (r.dump === null) p.push('no screen was dumped after the tap');
  else {
    if (el(r.dump, 'screen-list') === null) p.push('the list is not drawn');
    if (el(r.dump, 'screen-session') !== null) p.push('a session screen is still drawn');
    const notice = el(r.dump, 'list-notice')?.label ?? null;
    if (r.word !== null && notice !== r.word) p.push(`the list's notice reads ${notice === null ? 'nothing' : `${String(notice.length)} characters that are not the Mac's sentence`}`);
  }
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, [], `the door answered 404, the tap from ${r.from === 'list' ? 'the list' : 'another session\'s screen'} drew the list with the Mac's own sentence, and the app stayed up`);
}

/** N7: a count body and a hostile id each open the list, and say nothing. */
function gradeListTaps(r) {
  const u = r.taps.flatMap((t, i) => tapUnreadable(t).map((why) => `tap ${String(i + 1)}: ${why}`));
  if (r.taps.length !== 2) u.push(`${String(r.taps.length)} list tap(s) were read, not two`);
  const p = [];
  r.taps.forEach((t, i) => {
    if (tapUnreadable(t).length > 0) return;
    if (t.dump === null) p.push(`tap ${String(i + 1)}: no screen dumped`);
    else {
      if (el(t.dump, 'screen-list') === null) p.push(`tap ${String(i + 1)}: the list is not drawn`);
      if (el(t.dump, 'screen-session') !== null) p.push(`tap ${String(i + 1)}: a session screen opened`);
      const notice = el(t.dump, 'list-notice')?.label ?? '';
      if (notice !== '') p.push(`tap ${String(i + 1)}: the list carries a notice`);
    }
  });
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, u, 'the count body and the body naming ../x each opened the list with no notice, and the app stayed up');
}

/** N8: a changed address draws one line, the same address draws none. */
function gradeRelaunch(r) {
  const p = [];
  const [changed, same] = r.dumps;
  if (r.dumps.length !== 2) p.push(`${String(r.dumps.length)} "relaunch" dump(s), not two (the changed token, then the paired one)`);
  if (changed !== undefined) {
    if (el(changed, 'screen-list') === null) p.push('the relaunch with a changed token did not settle on the list');
    const line = el(changed, 'list-alerts-line')?.label ?? null;
    if (line !== PAIR_AGAIN) p.push(`with a changed token the list's alerts line reads ${line === null ? 'nothing' : J(line)}, not ${J(PAIR_AGAIN)}`);
  }
  if (same !== undefined) {
    if (el(same, 'screen-list') === null) p.push('the relaunch with the paired token did not settle on the list');
    if ((el(same, 'list-alerts-line')?.label ?? '') !== '') p.push('with the token it paired with, the list still says to pair again');
  }
  return decide(p, [], `a changed token draws "${PAIR_AGAIN}" under the title, and the token it paired with draws nothing`);
}

/** N9: alerts off disarms once, and a new wait sends nothing. */
function gradeOff(r) {
  if (!r.armedAtStart) return verdict(null, `app.log did not read alerts armed when N9 began (${String(r.armedBefore)} armed, ${String(r.disarmedBefore)} disarmed line(s)), so a disarm says nothing`);
  if (!r.mainBlocked) return verdict(null, `main never read ${N.quiet} needs_input, so "nothing sent" says nothing`);
  const p = [];
  if (r.pushAlerts !== false) p.push('pocket:status still reads pushAlerts on');
  if (r.disarmed !== 1) p.push(`app.log gained ${String(r.disarmed)} "phone alerts disarmed" line(s), not one`);
  if (r.requests !== 0) p.push(`the stand-in took ${String(r.requests)} request(s) with alerts off`);
  if (r.waitedMs < QUIET_AFTER_OFF_MS) p.push(`only ${String(r.waitedMs)} ms were waited, under ${String(QUIET_AFTER_OFF_MS)}`);
  return decide(p, [], `disarmed once; ${N.quiet} read needs_input in main and 0 requests reached the stand-in in ${String(r.waitedMs)} ms`);
}

/** ND: denied, it pairs with no address and works, and a body shows nothing. */
function gradeDeny(r) {
  // Research 136: a phone is asked only when the Mac can send, so a denial
  // can only be read from a pairing with a Mac that could.
  if (r.canSend !== true) return verdict(null, 'the Mac could not send when this window opened, so the phone could not be asked and there was nothing to deny');
  if (r.events.length === 0) return verdict(null, 'the UI test printed no P316 line');
  const n = notificationEvents(r.events);
  const p = [];
  const u = [];
  if (n.asked?.asked !== true) p.push('XCUITest saw no notification question to deny');
  if (n.answered !== null && n.answered.answered === null) u.push('XCUITest saw iOS\'s question and found no Don\u2019t Allow button to press');
  else if (n.answered?.answered !== 'deny') p.push(`the question was answered ${J(n.answered?.answered ?? null)}, not deny`);
  if (!r.allowed) p.push('the phone did not pair');
  if (r.macLines === null) p.push('the Mac\'s lines were never read at Allow');
  else {
    if (alertLines(r.macLines).some((l) => l.endsWith(`device ${deviceDigest(r.token)}`))) p.push('the Mac holds an alert address for the seam token the phone was handed although it denied');
    if (alertLines(r.macLines).length !== r.alertLinesBefore) p.push(`the lines hold ${String(alertLines(r.macLines).length)} alert line(s), and held ${String(r.alertLinesBefore)} before this phone`);
  }
  if (r.phoneRow === null) p.push('the Mac lists no new phone');
  else if (r.phoneRow.alerts !== 'none') p.push(`the phone's row reads alerts ${J(r.phoneRow.alerts)}, not none`);
  for (const [name, screen] of [['list', 'screen-list'], ['session', 'screen-session'], ['conversation', 'screen-conversation']]) {
    if (el(lastDump(r.events, name), screen) === null) p.push(`the ${name} was not drawn`);
  }
  if (r.delivery === null || r.delivery.code !== 0) u.push(`the body was ${r.delivery === null ? 'never delivered' : `delivered with code ${String(r.delivery.code)}`}, so "no banner" says nothing`);
  const banner = r.events.find((e) => e.step === 'banner') ?? null;
  if (banner === null) u.push('the UI test printed no banner line');
  else if (banner.label !== null) p.push('a banner from Tortie was shown to a phone that denied notifications');
  if (r.alive !== RUNNING_FOREGROUND) p.push(`the app ended the drive in state ${J(r.alive)}`);
  return decide(p, u, 'denied, paired with no alert line and its row none although it was handed a seam token; the list, a session and its conversation drawn; no banner in 20 s; alive');
}

/** N10: nothing of an alert in app.log, and nothing in what the app printed. */
function gradeLog(r) {
  if (r.log === null || r.log === '') return verdict(null, 'app.log could not be read');
  const p = [];
  for (const [what, needle] of r.needles) {
    if (typeof needle !== 'string' || needle.length < 12) continue;
    if (r.log.includes(needle)) p.push(`app.log holds ${what}`);
    if (r.printed.includes(needle)) p.push(`the app printed ${what}`);
  }
  const counted = r.needles.filter(([, n]) => typeof n === 'string' && n.length >= 12).length;
  return decide(p, counted === 0 ? ['there was nothing to look for'] : [], `app.log (${String(r.log.length)} characters) and the app's output hold none of ${String(counted)} tokens, provider tokens, key lines and alert bodies`);
}

/**
 * Each delivery, with the banner line and the first dump the UI test printed
 * after its ready line and before the next ready line. Deliveries are in the
 * order their ready lines were read; nothing here trusts a name the phone
 * chose for a step.
 */
function tapReadings(events, deliveries) {
  const readies = events.filter((e) => e.step === 'ready-for-alert').map((e) => Number(e.seq)).sort((a, b) => a - b);
  return deliveries.map((d) => {
    const next = readies.find((s) => s > d.readySeq) ?? Number.POSITIVE_INFINITY;
    const inside = (e) => Number(e.seq) > d.readySeq && Number(e.seq) < next;
    // Where the tap was made from: the last screen dumped before its ready line.
    const earlier = events.filter((e) => e.step === 'screen' && Number(e.seq) < d.readySeq).sort((a, b) => Number(a.seq) - Number(b.seq));
    return {
      arm: d.arm,
      delivery: d.code === null ? null : { code: d.code },
      ready: events.find((e) => e.step === 'ready-for-alert' && Number(e.seq) === d.readySeq) ?? null,
      banner: events.find((e) => e.step === 'banner' && inside(e)) ?? null,
      dump: events.find((e) => e.step === 'screen' && inside(e)) ?? null,
      before: earlier.at(-1) ?? null
    };
  });
}

// ---------------------------------------------------------------------------
// Phase 316.5: every grader above, proved on fixtures. Launches nothing.
// ---------------------------------------------------------------------------

/**
 * Each case is ONE honest reading or ONE clause of it broken, and says what
 * the grader must answer: true (pass), false (FAIL) or null (UNREADABLE). A
 * break answered green is a clause nothing holds; a precondition answered
 * anything but UNREADABLE is a pass or a fail the run did not earn.
 */
function alertsSelfTest() {
  const tok = { reader: 'a'.repeat(64), app: 'b'.repeat(64), floor: 'c'.repeat(64), deny: 'd'.repeat(64) };
  const pemLine = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgSELFTEST';
  const pemText = `-----BEGIN PRIVATE KEY-----\n${pemLine}\n-----END PRIVATE KEY-----\n`;
  const row = { sessionId: 's1', name: 'p316-alert', statusLabel: 'needs input', project: 'project', agentLabel: 'Claude Code', machine: null };
  const single = composeSingleAlert(row, 2);
  const cases = [];
  const add = (what, grader, input, want) => cases.push({ what, got: () => grader(input).ok, want });
  const edit = (base, fn) => {
    const copy = structuredClone(base);
    fn(copy);
    return copy;
  };

  // The composer, against the pinned bytes of SPEC §5.4.
  cases.push({ what: 'composer: the single shape, byte for byte', got: () => single === '{"aps":{"alert":{"title":"p316-alert needs input","body":"project · Claude Code"},"badge":2,"sound":"default","thread-id":"s1"},"tortie":{"v":1,"session":"s1"}}', want: true });
  cases.push({ what: 'composer: the single shape with a machine', got: () => JSON.parse(composeSingleAlert({ ...row, machine: 'Mac Pro' }, 1)).aps.alert.body === 'project · Claude Code · Mac Pro', want: true });
  cases.push({ what: 'composer: the count shape, byte for byte', got: () => MAC.needsYourInput === null || composeCountAlert(['a', 'b'], 2) === `{"aps":{"alert":{"title":"${MAC.needsYourInput} (2)","body":"a · b"},"badge":2,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}`, want: true });
  cases.push({ what: 'composer: a body over 4096 bytes is refused, never sent', got: () => composeSingleAlert({ ...row, name: 'x'.repeat(5_000) }, 1) === null, want: true });

  // The preflight of the Mac's override.
  const harness = '/private/tmp/p316-selftest/harness';
  const honestOverride = { origins: { development: 'http://127.0.0.1:50001', production: 'http://127.0.0.1:50002' }, keyFile: `${harness}/alerts/AuthKey_${KEY_ID}.p8` };
  const pre = (what, json, want) => cases.push({ what: `preflight: ${what}`, got: () => alertsOverrideRefusal(json, harness) === null, want });
  pre('the honest override', honestOverride, true);
  pre('JSON null', null, false);
  pre('origins null', edit(honestOverride, (o) => (o.origins = null)), false);
  pre('a name, not an address', edit(honestOverride, (o) => (o.origins.production = 'http://localhost:50002')), false);
  pre('https', edit(honestOverride, (o) => (o.origins.development = 'https://127.0.0.1:50001')), false);
  pre('another address', edit(honestOverride, (o) => (o.origins.production = 'http://10.0.0.1:50002')), false);
  pre('Apple\'s host', edit(honestOverride, (o) => (o.origins.production = 'https://api.push.apple.com:443')), false);
  pre('port 0', edit(honestOverride, (o) => (o.origins.development = 'http://127.0.0.1:0')), false);
  pre('one environment only', edit(honestOverride, (o) => delete o.origins.production), false);
  pre('the key outside the harness', edit(honestOverride, (o) => (o.keyFile = '/Users/someone/Keys/AuthKey_ABCDEFGHIJ.p8')), false);
  pre('the key beside the harness by prefix', edit(honestOverride, (o) => (o.keyFile = `${harness}-x/AuthKey_${KEY_ID}.p8`)), false);
  pre('a third field', edit(honestOverride, (o) => (o.allowRemote = true)), false);

  // N1
  const key = { bridge: { ok: true, value: { kept: true, refusal: null } }, statusKeyId: KEY_ID, sealed: [{ name: 'apns-provider.cred', bytes: Buffer.from('sealed-bytes-that-are-not-the-key') }], pemText, pemLines: [pemLine] };
  add('N1 honest', gradeKey, key, true);
  add('N1 the bridge has no choosePushKey', gradeKey, { ...key, bridge: { ok: false, error: 'not a function' } }, false);
  add('N1 not kept', gradeKey, edit(key, (k) => (k.bridge.value.kept = false)), false);
  add('N1 a refusal', gradeKey, edit(key, (k) => (k.bridge.value.refusal = 'no')), false);
  add('N1 pushKeyId null', gradeKey, { ...key, statusKeyId: null }, false);
  add('N1 nothing sealed', gradeKey, { ...key, sealed: [] }, false);
  add('N1 the sealed file holds a PEM line', gradeKey, { ...key, sealed: [{ name: 'x', bytes: Buffer.from(`xx${pemLine}xx`) }] }, false);

  // D2+
  const readerLine = { lines: ['Allows no phone yet', alertLineFor('p316 reader', 'production', tok.reader)], label: 'p316 reader', token: tok.reader };
  add('D2+ honest', gradeReaderLine, readerLine, true);
  add('D2+ development, not production', gradeReaderLine, { ...readerLine, lines: [alertLineFor('p316 reader', 'development', tok.reader)] }, false);
  add('D2+ another token\'s digest', gradeReaderLine, { ...readerLine, lines: [alertLineFor('p316 reader', 'production', tok.app)] }, false);
  add('D2+ no line', gradeReaderLine, { ...readerLine, lines: ['Allows no phone yet'] }, false);
  add('D2+ lines never read (UNREADABLE)', gradeReaderLine, { ...readerLine, lines: null }, null);

  // N2
  const armedR = { askWaiting: true, confirmed: true, confirmWhy: '', pushAlerts: true, armedLines: 1, requests: 0, waitedMs: QUIET_AFTER_ARM_MS };
  add('N2 honest', gradeArmed, armedR, true);
  add('N2 main never read the wait (UNREADABLE)', gradeArmed, { ...armedR, askWaiting: false }, null);
  add('N2 not confirmed', gradeArmed, { ...armedR, confirmed: false }, false);
  add('N2 pushAlerts off', gradeArmed, { ...armedR, pushAlerts: false }, false);
  add('N2 never armed', gradeArmed, { ...armedR, armedLines: 0 }, false);
  add('N2 armed twice', gradeArmed, { ...armedR, armedLines: 2 }, false);
  add('N2 the old wait announced', gradeArmed, { ...armedR, requests: 1 }, false);
  add('N2 too short a wait', gradeArmed, { ...armedR, waitedMs: 3_000 }, false);

  // N0
  const askedEvents = [
    { step: 'fingerprint', text: 'ab12', seq: 1, receivedAt: 900 },
    { step: 'notifications', asked: true, title: 'x', buttons: ['Allow'], seq: 2, receivedAt: 1_000 },
    { step: 'notifications', answered: 'allow', seq: 3, receivedAt: 1_400 }
  ];
  const asked = { canSend: true, events: askedEvents, samples: [{ at: 950, state: 'waiting' }, { at: 1_050, state: 'waiting' }, { at: 1_600, state: 'presented' }], macLines: [alertLineFor('iPhone', 'development', tok.app)], label: 'iPhone', token: tok.app, phoneRow: { alerts: 'on' } };
  add('N0 honest', gradeAsked, asked, true);
  // Research 136: the phone learns the Mac can send from the Mac's answer to
  // its presentation, so a question while the Mac reads presented is honest.
  add('N0 honest, asked after the Mac\'s first answer (research 136)', gradeAsked, { ...asked, samples: [{ at: -2_000, state: 'waiting' }, { at: -1_500, state: 'presented' }, { at: 1_050, state: 'presented' }, { at: 1_600, state: 'allowed' }] }, true);
  add('N0 the Mac could not send (UNREADABLE)', gradeAsked, { ...asked, canSend: false }, null);
  add('N0 no line at all (UNREADABLE)', gradeAsked, { ...asked, events: [] }, null);
  add('N0 no sample after the question (UNREADABLE)', gradeAsked, { ...asked, samples: [{ at: 950, state: 'waiting' }] }, null);
  add('N0 no question seen', gradeAsked, edit(asked, (a) => { a.events[1].asked = false; }), false);
  add('N0 no notifications line', gradeAsked, { ...asked, events: [askedEvents[0]] }, false);
  add('N0 an answer with no question line before it', gradeAsked, { ...asked, events: [askedEvents[0], askedEvents[2]] }, false);
  add('N0 no fingerprint line', gradeAsked, { ...asked, events: askedEvents.slice(1) }, false);
  add('N0 the Mac\'s lines never read', gradeAsked, { ...asked, macLines: null }, false);
  add('N0 asked before the fingerprint', gradeAsked, edit(asked, (a) => { a.events[0].seq = 5; }), false);
  add('N0 allowed long before the question line was read', gradeAsked, { ...asked, samples: [{ at: -2_000, state: 'presented' }, { at: -1_500, state: 'allowed' }, { at: 1_050, state: 'allowed' }] }, false);
  add('N0 allowed within the line lag (UNREADABLE)', gradeAsked, { ...asked, samples: [{ at: 500, state: 'allowed' }, { at: 1_050, state: 'allowed' }] }, null);
  add('N0 answered deny', gradeAsked, edit(asked, (a) => { a.events[2].answered = 'deny'; }), false);
  add('N0 no button to press (UNREADABLE)', gradeAsked, edit(asked, (a) => { a.events[2].answered = null; }), null);
  add('N0 production, not development', gradeAsked, { ...asked, macLines: [alertLineFor('iPhone', 'production', tok.app)] }, false);
  add('N0 no alert line', gradeAsked, { ...asked, macLines: [] }, false);
  add('N0 the row reads none', gradeAsked, { ...asked, phoneRow: { alerts: 'none' } }, false);
  add('N0 no new phone', gradeAsked, { ...asked, phoneRow: null }, false);

  // N3
  const rec = (origin, token, body) => ({ origin, token, method: 'POST', status: 200, reason: null, jwt: { verifies: true }, headers: { 'apns-topic': TOPIC }, body, bodyBytes: Buffer.byteLength(body) });
  const sent = { mainBlocked: true, sessionId: 's1', composed: single, requests: [rec('development', tok.app, single), rec('production', tok.reader, single)], appToken: tok.app, readerToken: tok.reader, topic: TOPIC };
  const count = composeCountAlert(['p316-alert'], 2) ?? '{"aps":{"badge":2}}';
  add('N3 honest', gradeSent, sent, true);
  add('N3 main never read the block (UNREADABLE)', gradeSent, { ...sent, mainBlocked: false }, null);
  add('N3 no composition (UNREADABLE)', gradeSent, { ...sent, composed: null }, null);
  add('N3 nothing at development', gradeSent, { ...sent, requests: [sent.requests[1]] }, false);
  add('N3 two at development', gradeSent, { ...sent, requests: [...sent.requests, rec('development', tok.app, single)] }, false);
  add('N3 each token at the other origin', gradeSent, { ...sent, requests: [rec('development', tok.reader, single), rec('production', tok.app, single)] }, false);
  add('N3 a 400', gradeSent, edit(sent, (s) => { s.requests[0].status = 400; }), false);
  add('N3 a provider token that does not verify', gradeSent, edit(sent, (s) => { s.requests[1].jwt.verifies = false; }), false);
  add('N3 another topic', gradeSent, edit(sent, (s) => { s.requests[0].headers['apns-topic'] = 'com.example.other'; }), false);
  add('N3 not POST', gradeSent, edit(sent, (s) => { s.requests[0].method = 'GET'; }), false);
  add('N3 the count shape', gradeSent, { ...sent, requests: [rec('development', tok.app, count), rec('production', tok.reader, count)] }, false);
  add('N3 one character off the composition', gradeSent, { ...sent, requests: [rec('development', tok.app, single.replace('needs input', 'needs inpu!')), sent.requests[1]] }, false);
  add('N3 a third request', gradeSent, { ...sent, requests: [...sent.requests, rec('development', tok.floor, single)] }, false);

  // N4, N5, F1+
  const sessionDump = { step: 'screen', name: 'alert', elements: [{ id: 'screen-session', label: '' }, { id: 'p316-alert', label: 'p316-alert' }] };
  const tap = { delivery: { code: 0 }, banner: { step: 'banner', label: 'Tortie, p316-alert needs input' }, dump: sessionDump, name: 'p316-alert', cold: false, ready: { step: 'ready-for-alert' } };
  add('N4 honest', gradeTap, tap, true);
  add('N4 nothing delivered (UNREADABLE)', gradeTap, { ...tap, delivery: null }, null);
  add('N4 the delivery failed (UNREADABLE)', gradeTap, { ...tap, delivery: { code: 1 } }, null);
  add('N4 no banner line (UNREADABLE)', gradeTap, { ...tap, banner: null }, null);
  add('N4 no banner found (UNREADABLE)', gradeTap, { ...tap, banner: { step: 'banner', label: null } }, null);
  add('N4 no dump', gradeTap, { ...tap, dump: null }, false);
  add('N4 a missing dump', gradeTap, { ...tap, dump: { ...sessionDump, name: 'alert-missing', elements: [] } }, false);
  add('N4 a dump named missing over a drawn session', gradeTap, { ...tap, dump: { ...sessionDump, name: 'alert-missing' } }, false);
  add('N4 the list, a row named alike', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-list', label: '' }, { id: 'row-name-s1', label: 'p316-alert' }] } }, false);
  add('N4 a session titled otherwise', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] } }, false);
  add('N4 a session whose name is only a label', gradeTap, { ...tap, dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'session-agent', label: 'p316-alert' }] } }, false);
  add('N4 a session failure', gradeTap, { ...tap, dump: { ...sessionDump, elements: [...sessionDump.elements, { id: 'session-failure', label: 'x' }] } }, false);
  add('N5 honest cold', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert', cold: true } }, true);
  add('N5 the app was not terminated', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert' } }, false);
  add('N5 a cold launch that could not reach the door', gradeTap, { ...tap, cold: true, ready: { step: 'ready-for-alert', cold: true }, dump: { ...sessionDump, elements: [...sessionDump.elements, { id: 'session-failure', label: 'x' }] } }, false);
  const floor = { pairing: { ...asked, token: tok.floor, macLines: [alertLineFor('iPhone', 'development', tok.floor)] }, tap: { ...tap, name: 'p316-talk', dump: { ...sessionDump, elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] } } };
  add('F1+ honest on the floor', gradeFloorTap, floor, true);
  add('F1+ the tap opened the list', gradeFloorTap, edit(floor, (f) => { f.tap.dump.elements = [{ id: 'screen-list', label: '' }]; }), false);
  add('F1+ the Mac could not send (UNREADABLE)', gradeFloorTap, edit(floor, (f) => { f.pairing.canSend = false; }), null);
  add('F1+ the floor phone never asked', gradeFloorTap, edit(floor, (f) => { f.pairing.events[1].asked = false; }), false);
  add('F1+ the floor phone\'s address never reached the Mac', gradeFloorTap, edit(floor, (f) => { f.pairing.macLines = []; }), false);
  add('F1+ no banner found (UNREADABLE)', gradeFloorTap, edit(floor, (f) => { f.tap.banner = { step: 'banner', label: null }; }), null);

  // N6
  const word = MAC.noSuchSession ?? 'the Mac word';
  const fromList = { step: 'screen', name: 'back', elements: [{ id: 'screen-list', label: '' }] };
  const fromOther = { step: 'screen', name: 'visit', elements: [{ id: 'screen-session', label: '' }, { id: 'p316-talk', label: 'p316-talk' }] };
  const gone = { ...tap, gone404: true, word, alive: RUNNING_FOREGROUND, from: 'list', before: fromList, dump: { step: 'screen', name: 'alert-gone', elements: [{ id: 'screen-list', label: '' }, { id: 'list-notice', label: word }] } };
  add('N6 honest', gradeGone, gone, true);
  add('N6 tapped over the session it names (UNREADABLE)', gradeGone, { ...gone, before: { ...sessionDump, name: 'alert-cold' } }, null);
  add('N6 a session screen dumped as back (UNREADABLE)', gradeGone, { ...gone, before: { ...fromList, elements: [{ id: 'screen-session', label: '' }] } }, null);
  add('N6 nothing dumped before the tap (UNREADABLE)', gradeGone, { ...gone, before: null }, null);
  add('N6 no arrangement named (UNREADABLE)', gradeGone, { ...gone, from: undefined }, null);
  add('N6b honest, from another session', gradeGone, { ...gone, from: 'session', before: fromOther }, true);
  add('N6b from the list (UNREADABLE)', gradeGone, { ...gone, from: 'session', before: fromList }, null);
  add('N6b no notice', gradeGone, { ...gone, from: 'session', before: fromOther, dump: { ...gone.dump, elements: [{ id: 'screen-list', label: '' }] } }, false);
  add('N6 the door still knew the session (UNREADABLE)', gradeGone, { ...gone, gone404: false }, null);
  add('N6 no banner found (UNREADABLE)', gradeGone, { ...gone, banner: { step: 'banner', label: null } }, null);
  add('N6 no notice', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'screen-list', label: '' }] } }, false);
  add('N6 a notice in other words', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'screen-list', label: '' }, { id: 'list-notice', label: 'That session is gone.' }] } }, false);
  add('N6 a session still drawn', gradeGone, { ...gone, dump: { ...gone.dump, elements: [...gone.dump.elements, { id: 'screen-session', label: '' }] } }, false);
  add('N6 no list', gradeGone, { ...gone, dump: { ...gone.dump, elements: [{ id: 'list-notice', label: word }] } }, false);
  add('N6 no dump', gradeGone, { ...gone, dump: null }, false);
  add('N6 the app is gone', gradeGone, { ...gone, alive: 1 }, false);
  add('N6 the Mac\'s word unread', gradeGone, { ...gone, word: null }, false);

  // N7
  const listDump = { step: 'screen', name: 'alert-list', elements: [{ id: 'screen-list', label: '' }] };
  const listTaps = { taps: [{ ...tap, dump: listDump }, { ...tap, dump: listDump }], alive: RUNNING_FOREGROUND };
  add('N7 honest', gradeListTaps, listTaps, true);
  add('N7 one tap read (UNREADABLE)', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0]] }, null);
  add('N7 no banner on either (UNREADABLE)', gradeListTaps, { ...listTaps, taps: listTaps.taps.map((t) => ({ ...t, banner: { step: 'banner', label: null } })) }, null);
  add('N7 a notice', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [...listDump.elements, { id: 'list-notice', label: word }] } }] }, false);
  add('N7 ../x opened a session', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: sessionDump }] }, false);
  add('N7 a session screen drawn over the list', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [...listDump.elements, { id: 'screen-session', label: '' }] } }] }, false);
  add('N7 the app is gone', gradeListTaps, { ...listTaps, alive: 1 }, false);
  add('N7 no dump after a tap', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: null }] }, false);
  add('N7 no list drawn', gradeListTaps, { ...listTaps, taps: [listTaps.taps[0], { ...tap, dump: { ...listDump, elements: [] } }] }, false);

  // N8
  const relaunch = { dumps: [{ step: 'screen', name: 'relaunch', elements: [{ id: 'screen-list', label: '' }, { id: 'list-alerts-line', label: PAIR_AGAIN }] }, { step: 'screen', name: 'relaunch', elements: [{ id: 'screen-list', label: '' }] }] };
  add('N8 honest', gradeRelaunch, relaunch, true);
  add('N8 no line for a changed token', gradeRelaunch, { dumps: [relaunch.dumps[1], relaunch.dumps[1]] }, false);
  add('N8 the line without its full stop', gradeRelaunch, { dumps: [edit(relaunch.dumps[0], (d) => { d.elements[1].label = 'Pair again to get alerts'; }), relaunch.dumps[1]] }, false);
  add('N8 a line for the same token', gradeRelaunch, { dumps: [relaunch.dumps[0], relaunch.dumps[0]] }, false);
  add('N8 no second relaunch', gradeRelaunch, { dumps: [relaunch.dumps[0]] }, false);
  add('N8 not on the list', gradeRelaunch, { dumps: [{ ...relaunch.dumps[0], elements: [{ id: 'list-alerts-line', label: PAIR_AGAIN }] }, relaunch.dumps[1]] }, false);
  add('N8 the control not on the list', gradeRelaunch, { dumps: [relaunch.dumps[0], { ...relaunch.dumps[1], elements: [] }] }, false);
  add('N8 no relaunch at all', gradeRelaunch, { dumps: [] }, false);

  // N9
  const off = { armedAtStart: true, armedBefore: 2, disarmedBefore: 1, mainBlocked: true, pushAlerts: false, disarmed: 1, requests: 0, waitedMs: QUIET_AFTER_OFF_MS };
  add('N9 honest', gradeOff, off, true);
  add('N9 not armed when it began (UNREADABLE)', gradeOff, { ...off, armedAtStart: false }, null);
  add('N9 main never read the wait (UNREADABLE)', gradeOff, { ...off, mainBlocked: false }, null);
  add('N9 still on', gradeOff, { ...off, pushAlerts: true }, false);
  add('N9 never disarmed', gradeOff, { ...off, disarmed: 0 }, false);
  add('N9 disarmed twice', gradeOff, { ...off, disarmed: 2 }, false);
  add('N9 a request with alerts off', gradeOff, { ...off, requests: 1 }, false);
  add('N9 too short a wait', gradeOff, { ...off, waitedMs: 5_000 }, false);

  // ND
  const denyEvents = [
    { step: 'fingerprint', text: 'ab', seq: 1 },
    { step: 'notifications', asked: true, seq: 2 },
    { step: 'notifications', answered: 'deny', seq: 3 },
    { step: 'screen', name: 'list', elements: [{ id: 'screen-list', label: '' }], seq: 4 },
    { step: 'screen', name: 'session', elements: [{ id: 'screen-session', label: '' }], seq: 5 },
    { step: 'screen', name: 'conversation', elements: [{ id: 'screen-conversation', label: '' }], seq: 6 },
    { step: 'ready-for-alert', seq: 7 },
    { step: 'banner', label: null, seq: 8 }
  ];
  const deny = { canSend: true, events: denyEvents, allowed: true, macLines: [alertLineFor('p316 reader', 'production', tok.reader)], alertLinesBefore: 1, token: tok.deny, phoneRow: { alerts: 'none' }, delivery: { code: 0 }, alive: RUNNING_FOREGROUND };
  add('ND honest', gradeDeny, deny, true);
  add('ND the Mac could not send (UNREADABLE)', gradeDeny, { ...deny, canSend: false }, null);
  add('ND no line at all (UNREADABLE)', gradeDeny, { ...deny, events: [] }, null);
  add('ND never delivered (UNREADABLE)', gradeDeny, { ...deny, delivery: null }, null);
  add('ND no banner line (UNREADABLE)', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.step !== 'banner') }, null);
  add('ND answered allow', gradeDeny, edit(deny, (d) => { d.events[2].answered = 'allow'; }), false);
  add('ND no button to press (UNREADABLE)', gradeDeny, edit(deny, (d) => { d.events[2].answered = null; }), null);
  add('ND not asked', gradeDeny, edit(deny, (d) => { d.events[1].asked = false; }), false);
  add('ND not paired', gradeDeny, { ...deny, allowed: false }, false);
  // The count held equal, so only the seam-token clause can say it.
  add('ND the seam token reached the Mac', gradeDeny, { ...deny, macLines: [...deny.macLines, alertLineFor('iPhone', 'development', tok.deny)], alertLinesBefore: 2 }, false);
  add('ND an alert line gained', gradeDeny, { ...deny, macLines: [...deny.macLines, alertLineFor('iPhone', 'development', tok.floor)] }, false);
  add('ND the row reads on', gradeDeny, { ...deny, phoneRow: { alerts: 'on' } }, false);
  add('ND no new phone', gradeDeny, { ...deny, phoneRow: null }, false);
  add('ND the Mac\'s lines never read', gradeDeny, { ...deny, macLines: null }, false);
  add('ND no list drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'list') }, false);
  add('ND no conversation drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'conversation') }, false);
  add('ND delivered with a failure (UNREADABLE)', gradeDeny, { ...deny, delivery: { code: 1 } }, null);
  add('ND a banner shown', gradeDeny, edit(deny, (d) => { d.events[7].label = 'Tortie'; }), false);
  add('ND no session drawn', gradeDeny, { ...deny, events: denyEvents.filter((e) => e.name !== 'session') }, false);
  add('ND the app is gone', gradeDeny, { ...deny, alive: 1 }, false);

  // N11 (research 136): a Mac that cannot send, and a phone never asked.
  const noSendEvents = [
    { step: 'fingerprint', text: 'ab', seq: 1 },
    { step: 'notifications', asked: false, seq: 2 },
    { step: 'screen', name: 'list', elements: [{ id: 'screen-list', label: '' }, { id: 'row-name-s1', label: 'p316-ask' }], seq: 3 },
    { step: 'screen', name: 'relaunch', elements: [{ id: 'screen-list', label: '' }], seq: 4 }
  ];
  const noSend = { canSend: false, events: noSendEvents, allowed: true, macLines: [alertLineFor('p316 reader', 'production', tok.reader)], alertLinesBefore: 1, token: tok.deny, phoneRow: { alerts: 'none' }, alive: RUNNING_FOREGROUND, alertWords: [PAIR_AGAIN] };
  add('N11 honest', gradeNoSend, noSend, true);
  add('N11 the Mac could send (UNREADABLE)', gradeNoSend, { ...noSend, canSend: true }, null);
  add('N11 the Mac was not read (UNREADABLE)', gradeNoSend, { ...noSend, canSend: null }, null);
  add('N11 no line at all (UNREADABLE)', gradeNoSend, { ...noSend, events: [] }, null);
  add('N11 asked although the Mac cannot send', gradeNoSend, edit(noSend, (n) => { n.events[1].asked = true; }), false);
  add('N11 no notifications line', gradeNoSend, { ...noSend, events: noSendEvents.filter((e) => e.step !== 'notifications') }, false);
  add('N11 a question answered', gradeNoSend, { ...noSend, events: [...noSendEvents, { step: 'notifications', answered: 'allow', seq: 5 }] }, false);
  add('N11 not paired', gradeNoSend, { ...noSend, allowed: false }, false);
  add('N11 the Mac\'s lines never read', gradeNoSend, { ...noSend, macLines: null }, false);
  // The count held equal, so only the seam-token clause can say it.
  add('N11 the seam token reached the Mac', gradeNoSend, { ...noSend, macLines: [...noSend.macLines, alertLineFor('iPhone', 'development', tok.deny)], alertLinesBefore: 2 }, false);
  add('N11 an alert line gained', gradeNoSend, { ...noSend, macLines: [...noSend.macLines, alertLineFor('iPhone', 'development', tok.floor)] }, false);
  add('N11 no new phone', gradeNoSend, { ...noSend, phoneRow: null }, false);
  add('N11 the row reads on', gradeNoSend, { ...noSend, phoneRow: { alerts: 'on' } }, false);
  add('N11 no relaunch', gradeNoSend, { ...noSend, events: noSendEvents.filter((e) => e.name !== 'relaunch') }, false);
  add('N11 the relaunch not on the list', gradeNoSend, edit(noSend, (n) => { n.events[3].elements = []; }), false);
  add('N11 the relaunch asks to pair again', gradeNoSend, edit(noSend, (n) => { n.events[3].elements.push({ id: 'list-alerts-line', label: 'x' }); }), false);
  add('N11 an alert word drawn elsewhere', gradeNoSend, edit(noSend, (n) => { n.events[2].elements.push({ id: 'list-title-note', label: `Sessions. ${PAIR_AGAIN}` }); }), false);
  add('N11 the app is gone', gradeNoSend, { ...noSend, alive: 1 }, false);

  // N10
  const log = { log: '2026-09-30 info [push] phone alerts armed\n', printed: '', needles: [['a device token', tok.app], ['a provider token', 'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJ4In0.c2ln'], ['a line of the scratch key', pemLine], ['an alert body', single]] };
  add('N10 honest', gradeLog, log, true);
  add('N10 no log (UNREADABLE)', gradeLog, { ...log, log: '' }, null);
  add('N10 a token in the log', gradeLog, { ...log, log: `${log.log}token ${tok.app}\n` }, false);
  add('N10 a provider token in the log', gradeLog, { ...log, log: `${log.log}${log.needles[1][1]}\n` }, false);
  add('N10 a key line in the log', gradeLog, { ...log, log: `${log.log}${pemLine}\n` }, false);
  add('N10 a body in the log', gradeLog, { ...log, log: `${log.log}${single}\n` }, false);
  add('N10 a token printed', gradeLog, { ...log, printed: tok.app }, false);

  // The tap reader: a banner and a dump belong to the ready line before them.
  const seqEvents = [
    { step: 'ready-for-alert', seq: 5 },
    { step: 'banner', label: 'one', seq: 6 },
    { step: 'screen', name: 'alert', elements: [], seq: 7 },
    { step: 'ready-for-alert', seq: 9, cold: true },
    { step: 'screen', name: 'alert-cold-missing', elements: [], seq: 10 }
  ];
  // Research 136's switch, read the way the Mac states it.
  cases.push({ what: 'can send: a key kept and the switch on, confirmed', got: () => macCanSend({ pushAlerts: true, confirmState: 'confirmed', pushKeyId: KEY_ID }), want: true });
  cases.push({ what: 'can send: the switch on and no key', got: () => macCanSend({ pushAlerts: true, confirmState: 'confirmed', pushKeyId: null }), want: false });
  cases.push({ what: 'can send: a key and the switch off', got: () => macCanSend({ pushAlerts: false, confirmState: 'confirmed', pushKeyId: KEY_ID }), want: false });
  cases.push({ what: 'can send: a key and the switch on, not yet confirmed', got: () => macCanSend({ pushAlerts: true, confirmState: 'unconfirmed', pushKeyId: KEY_ID }), want: false });
  cases.push({ what: 'can send: no status', got: () => macCanSend(null), want: false });
  // A delivery whose step printed nothing before the next ready line reads
  // nothing, not the next step's banner and screen.
  cases.push({
    what: 'the tap reader: a step that printed nothing does not borrow the next step\'s banner',
    got: () => {
      const t = tapReadings([{ step: 'ready-for-alert', seq: 5 }, { step: 'ready-for-alert', seq: 9 }, { step: 'banner', label: 'two', seq: 10 }, { step: 'screen', name: 'alert', elements: [], seq: 11 }], [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]);
      return t[0].banner === null && t[0].dump === null && t[1].banner?.label === 'two' && t[1].dump?.name === 'alert';
    },
    want: true
  });
  cases.push({
    what: 'the tap reader: where a tap was made from is the last dump before its ready line',
    got: () => {
      const t = tapReadings(
        [{ step: 'screen', name: 'session', elements: [], seq: 2 }, { step: 'screen', name: 'back', elements: [], seq: 3 }, { step: 'ready-for-alert', seq: 5 }, { step: 'screen', name: 'alert-gone', elements: [], seq: 7 }, { step: 'ready-for-alert', seq: 9 }],
        [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]
      );
      return t[0].before?.name === 'back' && t[1].before?.name === 'alert-gone';
    },
    want: true
  });
  cases.push({
    what: 'the tap reader: each banner and dump to its own delivery, and a missing banner stays missing',
    got: () => {
      const t = tapReadings(seqEvents, [{ arm: 'a', readySeq: 5, code: 0 }, { arm: 'b', readySeq: 9, code: 0 }]);
      return t[0].banner?.label === 'one' && t[0].dump?.name === 'alert' && t[1].banner === null && t[1].dump?.name === 'alert-cold-missing' && t[1].ready?.cold === true;
    },
    want: true
  });

  let bad = 0;
  for (const c of cases) {
    let got;
    try {
      got = c.got();
    } catch (err) {
      got = `threw ${String(err?.message ?? err)}`;
    }
    const ok = got === c.want;
    if (!ok) bad += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.what}: ${got === true ? 'green' : got === false ? 'red' : got === null ? 'UNREADABLE' : String(got)}`);
  }
  return { bad, total: cases.length };
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
  // Phase 316.5: every alert grader, the composer, the preflight and the tap reader.
  const alerts = alertsSelfTest();
  console.log(
    alerts.bad === 0
      ? `${TAG} alerts self-test PASS: ${String(alerts.total)} cases (the composer, the override's preflight, N0 to N11, D2+, F1+ and ND) graded as they must be.`
      : `${TAG} alerts self-test FAIL: ${String(alerts.bad)} of ${String(alerts.total)} case(s) graded wrongly.`
  );
  process.exit(bad === 0 && alerts.bad === 0 ? 0 : 1);
}
// NOT `--self-test`: build/cdp-target.mjs, imported above, runs ITS fixtures
// and exits when argv holds that exact word.
if (process.argv.includes('--grader-self-test')) {
  // Phase 332's clause first, on its own cases; selfTest() exits.
  if (!nameQuestionsSelfTest(PUBLIC_NAME)) {
    console.log(`${TAG} self-test FAIL: the name-question clause (N1).`);
    process.exit(1);
  }
  selfTest();
}
preflight();

const doorChildren = new Set();
let relay = null;
let watch = null;
let preflightOk = false;
let ran = false;
let appText = '';
let shimPid = 0;
let appPid = 0;

/** Phase 314's APNs stand-in, in this process on 127.0.0.1. Closed in the `finally`. */
let apns = null;
/**
 * Everything the Phase 316.5 arms read. `pem` is held in memory only so N1 and
 * N10 can look for it; the report never carries it, and the key FILE is
 * deleted in the `finally`.
 */
const alerts = {
  pem: null,
  publicPem: null,
  pemLines: [],
  preflight: false,
  armed: false,
  verdicts: {},
  readings: {},
  deliveries: [],
  lines: {},
  alertSessionId: null,
  alertName: null,
  blockedAtN3: null,
  recordedBody: null,
  composedForAlertSession: null,
  gone404: false
};
/** app.log, read without blocking (pitfall b: three stand-ins serve in this process). */
const appLogText = async () => {
  try {
    return await readFileAsync(join(PROFILE, 'logs', 'app.log'), 'utf8');
  } catch {
    return '';
  }
};
const countLogLines = async (needle) => (await appLogText()).split('\n').filter((l) => l.includes(needle)).length;
/** Every file under `dir`, with its bytes, for N1's look at what the Mac sealed. */
const filesUnder = async (dir) => {
  const out = [];
  const walk = async (d) => {
    let names = [];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const name of names) {
      const path = join(d, name);
      let st;
      try {
        st = lstatSync(path);
      } catch {
        continue;
      }
      if (st.isDirectory()) await walk(path);
      else if (st.isFile()) {
        try {
          out.push({ name: relative(dir, path), bytes: await readFileAsync(path) });
        } catch {
          /* gone between the listing and the read */
        }
      }
    }
  };
  await walk(dir);
  return out;
};
/** A stand-in record as the report may carry it: digests, lengths and headers, never a token, a JWT or a body. */
const redactedRecord = (rec) => ({
  seq: rec.seq,
  origin: rec.origin,
  phone: tokenName(rec.token),
  status: rec.status,
  reason: rec.reason,
  topic: rec.headers?.['apns-topic'] ?? null,
  pushType: rec.headers?.['apns-push-type'] ?? null,
  priority: rec.headers?.['apns-priority'] ?? null,
  bodyBytes: rec.bodyBytes,
  bodySha256: shaHex(rec.body ?? ''),
  authorizationSha256: rec.authorizationDigest,
  verifies: rec.jwt?.verifies ?? false
});
/** A delivery as the report may carry it. */
const redactedDelivery = (d) => ({ arm: d.arm, readySeq: d.readySeq, code: d.code, bytes: d.bytes ?? null, sha: d.sha ?? null, why: d.why ?? null });

try {
  rmSync(RUN, { recursive: true, force: true });
  for (const dir of [HOME, HARNESS, PROFILE, WORK, BIN, XCODE, join(HOME, '.claude')]) mkdirSync(dir, { recursive: true });
  standin = makeStandin({ dir: STANDIN_DIR, scenario: { ...DEFAULT_SCENARIO } });
  const pre = preflightStandin(standin, standin.binPath);
  preflightOk = pre.ok;
  if (!pre.ok) {
    arm('the run', null, `the Tailscale preflight refused the launch: ${pre.problems.join('; ')}`);
    throw new Error('port taken');
  }
  watch = watchForRealTailscale({ roots: () => [shimPid, appPid].filter((p) => p > 0), everyMs: 1_000 });
  dns = await makeDnsStandin({ name: PUBLIC_NAME, mode: 'record' });
  relay = await startRelay();

  // ---- Phase 316.5: the scratch key, Apple's stand-in and the Mac's override --
  // THE KEY is made here and deleted in the `finally` whatever happened. It is
  // this run's own; his is never read.
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  alerts.pem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  alerts.publicPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  alerts.pemLines = alerts.pem.split('\n').filter((l) => l.length >= 16 && !l.startsWith('-----'));
  mkdirSync(ALERTS_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(KEY_FILE, alerts.pem, { mode: 0o600 });
  // The `finally` below deletes it. This is the net for a run that ends by a
  // signal the helpers answer with process.exit, which skips a `finally`.
  process.once('exit', () => rmSync(KEY_FILE, { force: true }));
  // APPLE is the stand-in, in this process, seeded with the phone app's topic
  // and each token that may reach it, with the environment it was minted in.
  apns = await startApnsStandIn({ publicKey: keyPair.publicKey, topic: TOPIC, devices: SEEDED });
  const override = { origins: apns.origins, keyFile: KEY_FILE };
  const overrideWhy = alertsOverrideRefusal(override, HARNESS);
  alerts.preflight = overrideWhy === null;
  if (overrideWhy !== null) {
    arm('the run', null, `the alerts preflight refused the launch: ${overrideWhy}`);
    throw new Error('port taken');
  }
  writeFileSync(ALERTS_JSON, `${J(override)}\n`, { mode: 0o600 });

  // ---- B1: the two builds, before anything serves ------------------------
  const built = await xcodebuildRun({
    label: 'shipping',
    scratch: XCODE,
    derivedDataPath: DD,
    args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
  });
  report.readings.builds = { shipping: { code: built.code, ms: built.ms } };
  arm('B1 the app builds for the Simulator, ad hoc with no team', built.code === 0, `the shipping project exited ${String(built.code)} in ${String(built.ms)} ms`);
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
  // Phase 332: the name check's servers are the loopback stand-in's, or nothing launches.
  const dnsPre = await dns.preflight(dns.servers);
  dnsPreflights.push(dnsPre.ok && loopbackOnlyServers(dns.servers));
  if (!dnsPre.ok) {
    arm('the run', null, `the DNS preflight refused the launch: ${dnsPre.problems.join('; ')}`);
    throw new Error('port taken');
  }
  writeQuietAgents(PROFILE);
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
        // THE STAND-IN TAILSCALE (Phase 330). A development build honours
        // this and runs it; a packaged one ignores it. The door itself binds
        // 127.0.0.1 and nothing else.
        GMUX_TAILSCALE_BIN: standin.binPath,
        // THE DNS STAND-IN (Phase 332): the name check asks it and nothing else.
        [NAME_SERVERS_VAR]: dns.servers,
        // APPLE'S STAND-IN (Phase 316.5): the alerts' two origins and the
        // scratch key file, under the push seam's own refusals. A harness
        // launch without it can reach nothing: its sender refuses Apple's
        // hosts before any socket.
        GMUX_HARNESS_ALERTS: ALERTS_DIR,
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
      shimPid = handle.pid;
      try {
        const cdp = await attach(150_000);
        try {
          appPid = handle.appPid();
        } catch {
          appPid = 0;
        }
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
        arm(
          'D1 the door switched on, confirmed and published through the stand-in',
          opened.ok && listening.ok && listening.status.publicName === PUBLIC_NAME && listening.status.publicPort === 8443 && forwarderPort() > 0,
          `${opened.why ?? ''}; status ${J({ state: listening.status?.state, publicName: listening.status?.publicName, publicPort: listening.status?.publicPort })}; forwarder ${forwarderPort() > 0 ? 'up' : 'NOT up'}`
        );
        if (!listening.ok || forwarderPort() === 0) return;

        // ---- N1 (Phase 316.5): the key, through the bridge ----------------
        // `choosePushKey` in a harness launch answers the override's key file
        // with no panel; the name, the read and the keep are the shipping path.
        {
          const bridge = await pocket(cdp, 'choosePushKey');
          const keyed = await waitStatus(cdp, (s) => s.pushKeyId === KEY_ID, 15_000);
          const sealed = await filesUnder(SEALED_KEY_DIR);
          const v = gradeKey({ bridge, statusKeyId: keyed.status?.pushKeyId ?? null, sealed, pemText: alerts.pem, pemLines: alerts.pemLines });
          alerts.readings.N1 = { kept: bridge.ok ? bridge.value?.kept ?? null : null, refused: bridge.ok ? bridge.value?.refusal !== null : null, pushKeyId: keyed.status?.pushKeyId ?? null, sealedFiles: sealed.map((f) => ({ name: f.name, bytes: f.bytes.length })) };
          arm('N1 the push key chosen through the bridge is kept sealed, and the sheet reads its id', v.ok, v.said);
        }

        // ---- D2: the node reader pairs, window 1 --------------------------
        const w1 = await openWindow(cdp);
        if (!w1.ok) {
          arm('D2 the node reader pairs', false, w1.why);
          return;
        }
        const reader = makePhone('p316 reader', w1.offer.dx);
        /** The reader's door: the CURRENT forwarder, the code's name and pin. */
        const readerDoor = {
          get port() {
            return forwarderPort();
          },
          name: w1.offer.host,
          publicPort: w1.offer.port,
          pin: w1.offer.fp
        };
        let allowReader = { ok: false };
        // Phase 316.5: the reader presents a PRODUCTION token (`apt`, `ape`),
        // and the lines the Mac asks Allow over are kept for D2+.
        let readerLines = null;
        const paired = await pairThrough(readerDoor, w1.offer, reader, {
          tries: 20,
          everyMs: 500,
          sealOptions: { pushToken: TOKENS.reader, pushEnvironment: 'production' },
          between: async () => {
            const sheet = await pocket(cdp, 'pairingState');
            if (sheet.ok && sheet.value.state === 'presented') {
              readerLines = sheet.value.lines;
              allowReader = await pocket(cdp, 'allowPhone', { linesRead: sheet.value.lines, hashRead: sheet.value.hash });
            }
          }
        });
        await pocket(cdp, 'cancelPairing');
        const readerCheck = await signedGet(reader, readerDoor, '/v1/blocked');
        arm('D2 the node reader pairs through the forwarder, takes its certificate and reads with it', paired.ok && allowReader.ok && readerCheck.status === 200, `pairing answered ${J(paired.words)}${paired.ok ? '' : ` (${paired.why})`}, Allow ${allowReader.ok ? 'pressed' : 'FAILED'}, first read ${String(readerCheck.status)}`);
        {
          const v = gradeReaderLine({ lines: readerLines, label: reader.label, token: TOKENS.reader });
          arm('D2+ the reader\'s production address is in the lines the Mac asked Allow over', v.ok, v.said);
        }
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

        // ---- N2 (Phase 316.5): alerts on, and Allow through the sheet's own lines
        // Step one: D0's session must be waiting in main BEFORE alerts arm, or
        // "it was not announced" says nothing. It runs AFTER N11's drive on the
        // order Simulator (research 136: that phone must meet a Mac that holds
        // the key with its switch still off), so it is a function called once.
        const runN2 = async () => {
          const askWaiting = (await mainSessions(cdp)).find((s) => s.name === N.ask)?.status === 'needs_input';
          const from = apns.requests.length;
          const on = await pocket(cdp, 'setPushAlerts', { on: true });
          const onRead = on.ok ? await waitStatus(cdp, (s) => s.pushAlerts === true, 15_000) : { ok: false, status: null };
          // Turning alerts on moves a confirmed field: the sheet's own lines,
          // as they now stand, are what Allow is pressed over.
          const confirmed = onRead.ok ? await confirmListening(cdp) : { ok: false, why: on.ok ? 'pushAlerts never read on' : on.error };
          for (let i = 0; i < 40 && (await countLogLines('phone alerts armed')) === 0; i += 1) await sleep(500);
          const quietFrom = Date.now();
          await sleep(QUIET_AFTER_ARM_MS);
          const after = await pocket(cdp, 'status');
          const reading = {
            askWaiting,
            confirmed: confirmed.ok && after.ok && after.value.confirmState === 'confirmed',
            confirmWhy: confirmed.why ?? null,
            pushAlerts: after.ok ? after.value.pushAlerts : null,
            armedLines: await countLogLines('phone alerts armed'),
            requests: apns.requests.length - from,
            waitedMs: Date.now() - quietFrom
          };
          alerts.readings.N2 = reading;
          alerts.armed = reading.armedLines > 0;
          const v = gradeArmed(reading);
          arm('N2 alerts on and allowed: armed once, and a wait that began before is not announced', v.ok, v.said);
        };

        /**
         * One pairing of the app on `sim`, and everything that follows it. The
         * reactions press the Mac's own buttons when the UI test says so.
         */
        const pairAndRead = async (sim, steps, label, opts = {}) => {
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
          const statusBefore = (await pocket(cdp, 'status')).value ?? null;
          const phonesBefore = (statusBefore?.phones ?? []).map((p) => p.id);
          // Research 136: whether the Mac could send as this window opened
          // (a key kept AND the switch on), which decides whether the phone
          // may be asked at all. Null when the status could not be read.
          const canSend = statusBefore === null ? null : macCanSend(statusBefore);
          // The phone's word on iOS's question: `answered`, or `asked:false`.
          // Allow waits for it (NOTIFICATIONS_SETTLE_MS at most).
          let settleNotifications = () => undefined;
          const notificationsSettled = new Promise((done) => {
            settleNotifications = done;
          });
          let allowPressedAt = null;
          let settledBeforeAllow = null;
          // Phase 316.5. The lines the Mac asked Allow over, the new phone's row
          // as the Mac lists it once paired, how many alert lines the door held
          // before this phone, and every body delivered for a ready line.
          let macLines = null;
          let macLabel = null;
          let newPhoneRow = null;
          const alertLinesBefore = alertLines(statusBefore?.confirmLines ?? []).length;
          const queue = [...(opts.queue ?? [])];
          const deliveries = [];
          // THE MAC'S PAIRING, SAMPLED (N0): each sample is stamped with the
          // moment its read BEGAN, so a `waiting` it reads was true at or after
          // that moment. It stops once the phone reads the list.
          const samples = [];
          let sampling = true;
          const sampler = (async () => {
            while (sampling) {
              const at = Date.now();
              const v = await pocket(cdp, 'pairingState');
              samples.push({ at, state: v.ok ? v.value?.state ?? null : null });
              await sleep(100);
            }
          })();
          let result;
          try {
            result = await drive(sim, {
              test: { id: UI_TEST },
              label,
              env: {
                P316_PAYLOAD: w.payload,
                P316_STEPS: steps.join(','),
                P316_WAIT_S: '150',
                P330_DOOR_ENDPOINT: `127.0.0.1:${String(relay.port)}`,
                ...(opts.pushToken === undefined ? {} : { P316_PUSH_TOKEN: opts.pushToken }),
                ...(opts.notifications === undefined ? {} : { P316_NOTIFICATIONS: opts.notifications })
              },
              onEvent: async (event) => {
                if (event.step === 'notifications' && (event.answered !== undefined || event.asked === false)) settleNotifications(event);
                if (event.step === 'fingerprint') {
                  drawnFingerprint = String(event.text ?? '');
                  // ALLOW WAITS FOR THE PHONE'S WORD ON iOS's QUESTION (Phase
                  // 316.5, research 136). The phone is asked only once it has
                  // heard from the Mac that it can send, and it presents its
                  // address only after the answer, so an Allow pressed at the
                  // first `presented` would pair it before its address reached
                  // the Mac. A person answers iOS before reaching for the Mac.
                  const settled = await Promise.race([notificationsSettled, sleep(NOTIFICATIONS_SETTLE_MS).then(() => null)]);
                  settledBeforeAllow = settled === null ? null : settled.answered ?? (settled.asked === false ? 'not asked' : null);
                  // Allowed with a token in hand: wait for the Mac's lines to
                  // name THAT address, bounded; anything else is pressed over
                  // the lines as they stand, and the graders say what they held.
                  const want = settled?.answered === 'allow' && typeof opts.pushToken === 'string' ? `device ${deviceDigest(opts.pushToken)}` : null;
                  const addressBy = Date.now() + ADDRESS_LINE_WAIT_MS;
                  for (let i = 0; i < 120; i += 1) {
                    const v = await pocket(cdp, 'pairingState');
                    if (v.ok && v.value.state === 'presented') {
                      const named = want === null || alertLines(v.value.lines).some((l) => l.endsWith(want));
                      if (!named && Date.now() < addressBy) {
                        await sleep(500);
                        continue;
                      }
                      macFingerprint = v.value.fingerprint;
                      macLines = v.value.lines ?? null;
                      macLabel = v.value.label ?? null;
                      if (fingerprintDigits(macFingerprint) === fingerprintDigits(drawnFingerprint) && fingerprintDigits(drawnFingerprint).length === 24) {
                        allowPressedAt = Date.now();
                        const a = await pocket(cdp, 'allowPhone', { linesRead: v.value.lines, hashRead: v.value.hash });
                        allowed = a.ok && a.value.allowed === true;
                      }
                      break;
                    }
                    await sleep(500);
                  }
                }
                if (event.step === 'list-before') {
                  sampling = false;
                  // Paired: the app's first SIGNED read succeeded. Shut the
                  // window so "allowed" is answered to nobody else (P2b), and read
                  // BEFORE the app's refresh, so the two reads bracket it and an
                  // age that ticks over a minute in between is one of them.
                  await pocket(cdp, 'cancelPairing');
                  readsAroundList.push(await readBlocked());
                  const st = (await pocket(cdp, 'status')).value ?? null;
                  newPhoneRow = (st?.phones ?? []).find((ph) => !phonesBefore.includes(ph.id)) ?? null;
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
                if (event.step === 'ready-for-alert') {
                  // ONE queued body per ready line, in order (Phase 316.5).
                  const readySeq = Number(event.seq);
                  const item = queue.shift() ?? null;
                  if (item === null) {
                    deliveries.push({ arm: null, readySeq, code: null, why: 'nothing was queued for this ready line' });
                    return;
                  }
                  let body = null;
                  let why = null;
                  try {
                    body = await item.prepare();
                  } catch (err) {
                    why = String(err?.message ?? err);
                  }
                  if (body === null) {
                    deliveries.push({ arm: item.arm, readySeq, code: null, why: why ?? 'there was nothing to deliver' });
                    return;
                  }
                  const sent = await sim.push(BUNDLE_ID, body).catch((err) => ({ code: -1, stderr: String(err?.message ?? err) }));
                  deliveries.push({ arm: item.arm, readySeq, code: sent.code, bytes: Buffer.byteLength(body), sha: shaHex(body).slice(0, 12), body, why: sent.code === 0 ? null : String(sent.stderr ?? '').trim().slice(0, 200) });
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
          } finally {
            sampling = false;
            await sampler;
          }
          if (readsAroundList.length > 0) readsAroundList.push(await readBlocked());
          // The phone this run just paired, as the Mac lists it, for M1: the
          // pins its handshakes must have presented.
          const statusAfter = (await pocket(cdp, 'status')).value ?? null;
          const phonesAfter = (statusAfter?.phones ?? []).map((p) => p.id);
          if (newPhoneRow === null) newPhoneRow = (statusAfter?.phones ?? []).find((ph) => !phonesBefore.includes(ph.id)) ?? null;
          // A body queued for a ready line that never came is said by name.
          for (const item of queue) deliveries.push({ arm: item.arm, readySeq: Number.NaN, code: null, why: 'the UI test printed no ready-for-alert for it' });
          return {
            ok: true,
            result,
            macFingerprint,
            drawnFingerprint,
            allowed,
            readsAroundList: readsAroundList.filter((r) => r !== null),
            removed,
            simPhoneId: simPhoneId ?? phonesAfter.find((id) => !phonesBefore.includes(id)) ?? null,
            sessionAround,
            samples,
            macLines,
            macLabel,
            newPhoneRow,
            alertLinesBefore,
            deliveries,
            canSend,
            allowPressedAt,
            settledBeforeAllow
          };
        };

        /** K1 on `sim`: no window's one-shot secret in anything the app wrote (SPEC §6.4 (p)). */
        const secretScan = async (sim, tag) => {
          const container = await sim.simctl('get_app_container', BUNDLE_ID, 'data');
          const roots = [container.code === 0 ? container.stdout.trim() : null, join(sim.dataPath(), 'Library', 'Keychains')].filter((p) => p !== null && p !== '');
          const scanned = roots.map((r) => filesHolding(r, secretNeedles()));
          const hits = scanned.flatMap((s) => s.hits);
          arm(`K1 ${tag} no window's one-shot secret is in anything the app wrote`, SECRETS.length > 0 && scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) in the app's container and the device keychain read for ${String(SECRETS.length)} secret(s); ${hits.length === 0 ? 'none holds one' : `found in ${J(hits)}`}`);
        };

        /**
         * M1: every signed read the app made presented its client identity. The
         * door admits no connection whose client key is not a paired phone's, so
         * a read ANSWERED 200 was a read with the identity; this counts the
         * handshakes the Mac refused for this run in app.log, which must hold no
         * `no-certificate` or `unknown-key` line from before the Remove.
         */
        const identityHeld = (run) => {
          const log = (() => {
            try {
              return readFileSync(join(PROFILE, 'logs', 'app.log'), 'utf8');
            } catch {
              return '';
            }
          })();
          return { paired: run.allowed && run.readsAroundList.length > 0, refusedUnknownKey: log.split('\n').filter((l) => l.includes('refused a connection at the door: unknown-key')).length, refusedNoCertificate: log.split('\n').filter((l) => l.includes('refused a connection at the door: no-certificate')).length };
        };

        // ==================================================================
        // Phase 316.5: the alerts' own steps on the Mac
        // ==================================================================

        /**
         * STEP ONE of every arm that needs a block: a new session whose fake
         * `claude` prints the committed dialog, and main's own reading of it.
         * It answers the session's id; `mainBlocked` is true only once main
         * reads it `needs_input`, and an arm that finds it false is UNREADABLE.
         */
        const blockNew = async (name) => {
          writeFileSync(NEXT, 'ask', 'utf8');
          await cdpEval(cdp, `window.__gmuxP202.createSession(${J(name)}, 'claude').then(() => true).catch(() => false)`);
          let found = null;
          for (let i = 0; i < 90; i += 1) {
            found = (await mainSessions(cdp)).find((x) => x.name === name) ?? null;
            if (found?.status === 'needs_input') break;
            await sleep(1_000);
          }
          rmSync(NEXT, { force: true });
          return { mainBlocked: found?.status === 'needs_input', sessionId: found?.id ?? null };
        };

        /**
         * N3, run when the order Simulator's UI test says it is ready for the
         * first alert: a new session blocks, and the engine must tell BOTH
         * phones, each at its own environment's origin. The requests are read
         * after the engine's coalescing window and three seconds more, so a
         * stray send lands inside the reading; the reader's `/v1/blocked` is
         * read at once after, and this file composes the alert from it.
         */
        const sendN3 = async () => {
          const from = apns.requests.length;
          const block = await blockNew(N.alert);
          alerts.alertSessionId = block.sessionId;
          let requests = [];
          let answer = null;
          if (block.mainBlocked) {
            for (let i = 0; i < 60 && apns.requests.length - from < 2; i += 1) await sleep(500);
            await sleep(3_000);
            requests = apns.since(from);
            answer = await readBlocked();
          }
          const rows = (answer?.rows ?? []).filter((r) => r.machine === null);
          const row = rows.find((r) => r.sessionId === block.sessionId) ?? null;
          const composed = row === null ? null : composeSingleAlert(row, rows.length);
          alerts.blockedAtN3 = answer;
          alerts.alertName = row?.name ?? null;
          alerts.composedForAlertSession = composed;
          alerts.recordedBody = requests.find((x) => x.origin === 'development' && x.token === TOKENS.app && x.status === 200)?.body ?? null;
          alerts.verdicts.N3 = gradeSent({ mainBlocked: block.mainBlocked, sessionId: block.sessionId, composed, requests, appToken: TOKENS.app, readerToken: TOKENS.reader, topic: TOPIC });
          alerts.readings.N3 = {
            mainBlocked: block.mainBlocked,
            requests: requests.map(redactedRecord),
            blockedRows: rows.length,
            composedBytes: composed === null ? null : Buffer.byteLength(composed),
            composedSha256: composed === null ? null : shaHex(composed),
            recordedSha256: alerts.recordedBody === null ? null : shaHex(alerts.recordedBody)
          };
          return alerts.recordedBody;
        };

        /**
         * N6, run when the UI test says it is ready for the third alert: the
         * alerted session is ended and removed on the Mac, and the door must
         * answer 404 for it before anything is delivered. The body is this
         * file's own composition of the alert N3 sent (byte for byte the
         * recorded one when N3 passed). A session the door still answers for
         * is delivered all the same, so the drive moves on, and N6 reads
         * UNREADABLE.
         */
        const goneN6 = async () => {
          const id = alerts.alertSessionId;
          if (id === null) return null;
          await cdpEval(cdp, `window.gmux.sessions.kill(${J(id)}).catch(() => 0).then(() => window.gmux.sessions.discard(${J(id)}).catch(() => 0)).then(() => true)`);
          let status = null;
          for (let i = 0; i < 30; i += 1) {
            status = (await signedGet(reader, readerDoor, `/v1/session?id=${encodeURIComponent(id)}`)).status;
            if (status === 404) break;
            await sleep(1_000);
          }
          alerts.gone404 = status === 404;
          alerts.readings.N6 = { doorAnswered: status, stillInMain: (await mainSessions(cdp)).some((x) => x.id === id) };
          return alerts.composedForAlertSession;
        };

        /** N7's count body: the count shape over the rows the door holds now. */
        const countN7 = async () => {
          const rows = ((await readBlocked())?.rows ?? []).filter((r) => r.machine === null);
          return composeCountAlert(rows.length > 0 ? rows.map((r) => r.name) : [N.ask], Math.max(1, rows.length));
        };
        /** N7's hostile body: the single shape, naming a session id no door could hold. */
        const hostileN7 = async () => composeSingleAlert({ sessionId: HOSTILE_TAP_SESSION, name: 'p316-x', statusLabel: 'needs input', project: 'p316', agentLabel: 'Claude Code', machine: null }, 1);

        /**
         * F1+'s and ND's body: this file's composition of a single alert for a
         * session the door holds now, from the door's own answer for it. The
         * name the tap must title the session with is kept beside it.
         */
        const composeLive = (slot) => async () => {
          if (talk === undefined) return null;
          const d = (await readJson(`/v1/session?id=${encodeURIComponent(talk.id)}`))?.session ?? null;
          alerts.readings[slot] = { name: d?.name ?? null, sessionId: talk.id };
          return d === null ? null : composeSingleAlert(d, 1);
        };

        /** A delivery's tap, or an empty reading naming the arm when the step never came. */
        const tapOf = (taps, armId) => taps.find((t) => t.arm === armId) ?? { arm: armId, delivery: null, ready: null, banner: null, dump: null, before: null };

        // ==================================================================
        // iOS 26.3: the order
        // ==================================================================
        if (!ARMS.has('order')) await runN2();
        if (ARMS.has('order')) {
          await withSimulator({ label: 'p316-order', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-order'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // ---- N11 (research 136): a Mac that holds the key with its alert
            // switch OFF cannot send, so the phone is never asked. The FIRST
            // drive on this Simulator, while iOS's answer is still not
            // determined: on a device that had already answered, "not asked"
            // would say nothing, because iOS asks only once.
            {
              const noSendSteps = ['pair', 'list', `relaunch-token:${TOKENS.other}`];
              const run = await pairAndRead(sim, noSendSteps, 'no-send', { pushToken: TOKENS.nosend, notifications: 'allow' });
              if (!run.ok) {
                arm('N11 a phone pairing with a Mac that cannot send is never asked and never told to pair again', false, run.why);
              } else {
                const ev = run.result.events;
                const n = notificationEvents(ev);
                alerts.readings.N11 = {
                  canSend: run.canSend,
                  asked: n.asked?.asked ?? null,
                  answered: n.answered?.answered ?? null,
                  settledBeforeAllow: run.settledBeforeAllow,
                  alertLinesBefore: run.alertLinesBefore,
                  alertLines: alertLines(run.macLines ?? []).length,
                  row: run.newPhoneRow?.alerts ?? null,
                  relaunches: dumps(ev, 'relaunch').length,
                  lines: ev.length,
                  xcodebuild: run.result.code
                };
                const v = gradeNoSend({
                  canSend: run.canSend,
                  events: ev,
                  allowed: run.allowed,
                  macLines: run.macLines,
                  alertLinesBefore: run.alertLinesBefore,
                  token: TOKENS.nosend,
                  phoneRow: run.newPhoneRow,
                  alive: aliveOf(ev),
                  alertWords: ALERT_WORDS
                });
                arm('N11 a phone pairing with a Mac that cannot send is never asked and never told to pair again', v.ok, v.said);
              }
            }
            await runN2();
            {
              // Phase 316.5: the alert steps sit between the conversation and
              // the Remove, in the SPEC's order (§7.4): N4, N5, N6, N7 twice,
              // then N8's two relaunches. One body is queued per ready line.
              // The fix round taps N6 from the LIST (`back` first: N5 leaves
              // the very session N6 names on screen, where a tap changes
              // nothing) and N6b from ANOTHER session's screen (`visit`).
              const steps = [
                'pair',
                'list',
                ...(talk !== undefined ? [`open:${talk.id}`, 'conversation', 'first'] : []),
                'alert',
                'alert-cold',
                'back',
                'alert-gone',
                ...(talk !== undefined ? [`visit:${talk.id}`, 'alert-gone'] : []),
                'alert-list',
                'alert-list',
                `relaunch-token:${TOKENS.other}`,
                `relaunch-token:${TOKENS.app}`,
                'unpaired'
              ];
              const queue = [
                { arm: 'N4', prepare: sendN3 },
                { arm: 'N5', prepare: async () => alerts.recordedBody },
                { arm: 'N6', prepare: goneN6 },
                ...(talk !== undefined ? [{ arm: 'N6b', prepare: async () => (alerts.gone404 ? alerts.composedForAlertSession : null) }] : []),
                { arm: 'N7a', prepare: countN7 },
                { arm: 'N7b', prepare: hostileN7 }
              ];
              const run = await pairAndRead(sim, steps, 'order', { pushToken: TOKENS.app, notifications: 'allow', queue });
              if (run.ok) alerts.deliveries.push(...run.deliveries);
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
              // N0 (Phase 316.5): iOS asked after the fingerprint, before the
              // phone presented, and the Mac holds the address it presented.
              {
                const n = notificationEvents(ev);
                alerts.readings.N0 = { canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, samples: run.samples.length, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null };
                const v = gradeAsked({ canSend: run.canSend, events: ev, samples: run.samples, macLines: run.macLines, label: run.macLabel, token: TOKENS.app, phoneRow: run.newPhoneRow });
                arm('N0 the Mac can send, so the phone asks for notifications after the fingerprint and before it is allowed, and the Mac holds its development address', v.ok, v.said);
              }
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
              // ---- N3 to N8 (Phase 316.5), in the SPEC's order ------------
              {
                const taps = tapReadings(ev, run.deliveries);
                const alive = aliveOf(ev);
                const name = alerts.alertName ?? N.alert;
                const n3 = alerts.verdicts.N3 ?? verdict(null, 'the UI test printed no ready line for the first alert, so no session was made to block');
                arm('N3 a new wait is sent once to each phone, at its own environment\'s origin, signed, and byte for byte this file\'s composition', n3.ok, n3.said);
                const n4 = gradeTap({ ...tapOf(taps, 'N4'), name, cold: false });
                arm('N4 a tap on the alert opens the session it names', n4.ok, n4.said);
                const n5 = gradeTap({ ...tapOf(taps, 'N5'), name, cold: true });
                arm('N5 a tap on the alert with the app terminated launches it onto that session', n5.ok, n5.said);
                const n6 = gradeGone({ ...tapOf(taps, 'N6'), gone404: alerts.gone404, word: MAC.noSuchSession, alive, from: 'list' });
                arm('N6 a tap from the list on an alert for a session the Mac removed draws the Mac\'s own sentence on the list', n6.ok, n6.said);
                const n6b = talk === undefined ? verdict(null, 'no conversation session was made, so there was no other session to tap from') : gradeGone({ ...tapOf(taps, 'N6b'), gone404: alerts.gone404, word: MAC.noSuchSession, alive, from: 'session' });
                arm('N6b the same tap from another session\'s screen draws the Mac\'s own sentence on the list', n6b.ok, n6b.said);
                const n7 = gradeListTaps({ taps: [tapOf(taps, 'N7a'), tapOf(taps, 'N7b')], alive });
                arm('N7 a count alert and an alert naming ../x each open the list and say nothing', n7.ok, n7.said);
                const relaunches = dumps(ev, 'relaunch');
                alerts.readings.N8 = { relaunches: relaunches.length, lines: relaunches.map((d) => el(d, 'list-alerts-line')?.label ?? null) };
                const n8 = gradeRelaunch({ dumps: relaunches });
                arm('N8 a changed alert address draws "Pair again to get alerts.", and the paired one draws nothing', n8.ok, n8.said);
                alerts.readings.taps = taps.map((t) => ({ arm: t.arm, delivered: t.delivery?.code ?? null, banner: t.banner === null ? 'no line' : t.banner.label === null ? 'none found' : `${String(t.banner.label).length} characters`, dump: t.dump?.name ?? null, cold: t.ready?.cold ?? null }));
              }
              // R1
              const unpaired = lastDump(ev, 'unpaired');
              const line = unpaired === null ? null : (unpaired.elements ?? []).find((e) => e.label === COPY.notPaired) ?? null;
              arm('R1 Remove on the Mac, and the app draws its unpaired line', run.removed?.ok === true && unpaired !== null && el(unpaired, 'screen-pairing') !== null && line !== null && aliveOf(ev) === RUNNING_FOREGROUND, `Remove ${run.removed === null ? 'never pressed (no ready-for-remove line)' : run.removed.ok ? 'pressed' : 'FAILED'}, the door ${run.removed?.reopened ? 'confirmed again' : 'NOT reopened'}; the app ${unpaired === null ? 'drew no unpaired screen' : line === null ? 'drew the pairing screen without the line' : 'drew the line'}; state ${J(aliveOf(ev))}`);
              // M1: the app's reads before the Remove all carried its identity:
              // none was refused for a missing or unknown client key, and the
              // Remove is what made its next connection unknown.
              const held = identityHeld(run);
              report.readings.m1 = held;
              arm('M1 the app presented its client identity on every read, through the stand-in\'s forwarder', held.paired && held.refusedNoCertificate === 0, `paired and read ${held.paired ? 'yes' : 'NO'}; app.log holds ${String(held.refusedNoCertificate)} no-certificate and ${String(held.refusedUnknownKey)} unknown-key refusal line(s) (unknown-key is the Remove's own)`);
            }
            await secretScan(sim, 'iOS 26.3');
          });
        }

        // ==================================================================
        // N9 (Phase 316.5): alerts off, and a new wait sends nothing
        // ==================================================================
        {
          // Alerts must be ARMED when this begins, or a disarm says nothing.
          // R1's Remove moved the door's hash, so they disarmed and re-armed
          // around its re-confirm; what counts is the lines this step GAINS.
          const armedBefore = await countLogLines('phone alerts armed');
          const disarmedBefore = await countLogLines('phone alerts disarmed');
          const from = apns.requests.length;
          const off = await pocket(cdp, 'setPushAlerts', { on: false });
          if (off.ok) await waitStatus(cdp, (s) => s.pushAlerts === false, 15_000);
          for (let i = 0; i < 40 && (await countLogLines('phone alerts disarmed')) === disarmedBefore; i += 1) await sleep(500);
          // The switch is a confirmed field: the door closes until it is
          // confirmed again, which the floor and the denied phone need.
          const again = await confirmListening(cdp);
          // Step one: the new wait must be read by main.
          const block = await blockNew(N.quiet);
          const quietFrom = Date.now();
          if (block.mainBlocked) await sleep(QUIET_AFTER_OFF_MS);
          const after = await pocket(cdp, 'status');
          const reading = {
            armedAtStart: armedBefore > disarmedBefore,
            armedBefore,
            disarmedBefore,
            reconfirmed: again.ok,
            mainBlocked: block.mainBlocked,
            pushAlerts: after.ok ? after.value.pushAlerts : null,
            disarmed: (await countLogLines('phone alerts disarmed')) - disarmedBefore,
            requests: apns.requests.length - from,
            waitedMs: Date.now() - quietFrom
          };
          alerts.readings.N9 = reading;
          const v = gradeOff(reading);
          arm('N9 alerts off disarms once, and a new wait sends nothing for 15 s', v.ok, v.said);
        }

        // ---- Alerts back on (research 136) ------------------------------
        // The floor phone and the denied phone must each be ASKED, and a
        // phone is asked only when the Mac can send. So the switch goes back
        // on and is confirmed through the sheet's own lines, and the armed
        // line it gains is read. Not an arm of its own: F1+ and ND read the
        // Mac's state as their window opens and are UNREADABLE when it
        // could not send. Nothing new blocks while they run, so the engine,
        // which seeds silently, sends nothing here.
        if (ARMS.has('floor') || ARMS.has('deny')) {
          const armedBefore = await countLogLines('phone alerts armed');
          const on = await pocket(cdp, 'setPushAlerts', { on: true });
          const onRead = on.ok ? await waitStatus(cdp, (s) => s.pushAlerts === true, 15_000) : { ok: false };
          const again = onRead.ok ? await confirmListening(cdp) : { ok: false, why: on.ok ? 'pushAlerts never read on' : on.error };
          for (let i = 0; i < 40 && (await countLogLines('phone alerts armed')) === armedBefore; i += 1) await sleep(500);
          const st = (await pocket(cdp, 'status')).value ?? null;
          alerts.readings.rearmed = { on: onRead.ok, confirmed: again.ok, canSend: st === null ? null : macCanSend(st), armedGained: (await countLogLines('phone alerts armed')) - armedBefore };
          say(`alerts back on for the floor and the denied phone: ${J(alerts.readings.rearmed)}`);
        }

        // ==================================================================
        // iOS 18.3: THE FLOOR ARM
        // ==================================================================
        if (ARMS.has('floor')) {
          await confirmListening(cdp);
          await withSimulator({ label: 'p316-floor', runtime: RUNTIME_FLOOR, scratch: join(XCODE, 'sim-floor'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // Phase 316.5: F1+ is the tap on the floor, after F1's pairing.
            const run = await pairAndRead(sim, ['pair', 'list', 'alert'], 'floor', { pushToken: TOKENS.floor, notifications: 'allow', queue: [{ arm: 'F1+', prepare: composeLive('F1+') }] });
            if (run.ok) alerts.deliveries.push(...run.deliveries);
            if (!run.ok) {
              arm('F1 iOS 18.3 pairing', false, run.why);
            } else if (run.result.events.length === 0) {
              arm('F1 iOS 18.3 pairing', null, `the UI test printed no P316 line on iOS ${sim.runtime} (xcodebuild exited ${String(run.result.code)})`);
            } else {
              const listGrade = run.readsAroundList.length === 0 ? ['the node reader read nothing around the list'] : gradeList(lastDump(run.result.events, 'list'), run.readsAroundList);
              arm(`F1 iOS ${sim.runtime}: the fingerprint matches, Allow, the signed read, the list`, fingerprintDigits(run.drawnFingerprint ?? '') === fingerprintDigits(run.macFingerprint ?? 'x') && run.allowed && !Array.isArray(listGrade), Array.isArray(listGrade) ? listGrade.slice(0, 6).join('; ') : `paired and the list agrees; frames ${J(listGrade.frames)}`);
              const t = tapOf(tapReadings(run.result.events, run.deliveries), 'F1+');
              const name = alerts.readings['F1+']?.name ?? null;
              const n = notificationEvents(run.result.events);
              alerts.readings['F1+'] = { ...(alerts.readings['F1+'] ?? {}), canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null };
              const pairing = { canSend: run.canSend, events: run.result.events, samples: run.samples, macLines: run.macLines, label: run.macLabel, token: TOKENS.floor, phoneRow: run.newPhoneRow };
              const v = name === null ? verdict(null, 'the door answered nothing for the live session, so no alert was composed for it') : gradeFloorTap({ pairing, tap: { ...t, name, cold: false } });
              arm(`F1+ iOS ${sim.runtime}: asked and allowed while the Mac can send, and a tap on an alert naming a live session opens it`, v.ok, v.said);
            }
            await secretScan(sim, `iOS ${sim.runtime}`);
          });
        }

        // ==================================================================
        // iOS 26.3: ND, notifications denied (Phase 316.5)
        // ==================================================================
        if (ARMS.has('deny')) {
          await confirmListening(cdp);
          await withSimulator({ label: 'p316-deny', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-deny'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            // Handed a seam token all the same: a phone that denies must
            // present NO address, whatever it could have registered.
            const steps = ['pair', 'list', ...(talk !== undefined ? [`open:${talk.id}`, 'conversation'] : []), 'no-banner:20'];
            const run = await pairAndRead(sim, steps, 'deny', { pushToken: TOKENS.deny, notifications: 'deny', queue: [{ arm: 'ND', prepare: composeLive('ND') }] });
            if (!run.ok) {
              arm('ND notifications denied: it pairs with no address and works', false, run.why);
            } else {
              alerts.deliveries.push(...run.deliveries);
              const d = run.deliveries.find((x) => x.arm === 'ND') ?? null;
              const n = notificationEvents(run.result.events);
              alerts.readings.ND = { canSend: run.canSend, asked: n.asked?.asked ?? null, answered: n.answered?.answered ?? null, settledBeforeAllow: run.settledBeforeAllow, alertLinesBefore: run.alertLinesBefore, alertLines: alertLines(run.macLines ?? []).length, row: run.newPhoneRow?.alerts ?? null, delivered: d?.code ?? null };
              const v = gradeDeny({
                canSend: run.canSend,
                events: run.result.events,
                allowed: run.allowed,
                macLines: run.macLines,
                alertLinesBefore: run.alertLinesBefore,
                token: TOKENS.deny,
                phoneRow: run.newPhoneRow,
                delivery: d === null || d.code === null ? null : { code: d.code },
                alive: aliveOf(run.result.events)
              });
              arm('ND notifications denied: it pairs with no address, the list, a session and its conversation are drawn, and no banner shows', v.ok, v.said);
            }
            await secretScan(sim, 'iOS 26.3, notifications denied,');
          });
        }

        // ==================================================================
        // iOS 26.3: the hostile door
        // ==================================================================
        if (ARMS.has('hostile')) {
          const wanted = ((process.env['P316_HOSTILE'] ?? '').trim() || Object.keys(HOSTILE_ARMS).join(',')).split(',').map((s) => s.trim());
          await withSimulator({ label: 'p316-hostile', runtime: RUNTIME_CURRENT, scratch: join(XCODE, 'sim-hostile'), derivedDataPath: DD, keep: KEEP }, async (sim) => {
            for (const name of wanted) {
              const spec = HOSTILE_ARMS[name];
              if (spec === undefined) continue;
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
                const r = await drive(sim, { test: { id: UI_TEST }, label: `hostile-${name}`, env: { P316_PAYLOAD: door.facts.payload, P316_STEPS: steps.join(','), P316_WAIT_S: '60', P330_DOOR_ENDPOINT: `127.0.0.1:${String(door.facts.port)}` } });
                const alive = aliveOf(r.events);
                const sentence = drawnSentence(r.events);
                const served = door.events.filter((e) => e.kind === 'request').length;
                const verified = door.events.filter((e) => e.kind === 'request' && e.verified !== undefined);
                // (t): every signed read presented the phone's client identity,
                // over TLS 1.3, with the code's name as SNI and in Host.
                const identity = verified.every((e) => e.channelHeld === true && e.tls === 'TLSv1.3' && e.servername === HOSTILE_NAME && e.host === `${HOSTILE_NAME}:${String(HOSTILE_PUBLIC_PORT)}`);
                report.readings[`hostile-${name}`] = { lines: r.events.length, alive, sentence, served, signedReads: verified.length, signaturesHeld: verified.every((e) => e.verified === 'ok'), identity };
                if (r.events.length === 0) {
                  arm(`H ${name}: ${spec.what}`, null, `the UI test printed no P316 line (xcodebuild exited ${String(r.code)})`);
                  continue;
                }
                let ok;
                let said;
                if (name === 'honest') {
                  const t = r.events.find((e) => e.step === 'turns');
                  const drawn = new Set((t?.indexes ?? []).map(Number));
                  ok = alive === RUNNING_FOREGROUND && sentence === null && lastDump(r.events, 'list') !== null && drawn.size === door.facts.turnCount && verified.length > 0 && verified.every((e) => e.verified === 'ok') && identity;
                  said = `the control: the list drawn, ${String(drawn.size)} of ${String(door.facts.turnCount)} turns drawn, ${String(verified.length)} signed read(s) all verified by the door's own reader, ${identity ? 'every one with the client identity and the code\'s name' : 'NOT every one with the client identity and the code\'s name'}, no sentence`;
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
                  ok = alive === RUNNING_FOREGROUND && sentence !== null && !halfDrawn && where && which && honestFirst && identity && (name !== 'wrong-key' || served === 0);
                  said = `${sentence === null ? 'NO sentence drawn' : `a sentence drawn in ${sentence.id} (${String(sentence.length)} characters, Copy.${String(sentence.word ?? 'none of its words')})`}${halfDrawn ? ' BESIDE rows' : ''}${where ? '' : `, NOT in ${String(spec.at)}`}${which ? '' : `, NOT ${String(spec.expect.join(' or '))}`}${spec.list === true ? `; pairing's first read ${honestFirst ? 'answered honestly' : 'NEVER answered honestly'}` : ''}${identity ? '' : '; a signed read WITHOUT the client identity or the code\'s name'}; state ${J(alive)}; the door served ${String(served)} request(s)`;
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
  await relay?.close().catch(() => undefined);
  // ---- Phase 316.5: the verifier's records, then Apple's stand-in and the key --
  // P316_KEEP=1 keeps what the verifier re-derives from (SPEC §7.4, §7.5
  // Method A): the reader's /v1/blocked answer at N3's block, every stand-in
  // record whole (its JWT included, to be verified by another hand), every
  // body delivered to a Simulator, the scratch PUBLIC key and each phone's
  // token with the environment it presented. 0600, under the kept world. The
  // private key is never written here, and its file goes whatever this says.
  if (KEEP && apns !== null) {
    try {
      const dir = join(RUN, 'rederive');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(
        join(dir, 'records.json'),
        `${J(
          {
            topic: TOPIC,
            keyId: KEY_ID,
            publicKeyPem: alerts.publicPem,
            origins: apns.origins,
            phones: Object.fromEntries(Object.entries(TOKENS).map(([name, token]) => [name, { token, environment: SEEDED[token] ?? null }])),
            blockedAtN3: alerts.blockedAtN3,
            composedAtN3: alerts.composedForAlertSession,
            standIn: apns.requests,
            deliveries: alerts.deliveries
          },
          null,
          1
        )}\n`,
        { mode: 0o600 }
      );
      say(`kept the alerts' records for re-derivation at ${join(dir, 'records.json')}`);
    } catch (err) {
      say(`could not keep the alerts' records: ${String(err?.message ?? err)}`);
    }
  }
  if (apns !== null) {
    report.readings.alerts = {
      preflight: alerts.preflight,
      ...alerts.readings,
      standIn: apns.requests.map(redactedRecord),
      connections: { ...apns.connections },
      deliveries: alerts.deliveries.map(redactedDelivery)
    };
    await apns.close().catch(() => undefined);
  }
  // THE SCRATCH KEY, deleted whatever happened and whether the world is kept.
  rmSync(KEY_FILE, { force: true });
  try {
    writeFileSync(STOP, 'stop\n', 'utf8');
  } catch {
    /* the world may already be gone */
  }
  // THE STAND-IN TAILSCALE: every pid it ran as, ended by pid whatever happened.
  const ended = standin === null ? { ended: [], left: [] } : endStandinProcesses(STANDIN_DIR, 1_500);
  const findings = watch?.stop() ?? [];
  const log = standin?.readLog() ?? [];
  const nameRows = dns?.log() ?? [];
  if (dns !== null) await dns.close();
  if (standin !== null) {
    const forbidden = log.filter((e) => e.forbidden === true).length;
    const refusedArgv = log.filter((e) => e.verdict === 'refused').length;
    report.readings.tailscale = { preflight: preflightOk, samples: watch?.samples() ?? 0, realTailscale: findings, notThisRun: watch?.notOurs() ?? [], forbidden, refusedArgv, funnelStarts: log.filter((e) => e.kind === 'funnel').length, ended: ended.ended.length, left: ended.left.length };
    arm(
      'RUN no real Tailscale, nothing forbidden, no stand-in left',
      preflightOk && findings.length === 0 && (watch?.samples() ?? 0) > 0 && forbidden === 0 && refusedArgv === 0 && ended.left.length === 0,
      `preflight ${preflightOk ? 'passed' : 'REFUSED'}; ${String(watch?.samples() ?? 0)} sample(s), ${String(findings.length)} real Tailscale process(es); ${String(forbidden)} forbidden and ${String(refusedArgv)} refused argv at the stand-in; ${String(ended.ended.length)} stand-in pid(s) ended here, ${String(ended.left.length)} left`
    );
  }
  // ---- Q1 (Phase 332's N1): the name check asked the loopback stand-in, and rightly --
  if (dns !== null) {
    const verdict = nameQuestionsVerdict({ expect: log.some((e) => e.kind === 'funnel'), rows: nameRows, name: PUBLIC_NAME });
    report.readings.nameQuestions = nameRows;
    arm(
      'Q1 the name check asked only the DNS stand-in, an A question with RD 0 for the stand-in’s name, and no agent was started',
      verdict.ok && dnsPreflights.length > 0 && dnsPreflights.every((x) => x === true) && agentsHeld.length > 0 && agentsHeld.every((x) => x === true),
      `${verdict.said}; the DNS preflight ${J(dnsPreflights)}; the renamed agents ${J(agentsHeld)} absent`
    );
  }
}

// ---- N10 (Phase 316.5): nothing of an alert in app.log, the app gone --------
if (ran) {
  const tokenNeedles = Object.entries(TOKENS).flatMap(([name, t]) => [
    [`the ${name} device token`, t],
    [`the ${name} device token in capitals`, t.toUpperCase()]
  ]);
  const jwts = [...new Set(apns.requests.map((x) => x.authorization).filter((a) => typeof a === 'string' && a !== ''))];
  const bodies = [...new Set([...apns.requests.map((x) => x.body), ...alerts.deliveries.map((d) => d.body)].filter((b) => typeof b === 'string' && b !== ''))];
  const needles = [
    ...tokenNeedles,
    ...jwts.map((jwt, i) => [`provider token ${String(i + 1)}`, jwt]),
    ...alerts.pemLines.map((line, i) => [`line ${String(i + 1)} of the scratch key`, line]),
    ...bodies.map((body, i) => [`alert body ${String(i + 1)}`, body])
  ];
  const log = await appLogText();
  const v = gradeLog({ log, printed: appText, needles });
  report.readings.alerts = { ...(report.readings.alerts ?? {}), N10: { logCharacters: log.length, looked: needles.length, jwts: jwts.length, bodies: bodies.length } };
  arm('N10 app.log and the app\'s output hold no device token, provider token, key line or alert body', v.ok, v.said);
}

// ---- K2: the windows' secrets and any private key, on the Mac's side --------
if (ran) {
  const needles = [...secretNeedles(), [Buffer.from('PRIVATE KEY-----', 'utf8'), 'a PEM private key']];
  const scanned = [HARNESS, HOME].map((root) => filesHolding(root, needles));
  const hits = scanned.flatMap((s) => s.hits);
  const printed = SECRETS.some((secret) => appText.includes(secret)) || appText.includes('PRIVATE KEY-----');
  arm('K2 no window\'s secret and no private key is in any file of the Mac\'s scratch world or anything the app printed', SECRETS.length > 0 && scanned.reduce((n, s) => n + s.files, 0) > 0 && hits.length === 0 && !printed, `${String(scanned.reduce((n, s) => n + s.files, 0))} file(s) read for ${String(SECRETS.length)} secret(s) and any PEM private key; ${hits.length === 0 ? 'none holds one' : J(hits)}; the app's output ${printed ? 'CARRIES one' : 'does not'}`);
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
writeFileSync(join(OUT, 'probe-p316.json'), `${unsecret(J(report, null, 1))}\n`, 'utf8');
say(`wrote ${join(OUT, 'probe-p316.json')}`);
const unreadable = report.arms.filter((a) => a.ok === null).length;
if (ran && failures === 0 && unreadable > 0) {
  say(`probe:p316 could not READ ${String(unreadable)} arm(s); that is not a pass`);
  process.exit(2);
}
say(failures > 0 ? `probe:p316 FAILED ${String(failures)} arm(s)` : !ran ? 'probe:p316 did not complete' : 'probe:p316 OK');
process.exit(failures > 0 ? 1 : ran ? 0 : 2);
