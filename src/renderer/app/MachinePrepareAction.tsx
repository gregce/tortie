/**
 * The Prepare button on a project tab, for a machine that did not answer
 * (Phase 232, item 4).
 *
 * It is drawn under the sentence each sidebar composes for a machine Tortie is
 * not connected to, in the Explorer, Source control, Search and Context, and
 * it renders nothing at all unless `prepareActionOffered` in
 * ../machines/prepare-action.ts says the machine's link reads `quiet`. So a
 * sidebar may mount it in its whole refusal branch and it appears only for
 * the one state it is for.
 *
 * IT REACHES THE SAME CHANNEL SETTINGS DOES, `machines.prepare`, with the same
 * label. Nothing about the call is new: main's handler takes the machine back
 * off the greeting deadline set and runs the same prepare the launch sign-in
 * runs, refusing an unconfirmed row before any process exists. A press that
 * prepared the machine needs no sentence here, because main pushes the link
 * change and this component disappears with it; the sidebars that re-read
 * when a machine starts answering do so as they always have. A press that did
 * not prepare it puts main's own sentence on the button's hover title, which
 * is where an explanation a person might want lives, and on the resting face
 * nothing.
 */

import React, { useState } from 'react';
import { gmuxBridge } from '../bridge';
import {
  PREPARE_ACTION_BUSY,
  PREPARE_ACTION_LABEL,
  prepareActionOffered
} from '../machines/prepare-action';
import { useApp } from '../state/store';
import './machine-tab-action.css';

export function MachinePrepareAction({
  machineId
}: {
  machineId: string;
}): React.JSX.Element | null {
  const offered = useApp((s) => prepareActionOffered(s.machineStates, machineId));
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const machines = gmuxBridge()?.machines;
  if (!offered || machines === undefined || machines.prepare === undefined) {
    return null;
  }
  const press = (): void => {
    setBusy(true);
    setSaid(null);
    void machines
      .prepare(machineId)
      .then(
        (result) => {
          if (result.class !== 'prepared') setSaid(result.detail);
        },
        (err: unknown) => {
          setSaid((err as Error).message);
        }
      )
      .finally(() => {
        setBusy(false);
      });
  };
  return (
    <button
      type="button"
      className="btn btn-secondary machine-tab-action"
      disabled={busy}
      data-machines-action="prepare"
      title={said ?? undefined}
      onClick={press}
    >
      {busy ? PREPARE_ACTION_BUSY : PREPARE_ACTION_LABEL}
    </button>
  );
}
