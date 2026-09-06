/**
 * `npm run conformance:derived` — the gate on the shared question every
 * harvest descriptor must answer, and on the repair that fixes the rows it was
 * never asked about (Phase 215, docs/research/81).
 *
 * WHAT IT IS FOR. Until this phase the default was refuse-nothing, and that is
 * how codex came to record a sub agent thread with `confidence: 'exact'` on a
 * conversation it cannot resume: `cannot resume an unloaded multi-agent v2
 * sub-agent through its parent`. The type makes the declaration required, so an
 * agent added without one does not compile. This gate is what makes the rest
 * checkable: that `none` is a claim with evidence attached rather than a
 * silence, that the codex predicate answers what the measurement says it
 * answers, that the walk refuses rather than truncates, that the pipeline asks
 * the question in every channel, and that the repair never empties a row.
 *
 * It takes about 3 seconds. It spawns no agent, opens no keychain, starts no
 * tmux server, launches no Electron, makes no request and reads NOTHING under
 * the person's home: every fixture is written by this file into a scratch
 * directory and deleted in a `finally`.
 *
 * THE RULES:
 *
 *  1. THE DECLARATION. Every entry in DESCRIPTORS answers. A `none` carries a
 *     `measured` sentence of real length, because a claim with no evidence is a
 *     silence with a field name on it. A `path` or a `record` carries a
 *     function, and a `record` says how many lines it needs.
 *  2. THE PREDICATE, over one fixture per shape the measurement found in the
 *     operator's 25,973 rollouts, including both narrowings and the shape that
 *     makes the typeof guard necessary.
 *  3. THE PARENT, read from the nested place as well as the top level, because
 *     115 of his 521 derived records name it only there.
 *  4. THE WALK, over one fixture per verdict, and `resolved` is null on every
 *     refusal so a caller cannot half-apply a walk that stopped.
 *  5. THE PIPELINE ASKS IT, scanned over the real source: `consider()` asks
 *     before `confirm`, `scan()` asks of a directory name, and the REMOTE rung
 *     asks the same predicate, because that rung re-implements codex's confirm
 *     by hand and a fix confined to stores.ts would leave a connected machine
 *     taking sub agents. Every scanner is proved on planted fixtures.
 *  6. THE REPAIR, driven over a fixture manifest and a fixture store: one row
 *     per verdict, no row emptied on any path, a row already naming a session
 *     byte identical, no other agent touched, and idempotent by digest.
 *  7. THE ABLATIONS. One clause removed at a time from the pure module, and
 *     every copy must turn a pinned answer red, naming the clause. A check that
 *     cannot fail is never mistaken for one that passed.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { tsxCli } from './ts-runner.mjs';

const failures = [];
const fail = (message) => failures.push(message);
const notes = [];

const DERIVED_SRC = resolve('src/main/manifest/harvest/derived.ts');
const scratch = mkdtempSync(join(tmpdir(), 'p215-gate-'));

function runProbe(script, env) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', script],
    { encoding: 'utf8', cwd: process.cwd(), env: { ...process.env, ...env } }
  );
  if (probe.status !== 0) {
    return { error: probe.stderr || 'the probe did not run', data: null };
  }
  // A probe that drives the SHIPPING repair writes the product's own log lines
  // to stdout, so the answer is the last line that is a JSON document rather
  // than the whole stream.
  const lines = probe.stdout.split('\n').filter((l) => l.startsWith('{'));
  const last = lines[lines.length - 1];
  if (last === undefined) {
    return { error: `the probe printed no JSON:\n${probe.stdout}`, data: null };
  }
  try {
    return { error: null, data: JSON.parse(last) };
  } catch {
    return { error: `the probe did not print JSON:\n${probe.stdout}`, data: null };
  }
}

// ---------------------------------------------------------------------------
// The fixtures. Written by this file, so every pinned answer below is an
// answer to bytes a person can read here.
// ---------------------------------------------------------------------------

const OWN = '01a0696a-75d1-7af1-8f22-de5903c5ebeb';
const PARENT = '01a06966-7253-7a72-afc1-ae84664a7cd5';

const meta = (payload) => ({ type: 'session_meta', payload });

/**
 * One record per shape in research 81 §1, with the population each stands for.
 * The pinned answer is what the shipping predicate must say about it.
 */
const RECORDS = {
  // 25,452 records. `source` is a plain STRING here, which is why the typeof
  // guard is required rather than defensive.
  'modern session (...)': {
    record: meta({ id: PARENT, session_id: PARENT, cwd: '/w', thread_source: 'user', source: 'cli' }),
    derived: false,
    parent: null
  },
  // 404 records.
  'modern sub agent (123)': {
    record: meta({
      id: OWN,
      session_id: PARENT,
      parent_thread_id: PARENT,
      forked_from_id: PARENT,
      cwd: '/w',
      thread_source: 'subagent',
      agent_nickname: 'Hegel',
      source: { subagent: { thread_spawn: { parent_thread_id: PARENT, depth: 1 } } }
    }),
    derived: true,
    parent: PARENT
  },
  // 68 records from 0.116.0 to 0.128.0: no thread_source column and no top
  // level parent, so T1 and T3 both miss it and the parent is nested only.
  'pre-column sub agent (.2.)': {
    record: meta({
      id: OWN,
      cwd: '/w',
      cli_version: '0.128.0',
      source: { subagent: { thread_spawn: { parent_thread_id: PARENT, depth: 1 } } }
    }),
    derived: true,
    parent: PARENT
  },
  // 49 records: thread_source present, parent nested only.
  'middle build sub agent (12.)': {
    record: meta({
      id: OWN,
      thread_source: 'subagent',
      cwd: '/w',
      source: { subagent: { thread_spawn: { parent_thread_id: PARENT } } }
    }),
    derived: true,
    parent: PARENT
  },
  // The 2 records of 0.125.0-alpha.3: derived, and no parent anywhere. The
  // LEFT ALONE case, and the only one in his store.
  'alpha sub agent with no parent': {
    record: meta({ id: OWN, cwd: '/w', cli_version: '0.125.0-alpha.3', source: { subagent: {} } }),
    derived: true,
    parent: null
  },
  'legacy session, none of the fields': {
    record: meta({ id: PARENT, cwd: '/w', cli_version: '0.90.0' }),
    derived: false,
    parent: null
  },
  // THE NARROWING. A deliberate fork of a resumable thread carries a parent
  // and is a session. Refusing it costs a conversation that never arms.
  'a fork that says thread_source user': {
    record: meta({ id: OWN, parent_thread_id: PARENT, forked_from_id: PARENT, thread_source: 'user', source: 'cli' }),
    derived: false,
    parent: PARENT
  },
  // THE SAME NARROWING for the nickname, because codex has custom agents.
  "a person's own named agent thread": {
    record: meta({ id: OWN, thread_source: 'user', agent_nickname: 'Hegel' }),
    derived: false,
    parent: null
  },
  // T1's own witness. His store holds no record that is derived by the column
  // ALONE, so this fixture is the shape a later codex could write if it kept
  // the column and dropped the rest, which is exactly what asking four tests
  // together is for.
  'thread_source alone, with nothing else': {
    record: meta({ id: OWN, cwd: '/w', thread_source: 'subagent' }),
    derived: true,
    parent: null
  },
  // 519 of his 521 derived records carry it, 0 of the 25,452 sessions do.
  'a nickname with no thread_source': {
    record: meta({ id: OWN, agent_nickname: 'Hegel' }),
    derived: true,
    parent: null
  },
  'an empty nickname is not a nickname': {
    record: meta({ id: OWN, agent_nickname: '' }),
    derived: false,
    parent: null
  },
  'a parent equal to its own id in another case': {
    record: meta({ id: OWN, parent_thread_id: OWN.toUpperCase() }),
    derived: false,
    parent: OWN.toUpperCase()
  },
  'the flat shape with no payload wrapper': {
    record: { id: OWN, parent_thread_id: PARENT, cwd: '/w' },
    derived: true,
    parent: PARENT
  },
  // A record whose `source` is an ARRAY, which is neither a string nor the
  // object shape, and must not be read as one.
  'a source that is an array': {
    record: meta({ id: OWN, thread_source: 'user', source: ['subagent'] }),
    derived: false,
    parent: null
  },
  'the parent in BOTH places, agreeing': {
    record: meta({
      id: OWN,
      thread_source: 'subagent',
      parent_thread_id: PARENT,
      source: { subagent: { thread_spawn: { parent_thread_id: PARENT } } }
    }),
    derived: true,
    parent: PARENT
  }
};

/** One chain per verdict the walk can reach. */
const A = 'aaaaaaaa-1111-4111-8111-111111111111';
const B = 'bbbbbbbb-2222-4222-8222-222222222222';
const C = 'cccccccc-3333-4333-8333-333333333333';
const node = (kind, parent = null) => ({ kind, parent });
const chain = (start, nodes, maxHops) => ({
  start,
  nodes,
  ...(maxHops !== undefined ? { maxHops } : {})
});
const deepNodes = () => {
  const nodes = {};
  const ids = Array.from(
    { length: 11 },
    (_, i) => `dddddddd-${String(i).padStart(4, '0')}-4444-8444-444444444444`
  );
  for (let i = 0; i < 10; i += 1) nodes[ids[i]] = node('derived', ids[i + 1]);
  nodes[ids[10]] = node('session');
  return { nodes, first: ids[0] };
};
const deep = deepNodes();

const CHAINS = {
  'one hop': {
    chain: chain(A, { [A]: node('derived', B), [B]: node('session') }),
    expect: { verdict: 'repaired', resolved: B, hops: 1 }
  },
  'three hops': {
    chain: chain(A, {
      [A]: node('derived', B),
      [B]: node('derived', C),
      [C]: node('derived', PARENT),
      [PARENT]: node('session')
    }),
    expect: { verdict: 'repaired', resolved: PARENT, hops: 3 }
  },
  'already a session': {
    chain: chain(A, { [A]: node('session') }),
    expect: { verdict: 'already-a-session', resolved: null, hops: 0 }
  },
  'a start with no record at all': {
    chain: chain(A, {}),
    expect: { verdict: 'absent', resolved: null, hops: 0 }
  },
  'a start nobody can classify': {
    chain: chain(A, { [A]: node('unknown') }),
    expect: { verdict: 'cannot-tell', resolved: null, hops: 0 }
  },
  'derived and names no parent': {
    chain: chain(A, { [A]: node('derived', null) }),
    expect: { verdict: 'no-parent-named', resolved: null, hops: 0 }
  },
  'a parent that is not on disk': {
    chain: chain(A, { [A]: node('derived', B) }),
    expect: { verdict: 'parent-missing', resolved: null, hops: 1 }
  },
  'a parent nobody can classify': {
    chain: chain(A, { [A]: node('derived', B), [B]: node('unknown') }),
    expect: { verdict: 'cannot-tell', resolved: null, hops: 1 }
  },
  'a two record cycle': {
    chain: chain(A, { [A]: node('derived', B), [B]: node('derived', A) }),
    expect: { verdict: 'cycle', resolved: null, hops: 1 }
  },
  'a self reference': {
    chain: chain(A, { [A]: node('derived', A) }),
    expect: { verdict: 'cycle', resolved: null, hops: 0 }
  },
  // The START is spelled in another case, which is what makes the case fold on
  // the visited set load bearing rather than decorative.
  'a cycle whose start is spelled in another case': {
    chain: chain(A.toUpperCase(), {
      [A]: node('derived', B),
      [B]: node('derived', A)
    }),
    expect: { verdict: 'cycle', resolved: null, hops: 1 }
  },
  'deeper than the bound, and it REFUSES rather than truncates': {
    chain: chain(deep.first, deep.nodes),
    expect: { verdict: 'over-bound', resolved: null, hops: 9 }
  },
  'a bound of two refuses a three hop chain': {
    chain: chain(
      A,
      {
        [A]: node('derived', B),
        [B]: node('derived', C),
        [C]: node('derived', PARENT),
        [PARENT]: node('session')
      },
      2
    ),
    expect: { verdict: 'over-bound', resolved: null, hops: 3 }
  }
};

const MUSE_ROOT = '/home/.local/share/muse/sessions';
const PATHS = {
  'muse refuses a subagent segment': {
    spec: { agent: 'muse', roots: [MUSE_ROOT], path: `${MUSE_ROOT}/2026/09/03/subagent/x/session.jsonl` },
    expect: true
  },
  'muse accepts an ordinary session': {
    spec: { agent: 'muse', roots: [MUSE_ROOT], path: `${MUSE_ROOT}/2026/09/03/${A}/session.jsonl` },
    expect: false
  },
  'a path outside every root is not this store': {
    spec: { agent: 'muse', roots: [MUSE_ROOT], path: '/elsewhere/subagent/session.jsonl' },
    expect: false
  },
  'codex answers no path at all': {
    spec: { agent: 'codex', roots: ['/h/.codex/sessions'], path: '/h/.codex/sessions/subagent/r.jsonl' },
    expect: false
  }
};

// ---------------------------------------------------------------------------
// The ablations. One clause each, applied to the pure module.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  ['T1, thread_source subagent', "if (threadSource === 'subagent') return true;", ''],
  [
    'T2, the source.subagent object',
    "(source as Record<string, unknown>)['subagent'] !== undefined",
    'false'
  ],
  [
    'T3, a parent that differs from the id',
    'if (parent !== null && own !== null && parent.toLowerCase() !== own.toLowerCase()) {\n    return true;\n  }',
    ''
  ],
  ['T4, the top level nickname', "if (str(payload['agent_nickname']) !== null) return true;", ''],
  [
    'the narrowing, so a fork is refused',
    "if (threadSource === 'user') return false;",
    ''
  ],
  [
    'the nested parent read, which 115 of his 521 need',
    "return str((spawn as Record<string, unknown>)['parent_thread_id']);",
    'return null;'
  ],
  [
    'the case fold on the visited set',
    'const visited = new Set<string>([start.toLowerCase()]);',
    'const visited = new Set<string>([start]);'
  ],
  [
    'the cycle check, so a loop runs to the bound',
    'if (visited.has(parent.toLowerCase())) return stop(\'cycle\', hops);',
    ''
  ],
  ['the bound', 'if (hops > maxHops) return stop(\'over-bound\', hops);', ''],
  [
    'the bound made a truncation instead of a refusal',
    "if (hops > maxHops) return stop('over-bound', hops);",
    "if (hops > maxHops) return { verdict: 'over-bound', resolved: cursor, hops };"
  ],
  [
    'the parent-must-exist check',
    "if (step === 'absent') return stop('parent-missing', hops);",
    ''
  ],
  [
    'the refusal that a parent nobody can classify stops the walk',
    "if (step === 'unknown') return stop('cannot-tell', hops);",
    ''
  ],
  [
    'the early return for a start that is already a session',
    "if (first === 'session') return stop('already-a-session', 0);",
    ''
  ],
  ['the bound constant, 8 to 2', 'export const MAX_PARENT_HOPS = 8;', 'export const MAX_PARENT_HOPS = 2;']
];

// ---------------------------------------------------------------------------

function main() {
  const fixturePath = join(scratch, 'fixtures.json');
  writeFileSync(
    fixturePath,
    JSON.stringify({
      records: Object.fromEntries(
        Object.entries(RECORDS).map(([name, f]) => [name, f.record])
      ),
      chains: Object.fromEntries(
        Object.entries(CHAINS).map(([name, f]) => [name, f.chain])
      ),
      paths: Object.fromEntries(
        Object.entries(PATHS).map(([name, f]) => [name, f.spec])
      )
    })
  );

  const shipping = runProbe('build/derived-conformance-probe.mts', {
    P215_FIXTURES: fixturePath
  });
  if (shipping.error !== null) {
    fail(`the predicate probe did not run: ${shipping.error}`);
    return finish();
  }
  const data = shipping.data;

  checkDeclaration(data);
  const pinned = checkAnswers(data, 'the shipping module');
  checkScanners();
  checkRepair();
  checkAblations(fixturePath, pinned);
  finish();
}

/** Rule 1. */
function checkDeclaration(data) {
  for (const row of data.descriptors) {
    if (!row.answered) {
      fail(
        `${row.agent}: the descriptor does not answer derivedStream. Every ` +
          'harvest descriptor must say how a derived stream is told from a ' +
          'resumable session, and `none` is one of the answers.'
      );
      continue;
    }
    for (const problem of declarationProblems(row)) fail(problem);
  }
  const answered = data.descriptors.filter((r) => r.answered).length;
  notes.push(
    `rule 1: ${answered} of ${data.descriptors.length} descriptors answer, ` +
      `${data.descriptors.filter((r) => r.kind === 'none').length} of them 'none'.`
  );
  // The checker is proved on rows it cannot have been written around.
  const planted = [
    { agent: 'x', answered: true, kind: 'none', measured: 'too short', lines: 0, hasTest: null },
    { agent: 'y', answered: true, kind: 'record', measured: 'a'.repeat(60), lines: 0, hasTest: true },
    { agent: 'z', answered: true, kind: 'path', measured: 'a'.repeat(60), lines: 0, hasTest: false },
    { agent: 'w', answered: true, kind: 'nonsense', measured: 'a'.repeat(60), lines: 1, hasTest: true }
  ];
  for (const row of planted) {
    if (declarationProblems(row).length === 0) {
      fail(
        `rule 1's own checker passed a planted descriptor (${row.agent}) that ` +
          'should have failed it, so the rule cannot fail and proves nothing.'
      );
    }
  }
  const good = {
    agent: 'ok',
    answered: true,
    kind: 'none',
    measured: 'a'.repeat(60),
    lines: 0,
    hasTest: null
  };
  if (declarationProblems(good).length > 0) {
    fail("rule 1's own checker failed a well formed descriptor.");
  }
}

function declarationProblems(row) {
  const out = [];
  if (!['none', 'path', 'record'].includes(row.kind)) {
    out.push(`${row.agent}: derivedStream.kind is ${JSON.stringify(row.kind)}.`);
    return out;
  }
  // A `none` is a CLAIM. 40 characters is not a style rule: it is the
  // difference between "none" and a sentence saying how the store was looked
  // at, and the whole point is that a person writes it deliberately.
  if (typeof row.measured !== 'string' || row.measured.trim().length < 40) {
    out.push(
      `${row.agent}: derivedStream.measured is missing or too short to be a ` +
        'claim. Say how the store was searched and what was found.'
    );
  }
  if (row.kind !== 'none' && row.hasTest !== true) {
    out.push(`${row.agent}: a '${row.kind}' rule carries no test function.`);
  }
  if (row.kind === 'record' && !(row.lines >= 1)) {
    out.push(`${row.agent}: a 'record' rule must say how many lines it needs.`);
  }
  return out;
}

/** Rules 2 to 4. Returns the pinned answers, for the ablation comparison. */
function checkAnswers(data, who) {
  const pinned = { predicate: {}, parent: {}, walk: {}, pathForm: {}, maxHops: data.maxHops };
  let bad = 0;
  for (const [name, f] of Object.entries(RECORDS)) {
    pinned.predicate[name] = data.predicate[name];
    if (data.predicate[name] !== f.derived) {
      bad += 1;
      fail(
        `rule 2 (${who}): "${name}" reads ` +
          `${data.predicate[name] ? 'derived' : 'a session'} and the ` +
          `measurement says ${f.derived ? 'derived' : 'a session'}.`
      );
    }
    pinned.parent[name] = data.parent[name];
    if ((data.parent[name] ?? null) !== f.parent) {
      bad += 1;
      fail(
        `rule 3 (${who}): "${name}" names parent ` +
          `${JSON.stringify(data.parent[name])} and the fixture says ` +
          `${JSON.stringify(f.parent)}.`
      );
    }
  }
  for (const [name, f] of Object.entries(CHAINS)) {
    pinned.walk[name] = data.walk[name];
    const got = data.walk[name] ?? {};
    if (
      got.verdict !== f.expect.verdict ||
      (got.resolved ?? null) !== f.expect.resolved ||
      got.hops !== f.expect.hops
    ) {
      bad += 1;
      fail(
        `rule 4 (${who}): "${name}" walked to ${JSON.stringify(got)} and the ` +
          `fixture says ${JSON.stringify(f.expect)}.`
      );
    }
  }
  for (const [name, f] of Object.entries(PATHS)) {
    pinned.pathForm[name] = data.pathForm[name];
    if (data.pathForm[name] !== f.expect) {
      bad += 1;
      fail(`rule 4 (${who}): the path form "${name}" answered ${String(data.pathForm[name])}.`);
    }
  }
  if (data.maxHops !== 8) {
    fail(`rule 4: MAX_PARENT_HOPS is ${data.maxHops} and the measurement says 8.`);
  }
  if (bad === 0 && who === 'the shipping module') {
    notes.push(
      `rules 2 to 4: ${Object.keys(RECORDS).length} record shapes, ` +
        `${Object.keys(CHAINS).length} chains and ${Object.keys(PATHS).length} ` +
        'path forms all read as the measurement says.'
    );
  }
  return pinned;
}

/** Rule 5, scanned over the real source and proved on planted fixtures. */
function checkScanners() {
  const scans = [
    {
      what: 'consider() asks the question before confirm',
      file: 'src/main/manifest/harvest/watch.ts',
      test: asksBeforeConfirm
    },
    {
      what: 'scan() asks the question of a directory name',
      file: 'src/main/manifest/harvest/watch.ts',
      test: (source) => /directoryIsDerivedStream\(/.test(source)
    },
    {
      what: "the remote rung asks the SAME predicate in its codex arm",
      file: 'src/main/manifest/harvest/remote.ts',
      test: remoteCodexArmAsks
    },
    {
      what: "codex's own confirm refuses a derived record",
      file: 'src/main/manifest/harvest/stores.ts',
      test: (source) => /if \(codexDerivedRecord\(\[first\]\)\) return 'mismatch';/.test(source)
    }
  ];
  for (const scan of scans) {
    const source = readFileSync(resolve(scan.file), 'utf8');
    if (!scan.test(source)) {
      fail(
        `rule 5: ${scan.what} — not found in ${scan.file}. Without it a ` +
          'derived record reaches a key, or a connected machine takes a sub ' +
          'agent this Mac would refuse.'
      );
    }
  }
  // The scanners are proved on files this gate writes, so a scan that cannot
  // fail is never mistaken for a scan that passed.
  const plants = [
    ['a consider that asks AFTER confirm', asksBeforeConfirm, false,
      'const consider = async () => {\n  cand.verdict = await d.confirm(path, ctx);\n  if (await candidateIsDerivedStream(d, roots, path)) return;\n};'],
    ['a consider that never asks', asksBeforeConfirm, false,
      'const consider = async () => {\n  cand.verdict = await d.confirm(path, ctx);\n};'],
    ['a consider that asks first', asksBeforeConfirm, true,
      'const consider = async () => {\n  if (await candidateIsDerivedStream(d, roots, path)) return;\n  cand.verdict = await d.confirm(path, ctx);\n};'],
    ['a remote codex arm that does not ask', remoteCodexArmAsks, false,
      "switch (agent) {\n  case 'codex': {\n    const first = firstJsonLine(head);\n    return 'match';\n  }\n  case 'muse': {\n    if (codexDerivedRecord([first])) return 'mismatch';\n    return 'unknown';\n  }\n}"],
    ['a remote codex arm that asks', remoteCodexArmAsks, true,
      "switch (agent) {\n  case 'codex': {\n    const first = firstJsonLine(head);\n    if (codexDerivedRecord([first])) return 'mismatch';\n    return 'match';\n  }\n}"]
  ];
  for (const [name, test, want, body] of plants) {
    if (test(body) !== want) {
      fail(
        `rule 5's own scanner read the planted fixture "${name}" as ` +
          `${String(!want)}, so it is not reading what it claims to read.`
      );
    }
  }
  notes.push(`rule 5: 4 call sites found, ${plants.length} planted fixtures behaved.`);
}

/** TRUE when the question is asked, and asked before `confirm` is called. */
function asksBeforeConfirm(source) {
  const ask = source.indexOf('candidateIsDerivedStream(');
  const confirm = source.indexOf('await d.confirm(');
  return ask !== -1 && confirm !== -1 && ask < confirm;
}

/** TRUE when the codex arm of the remote confirm asks the shared predicate. */
function remoteCodexArmAsks(source) {
  const arm = source.indexOf("case 'codex':");
  if (arm === -1) return false;
  const next = source.indexOf('case ', arm + 10);
  const body = source.slice(arm, next === -1 ? source.length : next);
  return /codexDerivedRecord\(/.test(body);
}

/** Rule 6. */
function checkRepair() {
  const dir = join(scratch, 'repair');
  mkdirSync(dir, { recursive: true });
  const run = runProbe('build/derived-repair-probe.mts', { P215_SCRATCH: dir });
  if (run.error !== null) {
    fail(`rule 6: the repair probe did not run: ${run.error}`);
    return;
  }
  const { ids, first, second, rows, digests } = run.data;
  const verdict = (id) => first.find((o) => o.sessionId === id)?.verdict ?? 'no-outcome';
  const row = (id) => rows.find((r) => r.id === id);

  const expected = {
    'row-sub': 'repaired',
    'row-real': 'already-a-session',
    'row-orphan': 'parent-missing',
    'row-noparent': 'no-parent-named',
    'row-cycle': 'cycle',
    'row-deep': 'repaired',
    'row-gone': 'rollout-missing',
    'row-empty': 'no-outcome',
    'row-other': 'no-outcome'
  };
  for (const [id, want] of Object.entries(expected)) {
    if (verdict(id) !== want) {
      fail(`rule 6: ${id} read "${verdict(id)}" and the fixture says "${want}".`);
    }
  }

  // NO ROW IS EVER EMPTIED, on any path. This is the rule the phase is judged
  // on, so it is asked of EVERY row rather than of the ones that moved.
  for (const r of rows) {
    if (r.id === 'row-empty') continue;
    if (r.agentSessionId === null || r.agentSessionId === '') {
      fail(
        `rule 6: ${r.id} came out of the repair with NO conversation id. No ` +
          'row is ever emptied, on any path.'
      );
    }
  }
  // A row already naming a real session is byte identical.
  if (row('row-real')?.agentSessionId !== ids.REAL) {
    fail('rule 6: a row already naming a real session was rewritten.');
  }
  if (row('row-real')?.provenance !== null) {
    fail('rule 6: a row already naming a real session gained a provenance note.');
  }
  // Every left-alone row keeps exactly the id it had.
  for (const [id, before] of [
    ['row-orphan', ids.ORPHAN],
    ['row-noparent', ids.NOPARENT],
    ['row-cycle', ids.CYCLE_A],
    ['row-gone', ids.GONE]
  ]) {
    if (row(id)?.agentSessionId !== before) {
      fail(`rule 6: ${id} was left alone and its id moved anyway.`);
    }
  }
  // No other agent is touched.
  if (row('row-other')?.agentSessionId !== ids.SUB) {
    fail('rule 6: a non-codex row was repaired. Only codex rows may move.');
  }
  // The repaired rows say what they are, and they say 'weak'.
  const repaired = row('row-sub');
  if (repaired?.agentSessionId !== ids.PARENT) {
    fail('rule 6: the sub agent row did not move to its parent.');
  }
  if (repaired?.provenance?.repairedFrom !== ids.SUB) {
    fail('rule 6: a repaired row does not record where its id moved from.');
  }
  if (repaired?.provenance?.confidence !== 'weak') {
    fail(
      `rule 6: a repaired row records confidence ` +
        `${JSON.stringify(repaired?.provenance?.confidence)}. The new id ` +
        'inherits the evidence the old one had, being a folder and a time.'
    );
  }
  if (!(repaired?.resumeArgv ?? []).includes(ids.PARENT)) {
    fail('rule 6: a repaired row keeps a resume argv that names the old id.');
  }
  if ((repaired?.resumeArgv ?? []).includes(ids.SUB)) {
    fail('rule 6: a repaired row still names the sub agent in its resume argv.');
  }
  if ((repaired?.resumeArgv ?? []).at(-1) !== '--flag') {
    fail('rule 6: a repaired row lost the launch extras resume does not restore.');
  }
  // The two hop chain really walked two.
  if (first.find((o) => o.sessionId === 'row-deep')?.hops !== 2) {
    fail('rule 6: the two hop chain did not report two hops.');
  }
  // IDEMPOTENT.
  if (digests.afterFirst !== digests.afterSecond) {
    fail('rule 6: a second pass changed the manifest, so the repair is not idempotent.');
  }
  if (second.some((o) => o.verdict === 'repaired')) {
    fail('rule 6: a second pass moved a row.');
  }
  if (digests.before === digests.afterFirst) {
    fail('rule 6: the first pass changed nothing, so this rule proves nothing.');
  }
  notes.push(
    `rule 6: ${Object.keys(expected).length} row shapes, ` +
      `${first.filter((o) => o.verdict === 'repaired').length} repaired, ` +
      `${second.filter((o) => o.verdict === 'repaired').length} on the second pass, ` +
      'no row emptied.'
  );
}

/** Rule 7. */
function checkAblations(fixturePath, pinned) {
  const source = readFileSync(DERIVED_SRC, 'utf8');
  let red = 0;
  for (const [index, [what, from, to]] of ABLATIONS.entries()) {
    if (!source.includes(from)) {
      fail(
        `rule 7: the ablation "${what}" no longer matches the source, so it ` +
          'is not testing anything. Update it in the same commit as the code.'
      );
      continue;
    }
    const dir = join(scratch, `ablate-${index}`);
    mkdirSync(dir, { recursive: true });
    const copy = join(dir, 'derived.ts');
    writeFileSync(copy, source.replace(from, to));
    const run = runProbe('build/derived-conformance-probe.mts', {
      P215_FIXTURES: fixturePath,
      P215_DERIVED: copy
    });
    if (run.error !== null) {
      // A copy that cannot even load turns every pin red for the wrong reason
      // and proves nothing about the clause.
      fail(`rule 7: the ablation "${what}" did not load: ${run.error}`);
      continue;
    }
    if (differs(run.data, pinned)) {
      red += 1;
    } else {
      fail(
        `rule 7: removing "${what}" changed NO pinned answer. Either the ` +
          'clause does nothing, or no fixture reaches it.'
      );
    }
  }
  notes.push(`rule 7: ${red} of ${ABLATIONS.length} ablations went red, one clause each.`);
}

function differs(data, pinned) {
  if (data.maxHops !== pinned.maxHops) return true;
  for (const key of ['predicate', 'parent', 'pathForm']) {
    for (const name of Object.keys(pinned[key])) {
      if ((data[key][name] ?? null) !== (pinned[key][name] ?? null)) return true;
    }
  }
  for (const name of Object.keys(pinned.walk)) {
    if (JSON.stringify(data.walk[name]) !== JSON.stringify(pinned.walk[name])) {
      return true;
    }
  }
  return false;
}

function finish() {
  for (const note of notes) process.stdout.write(`  ${note}\n`);
  if (failures.length > 0) {
    process.stdout.write(`\nFAIL, ${failures.length}:\n`);
    for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
    process.exit(1);
  }
  process.stdout.write(
    '\nPASS. Every harvest descriptor says how a derived stream is told from a ' +
      'resumable session, the codex predicate answers what the measurement ' +
      'says over every shape in his store, the walk refuses rather than ' +
      'truncates, all four call sites ask the question, and the repair moves ' +
      'the rows it can prove and empties none.\n'
  );
}

// The scratch directory is removed whatever happened, which is the same rule
// every probe under build/ follows for a process it starts.
try {
  main();
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
