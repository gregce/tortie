/**
 * Architecture view state: what the contract says, what Tortie made of it, and
 * nothing else.
 *
 * FIVE RULES, and every one of them is a refusal from research 49 rather than
 * a preference.
 *
 *  1. **Nothing here polls and nothing here announces.** Main re-checks on the
 *     watcher's own fan-out and sends `arch:checked`; this store applies the
 *     answer. There is no toast, no rail badge and no dot on a session tab. A
 *     verdict that changed while you were reading a file is a number that
 *     moved, not an interruption.
 *  2. **NO VERDICT EVER TOUCHES A SESSION'S STATUS.** Nothing in this file
 *     imports the sessions slice for a write, and nothing in it may. Status
 *     semantics belong to session behaviour and this surface is not session
 *     behaviour.
 *  3. **A failed read never blanks the panel.** A contract file that will not
 *     parse is a dropped row with the file, the field and the reason on
 *     screen, beside every row that did load.
 *  4. **Nothing here writes a file; every write is main's, behind its own
 *     gate.** Phase 158 rewrote this rule from "Tortie never writes it".
 *     Drafting asks main to write the skeleton, enriching asks main to run
 *     the one confirmed agent, and accepting a divergence asks main to
 *     append one row to `baseline.json`. All three are a person's gesture,
 *     main validates whole before writing, and this store holds no path and
 *     composes no bytes: it asks, and it reads back what landed.
 *  5. **The first check is a question, never a stale verdict.** `firstCheck`
 *     renders as "Not checked yet" and never as "changed", because a run that
 *     has not finished has nothing to say about whether anything moved.
 *
 * WHAT IS NOT HERE, so a later round has something to point at: no payload
 * composer, no send to a session, and no count badge for any surface outside
 * this view to draw. Layout positions ARRIVED in Phase 162 as the kept
 * canvas, but only as a mirror of `arch.db`, whose loss costs a re-layout
 * and nothing else. The SELECTION lives here (Phase 64
 * widened it to a list) and the sending does not: composing and delivering are
 * in ./deliver.ts and ./picker.ts, behind one guard, so this file still writes
 * nothing to any session.
 */


import { create } from 'zustand';
import { createDocumentActions } from './state/document-actions';
import { createMapActions } from './state/map-actions';
import { createPassActions } from './state/pass-actions';
import { NO_SELECTION } from './state/view-state';
import type { ArchViewState } from './state/view-state';

// The vocabulary moved to ./state/view-state.ts in Phase 172 and this file
// re-exports it, so every importer of './store' keeps the name it had. The
// set of exported names is EXACTLY what this file exported before the split:
// nothing internal (NONE, NO_SELECTION, errorText, the read fold, the pass
// helpers) is widened on the way through.
export type {
  ArchCanvasEntry,
  ArchDrill,
  ArchMapEntry,
  ArchModuleViewEntry,
  ArchPartMapEntry,
  ArchPassEntry,
  ArchSelection,
  ArchStatus,
  ArchViewState
} from './state/view-state';
export {
  canvasKey,
  DRILL_HOME,
  drillPatch,
  moduleKey,
  partKey
} from './state/view-state';

/**
 * THE ONE FACADE (Phase 172, safe order row 4). The state keys live here and
 * the actions are composed from the three modules under ./state/, each a
 * `Pick` of the ONE `ArchViewState`: the document and the check, the map and
 * the drill and the canvas, the pass and the repair. One `create`, one state
 * type, one store; a second `create` anywhere in this folder is the defect
 * the import gate now names.
 */
export const useArch = create<ArchViewState>((set, get, api) => ({
  target: null,
  status: 'idle',
  load: null,
  lastCheck: null,
  checking: false,
  progress: null,
  error: null,
  selected: NO_SELECTION,
  drafting: false,
  passes: {},
  enriching: false,
  maps: {},
  drills: {},
  canvas: {},
  partMaps: {},
  moduleViews: {},

  ...createDocumentActions(set, get, api),
  ...createMapActions(set, get, api),
  ...createPassActions(set, get, api)
}));
