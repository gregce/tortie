/**
 * Arm A of `npm run probe:p257`, the before/after against the hand sample
 * (Phase 257, spec §7.1).
 *
 *   tsx build/p257/facts-score.mts <reposDir> <factsDir>
 *
 * The 341 rows of build/p256/det/measurements/precision-sample.json were
 * judged by hand in build/p256/det/hand-precision.json: 269 true, 72 false by
 * code (`v` vendored, `t` a test fixture or an assertion, `m` misclassified,
 * `0` plainly false). For each row this asks whether the SHIPPING reader at
 * HEAD still emits a fact at that line under a PORTED rule id, the `+wrap`
 * suffix and the `network.*` rename mapped and a dropped rule mapped to
 * nothing. A row is located by `file:line` when the clone's HEAD is the one
 * the sample was taken at, and by its evidence text found ONCE in the file
 * when the clone has moved; a row whose line cannot be found is counted as
 * `unlocated` and never as kept or removed.
 *
 * Of the rows judged true, N kept is what the port preserved. Of the rows
 * judged false, M removed is what the fixes and the vendor filter bought.
 * Both are printed by code and by rule, and a true row the port lost is
 * printed by name, because that is the number that replaces "79%" and it is
 * published rather than promised.
 *
 * It spawns exactly one program, `git rev-parse HEAD`, per clone, and reads
 * the clones and the fact files. No Electron, no tmux, no agent, no request.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface SampleRow {
  id: string;
  repo: string;
  cat: string;
  rule: string;
  at: string;
  subject: string;
  evidence: string;
}

interface Fact {
  file: string;
  line: number;
  rule: string;
  category: string;
  subject: string;
}

/** The prototype's rule ids that the port renamed or split. A dropped rule maps to []. */
export const RULE_MAP: Record<string, string[]> = {
  'effect.net.client': ['network.client'],
  'effect.net.listen': ['network.listen'],
  'entrypoint.swiftpm.target': ['entrypoint.swiftpm.target', 'boundary.swiftpm.target'],
  'store.orm': [],
  'surface.handler.on': [],
  'gate.refusal-guard': [],
  'entrypoint.jvm.main': [],
  'entrypoint.objc.main': [],
  'entrypoint.php.main': [],
  'test.jvm.class': [],
  'test.php.method': [],
  'decl.symbol': []
};

export function portedIds(prototypeRule: string): string[] {
  const bare = prototypeRule.replace(/\+wrap$/, '');
  const mapped = RULE_MAP[bare];
  const ids = mapped === undefined ? [bare] : mapped;
  return ids;
}

/** The HEAD the sample was taken at, per repo, from the research's own summary. */
function sampleHeads(): Record<string, string> {
  const rows = JSON.parse(readFileSync(join(repoRoot, 'build/p256/det/measurements/corpus-summary.json'), 'utf8')) as { repo: string; head: string }[];
  return Object.fromEntries(rows.map((r) => [r.repo, r.head]));
}

function headOf(repo: string): string {
  try {
    return execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
      .toString()
      .trim()
      .slice(0, 8);
  } catch {
    return '(no head)';
  }
}

/** The line a sample row cites, located by number on the sampled HEAD and by its evidence text elsewhere. */
export function locate(row: SampleRow, root: string, moved: boolean): { file: string; line: number } | null {
  const colon = row.at.lastIndexOf(':');
  const file = row.at.slice(0, colon);
  const line = Number(row.at.slice(colon + 1));
  if (!moved) return { file, line };
  let text: string;
  try {
    text = readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }
  const needle = row.evidence.trim();
  if (needle === '') return null;
  const hits: number[] = [];
  text.split('\n').forEach((l, i) => {
    if (l.trim() === needle) hits.push(i + 1);
  });
  if (hits.length === 1) return { file, line: hits[0]! };
  if (hits.includes(line)) return { file, line };
  return null;
}

export interface ScoreSummary {
  judgedTrue: number;
  kept: number;
  lostTrue: string[];
  judgedFalse: number;
  removed: number;
  byCode: Record<string, { n: number; removed: number }>;
  byRule: Record<string, { trueN: number; kept: number; falseN: number; removed: number }>;
  unlocated: number;
  skippedRepos: string[];
}

export function scoreSample(reposDir: string, factsDir: string): ScoreSummary {
  const sample = JSON.parse(readFileSync(join(repoRoot, 'build/p256/det/measurements/precision-sample.json'), 'utf8')) as SampleRow[];
  const hand = JSON.parse(readFileSync(join(repoRoot, 'build/p256/det/hand-precision.json'), 'utf8')).judgments as Record<string, number | string>;
  const heads = sampleHeads();
  const factsByRepo = new Map<string, Map<string, Fact[]>>();
  const movedByRepo = new Map<string, boolean>();
  const skipped = new Set<string>();
  const out: ScoreSummary = { judgedTrue: 0, kept: 0, lostTrue: [], judgedFalse: 0, removed: 0, byCode: {}, byRule: {}, unlocated: 0, skippedRepos: [] };
  for (const row of sample) {
    if (!factsByRepo.has(row.repo) && !skipped.has(row.repo)) {
      try {
        const facts = (JSON.parse(readFileSync(join(factsDir, `${row.repo}.json`), 'utf8')) as { facts: Fact[] }).facts;
        const byLine = new Map<string, Fact[]>();
        for (const f of facts) {
          const k = `${f.file}:${f.line}`;
          const list = byLine.get(k) ?? [];
          list.push(f);
          byLine.set(k, list);
        }
        factsByRepo.set(row.repo, byLine);
        movedByRepo.set(row.repo, headOf(join(reposDir, row.repo)) !== heads[row.repo]);
      } catch {
        skipped.add(row.repo);
      }
    }
    if (skipped.has(row.repo)) continue;
    const judgment = hand[row.id];
    const isTrue = judgment === 1;
    const code = isTrue ? '1' : String(judgment);
    const byLine = factsByRepo.get(row.repo)!;
    const where = locate(row, join(reposDir, row.repo), movedByRepo.get(row.repo) === true);
    const ruleRow = (out.byRule[row.rule] ??= { trueN: 0, kept: 0, falseN: 0, removed: 0 });
    if (where === null) {
      out.unlocated += 1;
      continue;
    }
    const ids = new Set(portedIds(row.rule));
    const still = (byLine.get(`${where.file}:${where.line}`) ?? []).some((f) => ids.has(f.rule.replace(/\+wrap$/, '')));
    if (isTrue) {
      out.judgedTrue += 1;
      ruleRow.trueN += 1;
      if (still) {
        out.kept += 1;
        ruleRow.kept += 1;
      } else {
        out.lostTrue.push(`${row.id} ${row.rule} ${row.at}`);
      }
    } else {
      out.judgedFalse += 1;
      ruleRow.falseN += 1;
      const c = (out.byCode[code] ??= { n: 0, removed: 0 });
      c.n += 1;
      if (!still) {
        out.removed += 1;
        c.removed += 1;
        ruleRow.removed += 1;
      }
    }
  }
  out.skippedRepos = [...skipped].sort();
  return out;
}

export function printScore(s: ScoreSummary): void {
  console.log('THE HAND SAMPLE, BEFORE AND AFTER THE PORT (build/p256/det/hand-precision.json)\n');
  console.log(`rows judged true: ${s.judgedTrue}, kept by the port: ${s.kept} (${s.judgedTrue === 0 ? '—' : `${((100 * s.kept) / s.judgedTrue).toFixed(1)}%`})`);
  console.log(`rows judged false: ${s.judgedFalse}, removed by the port: ${s.removed} (${s.judgedFalse === 0 ? '—' : `${((100 * s.removed) / s.judgedFalse).toFixed(1)}%`})`);
  console.log(`rows whose line could not be located at this HEAD: ${s.unlocated}${s.skippedRepos.length > 0 ? `; repositories with no fact file: ${s.skippedRepos.join(', ')}` : ''}\n`);
  console.log('false rows by code | judged | removed');
  for (const [code, c] of Object.entries(s.byCode).sort()) console.log(`${code} | ${c.n} | ${c.removed}`);
  console.log('\nby rule | true | kept | false | removed');
  for (const [rule, r] of Object.entries(s.byRule).sort()) console.log(`${rule} | ${r.trueN} | ${r.kept} | ${r.falseN} | ${r.removed}`);
  if (s.lostTrue.length > 0) {
    console.log(`\nTRUE ROWS THE PORT NO LONGER ANSWERS (${s.lostTrue.length}):`);
    for (const l of s.lostTrue) console.log(`  ${l}`);
  }
}

/**
 * `--self-test`: the locator on a planted file, launching nothing. By line on
 * an unmoved clone; by evidence text on a moved one, unique, ambiguous but
 * still at the recorded line, and ambiguous elsewhere (null); and a rule id
 * through the map in every shape.
 */
export function selfTest(): string[] {
  const problems: string[] = [];
  const dir = mkdtempSync(join(tmpdir(), 'p257-score-'));
  try {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'a.py'), ['x = 1', 'r = requests.get(url)', 'y = 2', 'r = requests.get(url)', 'z = 3'].join('\n'));
    const row = (at: string, evidence: string): SampleRow => ({ id: 'r/effect/0', repo: 'r', cat: 'effect', rule: 'effect.net.client', at, subject: 's', evidence });
    const byLine = locate(row('src/a.py:2', 'r = requests.get(url)'), dir, false);
    if (byLine?.line !== 2) problems.push(`unmoved: by line reads ${JSON.stringify(byLine)}`);
    const unique = locate(row('src/a.py:9', 'y = 2'), dir, true);
    if (unique?.line !== 3) problems.push(`moved, unique evidence: reads ${JSON.stringify(unique)} and must be line 3`);
    const ambiguousKept = locate(row('src/a.py:4', 'r = requests.get(url)'), dir, true);
    if (ambiguousKept?.line !== 4) problems.push(`moved, ambiguous evidence at the recorded line: reads ${JSON.stringify(ambiguousKept)} and must keep line 4`);
    const ambiguousLost = locate(row('src/a.py:7', 'r = requests.get(url)'), dir, true);
    if (ambiguousLost !== null) problems.push(`moved, ambiguous evidence elsewhere: reads ${JSON.stringify(ambiguousLost)} and must be null`);
    const gone = locate(row('src/missing.py:1', 'x'), dir, true);
    if (gone !== null) problems.push('a missing file must locate to null');
    const cases: [string, string[]][] = [
      ['effect.net.client', ['network.client']],
      ['surface.ipc.electron+wrap', ['surface.ipc.electron']],
      ['store.orm', []],
      ['entrypoint.swiftpm.target', ['entrypoint.swiftpm.target', 'boundary.swiftpm.target']],
      ['test.case.call', ['test.case.call']]
    ];
    for (const [from, want] of cases) {
      if (JSON.stringify(portedIds(from)) !== JSON.stringify(want)) problems.push(`portedIds(${from}) reads ${JSON.stringify(portedIds(from))}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return problems;
}

if (process.argv[1]?.endsWith('facts-score.mts')) {
  if (process.argv.includes('--self-test')) {
    const problems = selfTest();
    for (const p of problems) console.error(`facts-score self-test: ${p}`);
    console.log(problems.length === 0 ? 'facts-score self-test: OK, 9 locator and map cases behaved' : `facts-score self-test: ${problems.length} problem(s)`);
    process.exit(problems.length === 0 ? 0 : 1);
  }
  const reposDir = process.argv[2];
  const factsDir = process.argv[3];
  if (!reposDir || !factsDir) {
    console.error('usage: tsx build/p257/facts-score.mts <reposDir> <factsDir>');
    process.exit(2);
  }
  printScore(scoreSample(resolve(reposDir), resolve(factsDir)));
}
