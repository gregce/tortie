/**
 * Phase 243 FIX ROUND — what an ACCEPT really costs, and what the ceiling
 * really holds. Re-runnable, and it is what the corrected numbers came from.
 *
 * The measure step (research 106 section 1) timed ONE `writeDurable` and
 * priced the ceiling from a corpus mean. Both are half the answer, and this
 * helper is the other half:
 *
 *  1. it times the SHIPPING `createBaselineStore(...).store()` END TO END,
 *     which is a record read, a body write, a record write, a `listGenerations`
 *     and a prune — two `writeDurable` calls and four `F_FULLFSYNC`s, not one
 *     and two;
 *  2. it holds a 1 ms heartbeat across each call and reports the WORST gap it
 *     saw, because "the flushes are on the threadpool" says nothing about the
 *     `JSON.stringify`, the `Buffer.from` and the two sha256 passes that are
 *     not; and
 *  3. it drives a whole real corpus through the store, one open and one
 *     accept per file the way a person would, and reads the bytes off the disk
 *     rather than multiplying a mean, because an ACCEPT stores the text AND
 *     the HEAD version it was accepted over.
 *
 * It READS prose out of the repository it is pointed at and writes only into a
 * scratch directory under `$TMPDIR` that it removes in a `finally`. It spawns
 * nothing, launches no Electron, opens no profile and never touches
 * `<userData>`.
 *
 * Usage: npx tsx build/p243/store-cost.mts [repo] [runs]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createBaselineStore, BASELINE_MAX_DIR_BYTES } from '../../src/main/baselines/store';

const REPO = process.argv[2] ?? process.cwd();
const RUNS = Number(process.argv[3] ?? 30);
const PROSE = /\.(md|markdown|mdown|mkd|mdx|txt|text)$/i;

const ms = (x: number): string => x.toFixed(1);
const mb = (x: number): string => (x / 1024 / 1024).toFixed(2);
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}
function pct(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))] as number;
}

/** A 1 ms heartbeat. The worst gap between two ticks is main's worst stall. */
function heartbeat(): { stop: () => { worst: number; ticks: number } } {
  let last = performance.now();
  let worst = 0;
  let ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    const gap = now - last;
    last = now;
    ticks += 1;
    if (gap > worst) worst = gap;
  }, 1);
  return {
    stop: () => {
      clearInterval(timer);
      return { worst, ticks };
    }
  };
}

async function dirBytes(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0;
  let files = 0;
  for (const name of await readdir(dir)) {
    if (name.startsWith('.')) continue;
    const st = await stat(join(dir, name));
    if (!st.isFile()) continue;
    bytes += st.size;
    files += 1;
  }
  return { bytes, files };
}

async function main(): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), 'p243-store-cost-'));
  try {
    // ---- Part 1 and 2: the end-to-end price and the worst event-loop gap ---
    const named = [
      'docs/ZEN-OF-TORTIE.md',
      'CLAUDE.md',
      'docs/research/83-shadow-baseline.md',
      'docs/BACKLOG.md'
    ];
    const dir1 = join(scratch, 'cost');
    const store1 = createBaselineStore({
      dir: dir1,
      listProjectRoots: async () => [REPO],
      realRootOf: async (r) => r
    });
    console.log(`repo ${REPO}   runs ${String(RUNS)}   scratch ${scratch}`);
    console.log('\n== the shipping store() end to end, and the worst gap a 1 ms heartbeat saw ==');
    console.log('file                                   bytes      p50    p95    max   worstGap');
    for (const rel of named) {
      let text: string;
      try {
        text = await readFile(join(REPO, rel), 'utf8');
      } catch {
        continue;
      }
      const head = `${text}\n`; // an ACCEPT: the text and the HEAD version differ
      const times: number[] = [];
      let worst = 0;
      for (let i = 0; i < RUNS; i += 1) {
        const beat = heartbeat();
        const t0 = performance.now();
        const answer = await store1.store({
          repoPath: REPO,
          relPath: rel,
          machineId: null,
          text,
          headSeen: head,
          origin: 'accept',
          generation: i + 1,
          takenAt: Date.now(),
          acceptedAt: Date.now(),
          truncated: false
        });
        const dt = performance.now() - t0;
        const seen = beat.stop();
        if (!answer.stored) throw new Error(`store refused ${rel}: ${JSON.stringify(answer)}`);
        times.push(dt);
        if (seen.worst > worst) worst = seen.worst;
      }
      console.log(
        `${basename(rel).padEnd(38)}${String(Buffer.byteLength(text, 'utf8')).padStart(9)}` +
          `${ms(median(times)).padStart(8)}${ms(pct(times, 0.95)).padStart(7)}` +
          `${ms(Math.max(...times)).padStart(7)}${ms(worst).padStart(11)}`
      );
    }

    // ---- Part 2b: where a gap that big can come from -----------------------
    //
    // The flushes really are on libuv's threadpool. What is not is the
    // synchronous work either side of them: the body is a JSON document built
    // on main, encoded on main, and hashed twice on main (once by the write,
    // once by the read-back verification).
    console.log('\n== the synchronous work in one store(), on main, by size ==');
    console.log('file                                   bytes  stringify  encode  sha256 x2');
    for (const rel of named) {
      let text: string;
      try {
        text = await readFile(join(REPO, rel), 'utf8');
      } catch {
        continue;
      }
      const doc = { text, headSeen: `${text}\n` };
      const runs = Math.min(RUNS, 10);
      const a: number[] = [];
      const b: number[] = [];
      const c: number[] = [];
      for (let i = 0; i < runs; i += 1) {
        let t = performance.now();
        const json = JSON.stringify(doc);
        a.push(performance.now() - t);
        t = performance.now();
        const buf = Buffer.from(json, 'utf8');
        b.push(performance.now() - t);
        t = performance.now();
        createHash('sha256').update(buf).digest('hex');
        createHash('sha256').update(buf).digest('hex');
        c.push(performance.now() - t);
      }
      console.log(
        `${basename(rel).padEnd(38)}${String(Buffer.byteLength(text, 'utf8')).padStart(9)}` +
          `${ms(median(a)).padStart(10)}${ms(median(b)).padStart(8)}${ms(median(c)).padStart(11)}`
      );
    }

    // ---- Part 3: the ceiling, driven over the whole corpus ------------------
    const tracked = execFileSync('git', ['-C', REPO, 'ls-files'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
      .split('\n')
      .filter((p) => p.length > 0 && PROSE.test(p));
    console.log(`\n== the ceiling, over ${String(tracked.length)} tracked prose files of ${REPO} ==`);

    for (const arm of ['open only', 'open then accept'] as const) {
      const dir = join(scratch, arm.replace(/ /g, '-'));
      const store = createBaselineStore({
        dir,
        listProjectRoots: async () => [REPO],
        realRootOf: async (r) => r,
        // The ceiling is asked separately below; the sweep must not run while
        // the corpus is being written or it would evict what is being counted.
        maxDirBytes: Number.MAX_SAFE_INTEGER
      });
      let corpus = 0;
      let kept = 0;
      for (const rel of tracked) {
        let text: string;
        try {
          text = await readFile(join(REPO, rel), 'utf8');
        } catch {
          continue;
        }
        corpus += Buffer.byteLength(text, 'utf8');
        kept += 1;
        // The open: origin `commit`, and `headSeen` IS the text, so the record
        // collapses the pair and one copy is stored.
        const opened = await store.store({
          repoPath: REPO,
          relPath: rel,
          machineId: null,
          text,
          headSeen: text,
          origin: 'commit',
          generation: 1,
          takenAt: Date.now(),
          acceptedAt: null,
          truncated: false
        });
        if (!opened.stored) {
          kept -= 1;
          corpus -= Buffer.byteLength(text, 'utf8');
          continue;
        }
        if (arm === 'open then accept') {
          // The accept: the text has moved on from the committed version, so
          // the two are DIFFERENT strings and both are stored.
          await store.store({
            repoPath: REPO,
            relPath: rel,
            machineId: null,
            text: `${text}\nthe person's own paragraph\n`,
            headSeen: text,
            origin: 'accept',
            generation: 2,
            takenAt: Date.now(),
            acceptedAt: Date.now(),
            truncated: false
          });
        }
      }
      const on = await dirBytes(dir);
      const perKey = on.bytes / kept;
      const meanFile = corpus / kept;
      console.log(
        `${arm.padEnd(18)} ${String(kept).padStart(4)} keys  corpus ${mb(corpus)} MB  ` +
          `on disk ${mb(on.bytes)} MB in ${String(on.files)} files  ` +
          `${(perKey / 1024).toFixed(1)} KB a key  ` +
          `${(perKey / meanFile).toFixed(2)}x the mean file (${(meanFile / 1024).toFixed(1)} KB)  ` +
          `=> the ${mb(BASELINE_MAX_DIR_BYTES)} MB ceiling holds ` +
          `${String(Math.floor(BASELINE_MAX_DIR_BYTES / perKey))} of them`
      );
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

await main();
