/**
 * The machines contract (Phase 68, M1). Ten invoke channels behind ONE optional
 * preload extra, `window.gmux.machines`, plus one event channel for the
 * connection test's own bytes.
 *
 * WHAT THESE ARE FOR. A machine is a configuration row that names a computer
 * Tortie may sign in to as the user. Before Tortie signs in, a person reads what
 * it will run there and agrees to it once, out of band of any agent turn, and
 * the agreement is bound to a hash of the four fields that decide what runs.
 * Change one of those fields and it asks again.
 *
 * WHAT NO CHANNEL HERE DOES, and this is the point of the list rather than a
 * caveat on it.
 *
 *  - No channel opens a session on a machine. This phase builds no such path.
 *  - No channel starts anything on a file change. `machines:reload` returns rows
 *    and does nothing else.
 *  - No channel writes a key, a passphrase, a known_hosts entry or an ssh config
 *    file, on either machine, ever.
 *  - No channel sets a session's status.
 *
 * The one process this contract can start is ssh, and it starts on a person
 * pressing a button in Settings. `machines:test` is that button. Everything else
 * reads memory, or writes one row and one record.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type { MachineColor } from '../machines';

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

/**
 * The four states a machine row can be in, and they are the four the agent
 * confirm gate has, for the same four reasons.
 *
 *  - `confirmed` means the hash on record is the hash of the row as it is now.
 *  - `never` means nothing is on record for this row.
 *  - `changed` means something is on record and an execution bearing field moved.
 *  - `unknown` means the seal could not be read, so the answer is not known yet.
 */
export type MachineConfirmState = 'confirmed' | 'never' | 'changed' | 'unknown';

/** One machine, as the Settings list draws it. */
export interface MachineRowView {
  id: string;
  /** The row's label, or the host when it has none. */
  label: string;
  color: MachineColor;
  host: string;
  user: string | null;
  port: number | null;
  remoteTmuxPath: string | null;
  state: MachineConfirmState;
  /** True only when state is 'confirmed'. */
  usable: boolean;
  /** The hash of the execution bearing fields as the file has them now. */
  hash: string;
  /** The hash on record. Null when nothing is. */
  confirmedHash: string | null;
  confirmedAt: number | null;
  /** The lines the person read when they agreed. Empty when they never did. */
  confirmedLines: string[];
  /** The lines this row would show now. */
  lines: string[];
  /** One sentence saying why it cannot be used. Null when it can. */
  refusal: string | null;
  /** MACHINE_CONFIRM_WARNING, carried so the sheet cannot omit it. */
  warning: string;
}

/** Everything the Machines section needs in one read. */
export interface MachinesResult {
  rows: MachineRowView[];
  /**
   * Rows that were dropped whole because a field did not validate, each naming
   * the field and the reason. Never a partial merge and never a silent drop.
   */
  errors: { id: string; field: string; reason: string }[];
  /** Absolute path of the configuration directory. */
  directory: string;
  /** Absolute path of machines.json. */
  path: string;
  /** True when the file was there and could be read. */
  present: boolean;
  /** MACHINE_PATH_HONESTY, carried so no surface can omit or reword it. */
  honesty: string;
  /** MACHINE_CONFIRM_WARNING, carried for the same reason. */
  warning: string;
  /** The ssh client this build will run, and where the path came from. */
  ssh: { path: string | null; source: 'pinned' | 'dev-override' | 'missing' };
}

// ---------------------------------------------------------------------------
// The tailnet picker
// ---------------------------------------------------------------------------

/** One machine the Tailscale program on this Mac reported. */
export interface TailscalePeerView {
  /** The address a machine row would carry. */
  host: string;
  /** The short name Tailscale shows. */
  name: string;
  os: string;
  online: boolean;
  /** True for the Mac Tortie is running on. */
  isThisMac: boolean;
  /** True when machines.json already holds a row with this address. */
  alreadyAdded: boolean;
}

/** What the picker read, and where it read it from. */
export interface TailscaleSourceResult {
  /** The absolute path Tortie ran, shown on screen. Null when none was found. */
  binary: string | null;
  source: 'pinned' | 'dev-override' | 'missing';
  peers: TailscalePeerView[];
  /** One plain sentence when the read failed or listed nothing. Null on success. */
  note: string | null;
}

// ---------------------------------------------------------------------------
// The connection test
// ---------------------------------------------------------------------------

/** The values a draft test runs against, straight from the form. */
export interface MachineDraft {
  host: string;
  user: string | null;
  port: number | null;
  remoteTmuxPath: string | null;
  /**
   * The id the person has typed into the form, when they have typed one.
   *
   * It is optional because a test can be run before the person has named the
   * machine. When it IS set, and the test succeeds, main composes the confirm
   * sheet for exactly that id and returns it on {@link MachineTestOutcome.sheet}.
   *
   * WHY THIS FIELD EXISTS, stated so it is not removed as clutter. The confirm
   * hash covers the id and the four execution bearing fields, and one of those
   * four is the program path, which is not known until the connection test has
   * finished. So the hash a person's agreement binds to cannot exist before the
   * test ends, and there is no other point in the flow where main could hand it
   * over. Without this the Add Machine sheet has no hash to send back and every
   * add refuses.
   */
  id?: string;
}

/**
 * What a person reads before they agree, composed in main.
 *
 * `lines` is exactly the hashed facts. The pinned ssh path and the honesty line
 * are shown beside them and are deliberately not in this list, because this
 * list is what the record says a person agreed to and it must not carry
 * anything the hash does not cover.
 */
export interface MachineConfirmSheet {
  /** The hash the agreement will be bound to. Send it back as `hashRead`. */
  hash: string;
  /** Exactly the hashed facts, in order. Send them back as `linesRead`. */
  lines: string[];
  /** MACHINE_CONFIRM_WARNING, carried so the sheet cannot omit it. */
  warning: string;
}

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

/** What the test concluded. One class, one piece of copy, one alarm flag. */
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
  | 'unknown';

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
}

// ---------------------------------------------------------------------------
// Adding and confirming
// ---------------------------------------------------------------------------

/** What the renderer sends when a person presses Add this machine and confirm it. */
export interface MachineAddInput {
  id: string;
  label: string;
  color: MachineColor;
  host: string;
  user: string | null;
  port: number | null;
  /** The absolute path the connection test resolved. Required. */
  remoteTmuxPath: string;
  /** The hash the sheet was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the sheet. Recorded verbatim. */
  linesRead: string[];
}

/** What the renderer sends when a person confirms a row that already exists. */
export interface MachineConfirmInput {
  id: string;
  /** The hash the sheet was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the sheet. Recorded verbatim. */
  linesRead: string[];
}

// ---------------------------------------------------------------------------
// The channels
// ---------------------------------------------------------------------------

/**
 * The ten channels, and what each one may do.
 *
 * | Channel | Reads | Writes | Spawns |
 * | --- | --- | --- | --- |
 * | rows | memory in main, plus the sealed record | nothing | nothing |
 * | reload | machines.json and the record | nothing | nothing |
 * | tailscaleNames | the tailnet state | nothing | the pinned Tailscale program |
 * | test | the form or one row | nothing | one ssh |
 * | testInput | nothing | the live pty | nothing |
 * | testCancel | nothing | nothing | nothing |
 * | add | the sheet's hash | machines.json and one record | nothing |
 * | confirm | the row | one record | nothing |
 * | forget | nothing | one record removed | nothing |
 * | remove | nothing | machines.json and one record removed | nothing |
 *
 * The two that spawn do so on a person's click and from nowhere else.
 */
export interface MachinesInvokeChannelMap {
  'machines:rows': { req: []; res: MachinesResult };
  'machines:reload': { req: []; res: MachinesResult };
  'machines:tailscaleNames': { req: []; res: TailscaleSourceResult };
  'machines:test': { req: [input: MachineTestInput]; res: MachineTestStarted };
  'machines:testInput': {
    req: [input: { testId: string; data: string }];
    res: void;
  };
  'machines:testCancel': { req: [testId: string]; res: void };
  'machines:add': { req: [input: MachineAddInput]; res: MachineRowView };
  'machines:confirm': { req: [input: MachineConfirmInput]; res: MachineRowView };
  'machines:forget': { req: [id: string]; res: MachineRowView };
  'machines:remove': { req: [id: string]; res: MachinesResult };
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
 * OPTIONAL extra on window.gmux, feature-detected the way `config` is.
 *
 * A build without it shows no Machines section, which is the ordinary case for
 * a person who has no other machine.
 */
export interface GmuxMachinesExtras {
  machines?: {
    rows(): Promise<MachinesResult>;
    reload(): Promise<MachinesResult>;
    tailscaleNames(): Promise<TailscaleSourceResult>;
    test(input: MachineTestInput): Promise<MachineTestStarted>;
    testInput(input: { testId: string; data: string }): Promise<void>;
    testCancel(testId: string): Promise<void>;
    add(input: MachineAddInput): Promise<MachineRowView>;
    confirm(input: MachineConfirmInput): Promise<MachineRowView>;
    forget(id: string): Promise<MachineRowView>;
    remove(id: string): Promise<MachinesResult>;
    onTestEvent(cb: (event: MachineTestEvent) => void): () => void;
  };
}
