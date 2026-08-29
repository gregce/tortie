/**
 * The arch half of the bridge (Phase 63): the standing contract's three reads
 * and its two subscriptions. Every one goes through the one typed invoke and
 * the one typed event subscription in ./bridge.
 *
 * None of these can change a session. `load` reads `docs/arch/` and Tortie's
 * own arch database, `check` runs the compiled in checkers over git output,
 * `skeleton` hands back drafted bytes, `composePayload` composes text and
 * returns it, and `modules` reads the import graph that is already stored.
 * The canvas calls (Phase 162) write ONLY Tortie's own disposable arch
 * database, whose loss costs a re-layout and nothing else. Since Phase 158
 * exactly three calls write under the person's `docs/arch/`, all through
 * main's single writer module and only under the compiled contract names:
 * `seed`, `enrich` on a kept answer, and `acceptDivergence`, which is the
 * one writer baseline.json has.
 */

import type { GmuxArchExtras } from '../shared/ipc';
import {
  EVT_ARCH_CHECKED,
  EVT_ARCH_MAP_UPDATED,
  EVT_ARCH_PASS,
  EVT_ARCH_PROGRESS
} from '../shared/ipc';
import { invoke, on } from './bridge';

/**
 * arch surface. Three calls in Phase 63 and two more in Phase 64, with two
 * subscriptions, behind one object, feature detected together.
 *
 * `composePayload` turns a selection into one block of plain text and hands it
 * back. It takes no session id and it cannot reach a session, so nothing on
 * this side of the bridge decides where a block goes.
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
  composePayload: (input) => invoke('arch:composePayload', input),
  modules: (input) => invoke('arch:modules', input),
  // The level 1 map of any repository, contract or none (Phase 160). A read
  // over the fact base that parses nothing and never waits for a scan, and
  // the push that says the facts behind it moved.
  map: (input) => invoke('arch:map', input),
  // The drilled part and the drilled module (Phase 161). Two more reads over
  // the same fact base, scoped in main; neither can start a scan or a check
  // beyond what arch:map itself already schedules.
  mapPart: (input) => invoke('arch:mapPart', input),
  moduleFiles: (input) => invoke('arch:moduleFiles', input),
  // The canvas (Phase 162): the camera and the kept layout, per repository
  // and per drill scope. The one write surface on this bridge, and it writes
  // ONLY Tortie's own disposable arch database: no file in the person's
  // repository, no session, no process.
  canvasState: (input) => invoke('arch:canvasState', input),
  setCamera: (input) => invoke('arch:setCamera', input),
  setLayout: (input) => invoke('arch:setLayout', input),
  clearLayout: (input) => invoke('arch:clearLayout', input),
  // The one path in (Phase 158). `seed` writes the deterministic skeleton
  // through main's single writer module, `enrich` runs the one confirmed
  // agent once and writes a validated answer, `passStatus` is a read, and
  // `acceptDivergence` is the accept button's own append to baseline.json.
  // Every write lands as an ordinary uncommitted change in Source Control.
  seed: (input) => invoke('arch:seed', input),
  // Phase 159: the same call carries an optional `scope`. `drift` is the
  // ribbon's repair press; absent is the whole pass, bytes unchanged. There
  // is no second channel and nothing on this side decides what started it.
  enrich: (input) => invoke('arch:enrich', input),
  passStatus: (input) => invoke('arch:passStatus', input),
  acceptDivergence: (input) => invoke('arch:acceptDivergence', input),
  onChecked: (cb) => on(EVT_ARCH_CHECKED, cb),
  onProgress: (cb) => on(EVT_ARCH_PROGRESS, cb),
  onMapUpdated: (cb) => on(EVT_ARCH_MAP_UPDATED, cb),
  onPass: (cb) => on(EVT_ARCH_PASS, cb)
};
