/**
 * Phase 243 measure step — when a stored baseline is still credible.
 *
 * A stored baseline is a PREVIOUS state of a file. Offering it again after the
 * file's committed version moved underneath it draws a narrowing ACROSS that
 * commit, which is the picture research 83 A4.1 shows being wrong. This script
 * asks how often that would happen, over the operator's own repository's real
 * history, and it asks it two ways so the record's field can be chosen rather
 * than assumed:
 *
 *   - keyed on the HEAD COMMIT (refuse when HEAD moved at all), and
 *   - keyed on the file's HEAD BLOB (refuse only when THIS file's committed
 *     version moved).
 *
 * The model is a window: a baseline is stored at time s and offered again at
 * s + G. It is stale if a qualifying change landed inside (s, s+G]. The
 * probability is computed exactly rather than sampled — over a span [T0,T1] the
 * set of start points that cross an event at c is [c-G, c), so the answer is
 * the measure of the union of those intervals divided by the span.
 *
 * Reads the repository with `git log` and writes nothing at all.
 *
 * Usage: npx tsx build/p243/credibility.mts [repo] [sinceDays]
 */
import { execFileSync } from 'node:child_process';

const REPO = process.argv[2] ?? '/Users/gdc/gmux';
const PROSE = /\.(md|markdown|mdown|mkd|mdx|txt|text)$/i;
const HOUR = 3600_000;
const WINDOWS: [string, number][] = [
  ['1 h', HOUR],
  ['4 h', 4 * HOUR],
  ['1 day', 24 * HOUR],
  ['3 days', 72 * HOUR],
  ['7 days', 168 * HOUR],
  ['30 days', 720 * HOUR]
];

function git(args: string[]): string {
  return execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 512 << 20 }).toString('utf8');
}

/** Measure of the union of [c-G, c) over the events, clipped to [T0, T1-G]. */
function crossingFraction(events: number[], span: [number, number], G: number): number {
  const [T0, T1] = span;
  const lo = T0;
  const hi = T1 - G;
  if (hi <= lo) return events.length > 0 ? 1 : 0;
  const iv = events
    .map((c) => [Math.max(lo, c - G), Math.min(hi, c)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let covered = 0;
  let curA = -Infinity;
  let curB = -Infinity;
  for (const [a, b] of iv) {
    if (a > curB) {
      if (curB > curA) covered += curB - curA;
      curA = a;
      curB = b;
    } else if (b > curB) curB = b;
  }
  if (curB > curA) covered += curB - curA;
  return covered / (hi - lo);
}

function report(label: string, sinceDays: number | null): void {
  const args = ['log', '--no-merges', '--name-only', '--pretty=format:%x01%H %ct', '--'];
  if (sinceDays !== null) args.splice(1, 0, `--since=${sinceDays} days ago`);
  const raw = git(args);
  const commits: { sha: string; at: number; files: string[] }[] = [];
  for (const chunk of raw.split('\x01')) {
    if (chunk.trim() === '') continue;
    const lines = chunk.split('\n');
    const [sha, ct] = (lines[0] as string).trim().split(' ');
    const files = lines.slice(1).filter((l) => l.trim() !== '');
    commits.push({ sha: sha as string, at: Number(ct) * 1000, files });
  }
  if (commits.length === 0) return;
  const times = commits.map((c) => c.at);
  const span: [number, number] = [Math.min(...times), Math.max(...times)];
  const days = (span[1] - span[0]) / 86400_000;

  const perFile = new Map<string, number[]>();
  let proseTouches = 0;
  for (const c of commits)
    for (const f of c.files) {
      if (!PROSE.test(f)) continue;
      proseTouches += 1;
      (perFile.get(f) ?? perFile.set(f, []).get(f) ?? []).push(c.at);
    }
  const files = [...perFile.entries()].filter(([, ts]) => ts.length > 0);

  console.log(`\n### ${label}`);
  console.log(
    `commits=${commits.length} over ${days.toFixed(1)} days (${(commits.length / days).toFixed(1)}/day); ` +
      `prose files touched=${files.length}; prose file-touches=${proseTouches} (${(proseTouches / days).toFixed(1)}/day)`
  );
  const busiest = [...files].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  console.log(`busiest prose: ${busiest.map(([f, ts]) => `${f}=${ts.length}`).join(', ')}`);

  console.log('window   P(HEAD commit moved)  P(this file committed)   ratio');
  for (const [name, G] of WINDOWS) {
    const anyCommit = crossingFraction(times, span, G);
    const perFileFractions = files.map(([, ts]) => crossingFraction(ts, span, G));
    const mean = perFileFractions.reduce((a, b) => a + b, 0) / (perFileFractions.length || 1);
    // Weighted by activity: a file touched often is also a file more likely to be open.
    const weights = files.map(([, ts]) => ts.length);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const weighted = perFileFractions.reduce((a, f, i) => a + f * (weights[i] as number), 0) / (wsum || 1);
    console.log(
      `${name.padEnd(8)} ${(anyCommit * 100).toFixed(1).padStart(18)}%  ` +
        `mean ${(mean * 100).toFixed(1).padStart(5)}% / weighted ${(weighted * 100).toFixed(1).padStart(5)}%   ` +
        `${(anyCommit / Math.max(weighted, 1e-9)).toFixed(1)}x`
    );
  }
}

report('whole history', null);
report('last 90 days', 90);
report('last 30 days', 30);

// How often HEAD moves without a commit of his: checkouts, in his reflog.
try {
  const reflog = git(['reflog', '--date=iso', '-n', '400']);
  const lines = reflog.split('\n').filter((l) => l.trim() !== '');
  const kinds = new Map<string, number>();
  for (const l of lines) {
    const m = /\}:\s*([a-z-]+(?: [a-z-]+)?)/i.exec(l);
    const k = m ? (m[1] as string) : 'other';
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
  }
  console.log(`\n### reflog (last ${lines.length} entries, HEAD movements of every kind)`);
  console.log(
    [...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', ')
  );
} catch {
  console.log('\n(no reflog)');
}
