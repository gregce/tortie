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
 * Usage:
 *   node build/update-rehearsal.mjs [--scratch <dir>] [--skip-package]
 *                                   [--package-only] [--keep-server]
 *
 *   --scratch <dir>   where packages, the feed, profiles and logs live.
 *                     Defaults to <os tmpdir>/tortie-update-rehearsal.
 *   --skip-package    reuse the packages already in the scratch directory.
 *                     For verifier reruns of the roundtrip.
 *   --package-only    build the packages and the feed, then stop.
 *   --keep-server     leave the harness tmux server running at the end, so
 *                     a probe can inspect it. The next run refuses until it
 *                     is gone, which is deliberate.
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
const OPERATOR_SOCKET = 'gmux';
const V1 = '0.18.1';
const V2 = '0.18.2';

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

const pristineDir = join(scratch, 'pristine');
const pristineApp = join(pristineDir, 'Tortie.app');
const appDir = join(scratch, 'app');
const appPath = join(appDir, 'Tortie.app');
const appBinary = join(appPath, 'Contents', 'MacOS', 'Tortie');
const feedDir = join(scratch, 'feed');
const profileDir = join(scratch, 'profile');
const logsDir = join(scratch, 'logs');
const ymlBackup = join(scratch, 'latest-mac.yml.release-backup');

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
/** True once this run has created the harness tmux server. */
let createdHarnessServer = false;
/** The original package.json version, restored on every exit path. */
let originalVersion = null;
/** The updater cache before the launches. undefined until snapshotted. */
let cacheBefore;
/** True once the cache has been cleaned, so no exit path cleans it twice. */
let cacheCleaned = false;

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

function endHarnessServer() {
  if (!createdHarnessServer || keepServer) return;
  try {
    const path = execFileSync(
      'tmux',
      ['-L', REHEARSAL_SOCKET, 'display-message', '-p', '#{socket_path}'],
      { encoding: 'utf8' }
    ).trim();
    execFileSync('tmux', ['-L', REHEARSAL_SOCKET, 'kill-server'], {
      stdio: 'ignore'
    });
    if (path.endsWith(`/${REHEARSAL_SOCKET}`)) rmSync(path, { force: true });
    console.log(
      `[rehearsal] ended the harness tmux server on -L ${REHEARSAL_SOCKET}.`
    );
  } catch {
    // No server left on the harness socket. Nothing to end.
  }
}

function cleanupAndExit(code) {
  killRecordedPids();
  if (feedServer !== null) feedServer.close();
  endHarnessServer();
  if (cacheBefore !== undefined && !cacheCleaned) {
    try {
      cleanCache(cacheBefore);
    } catch (err) {
      console.error(`[rehearsal] cache cleanup failed. ${err.message}`);
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
  constructor(name, feedUrl) {
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
    env.GMUX_TMUX_SOCKET = REHEARSAL_SOCKET;
    env.TORTIE_UPDATE_FEED = feedUrl;
    this.child = spawn(appBinary, [`--user-data-dir=${profileDir}`], {
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

function cacheSnapshot() {
  if (!existsSync(updaterCacheDir)) return null;
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      out.push(p);
      if (entry.isDirectory()) walk(p);
    }
  };
  walk(updaterCacheDir);
  return out;
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
  createdHarnessServer = true;
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

  const staged = await run1.waitFor(/is downloaded and installs when you quit/, 300_000, `the staged line for ${V2}`);
  log(`staged evidence at ${(staged.at / 1000).toFixed(1)} s after launch. ${staged.line.trim()}`);

  // The line above is electron-updater's own download finishing. With
  // autoInstallOnAppQuit the library then has native Squirrel.Mac fetch the
  // file from a loopback proxy and stage it, and only after the native
  // update-downloaded event does a quit install anything. Measured on the
  // first harness run. A quit 0.2 s after the staged line installed nothing.
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

// -- main -----------------------------------------------------------------------

async function main() {
  if (process.platform !== 'darwin') refuse('this rehearsal drives a signed macOS app');

  // Refuse to reuse a harness server this run did not create. A leftover
  // server belongs to a run that did not clean up, and a human should look
  // at it before anything kills it.
  const leftover = spawnSync('tmux', ['-L', REHEARSAL_SOCKET, 'list-sessions'], {
    encoding: 'utf8'
  });
  if (leftover.status === 0) {
    refuse(
      `a tmux server is already running on -L ${REHEARSAL_SOCKET}. Inspect it, then end it with "tmux -L ${REHEARSAL_SOCKET} kill-server" and run again.`
    );
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

  cacheBefore = cacheSnapshot();
  if (cacheBefore === null) {
    log(`the updater cache at ${updaterCacheDir} does not exist before the rehearsal`);
  } else {
    log(`the updater cache at ${updaterCacheDir} exists before the rehearsal with ${cacheBefore.length} entries. Only entries created during the rehearsal will be removed.`);
  }

  feedServer = await startFeedServer();
  const port = feedServer.address().port;
  const feedUrl = `http://127.0.0.1:${port}`;
  log(`feed serving ${feedDir} at ${feedUrl}`);

  let result;
  try {
    result = await roundtrip(feedUrl);
  } finally {
    feedServer.close();
    feedServer = null;
    endHarnessServer();
    cleanCache(cacheBefore);
    rmSync(profileDir, { recursive: true, force: true });
  }

  const operatorAfter = operatorSessionCount();
  log(`operator sessions on socket ${OPERATOR_SOCKET} after the rehearsal. ${operatorAfter}`);
  if (operatorAfter !== operatorBefore) {
    fail(`the operator session count moved from ${operatorBefore} to ${operatorAfter}. Something touched the real server.`);
  }

  log('PASS. One full update roundtrip.');
  log(`  first check ${result.gapSeconds.toFixed(1)} s after launch (floor 25 s)`);
  log(`  staged ${result.stagedAtSeconds.toFixed(1)} s after launch`);
  log(`  bundle swap ${result.swapMoment}`);
  log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  restoreVersion();
  process.exit(0);
}

main().catch((err) => {
  console.error(`[rehearsal] ${err.stack ?? err.message}`);
  cleanupAndExit(1);
});
