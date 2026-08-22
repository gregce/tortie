/**
 * The link state, and which agents a machine has (Phase 125, from Phase 71 and
 * Phase 109).
 *
 * Eight members, two invoke channels and two event channels. Both channels read
 * memory in main by default and start nothing. `machines:agents` with `fresh`
 * true is the one exception, and that is a person pressing Rescan.
 *
 * WHAT THIS DECIDES IS WHAT A TILE LOOKS LIKE, and never what a manifest row
 * holds. The create path and the restore path keep asking the machine at create
 * time and at restore time.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type { MachineColor } from '../../machines';

// ---------------------------------------------------------------------------
// The link state of every machine (Phase 71, M4)
// ---------------------------------------------------------------------------

/**
 * How Tortie is talking to one machine right now.
 *
 *  - `connected` is a live connection. There is no timer on that machine.
 *  - `polling` is the machine answering on the timer, which is what a machine
 *    whose program Tortie has not measured for a live connection gets.
 *  - `connecting` is a sign in that is happening right now.
 *  - `quiet` is a confirmed machine whose last attempt got no answer.
 *  - `refused` is a machine Tortie will not use, because a person has not
 *    confirmed it or because it runs a version nobody measured.
 */
export type MachineLink =
  | 'connected'
  | 'polling'
  | 'connecting'
  | 'quiet'
  | 'refused';

/**
 * One machine's link state, composed in main.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A ROW. Tortie keeps no record on this Mac
 * of a session that runs on another machine. So at startup, before a machine
 * has answered, there is nothing from which a session row could be built, and a
 * person who quit with an agent running on a machine that is now asleep used to
 * be told nothing at all. This is the one statement Tortie can make truthfully
 * before any answer arrives: it names the machine, and it says whether Tortie
 * has heard from it.
 *
 * It says nothing about sessions, because nothing about them is known.
 */
export interface MachineStateView {
  readonly id: string;
  readonly label: string;
  readonly color: MachineColor;
  readonly link: MachineLink;
  /** True once any list completed for this machine in this run. */
  readonly everAnswered: boolean;
  /** Local epoch ms of the last completed list, or null. */
  readonly lastAnsweredAt: number | null;
  /** One sentence for the person, or null when the link is healthy. */
  readonly detail: string | null;
  /**
   * PHASE 101. The folder Tortie may save under on this machine, or null.
   *
   * IT IS THE CARRIER FOR "may this tab be saved", and it is on this view
   * rather than on the open file's own reference for one reason. A field
   * written when a tab is opened is stale the moment a person turns saving on
   * or off in Settings, so a tab open for an hour would be read-only after the
   * grant, or editable after the withdrawal. This whole list is pushed on
   * EVT_MACHINE_STATE and `onMachineStateChanged` fires on the confirmation
   * record as well as the link and the machines file, so the renderer's answer
   * is never older than the last confirmation.
   *
   * It is the row's root ONLY when the row is confirmed and carries a non-empty
   * one. An unconfirmed row reports null even when machines.json holds a root,
   * because an unconfirmed root is not a confirmed fact. It is presentational:
   * main refuses that case anyway, and this copy must never disagree with main.
   *
   * Optional, and absent reads as null.
   */
  readonly writeRoot?: string | null;
}

/**
 * The one event channel this state arrives on after the first read.
 *
 * It carries the whole list every time. The list is at most as long as the
 * machines file, which a person maintains by hand, so there is nothing to gain
 * from a per machine push and one shape is one shape to reason about.
 */
export const EVT_MACHINE_STATE = 'machines:stateChanged';

// ---------------------------------------------------------------------------
// PHASE 109. Which agents one machine has
// ---------------------------------------------------------------------------

/**
 * What Tortie knows about one agent on one machine.
 *
 * ONLY `absent` may grey a tile. `unknown` covers a machine nobody asked, a
 * scan that failed, and an answer read while a folder on the search list
 * could not be read, and it always draws as selectable, because a false
 * absent removes a capability a person cannot argue with while a false
 * present costs one refusal that names the machine.
 */
export type MachineAgentPresence = 'present' | 'absent' | 'unknown';

/** One agent's reading on one machine. */
export interface MachineAgentReading {
  readonly agentId: string;
  readonly presence: MachineAgentPresence;
  /** Absolute path on that machine. Null unless presence is 'present'. */
  readonly path: string | null;
}

/**
 * One machine's whole answer, as the renderer reads it.
 *
 * It lives in main memory against that machine's connection generation and is
 * written to no disk. It decides what a TILE looks like and never what goes
 * into a manifest row: the create path and the restore path keep asking the
 * machine at create time and at restore time.
 */
export interface MachineAgentsView {
  readonly machineId: string;
  /**
   * Milliseconds since the epoch when that machine last answered. Null when
   * it was never asked in this run.
   */
  readonly askedAt: number | null;
  readonly agents: MachineAgentReading[];
}

/**
 * The event the whole map arrives on after the first read. It carries every
 * machine's view every time, the `EVT_MACHINE_STATE` precedent.
 */
export const EVT_MACHINE_AGENTS = 'machines:agentsChanged';

export interface MachinesEventPayloadMap {
  [EVT_MACHINE_STATE]: [states: MachineStateView[]];
  [EVT_MACHINE_AGENTS]: [views: MachineAgentsView[]];
}

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesPresenceInvokeChannelMap {
  // PHASE 71. Reads memory in main and answers. It starts nothing, asks no
  // machine anything, and opens no file. The renderer calls it once at boot and
  // is pushed every change after that on EVT_MACHINE_STATE.
  'machines:state': { req: []; res: MachineStateView[] };
  // PHASE 109. Which agents each machine has, for the create surfaces and,
  // in Phase 110, for Settings. ONE channel serves both phases.
  //
  // `fresh: false` READS MEMORY IN MAIN and starts nothing: no machine is
  // asked anything, no file is opened. A null id returns every held view,
  // which is what the renderer asks once at init; an id returns that
  // machine's view alone. `fresh: true` requires an id and sends ONE batched
  // `agents-find` read from the frozen catalogue to that machine, which is
  // what the Rescan button presses; main refuses it while it is not connected
  // to the machine, and a null id with `fresh: true` refuses before anything
  // is composed.
  //
  // THE ANSWER DECIDES WHAT A TILE LOOKS LIKE AND NOTHING ELSE. The create
  // path and the restore path keep asking the machine at create time and at
  // restore time, so nothing read over this channel can reach a manifest
  // row. Only a positive `absent` may grey a tile; `unknown` always draws
  // as selectable. Nothing calls it on a clock: the scan runs once when a
  // machine becomes ready and once per Rescan press.
  'machines:agents': {
    req: [id: string | null, fresh: boolean];
    res: MachineAgentsView[];
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesPresenceApi {
  // Phase 71. The link state of every machine, read once at boot and pushed
  // on every change after that.
  state(): Promise<MachineStateView[]>;
  onStateChanged(cb: (states: MachineStateView[]) => void): () => void;
  // Phase 109. Which agents each machine has. With `fresh` false it reads
  // memory in main and starts nothing; with `fresh` true it sends ONE
  // batched read to that machine, which is a person pressing Rescan. The
  // answer decides what a tile looks like and never what a manifest row
  // holds.
  agents(id: string | null, fresh: boolean): Promise<MachineAgentsView[]>;
  // Phase 109. The whole map, pushed whenever any machine's answer changes,
  // the `onStateChanged` precedent.
  onAgentsChanged(cb: (views: MachineAgentsView[]) => void): () => void;
}
