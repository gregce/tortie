/**
 * The machines contract (Phase 68, M1). Thirteen invoke channels behind ONE
 * optional preload extra, `window.gmux.machines`, plus one event channel for
 * the connection test's own bytes.
 *
 * WHAT THESE ARE FOR. A machine is a configuration row that names a computer
 * Tortie may sign in to as the user. Before Tortie signs in, a person reads what
 * it will run there and agrees to it once, out of band of any agent turn, and
 * the agreement is bound to a hash of the five fields that decide what runs.
 * Change one of those fields and it asks again. Phase 68 shipped four of them
 * and Phase 83 added the accepted tmux version as the fifth.
 *
 * WHAT NO CHANNEL HERE DOES, and this is the point of the list rather than a
 * caveat on it.
 *
 *  - No channel opens a session on a machine. This phase builds no such path.
 *  - No channel starts anything on a file change. `machines:reload` returns rows
 *    and does nothing else.
 *  - No channel writes a passphrase or an ssh config file, on either machine.
 *  - No channel sets a session's status.
 *
 * PHASE 79.1 CHANGED ONE OF THOSE LINES, and the old one is written out above
 * rather than quietly edited. It used to say that no channel writes a key. One
 * now does. `machines:installKey` makes a key for one machine, keeps the
 * private half in Tortie's own data directory, and adds the public half to one
 * file on that machine. It never reads, writes or moves anything under the
 * person's own `~/.ssh` on this Mac. It asks a hash of what the person read
 * before it starts anything, and a hash that is not the one main would compute
 * now refuses and sends nothing.
 *
 * The one process this contract can start is ssh, and it starts on a person
 * pressing a button in Settings. `machines:test` and `machines:installKey` are
 * those buttons. Everything else reads memory, or writes one row and one
 * record.
 *
 * MAIN: src/main/machines/ipc.ts, the one `machines:*` registrar.
 */

import type { MachineColor } from '../machines';
// PHASE 73 BLOCK C. The review's per file letter is the one the diff
// surfaces already speak, so a file on another machine and a file in a
// commit carry the same vocabulary.
import type { GitCommitFileState } from '../types';

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
 * The thirteen channels, and what each one may do.
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
 * | installKey | the block's hash | one key here, one line on that machine | ssh-keygen, then ssh |
 *
 * The four that spawn do so on a person's click and from nowhere else.
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
  // PHASE 71. Reads memory in main and answers. It starts nothing, asks no
  // machine anything, and opens no file. The renderer calls it once at boot and
  // is pushed every change after that on EVT_MACHINE_STATE.
  'machines:state': { req: []; res: MachineStateView[] };
  // PHASE 79.1. The one call that makes a key and puts its public half on one
  // machine. It recomputes the hash the block was drawn from FIRST, and a hash
  // that does not match refuses with nothing started, no key made and nothing
  // sent. It never touches the person's own `~/.ssh` on this Mac.
  'machines:installKey': {
    req: [input: MachineKeyInstallInput];
    res: MachineKeyInstallResult;
  };
  // ---- PHASE 73 BLOCK B ----
  // The ONE write this product can make on another computer. It puts image
  // bytes under that machine's own home directory and answers with the path
  // there, so a prompt on that machine names a file that machine has. It
  // refuses while Tortie is not connected to the machine, it refuses a file
  // whose bytes are not an image, and it refuses a file over the size limit.
  // Running it twice writes one file, because the name is a checksum of the
  // bytes and a file that is already there is never opened for writing.
  'machines:putImage': {
    req: [input: MachineImagePutInput];
    res: MachineImagePlacement[];
  };
  // ---- END PHASE 73 BLOCK B ----
  // ---- PHASE 73 BLOCK C ----
  // Two READS of one folder on one machine, and neither writes anything on
  // either computer. `reviewFiles` asks git which tracked files differ from
  // HEAD. `reviewFile` asks for both sides of one of them. Both refuse when
  // Tortie is not connected to that machine, and both refuse again when the
  // connection changed while the read was in flight, so an answer can never
  // outlive the connection that produced it.
  'machines:reviewFiles': {
    req: [input: MachineReviewInput];
    res: MachineReviewList;
  };
  'machines:reviewFile': {
    req: [input: MachineReviewFileInput];
    res: MachineReviewPair;
  };
  // ---- END PHASE 73 BLOCK C ----
  // PHASE 84. One READ of one folder on one machine, for the folder picker in
  // the create sheet. It lists folders and never files, it writes nothing on
  // either computer, and main refuses it while it is not connected to that
  // machine. A folder it could not read comes back as a refusal with a
  // sentence, never as an exception a surface has to read prose out of.
  'machines:listDir': { req: [input: RemoteDirListInput]; res: RemoteDirListing };
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
    // Phase 83. Records that a person accepted the version one machine reports.
    // It contacts no machine and starts nothing.
    acceptVersion(input: MachineAcceptVersionInput): Promise<MachineRowView>;
    forget(id: string): Promise<MachineRowView>;
    remove(id: string): Promise<MachinesResult>;
    prepare(id: string): Promise<MachinePrepareResult>;
    // Phase 79.1. Makes a key for one machine and puts its public half on it.
    // The password crosses this call and is kept nowhere.
    installKey(input: MachineKeyInstallInput): Promise<MachineKeyInstallResult>;
    onTestEvent(cb: (event: MachineTestEvent) => void): () => void;
    // Phase 71. The link state of every machine, read once at boot and pushed
    // on every change after that.
    state(): Promise<MachineStateView[]>;
    onStateChanged(cb: (states: MachineStateView[]) => void): () => void;
    // ---- PHASE 73 BLOCK B ----
    // Phase 73. Puts image bytes on one machine and answers with the paths
    // there. It is the one call in this contract that writes on another
    // computer.
    putImage(input: MachineImagePutInput): Promise<MachineImagePlacement[]>;
    // ---- END PHASE 73 BLOCK B ----
    // ---- PHASE 73 BLOCK C ----
    // Phase 73. The read only review. Both calls read and neither writes.
    reviewFiles(input: MachineReviewInput): Promise<MachineReviewList>;
    reviewFile(input: MachineReviewFileInput): Promise<MachineReviewPair>;
    // ---- END PHASE 73 BLOCK C ----
    // Phase 84. Reads the folders inside one folder on one machine, for the
    // picker beside the create sheet's Directory field. It reads and never
    // writes.
    listDir(input: RemoteDirListInput): Promise<RemoteDirListing>;
  };
}

// ---- PHASE 73 BLOCK B ----
// Putting image bytes on one machine (Phase 73, M6, item 3).
//
// WHAT THIS IS FOR. Dropping an image on a session that runs on another
// machine used to insert THIS Mac's path into the prompt, and that path names
// nothing on the far side, so the agent there could not read the picture. This
// call carries the bytes to that machine and answers with the path they landed
// at, which is what goes into the prompt instead.
//
// WHAT IT DOES NOT DO. It carries nothing but images: a folder, a text file and
// anything whose leading bytes are not an image are all refused, and the file
// stays on this Mac. It never removes anything on either computer. It writes
// only under `~/.tortie/images` on the machine, in a directory it creates mode
// 0700 with files mode 0600.

/**
 * The largest image this door will carry, in bytes. 90,000.
 *
 * IT IS NOT THE LOCAL DROP LIMIT, and the reason is a limit of the carriage
 * rather than a choice. The bytes travel encoded, inside one command, and that
 * command reaches the far side as ONE argument of that machine's own login
 * shell. Linux caps one argument of one program at 131,072 bytes. Encoding adds
 * a third. So 90,000 bytes of image becomes 120,000 bytes of payload and fits,
 * and 25 MB, which is what a drop on a session on this Mac accepts, does not
 * fit by a factor of about 280.
 *
 * NOT MEASURED ON LINUX. No Linux machine was contacted by the phase that wrote
 * this. The 131,072 is the kernel's own documented constant. The far side in
 * every probe was this Mac, whose limit is 1,048,576 bytes on the whole
 * invocation rather than on one argument.
 *
 * A larger image is refused with a sentence naming this number, and it is
 * refused on this Mac before anything is sent.
 */
export const REMOTE_IMAGE_MAX_BYTES = 90_000;

/** Which images go to which machine, for which session. */
export interface MachineImagePutInput {
  machineId: string;
  /** The session the images are for. It names the files on the far side. */
  sessionId: string;
  /** Absolute paths ON THIS MAC. Every one is read and sniffed before it goes. */
  paths: string[];
}

/** What happened to one image. One of these per path, in the order asked. */
export interface MachineImagePlacement {
  /** The path on this Mac that was read. */
  localPath: string;
  /** The absolute path on the machine, or null when nothing was written. */
  remotePath: string | null;
  /**
   * What the machine reported doing.
   *
   * 'added' means the file was written. 'present' means a file of that name was
   * already there and nothing was written, which is the ordinary answer for the
   * same image sent twice. Null means nothing was written and `refusal` says
   * why.
   */
  outcome: 'added' | 'present' | null;
  /** One sentence when nothing was written. Null when something was. */
  refusal: string | null;
}
// ---- END PHASE 73 BLOCK B ----

// ---- PHASE 73 BLOCK C ----
// The read only review of a folder on one machine (Phase 73, M6, item 4).
//
// WHAT THESE SHAPES ARE FOR. A person with a session on another machine can
// read what changed in that session's folder without leaving Tortie. The two
// answers below fill the diff tab the editor has drawn since Phase 12, through
// the same two fields a commit tab fills. No new surface is drawn for them,
// which was the condition research 51 section 6 put on this item.
//
// WHAT NEITHER OF THEM DOES. Neither writes a byte on either computer. Neither
// reads a working tree on this Mac. Neither can be reached while Tortie is not
// connected to the machine. The git subcommand is inside Tortie's own script
// text on the far side and is never a value either of these carries, so no
// caller can turn a review into a commit.

/** Which folder on which machine a review is about. */
export interface MachineReviewInput {
  machineId: string;
  /** The folder ON THAT MACHINE. It is never a path on this Mac. */
  cwd: string;
}

/** One changed file in a review. */
export interface MachineReviewFile {
  /** Repository relative path, being the NEW path for a rename. */
  path: string;
  /** The pre-rename path, or null for the ordinary case. */
  origPath: string | null;
  /** The letter git printed, reused as the existing GitCommitFileState. */
  status: GitCommitFileState;
}

/** What one repository on one machine has changed since its last commit. */
export interface MachineReviewList {
  machineId: string;
  /** The machine's own label, so a surface never composes one. */
  machineLabel: string;
  /** The repository root THAT MACHINE reported. Empty when there is none. */
  repoPath: string;
  files: MachineReviewFile[];
  /** How many changed files there were, when only the first ones are listed. */
  total: number;
  /** One sentence when there is nothing to show. Null when there is. */
  note: string | null;
}

/** Which file on which machine both sides are wanted for. */
export interface MachineReviewFileInput {
  machineId: string;
  /** The repository root, as `machines:reviewFiles` reported it. */
  repoPath: string;
  /** Repository relative path. */
  path: string;
  /** The pre-rename path, or null. A rename is read at both paths. */
  origPath: string | null;
}

/** Both sides of one file on one machine. */
export interface MachineReviewPair {
  /** The HEAD copy. Empty when the file is not in the last commit. */
  oldContents: string;
  /** The working copy. Empty when the file was deleted. */
  newContents: string;
  /** True when either side holds a zero byte in its first 8 KB. */
  binary: boolean;
  /** True when a side was cut at the cap. */
  truncated: boolean;
  /** The sentence for a side that was cut, or null. */
  note: string | null;
}
// ---- END PHASE 73 BLOCK C ----

// ---------------------------------------------------------------------------
// The folder picker for another machine (Phase 84, item 6)
// ---------------------------------------------------------------------------
//
// WHAT THIS IS FOR. The create sheet's Directory field names a folder on the
// other computer. Until this phase a person had to know that path by heart and
// type it, because the picker beside the field walks THIS Mac's disk and a
// path chosen here names nothing over there. This one channel lets Tortie draw
// a picker for the machine itself.
//
// WHAT IT DOES NOT DO. It lists folders and never files, so it is a folder
// chooser and not a file browser. It writes nothing on either computer. It
// carries no file contents. It cannot be reached while Tortie is not connected
// to the machine.

/**
 * The most entries one listing carries. 500.
 *
 * CHOSEN, not measured. No load test set it. It is here so a home directory
 * holding thousands of folders cannot make one answer megabytes long, and
 * {@link RemoteDirListing.total} is what keeps the number honest on screen.
 */
export const REMOTE_DIR_LIST_MAX = 500;

/** One folder inside a folder on another machine. */
export interface RemoteDirEntry {
  /** The entry's own name. It holds no path and no slash. */
  name: string;
}

export interface RemoteDirListInput {
  machineId: string;
  /**
   * The absolute path to read. An empty string means that machine's own home
   * directory, which the machine itself resolves. Tortie composes no home path
   * for another computer.
   */
  path: string;
}

/** Why a folder could not be listed. Null when it was. */
export type RemoteDirRefusal = 'missing' | 'notdir' | 'denied' | 'unreachable';

export interface RemoteDirListing {
  /** The absolute path that was read, as the machine reported it. */
  path: string;
  /** The parent of `path`, or null when `path` is the root. */
  parent: string | null;
  /** The folders inside it, sorted, at most REMOTE_DIR_LIST_MAX of them. */
  entries: RemoteDirEntry[];
  /** How many folders are really in there. Never smaller than entries.length. */
  total: number;
  /** Null when the folder was read. */
  refusal: RemoteDirRefusal | null;
  /**
   * Main's own sentence for the refusal, or null.
   *
   * THE PICKER DOES NOT DRAW IT, and that is deliberate rather than an
   * oversight. The three answers a machine gives about a folder are fixed, so
   * their sentences live in src/renderer/app/machine-copy.ts where the
   * vocabulary audit reads them, and `unreachable` is composed on this side
   * because main never sends it. The field is here for a surface that has no
   * copy of its own and for a log line that wants one string.
   */
  refusalText: string | null;
}
