/**
 * Context view state — what has been read, what the user is looking at, and
 * nothing else.
 *
 * FOUR RULES, all of them refusals from research 29 rather than preferences:
 *
 *  1. **Nothing here polls, and nothing here notifies.** The watcher tells the
 *     view that config changed and the view re-reads. There is no toast, no
 *     rail badge, no dot on a session tab and no banner (§8.4). A user who
 *     edits `.mcp.json` while three sessions run sees nothing, because they
 *     already know what they did.
 *  2. **A failed read never blanks the panel.** One file that will not parse is
 *     one error row inside its own section (§11 item 4); a missing bridge is
 *     one line and a view that still renders, which is why `bridge.ts` is
 *     feature-detected rather than assumed.
 *  3. **The agent choice is per project and persisted**, because "which agent
 *     am I asking about" is a property of the repo you are in, not of the app.
 *  4. **Session mode is a MODE, not a second store** (§8.3). This store holds
 *     which session the view is pinned to; the record of what that session
 *     launched with, and the comparison against now, live in
 *     `state/context-session.ts` and `@shared/context-snapshot`. Keeping the
 *     comparison out of here is what stops a second implementation of "did
 *     this change" appearing beside the first.
 */

import { create } from 'zustand';
import type { ContextScanResult } from '@shared/context';
import type { ContextSkillPinCheck } from '@shared/ipc';
import { contextAvailable, contextBridge } from './bridge';

export type ContextStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable';

const AGENT_KEY = (cwd: string): string => `gmux.context.agent.${cwd}`;

function loadAgent(cwd: string): string | null {
  try {
    const raw = localStorage.getItem(AGENT_KEY(cwd));
    return raw === null || raw === '' ? null : raw;
  } catch {
    return null;
  }
}

function saveAgent(cwd: string, agentId: string | null): void {
  try {
    if (agentId === null) localStorage.removeItem(AGENT_KEY(cwd));
    else localStorage.setItem(AGENT_KEY(cwd), agentId);
  } catch {
    /* a remembered choice is cosmetic; never fail the view over it */
  }
}

export interface ContextViewState {
  /** The project this scan belongs to. Switching projects re-reads. */
  cwd: string | null;
  status: ContextStatus;
  scan: ContextScanResult | null;
  /** The sentence shown when the whole read failed, never a stack trace. */
  error: string | null;

  /** §5.3 — one filter across every section. */
  filter: string;
  /** §5.2 — `null` is "All agents". Persisted per project. */
  agentId: string | null;

  /** §8.3 — browse is the sidebar, session is the readout. */
  mode: 'browse' | 'session';
  /** Which session the readout is pinned to, in session mode. */
  sessionId: string | null;
  /**
   * The session's DISPLAY NAME, carried beside its id because the header band
   * shows it. Without it the pill printed the raw uuid, which was the second
   * sign the mode had never been driven end to end.
   */
  sessionName: string | null;

  /**
   * REQUIREMENT 2, the half that lives in the view: every refresh re-hashes the
   * skills Tortie installed and compares that hash against the one recorded when
   * a human approved the install. Keyed by entry id.
   *
   * A row whose hashes differ is DISABLED in this list and asks again. Tortie
   * cannot stop an agent loading a file that is on disk, and the sentence on the
   * row says exactly that rather than implying a protection Tortie does not
   * have. Removing it is the only thing that does stop it, and that verb is one
   * click away on the same row.
   */
  pins: Map<string, ContextSkillPinCheck>;

  /** Monotonic; every read bumps it so a late answer cannot overtake. */
  epoch: number;

  syncProject(cwd: string | null): void;
  refresh(): void;
  setFilter(next: string): void;
  setAgent(agentId: string | null): void;
  /**
   * Open the readout for one session (§8.3).
   *
   * IT IS REACHED FROM THE SESSION CONTEXT MENU. That entry point is the whole
   * difference between a feature and a component: Phase 22 first shipped this
   * function with zero call sites anywhere in the tree, so the snapshot was
   * written at every launch, stored in its own manifest column, read back over
   * its own IPC channel, and could not be seen by anybody.
   */
  enterSessionMode(
    sessionId: string,
    agentId: string | null,
    sessionName: string
  ): void;
  /** Back to the plain list. */
  exitSessionMode(): void;
}

export const useContext = create<ContextViewState>((set, get) => {
  /**
   * Requirement 2's re-check, run after every read.
   *
   * It asks main for the pins it holds for the skill directories now on screen,
   * and main re-hashes each one at that moment. Skills nobody installed through
   * Tortie have no pin and are simply absent from the answer: inventing one
   * would disable rows the user set up in their own terminal.
   */
  const recheckPins = async (
    scan: ContextScanResult,
    started: number
  ): Promise<void> => {
    const api = contextBridge();
    if (api === null || typeof api.skillPins !== 'function') return;
    const byPath = new Map<string, string>();
    for (const entry of scan.entries) {
      if (entry.category !== 'skill') continue;
      const path = (entry.realPath !== '' ? entry.realPath : entry.sourcePath).replace(
        /\/SKILL\.md$/,
        ''
      );
      byPath.set(path, entry.id);
    }
    if (byPath.size === 0) {
      set({ pins: new Map() });
      return;
    }
    try {
      const checks = await api.skillPins([...byPath.keys()]);
      if (get().epoch !== started) return;
      const pins = new Map<string, ContextSkillPinCheck>();
      for (const check of checks) {
        const id = byPath.get(check.path);
        if (id !== undefined) pins.set(id, check);
      }
      set({ pins });
    } catch {
      // A pin re-check that failed leaves the previous answer alone. It never
      // clears the map, because an empty map reads as "everything is approved"
      // and that is the one thing it must never say by accident.
    }
  };

  /** Read one project, epoch-gated so a project switch cannot be overtaken. */
  const read = (cwd: string): void => {
    const api = contextBridge();
    if (api === null) {
      set({ status: 'unavailable', scan: null, error: null });
      return;
    }
    const started = get().epoch + 1;
    set({ status: 'loading', epoch: started });
    void api
      // EVERY registry agent, and the view filters in the renderer. Asking for
      // one agent would turn the band's selector into a round trip, and the
      // measured cost of the whole set is 11 ms — there is nothing to save by
      // narrowing it. `hash: 'head'` is the cheap mode: the defining file only,
      // about 1 ms for the set, which is what the session comparison needs.
      .scan({ cwd, agent: null, hash: 'head' })
      .then((scan) => {
        // A late answer for a project the user has left must never paint.
        if (get().epoch !== started || get().cwd !== cwd) return;
        set({ status: 'ready', scan, error: null });
        void recheckPins(scan, started);
      })
      .catch((err: unknown) => {
        if (get().epoch !== started || get().cwd !== cwd) return;
        set({
          status: 'error',
          error: err instanceof Error ? err.message : String(err)
        });
      });
  };

  return {
    cwd: null,
    status: contextAvailable() ? 'idle' : 'unavailable',
    scan: null,
    error: null,
    filter: '',
    agentId: null,
    mode: 'browse',
    sessionId: null,
    sessionName: null,
    pins: new Map(),
    epoch: 0,

    syncProject(cwd) {
      if (get().cwd === cwd) return;
      const agentId = cwd === null ? null : loadAgent(cwd);
      set({
        cwd,
        scan: null,
        error: null,
        filter: '',
        agentId,
        // The readout belongs to a session in the project you left.
        mode: 'browse',
        sessionId: null,
        sessionName: null,
        pins: new Map(),
        status: contextAvailable()
          ? cwd === null
            ? 'idle'
            : 'loading'
          : 'unavailable'
      });
      if (cwd !== null) read(cwd);
    },

    refresh() {
      const { cwd } = get();
      if (cwd !== null) read(cwd);
    },

    setFilter(next) {
      set({ filter: next });
    },

    setAgent(agentId) {
      const { cwd } = get();
      set({ agentId });
      if (cwd !== null) saveAgent(cwd, agentId);
    },

    enterSessionMode(sessionId, agentId, sessionName) {
      set({ mode: 'session', sessionId, sessionName, agentId });
    },

    exitSessionMode() {
      set({ mode: 'browse', sessionId: null, sessionName: null });
    }
  };
});
