/**
 * contract.ts — how the recovery contract and the resume provenance are
 * WRITTEN TO and READ BACK FROM the sessions table (Phase 21, migration 008).
 *
 * ## What this module is, and what it deliberately is not
 *
 * It is the persistence half of A8 and G6, and nothing else. The SHAPES live in
 * ./agents.ts beside the code that composes them, because the registry is what
 * fills them in and that is the one place where reading the live registry is
 * correct. This module owns the two JSON columns those shapes travel in.
 *
 * The split matters more than it looks. A codec that also defines the type
 * grows a second opinion about the type, and then the writer and the reader
 * disagree about a field neither of them can see.
 *
 * ## The one rule these codecs follow: parse the gate, pass through the rest
 *
 * Each parser checks the fields that decide whether a conversation comes back,
 * and then returns the parsed object AS IT WAS, with every other field intact.
 * It does NOT rebuild a subset.
 *
 * That is a durability decision, not a style one. `updateSession` reads a row,
 * merges a patch, and writes every column back. If a parser rebuilt the
 * contract from the fields it happened to know about, then any field a newer
 * build added would be silently dropped the first time an older build touched
 * the row for an unrelated reason, e.g. a rename. Passing the object through
 * makes an unknown field survive a round trip instead of being erased by it.
 *
 * ## What an unreadable value becomes
 *
 * Undefined, and the row then reads as one that never had a contract. That is
 * the safe direction and it is the same rule `parseRestore` follows in
 * ./store.ts. Half a contract is worse than none: the half that survived could
 * be a `requiresOriginalCwd: false` that nothing ever wrote, and `false` is the
 * permissive answer that opens an empty pi session which looks resumed.
 *
 * ## What a row written before migration 008 gets
 *
 * NULL in all three columns, and nothing is backfilled. A session created
 * before Tortie kept a contract has no contract. Filling one in from today's
 * registry would be the same guess the phase exists to remove, and it would be
 * indistinguishable afterwards from a contract that was genuinely recorded.
 * Unknown is a real answer, and `provenanceOf` below is how a reader gets it
 * without having to invent it.
 */

import type { AgentRecoveryContract, ResumeProvenance } from './agents';
import { parseObject } from './json-column';

/**
 * What a row with no `resume_provenance` reads as.
 *
 * It exists so that no reader can receive `undefined` and quietly treat it as a
 * permissive answer. `source: 'unavailable'` and `confidence: 'unknown'`
 * together say the only true thing about such a row: an id may or may not be
 * there, and nothing is recorded about where it came from.
 *
 * Frozen, and shared rather than rebuilt per call, so an accidental mutation
 * cannot travel to the next reader.
 */
export const UNRECORDED_PROVENANCE: ResumeProvenance = Object.freeze({
  v: 0,
  source: 'unavailable',
  confidence: 'unknown',
  at: 0,
  cwd: ''
});

/**
 * True when this provenance is the placeholder above rather than something a
 * capture actually recorded.
 *
 * `v: 0` is the marker. Every real record carries `SESSION_CONTRACT_VERSION`,
 * which starts at 1, so no writer can produce a 0 by accident.
 */
export function isUnrecordedProvenance(p: ResumeProvenance): boolean {
  return p.v === 0;
}

/**
 * What a row says about where its conversation id came from, with the missing
 * case NAMED instead of left as `undefined` for a caller to interpret.
 */
export function provenanceOf(
  provenance: ResumeProvenance | undefined
): ResumeProvenance {
  return provenance ?? UNRECORDED_PROVENANCE;
}

/**
 * Parse the `agent_contract` column.
 *
 * TWO FIELDS ARE REQUIRED and neither is defaulted. `v` has to be a number, so
 * a reader can tell which shape it is holding. `requiresOriginalCwd` has to be
 * a boolean, because it is the field the whole migration is named for and
 * defaulting it to `false` inside the parser would reinstate the permissive
 * answer one layer further down, where nobody would look for it.
 *
 * Everything else passes through untouched. See the module header.
 */
export function parseAgentContract(
  text: string | null
): AgentRecoveryContract | undefined {
  const o = parseObject(text);
  if (o === undefined) return undefined;
  if (typeof o['v'] !== 'number') return undefined;
  if (typeof o['requiresOriginalCwd'] !== 'boolean') return undefined;
  return o as unknown as AgentRecoveryContract;
}

/**
 * Parse the `resume_provenance` column.
 *
 * `v`, `source` and `confidence` are required. A confidence that cannot be read
 * is not a confidence, and a source with no confidence beside it cannot be
 * rendered as anything honest.
 *
 * The values of `source` and `confidence` are NOT checked against the unions.
 * A newer build may add a member, and rejecting the record whole would turn a
 * string this build does not recognise into "nothing was recorded", which is a
 * stronger and falser claim than "recorded as something I do not know".
 * Callers switch on these with a default arm for exactly that reason.
 */
export function parseResumeProvenance(
  text: string | null
): ResumeProvenance | undefined {
  const o = parseObject(text);
  if (o === undefined) return undefined;
  if (typeof o['v'] !== 'number') return undefined;
  if (typeof o['source'] !== 'string') return undefined;
  if (typeof o['confidence'] !== 'string') return undefined;
  return o as unknown as ResumeProvenance;
}

/** Serialize for the column. Undefined in, NULL out. */
export function serializeAgentContract(
  contract: AgentRecoveryContract | undefined
): string | null {
  return contract === undefined ? null : JSON.stringify(contract);
}

/**
 * Serialize for the column. Undefined in, NULL out.
 *
 * The placeholder is written as NULL too. It is what a missing column MEANS,
 * so writing it back as a row would turn "nothing was recorded" into a record,
 * and the two would stop being distinguishable a launch later.
 */
export function serializeResumeProvenance(
  provenance: ResumeProvenance | undefined
): string | null {
  if (provenance === undefined) return null;
  if (isUnrecordedProvenance(provenance)) return null;
  return JSON.stringify(provenance);
}

