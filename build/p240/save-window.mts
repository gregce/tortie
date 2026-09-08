/**
 * save-window.mts. The Phase 240 measure step's node-level half: what the
 * SHIPPING guarded write (Phase 226) answers for a SAVE-shaped payload, and
 * how wide the same-size window Phase 226 states as its limit really is on
 * this path.
 *
 * It loads `src/main/fs/guarded-write.ts` itself, exactly as
 * `build/redline-write-probe.mts` does, and drives it over a scratch
 * directory it makes and removes in a `finally`. It reads nothing under the
 * person's home, spawns one node child for the racer which it ends in a
 * `finally`, and writes every byte inside its own scratch root.
 *
 * Three measurements, printed as one JSON line last:
 *
 *   1. SEAN'S SEQUENCE. The tab read V1, an agent wrote V_AGENT, the person
 *      presses Cmd-S. The word the channel answers, and the digest it hands
 *      back, for the exact payload the save path would send.
 *   2. THE TWO WINDOWS, at four save sizes. The hash-to-rename window is the
 *      time to write the payload; the lstat-to-rename window is what step 8's
 *      comparison leaves. Both timed through the `afterStage` seam.
 *   3. THE SAME-SIZE RACE. A child rewrites the file IN PLACE with bytes of
 *      exactly the same length as fast as it can while this process saves in
 *      a loop. Every answer is counted, and a `wrote` under the racer is the
 *      window: the racer's own counter says how many of its writes could have
 *      been lost.
 */
import { spawn, spawnSync as spawnSyncFn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync as appendFileSyncFn,
  chmodSync as chmodSyncFn,
  closeSync as closeSyncFn,
  mkdirSync,
  mkdtempSync,
  openSync as openSyncFn,
  readFileSync,
  renameSync as renameSyncFn,
  rmSync,
  statSync,
  writeFileSync,
  writeSync as writeSyncFn
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const channel = (await import(
  pathToFileURL(resolve('src/main/fs/guarded-write.ts')).href
)) as typeof import('../../src/main/fs/guarded-write');
const { writeGuarded } = channel;

const sha = (b: Buffer | string): string =>
  createHash('sha256').update(b).digest('hex');
const word = (r: Awaited<ReturnType<typeof writeGuarded>>): string =>
  r.outcome === 'refused' ? `refused/${r.why}` : r.outcome;

const root = mkdtempSync(join(tmpdir(), 'p240-window-'));
const out: Record<string, unknown> = {};

// The racer child, written into the scratch root so nothing outside it runs.
const RACER = `
const { writeFileSync, openSync, writeSync, closeSync } = require('node:fs');
const path = process.argv[2];
const size = Number(process.argv[3]);
let n = 0;
const stop = () => { process.stdout.write(String(n) + "\\n"); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
for (;;) {
  n++;
  const tag = 'RACER' + String(n).padStart(10, '0');
  const body = tag + 'x'.repeat(Math.max(0, size - tag.length - 1)) + '\\n';
  const fd = openSync(path, 'r+');
  writeSync(fd, Buffer.from(body), 0, body.length, 0);
  closeSync(fd);
  if (n % 500 === 0) process.stdout.write('n=' + n + '\\n');
}
`;

try {
  const project = join(root, 'project');
  mkdirSync(project, { recursive: true });
  const deps = { listProjectRoots: async () => [project] };

  // ------------------------------------------------------------------- 1.
  const para = (n: number, w: string) =>
    `Paragraph ${n} of the notes, ${w}, keeps going for a while so that the document has a body worth reading and a sentence that can change.`;
  const V1 = ['The quick brown fox jumped over the lazy dog.', '', para(1, 'first'), '', para(2, 'second'), '', para(3, 'third'), ''].join('\n');
  const AGENT_ADDED = `\n${para(4, 'written by the agent while you were typing')}\n`;
  const V_AGENT = V1 + AGENT_ADDED;
  const BUFFER = `PERSON ${V1}`;

  const seanPath = join(project, 'notes.txt');
  writeFileSync(seanPath, V_AGENT);
  const sean = await writeGuarded(deps, {
    root: project,
    path: 'notes.txt',
    expect: sha(V1), // what the tab last READ, which is `tab.savedContents`
    contents: BUFFER
  });
  out['sean'] = {
    answer: word(sean),
    handedBack: 'sha256' in sean ? sean.sha256 : null,
    diskDigest: sha(V_AGENT),
    diskUnchanged: readFileSync(seanPath, 'utf8') === V_AGENT,
    bytesTheSaveWouldHaveLost: V_AGENT.length - Math.max(0, V_AGENT.length - AGENT_ADDED.length)
  };
  // And the second, deliberate act: overwrite through the same channel with
  // the digest of what was JUST read.
  const second = await writeGuarded(deps, {
    root: project,
    path: 'notes.txt',
    expect: sha(V_AGENT),
    contents: BUFFER
  });
  out['seanOverwrite'] = {
    answer: word(second),
    diskIsTheBuffer: readFileSync(seanPath, 'utf8') === BUFFER
  };

  // ------------------------------------------------------------------- 2.
  const sizes = [640, 100 * 1024, 1024 * 1024, 5 * 1024 * 1024];
  const windows: unknown[] = [];
  for (const size of sizes) {
    const p = join(project, `w${size}.txt`);
    const old = 'a'.repeat(size - 1) + '\n';
    const fresh = 'b'.repeat(size - 1) + '\n';
    const runs: { payload: number; residual: number }[] = [];
    for (let i = 0; i < 5; i++) {
      writeFileSync(p, old);
      let staged = 0;
      const t0 = process.hrtime.bigint();
      const r = await writeGuarded(
        { ...deps, afterStage: () => { staged = Number(process.hrtime.bigint()); } },
        { root: project, path: `w${size}.txt`, expect: sha(old), contents: fresh }
      );
      const t1 = Number(process.hrtime.bigint());
      if (word(r) !== 'wrote') throw new Error(`window arm answered ${word(r)}`);
      runs.push({ payload: (staged - Number(t0)) / 1e6, residual: (t1 - staged) / 1e6 });
    }
    const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    windows.push({
      size,
      hashToStagedMedianMs: Number(med(runs.map((r) => r.payload)).toFixed(3)),
      stagedToRenameMedianMs: Number(med(runs.map((r) => r.residual)).toFixed(3))
    });
  }
  out['windows'] = windows;

  // The timestamp tick this volume really has.
  const tickPath = join(project, 'tick.txt');
  const ticks: string[] = [];
  for (let i = 0; i < 200; i++) {
    writeFileSync(tickPath, 'x');
    ticks.push(String(statSync(tickPath, { bigint: true }).mtimeNs));
  }
  const distinct = new Set(ticks).size;
  const nonzeroNs = ticks.filter((t) => t.slice(-6) !== '000000').length;
  out['mtime'] = { writes: ticks.length, distinctMtimeNs: distinct, withSubMicrosecondDigits: nonzeroNs, sample: ticks.slice(0, 3) };

  // ------------------------------------------------------------------- 3.
  const racerFile = join(root, 'racer.cjs');
  writeFileSync(racerFile, RACER);
  const RACE_SIZE = 640;
  const racePath = join(project, 'race.txt');
  writeFileSync(racePath, 'seed'.padEnd(RACE_SIZE - 1, 'y') + '\n');
  let racerCount = 0;
  const child = spawn(process.execPath, [racerFile, racePath, String(RACE_SIZE)], { stdio: ['ignore', 'pipe', 'inherit'] });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d: string) => {
    for (const line of d.split('\n')) {
      const m = /^n=(\d+)$/.exec(line.trim());
      if (m) racerCount = Number(m[1]);
      else if (/^\d+$/.test(line.trim())) racerCount = Number(line.trim());
    }
  });
  try {
    const tally: Record<string, number> = {};
    const started = Date.now();
    let attempts = 0;
    while (Date.now() - started < 8000) {
      attempts++;
      const seen = readFileSync(racePath, 'utf8');
      const mine = `MINE${String(attempts).padStart(11, '0')}`.padEnd(RACE_SIZE - 1, 'z') + '\n';
      const r = await writeGuarded(deps, { root: project, path: 'race.txt', expect: sha(seen), contents: mine });
      const w = word(r);
      tally[w] = (tally[w] ?? 0) + 1;
    }
    out['race'] = {
      seconds: 8,
      size: RACE_SIZE,
      attempts,
      tally,
      racerRewritesSeen: racerCount,
      wroteAnswers: tally['wrote'] ?? 0
    };
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    child.kill('SIGKILL');
  }
  // ------------------------------------------------------------------- 5.
  // THE SHAPES A REAL WRITER USES, each fired INSIDE the window, through the
  // `afterStage` seam, which is after the staged copy and before the target
  // is checked. If step 8's comparison sees it, the answer is a refusal and
  // the writer's bytes stay on disk.
  const shapesDir = join(project, 'shapes');
  mkdirSync(shapesDir, { recursive: true });
  const base = 'a'.repeat(639) + '\n';
  const shapes: { name: string; run: (p: string) => void }[] = [
    { name: 'truncate in place, different size (cat > file)', run: (p) => { spawnSyncFn('/bin/sh', ['-c', 'printf "%s" "AGENT WROTE THIS" > "$1"', 'sh', p]); } },
    { name: 'whole-file rewrite, same size, in place (pwrite)', run: (p) => { const fd = openSyncFn(p, 'r+'); writeSyncFn(fd, Buffer.from('b'.repeat(639) + '\n'), 0, 640, 0); closeSyncFn(fd); } },
    { name: 'atomic replace by rename (the shape editors use)', run: (p) => { const tmp = p + '.new'; writeFileSync(tmp, 'c'.repeat(639) + '\n'); renameSyncFn(tmp, p); } },
    { name: 'append one line', run: (p) => { appendFileSyncFn(p, 'one more line\n'); } },
    { name: 'chmod alone, no byte moved', run: (p) => { chmodSyncFn(p, 0o600); } },
    { name: 'nothing at all (the control)', run: () => {} }
  ];
  const shapeRows: unknown[] = [];
  for (const shape of shapes) {
    const p = join(shapesDir, 'f.txt');
    writeFileSync(p, base);
    chmodSyncFn(p, 0o644);
    const r = await writeGuarded(
      { ...deps, afterStage: (_staged, targetPath) => shape.run(targetPath) },
      { root: project, path: 'shapes/f.txt', expect: sha(base), contents: 'MINE'.padEnd(639, 'z') + '\n' }
    );
    shapeRows.push({
      shape: shape.name,
      answer: word(r),
      writersBytesSurvived: readFileSync(p, 'utf8') !== ('MINE'.padEnd(639, 'z') + '\n')
    });
  }
  out['shapesInsideTheWindow'] = shapeRows;

  // ------------------------------------------------------------------- 4.
  // THE GAP THAT REMAINS, timed on its own. Step 8's comparison closes the
  // window from the hash to the lstat; what is left is the two lstats and the
  // rename with nothing between them, which is what the module's header calls
  // the same window the remote path's far side has.
  const gapDir = join(project, 'gap');
  mkdirSync(gapDir, { recursive: true });
  const { lstatSync, renameSync } = await import('node:fs');
  const target = join(gapDir, 'target.txt');
  const staged = join(gapDir, 'staged.txt');
  const gaps: number[] = [];
  for (let i = 0; i < 2000; i++) {
    writeFileSync(target, 'a'.repeat(639) + '\n');
    writeFileSync(staged, 'b'.repeat(639) + '\n');
    const t0 = process.hrtime.bigint();
    lstatSync(target, { bigint: true });
    lstatSync(staged, { bigint: true });
    renameSync(staged, target);
    gaps.push(Number(process.hrtime.bigint() - t0) / 1000);
  }
  gaps.sort((a, b) => a - b);
  out['gap'] = {
    samples: gaps.length,
    medianUs: Number(gaps[Math.floor(gaps.length / 2)].toFixed(2)),
    p99Us: Number(gaps[Math.floor(gaps.length * 0.99)].toFixed(2)),
    maxUs: Number(gaps[gaps.length - 1].toFixed(2))
  };
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log(JSON.stringify(out, null, 2));
