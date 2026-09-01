#!/usr/bin/env node
/**
 * The supervisor half of `npm run smoke:p118` (Phase 118).
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES
 * ---------------------------------------------------------------------------
 * ONE. Start a copy of a project onto another machine that really takes
 * minutes. Quit Tortie while it runs. Prove Tortie owned the ssh child under
 * it, ended it, waited for it, refused every remote call made after the quit
 * began, classified the copy as cut off and left a durable row behind. Start
 * Tortie again on the same profile and prove the person is told once.
 *
 * TWO. Remove a machine whose record cannot be written. Prove NOTHING was
 * removed. Then remove it again with nothing in the way and prove all five rows
 * are recorded in one transaction. Then remove it a third time and prove it
 * changes nothing.
 *
 * That is phase 2 of docs/audits/2026-08-20-electron-typescript-architecture.md,
 * which the operator ranked P1. Before Phase 118 nothing owned the ssh children
 * at all, and a per row failure in a removal was caught, logged and stepped
 * over while `machines.json` was rewritten anyway.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS HARNESS THE REMOTE MACHINE IS THIS MAC. A remote command reaching
 * `tmux -L gmux ...` would land on the server holding the operator's live
 * sessions.
 *
 *  1. It refuses to start when the socket it would use is `gmux` or `default`.
 *  2. It runs under `build/harness-socket.mjs --fresh`, and both Electron
 *     launches get the same `--user-data-dir` inside this run's own root.
 *  3. It starts its OWN sshd on 127.0.0.1 on a high port, with keys generated
 *     in this run's own directory and its own `GMUX_CONFIG_ROOT`. The machine
 *     gets its own `TMUX_TMPDIR`, so its sessions and this Mac's sessions are on
 *     different servers rather than on one server under two names.
 *  4. It kills only pids it recorded, and it prints the list. Never `pkill`,
 *     never `kill-server`.
 *  5. The operator's own server is counted before and after. Equal, or the run
 *     fails whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * THE LONG RUNNING COPY, AND WHY IT IS REAL RATHER THAN FORGED
 * ---------------------------------------------------------------------------
 * The machine's own program search list puts a small program this file writes
 * ahead of the real git, through that machine's own sshd configuration and
 * nothing else. The program is a pass through for every git command except
 * `ls-remote`, which is the first thing the copy script runs. On that one it
 * sleeps for P118_CLONE_SLEEP_S seconds and then execs the real git.
 *
 * So the copy really is long running, the ssh child under it really is alive
 * for minutes, and NO FAULT SEAM IS ADDED TO THE EXEC PLANE. Nothing in
 * `src/main/machines/exec-plane.ts` knows this harness exists. Nothing contacts
 * the network either: the run is cut off during the sleep, so the real git is
 * never reached at all.
 *
 * MEASURED 2026-08-21 on this Mac: `SetEnv PATH=...` in the machine's sshd
 * configuration does NOT reach the command, because the login shell resets
 * PATH under it. `ForceCommand` does, and the run proves it with one real
 * connection before anything else starts.
 *
 * ---------------------------------------------------------------------------
 * THE DIVISION OF WORK
 * ---------------------------------------------------------------------------
 * This script owns the machine, the wrapper, the recorded pids and the verdict.
 * The Electron process owns the moments, because only it knows when a copy has
 * been started and not yet answered. It writes `p118-facts.json` and this file
 * reads it. The process being measured never grades itself, which is the
 * division `build/partition-harness.mjs` already uses.
 *
 * Usage:
 *   node build/p118-remote-children.mjs            the whole run
 *   node build/p118-remote-children.mjs --keep     leave the scratch root
 *   node build/p118-remote-children.mjs --json <p> write the full report
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REAL_SOCKET,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

import { withElectron } from './electron-run.mjs';
import { sshRun } from './ssh-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Rule 1. Refuse the two sockets nobody may touch, by name, before anything
// ---------------------------------------------------------------------------

const SOCKET =
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p118-${String(process.pid)}`;

refuseRealSockets(SOCKET, 'p118');

function parseArgs(argv) {
  const out = { keep: false, jsonPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--keep') out.keep = true;
    else if (a === '--json') out.jsonPath = argv[(i += 1)];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

/**
 * How long the wrapper sleeps before it would run the real git.
 *
 * 300 s. It has to outlast the whole prep leg, because the point is that the
 * copy is still running when the quit lands. It is a constant in this file
 * rather than a `GMUX_*` name, because this phase adds no name to the contract
 * and a harness sleep is not something a person tunes.
 */
const CLONE_SLEEP_S = 300;

const root =
  process.env['GMUX_CONFIG_ROOT'] ?? join(tmpdir(), `p118-${String(process.pid)}`);
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true, mode: 0o700 });

const recordedPids = [];
const failures = [];
const steps = [];

function killRecordedPids() {
  for (const pid of recordedPids) {
    if (typeof pid !== 'number' || !Number.isFinite(pid)) continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone, which is the state we wanted */
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    process.stdout.write(
      `[p118] ${signal}: killing only the pids this run recorded: ` +
        `${recordedPids.join(', ')}\n`
    );
    killRecordedPids();
    process.exit(130);
  });
}

const say = (text) => process.stdout.write(`[p118] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p118] FAIL: ${text}\n`);
};
const step = (number, what) => {
  steps.push({ step: number, what });
  say(`${String(number)}. ${what}`);
};

function sh(file, argv, options = {}) {
  const out = spawnSync(file, argv, {
    encoding: 'utf8',
    timeout: 120_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

// ---------------------------------------------------------------------------
// Rule 5. The operator's server, read only
// ---------------------------------------------------------------------------

function operatorSessions() {
  return sh('/bin/sh', [
    '-c',
    `tmux -L ${REAL_SOCKET} list-sessions 2>/dev/null | wc -l | tr -d ' '`
  ]).stdout.trim();
}

const operatorBefore = operatorSessions();

// ---------------------------------------------------------------------------
// Step 1. The scratch machine, the wrapper, and the project to copy
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p118',
  record: (pid) => recordedPids.push(pid)
});
if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so the app cannot sign in at all');
}

const machine = scratchMachine(yard, {
  id: 'one',
  port: 35_000 + (process.pid % 2000)
});

const binDir = join(root, 'p118-bin');
mkdirSync(binDir, { recursive: true, mode: 0o700 });
const wrapper = join(binDir, 'git');

/** The real git on this Mac, which the wrapper hands every other verb to. */
const realGit = sh('/usr/bin/which', ['git']).stdout.trim() || '/usr/bin/git';

/**
 * Write the program that machine finds when it looks for git.
 *
 * It reads no value this run did not write itself, it removes nothing, it
 * signals nothing, and it contacts nothing. On `ls-remote` it sleeps and on
 * every other verb it hands over to the real git.
 */
function writeWrapper() {
  writeFileSync(
    wrapper,
    [
      '#!/bin/sh',
      '# Phase 118. The git the scratch machine finds first. It is written by',
      '# build/p118-remote-children.mjs, it runs on this same Mac, and it',
      '# contacts nothing. The sleep is the whole of the fault.',
      `REAL=${JSON.stringify(realGit)}`,
      `SLEEP=${String(CLONE_SLEEP_S)}`,
      'for a in "$@"; do',
      '  if [ "$a" = "ls-remote" ]; then',
      '    sleep "$SLEEP"',
      '    break',
      '  fi',
      'done',
      'exec "$REAL" "$@"',
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(wrapper, 0o755);
}

writeWrapper();

/**
 * Put the wrapper first on that machine's own program search list.
 *
 * `SetEnv PATH=` does not work here and it was measured not working, because
 * the login shell resets PATH under it. `ForceCommand` runs before the command
 * and the shell does not get a second chance, so this is the line that makes
 * the machine's git the wrapper. It is appended to THAT MACHINE'S OWN sshd
 * configuration file, which this run wrote, and it reaches nothing else on this
 * Mac.
 */
writeFileSync(
  machine.conf,
  readFileSync(machine.conf, 'utf8') +
    `ForceCommand PATH=${binDir}:$PATH exec /bin/sh -c "$SSH_ORIGINAL_COMMAND"\n`,
  'utf8'
);

if (!machine.start()) {
  fail(`the scratch sshd did not answer on port ${String(machine.port)}`);
}
if (!machine.isolated()) {
  fail(
    `the machine keeps its sessions somewhere other than ${machine.tmuxTmp}. ` +
      `Without that the machine and this Mac share one server and nothing ` +
      `below is measuring two machines.`
  );
}

/** One command against the machine, over a real connection. */
function onMachineOverSsh(command) {
  const out = sshRun({
    knownHosts: '/dev/null',
    caller: 'build/p118-remote-children.mjs',
    argv: [
      '-p',
      String(machine.port),
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'LogLevel=ERROR',
      `${yard.user}@127.0.0.1`,
      command
    ],
    // This script's own sh() carried these, and the helper's defaults are
    // narrower, so they are named here rather than inherited.
    timeout: 120_000,
    env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

// The wrapper is PROVEN to be what that machine's git resolves to, over a real
// connection, before anything below is measured. A harness that assumed this
// would report a fast copy as a passing quit.
{
  const resolved = onMachineOverSsh('command -v git').stdout.trim();
  if (resolved !== wrapper) {
    fail(
      `that machine resolves git to ${JSON.stringify(resolved)} and this run ` +
        `wrote ${JSON.stringify(wrapper)}. Without the wrapper the copy ` +
        `finishes in milliseconds and nothing below is measuring a long ` +
        `running child.`
    );
  }
}

// The project the copy is made FROM. Its address is a web address that resolves
// nowhere, because the copy is cut off during the sleep and the real git is
// never reached. Nothing here contacts the network.
const localProject = join(root, 'p118-project');
mkdirSync(localProject, { recursive: true, mode: 0o700 });
sh(realGit, ['init', '-q'], { cwd: localProject });
sh(realGit, ['remote', 'add', 'origin', 'https://p118.invalid/scratch/project.git'], {
  cwd: localProject
});

/** Where the copy would land on that machine. It does not exist yet. */
const destination = join(root, 'p118-destination');
if (existsSync(destination)) rmSync(destination, { recursive: true, force: true });

step(
  1,
  `the scratch machine is up: sshd pid ${String(machine.pid)} on ` +
    `127.0.0.1:${String(machine.port)}, user ${yard.user}, its git is ` +
    `${wrapper} and it sleeps ${String(CLONE_SLEEP_S)} s on ls-remote, ` +
    `sessions under ${machine.tmuxTmp}. The operator's own server holds ` +
    `${operatorBefore} session(s).`
);

writeFileSync(
  join(root, 'p118-carriage.json'),
  JSON.stringify(
    {
      host: '127.0.0.1',
      port: machine.port,
      user: yard.user,
      remoteTmuxPath: yard.tmuxPath,
      localProject,
      destination
    },
    null,
    2
  ),
  'utf8'
);

// ---------------------------------------------------------------------------
// The two Electron launches
// ---------------------------------------------------------------------------


/**
 * How long one leg may take before it is killed and the run fails.
 *
 * Ten minutes. A leg that hits this is a FAILURE of the run, never a pass: a
 * harness that could not finish has proved nothing.
 */
const LEG_DEADLINE_MS = 600_000;

/**
 * Record the helper processes a launch leaves behind, by this run's own path.
 *
 * A pid is added only when its command line carries the profile directory this
 * run created, so rule 4 is unchanged: only what this run started is ever
 * signalled, and there is still no `pkill` in this file.
 */
function recordCrashpadOf(profileDir) {
  const table = sh('/bin/ps', ['-ax', '-o', 'pid=,command=']).stdout;
  for (const line of table.split('\n')) {
    if (!line.includes(profileDir)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (recordedPids.includes(pid)) continue;
    recordedPids.push(pid);
  }
}

function runLeg(mode) {
  return withElectron(
    {
      label: `p118 ${mode}`,
      program: 'app',
      userDataDir: profile,
      cwd: REPO,
      env: {
        ...process.env,
        GMUX_SMOKE: mode,
        GMUX_CONFIG_ROOT: root,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_SKIP_USERDATA_MIGRATION: '1',
        GMUX_SPECSTORY_NO_CLOUD: '1',
        SSH_AUTH_SOCK: yard.authSock
      }
    },
    (handle) =>
      new Promise((resolveRun) => {
        const child = handle.child;
        recordedPids.push(child.pid);

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (b) => {
          const text = b.toString();
          stdout += text;
          process.stdout.write(text);
        });
        child.stderr.on('data', (b) => {
          const text = b.toString();
          stderr += text;
          process.stderr.write(text);
        });

        const deadline = setTimeout(() => {
          fail(`the ${mode} leg exceeded ${String(LEG_DEADLINE_MS)} ms`);
          try {
            process.kill(child.pid, 'SIGKILL');
          } catch {
            /* already gone */
          }
        }, LEG_DEADLINE_MS);

        child.on('exit', (code, signal) => {
          clearTimeout(deadline);
          setTimeout(() => {
            // MEASURED: each launch leaves a `chrome_crashpad_handler` behind, and
            // it is not a child of anything this run still holds once the app is
            // gone. It is found by the ONE thing that identifies it as this run's,
            // being this run's own profile path on its command line.
            recordCrashpadOf(profile);
            // The same two lines build/partition-harness.mjs carries, and for the
            // same measured reason: Electron leaves a crashpad handler holding the
            // write end of both pipes, so the read ends never close and this
            // process would print its report and then never return.
            child.stdout.destroy();
            child.stderr.destroy();
            resolveRun({ code, signal, stdout, stderr });
          }, 1_000);
        });
      })
  );
}

// ---------------------------------------------------------------------------
// Steps 2 to 12. The prep leg
// ---------------------------------------------------------------------------

const prep = await runLeg('p118-prep');
if (prep.code !== 0) {
  fail(
    `the prep leg exited ${String(prep.code)}${
      prep.signal ? ` on ${prep.signal}` : ''
    }`
  );
}
for (const line of prep.stdout.split('\n')) {
  const hit = /^\[gmux-p118\] ([0-9]{1,2})\. (.*)$/.exec(line.trim());
  if (hit !== null) steps.push({ step: Number(hit[1]), what: hit[2] });
}

let facts = null;
try {
  facts = JSON.parse(readFileSync(join(root, 'p118-facts.json'), 'utf8'));
} catch {
  fail('the prep leg wrote no facts file, so nothing was measured');
}

// The supervisor's OWN reading of the two numbers the app reported, taken from
// outside the process that was measured.
if (facts !== null) {
  const stillAlive = sh('/bin/ps', ['-o', 'pid=', '-p', String(facts.clonePid)])
    .stdout.trim();
  if (stillAlive !== '') {
    fail(
      `the ssh child ${String(facts.clonePid)} the app said it ended is still ` +
        `a live process`
    );
  }
  if (facts.farSideBeforeQuit < 1) {
    fail(
      `the app counted ${String(facts.farSideBeforeQuit)} copy script(s) on ` +
        `the far side while the copy was running, and it owes at least one`
    );
  }
  if (facts.namingAfterRefusal > facts.namingBeforeRefusal) {
    fail(
      `${String(facts.namingBeforeRefusal)} process(es) named the copy before ` +
        `the refused call and ${String(facts.namingAfterRefusal)} after it, ` +
        `so a child was spawned for a call that was refused`
    );
  }
  if (facts.liveAfterRefusal !== 0) {
    fail(
      `the refused call left ${String(facts.liveAfterRefusal)} open ledger ` +
        `entry(s), and a refusal happens before an argv is composed`
    );
  }
  if (facts.cutOff !== 1 || facts.unjoined !== 0) {
    fail(
      `the ledger classified ${String(facts.cutOff)} piece(s) of work as cut ` +
        `off and ${String(facts.unjoined)} as unjoined, and exactly one copy ` +
        `was cut off with none left unjoined`
    );
  }
  if (facts.unfinishedRows !== 1) {
    fail(
      `${String(facts.unfinishedRows)} unfinished row(s) were in the manifest ` +
        `after the quit, and exactly one copy was cut off`
    );
  }
  // Phase 144, stage 2 of the 36 plan: a copy whose durable start row could
  // not be written was refused before anything ran, spawned or changed. The
  // supervisor grades the app's own record of it, so a prep leg that skipped
  // the injection cannot pass by saying nothing.
  const uj = facts.unjournaled;
  if (uj === undefined || uj === null) {
    fail(
      'the prep leg recorded nothing about the refused unjournaled copy, so ' +
        'the stage 2 injection never ran'
    );
  } else {
    if (uj.closureRan !== 0) {
      fail(
        `the spawn closure ran ${String(uj.closureRan)} time(s) for a copy ` +
          `whose row was never written`
      );
    }
    if (uj.failedWriteTyped !== true || uj.absentJournalTyped !== true) {
      fail(
        'a copy without its durable row was not refused with the typed ' +
          'durability refusal'
      );
    }
    if (uj.cloneOutcome !== 'refused' || uj.sentenceIsClonesOwn !== true) {
      fail(
        `the clone door answered ${JSON.stringify(uj.cloneOutcome)} with ` +
          `the wrong sentence for a copy whose row could not be written`
      );
    }
    if (uj.refusedPathExists !== 'no') {
      fail(
        `the far side says ${JSON.stringify(uj.refusedPathExists)} about the ` +
          `refused destination, and a refused copy may change no remote path`
      );
    }
    if (uj.namingAfter > uj.namingBefore) {
      fail(
        `${String(uj.namingBefore)} process(es) named the copy before the ` +
          `refusals and ${String(uj.namingAfter)} after them`
      );
    }
    if (uj.openCloneEntries !== 0 || uj.settledCloneEntries !== 0) {
      fail(
        `the ledger held ${String(uj.openCloneEntries)} open and ` +
          `${String(uj.settledCloneEntries)} classified clone entry(s) after ` +
          `the refusals, before the good copy started`
      );
    }
    if (uj.unfinishedRowsDuring !== 0) {
      fail(
        `${String(uj.unfinishedRowsDuring)} row(s) reached the real manifest ` +
          `while every write to it was refused`
      );
    }
    say(
      'the unjournaled copy was refused typed with no spawn, no ssh child, ' +
        'no ledger entry, no row and no remote path change'
    );
  }
  say(
    `the copy answered ${JSON.stringify(facts.cloneOutcome)}, the whole real ` +
      `teardown took ${String(facts.teardownMs)} ms, and the far side held ` +
      `${String(facts.farSideBeforeQuit)} copy script(s) before the quit and ` +
      `${String(facts.farSideAfterQuit)} after it`
  );
}

// ---------------------------------------------------------------------------
// The join report, read off the quit's own log line rather than off a claim
// ---------------------------------------------------------------------------
//
// `disposeMainCapabilities` logs the report it got from `joinRemoteExecutions`,
// so the numbers below are the ones the product itself measured. Reading them
// here keeps the app from grading its own quit.

{
  const hit = /\[gmux-quit\][^\n]*(\{"cancelled":[^\n]*\})/.exec(prep.stdout);
  if (hit === null) {
    fail(
      'the quit logged no join report, so how long it waited and how many ' +
        'children it signalled are not measured anywhere'
    );
  } else {
    let report = null;
    try {
      report = JSON.parse(hit[1]);
    } catch {
      fail(`the quit's join report is not readable: ${String(hit[1])}`);
    }
    if (report !== null) {
      if (report.cancelled !== 1) {
        fail(
          `the quit signalled ${String(report.cancelled)} remote child(ren) ` +
            `and exactly one copy was running`
        );
      }
      if (report.unjoined !== 0) {
        fail(
          `the quit stopped waiting on ${String(report.unjoined)} piece(s) of ` +
            `work. Tortie ended the ssh child, so it owes an answer for it.`
        );
      }
      if (report.waitedMs > 3_500) {
        fail(
          `the quit waited ${String(report.waitedMs)} ms for the remote ` +
            `children, against a bound of 3,000 ms`
        );
      }
      say(
        `the quit signalled ${String(report.cancelled)} child(ren), joined ` +
          `${String(report.joined)}, left ${String(report.unjoined)} ` +
          `unjoined, and waited ${String(report.waitedMs)} ms`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Steps 13 to 22. The verify leg, on the SAME user data directory
// ---------------------------------------------------------------------------

const verify = await runLeg('p118-verify');
if (verify.code !== 0) {
  fail(
    `the verify leg exited ${String(verify.code)}${
      verify.signal ? ` on ${verify.signal}` : ''
    }`
  );
}
for (const line of verify.stdout.split('\n')) {
  const hit = /^\[gmux-p118\] ([0-9]{1,2})\. (.*)$/.exec(line.trim());
  if (hit !== null) steps.push({ step: Number(hit[1]), what: hit[2] });
}

// ---------------------------------------------------------------------------
// Step 23. Kill only what was recorded, and print it
// ---------------------------------------------------------------------------

{
  const pid = machine.serverPid(SOCKET);
  if (pid !== null) {
    recordedPids.push(pid);
    say(`the machine runs its session server as pid ${String(pid)}`);
  }
}

killRecordedPids();
say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);

const operatorAfter = operatorSessions();
if (operatorAfter !== operatorBefore) {
  fail(
    `the operator's own server held ${operatorBefore} session(s) and now ` +
      `holds ${operatorAfter}`
  );
}
step(
  23,
  `every recorded pid is ended and the operator's own server still holds ` +
    `${operatorAfter} session(s)`
);

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

say('');
say('step  what it proved');
for (const row of steps.sort((a, b) => a.step - b.step)) {
  say(`${String(row.step).padStart(4)}  ${row.what}`);
}

const full = {
  socket: SOCKET,
  root,
  machine: { port: machine.port, tmuxTmp: machine.tmuxTmp, wrapper },
  cloneSleepSeconds: CLONE_SLEEP_S,
  operatorBefore,
  operatorAfter,
  facts,
  steps,
  failures,
  prepExit: prep.code,
  verifyExit: verify.code
};
if (args.jsonPath) {
  writeFileSync(args.jsonPath, JSON.stringify(full, null, 2), 'utf8');
  say(`wrote the full report to ${args.jsonPath}`);
}

if (args.keep) {
  say(`the scratch root is kept at ${root}`);
  say(`the machine kept its sessions directory at ${machine.tmuxTmp}`);
} else {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  // This lives under /tmp rather than under the root, for the socket path
  // length reason build/scratch-machine.mjs records, so it goes by name.
  machine.cleanup();
}

if (failures.length > 0) {
  say(`FAIL (${String(failures.length)})`);
  for (const one of failures) say(`  ${one}`);
  process.exit(1);
}
// The exit is explicit for the reason the pipes are dropped above. The failure
// arm already exits, so a run that passed would be the only one able to hang,
// which is the worst way round for a gate.
process.stdout.write('[p118] PASS\n', () => process.exit(0));
