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
 * once the counted instance is gone. The recovery relaunch is also the
 * live proof of the refusal dialog: the first launch after the abort must
 * show it, and the probe reads it off the screen through the
 * accessibility tree and dismisses it, because the windowless dialog
 * freezes boot until someone answers it. Probe R2 launches a third instance
 * from the PRISTINE copy, the same bundle id at a DIFFERENT path, and
 * proves the install completes while it keeps running, which confirms live
 * that the bundle URL is half of ShipIt's counting rule.
 *
 * SHARED SHIPIT STATE (Phase 31 preconditions, corrected in the fix
 * round). Because the rehearsal builds carry the production bundle id,
 * Squirrel gives them the SAME ShipIt cache directory and launchd job
 * label as the installed app. Staging a rehearsal update while the
 * operator has an install waiting could replace the operator's pending
 * job. So before any launch, in every mode, this script refuses when a
 * ShipIt process for the bundle id is running, and refuses when
 * ShipItState.plist cannot be parsed. The plist alone is NOT the test.
 * Squirrel leaves ShipItState.plist behind after a SUCCESSFUL install
 * too, still naming /Applications/Tortie.app as its target, which was
 * observed on this machine on 2026-08-14 after the operator's install
 * completed. What a successful install consumes is the staged bundle
 * directory the plist names in updateBundleURL. So the honest in flight
 * test is BOTH at once: the plist targets /Applications/Tortie.app AND
 * the staged bundle it names still exists on disk. The script also
 * snapshots the ShipIt directory, removes only entries created during
 * the run, and never truncates or deletes ShipIt_stderr.log, whose lines
 * are shared evidence.
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
 *   --ready-dialog    drive a user initiated check through the app's real
 *                     menu with System Events, read both dialogs off the
 *                     screen through the accessibility tree, then quit and
 *                     prove the install lands. This is the live proof of
 *                     Phase 31 item 1, and since Phase 43 it also carries
 *                     probe P4: two more user checks after the staging must
 *                     add no second install request. Combine with
 *                     --skip-package to reuse the packages. Needs
 *                     accessibility permission for the terminal running
 *                     this script.
 *   --wreck           probe P2. Build a scratch copy of Squirrel's state in
 *                     the shape of the 2026-08-15 incident, launch, read the
 *                     dialog off the screen, click Clear and Check Again,
 *                     and prove on disk what went and what stayed. It then
 *                     launches a second time on a fresh profile and proves
 *                     that launch is quiet, which is the proof of the repair
 *                     mark. Touches none of the three real locations.
 *   --wreck-healthy   probe P3, two legs. Leg A proves a healthy staged
 *                     update is never offered for clearing. Leg B creates
 *                     the staged bundle while the dialog sits on screen and
 *                     proves the click then refuses, which is the proof
 *                     that health is read at click time.
 *   --wreck-live      probe P6. The same wreck against REAL Squirrel and
 *                     the real ShipIt directory, healed, and then a real
 *                     install. It runs last and only after the in flight
 *                     precondition passes, because it is the only probe
 *                     that touches state the installed app shares.
 *   --tmux-pair       Phase 41 probe P1. Drive the release's one tested tmux
 *                     version pair with the PACKAGED app, so the client is the
 *                     tmux inside the app bundle rather than one this repo
 *                     built a moment ago. A warm server is started with the
 *                     older tmux, the app's create and verify smoke halves run
 *                     against it through a real attach, and the old server is
 *                     proved unchanged afterwards. It stages no update, so it
 *                     runs before the feed server starts and touches no
 *                     Squirrel state at all. Combine with --skip-package to
 *                     reuse the packages.
 *   --pair-server-bin <path>
 *                     the older tmux that starts the warm server for
 *                     --tmux-pair. Defaults to /opt/homebrew/bin/tmux, and its
 *                     version must equal the pin's testedPair.server.
 *   --prove-override-refused
 *                     with --tmux-pair, set GMUX_TMUX_BIN to the OLDER tmux in
 *                     the packaged run and prove the app refuses it. An app
 *                     that honoured the variable would run a matching pair and
 *                     never log the tested pair line, so this fails two ways
 *                     rather than only by a missing warning.
 *
 * THE SCRATCH STATE ROOT (Phase 43). Probes P2 and P3 set
 * GMUX_UPDATE_STATE_ROOT, which moves the Squirrel state the app READS and
 * CLEARS under <scratch>/p43-state-root. The app honours it only because
 * all three rehearsal conditions hold. The preferences domain gets a
 * ".rehearsal" suffix, because the rehearsal builds carry the production
 * bundle id and would otherwise share the installed app's domain. Those two
 * probes also run against a dead feed on purpose: a live feed would have
 * the re-armed check stage through real Squirrel, which writes to the real
 * ShipIt directory, and the point of P2 and P3 is that nothing real moves.
 */

import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { connect as netConnect } from 'node:net';
import {
  appendFileSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { frontmostPid, windowShot } from './window-shot.mjs';

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
const readyDialog = flag('--ready-dialog');
const wreck = flag('--wreck');
const wreckHealthy = flag('--wreck-healthy');
const wreckLive = flag('--wreck-live');
/** Phase 41 probe P1. See probeTmuxPair below. */
const tmuxPair = flag('--tmux-pair');
const pairServerBin = option('--pair-server-bin', '/opt/homebrew/bin/tmux');
/** Set GMUX_TMUX_BIN in the packaged run and prove it is refused. */
const proveOverrideRefused = flag('--prove-override-refused');
/** The Phase 41 probe's own scratch socket. Never a rehearsal socket. */
const TMUX_PAIR_SOCKET = 'gmux-p41-pair-packaged';

/**
 * Phase 58, the update ring probes. Each one drives the packaged app with an
 * ISOLATED HOME under the scratch directory, so electron-updater's download
 * cache and Squirrel's ShipIt state land under the scratch and never under
 * the operator's ~/Library/Caches. That is the Phase 58 charter's own rule,
 * written after a Phase 43 probe left a rehearsal build in the real updater
 * cache. The launches also pass --use-mock-keychain, because a redirected
 * HOME has no keychain and Chromium would otherwise pop a blocking keychain
 * prompt (the 2026-08-16 incident noted in src/main/index.ts).
 */
const ringJourney = flag('--ring-journey');
const ringSilence = flag('--ring-silence');
const ringFailed = flag('--ring-failed');
const ringRestart = flag('--ring-restart');
const anyRingProbe = ringJourney || ringSilence || ringFailed || ringRestart;
/**
 * Bytes per second the feed serves .zip files at, 0 for full speed. The
 * ring journey probe throttles the download so the downloading arc stands
 * still long enough to be read and photographed.
 */
const feedThrottle = Number(option('--feed-throttle', '0'));

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

/**
 * Phase 43. The scratch copy of Squirrel's state that the wreck probes
 * build, wreck and heal. GMUX_UPDATE_STATE_ROOT points the app under test
 * at it, so probes P2 and P3 never read or write the three real locations.
 * The preferences domain gets a suffix, because the rehearsal builds carry
 * the production bundle id and would otherwise share the installed app's.
 */
const stateRoot = join(scratch, 'p43-state-root');
const wreckShipItDir = join(stateRoot, `${BUNDLE_ID}.ShipIt`);
const wreckCacheDir = join(stateRoot, 'tortie-updater');
const WRECK_DEFAULTS_DOMAIN = `${BUNDLE_ID}.ShipIt.rehearsal`;
/** The name the operator's own ShipItState.plist carried on 2026-08-15. */
const WRECK_STAGING_NAME = 'update.KZlg2R9';
/** The staging directory P3 leg A creates for real, so the state is healthy. */
const HEALTHY_STAGING_NAME = 'update.HEALTHY';

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
  if (livePids.size === 0) return;
  // SIGTERM alone is not enough. A windowless dialog freezes an Electron
  // app's main event loop until it is dismissed (observed live in the
  // Phase 31 fix round: the refusal dialog held r1-recovery frozen and it
  // outlived a SIGTERM), and a frozen app never runs its quit handler. A
  // leaked instance carrying the production bundle id is the one thing
  // this script must never leave behind, so after a short grace anything
  // still alive is killed hard.
  try {
    execFileSync('/bin/sleep', ['3']);
  } catch {
    // sleep does not fail.
  }
  for (const pid of livePids) {
    try {
      process.kill(pid, 0);
      process.kill(pid, 'SIGKILL');
      console.log(
        `[rehearsal] pid ${pid} ignored SIGTERM (a dialog freezes the event loop) and was killed with SIGKILL.`
      );
    } catch {
      // Exited during the grace.
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
   * instance C shares neither the path nor the profile. opts.extraEnv adds
   * environment variables for the Phase 43 wreck probes.
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
    // Phase 43. The wreck probes move the Squirrel state Tortie READS and
    // CLEARS to a scratch directory. The app honours it only because all
    // three rehearsal conditions above hold.
    for (const [k, v] of Object.entries(opts.extraEnv ?? {})) env[k] = v;
    usedSockets.add(socket);
    createdHarnessServer = true;
    this.child = spawn(
      binary,
      [...(opts.extraArgs ?? []), `--user-data-dir=${profile}`],
      {
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
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
      } else if (feedThrottle > 0 && name.endsWith('.zip')) {
        // Phase 58 ring probes. Serve the zip at a fixed rate so the
        // downloading arc is on screen long enough to read and photograph.
        const stream = createReadStream(file, { highWaterMark: 256 * 1024 });
        const started = Date.now();
        let sent = 0;
        stream.on('data', (chunk) => {
          res.write(chunk);
          sent += chunk.length;
          const aheadMs = (sent / feedThrottle) * 1000 - (Date.now() - started);
          if (aheadMs > 50) {
            stream.pause();
            setTimeout(() => stream.resume(), aheadMs);
          }
        });
        stream.on('end', () => res.end());
        stream.on('error', () => res.destroy());
      } else {
        createReadStream(file).pipe(res);
      }
      log(`feed served ${name}, ${size} bytes${feedThrottle > 0 && name.endsWith('.zip') ? ` at ${feedThrottle} bytes per second` : ''}`);
    });
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

// -- the updater's download cache, recorded before and cleaned after ----------

const updaterCacheDir = join(homedir(), 'Library', 'Caches', 'tortie-updater');

/**
 * Every path under dir, parents before children, or null when dir is
 * absent.
 *
 * The read of each directory is guarded because ShipIt deletes its staging
 * directories underneath this walk. A P4 run crashed the harness with
 * `ENOENT: scandir '.../update.868laFL/Tortie.app/.../cs_FEMININE.lproj'`
 * after its assertions had passed, and the same crash could land inside a
 * later probe's assertion instead of after one. A directory that is gone by
 * the time the walk reaches it contributes nothing and is not an error.
 */
function snapshotTree(dir) {
  if (!existsSync(dir)) return null;
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
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
  if (!target.includes('/Applications/Tortie.app')) return;
  // The plist alone proves nothing. Squirrel leaves ShipItState.plist
  // behind after a SUCCESSFUL install too, still naming /Applications as
  // its target. Observed on this machine on 2026-08-14: the operator's
  // install completed at 16:32:36 ("Installation completed successfully"
  // in ShipIt_stderr.log), the staged bundle directory update.c1wRw4m was
  // consumed, and the plist stayed, unchanged since 15:19. An in flight
  // install is the plist target AND the staged bundle both present.
  const updateUrl = String(parsed?.updateBundleURL ?? '');
  if (updateUrl === '') {
    refuse(
      `${statePlist} targets /Applications/Tortie.app and names no updateBundleURL. Failing safe, because the installed app may have an install in flight. Look at the file before running the rehearsal.`
    );
  }
  let stagedBundle = null;
  try {
    stagedBundle = fileURLToPath(updateUrl);
  } catch {
    refuse(
      `${statePlist} targets /Applications/Tortie.app and its updateBundleURL (${updateUrl}) cannot be read as a path. Failing safe. Look at the file before running the rehearsal.`
    );
  }
  if (existsSync(stagedBundle)) {
    refuse(
      `${statePlist} targets /Applications/Tortie.app and the staged bundle at ${stagedBundle} is still on disk. The installed Tortie has an update waiting to install. Quit Tortie once, let it install, and run the rehearsal again.`
    );
  }
  log(
    `ShipItState.plist targets /Applications/Tortie.app but the staged bundle it names (${stagedBundle}) is gone, so that install already completed. Squirrel leaves the plist behind on success. Proceeding.`
  );
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
  // tortie-repair.json is kept for the same reason ShipIt_stderr.log is. It
  // is state rather than litter: a repair writes it so the give up line in
  // the kept log stops deciding later launches, and removing it here would
  // hand the next launch the false alarm the mark exists to prevent.
  const created = after.filter(
    (p) =>
      !keep.has(p) &&
      !p.endsWith('ShipIt_stderr.log') &&
      !p.endsWith('tortie-repair.json')
  );
  for (const p of created.reverse()) rmSync(p, { recursive: true, force: true });
  log(
    `removed ${created.length} entries the run created under ${shipItDir}. ShipIt_stderr.log and tortie-repair.json were preserved.`
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

  // Phase 31, the silence half of item 1. Nobody clicked anything in this
  // run, so the whole download and staging came from the background timer,
  // and a background staging must surface nothing. Assert it two ways: the
  // app never logged showing a dialog, and the accessibility tree shows no
  // window carrying either dialog's words.
  if (run1.sawLine(/showing the (ready|refusal) dialog/)) {
    fail('the background staging showed a dialog. Background checks must stay silent.');
  }
  const silentTexts = dialogTexts(run1.pid);
  if (silentTexts.includes('is downloading') || silentTexts.includes('is ready')) {
    fail(`a dialog is on screen after a background staging. The windows read:\n${silentTexts}`);
  }
  log('the background staging stayed silent. No dialog line in the log and no dialog text in the accessibility tree.');

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

// -- the accessibility tree, for driving and reading real dialogs -------------

/**
 * These helpers target the app process by its unix pid, never by name,
 * because the operator's installed Tortie may be running and System Events
 * would otherwise pick whichever "Tortie" it finds first.
 */
function osa(script, what) {
  const r = spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
  if (r.status !== 0) {
    fail(`osascript failed while ${what}. ${(r.stderr ?? '').trim()}`);
  }
  return (r.stdout ?? '').trim();
}

/** Click the real "Check for Updates…" item in the app's own menu. */
function clickCheckForUpdates(pid) {
  osa(
    `tell application "System Events"
  tell (first process whose unix id is ${pid})
    click menu item "Check for Updates…" of menu 1 of menu bar item "Tortie" of menu bar 1
  end tell
end tell`,
    'clicking the Check for Updates menu item'
  );
}

/**
 * Every static text of every window of the process, one line per text,
 * windows separated by a ---- line. A dialog from dialog.showMessageBox
 * exposes its message and its detail as static texts; the main window
 * exposes none at the top level. Never fails the run: while a dialog is
 * mid animation the tree can be momentarily unreadable, and the callers
 * poll.
 */
function dialogTexts(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `set out to ""
tell application "System Events"
  tell (first process whose unix id is ${pid})
    repeat with w in windows
      repeat with t in static texts of w
        set out to out & (value of t) & linefeed
      end repeat
      set out to out & "----" & linefeed
    end repeat
  end tell
end tell
return out`
    ],
    { encoding: 'utf8' }
  );
  return r.status === 0 ? (r.stdout ?? '').trim() : '';
}

/** Poll the tree until a window's text contains needle. Returns the texts. */
async function waitForDialogOnScreen(pid, needle, timeoutMs, what) {
  const started = Date.now();
  for (;;) {
    const texts = dialogTexts(pid);
    if (texts.includes(needle)) return texts;
    if (Date.now() - started > timeoutMs) {
      fail(
        `timed out after ${timeoutMs / 1000} s waiting for ${what}. The windows read:\n${texts || '(no readable text)'}`
      );
    }
    await sleep(1000);
  }
}

/** Click the named button of the window whose text contains needle. */
function clickDialogButton(pid, needle, button) {
  const answer = osa(
    `tell application "System Events"
  tell (first process whose unix id is ${pid})
    repeat with w in windows
      set msg to ""
      repeat with t in static texts of w
        set msg to msg & (value of t) & " "
      end repeat
      if msg contains "${needle}" then
        click button "${button}" of w
        return "clicked"
      end if
    end repeat
  end tell
end tell
return "no window matched"`,
    `clicking ${button} on the dialog containing "${needle}"`
  );
  if (answer !== 'clicked') {
    fail(`no dialog containing "${needle}" was on screen to click ${button} on`);
  }
}

/**
 * Best effort screenshot of the app under test's own window. The
 * accessibility read is the assertion, and this is the picture beside it.
 *
 * It goes through build/window-shot.mjs, so it takes no photograph at all
 * when the app under test is not in front. Before Phase 73.1 this called
 * `screencapture -x` with no region, which photographed the whole active
 * space and caught the operator's desktop once. When a dialog is up the
 * dialog is window 1, so the frame is the dialog, which is what these call
 * sites want.
 */
function screenshot(name, pid) {
  const path = join(logsDir, name);
  const answer = windowShot({ pid, path, log });
  if (answer !== 'saved') {
    log('the accessibility reads above are the evidence for this step.');
  }
  return answer;
}

// -- the ready dialog probe (Phase 31 item 1, fix round) ----------------------

/**
 * Drive the exact flow the operator ran on 2026-08-14, against the local
 * feed: click "Check for Updates…" in the real menu, get told "downloading",
 * dismiss, get told "ready" when Squirrel finishes staging, dismiss, quit,
 * and this time the install must land. Both dialogs are read off the screen
 * through the accessibility tree, verbatim, so the evidence is the pixels'
 * own source and not the code's intent.
 */
async function probeReadyDialog(feedUrl) {
  log('ready dialog probe. A user initiated check, both dialogs, then the install.');
  freshV1Copy();
  // Phase 43, probe P4. Everything ShipIt writes from here to the quit
  // belongs to this run, and exactly one install request may appear in it.
  const runShipItOffset = shipItStderrSize();
  const run = new AppRun('ready-a', feedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  // Give the menu bar a moment to exist, then click the real item well
  // before the 30 second background timer, so the check that follows can
  // only be the user initiated one.
  await sleep(3_000);
  clickCheckForUpdates(run.pid);
  const clickedAtS = (Date.now() - run.startedAt) / 1000;
  log(`clicked "Check for Updates…" through the real menu ${clickedAtS.toFixed(1)} s after launch`);
  const checking = await run.waitFor(/Checking for update/, 30_000, 'the user initiated check starting');
  if (checking.at / 1000 >= 25) {
    fail(`the check began ${(checking.at / 1000).toFixed(1)} s after launch, late enough to be the background timer, so the probe proves nothing`);
  }
  log(`the check began ${(checking.at / 1000).toFixed(1)} s after launch, before the 30 s background timer. It is the user's check.`);

  // Dialog one, the downloading answer.
  const foundTexts = await waitForDialogOnScreen(run.pid, 'is downloading', 180_000, 'the Update found dialog');
  log(`the Update found dialog is on screen. The window reads, verbatim:\n${foundTexts}`);
  screenshot('ready-probe-update-found.png', run.pid);
  clickDialogButton(run.pid, 'is downloading', 'OK');
  log('dismissed the Update found dialog with its OK button');

  // Dialog two, the ready answer, with no further input from anyone. The
  // needle is the whole title sentence, because the Update found dialog's
  // body also contains the words "is ready".
  const readyTitle = `Tortie ${V2} is ready`;
  const readyTexts = await waitForDialogOnScreen(run.pid, readyTitle, 300_000, 'the ready dialog');
  const readyBody = 'It installs when you quit. To install it now, use the Tortie menu.';
  if (!readyTexts.includes(readyBody)) {
    fail(`the ready dialog is on screen but its text is wrong. It reads:\n${readyTexts}`);
  }
  log(`the ready dialog is on screen with the pinned copy. The window reads, verbatim:\n${readyTexts}`);
  if (!run.sawLine(/showing the ready dialog for/)) {
    fail('the ready dialog is on screen but the app never logged showing it, so the updates.log record is incomplete');
  }
  log('the app logged the dialog moment, so updates.log carries it in packaged builds');
  screenshot('ready-probe-ready.png', run.pid);
  clickDialogButton(run.pid, readyTitle, 'OK');
  log('dismissed the ready dialog with its OK button');

  // Phase 43, probe P4. Two more user checks, 3 seconds apart, after the
  // staging has landed. Each one must answer from what the run already
  // knows and must NOT reach electron-updater, because a second staging
  // deletes the copy the pending install is waiting on. The menu item must
  // still do something, so each click is held to showing a dialog.
  const installPromptNeedle = 'Update ready';
  for (const attempt of [2, 3]) {
    await sleep(3_000);
    clickCheckForUpdates(run.pid);
    const promptTexts = await waitForDialogOnScreen(
      run.pid,
      installPromptNeedle,
      30_000,
      `the dialog after user check ${attempt}`
    );
    log(`user check ${attempt} answered with a dialog. The window reads, verbatim:\n${promptTexts}`);
    // Later, never Update Now. Update Now would quit and install here.
    clickDialogButton(run.pid, installPromptNeedle, 'Later');
  }
  if (!run.sawLine(/already handed an update to the installer in this run/)) {
    fail('the app never logged the no second staging refusal, so the guard did not run');
  }
  log('the app logged the pinned no second staging refusal');
  const detected = shipItStderrSince(runShipItOffset)
    .split('\n')
    .filter((l) => l.includes('Detected this as an install request')).length;
  log(`"Detected this as an install request" lines for this run: ${detected}. The target is 1. The 2026-08-15 incident had 2.`);
  if (detected !== 1) {
    fail(`the run produced ${detected} install requests. Two more user checks after the staging must add none.`);
  }

  // The dialog promised "it installs when you quit". Hold it to that.
  const offset = shipItStderrSize();
  const quitAtMs = Date.now();
  await run.quit(45_000);
  const result = await watchInstallAfterQuit(offset, 60_000, 'ready probe');
  if (result.outcome !== 'completed') {
    fail(`the install did not complete after the quit the ready dialog promised. Outcome ${result.outcome}${result.line !== undefined ? `, line ${result.line}` : ''}`);
  }
  const after = plistVersion(appPath);
  if (after !== V2) fail(`after the quit Info.plist reads ${after}, expected ${V2}`);
  const quitToSwapS = (result.completedAtMs - quitAtMs) / 1000;
  log(`the quit installed ${V2} in ${quitToSwapS.toFixed(1)} s, exactly what the dialog promised`);
  return { checkAtS: checking.at / 1000, quitToSwapS, detected };
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

  // Recovery, which is also the live proof of item 2. Quit the counted
  // instance, then relaunch A's profile from the same app path. That
  // relaunch is the first launch after a refused install, so the refusal
  // dialog MUST appear, and it appears before the window: a windowless
  // message box freezes the main event loop until it is dismissed, so the
  // tmux server does not come up while the dialog waits. The probe reads
  // the dialog off the screen verbatim, keeps a screenshot, clicks OK,
  // lets boot finish and the background check restage from the cached
  // zip, and quits with nothing else running. The install must complete.
  await runB.quit(45_000);
  const recovery = new AppRun('r1-recovery', feedUrl);
  await recovery.waitFor(/showing the refusal dialog for/, 90_000, 'the refusal dialog log line');
  log('the relaunch detected the refused install and logged showing the dialog');
  const refusalNeedle = 'did not install because another copy of Tortie was running';
  const refusalTexts = await waitForDialogOnScreen(recovery.pid, refusalNeedle, 60_000, 'the refusal dialog');
  log(`the refusal dialog is on screen. The window reads, verbatim:\n${refusalTexts}`);
  screenshot('r1-refusal-dialog.png', recovery.pid);
  clickDialogButton(recovery.pid, refusalNeedle, 'OK');
  log('dismissed the refusal dialog with its OK button. Boot continues.');
  await recovery.waitFor(/tmux conf verified/, 120_000, 'r1-recovery booting after the dialog');
  await recovery.waitFor(/is downloaded and staging has started/, 300_000, `r1-recovery downloading ${V2} again`);
  await recovery.waitFor(/is staged and installs when you quit/, 300_000, `r1-recovery restaging ${V2}`);
  await recovery.waitFor(/nativeUpdater\.update-downloaded/, 60_000, 'r1-recovery native staged event');
  log('r1-recovery restaged from the cache, the "It installs the next time you quit" promise under test');
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

// -- the wreck probes (Phase 43) ----------------------------------------------

/**
 * The operator's own ShipIt lines from 2026-08-15, message text verbatim.
 *
 * The TIMESTAMPS are the one thing the probe changes. The refusal check
 * compares a line's timestamp against the app's pending record with a 60
 * second window, so lines from 00:29 that morning would read as an old
 * incident and prove nothing about the promise the probe just wrote. Each
 * line keeps its offset from the first one, to the millisecond, and the
 * whole block is placed a few seconds before now.
 */
const OPERATOR_OFFSETS_MS = {
  firstRequest: 0,
  secondRequest: 5609,
  beginning: 18953,
  firstError: 18973,
  attempt2: 19037,
  secondError: 19048,
  attempt3: 21116,
  thirdError: 21124,
  gaveUp: 23237,
  quitting: 23242
};

const SHIPIT_NOISE = 'ERROR: Unrecognized attribute string flag';

/** `YYYY-MM-DD HH:MM:SS.mmm` in local time, which is what NSLog writes. */
function nsLogStamp(ms) {
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

/** The verbatim "Failed to copy bundle" error, pointed at a real path. */
function copyFailedRest(stagedBundle) {
  return (
    'Installation error: Error Domain=SQRLInstallerErrorDomain Code=-1 ' +
    `"Failed to copy bundle ${pathToFileURL(stagedBundle).href}/ ` +
    'to directory file:///var/folders/xx/com.itavero.tortie.ShipIt.fFsI228X/Tortie.app" ' +
    'UserInfo={NSUnderlyingError=0x600001 {Error Domain=NSCocoaErrorDomain Code=260 ' +
    '"The file “Tortie.app” couldn’t be opened because there is no such file." ' +
    'UserInfo={NSUnderlyingError=0x600002 {Error Domain=NSPOSIXErrorDomain Code=2 "No such file or directory"}}}}'
  );
}

/** The 2026-08-15 tail, re-timestamped so its last line lands at endMs. */
function operatorWreckTail(stagedBundle, endMs) {
  const base = endMs - OPERATOR_OFFSETS_MS.quitting;
  const line = (key, pids, rest) =>
    `${nsLogStamp(base + OPERATOR_OFFSETS_MS[key])} ShipIt[${pids}] ${rest}`;
  const failed = copyFailedRest(stagedBundle);
  return (
    [
      line('firstRequest', '69989:92086352', 'Detected this as an install request'),
      line('secondRequest', '70665:92087700', 'Detected this as an install request'),
      line('beginning', '70665:92087710', 'Beginning installation'),
      SHIPIT_NOISE,
      line('firstError', '70665:92089787', failed),
      line('attempt2', '71832:92089801', 'Resuming installation attempt 2'),
      line('secondError', '71832:92089801', failed),
      line('attempt3', '71966:92090057', 'Resuming installation attempt 3'),
      line('thirdError', '71966:92090057', failed),
      SHIPIT_NOISE,
      line('gaveUp', '72120:92090255', 'Too many attempts to install, aborting update'),
      line('quitting', '72120:92090255', 'ShipIt quitting')
    ].join('\n') + '\n'
  );
}

/** A log whose newest line is Beginning installation, so nothing terminal. */
function healthyTail(endMs) {
  return (
    [
      `${nsLogStamp(endMs - 2000)} ShipIt[90001:1] Detected this as an install request`,
      SHIPIT_NOISE,
      `${nsLogStamp(endMs)} ShipIt[90001:2] Beginning installation`
    ].join('\n') + '\n'
  );
}

/** Every path under dir with its size, relative and sorted. */
function listWithSizes(dir) {
  const paths = snapshotTree(dir);
  if (paths === null) return ['(the directory does not exist)'];
  return paths
    .map((p) => {
      let size = 'dir';
      try {
        const st = statSync(p);
        if (st.isFile()) size = String(st.size);
      } catch {
        size = '(unreadable)';
      }
      return `${relative(dir, p)} ${size}`;
    })
    .sort();
}

function defaultsRead(domain) {
  const r = spawnSync('/usr/bin/defaults', ['read', domain], {
    encoding: 'utf8'
  });
  if (r.status === 0) return (r.stdout ?? '').trim();
  return '(does not exist)';
}

function defaultsWriteInt(domain, key, value) {
  const r = spawnSync(
    '/usr/bin/defaults',
    ['write', domain, key, '-int', String(value)],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    fail(`could not write ${domain} ${key}. ${(r.stderr ?? '').trim()}`);
  }
}

function defaultsDelete(domain) {
  spawnSync('/usr/bin/defaults', ['delete', domain], { encoding: 'utf8' });
}

/**
 * Build the scratch copy of Squirrel's state. `staged` decides whether the
 * bundle the state file names actually exists, which is the whole
 * difference between a wreck and a healthy pending install.
 *
 * THE STAGING DIRECTORY ALWAYS EXISTS. The operator's disk had
 * `update.KZlg2R9` present and EMPTY, with only the `Tortie.app` inside it
 * gone. The first cut of this fixture created neither, so the probe's own
 * assertion that no `update.*` entry survives the repair passed against an
 * empty list and proved nothing. The wreck shape is now the operator's
 * shape.
 *
 * THE TARGET URL IS THE RESOLVED PATH. The scratch app lives under
 * `/var/folders/...`, which is a symlink to `/private/var/folders/...`, and
 * the app reads its own bundle through `process.execPath`, which libuv
 * resolves. Writing the unresolved path here made the app read its own
 * state file as another application's.
 */
function buildStateRoot({ staged, stagingName, tail }) {
  rmSync(stateRoot, { recursive: true, force: true });
  mkdirSync(wreckShipItDir, { recursive: true });
  mkdirSync(wreckCacheDir, { recursive: true });
  const stagedBundle = join(wreckShipItDir, stagingName, 'Tortie.app');
  mkdirSync(join(wreckShipItDir, stagingName), { recursive: true });
  if (staged) {
    mkdirSync(join(stagedBundle, 'Contents'), { recursive: true });
    writeFileSync(join(stagedBundle, 'Contents', 'marker.txt'), 'staged\n');
  }
  writeFileSync(
    join(wreckShipItDir, 'ShipItState.plist'),
    `${JSON.stringify(
      {
        bundleIdentifier: BUNDLE_ID,
        // Squirrel writes standardized URLs with a trailing slash.
        targetBundleURL: `${pathToFileURL(realpathSync(appPath)).href}/`,
        updateBundleURL: `${pathToFileURL(stagedBundle).href}/`,
        launchAfterInstallation: true
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    join(wreckShipItDir, 'ShipIt_stderr.log'),
    tail(stagedBundle, Date.now() - 2_000)
  );
  // The pending download the repair must remove, and the cached zip beside
  // it that the repair must keep.
  mkdirSync(join(wreckCacheDir, 'pending'), { recursive: true });
  writeFileSync(
    join(wreckCacheDir, 'pending', `Tortie-${V2}-arm64.zip`),
    'a pending download\n'
  );
  writeFileSync(join(wreckCacheDir, 'update.zip'), 'a cached zip\n');
  defaultsDelete(WRECK_DEFAULTS_DOMAIN);
  defaultsWriteInt(WRECK_DEFAULTS_DOMAIN, 'SQRLInstallationAttempts', 3);
  return stagedBundle;
}

/** Seed the profile so the launch has a broken promise to report. */
function seedPendingRecord(profile) {
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  writeFileSync(
    join(profile, 'updates.json'),
    `${JSON.stringify(
      {
        // lastSeenVersion must equal the running version, or the check
        // reads the failure as "some other install happened".
        lastSeenVersion: V1,
        pendingVersion: V2,
        pendingRecordedAt: Date.now()
      },
      null,
      2
    )}\n`
  );
}

/** Every menu item label in the app's own Tortie menu. */
function tortieMenuLabels(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  tell (first process whose unix id is ${pid})
    return name of every menu item of menu 1 of menu bar item "Tortie" of menu bar 1
  end tell
end tell`
    ],
    { encoding: 'utf8' }
  );
  return r.status === 0 ? (r.stdout ?? '').trim() : '';
}

/** The three real locations plus the real preferences domain. */
function realStateSnapshot() {
  return {
    shipIt: listWithSizes(shipItDir).join('\n'),
    cache: listWithSizes(updaterCacheDir).join('\n'),
    domain: defaultsRead(`${BUNDLE_ID}.ShipIt`)
  };
}

function assertRealStateUnchanged(before, what) {
  const after = realStateSnapshot();
  for (const key of ['shipIt', 'cache', 'domain']) {
    if (before[key] !== after[key]) {
      fail(
        `${what}: the real ${key} state changed.\nbefore:\n${before[key]}\nafter:\n${after[key]}`
      );
    }
  }
  log(`${what}: the three real locations and the real defaults domain read exactly as they did before the probe`);
}

const CLEAR_BUTTON = 'Clear and Check Again';
const WRECK_NEEDLE = 'that copy was gone from disk when the installer ran';
const READY_REFUSAL_NEEDLE =
  'the update it prepared is still on disk and ready to install';

/**
 * Probe P2. Wreck the scratch state, launch, read the dialog off the
 * accessibility tree, click Clear and Check Again, and prove on disk what
 * went and what stayed.
 *
 * The feed is deliberately DEAD here. The point of P2 is that nothing real
 * is touched, and a live feed would have the re-armed check download and
 * stage through real Squirrel, which writes to the real ShipIt directory.
 * The re-arm and the check starting are what this probe asserts; P5 and P6
 * prove that a check after a repair really installs.
 */
async function probeWreckAndHeal(feedUrl) {
  log('probe P2. Wreck the scratch Squirrel state, then heal it.');
  const realBefore = realStateSnapshot();
  freshV1Copy();
  const stagedBundle = buildStateRoot({
    staged: false,
    stagingName: WRECK_STAGING_NAME,
    tail: operatorWreckTail
  });
  seedPendingRecord(profileDir);
  log(`state root at ${stateRoot}. The state file names ${stagedBundle}, which does not exist.`);
  log(`${WRECK_DEFAULTS_DOMAIN} before the launch: ${defaultsRead(WRECK_DEFAULTS_DOMAIN)}`);

  const run = new AppRun('p43-wreck', `${feedUrl}/absent`, {
    extraEnv: { GMUX_UPDATE_STATE_ROOT: stateRoot }
  });
  await run.waitFor(/showing the refusal dialog for/, 90_000, 'the refusal dialog log line');
  const texts = await waitForDialogOnScreen(run.pid, WRECK_NEEDLE, 60_000, 'the wreck dialog');
  log(`the wreck dialog is on screen. The window reads, verbatim:\n${texts}`);
  screenshot('p43-wreck-dialog.png', run.pid);
  const expected =
    `The update to ${V2} did not install. Tortie had prepared a copy of the new version, and that copy was gone from disk when the installer ran. ` +
    'The installer tried 3 times and then saved that it had given up. It does not try again until Tortie clears what it saved. ' +
    "Clearing removes only the installer's own leftover files. " +
    'Your sessions keep running and your settings are not touched.';
  if (!texts.includes(expected)) {
    fail(`the wreck dialog body is not the pinned copy.\nexpected:\n${expected}\non screen:\n${texts}`);
  }
  log('the dialog body is byte identical to the pinned copy, with the version 0.18.2 and the attempt count 3');
  const labels = tortieMenuLabels(run.pid);
  log(`the Tortie menu reads: ${labels}`);

  const clickedAt = Date.now();
  clickDialogButton(run.pid, WRECK_NEEDLE, CLEAR_BUTTON);
  log(`clicked "${CLEAR_BUTTON}"`);
  await run.waitFor(/repair finished as/, 60_000, 'the repair finishing');
  const clearedMs = Date.now() - clickedAt;

  // What went, and what stayed.
  const problems = [];
  if (existsSync(join(wreckShipItDir, 'ShipItState.plist'))) {
    problems.push('ShipItState.plist is still there');
  }
  const leftovers = readdirSync(wreckShipItDir).filter((n) => n.startsWith('update.'));
  if (leftovers.length > 0) {
    problems.push(`staging directories remain: ${leftovers.join(', ')}`);
  }
  if (existsSync(join(wreckCacheDir, 'pending'))) {
    problems.push('the pending download directory is still there');
  }
  if (!existsSync(join(wreckCacheDir, 'update.zip'))) {
    problems.push('update.zip was removed and it must be kept');
  }
  if (!existsSync(join(wreckShipItDir, 'ShipIt_stderr.log'))) {
    problems.push('ShipIt_stderr.log was removed and it must be kept');
  }
  const domainAfter = defaultsRead(WRECK_DEFAULTS_DOMAIN);
  if (domainAfter !== '(does not exist)') {
    problems.push(`the defaults domain still reads ${domainAfter}`);
  }
  if (problems.length > 0) {
    fail(`the repair left the wrong state on disk. ${problems.join('; ')}`);
  }
  log(`the repair removed the state file, the staging directories, the defaults domain and the pending cache in ${(clearedMs / 1000).toFixed(1)} s`);
  log('ShipIt_stderr.log and update.zip were kept, exactly as the module says they are');
  if (!existsSync(join(wreckShipItDir, 'tortie-repair.json'))) {
    fail('the repair did not write tortie-repair.json, so the next launch would read the kept log as a wreck again');
  }
  log(`the repair mark reads ${readFileSync(join(wreckShipItDir, 'tortie-repair.json'), 'utf8').trim().replace(/\s+/g, ' ')}`);

  await run.waitFor(/the updater state was cleared/, 30_000, 'the re-arm line');

  // The result dialog comes BEFORE the check. offerUpdaterRepair awaits its
  // OK and only then runs the check, so waiting for the check first is a
  // deadlock. The first cut of this probe did exactly that and timed out
  // after 60 s with the repair already finished.
  const clearedTexts = await waitForDialogOnScreen(
    run.pid,
    "installer's leftovers",
    30_000,
    'the repair result dialog'
  );
  log(`the repair result dialog reads, verbatim:\n${clearedTexts}`);
  screenshot('p43-wreck-cleared.png', run.pid);
  if (!clearedTexts.includes("Tortie cleared the installer's leftovers")) {
    fail(`the repair reported itself as something other than a whole clear. The window reads:\n${clearedTexts}`);
  }
  clickDialogButton(run.pid, "installer's leftovers", 'OK');
  await run.waitFor(/Checking for update/, 60_000, 'the check that follows the repair');
  log('the app re-armed its checks and started one');

  // The feed is dead, so the check ends in the ordinary failure dialog.
  await sleep(3_000);
  const on = dialogTexts(run.pid);
  if (on.includes('update check failed')) {
    clickDialogButton(run.pid, 'update check failed', 'OK');
  }
  await run.quit(45_000);

  // The launch AFTER a successful repair must be quiet. The repair keeps
  // ShipIt_stderr.log, so without the repair mark its give up line is still
  // the newest terminal line and this launch would offer the same repair
  // again. That false alarm was measured live before the mark existed.
  rmSync(profileDir, { recursive: true, force: true });
  const after = new AppRun('p43-wreck-after', `${feedUrl}/absent`, {
    extraEnv: { GMUX_UPDATE_STATE_ROOT: stateRoot }
  });
  await after.waitFor(/the updater state on disk reads unknown/, 60_000, 'the healed verdict on the next launch');
  const quietTexts = dialogTexts(after.pid);
  if (quietTexts.includes(CLEAR_BUTTON) || quietTexts.includes('cannot install updates')) {
    fail(`the launch after a successful repair offered the repair again. The windows read:\n${quietTexts}`);
  }
  const afterLabels = tortieMenuLabels(after.pid);
  if (afterLabels.includes('Repair Updates')) {
    fail(`the launch after a successful repair still draws the Repair Updates item. The menu reads: ${afterLabels}`);
  }
  log(`the launch after the repair is quiet. The Tortie menu reads: ${afterLabels}`);
  await after.quit(45_000);

  assertRealStateUnchanged(realBefore, 'P2');
  return { clearedMs, dialog: texts, cleared: clearedTexts };
}

/**
 * Probe P3. A healthy staged update is never touched.
 *
 * Leg A proves nothing is offered when the staged bundle is on disk. Leg B
 * proves the health is read at CLICK time: the bundle appears while the
 * dialog sits on screen, and the click then refuses.
 */
async function probeWreckHealthy(feedUrl) {
  log('probe P3. A healthy staged update is never touched.');
  const realBefore = realStateSnapshot();

  // ---- Leg A ----
  freshV1Copy();
  buildStateRoot({
    staged: true,
    stagingName: HEALTHY_STAGING_NAME,
    tail: (_bundle, endMs) => healthyTail(endMs)
  });
  rmSync(profileDir, { recursive: true, force: true });
  const beforeA = listWithSizes(stateRoot).join('\n');
  const runA = new AppRun('p43-healthy-a', `${feedUrl}/absent`, {
    extraEnv: { GMUX_UPDATE_STATE_ROOT: stateRoot }
  });
  await runA.waitFor(/tmux conf verified/, 120_000, 'leg A booting, which proves no dialog blocked it');
  await runA.waitFor(/the updater state on disk reads healthy/, 30_000, 'the healthy verdict in the log');
  const onScreenA = dialogTexts(runA.pid);
  if (onScreenA.includes(CLEAR_BUTTON) || onScreenA.includes('cannot install updates')) {
    fail(`leg A showed a repair offer against a healthy state. The windows read:\n${onScreenA}`);
  }
  const labelsA = tortieMenuLabels(runA.pid);
  if (labelsA.includes('Repair Updates')) {
    fail(`leg A drew the Repair Updates item against a healthy state. The menu reads: ${labelsA}`);
  }
  log(`leg A: no dialog, no Repair Updates item. The Tortie menu reads: ${labelsA}`);
  await runA.quit(45_000);
  const afterA = listWithSizes(stateRoot).join('\n');
  if (afterA !== beforeA) {
    fail(`leg A changed the state root.\nbefore:\n${beforeA}\nafter:\n${afterA}`);
  }
  log('leg A: the state root listing with sizes is byte identical after the run');

  // ---- Leg B ----
  freshV1Copy();
  const stagedBundle = buildStateRoot({
    staged: false,
    stagingName: WRECK_STAGING_NAME,
    tail: operatorWreckTail
  });
  seedPendingRecord(profileDir);
  const runB = new AppRun('p43-healthy-b', `${feedUrl}/absent`, {
    extraEnv: { GMUX_UPDATE_STATE_ROOT: stateRoot }
  });
  await waitForDialogOnScreen(runB.pid, WRECK_NEEDLE, 90_000, 'the wreck dialog in leg B');
  log('leg B: the wreck dialog is on screen. Creating the staged bundle it names, while the dialog waits.');
  mkdirSync(join(stagedBundle, 'Contents'), { recursive: true });
  writeFileSync(join(stagedBundle, 'Contents', 'marker.txt'), 'staged late\n');
  const beforeB = listWithSizes(stateRoot).join('\n');
  clickDialogButton(runB.pid, WRECK_NEEDLE, CLEAR_BUTTON);
  const refusalTexts = await waitForDialogOnScreen(
    runB.pid,
    READY_REFUSAL_NEEDLE,
    60_000,
    'the ready update refusal'
  );
  log(`leg B: the refusal is on screen. The window reads, verbatim:\n${refusalTexts}`);
  screenshot('p43-healthy-refusal.png', runB.pid);
  const afterB = listWithSizes(stateRoot).join('\n');
  if (afterB !== beforeB) {
    fail(`leg B removed something after refusing.\nbefore:\n${beforeB}\nafter:\n${afterB}`);
  }
  log('leg B: the state root listing with sizes is byte identical after the refusal, so health is read at click time');
  clickDialogButton(runB.pid, READY_REFUSAL_NEEDLE, 'OK');
  await runB.quit(45_000);
  assertRealStateUnchanged(realBefore, 'P3');
  return { legAMenu: labelsA, refusal: refusalTexts };
}

/**
 * Probe P6. The real wreck, reproduced against real Squirrel and healed.
 *
 * This is the only probe that touches the ShipIt state the installed app
 * shares, so it runs last and only after refuseIfInstalledUpdateInFlight()
 * has passed in main(). It deletes the real preferences domain, which the
 * installed app recreates on its next install, and it never truncates
 * ShipIt_stderr.log.
 */
async function probeWreckLive(feedUrl) {
  log('probe P6. The real wreck, against real Squirrel.');
  const shipItListBefore = listWithSizes(shipItDir).join('\n');
  const domainBefore = defaultsRead(`${BUNDLE_ID}.ShipIt`);
  log(`the real defaults domain before the probe: ${domainBefore.split('\n')[0] ?? ''}`);
  freshV1Copy();
  const runA = await stageOnPrimary(feedUrl, 'p43-live-a');

  // The wreck, made by hand in the shape section 1.2 of the spec explains:
  // remove the staging directory the pending install is waiting on.
  const statePlist = join(shipItDir, 'ShipItState.plist');
  const parsed = JSON.parse(readFileSync(statePlist, 'utf8'));
  const stagedBundle = fileURLToPath(String(parsed.updateBundleURL ?? ''));
  const stagingDir = dirname(stagedBundle.replace(/\/+$/, ''));
  if (!stagingDir.startsWith(`${shipItDir}/update.`)) {
    fail(`refusing to remove ${stagingDir}. It is not an update.* directory under ${shipItDir}.`);
  }
  rmSync(stagingDir, { recursive: true, force: true });
  log(`removed ${stagingDir}, the staged bundle the pending install is waiting on. This is the wreck.`);

  const offset = shipItStderrSize();
  const quitAtMs = Date.now();
  await runA.quit(45_000);
  let gaveUpAtMs = null;
  while (Date.now() - quitAtMs < 180_000) {
    if (/Too many attempts to install, aborting update/.test(shipItStderrSince(offset))) {
      gaveUpAtMs = Date.now();
      break;
    }
    await sleep(500);
  }
  const chunk = shipItStderrSince(offset);
  if (gaveUpAtMs === null) {
    fail(`the install never reached "Too many attempts" within 180 s of the quit. The log since the quit reads:\n${chunk}`);
  }
  if (!/SQRLInstallerErrorDomain Code=-1/.test(chunk)) {
    fail(`the wreck did not produce the Code=-1 error. The log since the quit reads:\n${chunk}`);
  }
  const attemptLines = chunk
    .split('\n')
    .filter((l) => /Resuming installation attempt (\d+)/.test(l));
  log(`the wreck reproduced. Code=-1 then "Too many attempts" ${((gaveUpAtMs - quitAtMs) / 1000).toFixed(1)} s after the quit, with ${attemptLines.length} resume lines.`);
  const held = plistVersion(appPath);
  if (held !== V1) fail(`after the wreck Info.plist reads ${held}, expected ${V1}`);

  // The relaunch must say so, and must offer the repair.
  const recovery = new AppRun('p43-live-recovery', feedUrl);
  const texts = await waitForDialogOnScreen(recovery.pid, WRECK_NEEDLE, 120_000, 'the wreck dialog on the relaunch');
  log(`the relaunch shows the wreck dialog. The window reads, verbatim:\n${texts}`);
  screenshot('p43-live-dialog.png', recovery.pid);
  clickDialogButton(recovery.pid, WRECK_NEEDLE, CLEAR_BUTTON);
  await recovery.waitFor(/repair finished as/, 60_000, 'the repair finishing');

  const problems = [];
  if (existsSync(statePlist)) problems.push('the real ShipItState.plist is still there');
  const leftovers = (existsSync(shipItDir) ? readdirSync(shipItDir) : []).filter((n) =>
    n.startsWith('update.')
  );
  if (leftovers.length > 0) problems.push(`staging directories remain: ${leftovers.join(', ')}`);
  if (defaultsRead(`${BUNDLE_ID}.ShipIt`) !== '(does not exist)') {
    problems.push('the real defaults domain still exists');
  }
  if (existsSync(join(updaterCacheDir, 'pending'))) {
    problems.push('the real pending download directory is still there');
  }
  if (!existsSync(shipItStderrLog)) problems.push('ShipIt_stderr.log was removed');
  if (problems.length > 0) fail(`the live repair left the wrong state. ${problems.join('; ')}`);
  log('the live repair cleared the real state file, staging directories, defaults domain and pending cache, and kept ShipIt_stderr.log');

  // The check re-arms, a new staging completes, and the quit installs.
  await recovery.waitFor(/the updater state was cleared/, 30_000, 'the re-arm line');

  // The result dialog blocks the check behind its OK, so it is dismissed
  // first and by a needle that matches BOTH results. The first cut waited
  // on "cleared the installer's leftovers", which the partial title
  // "Tortie cleared some of the installer's leftovers" does not contain, so
  // a partial result left the dialog on screen and the probe timed out
  // after 300 s without ever reaching the restage.
  const resultTexts = await waitForDialogOnScreen(
    recovery.pid,
    "installer's leftovers",
    30_000,
    'the repair result dialog'
  );
  log(`the live repair result dialog reads, verbatim:\n${resultTexts}`);
  if (!resultTexts.includes("Tortie cleared the installer's leftovers")) {
    fail(`the live repair reported itself as something other than a whole clear. The window reads:\n${resultTexts}`);
  }
  clickDialogButton(recovery.pid, "installer's leftovers", 'OK');
  await sleep(2_000);
  if (dialogTexts(recovery.pid).includes('is downloading')) {
    clickDialogButton(recovery.pid, 'is downloading', 'OK');
  }
  await recovery.waitFor(/is staged and installs when you quit/, 300_000, `restaging ${V2} after the repair`);
  const readyTitle = `Tortie ${V2} is ready`;
  if (dialogTexts(recovery.pid).includes(readyTitle)) {
    clickDialogButton(recovery.pid, readyTitle, 'OK');
  }
  const offset2 = shipItStderrSize();
  const quit2 = Date.now();
  await recovery.quit(45_000);
  const result = await watchInstallAfterQuit(offset2, 60_000, 'P6 recovery');
  if (result.outcome !== 'completed') {
    fail(`the repaired updater did not install. Outcome ${result.outcome}`);
  }
  const after = plistVersion(appPath);
  if (after !== V2) fail(`after the repaired install Info.plist reads ${after}, expected ${V2}`);
  const quitToSwapS = (result.completedAtMs - quit2) / 1000;
  log(`P6 PROVED. The repaired updater installed ${V2} ${quitToSwapS.toFixed(1)} s after the quit.`);
  log(`the real ShipIt listing before the probe:\n${shipItListBefore}`);
  log(`the real ShipIt listing after the probe:\n${listWithSizes(shipItDir).join('\n')}`);
  return {
    gaveUpAfterS: (gaveUpAtMs - quitAtMs) / 1000,
    attemptLines: attemptLines.length,
    quitToSwapS,
    dialog: texts
  };
}

/**
 * A leaked instance carrying the production bundle id is one suspect in the
 * incident this phase answers, so the run ends by proving it left none.
 * Assert only; this never kills anything. Helpers of an app that just quit
 * can take a few seconds to finish exiting (the ready dialog probe hit
 * exactly this: a helper pid was alive at the assert and gone two seconds
 * later), so the assert polls for up to ten seconds and fails only on a
 * process that stays.
 */
async function assertNoScratchProcesses() {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const holdouts = [];
    for (const path of [appPath, pristineApp]) {
      const r = spawnSync('pgrep', ['-f', path], { encoding: 'utf8' });
      if (r.status === 0 && r.stdout.trim() !== '') {
        holdouts.push(`${path}: pids ${r.stdout.trim().split('\n').join(', ')}`);
      }
    }
    if (holdouts.length === 0) {
      log('no process is left running from either scratch app path');
      return;
    }
    if (Date.now() > deadline) {
      fail(`a process is still running from the scratch paths after a 10 s grace. ${holdouts.join('; ')}`);
    }
    await sleep(1_000);
  }
}

// -- main -----------------------------------------------------------------------

// -- Phase 41 probe P1, the tested tmux pair against the PACKAGED app --------

/**
 * Drive the release's one tested tmux version pair with the packaged app.
 *
 * `npm run conformance:tmux-pair` runs the same probe with the binary this
 * repo just built. This one is the version that matters for a release: the
 * client is the tmux inside the signed app bundle, resolved the way a user's
 * copy resolves it, with no environment variable pointing at it. If the two
 * ever disagree, the packaging is where the fault is.
 *
 * It stages no update, so it runs before the feed server starts and before the
 * ShipIt preconditions. Nothing Squirrel owns is read, written or snapshotted.
 *
 * NO `GMUX_TMUX_BIN` IS SET, and that is the point. A packaged Tortie refuses
 * that variable, so setting it would prove nothing about which binary the app
 * chose on its own.
 *
 * `--prove-override-refused` turns that refusal into a live test instead. It
 * sets `GMUX_TMUX_BIN` to the OLDER tmux, the one that started the warm server.
 * An app that honoured it would run a 3.6a client against a 3.6a server, the
 * versions would match, and the tested pair line would never be logged. So the
 * refusal is not asserted by reading a warning alone: honouring the variable
 * changes the outcome, and two independent assertions fail.
 */
async function probeTmuxPair() {
  const { runTmuxPair, OVERRIDE_REFUSED_FRAGMENT } = await import('./tmux-pair.mjs');

  const bundledTmux = join(pristineApp, 'Contents', 'Resources', 'bin', 'tmux');
  if (!existsSync(bundledTmux)) {
    fail(
      `the packaged app at ${pristineApp} carries no tmux at ` +
        'Contents/Resources/bin/tmux. Check the extraResources row in ' +
        'electron-builder.yml and that npm run vendor:tmux produced ' +
        'build/vendor/tmux/bin/tmux.'
    );
  }
  const bundledVersion = spawnSync(bundledTmux, ['-V'], { encoding: 'utf8' });
  log(`the app bundle carries ${(bundledVersion.stdout ?? '').trim()} at ${bundledTmux}`);

  const profile = join(scratch, 'p41-pair-profile');
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });

  const launch = (mode) =>
    new Promise((done) => {
      const env = { ...process.env };
      delete env.APPLE_ID;
      delete env.APPLE_APP_SPECIFIC_PASSWORD;
      delete env.APPLE_TEAM_ID;
      delete env.APPLE_KEYCHAIN_PROFILE;
      // A build started from inside a tmux session must not hand the app a
      // variable meaning "you are already attached somewhere".
      delete env.TMUX;
      // Never inherited. Set only by --prove-override-refused, and then to the
      // OLD tmux on purpose. See the note above.
      delete env.GMUX_TMUX_BIN;
      if (proveOverrideRefused) env.GMUX_TMUX_BIN = pairServerBin;
      env.GMUX_TMUX_SOCKET = TMUX_PAIR_SOCKET;
      env.GMUX_SMOKE = mode;
      // Belt and braces. GMUX_SMOKE alone already unlocks the socket
      // override, and a harness launch returns before any updater code runs.
      env.GMUX_UPDATE_REHEARSAL = '1';
      // TMUX_PAIR_SOCKET is deliberately NOT added to usedSockets. The pair
      // harness owns that server and ends it in its own finally block, with a
      // prefix check immediately before the kill. Two owners for one socket is
      // how a teardown ends up racing itself.
      const child = spawn(
        join(pristineApp, 'Contents', 'MacOS', 'Tortie'),
        [`--user-data-dir=${profile}`],
        { env, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      livePids.add(child.pid);
      let output = '';
      const onData = (chunk) => {
        output += chunk.toString();
        process.stdout.write(chunk);
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.on('exit', (code) => {
        livePids.delete(child.pid);
        done({ output, code });
      });
    });

  const result = await runTmuxPair({
    pairServerBin,
    socket: TMUX_PAIR_SOCKET,
    clientLabel: `the tmux inside ${pristineApp}`,
    launch,
    extraFragments: proveOverrideRefused ? [OVERRIDE_REFUSED_FRAGMENT] : [],
    checkClientPaths: (paths) =>
      paths.every((path) => path === bundledTmux)
        ? null
        : 'the client should have been the tmux inside the app bundle, ' +
          `${bundledTmux}, and the process table showed ${paths.join(', ')}`
  });

  rmSync(profile, { recursive: true, force: true });
  return { ...result, bundledTmux };
}

// -- the update ring probes (Phase 58) ----------------------------------------
//
// P1 --ring-journey   a user check through the real menu, the ring read and
//                     photographed in downloading (with its percent) and in
//                     ready, and a dialog sweep proving no dialog appears
//                     anywhere in the journey.
// P2 --ring-silence   a background check with nobody touching anything: the
//                     ring must be absent through checking, downloading and
//                     staging, and present only once staged.
// P3 --ring-failed    a user check against a dead feed: the failed ring, its
//                     two menu items read verbatim, the Why it failed dialog
//                     read verbatim, and Repair updates reaching a Phase 43
//                     repair surface.
// P4 --ring-restart   the full journey to ready, then Restart and update now
//                     from the ring's menu. The install must land, Squirrel's
//                     own relaunch is observed and recorded, the harness
//                     session list must be byte identical, and the run must
//                     show exactly one install request.
//
// The ring is a DOM button. System Events cannot see into a Chromium
// renderer on this machine (measured: AXManualAccessibility sets cleanly and
// `entire contents of window 1` still returns 0 elements), so the ring is
// read over the DevTools protocol instead: each probe launch passes
// --remote-debugging-port=0, the port lands in <profile>/DevToolsActivePort,
// and one Runtime.evaluate reads the button's aria-label, class and screen
// frame straight from the DOM. Native dialogs, the menu bar and the native
// popup menus stay on the System Events path the Phase 31 and 43 probes
// established.
//
// ISOLATION, measured rather than assumed. The isolated HOME moves
// electron-updater's download cache (the app logs `updater cache dir:
// <ring-home>/Library/Caches/tortie-updater`), which is the directory the
// Phase 43 incident left a 173 MB build in. Squirrel itself resolves the
// real ~/Library/Caches regardless of HOME (observed live in the first P1
// attempt), so the ShipIt directory keeps the Phase 31 discipline the
// script already has: snapshot before, remove only entries the run
// created, never touch the two kept files.

const ringHome = join(scratch, 'ring-home');

function freshRingHome() {
  rmSync(ringHome, { recursive: true, force: true });
  mkdirSync(join(ringHome, 'Library', 'Caches'), { recursive: true });
  mkdirSync(join(ringHome, 'Library', 'Application Support'), {
    recursive: true
  });
  log(`fresh isolated HOME for the ring probes at ${ringHome}`);
}

function ringInstallRequestsSince(offset) {
  return shipItStderrSince(offset)
    .split('\n')
    .filter((l) => l.includes('Detected this as an install request')).length;
}

/** Launch the app under test with the isolated HOME and the mock keychain. */
function launchRingApp(name, feedUrl) {
  return new AppRun(name, feedUrl, {
    extraEnv: { HOME: ringHome },
    extraArgs: ['--use-mock-keychain', '--remote-debugging-port=0']
  });
}

// -- a minimal DevTools protocol client, no dependencies ----------------------

/** One masked client websocket frame around a text payload. */
function wsClientFrame(payload) {
  const data = Buffer.from(payload, 'utf8');
  const mask = randomBytes(4);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, 0x80 | data.length]);
  } else if (data.length < 65_536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

/** Connect to a ws:// url and return { call, fire, close }. */
function wsConnect(url) {
  const m = /^ws:\/\/([^:/]+):(\d+)(\/.*)$/.exec(url);
  if (m === null) throw new Error(`not a ws url: ${url}`);
  return new Promise((resolve, reject) => {
    const sock = netConnect(Number(m[2]), m[1]);
    const key = randomBytes(16).toString('base64');
    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragments = [];
    const pending = new Map();
    let nextId = 1;
    sock.on('connect', () => {
      sock.write(
        `GET ${m[3]} HTTP/1.1\r\nHost: ${m[1]}:${m[2]}\r\n` +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    sock.on('error', (err) => reject(err));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        buf = buf.subarray(idx + 4);
        if (!/ 101 /.test(head)) {
          reject(new Error(`websocket upgrade refused:\n${head}`));
          sock.destroy();
          return;
        }
        upgraded = true;
        resolve(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.subarray(off, off + len);
        buf = buf.subarray(off + len);
        if (op === 0x9) {
          // Ping. Answer with a masked pong carrying the same payload.
          const mask = randomBytes(4);
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i += 1) masked[i] = payload[i] ^ mask[i & 3];
          sock.write(Buffer.concat([Buffer.from([0x8a, 0x80 | payload.length]), mask, masked]));
          continue;
        }
        if (op !== 0x1 && op !== 0x0) continue;
        fragments.push(payload);
        if (!fin) continue;
        const text = Buffer.concat(fragments).toString('utf8');
        fragments = [];
        let msg;
        try {
          msg = JSON.parse(text);
        } catch {
          continue;
        }
        const waiter = pending.get(msg.id);
        if (waiter !== undefined) {
          pending.delete(msg.id);
          waiter(msg);
        }
      }
    });
    const api = {
      call(method, params, timeoutMs = 15_000) {
        const id = nextId;
        nextId += 1;
        sock.write(wsClientFrame(JSON.stringify({ id, method, params: params ?? {} })));
        return new Promise((res, rej) => {
          pending.set(id, res);
          setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              rej(new Error(`${method} timed out after ${timeoutMs / 1000} s`));
            }
          }, timeoutMs);
        });
      },
      fire(method, params) {
        const id = nextId;
        nextId += 1;
        sock.write(wsClientFrame(JSON.stringify({ id, method, params: params ?? {} })));
      },
      close() {
        sock.destroy();
      }
    };
  });
}

/**
 * Attach to the main window's renderer over the DevTools port the launch
 * wrote into <profile>/DevToolsActivePort. Polls, because the file and the
 * page target both appear a moment after boot.
 */
async function cdpForProfile(profile, timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8');
      const port = Number(portFile.split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find(
          (t) => t.type === 'page' && /index\.html/.test(t.url ?? '')
        );
        if (page !== undefined && page.webSocketDebuggerUrl) {
          const ws = await wsConnect(page.webSocketDebuggerUrl);
          log(`attached to the main window renderer over the DevTools protocol (port ${port})`);
          return ws;
        }
      }
    } catch {
      // Not up yet. Keep polling.
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`no DevTools page target within ${timeoutMs / 1000} s`);
    }
    await sleep(500);
  }
}

/** One Runtime.evaluate, by value. Throws on protocol errors. */
async function cdpEval(cdp, expression, awaitPromise = false) {
  const reply = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error));
  return reply.result?.result?.value ?? null;
}

/**
 * The activity bar (and with it the ring) mounts only when a project is
 * open; a fresh profile boots to the home view, which has no rail at all
 * (measured: document has no .ab-spacer there). So each probe adds a
 * scratch project over the app's own projects:add bridge, reloads the
 * window, and reattaches. Boot then auto-activates the first known project
 * (src/renderer/state/subscriptions.ts) and the rail exists.
 */
async function ensureProjectOpen(cdp, profile) {
  const projectDir = join(scratch, 'p58-project');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(join(projectDir, 'README.md'), 'p58 ring probe project\n');
  await cdpEval(
    cdp,
    `window.gmux.projects.add(${JSON.stringify(projectDir)})`,
    true
  );
  cdp.fire('Runtime.evaluate', { expression: 'location.reload()' });
  cdp.close();
  await sleep(2_500);
  const next = await cdpForProfile(profile, 60_000);
  const started = Date.now();
  for (;;) {
    const hasRail = await cdpEval(
      next,
      "document.querySelector('.ab-spacer') !== null"
    );
    if (hasRail === true) {
      log('a scratch project is open and the activity bar is mounted');
      return next;
    }
    if (Date.now() - started > 20_000) {
      fail('the activity bar did not mount after opening the scratch project');
    }
    await sleep(500);
  }
}

const RING_READ_EXPR = `(() => {
  const b = document.querySelector('button.update-ring');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const chrome = window.outerHeight - window.innerHeight;
  return {
    label: b.getAttribute('aria-label'),
    title: b.getAttribute('title'),
    className: b.className,
    x: Math.round(window.screenX + r.left),
    y: Math.round(window.screenY + chrome + r.top),
    w: Math.round(r.width),
    h: Math.round(r.height)
  };
})()`;

/** The ring straight from the DOM: label, title, classes, screen frame. */
async function ringRead(cdp) {
  return cdpEval(cdp, RING_READ_EXPR);
}

/** Poll ringRead until the label matches, with the journey's own timeout. */
async function waitForRing(cdp, test, timeoutMs, what) {
  const started = Date.now();
  for (;;) {
    const ring = await ringRead(cdp);
    if (ring !== null && test(ring.label ?? '')) return ring;
    if (Date.now() - started > timeoutMs) {
      fail(
        `timed out after ${timeoutMs / 1000} s waiting for ${what}. The ring reads ${ring === null ? 'absent' : JSON.stringify(ring.label)}.`
      );
    }
    await sleep(500);
  }
}

/**
 * Click the ring through its own DOM click() and do not wait for a reply:
 * the handler opens a NATIVE menu whose nested event loop may hold the
 * reply until the menu closes.
 */
function clickRing(cdp) {
  cdp.fire('Runtime.evaluate', {
    expression: "document.querySelector('button.update-ring').click()",
    returnByValue: true
  });
}

/**
 * Choose the nth item (1-based) of the OPEN native menu with the keyboard.
 * The popup an Electron Menu.popup shows is NOT exposed to the
 * accessibility tree on this machine (measured: with the menu open the
 * process lists only its window, the real menu bar, and the Dock menu), so
 * the items cannot be read or clicked through AX. The keyboard path is
 * guarded for this shared machine: the keys are sent only after verifying
 * the app under test is the frontmost process, in the same osascript, so a
 * focus steal aborts the send instead of typing into the operator's window.
 * While the menu is open it captures the arrows and the return anyway.
 */
/** True when the app under test is the frontmost process right now. */
function frontmostIsOurs(pid) {
  const r = spawnSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to get unix id of (first application process whose frontmost is true)'
    ],
    { encoding: 'utf8' }
  );
  return r.status === 0 && Number((r.stdout ?? '').trim()) === pid;
}

function tryChooseOpenMenuItemByKeys(pid, n, label) {
  const downs = Array.from({ length: n }, () => 'key code 125\n    delay 0.15').join('\n    ');
  const r = spawnSync(
    'osascript',
    [
      '-e',
      `tell application "System Events"
  set fp to first application process whose frontmost is true
  set fid to unix id of fp
  if fid is not equal to ${pid} then return "REFUSED frontmost is " & (name of fp) & " pid " & fid
  tell fp
    ${downs}
    delay 0.15
    key code 36
  end tell
  return "SENT"
end tell`
    ],
    { encoding: 'utf8' }
  );
  if (r.status === 0 && (r.stdout ?? '').trim() === 'SENT') {
    log(`chose item ${n} ("${label}") of the open native menu with the keyboard, after verifying pid ${pid} is frontmost`);
    return true;
  }
  log(
    `the guarded key send for item ${n} ("${label}") did not run: ${(r.stdout ?? '').trim() || (r.stderr ?? '').trim()}`
  );
  return false;
}

/**
 * Open the ring's native menu and choose one item. Two keyboard attempts
 * run first, because a real menu item click is the best evidence; the
 * operator works on this machine while the probes run, and every focus
 * steal closes the popup and trips the frontmost guard. When both attempts
 * are refused, the probe falls back to firing the SAME bridge call the
 * menu item dispatches to (proven by the photographed menu and the
 * renderer unit tests on ringMenuItems/openRingMenu), so the action still
 * runs live end to end without one more keystroke near the operator's
 * window. Returns 'menu' or 'bridge' so the evidence says which path ran.
 */
async function openRingMenuAndChoose(cdp, run, ring, n, label, bridgeExpr, shotName) {
  // A scoped click into the rail's dead zone above the ring, the only
  // dismissal that needs no keystroke. Measured to be insufficient when
  // the app is backgrounded, so the loop below never opens the menu
  // without first verifying the app holds frontmost.
  const dismissClick = () => {
    spawnSync(
      'osascript',
      [
        '-e',
        `tell application "System Events" to tell (first process whose unix id is ${run.pid}) to click at {${Math.round(ring.x + ring.w / 2)}, ${Math.round(ring.y - 60)}}`
      ],
      { encoding: 'utf8' }
    );
  };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    raiseApp(run.pid);
    await sleep(250);
    if (!frontmostIsOurs(run.pid)) {
      log(`attempt ${attempt}: the operator holds focus, so the menu is not opened at all`);
      await sleep(750);
      continue;
    }
    clickRing(cdp);
    await sleep(1_100);
    if (shotName !== undefined) {
      // The frame is the app's own window rectangle, so a menu that dropped
      // past the window's bottom edge would be clipped. The ring sits at the
      // top of the rail and the menu drops beside it, well inside the window.
      const took = screenshot(shotName, run.pid);
      if (took === 'saved') {
        log(`the open menu is photographed in ${shotName}; the item words are read from that screenshot, because the popup is not AX-exposed`);
      }
      shotName = undefined;
    }
    if (tryChooseOpenMenuItemByKeys(run.pid, n, label)) return 'menu';
    // The keys were refused between the frontmost check and the send. The
    // menu may be standing; an open popup's nested tracking loop wedges
    // the app's own quit (measured), so it must be dismissed before any
    // bridge call.
    dismissClick();
    await sleep(800);
  }
  log(
    `the operator kept focus, so "${label}" runs through the same bridge call the menu item dispatches (${bridgeExpr}), with no menu opened by this fallback.`
  );
  dismissClick();
  await sleep(400);
  cdp.fire('Runtime.evaluate', { expression: bridgeExpr, returnByValue: true });
  return 'bridge';
}

/**
 * A zoomed screenshot of the ring area plus a small margin.
 *
 * The rectangle is already read from the app's own window, so Phase 73.1 left
 * it alone and added the frontmost check the other captures gained. Without
 * that check the same rectangle photographs whatever the operator raised over
 * the app.
 */
function ringShot(name, ring, pid) {
  const pad = 30;
  const path = join(logsDir, name);
  const front = frontmostPid();
  if (front !== pid) {
    log(
      `no ring screenshot for ${name}: the app under test is not in front, so the frame would be someone else's screen. ` +
        `The frontmost process is pid ${front === null ? 'unreadable' : String(front)} and the app under test is pid ${String(pid)}.`
    );
    return;
  }
  const r = spawnSync(
    'screencapture',
    [
      '-x',
      `-R${ring.x - pad},${ring.y - pad},${ring.w + pad * 2},${ring.h + pad * 2}`,
      path
    ],
    { encoding: 'utf8' }
  );
  if (r.status === 0) log(`ring screenshot saved to ${path}`);
  else log(`screencapture failed for ${name}: ${(r.stderr ?? '').trim()}`);
}

/** Bring the app under test to the front, e.g. before a screenshot. */
function raiseApp(pid) {
  osa(
    `tell application "System Events"
  tell (first process whose unix id is ${pid})
    set frontmost to true
  end tell
end tell`,
    'raising the app window'
  );
}

/** True when some window shows any static text, i.e. a dialog is up. */
function anyDialogUp(pid) {
  const texts = dialogTexts(pid)
    .split('\n')
    .filter((l) => l.trim() !== '' && l.trim() !== '----');
  return texts.length > 0 ? texts.join('\n') : null;
}

/**
 * P1, --ring-journey. The manual journey with no dialogs anywhere. The feed
 * should be throttled (--feed-throttle) so downloading is photographable.
 */
async function probeRingJourney(feedUrl) {
  log('ring probe P1. The manual journey: check, downloading, ready, and never a dialog.');
  freshV1Copy();
  freshRingHome();
  const shipItOffset = shipItStderrSize();
  const run = launchRingApp('ring-journey', feedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  let cdp = await cdpForProfile(profileDir, 60_000);
  cdp = await ensureProjectOpen(cdp, profileDir);
  await sleep(2_000);
  raiseApp(run.pid);
  await sleep(1_000);
  const before = await ringRead(cdp);
  if (before !== null) {
    fail(`the ring is on screen before anything happened. It reads ${JSON.stringify(before.label)}.`);
  }
  log('the ring is absent before the check, as it must be');

  const dialogsSeen = [];
  let sweeping = true;
  const sweep = (async () => {
    while (sweeping) {
      const up = anyDialogUp(run.pid);
      if (up !== null) dialogsSeen.push(up);
      await sleep(1_000);
    }
  })();

  clickCheckForUpdates(run.pid);
  const clickedAtS = (Date.now() - run.startedAt) / 1000;
  log(`clicked "Check for Updates…" through the real menu ${clickedAtS.toFixed(1)} s after launch`);
  const checking = await run.waitFor(/Checking for update/, 30_000, 'the user check starting');
  if (checking.at / 1000 >= 25) {
    fail(`the check began ${(checking.at / 1000).toFixed(1)} s after launch, late enough to be the background timer`);
  }

  // Downloading, with the percent read off the button's own aria-label.
  const dl1 = await waitForRing(
    cdp,
    (l) => l.startsWith('Downloading '),
    120_000,
    'the downloading ring'
  );
  const dl1AtS = (Date.now() - run.startedAt) / 1000;
  log(`the downloading ring reads, verbatim: "${dl1.label}" (${dl1AtS.toFixed(1)} s after launch, classes "${dl1.className}")`);
  const m1 = /^Downloading (\S+), (\d+) percent$/.exec(dl1.label);
  if (m1 === null) fail(`the downloading hover does not match the spec shape: "${dl1.label}"`);
  if (m1[1] !== V2) fail(`the downloading hover names ${m1[1]}, expected ${V2}`);
  if (dl1.title !== dl1.label) fail('the hover title and the aria-label differ');
  // Photograph the arc once it is visibly filled rather than at 0 percent.
  const dlShot = await waitForRing(
    cdp,
    (l) => {
      const m = /^Downloading \S+, (\d+) percent$/.exec(l);
      return m !== null && Number(m[1]) >= 10;
    },
    60_000,
    'the downloading ring at 10 percent or more'
  );
  log(`photographing the ring at "${dlShot.label}"`);
  raiseApp(run.pid);
  await sleep(300);
  ringShot('p58-ring-downloading.png', dlShot, run.pid);
  screenshot('p58-ring-downloading-full.png', run.pid);
  await sleep(4_000);
  const dl2 = await ringRead(cdp);
  const m2 = dl2 === null ? null : /^Downloading (\S+), (\d+) percent$/.exec(dl2.label ?? '');
  if (m2 !== null) {
    log(`4 s later the ring reads "${dl2.label}", so the arc moves with real progress (${m1[2]} to ${m2[2]} percent)`);
    if (Number(m2[2]) < Number(m1[2])) fail('the percent went backwards');
  } else {
    log(`4 s later the ring reads ${dl2 === null ? 'absent' : `"${dl2.label}"`}; the download finished inside the window`);
  }

  await run.waitFor(/is downloaded and staging has started/, 300_000, `the downloaded line for ${V2}`);
  await run.waitFor(/is staged and installs when you quit/, 300_000, `the staged line for ${V2}`);
  const ready = await waitForRing(
    cdp,
    (l) => l === `Tortie ${V2} is ready. It installs when you quit. Click to choose when.`,
    60_000,
    'the ready ring with its exact hover'
  );
  const readyAtS = (Date.now() - run.startedAt) / 1000;
  log(`the ready ring reads, verbatim: "${ready.label}" (${readyAtS.toFixed(1)} s after launch, classes "${ready.className}")`);
  raiseApp(run.pid);
  await sleep(300);
  ringShot('p58-ring-ready.png', ready, run.pid);
  screenshot('p58-ring-ready-full.png', run.pid);

  sweeping = false;
  await sweep;
  if (dialogsSeen.length > 0) {
    fail(`a dialog appeared during the journey. It read:\n${dialogsSeen.join('\n---\n')}`);
  }
  log('the dialog sweep polled once per second from the click to ready and saw no dialog at any point');
  if (run.sawLine(/showing the (ready|refusal) dialog|Update found/)) {
    fail('the app logged showing a dialog during the manual journey');
  }

  // ShipIt starts a moment after the staged event, so give its first log
  // line a few seconds before holding the run to exactly one request.
  let requests = 0;
  for (let waited = 0; waited < 30_000; waited += 1_000) {
    requests = ringInstallRequestsSince(shipItOffset);
    if (requests >= 1) break;
    await sleep(1_000);
  }
  log(`"Detected this as an install request" lines for the run: ${requests} (target 1)`);
  if (requests !== 1) fail(`the journey produced ${requests} install requests, expected exactly 1`);

  cdp.close();
  await run.quit(45_000);
  log('ring-journey run quit');
  return { clickedAtS, checkAtS: checking.at / 1000, dl1: dl1.label, dl2: dl2?.label ?? null, readyAtS };
}

/**
 * P2, --ring-silence. A background journey draws nothing until ready.
 */
async function probeRingSilence(feedUrl) {
  log('ring probe P2. Background silence: no ring until staged, then ready.');
  freshV1Copy();
  freshRingHome();
  const run = launchRingApp('ring-silence', feedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  let cdp = await cdpForProfile(profileDir, 60_000);
  cdp = await ensureProjectOpen(cdp, profileDir);
  raiseApp(run.pid);
  await sleep(1_000);
  screenshot('p58-ring-silence-before.png', run.pid);
  log('raised the app window for the before screenshot');

  // Poll from before the 30 second first check to the staged line. The ring
  // must stay absent the whole way, and no dialog may show.
  let staged = false;
  run.waitFor(/is staged and installs when you quit/, 400_000, 'staged').then(
    () => {
      staged = true;
    },
    () => {}
  );
  let polls = 0;
  const pollStarted = Date.now();
  while (!staged) {
    if (Date.now() - pollStarted > 420_000) {
      fail('the background journey never reached staged within 420 s');
    }
    const ring = await ringRead(cdp);
    if (ring !== null && !staged) {
      fail(`the ring appeared during a background journey. It reads ${JSON.stringify(ring.label)}.`);
    }
    const up = anyDialogUp(run.pid);
    if (up !== null) fail(`a dialog appeared during a background journey:\n${up}`);
    polls += 1;
    await sleep(2_000);
  }
  log(`the ring stayed absent through ${polls} polls covering checking, downloading and staging`);

  const ready = await waitForRing(
    cdp,
    (l) => l === `Tortie ${V2} is ready. It installs when you quit. Click to choose when.`,
    30_000,
    'the ready ring after a background staging'
  );
  log(`once staged, the ring surfaced in ready, verbatim: "${ready.label}"`);
  raiseApp(run.pid);
  await sleep(300);
  ringShot('p58-ring-silence-after.png', ready, run.pid);
  screenshot('p58-ring-silence-after-full.png', run.pid);
  if (run.sawLine(/showing the (ready|refusal) dialog|Update found/)) {
    fail('the app logged showing a dialog during the background journey');
  }
  cdp.close();
  await run.quit(45_000);
  log('ring-silence run quit');
  return { polls };
}

/**
 * P3, --ring-failed. A user check against a dead feed. The failed ring, its
 * menu verbatim, the Why it failed dialog verbatim, then Repair updates.
 */
async function probeRingFailed(deadFeedUrl) {
  log('ring probe P3. The failed ring against a dead feed.');
  freshV1Copy();
  freshRingHome();
  const run = launchRingApp('ring-failed', deadFeedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  let cdp = await cdpForProfile(profileDir, 60_000);
  cdp = await ensureProjectOpen(cdp, profileDir);
  await sleep(2_000);
  raiseApp(run.pid);
  await sleep(1_000);

  clickCheckForUpdates(run.pid);
  log('clicked "Check for Updates…" through the real menu against the dead feed');
  const failedRing = await waitForRing(
    cdp,
    (l) => l === 'The update check failed. Click to see why.',
    60_000,
    'the failed ring with its exact hover'
  );
  log(`the failed ring reads, verbatim: "${failedRing.label}" (classes "${failedRing.className}")`);
  raiseApp(run.pid);
  await sleep(300);
  ringShot('p58-ring-failed.png', failedRing, run.pid);
  screenshot('p58-ring-failed-full.png', run.pid);
  const up = anyDialogUp(run.pid);
  if (up !== null) fail(`a dialog is up after the failed check; the ring must be the only surface:\n${up}`);
  log('no dialog anywhere after the failed check. The ring is the only surface.');

  // The menu. The screenshot is the evidence of record for the item words;
  // the AX read beside it is best effort and logged either way.
  // Why it failed, read verbatim against the phase spec section 7.3 copy.
  const whyPath = await openRingMenuAndChoose(
    cdp,
    run,
    failedRing,
    1,
    'Why it failed',
    'window.gmux.updates.whyFailed()',
    'p58-ring-failed-menu.png'
  );
  const whyTexts = await waitForDialogOnScreen(
    run.pid,
    'The update check failed',
    30_000,
    'the why it failed dialog'
  );
  log(`the why it failed dialog reads, verbatim:\n${whyTexts}`);
  if (!whyTexts.includes('Tortie could not reach the update feed. It will try again on its own.')) {
    fail('the why it failed body is not the pinned copy');
  }
  screenshot('p58-ring-why-failed.png', run.pid);
  clickDialogButton(run.pid, 'The update check failed', 'OK');
  log('dismissed the why it failed dialog with its OK button');
  // The modal's nested run loop holds the main process's stdout flush, so
  // the log line lands after the dialog closes. Wait for it rather than
  // asserting it mid-modal.
  await run.waitFor(
    /showing the why it failed dialog for checking/,
    15_000,
    'the why it failed log line'
  );
  log('the app logged showing the why it failed dialog for checking');
  await sleep(1_000);

  // Repair updates must reach a Phase 43 repair surface.
  const ringAgain = await ringRead(cdp);
  if (ringAgain === null || !(ringAgain.label ?? '').includes('Click to see why')) {
    fail('the failed ring is gone after the why it failed dialog was dismissed');
  }
  log(`the failed ring still stands after the dialog: "${ringAgain.label}"`);
  const repairPath = await openRingMenuAndChoose(
    cdp,
    run,
    ringAgain,
    2,
    'Repair updates',
    'window.gmux.updates.repair()',
    undefined
  );
  const repairNeedles = [
    'Nothing needs clearing',
    "cleared the installer's leftovers",
    "cleared some of the installer's leftovers"
  ];
  const started = Date.now();
  let repairTexts = null;
  for (;;) {
    const texts = dialogTexts(run.pid);
    if (repairNeedles.some((n) => texts.includes(n))) {
      repairTexts = texts;
      break;
    }
    if (Date.now() - started > 30_000) {
      fail(`no Phase 43 repair surface appeared within 30 s. The windows read:\n${texts || '(nothing)'}`);
    }
    await sleep(1_000);
  }
  log(`Repair updates reached a Phase 43 repair surface. It reads, verbatim:\n${repairTexts}`);
  screenshot('p58-ring-repair.png', run.pid);
  const okNeedle = repairNeedles.find((n) => repairTexts.includes(n));
  clickDialogButton(run.pid, okNeedle, 'OK');
  log('dismissed the repair outcome dialog');

  cdp.close();
  await run.quit(45_000);
  log('ring-failed run quit');
  return {
    menu: `photographed in p58-ring-failed-menu.png; why-failed ran via ${whyPath}, repair via ${repairPath}`,
    whyBodySeen: true
  };
}

/**
 * P4, --ring-restart. The full journey to ready, then Restart and update
 * now from the ring's own menu. The one quitAndInstall site runs, Squirrel
 * installs and relaunches. The relaunch comes back with the launchd session
 * environment rather than the harness environment, and the app's own
 * protective direction for exactly that case is the single instance lock:
 * the operator's running copy refuses the stray relaunch before it touches
 * anything. The probe therefore REQUIRES the installed Tortie to be
 * running, records what the relaunch did, and then proves the swapped
 * bundle boots healthy on the new version with the harness environment.
 */
async function probeRingRestart(feedUrl) {
  log('ring probe P4. Restart and update now from the ring.');
  // A LaunchServices-launched main process reports a bare "Tortie" in both
  // its command line and its comm column (measured), so the installed
  // app's main pid is found as the parent of one of its helper processes,
  // which do carry the full bundle path.
  const opMainPidNow = () => {
    const rows = spawnSync('ps', ['-axo', 'pid=,ppid=,comm='], {
      encoding: 'utf8'
    }).stdout.split('\n');
    const helper = rows.find((l) =>
      l.includes('/Applications/Tortie.app/Contents/Frameworks/Tortie Helper')
    );
    if (helper === undefined) return null;
    const ppid = Number(helper.trim().split(/\s+/)[1]);
    return Number.isFinite(ppid) && ppid > 1 ? ppid : null;
  };
  const opMainPid = opMainPidNow();
  if (opMainPid === null) {
    refuse(
      'the installed Tortie is not running. Its single instance lock is the protective direction for the relaunch this probe drives, so the probe refuses without it.'
    );
  }
  log(`the installed Tortie is running (main pid ${opMainPid}), so a stray relaunch is refused by its lock`);

  freshV1Copy();
  freshRingHome();
  const run = launchRingApp('ring-restart', feedUrl);
  await run.waitFor(/tmux conf verified/, 120_000, 'the app booting its tmux server');
  execFileSync('tmux', [
    '-L', REHEARSAL_SOCKET, 'new-session', '-d', '-s', 'p58-keeper1',
    'while true; do date; sleep 1; done'
  ]);
  execFileSync('tmux', [
    '-L', REHEARSAL_SOCKET, 'new-session', '-d', '-s', 'p58-keeper2',
    'while true; do date; sleep 1; done'
  ]);
  // The app creates its own control-plumbing session (gmux-control) on the
  // harness server at boot, lazily. It is the app's own client machinery,
  // not user data, so the survival claim filters it on both sides.
  const userSessions = () =>
    harnessSessionList()
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.includes('gmux-control'))
      .join('\n');
  const listBefore = userSessions();
  writeFileSync(join(logsDir, 'p58-sessions-before.txt'), listBefore);
  log(`harness sessions before the restart (gmux-control filtered):\n${listBefore.trim()}`);

  let cdp = await cdpForProfile(profileDir, 60_000);
  cdp = await ensureProjectOpen(cdp, profileDir);
  await sleep(2_000);
  raiseApp(run.pid);
  const shipItOffset = shipItStderrSize();
  clickCheckForUpdates(run.pid);
  log('clicked "Check for Updates…" through the real menu');
  await run.waitFor(/is staged and installs when you quit/, 300_000, `the staged line for ${V2}`);
  const ready = await waitForRing(
    cdp,
    (l) => l === `Tortie ${V2} is ready. It installs when you quit. Click to choose when.`,
    60_000,
    'the ready ring'
  );
  log(`the ready ring reads, verbatim: "${ready.label}" (classes "${ready.className}")`);

  // The menu. The screenshot is the evidence of record for the item words;
  // the AX read beside it is best effort and logged either way.
  // This run MEASURES the quit, and a popup left open by a focus steal
  // wedges the quit it is here to measure (an open NSMenu's nested
  // tracking loop held three earlier attempts past 120 s, and the same
  // bridge call with no menu open exited in about 1 s). So the measurement
  // run opens no menu at all: the ready menu's two items are photographed
  // evidence from the earlier runs (p58-ring-ready-menu.png), the item to
  // action dispatch is unit tested, and the action itself runs live here
  // through the same bridge call the menu item dispatches.
  log(
    'firing window.gmux.updates.restartNow(), the same bridge call the "Restart and update now" menu item dispatches. No menu is opened in the measurement run.'
  );
  const choseAtMs = Date.now();
  cdp.fire('Runtime.evaluate', {
    expression: 'window.gmux.updates.restartNow()',
    returnByValue: true
  });
  const restartPath = 'bridge';
  log(`Restart and update now ran via the ${restartPath} path`);

  // The app must log the choice and then exit through quitAndInstall.
  await run.waitFor(/restart and update now was chosen from the update ring/, 15_000, 'the ring choice log line');
  log('the app logged the ring choice before going down');
  // Detach the DevTools client before the quit is judged: an attached
  // debugger can hold the teardown open, and the probe must measure the
  // app's own quit, not the harness's grip on it.
  await sleep(500);
  cdp.close();
  await Promise.race([
    run.exitPromise,
    sleep(120_000).then(() => fail('the app did not exit within 120 s of Restart and update now'))
  ]);
  const exitAtS = (Date.now() - choseAtMs) / 1000;
  log(`the app exited ${exitAtS.toFixed(1)} s after the choice`);

  // The install: watch the isolated ShipIt log and the bundle's Info.plist.
  let swapped = false;
  for (let waited = 0; waited < 120_000; waited += 1_000) {
    if (plistVersion(appPath) === V2) {
      swapped = true;
      break;
    }
    await sleep(1_000);
  }
  if (!swapped) fail(`the bundle never swapped to ${V2} after Restart and update now`);
  const swapAtS = (Date.now() - choseAtMs) / 1000;
  log(`Info.plist reads ${V2} ${swapAtS.toFixed(1)} s after the choice`);

  // Squirrel's own relaunch. ShipIt's log is the record of truth (a
  // LaunchServices launch shows a bare "Tortie" command, so pgrep -f on the
  // path misses the main process); the ps comm column carries the real
  // executable path for anything still alive.
  let relaunchLine = null;
  for (let waited = 0; waited < 90_000; waited += 1_000) {
    const chunk = shipItStderrSince(shipItOffset);
    relaunchLine = chunk
      .split('\n')
      .find(
        (l) =>
          l.includes('Successfully launched application at') &&
          l.includes('p58-rehearsal/app/Tortie.app')
      ) ?? null;
    if (relaunchLine !== null) break;
    await sleep(1_000);
  }
  if (relaunchLine === null) {
    log('ShipIt never logged launching the swapped bundle within 90 s. The summary reports it.');
  } else {
    log(`Squirrel relaunched the swapped bundle. ShipIt logged, verbatim: ${relaunchLine.trim()}`);
    // The relaunch carries the launchd session environment, not the
    // harness environment, so the app's protective direction is the
    // operator's single instance lock: the stray instance refuses itself.
    // Watch the process table by executable path until it is gone.
    let live = null;
    let gone = false;
    const seenAt = Date.now();
    for (let waited = 0; waited < 60_000; waited += 1_000) {
      const ps = spawnSync('ps', ['-axo', 'pid=,comm='], { encoding: 'utf8' });
      const rows = ps.stdout
        .split('\n')
        .filter((l) => l.includes('p58-rehearsal/app/Tortie.app/Contents/MacOS/Tortie'));
      if (rows.length === 0) {
        gone = true;
        break;
      }
      if (live === null) {
        live = rows[0].trim();
        const pid = Number(live.split(/\s+/)[0]);
        if (Number.isFinite(pid)) livePids.add(pid);
        log(`the relaunched instance is alive: ${live}`);
      }
      await sleep(1_000);
    }
    if (gone) {
      log(
        live === null
          ? 'the relaunched instance had already exited by the first process table scan, refused by the installed Tortie\'s single instance lock, the designed protective direction'
          : `the relaunched instance exited on its own ${((Date.now() - seenAt) / 1000).toFixed(1)} s after it was first seen, refused by the installed Tortie's single instance lock, the designed protective direction`
      );
    } else {
      log('the relaunched instance is still alive after 60 s; it is recorded and will be ended in cleanup');
    }
  }

  const requests = ringInstallRequestsSince(shipItOffset);
  log(`"Detected this as an install request" lines for the run: ${requests} (target 1)`);
  if (requests !== 1) {
    fail(`the run produced ${requests} install requests, expected exactly 1`);
  }

  // The operator's own instance is untouched: its main process still runs
  // under the same pid.
  const opMainAfter = opMainPidNow();
  if (opMainAfter !== opMainPid) {
    fail(
      `the installed Tortie's main pid moved from ${opMainPid} to ${opMainAfter ?? 'gone'}`
    );
  }
  log(`the installed Tortie's main process kept pid ${opMainPid} through the whole probe`);

  // The comeback: the swapped bundle boots healthy on the new version with
  // the harness environment, and the sessions are byte identical.
  const back = launchRingApp('ring-restart-back', feedUrl);
  const updatesJson = join(profileDir, 'updates.json');
  let sawNewVersion = false;
  for (let waited = 0; waited < 120_000; waited += 2_000) {
    try {
      if (JSON.parse(readFileSync(updatesJson, 'utf8')).lastSeenVersion === V2) {
        sawNewVersion = true;
        break;
      }
    } catch {
      // Not written yet.
    }
    await sleep(2_000);
  }
  if (!sawNewVersion) fail(`the relaunched app never recorded lastSeenVersion ${V2}`);
  log(`the comeback run records lastSeenVersion ${V2} in updates.json`);
  const listAfter = userSessions();
  writeFileSync(join(logsDir, 'p58-sessions-after.txt'), listAfter);
  if (listAfter !== listBefore) {
    fail(`the harness session list changed across the restart.\nbefore:\n${listBefore}\nafter:\n${listAfter}`);
  }
  log('the harness session list after the comeback is byte identical to the list before the restart');
  await back.quit(45_000);
  log('ring-restart comeback run quit');

  return { exitAtS, swapAtS, relaunchObserved: relaunchLine !== null, requests };
}

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

  // Phase 41 probe P1. It stages no update, so it runs HERE, before the
  // ShipIt preconditions and before the feed server. Nothing Squirrel owns is
  // read, written or snapshotted by this branch.
  if (tmuxPair) {
    const pair = await probeTmuxPair();
    const operatorAfterPair = operatorSessionCount();
    log('PASS. Probe P1, the tested tmux pair, driven by the packaged app.');
    log(`  the client was the tmux inside the app bundle at ${pair.bundledTmux}`);
    log(`  ${pair.pairLine}`);
    log(`  create half ${pair.createBytes} bytes, verify half ${pair.verifyBytes} bytes, both through a real attach`);
    log(
      `  the warm server is unchanged: version ${String(pair.after.version)}, start time ` +
        `${String(pair.after.startTime)}`
    );
    log(`  operator sessions ${operatorBefore} before and ${operatorAfterPair} after`);
    if (operatorAfterPair !== operatorBefore) {
      fail(
        `the operator session count moved from ${operatorBefore} to ${operatorAfterPair}. ` +
          'Something touched the real server.'
      );
    }
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
    if (twoInstance) result = await twoInstanceProbes(feedUrl);
    else if (readyDialog) result = await probeReadyDialog(feedUrl);
    else if (wreck) result = await probeWreckAndHeal(feedUrl);
    else if (wreckHealthy) result = await probeWreckHealthy(feedUrl);
    else if (wreckLive) result = await probeWreckLive(feedUrl);
    else if (ringJourney) result = await probeRingJourney(feedUrl);
    else if (ringSilence) result = await probeRingSilence(feedUrl);
    else if (ringFailed) result = await probeRingFailed('http://127.0.0.1:1');
    else if (ringRestart) result = await probeRingRestart(feedUrl);
    else result = await roundtrip(feedUrl);
  } finally {
    feedServer.close();
    feedServer = null;
    endHarnessServers();
    cleanCache(cacheBefore);
    cleanShipIt(shipItBefore);
    rmSync(profileDir, { recursive: true, force: true });
    rmSync(profileBDir, { recursive: true, force: true });
    rmSync(profileCDir, { recursive: true, force: true });
    // Phase 58. The isolated HOME belongs to this script alone.
    if (anyRingProbe) rmSync(ringHome, { recursive: true, force: true });
    // Phase 43. The scratch state root and the suffixed preferences domain
    // belong to this script alone, so both go whole. The real domain is
    // never named here.
    if (wreck || wreckHealthy) {
      rmSync(stateRoot, { recursive: true, force: true });
      defaultsDelete(WRECK_DEFAULTS_DOMAIN);
    }
  }

  await assertNoScratchProcesses();

  const operatorAfter = operatorSessionCount();
  log(`operator sessions on socket ${OPERATOR_SOCKET} after the rehearsal. ${operatorAfter}`);
  if (operatorAfter < operatorBefore) {
    fail(`the operator session count moved from ${operatorBefore} to ${operatorAfter}. Something touched the real server.`);
  }
  if (operatorAfter > operatorBefore) {
    // The operator works on this machine while the probes run, and their
    // own new sessions are not this script's doing. Additions are named
    // out loud; a removal above is still fatal.
    log(
      `the operator session count rose from ${operatorBefore} to ${operatorAfter} during the run. The operator's own app creates sessions while they work; this script never addresses that socket beyond list-sessions.`
    );
  }

  if (ringJourney) {
    log('PASS. Ring probe P1, the manual journey through the ring, never a dialog.');
    log(`  the user's check began ${result.checkAtS.toFixed(1)} s after launch`);
    log(`  downloading read off the ring, verbatim: "${result.dl1}"${result.dl2 !== null ? ` then "${result.dl2}"` : ''}`);
    log(`  ready read off the ring ${result.readyAtS.toFixed(1)} s after launch`);
    log('  the dialog sweep saw no dialog between the click and ready');
    log('  exactly 1 install request in the isolated ShipIt log');
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (ringSilence) {
    log('PASS. Ring probe P2, background silence.');
    log(`  the ring stayed absent through ${result.polls} polls until staged, then surfaced in ready`);
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (ringFailed) {
    log('PASS. Ring probe P3, the failed ring and its two actions.');
    log(`  the failed menu evidence: ${result.menu}`);
    log('  the why it failed dialog carried the pinned copy and was dismissed');
    log('  Repair updates reached a Phase 43 repair surface');
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (ringRestart) {
    log('PASS. Ring probe P4, restart and update now.');
    log(`  the app exited ${result.exitAtS.toFixed(1)} s after the choice and the bundle swapped ${result.swapAtS.toFixed(1)} s after it`);
    log(`  Squirrel's relaunch ${result.relaunchObserved ? 'was observed and recorded' : 'was not observed'}`);
    log(`  install requests for the run: ${result.requests} (target 1)`);
    log('  the harness session list is byte identical across the restart');
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (readyDialog) {
    log('PASS. Ready dialog probe, with probe P4 riding on it.');
    log(`  the user's check began ${result.checkAtS.toFixed(1)} s after launch`);
    log('  the Update found dialog and the ready dialog were both read off the screen');
    log('  two more user checks after the staging showed a dialog and reached the library no times');
    log(`  "Detected this as an install request" lines for the run: ${result.detected} (target 1, the incident had 2)`);
    log(`  the quit installed ${V2} in ${result.quitToSwapS.toFixed(1)} s`);
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (wreck) {
    log('PASS. Probe P2, wreck and heal, fully isolated.');
    log(`  the wreck dialog was read off the accessibility tree and matched the pinned copy`);
    log(`  the clear finished ${(result.clearedMs / 1000).toFixed(1)} s after the click`);
    log('  the state file, the staging directories, the defaults domain and the pending cache are gone');
    log('  ShipIt_stderr.log and update.zip were kept');
    log('  the repair reported itself as a whole clear, and the launch after it was quiet');
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (wreckHealthy) {
    log('PASS. Probe P3, a healthy staged update is never touched.');
    log(`  leg A showed no dialog and drew no Repair Updates item. The Tortie menu read: ${result.legAMenu}`);
    log('  leg B refused at click time and removed nothing');
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (wreckLive) {
    log('PASS. Probe P6, the real wreck reproduced and healed.');
    log(`  "Too many attempts" landed ${result.gaveUpAfterS.toFixed(1)} s after the quit, after ${result.attemptLines} resume lines`);
    log('  the relaunch showed the wreck dialog and the click cleared the real state');
    log(`  the repaired updater installed ${V2} ${result.quitToSwapS.toFixed(1)} s after the quit`);
    log(`  operator sessions ${operatorBefore} before and ${operatorAfter} after`);
  } else if (twoInstance) {
    log('PASS. Two instance probes.');
    log(`  R1 produced the abort with the ${result.r1.strategy} strategy`);
    log(`  R1 abort line. ${result.r1.abortLine}`);
    log(`  R1 counted ${result.r1.count} running instances`);
    log(`  R1 Beginning to abort ${result.r1.beginningToAbortS === null ? 'was not observed' : `${result.r1.beginningToAbortS.toFixed(1)} s`}`);
    log('  R1 relaunch showed the refusal dialog, read off the screen, and the probe dismissed it');
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
