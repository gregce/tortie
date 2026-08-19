/**
 * GMUX_SMOKE=exec-plane. Drive the exec plane inside a real Electron process,
 * against the built bundle (Phase 69, M2).
 *
 * ## What only this can prove
 *
 * Two of the four refusals this rung adds are UNREACHABLE in production. There is
 * no `unsafe` row on the verb ledger and there is no mutating verb, so nothing a
 * person can do makes either branch run. Rollup deletes a branch whose condition
 * it can prove, and Phase 20 paid for learning that: it proved two of the agent
 * gate's refusals away when the only caller passed a constant. So this file is the
 * second caller the bundler cannot see through, and it drives both refusals with a
 * SYNTHETIC ledger row built at runtime, which is the only way either one is ever
 * watched firing.
 *
 * PHASE 89 ADDED THREE STEPS, and they are here for the same reason. The one
 * function that may type on another machine composes its own argv and refuses
 * anything that is not one line of printable characters. Its refusals have one
 * product call site each, which is exactly the shape rollup follows and folds
 * away, so steps 5b to 5d watch all three fire against the built bundle and
 * read the ssh process count afterwards to prove nothing was started.
 *
 * It also proves the two things a unit test cannot. The confirm gate is sealed
 * through `safeStorage`, which needs an Electron process, so this is where an
 * unconfirmed machine is watched refusing Prepare against the real keychain. And
 * the ssh process count is read from the process table, so "nothing was started
 * after the refusal" is a measurement rather than an assertion.
 *
 * ## Safety
 *
 * It refuses to run unless the profile is inside `GMUX_CONFIG_ROOT` and the tmux
 * socket is not the real one, using the same guard the fault harness makes, from
 * the same module. That guard is what stops the socket being `gmux`, and on this
 * rung that matters more than it ever has: the far side of the connection is this
 * same Mac, so a remote `set-option` on socket `gmux` would rewrite the options on
 * the operator's own server.
 *
 * It reads the scratch sshd's port and key from a JSON file inside that root,
 * written by `build/probe-execplane.mjs`. When the file is not there the steps
 * that need a real far side are skipped and SAID to be skipped, and the refusal
 * steps still run, because none of them sends anything.
 */

import { app } from 'electron';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertHarnessIsolation } from '../harness/isolation';
import { activeTmuxSocket, TMUX_SOCKET } from '../tmux/resolve';
import {
  TESTED_REMOTE_TMUX_VERSIONS,
  decideRemoteVersionGate
} from '../tmux/version';
import {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine,
  forgetMachine,
  type MachineExecutionFields
} from './confirm';
import {
  buildRemoteMachineContext,
  clearMachineRemotePathForHarness,
  registerRemoteMachineContext,
  remoteTmuxArgv,
  tmuxCommand,
  type RemoteMachineContext
} from './context';
import {
  REMOTE_VERB_LEDGER,
  assertRemoteVerbAllowed,
  execOn,
  sendArmedResumeText,
  type LedgerRow
} from './exec-plane';
import { prepareMachine } from './prepare';
// Phase 84, item 4. The feed's own facts, read back after Prepare returned.
// It asks the machine nothing: both flags are memory in this process.
import { remoteMachineFacts } from './remote-sessions';
import { machineHostKeysPath } from './store';

function log(line: string): void {
  console.log(`[gmux-exec-plane] ${line}`);
}

function fail(message: string): never {
  throw new Error(message);
}

/** What the probe wrote, when it wrote one. */
interface Carriage {
  host: string;
  port: number;
  user: string;
  remoteTmuxPath: string;
  /** A program that reports a version nobody measured, for step 8. */
  stubTmuxPath?: string;
}

const ID = 'execplane';
const STUB_ID = 'execplanestub';

/** Where the probe leaves the carriage details, inside the harness root. */
export const CARRIAGE_FILE = 'p69-carriage.json';

function readCarriage(root: string): Carriage | null {
  try {
    return JSON.parse(readFileSync(join(root, CARRIAGE_FILE), 'utf8')) as Carriage;
  } catch {
    return null;
  }
}

/** ssh children of this process, read from the process table. */
function sshChildCount(): number {
  try {
    const out = execFileSync('/bin/ps', ['-o', 'pid=,ppid=,comm='], {
      encoding: 'utf8'
    });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const parts = line.split(/\s+/);
        return parts[1] === String(process.pid) && line.includes('ssh');
      }).length;
  } catch {
    return 0;
  }
}

/** Run `work` and require it to throw with `expect` somewhere in the message. */
function assertRefused(what: string, expect: string, work: () => void): void {
  let message = '';
  try {
    work();
  } catch (err) {
    message = (err as Error).message;
  }
  if (message === '') fail(`${what}: nothing was refused`);
  if (!message.includes(expect)) {
    fail(`${what}: the refusal said "${message}" and should mention "${expect}"`);
  }
  log(`${what}: refused, and it said so`);
}

/** The same, for a promise. */
async function assertRefusedAsync(
  what: string,
  expect: string,
  work: () => Promise<unknown>
): Promise<void> {
  let message = '';
  try {
    await work();
  } catch (err) {
    message = (err as Error).message;
  }
  if (message === '') fail(`${what}: nothing was refused`);
  if (!message.includes(expect)) {
    fail(`${what}: the refusal said "${message}" and should mention "${expect}"`);
  }
  log(`${what}: refused, and it said so`);
}

/** Confirm a machine the way the IPC handler does, from what the sheet showed. */
function confirmAsAPerson(id: string, fields: MachineExecutionFields): void {
  const summary = describeMachine(id, fields);
  const recorded = confirmMachine(id, fields, {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: summary.hash,
    linesRead: summary.lines
  });
  if (recorded === null) {
    fail(
      'the confirmation could not be sealed. safeStorage is unavailable in ' +
        'this build, so every machine would be refused in a person’s hands.'
    );
  }
}

export async function runExecPlaneSmoke(): Promise<void> {
  try {
    const iso = assertHarnessIsolation('GMUX_CONFIG_ROOT');
    // Said again, by name, because on this rung the far side is this same Mac and
    // the socket is the difference between a scratch server and the operator's.
    if (activeTmuxSocket() === TMUX_SOCKET) {
      fail(
        `the socket is "${TMUX_SOCKET}", the real one. This harness sends ` +
          `set-option to a machine, and on this socket that machine is this Mac.`
      );
    }
    log(`profile ${iso.userData}, socket ${iso.socket}`);

    const carriage = readCarriage(iso.root);
    const fields: MachineExecutionFields =
      carriage === null
        ? {
            host: '127.0.0.1',
            user: 'nobody',
            port: 65_000,
            remoteTmuxPath: '/usr/bin/tmux'
          }
        : {
            host: carriage.host,
            user: carriage.user,
            port: carriage.port,
            remoteTmuxPath: carriage.remoteTmuxPath
          };

    const sshBefore = sshChildCount();
    log(`ssh children before anything: ${String(sshBefore)}`);

    // This harness reuses its config root between runs, because that is where
    // `build/probe-execplane.mjs` leaves the scratch sshd's port and key. Step 2
    // confirms `execplane` and that confirmation is sealed into the same root,
    // so a second run would arrive with the machine already confirmed and step 1
    // could not refuse anything. The Phase 70 verifier hit exactly that and read
    // it as a Phase 70 defect. Drop both confirmations first, so every run starts
    // from a machine nobody has agreed to.
    forgetMachine(ID);
    forgetMachine(STUB_ID);
    log('the confirmations from any earlier run were dropped');

    // --- 1. An unconfirmed machine refuses Prepare, and nothing spawns -------
    const unconfirmed = await prepareMachine({
      machineId: ID,
      fields,
      tortieHostKeys: machineHostKeysPath()
    });
    if (!unconfirmed.detail.includes('nobody has confirmed it')) {
      fail(
        `an unconfirmed machine was not refused by the gate: ${unconfirmed.detail}`
      );
    }
    if (unconfirmed.serverBorn || unconfirmed.options.length > 0) {
      fail('an unconfirmed machine had something started on it');
    }
    log('1. an unconfirmed machine refuses Prepare, and names why');
    if (sshChildCount() !== sshBefore) {
      fail('the refused prepare started an ssh process');
    }
    log(`   and the ssh child count is still ${String(sshBefore)}`);

    // --- 2. Confirm it through the real gate against the real keychain -------
    confirmAsAPerson(ID, fields);
    log('2. confirmed, sealed by the real keychain');

    const ctx: RemoteMachineContext = registerRemoteMachineContext(
      buildRemoteMachineContext({
        machineId: ID,
        fields,
        packaged: app.isPackaged,
        env: process.env,
        uid: process.getuid?.() ?? 0,
        tortieHostKeys: machineHostKeysPath()
      })
    );
    const verb = ['list-sessions', '-F', '#{session_id}'];
    const plan = tmuxCommand(ctx, verb);
    log(`   the argv is ${plan.file} ${plan.argv.join(' ')}`);
    // The tmux call is ONE quoted argument of that argv, because ssh carries no
    // argv to the other machine: it joins everything after the address with single
    // spaces and hands one string to that machine's login shell. So the two checks
    // below read the call as a LIST, which is what remoteTmuxArgv returns and what
    // build/conformance-machines.mjs reads for the same reason.
    const call = remoteTmuxArgv(ctx, verb);
    log(`   the tmux call inside the last argument is ${call.join(' ')}`);
    const dashF = call.indexOf('-f');
    if (dashF < 0 || call[dashF + 1] !== '/dev/null') {
      fail('the remote tmux call does not carry -f /dev/null');
    }
    const dashL = call.indexOf('-L');
    if (dashL < 0 || call[dashL + 1] !== ctx.socket) {
      fail('the remote tmux call does not name the socket as the value of -L');
    }
    if (call.includes(TMUX_SOCKET)) {
      fail(`the remote tmux call carries the literal socket ${TMUX_SOCKET}`);
    }
    // And it really is one argument, not six loose ones.
    const last = plan.argv[plan.argv.length - 1] ?? '';
    if (!last.includes('-f /dev/null') || !last.includes(`-L ${ctx.socket}`)) {
      fail('the remote tmux call does not travel as one quoted argument');
    }
    log(`   it carries -f /dev/null and socket ${ctx.socket}, as one argument`);

    // --- The one first contact, done by hand and on purpose -----------------
    //
    // The plane carries StrictHostKeyChecking=yes, so it REFUSES a machine whose
    // identity is not already recorded, and BatchMode=yes means it could not ask.
    // That is the property step 16 of `build/probe-execplane.mjs` measures, and it
    // is why the plane can never add a line to either record file.
    //
    // In the product, first contact is the ONE visible connection test, where a
    // person is watching and answers. This harness drives Prepare rather than that
    // test, so it does the same first contact by hand, once, into the file Tortie
    // owns inside this run's own isolated profile. MEASURED 2026-08-17: without
    // this the record file did not exist, every plane command was refused, and
    // Prepare answered `version-unmeasured` saying the program would not report
    // its version, which is a true sentence about a machine it could not reach.
    if (carriage !== null) {
      const record = machineHostKeysPath();
      mkdirSync(dirname(record), { recursive: true });
      const scanned = execFileSync(
        '/usr/bin/ssh-keyscan',
        ['-p', String(carriage.port), carriage.host],
        { encoding: 'utf8', timeout: 30_000 }
      );
      writeFileSync(record, scanned, 'utf8');
      log(
        `   the one first contact recorded this machine's identity in ` +
          `${String(Buffer.byteLength(scanned, 'utf8'))} bytes, by hand, because ` +
          `the plane itself may never add a line to that file`
      );
    }

    // --- 3 and 4. Prepare, twice ---------------------------------------------
    if (carriage === null) {
      log('3. SKIPPED, and it is not evidence: no scratch carriage file was found');
      log('4. SKIPPED for the same reason');
    } else {
      const first = await prepareMachine({
        machineId: ID,
        fields,
        tortieHostKeys: machineHostKeysPath()
      });
      if (first.class !== 'prepared') {
        fail(`the first prepare answered ${first.class}: ${first.detail}`);
      }
      if (!first.serverBorn) fail('the first prepare found a server already there');
      if (first.version === null) fail('the first prepare read no version');
      if (first.options.length === 0) fail('the first prepare asserted nothing');
      const stuck = first.options.filter((row) => row.agrees).length;
      log(
        `3. prepared, version ${first.version}, server born, ` +
          `${String(stuck)} of ${String(first.options.length)} settings stuck, ` +
          `${String(first.durationMs)} ms`
      );
      const sshAfterFirst = sshChildCount();

      const second = await prepareMachine({
        machineId: ID,
        fields,
        tortieHostKeys: machineHostKeysPath()
      });
      if (second.class !== 'prepared') {
        fail(`the second prepare answered ${second.class}: ${second.detail}`);
      }
      if (second.serverBorn) fail('the second prepare created a second server');
      const sameOptions =
        JSON.stringify(second.options) === JSON.stringify(first.options);
      if (!sameOptions) fail('the two prepares read different settings back');
      log(
        `4. prepared again, server NOT born, the settings are byte equal, ` +
          `ssh children ${String(sshAfterFirst)} then ${String(sshChildCount())}`
      );

      // --- 4b. PHASE 84, item 4. Prepare started the machine's feed ----------
      //
      // Until Phase 84, Prepare signed in, read the version, started the
      // program and reported success, and started NOTHING that reads the
      // machine's list of sessions. So a machine that was asleep when Tortie
      // launched stayed unread for the whole run even after Prepare said it
      // was ready, and the badge sent the person to the button that could not
      // fix it. This step reads the feed's own facts back after Prepare
      // returned and asks nothing of the machine.
      const feed = remoteMachineFacts(ID);
      if (!feed.timerArmed && !feed.onControl) {
        fail(
          'Prepare returned prepared and the machine has neither a timer nor ' +
            'a live connection reading its list of sessions, so nothing on it ' +
            'would appear'
        );
      }
      log(
        `4b. the machine's feed is running after Prepare: fallback timer ` +
          `${feed.timerArmed ? 'armed' : 'not armed'}, live connection ` +
          `${feed.onControl ? 'open' : 'not open'}, status list ` +
          `${feed.statusTimerArmed ? 'armed' : 'not armed'}. Exactly one of the ` +
          `first two is what this rung allows, and the status list belongs to ` +
          `the connection (Phase 85).`
      );
      if (feed.timerArmed && feed.onControl) {
        fail('the machine has BOTH a timer and a live connection reading it');
      }
    }

    // --- 5. The verb ledger refusal, from the bundle -------------------------
    //
    // PHASE 70 changed the verb this step drives, and the reason is the whole
    // point of the ledger. It used to drive `new-session`, which was refused
    // because nobody had written it down. Phase 70 wrote it down WITH its repeat
    // reasoning, so it is on the ledger now and this step would refuse nothing.
    //
    // PHASE 89 CHANGED IT AGAIN, for the same reason. It drove `send-keys`,
    // and `send-keys` is on the ledger now as the first row that is not safe to
    // run twice. So this step drives `respawn-pane`, which nobody has written
    // down and which nothing on this rung sends.
    assertRefused(
      '5. a verb nobody wrote down',
      'Only commands Tortie has written down as safe to run twice',
      () => {
        assertRemoteVerbAllowed(ctx, ['respawn-pane', '-t', '$1', '-k']);
      }
    );

    // --- 5b, 5c and 5d. PHASE 89. The armed resume door ---------------------
    //
    // The general door refuses the verb outright. The armed door refuses a
    // target that is not an immutable identifier and a text that is not one
    // line of printable characters, which is what a door can check. It does not
    // check who composed the text, and that rule lives in `./remote-arm.ts`
    // instead. Each refusal below is watched firing here rather than assumed to
    // exist, and the ssh count afterwards is what says nothing was started.
    const sshBeforeArmed = sshChildCount();
    await assertRefusedAsync(
      '5b. send-keys through the general door',
      'running it twice could leave two of something',
      async () => execOn(ctx, ['send-keys', '-t', '$0', '-l', 'x'])
    );
    await assertRefusedAsync(
      '5c. an armed text carrying a newline, which is Enter',
      'The only thing it may type there is the command it composed itself',
      async () => sendArmedResumeText(ctx, '$0', 'claude --resume abc\n')
    );
    await assertRefusedAsync(
      '5d. an armed text aimed at a name rather than an identifier',
      'The only thing it may type there is the command it composed itself',
      async () => sendArmedResumeText(ctx, 'my-session', 'claude --resume abc')
    );
    if (sshChildCount() !== sshBeforeArmed) {
      fail('one of the three armed resume refusals started an ssh process');
    }
    log(
      `   and the ssh child count is still ${String(sshBeforeArmed)}, so all ` +
        `three refused before anything was sent`
    );

    // --- 6. The unsafe repeat refusal, driven with a synthetic row -----------
    // The row is built at RUNTIME so no bundler can fold this branch away and
    // quietly turn the check into a check of nothing.
    const unsafeRow: LedgerRow = {
      verb: `probe-unsafe-${String(process.pid)}`,
      repeat: 'unsafe',
      kind: 'server-setup',
      reason: 'a synthetic row, so this refusal is watched rather than assumed'
    };
    assertRefused(
      '6. a verb that is not safe to run twice',
      'running it twice could leave two of something',
      () => {
        assertRemoteVerbAllowed(ctx, [unsafeRow.verb], [...REMOTE_VERB_LEDGER, unsafeRow]);
      }
    );

    // --- 7. The ordering refusal, driven with a synthetic mutating row -------
    const mutatingRow: LedgerRow = {
      verb: `probe-mutating-${String(process.pid)}`,
      repeat: 'safe',
      kind: 'mutating',
      reason: 'a synthetic row, so this refusal is watched rather than assumed'
    };
    clearMachineRemotePathForHarness(ID);
    assertRefused(
      '7. a verb that changes something, before the program list was read',
      'before it has read the list of places that machine looks for programs',
      () => {
        assertRemoteVerbAllowed(
          ctx,
          [mutatingRow.verb],
          [...REMOTE_VERB_LEDGER, mutatingRow]
        );
      }
    );

    // --- 8. A version nobody measured refuses -------------------------------
    const supported = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.exec
    ).map((row) => row.version);
    const invented = `0.0-probe-${String(process.pid)}`;
    const madeUp = decideRemoteVersionGate(
      invented,
      TESTED_REMOTE_TMUX_VERSIONS,
      null
    );
    if (madeUp.kind !== 'unmeasured') {
      fail(`a made-up version was not refused by the gate: ${madeUp.kind}`);
    }
    if (
      decideRemoteVersionGate(null, TESTED_REMOTE_TMUX_VERSIONS, null).kind !==
      'unreadable'
    ) {
      fail('a machine that would not say its version was not refused');
    }
    // PHASE 83. The accepted arm, watched firing in a real process rather than
    // only in a unit test. The same made-up version, with a person's acceptance
    // of it, answers `accepted`. A version nobody could read stays `unreadable`
    // whatever is accepted, because there is nothing for an acceptance to bind
    // to.
    const acceptedGate = decideRemoteVersionGate(
      invented,
      TESTED_REMOTE_TMUX_VERSIONS,
      invented
    );
    if (acceptedGate.kind !== 'accepted') {
      fail(
        `a version a person accepted answered ${acceptedGate.kind} rather ` +
          `than accepted`
      );
    }
    if (
      decideRemoteVersionGate(null, TESTED_REMOTE_TMUX_VERSIONS, invented)
        .kind !== 'unreadable'
    ) {
      fail('a version nobody could read was carried by an acceptance');
    }
    log(
      `8. a made-up version is refused, the same version a person accepted is ` +
        `allowed, and the list the refusal names is ${supported.join(', ')}`
    );
    if (carriage?.stubTmuxPath !== undefined) {
      const stubFields: MachineExecutionFields = {
        ...fields,
        remoteTmuxPath: carriage.stubTmuxPath
      };
      confirmAsAPerson(STUB_ID, stubFields);
      const refused = await prepareMachine({
        machineId: STUB_ID,
        fields: stubFields,
        tortieHostKeys: machineHostKeysPath()
      });
      if (refused.class !== 'version-unmeasured') {
        fail(`a stub reporting a made-up version answered ${refused.class}`);
      }
      if (refused.serverBorn || refused.options.length > 0) {
        fail('a machine refused for its version had something started on it');
      }
      log(
        `   and a real machine running a stub reports ` +
          `${String(refused.version)}, refuses, and nothing was started on it`
      );
    } else {
      log('   the live stub half was SKIPPED: the probe wrote no stub path');
    }

    // --- 9. Two counts of what was started ----------------------------------
    await assertRefusedAsync(
      '9. a machine with no registered context',
      'Prepare the machine first',
      async () => {
        const { machineContext } = await import('./context');
        return machineContext(`never-registered-${String(process.pid)}`);
      }
    );
    log(`   ssh children at the end: ${String(sshChildCount())}`);

    log('PASS');
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-exec-plane] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}
