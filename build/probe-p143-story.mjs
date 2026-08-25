#!/usr/bin/env node
/**
 * probe-p143-story.mjs. The Phase 143 photograph probe, modelled on
 * build/probe-p137-overview.mjs and build/probe-p138-fold.mjs.
 *
 * ## What it proves, in ONE launch
 *
 * The story panel opens from the session's own row on the PROJECT view
 * (Phase 147) and draws the chain of sentences the fold wrote for that
 * session. The one session view is opened first for every state and must
 * offer no story control at all, read off the rendered tree, because Phase
 * 147 moved the surface to where the model written line lives. In a single
 * Electron it drives six states and reads every one of them:
 *
 *   three         a chain of three, one harness and one model throughout. It
 *                 draws three rows, names no model on any row, says nothing
 *                 about missing turns, and a pressed row draws exactly the
 *                 turns that version covered, read by turn index.
 *   two hundred   a chain of two hundred. It draws two hundred rows, scrolls
 *                 on its own, and still names no model.
 *   collapse      five versions where three in a row say the same thing. It
 *                 draws three rows, which is the collapse read as a row count
 *                 against a version count rather than by eye.
 *   switch        two kept versions written by different models with a refused
 *                 version between them. Every drawn row names its model, and
 *                 the newer row is the only one that says turns are missing.
 *   straddle      two kept versions that say exactly the same thing with a
 *                 refused version between them. They stay two rows, the newer
 *                 one says the turns before it are missing, and pressing it
 *                 draws only the turns its own version covers.
 *   none          the same session with no harness and no model chosen. One
 *                 line and no rows at all.
 *
 * It then drives the KEYBOARD on the chain of three, with real presses on the
 * element that holds the keyboard, so the panel's own listener and the row's
 * own listener both see them. A chorded arrow must move nothing, one bare
 * arrow must move the highlight and the keyboard together, and Return and the
 * space bar must open the row the person is standing on and no other.
 *
 * Every rendered string in every state is walked for a digit outside a
 * data-clock, a data-date, a data-age or a data-quoted span, and the list must
 * be empty.
 *
 * ## The one picture, and how to get the other two
 *
 * src/main/harness/shot.ts writes exactly one PNG per launch, being the window
 * as it stands at the end. So the launch ends on the state P143_PHOTO names and
 * photographs that. The default is `three`, which is the state a person reads
 * first. `P143_PHOTO=two-hundred` and `P143_PHOTO=none` photograph the other
 * two, and every reading above is taken whichever one is asked for.
 *
 * ## How the chains exist without a model running
 *
 * A scratch home holds one committed research 63 fixture and three generated
 * claude logs, each where the resolver expects it. GMUX_OVERVIEW_SEED inserts
 * five manifest rows into the ISOLATED profile. GMUX_FOLD_SEED writes the
 * sealed fold choice and fires no boundary, so nothing folds. GMUX_SUMMARY_SEED
 * writes the five chains through the shipped appendSummary path, so the version
 * numbers and the parents are the store's own. No model is asked anything and
 * the probe can be run again for nothing.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - The launch uses a scratch `--user-data-dir` under the harness directory
 *    and a scratch HOME. The operator's profile, his home and his settings
 *    file are never opened.
 *  - One Electron, started through build/electron-run.mjs, which ends the whole
 *    tree it started in a finally block whatever happened here (Phase 140).
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p143
 *
 * Exit 0 when the picture exists and every assertion held. 1 when they did
 * not. 2 when the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
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
const TAG = '[probe:p143story]';

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
      "node build/harness-socket.mjs gmux-p143-story 'node build/probe-p143-story.mjs'"
  );
}
if (socket === 'gmux' || socket === 'default') {
  refuse(`refusing to run on "${socket}", which is not a harness socket`);
}
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

const PHOTO = (process.env['P143_PHOTO'] ?? '').trim() || 'three';
if (!['three', 'two-hundred', 'none'].includes(PHOTO)) {
  refuse(`P143_PHOTO is "${PHOTO}". It is three, two-hundred or none.`);
}

const outDir = resolve(
  repoRoot,
  (process.env['P143_OUT_DIR'] ?? '').trim() || 'out/p143'
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
say(`the picture will be taken at: ${PHOTO}`);

// ---------------------------------------------------------------------------
// The scratch world: a home, a project, four sessions
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p143-story');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p143-project', 'scripts'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p143-project');
const home = join(root, 'home');
const profile = join(root, 'profile');

const IDS = {
  six: '11111111-2222-4333-8444-555555555555',
  seven: 'aaaa1111-2222-4333-8444-777777777777',
  eight: 'bbbb1111-2222-4333-8444-888888888888',
  nine: 'cccc1111-2222-4333-8444-999999999999',
  ten: 'dddd1111-2222-4333-8444-aaaaaaaaaaaa'
};

const claudeDir = join(home, '.claude', 'projects', project.replace(/\//g, '-'));
mkdirSync(claudeDir, { recursive: true });

// claude-6 reads the committed fixture, so at least one chain in this run sits
// over a conversation nobody in this phase wrote.
copyFileSync(join(FIXTURES, 'claude-session.jsonl'), join(claudeDir, `${IDS.six}.jsonl`));

/**
 * A claude log of `turns` exchanges, generated into the scratch home and never
 * committed anywhere. The shape is the one the reader parses, copied from
 * build/probe-p138-fold.mjs.
 */
function writeClaudeLog(sessionUuid, turns, tag) {
  const base = {
    isSidechain: false,
    userType: 'external',
    entrypoint: 'cli',
    cwd: project,
    sessionId: sessionUuid,
    version: '2.1.238',
    gitBranch: 'main'
  };
  const pad = (n) => String(n).padStart(4, '0');
  const lines = [];
  for (let i = 0; i < turns; i += 1) {
    const askAt = new Date(Date.UTC(2026, 7, 20, 6, 0, 0) + i * 60_000).toISOString();
    const ansAt = new Date(Date.UTC(2026, 7, 20, 6, 0, 30) + i * 60_000).toISOString();
    lines.push(
      JSON.stringify({
        parentUuid: null,
        ...base,
        type: 'user',
        message: {
          role: 'user',
          content: `walk the release drill for ${tag} and tell me what changed at pass ${pad(i)}`
        },
        uuid: `${tag}${pad(i)}-1111-4111-8111-111111111111`.slice(0, 36),
        timestamp: askAt,
        promptSource: 'typed',
        promptId: `p-${tag}-${pad(i)}`,
        origin: { kind: 'human' }
      })
    );
    lines.push(
      JSON.stringify({
        parentUuid: null,
        ...base,
        message: {
          model: 'claude-opus-5',
          id: `msg_${tag}${pad(i)}`,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `the drill ran clean for ${tag} at pass ${pad(i)} and nothing changed`
            }
          ]
        },
        requestId: `req_${tag}${pad(i)}`,
        type: 'assistant',
        uuid: `${tag}${pad(i)}-2222-4111-8111-111111111111`.slice(0, 36),
        timestamp: ansAt
      })
    );
  }
  writeFileSync(join(claudeDir, `${sessionUuid}.jsonl`), `${lines.join('\n')}\n`, 'utf8');
}

writeClaudeLog(IDS.seven, 4, 'seve');
writeClaudeLog(IDS.eight, 4, 'eigh');
writeClaudeLog(IDS.nine, 8, 'nine');
writeClaudeLog(IDS.ten, 9, 'tenn');

// The project. Two commits, so the conversation has a git verdict to draw.
writeFileSync(join(project, 'README.md'), '# Phase 143 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync(
    'git',
    [
      '-C',
      project,
      '-c',
      'user.name=p143',
      '-c',
      'user.email=p143@harness.invalid',
      ...args
    ],
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

const startedAt = Date.UTC(2026, 7, 20, 8, 0, 0);
const overviewSeedPath = join(root, 'overview-seed.json');
writeFileSync(
  overviewSeedPath,
  JSON.stringify([
    { name: 'claude-6', agent: 'claude', agentSessionId: IDS.six, cwd: project, createdAt: startedAt },
    { name: 'claude-7', agent: 'claude', agentSessionId: IDS.seven, cwd: project, createdAt: startedAt },
    { name: 'claude-8', agent: 'claude', agentSessionId: IDS.eight, cwd: project, createdAt: startedAt },
    { name: 'claude-9', agent: 'claude', agentSessionId: IDS.nine, cwd: project, createdAt: startedAt },
    { name: 'claude-10', agent: 'claude', agentSessionId: IDS.ten, cwd: project, createdAt: startedAt }
  ]),
  'utf8'
);

// ---------------------------------------------------------------------------
// The chains. Every sentence is plain, and none of them carries a digit,
// so a digit anywhere on the page is a defect rather than a fixture.
// ---------------------------------------------------------------------------

/** A digit free name for a position in a long run. */
function word(i) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let n = i;
  let out = '';
  do {
    out = letters[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

const CHOICE = { agentId: 'claude', model: 'claude-haiku-4-5-20251001' };
/** Two model ids from the claude recipe, both of them free of digits. */
const MODEL_ONE = 'haiku';
const MODEL_TWO = 'sonnet';

const CLOCK_BASE = Date.UTC(2026, 7, 21, 9, 0, 0);
const minute = 60_000;

const THREE = [
  { fromTurn: 0, toTurn: 0, text: 'You asked the agent to open the release drill and it read the script first.' },
  { fromTurn: 0, toTurn: 1, text: 'You asked the agent to walk the drill and it reported what the dry run touched.' },
  { fromTurn: 0, toTurn: 2, text: 'You asked the agent to sign the script and it wrote back what is left to do.' }
].map((v, i) => ({ ...v, writtenAt: CLOCK_BASE + i * minute }));

const TWO_HUNDRED = Array.from({ length: 200 }, (_, i) => ({
  fromTurn: 0,
  toTurn: Math.min(i, 3),
  text: `You asked the agent to run the drill again and it reported pass ${word(i)}.`,
  writtenAt: CLOCK_BASE + i * minute
}));

/** Three identical sentences in a row, which must collapse to one drawn row. */
const SAME = 'You asked the agent to hold the release and it changed nothing at all.';
const COLLAPSE = [
  { fromTurn: 0, toTurn: 0, text: 'You asked the agent to open the release and it read the script.' },
  { fromTurn: 0, toTurn: 1, text: SAME },
  { fromTurn: 0, toTurn: 2, text: SAME },
  { fromTurn: 0, toTurn: 3, text: SAME },
  { fromTurn: 0, toTurn: 3, text: 'You asked the agent to close the release and it wrote the last line.' }
].map((v, i) => ({ ...v, writtenAt: CLOCK_BASE + i * minute }));

/**
 * The switch and the hole. The refused version covers turns two to five and
 * carries no sentence, so the next kept version starts at six and the turns it
 * jumped are in no drawn row.
 */
const SWITCH = [
  {
    fromTurn: 0,
    toTurn: 1,
    text: 'You asked the agent to start the drill and it read the script first.',
    model: MODEL_ONE,
    writtenAt: CLOCK_BASE
  },
  {
    fromTurn: 2,
    toTurn: 5,
    verdict: 'refused',
    reason: 'the sentence named a path',
    model: MODEL_ONE,
    writtenAt: CLOCK_BASE + minute
  },
  {
    fromTurn: 6,
    toTurn: 7,
    text: 'You asked the agent to finish the drill and it wrote back what is signed.',
    model: MODEL_TWO,
    writtenAt: CLOCK_BASE + 2 * minute
  }
];

/**
 * A repeat that straddles a break. Two kept versions say exactly the same
 * thing with a refused version between them, and the refused one moved the
 * floor, so the turns it covered are in no sentence a person can read. The two
 * kept versions must stay two rows, and the newer one must say the turns
 * before it are missing, because joining them would widen one row over turns
 * no sentence covers and say nothing about it.
 */
const STRADDLE_SAME =
  'You asked the agent to hold the drill and it changed nothing at all.';
const STRADDLE = [
  { fromTurn: 0, toTurn: 2, text: STRADDLE_SAME, writtenAt: CLOCK_BASE },
  {
    fromTurn: 3,
    toTurn: 5,
    verdict: 'refused',
    reason: 'the sentence named a path',
    writtenAt: CLOCK_BASE + minute
  },
  {
    fromTurn: 6,
    toTurn: 8,
    text: STRADDLE_SAME,
    writtenAt: CLOCK_BASE + 2 * minute
  }
];

const summarySeedPath = join(root, 'summary-seed.json');
writeFileSync(
  summarySeedPath,
  JSON.stringify({
    harness: CHOICE.agentId,
    model: MODEL_ONE,
    chains: [
      { name: 'claude-6', versions: THREE },
      { name: 'claude-7', versions: TWO_HUNDRED },
      { name: 'claude-8', versions: COLLAPSE },
      { name: 'claude-9', versions: SWITCH },
      { name: 'claude-10', versions: STRADDLE }
    ]
  }),
  'utf8'
);

// The sealed choice, and no boundary, so nothing folds and nothing spawns.
const foldSeedPath = join(root, 'fold-seed.json');
writeFileSync(
  foldSeedPath,
  JSON.stringify({ ...CHOICE, projectPath: project }),
  'utf8'
);

/**
 * A stub binary for the fold. Nothing in this run fires a turn boundary, so it
 * is never reached. It exists so that a fold which somehow did start could not
 * reach a real agent on this machine.
 */
const stubPath = join(root, 'fold-stub.sh');
writeFileSync(
  stubPath,
  ['#!/bin/sh', '# Harness only. Reads nothing, prints nothing, and exits.', 'exit 1', ''].join('\n'),
  'utf8'
);
chmodSync(stubPath, 0o755);

// ---------------------------------------------------------------------------
// The one driven window, and everything it reads
// ---------------------------------------------------------------------------

/**
 * The selectors the panel is looked up by. The names follow the shipped
 * classes, and each one falls back to a data attribute and then to the only
 * button a project row carries, so a rename that keeps the shape still
 * reads. The open selector is only ever asked INSIDE the named row.
 */
const SEL = {
  open: '.overview-story-toggle, [data-story-open], button',
  panel: '.overview-story, [data-story]',
  row: '.overview-story-row, [data-story-row]',
  model: '.overview-story-model, [data-story-model]'
};

/**
 * One exported sentence, read out of the shipped copy rather than repeated
 * here. The coverage line and the two empty lines carry no class of their own,
 * so the only honest way to find them on a row is to look for the words a
 * person actually reads.
 */
function copyString(name) {
  const src = readFileSync(
    join(repoRoot, 'src', 'renderer', 'overview', 'copy.ts'),
    'utf8'
  );
  const head = `export const ${name} =`;
  const at = src.indexOf(head);
  if (at === -1) refuse(`src/renderer/overview/copy.ts exports no ${name}`);
  const end = src.indexOf(';', at);
  const parts = src.slice(at + head.length, end).match(/'[^']*'/g) ?? [];
  if (parts.length === 0) refuse(`${name} in copy.ts is not a plain string`);
  return parts.map((part) => part.slice(1, -1)).join('');
}

const STORY_GAP = copyString('STORY_GAP');
const STORY_NO_MODEL = copyString('STORY_NO_MODEL');
const STORY_WORD = copyString('STORY_WORD');

function readerJs(spec) {
  return `(async () => {
  const SPEC = ${JSON.stringify(spec)};
  const SEL = ${JSON.stringify(SEL)};
  const GAP = ${JSON.stringify(STORY_GAP)};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(1))));
  const layer = () => document.querySelector('.overview-layer');
  const flat = (el) => ((el && el.innerText) || '').replace(/\\s+/g, ' ').trim();

  /** Every digit run outside a clock, a date, an elapsed time or quoted text. */
  function digitRuns(root) {
    const loose = [];
    const quoted = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent || '';
      if (!/[0-9]/.test(text)) continue;
      const el = node.parentElement;
      const runs = text.match(/[0-9]+/g) || [];
      if (el !== null && el.closest('[data-clock],[data-date],[data-age]') !== null) continue;
      if (el !== null && el.closest('[data-quoted]') !== null) {
        for (const m of runs) quoted.push(m);
        continue;
      }
      for (const m of runs) loose.push(m);
    }
    return { loose, quoted };
  }

  async function closePage() {
    for (let i = 0; i < 8 && layer() !== null; i += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await frame();
      await wait(150);
    }
    return layer() === null;
  }

  async function openLevel(level, name) {
    await closePage();
    await window.__gmuxShotDrive({
      projectPath: SPEC.projectPath,
      overview: { level, sessionNames: [name] }
    });
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const l = layer();
      if (l !== null && flat(l) !== '') break;
      await wait(200);
    }
    await wait(500);
    return layer() !== null;
  }

  const openSession = (name) => openLevel('session', name);
  const openProject = (name) => openLevel('project', name);

  function pressTarget(el) {
    if (el === null) return null;
    if (el.tagName === 'BUTTON') return el;
    return el.querySelector('button') || el;
  }

  /**
   * Phase 147. The control lives on the session's own PROJECT row, so the
   * row is found by the name on it and the press lands on that row's own
   * button, never on another session's.
   */
  async function openStory(name) {
    const l = layer();
    if (l === null) return { opened: false, why: 'the page is not open' };
    const btn = l.querySelector(
      SEL.open.split(',')[0].trim() + '[data-session-name="' + name + '"]'
    );
    if (btn === null) {
      return { opened: false, why: 'no story control on the row named ' + name };
    }
    const label = (btn.textContent || '').trim();
    pressTarget(btn).click();
    await frame();
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && layer().querySelector(SEL.panel) === null) {
      await wait(150);
    }
    await wait(500);
    return { opened: layer().querySelector(SEL.panel) !== null, why: null, label };
  }

  /**
   * Phase 147 refinement. Every project row's story control, read by
   * bounding box against its own row, while no panel is open. One shared x
   * position on every row and the one word on it are what the charter
   * requires, so the numbers are read here and judged outside.
   */
  function readToggles() {
    const l = layer();
    if (l === null) return null;
    return Array.from(l.querySelectorAll('.overview-line')).map((row) => {
      const btn = row.querySelector(SEL.open.split(',')[0].trim());
      const rr = row.getBoundingClientRect();
      if (btn === null) return { present: false, rowRight: Math.round(rr.right) };
      const br = btn.getBoundingClientRect();
      return {
        present: true,
        label: (btn.textContent || '').trim(),
        left: Math.round(br.left),
        right: Math.round(br.right),
        rowRight: Math.round(rr.right)
      };
    });
  }

  function readRows() {
    const panel = layer().querySelector(SEL.panel);
    if (panel === null) return null;
    const rows = Array.from(panel.querySelectorAll(SEL.row)).map((r) => ({
      text: flat(r),
      model: r.querySelector(SEL.model) !== null,
      modelText: ((r.querySelector(SEL.model) || {}).textContent || '').trim(),
      // The coverage line carries no class of its own, so it is found by the
      // sentence a person reads.
      gap: flat(r).includes(GAP),
      clock: ((r.querySelector('[data-clock]') || {}).textContent || '').trim(),
      turns: r.querySelectorAll('.overview-turn').length
    }));
    return {
      panelText: flat(panel),
      rows,
      scrolls: panel.scrollHeight > panel.clientHeight + 1,
      listScrolls: Array.from(panel.querySelectorAll('*')).some(
        (el) => el.scrollHeight > el.clientHeight + 1
      )
    };
  }

  function frameRead() {
    const l = layer();
    const r = l.getBoundingClientRect();
    const rect = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
    const win = { w: window.innerWidth, h: window.innerHeight };
    const scroller = document.scrollingElement;
    return {
      rect,
      win,
      fits: rect.width <= win.w && rect.top + rect.height <= win.h + 1 && scroller.scrollWidth <= win.w,
      digits: digitRuns(l)
    };
  }

  /** Press one row and read the turn indexes it drew, by data-turn. */
  async function pressRow(index) {
    const panel = layer().querySelector(SEL.panel);
    const rows = panel.querySelectorAll(SEL.row);
    if (rows[index] === undefined) return { pressed: false };
    pressTarget(rows[index]).click();
    await frame();
    await wait(600);
    const after = layer().querySelector(SEL.panel);
    const rowsAfter = Array.from(after.querySelectorAll(SEL.row));
    return {
      pressed: true,
      index,
      turns: Array.from(rowsAfter[index].querySelectorAll('.overview-turn')).map(
        (el) => Number(el.getAttribute('data-turn'))
      ),
      perRow: rowsAfter.map((r) => r.querySelectorAll('.overview-turn').length)
    };
  }

  /**
   * The keyboard, driven for real on the chain of three.
   *
   * A row holds the keyboard itself and answers Return itself, and the panel
   * walks the rows with the arrows. Those are two marks of where a person is,
   * and this reads whether they stay one row. Every press is a real event on
   * the element that holds the keyboard, so the panel's own capture listener
   * and the row's own listener both see it, exactly as they do for a person.
   */
  async function keyDrive(name) {
    const ok = await openProject(name);
    if (!ok) return { error: 'the page did not open for ' + name };
    const open = await openStory(name);
    if (!open.opened) return { error: 'the story did not open: ' + String(open.why) };
    const rows = () => Array.from(layer().querySelectorAll(SEL.row));
    const at = (el) => rows().findIndex((r) => r === el);
    const cursorRow = () => rows().findIndex((r) => r.className.includes('cursor'));
    const openRow = () => rows().findIndex((r) => r.getAttribute('aria-expanded') === 'true');
    const press = async (key, extra) => {
      const target = document.activeElement || rows()[0];
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...(extra || {}) })
      );
      await frame();
      await wait(400);
    };
    const list = rows();
    if (list.length < 3) return { error: 'wanted three rows to walk, drew ' + String(list.length) };
    const roles = list.map((r) => r.getAttribute('role'));
    const tabs = list.map((r) => r.getAttribute('tabindex'));
    list[0].focus();
    await frame();
    const focusLanded = at(document.activeElement) === 0;
    const cursorAtStart = cursorRow();

    // A chord belongs to the window ladder, so the panel must leave it alone.
    await press('ArrowDown', { metaKey: true, altKey: true });
    const cursorAfterChord = cursorRow();

    // One bare step down. Both marks must move together.
    await press('ArrowDown');
    const cursorAfterArrow = cursorRow();
    const focusAfterArrow = at(document.activeElement);

    // Return, answered by the row the keyboard is on.
    await press('Enter');
    const openedAfterEnter = openRow();
    const cursorAfterEnter = cursorRow();
    const turnsAfterEnter = rows().map((r) => r.querySelectorAll('.overview-turn').length);

    // Tab onto the third row, which the pointer never touched. The highlight
    // follows the keyboard through the row's own focus event, and that event
    // only arrives while the window itself holds the keyboard, which is why
    // the reading below carries that answer alongside it.
    rows()[2].focus();
    await frame();
    await wait(400);
    const docFocused = document.hasFocus();
    const cursorAfterTab = cursorRow();
    const focusAfterTab = at(document.activeElement);

    // One step up from there. The walk starts from the row the keyboard is on
    // whatever the highlight did, so both marks must land on the middle row.
    await press('ArrowUp');
    const cursorAfterWalk = cursorRow();
    const focusAfterWalk = at(document.activeElement);

    // The space bar, on a row the pointer never touched. It closes the row
    // that is open and opens this one, so one row holds turns at any time.
    rows()[2].focus();
    await frame();
    await wait(200);
    await press(' ');
    const openedAfterSpace = openRow();
    const holdingTurns = rows().filter((r) => r.querySelectorAll('.overview-turn').length > 0).length;

    return {
      roles,
      tabs,
      focusLanded,
      cursorAtStart,
      cursorAfterChord,
      cursorAfterArrow,
      focusAfterArrow,
      openedAfterEnter,
      cursorAfterEnter,
      turnsAfterEnter,
      docFocused,
      cursorAfterTab,
      focusAfterTab,
      cursorAfterWalk,
      focusAfterWalk,
      openedAfterSpace,
      holdingTurns
    };
  }

  async function readState(name, opts) {
    // The one session view first, for two readings the project level cannot
    // give. The turns the verbatim record draws, which the pressed rows are
    // checked against, and the Phase 147 proof that this view no longer
    // offers the story control at all, read off the rendered tree rather
    // than by eye.
    const okSession = await openSession(name);
    if (!okSession) return { error: 'the session view did not open for ' + name };
    const conversation = Array.from(layer().querySelectorAll('.overview-turn')).map(
      (el) => Number(el.getAttribute('data-turn'))
    );
    const sessionOffersControl =
      layer().querySelector('.overview-story-toggle') !== null;
    // Then the project view, where the control lives now.
    const ok = await openProject(name);
    if (!ok) return { error: 'the page did not open for ' + name, conversation };
    const toggles = readToggles();
    const open = await openStory(name);
    if (!open.opened) return { error: 'the story did not open: ' + String(open.why), conversation };
    const body = readRows();
    const out = {
      conversation,
      sessionOffersControl,
      toggles,
      openLabel: open.label,
      ...body,
      ...frameRead()
    };
    if (opts && Array.isArray(opts.press)) {
      out.presses = [];
      for (const i of opts.press) out.presses.push(await pressRow(i));
    }
    return out;
  }

  const out = { states: {}, photo: SPEC.photo };
  try {
    out.states.three = await readState('claude-6', { press: SPEC.pressRows });
    out.keys = await keyDrive('claude-6');
    out.states.twoHundred = await readState('claude-7', null);
    out.states.collapse = await readState('claude-8', null);
    out.states.switched = await readState('claude-9', null);
    out.states.straddle = await readState('claude-10', { press: [0] });

    // No harness and no model chosen. The choice is a settings value rather
    // than a per session one, so it is flipped here and the page reopened.
    await closePage();
    await window.gmux.settingsSet({ fold: { agentId: null, model: null } });
    await wait(400);
    out.states.none = await readState('claude-6', null);

    // Back on, so the launch can end on whichever state is photographed.
    await window.gmux.settingsSet({ fold: SPEC.choice });
    await wait(400);
    const last = SPEC.photo === 'two-hundred' ? 'claude-7' : 'claude-6';
    if (SPEC.photo === 'none') {
      await closePage();
      await window.gmux.settingsSet({ fold: { agentId: null, model: null } });
      await wait(400);
    }
    out.photographed = await readState(last, null);
    return out;
  } catch (err) {
    out.error = String((err && err.stack) || err);
    return out;
  }
})()`;
}

// ---------------------------------------------------------------------------
// The run. One launch, one picture, one reading.
// ---------------------------------------------------------------------------

const failures = [];

/** The minute a seeded version was written, as the clock draws it. */
function minuteOf(version) {
  return `:${String(new Date(version.writtenAt).getMinutes()).padStart(2, '0')}`;
}

async function main() {
  const png = join(outDir, `p143-${PHOTO}.png`);
  rmSync(png, { force: true });
  const drive = {
    projectPath: project,
    overview: { level: 'project', sessionNames: ['claude-6'] }
  };
  say('launching once');
  // build/electron-run.mjs owns the launch and ends the whole tree it started
  // in a finally block whatever happened here (Phase 140).
  const { code, text } = await runElectron({
    label: 'p143 story',
    userDataDir: profile,
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: home,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      GMUX_OVERVIEW_SEED: overviewSeedPath,
      GMUX_FOLD_SEED: foldSeedPath,
      GMUX_FOLD_BIN: stubPath,
      GMUX_SUMMARY_SEED: summarySeedPath,
      GMUX_SHOT_DRIVE: JSON.stringify(drive),
      GMUX_SHOT_JS: readerJs({
        projectPath: project,
        photo: PHOTO,
        choice: CHOICE,
        pressRows: [2, 0]
      })
    },
    ceilingMs: 420_000,
    settleMs: 500
  });

  const readOne = (marker) => {
    const at = text.lastIndexOf(marker);
    if (at === -1) return null;
    try {
      return JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
    } catch {
      return null;
    }
  };
  const seed = readOne('[gmux-summary-seed] ');
  const report = readOne('[gmux-shot] probe ');

  if (!existsSync(png)) failures.push('no picture was written');
  if (seed === null) {
    failures.push('the story seed printed nothing, so no chain was written');
  } else {
    const byName = Object.fromEntries((seed.outcomes ?? []).map((o) => [o.name, o]));
    const wanted = {
      'claude-6': THREE.length,
      'claude-7': TWO_HUNDRED.length,
      'claude-8': COLLAPSE.length,
      'claude-9': SWITCH.length
    };
    for (const [name, count] of Object.entries(wanted)) {
      const got = byName[name];
      if (got === undefined) {
        failures.push(`the seed wrote no chain for ${name}`);
      } else if (got.written !== count) {
        failures.push(
          `${name}: the seed wrote ${String(got.written)} versions, wanted ${String(count)}`
        );
      } else if (got.lastVersion !== count) {
        failures.push(
          `${name}: the store's newest version is ${String(got.lastVersion)}, and ` +
            `${String(count)} versions were appended, so the store did not number them itself`
        );
      }
    }
  }
  if (report === null) {
    failures.push(
      `the driven window printed no reading (electron exited ${String(code)})`
    );
    return;
  }
  if (report.error !== undefined) {
    failures.push(`the driver reported ${String(report.error)}`);
  }
  writeFileSync(join(outDir, `p143-${PHOTO}.json`), JSON.stringify(report, null, 2), 'utf8');

  const states = report.states ?? {};

  /** Every state fits its window and carries no loose digit. */
  for (const [label, state] of Object.entries(states)) {
    if (state === null || state.error !== undefined) {
      failures.push(`${label}: ${String(state?.error ?? 'no reading')}`);
      continue;
    }
    // Phase 147. The story left the one session view. Every state opens that
    // view first and reads the rendered tree, so an offered control there is
    // a regression rather than a suspicion.
    if (state.sessionOffersControl === true) {
      failures.push(
        `${label}: the one session view still offers the story control, and ` +
          `Phase 147 moved it to the project rows`
      );
    }
    if (state.fits !== true) {
      failures.push(
        `${label}: the page does not fit the window. Layer ` +
          `${JSON.stringify(state.rect)} in ${JSON.stringify(state.win)}.`
      );
    }
    const loose = state.digits?.loose ?? [];
    if (loose.length !== 0) {
      failures.push(
        `${label}: ${String(loose.length)} digit runs sit outside a clock, a date, ` +
          `an elapsed time or quoted text: ${loose.slice(0, 10).join(', ')}`
      );
    }
    // Phase 147 refinement, judged by bounding box rather than by eye. The
    // control is the one word on every row, and it holds one shared x
    // position at the far right of every row whatever the line's length.
    const toggles = state.toggles ?? [];
    if (toggles.length < 2) {
      failures.push(
        `${label}: the project view drew ${String(toggles.length)} rows, and the ` +
          `shared column claim needs at least two`
      );
    } else if (toggles.some((t) => t.present !== true)) {
      failures.push(`${label}: a project row carries no story control at all`);
    } else {
      const words = [...new Set(toggles.map((t) => t.label))];
      if (words.length !== 1 || words[0] !== STORY_WORD) {
        failures.push(
          `${label}: the control must read "${STORY_WORD}" on every row, and the ` +
            `labels read ${JSON.stringify(words)}`
        );
      }
      const lefts = [...new Set(toggles.map((t) => t.left))];
      const rights = [...new Set(toggles.map((t) => t.right))];
      if (lefts.length !== 1 || rights.length !== 1) {
        failures.push(
          `${label}: the control must hold one shared x position on every row. ` +
            `Left edges ${JSON.stringify(lefts)}, right edges ${JSON.stringify(rights)}`
        );
      }
      const gaps = toggles.map((t) => t.rowRight - t.right);
      if (gaps.some((g) => g < 0 || g > 40)) {
        failures.push(
          `${label}: the control must sit at the far right of its row, and the ` +
            `gaps to the row edge read ${JSON.stringify(gaps)}`
        );
      }
    }
  }

  // 1. The chain of three. Three rows, newest first, no model named anywhere,
  //    nothing said about missing turns, and the pressed rows draw the turns
  //    those versions covered.
  const three = states.three;
  if (three !== undefined && three.error === undefined) {
    if ((three.rows ?? []).length !== THREE.length) {
      failures.push(
        `three: the story draws ${String((three.rows ?? []).length)} rows for ` +
          `${String(THREE.length)} versions`
      );
    } else {
      const newest = THREE[THREE.length - 1].text;
      const oldest = THREE[0].text;
      if (!three.rows[0].text.includes(newest)) {
        failures.push(`three: the first row is not the newest version: ${three.rows[0].text}`);
      }
      if (!three.rows[three.rows.length - 1].text.includes(oldest)) {
        failures.push('three: the last row is not the oldest version');
      }
    }
    // Newest first, read off the clock rather than off the order alone. The
    // minute is the same minute in any time zone, which is why it is the part
    // that is compared.
    if ((three.rows ?? []).length === THREE.length) {
      const wanted = [minuteOf(THREE[2]), minuteOf(THREE[1]), minuteOf(THREE[0])];
      const got = three.rows.map((r) => r.clock);
      if (!wanted.every((m, i) => got[i].endsWith(m))) {
        failures.push(
          `three: the rows must run newest first. Their clocks are ` +
            `${JSON.stringify(got)} and the minutes wanted are ${JSON.stringify(wanted)}`
        );
      }
    }
    if ((three.rows ?? []).some((r) => r.model)) {
      failures.push('three: one harness and one model wrote every row, so no row may name a model');
    }
    if ((three.rows ?? []).some((r) => r.gap)) {
      failures.push('three: the chain covers every turn from the first, so no row may say turns are missing');
    }
    const seen = new Set(three.conversation ?? []);
    const expected = (from, to) =>
      (three.conversation ?? []).filter((i) => i >= from && i <= to);
    const presses = three.presses ?? [];
    if (presses.length !== 2) {
      failures.push(`three: ${String(presses.length)} rows were pressed, wanted 2`);
    } else {
      // Row 2 is the oldest drawn row, which is the first version.
      const wantOld = expected(THREE[0].fromTurn, THREE[0].toTurn);
      const gotOld = presses[0].turns ?? [];
      if (JSON.stringify(gotOld) !== JSON.stringify(wantOld)) {
        failures.push(
          `three: pressing the oldest row drew turns ${JSON.stringify(gotOld)}, wanted ` +
            `${JSON.stringify(wantOld)} for the range it covers`
        );
      }
      // Row 0 is the newest drawn row, which is the third version.
      const wantNew = expected(THREE[2].fromTurn, THREE[2].toTurn);
      const gotNew = presses[1].turns ?? [];
      if (JSON.stringify(gotNew) !== JSON.stringify(wantNew)) {
        failures.push(
          `three: pressing the newest row drew turns ${JSON.stringify(gotNew)}, wanted ` +
            `${JSON.stringify(wantNew)} for the range it covers`
        );
      }
      const expanded = (presses[1].perRow ?? []).filter((n) => n > 0).length;
      if (expanded !== 1) {
        failures.push(
          `three: ${String(expanded)} rows hold turns at once, and one row opens at a time`
        );
      }
      if (seen.size === 0) {
        failures.push('three: the conversation drew no turns, so a pressed row proves nothing');
      }
    }
  }

  // 1b. The keyboard, on the same chain of three. The highlight and the focus
  //     are two marks of where a person is, and they must never sit on two
  //     different rows, because Return is answered by the row that holds the
  //     keyboard while the arrows move the highlight.
  const keys = report.keys;
  if (keys === undefined || keys === null) {
    failures.push('keyboard: the drive printed nothing');
  } else if (keys.error !== undefined) {
    failures.push(`keyboard: ${String(keys.error)}`);
  } else {
    if ((keys.roles ?? []).some((role) => role !== 'button')) {
      failures.push(
        `keyboard: every row must say it is a press target, and the roles read ${JSON.stringify(keys.roles)}`
      );
    }
    if ((keys.tabs ?? []).some((tab) => tab !== '0')) {
      failures.push(
        `keyboard: every row must be reachable by Tab, and the tab stops read ${JSON.stringify(keys.tabs)}`
      );
    }
    if (keys.focusLanded !== true) {
      failures.push('keyboard: the keyboard cannot land on a row at all');
    }
    if (keys.cursorAfterChord !== keys.cursorAtStart) {
      failures.push(
        `keyboard: a chorded arrow belongs to the window ladder, and it moved the ` +
          `highlight from row ${String(keys.cursorAtStart)} to row ${String(keys.cursorAfterChord)}`
      );
    }
    if (keys.cursorAfterArrow !== 1 || keys.focusAfterArrow !== 1) {
      failures.push(
        `keyboard: one step down must move the highlight and the keyboard together. ` +
          `The highlight is on row ${String(keys.cursorAfterArrow)} and the keyboard is on ` +
          `row ${String(keys.focusAfterArrow)}`
      );
    }
    if (keys.openedAfterEnter !== 1 || keys.cursorAfterEnter !== 1) {
      failures.push(
        `keyboard: Return must open the row the person is standing on. It opened row ` +
          `${String(keys.openedAfterEnter)} and left the highlight on row ${String(keys.cursorAfterEnter)}`
      );
    }
    const held = keys.turnsAfterEnter ?? [];
    if ((held[1] ?? 0) === 0) {
      failures.push('keyboard: Return opened a row and no turns were drawn under it');
    }
    if (held.filter((n) => n > 0).length !== 1) {
      failures.push(
        `keyboard: one row holds turns at a time, and the counts read ${JSON.stringify(held)}`
      );
    }
    if (keys.focusAfterTab !== 2) {
      failures.push(
        `keyboard: the keyboard was put on the third row and it is on row ` +
          `${String(keys.focusAfterTab)}`
      );
    }
    // The row's own focus event is what moves the highlight, and Chromium
    // holds that event back while the window does not have the keyboard, so
    // this reading is only an answer when the window does.
    if (keys.docFocused === true && keys.cursorAfterTab !== 2) {
      failures.push(
        `keyboard: stepping onto a row with Tab must move the highlight to it, and the ` +
          `highlight is on row ${String(keys.cursorAfterTab)}`
      );
    }
    if (keys.cursorAfterWalk !== 1 || keys.focusAfterWalk !== 1) {
      failures.push(
        `keyboard: the walk must start from the row the keyboard is on. One step up ` +
          `from the third row left the highlight on row ${String(keys.cursorAfterWalk)} and ` +
          `the keyboard on row ${String(keys.focusAfterWalk)}`
      );
    }
    if (keys.openedAfterSpace !== 2) {
      failures.push(
        `keyboard: the space bar must open the row the keyboard is on, and it opened row ` +
          `${String(keys.openedAfterSpace)}`
      );
    }
    if (keys.holdingTurns !== 1) {
      failures.push(
        `keyboard: ${String(keys.holdingTurns)} rows hold turns after the space bar, wanted 1`
      );
    }
  }

  // 2. The chain of two hundred. Every version is its own row and the list
  //    scrolls rather than running off the window.
  const many = states.twoHundred;
  if (many !== undefined && many.error === undefined) {
    if ((many.rows ?? []).length !== TWO_HUNDRED.length) {
      failures.push(
        `two hundred: the story draws ${String((many.rows ?? []).length)} rows for ` +
          `${String(TWO_HUNDRED.length)} versions`
      );
    }
    if (many.scrolls !== true && many.listScrolls !== true) {
      failures.push('two hundred: nothing on the panel scrolls, so two hundred rows cannot be reached');
    }
    if ((many.rows ?? []).some((r) => r.model)) {
      failures.push('two hundred: one model wrote every row, so no row may name a model');
    }
  }

  // 3. The collapse, read as a row count against a version count.
  const collapse = states.collapse;
  if (collapse !== undefined && collapse.error === undefined) {
    const drawn = (collapse.rows ?? []).length;
    if (drawn !== 3) {
      failures.push(
        `collapse: five versions with three identical sentences in a row drew ` +
          `${String(drawn)} rows, wanted 3`
      );
    }
    const saying = (collapse.rows ?? []).filter((r) => r.text.includes(SAME)).length;
    if (saying !== 1) {
      failures.push(
        `collapse: ${String(saying)} rows carry the repeated sentence, wanted 1`
      );
    }
    // The collapsed row keeps the LAST of the identical versions, so it wears
    // the time the newest of them was written and not the oldest.
    const repeated = (collapse.rows ?? []).find((r) => r.text.includes(SAME));
    if (repeated !== undefined) {
      const wanted = minuteOf(COLLAPSE[3]);
      const refused = minuteOf(COLLAPSE[1]);
      if (!repeated.clock.endsWith(wanted)) {
        failures.push(
          `collapse: the collapsed row reads ${repeated.clock}, and it must carry the ` +
            `time of the last identical version, whose minute is ${wanted} rather ` +
            `than ${refused}`
        );
      }
    }
  }

  // 4. The switch of model and the hole the refused version left.
  const switched = states.switched;
  if (switched !== undefined && switched.error === undefined) {
    const rows = switched.rows ?? [];
    if (rows.length !== 2) {
      failures.push(
        `switch: two kept versions and one refused one drew ${String(rows.length)} rows, wanted 2`
      );
    }
    if (rows.some((r) => r.text.includes('the sentence named a path'))) {
      failures.push('switch: a refused version has no sentence to read and must not be drawn');
    }
    if (!rows.every((r) => r.model)) {
      failures.push(
        `switch: the models differ, so every row names its own. Rows naming one: ` +
          `${String(rows.filter((r) => r.model).length)} of ${String(rows.length)}`
      );
    }
    const names = rows.map((r) => r.modelText).join(' ');
    if (!names.includes(MODEL_ONE) || !names.includes(MODEL_TWO)) {
      failures.push(
        `switch: the two rows name ${JSON.stringify(rows.map((r) => r.modelText))}, and ` +
          `both ${MODEL_ONE} and ${MODEL_TWO} must be on the page`
      );
    }
    const gaps = rows.map((r) => r.gap);
    if (JSON.stringify(gaps) !== JSON.stringify([true, false])) {
      failures.push(
        `switch: the row that says turns are missing must be the newer one alone. ` +
          `Rows carrying it, newest first: ${JSON.stringify(gaps)}`
      );
    }
  }

  // 5. A repeat that straddles a break. This is the shape the story used to
  //    swallow: the two kept versions say the same thing, so the newer one
  //    joined the older one and the widened row claimed the refused version's
  //    turns while saying nothing about them.
  const straddle = states.straddle;
  if (straddle !== undefined && straddle.error === undefined) {
    const rows = straddle.rows ?? [];
    if (rows.length !== 2) {
      failures.push(
        `straddle: two kept versions either side of a refused one drew ` +
          `${String(rows.length)} rows, wanted 2, because joining them would ` +
          `widen one row over turns no sentence covers`
      );
    }
    const gaps = rows.map((r) => r.gap);
    if (JSON.stringify(gaps) !== JSON.stringify([true, false])) {
      failures.push(
        `straddle: the newer row alone must say turns before it are missing. ` +
          `Rows carrying it, newest first: ${JSON.stringify(gaps)}`
      );
    }
    const drew = (straddle.presses ?? [])[0]?.turns ?? [];
    const want = (straddle.conversation ?? []).filter(
      (i) => i >= STRADDLE[2].fromTurn && i <= STRADDLE[2].toTurn
    );
    if (JSON.stringify(drew) !== JSON.stringify(want)) {
      failures.push(
        `straddle: pressing the newest row drew turns ${JSON.stringify(drew)}, ` +
          `wanted ${JSON.stringify(want)}, being only the turns its own version covers`
      );
    }
    const refused = [STRADDLE[1].fromTurn, STRADDLE[1].toTurn];
    if (drew.some((i) => i >= refused[0] && i <= refused[1])) {
      failures.push(
        `straddle: the pressed row drew turns ${JSON.stringify(drew)}, and the ` +
          `refused version's turns are in no sentence a person can read`
      );
    }
  } else if (straddle !== undefined) {
    failures.push(`straddle: ${String(straddle.error)}`);
  }

  // 6. No harness and no model chosen. One line and no rows.
  const none = states.none;
  if (none !== undefined && none.error === undefined) {
    if ((none.rows ?? []).length !== 0) {
      failures.push(
        `none: with no model chosen the panel draws no list, and it drew ` +
          `${String((none.rows ?? []).length)} rows`
      );
    }
    if (!(none.panelText ?? '').includes(STORY_NO_MODEL)) {
      failures.push(
        'none: the panel must say that no model is writing these sentences. It says: ' +
          String(none.panelText ?? '').slice(0, 200)
      );
    }
  } else if (none !== undefined) {
    failures.push(`none: ${String(none.error)}`);
  }

  say(
    `three ${String((states.three?.rows ?? []).length)} rows, two hundred ` +
      `${String((states.twoHundred?.rows ?? []).length)} rows, collapse ` +
      `${String((states.collapse?.rows ?? []).length)} rows, switch ` +
      `${String((states.switched?.rows ?? []).length)} rows, straddle ` +
      `${String((states.straddle?.rows ?? []).length)} rows, none ` +
      `${String((states.none?.rows ?? []).length)} rows`
  );
  say(`the reading is in ${join(outDir, `p143-${PHOTO}.json`)}`);
  say(`the picture is ${existsSync(png) ? png : 'MISSING'}`);
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
say('PASS. One launch, six states read, one picture, and the operator server untouched.');
