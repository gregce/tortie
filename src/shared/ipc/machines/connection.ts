/**
 * The connection test and the key install (Phase 125, from Phase 68 and Phase
 * 79.1).
 *
 * Ten members, four invoke channels and one event channel. These are the two
 * buttons in Settings that start a process. Everything else in the machines
 * contract reads memory, or writes one row and one record.
 *
 * `machines:installKey` makes a key for one machine, keeps the private half in
 * Tortie's own data directory, and adds the public half to one file on that
 * machine. It never reads, writes or moves anything under the person's own
 * `~/.ssh` on this Mac. It asks a hash of what the person read before it starts
 * anything, and a hash that is not the one main would compute now refuses and
 * sends nothing.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type {
  MachineConfirmSheet,
  MachineDraft
} from './rows';

/**
 * Which values a test runs against, and it decides where the gate sits.
 *
 *  - `draft` is the Add Machine form. There is no row and no confirmation, so
 *    the gate is not consulted and must not be. The values are the person's own
 *    keystrokes on their own screen.
 *  - `saved` is a row in machines.json. That path asks the gate first, and an
 *    unconfirmed row refuses before anything is started.
 */
export type MachineTestInput =
  | { mode: 'draft'; draft: MachineDraft }
  | { mode: 'saved'; id: string };

/** What main answers when a test starts. */
export interface MachineTestStarted {
  testId: string;
  /** The exact command line Tortie is about to run, for the transcript header. */
  commandLine: string;
  /** The ssh client this run uses. */
  sshPath: string;
}

/**
 * What a connection test or a prepare concluded. One class, one piece of copy,
 * one alarm flag.
 *
 * Phase 69 added three. `no-server` is a machine that answered and has
 * nothing of Tortie's running on it, which research 51 section 4.4 requires be
 * told apart from `refused`. `version-unmeasured` is a machine running a version
 * Tortie has not measured. `prepared` is the success answer of Prepare.
 *
 * Phase 79.1 added two. `key-installed` says the public half of Tortie's key
 * for that machine is now on it. It is not a claim that the machine is usable,
 * and the surface says so by starting the real connection test straight after
 * it, so the answer a person ends on is the machine's own.
 *
 * `password-required` is a machine that answered and asked for a password.
 * It was added in the fix round, because a Mac with Remote Login on and no key
 * for Tortie on it is exactly the machine this phase is for, and until then
 * that machine produced no class at all: the client sat at its own password
 * question until the test ran out of time, and the person was told the machine
 * was answering too slowly. It answered in milliseconds. This class is decided
 * while the client is still running, and Tortie stops it there.
 */
export type MachineTestClass =
  | 'ok'
  | 'host-key-changed'
  | 'unreachable'
  | 'refused'
  | 'not-resolved'
  | 'auth-refused'
  | 'no-program'
  | 'client-missing'
  | 'cancelled'
  | 'timed-out'
  | 'unknown'
  | 'no-server'
  | 'version-unmeasured'
  | 'prepared'
  | 'key-installed'
  | 'password-required';

/**
 * The outcome, composed in main.
 *
 * The renderer never writes any of these sentences. They arrive on this object,
 * so the one alarming case cannot be drawn calmly by a later edit to a renderer
 * file.
 */
export interface MachineTestOutcome {
  testId: string;
  class: MachineTestClass;
  /** True for exactly one class, being `host-key-changed`. */
  alarm: boolean;
  headline: string;
  detail: string;
  /** The absolute path the machine reported. Null unless class is 'ok'. */
  resolvedPath: string | null;
  exitCode: number | null;
  durationMs: number;
  /**
   * The sheet a person reads before they agree, for the machine this test was
   * about.
   *
   * Null unless the class is `ok` AND the draft carried an id, because the hash
   * covers the id and the program path and neither is known before then. Send
   * `sheet.hash` back as `hashRead` and `sheet.lines` back as `linesRead`.
   *
   * It is optional as well as nullable so that a surface written against the
   * ten channel contract alone still compiles. A surface that does not read it
   * cannot add a machine, because `machines:add` refuses a hash that is not the
   * one main would compute, and that is the safe direction.
   */
  sheet?: MachineConfirmSheet | null;
  /**
   * PHASE 79.1. The block that offers to make a key and put it on this machine.
   *
   * Null unless the class is `password-required`, `auth-refused` or `refused`
   * AND the test carried an id, because the hash covers the id and there is
   * nothing to agree to without one. Those three classes and no others,
   * because they are the three answers a key can do something about: a machine
   * that asked for a password, a machine that would not let Tortie in, and a
   * machine that answered and declined the connection.
   *
   * Optional as well as nullable, so a surface written against the older
   * contract still compiles. A surface that does not read it cannot install a
   * key, because `machines:installKey` refuses a hash that is not the one main
   * would compute, and that is the safe direction.
   */
  keySheet?: MachineKeySheet | null;
}

/** The one event channel: the connection test's own bytes and its end. */
export const EVT_MACHINE_TEST = 'machines:testEvent';

/**
 * One push from a running test.
 *
 * `output` carries program bytes with ANSI control sequences already removed.
 * `end` carries the outcome and is the last event for that test id.
 */
export type MachineTestEvent =
  | { testId: string; kind: 'output'; text: string }
  | { testId: string; kind: 'end'; outcome: MachineTestOutcome };

export interface MachineTestEventPayloadMap {
  [EVT_MACHINE_TEST]: [event: MachineTestEvent];
}

/**
 * What a person reads before Tortie makes a key and puts it on a machine
 * (Phase 79.1).
 *
 * It is a SECOND agreement with a SECOND hash, and it is deliberately not the
 * machine's own. The machine hash covers the five fields that decide what runs
 * there, and putting a key on a machine changes none of them. This hash covers
 * the machine id, the address, the account name, the port, the file that will
 * be written on that machine, and the absolute path the private half will be
 * kept at on this Mac. `remoteTmuxPath` is not on it, because a machine that
 * has never let Tortie in has no program path yet, which is the case this whole
 * surface exists for.
 *
 * Nothing standing is granted, so nothing is written to the sealed record. The
 * gate is the hash comparison inside `machines:installKey`, which refuses a
 * sheet that went stale and sends nothing.
 */
export interface MachineKeySheet {
  /** The hash the install is bound to. Send it back as `hashRead`. */
  hash: string;
  /** Exactly the hashed facts, in order. Send them back as `linesRead`. */
  lines: string[];
  /** What Tortie is about to do, in one paragraph composed in main. */
  warning: string;
  /** Five more paragraphs, each drawn on its own and unchanged. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Making a key and putting it on a machine (Phase 79.1)
// ---------------------------------------------------------------------------

/**
 * What the renderer sends when a person presses the one button on the key
 * block.
 *
 * The target is the same shape a connection test takes, so the Add a machine
 * form and a saved row reach this through one call rather than two. A saved
 * target does NOT go through the machine confirm gate, and the reason is in
 * `src/main/machines/ipc.ts`: a machine that has never authenticated cannot
 * have a program path, so it cannot be confirmed, so asking for a confirmation
 * would make this surface unreachable for exactly the person it is for. What
 * stands in its place is this call's own hash, which is stronger for this act
 * because it names the file that will be written.
 */
export interface MachineKeyInstallInput {
  target: MachineTestInput;
  /** The hash the block was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the block. Main refuses a set that is not its own. */
  linesRead: string[];
  /**
   * That machine's password, sent once and kept nowhere.
   *
   * It crosses this one call, is written to the sign in program on the one
   * prompt, and is dropped when the call ends. Nothing writes it to a file,
   * nothing puts it in the keychain, and every occurrence of it is replaced in
   * the transcript before that text comes back.
   */
  password: string;
}

/** What one install concluded, composed in main. */
export interface MachineKeyInstallResult {
  id: string;
  class: MachineTestClass;
  /** True for exactly one class, being `host-key-changed`. */
  alarm: boolean;
  headline: string;
  detail: string;
  /**
   * What the machine reported doing to the file.
   *
   * 'added' means it gained one line. 'present' means the exact line was
   * already there and nothing was written. Null means the machine reported
   * nothing, which is not the same as reporting that it did nothing.
   */
  wrote: 'added' | 'present' | null;
  /** True when this call made a new key, false when it used the one already there. */
  keyMade: boolean;
  /** The fingerprint of the public half, or null when there is no key to name. */
  fingerprint: string | null;
  /** The bytes the program printed, ANSI stripped and the password replaced. */
  transcript: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesConnectionInvokeChannelMap {
  'machines:test': { req: [input: MachineTestInput]; res: MachineTestStarted };
  'machines:testInput': {
    req: [input: { testId: string; data: string }];
    res: void;
  };
  'machines:testCancel': { req: [testId: string]; res: void };
  // PHASE 79.1. The one call that makes a key and puts its public half on one
  // machine. It recomputes the hash the block was drawn from FIRST, and a hash
  // that does not match refuses with nothing started, no key made and nothing
  // sent. It never touches the person's own `~/.ssh` on this Mac.
  'machines:installKey': {
    req: [input: MachineKeyInstallInput];
    res: MachineKeyInstallResult;
  };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesConnectionApi {
  test(input: MachineTestInput): Promise<MachineTestStarted>;
  testInput(input: { testId: string; data: string }): Promise<void>;
  testCancel(testId: string): Promise<void>;
  // Phase 79.1. Makes a key for one machine and puts its public half on it.
  // The password crosses this call and is kept nowhere.
  installKey(input: MachineKeyInstallInput): Promise<MachineKeyInstallResult>;
  onTestEvent(cb: (event: MachineTestEvent) => void): () => void;
}
