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
 *
 *  5. **A project on another machine is one call, and it is never on a timer**
 *     (Phase 108). The read happens when the view opens on the tab, when the
 *     tab's project changes, and when a person presses Refresh. At no other
 *     time. Rule 1 holds over there with no watcher at all: nothing on the
 *     machine tells this store anything, and the Refresh tooltip says so.
 */

import { create } from 'zustand';
import type { ContextScanResult } from '@shared/context';
import type {
  ContextSkillPinCheck,
  InstalledGmuxApi,
  MachineContextMode
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { localPathOf, sameTarget, targetKey } from '@shared/workspace-target';
import { contextAvailable, contextBridge } from './bridge';
import { gmuxBridge } from '../bridge';

/**
 * `elsewhere` was Phase 90.1, and Phase 108 narrowed it to one honest meaning:
 * this build's preload cannot ask a machine anything, so there is nothing to
 * read and the view says so. A project on another machine is otherwise READ,
 * over `machines:readContext`, and lands in `ready` like a local one, with
 * `remoteMode` carrying what the machine answered. That is the Phase 98
 * search-store shape, copied.
 */
export type ContextStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable'
  | 'elsewhere';

/** The machines bridge, or null on a build without one (Phase 108). */
function machinesBridge(): InstalledGmuxApi['machines'] | null {
  return gmuxBridge()?.machines ?? null;
}

/**
 * Can this build read agent files on another machine at all (Phase 108)?
 *
 * An older preload has no `readContext` on its machines bridge. Asking it
 * would throw, so nothing asks it and the panel says so instead.
 */
export function remoteContextAvailable(): boolean {
  return typeof machinesBridge()?.readContext === 'function';
}

/**
 * Where one project's remembered agent choice lives.
 *
 * `targetKey` of a project on this Mac is the bare path, so this key is byte
 * for byte the key it was before Phase 90.1 and a choice made in an older
 * build is still found.
 */
const AGENT_KEY = (target: WorkspaceTarget): string =>
  `gmux.context.agent.${targetKey(target)}`;

function loadAgent(target: WorkspaceTarget): string | null {
  try {
    const raw = localStorage.getItem(AGENT_KEY(target));
    return raw === null || raw === '' ? null : raw;
  } catch {
    return null;
  }
}

function saveAgent(target: WorkspaceTarget, agentId: string | null): void {
  try {
    if (agentId === null) localStorage.removeItem(AGENT_KEY(target));
    else localStorage.setItem(AGENT_KEY(target), agentId);
  } catch {
    /* a remembered choice is cosmetic; never fail the view over it */
  }
}

export interface ContextViewState {
  /**
   * Which folder, on which computer, this scan belongs to. Switching projects
   * re-reads.
   *
   * PHASE 90.1 replaced a bare path here, for the reason in the search store:
   * two machines can hold the same path, and a string could not tell them
   * apart.
   */
  target: WorkspaceTarget | null;
  status: ContextStatus;
  scan: ContextScanResult | null;
  /** The sentence shown when the whole read failed, never a stack trace. */
  error: string | null;

  /**
   * PHASE 108. What the machine answered about this project, or null when the
   * scan came from this Mac. It is a mode word and never a sentence. Every
   * sentence a person reads is drawn from src/renderer/machines/presentation.ts.
   * The three fields are set with the answer they describe and cleared with
   * it, so a note can never outlive its rows.
   */
  remoteMode: MachineContextMode | null;
  /** PHASE 108. That machine's own label, as main sent it. Never composed here. */
  machineLabel: string | null;
  /** PHASE 108. The pass cap ended the read with paths still unread. */
  remoteCut: boolean;

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

  syncProject(target: WorkspaceTarget | null): void;
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

  /**
   * PHASE 108. Read one project on another machine, epoch-gated exactly like
   * the local branch.
   *
   * Every mode the machine can answer lands as `ready`: `context` with the
   * scan, and the three refusal words with `scan: null` and the word, which
   * the view draws as a sentence. Only a rejected promise is `error`, because
   * main never throws for anything a machine said.
   *
   * PINS ARE NEVER ASKED FOR A REMOTE SCAN. `recheckPins` re-hashes
   * directories on THIS Mac's disk, and a remote row's path would hash a
   * different file here or nothing. The map is set empty with the answer, and
   * no install, enable or update flow is reachable on a remote tab, so no
   * surface reads a pin it does not have.
   */
  const readRemote = (target: WorkspaceTarget): void => {
    const machines = machinesBridge();
    if (machines === null || typeof machines.readContext !== 'function') {
      set({
        status: 'elsewhere',
        scan: null,
        error: null,
        remoteMode: null,
        machineLabel: null,
        remoteCut: false
      });
      return;
    }
    const started = get().epoch + 1;
    set({ status: 'loading', epoch: started });
    void machines
      .readContext({ machineId: target.machineId, cwd: target.path })
      .then((answer) => {
        // A late answer for a project the user has left must never paint.
        if (get().epoch !== started || !sameTarget(get().target, target)) return;
        set({
          status: 'ready',
          scan: answer.mode === 'context' ? answer.scan : null,
          error: null,
          remoteMode: answer.mode,
          machineLabel: answer.machineLabel,
          remoteCut: answer.mode === 'context' ? answer.cut : false,
          pins: new Map()
        });
      })
      .catch((err: unknown) => {
        if (get().epoch !== started || !sameTarget(get().target, target)) return;
        set({
          status: 'error',
          error: err instanceof Error ? err.message : String(err)
        });
      });
  };

  /**
   * Read one project, epoch-gated so a project switch cannot be overtaken.
   *
   * It takes the TARGET and asks `localPathOf` for the folder. A target whose
   * folder is on another machine goes to `readRemote` (Phase 108), so the
   * local reader can still never be reached with a path that names another
   * computer.
   */
  const read = (target: WorkspaceTarget): void => {
    const cwd = localPathOf(target);
    if (cwd === null) {
      readRemote(target);
      return;
    }
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
        if (get().epoch !== started || !sameTarget(get().target, target)) return;
        set({
          status: 'ready',
          scan,
          error: null,
          // The three machine fields go with the answer they describe. A local
          // answer has none, so a note about a machine can never sit under
          // rows read on this Mac.
          remoteMode: null,
          machineLabel: null,
          remoteCut: false
        });
        void recheckPins(scan, started);
      })
      .catch((err: unknown) => {
        if (get().epoch !== started || !sameTarget(get().target, target)) return;
        set({
          status: 'error',
          error: err instanceof Error ? err.message : String(err)
        });
      });
  };

  return {
    target: null,
    status: contextAvailable() ? 'idle' : 'unavailable',
    scan: null,
    error: null,
    remoteMode: null,
    machineLabel: null,
    remoteCut: false,
    filter: '',
    agentId: null,
    mode: 'browse',
    sessionId: null,
    sessionName: null,
    pins: new Map(),
    epoch: 0,

    syncProject(target) {
      // BY VALUE, not by reference. The view composes a fresh target object on
      // every render, and a comparison by reference would blank this panel on
      // every render instead of never.
      if (sameTarget(get().target, target)) return;
      const local = target === null ? null : localPathOf(target);
      const agentId = target === null ? null : loadAgent(target);
      // PHASE 108. A project on another machine reads over the machines
      // bridge, so `elsewhere` is only the build that has no such bridge.
      const status: ContextStatus = !contextAvailable()
        ? 'unavailable'
        : target === null
          ? 'idle'
          : local === null
            ? remoteContextAvailable()
              ? 'loading'
              : 'elsewhere'
            : 'loading';
      set({
        target,
        scan: null,
        error: null,
        remoteMode: null,
        machineLabel: null,
        remoteCut: false,
        filter: '',
        agentId,
        // The readout belongs to a session in the project you left.
        mode: 'browse',
        sessionId: null,
        sessionName: null,
        pins: new Map(),
        status
      });
      if (target !== null && (local !== null || status === 'loading')) {
        read(target);
      }
    },

    refresh() {
      const { target } = get();
      if (target !== null) read(target);
    },

    setFilter(next) {
      set({ filter: next });
    },

    setAgent(agentId) {
      const { target } = get();
      set({ agentId });
      if (target !== null) saveAgent(target, agentId);
    },

    enterSessionMode(sessionId, agentId, sessionName) {
      set({ mode: 'session', sessionId, sessionName, agentId });
    },

    exitSessionMode() {
      set({ mode: 'browse', sessionId: null, sessionName: null });
    }
  };
});
