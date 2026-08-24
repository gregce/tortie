/**
 * Projects — the open tabs, their order, and the active one. Main's manifest
 * is the source of truth for WHICH projects exist; this slice holds the
 * renderer's projection plus the purely presentational tab order.
 */

import type { StateCreator } from 'zustand';
import type { GmuxErrorPayload, Project } from '@shared/types';
import type {
  AddRemoteProjectResult,
  CreateProjectInput,
  CreateProjectResult
} from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { isLocalTarget, targetOfProject } from '@shared/workspace-target';
import { machineLabelFor } from './machines-slice';
// Every sentence about a machine comes from one file, which is the one the
// vocabulary audit reads.
import type { AddRemoteRefusalReason } from '../machines/project-tab';
import { remoteTabCloseBody, remoteTabCloseTitle } from '../machines/project-tab';
import { errorPayload, errorText } from './errors';
import { loadLocal, saveLocal } from './local';
import type { AppState } from './app-state';
import { gmuxBridge } from '../bridge';

/**
 * What {@link ProjectsSlice.openTargetProject} did, or why it did nothing.
 *
 * PHASE 93. It carries a refusal rather than raising one, because the caller is
 * the one that knows what the person was trying to do. `addProjectPath` and
 * `addRemoteProject` both keep their own behaviour: the first still toasts its
 * own error and the second still answers a bare reason word, and neither is
 * changed here, because their callers rely on exactly that.
 */
export type OpenTargetResult =
  | { ok: true; projectId: string }
  | {
      /** A folder on this Mac that main refused. `message` is main's own. */
      ok: false;
      kind: 'local';
      message: string;
      /**
       * Main's own code for the refusal, when the rejection carried one.
       *
       * PHASE 93 ADDED THIS FIELD, and the spec's table does not list it. The
       * caller writes a different sentence for a folder that is not there than
       * for any other refusal, and the code is the only field that tells the two
       * apart. Reading main's English instead would make a sentence a contract.
       */
      code?: GmuxErrorPayload['code'];
    }
  | {
      /** A folder on a machine. `reason` is the word `projects:addRemote` said. */
      ok: false;
      kind: 'remote';
      reason: AddRemoteRefusalReason;
    }
  /** This build's preload cannot open a folder on a machine at all. */
  | { ok: false; kind: 'unsupported' };

export interface ProjectsSlice {
  projects: Project[];
  /** Tab display order (project ids); projects not listed sort last. */
  tabOrder: string[];
  activeProjectId: string | null;

  setActiveProject(projectId: string): void;
  setActiveProjectByIndex(index: number): void;
  cycleProject(delta: 1 | -1): void;
  reorderTabs(fromId: string, toId: string): void;
  /**
   * Pointer-drag tab reorder (S2, round 2): move a project tab so it lands
   * at `toIndex` in the visual order (insertion-indicator semantics).
   */
  moveProjectToIndex(projectId: string, toIndex: number): void;

  openProject(): Promise<void>;
  addProjectPath(path: string): Promise<void>;
  /**
   * PHASE 90.3. Whether the "Open a folder on a machine" sheet is on screen.
   *
   * It lives on this slice rather than on the overlays slice because it is a
   * project verb and its whole state is one boolean. The Escape handling in
   * ../app/keyboard.ts reads it beside the other sheets. That was
   * ../app/App.tsx until Phase 127 cut the keyboard controller out.
   */
  remoteProjectOpen: boolean;
  setRemoteProjectOpen(open: boolean): void;
  /**
   * PHASE 90.3. Open one folder on one machine as a project tab.
   *
   * Resolves with main's answer, refusals included, so the sheet can put the
   * reason on the field that caused it. It never toasts a refusal itself. A
   * success focuses the tab, whether it was just made or was already open.
   */
  addRemoteProject(
    machineId: string,
    path: string
  ): Promise<AddRemoteProjectResult>;
  /** Whether this build can open a folder on a machine at all. */
  canAddRemoteProject(): boolean;
  /**
   * PHASE 93. Open one folder, on whichever computer names it, as a tab.
   *
   * ONE IMPLEMENTATION FOR BOTH ROUTES, so a caller that has a target in hand
   * never has to branch on the machine itself. It resolves after the tab is in
   * the list and active, which is what lets the caller set the active session
   * on the next line and have `activeSession()` find the tab it needs.
   *
   * It raises no toast of its own. The one caller this phase adds writes a
   * sentence naming what it could not reach, and a toast raised here as well
   * would say the same thing twice.
   */
  openTargetProject(target: WorkspaceTarget): Promise<OpenTargetResult>;
  closeProject(projectId: string): void;
  /**
   * Phase 12.9 item 1 — make a folder, optionally `git init` it, open it as a
   * tab and focus it. Rejects so the dialog can put the reason on the field
   * that caused it; a `git init` that failed resolves normally (the folder
   * exists) and raises its own toast.
   */
  createProject(input: CreateProjectInput): Promise<CreateProjectResult>;
  /** Whether the optional projects:create bridge method exists. */
  canCreateProject(): boolean;

  orderedProjects(): Project[];
  activeProject(): Project | null;
}

const LS_TAB_ORDER = 'gmux.tabOrder';
export const LS_ACTIVE_PROJECT = 'gmux.activeProject';

export const createProjectsSlice: StateCreator<
  AppState,
  [],
  [],
  ProjectsSlice
> = (set, get) => {
  const gmux = gmuxBridge();

  return {
    projects: [],
    tabOrder: loadLocal<string[]>(LS_TAB_ORDER, []),
    activeProjectId: null,
    remoteProjectOpen: false,

    setActiveProject(projectId) {
      set({ activeProjectId: projectId });
      saveLocal(LS_ACTIVE_PROJECT, projectId);
    },

    setActiveProjectByIndex(index) {
      const ordered = get().orderedProjects();
      const target = ordered[index];
      if (target) get().setActiveProject(target.id);
    },

    cycleProject(delta) {
      const ordered = get().orderedProjects();
      if (ordered.length < 2) return;
      const cur = ordered.findIndex((p) => p.id === get().activeProjectId);
      const next = ordered[(cur + delta + ordered.length) % ordered.length];
      if (next) get().setActiveProject(next.id);
    },

    reorderTabs(fromId, toId) {
      if (fromId === toId) return;
      const ordered = get().orderedProjects().map((p) => p.id);
      const from = ordered.indexOf(fromId);
      const to = ordered.indexOf(toId);
      if (from === -1 || to === -1) return;
      ordered.splice(to, 0, ...ordered.splice(from, 1));
      set({ tabOrder: ordered });
      saveLocal(LS_TAB_ORDER, ordered);
    },

    moveProjectToIndex(projectId, toIndex) {
      const ordered = get().orderedProjects().map((p) => p.id);
      const from = ordered.indexOf(projectId);
      if (from === -1) return;
      const clamped = Math.max(0, Math.min(ordered.length, toIndex));
      const target = clamped > from ? clamped - 1 : clamped;
      if (target === from) return;
      ordered.splice(target, 0, ...ordered.splice(from, 1));
      set({ tabOrder: ordered });
      saveLocal(LS_TAB_ORDER, ordered);
    },

    async openProject() {
      if (!gmux) return;
      try {
        const dir = await gmux.projects.pickDirectory();
        if (dir === null) return;
        await get().addProjectPath(dir);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async addProjectPath(path) {
      if (!gmux) return;
      try {
        const project = await gmux.projects.add(path);
        const projects = await gmux.projects.list();
        set({ projects });
        // Idempotent open: adding an already-open project focuses its tab.
        get().setActiveProject(project.id);
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    setRemoteProjectOpen(open) {
      set({ remoteProjectOpen: open });
    },

    canAddRemoteProject() {
      const projects = gmux?.projects;
      return typeof projects?.addRemote === 'function';
    },

    async addRemoteProject(machineId, path) {
      const projects = gmux?.projects;
      if (projects === undefined || typeof projects.addRemote !== 'function') {
        return { ok: false, reason: 'notConnected' };
      }
      const result = await projects.addRemote({ machineId, path });
      if (!result.ok) return result;
      // The list is re-read rather than patched, so the tab order and the row
      // ids come from main exactly as every other project route gets them.
      set({ projects: await projects.list() });
      get().setActiveProject(result.project.id);
      return result;
    },

    async openTargetProject(target) {
      if (isLocalTarget(target)) {
        if (!gmux) {
          return {
            ok: false,
            kind: 'local',
            message: 'Tortie cannot open a folder right now.'
          };
        }
        try {
          const project = await gmux.projects.add(target.path);
          // The list is re-read rather than patched, for the reason
          // `addRemoteProject` above gives: the row ids and the tab order come
          // from main exactly as every other project route gets them.
          set({ projects: await gmux.projects.list() });
          get().setActiveProject(project.id);
          return { ok: true, projectId: project.id };
        } catch (err) {
          const payload = errorPayload(err);
          return {
            ok: false,
            kind: 'local',
            message: errorText(err),
            ...(payload === null ? {} : { code: payload.code })
          };
        }
      }
      if (!get().canAddRemoteProject()) {
        return { ok: false, kind: 'unsupported' };
      }
      const result = await get().addRemoteProject(target.machineId, target.path);
      if (result.ok) return { ok: true, projectId: result.project.id };
      return { ok: false, kind: 'remote', reason: result.reason };
    },

    canCreateProject() {
      const projects = gmux?.projects;
      return typeof projects?.create === 'function';
    },

    async createProject(input) {
      const projects = gmux?.projects;
      if (projects === undefined || typeof projects.create !== 'function') {
        throw new Error('This build cannot create projects.');
      }
      const result = await projects.create(input);
      const list = await projects.list();
      set({ projects: list });
      // The tab appears focused and its no-sessions state offers the whole
      // fleet — that IS the "start a session in it now" step, so there is no
      // success toast to write. Only the one thing that silently did not
      // happen gets said out loud.
      get().setActiveProject(result.project.id);
      if (result.gitError !== undefined) {
        get().toast(
          'error',
          `Created '${result.project.name}', but it is not a git repository — ${result.gitError}`,
          { sticky: true }
        );
      }
      return result;
    },

    closeProject(projectId) {
      const project = get().projects.find((p) => p.id === projectId);
      if (!project || !gmux) return;
      // PHASE 90.3. A tab whose files are on another machine says where its
      // sessions keep running, because "they keep running" is ambiguous the
      // moment there is more than one computer in the answer.
      const target = targetOfProject(project);
      const here = isLocalTarget(target);
      get().setConfirm({
        title: here
          ? `Close '${project.name}'?`
          : remoteTabCloseTitle(project.name),
        body: here
          ? 'Its sessions keep running and reappear when you reopen it.'
          : remoteTabCloseBody(
              machineLabelFor(get().machineStates, project.machineId ?? '')
            ),
        confirmLabel: 'Close project',
        onConfirm: () => {
          void (async () => {
            try {
              await gmux.projects.remove(projectId);
              // Phase 14: give the project's symbol index its memory back.
              // Feature-detected, fire-and-forget, and never a reason a
              // project fails to close — the index rebuilds from SQLite if
              // the project is reopened, and evicts itself after 30 idle
              // minutes even if this call never happens.
              // PHASE 90.3. Both releases name a path on THIS Mac, so neither
              // is asked for a tab whose files are on another machine. There is
              // no index and no watch to release: `rootsFor` excludes every
              // remote project and no watch is ever armed for one.
              if (here) {
                void gmuxBridge()?.symbols
                  ?.release(project.path)
                  .catch(() => undefined);
              }
              // Phase 46: end any GitHub Actions watch this project armed.
              // Same posture as the release above, and for the same reason:
              // feature-detected, fire-and-forget, never a reason a project
              // fails to close. Watch state is in memory only, so the worst a
              // missed call costs is one poller until the app quits.
              if (here) {
                void gmuxBridge()?.actions
                  ?.release(project.path)
                  .catch(() => undefined);
              }
              const projects = await gmux.projects.list();
              set((s) => {
                const next: Partial<AppState> = { projects };
                if (s.activeProjectId === projectId) {
                  next.activeProjectId = projects[0]?.id ?? null;
                }
                return next;
              });
            } catch (err) {
              get().toast('error', errorText(err), { sticky: true });
            }
          })();
        }
      });
    },

    orderedProjects() {
      const { projects, tabOrder } = get();
      const rank = new Map(tabOrder.map((id, i) => [id, i]));
      return [...projects].sort((a, b) => {
        const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      });
    },

    activeProject() {
      const { projects, activeProjectId } = get();
      return projects.find((p) => p.id === activeProjectId) ?? null;
    }
  };
};
