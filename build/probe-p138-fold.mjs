#!/usr/bin/env node
/**
 * probe-p138-fold.mjs. The Phase 138 photograph probe, modelled on
 * build/probe-p137-overview.mjs.
 *
 * ## What it proves
 *
 * The entry's first run rather than read proof is the project view
 * photographed with the fold on and with it off. This probe drives the real
 * app five times on ONE profile, so every launch after the first sees the row
 * the first one wrote.
 *
 *   on     the fold is chosen and one real fold runs end to end. The project
 *          view draws the sentence the model wrote.
 *   views  the same profile, the same choice, no new fold. The one session
 *          view and the multiplexed view draw the conversation and NOT the
 *          sentence.
 *   off    the same profile, the choice set back to None. The row is still in
 *          the store and the project view draws Phase 137's built line again.
 *   stale  the choice back on, and one more turn appended to the agent's log
 *          after the row was written. The sentence is behind the newest turn,
 *          so the built line is drawn instead.
 *
 * ## It spends nothing
 *
 * GMUX_FOLD_BIN points src/main/overview/fold/spawn.ts at a small script that
 * prints one stream-json result line. Everything else is the shipped path: the
 * sealed choice, the settle timer, the store read, the composer, the argv from
 * the recipe, the ten refusals and the one append. No model is asked anything
 * and the probe can be run again for nothing.
 *
 * ## How the sessions exist without an agent running
 *
 * The same way Phase 137's probe does it. A scratch home holds two committed
 * research 63 fixtures where each provider's resolver expects them, and
 * GMUX_OVERVIEW_SEED inserts the manifest rows into the ISOLATED profile.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory and a scratch HOME. The operator's profile and home are never
 *    opened, and neither is his settings file.
 *  - At most one Electron runs at a time. Each launch is awaited to exit and
 *    the tree it started is killed in a finally block whatever happened.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   npm run probe:p138
 *
 * Exit 0 when five pictures and five readings exist and every assertion held.
 * 1 when they did not. 2 when the probe refuses to run at all.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p138fold]';

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
      "node build/harness-socket.mjs gmux-p138-fold 'node build/probe-p138-fold.mjs'"
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
  (process.env['P138_OUT_DIR'] ?? '').trim() || 'out/p138'
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
// The scratch world: a home, a project, a seed, a stub
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p138-fold');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p138-project', 'scripts'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p138-project');
const home = join(root, 'home');
const profile = join(root, 'profile');

const IDS = {
  claude: '11111111-2222-4333-8444-555555555555',
  codex: '0000aaaa-1111-7000-8000-222233334444'
};

const claudeLog = join(
  home,
  '.claude',
  'projects',
  project.replace(/\//g, '-'),
  `${IDS.claude}.jsonl`
);
mkdirSync(dirname(claudeLog), { recursive: true });
copyFileSync(join(FIXTURES, 'claude-session.jsonl'), claudeLog);

const codexDst = join(
  home,
  '.codex',
  'sessions',
  '2026',
  '08',
  '19',
  `rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`
);
mkdirSync(dirname(codexDst), { recursive: true });
copyFileSync(
  join(FIXTURES, `codex-rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`),
  codexDst
);

/** One more exchange on the claude COPY. The committed fixture is never touched. */
function appendClaudeTurn(nth, askText, answerText, atIso) {
  const base = {
    isSidechain: false,
    userType: 'external',
    entrypoint: 'cli',
    cwd: project,
    sessionId: IDS.claude,
    version: '2.1.238',
    gitBranch: 'main'
  };
  const pad = String(nth).padStart(4, '0');
  const lines = [
    JSON.stringify({
      parentUuid: null,
      ...base,
      type: 'user',
      message: { role: 'user', content: askText },
      uuid: `dddd${pad}-1111-4111-8111-111111111111`,
      timestamp: atIso,
      promptSource: 'typed',
      promptId: `p-8-${pad}`,
      origin: { kind: 'human' }
    }),
    JSON.stringify({
      parentUuid: null,
      ...base,
      message: {
        model: 'claude-opus-5',
        id: `msg_d${pad}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: answerText }]
      },
      requestId: `req_d${pad}`,
      type: 'assistant',
      uuid: `eeee${pad}-1111-4111-8111-111111111111`,
      timestamp: atIso
    })
  ];
  appendFileSync(claudeLog, `${lines.join('\n')}\n`, 'utf8');
}

appendClaudeTurn(
  1,
  'please walk the release steps and say what the dry run changed',
  'The dry run printed the steps in order and changed nothing on disk.',
  '2026-08-20T10:07:30.000Z'
);

// The project. Two commits, so the built line has a git verdict to report.
writeFileSync(join(project, 'README.md'), '# Phase 138 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync(
    'git',
    [
      '-C',
      project,
      '-c',
      'user.name=p138',
      '-c',
      'user.email=p138@harness.invalid',
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

const seedPath = join(root, 'overview-seed.json');
const startedAt = Date.UTC(2026, 7, 20, 8, 0, 0);
writeFileSync(
  seedPath,
  JSON.stringify([
    {
      name: 'claude-6',
      agent: 'claude',
      agentSessionId: IDS.claude,
      cwd: project,
      createdAt: startedAt
    },
    {
      name: 'codex-2',
      agent: 'codex',
      agentSessionId: IDS.codex,
      cwd: project,
      createdAt: Date.UTC(2026, 7, 19, 10, 0, 0)
    }
  ]),
  'utf8'
);

/**
 * The sentence the stub writes. It passes all ten refusals on purpose: no
 * digit, no dash, no path, no git mark, no status, and no forty character run
 * shared with the fixture's ask or its answer.
 */
const STUB_SENTENCE =
  'The agent worked through what you asked and wrote back a short account of ' +
  'what changed.';

/** The stub binary. It prints the two messages the reader cares about. */
const stubPath = join(root, 'fold-stub.sh');
writeFileSync(
  stubPath,
  [
    '#!/bin/sh',
    '# Harness only. Prints one rate window and one result, and reads nothing.',
    'cat <<\'JSON\'',
    JSON.stringify({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed_warning',
        rateLimitType: 'seven_day',
        utilization: 0.37,
        resetsAt: 1788076800
      }
    }),
    JSON.stringify({
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: STUB_SENTENCE,
      total_cost_usd: 0
    }),
    'JSON',
    'exit 0',
    ''
  ].join('\n'),
  'utf8'
);
chmodSync(stubPath, 0o755);

const CHOICE = {
  agentId: 'claude',
  model: 'claude-haiku-4-5-20251001'
};

function writeFoldSeed(name, spec) {
  const path = join(root, `fold-seed-${name}.json`);
  writeFileSync(path, JSON.stringify(spec), 'utf8');
  return path;
}

// ---------------------------------------------------------------------------
// The reading each driven window returns
// ---------------------------------------------------------------------------

/**
 * Markup independent where it can be: it reads text and rectangles, and the
 * only class names it assumes are `.overview-layer`, `.overview-line`,
 * `.overview-line-outcome`, `.overview-line-lead` and `.overview-turn`.
 */
function readerJs(sentence) {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const deadline = Date.now() + 20000;
    let layer = null;
    while (Date.now() < deadline) {
      layer = document.querySelector('.overview-layer');
      if (layer !== null && (layer.innerText || '').trim() !== '') break;
      await wait(400);
    }
    await wait(600);
    layer = document.querySelector('.overview-layer');
    if (layer === null) return { error: 'the overview layer is not on the page' };
    const r = layer.getBoundingClientRect();
    const rect = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
    const win = { w: window.innerWidth, h: window.innerHeight };
    const scroller = document.scrollingElement;
    const fits = rect.width <= win.w && rect.top + rect.height <= win.h + 1 && scroller.scrollWidth <= win.w;

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

    const lines = Array.from(layer.querySelectorAll('.overview-line')).map((el) => ({
      name: (el.querySelector('.overview-line-name-text') || {}).textContent || '',
      lead: el.querySelector('.overview-line-lead') !== null,
      clock: el.querySelector('.overview-line-outcome[data-clock]') !== null,
      outcome: ((el.querySelector('.overview-line-outcome') || {}).textContent || '').trim()
    }));

    const flat = (layer.innerText || '').replace(/\\s+/g, ' ').trim();
    return {
      rect,
      win,
      fits,
      digitRuns,
      lines,
      turns: layer.querySelectorAll('.overview-turn').length,
      sentenceOnPage: flat.includes(${JSON.stringify(sentence)}),
      textHead: flat.slice(0, 1200)
    };
  } catch (err) {
    return { error: String((err && err.stack) || err) };
  }
})()`;
}

// ---------------------------------------------------------------------------
// One launch, one picture, one reading. Never two at a time.
// ---------------------------------------------------------------------------

const electronBin = join(repoRoot, 'node_modules', '.bin', 'electron');

/**
 * Ends a recorded pid AND every process descended from it, the way
 * build/probe-p137-overview.mjs does. A SIGKILL to the main pid alone leaves
 * the renderer, the GPU helper, the utility helpers and crashpad alive. The
 * descendants are read with pgrep -P while the parent still holds them.
 * Nothing outside the one recorded process tree can be named here.
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

async function launch(label, overviewSpec, extraEnv) {
  const png = join(outDir, `p138-${label}.png`);
  rmSync(png, { force: true });
  const drive = { projectPath: project, overview: overviewSpec };
  let child = null;
  let text = '';
  try {
    say(`launch ${label}`);
    child = spawn(
      electronBin,
      ['.', `--user-data-dir=${profile}`, '-ApplePersistenceIgnoreState', 'YES'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          HOME: home,
          GMUX_SHOT: png,
          GMUX_SHOT_DELAY_MS: '9000',
          GMUX_SHOT_DRIVE: JSON.stringify(drive),
          GMUX_SHOT_JS: readerJs(STUB_SENTENCE),
          GMUX_FOLD_BIN: stubPath,
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
    const readOne = (marker) => {
      const at = text.lastIndexOf(marker);
      if (at === -1) return null;
      try {
        return JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? '');
      } catch {
        return null;
      }
    };
    return {
      code,
      png: existsSync(png) ? png : null,
      report: readOne('[gmux-shot] probe '),
      seed: readOne('[gmux-fold-seed] '),
      text
    };
  } finally {
    // Whatever happened above, the Electron this function started is ended
    // here, together with every process descended from it.
    if (child !== null && child.pid !== undefined) killTree(child.pid);
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];
const results = {};

function lineFor(report, name) {
  return (report?.lines ?? []).find((line) => line.name === name) ?? null;
}

function checkFrame(label, res) {
  if (res.png === null) failures.push(`${label}: no picture was written`);
  if (res.report === null) {
    failures.push(
      `${label}: the driven window printed no reading (electron exited ${String(res.code)})`
    );
    return null;
  }
  if (res.report.error !== undefined) {
    failures.push(`${label}: the driver reported ${String(res.report.error)}`);
    return null;
  }
  if (res.report.fits !== true) {
    failures.push(
      `${label}: the page does not fit the window. Layer ` +
        `${JSON.stringify(res.report.rect)} in ${JSON.stringify(res.report.win)}.`
    );
  }
  if ((res.report.digitRuns ?? []).length !== 0) {
    failures.push(
      `${label}: ${String(res.report.digitRuns.length)} digit runs sit outside a ` +
        `clock, a date, an elapsed time or quoted text: ` +
        `${res.report.digitRuns.slice(0, 10).join(', ')}`
    );
  }
  writeFileSync(
    join(outDir, `p138-${label}.json`),
    JSON.stringify({ report: res.report, seed: res.seed }, null, 2),
    'utf8'
  );
  return res.report;
}

async function main() {
  // -------------------------------------------------------------------------
  // 1. The fold on. One real fold runs, and the project view draws it.
  // -------------------------------------------------------------------------
  const onSeed = writeFoldSeed('on', {
    ...CHOICE,
    projectPath: project,
    boundaries: ['claude-6'],
    waitMs: 30_000
  });
  results.on = await launch('on', { level: 'project' }, {
    GMUX_OVERVIEW_SEED: seedPath,
    GMUX_FOLD_SEED: onSeed
  });
  const on = checkFrame('on', results.on);
  const seed = results.on.seed;
  if (seed === null) {
    failures.push('on: the fold seed printed nothing, so no fold ran');
  } else {
    const outcome = (seed.outcomes ?? [])[0] ?? null;
    if (seed.choice?.agentId !== CHOICE.agentId || seed.choice?.model !== CHOICE.model) {
      failures.push(
        `on: the sealed choice read back as ${JSON.stringify(seed.choice)}, wanted ` +
          `${JSON.stringify(CHOICE)}. Without the choice nothing folds.`
      );
    }
    if (seed.counts?.spawns !== 1) {
      failures.push(
        `on: the scheduler spawned ${String(seed.counts?.spawns)} folds, wanted 1`
      );
    }
    if (outcome === null || outcome.verdict !== 'kept') {
      failures.push(
        `on: the fold did not keep a sentence: ${JSON.stringify(outcome)}`
      );
    } else {
      say(
        `on: one fold ran, verdict kept, turns ${String(outcome.fromTurn)} to ` +
          `${String(outcome.toTurn)}`
      );
      if (outcome.text !== STUB_SENTENCE) {
        failures.push(
          `on: the stored sentence is not the one the stub wrote: ${String(outcome.text)}`
        );
      }
    }
  }
  if (on !== null) {
    const claude = lineFor(on, 'claude-6');
    const codex = lineFor(on, 'codex-2');
    if (on.sentenceOnPage !== true) {
      failures.push('on: the written sentence is not on the project view');
    }
    if (claude === null) {
      failures.push('on: there is no line for claude-6');
    } else {
      if (claude.outcome !== STUB_SENTENCE) {
        failures.push(
          `on: the claude-6 line reads ${JSON.stringify(claude.outcome)}, wanted the ` +
            'written sentence'
        );
      }
      if (claude.lead !== false) {
        failures.push(
          'on: the claude-6 line still carries the built line\'s lead, so the ' +
            'written sentence did not replace the whole line'
        );
      }
      if (claude.clock !== false) {
        failures.push('on: a written sentence must carry no clock attribute');
      }
    }
    if (codex === null) {
      failures.push('on: there is no line for codex-2');
    } else if (codex.outcome === STUB_SENTENCE) {
      failures.push('on: codex-2 drew the sentence written for claude-6');
    }
  }

  // -------------------------------------------------------------------------
  // 2. Every other view, on the same profile and the same choice.
  // -------------------------------------------------------------------------
  const quietSeed = writeFoldSeed('quiet', { ...CHOICE, projectPath: project });
  for (const [label, spec] of [
    ['session', { level: 'session', sessionNames: ['claude-6'] }],
    ['several', { level: 'several', sessionNames: ['claude-6', 'codex-2'] }]
  ]) {
    results[label] = await launch(label, spec, { GMUX_FOLD_SEED: quietSeed });
    const rep = checkFrame(label, results[label]);
    if (rep === null) continue;
    if (rep.sentenceOnPage !== false) {
      failures.push(
        `${label}: the written sentence reached a view no model may write on`
      );
    }
    if (rep.turns < 1) {
      failures.push(`${label}: the view drew no conversation at all`);
    }
    say(
      `${label}: ${String(rep.turns)} exchanges drawn, written sentence on page ` +
        `${String(rep.sentenceOnPage)}`
    );
  }

  // -------------------------------------------------------------------------
  // 3. The fold off. The row is still in the store and the built line is back.
  // -------------------------------------------------------------------------
  const offSeed = writeFoldSeed('off', {
    agentId: null,
    model: null,
    projectPath: project
  });
  results.off = await launch('off', { level: 'project' }, {
    GMUX_FOLD_SEED: offSeed
  });
  const off = checkFrame('off', results.off);
  if (results.off.seed !== null && results.off.seed.choice?.agentId !== null) {
    failures.push(
      `off: the choice read back as ${JSON.stringify(results.off.seed.choice)}, wanted None`
    );
  }
  if (off !== null) {
    const claude = lineFor(off, 'claude-6');
    if (off.sentenceOnPage !== false) {
      failures.push(
        'off: the sentence is still drawn after the choice went back to None, ' +
          'which is what Settings promises does not happen'
      );
    }
    if (claude === null) {
      failures.push('off: there is no line for claude-6');
    } else if (claude.lead !== true) {
      failures.push(
        `off: the claude-6 line has no built lead, so Phase 137's line did not ` +
          `come back. It reads ${JSON.stringify(claude.outcome)}.`
      );
    } else {
      say(`off: the built line is back, and it reads ${JSON.stringify(claude.outcome)}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. The sentence goes behind. One more turn, no new fold, built line back.
  // -------------------------------------------------------------------------
  appendClaudeTurn(
    2,
    'now add a note about the staple step and leave the rest alone',
    'The note about stapling is in place and nothing else moved.',
    '2026-08-20T10:09:00.000Z'
  );
  const staleSeed = writeFoldSeed('stale', { ...CHOICE, projectPath: project });
  results.stale = await launch('stale', { level: 'project' }, {
    GMUX_FOLD_SEED: staleSeed
  });
  const stale = checkFrame('stale', results.stale);
  if (results.stale.seed !== null && results.stale.seed.choice?.agentId !== CHOICE.agentId) {
    failures.push('stale: the choice did not go back on, so this proves nothing');
  }
  if (stale !== null) {
    const claude = lineFor(stale, 'claude-6');
    if (stale.sentenceOnPage !== false) {
      failures.push(
        'stale: a sentence written for an older turn is drawn beside a newer one, ' +
          'which is the one failure this phase exists to avoid'
      );
    }
    if (claude === null) {
      failures.push('stale: there is no line for claude-6');
    } else if (claude.lead !== true) {
      failures.push(
        `stale: the built line did not come back. The line reads ` +
          `${JSON.stringify(claude.outcome)}.`
      );
    } else {
      say(
        `stale: the sentence stepped aside and the built line reads ` +
          `${JSON.stringify(claude.outcome)}`
      );
    }
  }

  console.log('');
  say(`pictures and readings are in ${outDir}`);
  for (const label of ['on', 'session', 'several', 'off', 'stale']) {
    say(
      `  p138-${label}.png ${results[label]?.png === null || results[label] === undefined ? 'MISSING' : 'written'}`
    );
  }
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
say(
  'PASS. Five launches on one profile, five pictures, five readings, one real ' +
    'fold, and the operator server untouched.'
);
