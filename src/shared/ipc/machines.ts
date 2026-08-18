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
  /**
   * APPENDED (Phase 72): how many sessions Tortie holds a record of on this
   * machine.
   *
   * The removal question counts them out loud, because removing a machine
   * turns every one of those records into a record of what Tortie last knew,
   * and a person deciding whether to press the button needs the number. It is
   * a count of manifest rows on this Mac. It is never a question asked of the
   * machine, so it is answered the same whether the machine is reachable or
   * not.
   *
   * Optional, and absent reads as 0. Main sets it on every row it composes.
   * The field is optional so that a fixture written before it existed is still
   * a valid row, which is the same rule every other appended field in this
   * contract follows.
   */
  sessions?: number;
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

/**
 * What a connection test or a prepare concluded. One class, one piece of copy,
 * one alarm flag.
 *
 * Phase 69 added the last three. `no-server` is a machine that answered and has
 * nothing of Tortie's running on it, which research 51 section 4.4 requires be
 * told apart from `refused`. `version-unmeasured` is a machine running a version
 * Tortie has not measured. `prepared` is the success answer of Prepare.
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
  | 'prepared';

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
// Prepare this machine (Phase 69, M2)
// ---------------------------------------------------------------------------

/** One setting Tortie asserted on a machine, and what the machine answered. */
export interface MachinePreparedOption {
  name: string;
  /** The value Tortie asked for. */
  wanted: string;
  /** The value the machine reported afterwards. */
  observed: string;
  agrees: boolean;
}

/**
 * What Prepare concluded, composed in main.
 *
 * Every sentence on it comes from main for the reason the connection test's do:
 * a later edit to a renderer file must not be able to draw a refusal as a
 * success, and only main holds both version numbers.
 */
export interface MachinePrepareResult {
  id: string;
  /** 'prepared' on success, 'version-unmeasured' on a refusal, or a failure class. */
  class: MachineTestClass;
  /** True for exactly one class, being `host-key-changed`. */
  alarm: boolean;
  headline: string;
  detail: string;
  /** The version the machine reported, or null when it would not say. */
  version: string | null;
  /** The versions Tortie has measured, for the refusal surface. */
  supported: string[];
  /** True when this call created the server rather than finding it. */
  serverBorn: boolean;
  /** Every setting, wanted against observed. Empty when nothing was asserted. */
  options: MachinePreparedOption[];
  /** True when the machine's program search list was read for this connection. */
  pathCaptured: boolean;
  durationMs: number;
}

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
}

/**
 * The one event channel this state arrives on after the first read.
 *
 * It carries the whole list every time. The list is at most as long as the
 * machines file, which a person maintains by hand, so there is nothing to gain
 * from a per machine push and one shape is one shape to reason about.
 */
export const EVT_MACHINE_STATE = 'machines:stateChanged';

export interface MachinesEventPayloadMap {
  [EVT_MACHINE_STATE]: [states: MachineStateView[]];
}

// ---------------------------------------------------------------------------
// The channels
// ---------------------------------------------------------------------------

/**
 * The twelve channels, and what each one may do.
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
 * | prepare | one row and the sealed record | settings on that machine | ssh |
 * | state | memory in main | nothing | nothing |
 *
 * The three that spawn do so on a person's click and from nowhere else.
 *
 * `machines:prepare` is Phase 69's one new channel, and it is the first thing
 * Tortie ever STARTS on another machine. It asks the confirm gate before it
 * spawns anything, it reads the version before it starts a server, and it refuses
 * a version nobody measured. It opens no session, because this release has no
 * path that could.
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
  'machines:prepare': { req: [id: string]; res: MachinePrepareResult };
  // PHASE 71. Reads memory in main and answers. It starts nothing, asks no
  // machine anything, and opens no file. The renderer calls it once at boot and
  // is pushed every change after that on EVT_MACHINE_STATE.
  'machines:state': { req: []; res: MachineStateView[] };
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
    prepare(id: string): Promise<MachinePrepareResult>;
    onTestEvent(cb: (event: MachineTestEvent) => void): () => void;
    // Phase 71. The link state of every machine, read once at boot and pushed
    // on every change after that.
    state(): Promise<MachineStateView[]>;
    onStateChanged(cb: (states: MachineStateView[]) => void): () => void;
  };
}
