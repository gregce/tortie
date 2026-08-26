/**
 * The five checkers, run together, and the counts the verdict strip draws
 * (Phase 63, research 49 fix 7).
 *
 * ## The strip reports by coverage, so the total cannot flatter
 *
 * "12 checked and hold, 1 broke, 21 cannot be checked" is a sentence a person
 * can act on. "34 of 34 pass" over the same run is a lie of aggregation, and it
 * is the shape every dead version of this feature printed. So the counts below
 * are separated by coverage first and by status second, and the accepted
 * divergences keep a column of their own rather than being folded into the ones
 * that hold.
 *
 * ## Nothing here starts anything
 *
 * These are pure functions over a fact base. Running them starts no process,
 * opens no file and sends nothing anywhere. That is what makes the Zen line
 * true: a contract file changing causes reads and the fixed argv git calls in
 * `../argv-guard.ts`, and never a launch.
 */

import type { ArchCoverageCounts } from '@shared/arch';
import type { ArchCheckerResult, ArchCheckerVerdict, ArchFactBase } from './facts';
import { buildImportGraph, checkImports } from './imports';
import { checkEvidence } from './evidence';
import { checkFreshness } from './freshness';
import { checkGlobs } from './glob';
import { checkManifest } from './manifest';

/** The five, in the order the gate prints them. */
export const ARCH_CHECKER_ORDER: readonly string[] = [
  'imports',
  'manifest',
  'glob',
  'evidence',
  'freshness'
];

/** What one whole run produced. */
export interface ArchRunResult {
  results: ArchCheckerResult[];
  verdicts: ArchCheckerVerdict[];
  counts: ArchCoverageCounts;
  durationMs: number;
}

/** Run all five over one fact base. */
export function runCheckers(facts: ArchFactBase): ArchRunResult {
  const started = Date.now();
  const results = [
    checkImports(facts),
    checkManifest(facts),
    checkGlobs(facts),
    checkEvidence(facts),
    checkFreshness(facts)
  ];
  const verdicts = results.flatMap((r) => r.verdicts);
  return {
    results,
    verdicts,
    counts: countByCoverage(verdicts, facts),
    durationMs: Date.now() - started
  };
}

/**
 * The strip's own counts.
 *
 * A freshness row is not counted at all. It is a sentence about how far the
 * code has moved and never a claim that holds or breaks, so counting it as
 * "cannot be checked" would put one row per part into a number a person reads
 * as a gap in the checking.
 */
export function countByCoverage(
  verdicts: readonly ArchCheckerVerdict[],
  facts: ArchFactBase
): ArchCoverageCounts {
  const graph = buildImportGraph(facts);
  let checkedHold = 0;
  let broke = 0;
  let cannotCheck = 0;
  let accepted = 0;
  for (const verdict of verdicts) {
    if (verdict.subjectId.endsWith('#freshness')) continue;
    if (verdict.accepted === true) {
      accepted += 1;
      continue;
    }
    if (verdict.coverage === 'unverifiable') {
      cannotCheck += 1;
      continue;
    }
    if (verdict.status === 'divergent' || verdict.status === 'absent') {
      broke += 1;
      continue;
    }
    checkedHold += 1;
  }
  return {
    checkedHold,
    broke,
    cannotCheck,
    accepted,
    unresolvedImports: graph.unresolvedImports,
    totalImports: graph.totalImports
  };
}

/** The one line the strip draws, so the wording lives beside the counting. */
export function coverageSentence(counts: ArchCoverageCounts): string {
  const parts = [
    `${counts.checkedHold} checked and hold`,
    `${counts.broke} broke`,
    `${counts.cannotCheck} cannot be checked`
  ];
  if (counts.accepted > 0) parts.push(`${counts.accepted} accepted on purpose`);
  const unresolved =
    counts.totalImports === 0
      ? ''
      : ` ${counts.unresolvedImports} of ${counts.totalImports} imports unresolved.`;
  return `${parts.join(', ')}.${unresolved}`;
}

export * from './facts';
export { buildImportGraph, checkImports } from './imports';
export { checkEvidence, evidencePaths, evidenceRequest, quoteLine } from './evidence';
export {
  checkFreshness,
  commitsSinceContract,
  countCommitsBehind,
  countUncommitted,
  freshnessSentence
} from './freshness';
export {
  checkGlobs,
  componentFiles,
  fileOwners,
  globMatches,
  matchAnchor
} from './glob';
export {
  ARCH_MANIFEST_FILES,
  checkManifest,
  collectManifestFacts,
  parseManifest
} from './manifest';
