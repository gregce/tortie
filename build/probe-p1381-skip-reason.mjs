#!/usr/bin/env node
/**
 * probe-p1381-skip-reason.mjs. The Phase 138.1 fix round's own probe.
 *
 * ## The defect it proves is gone
 *
 * `fold.skipped` gave the wrong reason for the commonest dropped boundary
 * there is. The scheduler mapped `prepare` returning null to `no-store`, and
 * the shipped `prepare` returned null for two different things: a session
 * with no readable record, and a session whose newest turn a fold already
 * covers. So an ordinary "there is nothing new to fold" boundary was written
 * to the log as `no-store`, which reads as a broken database. The one surface
 * that exists to diagnose a fold that did not happen was giving a wrong
 * diagnosis.
 *
 * `prepare` answers a verdict now, so the two reasons reach the log as
 * themselves. This probe drives the real app twice on ONE profile and reads
 * the records off the console.
 *
 *   first  claude-6 folds and its row is written. orphan-1 has a manifest row
 *          and no agent log at all, so its boundary is dropped as `no-store`.
 *   again  the same profile. claude-6's newest turn is already covered, so
 *          its boundary is dropped as `no-new-turns` and NOT as `no-store`.
 *
 * ## It spends nothing
 *
 * GMUX_FOLD_BIN points the spawn at a small script that prints one result
 * line. No model is asked anything, so this probe can be run again for
 * nothing. Everything else is the shipped path: the sealed choice, the settle
 * timer, the store read, the composer, the recipe's argv and the one append.
 *
 * ## Safety, absolute
 *
 *  - It refuses to run unless build/harness-socket.mjs handed it a socket of
 *    its own, and it refuses the names `gmux` and `default` outright.
 *  - `-L gmux` is named in exactly one place, a read only `list-sessions`
 *    count taken before and after, which must match.
 *  - Both Electron launches use a scratch `--user-data-dir` under the harness
 *    directory and a scratch HOME. At most one Electron runs at a time, and
 *    every launch goes through build/electron-run.mjs, whose kill is inside a
 *    finally block.
 *  - There is no pkill and no kill-server anywhere in this file.
 *
 * ## Usage, from the worktree root
 *
 *   node build/harness-socket.mjs gmux-p1381-skip \
 *     'node build/probe-p1381-skip-reason.mjs'
 *
 * Exit 0 when both records carry the right reason. 1 when they do not. 2 when
 * the probe refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
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

import { runElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[probe:p1381skip]';
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
      "node build/harness-socket.mjs gmux-p1381-skip 'node build/probe-p1381-skip-reason.mjs'"
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
  (process.env['P1381_OUT_DIR'] ?? '').trim() || 'out/p1381'
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

// ---------------------------------------------------------------------------
// The scratch world
// ---------------------------------------------------------------------------

const FIXTURES = join(repoRoot, 'docs', 'research', 'assets', '63-fixtures');
const scratchBase =
  process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratchBase, 'gmux-p1381-skip');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'p1381-project'), { recursive: true });
mkdirSync(join(rawRoot, 'home'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'p1381-project');
const home = join(root, 'home');
const profile = join(root, 'profile');

const IDS = {
  /** The session that folds. Its log is a committed fixture. */
  claude: '11111111-2222-4333-8444-555555555555',
  /** The session with a manifest row and no log file anywhere. */
  orphan: '99999999-8888-4777-8666-555544443333'
};

const claudeDir = join(home, '.claude', 'projects', project.replace(/\//g, '-'));
mkdirSync(claudeDir, { recursive: true });
const claudeLog = join(claudeDir, `${IDS.claude}.jsonl`);
copyFileSync(join(FIXTURES, 'claude-session.jsonl'), claudeLog);

/** One more exchange on the COPY. The committed fixture is never touched. */
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

writeFileSync(join(project, 'README.md'), '# Phase 138.1 scratch project\n', 'utf8');
const git = (...args) => {
  const r = spawnSync(
    'git',
    [
      '-C',
      project,
      '-c',
      'user.name=p1381',
      '-c',
      'user.email=p1381@harness.invalid',
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
writeFileSync(
  seedPath,
  JSON.stringify([
    {
      name: 'claude-6',
      agent: 'claude',
      agentSessionId: IDS.claude,
      cwd: project,
      createdAt: Date.UTC(2026, 7, 20, 8, 0, 0)
    },
    {
      name: 'orphan-1',
      agent: 'claude',
      agentSessionId: IDS.orphan,
      cwd: project,
      createdAt: Date.UTC(2026, 7, 20, 8, 5, 0)
    }
  ]),
  'utf8'
);

/** The sentence the stub writes. It passes all ten refusals on purpose. */
const STUB_SENTENCE =
  'The agent worked through what you asked and wrote back a short account of ' +
  'what changed.';

const stubPath = join(root, 'fold-stub.sh');
writeFileSync(
  stubPath,
  [
    '#!/bin/sh',
    '# Harness only. Prints one result and reads nothing.',
    "cat <<'JSON'",
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

const CHOICE = { agentId: 'claude', model: 'claude-haiku-4-5-20251001' };
function writeFoldSeed(name, spec) {
  const path = join(root, `fold-seed-${name}.json`);
  writeFileSync(path, JSON.stringify(spec), 'utf8');
  return path;
}

// ---------------------------------------------------------------------------
// One launch at a time. Always through the helper.
// ---------------------------------------------------------------------------

async function launch(label, extraEnv) {
  const png = join(outDir, `p1381-skip-${label}.png`);
  rmSync(png, { force: true });
  say(`launch ${label}`);
  const { code, text } = await runElectron({
    label: `p1381skip ${label}`,
    userDataDir: profile,
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: home,
      GMUX_SHOT: png,
      GMUX_SHOT_DELAY_MS: '4000',
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        overview: { level: 'project' }
      }),
      GMUX_FOLD_BIN: stubPath,
      ...extraEnv
    },
    ceilingMs: 300_000,
    settleMs: 500
  });
  writeFileSync(join(outDir, `p1381-skip-${label}.log`), text, 'utf8');
  const seedAt = text.lastIndexOf('[gmux-fold-seed] ');
  let seed = null;
  if (seedAt !== -1) {
    try {
      seed = JSON.parse(
        text.slice(seedAt + '[gmux-fold-seed] '.length).split('\n')[0] ?? ''
      );
    } catch {
      seed = null;
    }
  }
  /** Every `fold.skipped` console line this launch printed, parsed. */
  const skips = [];
  for (const line of text.split('\n')) {
    if (!line.includes('[gmux-fold] a turn boundary was dropped')) continue;
    const at = line.indexOf('{');
    if (at === -1) continue;
    try {
      skips.push(JSON.parse(line.slice(at)));
    } catch {
      /* a line the console split is not a record */
    }
  }
  return { code, png: existsSync(png) ? png : null, seed, skips, text };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const failures = [];
const results = {};

/** The manifest id the seed printed for one session name. */
function idFor(seed, name) {
  const row = (seed?.outcomes ?? []).find((o) => o.name === name);
  return row?.sessionId ?? null;
}

async function main() {
  // 1. claude-6 folds. orphan-1 has no log at all, so it is dropped.
  const firstSeed = writeFoldSeed('first', {
    ...CHOICE,
    projectPath: project,
    boundaries: ['claude-6', 'orphan-1'],
    waitMs: 20_000
  });
  results.first = await launch('first', {
    GMUX_OVERVIEW_SEED: seedPath,
    GMUX_FOLD_SEED: firstSeed
  });

  // 2. The same profile, so claude-6's newest turn is already covered. The
  // manifest is NOT seeded again, because the rows are in the profile.
  const againSeed = writeFoldSeed('again', {
    ...CHOICE,
    projectPath: project,
    boundaries: ['claude-6'],
    waitMs: 15_000
  });
  results.again = await launch('again', { GMUX_FOLD_SEED: againSeed });
}

await main();

const first = results.first;
const again = results.again;

if (first.seed === null) {
  failures.push('first: the fold seed printed nothing, so nothing was driven');
} else {
  const folded = (first.seed.outcomes ?? []).find((o) => o.name === 'claude-6');
  if (folded?.verdict !== 'kept') {
    failures.push(
      `first: claude-6 was expected to fold and be kept, and the row says ` +
        `${JSON.stringify(folded)}`
    );
  }
}

const orphanId = idFor(first.seed, 'orphan-1');
const claudeId = idFor(first.seed, 'claude-6');

const orphanSkip = first.skips.find((s) => s.sessionId === orphanId) ?? null;
if (orphanSkip === null) {
  failures.push(
    'first: no fold.skipped record names orphan-1, whose session has no log at all'
  );
} else if (orphanSkip.reason !== 'no-store') {
  failures.push(
    `first: orphan-1 was dropped as ${String(orphanSkip.reason)}, and a session ` +
      'with no readable record is the one thing no-store is for'
  );
}

const againSkip = again.skips.find((s) => s.sessionId === claudeId) ?? null;
if (againSkip === null) {
  failures.push(
    'again: no fold.skipped record names claude-6, so the second boundary ' +
      'never reached prepare'
  );
} else if (againSkip.reason === 'no-store') {
  failures.push(
    'again: the defect is still here. claude-6 reads fine and its newest turn ' +
      'is already covered, and the log still calls that no-store'
  );
} else if (againSkip.reason !== 'no-new-turns') {
  failures.push(
    `again: claude-6 was dropped as ${String(againSkip.reason)}, wanted no-new-turns`
  );
}

writeFileSync(
  join(outDir, 'p1381-skip-reason.json'),
  JSON.stringify(
    {
      first: { seed: first.seed, skips: first.skips },
      again: { seed: again.seed, skips: again.skips }
    },
    null,
    2
  ),
  'utf8'
);

say(`first launch dropped: ${JSON.stringify(first.skips)}`);
say(`again launch dropped: ${JSON.stringify(again.skips)}`);

const operatorAfter = operatorSessionCount();
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (operatorAfter !== operatorBefore) {
  failures.push(
    `the operator's session count moved from ${String(operatorBefore)} to ` +
      `${String(operatorAfter)}`
  );
}

say(`readings are in ${outDir}`);
if (failures.length > 0) {
  say(`FAIL, ${String(failures.length)}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
say('PASS. Each dropped boundary reached the log as itself.');
