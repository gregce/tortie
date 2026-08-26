/**
 * `npm run conformance:arch`. The cheap gate on the standing contract and the
 * five checkers that keep it honest (Phase 63, research 49 section 10).
 *
 * WHAT IT IS FOR. `docs/arch/` is a repository local directory. It arrives with
 * a `git pull`, written by whoever last pushed, and Tortie reads it on every
 * burst of file changes and runs git over the tree it describes. Two claims
 * come with that, and both of them decay:
 *
 *   1. No field of a contract file ever reaches a spawned argv.
 *   2. An invalid row is dropped whole, with the file, the field and the
 *      reason named, and never partially merged, never silently dropped and
 *      never a crash.
 *
 * This gate is the executable half of both, and it costs about a second. It is
 * the eighth gate of its shape, beside `conformance:agents`,
 * `conformance:machines`, `conformance:installs`, `conformance:context`,
 * `conformance:overview`, `conformance:watcher` and `conformance:handback`.
 *
 * IT SPAWNS NOTHING. No git, no ripgrep, no agent, no tmux server, no Electron,
 * no request, and it reads nothing under the person's home. The fixture in
 * build/fixtures/arch/ is an imaginary repository as data, and the probe's git
 * seam prints the bytes git would have printed. That is why the classification
 * in build/verification-checks.mjs is `pure` rather than `adapter`, and it is a
 * measured fact about this gate rather than a hope.
 *
 * WHAT IT FAILS ON.
 *
 *  1. A hostile string from the fixture appears in any argv the run composed.
 *     The fixture plants a hostile anchor, a hostile object name, a hostile
 *     leading hyphen path and an unknown field naming a command, and every one
 *     of them is scanned for in every element of every recorded call.
 *  2. The scan itself stops biting. The same scan is run over a blinded record
 *     that carries a hostile element on purpose, and the gate fails if that
 *     record passes. A scan that cannot fail proves nothing.
 *  3. The guard stops refusing. `assertArchArgv` is handed a contract value and
 *     must throw.
 *  4. The composed word list grows. `ARCH_ARGV_WORDS` is pinned here, so a
 *     later round adding a word to the git command line has to add it in two
 *     files.
 *  5. A planted break stops being caught, or a verdict moves. The expectation
 *     table in build/fixtures/arch/expected.json is compared row by row, and it
 *     covers the planted divergence, the planted absence, the planted stale
 *     quote, the conservative rule on an unresolved import, the accepted
 *     divergence that stays a divergence, and the behavioural ceiling.
 *  6. A drop stops being whole, or stops naming the file, the field and the
 *     reason. Four rows in the fixture are invalid in four different ways and
 *     each must produce exactly one problem and cost only itself.
 *  7. An unknown field takes a row down with it. Research 49 fix 16 says
 *     unknown fields are reported and ignored, and the fixture carries one that
 *     names a command, so the rule is proved on the exact case that matters.
 *  8. The counts flatter. The strip's own numbers are pinned, including the
 *     accepted column and the unresolved import count, so an aggregate can
 *     never hide a break.
 *  9. The skeleton stops being deterministic. It is drafted twice and the bytes
 *     are compared.
 *  9.5 A freshness sentence starts counting the whole history again. Every
 *     sentence is pinned word for word, TWICE: once over a fixture log that
 *     holds a commit touching docs/arch with an older commit behind it, which
 *     proves the cut lands in the right place, and once over the same log with
 *     that commit filtered out, which is the case of a contract nobody has
 *     committed yet. The second run is here because the first fix of this
 *     defect passed the first check and still handed back the whole history in
 *     the second case, which is every repository on the day the contract is
 *     drafted.
 * 10. The resolver matrix loses a row, or loses the distinction between the
 *     four answers. Rust and Python must be present and must read
 *     `unverifiable` rather than be left out or folded into `unresolved`. The
 *     numbers come from the REAL `resolveImport` over committed specifiers, so
 *     the row is an assertion about the code rather than a bucketing of facts
 *     an author wrote into the fixture.
 * 11. Anything under src/main/arch/ writes a file, composes a ripgrep argument
 *     list, or reaches for a schema compiling library. All three are scanned
 *     for in the source itself.
 * 12. The accepted key set moves. `ARCH_ROW_KEYS` is pinned here in full, which
 *     is what keeps the research 66 ruling checkable: nothing in this format
 *     may ever name something Tortie runs.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const rows = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// The probe run
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/arch-conformance-probe.mts'],
  { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 }
);

if (probe.status !== 0) {
  process.stderr.write(probe.stderr || 'the probe did not run\n');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`the probe did not print JSON:\n${probe.stdout.slice(0, 4000)}\n`);
  process.exit(1);
}

const expected = JSON.parse(
  readFileSync(join(root, 'build', 'fixtures', 'arch', 'expected.json'), 'utf8')
);

// ---------------------------------------------------------------------------
// 1 and 2. The argv defense, and the control that proves the scan bites
// ---------------------------------------------------------------------------

/** Every hostile string that appears anywhere in a recorded record's argv. */
function leaksIn(record) {
  const found = [];
  for (const call of record) {
    for (const element of call.argv) {
      for (const hostile of data.hostileStrings) {
        if (element.includes(hostile)) {
          found.push(`${call.kind} argv holds "${hostile}" in "${element}"`);
        }
      }
    }
  }
  return found;
}

const leaks = leaksIn(data.record);
for (const leak of leaks) fail(`argv defense: ${leak}`);
rows.push([
  'argv defense',
  `${data.record.length} calls composed`,
  leaks.length === 0 ? 'no hostile string in any argv' : `${leaks.length} LEAKED`
]);

const controlLeaks = leaksIn(data.blindedRecord);
if (controlLeaks.length === 0) {
  fail(
    'control: the blinded record carries a hostile anchor on purpose and the ' +
      'scan did not see it. A scan that cannot fail proves nothing.'
  );
}
rows.push([
  'scan control',
  'a record with one hostile element',
  controlLeaks.length > 0 ? `caught ${controlLeaks.length}, the scan bites` : 'BLIND'
]);

// Every stdin the run wrote must be requests and nothing else.
for (const call of data.record) {
  if (call.stdin === null) continue;
  for (const line of call.stdin.split('\n')) {
    if (line.length === 0) continue;
    if (!line.startsWith('HEAD:')) {
      fail(`argv defense: a cat-file request was written as "${line}", which is not a HEAD read.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3 and 4. The guard itself
// ---------------------------------------------------------------------------

if (data.guard.refused !== true) {
  fail(
    'the guard accepted a contract value on a git command line. assertArchArgv ' +
      'must throw for anything that is not a compiled in word or an object name.'
  );
}
rows.push([
  'guard refuses',
  'assertArchArgv over a contract anchor',
  data.guard.refused ? 'threw, naming the element' : 'ACCEPTED IT'
]);

const PINNED_WORDS = [
  'ls-files',
  'cat-file',
  '--batch',
  'log',
  '--name-only',
  '--format=%H',
  '--no-renames',
  'status',
  '--porcelain',
  'rev-parse',
  'HEAD',
  '-z'
];
if (JSON.stringify(data.guard.words) !== JSON.stringify(PINNED_WORDS)) {
  fail(
    `the word list git may be given has moved. It is pinned here and in ` +
      `src/main/arch/argv-guard.ts, so a new word is a deliberate act in two ` +
      `files. Pinned ${JSON.stringify(PINNED_WORDS)}, found ` +
      `${JSON.stringify(data.guard.words)}.`
  );
}
rows.push(['word list', `${PINNED_WORDS.length} words`, 'pinned in two files']);

// The two patterns the first build accepted, and the narrowing that removed
// them. A forty character object name is a shape a contract can legally hold,
// because `oidField` guarantees forty lower case hex by construction, and a
// range of two is an ordinary anchor. Both had no caller, and a pattern with no
// caller is the thing a later round widens by one character.
const stillAccepted = (data.guard.narrowed ?? []).filter((n) => n.refused !== true);
for (const row of stillAccepted) {
  fail(
    `the guard accepted "${row.value}". Only the twelve compiled in words may ` +
      `go on a git command line. An object name and a range are shapes a ` +
      `contract can legally carry, and neither has a caller.`
  );
}
rows.push([
  'guard narrowing',
  `${(data.guard.narrowed ?? []).length} object name and range shapes`,
  stillAccepted.length === 0 ? 'all refused' : `${stillAccepted.length} STILL ACCEPTED`
]);

// ---------------------------------------------------------------------------
// 5. Every planted break, against the written expectation table
// ---------------------------------------------------------------------------

const byId = new Map(data.verdicts.map((v) => [v.subjectId, v]));
const verdictRows = [];
for (const want of expected.verdicts) {
  const got = byId.get(want.subjectId);
  if (got === undefined) {
    fail(`verdict: no row for ${want.subjectId}, which the table expects.`);
    verdictRows.push([want.subjectId, `${want.status}/${want.coverage}`, 'MISSING']);
    continue;
  }
  const gotAccepted = got.accepted === true;
  const same =
    got.status === want.status &&
    got.coverage === want.coverage &&
    gotAccepted === want.accepted;
  if (!same) {
    fail(
      `verdict: ${want.subjectId} reads ${got.status}/${got.coverage}` +
        `${gotAccepted ? '/accepted' : ''} and the table says ${want.status}/` +
        `${want.coverage}${want.accepted ? '/accepted' : ''}. ${want.why}`
    );
  }
  verdictRows.push([
    want.subjectId,
    `${want.status}/${want.coverage}${want.accepted ? '/accepted' : ''}`,
    same ? 'as written' : `GOT ${got.status}/${got.coverage}${gotAccepted ? '/accepted' : ''}`
  ]);
}

// ---------------------------------------------------------------------------
// 6 and 7. The drop whole rule
// ---------------------------------------------------------------------------

const problemRows = [];
for (const want of expected.problems) {
  const hits = data.document.problems.filter(
    (p) => p.file === want.file && p.field === want.field
  );
  if (hits.length !== 1) {
    fail(
      `drop whole: ${want.file} field ${want.field} produced ${hits.length} ` +
        `problems and exactly one is expected.`
    );
    problemRows.push([want.file.replace('docs/arch/', ''), want.field, `${hits.length} problems`]);
    continue;
  }
  const message = hits[0].message;
  const ok = message.includes(want.contains);
  if (!ok) {
    fail(
      `drop whole: ${want.file} field ${want.field} says "${message}", and it ` +
        `must name the reason with "${want.contains}".`
    );
  }
  problemRows.push([
    want.file.replace('docs/arch/', ''),
    want.field,
    ok ? 'named the reason' : 'REASON MISSING'
  ]);
}

const keptComponents = JSON.stringify(data.document.componentIds);
if (keptComponents !== JSON.stringify(expected.keptComponentIds)) {
  fail(
    `drop whole: the parts that survived are ${keptComponents} and the table ` +
      `says ${JSON.stringify(expected.keptComponentIds)}. A bad row must cost ` +
      `itself and nothing else.`
  );
}
const keptEdges = JSON.stringify(data.document.edgeIds);
if (keptEdges !== JSON.stringify(expected.keptEdgeIds)) {
  fail(
    `drop whole: the promises that survived are ${keptEdges} and the table ` +
      `says ${JSON.stringify(expected.keptEdgeIds)}.`
  );
}
if (!data.document.componentIds.includes('extra-field')) {
  fail(
    'unknown fields: the row carrying a field this build does not know was ' +
      'dropped. Research 49 fix 16 says it is reported and kept.'
  );
}
rows.push([
  'drop whole',
  `${expected.problems.length} planted faults`,
  `${data.document.componentIds.length} parts and ${data.document.edgeIds.length} promises survived`
]);

// ---------------------------------------------------------------------------
// 8. The counts, which must not flatter
// ---------------------------------------------------------------------------

for (const [key, want] of Object.entries(expected.counts)) {
  const got = data.counts?.[key];
  if (got !== want) {
    fail(`counts: ${key} reads ${got} and the table says ${want}.`);
  }
}
rows.push(['verdict strip', data.sentence, 'as written']);

// ---------------------------------------------------------------------------
// 9. The skeleton is deterministic
// ---------------------------------------------------------------------------

if (data.skeleton.repeatable !== true) {
  fail(
    'the skeleton drafted twice from one fact base gave two answers. A draft ' +
      'that drifts makes every regeneration a noisy diff.'
  );
}
for (const hostile of data.hostileStrings) {
  if (data.skeleton.text.includes(hostile)) {
    fail(`the skeleton wrote "${hostile}" into a draft buffer.`);
  }
}
rows.push([
  'skeleton',
  `${data.skeleton.paths.length} buffers, none written to disk`,
  data.skeleton.repeatable ? 'byte for byte on a second draft' : 'DRIFTED'
]);

// ---------------------------------------------------------------------------
// 9.5 The freshness sentences, word for word
// ---------------------------------------------------------------------------
//
// Nothing checked these in the first build, and that is how a sentence
// reporting a repository's WHOLE HISTORY as staleness shipped: the walk took
// its range from a field nothing ever set, so every component reported every
// commit that had ever touched it as a commit that landed since the contract
// was written. The fixture's log now carries a commit that touched docs/arch
// with an older commit behind it, so a row that counts past that point fails
// here.

const freshnessById = new Map(data.freshness.map((r) => [r.subjectId, r.sentence]));
const freshnessRows = [];
for (const want of expected.freshness) {
  const got = freshnessById.get(want.subjectId);
  if (got === want.sentence) {
    freshnessRows.push([want.subjectId, 'as written']);
    continue;
  }
  fail(
    `freshness: ${want.subjectId} says "${got ?? 'nothing at all'}" and the ` +
      `table says "${want.sentence}". A freshness number counts the commits ` +
      `since the contract was last written, and never the whole history.`
  );
  freshnessRows.push([want.subjectId, `GOT ${got ?? 'no row'}`]);
}
if (freshnessById.size !== expected.freshness.length) {
  fail(
    `freshness: ${freshnessById.size} rows came back and the table names ` +
      `${expected.freshness.length}. Every part gets a sentence, including the ` +
      `ones with nothing behind them.`
  );
}

// THE CASE THE FIRST FIX MISSED, and the reason this block exists at all. The
// check above drives a history that HOLDS a commit touching docs/arch, so it
// proves the cut is made at the right place and says nothing about what happens
// when there is no such commit. That is the common case: a person drafts a
// contract and has not committed it. The walk then reaches the end of the list
// having found no boundary, and the first fix fell out of the bottom of that
// loop handing back everything it had walked. Measured on Tortie's own history
// on 2026-08-26: 530 commits walked, 0 touching docs/arch, 530 returned, and
// the main process read "169 commits have landed under the main process since
// this was written" about a contract two minutes old, which
// `git rev-list --count HEAD -- src/main` confirms is the whole history of that
// directory. So the probe runs the whole check a SECOND time over the same
// fixture with the one docs/arch commit filtered out of the log, and every
// sentence is pinned here.

const uncommittedById = new Map(
  (data.freshnessUncommittedContract ?? []).map((r) => [r.subjectId, r.sentence])
);
for (const want of expected.freshnessUncommittedContract) {
  const got = uncommittedById.get(want.subjectId);
  if (got === want.sentence) {
    freshnessRows.push([`${want.subjectId} (uncommitted)`, 'as written']);
    continue;
  }
  fail(
    `freshness: with no committed contract, ${want.subjectId} says ` +
      `"${got ?? 'nothing at all'}" and the table says "${want.sentence}". A ` +
      `repository whose contract has never been committed has nothing behind ` +
      `it, because the contract was written after HEAD. Reporting the whole ` +
      `history there is the exact sentence this feature exists to refuse.`
  );
  freshnessRows.push([`${want.subjectId} (uncommitted)`, `GOT ${got ?? 'no row'}`]);
}
if (uncommittedById.size !== expected.freshnessUncommittedContract.length) {
  fail(
    `freshness: the uncommitted contract run returned ${uncommittedById.size} ` +
      `rows and the table names ${expected.freshnessUncommittedContract.length}.`
  );
}

// ---------------------------------------------------------------------------
// 10. The resolver matrix, with the deferred arms present
// ---------------------------------------------------------------------------

const matrixById = new Map(data.matrix.map((r) => [r.language, r]));
const matrixRows = [];
for (const want of expected.resolverMatrix) {
  const got = matrixById.get(want.language);
  if (got === undefined) {
    fail(
      `resolver: ${want.language} has no row. A deferred language is marked ` +
        `unverifiable and is never left out, because a missing row reads as a ` +
        `clean bill of health.`
    );
    matrixRows.push([want.language, want.arm, 'MISSING']);
    continue;
  }
  const shape = (row) =>
    `${row.firstParty} first party, ${row.external} external, ` +
    `${row.unresolved} unresolved, ${row.unverifiable} unverifiable`;
  if (shape(got) !== shape(want)) {
    fail(
      `resolver: ${want.language} answered ${shape(got)}, and the table says ` +
        `${shape(want)}. These four answers are not interchangeable: external ` +
        `is a definite answer and the other two are the absence of one.`
    );
  }
  matrixRows.push([want.language, want.arm, shape(got)]);
}

// ---------------------------------------------------------------------------
// 11. What the source itself must be true about
// ---------------------------------------------------------------------------

const BANNED_SOURCE = [
  ['writeFile', 'nothing under src/main/arch may write a file. Tortie reads docs/arch and never writes it.'],
  ['writeFileSync', 'nothing under src/main/arch may write a file.'],
  ['buildListFilesArgs', 'a contract glob must never reach ripgrep.'],
  ['rgBinaryPath', 'nothing under src/main/arch spawns ripgrep.'],
  ["from 'ajv'", 'the validator is hand written. No library that compiles a schema enters the bundle.'],
  ['spawn(', 'every process this feature starts goes through runGit in src/main/git/exec.ts.']
];
for (const source of data.sources) {
  for (const [token, why] of BANNED_SOURCE) {
    // argv-guard.ts names the ripgrep builder in prose, to say why it is
    // never called. A comment is the one place the word may appear.
    const lines = source.text.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.includes(token)) continue;
      const trimmed = line.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        continue;
      }
      fail(`${source.path}:${i + 1} names ${token}. ${why}`);
    }
  }
}
rows.push([
  'source scan',
  `${data.sources.length} files under src/main/arch`,
  'no writer, no ripgrep, no schema compiler, no spawn'
]);

// ---------------------------------------------------------------------------
// 12. The accepted key set, pinned in full
// ---------------------------------------------------------------------------

const PINNED_KEYS = {
  contract: ['version', 'subject', 'strictness', 'layers', 'flows'],
  layer: ['id', 'name', 'order'],
  component: [
    'id',
    'name',
    'kind',
    'layer',
    'provenance',
    'anchors',
    'boundary',
    'description',
    'evidence',
    'deprecated',
    'gaps'
  ],
  evidence: ['path', 'blobOid', 'lineStart', 'lineEnd', 'quote'],
  edge: ['id', 'from', 'to', 'kind', 'rule', 'checker', 'label', 'note', 'evidence'],
  baseline: ['accepted'],
  accepted: ['edgeId', 'fromPath', 'toPath', 'because', 'at'],
  flow: ['id', 'name', 'shape', 'steps'],
  flowStep: ['seq', 'componentId', 'label', 'note', 'group', 'evidence']
};
if (JSON.stringify(data.rowKeys) !== JSON.stringify(PINNED_KEYS)) {
  fail(
    'the accepted key set has moved. It is pinned here and in src/shared/arch.ts. ' +
      'Research 66 section 6.1 ruled that a repository local directory may carry ' +
      'identity and presentation and may never name anything Tortie runs, and ' +
      'this pin is what keeps that checkable.'
  );
}
const everyKey = Object.values(PINNED_KEYS).flat();
const NAMES_SOMETHING_TO_RUN = [
  'command',
  'args',
  'argv',
  'exec',
  'run',
  'script',
  'binary',
  'program',
  'shell',
  'url',
  'host'
];
for (const key of everyKey) {
  if (NAMES_SOMETHING_TO_RUN.includes(key.toLowerCase())) {
    fail(
      `the format has a field called "${key}". No field of a contract may name ` +
        `anything Tortie runs or reaches.`
    );
  }
}
rows.push([
  'format key set',
  `${everyKey.length} keys across ${Object.keys(PINNED_KEYS).length} records`,
  'none names anything Tortie runs'
]);

// ---------------------------------------------------------------------------
// The tables, printed whatever the verdict
// ---------------------------------------------------------------------------

const pad = (v, w) => String(v).padEnd(w);
const line = (w) => '-'.repeat(w);

process.stdout.write('\nPhase 63 arch conformance, over build/fixtures/arch\n\n');
process.stdout.write(pad('what', 20) + pad('measured', 58) + 'verdict\n');
process.stdout.write(line(120) + '\n');
for (const r of rows) {
  process.stdout.write(pad(r[0], 20) + pad(r[1], 58) + r[2] + '\n');
}

process.stdout.write('\nthe expectation table, one row per claim\n');
process.stdout.write(pad('subject', 40) + pad('the table says', 34) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of verdictRows) {
  process.stdout.write(pad(r[0], 40) + pad(r[1], 34) + r[2] + '\n');
}

process.stdout.write('\nthe drop whole rule, one row per planted fault\n');
process.stdout.write(pad('file', 34) + pad('field', 40) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of problemRows) {
  process.stdout.write(pad(r[0], 34) + pad(r[1], 40) + r[2] + '\n');
}

process.stdout.write('\nthe freshness sentence, one row per part, in both histories\n');
process.stdout.write(pad('subject', 50) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of freshnessRows) {
  process.stdout.write(pad(r[0], 50) + r[1] + '\n');
}

process.stdout.write('\nthe resolver, one row per language\n');
process.stdout.write(pad('language', 16) + pad('arm', 16) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of matrixRows) {
  process.stdout.write(pad(r[0], 16) + pad(r[1], 16) + r[2] + '\n');
}

process.stdout.write('\nevery git call this run composed\n');
process.stdout.write(pad('kind', 20) + pad('argv', 60) + 'stdin\n');
process.stdout.write(line(120) + '\n');
for (const call of data.record) {
  process.stdout.write(
    pad(call.kind, 20) +
      pad(call.argv.join(' '), 60) +
      (call.stdin === null ? 'none' : `${call.stdin.split('\n').length - 1} requests`) +
      '\n'
  );
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${String(failures.length)}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. No contract value reached any argv, the scan that proves it still ' +
    'bites, every planted break was caught at the verdict the table names, ' +
    'every invalid row cost itself and nothing else, the skeleton drafted the ' +
    'same bytes twice, and no field of this format names anything Tortie runs.\n'
);
