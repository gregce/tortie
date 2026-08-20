/**
 * The Phase 96 harness drive, being the renderer half of
 * `build/probe-p96-remote-surfaces.mjs`.
 *
 * ## WHAT THE PROBE IS PROVING WITH IT
 *
 * Two of the four defects Phase 96 closes, both of them on a surface a person
 * reaches for a file or a session that is on another computer.
 *
 *  1. THE EDITOR REFUSES THE KEYSTROKE. `save` in ../editor/tab-io.ts has
 *     refused a remote tab since Phase 73, and the band ../editor/EditorPanel
 *     draws over it already says that typing changes nothing. Monaco was never
 *     told. {@link readEditor} types one character into the real model and
 *     reads the option and the text back, so the defect and the fix are two
 *     numbers rather than a sentence.
 *  2. THE SESSION MENU DOES NOT REACH THIS MAC'S SERVER FOR A SESSION THAT IS
 *     NOT ON IT. {@link menu} returns the exact item list the pane hands to the
 *     native bridge, once for a session on this Mac and once for the same
 *     session carrying a machine.
 *
 * ## WHAT IS REAL IN A RUN, AND WHAT THIS DRIVE SUPPLIES
 *
 * Real: the project tab, the file, the Monaco model the file is loaded into,
 * the session, its record in the manifest, and the terminal mounted over it.
 *
 * Supplied, and there is exactly one thing. THE SECOND COMPUTER. Nothing is
 * signed in to the machine this drive names, and no far side is contacted.
 * {@link makeRemote} adds a `remote` reference to a tab that is already open and
 * already loaded, and {@link setMachine} adds a machine to a session row that is
 * already running. What the probe measures is what Tortie DRAWS and what Monaco
 * REFUSES for such a row, and not what a far side answers. A real second
 * computer is measured by `npm run smoke:remote` and by
 * `npm run probe:remotereview`.
 *
 * ## HOW IT IS REACHED
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * same shape as ./p93-attention-drive.ts beside it. Outside the harness it is
 * one unused property. The probe calls its methods one at a time over the
 * DevTools protocol, so it can look at the screen between two gestures.
 */

import type { Terminal } from '@xterm/xterm';
import type { Session } from '@shared/types';
import type { MenuItemSpec } from '../state/store';
import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { getLoadedMonaco } from '../editor/monaco-loader';
import { hasLiveTerminal } from '../terminal/capture';
import { getTerminal, registerTerminal } from '../terminal/drop/registry';
import { terminalMenuItems } from '../terminal/terminal-menu';

/** What one reading of the editor found. */
export interface P96EditorReading {
  /** True when no Monaco editor is mounted, in which case nothing else is real. */
  missing: boolean;
  /** The tab's id, so the probe can see both readings are the same tab. */
  tabId: string | null;
  /** The tab's mode at the moment of the reading. */
  mode: string | null;
  /** True when the tab names a file on another machine. */
  remote: boolean;
  /** Monaco's own `readOnly` option, read off the live editor. */
  readOnly: boolean;
  /** The model text before the type command. */
  before: string;
  /** The model text after it. */
  after: string;
  /** True when the character the drive typed landed in the model. */
  accepted: boolean;
  /** The store's own dirty flag before the type command. */
  dirtyBefore: boolean;
  /** The same flag after it. A refused keystroke moves neither. */
  dirtyAfter: boolean;
}

/** One row of a menu reading. */
export interface P96MenuRow {
  label: string;
  present: boolean;
  disabled: boolean;
}

/** What one reading of the session menu found. */
export interface P96MenuReading {
  sessionId: string | null;
  /** The machine label the row carries, or null when it runs on this Mac. */
  machine: string | null;
  /** True when a terminal is mounted for that session in this window. */
  live: boolean;
  /**
   * True when this drive put the session's own terminal back in the registry
   * before the reading. See {@link keepTerminalLive} for why that is needed and
   * what it does not pretend to be.
   */
  terminalHeld: boolean;
  rows: P96MenuRow[];
}

declare global {
  interface Window {
    __gmuxP96RemoteSurfaces?: P96Drive;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** The machine this drive names. Nothing is signed in to it. */
const MACHINE = {
  id: 'p96far',
  label: 'Studio',
  color: 'magenta' as const
};

/** The one character the editor reading types. */
const TYPED = 'X';

function activeTab(): ReturnType<typeof useEditor.getState>['tabs'][number] | null {
  return useEditor.getState().activeTab();
}

/**
 * Read the editor the way a person uses it: look at it, type one character,
 * look again.
 *
 * The type command is Monaco's own `type` handler, which is what a keypress
 * runs. A read-only editor drops it, and that dropped character is the whole
 * measurement.
 */
async function readEditorNow(): Promise<P96EditorReading> {
  const m = getLoadedMonaco();
  const tab = activeTab();
  const editors = m?.editor.getEditors() ?? [];
  const editor = editors[0];
  if (m === undefined || m === null || editor === undefined || tab === null) {
    return {
      missing: true,
      tabId: tab?.id ?? null,
      mode: tab?.mode ?? null,
      remote: tab?.remote !== undefined,
      readOnly: false,
      before: '',
      after: '',
      accepted: false,
      dirtyBefore: false,
      dirtyAfter: false
    };
  }
  const readOnly = editor.getOption(m.editor.EditorOption.readOnly) === true;
  const dirtyBefore = tab.dirty;
  const before = editor.getValue();
  editor.focus();
  editor.setPosition({ lineNumber: 1, column: 1 });
  editor.trigger('p96', 'type', { text: TYPED });
  await wait(150);
  const after = editor.getValue();
  return {
    missing: false,
    tabId: tab.id,
    mode: tab.mode,
    remote: tab.remote !== undefined,
    readOnly,
    before,
    after,
    accepted: after !== before,
    dirtyBefore,
    dirtyAfter: useEditor.getState().activeTab()?.dirty === true
  };
}

/** Every item of a built menu, flattened to label, present and disabled. */
function rowsOf(items: (MenuItemSpec | 'sep')[]): P96MenuRow[] {
  return items
    .filter((one): one is MenuItemSpec => one !== 'sep')
    .map((one) => ({
      label: one.label,
      present: true,
      disabled: one.disabled === true
    }));
}

export interface P96Drive {
  openFile(spec: {
    repoPath: string;
    relPath: string;
    path: string;
  }): Promise<P96EditorReading>;
  readEditor(): Promise<P96EditorReading>;
  makeRemote(spec: { repoPath: string }): Promise<P96EditorReading>;
  makeSession(name: string): Promise<P96MenuReading>;
  menu(): Promise<P96MenuReading>;
  setMachine(on: boolean): Promise<P96MenuReading>;
  killAll(ids: string[]): Promise<string[]>;
  sessionIds(): Promise<string[]>;
}

export function registerP96RemoteSurfacesDrive(): void {
  /** The session this run made, so both menu readings name the same row. */
  let sessionId: string | null = null;
  /** That session's own xterm, kept for the length of the two readings. */
  let heldTerminal: Terminal | null = null;
  /** True once this drive has put that xterm back in the registry. */
  let heldPutBack = false;
  /** Undo the put back, so the registry is as it was when the run ends. */
  let releaseHold: () => void = () => undefined;

  /**
   * Keep the session's own terminal in the registry across the machine change.
   *
   * WHY THIS IS HERE, AND WHAT IT IS NOT. A session that gains a machine leaves
   * the local project tab's session list, so its pane unmounts and the terminal
   * it owned is unregistered. MEASURED on 2026-08-19 without this: the second
   * menu reading came back with `live` false, and every capture item then
   * disappeared because `canCapture` is false with no terminal, which measures
   * the pane unmounting rather than the defect.
   *
   * For a session on a REAL machine the terminal is live, because Tortie is
   * attached to it over the link, and that is exactly the state defect 2 is
   * about. So this drive puts the same real xterm object back under the same
   * session id, which makes the machine field the ONLY difference between the
   * two readings. It is a supplied fact and every reading says so in
   * `terminalHeld`.
   */
  function keepTerminalLive(): void {
    if (sessionId === null || heldTerminal === null) return;
    if (getTerminal(sessionId) !== null) return;
    releaseHold();
    releaseHold = registerTerminal(sessionId, heldTerminal);
    heldPutBack = true;
  }

  /**
   * The selection every menu reading is taken with.
   *
   * A snapshot rather than nothing, so Copy, Copy as HTML and Capture Selection
   * are ENABLED in both readings. An item that is enabled in the first reading
   * and disabled in the second is a widening of the refusal, and this is what
   * makes such a change visible instead of hiding it under a row that reads
   * disabled either way.
   */
  const selection = {
    text: 'one\ntwo',
    position: { start: { x: 0, y: 1 }, end: { x: 3, y: 1 } }
  };

  function menuNow(): P96MenuReading {
    keepTerminalLive();
    const row = useApp.getState().sessions.find((s) => s.id === sessionId);
    if (row === undefined) {
      return {
        sessionId,
        machine: null,
        live: false,
        terminalHeld: heldPutBack,
        rows: []
      };
    }
    return {
      sessionId: row.id,
      machine: row.machine?.label ?? null,
      live: hasLiveTerminal(row.id),
      terminalHeld: heldPutBack,
      rows: rowsOf(terminalMenuItems(row, { selection }))
    };
  }

  const drive: P96Drive = {
    /**
     * Open one folder as a tab and one real file in it.
     *
     * Both verbs are the store's own, which are the ones the folder picker and
     * the explorer call. The wait is for Monaco, because the chunk is loaded on
     * the first open and the reading below is of a real mounted editor.
     */
    async openFile(spec) {
      await useApp.getState().addProjectPath(spec.repoPath);
      await wait(600);
      useEditor.getState().openFromRequest({
        repoPath: spec.repoPath,
        relPath: spec.relPath,
        path: spec.path,
        mode: 'file',
        // The explorer's own gesture. Only 'search' changes what the editor
        // does with a request, so this is a record of where it came from.
        source: 'tree',
        preview: false
      });
      for (let i = 0; i < 60; i += 1) {
        const tab = activeTab();
        const ready =
          tab !== null &&
          !tab.loading &&
          tab.error === null &&
          (getLoadedMonaco()?.editor.getEditors().length ?? 0) > 0;
        if (ready) break;
        await wait(250);
      }
      await wait(400);
      return readEditorNow();
    },

    async readEditor() {
      return readEditorNow();
    },

    /**
     * Give the tab that is already open a file on another machine.
     *
     * This is the same tab shape `openFromRequest` produces for a review tab.
     * Only the arrival path differs, and the probe's report says so. Nothing is
     * signed in to the machine and no far side is read: the tab keeps the text
     * it already loaded, which is what lets the two readings be compared
     * character for character.
     */
    async makeRemote(spec) {
      const tab = activeTab();
      if (tab === null) return readEditorNow();
      useEditor.setState({
        tabs: useEditor.getState().tabs.map((t) =>
          t.id === tab.id
            ? {
                ...t,
                mode: 'file' as const,
                remote: {
                  machineId: MACHINE.id,
                  machineLabel: MACHINE.label,
                  repoPath: spec.repoPath
                }
              }
            : t
        )
      } as never);
      // Two frames, so the host's wiring effect has run and Monaco has been
      // told. The reading below is of the option Monaco is actually holding.
      await wait(400);
      return readEditorNow();
    },

    /** One real session on the harness session server, with a real terminal. */
    async makeSession(name) {
      await useApp.getState().createSession({ name, agent: 'shell' });
      for (let i = 0; i < 60; i += 1) {
        const row = useApp.getState().sessions.find((s) => s.name === name);
        if (row !== undefined && hasLiveTerminal(row.id)) {
          sessionId = row.id;
          heldTerminal = getTerminal(row.id);
          break;
        }
        if (row !== undefined) sessionId = row.id;
        await wait(250);
      }
      await wait(400);
      return menuNow();
    },

    async menu() {
      return Promise.resolve(menuNow());
    },

    /**
     * Put the session on another machine, or take it off again.
     *
     * Main pushes its own session list every few seconds and that push is the
     * truth, so this writes the row and the probe reads the menu straight
     * afterwards rather than minutes later.
     */
    async setMachine(on) {
      const app = useApp.getState();
      useApp.setState({
        sessions: app.sessions.map((s): Session => {
          if (s.id !== sessionId) return s;
          if (!on) {
            const { machine: _drop, ...rest } = s;
            return rest;
          }
          return {
            ...s,
            machine: {
              id: MACHINE.id,
              label: MACHINE.label,
              color: MACHINE.color,
              answering: true,
              canRestore: false,
              restoreReason: null
            }
          };
        })
      } as never);
      await wait(250);
      return menuNow();
    },

    async sessionIds() {
      return Promise.resolve(useApp.getState().sessions.map((s) => s.id));
    },

    /** End every session this run made, by id and by nothing else. */
    async killAll(ids) {
      releaseHold();
      releaseHold = () => undefined;
      heldTerminal = null;
      for (const id of ids) {
        await window.gmux?.sessions.kill(id).catch(() => undefined);
      }
      await wait(800);
      return useApp.getState().sessions.map((s) => s.id);
    }
  };

  window.__gmuxP96RemoteSurfaces = drive;
}
