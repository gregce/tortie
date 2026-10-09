#!/usr/bin/env node
/**
 * `npm run test:ios` — the phone app's XCTest unit tests, on a Simulator of
 * their own (Phase 316.2, build/p316/SPEC.md §4 S2, Proof; Phase 330,
 * build/p330/SPEC.md §4.12.7 and §7.3; Phase 316.5, build/p3165/SPEC.md §6.5).
 *
 * WHAT IT RUNS. The `TortieTests` target: decoding the door's answers, the page
 * arithmetic (including its refusal when indexes go backwards or overlap, and
 * its stop when `more` is true on a page that adds nothing), the pin, and every
 * vector build/p316/vectors.mjs wrote from the SHIPPING TypeScript. Since
 * Phase 316.5 that includes `AlertsTests`: the tap each of Phase 314's alert
 * shapes opens, the `Pair again to get alerts.` table, the address's bounds,
 * the presentation with an address against the shipping opener, the record
 * that keeps it, and that iOS is asked about alerts only when the Mac says it
 * can send (research 136 §9). The UI tests are `probe:p316`'s, because they
 * need the door.
 *
 * AND THE CLIENT IDENTITY, MEASURED (Phase 330, the entry's S0 on the phone).
 * `P330TransportTests` makes a key in the Simulator's Keychain with the
 * SHIPPING Keychain code and dials through the SHIPPING `DoorClient`. So this
 * script stands up two doors IN THIS PROCESS, on 127.0.0.1 only, before the
 * device boots, and ends both in a `finally`: door A speaks TLS 1.3 at least,
 * asks for a certificate, issues one over a posted key with the SHIPPING
 * `issueClientCertificate` (`POST /p330/issue`, the one request it takes with
 * no certificate) and records the SPKI pin of every certificate a handshake
 * presents (`GET /p330/whoami` answers it); door B holds another key and
 * counts every request it serves, which must be none. Their ports and door
 * A's pin reach the tests as `TEST_RUNNER_P330_*`. After each configuration's
 * run the counts are read here as well as in Swift: door A must have issued
 * and read a pin it issued over, and door B served nothing. So that it can
 * import the TypeScript, the full run re-runs this file under the pinned tsx
 * (`build/ts-runner.mjs`) and waits for it; `--read-app` does not.
 *
 * AND THE WRITE, MEASURED (Phase 317, build/p317/SPEC.md §6.3 (ab) and (ad)).
 * Door A also takes the write, `POST /v1/end`, from a connection presenting a
 * certificate it issued: each is verified with
 * build/p316/node-phone.mjs's `verifySigned` over its method, its path and its
 * BODY, as the vectors' phone (`keys.phoneSigningKey`, `phoneExchangeKey`)
 * signing to the vectors' Mac (`keys.macExchangeSeed`, `macExchangeKey`), and
 * answered with a fixed write answer echoing the body's write id; a signature
 * that does not hold is answered 404 with no body, as the door does. Two more
 * listeners hold for (ad), each counting the connections it took and the
 * requests it READ: `holdTls` holds the raw socket `P317_HOLD_MS` (2 s) before
 * the TLS handshake starts, and a write whose task is cancelled at 0.5 s must
 * leave it ZERO requests (the bytes were never handed, so they are withheld,
 * never sent on a handshake that completes later); `holdAnswer` holds its
 * ANSWER 2 s after the request was read, and a write whose task is cancelled
 * after the request arrived must still be answered over a connection the
 * phone kept (once handed, a write ends by its answer). `GET /p317/counts` on
 * door A answers the counts, so a test can wait for "the request arrived"
 * rather than guess at it. Their ports reach the tests as
 * `TEST_RUNNER_P317_HOLD_TLS_PORT`, `TEST_RUNNER_P317_HOLD_ANSWER_PORT` and
 * `TEST_RUNNER_P317_HOLD_MS`, and after each configuration the counts are read
 * here too (`writeProblems`). The run's rows also gain the test classes 317
 * adds and updates (`P317_SUITES`): each must be named in xcodebuild's own
 * suite lines, because a class that never ran is not a pass.
 *
 * AND THE REPLY, MEASURED (Phase 318, build/p318/SPEC.md §6.3). Door A also
 * takes `POST /v1/choose` and `POST /v1/say`, verified the same way over the
 * body and answered with the body's write id echoed under the route's own verb,
 * with 317's two hold modes, so `P318ReplyTransportTests` drives the SHIPPING
 * `DoorClient`: a message or a press whose task is cancelled at 0.5 s while
 * the handshake is held leaves ZERO requests and reads `.notSent(.cancelled)`;
 * one whose request arrived before the cancel is answered; a message handed a
 * kept id goes with THAT id. A write's body is read up to the say cap,
 * 32,768 bytes, as the door's own limit. After each configuration
 * `replyProblems` reads door A's counts: at least one press and one message
 * verified and answered. The classes 318 adds are `P318_SUITES`, each named in
 * xcodebuild's own suite lines.
 *
 * AND THE SCREEN'S KEPT LINES, MEASURED (Phase 337, build/p337/SPEC.md D25,
 * §6.4, §Attack A12). A fifth listener under door A's key and admission KEEPS
 * its connections (`keepAliveTimeout` 5 s, `SCREEN_DOOR_KEEP_MS`, the shipping
 * door's) and answers `GET /v1/screen` with the committed sample
 * (build/fixtures/screen/sample-claude-2.1.287.json, the id echoed; a `since`
 * equal to its revision answered `unchanged`) and `POST /v1/keys` with `done`
 * under the verb `keys`, both verified as the vectors' phone. By the session a
 * request names, `p337-close-on-next` is answered and the NEXT request on that
 * connection is read, counted and ended with no answer; `p337-stray` is
 * answered and a second, unasked answer follows 50 ms later on the same
 * connection; `p337-says-close` is answered with `Connection: close`.
 * `GET /p337/counts` answers its handshakes, the connections the PHONE ended
 * first, its screen reads and its keys writes. Its port reaches the tests as
 * `TEST_RUNNER_P337_SCREEN_PORT`, so `P337ScreenTransportTests` drives the
 * SHIPPING `DoorClient` and `DoorLine` over it; after each configuration
 * `screenProblems` reads its counts and xcodebuild's own output, which must
 * hold every `P337_TRANSPORT|<row>|<reading>` row reading what it must
 * (`P337_TRANSPORT_ROWS`) and both `P337_GRID` lines of `ScreenGridCostTests`,
 * the top size under 64 MB. The classes 337 adds are `P337_SUITES`, each named
 * in xcodebuild's own suite lines.
 *
 * AND THE HISTORY'S SIDE LINE, MEASURED (Phase 337.1, build/p3371/SPEC.md
 * §6.4, D30). The same screen door answers `GET /v1/scrollback` with a page of
 * a history it composes itself, `SCROLLBACK_DOOR_DEPTH` numbered lines
 * (`L000001 …`, build/p3371/history-stand-in.mjs's own spelling), one style,
 * the space `SCROLLBACK_DOOR_SPACE`, each row cut to the `wrap` asked; and
 * `GET /v1/session` with the vectors' `session-talk` answer, the id echoed.
 * Both are verified as the vectors' phone and keep the screen door's rules by
 * session name (`p337-close-on-next` and the rest), so
 * `P3371ScrollbackTransportTests` drives the SHIPPING `DoorClient` and
 * `DoorLine` over it: two pages on one kept line, a page on a line the door
 * closed, a page beside a poll, a page beside a status re-read on the side
 * line. Its depth and space are handed to the runner as `TEST_RUNNER_P3371_DEPTH`
 * and `TEST_RUNNER_P3371_SPACE` (the transport test pages inside the depth the
 * door's own screen answer names); the door's screen answers are the committed
 * sample, which since this phase carries `depth` and `space` (D3), and the run
 * refuses, before anything boots, a sample that does not. After each
 * configuration `scrollbackProblems` reads the door's counts (at least one
 * page and one session read, every page ask in its form) and xcodebuild's
 * output, which must hold every `P3371_TRANSPORT|<row>|<handshakes>` row the
 * test prints reading what it must (`P3371_TRANSPORT_ROWS`: two pages on one
 * kept line one handshake, a page on a line the door ended two, a page beside
 * the poll two, a page beside a status re-read on the side line one). The
 * classes 337.1 adds are `P3371_SUITES`, each named in xcodebuild's own suite
 * lines.
 *
 * AND THE FROZEN WIRE (Phase 333.11, build/p33311/SPEC.md §8.3, §8.4).
 * `DoorFrozenTests` holds today's phone to every frozen set under
 * ios/TortieTests/Fixtures/frozen/ (an old Mac, a new phone) and prints one
 * `P33311|<label>|<item>|<expect>|<got>` row per item. Before anything builds,
 * the reader of build/p33311/swift-wire.mjs reads today's phone, and each set
 * whose projection equals it is handed to the tests in `P33311_PROOF`, so its
 * refuse arms are asserted; a set whose phone files are byte-identical to the
 * ones it was frozen from while the projections differ refuses the run. After
 * each configuration every row the SEALED files name (each arm, decode,
 * request, and today's answers on a frozen route) must be printed exactly
 * once and read as sealed (`frozenRowProblems`), and `P33311_SUITES` must be
 * named in xcodebuild's own suite lines.
 *
 * THE ORDER.
 *   1. The preflight: xcodebuild, simctl, the runtime and the iPhone 16 Pro
 *      device type. Missing any, it REFUSES with a sentence naming what is
 *      absent and exits 2, before anything is created. It never passes
 *      quietly (build/verification-checks.mjs, "Xcode and Go harness").
 *   2. `vectors.mjs --check`, so a stale fixture fails here by name rather
 *      than as a wall of Swift assertion failures.
 *   3. `build-for-testing` for the Simulator SDK, which boots nothing, into a
 *      scratch derived data path, ad hoc with no team: Debug, and Release
 *      beside it (`<derived data>-release`, with ENABLE_TESTABILITY=YES so the
 *      tests can import the app), because a Release build compiles tests the
 *      Debug one does not (316.3's hardening round: the `#else` of
 *      `testTheDebugTransportDialsLoopbackOnly`, and the Release halves of
 *      the pairing and vector rows, had never run).
 *   4. THE BUILT APPS, READ (the hardening round). Every Mach-O file in each
 *      built Tortie.app, by `otool -L`: none may link NetworkExtension, whose
 *      name a link flag assembled from build settings never spells, so no
 *      text rule can see it (the reverify linked it that way with
 *      conformance:ios green), and none may link TailscaleKit, nor may the app
 *      hold a TailscaleKit framework at all (Phase 330: the phone joins no
 *      tailnet). By `otool -l`: none may carry the sections a build
 *      instrumented for code coverage carries (`__llvm_prf_*`, `__llvm_cov*`),
 *      which 316.3's fix round found in every build through the scheme,
 *      Release included, and which it turned off in text only. And no DEBUG
 *      seam (316.4's owed item 2, Phase 330 §4.12.7): the five seam ARGUMENT
 *      strings, which are longer than Swift's fifteen-byte inline strings and
 *      so survive optimisation as bytes, are searched for in every Mach-O
 *      file. A Release build must hold none. The Debug build must hold all
 *      five, which is the control that proves the search can find them. And
 *      THE ALERT ADDRESS (Phase 316.5, build/p3165/SPEC.md §6.5), both ways:
 *      a Release build must hold the selector `registerForRemoteNotifications`
 *      (whole, between the NUL bytes that end its neighbours, so neither
 *      `unregister…` nor the delegate's `didRegister…` passes for it), because
 *      that is how the app asks Apple for the address an alert is sent to; a
 *      Debug build must hold none, which is the proof that no Simulator run can
 *      ask Apple for anything. AND UNPAIR'S HALF (Phase 316.6, build/p3166/SPEC.md
 *      §6.4), both ways too, each with its own problem line: a Release build
 *      must hold `unregisterForRemoteNotifications` whole, because Unpair is
 *      how this install tells Apple to stop taking alerts for it, and a Debug
 *      build must hold none. AND TORTIE'S OWN SITE (Phase 333.1,
 *      build/p3331/SPEC.md §7.8): every build, Debug and Release, must hold
 *      each of SiteLink's three addresses (`https://tortie.sh`, `/privacy`,
 *      `/support`) WHOLE, its bytes ended by a NUL, so an address cut short or
 *      a byte off names itself. PASS_WORDS do not change: his checklist quotes
 *      them. Each Simulator build's entitlements are read
 *      too: a Simulator app is signed ad hoc and its signature carries none
 *      (`codesign -d --entitlements` answers an empty dictionary), so what the
 *      app is granted is the SIMULATED entitlements Xcode links into the
 *      executable's `__TEXT,__entitlements` section, read here by CoreFoundation
 *      (`plutil`): `aps-environment` must be `development`, and nothing else
 *      may be there but the `application-identifier` Xcode adds to every
 *      Simulator app. A problem refuses, exit 1, before any device boots.
 *      `--read-app <Tortie.app or Tortie.xcarchive>` does this step alone, as
 *      Release, and boots nothing.
 *   5. THE DEVICE BUILD AS IT SHIPS (Phase 316.4, owed by 316.3's final
 *      reverify). Steps 3 and 4 build and read Simulator products only, and
 *      the app he uploads is an ARCHIVE for the device, stripped on the way
 *      in, which no read had ever seen. So the Release configuration is
 *      archived for `generic/platform=iOS` into scratch with
 *      CODE_SIGNING_ALLOWED=NO and no team (`<derived data>-device`), its
 *      Tortie.app read exactly as in step 4, and `codesign` asked whether it
 *      is signed: it must not be, because no agent run signs anything. The
 *      archive he makes in Xcode is read by the same `--read-app` before he
 *      uploads it (build/p316/CHECKLIST.md). It boots nothing either.
 *   6. `test-without-building -only-testing:TortieTests` on ONE iPhone 16 Pro
 *      from build/simulator-run.mjs's withSimulator, which shuts it down and
 *      deletes it in a `finally` and on SIGINT, SIGTERM and SIGHUP: the Debug
 *      build's tests, then the Release build's, on the same device, with the
 *      two doors above named in their environment and their counts read after
 *      each.
 *   7. The end-of-run count: devices named `p316-`, and how many are booted.
 *
 * The test plan turns screenshots off and keeps no attachment (conformance:ios
 * rule i), so the result bundle holds no photograph, and it is deleted with the
 * scratch directory anyway.
 *
 *   npm run test:ios
 *   node build/p316/test-ios.mjs --read-app <path to Tortie.app>         step 4 alone
 *   node build/p316/test-ios.mjs --read-app <path to Tortie.xcarchive>   the same, on the one app inside an archive
 *   P316_RUNTIME=18.3 npm run test:ios            the floor runtime
 *   P316_DERIVED_DATA=<dir> npm run test:ios      derived data somewhere of yours (never the repo, never home);
 *                                                 the Release build goes to <dir>-release beside it,
 *                                                 and the device archive's to <dir>-device
 *   P316_KEEP=1 npm run test:ios                  keep the scratch directory
 *   P3166_OUTLINE_DIR=<dir> npm run test:ios      Phase 316.6's Method 2: the markdown outline
 *                                                 tests write outline-<Debug|Release>.jsonl there
 *   P3166_OUTLINE_INPUT=<file> npm run test:ios   ... over this JSON array of {name, source}
 *                                                 instead of fixtures.json. Both are handed to
 *                                                 the tests as TEST_RUNNER_ environment, and
 *                                                 each is refused, exit 2, inside the repository
 *                                                 or the home, exactly as the scratch directory is
 *
 * VERIFIERS ONLY run it: it boots a Simulator, so take the orchestrator's lock.
 * Its only sockets are the two doors, on 127.0.0.1; it starts no Electron,
 * reaches no tailnet and needs no Apple account.
 */

import { spawnSync } from 'node:child_process';
import { X509Certificate, createHash, createPrivateKey } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readSync, realpathSync, rmSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';
import { createServer as createNet } from 'node:net';
import { createServer as createTls } from 'node:tls';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUNTIME_CURRENT,
  countDevicesNamed,
  refuseScratchReason,
  simulatorHarnessMissing,
  withSimulator,
  xcodebuildRun
} from '../simulator-run.mjs';
import { verifySigned } from './node-phone.mjs';
// Phase 337.1: the screen door's history is the stand-in's own numbered lines, at its default width.
import { lineOf as standInLineOf } from '../p3371/history-stand-in.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[test:ios]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const J = JSON.stringify;
const PROJECT = join(ROOT, 'ios', 'Tortie.xcodeproj');
const SCHEME = 'Tortie';

// ---------------------------------------------------------------------------
// Step 4: the built app, read
// ---------------------------------------------------------------------------

/** The four bytes every Mach-O file, thin or fat, begins with. */
const MACH_O = new Set(['feedface', 'cefaedfe', 'feedfacf', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca']);

/** Every Mach-O file under a built bundle, found by its first bytes rather than by its name. */
function machOFiles(dir) {
  const out = [];
  const walk = (at) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const p = join(at, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const head = Buffer.alloc(4);
        const fd = openSync(p, 'r');
        try {
          readSync(fd, head, 0, 4, 0);
        } finally {
          closeSync(fd);
        }
        if (MACH_O.has(head.toString('hex'))) out.push(p);
      }
    }
  };
  walk(dir);
  return out.sort();
}

function tool(file, args) {
  const r = spawnSync(file, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120_000 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}`, err: `${r.stderr ?? ''}${r.error ? r.error.message : ''}` };
}

/**
 * The DEBUG seams' ARGUMENT strings (build/p330/SPEC.md §4.12.7), which
 * conformance:ios rule (d) holds inside `#if DEBUG`. Each is longer than the
 * fifteen bytes Swift keeps inline in an instruction, so a build that compiled
 * one carries it as bytes.
 */
export const DEBUG_SEAM_ARGUMENTS = ['-TortieDebugPairingPayload', '-TortieDebugForgetPairing', '-TortieDebugStill', '-TortieDebugDoorEndpoint', '-TortieDebugPushToken'];

/**
 * The selector a build that asks Apple for its alert address calls (Phase
 * 316.5): `UIApplication.registerForRemoteNotifications`, named once, in the
 * `#else` of `#if DEBUG` (conformance:ios rule x). Searched for WHOLE, between
 * the NUL bytes that end the method names beside it, so `unregister…` and the
 * delegate's `didRegister…WithDeviceToken:` never pass for it.
 */
export const REGISTRATION_SELECTOR = 'registerForRemoteNotifications';
const REGISTRATION_BYTES = Buffer.concat([Buffer.from([0]), Buffer.from(REGISTRATION_SELECTOR, 'utf8'), Buffer.from([0])]);

/**
 * Unpair's half (Phase 316.6): `UIApplication.unregisterForRemoteNotifications`,
 * named once, in the `#else` of `#if DEBUG` (conformance:ios rule x). Searched
 * for whole between NUL bytes like the registration, so the two never stand
 * in for each other.
 */
export const UNREGISTER_SELECTOR = 'unregisterForRemoteNotifications';
const UNREGISTER_BYTES = Buffer.concat([Buffer.from([0]), Buffer.from(UNREGISTER_SELECTOR, 'utf8'), Buffer.from([0])]);

/**
 * Tortie's own site (Phase 333.1, build/p3331/SPEC.md D21, §7.8): the app's
 * only three `https://` literals, `SiteLink`'s, in Markdown/Links.swift. Each is
 * 17 to 25 bytes, longer than Swift's 15-byte small-string form, so a build
 * emits each as its own bytes, ended by a NUL. Every build must hold each one
 * WHOLE: its bytes followed by a NUL and not preceded by a byte an address can
 * hold, so neither a longer address that begins with it (`https://tortie.sh`
 * inside `https://tortie.sh/privacy`) nor one cut short or a byte off passes
 * for it, and an address that is missing names itself.
 */
export const SITE_ADDRESSES = Object.freeze(['https://tortie.sh', 'https://tortie.sh/privacy', 'https://tortie.sh/support']);
/** A byte an address may hold (RFC 3986's unreserved, reserved and `%`). */
const ADDRESS_BYTE = /[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/;

/** How many times `address` is held whole in `bytes`. Pure. */
export function wholeAddressCount(bytes, address) {
  const needle = Buffer.concat([Buffer.from(address, 'utf8'), Buffer.from([0])]);
  let count = 0;
  for (let at = bytes.indexOf(needle); at !== -1; at = bytes.indexOf(needle, at + 1)) {
    if (at === 0 || !ADDRESS_BYTE.test(String.fromCharCode(bytes[at - 1]))) count += 1;
  }
  return count;
}

/** How many times each of the three addresses is held whole across `buffers`. Pure. */
export function siteAddressCounts(buffers) {
  const counts = new Map(SITE_ADDRESSES.map((a) => [a, 0]));
  for (const bytes of buffers) {
    for (const a of SITE_ADDRESSES) counts.set(a, (counts.get(a) ?? 0) + wholeAddressCount(bytes, a));
  }
  return counts;
}

/**
 * One problem for each address a build does not hold whole, naming it, from
 * `siteAddressCounts`. Pure, so the self-test holds it on bytes it writes.
 */
export function siteAddressProblems(where, counts) {
  return SITE_ADDRESSES.filter((a) => (counts.get(a) ?? 0) === 0).map(
    (a) => `no Mach-O file of ${where} holds ${a} whole, so the press that opens it opens nothing (Phase 333.1, D21: SiteLink's three addresses are the app's only https:// literals)`
  );
}

/**
 * A section only a build instrumented for code coverage carries: clang's and
 * swiftc's `-profile-generate` counters and names (`__llvm_prf_cnts`,
 * `__llvm_prf_data`, `__llvm_prf_names`, …) and `-profile-coverage-mapping`'s
 * map (`__llvm_covmap`, `__llvm_covfun`), as `otool -l` prints them.
 */
const COVERAGE_SECTION = /^\s*sectname (__llvm_(?:prf|cov)\w*)/gm;

/**
 * What every Release read that found nothing says, so the callers say it
 * alike. PINNED: his checklist quotes it (build/p3165/CHECKLIST.md).
 */
export const PASS_WORDS = 'none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam, and it asks Apple for its alert address';
/** What a Debug build's read says, whose seams are the search's control. */
const DEBUG_PASS_WORDS = `none links NetworkExtension or TailscaleKit, none carries code coverage, all ${String(DEBUG_SEAM_ARGUMENTS.length)} DEBUG seams found, which is the control that proves the search, and it never asks Apple for an alert address`;

/**
 * The app a path names: the path itself, or, for an archive Xcode's Organizer
 * made (`Tortie <date>.xcarchive`, which is what a person can drag from Finder),
 * the ONE app under its `Products/Applications`. Returns `{ app }` or
 * `{ problem }`.
 */
export function appAt(path) {
  const trimmed = String(path).replace(/\/+$/, '');
  if (trimmed.endsWith('.app')) return { app: trimmed };
  if (!trimmed.endsWith('.xcarchive')) {
    return { problem: `${trimmed} is neither an app (…/Tortie.app) nor an archive (…/Tortie ….xcarchive), so there is nothing to read` };
  }
  const dir = join(trimmed, 'Products', 'Applications');
  const apps = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.app')).sort() : [];
  if (apps.length !== 1) {
    return { problem: `${trimmed} holds ${String(apps.length)} apps under Products/Applications, not one, so there is no single app to read` };
  }
  return { app: join(dir, apps[0]) };
}

/** Every path under a bundle whose name says TailscaleKit, files and folders alike. */
function tailscaleKitPaths(dir) {
  const out = [];
  const walk = (at) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const p = join(at, e.name);
      if (/tailscale/i.test(e.name)) out.push(p);
      if (e.isDirectory()) walk(p);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * What a built Tortie.app says about itself that no text rule can: every
 * Mach-O file's load commands (`otool -L`) name no NetworkExtension and no
 * TailscaleKit, and nothing in the bundle is named for Tailscale; no Mach-O
 * file carries a coverage section (`otool -l`); and the DEBUG seams' argument
 * strings are in no Mach-O file of a Release build, and in one of a Debug
 * build, whose presence is the control (`{ debug: true }`). Returns the
 * problems (sentences) and what was read.
 */
export function builtAppProblems(app, { debug = false } = {}) {
  const problems = [];
  if (!existsSync(app)) return { problems: [`${app} does not exist, so the built app cannot be read`], files: 0 };
  const files = machOFiles(app);
  if (files.length === 0) problems.push(`${app} holds no Mach-O file, so it cannot be read`);
  for (const p of tailscaleKitPaths(app)) {
    problems.push(`${relative(app, p)} is in the app; the phone joins no tailnet and embeds nothing of Tailscale's (Phase 330)`);
  }
  const seamsFound = new Set();
  const registering = [];
  const unregistering = [];
  // Phase 333.1: the site's three addresses, held whole somewhere in every build.
  const siteHeld = new Map(SITE_ADDRESSES.map((a) => [a, 0]));
  for (const f of files) {
    const bytes = readFileSync(f);
    for (const [a, n] of siteAddressCounts([bytes])) siteHeld.set(a, (siteHeld.get(a) ?? 0) + n);
    if (bytes.indexOf(REGISTRATION_BYTES) !== -1) {
      registering.push(f);
      if (debug) problems.push(`${relative(app, f)} carries the selector ${REGISTRATION_SELECTOR}, so a DEBUG build, which is every Simulator run, could ask Apple for an alert address; conformance:ios (x) holds it in the #else of #if DEBUG`);
    }
    if (bytes.indexOf(UNREGISTER_BYTES) !== -1) {
      unregistering.push(f);
      if (debug) problems.push(`${relative(app, f)} carries the selector ${UNREGISTER_SELECTOR}, so a DEBUG build, which is every Simulator run, could speak to Apple when it unpairs; conformance:ios (x) holds it in the #else of #if DEBUG`);
    }
    for (const arg of DEBUG_SEAM_ARGUMENTS) {
      if (bytes.indexOf(Buffer.from(arg, 'utf8')) === -1) continue;
      seamsFound.add(arg);
      if (!debug) problems.push(`${relative(app, f)} carries the DEBUG seam argument ${arg}, so a Release build compiled a seam conformance:ios (d) holds inside #if DEBUG`);
    }
    const l = tool('/usr/bin/otool', ['-L', f]);
    if (!l.ok) {
      problems.push(`otool -L could not read ${relative(app, f)}: ${l.err.trim().split('\n').pop()}`);
      continue;
    }
    // A line ending in a colon is `otool -L` naming the file it reads, not a link.
    const links = l.out.split('\n').filter((x) => x.trim() !== '' && !x.trimEnd().endsWith(':'));
    for (const line of links.filter((x) => /NetworkExtension/.test(x))) {
      problems.push(`${relative(app, f)} links ${line.trim().split(' ')[0]} (otool -L); the phone is an ordinary client, never a VPN, and a link flag assembled from build settings is how this gets past conformance:ios (research 128 §3)`);
    }
    for (const line of links.filter((x) => /tailscale/i.test(x))) {
      problems.push(`${relative(app, f)} links ${line.trim().split(' ')[0]} (otool -L); the phone joins no tailnet (Phase 330)`);
    }
    const sections = tool('/usr/bin/otool', ['-l', f]);
    if (!sections.ok) {
      problems.push(`otool -l could not read ${relative(app, f)}: ${sections.err.trim().split('\n').pop()}`);
      continue;
    }
    const covered = [...new Set([...sections.out.matchAll(COVERAGE_SECTION)].map((m) => m[1]))];
    if (covered.length > 0) {
      problems.push(`${relative(app, f)} carries ${covered.join(', ')} (otool -l), so it was built instrumented for code coverage; a build through the scheme takes the test plan's coverage switch (316.3's fix round)`);
    }
  }
  if (debug && files.length > 0) {
    const missing = DEBUG_SEAM_ARGUMENTS.filter((a) => !seamsFound.has(a));
    if (missing.length > 0) {
      problems.push(`the Debug build carries no ${missing.join(', ')}, so the search for seams in Release cannot be shown to find one; the control failed`);
    }
  }
  if (!debug && files.length > 0 && registering.length === 0) {
    problems.push(`no Mach-O file of ${app} carries the selector ${REGISTRATION_SELECTOR}, so this build never asks Apple for the address an alert is sent to, and no alert could reach it (Phase 316.5)`);
  }
  if (!debug && files.length > 0 && unregistering.length === 0) {
    problems.push(`no Mach-O file of ${app} carries the selector ${UNREGISTER_SELECTOR}, so Unpair never tells Apple to stop taking alerts for this install (Phase 316.6)`);
  }
  // Phase 333.1 (build/p3331/SPEC.md §7.8): Debug and Release alike.
  if (files.length > 0) problems.push(...siteAddressProblems(app, siteHeld));
  return {
    problems,
    files: files.length,
    seams: seamsFound.size,
    registering: registering.length,
    unregistering: unregistering.length,
    siteAddresses: Object.fromEntries(siteHeld)
  };
}

/**
 * The `__TEXT,__entitlements` section of every slice of a Mach-O file, as
 * text: where Xcode links a Simulator app's SIMULATED entitlements, because a
 * Simulator build is signed ad hoc and its signature carries none. Thin or fat,
 * 64-bit slices only (every slice this app builds is). Returns one string per
 * slice that holds the section.
 */
export function entitlementSections(file) {
  const buf = readFileSync(file);
  const slices = [];
  const magic = buf.readUInt32BE(0);
  if (magic === 0xcafebabe || magic === 0xcafebabf) {
    const wide = magic === 0xcafebabf;
    const count = buf.readUInt32BE(4);
    for (let i = 0; i < count; i += 1) {
      const at = 8 + i * (wide ? 32 : 20);
      slices.push(wide ? Number(buf.readBigUInt64BE(at + 8)) : buf.readUInt32BE(at + 8));
    }
  } else {
    slices.push(0);
  }
  const out = [];
  for (const base of slices) {
    if (buf.readUInt32LE(base) !== 0xfeedfacf) continue;
    const commands = buf.readUInt32LE(base + 16);
    let p = base + 32;
    for (let c = 0; c < commands; c += 1) {
      const cmd = buf.readUInt32LE(p);
      const size = buf.readUInt32LE(p + 4);
      if (cmd === 0x19) {
        const sections = buf.readUInt32LE(p + 64);
        for (let k = 0; k < sections; k += 1) {
          const q = p + 72 + k * 80;
          const name = buf.toString('latin1', q, q + 16).replace(/\0+$/, '');
          const segment = buf.toString('latin1', q + 16, q + 32).replace(/\0+$/, '');
          if (segment === '__TEXT' && name === '__entitlements') {
            const length = Number(buf.readBigUInt64LE(q + 40));
            const offset = buf.readUInt32LE(q + 48);
            out.push(buf.toString('utf8', base + offset, base + offset + length));
          }
        }
      }
      p += size;
    }
  }
  return out;
}

/** The one key besides aps-environment a Simulator app's simulated entitlements carry: Xcode adds it to every one, the parent's included. */
const XCODE_SIMULATED = 'application-identifier';

/**
 * A Simulator build's entitlements (Phase 316.5, build/p3165/SPEC.md §6.5):
 * every slice of the app's executable carries simulated entitlements, read by
 * CoreFoundation, holding `aps-environment` = `development` and nothing but
 * Xcode's own `application-identifier` beside it; and the ad hoc signature
 * carries no entitlement at all. Returns the problems and what was read.
 */
export function simulatorEntitlementProblems(app) {
  const problems = [];
  const executable = join(app, 'Tortie');
  if (!existsSync(executable)) return { problems: [`${executable} does not exist, so its entitlements cannot be read`], slices: 0 };
  const sections = entitlementSections(executable);
  if (sections.length === 0) problems.push(`${relative(app, executable)} carries no __TEXT,__entitlements section, so the Simulator app is granted no aps-environment`);
  for (const [i, text] of sections.entries()) {
    const r = spawnSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', '-'], { input: text, encoding: 'utf8', timeout: 30_000 });
    let read = null;
    try {
      read = r.status === 0 ? JSON.parse(r.stdout) : null;
    } catch {
      read = null;
    }
    if (read === null || typeof read !== 'object' || Array.isArray(read)) {
      problems.push(`slice ${String(i)}'s simulated entitlements cannot be read as a dictionary`);
      continue;
    }
    if (read['aps-environment'] !== 'development') {
      problems.push(`slice ${String(i)}'s simulated entitlements set aps-environment to ${JSON.stringify(read['aps-environment'] ?? null)}; the file says development (conformance:ios w)`);
    }
    const others = Object.keys(read).filter((k) => k !== 'aps-environment' && k !== XCODE_SIMULATED).sort();
    if (others.length > 0) problems.push(`slice ${String(i)}'s simulated entitlements also hold ${others.join(', ')}; the app's only entitlement is aps-environment`);
  }
  const signed = tool('/usr/bin/codesign', ['-d', '--entitlements', '-', '--xml', app]);
  const granted = `${signed.out}`.match(/<key>([^<]+)<\/key>/g) ?? [];
  if (granted.length > 0) problems.push(`${app}'s ad hoc signature carries entitlements (${granted.join(', ')}); a Simulator build's are its simulated ones`);
  return { problems, slices: sections.length };
}

/**
 * Whether a built app is signed. No agent run signs anything (build/p316/SPEC.md
 * §4.0; the device archive below is made with CODE_SIGNING_ALLOWED=NO and no
 * team), so a signature here means a run reached for an identity. Returns the
 * problem, or null.
 */
export function signedProblem(app) {
  const r = tool('/usr/bin/codesign', ['-dv', app]);
  if (!r.ok && /not signed at all/.test(r.err)) return null;
  const said = `${r.err}${r.out}`.split('\n').find((l) => /^(Authority|TeamIdentifier|Signature)=/.test(l)) ?? r.err.trim().split('\n').pop();
  return `${app} is signed (codesign -dv: ${String(said).trim()}); the device archive is made with CODE_SIGNING_ALLOWED=NO, and no agent run signs a build for a device`;
}

/** What xcodebuild's own summary says: tests executed, failures, skipped. */
export function summaryOf(text) {
  let executed = null;
  let failures = null;
  let skipped = 0;
  for (const m of String(text).matchAll(/Executed (\d+) tests?, with (?:(\d+) tests? skipped and )?(\d+) failures?/g)) {
    executed = Number(m[1]);
    skipped = Number(m[2] ?? 0);
    failures = Number(m[3]);
  }
  return { executed, failures, skipped };
}

// ---------------------------------------------------------------------------
// The two doors P330TransportTests dials (build/p330/SPEC.md §7.3)
// ---------------------------------------------------------------------------

/** The name the doors' certificates carry and the tests keep as SNI and Host. Made up. */
const TRANSPORT_NAME = 'p330-transport.tail00000.ts.net';
const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
const pinOfSpki = (spki) => b64u(createHash('sha256').update(spki).digest());

/** How long each of (ad)'s two doors holds (build/p317/SPEC.md §6.3): the handshake, or the answer. */
export const P317_HOLD_MS = 2_000;

/**
 * The write route door A takes, by path, and the verb it answers as. One since
 * Phase 317's fix round, which took `unpair` out (build/p317/SPEC.md "§Fix
 * round"); a POST to `/v1/unpair` is a path door A does not have, a 404.
 */
export const WRITE_ROUTES = Object.freeze({ '/v1/end': 'end', '/v1/choose': 'choose', '/v1/say': 'say' });
/** The most of a write's body door A reads: the say cap (Phase 318, `POCKET_WRITE_BODY_CAPS.say`). */
export const WRITE_READ_CAP = 32_768;
/** Phase 337: how long the screen door keeps an idle connection, the shipping door's own (D25). */
export const SCREEN_DOOR_KEEP_MS = 5_000;
/** Phase 337: the rows P337ScreenTransportTests prints, `P337_TRANSPORT|<row>|<what it read>`, and what each must read. */
export const P337_TRANSPORT_ROWS = Object.freeze({ 'one-line': '1', idle: '1', 'closed-read': '3', 'keys-once': 'noAnswer', stray: '1', 'says-close': '1' });
/** Phase 337: the grid's ceiling at the top size (ScreenGridCostTests, §Attack A24), 64 MB. */
export const P337_GRID_CEILING = 64 * 1024 * 1024;

/** Phase 337.1: the screen door's history, numbered lines L000001 to L003000, and the space it names. */
export const SCROLLBACK_DOOR_DEPTH = 3_000;
export const SCROLLBACK_DOOR_SPACE = '3371a0b1c2d3';
/** The names a `/v1/scrollback` query carries, each once, and nothing else (D7). */
const SCROLLBACK_NAMES = Object.freeze(['id', 'from', 'count', 'depth', 'wrap', 'keep']);
const WHOLE_TEXT = /^(0|[1-9][0-9]{0,5})$/;

/**
 * The page this door answers a `/v1/scrollback` target with, or null (404):
 * the six names each once and nothing else, every number whole, `count` 1 to
 * 128, `from + count` within the ask's `depth`, `wrap` 1 to 512, `keep` `top`
 * or `bottom`, and `from` inside the door's own history. The rows are
 * `SCROLLBACK_DOOR_DEPTH` numbered lines, each cut to `wrap` cells, one style.
 */
export function scrollbackPageOf(target, lineOf) {
  let url;
  try {
    url = new URL(String(target), 'https://door.invalid');
  } catch {
    return null;
  }
  if (url.pathname !== '/v1/scrollback') return null;
  const names = [...url.searchParams.keys()];
  if (names.length !== SCROLLBACK_NAMES.length || new Set(names).size !== names.length || !names.every((n) => SCROLLBACK_NAMES.includes(n))) return null;
  const q = Object.fromEntries(url.searchParams.entries());
  if (!(q.id.length >= 1 && q.id.length <= 128)) return null;
  for (const n of ['from', 'count', 'depth', 'wrap']) if (!WHOLE_TEXT.test(q[n])) return null;
  const [from, count, depth, wrap] = ['from', 'count', 'depth', 'wrap'].map((n) => Number(q[n]));
  if (!(count >= 1 && count <= 128 && depth <= 100_000 && from + count <= depth && wrap >= 1 && wrap <= 512) || (q.keep !== 'top' && q.keep !== 'bottom')) return null;
  if (from >= SCROLLBACK_DOOR_DEPTH) return null;
  const rows = [];
  for (let i = from; i < Math.min(from + count, SCROLLBACK_DOOR_DEPTH); i += 1) {
    const text = lineOf(i + 1).slice(0, wrap);
    rows.push([{ text, style: 0, cells: text.length }]);
  }
  return {
    sessionId: q.id,
    at: Date.now(),
    from,
    depth: Math.max(depth, SCROLLBACK_DOOR_DEPTH),
    wrap,
    space: SCROLLBACK_DOOR_SPACE,
    styles: [{ fg: '#d4d4d4', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }],
    rows,
    why: null,
    sentence: null
  };
}

/** The vectors' `session-talk` answer (the shipping composer's own bytes), with the asked id put in. */
export function sessionAnswerOf(id, file = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json')) {
  const a = JSON.parse(JSON.parse(readFileSync(file, 'utf8')).answers['session-talk'].json);
  if (a.session !== null && typeof a.session === 'object') a.session.sessionId = id;
  return a;
}

/**
 * The committed screen sample the door answers with must carry D3's `depth`
 * and `space` (a whole number and 12 lowercase hex, or both null), so the
 * phone's Terminal is shown the shape it reads. Answers the problem, or null.
 */
export function sampleDepthProblem(sample) {
  const s = sample?.screen;
  if (s === null || typeof s !== 'object') return 'the committed screen sample has no screen';
  if (!Object.hasOwn(s, 'depth') || !Object.hasOwn(s, 'space')) return "the committed screen sample carries no depth or no space (Phase 337.1 D3); regenerate it with the screen's own test";
  const none = s.depth === null && s.space === null;
  const both = Number.isSafeInteger(s.depth) && s.depth >= 0 && s.depth <= 100_000 && typeof s.space === 'string' && /^[0-9a-f]{12}$/.test(s.space);
  return none || both ? null : `the committed screen sample's depth ${JSON.stringify(s.depth)} and space ${JSON.stringify(s.space)} are not null together nor a whole number beside 12 lowercase hex`;
}

/**
 * The vectors' phone and the vectors' Mac (ios/TortieTests/Fixtures/vectors.json,
 * from public seeds; they pair with nothing), as `verifySigned` takes them: a
 * write the Swift signs with the vectors' signer must verify here, and one it
 * signs with anything else must not.
 */
export function vectorWriteSigner(file = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json')) {
  const k = JSON.parse(readFileSync(file, 'utf8')).keys;
  const doorExchangePrivate = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b656e04220420', 'hex'), Buffer.from(k.macExchangeSeed, 'hex')]),
    format: 'der',
    type: 'pkcs8'
  });
  return { phone: { signingKey: k.phoneSigningKey, exchangeKey: k.phoneExchangeKey, clientKey: k.clientKey }, doorExchangePrivate, doorExchangeKey: k.macExchangeKey };
}

/**
 * The fixed write answer door A gives a write whose signature held: `done`,
 * echoing the body's write id. A body that is not a JSON object with a
 * 32-lowercase-hex `write` gets the Mac's own answer for it, `refused`
 * `malformed` with the id echoed `""` and the shipping `unreadable` sentence.
 */
export function writeAnswerOf(verb, body, unreadable) {
  let write = null;
  try {
    const parsed = JSON.parse(Buffer.from(body).toString('utf8'));
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.write === 'string' && /^[0-9a-f]{32}$/.test(parsed.write)) write = parsed.write;
  } catch {
    write = null;
  }
  if (write === null) return { verb, write: '', outcome: 'refused', reason: 'malformed', sentence: unreadable };
  return { verb, write, outcome: 'done', reason: null, sentence: null };
}

/**
 * Stand up door A and door B on 127.0.0.1, in this process, under the SHIPPING
 * `tls.ts` (imported here, so the caller runs under tsx). Door A: TLS 1.3 at
 * least, a certificate requested and any accepted by the handshake; a
 * connection presenting one is served only when its key is a key door A
 * issued over, and its pin is recorded; a connection presenting none is served
 * `POST /p330/issue` alone, read from its first bytes, and destroyed otherwise
 * with nothing written, as the shipping door treats a certificate-less socket
 * that is not `POST /pair`. Door B: another key, and every handshake and every
 * request counted. Returns the facts the tests are handed, `counts`, `reset`
 * and `close`, which the caller runs in a `finally`.
 *
 * Phase 317: door A also takes the write (`writeAnswerOf`), and two more
 * listeners under door A's key hold for (ad): `holdTls`, a plain TCP listener
 * that holds each raw socket `holdMs` before it hands it to a TLS server, and
 * `holdAnswer`, a TLS listener that holds each answer `holdMs` after reading
 * its request. Every request either one READS is counted, by the listener it
 * came through.
 */
export async function startTransportDoors(dir, { holdMs = P317_HOLD_MS } = {}) {
  const tls = await import('../../src/main/pocket/tls.ts');
  const { POCKET_WRITE_SENTENCES } = await import('../../src/shared/ipc/pocket.ts');
  const writeSigner = vectorWriteSigner();
  mkdirSync(dir, { recursive: true });
  const openSeal = { available: () => true, seal: (text) => text, open: (blob) => (typeof blob === 'string' ? blob : null) };
  const identity = (label) => {
    const o = tls.ensureDoorIdentity({ path: join(dir, `${label}.json`), seal: openSeal, names: { addresses: [], dnsNames: [TRANSPORT_NAME] } });
    if (o.kind !== 'ready') throw new Error(`tls.ts would not make door ${label}'s identity: ${String(o.reason)}`);
    const spki = new X509Certificate(o.identity.certPem).publicKey.export({ type: 'spki', format: 'der' });
    return { key: o.identity.keyPem, cert: o.identity.certPem, pin: pinOfSpki(spki) };
  };
  const A = identity('door-a');
  const B = identity('door-b');
  const fresh = () => ({
    a: { issued: [], read: [], refused: 0 },
    b: { handshakes: 0, served: 0 },
    // Phase 317. Every write door A read, by route and by the signature's word.
    writes: { end: 0, choose: 0, say: 0, verified: 0, refused: [], answered: 0 },
    holdTls: { connections: 0, closedWhileHeld: 0, handshakes: 0, requests: 0, answered: 0 },
    holdAnswer: { connections: 0, handshakes: 0, requests: 0, answered: 0, hungUp: 0 },
    // Phase 337. The screen door's own: every handshake (the counts request's
    // included), every connection the PHONE ended first, every screen read and
    // keys write it read, and every signature that did not hold.
    screen: { handshakes: 0, phoneCloses: 0, screenReads: 0, keysPosts: 0, refused: [], scrollbackReads: 0, sessionReads: 0, scrollbackRefused: 0 }
  });
  let counts = fresh();
  // Every key door A ever issued over, which a `reset` between configurations
  // keeps: the counts are per configuration, the admission is per run.
  const admitted = new Set();

  const answer = (res, status, body) => {
    const bytes = Buffer.from(body ?? '', 'utf8');
    const headers = { 'Content-Length': String(bytes.length), Connection: 'close' };
    if (body !== null) headers['Content-Type'] = 'application/json; charset=utf-8';
    res.writeHead(status, headers);
    res.end(bytes);
  };
  const http = createHttp({ maxHeaderSize: 8192 }, (req, res) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size <= WRITE_READ_CAP) chunks.push(c);
    });
    req.on('end', () => {
      const pin = req.socket.p330Pin ?? null;
      const mode = req.socket.p317Mode ?? 'door-a';
      const body = Buffer.concat(chunks);
      if (mode === 'hold-tls') counts.holdTls.requests += 1;
      if (mode === 'hold-answer') counts.holdAnswer.requests += 1;
      if (req.method === 'POST' && req.url === '/p330/issue' && size <= 4096) {
        let ck = null;
        try {
          ck = JSON.parse(body.toString('utf8')).ck;
        } catch {
          ck = null;
        }
        if (typeof ck !== 'string') return answer(res, 400, null);
        let der;
        try {
          der = tls.issueClientCertificate(A.key, ck, Date.now());
        } catch {
          return answer(res, 400, null);
        }
        const issuedPin = pinOfSpki(Buffer.from(ck, 'base64url'));
        counts.a.issued.push(issuedPin);
        admitted.add(issuedPin);
        return answer(res, 200, JSON.stringify({ cert: b64u(der) }));
      }
      if (req.method === 'GET' && req.url === '/p330/whoami' && pin !== null) {
        counts.a.read.push(pin);
        return answer(res, 200, JSON.stringify({ pin }));
      }
      if (req.method === 'GET' && req.url === '/p317/counts' && pin !== null) {
        const { holdTls, holdAnswer, writes } = counts;
        return answer(res, 200, JSON.stringify({ holdTls, holdAnswer, writes: { ...writes, refused: writes.refused.length } }));
      }
      const route = req.method === 'POST' ? WRITE_ROUTES[req.url ?? ''] : undefined;
      if (route !== undefined && pin !== null && size <= WRITE_READ_CAP) {
        counts.writes[route] += 1;
        const verdict = verifySigned({ method: req.method, target: req.url, headers: req.headers, body, ...writeSigner });
        if (verdict !== 'ok') {
          counts.writes.refused.push(verdict);
          return answer(res, 404, null);
        }
        counts.writes.verified += 1;
        const reply = JSON.stringify(writeAnswerOf(route, body, POCKET_WRITE_SENTENCES.unreadable));
        const send = () => {
          if (req.socket.destroyed) {
            if (mode === 'hold-answer') counts.holdAnswer.hungUp += 1;
            return;
          }
          counts.writes.answered += 1;
          if (mode === 'hold-tls') counts.holdTls.answered += 1;
          if (mode === 'hold-answer') counts.holdAnswer.answered += 1;
          answer(res, 200, reply);
        };
        // (ad)'s second hold: the request is read and counted, its answer waits.
        if (mode === 'hold-answer') setTimeout(send, holdMs).unref?.();
        else send();
        return;
      }
      return answer(res, 404, null);
    });
  });
  /** Door A's handshake rule, for every TLS server under its key: a pin it issued over, or `POST /p330/issue` with none. */
  const onSecure = (mode) => (socket) => {
    socket.p317Mode = mode;
    if (mode === 'hold-tls') counts.holdTls.handshakes += 1;
    if (mode === 'hold-answer') counts.holdAnswer.handshakes += 1;
    const peer = socket.getPeerX509Certificate();
    if (peer !== undefined) {
      const pin = pinOfSpki(peer.publicKey.export({ type: 'spki', format: 'der' }));
      if (!admitted.has(pin)) {
        counts.a.refused += 1;
        socket.destroy();
        return;
      }
      socket.p330Pin = pin;
      http.emit('connection', socket);
      return;
    }
    socket.once('data', (first) => {
      if (!first.toString('latin1').startsWith('POST /p330/issue ')) {
        counts.a.refused += 1;
        socket.destroy();
        return;
      }
      socket.pause();
      socket.unshift(first);
      http.emit('connection', socket);
      socket.resume();
    });
  };
  const tlsOptions = { key: A.key, cert: A.cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false };
  const doorA = createTls(tlsOptions);
  doorA.on('secureConnection', onSecure('door-a'));
  const doorB = createTls({ key: B.key, cert: B.cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false });
  doorB.on('secureConnection', (socket) => {
    counts.b.handshakes += 1;
    socket.on('data', () => {
      counts.b.served += 1;
      socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
    });
  });
  // (ad)'s first hold. The TLS server never listens: the plain listener in
  // front of it holds each raw socket, unread, for `holdMs`, and only then
  // hands it over, so a client's ClientHello waits in the socket's buffer and
  // no handshake can complete before the hold ends.
  const holdTlsDoor = createTls(tlsOptions);
  holdTlsDoor.on('secureConnection', onSecure('hold-tls'));
  holdTlsDoor.on('tlsClientError', () => undefined);
  const held = new Set();
  const holdTls = createNet((raw) => {
    counts.holdTls.connections += 1;
    held.add(raw);
    raw.on('error', () => undefined);
    raw.pause();
    const timer = setTimeout(() => {
      held.delete(raw);
      if (raw.destroyed || raw.readableEnded) {
        counts.holdTls.closedWhileHeld += 1;
        raw.destroy();
        return;
      }
      holdTlsDoor.emit('connection', raw);
      raw.resume();
    }, holdMs);
    timer.unref?.();
    raw.on('close', () => {
      if (held.has(raw)) {
        held.delete(raw);
        clearTimeout(timer);
        counts.holdTls.closedWhileHeld += 1;
      }
    });
  });
  // (ad)'s second hold: a door under A's key that answers each write late.
  const holdAnswer = createTls(tlsOptions);
  holdAnswer.on('secureConnection', onSecure('hold-answer'));
  holdAnswer.on('connection', () => {
    counts.holdAnswer.connections += 1;
  });
  // PHASE 337: the screen door, under door A's key and admission, that KEEPS
  // its connections (`keepAliveTimeout` 5 s, the shipping door's) and answers
  // `GET /v1/screen` and `POST /v1/keys`, each verified as the vectors' phone.
  // By the session a request names: `p337-close-on-next` is answered and the
  // NEXT request on that connection is read, counted and its connection ended
  // with no answer; `p337-stray` is answered and, 50 ms later, a second answer
  // nobody asked for is written on the same connection; `p337-says-close` is
  // answered with `Connection: close`. A read whose `since` is the sample's
  // revision is answered `unchanged`.
  const sample = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'sample-claude-2.1.287.json'), 'utf8'));
  const screenAnswerFor = (id, since) =>
    since === sample.revision
      ? { sessionId: id, revision: sample.revision, at: Date.now(), unchanged: true, screen: null, why: null, sentence: null }
      : { ...sample, sessionId: id, at: Date.now() };
  const keepAnswer = (res, status, body, { close = false } = {}) => {
    const bytes = Buffer.from(body ?? '', 'utf8');
    const headers = { 'Content-Length': String(bytes.length), Connection: close ? 'close' : 'keep-alive' };
    if (body !== null) headers['Content-Type'] = 'application/json; charset=utf-8';
    if (close) res.socket.p337ServerEnded = true;
    res.writeHead(status, headers);
    res.end(bytes);
  };
  const screenHttp = createHttp({ maxHeaderSize: 8192, keepAliveTimeout: SCREEN_DOOR_KEEP_MS }, (req, res) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size <= WRITE_READ_CAP) chunks.push(c);
    });
    req.on('end', () => {
      const socket = req.socket;
      const body = Buffer.concat(chunks);
      const url = new URL(req.url ?? '/', 'https://door.invalid');
      const reading = req.method === 'GET' && url.pathname === '/v1/screen';
      const writing = req.method === 'POST' && req.url === '/v1/keys';
      // PHASE 337.1: a page of the door's own history, and a session read (the Terminal's status re-read).
      const paging = req.method === 'GET' && url.pathname === '/v1/scrollback';
      const sessionRead = req.method === 'GET' && url.pathname === '/v1/session';
      if (reading) counts.screen.screenReads += 1;
      if (writing) counts.screen.keysPosts += 1;
      if (paging) counts.screen.scrollbackReads += 1;
      if (sessionRead) counts.screen.sessionReads += 1;
      if (socket.p337CloseNext === true && (reading || writing || paging || sessionRead)) {
        // The request after `p337-close-on-next`: read, counted, never answered.
        socket.p337ServerEnded = true;
        socket.destroy();
        return;
      }
      if (req.method === 'GET' && req.url === '/p337/counts') {
        const { handshakes, phoneCloses, screenReads, keysPosts, refused, scrollbackReads, sessionReads } = counts.screen;
        // THE DOOR ENDS THE COUNTS CONNECTION (the probe review, 2026-10-05).
        // The tests read the counts through the one-shot `DoorClient.exchange`,
        // which asks `Connection: close` and closes its connection once it has
        // the answer. Kept open here, that close was counted as the phone
        // ending a line first, so `idle`, which reads the counts on each side
        // of a 4.5 s wait, read 2 for the ONE line the phone closed (measured
        // with a node client that closes as DoorClient does). Ended by the
        // door, it is never the phone's.
        return keepAnswer(res, 200, JSON.stringify({ handshakes, phoneCloses, screenReads, keysPosts, refused: refused.length, scrollbackReads, sessionReads }), { close: true });
      }
      if (!reading && !writing && !paging && !sessionRead) return keepAnswer(res, 404, null);
      const verdict = verifySigned({ method: req.method, target: req.url, headers: req.headers, body, ...writeSigner });
      if (verdict !== 'ok') {
        counts.screen.refused.push(verdict);
        return keepAnswer(res, 404, null);
      }
      let session = '';
      if (reading || paging || sessionRead) session = url.searchParams.get('id') ?? '';
      else {
        try {
          session = String(JSON.parse(body.toString('utf8')).session ?? '');
        } catch {
          session = '';
        }
      }
      let reply;
      if (paging) {
        const page = scrollbackPageOf(req.url, (n) => standInLineOf(n));
        if (page === null) {
          counts.screen.scrollbackRefused += 1;
          return keepAnswer(res, 404, null);
        }
        reply = JSON.stringify(page);
      } else if (sessionRead) reply = JSON.stringify(sessionAnswerOf(session));
      else reply = reading ? JSON.stringify(screenAnswerFor(session, url.searchParams.get('since'))) : JSON.stringify(writeAnswerOf('keys', body, POCKET_WRITE_SENTENCES.unreadable));
      if (session === 'p337-close-on-next') socket.p337CloseNext = true;
      keepAnswer(res, 200, reply, { close: session === 'p337-says-close' });
      if (session === 'p337-stray') {
        setTimeout(() => {
          if (socket.destroyed) return;
          const stray = Buffer.from(reply, 'utf8');
          socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${String(stray.length)}\r\nConnection: keep-alive\r\n\r\n`);
          socket.write(stray);
        }, 50).unref?.();
      }
    });
  });
  const screenDoor = createTls(tlsOptions);
  screenDoor.on('secureConnection', (socket) => {
    counts.screen.handshakes += 1;
    const peer = socket.getPeerX509Certificate();
    const pin = peer === undefined ? null : pinOfSpki(peer.publicKey.export({ type: 'spki', format: 'der' }));
    if (pin === null || !admitted.has(pin)) {
      counts.a.refused += 1;
      socket.destroy();
      return;
    }
    socket.p330Pin = pin;
    // The PHONE ended this connection first: its end reached a socket the door had not ended.
    socket.on('end', () => {
      if (socket.p337ServerEnded !== true) counts.screen.phoneCloses += 1;
    });
    socket.on('error', () => undefined);
    screenHttp.emit('connection', socket);
  });
  screenDoor.on('tlsClientError', () => undefined);
  const servers = [doorA, doorB, holdTls, holdAnswer, screenDoor];
  const listening = [];
  const close = async () => {
    for (const raw of held) raw.destroy();
    held.clear();
    await Promise.all(
      listening.map(
        (server) =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections?.();
          })
      )
    );
    http.closeAllConnections?.();
    screenHttp.closeAllConnections?.();
  };
  try {
    for (const server of servers) {
      await new Promise((ok, fail) => {
        server.once('error', fail);
        server.listen(0, '127.0.0.1', () => ok());
      });
      listening.push(server);
    }
  } catch (err) {
    await close();
    throw err;
  }
  return {
    name: TRANSPORT_NAME,
    portA: doorA.address().port,
    portB: doorB.address().port,
    portHoldTls: holdTls.address().port,
    portHoldAnswer: holdAnswer.address().port,
    portScreen: screenDoor.address().port,
    holdMs,
    pinA: A.pin,
    counts: () => counts,
    reset: () => {
      counts = fresh();
    },
    close
  };
}

/**
 * What one configuration's transport rows left in the doors' counts: door A
 * issued over at least one key and read, in a handshake, a pin it issued over,
 * and door B served nothing. Returns the problems (sentences).
 */
export function transportProblems(counts, configuration) {
  const problems = [];
  if (counts.a.issued.length === 0) problems.push(`${configuration}: door A issued no certificate, so P330TransportTests never reached it`);
  if (!counts.a.read.some((pin) => counts.a.issued.includes(pin))) {
    problems.push(`${configuration}: door A read no pin it had issued over in a handshake, so no client identity was shown to be presented`);
  }
  if (counts.b.served !== 0) problems.push(`${configuration}: the wrong door served ${String(counts.b.served)} request(s); the pin must refuse it before a byte is written`);
  return problems;
}

/**
 * What one configuration's write rows left (Phase 317, (ad)): the door that
 * holds the handshake was dialled and READ NO REQUEST, because a write
 * cancelled before its bytes were handed is withheld; the door that holds its
 * answer read a request and answered it over a connection the phone kept,
 * because a write whose bytes were handed ends by its answer. Returns the
 * problems (sentences); an empty list is a pass.
 */
export function writeProblems(counts, configuration) {
  const problems = [];
  const t = counts.holdTls;
  const h = counts.holdAnswer;
  if (t.connections === 0) problems.push(`${configuration}: nothing dialled the door that holds the handshake, so P317WriteTransportTests' withheld write was not measured`);
  if (t.requests !== 0) problems.push(`${configuration}: the door that holds the handshake read ${String(t.requests)} request(s); a write cancelled before its bytes were handed must send nothing, ever`);
  if (h.requests === 0) problems.push(`${configuration}: the door that holds its answer read no request, so P317WriteTransportTests' handed write was not measured`);
  else if (h.answered === 0) problems.push(`${configuration}: the door that holds its answer read ${String(h.requests)} request(s) and answered none over a live connection (${String(h.hungUp)} hung up); a write whose bytes were handed must end by its answer, not by the cancel`);
  if (counts.writes.verified > 0 && counts.writes.answered === 0) problems.push(`${configuration}: door A verified ${String(counts.writes.verified)} write(s) and answered none`);
  return problems;
}

/**
 * What one configuration's reply rows left (Phase 318): door A read, verified
 * and answered at least one press and one message, through the shipping
 * client. Returns the problems (sentences).
 */
export function replyProblems(counts, configuration) {
  const problems = [];
  if (counts.writes.choose === 0) problems.push(`${configuration}: door A read no press (POST /v1/choose), so P318ReplyTransportTests never reached it`);
  if (counts.writes.say === 0) problems.push(`${configuration}: door A read no message (POST /v1/say), so P318ReplyTransportTests never reached it`);
  if (counts.writes.refused.length > 0) problems.push(`${configuration}: door A refused ${String(counts.writes.refused.length)} write(s) (${[...new Set(counts.writes.refused)].join(', ')}); every write the shipping client signs with the vectors' key holds`);
  return problems;
}

/** The test classes Phase 318 adds or changes (build/p318/SPEC.md §7.2, §10). */
export const P318_SUITES = Object.freeze(['ReplyTests', 'ReplyClientTests', 'P318ReplyTransportTests', 'CopyTests', 'DoorVectorTests', 'WriterTests']);

/**
 * What one configuration's Screen rows left (Phase 337, build/p337/SPEC.md
 * §6.4): the screen door read at least one screen read and one keys write,
 * every signature held, and xcodebuild's output holds every
 * `P337_TRANSPORT|<row>|<reading>` row reading what it must, and the grid's
 * two `P337_GRID|<size>|<bytes>|…` lines with the top size under 64 MB.
 * Returns the problems (sentences).
 */
export function screenProblems(counts, configuration, text) {
  const problems = [];
  const s = counts.screen;
  if (s.screenReads === 0) problems.push(`${configuration}: the screen door read no GET /v1/screen, so P337ScreenTransportTests never reached it`);
  if (s.keysPosts === 0) problems.push(`${configuration}: the screen door read no POST /v1/keys, so the keys row never reached it`);
  if (s.refused.length > 0) problems.push(`${configuration}: the screen door refused ${String(s.refused.length)} signature(s) (${[...new Set(s.refused)].join(', ')})`);
  const rows = new Map([...String(text).matchAll(/P337_TRANSPORT\|([a-z-]+)\|([^\s|]+)/g)].map((m) => [m[1], m[2]]));
  for (const [row, want] of Object.entries(P337_TRANSPORT_ROWS)) {
    if (!rows.has(row)) problems.push(`${configuration}: no P337_TRANSPORT|${row} line, so that row did not run to its end`);
    else if (rows.get(row) !== want) problems.push(`${configuration}: P337_TRANSPORT|${row} read ${String(rows.get(row))}, not ${want}`);
  }
  const grid = new Map([...String(text).matchAll(/P337_GRID\|([a-z]+)\|(\d+)\|/g)].map((m) => [m[1], Number(m[2])]));
  for (const size of ['fitted', 'top']) if (!grid.has(size)) problems.push(`${configuration}: no P337_GRID|${size} line, so the grid's cost was not read`);
  if (grid.has('top') && grid.get('top') >= P337_GRID_CEILING) problems.push(`${configuration}: the grid at its top size grew the app by ${String(grid.get('top'))} bytes, over 64 MB (needs_work, §Attack A24)`);
  return problems;
}

/** The test classes Phase 337 adds (build/p337/SPEC.md §6.4), each of which must appear in xcodebuild's own suite lines. */
export const P337_SUITES = Object.freeze([
  'P337ScreenTransportTests',
  'ScreenGridCostTests',
  'ScreenDecodeTests',
  'ScreenColourTests',
  'ScreenRowsTests',
  'ScreenKeysTests',
  'ScreenInputTests',
  'ScreenSelectionTests',
  'ScreenCoverTests',
  'ScreenGlyphTests',
  'EndTopTests',
  'DoorVectorTests',
  'CopyTests'
]);

/**
 * Phase 337.1: what each row of P3371ScrollbackTransportTests must print as
 * `P3371_TRANSPORT|<row>|<handshakes>` (the connections it opened, the counts
 * read's own taken out): build/p3371/SPEC.md §6.4, D30.
 */
export const P3371_TRANSPORT_ROWS = Object.freeze({ 'two-pages': '1', 'closed-page': '2', 'page-and-poll': '2', 'side-line': '1' });

/**
 * What one configuration's history rows left (Phase 337.1, build/p3371/SPEC.md
 * §6.4): the screen door read at least one page and one session read (the
 * Terminal's status re-read on its side line), and refused no page the
 * shipping client asked; and, given xcodebuild's output, every
 * `P3371_TRANSPORT|<row>|<handshakes>` row read what `P3371_TRANSPORT_ROWS`
 * says. Returns the problems (sentences).
 */
export function scrollbackProblems(counts, configuration, text = null) {
  const problems = [];
  const s = counts.screen;
  if ((s.scrollbackReads ?? 0) === 0) problems.push(`${configuration}: the screen door read no GET /v1/scrollback, so P3371ScrollbackTransportTests never reached it`);
  if ((s.sessionReads ?? 0) === 0) problems.push(`${configuration}: the screen door read no GET /v1/session, so the side line's status re-read never reached it`);
  if ((s.scrollbackRefused ?? 0) > 0) problems.push(`${configuration}: the screen door refused ${String(s.scrollbackRefused)} page ask(s) the shipping client spelled; a phone's target names the six, each once and in bounds`);
  if (text !== null) {
    const rows = new Map([...String(text).matchAll(/P3371_TRANSPORT\|([a-z-]+)\|([^\s|]+)/g)].map((m) => [m[1], m[2]]));
    for (const [row, want] of Object.entries(P3371_TRANSPORT_ROWS)) {
      if (!rows.has(row)) problems.push(`${configuration}: no P3371_TRANSPORT|${row} line, so that row did not run to its end`);
      else if (rows.get(row) !== want) problems.push(`${configuration}: P3371_TRANSPORT|${row} read ${String(rows.get(row))} handshake(s), not ${want}`);
    }
  }
  return problems;
}

/** The test classes Phase 337.1 adds (build/p3371/SPEC.md §7.3), each of which must appear in xcodebuild's own suite lines. */
export const P3371_SUITES = Object.freeze([
  'ScrollbackModelTests',
  'ScreenScrollerTests',
  'ScrollbackDecodeTests',
  'P3371ScrollbackTransportTests',
  'TerminalRouteTests',
  'CatchUpPageTests',
  'StatusLineTests'
]);

/**
 * The test classes Phase 337.3 adds (build/p3373/SPEC.md §7.2), each of which
 * must appear in xcodebuild's own suite lines: the fill's model, the Terminal's
 * chrome sideways and the ⋯ menu. The verifier of 2026-10-08 found none of
 * them in any list, so one silently dropping out of the bundle read as a pass.
 */
export const P3373_SUITES = Object.freeze([
  'TerminalFillTests',
  'TerminalChromeTests',
  'TerminalMenuTests'
]);

/**
 * The test classes Phase 317 adds or changes (build/p317/SPEC.md §7.3), each of
 * which must appear in xcodebuild's own suite lines for a configuration's run.
 */
export const P317_SUITES = Object.freeze([
  'EndTests',
  'EndBatchTests',
  'OwnerCheckTests',
  'WriteClientTests',
  'WriterTests',
  'P317WriteTransportTests',
  'EndWordsTests',
  'UnpairTests',
  'SettingsTests',
  'CopyTests',
  'InfoPlistTests',
  'DoorVectorTests'
]);

// ---------------------------------------------------------------------------
// Phase 333.11: the frozen wire's phone half (build/p33311/SPEC.md §8.3, §8.4)
// ---------------------------------------------------------------------------
//
// `DoorFrozenTests` holds today's phone to every frozen set under
// ios/TortieTests/Fixtures/frozen/ (an old Mac, a new phone) and prints one row
// per item, `P33311|<label>|<item>|<expect>|<got>`. The rows it MUST print are
// read here from the SEALED files and today's vectors, never from the test, so
// a test that printed less, twice or wrong is caught by a count it does not
// control. Its refuse arms are asserted only while the phone's decoders read
// exactly a set (D10): before the runs the reader of build/p33311/swift-wire.mjs
// reads today's phone, and every set whose projection equals today's is named
// in `P33311_PROOF`, handed to the tests.

/** The test class Phase 333.11 adds, which must appear in xcodebuild's own suite lines. */
export const P33311_SUITES = Object.freeze(['DoorFrozenTests']);

/** Where the frozen sets live, beside the vectors the phone's tests read. */
export const FROZEN_DIR = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'frozen');

const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A JSON value with every object's keys sorted, written with no spaces. */
export function canonicalJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v !== null && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  return JSON.stringify(sort(value));
}

/** The route an answer's name belongs to: the name up to its first `-`, or the whole name. */
export function answerRoute(name) {
  const at = String(name).indexOf('-');
  return at === -1 ? String(name) : String(name).slice(0, at);
}

/**
 * Every frozen set under `dir`: `{ label, file, wire, vectors }`, each set's
 * vectors held to the sha256 sealed in its wire file. `problems` names a file
 * that does not read, a vectors file that moved, and a directory with no set.
 */
export function frozenSets(dir = FROZEN_DIR) {
  const problems = [];
  const sets = [];
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.wire.json')).sort() : [];
  for (const name of names) {
    let wire;
    try {
      wire = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    } catch (err) {
      problems.push(`${name} does not read as JSON: ${String(err?.message ?? err)}`);
      continue;
    }
    const file = typeof wire?.vectors?.file === 'string' ? wire.vectors.file : '';
    if (typeof wire?.label !== 'string' || wire.label === '' || file === '' || file.includes('/')) {
      problems.push(`${name} names no label or no vectors file of its own`);
      continue;
    }
    let bytes;
    try {
      bytes = readFileSync(join(dir, file));
    } catch {
      problems.push(`${name}: its vectors file ${file} is not beside it`);
      continue;
    }
    if (sha256Hex(bytes) !== wire.vectors.sha256) {
      problems.push(`${name}: ${file} is not the file the set was sealed over (sha256 ${sha256Hex(bytes)}); a frozen set is never edited by hand`);
      continue;
    }
    let vectors;
    try {
      vectors = JSON.parse(bytes.toString('utf8'));
    } catch (err) {
      problems.push(`${name}: ${file} does not read as JSON: ${String(err?.message ?? err)}`);
      continue;
    }
    sets.push({ label: wire.label, file: name, wire, vectors });
  }
  if (sets.length === 0 && problems.length === 0) {
    problems.push(`no frozen set under ${relative(ROOT, dir) || dir}, so DoorFrozenTests has nothing to hold the phone to (node build/assert-door-only-adds.mjs --freeze launch)`);
  }
  return { sets, problems };
}

/** Every leaf path where two JSON values differ, `/`-joined, objects by key and arrays by index. */
export function jsonPathsDiffer(a, b, at = '') {
  const isObject = (v) => v !== null && typeof v === 'object';
  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b)) return J(a) === J(b) ? [] : [at === '' ? '/' : at];
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return keys.flatMap((k) => jsonPathsDiffer(a[k], b[k], `${at}/${k}`));
}

/** A projection as a JSON value, whether the reader answered text or a value. */
function projectionValue(p) {
  if (typeof p === 'string') {
    try {
      return JSON.parse(p);
    } catch {
      return p;
    }
  }
  return p;
}

/**
 * Before the runs: the frozen sets, today's phone read by the reader, and the
 * labels whose refuse arms this run asserts. A set whose projection equals
 * today's is PROVEN. A set whose phone files are every one byte-identical to
 * the hashes it was frozen over, yet whose projection differs, is a problem:
 * the reader read one set of bytes two ways (P0's consistency, asked again
 * here), and every refuse arm would print `skipped` forever. `reader` is the
 * module, for the self-test; by default build/p33311/swift-wire.mjs.
 */
export async function frozenProof({ root = ROOT, dir = FROZEN_DIR, reader = null } = {}) {
  const { sets, problems } = frozenSets(dir);
  const proof = [];
  const said = [];
  let mod = reader;
  if (mod === null) {
    try {
      mod = await import('../p33311/swift-wire.mjs');
    } catch (err) {
      problems.push(`the phone's reader, build/p33311/swift-wire.mjs, could not be loaded: ${String(err?.message ?? err)}`);
      return { sets, problems, proof, said };
    }
  }
  // Every scanner proves itself first: the reader reads its own fixtures
  // before any projection of it is trusted (build/p33311/SPEC.md §5.6).
  if (typeof mod.proveReader === 'function') {
    const proved = mod.proveReader(join(root, 'build', 'p33311', 'fixtures'));
    if (proved.problems.length > 0) {
      problems.push(...proved.problems.slice(0, 10).map((p) => `the phone's reader misreads its own fixture: ${p}`));
      return { sets, problems, proof, said };
    }
    said.push(`the phone's reader read its ${String(proved.files)} fixture(s) as expected`);
  }
  let today;
  try {
    const read = mod.readPhoneWire(root);
    if (Array.isArray(read?.unread) && read.unread.length > 0) said.push(`the reader found ${String(read.unread.length)} statement(s) it does not read in today's phone (gate:onlyadd's P0): ${read.unread.slice(0, 3).map((u) => (typeof u === 'string' ? u : J(u))).join('; ')}`);
    today = projectionValue(mod.projection(read));
  } catch (err) {
    problems.push(`the phone's reader could not read today's phone: ${String(err?.message ?? err)}`);
    return { sets, problems, proof, said };
  }
  for (const set of sets) {
    let frozen;
    try {
      frozen = projectionValue(typeof mod.frozenProjection === 'function' ? mod.frozenProjection(set.wire) : mod.projection(set.wire));
    } catch (err) {
      problems.push(`${set.label}: the reader could not project the sealed set: ${String(err?.message ?? err)}`);
      continue;
    }
    if (canonicalJson(frozen) === canonicalJson(today)) {
      proof.push(set.label);
      said.push(`the phone's decoders read exactly ${set.label}: its refuse arms are asserted`);
      continue;
    }
    const paths = jsonPathsDiffer(frozen, today);
    said.push(`the phone's decoders differ from ${set.label} at ${String(paths.length)} path(s) (${paths.slice(0, 5).join(', ')}): its refuse arms print skipped`);
    const phoneFiles = Object.entries(set.wire.read ?? {}).filter(([p]) => p.startsWith('ios/Tortie/'));
    const identical = phoneFiles.length > 0 && phoneFiles.every(([p, hash]) => {
      try {
        return sha256Hex(readFileSync(join(root, p))) === hash;
      } catch {
        return false;
      }
    });
    if (identical) {
      problems.push(`${set.label}: every phone file it was frozen from (${phoneFiles.map(([p]) => p).join(', ')}) is byte-identical today, yet the reader's projection differs at ${String(paths.length)} path(s): the reader reads one set of bytes two ways, so the refuse arms would never be asserted`);
    }
  }
  return { sets, problems, proof, said };
}

/**
 * Every row `DoorFrozenTests` must print for one set, as a map from item to
 * `{ expect, want }`: `expect` is the row's own column, `want` what it must
 * read. Read from the SEALED set and from today's vectors' answers alone.
 */
export function frozenRowsWanted(set, todayAnswers, proven) {
  const rows = new Map();
  const accept = { expect: 'accept', want: 'accept' };
  const same = { expect: 'same', want: 'same' };
  for (const key of Object.keys(set.wire.instances ?? {}).sort()) {
    rows.set(`decode:${key}`, accept);
    if (key.startsWith('answers/') && typeof set.vectors?.answers?.[key.slice('answers/'.length)]?.withUnknown === 'string') rows.set(`decode:${key}+unknown`, accept);
  }
  const asserted = proven.has(set.label);
  for (const arm of set.wire.arms ?? []) {
    rows.set(`arm:${String(arm.id)}`, { expect: String(arm.expect), want: arm.expect === 'refuse' && !asserted ? 'skipped' : String(arm.expect) });
  }
  for (const r of set.vectors?.requests ?? []) rows.set(`request:${String(r.name)}`, same);
  if (set.vectors?.seal !== undefined) rows.set('request:seal', same);
  if (set.vectors?.pushSeal !== undefined) rows.set('request:pushSeal', same);
  const routes = new Set((set.wire.routes ?? []).map((r) => r.id));
  for (const name of Object.keys(todayAnswers ?? {}).sort()) {
    if (routes.has(answerRoute(name))) rows.set(`today:${name}`, accept);
  }
  return rows;
}

/** Every `P33311|…` row in xcodebuild's output, wherever on its line it starts. */
export function frozenRowsPrinted(text) {
  const rows = [];
  for (const line of String(text).split('\n')) {
    const at = line.indexOf('P33311|');
    if (at === -1) continue;
    const fields = line.slice(at).trim().split('|');
    if (fields.length !== 5) {
      rows.push({ malformed: line.slice(at).trim() });
      continue;
    }
    rows.push({ label: fields[1], item: fields[2], expect: fields[3], got: fields[4] });
  }
  return rows;
}

/**
 * One configuration's rows, graded against every sealed set: every row the
 * set names exactly once, its expect column the sealed one, and what it read
 * `accept` for accept, `same` for same, and for a refuse arm `refuse` when the
 * set is proven and `skipped` when it is not. A missing, doubled, wrong or
 * unnamed row is a problem; `lines` says one summary per set.
 */
export function frozenRowProblems(text, sets, proven, todayAnswers, configuration) {
  const problems = [];
  const lines = [];
  const printed = new Map();
  for (const row of frozenRowsPrinted(text)) {
    if (row.malformed !== undefined) {
      problems.push(`${configuration}: a P33311 row that is not five fields: ${row.malformed.slice(0, 160)}`);
      continue;
    }
    const key = `${row.label}|${row.item}`;
    printed.set(key, [...(printed.get(key) ?? []), row]);
  }
  const labels = new Set(sets.map((s) => s.label));
  for (const set of sets) {
    const wanted = frozenRowsWanted(set, todayAnswers, proven);
    const tally = { held: 0, refused: 0, skipped: 0, accepted: 0 };
    for (const [item, w] of wanted) {
      const got = printed.get(`${set.label}|${item}`) ?? [];
      if (got.length === 0) problems.push(`${configuration}: ${set.label}: no row for ${item}, so it never ran`);
      else if (got.length > 1) problems.push(`${configuration}: ${set.label}: ${item} printed ${String(got.length)} rows, not one`);
      else if (got[0].expect !== w.expect) problems.push(`${configuration}: ${set.label}: ${item} expects ${got[0].expect}, and the sealed set says ${w.expect}`);
      else if (got[0].got !== w.want) problems.push(`${configuration}: ${set.label}: ${item} read ${got[0].got}, not ${w.want}`);
      else {
        tally.held += 1;
        if (item.startsWith('arm:')) {
          if (w.want === 'refuse') tally.refused += 1;
          else if (w.want === 'skipped') tally.skipped += 1;
          else tally.accepted += 1;
        }
      }
    }
    for (const [key, rows] of printed) {
      const [label, item] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
      if (label === set.label && !wanted.has(item)) problems.push(`${configuration}: ${set.label}: a row for ${item}, which the sealed set does not name (${String(rows.length)} printed)`);
    }
    lines.push(
      `${configuration}: frozen set ${set.label}: ${String(tally.held)} of ${String(wanted.size)} rows as sealed; ` +
        `arms ${String(tally.refused)} refused, ${String(tally.accepted)} accepted, ${String(tally.skipped)} skipped${proven.has(set.label) ? '' : ' (the phone no longer reads exactly this set)'}`
    );
  }
  const strangers = new Set([...printed.keys()].map((key) => key.slice(0, key.indexOf('|'))).filter((label) => !labels.has(label)));
  for (const label of strangers) problems.push(`${configuration}: rows for a set named ${label}, which test:ios does not hold`);
  return { problems, lines };
}

/**
 * `--self-test`'s half for Phase 333.11: the grader above, held both ways over
 * a set made here, with no Xcode, no Simulator and no reader of the real phone.
 * Every check names the clause of §8.3 it holds; each one fails when that
 * clause is taken out of the grader.
 */
export async function frozenGraderSelfTest() {
  const { writeFileSync } = await import('node:fs');
  const results = [];
  const check = (what, ok, said = '') => {
    results.push(ok);
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || said === '' ? '' : `: ${said.slice(0, 600)}`}\n`);
  };
  const scratch = mkdtempSync(join(tmpdir(), 'p33311-test-ios-frozen-'));
  try {
    const vectorsText = J({ answers: { blocked: { json: '{}', withUnknown: '{}' }, 'end-done': { json: '{}' } }, requests: [{ name: 'blocked' }, { name: 'end' }], seal: {}, pushSeal: {} });
    const wire = {
      format: 1,
      label: 'self',
      routes: [{ id: 'blocked' }, { id: 'end' }],
      instances: { 'answers/blocked': 'blocked', 'answers/end-done': 'end' },
      arms: [
        { id: 'A0001', instance: 'answers/blocked', pointer: '/ageNote', op: 'remove', expect: 'refuse' },
        { id: 'A0002', instance: 'answers/blocked', pointer: '', op: 'unknown', expect: 'accept' }
      ],
      vectors: { file: 'self.vectors.json', sha256: sha256Hex(Buffer.from(vectorsText, 'utf8')) },
      types: { PocketBlockedAnswer: { fields: { ageNote: { presence: 'required' } } } },
      read: {}
    };
    const set = { label: 'self', file: 'self.wire.json', wire, vectors: JSON.parse(vectorsText) };
    const today = { blocked: {}, 'end-done': {}, 'scrollback-page': {} };
    const proven = new Set(['self']);
    const none = new Set();
    const rowsOf = (wanted, label = 'self') => [...wanted].map(([item, w]) => `P33311|${label}|${item}|${w.expect}|${w.want}`);
    const wantedProven = frozenRowsWanted(set, today, proven);
    const clean = rowsOf(wantedProven);
    // xcodebuild may put words before a row; the row is read from its marker.
    const text = (lines) => ['Test Suite \'DoorFrozenTests\' started', ...lines.map((l, i) => (i === 0 ? `    ${l}` : l)), 'Test Suite \'DoorFrozenTests\' passed'].join('\n');
    const grade = (lines, p = proven) => frozenRowProblems(text(lines), [set], p, today, 'self-test');

    check('the sealed set names its rows: 11, today only on its own routes', wantedProven.size === 11 && wantedProven.has('today:end-done') && !wantedProven.has('today:scrollback-page') && wantedProven.has('decode:answers/blocked+unknown') && !wantedProven.has('decode:answers/end-done+unknown'), J([...wantedProven.keys()]));
    const passed = grade(clean);
    check('a clean run passes, its summary counting every row', passed.problems.length === 0 && /11 of 11 rows as sealed; arms 1 refused, 1 accepted, 0 skipped/.test(passed.lines[0] ?? ''), J(passed));
    const unproven = rowsOf(frozenRowsWanted(set, today, none));
    check('a run whose phone no longer reads the set passes with its refuse arm skipped', grade(unproven, none).problems.length === 0 && unproven.includes('P33311|self|arm:A0001|refuse|skipped'), J(grade(unproven, none).problems));
    const named = (lines, p, needle) => {
      const r = grade(lines, p).problems;
      return r.length === 1 && r[0].includes(needle);
    };
    check('a missing arm row is named', named(clean.filter((l) => !l.includes('|arm:A0001|')), proven, 'no row for arm:A0001'));
    check('a refuse arm skipped while the proof holds is named', named(clean.map((l) => l.replace('arm:A0001|refuse|refuse', 'arm:A0001|refuse|skipped')), proven, 'arm:A0001 read skipped, not refuse'));
    check('a refuse arm asserted while the proof does not hold is named', named(clean, none, 'arm:A0001 read refuse, not skipped'));
    check('an accept arm that refused is named', named(clean.map((l) => l.replace('arm:A0002|accept|accept', 'arm:A0002|accept|refuse')), proven, 'arm:A0002 read refuse, not accept'));
    check('a doubled row is named', named([...clean, clean[3]], proven, 'printed 2 rows, not one'));
    check('a row whose expect is not the sealed one is named', named(clean.map((l) => l.replace('arm:A0001|refuse|refuse', 'arm:A0001|accept|refuse')), proven, 'arm:A0001 expects accept'));
    check('a row the sealed set does not name is named', named([...clean, 'P33311|self|arm:A9999|accept|accept'], proven, 'arm:A9999, which the sealed set does not name'));
    check('rows for a set test:ios does not hold are named', named([...clean, 'P33311|other|decode:answers/blocked|accept|accept'], proven, 'a set named other'));
    check('a row that is not five fields is named', named([...clean, 'P33311|self|decode:answers/blocked|accept'], proven, 'not five fields'));
    check('a decode with unknown keys that never printed is named', named(clean.filter((l) => !l.includes('+unknown')), proven, 'no row for decode:answers/blocked+unknown'));
    check('a request this phone no longer sends is named', named(clean.map((l) => l.replace('request:end|same|same', 'request:end|same|differs:body')), proven, 'request:end read differs:body, not same'));
    check('a today row that refused is named', named(clean.map((l) => l.replace('today:end-done|accept|accept', 'today:end-done|accept|refuse')), proven, 'today:end-done read refuse'));
    check('a run that printed nothing names every row', grade([], proven).problems.length === wantedProven.size);
    check('suitesNotRun names DoorFrozenTests when it never ran', J(suitesNotRun('', P33311_SUITES)) === J(['DoorFrozenTests']) && suitesNotRun("Test Suite 'DoorFrozenTests' failed at 2026-10-08 12:00:00.000.", P33311_SUITES).length === 0);

    // The sets on disk.
    const dir = join(scratch, 'frozen');
    mkdirSync(dir, { recursive: true });
    const empty = frozenSets(dir);
    check('a directory with no frozen set is a problem', empty.sets.length === 0 && empty.problems.length === 1 && empty.problems[0].includes('no frozen set'), J(empty));
    writeFileSync(join(dir, 'self.wire.json'), J(wire));
    writeFileSync(join(dir, 'self.vectors.json'), vectorsText);
    const read = frozenSets(dir);
    check('a sealed set reads, its vectors held to its sha256', read.problems.length === 0 && read.sets.length === 1 && read.sets[0].label === 'self', J(read.problems));
    writeFileSync(join(dir, 'self.vectors.json'), vectorsText.replace('blocked', 'blockeD'));
    const moved = frozenSets(dir);
    check('a vectors file edited after its seal is named', moved.sets.length === 0 && moved.problems.length === 1 && moved.problems[0].includes('not the file the set was sealed over'), J(moved.problems));
    writeFileSync(join(dir, 'self.vectors.json'), vectorsText);

    // The proof, over a reader made here.
    const root = join(scratch, 'root');
    mkdirSync(join(root, 'ios', 'Tortie'), { recursive: true });
    writeFileSync(join(root, 'ios', 'Tortie', 'X.swift'), 'struct X {}\n');
    const xHash = sha256Hex(readFileSync(join(root, 'ios', 'Tortie', 'X.swift')));
    const reader = (todayTypes) => ({ readPhoneWire: () => ({ types: todayTypes, unread: [] }), projection: (w) => canonicalJson({ types: w.types }) });
    const writeWire = (extra) => writeFileSync(join(dir, 'self.wire.json'), J({ ...wire, ...extra }));
    writeWire({});
    const same = await frozenProof({ root, dir, reader: reader(wire.types) });
    check('a phone that reads exactly the set proves it', same.problems.length === 0 && J(same.proof) === J(['self']) && same.said.some((s) => s.includes('read exactly self')), J(same));
    const relaxed = { PocketBlockedAnswer: { fields: { ageNote: { presence: 'optional' } } } };
    writeWire({ read: { 'ios/Tortie/X.swift': `${xHash.slice(0, -1)}${xHash.endsWith('0') ? '1' : '0'}` } });
    const changed = await frozenProof({ root, dir, reader: reader(relaxed) });
    check('a phone that changed proves nothing and is not a problem', changed.problems.length === 0 && changed.proof.length === 0 && changed.said.some((s) => s.includes('differ from self at 1 path(s)')), J(changed));
    writeWire({ read: { 'ios/Tortie/X.swift': xHash, 'src/main/pocket/door/table.ts': 'f'.repeat(64) } });
    const twoWays = await frozenProof({ root, dir, reader: reader(relaxed) });
    check('byte-identical phone files with a differing projection are a problem', twoWays.problems.length === 1 && twoWays.problems[0].includes('reads one set of bytes two ways') && twoWays.proof.length === 0, J(twoWays));
    const broken = await frozenProof({ root, dir, reader: { readPhoneWire: () => { throw new Error('unread'); }, projection: () => '' } });
    check('a reader that cannot read the phone is a problem', broken.problems.length === 1 && broken.problems[0].includes('could not read'), J(broken.problems));
    writeWire({});
    const unproved = await frozenProof({ root, dir, reader: { ...reader(wire.types), proveReader: () => ({ files: 1, problems: ['f.swift.txt: types read wrong'] }) } });
    check('a reader that misreads its own fixture is trusted with nothing', unproved.problems.length === 1 && unproved.problems[0].includes('misreads its own fixture') && unproved.proof.length === 0, J(unproved));
    const proved = await frozenProof({ root, dir, reader: { ...reader(wire.types), proveReader: () => ({ files: 3, problems: [] }) } });
    check('a reader that reads its own fixtures is asked about the phone', proved.problems.length === 0 && J(proved.proof) === J(['self']) && proved.said.some((s) => s.includes('read its 3 fixture(s)')), J(proved));
  } catch (err) {
    check('the frozen grader self-test ran', false, String(err?.stack ?? err));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const failed = results.filter((ok) => !ok).length;
  say(failed === 0 ? `frozen grader self-test PASS: ${String(results.length)} checks` : `frozen grader self-test FAIL: ${String(failed)} of ${String(results.length)}`);
  return failed === 0;
}

/** The suites of `names` that xcodebuild's output never says passed or failed. */
export function suitesNotRun(text, names = P317_SUITES) {
  const ran = new Set([...String(text).matchAll(/Test Suite '([A-Za-z0-9_]+)' (?:passed|failed)/g)].map((m) => m[1]));
  return names.filter((n) => !ran.has(n));
}

/**
 * True when node was asked to run THIS file, false when another script imports
 * it for `builtAppProblems`, `appAt`, `signedProblem` or `summaryOf`. Everything
 * below the exports is `main`, because an import that ran it would build, boot
 * a Simulator and run the tests with nobody holding the lock (it happened once,
 * while 316.4 was being built). Both sides are resolved through the file
 * system, because node reports the main module by its real path and
 * `/tmp` is `/private/tmp` on a Mac: a check that compared spellings would
 * exit 0 having done nothing.
 */
function invokedDirectly() {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(resolve(entry)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}


// ---------------------------------------------------------------------------
// --self-test: the doors driven by node (Phase 317), no Xcode, no Simulator
// ---------------------------------------------------------------------------

/**
 * Every claim the doors make, held both ways by a node client before any
 * Swift is pointed at them: a write the vectors' phone signs is verified and
 * answered with its id echoed; the same signature over a body with one byte
 * changed is refused `signature` and answered 404; a body with no id gets the
 * Mac's `refused malformed` with `""`; a connection closed while its
 * handshake is held leaves ZERO requests read and one that waits is read (the
 * control, so a door that reads nothing could not pass); an answer held after
 * its request is read is answered when the client keeps the connection and
 * counted hung up when it does not; and `writeProblems` and `suitesNotRun`
 * read each of those shapes the way the run relies on.
 */
async function doorsSelfTest() {
  const { connect: tlsConnect } = await import('node:tls');
  const { generateKeyPairSync, randomBytes } = await import('node:crypto');
  const phoneMod = await import('./node-phone.mjs');
  const results = [];
  const check = (what, ok, said = '') => {
    results.push(ok);
    process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${what}${said === '' ? '' : `: ${said}`}\n`);
  };
  const scratch = mkdtempSync(join(tmpdir(), 'p317-test-ios-doors-'));
  const hold = 600;
  let doors = null;
  try {
    doors = await startTransportDoors(join(scratch, 'doors'), { holdMs: hold });
    const v = JSON.parse(readFileSync(join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json'), 'utf8'));
    const signPrivate = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(v.keys.phoneSigningSeed, 'hex')]), format: 'der', type: 'pkcs8' });
    const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const ck = b64u(client.publicKey.export({ type: 'spki', format: 'der' }));
    const door = (port) => ({ port, name: doors.name, publicPort: 8443, pin: doors.pinA });
    const issued = await phoneMod.request({ door: door(doors.portA), method: 'POST', target: '/p330/issue', body: JSON.stringify({ ck }) });
    const der = Buffer.from(JSON.parse(issued.body).cert, 'base64url');
    const certPem = `-----BEGIN CERTIFICATE-----\n${(der.toString('base64').match(/.{1,64}/g) ?? []).join('\n')}\n-----END CERTIFICATE-----\n`;
    const identity = { certPem, clientPrivatePem: client.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
    // The vectors' phone, as node-phone.mjs's signer takes one.
    const vectorPhone = { id: v.identity.phoneId, binding: v.identity.binding, signPrivate };
    const signed = (target, body, sendBody = body) => ({
      headers: { ...phoneMod.signedHeadersFor(vectorPhone, 'POST', target, Buffer.from(body, 'utf8')), 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(sendBody)) },
      body: sendBody
    });
    const id = randomBytes(16).toString('hex');
    const endBody = JSON.stringify({ batch: false, session: '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c02', write: id });
    const post = (port, target, s, extra = {}) => phoneMod.request({ door: door(port), method: 'POST', target, identity, ...s, ...extra });

    // Door A's writes.
    const honest = await post(doors.portA, '/v1/end', signed('/v1/end', endBody));
    const said = (() => { try { return JSON.parse(honest.body); } catch { return null; } })();
    check('an honest end is verified and answered with its id echoed', honest.status === 200 && said?.write === id && said?.outcome === 'done' && said?.verb === 'end', `${String(honest.status)} ${honest.body}`);
    const tampered = await post(doors.portA, '/v1/end', signed('/v1/end', endBody, endBody.replace('c02', 'c03')));
    check('the same signature over a body with one byte changed is answered 404', tampered.status === 404 && doors.counts().writes.refused.includes('signature'), `${String(tampered.status)}, refused ${J(doors.counts().writes.refused)}`);
    const unpairId = randomBytes(16).toString('hex');
    const unpaired = await post(doors.portA, '/v1/unpair', signed('/v1/unpair', JSON.stringify({ write: unpairId })));
    check('the removed unpair path is no write: answered 404, with no body', unpaired.status === 404 && unpaired.body === '', `${String(unpaired.status)} ${unpaired.body}`);
    const bad = await post(doors.portA, '/v1/end', signed('/v1/end', '{"x":1}'));
    const badSaid = (() => { try { return JSON.parse(bad.body); } catch { return null; } })();
    check('a body with no write id gets refused malformed with "" echoed', bad.status === 200 && badSaid?.write === '' && badSaid?.outcome === 'refused' && badSaid?.reason === 'malformed' && typeof badSaid?.sentence === 'string' && badSaid.sentence.length > 0, bad.body);
    const unsigned = await phoneMod.request({ door: door(doors.portA), method: 'POST', target: '/v1/end', identity, body: endBody });
    check('a write with no signature is answered 404', unsigned.status === 404);
    const noCert = await phoneMod.request({ door: door(doors.portA), method: 'POST', target: '/v1/end', ...signed('/v1/end', endBody) });
    check('a write with no client identity is cut before an answer', noCert.status === 0, noCert.error ?? String(noCert.status));
    const a = doors.counts().writes;
    check('door A counted its writes by route', a.end === 4 && a.unpair === undefined && a.verified === 2 && a.answered === 2, J(a));
    doors.reset();
    // Phase 318: the press and the message, each verified over its body and
    // answered under its own verb with its id echoed; a body near the say cap
    // read whole; the reply counts read by replyProblems both ways.
    const pressId = randomBytes(16).toString('hex');
    const pressBody = JSON.stringify({ mark: 'a1b2c3d4e5f6', marker: '1', question: '0123456789abcdef-42', session: 's1', write: pressId });
    const press = await post(doors.portA, '/v1/choose', signed('/v1/choose', pressBody));
    const pressSaid = (() => { try { return JSON.parse(press.body); } catch { return null; } })();
    check('an honest press is verified and answered as choose with its id echoed', press.status === 200 && pressSaid?.verb === 'choose' && pressSaid?.write === pressId && pressSaid?.outcome === 'done', `${String(press.status)} ${press.body}`);
    const sayId = randomBytes(16).toString('hex');
    const sayBody = JSON.stringify({ session: 's1', text: `${'x'.repeat(20_000)} \/ "quoted"`, write: sayId });
    const message = await post(doors.portA, '/v1/say', signed('/v1/say', sayBody));
    const sayAnswer = (() => { try { return JSON.parse(message.body); } catch { return null; } })();
    check('an honest message of 20,000 bytes is read whole, verified and answered as say with its id echoed', message.status === 200 && sayAnswer?.verb === 'say' && sayAnswer?.write === sayId, `${String(message.status)} ${message.body.slice(0, 120)}`);
    const forgedSay = await post(doors.portA, '/v1/say', signed('/v1/say', sayBody, sayBody.replace('quoted', 'QUOTED')));
    check('a message whose body changed after signing is answered 404', forgedSay.status === 404, String(forgedSay.status));
    const r = doors.counts();
    check('door A counted the press and the message', r.writes.choose === 1 && r.writes.say === 2 && r.writes.verified === 2, J(r.writes));
    check('replyProblems refuses the refused message it saw', replyProblems(r, 'self-test').length === 1, J(replyProblems(r, 'self-test')));
    const clean = structuredClone(r);
    clean.writes.refused = [];
    check('replyProblems passes a press and a message read and held', replyProblems(clean, 'self-test').length === 0, J(replyProblems(clean, 'self-test')));
    check('replyProblems refuses a run that pressed nothing', replyProblems({ ...clean, writes: { ...clean.writes, choose: 0 } }, 'self-test').length > 0);
    check('replyProblems refuses a run that sent no message', replyProblems({ ...clean, writes: { ...clean.writes, say: 0 } }, 'self-test').length > 0);
    doors.reset();

    // (ad)'s first hold: closed while held, nothing read.
    const early = tlsConnect({ host: '127.0.0.1', port: doors.portHoldTls, servername: doors.name, minVersion: 'TLSv1.3', rejectUnauthorized: false, cert: identity.certPem, key: identity.clientPrivatePem });
    early.on('error', () => undefined);
    await new Promise((r) => setTimeout(r, Math.floor(hold / 4)));
    early.destroy();
    await new Promise((r) => setTimeout(r, hold + 400));
    // (ad)'s second hold: the request read, the answer late, the connection kept.
    const startedAt = Date.now();
    const late = post(doors.portHoldAnswer, '/v1/end', signed('/v1/end', JSON.stringify({ batch: true, session: 's1', write: id })));
    let arrived = false;
    for (let i = 0; i < 40 && !arrived; i += 1) {
      const c = await phoneMod.request({ door: door(doors.portA), method: 'GET', target: '/p317/counts', identity });
      arrived = c.status === 200 && JSON.parse(c.body).holdAnswer.requests >= 1;
      if (!arrived) await new Promise((r) => setTimeout(r, 50));
    }
    const lateGot = await late;
    const tookMs = Date.now() - startedAt;
    const held = doors.counts();
    check('a handshake held and closed before it ends completes no handshake and reads no request', held.holdTls.connections === 1 && held.holdTls.handshakes === 0 && held.holdTls.requests === 0, J(held.holdTls));
    check('GET /p317/counts says when the held write\'s request arrived', arrived);
    check('an answer held after its request is answered over the connection kept', lateGot.status === 200 && JSON.parse(lateGot.body).write === id && held.holdAnswer.requests === 1 && held.holdAnswer.answered === 1 && tookMs >= hold, `${String(lateGot.status)} after ${String(tookMs)} ms, ${J(held.holdAnswer)}`);
    check('writeProblems passes that run', writeProblems(held, 'self-test').length === 0, J(writeProblems(held, 'self-test')));
    const planted = (edit) => {
      const c = structuredClone(held);
      edit(c);
      return writeProblems(c, 'self-test').length > 0;
    };
    check('writeProblems refuses a held handshake that read a request', planted((c) => void (c.holdTls.requests = 1)));
    check('writeProblems refuses a held handshake nobody dialled', planted((c) => void (c.holdTls.connections = 0)));
    check('writeProblems refuses a held answer nobody asked for', planted((c) => void (c.holdAnswer.requests = 0)));
    check('writeProblems refuses writes verified and never answered', planted((c) => {
      c.writes.verified = 1;
      c.writes.answered = 0;
    }));
    check('writeProblems refuses a held answer the phone hung up on', planted((c) => {
      c.holdAnswer.answered = 0;
      c.holdAnswer.hungUp = 1;
    }));

    // The controls: a held handshake that is waited out IS read, and a held
    // answer whose client hangs up is counted as hung up and not answered.
    doors.reset();
    const waited = await post(doors.portHoldTls, '/v1/end', signed('/v1/end', endBody));
    check('the control: a held handshake waited out is read and answered', waited.status === 200 && doors.counts().holdTls.requests === 1 && doors.counts().holdTls.answered === 1, `${String(waited.status)} ${J(doors.counts().holdTls)}`);
    doors.reset();
    const gone = post(doors.portHoldAnswer, '/v1/end', signed('/v1/end', endBody), { timeoutMs: Math.floor(hold / 2) });
    const goneGot = await gone;
    await new Promise((r) => setTimeout(r, hold + 400));
    check('the control: a held answer whose client hung up is not counted answered', goneGot.status === 0 && doors.counts().holdAnswer.requests === 1 && doors.counts().holdAnswer.answered === 0 && doors.counts().holdAnswer.hungUp === 1, J(doors.counts().holdAnswer));

    // Phase 337: the screen door, over connections it keeps.
    doors.reset();
    {
      const getSigned = (target) => ({ ...phoneMod.signedHeadersFor(vectorPhone, 'GET', target, Buffer.alloc(0)) });
      /** One TLS connection to the screen door, with a reader of one HTTP/1.1 answer at a time. */
      const line = async () => {
        const socket = tlsConnect({ host: '127.0.0.1', port: doors.portScreen, servername: doors.name, minVersion: 'TLSv1.3', rejectUnauthorized: false, cert: identity.certPem, key: identity.clientPrivatePem });
        socket.on('error', () => undefined);
        await new Promise((ok) => socket.once('secureConnect', ok));
        let buf = Buffer.alloc(0);
        let ended = false;
        socket.on('data', (c) => {
          buf = Buffer.concat([buf, c]);
        });
        socket.on('close', () => {
          ended = true;
        });
        const oneAnswer = async (ms = 2_000) => {
          const until = Date.now() + ms;
          for (;;) {
            const head = buf.indexOf('\r\n\r\n');
            if (head !== -1) {
              const text = buf.subarray(0, head).toString('latin1');
              const length = Number(/content-length: *(\d+)/i.exec(text)?.[1] ?? '0');
              if (buf.length >= head + 4 + length) {
                const body = buf.subarray(head + 4, head + 4 + length).toString('utf8');
                buf = buf.subarray(head + 4 + length);
                return { status: Number(text.split(' ')[1]), head: text, body };
              }
            }
            if (ended || Date.now() > until) return null;
            await new Promise((r) => setTimeout(r, 10));
          }
        };
        const ask = async (method, target, headers, body = '') => {
          const lines = [`${method} ${target} HTTP/1.1`, `Host: ${doors.name}`, ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`), `Content-Length: ${String(Buffer.byteLength(body))}`, '', ''];
          socket.write(lines.join('\r\n'));
          if (body !== '') socket.write(body);
          return oneAnswer();
        };
        return { socket, ask, oneAnswer, ended: () => ended, waiting: () => buf.length };
      };
      const read = (l, id, since = null) => {
        const target = `/v1/screen?id=${encodeURIComponent(id)}${since === null ? '' : `&since=${since}`}`;
        return l.ask('GET', target, getSigned(target));
      };
      const keysBody = (session) => JSON.stringify({ dialog: null, keys: [{ t: 'a' }], session, turn: '0123456789abcdef-1', write: randomBytes(16).toString('hex') });
      const post = (l, session) => {
        const body = keysBody(session);
        return l.ask('POST', '/v1/keys', { ...phoneMod.signedHeadersFor(vectorPhone, 'POST', '/v1/keys', Buffer.from(body, 'utf8')), 'Content-Type': 'application/json' }, body);
      };
      const one = await line();
      const first = await read(one, 'p337-session');
      const firstSaid = (() => { try { return JSON.parse(first?.body ?? ''); } catch { return null; } })();
      check('an honest screen read is answered with the sample, its id echoed, on a kept connection', first?.status === 200 && firstSaid?.sessionId === 'p337-session' && firstSaid?.screen?.cols === 120 && /connection: keep-alive/i.test(first?.head ?? ''), `${String(first?.status)} ${first?.head ?? ''}`);
      const second = await read(one, 'p337-session', firstSaid?.revision ?? 'x');
      const secondSaid = (() => { try { return JSON.parse(second?.body ?? ''); } catch { return null; } })();
      check('a second read on the same connection, with the revision, is answered unchanged', second?.status === 200 && secondSaid?.unchanged === true && secondSaid?.screen === null && doors.counts().screen.handshakes === 1, `${String(second?.status)}, ${String(doors.counts().screen.handshakes)} handshake(s)`);
      const k = await post(one, 'p337-session');
      const kSaid = (() => { try { return JSON.parse(k?.body ?? ''); } catch { return null; } })();
      check('a keys write is verified and answered done under the verb keys, its id echoed', k?.status === 200 && kSaid?.verb === 'keys' && kSaid?.outcome === 'done' && /^[0-9a-f]{32}$/.test(String(kSaid?.write)), k?.body ?? 'no answer');
      const forgedTarget = '/v1/screen?id=p337-session';
      const forged = await one.ask('GET', `${forgedTarget}&since=0123456789ab`, getSigned(forgedTarget));
      check('a read whose target changed after signing is answered 404 and counted refused', forged?.status === 404 && doors.counts().screen.refused.includes('signature'), `${String(forged?.status)} ${J(doors.counts().screen.refused)}`);
      const closesBefore = doors.counts().screen.phoneCloses;
      one.socket.end();
      await new Promise((r) => setTimeout(r, 200));
      check('a connection the phone ends first is counted the phone\'s', doors.counts().screen.phoneCloses === closesBefore + 1, J(doors.counts().screen));

      const two = await line();
      const readsBefore = doors.counts().screen.screenReads;
      const closeFirst = await read(two, 'p337-close-on-next');
      const closeNext = await read(two, 'p337-session');
      check('p337-close-on-next: answered, and the next request read, counted and ended with no answer', closeFirst?.status === 200 && closeNext === null && two.ended() && doors.counts().screen.screenReads === readsBefore + 2, `${String(closeFirst?.status)} then ${J(closeNext)}, ${String(doors.counts().screen.screenReads - readsBefore)} read(s)`);
      const closedByDoor = doors.counts().screen.phoneCloses;
      await new Promise((r) => setTimeout(r, 100));
      check('a connection the door ended is not counted the phone\'s', doors.counts().screen.phoneCloses === closedByDoor);

      const three = await line();
      const strayFirst = await read(three, 'p337-stray');
      await new Promise((r) => setTimeout(r, 200));
      const unasked = await three.oneAnswer(500);
      check('p337-stray: answered, then a second answer nobody asked for on the same connection', strayFirst?.status === 200 && unasked?.status === 200, `${String(strayFirst?.status)} then ${String(unasked?.status)}`);
      three.socket.destroy();

      const four = await line();
      const closing = await read(four, 'p337-says-close');
      await new Promise((r) => setTimeout(r, 200));
      check('p337-says-close: answered with Connection: close, and the connection ends', closing?.status === 200 && /connection: close/i.test(closing?.head ?? '') && four.ended(), closing?.head ?? 'no answer');

      const five = await line();
      const idleFrom = Date.now();
      await read(five, 'p337-session');
      for (let i = 0; i < 80 && !five.ended(); i += 1) await new Promise((r) => setTimeout(r, 100));
      const idleMs = Date.now() - idleFrom;
      check('an idle kept connection is ended by the door at its 5 s, not before', five.ended() && idleMs >= SCREEN_DOOR_KEEP_MS - 200, `${String(idleMs)} ms`);

      // The counts read the tests make, the one-shot way (`Connection: close`,
      // the client closing once it has the answer), on each side of a kept line
      // the phone ends: ONE phone close between them, not two (the probe
      // review: kept open, the counts connection's own close was the second).
      {
        const countsOnce = async () => {
          const c = await line();
          const got = await c.ask('GET', '/p337/counts', { Connection: 'close' });
          c.socket.end();
          await new Promise((r) => setTimeout(r, 150));
          return (() => { try { return JSON.parse(got?.body ?? ''); } catch { return null; } })();
        };
        const kept = await line();
        await read(kept, 'p337-session');
        const before = await countsOnce();
        kept.socket.end();
        await new Promise((r) => setTimeout(r, 200));
        const after = await countsOnce();
        check('a one-shot counts read closed by its client is not the phone ending a line: one phone close for the one kept line', before !== null && after !== null && after.phoneCloses - before.phoneCloses === 1, `${J(before)} then ${J(after)}`);
      }

      // PHASE 337.1: the history and the side line's status read, on the same door.
      {
        const pageTarget = (id, from, count, extra = '') => `/v1/scrollback?id=${encodeURIComponent(id)}&from=${String(from)}&count=${String(count)}&depth=3000&wrap=80&keep=bottom${extra}`;
        const page = (l, target) => l.ask('GET', target, getSigned(target));
        const said = (a) => (() => { try { return JSON.parse(a?.body ?? ''); } catch { return null; } })();
        const kept = await line();
        const handshakesBefore = doors.counts().screen.handshakes;
        const p1 = await page(kept, pageTarget('p3371-session', 100, 108));
        const s1 = said(p1);
        const ask1 = { from: 100, count: 108, depth: 3000, wrap: 80, keep: 'bottom' };
        check(
          "an honest page is answered with the door's numbered lines from its index, cut to the wrap asked, on a kept connection",
          p1?.status === 200 && s1?.sessionId === 'p3371-session' && s1?.from === 100 && s1?.rows?.length === 108 && s1?.rows?.[0]?.[0]?.text === standInLineOf(101).slice(0, 80) && s1?.space === SCROLLBACK_DOOR_SPACE && phoneMod.scrollbackAnswerProblems(s1, ask1).length === 0 && /connection: keep-alive/i.test(p1?.head ?? ''),
          `${String(p1?.status)} ${J(phoneMod.scrollbackAnswerProblems(s1, ask1))}`
        );
        const p2 = await page(kept, pageTarget('p3371-session', 0, 50));
        const sessionTarget = '/v1/session?id=p3371-session';
        const st = await kept.ask('GET', sessionTarget, getSigned(sessionTarget));
        const stSaid = said(st);
        check('a second page and a status read ride the SAME kept connection: one handshake for the three', p2?.status === 200 && said(p2)?.rows?.[0]?.[0]?.text === standInLineOf(1).slice(0, 80) && st?.status === 200 && stSaid?.session?.sessionId === 'p3371-session' && doors.counts().screen.handshakes === handshakesBefore + 1, `${String(p2?.status)} ${String(st?.status)}, ${String(doors.counts().screen.handshakes - handshakesBefore)} handshake(s)`);
        const refusedBefore = doors.counts().screen.scrollbackRefused;
        const hostile = [pageTarget('p3371-session', 0, 10, '&cols=80'), pageTarget('p3371-session', 3000, 10).replace('depth=3000', 'depth=3010'), pageTarget('p3371-session', 2995, 10), pageTarget('p3371-session', 0, 129), pageTarget('p3371-session', 0, 10).replace('keep=bottom', 'keep=TOP')];
        const hostileStatus = [];
        for (const t of hostile) hostileStatus.push((await page(kept, t))?.status ?? null);
        check('a page asking a seventh name, past the history, past its own depth, 129 rows or keep TOP is answered 404 and counted', hostileStatus.every((x) => x === 404) && doors.counts().screen.scrollbackRefused === refusedBefore + hostile.length, `${J(hostileStatus)}, ${String(doors.counts().screen.scrollbackRefused - refusedBefore)} counted`);
        const forgedPage = pageTarget('p3371-session', 0, 10);
        const forged = await kept.ask('GET', forgedPage.replace('from=0', 'from=1'), getSigned(forgedPage));
        check('a page whose target changed after signing is answered 404 and counted refused', forged?.status === 404 && doors.counts().screen.refused.filter((x) => x === 'signature').length >= 2, `${String(forged?.status)} ${J(doors.counts().screen.refused)}`);
        kept.socket.end();
        const closer = await line();
        const pagesBefore = doors.counts().screen.scrollbackReads;
        const closeFirst = await page(closer, pageTarget('p337-close-on-next', 0, 10));
        const closeNext = await page(closer, pageTarget('p3371-session', 0, 10));
        check('p337-close-on-next holds for a page: answered, and the next page read, counted and ended with no answer', closeFirst?.status === 200 && closeNext === null && closer.ended() && doors.counts().screen.scrollbackReads === pagesBefore + 2, `${String(closeFirst?.status)} then ${J(closeNext)}`);
        const c = doors.counts();
        check('scrollbackProblems passes a run that paged and read a session (its hostile asks are this self-test\'s own)', scrollbackProblems({ ...c, screen: { ...c.screen, scrollbackRefused: 0 } }, 'self-test').length === 0, J(scrollbackProblems(c, 'self-test')));
        check('scrollbackProblems refuses a run that paged nothing', scrollbackProblems({ ...c, screen: { ...c.screen, scrollbackRefused: 0, scrollbackReads: 0 } }, 'self-test').length === 1);
        check('scrollbackProblems refuses a run with no status read on the side line', scrollbackProblems({ ...c, screen: { ...c.screen, scrollbackRefused: 0, sessionReads: 0 } }, 'self-test').length === 1);
        check('scrollbackProblems refuses a page ask the door refused', scrollbackProblems(c, 'self-test').length === 1);
        {
          const cleanPages = { ...c, screen: { ...c.screen, scrollbackRefused: 0 } };
          const rowsText = Object.entries(P3371_TRANSPORT_ROWS).map(([row, want]) => `P3371_TRANSPORT|${row}|${want}`).join('\n') + '\n';
          check('scrollbackProblems passes a run whose four transport rows read what they must', scrollbackProblems(cleanPages, 'self-test', rowsText).length === 0, J(scrollbackProblems(cleanPages, 'self-test', rowsText)));
          check('scrollbackProblems refuses a page and a status read that opened two connections on the side line', scrollbackProblems(cleanPages, 'self-test', rowsText.replace('P3371_TRANSPORT|side-line|1', 'P3371_TRANSPORT|side-line|2')).length === 1);
          check('scrollbackProblems refuses a page the door ended that was never asked again on a new line', scrollbackProblems(cleanPages, 'self-test', rowsText.replace('P3371_TRANSPORT|closed-page|2', 'P3371_TRANSPORT|closed-page|1')).length === 1);
          check('scrollbackProblems refuses a transport row that never printed', scrollbackProblems(cleanPages, 'self-test', rowsText.replace('P3371_TRANSPORT|two-pages|1\n', '')).length === 1);
          check("scrollbackProblems does not read Phase 337's rows as this phase's", scrollbackProblems(cleanPages, 'self-test', 'P337_TRANSPORT|one-line|1\n').length === Object.keys(P3371_TRANSPORT_ROWS).length);
        }
        let sample = null;
        try {
          sample = JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'sample-claude-2.1.287.json'), 'utf8'));
        } catch {
          sample = null;
        }
        check("the committed screen sample carries D3's depth and space", sampleDepthProblem(sample) === null, String(sampleDepthProblem(sample)));
        check('sampleDepthProblem refuses a sample with no depth, and one whose space is not 12 hex', sampleDepthProblem({ screen: { cols: 120 } }) !== null && sampleDepthProblem({ screen: { depth: 4, space: 'XYZ' } }) !== null && sampleDepthProblem({ screen: { depth: null, space: null } }) === null);
        check('scrollbackPageOf refuses a repeated name and an id over 128 characters', scrollbackPageOf(`${pageTarget('a', 0, 10)}&from=0`, standInLineOf) === null && scrollbackPageOf(pageTarget('x'.repeat(129), 0, 10), standInLineOf) === null && scrollbackPageOf(pageTarget('a', 0, 10), standInLineOf) !== null);
      }

      const counted = doors.counts();
      const honestText =Object.entries(P337_TRANSPORT_ROWS).map(([row, want]) => `P337_TRANSPORT|${row}|${want}`).join('\n') + '\nP337_GRID|fitted|1048576|1|2\nP337_GRID|top|4194304|1|2\n';
      const clean = structuredClone(counted);
      clean.screen.refused = [];
      check('screenProblems passes a run that read, wrote and printed every row', screenProblems(clean, 'self-test', honestText).length === 0, J(screenProblems(clean, 'self-test', honestText)));
      check('screenProblems refuses the forged read it saw', screenProblems(counted, 'self-test', honestText).length === 1);
      check('screenProblems refuses a row that read wrong', screenProblems(clean, 'self-test', honestText.replace('P337_TRANSPORT|keys-once|noAnswer', 'P337_TRANSPORT|keys-once|answered')).length === 1);
      check('screenProblems refuses a row that never printed', screenProblems(clean, 'self-test', honestText.replace('P337_TRANSPORT|stray|1\n', '')).length === 1);
      check('screenProblems refuses a grid over 64 MB at its top size', screenProblems(clean, 'self-test', honestText.replace('P337_GRID|top|4194304', `P337_GRID|top|${String(P337_GRID_CEILING)}`)).length === 1);
      check('screenProblems refuses a run with no keys write', screenProblems({ ...clean, screen: { ...clean.screen, keysPosts: 0 } }, 'self-test', honestText).length === 1);
    }

    // Phase 333.1 (§7.8): the site's three addresses, read whole, on bytes
    // written here the way a build lays its literals out (each ended by a NUL).
    const lit = (...texts) => Buffer.concat(texts.flatMap((t) => [Buffer.from(t, 'utf8'), Buffer.from([0])]));
    const honestSite = lit('Tortie', ...SITE_ADDRESSES, 'tortie.sh');
    check('siteAddressProblems passes a build holding the three addresses whole', siteAddressProblems('self-test', siteAddressCounts([honestSite])).length === 0);
    check(
      'siteAddressProblems names the one address changed by a byte, and only it',
      J(siteAddressProblems('self-test', siteAddressCounts([lit('Tortie', SITE_ADDRESSES[0], 'https://tortie.sh/privacz', SITE_ADDRESSES[2])])).map((p) => SITE_ADDRESSES.find((a) => p.includes(` ${a} `)))) === J([SITE_ADDRESSES[1]])
    );
    check('a longer address that begins with tortie.sh is not the home page', siteAddressCounts([lit('https://tortie.sh/privacy', 'https://tortie.sh/support')]).get(SITE_ADDRESSES[0]) === 0);
    check('an address inside a longer one is not held whole', siteAddressCounts([lit('xhttps://tortie.sh/privacy', 'https://tortie.sh/support?ref=app')]).get(SITE_ADDRESSES[1]) === 0 && siteAddressCounts([lit('https://tortie.sh/support?ref=app')]).get(SITE_ADDRESSES[2]) === 0);
    check('the three addresses may sit in three files', siteAddressProblems('self-test', siteAddressCounts(SITE_ADDRESSES.map((a) => lit(a)))).length === 0);
    check('a build holding none names all three', siteAddressProblems('self-test', siteAddressCounts([lit('Tortie'), Buffer.alloc(0)])).length === 3);

    // The suites, read from xcodebuild's own words.
    const ran = P317_SUITES.map((n) => `Test Suite '${n}' passed at 2026-10-01 12:00:00.000.`).join('\n');
    check('suitesNotRun reads every suite xcodebuild says passed', suitesNotRun(ran).length === 0);
    check('suitesNotRun names a suite that never ran', J(suitesNotRun(ran.replace("'EndBatchTests' passed", "'EndBatchTests' started"))) === J(['EndBatchTests']));
    check('suitesNotRun counts a failed suite as run', suitesNotRun(ran.replace("'WriterTests' passed", "'WriterTests' failed")).length === 0);
    check('suitesNotRun names a Phase 318 suite that never ran', J(suitesNotRun(ran, P318_SUITES)) === J(['ReplyTests', 'ReplyClientTests', 'P318ReplyTransportTests']));
    check('suitesNotRun names the Phase 337 suites that never ran', J(suitesNotRun(ran, P337_SUITES)) === J(P337_SUITES.filter((n) => !P317_SUITES.includes(n))));
    check('suitesNotRun names every Phase 337.1 suite that never ran', J(suitesNotRun(ran, P3371_SUITES)) === J([...P3371_SUITES]));
    check('suitesNotRun names every Phase 337.3 suite that never ran', J(suitesNotRun(ran, P3373_SUITES)) === J([...P3373_SUITES]));
    check('suitesNotRun reads a Phase 337.3 suite that ran', J(suitesNotRun(`${ran}\nTest Suite 'TerminalFillTests' passed at 2026-10-08 12:00:00.000.`, P3373_SUITES)) === J(['TerminalChromeTests', 'TerminalMenuTests']));
  } catch (err) {
    check('the self-test ran', false, String(err?.stack ?? err));
  } finally {
    if (doors !== null) await doors.close();
    rmSync(scratch, { recursive: true, force: true });
  }
  const failed = results.filter((ok) => !ok).length;
  say(failed === 0 ? `self-test PASS: ${String(results.length)} checks over the doors, on loopback, and every listener is closed` : `self-test FAIL: ${String(failed)} of ${String(results.length)}`);
  return failed === 0;
}

if (invokedDirectly()) await main();

async function main() {
  const readAt = process.argv.indexOf('--read-app');
  if (readAt !== -1) {
    const at = appAt(resolve(process.argv[readAt + 1] ?? ''));
    if (at.problem !== undefined) {
      say(at.problem);
      process.exit(1);
    }
    // Read as Release: this is the read of the archive he uploads.
    const r = builtAppProblems(at.app);
    for (const p of r.problems) process.stdout.write(`${TAG} ${p}\n`);
    say(`${at.app}: ${String(r.files)} Mach-O file(s) read; ${r.problems.length === 0 ? PASS_WORDS : `${String(r.problems.length)} problem(s)`}`);
    process.exit(r.problems.length === 0 ? 0 : 1);
  }

  // The full run imports the shipping tls.ts for its doors, so it runs under
  // the pinned tsx: the same file again, waited for.
  if (process.env['P330_TEST_IOS_INNER'] !== '1') {
    const { tsxCli } = await import('../ts-runner.mjs');
    const inner = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, P330_TEST_IOS_INNER: '1' }
    });
    if (inner.error !== undefined) say(`the run under tsx could not start: ${String(inner.error.message)}`);
    process.exit(inner.status ?? 1);
  }

  // Phase 317: the doors alone, driven by node, with no Xcode and no Simulator.
  if (process.argv.includes('--self-test')) {
    const doorsHeld = await doorsSelfTest();
    // Phase 333.11: the frozen wire's grader, over a set made here.
    const frozenHeld = await frozenGraderSelfTest();
    process.exit(doorsHeld && frozenHeld ? 0 : 1);
  }

  const runtime = (process.env['P316_RUNTIME'] ?? '').trim() || RUNTIME_CURRENT;

  // 1. The preflight, synchronous, before anything exists.
  const missing = simulatorHarnessMissing({ runtimes: [runtime] });
  if (missing !== null) {
    process.stderr.write(`${TAG} ${missing}\n`);
    process.exit(2);
  }
  // 2. The vectors, and (Phase 337.1) the screen sample the door answers with, which must carry D3's depth and space.
  {
    let sampleProblem = null;
    try {
      sampleProblem = sampleDepthProblem(JSON.parse(readFileSync(join(ROOT, 'build', 'fixtures', 'screen', 'sample-claude-2.1.287.json'), 'utf8')));
    } catch (err) {
      sampleProblem = `the committed screen sample could not be read: ${String(err?.message ?? err)}`;
    }
    if (sampleProblem !== null) {
      process.stderr.write(`${TAG} ${sampleProblem}\n`);
      process.exit(1);
    }
  }
  const vectors = spawnSync(process.execPath, [join(ROOT, 'build', 'p316', 'vectors.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  if (vectors.status !== 0) {
    process.stderr.write(`${TAG} the vectors are stale, so the Swift would be held to the wrong bytes: ${`${vectors.stdout ?? ''}${vectors.stderr ?? ''}`.trim().split('\n').slice(-2).join(' ')}\n`);
    process.exit(1);
  }
  // Phase 333.11: the frozen sets, and which of them the phone's decoders still
  // read exactly, whose refuse arms the tests then assert (P33311_PROOF).
  const frozenPre = await frozenProof();
  for (const line of frozenPre.said) say(line);
  if (frozenPre.problems.length > 0) {
    for (const p of frozenPre.problems.slice(0, 25)) process.stderr.write(`${TAG} ${p}\n`);
    process.exit(1);
  }
  const frozenToday = JSON.parse(readFileSync(join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json'), 'utf8')).answers ?? {};

  // Phase 316.6's outline (Method 2): where the markdown outline tests write,
  // and what they read instead of fixtures.json. Each is refused inside the
  // repository or the home, as the scratch directory is, before anything is built.
  const outline = {};
  for (const name of ['P3166_OUTLINE_DIR', 'P3166_OUTLINE_INPUT']) {
    const value = (process.env[name] ?? '').trim();
    if (value === '') continue;
    const why = refuseScratchReason(resolve(value));
    if (why !== null) {
      process.stderr.write(`${TAG} ${name}: ${why}\n`);
      process.exit(2);
    }
    outline[name] = resolve(value);
    // The outline test writes into the directory and makes none (the
    // integrator's reconcile: a missing one failed testTheOutlineFile).
    if (name === 'P3166_OUTLINE_DIR') mkdirSync(outline[name], { recursive: true });
  }
  const scratch = resolve((process.env['P316_SCRATCH'] ?? '').trim() || mkdtempSync(join(tmpdir(), 'p316-test-ios-')));
  const scratchWhy = refuseScratchReason(scratch);
  if (scratchWhy !== null) {
    process.stderr.write(`${TAG} ${scratchWhy}\n`);
    process.exit(2);
  }
  const derivedDataPath = resolve((process.env['P316_DERIVED_DATA'] ?? '').trim() || join(scratch, 'dd'));
  const releaseDerivedDataPath = `${derivedDataPath}-release`;
  const keep = (process.env['P316_KEEP'] ?? '') === '1';
  const CONFIGURATIONS = [
    { name: 'Debug', derivedDataPath, extra: [] },
    // Release as it ships, with testability on so the test bundle can import it.
    { name: 'Release', derivedDataPath: releaseDerivedDataPath, extra: ['ENABLE_TESTABILITY=YES'] }
  ];
  // Step 5: the Release configuration archived for the device, as he uploads it,
  // and never signed: CODE_SIGNING_ALLOWED=NO here, and xcodebuildRun's own
  // settings empty the team and make the identity ad hoc.
  const DEVICE = {
    derivedDataPath: `${derivedDataPath}-device`,
    archivePath: join(scratch, 'device', 'Tortie.xcarchive')
  };
  let code = 1;
  try {
    // 3. Build for testing, both configurations. No device, so nothing boots.
    let built = true;
    for (const c of CONFIGURATIONS) {
      say(`building ${c.name} for testing into ${c.derivedDataPath}`);
      const b = await xcodebuildRun({
        label: `build-for-testing-${c.name}`,
        scratch,
        derivedDataPath: c.derivedDataPath,
        args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', c.name, '-destination', 'generic/platform=iOS Simulator', ...c.extra]
      });
      if (b.code !== 0) {
        const tail = `${b.stdout}${b.stderr}`.trim().split('\n').filter((l) => /error:|BUILD FAILED|\*\* /.test(l)).slice(-12);
        say(`build-for-testing (${c.name}) exited ${String(b.code)} in ${String(b.ms)} ms${b.timedOut ? ' (timed out)' : ''}:`);
        for (const l of tail) process.stdout.write(`  ${l}\n`);
        built = false;
        break;
      }
      say(`built ${c.name} in ${String(b.ms)} ms`);
      // 4. The built app, read, before anything boots. Debug's seams are the control.
      const app = join(c.derivedDataPath, 'Build', 'Products', `${c.name}-iphonesimulator`, 'Tortie.app');
      const debug = c.name === 'Debug';
      const read = builtAppProblems(app, { debug });
      for (const p of read.problems) process.stdout.write(`  ${p}\n`);
      say(`the built ${c.name} app: ${String(read.files)} Mach-O file(s), ${read.problems.length === 0 ? (debug ? DEBUG_PASS_WORDS : PASS_WORDS) : `${String(read.problems.length)} problem(s); nothing boots`}`);
      // Its entitlements: a Simulator app's are the simulated ones in its executable.
      const granted = simulatorEntitlementProblems(app);
      for (const p of granted.problems) process.stdout.write(`  ${p}\n`);
      say(
        `the built ${c.name} app's entitlements: ${granted.problems.length === 0 ? `aps-environment development in all ${String(granted.slices)} slice(s)' simulated entitlements, beside Xcode's ${XCODE_SIMULATED}, and none in its ad hoc signature` : `${String(granted.problems.length)} problem(s); nothing boots`}`
      );
      if (read.problems.length > 0 || granted.problems.length > 0) {
        built = false;
        break;
      }
    }
    // 5. The device archive, unsigned, read the same way. Still nothing boots.
    if (built) {
      say(`archiving Release for the device, unsigned, into ${DEVICE.archivePath}`);
      const a = await xcodebuildRun({
        label: 'archive-device-Release',
        scratch,
        derivedDataPath: DEVICE.derivedDataPath,
        args: [
          'archive', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Release',
          '-destination', 'generic/platform=iOS', '-archivePath', DEVICE.archivePath,
          'CODE_SIGNING_ALLOWED=NO'
        ]
      });
      if (a.code !== 0) {
        const tail = `${a.stdout}${a.stderr}`.trim().split('\n').filter((l) => /error:|ARCHIVE FAILED|\*\* /.test(l)).slice(-12);
        say(`the device archive exited ${String(a.code)} in ${String(a.ms)} ms${a.timedOut ? ' (timed out)' : ''}:`);
        for (const l of tail) process.stdout.write(`  ${l}\n`);
        built = false;
      } else {
        say(`archived Release for the device in ${String(a.ms)} ms`);
        const at = appAt(DEVICE.archivePath);
        const read = at.problem !== undefined ? { problems: [at.problem], files: 0 } : builtAppProblems(at.app);
        const signed = at.problem !== undefined ? null : signedProblem(at.app);
        const problems = signed === null ? read.problems : [...read.problems, signed];
        for (const p of problems) process.stdout.write(`  ${p}\n`);
        say(`the device archive's app: ${String(read.files)} Mach-O file(s), ${problems.length === 0 ? `${PASS_WORDS}; unsigned` : `${String(problems.length)} problem(s); nothing boots`}`);
        if (problems.length > 0) built = false;
      }
    }
    if (!built) process.exitCode = 1;
    else {
      // 6. The unit tests on a device of this run's own: Debug, then Release,
      // with the two doors up in this process and ended in the finally.
      let doors = null;
      try {
        doors = await startTransportDoors(join(scratch, 'doors'));
        say(`door A on 127.0.0.1:${String(doors.portA)} (pin ${doors.pinA}), the wrong door on 127.0.0.1:${String(doors.portB)}`);
        say(`(ad)'s doors: the handshake held ${String(doors.holdMs)} ms on 127.0.0.1:${String(doors.portHoldTls)}, the answer held ${String(doors.holdMs)} ms on 127.0.0.1:${String(doors.portHoldAnswer)}`);
        say(`the screen door, keeping its connections ${String(SCREEN_DOOR_KEEP_MS)} ms, on 127.0.0.1:${String(doors.portScreen)}`);
        const testEnv = {
          P330_DOOR_NAME: doors.name,
          P330_DOOR_PORT: String(doors.portA),
          P330_DOOR_PIN: doors.pinA,
          P330_WRONG_PORT: String(doors.portB),
          // Phase 317: (ad)'s two doors, under door A's key and name.
          P317_HOLD_TLS_PORT: String(doors.portHoldTls),
          P317_HOLD_ANSWER_PORT: String(doors.portHoldAnswer),
          P317_HOLD_MS: String(doors.holdMs),
          // Phase 337: the screen door, under door A's key and name.
          P337_SCREEN_PORT: String(doors.portScreen),
          // Phase 337.1: the screen door's history, which P3371ScrollbackTransportTests pages.
          P3371_DEPTH: String(SCROLLBACK_DOOR_DEPTH),
          P3371_SPACE: SCROLLBACK_DOOR_SPACE,
          ...outline
        };
        // Phase 333.11: the sets whose refuse arms DoorFrozenTests asserts.
        testEnv['P33311_PROOF'] = frozenPre.proof.join(',');
        if (Object.keys(outline).length > 0) say(`the markdown outline: ${Object.entries(outline).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        await withSimulator({ label: 'test:ios', runtime, scratch: join(scratch, 'sim'), derivedDataPath, keep }, async (sim) => {
          let passed = 0;
          for (const c of CONFIGURATIONS) {
            doors.reset();
            const run = await sim.xcodebuild(
              ['test-without-building', '-project', PROJECT, '-scheme', SCHEME, '-configuration', c.name, '-only-testing:TortieTests'],
              { label: `unit-${c.name}`, derivedDataPath: c.derivedDataPath, timeoutMs: 900_000, testEnv }
            );
            const counted = doors.counts();
            const transport = [...transportProblems(counted, c.name), ...writeProblems(counted, c.name), ...replyProblems(counted, c.name), ...screenProblems(counted, c.name, `${run.stdout}${run.stderr}`), ...scrollbackProblems(counted, c.name, `${run.stdout}${run.stderr}`)];
            for (const l of `${run.stdout}${run.stderr}`.split('\n').filter((x) => /^P3371?_(?:TRANSPORT|GRID)\|/.test(x.trim()))) process.stdout.write(`  ${l.trim()}\n`);
            for (const p of transport) process.stdout.write(`  ${p}\n`);
            say(
              `the write doors after ${c.name}: door A read ${String(counted.writes.end)} end write(s), ${String(counted.writes.choose)} press(es) and ${String(counted.writes.say)} message(s), ` +
                `${String(counted.writes.verified)} verified, ${String(counted.writes.refused.length)} refused (${[...new Set(counted.writes.refused)].join(', ') || 'none'}), ${String(counted.writes.answered)} answered; ` +
                `the held handshake: ${String(counted.holdTls.connections)} connection(s), ${String(counted.holdTls.closedWhileHeld)} closed while held, ${String(counted.holdTls.requests)} request(s) read; ` +
                `the held answer: ${String(counted.holdAnswer.connections)} connection(s), ${String(counted.holdAnswer.requests)} request(s) read, ${String(counted.holdAnswer.answered)} answered, ${String(counted.holdAnswer.hungUp)} hung up`
            );
            say(
              `the doors after ${c.name}: A issued ${String(counted.a.issued.length)}, read ${String(counted.a.read.length)} pin(s) ` +
                `(${[...new Set(counted.a.read)].join(', ') || 'none'}), refused ${String(counted.a.refused)}; ` +
                `the wrong door: ${String(counted.b.handshakes)} handshake(s), ${String(counted.b.served)} request(s) served`
            );
            const s = summaryOf(`${run.stdout}${run.stderr}`);
            const failing = `${run.stdout}${run.stderr}`.split('\n').filter((l) => /error: -\[|: error: .*XCT|Test Case .* failed/.test(l)).slice(0, 30);
            for (const l of failing) process.stdout.write(`  ${l.trim()}\n`);
            say(
              `TortieTests (${c.name}) on iOS ${sim.runtime}: xcodebuild exited ${String(run.code)} in ${String(run.ms)} ms; ` +
                `${String(s.executed)} test(s) executed, ${String(s.failures)} failure(s), ${String(s.skipped)} skipped`
            );
            // Phase 317: every class it adds or changes must have run.
            const notRun = suitesNotRun(`${run.stdout}${run.stderr}`, [...new Set([...P317_SUITES, ...P318_SUITES, ...P337_SUITES, ...P3371_SUITES, ...P3373_SUITES, ...P33311_SUITES])]);
            if (notRun.length > 0) say(`${c.name}: xcodebuild names no run of ${notRun.join(', ')}, so those rows were not run`);
            // Phase 333.11: every frozen row, graded against the sealed sets.
            const frozen = frozenRowProblems(`${run.stdout}${run.stderr}`, frozenPre.sets, new Set(frozenPre.proof), frozenToday, c.name);
            for (const l of frozen.lines) say(l);
            for (const p of frozen.problems.slice(0, 25)) process.stdout.write(`  ${p}\n`);
            if (frozen.problems.length > 25) process.stdout.write(`  … and ${String(frozen.problems.length - 25)} more\n`);
            if (run.code === 0 && s.executed !== null && s.executed > 0 && s.failures === 0 && transport.length === 0 && notRun.length === 0 && frozen.problems.length === 0) passed += 1;
            if (run.code === 0 && (s.executed ?? 0) === 0) say(`${c.name}: ` + 'xcodebuild exited 0 and ran no test, which is not a pass');
          }
          code = passed === CONFIGURATIONS.length ? 0 : 1;
        });
      } finally {
        if (doors !== null) await doors.close();
      }
    }
  } catch (err) {
    say(`it threw: ${String(err?.message ?? err)}`);
    code = code === 0 ? 1 : code;
  } finally {
    if (!keep && (process.env['P316_SCRATCH'] ?? '').trim() === '') rmSync(scratch, { recursive: true, force: true });
  }

  // 7. Counted once, at the end.
  const left = countDevicesNamed('p316-');
  say(`devices named p316- on this Mac: ${String(left.named)}, booted: ${String(left.booted)}${left.readable ? '' : ' (the list could not be read)'}`);
  process.exit(code);
}
