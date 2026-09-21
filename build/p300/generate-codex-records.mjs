#!/usr/bin/env node
/**
 * generate-codex-records.mjs. The five codex records `probe:p300` reads
 * (Phase 300, build/p300/SPEC.md §6.2).
 *
 * ## IT READS NOTHING OF THE PERSON'S, AND THAT IS THE WHOLE REASON IT EXISTS
 *
 * The measurements Phase 300 is built against were taken over the operator's
 * own store on 2026-09-19 — 26,312 codex records at 11.76 GB, the largest
 * 959.5 MiB — and they are recorded in `docs/BACKLOG.md:31852` and `:31854`.
 * **No builder, probe or gate in this phase re-measures them.** Reading a
 * 959 MiB file of somebody's conversation to check a timing would be slow and
 * would be a privacy breach, so every byte this probe reads is a byte this
 * file wrote, grown from the COMMITTED fixture
 * `docs/research/assets/63-fixtures/codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl`
 * (9,956 bytes, 30 lines since Phase 299 gave it a fourth turn; it held 26
 * lines and 8,731 bytes when this generator was first written, and lines 1 to
 * 11 did not move).
 *
 * It spawns nothing, launches no Electron, starts no tmux server, makes no
 * request and reads nothing under the person's home. Its only write is under
 * the scratch HOME it is handed, and `remove()` takes every byte back; the
 * caller calls it from a `finally`.
 *
 * ## The five records, and why these sizes
 *
 * The Phase 300 entry measured the operator's distribution: p50 68,260
 * bytes, p99 5,954,144, 15 records above 100 MiB and 7 at or above 196 MiB,
 * the largest 1,006,098,515 bytes. So the first four are **p50 (68 KB), p99
 * (5.9 MB), 200 MiB and 960 MiB**: the two a person meets constantly, the one
 * the verifier's 797 ms was measured on, and the one the phase's open bound is
 * about. The fifth, `page`, is a SECOND 200 MiB record under its own id, and it
 * exists because the fix round gave the probe a page-read arm: Catch Me Up's
 * read of a large record that NO counts read has touched, so the arm measures
 * the page's own full read and not a stat and a tail after the sheet's.
 * `P300_SIZES` names a subset for a cheaper run, and 960 MiB is the one a
 * developer will want to leave out.
 *
 * ## HOW A RECORD IS GROWN, AND THE ONE RULE IT OBEYS
 *
 * **No count may move.** Phase 300 is about TIME; a changed count is a
 * regression here and belongs to Phase 299. So a record is grown by repeating
 * ONE kind of line: an `item_completed` whose `item.type` is
 * `CommandExecution`, which the fixture already carries at line 11. Read
 * `src/main/overview/keep-map.json`'s codex block: `ask.when` names
 * `user_message` and `item_completed`/`UserMessage`, `answer.when` names
 * `agent_message`, `item_completed`/`AgentMessage` and `task_complete`, and
 * `turn.open`/`turn.close` name `task_started`/`task_complete`. A
 * `CommandExecution` record is named by NONE of them. It is read by
 * `codex.paths.from`, `payload.item.command`, and by nothing else.
 *
 * A record grown this way holds **turn count, ask count, reply count and both
 * clocks identical to the fixture's own** however large it grows, and every
 * padding line carries a DISTINCT command string, so the path index a read
 * builds is real work and not a deduplicated one-entry map. THE SHAPE IS
 * STATED BESIDE EVERY NUMBER IT PRODUCES: a record padded this way is 100
 * percent `item_completed` lines outside its 30 fixture lines, where the
 * operator's own 186.8 MiB record is 58 percent, so a reading on it is a
 * reading on the heaviest shape and not on his.
 *
 * The lines the fixture holds are kept in their own order around the padding:
 * lines 1..11 (`session_meta`, the first turn's open, its asks, its first
 * `CommandExecution`), then the padding, then lines 12..30. The session id,
 * the thread id and the file name are rewritten per record so the resolver
 * finds each one by its own id.
 *
 * ## Where the files land, and why there
 *
 * `src/main/overview/reader/resolve.ts:145-160`'s codex arm walks
 * `<CODEX_HOME|$HOME/.codex>/sessions/<YYYY>/<MM>/<DD>/`, newest day first,
 * from `now` back to `createdAt - DATE_SHARD_WINDOW_MS`, and accepts a name
 * that starts `rollout-` and ends `-<id>.jsonl`. So the records are written
 * into TODAY's shard under the scratch HOME and the seeded manifest rows carry
 * a `createdAt` of now.
 *
 * ## Usage
 *
 *   import { generateCodexRecords } from './generate-codex-records.mjs';
 *   const made = generateCodexRecords({ home, sizes: ['p50', 'p99'] });
 *   try { ... } finally { made.remove(); }
 *
 *   node build/p300/generate-codex-records.mjs --home <dir> [--sizes p50,p99]
 *
 * The standalone form is for a developer who wants to look at one, and it
 * KEEPS what it wrote and says so, because a file deleted before anybody can
 * open it is no use to a person. Nothing but the probe's own `finally` deletes.
 */

import { createHash } from 'node:crypto';
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

export const FIXTURE = join(
  repoRoot,
  'docs',
  'research',
  'assets',
  '63-fixtures',
  'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl'
);

/** The fixture's own session id, which every generated record replaces. */
const FIXTURE_ID = '0000aaaa-1111-7000-8000-222233334444';

const MiB = 1024 * 1024;

/**
 * The five records. `bytes` is the TARGET size; the generator lands at or just
 * above it, because it stops adding padding lines once the running total has
 * passed the target and then appends the fixture's tail.
 *
 * The ids are fixed rather than random so a run is reproducible and so a
 * failure names a file a person can find again. They are v4-shaped and they
 * are not any id of the operator's: `p300` reads in the first group on purpose.
 */
export const RECORDS = [
  { size: 'p50', id: 'p300aaaa-0001-4000-8000-000000000050', bytes: 68_260 },
  { size: 'p99', id: 'p300aaaa-0002-4000-8000-000000000099', bytes: 5_954_144 },
  { size: 'big', id: 'p300aaaa-0003-4000-8000-000000000200', bytes: 200 * MiB },
  { size: 'huge', id: 'p300aaaa-0004-4000-8000-000000000960', bytes: 960 * MiB },
  { size: 'page', id: 'p300aaaa-0005-4000-8000-000000000201', bytes: 200 * MiB }
];

/** The fixture's 30 lines, read once. */
function fixtureLines() {
  const text = readFileSync(FIXTURE, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length !== 30) {
    throw new Error(
      `the committed codex fixture holds ${String(lines.length)} lines and this generator was ` +
        'written against 30. Read it before changing this number: the split at line 11 is ' +
        "the first turn's CommandExecution and the padding goes after it."
    );
  }
  return lines;
}

/**
 * HOW LONG A PADDING LINE IS, AND WHY IT IS NOT SHORT.
 *
 * MEASURED FOR THE ENTRY over the operator's own 186.8 MiB record
 * (docs/BACKLOG.md:31856): **42,018 lines**, of which the `item_completed` rule
 * admitted **13,946 lines holding 107.4 MiB** — so one of his big records'
 * `item_completed` lines averages about **7.7 KiB**, and the whole file averages
 * about 4.45 KiB a line.
 *
 * THE FIRST DRAFT OF THIS FILE PADDED WITH ~500 BYTE LINES AND MEASURED
 * SOMETHING ELSE. A 200 MiB record then held about 420,000 lines against his
 * 42,018, and the decide stage — which allocates one Buffer per line before it
 * decides anything — read **1,062 ms** where the entry measured 33. Ten times
 * the lines is ten times the per-line work, so a short-lined fixture makes the
 * scan and the decide look like the cost and would have pointed this phase at
 * the wrong stage. That reading is kept here rather than deleted because it is
 * the reason for the constant.
 *
 * It is a knob, so a later round can re-measure rather than re-derive.
 */
const PADDING_LINE_BYTES = Number(process.env['P300_LINE_BYTES'] ?? '') || 7_700;

/**
 * One padding line: an `item_completed` whose item is a `CommandExecution`.
 *
 * It is built from the fixture's own line 11 by substitution rather than
 * written fresh, so every field codex's own map reads is the vendor's shape and
 * not this file's idea of it. `n` makes the command, the item id and the two
 * clocks distinct.
 */
function paddingLine(templateLine, id, n) {
  const obj = JSON.parse(templateLine);
  obj.ordinal = 10_000 + n;
  obj.payload.thread_id = id;
  obj.payload.item.id = `item_pad_${String(n)}`;
  // A DISTINCT path per line, so the parent's path index is real work. The
  // shape is the fixture's own `sed -n '1,40p' <path>` form.
  obj.payload.item.command = `sed -n '1,40p' src/generated/p300/module_${String(n)}.py`;
  obj.payload.item.status = 'completed';
  obj.timestamp = new Date(1_787_148_572_500 + n).toISOString();
  // The output is what carries the length, because that is where the length is
  // in a real record: a command's captured stdout. It is grown to the measured
  // average rather than to a round number.
  const body = `def step_${String(n)}(ledger):\n    return sum(1 for row in ledger if row.hatched)\n`;
  obj.payload.item.aggregated_output = body;
  const bare = JSON.stringify(obj).length + 1;
  if (bare < PADDING_LINE_BYTES) {
    const need = PADDING_LINE_BYTES - bare;
    obj.payload.item.aggregated_output =
      body + `# ${String(n)} `.padEnd(Math.max(1, need), 'output line of a captured command\\n');
  }
  return JSON.stringify(obj);
}

/** The fixture's lines with the fixture id rewritten to this record's. */
function retarget(line, id) {
  return line.split(FIXTURE_ID).join(id);
}

/**
 * Write the named records under `home`, and answer where each one landed.
 *
 * Synchronous on purpose: the caller is a probe's set up, the 960 MiB record is
 * about a gigabyte of sequential writes, and an asynchronous version would only
 * add a way for the probe to start driving before its own fixture exists. The
 * write goes out through one file descriptor in whole lines, so nothing here
 * holds a 960 MiB string in memory.
 */
export function generateCodexRecords(opts) {
  const home = opts.home;
  if (typeof home !== 'string' || home.trim() === '') {
    throw new Error('generateCodexRecords needs a scratch HOME to write under.');
  }
  const wanted =
    Array.isArray(opts.sizes) && opts.sizes.length > 0
      ? RECORDS.filter((r) => opts.sizes.includes(r.size))
      : RECORDS;
  if (wanted.length === 0) {
    throw new Error(
      `no record matches ${JSON.stringify(opts.sizes)}; the sizes are ${RECORDS.map((r) => r.size).join(', ')}.`
    );
  }

  const lines = fixtureLines();
  const headLines = lines.slice(0, 11);
  const tailLines = lines.slice(11);
  const template = lines[10];

  const now = new Date();
  const shard = join(
    home,
    '.codex',
    'sessions',
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  );
  mkdirSync(shard, { recursive: true });

  const made = [];
  for (const rec of wanted) {
    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = join(shard, `rollout-${stamp}-${rec.id}.jsonl`);
    const fd = openSync(file, 'w');
    let bytes = 0;
    let padded = 0;
    try {
      const head = headLines.map((l) => `${retarget(l, rec.id)}\n`).join('');
      bytes += writeSync(fd, head);
      const tail = tailLines.map((l) => `${retarget(l, rec.id)}\n`).join('');
      // Batch the padding so a 960 MiB record is not two million write() calls.
      let batch = '';
      while (bytes + batch.length + tail.length < rec.bytes) {
        padded += 1;
        batch += `${paddingLine(template, rec.id, padded)}\n`;
        if (batch.length >= 4 * MiB) {
          bytes += writeSync(fd, batch);
          batch = '';
        }
      }
      if (batch !== '') bytes += writeSync(fd, batch);
      bytes += writeSync(fd, tail);
    } finally {
      closeSync(fd);
    }
    const st = statSync(file);
    made.push({
      size: rec.size,
      id: rec.id,
      file,
      bytes: st.size,
      target: rec.bytes,
      paddingLines: padded,
      lines: lines.length + padded
    });
  }

  return {
    records: made,
    home,
    /**
     * Take every generated byte back. The caller calls this from a `finally`,
     * and it removes the sessions tree this run created rather than the whole
     * scratch HOME, because the HOME is the caller's to own.
     */
    remove() {
      rmSync(join(home, '.codex', 'sessions'), { recursive: true, force: true });
    }
  };
}

/**
 * The seed rows `GMUX_OVERVIEW_SEED` wants for these records, so the probe does
 * not spell the shape twice. `src/main/harness/overview-seed.ts:32-38` is the
 * shape, and it needs no new field for this phase: `agent`, `agentSessionId`,
 * `cwd` and `createdAt` are all it reads, and the codex resolver finds the file
 * from the id and the createdAt alone.
 */
export function seedRowsFor(made, cwd) {
  return made.records.map((r) => ({
    name: `p300-codex-${r.size}`,
    agent: 'codex',
    agentSessionId: r.id,
    cwd,
    createdAt: Date.now()
  }));
}

/**
 * A cheap identity for a generated file: the sha256 of its first 64 KiB, short.
 *
 * It exists so a report can say WHICH record a reading was taken on without
 * hashing a gigabyte, and so two runs can be shown to have read the same bytes.
 */
export function digestOfHead(file, bytes = 64 * 1024) {
  const buf = Buffer.allocUnsafe(bytes);
  const fd = openSync(file, 'r');
  try {
    const read = readSync(fd, buf, 0, bytes, 0);
    return createHash('sha256').update(buf.subarray(0, read)).digest('hex').slice(0, 16);
  } finally {
    closeSync(fd);
  }
}

// ---------------------------------------------------------------------------
// The standalone form
// ---------------------------------------------------------------------------

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argOf = (k) => {
    const i = process.argv.indexOf(k);
    return i === -1 ? null : (process.argv[i + 1] ?? null);
  };
  const home = argOf('--home');
  if (home === null) {
    process.stderr.write(
      'generate-codex-records: --home <dir> is required. It must be a SCRATCH home:\n' +
        '  node build/p300/generate-codex-records.mjs --home /private/tmp/p300-home --sizes p50,p99\n'
    );
    process.exit(2);
  }
  const sizesArg = argOf('--sizes');
  const sizes = sizesArg === null ? null : sizesArg.split(',').map((s) => s.trim());
  const t0 = Date.now();
  const made = generateCodexRecords({ home, ...(sizes === null ? {} : { sizes }) });
  for (const r of made.records) {
    process.stdout.write(
      `[p300-generate] ${r.size.padEnd(5)} ${String(r.bytes).padStart(13)} bytes  ` +
        `${String(r.lines).padStart(9)} lines (${String(r.paddingLines)} padding)  ${r.file}\n`
    );
  }
  process.stdout.write(
    `[p300-generate] wrote ${String(made.records.length)} record(s) in ${String(Date.now() - t0)} ms. ` +
      'KEPT on purpose: the standalone form deletes nothing, so a person can open one. ' +
      `Remove them with: rm -rf ${join(home, '.codex', 'sessions')}\n`
  );
}
