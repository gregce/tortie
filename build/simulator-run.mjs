#!/usr/bin/env node
/**
 * simulator-run.mjs. One place that creates and boots an iOS Simulator, and
 * one place that shuts it down and deletes it (Phase 316.2).
 *
 * ## Why this file exists
 *
 * Phase 316 is the first Swift that ships inside a Tortie product, and every
 * claim the phone app makes is measured in a Simulator on the operator's Mac
 * (build/p316/SPEC.md §4 S2). A Simulator is not a child process a script can
 * end by pid: `simctl boot` returns at once and the device runs under launchd,
 * so `gate:background`, which looks for a detached spawn, a shell loop or a
 * sleeper, never sees it (SPEC §2 row 19). Left booted, a device holds about a
 * gigabyte and keeps running after the script that made it is gone. That is
 * the 2026-08-22 leak in a new shape, and it was MEASURED on 2026-09-22: a
 * SIGTERM skipped a `finally` and left device `7182EA58…` booted (SPEC §3.4
 * pitfall c).
 *
 * So the device's whole life is one function, the way build/electron-run.mjs
 * owns an Electron's, and build/assert-simulator-teardown.mjs (`gate:simulator`)
 * is the gate that keeps it here: no other file under build/ may name
 * `simctl create` or `simctl boot`, the teardown below is inside a `finally`
 * read by matching braces, and the signal handlers are present.
 *
 * ## The exports
 *
 *   withSimulator(options, body)   Create ONE device named `p316-<run id>`
 *                                  from the iPhone 16 Pro device type, boot
 *                                  it, wait for `bootstatus`, hand it to
 *                                  `body`, and shut it down AND delete it in a
 *                                  `finally` whatever `body` did.
 *   xcodebuildRun(options)         One `xcodebuild` that needs no device (a
 *                                  build for the Simulator SDK), with its
 *                                  derived data and logs in scratch and its
 *                                  child ended on the way out.
 *   simulatorHarnessMissing(want)  The sentence naming what this Mac lacks, or
 *                                  null. Synchronous: call it before any door
 *                                  of your own is serving (pitfall b below).
 *   countDevicesNamed(prefix)      How many devices on this Mac carry the
 *                                  prefix, for the end-of-run count. Read only.
 *
 * ## What the teardown does, and why each step is there
 *
 *  1. End every `xcodebuild` this device's handle started: SIGTERM, a short
 *     wait, then SIGKILL of the recorded pid and every descendant `pgrep -P`
 *     finds. Only pids this file started, and their children, are signalled.
 *  2. `simctl shutdown <udid>`, THE UDID THIS CALL CREATED and nothing else.
 *     Never `all` and never `booted`: those name devices somebody else made.
 *  3. `simctl delete <udid>`, then `simctl list devices -j` read back, and the
 *     delete tried once more if the device is still listed. The report says
 *     `deviceStillListed` either way.
 *  4. `~/Library/Logs/CoreSimulator/<udid>` removed. `simctl delete` leaves it
 *     behind (pitfall d: 156-184 KB each, 14 found on 2026-09-22). The path is
 *     rebuilt from the udid this call created and is removed only when its
 *     last component IS that udid, so nothing else under the person's home is
 *     ever named.
 *  5. The scratch directory (derived data, result bundles, logs) removed,
 *     unless the caller asked to keep it.
 *
 * ## The safety net, and why SIGHUP is in it
 *
 * A `finally` block does not run when the process leaves by a signal it does
 * not handle, and it does not run after `process.exit`. Pitfall c is exactly
 * that. So every live device is also held in a module level registry, and this
 * file installs handlers once for `exit`, `SIGINT`, `SIGTERM`, `SIGHUP`,
 * `uncaughtException` and `unhandledRejection`. Each runs the same teardown
 * with blocking calls, because Node runs nothing asynchronous after `exit`.
 * SIGHUP is here because closing the terminal a verifier ran the probe in sends
 * it, and build/electron-run.mjs does not handle it: a SIGHUP would otherwise
 * end the script at once and leave the device booted.
 *
 * The two helpers cooperate rather than race. If build/electron-run.mjs's
 * SIGINT or SIGTERM handler runs first it calls `process.exit(1)`, and this
 * file's `exit` handler then ends the device. If this file's runs first it ends
 * the device and calls `process.exit(1)`, and electron-run's `exit` handler
 * ends the Electron.
 *
 * ## Pitfall b, and why every call in the body is asynchronous
 *
 * On 2026-09-22 a door running in the same process as a synchronous
 * `execFileSync` starved (SPEC §3.4 pitfall b). The probe runs loopback
 * stand-ins, so every call this file makes while a device is live goes through
 * the asynchronous `spawn` below. The only synchronous calls are the preflight,
 * which runs before anything serves, and the teardown on a signal or `exit`,
 * when nothing will be served again.
 *
 * ## What this file does not promise
 *
 * A SIGKILL cannot be handled by anything, so a SIGKILL of the script leaves
 * its device behind. The device is named `p316-<run id>` with the script's pid
 * in the run id, and the next run PRINTS every `p316-` device it did not make
 * and touches none of them. Deleting one is a person's decision.
 *
 * `xcodebuild` touches `~/Library/Caches/org.swift.swiftpm/package-collection.db-shm`
 * even with `-derivedDataPath` (pitfall e). This file passes
 * `-packageCachePath` and `-clonedSourcePackagesDirPath` under scratch and
 * `-disableAutomaticPackageResolution`, which is everything xcodebuild offers,
 * and it is NOT ENOUGH: on 2026-09-23 a `build-for-testing` through
 * `xcodebuildRun` exited 0 in 13.8 s and that file's mtime moved during it
 * (another builder's xcodebuild in the same minute cannot be excluded). It is
 * SwiftPM's own collection cache, written in place, and nothing here can
 * redirect it; it is named here rather than claimed away.
 *
 * Simulator.app is never started. `simctl boot` does not start it, and nothing
 * here opens it.
 *
 * Signing: every build is ad hoc with no team, `DEVELOPMENT_TEAM=`,
 * `CODE_SIGN_STYLE=Manual` and `CODE_SIGN_IDENTITY=-` (SPEC §3.8). No Apple
 * account, no keychain of the person's.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[simulator-run]';

/** The repository root, being the parent of build/. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every device this file creates is named with this prefix (SPEC §4.0). */
export const DEVICE_PREFIX = 'p316-';

/** The device type every run creates (SPEC §4.0). */
export const DEVICE_TYPE_NAME = 'iPhone 16 Pro';

/** The runtime the phone is built against, measured in SPEC §3.1. */
export const RUNTIME_CURRENT = '26.3';

/**
 * The runtime of his own iPhone's line (SPEC §6, his answers of 2026-09-22:
 * "iOS 18.1 to 18.x"). The floor arm on it is MANDATORY, because the ATS
 * exception was measured on 26.3 only.
 */
export const RUNTIME_FLOOR = '18.3';

const UDID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,47}$/;

/**
 * The simctl verbs a handle may run on its own device. Every one of them names
 * the handle's udid and nothing else, and none of them creates, boots, clones,
 * shuts down, erases or deletes: those are this file's alone.
 */
const HANDLE_VERBS = new Set([
  'install',
  'uninstall',
  'terminate',
  'keychain',
  'get_app_container',
  'appinfo',
  'listapps'
]);

/** Every device this process still holds. The safety net reads it. */
const live = new Map();
/** Every xcodebuild this file started that has not ended yet. */
const liveChildren = new Set();
let netInstalled = false;
let nextId = 1;

const say = (line) => process.stderr.write(`${TAG} ${line}\n`);

// ---------------------------------------------------------------------------
// Refusals, asked before anything is created
// ---------------------------------------------------------------------------

/**
 * Why this scratch directory may not be used, or null. The same two refusals
 * build/electron-run.mjs asks of a profile: not inside the repository, where it
 * would be committed, and not under the person's home, where the sweep in the
 * teardown would be naming his own files.
 */
export function refuseScratchReason(dir) {
  if (typeof dir !== 'string' || dir === '') return 'no scratch directory was given.';
  if (!dir.startsWith('/')) return `the scratch directory "${dir}" is not an absolute path.`;
  const path = resolve(dir);
  if (path === repoRoot || path.startsWith(repoRoot + sep)) {
    return `the scratch directory "${path}" is inside the repository.`;
  }
  const home = resolve(homedir());
  if (path === home || path.startsWith(home + sep)) {
    return `the scratch directory "${path}" is under the person's home directory.`;
  }
  if (path.length < 8) return `the scratch directory "${path}" is too short to be scratch.`;
  return null;
}

// ---------------------------------------------------------------------------
// Running a program, asynchronously, with its child ended on the way out
// ---------------------------------------------------------------------------

/**
 * Every descendant of `pid`, one generation at a time. Synchronous, and only
 * ever called while ending children, when no door of this process serves.
 */
function descendants(pid) {
  const found = [];
  const stack = [pid];
  while (stack.length > 0) {
    const p = stack.pop();
    const r = spawnSync('pgrep', ['-P', String(p)], { encoding: 'utf8' });
    for (const line of String(r.stdout ?? '').split('\n')) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n > 1 && !found.includes(n)) {
        found.push(n);
        stack.push(n);
      }
    }
  }
  return found;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

/** SIGTERM, then SIGKILL of the pid and its tree. Blocking and bounded. */
function endChildSync(child) {
  const pid = child?.pid ?? 0;
  if (!(pid > 1)) return 0;
  const tree = [...descendants(pid), pid];
  let ended = 0;
  for (const p of tree) {
    if (!alive(p)) continue;
    try {
      process.kill(p, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  const deadline = Date.now() + 3_000;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  while (tree.some(alive) && Date.now() < deadline) {
    // A blocking 100 ms wait that starts no process.
    Atomics.wait(pause, 0, 0, 100);
  }
  for (const p of tree) {
    if (!alive(p)) continue;
    try {
      process.kill(p, 'SIGKILL');
      ended += 1;
    } catch {
      /* already gone */
    }
  }
  liveChildren.delete(child);
  return ended;
}

/** The same, asynchronously, for the ordinary teardown. */
async function endChild(child) {
  const pid = child?.pid ?? 0;
  if (!(pid > 1) || child.exitCode !== null || child.signalCode !== null) {
    liveChildren.delete(child);
    return 0;
  }
  const tree = [...descendants(pid), pid];
  for (const p of tree) {
    try {
      process.kill(p, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }
  const deadline = Date.now() + 5_000;
  while (tree.some(alive) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
  let ended = 0;
  for (const p of tree) {
    if (!alive(p)) continue;
    try {
      process.kill(p, 'SIGKILL');
      ended += 1;
    } catch {
      /* already gone */
    }
  }
  liveChildren.delete(child);
  return ended;
}

/**
 * Run one program asynchronously and wait for it. It never rejects: a program
 * that could not start answers code 127 and the reason.
 *
 * @param {string} file
 * @param {string[]} args
 * @param {{timeoutMs?: number, onLine?: (line: string) => void, env?: object,
 *          cwd?: string, logFile?: string|null, owner?: Set<any>|null}} [options]
 */
function run(file, args, options = {}) {
  const { timeoutMs = 120_000, onLine = null, env = undefined, cwd = undefined, logFile = null, owner = null } = options;
  return new Promise((done) => {
    let stdout = '';
    let stderr = '';
    let pending = '';
    let timedOut = false;
    let settled = false;
    const child = spawn(file, args, {
      cwd,
      env: env === undefined ? process.env : env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    liveChildren.add(child);
    owner?.add(child);
    const feed = (chunk, which) => {
      const text = chunk.toString('utf8');
      if (which === 'out') stdout += text;
      else stderr += text;
      if (logFile !== null) {
        try {
          appendFileSync(logFile, text);
        } catch {
          /* the log is a convenience; its absence is not a failure */
        }
      }
      if (onLine !== null) {
        pending += text;
        let at;
        while ((at = pending.indexOf('\n')) !== -1) {
          const line = pending.slice(0, at);
          pending = pending.slice(at + 1);
          try {
            onLine(line);
          } catch (err) {
            say(`a line reader threw and was ignored: ${String(err?.message ?? err)}`);
          }
        }
      }
    };
    child.stdout.on('data', (c) => feed(c, 'out'));
    child.stderr.on('data', (c) => feed(c, 'err'));
    const timer = setTimeout(() => {
      timedOut = true;
      void endChild(child);
    }, timeoutMs);
    const finish = (code, why = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (onLine !== null && pending !== '') {
        try {
          onLine(pending);
        } catch {
          /* ignored, as above */
        }
      }
      liveChildren.delete(child);
      owner?.delete(child);
      done({ code, stdout, stderr, timedOut, why });
    };
    child.on('error', (err) => finish(127, String(err?.message ?? err)));
    child.on('close', (code, signal) => finish(code ?? (signal === null ? 1 : 128), signal));
  });
}

/** The synchronous twin, for the preflight and the signal path only. */
function runSync(file, args, timeoutMs = 60_000) {
  const r = spawnSync(file, args, { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? (r.error ? 127 : 1), stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
}

// ---------------------------------------------------------------------------
// What this Mac has
// ---------------------------------------------------------------------------

/** The runtime row whose version is `want` or `want.x`, from `simctl list runtimes -j`. */
export function pickRuntime(json, want) {
  const rows = Array.isArray(json?.runtimes) ? json.runtimes : [];
  return (
    rows.find(
      (r) =>
        r?.isAvailable !== false &&
        String(r?.platform ?? r?.name ?? '').includes('iOS') &&
        (String(r?.version) === want || String(r?.version).startsWith(`${want}.`))
    ) ?? null
  );
}

/** The device type row named exactly `name`, from `simctl list devicetypes -j`. */
export function pickDeviceType(json, name) {
  const rows = Array.isArray(json?.devicetypes) ? json.devicetypes : [];
  return rows.find((d) => d?.name === name) ?? null;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The sentence naming what this Mac lacks for a Simulator run, or null when it
 * has everything. It never passes quietly: a caller that gets a sentence
 * prints it and exits 2, which verification-checks.mjs's "Xcode and Go
 * harness" skip rule records.
 *
 * SYNCHRONOUS ON PURPOSE. It is asked once, before anything is created and
 * before any door of the caller's is serving.
 *
 * @param {{runtimes?: string[], deviceType?: string}} [want]
 * @returns {string|null}
 */
export function simulatorHarnessMissing(want = {}) {
  const runtimes = want.runtimes ?? [RUNTIME_CURRENT];
  const deviceType = want.deviceType ?? DEVICE_TYPE_NAME;
  const needs =
    `Xcode's xcodebuild and simctl, the iOS ${runtimes.join(' and iOS ')} Simulator ` +
    `runtime${runtimes.length === 1 ? '' : 's'} and the ${deviceType} device type`;
  const absent = [];
  if (process.platform !== 'darwin') {
    return `This check needs ${needs}, and this is not a Mac. Nothing was created.`;
  }
  if (runSync('xcrun', ['--find', 'xcodebuild'], 20_000).code !== 0) absent.push('xcodebuild');
  const list = runSync('xcrun', ['simctl', 'list', 'runtimes', '-j'], 60_000);
  if (list.code !== 0) {
    absent.push('simctl');
  } else {
    const types = runSync('xcrun', ['simctl', 'list', 'devicetypes', '-j'], 60_000);
    const typeKnown = pickDeviceType(parseJson(types.stdout), deviceType) !== null;
    if (!typeKnown) absent.push(`${deviceType} device type`);
    const json = parseJson(list.stdout);
    for (const r of runtimes) {
      const row = pickRuntime(json, r);
      if (row === null) {
        absent.push(`iOS ${r} runtime`);
        continue;
      }
      const supported = Array.isArray(row.supportedDeviceTypes) ? row.supportedDeviceTypes : null;
      if (typeKnown && supported !== null && !supported.some((d) => d?.name === deviceType)) {
        absent.push(`${deviceType} on its iOS ${r} runtime`);
      }
    }
  }
  if (absent.length === 0) return null;
  return `This check needs ${needs}; this Mac has no ${absent.join(' and no ')}. Nothing was created.`;
}

/** How many devices on this Mac carry `prefix` in their name. Read only. */
export function countDevicesNamed(prefix = DEVICE_PREFIX) {
  const r = runSync('xcrun', ['simctl', 'list', 'devices', '-j'], 60_000);
  const json = parseJson(r.stdout);
  let named = 0;
  let booted = 0;
  for (const rows of Object.values(json?.devices ?? {})) {
    for (const d of Array.isArray(rows) ? rows : []) {
      if (!String(d?.name ?? '').startsWith(prefix)) continue;
      named += 1;
      if (d?.state === 'Booted') booted += 1;
    }
  }
  return { named, booted, readable: json !== null };
}

/** Every device row, flattened, with its runtime key. */
function deviceRows(json) {
  const out = [];
  for (const [runtime, rows] of Object.entries(json?.devices ?? {})) {
    for (const d of Array.isArray(rows) ? rows : []) out.push({ ...d, runtime });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The teardown
// ---------------------------------------------------------------------------

/**
 * The CoreSimulator log directory `simctl delete` leaves behind (pitfall d),
 * for THIS udid, or null when the udid is not one this file created.
 */
function leftoverLogDir(udid) {
  if (!UDID_RE.test(String(udid))) return null;
  const path = join(homedir(), 'Library', 'Logs', 'CoreSimulator', udid);
  return path.endsWith(`${sep}${udid}`) ? path : null;
}

/**
 * End one device and everything its handle started. Steps 1 to 5 of the
 * header, in that order. Safe to call twice.
 */
async function teardown(entry) {
  if (entry.torn) return entry.report;
  entry.torn = true;
  const report = { name: entry.name, udid: entry.udid, childrenEnded: 0, shutdown: null, deleted: null, deviceStillListed: null, logsRemoved: false };
  // 1. Every xcodebuild this handle started.
  for (const child of [...entry.children]) report.childrenEnded += await endChild(child);
  // The udid, or, when the signal came between `create` and its answer, the
  // device carrying this run's exact name, which only this run can have made.
  let udid = entry.udid;
  if (udid === null) {
    const listed = await run('xcrun', ['simctl', 'list', 'devices', '-j'], { timeoutMs: 60_000 });
    const mine = deviceRows(parseJson(listed.stdout)).filter((d) => d?.name === entry.name);
    udid = mine.length === 1 && UDID_RE.test(String(mine[0].udid)) ? mine[0].udid : null;
    report.udid = udid;
  }
  if (udid !== null) {
    // 2. Shut down THIS udid. A device that is already shut down answers an
    //    error, which is the state wanted.
    const down = await run('xcrun', ['simctl', 'shutdown', udid], { timeoutMs: 90_000 });
    report.shutdown = down.code === 0 || /current state: Shutdown/i.test(down.stderr);
    // 3. Delete it, read the list back, and try once more if it is still there.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await run('xcrun', ['simctl', 'delete', udid], { timeoutMs: 90_000 });
      const listed = await run('xcrun', ['simctl', 'list', 'devices', '-j'], { timeoutMs: 60_000 });
      const json = parseJson(listed.stdout);
      report.deviceStillListed = json === null ? null : deviceRows(json).some((d) => d?.udid === udid);
      if (report.deviceStillListed === false) break;
    }
    report.deleted = report.deviceStillListed === false;
    // 4. The logs simctl delete leaves behind, for this udid only.
    const logs = leftoverLogDir(udid);
    if (logs !== null && existsSync(logs)) {
      rmSync(logs, { recursive: true, force: true });
      report.logsRemoved = !existsSync(logs);
    }
  }
  // 5. The scratch directory.
  if (!entry.keep) rmSync(entry.scratch, { recursive: true, force: true });
  live.delete(entry.id);
  entry.report = report;
  say(
    `${entry.label}: ${entry.name} ${udid ?? '(never created)'} shut down ${String(report.shutdown)}, ` +
      `deleted ${String(report.deleted)}, deviceStillListed ${String(report.deviceStillListed)}` +
      (report.childrenEnded > 0 ? `, ${String(report.childrenEnded)} child process(es) ended` : '')
  );
  return report;
}

/**
 * The same teardown with blocking calls only, for a signal and for `exit`.
 * Node runs nothing asynchronous after `exit`, so the ordinary teardown above
 * would never finish there.
 */
function teardownSync(entry) {
  if (entry.torn) return;
  entry.torn = true;
  for (const child of [...entry.children]) endChildSync(child);
  let udid = entry.udid;
  if (udid === null) {
    const listed = runSync('xcrun', ['simctl', 'list', 'devices', '-j'], 30_000);
    const mine = deviceRows(parseJson(listed.stdout)).filter((d) => d?.name === entry.name);
    udid = mine.length === 1 && UDID_RE.test(String(mine[0].udid)) ? mine[0].udid : null;
  }
  if (udid !== null) {
    runSync('xcrun', ['simctl', 'shutdown', udid], 60_000);
    runSync('xcrun', ['simctl', 'delete', udid], 60_000);
    const logs = leftoverLogDir(udid);
    if (logs !== null && existsSync(logs)) rmSync(logs, { recursive: true, force: true });
  }
  if (!entry.keep) rmSync(entry.scratch, { recursive: true, force: true });
  live.delete(entry.id);
  say(`${entry.label}: ${entry.name} ${udid ?? '(never created)'} shut down and deleted on the way out`);
}

/** Every live device and every stray child, blocking. */
function endEverythingSync() {
  for (const entry of [...live.values()]) teardownSync(entry);
  for (const child of [...liveChildren]) endChildSync(child);
}

/**
 * The safety net, installed once. `exit` catches every `process.exit`, the
 * three signals catch the ways a person or a harness ends a run, and the two
 * error events catch a throw that escaped every `finally`.
 */
function installNet() {
  if (netInstalled) return;
  netInstalled = true;
  process.on('exit', () => {
    endEverythingSync();
  });
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      endEverythingSync();
      process.exit(1);
    });
  }
  process.on('uncaughtException', (err) => {
    say(`uncaught: ${String(err?.stack ?? err)}`);
    endEverythingSync();
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    say(`unhandled rejection: ${String(err?.stack ?? err)}`);
    endEverythingSync();
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// xcodebuild
// ---------------------------------------------------------------------------

/** The build settings every build takes: ad hoc, no team (SPEC §3.8). */
export const AD_HOC_SETTINGS = Object.freeze([
  'DEVELOPMENT_TEAM=',
  'CODE_SIGN_STYLE=Manual',
  'CODE_SIGN_IDENTITY=-'
]);

/**
 * The argv every xcodebuild this file runs is given, before the caller's own.
 * Derived data and package caches under scratch, and never an automatic
 * package resolution, because nothing in 316 fetches a package.
 */
function xcodebuildArgs(scratch, derivedDataPath, args) {
  return [
    ...args,
    '-derivedDataPath',
    derivedDataPath,
    '-packageCachePath',
    join(scratch, 'spm-cache'),
    '-clonedSourcePackagesDirPath',
    join(scratch, 'spm-sources'),
    '-disableAutomaticPackageResolution',
    ...AD_HOC_SETTINGS
  ];
}

/**
 * The environment an xcodebuild sees: the caller's `TEST_RUNNER_` values
 * added, which xcodebuild hands to the test runner with the prefix taken off.
 */
function xcodebuildEnv(testEnv) {
  const env = { ...process.env };
  for (const [name, value] of Object.entries(testEnv ?? {})) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error(`${TAG} a test runner variable must be SHOUTING_CASE; got ${name}`);
    env[`TEST_RUNNER_${name}`] = String(value);
  }
  return env;
}

let nextBuild = 1;

/**
 * One xcodebuild that needs NO device: a build for the Simulator SDK, e.g.
 * `build-for-testing -destination generic/platform=iOS Simulator`. It refuses
 * a test action, because a test against a destination boots that destination
 * and only {@link withSimulator} boots anything.
 *
 * @param {{args: string[], scratch: string, derivedDataPath?: string,
 *          onLine?: (line: string) => void, timeoutMs?: number, label?: string}} options
 */
export async function xcodebuildRun(options) {
  const args = options?.args ?? [];
  if (args.some((a) => a === 'test' || a === 'test-without-building')) {
    throw new Error(`${TAG} xcodebuildRun builds and never tests; a test runs on a device withSimulator made.`);
  }
  const why = refuseScratchReason(options?.scratch);
  if (why !== null) throw new Error(`${TAG} ${why}`);
  const scratch = resolve(options.scratch);
  const derivedDataPath = resolve(options.derivedDataPath ?? join(scratch, 'dd'));
  const ddWhy = refuseScratchReason(derivedDataPath);
  if (ddWhy !== null) throw new Error(`${TAG} derived data: ${ddWhy}`);
  mkdirSync(join(scratch, 'logs'), { recursive: true });
  installNet();
  const logFile = join(scratch, 'logs', `xcodebuild-${String(nextBuild++)}-${options.label ?? 'build'}.log`);
  writeFileSync(logFile, '');
  const started = Date.now();
  const result = await run('xcrun', ['xcodebuild', ...xcodebuildArgs(scratch, derivedDataPath, args)], {
    timeoutMs: options.timeoutMs ?? 900_000,
    onLine: options.onLine ?? null,
    logFile
  });
  return { ...result, ms: Date.now() - started, logFile };
}

// ---------------------------------------------------------------------------
// The one export that makes a device
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SimulatorOptions
 * @property {string}  label            Printed on every line this file writes.
 * @property {string}  [runtime]        `26.3` (default) or `18.3`, matched on
 *                                      the runtime's version.
 * @property {string}  [deviceType]     Defaults to the iPhone 16 Pro.
 * @property {string}  [runId]          Makes the name `p316-<runId>`. Defaults
 *                                      to this pid and a counter, so two runs
 *                                      can never share a name.
 * @property {string}  [scratch]        Where derived data, result bundles and
 *                                      logs go. Refused inside the repository
 *                                      and under the person's home. Deleted in
 *                                      the `finally` unless `keep`.
 * @property {string}  [derivedDataPath] Defaults to `<scratch>/dd`.
 * @property {boolean} [keep=false]     Keep the scratch directory.
 * @property {number}  [bootTimeoutMs=300000]
 */

/**
 * @typedef {object} SimulatorHandle
 * @property {string} udid
 * @property {string} name
 * @property {string} runtime          The runtime's own version string.
 * @property {string} scratch
 * @property {string} derivedDataPath
 * @property {(args: string[], opts?: {onLine?: (line: string) => void,
 *            timeoutMs?: number, testEnv?: Record<string, string>,
 *            label?: string, resultBundle?: boolean,
 *            derivedDataPath?: string}) =>
 *            Promise<{code: number, stdout: string, stderr: string,
 *            timedOut: boolean, ms: number, logFile: string}>} xcodebuild
 *            One xcodebuild against THIS device: `-destination id=<udid>` is
 *            added, and so are the scratch paths and the ad hoc settings.
 * @property {(verb: string, ...args: string[]) => Promise<{code: number,
 *            stdout: string, stderr: string}>} simctl
 *            One of the verbs in HANDLE_VERBS, always on this udid.
 * @property {() => string} dataPath  The device's data directory, for a read.
 */

/**
 * Create ONE device, boot it, hand it to `body`, and shut it down and delete it
 * in a `finally` whatever `body` did. The value `body` returns is returned.
 *
 * @template T
 * @param {SimulatorOptions} options
 * @param {(handle: SimulatorHandle) => Promise<T>} body
 * @returns {Promise<T>}
 */
export async function withSimulator(options, body) {
  const label = options?.label ?? 'simulator';
  const runtimeWant = options?.runtime ?? RUNTIME_CURRENT;
  const deviceTypeName = options?.deviceType ?? DEVICE_TYPE_NAME;
  const id = nextId++;
  const runId = options?.runId ?? `${String(process.pid)}-${String(id)}`;
  if (!RUN_ID_RE.test(runId)) throw new Error(`${TAG} ${label}: the run id "${runId}" is not a plain name.`);
  const name = `${DEVICE_PREFIX}${runId}`;
  const scratch = resolve(options?.scratch ?? join(tmpdir(), `p316-sim-${runId}`));
  const scratchWhy = refuseScratchReason(scratch);
  if (scratchWhy !== null) throw new Error(`${TAG} ${label}: ${scratchWhy}`);
  const derivedDataPath = resolve(options?.derivedDataPath ?? join(scratch, 'dd'));
  const ddWhy = refuseScratchReason(derivedDataPath);
  if (ddWhy !== null) throw new Error(`${TAG} ${label}: derived data: ${ddWhy}`);

  // What this Mac has, asked asynchronously and BEFORE anything is created, so
  // a missing runtime is a refusal with nothing to clean up.
  const runtimes = await run('xcrun', ['simctl', 'list', 'runtimes', '-j'], { timeoutMs: 60_000 });
  const runtime = pickRuntime(parseJson(runtimes.stdout), runtimeWant);
  const types = await run('xcrun', ['simctl', 'list', 'devicetypes', '-j'], { timeoutMs: 60_000 });
  const deviceType = pickDeviceType(parseJson(types.stdout), deviceTypeName);
  if (runtime === null || deviceType === null) {
    throw new Error(
      `${TAG} ${label}: this Mac has no ${runtime === null ? `iOS ${runtimeWant} runtime` : ''}` +
        `${runtime === null && deviceType === null ? ' and no ' : ''}` +
        `${deviceType === null ? `${deviceTypeName} device type` : ''}. Nothing was created.`
    );
  }
  // Devices this run did NOT make, printed and never touched.
  const before = await run('xcrun', ['simctl', 'list', 'devices', '-j'], { timeoutMs: 60_000 });
  const strays = deviceRows(parseJson(before.stdout)).filter((d) => String(d?.name ?? '').startsWith(DEVICE_PREFIX));
  if (strays.length > 0) {
    say(
      `${label}: ${String(strays.length)} device(s) named ${DEVICE_PREFIX}… are on this Mac and were not made by this run ` +
        `(${strays.map((d) => `${String(d.name)} ${String(d.state)}`).join(', ')}). They are left alone.`
    );
  }
  if (strays.some((d) => d?.name === name)) {
    throw new Error(`${TAG} ${label}: a device named ${name} already exists, so this run could not tell its own from it. Nothing was created.`);
  }

  mkdirSync(join(scratch, 'logs'), { recursive: true });
  mkdirSync(join(scratch, 'results'), { recursive: true });
  installNet();
  const entry = {
    id,
    label,
    name,
    udid: null,
    scratch,
    keep: options?.keep === true,
    children: new Set(),
    torn: false,
    report: null
  };
  // Registered BEFORE the create, so a signal that lands while `create` runs
  // still finds this run's device by its exact name.
  live.set(id, entry);

  try {
    const made = await run('xcrun', ['simctl', 'create', name, deviceType.identifier, runtime.identifier], {
      timeoutMs: 60_000,
      owner: entry.children
    });
    const udid = made.stdout.trim();
    if (made.code !== 0 || !UDID_RE.test(udid)) {
      throw new Error(`${TAG} ${label}: simctl create answered ${String(made.code)}: ${made.stderr.trim().slice(0, 300)}`);
    }
    entry.udid = udid;
    const bootStarted = Date.now();
    const boot = await run('xcrun', ['simctl', 'boot', udid], { timeoutMs: 120_000, owner: entry.children });
    if (boot.code !== 0 && !/current state: Booted/i.test(boot.stderr)) {
      throw new Error(`${TAG} ${label}: simctl boot answered ${String(boot.code)}: ${boot.stderr.trim().slice(0, 300)}`);
    }
    const status = await run('xcrun', ['simctl', 'bootstatus', udid], {
      timeoutMs: options?.bootTimeoutMs ?? 300_000,
      owner: entry.children
    });
    if (status.code !== 0) {
      throw new Error(`${TAG} ${label}: bootstatus answered ${String(status.code)}${status.timedOut ? ' (timed out)' : ''}`);
    }
    say(`${label}: ${name} ${udid} on iOS ${String(runtime.version)} booted in ${String(Date.now() - bootStarted)} ms`);

    let results = 0;
    const handle = {
      udid,
      name,
      runtime: String(runtime.version),
      scratch,
      derivedDataPath,
      async xcodebuild(args, opts = {}) {
        const n = (results += 1);
        const tag = String(opts.label ?? `run${String(n)}`).replace(/[^A-Za-z0-9-]/g, '-');
        const logFile = join(scratch, 'logs', `xcodebuild-${String(n)}-${tag}.log`);
        writeFileSync(logFile, '');
        const extra = ['-destination', `id=${udid}`];
        if (opts.resultBundle !== false) extra.push('-resultBundlePath', join(scratch, 'results', `${String(n)}-${tag}.xcresult`));
        const started = Date.now();
        // One device can run more than one build's products (the ATS arm runs
        // the shipping plist and a copy with the key removed), so a call may
        // name its own derived data, refused in the same places.
        const dd = resolve(opts.derivedDataPath ?? derivedDataPath);
        const ddWhy = refuseScratchReason(dd);
        if (ddWhy !== null) throw new Error(`${TAG} ${label}: derived data: ${ddWhy}`);
        const r = await run('xcrun', ['xcodebuild', ...xcodebuildArgs(scratch, dd, [...args, ...extra])], {
          timeoutMs: opts.timeoutMs ?? 900_000,
          onLine: opts.onLine ?? null,
          env: xcodebuildEnv(opts.testEnv),
          logFile,
          owner: entry.children
        });
        return { ...r, ms: Date.now() - started, logFile };
      },
      async simctl(verb, ...args) {
        if (!HANDLE_VERBS.has(verb)) {
          throw new Error(`${TAG} ${label}: "${verb}" is not a verb a handle may run; creating, booting and ending a device are this file's alone.`);
        }
        return run('xcrun', ['simctl', verb, udid, ...args], { timeoutMs: 120_000, owner: entry.children });
      },
      dataPath() {
        return join(homedir(), 'Library', 'Developer', 'CoreSimulator', 'Devices', udid, 'data');
      }
    };
    return await body(handle);
  } finally {
    // Whatever happened above, the device this call created is shut down and
    // deleted here, with every xcodebuild its handle started, the logs simctl
    // leaves behind for this udid, and the scratch directory. This block is
    // the reason this file exists.
    await teardown(entry);
  }
}
