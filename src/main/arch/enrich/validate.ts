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

import { ARCH_CLAIM_FIELDS, ARCH_GATE_ANSWERS, ARCH_ID_PATTERN } from '@shared/arch';
import type {
  ArchCiteReading,
  ArchClaimField,
  ArchComponent,
  ArchContract,
  ArchDocument,
  ArchEdge,
  ArchGateAnswer,
  ArchProblem,
  ArchSemanticCite
} from '@shared/arch';
import {
  parseArchJson,
  validateComponent,
  validateContract,
  validateEdges
} from '../validate';
import {
  ARCH_CITE_MAX_WHY,
  gradeCite,
  parseCiteAt,
  type ArchGradeSources
} from '../semantic/grade';
import { droppedRowSentence, type DroppedCiteWhy } from '../semantic/sentences';
import {
  ARCH_SEMANTIC_ANSWER_MAX_BYTES,
  ARCH_SEMANTIC_MAX_CITES,
  ARCH_SEMANTIC_MAX_GATES,
  ARCH_SEMANTIC_MAX_GATE_TEXT,
  ARCH_SEMANTIC_MAX_JOURNEYS,
  ARCH_SEMANTIC_MAX_LABEL,
  ARCH_SEMANTIC_MAX_NAME,
  ARCH_SEMANTIC_MAX_STEPS,
  ARCH_SEMANTIC_MAX_TEXT,
  type ArchSemanticRefusal,
  type KeptClaim,
  type KeptGate,
  type KeptJourney,
  type KeptSemanticAnswer
} from '../semantic/types';
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
  // PHASE 259. A TOKEN in the fact block, never a substring of it. Research
  // 118 §6.4 measured the substring form catching one of three planted
  // numbers: `4096` was caught, `17` was hidden inside a fixture session named
  // `p117-lost-9` and `92` inside the IP `192.0.2.1`. The token form catches
  // all three, and a looser rule on the older pass is not a feature.
  const factTokens = new Set(digitRuns(context.factBlock));
  for (const { field, text: prose } of proseOf({
    contract: answered,
    components,
    edges,
    suggestions: []
  })) {
    if (draftProse.get(field) === prose) continue;
    for (const run of digitRuns(prose)) {
      if (!factTokens.has(run)) {
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

// ---------------------------------------------------------------------------
// The semantic validator (Phase 259, research 118 §7.1 and §7.3; SPEC §2.4)
// ---------------------------------------------------------------------------
//
// THREE REFUSALS, AND THEY DO NOT ALL REFUSE THE SAME THING.
//
//  R1  a model-written evidence level refuses the ANSWER WHOLE. The level is
//      computed (Phase 258) and no model may write one, so an answer that
//      carries one is not a reading with a bad field, it is a reading that
//      does not understand what it was asked for. It is asked of a FIELD
//      VALUE and never as a search inside a sentence, because four of the ten
//      words are ordinary English and "the app is composed of three parts" is
//      honest prose.
//
//  R2  an unresolvable citation refuses its ROW whole. Never a trim: research
//      118 §7.3's rule is that a broken citation never reaches the face, and a
//      claim that keeps its sentence while losing the citation that justified
//      it is worse than no claim. An answer with nothing left is refused
//      whole under `no-row-stood`, because that is a failure and not an empty
//      reading.
//
//  R3  the digit rule asks for a TOKEN in the FACTS block rather than a
//      substring anywhere in it. Research 118 §6.4 measured the substring form
//      catching ONE of three planted numbers: 4096 caught, 17 hidden inside a
//      fixture session named p117-lost-9 and 92 hidden inside the IP
//      192.0.2.1. Under the token form all three are caught, and the same one
//      line change was made to rule 8 of `validateArchAnswer` above, because
//      the substring form is measurably wrong and a looser rule on the older
//      pass is not a feature.
//
//  R4  a citation naming a file the FACTS BLOCK NEVER HANDED OVER refuses its
//      ROW whole, through R2's own mechanism and with its own sentence. R2
//      asks whether a line EXISTS and R4 asks whether the answer could have
//      COPIED it, which are different questions with different holes: the
//      Phase 259 fix round measured a citation into ANOTHER PART'S BOX kept
//      with a green `declaration` chip, because the file is real, the line is
//      real and a declaration sits near it. The ask is per part and the block
//      is one part's own rows plus its own sampled file names, so a path
//      outside it was composed rather than copied, and a composed location is
//      the one thing the grader cannot see: it grades WHERE a model pointed
//      and every other rule in this file trusts that the pointing was a copy.
//      The rule is asked of the PATH and never of the line, because the line
//      is what the grader's slack is for.
//
//      IT IS DERIVED FROM THE BLOCK'S OWN BYTES, the way R3's token set is,
//      rather than from a parallel list the composer hands over: what bounds
//      the answer is what the model was SHOWN, and a second list could fall
//      out of step with the first. Measured over the reading of 2026-09-12,
//      all 199 kept citations name a file the block handed over and 199 of
//      them copy a fact line's own number exactly, so the rule costs that
//      reading nothing.
//
// THE DIGIT RULE NEVER READS A CITATION. `at` carries a line number, which is
// a digit run, and it is graded by the grammar and the resolution instead.

/**
 * The ten words no model may write as an answer to anything, normalised.
 *
 * Five are the computed rungs of research 118 §7.2 and five are the levels the
 * hand pass used; `composed` is in both. Normalisation lowercases, collapses
 * every run of whitespace and hyphens to one space, and trims, so
 * `accepted-live`, `Accepted Live` and `accepted  live` are one word.
 */
const REFUSED_LEVELS: ReadonlySet<string> = new Set([
  'off repo',
  'declared',
  'composed',
  'reached',
  'tested',
  'component tested',
  'accepted live',
  'implemented not shipped',
  'outside this repo'
]);

/** Keys that name a level even when their value does not. */
const REFUSED_KEYS: ReadonlySet<string> = new Set([
  'evidence',
  'level',
  'rung',
  'confidence',
  'certainty',
  'accepted',
  'verified',
  'baseline'
]);

const SEMANTIC_ID_RE = new RegExp(ARCH_ID_PATTERN);

/** A control character anywhere in a prose field. */
const PROSE_CONTROL_RE = /[\u0000-\u001f\u007f]/;

/**
 * An opening or closing tag anywhere in a prose field.
 *
 * The instruction already says never to write markdown and never to quote
 * code; this is that instruction made a refusal. A sentence carrying
 * `<img src=x onerror=...>` cannot reach the DOM as HTML — React draws every
 * one of these as a text node and `arch-view.test.ts` scans the whole folder
 * for a `dangerouslySetInnerHTML` — so this is the SECOND fence rather than
 * the only one, and it is here because a face that draws a model's angle
 * brackets verbatim is already drawing something nobody asked for. Measured
 * over the reading of 2026-09-12: 0 of its 330 model-written strings carry
 * one.
 */
const PROSE_MARKUP_RE = /<\/?[a-zA-Z]/;

/**
 * Every file path the composed block handed over, being the only paths a
 * citation may name (R4).
 *
 * Two shapes, and they are the composer's own two: a fact line ends
 * `... at <path>:<line>`, and a sampled FILES entry is two spaces and a path
 * on a line of its own. Everything else the block writes carries a space in
 * its tail — a crossing line, an honest zero, a summary line — so neither
 * shape can match it. A path holds no whitespace and no colon, which is the
 * same grammar {@link parseCiteAt} enforces.
 */
export function citablePaths(factBlock: string): ReadonlySet<string> {
  const out = new Set<string>();
  for (const line of factBlock.split('\n')) {
    const fact = / at ([^\s:]+):[0-9]{1,7}$/.exec(line);
    if (fact !== null) {
      out.add(fact[1] ?? '');
      continue;
    }
    const file = /^ {2}([^\s:]+)$/.exec(line);
    const path = file?.[1] ?? '';
    if (path.includes('/') || path.includes('.')) out.add(path);
  }
  out.delete('');
  return out;
}

/** What the semantic answer is judged against. */
export interface ArchSemanticContext {
  /** Which ask this answers. */
  kind: 'part' | 'journeys';
  /** The box id a `part` ask was about. Ignored by a `journeys` ask. */
  partId: string;
  /** Every box id the partition holds, for a journey step's `partId`. */
  partIds: readonly string[];
  /** The FACTS section of the composed prompt, byte for byte. */
  factBlock: string;
  /** How a citation resolves and grades. It opens no file. */
  grade: ArchGradeSources;
}

/** One semantic ruling. `kept` null means the whole answer was refused. */
export interface ArchSemanticValidation {
  kept: KeptSemanticAnswer | null;
  refusal: ArchSemanticRefusal | null;
  /** One sentence a person can act on. Null when nothing was refused. */
  detail: string | null;
  /** Rows dropped under R2, whether or not the answer was kept. */
  rowsDropped: number;
  /** The first dropped row's sentence, naming the citation that broke it. */
  dropped: string | null;
}

/** Rule on one semantic answer. Pure, and it never throws. */
export function validateArchSemanticAnswer(
  text: string,
  context: ArchSemanticContext
): ArchSemanticValidation {
  const refuseWhole = (
    refusal: ArchSemanticRefusal,
    detail: string
  ): ArchSemanticValidation => ({ kept: null, refusal, detail, rowsDropped: 0, dropped: null });

  if (Buffer.byteLength(text, 'utf8') > ARCH_SEMANTIC_ANSWER_MAX_BYTES) {
    return refuseWhole('too-large', 'the raw answer is over the byte ceiling');
  }
  const parsed = parseArchJson(unwrapAnswerText(text), 'answer');
  if (parsed.value === null) return refuseWhole('bad-shape', firstProblem(parsed.problems));
  if (
    typeof parsed.value !== 'object' ||
    parsed.value === null ||
    Array.isArray(parsed.value)
  ) {
    return refuseWhole('bad-shape', 'the answer is not one JSON object');
  }
  const top = parsed.value as Record<string, unknown>;

  // R1, asked of the WHOLE answer before its shape, so a level smuggled into
  // a key nothing else reads is still a refusal.
  const level = levelWritten(top);
  if (level !== null) return refuseWhole('level-written', level);

  const allowedKeys =
    context.kind === 'part' ? new Set(['part', 'claims', 'gates']) : new Set(['journeys']);
  for (const key of Object.keys(top)) {
    if (!allowedKeys.has(key)) {
      return refuseWhole('bad-shape', `the answer carries an unknown key: ${key}`);
    }
  }

  // R3, over every prose field the model wrote. Citations are never read here.
  const tokens = new Set(digitRuns(context.factBlock));
  const invented = inventedNumber(top, tokens);
  if (invented !== null) return refuseWhole('invented-number', invented);

  // R4's set, derived from the same bytes R3's token set is derived from.
  const citable = citablePaths(context.factBlock);

  return context.kind === 'part'
    ? keepSemanticPart(top, context, refuseWhole, citable)
    : keepSemanticJourneys(top, context, refuseWhole, citable);
}

/** The PART answer: seven claims, some gates, and R2 over both. */
function keepSemanticPart(
  top: Record<string, unknown>,
  context: ArchSemanticContext,
  refuseWhole: (refusal: ArchSemanticRefusal, detail: string) => ArchSemanticValidation,
  citable: ReadonlySet<string>
): ArchSemanticValidation {
  if (top['part'] !== context.partId) {
    return refuseWhole(
      'wrong-part',
      `the answer is about "${String(top['part'])}" and the ask was about "${context.partId}"`
    );
  }
  const rawClaims = top['claims'];
  if (!Array.isArray(rawClaims)) return refuseWhole('bad-shape', 'claims must be a list');
  if (rawClaims.length !== ARCH_CLAIM_FIELDS.length) {
    return refuseWhole(
      'claim-fields',
      `the answer carries ${String(rawClaims.length)} claims and the ask is for ` +
        `${String(ARCH_CLAIM_FIELDS.length)}, one for each field`
    );
  }
  const claims: { field: ArchClaimField; text: string; facts: ArchSemanticCite[] }[] = [];
  const seenFields = new Set<string>();
  for (const [index, raw] of rawClaims.entries()) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return refuseWhole('claim-invalid', `claims[${String(index)}] is not an object`);
    }
    const row = raw as Record<string, unknown>;
    const field = row['field'];
    if (typeof field !== 'string' || !(ARCH_CLAIM_FIELDS as readonly string[]).includes(field)) {
      return refuseWhole('claim-fields', `claims[${String(index)}] names the field "${String(field)}"`);
    }
    if (seenFields.has(field)) {
      return refuseWhole('claim-fields', `the answer repeats the field ${field}`);
    }
    seenFields.add(field);
    const bound = field === 'name' ? ARCH_SEMANTIC_MAX_NAME : ARCH_SEMANTIC_MAX_TEXT;
    const prose = plainSemanticText(row['text'], bound);
    if (prose === null) {
      return refuseWhole(
        'claim-invalid',
        `the ${field} claim is not a plain sentence of at most ${String(bound)} characters`
      );
    }
    const facts = semanticCiteList(row['facts']);
    if (facts === null) {
      return refuseWhole(
        'claim-invalid',
        `the ${field} claim names no usable fact, or more than ${String(ARCH_SEMANTIC_MAX_CITES)}`
      );
    }
    claims.push({ field: field as ArchClaimField, text: prose, facts });
  }

  const rawGates = top['gates'] ?? [];
  if (!Array.isArray(rawGates)) return refuseWhole('gate-invalid', 'gates must be a list');
  if (rawGates.length > ARCH_SEMANTIC_MAX_GATES) {
    return refuseWhole(
      'gate-invalid',
      `the answer carries ${String(rawGates.length)} gates and Tortie reads at most ` +
        `${String(ARCH_SEMANTIC_MAX_GATES)}`
    );
  }
  const gates: {
    id: string;
    question: string;
    answer: ArchGateAnswer;
    because: string;
    facts: ArchSemanticCite[];
  }[] = [];
  const gateIds = new Set<string>();
  for (const [index, raw] of rawGates.entries()) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return refuseWhole('gate-invalid', `gates[${String(index)}] is not an object`);
    }
    const row = raw as Record<string, unknown>;
    const id = row['id'];
    if (typeof id !== 'string' || !SEMANTIC_ID_RE.test(id) || gateIds.has(id)) {
      return refuseWhole('gate-invalid', `gates[${String(index)}] has the id "${String(id)}"`);
    }
    gateIds.add(id);
    const answer = row['answer'];
    if (typeof answer !== 'string' || !(ARCH_GATE_ANSWERS as readonly string[]).includes(answer)) {
      return refuseWhole('gate-invalid', `gate ${id} answers "${String(answer)}"`);
    }
    const question = plainSemanticText(row['question'], ARCH_SEMANTIC_MAX_GATE_TEXT);
    const because = plainSemanticText(row['because'], ARCH_SEMANTIC_MAX_GATE_TEXT);
    if (question === null || because === null) {
      return refuseWhole('gate-invalid', `gate ${id} is not a bounded question with a reason`);
    }
    const facts = semanticCiteList(row['facts']);
    if (facts === null) return refuseWhole('gate-invalid', `gate ${id} names no usable fact`);
    gates.push({ id, question, answer: answer as ArchGateAnswer, because, facts });
  }

  // R2. Every row whose citations all resolve is kept whole; a row with one
  // that does not is dropped whole.
  let rowsDropped = 0;
  let dropped: string | null = null;
  const note = (where: string, broken: BrokenCite): void => {
    rowsDropped += 1;
    if (dropped === null) dropped = droppedRowSentence(where, broken.at, broken.why);
  };
  const keptClaims: KeptClaim[] = [];
  for (const claim of claims) {
    const cites = gradeSemanticRow(claim.facts, context.grade, citable);
    if (cites === null) {
      note(`the ${claim.field} claim`, firstBrokenCite(claim.facts, context.grade, citable));
      continue;
    }
    keptClaims.push({ field: claim.field, text: claim.text, cites });
  }
  const keptGates: KeptGate[] = [];
  for (const gate of gates) {
    const cites = gradeSemanticRow(gate.facts, context.grade, citable);
    if (cites === null) {
      note(`the gate ${gate.id}`, firstBrokenCite(gate.facts, context.grade, citable));
      continue;
    }
    keptGates.push({
      id: gate.id,
      question: gate.question,
      answer: gate.answer,
      because: gate.because,
      cites
    });
  }
  if (keptClaims.length === 0 && keptGates.length === 0) {
    return { kept: null, refusal: 'no-row-stood', detail: dropped, rowsDropped, dropped };
  }
  return {
    kept: { kind: 'part', partId: context.partId, claims: keptClaims, gates: keptGates },
    refusal: null,
    detail: null,
    rowsDropped,
    dropped
  };
}

/** The JOURNEYS answer: a few numbered walks, and R2 per STEP. */
function keepSemanticJourneys(
  top: Record<string, unknown>,
  context: ArchSemanticContext,
  refuseWhole: (refusal: ArchSemanticRefusal, detail: string) => ArchSemanticValidation,
  citable: ReadonlySet<string>
): ArchSemanticValidation {
  const raw = top['journeys'];
  if (!Array.isArray(raw)) return refuseWhole('bad-shape', 'journeys must be a list');
  if (raw.length > ARCH_SEMANTIC_MAX_JOURNEYS) {
    return refuseWhole(
      'journey-invalid',
      `the answer carries ${String(raw.length)} journeys and Tortie reads at most ` +
        `${String(ARCH_SEMANTIC_MAX_JOURNEYS)}`
    );
  }
  const known = new Set(context.partIds);
  const ids = new Set<string>();
  const journeys: {
    id: string;
    name: string;
    steps: { partId: string; label: string; facts: ArchSemanticCite[] }[];
  }[] = [];
  for (const [index, entry] of raw.entries()) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      return refuseWhole('journey-invalid', `journeys[${String(index)}] is not an object`);
    }
    const row = entry as Record<string, unknown>;
    const id = row['id'];
    if (typeof id !== 'string' || !SEMANTIC_ID_RE.test(id) || ids.has(id)) {
      return refuseWhole('journey-invalid', `journeys[${String(index)}] has the id "${String(id)}"`);
    }
    ids.add(id);
    const name = plainSemanticText(row['name'], ARCH_SEMANTIC_MAX_LABEL);
    if (name === null) return refuseWhole('journey-invalid', `journey ${id} has no bounded name`);
    const steps = row['steps'];
    if (!Array.isArray(steps) || steps.length === 0 || steps.length > ARCH_SEMANTIC_MAX_STEPS) {
      return refuseWhole(
        'journey-invalid',
        `journey ${id} carries ${Array.isArray(steps) ? String(steps.length) : 'no'} steps`
      );
    }
    const walk: { partId: string; label: string; facts: ArchSemanticCite[] }[] = [];
    for (const [at, rawStep] of steps.entries()) {
      if (rawStep === null || typeof rawStep !== 'object' || Array.isArray(rawStep)) {
        return refuseWhole('journey-invalid', `journey ${id} step ${String(at + 1)} is not an object`);
      }
      const step = rawStep as Record<string, unknown>;
      const partId = step['partId'];
      if (typeof partId !== 'string' || !known.has(partId)) {
        return refuseWhole(
          'journey-invalid',
          `journey ${id} step ${String(at + 1)} names the part "${String(partId)}", ` +
            `which this repository does not hold`
        );
      }
      const label = plainSemanticText(step['label'], ARCH_SEMANTIC_MAX_LABEL);
      if (label === null) {
        return refuseWhole(
          'journey-invalid',
          `journey ${id} step ${String(at + 1)} has no bounded label`
        );
      }
      const facts = semanticCiteList(step['facts']);
      if (facts === null) {
        return refuseWhole(
          'journey-invalid',
          `journey ${id} step ${String(at + 1)} names no usable fact`
        );
      }
      walk.push({ partId, label, facts });
    }
    journeys.push({ id, name, steps: walk });
  }

  let rowsDropped = 0;
  let dropped: string | null = null;
  const kept: KeptJourney[] = [];
  for (const journey of journeys) {
    const steps: KeptJourney['steps'] = [];
    for (const [at, step] of journey.steps.entries()) {
      const cites = gradeSemanticRow(step.facts, context.grade, citable);
      if (cites === null) {
        const broken = firstBrokenCite(step.facts, context.grade, citable);
        rowsDropped += 1;
        if (dropped === null) {
          dropped = droppedRowSentence(
            `journey ${journey.id} step ${String(at + 1)}`,
            broken.at,
            broken.why
          );
        }
        continue;
      }
      steps.push({ seq: steps.length + 1, partId: step.partId, label: step.label, cites });
    }
    // A journey whose every step was dropped is not a journey; one that lost
    // a step keeps the rest, renumbered, because the walk a person reads must
    // never carry a gap where a refused step used to be.
    if (steps.length > 0) kept.push({ id: journey.id, name: journey.name, steps });
  }
  if (kept.length === 0) {
    return { kept: null, refusal: 'no-row-stood', detail: dropped, rowsDropped, dropped };
  }
  return {
    kept: { kind: 'journeys', journeys: kept },
    refusal: null,
    detail: null,
    rowsDropped,
    dropped
  };
}

/**
 * Grade one row's citations, or answer null when any of them does not stand.
 * Null means the ROW is dropped whole (R2 and R4), never trimmed.
 *
 * The two questions are asked in this order because they are about different
 * things: R4 asks whether the answer could have COPIED this location at all,
 * and R2 asks whether the line it copied is there. A path the block never
 * handed over is refused even when the line behind it happens to resolve,
 * which is the whole point of the rule.
 */
function gradeSemanticRow(
  facts: readonly ArchSemanticCite[],
  src: ArchGradeSources,
  citable: ReadonlySet<string>
): ArchCiteReading[] | null {
  const out: ArchCiteReading[] = [];
  for (const cite of facts) {
    if (brokenCite(cite, src, citable) !== null) return null;
    const graded = gradeCite(cite, src);
    if (graded === null) return null;
    out.push(graded);
  }
  return out;
}

/** One citation that could not stand, and which rule stopped it. */
interface BrokenCite {
  at: string;
  why: DroppedCiteWhy;
}

/** Why this one citation cannot stand, or null when it can. */
function brokenCite(
  cite: ArchSemanticCite,
  src: ArchGradeSources,
  citable: ReadonlySet<string>
): BrokenCite | null {
  const parsed = parseCiteAt(cite.at);
  if (parsed !== null && !citable.has(parsed.relPath)) {
    return { at: cite.at, why: 'not-handed' };
  }
  if (gradeCite(cite, src) === null) return { at: cite.at, why: 'unresolved' };
  return null;
}

/** The first citation of a row that did not stand, for the sentence. */
function firstBrokenCite(
  facts: readonly ArchSemanticCite[],
  src: ArchGradeSources,
  citable: ReadonlySet<string>
): BrokenCite {
  for (const cite of facts) {
    const broken = brokenCite(cite, src, citable);
    if (broken !== null) return broken;
  }
  return { at: '', why: 'unresolved' };
}

/**
 * R1. Every key and every string VALUE in the answer, read for a level.
 *
 * The value test is EQUALITY after normalisation and never a search inside a
 * sentence; `conformance:semantic` rule 4a drives both arms and asserts the
 * word as a value refuses while the same word inside a `does` sentence is
 * kept.
 */
function levelWritten(value: unknown, path = 'the answer'): string | null {
  if (typeof value === 'string') {
    const word = value.trim().toLowerCase().replace(/[\s-]+/g, ' ');
    if (REFUSED_LEVELS.has(word)) {
      return `${path} says "${value.trim()}", and Tortie computes how far something is proven`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const hit = levelWritten(entry, `${path}[${String(index)}]`);
      if (hit !== null) return hit;
    }
    return null;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (REFUSED_KEYS.has(key.trim().toLowerCase())) {
        return `${path} carries a field named "${key}", and Tortie computes that itself`;
      }
      const hit = levelWritten(entry, `${path}.${key}`);
      if (hit !== null) return hit;
    }
  }
  return null;
}

/**
 * R3. Every prose field the model wrote, read for a digit run the FACTS block
 * does not carry as a TOKEN.
 *
 * `at` is never read: it carries a line number by construction and the grammar
 * and the resolution judge it instead.
 */
function inventedNumber(value: unknown, tokens: ReadonlySet<string>): string | null {
  const prose = new Set(['text', 'why', 'question', 'because', 'label', 'name']);
  const walk = (node: unknown, key: string | null, path: string): string | null => {
    if (typeof node === 'string') {
      if (key === null || !prose.has(key)) return null;
      for (const run of digitRuns(node)) {
        if (!tokens.has(run)) return `${path} carries ${run}, which is not in the facts`;
      }
      return null;
    }
    if (Array.isArray(node)) {
      for (const [index, entry] of node.entries()) {
        const hit = walk(entry, key, `${path}[${String(index)}]`);
        if (hit !== null) return hit;
      }
      return null;
    }
    if (node !== null && typeof node === 'object') {
      for (const [name, entry] of Object.entries(node as Record<string, unknown>)) {
        const hit = walk(entry, name, `${path}.${name}`);
        if (hit !== null) return hit;
      }
    }
    return null;
  };
  return walk(value, null, 'the answer');
}

/** A bounded plain sentence with no control character and no markup, or null. */
function plainSemanticText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length === 0 || text.length > max) return null;
  if (PROSE_CONTROL_RE.test(text)) return null;
  if (PROSE_MARKUP_RE.test(text)) return null;
  return text;
}

/** One to six citations, each with a bounded reason, or null. */
function semanticCiteList(value: unknown): ArchSemanticCite[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > ARCH_SEMANTIC_MAX_CITES) {
    return null;
  }
  const out: ArchSemanticCite[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    const at = row['at'];
    if (typeof at !== 'string' || at.length === 0) return null;
    const why = plainSemanticText(row['why'], ARCH_CITE_MAX_WHY);
    if (why === null) return null;
    out.push({ at: at.trim(), why });
  }
  return out;
}
