/**
 * The shapes one semantic answer takes (Phase 259; SPEC §2).
 *
 * Two asks, two answers, one grader. A PART ask comes back as seven claims and
 * some gates about one rule P box; a JOURNEYS ask comes back as a few numbered
 * walks across the boxes. Both are refused or kept by
 * `../enrich/validate.ts`'s `validateArchSemanticAnswer`, and what it keeps is
 * already GRADED: a claim that reaches the store has citations that resolved,
 * so a broken citation can never reach the face.
 *
 * The bounds below are what the ask states in words and what the validator
 * enforces mechanically. A prompt asks; the validator decides.
 */

import type {
  ArchCiteReading,
  ArchClaimField,
  ArchGateAnswer,
  ArchSemanticCite
} from '@shared/arch';

/** The most claims one answer carries, being one per field and no more. */
export const ARCH_SEMANTIC_MAX_CITES = 6;

/** How long one claim sentence may be. */
export const ARCH_SEMANTIC_MAX_TEXT = 240;

/** How long the `name` claim may be. A person readable name, not a sentence. */
export const ARCH_SEMANTIC_MAX_NAME = 60;

/** The most gates one part's answer may carry. */
export const ARCH_SEMANTIC_MAX_GATES = 12;

/** The most journeys one answer may carry. */
export const ARCH_SEMANTIC_MAX_JOURNEYS = 5;

/** The most steps one journey may carry. */
export const ARCH_SEMANTIC_MAX_STEPS = 8;

/** How long a journey's or a step's label may be. */
export const ARCH_SEMANTIC_MAX_LABEL = 80;

/** How long a gate's question or reason may be. */
export const ARCH_SEMANTIC_MAX_GATE_TEXT = 240;

/** A generous ceiling on one raw answer, far under the spawn's own. */
export const ARCH_SEMANTIC_ANSWER_MAX_BYTES = 128 * 1024;

/**
 * Why a whole answer was thrown away.
 *
 * `citation-broken` is NOT here, because it refuses a ROW rather than an
 * answer. `no-row-stood` is what an answer becomes when every one of its rows
 * was dropped: nothing left is a failure and never an empty reading.
 */
export type ArchSemanticRefusal =
  | 'too-large'
  | 'bad-shape'
  | 'wrong-part'
  | 'claim-fields'
  | 'claim-invalid'
  | 'gate-invalid'
  | 'journey-invalid'
  | 'level-written'
  | 'invented-number'
  | 'no-row-stood';

/** One claim the model wrote, before grading. */
export interface SemanticClaimDraft {
  field: ArchClaimField;
  text: string;
  facts: readonly ArchSemanticCite[];
}

/** One gate the model wrote, before grading. */
export interface SemanticGateDraft {
  id: string;
  question: string;
  answer: ArchGateAnswer;
  because: string;
  facts: readonly ArchSemanticCite[];
}

/** One journey step the model wrote, before grading. */
export interface SemanticStepDraft {
  partId: string;
  label: string;
  facts: readonly ArchSemanticCite[];
}

/** One kept claim: the sentence, and the citations that resolved. */
export interface KeptClaim {
  field: ArchClaimField;
  text: string;
  cites: ArchCiteReading[];
}

/** One kept gate. */
export interface KeptGate {
  id: string;
  question: string;
  answer: ArchGateAnswer;
  because: string;
  cites: ArchCiteReading[];
}

/** One kept journey, with its steps already numbered from one. */
export interface KeptJourney {
  id: string;
  name: string;
  steps: { seq: number; partId: string; label: string; cites: ArchCiteReading[] }[];
}

/** What a kept PART answer holds. */
export interface KeptPartAnswer {
  kind: 'part';
  partId: string;
  claims: KeptClaim[];
  gates: KeptGate[];
}

/** What a kept JOURNEYS answer holds. */
export interface KeptJourneyAnswer {
  kind: 'journeys';
  journeys: KeptJourney[];
}

export type KeptSemanticAnswer = KeptPartAnswer | KeptJourneyAnswer;

/**
 * The facts one finished semantic ask reports about ITSELF, shared by the
 * runner's record and the store's row so the eleven fields are declared once.
 *
 * It is deliberately NOT the whole of either: the runner names a repository by
 * PATH and carries the kept answer, the store names it by KEY and carries the
 * claim count it derived. What they agree on is what the ask cost and how it
 * ended, and that half has one spelling here.
 */
export interface ArchSemanticAskFacts {
  /** The rule P box the ask was about, or null for the journeys ask. */
  partId: string | null;
  agentId: string;
  model: string;
  recipeVersion: number;
  headCommit: string;
  startedAt: number;
  wallMs: number;
  verdict: 'kept' | 'refused' | 'failed';
  reason: string | null;
  detail: string | null;
  /** What the CLI reported, or null. codex reports no dollar figure at all. */
  costUsd: number | null;
  /** Rows dropped under R2, whether or not the answer was kept. */
  rowsDropped: number;
}
