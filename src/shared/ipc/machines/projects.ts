/**
 * Finding and cloning a folder on a machine (Phase 125, from Phase 90.2).
 *
 * Eight members and two invoke channels. `findProject` reads this project's git
 * remote on this Mac, then asks that machine once for the git folders under its
 * own home directory. `cloneProject` puts this project on that machine, and it
 * happens on a person pressing a button in the create sheet and from nowhere
 * else.
 *
 * MAIN RE-READS THE REMOTE before it clones and refuses when it does not equal
 * the address the sheet drew, so the address that crosses is never one the
 * renderer chose.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */


// ---------------------------------------------------------------------------
// This project's counterpart on another machine (Phase 90.2, items 2 and 3)
// ---------------------------------------------------------------------------
//
// WHAT THIS IS FOR. The create sheet's Directory field names a folder on the
// other computer. Phase 84 gave a person a picker to walk it with. These two
// channels answer the question the picker cannot, which is where THIS project
// already is on that machine. Tortie reads the project's git remote on this
// Mac, asks the machine once for the git folders under its own home directory,
// and fills the field when exactly one folder over there has the same remote.
//
// THE BOUNDARY, AND IT IS THE WHOLE DESIGN. The remote address is read ONCE,
// at create time, to fill one field. The session is then bound to a machine id
// and an absolute path exactly as every other session is. The address is never
// consulted again. It resolves no file, no git read and no search. A shared
// remote is a suggestion about a folder and it is never a claim that the two
// folders hold the same work.
//
// WHAT NEITHER CHANNEL DOES. Neither creates a project, a session or a tab.
// Neither writes anything on this Mac. Nothing about an answer is written to
// disk, so nothing survives a quit. Neither can be reached while Tortie is not
// connected to the machine.

/**
 * The most matching folders one answer carries. 5.
 *
 * CHOSEN, not measured. A person choosing between folders reads a short list,
 * and {@link RemoteProjectFindResult.matchTotal} is what keeps the number
 * honest when the machine reported more than five.
 */
export const REMOTE_PROJECT_MATCH_MAX = 5;

/**
 * What the lookup found, and every one of them is a state with a sentence.
 *
 *  - `found` means exactly one folder on that machine has this remote.
 *  - `several` means two or more do. Nothing is filled in, because they may
 *    hold different work.
 *  - `absent` means the remote is known and no folder over there has it. This
 *    is the one outcome that offers to write.
 *  - `noRemote` means this project has no git remote, so no machine was asked.
 *  - `localRemote` means the remote is a folder on this Mac, which that
 *    machine cannot reach, so no machine was asked.
 *  - `unreachable` means the machine did not answer.
 */
export type RemoteProjectFindOutcome =
  | 'found'
  | 'several'
  | 'absent'
  | 'noRemote'
  | 'localRemote'
  | 'unreachable';

export interface RemoteProjectFindInput {
  readonly machineId: string;
  /** The project folder on this Mac. Main reads its git remote and no more. */
  readonly localPath: string;
}

/** One folder on that machine whose git remote is this project's. */
export interface RemoteProjectMatch {
  /** The absolute path, exactly as the machine reported it. */
  readonly path: string;
}

export interface RemoteProjectFindResult {
  readonly outcome: RemoteProjectFindOutcome;
  /** The origin exactly as this project has it, or null. */
  readonly originUrl: string | null;
  /** The web address Tortie would send to that machine, or null. */
  readonly cloneUrl: string | null;
  /** True when `originUrl` was not already a web address. */
  readonly translated: boolean;
  /**
   * At most {@link REMOTE_PROJECT_MATCH_MAX}. Empty for every outcome except
   * `found` and `several`.
   */
  readonly matches: readonly RemoteProjectMatch[];
  /** How many folders really matched, which can be more than matches.length. */
  readonly matchTotal: number;
  /** How many git folders that machine reported. */
  readonly searched: number;
  /** The default destination for a copy, or null when none can be composed. */
  readonly suggestedPath: string | null;
  /** Main's sentences, in the order to draw them. Never empty. */
  readonly sentences: readonly string[];
  /** How long the machine took, in ms. 0 when no machine was contacted. */
  readonly tookMs: number;
}

/**
 * What the copy did, and every one of them is a state with a sentence.
 *
 *  - `cloned` means the folder is now on that machine.
 *  - `exists` means something was already at that path, so nothing was
 *    written. Tortie never writes into a folder that is already there.
 *  - `existsSame` means something was already at that path and it is a copy of
 *    this same project. That is what a retry after a lost answer looks like.
 *  - `unreachable` means the machine could not reach the address. Nothing was
 *    written.
 *  - `failed` means the machine reached the address and the copy did not
 *    finish. {@link RemoteCloneResult.detail} carries what it reported.
 *  - `timeout` means Tortie stopped waiting. The copy may still be running
 *    over there and part of the project may be left at the path.
 *  - `cutOff` means Tortie was quitting and the copy did not finish. It carries
 *    one of two sentences, because they are two different facts. If the copy had
 *    already started, it may still be running over there and part of the project
 *    may be left at the path. If Tortie refused it before anything crossed,
 *    nothing was sent and nothing was written on that machine. Phase 118 added
 *    it, and the sentence a person actually reads for it is the notice at the
 *    NEXT launch rather than either of these, because the window is closing at
 *    the moment they fire.
 *  - `changed` means this project's remote is no longer the address the sheet
 *    was drawn from, so nothing was sent.
 *  - `refused` means main refused before anything was sent, because the
 *    address is not a web address or the destination is not a full path.
 *  - `offline` means Tortie is not connected to that machine.
 */
export type RemoteCloneOutcome =
  | 'cloned'
  | 'exists'
  | 'existsSame'
  | 'unreachable'
  | 'failed'
  | 'timeout'
  | 'cutOff'
  | 'changed'
  | 'refused'
  | 'offline';

export interface RemoteCloneInput {
  readonly machineId: string;
  /** The project folder on this Mac. Main re-reads its remote from here. */
  readonly localPath: string;
  /**
   * The address the sheet drew.
   *
   * MAIN REFUSES WHEN ITS OWN READ DISAGREES, and that is why the renderer
   * cannot choose what crosses. The address that reaches the machine is always
   * one main read from a repository on this Mac, never one that arrived over
   * this bridge.
   */
  readonly expectUrl: string;
  /** The absolute destination on that machine, as the person left it. */
  readonly path: string;
}

export interface RemoteCloneResult {
  readonly outcome: RemoteCloneOutcome;
  /** The destination, as main understood it. */
  readonly path: string;
  /** The address main sent, or the empty string when it sent nothing. */
  readonly url: string;
  /** What the machine reported when it refused. Empty on every other outcome. */
  readonly detail: string;
  readonly sentences: readonly string[];
  readonly tookMs: number;
}

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesProjectsInvokeChannelMap {
  // PHASE 90.2, item 2. One READ. It reads this project's git remote on this
  // Mac, then asks that machine once for the git folders under its own home
  // directory. It writes nothing on either computer, it keeps nothing on disk,
  // and main refuses it while it is not connected to that machine. A project
  // with no remote contacts no machine at all.
  'machines:findProject': {
    req: [input: RemoteProjectFindInput];
    res: RemoteProjectFindResult;
  };
  // PHASE 90.2, item 3. The SECOND write this product can make on another
  // computer, and the only one this phase adds. It happens on a person
  // pressing a button in the create sheet and from nowhere else. Main re-reads
  // the remote on this Mac and refuses when it does not equal the address the
  // sheet drew, so the address that crosses is never one the renderer chose.
  // The machine checks the destination before it writes, so a path that is
  // already there is never opened, never written into and never removed.
  'machines:cloneProject': {
    req: [input: RemoteCloneInput];
    res: RemoteCloneResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesProjectsApi {
  // Phase 90.2. Where this project already is on that machine, matched on
  // the git remote. It reads and never writes.
  findProject(input: RemoteProjectFindInput): Promise<RemoteProjectFindResult>;
  // Phase 90.2. Puts this project on that machine. It is the second call in
  // this contract that writes on another computer.
  cloneProject(input: RemoteCloneInput): Promise<RemoteCloneResult>;
}
