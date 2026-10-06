/**
 * Phase 68. The renderer state behind Settings → Machines.
 *
 * ONE STORE, and it is deliberately not folded into settings-store.ts. That
 * store carries the persisted settings every window reads. This one carries a
 * form a person is typing into and the live bytes of one program, which no
 * other window has any business subscribing to.
 *
 * WHAT THIS STORE CANNOT DO, and the reason it is worth stating here rather
 * than only in the spec. Nothing in this file starts anything by itself. Every
 * call that can cause a process to exist is reachable from a person's press
 * and from nothing else: no reducer, no subscription and no effect calls one.
 * Reading the machines file cannot reach them, which is refusal 8 of CLAUDE.md
 * expressed in the one renderer module that could otherwise break it.
 *
 * PHASE 340 CHANGED WHICH PRESS STARTS WHAT, and the list is the spec's
 * (build/p340/SPEC.md section 5.3 and condition 132):
 *
 *  - `openAdd`, the Add a machine button, also runs the pinned Tailscale
 *    program once, the same local read the old Find button ran (D6). It reaches
 *    no other machine.
 *  - `usePeer`, a click on a tailnet row, fills the form and starts the check.
 *    So does Check, or Return, on a typed address (`startDraftTest`), Check
 *    again (`checkAgain`) and a candidate button (`pickCandidate`).
 *  - `addMachine`, the Add press, confirms the hashed lines AND prepares the
 *    machine. It is the ONE place a confirmation is followed by a prepare in
 *    the same press (D7). `confirmMachine` confirms and nothing else (D12).
 *  - `installKey` starts the check again once the key is on, reusing the open
 *    check's draft and id, and when that check was a CONFIRMED saved row's and
 *    it answers ok, prepares it (D10, D12). A person pressed one button, and
 *    what it can start is what they could start themselves from the same row.
 *  - `answerAsk` and `sendTestInput` write a person's answer to the running
 *    check and start nothing new.
 *
 * `receiveTestEvent` is what the test stream calls, and it starts nothing: it
 * writes bytes, a question or an outcome into the open check, and it resolves
 * the promise `installKey` is waiting on. The prepare that follows is written
 * in `installKey`'s own body, after its own await.
 *
 * THE GATE IS IN MAIN, not here. `startSavedTest` reaches
 * `assertMachineMayConnect` on the other side of the bridge, so an unconfirmed
 * row refuses there and this file never has to decide it. `startDraftTest`
 * carries the person's own keystrokes and has no row and no confirmation to
 * check, which is why the two are separate calls rather than one with a flag.
 */

import { create } from 'zustand';
import type {
  InstalledGmuxApi,
  MachineAddInput,
  MachineAgentsView,
  MachineConfirmSheet,
  MachineDraft,
  MachineKeyInstallResult,
  MachineKeySheet,
  MachinePrepareResult,
  MachineRowView,
  MachineTestAsk,
  MachineTestClass,
  MachineTestEvent,
  MachineTestInput,
  MachineTestOutcome,
  MachineTestStarted,
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult
} from '@shared/ipc';
import type { MachineColor } from '@shared/machines';
import { MACHINE_DEFAULT_COLOR } from '@shared/machines';
// Phase 110 fix: the renderer's one reader of a main-process error payload.
// It answers the sentence main wrote instead of the JSON it travelled in.
import { errorText } from '../state/errors';
import {
  ADD_NEEDS_CHECK,
  BRIDGE_MISSING,
  KEY_DISABLED_REASON,
  OPEN_FOLDER_NEEDS_CONFIRM,
  PREPARE_NEEDS_CONFIRM
} from './machines-copy';
import { gmuxBridge } from '../bridge';

type MachinesApi = InstalledGmuxApi['machines'];

/** The machines surface, or null on a build with no bridge at all. */
function bridge(): MachinesApi | null {
  return gmuxBridge()?.machines ?? null;
}

/**
 * The Add a machine form. Every field is a string because it is what a person
 * typed, including `port`, which is only a number once it has been checked.
 * `label` and `colour` are presentation and never reach the hash.
 */
export interface MachineFormState {
  host: string;
  label: string;
  color: MachineColor;
  user: string;
  port: string;
  remoteTmuxPath: string;
}

export function emptyForm(): MachineFormState {
  return {
    host: '',
    label: '',
    color: MACHINE_DEFAULT_COLOR,
    user: '',
    port: '',
    remoteTmuxPath: ''
  };
}

/** One live connection test, draft or saved. At most one exists at a time. */
export interface LiveTest {
  started: MachineTestStarted;
  /** The row this test belongs to, or null for the Add a machine form. */
  savedId: string | null;
  /**
   * The id a draft test was run for, and the id the new row will carry. Null
   * for a saved row's test.
   *
   * It is fixed when the test starts and never recomputed, because the confirm
   * hash covers the id. Recomputing it at add time would let a person's later
   * keystroke move the hash out from under the sheet they read, and main would
   * then refuse the add with a sentence about a machine that changed. PHASE 340
   * leans on this twice: editing Name in the Add step changes the label and
   * never this id (D28), and the check after a key install reuses it, because
   * the key Tortie just made is keyed by it (D10).
   */
  draftId: string | null;
  /**
   * The four values a draft test ran against. Null for a saved row's test.
   *
   * The add call is written from THESE and not from the form, so the row that
   * is written is the machine that was tested rather than whatever the form
   * holds at the moment of the click.
   */
  draft: MachineDraft | null;
  /** The bytes the program printed, with ANSI already stripped by main. */
  transcript: string;
  outcome: MachineTestOutcome | null;
  running: boolean;
  /**
   * PHASE 340 (D9). The question the running check is waiting on, or null.
   *
   * It is the OPEN question: it is cleared when the person answers it, when the
   * program prints anything after it (which is what an answer typed under
   * Details looks like) and when the check ends. Trust it is drawn only while
   * this is a host key question of the live test.
   */
  ask?: MachineTestAsk | null;
  /**
   * PHASE 340's fix round. When this window received the check's end, as a
   * clock reading, or null while it runs. A machine row compares it with its
   * last sign-in's own time, so a check that answered ok makes only an OLDER
   * sign-in that wanted a key stale, never a Prepare refused after it.
   */
  endedAt?: number | null;
}

/**
 * The transcript Tortie keeps in memory. Main stops the test past 256 KB, so
 * this floor is only ever reached by a program that printed right up to it.
 * The oldest bytes go first, because the answer is at the end.
 */
const TRANSCRIPT_MAX_CHARS = 256 * 1024;

/** Trim a value the person typed, and read an empty field as "not set". */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** A port a person typed, or null when the field is empty or not a number. */
export function portOf(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^[0-9]{1,5}$/.test(trimmed)) return null;
  const port = Number(trimmed);
  return port >= 1 && port <= 65_535 ? port : null;
}

/** PHASE 340's fix round. Whether anything is typed under Advanced. */
export function advancedFilled(form: MachineFormState): boolean {
  return (
    form.user.trim() !== '' ||
    form.port.trim() !== '' ||
    form.remoteTmuxPath.trim() !== ''
  );
}

/**
 * The four execution bearing values a person types, as the test and the add call
 * want them.
 *
 * There are FIVE execution bearing fields on the hash. The fifth is the accepted
 * version, and it is not here because nobody types it. Main puts it on the
 * sheet for a version it read and has not measured, and the add sends back the
 * sheet's own value (Phase 340, D7).
 */
export function draftOf(form: MachineFormState): MachineDraft {
  return {
    host: form.host.trim(),
    user: orNull(form.user),
    port: portOf(form.port),
    remoteTmuxPath: orNull(form.remoteTmuxPath)
  };
}

/**
 * The id a new row carries, derived from the name the person typed, or from
 * the address when they typed no name.
 *
 * The id is the record key, so it must match `MACHINE_ID_PATTERN` and it must
 * be unique in the file. A name that reduces to nothing usable falls back to
 * `machine`, and a collision takes the next free number. The id is drawn on
 * the row afterwards, because it is what a person hand editing the file has
 * to type.
 */
export function machineIdFrom(
  label: string,
  host: string,
  taken: ReadonlySet<string>
): string {
  const source = label.trim() !== '' ? label : host;
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '')
    .slice(0, 32);
  const base = slug === '' ? 'machine' : slug;
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
}

/**
 * The names Tailscale hands back for a machine that has no useful one.
 *
 * An iOS device reports the HostName `localhost`, and main falls back to the
 * HostName when it has nothing better, so a person with two iPhones on their
 * tailnet reads `localhost` twice and cannot tell the rows apart.
 */
const PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
  '',
  'localhost',
  'localhost.localdomain'
]);

/**
 * The name to draw for one machine on the tailnet.
 *
 * The full address is already on the wire as `host`, and its first label is
 * the name Tailscale itself shows in its own list. When the name Tortie was
 * given says nothing, that label is used instead. The address is drawn beside
 * it either way, so nothing is hidden by this.
 *
 * PHASE 340 moved it here from AddMachine.tsx, which re-exports it, because a
 * pick now writes this name into the form (D28) and the store may not import
 * the component that reads it.
 */
export function peerDisplayName(peer: TailscalePeerView): string {
  if (!PLACEHOLDER_NAMES.has(peer.name.trim().toLowerCase())) return peer.name;
  const label = peer.host.split('.')[0] ?? '';
  return label === '' ? peer.name : label;
}

/**
 * The sheet a finished draft test handed back, or null.
 *
 * THIS IS THE WHOLE OF THE ADD FLOW'S AGREEMENT, so it is worth saying why the
 * renderer does not compose it. The hash a person's agreement binds to covers
 * the machine id and the five execution bearing fields, and one of those five
 * is the program path, which is not known until the machine itself answers. So
 * main composes the hash and the lines together at the end of the test and
 * sends both on the outcome. The renderer draws those exact lines and sends
 * that exact hash back. An earlier build composed its own lines here and sent
 * an empty hash, and every add was refused as stale, because a hash the
 * renderer invents can never be the hash main computes.
 *
 * PHASE 340. Main composes a sheet for every `ok` check now, whatever the
 * version (D8 as revised), so the Add step is drawn for every `ok` check that
 * carried an id and named a path.
 */
export function sheetOf(test: LiveTest | null): MachineConfirmSheet | null {
  if (test === null || test.savedId !== null || test.draftId === null) return null;
  if (test.outcome === null || test.outcome.class !== 'ok') return null;
  if (test.outcome.resolvedPath === null) return null;
  return test.outcome.sheet ?? null;
}

/**
 * The three outcomes a key can do anything about.
 *
 * `password-required` is the machine asking for a password, which is the stock
 * Mac with Remote Login on and no key for Tortie on it. It is the one of the
 * three where pressing the button can succeed immediately, and it was missing
 * from the first build of this phase.
 *
 * `auth-refused` is the machine turning the sign in down, which is what a
 * missing key looks like when the machine offers no password at all.
 *
 * `refused` is the machine not accepting connections, which a key does not fix
 * by itself. It is in the set anyway, because a person who has just turned on
 * Remote Login is one step away from needing the key and should not have to
 * run the test twice to be offered it.
 *
 * This set is the second half of one gate. Main decides whether a sheet exists
 * at all, and `connection-test.ts` uses the same three classes.
 */
const KEY_INSTALL_CLASSES: ReadonlySet<MachineTestClass> = new Set<
  MachineTestClass
>(['password-required', 'auth-refused', 'refused']);

/**
 * The sheet a person reads before Tortie makes a key, or null.
 *
 * ONE RULE IN ONE PLACE. The store sends the hash on this sheet back to main,
 * and the surface draws the lines on it. If the two disagreed about when the
 * block exists, a person could read one sheet and have another sent, so both
 * ask this function.
 */
export function keySheetOf(
  outcome: MachineTestOutcome | null
): MachineKeySheet | null {
  if (outcome === null) return null;
  if (!KEY_INSTALL_CLASSES.has(outcome.class)) return null;
  return outcome.keySheet ?? null;
}

/**
 * One key install, for one machine, at one moment.
 *
 * THE PASSWORD IS NOT HERE AND MUST NEVER BE. `installKey` takes it as an
 * argument, hands it to the bridge, and lets it go when the call ends. The
 * field that collects it lives in the component and is cleared on the same
 * tick the call is made. Nothing in this store, and nothing in any snapshot
 * of it, holds what a person typed.
 */
export interface KeyInstallState {
  /** The row the install is for, or null for the Add a machine form. */
  savedId: string | null;
  running: boolean;
  /** What main answered. Null while the call is in flight. */
  result: MachineKeyInstallResult | null;
}

/**
 * The path the machine itself reported, or null when no test has finished
 * with an answer.
 */
export function resolvedPathOf(test: LiveTest | null): string | null {
  if (test === null || test.savedId !== null) return null;
  if (test.outcome === null || test.outcome.class !== 'ok') return null;
  return test.outcome.resolvedPath;
}

/**
 * PHASE 340. The one panel a machine row can have open under it (D11, section
 * 5.2). It is UI state, kept here rather than in the row's component so the
 * native menu's rows, run from ./machine-menu.ts, can open one.
 */
export type MachinePanel = 'what' | 'review' | 'test' | 'remove' | 'prepare';

/** PHASE 340. The machine just added, while the Add flow shows it ready. */
export interface AddedMachine {
  id: string;
  label: string;
}

export interface MachinesStoreState {
  /** What the file says and what is on record. Null until the first read. */
  machines: MachinesResult | null;
  /** False when this build's preload has no machines surface. */
  supported: boolean;
  /** The id of the row a call is in flight for, or 'add' for the Add flow. */
  busy: string | null;

  /** True while the Add a machine surface is open. */
  adding: boolean;
  form: MachineFormState;
  /** PHASE 340. True once Type an address… has revealed the address field. */
  addressOpen: boolean;
  /** PHASE 340. True while Advanced is open. Type its path… opens it. */
  advancedOpen: boolean;
  /** PHASE 340. True while the check's Details is open. A prompt opens it. */
  detailsOpen: boolean;
  /**
   * PHASE 340 (D28). The name the last pick wrote into the form, and the
   * address it picked, so a later edit to the address does not carry the
   * picked machine's name onto another machine.
   */
  pickedLabel: string | null;
  pickedHost: string | null;
  /**
   * PHASE 340's fix round. The address the account, port and program path
   * under Advanced were typed for, or null while they belong to no address yet
   * (typed before any address, or empty). A pick of ANOTHER machine clears
   * them, because the pick starts the check at once and Advanced may be shut,
   * so values typed for one address would sign in to the picked machine and
   * run a typed path there unseen (the verifiers' finding). Values typed
   * before any address are the person's own choice for the machine they pick.
   */
  advancedHost: string | null;
  /** PHASE 340. The machine the Add press wrote, while the flow shows it. */
  added: AddedMachine | null;

  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  /**
   * When the last look at Tailscale finished, as a clock reading. Null until
   * one has. A look that found nothing is still a look, so this is set on the
   * failing path as well as on the succeeding one.
   */
  tailscaleReadAt: number | null;

  test: LiveTest | null;

  /**
   * What Prepare answered, per machine id. Empty until a Prepare answers.
   *
   * Kept per id rather than as one value, because a person may prepare two
   * machines in one sitting and the answer for the first must not be redrawn
   * under the second.
   */
  prepared: Readonly<Record<string, MachinePrepareResult>>;
  /** The id a prepare is in flight for, or null. */
  preparing: string | null;

  /**
   * The id an acceptance is in flight for, or null (Phase 83).
   *
   * Kept apart from `busy` and from `preparing` because accepting a version
   * runs one call and then a second one, being the acceptance and the prepare
   * that follows it, and the button has to stay disabled across both.
   */
  accepting: string | null;

  /**
   * The key install for the machine a test is open on, or null.
   *
   * At most one exists, because at most one connection test exists and the
   * install shares that one slot in main.
   */
  keyInstall: KeyInstallState | null;

  /** PHASE 340. The panel open under each row, by row id. */
  panels: Readonly<Record<string, MachinePanel>>;
  /** PHASE 340. Main's sentence for a call a row's control made, by row id. */
  rowErrors: Readonly<Record<string, string>>;

  /**
   * Phase 110. Phase 109's answer about which agents each machine has, keyed
   * by machine id. Empty until the first read.
   */
  agentsByMachine: Readonly<Record<string, MachineAgentsView>>;
  /** Phase 110. The machines a Rescan is in flight for. One key per press. */
  rescanning: Readonly<Record<string, true>>;
  /** Phase 110. Main's own sentence for a Rescan that failed, per machine id. */
  rescanErrors: Readonly<Record<string, string>>;

  /** Idempotent. Reads the rows and subscribes to the test stream. */
  init(): void;
  /** Re-read what main already holds. Opens no file. */
  refresh(): Promise<void>;
  /** Re-read the file from disk. Starts nothing. */
  reload(): Promise<void>;

  /**
   * Opens the Add flow and looks at the tailnet once. Its one caller is the
   * Add a machine button.
   */
  openAdd(): void;
  /** Closes the Add flow, and stops a check that is still running for it. */
  closeAdd(): void;
  setForm(patch: Partial<MachineFormState>): void;
  /**
   * THE PICK: a click on a tailnet row fills the form from it and starts the
   * check (Phase 340, section 5.3). It is one handler, so a pick is one press.
   */
  usePeer(peer: TailscalePeerView): Promise<string | null>;
  setAddressOpen(open: boolean): void;
  setAdvancedOpen(open: boolean): void;
  setDetailsOpen(open: boolean): void;

  /** Runs the pinned Tailscale program once. */
  findTailnet(): Promise<void>;

  /** Starts one check from the form: Check, or Return in the address field. */
  startDraftTest(): Promise<string | null>;
  /** Starts one check from a saved row. The gate refuses in main. */
  startSavedTest(id: string): Promise<string | null>;
  /** Runs the open check again against the same machine and the same id. */
  checkAgain(): Promise<string | null>;
  /** Runs the open check again with one of the programs it found typed. */
  pickCandidate(path: string): Promise<string | null>;
  /**
   * Answers the open question. A host key question is answered `yes` and
   * takes no text. A prompt takes the person's text, which is not kept.
   */
  answerAsk(text?: string): Promise<void>;
  /** Writes one test event into the open check. Starts nothing. */
  receiveTestEvent(event: MachineTestEvent): void;
  /** Sends one answer to the live program, and stores nothing. */
  sendTestInput(text: string): Promise<void>;
  cancelTest(): Promise<void>;

  /**
   * The Add press: writes the row and records the confirmation, then prepares
   * the machine with the id the add returned. Returns main's sentence.
   */
  addMachine(): Promise<string | null>;
  /** Closes the Add flow once its machine is shown ready. */
  finishAdd(): void;
  /** Confirms a row that already exists. It prepares nothing (D12). */
  confirmMachine(id: string): Promise<string | null>;
  forgetMachine(id: string): Promise<string | null>;
  removeMachine(id: string): Promise<string | null>;

  /**
   * Starts the program on one machine.
   *
   * The gate is in main. An unconfirmed row refuses there, before anything is
   * started, so the check below is only about not sending a call that is certain
   * to be refused. It is not the safeguard.
   */
  prepareMachine(id: string): Promise<string | null>;

  /**
   * Records that a person accepted the version one machine reports, and then
   * prepares that machine.
   */
  acceptVersion(id: string): Promise<string | null>;

  /**
   * PHASE 340. Set up sign-in…, the next step of a row whose machine wants a
   * key. It opens the row's check panel and starts the saved check, whose key
   * step is the way in.
   */
  setUpSignIn(id: string): Promise<string | null>;

  /**
   * Makes a key for the machine the open test is about, puts its public half
   * on that machine, and then starts the check again with the open check's own
   * draft and id. When that check belonged to a CONFIRMED row and it answers
   * ok, the row is prepared.
   *
   * The password is an ARGUMENT and is never stored. It goes into the call and
   * nowhere else.
   */
  installKey(password: string): Promise<string | null>;

  /** PHASE 340. Asks main to open the folder sheet on one confirmed machine. */
  openFolder(id: string): Promise<string | null>;

  /** PHASE 340. Opens one panel under a row, or shuts it with null. */
  setPanel(id: string, panel: MachinePanel | null): void;
  /** PHASE 340. Opens the panel, or shuts it when it is the one already open. */
  togglePanel(id: string, panel: MachinePanel): void;
  /** PHASE 340. Records main's sentence under a row, or clears it with null. */
  setRowError(id: string, text: string | null): void;

  /**
   * Phase 110. Asks ONE machine which agents it has.
   *
   * A read that failed is not evidence that an agent is absent, so the catch
   * writes a sentence and touches the answer map not at all.
   */
  rescanAgents(id: string): Promise<void>;
}

/** The views main pushed, keyed by machine id. */
function keyById(
  views: readonly MachineAgentsView[]
): Record<string, MachineAgentsView> {
  const out: Record<string, MachineAgentsView> = {};
  for (const view of views) out[view.machineId] = view;
  return out;
}

/**
 * One machine's answer laid over the map, leaving every other machine alone.
 *
 * A Rescan for one machine answers with that machine only, so replacing the
 * map whole would drop what every other machine already said.
 */
function mergeViews(
  current: Readonly<Record<string, MachineAgentsView>>,
  views: readonly MachineAgentsView[]
): Record<string, MachineAgentsView> {
  return { ...current, ...keyById(views) };
}

/** The same record without one key, and the original is not touched. */
function withoutKey<T>(
  map: Readonly<Record<string, T>>,
  id: string
): Record<string, T> {
  const next = { ...map };
  delete next[id];
  return next;
}

/**
 * Main's sentence, and nothing the transport wrapped around it.
 *
 * Main refuses a scan by throwing a `GmuxError`, whose `message` is the JSON
 * of the payload. Electron then puts its own prefix on the front. `errorText`
 * parses that payload and answers `payload.message`, which is the one sentence
 * main wrote for a person to read. The prefix strip is kept AFTER `errorText`
 * for the errors that carry no payload, e.g. a plain `Error`.
 */
function plainSentence(err: unknown): string {
  return errorText(err).replace(
    /^Error invoking remote method '[^']+': (?:Error: )?/,
    ''
  );
}

let initialized = false;

/**
 * Main's sentence when it threw, or the value as a plain sentence.
 *
 * PHASE 340's fix round (a verifier's nit). It answered `err.message`, which for
 * a refusal from main is Electron's prefix around the JSON of main's payload,
 * so an Add main refused drew `Error invoking remote method 'machines:add':
 * GmuxError: {"code":…}` under the step. It now reads main's own sentence out
 * of that, the way a Rescan's refusal always has.
 */
function sentenceOf(err: unknown): string {
  return plainSentence(err);
}

/**
 * PHASE 340. The promises `installKey` waits on, one per check it started,
 * keyed by test id. `receiveTestEvent` resolves one when that check ends, and
 * that is ALL it does with it: what happens next is written in `installKey`.
 *
 * A check that is replaced or stopped still ends in main with its own end
 * event, so every promise here is resolved by main's last event for its id.
 */
const endWaiters = new Map<string, (outcome: MachineTestOutcome) => void>();

/** The outcome main sends last for one test id. */
function endOf(testId: string): Promise<MachineTestOutcome> {
  return new Promise((resolve) => {
    endWaiters.set(testId, resolve);
  });
}

/** A fresh live test, for the store to hold while main runs it. */
function liveTestOf(
  started: MachineTestStarted,
  savedId: string | null,
  draftId: string | null,
  draft: MachineDraft | null
): LiveTest {
  return {
    started,
    savedId,
    draftId,
    draft,
    transcript: '',
    outcome: null,
    running: true,
    ask: null,
    endedAt: null
  };
}

export const useMachinesStore = create<MachinesStoreState>()((set, get) => {
  /**
   * Starts one check and makes it the open one. The ONE place in this store a
   * check is handed to main, so every press above reaches main the same way and
   * the open check always says which draft and which id it ran.
   */
  async function beginTest(
    input: MachineTestInput,
    savedId: string | null,
    draftId: string | null,
    draft: MachineDraft | null
  ): Promise<MachineTestStarted | string> {
    const b = bridge();
    if (b === null) return BRIDGE_MISSING;
    try {
      const started = await b.test(input);
      set({
        test: liveTestOf(started, savedId, draftId, draft),
        detailsOpen: false
      });
      return started;
    } catch (err) {
      return sentenceOf(err);
    }
  }

  /** The sentence a start answered, or null when it started. */
  function startSentence(result: MachineTestStarted | string): string | null {
    return typeof result === 'string' ? result : null;
  }

  return {
    machines: null,
    supported: true, // optimistic until init() feature detects
    busy: null,
    adding: false,
    form: emptyForm(),
    addressOpen: false,
    advancedOpen: false,
    detailsOpen: false,
    pickedLabel: null,
    pickedHost: null,
    advancedHost: null,
    added: null,
    tailscale: null,
    tailscaleBusy: false,
    tailscaleReadAt: null,
    test: null,
    prepared: {},
    preparing: null,
    accepting: null,
    keyInstall: null,
    panels: {},
    rowErrors: {},
    agentsByMachine: {},
    rescanning: {},
    rescanErrors: {},

    init() {
      if (initialized) return;
      initialized = true;
      const b = bridge();
      if (b === null) {
        set({ supported: false });
        return;
      }

      void get().refresh();

      // Never unsubscribed: this store lives as long as the Settings surface.
      // Every event goes through `receiveTestEvent`, which writes it into the
      // open check and starts nothing.
      b.onTestEvent((event) => {
        get().receiveTestEvent(event);
      });

      // PHASE 110. The link state of every machine. `ready`, and since Phase
      // 340 the link, the last sign in and the system on every row, are
      // composed by main, so re-reading the rows is what moves them. The read
      // reaches memory in main and starts nothing.
      if (typeof b.onStateChanged === 'function') {
        b.onStateChanged(() => {
          void get().refresh();
        });
      }

      // PHASE 110. Phase 109's answer, read once with `fresh` false. That asks
      // memory in main and sends nothing to any machine.
      if (typeof b.agents === 'function') {
        void b
          .agents(null, false)
          .then((views) => set({ agentsByMachine: keyById(views) }))
          .catch(() => undefined);
      }

      // PHASE 110. The whole map, every push. PHASE 340 (D24) re-reads the rows
      // on the same push, because a machine's agents answer arrives with its
      // sign in, and the row's facts move with it. Still memory, still nothing
      // started.
      if (typeof b.onAgentsChanged === 'function') {
        b.onAgentsChanged((views) => {
          set({ agentsByMachine: keyById(views) });
          void get().refresh();
        });
      }
    },

    async refresh() {
      const b = bridge();
      if (b === null) return;
      try {
        set({ machines: await b.rows() });
      } catch {
        /* keep the last good answer up rather than blanking the list */
      }
    },

    async reload() {
      const b = bridge();
      if (b === null) return;
      try {
        set({ machines: await b.reload() });
      } catch {
        /* the file is unreadable; the rows already on screen stay */
      }
    },

    openAdd() {
      // The key install belongs to the machine the last test was about, so it
      // goes with that test rather than sitting under the next one.
      set({
        adding: true,
        form: emptyForm(),
        test: null,
        keyInstall: null,
        added: null,
        addressOpen: false,
        advancedOpen: false,
        detailsOpen: false,
        pickedLabel: null,
        pickedHost: null,
        advancedHost: null
      });
      // PHASE 340 (D6). The Add a machine press looks at the tailnet at once.
      // It runs the pinned Tailscale program on this Mac once, the read the
      // old Find button ran, and it reaches no other machine.
      void get().findTailnet();
    },

    closeAdd() {
      // A check still running for the machine being added has nothing left to
      // report to, so it is stopped rather than left to run out its minute.
      const live = get().test;
      if (live !== null && live.savedId === null && live.running) {
        void get().cancelTest();
      }
      set({
        adding: false,
        form: emptyForm(),
        test: null,
        keyInstall: null,
        added: null,
        addressOpen: false,
        advancedOpen: false,
        detailsOpen: false,
        pickedLabel: null,
        pickedHost: null,
        advancedHost: null
      });
    },

    setForm(patch) {
      set((s) => {
        const form = { ...s.form, ...patch };
        // A test is about the address it was run against. Editing any of the
        // four values that decide what runs makes the finished test, and the
        // sheet it handed back, about a different machine. Dropping it here is
        // what keeps a person from agreeing to lines they read for one address
        // and writing a row for another. The name and the colour are
        // presentation, are not in the hash, and leave the test alone.
        const drifted =
          s.test !== null &&
          s.test.savedId === null &&
          JSON.stringify(draftOf(form)) !== JSON.stringify(draftOf(s.form));
        // PHASE 340 (D28). A name a pick wrote belongs to the address it
        // picked. Typing another address takes it away, unless the person has
        // since typed a name of their own.
        let pickedLabel = s.pickedLabel;
        let pickedHost = s.pickedHost;
        if (patch.label !== undefined) {
          pickedLabel = null;
          pickedHost = null;
        } else if (
          patch.host !== undefined &&
          pickedLabel !== null &&
          form.host.trim() !== (pickedHost ?? '') &&
          form.label === pickedLabel
        ) {
          form.label = '';
          pickedLabel = null;
          pickedHost = null;
        }
        // PHASE 340's fix round. Advanced belongs to the address it was typed
        // for. Typing in it binds it to the address in the form now (none yet
        // binds it to nothing); typing an address while it is bound to nothing
        // binds it to that address. A pick of another machine then clears it.
        let advancedHost = s.advancedHost;
        const typedAdvanced =
          patch.user !== undefined ||
          patch.port !== undefined ||
          patch.remoteTmuxPath !== undefined;
        if (typedAdvanced) {
          advancedHost = form.host.trim() === '' ? null : form.host.trim();
        } else if (
          patch.host !== undefined &&
          advancedHost === null &&
          advancedFilled(form) &&
          form.host.trim() !== ''
        ) {
          advancedHost = form.host.trim();
        }
        // What a key install did was done to the address that was tested, so
        // its answer goes when that test goes.
        return drifted
          ? { form, test: null, keyInstall: null, pickedLabel, pickedHost, advancedHost }
          : { form, pickedLabel, pickedHost, advancedHost };
      });
    },

    async usePeer(peer) {
      // PHASE 340 (D28). A pick REPLACES the name with the one the peer row
      // drew. The Name field is drawn only after a check, so a name standing
      // in the form at a pick came from an earlier pick, and keeping it would
      // check the second machine under the first one's name and id.
      const label = peerDisplayName(peer);
      set((s) => {
        // PHASE 340's fix round (the verifiers' finding). The pick starts the
        // check at once, and Advanced may be shut, so an account, a port or a
        // program path typed for ANOTHER address would sign in to this machine
        // and run that path's `-V` here unseen. They go, unless they were typed
        // for this machine or before any address was typed.
        const foreign =
          advancedFilled(s.form) &&
          s.advancedHost !== null &&
          s.advancedHost !== peer.host.trim();
        const advanced = foreign ? { user: '', port: '', remoteTmuxPath: '' } : {};
        return {
          form: { ...s.form, ...advanced, host: peer.host, label },
          pickedLabel: label,
          pickedHost: peer.host,
          advancedHost: foreign || !advancedFilled(s.form) ? null : peer.host.trim(),
          test: null,
          keyInstall: null
        };
      });
      return get().startDraftTest();
    },

    setAddressOpen(open) {
      set({ addressOpen: open });
    },

    setAdvancedOpen(open) {
      set({ advancedOpen: open });
    },

    setDetailsOpen(open) {
      set({ detailsOpen: open });
    },

    async findTailnet() {
      const b = bridge();
      if (b === null || get().tailscaleBusy) return;
      set({ tailscaleBusy: true });
      try {
        set({
          tailscale: await b.tailscaleNames(),
          tailscaleBusy: false,
          tailscaleReadAt: Date.now()
        });
      } catch {
        // A look that threw is still a look. The panel says when Tortie last
        // tried, and a person pressing the button again should see the answer
        // move.
        set({ tailscaleBusy: false, tailscaleReadAt: Date.now() });
      }
    },

    async startDraftTest() {
      if (bridge() === null) return BRIDGE_MISSING;
      // PHASE 340 (D28). A Check of a typed address that is not the picked one
      // does not carry the picked machine's name.
      const s = get();
      if (
        s.pickedLabel !== null &&
        s.form.label === s.pickedLabel &&
        s.form.host.trim() !== (s.pickedHost ?? '')
      ) {
        set({
          form: { ...s.form, label: '' },
          pickedLabel: null,
          pickedHost: null
        });
      }
      const { form, machines } = get();
      const draft = draftOf(form);
      // The id goes out WITH the draft. Main needs it to compose the confirm
      // sheet when the test ends, because the hash covers the id as well as the
      // program path, and this is the only moment both exist.
      const id = machineIdFrom(
        form.label,
        form.host,
        new Set((machines?.rows ?? []).map((r) => r.id))
      );
      set({ keyInstall: null });
      return startSentence(
        await beginTest({ mode: 'draft', draft: { ...draft, id } }, null, id, draft)
      );
    },

    async startSavedTest(id) {
      // An install answer from an earlier check of this row is about that
      // check, and a new check is a new question.
      set((s) => ({
        keyInstall: s.keyInstall !== null && s.keyInstall.savedId === id ? null : s.keyInstall
      }));
      // The gate lives on the other side of this call. An unconfirmed row and
      // a row whose details moved both refuse there, and nothing is started.
      return startSentence(await beginTest({ mode: 'saved', id }, id, null, null));
    },

    async checkAgain() {
      const live = get().test;
      if (live === null) return null;
      if (live.savedId !== null) {
        return startSentence(
          await beginTest({ mode: 'saved', id: live.savedId }, live.savedId, null, null)
        );
      }
      if (live.draft === null || live.draftId === null) return null;
      // The same machine, the same four values and the same id, so a name
      // typed into the Add step since does not move the hash.
      return startSentence(
        await beginTest(
          { mode: 'draft', draft: { ...live.draft, id: live.draftId } },
          null,
          live.draftId,
          live.draft
        )
      );
    },

    async pickCandidate(path) {
      const live = get().test;
      // A candidate is offered only on a finished draft check that found more
      // than one program, and only one of the paths that check named can be
      // picked. A saved row's path is a hashed field, which only Remove and add
      // again changes, so a saved check offers no button (D4 as revised).
      if (
        live === null ||
        live.savedId !== null ||
        live.draft === null ||
        live.draftId === null ||
        live.outcome === null ||
        live.outcome.class !== 'program-choice'
      ) {
        return null;
      }
      const listed = (live.outcome.check?.candidates ?? []).some(
        (one) => one.path === path
      );
      if (!listed) return null;
      const draft: MachineDraft = { ...live.draft, remoteTmuxPath: path };
      // The field shows the path the person chose, written directly so the
      // drift rule above does not drop the check this is about to start. It
      // belongs to the machine the check ran against (the fix round), so a
      // later pick of another machine does not carry it there.
      set((s) => ({
        form: { ...s.form, remoteTmuxPath: path },
        advancedHost: draft.host.trim() === '' ? null : draft.host.trim()
      }));
      return startSentence(
        await beginTest(
          { mode: 'draft', draft: { ...draft, id: live.draftId } },
          null,
          live.draftId,
          draft
        )
      );
    },

    async answerAsk(text) {
      const b = bridge();
      const live = get().test;
      if (b === null || live === null || !live.running) return;
      const ask = live.ask ?? null;
      if (ask === null) return;
      // Trust it sends `yes` and nothing else, and only to the open host key
      // question of the live check. A prompt sends the person's own line. The
      // newline is what makes an answer an answer, and asking a person to type
      // it would be a trick.
      const data = ask.kind === 'host-key' ? 'yes\n' : `${text ?? ''}\n`;
      set({ test: { ...live, ask: null } });
      try {
        await b.testInput({ testId: live.started.testId, data });
      } catch {
        /* the program has already gone; the end event carries the outcome */
      }
    },

    receiveTestEvent(event) {
      const live = get().test;
      const isLive = live !== null && live.started.testId === event.testId;
      // The guard on testId is what makes a cancelled test's last bytes land
      // nowhere instead of in the transcript of the test that replaced it.
      if (isLive && live !== null) {
        if (event.kind === 'output') {
          const joined = live.transcript + event.text;
          const transcript =
            joined.length > TRANSCRIPT_MAX_CHARS
              ? joined.slice(joined.length - TRANSCRIPT_MAX_CHARS)
              : joined;
          // Anything the program printed after a question means the question
          // is no longer the open one, whoever answered it.
          set({
            test: {
              ...live,
              transcript,
              ask: event.text.trim() === '' ? (live.ask ?? null) : null
            }
          });
        } else if (event.kind === 'ask') {
          // A prompt shows only its last line, and ssh's other questions put
          // their reason on the lines above it, so Details opens with it (D9).
          set({
            test: { ...live, ask: event.ask },
            ...(event.ask.kind === 'prompt' ? { detailsOpen: true } : {})
          });
        } else if (event.kind === 'end') {
          set({
            test: {
              ...live,
              outcome: event.outcome,
              running: false,
              ask: null,
              endedAt: Date.now()
            }
          });
        }
        // An event kind this build does not know is not an outcome, and it is
        // never written as one.
      }
      if (event.kind === 'end') {
        const waiter = endWaiters.get(event.testId);
        if (waiter !== undefined) {
          endWaiters.delete(event.testId);
          waiter(event.outcome);
        }
      }
    },

    async sendTestInput(text) {
      const b = bridge();
      const live = get().test;
      if (b === null || live === null || !live.running) return;
      try {
        await b.testInput({ testId: live.started.testId, data: `${text}\n` });
      } catch {
        /* the program has already gone; the end event carries the outcome */
      }
    },

    async cancelTest() {
      const b = bridge();
      const live = get().test;
      if (b === null || live === null) return;
      try {
        await b.testCancel(live.started.testId);
      } catch {
        /* already gone */
      }
    },

    async addMachine() {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      const { form, test } = get();
      const sheet = sheetOf(test);
      const resolvedPath = resolvedPathOf(test);
      // Every one of these is non null together or null together, because they
      // all come off one finished draft test.
      if (
        test === null ||
        test.draft === null ||
        test.draftId === null ||
        sheet === null ||
        resolvedPath === null
      ) {
        return ADD_NEEDS_CHECK;
      }

      const draft = test.draft;
      const label = form.label.trim() === '' ? draft.host : form.label.trim();
      const accepted = sheet.acceptedTmuxVersion ?? null;
      const input: MachineAddInput = {
        id: test.draftId,
        label,
        color: form.color,
        host: draft.host,
        user: draft.user,
        port: draft.port,
        remoteTmuxPath: resolvedPath,
        // Main's own hash and main's own lines, sent back exactly as they
        // arrived. Main compares the hash against the row it is about to write
        // and refuses a mismatch.
        hashRead: sheet.hash,
        linesRead: [...sheet.lines],
        // PHASE 340 (D7). The version the SHEET bound, echoed and never derived
        // from the check, so one source decides it. Absent for every version
        // that needs no acceptance, and then the row hashes as it always did.
        ...(accepted === null ? {} : { acceptedTmuxVersion: accepted })
      };

      set({ busy: 'add' });
      try {
        const added = await b.add(input);
        set({ added: { id: added.id, label }, test: null, preparing: added.id });
        await get().refresh();
        // THE ONE CHAIN (D7): the add confirmed the lines the person read, and
        // the same press prepares the machine, with the id the add returned. An
        // add main refused, or whose agreement could not be sealed, threw above
        // and prepares nothing.
        const result = await b.prepare(added.id);
        set((s) => ({ prepared: { ...s.prepared, [added.id]: result } }));
        await get().refresh();
        return null;
      } catch (err) {
        await get().refresh();
        return sentenceOf(err);
      } finally {
        set({ busy: null, preparing: null });
      }
    },

    finishAdd() {
      get().closeAdd();
    },

    async confirmMachine(id) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      const row: MachineRowView | undefined = get().machines?.rows.find(
        (r) => r.id === id
      );
      if (row === undefined) return null;
      set({ busy: id });
      try {
        // The hash and the lines are the ones this row was drawn from. Main
        // compares them against the file as it is now and refuses if the row
        // moved while it was on screen. PHASE 340 (D12): it prepares nothing.
        // A row reaching Review… is one nobody added in this flow, and a
        // separate Prepare press keeps a second look before anything starts.
        await b.confirm({ id, hashRead: row.hash, linesRead: row.lines });
        set((s) => ({ panels: withoutKey(s.panels, id) }));
        await get().refresh();
        return null;
      } catch (err) {
        await get().refresh();
        return sentenceOf(err);
      } finally {
        set({ busy: null });
      }
    },

    async forgetMachine(id) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      set({ busy: id });
      try {
        await b.forget(id);
        await get().refresh();
        return null;
      } catch (err) {
        await get().refresh();
        return sentenceOf(err);
      } finally {
        set({ busy: null });
      }
    },

    async prepareMachine(id) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      if (b.prepare === undefined) return BRIDGE_MISSING;
      const row: MachineRowView | undefined = get().machines?.rows.find(
        (r) => r.id === id
      );
      if (row === undefined) return null;
      if (!row.usable) return PREPARE_NEEDS_CONFIRM;
      set({ preparing: id });
      try {
        const result = await b.prepare(id);
        set((s) => ({ prepared: { ...s.prepared, [id]: result } }));
        await get().refresh();
        return null;
      } catch (err) {
        return sentenceOf(err);
      } finally {
        set({ preparing: null });
      }
    },

    async acceptVersion(id) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      if (b.acceptVersion === undefined) return BRIDGE_MISSING;
      const result = get().prepared[id];
      const sheet = result?.acceptSheet ?? null;
      const version = result?.version ?? null;
      if (sheet === null || version === null) return null;
      set({ accepting: id });
      try {
        await b.acceptVersion({
          id,
          version,
          hashRead: sheet.hash,
          linesRead: [...sheet.lines]
        });
        await get().refresh();
        // The person accepted a version so that Tortie would use the machine, so
        // the machine is prepared straight after. It is the same call the Prepare
        // button makes.
        const prepared = await b.prepare(id);
        set((s) => ({ prepared: { ...s.prepared, [id]: prepared } }));
        await get().refresh();
        return null;
      } catch (err) {
        await get().refresh();
        return sentenceOf(err);
      } finally {
        set({ accepting: null });
      }
    },

    async setUpSignIn(id) {
      set((s) => ({ panels: { ...s.panels, [id]: 'test' } }));
      // The saved check, as Test the connection starts it, and its key step is
      // the way in. The gate in main refuses a row nobody confirmed, before
      // anything is started.
      return get().startSavedTest(id);
    },

    async installKey(password) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      if (b.installKey === undefined) return BRIDGE_MISSING;

      const live = get().test;
      const sheet = keySheetOf(live?.outcome ?? null);
      // The step that carries the button only exists while the sheet does, so
      // this is narrowing rather than the safeguard. The safeguard is main
      // recomputing the hash and refusing one it would not compute now.
      if (live === null || sheet === null) return null;
      if (password === '') return KEY_DISABLED_REASON;

      // The install runs against the machine the OPEN TEST was about, never
      // against whatever the form holds now.
      let target: MachineTestInput;
      if (live.savedId !== null) {
        target = { mode: 'saved', id: live.savedId };
      } else if (live.draft !== null && live.draftId !== null) {
        target = { mode: 'draft', draft: { ...live.draft, id: live.draftId } };
      } else {
        return null;
      }

      const savedId = live.savedId;
      set({ keyInstall: { savedId, running: true, result: null } });
      let result: MachineKeyInstallResult;
      try {
        result = await b.installKey({
          target,
          // Main's own hash and main's own lines, sent back exactly as they
          // arrived, which is what makes the agreement bind to the lines that
          // were on the screen.
          hashRead: sheet.hash,
          linesRead: [...sheet.lines],
          password
        });
      } catch (err) {
        set({ keyInstall: { savedId, running: false, result: null } });
        return sentenceOf(err);
      }
      set({ keyInstall: { savedId, running: false, result } });
      if (result.class !== 'key-installed') return null;

      // THE FLOW ENDS WITH THE MACHINE'S OWN ANSWER. Tortie saying the key is
      // installed is not the same as the machine signing Tortie in, so the
      // check runs again, with the OPEN check's own draft and id (D10 as
      // revised): the key Tortie just made is keyed by that id, and the check
      // names it only for that id (D27).
      const started = await beginTest(target, savedId, live.draftId, live.draft);
      if (typeof started === 'string') return started;
      // A draft's check ends at the Add step, and the Add press decides.
      if (savedId === null) return null;

      const outcome = await endOf(started.testId);
      if (outcome.class !== 'ok') return null;
      // Only a row a person confirmed is prepared, and only once its own
      // machine has answered ok with Tortie's key (D12).
      const row = get().machines?.rows.find((r) => r.id === savedId);
      if (row === undefined || row.state !== 'confirmed' || !row.usable) return null;
      set({ preparing: savedId });
      try {
        const prepared = await b.prepare(savedId);
        set((s) => ({ prepared: { ...s.prepared, [savedId]: prepared } }));
        await get().refresh();
        return null;
      } catch (err) {
        return sentenceOf(err);
      } finally {
        set({ preparing: null });
      }
    },

    async openFolder(id) {
      const b = bridge();
      if (b === null || typeof b.openFolder !== 'function') return BRIDGE_MISSING;
      try {
        // Main refuses a row nobody confirmed, raises the main window and opens
        // its folder sheet with this machine chosen. It starts no process.
        const opened = await b.openFolder(id);
        return opened ? null : OPEN_FOLDER_NEEDS_CONFIRM;
      } catch (err) {
        return sentenceOf(err);
      }
    },

    setPanel(id, panel) {
      set((s) => ({
        panels: panel === null ? withoutKey(s.panels, id) : { ...s.panels, [id]: panel }
      }));
    },

    togglePanel(id, panel) {
      set((s) => ({
        panels:
          s.panels[id] === panel ? withoutKey(s.panels, id) : { ...s.panels, [id]: panel }
      }));
    },

    setRowError(id, text) {
      set((s) => ({
        rowErrors: text === null ? withoutKey(s.rowErrors, id) : { ...s.rowErrors, [id]: text }
      }));
    },

    async removeMachine(id) {
      const b = bridge();
      if (b === null) return BRIDGE_MISSING;
      set({ busy: id });
      try {
        const next = await b.remove(id);
        const live = get().test;
        const prepared = { ...get().prepared };
        // The answer belonged to a row that no longer exists, so it goes with the
        // row rather than sitting under the machine that takes its place on screen.
        delete prepared[id];
        const keyInstall = get().keyInstall;
        set((s) => ({
          machines: next,
          prepared,
          panels: withoutKey(s.panels, id),
          rowErrors: withoutKey(s.rowErrors, id),
          // A test still running against a row that no longer exists has
          // nothing to report to, so it goes with the row.
          test: live !== null && live.savedId === id ? null : live,
          keyInstall:
            keyInstall !== null && keyInstall.savedId === id ? null : keyInstall
        }));
        return null;
      } catch (err) {
        await get().refresh();
        return sentenceOf(err);
      } finally {
        set({ busy: null });
      }
    },

    async rescanAgents(id) {
      const b = bridge();
      if (b === null || typeof b.agents !== 'function') return;
      // One press, one read. A second press while the first is in flight opens
      // no second connection.
      if (get().rescanning[id] === true) return;
      set((s) => ({
        rescanning: { ...s.rescanning, [id]: true },
        rescanErrors: withoutKey(s.rescanErrors, id)
      }));
      try {
        const views = await b.agents(id, true);
        set((s) => ({ agentsByMachine: mergeViews(s.agentsByMachine, views) }));
      } catch (err) {
        // THE ANSWER IS NOT TOUCHED. A read that failed is not evidence that an
        // agent is absent.
        set((s) => ({
          rescanErrors: { ...s.rescanErrors, [id]: plainSentence(err) }
        }));
      } finally {
        set((s) => ({ rescanning: withoutKey(s.rescanning, id) }));
      }
    }
  };
});
