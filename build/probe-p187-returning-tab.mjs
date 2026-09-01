#!/usr/bin/env node
/**
 * probe-p187-returning-tab.mjs. The Phase 187 REPRODUCTION.
 *
 * The operator reported that closing a remote machine tab tends to bring it
 * back at least once. That word, INTERMITTENT, is the whole reason this file
 * exists: one close proves nothing either way, so this probe closes a remote
 * session many times, counts how many came back, and records HOW MANY SECONDS
 * after the close each return happened. That number is what chooses between the
 * five candidates in the Phase 187 backlog entry, because seconds point at the
 * 5,000 ms session list and minutes point at the 300,000 ms store sync.
 *
 * It changes no product code and it reads main's own truth through the product's
 * own bridge, so nothing here can flatter the result.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT IN THIS FILE
 * ---------------------------------------------------------------------------
 * IN THIS HARNESS THE REMOTE MACHINE IS THIS MAC. A remote command reaching
 * `tmux -L gmux` would land on the server holding the operator's live sessions.
 *
 *  1. It refuses to start when the socket it would use is `gmux` or `default`.
 *  2. It starts its OWN sshd on 127.0.0.1 on a high port with its OWN keys and
 *     its OWN ssh agent, through build/scratch-machine.mjs, exactly as Phase 173
 *     established. NO MACHINE OF THE OPERATOR'S IS EVER CONTACTED. `~/.ssh` is
 *     never written and nothing is ever added to his agent.
 *  3. The machine gets its own `TMUX_TMPDIR`, so its tmux server is a different
 *     server from this Mac's.
 *  4. Every Electron goes through build/electron-run.mjs on this run's own
 *     profile, which is outside the repository and outside the person's home.
 *  5. It kills only pids it recorded. There is no pkill and no kill-server.
 *  6. The operator's own server is read before and after, read only, by
 *     `list-sessions` alone, and the count must be identical.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DRIVES
 * ---------------------------------------------------------------------------
 *   calibration  one session is killed ON THE MACHINE, out of band, and the
 *                wait until main notices is the observed list cadence
 *   arm END      N closes of a live remote session through `sessions:kill`,
 *                which is what the tab's x does to a running session
 *   arm REMOVE   N closes followed by the second click, `sessions:discard`,
 *                which is what the x does to a session that has ended
 *   arm RACE     the close happening while a list issued BEFORE it is still on
 *                the wire, which is the candidate the entry named first. The
 *                list alone is made slow on the machine and it is put in flight
 *                by a second session appearing there out of band, so the window
 *                is a machine at the end of a slow link rather than a lucky
 *                millisecond. Added by the second fix round, which found the
 *                first one had left this shape open: 200 of 200 lives came back
 *                at that round's HEAD and at its parent alike
 *   tail         one long watch over every id closed in the run, so a return
 *                that arrives MINUTES later is seen as well as one that
 *                arrives seconds later
 *
 * After every close the far machine is asked DIRECTLY, over its own ssh, read
 * only, whether the tmux session is still there. That is what separates
 * candidate 1, a stale list returning, from candidate 2, a close that never
 * reached the far side.
 *
 * Usage:
 *   node build/probe-p187-returning-tab.mjs [--trials N] [--watch MS]
 *                                           [--tail MS] [--json PATH] [--keep]
 *                                           [--slow MS] [--slow-list MS]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, createWriteStream, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';
import { wsConnect, cdpEval } from './cdp-client.mjs';
import { pickRendererTarget } from './cdp-target.mjs';
import {
  refuseRealSockets,
  scratchMachine,
  scratchYard
} from './scratch-machine.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p187]';
const say = (t) => process.stdout.write(`${TAG} ${t}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Rule 1. Refuse the two sockets nobody may touch, by name, before anything
// ---------------------------------------------------------------------------

const SOCKET = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p187-${String(process.pid)}`;
refuseRealSockets(SOCKET, 'p187');

function parseArgs(argv) {
  const out = {
    trials: 20,
    watchMs: 20_000,
    tailMs: 400_000,
    json: null,
    keep: false,
    slowMs: 0,
    slowListMs: 4_000
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--trials') out.trials = Number(argv[(i += 1)]);
    else if (argv[i] === '--watch') out.watchMs = Number(argv[(i += 1)]);
    else if (argv[i] === '--tail') out.tailMs = Number(argv[(i += 1)]);
    else if (argv[i] === '--json') out.json = argv[(i += 1)];
    else if (argv[i] === '--keep') out.keep = true;
    else if (argv[i] === '--slow') out.slowMs = Number(argv[(i += 1)]);
    else if (argv[i] === '--slow-list') out.slowListMs = Number(argv[(i += 1)]);
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

const SCRATCH =
  process.env['P187_SCRATCH'] ??
  '/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p187';
const root = join(SCRATCH, `run-${String(process.pid)}`);
const profile = join(root, 'profile');
const configDir = join(profile, 'gmux', 'config');
const appLog = join(root, 'app.log');
const farProject = join(root, 'far-project');
mkdirSync(configDir, { recursive: true });
mkdirSync(farProject, { recursive: true });

// ---------------------------------------------------------------------------
// The operator's own server, read only, counted before and after
// ---------------------------------------------------------------------------

function operatorSessionCount() {
  const out = spawnSync('/bin/sh', ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'], {
    encoding: 'utf8'
  });
  return Number((out.stdout ?? '-1').trim());
}

// ---------------------------------------------------------------------------
// The machine
// ---------------------------------------------------------------------------

const recordedPids = [];
const record = (pid) => {
  if (typeof pid === 'number' && Number.isFinite(pid)) recordedPids.push(pid);
};

const yard = scratchYard({ root, prefix: 'p187', record });
if (yard.authSock === '') {
  process.stderr.write(`${TAG} no ssh agent holds this run's key, so nothing could sign in.\n`);
  process.exit(1);
}
const machine = scratchMachine(yard, { id: 'one', port: 39_000 + (process.pid % 2000) });

/**
 * The program the machine's tmux commands run through.
 *
 * With `--slow N` it is a wrapper that waits N milliseconds and then runs the
 * real tmux. It is HOW THIS PROBE STANDS IN FOR A MACHINE THAT IS NOT ON THE
 * LOOPBACK ADDRESS. Every candidate in the Phase 187 entry that is a race is a
 * race against a round trip, and a round trip on 127.0.0.1 is about a hundredth
 * of the one to a machine over a tailnet. A rate measured only at loopback speed
 * would say the defect does not exist when what it means is that the window is
 * too narrow to hit. It changes nothing in Tortie: the wrapper is a program on
 * the far machine, which is what `remoteTmuxPath` names.
 */
function farTmuxProgram(slowMs) {
  if (slowMs <= 0 && args.slowListMs <= 0) return yard.tmuxPath;
  const path = join(root, 'slow-tmux');
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      // Every command, when --slow is on. This is the round trip stand in.
      ...(slowMs > 0 ? [`/bin/sleep ${String(slowMs / 1000)}`] : []),
      // THE LIST ALONE, and only while the marker file is there. See
      // {@link SLOW_LIST_MARKER}.
      //
      // THE SLEEP IS AFTER THE LIST RUNS, and that is the whole point rather
      // than a detail. Sleeping first and listing afterwards makes a list that
      // is merely LATE, and its answer describes the machine at the moment it
      // finally ran, so it holds no session the close had already ended. The
      // defect is an answer that is STALE: taken before the close and delivered
      // after it. So the list runs at once, its output is held, and the delivery
      // is what waits. The first version of this wrapper slept first, and the
      // arm reported zero returns at the parent commit, which is a probe passing
      // because it was not driving the thing it named.
      ...(args.slowListMs > 0
        ? [
            `if [ -f ${SLOW_LIST_MARKER} ]; then`,
            '  case " $* " in',
            '    *" list-sessions "*)',
            `      out=$(${yard.tmuxPath} "$@"); rc=$?`,
            `      /bin/sleep ${String(args.slowListMs / 1000)}`,
            `      printf '%s\\n' "$out"`,
            '      exit $rc',
            '      ;;',
            '  esac',
            'fi'
          ]
        : []),
      `exec ${yard.tmuxPath} "$@"`,
      ''
    ].join('\n'),
    'utf8'
  );
  chmodSync(path, 0o755);
  return path;
}

/**
 * While this file exists, and only while it exists, a `list-sessions` on the
 * machine takes `--slow-list` milliseconds and every other command is unchanged.
 *
 * IT IS WHAT MAKES THE RACE ARM DETERMINISTIC RATHER THAN LUCKY. The defect is a
 * list ISSUED BEFORE a close answering AFTER it, and on the loopback address a
 * list answers in about a hundredth of the time it takes over a tailnet, so the
 * window a person meets on a real machine is one this Mac cannot reproduce by
 * waiting. Slowing every command instead, which is what `--slow` does, does not
 * help: the End and the poll it runs afterwards get slower with it, so the close
 * never lands inside the window. Slowing the LIST alone is the far side being
 * slow to answer a question, which is exactly the shape of a machine at the end
 * of a slow link, and nothing in Tortie is changed to produce it.
 */
const SLOW_LIST_MARKER = join(root, 'slow-list-on');

/** Ask the far machine directly, read only, which sessions its server holds. */
function farSessions() {
  const out = spawnSync(
    '/usr/bin/ssh',
    [
      '-p', String(machine.port),
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
      `${yard.user}@127.0.0.1`,
      `${yard.tmuxPath} -L ${SOCKET} -f /dev/null list-sessions -F '#{session_id} #{session_name}' 2>/dev/null || true`
    ],
    { encoding: 'utf8', timeout: 20_000, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
  );
  return (out.stdout ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
}

/** Kill one session ON THE MACHINE, out of band of the product. Calibration only. */
function farKill(tmuxId) {
  spawnSync(
    '/usr/bin/ssh',
    [
      '-p', String(machine.port),
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
      `${yard.user}@127.0.0.1`,
      `${yard.tmuxPath} -L ${SOCKET} -f /dev/null kill-session -t '${tmuxId}'`
    ],
    { encoding: 'utf8', timeout: 20_000, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
  );
}

/**
 * Run one tmux command ON THE MACHINE, on this run's own scratch socket.
 *
 * It is used by the GHOST arm to put the machine into a state it can genuinely
 * be in, being a session that went away and came back under the same
 * `@gmux-id`. That is what Tortie's own remote restore does. Only this run's own
 * scratch socket is ever named, and `refuseRealSockets` above has already
 * refused the two real ones.
 */
function farTmux(argvLine) {
  const out = spawnSync(
    '/usr/bin/ssh',
    [
      '-p', String(machine.port),
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'LogLevel=ERROR',
      `${yard.user}@127.0.0.1`,
      `${yard.tmuxPath} -L ${SOCKET} -f /dev/null ${argvLine}`
    ],
    { encoding: 'utf8', timeout: 30_000, env: { ...process.env, SSH_AUTH_SOCK: yard.authSock } }
  );
  return { code: out.status ?? -1, stdout: (out.stdout ?? '').trim(), stderr: (out.stderr ?? '').trim() };
}

function teardown() {
  // The machine's OWN tmux server, by the pid it reports, read before the
  // listener goes. A daemonised server reparents, so it cannot be found as a
  // descendant afterwards.
  try {
    const serverPid = machine.serverPid(SOCKET);
    if (serverPid !== null) record(serverPid);
  } catch {
    /* nothing answered, so there is nothing to record */
  }
  try {
    machine.stop();
  } catch {
    /* already down */
  }
  for (const pid of recordedPids) {
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
  say(`killed only the pids this run recorded: ${recordedPids.join(', ')}`);
}

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

async function attach(timeoutMs) {
  const started = Date.now();
  for (;;) {
    try {
      const portFile = execFileSync('/bin/cat', [join(profile, 'DevToolsActivePort')], {
        encoding: 'utf8'
      });
      const port = Number(portFile.split('\n')[0].trim());
      if (Number.isFinite(port) && port > 0) {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const picked = pickRendererTarget(list);
        if (picked.target !== null) {
          const ws = await wsConnect(picked.target.webSocketDebuggerUrl);
          say(`attached to the window over the devtools protocol (port ${String(port)})`);
          return ws;
        }
      }
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > timeoutMs) throw new Error('no devtools page target in time');
    await sleep(400);
  }
}

/** Run one expression in the renderer and get its value back. */
function ev(cdp, expr) {
  return cdpEval(cdp, `(async () => { ${expr} })()`, 120_000);
}

async function waitForBridge(cdp, timeoutMs) {
  const started = Date.now();
  for (;;) {
    let there = false;
    try {
      there = await ev(cdp, 'return typeof window.gmux?.machines?.rows === "function";');
    } catch {
      there = false;
    }
    if (there === true) return true;
    if (Date.now() - started > timeoutMs) return false;
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const report = {
  socket: SOCKET,
  machinePort: machine.port,
  slowMs: args.slowMs,
  slowListMs: args.slowListMs,
  watchMs: args.watchMs,
  domReadable: null,
  operatorBefore: operatorSessionCount(),
  operatorAfter: null,
  cadenceMs: null,
  end: [],
  remove: [],
  project: [],
  local: [],
  ghost: [],
  race: [],
  tail: [],
  failures: []
};
const fail = (t) => {
  report.failures.push(t);
  say(`FAIL: ${t}`);
};

async function main() {
  if (!machine.start()) throw new Error(`the scratch sshd did not answer on ${String(machine.port)}`);
  if (!machine.isolated()) throw new Error('the machine shares this Mac\'s tmux server');
  say(`machine on 127.0.0.1:${String(machine.port)} as ${yard.user}, sessions under ${machine.tmuxTmp}`);

  // The one first contact, done by hand, exactly as `npm run smoke:remote` does
  // it and for the same reason: the exec plane carries StrictHostKeyChecking=yes
  // and BatchMode=yes, so it refuses a machine whose identity is not recorded and
  // it could not ask. In the product that answer comes from the one visible
  // connection test, where a person is watching. Only THIS run's own loopback
  // machine is scanned, and only into THIS run's own profile.
  const knownMachines = join(profile, 'gmux', 'machines', 'known-machines');
  mkdirSync(dirname(knownMachines), { recursive: true });
  writeFileSync(
    knownMachines,
    execFileSync('/usr/bin/ssh-keyscan', ['-p', String(machine.port), '127.0.0.1'], {
      encoding: 'utf8',
      timeout: 30_000
    }),
    'utf8'
  );

  const farTmux = farTmuxProgram(args.slowMs);
  writeFileSync(
    join(configDir, 'machines.json'),
    `${JSON.stringify(
      {
        schema: 1,
        machines: [
          {
            id: 'p187',
            label: 'p187 loopback',
            color: 'blue',
            host: '127.0.0.1',
            user: yard.user,
            port: machine.port,
            remoteTmuxPath: farTmux
          }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  say(`the machine's tmux program is ${farTmux}${args.slowMs > 0 ? ` (every command waits ${String(args.slowMs)} ms first)` : ''}`);

  const stream = createWriteStream(appLog, { flags: 'a' });
  await withElectron(
    {
      label: 'p187',
      userDataDir: profile,
      cwd: REPO,
      tmuxSocket: SOCKET,
      args: ['--remote-debugging-port=0', '--use-mock-keychain'],
      env: {
        ...process.env,
        GMUX_TMUX_SOCKET: SOCKET,
        // Harness launch, so the socket override is honoured, WITHOUT arming
        // the renderer's probe drives and without the updater rehearsal.
        GMUX_PROBES: '0',
        GMUX_CONFIG_ROOT: configDir,
        GMUX_SPECSTORY_NO_CLOUD: '1',
        SSH_AUTH_SOCK: yard.authSock
      }
    },
    async (handle) => {
      record(handle.child.pid);
      handle.child.stdout.pipe(stream);
      handle.child.stderr.pipe(stream);
      say(`launched the app, pid ${String(handle.child.pid)}, log ${appLog}`);
      const cdp = await attach(120_000);
      try {
        if (!(await waitForBridge(cdp, 120_000))) throw new Error('window.gmux never arrived');
        await drive(cdp);
      } finally {
        cdp.close();
      }
    }
  );
}

/** The whole drive, inside one app run. */
async function drive(cdp) {
  // --- the machine, confirmed and prepared, through the product's own path ---
  const rows = await ev(
    cdp,
    'await window.gmux.machines.reload(); const r = await window.gmux.machines.rows(); return r;'
  );
  const row = (rows?.rows ?? []).find((r) => r.id === 'p187');
  if (row === undefined) throw new Error(`the machine row was not read: ${JSON.stringify(rows?.errors)}`);
  const confirmed = await ev(
    cdp,
    `return await window.gmux.machines.confirm(${JSON.stringify({
      id: 'p187',
      hashRead: row.hash,
      linesRead: row.lines
    })});`
  );
  if (confirmed?.state !== 'confirmed') throw new Error(`the machine is ${String(confirmed?.state)}, not confirmed`);
  say('the machine is confirmed');

  let prep = await ev(cdp, 'return await window.gmux.machines.prepare("p187");');
  if (prep?.class === 'version-unmeasured' && prep?.acceptSheet != null) {
    say(`the machine reports tmux ${String(prep.version)}, which Tortie has not measured. Accepting it.`);
    await ev(
      cdp,
      `return await window.gmux.machines.acceptVersion(${JSON.stringify({
        id: 'p187',
        version: prep.version,
        hashRead: prep.acceptSheet.hash,
        linesRead: prep.acceptSheet.lines
      })});`
    );
    prep = await ev(cdp, 'return await window.gmux.machines.prepare("p187");');
  }
  if (prep?.class !== 'prepared') throw new Error(`prepare said ${String(prep?.class)}: ${String(prep?.detail)}`);
  say(`prepared, tmux ${String(prep.version)}, server ${prep.serverBorn ? 'born' : 'found'}`);

  // --- a project tab, so a closed session is a closed TAB -------------------
  const project = await ev(cdp, `return await window.gmux.projects.add(${JSON.stringify(farProject)});`);
  // Reload the window, because the project list a renderer draws is read when
  // it loads and a project added over the bridge does not put a tab on the
  // screen by itself. Then click its tab, so the session strip is drawing this
  // project's sessions and the DOM read below is a reading of the TAB rather
  // than of nothing. A probe whose strip is always empty cannot tell candidate 5
  // from a quiet strip.
  await cdp.call('Page.reload', {});
  await sleep(2_000);
  if (!(await waitForBridge(cdp, 60_000))) throw new Error('window.gmux never came back after the reload');
  const opened = await cdpEval(
    cdp,
    `(() => {
       const el = document.querySelector('[data-project-id="${String(project?.id ?? '')}"]');
       if (el === null) return false;
       el.click();
       return true;
     })()`
  );
  await sleep(1_500);
  say(`project ${farProject} (${String(project?.id)}), its tab was ${opened === true ? 'clicked' : 'NOT FOUND'}`);

  const create = async (name) =>
    ev(
      cdp,
      `return await window.gmux.sessions.create(${JSON.stringify({
        name,
        projectPath: farProject,
        cwd: farProject,
        agent: 'shell',
        machineId: 'p187'
      })});`
    );
  const list = () => ev(cdp, 'return await window.gmux.sessions.list();');
  const tabIds = () =>
    cdpEval(
      cdp,
      'Array.from(document.querySelectorAll("[data-session-id]")).map((e) => e.getAttribute("data-session-id"))'
    );

  // --- calibration: how long does main take to notice a far side change? ----
  const cal = await create('p187-calibration');
  await settle(list, cal.id, 15_000);
  const farRows = farSessions();
  const calRow = farRows.find((l) => l.includes('p187-calibration'));
  if (calRow === undefined) fail('the calibration session is not on the machine');
  else {
    const tmuxId = calRow.split(' ')[0];
    const t0 = Date.now();
    farKill(tmuxId);
    let noticed = null;
    while (Date.now() - t0 < 90_000) {
      const now = await list();
      const r = (now ?? []).find((s) => s.id === cal.id);
      if (r === undefined || r.status === 'restorable' || r.status === 'exited') {
        noticed = Date.now() - t0;
        break;
      }
      await sleep(200);
    }
    report.cadenceMs = noticed;
    say(`CALIBRATION: main noticed a far side kill after ${String(noticed)} ms. That is the observed list cadence.`);
  }
  await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(cal.id)});`);

  // --- arm END and arm REMOVE ----------------------------------------------
  for (const arm of ['end', 'remove']) {
    for (let i = 1; i <= args.trials; i += 1) {
      const name = `p187-${arm}-${String(i)}`;
      let made;
      try {
        made = await create(name);
      } catch (err) {
        fail(`${name}: create threw ${String(err)}`);
        continue;
      }
      const ready = await settle(list, made.id, 20_000);
      const onStripBefore = ((await tabIds()) ?? []).includes(made.id);
      if (report.domReadable === null) {
        report.domReadable = await cdpEval(
          cdp,
          `({ tabs: document.querySelectorAll('[data-session-id]').length,
              projects: document.querySelectorAll('[data-project-id]').length,
              text: (document.body.innerText || '').slice(0, 300) })`
        );
        say(`the drawn window holds ${String(report.domReadable?.projects)} project tab(s) and ${String(report.domReadable?.tabs)} session tab(s)`);
      }
      if (!ready) {
        fail(`${name}: never appeared in main's own list`);
        continue;
      }
      // Land the close at a RANDOM phase of the list cadence, because an
      // intermittent race is a race against a timer and a fixed phase would
      // either always hit it or never hit it.
      const jitter = Math.floor(Math.random() * 5_000);
      await sleep(jitter);

      const tClose = Date.now();
      try {
        await ev(cdp, `return await window.gmux.sessions.kill(${JSON.stringify(made.id)});`);
      } catch (err) {
        fail(`${name}: kill threw ${String(err)}`);
        continue;
      }
      const killReturnedMs = Date.now() - tClose;
      let tRemove = null;
      if (arm === 'remove') {
        // The second click, at about the speed a person makes it.
        await sleep(1_200);
        tRemove = Date.now();
        try {
          await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`);
        } catch (err) {
          fail(`${name}: discard threw ${String(err)}`);
        }
      }
      const gate = tRemove ?? tClose;

      // Ask the machine DIRECTLY whether the session survived the close.
      const farAfter = farSessions().some((l) => l.endsWith(` ${name}`));

      // Watch main's own truth and the drawn tab strip.
      const samples = [];
      let returnedAtMs = null;
      let returnedAs = null;
      let returnedIn = null;
      const started = Date.now();
      while (Date.now() - started < args.watchMs) {
        const now = await list();
        const r = (now ?? []).find((s) => s.id === made.id);
        const drawn = (await tabIds()) ?? [];
        const onStrip = drawn.includes(made.id);
        const alive =
          r !== undefined && r.status !== 'exited' && r.status !== 'restorable' && r.status !== 'discarded';
        samples.push({ at: Date.now() - gate, status: r?.status ?? null, onStrip });
        const back = arm === 'end' ? alive : r !== undefined || onStrip;
        if (back && returnedAtMs === null) {
          returnedAtMs = Date.now() - gate;
          returnedAs = r?.status ?? null;
          returnedIn = r !== undefined ? 'main' : 'renderer-only';
        }
        await sleep(250);
      }
      const trial = {
        arm,
        n: i,
        id: made.id,
        name,
        jitterMs: jitter,
        killReturnedMs,
        onStripBefore,
        farHoldsItAfterClose: farAfter,
        returnedAtMs,
        returnedAs,
        returnedIn,
        lastStatus: samples.length > 0 ? samples[samples.length - 1].status : null,
        lastOnStrip: samples.length > 0 ? samples[samples.length - 1].onStrip : null
      };
      report[arm].push(trial);
      say(
        `${arm} ${String(i)}/${String(args.trials)}: kill ${String(killReturnedMs)} ms, jitter ${String(jitter)} ms, ` +
          `far side ${farAfter ? 'STILL HOLDS IT' : 'does not hold it'}, ` +
          `${returnedAtMs === null ? 'stayed closed' : `CAME BACK after ${String(returnedAtMs)} ms as ${String(returnedAs)} (${String(returnedIn)})`}` +
          `, last status ${String(trial.lastStatus)}, on strip ${String(trial.lastOnStrip)}`
      );
      // Leave nothing running: a row still alive on the machine is not this
      // trial's business and must not pollute the next one.
      if (arm === 'end') {
        await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`).catch(() => null);
      }
    }
  }

  // --- arm RACE: a list issued before the close, answering after it ---------
  //
  // THE HONEST PRODUCT TIMELINE, and it is the candidate the entry named first.
  // A list goes out at T holding the session. The person presses the x at T+5 ms
  // and Remove at T+10 ms. The list answers at T+60 ms with the membership the
  // machine had BEFORE the close, and the pass writes it over main's own rows.
  //
  // Nothing in Tortie is changed to produce it. The list is made SLOW on the
  // machine, which is a machine at the end of a slow link, and the list is put in
  // flight by an event that has nothing to do with this session, being a second
  // session appearing on the machine out of band. See {@link SLOW_LIST_MARKER}.
  //
  // The End is fired WITHOUT being awaited, because that is what the person does:
  // `remoteKill` announces the row as ended before it awaits its own poll, so the
  // screen offers Remove while the End is still finishing.
  if (args.slowListMs > 0) {
    for (let i = 1; i <= Math.min(5, args.trials); i += 1) {
      const name = `p187-race-${String(i)}`;
      const made = await create(name);
      if (!(await settle(list, made.id, 20_000))) {
        fail(`${name}: never appeared in main's own list`);
        continue;
      }
      const decoy = `p187-decoy-${String(i)}`;
      // THE DECOY IS THE INSTRUMENT AS WELL AS THE TRIGGER. It is stamped like a
      // Tortie session, so main lists it, and the instant main first lists it IS
      // the instant the held list answered. That is what turns "a list was
      // probably still on the wire" into a number this arm records.
      const decoyId = `p187-decoy-${String(process.pid)}-${String(i)}`;
      writeFileSync(SLOW_LIST_MARKER, '', 'utf8');
      // The event. Main issues a list, and that list will hold this session.
      const bornDecoy = farTmux(`new-session -d -s ${decoy} -P -F '#{session_id}'`);
      if (bornDecoy.code !== 0) {
        fail(`${name}: the machine would not start the decoy: ${bornDecoy.stderr}`);
        rmSync(SLOW_LIST_MARKER, { force: true });
        continue;
      }
      for (const [option, value] of [
        ['@gmux-id', decoyId],
        ['@gmux-agent', 'shell'],
        ['@gmux-name', decoy],
        ['@gmux-project', farProject]
      ]) {
        farTmux(`set-option -t '${bornDecoy.stdout}' ${option} '${value}'`);
      }
      // The list is on the wire now, and it will not answer for slowListMs.
      await sleep(500);
      // The x, fired and not awaited.
      await ev(
        cdp,
        `window.gmux.sessions.kill(${JSON.stringify(made.id)}).catch(() => undefined); return true;`
      );
      // The screen reads ended, which is when Remove is what the x offers.
      let readsEnded = false;
      const tEnded = Date.now();
      while (!readsEnded && Date.now() - tEnded < 30_000) {
        const r = ((await list()) ?? []).find((x) => x.id === made.id);
        readsEnded =
          r === undefined || r.status === 'exited' || r.status === 'restorable';
        if (!readsEnded) await sleep(100);
      }
      // The Remove, while the list from before the close is still on the wire.
      const tRemove = Date.now();
      await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`);
      const now0 = await list();
      const goneAtOnce = (now0 ?? []).find((x) => x.id === made.id) === undefined;
      // THE ARM IS ONLY MEANINGFUL IF THE HELD LIST HAD NOT LANDED YET, and the
      // decoy is how that is known rather than assumed.
      const decoySeenAtRemove = (now0 ?? []).some((x) => x.id === decoyId);
      // Let the stale list land, and the poll the End ran behind it.
      let decoyLandedMs = null;
      const tWait = Date.now();
      while (decoyLandedMs === null && Date.now() - tWait < args.slowListMs + 15_000) {
        if (((await list()) ?? []).some((x) => x.id === decoyId)) {
          decoyLandedMs = Date.now() - tRemove;
        } else await sleep(150);
      }
      await sleep(args.slowListMs + 4_000);
      const afterStale = ((await list()) ?? []).find((x) => x.id === made.id);
      // Back to a fast machine, then several ordinary passes.
      rmSync(SLOW_LIST_MARKER, { force: true });
      await sleep(8_000);
      const afterPasses = ((await list()) ?? []).find((x) => x.id === made.id);
      let secondTime = null;
      if (afterPasses !== undefined) {
        await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`);
        await sleep(2_000);
        secondTime = ((await list()) ?? []).find((x) => x.id === made.id) !== undefined;
      }
      const stillFar = farSessions().some((l) => l.endsWith(` ${made.tmuxName}`));
      report.race.push({
        arm: 'race',
        n: i,
        id: made.id,
        name,
        readsEndedInMs: Date.now() - tEnded,
        goneAtOnce,
        heldListStillOutAtRemove: !decoySeenAtRemove,
        heldListLandedAfterRemoveMs: decoyLandedMs,
        cameBackWithStaleList: afterStale !== undefined,
        statusWithStaleList: afterStale?.status ?? null,
        stillListedAfterPasses: afterPasses !== undefined,
        statusAfterPasses: afterPasses?.status ?? null,
        stillListedAfterSecondRemove: secondTime,
        farMachineStillHoldsIt: stillFar,
        atMs: Date.now() - tRemove
      });
      if (decoySeenAtRemove) {
        fail(
          `${name}: the held list had already answered when the Remove was pressed, ` +
            `so this trial did not drive the race`
        );
      }
      say(
        `race ${String(i)}/${String(Math.min(5, args.trials))}: gone at once ${String(goneAtOnce)}, ` +
          `held list answered ${String(decoyLandedMs)} ms after the Remove, ` +
          `with the stale list ${afterStale === undefined ? 'still gone' : `BACK reading ${String(afterStale.status)}`}, ` +
          `after the passes ${afterPasses === undefined ? 'still gone' : `STILL THERE reading ${String(afterPasses.status)}`}` +
          `${secondTime === null ? '' : `, and after a second Remove it is ${secondTime ? 'STILL THERE' : 'gone'}`}`
      );
      const decoyRow = farSessions().find((l) => l.endsWith(` ${decoy}`));
      if (decoyRow !== undefined) farKill(decoyRow.split(' ')[0]);
      await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(decoyId)});`);
    }
  }

  // --- arm GHOST: the defect on demand -------------------------------------
  //
  // The two arms above close a session whose row is in exactly one of main's two
  // maps for a machine. This arm puts the SAME id in BOTH, which is a state a
  // machine can genuinely be in: a session goes away, a completed pass records it
  // as gone, and it comes back under the same `@gmux-id`. Tortie's own remote
  // restore does exactly that. Nothing in Tortie is changed to produce it; the
  // machine is driven directly, which is what a machine does on its own.
  //
  // Then the person's Remove is pressed, through the product's own channel, and
  // main's own list is read afterwards.
  for (let i = 1; i <= Math.min(5, args.trials); i += 1) {
    const name = `p187-ghost-${String(i)}`;
    const made = await create(name);
    if (!(await settle(list, made.id, 20_000))) {
      fail(`${name}: never appeared in main's own list`);
      continue;
    }
    const before = farSessions().find((l) => l.endsWith(` ${made.tmuxName}`));
    if (before === undefined) {
      fail(`${name}: the machine does not hold ${String(made.tmuxName)}`);
      continue;
    }
    // 1. It goes away on the machine, and a completed pass records that.
    farKill(before.split(' ')[0]);
    let recorded = false;
    for (let w = 0; w < 240 && !recorded; w += 1) {
      const r = ((await list()) ?? []).find((x) => x.id === made.id);
      recorded = r !== undefined && (r.status === 'restorable' || r.status === 'exited');
      if (!recorded) await sleep(250);
    }
    if (!recorded) {
      fail(`${name}: main never recorded the session as gone`);
      continue;
    }
    // 2. It comes back on the machine under the same id, which is what a restore
    //    of that session does.
    const born = farTmux(`new-session -d -s ${made.tmuxName} -P -F '#{session_id}'`);
    if (born.code !== 0) {
      fail(`${name}: the machine would not start the session again: ${born.stderr}`);
      continue;
    }
    for (const [option, value] of [
      ['@gmux-id', made.id],
      ['@gmux-agent', 'shell'],
      ['@gmux-name', name],
      ['@gmux-project', farProject]
    ]) {
      farTmux(`set-option -t '${born.stdout}' ${option} '${value}'`);
    }
    let live = false;
    for (let w = 0; w < 240 && !live; w += 1) {
      const r = ((await list()) ?? []).find((x) => x.id === made.id);
      live = r !== undefined && r.status !== 'restorable' && r.status !== 'exited';
      if (!live) await sleep(250);
    }
    if (!live) {
      fail(`${name}: main never read the session as live again`);
      farTmux(`kill-session -t '${born.stdout}'`);
      continue;
    }
    // 3. The person's Remove, through the product's own channel.
    const tRemove = Date.now();
    await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`);
    await sleep(3_000);
    const after = ((await list()) ?? []).find((x) => x.id === made.id);
    // 4. And again, which is what a person does when a tab comes back.
    let secondTime = null;
    if (after !== undefined) {
      await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`);
      await sleep(3_000);
      secondTime = ((await list()) ?? []).find((x) => x.id === made.id) !== undefined;
    }
    report.ghost.push({
      arm: 'ghost',
      n: i,
      id: made.id,
      name,
      stillListedAfterRemove: after !== undefined,
      statusAfterRemove: after?.status ?? null,
      stillListedAfterSecondRemove: secondTime,
      atMs: Date.now() - tRemove
    });
    say(
      `ghost ${String(i)}: after the Remove the row is ` +
        `${after === undefined ? 'GONE' : `STILL IN MAIN'S LIST reading ${String(after.status)}`}` +
        `${secondTime === null ? '' : `, and after a second Remove it is ${secondTime ? 'STILL THERE' : 'gone'}`}`
    );
    farTmux(`kill-session -t '${born.stdout}'`).stdout;
  }

  // --- arm LOCAL: the control, so "remote" is a claim rather than a guess --
  //
  // The END arm below leaves the tab on screen as an ended row. That is the
  // shipped behaviour of every Remove since Phase 29 and it is NOT a remote
  // property unless a session on this Mac behaves differently. This arm is the
  // same gesture on a session that is not on any machine, so the difference
  // between the two is measured rather than assumed.
  for (let i = 1; i <= args.trials; i += 1) {
    let made;
    try {
      made = await ev(
        cdp,
        `return await window.gmux.sessions.create(${JSON.stringify({
          name: `p187-local-${String(i)}`,
          projectPath: farProject,
          cwd: farProject,
          agent: 'shell'
        })});`
      );
    } catch (err) {
      fail(`local ${String(i)}: create threw ${String(err)}`);
      continue;
    }
    if (!(await settle(list, made.id, 20_000))) {
      fail(`local ${String(i)}: never appeared in main's own list`);
      continue;
    }
    const tClose = Date.now();
    try {
      await ev(cdp, `return await window.gmux.sessions.kill(${JSON.stringify(made.id)});`);
    } catch (err) {
      fail(`local ${String(i)}: kill threw ${String(err)}`);
      continue;
    }
    await sleep(3_000);
    const after = ((await list()) ?? []).find((x) => x.id === made.id);
    report.local.push({
      arm: 'local',
      n: i,
      id: made.id,
      killReturnedMs: Date.now() - tClose,
      stillListed: after !== undefined,
      statusAfter: after?.status ?? null
    });
    await ev(cdp, `return await window.gmux.sessions.discard(${JSON.stringify(made.id)});`).catch(() => null);
  }
  const localStill = report.local.filter((t) => t.stillListed).length;
  const localStatuses = [...new Set(report.local.map((t) => String(t.statusAfter)))];
  say(
    `LOCAL CONTROL: ${String(localStill)} of ${String(report.local.length)} closes left the row in main's list, ` +
      `reading ${localStatuses.join(', ')}`
  );

  // --- arm PROJECT: the other reading of "a remote machine tab" ------------
  //
  // His words were "a remote machine tab", and a tab in Tortie is a project tab
  // as well as a session tab. This arm closes a PROJECT TAB whose folder is on
  // the machine, the same number of times, and watches for it to come back.
  if (typeof (await ev(cdp, 'return typeof window.gmux.projects.addRemote;')) === 'string') {
    for (let i = 1; i <= args.trials; i += 1) {
      let made;
      try {
        made = await ev(
          cdp,
          `return await window.gmux.projects.addRemote(${JSON.stringify({
            machineId: 'p187',
            path: farProject
          })});`
        );
      } catch (err) {
        fail(`project ${String(i)}: addRemote threw ${String(err)}`);
        continue;
      }
      const pid = made?.project?.id ?? null;
      if (pid === null) {
        fail(`project ${String(i)}: addRemote answered ${JSON.stringify(made)}`);
        break;
      }
      await sleep(Math.floor(Math.random() * 5_000));
      const tClose = Date.now();
      try {
        await ev(cdp, `return await window.gmux.projects.remove(${JSON.stringify(pid)});`);
      } catch (err) {
        fail(`project ${String(i)}: remove threw ${String(err)}`);
        continue;
      }
      let returnedAtMs = null;
      let returnedIn = null;
      const started = Date.now();
      while (Date.now() - started < args.watchMs) {
        const inMain = ((await ev(cdp, 'return await window.gmux.projects.list();')) ?? []).some(
          (p) => p.id === pid
        );
        const drawn = ((await cdpEval(
          cdp,
          'Array.from(document.querySelectorAll("[data-project-id]")).map((e) => e.getAttribute("data-project-id"))'
        )) ?? []).includes(pid);
        if ((inMain || drawn) && returnedAtMs === null) {
          returnedAtMs = Date.now() - tClose;
          returnedIn = inMain ? 'main' : 'renderer-only';
        }
        await sleep(250);
      }
      report.project.push({ arm: 'project', n: i, id: pid, returnedAtMs, returnedIn });
      say(
        `project ${String(i)}/${String(args.trials)}: ` +
          `${returnedAtMs === null ? 'stayed closed' : `CAME BACK after ${String(returnedAtMs)} ms (${String(returnedIn)})`}`
      );
    }
  } else {
    say('this build has no projects.addRemote, so the project tab arm was not driven');
  }

  // --- the tail: does anything come back MINUTES later? --------------------
  const closed = [...report.end, ...report.remove].map((t) => ({ id: t.id, name: t.name }));
  say(`tail: watching all ${String(closed.length)} closed ids for ${String(Math.round(args.tailMs / 1000))} s`);
  const tailStart = Date.now();
  while (Date.now() - tailStart < args.tailMs) {
    const now = await list();
    const drawn = (await tabIds()) ?? [];
    for (const c of closed) {
      const r = (now ?? []).find((s) => s.id === c.id);
      if (r !== undefined || drawn.includes(c.id)) {
        report.tail.push({
          id: c.id,
          name: c.name,
          atMs: Date.now() - tailStart,
          status: r?.status ?? null,
          onStrip: drawn.includes(c.id)
        });
      }
    }
    await sleep(2_000);
  }
  say(`tail: ${String(report.tail.length)} sightings of a closed id after the arms finished`);
}

/** Wait until main's own list holds the id with a live status. */
async function settle(list, id, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const now = await list();
    const r = (now ?? []).find((s) => s.id === id);
    if (r !== undefined && r.status !== 'exited' && r.status !== 'restorable') return true;
    await sleep(250);
  }
  return false;
}

let code = 0;
try {
  await main();
} catch (err) {
  fail(String(err?.stack ?? err));
  code = 1;
} finally {
  report.operatorAfter = operatorSessionCount();
  teardown();
  const jsonPath = args.json ?? join(SCRATCH, `p187-report-${String(process.pid)}.json`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  say(`report ${jsonPath}`);
  const raceBack = report.race.filter((t) => t.cameBackWithStaleList).length;
  const raceStill = report.race.filter((t) => t.stillListedAfterPasses).length;
  if (report.race.length > 0) {
    say(
      `RACE: ${String(raceBack)} of ${String(report.race.length)} came back when the list from ` +
        `before the close landed, and ${String(raceStill)} were still there after the passes.`
    );
  }
  const back = (arm) => report[arm].filter((t) => t.returnedAtMs !== null);
  for (const arm of ['end', 'remove', 'project']) {
    const ret = back(arm);
    say(
      `${arm.toUpperCase()}: ${String(ret.length)} of ${String(report[arm].length)} came back. ` +
        `when: ${ret.map((t) => `${String(t.returnedAtMs)} ms`).join(', ') || 'never'}`
    );
    if (arm !== 'project') {
      const far = report[arm].filter((t) => t.farHoldsItAfterClose);
      say(
        `${arm.toUpperCase()}: the far machine still held the session after ` +
          `${String(far.length)} of ${String(report[arm].length)} closes`
      );
    }
  }
  say(`the operator's own server: ${String(report.operatorBefore)} sessions before, ${String(report.operatorAfter)} after`);
  if (report.operatorBefore !== report.operatorAfter) {
    say('FAIL: the operator\'s own server changed. That outranks every other result here.');
    code = 1;
  }
  if (!args.keep) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* leave it */
    }
  }
  process.exit(code);
}
