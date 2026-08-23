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
 * the real app seven times, one at a time, photographs the project view, the
 * session view and the columns view, and captures one frame while the 200 ms
 * flight is stretched to 2000 ms so the picture lands mid flight.
 *
 * Phase 137.2 adds three launches for the ask rail. A short conversation
 * shows the rail with one row per ask, a sixty ask conversation shows the
 * rail scrolling on its own while a press, the arrows at repeat speed, a
 * wheel scroll and the Tab, Return and Escape reach are proven by rectangle
 * and index reads rather than by eye, and a narrow window shows the rail
 * collapsed with the conversation still fitting.
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
  qwen: '11111111-2222-4333-8444-555555555555',
  claude7: 'bbbbbbbb-2222-4333-8444-777777777777'
};

function place(rel, fixtureName) {
  const dst = join(home, rel);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(FIXTURES, fixtureName), dst);
}

place(join('.claude', 'projects', project.replace(/\//g, '-'), `${IDS.claude}.jsonl`), 'claude-session.jsonl');

// Phase 137.1. Two turns appended to the claude COPY, never to the committed
// fixture. The first carries the hostile answer the backlog entry names, so
// the DOM reading below can prove a script tag, an img onerror, an iframe
// and a javascript: link reach nothing. The second is the markdown showcase
// the photographs are read for, being a list, a fence and inline code, with
// an ask that carries a literal asterisk to prove asks stay plain.
{
  const claudeCopy = join(home, '.claude', 'projects', project.replace(/\//g, '-'), `${IDS.claude}.jsonl`);
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
  const hostileAnswer = [
    'Before the attack.',
    '<script>window.gmux.terminalWrite("rm -rf ~")</script>',
    '<img src=x onerror="fetch(\'https://evil.example/x\')">',
    '<iframe src="https://evil.example/frame"></iframe>',
    '[click me](javascript:alert(document.title))',
    'After the attack.'
  ].join('\n\n');
  const showcaseAnswer = [
    'The release steps, in order:',
    '',
    '- build the DMG',
    '- staple the ticket',
    '- run `scripts/release.sh` last',
    '',
    '```sh',
    'sh scripts/release.sh --dry-run',
    '```',
    '',
    'The dry run printed the order above and nothing else changed.'
  ].join('\n');
  const lines = [
    ask('aaaa0001-1111-4111-8111-111111111111', '2026-08-20T10:07:00.000Z', 'please try rendering some html in your answer so we can see what happens', 'p-0101'),
    answer('aaaa0002-1111-4111-8111-111111111111', '2026-08-20T10:07:30.000Z', hostileAnswer),
    ask('aaaa0003-1111-4111-8111-111111111111', '2026-08-20T10:08:00.000Z', 'can you list the release steps and mark the *manual* one with `code`', 'p-0102'),
    answer('aaaa0004-1111-4111-8111-111111111111', '2026-08-20T10:08:40.000Z', showcaseAnswer)
  ];
  writeFileSync(claudeCopy, readFileSync(claudeCopy, 'utf8') + lines.join('\n') + '\n', 'utf8');
}
// Phase 137.2. A sixty ask conversation, GENERATED into the scratch home
// and never committed anywhere. It is a second claude session in the same
// project, so the rail's long run and the narrow run have a conversation
// deep enough that the rail must scroll. The reader caps the view at its
// own turn limit, which is fine: the rail draws the rows the view holds.
{
  const dir = join(home, '.claude', 'projects', project.replace(/\//g, '-'));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${IDS.claude7}.jsonl`);
  const base = {
    isSidechain: false,
    userType: 'external',
    entrypoint: 'cli',
    cwd: project,
    sessionId: IDS.claude7,
    version: '2.1.238',
    gitBranch: 'main'
  };
  const pad = (n) => String(n).padStart(4, '0');
  const lines = [];
  for (let i = 0; i < 60; i += 1) {
    const askAt = new Date(Date.UTC(2026, 7, 20, 6, 0, 0) + i * 60_000).toISOString();
    const ansAt = new Date(Date.UTC(2026, 7, 20, 6, 0, 30) + i * 60_000).toISOString();
    lines.push(
      JSON.stringify({
        parentUuid: null,
        ...base,
        type: 'user',
        message: {
          role: 'user',
          content: `drill ask ${pad(i)}: run the release drill again and tell me what changed`
        },
        uuid: `bbbb${pad(i)}-1111-4111-8111-111111111111`,
        timestamp: askAt,
        promptSource: 'typed',
        promptId: `p-7-${pad(i)}`,
        origin: { kind: 'human' }
      })
    );
    lines.push(
      JSON.stringify({
        parentUuid: null,
        ...base,
        message: {
          model: 'claude-opus-5',
          id: `msg_b${pad(i)}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: `the drill ran clean on pass ${pad(i)} and nothing changed` }]
        },
        requestId: `req_b${pad(i)}`,
        type: 'assistant',
        uuid: `cccc${pad(i)}-1111-4111-8111-111111111111`,
        timestamp: ansAt
      })
    );
  }
  writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}
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
    { name: 'claude-7', agent: 'claude', agentSessionId: IDS.claude7, cwd: project, createdAt: Date.UTC(2026, 7, 20, 6, 0, 0) },
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

    // Phase 137.1. The answers render as markdown through a lazily loaded
    // chunk, so give the chunk a moment where an answer is on the page.
    if (layer.querySelector('.md-answer') !== null) {
      const mdDeadline = Date.now() + 5000;
      while (Date.now() < mdDeadline && layer.querySelector('.md-answer-rendered') === null) {
        await wait(100);
      }
      await wait(200);
    }

    // The hostile shapes the Phase 137.1 entry names, read off the LIVE DOM.
    // Every count must be zero on every view.
    const hostile = {
      scriptOrIframe: layer.querySelectorAll('script, iframe').length,
      onerrorAttrs: layer.querySelectorAll('[onerror]').length,
      javascriptHrefs: Array.from(layer.querySelectorAll('a')).filter(
        (a) => (a.getAttribute('href') || '').trim().toLowerCase().startsWith('javascript:')
      ).length
    };
    // What the markdown actually drew, for the runs that show an answer.
    const markdown = {
      rendered: layer.querySelectorAll('.md-answer-rendered').length,
      listItems: layer.querySelectorAll('.md-answer-rendered ul li, .md-answer-rendered ol li').length,
      fences: layer.querySelectorAll('.md-answer-rendered pre code').length,
      inlineCode: layer.querySelectorAll('.md-answer-rendered :not(pre) > code').length
    };

    // Phase 137.2. The ask rail, read by rectangle and by index.
    let rail = null;
    ${spec.rail === true ? RAIL_READ_JS : ''}
    let railDrive = null;
    ${spec.railDrive === true ? RAIL_DRIVE_JS : ''}

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
      hostile,
      markdown,
      rail,
      railDrive,
      textHead: flat.slice(0, 1500)
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

/**
 * Phase 137.2. The rail's still reading: presence, row count against turn
 * count, its own scrollability, the header's agent mark, and which row
 * carries the current tick.
 */
const RAIL_READ_JS = `
    {
      const railEl = layer.querySelector('.overview-ask-rail');
      const conv = layer.querySelector('.overview-scroll');
      rail = {
        present: railEl !== null,
        visible:
          railEl !== null &&
          getComputedStyle(railEl).display !== 'none' &&
          railEl.getClientRects().length > 0,
        rows: railEl === null ? 0 : railEl.querySelectorAll('.overview-ask-rail-row').length,
        turns: layer.querySelectorAll('.overview-turn').length,
        railScrolls: railEl !== null && railEl.scrollHeight > railEl.clientHeight + 1,
        convScrolls: conv !== null && conv.scrollHeight > conv.clientHeight + 1,
        headerMark: layer.querySelector('.overview-session-title svg') !== null,
        marked:
          railEl === null
            ? -1
            : Array.from(railEl.querySelectorAll('.overview-ask-rail-row')).findIndex((r) =>
                r.classList.contains('current')
              )
      };
    }
`;

/**
 * Phase 137.2. The rail driven for real: a press on a row, a wheel scroll,
 * ArrowUp at repeat speed with a rectangle read per press, then Tab into the
 * rail, Return to jump and Escape back through the window ladder. Everything
 * is asserted node side from the numbers this returns.
 */
const RAIL_DRIVE_JS = `
    {
      const layerEl = document.querySelector('.overview-layer');
      const conv = layer.querySelector('.overview-scroll');
      const railEl = layer.querySelector('.overview-ask-rail');
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))));
      const rows = () => Array.from(railEl.querySelectorAll('.overview-ask-rail-row'));
      const marked = () => rows().findIndex((r) => r.classList.contains('current'));
      const cursorAt = () => rows().findIndex((r) => r.classList.contains('cursor'));
      const selRect = () => {
        const el = conv.querySelector('.overview-turn.selected');
        if (el === null) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      };
      const box = conv.getBoundingClientRect();
      const inView = () => {
        const r = selRect();
        return r !== null && r.bottom > box.top + 1 && r.top < box.bottom - 1;
      };
      const press = (k) => {
        layerEl.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      };

      // One press on a rail row lands the conversation on that exchange.
      const clickIndex = 5;
      rows()[clickIndex].click();
      await frame();
      const click = { wanted: clickIndex, marked: marked(), inView: inView() };

      // A wheel scroll moves no selection.
      const beforeWheel = marked();
      conv.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true }));
      conv.scrollTop += 240;
      await frame();
      const wheel = { before: beforeWheel, after: marked(), scrollMoved: conv.scrollTop > 0 };

      // Back to the newest exchange, then ArrowUp at repeat speed. Per press,
      // the marked rail row and whether the selected exchange's rectangle
      // sits inside the conversation's viewport.
      rows()[rows().length - 1].click();
      await frame();
      const repeat = [];
      for (let i = 0; i < 12; i += 1) {
        press('ArrowUp');
        await frame();
        repeat.push({ marked: marked(), inView: inView() });
        await wait(30);
      }

      // Keyboard reach. Tab in, one arrow up, Return jumps, Escape returns
      // the keyboard through the WINDOW capture ladder with the page open.
      press('Tab');
      await frame();
      let keys = { wired: railEl.classList.contains('active') };
      if (keys.wired) {
        const c0 = cursorAt();
        press('ArrowUp');
        await frame();
        const c1 = cursorAt();
        press('Enter');
        await frame();
        const jump = { cursor: c1, marked: marked(), inView: inView() };
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        await frame();
        keys = {
          wired: true,
          cursorMoved: c1 === c0 - 1,
          jump,
          stillOpen: document.querySelector('.overview-layer') !== null,
          railInactive: !railEl.classList.contains('active')
        };
      }
      railDrive = { click, wheel, repeat, keys };
    }
`;

/**
 * The real chord, dispatched on window. The keyboard sits on the shell, so
 * the level decision lands on 'project'.
 */
const PRESS_JS = `
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'U', code: 'KeyU', metaKey: true, shiftKey: true,
      bubbles: true, cancelable: true, view: window
    }));
`;

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * Ends a recorded pid AND every process descended from it. A SIGKILL to the
 * main pid alone leaves the renderer, the GPU helper, the utility helpers
 * and crashpad alive, which a rail long run under load measured: four
 * orphans stayed up after the watchdog fired. The descendants are read with
 * pgrep -P while the parent still holds them, because a dead parent's
 * children reparent and can no longer be found this way. Nothing outside
 * the one recorded process tree can be named here.
 */
function killTree(pid) {
  const found = [];
  const stack = [pid];
  while (stack.length > 0) {
    const p = stack.pop();
    const r = spawnSync('pgrep', ['-P', String(p)], { encoding: 'utf8' });
    for (const line of (r.stdout ?? '').split('\n')) {
      const n = Number(line.trim());
      if (Number.isInteger(n) && n > 0 && !found.includes(n)) {
        found.push(n);
        stack.push(n);
      }
    }
  }
  for (const p of [...found, pid]) {
    try {
      process.kill(p, 'SIGKILL');
    } catch {
      /* already gone, which is the state we wanted */
    }
  }
}

async function launch(label, overviewSpec, jsSpec, extraEnv = {}) {
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
          GMUX_SHOT_JS: readerJs(jsSpec),
          ...extraEnv
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
        // The whole recorded tree goes, because a SIGKILL to the main
        // pid alone orphans the helper processes.
        if (child.pid !== undefined) killTree(child.pid);
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
    // here, together with every process descended from it. Only the tree
    // under the pid recorded in this scope is touched.
    if (child !== null && child.pid !== undefined) killTree(child.pid);
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
      wantGitMark: true,
      wantMarkdown: true
    },
    {
      label: 'several',
      overview: { level: 'several', sessionNames: ['claude-6', 'codex-2', 'grok-1'] },
      js: { names: ['claude-6', 'codex-2', 'grok-1'] },
      wantNames: 3,
      wantMarkdown: true
    },
    {
      label: 'flight',
      overview: { level: 'project', stretchFlightMs: 2000, pressOnly: true },
      js: { press: true },
      midFlight: true
    },
    // Phase 137.2. The rail at a short conversation: one row per ask, the
    // newest row marked, and the header wearing the agent's mark.
    {
      label: 'rail-short',
      overview: { level: 'session', sessionNames: ['qwen-1'] },
      js: { names: ['qwen-1'], rail: true },
      railShort: true
    },
    // Phase 137.2. The rail at sixty asks, driven: press, wheel, arrows at
    // repeat speed, Tab, Return and Escape, all read back as numbers.
    {
      label: 'rail-long',
      overview: { level: 'session', sessionNames: ['claude-7'] },
      js: { names: ['claude-7'], rail: true, railDrive: true },
      railLong: true
    },
    // Phase 137.2. The narrow window. The rail collapses before the
    // conversation does and the page still fits.
    {
      label: 'rail-narrow',
      overview: { level: 'session', sessionNames: ['claude-7'] },
      js: { names: ['claude-7'], rail: true },
      railNarrow: true,
      env: { GMUX_SHOT_SIZE: '960x700' }
    }
  ];

  const results = {};
  for (const run of runs) {
    const res = await launch(run.label, run.overview, run.js, run.env ?? {});
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
    // Phase 137.1. No hostile shape may reach the DOM, on any view.
    const hostile = rep.hostile ?? { scriptOrIframe: 0, onerrorAttrs: 0, javascriptHrefs: 0 };
    if (hostile.scriptOrIframe !== 0 || hostile.onerrorAttrs !== 0 || hostile.javascriptHrefs !== 0) {
      failures.push(
        `${run.label}: hostile markup reached the DOM: ${JSON.stringify(hostile)}`
      );
    }
    // Phase 137.1. The views that draw an answer must draw the showcase's
    // list, fence and inline code as those things.
    if (run.wantMarkdown === true) {
      const md = rep.markdown ?? { rendered: 0, listItems: 0, fences: 0, inlineCode: 0 };
      if (md.rendered === 0 || md.listItems === 0 || md.fences === 0 || md.inlineCode === 0) {
        failures.push(`${run.label}: the answer did not draw as markdown: ${JSON.stringify(md)}`);
      }
    }
    // Phase 137.2. The ask rail's own assertions, by index and rectangle.
    const rail = rep.rail ?? null;
    if (run.railShort === true) {
      if (rail === null || rail.present !== true || rail.visible !== true) {
        failures.push(`${run.label}: the rail is not on the page: ${JSON.stringify(rail)}`);
      } else {
        if (rail.rows !== rail.turns || rail.rows < 1) {
          failures.push(`${run.label}: the rail draws ${String(rail.rows)} rows for ${String(rail.turns)} turns`);
        }
        if (rail.marked !== rail.rows - 1) {
          failures.push(`${run.label}: the page opens at the newest exchange, so the marked rail row must be the last. It is ${String(rail.marked)} of ${String(rail.rows)}.`);
        }
        if (rail.headerMark !== true) {
          failures.push(`${run.label}: the header carries no agent mark`);
        }
      }
    }
    if (run.railLong === true) {
      if (rail === null || rail.present !== true || rail.visible !== true) {
        failures.push(`${run.label}: the rail is not on the page: ${JSON.stringify(rail)}`);
      } else {
        if (rail.rows < 40) failures.push(`${run.label}: only ${String(rail.rows)} rail rows for the sixty ask conversation`);
        if (rail.railScrolls !== true) failures.push(`${run.label}: the rail does not scroll on its own`);
        if (rail.convScrolls !== true) failures.push(`${run.label}: the conversation does not scroll`);
        if (rail.headerMark !== true) failures.push(`${run.label}: the header carries no agent mark`);
      }
      const drive = rep.railDrive ?? null;
      if (drive === null) {
        failures.push(`${run.label}: the rail drive returned nothing`);
      } else {
        if (drive.click.marked !== drive.click.wanted || drive.click.inView !== true) {
          failures.push(`${run.label}: a press on rail row ${String(drive.click.wanted)} landed on ${String(drive.click.marked)}, inView ${String(drive.click.inView)}`);
        }
        if (drive.wheel.after !== drive.wheel.before || drive.wheel.scrollMoved !== true) {
          failures.push(`${run.label}: a wheel scroll moved the selection from ${String(drive.wheel.before)} to ${String(drive.wheel.after)} (scrollMoved ${String(drive.wheel.scrollMoved)})`);
        }
        const startAt = (rail?.rows ?? 0) - 1;
        (drive.repeat ?? []).forEach((step, i) => {
          const want = Math.max(0, startAt - 1 - i);
          if (step.marked !== want) {
            failures.push(`${run.label}: repeat press ${String(i)} marked row ${String(step.marked)}, wanted ${String(want)}`);
          }
          if (step.inView !== true) {
            failures.push(`${run.label}: repeat press ${String(i)} left the selected exchange off screen`);
          }
        });
        if ((drive.repeat ?? []).length !== 12) {
          failures.push(`${run.label}: the repeat run pressed ${String((drive.repeat ?? []).length)} times, wanted 12`);
        }
        if (drive.keys.wired !== true) {
          failures.push(`${run.label}: Tab did not reach the rail. OverviewLayer must call handleSessionLevelKey first at the session level.`);
        } else {
          if (drive.keys.cursorMoved !== true) failures.push(`${run.label}: ArrowUp in the rail did not move the cursor by one`);
          if (drive.keys.jump.marked !== drive.keys.jump.cursor || drive.keys.jump.inView !== true) {
            failures.push(`${run.label}: Return in the rail landed on ${String(drive.keys.jump.marked)}, cursor was ${String(drive.keys.jump.cursor)}, inView ${String(drive.keys.jump.inView)}`);
          }
          if (drive.keys.stillOpen !== true) failures.push(`${run.label}: Escape in the rail closed the page`);
          if (drive.keys.railInactive !== true) failures.push(`${run.label}: Escape in the rail left the rail active`);
        }
      }
    }
    if (run.railNarrow === true) {
      if (rail === null || rail.present !== true) {
        failures.push(`${run.label}: the rail element is missing`);
      } else if (rail.visible !== false) {
        failures.push(`${run.label}: the rail is still visible at ${String(rep.win.w)} wide, and it must collapse before the conversation does`);
      }
      if (rep.win.w > 1000) {
        failures.push(`${run.label}: the window is ${String(rep.win.w)} wide, so the narrow photograph is not narrow`);
      }
    }
    say(
      `${run.label}: fits ${String(rep.fits)}, layer ${String(rep.rect.width)}x${String(rep.rect.height)} in ` +
        `${String(rep.win.w)}x${String(rep.win.h)}, digit runs outside allowed spans ${String((rep.digitRuns ?? []).length)}, ` +
        `git marks [${(rep.gitMarks ?? []).join(', ')}], names [${(rep.namesShown ?? []).join(', ')}], ` +
        `hostile ${JSON.stringify(rep.hostile ?? null)}, markdown ${JSON.stringify(rep.markdown ?? null)}`
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
say('PASS. Seven launches, seven pictures, seven readings, and the operator server untouched.');
