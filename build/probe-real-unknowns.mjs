/**
 * `npm run probe:realunknowns`. The five unknowns from research 54 section 7,
 * and the first session Tortie ever created on a machine that is not this one
 * (Phase 83). PHASE 84 ADDED THREE MORE MEASUREMENTS, all of them about finding
 * and starting an agent on that machine:
 *
 *  - the question Phase 72 asked, being `command -v claude` under a login
 *    shell, beside the three list walk Phase 84 replaced it with
 *  - whether `-e PATH=` on a `new-session` line reaches a pane there, and
 *    whether an ordinary `-e` pair does
 *  - the program at the absolute path the walk found, started in a pane, with
 *    `--version` so that no conversation begins and no tokens are spent
 *
 * WHAT IS STILL OWED after a passing run. A full agent session created through
 * the product's own create path on this machine, with its manifest row read
 * back from a fresh handle. This probe holds no manifest and starts no
 * Electron, so it cannot stand in for that. `GMUX_SMOKE=remote-sessions`
 * pointed at this machine is what closes it.
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
// PHASE 84, item 10. Finding an agent on a machine that does not list it
//
// The measurement that forced this phase's largest change, repeated here on the
// machine it was made on, so that a later round reads the number rather than
// the story.
//
// `remoteBinFor` used to ask ONE question, being `"$SHELL" -lc 'command -v
// claude'`. On this machine that prints nothing, because claude lives at
// ~/.local/bin/claude and that folder is on neither the login shell's list nor
// the pane's. So Tortie refused to create a claude session on a machine where
// claude is installed and its own claude sessions were running.
//
// Phase 84 walks three lists instead, being the machine's own login list, the
// agent entry's own folders rebased on that machine's $HOME, and the install
// folders a GUI launched app misses, also rebased. This block runs both
// questions and prints both answers.
// ===========================================================================

process.stdout.write(`\n[${TAG}] PHASE 84. the program search, old question and new\n`);

const farHomeForSearch = runOnMachine(machine, 'printf %s "$HOME"');
show("the machine's own home directory", farHomeForSearch.command, farHomeForSearch);
const searchHome = farHomeForSearch.stdout.trim();

const oldQuestion = runOnMachine(
  machine,
  `"$SHELL" -lc 'printf __TORTIE_PATH__%s__TORTIE_PATH__ "$(command -v claude 2>/dev/null)"'`
);
show('the Phase 72 question, asked as Phase 72 asked it', oldQuestion.command, oldQuestion);
const oldAnswer = (
  /__TORTIE_PATH__(.*?)__TORTIE_PATH__/s.exec(oldQuestion.stdout)?.[1] ?? ''
).trim();

/**
 * The three lists, composed here the way `src/main/machines/remote-argv.ts`
 * composes them. This lane imports nothing from `src/`, so the eight install
 * folders and the one probe folder are copied. A change there and not here is a
 * drift a later round has to fix.
 */
const CLAUDE_PROBE_DIRS = ['~/.claude/local'];
const INSTALL_LEAVES = [
  '~/.local/bin',
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '~/bin',
  '~/.claude/local',
  '~/.npm-global/bin',
  '~/.bun/bin',
  '~/.cursor/bin'
];
const rebase = (one) =>
  one.startsWith('~/') ? `${searchHome}/${one.slice(2)}` : one;
const searchDirs = [];
for (const one of [...CLAUDE_PROBE_DIRS, ...INSTALL_LEAVES]) {
  const dir = rebase(one);
  if (!searchDirs.includes(dir)) searchDirs.push(dir);
}
const searchLogin = loginPath.stdout.trim();

/** The ninth script, copied verbatim from src/main/machines/remote-scripts.ts. */
const PROGRAM_FIND = [
  'set -e',
  'umask 077',
  'n="$1"',
  'p="$2"',
  'x="$3"',
  'f=',
  's=',
  'IFS=:',
  'for d in $p; do',
  '  [ -n "$d" ] || continue',
  '  if [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi',
  'done',
  'if [ -z "$f" ]; then',
  '  for d in $x; do',
  '    [ -n "$d" ] || continue',
  '    if [ -x "$d/$n" ]; then f="$d/$n"; s=install; break; fi',
  '  done',
  'fi',
  "printf '__TORTIE_RUN__%s %s__TORTIE_RUN__\\n' \"${s:-none}\" \"${f:-none}\""
].join('\n');

const newQuestion = runOnMachine(
  machine,
  shellQuoteArgv([
    '/bin/sh',
    '-c',
    PROGRAM_FIND,
    'tortie-program-find',
    'claude',
    searchLogin,
    searchDirs.join(':')
  ])
);
show('the Phase 84 question, over three lists', newQuestion.command, newQuestion);
const newAnswer = (
  /__TORTIE_RUN__(.*?)__TORTIE_RUN__/s.exec(newQuestion.stdout)?.[1] ?? ''
).trim();
const searchedCount = new Set(
  [...searchLogin.split(':'), ...searchDirs].filter((one) => one.length > 0)
).size;

step(
  '5b',
  'the program search, both questions',
  `the Phase 72 question answered ${JSON.stringify(oldAnswer)}. The Phase 84 ` +
    `walk over ${String(searchedCount)} folder(s) answered ` +
    `${JSON.stringify(newAnswer)}.`
);
if (oldAnswer === '' && newAnswer.startsWith('install ')) {
  say(
    `   this is the defect and the fix, on the machine it was found on. The ` +
      `one question found nothing and refused the create. The walk found the ` +
      `program in the install folders.`
  );
}
if (newAnswer === 'none none') {
  fail(
    `the Phase 84 walk found no claude on ${machine.host} in ` +
      `${String(searchedCount)} folder(s), so item 10 is not proven here`
  );
}

// ===========================================================================
// PHASE 84, item 10. Whether -e PATH= reaches a pane on THIS machine
//
// `build/probe-execplane.mjs` step 17c measured this against a loopback
// carriage on this Mac and answered no. This repeats it on the machine the
// phase is for, because the decision it makes is about that machine.
// ===========================================================================

process.stdout.write(`\n[${TAG}] PHASE 84. whether -e PATH= reaches a pane\n`);

const ePathSession = name('epath');
const ePathFile = `/tmp/${ePathSession}.txt`;
const PLANTED = `/p84-planted-${pid}`;
const plantedValue = `${PLANTED}:/usr/bin:/bin`;
const ePathCreate = farTmux(machine, REAL_SOCKET, [
  'new-session',
  '-d',
  '-s',
  ePathSession,
  '-e',
  `PATH=${plantedValue}`,
  '-e',
  `P84_MARKER=planted-${pid}`,
  '--',
  '/bin/sh',
  '-c',
  `printenv PATH > ${ePathFile}; printenv P84_MARKER >> ${ePathFile}; sleep 20`
]);
show('the session, created with two -e pairs', ePathCreate.quoted, ePathCreate);
await sleep(1500);
const ePathRead = runOnMachine(machine, `cat ${quoteArg(ePathFile)}`);
show("the pane's own PATH and marker", ePathRead.command, ePathRead);
const ePathLines = ePathRead.stdout.trim().split('\n');
const panePathValue = ePathLines[0] ?? '';
const paneMarker = ePathLines[1] ?? '';
killSession(machine, REAL_SOCKET, ePathSession);
runOnMachine(machine, `rm -f ${quoteArg(ePathFile)}`);

const eReachesPath = panePathValue === plantedValue;
const eReachesOther = paneMarker === `planted-${pid}`;
step(
  '5c',
  'whether -e reaches a pane, and whether PATH is different',
  `PATH was set to ${JSON.stringify(plantedValue)} and the pane read ` +
    `${JSON.stringify(panePathValue)}. A second pair on the same line read ` +
    `${JSON.stringify(paneMarker)}.`
);
say(
  `   -e PATH= ${eReachesPath ? 'REACHES' : 'does NOT reach'} the pane, and an ` +
    `ordinary -e pair ${eReachesOther ? 'DOES' : 'does not'}. ` +
    `${
      eReachesPath
        ? 'A later round can keep the bare name launch and set the pane PATH.'
        : 'So Phase 84 sends the absolute program path as argv[0], and a ' +
          'pkill -f over that path ON THIS MACHINE matches every durable ' +
          'Tortie agent on it.'
    }`
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
// Unknown 3. Which activity field moves when a detached session prints
// ===========================================================================
//
// PHASE 85 CHANGED THE QUESTION AND THE CALL, and both changes matter.
//
// The question used to be about `#{session_activity}` alone. It is now about
// that field AND `#{window_activity}`, side by side, because Phase 85 moved the
// product's list onto the second one and nobody has read either of them on a
// machine that is not this Mac.
//
// The call used to be `display-message -p -t`. It is now `list-sessions -F`,
// which is the call `src/main/machines/remote-sessions.ts` actually makes. The
// two are not the same call, and Phase 83 answered this question through the
// first one while the product used the second.
//
// MEASURED ON THIS MAC on 2026-08-19, tmux 3.6a, through `list-sessions -F`,
// one detached session with no client attached: `#{session_activity}` read
// 1787111236 at all five readings across 7 seconds and two prints, and
// `#{window_activity}` read 1787111236, 1787111236, 1787111239, 1787111239 and
// 1787111243. THIS PROBE HAS NOT BEEN RUN ON ANY OTHER MACHINE, because this
// Mac holds no key mac-pro trusts. That key is Phase 79.1's work.

process.stdout.write(
  `\n[${TAG}] UNKNOWN 3. which activity field moves when a detached session prints\n`
);

const actSession = name('activity');
const actCreate = createSession(machine, {
  socket: REAL_SOCKET,
  name: actSession,
  argv: ['/bin/sh']
});
show('the session, created', actCreate.quoted, actCreate);

/**
 * Both fields, on one line, through the call the product makes.
 *
 * `#{window_activity}` resolves inside `list-sessions -F` because tmux fills
 * the window from the session's current window, so one command answers both
 * questions and there is no second read to race.
 */
const ACTIVITY_FORMAT =
  '#{q:session_name} #{q:session_activity} #{q:window_activity}';

function readActivity(label) {
  const out = farTmux(machine, REAL_SOCKET, [
    'list-sessions',
    '-F',
    ACTIVITY_FORMAT
  ]);
  const row = out.stdout
    .split('\n')
    .map((one) => one.trim().split(' '))
    .find((parts) => parts[0] === actSession);
  const session = row === undefined ? '' : (row[1] ?? '');
  const window = row === undefined ? '' : (row[2] ?? '');
  process.stdout.write(
    `[${TAG}]   ${label}: session_activity ${session || '(nothing)'}, ` +
      `window_activity ${window || '(nothing)'} ` +
      `(this Mac's clock read ${new Date().toISOString()})\n`
  );
  return { session: Number(session), window: Number(window) };
}

process.stdout.write(
  `[${TAG}]   $ ssh <the nine options> ${machine.host} ` +
    `${machine.remoteTmuxPath} -L ${REAL_SOCKET} -f ${REMOTE_CONF_PATH} ` +
    `list-sessions -F '${ACTIVITY_FORMAT}'\n`
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

const moved = (before, after, field) =>
  Number.isFinite(after[field]) &&
  Number.isFinite(before[field]) &&
  after[field] > before[field];
const windowMovedOnOutput = moved(read2, read3, 'window');
const sessionMovedOnOutput = moved(read2, read3, 'session');
const sessionMovedOnAttach = moved(read3, read4, 'session');
let unknown3;
if (windowMovedOnOutput && !sessionMovedOnOutput) {
  unknown3 =
    'window_activity moved when the pane printed with nothing attached and ' +
    'session_activity did not, which is what this Mac reads and what Phase 85 ' +
    'shipped. The product reads the right field on this machine.';
} else if (windowMovedOnOutput && sessionMovedOnOutput) {
  unknown3 =
    'BOTH fields moved when the pane printed with nothing attached, which this ' +
    'Mac does not do. The product still reads the right field, and the ' +
    'difference between the two machines is worth recording.';
} else if (sessionMovedOnAttach) {
  unknown3 =
    'window_activity did NOT move when the pane printed, and session_activity ' +
    'moved when a client attached, so on this machine neither field reports ' +
    'output while detached. Phase 85 would be wrong here and the row would ' +
    'never read running.';
} else {
  unknown3 =
    'neither field moved on the output and neither moved on the attach in this ' +
    'run, so this run supports no claim about either and the question stays open.';
}
const pair = (one) => `${String(one.session)}/${String(one.window)}`;
step(
  7,
  'unknown 3, the answer',
  `session_activity/window_activity at the four readings: ${pair(read1)}, ` +
    `${pair(read2)}, ${pair(read3)}, ${pair(read4)}. ` +
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
// PHASE 84, item 10. The launch shape this phase composes, run on this machine
//
// WHAT THIS PROVES AND WHAT IT DOES NOT. It starts the program at the absolute
// path the walk above found, in a pane on this machine, and reads back what it
// printed. That is the launch shape Phase 84 composes, and it is the shape a
// bare name launch cannot produce here. It does NOT start a conversation and it
// spends no tokens: the argument is `--version`.
//
// A FULL AGENT SESSION ON THIS MACHINE, created through the product's own
// create path with its manifest row read back, is OWED to the live
// `GMUX_SMOKE=remote-sessions` run pointed at this machine. This probe holds no
// manifest and starts no Electron, so it cannot stand in for that.
// ===========================================================================

if (newAnswer.startsWith('path ') || newAnswer.startsWith('install ')) {
  process.stdout.write(`\n[${TAG}] PHASE 84. the launch shape, run here\n`);
  const claudePath = newAnswer.slice(newAnswer.indexOf(' ') + 1);
  const shapeSession = name('shape');
  const shapeFile = `/tmp/${shapeSession}.txt`;
  const shapeCreate = createSession(machine, {
    socket: REAL_SOCKET,
    name: shapeSession,
    argv: ['/bin/sh', '-c', `${quoteArg(claudePath)} --version > ${shapeFile} 2>&1; sleep 20`]
  });
  show(`created ${shapeSession} launching ${claudePath}`, shapeCreate.quoted, shapeCreate);
  await sleep(4000);
  const shapeRead = runOnMachine(machine, `cat ${quoteArg(shapeFile)}`);
  show('what the program printed', shapeRead.command, shapeRead);
  killSession(machine, REAL_SOCKET, shapeSession);
  runOnMachine(machine, `rm -f ${quoteArg(shapeFile)}`);
  const printed = shapeRead.stdout.trim();
  step(
    '11b',
    'the absolute path Phase 84 puts at argv[0], started in a pane here',
    printed === ''
      ? `${claudePath} printed nothing, so the launch shape is NOT proven`
      : `${claudePath} printed ${JSON.stringify(printed)}`
  );
  if (printed === '') {
    fail(
      `the program at ${claudePath} printed nothing when started in a pane on ` +
        `${machine.host}, so item 10's launch shape is not proven here`
    );
  }
  say(
    `   a bare name launch could not have produced this, because the pane's ` +
      `own list of folders is ${JSON.stringify(panePath)} and the program is ` +
      `at ${claudePath}.`
  );
}

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
process.stdout.write(
  `| 3, which activity field moves | ${unknown3.split('.')[0]} |\n`
);
process.stdout.write(`| 4, the socket directory | ${unknown4.split('.')[0]} |\n`);
process.stdout.write(`| 5, the channel ceiling | ${String(ceiling)} held at once |\n`);

process.stdout.write(`\n[${TAG}] what Phase 84 measured here\n`);
process.stdout.write('| question | answer |\n| --- | --- |\n');
process.stdout.write(
  `| the Phase 72 question, command -v claude | ${oldAnswer === '' ? '(nothing)' : oldAnswer} |\n`
);
process.stdout.write(
  `| the Phase 84 walk, over ${String(searchedCount)} folders | ${newAnswer} |\n`
);
process.stdout.write(
  `| does -e PATH= reach a pane | ${eReachesPath ? 'yes' : 'NO'} |\n`
);
process.stdout.write(
  `| does an ordinary -e pair reach a pane | ${eReachesOther ? 'yes' : 'NO'} |\n`
);

if (failures.length > 0) {
  process.stdout.write(`[${TAG}] FAILED with ${String(failures.length)} problem(s)\n`);
  for (const one of failures) process.stdout.write(`[${TAG}]   ${one}\n`);
  process.exit(1);
}
process.stdout.write(`[${TAG}] PASS\n`);
