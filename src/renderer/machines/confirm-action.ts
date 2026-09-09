/**
 * What a project tab says and offers for a machine whose details changed
 * (Phase 235, item 4).
 *
 * THE DEFECT THIS CLOSES, reproduced four times by research 85 and again at
 * 1bbcd7c1 on the operator's own Mac Pro. One execution bearing field was
 * rewritten in machines.json and nobody re-confirmed it. The row read
 * `changed` and `usable: false`, the view read `link: 'refused'`, and main
 * held the true sentence — "Tortie will not connect to greg-s-mac-pro, because
 * its details changed after you confirmed them" — while the tab drew two false
 * ones: "Tortie is not connected to Greg’s Mac Pro, so it cannot read that
 * folder." and "Greg’s Mac Pro did not answer, so Tortie could not read what
 * changed." That machine answered ssh in the same run and Tortie never asked
 * it. ZERO actions were offered anywhere on the tab and the word "confirm"
 * appeared ZERO times in the whole document.
 *
 * WHAT CHANGES IS WHICH SENTENCE, NEVER HOW MANY. The tab says exactly what it
 * said before, in the same place, in one sentence of the same length; a tab
 * that drew nothing at all still draws nothing, because Phase 230's rule is
 * that a stale view keeps its rows and says nothing over them and this phase
 * does not lift it. So the operator's rule of 2026-09-07 holds by
 * construction: the remote face gains no sentence, and the one it had stops
 * being false.
 *
 * THE SENTENCE NAMES THE DOOR because the button cannot. `settings:openWindow`
 * takes no argument, so pressing the action opens the Settings window and
 * lands wherever it last was, which is the same limit `tab-io.ts`'s remote
 * save refusal already states in the same words. The label is Settings' own,
 * imported rather than retyped, which is `./prepare-action.ts`'s rule and for
 * its reason: two doors to one act must not say two different things.
 *
 * THE MACHINE IS NAMED THE WAY THE PERSON NAMED IT. Main's own sentence calls
 * it `greg-s-mac-pro`, its id, where every other sentence in the product calls
 * it `Greg’s Mac Pro`, its label. That is why this sentence is composed here
 * from the label rather than main's `detail` being drawn: main's is three
 * sentences long, which is the paragraph the operator's rule forbids, and it
 * names the machine by the wrong one of its two names.
 */

import type { MachineStateView } from '@shared/ipc';
import { BTN_CONFIRM_CHANGED } from '../settings/machines-copy';

/** The button's label, which is the Settings button's label. */
export const CONFIRM_ACTION_LABEL = BTN_CONFIRM_CHANGED;

/**
 * Whether this machine's row needs confirming again right now.
 *
 * It reads `confirmNeeded` and never the link, because `refused` is also a
 * machine nobody ever confirmed and a machine whose version nobody accepted,
 * and neither of those is a person's own agreement that one field moved.
 */
export function confirmActionOffered(
  states: readonly MachineStateView[],
  machineId: string
): boolean {
  return (
    states.find((one) => one.id === machineId)?.confirmNeeded === 'changed'
  );
}

/**
 * The one short sentence, composed from the machine's own label.
 *
 * It says the fact, what is needed and where, and it is the only sentence this
 * phase writes. A surface asks for it only where it was ALREADY going to draw
 * a sentence about this machine, and draws it instead of that one.
 */
export function machineConfirmChangedLine(label: string): string {
  return (
    `The details for ${label} changed, so confirm them again in Settings, ` +
    `then Machines.`
  );
}

/**
 * The sentence for a machine whose details changed, or null.
 *
 * The one function the four sidebars call. It answers null for every other
 * machine, so a caller writes `confirmChangedLine(...) ?? <its own sentence>`
 * and the ordinary case is untouched.
 */
export function confirmChangedLine(
  states: readonly MachineStateView[],
  machineId: string
): string | null {
  const view = states.find((one) => one.id === machineId);
  if (view === undefined || view.confirmNeeded !== 'changed') return null;
  return machineConfirmChangedLine(view.label);
}
