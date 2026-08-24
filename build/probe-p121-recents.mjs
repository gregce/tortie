/**
 * `node build/probe-p121-recents.mjs`. The live probe of Phase 121, being the
 * empty Cmd+P list for a project folder whose path holds a space.
 *
 * Run `npm run build` first. The probe loads the built ranking worker from
 * `out/main/quickopen-worker.js` and refuses to start without it.
 *
 * ---------------------------------------------------------------------------
 * THE SAFETY RULES, AND THEY OUTRANK EVERY RESULT BELOW
 * ---------------------------------------------------------------------------
 *  1. It starts no tmux server, opens no manifest, launches no Electron and
 *     contacts no machine. There is no ssh in this file. The one root it calls
 *     remote is warmed with a name list this probe wrote itself, so nothing is
 *     enumerated for it and nothing is asked of any computer.
 *  2. `tmux -L gmux list-sessions` is counted before and after and both numbers
 *     are printed. A difference is a failure.
 *  3. The only directories it touches are ones it creates under /tmp, every one
 *     prefixed `p121-`. It never opens the repository this file lives in for
 *     writing and it runs no git verb at all.
 *  4. Only recorded pids are stopped. There is no `pkill` and no `kill-server`.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DRIVES
 * ---------------------------------------------------------------------------
 * The real shipped ranking path. `createQuickOpenCoordinator` from
 * `src/main/quickopen/coordinator.ts` starts a real `worker_threads` thread
 * running the built `out/main/quickopen-worker.js`, which spawns the vendored
 * ripgrep and enumerates real directories under /tmp. Every answer below came
 * back over that thread boundary.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT PROVES, AND HOW EACH ROW IS MEASURED
 * ---------------------------------------------------------------------------
 *  1. The operator's session count before anything started.
 *  2. A local root whose path holds a space answers the empty query.
 *  3. A relative path that holds a space comes back byte for byte.
 *  4. A root and a relative path that both hold a space come back whole.
 *  5. The space free control root answers the same rows in the same order.
 *  6. A remote root key whose path holds a space answers with its machine.
 *  7. One relative path under one absolute path on two computers is two rows.
 *  8. The tiebreaker still puts the recent one of two equally scored paths
 *     first, on the root whose path holds a space.
 *  9. The shape a renderer from before this phase sends still ranks. The same
 *     query is asked again with `recents` given as `${root} ${relPath}`
 *     strings, and the space free root answers the same rows.
 * 10. Ordering did not move. The control root's rows from the tuple input are
 *     compared row for row with its rows from the old string input, and with a
 *     baseline file when `--baseline <path>` is given. The run always writes
 *     its own baseline so a later run on another tree can compare with it.
 * 11. It wrote nothing. The size and modification time of every corpus file is
 *     compared before and after.
 * 12. The operator's session count did not move.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * The far side of rows 6 and 7 is a name list this probe injected, not a real
 * machine. No Linux machine and no machine of the operator's is contacted.
 * Nothing here measures the palette's React rendering, which the screenshot
 * read covers instead.
 *
 * Exit 0 when every row passes, 1 with every failing row named, 2 when it
 * refuses to run at all.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const root = join('/tmp', `p121-recents-${String(process.pid)}`);
/** The project folder whose path holds a space. This is the defect's shape. */
const spacedRoot = join(root, 'my projects', 'app');
/** The project folder with no space in it, the control. */
const plainRoot = join(root, 'plain', 'app');
/** The same absolute path as `spacedRoot`, said to be on another computer. */
const remoteRoot = `machine:studio:${spacedRoot}`;

const failures = [];
const say = (text) => process.stdout.write(`[p121-recents] ${text}\n`);
const fail = (text) => {
  failures.push(text);
  process.stdout.write(`[p121-recents] FAIL: ${text}\n`);
};
const step = (n, what, evidence) =>
  process.stdout.write(`[p121-recents] ${String(n)}. ${what}: ${evidence}\n`);

/** The baseline to compare row 10 against, when the caller named one. */
const baselineArg = (() => {
  const at = process.argv.indexOf('--baseline');
  return at >= 0 ? process.argv[at + 1] : undefined;
})();

// ---------------------------------------------------------------------------
// Row 1. The operator's sessions, counted read only
// ---------------------------------------------------------------------------

function operatorSessions() {
  const out = spawnSync(
    '/bin/sh',
    ['-c', 'tmux -L gmux list-sessions 2>/dev/null | wc -l'],
    { encoding: 'utf8', timeout: 20_000 }
  );
  return Number((out.stdout ?? '0').trim());
}

const sessionsBefore = operatorSessions();
step(1, 'the operator session count before anything started', String(sessionsBefore));

// ---------------------------------------------------------------------------
// Refuse to run without the pieces the real path needs
// ---------------------------------------------------------------------------

const workerEntry = join(repoRoot, 'out', 'main', 'quickopen-worker.js');
if (!existsSync(workerEntry)) {
  say(`REFUSING: ${workerEntry} is not there. Run npm run build first.`);
  process.exit(2);
}

const rgPath = join(
  repoRoot,
  'node_modules',
  `@vscode/ripgrep-${process.platform}-${process.arch}`,
  'bin',
  'rg'
);
if (!existsSync(rgPath)) {
  say(`REFUSING: the vendored ripgrep is not at ${rgPath}.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The corpus, made by this probe under /tmp
// ---------------------------------------------------------------------------

rmSync(root, { recursive: true, force: true });
for (const dir of [
  join(spacedRoot, 'src'),
  join(spacedRoot, 'src', 'aa'),
  join(spacedRoot, 'src', 'bb'),
  join(plainRoot, 'src')
]) {
  mkdirSync(dir, { recursive: true });
}

const corpusFiles = [
  [join(spacedRoot, 'README.md'), '# a project whose folder path holds a space\n'],
  [join(spacedRoot, 'src', 'a b.ts'), '// a relative path that holds a space\n'],
  [join(spacedRoot, 'src', 'plain.ts'), '// a relative path with no space\n'],
  [join(spacedRoot, 'src', 'aa', 'dup.ts'), '// one of the two tie rows\n'],
  [join(spacedRoot, 'src', 'bb', 'dup.ts'), '// the other tie row\n'],
  [join(plainRoot, 'README.md'), '# the control project\n'],
  [join(plainRoot, 'src', 'a b.ts'), '// a relative path that holds a space\n'],
  [join(plainRoot, 'src', 'plain.ts'), '// a relative path with no space\n']
];
for (const [path, body] of corpusFiles) writeFileSync(path, body, 'utf8');

/** Every file under the corpus, with its size and modification time. */
function corpusStamp(dir) {
  const out = {};
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      const s = statSync(path);
      out[path] = `${String(s.size)}:${String(s.mtimeMs)}`;
    }
  };
  walk(dir);
  return out;
}

const stampBefore = corpusStamp(root);

// ---------------------------------------------------------------------------
// The driver. Every read below is Tortie's own code
// ---------------------------------------------------------------------------

const driverPath = join(root, 'p121-recents-driver.ts');
writeFileSync(
  driverPath,
  String.raw`
import { readFileSync, writeFileSync } from 'node:fs';
import { tsxCli } from './ts-runner.mjs';

// An async main rather than top level await: the driver is compiled to a
// CommonJS module and top level await is not available there.
async function main(): Promise<void> {

const REPO = '__REPO__';
const input = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'));
const outPath = process.argv[3] ?? '';

const mod = await import(REPO + '/src/main/quickopen/coordinator');
const coordinator = mod.createQuickOpenCoordinator({
  rgPath: () => input.rgPath,
  workerEntry: () => input.workerEntry
});

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

const answers: unknown[] = [];
let seq = 1;

async function ask(op: Record<string, unknown>): Promise<unknown> {
  // Ask until every queried root has a complete list, or until the deadline.
  // The first enumeration of a directory takes a few milliseconds and a
  // partial answer would measure the indexer rather than the recents reader.
  const deadline = Date.now() + 15_000;
  let last: Record<string, unknown> = {};
  for (;;) {
    last = (await coordinator.query({
      roots: op.roots as string[],
      query: String(op.query ?? ''),
      seq: seq++,
      limit: Number(op.limit ?? 50),
      recents: op.recents as never
    })) as Record<string, unknown>;
    if (last.ready === true || Date.now() > deadline) break;
    await sleep(25);
  }
  return last;
}

try {
  for (const op of input.ops as Record<string, unknown>[]) {
    if (op.kind === 'warm') {
      coordinator.warm({
        root: op.root as string,
        ...(op.paths === undefined ? {} : { paths: op.paths as string[] })
      });
      answers.push({ name: op.name, warmed: true });
      continue;
    }
    answers.push({ name: op.name, result: await ask(op) });
  }
} catch (err) {
  answers.push({ name: 'setup', error: String((err as Error).message) });
}

await coordinator.dispose();
writeFileSync(outPath, JSON.stringify({ answers }), 'utf8');
process.exit(0);
}

void main();
`.replace('__REPO__', repoRoot),
  'utf8'
);

/** One recents entry as the string a renderer from before Phase 121 sent. */
const asLegacy = (one) => `${one.root} ${one.relPath}`;

const spacedRecents = [
  { root: spacedRoot, relPath: 'src/a b.ts' },
  { root: spacedRoot, relPath: 'README.md' }
];
const plainRecents = [
  { root: plainRoot, relPath: 'src/a b.ts' },
  { root: plainRoot, relPath: 'README.md' },
  { root: plainRoot, relPath: 'src/plain.ts' }
];
const twoMachines = [
  { root: spacedRoot, relPath: 'src/a b.ts' },
  { root: remoteRoot, relPath: 'src/a b.ts' }
];
const tieRecents = [{ root: spacedRoot, relPath: 'src/bb/dup.ts' }];

const ops = [
  { kind: 'warm', name: 'warm the spaced root', root: spacedRoot },
  { kind: 'warm', name: 'warm the plain root', root: plainRoot },
  {
    kind: 'warm',
    name: 'warm the remote root with an injected name list',
    root: remoteRoot,
    paths: ['README.md', 'src/a b.ts', 'src/plain.ts']
  },
  {
    kind: 'query',
    name: 'spaced root, empty query, tuple recents',
    roots: [spacedRoot],
    query: '',
    recents: spacedRecents
  },
  {
    kind: 'query',
    name: 'plain root, empty query, tuple recents',
    roots: [plainRoot],
    query: '',
    recents: plainRecents
  },
  {
    kind: 'query',
    name: 'plain root, empty query, old string recents',
    roots: [plainRoot],
    query: '',
    recents: plainRecents.map(asLegacy)
  },
  {
    kind: 'query',
    name: 'remote root, empty query',
    roots: [remoteRoot],
    query: '',
    recents: [{ root: remoteRoot, relPath: 'src/a b.ts' }]
  },
  {
    kind: 'query',
    name: 'both computers, empty query',
    roots: [spacedRoot, remoteRoot],
    query: '',
    recents: twoMachines
  },
  {
    kind: 'query',
    name: 'the tiebreaker, with no recents at all',
    roots: [spacedRoot],
    query: 'dup.ts',
    recents: []
  },
  {
    kind: 'query',
    name: 'the tiebreaker, with the second path recent',
    roots: [spacedRoot],
    query: 'dup.ts',
    recents: tieRecents
  }
];

const inPath = join(root, 'p121-in.json');
const outPath = join(root, 'p121-out.json');
writeFileSync(
  inPath,
  JSON.stringify({ rgPath, workerEntry, ops }),
  'utf8'
);

const run = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', driverPath, inPath, outPath],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      // electron's own escape hatch, the same one vitest.config.ts sets. The
      // coordinator's logger imports electron, and without this the import
      // starts a download of a binary this probe never runs.
      ELECTRON_OVERRIDE_DIST_PATH: join(repoRoot, 'node_modules', 'electron', 'dist')
    }
  }
);

if (!existsSync(outPath)) {
  say('the driver did not answer. It printed:');
  process.stdout.write(
    `${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-15).join('\n')}\n`
  );
  process.exit(2);
}

const answers = JSON.parse(readFileSync(outPath, 'utf8')).answers;
const answerOf = (name) => answers.find((one) => one.name === name);
const resultOf = (name) => answerOf(name)?.result ?? {};
const hitsOf = (name) => resultOf(name).hits ?? [];
/**
 * One hit as one comparable line, so two answers compare row for row.
 *
 * The corpus root carries this run's pid, so it is written out as the token
 * `<corpus>`. Without that no baseline could be compared across two runs, which
 * is the whole point of row 10.
 */
const lineOf = (hit) =>
  `${hit.machineId ?? 'local'}|${String(hit.repoPath).split(root).join('<corpus>')}|${hit.relPath}|${String(hit.recent)}`;

const setupError = answers.find((one) => one.name === 'setup');
if (setupError !== undefined) {
  fail(`the driver threw before it finished: ${String(setupError.error)}`);
}

// ---------------------------------------------------------------------------
// Rows 2 to 4. The root that holds a space
// ---------------------------------------------------------------------------

const spacedHits = hitsOf('spaced root, empty query, tuple recents');
const readme = spacedHits.find((h) => h.relPath === 'README.md');
if (readme === undefined || readme.repoPath !== spacedRoot) {
  fail(
    'a local root whose path holds a space did not answer the empty query. ' +
      `It listed ${String(spacedHits.length)} rows.`
  );
} else if ('machineId' in readme) {
  fail('a folder on this Mac came back carrying a machine id.');
}
step(
  2,
  'a local root whose path holds a space answers the empty query',
  `rows=${String(spacedHits.length)} repoPath="${String(readme?.repoPath)}" machineId=${String(readme === undefined ? 'none' : 'machineId' in readme ? readme.machineId : 'none')}`
);

const spacedRel = spacedHits.find((h) => h.relPath === 'src/a b.ts');
if (spacedRel === undefined) {
  fail('a relative path holding a space did not come back at all.');
} else if (spacedRel.relPath !== 'src/a b.ts') {
  fail(`the relative path came back as "${String(spacedRel.relPath)}".`);
}
step(
  3,
  'a relative path holding a space round trips',
  `relPath="${String(spacedRel?.relPath)}"`
);

if (spacedRel !== undefined && spacedRel.repoPath !== spacedRoot) {
  fail(
    `both fields holding a space did not come back whole: repoPath="${String(spacedRel.repoPath)}".`
  );
}
step(
  4,
  'a root and a relative path both holding a space',
  `repoPath="${String(spacedRel?.repoPath)}" relPath="${String(spacedRel?.relPath)}"`
);

// ---------------------------------------------------------------------------
// Row 5. The control root
// ---------------------------------------------------------------------------

const plainTupleLines = hitsOf('plain root, empty query, tuple recents').map(lineOf);
const plainWanted = plainRecents.map(
  (one) => `local|${plainRoot.split(root).join('<corpus>')}|${one.relPath}|true`
);
if (plainTupleLines.join('\n') !== plainWanted.join('\n')) {
  fail(
    'the space free control root did not answer the rows the renderer asked ' +
      `for, in order. It answered:\n${plainTupleLines.join('\n')}`
  );
}
step(
  5,
  'the space free control root answers the same rows in the same order',
  `rows=${String(plainTupleLines.length)} first="${String(plainTupleLines[0])}"`
);

// ---------------------------------------------------------------------------
// Rows 6 and 7. The other computer
// ---------------------------------------------------------------------------

const remoteHits = hitsOf('remote root, empty query');
const remoteHit = remoteHits[0];
if (remoteHit === undefined) {
  fail('a remote root key whose path holds a space answered nothing.');
} else if (remoteHit.machineId !== 'studio' || remoteHit.repoPath !== spacedRoot) {
  fail(
    `the remote row came back as machineId=${String(remoteHit.machineId)} ` +
      `repoPath="${String(remoteHit.repoPath)}".`
  );
}
step(
  6,
  'a remote root key whose path holds a space keeps both parts',
  `machineId=${String(remoteHit?.machineId)} repoPath="${String(remoteHit?.repoPath)}" relPath="${String(remoteHit?.relPath)}"`
);

const bothLines = hitsOf('both computers, empty query').map(lineOf);
const spacedToken = spacedRoot.split(root).join('<corpus>');
const bothWanted = [
  `local|${spacedToken}|src/a b.ts|true`,
  `studio|${spacedToken}|src/a b.ts|true`
];
if (bothLines.join('\n') !== bothWanted.join('\n')) {
  fail(
    'one relative path under one absolute path on two computers was not two ' +
      `rows. It answered:\n${bothLines.join('\n')}`
  );
}
step(
  7,
  'the same relative path on two computers is two rows',
  `rows=${String(bothLines.length)} ${bothLines.join(' and ')}`
);

// ---------------------------------------------------------------------------
// Row 8. The tiebreaker
// ---------------------------------------------------------------------------

const tieCold = hitsOf('the tiebreaker, with no recents at all');
const tieWarm = hitsOf('the tiebreaker, with the second path recent');
const coldScores = tieCold.map((h) => `${String(h.relPath)}=${String(h.score)}`);
if (tieCold.length < 2) {
  fail(`the tie could not be built: the query answered ${String(tieCold.length)} rows.`);
} else if (tieCold[0].score !== tieCold[1].score) {
  fail(
    'the two tie paths did not score the same, so this row measured nothing. ' +
      `Scores: ${coldScores.join(' ')}`
  );
} else if (tieWarm[0]?.relPath !== 'src/bb/dup.ts') {
  fail(
    `the recent one of two equally scored paths was not first. First row was ` +
      `"${String(tieWarm[0]?.relPath)}".`
  );
}
step(
  8,
  'the tiebreaker still puts the recent path first on a root holding a space',
  `scores ${coldScores.join(' ')}; without recents "${String(tieCold[0]?.relPath)}" first, with them "${String(tieWarm[0]?.relPath)}" first`
);

// ---------------------------------------------------------------------------
// Rows 9 and 10. The old shape, and ordering
// ---------------------------------------------------------------------------

const plainLegacyLines = hitsOf('plain root, empty query, old string recents').map(
  lineOf
);
if (plainLegacyLines.join('\n') !== plainTupleLines.join('\n')) {
  fail(
    'the shape a renderer from before this phase sends did not answer the ' +
      `same rows. Tuples gave:\n${plainTupleLines.join('\n')}\nStrings gave:\n${plainLegacyLines.join('\n')}`
  );
}
step(
  9,
  'the shape a build before this phase sends still ranks',
  `${String(plainLegacyLines.length)} rows, byte for byte what the tuples gave`
);

const baselinePath = join(root, 'p121-baseline.json');
writeFileSync(baselinePath, JSON.stringify(plainLegacyLines, null, 2), 'utf8');
let orderEvidence = `no baseline was given, so nothing was compared across trees. This run wrote ${baselinePath}`;
if (baselineArg !== undefined) {
  const wanted = JSON.parse(readFileSync(baselineArg, 'utf8'));
  const same = JSON.stringify(wanted) === JSON.stringify(plainLegacyLines);
  if (!same) {
    fail(
      `the control root's rows differ from the baseline at ${baselineArg}.\n` +
        `Baseline:\n${wanted.join('\n')}\nNow:\n${plainLegacyLines.join('\n')}`
    );
  }
  orderEvidence = `${String(plainLegacyLines.length)} rows, ${same ? 'identical to' : 'different from'} ${baselineArg}`;
}
step(10, "the control root's ordering did not move", orderEvidence);

// ---------------------------------------------------------------------------
// Rows 11 and 12
// ---------------------------------------------------------------------------

const stampAfter = corpusStamp(root);
const changed = Object.keys(stampBefore).filter(
  (path) => stampBefore[path] !== stampAfter[path]
);
if (changed.length > 0) {
  fail(`the run changed ${String(changed.length)} corpus files: ${changed.join(', ')}`);
}
step(
  11,
  'the run wrote nothing in the corpus',
  `${String(Object.keys(stampBefore).length)} files, ${String(changed.length)} changed`
);

const sessionsAfter = operatorSessions();
if (sessionsAfter !== sessionsBefore) {
  fail(
    `the operator session count moved from ${String(sessionsBefore)} to ${String(sessionsAfter)}.`
  );
}
step(
  12,
  'the operator session count did not move',
  `${String(sessionsBefore)} before, ${String(sessionsAfter)} after`
);

// ---------------------------------------------------------------------------

if (failures.length === 0) {
  say(`every row passed. The corpus is at ${root} and nothing else was touched.`);
  process.exit(0);
}
say(`${String(failures.length)} rows failed:`);
for (const one of failures) process.stdout.write(`[p121-recents]   ${one}\n`);
process.exit(1);
