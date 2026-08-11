/**
 * Session-id harvesting — the capture route for every agent that only reveals
 * its conversation id AFTER the process has written it (Phase 13.5,
 * docs/research/22-resume-audit.md §3.2/§3.3).
 *
 * Two halves, one seam: ./stores.ts is what each agent's store looks like and
 * how a record is proven to belong to this pane; ./watch.ts is the single
 * watch/settle algorithm that consumes those descriptors. Adding an agent is
 * a descriptor, never a second harvester.
 */

export {
  agentHarvestsId,
  isDescendantOf,
  resetProcessParentCache,
  sanitizeQwenCwd,
  type HarvestContext,
  type HarvestedSessionId,
  type HarvestOptions,
  type HarvestVerdict,
  type SessionIdWatch
} from './stores';

export { watchForSessionId } from './watch';
