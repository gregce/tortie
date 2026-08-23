#!/usr/bin/env node
/**
 * probe-p137-overview.mjs. The Phase 137 photograph probe, modelled on
 * build/probe-p139-caption.mjs.
 *
 * ## What it proves
 *
 * The Catch Me Up page opens over the window at each of its three levels,
 * draws real conversations read from real fixture logs, fits the window, and
 * carries no integer outside a clock, a date or an elapsed time. It launches
 * the real app four times, one at a time, photographs the project view, the
 * session view and the columns view, and captures one frame while the 200 ms
 * flight is stretched to 2000 ms so the picture lands mid flight.
 *
 * ## How the sessions exist without an agent running
 *
 * A scratch home directory holds five of the committed research 63 fixtures
 * placed exactly where each provider's resolver expects them. A seed file
 * named by GMUX_OVERVIEW_SEED makes src/main/harness/overview-seed.ts insert
 * six manifest rows into the ISOLATED profile, being claude-6, codex-2,
 * grok-1, deepseek-1, qwen-1 and shell-2. No agent process starts. The
 * scratch project is a real git repository whose second commit touches
 * scripts/release.sh after the fixtures' timestamps, so the claude turn shows
 * that git agrees, and nothing ever commits src/nest_counter.py, so the codex
 * turn shows that git has no record.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory and a scratch HOME. The operator's profile and home are never
 *    opened.
 *  - At most one Electron runs at a time. Each launch is awaited to exit and
 *    the pid it started is killed in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p137
 *
 * Exit 0 when four pictures and four readings exist and every assertion held.
 * 1 when they did not. 2 when the probe refuses to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p137overview]';

const say = (line) => {
  console.log(`${TAG} ${line}`);
};
const refuse = (why) => {
  console.error(`${TAG} ${why}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') {
  refuse(
    'no GMUX_TMUX_SOCKET. Run me through the harness so I get a socket of my own: ' +
      "node build/harness-socket.mjs gmux-p137-overview 'node build/probe-p137-overview.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const outDir = resolve(repoRoot, (process.env['P137_OUT_DIR'] ?? '').trim() || 'out/p137');
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch world: a home, a project, a seed
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p137-overview');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p137-project', 'scripts'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p137-project');
const home = join(root, 'home');

/** qwen's encoding, copied from src/main/manifest/harvest/stores.ts. */
const sanitizeQwenCwd = (cwd) => cwd.replace(/[^a-zA-Z0-9]/g, '-');

const IDS = {
  claude: '11111111-2222-4333-8444-555555555555',
  codex: '0000aaaa-1111-7000-8000-222233334444',
  grok: '0199aaaa-1111-7000-8000-abcdefabcdef',
  deepseek: '00000000-0000-4000-8000-000000000001',
  qwen: '11111111-2222-4333-8444-555555555555'
};

function place(rel, fixtureName) {
  const dst = join(home, rel);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(FIXTURES, fixtureName), dst);
}

place(join('.claude', 'projects', project.replace(/\//g, '-'), `${IDS.claude}.jsonl`), 'claude-session.jsonl');
place(
  join('.codex', 'sessions', '2026', '08', '19', `rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`),
  `codex-rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`
);
place(join('.grok', 'sessions', encodeURIComponent(project), IDS.grok, 'updates.jsonl'), 'grok-updates.jsonl');
place(join('.grok', 'sessions', encodeURIComponent(project), IDS.grok, 'summary.json'), 'grok-summary.json');
place(join('.deepseek', 'sessions', `${IDS.deepseek}.json`), 'deepseek-session.json');
place(join('.qwen', 'projects', sanitizeQwenCwd(project), 'chats', `${IDS.qwen}.jsonl`), 'qwen-chat.jsonl');
place(join('.qwen', 'projects', sanitizeQwenCwd(project), 'chats', `${IDS.qwen}.runtime.json`), 'qwen-chat.runtime.json');

// The project. Two commits. The second touches scripts/release.sh, dated
// after every fixture timestamp because it is committed today. Nothing ever
// commits src/nest_counter.py, so the codex turn has no git record to show.
writeFileSync(join(project, 'README.md'), '# Phase 137 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync(
    'git',
    ['-C', project, '-c', 'user.name=p137', '-c', 'user.email=p137@harness.invalid', ...args],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) refuse(`git ${args.join(' ')} failed: ${r.stderr}`);
};
git('init', '-q');
git('add', 'README.md');
git('commit', '-q', '-m', 'first');
writeFileSync(join(project, 'scripts', 'release.sh'), '#!/bin/sh\necho signed\n', 'utf8');
git('add', 'scripts/release.sh');
git('commit', '-q', '-m', 'sign the release script');

const seedPath = join(root, 'overview-seed.json');
const startedAt = Date.UTC(2026, 7, 20, 8, 0, 0);
writeFileSync(
  seedPath,
  JSON.stringify([
    { name: 'claude-6', agent: 'claude', agentSessionId: IDS.claude, cwd: project, createdAt: startedAt },
    { name: 'codex-2', agent: 'codex', agentSessionId: IDS.codex, cwd: project, createdAt: Date.UTC(2026, 7, 19, 10, 0, 0) },
    { name: 'grok-1', agent: 'grok', agentSessionId: IDS.grok, cwd: project, createdAt: startedAt },
    { name: 'deepseek-1', agent: 'deepseek', agentSessionId: IDS.deepseek, cwd: project, createdAt: startedAt },
    { name: 'qwen-1', agent: 'qwen', agentSessionId: IDS.qwen, cwd: project, createdAt: startedAt },
    { name: 'shell-2', agent: 'shell', agentSessionId: null, cwd: project, createdAt: startedAt }
  ]),
  'utf8'
);

// ---------------------------------------------------------------------------
// The reading each driven window returns
// ---------------------------------------------------------------------------

/**
 * The DOM reading. Markup independent on purpose: it reads text and rectangles
 * and never assumes a class name beyond `.overview-layer` and `.shell`.
 *
 * @param {object} spec  extra checks per launch
 */
function readerJs(spec) {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    ${spec.press === true ? PRESS_JS : ''}
    // Wait for the layer to hold text, up to 20 s.
    const deadline = Date.now() + 20000;
    let layer = null;
    while (Date.now() < deadline) {
      layer = document.querySelector('.overview-layer');
      if (layer !== null && (layer.innerText || '').trim() !== '' ) break;
      if (${JSON.stringify(spec.press === true)}) break;
      await wait(400);
    }
    ${spec.press === true ? 'await wait(80);' : 'await wait(600);'}
    const shell = document.querySelector('.shell');
    const shellClass = shell === null ? null : shell.className;
    const durPanel = shell === null ? null : getComputedStyle(shell).getPropertyValue('--dur-panel').trim();
    layer = document.querySelector('.overview-layer');
    if (layer === null) {
      return { error: 'the overview layer is not on the page', shellClass, durPanel };
    }
    const r = layer.getBoundingClientRect();
    const rect = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
    const win = { w: window.innerWidth, h: window.innerHeight };
    const scroller = document.scrollingElement;
    const fits = rect.width <= win.w && rect.top + rect.height <= win.h + 1 && scroller.scrollWidth <= win.w;

    // Every digit run outside a clock, a date, an elapsed time or quoted
    // conversation text. The list must be empty.
    const allowed = (el) => el !== null && el.closest('[data-clock],[data-date],[data-age],[data-quoted]') !== null;
    const digitRuns = [];
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent || '';
      if (!/[0-9]/.test(text)) continue;
      if (allowed(node.parentElement)) continue;
      for (const m of text.match(/[0-9]+/g) || []) digitRuns.push(m);
    }

    const flat = (layer.innerText || '').replace(/\\s+/g, ' ').trim();
    const gitMarks = ['git agrees', 'git has no record', 'nothing to check'].filter((s) => flat.includes(s));
    const namesShown = ${JSON.stringify(spec.names ?? [])}.filter((n) => flat.includes(n));
    return {
      shellClass,
      durPanel,
      rect,
      win,
      fits,
      digitRuns,
      gitMarks,
      namesShown,
      textHead: flat.slice(0, 1500)
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

/**
 * The real chord, dispatched on window. The keyboard sits on the shell, so
 * the level decision lands on 'project'.
 */
const PRESS_JS = `
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'U', code: 'KeyU', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true, view: window
    }));
`;

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

async function launch(label, overviewSpec, jsSpec) {
  const png = join(outDir, `p137-${label}.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, overview: overviewSpec };
  let child = null;
  let text = '';
  try {
    say(`launch ${label}`);
    child = spawn(
      electronBin,
      ['.', `--user-data-dir=${join(root, `profile-${label}`)}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          HOME: home,
          GMUX_SHOT: png,
          GMUX_SHOT_DELAY_MS: '9000',
          GMUX_OVERVIEW_SEED: seedPath,
          GMUX_SHOT_DRIVE: JSON.stringify(drive),
          GMUX_SHOT_JS: readerJs(jsSpec)
        }
      }
    );
    const onText = (b) => {
      text += b.toString();
    };
    child.stdout.on('data', onText);
    child.stderr.on('data', onText);
    const code = await new Promise((r) => {
      const watchdog = setTimeout(() => {
        console.error(`${TAG} ${label} passed its ceiling. Ending the pid I started.`);
        try {
          child.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }, 300_000);
      child.on('error', (err) => {
        clearTimeout(watchdog);
        console.error(`${TAG} electron could not start: ${err.message}`);
        r(1);
      });
      child.on('exit', (c) => {
        clearTimeout(watchdog);
        setTimeout(() => {
          r(c ?? 1);
        }, 500);
      });
    });
    child.stdout.destroy();
    child.stderr.destroy();
    const marker = '[gmux-shot] probe ';
    const at = text.lastIndexOf(marker);
    let report = null;
    if (at !== -1) {
      try {
        report = JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
      } catch {
        report = null;
      }
    }
    return { code, png: existsSync(png) ? png : null, report, text };
  } finally {
    // Whatever happened above, the Electron this function started is ended
    // here. Only the pid recorded in this scope is touched.
    if (child !== null && child.pid !== undefined) {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch {
        /* already gone, which is the state we wanted */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];

async function main() {
  const runs = [
    {
      label: 'project',
      overview: { level: 'project' },
      js: { names: ['claude-6', 'codex-2', 'grok-1', 'deepseek-1', 'qwen-1', 'shell-2'] },
      wantNames: 6
    },
    {
      label: 'session',
      overview: { level: 'session', sessionNames: ['claude-6'] },
      js: { names: ['claude-6'] },
      wantGitMark: true
    },
    {
      label: 'several',
      overview: { level: 'several', sessionNames: ['claude-6', 'codex-2', 'grok-1'] },
      js: { names: ['claude-6', 'codex-2', 'grok-1'] },
      wantNames: 3
    },
    {
      label: 'flight',
      overview: { level: 'project', stretchFlightMs: 2000, pressOnly: true },
      js: { press: true },
      midFlight: true
    }
  ];

  const results = {};
  for (const run of runs) {
    const res = await launch(run.label, run.overview, run.js);
    results[run.label] = res;
    if (res.png === null) failures.push(`${run.label}: no picture was written`);
    if (res.report === null) {
      failures.push(`${run.label}: the driven window printed no reading (electron exited ${String(res.code)})`);
      continue;
    }
    const rep = res.report;
    if (rep.error !== undefined && run.midFlight !== true) {
      failures.push(`${run.label}: the driver reported ${String(rep.error)}`);
      continue;
    }
    if (run.midFlight === true) {
      if (typeof rep.shellClass !== 'string' || !rep.shellClass.includes('gmux-focusing')) {
        failures.push(
          `flight: the shell class 80 ms after the chord is ${JSON.stringify(rep.shellClass)} and it must ` +
            'contain gmux-focusing. The picture would not be mid flight.'
        );
      }
      say(`flight: shell class "${String(rep.shellClass)}", --dur-panel ${String(rep.durPanel)} (stretched to 2000 ms)`);
      continue;
    }
    if (rep.fits !== true) {
      failures.push(
        `${run.label}: the page does not fit the window. Layer ${JSON.stringify(rep.rect)} in ` +
          `${JSON.stringify(rep.win)}.`
      );
    }
    if ((rep.digitRuns ?? []).length !== 0) {
      failures.push(
        `${run.label}: ${String(rep.digitRuns.length)} digit runs sit outside a clock, a date, an elapsed ` +
          `time or quoted text: ${rep.digitRuns.slice(0, 10).join(', ')}`
      );
    }
    if (run.wantNames !== undefined && (rep.namesShown ?? []).length < run.wantNames) {
      failures.push(
        `${run.label}: only ${String((rep.namesShown ?? []).length)} of ${String(run.wantNames)} session names ` +
          `are on the page: ${(rep.namesShown ?? []).join(', ')}`
      );
    }
    if (run.wantGitMark === true && (rep.gitMarks ?? []).length === 0) {
      failures.push(`${run.label}: no git mark text is on the page`);
    }
    say(
      `${run.label}: fits ${String(rep.fits)}, layer ${String(rep.rect.width)}x${String(rep.rect.height)} in ` +
        `${String(rep.win.w)}x${String(rep.win.h)}, digit runs outside allowed spans ${String((rep.digitRuns ?? []).length)}, ` +
        `git marks [${(rep.gitMarks ?? []).join(', ')}], names [${(rep.namesShown ?? []).join(', ')}]`
    );
    writeFileSync(join(outDir, `p137-${run.label}.json`), JSON.stringify(rep, null, 2), 'utf8');
  }

  console.log('');
  say(`pictures and readings are in ${outDir}`);
  for (const run of runs) {
    say(`  p137-${run.label}.png ${results[run.label].png === null ? 'MISSING' : 'written'}`);
  }
}

await main();

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(`the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`);
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. Four launches, four pictures, four readings, and the operator server untouched.');
