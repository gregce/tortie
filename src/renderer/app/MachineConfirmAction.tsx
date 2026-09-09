/**
 * The Confirm button on a project tab, for a machine whose details changed
 * (Phase 235, item 4).
 *
 * It is `./MachinePrepareAction.tsx`'s sibling and it sits in the same slot,
 * under the sentence each sidebar composes, in the Explorer, Source control,
 * Search and Context. It renders nothing at all unless `confirmActionOffered`
 * in ../machines/confirm-action.ts says this machine's row was confirmed and
 * its details then changed, so a sidebar may mount it in its whole refusal
 * branch and it appears only for the one state it is for. The two actions
 * cannot both be offered — one wants `link === 'quiet'`, which is a confirmed
 * row that did not answer, and this one wants a row the gate refuses — so a
 * person never meets two buttons.
 *
 * IT IS A DOOR AND NOT THE ACT, and that is deliberate rather than a shortcut.
 * Refusal 8 puts the agreement behind exactly one surface, being Settings, and
 * a confirm sheet reachable from a project tab would be a second one. So this
 * button opens Settings and the sentence above it says which section, which is
 * the same limit `editor/tab-io.ts`'s remote save refusal already states in
 * the same words, for the same reason: `settings:openWindow` takes no
 * argument. Nothing about the call is new and no channel was added for it.
 *
 * THE LABEL IS SETTINGS' OWN, imported rather than retyped. On the resting
 * face there is the label and nothing else: no sentence of its own, and no
 * hover title, because unlike Prepare this button starts nothing that could
 * fail and so has nothing to report back.
 */

import React from 'react';
import { gmuxBridge } from '../bridge';
import {
  CONFIRM_ACTION_LABEL,
  confirmActionOffered
} from '../machines/confirm-action';
import { useApp } from '../state/store';
import './machine-tab-action.css';

export function MachineConfirmAction({
  machineId
}: {
  machineId: string;
}): React.JSX.Element | null {
  const offered = useApp((s) => confirmActionOffered(s.machineStates, machineId));
  const bridge = gmuxBridge();
  if (!offered || bridge?.openSettings === undefined) return null;
  const openSettings = bridge.openSettings.bind(bridge);
  return (
    <button
      type="button"
      className="btn btn-secondary machine-tab-action"
      data-machines-action="confirm-changed"
      onClick={() => void openSettings()}
    >
      {CONFIRM_ACTION_LABEL}
    </button>
  );
}
