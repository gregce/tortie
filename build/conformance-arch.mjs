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
 * 9.7 THE COMPOSED PAYLOAD MOVES BY ONE BYTE (Phase 64). The block a person
 *     hands to a running agent is pinned LINE BY LINE, so a wording change is
 *     a deliberate act in two files and a silent drift is a failure. Four
 *     compositions are driven: a rich selection composed twice with the second
 *     selection shuffled, which proves the bytes do not depend on the order a
 *     person clicked in; the same selection over a doctored freshness row,
 *     which is the two grade rule and the only way to reach it over a fixture
 *     whose whole history is four commits; a part whose anchors resolve to
 *     nothing at HEAD, which is the broken target gate; and a fact base whose
 *     repository name, tracked path and import specifier carry an escape, a
 *     carriage return and a NUL, which is the paste safety strip. The block is
 *     delivered as ONE bracketed paste, and a control character inside it can
 *     end that paste early and hand what follows to the agent as keystrokes.
 *     The same control scan is run over a block with an escape put back on
 *     purpose, and the gate fails if that block passes.
 * 10. The resolver matrix loses a row, or loses the distinction between the
 *     four answers. The numbers come from the REAL `resolveImport` over
 *     committed specifiers, so each row is an assertion about the code rather
 *     than a bucketing of facts an author wrote into the fixture.
 * 10.1 The hand written `RESOLVER_MATRIX` starts lying. Phase 157 found the
 *     same defect one level up from the one Phase 63's verifier named: the
 *     table in src/main/arch/resolver/index.ts CLAIMS which languages resolve
 *     and nothing asked the code. So a language claiming `resolves: true` must
 *     really produce an answer that is not `unverifiable`, one claiming
 *     `resolves: false` must produce nothing else, and the set of languages the
 *     table names must be exactly the set `languageOf` can produce. That last
 *     one is the important half: `languageOf` ends in a default branch that
 *     answers `'typescript'`, so a grammar added and left out of the table is
 *     read BY THE SCRIPT ARM, and a Ruby `require "fs"` would answer `external`
 *     because `fs` is a Node builtin.
 * 10.2 THE FALSE GREEN, and it is the one control here that proves the STAKE
 *     rather than the behaviour. The same `must-not` promise is judged twice
 *     over the same real answer: once as the arm gives it, and once with
 *     `unresolved` rewritten to `external`, which is exactly the defect Phase
 *     63's verifier caught. The first must be `unverifiable` and the second
 *     must be `convergent`. If they ever agree, either an arm has started
 *     guessing or the checker has stopped caring.
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
// 9.6 The map (Phase 160): one picture, two states, zero processes
// ---------------------------------------------------------------------------
// The charter's two states over one fixture: with the contract the SAME boxes
// wear the person's names and the judged verdict rides the edge the promise
// crosses; with no contract the same boxes wear their computed names and no
// colour. The composer is pure, so composing may not add one git call, and
// composed twice from shuffled facts it must give the same bytes.

if (data.map.repeatable !== true) {
  fail(
    'the map composed twice from shuffled facts gave two answers. Same ' +
      'repository, same picture is the whole promise.'
  );
}
if (data.map.callsAfter !== data.map.callsBefore) {
  fail(
    `composing the map moved the git call count from ${data.map.callsBefore} ` +
      `to ${data.map.callsAfter}. The composer must start nothing.`
  );
}

const mapGroupIds = data.map.model.groups.map((g) => g.id);
const noContractIds = data.map.noContract.groups.map((g) => g.id);
if (JSON.stringify(mapGroupIds) !== JSON.stringify(noContractIds)) {
  fail(
    'the overlay changed which boxes exist. A contract may rename a box and ' +
      'never redraw the grouping.'
  );
}

// The overlay: a component whose anchors land whole in one box renames it,
// the machine id stays, and the computed-only picture paints nobody.
const overlays = [
  ['src-app', 'app', 'app'],
  ['src-core', 'core', 'core'],
  ['src-store', 'store', 'store'],
  ['vendor-lib', 'vendored-lib', 'vendored lib']
];
for (const [groupId, componentId, name] of overlays) {
  const box = data.map.model.groups.find((g) => g.id === groupId);
  if (box === undefined) {
    fail(`map: no box ${groupId}, and the fixture tree puts one there.`);
    continue;
  }
  if (box.componentId !== componentId || box.label !== name) {
    fail(
      `map: the box ${groupId} reads ${box.componentId ?? 'nothing'} as ` +
        `"${box.label}", and the contract's ${componentId} holds a majority ` +
        `in it.`
    );
  }
}
for (const box of data.map.noContract.groups) {
  if (box.componentId !== null || box.label !== box.dir) {
    fail(
      `map: the computed-only picture painted ${box.id} as "${box.label}", ` +
        'and with no contract every box wears its directory.'
    );
  }
}

// The verdict rides the judged edge, worst status first, and only there. The
// planted divergence on app-must-not-store must colour app to store, and the
// edge the contract never judged must stay uncoloured in both states.
const judged = data.map.model.edges.find(
  (e) => e.from === 'src-app' && e.to === 'src-store'
);
if (judged?.status !== 'divergent' || judged?.edgeId !== 'app-must-not-store') {
  fail(
    `map: the app to store edge carries ${judged?.status ?? 'nothing'} from ` +
      `${judged?.edgeId ?? 'nothing'}, and the planted divergence must ride it.`
  );
}
if (judged?.count !== 2) {
  fail(
    `map: the app to store edge weighs ${judged?.count}, and the fixture ` +
      'crosses it twice.'
  );
}
const unjudged = data.map.model.edges.find(
  (e) => e.from === 'src-store' && e.to === 'src-core'
);
if (unjudged === undefined || unjudged.status !== null) {
  fail(
    'map: an edge the contract never judged is coloured, which invents a ' +
      'verdict.'
  );
}
if (data.map.noContract.edges.some((e) => e.status !== null)) {
  fail('map: the computed-only picture carries a verdict colour.');
}

// The honest grey has its denominators: the fixture's Rust and Ruby style
// misses land as per-box unresolved counts rather than vanishing.
const native = data.map.model.groups.find((g) => g.id === 'src-native');
if (native === undefined || native.unresolvedImports < 1) {
  fail(
    'map: src-native lost its unresolved count, and the honest grey has ' +
      'nothing to say without it.'
  );
}

rows.push([
  'map',
  `${data.map.model.groups.length} boxes, ${data.map.model.edges.length} edges`,
  data.map.repeatable
    ? 'byte for byte from shuffled facts, overlay and colour ride the same boxes'
    : 'DRIFTED'
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
// 9.7 The composed payload, line by line (Phase 64)
// ---------------------------------------------------------------------------
//
// This is the block that lands in a running agent's prompt, so it is pinned the
// way the freshness sentences are pinned: word for word, in a second file, so a
// wording change shows up here before it shows up in somebody's session. The
// composer is a pure function, so the same input has to give the same bytes on
// this machine and on any other, and the shuffled second composition is what
// proves the order a person clicked in never reaches the output.

const payload = data.payload ?? null;
const payloadRows = [];
if (payload === null) {
  fail('the probe composed no payload. The Phase 64 section did not run.');
} else {
  const gotLines = payload.text.split('\n');
  const wantLines = expected.payload.text;
  let firstDiff = -1;
  for (let i = 0; i < Math.max(gotLines.length, wantLines.length); i += 1) {
    if (gotLines[i] !== wantLines[i]) {
      firstDiff = i;
      break;
    }
  }
  if (firstDiff !== -1) {
    fail(
      `payload: line ${firstDiff + 1} reads\n      ${JSON.stringify(gotLines[firstDiff] ?? null)}\n` +
        `    and build/fixtures/arch/expected.json says\n      ` +
        `${JSON.stringify(wantLines[firstDiff] ?? null)}\n` +
        `    The block a person hands to an agent is pinned word for word. If ` +
        `this change is deliberate, re-pin expected.payload.text.`
    );
  }
  payloadRows.push([
    'byte for byte',
    `${gotLines.length} lines, ${payload.bytes} bytes`,
    firstDiff === -1 ? 'as written' : `DIFFERS AT LINE ${firstDiff + 1}`
  ]);

  if (payload.repeatable !== true) {
    fail(
      'payload: the same selection in a different order composed different ' +
        'bytes. The composer sorts and de-duplicates every list it is given, ' +
        'so the order a person clicked in must never reach the output.'
    );
  }
  payloadRows.push([
    'order independence',
    'the same three parts, shuffled and repeated',
    payload.repeatable ? 'identical bytes' : 'DRIFTED'
  ]);

  if (payload.callsBefore !== payload.callsAfter) {
    fail(
      `payload: composing started ${payload.callsAfter - payload.callsBefore} ` +
        `git calls. The composer is pure over its input and composes no argv ` +
        `at all, so this number is zero or the design has moved.`
    );
  }
  payloadRows.push([
    'processes started',
    `${payload.callsBefore} calls before, ${payload.callsAfter} after`,
    payload.callsBefore === payload.callsAfter ? 'composing started nothing' : 'STARTED SOMETHING'
  ]);

  // The paste safety strip, and the control that proves it bites.
  for (const which of payload.controlOffenders) {
    fail(
      `payload: the ${which} block carries a control character. It is ` +
        `delivered as ONE bracketed paste, and an escape inside it can end ` +
        `that paste early and hand what follows to the agent as keystrokes. A ` +
        `bare carriage return submits the prompt on six of the ten agents ` +
        `src/shared/agent-defaults.ts measured.`
    );
  }
  if (payload.blindedCaught !== true) {
    fail(
      'control: a block with an escape put back on purpose passed the control ' +
        'scan. A scan that cannot fail proves nothing.'
    );
  }
  payloadRows.push([
    'paste safety',
    'four blocks, one with an escape, a carriage return and a NUL planted',
    payload.controlOffenders.length === 0 && payload.blindedCaught
      ? 'no control character survived, and the scan bites'
      : 'LEAKED'
  ]);

  // The two grades.
  const staleText = payload.stale.text;
  for (const quoted of expected.payload.staleMustNotQuote) {
    if (staleText.includes(quoted)) {
      fail(
        `payload: over the threshold the block still quotes "${quoted}". ` +
          `Authored prose ships only while its part is under ` +
          `${payload.proseThreshold} commits behind, and above it the block ` +
          `carries one line saying the prose predates N commits.`
      );
    }
  }
  for (const wanted of expected.payload.staleMustSay) {
    if (!staleText.includes(wanted)) {
      fail(`payload: over the threshold the block does not say "${wanted}".`);
    }
  }
  const withheld = payload.stale.proseWithheld.map((r) => r.componentId).sort().join(',');
  if (withheld !== expected.payload.staleWithheld.join(',')) {
    fail(
      `payload: the parts whose prose was withheld are "${withheld}" and the ` +
        `table says "${expected.payload.staleWithheld.join(',')}".`
    );
  }
  if (payload.proseWithheld.length !== 0) {
    fail(
      'payload: the rich block withheld prose. Every part in the fixture is ' +
        'under the threshold, so the first grade must ship every authored line.'
    );
  }
  payloadRows.push([
    'the two grades',
    `threshold ${payload.proseThreshold} commits, ${payload.stale.proseWithheld.length} parts over it`,
    'deterministic content shipped, prose withheld with the count'
  ]);

  // Every quoted line carries the mark. Counted rather than sampled: the mark
  // is what stops the block presenting somebody's prose as something Tortie
  // verified, and it is the one refusal in this phase a reader could not catch.
  const quotedLines = payload.text
    .split('\n')
    .filter((l) => /^\s*(Description|Known gap|Note|Label|Accepted on purpose)/.test(l.trim()) ||
      l.includes('Accepted on purpose'));
  const unmarked = quotedLines.filter((l) => !l.includes('from docs/arch, unverified'));
  for (const line of unmarked) {
    fail(`payload: a quoted line carries no mark: ${JSON.stringify(line)}`);
  }
  payloadRows.push([
    'the unverified mark',
    `${quotedLines.length} quoted lines`,
    unmarked.length === 0 ? 'every one marked' : `${unmarked.length} UNMARKED`
  ]);

  // The broken target gate.
  if (payload.brokenTarget !== false) {
    fail('payload: the rich selection reported a broken target and every part in it resolves.');
  }
  if (payload.broken.brokenTarget !== true) {
    fail(
      'payload: a part whose anchors resolve to zero tracked files at HEAD did ' +
        'not raise the broken target gate. That gate is the one check typing a ' +
        'scope by hand can never perform.'
    );
  }
  const brokenIds = payload.broken.brokenTargetIds.join(',');
  if (brokenIds !== expected.payload.brokenTargetIds.join(',')) {
    fail(
      `payload: the parts that resolve to nothing are "${brokenIds}" and the ` +
        `table says "${expected.payload.brokenTargetIds.join(',')}".`
    );
  }
  for (const wanted of expected.payload.brokenMustSay) {
    if (!payload.broken.text.includes(wanted)) {
      fail(`payload: the broken target block does not say "${wanted}".`);
    }
  }
  payloadRows.push([
    'broken target gate',
    `${payload.broken.deadAnchors.length} anchor matching nothing at HEAD`,
    payload.broken.brokenTarget ? 'one extra confirmation demanded' : 'NOT RAISED'
  ]);

  // The gap staple, and the counts the caller reports.
  for (const wanted of expected.payload.mustSay) {
    if (!payload.text.includes(wanted)) {
      fail(`payload: the block does not say "${wanted}".`);
    }
  }
  for (const banned of expected.payload.mustNotSay) {
    if (payload.text.includes(banned)) {
      fail(
        `payload: the block says "${banned}". It never carries an image and ` +
          `never carries file contents.`
      );
    }
  }
  if (JSON.stringify(payload.counts) !== JSON.stringify(expected.payload.counts)) {
    fail(
      `payload: the block reports ${JSON.stringify(payload.counts)} and the ` +
        `table says ${JSON.stringify(expected.payload.counts)}.`
    );
  }
  if (payload.unknownIds.length !== 0) {
    fail(`payload: ${JSON.stringify(payload.unknownIds)} named nothing in the contract.`);
  }
  payloadRows.push([
    'the gap staple',
    `${payload.counts.gaps} gap, ${payload.counts.parts} parts, ${payload.counts.interiorPromises} inside and ${payload.counts.crossingPromises} crossing`,
    'stapled verbatim under its own heading'
  ]);
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
// 10.1 The hand written table, held against what the code really answers
// ---------------------------------------------------------------------------

const answeredBy = new Map();
for (const answer of data.answers) {
  const bucket = answeredBy.get(answer.language) ?? [];
  bucket.push(answer);
  answeredBy.set(answer.language, bucket);
}
const declaredRows = [];
for (const row of data.declaredMatrix) {
  const given = answeredBy.get(row.language) ?? [];
  if (given.length === 0) {
    fail(
      `resolver: RESOLVER_MATRIX names ${row.language} and no committed ` +
        `specifier exercises it, so the row is a claim nothing checks. Add a ` +
        `row to facts.json resolverProbe.specifiers.`
    );
    declaredRows.push([row.language, String(row.resolves), 'NOT EXERCISED']);
    continue;
  }
  const real = given.filter((a) => a.resolution !== 'unverifiable').length;
  if (row.resolves && real === 0) {
    fail(
      `resolver: RESOLVER_MATRIX says ${row.language} resolves and every one ` +
        `of its ${given.length} answers came back unverifiable. The table is ` +
        `a claim about the code and the code disagrees with it.`
    );
  }
  if (!row.resolves && real > 0) {
    fail(
      `resolver: RESOLVER_MATRIX says ${row.language} does not resolve and ` +
        `${real} of its ${given.length} answers are real ones. A deferred ` +
        `language answers unverifiable and nothing else, because that is what ` +
        `keeps its imports off every green verdict.`
    );
  }
  if (row.resolves !== (row.reason === null)) {
    fail(
      `resolver: ${row.language} says resolves ${row.resolves} and carries ` +
        `reason ${JSON.stringify(row.reason)}. A deferred language states its ` +
        `reason on its face and a resolving one has none to state.`
    );
  }
  declaredRows.push([
    row.language,
    String(row.resolves),
    `${real} of ${given.length} answered`
  ]);
}

// THE LINE THAT MATTERS MOST IN THIS SECTION. `languageOf` in
// src/main/arch/scan.ts falls through to `'typescript'`, so a grammar the
// symbol layer ships and the resolver's union never named is read by the SCRIPT
// arm rather than skipped, and that is a wrong answer rather than a missing one.
const declaredLanguages = data.declaredMatrix.map((r) => r.language).sort();
if (declaredLanguages.join(',') !== data.scannerLanguages.join(',')) {
  fail(
    `resolver: the scanner can produce [${data.scannerLanguages.join(', ')}] ` +
      `and RESOLVER_MATRIX names [${declaredLanguages.join(', ')}]. They have ` +
      `to be the same set. languageOf ends in a default branch answering ` +
      `'typescript', so a language in the first list and not the second is ` +
      `resolved by the SCRIPT arm, and a Ruby require "fs" then answers ` +
      `external because fs is a Node builtin.`
  );
}

// ---------------------------------------------------------------------------
// 10.2 The false green, run rather than described
// ---------------------------------------------------------------------------

if (data.falseGreen.shippedAnswer !== 'unresolved') {
  fail(
    `false green: the arm answered ${data.falseGreen.shippedAnswer} for a ` +
      `dependency no manifest declares. It has to be unresolved. This control ` +
      `is meaningless if the arm being controlled already guessed.`
  );
}
if (data.falseGreen.shippedVerdict !== 'unverifiable') {
  fail(
    `false green: a must-not promise whose only import across it is ` +
      `unresolved came back ${data.falseGreen.shippedVerdict}. It has to be ` +
      `unverifiable. Extraction failure and genuine absence look identical ` +
      `from the checker's seat, and a false green on a must-not is the most ` +
      `damaging thing this feature can print.`
  );
}
if (data.falseGreen.sloppyVerdict !== 'convergent') {
  fail(
    `false green: the CONTROL did not fire. The same promise judged with the ` +
      `unresolved rewritten to external came back ` +
      `${data.falseGreen.sloppyVerdict} rather than convergent, so this gate ` +
      `is no longer proving what an external costs. Either the checker changed ` +
      `or this control stopped reaching it.`
  );
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

process.stdout.write(
  '\nPhase 63 and Phase 64 arch conformance, over build/fixtures/arch\n\n'
);
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

process.stdout.write('\nthe composed payload, one row per claim\n');
process.stdout.write(pad('what', 24) + pad('measured', 62) + 'verdict\n');
process.stdout.write(line(120) + '\n');
for (const r of payloadRows) {
  process.stdout.write(pad(r[0], 24) + pad(r[1], 62) + r[2] + '\n');
}

process.stdout.write('\nthe resolver, one row per language\n');
process.stdout.write(pad('language', 16) + pad('arm', 16) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of matrixRows) {
  process.stdout.write(pad(r[0], 16) + pad(r[1], 16) + r[2] + '\n');
}

process.stdout.write(
  '\nRESOLVER_MATRIX held against what the code answered, and the languages ' +
    'the scanner can produce\n'
);
process.stdout.write(pad('language', 16) + pad('claims resolves', 18) + 'measured\n');
process.stdout.write(line(120) + '\n');
for (const r of declaredRows) {
  process.stdout.write(pad(r[0], 16) + pad(r[1], 18) + r[2] + '\n');
}
process.stdout.write(
  `scanner produces: ${data.scannerLanguages.join(', ')}\n`
);

process.stdout.write(
  '\nthe false green, the same must-not promise judged twice over the same ' +
    'answer\n'
);
process.stdout.write(pad('arm', 40) + 'verdict\n');
process.stdout.write(line(120) + '\n');
process.stdout.write(
  pad(`shipped, answers ${data.falseGreen.shippedAnswer}`, 40) +
    `${data.falseGreen.shippedVerdict}\n`
);
process.stdout.write(
  pad('the Phase 63 defect, answers external', 40) +
    `${data.falseGreen.sloppyVerdict}, and it is a lie\n`
);

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
    'same bytes twice, the composed payload matched its pinned block line for ' +
    'line and carried no control character, the map composed one picture in ' +
    'both of its states without a process, and no field of this format names ' +
    'anything Tortie runs.\n'
);
