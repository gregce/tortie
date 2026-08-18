/**
 * `npm run probe:realmachine`. The four exec shapes and the eight control mode
 * steps, measured against a real second machine (Phase 83).
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS DIFFERENT FROM EVERY REMOTE PROBE BEFORE IT
 * ---------------------------------------------------------------------------
 * `build/probe-execplane.mjs` and `build/probe-control-dialect.mjs` measure the
 * same shapes against a loopback sshd whose far side is this Mac. This one
 * measures them against a machine somebody else's kernel is running. It prints
 * one table with a number on every row, and beside each row the answer BUILDER A
 * measured locally for the same tmux version, read from the file
 * `GMUX_P83_LOCAL` names. A difference is printed as a difference. Nothing is
 * smoothed over.
 *
 * ---------------------------------------------------------------------------
 * WHICH TMUX IS THE CLIENT, AND THE SPEC SENTENCE THIS CORRECTS
 * ---------------------------------------------------------------------------
 * The phase spec says the control mode client is the shipping 3.7b. On a real
 * machine that is not what happens and it cannot be.
 * `src/main/machines/control-plane.ts` composes the control carriage as
 *
 *     <ssh> <the nine options> <host> \
 *       '<that machine's tmux> -L <socket> -f /dev/null -C new-session -A -s gmux-control'
 *
 * so BOTH ends of the control mode conversation are the far machine's own tmux.
 * Tortie ships no client to another machine. This probe therefore measures the
 * far pair, which is the pair the product meets. The local 3.7b client against a
 * 3.7c server is BUILDER A's loopback measurement and it stays that.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT HERE
 * ---------------------------------------------------------------------------
 *  1. `build/real-machine.mjs` asks the five refusals before anything is
 *     contacted. Two environment variables must agree, `CI` must be unset, the
 *     socket must not be a real one and the host must not be loopback.
 *  2. THIS PROBE STARTS NOTHING ON SOCKET `gmux`. It reads that socket's session
 *     list before anything and after everything and it never writes to it. Every
 *     shape and every step runs on one scratch socket over there, composed by
 *     `scratchSocket` in `build/real-machine.mjs`.
 *  3. The two lists are compared. A difference other than this run's own
 *     `zz-p83-` rows is a failure whatever else passed, and this probe expects
 *     no difference at all because it creates nothing on that socket.
 *  4. The operator's own server on this Mac is counted before and after with
 *     `list-sessions`, read only.
 *
 * ---------------------------------------------------------------------------
 * THE ONE `kill-server` IN THIS FILE
 * ---------------------------------------------------------------------------
 * This file SENDS `kill-server` from exactly one call site, at control step 7,
 * which is the step that measures what the far side says when its server ends.
 * The word appears elsewhere in this file only in this header and in the comment
 * beside that call. The socket argument is `farSocket`, which `scratchSocket`
 * composed. That name can never be `gmux` or `default`, because every name the
 * composer builds starts `p83-` and the composer asks `refuseRealSockets`
 * anyway. Read the composer rather than trusting this sentence. This carriage
 * sends no `pkill` and no `killall`.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER OF THE SHAPES IS DELIBERATE
 * ---------------------------------------------------------------------------
 * Shape 5, a socket with no server on it, runs on `farSocket` BEFORE the server
 * is started there. That is the only moment such a socket exists in this run, so
 * measuring it first is what lets the whole probe use one socket and end it with
 * one `kill-server`.
 */

import {
  assertReachable,
  closeMaster,
  countOperatorSessions,
  createSession,
  diffSessionLists,
  drain,
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
  quoteArg,
  readLocalAnswers,
  REAL_SOCKET,
  REMOTE_CONF_PATH,
  REMOTE_LIST_FORMAT,
  scratchSocket,
  send,
  shellQuoteArgv,
  sleep,
  spawnOnMachine,
  waitFor,
  waitForLines
} from './real-machine.mjs';

const TAG = 'p83-machine';
const { step, say, fail, failures } = makeReporter(TAG);

const machine = await gate(TAG);

say(`the machine is ${machine.host}, resolved to ${machine.addresses.join(', ')}`);
say(`its tmux is ${machine.remoteTmuxPath}, and the run directory is ${machine.runDir}`);

const identityBefore = hostKeyFileFacts();
const operatorBefore = countOperatorSessions();
step(1, "the operator's server on this Mac, before", `${operatorBefore} session(s)`);

const local = readLocalAnswers(machine);
const localNote =
  local === null
    ? 'not supplied. Set GMUX_P83_LOCAL to ' +
      'docs/research/assets/phase83/p83-local-3.7c.json.'
    : `${String(local.version ?? '?')} measured on ${String(local.measuredAt ?? '?')}, ` +
      `client ${String(local.client ?? '?')}`;
say(`BUILDER A's local answers: ${localNote}`);

// Before any answer is read as a measurement. A command that could not sign in
// exits 255 with empty stdout, and an empty list reads exactly like a machine
// holding no sessions.
const reachable = assertReachable(machine);
say(`the connection signed in, exit ${String(reachable.code)}`);

const farBefore = listFarSessions(machine, REAL_SOCKET);
if (
  farBefore.out.code !== 0 &&
  !/no server running|error connecting to/i.test(farBefore.out.both)
) {
  fail(
    "the far machine's session list could not be read: exit " +
      `${String(farBefore.out.code)}, ${farBefore.out.both.trim()}`
  );
}
step(
  2,
  "the far machine's sessions on socket gmux, before",
  farBefore.names.length === 0
    ? 'no session, and the answer was: ' + (farBefore.out.both.trim() || 'an empty list')
    : `${String(farBefore.names.length)}: ${farBefore.names.join(', ')}`
);

const farSocket = scratchSocket(machine, 'ctl');
say(`every shape and every step runs on the far machine's scratch socket ${farSocket}`);

// ---------------------------------------------------------------------------
// The four exec shapes
// ---------------------------------------------------------------------------

const execRows = [];
const addExec = (n, name, farAnswer, localKey) => {
  const localAnswer =
    local === null || local.exec === undefined || local.exec[localKey] === undefined
      ? 'not supplied'
      : typeof local.exec[localKey] === 'object'
        ? JSON.stringify(local.exec[localKey])
        : String(local.exec[localKey]);
  execRows.push({ n, name, farAnswer, localAnswer });
  step(
    n,
    name,
    `far: ${farAnswer.replace(/\n/g, '\\n')} | local 3.7c: ${localAnswer.replace(/\n/g, '\\n')}`
  );
};

// Shape 4 first, because this is the one moment the scratch socket has no
// server on it.
const noServer = farTmux(machine, farSocket, ['list-sessions', '-F', '#{session_id}']);
addExec(
  3,
  'a socket with no server on it',
  `exit ${String(noServer.code)}, ${noServer.both.trim()}`,
  'noServer'
);

// The server is created and its exit-empty is turned off in ONE call, for the
// reason measured in src/main/machines/exec-plane.ts: a server made with
// -f /dev/null defaults exit-empty to on and ends itself at zero sessions.
const born = farTmux(machine, farSocket, [
  'start-server',
  ';',
  'set-option',
  '-s',
  'exit-empty',
  'off'
]);
if (born.code !== 0) {
  fail(`a server could not be started on ${farSocket}: ${born.both.trim()}`);
}

const listed = farTmux(machine, farSocket, ['list-sessions', '-F', REMOTE_LIST_FORMAT]);
addExec(
  4,
  "list-sessions -F with the product's own format on an empty server",
  `exit ${String(listed.code)}, ` +
    `${String(listed.stdout.split('\n').filter((l) => l !== '').length)} row(s)` +
    (listed.stderr.trim() === '' ? '' : `, stderr ${listed.stderr.trim()}`),
  'listSessions'
);

const version = farTmux(machine, farSocket, ['display-message', '-p', '#{version}']);
const farVersion = version.stdout.trim();
addExec(
  5,
  "display-message -p '#{version}'",
  `exit ${String(version.code)}, ${farVersion === '' ? '(nothing)' : farVersion}`,
  'displayMessageVersion'
);
if (farVersion === '') {
  fail('the far machine did not print a tmux version, so nothing below can be trusted');
}

const history = farTmux(machine, farSocket, ['show-options', '-gv', 'history-limit']);
addExec(
  6,
  'show-options -gv history-limit',
  `exit ${String(history.code)}, ${history.stdout.trim() || '(nothing)'}`,
  'showOptions'
);

// ---------------------------------------------------------------------------
// The eight control mode steps
// ---------------------------------------------------------------------------

const CONTROL_SESSION_NAME = 'gmux-control';

/** Replace the three values two servers can never print alike. */
function normalize(text) {
  return text
    .replace(/\b1[0-9]{9}\b/g, '<epoch>')
    .replace(/\$\d+/g, '$N')
    .replace(/@\d+/g, '@N')
    .replace(/%\d+/g, '%N');
}

const GUARD_RE = /^%(begin|end|error) (\d+) (\d+) (\d+)$/;

/**
 * The notifications `src/main/tmux/control-parser.ts` gives a named arm.
 * Copied rather than imported, because this lane imports nothing from `src/`.
 */
const PARSED_NOTIFICATIONS = new Set([
  'sessions-changed',
  'session-changed',
  'session-renamed',
  'session-window-changed',
  'output',
  'exit'
]);

function notificationNames(lines) {
  return lines
    .filter((line) => line.startsWith('%'))
    .map((line) => line.slice(1).split(' ')[0] ?? '')
    .filter((one) => PARSED_NOTIFICATIONS.has(one));
}

const controlCall = shellQuoteArgv([
  machine.remoteTmuxPath,
  '-L',
  farSocket,
  '-f',
  REMOTE_CONF_PATH,
  '-C',
  'new-session',
  '-A',
  '-s',
  CONTROL_SESSION_NAME
]);
say(`the control child is: ssh <the nine options> ${machine.host} ${controlCall}`);
const control = spawnOnMachine(machine, controlCall);

const controlRows = [];
const addControl = (n, name, farAnswer) => {
  const measured =
    local === null || !Array.isArray(local.control)
      ? undefined
      : local.control.find((one) => Number(one.step) === n);
  const localAnswer =
    measured === undefined
      ? 'not supplied'
      : `${measured.matched === true ? 'matched' : 'did not match'}, ` +
        `${String(measured.bytes ?? '').replace(/\n/g, '\\n')}`;
  controlRows.push({ n, name, farAnswer, localAnswer });
  step(
    6 + n,
    `control step ${String(n)}, ${name}`,
    `far: ${farAnswer.replace(/\n/g, '\\n')} | local 3.7c: ${localAnswer}`
  );
};

// Step 1. The greeting, which the attach itself emits before any command.
const greetingStart = nowMs();
const gotGreeting = await waitForLines(control, 2, 15_000);
await sleep(800);
const greetingMs = nowMs() - greetingStart;
if (!gotGreeting) {
  fail(
    'the far machine sent no control mode greeting within 15,000 ms. stderr: ' +
      `${control.stderr.trim() || '(none)'}`
  );
}
const greeting = drain(control);
addControl(
  1,
  'the greeting',
  `${String(greeting.length)} line(s) after ${String(greetingMs)} ms: ` +
    normalize(greeting.join('\n'))
);

// Step 2. refresh-client -f no-output, the first command the client sends.
send(control, 'refresh-client -f no-output');
await waitFor(control, (line) => line.startsWith('%end') || line.startsWith('%error'));
const noOutputBlock = drain(control);
addControl(2, 'the no output block', normalize(noOutputBlock.join('\n')));

// Step 3. The guard shape.
const guards = greeting.concat(noOutputBlock).filter((line) => GUARD_RE.test(line));
addControl(
  3,
  'the guard shape',
  guards.length === 0
    ? 'no guard line at all'
    : guards
        .map((line) => {
          const g = GUARD_RE.exec(line);
          return `%${String(g?.[1])} <n> <n> ${String(g?.[4])}`;
        })
        .join(' | ')
);

// Steps 4, 5 and 6. A create, a rename, a window and a kill, each driven by a
// SECOND client on the same server, so the notifications are the asynchronous
// ones a real event bus receives rather than answers to our own commands.
const worker = `zz-p83-worker-${String(process.pid)}`;
createSession(machine, { socket: farSocket, name: worker });
await sleep(700);
const onCreate = drain(control);

const renamed = `${worker}-2`;
farTmux(machine, farSocket, ['rename-session', '-t', `=${worker}`, renamed]);
await sleep(700);
const onRename = drain(control);
const renamedLine = onRename.find((l) => l.startsWith('%session-renamed')) ?? '';

farTmux(machine, farSocket, ['new-window', '-t', `=${renamed}`]);
await sleep(700);
const windowTraffic = drain(control);

// Step 9. One list over the control connection, and the same list over the one
// shot door, compared byte for byte.
send(control, `list-sessions -F ${quoteArg(REMOTE_LIST_FORMAT)}`);
await waitFor(control, (line) => line.startsWith('%end') || line.startsWith('%error'));
const listBlock = drain(control);
const listOverControl = listBlock.filter((line) => !line.startsWith('%')).join('\n');
const listOverExec = farTmux(machine, farSocket, [
  'list-sessions',
  '-F',
  REMOTE_LIST_FORMAT
]).stdout.replace(/\n$/, '');

killSession(machine, farSocket, renamed);
await sleep(700);
const onKill = drain(control);

addControl(
  4,
  'the notifications on a create, a rename and a kill',
  `create ${notificationNames(onCreate).join(',') || '(none)'} | ` +
    `rename ${notificationNames(onRename).join(',') || '(none)'} | ` +
    `kill ${notificationNames(onKill).join(',') || '(none)'}`
);
addControl(
  5,
  'the rename argument order',
  renamedLine === '' ? 'no %session-renamed line' : normalize(renamedLine)
);
addControl(6, 'the window traffic', notificationNames(windowTraffic).join(',') || '(none)');

addControl(
  9,
  'the list over control against the list over exec',
  listOverControl === listOverExec
    ? `identical, ${String(Buffer.byteLength(listOverControl, 'utf8'))} bytes`
    : `DIFFERENT. control: ${normalize(listOverControl)} | exec: ${normalize(listOverExec)}`
);
if (listOverControl !== listOverExec) {
  fail('the same list read two ways on the same machine did not match byte for byte');
}

// Step 7. %exit and its reason when the far side's server is ended.
//
// THE ONE `kill-server` IN THIS FILE. Its socket is `farSocket`, which
// `scratchSocket` composed and which starts `p83-`. The composer refuses `gmux`
// and `default` by name.
const killedAt = nowMs();
farTmux(machine, farSocket, ['kill-server']);
const exitLine = await waitFor(control, (line) => line.startsWith('%exit'), 10_000);
const exitAfterMs = nowMs() - killedAt;
addControl(
  7,
  'the exit line',
  exitLine === null
    ? 'no %exit line arrived within 10,000 ms'
    : `${normalize(exitLine)} after ${String(exitAfterMs)} ms`
);

await sleep(400);
if (!control.exited) {
  try {
    control.child.kill('SIGKILL');
  } catch {
    /* already gone, which is the state we wanted */
  }
}

// ---------------------------------------------------------------------------
// Both machines, after
// ---------------------------------------------------------------------------

const farAfter = listFarSessions(machine, REAL_SOCKET);
const diff = diffSessionLists(farBefore.names, farAfter.names);
step(
  16,
  "the far machine's sessions on socket gmux, after",
  farAfter.names.length === 0
    ? 'no session, and the answer was: ' + (farAfter.out.both.trim() || 'an empty list')
    : `${String(farAfter.names.length)}: ${farAfter.names.join(', ')}`
);
step(
  17,
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
step(18, 'the pids this run started and ended', ended.join(', ') || '(none left)');

const operatorAfter = countOperatorSessions();
step(19, "the operator's server on this Mac, after", `${operatorAfter} session(s)`);
if (operatorAfter !== operatorBefore) {
  fail(`the operator's session count moved from ${operatorBefore} to ${operatorAfter}`);
}

const identityAfter = hostKeyFileFacts();
step(
  20,
  'the two identity record files',
  `${identityFilesLine(identityAfter)}, ` +
    (identityFilesUnmoved(identityBefore, identityAfter)
      ? 'both unchanged in size and modification time'
      : 'ONE OF THEM MOVED')
);
if (!identityFilesUnmoved(identityBefore, identityAfter)) {
  fail('an identity record file changed during this run');
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

process.stdout.write(`\n[${TAG}] the four exec shapes\n`);
process.stdout.write('| # | shape | mac-pro | local 3.7c |\n| --- | --- | --- | --- |\n');
for (const row of execRows) {
  process.stdout.write(
    `| ${String(row.n)} | ${row.name} | ${row.farAnswer.replace(/\n/g, ' ')} | ` +
      `${row.localAnswer.replace(/\n/g, ' ')} |\n`
  );
}

process.stdout.write(`\n[${TAG}] the eight control mode steps\n`);
process.stdout.write('| step | what | mac-pro | local 3.7c |\n| --- | --- | --- | --- |\n');
for (const row of controlRows) {
  process.stdout.write(
    `| ${String(row.n)} | ${row.name} | ${row.farAnswer.replace(/\n/g, ' ')} | ` +
      `${row.localAnswer.replace(/\n/g, ' ')} |\n`
  );
}

process.stdout.write(
  `\n[${TAG}] the far machine reports tmux ${farVersion || '(unreadable)'}. Both ends of ` +
    "the control mode conversation are that machine's own tmux, because Tortie ships no " +
    'client to another machine.\n'
);

if (failures.length > 0) {
  process.stdout.write(`[${TAG}] FAILED with ${String(failures.length)} problem(s)\n`);
  for (const one of failures) process.stdout.write(`[${TAG}]   ${one}\n`);
  process.exit(1);
}
process.stdout.write(`[${TAG}] PASS\n`);
