/**
 * The overview half of the bridge (Phase 137): the Catch Me Up page's two
 * reads. Both go through the one typed invoke. Neither can change a session,
 * because the channels they name read agent logs and write only Tortie's own
 * overview store.
 */

import type { GmuxOverviewExtras } from '../shared/ipc';
import { invoke } from './bridge';

/**
 * overview surface (Phase 137). Two methods behind one object, feature
 * detected together. `project` answers with every session in the project and
 * the latest turn of each. `sessions` answers with the named sessions and
 * their last turns.
 */
export const overview: GmuxOverviewExtras['overview'] = {
  project: (input) => invoke('overview:project', input),
  sessions: (input) => invoke('overview:sessions', input)
};
