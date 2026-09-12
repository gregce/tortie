#!/usr/bin/env node
/**
 * probe-p261-socket.mjs. The harness socket refusal, DRIVEN (Phase 261 item 1).
 *
 * ## WHY THIS EXISTS AND WHY IT IS NOT THE GATE
 *
 * `npm run gate:electron`'s rule 5 CALLS the refusal with no Electron on disk.
 * That proves the arithmetic. It does not prove that the running app announces
 * the socket it really chose, or that a launch in the right shape really lands
 * on its own server, or that the census reads the operator's list. This probe
 * is those three.
 *
 * The failure it guards was measured at 0 of 2: twice a probe launched with
 * `GMUX_TMUX_SOCKET` set and no harness term, `activeTmuxSocket` ignored it,
 * and sessions appeared on `-L gmux`, the operator's live server — `shell-1-5`
 * and `cursor-1-2` the first time, `shell-1-6` at 22:19:53 and `claude-1-4` at
 * 22:20:20 on 2026-08-19 the second.
 *
 * ## WHAT IT TOUCHES
 *
 * ONE Electron at a time, never two, on a scratch profile under its own
 * `GMUX_HARNESS_DIR` with a scratch `HOME` inside it, socket
 * `gmux-p261-<pid>`. No agent, no token, no keychain, no request, no machine.
 * `-L gmux` is READ twice, with `list-sessions`, and never written.
 *
 * ## THE ARMS
 *
 *   A  the positive. The real app with `GMUX_PROBES=0` and the scratch socket.
 *      Its own announcement must name the scratch socket, and a tmux server
 *      must really exist there, so the launch is shown to have done something.
 *   B  the pre-launch refusal, live. The same options with the term removed:
 *      withElectron must throw and nothing may be spawned.
 *   C  the in-flight assertion, WITH NO ELECTRON AND NO CONTACT WITH HIS
 *      SERVER. The program is this node, pointed at a script this probe writes
 *      that prints `[gmux-socket] local tmux socket: gmux` and then sleeps.
 *      The helper must end it and throw naming the mismatch, and the fake
 *      app's pid must be gone afterwards. THIS IS THE ARM THAT PROVES THE
 *      ASSERTION FIRES AGAINST THE ANSWER `gmux` without ever putting the real
 *      app on his server.
 *   D  the ablation, live. A copy of electron-run.mjs with the 2a clause taken
 *      out: arm B's call must then get PAST the refusal, so arm B is shown able
 *      to read the other answer rather than only ever passing.
 *   E  the census, pure, over four fixtures. Its live half is arm A's own
 *      before and after reading.
 *
 * `--self-test` proves the graders on fixtures and launches nothing.
 *
 * The result is written to a file through build/drive-result.mjs, which is the
 * Phase 261 item 2 convention: a console is not evidence once the transcript is
 * gone, and Phase 87 and Phase 90.2 each lost a measurement that way.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  censusFinding,
  liveSessionNames,
  withElectron
} from '../electron-run.mjs';
import { writeDriveResult } from '../drive-result.mjs';

const TAG = '[p261-socket]';
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const SOCKET = `gmux-p261-${String(process.pid)}`;
const startedAt = new Date().toISOString();

const findings = [];
const readings = [];
const note = (what, detail) => {
  findings.push({ what, detail });
  console.error(`${TAG} FINDING: ${what} — ${detail}`);
};
const read = (what, value) => {
  readings.push({ what, value });
  console.log(`${TAG} ${what}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
};

// ---------------------------------------------------------------------------
// The graders, pure, so --self-test can prove them
// ---------------------------------------------------------------------------

/** Arm A passes when the app announced exactly the socket it was given. */
export function gradePositive({ announced, wanted, serverAnswered }) {
  const out = [];
  if (announced !== wanted) {
    out.push(`the app announced ${JSON.stringify(announced)} and the launch asked for ${JSON.stringify(wanted)}`);
  }
  if (announced === 'gmux') {
    out.push("the app announced -L gmux, which is the operator's live server");
  }
  if (!serverAnswered) {
    out.push('no tmux server exists on the scratch socket, so the launch proved nothing');
  }
  return out;
}

/** Arm B passes when the launch was refused and nothing was spawned. */
export function gradeRefusal({ threw, message, bodyRan }) {
  const out = [];
  if (!threw) out.push('the launch was NOT refused');
  else if (!/GMUX_PROBES/.test(String(message))) {
    out.push(`the refusal does not name GMUX_PROBES: ${String(message)}`);
  }
  if (bodyRan) out.push('the body ran, so the refusal happened after the launch');
  return out;
}

/** Arm C passes when the mismatch ended the launch and the fake app is gone. */
export function gradeAssertion({ threw, message, stillAlive }) {
  const out = [];
  if (!threw) out.push('an app that announced -L gmux was NOT stopped');
  else {
    const text = String(message);
    if (!text.includes('gmux')) out.push(`the error names no socket: ${text}`);
    if (!text.includes(SOCKET) && !/asked the app to use/.test(text)) {
      out.push(`the error does not name both sides: ${text}`);
    }
  }
  if (stillAlive) out.push('the fake app was still running after the helper returned');
  return out;
}

/** Arm D passes when the ablated copy no longer refuses arm B's shape. */
export function gradeAblation({ refusedAtHead, refusedAblated }) {
  const out = [];
  if (!refusedAtHead) out.push('arm B did not refuse at HEAD, so there is nothing to ablate');
  if (refusedAblated) {
    out.push('the ablated copy still refused, so arm B is not reading the 2a clause');
  }
  return out;
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

function selfTest() {
  const cases = [
    ['A agrees', gradePositive({ announced: SOCKET, wanted: SOCKET, serverAnswered: true }), 0],
    ['A on his server', gradePositive({ announced: 'gmux', wanted: SOCKET, serverAnswered: true }), 2],
    ['A with no server', gradePositive({ announced: SOCKET, wanted: SOCKET, serverAnswered: false }), 1],
    ['B refused well', gradeRefusal({ threw: true, message: 'set GMUX_PROBES', bodyRan: false }), 0],
    ['B not refused', gradeRefusal({ threw: false, message: '', bodyRan: true }), 2],
    ['B refused mutely', gradeRefusal({ threw: true, message: 'no', bodyRan: false }), 1],
    ['C stopped', gradeAssertion({ threw: true, message: `asked the app to use "${SOCKET}" and the app itself answered "gmux"`, stillAlive: false }), 0],
    ['C not stopped', gradeAssertion({ threw: false, message: '', stillAlive: true }), 2],
    ['C leaked', gradeAssertion({ threw: true, message: `asked the app to use "${SOCKET}" answered "gmux"`, stillAlive: true }), 1],
    ['D moved', gradeAblation({ refusedAtHead: true, refusedAblated: false }), 0],
    ['D did not move', gradeAblation({ refusedAtHead: true, refusedAblated: true }), 1],
    ['E unchanged', censusFinding(['a'], ['a']) === null ? [] : ['x'], 0],
    ['E added', censusFinding(['a'], ['a', 'shell-1-6']) === null ? ['x'] : [], 0],
    ['E gone', censusFinding(['a', 'b'], ['a']) === null ? ['x'] : [], 0]
  ];
  let bad = 0;
  for (const [name, got, want] of cases) {
    if (got.length !== want) {
      bad += 1;
      console.error(`${TAG} self-test: "${name}" produced ${got.length} findings, wanted ${want}: ${got.join('; ')}`);
    }
  }
  if (bad > 0) process.exit(1);
  console.log(`${TAG} self-test ok over ${String(cases.length)} fixtures. Nothing was launched.`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  console.error(`${TAG} out/main/index.js is missing. Run npm run build first.`);
  process.exit(2);
}

const root = mkdtempSync(join(tmpdir(), 'p261-socket-'));
const profile = join(root, 'profile');
const home = join(root, 'home');
mkdirSync(profile, { recursive: true });
mkdirSync(home, { recursive: true });

/** The operator's own server, listed and never written. */
const gmuxBefore = liveSessionNames();
read('operator sessions on -L gmux before', gmuxBefore.length);

let gmuxAfter = gmuxBefore;
try {
  // -------------------------------------------------------------------------
  // Arm A. The positive: the real app, in the right shape.
  // -------------------------------------------------------------------------
  const armA = await withElectron(
    {
      label: 'p261-A',
      userDataDir: profile,
      cwd: repoRoot,
      tmuxSocket: SOCKET,
      ceilingMs: 120_000,
      env: {
        HOME: home,
        GMUX_HARNESS_DIR: root,
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_PROBES: '0'
      }
    },
    async (handle) => {
      await handle.waitForLine(/\[gmux-socket\] local tmux socket:/, 90_000);
      const m = /\[gmux-socket\] local tmux socket: (\S+)/.exec(handle.text());
      // Ask tmux itself, not the app, whether a server is really there.
      const listed = spawnSync(
        'tmux',
        ['-L', SOCKET, 'list-sessions', '-F', '#{session_name}'],
        { encoding: 'utf8' }
      );
      return {
        announced: m === null ? null : m[1],
        serverAnswered: listed.status === 0 || String(listed.stderr ?? '').includes('no server running') === false
      };
    }
  );
  read('A: the socket the app announced', armA.announced);
  for (const why of gradePositive({ ...armA, wanted: SOCKET })) {
    note('arm A, the positive', why);
  }

  // -------------------------------------------------------------------------
  // Arm B. The pre-launch refusal, live.
  // -------------------------------------------------------------------------
  let bodyRan = false;
  let armB = { threw: false, message: '' };
  try {
    await withElectron(
      {
        label: 'p261-B',
        userDataDir: profile,
        cwd: repoRoot,
        tmuxSocket: SOCKET,
        env: {
          HOME: home,
          GMUX_HARNESS_DIR: root,
          GMUX_TMUX_SOCKET: SOCKET,
          // The term is gone. This is the shape that ran twice.
          GMUX_PROBES: undefined,
          GMUX_SMOKE: undefined,
          GMUX_SHOT: undefined,
          GMUX_UPDATE_REHEARSAL: undefined
        }
      },
      async () => {
        bodyRan = true;
        return null;
      }
    );
  } catch (err) {
    armB = { threw: true, message: String(err?.message ?? err) };
  }
  read('B: refused', armB.threw);
  for (const why of gradeRefusal({ ...armB, bodyRan })) {
    note('arm B, the pre-launch refusal', why);
  }

  // -------------------------------------------------------------------------
  // Arm C. The in-flight assertion, against the answer `gmux`, with no
  // Electron and no contact with his server.
  // -------------------------------------------------------------------------
  // A stand-in for an app whose socket override was ignored: it prints the one
  // line the helper reads and then sleeps. It starts no tmux, opens no profile
  // and talks to nothing.
  //
  // IT IS A SHELL SCRIPT AND NOT A NODE ONE, and that is a real constraint
  // rather than a taste. withElectron always puts `--user-data-dir=<profile>`
  // first in the argv, and `node --user-data-dir=… file.mjs` is a bad option
  // that exits at once, so a node stand-in never printed anything and this arm
  // passed by pressing nothing. A `#!/bin/sh` script ignores the extra
  // positional argument, which is what lets the program be something other
  // than Electron at all.
  const fake = join(root, 'fake-app.sh');
  writeFileSync(
    fake,
    [
      '#!/bin/sh',
      `echo '[gmux-socket] local tmux socket: gmux (GMUX_TMUX_SOCKET=${SOCKET}, harness launch: no)'`,
      'sleep 600',
      ''
    ].join('\n'),
    { mode: 0o755 }
  );
  let armC = { threw: false, message: '' };
  let fakePid = 0;
  try {
    await withElectron(
      {
        label: 'p261-C',
        userDataDir: profile,
        cwd: repoRoot,
        program: fake,
        entry: false,
        persistence: false,
        // No tmuxSocket: this arm must reach the announcement and not the 2b
        // refusal, and it must end no server because it starts none.
        env: {
          HOME: home,
          GMUX_HARNESS_DIR: root,
          GMUX_TMUX_SOCKET: SOCKET,
          GMUX_PROBES: '0'
        }
      },
      async (handle) => {
        fakePid = handle.pid;
        // The helper's own race is what must end this. If it does not, the
        // ceiling below is what stops the probe hanging for ever.
        await new Promise((r) => setTimeout(r, 20_000));
        return 'the body was never supposed to finish';
      }
    );
  } catch (err) {
    armC = { threw: true, message: String(err?.message ?? err) };
  }
  const stillAlive = (() => {
    if (fakePid <= 0) return false;
    try {
      process.kill(fakePid, 0);
      return true;
    } catch {
      return false;
    }
  })();
  read('C: the helper stopped an app that answered -L gmux', armC.threw);
  for (const why of gradeAssertion({ ...armC, stillAlive })) {
    note('arm C, the in-flight assertion', why);
  }

  // -------------------------------------------------------------------------
  // Arm D. The ablation, live: arm B must be able to read the other answer.
  // -------------------------------------------------------------------------
  const helperSource = readFileSync(join(repoRoot, 'build', 'electron-run.mjs'), 'utf8');
  const clause = "  if (want !== '' && terms.length === 0) {";
  let armD = { refusedAtHead: armB.threw, refusedAblated: true };
  if (!helperSource.includes(clause)) {
    note('arm D, the ablation', `the 2a clause ${JSON.stringify(clause)} is not in the helper, so nothing was ablated`);
  } else {
    const copyDir = join(root, 'ablated');
    mkdirSync(copyDir, { recursive: true });
    const copy = join(copyDir, 'electron-run.mjs');
    writeFileSync(copy, helperSource.replace(clause, '  if (false) {'));
    const ablated = await import(copy);
    try {
      await ablated.withElectron(
        {
          label: 'p261-D',
          userDataDir: profile,
          cwd: repoRoot,
          // A program that is not there, so the ablated copy is refused by the
          // PROGRAM check rather than really launching the app on -L gmux.
          program: '/nonexistent/p261',
          entry: false,
          env: {
            HOME: home,
            GMUX_TMUX_SOCKET: SOCKET,
            GMUX_PROBES: undefined,
            GMUX_SMOKE: undefined,
            GMUX_SHOT: undefined,
            GMUX_UPDATE_REHEARSAL: undefined
          }
        },
        async () => null
      );
      armD.refusedAblated = false;
    } catch (err) {
      const text = String(err?.message ?? err);
      armD.refusedAblated = /GMUX_TMUX_SOCKET is /.test(text);
      read('D: what the ablated copy answered instead', text.slice(0, 120));
    }
  }
  read('D: refused at HEAD, refused ablated', [armD.refusedAtHead, armD.refusedAblated]);
  for (const why of gradeAblation(armD)) note('arm D, the ablation', why);

  // -------------------------------------------------------------------------
  // Arm E. The census, pure. Its live half is the before and after below.
  // -------------------------------------------------------------------------
  const census = {
    unchanged: censusFinding(['a', 'b'], ['b', 'a']),
    added: censusFinding(['a'], ['a', 'shell-1-6']),
    gone: censusFinding(['a', 'b'], ['a']),
    both: censusFinding(['a', 'b'], ['a', 'claude-1-4'])
  };
  if (census.unchanged !== null) note('arm E, the census', 'an unchanged list read as a change');
  for (const name of ['added', 'gone', 'both']) {
    if (census[name] === null) note('arm E, the census', `a list with a name ${name} read as unchanged`);
  }
  read('E: the four census fixtures behaved', census.unchanged === null && census.added !== null);
} finally {
  gmuxAfter = liveSessionNames();
  read('operator sessions on -L gmux after', gmuxAfter.length);
  const drift = censusFinding(gmuxBefore, gmuxAfter);
  if (drift !== null) note('the live census', drift);
  // The scratch server, whatever happened above. withElectron already ends the
  // one arm A named; this is the belt for an arm that threw before it got there.
  spawnSync('tmux', ['-L', SOCKET, 'kill-server'], { stdio: 'ignore' });
  rmSync(root, { recursive: true, force: true });
}

const result = {
  socket: SOCKET,
  gmuxBefore: gmuxBefore.length,
  gmuxAfter: gmuxAfter.length,
  readings,
  findings
};
writeDriveResult('p261-socket', result, { startedAt });

console.log(
  `${TAG} ${String(findings.length)} finding${findings.length === 1 ? '' : 's'}. ` +
    `-L gmux held ${String(gmuxBefore.length)} sessions before and ` +
    `${String(gmuxAfter.length)} after, and was never written to.`
);
process.exit(findings.length === 0 ? 0 : 1);
