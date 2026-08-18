/**
 * `npm run probe:realunknowns`. The five unknowns from research 54 section 7,
 * and the first session Tortie ever created on a machine that is not this one
 * (Phase 83).
 *
 * ---------------------------------------------------------------------------
 * WHAT EACH ANSWER OWES THE READER
 * ---------------------------------------------------------------------------
 * Every answer prints the exact command that produced it and that command's
 * output, verbatim. An answer with no command beside it is not evidence.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER IS LOAD BEARING, AND UNKNOWN 4 IS WHY
 * ---------------------------------------------------------------------------
 * Unknown 4 reads the birth time of the far machine's tmux socket directory and
 * compares it against that machine's last boot. A tmux server started by this
 * probe would CREATE that directory on a machine that has never run tmux, and
 * then the birth time would be this run's own and the comparison would be
 * worthless. So unknown 4 runs first, before anything on the far machine is
 * started, and it reads the directory out of tmux's own refusal on a scratch
 * socket rather than by starting a server.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY ANSWER HERE
 * ---------------------------------------------------------------------------
 *  1. `build/real-machine.mjs` asks the five refusals before anything is
 *     contacted. Two environment variables must agree, `CI` must be unset, the
 *     socket must not be a real one and the host must not be loopback.
 *  2. Every session this probe creates is named `zz-p83-<what it is>-<pid>`, and
 *     the create and the kill both refuse any other name.
 *  3. The far machine's session list is read before anything and after
 *     everything. A difference other than this run's own rows is a failure
 *     whatever else passed.
 *  4. The operator's own server on this Mac is counted before and after with
 *     `list-sessions`, read only.
 *  5. This file sends no `kill-server`, no `pkill` and no `killall`. The
 *     sessions this probe makes are ended one at a time by exact name.
 *
 * ---------------------------------------------------------------------------
 * ONE THING THIS PROBE DOES THAT THE PRODUCT'S EXEC PLANE REFUSES
 * ---------------------------------------------------------------------------
 * It sends `send-keys` and it opens an attach. `src/main/machines/exec-plane.ts`
 * refuses both on the product's one shot door, and it is right to. This is a
 * measuring instrument rather than that door, and typing into a session on
 * another machine and reading the bytes back is the evidence this phase owes.
 * Every one of those calls names a `zz-p83-` session this run created.
 */

import {
  assertReachable,
  closeMaster,
  countOperatorSessions,
  createSession,
  diffSessionLists,
  endRecordedPids,
  farTmux,
  gate,
  hostKeyFileFacts,
  identityFilesLine,
  identityFilesUnmoved,
  killSession,
  listFarSessions,
  makeReporter,
  nowMs,
  paneTarget,
  quoteArg,
  REAL_SOCKET,
  REMOTE_CONF_PATH,
  runOnMachine,
  scratchSocket,
  shellQuoteArgv,
  sleep,
  spawnOnMachine
} from './real-machine.mjs';

const TAG = 'p83-unknowns';
const { step, say, fail, failures } = makeReporter(TAG);

const machine = await gate(TAG);
const pid = String(process.pid);
const name = (what) => `zz-p83-${what}-${pid}`;

say(`the machine is ${machine.host}, resolved to ${machine.addresses.join(', ')}`);
say(`its tmux is ${machine.remoteTmuxPath}, and the run directory is ${machine.runDir}`);

const identityBefore = hostKeyFileFacts();
const operatorBefore = countOperatorSessions();
step(0, "the operator's server on this Mac, before", `${operatorBefore} session(s)`);

// Before any answer is read as a measurement. See the header of
// `assertReachable` in build/real-machine.mjs for why this is its own step.
const reachable = assertReachable(machine);
say(`the connection signed in, exit ${String(reachable.code)}`);

/** Print a command and its answer, so no row is an assertion on its own. */
function show(label, command, out) {
  process.stdout.write(`[${TAG}] ${label}\n`);
  process.stdout.write(`[${TAG}]   $ ${command}\n`);
  const text = out.both.replace(/\n$/, '');
  for (const line of text === '' ? ['(nothing)'] : text.split('\n')) {
    process.stdout.write(`[${TAG}]   ${line}\n`);
  }
  process.stdout.write(`[${TAG}]   exit ${String(out.code)}\n`);
}

const farBefore = listFarSessions(machine, REAL_SOCKET);
step(
  1,
  "the far machine's sessions on socket gmux, before",
  farBefore.names.length === 0
    ? 'no session, and the answer was: ' + (farBefore.out.both.trim() || 'an empty list')
    : `${String(farBefore.names.length)}: ${farBefore.names.join(', ')}`
);

// ===========================================================================
// Unknown 4. What a reboot does to the tmux socket directory on macOS
//
// Nobody reboots the operator's Mac Pro. The branch is closed by comparing the
// directory's birth time against the machine's last boot instead. It runs FIRST
// for the reason in this file's header.
// ===========================================================================

process.stdout.write(`\n[${TAG}] UNKNOWN 4. the tmux socket directory across a reboot\n`);

const probeSocket = scratchSocket(machine, 'sockpath');
const askPath = farTmux(machine, probeSocket, [
  'display-message',
  '-p',
  '#{socket_path}'
]);
show('where a socket on this machine would live', askPath.quoted, askPath);

// tmux names the path in its own refusal when no server is running on that
// socket, so the directory is read without starting anything at all.
const pathFromAnswer = askPath.stdout.trim();
const pathFromRefusal =
  /(?:error connecting to|no server running on)\s+(\S+)/i.exec(askPath.both)?.[1] ?? '';
const socketPath = pathFromAnswer !== '' ? pathFromAnswer : pathFromRefusal;
const socketDir = socketPath === '' ? '' : socketPath.replace(/\/[^/]+$/, '');
step(2, "the far machine's tmux socket directory", socketDir || '(could not be read)');

let unknown4 = 'not settled by this run';
if (socketDir === '') {
  fail('the far machine did not name its tmux socket directory, so unknown 4 is open');
} else {
  const statOut = runOnMachine(
    machine,
    `stat -f '%B %SB %Sc %Sm %N' ${quoteArg(socketDir)}`
  );
  show('when the directory was made', statOut.command, statOut);

  const bootOut = runOnMachine(machine, 'sysctl -n kern.boottime');
  show('when the machine last booted', bootOut.command, bootOut);

  const mountOut = runOnMachine(
    machine,
    'mount | grep -E " on (/private)?/tmp " || echo "(no line for /tmp)"'
  );
  show('whether it is a memory filesystem', mountOut.command, mountOut);

  const listOut = runOnMachine(machine, `ls -la ${quoteArg(socketDir)}`);
  show('what is in it', listOut.command, listOut);

  const birth = Number(statOut.stdout.trim().split(/\s+/)[0] ?? 'x');
  const boot = Number(/sec\s*=\s*(\d+)/.exec(bootOut.stdout)?.[1] ?? 'x');
  if (Number.isFinite(birth) && Number.isFinite(boot)) {
    const deltaSeconds = boot - birth;
    if (birth < boot) {
      unknown4 =
        `the directory survives a reboot. It was made at epoch ${String(birth)} and ` +
        `the machine last booted at epoch ${String(boot)}, so it predates the boot by ` +
        `${String(deltaSeconds)} seconds. Finding 9 of research 54 collapses to its ` +
        'first branch.';
    } else {
      unknown4 =
        `not settled by this run. The directory was made at epoch ${String(birth)} and ` +
        `the machine last booted at epoch ${String(boot)}, so the directory is ` +
        `${String(-deltaSeconds)} seconds newer than the boot. It was made after the ` +
        'last boot, which is what a directory this run created would also look like.';
    }
  } else {
    unknown4 =
      `not settled by this run. The birth time read as "${statOut.stdout.trim()}" and ` +
      `the boot time read as "${bootOut.stdout.trim()}", and at least one of the two ` +
      'is not a number this probe could compare.';
  }
}
step(3, 'unknown 4, the answer', unknown4);

// ===========================================================================
// Unknown 1. What PATH a pane gets on the far machine
// ===========================================================================

process.stdout.write(`\n[${TAG}] UNKNOWN 1. the PATH a pane gets\n`);

const execPath = runOnMachine(machine, 'printenv PATH');
show("the exec plane's PATH", execPath.command, execPath);

const loginPath = runOnMachine(machine, '$SHELL -lc "printenv PATH"');
show("the login shell's PATH", loginPath.command, loginPath);

const pathSession = name('path');
const pathFile = `/tmp/${pathSession}.txt`;
const pathCreate = createSession(machine, {
  socket: REAL_SOCKET,
  name: pathSession,
  argv: ['/bin/sh', '-c', `printenv PATH > ${pathFile}; sleep 20`]
});
show("the pane's session, created", pathCreate.quoted, pathCreate);
await sleep(1500);
const panePathOut = runOnMachine(machine, `cat ${quoteArg(pathFile)}`);
show("the PANE's PATH", panePathOut.command, panePathOut);
const panePath = panePathOut.stdout.trim();
killSession(machine, REAL_SOCKET, pathSession);
runOnMachine(machine, `rm -f ${quoteArg(pathFile)}`);

step(
  4,
  'the three PATH reads',
  `exec ${execPath.stdout.trim() === panePath ? 'equals' : 'differs from'} pane, ` +
    `login ${loginPath.stdout.trim() === panePath ? 'equals' : 'differs from'} pane`
);

/**
 * Every bare name the registry can launch.
 *
 * Copied from the `binaries` lists of the eleven launchable rows in
 * `src/main/agents/registry.ts`, because this lane imports nothing from `src/`.
 * A name added there and not here is a drift a later round has to fix.
 */
const AGENT_BINARIES = [
  'claude',
  'cursor-agent',
  'codex',
  'gemini',
  'droid',
  'codewhale',
  'codew',
  'deepseek',
  'agy',
  'muse',
  'qwen',
  'pi',
  'grok'
];

const lookupScript =
  `PATH=${quoteArg(panePath === '' ? '/usr/bin:/bin' : panePath)}; ` +
  AGENT_BINARIES.map(
    (one) =>
      `printf '%s\\t%s\\n' ${quoteArg(one)} "$(command -v ${quoteArg(one)} 2>/dev/null || echo '(not found)')"`
  ).join('; ');
const lookup = runOnMachine(machine, lookupScript);
process.stdout.write(`\n[${TAG}] which agents a bare name launch would find over there\n`);
process.stdout.write('| agent | what the pane PATH finds |\n| --- | --- |\n');
for (const line of lookup.stdout.split('\n')) {
  if (line.trim() === '') continue;
  const [agent, found] = line.split('\t');
  process.stdout.write(`| ${String(agent)} | ${String(found)} |\n`);
}
const foundCount = lookup.stdout
  .split('\n')
  .filter((line) => line.includes('\t') && !line.includes('(not found)')).length;
step(
  5,
  'unknown 1, the answer',
  `${String(foundCount)} of ${String(AGENT_BINARIES.length)} agent names resolve under the pane's PATH`
);

// ===========================================================================
// Unknown 2. What the far tmux does with a working directory that is not there
// ===========================================================================

process.stdout.write(`\n[${TAG}] UNKNOWN 2. a create against a directory that is not there\n`);

const missingDir = `/zz-p83-there-is-no-such-directory-${pid}`;
const missing = createSession(machine, {
  socket: REAL_SOCKET,
  name: name('nodir'),
  cwd: missingDir
});
show('the create', missing.quoted, missing);

/**
 * The product's own expression, copied from
 * `src/main/machines/remote-sessions.ts:1177`.
 *
 * A change there and not here is a drift a later round has to fix. This lane
 * imports nothing from `src/`, so the literal is copied rather than shared.
 */
const CREATE_FAILURE_RE = /no such file or directory|can't find|not a directory/i;
const matched = CREATE_FAILURE_RE.test(missing.both);

// A create that SUCCEEDS is an answer rather than a harness failure, and it is
// the answer this Mac's own tmux 3.6a gives. MEASURED on 2026-08-18:
// `new-session -d -s <name> -c /a-path-that-is-not-there` exits 0, prints
// nothing and leaves a session behind. If the far machine does the same, the
// product's REMOTE_DIR_MISSING sentence never appears for a missing folder and
// the person gets a session whose pane has already died. The run records that
// and ends the session it made.
let unknown2;
if (missing.code === 0) {
  const survivors = listFarSessions(machine, REAL_SOCKET).names.filter(
    (one) => one === name('nodir')
  );
  unknown2 =
    'the create SUCCEEDED. This tmux does not refuse a working directory that is ' +
    `not there, and it left ${String(survivors.length)} session behind. The product's ` +
    "expression never sees a refusal to match, so Tortie's own sentence about a " +
    'missing folder cannot appear on this machine.';
  if (survivors.length > 0) killSession(machine, REAL_SOCKET, name('nodir'));
} else {
  unknown2 =
    `the create failed with exit ${String(missing.code)}, and the product's expression ` +
    `${matched ? 'MATCHED' : 'DID NOT MATCH'} the text tmux printed.`;
}
step(6, 'unknown 2, the answer', unknown2);
if (missing.code !== 0 && !matched) {
  process.stdout.write(
    `[${TAG}] the exact text the expression did not match, so the next round can widen it:\n` +
      `[${TAG}]   ${missing.both.trim()}\n`
  );
}

// ===========================================================================
// Unknown 3. What #{session_activity} reports
// ===========================================================================

process.stdout.write(`\n[${TAG}] UNKNOWN 3. what #{session_activity} reports\n`);

const actSession = name('activity');
const actCreate = createSession(machine, {
  socket: REAL_SOCKET,
  name: actSession,
  argv: ['/bin/sh']
});
show('the session, created', actCreate.quoted, actCreate);

function readActivity(label) {
  const out = farTmux(machine, REAL_SOCKET, [
    'display-message',
    '-p',
    '-t',
    paneTarget(actSession),
    '#{session_activity}'
  ]);
  const value = out.stdout.trim();
  process.stdout.write(
    `[${TAG}]   ${label}: ${value || '(nothing)'} ` +
      `(this Mac's clock read ${new Date().toISOString()})\n`
  );
  return Number(value);
}

process.stdout.write(
  `[${TAG}]   $ ssh <the nine options> ${machine.host} ` +
    `${machine.remoteTmuxPath} -L ${REAL_SOCKET} -f ${REMOTE_CONF_PATH} ` +
    `display-message -p -t '${paneTarget(actSession)}' '#{session_activity}'\n`
);
const read1 = readActivity('1. right after new-session -d');
await sleep(5000);
const read2 = readActivity('2. after 5 seconds with nothing attached and nothing printing');

farTmux(machine, REAL_SOCKET, [
  'send-keys',
  '-t',
  paneTarget(actSession),
  `echo p83-${pid}-activity`,
  'Enter'
]);
await sleep(2000);
const read3 = readActivity('3. after the pane printed output, with nothing attached');

const attachCall = shellQuoteArgv([
  machine.remoteTmuxPath,
  '-L',
  REAL_SOCKET,
  '-f',
  REMOTE_CONF_PATH,
  '-u',
  'attach-session',
  '-t'
]);
const actAttach = spawnOnMachine(
  machine,
  `${attachCall} '=${actSession}'`,
  ['-tt']
);
await sleep(3000);
const attachedFlag = farTmux(machine, REAL_SOCKET, [
  'display-message',
  '-p',
  '-t',
  paneTarget(actSession),
  '#{session_attached}'
]).stdout.trim();
try {
  actAttach.child.kill('SIGKILL');
} catch {
  /* already gone, which is the state we wanted */
}
await sleep(2000);
const read4 = readActivity('4. after a client attached and detached, with nothing printing');

const movedOnOutput = Number.isFinite(read3) && Number.isFinite(read2) && read3 > read2;
const movedOnAttach = Number.isFinite(read4) && Number.isFinite(read3) && read4 > read3;
let unknown3;
if (movedOnOutput) {
  unknown3 =
    'the field moved when the pane printed with nothing attached, so it is evidence ' +
    'the session printed something. `src/main/machines/remote-sessions.ts:76` is right ' +
    'about this machine and `src/main/activity/panes.ts:11` is wrong about it.';
} else if (movedOnAttach) {
  unknown3 =
    'the field did not move when the pane printed, and it moved when a client attached, ' +
    'so it tracks clients. `src/main/activity/panes.ts:11` is right about this machine ' +
    'and `src/main/machines/remote-sessions.ts:76` is wrong about it.';
} else {
  unknown3 =
    'the field moved on neither the output nor the attach in this run, so neither claim ' +
    'in the tree is supported by it and the question stays open.';
}
step(
  7,
  'unknown 3, the answer',
  `${String(read1)}, ${String(read2)}, ${String(read3)}, ${String(read4)}. ` +
    `The session read attached=${attachedFlag || '(nothing)'} while the client was on. ` +
    unknown3
);

killSession(machine, REAL_SOCKET, actSession);

// ===========================================================================
// Unknown 5. The far side's sshd channel ceiling
// ===========================================================================

process.stdout.write(`\n[${TAG}] UNKNOWN 5. how many channels one connection carries\n`);

// One command first, so the shared connection's master exists and every channel
// below rides the same one.
runOnMachine(machine, 'true');

const CHANNEL_CEILING_TRIES = 16;
const channels = [];
let firstFailure = 0;
let firstFailureText = '';
for (let n = 1; n <= CHANNEL_CEILING_TRIES; n += 1) {
  const one = spawnOnMachine(machine, 'sleep 25');
  channels.push(one);
  const deadline = nowMs() + 2500;
  while (!one.exited && nowMs() < deadline) await sleep(50);
  if (one.exited) {
    firstFailure = n;
    firstFailureText = `${one.stderr.trim() || '(no message)'} , exit ${String(one.code)}`;
    break;
  }
}
for (const one of channels) {
  try {
    one.child.kill('SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}
const ceiling = firstFailure === 0 ? CHANNEL_CEILING_TRIES : firstFailure - 1;
step(
  8,
  'the measured channel ceiling',
  firstFailure === 0
    ? `${String(CHANNEL_CEILING_TRIES)} channels all held, so the ceiling is above ` +
      `${String(CHANNEL_CEILING_TRIES)} and this run did not find it`
    : `channel ${String(firstFailure)} failed, so ${String(ceiling)} held at once. ` +
      `The error was: ${firstFailureText}`
);

const sshdConf = runOnMachine(
  machine,
  'grep -i maxsessions /etc/ssh/sshd_config || echo "(no MaxSessions line in /etc/ssh/sshd_config)"'
);
show('what the configuration file says', sshdConf.command, sshdConf);
const sshdEffective = runOnMachine(
  machine,
  'sshd -T 2>/dev/null | grep -i maxsessions || echo "(sshd -T did not answer, which needs root)"'
);
show('what sshd itself says', sshdEffective.command, sshdEffective);

step(
  9,
  'unknown 5, what it means in the product\'s terms',
  `A machine's steady state is one control child, one attach per visible session and ` +
    `one short lived process per command. With ${String(ceiling)} channels held at once, ` +
    `${String(Math.max(0, ceiling - 2))} sessions can be visible and attached before the ` +
    'next command is refused. The measured number is the answer and the configuration ' +
    'read above is context.'
);

closeMaster(machine);

// ===========================================================================
// The first real session. This has never happened before.
// ===========================================================================

process.stdout.write(`\n[${TAG}] THE FIRST REAL SESSION\n`);

const helloSession = name('hello');
const helloWord = `p83-${pid}-hello`;
const farHome = runOnMachine(machine, 'printf %s "$HOME"').stdout.trim();
const helloCwd = farHome === '' ? '/tmp' : farHome;

const helloCreate = createSession(machine, {
  socket: REAL_SOCKET,
  name: helloSession,
  cwd: helloCwd,
  argv: ['/bin/sh']
});
show(`created ${helloSession} in ${helloCwd}`, helloCreate.quoted, helloCreate);
if (helloCreate.code !== 0) {
  fail(`the session could not be created on ${machine.host}`);
}

const helloAttach = spawnOnMachine(
  machine,
  `${attachCall} '=${helloSession}'`,
  ['-tt']
);
await sleep(3000);
const helloAttached = farTmux(machine, REAL_SOCKET, [
  'display-message',
  '-p',
  '-t',
  paneTarget(helloSession),
  '#{session_attached}'
]).stdout.trim();
step(10, 'the attach carriage', `the session reports session_attached=${helloAttached || '(nothing)'}`);
if (helloAttached !== '1') {
  fail('the attach carriage did not put a client on the session');
}

const typed = farTmux(machine, REAL_SOCKET, [
  'send-keys',
  '-t',
  paneTarget(helloSession),
  `echo ${helloWord}`,
  'Enter'
]);
show('typed into the pane', typed.quoted, typed);
await sleep(2000);

const captured = farTmux(machine, REAL_SOCKET, [
  'capture-pane',
  '-p',
  '-t',
  paneTarget(helloSession)
]);
process.stdout.write(`[${TAG}] the pane's bytes, which is the evidence:\n`);
for (const line of captured.stdout.replace(/\n+$/, '').split('\n')) {
  process.stdout.write(`[${TAG}]   |${line}\n`);
}
const readBack = captured.stdout.includes(helloWord);
step(
  11,
  'the string typed and read back',
  readBack
    ? `"${helloWord}" is in the pane, ${String(Buffer.byteLength(captured.stdout, 'utf8'))} bytes captured`
    : `"${helloWord}" is NOT in the pane`
);
if (!readBack) fail('the string typed into the far pane did not come back');

try {
  helloAttach.child.kill('SIGKILL');
} catch {
  /* already gone, which is the state we wanted */
}
await sleep(500);
killSession(machine, REAL_SOCKET, helloSession);

// ===========================================================================
// Both machines, after
// ===========================================================================

const farAfter = listFarSessions(machine, REAL_SOCKET);
const diff = diffSessionLists(farBefore.names, farAfter.names);
step(
  12,
  "the far machine's sessions on socket gmux, after",
  farAfter.names.length === 0
    ? 'no session, and the answer was: ' + (farAfter.out.both.trim() || 'an empty list')
    : `${String(farAfter.names.length)}: ${farAfter.names.join(', ')}`
);
step(
  13,
  'the difference on the far machine',
  diff.lost.length === 0 && diff.gained.length === 0 && diff.leftBehind.length === 0
    ? 'none. Every name before is a name after, and this probe left nothing behind'
    : `lost ${diff.lost.join(', ') || '(none)'}, gained ${diff.gained.join(', ') || '(none)'}, ` +
      `left behind ${diff.leftBehind.join(', ') || '(none)'}`
);
if (diff.lost.length > 0 || diff.gained.length > 0 || diff.leftBehind.length > 0) {
  fail("the far machine's session list moved");
}

closeMaster(machine);
const ended = endRecordedPids(machine);
step(14, 'the pids this run started and ended', ended.join(', ') || '(none left)');

const operatorAfter = countOperatorSessions();
step(15, "the operator's server on this Mac, after", `${operatorAfter} session(s)`);
if (operatorAfter !== operatorBefore) {
  fail(`the operator's session count moved from ${operatorBefore} to ${operatorAfter}`);
}

const identityAfter = hostKeyFileFacts();
step(
  16,
  'the two identity record files',
  `${identityFilesLine(identityAfter)}, ` +
    (identityFilesUnmoved(identityBefore, identityAfter)
      ? 'both unchanged in size and modification time'
      : 'ONE OF THEM MOVED')
);
if (!identityFilesUnmoved(identityBefore, identityAfter)) {
  fail('an identity record file changed during this run');
}

process.stdout.write(`\n[${TAG}] the five unknowns\n`);
process.stdout.write('| unknown | answer |\n| --- | --- |\n');
process.stdout.write(`| 1, the pane's PATH | ${String(foundCount)} of ${String(AGENT_BINARIES.length)} agent names resolve |\n`);
process.stdout.write(`| 2, a directory that is not there | ${unknown2.split('.')[0]} |\n`);
process.stdout.write(`| 3, #{session_activity} | ${unknown3.split('.')[0]} |\n`);
process.stdout.write(`| 4, the socket directory | ${unknown4.split('.')[0]} |\n`);
process.stdout.write(`| 5, the channel ceiling | ${String(ceiling)} held at once |\n`);

if (failures.length > 0) {
  process.stdout.write(`[${TAG}] FAILED with ${String(failures.length)} problem(s)\n`);
  for (const one of failures) process.stdout.write(`[${TAG}]   ${one}\n`);
  process.exit(1);
}
process.stdout.write(`[${TAG}] PASS\n`);
