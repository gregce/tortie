/**
 * Phase 68. The renderer state behind Settings → Machines.
 *
 * ONE STORE, and it is deliberately not folded into settings-store.ts. That
 * store carries the persisted settings every window reads. This one carries a
 * form a person is typing into and the live bytes of one program, which no
 * other window has any business subscribing to.
 *
 * WHAT THIS STORE CANNOT DO, and the reason it is worth stating here rather
 * than only in the spec. Nothing in this file starts anything. Every call that
 * can cause a process to exist (`findTailnet`, `startDraftTest`,
 * `startSavedTest`, and `prepareMachine` since Phase 69) is reachable from
 * exactly one button each, and no reducer, no subscription and no effect calls
 * them. Reading the machines file cannot reach them, which is refusal 8 of
 * CLAUDE.md expressed in the one renderer module that could otherwise break it.
 *
 * THE GATE IS IN MAIN, not here. `startSavedTest` reaches
 * `assertMachineMayConnect` on the other side of the bridge, so an unconfirmed
 * row refuses there and this file never has to decide it. `startDraftTest`
 * carries the person's own keystrokes and has no row and no confirmation to
 * check, which is why the two are separate calls rather than one with a flag.
 */

import { create } from 'zustand';
import type {
  MachineAddInput,
  MachineConfirmSheet,
  MachineDraft,
  MachinePrepareResult,
  MachineRowView,
  MachineTestOutcome,
  MachineTestStarted,
  MachinesResult,
  GmuxMachinesExtras,
  TailscalePeerView,
  TailscaleSourceResult
} from '@shared/ipc';
import type { MachineColor } from '@shared/machines';
import { MACHINE_DEFAULT_COLOR } from '@shared/machines';
import {
  ADD_DISABLED_REASON,
  BRIDGE_MISSING,
  PREPARE_NEEDS_CONFIRM
} from './machines-copy';

type MachinesApi = NonNullable<GmuxMachinesExtras['machines']>;

/**
 * The bridge, feature detected, and read through globalThis rather than a
 * bare `window`. The unit tests run in the node environment, where a bare
 * `window` reference throws before a component can render.
 */
function bridge(): MachinesApi | null {
  const api = (globalThis as { window?: { gmux?: unknown } }).window?.gmux as
    | GmuxMachinesExtras
    | undefined;
  return api?.machines ?? null;
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
   * then refuse the add with a sentence about a machine that changed.
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

/** The four execution bearing values, as the test and the add call want them. */
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
 * The sheet a finished draft test handed back, or null.
 *
 * THIS IS THE WHOLE OF THE ADD FLOW'S AGREEMENT, so it is worth saying why the
 * renderer does not compose it. The hash a person's agreement binds to covers
 * the machine id and the four execution bearing fields, and one of those four
 * is the program path, which is not known until the machine itself answers. So
 * main composes the hash and the lines together at the end of the test and
 * sends both on the outcome. The renderer draws those exact lines and sends
 * that exact hash back. An earlier build composed its own lines here and sent
 * an empty hash, and every add was refused as stale, because a hash the
 * renderer invents can never be the hash main computes.
 *
 * Null until a draft test has ended with class `ok` and a path from the
 * machine. The Add button is off for exactly as long as this is null, because
 * a row written without it names a program Tortie has never seen and carries
 * an agreement to lines nobody read.
 */
export function sheetOf(test: LiveTest | null): MachineConfirmSheet | null {
  if (test === null || test.savedId !== null || test.draftId === null) return null;
  if (test.outcome === null || test.outcome.class !== 'ok') return null;
  if (test.outcome.resolvedPath === null) return null;
  return test.outcome.sheet ?? null;
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

  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  /**
   * When the last look at Tailscale finished, as a clock reading. Null until
   * one has.
   *
   * PHASE 79. The panel says when Tortie last looked, the way the agent scan
   * says when it last scanned. A look that found nothing is still a look, so
   * this is set on the failing path as well as on the succeeding one.
   */
  tailscaleReadAt: number | null;

  test: LiveTest | null;

  /**
   * What Prepare answered, per machine id. Empty until a person presses it.
   *
   * Kept per id rather than as one value, because a person may prepare two
   * machines in one sitting and the answer for the first must not be redrawn
   * under the second.
   */
  prepared: Readonly<Record<string, MachinePrepareResult>>;
  /** The id a prepare is in flight for, or null. */
  preparing: string | null;

  /** Idempotent. Reads the rows and subscribes to the test stream. */
  init(): void;
  /** Re-read what main already holds. Opens no file. */
  refresh(): Promise<void>;
  /** Re-read the file from disk. Starts nothing. */
  reload(): Promise<void>;

  openAdd(): void;
  closeAdd(): void;
  setForm(patch: Partial<MachineFormState>): void;
  usePeer(peer: TailscalePeerView): void;

  /** Runs the pinned Tailscale program once. One button reaches this. */
  findTailnet(): Promise<void>;

  /** Starts one connection test from the form. One button reaches this. */
  startDraftTest(): Promise<string | null>;
  /** Starts one connection test from a saved row. The gate refuses in main. */
  startSavedTest(id: string): Promise<string | null>;
  /** Sends one answer to the live program, and stores nothing. */
  sendTestInput(text: string): Promise<void>;
  cancelTest(): Promise<void>;

  /** Writes the row and records the confirmation. Returns main's sentence. */
  addMachine(): Promise<string | null>;
  confirmMachine(id: string): Promise<string | null>;
  forgetMachine(id: string): Promise<string | null>;
  removeMachine(id: string): Promise<string | null>;

  /**
   * Starts the program on one machine. One button reaches this.
   *
   * The gate is in main. An unconfirmed row refuses there, before anything is
   * started, so the check below is only about not sending a call that is certain
   * to be refused. It is not the safeguard.
   */
  prepareMachine(id: string): Promise<string | null>;
}

let initialized = false;

/** Main's sentence when it threw, or the value as a plain sentence. */
function sentenceOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useMachinesStore = create<MachinesStoreState>()((set, get) => ({
  machines: null,
  supported: true, // optimistic until init() feature detects
  busy: null,
  adding: false,
  form: emptyForm(),
  tailscale: null,
  tailscaleBusy: false,
  tailscaleReadAt: null,
  test: null,
  prepared: {},
  preparing: null,

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
    // The guard on testId is what makes a cancelled test's last bytes land
    // nowhere instead of in the transcript of the test that replaced it.
    b.onTestEvent((event) => {
      const live = get().test;
      if (live === null || live.started.testId !== event.testId) return;
      if (event.kind === 'output') {
        const joined = live.transcript + event.text;
        const transcript =
          joined.length > TRANSCRIPT_MAX_CHARS
            ? joined.slice(joined.length - TRANSCRIPT_MAX_CHARS)
            : joined;
        set({ test: { ...live, transcript } });
        return;
      }
      set({ test: { ...live, outcome: event.outcome, running: false } });
    });
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
    set({ adding: true, form: emptyForm(), test: null });
  },

  closeAdd() {
    set({ adding: false, form: emptyForm(), test: null });
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
      return drifted ? { form, test: null } : { form };
    });
  },

  usePeer(peer) {
    // The name is a starting point for the person, not a decision. They can
    // still type over it before anything is written or confirmed.
    set((s) => ({
      form: {
        ...s.form,
        host: peer.host,
        label: s.form.label.trim() === '' ? peer.name : s.form.label
      },
      test: null
    }));
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
      // move rather than sit at "has not looked yet".
      set({ tailscaleBusy: false, tailscaleReadAt: Date.now() });
    }
  },

  async startDraftTest() {
    const b = bridge();
    if (b === null) return BRIDGE_MISSING;
    const { form, machines } = get();
    const draft = draftOf(form);
    // The id goes out WITH the draft. Main needs it to compose the confirm
    // sheet when the test ends, because the hash covers the id as well as the
    // program path, and this is the only moment both exist. A test started
    // without it comes back with no sheet, and the add that follows has
    // nothing to bind an agreement to.
    const id = machineIdFrom(
      form.label,
      form.host,
      new Set((machines?.rows ?? []).map((r) => r.id))
    );
    try {
      const started = await b.test({ mode: 'draft', draft: { ...draft, id } });
      set({
        test: {
          started,
          savedId: null,
          draftId: id,
          draft,
          transcript: '',
          outcome: null,
          running: true
        }
      });
      return null;
    } catch (err) {
      return sentenceOf(err);
    }
  },

  async startSavedTest(id) {
    const b = bridge();
    if (b === null) return BRIDGE_MISSING;
    try {
      // The gate lives on the other side of this call. An unconfirmed row and
      // a row whose details moved both refuse here, and nothing is started.
      const started = await b.test({ mode: 'saved', id });
      set({
        test: {
          started,
          savedId: id,
          draftId: null,
          draft: null,
          transcript: '',
          outcome: null,
          running: true
        }
      });
      return null;
    } catch (err) {
      return sentenceOf(err);
    }
  },

  async sendTestInput(text) {
    const b = bridge();
    const live = get().test;
    if (b === null || live === null || !live.running) return;
    // The newline is what makes an answer an answer. ssh reads a line, so a
    // person pressing Send has to send the line ending too, and asking them
    // to type it would be a trick.
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
    // all come off one finished draft test. The check is written out so the
    // types are narrowed without an assertion.
    if (
      test === null ||
      test.draft === null ||
      test.draftId === null ||
      sheet === null ||
      resolvedPath === null
    ) {
      return ADD_DISABLED_REASON;
    }

    const draft = test.draft;
    const input: MachineAddInput = {
      id: test.draftId,
      label: form.label.trim() === '' ? draft.host : form.label.trim(),
      color: form.color,
      host: draft.host,
      user: draft.user,
      port: draft.port,
      remoteTmuxPath: resolvedPath,
      // Main's own hash and main's own lines, sent back exactly as they
      // arrived. Main compares the hash against the row it is about to write
      // and refuses a mismatch, so this is what makes the agreement bind to
      // the lines that were on screen rather than to whatever the file says
      // by the time the click lands.
      hashRead: sheet.hash,
      linesRead: [...sheet.lines]
    };

    set({ busy: 'add' });
    try {
      await b.add(input);
      await get().refresh();
      set({ adding: false, form: emptyForm(), test: null });
      return null;
    } catch (err) {
      await get().refresh();
      return sentenceOf(err);
    } finally {
      set({ busy: null });
    }
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
      // moved while it was on screen, so a file an agent rewrote mid read
      // cannot have its new bytes agreed to by an old click.
      await b.confirm({ id, hashRead: row.hash, linesRead: row.lines });
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
      return null;
    } catch (err) {
      return sentenceOf(err);
    } finally {
      set({ preparing: null });
    }
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
      set({
        machines: next,
        prepared,
        // A test still running against a row that no longer exists has
        // nothing to report to, so it goes with the row.
        test: live !== null && live.savedId === id ? null : live
      });
      return null;
    } catch (err) {
      await get().refresh();
      return sentenceOf(err);
    } finally {
      set({ busy: null });
    }
  }
}));
