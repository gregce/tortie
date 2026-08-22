/**
 * A machine as a CONFIGURATION ROW a person confirms (Phase 125, from Phase 68).
 *
 * Twelve members and nine invoke channels. A machine is a row that names a
 * computer Tortie may sign in to as the user. Before Tortie signs in, a person
 * reads what it will run there and agrees to it once, out of band of any agent
 * turn, and the agreement is bound to a hash of the six fields that decide what
 * runs. Change one of those fields and it asks again.
 *
 * NOTHING HERE CONTACTS A MACHINE except `machines:prepare`, which is Phase
 * 69's one channel and the first thing Tortie ever STARTS on another computer.
 * It asks the confirm gate before it spawns anything, it reads the version
 * before it starts a server, and it refuses a version nobody measured.
 *
 * ONE DOOR. Nothing outside src/shared/ipc/ imports this file. The barrel is
 * src/shared/ipc/machines.ts and src/shared/ipc/index.ts re-exports that. The
 * FACADE_ONLY rule in build/assert-import-boundaries.mjs fails a second door.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type { MachineColor } from '../../machines';
// A machine that prepare could not reach failed in one of the ways a
// connection test fails, so both answers speak one vocabulary. This is an
// `import type` and connection.ts takes two row types back, so the two files
// reference each other in the type graph and neither is a runtime edge.
import type { MachineTestClass } from './connection';

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
  /**
   * APPENDED (Phase 83): the version a person accepted for this machine, or
   * null when they accepted none.
   *
   * The row draws it so a person can see what they accepted and withdraw it.
   * It is one of the fields the confirm hash covers, so it appears in `lines`
   * as well when it is set.
   *
   * Optional, and absent reads as null. Main sets it on every row it composes.
   * The field is optional so that a fixture written before it existed is still
   * a valid row, which is the rule every other appended field in this contract
   * follows.
   */
  acceptedTmuxVersion?: string | null;
  /**
   * APPENDED (Phase 84): true when Tortie has signed in to this machine in
   * this run and read its list of places it looks for programs.
   *
   * It is exactly the condition `readyRemoteContext` tests, asked in main so
   * the create sheet does not have to guess. A person used to pick a machine,
   * type a name, press Create and read a refusal that sent them back to the
   * screen that had just refused them.
   *
   * IT IS NOT `usable`, AND THE TWO MUST NOT BE MERGED. `usable` says a person
   * confirmed this machine, and Settings reads it to decide whether the Prepare
   * button is offered at all. A confirmed machine that is asleep has to keep
   * offering Prepare, because Prepare is the one button that fixes it.
   *
   * Optional, and absent reads as false, which is what a row composed before
   * this field existed knew about itself. That is the rule every other appended
   * field in this contract follows.
   */
  ready?: boolean;
  /**
   * APPENDED (Phase 84): the file name of the key Tortie made for this machine,
   * or null when Tortie has made none.
   *
   * It is the LEAF and never the path. The row already draws the whole path
   * where a person needs it, and a renderer that composed the path itself could
   * name a file main does not write to.
   *
   * THREE STATES, NOT TWO. A string means the key pair is on this Mac and
   * Tortie names it on every command it sends to that machine. Null means there
   * is no such key and every sign in uses whatever key the person loaded
   * themselves. ABSENT means main did not answer the question, and the row then
   * draws neither sentence rather than guessing at one of them.
   */
  keyFile?: string | null;
  /**
   * APPENDED (Phase 101): the one folder on this machine under which Tortie
   * may replace a file, or null when a person has named none.
   *
   * The row draws it so a person can see what they granted and withdraw it. It
   * is one of the fields the confirm hash covers, so it appears in `lines` as
   * well when it is set.
   *
   * Optional, and absent reads as null. Main sets it on every row it composes.
   */
  writeRoot?: string | null;
  /**
   * APPENDED (Phase 101): MACHINE_WRITE_HONESTY when this row carries a write
   * root, and null when it does not.
   *
   * It is composed in main by `writeHonestyOf`, so no renderer decides the
   * question by reading a line. Every sheet drawing site draws it when it is
   * not null and draws nothing when it is null.
   *
   * Optional, and absent reads as null.
   */
  writeHonesty?: string | null;
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

// The connection test
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
   * hash covers the id and the five execution bearing fields, and one of those
   * five is the program path, which is not known until the connection test has
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
  /**
   * PHASE 101. MACHINE_WRITE_HONESTY when this sheet's lines carry the write
   * root line, and null when they do not.
   *
   * A sheet that grants file replacement cannot be drawn without the paragraph
   * that says what replacement costs. Main answers the question, so no sheet
   * drawing site has to remember the rule and none of them can forget it.
   */
  writeHonesty: string | null;
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

/**
 * What the renderer sends when a person accepts the version a machine reports
 * (Phase 83).
 *
 * It is the same shape a confirmation takes, with the version added, because it
 * IS a confirmation: main writes the field into the row and records the
 * agreement in one call, over the sheet the person read. A stale hash refuses
 * and writes nothing.
 */
export interface MachineAcceptVersionInput {
  id: string;
  /** The exact version string the machine reported, from the Prepare result. */
  version: string;
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
  /**
   * APPENDED (Phase 83): the sheet a person reads to accept the version this
   * machine reports.
   *
   * Set only when the class is `version-unmeasured` and the machine named a
   * version. A machine that would not name one has nothing to accept, and a
   * machine Tortie has measured needs no acceptance. Null on every other
   * outcome.
   *
   * Optional, so a fixture written against the older contract is still valid.
   */
  acceptSheet?: MachineConfirmSheet | null;
}

// ---------------------------------------------------------------------------
// The channels this family declares
// ---------------------------------------------------------------------------

export interface MachinesRowsInvokeChannelMap {
  'machines:rows': { req: []; res: MachinesResult };
  'machines:reload': { req: []; res: MachinesResult };
  'machines:tailscaleNames': { req: []; res: TailscaleSourceResult };
  'machines:add': { req: [input: MachineAddInput]; res: MachineRowView };
  'machines:confirm': { req: [input: MachineConfirmInput]; res: MachineRowView };
  // PHASE 83. Writes the accepted version into the row and records the
  // agreement in one call, over the sheet the person read. A stale hash refuses
  // before either write, and nothing is started on any machine by this call.
  'machines:acceptVersion': {
    req: [input: MachineAcceptVersionInput];
    res: MachineRowView;
  };
  'machines:forget': { req: [id: string]; res: MachineRowView };
  'machines:remove': { req: [id: string]; res: MachinesResult };
  'machines:prepare': { req: [id: string]; res: MachinePrepareResult };
}

// ---------------------------------------------------------------------------
// The bridge methods this family declares
// ---------------------------------------------------------------------------

export interface MachinesRowsApi {
  rows(): Promise<MachinesResult>;
  reload(): Promise<MachinesResult>;
  tailscaleNames(): Promise<TailscaleSourceResult>;
  add(input: MachineAddInput): Promise<MachineRowView>;
  confirm(input: MachineConfirmInput): Promise<MachineRowView>;
  // Phase 83. Records that a person accepted the version one machine reports.
  // It contacts no machine and starts nothing.
  acceptVersion(input: MachineAcceptVersionInput): Promise<MachineRowView>;
  forget(id: string): Promise<MachineRowView>;
  remove(id: string): Promise<MachinesResult>;
  prepare(id: string): Promise<MachinePrepareResult>;
}
