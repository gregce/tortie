/**
 * Screenshot-harness drive hook.
 *
 * The GMUX_SHOT harness (src/main/index.ts) can pass GMUX_SHOT_DRIVE, a JSON
 * ShotDriveSpec, which main feeds to `window.__gmuxShotDrive` via
 * executeJavaScript. The hook opens a project and a diff so the capture
 * shows the real editor, then flips `__gmuxShotReady`. Never invoked outside
 * the harness — the functions are inert globals otherwise.
 */

import { useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';

export interface ShotDriveSpec {
  /** Absolute path of a repo to open as a project tab. */
  projectPath: string;
  /** Repo-relative file to open (as a diff by default). */
  openRel?: string;
  mode?: 'diff' | 'file';
}

declare global {
  interface Window {
    __gmuxShotDrive?: (spec: ShotDriveSpec) => Promise<void>;
    __gmuxShotCleanup?: () => Promise<void>;
    __gmuxShotReady?: boolean;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Project path the drive opened — removed again by the cleanup hook. */
let drivenProjectPath: string | null = null;

export function installShotHook(): void {
  if (typeof window.__gmuxShotDrive === 'function') return;

  window.__gmuxShotDrive = async (spec: ShotDriveSpec): Promise<void> => {
    const app = useApp.getState();
    drivenProjectPath = spec.projectPath;
    await app.addProjectPath(spec.projectPath);
    // Let the sidebar pull git status / tree so the shot shows real chrome.
    await wait(700);

    if (spec.openRel !== undefined) {
      requestOpenFile({
        repoPath: spec.projectPath,
        relPath: spec.openRel,
        path: `${spec.projectPath}/${spec.openRel}`,
        mode: spec.mode ?? 'diff',
        source: 'worktree'
      });
      // Ready when Monaco is mounted and the loading skeleton is gone.
      for (let i = 0; i < 120; i++) {
        const mounted =
          document.querySelector('.monaco-editor') !== null &&
          document.querySelector('.ed-skeleton') === null;
        if (mounted) break;
        await wait(250);
      }
      await wait(600); // syntax highlight + diff decorations settle
    }
    window.__gmuxShotReady = true;
  };

  window.__gmuxShotCleanup = async (): Promise<void> => {
    if (drivenProjectPath === null || !window.gmux) return;
    const project = useApp
      .getState()
      .projects.find((p) => p.path === drivenProjectPath);
    if (project !== undefined) {
      await window.gmux.projects.remove(project.id).catch(() => undefined);
    }
  };
}
