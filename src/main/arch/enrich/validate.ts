/**
 * The enrichment validator (Phase 158). An answer is refused WHOLE.
 *
 * The discipline is the fold's (src/main/overview/fold/validate.ts): a
 * candidate that fails any rule is refused whole rather than trimmed, the
 * refusal carries one short name, and a refused run is still recorded so a
 * refusal rate that climbs is readable. None of the fold's RULES apply here,
 * because a contract must contain digits, paths and file names that a one
 * line summary must not.
 *
 * The checks, in the order they run, and every one refuses the whole answer:
 *
 *  1. `bad-shape`: not one JSON object of exactly {contract, components,
 *     edges, suggestions}, with suggestions optional.
 *  2. `baseline-content`: the answer carries baseline or accepted content
 *     anywhere at its top level. Tortie never writes baseline.json from this
 *     pass, so the model cannot be allowed to smuggle one.
 *  3. `invalid-row`: any file level validator problem at all, through the
 *     SAME load side validators docs/arch/ is read with. This is stricter
 *     than load, which drops a bad row singly: the pass is proposing bytes,
 *     and a proposal that is partly wrong is wrong. An unknown key, tolerated
 *     on read, is a refusal here.
 *  4. `contract-changed`: subject, version, layers or flows moved.
 *     Strictness is a judgement and may move in a whole pass. Under a drift
 *     scope the whole contract must come back byte identical, because the
 *     contract never drifts and a repair has no business in it (the fix
 *     round of Phase 159 found strictness flipping beside an honest repair).
 *  5. `component-set-changed`, `anchors-changed`, `kind-changed`: the map
 *     binding. The component id set must equal the draft's exactly, each
 *     component's anchors must be byte identical, and its kind must stand.
 *     Enriching in place is what guarantees every component paints its own
 *     box under the strict majority rule in ../map.ts, so this check is the
 *     whole of map binding rule 1.
 *  6. `evidence-not-allowed`: an evidence row that is not byte identical to a
 *     row the draft already holds under the same part or promise. The model
 *     never read the code, so a quote it wrote would be an invention by
 *     construction; a quote a person wrote is carried forward as written, and
 *     an answer may DROP one (a stale quote is a repair) and may never add
 *     one. Phase 158 refused every row, which made a whole pass over a hand
 *     written contract delete every quote in it; Phase 159 amended the rule.
 *  7. `edge-endpoints`: an edge end that names no drafted component. New
 *     edges BETWEEN drafted ids are allowed, because a must-not is precisely
 *     a promise about an import that does not happen.
 *  8. `invented-number`: a maximal digit run in a prose field that does not
 *     appear verbatim in the composed fact block. The fold's lesson applied:
 *     a prompt asks, this decides. A prose field the answer returns BYTE
 *     IDENTICAL to the draft's own field is exempt, because the model did
 *     not write it: the skeleton or a person did, and the digits were
 *     already on disk. Without that exemption no drift repair over the
 *     contract Phase 158 writes could ever be kept, because the skeleton's
 *     own may note says "5 to 10 promises" and a scoped fact block does not.
 *  9. `suggestions-invalid`: a suggestion that is not a bounded plain
 *     sentence. Suggestions land on the run's face and are NEVER written to
 *     docs/arch/.
 * 10. `outside-drift` (Phase 159), only when the context carries a scope: a
 *     part not in the scope that is not byte identical to the draft's, a
 *     promise not in the scope that is not byte identical to the draft's, a
 *     promise the draft never held, or a promise the answer dropped. A drift
 *     repair touches what drifted and nothing else, and this is the rule
 *     that makes the instruction true. A promise IN the scope keeps its
 *     from, to, kind and checker too: a repair may change what a promise
 *     says (its rule, its words, its gap) and never what it is about, so a
 *     broken "tests must not import scripts" cannot come back under the
 *     same id as a promise about two other parts. A part IN the scope keeps
 *     its layer, provenance, boundary and deprecated flag for the same
 *     reason: a repair may change what a part says (its name, description,
 *     gaps, a dropped quote) and never what it is. The re-verify of Phase
 *     159 landed all four through a repair before this line existed.
 *
 * On refusal nothing downstream runs: the writer is never reached, the
 * previous contract stays byte identical on disk, and the run is recorded
 * refused with the refusal's name.
 */

import type {
  ArchComponent,
  ArchContract,
  ArchDocument,
  ArchEdge,
  ArchProblem
} from '@shared/arch';
import {
  parseArchJson,
  validateComponent,
  validateContract,
  validateEdges
} from '../validate';
import type { ArchDriftScope } from './drift';

/** A generous ceiling on the raw answer, far under the spawn's own 512 KB. */
export const ARCH_ANSWER_MAX_BYTES = 256 * 1024;

/** How many suggestions one answer may carry. */
export const ARCH_MAX_SUGGESTIONS = 16;

/** How long one suggestion sentence may be. */
export const ARCH_MAX_SUGGESTION_CHARS = 500;

export type ArchEnrichRefusal =
  | 'too-large'
  | 'bad-shape'
  | 'baseline-content'
  | 'invalid-row'
  | 'contract-changed'
  | 'component-set-changed'
  | 'anchors-changed'
  | 'kind-changed'
  | 'evidence-not-allowed'
  | 'edge-endpoints'
  | 'invented-number'
  | 'suggestions-invalid'
  | 'outside-drift';

/** One sentence per refusal, for the run's face. */
export const ARCH_ENRICH_REFUSAL_REASONS: Readonly<
  Record<ArchEnrichRefusal, string>
> = {
  'too-large': 'The answer is larger than a contract could honestly be.',
  'bad-shape': 'The answer is not the one JSON object that was asked for.',
  'baseline-content':
    'The answer carries baseline content, and this pass never writes an acceptance.',
  'invalid-row': 'A row in the answer failed the contract validator.',
  'contract-changed':
    'The answer changed the contract itself rather than enriching the parts.',
  'component-set-changed':
    'The answer added or removed a part instead of enriching the drafted ones.',
  'anchors-changed': 'The answer moved an anchor, which would unpaint the map.',
  'kind-changed': 'The answer changed what kind of thing a part is.',
  'evidence-not-allowed':
    'The answer adds or changes a quote it never read, so none of it can be trusted.',
  'edge-endpoints': 'A promise names a part the draft does not contain.',
  'invented-number':
    'The answer carries a number that is not in the facts it was given.',
  'suggestions-invalid': 'A suggestion is not a bounded plain sentence.',
  'outside-drift':
    'The answer changed a part or a promise that did not drift.'
};

/** The kept answer, normalized through the load side validators. */
export interface ArchEnrichAnswer {
  contract: ArchContract;
  components: ArchComponent[];
  edges: ArchEdge[];
  suggestions: string[];
}

export interface ArchEnrichValidation {
  /** The answer, or null when it was refused. */
  kept: ArchEnrichAnswer | null;
  /** The refusal's short name. Null when the answer was kept. */
  refusal: ArchEnrichRefusal | null;
  /** One sentence of detail a person can act on. Null when kept. */
  detail: string | null;
}

/** Everything the answer is judged against. */
export interface ArchEnrichContext {
  /** The drafted or current contract the model was asked to enrich. */
  document: ArchDocument;
  /** The FACTS section of the composed prompt, byte for byte. */
  factBlock: string;
  /**
   * The drift a repair may touch, or null for a whole pass. Present, it arms
   * rule 10: everything outside it must come back exactly as drafted.
   */
  scope?: ArchDriftScope | null;
}

/**
 * One value as comparable bytes: keys sorted at every depth, so two records
 * that hold the same fields in a different order compare equal and a record
 * that moved one field does not.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const refuse = (
  refusal: ArchEnrichRefusal,
  detail: string
): ArchEnrichValidation => ({ kept: null, refusal, detail });

/** The first problem's sentence, for the detail a person reads. */
function firstProblem(problems: readonly ArchProblem[]): string {
  const first = problems[0];
  if (first === undefined) return 'a row failed validation';
  return `${first.file} ${first.field}: ${first.message}`;
}

/**
 * The model was told to answer with JSON alone. When it wraps the object in
 * a markdown fence anyway, the fence is unwrapped before the parse. That is
 * reading the envelope, not trimming the content: everything inside is still
 * judged whole.
 */
export function unwrapAnswerText(text: string): string {
  const trimmed = text.trim();
  const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(trimmed);
  return fence === null ? trimmed : (fence[1] ?? '').trim();
}

/** Every maximal digit run in a string. */
export function digitRuns(text: string): string[] {
  return text.match(/[0-9]+/g) ?? [];
}

/** The prose fields the invented number rule reads, per record. */
function proseOf(answer: ArchEnrichAnswer): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [];
  for (const component of answer.components) {
    out.push({ field: `component ${component.id} name`, text: component.name });
    out.push({
      field: `component ${component.id} description`,
      text: component.description
    });
    component.gaps.forEach((gap, i) => {
      out.push({ field: `component ${component.id} gaps[${i}]`, text: gap });
    });
  }
  for (const edge of answer.edges) {
    if (edge.label !== undefined) {
      out.push({ field: `edge ${edge.id} label`, text: edge.label });
    }
    if (edge.note !== undefined) {
      out.push({ field: `edge ${edge.id} note`, text: edge.note });
    }
  }
  return out;
}

/** Rule on one answer. Pure, and it never throws. */
export function validateArchAnswer(
  text: string,
  context: ArchEnrichContext
): ArchEnrichValidation {
  if (Buffer.byteLength(text, 'utf8') > ARCH_ANSWER_MAX_BYTES) {
    return refuse('too-large', 'the raw answer is over the byte ceiling');
  }
  const draft = context.document;
  if (draft.contract === null) {
    return refuse('bad-shape', 'there is no drafted contract to enrich');
  }

  const unwrapped = unwrapAnswerText(text);
  const parsed = parseArchJson(unwrapped, 'answer');
  if (parsed.value === null) {
    return refuse('bad-shape', firstProblem(parsed.problems));
  }
  if (
    typeof parsed.value !== 'object' ||
    parsed.value === null ||
    Array.isArray(parsed.value)
  ) {
    return refuse('bad-shape', 'the answer is not one JSON object');
  }
  const top = parsed.value as Record<string, unknown>;

  // 2. Baseline content, named before the generic key check so the refusal
  // says what actually happened.
  if ('baseline' in top || 'accepted' in top) {
    return refuse('baseline-content', 'the answer names a baseline');
  }
  const allowed = new Set(['contract', 'components', 'edges', 'suggestions']);
  for (const key of Object.keys(top)) {
    if (!allowed.has(key)) {
      return refuse('bad-shape', `the answer carries an unknown key: ${key}`);
    }
  }
  if (!('contract' in top) || !('components' in top) || !('edges' in top)) {
    return refuse(
      'bad-shape',
      'the answer must carry contract, components and edges'
    );
  }

  // 3. The load side validators, with ANY problem a refusal.
  const contract = validateContract(top['contract'], 'answer:contract');
  if (contract.value === null || contract.problems.length > 0) {
    return refuse('invalid-row', firstProblem(contract.problems));
  }

  if (!Array.isArray(top['components'])) {
    return refuse('bad-shape', 'components must be a list');
  }
  const components: ArchComponent[] = [];
  for (const [index, raw] of (top['components'] as unknown[]).entries()) {
    const result = validateComponent(raw, `answer:components[${index}]`);
    if (result.value === null || result.problems.length > 0) {
      return refuse('invalid-row', firstProblem(result.problems));
    }
    components.push(result.value);
  }

  const edgesResult = validateEdges(top['edges'], 'answer:edges');
  if (edgesResult.problems.length > 0) {
    return refuse('invalid-row', firstProblem(edgesResult.problems));
  }
  const edges = edgesResult.rows;

  // 4. The contract itself stands. Strictness is a judgement and may move
  // in a whole pass; under a drift scope nothing in the contract moves.
  const answered = contract.value;
  const scope = context.scope ?? null;
  if (
    scope !== null &&
    canonicalJson(answered) !== canonicalJson(draft.contract)
  ) {
    return refuse(
      'contract-changed',
      'the contract did not drift and a repair returns it exactly as given'
    );
  }
  if (
    answered.subject !== draft.contract.subject ||
    answered.version !== draft.contract.version ||
    JSON.stringify(answered.layers) !== JSON.stringify(draft.contract.layers) ||
    JSON.stringify(answered.flows) !== JSON.stringify(draft.contract.flows)
  ) {
    return refuse(
      'contract-changed',
      'subject, version, layers and flows must stand as drafted'
    );
  }

  // 5. The map binding: ids, anchors and kinds stand. Map binding rule 1.
  const draftById = new Map(draft.components.map((c) => [c.id, c]));
  const answeredIds = components.map((c) => c.id).sort();
  const draftIds = [...draftById.keys()].sort();
  if (JSON.stringify(answeredIds) !== JSON.stringify(draftIds)) {
    return refuse(
      'component-set-changed',
      `drafted parts are ${draftIds.join(', ')} and the answer has ` +
        `${answeredIds.join(', ')}`
    );
  }
  const seen = new Set<string>();
  for (const component of components) {
    if (seen.has(component.id)) {
      return refuse(
        'component-set-changed',
        `the answer repeats the part ${component.id}`
      );
    }
    seen.add(component.id);
    const drafted = draftById.get(component.id);
    if (drafted === undefined) continue;
    if (
      JSON.stringify(component.anchors) !== JSON.stringify(drafted.anchors)
    ) {
      return refuse(
        'anchors-changed',
        `the anchors of ${component.id} must stand as drafted`
      );
    }
    if (component.kind !== drafted.kind) {
      return refuse(
        'kind-changed',
        `the kind of ${component.id} must stay ${drafted.kind}`
      );
    }
    const bands = new Set(answered.layers.map((layer) => layer.id));
    if (!bands.has(component.layer)) {
      return refuse(
        'invalid-row',
        `component ${component.id} layer "${component.layer}" names no band`
      );
    }
  }

  // 6. Evidence carries forward byte for byte or not at all. A quote the
  // model wrote is an invention by construction; a quote the person wrote
  // stands as written, and dropping one is allowed because a stale quote is
  // exactly what a repair removes.
  const draftEdgeById = new Map(draft.edges.map((e) => [e.id, e]));
  for (const component of components) {
    const drafted = draftById.get(component.id);
    const held = new Set((drafted?.evidence ?? []).map((row) => canonicalJson(row)));
    for (const row of component.evidence) {
      if (!held.has(canonicalJson(row))) {
        return refuse(
          'evidence-not-allowed',
          `component ${component.id} carries a quote the draft does not hold`
        );
      }
    }
  }
  for (const edge of edges) {
    const drafted = draftEdgeById.get(edge.id);
    const held = new Set((drafted?.evidence ?? []).map((row) => canonicalJson(row)));
    for (const row of edge.evidence) {
      if (!held.has(canonicalJson(row))) {
        return refuse(
          'evidence-not-allowed',
          `edge ${edge.id} carries a quote the draft does not hold`
        );
      }
    }
  }

  // 7. Edge ends name drafted parts, and only drafted parts.
  const idSet = new Set(draftIds);
  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) {
      return refuse(
        'edge-endpoints',
        `edge ${edge.id} names ${edge.from} and ${edge.to}`
      );
    }
  }

  // 10. Outside the drift, nothing moves. Only when a scope was handed in.
  if (scope !== null) {
    const inParts = new Set(scope.componentIds);
    const inEdges = new Set(scope.edgeIds);
    for (const component of components) {
      const drafted = draftById.get(component.id);
      if (drafted === undefined) continue;
      if (inParts.has(component.id)) {
        // In the drift: the name, the description, the gaps and the quotes
        // may move, what the part IS may not. The anchors and the kind are
        // already pinned by rule 5; these four are pinned here because the
        // re-verify of Phase 159 landed every one of them through a repair.
        if (
          component.layer !== drafted.layer ||
          component.provenance !== drafted.provenance ||
          component.boundary !== drafted.boundary ||
          component.deprecated !== drafted.deprecated
        ) {
          return refuse(
            'outside-drift',
            `component ${component.id} drifted, and a repair changes its ` +
              `words but never its layer, its provenance, its boundary or ` +
              `whether it is deprecated`
          );
        }
        continue;
      }
      if (canonicalJson(component) !== canonicalJson(drafted)) {
        return refuse(
          'outside-drift',
          `component ${component.id} did not drift and the answer changed it`
        );
      }
    }
    const answeredEdgeIds = edges.map((e) => e.id).sort();
    const draftEdgeIds = [...draftEdgeById.keys()].sort();
    for (const id of answeredEdgeIds) {
      if (!draftEdgeById.has(id)) {
        return refuse(
          'outside-drift',
          `edge ${id} is not in the contract and a repair adds no promise`
        );
      }
    }
    for (const id of draftEdgeIds) {
      if (!answeredEdgeIds.includes(id)) {
        return refuse(
          'outside-drift',
          `edge ${id} was removed and a repair changes a promise rather than removing it`
        );
      }
    }
    for (const edge of edges) {
      const drafted = draftEdgeById.get(edge.id);
      if (drafted === undefined) continue;
      if (inEdges.has(edge.id)) {
        // In the drift: the rule and the words may move, what the promise
        // is about may not.
        if (
          edge.from !== drafted.from ||
          edge.to !== drafted.to ||
          edge.kind !== drafted.kind ||
          edge.checker !== drafted.checker
        ) {
          return refuse(
            'outside-drift',
            `edge ${edge.id} drifted, and a repair changes its rule or its ` +
              `words but never its ends, its kind or its checker`
          );
        }
        continue;
      }
      if (canonicalJson(edge) !== canonicalJson(drafted)) {
        return refuse(
          'outside-drift',
          `edge ${edge.id} did not drift and the answer changed it`
        );
      }
    }
  }

  // 8. The invented number rule, mechanical. A field returned byte identical
  // to the draft's own field was not written by the model and is not read.
  const draftProse = new Map(
    proseOf({
      contract: draft.contract,
      components: draft.components,
      edges: draft.edges,
      suggestions: []
    }).map((row) => [row.field, row.text])
  );
  for (const { field, text: prose } of proseOf({
    contract: answered,
    components,
    edges,
    suggestions: []
  })) {
    if (draftProse.get(field) === prose) continue;
    for (const run of digitRuns(prose)) {
      if (!context.factBlock.includes(run)) {
        return refuse(
          'invented-number',
          `${field} carries ${run}, which is not in the facts`
        );
      }
    }
  }

  // 9. Suggestions: bounded plain sentences, never written to docs/arch/.
  const suggestions: string[] = [];
  const rawSuggestions = top['suggestions'] ?? [];
  if (!Array.isArray(rawSuggestions)) {
    return refuse('suggestions-invalid', 'suggestions must be a list');
  }
  if (rawSuggestions.length > ARCH_MAX_SUGGESTIONS) {
    return refuse(
      'suggestions-invalid',
      `the answer carries ${rawSuggestions.length} suggestions and Tortie ` +
        `reads at most ${ARCH_MAX_SUGGESTIONS}`
    );
  }
  for (const raw of rawSuggestions) {
    if (
      typeof raw !== 'string' ||
      raw.length === 0 ||
      raw.length > ARCH_MAX_SUGGESTION_CHARS ||
      /[\u0000-\u001f\u007f]/.test(raw)
    ) {
      return refuse(
        'suggestions-invalid',
        'a suggestion must be a plain sentence inside the bound'
      );
    }
    suggestions.push(raw);
  }

  return {
    kept: { contract: answered, components, edges, suggestions },
    refusal: null,
    detail: null
  };
}
