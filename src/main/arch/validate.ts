/**
 * The hand written validator for `docs/arch/` (Phase 63, research 49 fix 10).
 *
 * There is no ajv here and there is no library that compiles a schema. That is
 * a charter refusal and it has two reasons. ajv generates code with the
 * Function constructor, which is exactly what Tortie refuses to let into a
 * process, and the overlay rule wants a narrow hand written type anyway. The
 * checks are the small throwing helpers in `./schema.ts`, caught once per row.
 *
 * ## The rule, stated once
 *
 * An invalid row is dropped whole and surfaces as a visible error naming the
 * file, the field and the reason. It is never partially merged, never silently
 * dropped and never a crash. One bad component costs that component and
 * nothing else. One bad edge costs that edge. A `contract.json` that cannot be
 * read costs the whole document, because there is nothing to hang the parts on,
 * and the caller keeps the last contract that did read, under a banner naming
 * the failure.
 *
 * ## What is checked here and what is checked in `./load.ts`
 *
 * This module checks one file at a time, from text or from parsed JSON. It
 * knows nothing about the other files. The cross file rules, being an edge
 * whose end names no component and a component whose layer names no band, are
 * in `./load.ts`, because they need the whole document. Both drop the row whole
 * the same way.
 *
 * ## Unknown fields are kept, not dropped
 *
 * Research 49 fix 16 says schema growth is a version bump with a converter, and
 * that unknown fields are preserved on read and ignored. So a field this build
 * does not know produces a problem naming it and does not take the row with it.
 * A contract written against a later schema still says something true about the
 * parts it names.
 */

import {
  ARCH_ACCEPTED_VERSIONS,
  ARCH_ANCHORLESS_KINDS,
  ARCH_CHECKERS,
  ARCH_COMPONENT_KINDS,
  ARCH_EDGE_KINDS,
  ARCH_EDGE_RULES,
  ARCH_LIMITS,
  ARCH_PROVENANCE,
  ARCH_ROW_KEYS,
  ARCH_STRICTNESS,
  type ArchBaseline,
  type ArchComponent,
  type ArchContract,
  type ArchEdge,
  type ArchEvidence,
  type ArchLayer,
  type ArchProblem
} from '@shared/arch';
import {
  ArchRowError,
  arrayField,
  boolField,
  dayField,
  enumField,
  fail,
  globField,
  idField,
  intField,
  objectField,
  oidField,
  optionalString,
  pathField,
  plainString,
  unknownKeys
} from './schema';

/** What one file produced, and everything Tortie refused inside it. */
export interface ArchFileResult<T> {
  value: T | null;
  problems: ArchProblem[];
}

/** What a list of rows produced. Rows that passed, and one problem per row that did not. */
export interface ArchRowsResult<T> {
  rows: T[];
  problems: ArchProblem[];
}

const problem = (file: string, field: string, message: string): ArchProblem => ({
  file,
  field,
  message
});

/** Report the fields this build ignores, without taking the row down with them. */
function noteUnknown(
  obj: Record<string, unknown>,
  known: readonly string[],
  file: string,
  field: string,
  problems: ArchProblem[]
): void {
  const extra = unknownKeys(obj, known);
  if (extra.length === 0) return;
  problems.push(
    problem(
      file,
      `${field}.${extra[0] ?? ''}`,
      `${field} has ${extra.length === 1 ? 'a field' : 'fields'} this ` +
        `build ignores: ${extra.join(', ')}. Tortie reads schema version ` +
        `${ARCH_ACCEPTED_VERSIONS.join(' and ')}, and it keeps the rest of ` +
        `the row.`
    )
  );
}

/** Turn any throw into one problem naming the field, so a row can never crash a read. */
function asProblem(err: unknown, file: string, field: string): ArchProblem {
  if (err instanceof ArchRowError) return problem(file, err.field, err.message);
  return problem(file, field, `${field} could not be read: ${String(err)}`);
}

// ---------------------------------------------------------------------------
// Evidence, which every other record embeds
// ---------------------------------------------------------------------------

/**
 * One quoted span. The quote is checked against the file at HEAD later, and the
 * object name is kept for display only, which is research 49 fix 2. A quote
 * inside an immutable blob can never fail, so checking against the blob would
 * be a check that always passes.
 */
function evidenceRow(raw: unknown, field: string): ArchEvidence {
  const obj = objectField(raw, field);
  const lineStart = intField(obj['lineStart'], `${field}.lineStart`, 1, 10_000_000);
  const lineEnd = intField(obj['lineEnd'], `${field}.lineEnd`, 1, 10_000_000);
  if (lineEnd < lineStart) {
    fail(
      `${field}.lineEnd`,
      `${field}.lineEnd is before ${field}.lineStart, so the span reads backwards.`
    );
  }
  const row: ArchEvidence = {
    path: pathField(obj['path'], `${field}.path`),
    lineStart,
    lineEnd,
    quote: plainString(obj['quote'], `${field}.quote`, ARCH_LIMITS.maxQuote)
  };
  if (obj['blobOid'] !== undefined) {
    row.blobOid = oidField(obj['blobOid'], `${field}.blobOid`);
  }
  return row;
}

/** Every quoted span on one row. A bad span drops the row that carries it. */
function evidenceList(raw: unknown, field: string): ArchEvidence[] {
  if (raw === undefined) return [];
  const list = arrayField(raw, field, ARCH_LIMITS.maxEvidence);
  return list.map((entry, i) => evidenceRow(entry, `${field}[${i}]`));
}

// ---------------------------------------------------------------------------
// contract.json
// ---------------------------------------------------------------------------

function layerRow(raw: unknown, field: string): ArchLayer {
  const obj = objectField(raw, field);
  return {
    id: idField(obj['id'], `${field}.id`),
    name: plainString(obj['name'], `${field}.name`, ARCH_LIMITS.maxName),
    order: intField(obj['order'], `${field}.order`, 0, 99)
  };
}

/**
 * The one file the whole document hangs on.
 *
 * There is no partial contract. A file that is not an object, that carries a
 * version this build does not read, or whose bands cannot be read, produces no
 * contract at all and one problem saying so. The caller keeps the last contract
 * that read and says on the face of the view that it is doing so.
 */
export function validateContract(
  raw: unknown,
  file: string
): ArchFileResult<ArchContract> {
  const problems: ArchProblem[] = [];
  try {
    const obj = objectField(raw, 'contract');
    const version = obj['version'];
    if (typeof version !== 'number' || !ARCH_ACCEPTED_VERSIONS.includes(version)) {
      fail(
        'contract.version',
        `${file} must say "version": ${ARCH_ACCEPTED_VERSIONS.join(
          ' or "version": '
        )}. This build reads no other version, and a later one is a version ` +
          `bump with a converter rather than a file Tortie guesses at.`
      );
    }
    noteUnknown(obj, ARCH_ROW_KEYS.contract, file, 'contract', problems);

    const rawLayers = arrayField(
      obj['layers'],
      'contract.layers',
      ARCH_LIMITS.maxLayers,
      ARCH_LIMITS.minLayers
    );
    const layers = rawLayers.map((entry, i) => {
      const layer = layerRow(entry, `contract.layers[${i}]`);
      noteUnknown(
        entry as Record<string, unknown>,
        ARCH_ROW_KEYS.layer,
        file,
        `contract.layers[${i}]`,
        problems
      );
      return layer;
    });
    const seenLayer = new Set<string>();
    for (const layer of layers) {
      if (seenLayer.has(layer.id)) {
        fail(
          'contract.layers',
          `contract.layers repeats the id "${layer.id}". A band is what a ` +
            `component points at, so two bands cannot share one name.`
        );
      }
      seenLayer.add(layer.id);
    }

    const rawFlows = arrayField(obj['flows'] ?? [], 'contract.flows', ARCH_LIMITS.maxFlows);
    const flows = rawFlows.map((entry, i) => idField(entry, `contract.flows[${i}]`));

    return {
      value: {
        version,
        subject: plainString(obj['subject'], 'contract.subject', ARCH_LIMITS.maxSubject),
        strictness: enumField(
          obj['strictness'] ?? 'not-wrong',
          'contract.strictness',
          ARCH_STRICTNESS
        ),
        layers,
        flows
      },
      problems
    };
  } catch (err) {
    problems.push(asProblem(err, file, 'contract'));
    return { value: null, problems };
  }
}

// ---------------------------------------------------------------------------
// components/<id>.json
// ---------------------------------------------------------------------------

/**
 * The recognisably a component rule (Phase 177, research 71 section 2).
 *
 * A `components/` file is a Tortie schema version 1 component exactly when it
 * is a JSON object whose `kind` is one of the kinds this build draws. The
 * kind is the discriminator on purpose: it is the one field a foreign schema
 * has never carried, and the one field every file Tortie itself writes must
 * carry. A file that fails this predicate is not a malformed component, it is
 * some other document that happens to live in the directory, and the operator's
 * ruling of 2026-08-30 is IGNORE QUIETLY: one calm line naming the file, never
 * the two red rows it drew before (the ignored fields note plus the kind enum
 * failure, 34 rows for rookery's 17 hand authored leftovers).
 *
 * A file that PASSES this predicate is a Tortie component, and the Phase 23
 * refusal survives untouched below: one bad field still drops it whole with
 * the field and the reason named.
 */
export function isTortieComponent(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
  const kind = (raw as Record<string, unknown>)['kind'];
  return (
    typeof kind === 'string' &&
    (ARCH_COMPONENT_KINDS as readonly string[]).includes(kind)
  );
}

/**
 * One component, from one file, so two people editing two parts do not conflict.
 *
 * `anchors` may be empty only for the two kinds that live outside the tree. A
 * component that claims a place in the code and names none of it would be
 * checked against nothing at all, and a promise checked against nothing is the
 * false green this whole design exists to refuse.
 */
export function validateComponent(
  raw: unknown,
  file: string
): ArchFileResult<ArchComponent> {
  const problems: ArchProblem[] = [];
  if (!isTortieComponent(raw)) {
    problems.push(
      problem(
        file,
        'component.kind',
        'Not a Tortie component, so this file was skipped. It names no kind ' +
          'this build knows.'
      )
    );
    return { value: null, problems };
  }
  try {
    const obj = objectField(raw, 'component');
    noteUnknown(obj, ARCH_ROW_KEYS.component, file, 'component', problems);

    const kind = enumField(obj['kind'], 'component.kind', ARCH_COMPONENT_KINDS);
    const rawAnchors = arrayField(
      obj['anchors'] ?? [],
      'component.anchors',
      ARCH_LIMITS.maxAnchors
    );
    const anchors = rawAnchors.map((entry, i) =>
      globField(entry, `component.anchors[${i}]`)
    );
    if (anchors.length === 0 && !ARCH_ANCHORLESS_KINDS.includes(kind)) {
      fail(
        'component.anchors',
        `component.anchors is empty, and a ${kind} lives in the tree. Only ` +
          `${ARCH_ANCHORLESS_KINDS.join(' and ')} may name no place, because ` +
          `they sit outside it. A component with no anchors is checked ` +
          `against nothing.`
      );
    }
    const rawGaps = arrayField(obj['gaps'] ?? [], 'component.gaps', ARCH_LIMITS.maxGaps);

    return {
      value: {
        id: idField(obj['id'], 'component.id'),
        name: plainString(obj['name'], 'component.name', ARCH_LIMITS.maxName),
        kind,
        layer: idField(obj['layer'], 'component.layer'),
        provenance: enumField(obj['provenance'], 'component.provenance', ARCH_PROVENANCE),
        anchors,
        boundary: enumField(obj['boundary'] ?? 'open', 'component.boundary', [
          'closed',
          'open'
        ] as const),
        description: optionalString(
          obj['description'] ?? '',
          'component.description',
          ARCH_LIMITS.maxDescription
        ),
        evidence: evidenceList(obj['evidence'], 'component.evidence'),
        deprecated: boolField(obj['deprecated'] ?? false, 'component.deprecated'),
        gaps: rawGaps.map((entry, i) =>
          plainString(entry, `component.gaps[${i}]`, ARCH_LIMITS.maxGap)
        )
      },
      problems
    };
  } catch (err) {
    problems.push(asProblem(err, file, 'component'));
    return { value: null, problems };
  }
}

// ---------------------------------------------------------------------------
// edges.json
// ---------------------------------------------------------------------------

function edgeRow(raw: unknown, field: string): ArchEdge {
  const obj = objectField(raw, field);
  const row: ArchEdge = {
    id: idField(obj['id'], `${field}.id`),
    from: idField(obj['from'], `${field}.from`),
    to: idField(obj['to'], `${field}.to`),
    kind: enumField(obj['kind'], `${field}.kind`, ARCH_EDGE_KINDS),
    rule: enumField(obj['rule'], `${field}.rule`, ARCH_EDGE_RULES),
    checker: enumField(obj['checker'], `${field}.checker`, ARCH_CHECKERS),
    evidence: evidenceList(obj['evidence'], `${field}.evidence`)
  };
  if (obj['label'] !== undefined) {
    row.label = optionalString(obj['label'], `${field}.label`, ARCH_LIMITS.maxLabel);
  }
  if (obj['note'] !== undefined) {
    row.note = optionalString(obj['note'], `${field}.note`, ARCH_LIMITS.maxNote);
  }
  return row;
}

/** The promises. A bad promise is dropped and the rest of the file still holds. */
export function validateEdges(raw: unknown, file: string): ArchRowsResult<ArchEdge> {
  const problems: ArchProblem[] = [];
  const rows: ArchEdge[] = [];
  let list: unknown[];
  try {
    const obj = objectField(raw, 'edges');
    noteUnknown(obj, ['edges'], file, 'edges', problems);
    list = arrayField(obj['edges'], 'edges.edges', ARCH_LIMITS.maxEdges);
  } catch (err) {
    problems.push(asProblem(err, file, 'edges'));
    return { rows, problems };
  }

  const seen = new Set<string>();
  list.forEach((raw2, index) => {
    const field = `edges[${index}]`;
    let row: ArchEdge;
    try {
      row = edgeRow(raw2, field);
    } catch (err) {
      problems.push(asProblem(err, file, field));
      return;
    }
    noteUnknown(raw2 as Record<string, unknown>, ARCH_ROW_KEYS.edge, file, field, problems);
    if (seen.has(row.id)) {
      problems.push(
        problem(
          file,
          `${field}.id`,
          `${field} repeats the id "${row.id}". The first promise with that ` +
            `id is used and this one is ignored, because a verdict keys on ` +
            `the id and two rows cannot share one verdict.`
        )
      );
      return;
    }
    seen.add(row.id);
    rows.push(row);
  });
  return { rows, problems };
}

// ---------------------------------------------------------------------------
// baseline.json
// ---------------------------------------------------------------------------

/**
 * The divergences a person decided to live with.
 *
 * Since Phase 158 this file has exactly one writer, being the accept button's
 * own channel through `./enrich/write.ts`; the enrichment pass can never
 * reach it. That is the ArchUnit pattern in its amended form, and it still
 * stops an agent quietly accepting its own violation. Every accepted row is
 * counted in the verdict strip with its reason on the face of it.
 */
export function validateBaseline(
  raw: unknown,
  file: string
): ArchFileResult<ArchBaseline> {
  const problems: ArchProblem[] = [];
  let list: unknown[];
  try {
    const obj = objectField(raw, 'baseline');
    noteUnknown(obj, ARCH_ROW_KEYS.baseline, file, 'baseline', problems);
    list = arrayField(obj['accepted'] ?? [], 'baseline.accepted', ARCH_LIMITS.maxAccepted);
  } catch (err) {
    problems.push(asProblem(err, file, 'baseline'));
    return { value: null, problems };
  }

  const accepted: ArchBaseline['accepted'] = [];
  list.forEach((raw2, index) => {
    const field = `baseline.accepted[${index}]`;
    try {
      const obj = objectField(raw2, field);
      noteUnknown(obj, ARCH_ROW_KEYS.accepted, file, field, problems);
      const row = {
        fromPath: pathField(obj['fromPath'], `${field}.fromPath`),
        toPath: pathField(obj['toPath'], `${field}.toPath`),
        because: plainString(obj['because'], `${field}.because`, ARCH_LIMITS.maxBecause),
        at: dayField(obj['at'], `${field}.at`)
      } as ArchBaseline['accepted'][number];
      if (obj['edgeId'] !== undefined) {
        row.edgeId = idField(obj['edgeId'], `${field}.edgeId`);
      }
      accepted.push(row);
    } catch (err) {
      problems.push(asProblem(err, file, field));
    }
  });
  return { value: { accepted }, problems };
}

// ---------------------------------------------------------------------------
// Text in, rows out
// ---------------------------------------------------------------------------

/**
 * Parse one contract file's text.
 *
 * A merge leaves conflict markers inside a JSON file, and that file then fails
 * here as an ordinary syntax error. The checker never tries to interpret a
 * conflict marker itself, which is why the one file per component layout
 * matters: a conflict is scoped to the parts both sides touched.
 */
export function parseArchJson(text: string, file: string): ArchFileResult<unknown> {
  try {
    return { value: JSON.parse(text) as unknown, problems: [] };
  } catch (err) {
    return {
      value: null,
      problems: [
        problem(
          file,
          'file',
          `${file} is not valid JSON: ${(err as Error).message}. If this file ` +
            `has just been merged, it may still hold conflict markers.`
        )
      ]
    };
  }
}
