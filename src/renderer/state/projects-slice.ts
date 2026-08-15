/**
 * Projects — the open tabs, their order, and the active one. Main's manifest
 * is the source of truth for WHICH projects exist; this slice holds the
 * renderer's projection plus the purely presentational tab order.
 */

import type { StateCreator } from 'zustand';
import type { Project } from '@shared/types';
import type {
  CreateProjectInput,
  CreateProjectResult,
  GmuxActionsExtras,
  GmuxProjectCreateExtras,
  GmuxSymbolsExtras
} from '@shared/ipc';
import { errorText } from './errors';
import { loadLocal, saveLocal } from './local';
import type { AppState } from './app-state';

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
  const gmux = window.gmux as typeof window.gmux | undefined;

  return {
    projects: [],
    tabOrder: loadLocal<string[]>(LS_TAB_ORDER, []),
    activeProjectId: null,

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

    canCreateProject() {
      const projects = gmux?.projects as
        | (NonNullable<typeof gmux>['projects'] & GmuxProjectCreateExtras)
        | undefined;
      return typeof projects?.create === 'function';
    },

    async createProject(input) {
      const projects = gmux?.projects as
        | (NonNullable<typeof gmux>['projects'] & GmuxProjectCreateExtras)
        | undefined;
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
      get().setConfirm({
        title: `Close '${project.name}'?`,
        body: 'Its sessions keep running and reappear when you reopen it.',
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
              void (
                window.gmux as (typeof window.gmux & GmuxSymbolsExtras) | undefined
              )?.symbols
                ?.release(project.path)
                .catch(() => undefined);
              // Phase 46: end any GitHub Actions watch this project armed.
              // Same posture as the release above, and for the same reason:
              // feature-detected, fire-and-forget, never a reason a project
              // fails to close. Watch state is in memory only, so the worst a
              // missed call costs is one poller until the app quits.
              void (
                window.gmux as (typeof window.gmux & GmuxActionsExtras) | undefined
              )?.actions
                ?.release(project.path)
                .catch(() => undefined);
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
