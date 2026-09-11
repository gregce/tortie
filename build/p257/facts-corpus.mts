/**
 * Arm A of `npm run probe:p257`: the reference driver, in process, over the
 * research 118 corpus (Phase 257, spec §7.1).
 *
 *   tsx build/p257/facts-corpus.mts <reposDir> <outDir>
 *
 * `build/p256/det/run.mts`'s shape over the SHIPPING modules: for every clone
 * under <reposDir>, the tracked list from ONE fixed git argv (`ls-files -z`,
 * tracked only, which is the product's own list), then `readTree` from
 * ./facts-driver.mts twice, with the wrapper pass and without. It writes
 * `<outDir>/<repo>.json` (the pass on: every fact, the links' denominators
 * and the summary) and `<outDir>/<repo>.off.json` (the summary alone), and
 * prints research 118 §6.1's table beside the research's own numbers plus the
 * wrapper table.
 *
 * It spawns exactly one program, `git`, with `-C <clone> ls-files -z` and
 * `rev-parse HEAD`, and no field of any repository reaches an argv. No
 * Electron, no tmux, no agent, no request, nothing under the person's home.
 * The prototype counted `--others --exclude-standard` as well; the product
 * never reads an untracked file, and both denominators are printed so the
 * difference from §6.1 is visible rather than explained away.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { grammarFor } from '../../src/main/symbols/languages';
import { grammarPath, runtimeWasmPath } from '../../src/main/symbols/paths';
import { SymbolExtractor } from '../../src/main/symbols/extract';
import * as facts from '../../src/main/arch/facts/index';
import { countByCategory, countByRule, readTree, type DriverResult } from './facts-driver.mts';

/**
 * research 118 §6.1: build/p256/det/measurements/corpus-table.txt for the
 * with-pass columns and corpus-summary-nowrap.json for msNoWrap, measured
 * 2026-09-10. Copied from those files, never from memory.
 */
export const RESEARCH_TABLE: Record<string, { tracked: number; parsed: number; ms: number; facts: number; wrapFacts: number; wrappers: number; msNoWrap: number }> = {
  alamofire: { tracked: 571, parsed: 111, ms: 1406, facts: 911, wrapFacts: 0, wrappers: 3, msNoWrap: 861 },
  babel: { tracked: 27723, parsed: 17702, ms: 17437, facts: 5485, wrapFacts: 2, wrappers: 257, msNoWrap: 4673 },
  'fastapi-app': { tracked: 252, parsed: 152, ms: 208, facts: 247, wrapFacts: 0, wrappers: 1, msNoWrap: 115 },
  gotify: { tracked: 274, parsed: 209, ms: 427, facts: 676, wrapFacts: 0, wrappers: 0, msNoWrap: 233 },
  mastodon: { tracked: 10024, parsed: 4224, ms: 7320, facts: 17534, wrapFacts: 0, wrappers: 13, msNoWrap: 2372 },
  requests: { tracked: 130, parsed: 37, ms: 203, facts: 658, wrapFacts: 0, wrappers: 13, msNoWrap: 129 },
  ripgrep: { tracked: 237, parsed: 111, ms: 773, facts: 602, wrapFacts: 0, wrappers: 3, msNoWrap: 442 },
  stoa: { tracked: 4593, parsed: 1990, ms: 7949, facts: 7067, wrapFacts: 0, wrappers: 58, msNoWrap: 3742 },
  tortie: { tracked: 3145, parsed: 2522, ms: 17619, facts: 22752, wrapFacts: 735, wrappers: 231, msNoWrap: 5599 }
};

/** The HEAD each clone was measured at on 2026-09-10 (build/p256/det/measurements/corpus-summary.json). */
export const RESEARCH_HEADS: Record<string, string> = {
  alamofire: 'bda9ed57',
  babel: 'eda292bb',
  'fastapi-app': 'cb740b65',
  gotify: '0c24edaa',
  mastodon: '12eb83b5',
  requests: 'dae7ef63',
  ripgrep: '3fce3b5b',
  stoa: 'dc942342',
  tortie: '0ebcf9df'
};

const GIT_ENV = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };

export function trackedFiles(repo: string): string[] {
  const out = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { maxBuffer: 256 * 1024 * 1024, env: GIT_ENV });
  return out.toString('utf8').split('\0').filter((p) => p.length > 0);
}

export function trackedAndUntracked(repo: string): number {
  const out = execFileSync('git', ['-C', repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    maxBuffer: 256 * 1024 * 1024,
    env: GIT_ENV
  });
  return out.toString('utf8').split('\0').filter((p) => p.length > 0).length;
}

export function headOf(repo: string): string {
  try {
    return execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { env: GIT_ENV }).toString().trim().slice(0, 8);
  } catch {
    return '(no head)';
  }
}

export interface CorpusSummary {
  repo: string;
  head: string;
  researchHead: string | null;
  moved: boolean;
  tracked: number;
  trackedPlusUntracked: number;
  parsed: number;
  manifests: number;
  pathOnly: number;
  vendored: number;
  truncated: number;
  unread: number;
  mb: number;
  ms: number;
  msNoWrap: number;
  wrapperMs: number;
  wrapperCandidates: number;
  wrappers: number;
  wrapFacts: number;
  wrapDigest: string | null;
  facts: number;
  factsNoWrap: number;
  byCategory: Record<string, number>;
  byRule: Record<string, number>;
}

export async function runCorpus(reposDir: string, outDir: string): Promise<CorpusSummary[]> {
  mkdirSync(outDir, { recursive: true });
  const extractor = await SymbolExtractor.create({ runtimeWasm: runtimeWasmPath(), grammarPath });
  const rows: CorpusSummary[] = [];
  try {
    for (const repo of readdirSync(reposDir).sort()) {
      const root = join(reposDir, repo);
      let files: string[];
      try {
        files = trackedFiles(root);
      } catch {
        continue;
      }
      const both = trackedAndUntracked(root);
      const on = await readTree({ root, files, facts, extractor, grammarFor, wrapperPass: true });
      const off = await readTree({ root, files, facts, extractor, grammarFor, wrapperPass: false });
      const head = headOf(root);
      const researchHead = RESEARCH_HEADS[repo] ?? null;
      const row: CorpusSummary = {
        repo,
        head,
        researchHead,
        moved: researchHead !== null && researchHead !== head,
        tracked: files.length,
        trackedPlusUntracked: both,
        parsed: on.parsed,
        manifests: on.manifests,
        pathOnly: on.pathOnly,
        vendored: on.vendored,
        truncated: on.truncated,
        unread: on.unread,
        mb: +(on.bytes / 1048576).toFixed(2),
        ms: on.ms,
        msNoWrap: off.ms,
        wrapperMs: on.wrapperMs,
        wrapperCandidates: on.wrapperCandidates,
        wrappers: on.wrapperMap,
        wrapFacts: on.wrapFacts,
        wrapDigest: on.wrapDigest,
        facts: on.facts.length,
        factsNoWrap: off.facts.length,
        byCategory: countByCategory(on.facts),
        byRule: countByRule(on.facts)
      };
      rows.push(row);
      writeFileSync(join(outDir, `${repo}.json`), JSON.stringify({ summary: row, links: on.links, facts: on.facts }));
      writeFileSync(join(outDir, `${repo}.off.json`), JSON.stringify({ summary: { ...row, facts: off.facts.length } }));
      process.stderr.write(`[facts-corpus] ${repo} ${head}${row.moved ? ' (moved)' : ''}: ${on.facts.length} facts, ${on.ms} ms with the pass, ${off.ms} ms without\n`);
    }
  } finally {
    extractor.dispose();
  }
  writeFileSync(join(outDir, 'corpus-summary.json'), JSON.stringify(rows, null, 1));
  return rows;
}

export function printTables(rows: readonly CorpusSummary[]): void {
  const cats = ['entrypoint', 'boundary', 'surface', 'store', 'effect', 'network', 'gate', 'test'];
  console.log('CORPUS — the product read (research 118 §6.1 in brackets, measured 2026-09-10 over tracked + untracked files)\n');
  console.log(['repo', 'head', 'moved', 'tracked [+untracked]', 'parsed', 'manifests', 'vendored', 'MB', 'ms', 'facts', ...cats].join(' | '));
  for (const r of rows) {
    const R = RESEARCH_TABLE[r.repo];
    console.log(
      [
        r.repo,
        r.head,
        r.moved ? 'yes' : 'no',
        `${r.tracked} [${r.trackedPlusUntracked}]${R ? ` (${R.tracked})` : ''}`,
        `${r.parsed}${R ? ` (${R.parsed})` : ''}`,
        r.manifests,
        r.vendored,
        r.mb,
        `${r.ms}${R ? ` (${R.ms})` : ''}`,
        `${r.facts}${R ? ` (${R.facts})` : ''}`,
        ...cats.map((c) => r.byCategory[c] ?? 0)
      ].join(' | ')
    );
  }
  console.log('\nWRAPPER PASS: repo | wrappers resolved [research] | facts only it found [research] | ms with | ms without | ratio');
  for (const r of rows) {
    const R = RESEARCH_TABLE[r.repo];
    console.log(
      [
        r.repo,
        `${r.wrappers}${R ? ` [${R.wrappers}]` : ''}`,
        `${r.wrapFacts}${R ? ` [${R.wrapFacts}]` : ''}`,
        r.ms,
        r.msNoWrap,
        r.msNoWrap === 0 ? '—' : `${(r.ms / r.msNoWrap).toFixed(2)}×`
      ].join(' | ')
    );
  }
  console.log('\n(the research counted tracked AND untracked non-ignored files; the product reads tracked files only, and the wrapper-only count no longer includes the rules the port dropped)');
}

if (process.argv[1]?.endsWith('facts-corpus.mts')) {
  const reposDir = process.argv[2];
  const outDir = process.argv[3];
  if (!reposDir || !outDir) {
    console.error('usage: tsx build/p257/facts-corpus.mts <reposDir> <outDir>');
    process.exit(2);
  }
  const rows = await runCorpus(resolve(reposDir), resolve(outDir));
  printTables(rows);
}
