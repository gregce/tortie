/**
 * The Context panel's read of a folder on a machine (Phase 125, from Phase 108).
 *
 * Three members and one invoke channel. It reads the agent configuration on one
 * machine, being the skills, MCP servers, hooks, plugins and instruction files
 * the agents THERE will load. The reader runs on this Mac. The machine only
 * lists directories and sends file bytes back, so no second precedence table
 * exists anywhere.
 *
 * INSTALL, ENABLE AND PIN ARE REFUSED on a remote tab, permanently. Eleven of
 * the twelve `context:*` channels run a binary under process.resourcesPath,
 * reach the network, or write Tortie's own pin store, and none of that has any
 * business on another person's computer.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

// PHASE 108. The configuration read from another machine is the same scan
// result the local Context panel already draws, so one set of renderer code
// draws both and no remote-only precedence shape can exist. Two declarations
// of one shape is how the two ends of a channel drift apart.
import type { ContextScanResult } from '../../context';

// ---- PHASE 108 ----
// The agent configuration on another machine (Phase 108, research 57 section 7
// and research 57 i7).
//
// WHAT THIS IS FOR. A tab whose project is a folder on another machine gets a
// working Context panel. The reader that resolves the per agent precedence
// runs UNCHANGED on this Mac; the machine only answers directory listings and
// file bytes. So the scan below is the SAME ContextScanResult a local scan
// produces, drawn by the same renderer code, and no remote-only precedence
// shape can exist.
//
// WHAT IT DOES NOT DO. It writes nothing on either computer. Install, enable
// and pin are refused on a remote tab, permanently. It computes no hashes and
// no pins, it does not list nested project skills, and nothing calls it on a
// clock.

/** Why one read of the Context on a remote tab answered the way it did. */
export type MachineContextMode =
  /** The machine answered. `scan` is present. */
  | 'context'
  /** Tortie is not connected to that machine. Nothing was asked. */
  | 'notConnected'
  /**
   * The machine did not say where its home folder is. Nothing was read.
   *
   * The refusal exists because the path resolver on this Mac falls back to
   * THIS Mac's home when the environment carries none, and a scan built over
   * that would draw this Mac's skills under the machine's name, which is the
   * one wrong answer this feature can produce.
   */
  | 'noHome'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One Context read against one machine. */
export interface MachineContextInput {
  readonly machineId: string;
  /** The project folder on that machine. Absolute, never a path on this Mac. */
  readonly cwd: string;
}

/** What one machine answered about the configuration its agents will load. */
export interface MachineContextResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  readonly cwd: string;
  readonly mode: MachineContextMode;
  /** The same shape the local scan produces. Null unless mode is 'context'. */
  readonly scan: ContextScanResult | null;
  /** How many reader passes the read took. */
  readonly passes: number;
  /** How many script calls crossed the link, the facts read included. */
  readonly calls: number;
  /**
   * THE CUT. The pass cap ended the read with paths still unread, so entries
   * can be missing from the list and the renderer says so.
   */
  readonly cut: boolean;
  /** Wall time from the call to the answer, in ms. The round trips are in it. */
  readonly elapsedMs: number;
}
// ---- END PHASE 108 ----

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesContextInvokeChannelMap {
  // PHASE 108. One READ of the agent configuration on one machine, being the
  // skills, MCP servers, hooks, plugins and instruction files the agents THERE
  // will load. The reader runs on this Mac; the machine only lists directories
  // and sends file bytes back, so no second precedence table exists anywhere.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The commands that cross are
  // `machine-facts` and `context-read` from the frozen catalogue in
  // src/main/machines/remote-scripts.ts, chosen by name, with the two path
  // lists and the depth arriving there as positional parameters.
  //
  // IT WRITES NOTHING, on either computer. Install, enable and pin are refused
  // on a remote tab, permanently: eleven of the twelve context:* channels run
  // a binary under process.resourcesPath, reach the network, or write Tortie's
  // own pin store, and none of that has any business on another person's
  // computer. The renderer draws no control that could ask for any of it.
  //
  // NOTHING CALLS IT ON A CLOCK. A read happens when the view opens on the
  // tab, when the tab's project changes, and when a person presses Refresh.
  // Main cannot see a file change on another computer, and the tooltip says
  // so.
  //
  // It NEVER THROWS for a machine state. A machine Tortie is not signed in to,
  // a machine that did not say where its home folder is, and a machine that
  // did not answer all come back as a mode word. No prose crosses this
  // channel: the renderer draws every sentence from
  // src/renderer/machines/context.ts, where the vocabulary audit reads it.
  'machines:readContext': {
    req: [input: MachineContextInput];
    res: MachineContextResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesContextApi {
  // Phase 108. Reads the agent configuration on one machine, so the Context
  // panel on a tab that lives over there shows what the agents THERE will
  // load. It reads and never writes, and install, enable and pin are not
  // behind it and never will be.
  readContext(input: MachineContextInput): Promise<MachineContextResult>;
}
