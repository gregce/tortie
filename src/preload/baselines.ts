/**
 * The durable baseline's two calls (Phase 243).
 *
 * Its own surface rather than a member of `fs`, because `fs` is a question
 * about a file inside a project root and this is a question about Tortie's own
 * data directory. Two calls and nothing else: there is no forget, because
 * nothing a person does forgets a baseline, and eviction is main's own prune.
 */

import type { GmuxBaselinesExtras } from '../shared/ipc';
import { invoke } from './bridge';

export const baselines: GmuxBaselinesExtras['baselines'] = {
  load: (key) => invoke('baselines:load', key),
  store: (input) => invoke('baselines:store', input)
};
