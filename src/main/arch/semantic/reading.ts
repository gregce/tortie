/**
 * THE READING, COMPOSED (Phase 259; SPEC §3.2 and §3.4).
 *
 * `arch.db` owns the SQL and this module owns the shape: it takes the raw rows
 * the store read back and turns them into the four lists the two model-written
 * views draw. Pure in the sense `conformance:reading` rule 9 uses — no
 * `node:`, no `electron`, no `child_process`, no `require(` — so the gate can
 * drive it over fixtures with no database at all.
 *
 * ## `readAt` is null until something was KEPT
 *
 * A run that was refused is still a row, because a refusal rate that climbs is
 * the thing a person needs to see, and it is still not a reading. So `readAt`
 * names the newest KEPT run and answers null when there is none, which is what
 * puts the journeys and gates views into their one sentence state. The refused
 * runs travel beside it: nothing has read this repository AND here is what
 * happened when something tried is the honest pair.
 *
 * ## A contract journey is drawn first and is never overwritten
 *
 * `ArchFlow` is finally read (research 118 §10 Phase 3): a journey a person
 * committed under `docs/arch/flows/` loads with `source: 'contract'` and sorts
 * ahead of every model journey. No key moves in `docs/arch/` for it —
 * `ARCH_ROW_KEYS` is untouched and the pass writes journeys only into
 * `arch.db`.
 *
 * ## Nothing here says a sentence is true
 *
 * Every field it carries is attribution: which agent wrote it, what was found
 * at the line it points to, and whether that fact is still there. Research 118
 * §6.4 measured the checker catching two of seven deliberate lies, so a shape
 * that implied more would be the face over-reading its own instrument.
 */

import { ARCH_CLAIM_FIELDS } from '@shared/arch';
import type {
  ArchCiteReading,
  ArchClaimField,
  ArchClaimReading,
  ArchGateAnswer,
  ArchGateReading,
  ArchJourneyReading,
  ArchJourneyStepReading,
  ArchPartReading,
  ArchRateReading,
  ArchSemanticRunFace
} from '@shared/arch';

/** One stored claim, as the store reads it back. */
export interface ReadingClaimRow {
  claimId: string;
  subject: string;
  field: string;
  text: string;
  question: string | null;
  answer: string | null;
  runId: string;
  writtenAt: number;
  stale: boolean;
  staleReason: string | null;
}

/** One stored citation, as the store reads it back. */
export interface ReadingCiteRow extends Omit<ArchCiteReading, 'at'> {
  claimId: string;
  seq: number;
}

/** One stored journey step. */
export interface ReadingJourneyRow {
  journeyId: string;
  name: string;
  source: 'model' | 'contract';
  seq: number;
  partId: string;
  label: string;
}

/** One stored run, as the store reads it back. */
export interface ReadingRunRow {
  runId: string;
  partId: string | null;
  agentId: string;
  model: string;
  verdict: string;
  reason: string | null;
  startedAt: number;
  wallMs: number;
  claims: number;
  rowsDropped: number;
}

/** Everything the composer sees. */
export interface ReadingRows {
  claims: readonly ReadingClaimRow[];
  cites: readonly ReadingCiteRow[];
  journeys: readonly ReadingJourneyRow[];
  rates: readonly ArchRateReading[];
  runs: readonly ReadingRunRow[];
}

/** The four lists the two views draw, plus when something was last kept. */
export interface SemanticReading {
  parts: ArchPartReading[];
  journeys: ArchJourneyReading[];
  gates: ArchGateReading[];
  rates: ArchRateReading[];
  runs: ArchSemanticRunFace[];
  readAt: number | null;
}

/** `part:<id>` */
const PART_RE = /^part:(.+)$/;
/** `gate:<partId>/<gateId>` */
const GATE_RE = /^gate:(.+)\/([^/]+)$/;
/** `journey:<id>#<seq>` */
const JOURNEY_RE = /^journey:(.+)#([0-9]+)$/;

/**
 * Compose one repository's reading out of its rows.
 *
 * `contract` is the person's own walks, read live out of `docs/arch/flows/`
 * rather than stored, because they are a tracked file of theirs and copying
 * them into Tortie's own database would make a second answer that could fall
 * out of step with the first. They sort ahead of every model journey.
 */
export function composeSemanticReading(
  rows: ReadingRows,
  contract: readonly ArchJourneyReading[] = []
): SemanticReading {
  const citesOf = new Map<string, ArchCiteReading[]>();
  for (const cite of [...rows.cites].sort((a, b) => a.seq - b.seq)) {
    const held = citesOf.get(cite.claimId) ?? [];
    held.push({
      at: `${cite.relPath}:${String(cite.line)}`,
      why: cite.why,
      relPath: cite.relPath,
      line: cite.line,
      grade: cite.grade,
      factKind: cite.factKind,
      factSubject: cite.factSubject,
      factLine: cite.factLine,
      dead: cite.dead
    });
    citesOf.set(cite.claimId, held);
  }
  const agentOf = new Map(rows.runs.map((run) => [run.runId, run.agentId]));

  const partClaims = new Map<string, ArchClaimReading[]>();
  const gates: ArchGateReading[] = [];
  const stepClaims = new Map<string, ReadingClaimRow>();
  for (const claim of rows.claims) {
    const cites = citesOf.get(claim.claimId) ?? [];
    const agentId = agentOf.get(claim.runId) ?? '';
    const part = PART_RE.exec(claim.subject);
    if (part !== null) {
      const id = part[1] ?? '';
      const held = partClaims.get(id) ?? [];
      held.push({
        claimId: claim.claimId,
        field: claim.field as ArchClaimField,
        text: claim.text,
        cites,
        stale: claim.stale,
        staleReason: claim.staleReason,
        agentId
      });
      partClaims.set(id, held);
      continue;
    }
    const gate = GATE_RE.exec(claim.subject);
    if (gate !== null) {
      gates.push({
        gateId: gate[2] ?? '',
        partId: gate[1] ?? '',
        question: claim.question ?? '',
        answer: (claim.answer ?? 'uncertain') as ArchGateAnswer,
        because: claim.text,
        cites,
        stale: claim.stale,
        staleReason: claim.staleReason,
        agentId
      });
      continue;
    }
    const step = JOURNEY_RE.exec(claim.subject);
    if (step !== null) stepClaims.set(claim.subject, claim);
  }

  const parts: ArchPartReading[] = [...partClaims.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([id, claims]) => ({
      id,
      name: claims.find((claim) => claim.field === 'name')?.text ?? null,
      claims: claims.sort(byField)
    }));

  const journeys = [
    ...contract,
    ...composeJourneys(rows.journeys, stepClaims, citesOf, agentOf)
  ].sort((a, b) => {
    if (a.source !== b.source) return a.source === 'contract' ? -1 : 1;
    return a.journeyId < b.journeyId ? -1 : a.journeyId > b.journeyId ? 1 : 0;
  });

  const kept = rows.runs
    .filter((run) => run.verdict === 'kept')
    .sort((a, b) => b.startedAt - a.startedAt)[0];

  return {
    parts,
    journeys,
    gates: gates.sort((a, b) =>
      a.partId !== b.partId
        ? a.partId < b.partId
          ? -1
          : 1
        : a.gateId < b.gateId
          ? -1
          : a.gateId > b.gateId
            ? 1
            : 0
    ),
    rates: [...rows.rates].sort((a, b) => (a.scope < b.scope ? -1 : 1)),
    runs: rows.runs.map((run) => ({
      runId: run.runId,
      agentId: run.agentId,
      model: run.model,
      partId: run.partId,
      verdict: run.verdict,
      reason: run.reason,
      wallMs: run.wallMs,
      claims: run.claims,
      rowsDropped: run.rowsDropped,
      startedAt: run.startedAt
    })),
    readAt: kept === undefined ? null : kept.startedAt
  };
}

/**
 * The walks, contract first. A journey out of `docs/arch/flows/` is the
 * person's own and sorts ahead of every model journey, whatever their ids.
 */
function composeJourneys(
  rows: readonly ReadingJourneyRow[],
  stepClaims: ReadonlyMap<string, ReadingClaimRow>,
  citesOf: ReadonlyMap<string, ArchCiteReading[]>,
  agentOf: ReadonlyMap<string, string>
): ArchJourneyReading[] {
  const byId = new Map<string, { name: string; source: 'model' | 'contract'; steps: ReadingJourneyRow[] }>();
  for (const row of rows) {
    const held = byId.get(row.journeyId) ?? { name: row.name, source: row.source, steps: [] };
    held.steps.push(row);
    byId.set(row.journeyId, held);
  }
  const out: ArchJourneyReading[] = [];
  for (const [journeyId, held] of byId) {
    const steps: ArchJourneyStepReading[] = held.steps
      .sort((a, b) => a.seq - b.seq)
      .map((row) => {
        const claim = stepClaims.get(`journey:${journeyId}#${String(row.seq)}`);
        return {
          seq: row.seq,
          partId: row.partId,
          label: row.label,
          cites: claim === undefined ? [] : (citesOf.get(claim.claimId) ?? []),
          stale: claim?.stale ?? false,
          staleReason: claim?.staleReason ?? null
        };
      });
    const agentId =
      held.source === 'contract'
        ? null
        : (agentOf.get(stepClaims.get(`journey:${journeyId}#1`)?.runId ?? '') ?? null);
    out.push({ journeyId, name: held.name, source: held.source, agentId, steps });
  }
  return out.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'contract' ? -1 : 1;
    return a.journeyId < b.journeyId ? -1 : a.journeyId > b.journeyId ? 1 : 0;
  });
}

/** The seven fields in the order the ask asks for them, then by id. */
function byField(a: ArchClaimReading, b: ArchClaimReading): number {
  const at = ARCH_CLAIM_FIELDS.indexOf(a.field);
  const bt = ARCH_CLAIM_FIELDS.indexOf(b.field);
  if (at !== bt) return at - bt;
  return a.claimId < b.claimId ? -1 : a.claimId > b.claimId ? 1 : 0;
}
