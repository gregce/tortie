#!/usr/bin/env node
/**
 * `npm run measure:p300-split`. THE STAGE SPLIT OF ONE FIRST READ, taken under
 * ELECTRON'S OWN ENGINE (Phase 300, build/p300/SPEC.md §7.1 and §7.2).
 *
 * ## What this is now, and what it was
 *
 * Phase 293's counts verifier measured up to **797 ms of main held** by one
 * row's first read of a 196 MB codex record. Phase 300's first build split that
 * time into stages with this script, read the parse as the cost, built a reduced
 * counts read on that reading — and was wrong on the engine that matters. This
 * script spawned `process.execPath`, which is node 22 / V8 12.4 on the
 * operator's machine, while main runs Electron 43's Node 24.18 / V8 15, and the
 * two answered the reduced read in OPPOSITE directions: about 2x faster under
 * node 22, 15 to 47 percent slower in the app. The judge's finding, in one
 * sentence: the reduced read copied each admitted line into a fresh Buffer,
 * scanned it and dropped it with no JS-heap allocation, and V8 15 never
 * scavenged, so the copies piled up as external memory to the size of the file.
 * The reduced read was removed and the phase landed its resolve cache alone.
 *
 * So this script is DEMOTED from the deciding instrument to a measurement, and
 * the demotion is mechanical rather than a sentence: it decides nothing and
 * exits 1 on nothing but a read that failed or two instruments that disagree.
 * And it now takes its stages under Electron's own node by default, through
 * `ELECTRON_RUN_AS_NODE=1` and the Electron binary under node_modules, and
 * prints `process.versions.v8` beside every reading so nobody can cite a number
 * from here without saying which engine took it. Whoever builds the next first
 * read — the queued one is the scanner not copying a line it is about to reject,
 * measured at 1122 ms on 960 MiB in the app with no block — starts here, on the
 * right engine.
 *
 * ## It launches no Electron APP and it reads nothing of the operator's
 *
 * It goes through `conformance:overview --real <file> --provider <p> --repo
 * <dir> --stages`, which runs the SHIPPING reader with no Electron app, no
 * tmux, no agent and no token (`reader/index.ts` promises the reader imports
 * neither Electron nor React, which is what makes this possible). Under
 * `ELECTRON_RUN_AS_NODE=1` the Electron binary IS a node: no window, no
 * renderer, no profile.
 *
 * **Its records are SYNTHESISED.** Every number the entry states about the
 * operator's store was measured on 2026-09-19 over 26,312 records at 11.76 GB
 * and is **not re-measurable here**; reading a 959 MiB file of his conversation
 * to check a timing would be slow and would be a privacy breach. So by default
 * this script generates its own codex records from the committed fixture through
 * `build/p300/generate-codex-records.mjs` and deletes every byte in a `finally`.
 * A synthesised record is 100 percent `item_completed` padding outside its 30
 * fixture lines, where his 186.8 MiB record is 58 percent; the shape is printed
 * beside the table.
 *
 * `--file <path> --provider <p>` points it at a file a person names, which is
 * how a verifier with permission drives it over one real record. It never goes
 * looking for one.
 *
 * ## The stages, and what `fold` is
 *
 *   scan       the chunk loop with no prefilter and a no-op callback
 *   decide     head + whole-line decide over the shipping rule set; it
 *              includes its own scan, because there is no way to hand
 *              `scanFile` a line without walking to it
 *   parse      `JSON.parse` of what the decide admitted
 *   read       the whole shipping `readSessionLog`, behind its own
 *              `perf_hooks.monitorEventLoopDelay` histogram
 *   fold       the RESIDUAL, `read - (decide + parse)`, attributed to
 *              `reader/fold.ts` and `reader/expr.ts` BY NAME
 *
 * `fold` is named a residual rather than a stage because those two are called
 * from inside the same loop the scan is, and timing them apart would mean
 * editing them. Calling it a residual is the honest reading.
 *
 * ## Usage
 *
 *   npm run measure:p300-split                    p50 and p99, about 3 s
 *   P300_SIZES=p50,p99,big npm run measure:p300-split         adds 200 MiB
 *   P300_SIZES=p50,p99,big,huge npm run measure:p300-split    adds 960 MiB
 *   node build/p300/split.mjs --file <log> --provider codex --repo <dir>
 *
 * `P300_SPLIT_ENGINE=node` takes the stages under the node that ran this
 * script instead, for the comparison that caught the first build; the engine
 * is printed either way. `P300_SPLIT_HOME` names where the generated records
 * go; the default is a directory under `out/p300-split/`, removed in a
 * `finally`. `P300_OUT` optionally writes the readings as JSON so a parent run
 * and a HEAD run can be diffed.
 *
 * Exit 0 when every chosen record read and the two instruments agree within
 * one frame. 1 when a read failed or the instruments disagree. 2 when it
 * refuses to run.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCodexRecords, digestOfHead } from './generate-codex-records.mjs';

const TAG = '[p300-split]';
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);
const argOf = (k) => {
  const i = process.argv.indexOf(k);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

/**
 * THE ENGINE. Electron's own node by default, because that is what main runs
 * and the first build's numbers were taken on the other one.
 */
const ELECTRON_BIN = join(
  repoRoot,
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'MacOS',
  'Electron'
);
const engineChoice = (process.env['P300_SPLIT_ENGINE'] ?? 'electron').trim();
let execPath;
let execEnv;
if (engineChoice === 'node') {
  execPath = process.execPath;
  execEnv = { ...process.env };
} else if (engineChoice === 'electron') {
  if (!existsSync(ELECTRON_BIN)) {
    process.stderr.write(
      `${TAG} ${ELECTRON_BIN} is not there, so the stages cannot be taken under Electron's engine. ` +
        'Run npm install, or set P300_SPLIT_ENGINE=node to take them under this node and say so.\n'
    );
    process.exit(2);
  }
  execPath = ELECTRON_BIN;
  execEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
} else {
  process.stderr.write(`${TAG} P300_SPLIT_ENGINE must be "electron" or "node", not "${engineChoice}".\n`);
  process.exit(2);
}

/**
 * THE ENTRY'S OWN FLOORS, copied by hand with the record each was taken on.
 *
 * They are printed for SHAPE and never asserted: this script reads synthesised
 * records of different sizes on a different engine, so it prints the entry's
 * number beside its own and lets a person judge the shape. The two floors the
 * first build stated for its reduced read are kept here, struck through in
 * words, because they are what this script measured wrong.
 */
const ENTRY_FLOORS = [
  { what: '186.8 MiB codex, byte scan (node 22)', ms: 53, at: 'the Phase 300 entry' },
  { what: '186.8 MiB codex, admitted by item_completed', ms: null, note: '107.4 MiB / 13,946 lines', at: 'the Phase 300 entry' },
  { what: '186.8 MiB codex, JSON.parse of admitted (node 22)', ms: 151, at: 'the Phase 300 entry' },
  { what: '186.8 MiB codex, measured floor today (node 22)', ms: 204, at: 'the Phase 300 entry' },
  { what: '186.8 MiB codex, first build\'s reduced read (node 22, REMOVED)', ms: 87, at: 'SPEC §7.2' },
  { what: '960 MiB synthesised, first counts read IN THE APP, today', ms: null, note: '1692 to 1834 ms', at: 'SPEC §7.2' },
  { what: '960 MiB synthesised, first build\'s reduced read IN THE APP (REMOVED)', ms: null, note: '2103 to 2513 ms', at: 'SPEC §7.2' },
  { what: '960 MiB synthesised, scanner not copying a rejected line, in the app', ms: 1122, at: 'SPEC §7.2, queued' }
];

/** One `--real --stages` run through the shipping gate, under the chosen engine. */
function stagesOf(file, provider, repo) {
  const run = spawnSync(
    execPath,
    [
      'build/conformance-overview.mjs',
      '--real',
      file,
      '--provider',
      provider,
      '--repo',
      repo,
      '--stages'
    ],
    { encoding: 'utf8', cwd: repoRoot, env: execEnv, maxBuffer: 256 * 1024 * 1024 }
  );
  const text = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const marker = '[overview-stages] ';
  const at = text.indexOf(marker);
  if (at === -1) {
    return { error: `the gate printed no stage line (exit ${String(run.status)})`, text };
  }
  const line = text.slice(at + marker.length).split('\n')[0] ?? '';
  try {
    return { stages: JSON.parse(line) };
  } catch (err) {
    return { error: `the stage line was not JSON: ${String(err)}`, text };
  }
}

const problems = [];
const readings = [];

const namedFile = argOf('--file');
let generated = null;
const outDir = resolve(repoRoot, process.env['P300_OUT_DIR'] ?? join('out', 'p300-split'));

try {
  let targets;
  if (namedFile !== null) {
    const provider = argOf('--provider');
    if (provider === null) {
      process.stderr.write(`${TAG} --file needs --provider <p>.\n`);
      process.exit(2);
    }
    if (!existsSync(namedFile)) {
      process.stderr.write(`${TAG} ${namedFile} is not there.\n`);
      process.exit(2);
    }
    say(
      `reading ONE file a person named, read only: ${namedFile}. Nothing is generated and ` +
        'nothing is deleted.'
    );
    targets = [{ size: 'named', file: namedFile, provider, bytes: null }];
  } else {
    const home = resolve(repoRoot, process.env['P300_SPLIT_HOME'] ?? join(outDir, 'home'));
    rmSync(home, { recursive: true, force: true });
    mkdirSync(home, { recursive: true });
    const sizes = (process.env['P300_SIZES'] ?? 'p50,p99').split(',').map((s) => s.trim());
    say(`synthesising ${sizes.join(', ')} from the committed codex fixture under ${home}`);
    const t0 = Date.now();
    generated = generateCodexRecords({ home, sizes });
    say(`generated in ${String(Date.now() - t0)} ms; every byte is deleted in this run's finally`);
    targets = generated.records.map((r) => ({
      size: r.size,
      file: r.file,
      provider: 'codex',
      bytes: r.bytes,
      paddingLines: r.paddingLines
    }));
  }

  say(`engine: ${engineChoice === 'electron' ? "Electron's own node (ELECTRON_RUN_AS_NODE=1)" : 'the node that ran this script'} at ${execPath}`);
  const repo = argOf('--repo') ?? repoRoot;
  for (const t of targets) {
    const got = stagesOf(t.file, t.provider, repo);
    if (got.error !== undefined) {
      problems.push(`${t.size}: ${got.error}`);
      say(`${t.size}: FAILED to read — ${got.error}`);
      continue;
    }
    const s = got.stages;
    if (s.error !== undefined) {
      problems.push(`${t.size}: the stage timer refused: ${String(s.error)}`);
      continue;
    }
    // THE SPREAD COMES FIRST AND `label` IS NOT `size`. The stage object carries
    // its own `size`, which is the record's byte count, and a `size: t.size`
    // before the spread was silently overwritten by it — the table printed
    // `5954485` where it meant `p99`.
    readings.push({
      ...s,
      label: t.size,
      digest: existsSync(t.file) ? digestOfHead(t.file) : null
    });
  }
} finally {
  // EVERY GENERATED BYTE, WHATEVER HAPPENED. A throw above, a refusal inside the
  // gate, or a Ctrl-C after the write all land here.
  if (generated !== null) {
    generated.remove();
    say('the generated records are gone');
  }
}

// ---------------------------------------------------------------------------
// The table, the two instruments, and the engine that took them
// ---------------------------------------------------------------------------

const pad = (v, w) => String(v).padEnd(w);
const num = (v, w) => String(v).padStart(w);
const MiB = (b) => (b === null || b === undefined ? '-' : (b / (1024 * 1024)).toFixed(2));

const engines = new Set(readings.map((r) => `${r.engine?.node ?? '?'} / V8 ${r.engine?.v8 ?? '?'}${r.engine?.electron ? ` / Electron ${r.engine.electron}` : ''}`));
process.stdout.write(`\nthe engine that took every number below: ${[...engines].join(', ') || 'none read'}\n`);
process.stdout.write(
  `process.versions.v8 = ${readings[0]?.engine?.v8 ?? '(no reading)'}` +
    (readings[0]?.engine?.electron ? ` (Electron ${readings[0].engine.electron})` : ' (NOT Electron: this is not the engine main runs)') +
    '\n'
);

process.stdout.write('\nthe stage split, one row per record, all times in ms\n');
// THE DECIDE COLUMN INCLUDES ITS OWN SCAN, and saying so is the difference
// between a number and a misleading number: the decide arm runs the chunk loop
// itself, because there is no way to hand `scanFile` a line without walking to
// it. So the pure decide is `decide - scan`, and `read` is close to
// `decide + parse + fold`.
process.stdout.write('  decide includes its own scan, so the pure decide is that column minus scan\n');
process.stdout.write(
  pad('record', 9) +
    num('MiB', 9) +
    num('scan', 8) +
    num('decide', 8) +
    num('parse', 9) +
    num('read', 8) +
    num('fold', 8) +
    num('admitted', 10) +
    num('parsedMiB', 11) +
    '  prefilter\n'
);
process.stdout.write('-'.repeat(100) + '\n');
for (const r of readings) {
  process.stdout.write(
    pad(r.label, 9) +
      num(r.sizeMiB, 9) +
      num(r.scanMs, 8) +
      num(r.decide.decideMs, 8) +
      num(r.decide.parseMs, 9) +
      num(r.read.wallMs, 8) +
      num(r.foldResidualMs, 8) +
      num(r.decide.admittedLines, 10) +
      num(MiB(r.read.bytesParsed), 11) +
      `  ${r.read.prefilter}\n`
  );
}
process.stdout.write(
  '  a synthesised record is 100 percent item_completed padding outside its 30 fixture lines;\n' +
    "  the operator's own 186.8 MiB record is 58 percent, so these rows are the heaviest shape and not his\n"
);

process.stdout.write('\nthe two instruments, which share no clock\n');
process.stdout.write(
  pad('record', 9) + num('wall', 8) + num('loopMax', 9) + num('samples', 9) + '  agreement\n'
);
process.stdout.write('-'.repeat(100) + '\n');
for (const r of readings) {
  const a = r.read;
  const gap = Math.abs(a.loopDelayMaxMs - a.wallMs);
  // ONE FRAME at 60 Hz is 16.67 ms (build/p300/SPEC.md §6.3). The histogram
  // reads the lateness of the first timer firing AFTER the block, so it reads
  // a little ABOVE the wall time and never below it by much.
  const ok = a.loopDelaySamples > 0 && gap <= 16.67;
  if (!ok && a.loopDelaySamples > 0) {
    problems.push(
      `${r.label}: the wall clock read ${String(a.wallMs)} ms and monitorEventLoopDelay read ` +
        `${String(a.loopDelayMaxMs)} ms, ${gap.toFixed(2)} ms apart, which is more than one frame. ` +
        'Two instruments disagreeing means one is wrong and this phase finds out which.'
    );
  }
  if (a.loopDelaySamples === 0) {
    problems.push(
      `${r.label}: monitorEventLoopDelay took NO sample, so it measured nothing. ` +
        'A histogram enabled and disabled around a synchronous call sees no timer firing at all.'
    );
  }
  process.stdout.write(
    pad(r.label, 9) +
      num(a.wallMs, 8) +
      num(a.loopDelayMaxMs, 9) +
      num(a.loopDelaySamples, 9) +
      `  ${gap.toFixed(2)} ms apart, ${ok ? 'within one frame' : 'OUTSIDE one frame'}\n`
  );
}

process.stdout.write("\nthe entry's own floors, for shape and not as assertions\n");
for (const f of ENTRY_FLOORS) {
  process.stdout.write(
    `  ${pad(f.what, 70)} ${f.ms === null ? pad(f.note, 24) : `${num(f.ms, 4)} ms`}   ${f.at}\n`
  );
}

if (process.env['P300_OUT'] !== undefined && process.env['P300_OUT'] !== '') {
  const out = resolve(repoRoot, process.env['P300_OUT']);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify(
      { at: new Date().toISOString(), runner: process.version, engineChoice, execPath, readings, problems },
      null,
      1
    )}\n`
  );
  say(`readings written to ${out}. Diff it against the same file from a parent build.`);
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
if (readings.length === 0) {
  process.stderr.write(`${TAG} FAILED: no record was read, so nothing was measured.\n`);
  process.exit(1);
}
say(
  `OK: ${String(readings.length)} record(s) read under ${engineChoice === 'electron' ? "Electron's engine" : 'plain node'}, ` +
    'the two instruments agree within one frame on each. This script decides nothing: it is the ' +
    'instrument the next first-read build starts from, on the engine main runs.'
);
process.exit(0);
