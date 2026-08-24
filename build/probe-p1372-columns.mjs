#!/usr/bin/env node
/**
 * probe-p1372-columns.mjs. The Phase 137.2 proof for the scrolling columns
 * and the project rows' agent marks, modelled on build/probe-p137-overview.mjs.
 *
 * ## What it proves
 *
 * Launch one, the columns view with two seeded sessions whose claude column
 * holds a long conversation:
 *  - each column draws the session's WHOLE turns list, not only the latest
 *    exchange, inside its own scroller, and opens scrolled to its end
 *  - ArrowLeft and ArrowRight move the visible focus edge between columns
 *  - ArrowDown presses scroll the FOCUSED column, proven by scrollTop and by
 *    the first turn's rectangle, while every neighbour's scrollTop stays
 *    byte identical to its before value
 *  - a wheel event over one column is not intercepted by any listener, and a
 *    scroll of that column's own container moves no neighbour and no
 *    selection. A synthetic wheel cannot natively scroll in Chromium, so the
 *    probe proves the two halves the native path is made of: the container
 *    is its own overflow scroller, and nothing couples it to its neighbour.
 *
 * Launch two, the project view:
 *  - every agent row draws exactly one svg mark inside its name cell, and
 *    the shell-2 row draws none at all
 *
 * Both photographs are written for the eye beside the JSON readings.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run without a harness socket of its own and refuses the
 *    names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` and a scratch
 *    HOME under the harness directory. At most one Electron runs at a time,
 *    each is awaited to exit, and the pid is killed in a finally block
 *    whatever happened. No pkill, no kill-server, anywhere.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p1372columns
 *
 * Exit 0 when both pictures and both readings exist and every assertion
 * held. 1 when they did not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
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

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p1372columns]';

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
      "node build/harness-socket.mjs gmux-p1372-columns 'node build/probe-p1372-columns.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const outDir = resolve(
  repoRoot,
  (process.env['P1372_OUT_DIR'] ?? '').trim() || 'out/p1372'
);
mkdirSync(outDir, { recursive: true });

/** The operator's live server, listed and never written. Named once. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);
say(`harness socket: ${socket}`);

// ---------------------------------------------------------------------------
// The scratch world, the shape probe-p137-overview.mjs builds
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p1372-columns');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p1372-project', 'scripts'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p1372-project');
const home = join(root, 'home');

/** qwen's encoding, copied from src/main/manifest/harvest/stores.ts. */
const sanitizeQwenCwd = (cwd) => cwd.replace(/[^a-zA-Z0-9]/g, '-');

const IDS = {
  claude: '11111111-2222-4333-8444-555555555555',
  codex: '0000aaaa-1111-7000-8000-222233334444',
  qwen: '11111111-2222-4333-8444-555555555555'
};

function place(rel, fixtureName) {
  const dst = join(home, rel);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(FIXTURES, fixtureName), dst);
}

place(
  join(
    '.claude',
    'projects',
    project.replace(/\//g, '-'),
    `${IDS.claude}.jsonl`
  ),
  'claude-session.jsonl'
);
place(
  join(
    '.codex',
    'sessions',
    '2026',
    '08',
    '19',
    `rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`
  ),
  `codex-rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`
);
place(
  join('.qwen', 'projects', sanitizeQwenCwd(project), 'chats', `${IDS.qwen}.jsonl`),
  'qwen-chat.jsonl'
);
place(
  join(
    '.qwen',
    'projects',
    sanitizeQwenCwd(project),
    'chats',
    `${IDS.qwen}.runtime.json`
  ),
  'qwen-chat.runtime.json'
);

// A long conversation, appended to the claude COPY and never to the
// committed fixture, so the claude column overflows its scroller and the
// scrolling has something to move.
{
  const claudeCopy = join(
    home,
    '.claude',
    'projects',
    project.replace(/\//g, '-'),
    `${IDS.claude}.jsonl`
  );
  const base = {
    isSidechain: false,
    userType: 'external',
    entrypoint: 'cli',
    cwd: '/Users/dev/demo-app',
    sessionId: IDS.claude,
    version: '2.1.238',
    gitBranch: 'main'
  };
  const ask = (uuid, ts, text, promptId) =>
    JSON.stringify({
      parentUuid: null,
      ...base,
      type: 'user',
      message: { role: 'user', content: text },
      uuid,
      timestamp: ts,
      promptSource: 'typed',
      promptId,
      origin: { kind: 'human' }
    });
  const answer = (uuid, ts, text) =>
    JSON.stringify({
      parentUuid: null,
      ...base,
      message: {
        model: 'claude-opus-5',
        id: `msg_${uuid.slice(0, 8)}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text }]
      },
      requestId: `req_${uuid.slice(0, 8)}`,
      type: 'assistant',
      uuid,
      timestamp: ts
    });
  const lines = [];
  const asks = [
    'please rename the helper so its name says what it does',
    'now add the missing test for the empty case',
    'walk the tree once instead of twice',
    'the error message should name the file it read',
    'move the retry into the caller',
    'the log line repeats itself, print it once',
    'make the timeout a named constant',
    'the doc comment says the old behavior, fix it',
    'inline the wrapper that only forwards',
    'sort the imports the way the rest of the file does',
    'the flag is read twice, read it once',
    'give the fixture a name that says what it holds'
  ];
  for (let i = 0; i < asks.length; i++) {
    const nn = String(i + 10);
    const minute = String(10 + i).padStart(2, '0');
    lines.push(
      ask(
        `bbbb00${nn}-1111-4111-8111-111111111111`,
        `2026-08-20T09:${minute}:00.000Z`,
        asks[i],
        `p-02${nn}`
      ),
      answer(
        `cccc00${nn}-1111-4111-8111-111111111111`,
        `2026-08-20T09:${minute}:30.000Z`,
        'Done. The change is small and the tests still pass.\n\nNothing else moved.'
      )
    );
  }
  writeFileSync(
    claudeCopy,
    readFileSync(claudeCopy, 'utf8') + lines.join('\n') + '\n',
    'utf8'
  );
}

// The project, a real git repository so the git marks have ground to stand on.
writeFileSync(join(project, 'README.md'), '# Phase 137.2 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync(
    'git',
    [
      '-C',
      project,
      '-c',
      'user.name=p1372',
      '-c',
      'user.email=p1372@harness.invalid',
      ...args
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) refuse(`git ${args.join(' ')} failed: ${r.stderr}`);
};
git('init', '-q');
git('add', 'README.md');
git('commit', '-q', '-m', 'first');

const seedPath = join(root, 'overview-seed.json');
const startedAt = Date.UTC(2026, 7, 20, 8, 0, 0);
writeFileSync(
  seedPath,
  JSON.stringify([
    { name: 'claude-6', agent: 'claude', agentSessionId: IDS.claude, cwd: project, createdAt: startedAt },
    { name: 'codex-2', agent: 'codex', agentSessionId: IDS.codex, cwd: project, createdAt: Date.UTC(2026, 7, 19, 10, 0, 0) },
    { name: 'qwen-1', agent: 'qwen', agentSessionId: IDS.qwen, cwd: project, createdAt: startedAt },
    { name: 'shell-2', agent: 'shell', agentSessionId: null, cwd: project, createdAt: startedAt }
  ]),
  'utf8'
);

// ---------------------------------------------------------------------------
// The two readings
// ---------------------------------------------------------------------------

/**
 * The columns reading. It presses real keydowns on the layer, where the
 * page's own onKeyDown listens, and reads scrollTop and rectangles back.
 */
const COLUMNS_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const deadline = Date.now() + 20000;
    let layer = null;
    while (Date.now() < deadline) {
      layer = document.querySelector('.overview-layer');
      if (layer !== null && layer.querySelectorAll('.overview-column').length > 0) break;
      await wait(400);
    }
    await wait(600);
    layer = document.querySelector('.overview-layer');
    if (layer === null) return { error: 'the overview layer is not on the page' };
    const cols = Array.from(layer.querySelectorAll('.overview-column'));
    const bodies = cols.map((c) => c.querySelector('.overview-column-body'));
    if (cols.length !== 2 || bodies.some((b) => b === null)) {
      return { error: 'expected two columns with bodies, got ' + String(cols.length) };
    }
    const press = (key) => {
      layer.dispatchEvent(new KeyboardEvent('keydown', {
        key, bubbles: true, cancelable: true
      }));
    };
    const focusedIndex = () => cols.findIndex((c) => c.classList.contains('focused'));
    const out = {};

    // The answers render as markdown through a lazily loaded chunk, and the
    // columns stay pinned to their end while the turns grow. Wait for the
    // chunk before measuring where the columns landed.
    if (layer.querySelector('.md-answer') !== null) {
      const mdDeadline = Date.now() + 5000;
      while (Date.now() < mdDeadline && layer.querySelector('.md-answer-rendered') === null) {
        await wait(100);
      }
      await wait(400);
    }

    // The whole conversation, in the column's own scroller, opened at the end.
    out.turnsPerColumn = bodies.map((b) => b.querySelectorAll('.overview-turn').length);
    out.overflow = bodies.map((b) => ({
      scrollHeight: b.scrollHeight,
      clientHeight: b.clientHeight,
      scrollTop: b.scrollTop,
      overflowY: getComputedStyle(b).overflowY
    }));
    out.openedAtEnd = bodies.map(
      (b) => Math.abs(b.scrollTop - (b.scrollHeight - b.clientHeight)) <= 2
    );

    // The focus edge moves with left and right.
    out.focusStart = focusedIndex();
    press('ArrowRight');
    await wait(120);
    out.focusAfterRight = focusedIndex();
    press('ArrowLeft');
    await wait(120);
    out.focusAfterLeft = focusedIndex();

    // ArrowDown scrolls the focused column and only it. The column starts at
    // its top so every press has room to move, and each press is read back
    // by scrollTop and by the first turn's rectangle. The wheel dispatch
    // first takes the end pin off the column, the way a person's own wheel
    // would, so nothing re-lands it at the end mid measurement.
    bodies[0].dispatchEvent(new WheelEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true }));
    await wait(60);
    bodies[0].scrollTop = 0;
    await wait(120);
    const neighbourBefore = bodies[1].scrollTop;
    const steps = [];
    for (let i = 0; i < 5; i++) {
      const rectBefore = bodies[0].querySelector('.overview-turn').getBoundingClientRect().top;
      press('ArrowDown');
      await wait(90);
      steps.push({
        scrollTop: bodies[0].scrollTop,
        rectMoved: rectBefore - bodies[0].querySelector('.overview-turn').getBoundingClientRect().top
      });
    }
    out.downSteps = steps;
    out.neighbourBefore = neighbourBefore;
    out.neighbourAfterKeys = bodies[1].scrollTop;
    press('ArrowUp');
    await wait(90);
    out.afterUp = bodies[0].scrollTop;

    // The wheel half. A synthetic wheel event cannot natively scroll, so the
    // proof is in two parts: no listener intercepts the wheel over a column,
    // and a scroll of that column's own container moves no neighbour.
    const wheel = new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true });
    const c0Before = bodies[0].scrollTop;
    bodies[1].dispatchEvent(wheel);
    await wait(120);
    out.wheelIntercepted = wheel.defaultPrevented;
    bodies[1].scrollTop = Math.min(bodies[1].scrollTop + 240, bodies[1].scrollHeight);
    await wait(120);
    out.c0AfterWheelScroll = bodies[0].scrollTop;
    out.c0BeforeWheelScroll = c0Before;
    out.c1AfterWheelScroll = bodies[1].scrollTop;

    return out;
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;

/** The project view reading: one svg mark per agent row, none on shell-2. */
const MARKS_JS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const deadline = Date.now() + 20000;
    let layer = null;
    while (Date.now() < deadline) {
      layer = document.querySelector('.overview-layer');
      if (layer !== null && layer.querySelectorAll('.overview-line').length > 0) break;
      await wait(400);
    }
    await wait(600);
    layer = document.querySelector('.overview-layer');
    if (layer === null) return { error: 'the overview layer is not on the page' };
    const rows = Array.from(layer.querySelectorAll('.overview-line')).map((row) => {
      const name = row.querySelector('.overview-line-name');
      return {
        name: (name === null ? '' : name.textContent || '').trim(),
        svgs: name === null ? 0 : name.querySelectorAll('.gmux-icon svg').length
      };
    });
    return { rows };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------


async function launch(label, overviewSpec, js) {
  const png = join(outDir, `p1372-${label}.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, overview: overviewSpec };
  say(`launch ${label}`);
  // build/electron-run.mjs owns the launch and ends the whole tree it started
  // in a finally block whatever happened here (Phase 140). The tree walk this
  // file used to carry lives there now, with a SIGTERM before it, because the
  // shim at node_modules/.bin/electron cannot forward SIGKILL.
  const { code, text } = await runElectron({
    label: `p1372 ${label}`,
    userDataDir: join(root, `profile-${label}`),
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: home,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_OVERVIEW_SEED: seedPath,
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: js
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
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
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];

async function main() {
  // Launch one, the columns.
  const columns = await launch(
    'columns',
    { level: 'several', sessionNames: ['claude-6', 'codex-2'] },
    COLUMNS_JS
  );
  if (columns.png === null) failures.push('columns: no picture was written');
  if (columns.report === null) {
    failures.push(
      `columns: the driven window printed no reading (electron exited ${String(columns.code)})`
    );
  } else if (columns.report.error !== undefined) {
    failures.push(`columns: the driver reported ${String(columns.report.error)}`);
  } else {
    const rep = columns.report;
    writeFileSync(join(outDir, 'p1372-columns.json'), JSON.stringify(rep, null, 2), 'utf8');
    if (!(rep.turnsPerColumn[0] > 1)) {
      failures.push(
        `columns: the claude column draws ${String(rep.turnsPerColumn[0])} turn blocks, so it does not hold the whole conversation`
      );
    }
    if (rep.overflow[0].overflowY !== 'auto' || rep.overflow[1].overflowY !== 'auto') {
      failures.push(
        `columns: a column body is not its own scroller: ${JSON.stringify(rep.overflow.map((o) => o.overflowY))}`
      );
    }
    if (!(rep.overflow[0].scrollHeight > rep.overflow[0].clientHeight)) {
      failures.push('columns: the long claude column does not overflow, so nothing was scrollable');
    }
    if (rep.openedAtEnd[0] !== true) {
      failures.push(
        `columns: the claude column did not open at its end: ${JSON.stringify(rep.overflow[0])}`
      );
    }
    if (rep.focusStart !== 0 || rep.focusAfterRight !== 1 || rep.focusAfterLeft !== 0) {
      failures.push(
        `columns: the focus edge did not move right and back: start ${String(rep.focusStart)}, ` +
          `right ${String(rep.focusAfterRight)}, left ${String(rep.focusAfterLeft)}`
      );
    }
    let monotonic = true;
    let prior = 0;
    for (const step of rep.downSteps) {
      if (!(step.scrollTop > prior) || !(step.rectMoved > 0)) monotonic = false;
      prior = step.scrollTop;
    }
    if (!monotonic) {
      failures.push(
        `columns: ArrowDown presses did not move the focused column monotonically: ${JSON.stringify(rep.downSteps)}`
      );
    }
    if (rep.neighbourAfterKeys !== rep.neighbourBefore) {
      failures.push(
        `columns: the neighbour's scrollTop moved under the focused column's keys, ` +
          `${String(rep.neighbourBefore)} to ${String(rep.neighbourAfterKeys)}`
      );
    }
    if (!(rep.afterUp < rep.downSteps[rep.downSteps.length - 1].scrollTop)) {
      failures.push('columns: ArrowUp did not scroll the focused column back');
    }
    if (rep.wheelIntercepted !== false) {
      failures.push('columns: a listener intercepted the wheel over a column');
    }
    if (rep.c0AfterWheelScroll !== rep.c0BeforeWheelScroll) {
      failures.push(
        `columns: scrolling one column moved its neighbour, ` +
          `${String(rep.c0BeforeWheelScroll)} to ${String(rep.c0AfterWheelScroll)}`
      );
    }
    say(
      `columns: turns per column ${JSON.stringify(rep.turnsPerColumn)}, ` +
        `focus ${String(rep.focusStart)}>${String(rep.focusAfterRight)}>${String(rep.focusAfterLeft)}, ` +
        `down steps ${JSON.stringify(rep.downSteps.map((s) => s.scrollTop))}, ` +
        `neighbour ${String(rep.neighbourBefore)} before and ${String(rep.neighbourAfterKeys)} after, ` +
        `wheel intercepted ${String(rep.wheelIntercepted)}`
    );
  }

  // Launch two, the project view's marks.
  const marks = await launch('marks', { level: 'project' }, MARKS_JS);
  if (marks.png === null) failures.push('marks: no picture was written');
  if (marks.report === null) {
    failures.push(
      `marks: the driven window printed no reading (electron exited ${String(marks.code)})`
    );
  } else if (marks.report.error !== undefined) {
    failures.push(`marks: the driver reported ${String(marks.report.error)}`);
  } else {
    const rows = marks.report.rows ?? [];
    writeFileSync(join(outDir, 'p1372-marks.json'), JSON.stringify(rows, null, 2), 'utf8');
    const agents = ['claude-6', 'codex-2', 'qwen-1'];
    for (const wanted of agents) {
      const row = rows.find((r) => r.name.includes(wanted));
      if (row === undefined) {
        failures.push(`marks: the row for ${wanted} is not on the page`);
      } else if (row.svgs !== 1) {
        failures.push(
          `marks: the ${wanted} row draws ${String(row.svgs)} svg marks and must draw exactly one`
        );
      }
    }
    const shell = rows.find((r) => r.name.includes('shell-2'));
    if (shell === undefined) {
      failures.push('marks: the shell-2 row is not on the page');
    } else if (shell.svgs !== 0) {
      failures.push(
        `marks: the shell-2 row draws ${String(shell.svgs)} svg marks and must draw none`
      );
    }
    say(`marks: ${JSON.stringify(rows)}`);
  }

  console.log('');
  say(`pictures and readings are in ${outDir}`);
}

await main();

const operatorAfter = operatorSessionCount();
console.log('');
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`
  );
}

rmSync(root, { recursive: true, force: true });

if (failures.length > 0) {
  console.log('');
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. Two launches, two pictures, two readings, and the operator server untouched.');
