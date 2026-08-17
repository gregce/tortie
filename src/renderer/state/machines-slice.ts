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
    answering: state.link === 'connected' || state.link === 'polling'
  };
}
