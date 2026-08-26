/**
 * What the five checkers are handed, and what they hand back (Phase 63).
 *
 * A checker is a pure function from facts to verdicts. It opens no file, it
 * starts no process, and it holds no clock. Everything it needs about the tree
 * arrives in {@link ArchFactBase}, gathered by `../run.ts` through the one git
 * seam in `../git-facts.ts` and the resolver.
 *
 * That shape is what makes the Tier 3 evidence possible. The gate drives all
 * five checkers over a committed fixture, compares every verdict against a
 * written expectation table, and never starts a process, so the argv defense
 * can be asserted over every argv the run composed rather than over the ones a
 * live repository happened to need.
 *
 * ## The conservative verdict rule lives in these types
 *
 * Research 49 fix 3. An import specifier that could not be resolved, or an end
 * of a promise that sits outside the grammars this build parses, yields
 * `unverifiable` with a reason. It never yields a green `must-not` and never
 * yields a divergence. Extraction failure and genuine absence are
 * indistinguishable without that rule, and a false green on a `must-not`
 * promise is the single most damaging thing this feature could print. The
 * unresolved count travels with the fact base so the view can say "412 of 9,800
 * imports unresolved" on its own face, and a resolver miss can never wear the
 * clothes of a verified absence.
 */

import type { ArchImportResolution } from '../db';
import type {
  ArchBaseline,
  ArchComponent,
  ArchContract,
  ArchCoverage,
  ArchEdge,
  ArchVerdictStatus
} from '@shared/arch';

/**
 * One import the extractor found, with the answer the resolver gave.
 *
 * `resolution` IS THE FIELD THE CHECKERS READ, and `toPath` is not a substitute
 * for it. The first build of this feature had `toPath` null for three of the
 * four answers, and `buildImportGraph` read that null as "this could not be
 * resolved", so every `node:path` and every `react` was counted as a resolver
 * failure. Measured on Tortie's own tree, the verdict strip said 2,363 of 8,447
 * imports were unresolved when the true number was none of them, and a real
 * promise between two parts went grey with a reason that named forty two node
 * builtins. An answer of `external` is a DEFINITE answer and it never blocks a
 * verdict. `unresolved` and `unverifiable` are the two that do.
 *
 * `reason` says why in words a person can read, e.g. "Imports are not resolved
 * for Rust", and is null when the specifier resolved to a file.
 */
export interface ArchImportFact {
  fromPath: string;
  specifier: string;
  line: number;
  /** The tracked path the specifier names. Non null exactly when first party. */
  toPath: string | null;
  /** What the resolver concluded, and the only field a checker may branch on. */
  resolution: ArchImportResolution;
  /** Why it has no first party path. Null when it has one. */
  reason: string | null;
}

/** What a manifest file declares, parsed by `./manifest.ts`. */
export interface ArchManifestFacts {
  /** Every dependency name declared anywhere in the tree, lower cased once. */
  names: Set<string>;
  /** The manifest files that were read, for the reason line on an unverifiable verdict. */
  filesRead: string[];
}

/** A language whose files exist but whose imports this build does not read. */
export interface ArchUnparsedLanguage {
  language: string;
  files: number;
}

/** Everything the five checkers see. Gathered once per run. */
export interface ArchFactBase {
  /** The contract, its parts and its promises, already validated. */
  contract: ArchContract;
  components: ArchComponent[];
  edges: ArchEdge[];
  baseline: ArchBaseline;
  /** Every tracked path at HEAD, from one fixed argv `git ls-files -z`. */
  trackedFiles: string[];
  /** Every import the extractor found, resolved or not. */
  imports: ArchImportFact[];
  /** What the dependency files declare. */
  manifest: ArchManifestFacts;
  /** The file bytes at HEAD for every path evidence names, keyed by path. */
  headBytes: Map<string, string | null>;
  /** How many commits touch each anchor subtree, keyed by component id. */
  commitsBehind: Map<string, number>;
  /** How many files are changed and not committed under each component. */
  uncommittedFiles: Map<string, number>;
  /** The commit every verdict in this run is stamped with. */
  headCommit: string;
  /** Languages with files in the tree whose imports this build does not read. */
  unparsed: ArchUnparsedLanguage[];
}

/** One offending place, before it is re-verified against current bytes. */
export interface ArchOffence {
  fromPath: string;
  toPath: string;
  line: number;
  specifier: string;
}

/** What one checker concluded about one subject. */
export interface ArchCheckerVerdict {
  subjectId: string;
  status: ArchVerdictStatus;
  coverage: ArchCoverage;
  reason: string | null;
  offending?: ArchOffence[];
  /** True when a baseline row already accepted this exact divergence. */
  accepted?: boolean;
}

/** What one checker produced in one run. */
export interface ArchCheckerResult {
  checker: string;
  verdicts: ArchCheckerVerdict[];
  durationMs: number;
}

/** An empty fact base, for a checker's own test and for the gate's controls. */
export function emptyManifestFacts(): ArchManifestFacts {
  return { names: new Set<string>(), filesRead: [] };
}
