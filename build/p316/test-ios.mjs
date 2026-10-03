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
 *      build must hold none. PASS_WORDS do not change: his checklist quotes
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
import { X509Certificate, createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readSync, realpathSync, rmSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[test:ios]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
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
  for (const f of files) {
    const bytes = readFileSync(f);
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
  return { problems, files: files.length, seams: seamsFound.size, registering: registering.length, unregistering: unregistering.length };
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
 */
export async function startTransportDoors(dir) {
  const tls = await import('../../src/main/pocket/tls.ts');
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
  const fresh = () => ({ a: { issued: [], read: [], refused: 0 }, b: { handshakes: 0, served: 0 } });
  let counts = fresh();

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
      if (size <= 4096) chunks.push(c);
    });
    req.on('end', () => {
      const pin = req.socket.p330Pin ?? null;
      if (req.method === 'POST' && req.url === '/p330/issue' && size <= 4096) {
        let ck = null;
        try {
          ck = JSON.parse(Buffer.concat(chunks).toString('utf8')).ck;
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
        counts.a.issued.push(pinOfSpki(Buffer.from(ck, 'base64url')));
        return answer(res, 200, JSON.stringify({ cert: b64u(der) }));
      }
      if (req.method === 'GET' && req.url === '/p330/whoami' && pin !== null) {
        counts.a.read.push(pin);
        return answer(res, 200, JSON.stringify({ pin }));
      }
      return answer(res, 404, null);
    });
  });
  const doorA = createTls({ key: A.key, cert: A.cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false });
  doorA.on('secureConnection', (socket) => {
    const peer = socket.getPeerX509Certificate();
    if (peer !== undefined) {
      const pin = pinOfSpki(peer.publicKey.export({ type: 'spki', format: 'der' }));
      if (!counts.a.issued.includes(pin)) {
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
  });
  const doorB = createTls({ key: B.key, cert: B.cert, minVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: false });
  doorB.on('secureConnection', (socket) => {
    counts.b.handshakes += 1;
    socket.on('data', () => {
      counts.b.served += 1;
      socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
    });
  });
  const servers = [doorA, doorB];
  const listening = [];
  const close = async () => {
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

  const runtime = (process.env['P316_RUNTIME'] ?? '').trim() || RUNTIME_CURRENT;

  // 1. The preflight, synchronous, before anything exists.
  const missing = simulatorHarnessMissing({ runtimes: [runtime] });
  if (missing !== null) {
    process.stderr.write(`${TAG} ${missing}\n`);
    process.exit(2);
  }
  // 2. The vectors.
  const vectors = spawnSync(process.execPath, [join(ROOT, 'build', 'p316', 'vectors.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  if (vectors.status !== 0) {
    process.stderr.write(`${TAG} the vectors are stale, so the Swift would be held to the wrong bytes: ${`${vectors.stdout ?? ''}${vectors.stderr ?? ''}`.trim().split('\n').slice(-2).join(' ')}\n`);
    process.exit(1);
  }

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
        const testEnv = {
          P330_DOOR_NAME: doors.name,
          P330_DOOR_PORT: String(doors.portA),
          P330_DOOR_PIN: doors.pinA,
          P330_WRONG_PORT: String(doors.portB),
          ...outline
        };
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
            const transport = transportProblems(counted, c.name);
            for (const p of transport) process.stdout.write(`  ${p}\n`);
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
            if (run.code === 0 && s.executed !== null && s.executed > 0 && s.failures === 0 && transport.length === 0) passed += 1;
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
