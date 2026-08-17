/**
 * What Tortie can say about a machine before that machine has answered
 * (Phase 71, M4).
 *
 * ## The hole this closes, and it was measured
 *
 * A remote session row exists only after a list completes. A list starts only
 * after a machine has been prepared. A machine that is asleep is never
 * prepared. So a person who quit Tortie with an agent running on another
 * machine, and then started Tortie while that machine was down, was told
 * nothing at all: no row, no badge, nothing dimmed. The machine's row was still
 * in Settings then Machines, which is not the screen they were looking at.
 *
 * ## Why this is a statement about a MACHINE and not a set of rows
 *
 * Tortie keeps no record on this Mac of a session that runs somewhere else, so
 * at startup, before any answer, there is nothing from which a session row
 * could be built. Two ways of making rows exist were considered and both were
 * refused for this release. Writing durable manifest rows for remote sessions
 * needs the forget-machine gesture, which is a later rung, and without it a
 * machine a person removed would leave rows nobody could clear. Remembering the
 * last completed list per machine is the same durable record under another
 * name, and it would show a session that ended days ago.
 *
 * So the only honest thing to state is the one thing that IS known before an
 * answer: this machine is confirmed, and Tortie has not heard from it.
 *
 * ## Where the words are written
 *
 * Here, in main, in one module. The renderer never composes {@link
 * MachineStateView.detail}. Main is the only place that holds the confirm
 * gate's answer and the link's own reason, and a sentence composed in a
 * renderer file can be quietly reworded by a later edit to a component.
 *
 * No sentence here names the transport, the program Tortie runs on the far
 * side, or any of its verbs. Machines have labels and sessions have names.
 */

import type { MachineLink, MachineStateView } from '@shared/ipc';
import type { MachineRowV1 } from '@shared/machines';
import { machineRowStatus } from './confirm';
import {
  machineLinkFacts,
  onMachineLinkChanged,
  type MachineLinkFacts
} from './control-plane';
import {
  currentMachines,
  machineColorOf,
  machineFieldsOf,
  machineLabelOf,
  onMachinesChanged
} from './store';

// ---------------------------------------------------------------------------
// The pure half
// ---------------------------------------------------------------------------

/** One machine's row, reduced to what a link statement needs. */
export interface MachineStateRow {
  readonly id: string;
  readonly label: string;
  readonly color: MachineStateView['color'];
  /** True when the hash on record is the hash of the row as it is now. */
  readonly confirmed: boolean;
  /** The gate's own sentence when it refuses this row. Null when it does not. */
  readonly refusal: string | null;
}

/**
 * The sentence a person reads under the machine's label, or null.
 *
 * A healthy link says nothing. There is already a badge carrying the label and
 * a bar carrying the condition, and a third sentence saying the same thing is
 * the Phase 67 nit repeated.
 *
 * `reason` is the control plane's one clause. It is a verb phrase whose subject
 * is the machine, e.g. "did not answer the last time Tortie asked", so the
 * label stands in front of it and the sentence reads as one. That shape is
 * fixed by ./control-plane.ts and a clause that does not follow it would read
 * badly here, which is why the shape is written down in both files.
 */
export function machineDetailSentence(
  label: string,
  link: MachineLink,
  reason: string | null
): string | null {
  const clause = reason === null ? null : reason.replace(/\.\s*$/, '');
  switch (link) {
    case 'connected':
    case 'polling':
      return null;
    case 'connecting':
      return `Tortie is signing in to ${label} now.`;
    case 'quiet':
      return clause === null ? `${label} did not answer.` : `${label} ${clause}.`;
    case 'refused':
      return clause === null
        ? `Tortie will not use ${label}.`
        : `Tortie will not use ${label}, because it ${clause}.`;
  }
}

/**
 * One machine's view, from its row and the link facts for it.
 *
 * A row nobody has confirmed is `refused` whatever the link facts say, and it
 * carries the gate's own sentence. That order matters: the gate is the thing
 * that decides whether Tortie may talk to a machine at all, so its answer is
 * never overwritten by a report from a layer that only runs after the gate has
 * already said yes.
 */
export function machineStateViewOf(
  row: MachineStateRow,
  facts: MachineLinkFacts | undefined
): MachineStateView {
  if (!row.confirmed) {
    return {
      id: row.id,
      label: row.label,
      color: row.color,
      link: 'refused',
      everAnswered: false,
      lastAnsweredAt: null,
      detail:
        row.refusal ??
        machineDetailSentence(row.label, 'refused', null)
    };
  }
  const link: MachineLink = facts?.link ?? 'quiet';
  const reason = facts?.reason ?? null;
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    link,
    everAnswered: facts?.everAnswered ?? false,
    lastAnsweredAt: facts?.lastAnsweredAt ?? null,
    detail: machineDetailSentence(row.label, link, reason)
  };
}

/**
 * Every machine's view, in the order the machines file holds them.
 *
 * The order is the file's, so the badges do not reshuffle between renders and a
 * person can find the machine they are looking for in the place it was last
 * time.
 */
export function machineStateViewsOf(
  rows: readonly MachineStateRow[],
  facts: readonly MachineLinkFacts[]
): MachineStateView[] {
  const byId = new Map(facts.map((one) => [one.machineId, one]));
  return rows.map((row) => machineStateViewOf(row, byId.get(row.id)));
}

// ---------------------------------------------------------------------------
// The live half
// ---------------------------------------------------------------------------

/** One row of the machines file, reduced. Reads memory, never the disk. */
function stateRowOf(row: MachineRowV1): MachineStateRow {
  const status = machineRowStatus(row.id, machineFieldsOf(row));
  return {
    id: row.id,
    label: machineLabelOf(row),
    color: machineColorOf(row),
    confirmed: status.state === 'confirmed',
    refusal: status.refusal
  };
}

/**
 * The link state of every machine in the file, right now.
 *
 * The facts are asked for PER ROW rather than taken from the control plane's
 * own list, because that list holds only the machines this run has touched and
 * the answer must cover every machine in the file. A machine nobody has signed
 * in to has an answer of its own, and it is the one this hole was opened by.
 */
export function currentMachineStates(): MachineStateView[] {
  const rows = currentMachines().rows.map(stateRowOf);
  return machineStateViewsOf(
    rows,
    rows.map((row) => machineLinkFacts(row.id))
  );
}

/**
 * Fire `listener` whenever the answer would change.
 *
 * Two sources, because two things move it: the link itself, and the machines
 * file (a machine added, removed or confirmed). Both are subscribed here so the
 * renderer subscribes to one thing.
 */
export function onMachineStateChanged(
  listener: (states: MachineStateView[]) => void
): () => void {
  const fire = (): void => {
    listener(currentMachineStates());
  };
  const offLink = onMachineLinkChanged(fire);
  const offRows = onMachinesChanged(fire);
  return () => {
    offLink();
    offRows();
  };
}
