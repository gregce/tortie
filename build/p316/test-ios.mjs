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
 *      scratch derived data path, ad hoc with no team.
 *   4. `test-without-building -only-testing:TortieTests` on ONE iPhone 16 Pro
 *      from build/simulator-run.mjs's withSimulator, which shuts it down and
 *      deletes it in a `finally` and on SIGINT, SIGTERM and SIGHUP.
 *   5. The end-of-run count: devices named `p316-`, and how many are booted.
 *
 * The test plan turns screenshots off and keeps no attachment (conformance:ios
 * rule i), so the result bundle holds no photograph, and it is deleted with the
 * scratch directory anyway.
 *
 *   npm run test:ios
 *   P316_RUNTIME=18.3 npm run test:ios            the floor runtime
 *   P316_DERIVED_DATA=<dir> npm run test:ios      derived data somewhere of yours (never the repo, never home)
 *   P316_KEEP=1 npm run test:ios                  keep the scratch directory
 *
 * VERIFIERS ONLY run it: it boots a Simulator, so take the orchestrator's lock.
 * It opens no socket, starts no Electron and needs no Apple account.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

const scratch = resolve((process.env['P316_SCRATCH'] ?? '').trim() || mkdtempSync(join(tmpdir(), 'p316-test-ios-')));
const scratchWhy = refuseScratchReason(scratch);
if (scratchWhy !== null) {
  process.stderr.write(`${TAG} ${scratchWhy}\n`);
  process.exit(2);
}
const derivedDataPath = resolve((process.env['P316_DERIVED_DATA'] ?? '').trim() || join(scratch, 'dd'));
const keep = (process.env['P316_KEEP'] ?? '') === '1';
let code = 1;
try {
  // 3. Build for testing. No device, so nothing boots.
  say(`building for testing into ${derivedDataPath}`);
  const built = await xcodebuildRun({
    label: 'build-for-testing',
    scratch,
    derivedDataPath,
    args: ['build-for-testing', '-project', PROJECT, '-scheme', SCHEME, '-configuration', 'Debug', '-destination', 'generic/platform=iOS Simulator']
  });
  if (built.code !== 0) {
    const tail = `${built.stdout}${built.stderr}`.trim().split('\n').filter((l) => /error:|BUILD FAILED|\*\* /.test(l)).slice(-12);
    say(`build-for-testing exited ${String(built.code)} in ${String(built.ms)} ms${built.timedOut ? ' (timed out)' : ''}:`);
    for (const l of tail) process.stdout.write(`  ${l}\n`);
    process.exitCode = 1;
  } else {
    say(`built in ${String(built.ms)} ms`);
    // 4. The unit tests on a device of this run's own.
    await withSimulator({ label: 'test:ios', runtime, scratch: join(scratch, 'sim'), derivedDataPath, keep }, async (sim) => {
      const run = await sim.xcodebuild(
        ['test-without-building', '-project', PROJECT, '-scheme', SCHEME, '-only-testing:TortieTests'],
        { label: 'unit', timeoutMs: 900_000 }
      );
      const s = summaryOf(`${run.stdout}${run.stderr}`);
      const failing = `${run.stdout}${run.stderr}`.split('\n').filter((l) => /error: -\[|: error: .*XCT|Test Case .* failed/.test(l)).slice(0, 30);
      for (const l of failing) process.stdout.write(`  ${l.trim()}\n`);
      say(
        `TortieTests on iOS ${sim.runtime}: xcodebuild exited ${String(run.code)} in ${String(run.ms)} ms; ` +
          `${String(s.executed)} test(s) executed, ${String(s.failures)} failure(s), ${String(s.skipped)} skipped`
      );
      code = run.code === 0 && s.executed !== null && s.executed > 0 && s.failures === 0 ? 0 : 1;
      if (run.code === 0 && (s.executed ?? 0) === 0) say('xcodebuild exited 0 and ran no test, which is not a pass');
    });
  }
} catch (err) {
  say(`it threw: ${String(err?.message ?? err)}`);
  code = code === 0 ? 1 : code;
} finally {
  if (!keep && (process.env['P316_SCRATCH'] ?? '').trim() === '') rmSync(scratch, { recursive: true, force: true });
}

// 5. Counted once, at the end.
const left = countDevicesNamed('p316-');
say(`devices named p316- on this Mac: ${String(left.named)}, booted: ${String(left.booted)}${left.readable ? '' : ' (the list could not be read)'}`);
process.exit(code);
