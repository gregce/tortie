/**
 * Two facts per machine the Settings row draws, kept in MEMORY ONLY (Phase 340,
 * build/p340/SPEC.md D24 as revised by §Attack R14).
 *
 *  - The last Prepare's answer in this run: its class, when it answered, the
 *    version it read (kept when a later Prepare read none), and main's own
 *    headline and detail. Written by `./prepare.ts`, whose one wrapper records
 *    every return, whoever started it: the launch sign in, its retry or a press.
 *  - The system name, being what `uname -s` answered the last time the
 *    `machine-facts` read parsed one. Written by `./remote-image.ts`, where that
 *    read is parsed.
 *
 * ## Why memory and never machines.json
 *
 * A row key the schema does not know drops the WHOLE row in any build that does
 * not know it (`./schema.ts`), so a presentation fact written into the file
 * would make an older Tortie drop the person's machine. Both facts are re-learned
 * at the next sign in, which is the launch sign in for a confirmed machine.
 *
 * ## Why a listener
 *
 * A link change can fire inside `prepareMachine`, before the wrapper records the
 * class, so the refresh that push causes would read the previous sign in and the
 * row's chip would lag until some later push. `./ipc.ts` subscribes once and
 * re-broadcasts the machine state event, which the Settings window already
 * refreshes its rows on. No channel is added.
 *
 * This module writes no file, opens no manifest, reads no store and spawns
 * nothing. It imports one type.
 */

import type { MachinePrepareResult, MachineTestClass } from '@shared/ipc';

/** What the last Prepare of one machine concluded in this run. */
export interface RowSignIn {
  readonly class: MachineTestClass;
  /** Local epoch ms when it answered. */
  readonly at: number;
  readonly version: string | null;
  readonly headline: string;
  readonly detail: string;
  /**
   * PHASE 342'S FIX ROUND (build/p342/SPEC.md D7, sentence 2). On a prepared
   * answer, the one sentence that a session there can look a little different
   * from one on this Mac, carried alone so the Ready hover can draw it. Null
   * when the answer carried none.
   */
  readonly note: string | null;
}

const signIns = new Map<string, RowSignIn>();
const systems = new Map<string, string>();
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A listener that throws must not stop the others, and it must not
      // fail the Prepare or the read that recorded the fact.
    }
  }
}

/**
 * Record what one Prepare answered.
 *
 * The version is kept when this answer read none, so a machine that was asleep
 * on the second Prepare still draws the version the first one read.
 */
export function noteRowSignIn(
  machineId: string,
  result: Pick<MachinePrepareResult, 'class' | 'version' | 'headline' | 'detail' | 'note'>,
  at: number = Date.now()
): void {
  const previous = signIns.get(machineId);
  signIns.set(machineId, {
    class: result.class,
    at,
    version: result.version ?? previous?.version ?? null,
    headline: result.headline,
    detail: result.detail,
    note: typeof result.note === 'string' && result.note.trim() !== '' ? result.note : null
  });
  changed();
}

/**
 * Record what `uname -s` answered on one machine. An empty answer is the
 * machine not saying, which is not a fact, so it is not recorded.
 */
export function noteRowOs(machineId: string, uname: string): void {
  const value = uname.trim();
  if (value.length === 0) return;
  if (systems.get(machineId) === value) return;
  systems.set(machineId, value);
  changed();
}

/** The last Prepare's answer for one machine in this run, or null. */
export function rowSignInOf(machineId: string): RowSignIn | null {
  return signIns.get(machineId) ?? null;
}

/** What `uname -s` last answered for one machine in this run, or null. */
export function rowOsOf(machineId: string): string | null {
  return systems.get(machineId) ?? null;
}

/**
 * Forget both facts for one machine. `./removal.ts` calls it beside
 * `forgetRemoteMachineHome`, so a removed machine leaves nothing remembered.
 */
export function forgetRowFacts(machineId: string): void {
  const had = signIns.delete(machineId);
  const hadOs = systems.delete(machineId);
  if (had || hadOs) changed();
}

/** Be told when any fact changes. Returns the unsubscribe. */
export function onRowFactsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Drop every fact. Tests only. Listeners stay, because `./ipc.ts` subscribes
 * once for the life of the process; a test that subscribes unsubscribes.
 */
export function resetRowFactsForTests(): void {
  signIns.clear();
  systems.clear();
}
