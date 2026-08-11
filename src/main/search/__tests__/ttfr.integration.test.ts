/**
 * The performance claim, executable.
 *
 * docs/research/19-search.md §3.1 promises that time-to-first-result never
 * leaves the 2.8-5.0 ms band across a 43x spread in file count, because
 * ripgrep streams and gmux does not index. A claim measured in a research
 * harness and never again is a claim about a harness, so this measures it
 * through THE SHIPPED ENGINE — spawn, NDJSON parse, offset conversion, line
 * clamp, frame assembly and all.
 *
 * Read-only. Points at /Users/gdc/specstory-sync by default (the repo the
 * research measured) and skips itself where that does not exist; override with
 * GMUX_SEARCH_BENCH_REPO=/some/repo. Numbers go to stdout — run it with
 *
 *     npx vitest run src/main/search/__tests__/ttfr.integration.test.ts
 *
 * The assertions are deliberately loose (they are regression tripwires, not
 * the measurement): what matters is the printed table.
 */

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ContentSearchInput, SearchProgress } from '@shared/ipc';
import { ContentSearchEngine } from '../engine';
import type { SearchSink } from '../engine';

const REPO =
  process.env['GMUX_SEARCH_BENCH_REPO'] ?? '/Users/gdc/specstory-sync';
const TERM = process.env['GMUX_SEARCH_BENCH_TERM'] ?? 'session';
const RUNS = 5;

interface Measured {
  /** Spawn → ripgrep's first match, parsed. The research's "ms@1". */
  ttfrMs: number;
  /** Spawn → the first frame a renderer could paint. */
  firstFrameMs: number;
  /** Spawn → the done frame. */
  totalMs: number;
  frames: number;
  matches: number;
  files: number;
  capped: boolean;
}

async function measure(
  engine: ContentSearchEngine,
  over: Partial<ContentSearchInput>,
  id: string
): Promise<Measured> {
  const input: ContentSearchInput = {
    repoPath: REPO,
    query: TERM,
    isRegex: false,
    isCaseSensitive: false,
    matchWholeWord: false,
    includes: '',
    excludes: '',
    useIgnoreFiles: true,
    contextLines: 0,
    searchId: id,
    ...over
  };

  const started = process.hrtime.bigint();
  const ms = (): number => Number(process.hrtime.bigint() - started) / 1e6;

  let firstFrameMs = 0;
  let ttfrMs = 0;
  let frames = 0;

  return await new Promise<Measured>((resolve) => {
    const sink: SearchSink = {
      key: 'bench',
      alive: () => true,
      send: (_id, p: SearchProgress) => {
        frames += 1;
        if (firstFrameMs === 0 && p.files.length > 0) firstFrameMs = ms();
        if (ttfrMs === 0 && p.ttfrMs !== undefined) ttfrMs = p.ttfrMs;
        if (p.done) {
          resolve({
            ttfrMs,
            firstFrameMs,
            totalMs: ms(),
            frames,
            matches: p.totalMatches,
            files: p.totalFiles,
            capped: p.capped
          });
        }
      }
    };
    engine.start(input, sink, id);
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const available = existsSync(REPO);

describe.skipIf(!available)('time to first result, through the real engine', () => {
  it(`streams "${TERM}" on ${REPO}`, async () => {
    const engine = new ContentSearchEngine();
    try {
      const runs: Measured[] = [];
      for (let i = 0; i < RUNS; i += 1) {
        runs.push(await measure(engine, {}, `bench-${i}`));
      }
      const first = runs[0]!;
      const report = {
        repo: REPO,
        term: TERM,
        matches: first.matches,
        files: first.files,
        capped: first.capped,
        frames: first.frames,
        ttfrMs_median: +median(runs.map((r) => r.ttfrMs)).toFixed(2),
        ttfrMs_all: runs.map((r) => +r.ttfrMs.toFixed(2)),
        firstFrameMs_median: +median(runs.map((r) => r.firstFrameMs)).toFixed(2),
        totalMs_median: +median(runs.map((r) => r.totalMs)).toFixed(2),
        totalMs_all: runs.map((r) => +r.totalMs.toFixed(2))
      };
      console.log('[gmux search bench]', JSON.stringify(report, null, 2));

      expect(first.matches).toBeGreaterThan(0);
      // Tripwires, not the measurement: TTFR must stay in the same order of
      // magnitude as the research's ~3 ms even on a loaded CI-less laptop.
      expect(report.ttfrMs_median).toBeLessThan(60);
      expect(report.totalMs_median).toBeLessThan(5_000);
    } finally {
      engine.dispose();
    }
  }, 60_000);

  it('shows what the 20k cap buys: same TTFR, a fraction of the total', async () => {
    // The research's decisive claim (§3.1 conclusion 2): the cap is the
    // primary PERFORMANCE mechanism, not a safety valve. Running the same
    // query uncapped is the control.
    const engine = new ContentSearchEngine();
    try {
      const uncapped = await measure(
        engine,
        { maxResults: 5_000_000, maxPerFile: 1_000_000 },
        'bench-uncapped'
      );
      const uncappedNoIgnore = await measure(
        engine,
        {
          maxResults: 5_000_000,
          maxPerFile: 1_000_000,
          useIgnoreFiles: false
        },
        'bench-uncapped-noignore'
      );
      console.log(
        '[gmux search bench]',
        JSON.stringify(
          {
            repo: REPO,
            term: TERM,
            mode: 'UNCAPPED control',
            gitignore: {
              matches: uncapped.matches,
              files: uncapped.files,
              ttfrMs: +uncapped.ttfrMs.toFixed(2),
              firstFrameMs: +uncapped.firstFrameMs.toFixed(2),
              totalMs: +uncapped.totalMs.toFixed(2)
            },
            noIgnore: {
              matches: uncappedNoIgnore.matches,
              files: uncappedNoIgnore.files,
              ttfrMs: +uncappedNoIgnore.ttfrMs.toFixed(2),
              firstFrameMs: +uncappedNoIgnore.firstFrameMs.toFixed(2),
              totalMs: +uncappedNoIgnore.totalMs.toFixed(2)
            }
          },
          null,
          2
        )
      );
      expect(uncapped.capped).toBe(false);
      expect(uncapped.ttfrMs).toBeLessThan(60);
    } finally {
      engine.dispose();
    }
  }, 120_000);

  it('keeps TTFR flat with .gitignore turned off (43x more files)', async () => {
    const engine = new ContentSearchEngine();
    try {
      const runs: Measured[] = [];
      for (let i = 0; i < 3; i += 1) {
        runs.push(
          await measure(engine, { useIgnoreFiles: false }, `bench-noignore-${i}`)
        );
      }
      const report = {
        repo: REPO,
        term: TERM,
        mode: '--no-ignore, default 20k cap',
        matches: runs[0]!.matches,
        files: runs[0]!.files,
        capped: runs[0]!.capped,
        ttfrMs_median: +median(runs.map((r) => r.ttfrMs)).toFixed(2),
        firstFrameMs_median: +median(runs.map((r) => r.firstFrameMs)).toFixed(2),
        totalMs_median: +median(runs.map((r) => r.totalMs)).toFixed(2)
      };
      console.log('[gmux search bench]', JSON.stringify(report, null, 2));
      expect(report.ttfrMs_median).toBeLessThan(60);
    } finally {
      engine.dispose();
    }
  }, 60_000);
});
