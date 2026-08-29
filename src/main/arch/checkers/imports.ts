/**
 * The imports checker (Phase 63, research 49 section 4.4 and fix 3).
 *
 * **It judges every `imports` promise and every closed boundary**, from the
 * import graph the extractor and the resolver built. It is the only checker
 * that can ever say `checked` about a promise between two parts, because an
 * import is the one edge kind that is decidable from the text of the code.
 *
 * ## The conservative verdict rule, which is the whole of the correctness here
 *
 * A definite verdict requires a resolved search that returned a definite
 * answer. So:
 *
 * - A `must-not` with a resolved import across it is `divergent`, and that is
 *   definite because the import was found rather than not found.
 * - A `must-not` with no import across it, where some import out of the source
 *   part did not resolve, is `unverifiable` with the reason. It is NEVER green.
 *   Extraction failure and genuine absence look identical from here, and a
 *   false green on a `must-not` is the most damaging thing this feature could
 *   print.
 * - A `must` with no import across it, and nothing unresolved, is `absent`.
 * - A `may` permits rather than requires, so it cannot break. It is convergent
 *   and it says so.
 *
 * ## The coverage ceiling, and it never moves
 *
 * Only an `imports` edge can be `checked`. A `calls`, `spawns`, `emits` or any
 * other behavioural verb judged by this checker tops out at `partly-checked`
 * forever, because proving that one file imports another proves nothing about
 * whether the call happens at run time. There is no verified call graph in this
 * product and there never will be.
 *
 * ## An accepted divergence stays a divergence
 *
 * A row in `docs/arch/baseline.json` marks a divergence a person decided to
 * live with. It does not make the divergence disappear. The verdict stays
 * `divergent`, it carries `accepted` and the person's own `because` text, and
 * the strip counts it in its own column rather than folding it into the ones
 * that hold. Tortie reads that file and never writes it, so an agent cannot
 * accept its own violation, and it cannot hide one either.
 */

import { ARCH_STRUCTURAL_EDGE_KINDS, type ArchEdge } from '@shared/arch';
import type {
  ArchCheckerResult,
  ArchCheckerVerdict,
  ArchFactBase,
  ArchOffence
} from './facts';
import { fileOwners } from './glob';

/** One import that crossed from one part to another. */
interface CrossingImport extends ArchOffence {
  from: string;
  to: string;
}

/** The import graph, grouped the two ways the checks below ask for it. */
export interface ArchImportGraph {
  /** Every resolved import that crossed a component line. */
  crossings: CrossingImport[];
  /**
   * Per component, how many imports out of its files came back with NO answer.
   *
   * `unresolved` and `unverifiable` count here and `external` does not. A
   * dependency is a definite answer and it can never have been a hidden edge to
   * another part, so counting it would grey out every promise in a project that
   * has dependencies, which is every project.
   */
  unresolvedFrom: Map<string, number>;
  /** How many imports were looked at, and how many came back with no answer. */
  totalImports: number;
  unresolvedImports: number;
}

/**
 * Group the raw import facts by the components that own their two ends.
 *
 * A file no component claims is not counted at all. Under `not-wrong`
 * strictness, which is the default, unmapped code is counted rather than
 * failed, and it is the view that says how much of the tree is unmapped.
 */
export function buildImportGraph(facts: ArchFactBase): ArchImportGraph {
  const owners = fileOwners(facts.components, facts.trackedFiles);
  const crossings: CrossingImport[] = [];
  const unresolvedFrom = new Map<string, number>();
  let totalImports = 0;
  let unresolvedImports = 0;

  for (const fact of facts.imports) {
    const fromIds = owners.get(fact.fromPath) ?? [];
    if (fromIds.length === 0) continue;
    totalImports += 1;
    // THE BRANCH IS ON THE ANSWER, NEVER ON `toPath`. Three of the four answers
    // carry a null path and only two of them are failures. An `external` is a
    // dependency the resolver identified, so it is neither a crossing nor a
    // reason to withhold a verdict.
    if (fact.resolution === 'external') continue;
    if (fact.resolution !== 'first-party' || fact.toPath === null) {
      unresolvedImports += 1;
      for (const id of fromIds) {
        unresolvedFrom.set(id, (unresolvedFrom.get(id) ?? 0) + 1);
      }
      continue;
    }
    const toIds = owners.get(fact.toPath) ?? [];
    for (const from of fromIds) {
      for (const to of toIds) {
        if (from === to) continue;
        crossings.push({
          from,
          to,
          fromPath: fact.fromPath,
          toPath: fact.toPath,
          line: fact.line,
          specifier: fact.specifier
        });
      }
    }
  }
  return { crossings, unresolvedFrom, totalImports, unresolvedImports };
}

/** The reason line a person reads when a resolver miss stopped a definite answer. */
function unresolvedReason(count: number, unparsed: ArchFactBase['unparsed']): string {
  const languages =
    unparsed.length === 0
      ? ''
      : ` ${unparsed
          .map((row) => `${row.language}, ${row.files} files, import checking off`)
          .join('. ')}.`;
  return (
    `${count} ${count === 1 ? 'import' : 'imports'} out of this part could ` +
    `not be resolved, so Tortie cannot say the promise holds. A promise is ` +
    `only green when the search that would have broken it came back with a ` +
    `definite answer.${languages}`
  );
}

/**
 * The reason line for a closed boundary, which is about a different set of
 * imports from the one a promise asks about.
 */
function boundaryUnresolvedReason(
  count: number,
  unparsed: ArchFactBase['unparsed']
): string {
  const languages =
    unparsed.length === 0
      ? ''
      : ` ${unparsed
          .map((row) => `${row.language}, ${row.files} files, import checking off`)
          .join('. ')}.`;
  return (
    `${count} ${count === 1 ? 'import' : 'imports'} written in the parts that ` +
    `are not allowed in here came back with no answer, so Tortie cannot say ` +
    `nothing crosses into this one. A boundary is only green when every ` +
    `import that could have crossed it was resolved.${languages}`
  );
}

/** Every accepted row that covers one offence, in the person's own words. */
function acceptanceFor(
  facts: ArchFactBase,
  edge: ArchEdge | null,
  offence: ArchOffence
): string | null {
  for (const row of facts.baseline.accepted) {
    if (row.edgeId !== undefined && row.edgeId !== edge?.id) continue;
    if (row.fromPath !== offence.fromPath) continue;
    if (row.toPath !== offence.toPath) continue;
    return row.because;
  }
  return null;
}

/**
 * Split offences into the ones a person accepted and the ones nobody has.
 *
 * `marked` is the whole list again with the accepted ones carrying the
 * person's reason, and it is what the verdict reports as `offending`. A
 * promise with three offences accepted and six open stays divergent, and
 * the failing row needs to know which three, or it offers an accept control
 * on a line the person accepted a moment ago and the strip counts none of
 * it (the Phase 158 verifier's finding).
 */
function partitionAccepted(
  facts: ArchFactBase,
  edge: ArchEdge | null,
  offences: readonly ArchOffence[]
): { open: ArchOffence[]; accepted: string[]; marked: ArchOffence[] } {
  const open: ArchOffence[] = [];
  const accepted: string[] = [];
  const marked: ArchOffence[] = [];
  for (const offence of offences) {
    const because = acceptanceFor(facts, edge, offence);
    if (because === null) {
      open.push(offence);
      marked.push(offence);
    } else {
      accepted.push(because);
      marked.push({ ...offence, accepted: because });
    }
  }
  return { open, accepted, marked };
}

/** The best coverage this edge kind can ever earn. */
function ceilingFor(edge: ArchEdge): 'checked' | 'partly-checked' {
  return ARCH_STRUCTURAL_EDGE_KINDS.includes(edge.kind) ? 'checked' : 'partly-checked';
}

/** Judge one promise. */
function checkEdge(
  facts: ArchFactBase,
  graph: ArchImportGraph,
  edge: ArchEdge
): ArchCheckerVerdict {
  const subjectId = `edge:${edge.id}`;
  const coverage = ceilingFor(edge);
  const across = graph.crossings.filter((c) => c.from === edge.from && c.to === edge.to);
  const unresolved = graph.unresolvedFrom.get(edge.from) ?? 0;

  if (edge.rule === 'may') {
    return {
      subjectId,
      status: 'convergent',
      coverage,
      reason:
        `This promise permits rather than requires, so nothing can break it. ` +
        `It is what keeps a closed boundary from calling this import a ` +
        `divergence.`
    };
  }

  if (edge.rule === 'must-not') {
    if (across.length > 0) {
      const { open, accepted, marked } = partitionAccepted(facts, edge, across);
      return {
        subjectId,
        status: 'divergent',
        coverage,
        offending: marked,
        ...(accepted.length > 0 && open.length === 0 ? { accepted: true } : {}),
        reason:
          accepted.length > 0 && open.length === 0
            ? `Every one of these ${across.length} was accepted on purpose: ` +
              `${accepted.join(' ')}`
            : `${open.length} ${open.length === 1 ? 'import crosses' : 'imports cross'} ` +
              `a line this contract says nothing may cross.`
      };
    }
    if (unresolved > 0) {
      return {
        subjectId,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason: unresolvedReason(unresolved, facts.unparsed)
      };
    }
    return { subjectId, status: 'convergent', coverage, reason: null };
  }

  // must
  if (across.length > 0) return { subjectId, status: 'convergent', coverage, reason: null };
  if (unresolved > 0) {
    return {
      subjectId,
      status: 'unverifiable',
      coverage: 'unverifiable',
      reason: unresolvedReason(unresolved, facts.unparsed)
    };
  }
  return {
    subjectId,
    status: 'absent',
    coverage,
    reason:
      `This contract says one part imports another, and no import between ` +
      `them was found. The promise may have been kept in a different way, or ` +
      `the code may have moved.`
  };
}

/**
 * Judge one closed boundary.
 *
 * Closed means an import into this part, from a part with no `may` and no
 * `must` promise pointing at it, is a divergence. It is the one rule in the
 * format that judges code nobody wrote a promise about, which is why it is opt
 * in per component rather than on by default.
 */
function checkBoundary(
  facts: ArchFactBase,
  graph: ArchImportGraph,
  componentId: string
): ArchCheckerVerdict {
  const subjectId = `component:${componentId}#boundary`;
  const allowed = new Set(
    facts.edges
      .filter((e) => e.to === componentId && (e.rule === 'may' || e.rule === 'must'))
      .map((e) => e.from)
  );
  const offences = graph.crossings.filter(
    (c) => c.to === componentId && !allowed.has(c.from)
  );
  if (offences.length === 0) {
    // WHICH MISSES COULD HAVE HIDDEN A CROSSING INTO THIS PART, and no others.
    // An import that came back with no answer might have named a file in here,
    // so it withholds the verdict. But only one written in a part that is not
    // this one and is not already allowed to import into it: this part's own
    // imports go outward, and an allowed part's import would be permitted
    // whatever it named. The first build summed every component in the
    // repository, so one miss anywhere made every closed boundary in the
    // project unverifiable, and the reason line said "out of this part" about
    // a number that was about somewhere else.
    let blindSpots = 0;
    for (const [id, count] of graph.unresolvedFrom) {
      if (id === componentId || allowed.has(id)) continue;
      blindSpots += count;
    }
    if (blindSpots > 0) {
      return {
        subjectId,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason: boundaryUnresolvedReason(blindSpots, facts.unparsed)
      };
    }
    return { subjectId, status: 'convergent', coverage: 'checked', reason: null };
  }
  const { open, accepted, marked } = partitionAccepted(facts, null, offences);
  // The sentence says PARTS, so it counts parts. `open` is a list of offending
  // imports, and eight imports from one part is one part importing.
  const openParts = new Set(
    open.map((offence) => offendingComponent(offences, offence))
  ).size;
  return {
    subjectId,
    status: 'divergent',
    coverage: 'checked',
    offending: marked,
    ...(accepted.length > 0 && open.length === 0 ? { accepted: true } : {}),
    reason:
      accepted.length > 0 && open.length === 0
        ? `Every one of these ${offences.length} was accepted on purpose: ${accepted.join(' ')}`
        : `${openParts} ${openParts === 1 ? 'part imports' : 'parts import'} ` +
          `into this one, and this contract closes it to everything it has ` +
          `not promised.`
  };
}

/** Which component one offence was written in, from the crossing it came from. */
function offendingComponent(
  crossings: readonly CrossingImport[],
  offence: ArchOffence
): string {
  const hit = crossings.find(
    (c) =>
      c.fromPath === offence.fromPath &&
      c.line === offence.line &&
      c.specifier === offence.specifier
  );
  return hit?.from ?? offence.fromPath;
}

/** Run the imports checker over every promise it owns and every closed boundary. */
export function checkImports(facts: ArchFactBase): ArchCheckerResult {
  const started = Date.now();
  const graph = buildImportGraph(facts);
  const verdicts: ArchCheckerVerdict[] = [];
  for (const edge of facts.edges) {
    if (edge.checker !== 'imports') continue;
    verdicts.push(checkEdge(facts, graph, edge));
  }
  for (const component of facts.components) {
    if (component.boundary !== 'closed') continue;
    verdicts.push(checkBoundary(facts, graph, component.id));
  }
  return { checker: 'imports', verdicts, durationMs: Date.now() - started };
}
