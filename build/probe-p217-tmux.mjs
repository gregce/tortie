/**
 * probe-p217-tmux.mjs — Phase 217's app run.
 *
 * TWO Electrons, one after the other and never at once, on one scratch profile
 * and the socket gmux-p217. It spawns no agent, spends no token, opens no
 * keychain and reads nothing under the person's home except the tmux binary
 * inside an installed Tortie, which it EXECUTES on its own scratch socket and
 * never asks about socket `gmux`.
 *
 * ## What it drives, and why one run rather than two
 *
 * Launch A is the operator's own 2026-09-06 report, reproduced exactly. A
 * scratch server is created by an installed Tortie's own tmux, which reports
 * 3.7b, and the app is launched as a development build whose client is forced
 * to the machine's 3.6a with GMUX_TMUX_BIN. That is server 3.7b against client
 * 3.6a, the ordered pair TESTED_TMUX_PAIRS does not hold and this phase does
 * not add. The refusal is READ OFF THE DOM, and three things about it are
 * graded: it still refuses and lists nothing, it names WHO started the server,
 * and its command names the socket that was actually refused.
 *
 * Launch B is the fix. The same scratch server, the same 3.7b, and no override
 * at all. A development build now resolves the copy the checkout carries, which
 * is 3.7b, so the pair is identical and the app boots. This is the half that
 * cannot be proved by reading code: it is the difference between a person
 * seeing their projects and seeing a refusal.
 *
 * ## Every claim it makes is re-derived here rather than trusted
 *
 * The probe reads the server's pid and its program from the process table with
 * its own `ps` call and composes what the line SHOULD say, then compares that
 * to what the window drew. A screen that agreed with a line the app also
 * composed would prove nothing.
 *
 * ## Safety
 *
 * The socket is `gmux-p217` and the real one is never addressed. The scratch
 * server is killed in a `finally`, the profile is removed in a `finally`, and
 * both Electrons run through build/electron-run.mjs, whose kill is in a
 * `finally` of its own. Nothing restarts, signals or reconfigures any server
 * this probe did not create.
 *
 *   node build/probe-p217-tmux.mjs             # the run
 *   node build/probe-p217-tmux.mjs --self-test # the graders, launching nothing
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const P = promisify(execFile);
const say = (s) => console.log(`[p217] ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The graders, pure so --self-test can prove them
// ---------------------------------------------------------------------------

/**
 * The `.app` bundle a program path sits inside, or null. Written here from the
 * shape rather than imported, so the probe's expectation is independent of the
 * module it is checking.
 */
export function bundleOf(path) {
  const parts = path.split('/');
  const at = parts.findIndex((p) => p.endsWith('.app'));
  if (at < 0) return null;
  if (parts[at + 1] !== 'Contents') return null;
  return parts.slice(0, at + 1).join('/');
}

/** What the "who started it" line must say, given the program that made it. */
export function expectedOriginLine(program) {
  const bundle = bundleOf(program);
  if (bundle === null) return `That server was started by ${program}.`;
  const name = bundle.split('/').pop().replace(/\.app$/, '');
  return `That server was started by ${name} at ${bundle}.`;
}

/** Grade launch A's reading. Returns the findings, empty when it passed. */
export function gradeRefusal(reading, expect) {
  const found = [];
  const push = (m) => found.push(m);
  if (reading.bootBlockPresent !== true) push('no boot block was drawn at all');
  if (reading.projectTabs !== 0) push(`${reading.projectTabs} project tabs drawn`);
  if (reading.sessionRows !== 0) push(`${reading.sessionRows} session rows drawn`);
  if (!reading.body.some((l) => l.includes('has not tested that pair'))) {
    push('the refusal no longer says the pair is untested');
  }
  if (!reading.body.includes(expect.originLine)) {
    push(`the measured line is missing. Expected ${JSON.stringify(expect.originLine)}`);
  }
  if (!reading.body.some((l) => l.includes('GMUX_TMUX_BIN'))) {
    push('a development build was not told it can run the same tmux');
  }
  if (reading.command !== expect.command) {
    push(`the command is ${JSON.stringify(reading.command)}, expected ${JSON.stringify(expect.command)}`);
  }
  if (reading.command.includes('-L gmux ')) {
    push('the command names the real socket while a scratch one was refused');
  }
  if (reading.ways.length !== 2) push(`${reading.ways.length} ways forward, expected 2`);
  for (const line of reading.body) {
    if (line.includes('—') || line.includes('–')) push(`a dash in ${JSON.stringify(line)}`);
  }
  return found;
}

/** Grade launch B's reading. Empty when the app booted rather than blocked. */
export function gradeAttach(reading, vendored) {
  const found = [];
  if (reading.bootBlockPresent === true) {
    found.push(`still blocked. ${String(reading.fullText).slice(0, 200)}`);
  }
  if (!reading.chose.includes(vendored)) {
    found.push(`the boot line does not name ${vendored}. It said ${JSON.stringify(reading.chose)}`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

if (process.argv.includes('--self-test')) {
  const cases = [];
  const check = (name, ok) => cases.push([name, ok]);
  check('a bundled program yields its bundle',
    bundleOf('/Applications/Tortie.app/Contents/Resources/bin/tmux') === '/Applications/Tortie.app');
  check('a plain program yields none', bundleOf('/opt/homebrew/bin/tmux') === null);
  check('a directory merely named .app yields none', bundleOf('/tmp/x.app/bin/tmux') === null);
  check('the bundled line names the application',
    expectedOriginLine('/Applications/Tortie.app/Contents/Resources/bin/tmux') ===
      'That server was started by Tortie at /Applications/Tortie.app.');
  check('the plain line names the file',
    expectedOriginLine('/opt/homebrew/bin/tmux') ===
      'That server was started by /opt/homebrew/bin/tmux.');

  const ok = {
    bootBlockPresent: true, projectTabs: 0, sessionRows: 0,
    body: ['running tmux 3.7b. Tortie has not tested that pair, so it will not attach to it.',
           'That server was started by Tortie at /Applications/Tortie.app.',
           'This development build can run that same tmux with GMUX_TMUX_BIN.'],
    ways: ['a', 'b'], command: 'tmux -L gmux-p217 kill-server', fullText: ''
  };
  const expect = {
    originLine: 'That server was started by Tortie at /Applications/Tortie.app.',
    command: 'tmux -L gmux-p217 kill-server'
  };
  check('a good reading passes', gradeRefusal(ok, expect).length === 0);
  check('a drawn project tab fails', gradeRefusal({ ...ok, projectTabs: 1 }, expect).length === 1);
  check('a drawn session row fails', gradeRefusal({ ...ok, sessionRows: 3 }, expect).length === 1);
  check('a missing block fails', gradeRefusal({ ...ok, bootBlockPresent: false }, expect).length === 1);
  check('a missing measured line fails',
    gradeRefusal({ ...ok, body: [ok.body[0], ok.body[2]] }, expect).length === 1);
  check('the real socket in the command fails',
    gradeRefusal({ ...ok, command: 'tmux -L gmux kill-server' }, expect).length === 2);
  check('a softened refusal fails',
    gradeRefusal({ ...ok, body: ok.body.slice(1) }, expect).length === 1);
  check('one way forward fails', gradeRefusal({ ...ok, ways: ['a'] }, expect).length === 1);
  check('an em dash fails',
    gradeRefusal({ ...ok, body: [...ok.body, 'a — b'] }, expect).length === 1);
  check('a booted window passes the attach grade',
    gradeAttach({ bootBlockPresent: false, chose: 'runs /r/build/vendor/tmux/bin/tmux.' },
      '/r/build/vendor/tmux/bin/tmux').length === 0);
  check('a still blocked window fails it',
    gradeAttach({ bootBlockPresent: true, fullText: 'x', chose: '/r/build/vendor/tmux/bin/tmux' },
      '/r/build/vendor/tmux/bin/tmux').length === 1);
  check('a boot line naming another copy fails it',
    gradeAttach({ bootBlockPresent: false, chose: 'runs /opt/homebrew/bin/tmux.' },
      '/r/build/vendor/tmux/bin/tmux').length === 1);

  let bad = 0;
  for (const [name, passed] of cases) {
    console.log(`${passed ? 'ok  ' : 'FAIL'} ${name}`);
    if (!passed) bad += 1;
  }
  console.log(`[p217] self-test: ${cases.length - bad} of ${cases.length} graders behaved`);
  process.exit(bad === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const { cdpEval, wsConnect } = await import('./cdp-client.mjs');
const { pickRendererTarget } = await import('./cdp-target.mjs');
const { withElectron, repoRoot } = await import('./electron-run.mjs');

const SOCKET = 'gmux-p217';
const CONF = join(repoRoot, 'resources', 'gmux-tmux.conf');
const VENDORED = join(repoRoot, 'build', 'vendor', 'tmux', 'bin', 'tmux');
const INSTALLED = '/Applications/Tortie.app/Contents/Resources/bin/tmux';
const OLD_CLIENT = '/opt/homebrew/bin/tmux';

if (!existsSync(VENDORED)) {
  console.error(`[p217] no ${VENDORED}. Run "npm run vendor:tmux" first.`);
  process.exit(1);
}
if (!existsSync(OLD_CLIENT)) {
  console.error(`[p217] no ${OLD_CLIENT}, so the refused pair cannot be made.`);
  process.exit(1);
}

// The server is made by an installed Tortie when there is one, because that is
// the exact shape the operator hit and it is the only way to read the bundled
// line off a real bundle. It falls back to the checkout's own copy, which is
// the same version, so the refusal is identical and only the origin line
// differs.
const SERVER_BIN = existsSync(INSTALLED) ? INSTALLED : VENDORED;

const profile = mkdtempSync(join(tmpdir(), 'gmux-p217-profile-'));
const findings = [];

async function targetsFor(dir) {
  const port = Number(
    readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim()
  );
  if (!Number.isFinite(port) || port <= 0) throw new Error('no devtools port yet');
  return await (await fetch(`http://127.0.0.1:${String(port)}/json/list`)).json();
}

async function attachMain(dir, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    try {
      const picked = pickRendererTarget(await targetsFor(dir));
      if (picked.target !== null && picked.target.webSocketDebuggerUrl) {
        return await wsConnect(picked.target.webSocketDebuggerUrl);
      }
    } catch { /* not up yet */ }
    if (Date.now() - t0 > timeoutMs) throw new Error('no main window target');
    await sleep(400);
  }
}

const READ = `(() => {
  const block = document.querySelector('.boot-block');
  const q = (s) => Array.from(document.querySelectorAll(s)).map((n) => n.textContent.trim());
  const cmd = document.querySelector('.boot-block .code-row');
  return {
    bootBlockPresent: block !== null,
    title: q('.boot-block .empty-title'),
    body: q('.boot-block .empty-body'),
    measured: q('.boot-block .boot-block-measured'),
    ways: q('.boot-block .boot-block-ways li'),
    command: cmd === null ? '' : cmd.textContent.trim(),
    detail: q('.boot-block .boot-block-detail'),
    buttons: q('.boot-block button'),
    fullText: block === null ? null : block.innerText,
    projectTabs: document.querySelectorAll('.ptab').length,
    sessionRows: document.querySelectorAll('[data-session-id]').length
  };
})()`;

/** One launch. Returns the DOM reading plus the boot line main printed. */
async function drive(label, env) {
  let reading = null;
  let chose = '';
  await withElectron(
    {
      label,
      userDataDir: profile,
      cwd: repoRoot,
      args: [
        '--remote-debugging-port=0',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling'
      ],
      env: {
        GMUX_PROBES: '1',
        GMUX_TMUX_SOCKET: SOCKET,
        GMUX_HARNESS_DIR: profile,
        ...env
      },
      graceMs: 15_000,
      ceilingMs: 300_000,
      tmuxSocket: SOCKET
    },
    async (handle) => {
      const cdp = await attachMain(profile, 120_000);
      for (let waited = 0; waited < 60_000; waited += 500) {
        const ready = await cdpEval(
          cdp,
          "document.querySelector('.boot-block') !== null || document.querySelector('.ptab') !== null || document.querySelector('.empty') !== null"
        );
        if (ready === true) break;
        await sleep(500);
      }
      await sleep(1500);
      reading = await cdpEval(cdp, READ);
      const line = String(handle.text())
        .split('\n')
        .find((l) => l.includes('This development build runs'));
      chose = line ?? '';
    }
  );
  return { ...reading, chose };
}

let serverUp = false;
try {
  await P(SERVER_BIN, ['-L', SOCKET, '-f', CONF, 'new-session', '-d', '-s', 'held'], {
    timeout: 10_000
  });
  serverUp = true;
  const version = (
    await P(SERVER_BIN, ['-L', SOCKET, 'display-message', '-p', '#{version}'], {
      timeout: 5000
    })
  ).stdout.trim();
  const pid = (
    await P(SERVER_BIN, ['-L', SOCKET, 'display-message', '-p', '#{pid}'], {
      timeout: 5000
    })
  ).stdout.trim();
  // RE-DERIVED HERE. The expectation comes from the probe's own read of the
  // process table, never from the module that composes the sentence.
  const program = (await P('ps', ['-p', pid, '-o', 'comm='], { timeout: 5000 })).stdout.trim();
  say(`scratch server on ${SOCKET}, pid ${pid}, ${program}, reports ${version}`);
  const expect = {
    originLine: expectedOriginLine(program),
    command: `tmux -L ${SOCKET} kill-server`
  };
  say(`the screen must say ${JSON.stringify(expect.originLine)}`);

  say('--- LAUNCH A, the operator report, client forced to 3.6a ---');
  const a = await drive('p217 refusal', { GMUX_TMUX_BIN: OLD_CLIENT });
  console.log(JSON.stringify(a, null, 2));
  findings.push(...gradeRefusal(a, expect).map((m) => `A: ${m}`));

  say('--- LAUNCH B, the fix, no override at all ---');
  const b = await drive('p217 attach', {});
  say(`boot line: ${b.chose}`);
  say(`block drawn: ${String(b.bootBlockPresent)}, project tabs ${String(b.projectTabs)}`);
  findings.push(...gradeAttach(b, VENDORED).map((m) => `B: ${m}`));
} finally {
  if (serverUp) {
    try {
      await P(SERVER_BIN, ['-L', SOCKET, 'kill-server'], { timeout: 5000 });
    } catch { /* already gone */ }
  }
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch { /* nothing to remove */ }
  say('scratch server ended and the profile removed');
}

if (findings.length > 0) {
  for (const f of findings) console.error(`[p217] FINDING ${f}`);
  console.error(`[p217] ${findings.length} finding(s)`);
  process.exit(1);
}
say('both launches behaved. The refusal names who started the server and the ' +
  'socket it refused, and a build with no override attaches.');
