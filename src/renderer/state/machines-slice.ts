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
import type { MachineAgentsView, MachineStateView } from '@shared/ipc';
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

  /**
   * Which agents each machine has, as main last heard (Phase 109).
   *
   * Main holds one answer per machine in memory, against that machine's
   * connection generation, and pushes the whole list on every change. Empty
   * until the first read completes, and empty on a build whose preload has no
   * `machines.agents`, and in both states every tile draws on: only a
   * positive absent may grey one.
   */
  machineAgents: MachineAgentsView[];

  applyMachineStates(states: MachineStateView[]): void;
  applyMachineAgents(views: MachineAgentsView[]): void;
}

export const createMachinesSlice: StateCreator<
  AppState,
  [],
  [],
  MachinesSlice
> = (set) => ({
  machineStates: [],
  machineAgents: [],

  applyMachineStates(states) {
    set({ machineStates: states });
  },

  applyMachineAgents(views) {
    set({ machineAgents: views });
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

/**
 * Whether Tortie can ask this machine for something right now.
 *
 * PHASE 90.3 FIX ROUND. It answers the question the two crossing sidebars have
 * to ask, and it is a different question from "is this machine healthy". A
 * machine that is `connecting` is not ready yet, and one that is `quiet` or
 * `refused` will refuse the call, so only `connected` and `polling` are true
 * here. `badgeMachineOf` above draws the same two words into `answering`, and
 * both readings come from this one place so they cannot drift.
 *
 * WHY IT IS NEEDED. On a cold boot the window is drawn before any machine has
 * answered. Measured on 2026-08-19: the link read `quiet` at 1 ms and
 * `connected` at 504 ms. The Explorer's first read of a folder on that machine
 * therefore landed on a link that was not up, drew the sentence saying Tortie
 * is not connected, and nothing re-read it for the rest of the run. The two
 * surfaces read this and try once more when the machine starts answering.
 *
 * A machine with no row here is false, which is the honest answer: Tortie holds
 * no statement about it at all.
 */
export function machineAnswering(
  states: readonly MachineStateView[],
  machineId: string
): boolean {
  const link = states.find((one) => one.id === machineId)?.link ?? null;
  return link === 'connected' || link === 'polling';
}

/**
 * The machines this person has confirmed, in the order the machines file holds
 * them.
 *
 * PHASE 92. The home screen's fourth action row is drawn only when this list is
 * not empty, because a row that opens a sheet with nothing in it is a row
 * nobody can act on.
 *
 * WHY `refused` IS EXACTLY THE UNCONFIRMED SET, and it is not an inference.
 * `machineStateViewOf` in src/main/machines/machine-state.ts returns `refused`
 * for a row whose confirm gate has not been passed, and it returns it BEFORE it
 * reads any link fact. The live half never produces `refused` from a link fact,
 * because a link is one of `connected`, `polling`, `connecting` or `quiet`. So a
 * row that is not `refused` is a row a person confirmed, whether or not that
 * machine is answering right now.
 *
 * A machine that is asleep is still confirmed and still counts. The sheet says
 * what it found when it tries, and that sentence is better than a row that was
 * never offered.
 */
export function confirmedMachines(
  states: readonly MachineStateView[]
): MachineStateView[] {
  return states.filter((one) => one.link !== 'refused');
}

/**
 * The machine agents answer the agent board should read, or null for this Mac.
 *
 * PHASE 109. Null means "use this Mac's own detection", which is what
 * `buildAgentOptions` did for every create before this phase. A machine
 * nothing is held for gets an all-unknown view rather than null, because the
 * board on a machine tab must never fall back to this Mac's scan: with no
 * answer held every tile draws on, and only a positive absent from that
 * machine may grey one.
 */
export function machineAgentsFor(
  views: readonly MachineAgentsView[],
  machineId: string | null | undefined
): MachineAgentsView | null {
  if (machineId === undefined || machineId === null || machineId === 'local') {
    return null;
  }
  return (
    views.find((one) => one.machineId === machineId) ?? {
      machineId,
      askedAt: null,
      agents: []
    }
  );
}

/**
 * The folder Tortie may replace a file under on one machine, or null.
 *
 * PHASE 101. Null means saving is off for that machine, which is every machine
 * in every build before this phase and every machine a person has not turned
 * saving on for. A machine with no row here is null for the same reason
 * `machineLabelFor` falls back to the id: Tortie holds no statement about it.
 *
 * WHY THE ANSWER LIVES ON THE LINK STATE RATHER THAN ON THE TAB. Main pushes
 * the whole list on every change, and the confirmation record is one of the
 * three sources that fire it, so this answer is never older than the last
 * confirmation. A field written into a tab when the tab was opened would be
 * stale the moment a person turned saving on or off in Settings, and a tab
 * that had been open for an hour would then be read only after they granted
 * saving, or editable after they withdrew it.
 *
 * IT IS PRESENTATIONAL AND IT IS NEVER THE SAFEGUARD. Main reads the confirmed
 * folder off the row on disk at call time and refuses there. This read decides
 * whether a surface is drawn as an edit surface, and nothing more.
 */
export function machineWriteRootFor(
  states: readonly MachineStateView[],
  machineId: string
): string | null {
  return states.find((one) => one.id === machineId)?.writeRoot ?? null;
}
