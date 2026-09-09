/**
 * Phase 243 measure step — what a durable baseline write costs, re-derived.
 *
 * NOT research 83's harness. That one (`.p222/m1-durable-cost.ts`) timed ten
 * calls to `writeDurable` and printed a median. This one does three things it
 * did not:
 *
 *  1. it times the SHIPPING `writeDurable` over 30 runs and reports p50/p95,
 *  2. it times a hand-written copy of the same syscall sequence, step by step,
 *     with its own stopwatch, so the number can be attributed rather than
 *     quoted, and
 *  3. it prices the whole corpus, which is what the ceiling question needs.
 *
 * It READS the operator's prose and writes only into a scratch directory it
 * removes in a `finally`. It spawns nothing, launches no Electron and opens no
 * profile.
 *
 * Usage: npx tsx build/p243/durable-cost.mts [repo] [runs]
 */
import { createHash } from 'node:crypto';
import { open, mkdir, mkdtemp, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeDurable, writeDurableBatch } from '../../src/main/durable/write';

const REPO = process.argv[2] ?? '/Users/gdc/gmux';
const RUNS = Number(process.argv[3] ?? 30);
const PROSE = /\.(md|markdown|mdown|mkd|mdx|txt|text)$/i;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}
function pct(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))] as number;
}
const ms = (x: number): string => x.toFixed(1);

/** My own copy of the sequence, timed step by step. Never used for anything else. */
async function handSequence(dir: string, name: string, body: Buffer) {
  const t: Record<string, number> = {};
  const mark = async <T>(k: string, fn: () => Promise<T>): Promise<T> => {
    const a = performance.now();
    const v = await fn();
    t[k] = (t[k] ?? 0) + (performance.now() - a);
    return v;
  };
  const final = join(dir, name);
  const tmp = `${final}.hand.part`;
  const h = await mark('open', () => open(tmp, 'wx', 0o600));
  let closed = false;
  try {
    await mark('write', async () => {
      let off = 0;
      while (off < body.length) {
        const { bytesWritten } = await h.write(body, off, body.length - off, off);
        off += bytesWritten;
      }
    });
    await mark('fstat', () => h.stat());
    await mark('fsync', () => h.sync());
    await mark('close', async () => {
      await h.close();
      closed = true;
    });
    await mark('verify', async () => {
      const back = await readFile(tmp);
      if (back.length !== body.length) throw new Error('short');
      if (createHash('sha256').update(back).digest('hex') !== createHash('sha256').update(body).digest('hex'))
        throw new Error('mismatch');
    });
    await mark('rename', () => rename(tmp, final));
    await mark('dirsync', async () => {
      const d = await open(dir, 'r');
      try {
        await d.sync();
      } finally {
        await d.close();
      }
    });
  } finally {
    if (!closed) await h.close().catch(() => undefined);
  }
  return t;
}

async function main(): Promise<void> {
  const tracked = execFileSync('git', ['-C', REPO, 'ls-files', '-z'], { maxBuffer: 64 << 20 })
    .toString('utf8')
    .split('\0')
    .filter((p) => p !== '' && PROSE.test(p));
  const sized: { path: string; bytes: number }[] = [];
  for (const rel of tracked) {
    try {
      const st = await stat(join(REPO, rel));
      if (st.isFile()) sized.push({ path: rel, bytes: st.size });
    } catch {
      /* gone */
    }
  }
  sized.sort((a, b) => a.bytes - b.bytes);
  const total = sized.reduce((s, f) => s + f.bytes, 0);
  const at = (p: number) => sized[Math.min(sized.length - 1, Math.floor(sized.length * p))] as { path: string; bytes: number };
  console.log(`repo=${REPO}`);
  console.log(
    `corpus n=${sized.length} total=${total} bytes (${(total / 1048576).toFixed(2)} MB) ` +
      `p50=${at(0.5).bytes} p90=${at(0.9).bytes} p99=${at(0.99).bytes} max=${(sized[sized.length - 1] as { bytes: number }).bytes}`
  );

  const scratch = await mkdtemp(join(tmpdir(), 'p243-cost-'));
  try {
    const dir = join(scratch, 'baselines');
    await mkdir(dir, { recursive: true });

    const picks = [
      'docs/ZEN-OF-TORTIE.md',
      'CLAUDE.md',
      'docs/BACKLOG.md',
      at(0.5).path,
      at(0.9).path,
      at(0.99).path
    ].filter((p, i, a) => a.indexOf(p) === i);

    console.log(`\n[shipping writeDurable] runs=${RUNS}`);
    console.log('file                                     bytes      min   p50   p95   max');
    const handTotals: Record<string, number[]> = {};
    for (const rel of picks) {
      let body: Buffer;
      try {
        body = await readFile(join(REPO, rel));
      } catch {
        console.log(`${rel.padEnd(40)} (missing)`);
        continue;
      }
      const times: number[] = [];
      for (let i = 0; i < RUNS; i += 1) {
        const path = join(dir, `${basename(rel)}.${String(i).padStart(6, '0')}`);
        const a = performance.now();
        await writeDurable({ path, data: body });
        times.push(performance.now() - a);
      }
      console.log(
        `${rel.padEnd(40)} ${String(body.length).padStart(8)}  ${ms(Math.min(...times)).padStart(5)} ${ms(median(times)).padStart(5)} ${ms(pct(times, 0.95)).padStart(5)} ${ms(Math.max(...times)).padStart(5)}`
      );
      // The hand sequence, same file, same runs, own stopwatch.
      const steps: Record<string, number[]> = {};
      for (let i = 0; i < RUNS; i += 1) {
        const t = await handSequence(dir, `hand-${basename(rel)}.${i}`, body);
        for (const [k, v] of Object.entries(t)) (steps[k] ??= []).push(v);
      }
      const sum = Object.values(steps).map((xs) => median(xs)).reduce((a, b) => a + b, 0);
      handTotals[rel] = [sum];
      const parts = Object.entries(steps)
        .map(([k, xs]) => `${k}=${ms(median(xs))}`)
        .join(' ');
      console.log(`${''.padEnd(40)} ${'hand'.padStart(8)}  p50 total=${ms(sum)}  ${parts}`);
      // clear so the directory does not grow to thousands of entries
      for (const name of await readdir(dir)) await rm(join(dir, name), { force: true });
    }


    // The worst realistic live set: ten prose tabs at this corpus's p90.
    // Research 83 A3.1 puts it at 712 KB. Measured three ways, because a
    // quit-time flush of ten tabs is a different shape from ten accepts.
    console.log(`\n[ten tabs at p90]`);
    const p90 = at(0.9).bytes;
    const ten = sized.filter((f) => f.bytes >= p90 * 0.8 && f.bytes <= p90 * 1.25).slice(0, 10);
    if (ten.length === 10) {
      const bodies = await Promise.all(ten.map((f) => readFile(join(REPO, f.path))));
      const setBytes = bodies.reduce((s, b) => s + b.length, 0);
      const seq: number[] = [];
      const bat: number[] = [];
      for (let r = 0; r < 10; r += 1) {
        let a0 = performance.now();
        for (let i = 0; i < 10; i += 1)
          await writeDurable({ path: join(dir, `seq-${i}.${String(r).padStart(6, '0')}`), data: bodies[i] as Buffer });
        seq.push(performance.now() - a0);
        a0 = performance.now();
        await writeDurableBatch(
          bodies.map((b, i) => ({ path: join(dir, `bat-${i}.${String(r).padStart(6, '0')}`), data: b }))
        );
        bat.push(performance.now() - a0);
      }
      console.log(
        `set=${setBytes} bytes (${(setBytes / 1024).toFixed(0)} KB) over ${ten.length} files; ` +
          `ten sequential writeDurable p50=${ms(median(seq))}ms; one writeDurableBatch p50=${ms(median(bat))}ms`
      );
      for (const name of await readdir(dir)) await rm(join(dir, name), { force: true });
    } else console.log(`(only ${ten.length} files near p90; skipped)`);

    // The whole corpus, once each, which is what a first fill of the store costs.
    console.log(`\n[whole corpus, one generation each]`);
    const a = performance.now();
    let wrote = 0;
    let bytes = 0;
    for (const f of sized) {
      let body: Buffer;
      try {
        body = await readFile(join(REPO, f.path));
      } catch {
        continue;
      }
      await writeDurable({ path: join(dir, `${f.path.replace(/[/]/g, '_')}.000001`), data: body });
      wrote += 1;
      bytes += body.length;
    }
    const elapsed = performance.now() - a;
    console.log(
      `files=${wrote} bytes=${bytes} (${(bytes / 1048576).toFixed(2)} MB) elapsed=${ms(elapsed)}ms mean=${ms(elapsed / wrote)}ms/file`
    );
    const du = execFileSync('du', ['-sk', dir]).toString().split('\t')[0];
    console.log(`on disk (du -sk) = ${du} KB for one generation of the whole corpus`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await main();
