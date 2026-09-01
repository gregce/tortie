/**
 * probe-p193-known-hosts.mjs. The reproduction, run rather than read
 * (Phase 193).
 *
 * ## What it proves, and why it is shaped this way
 *
 * The backlog said to find the defect by running the machine touching probes
 * with `HOME` pointed at a scratch directory and comparing that scratch
 * `known_hosts`. THAT METHOD CANNOT WORK ON THIS MACHINE AND IT IS NOT SAFE.
 * macOS OpenSSH expands `~` from getpwuid, not from `$HOME`, measured with
 * `ssh -G`, which resolves options and connects to nothing: the real HOME and a
 * redirected one both resolve `userknownhostsfile` to the person's own file. A
 * scratch `known_hosts` would have stayed 0 bytes forever and been read as
 * proof while every write still landed in the real file.
 *
 * So this probe measures a CATCH FILE instead. Every leg names a record file
 * under this run's own scratch directory, and the growth of that file is, byte
 * for byte, what an unscoped run would have put in the person's own.
 *
 * The four legs:
 *
 *  1. THE MECHANISM IS LIVE. One connection with `StrictHostKeyChecking=accept-new`
 *     naming this run's own catch file. It must GROW. Without this leg the three
 *     below could all pass on a machine where ssh records nothing at all, and
 *     the run would prove nothing.
 *  2. FAIL CLOSED. `sshRun` called with no record file at all. It must THROW
 *     before anything is spawned, and the catch file must not move. This is the
 *     property eighteen hand written call sites could never have.
 *  3. THE SCOPED RUN. `sshRun` with this run's own record file. It connects, and
 *     only that file grows.
 *  4. THE ORDER. `productKnownHosts` with a stand-in second file. Only the FIRST
 *     file grows and the second stays empty, which is the fact the product's own
 *     two file form rests on.
 *
 * ## Safety
 *
 * The person's `~/.ssh/known_hosts` is read for its size and its sha256 at the
 * start and at the end and NOTHING ELSE. Nothing under `~/.ssh` is written,
 * copied, moved or removed. Every sshd, ssh agent and file this probe makes is
 * its own, under one scratch directory, and all of it ends in a `finally` block
 * whatever happened. It contacts 127.0.0.1 and nothing else. It launches no
 * Electron and starts no tmux server.
 *
 * Run it with `npm run probe:p193`. About 10 seconds.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { scratchMachine, scratchYard } from './scratch-machine.mjs';
import { productKnownHosts, sshRun } from './ssh-run.mjs';

const CALLER = 'build/probe-p193-known-hosts.mjs';
const root = join('/private/tmp', `p193-known-hosts-${String(process.pid)}`);
const rows = [];
const failures = [];
const say = (text) => process.stdout.write(`[p193] ${text}\n`);
const step = (n, what, evidence) => {
  rows.push({ n, what, evidence });
  say(`${String(n)}. ${what}: ${evidence}`);
};
const fail = (text) => {
  failures.push(text);
  say(`FAIL: ${text}`);
};

/** The person's own file, read for its size and its digest and nothing else. */
const PERSON = join(homedir(), '.ssh', 'known_hosts');
function personReading() {
  try {
    return {
      bytes: statSync(PERSON).size,
      sha256: createHash('sha256').update(readFileSync(PERSON)).digest('hex')
    };
  } catch {
    return { bytes: 0, sha256: 'unreadable' };
  }
}

const sizeOf = (path) => {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
};
const linesOf = (path) => {
  try {
    return readFileSync(path, 'utf8').split('\n').filter((one) => one.trim() !== '').length;
  } catch {
    return 0;
  }
};

const before = personReading();
say(`the person's own record file before: ${String(before.bytes)} bytes, sha256 ${before.sha256}`);

const recordedPids = [];
let machine = null;

try {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const yard = scratchYard({
    root,
    prefix: 'p193',
    record: (pid) => recordedPids.push(pid)
  });
  machine = scratchMachine(yard, { id: 'p193', port: 41_000 + (process.pid % 2000) });
  const up = machine.start();
  recordedPids.push(machine.pid);
  step(
    0,
    'the carriage',
    `sshd pid ${String(machine.pid)} on 127.0.0.1:${String(machine.port)} as ${yard.user}` +
      (up ? '' : ', WHICH DID NOT ANSWER, so nothing below is evidence')
  );

  const catchFile = join(root, 'p193-catch');
  writeFileSync(catchFile, '', 'utf8');

  // -----------------------------------------------------------------------
  // Leg 1. The mechanism is live on this machine today
  // -----------------------------------------------------------------------
  const catchBefore = sizeOf(catchFile);
  const leg1 = sshRun({
    knownHosts: catchFile,
    caller: CALLER,
    argv: [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-p',
      String(machine.port),
      '-l',
      yard.user,
      '127.0.0.1',
      'true'
    ],
    env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
  });
  const catchAfter = sizeOf(catchFile);
  step(
    1,
    'the mechanism is live, one accept-new connection into this run\'s own catch file',
    `exit ${String(leg1.status)}, the catch file went ${String(catchBefore)} -> ` +
      `${String(catchAfter)} bytes, ${String(linesOf(catchFile))} line(s). Those are ` +
      "the bytes an unscoped run would have put in the person's file."
  );
  if (catchAfter <= catchBefore) {
    fail(
      'the catch file did not grow, so ssh recorded nothing at all here and ' +
        'the three legs below would pass on a machine where this can never ' +
        'happen. Nothing below is evidence.'
    );
  }

  // -----------------------------------------------------------------------
  // Leg 2. Fail closed. No record file means no spawn at all
  // -----------------------------------------------------------------------
  const guardBefore = sizeOf(catchFile);
  let threw = null;
  try {
    sshRun({
      caller: CALLER,
      argv: ['-o', 'StrictHostKeyChecking=accept-new', '-p', String(machine.port), '127.0.0.1', 'true'],
      env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
    });
  } catch (err) {
    threw = err instanceof Error ? err.message : String(err);
  }
  const guardAfter = sizeOf(catchFile);
  step(
    2,
    'fail closed, a caller that forgets the record file',
    threw === null
      ? 'IT DID NOT THROW, and that is the whole defect'
      : `it threw before anything was spawned, naming the caller: ` +
        `${threw.split('.')[0]}. The catch file stayed ${String(guardAfter)} bytes.`
  );
  if (threw === null) {
    fail('sshRun ran without a record file. The helper is not fail closed.');
  }
  if (guardAfter !== guardBefore) fail('the refused call still wrote something.');

  // -----------------------------------------------------------------------
  // Leg 3. The scoped run writes only where it was told to
  // -----------------------------------------------------------------------
  const scoped = join(root, 'p193-scoped');
  writeFileSync(scoped, '', 'utf8');
  const catchBeforeScoped = sizeOf(catchFile);
  const leg3 = sshRun({
    knownHosts: scoped,
    caller: CALLER,
    argv: [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-p',
      String(machine.port),
      '-l',
      yard.user,
      '127.0.0.1',
      'true'
    ],
    env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
  });
  step(
    3,
    'the scoped run',
    `exit ${String(leg3.status)}, the run's own file went 0 -> ${String(sizeOf(scoped))} ` +
      `bytes and ${String(linesOf(scoped))} line(s), and the catch file stayed ` +
      `${String(sizeOf(catchFile))} bytes`
  );
  if (sizeOf(scoped) === 0) fail('the scoped run recorded nothing, so it proved nothing.');
  if (sizeOf(catchFile) !== catchBeforeScoped) {
    fail('the scoped run wrote outside the file it was given.');
  }

  // -----------------------------------------------------------------------
  // Leg 4. The two file form writes only the FIRST file
  // -----------------------------------------------------------------------
  const first = join(root, 'p193-tortie');
  const second = join(root, 'p193-stand-in-for-the-person');
  writeFileSync(first, '', 'utf8');
  writeFileSync(second, '', 'utf8');
  const leg4 = sshRun({
    knownHosts: productKnownHosts({ tortie: first, user: second }),
    caller: CALLER,
    argv: [
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-p',
      String(machine.port),
      '-l',
      yard.user,
      '127.0.0.1',
      'true'
    ],
    env: { ...process.env, SSH_AUTH_SOCK: yard.authSock }
  });
  step(
    4,
    'the two file form, with a stand-in in the place the person\'s file holds',
    `exit ${String(leg4.status)}, the FIRST file went 0 -> ${String(sizeOf(first))} bytes ` +
      `and the SECOND stayed ${String(sizeOf(second))} bytes. That is the fact ` +
      "the product's own ordering rests on."
  );
  if (sizeOf(first) === 0) fail('the first file recorded nothing.');
  if (sizeOf(second) !== 0) {
    fail('the SECOND file grew. ssh does fall back, and the two file form is not safe.');
  }
} catch (err) {
  fail(`the probe threw: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
} finally {
  // Everything this run started, ended by the pids it recorded. No pkill.
  try {
    machine?.stop();
  } catch {
    /* already gone is the state we wanted */
  }
  for (const pid of recordedPids) {
    if (typeof pid !== 'number') continue;
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone is the state we wanted */
    }
  }
  try {
    machine?.cleanup();
  } catch {
    /* nothing to remove */
  }
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  say(`ended only these recorded pids: ${recordedPids.join(', ') || 'none'}`);
}

const after = personReading();
say(`the person's own record file after:  ${String(after.bytes)} bytes, sha256 ${after.sha256}`);
if (after.bytes !== before.bytes || after.sha256 !== before.sha256) {
  fail(
    `THE PERSON'S OWN FILE MOVED, from ${String(before.bytes)} bytes to ` +
      `${String(after.bytes)}. Stop and read it before anything else.`
  );
} else {
  step(5, "the person's own file", `unchanged at ${String(after.bytes)} bytes, same sha256`);
}

if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} finding(s).`);
  process.exit(1);
}
say(`PASS. ${String(rows.length)} step(s), nothing left running, nothing of the person's touched.`);
