/**
 * The renderer's copy of the machine link state (Phase 71, M4).
 *
 * WHY THE WINDOW NEEDS THIS AT ALL. Every other thing the shell draws about a
 * machine is derived from session rows. A machine that has not answered has no
 * session rows on this Mac, because Tortie keeps no record here of a session
 * that runs somewhere else. So a confirmed machine that is asleep when Tortie
 * starts is invisible to every derivation the window has, and the person who
 * left an agent running there is told nothing.
 *
 * This slice holds main's own statement instead. Main composes it, including
 * every sentence in {@link MachineStateView.detail}; this slice stores it and
 * two pure helpers read it.
 *
 * The hydration and the subscription are in ./subscriptions, which stays the
 * one lifecycle owner, so a boot retry re-reads without attaching a second
 * handler.
 */

import type { StateCreator } from 'zustand';
import type { MachineStateView } from '@shared/ipc';
import type { SessionMachine } from '@shared/types';
import type { AppState } from './app-state';

export interface MachinesSlice {
  /**
   * Every machine in the machines file, as main last reported it.
   *
   * Empty on a build with no machines file, which is the ordinary case for a
   * person who has only this Mac, and empty until the first read completes.
   */
  machineStates: MachineStateView[];

  applyMachineStates(states: MachineStateView[]): void;
}

export const createMachinesSlice: StateCreator<
  AppState,
  [],
  [],
  MachinesSlice
> = (set) => ({
  machineStates: [],

  applyMachineStates(states) {
    set({ machineStates: states });
  }
});

// ---------------------------------------------------------------------------
// The two pure reads
// ---------------------------------------------------------------------------

/**
 * The confirmed machines that are not answering right now.
 *
 * `refused` is deliberately not here. A machine nobody confirmed, or one
 * running a version nobody measured, was never asked anything, so saying Tortie
 * could not reach it would be a claim about an attempt that never happened.
 * `connecting` is not here either: a sign in that is in flight has not failed.
 */
export function silentMachines(
  states: readonly MachineStateView[]
): MachineStateView[] {
  return states.filter((one) => one.link === 'quiet');
}

/**
 * One quiet machine as the badge draws it.
 *
 * `answering` is false because that is what the badge dims on, and the badge's
 * own sentence is supplied separately by the surface, because a machine that
 * has never answered in this run says something different from one that
 * answered and then stopped.
 */
export function badgeMachineOf(state: MachineStateView): SessionMachine {
  return {
    id: state.id,
    label: state.label,
    color: state.color,
    answering: state.link === 'connected' || state.link === 'polling',
    // PHASE 72. This projection describes a MACHINE and not a session, so it
    // cannot answer whether a particular session may be brought back: two of the
    // six conditions behind that answer are facts about a row, and there is no
    // row here. False with the machine's own sentence is the honest answer, and
    // it is also the safe one, because a surface reading it hides the verb
    // rather than offering one nothing has checked.
    canRestore: false,
    restoreReason: state.detail
  };
}

/**
 * The label a person gave a machine, or its id when Tortie has no row for it.
 *
 * PHASE 90.1. The three sidebars name the machine a project's files are on, and
 * the only list of machines the renderer holds is this one. A target can carry
 * an id that has no row, e.g. a machine a person removed while its tab was
 * still open, so the id is the fallback rather than an empty sentence. The
 * fallback is visible on purpose: a person reads a short unfamiliar word and
 * knows which tab to close, where a blank would say nothing at all.
 */
export function machineLabelFor(
  states: readonly MachineStateView[],
  machineId: string
): string {
  return states.find((one) => one.id === machineId)?.label ?? machineId;
}
