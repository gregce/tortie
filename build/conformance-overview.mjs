/**
 * `npm run conformance:overview`. The cheap gate on the Catch Me Up reader
 * (Phase 137, research 63).
 *
 * WHAT IT IS FOR. The overview page draws what a per provider keep map reads
 * out of each agent's own session log. That claim decays every time a vendor
 * changes a log format, and the failure shape is silent: the page goes empty,
 * or a machine written record is drawn as the person's own ask. This gate is
 * the executable half of the claim and it costs about three seconds.
 *
 * It is the sixth gate of its shape, beside `conformance:agents`,
 * `conformance:installs`, `conformance:machines` and `conformance:context`.
 * It spawns no agent, opens no manifest, launches no Electron, starts no tmux
 * server, makes no request, and reads nothing under the person's home. The
 * probe beside it (`overview-conformance-probe.mts`) runs the reader over the
 * 14 committed fixtures in docs/research/assets/63-fixtures/ plus derived
 * fixtures it builds into out/conformance-overview/ and removes.
 *
 * WHAT IT FAILS ON.
 *
 *  1. A slot that filled yesterday is empty today. The per provider turn and
 *     answer counts are pinned to the numbers research 63 verify.js proved.
 *  2. A trap record is drawn as a human ask. The banned string list per
 *     provider is scanned over every kept ask and answer.
 *  3. The two parser bugs the lab found reappear. A task notification block
 *     counted as an ask (the inflation was measured at 105.8 percent), or
 *     claude's compaction handover counted as an ask.
 *  4. The keep ratio moves by more than 0.05 from the banked fixture ratio,
 *     or falls to zero. A vendor change shows up as a moved ratio before it
 *     shows up as an empty page.
 *  5. One of the seven inherited defects regresses. The two most likely to
 *     regress silently are pinned hardest: the claude and codex vintage
 *     fallback must FIRE on a sorted key fixture (acct.prefilter 'wide'), and
 *     the cursor blob probe must read 32 bytes.
 *  6. A second read with the stored watermark does any work on an unchanged
 *     file, or does NO work on a file whose bytes changed at equal length.
 *  7. In product mode: the resolver misses a fixture placed where its table
 *     says, a secret shape survives into the store's bytes, the store breaks
 *     under a kill mid write, the path index misses the fixture's tool call
 *     paths, or a file under src/main/overview or src/renderer/overview
 *     writes a session status.
 *  8. In product mode (Phase 293): the session manager's counts disagree with
 *     the per-provider truth table of build/p293/SPEC.md section 3.4, which
 *     ACTIVITY_EXPECT below copies by hand. Two layers are held. The store
 *     layer writes what the product reader kept from each fixture into a
 *     scratch store and maps the shipping aggregate through the shipping truth
 *     table, with rows for a shell, a record with nothing on disk, droid and a
 *     record read `ok` that held nothing. The call layer drives
 *     `sessionActivity` itself over a fake manifest and a scratch home. It
 *     also fails when a dash comes back as a zero, when a row decided without
 *     a read reaches the store, when the answer is not in the asked order,
 *     when more ids than the cap are answered, and when the aggregate's query
 *     plan scans a table instead of reading it by its keys.
 *
 * TWO MODES. The default runs the product reader in src/main/overview/. With
 * `--reference` it runs the research 63 reference reader instead, which still
 * carries the seven defects, so the defect assertions are INVERTED: the gate
 * proves its own derived fixtures bite. That mode is how this gate was proved
 * before the product reader existed, and it stays useful as a control.
 *
 * ONE MORE MODE for the verifier: `--real <file> --provider <p> --repo <dir>`
 * reads one real log read only, prints its path index beside the repo's own
 * `git log --name-only`, and writes nothing.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const referenceMode = args.includes('--reference');
const argOf = (k) => {
  const i = args.indexOf(k);
  return i === -1 ? null : (args[i + 1] ?? null);
};

const readerEntry = join(root, 'src', 'main', 'overview', 'reader', 'index.ts');
if (!referenceMode && !existsSync(readerEntry)) {
  process.stderr.write(
    'FAIL: product mode needs src/main/overview/reader/index.ts and it is not in the tree.\n' +
      'While the reader is being built, prove the gate itself with:\n' +
      '  node build/conformance-overview.mjs --reference\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The probe run
// ---------------------------------------------------------------------------

const env = { ...process.env, OVERVIEW_READER: referenceMode ? 'reference' : 'product' };

const realFile = argOf('--real');
if (realFile !== null) {
  const provider = argOf('--provider');
  const repo = argOf('--repo');
  if (provider === null || repo === null) {
    process.stderr.write('FAIL: --real needs --provider <p> and --repo <path>.\n');
    process.exit(1);
  }
  env.OVERVIEW_REAL = JSON.stringify({ file: realFile, provider, repo });
}

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/overview-conformance-probe.mts'],
  { encoding: 'utf8', cwd: root, env, maxBuffer: 64 * 1024 * 1024 }
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

// ---------------------------------------------------------------------------
// The real-file mode prints and stops. It asserts nothing.
// ---------------------------------------------------------------------------

if (realFile !== null) {
  const r = data.real;
  process.stdout.write(`\none real file, read only: ${r.file}\n`);
  process.stdout.write(`provider ${r.provider}, ${String(r.turns)} turns\n`);
  if (r.error) process.stdout.write(`the read failed: ${r.error}\n`);
  process.stdout.write('\npath index from the log:\n');
  for (const p of r.paths ?? []) process.stdout.write(`  ${p}\n`);
  const log = spawnSync('git', ['-C', argOf('--repo'), 'log', '--name-only', '--format=%ct'], {
    encoding: 'utf8'
  });
  process.stdout.write('\ngit log --name-only for the repo:\n');
  process.stdout.write(
    (log.stdout || log.stderr || '')
      .split('\n')
      .slice(0, 200)
      .map((l) => `  ${l}`)
      .join('\n') + '\n'
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// What yesterday looked like. Counts from research 63 verify.js. Ratios
// measured over these fixtures with the reference reader on 2026-08-23.
// ---------------------------------------------------------------------------

const EXPECT = [
  {
    p: 'claude',
    turns: 3,
    answers: 3,
    ratio: 0.0413,
    banned: [
      'task-notification',
      'This session is being continued',
      'Another Claude session',
      'local-command-stdout',
      'session limit'
    ]
  },
  {
    p: 'codex',
    turns: 3,
    answers: 3,
    ratio: 0.078,
    banned: [
      '<environment_context>',
      'AGENTS.md instructions',
      'codex_internal_context',
      'turn_aborted',
      'attachments/'
    ],
    joinId: '0000aaaa-1111-7000-8000-222233334444'
  },
  { p: 'grok', turns: 3, answers: 3, ratio: 0.0402, banned: ['system-reminder', 'Background subagent'] },
  {
    p: 'antigravity',
    turns: 3,
    answers: 2,
    ratio: 0.1049,
    banned: ['ADDITIONAL_METADATA', 'USER_SETTINGS_CHANGE', 'Created At:', 'CHECKPOINT', 'not actually sent by the user']
  },
  { p: 'qwen', turns: 4, answers: 4, ratio: 0.063, banned: ['task-notification', '<state_snapshot>', 'functionResponse'] },
  { p: 'pi', turns: 2, answers: 2, ratio: 0.0628, banned: ['Please rewrite the whole module', 'Checking the size now.'] },
  { p: 'omp', turns: 2, answers: 2, ratio: 0.0613, banned: ['Please rewrite the whole module', 'Checking the size now.'] },
  { p: 'muse', turns: 2, answers: 2, ratio: 0.0281, banned: ['Role: demo-worker', 'Let me list them.'] },
  {
    p: 'gemini',
    turns: 3,
    answers: 3,
    ratio: 0.0987,
    banned: ['<session_context>', 'Content from referenced files', 'Update successful']
  },
  { p: 'deepseek', turns: 3, answers: 1, ratio: 0.069, banned: ['<turn_meta>', 'Path escapes workspace'] },
  { p: 'cursor', turns: 3, answers: 2, ratio: 0.0137, banned: ['<user_info>', 'Looking at the workspace'] },
  {
    p: 'cursoride',
    turns: 3,
    answers: 3,
    ratio: 0.016,
    banned: ['Base directory for this skill', 'Request interrupted by user', '<tool-use>']
  },
  { p: 'copilotide', turns: 2, answers: 2, ratio: 0.0673, banned: ['renderedUserMessage', 'toolCallResults'] }
];

const RATIO_TOLERANCE = 0.05;

// ---------------------------------------------------------------------------
// Phase 293. The session manager's counts, beside EXPECT. Written BY HAND from
// the per-provider truth table in build/p293/SPEC.md section 3.4, never read
// back from the code, so a change to the aggregate or to the truth table that
// the spec did not make turns this gate red. `user` is SUM(queued) and never
// the turn count, which is why codex reads 4 over 3 turns. `agent` is closing
// replies on record, at most one per turn. A null is a DASH and is compared
// as a null: nothing here may come back as a zero.
// ---------------------------------------------------------------------------

const ACTIVITY_EXPECT = [
  { row: 'claude', user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'codex', user: 4, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'grok', user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  // The last turn holds no answer, so the last author is the person.
  { row: 'antigravity', user: 3, agent: 2, coverage: 'complete', reason: null, by: 'you', clock: 'message' },
  { row: 'qwen', user: 4, agent: 4, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'pi', user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'omp', user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'muse', user: 2, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  // Real gemini files hold an answer in 1 of 216, so the row is partial
  // whatever this one fixture holds.
  { row: 'gemini', user: 3, agent: 3, coverage: 'partial', reason: 'ask-only', by: 'agent', clock: 'message' },
  // No time on either slot: the record's own updated time, clock SESSION.
  { row: 'deepseek', user: 3, agent: 1, coverage: 'complete', reason: null, by: 'you', clock: 'session' },
  // The last turn holds a reply that carries no time: the PROMPT's time,
  // clock ASK, and never `message` over the prompt's time.
  { row: 'cursor', user: 3, agent: 2, coverage: 'complete', reason: null, by: 'agent', clock: 'ask' },
  { row: 'shell', user: null, agent: null, coverage: 'not-applicable', reason: 'shell', by: null, clock: null },
  { row: 'no-file', user: null, agent: null, coverage: 'unavailable', reason: 'not-yet', by: null, clock: null },
  { row: 'droid', user: null, agent: null, coverage: 'unavailable', reason: 'no-store', by: null, clock: null },
  // The one zero: a record WAS read and held no message Tortie keeps.
  { row: 'ok, zero turns', user: 0, agent: 0, coverage: 'complete', reason: null, by: null, clock: null }
];

/** The same answers through `sessionActivity` itself, in the ASKED order. */
const ORCHESTRATION_EXPECT = [
  { row: 'on another machine', user: null, agent: null, coverage: 'unavailable', reason: 'remote', by: null, clock: null },
  { row: 'live, read through the scratch home', user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'not in the manifest', user: null, agent: null, coverage: 'unavailable', reason: 'unknown-session', by: null, clock: null },
  { row: 'shell', user: null, agent: null, coverage: 'not-applicable', reason: 'shell', by: null, clock: null },
  { row: 'removed, still answered', user: 3, agent: 3, coverage: 'complete', reason: null, by: 'agent', clock: 'message' },
  { row: 'nothing on disk', user: null, agent: null, coverage: 'unavailable', reason: 'not-yet', by: null, clock: null },
  { row: 'ok, zero turns', user: 0, agent: 0, coverage: 'complete', reason: null, by: null, clock: null },
  { row: 'no conversation id', user: null, agent: null, coverage: 'unavailable', reason: 'no-id', by: null, clock: null },
  { row: 'droid', user: null, agent: null, coverage: 'unavailable', reason: 'no-store', by: null, clock: null }
];

const failures = [];
const fail = (s) => failures.push(s);

const cases = data.cases;
const textsOf = (c) =>
  (c?.turns ?? []).map((t) => t.askText + '\n' + (t.answerText ?? '')).join('\n');
const asksOf = (c) => (c?.turns ?? []).map((t) => t.askText);
const answersOf = (c) => (c?.turns ?? []).filter((t) => t.answerText !== null);

// ---------------------------------------------------------------------------
// 1 and 2. The slot matrix, the banned strings, the ratios, the cache key
// ---------------------------------------------------------------------------

const rows = [];
for (const e of EXPECT) {
  const c = cases[`base-${e.p}`];
  if (!c || !c.ok) {
    fail(`${e.p}: the fixture did not read at all (${c ? c.error : 'no case'}).`);
    rows.push([e.p, 'failed', '', '', '', '', '']);
    continue;
  }
  const answers = answersOf(c).length;
  if (c.turns.length !== e.turns) fail(`${e.p}: ${String(c.turns.length)} turns, yesterday ${String(e.turns)}.`);
  if (answers !== e.answers) fail(`${e.p}: ${String(answers)} answers, yesterday ${String(e.answers)}.`);
  const all = textsOf(c);
  for (const b of e.banned) {
    if (all.includes(b)) fail(`${e.p}: the trap string ${JSON.stringify(b)} leaked into a kept ask or answer.`);
  }
  if (!c.watermark) fail(`${e.p}: the watermark slot is empty.`);
  if (e.joinId !== undefined && c.joinSessionId !== e.joinId) {
    fail(`${e.p}: the join slot lost its session id (got ${JSON.stringify(c.joinSessionId)}).`);
  }
  const ratio = c.size > 0 ? c.keptBytes / c.size : 0;
  if (ratio === 0 && e.ratio > 0) fail(`${e.p}: the keep ratio fell to zero. The page would be empty.`);
  else if (Math.abs(ratio - e.ratio) > RATIO_TOLERANCE) {
    fail(`${e.p}: the keep ratio moved to ${ratio.toFixed(4)}, banked ${e.ratio.toFixed(4)}.`);
  }
  const second = cases[`second-${e.p}`];
  if (!second) fail(`${e.p}: no second read ran, so the cache key is unproved.`);
  else if (second.work !== 'none' || second.bytesRead !== 0) {
    fail(
      `${e.p}: a second read of the unchanged file did work "${String(second.work)}" and read ` +
        `${String(second.bytesRead)} bytes. It must do nothing.`
    );
  }
  const slots = [
    c.turns.length > 0 ? 'ask' : '----',
    answers > 0 ? 'answer' : '------',
    c.turns.length > 0 ? 'boundary' : '--------',
    c.joinSessionId || c.joinCwd || c.joinFile ? 'join' : '----',
    c.watermark ? 'watermark' : '---------'
  ].join(' ');
  rows.push([
    e.p,
    `${String(c.turns.length)} turns, ${String(answers)} answers`,
    slots,
    c.prefilter,
    c.turnMode,
    `${ratio.toFixed(4)} / ${e.ratio.toFixed(4)}`,
    c.droppedTotal === null ? '-' : String(c.droppedTotal)
  ]);
}

// droid never reads a file. Its honest line comes from the map.
if (data.map.droidContainer !== 'none' || !data.map.droidHonest) {
  fail('droid: the map must hold container "none" and a non empty honest sentence.');
}
rows.push(['droid', 'honest line', data.map.droidHonest ? 'honest' : 'MISSING', '-', '-', '-', '-']);

// ---------------------------------------------------------------------------
// 3. The two lab bugs, on the trap fixture, in both modes
// ---------------------------------------------------------------------------

const traps = cases['claude-traps'];
const trapAsks = asksOf(traps).join('\n');
if (!traps || !traps.ok) fail('claude-traps: the trap fixture did not read.');
else {
  if (trapAsks.includes('task-notification') || trapAsks.includes('A task you started has an update')) {
    fail('claude-traps: a task notification was counted as an ask. That inflation was measured at 105.8 percent.');
  }
  if (trapAsks.includes('This session is being continued')) {
    fail("claude-traps: claude's compaction handover was counted as an ask.");
  }
  if (!trapAsks.includes('Can you check whether the release script')) {
    fail('claude-traps: the genuine first ask went missing. A trap rule is dropping real asks.');
  }
}

// ---------------------------------------------------------------------------
// 4. The seven defects. Asserted fixed in product mode. Asserted to BITE in
// reference mode, which is what proves the derived fixtures are real tests.
// ---------------------------------------------------------------------------

const defects = [];
const defect = (name, wantProduct, wantReference, pass, got) => {
  defects.push([name, referenceMode ? wantReference : wantProduct, pass ? 'pass' : 'FAIL', got]);
  if (!pass) fail(`defect check "${name}": wanted ${referenceMode ? wantReference : wantProduct}, got ${got}.`);
};

const base = (p) => cases[`base-${p}`];
const sorted = cases['claude-sorted'];
const reordered = cases['codex-reordered'];
const noMarkers = cases['codex-nomarkers'];
const inApp = cases['codex-inapp'];
const cursorOffset = cases['cursor-offset'];
const changed = cases['claude-changed'];

const sameTexts = (a, b) => JSON.stringify(a?.turns ?? null) === JSON.stringify(b?.turns ?? null);

if (referenceMode) {
  defect(
    '1 claude sorted keys',
    '',
    'the reference reader loses the turns',
    sorted.turns.length < 3,
    `${String(sorted.turns.length)} turns of 3`
  );
  defect(
    '3 codex payload first',
    '',
    'the reference reader loses the turns',
    reordered.turns.length < 3,
    `${String(reordered.turns.length)} turns of 3`
  );
  defect(
    '4 codex 0.87 no markers',
    '',
    'the reference reader folds one giant turn',
    noMarkers.turns.length === 1,
    `${String(noMarkers.turns.length)} turns`
  );
  defect(
    '5 codex unwrap gate',
    '',
    'the wrapper leaks into an ask',
    textsOf(inApp).includes('# In app browser:'),
    textsOf(inApp).includes('# In app browser:') ? 'leaked as expected' : 'did not leak'
  );
  defect(
    '6 cursor 24 byte probe',
    '',
    'the 24 byte probe misses every answer',
    answersOf(cursorOffset).length < 2 && data.map.blobProbeBytes === 24,
    `${String(answersOf(cursorOffset).length)} answers, probe ${String(data.map.blobProbeBytes)} bytes`
  );
  defect(
    '2 widened claude drops',
    '',
    'the three shapes become false asks',
    traps.turns.length === 6,
    `${String(traps.turns.length)} turns, wanted exactly 6`
  );
  defect(
    '7 equal length rewrite',
    '',
    'the stale watermark reports no change',
    changed.work === 'none',
    `work ${String(changed.work)}`
  );
} else {
  defect(
    '1 claude sorted keys',
    'the wide fallback fires and nothing is lost',
    '',
    sorted.ok && sameTexts(sorted, base('claude')) && sorted.prefilter === 'wide',
    `${String(sorted.turns.length)} turns, prefilter ${sorted.prefilter}`
  );
  defect(
    '3 codex payload first',
    'the wide fallback fires and nothing is lost',
    '',
    reordered.ok && sameTexts(reordered, base('codex')) && reordered.prefilter === 'wide',
    `${String(reordered.turns.length)} turns, prefilter ${reordered.prefilter}`
  );
  const baseAskConcat = asksOf(base('codex')).join('\n\n');
  const derivedAskConcat = asksOf(noMarkers).join('\n\n');
  defect(
    '4 codex 0.87 no markers',
    'the ask to ask fold recovers the same asks',
    '',
    noMarkers.ok &&
      noMarkers.turnMode === 'ask-to-ask' &&
      derivedAskConcat === baseAskConcat &&
      answersOf(noMarkers).length >= 1,
    `turnMode ${noMarkers.turnMode}, asks ${derivedAskConcat === baseAskConcat ? 'equal' : 'DIFFER'}`
  );
  const inAppText = textsOf(inApp);
  defect(
    '5 codex unwrap gate',
    'the browser wrapper unwraps and the bare manifest drops',
    '',
    inApp.ok &&
      !inAppText.includes('In app browser') &&
      !inAppText.includes('attachments/') &&
      inAppText.includes('What does this page say the flag does?'),
    inAppText.includes('In app browser') ? 'the wrapper leaked' : 'clean'
  );
  defect(
    '6 cursor 32 byte probe',
    'the 32 byte probe sees a marker that closes at byte 30',
    '',
    cursorOffset.ok &&
      cursorOffset.turns.length === 3 &&
      answersOf(cursorOffset).length === 2 &&
      data.map.blobProbeBytes === 32,
    `${String(answersOf(cursorOffset).length)} answers of 2, probe ${String(data.map.blobProbeBytes)} bytes`
  );
  defect(
    '2 widened claude drops',
    'the three false ask shapes drop, the teamName ask stays',
    '',
    traps.ok &&
      traps.turns.length === 3 &&
      !trapAsks.includes('[Request interrupted by user for tool use]') &&
      !trapAsks.includes('teammate-message') &&
      !trapAsks.includes('bash-notification'),
    `${String(traps.turns.length)} turns of 3`
  );
  defect(
    '7 equal length rewrite',
    'a changed byte forces a full read',
    '',
    changed.work === 'full' && data.changedSizeEqual === true,
    `work ${String(changed.work)} at equal size ${String(data.changedSizeEqual)}`
  );
  if (textsOf(cases['base-cursoride']).includes('[Image: source:')) {
    fail('cursoride: an [Image: source: line leaked into a kept text.');
  }
}

// ---------------------------------------------------------------------------
// 5. The map file itself, when it is in the tree
// ---------------------------------------------------------------------------

const mapPath = join(root, 'src', 'main', 'overview', 'keep-map.json');
if (existsSync(mapPath)) {
  try {
    const m = JSON.parse(readFileSync(mapPath, 'utf8'));
    for (const [p, cfg] of Object.entries(m.providers ?? {})) {
      if (typeof cfg.version !== 'number' || cfg.version < 1) {
        fail(`keep-map.json: provider ${p} carries no version, so the store cannot invalidate on a map change.`);
      }
    }
  } catch (err) {
    fail(`keep-map.json does not parse: ${err.message}`);
  }
} else if (!referenceMode) {
  fail('src/main/overview/keep-map.json is not in the tree.');
}

// ---------------------------------------------------------------------------
// 6. Product only: resolver, redaction, crash, path index, source scans
// ---------------------------------------------------------------------------

const skips = [];

if (!referenceMode) {
  const prod = data.product ?? {};
  for (const r of prod.resolver ?? []) {
    if (r.state === 'threw') fail(`resolver ${r.provider}: threw ${String(r.error)}.`);
    else if (r.state !== r.want) fail(`resolver ${r.provider}: state ${r.state}, wanted ${r.want}.`);
    else if (r.want === 'resolved' && r.fileMatches === false) {
      fail(`resolver ${r.provider}: resolved ${String(r.file)}, and the fixture sits at ${String(r.placed)}.`);
    }
  }
  const red = prod.redaction ?? { ran: false, why: 'the probe returned no redaction result' };
  if (!red.ran) skips.push(`redaction: skipped, ${red.why}`);
  else if (!red.ok) {
    fail(
      `redaction: ${red.leaked && red.leaked.length ? 'raw values survived into the store bytes: ' + red.leaked.join(', ') : red.why ?? 'the marker or the kept project path is missing'}.`
    );
  }
  const crash = prod.crash ?? { ran: false, why: 'the probe returned no crash result' };
  if (!crash.ran) skips.push(`crash: skipped, ${crash.why}`);
  else if (!crash.ok) fail(`crash: after a kill mid write, integrity ${String(crash.integrity)}, contiguous ${String(crash.contiguous)} (${String(crash.why ?? '')}).`);

  const claudePaths = base('claude')?.paths ?? [];
  if (!claudePaths.includes('scripts/release.sh')) {
    fail('path index: the claude fixture Bash command names scripts/release.sh and the index does not.');
  }
  const codexPaths = base('codex')?.paths ?? [];
  if (!codexPaths.some((p) => p.includes('nest_counter.py'))) {
    fail('path index: the codex fixture names src/nest_counter.py and the index does not.');
  }

  for (const [p, v] of Object.entries(data.map.providerVersions ?? {})) {
    if (typeof v !== 'number' || v < 1) fail(`the loaded map's ${p} entry carries no version.`);
  }
  if (!data.map.mapHash) fail('keepMapHash() returned nothing, so the store cannot bind reads to map bytes.');

  // The status scan. Nothing on this surface may set a session's status.
  const scanDirs = [join(root, 'src', 'main', 'overview'), join(root, 'src', 'renderer', 'overview')];
  const bannedSource = ['setStatus', 'applyStatus', "sessions:status"];
  // __tests__ is excluded because the no-status test names the banned words
  // on purpose, being the strings it asserts are absent.
  const walk = (dir) => {
    if (!existsSync(dir)) return [];
    const out = [];
    for (const name of readdirSync(dir)) {
      if (name === '__tests__') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx|css|json)$/.test(name)) out.push(p);
    }
    return out;
  };
  for (const dir of scanDirs) {
    if (!existsSync(dir)) {
      skips.push(`status scan: ${dir.slice(root.length + 1)} is not in the tree yet`);
      continue;
    }
    for (const file of walk(dir)) {
      const text = readFileSync(file, 'utf8');
      for (const b of bannedSource) {
        if (text.includes(b)) fail(`${file.slice(root.length + 1)} names ${b}. Nothing here may set a session's status.`);
      }
    }
  }
} else {
  skips.push('resolver, redaction, crash, path index, status scan: product mode only');
}

// ---------------------------------------------------------------------------
// 8. Product only: the session manager's counts (Phase 293)
// ---------------------------------------------------------------------------

const activityRows = [];

/**
 * One answer against its expected row, field by field, and against the two
 * invariants every answer keeps whatever its row.
 */
const checkActivity = (where, want, got) => {
  if (got === undefined) {
    fail(`activity ${where} "${want.row}": no answer came back.`);
    activityRows.push([where, want.row, 'MISSING', '', '', '', '', '']);
    return;
  }
  if (got.error !== undefined) {
    fail(`activity ${where} "${want.row}": the fixture did not read (${got.error}).`);
    activityRows.push([where, want.row, 'failed', '', '', '', '', '']);
    return;
  }
  for (const [field, key] of [
    ['coverage', 'coverage'],
    ['reason', 'reason'],
    ['user', 'user'],
    ['agent', 'agent'],
    ['by', 'by'],
    ['clock', 'clock']
  ]) {
    if (got[key] !== want[field]) {
      fail(
        `activity ${where} "${want.row}": ${field} ${JSON.stringify(got[key])}, the spec's truth table says ${JSON.stringify(want[field])}.`
      );
    }
  }
  // Invariant 1. A dash carries no value at all.
  if (got.coverage === 'unavailable' || got.coverage === 'not-applicable') {
    if ([got.user, got.agent, got.at, got.by, got.clock].some((v) => v !== null)) {
      fail(`activity ${where} "${want.row}": ${got.coverage} carries a value. It must carry five nulls.`);
    }
  }
  // Invariant 2. A record that was read always carries a NUMBER of asks.
  if ((got.coverage === 'complete' || got.coverage === 'partial') && typeof got.user !== 'number') {
    fail(`activity ${where} "${want.row}": ${got.coverage} with no number of asks.`);
  }
  if ((got.reason === null) !== (got.coverage === 'complete')) {
    fail(`activity ${where} "${want.row}": the reason is ${JSON.stringify(got.reason)} under ${got.coverage}.`);
  }
  if ((got.clock === null) !== (got.at === null)) {
    fail(`activity ${where} "${want.row}": a time with no clock, or a clock with no time.`);
  }
  // A clock the table names must come with a time that parsed.
  if (want.clock !== null && typeof got.at !== 'number') {
    fail(`activity ${where} "${want.row}": clock ${String(want.clock)} with no time.`);
  }
  activityRows.push([
    where,
    want.row,
    `${String(got.coverage)}${got.reason === null ? '' : ` / ${String(got.reason)}`}`,
    got.user === null ? '-' : String(got.user),
    got.agent === null ? '-' : String(got.agent),
    got.by === null ? '-' : String(got.by),
    got.clock === null ? '-' : String(got.clock),
    got.storedTurns === null ? 'NULL' : String(got.storedTurns)
  ]);
};

if (!referenceMode) {
  const act = data.product?.activity ?? { ran: false, why: 'the probe returned no activity result' };
  if (!act.ran) skips.push(`activity: skipped, ${act.why}`);
  else if (act.failed !== undefined) fail(`activity: the check threw. ${act.failed}`);
  else {
    const byLabel = (list, label) => (list ?? []).find((r) => r.label === label);
    for (const want of ACTIVITY_EXPECT) checkActivity('store', want, byLabel(act.rows, want.row));
    if ((act.rows ?? []).length !== ACTIVITY_EXPECT.length) {
      fail(`activity store: ${String((act.rows ?? []).length)} rows came back for ${String(ACTIVITY_EXPECT.length)} asked.`);
    }
    // The store's NULL for a session that holds no turn stays NULL. It is the
    // mapping, and only under `ok`, that ever turns it into a zero.
    for (const label of ['shell', 'no-file', 'droid', 'ok, zero turns']) {
      const r = byLabel(act.rows, label);
      if (r === undefined) continue;
      for (const [what, v] of [
        ['turns', r.storedTurns],
        ['asks', r.storedUser],
        ['replies', r.storedAgent]
      ]) {
        if (v !== null) {
          fail(`activity store "${label}": the aggregate answered ${JSON.stringify(v)} ${what} for a session that holds no turn. It must be NULL.`);
        }
      }
    }
    for (const want of ORCHESTRATION_EXPECT) checkActivity('call', want, byLabel(act.orchestration, want.row));
    if (JSON.stringify(act.answered) !== JSON.stringify(act.asked)) {
      fail(`activity call: answered ${JSON.stringify(act.answered)} for ${JSON.stringify(act.asked)}. One row per asked id, in the asked order.`);
    }
    // The rows decided without a read never reach the store. The row on
    // another machine names a record that IS on disk here, so a dead remote
    // guard would have written it.
    for (const label of ['on another machine', 'not in the manifest', 'shell', 'no conversation id']) {
      const r = byLabel(act.orchestration, label);
      if (r !== undefined && r.storedState !== 'no row') {
        fail(`activity call "${label}": the store holds a ${String(r.storedState)} row for it. It must never have been read.`);
      }
    }
    if (act.refusal !== 'INVALID_INPUT') {
      fail(`activity call: 201 ids answered ${JSON.stringify(act.refusal)}. More than the cap is refused whole as INVALID_INPUT.`);
    }
    // The plan. Both reads of `turn` go through its primary key, and no table
    // of the store is ever scanned, whatever the store holds.
    const plan = act.plan ?? [];
    if (!plan.some((l) => /^SEARCH turn USING (COVERING )?INDEX sqlite_autoindex_turn_1 \(session_id=\?\)$/.test(l))) {
      fail(`activity plan: the aggregate does not read \`turn\` by its key. Plan: ${JSON.stringify(plan)}.`);
    }
    if (!plan.some((l) => /^SEARCH l USING INDEX sqlite_autoindex_turn_1 \(session_id=\? AND turn_index=\?\)/.test(l))) {
      fail(`activity plan: the last turn is not read by the whole key. Plan: ${JSON.stringify(plan)}.`);
    }
    for (const line of plan) {
      if (/\bSCAN (turn|l|s|session)\b/.test(line)) fail(`activity plan: "${line}". The aggregate must never scan the store.`);
    }
  }
} else {
  skips.push('activity: product mode only');
}

// ---------------------------------------------------------------------------
// The tables, printed whatever the verdict
// ---------------------------------------------------------------------------

const pad = (v, w) => String(v).padEnd(w);

process.stdout.write(
  `\nPhase 137 overview conformance, ${referenceMode ? 'REFERENCE reader (defect checks inverted)' : 'product reader'}\n\n`
);
process.stdout.write(
  pad('agent', 12) + pad('result', 21) + pad('slots filled', 42) + pad('prefilter', 10) + pad('turnMode', 11) + pad('ratio/banked', 17) + 'traps dropped\n'
);
process.stdout.write('-'.repeat(120) + '\n');
for (const r of rows) {
  process.stdout.write(
    pad(r[0], 12) + pad(r[1], 21) + pad(r[2], 42) + pad(r[3], 10) + pad(r[4], 11) + pad(r[5], 17) + r[6] + '\n'
  );
}

process.stdout.write('\ndefect checks\n');
process.stdout.write(pad('defect', 26) + pad('this mode must show', 52) + pad('verdict', 9) + 'measured\n');
process.stdout.write('-'.repeat(120) + '\n');
for (const d of defects) {
  process.stdout.write(pad(d[0], 26) + pad(d[1], 52) + pad(d[2], 9) + d[3] + '\n');
}

if (activityRows.length > 0) {
  process.stdout.write('\nthe session manager\'s counts (Phase 293), against the spec\'s truth table\n');
  process.stdout.write(
    pad('through', 8) + pad('row', 37) + pad('coverage / reason', 32) + pad('you', 5) + pad('agent', 7) + pad('last by', 9) + pad('clock', 9) + 'stored turns\n'
  );
  process.stdout.write('-'.repeat(120) + '\n');
  for (const r of activityRows) {
    process.stdout.write(
      pad(r[0], 8) + pad(r[1], 37) + pad(r[2], 32) + pad(r[3], 5) + pad(r[4], 7) + pad(r[5], 9) + pad(r[6], 9) + r[7] + '\n'
    );
  }
}

if (skips.length > 0) {
  process.stdout.write('\nnot checked in this run\n');
  for (const s of skips) process.stdout.write(`  - ${s}\n`);
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${String(failures.length)}:\n`);
  for (const f of failures) process.stdout.write(`  - ${f}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. Every mapped provider fills its slots at yesterday\'s counts, no trap ' +
    'string leaked, the ratios sit on their bank, the cache key costs nothing on an ' +
    'unchanged file, and every defect check answered for this mode.' +
    (activityRows.length > 0
      ? ' The session manager\'s counts match the spec\'s truth table row for row, no dash came ' +
        'back as a zero, and the aggregate reads the store by its keys.'
      : '') +
    '\n'
);
