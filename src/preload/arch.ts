/**
 * The arch half of the bridge (Phase 63): the standing contract's three reads
 * and its two subscriptions. Every one goes through the one typed invoke and
 * the one typed event subscription in ./bridge.
 *
 * None of these can change a session or write a file. `load` reads
 * `docs/arch/` and Tortie's own arch database, `check` runs the compiled in
 * checkers over git output, and `skeleton` hands back drafted bytes for unsaved
 * editor buffers rather than writing them anywhere.
 */

import type { GmuxArchExtras } from '../shared/ipc';
import { EVT_ARCH_CHECKED, EVT_ARCH_PROGRESS } from '../shared/ipc';
import { invoke, on } from './bridge';

/**
 * arch surface (Phase 63). Three calls and two subscriptions behind one
 * object, feature detected together.
 *
 * `onChecked` exists because a re-check outlives the invoke that started it: a
 * person's agent rewrites forty files, the watcher's fan out fires, and the
 * verdict strip has to move without anybody asking it to. `onProgress` exists
 * for the one time cold index on a large repository, which the view narrates
 * rather than hiding behind a frozen panel.
 */
export const arch: GmuxArchExtras['arch'] = {
  load: (input) => invoke('arch:load', input),
  check: (input) => invoke('arch:check', input),
  skeleton: (input) => invoke('arch:skeleton', input),
  onChecked: (cb) => on(EVT_ARCH_CHECKED, cb),
  onProgress: (cb) => on(EVT_ARCH_PROGRESS, cb)
};
