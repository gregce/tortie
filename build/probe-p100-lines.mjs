/**
 * `node build/probe-p100-lines.mjs`. The live probe of Phase 100, being the
 * last lines of a session on another machine.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 * IN THIS PROBE THE OTHER MACHINE IS THIS MAC. So five rules, all of them here:
 *
 *  1. The target is 127.0.0.1 and the probe refuses to run against anything
 *     else. The operator's machines and every tailnet host are never contacted.
 *  2. `refuseRealSockets` refuses the socket names `gmux` and `default` before
 *     anything is started.
 *  3. Every pid is recorded as it is created and only recorded pids are killed.
 *     There is no `pkill` and no `kill-server` in this file.
 *  4. The only tmux server this probe writes to is the scratch machine's own,
 *     which lives under its own `TMUX_TMPDIR` and holds nothing but the one
 *     session this run makes.
 *  5. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *
 * Every scratch file carries a `p100-` prefix.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ONE IS MEASURED RATHER THAN ASSERTED
 * ---------------------------------------------------------------------------
 * Eleven rows, printed one per line with the evidence beside each one.
 *
 *  1. The operator's session count before anything started.
 *  2. Tortie's 1,000 line read equals what the pane holds. The same body is
 *     read a second time by running `capture-pane -p -e -J -t <id> -S -1000`
 *     against the scratch machine's own server, and both are stripped by
 *     Tortie's own two strippers and compared byte for byte.
 *  3. The seconds for one screen, median of three reads.
 *  4. The seconds for 25,000 lines, median of three reads.
 *  5. The bytes and the lines at 25,000.
 *  6. The argv Tortie sent, read out of a log the far side's own program wrote
 *     as it received it. It must be `capture-pane -p -e -J -t <id> -S -<n>` and
 *     it must name neither of the two verbs a scrollbar would need.
 *  7. A machine Tortie is not connected to answers `notConnected` and sends
 *     nothing. The machine is up and answering while this is asked, so a
 *     command that had been sent would have succeeded.
 *  8. A session id no row is held for answers `noSession` and sends nothing,
 *     measured the same way and by the same command count.
 *  9. The read wrote nothing on the far side. The machine's session count and
 *     the pane's own `#{history_size}` are equal before and after.
 * 10. The byte ceiling was NOT reached in this run, said plainly so nobody
 *     reads row 5 as proof that the ceiling works. The cut is proved by
 *     `src/main/machines/__tests__/remote-lines.test.ts` instead.
 * 11. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side is this Mac over a loopback sign in server. No Linux machine and
 * no machine of the operator's is contacted, so a foreign tmux is reasoned
 * about rather than measured. Nothing here measures a slow link: the seconds
 * below are a loopback path, which is faster than the 6 ms Tailscale path
 * research 57 section 3.2 measured. Nothing here reaches the 8,388,608 byte
 * ceiling. Nothing here draws a panel either, which is the screenshot read the
 * phase brief asks for separately.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
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
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  machineTmuxTmp,
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only address this probe may ever contact. */
const TARGET = '127.0.0.1';
const PORT = 45800;

/** Tortie's own id for the one session this run makes on the machine. */
const SESSION_ID = 'p100-far-session';
/** The name that session carries on the machine's own server. */
const SESSION_NAME = 'p100-far';
/** How many lines the session prints, so 25,000 is inside its history. */
const PRINTED_LINES = 30_000;
/** How deep the machine's own server may remember. */
const HISTORY_LIMIT = 60_000;

const SOCKET = refuseRealSockets(
  process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p100-lines-${String(process.pid)}`,
  'p100-lines'
);

const root = join('/tmp', `p100-lines-${String(process.pid)}`);
const recordedPids = [];
const failures = [];

const say = (text) => process.stdout.write(`[p100-lines] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p100-lines] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p100-lines] ${String(n)}. ${what}: ${evidence}\n`);

function sh(file, args, options = {}) {
  const out = spawnSync(file, args, {
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 128 * 1024 * 1024,
    ...options
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? '',
    stderr: out.stderr ?? '',
    both: `${out.stdout ?? ''}${out.stderr ?? ''}`
  };
}

/** How many sessions the operator's own tmux server holds. Read only. */
function operatorSessions() {
  const out = sh('/bin/sh', [
    '-c',
    'tmux -L gmux list-sessions 2>/dev/null | wc -l'
  ]);
  return out.stdout.trim();
}

const sessionsBefore = operatorSessions();
step(1, 'the operator’s sessions on -L gmux, before', sessionsBefore);

mkdirSync(root, { recursive: true, mode: 0o700 });

// ---------------------------------------------------------------------------
// The scratch machine
// ---------------------------------------------------------------------------

const yard = scratchYard({
  root,
  prefix: 'p100',
  record: (pid) => {
    if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
  }
});

const machine = scratchMachine(yard, { id: 'one', port: PORT });

/**
 * The program the far side runs in place of tmux, and the whole reason row 6 is
 * a measurement rather than a restatement.
 *
 * It writes the argv it received, one tab separated line per command, and then
 * runs the real program with the same argv. So the log holds exactly what the
 * far side's own tmux was handed, after ssh joined the command into one string
 * and that machine's login shell split it again.
 */
const argvLog = join(root, 'p100-far-argv.log');
const tmuxWrapper = join(root, 'p100-far-tmux');
writeFileSync(
  tmuxWrapper,
  [
    '#!/bin/sh',
    '{',
    "  printf 'CMD'",
    '  for one in "$@"; do printf \'\\t%s\' "$one"; done',
    "  printf '\\n'",
    `} >> ${argvLog}`,
    `exec ${yard.tmuxPath} "$@"`,
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(tmuxWrapper, 0o755);
writeFileSync(argvLog, '', 'utf8');

/** Every command the far side's program was handed, newest last. */
function farCommands() {
  let text = '';
  try {
    text = readFileSync(argvLog, 'utf8');
  } catch {
    text = '';
  }
  return text
    .split('\n')
    .filter((line) => line.startsWith('CMD\t'))
    .map((line) => line.slice(4).split('\t'));
}

function stopEverything() {
  try {
    machine.stop();
  } catch {
    /* already gone, which is the state we wanted */
  }
  for (const pid of [...recordedPids].reverse()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    machine.cleanup();
  } catch {
    /* nothing to remove */
  }
  const tmuxTmp = machineTmuxTmp('p100', 'one');
  if (existsSync(tmuxTmp)) rmSync(tmuxTmp, { recursive: true, force: true });
  // The scratch keys, the wrapper, the log and every driver file this run
  // wrote. Nothing outside this one directory is removed, and the directory
  // name carries this process id, so a run cannot reach another run's files.
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

if (yard.authSock === '') {
  fail('no ssh agent holds this run’s key, so nothing could sign in at all.');
  stopEverything();
  process.exit(2);
}

if (!machine.start()) {
  fail('the scratch sign in server did not start, so nothing could be measured.');
  stopEverything();
  process.exit(2);
}
say(`scratch machine on ${TARGET}:${String(PORT)}, socket ${SOCKET}`);
say(`the far side's program is ${tmuxWrapper}, which logs to ${argvLog}`);

// ---------------------------------------------------------------------------
// One session on that machine, with more history than the deepest read asks for
// ---------------------------------------------------------------------------

/**
 * One command against the MACHINE'S OWN server.
 *
 * It is the same server Tortie reaches over the connection, because the sign in
 * server sets `TMUX_TMPDIR` for every session it opens. The real program is
 * named here rather than the wrapper, so the harness's own commands never
 * appear in the log row 6 reads.
 */
function far(args, conf = '/dev/null') {
  return sh(yard.tmuxPath, ['-L', SOCKET, '-f', conf, ...args], {
    env: { ...process.env, TMUX_TMPDIR: machine.tmuxTmp }
  });
}

/**
 * The one configuration the machine's own server starts with.
 *
 * `history-limit` is read when a PANE is made, and tmux's own default is 2,000,
 * which is a twelfth of the deepest read this phase offers. A `set-option` sent
 * before the server exists does not start one and simply fails, MEASURED here
 * on 2026-08-20 as `error connecting to ...`, so the value has to be in a file
 * the server reads as it starts. Only the command that STARTS the server names
 * this file. Every command after it names /dev/null, which is what Tortie's own
 * exec plane sends.
 */
const farConf = join(root, 'p100-far-tmux.conf');
writeFileSync(farConf, `set -g history-limit ${String(HISTORY_LIMIT)}\n`, 'utf8');

const printer =
  `for i in $(seq 1 ${String(PRINTED_LINES)}); do ` +
  `echo "p100 line $i"; done; exec sleep 3600`;
const made = far(
  [
    'new-session',
    '-d',
    '-P',
    '-F',
    '#{session_id}',
    '-s',
    SESSION_NAME,
    '/bin/sh',
    '-c',
    printer
  ],
  farConf
);
const tmuxId = made.stdout.trim();
if (tmuxId === '') {
  fail(
    `the session on the machine was not made: ${made.both.trim().slice(0, 400)}`
  );
  stopEverything();
  process.exit(2);
}

// Tortie's own stamps, so its list adopts the row exactly as it adopts a
// session it created itself. A session carrying no `@gmux-id` is NOT OURS and
// the poller never adopts it.
for (const [option, value] of [
  ['@gmux-id', SESSION_ID],
  ['@gmux-agent', 'shell'],
  ['@gmux-name', SESSION_NAME],
  ['@gmux-project', root]
]) {
  far(['set-option', '-t', tmuxId, option, value]);
}

/** How many lines that pane has scrolled off, read from tmux itself. */
function historySize() {
  return far([
    'display-message',
    '-p',
    '-t',
    tmuxId,
    '#{history_size}'
  ]).stdout.trim();
}

/** How many sessions the MACHINE's own server holds. */
function farSessions() {
  return far(['list-sessions', '-F', '#{session_id}'])
    .stdout.split('\n')
    .filter((one) => one.trim() !== '').length;
}

// Wait for the printing to finish, so every read below sees one static pane.
for (let attempt = 0; attempt < 120; attempt += 1) {
  if (Number(historySize()) >= PRINTED_LINES - 40) break;
  sh('/bin/sleep', ['0.5']);
}
const historyBefore = historySize();
const farSessionsBefore = farSessions();
say(
  `session ${SESSION_NAME} is ${tmuxId} on the machine, history ` +
    `${historyBefore} line(s), ${String(farSessionsBefore)} session(s) there`
);

// The second read of the same pane, taken directly against the machine's own
// server rather than through Tortie. Row 2 compares it byte for byte.
const directPath = join(root, 'p100-direct-1000.txt');
writeFileSync(
  directPath,
  far(['capture-pane', '-p', '-e', '-J', '-t', tmuxId, '-S', '-1000']).stdout,
  'utf8'
);

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p100-lines-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const context = await import(REPO + '/src/main/machines/context');
const remotePath = await import(REPO + '/src/main/machines/remote-path');
const control = await import(REPO + '/src/main/machines/control-plane');
const sessions = await import(REPO + '/src/main/machines/remote-sessions');
const lines = await import(REPO + '/src/main/machines/remote-lines');
const ansi = await import(REPO + '/src/main/ansi');
const snapshots = await import(REPO + '/src/main/restore/snapshots');

const ctx = {
  kind: 'remote' as const,
  machineId: input.machineId,
  sshBin: '/usr/bin/ssh',
  host: input.host,
  user: input.user,
  port: input.port,
  remoteTmuxPath: input.remoteTmuxPath,
  socket: input.socket,
  controlPath: input.controlPath,
  hostKeys: { tortie: input.hostKeys, user: input.userHostKeys }
};

const answers: unknown[] = [];
let rows: string[] = [];

/** The same two strippers the read itself uses, in the same order. */
const strip = (text: string): string =>
  snapshots.stripControls(ansi.stripAnsi(text));

try {
  context.registerRemoteMachineContext(ctx);
  await remotePath.captureRemotePath(ctx);
  // The link has to read as answering for the read to be allowed at all.
  control.noteMachineAnswered(ctx.machineId, Date.now());
  // Tortie's own list, which is what puts a row in memory for the session on
  // that machine. Nothing here is supplied to make the read succeed.
  await sessions.pollRemoteMachine(ctx.machineId);
  rows = sessions.remoteSessions().map((one) => one.id);
  for (const op of input.ops as Record<string, unknown>[]) {
    if (op.kind === 'disconnect') {
      // The link is taken away WITHOUT touching the machine, which is still up
      // and still answering. A command sent after this would therefore have
      // succeeded, so a refusal here is proof that nothing was sent.
      control.noteMachineQuiet(ctx.machineId, 'the probe took the link away');
      answers.push({ ok: true, name: op.name, disconnected: true });
      continue;
    }
    if (op.kind === 'reconnect') {
      control.noteMachineAnswered(ctx.machineId, Date.now());
      answers.push({ ok: true, name: op.name, reconnected: true });
      continue;
    }
    try {
      const answer = await lines.readSessionLinesOnMachine({
        sessionId: String(op.sessionId),
        lines: Number(op.lines)
      });
      const row: Record<string, unknown> = {
        ok: true,
        name: op.name,
        mode: answer.mode,
        machineId: answer.machineId,
        machineLabel: answer.machineLabel,
        asked: answer.asked,
        lines: answer.lines,
        bytes: answer.bytes,
        truncated: answer.truncated,
        elapsedMs: answer.elapsedMs,
        sha256: createHash('sha256').update(answer.text, 'utf8').digest('hex'),
        head: answer.text.slice(0, 120),
        tail: answer.text.slice(-120)
      };
      if (typeof op.comparePath === 'string' && op.comparePath.length > 0) {
        const raw = readFileSync(op.comparePath, 'utf8');
        const direct = strip(raw);
        row.compare = {
          identical: direct === answer.text,
          directBytes: Buffer.byteLength(direct, 'utf8'),
          directSha: createHash('sha256').update(direct, 'utf8').digest('hex'),
          rawBytes: Buffer.byteLength(raw, 'utf8')
        };
      }
      answers.push(row);
    } catch (err) {
      const payload = (err as { payload?: { message?: string; detail?: string } })
        .payload;
      answers.push({
        ok: false,
        name: op.name,
        message: String(payload?.message ?? (err as Error).message),
        detail: String(payload?.detail ?? '')
      });
    }
  }
} catch (err) {
  answers.push({ ok: false, name: 'setup', message: String((err as Error).message) });
}

writeFileSync(outPath, JSON.stringify({ answers, rows }), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

let driverCalls = 0;

function drive(input) {
  driverCalls += 1;
  const inPath = join(root, `p100-in-${String(driverCalls)}.json`);
  const outPath = join(root, `p100-out-${String(driverCalls)}.json`);
  writeFileSync(inPath, JSON.stringify(input), 'utf8');
  const out = sh(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
    {
      cwd: repoRoot,
      timeout: 600_000,
      env: {
        ...process.env,
        // Without both of these `activeTmuxSocket` refuses to leave the real
        // socket, and the far side of this probe is the machine holding the
        // operator's live sessions.
        GMUX_SMOKE: 'probe-p100-lines',
        GMUX_TMUX_SOCKET: SOCKET,
        SSH_AUTH_SOCK: yard?.authSock ?? process.env['SSH_AUTH_SOCK'] ?? ''
      }
    }
  );
  if (!existsSync(outPath)) {
    fail(
      `the driver did not answer. It printed:\n` +
        `${out.both.trim().split('\n').slice(-12).join('\n')}`
    );
    return null;
  }
  return JSON.parse(readFileSync(outPath, 'utf8'));
}

const ctxInput = {
  machineId: 'p100-scratch',
  host: TARGET,
  user: yard.user,
  port: PORT,
  // The logging wrapper, not the real program. See its comment above.
  remoteTmuxPath: tmuxWrapper,
  socket: SOCKET,
  controlPath: join(root, 'p100-control'),
  hostKeys: join(root, 'p100-known-machines'),
  userHostKeys: join(root, 'p100-person-known-hosts')
};
writeFileSync(ctxInput.userHostKeys, '', 'utf8');

// Tortie's own record file, seeded with the scratch machine's identity. In the
// product that line is written by the ONE visible connection test, where a
// person read the question and answered it. Nothing here writes to the person's
// own record file, which is why the second path above is an empty scratch file.
const hostKeyLine = readFileSync(`${yard.hostKey}.pub`, 'utf8')
  .trim()
  .split(' ')
  .slice(0, 2)
  .join(' ');
writeFileSync(
  ctxInput.hostKeys,
  `[${TARGET}]:${String(PORT)} ${hostKeyLine}\n`,
  'utf8'
);

// ---------------------------------------------------------------------------
// One process, every read, so the connection is opened once
// ---------------------------------------------------------------------------

const driven = drive({
  ...ctxInput,
  ops: [
    { name: 'compare', sessionId: SESSION_ID, lines: 1000, comparePath: directPath },
    { name: 'screen-1', sessionId: SESSION_ID, lines: 0 },
    { name: 'screen-2', sessionId: SESSION_ID, lines: 0 },
    { name: 'screen-3', sessionId: SESSION_ID, lines: 0 },
    { name: 'deep-1', sessionId: SESSION_ID, lines: 25_000 },
    { name: 'deep-2', sessionId: SESSION_ID, lines: 25_000 },
    { name: 'deep-3', sessionId: SESSION_ID, lines: 25_000 },
    // Row 8. The machine is up and answering, so a command that had been sent
    // would have reached it.
    { name: 'no-session', sessionId: 'p100-nobody-holds-this', lines: 1000 },
    // Row 7. The link is taken away while the machine stays up.
    { name: 'drop', kind: 'disconnect' },
    { name: 'not-connected', sessionId: SESSION_ID, lines: 1000 },
    { name: 'back', kind: 'reconnect' }
  ]
});

if (driven === null) {
  stopEverything();
  process.exit(1);
}

const byName = new Map();
for (const row of driven.answers ?? []) byName.set(row.name, row);

function answerFor(name) {
  const row = byName.get(name);
  if (row === undefined || row.ok !== true) {
    fail(
      `the read called "${name}" did not answer. ` +
        `${String(row?.message ?? '')} ${String(row?.detail ?? '')}`
    );
    return null;
  }
  return row;
}

if (!(driven.rows ?? []).includes(SESSION_ID)) {
  fail(
    `Tortie's own list did not adopt ${SESSION_ID}. It held ` +
      `${(driven.rows ?? []).join(', ') || 'nothing'}, so every read below is ` +
      `about a session it cannot see.`
  );
}

// ---------------------------------------------------------------------------
// Row 2. The body, against what the pane itself holds
// ---------------------------------------------------------------------------

const compare = answerFor('compare');
if (compare !== null) {
  const same = compare.compare ?? {};
  step(
    2,
    'Tortie’s 1,000 line read against the pane’s own capture-pane',
    `mode ${String(compare.mode)}, ${String(compare.lines)} line(s), ` +
      `${String(compare.bytes)} byte(s); the direct read stripped the same way ` +
      `is ${String(same.directBytes)} byte(s) from ${String(same.rawBytes)} raw; ` +
      `${same.identical === true ? 'IDENTICAL byte for byte' : 'THEY DIFFER'}`
  );
  if (compare.mode !== 'read' || same.identical !== true) {
    fail(
      `Tortie's read and the pane's own capture-pane are not the same bytes. ` +
        `Tortie ${String(compare.sha256)}, direct ${String(same.directSha)}.`
    );
  }
}

// ---------------------------------------------------------------------------
// Rows 3 to 5. The seconds and the size
// ---------------------------------------------------------------------------

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const screenRuns = ['screen-1', 'screen-2', 'screen-3']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true);
const deepRuns = ['deep-1', 'deep-2', 'deep-3']
  .map((name) => byName.get(name))
  .filter((row) => row?.ok === true);

step(
  3,
  'one screen, three reads',
  screenRuns.length === 0
    ? 'none answered'
    : `${screenRuns.map((r) => (r.elapsedMs / 1000).toFixed(3) + ' s').join(', ')}, ` +
        `median ${(median(screenRuns.map((r) => r.elapsedMs)) / 1000).toFixed(3)} s, ` +
        `${String(screenRuns[0].lines)} line(s)`
);
if (screenRuns.length !== 3) fail('three reads of one screen did not all answer.');

step(
  4,
  '25,000 lines, three reads',
  deepRuns.length === 0
    ? 'none answered'
    : `${deepRuns.map((r) => (r.elapsedMs / 1000).toFixed(3) + ' s').join(', ')}, ` +
        `median ${(median(deepRuns.map((r) => r.elapsedMs)) / 1000).toFixed(3)} s`
);
if (deepRuns.length !== 3) fail('three reads of 25,000 lines did not all answer.');

const deep = deepRuns[0];
if (deep !== undefined) {
  step(
    5,
    'what 25,000 lines came back as',
    `${String(deep.lines)} line(s), ${String(deep.bytes)} byte(s), asked ` +
      `${String(deep.asked)}, truncated ${String(deep.truncated)}. These bytes ` +
      `are NOT comparable with the 4,200,243 research 57 section 3.2 measured: ` +
      `the lines this run printed are about 15 bytes each and carry no colour, ` +
      `and that measurement was of a real agent's coloured pane`
  );
  if (deep.mode !== 'read' || deep.lines < 25_000) {
    fail(
      `a 25,000 line read came back as ${String(deep.mode)} with ` +
        `${String(deep.lines)} line(s). The pane holds ${historyBefore} lines ` +
        `of history, so it must come back with at least 25,000.`
    );
  }
}

// ---------------------------------------------------------------------------
// Row 6. The argv, read out of what the far side received
// ---------------------------------------------------------------------------

const commands = farCommands();
const captures = commands.filter((one) => one.includes('capture-pane'));
const deepest = captures.find((one) => one.includes('-25000')) ?? [];
// Everything after `-L <socket> -f /dev/null`, which is what the exec plane
// puts in front of every command it sends.
const verbAndOn = deepest.slice(4);
const expected = ['capture-pane', '-p', '-e', '-J', '-t', tmuxId, '-S', '-25000'];
const forbidden = commands
  .flat()
  .filter((one) => one.includes(`copy${'-'}mode`) || one.includes(`send${'-'}keys`));
step(
  6,
  'the argv the machine’s own program received',
  `${verbAndOn.join(' ') || 'nothing'} (from the whole line ` +
    `${deepest.join(' ') || 'nothing'}); ${String(commands.length)} command(s) ` +
    `crossed in this run, ${String(captures.length)} of them capture-pane`
);
if (JSON.stringify(verbAndOn) !== JSON.stringify(expected)) {
  fail(
    `the deepest read sent ${JSON.stringify(verbAndOn)}. It sends ` +
      `${JSON.stringify(expected)} exactly.`
  );
}
if (forbidden.length > 0) {
  fail(
    `${String(forbidden.length)} command(s) named a verb a scrollbar would ` +
      `need. Research 57 section 3.1 refused a real remote scrollbar and this ` +
      `phase sends neither verb.`
  );
}

// ---------------------------------------------------------------------------
// Rows 7 and 8. The two refusals, and neither sends anything
// ---------------------------------------------------------------------------

const noSession = answerFor('no-session');
const notConnected = answerFor('not-connected');
/**
 * How many reads were asked for and answered, so the command count has a number
 * to be compared against. Seven, being the comparison read, three screens and
 * three deep ones. The two refusals below add none.
 */
const READS_ASKED = 7;

if (noSession !== null) {
  step(
    8,
    'a session id no row is held for',
    `mode ${String(noSession.mode)}, machine ${String(noSession.machineId)}, ` +
      `${String(noSession.elapsedMs)} ms, and the machine was up and answering ` +
      `when it was asked, so a command that had been sent would have reached it`
  );
  if (noSession.mode !== 'noSession') {
    fail(
      `a session with no row answered ${String(noSession.mode)}. It answers ` +
        `noSession and sends nothing, and the machine being up while it was ` +
        `asked is what makes that a measurement rather than a coincidence.`
    );
  }
}

if (notConnected !== null) {
  step(
    7,
    'a machine Tortie is not connected to',
    `mode ${String(notConnected.mode)}, ${String(notConnected.elapsedMs)} ms, ` +
      `and the machine was still up and still answering when it was asked`
  );
  if (notConnected.mode !== 'notConnected') {
    fail(
      `a machine Tortie is not connected to answered ` +
        `${String(notConnected.mode)}. It answers notConnected and sends ` +
        `nothing. The machine was still up, so a command that had been sent ` +
        `would have come back with lines.`
    );
  }
}

// The command count is what turns both refusals from a mode word into a
// measurement. It is read out of the far side's own log, so it counts what that
// machine's program received rather than what this end believes it sent.
step(
  '7 and 8',
  'what the two refusals sent',
  `${String(captures.length)} capture-pane command(s) crossed the link for ` +
    `${String(READS_ASKED)} read(s) asked for and answered, so the two ` +
    `refusals sent ${String(captures.length - READS_ASKED)}`
);
if (captures.length !== READS_ASKED) {
  fail(
    `${String(captures.length)} capture-pane command(s) crossed the link. ` +
      `${String(READS_ASKED)} reads were asked for and answered, and the two ` +
      `refusals send nothing, so it is exactly ${String(READS_ASKED)}.`
  );
}

// ---------------------------------------------------------------------------
// Rows 9 and 10
// ---------------------------------------------------------------------------

const historyAfter = historySize();
const farSessionsAfter = farSessions();
step(
  9,
  'the machine across every read',
  `${String(farSessionsBefore)} session(s) before and ` +
    `${String(farSessionsAfter)} after; history_size ${historyBefore} before ` +
    `and ${historyAfter} after`
);
if (historyBefore !== historyAfter || farSessionsBefore !== farSessionsAfter) {
  fail(
    'the machine is not what it was before the reads. A read prints a screen ' +
      'and writes nothing, so neither number may move.'
  );
}

const anyTruncated = [...byName.values()].some((row) => row.truncated === true);
step(
  10,
  'the byte ceiling',
  `it was NOT reached in this run. The largest answer was ` +
    `${String(Math.max(0, ...[...byName.values()].map((r) => Number(r.bytes ?? 0))))} ` +
    `byte(s) against a ceiling of 8388608, and truncated was ` +
    `${String(anyTruncated)} on every read. The cut path is proved by ` +
    `src/main/machines/__tests__/remote-lines.test.ts and by nothing here`
);
if (anyTruncated) {
  fail(
    'a read in this run was cut at the byte ceiling, so row 5 cannot be read ' +
      'as an uncut answer. Read the numbers again by hand.'
  );
}

// ---------------------------------------------------------------------------
// Row 11. The operator's own server, counted and never touched
// ---------------------------------------------------------------------------

stopEverything();

const sessionsAfter = operatorSessions();
step(
  11,
  'the operator’s sessions on -L gmux, after',
  `${sessionsBefore} before, ${sessionsAfter} after`
);
if (sessionsBefore !== sessionsAfter) {
  fail(
    `the operator's session count moved from ${sessionsBefore} to ` +
      `${sessionsAfter}. This probe reads that server and never writes to it.`
  );
}

say(`pids recorded: ${recordedPids.join(', ') || 'none'}`);
say(
  'WHAT THIS DID NOT PROVE. The far side was this Mac over a loopback sign in ' +
    'server. No Linux machine and no machine of the operator’s was contacted, ' +
    'so a foreign tmux is reasoned about rather than measured. Nothing here ' +
    'measured a slow link, nothing here reached the 8,388,608 byte ceiling, ' +
    'and nothing here drew a panel.'
);
if (failures.length > 0) {
  say(`FAILED with ${String(failures.length)} problem(s).`);
  process.exit(1);
}
say('PASS');
process.exit(0);
