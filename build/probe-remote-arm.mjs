#!/usr/bin/env node
/**
 * `node build/probe-remote-arm.mjs`. The Tier 3 live probe of Phase 89, being a
 * resume command typed into a real pane on a real machine over a real
 * connection, and the double send that the ledger row's guard exists to find.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all in this file:
 *
 *  1. The target is 127.0.0.1 on a high port and the probe refuses anything
 *     else. The operator's own machines are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started, so the far tmux is never the operator's server.
 *  3. Every file this probe writes is inside its own run directory and carries
 *     a `p89-` prefix. It writes nothing under the person's home.
 *  4. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  5. The operator's own server is counted before and after. A difference is a
 *     failure whatever else passed.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PROBE PROVES, AND WHAT IT DOES NOT
 * ---------------------------------------------------------------------------
 * IT PROVES THE WIRE AND THE COUNT. Every send below crosses a real ssh
 * connection to a real sign in server, reaches a real tmux, and lands in a real
 * pane running a real shell. The copies on the screen are counted by Tortie's
 * own counter from Tortie's own read, and the landing is Tortie's own decision.
 * Enter is never sent, and the probe reads the pane's own current command
 * afterwards to prove nothing started running.
 *
 * IT PROVES THE COUNT AGAINST A WRAPPED SCREEN, which is what the fix round
 * added. Every pane below is 40 columns wide and runs zsh, so every command is
 * broken across rows and tmux does not mark those rows as wrapped. The first
 * version of this probe used `/bin/sh` on an 80 column pane, where the terminal
 * did the wrapping and `capture-pane -J` joined it, so it passed while the
 * product reported `absent` for an armed resume that had landed on the
 * operator's Mac Pro.
 *
 * IT DOES NOT PROVE THE MANIFEST OR THE RESTORE. There is no Electron process
 * here, so there is no session list, no manifest row and no restore gate. Those
 * are step 10a of `npm run smoke:remote`, which runs in a real Electron process
 * against a real database, and nothing else.
 *
 * IT DOES NOT TOUCH THE OPERATOR'S MAC PRO. The overnight order authorises one
 * armed resume there and this probe does not spend it. The scratch machine is a
 * real sshd with a real tmux and a real pane on the same code path.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';
import { keyscanText } from './ssh-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOCKET = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p89-${String(process.pid)}`;
refuseRealSockets(SOCKET, 'p89');

const root = join(
  process.env['TMPDIR'] ?? '/tmp',
  `gmux-p89-arm-${String(process.pid)}`
);
const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};

let failures = 0;
const say = (line) => process.stdout.write(`[p89] ${line}\n`);
const fail = (line) => {
  failures += 1;
  process.stdout.write(`[p89] FAIL: ${line}\n`);
};

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 180_000,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? ''
  };
}

/** The operator's own server, read only, counted. */
function operatorSessions() {
  try {
    return Number(
      execFileSync(
        '/bin/sh',
        ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'],
        { encoding: 'utf8' }
      ).trim()
    );
  } catch {
    return -1;
  }
}

/**
 * The programs a pane may be running and still be a shell.
 *
 * MEASURED on this Mac, 2026-08-19: a pane started as `/bin/sh` reports
 * `pane_current_command = bash`, because /bin/sh on macOS is bash in POSIX
 * mode. So the check is membership in this list rather than equality with the
 * name the session was started with.
 */
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish']);

const operatorBefore = operatorSessions();
say(`the operator's own server holds ${String(operatorBefore)} session(s)`);

// ---------------------------------------------------------------------------
// The scratch machine
// ---------------------------------------------------------------------------

mkdirSync(root, { recursive: true, mode: 0o700 });
const yard = scratchYard({ root, prefix: 'p89', record });
if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so nothing could sign in at all');
  process.exit(1);
}
const machine = scratchMachine(yard, {
  id: 'one',
  port: 41_000 + (process.pid % 2000)
});

function teardown() {
  machine.stop();
  for (const pid of recordedPids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    rmSync(machine.tmuxTmp, { recursive: true, force: true });
  } catch {
    /* nothing there */
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    teardown();
    process.exit(130);
  });
}

if (!machine.start()) {
  fail(`the scratch machine did not answer on port ${String(machine.port)}`);
  teardown();
  process.exit(1);
}
say(`machine on 127.0.0.1:${String(machine.port)} as ${machine.user}`);

const hostKeys = join(root, 'p89-known-hosts');
writeFileSync(
  hostKeys,
  keyscanText({ host: machine.host, port: machine.port, caller: 'build/probe-remote-arm.mjs' }),
  'utf8'
);

const WORK = join(root, 'p89-work');
mkdirSync(WORK, { recursive: true });

// ---------------------------------------------------------------------------
// The driver. The modules are TypeScript with path aliases, so it runs under
// `npx tsx`, exactly as `build/probe-remote-harvest.mjs` does.
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p89-driver.mts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const plane = await import(REPO + '/src/main/machines/exec-plane');
const arm = await import(REPO + '/src/main/machines/remote-arm');
const copy = await import(REPO + '/src/main/machines/remote-copy');

const ID = 'p89probe';
const ctx = {
  kind: 'remote' as const,
  machineId: ID,
  sshBin: '/usr/bin/ssh',
  host: input.host,
  user: input.user,
  port: input.port,
  remoteTmuxPath: input.remoteTmuxPath,
  socket: input.socket,
  controlPath: input.controlPath,
  hostKeys: { tortie: input.hostKeys, user: input.hostKeys }
};
context.registerRemoteMachineContext(ctx);
context.setMachineRemotePath(ID, '/usr/bin:/bin:/usr/local/bin');

const out: Record<string, unknown> = {};

// The far server, born with Tortie's own exit-empty so it does not end itself.
await plane.execOn(ctx, [
  'start-server',
  ';',
  'set-option',
  '-s',
  'exit-empty',
  'off'
]);

// A NARROW PANE AND THE OPERATOR'S OWN SHELL, BOTH ON PURPOSE.
//
// 40 columns is narrower than any resume command, so every send below wraps.
// zsh is the shell that makes the wrap hard. It wraps its own input line and
// writes its own line break, so tmux never marks the row as wrapped and the
// -J flag on capture-pane has nothing to join. /bin/sh lets the terminal wrap
// and -J joins it, which is why the first version of this probe passed on sh
// while the product reported absent on the operator's Mac Pro. The -f flag
// starts zsh with no start up files, so nothing in anybody's home is read.
async function openSession(name: string): Promise<string> {
  const printed = await plane.execOn(ctx, [
    'new-session',
    '-d',
    '-P',
    '-F',
    '#{session_id}',
    '-x',
    '40',
    '-y',
    '20',
    '-s',
    name,
    '-c',
    input.cwd,
    '/bin/zsh',
    '-f'
  ]);
  return (printed.split('\n')[0] ?? '').trim();
}

async function screen(target: string): Promise<string> {
  return plane.execOn(ctx, ['capture-pane', '-p', '-J', '-t', target]);
}

async function paneCommand(target: string): Promise<string> {
  const printed = await plane.execOn(ctx, [
    'display-message',
    '-p',
    '-t',
    target,
    '#{pane_current_command}'
  ]);
  return printed.trim();
}

const request = {
  machineId: ID,
  agent: 'claude',
  agentSessionId: input.conversationId,
  recordedResumeArgv: ['/opt/homebrew/bin/claude', '--resume', input.conversationId],
  binOnMachine: '/usr/local/bin/claude'
};

// --- Leg 1. One arm, through the real transport ----------------------------
const oneTarget = await openSession('p89-one');
const armed = await arm.armRemoteResume({ ...request, target: oneTarget });
out.leg1 = {
  target: oneTarget,
  landing: armed.landing,
  refusal: armed.refusal,
  before: armed.before,
  after: armed.after,
  text: armed.text,
  noteMatchesArmed: armed.note === copy.RESUME_ARMED_NOT_PRESSED,
  copiesOnScreen:
    armed.text === null ? 0 : arm.countOccurrences(await screen(oneTarget), armed.text),
  // TRUE when the screen holds the command as one unbroken run of characters.
  // On a 40 column pane running zsh it is FALSE, and that is the whole point of
  // this leg. The counter has to find a command the shell broke across rows.
  contiguousOnScreen:
    armed.text === null ? false : (await screen(oneTarget)).includes(armed.text),
  paneCommand: await paneCommand(oneTarget)
};

// --- Leg 2. The staged double send, counted at every step ------------------
const twoTarget = await openSession('p89-two');
const text = String(armed.text ?? '');
const before = arm.countOccurrences(await screen(twoTarget), text);
await plane.sendArmedResumeText(ctx, twoTarget, text);
await new Promise((r) => setTimeout(r, 400));
const afterFirst = arm.countOccurrences(await screen(twoTarget), text);
await plane.sendArmedResumeText(ctx, twoTarget, text);
await new Promise((r) => setTimeout(r, 400));
const afterSecond = arm.countOccurrences(await screen(twoTarget), text);
out.leg2 = {
  target: twoTarget,
  before,
  afterFirst,
  afterSecond,
  paneCommand: await paneCommand(twoTarget)
};

// --- Leg 2b. What the arming path REPORTS when the machine takes it twice ---
const threeTarget = await openSession('p89-three');
const doubleWire = {
  readScreen: () => screen(threeTarget),
  sendText: async (one: string) => {
    // TWICE ON PURPOSE. This is the failure the ledger row calls unsafe, and
    // the point of the probe is that Tortie FINDS it rather than assuming it
    // away.
    await plane.sendArmedResumeText(ctx, threeTarget, one);
    await plane.sendArmedResumeText(ctx, threeTarget, one);
  },
  wait: (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
};
const twice = await arm.armRemoteResume(
  { ...request, target: threeTarget },
  doubleWire
);
out.leg2b = {
  target: threeTarget,
  landing: twice.landing,
  before: twice.before,
  after: twice.after,
  noteMatchesTwice: twice.note === copy.RESUME_TYPED_TWICE,
  paneCommand: await paneCommand(threeTarget)
};

// --- Leg 3. The three refusals, against a real machine ---------------------
const fourTarget = await openSession('p89-four');
const screenBefore = await screen(fourTarget);
async function refusalOf(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
    return '';
  } catch (err) {
    const raw = (err as Error).message;
    try {
      return String((JSON.parse(raw) as { message?: string }).message ?? raw);
    } catch {
      return raw;
    }
  }
}
out.leg3 = {
  generalDoor: await refusalOf(() =>
    plane.execOn(ctx, ['send-keys', '-t', fourTarget, '-l', 'echo hello'])
  ),
  newline: await refusalOf(() =>
    plane.sendArmedResumeText(ctx, fourTarget, 'echo hello\n')
  ),
  namedTarget: await refusalOf(() =>
    plane.sendArmedResumeText(ctx, 'p89-four', 'echo hello')
  ),
  repeatUnsafeSentence: plane.REPEAT_UNSAFE,
  armedTextSentence: plane.ARMED_TEXT_REFUSED,
  screenUnchanged: (await screen(fourTarget)) === screenBefore,
  paneCommand: await paneCommand(fourTarget)
};

// --- Leg 4. A row Tortie did not compose is never sent ---------------------
const fiveTarget = await openSession('p89-five');
const notComposed = await arm.armRemoteResume({
  ...request,
  target: fiveTarget,
  recordedResumeArgv: [
    '/opt/homebrew/bin/claude',
    '--resume',
    input.conversationId,
    '; rm -rf /'
  ]
});
out.leg4 = {
  landing: notComposed.landing,
  refusal: notComposed.refusal,
  text: notComposed.text,
  noteMatchesNotComposed: notComposed.note === copy.RESUME_NOT_COMPOSED,
  screenIsEmptyOfIt: !(await screen(fiveTarget)).includes('rm -rf'),
  paneCommand: await paneCommand(fiveTarget)
};

// Take the four sessions away by their own immutable identifiers.
for (const target of [oneTarget, twoTarget, threeTarget, fourTarget, fiveTarget]) {
  await plane.execOn(ctx, ['kill-session', '-t', target]);
}

writeFileSync(outPath, JSON.stringify(out), 'utf8');
process.exit(0);
`.replace('__REPO__', repoRoot),
  'utf8'
);

const inPath = join(root, 'p89-in.json');
const outPath = join(root, 'p89-out.json');
writeFileSync(
  inPath,
  JSON.stringify({
    host: machine.host,
    user: machine.user,
    port: machine.port,
    remoteTmuxPath: machine.remoteTmuxPath,
    socket: SOCKET,
    controlPath: join(root, 'p89-control'),
    hostKeys,
    cwd: WORK,
    conversationId: '11111111-2222-4333-8444-555555555555'
  }),
  'utf8'
);

const ran = sh(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
  { cwd: repoRoot, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
);
if (!existsSync(outPath)) {
  fail(
    `the driver did not answer. It printed:\n` +
      `${(ran.stdout + ran.stderr).trim().split('\n').slice(-20).join('\n')}`
  );
  teardown();
  process.exit(1);
}
const out = JSON.parse(readFileSync(outPath, 'utf8'));

// ---------------------------------------------------------------------------
// Leg 1. One arm
// ---------------------------------------------------------------------------

const leg1 = out.leg1 ?? {};
say(
  `1. one arm on ${String(leg1.target)}: landing ${String(leg1.landing)}, ` +
    `copies before ${String(leg1.before)}, copies after ${String(leg1.after)}, ` +
    `copies on the screen now ${String(leg1.copiesOnScreen)}`
);
say(`   the text Tortie typed is ${JSON.stringify(leg1.text)}`);
if (leg1.landing !== 'armed') fail(`the one arm landed ${String(leg1.landing)}`);
if (leg1.before !== 0 || leg1.after !== 1) {
  fail(
    `the one arm counted ${String(leg1.before)} copies before and ` +
      `${String(leg1.after)} after, and it should be 0 then 1`
  );
}
if (leg1.copiesOnScreen !== 1) {
  fail(
    `the screen shows the command ${String(leg1.copiesOnScreen)} time(s) ` +
      `rather than exactly once`
  );
}
// The pane is 40 columns and every resume command is longer than that, so a
// screen that holds the command in one unbroken run means the wrap this probe
// exists to exercise did not happen and the reading above proves less than it
// claims.
if (leg1.contiguousOnScreen === true) {
  fail(
    `the command is on the screen as one unbroken run, so this pane did not ` +
      `wrap it and the count above did not have to survive a wrapped line. ` +
      `The pane is asked for 40 columns and every resume command is longer.`
  );
}
say(
  `   the shell broke the command across rows and the counter still found ` +
    `${String(leg1.copiesOnScreen)} copy, which is the reading that was wrong ` +
    `on the operator's Mac Pro`
);
if (leg1.noteMatchesArmed !== true) {
  fail('the sentence the arm carries is not the armed one, byte for byte');
}
if (!String(leg1.text ?? '').startsWith('/usr/local/bin/claude ')) {
  fail('the typed command does not begin with the path that machine reports');
}
if (!String(leg1.text ?? '').includes('11111111-2222-4333-8444-555555555555')) {
  fail('the typed command does not carry the row’s own conversation id');
}
if (!SHELLS.has(String(leg1.paneCommand))) {
  fail(
    `the pane is running ${String(leg1.paneCommand)} rather than a shell, so ` +
      `something pressed Enter`
  );
}
say(`   and the pane is still running ${String(leg1.paneCommand)}, so nothing ran`);

// ---------------------------------------------------------------------------
// Leg 2. The staged double send
// ---------------------------------------------------------------------------

const leg2 = out.leg2 ?? {};
say(
  `2. the staged double send on ${String(leg2.target)}: ` +
    `${String(leg2.before)} copies, then ${String(leg2.afterFirst)}, then ` +
    `${String(leg2.afterSecond)}`
);
if (leg2.before !== 0 || leg2.afterFirst !== 1 || leg2.afterSecond !== 2) {
  fail(
    `the staged send counted ${String(leg2.before)}, ${String(leg2.afterFirst)} ` +
      `and ${String(leg2.afterSecond)}, and it should be 0, 1 and 2. This is ` +
      `the measurement the ledger row's "unsafe" class is claiming.`
  );
}
if (!SHELLS.has(String(leg2.paneCommand))) {
  fail(`the pane is running ${String(leg2.paneCommand)} after two sends`);
}

const leg2b = out.leg2b ?? {};
say(
  `2b. the arming path against a machine that took it twice: landing ` +
    `${String(leg2b.landing)}, copies ${String(leg2b.before)} then ` +
    `${String(leg2b.after)}`
);
if (leg2b.landing !== 'twice') {
  fail(
    `a double send reported ${String(leg2b.landing)} rather than twice, so the ` +
      `guard the ledger row names does not find the repeat it exists to find`
  );
}
if (leg2b.noteMatchesTwice !== true) {
  fail('the sentence the double send carries is not the twice one, byte for byte');
}
if (!SHELLS.has(String(leg2b.paneCommand))) {
  fail(`the pane is running ${String(leg2b.paneCommand)} after a double send`);
}

// ---------------------------------------------------------------------------
// Leg 3. The three refusals, watched firing against a real machine
// ---------------------------------------------------------------------------

const leg3 = out.leg3 ?? {};
const checks = [
  ['the general door refuses send-keys', leg3.generalDoor, leg3.repeatUnsafeSentence],
  ['a text carrying a newline', leg3.newline, leg3.armedTextSentence],
  ['a target that is a name', leg3.namedTarget, leg3.armedTextSentence]
];
for (const [what, got, want] of checks) {
  if (got === want) {
    say(`3. ${what}: refused with its own sentence`);
    continue;
  }
  fail(`${what} answered ${JSON.stringify(got)} rather than its own sentence`);
}
if (leg3.screenUnchanged !== true) {
  fail('one of the three refusals changed the screen, so something was sent');
}
say('   and the screen is byte identical after all three, so nothing was sent');

// ---------------------------------------------------------------------------
// Leg 4. A command Tortie did not compose
// ---------------------------------------------------------------------------

const leg4 = out.leg4 ?? {};
say(
  `4. a row carrying a word Tortie did not compose: refusal ` +
    `${String(leg4.refusal)}, landing ${String(leg4.landing)}, text ` +
    `${String(leg4.text)}`
);
if (leg4.refusal !== 'not-composed' || leg4.landing !== null) {
  fail(
    `a row Tortie did not compose answered refusal ${String(leg4.refusal)} and ` +
      `landing ${String(leg4.landing)}, and it should be not-composed and null`
  );
}
if (leg4.noteMatchesNotComposed !== true) {
  fail('the refused row does not carry the not composed sentence, byte for byte');
}
if (leg4.screenIsEmptyOfIt !== true) {
  fail('the refused text reached the screen, so something was sent');
}

// ---------------------------------------------------------------------------
// The counts that outrank every result above
// ---------------------------------------------------------------------------

teardown();
const operatorAfter = operatorSessions();
say(
  `the operator's own server holds ${String(operatorAfter)} session(s), and it ` +
    `held ${String(operatorBefore)} before`
);
if (operatorAfter !== operatorBefore) {
  fail('the operator’s own server changed during this probe');
}

if (failures > 0) {
  process.stdout.write(`\n[p89] FAIL, ${String(failures)} finding(s)\n`);
  process.exit(1);
}
process.stdout.write(
  '\n[p89] PASS. One line of Tortie’s own composed text was typed into a real ' +
    'pane on a real machine, Enter was never sent, a second copy was found ' +
    'rather than assumed away, and every refusal fired with its own sentence.\n'
);
