#!/usr/bin/env node
/**
 * probe-p1381-verify.mjs. The Phase 138.1 verifier's own probe.
 *
 * ## What it proves, in ONE probe run
 *
 *  1. settings-before  The Settings page as the PARENT commit draws it, from a
 *                      separate build of HEAD, photographed and read.
 *  2. settings-after   The same page on this build, photographed and read.
 *                      Both readings count the sentences the page draws and
 *                      list every agent the picker offers.
 *  3. fold-real        One REAL fold, being the real agent CLI and a real
 *                      model, driven through the shipped scheduler. The
 *                      project view is photographed and read: the row whose
 *                      line a model wrote carries "written HH:MM" and the row
 *                      whose line Tortie built carries nothing.
 *  4. skip             A boundary fired for a session whose project is closed,
 *                      so the fold.skipped record is on the console.
 *  5. suspend          Three folds in a row that fail, so the fold.suspended
 *                      record is on the console.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in one place, a read only `list-sessions` count taken
 *    before and after, which must match.
 *  - Every Electron launch uses a scratch `--user-data-dir` under the harness
 *    directory and a scratch HOME. At most one Electron runs at a time, and
 *    every launch goes through build/electron-run.mjs, whose kill is inside a
 *    finally block.
 *  - There is no pkill and no kill-server anywhere in this file.
 *  - The one real fold runs the real CLI through a two line wrapper that
 *    restores the person's own HOME, because that is where the CLI keeps its
 *    login. The wrapper adds no flag: every flag is the shipped recipe's.
 *
 * ## Usage
 *
 *   P1381_PARENT=<dir> node build/harness-socket.mjs gmux-p1381 \
 *     'node build/probe-p1381-verify.mjs'
 */

import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
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
const TAG = '[probe:p1381]';
const say = (l) => console.log(`${TAG} ${l}`);
const refuse = (w) => {
  console.error(`${TAG} ${w}`);
  process.exit(2);
};

const socket = (process.env['GMUX_TMUX_SOCKET'] ?? '').trim();
if (socket === '') refuse('no GMUX_TMUX_SOCKET. Run me through the harness.');
if (socket === 'gmux' || socket === 'default') refuse(`refusing socket "${socket}"`);
if (!existsSync(join(repoRoot, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}
const parentRoot = (process.env['P1381_PARENT'] ?? '').trim();
if (parentRoot === '' || !existsSync(join(parentRoot, 'out', 'main', 'index.js'))) {
  refuse('P1381_PARENT must name a built copy of the parent commit.');
}

const outDir = resolve(repoRoot, (process.env['P1381_OUT_DIR'] ?? '').trim() || 'out/p1381');
mkdirSync(outDir, { recursive: true });

function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], { encoding: 'utf8' });
  return (out.stdout ?? '').split('\n').filter((l) => l.trim() !== '').length;
}
const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p1381');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p1381-project'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p1381-project');
const home = join(root, 'home');
const profile = join(root, 'profile');
const parentProfile = join(root, 'parent-profile');
const suspendProfile = join(root, 'suspend-profile');

const IDS = {
  claude: '11111111-2222-4333-8444-555555555555',
  claude2: '22222222-3333-4444-8555-666666666666',
  codex: '0000aaaa-1111-7000-8000-222233334444'
};

const claudeDir = join(home, '.claude', 'projects', project.replace(/\//g, '-'));
mkdirSync(claudeDir, { recursive: true });
const claudeLog = join(claudeDir, `${IDS.claude}.jsonl`);
const claudeLog2 = join(claudeDir, `${IDS.claude2}.jsonl`);
copyFileSync(join(FIXTURES, 'claude-session.jsonl'), claudeLog);
copyFileSync(join(FIXTURES, 'claude-session.jsonl'), claudeLog2);

const codexDst = join(home, '.codex', 'sessions', '2026', '08', '19',
  `rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`);
mkdirSync(dirname(codexDst), { recursive: true });
copyFileSync(join(FIXTURES, `codex-rollout-2026-08-19T10-05-03-${IDS.codex}.jsonl`), codexDst);

function appendClaudeTurn(file, sessionId, nth, askText, answerText, atIso) {
  const base = {
    isSidechain: false, userType: 'external', entrypoint: 'cli', cwd: project,
    sessionId, version: '2.1.238', gitBranch: 'main'
  };
  const pad = String(nth).padStart(4, '0');
  const lines = [
    JSON.stringify({
      parentUuid: null, ...base, type: 'user',
      message: { role: 'user', content: askText },
      uuid: `dddd${pad}-1111-4111-8111-11111111111${nth % 10}`,
      timestamp: atIso, promptSource: 'typed', promptId: `p-8-${pad}`,
      origin: { kind: 'human' }
    }),
    JSON.stringify({
      parentUuid: null, ...base,
      message: {
        model: 'claude-opus-5', id: `msg_d${pad}`, type: 'message', role: 'assistant',
        content: [{ type: 'text', text: answerText }]
      },
      requestId: `req_d${pad}`, type: 'assistant',
      uuid: `eeee${pad}-1111-4111-8111-11111111111${nth % 10}`, timestamp: atIso
    })
  ];
  appendFileSync(file, `${lines.join('\n')}\n`, 'utf8');
}

for (const [file, id] of [[claudeLog, IDS.claude], [claudeLog2, IDS.claude2]]) {
  appendClaudeTurn(file, id, 1,
    'please walk the release steps and say what the dry run changed',
    'The dry run printed the steps in order and changed nothing on disk.',
    '2026-08-20T10:07:30.000Z');
}

writeFileSync(join(project, 'README.md'), '# Phase 138.1 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync('git', ['-C', project, '-c', 'user.name=p1381',
    '-c', 'user.email=p1381@harness.invalid', ...args], { encoding: 'utf8' });
  if (r.status !== 0) refuse(`git ${args.join(' ')} failed: ${r.stderr}`);
};
git('init', '-q');
git('add', 'README.md');
git('commit', '-q', '-m', 'first');

const seedPath = join(root, 'overview-seed.json');
writeFileSync(seedPath, JSON.stringify([
  { name: 'claude-6', agent: 'claude', agentSessionId: IDS.claude, cwd: project,
    createdAt: Date.UTC(2026, 7, 20, 8, 0, 0) },
  { name: 'claude-7', agent: 'claude', agentSessionId: IDS.claude2, cwd: project,
    createdAt: Date.UTC(2026, 7, 20, 8, 5, 0) },
  { name: 'codex-2', agent: 'codex', agentSessionId: IDS.codex, cwd: project,
    createdAt: Date.UTC(2026, 7, 19, 10, 0, 0) }
]), 'utf8');

/** The real CLI, with the person's own HOME restored and no flag added. */
const realClaude = (() => {
  const r = spawnSync('/bin/sh', ['-lc', 'command -v claude'], { encoding: 'utf8' });
  return (r.stdout ?? '').trim();
})();
if (realClaude === '') refuse('claude is not on the login shell PATH.');
const realHome = process.env['P1381_REAL_HOME'] ?? '';
if (realHome === '') refuse('P1381_REAL_HOME must name the login home for the real fold.');
const wrapper = join(root, 'real-claude.sh');
writeFileSync(wrapper, ['#!/bin/sh',
  '# The shipped recipe decides every flag. This restores only HOME.',
  `exec env HOME=${realHome} ${realClaude} "$@"`, ''].join('\n'), 'utf8');
chmodSync(wrapper, 0o755);

/** A stub that always fails, for the suspension. */
const failStub = join(root, 'fail-stub.sh');
writeFileSync(failStub, ['#!/bin/sh', 'echo "{}"', 'exit 3', ''].join('\n'), 'utf8');
chmodSync(failStub, 0o755);

const CHOICE = { agentId: 'claude', model: 'claude-haiku-4-5-20251001' };
function writeFoldSeed(name, spec) {
  const path = join(root, `fold-seed-${name}.json`);
  writeFileSync(path, JSON.stringify(spec), 'utf8');
  return path;
}

// ---------------------------------------------------------------------------
// The two readers
// ---------------------------------------------------------------------------

/** Runs inside the Settings renderer. Clicks the rail row, then reads it. */
function settingsJs(labels) {
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const wanted = ${JSON.stringify(labels)};
    const rail = Array.from(document.querySelectorAll('.set-nav-item'))
      .find((n) => wanted.includes((n.textContent || '').trim()));
    if (!rail) return { error: 'no rail row named ' + wanted.join(' or ') +
      '; rows are ' + Array.from(document.querySelectorAll('.set-nav-item')).map((n) => (n.textContent||'').trim()).join(' | ') };
    rail.click();
    await wait(900);
    const sec = document.querySelector('.set-body section') || document.querySelector('section');
    if (!sec) return { error: 'no section on the page' };
    const grab = (sel) => Array.from(sec.querySelectorAll(sel)).map((n) => (n.textContent || '').trim()).filter((t) => t !== '');
    const prose = [...grab('.set-row-caption'), ...grab('.set-row-error'), ...grab('.set-section-caption')];
    const sentences = prose.join(' ').match(/[^.!?]+[.!?]/g) || [];
    const selects = Array.from(sec.querySelectorAll('select')).map((s) => ({
      label: s.getAttribute('aria-label'),
      value: s.value,
      options: Array.from(s.options).map((o) => ({ text: o.textContent, value: o.value, disabled: o.disabled }))
    }));
    return JSON.stringify({
      railLabel: (rail.textContent || '').trim(),
      title: (sec.querySelector('.set-title') || {}).textContent || '',
      groups: grab('.set-group-label'),
      prose,
      proseChars: prose.join(' ').length,
      sentenceCount: sentences.length,
      sentences: sentences.map((s) => s.trim()),
      selects,
      flat: (sec.innerText || '').replace(/\\s+/g, ' ').trim()
    });
  } catch (err) { return JSON.stringify({ error: String((err && err.stack) || err) }); }
})()`;
}

/** Runs in the app window on the project view. */
const overviewJs = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    const deadline = Date.now() + 20000;
    let layer = null;
    while (Date.now() < deadline) {
      layer = document.querySelector('.overview-layer');
      if (layer !== null && (layer.innerText || '').trim() !== '') break;
      await wait(400);
    }
    await wait(800);
    layer = document.querySelector('.overview-layer');
    if (layer === null) return { error: 'the overview layer is not on the page' };
    const r = layer.getBoundingClientRect();
    const win = { w: window.innerWidth, h: window.innerHeight };
    const fits = r.width <= win.w && r.top + r.height <= win.h + 1 &&
      document.scrollingElement.scrollWidth <= win.w;
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
    const lines = Array.from(layer.querySelectorAll('.overview-line')).map((el) => {
      const w = el.querySelector('.overview-line-written');
      return {
        name: (el.querySelector('.overview-line-name-text') || {}).textContent || '',
        lead: el.querySelector('.overview-line-lead') !== null,
        outcome: ((el.querySelector('.overview-line-outcome') || {}).textContent || '').trim(),
        written: w === null ? null : (w.textContent || '').trim(),
        writtenClockDigits: w === null ? null : ((w.querySelector('[data-clock]') || {}).textContent || '').trim(),
        writtenColor: w === null ? null : getComputedStyle(w).color,
        rowText: (el.innerText || '').replace(/\\s+/g, ' ').trim()
      };
    });
    return { rect: { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) },
      win, fits, digitRuns, lines, turns: layer.querySelectorAll('.overview-turn').length,
      flat: (layer.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1500) };
  } catch (err) { return { error: String((err && err.stack) || err) }; }
})()`;

// ---------------------------------------------------------------------------
// One launch at a time. Always through the helper.
// ---------------------------------------------------------------------------

async function launch(label, { cwd, userDataDir, env, settings }) {
  const png = join(outDir, `p1381-${label}.png`);
  rmSync(png, { force: true });
  say(`launch ${label}`);
  const { code, text } = await runElectron({
    label: `p1381 ${label}`,
    userDataDir,
    cwd,
    env: {
      ...process.env,
      HOME: home,
      GMUX_LOG_FILE: '1',
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '9000',
      ...(settings === undefined ? {} : { GMUX_SHOT_SETTINGS: '1', GMUX_SHOT_SETTINGS_JS: settings }),
      ...env
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
  writeFileSync(join(outDir, `p1381-${label}.log`), text, 'utf8');
  const readOne = (marker) => {
    const at = text.lastIndexOf(marker);
    if (at === -1) return null;
    const line = text.slice(at + marker.length).split('\n')[0] ?? '';
    try { return JSON.parse(line.replace(/^→\s*/, '')); } catch { return null; }
  };
  return {
    code,
    png: existsSync(png) ? png : null,
    report: readOne('[gmux-shot] driver → ') ?? readOne('[gmux-shot] probe '),
    seed: readOne('[gmux-fold-seed] '),
    foldLines: text.split('\n').filter((l) => l.includes('[gmux-fold]')),
    text
  };
}

const failures = [];
const results = {};

function save(label, res) {
  writeFileSync(join(outDir, `p1381-${label}.json`),
    JSON.stringify({ report: res.report, seed: res.seed, foldLines: res.foldLines }, null, 2), 'utf8');
  if (res.png === null) failures.push(`${label}: no picture was written`);
  if (res.report === null) failures.push(`${label}: the driven window printed no reading (electron exited ${String(res.code)})`);
  else if (res.report.error !== undefined) failures.push(`${label}: the driver reported ${String(res.report.error)}`);
}

async function main() {
  // 1. The parent commit's page.
  results.before = await launch('settings-before', {
    cwd: parentRoot, userDataDir: parentProfile,
    settings: settingsJs(['Project line', 'Catch Me Up'])
  });
  save('settings-before', results.before);

  // 1b. The parent commit's page once an agent is chosen, which is the state
  // the operator photographed. No boundary is fired, so nothing spawns.
  const parentChoiceSeed = writeFoldSeed('parent-choice', { ...CHOICE });
  results.beforeChosen = await launch('settings-before-chosen', {
    cwd: parentRoot, userDataDir: parentProfile,
    env: { GMUX_FOLD_SEED: parentChoiceSeed },
    settings: settingsJs(['Project line', 'Catch Me Up'])
  });
  save('settings-before-chosen', results.beforeChosen);

  // 2. This build's page.
  results.after = await launch('settings-after', {
    cwd: repoRoot, userDataDir: profile,
    settings: settingsJs(['Catch Me Up', 'Project line'])
  });
  save('settings-after', results.after);

  // 3. One REAL fold, then the project view.
  const realSeed = writeFoldSeed('real', {
    ...CHOICE, projectPath: project, boundaries: ['claude-6'], waitMs: 60_000
  });
  results.real = await launch('fold-real', {
    cwd: repoRoot, userDataDir: profile,
    env: {
      GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project, overview: { level: 'project' } }),
      GMUX_SHOT_JS: overviewJs,
      GMUX_OVERVIEW_SEED: seedPath,
      GMUX_FOLD_SEED: realSeed,
      GMUX_FOLD_BIN: wrapper
    }
  });
  save('fold-real', results.real);

  // 3b. The same page once an agent is chosen, which is the state the
  // operator photographed. The choice was sealed by launch 3 on this profile.
  results.chosen = await launch('settings-chosen', {
    cwd: repoRoot, userDataDir: profile,
    settings: settingsJs(['Catch Me Up', 'Project line'])
  });
  save('settings-chosen', results.chosen);

  // 4. A boundary whose project is closed.
  const skipSeed = writeFoldSeed('skip', { ...CHOICE, boundaries: ['claude-6'], waitMs: 3_000 });
  results.skip = await launch('skip', {
    cwd: repoRoot, userDataDir: profile,
    env: {
      GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project, overview: { level: 'project' } }),
      GMUX_SHOT_JS: overviewJs,
      GMUX_FOLD_SEED: skipSeed,
      GMUX_FOLD_BIN: wrapper
    }
  });
  save('skip', results.skip);

  // 5. Three folds in a row that fail.
  const failSeed = writeFoldSeed('fail', {
    ...CHOICE, projectPath: project,
    boundaries: ['claude-6', 'claude-7', 'codex-2'], waitMs: 40_000
  });
  results.suspend = await launch('suspend', {
    cwd: repoRoot, userDataDir: suspendProfile,
    env: {
      GMUX_SHOT_DRIVE: JSON.stringify({ projectPath: project, overview: { level: 'project' } }),
      GMUX_SHOT_JS: overviewJs,
      GMUX_OVERVIEW_SEED: seedPath,
      GMUX_FOLD_SEED: failSeed,
      GMUX_FOLD_BIN: failStub
    }
  });
  save('suspend', results.suspend);

  // The log file the app wrote in its own profile.
  const foldRecords = [];
  for (const dir of [profile, suspendProfile]) {
    const appLog = join(dir, 'logs', 'app.log');
    if (!existsSync(appLog)) continue;
    for (const l of readFileSync(appLog, 'utf8').split('\n')) {
      if (l.includes('"scope":"fold"')) foldRecords.push(l);
    }
  }
  if (foldRecords.length > 0) {
    writeFileSync(join(outDir, 'p1381-fold-log.jsonl'), foldRecords.join('\n'), 'utf8');
    say(`app.log holds ${String(foldRecords.length)} fold records`);
  } else {
    failures.push('no app.log was written, so the log records cannot be shown');
  }
}

await main();

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(`the operator's session count moved from ${String(operatorBefore)} to ${String(operatorAfter)}`);
}
writeFileSync(join(outDir, 'p1381-all.json'), JSON.stringify(
  Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { report: v.report, seed: v.seed, foldLines: v.foldLines }])), null, 2), 'utf8');
say(`pictures and readings are in ${outDir}`);
if (failures.length > 0) {
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS');
