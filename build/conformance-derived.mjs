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
 *  8. THE REMOTE ARM'S REACH, which the phase asserted and this fix round
 *     measured. The refusal is correct AND, at the shipped head budget, it is
 *     unreachable over real records: a codex `session_meta` line is bigger
 *     than the 8,192 bytes that rung is handed. The rule reads the budget out
 *     of the live half, drives the shipping arm at sizes on both sides of it,
 *     and proves the property that makes the gap cost nothing, being that only
 *     a `match` may ever win a remote harvest.
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
  const headBytes = shippedRemoteHeadBytes();
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
      ),
      remote: remoteFixture(headBytes)
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
  checkRemoteReach(data, headBytes);
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
  const noneCount = data.descriptors.filter((r) => r.kind === 'none').length;
  notes.push(
    `rule 1: ${answered} of ${data.descriptors.length} descriptors answer, ` +
      `${noneCount} of them 'none'.`
  );
  checkNoneCountProse(noneCount);
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

/**
 * Rule 1b, and it is a fix round's arm rather than a nicety.
 *
 * Three shipped comments said "the six agents that answer `none`" while this
 * gate printed five in the same breath, so the code disagreed with its own
 * gate. A count written by hand decays the day a descriptor's answer moves,
 * and there is no reason for the prose to be the only place that is not
 * derived. So the number is COUNTED from `DESCRIPTORS` and every place that
 * states it in the shape below has to state the counted one.
 *
 * The phrase is deliberately one literal form, `the <word> descriptors that
 * answer \`none\``, so a new site is either written in it and checked or is
 * not making the claim at all.
 */
function checkNoneCountProse(noneCount) {
  const files = [
    'src/main/manifest/harvest/watch.ts',
    'src/main/manifest/harvest/derived.ts',
    'src/main/manifest/harvest/stores.ts'
  ];
  const want = WORD_NUMBERS[noneCount] ?? String(noneCount);
  let sites = 0;
  for (const file of files) {
    const found = noneCountClaims(readFileSync(resolve(file), 'utf8'));
    if (found.length === 0) {
      fail(
        `rule 1: ${file} no longer states how many descriptors answer ` +
          "`none` in the checked form, so the count in it is unchecked. " +
          `Write it as "the ${want} descriptors that answer \`none\`".`
      );
      continue;
    }
    for (const said of found) {
      sites += 1;
      if (said.toLowerCase() !== want) {
        fail(
          `rule 1: ${file} says "the ${said} descriptors that answer ` +
            `\`none\`" and ${noneCount} of them actually do, being ` +
            `"${want}". The count is counted from DESCRIPTORS, so the prose ` +
            'moves when an answer moves.'
        );
      }
    }
  }
  // The scanner is proved on text this gate writes, so a scan that cannot fail
  // is never mistaken for a scan that passed.
  const plants = [
    ['a comment stating the wrong count', 'the six descriptors that answer `none`', ['six']],
    ['a comment stating the right count', 'the five descriptors that answer `none`', ['five']],
    ['a comment making no claim', 'five descriptors answer, and some do not', []],
    ['two claims in one file', 'the five descriptors that answer `none` and\nthe two descriptors that answer `none`', ['five', 'two']]
  ];
  for (const [name, text, want2] of plants) {
    const got = noneCountClaims(text);
    if (JSON.stringify(got) !== JSON.stringify(want2)) {
      fail(
        `rule 1's own scanner read the planted text "${name}" as ` +
          `${JSON.stringify(got)} rather than ${JSON.stringify(want2)}, so it ` +
          'is not reading what it claims to read.'
      );
    }
  }
  notes.push(
    `rule 1: ${sites} prose sites state the 'none' count and all say ${want}.`
  );
}

const WORD_NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
];

/** Every count this text claims answers `none`, in the one checked form. */
function noneCountClaims(text) {
  const out = [];
  const re = /\bthe ([A-Za-z]+) descriptors that answer `none`/gi;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
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
  // COUNTED, not recited. This note used to print "4 call sites found" as a
  // hardcoded string computed from nothing, and it printed it in the same
  // breath as naming two call sites it had just failed to find. A gate that
  // prints a count it did not count is the shape the known-hosts paragraph in
  // CLAUDE.md exists to forbid, so the number below is the number of scans
  // that actually answered.
  let found = 0;
  for (const scan of scans) {
    const source = readFileSync(resolve(scan.file), 'utf8');
    if (scan.test(source)) {
      found += 1;
      continue;
    }
    fail(
      `rule 5: ${scan.what} — not found in ${scan.file}. Without it a ` +
        'derived record reaches a key, or a connected machine takes a sub ' +
        'agent this Mac would refuse.'
    );
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
  callSites.found = found;
  callSites.of = scans.length;
  notes.push(
    `rule 5: ${found} of ${scans.length} call sites found, ` +
      `${plants.length} planted fixtures behaved.`
  );
}

/** What rule 5 counted, so the closing sentence states it rather than guesses. */
const callSites = { found: 0, of: 0 };

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

// ---------------------------------------------------------------------------
// Rule 8. What the remote refusal is worth, said rather than assumed.
// ---------------------------------------------------------------------------

/**
 * What was measured over the operator's own store on 2026-09-06, read only.
 *
 * A codex `session_meta` line is BIG, and that is the whole of rule 8. The
 * remote rung is handed a bounded head rather than a file, so a refusal that
 * lives on line 1 is only reachable when line 1 fits in the head.
 */
const HIS_STORE = {
  rollouts: 25_976,
  sessions: 25_453,
  derived: 523,
  /** Bytes of line 1, smallest and largest, over the 523 derived rollouts. */
  derivedLine1: [13_798, 22_298],
  /** The largest line 1 anywhere in the store. */
  largestLine1: 34_526,
  /** Session records whose line 1 fits inside 8,192 bytes. */
  sessionsInside8k: 171
};

/**
 * The head budget the LIVE half really sends, read out of its own source.
 *
 * It is scanned rather than imported because `../machines/remote-harvest.ts`
 * is the live half: importing it would pull in the control plane, the ssh
 * runner and Electron, and this gate launches none of those. A budget that
 * cannot be read is a failure naming the constant, not a default.
 */
function shippedRemoteHeadBytes() {
  const file = 'src/main/machines/remote-harvest.ts';
  const source = readFileSync(resolve(file), 'utf8');
  const found = readHeadBytes(source);
  if (found === null) {
    fail(
      `rule 8: REMOTE_HARVEST_HEAD_BYTES could not be read out of ${file}, ` +
        'so what the remote refusal is worth is unknown rather than measured.'
    );
    return 0;
  }
  return found;
}

/** The head budget a source declares, or null. Underscores are separators. */
function readHeadBytes(source) {
  const m = /export const REMOTE_HARVEST_HEAD_BYTES\s*=\s*([0-9_]+)/.exec(source);
  if (m === null) return null;
  const value = Number(m[1].replace(/_/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

const CWD = '/Users/gdc/runstory';
const OTHER_CWD = '/Users/gdc/rookery';

/** A `session_meta` of each kind, to be padded to an exact byte length. */
const remoteRecord = (derivedRecord, cwd) =>
  derivedRecord
    ? meta({
        id: OWN,
        session_id: PARENT,
        parent_thread_id: PARENT,
        cwd,
        thread_source: 'subagent',
        source: { subagent: { thread_spawn: { parent_thread_id: PARENT, depth: 1 } } }
      })
    : meta({ id: PARENT, session_id: PARENT, cwd, thread_source: 'user', source: 'cli' });

/**
 * The cases, and the two sizes on either side of the budget are computed from
 * the budget rather than written down, so this rule keeps saying the truth
 * whatever a later round sets the budget to.
 */
function remoteCases(headBytes) {
  return {
    'a sub agent one byte inside the budget': {
      derived: true, cwd: CWD, bytes: Math.max(headBytes - 1, 400)
    },
    'a sub agent one byte past the budget': {
      derived: true, cwd: CWD, bytes: headBytes + 1
    },
    'a sub agent the size of the SMALLEST in his store': {
      derived: true, cwd: CWD, bytes: HIS_STORE.derivedLine1[0]
    },
    'a sub agent the size of the LARGEST in his store': {
      derived: true, cwd: CWD, bytes: HIS_STORE.derivedLine1[1]
    },
    'a session in this folder, inside the budget': {
      derived: false, cwd: CWD, bytes: Math.max(headBytes - 1, 400)
    },
    'a session in another folder, inside the budget': {
      derived: false, cwd: OTHER_CWD, bytes: Math.max(headBytes - 1, 400)
    },
    'a session the size of the LARGEST line 1 in his store': {
      derived: false, cwd: CWD, bytes: HIS_STORE.largestLine1
    }
  };
}

function remoteFixture(headBytes) {
  const cases = {};
  for (const [name, spec] of Object.entries(remoteCases(headBytes))) {
    cases[name] = { record: remoteRecord(spec.derived, spec.cwd), bytes: spec.bytes };
  }
  return { headBytes, sessionCwd: CWD, cases };
}

/**
 * Rule 8, and it is a fix round's rule rather than the phase's.
 *
 * The phase said the remote arm was "the finding a fix confined to stores.ts
 * would have missed" and that it stops a connected machine taking sub agents
 * exactly as this Mac did. The predicate IS correct, and over his own store
 * that sentence was still not true: at the shipped 8,192 byte budget every one
 * of his 523 derived rollouts answers `unknown` rather than `mismatch`,
 * because the SHORTEST derived line 1 is 13,798 bytes and `firstJsonLine`
 * refuses a truncated line. Handed the whole line the same arm answers
 * `mismatch`.
 *
 * That costs no row, and the third arm below is why: `decideRemoteHarvest`
 * accepts a verdict of exactly `match`, so an `unknown` has never produced a
 * claim, at the parent commit or here. So this rule does not force a budget.
 * It states which side of the line the shipped budget is on, fails if a
 * derived record ever answers `match` at any size, and fails if an `unknown`
 * or a `mismatch` ever wins.
 */
function checkRemoteReach(data, headBytes) {
  const remote = data.remote;
  if (remote === undefined || headBytes === 0) {
    fail('rule 8: the probe did not answer for the remote arm.');
    return;
  }
  if (remote.headBytes !== headBytes) {
    fail(
      `rule 8: the probe was driven at ${remote.headBytes} bytes and the live ` +
        `half sends ${headBytes}.`
    );
  }
  const specs = remoteCases(headBytes);
  let reachable = 0;
  // Counted, so the note below cannot say "no sub agent answered match" in the
  // same breath as failing because one did. That is the shape of the hardcoded
  // count this same fix round took out of rule 5.
  let calledMatch = 0;
  for (const [name, spec] of Object.entries(specs)) {
    const got = remote.cases[name];
    if (got === undefined) {
      fail(`rule 8: the probe said nothing about "${name}".`);
      continue;
    }
    // At full length the answer is the predicate's: a derived record is
    // refused whatever folder it names, and a session is judged on its folder.
    const wantFull = spec.derived ? 'mismatch' : spec.cwd === CWD ? 'match' : 'mismatch';
    // At the head budget a line that does not FIT cannot be parsed, and an
    // unparseable head is `unknown`. That is a refusal to answer rather than
    // an answer, which is why it costs nothing.
    const fits = got.line1Bytes <= headBytes;
    const wantHead = fits ? wantFull : 'unknown';
    if (got.atFull !== wantFull) {
      fail(
        `rule 8: "${name}" at full length answered "${got.atFull}" and the ` +
          `measurement says "${wantFull}".`
      );
    }
    if (got.atHead !== wantHead) {
      fail(
        `rule 8: "${name}" at the ${headBytes} byte budget answered ` +
          `"${got.atHead}" and a line of ${got.line1Bytes} bytes ` +
          `${fits ? 'fits, so it says' : 'does not fit, so it can only say'} ` +
          `"${wantHead}".`
      );
    }
    // THE SAFETY PROPERTY, asked of every size: a sub agent may never be
    // called this session's, whatever the budget is and however it truncates.
    if (spec.derived && (got.atHead === 'match' || got.atFull === 'match')) {
      calledMatch += 1;
      fail(`rule 8: "${name}" is a sub agent and the remote arm called it a match.`);
    }
    if (spec.derived && fits) reachable += 1;
  }
  // Only `match` may win. This is what makes an `unknown` cost no row, so it
  // is asked rather than assumed.
  if (remote.decide.match !== 'the-only-candidate') {
    fail('rule 8: a confirmed candidate did not win, so this rule proves nothing.');
  }
  for (const verdict of ['unknown', 'mismatch']) {
    if (remote.decide[verdict] !== null) {
      fail(
        `rule 8: a candidate whose verdict is "${verdict}" won a remote ` +
          'harvest. Only a match may ever produce a claim.'
      );
    }
  }
  const smallest = HIS_STORE.derivedLine1[0];
  notes.push(
    `rule 8: the remote budget is ${headBytes} bytes; the smallest sub agent ` +
      `line 1 in his store is ${smallest}, so the refusal is ` +
      `${headBytes >= smallest ? 'REACHABLE over his real records' : 'unreachable over his real records and answers unknown there'}` +
      `; ${reachable} of 4 sub agent fixtures fit the budget, and ` +
      `${calledMatch === 0 ? 'no sub agent answered match at any size' : `${calledMatch} sub agent fixtures answered MATCH`}.`
  );
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
      `truncates, all ${callSites.of} call sites ask the question, and the ` +
      'repair moves the rows it can prove and empties none.\n'
  );
}

// The scratch directory is removed whatever happened, which is the same rule
// every probe under build/ follows for a process it starts.
try {
  main();
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
