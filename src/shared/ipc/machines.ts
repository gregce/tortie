/**
 * The machines contract (Phase 68, M1). Thirty two invoke channels behind ONE
 * optional preload extra, `window.gmux.machines`, plus two event channels, one
 * for the connection test's own bytes and one for the link state.
 *
 * THIS COUNT HAD GONE STALE and Phase 108 says so rather than quietly fixing
 * it: this line read twenty four while the map below held twenty seven. The
 * per phase count lines above the channel table are the ones each phase moves,
 * and this line now agrees with them at twenty eight.
 *
 * WHAT THESE ARE FOR. A machine is a configuration row that names a computer
 * Tortie may sign in to as the user. Before Tortie signs in, a person reads what
 * it will run there and agrees to it once, out of band of any agent turn, and
 * the agreement is bound to a hash of the six fields that decide what runs.
 * Change one of those fields and it asks again. Phase 68 shipped four of them,
 * Phase 83 added the accepted tmux version as the fifth, and Phase 101 added
 * the folder Tortie may save under as the sixth.
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
// PHASE 108. The configuration read from another machine is the same scan
// result the local Context panel already draws, so one set of renderer code
// draws both and no remote-only precedence shape can exist. Two declarations
// of one shape is how the two ends of a channel drift apart.
import type { ContextScanResult } from '../context';
// PHASE 73 BLOCK C. The review's per file letter is the one the diff
// surfaces already speak, so a file on another machine and a file in a
// commit carry the same vocabulary.
import type { GitCommitFileState } from '../types';
// PHASE 103. The porcelain's two characters, carried through so the remote
// list can tell a staged file from an unstaged one. `letterOf` in
// `src/main/machines/remote-review.ts` folds the pair into one letter for the
// badge, and until this phase that fold was the only thing that reached the
// renderer, so the panel could not draw a Staged group at all.
import type { GitFileState } from '../types';
// PHASE 107. A commit read from another machine is the row the local History
// already draws, so the swimlane picture is laid out by one set of code for
// both. Two declarations of one shape is how the two ends of a channel drift
// apart.
import type { GitGraphLogEntry } from '../types';
// PHASE 98. A search on another machine returns the rows the search on this Mac
// already returns, so the Search view draws ONE kind of row. Two declarations of
// one shape is how the two ends of a channel drift apart.
import type { SearchFileResult } from './search';
// PHASE 105. The runs for a branch checked out on another machine are the rows
// the local Runs section already draws, for the same reason. `src/shared/ipc/
// actions.ts` imports these three from the same place.
import type {
  ActionsHealth,
  ActionsParseIssue,
  ActionsRun
} from '../actions';

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
// The channels
// ---------------------------------------------------------------------------

/**
 * The twenty six channels, and what each one may do.
 *
 * THE COUNT USED TO SAY THIRTEEN and the table listed thirteen rows, which was
 * true when Phase 68 wrote it. Phase 73, Phase 83, Phase 84 and Phase 90.2
 * each added channels without adding rows, so the table described a contract
 * the file no longer held. The missing seven were written out rather than left
 * to be counted by hand.
 *
 * IT WENT STALE AGAIN, and Phase 98 says so rather than quietly fixing it.
 * Phase 90.3 added `listTree` without a row, so the count read twenty while the
 * file held twenty one. Both that row and Phase 98's own are in the table now.
 * PHASE 99 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `listFiles`.
 *
 * IT WAS STALE AGAIN WHEN PHASE 105 ARRIVED, and this says so rather than
 * quietly fixing it. Phase 100 added `readSessionLines` without a row, so the
 * count read twenty three while the file held twenty four. That row and Phase
 * 105's own `readRuns` are both in the table below, and the count is twenty
 * five.
 *
 * PHASE 106 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readBranch`. The
 * count is twenty six.
 *
 * PHASE 107 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readHistory`. The
 * count is twenty seven.
 *
 * PHASE 108 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `readContext`. The
 * count is twenty eight.
 *
 * PHASE 109 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `agents`. The
 * count is twenty nine.
 *
 * PHASE 101 ADDS THREE ROWS AND MOVES THE COUNT WITH THEM, being `writeSheet`,
 * `allowWrites` and `putFile`. The count is thirty two.
 *
 * PHASE 102 ADDS TWO ROWS AND MOVES THE COUNT WITH THEM, being `makeDir` and
 * `renameEntry`. The count is thirty four.
 *
 * PHASE 103 ADDS TWO ROWS AND MOVES THE COUNT WITH THEM, being `stage` and
 * `unstage`. The count is thirty six. They are the sixth and the seventh
 * channels here that write on another computer, and the first two that change
 * a git repository over there.
 *
 * PHASE 104 ADDS ONE ROW AND MOVES THE COUNT WITH IT, being `commit`. The count
 * is thirty seven. It is the eighth channel here that writes on another
 * computer and the third that changes a git repository over there.
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
 * | acceptVersion | the sheet's hash and one row | machines.json and one record | nothing |
 * | forget | nothing | one record removed | nothing |
 * | remove | nothing | machines.json and one record removed | nothing |
 * | prepare | one row and the sealed record | settings on that machine | ssh |
 * | state | memory in main | nothing | nothing |
 * | installKey | the block's hash | one key here, one line on that machine | ssh-keygen, then ssh |
 * | putImage | one file on this Mac | one file on that machine | ssh |
 * | reviewFiles | one folder on that machine | nothing | ssh |
 * | reviewFile | one file on that machine | nothing | ssh |
 * | stage | one folder on that machine, twice | that repository's index | ssh |
 * | unstage | one folder on that machine, twice | that repository's index | ssh |
 * | listDir | one folder on that machine | nothing | ssh |
 * | findProject | one git config here, one folder walk there | nothing | ssh |
 * | cloneProject | one git config here | one folder on that machine | ssh |
 * | listTree | one folder tree on that machine | nothing | ssh |
 * | searchContent | one folder on that machine | nothing | ssh |
 * | listFiles | one folder on that machine | nothing | ssh |
 * | readSessionLines | the last lines of one session there | nothing | ssh |
 * | readRuns | one folder on that machine, then github.com | nothing | ssh, then gh ON THIS MAC |
 * | readBranch | one folder on that machine | nothing | ssh |
 * | readHistory | one folder on that machine | nothing | ssh |
 * | readContext | agent configuration files on that machine | nothing | ssh |
 * | agents | memory in main, or one batched read of that machine | nothing | ssh only when fresh is true |
 * | writeSheet | one row and the sealed record | nothing | nothing |
 * | allowWrites | the sheet's hash and one row | machines.json and one record | nothing |
 * | putFile | one row and one file's bytes from the renderer | one file on that machine | ssh |
 * | makeDir | one row and one path from the renderer | one folder on that machine | ssh |
 * | renameEntry | one row and two paths from the renderer | one entry moved on that machine | ssh |
 * | commit | one row, then one folder on that machine | one commit in that repository | ssh |
 *
 * `readRuns` is the one row whose Spawns column names two programs. The ssh is
 * the read of that machine's branch. The gh runs HERE and never leaves this Mac,
 * and nothing about it crosses the link.
 *
 * Every one of them that spawns does so on a person's click and from nowhere
 * else. EIGHT of them write on another computer, being `putImage`,
 * `cloneProject`, `putFile`, `makeDir`, `renameEntry`, `stage`, `unstage` and
 * `commit`, and that number is the number this product is allowed to have. It
 * moved from one to two in Phase 90.2, from two to three in Phase 101, from
 * three to five in Phase 102, from five to seven in Phase 103 and from seven to
 * eight in Phase 104, deliberately and once each time.
 *
 * THIS PARAGRAPH SAID FIVE UNTIL PHASE 104 AND IT IS WRITTEN OUT RATHER THAN
 * QUIETLY FIXED. It was already false at seven when Phase 103 shipped. The
 * count that is enforced lives in `ALLOWED_WRITERS` in
 * `build/conformance-machines.mjs` and in `remoteWriteScripts()`, and never in
 * this sentence.
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
  // PHASE 90.3. One READ of one folder TREE on one machine, for the Explorer
  // of a project that lives over there. It writes nothing on either computer,
  // it carries no file contents, and main refuses it while it is not connected
  // to that machine.
  //
  // ONE CALL AND NEVER ONE CALL PER ROW. Research 55 measured nine folders as
  // nine calls at 409.7 ms and the same nine answers in one subtree call at
  // 42.3 ms, so the Explorer asks for a whole subtree at once. A folder that
  // could not be read comes back as a status word, never as an exception a
  // surface has to read prose out of, and never as prose main composed.
  'machines:listTree': {
    req: [input: RemoteTreeListInput];
    res: RemoteTreeListing;
  };
  // PHASE 98. One READ of one folder on one machine, for the Search view of a
  // project that lives over there. It writes nothing on either computer, it
  // sends no program, and main refuses it while it is not connected to that
  // machine.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-search`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder, the pattern, the flag letters and the two caps
  // arriving there as positional parameters.
  //
  // A folder that is not there, a pattern that machine's grep refused and a
  // machine that did not answer all come back as a status word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:searchContent': {
    req: [input: MachineSearchInput];
    res: MachineSearchResult;
  };
  // PHASE 99. One READ of the FILE NAMES in one folder on one machine, for the
  // Quick Open palette on a tab whose project lives over there. It carries
  // names and never contents, it writes nothing on either computer, and main
  // refuses it while it is not connected to that machine.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-files`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder and the name cap plus one arriving there as
  // positional parameters.
  //
  // NOTHING CALLS IT ON A CLOCK. The palette asks when a person opens it, and
  // it skips a root it read less than QUICK_OPEN_WARM_STALE_MS ago.
  //
  // A folder that is not there, a machine that did not answer and a machine
  // Tortie is not signed in to all come back as a mode word. No prose crosses
  // this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:listFiles': {
    req: [input: MachineFileListInput];
    res: MachineFileListResult;
  };
  // PHASE 100. One READ of the LAST LINES one session on one machine printed,
  // for a person who wants to read back what an agent over there said. It
  // writes nothing on either computer, it sends no program, and main refuses it
  // while it is not connected to that machine.
  //
  // THE COMMAND IS ALREADY ON THE LEDGER. `capture-pane -p -e -J -t <id> -S
  // -<n>` is row 5, with `kind: 'read'` and `repeat: 'safe'`, and
  // `remoteCaptureArgs` in src/main/machines/remote-capsule.ts already composes
  // it. Nothing about what Tortie may run on another computer moves.
  //
  // IT IS NOT A SCROLLBAR, and research 57 section 3.1 refused one twice over.
  // No file behind this channel may name `copy-mode` or `send-keys`.
  //
  // NOTHING CALLS IT ON A CLOCK. A person opens the panel or presses a depth
  // button, and each of those is one read.
  //
  // A session Tortie holds no row for, a machine that did not answer and a
  // machine Tortie is not signed in to all come back as a mode word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readSessionLines': {
    req: [input: MachineSessionLinesInput];
    res: MachineSessionLinesResult;
  };
  // PHASE 105. One READ of the branch checked out in one folder on one machine,
  // followed by one gh read ON THIS MAC. It is what the Runs section of a
  // project that lives over there draws.
  //
  // NO CREDENTIAL AND NO gh CROSSES. The gh program runs on this Mac and never
  // leaves it. No token, no gh invocation and no GitHub host name is sent to the
  // machine. Four short strings travel back, being a mode word, the origin
  // address, the branch name and the commit HEAD points at. Condition 55d of
  // build/conformance-machines.mjs reads the script text and fails on any of the
  // nine words a credential would travel in.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-facts`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder arriving there as the one positional parameter. The gh
  // argv is composed by src/main/actions/argv.ts and refused by
  // `assertReadOnlyArgv` before a process exists.
  //
  // IT WRITES NOTHING, on either computer and on GitHub. Every gh shape the
  // allowlist permits is a read.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the section or presses
  // Refresh, and each of those is one read. There is no watch, because main
  // cannot see a push made on another computer, and the panel says the list does
  // not refresh.
  //
  // A folder that is not there, a folder git does not track, a repository with
  // no GitHub address, a detached head, a machine that did not answer and a
  // machine Tortie is not signed in to all come back as a mode word. No prose
  // crosses this channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readRuns': {
    req: [input: MachineRunsInput];
    res: MachineRunsResult;
  };
  // PHASE 106. One channel that READS which branch is checked out in one folder
  // on one machine, the branch it follows, and how far ahead and how far behind
  // it is.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-branch`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder arriving there as the one positional parameter.
  //
  // IT WRITES NOTHING, on either computer. It cannot change what is checked out
  // over there, and the renderer draws no control that could.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group or presses Refresh,
  // and each of those is one read.
  //
  // TORTIE NEVER FETCHES ON THAT MACHINE, so the two counts are measured
  // against the copy of the upstream that machine last fetched and can be older
  // than what is on the server. Condition 56i of build/conformance-machines.mjs
  // fails the script if it ever names `git fetch`, `git pull` or
  // `git remote update`.
  //
  // A folder that is not there, a folder git does not track, a detached head, a
  // git too old to answer, a machine that did not answer and a machine Tortie is
  // not signed in to all come back as a mode word. No prose crosses this
  // channel: the renderer draws every sentence from
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readBranch': {
    req: [input: MachineBranchInput];
    res: MachineBranchResult;
  };
  // PHASE 107. One READ of a page of the newest commits in one folder on one
  // machine, with the two anchors the swimlane picture needs and the marks that
  // say which commits are ahead of the followed branch and which are behind it.
  //
  // IT CANNOT COMPOSE WHAT IT ASKS. The command that crosses is `repo-history`
  // from the frozen catalogue in src/main/machines/remote-scripts.ts, chosen by
  // name, with the folder and the count arriving there as the two positional
  // parameters.
  //
  // IT WRITES NOTHING, on either computer. There is no checkout, no branch and
  // no cherry pick behind this channel, and the renderer draws no control that
  // could ask for one.
  //
  // THE COUNT IS CLAMPED IN MAIN to 1 and to REMOTE_HISTORY_MAX_COMMITS, so a
  // renderer that asked for 20,000 is still answered with 500. Condition 57j of
  // build/conformance-machines.mjs holds that number.
  //
  // NOTHING CALLS IT ON A CLOCK. A person expands the group, presses Load more
  // or presses Refresh, and each of those is one read.
  //
  // A folder that is not there, a folder git does not track, a repository with
  // no commits, a machine that did not answer and a machine Tortie is not
  // signed in to all come back as a mode word. No prose crosses this channel:
  // the renderer draws every sentence from src/renderer/app/machine-copy.ts,
  // where the vocabulary audit reads it.
  'machines:readHistory': {
    req: [input: MachineHistoryInput];
    res: MachineHistoryResult;
  };
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
  // src/renderer/app/machine-copy.ts, where the vocabulary audit reads it.
  'machines:readContext': {
    req: [input: MachineContextInput];
    res: MachineContextResult;
  };
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
  // ---- PHASE 101 BLOCK ----
  // THIS ONE READS. It answers the sheet for the row as it is now plus the
  // folder a person typed, so the renderer never composes a sheet's hash. It
  // starts nothing, sends nothing to any machine and writes nothing. A folder
  // that fails validation throws the validator's own sentence.
  //
  // A `machines:allowWrites` that previewed when `hashRead` was null was
  // rejected. A channel that both previews and writes is a channel where one
  // wrong argument writes.
  'machines:writeSheet': {
    req: [input: MachineWriteSheetInput];
    res: MachineConfirmSheet;
  };
  // THIS ONE WRITES, on this Mac and nowhere else. It writes the folder into
  // the row and records the agreement in one call, over the sheet the person
  // read. A stale hash refuses before either write. It starts no process, opens
  // no connection and sends nothing to any machine.
  'machines:allowWrites': {
    req: [input: MachineAllowWritesInput];
    res: MachineRowView;
  };
  // THIS ONE WRITES ON ANOTHER COMPUTER, and it was the third channel in this
  // contract that could. Phase 102 added the fourth and the fifth. Main asks the confirm gate, refuses a machine with no
  // confirmed folder, refuses a file over REMOTE_FILE_MAX_BYTES and refuses a
  // path outside the confirmed folder, all before anything is composed. The
  // machine then refuses again unless the file's contents still match what
  // Tortie read.
  'machines:putFile': {
    req: [input: MachineFilePutInput];
    res: MachineFilePutResult;
  };
  // ---- END PHASE 101 BLOCK ----
  // ---- PHASE 102 BLOCK ----
  // BOTH OF THESE WRITE ON ANOTHER COMPUTER, and they are the fourth and the
  // fifth channels in this contract that can. Main asks the confirm gate,
  // refuses a machine with no confirmed folder and refuses every path outside
  // that folder, all before anything is composed. NEITHER CARRIES A ROOT: main
  // reads the confirmed folder off the row, so nothing chosen in the renderer
  // decides what is written under.
  //
  // Neither throws for anything the machine said. A machine Tortie is not
  // signed in to throws `MACHINE_NOT_CONNECTED`, which is main's own sentence
  // and the one exception that crosses this boundary.
  'machines:makeDir': {
    req: [input: MachineMakeDirInput];
    res: MachineMakeDirResult;
  };
  'machines:renameEntry': {
    req: [input: MachineRenameInput];
    res: MachineRenameResult;
  };
  // ---- END PHASE 102 BLOCK ----
  // ---- PHASE 103 BLOCK ----
  // BOTH OF THESE WRITE ON ANOTHER COMPUTER, and they are the sixth and the
  // seventh channels in this contract that can. They are also the first two
  // that change a git repository over there: until this phase no command
  // Tortie sent could.
  //
  // NEITHER NAMES A GIT VERB. The verb is inside Tortie's own script text in
  // `src/main/machines/remote-scripts.ts`, so no caller can turn a stage into
  // a commit, a checkout or a discard.
  //
  // NEITHER CARRIES A REPOSITORY ROOT. Main runs its own review read on the
  // tab's folder and uses the root that machine's own `rev-parse` answered, so
  // the pair of an absolute folder and a relative path cannot reach a
  // repository the tab is not about.
  //
  // WHAT BOUNDS THEM IS THE SAME ONE FIELD `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 103 ADDS NO CONFIRMED FIELD
  // and no hash moves. A machine that carries no folder answers `writesOff`
  // and nothing is composed.
  //
  // NEITHER EVER THROWS FOR SOMETHING THE MACHINE SAID. A git that exited non
  // zero is the word `partial`, and a machine that did not answer is the word
  // `unsure`. `unsure` never means nothing changed. Three refusals decided on
  // this Mac before anything is composed do throw, being a name holding a line
  // break, a path longer than one command may be, and a path the fresh read
  // did not report.
  'machines:stage': {
    req: [input: MachineIndexWriteInput];
    res: MachineIndexWriteResult;
  };
  'machines:unstage': {
    req: [input: MachineIndexWriteInput];
    res: MachineIndexWriteResult;
  };
  // ---- END PHASE 103 BLOCK ----
  // ---- PHASE 104 BLOCK ----
  // THIS ONE WRITES ON ANOTHER COMPUTER, and it is the eighth channel in this
  // contract that can. It is the third that changes a git repository over
  // there, after the two Phase 103 added.
  //
  // IT NAMES NO GIT VERB. The verb is inside Tortie's own script text in
  // `src/main/machines/remote-scripts.ts`, so no caller can turn a commit into
  // an amend, a reset or a discard.
  //
  // IT CARRIES NO REPOSITORY ROOT. The input carries the tab's folder and main
  // runs its own review read on it, so the root that reaches that machine's git
  // is the one that machine's own `rev-parse` answered.
  //
  // WHAT BOUNDS IT is the same one field `machines:putFile` is bounded by,
  // being `writeRoot` on the machine row. PHASE 104 ADDS NO CONFIRMED FIELD
  // and no hash moves. A machine that carries no folder answers `refused` and
  // nothing is composed.
  //
  // THE REPEAT IS GUARDED BY HEAD. Main reads the sha that folder's `HEAD`
  // points at immediately before it sends, that sha crosses with the message,
  // and the machine refuses to commit when its own `HEAD` no longer equals it.
  // So a second send of one request commits nothing.
  //
  // IT NEVER THROWS FOR SOMETHING THE MACHINE SAID. Every answer is one of
  // eight words with sentences beside it.
  'machines:commit': {
    req: [input: MachineCommitInput];
    res: MachineCommitResult;
  };
  // ---- END PHASE 104 BLOCK ----
  'machines:agents': {
    req: [id: string | null, fresh: boolean];
    res: MachineAgentsView[];
  };
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
 * Extra on window.gmux.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 *
 * A build without it shows no Machines section, which is the ordinary case for
 * a person who has no other machine.
 */
export interface GmuxMachinesExtras {
  machines: {
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
    // Phase 90.2. Where this project already is on that machine, matched on
    // the git remote. It reads and never writes.
    findProject(input: RemoteProjectFindInput): Promise<RemoteProjectFindResult>;
    // Phase 90.2. Puts this project on that machine. It is the second call in
    // this contract that writes on another computer.
    cloneProject(input: RemoteCloneInput): Promise<RemoteCloneResult>;
    // Phase 90.3. Reads one folder tree on one machine, to a fixed depth, in
    // one call. It reads and never writes.
    listTree(input: RemoteTreeListInput): Promise<RemoteTreeListing>;
    // Phase 98. Searches one folder on one machine with that machine's own
    // grep. It reads and never writes.
    searchContent(input: MachineSearchInput): Promise<MachineSearchResult>;
    // Phase 99. Reads the file NAMES in one folder on one machine, so Quick
    // Open on a tab that lives over there can rank them. It carries no file
    // contents. It reads and never writes.
    listFiles(input: MachineFileListInput): Promise<MachineFileListResult>;
    // Phase 100. Reads the last lines one session on one machine printed, so a
    // person can read back what an agent over there said. It reads and never
    // writes, and it is not a scrollbar.
    readSessionLines(
      input: MachineSessionLinesInput
    ): Promise<MachineSessionLinesResult>;
    // Phase 105. Reads which branch is checked out in one folder on one
    // machine, then asks GitHub about that branch with the gh on THIS Mac. It
    // reads and never writes, on either computer and on GitHub, and no
    // credential and no gh crosses the link.
    readRuns(input: MachineRunsInput): Promise<MachineRunsResult>;
    // Phase 106. Reads which branch is checked out in one folder on one
    // machine, the branch it follows, and how far ahead and how far behind it
    // is. It reads and never writes, and it cannot change what is checked out
    // over there.
    readBranch(input: MachineBranchInput): Promise<MachineBranchResult>;
    // Phase 107. Reads a page of the newest commits in one folder on one
    // machine, with the two anchors the swimlane picture needs. It reads and
    // never writes, it is capped at 500 commits in one answer, and it does not
    // read the files one commit changed.
    readHistory(input: MachineHistoryInput): Promise<MachineHistoryResult>;
    // Phase 108. Reads the agent configuration on one machine, so the Context
    // panel on a tab that lives over there shows what the agents THERE will
    // load. It reads and never writes, and install, enable and pin are not
    // behind it and never will be.
    readContext(input: MachineContextInput): Promise<MachineContextResult>;
    // Phase 109. Which agents each machine has. With `fresh` false it reads
    // memory in main and starts nothing; with `fresh` true it sends ONE
    // batched read to that machine, which is a person pressing Rescan. The
    // answer decides what a tile looks like and never what a manifest row
    // holds.
    agents(id: string | null, fresh: boolean): Promise<MachineAgentsView[]>;
    // ---- PHASE 101 BLOCK ----
    // Phase 101. Reads the sheet for the row as it is now plus the folder a
    // person typed. It starts nothing, sends nothing and writes nothing.
    writeSheet(input: MachineWriteSheetInput): Promise<MachineConfirmSheet>;
    // Phase 101. Turns saving on for one machine. It writes the folder into
    // the row and records the agreement, on this Mac and nowhere else. It
    // contacts no machine and starts nothing.
    allowWrites(input: MachineAllowWritesInput): Promise<MachineRowView>;
    // Phase 101. Saves one file on one machine. It was the third call in this
    // contract that writes on another computer, and Phase 102 added two more.
    putFile(input: MachineFilePutInput): Promise<MachineFilePutResult>;
    // ---- END PHASE 101 BLOCK ----
    // ---- PHASE 102 BLOCK ----
    // Phase 102. Makes one folder on one machine. It is the fourth call in
    // this contract that writes on another computer.
    makeDir(input: MachineMakeDirInput): Promise<MachineMakeDirResult>;
    // Phase 102. Renames one file or one folder on one machine. It is the
    // fifth. The rename is a plain `mv`, so git over there sees a delete plus
    // an untracked add until somebody stages it.
    renameEntry(input: MachineRenameInput): Promise<MachineRenameResult>;
    // ---- END PHASE 102 BLOCK ----
    // ---- PHASE 103 BLOCK ----
    // Phase 103. Puts a list of paths into one repository's index on one
    // machine. It is the sixth call in this contract that writes on another
    // computer and the first that changes a git repository over there.
    stage(input: MachineIndexWriteInput): Promise<MachineIndexWriteResult>;
    // Phase 103. Takes the same list back out of that index. It is the
    // seventh. On a repository with no commit it runs `git rm --cached` over
    // the same list instead, which leaves every file in the folder.
    unstage(input: MachineIndexWriteInput): Promise<MachineIndexWriteResult>;
    // ---- END PHASE 103 BLOCK ----
    // ---- PHASE 104 BLOCK ----
    // Phase 104. Commits what is staged in one repository on one machine. It is
    // the eighth call in this contract that writes on another computer. The
    // person's own message is the only thing on this call they wrote. Hooks and
    // signing run on that machine, and Tortie answers no passphrase anywhere.
    commit(input: MachineCommitInput): Promise<MachineCommitResult>;
    // ---- END PHASE 104 BLOCK ----
    // Phase 109. The whole map, pushed whenever any machine's answer changes,
    // the `onStateChanged` precedent.
    onAgentsChanged(cb: (views: MachineAgentsView[]) => void): () => void;
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
  /**
   * PHASE 103. The FIRST character of the porcelain pair, being what the index
   * holds. It is what the next commit over there would carry.
   *
   * `status` above is unchanged and still feeds the badge. This field and the
   * one below are what let the panel put a file in a Staged group, which it
   * could not do before this phase because `letterOf` folded the pair into one
   * letter and threw the first character away. An untracked row carries `?`
   * here and `?` below, which is what `parsePorcelainV2Status` reports for it.
   */
  indexState: GitFileState;
  /**
   * PHASE 103. The SECOND character of the porcelain pair, being what the
   * folder on disk holds.
   */
  worktreeState: GitFileState;
}

/** What one repository on one machine has changed since its last commit. */
export interface MachineReviewList {
  machineId: string;
  /** The machine's own label, so a surface never composes one. */
  machineLabel: string;
  /** The repository root THAT MACHINE reported. Empty when there is none. */
  repoPath: string;
  /**
   * PHASE 104. The commit `HEAD` pointed at in that folder when this read ran.
   *
   * It is the `# branch.oid` header of the same porcelain the file rows come
   * from, so it costs no extra read and no extra process on that machine. It
   * was parsed and thrown away until this phase.
   *
   * It is the empty string in two cases, being a folder that is not a
   * repository and a repository with no commit yet. `parseHeader` in
   * `src/main/git/parse.ts` writes the oid only when the header is not
   * `(initial)`, so an unborn branch arrives empty and never as the literal
   * `(initial)`.
   *
   * IT EXISTS SO A COMMIT ON ANOTHER MACHINE CAN BE GUARDED. Main reads it,
   * sends it to that machine, and that machine refuses to commit when its own
   * `HEAD` has moved since. The renderer sends back the sha it drew and main
   * refuses when the two disagree, so the guard is never the renderer's value.
   */
  headSha: string;
  files: MachineReviewFile[];
  /** How many changed files there were, when only the first ones are listed. */
  total: number;
  /** PHASE 97. Files in that folder git is not yet tracking. Never an ignored file. */
  untracked: MachineReviewFile[];
  /** PHASE 97. How many untracked files there were, when only the first ones are listed. */
  untrackedTotal: number;
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
  /**
   * PHASE 101. How many bytes the working copy holds, as Tortie read it.
   *
   * It is computed in main from bytes it already had, so no script text moved
   * and the far side answers nothing new. It exists so the refusal to open a
   * remote file that is too large to save can name the file's real size.
   *
   * TWO CASES, AND THEY ARE NOT THE SAME MEASUREMENT. With `truncated` false
   * this is the file's size. With `truncated` true the read was cut at the
   * review cap, so this equals that cap and it is a floor rather than a size.
   * A surface must not print it as the size in that case.
   *
   * IT IS REQUIRED RATHER THAN APPENDED, which is a deliberate departure from
   * the rule the other appended fields in this contract follow. This one is
   * read by a refusal that names a number on screen, and a field that could be
   * absent would be read as 0 there, which would put a false size in front of a
   * person. There are exactly two places that build this shape and both are in
   * `src/main/machines/remote-review.ts`.
   */
  bytes: number;
}
// ---- END PHASE 73 BLOCK C ----

// ---- PHASE 101 BLOCK ----
// Editing and saving a file that lives on another machine.
//
// WHAT THIS IS FOR. A person can already read a file on another machine in a
// Tortie tab. This block is what lets them change it and press Save, and what
// lets them make a new empty file there.
//
// WHAT DECIDES WHETHER A BYTE EVER LANDS. One confirmed field on the machine
// row, being `writeRoot`. A machine that carries none cannot be saved to at
// all, and it hashes exactly as it did before this block existed. A person
// turns saving on for one machine, once, by reading a sheet and pressing a
// button in Settings, then Machines. Nothing automates past that moment.
//
// WHAT NONE OF THESE THREE CALLS DOES. None of them removes anything on either
// computer. None of them makes a folder, renames anything or moves anything to
// a Trash. None of them carries a root chosen in the renderer: main reads the
// confirmed root out of the row and refuses a path that does not sit under it,
// before it composes anything.

/**
 * The largest file this door will save, in bytes. 90,000.
 *
 * IT IS THE SAME NUMBER AS {@link REMOTE_IMAGE_MAX_BYTES} AND IT IS A SEPARATE
 * CONSTANT ON PURPOSE. Research 57 section 4.2 said to reuse the image cap.
 * This deviates from that: a later change to what an image may weigh would
 * otherwise silently change what a person may save, and the two are different
 * questions asked by different people.
 *
 * The reason for the number is the carriage rather than a choice. The bytes
 * travel encoded, inside one command, and that command reaches the far side as
 * ONE argument of that machine's own login shell. Linux caps one argument of
 * one program at 131,072 bytes. Encoding adds a third. So 90,000 bytes of file
 * becomes 120,000 bytes of payload and fits.
 *
 * A larger file is refused on this Mac before anything is sent, and a remote
 * file larger than this is refused at OPEN when saving is on for that machine,
 * because a tab that can never be saved is worse than a refusal that says why.
 */
export const REMOTE_FILE_MAX_BYTES = 90_000;

/**
 * What the renderer sends to read the sheet for a folder a person typed.
 *
 * IT READS ONLY. It starts nothing, sends nothing to any machine and writes
 * nothing. It exists because the renderer may never compose a sheet's lines or
 * its hash, and there is no prior result to take this sheet from: the person
 * types the folder. A root that fails validation throws the validator's own
 * sentence.
 */
export interface MachineWriteSheetInput {
  id: string;
  /** The absolute folder on that machine, as the person typed it. */
  writeRoot: string;
}

/**
 * What the renderer sends when a person turns saving on for one machine.
 *
 * It is the shape {@link MachineAcceptVersionInput} takes, because it IS a
 * confirmation: main writes the field into the row and records the agreement in
 * one call, over the sheet the person read. A stale hash refuses and writes
 * nothing.
 */
export interface MachineAllowWritesInput {
  id: string;
  /** The absolute folder on that machine. Main validates it again. */
  writeRoot: string;
  /** The hash the sheet was drawn from. Main refuses a stale one. */
  hashRead: string;
  /** The lines that were on the sheet. Recorded verbatim. */
  linesRead: string[];
}

/** Which file on which machine is being saved, and what it should hold. */
export interface MachineFilePutInput {
  machineId: string;
  /** The absolute path ON THAT MACHINE. Main refuses one outside the root. */
  path: string;
  /** The whole file, as text. Main refuses more than REMOTE_FILE_MAX_BYTES. */
  contents: string;
  /**
   * The sha256 of the file as Tortie last read it, or the word `new`.
   *
   * `new` means make a file that is not there, and the machine refuses a
   * destination that already exists. A checksum means replace a file whose
   * contents still match what Tortie read, and the machine refuses when they
   * do not.
   */
  expect: string;
}

/**
 * What happened to one save. Nine words, and six of them come from the machine.
 *
 * `wrote` is the only one that means bytes landed. `writesOff`, `outsideRoot`
 * and `tooLarge` are decided on this Mac before anything is sent. `stale`,
 * `missing`, `exists`, `nomode` and `nosum` are what the machine reported, and
 * every one of them means nothing was written there, because the script prints
 * all five of them above the line that writes and none of them below it. The
 * gate's condition 80 reads that property out of the script text.
 *
 * THE SCRIPT HAS ONE MORE WORD AND IT IS NOT HERE ON PURPOSE. `unsure` is what
 * it prints when the bytes are already in place and it cannot describe them.
 * That is not an outcome, because an outcome is something a person is told
 * happened, so `parseFilePutAnswer` does not know the word and the save fails
 * with the sentence that says Tortie cannot tell whether the file was saved.
 */
export type MachineFilePutOutcome =
  | 'wrote'
  | 'stale'
  | 'missing'
  | 'exists'
  | 'nomode'
  | 'nosum'
  | 'writesOff'
  | 'outsideRoot'
  | 'tooLarge';

/** What one save did, in the shape the surface that asked for it reads. */
export interface MachineFilePutResult {
  readonly outcome: MachineFilePutOutcome;
  /** The file's checksum after a `wrote`. Null otherwise. */
  readonly sha256: string | null;
  /** The bytes on the far side after a `wrote`, or the bytes refused for `tooLarge`. */
  readonly bytes: number | null;
  /** The confirmed root, for the two sentences that name it. Null when there is none. */
  readonly writeRoot: string | null;
}
// ---- END PHASE 101 BLOCK ----

// ---- PHASE 102 BLOCK ----
// Making a folder and renaming an entry on another machine.
//
// WHAT THIS IS FOR. Phase 101 lets a person change a file that lives on
// another machine and make a new empty one there. These two calls let them
// make a folder there and rename a file or a folder there, from the Explorer.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO ROOT CROSSES EITHER CHANNEL. Neither input type has a member called
// `root`. Main reads the confirmed folder off the machine row at call time and
// refuses every path that does not sit under it, before it composes anything.
// A folder chosen in the renderer therefore cannot decide what is written
// under, which is the shape Phase 101 shipped.
//
// NEITHER EVER THROWS FOR SOMETHING THE MACHINE SAID. A folder that is already
// there, a parent that is gone and a parent the account cannot write in all
// come back as a status word, the way `machines:listDir` and
// `machines:listTree` already answer. ONE SENTENCE STILL CROSSES AND IT IS
// NAMED HERE RATHER THAN DENIED: a machine Tortie is not signed in to throws
// `MACHINE_NOT_CONNECTED`, which is main's own sentence. Every sentence a
// person reads about one of these answers is composed in
// `src/renderer/app/machine-copy.ts`.
//
// WHAT NEITHER OF THEM DOES. Neither removes anything on either computer.
// Neither copies anything. The rename is a plain `mv`, so git on that machine
// sees a delete plus an untracked add until somebody stages it.

/** Which folder to make, on which machine. */
export interface MachineMakeDirInput {
  machineId: string;
  /** The absolute path of the new folder ON THAT MACHINE. */
  path: string;
}

/**
 * What happened to one new folder. Six words, and four come from the machine.
 *
 * `made` is the only one that means a folder is there that was not there
 * before. `writesOff` and `outsideRoot` are decided on this Mac before anything
 * is sent. `exists`, `denied` and `noparent` are what the machine reported, and
 * all three are printed above the `mkdir` and none below it, so every one of
 * them means nothing was created.
 */
export type MachineMakeDirOutcome =
  | 'made'
  | 'exists'
  | 'denied'
  | 'noparent'
  | 'writesOff'
  | 'outsideRoot';

/** What one new folder did, in the shape the surface that asked for it reads. */
export interface MachineMakeDirResult {
  readonly outcome: MachineMakeDirOutcome;
  /**
   * The mode of the folder the new one was made INSIDE, as octal digits, after
   * a `made`. Null otherwise, and null when that machine's `stat` said nothing.
   *
   * It is the parent's mode rather than the new folder's so that a verifier can
   * compare what Tortie decided against what `ls -ld` shows without a second
   * call. What the new folder gets is capped at two values: 755 when the
   * parent's last two octal digits are each 5 or 7, and 700 otherwise.
   */
  readonly mode: string | null;
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  readonly tookMs: number;
}

/** Which entry to rename, on which machine. */
export interface MachineRenameInput {
  machineId: string;
  /** The absolute path it has now, ON THAT MACHINE. Main bounds it. */
  from: string;
  /** The absolute path wanted, ON THAT MACHINE. Main bounds this one too. */
  to: string;
  /** What the renderer believes it is renaming. Echoed back on the result. */
  kind: 'file' | 'dir';
}

/**
 * What happened to one rename. Six words, and four come from the machine.
 *
 * `moved` means the entry is at the new path and it was this call that moved
 * it. `done` means the machine already held the end state the person asked for,
 * which is what a repeat after a lost answer looks like. IT CANNOT TELL THAT
 * APART from a machine where somebody else already held a file at the
 * destination while the source never existed, and the product does not pretend
 * to. `exists` and `gone` mean nothing was moved. `writesOff` and `outsideRoot`
 * are decided on this Mac before anything is sent.
 */
export type MachineRenameOutcome =
  | 'moved'
  | 'done'
  | 'exists'
  | 'gone'
  | 'writesOff'
  | 'outsideRoot';

/** What one rename did, in the shape the surface that asked for it reads. */
export interface MachineRenameResult {
  readonly outcome: MachineRenameOutcome;
  readonly from: string;
  readonly to: string;
  /**
   * Echoed back, so the tab follower reads one source rather than guessing.
   *
   * A folder rename reported as a file leaves every open tab beneath it
   * pointing at a path that is no longer on that machine, because the follower
   * only does prefix arithmetic for descendants when this says `dir`.
   */
  readonly kind: 'file' | 'dir';
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  readonly tookMs: number;
}
// ---- END PHASE 102 BLOCK ----

// ---- PHASE 103 BLOCK ----
// Staging and unstaging in one repository on another machine.
//
// WHAT THIS IS FOR. A person looking at the Source Control panel for a folder
// on another machine can choose what goes into the next commit over there.
// Until this phase no command Tortie sent could change a git repository on
// another computer. After it, two can.
//
// WHAT THESE TWO CANNOT DO. Neither commits. Neither discards a change, and
// condition 83 of `build/conformance-machines.mjs` makes that refusal
// executable over the whole script catalogue rather than merely absent.
// Neither marks a conflict resolved, so a conflicted row offers no verb at
// all. Neither stages part of a file, because the local list cannot either.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO REPOSITORY ROOT CROSSES EITHER CHANNEL. The input carries the tab's
// folder and main runs its own review read on it, so the root that reaches
// that machine's git is the one that machine's own `rev-parse` answered.

/** Which paths in which folder on which machine, for stage and for unstage. */
export interface MachineIndexWriteInput {
  machineId: string;
  /** The tab's folder ON THAT MACHINE. Main runs its own review read on it. */
  cwd: string;
  /** Repository relative paths, as `machines:reviewFiles` reported them. */
  paths: string[];
}

/**
 * What happened to one stage or one unstage. Seven words, and none of them
 * claims more than Tortie knows.
 *
 *  - `done`: every command crossed and that machine's git exited 0 for each.
 *  - `partial`: at least one command's git exited non zero. Tortie cannot say
 *    which files landed, because git reports one status for a whole list.
 *  - `unsure`: the machine did not answer, or answered something Tortie could
 *    not read. This never means nothing changed.
 *  - `writesOff`, `outsideRoot`, `notRepo`, `nothingToDo`: decided on this Mac
 *    before anything was composed, so each of them means nothing was sent.
 */
export type MachineIndexWriteOutcome =
  | 'done'
  | 'partial'
  | 'unsure'
  | 'writesOff'
  | 'outsideRoot'
  | 'notRepo'
  | 'nothingToDo';

/** What one stage or one unstage did, in the shape the surface reads. */
export interface MachineIndexWriteResult {
  readonly outcome: MachineIndexWriteOutcome;
  /** How many paths crossed, after the rename origPath was added. */
  readonly paths: number;
  /** How many commands crossed. 0 for every outcome decided on this Mac. */
  readonly chunks: number;
  /** The repository root THAT MACHINE answered. Empty when there is none. */
  readonly repoPath: string;
  /** The confirmed folder, for the sentences that name it. Null when none. */
  readonly writeRoot: string | null;
  /**
   * What that machine's git printed on the first command that failed, decoded.
   * Null otherwise. IT IS LOGGED AND NEVER DRAWN, because it is that machine's
   * prose rather than Tortie's, and every sentence a person reads about a
   * machine is composed in src/renderer/app/machine-copy.ts.
   */
  readonly machineSaid: string | null;
  /** The review read main ran before composing, in ms. */
  readonly readMs: number;
  readonly tookMs: number;
}
// ---- END PHASE 103 BLOCK ----

// ---- PHASE 104 BLOCK ----
// Committing what is staged in one repository on another machine.
//
// WHAT THIS IS FOR. A person looking at the Source Control panel for a folder
// on another machine can type a message and commit over there. Until this phase
// Tortie could choose what went into the next commit on that machine and could
// not make it.
//
// WHAT RUNS ON THAT MACHINE. That machine's own git, that person's own
// `pre-commit` and `commit-msg` hooks, and that person's own signing
// configuration. TORTIE ANSWERS NO PASSPHRASE, ANYWHERE. Standard input is
// `/dev/null` over there, so a program that reads a terminal fails at once. A
// signing program with a window of its own opens that window on that machine's
// screen, where Tortie cannot see it and cannot answer it, and the commit box
// says so before a person presses the button.
//
// WHAT THIS CANNOT DO. It cannot amend, it cannot reset, it cannot discard a
// change and it cannot push. None of those verbs is in Tortie's script
// catalogue and condition 83 of `build/conformance-machines.mjs` makes the
// discard refusal executable over the whole catalogue.
//
// WHAT DECIDES WHETHER ANYTHING HAPPENS. The same one confirmed field Phase
// 101 added, being `writeRoot`. NO NEW FIELD IS CONFIRMED BY THIS BLOCK, the
// hash still covers six fields, and no machine anybody already confirmed is
// asked again.
//
// NO REPOSITORY ROOT CROSSES THIS CHANNEL. The input carries the tab's folder
// and main runs its own review read on it, so the root that reaches that
// machine's git is the one that machine's own `rev-parse` answered.

/** Which folder on which machine, with the sha and the staged set the panel drew. */
export interface MachineCommitInput {
  machineId: string;
  /** The tab's folder ON THAT MACHINE. Main runs its own review read on it. */
  cwd: string;
  /**
   * The sha the panel drew, from the last review answer. Empty for a repository
   * with no commit yet.
   *
   * IT IS NOT THE SHA THAT CROSSES. Main re-reads the folder and sends the sha
   * IT just read. This one is compared against that read and a disagreement
   * commits nothing, which is the rule `machines:cloneProject` already follows
   * for the address a sheet drew.
   */
  headSha: string;
  /**
   * The staged paths the panel drew, repository relative.
   *
   * Main compares them against its own fresh read. HEAD does not move when
   * somebody or an agent runs `git add` in that folder, so a HEAD guard alone
   * would let a person commit content they never read in the Changes list.
   */
  staged: string[];
  /** The person's own text. It is the only thing on this channel they wrote. */
  message: string;
}

/**
 * What happened to one commit. Eight words, and none of them claims more than
 * Tortie knows.
 *
 *  - `committed`: that machine's git exited 0 and named a new commit.
 *  - `moved`: `HEAD` in that folder was not the sha Tortie read, so that
 *    machine committed nothing. A second send of one request lands here.
 *  - `staged-changed`: what is staged over there changed after Tortie read it,
 *    so nothing was committed.
 *  - `failed`: that machine's git exited non zero. What it printed is in
 *    `machineSaid`.
 *  - `timeout`: the deadline was hit on this Mac. The commit may still be
 *    running over there and it may have finished after Tortie stopped
 *    listening.
 *  - `unsure`: the link dropped, or that machine answered something Tortie
 *    could not read. IT NEVER MEANS NOTHING CHANGED. It is a separate word from
 *    `timeout` because a link that dropped after three seconds is not a
 *    deadline, and one sentence for both would say "within 5 minutes" about a
 *    thing that took three.
 *  - `offline`: Tortie is not connected to that machine, so nothing was sent.
 *  - `refused`: main decided on THIS MAC, before anything was composed. It
 *    covers seven states, being no message, writes not confirmed for that
 *    machine, a folder outside the confirmed folder, a folder that is not a
 *    repository, a sha the panel and main disagree on, a conflicted file, and
 *    nothing staged. Each carries its own sentence, so a person still reads
 *    exactly which one. `refused` always comes with `sent` equal to 0.
 */
export type MachineCommitOutcome =
  | 'committed'
  | 'moved'
  | 'staged-changed'
  | 'failed'
  | 'timeout'
  | 'unsure'
  | 'offline'
  | 'refused';

/** What one commit did, in the shape the surface reads. */
export interface MachineCommitResult {
  readonly outcome: MachineCommitOutcome;
  /** The commit that machine made, in full. Empty on every other outcome. */
  readonly sha: string;
  /** What that machine's HEAD holds now, as the answer reported it. Empty when it said none. */
  readonly headSha: string;
  /**
   * What git or a hook printed over there, decoded and capped. Null otherwise.
   *
   * It is that machine's own prose and the panel draws it UNDER Tortie's own
   * sentence, never in place of one. The far side caps it at
   * `REMOTE_COMMIT_ANSWER_MAX_BYTES` with `head -c` before it crosses.
   */
  readonly machineSaid: string | null;
  /**
   * The sentences a surface draws, composed in main.
   *
   * This is `RemoteCloneResult`'s shape rather than `MachineIndexWriteResult`'s.
   * Both ship today. It is this one because a person has to read Tortie's own
   * sentence and that machine's own words together, and only main has both.
   */
  readonly sentences: readonly string[];
  /** How many commands crossed. 0 for every outcome decided on this Mac. */
  readonly sent: number;
  /** The review read main ran before composing, in ms. */
  readonly readMs: number;
  readonly tookMs: number;
}
// ---- END PHASE 104 BLOCK ----

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
// One folder tree on another machine (Phase 90.3)
// ---------------------------------------------------------------------------
//
// WHAT THIS IS FOR. A project can now be a folder on another machine, and the
// Explorer in that tab has to list that machine's files. Phase 84's
// `machines:listDir` cannot do it: it lists folders and never files, and it
// answers about one folder per call.
//
// WHAT IT DOES NOT DO. It carries no file contents. It writes nothing on
// either computer. It reaches nothing outside the folder it was asked about,
// because the far side is given that folder as a positional parameter and
// walks down from it. It cannot be reached while Tortie is not connected to
// the machine.
//
// NO TIMER READS IT. The Explorer calls it when a tab is opened, when a folder
// is expanded past the fetched depth, and when a person presses Refresh. It is
// never called on a clock. Research 55 section 5.4 offered a two second poll
// and this phase does not take it, because nothing counts calls in flight to
// one machine and the far machine's effective ceiling is 10, measured in
// research 56 section 1.5.

/**
 * How deep one listing walks by default. 3.
 *
 * It is `find -maxdepth 3` from the folder that was asked about, so the
 * folder's own entries, their entries, and one level under those. A person
 * expanding past it costs exactly one more call, rooted where they expanded.
 *
 * MEASURED by `build/probe-remote-tree.mjs` against a real second machine.
 *
 * THE RULE the number is checked against is written in that probe before the
 * numbers are read, and it is a BOUND rather than a pick. Let ALLOWED be the
 * depths whose median is at or under 1,500 ms, whose answer is at or under
 * 262,144 bytes and whose entry count is at or under
 * {@link REMOTE_TREE_MAX_ENTRIES}. The shipped depth has to be in ALLOWED, and
 * it has to be at or above the smallest allowed depth carrying at least 95% of
 * the entries the deepest allowed depth carries.
 *
 * THE MEASUREMENTS, both on the operator's Mac Pro on 2026-08-19. On
 * /Users/gdc/.oh-my-zsh, which holds 1,492 entries, depth 3 measured 101.0 ms,
 * 68,610 bytes and 1,445 entries, being 96.8% of what depth 5 carried, so the
 * bound was "at or above 3" and 3 is inside it. On
 * /Users/gdc/Desktop/Meditations on Tech, which holds 51 entries at every
 * depth, the bound was "at or above 2" and the probe printed that the run
 * learned nothing about depth from a folder shallower than the walk.
 *
 * WHY IT IS A BOUND AND NOT A PICK, because the Phase 90.3 fix round got this
 * wrong twice before writing it down. A rule that picks one number from one
 * folder picks whatever that folder happens to be shaped like: "largest depth
 * inside the ceilings" picked 5 on a folder no ceiling bound, and "smallest
 * depth carrying 95%" picked 3 on one folder and 2 on the next. One folder on
 * one network can bound this number. It cannot choose it.
 *
 * WHAT IS NOT CLAIMED. Nothing here says 3 is the best depth. Too deep is
 * guarded by the three ceilings and by nothing else.
 */
export const REMOTE_TREE_DEPTH = 3;

/**
 * The most entries one listing carries. 4,000.
 *
 * Research 55 measured a whole 1,695 entry repository at 112,574 bytes and
 * 65.5 ms, so 4,000 entries stays well inside the 2,097,152 byte read cap.
 * {@link RemoteTreeListing.total} is what keeps the number honest on screen
 * when a folder holds more than this.
 */
export const REMOTE_TREE_MAX_ENTRIES = 4_000;

export interface RemoteTreeListInput {
  machineId: string;
  /** The folder to walk. Absolute, ON THAT MACHINE. */
  root: string;
  /** How deep to walk. Omitted means {@link REMOTE_TREE_DEPTH}. */
  depth?: number;
}

/** One entry under a folder on another machine. */
export interface RemoteTreeEntry {
  /** The absolute path ON THAT MACHINE. */
  path: string;
  /** Only these two. A link and a socket are reported as files. */
  kind: 'dir' | 'file';
}

/** Why a tree could not be read, or the tree. */
export type RemoteTreeListing =
  | {
      status: 'ok';
      /** The root, as the machine reported it. */
      root: string;
      /** Every entry the machine printed, sorted by path. */
      entries: readonly RemoteTreeEntry[];
      /** How many entries the machine counted before the cap. */
      total: number;
      /** True when the machine held more than it printed. */
      truncated: boolean;
      /** Epoch ms ON THIS MAC when the answer arrived. */
      readAt: number;
    }
  | {
      status: 'missing' | 'notdir' | 'denied' | 'unreachable' | 'notConnected';
      root: string;
    };

// ---------------------------------------------------------------------------
// Searching one folder on one machine (Phase 98, research 57 section 2)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `repo-search` from the frozen catalogue in
// src/main/machines/remote-scripts.ts, chosen by name, with the folder, the
// pattern, the flag letters and the two caps arriving there as positional
// parameters. NOTHING IS SENT TO THAT MACHINE except that constant text.
//
// THE ROWS ARE THE LOCAL ROWS. `files` carries `SearchFileResult`, which is what
// the ⌘⇧F stream carries, so the Search view draws one kind of row and
// `ResultsList`, `rows.ts` and `result-menu.ts` need no second shape.
//
// THE CAPS ARE THE LOCAL CAPS. `SEARCH_LIMITS.maxResults`,
// `SEARCH_LIMITS.maxPerFile` and `SEARCH_LIMITS.maxLineChars` from ./search.ts
// bound this answer too. No new number is invented for any of the three.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a remote
// search is drawn by the renderer from src/renderer/app/machine-copy.ts, where
// the vocabulary audit reads it. This answer carries a status word and counts.
//
// THERE IS NO STREAM, because there is nothing to stream. The far side has
// finished scanning before the first byte comes back: research 57 section 2.4
// measured a whole 33,023,414 byte tracked corpus at 174 to 176 ms.

/** Which files the far side read, or why it read none. */
export type MachineSearchMode =
  /** The folder is a git repository. Its tracked and untracked files were read. */
  | 'repo'
  /** The folder is not a repository. Every file under it was read. */
  | 'walk'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** That machine's grep did not accept the pattern. */
  | 'badPattern'
  /** Tortie is not connected to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One ⌘⇧F query against one folder on one machine. */
export interface MachineSearchInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /** The pattern. An empty one is refused before anything is sent. */
  readonly query: string;
  readonly isRegex: boolean;
  readonly isCaseSensitive: boolean;
  readonly matchWholeWord: boolean;
  /** Clamped to SEARCH_LIMITS.maxResults. Omitted means that number. */
  readonly maxResults?: number;
}

/** What one machine answered about one folder. */
export interface MachineSearchResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was searched, on that machine. */
  readonly cwd: string;
  readonly mode: MachineSearchMode;
  /** The rows, in the shape the local search already produces. */
  readonly files: SearchFileResult[];
  /** Matching lines delivered. */
  readonly totalMatches: number;
  /** Files with at least one match. */
  readonly totalFiles: number;
  /** The match cap cut the answer. These are the first N, not all of them. */
  readonly capped: boolean;
  /** The size ceiling cut the answer on that machine. */
  readonly truncated: boolean;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---------------------------------------------------------------------------
// The file names in one folder on one machine (Phase 99, research 57 section 6)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `repo-files` from the frozen catalogue in
// src/main/machines/remote-scripts.ts, chosen by name, with the folder and the
// name cap plus one arriving there as positional parameters. NOTHING IS SENT TO
// THAT MACHINE except that constant text.
//
// IT CARRIES NAMES AND NEVER CONTENTS. A person's source stays on the computer
// it is on. Opening one of these names is a separate read, and it lands in the
// read only tab Phase 90.3 shipped.
//
// WHY THE RENDERER ASKS AND MAIN'S RANKING WORKER DOES NOT. The worker reaches
// a local root by spawning ripgrep in it. It cannot spawn anything on another
// computer, and handing it a path that names a folder over there would make it
// read a DIFFERENT file here or nothing at all. So the palette reads the names
// through this channel and hands the whole list to the worker, which adopts it.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a name
// list is drawn by the renderer from src/renderer/app/machine-copy.ts, where
// the vocabulary audit reads it. This answer carries a mode word and counts.

/**
 * The most file names one read carries. 50,000.
 *
 * CHOSEN rather than measured, and bounded by two measured points from research
 * 57 section 6.3. On the operator's tailnet, 1,096 tracked files were 31,964
 * bytes and 15,581 files were 657,058 bytes in 108.6 to 201.0 ms, while 289,980
 * files were 43,954,137 bytes in 8,218 to 10,563 ms. 50,000 names is about
 * 2,100,000 bytes at the rate the middle point sets, which is well inside the
 * ceiling below and far away from the third point. The local palette holds
 * 200,000 paths per project. This number is smaller because these ones cross a
 * link.
 */
export const REMOTE_FILE_LIST_MAX = 50_000;

/**
 * The most bytes one name list may hold before encoding. 4,194,304.
 *
 * The same ceiling `REMOTE_SEARCH_MAX_BYTES` carries, and enforced the same
 * way: the script reads ONE BYTE PAST IT, counts what it read, and prints `1`
 * or `0`. The number is a constant in the script text as well, and condition 53
 * of `build/conformance-machines.mjs` asserts the two agree. Two copies of one
 * number is how one of them goes stale.
 */
export const REMOTE_FILE_LIST_MAX_BYTES = 4_194_304;

/** Which files the far side named, or why it named none. */
export type MachineFileListMode =
  /** The folder is a git repository. Its tracked and untracked files are here. */
  | 'repo'
  /** The folder is not a repository. Every file under it is here. */
  | 'walk'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** Tortie is not connected to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One name list read against one folder on one machine. */
export interface MachineFileListInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /** Clamped to {@link REMOTE_FILE_LIST_MAX}. Omitted means that number. */
  readonly maxPaths?: number;
}

/** What one machine answered about the names in one folder. */
export interface MachineFileListResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineFileListMode;
  /** Relative to `cwd`, POSIX separators, no leading `./`. */
  readonly paths: readonly string[];
  /** The name cap cut the list. These are the first N, not all of them. */
  readonly capped: boolean;
  /** The byte ceiling cut the answer on that machine. */
  readonly truncated: boolean;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---------------------------------------------------------------------------
// The last lines one session on one machine printed (Phase 100, research 57
// section 3)
// ---------------------------------------------------------------------------
//
// ONE READ, ONE ANSWER. Nothing is written on either computer. The command that
// crosses is `capture-pane -p -e -J -t <id> -S -<n>`, which is row 5 of the verb
// ledger in src/main/machines/exec-plane.ts with `kind: 'read'` and
// `repeat: 'safe'`. No script is added to the frozen catalogue and no verb is
// added to the ledger.
//
// A REAL REMOTE SCROLLBAR IS REFUSED, and this channel is the smaller
// affordance research 57 section 3.1 adopted in its place. A scrollbar over the
// exec plane needs `copy-mode`, which is on no ledger row, and an open family of
// `send-keys -X` commands through the door Phase 89 narrowed to one fixed five
// element argv. A scrollbar over the control connection would be the first
// interactive write on the one carriage with no gate. Pulling 25,000 lines was
// measured at about 0.51 s, which is fine for a menu item and 32 times too slow
// for a wheel notch against the 16 ms budget in `WHEEL_COALESCE_MS`.
//
// NOTHING CALLS IT ON A CLOCK. A person opens the panel or presses a depth
// button, and each of those is one read.
//
// NO PROSE CROSSES THIS CHANNEL. Every sentence a person reads about a read is
// drawn by the renderer from src/renderer/app/machine-copy.ts, where the
// vocabulary audit reads it. This answer carries a mode word, the body and
// counts.
//
// IT IS NOT THE SAVED OUTPUT PANEL. `machines:*` saved output is a background
// copy this Mac keeps through `storeCapsuleText`. This read goes to the machine
// when a person asks, it is not stored anywhere, and it makes no snapshot
// generation.

/** Why a read of one session's last lines answered the way it did. */
export type MachineSessionLinesMode =
  /** The lines came back. */
  | 'read'
  /** Tortie holds no row for this session on any machine right now. */
  | 'noSession'
  /** Tortie is not signed in to that machine at this moment. */
  | 'notConnected'
  /** The machine did not answer inside the deadline. */
  | 'unreachable';

/** One read of the last lines of one session on one machine. */
export interface MachineSessionLinesInput {
  /** Tortie's own id for the session. Never a name. */
  readonly sessionId: string;
  /** How far back to read. 0 is the screen alone. Clamped in main. */
  readonly lines: number;
}

/** What one machine answered about one session's last lines. */
export interface MachineSessionLinesResult {
  readonly sessionId: string;
  /** Null for every mode but 'read' when Tortie has no row to name one. */
  readonly machineId: string | null;
  readonly machineLabel: string | null;
  readonly mode: MachineSessionLinesMode;
  /** The body. Empty for every mode but 'read'. Drawn verbatim, never parsed. */
  readonly text: string;
  /** The depth asked for, after the clamp. */
  readonly asked: number;
  /** Lines in `text`. A final line with no newline after it counts as one. */
  readonly lines: number;
  /** Byte length of `text` in utf8. */
  readonly bytes: number;
  /** True when this Mac dropped the oldest bytes to fit the ceiling. */
  readonly truncated: boolean;
  /**
   * Epoch ms on THIS MAC when the answer was made.
   *
   * For a `read` it is the instant the bytes finished arriving, taken before
   * anything was stripped. For the three refusals nothing arrived, so it is the
   * instant the refusal was decided.
   */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

/**
 * The deepest read the panel offers, and the hard clamp in main. 25,000.
 *
 * Research 57 section 3.2 measured this depth against the operator's Mac Pro
 * over a Tailscale path with a 6 ms ping. tmux produced 4,200,243 bytes in
 * 0.13 s and the payload crossed in 1.22 s, composed at about 0.51 s for the
 * whole read on the shorter measurement. Nothing deeper has been measured, so
 * nothing deeper is offered.
 */
export const REMOTE_SESSION_LINES_MAX = 25_000;

/**
 * What the panel reads when it opens. 1,000.
 *
 * CHOSEN rather than measured. It is deep enough to hold an agent's last answer
 * and small enough that the panel paints without a wait: research 57 section 3.2
 * measured 10,000 lines at 1,688,241 bytes and about 0.25 s composed, and 1,000
 * lines is a tenth of that.
 */
export const REMOTE_SESSION_LINES_DEFAULT = 1_000;

/**
 * The most bytes one answer may hold on this Mac. 8,388,608.
 *
 * CHOSEN at about twice the measured worst case above, so an ordinary read is
 * never cut and a runaway one is bounded. `MAX_BUFFER_BYTES` in the exec plane
 * is 64 MB, so this ceiling bites first and reports itself in
 * {@link MachineSessionLinesResult.truncated} rather than failing the call.
 */
export const REMOTE_SESSION_LINES_BYTES_MAX = 8_388_608;

/**
 * The four depths the panel offers, shallowest first.
 *
 * 0 is the screen alone, which `capture-pane -S -0` composes.
 */
export const REMOTE_SESSION_LINE_DEPTHS = [0, 1_000, 10_000, 25_000] as const;

// ---------------------------------------------------------------------------
// The runs for the branch checked out on another machine (Phase 105, research
// 57 section 5)
// ---------------------------------------------------------------------------
//
// TWO READS AND THEY GO TO DIFFERENT PLACES. The first asks the machine which
// branch is checked out in one folder and which repository that folder is. The
// second asks github.com, from this Mac, with the `gh` this Mac already has.
//
// NO CREDENTIAL AND NO `gh` CROSSES. That is the property this whole feature
// rests on. No token, no `gh` invocation and no GitHub host name is sent to the
// machine. Four short strings travel back, being a mode word, the origin
// address, the branch name and the commit HEAD points at. Condition 55d of
// build/conformance-machines.mjs reads the script text and fails on any of the
// nine words a credential would travel in, which is the executable form of the
// sentence rather than a promise about it.
//
// NOTHING IS WRITTEN, on either computer and on GitHub. No new write script, no
// change to the catalogue's two writers, and every gh shape the allowlist
// permits is a read.
//
// NOTHING CALLS IT ON A CLOCK. Main cannot see a push made on another computer,
// so there is no watch and no poll. A person expands the section or presses
// Refresh, and each of those is one read. The panel says the list does not
// refresh.
//
// A RUN'S JOBS AND STEPS ARE NOT HERE. That is a second channel and a second gh
// process per row, and research 57 section 5 priced one channel. A row opens on
// GitHub instead.

/** Why one read of the runs on a remote tab answered the way it did. */
export type MachineRunsMode =
  /** The machine answered and gh was asked. `health` says how that went. */
  | 'ok'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** The repository has no github.com address for its origin. */
  | 'notGitHub'
  /** No branch name could be read, so there is nothing to ask GitHub about. */
  | 'noBranch'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One runs read against one folder on one machine. */
export interface MachineRunsInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /**
   * Rows to ask gh for. Clamped to 1 and to `MAX_LIMIT`, which is 50. Omitted
   * means the local Runs section's own default, which is 10.
   */
  readonly limit?: number;
}

/** What one machine and then GitHub answered about one folder's runs. */
export interface MachineRunsResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineRunsMode;
  /** `owner/repo`, or null when there is no github.com origin over there. */
  readonly ownerRepo: string | null;
  /** The branch checked out over there, or null. */
  readonly branch: string | null;
  /** The commit HEAD points at over there, or null. */
  readonly headSha: string | null;
  /** What gh was actually asked for, after the clamp. */
  readonly limit: number;
  readonly runs: readonly ActionsRun[];
  /** Rows GitHub sent that the parser refused, with the field named. */
  readonly issues: readonly ActionsParseIssue[];
  /** gh's own ladder. The gh that produced it ran on this Mac. */
  readonly health: ActionsHealth;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}

// ---- PHASE 106 ----
// Which branch is checked out in one folder on another machine (Phase 106,
// research 57 section 5).
//
// WHAT THIS IS FOR. A project can be a folder on another machine. On that tab
// the Source Control view already draws the changed files and the workflow
// runs. It did not say which branch is checked out over there, so a person had
// to open a session and type. This call answers with the branch, the branch it
// follows, and how far ahead and how far behind it is.
//
// IT IS A SECOND READ RATHER THAN A WIDER `readRuns`. Phase 105's `repo-facts`
// gives the branch name and the commit HEAD points at. It gives neither the
// upstream nor the two counts, which are two of the three things this call must
// show. Widening it would make every Runs read pay for a group nobody opened,
// which is the union script shape research 57 section 5.3 refused.
//
// NOTHING IS WRITTEN, on either computer. The `repo-branch` script is a read,
// the catalogue's two writers did not move, and this call cannot change what is
// checked out over there.
//
// NOTHING CALLS IT ON A CLOCK. A person expands the group or presses Refresh,
// and each of those is one read. Main cannot see a branch switched on another
// computer, so there is no watch and no poll.
//
// TORTIE NEVER FETCHES ON THAT MACHINE. The ahead and behind counts are
// measured against the copy of the upstream that machine last fetched, so the
// answer can be older than what is on the server at the moment it is read. The
// renderer says so on screen, and condition 56i of
// build/conformance-machines.mjs fails the script if it ever names `git fetch`,
// `git pull` or `git remote update`.

/** Why one read of the branch on a remote tab answered the way it did. */
export type MachineBranchMode =
  /** A branch is checked out and its details were read. */
  | 'ok'
  /** A commit is checked out directly, or the repository has no commits. */
  | 'noBranch'
  /** The branch name was read and its details could not be. */
  | 'noDetails'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One branch read against one folder on one machine. */
export interface MachineBranchInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
}

/** What one machine answered about the branch checked out in one folder. */
export interface MachineBranchResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineBranchMode;
  /** The branch checked out over there, or null. */
  readonly branch: string | null;
  /** The full commit its tip points at, or null. */
  readonly sha: string | null;
  /** The same commit as git shortens it, or null. */
  readonly shortSha: string | null;
  /** The branch it follows, e.g. origin/main, or null when none is set. */
  readonly upstream: string | null;
  /** True when that machine no longer has the branch it is set to follow. */
  readonly upstreamGone: boolean;
  /** Commits it holds that the followed branch does not. 0 when unknown. */
  readonly ahead: number;
  /** Commits the followed branch holds that it does not. 0 when unknown. */
  readonly behind: number;
  /**
   * True when a tracking answer arrived and this end could not read it.
   *
   * THE HONESTY FIELD, AND THE RENDERER DRAWS IT. An empty tracking answer
   * means level and reads as 0 and 0, so two zeroes alone cannot tell level
   * apart from unread. The flag is set when the answer that arrived is not
   * empty and is not exactly one of the four shapes git prints, being `gone`,
   * `ahead N`, `behind N` and `ahead N, behind M`. When it is set, `ahead` and
   * `behind` are both 0 whatever fell out of a partial parse, because a number
   * nobody measured is worse than a sentence saying the answer could not be
   * read. Phase 99 carried a flag the renderer never read and a cut list drew
   * as a whole one. This one is drawn.
   */
  readonly trackUnreadable: boolean;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}
// ---- END PHASE 106 ----

// ---- PHASE 107 ----
// The commit graph of one folder on another machine (Phase 107, research 57
// section 5).
//
// WHAT THIS IS FOR. A project can be a folder on another machine. On that tab
// the Source Control view already draws the changed files, the branch and the
// workflow runs. It did not draw the history, so a person had to open a session
// over there and type. This call answers with a page of the newest commits, the
// two anchors the swimlane picture needs, and the marks that say which commits
// are ahead of the followed branch and which are behind it.
//
// IT IS A SECOND READ RATHER THAN A WIDER `readBranch`. A history read costs
// tens of thousands of bytes and a branch read costs a hundred. Folding them
// into one call would make every Branch read pay for a group nobody opened,
// which is the union script shape research 57 section 5.3 refused. So each
// group pays for itself and a collapsed group costs nothing.
//
// NOTHING IS WRITTEN, on either computer. The `repo-history` script is a read,
// the catalogue's two writers did not move, and there is no checkout, no branch
// and no cherry pick behind this channel. The local History group has all three
// and this one has none.
//
// NOTHING CALLS IT ON A CLOCK. A person expands the group, presses Load more or
// presses Refresh, and each of those is one read. Main cannot see a commit made
// on another computer, so there is no watch and no poll.
//
// THE ANSWER IS CAPPED AT 500 COMMITS AND MAIN CLAMPS IT. One commit is about
// 270 base64 bytes, so 500 is about 135,000 bytes and 20,000 would be 5,400,000
// bytes in one answer that main buffers whole. Condition 57j of
// build/conformance-machines.mjs holds the two constants below.
//
// THE FILES ONE COMMIT CHANGED ARE NOT READ. Reading them is a second script
// and a third one for the two sides of a file, and this phase ships one script.
// The renderer says so on screen.

/**
 * The page a person gets on the first expand, and what Load more adds.
 *
 * 50, which is what `HISTORY_PAGE` in `src/renderer/scm/depth.ts` already gives
 * the local History, so the two page at the same rate and a person learns one
 * number.
 */
export const REMOTE_HISTORY_PAGE = 50;

/**
 * The most commits Tortie will read from another machine in one answer.
 *
 * 500, and it is a wire budget rather than a taste. One commit is about 270
 * base64 bytes, so 500 is about 135,000 bytes and 20,000 would be 5,400,000
 * bytes in one answer that main buffers whole, hands to a parser whole and
 * sends over one IPC message whole. `MAX_LOG_COUNT` in
 * `src/main/git/service.ts` is 20,000 because a local walk pays for it in local
 * disk reads. A remote walk pays for it over a link a person's laptop may be
 * holding on a hotel network. Condition 57j of
 * `build/conformance-machines.mjs` holds this at 500.
 */
export const REMOTE_HISTORY_MAX_COMMITS = 500;

/** Why one read of the history on a remote tab answered the way it did. */
export type MachineHistoryMode =
  /** The walk answered and it carried at least one commit. */
  | 'ok'
  /**
   * The folder is a repository and the walk carried no commit.
   *
   * ONE WORD FOR TWO CAUSES. A repository with no commits yet answers this, and
   * so does a repository with no branches, tags or remote branches to walk
   * from. The sentence on screen names both.
   */
  | 'noCommits'
  /** The folder is there and git does not track it. */
  | 'notRepo'
  /** There is no folder at that path on that machine. */
  | 'missing'
  /** The folder is there and that account cannot read it. */
  | 'denied'
  /** Tortie is not signed in to that machine. Nothing was asked. */
  | 'notConnected'
  /** The machine did not answer, or answered something unreadable. */
  | 'unreachable';

/** One history read against one folder on one machine. */
export interface MachineHistoryInput {
  readonly machineId: string;
  /** The folder on that machine. Absolute, and never a path on this Mac. */
  readonly cwd: string;
  /**
   * Commits to draw. Clamped to 1 and to {@link REMOTE_HISTORY_MAX_COMMITS}.
   *
   * The window is re-walked from the top on every read rather than continued
   * from a cursor. A cursor has to be right about what happened on the far side
   * between two presses, and it cannot be, because a commit made over there in
   * between shifts the window and the two pages then overlap or drop a row.
   */
  readonly maxCount?: number;
}

/** What one machine answered about the commits in one folder. */
export interface MachineHistoryResult {
  readonly machineId: string;
  /** That machine's own label, so the renderer never composes one. */
  readonly machineLabel: string;
  /** The folder that was read, on that machine. */
  readonly cwd: string;
  readonly mode: MachineHistoryMode;
  /** The page, newest first, in topological order. */
  readonly entries: readonly GitGraphLogEntry[];
  /** What was asked for after the clamp. */
  readonly maxCount: number;
  /** The ceiling itself, so no sentence on screen writes the number. */
  readonly ceiling: number;
  /**
   * THE CUT. True when the walk found more commits than the page holds.
   *
   * The far side is asked for one commit more than the page, and this is set
   * when that extra commit arrived. The extra one is dropped rather than drawn.
   */
  readonly hasMore: boolean;
  /**
   * THE FAR END. True when `maxCount` is the ceiling and `hasMore` is true.
   *
   * There are older commits in that folder and Tortie does not read them here.
   * The renderer draws no Load more button in this state and says why.
   */
  readonly atCeiling: boolean;
  /** HEAD's tip over there, or null. */
  readonly headSha: string | null;
  /** The tip of the branch HEAD follows over there, or null. */
  readonly upstreamSha: string | null;
  /** `git merge-base` of those two over there, or null. */
  readonly mergeBase: string | null;
  /** How many commits in the page carry an unpushed or unpulled mark. */
  readonly markedCount: number;
  /**
   * THE SECOND CUT. True when the mark read came back at its own cap.
   *
   * The marks are read with the same count as the walk. When that many arrived,
   * an older commit is drawn without a mark whether it has one or not, and the
   * renderer says so. Phase 99 carried a truncation flag through main that the
   * panel never read, so a cut list drew as a whole one. This one is drawn, and
   * so are `hasMore` and `atCeiling`.
   */
  readonly divergenceTruncated: boolean;
  /** Bytes the machine's answer carried, so a probe can report them. */
  readonly answerBytes: number;
  /** Epoch ms ON THIS MAC when the answer arrived. */
  readonly readAt: number;
  /** Wall time from the call to the answer, in ms. The round trip is in it. */
  readonly elapsedMs: number;
}
// ---- END PHASE 107 ----

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
