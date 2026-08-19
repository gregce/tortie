/**
 * The Phase 93 harness drive, being the renderer half of
 * `build/probe-p93-attention.mjs`.
 *
 * ## What the probe is proving with it
 *
 * That a session whose project tab is closed can still be reached and still be
 * cleared. Every one of those words is about a real gesture on a real row, so
 * this drive presses the keys the product listens for and clicks the buttons a
 * person would click. It calls no store action that a key press would have
 * called, with the two exceptions named below.
 *
 * ## What is REAL in a run, and what this drive supplies
 *
 * Real: the project tab, the session, its record in the manifest, the tab being
 * closed, the folder being opened again, the confirm a person answers, and the
 * session ending on the harness session server.
 *
 * Supplied, and there are exactly two things.
 *
 *  1. THE STATUS THAT PUTS A ROW IN THE ⌘J LIST. That list holds the sessions
 *     that are asking for input, and a shell can never ask for input. That is
 *     not an accident of this harness, it is the product's rule: the shell
 *     oracle in src/main/activity/oracles.ts returns idle or working and never
 *     needs_input, and main's own comment says so. The only agents that can ask
 *     are the ones a person has installed, and a probe that spends an agent turn
 *     to get one row is a probe nobody runs. So {@link hold} keeps ONE real
 *     session's row reading `needs_input` for the length of the run. Nothing
 *     else about the row is invented, and the session it names is a session that
 *     is really running.
 *  2. THE SECOND COMPUTER. {@link injectRemote} adds one machine row and one
 *     session row that claims to run on it. Nothing is signed in to that
 *     machine, so what the probe measures on those two steps is what the ⌘J row
 *     DRAWS and which sentence the refusal produces. It does not measure a
 *     folder being opened on a real second computer, and the probe's report says
 *     so. That path is measured by `npm run smoke:remote` and by
 *     `npm run probe:remoteproject`.
 *
 * ## How it is reached
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * same shape as ./remote-boot-drive.ts beside it. Outside the harness it is one
 * unused property. `build/probe-p93-attention.mjs` calls its methods one at a
 * time over the DevTools protocol, so the probe can look at the screen between
 * two gestures rather than after all of them.
 */

import type { Session } from '@shared/types';
import type { MachineStateView } from '@shared/ipc';
import { accelerator } from '@shared/keymap';
import { useApp } from '../state/store';

/** One row of the ⌘J list, read out of the document rather than the store. */
export interface P93Row {
  /** The session's own name, from `.attention-session`. */
  name: string;
  /** The machine's label, or null when the row draws no machine span. */
  machine: string | null;
  /** The folder, or null when the row draws no path span. */
  path: string | null;
  excerpt: string;
  selected: boolean;
  /** The whole row's accessible name, which is what a reader hears. */
  label: string;
}

/** Everything the probe reads between two gestures. */
export interface P93State {
  /** True while the ⌘J panel is on screen. */
  panelOpen: boolean;
  /** The panel's rows, in the order it drew them. */
  rows: P93Row[];
  /** Every open tab, as a path and a machine. */
  projects: { id: string; path: string; machineId: string | null }[];
  activeProjectId: string | null;
  /** The session selected in the active tab, or null. */
  activeSessionId: string | null;
  /** Every session Tortie holds, with the two fields this phase reads. */
  sessions: {
    id: string;
    name: string;
    status: string;
    projectPath: string;
    machineId: string | null;
    /** Phase 93 item 3's record, when this build writes it. */
    closedProject: unknown;
  }[];
  /** The text of every toast on screen. */
  toasts: string[];
  /** The confirm on screen, or null. */
  confirm: { title: string; body: string } | null;
}

declare global {
  interface Window {
    __gmuxP93?: P93Drive;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** Text of one element, trimmed, or null when the element is not there. */
function textOf(root: Element, selector: string): string | null {
  const el = root.querySelector(selector);
  return el === null ? null : (el.textContent ?? '').trim();
}

function readRows(): P93Row[] {
  return [...document.querySelectorAll('.attention-row')].map((row) => ({
    name: textOf(row, '.attention-session') ?? '',
    machine: textOf(row, '.attention-machine'),
    path: textOf(row, '.attention-path'),
    excerpt: textOf(row, '.attention-excerpt') ?? '',
    selected: row.classList.contains('selected'),
    label: (row.getAttribute('aria-label') ?? row.textContent ?? '').trim()
  }));
}

function readState(): P93State {
  const app = useApp.getState();
  const activeProjectId = app.activeProjectId;
  const modal = document.querySelector('.modal[role="alertdialog"]');
  return {
    panelOpen: document.querySelector('.attention-panel') !== null,
    rows: readRows(),
    projects: app.projects.map((p) => ({
      id: p.id,
      path: p.path,
      machineId: p.machineId ?? null
    })),
    activeProjectId,
    activeSessionId:
      activeProjectId === null
        ? null
        : (app.activeSessionByProject[activeProjectId] ?? null),
    sessions: app.sessions.map((x) => ({
      id: x.id,
      name: x.name,
      status: x.status,
      projectPath: x.projectPath,
      machineId: x.machine?.id ?? null,
      closedProject: (x as { closedProject?: unknown }).closedProject ?? null
    })),
    toasts: app.toasts.map((t) => t.text),
    confirm:
      modal === null
        ? null
        : {
            title: textOf(modal, '.modal-title') ?? '',
            body: textOf(modal, '.modal-body') ?? ''
          }
  };
}

/** A real key press, on the element the product listens on. */
function press(
  target: EventTarget,
  key: string,
  mods: { meta?: boolean; shift?: boolean } = {}
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      metaKey: mods.meta === true,
      shiftKey: mods.shift === true,
      bubbles: true,
      cancelable: true
    })
  );
}

export interface P93Drive {
  setup(spec: { path: string; names: string[] }): Promise<P93State>;
  hold(sessionId: string, excerpt: string): Promise<P93State>;
  release(): Promise<P93State>;
  state(): Promise<P93State>;
  openPanel(): Promise<P93State>;
  closePanel(): Promise<P93State>;
  select(name: string): Promise<P93State>;
  pressEnter(): Promise<P93State>;
  pressEnd(): Promise<P93State>;
  acceptConfirm(): Promise<P93State>;
  closeTab(path: string, machineId?: string | null): Promise<P93State>;
  injectRemote(spec: {
    machineId: string;
    label: string;
    path: string;
    name: string;
  }): Promise<P93State>;
  killAll(ids: string[]): Promise<P93State>;
  measureToasts(): Promise<P93ToastFit[]>;
}

/**
 * One toast on screen, measured rather than described.
 *
 * FIX ROUND. `.toast-text` is clamped, so a sentence longer than the clamp is
 * cut with no mark on screen saying so. Every refusal this phase writes is two
 * sentences and the SECOND one is the one saying the session is still running
 * and was not ended. MEASURED on 2026-08-19 before the fix: a 197 character
 * refusal had `scrollHeight` 100 px inside a 40 px box, so 3 of its 5 lines
 * were not on screen and the honest half was one of them.
 */
export interface P93ToastFit {
  text: string;
  chars: number;
  /** The height the text wants. */
  scrollHeight: number;
  /** The height the box gives it. */
  clientHeight: number;
  /** The computed `-webkit-line-clamp`, as a string, or null when there is none. */
  clamp: string | null;
  /** True when every line of the sentence is on screen. */
  whole: boolean;
}

/** The one subscription {@link P93Drive.hold} owns, so release can end it. */
let held: (() => void) | null = null;

export function registerP93AttentionDrive(): void {
  const drive: P93Drive = {
    /**
     * Open one folder as a tab and put real sessions in it.
     *
     * Both verbs are the store's own, which are the ones the folder picker and
     * the create sheet call. The sessions are shells, they are recorded in the
     * manifest, and they run on the harness session server the probe gave this
     * app.
     */
    async setup(spec) {
      await useApp.getState().addProjectPath(spec.path);
      await wait(500);
      for (const name of spec.names) {
        await useApp.getState().createSession({ name, agent: 'shell' });
        await wait(600);
      }
      // The list arrives on main's own push, so this waits for the rows rather
      // than trusting the create's answer.
      for (let i = 0; i < 40; i += 1) {
        const have = useApp
          .getState()
          .sessions.filter((x) => spec.names.includes(x.name));
        if (have.length >= spec.names.length) break;
        await wait(250);
      }
      return readState();
    },

    /**
     * Keep one REAL session's row reading `needs_input`.
     *
     * Main pushes its own list every few seconds and that push is the truth, so
     * this re-applies after each one rather than writing once. The session is
     * real and everything else about the row is main's.
     */
    async hold(sessionId, excerpt) {
      held?.();
      const apply = (): void => {
        const app = useApp.getState();
        const row = app.sessions.find((x) => x.id === sessionId);
        if (row === undefined || row.status === 'needs_input') return;
        useApp.setState({
          sessions: app.sessions.map((x) =>
            x.id === sessionId ? { ...x, status: 'needs_input' } : x
          ),
          attentionSince: { ...app.attentionSince, [sessionId]: Date.now() },
          excerpts: { ...app.excerpts, [sessionId]: excerpt }
        } as never);
      };
      apply();
      held = useApp.subscribe(apply);
      await wait(150);
      return readState();
    },

    async release() {
      held?.();
      held = null;
      await wait(150);
      return readState();
    },

    async state() {
      return readState();
    },

    /** ⌘J, dispatched on `window`, which is where the product listens. */
    async openPanel() {
      if (document.querySelector('.attention-panel') === null) {
        press(window, 'j', { meta: true });
        await wait(300);
      }
      return readState();
    },

    async closePanel() {
      const panel = document.querySelector('.attention-panel');
      if (panel !== null) {
        press(panel, 'Escape');
        await wait(200);
      }
      return readState();
    },

    /**
     * Walk the list with the down arrow until the named row is selected.
     *
     * The arrow rather than a click, because the arrow is what a person uses in
     * this panel and it is the selection the Enter and ⌘⌫ handlers read.
     */
    async select(name) {
      const panel = document.querySelector('.attention-panel');
      if (panel === null) return readState();
      for (let i = 0; i < 20; i += 1) {
        const rows = readRows();
        const at = rows.findIndex((r) => r.selected);
        if (rows[at]?.name === name) break;
        press(panel, 'ArrowDown');
        await wait(60);
        if (readRows().findIndex((r) => r.selected) === at) {
          // The list has no further rows and the name is not on it.
          break;
        }
      }
      return readState();
    },

    /** Enter on the selected row. The jump can open a tab, so this waits. */
    async pressEnter() {
      const panel = document.querySelector('.attention-panel');
      if (panel !== null) press(panel, 'Enter');
      await wait(2_500);
      return readState();
    },

    /**
     * The End chord on the selected row, which raises the confirm rather than
     * ending anything.
     *
     * The chord is read from the keymap rather than typed, so a probe run
     * cannot pass while the keymap and the panel disagree about which key it
     * is. The row is `session.endFromAttention` in src/shared/keymap.ts.
     */
    async pressEnd() {
      const panel = document.querySelector('.attention-panel');
      const want = accelerator('session.endFromAttention').split('+');
      const key = want[want.length - 1] ?? '';
      const mods = new Set(want.slice(0, -1));
      if (panel !== null) {
        press(panel, key, { meta: mods.has('Cmd'), shift: mods.has('Shift') });
      }
      await wait(700);
      return readState();
    },

    /**
     * Answer the confirm the way a person does, by clicking its own button.
     *
     * The last button in the actions row is the one that acts, which is the
     * order ./ConfirmDialog.tsx draws them in.
     */
    async acceptConfirm() {
      const buttons = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '.modal[role="alertdialog"] .modal-actions button'
        )
      ];
      buttons[buttons.length - 1]?.click();
      await wait(2_500);
      return readState();
    },

    /**
     * Close the tab for one folder, confirm included.
     *
     * This is the one place the drive calls a store action rather than pressing
     * a key, because closing a tab from the keyboard closes whichever tab is in
     * front and the probe needs a named one. The confirm it raises is answered
     * by a real click, which is the half that matters.
     */
    async closeTab(path, machineId) {
      const app = useApp.getState();
      const want = machineId ?? null;
      const project = app.projects.find(
        (p) => p.path === path && (p.machineId ?? null) === want
      );
      if (project === undefined) return readState();
      app.closeProject(project.id);
      await wait(300);
      await drive.acceptConfirm();
      await wait(700);
      return readState();
    },

    /**
     * One machine row and one session that claims to run on it.
     *
     * NOTHING IS SIGNED IN TO IT, on purpose. What this makes measurable is what
     * the ⌘J row draws for a session on another machine, and which sentence the
     * jump writes when that machine cannot be reached. It measures no folder
     * being opened on a real second computer, and the probe's report says so.
     */
    async injectRemote(spec) {
      const app = useApp.getState();
      const machine: MachineStateView = {
        id: spec.machineId,
        label: spec.label,
        color: 'magenta',
        link: 'quiet',
        everAnswered: false,
        lastAnsweredAt: null,
        detail: null
      };
      const session: Session = {
        id: `${spec.machineId}-injected`,
        name: spec.name,
        tmuxName: spec.name,
        projectPath: spec.path,
        cwd: spec.path,
        agent: 'claude',
        status: 'needs_input',
        createdAt: Date.now(),
        machine: {
          id: spec.machineId,
          label: spec.label,
          color: 'magenta',
          answering: false,
          canRestore: false,
          restoreReason: null
        }
      };
      useApp.setState({
        machineStates: [...app.machineStates, machine],
        sessions: [...app.sessions, session],
        attentionSince: { ...app.attentionSince, [session.id]: Date.now() },
        excerpts: { ...app.excerpts, [session.id]: 'waiting for you' }
      } as never);
      await wait(250);
      return readState();
    },

    /**
     * End every session this run made, through the same bridge the End verb
     * uses. It is the cleanup, and it names only ids the probe asked for.
     */
    /**
     * Every toast on screen, with the height it wants and the height it has.
     *
     * It reads the live boxes rather than the strings, because whether a
     * person can read the second sentence is a question about layout and not
     * about the copy.
     */
    async measureToasts() {
      const out: P93ToastFit[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('.toast-text')) {
        const text = (el.textContent ?? '').trim();
        const style = getComputedStyle(el);
        const clamp = style.getPropertyValue('-webkit-line-clamp').trim();
        out.push({
          text,
          chars: text.length,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          clamp: clamp === '' ? null : clamp,
          whole: el.scrollHeight <= el.clientHeight
        });
      }
      return Promise.resolve(out);
    },

    async killAll(ids) {
      for (const id of ids) {
        await window.gmux?.sessions.kill(id).catch(() => undefined);
      }
      await wait(800);
      return readState();
    }
  };

  window.__gmuxP93 = drive;
}
