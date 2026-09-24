#!/usr/bin/env node
/**
 * `npm run test:ios` — the phone app's XCTest unit tests, on a Simulator of
 * their own (Phase 316.2, build/p316/SPEC.md §4 S2, Proof).
 *
 * WHAT IT RUNS. The `TortieTests` target: decoding the door's answers, the page
 * arithmetic (including its refusal when indexes go backwards or overlap, and
 * its stop when `more` is true on a page that adds nothing), the pin, and every
 * vector build/p316/vectors.mjs wrote from the SHIPPING TypeScript. The UI
 * tests are `probe:p316`'s, because they need the door, and so is the ATS test,
 * which skips itself when the probe's stand-ins are not named in its
 * environment.
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
 *      conformance:ios green). By `otool -l`: none may carry the sections a
 *      build instrumented for code coverage carries (`__llvm_prf_*`,
 *      `__llvm_cov*`), which 316.3's fix round found in every build through
 *      the scheme, Release included, and which it turned off in text only. And
 *      the switch that turns Tailscale's own logs off: the embedded
 *      TailscaleKit exports `_tailscale_no_logs_no_support` and the app's
 *      binary calls it (`nm`). A problem refuses, exit 1, before any device
 *      boots. `--read-app <Tortie.app or Tortie.xcarchive>` does this step
 *      alone and boots nothing.
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
 *      build's tests, then the Release build's, on the same device.
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
 *
 * VERIFIERS ONLY run it: it boots a Simulator, so take the orchestrator's lock.
 * It opens no socket, starts no Electron and needs no Apple account.
 */

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readdirSync, readSync, realpathSync, rmSync } from 'node:fs';
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
import { vendoredTailscaleKitProblem } from '../build-tailscalekit.mjs';

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

/** The switch Tailnet/Node.swift calls before every start (conformance:ios rule q). */
const NO_LOGS_SYMBOL = '_tailscale_no_logs_no_support';

/**
 * A section only a build instrumented for code coverage carries: clang's and
 * swiftc's `-profile-generate` counters and names (`__llvm_prf_cnts`,
 * `__llvm_prf_data`, `__llvm_prf_names`, …) and `-profile-coverage-mapping`'s
 * map (`__llvm_covmap`, `__llvm_covfun`), as `otool -l` prints them.
 */
const COVERAGE_SECTION = /^\s*sectname (__llvm_(?:prf|cov)\w*)/gm;

/** What every read that found nothing says, so the two callers say it alike. */
const PASS_WORDS = `none links NetworkExtension, none carries code coverage, and ${NO_LOGS_SYMBOL} is exported by TailscaleKit and called by the app`;

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

/**
 * What a built Tortie.app says about itself that no text rule can: every
 * Mach-O file's load commands (`otool -L`) name no NetworkExtension, no Mach-O
 * file carries a coverage section (`otool -l`), and the logs switch is in the
 * embedded TailscaleKit and called by the app. Returns the problems
 * (sentences) and what was read.
 */
export function builtAppProblems(app) {
  const problems = [];
  if (!existsSync(app)) return { problems: [`${app} does not exist, so the built app cannot be read`], files: 0 };
  const files = machOFiles(app);
  if (files.length === 0) problems.push(`${app} holds no Mach-O file, so it cannot be read`);
  for (const f of files) {
    const l = tool('/usr/bin/otool', ['-L', f]);
    if (!l.ok) {
      problems.push(`otool -L could not read ${relative(app, f)}: ${l.err.trim().split('\n').pop()}`);
      continue;
    }
    for (const line of l.out.split('\n').filter((x) => /NetworkExtension/.test(x))) {
      problems.push(`${relative(app, f)} links ${line.trim().split(' ')[0]} (otool -L); the phone carries a node, never a VPN, and a link flag assembled from build settings is how this gets past conformance:ios (research 128 §3)`);
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
  const kit = join(app, 'Frameworks', 'TailscaleKit.framework', 'TailscaleKit');
  const exported = tool('/usr/bin/nm', ['-gU', kit]);
  if (!exported.ok || !new RegExp(` T ${NO_LOGS_SYMBOL}$`, 'm').test(exported.out)) {
    problems.push(`the embedded TailscaleKit does not export ${NO_LOGS_SYMBOL}, so the node's logs would go to log.tailscale.com; run npm run vendor:tailscalekit`);
  }
  const callers = files.filter((f) => !f.startsWith(join(app, 'Frameworks') + '/') && !f.startsWith(join(app, 'PlugIns') + '/'));
  const calls = callers.some((f) => {
    const u = tool('/usr/bin/nm', ['-u', f]);
    return u.ok && new RegExp(`^\\s*${NO_LOGS_SYMBOL}$`, 'm').test(u.out);
  });
  if (!calls) problems.push(`the app's own binary never calls ${NO_LOGS_SYMBOL}, so a node could start with Tailscale's logs on`);
  return { problems, files: files.length };
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
    const r = builtAppProblems(at.app);
    for (const p of r.problems) process.stdout.write(`${TAG} ${p}\n`);
    say(`${at.app}: ${String(r.files)} Mach-O file(s) read; ${r.problems.length === 0 ? PASS_WORDS : `${String(r.problems.length)} problem(s)`}`);
    process.exit(r.problems.length === 0 ? 0 : 1);
  }

  const runtime = (process.env['P316_RUNTIME'] ?? '').trim() || RUNTIME_CURRENT;

  // 1. The preflight, synchronous, before anything exists.
  const missing = simulatorHarnessMissing({ runtimes: [runtime] });
  if (missing !== null) {
    process.stderr.write(`${TAG} ${missing}\n`);
    process.exit(2);
  }
  // The app embeds TailscaleKit from build/vendor/ (Phase 316.3). With no copy
  // Xcode stops while it plans, in its own words, so the command is said here.
  const kit = vendoredTailscaleKitProblem();
  if (kit !== null) {
    process.stderr.write(`${TAG} ${kit}\n`);
    process.exit(2);
  }

  // 2. The vectors.
  const vectors = spawnSync(process.execPath, [join(ROOT, 'build', 'p316', 'vectors.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  if (vectors.status !== 0) {
    process.stderr.write(`${TAG} the vectors are stale, so the Swift would be held to the wrong bytes: ${`${vectors.stdout ?? ''}${vectors.stderr ?? ''}`.trim().split('\n').slice(-2).join(' ')}\n`);
    process.exit(1);
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
      // 4. The built app, read, before anything boots.
      const app = join(c.derivedDataPath, 'Build', 'Products', `${c.name}-iphonesimulator`, 'Tortie.app');
      const read = builtAppProblems(app);
      for (const p of read.problems) process.stdout.write(`  ${p}\n`);
      say(`the built ${c.name} app: ${String(read.files)} Mach-O file(s), ${read.problems.length === 0 ? PASS_WORDS : `${String(read.problems.length)} problem(s); nothing boots`}`);
      if (read.problems.length > 0) {
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
      // 6. The unit tests on a device of this run's own: Debug, then Release.
      await withSimulator({ label: 'test:ios', runtime, scratch: join(scratch, 'sim'), derivedDataPath, keep }, async (sim) => {
        let passed = 0;
        for (const c of CONFIGURATIONS) {
          const run = await sim.xcodebuild(
            ['test-without-building', '-project', PROJECT, '-scheme', SCHEME, '-configuration', c.name, '-only-testing:TortieTests'],
            { label: `unit-${c.name}`, derivedDataPath: c.derivedDataPath, timeoutMs: 900_000 }
          );
          const s = summaryOf(`${run.stdout}${run.stderr}`);
          const failing = `${run.stdout}${run.stderr}`.split('\n').filter((l) => /error: -\[|: error: .*XCT|Test Case .* failed/.test(l)).slice(0, 30);
          for (const l of failing) process.stdout.write(`  ${l.trim()}\n`);
          say(
            `TortieTests (${c.name}) on iOS ${sim.runtime}: xcodebuild exited ${String(run.code)} in ${String(run.ms)} ms; ` +
              `${String(s.executed)} test(s) executed, ${String(s.failures)} failure(s), ${String(s.skipped)} skipped`
          );
          if (run.code === 0 && s.executed !== null && s.executed > 0 && s.failures === 0) passed += 1;
          if (run.code === 0 && (s.executed ?? 0) === 0) say(`${c.name}: ` + 'xcodebuild exited 0 and ran no test, which is not a pass');
        }
        code = passed === CONFIGURATIONS.length ? 0 : 1;
      });
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
