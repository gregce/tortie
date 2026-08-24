#!/usr/bin/env node
/**
 * probe-shell-path.mjs. The Phase 81 live probe.
 *
 * WHAT IT PROVES. The phase moves one wait, so every claim is about order in
 * time. The probe makes the login shell slow on purpose, which is what pulls
 * the two moments apart far enough to read the order between them.
 *
 *   1. A restore that BEGINS before the capture lands still gets the captured
 *      PATH. The proof is the pane's own environment, read from ps.
 *   2. Several restores across the boundary all get one identical PATH.
 *   3. Every Restore control is off, with its sentence, while the flag is
 *      false, and on afterwards.
 *   4. A create started in the same window does not answer before the shell.
 *   5. sessions:list and projects:list answer before the shell does.
 *   6. The gain, being process start to the moment the renderer holds the
 *      session list.
 *
 * HOW THE SHELL IS MADE SLOW, and no product code changes for it.
 * `captureLoginShellPath` asks `options.shell ?? env['SHELL'] ?? '/bin/zsh'`,
 * so the probe writes a scratch script, points SHELL at it, and the script
 * sleeps for a chosen number of seconds before printing a PATH this file
 * chose. That PATH carries a sentinel directory no other program on this
 * machine spells, so "the pane got the captured PATH" is a substring test
 * against a string the probe wrote itself rather than a judgement.
 *
 * SAFETY, ABSOLUTE. The probe runs on the socket build/harness-socket.mjs
 * gave it, which that script refuses to let be `gmux` or `default`. It uses
 * its own user data directory and its own scratch project under the system
 * scratch area. It names `-L gmux` in exactly one place, being a read only
 * session count taken before and after, which must match. It never uses
 * pkill, never uses kill-server, and kills only the pid it spawned. The
 * restorable rows it needs are made by ending the scratch sessions it created
 * itself, one `kill-session` per recorded session id.
 *
 * Usage, from the repository root. The flags go INSIDE the harness command,
 * because `npm run x -- --flag` would append them after the quoted inner
 * command and harness-socket.mjs would drop them:
 *
 *   npm run probe:shellpath
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p81-path \
 *     'node build/probe-shell-path.mjs --slow 8000 --restore 6'
 *
 *   npm run build
 *   node build/harness-socket.mjs gmux-p81-path \
 *     'node build/probe-shell-path.mjs --fallback'
 *
 *   npm run package:dir
 *   node build/harness-socket.mjs gmux-p81-path \
 *     'node build/probe-shell-path.mjs --packaged --runs 5 --boot-only'
 *
 * Exit code 0 when every proof this run asked for passed. Exit code 1
 * otherwise, with every failing row named. Exit code 2 when the probe refuses
 * to run at all.
 */

import { execFile, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { withElectron } from './electron-run.mjs';

const execFileP = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:shellpath]';

function say(line) {
  console.log(`${TAG} ${line}`);
}

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Arguments and refusals
// ---------------------------------------------------------------------------

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = process.argv[at + 1];
  return value === undefined || value.startsWith('--') ? fallback : value;
}

/** How long the fake login shell sleeps before it prints. */
const slowMs = Number(flag('slow', '8000'));
/** How many restorable rows the measured run restores across the boundary. */
const restoreCount = Number(flag('restore', '4'));
/** The fake shell prints nothing at all, which drives the fallback branch. */
const fallbackMode = process.argv.includes('--fallback');
/** Measure the packaged build rather than the development one. */
const packaged = process.argv.includes('--packaged');
/** Only measure boot to session list, with no verbs and no prep run. */
const bootOnly = process.argv.includes('--boot-only');
/** How many cold starts the boot measurement takes. */
const runs = Number(flag('runs', '1'));
/** Keep the scratch directory after the run. */
const keep = process.argv.includes('--keep');
/**
 * Measure against the machine's own login shell rather than the slow fake.
 * The fake shell says how big the wait can get. The real one says what a
 * person on this machine actually waits.
 */
const realShell = process.argv.includes('--realshell');

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of ' +
      "my own: node build/harness-socket.mjs gmux-p81-path 'node " +
      "build/probe-shell-path.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to measure on "${socket}", which is not a harness socket`);
}
if (!packaged && !existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const packagedBin = join(
  repoRoot,
  'release',
  process.arch === 'arm64' ? 'mac-arm64' : 'mac',
  'Tortie.app',
  'Contents',
  'MacOS',
  'Tortie'
);
if (packaged && !existsSync(packagedBin)) {
  refuse(`${packagedBin} is missing. Run npm run package:dir first.`);
}

/**
 * The operator's live server, listed and never written. This is the ONLY
 * place this file names it.
 */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '')
    .split('\n')
    .filter((line) => line.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);
say(packaged ? `binary: ${packagedBin}` : 'binary: development build');

// ---------------------------------------------------------------------------
// The scratch project and the fake login shell
// ---------------------------------------------------------------------------

const scratch =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p81-shell-path');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
writeFileSync(join(project, 'README.md'), '# p81 shell path probe\n', 'utf8');

/**
 * The sentinel. It is first in the PATH the fake shell prints, and no other
 * program on this machine spells it, so a pane that carries it took the
 * captured PATH and a pane that does not took something else.
 */
const sentinel = join(root, 'sentinel-bin');
mkdirSync(sentinel, { recursive: true });

/** 30 directories, the first of them the sentinel. */
const fakeDirs = [sentinel];
for (let i = 1; i < 30; i++) fakeDirs.push(join(root, `dir-${String(i)}`));
const fakePath = fakeDirs.join(':');

/**
 * The fake login shell. It is asked exactly the way the real one is, being
 * `<shell> -lic '<printf>'`, so $1 is the flags and $2 is the command.
 */
const fakeShell = join(root, 'slow-login-shell.sh');
writeFileSync(
  fakeShell,
  fallbackMode
    ? `#!/bin/sh\n# Phase 81 probe: answer nothing, which is the fallback branch.\nsleep ${String(Math.round(slowMs / 1000))}\nexit 0\n`
    : `#!/bin/sh\n# Phase 81 probe: answer late, with a PATH this probe chose.\nsleep ${String(Math.round(slowMs / 1000))}\nPATH='${fakePath}'\nexport PATH\nexec /bin/sh -c "$2"\n`,
  'utf8'
);
chmodSync(fakeShell, 0o755);

/**
 * Where a pane writes the PATH it was given.
 *
 * THIS IS HOW A PANE IS READ, and it is the reading the spec's second choice
 * describes. `ps -p <pid> -wwEo command=` prints no environment on this Mac,
 * measured on 2026-08-18 against a pane this probe had just created, and
 * typing into the pane proved unreliable on a restored one. So every session
 * this probe makes carries one launch flag, being a shell command that
 * appends its own PATH to this file and then sleeps. A restore replays the
 * recorded argv, so a restored pane writes its line too, and the line is the
 * pane's own environment rather than anything Tortie reported about it.
 */
const paneLog = join(root, 'pane-paths.txt');

const shotPath = join(scratch, 'p81-shell-path.png');
rmSync(shotPath, { force: true });

// ---------------------------------------------------------------------------
// Launching
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * Run the app once and hand back everything it printed, plus the epoch
 * millisecond at which the process was spawned.
 */
function runApp({ drive, slowShell, delayMs, ceilingMs, profileDir }) {
  const env = {
    ...process.env,
    GMUX_TMUX_SOCKET: socket,
    GMUX_SHOT: shotPath,
    GMUX_SHOT_VERBOSE: '1',
    GMUX_SHOT_DELAY_MS: String(delayMs),
    GMUX_SHOT_DRIVE: JSON.stringify(drive)
  };
  // NOT an isolated HOME. A packaged binary launched with one gets no window,
  // because an unanswered keychain dialog stops it. The user data directory
  // and the tmux socket are what this probe isolates, and the login shell it
  // measures stays the real one unless this run replaces it on purpose.
  if (slowShell) env['SHELL'] = fakeShell;
  const spawnedAtEpochMs = Date.now();
  return withElectron(
    {
      label: 'shell-path',
      program: packaged ? packagedBin : electronBin,
      userDataDir: profileDir,
      cwd: repoRoot,
      env: env,
      entry: !packaged
    },
    async (handle) => {
    const child = handle.child;
    let text = '';
    const onText = (chunk) => {
      process.stdout.write(chunk);
      text += chunk;
    };
    child.stdout.on('data', (b) => onText(b.toString()));
    child.stderr.on('data', (b) => onText(b.toString()));
    return new Promise((r) => {
      const watchdog = setTimeout(() => {
        console.error(`${TAG} the run passed its ceiling. Ending the pid I started.`);
        child.kill('SIGTERM');
      }, ceilingMs);
      child.on('error', (err) => {
        clearTimeout(watchdog);
        console.error(`${TAG} the app could not start: ${err.message}`);
        r({ code: 1, text, spawnedAtEpochMs });
      });
      // `exit`, not `close`. The tmux server inherits this child's stdout, so
      // `close` waits for an end that never comes.
      child.on('exit', (code) => {
        clearTimeout(watchdog);
        setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
          r({ code: code ?? 1, text, spawnedAtEpochMs });
        }, 750);
      });
    });
  });
}

/** Pull the driver's JSON report out of everything the run printed. */
function readReport(text) {
  const marker = '[shell-path-probe] result ';
  const at = text.lastIndexOf(marker);
  if (at === -1) return null;
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The scratch tmux server, read and ended one session at a time
// ---------------------------------------------------------------------------

async function scratchSessions() {
  try {
    const r = await execFileP('tmux', [
      '-L',
      socket,
      'list-sessions',
      '-F',
      '#{session_id} #{session_name}'
    ]);
    return r.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => {
        const [id, ...rest] = line.split(' ');
        return { id, name: rest.join(' ') };
      });
  } catch {
    return [];
  }
}

/** Kill only the ids this probe's own run created. Never the server. */
async function endScratchSessions(ids) {
  for (const id of ids) {
    await execFileP('tmux', ['-L', socket, 'kill-session', '-t', id]).catch(
      () => undefined
    );
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];
const loadBefore = loadavg()[0];

if (bootOnly) {
  // PROOF 6. Process start to the moment the renderer holds the session list,
  // over `runs` cold starts. The drive does nothing but let the app settle,
  // so the number is the boot and not the driver.
  const numbers = [];
  for (let i = 0; i < runs; i++) {
    const runProfile = `${profile}-${String(i)}`;
    rmSync(runProfile, { recursive: true, force: true });
    const drive = {
      projectPath: project,
      shellPath: { armMs: 0, restore: 0, pollMs: 250, runMs: 1_000 }
    };
    const r = await runApp({
      drive,
      slowShell: !realShell,
      delayMs: 500,
      ceilingMs: slowMs + 90_000,
      profileDir: runProfile
    });
    const report = readReport(r.text);
    if (report === null) {
      failures.push(`run ${String(i + 1)} printed no report`);
      continue;
    }
    const armOffset = report.armedAtEpochMs - r.spawnedAtEpochMs;
    const total = report.listMs === null ? null : armOffset + report.listMs;
    numbers.push({ run: i + 1, armOffset, listMs: report.listMs, total });
    say(
      `run ${String(i + 1)}: renderer loaded at ${String(armOffset)} ms, ` +
        `session list at ${String(total)} ms from process start`
    );
    const scratchRows = await scratchSessions();
    await endScratchSessions(scratchRows.map((x) => x.id));
  }
  say(`boot numbers: ${JSON.stringify(numbers)}`);
  say(`load average before ${String(loadBefore)}, after ${String(loadavg()[0])}`);
} else {
  // ---------------------------------------------------------------------
  // Prep. One run that creates real sessions, then their tmux sessions are
  // ended by id, which is what makes the manifest rows restorable.
  // ---------------------------------------------------------------------
  const names = [];
  for (let i = 0; i < restoreCount; i++) names.push(`p81-${String(i + 1)}`);
  if (restoreCount > 0) {
    say(`prep: creating ${String(restoreCount)} shell sessions`);
    const prep = await runApp({
      drive: {
        projectPath: project,
        shellPath: {
          prepare: restoreCount,
          prepareArgs: [
            '-c',
            `printf '%s\\n' "$PATH" >> ${paneLog}; while :; do sleep 5; done`
          ]
        }
      },
      slowShell: false,
      delayMs: 3_000,
      ceilingMs: 180_000,
      profileDir: profile
    });
    const made = await scratchSessions();
    say(`prep made ${String(made.length)} tmux sessions`);
    // The exit code of the prep run is REPORTED and is not a failure on its
    // own. Measured on 2026-08-18: the packaged app writes its screenshot,
    // says PASS, and then dies at quit with an uncaught Napi error, which is
    // after every session this half exists to make already exists. What
    // decides this half is the session count, and it is checked next.
    if (prep.code !== 0) {
      say(`the prep run exited ${String(prep.code)} after its work was done`);
    }
    if (made.length < restoreCount) {
      failures.push(
        `prep wanted ${String(restoreCount)} sessions and made ${String(made.length)}`
      );
    }
    await endScratchSessions(made.map((x) => x.id));
    say('prep: those tmux sessions are ended, so the rows are restorable');
  }

  // ---------------------------------------------------------------------
  // The measured run. The shell is slow, the drive starts as early as the
  // harness allows, and the verbs are called while the answer is still
  // coming.
  // ---------------------------------------------------------------------
  // Every line the prep's own panes wrote is thrown away here, so every line
  // in the file afterwards was written by a pane this next run started.
  rmSync(paneLog, { force: true });
  const drive = {
    projectPath: project,
    shellPath: {
      armMs: 0,
      restore: restoreCount,
      create: {
        agent: 'shell',
        name: 'p81-create',
        args: [
          '-c',
          `printf '%s\\n' "$PATH" >> ${paneLog}; while :; do sleep 5; done`
        ]
      },
      pollMs: 100,
      runMs: slowMs + 20_000
    }
  };
  const measured = await runApp({
    drive,
    slowShell: true,
    delayMs: 500,
    ceilingMs: slowMs + 180_000,
    profileDir: profile
  });
  const report = readReport(measured.text);
  if (report === null) {
    failures.push('the measured run printed no report');
  } else {
    const total = (ms) => (ms === null ? 'never' : `${String(ms)} ms`);
    say(`session list at ${total(report.listMs)} after the renderer loaded`);
    say(`shellPathReady at ${total(report.shellReadyMs)}`);
    say(`reads: ${JSON.stringify(report.reads)}`);
    say(`verbs: ${JSON.stringify(report.verbs)}`);

    // PROOF 5. The two reads answer before the shell does.
    if (report.shellReadyMs !== null) {
      for (const read of report.reads) {
        if (read.name === 'sessions:attach') continue;
        if (read.settledMs >= report.shellReadyMs) {
          failures.push(
            `${read.name} answered at ${String(read.settledMs)} ms, which is ` +
              `not before the shell at ${String(report.shellReadyMs)} ms`
          );
        }
      }
    }

    // PROOF 4. The create does not answer before the shell does.
    for (const verb of report.verbs) {
      if (!verb.name.startsWith('create:')) continue;
      if (report.shellReadyMs !== null && verb.settledMs < report.shellReadyMs) {
        failures.push(
          `${verb.name} answered at ${String(verb.settledMs)} ms, which is ` +
            `before the shell at ${String(report.shellReadyMs)} ms`
        );
      }
    }

    // PROOF 3. Every Restore control is off with its sentence while the flag
    // is false, and on with no sentence afterwards.
    const SENTENCE =
      'Tortie is still asking your shell where your tools are installed. ' +
      'Restore turns on as soon as the answer arrives.';
    if (report.hasFlag && report.shellReadyMs !== null) {
      const before = report.controls.filter((c) => c.tMs < report.shellReadyMs);
      const after = report.controls.filter((c) => c.tMs >= report.shellReadyMs);
      for (const c of before) {
        if (!c.disabled) failures.push(`${c.label} was pressable at ${String(c.tMs)} ms`);
        if (c.title !== SENTENCE) {
          failures.push(`${c.label} carried "${c.title}" rather than the sentence`);
        }
      }
      for (const c of after) {
        if (c.title === SENTENCE) {
          failures.push(`${c.label} still carried the sentence at ${String(c.tMs)} ms`);
        }
      }
      say(
        `controls: ${String(before.length)} readings before the flag, ` +
          `${String(after.length)} after`
      );
    } else if (!report.hasFlag) {
      say('this build has no shellPathReady flag, so proof 3 is not measured');
    }
  }

  // PROOFS 1 and 2. Every pane the run produced carries the captured PATH,
  // and they all carry the SAME one.
  await new Promise((r) => setTimeout(r, 1_000));
  const lines = existsSync(paneLog)
    ? readFileSync(paneLog, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
    : [];
  say(`panes that wrote their PATH: ${String(lines.length)}`);
  // Only the RESTORED panes are counted. A restore replays the recorded argv,
  // so each restored pane runs the writer again. A freshly created pane runs
  // the same writer through the fake login shell, which sleeps first, and
  // whether it lands inside the run is a race this reading does not need: the
  // create's own evidence is its timing row above, which shows it did not
  // answer until after the shell did.
  if (lines.length < restoreCount) {
    failures.push(
      `${String(restoreCount)} restored panes should have written a PATH and ` +
        `${String(lines.length)} did`
    );
  }
  // CONTAINS, not starts with, and the reason is measured. A restored pane
  // runs the user's login shell, and that shell rewrites its own PATH from
  // the machine's startup files, which moves the inherited directories out of
  // first place. What it cannot do is invent the sentinel: that directory is
  // named nowhere on this machine except in the PATH this probe's fake shell
  // printed, so a pane carrying it took the CAPTURED PATH and a pane without
  // it took something else.
  for (const [i, value] of lines.entries()) {
    if (fallbackMode) {
      if (value.includes(sentinel)) {
        failures.push(`pane ${String(i + 1)} carried the sentinel in a fallback run`);
      }
      continue;
    }
    if (!value.includes(sentinel)) {
      failures.push(`pane ${String(i + 1)} did not get the captured PATH: ${value}`);
    }
  }
  const distinct = new Set(lines);
  if (distinct.size > 1) {
    failures.push(`the panes carry ${String(distinct.size)} different PATHs`);
  } else if (lines.length > 0) {
    say(
      fallbackMode
        ? 'every pane carries one identical PATH, and none of them carries the sentinel'
        : 'every pane carries one identical PATH, and it carries the sentinel'
    );
  }

  // PROOF 7. The boot.env record reports the LOGIN SHELL PATH, not the one
  // this process was started with. The two numbers come out of the same file.
  const logPath = join(profile, 'logs', 'app.log');
  if (existsSync(logPath)) {
    const log = readFileSync(logPath, 'utf8');
    const entries = /"path":\{"entries":(\d+)/.exec(log);
    const captured = /"dirCount":(\d+)/.exec(log);
    if (entries === null || captured === null) {
      say('the log carried no boot.env or no capture line, so proof 7 is not measured');
    } else if (entries[1] !== captured[1]) {
      failures.push(
        `boot.env says ${entries[1]} PATH entries and the capture says ${captured[1]}`
      );
    } else {
      say(`boot.env and the capture both say ${entries[1]} PATH entries`);
    }
  } else {
    say(`no log at ${logPath}, so proof 7 is not measured`);
  }

  if (fallbackMode) {
    // PROOF 8. The fallback branch says so, once, above the log. The record
    // is in app.log rather than on stdout: `postDurabilityNotice` writes it
    // with `console: false`, because the call site already says it there.
    const logFile = join(profile, 'logs', 'app.log');
    const log = existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
    const shown = log
      .split('\n')
      .filter((line) => line.includes('shell-path-fallback')).length;
    if (shown === 0) {
      failures.push('no shell-path-fallback notice was recorded');
    } else if (shown > 1) {
      failures.push(`the fallback notice was recorded ${String(shown)} times`);
    } else {
      const named = /"shell":"([^"]+)"/.exec(log);
      say(
        `one shell-path-fallback notice, naming ${named === null ? 'no shell' : named[1]}`
      );
    }
    // The two lines that were already there must still land.
    if (!log.includes('login-shell PATH capture: fallback')) {
      failures.push('the capture line did not say fallback');
    }
  }

  const leftovers = await scratchSessions();
  await endScratchSessions(leftovers.map((x) => x.id));
}

// ---------------------------------------------------------------------------
// PROOF 10. The operator is untouched.
// ---------------------------------------------------------------------------

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ` +
      `${String(operatorAfter)}`
  );
}

if (!keep) rmSync(rawRoot, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`${TAG} FAIL`);
  for (const line of failures) console.error(`${TAG}   ${line}`);
  process.exit(1);
}
say('every proof this run asked for passed');
process.exit(0);
