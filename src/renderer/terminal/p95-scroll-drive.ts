/**
 * The Phase 95 harness drive, being the renderer half of
 * `build/probe-p95-scroll.mjs`.
 *
 * ## What the probe is proving with it
 *
 * That asking a session with no pane of its own on this Mac where its
 * scrollbar is produces an answer rather than a stack trace once a second, and
 * that a session running on this Mac still scrolls exactly as it did.
 *
 * ## What is real in a run, and what this drive supplies
 *
 * Real: the project tab, the machine, the sessions, their rows in the manifest,
 * the scroll calls, the wheel events and the key presses. The machine is the
 * loopback machine `build/with-scratch-machine.mjs` starts, and the session on
 * it is a session that is really running over there.
 *
 * Supplied: nothing about a session's status and nothing about a scroll answer.
 * This drive presses keys, turns the wheel and reads what is on screen.
 *
 * ## How it is reached
 *
 * It assigns exactly one object to `window` and changes nothing else, in the
 * same shape as `../app/p93-attention-drive.ts`. Outside the harness it is one
 * unused property.
 */

import type { InstalledGmuxApi, TerminalScrollState } from '@shared/ipc';
import { useApp } from '../state/store';
import { gmuxBridge } from '../bridge';

/** One session row, with the two fields this phase reads. */
export interface P95Session {
  id: string;
  name: string;
  status: string;
  machineId: string | null;
  /** The name of the session on the session server, for a probe that ends it. */
  tmuxName: string;
}

/** What one call into the scroll bridge answered. */
export interface P95Read {
  ok: boolean;
  state: TerminalScrollState | null;
  error: string | null;
}

/** Everything the probe reads between two gestures. */
export interface P95State {
  orientation: string;
  projects: { id: string; path: string; machineId: string | null }[];
  activeProjectId: string | null;
  activeSessionId: string | null;
  sessions: P95Session[];
  /** True while the identity strip is in the document. */
  identityStrip: boolean;
  /**
   * The read back button's text and its tooltip, or null when it is not drawn.
   *
   * PHASE 100 changed what this element is. It was a span saying that scrolling
   * back was not available. It is a button that opens the last lines panel now.
   * The FIELD keeps its name, because the thing the probe reads is still "what
   * the band above a session on another machine carries". Step 5 of
   * `build/probe-p95-scroll.mjs` reads the new text and the new tooltip out of
   * it, and that step was changed in the same commit as this comment.
   */
  note: { text: string; title: string } | null;
  /** True while a terminal pane is mounted. */
  terminal: boolean;
  /** True while the scrollbar's own lane is in the document. */
  scrollbarLane: boolean;
  /** The lane's thumb height in pixels, or null when there is no thumb. */
  thumbHeight: number | null;
  toasts: string[];
}

declare global {
  interface Window {
    __gmuxP95?: P95Drive;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

type ScrollApi = NonNullable<InstalledGmuxApi['scroll']>;

function scrollApi(): ScrollApi | null {
  return gmuxBridge()?.scroll ?? null;
}

function readState(): P95State {
  const app = useApp.getState();
  const activeProjectId = app.activeProjectId;
  // PHASE 100 renamed the element this reads. Phase 95 drew a span saying that
  // scrolling back was not available, with class `strip-note`. It is a button
  // that opens the last lines panel now, with class `strip-readback`, and the
  // sentence it carries is its tooltip. The reading is otherwise unchanged.
  const noteEl = document.querySelector('.strip-readback');
  const thumb = document.querySelector<HTMLElement>(
    '.gmux-terminal-scrollbar-thumb'
  );
  return {
    orientation: String(app.sessionOrientation),
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
    sessions: app.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      status: String(s.status),
      machineId: s.machine?.id ?? null,
      tmuxName: s.tmuxName
    })),
    identityStrip: document.querySelector('.identity-strip') !== null,
    note:
      noteEl === null
        ? null
        : {
            text: (noteEl.textContent ?? '').trim(),
            title: noteEl.getAttribute('title') ?? ''
          },
    terminal: document.querySelector('.xterm-screen') !== null,
    scrollbarLane: document.querySelector('.gmux-terminal-scrollbar') !== null,
    thumbHeight: thumb === null ? null : Math.round(thumb.getBoundingClientRect().height),
    toasts: [...document.querySelectorAll('.toast-text')].map((t) =>
      (t.textContent ?? '').trim()
    )
  };
}

export interface P95Drive {
  state(): Promise<P95State>;
  orientation(which: 'top' | 'right'): Promise<P95State>;
  machineUp(id: string): Promise<{
    rows: { id: string; usable: boolean; confirmed: boolean }[];
    prepare: unknown;
  }>;
  openLocal(path: string): Promise<P95State>;
  openRemote(machineId: string, path: string): Promise<unknown>;
  create(spec: {
    name: string;
    agent: string;
    machineId?: string;
  }): Promise<P95State>;
  select(sessionId: string): Promise<P95State>;
  read(sessionId: string): Promise<P95Read>;
  by(sessionId: string, lines: number): Promise<P95Read>;
  to(sessionId: string, position: number): Promise<P95Read>;
  live(sessionId: string): Promise<P95Read>;
  wheel(times: number, deltaY: number): Promise<number>;
  pageKey(key: 'PageUp' | 'PageDown', times: number): Promise<number>;
  type(text: string): Promise<boolean>;
  resize(): Promise<boolean>;
  kill(sessionId: string): Promise<P95State>;
  sleep(ms: number): Promise<P95State>;
}

async function callBridge(
  run: (api: ScrollApi) => Promise<TerminalScrollState>
): Promise<P95Read> {
  const api = scrollApi();
  if (api === null) return { ok: false, state: null, error: 'no scroll bridge' };
  try {
    return { ok: true, state: await run(api), error: null };
  } catch (err) {
    return { ok: false, state: null, error: String(err) };
  }
}

export function registerP95ScrollDrive(): void {
  const drive: P95Drive = {
    async state() {
      return readState();
    },

    async orientation(which) {
      useApp.getState().setSessionOrientation(which);
      await wait(400);
      return readState();
    },

    /**
     * Confirm one machine the way Settings does, then prepare it.
     *
     * The hash and the lines come from main's own row, which is where the
     * sheet reads them too, so a stale hash refuses here exactly as it would
     * refuse a person.
     */
    async machineUp(id) {
      const api = window.gmux?.machines;
      if (api === undefined) return { rows: [], prepare: 'no machines bridge' };
      const before = await api.rows();
      const row = before.rows.find((r) => r.id === id);
      if (row !== undefined) {
        await api.confirm({ id, hashRead: row.hash, linesRead: row.lines });
      }
      let prepare: unknown = 'not attempted';
      try {
        const first = await api.prepare(id);
        prepare = first;
        // A machine running a version nobody measured is accepted here the way
        // a person accepts it, over the sheet main sent, and then prepared
        // again. Nothing else about the machine is supplied.
        if (first.class === 'version-unmeasured' && first.acceptSheet != null) {
          await api.acceptVersion({
            id,
            version: first.version ?? '',
            hashRead: first.acceptSheet.hash,
            linesRead: first.acceptSheet.lines
          });
          prepare = await api.prepare(id);
        }
      } catch (err) {
        prepare = String(err);
      }
      await wait(1500);
      const after = await api.rows();
      return {
        rows: after.rows.map((r) => ({
          id: r.id,
          usable: r.usable === true,
          confirmed: r.confirmedAt !== null && r.confirmedAt !== undefined
        })),
        prepare
      };
    },

    async openLocal(path) {
      await useApp.getState().addProjectPath(path);
      await wait(700);
      return readState();
    },

    async openRemote(machineId, path) {
      const result = await useApp.getState().addRemoteProject(machineId, path);
      await wait(1200);
      return { result, state: readState() };
    },

    async create(spec) {
      await useApp.getState().createSession({
        name: spec.name,
        agent: spec.agent as never,
        machineId: spec.machineId
      });
      await wait(2500);
      return readState();
    },

    async select(sessionId) {
      useApp.getState().setActiveSession(sessionId);
      await wait(1200);
      return readState();
    },

    async read(sessionId) {
      return callBridge((api) => api.state({ sessionId }));
    },

    async by(sessionId, lines) {
      return callBridge((api) => api.by({ sessionId, lines }));
    },

    async to(sessionId, position) {
      return callBridge((api) => api.to({ sessionId, position }));
    },

    async live(sessionId) {
      return callBridge((api) => api.live(sessionId));
    },

    /** Real wheel events on the pane, which is where xterm listens. */
    async wheel(times, deltaY) {
      const screen = document.querySelector('.xterm-screen');
      if (screen === null) return 0;
      for (let i = 0; i < times; i += 1) {
        screen.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY,
            deltaMode: 0,
            bubbles: true,
            cancelable: true
          })
        );
        await wait(30);
      }
      await wait(400);
      return times;
    },

    /** Shift+PageUp and Shift+PageDown, on the element xterm listens on. */
    async pageKey(key, times) {
      const target =
        document.querySelector('.xterm-helper-textarea') ??
        document.querySelector('.xterm');
      if (target === null) return 0;
      for (let i = 0; i < times; i += 1) {
        target.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            shiftKey: true,
            bubbles: true,
            cancelable: true
          })
        );
        await wait(120);
      }
      await wait(500);
      return times;
    },

    /** Type into the selected session through the same bridge a key uses. */
    async type(text) {
      const app = useApp.getState();
      const projectId = app.activeProjectId;
      const sessionId =
        projectId === null ? null : (app.activeSessionByProject[projectId] ?? null);
      if (sessionId === null) return false;
      window.gmux?.term.sendInput(sessionId, text);
      await wait(800);
      return true;
    },

    /** One window resize, which is what arms the hold across a re-fit. */
    async resize() {
      window.dispatchEvent(new Event('resize'));
      await wait(600);
      return true;
    },

    async kill(sessionId) {
      await window.gmux?.sessions.kill(sessionId).catch(() => undefined);
      await wait(1500);
      return readState();
    },

    async sleep(ms) {
      await wait(ms);
      return readState();
    }
  };

  window.__gmuxP95 = drive;
}
