#!/usr/bin/env node
/**
 * The update rehearsal harness (Phase 24, spec section 12).
 *
 * WHAT THIS PROVES. It builds two locally signed packages of this checkout,
 * versioned 0.18.1 and 0.18.2, serves a generic update feed for 0.18.2 from a
 * loopback web server, launches the 0.18.1 app against that feed, and drives
 * one full update. The acceptance is the end state. After a normal quit and a
 * relaunch there is a running Tortie whose Info.plist reads 0.18.2, whose
 * updates.json records 0.18.2, and whose tmux server still holds every
 * session it held before the swap.
 *
 * WHAT IT DOES NOT PROVE. One green roundtrip is a smoke of the harness
 * itself. The corruption probe, the self check probe and the allowDowngrade
 * probe from the phase spec are the verifier's matrix, driven with the flags
 * below or by hand on top of the packages this script leaves in the scratch
 * directory.
 *
 * SAFETY. The operator has live sessions on the private tmux server, socket
 * "gmux". This script never addresses that socket. Every launch gets an
 * isolated --user-data-dir under the scratch directory and the harness
 * socket "gmux-update-rehearsal", which the supervisor accepts only because
 * GMUX_UPDATE_REHEARSAL is set. It kills only PIDs it started, and the only
 * server it ever ends is the one on its own harness socket. It counts the
 * operator's sessions before and after and fails loudly if the numbers
 * differ. The temporary version edits to package.json are reverted by
 * writing the original value back, never with git.
 *
 * THE FEED OVERRIDE. The launched app honors TORTIE_UPDATE_FEED only when
 * GMUX_UPDATE_REHEARSAL=1 is set, the tmux socket is not "gmux", and the
 * profile is isolated. All three hold here by construction. Squirrel refuses
 * any update not signed with the same designated requirement, so even this
 * harness cannot install foreign bytes into the app under test.
 *
 * RELEASE ARTIFACTS. The package runs overwrite release/latest-mac.yml and
 * release/mac-arm64/Tortie.app. The 0.18.0 ZIP and DMG keep their names and
 * are not touched. This script backs up latest-mac.yml first and puts it
 * back at the end, and it prints a reminder that mac-arm64/Tortie.app is a
 * rehearsal build afterwards.
 *
 * THE TWO INSTANCE PROBES (Phase 31, --two-instance). The rehearsal builds
 * carry the production bundle id, so ShipIt counts a second rehearsal
 * instance running from the SAME app path exactly the way it counted the
 * operator's relaunch on 2026-08-14. Probe R1 reproduces that abort
 * (SQRLInstallerErrorDomain code -9) and then proves the install completes
 * once the counted instance is gone. Probe R2 launches a third instance
 * from the PRISTINE copy, the same bundle id at a DIFFERENT path, and
 * proves the install completes while it keeps running, which confirms live
 * that the bundle URL is half of ShipIt's counting rule.
 *
 * SHARED SHIPIT STATE (Phase 31 preconditions). Because the rehearsal
 * builds carry the production bundle id, Squirrel gives them the SAME
 * ShipIt cache directory and launchd job label as the installed app.
 * Staging a rehearsal update while the operator has an install waiting
 * could replace the operator's pending job. So before any launch, in every
 * mode, this script refuses when a ShipIt process for the bundle id is
 * running, and refuses when ShipItState.plist targets /Applications or
 * cannot be parsed. It also snapshots the ShipIt directory, removes only
 * entries created during the run, and never truncates or deletes
 * ShipIt_stderr.log, whose lines are shared evidence.
 *
 * Usage:
 *   node build/update-rehearsal.mjs [--scratch <dir>] [--skip-package]
 *                                   [--package-only] [--keep-server]
 *                                   [--two-instance]
 *
 *   --scratch <dir>   where packages, the feed, profiles and logs live.
 *                     Defaults to <os tmpdir>/tortie-update-rehearsal.
 *   --skip-package    reuse the packages already in the scratch directory.
 *                     For verifier reruns of the roundtrip.
 *   --package-only    build the packages and the feed, then stop.
 *   --keep-server     leave the harness tmux server running at the end, so
 *                     a probe can inspect it. The next run refuses until it
 *                     is gone, which is deliberate.
 *   --two-instance    run probes R1 and R2 instead of the plain roundtrip.
 *                     Combine with --skip-package to reuse the packages.
 */

import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import {
  appendFileSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const REHEARSAL_SOCKET = 'gmux-update-rehearsal';
/** Extra instances in the two instance probes get sockets of their own. */
const SOCKET_B = 'gmux-update-rehearsal-b';
const SOCKET_C = 'gmux-update-rehearsal-c';
const ALL_SOCKETS = [REHEARSAL_SOCKET, SOCKET_B, SOCKET_C];
const OPERATOR_SOCKET = 'gmux';
const V1 = '0.18.1';
const V2 = '0.18.2';
/** The production bundle id the rehearsal builds carry (electron-builder.yml appId). */
const BUNDLE_ID = 'com.itavero.tortie';

// -- arguments ---------------------------------------------------------------

const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function option(name, fallback) {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  if (!v || v.startsWith('--')) refuse(`${name} needs a value`);
  return v;
}

function refuse(why) {
  console.error(`[rehearsal] REFUSED. ${why}`);
  process.exit(2);
}

const scratch = option('--scratch', join(tmpdir(), 'tortie-update-rehearsal'));
const skipPackage = flag('--skip-package');
const packageOnly = flag('--package-only');
const keepServer = flag('--keep-server');
const twoInstance = flag('--two-instance');

const pristineDir = join(scratch, 'pristine');
const pristineApp = join(pristineDir, 'Tortie.app');
const pristineBinary = join(pristineApp, 'Contents', 'MacOS', 'Tortie');
const appDir = join(scratch, 'app');
const appPath = join(appDir, 'Tortie.app');
const appBinary = join(appPath, 'Contents', 'MacOS', 'Tortie');
const feedDir = join(scratch, 'feed');
const profileDir = join(scratch, 'profile');
const profileBDir = join(scratch, 'profile-b');
const profileCDir = join(scratch, 'profile-c');
const logsDir = join(scratch, 'logs');
const ymlBackup = join(scratch, 'latest-mac.yml.release-backup');

/** Squirrel's shared per bundle id state. See the header note. */
const shipItDir = join(homedir(), 'Library', 'Caches', `${BUNDLE_ID}.ShipIt`);
const shipItStderrLog = join(shipItDir, 'ShipIt_stderr.log');

const t0 = Date.now();
function elapsed() {
  return `${((Date.now() - t0) / 1000).toFixed(1)}s`;
}
function log(msg) {
  const line = `[rehearsal ${elapsed()}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(join(logsDir, 'rehearsal.log'), `${line}\n`);
  } catch {
    // The summary log is a convenience, never a reason to stop.
  }
}
function fail(why) {
  console.error(`[rehearsal ${elapsed()}] FAIL. ${why}`);
  cleanupAndExit(1);
}

// -- everything this run started, so cleanup kills only what it recorded -----

/** PIDs of app processes this run spawned and has not yet reaped. */
const livePids = new Set();
/** The feed server, when running. */
let feedServer = null;
/** Sockets this run has launched instances against. */
const usedSockets = new Set();
/** True once this run has created any harness tmux server. */
let createdHarnessServer = false;
/** The original package.json version, restored on every exit path. */
let originalVersion = null;
/** The updater cache before the launches. undefined until snapshotted. */
let cacheBefore;
/** True once the cache has been cleaned, so no exit path cleans it twice. */
let cacheCleaned = false;
/** The ShipIt directory before the launches. undefined until snapshotted. */
let shipItBefore;
/** True once the ShipIt entries have been cleaned. */
let shipItCleaned = false;

function restoreVersion() {
  if (originalVersion === null) return;
  try {
    const pkgPath = join(repoRoot, 'package.json');
    const text = readFileSync(pkgPath, 'utf8');
    const now = /"version": "([^"]+)"/.exec(text)?.[1];
    if (now !== originalVersion) {
      writeFileSync(
        pkgPath,
        text.replace(/"version": "[^"]+"/, `"version": "${originalVersion}"`)
      );
      console.log(
        `[rehearsal] package.json version restored to ${originalVersion} by editing it back.`
      );
    }
  } catch (err) {
    console.error(
      `[rehearsal] could not restore package.json version. Edit it back to ${originalVersion} by hand. ${err.message}`
    );
  }
}

function killRecordedPids() {
  for (const pid of livePids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
}

function endHarnessServers() {
  if (!createdHarnessServer || keepServer) return;
  for (const socket of usedSockets) {
    try {
      const path = execFileSync(
        'tmux',
        ['-L', socket, 'display-message', '-p', '#{socket_path}'],
        { encoding: 'utf8' }
      ).trim();
      execFileSync('tmux', ['-L', socket, 'kill-server'], {
        stdio: 'ignore'
      });
      if (path.endsWith(`/${socket}`)) rmSync(path, { force: true });
      console.log(
        `[rehearsal] ended the harness tmux server on -L ${socket}.`
      );
    } catch {
      // No server left on this harness socket. Nothing to end.
    }
  }
}

function cleanupAndExit(code) {
  killRecordedPids();
  if (feedServer !== null) feedServer.close();
  endHarnessServers();
  if (cacheBefore !== undefined && !cacheCleaned) {
    try {
      cleanCache(cacheBefore);
    } catch (err) {
      console.error(`[rehearsal] cache cleanup failed. ${err.message}`);
    }
  }
  if (shipItBefore !== undefined && !shipItCleaned) {
    try {
      cleanShipIt(shipItBefore);
    } catch (err) {
      console.error(`[rehearsal] ShipIt cleanup failed. ${err.message}`);
    }
  }
  restoreVersion();
  process.exit(code);
}

process.on('SIGINT', () => cleanupAndExit(130));
process.on('SIGTERM', () => cleanupAndExit(130));

// -- small helpers ------------------------------------------------------------

function operatorSessionCount() {
  const r = spawnSync(
    'tmux',
    ['-L', OPERATOR_SOCKET, 'list-sessions'],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) return 0;
  return r.stdout.split('\n').filter((l) => l.trim() !== '').length;
}

function harnessSessionList() {
  const r = spawnSync(
    'tmux',
    ['-L', REHEARSAL_SOCKET, 'list-sessions', '-F', '#{session_id} #{session_name}'],
    { encoding: 'utf8' }
  );
  return r.status === 0 ? r.stdout : '';
}

function plistVersion(app) {
  const r = spawnSync(
    'plutil',
    ['-extract', 'CFBundleShortVersionString', 'raw', join(app, 'Contents', 'Info.plist')],
    { encoding: 'utf8' }
  );
  return r.status === 0 ? r.stdout.trim() : '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setVersion(v) {
  const pkgPath = join(repoRoot, 'package.json');
  const text = readFileSync(pkgPath, 'utf8');
  if (!/"version": "[^"]+"/.test(text)) fail('package.json has no version field to edit');
  writeFileSync(pkgPath, text.replace(/"version": "[^"]+"/, `"version": "${v}"`));
  log(`package.json version set to ${v} for the rehearsal build`);
}

/** Run a command to completion, tee its output to a log file, fail loudly. */
function run(cmd, args, logName, env) {
  const logPath = join(logsDir, logName);
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: env ?? process.env
  });
  writeFileSync(logPath, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  if (r.status !== 0) {
    const tail = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split('\n').slice(-25).join('\n');
    fail(`${cmd} ${args.join(' ')} exited ${r.status}. The full log is ${logPath}. Tail follows.\n${tail}`);
  }
  return r.stdout ?? '';
}

// -- the launched app, with timestamped log capture and pattern waits ---------

class AppRun {
  /**
   * opts.binary, opts.profile and opts.socket default to the primary
   * instance's values. The two instance probes pass their own, so instance
   * B shares the app path but not the profile or the tmux server, and
   * instance C shares neither the path nor the profile.
   */
  constructor(name, feedUrl, opts = {}) {
    const binary = opts.binary ?? appBinary;
    const profile = opts.profile ?? profileDir;
    const socket = opts.socket ?? REHEARSAL_SOCKET;
    this.name = name;
    this.startedAt = Date.now();
    this.logPath = join(logsDir, `${name}.log`);
    this.stream = createWriteStream(this.logPath, { flags: 'w' });
    this.lines = [];
    this.watchers = [];
    this.exited = false;
    this.exitPromise = new Promise((r) => {
      this.resolveExit = r;
    });
    const env = { ...process.env };
    delete env.APPLE_ID;
    delete env.APPLE_APP_SPECIFIC_PASSWORD;
    delete env.APPLE_TEAM_ID;
    delete env.APPLE_KEYCHAIN_PROFILE;
    env.GMUX_UPDATE_REHEARSAL = '1';
    env.GMUX_TMUX_SOCKET = socket;
    env.TORTIE_UPDATE_FEED = feedUrl;
    usedSockets.add(socket);
    createdHarnessServer = true;
    this.child = spawn(binary, [`--user-data-dir=${profile}`], {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    this.pid = this.child.pid;
    livePids.add(this.pid);
    log(`${name} launched, pid ${this.pid}, log ${this.logPath}`);
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        this.ingest(line);
      }
    };
    this.child.stdout.on('data', onData);
    this.child.stderr.on('data', onData);
    this.child.on('exit', (code, signal) => {
      this.exited = true;
      livePids.delete(this.pid);
      this.ingest(`(process exited, code ${code}, signal ${signal})`);
      this.stream.end();
      this.resolveExit();
    });
  }

  ingest(line) {
    const at = Date.now() - this.startedAt;
    this.lines.push({ at, line });
    this.stream.write(`+${(at / 1000).toFixed(1)}s ${line}\n`);
    for (const w of [...this.watchers]) {
      if (w.regex.test(line)) {
        this.watchers.splice(this.watchers.indexOf(w), 1);
        w.resolve({ line, at });
      }
    }
  }

  /** Resolve with the first line matching regex, from boot or yet to come. */
  waitFor(regex, timeoutMs, what) {
    const seen = this.lines.find((l) => regex.test(l.line));
    if (seen) return Promise.resolve({ line: seen.line, at: seen.at });
    return new Promise((resolve, reject) => {
      const w = { regex, resolve };
      this.watchers.push(w);
      setTimeout(() => {
        if (this.watchers.includes(w)) {
          this.watchers.splice(this.watchers.indexOf(w), 1);
          reject(new Error(`timed out after ${timeoutMs / 1000} s waiting for ${what}`));
        }
      }, timeoutMs);
    });
  }

  sawLine(regex) {
    return this.lines.some((l) => regex.test(l.line));
  }

  /** SIGTERM, then SIGKILL only if the recorded pid outlives the deadline. */
  async quit(deadlineMs) {
    if (this.exited) return;
    try {
      process.kill(this.pid, 'SIGTERM');
    } catch {
      return;
    }
    const killer = setTimeout(() => {
      if (!this.exited) {
        log(`${this.name} did not exit within ${deadlineMs / 1000} s of SIGTERM, sending SIGKILL`);
        try {
          process.kill(this.pid, 'SIGKILL');
        } catch {
          // Already gone.
        }
      }
    }, deadlineMs);
    await this.exitPromise;
    clearTimeout(killer);
  }
}

// -- phase one, the two packages and the feed ---------------------------------

function buildPackages() {
  const pkgEnv = { ...process.env };
  // No notarization for rehearsal builds. Squirrel checks the designated
  // requirement, not the notary ticket, and a locally launched app carries no
  // quarantine bit. Stripping the variables makes that deliberate.
  delete pkgEnv.APPLE_ID;
  delete pkgEnv.APPLE_APP_SPECIFIC_PASSWORD;
  delete pkgEnv.APPLE_TEAM_ID;
  delete pkgEnv.APPLE_KEYCHAIN_PROFILE;

  const releaseYml = join(repoRoot, 'release', 'latest-mac.yml');
  if (existsSync(releaseYml) && !existsSync(ymlBackup)) {
    copyFileSync(releaseYml, ymlBackup);
    log('backed up the release latest-mac.yml before the rehearsal builds overwrite it');
  }

  setVersion(V1);
  log(`packaging ${V1}. This takes a few minutes.`);
  run('npm', ['run', 'package'], `package-${V1}.log`, pkgEnv);
  log(`packaged ${V1}. Running the signing gate.`);
  run('node', ['build/verify-signed.mjs'], `verify-signed-${V1}.log`, pkgEnv);
  rmSync(pristineDir, { recursive: true, force: true });
  mkdirSync(pristineDir, { recursive: true });
  execFileSync('ditto', [join(repoRoot, 'release', 'mac-arm64', 'Tortie.app'), pristineApp]);
  log(`kept a pristine signed ${V1} at ${pristineApp}`);

  setVersion(V2);
  log(`packaging ${V2}. This takes a few minutes.`);
  run('npm', ['run', 'package'], `package-${V2}.log`, pkgEnv);
  rmSync(feedDir, { recursive: true, force: true });
  mkdirSync(feedDir, { recursive: true });
  for (const name of [
    `Tortie-${V2}-arm64.zip`,
    `Tortie-${V2}-arm64.zip.blockmap`,
    'latest-mac.yml'
  ]) {
    const src = join(repoRoot, 'release', name);
    if (!existsSync(src)) fail(`the ${V2} package did not produce ${name}`);
    copyFileSync(src, join(feedDir, name));
  }
  log(`feed collected at ${feedDir}`);

  setVersion(originalVersion);
  log(`package.json version is back at ${originalVersion}`);

  if (existsSync(ymlBackup)) {
    copyFileSync(ymlBackup, releaseYml);
    log('release/latest-mac.yml restored from the backup. release/mac-arm64/Tortie.app is now a rehearsal build; run npm run package before shipping anything from release/.');
  }
}

// -- phase two, the feed server ------------------------------------------------

function startFeedServer() {
  return new Promise((resolveServer) => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent((req.url ?? '/').split('?')[0].replace(/^\/+/, ''));
      const file = join(feedDir, name);
      if (name === '' || name.includes('..') || name.includes('/') || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        log(`feed answered 404 for ${req.method} ${req.url}`);
        return;
      }
      const size = statSync(file).size;
      // Full responses only. electron-updater falls back to a full download
      // when a ranged differential request fails, and the delta cache is
      // cold here anyway.
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': size
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        createReadStream(file).pipe(res);
      }
      log(`feed served ${name}, ${size} bytes`);
    });
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

// -- the updater's download cache, recorded before and cleaned after ----------

const updaterCacheDir = join(homedir(), 'Library', 'Caches', 'tortie-updater');

/** Every path under dir, parents before children, or null when dir is absent. */
function snapshotTree(dir) {
  if (!existsSync(dir)) return null;
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      out.push(p);
      if (entry.isDirectory()) walk(p);
    }
  };
  walk(dir);
  return out;
}

function cacheSnapshot() {
  return snapshotTree(updaterCacheDir);
}

function cleanCache(before) {
  cacheCleaned = true;
  if (!existsSync(updaterCacheDir)) {
    log('the updater cache directory does not exist, nothing to clean');
    return;
  }
  if (before === null) {
    rmSync(updaterCacheDir, { recursive: true, force: true });
    log(`the updater cache was created by this rehearsal at ${updaterCacheDir} and has been removed whole`);
    return;
  }
  const keep = new Set(before);
  const after = cacheSnapshot() ?? [];
  const created = after.filter((p) => !keep.has(p));
  for (const p of created.reverse()) rmSync(p, { recursive: true, force: true });
  log(`the updater cache at ${updaterCacheDir} existed before this run. ${created.length} entries created during the rehearsal were removed and nothing else was.`);
}

// -- the shared ShipIt directory: preconditions, snapshot, careful cleanup ----

/**
 * The rehearsal builds carry the production bundle id, so Squirrel gives
 * them the operator's own ShipIt cache directory and launchd job label.
 * Staging a rehearsal update while the operator has an install waiting
 * could replace the operator's pending job. These two refusals run before
 * any launch, in every mode.
 */
function refuseIfInstalledUpdateInFlight() {
  const r = spawnSync('pgrep', ['-lf', `${BUNDLE_ID}.ShipIt`], {
    encoding: 'utf8'
  });
  if (r.status === 0 && r.stdout.trim() !== '') {
    refuse(
      `a ShipIt process for ${BUNDLE_ID} is running (${r.stdout.trim().split('\n')[0]}). The installed Tortie has an update waiting to install. Quit Tortie once, let it install, and run the rehearsal again.`
    );
  }
  const statePlist = join(shipItDir, 'ShipItState.plist');
  if (!existsSync(statePlist)) return;
  let parsed = null;
  try {
    // The file parses as JSON despite its name.
    parsed = JSON.parse(readFileSync(statePlist, 'utf8'));
  } catch {
    refuse(
      `${statePlist} exists and cannot be parsed. Failing safe, because the installed app may have an install in flight. Look at the file before running the rehearsal.`
    );
  }
  const target = String(parsed?.targetBundleURL ?? '');
  if (target.includes('/Applications/Tortie.app')) {
    refuse(
      `${statePlist} targets /Applications/Tortie.app. The installed Tortie has an update staged. Quit Tortie once, let it install, and run the rehearsal again.`
    );
  }
}

/**
 * Remove only the ShipIt entries this run created, and never the shared
 * ShipIt_stderr.log. The rehearsal's ShipIt lines do land in that log; that
 * is inherent to sharing the bundle id, and the app's refusal parser
 * filters by recency against its own pending record for exactly this
 * reason.
 */
function cleanShipIt(before) {
  shipItCleaned = true;
  if (!existsSync(shipItDir)) {
    log('the ShipIt directory does not exist, nothing to clean');
    return;
  }
  const keep = new Set(before ?? []);
  const after = snapshotTree(shipItDir) ?? [];
  const created = after.filter(
    (p) => !keep.has(p) && !p.endsWith('ShipIt_stderr.log')
  );
  for (const p of created.reverse()) rmSync(p, { recursive: true, force: true });
  log(
    `removed ${created.length} entries the run created under ${shipItDir}. ShipIt_stderr.log was preserved.`
  );
}

/** Current byte size of the shared ShipIt stderr log. */
function shipItStderrSize() {
  try {
    return statSync(shipItStderrLog).size;
  } catch {
    return 0;
  }
}

/** The log's bytes from offset onward, as text. */
function shipItStderrSince(offset) {
  try {
    const buf = readFileSync(shipItStderrLog);
    return buf.subarray(Math.min(offset, buf.length)).toString('utf8');
  } catch {
    return '';
  }
}

// -- the roundtrip ---------------------------------------------------------------

async function roundtrip(feedUrl) {
  // A fresh app copy and a fresh profile, per spec.
  rmSync(appDir, { recursive: true, force: true });
  mkdirSync(appDir, { recursive: true });
  execFileSync('ditto', [pristineApp, appPath]);
  rmSync(profileDir, { recursive: true, force: true });
  const startVersion = plistVersion(appPath);
  if (startVersion !== V1) fail(`the app under test reads ${startVersion}, expected ${V1}`);
  log(`fresh ${V1} copy at ${appPath}, fresh profile at ${profileDir}`);

  // Run 1. Boot, plant keepers, watch the timers, watch the download stage.
  const run1 = new AppRun('run1', feedUrl);
  await run1.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  log('run1 booted and its tmux server is up');

  execFileSync('tmux', [
    '-L', REHEARSAL_SOCKET, 'new-session', '-d', '-s', 'keeper1',
    'while true; do date; sleep 1; done'
  ]);
  execFileSync('tmux', [
    '-L', REHEARSAL_SOCKET, 'new-session', '-d', '-s', 'keeper2',
    'while true; do date; sleep 1; done'
  ]);
  log('planted keeper1 and keeper2 on the harness server, out of band. App driven session creation needs a human at the UI; the survival claim is about the server and its sessions, and Phase 17 plus smoke:t3 already cover app adoption.');

  const checking = await run1.waitFor(/Checking for update/, 180_000, 'the first update check');
  const gapSeconds = checking.at / 1000;
  log(`first check began ${gapSeconds.toFixed(1)} s after launch. The floor is 25 s.`);
  if (gapSeconds < 25) fail(`the first check ran ${gapSeconds.toFixed(1)} s after launch, under the 25 s floor`);

  const downloaded = await run1.waitFor(/is downloaded and staging has started/, 300_000, `the downloaded line for ${V2}`);
  log(`download evidence at ${(downloaded.at / 1000).toFixed(1)} s after launch. ${downloaded.line.trim()}`);

  // The line above is electron-updater's own download finishing. With
  // autoInstallOnAppQuit the library then has native Squirrel.Mac fetch the
  // file from a loopback proxy and stage it, and only after the native
  // update-downloaded event does a quit install anything. Measured on the
  // first harness run. A quit 0.2 s after the download line installed
  // nothing. Since Phase 31 the app logs its own staged line at the native
  // moment, and the rehearsal waits on that line as the staged evidence,
  // keeping the library's debug line beside it.
  const staged = await run1.waitFor(/is staged and installs when you quit/, 300_000, `the staged line for ${V2}`);
  log(`staged evidence at ${(staged.at / 1000).toFixed(1)} s after launch. ${staged.line.trim()}`);
  const native = await run1.waitFor(/nativeUpdater\.update-downloaded/, 300_000, 'Squirrel staging the update natively');
  log(`Squirrel finished staging natively at ${(native.at / 1000).toFixed(1)} s after launch. A quit from here installs.`);

  const listBefore = harnessSessionList();
  writeFileSync(join(logsDir, 'sessions-before-quit.txt'), listBefore);
  log(`harness sessions before quit.\n${listBefore.trim()}`);

  // Quit. The snapshot flush is bounded at 8 s and the install may ride it.
  await run1.quit(45_000);
  log('run1 exited after SIGTERM');

  // When does the bundle swap land, at quit or at the next launch? Poll.
  let swapMoment = 'not observed within 60 s of quit';
  for (let waited = 0; waited < 60_000; waited += 2_000) {
    if (plistVersion(appPath) === V2) {
      swapMoment = `at quit, ${(waited / 1000).toFixed(0)} to ${((waited + 2000) / 1000).toFixed(0)} s after exit`;
      break;
    }
    await sleep(2_000);
  }
  log(`bundle swap moment. ${swapMoment}. Info.plist now reads ${plistVersion(appPath)}.`);

  // Run 2. Relaunch the same command line. The acceptance is the end state.
  let finalRun = new AppRun('run2', feedUrl);
  const updatesJson = join(profileDir, 'updates.json');
  const readLastSeen = () => {
    try {
      return JSON.parse(readFileSync(updatesJson, 'utf8')).lastSeenVersion ?? null;
    } catch {
      return null;
    }
  };
  let sawNewVersion = false;
  for (let waited = 0; waited < 120_000; waited += 2_000) {
    if (readLastSeen() === V2) {
      sawNewVersion = true;
      break;
    }
    await sleep(2_000);
  }
  if (!sawNewVersion && plistVersion(appPath) === V2) {
    // The swap landed during or after the relaunch, so the running process
    // is still the old binary. One more launch runs the new bundle.
    log('the swap landed at relaunch rather than at quit. Quitting and launching once more.');
    await finalRun.quit(45_000);
    finalRun = new AppRun('run3', feedUrl);
    for (let waited = 0; waited < 120_000; waited += 2_000) {
      if (readLastSeen() === V2) {
        sawNewVersion = true;
        break;
      }
      await sleep(2_000);
    }
  }
  if (!sawNewVersion) {
    fail(`updates.json never recorded lastSeenVersion ${V2}. It reads ${readLastSeen()} and Info.plist reads ${plistVersion(appPath)}.`);
  }
  const plistNow = plistVersion(appPath);
  if (plistNow !== V2) fail(`updates.json reads ${V2} but Info.plist reads ${plistNow}`);
  log(`the relaunched Tortie is ${V2}. Info.plist reads ${plistNow} and updates.json records lastSeenVersion ${V2}.`);

  // The post update self check must have passed silently.
  if (finalRun.sawLine(/left resources missing/)) {
    fail('the post update self check reported missing resources on a complete bundle');
  }
  log('the post update self check ran silently. No missing resource line in the log.');

  // The sessions survived the swap.
  const listAfter = harnessSessionList();
  writeFileSync(join(logsDir, 'sessions-after-relaunch.txt'), listAfter);
  if (listAfter !== listBefore) {
    fail(`the harness session list changed across the update.\nbefore:\n${listBefore}\nafter:\n${listAfter}`);
  }
  log('the session list after relaunch is byte identical to the list before quit');

  await finalRun.quit(45_000);
  log('final run exited after SIGTERM');

  return { gapSeconds, stagedAtSeconds: staged.at / 1000, swapMoment };
}

// -- the two instance probes (Phase 31) ---------------------------------------

function freshProfile(dir) {
  rmSync(dir, { recursive: true, force: true });
  return dir;
}

/** A fresh V1 app copy at appPath and a fresh primary profile. */
function freshV1Copy() {
  rmSync(appDir, { recursive: true, force: true });
  mkdirSync(appDir, { recursive: true });
  execFileSync('ditto', [pristineApp, appPath]);
  rmSync(profileDir, { recursive: true, force: true });
  const v = plistVersion(appPath);
  if (v !== V1) fail(`the app under test reads ${v}, expected ${V1}`);
  log(`fresh ${V1} copy at ${appPath}, fresh profile at ${profileDir}`);
}

/**
 * Launch the primary instance against the live feed and wait through the
 * whole staging sequence: boot, download line, the app's staged line, and
 * the library's native debug line beside it. Returns the running AppRun,
 * staged and ready for a quit.
 */
async function stageOnPrimary(feedUrl, runName) {
  const run = new AppRun(runName, feedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, `${runName} booting its tmux server`);
  await run.waitFor(/is downloaded and staging has started/, 300_000, `${runName} downloading ${V2}`);
  const staged = await run.waitFor(/is staged and installs when you quit/, 300_000, `${runName} staging ${V2}`);
  await run.waitFor(/nativeUpdater\.update-downloaded/, 60_000, `${runName} native staged event`);
  log(`${runName} staged ${V2} at ${(staged.at / 1000).toFixed(1)} s after launch`);
  return run;
}

const ABORT_TEXT = /Aborting update attempt because there are (\d+) running instances of the target app/;

/**
 * After a quit, watch the shared ShipIt log from `offset` and the app under
 * test's Info.plist. Resolves with one of:
 *   { outcome: 'aborted', line, count, beginningAtMs, abortAtMs }
 *   { outcome: 'completed', beginningAtMs, completedAtMs }
 *   { outcome: 'no-beginning' }  nothing began before beginningDeadlineMs
 * `knownBeginningAtMs` carries a Beginning the caller already observed, so
 * the numbers stay honest when the watch starts late.
 */
async function watchInstallAfterQuit(offset, beginningDeadlineMs, label, knownBeginningAtMs = null) {
  const started = Date.now();
  let beginningAtMs = knownBeginningAtMs;
  for (;;) {
    const chunk = shipItStderrSince(offset);
    if (beginningAtMs === null && /Beginning installation/.test(chunk)) {
      beginningAtMs = Date.now();
      log(`${label}: ShipIt logged "Beginning installation" ${((beginningAtMs - started) / 1000).toFixed(1)} s after the quit`);
    }
    const abortLine = chunk.split('\n').find((l) => ABORT_TEXT.test(l));
    if (abortLine !== undefined) {
      return {
        outcome: 'aborted',
        line: abortLine,
        count: Number(ABORT_TEXT.exec(abortLine)[1]),
        beginningAtMs,
        abortAtMs: Date.now()
      };
    }
    if (plistVersion(appPath) === V2) {
      return { outcome: 'completed', beginningAtMs, completedAtMs: Date.now() };
    }
    if (beginningAtMs === null && Date.now() - started > beginningDeadlineMs) {
      return { outcome: 'no-beginning' };
    }
    if (beginningAtMs !== null && Date.now() - beginningAtMs > 180_000) {
      fail(`${label}: ShipIt began the install and then neither aborted nor completed within 180 s`);
    }
    await sleep(500);
  }
}

/**
 * Probe R1. Reproduce the operator's code -9 abort with a second instance
 * from the SAME app path, then prove the install completes once the counted
 * instance is gone.
 */
async function probeR1(feedUrl) {
  log('probe R1. The abort and the recovery.');
  freshV1Copy();
  const deadFeed = `${feedUrl}/absent`;
  const entriesBefore = existsSync(shipItDir) ? readdirSync(shipItDir) : [];
  let runA = await stageOnPrimary(feedUrl, 'r1-a');
  const entriesAfter = existsSync(shipItDir) ? readdirSync(shipItDir) : [];
  const newEntries = entriesAfter.filter((n) => !entriesBefore.includes(n));
  log(`ShipIt entries created by staging: ${newEntries.join(', ') || '(none visible at the top level)'}`);

  // Primary strategy. Instance B comes up from the SAME app path before A
  // quits. ShipIt snapshotted its wait list when it started, at staging
  // time, before B existed. If the wait gate does not re-enumerate, A's
  // exit starts the install and the post verification abort check counts B.
  let runB = new AppRun('r1-b', deadFeed, {
    profile: freshProfile(profileBDir),
    socket: SOCKET_B
  });
  await runB.waitFor(/tmux conf verified/, 120_000, 'instance B booting');
  log('instance B is up from the same app path, own profile and socket, dead feed');
  let offset = shipItStderrSize();
  let quitAtMs = Date.now();
  await runA.quit(45_000);
  log('r1-a exited after SIGTERM. Watching the ShipIt log.');
  let result = await watchInstallAfterQuit(offset, 30_000, 'primary');
  let strategy = 'primary';

  if (result.outcome === 'completed') {
    fail('the install completed while instance B ran from the same path. Instance B was invisible to the count. The fix round switches the B launch to open -n with a reachable 404 feed.');
  }

  if (result.outcome === 'no-beginning') {
    // FINDING: the wait gate re-enumerated and is now waiting on B too.
    // Fall back to the incident's own shape: quit everything, let the
    // pending install land, restage, quit, and spawn B inside the install
    // window that follows the quit.
    strategy = 'fallback';
    log('no Beginning line within 30 s of the quit. The wait gate re-enumerated and waits on instance B. Switching to the incident shape.');
    await runB.quit(45_000);
    let swapped = false;
    for (let waited = 0; waited < 120_000; waited += 2_000) {
      if (plistVersion(appPath) === V2) {
        swapped = true;
        break;
      }
      await sleep(2_000);
    }
    if (!swapped) fail('after quitting both instances the pending install never completed');
    log('the pending install completed once both instances were gone. Resetting for the incident shape.');
    freshV1Copy();
    runA = await stageOnPrimary(feedUrl, 'r1-a2');
    offset = shipItStderrSize();
    quitAtMs = Date.now();
    await runA.quit(45_000);
    let beganAtMs = null;
    while (Date.now() - quitAtMs < 120_000) {
      if (/Beginning installation/.test(shipItStderrSince(offset))) {
        beganAtMs = Date.now();
        break;
      }
      await sleep(250);
    }
    if (beganAtMs === null) fail('ShipIt never logged Beginning installation after the quit');
    log(`Beginning installation ${((beganAtMs - quitAtMs) / 1000).toFixed(1)} s after the quit. Spawning instance B inside the install window, the operator timeline.`);
    runB = new AppRun('r1-b2', deadFeed, {
      profile: freshProfile(profileBDir),
      socket: SOCKET_B
    });
    result = await watchInstallAfterQuit(offset, 120_000, 'fallback', beganAtMs);
    if (result.outcome === 'completed') {
      fail('the install completed before instance B was counted. The local install window is too short for the incident shape.');
    }
    if (result.outcome !== 'aborted') {
      fail('the fallback produced neither an abort nor a completion');
    }
  }

  const held = plistVersion(appPath);
  if (held !== V1) fail(`after the abort Info.plist reads ${held}, expected ${V1}`);
  const beginningToAbortS =
    result.beginningAtMs === null ? null : (result.abortAtMs - result.beginningAtMs) / 1000;
  log(`ABORT CAPTURED, ${strategy} strategy. ${result.line.trim()}`);
  log(`  running instances counted: ${result.count}`);
  log(`  Beginning to abort: ${beginningToAbortS === null ? 'Beginning not observed' : `${beginningToAbortS.toFixed(1)} s`}`);
  log(`  quit to abort: ${((result.abortAtMs - quitAtMs) / 1000).toFixed(1)} s`);
  log(`  Info.plist still reads ${held} through the abort`);

  // Recovery. Quit the counted instance, relaunch A's profile from the same
  // app path, let the background check restage from the cached zip, and
  // quit with nothing else running. The install must complete.
  await runB.quit(45_000);
  const recovery = await stageOnPrimary(feedUrl, 'r1-recovery');
  offset = shipItStderrSize();
  const recoveryQuitAtMs = Date.now();
  await recovery.quit(45_000);
  const rec = await watchInstallAfterQuit(offset, 60_000, 'recovery');
  if (rec.outcome !== 'completed') {
    fail(`the recovery leg did not complete the install. Outcome ${rec.outcome}${rec.line !== undefined ? `, line ${rec.line}` : ''}`);
  }
  const after = plistVersion(appPath);
  if (after !== V2) fail(`after the recovery Info.plist reads ${after}, expected ${V2}`);
  const quitToSwapS = (rec.completedAtMs - recoveryQuitAtMs) / 1000;
  log(`RECOVERY PROVED. Info.plist reads ${V2}. Quit to swap ${quitToSwapS.toFixed(1)} s.`);
  return {
    strategy,
    abortLine: result.line.trim(),
    count: result.count,
    beginningToAbortS,
    quitToSwapS
  };
}

/**
 * Probe R2. The same bundle id at a DIFFERENT path must not be counted.
 * This is the live confirmation of the URL half of the counting rule that
 * docs/research/42-shipit-instance-counting.md established from
 * disassembly.
 */
async function probeR2(feedUrl) {
  log('probe R2. Same bundle id at a different path.');
  freshV1Copy();
  const runA = await stageOnPrimary(feedUrl, 'r2-a');
  const runC = new AppRun('r2-c', `${feedUrl}/absent`, {
    binary: pristineBinary,
    profile: freshProfile(profileCDir),
    socket: SOCKET_C
  });
  await runC.waitFor(/tmux conf verified/, 120_000, 'instance C booting from the pristine copy');
  log('instance C is up from the PRISTINE copy. It carries the same bundle id at a different path.');
  const offset = shipItStderrSize();
  const quitAtMs = Date.now();
  await runA.quit(45_000);
  const result = await watchInstallAfterQuit(offset, 60_000, 'R2');
  if (result.outcome === 'aborted') {
    fail(`the install aborted while only instance C ran from a different path. ${result.line}. The URL half of the counting rule did not hold live.`);
  }
  if (result.outcome !== 'completed') {
    fail('ShipIt never began the install in probe R2');
  }
  if (runC.exited) {
    fail('instance C exited during the R2 install, so the probe proves nothing');
  }
  if (/Aborting update attempt/.test(shipItStderrSince(offset))) {
    fail('an abort line was appended during probe R2');
  }
  const swapped = plistVersion(appPath);
  if (swapped !== V2) fail(`probe R2 completed but Info.plist reads ${swapped}`);
  const quitToSwapS = (result.completedAtMs - quitAtMs) / 1000;
  log(`R2 PROVED. The install completed to ${swapped} while instance C kept running from ${pristineApp} (still ${plistVersion(pristineApp)}). No abort line was appended.`);
  log(`  quit to swap with C running: ${quitToSwapS.toFixed(1)} s`);
  await runC.quit(45_000);
  return { quitToSwapS };
}

async function twoInstanceProbes(feedUrl) {
  const r1 = await probeR1(feedUrl);
  const r2 = await probeR2(feedUrl);
  return { r1, r2 };
}

/**
 * A leaked instance carrying the production bundle id is one suspect in the
 * incident this phase answers, so the run ends by proving it left none.
 * Assert only; this never kills anything.
 */
function assertNoScratchProcesses() {
  for (const path of [appPath, pristineApp]) {
    const r = spawnSync('pgrep', ['-f', path], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() !== '') {
      fail(`a process is still running from ${path}. pids ${r.stdout.trim().split('\n').join(', ')}`);
    }
  }
  log('no process is left running from either scratch app path');
}

// -- main -----------------------------------------------------------------------

async function main() {
  if (process.platform !== 'darwin') refuse('this rehearsal drives a signed macOS app');

  // Refuse to reuse a harness server this run did not create. A leftover
  // server belongs to a run that did not clean up, and a human should look
  // at it before anything kills it. All three probe sockets are checked.
  for (const socket of ALL_SOCKETS) {
    const leftover = spawnSync('tmux', ['-L', socket, 'list-sessions'], {
      encoding: 'utf8'
    });
    if (leftover.status === 0) {
      refuse(
        `a tmux server is already running on -L ${socket}. Inspect it, then end it with "tmux -L ${socket} kill-server" and run again.`
      );
    }
  }

  mkdirSync(logsDir, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  originalVersion = pkg.version;
  log(`repo at ${repoRoot}, package.json version ${originalVersion}, scratch at ${scratch}`);

  const operatorBefore = operatorSessionCount();
  log(`operator sessions on socket ${OPERATOR_SOCKET} before the rehearsal. ${operatorBefore}`);

  if (skipPackage) {
    if (!existsSync(pristineApp) || !existsSync(join(feedDir, 'latest-mac.yml'))) {
      refuse('--skip-package was given but the scratch directory has no pristine app or no feed. Run once without it.');
    }
    log('reusing the packages already in the scratch directory');
  } else {
    buildPackages();
  }
  if (packageOnly) {
    log('stopping after the packages, as asked. The feed files and the pristine app are in the scratch directory.');
    restoreVersion();
    process.exit(0);
  }

  // Phase 31 preconditions. Never stage a rehearsal update while the
  // installed app has an install of its own in flight; the two share the
  // ShipIt directory and the launchd job label.
  refuseIfInstalledUpdateInFlight();

  cacheBefore = cacheSnapshot();
  if (cacheBefore === null) {
    log(`the updater cache at ${updaterCacheDir} does not exist before the rehearsal`);
  } else {
    log(`the updater cache at ${updaterCacheDir} exists before the rehearsal with ${cacheBefore.length} entries. Only entries created during the rehearsal will be removed.`);
  }
  shipItBefore = snapshotTree(shipItDir);
  if (shipItBefore === null) {
    log(`the ShipIt directory at ${shipItDir} does not exist before the run`);
  } else {
    log(`the ShipIt directory at ${shipItDir} exists with ${shipItBefore.length} entries. Only entries created during the run will be removed, and ShipIt_stderr.log is never touched.`);
  }

  feedServer = await startFeedServer();
  const port = feedServer.address().port;
  const feedUrl = `http://127.0.0.1:${port}`;
  log(`feed serving ${feedDir} at ${feedUrl}`);

  let result;
  try {
    result = twoInstance ? await twoInstanceProbes(feedUrl) : await roundtrip(feedUrl);
  } finally {
    feedServer.close();
    feedServer = null;
    endHarnessServers();
    cleanCache(cacheBefore);
    cleanShipIt(shipItBefore);
    rmSync(profileDir, { recursive: true, force: true });
    rmSync(profileBDir, { recursive: true, force: true });
    rmSync(profileCDir, { recursive: true, force: true });
  }

  assertNoScratchProcesses();

  const operatorAfter = operatorSessionCount();
  log(`operator sessions on socket ${OPERATOR_SOCKET} after the rehearsal. ${operatorAfter}`);
  if (operatorAfter !== operatorBefore) {
    fail(`the operator session count moved from ${operatorBefore} to ${operatorAfter}. Something touched the real server.`);
  }

  if (twoInstance) {
    log('PASS. Two instance probes.');
    log(`  R1 produced the abort with the ${result.r1.strategy} strategy`);
    log(`  R1 abort line. ${result.r1.abortLine}`);
    log(`  R1 counted ${result.r1.count} running instances`);
    log(`  R1 Beginning to abort ${result.r1.beginningToAbortS === null ? 'was not observed' : `${result.r1.beginningToAbortS.toFixed(1)} s`}`);
    log(`  R1 recovery swapped ${result.r1.quitToSwapS.toFixed(1)} s after the quit`);
    log(`  R2 swapped ${result.r2.quitToSwapS.toFixed(1)} s after the quit with the different path instance running`);
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else {
    log('PASS. One full update roundtrip.');
    log(`  first check ${result.gapSeconds.toFixed(1)} s after launch (floor 25 s)`);
    log(`  staged ${result.stagedAtSeconds.toFixed(1)} s after launch`);
    log(`  bundle swap ${result.swapMoment}`);
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  }
  restoreVersion();
  process.exit(0);
}

main().catch((err) => {
  console.error(`[rehearsal] ${err.stack ?? err.message}`);
  cleanupAndExit(1);
});
