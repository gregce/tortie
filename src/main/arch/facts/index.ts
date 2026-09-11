/**
 * The fact base (Phase 257, research 118 §6 and §10 Phase 1): what a
 * repository builds, exposes, keeps, reaches and tests, with no model.
 *
 * THIS IS THE DOOR. Nothing outside `src/main/arch/facts/` imports any other
 * file in it; `src/main/arch/tree-facts.ts` reads bytes, asks the worker pool
 * for call sites, and hands both to `readFacts`, and `src/main/arch/db.ts`
 * stores what comes back. The directory itself reads no file, spawns nothing,
 * names no argv and touches no store: its one `node:` import is `node:crypto`
 * in `./oid.ts`, and `conformance:facts` rule 8 scans it to keep that true.
 *
 * The categories are the eight research 118 measured, in the charter's order:
 * entrypoint, boundary, surface, store, effect, network, gate, test. The rule
 * table is CLOSED, a constant and never a setting. What the port did to each
 * measured rule, being ported, fixed first on the hand sample's own false
 * rows, or dropped with its re-entry condition, is written at the head of the
 * file that holds it.
 */

export { readFacts, readWrapFacts, type FactReadInput } from './read';
export {
  ANCHORS,
  closeWrappers,
  EMPTY_WRAPPER_DIGEST,
  unwrapSite,
  wrapperDigest,
  WRAPPER_GRAMMARS,
  WRAPPER_MAX_HOPS
} from './wrappers';
export { blobOid } from './oid';
export { vendoredReason } from './vendored';
export { isManifestPath } from './manifests';
export { wrapperPassOn } from './wrapper-setting';
export { FACT_LIMITS } from './limits';
export { CALL_RULES } from './rules';
export { LINE_RULES } from './line-rules';
export type { FactRule, LineRule, RuleContext } from './types';
