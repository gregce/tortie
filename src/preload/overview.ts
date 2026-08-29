/**
 * The overview half of the bridge (Phase 137): the Catch Me Up page's two
 * reads. Both go through the one typed invoke. Neither can change a session,
 * because the channels they name read agent logs and write only Tortie's own
 * overview store.
 *
 * Phase 138 added one more call behind the same object. It asks main which
 * harnesses and models Settings may offer for the fold. It reads a table main
 * already holds, so it starts nothing and it spawns nothing.
 *
 * Phase 143 added two more. `timeline` asks for the story one session told,
 * version by version, and `timelineTurns` asks for the turns one row of that
 * story covers. Both read tables Tortie already wrote.
 */

import type { GmuxOverviewExtras } from '../shared/ipc';
import { invoke } from './bridge';

/**
 * overview surface (Phase 137). Two methods behind one object, feature
 * detected together. `project` answers with every session in the project and
 * the latest turn of each. `sessions` answers with the named sessions and
 * their last turns. `foldOptions` answers with the harnesses and models
 * Settings may offer for the fold (Phase 138). `timeline` and `timelineTurns`
 * answer the story one session told and the turns one row of it covers
 * (Phase 143).
 */
export const overview: GmuxOverviewExtras['overview'] = {
  project: (input) => invoke('overview:project', input),
  sessions: (input) => invoke('overview:sessions', input),
  foldOptions: () => invoke('fold:options'),
  // Phase 158. The same offer question asked about the arch enrichment. A
  // read of a table main already holds; nothing starts and nothing spawns.
  archOptions: () => invoke('arch:options'),
  timeline: (sessionId) => invoke('overview:timeline', sessionId),
  timelineTurns: (input) => invoke('overview:timelineTurns', input)
};
