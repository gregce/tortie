#!/usr/bin/env node
/**
 * drive-result.mjs. A drive script writes its result to a FILE (Phase 261).
 *
 * ## THE RULE
 *
 * A script that drives something and produces an answer writes that answer to a
 * file under the scratch directory, and the verifier reads that file. Printing
 * it to a console is not enough and never was.
 *
 * ## WHY, and it is two losses rather than a preference
 *
 * Phase 90.2 lost the numbers for its own Escape re-drive. Its drive script
 * ended in three `console.log` calls and held no write at all, so when the
 * transcript went the evidence went with it and the phase entry had to say the
 * fix was not measured. Phase 87 lost a whole study the same way. Phase 86.1's
 * table recorded the rule the next round touching build/ was to write down, and
 * this file is it.
 *
 * The loss is silent, which is what makes it worth a module. A run that printed
 * its numbers and exited 0 looks exactly like a run whose numbers were kept.
 *
 * ## WHAT IT IS NOT
 *
 * It is NOT a retrofit. Nothing already in this tree was rewritten onto it,
 * because rewriting fifty drive scripts is a sweep and Phase 261 refuses
 * sweeps. The convention is stated here and the probes written from here on
 * follow it, which is what stops this being a file nobody imports.
 *
 * It is NOT a log. One value per run, JSON, written once at the end. A script
 * that wants a running commentary still prints one.
 *
 * ## WHERE THE FILE GOES
 *
 * The first of these that is set, so a harness run keeps its result beside the
 * rest of its own scratch state and a bare run still keeps one somewhere:
 *
 *   GMUX_DRIVE_RESULTS   named explicitly by whoever is driving
 *   GMUX_HARNESS_DIR     the run directory build/harness-socket.mjs composed
 *   ${TMPDIR:-/tmp}/tortie-drive-results
 *
 * The name is `<name>-<pid>.json`, so two runs of one script never overwrite
 * each other, and the path is PRINTED on one line, so the transcript names the
 * file even when the transcript is all that survives.
 *
 * Prove it with `node build/drive-result.mjs --self-test`. It launches nothing,
 * spawns nothing and writes only inside a scratch directory it removes in a
 * `finally`.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[drive-result]';

/** Characters a file name may carry, so a caller cannot compose a path. */
function safeName(name) {
  const clean = String(name ?? '').replace(/[^A-Za-z0-9._-]/g, '-');
  if (clean === '' || clean === '.' || clean === '..') {
    throw new Error(`${TAG} a drive result needs a name and "${String(name)}" is not one.`);
  }
  return clean;
}

/**
 * The directory this run's results go in, by the priority in the header.
 *
 * @param {Record<string, string|undefined>} [env=process.env]
 * @returns {string}
 */
export function driveResultDir(env = process.env) {
  const named = String(env['GMUX_DRIVE_RESULTS'] ?? '').trim();
  if (named !== '') return named;
  const harness = String(env['GMUX_HARNESS_DIR'] ?? '').trim();
  if (harness !== '') return harness;
  return join(String(env['TMPDIR'] ?? '/tmp'), 'tortie-drive-results');
}

/**
 * Where this run's result will be written. Nothing is created by asking.
 *
 * @param {string} name
 * @param {Record<string, string|undefined>} [env=process.env]
 * @param {number} [pid=process.pid]
 * @returns {string}
 */
export function driveResultPath(name, env = process.env, pid = process.pid) {
  return join(driveResultDir(env), `${safeName(name)}-${String(pid)}.json`);
}

/**
 * Write one drive's result and print where it went.
 *
 * `startedAt` is optional and is the caller's own ISO string when it has one,
 * because the interesting duration is the DRIVE's and not this call's.
 *
 * @param {string} name
 * @param {unknown} value the answer itself
 * @param {{env?: Record<string, string|undefined>, pid?: number, startedAt?: string}} [opts]
 * @returns {string} the absolute path written
 */
export function writeDriveResult(name, value, opts = {}) {
  const env = opts.env ?? process.env;
  const pid = opts.pid ?? process.pid;
  const path = driveResultPath(name, env, pid);
  mkdirSync(driveResultDir(env), { recursive: true });
  const record = {
    name: safeName(name),
    pid,
    cwd: process.cwd(),
    startedAt: opts.startedAt ?? null,
    finishedAt: new Date().toISOString(),
    value
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${TAG} wrote ${path}`);
  return path;
}

/**
 * The verifier's half. Read one back.
 *
 * @param {string} path
 * @returns {{name: string, pid: number, cwd: string, startedAt: string|null, finishedAt: string, value: unknown}}
 */
export function readDriveResult(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'p261-drive-'));
  const failures = [];
  const say = (what, detail) => failures.push({ what, detail });
  try {
    // 1. The round trip.
    const path = writeDriveResult(
      'p261-fixture',
      { findings: 0, readings: 3 },
      { env: { GMUX_DRIVE_RESULTS: dir }, pid: 4242 }
    );
    if (path !== join(dir, 'p261-fixture-4242.json')) {
      say('the name is not <name>-<pid>.json', path);
    }
    const back = readDriveResult(path);
    if (back.value.findings !== 0 || back.value.readings !== 3) {
      say('the value did not survive the round trip', JSON.stringify(back));
    }
    if (back.name !== 'p261-fixture' || back.pid !== 4242) {
      say('the record does not name the run', JSON.stringify(back));
    }
    if (typeof back.finishedAt !== 'string' || back.finishedAt === '') {
      say('the record carries no finish time', JSON.stringify(back));
    }

    // 2. The three destinations, in priority order.
    const both = driveResultDir({
      GMUX_DRIVE_RESULTS: '/tmp/named',
      GMUX_HARNESS_DIR: '/tmp/harness',
      TMPDIR: '/tmp/t'
    });
    if (both !== '/tmp/named') say('GMUX_DRIVE_RESULTS did not win', both);
    const harness = driveResultDir({
      GMUX_HARNESS_DIR: '/tmp/harness',
      TMPDIR: '/tmp/t'
    });
    if (harness !== '/tmp/harness') {
      say('GMUX_HARNESS_DIR did not win over TMPDIR', harness);
    }
    const fallback = driveResultDir({ TMPDIR: '/tmp/t' });
    if (fallback !== '/tmp/t/tortie-drive-results') {
      say('the fallback is not under TMPDIR', fallback);
    }
    const bare = driveResultDir({});
    if (bare !== '/tmp/tortie-drive-results') {
      say('with nothing set the fallback is not /tmp', bare);
    }
    // An empty value is not a destination. A shell that exports
    // GMUX_HARNESS_DIR= must fall through rather than write to "".
    const empty = driveResultDir({ GMUX_DRIVE_RESULTS: '', GMUX_HARNESS_DIR: '' , TMPDIR: '/tmp/t' });
    if (empty !== '/tmp/t/tortie-drive-results') {
      say('an empty variable was taken as a destination', empty);
    }

    // 3. A name cannot compose a path.
    // The dots survive as ORDINARY characters of the file name, which is the
    // point: nothing in the name may become a path separator or a parent hop.
    const sly = driveResultPath('../../escape', { GMUX_DRIVE_RESULTS: dir }, 7);
    if (dirname(sly) !== dir || basename(sly).includes('/')) {
      say('a name carrying .. escaped the directory', sly);
    }
    if (basename(sly) !== '..-..-escape-7.json') {
      say('the separators in a name were not flattened', basename(sly));
    }

    if (failures.length > 0) {
      console.error(`${TAG} self-test FAILED`);
      for (const f of failures) console.error(`  ${f.what}: ${f.detail}`);
      process.exit(1);
    }
    console.log(
      `${TAG} self-test ok: the round trip keeps the value, the three ` +
        `destinations resolve in order, an empty variable falls through and a ` +
        `name carrying ".." cannot leave the directory.`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The self-test runs only when this file IS the command. An importer that
// carries --self-test of its own, e.g. a probe proving its own graders, must
// not have this one fire inside it.
const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly && process.argv.includes('--self-test')) selfTest();
