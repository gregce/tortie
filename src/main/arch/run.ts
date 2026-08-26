/**
 * One check run, end to end (Phase 63).
 *
 * It gathers the facts through the one git seam, runs the five checkers, and
 * hands back the verdicts and the counts. It is the only caller of the five
 * argv composers, so every process this feature ever starts is visible in one
 * screen of code.
 *
 * ## What it starts, counted
 *
 * Five git calls per run at most, being `ls-files`, `rev-parse` for the stamp,
 * `cat-file --batch`, `log` and `status`. Every one is a fixed argv from
 * `./argv-guard.ts`. It starts no agent, no ripgrep, no shell and no Electron.
 * The proof the phase owes for this is a measured count of processes started by
 * a contract file change alone, and the number is zero beyond those calls.
 *
 * ## The one call whose cost is not bounded, said plainly
 *
 * The freshness walk asks git for the WHOLE history, every run, and buckets it
 * in this process. Research 49 fix 5 exempts it from the budget on purpose,
 * because the 5 s budget is for the incremental re-check that rides the
 * watcher. Measured on this tree the walk is about 80 ms and on a 2,480 file
 * Rust repository about 140 ms.
 *
 * It is not a range, and that is a consequence of the argv defense rather than
 * an oversight. A range would have to start at the commit the contract was last
 * written at, and finding that commit means asking git about a path inside
 * `docs/arch/`, whose file names are chosen by whoever last pushed. So the walk
 * is unbounded on purpose and the truncation happens in
 * `./checkers/freshness.ts`, which cuts the newest-first list at the first
 * commit that touched `docs/arch/`. There is deliberately no `-n` limit on the
 * argv either: a number is not a word `./argv-guard.ts` allows, and widening
 * the guard to carry one would cost more than the bound is worth.
 *
 * ## What it does NOT own
 *
 * The watcher, the coalescing, the settle window and the generation stamp are
 * Builder B's, in `./watch.ts`. This module is the body those things call, and
 * it holds no timer and no state of its own, so a run can be started twice and
 * the second one cannot see the first one's leftovers.
 *
 * The import facts come from the resolver, also Builder B's. They arrive as
 * {@link ArchImportSource}, which is a function rather than a module import, so
 * this module can be driven with no resolver at all. A run with no resolver
 * reports every promise as unverifiable with the reason, which is the
 * conservative rule doing exactly what it exists to do.
 */

import type { ArchDocument } from '@shared/arch';
import {
  catFileBatchCall,
  logNameOnlyCall,
  lsFilesCall,
  revParseHeadCall,
  statusPorcelainCall,
  type ArchGitCall
} from './argv-guard';
import {
  readCatFileBatch,
  readLogNameOnly,
  readLsFiles,
  readStatusPorcelain,
  type ArchGitRunner
} from './git-facts';
import { runCheckers, type ArchRunResult } from './checkers';
import {
  commitsSinceContract,
  countCommitsBehind,
  countUncommitted,
  evidencePaths,
  evidenceRequest,
  type ArchFactBase,
  type ArchImportFact,
  type ArchManifestFacts,
  type ArchUnparsedLanguage
} from './checkers';
import { collectManifestFacts } from './checkers/manifest';

/** Where the import facts come from. Builder B's resolver fills this in. */
export type ArchImportSource = () => Promise<{
  imports: ArchImportFact[];
  unparsed: ArchUnparsedLanguage[];
}>;

/** What one run needs to happen at all. */
export interface ArchRunInput {
  document: ArchDocument;
  git: ArchGitRunner;
  imports?: ArchImportSource;
  /** Every call this run composed, appended in order. The gate passes one in. */
  record?: ArchGitCall[];
}

/** The five calls this feature can make, and the run is where they are made. */
async function ask(
  input: ArchRunInput,
  call: ArchGitCall
): Promise<{ code: number; stdout: Buffer }> {
  input.record?.push(call);
  const result = await input.git.run(call);
  return { code: result.code, stdout: result.stdout };
}

/**
 * Gather everything the checkers see.
 *
 * A git call that fails is not a crash and not a divergence. Its facts go
 * missing, and the checkers that needed them answer unverifiable with the
 * reason, because a checker that treated a failed read as an absence would
 * print the false green this design exists to refuse.
 */
export async function gatherFacts(input: ArchRunInput): Promise<ArchFactBase | null> {
  const { document } = input;
  if (document.contract === null) return null;

  const tracked = await ask(input, lsFilesCall());
  const trackedFiles = tracked.code === 0 ? readLsFiles(tracked.stdout) : [];

  const head = await ask(input, revParseHeadCall());
  const headCommit =
    head.code === 0 ? head.stdout.toString('utf8').trim().slice(0, 40) : '';

  // The evidence reads and the manifest reads share one batch, because both
  // want file bytes at HEAD and one process is cheaper than two.
  const quotePaths = evidencePaths(document);
  const manifestPaths = trackedFiles.filter((path) =>
    ARCH_MANIFEST_BASENAMES.includes(path.split('/').pop() ?? '')
  );
  const wanted = [...new Set([...quotePaths, ...manifestPaths])].sort();
  const requests = wanted.map((path) => evidenceRequest(path));
  const headBytes = new Map<string, string | null>();
  let manifest: ArchManifestFacts = { names: new Set<string>(), filesRead: [] };
  if (requests.length > 0) {
    const batch = await ask(input, catFileBatchCall(requests));
    if (batch.code === 0) {
      const answers = readCatFileBatch(batch.stdout, requests);
      answers.forEach((answer, index) => {
        const path = wanted[index] ?? '';
        headBytes.set(path, answer.bytes === null ? null : answer.bytes.toString('utf8'));
      });
      manifest = collectManifestFacts(
        manifestPaths.map((path) => ({ path, text: headBytes.get(path) ?? '' }))
      );
    }
  }

  // Freshness. One log walk and one status read, both bucketed in process. The
  // walk is the whole history and the cut is made here, at the first commit
  // that touched `docs/arch/`, because that is the point the contract was last
  // written and a range would need a contract path on a command line.
  const log = await ask(input, logNameOnlyCall());
  const walked = log.code === 0 ? readLogNameOnly(log.stdout) : [];
  const commits = commitsSinceContract(walked);
  const status = await ask(input, statusPorcelainCall());
  const changed = status.code === 0 ? readStatusPorcelain(status.stdout) : [];

  const resolved = input.imports === undefined ? null : await input.imports();

  return {
    contract: document.contract,
    components: document.components,
    edges: document.edges,
    baseline: document.baseline,
    trackedFiles,
    imports: resolved?.imports ?? [],
    manifest,
    headBytes,
    commitsBehind: countCommitsBehind(document.components, trackedFiles, commits),
    uncommittedFiles: countUncommitted(document.components, changed),
    headCommit,
    unparsed: resolved?.unparsed ?? [
      {
        language: 'every language',
        files: trackedFiles.length
      }
    ]
  };
}

/** The manifest file names, kept here so the batch knows what to ask for. */
const ARCH_MANIFEST_BASENAMES: readonly string[] = [
  'package.json',
  'go.mod',
  'Cargo.toml',
  'Package.swift',
  'requirements.txt'
];

/** Gather the facts and run the five checkers. Null when there is no contract to check. */
export async function runArchCheck(input: ArchRunInput): Promise<ArchRunResult | null> {
  const facts = await gatherFacts(input);
  if (facts === null) return null;
  return runCheckers(facts);
}
