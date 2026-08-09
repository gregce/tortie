/**
 * Screenshot-harness drive hook.
 *
 * The GMUX_SHOT harness (src/main/index.ts) can pass GMUX_SHOT_DRIVE, a JSON
 * ShotDriveSpec, which main feeds to `window.__gmuxShotDrive` via
 * executeJavaScript. The hook opens a project (and optionally a diff, a real
 * session, a faked restore state, or a UI layer) so the capture shows the
 * real UI, then flips `__gmuxShotReady`. Never invoked outside the harness —
 * the functions are inert globals otherwise.
 */

import type { AgentKind, Session } from '@shared/types';
import type { GmuxSessionExtras } from '@shared/ipc';
import { useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';

export interface ShotDriveSpec {
  /** Absolute path of a repo to open as a project tab. */
  projectPath: string;
  /** Repo-relative file to open (as a diff by default). */
  openRel?: string;
  mode?: 'diff' | 'file';
  /** Create a real durable session (killed again by the cleanup hook). */
  session?: { agent?: AgentKind; name?: string };
  /**
   * Inject renderer-only fake sessions in the §6.8 post-reboot restore state
   * (restorable rows + Restore-all bar + armed-resume copy). Never touches
   * the manifest — pure store injection for visual capture.
   */
  fakeRestore?: boolean;
  /** Open a UI layer before capture. */
  ui?: 'shortcuts' | 'create' | 'attention';
  /** Show a toast before capture (kind defaults to info). */
  toast?: { kind?: 'info' | 'success' | 'error'; text: string };
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
/** Real session created by the drive — killed again by the cleanup hook. */
let drivenSessionId: string | null = null;

function fakeRestorableSessions(projectPath: string): Session[] {
  const base = {
    projectPath,
    cwd: projectPath,
    status: 'restorable' as const
  };
  const now = Date.now();
  return [
    {
      ...base,
      id: 'shot-fake-1',
      name: 'claude-api',
      tmuxName: 'claude-api',
      agent: 'claude',
      agentSessionId: 'f9d3f6f2-0000-4000-8000-000000000001',
      resumeArgv: ['claude', '--resume', 'f9d3f6f2…'],
      createdAt: now - 26 * 60_000
    },
    {
      ...base,
      id: 'shot-fake-2',
      name: 'claude-ui',
      tmuxName: 'claude-ui',
      agent: 'claude',
      agentSessionId: 'f9d3f6f2-0000-4000-8000-000000000002',
      resumeArgv: ['claude', '--resume', 'f9d3f6f2…'],
      createdAt: now - 3 * 60 * 60_000
    },
    {
      ...base,
      id: 'shot-fake-3',
      name: 'shell-1',
      tmuxName: 'shell-1',
      agent: 'shell',
      createdAt: now - 25 * 60 * 60_000
    }
  ];
}

export function installShotHook(): void {
  if (typeof window.__gmuxShotDrive === 'function') return;

  window.__gmuxShotDrive = async (spec: ShotDriveSpec): Promise<void> => {
    const app = useApp.getState();
    drivenProjectPath = spec.projectPath;
    await app.addProjectPath(spec.projectPath);
    // Let the sidebar pull git status / tree so the shot shows real chrome.
    await wait(700);

    if (spec.session !== undefined) {
      await useApp.getState().createSession({
        name: spec.session.name ?? 'shot-shell',
        agent: spec.session.agent ?? 'shell'
      });
      const created = useApp
        .getState()
        .sessions.find((x) => x.name === (spec.session?.name ?? 'shot-shell'));
      drivenSessionId = created?.id ?? null;
      // Wait for the prompt to render (bytes flow → xterm paints).
      for (let i = 0; i < 40; i++) {
        if (document.querySelector('.gmux-terminal-mount .xterm') !== null) break;
        await wait(250);
      }
      await wait(1200);
    }

    if (spec.fakeRestore === true) {
      useApp.setState((s) => ({
        sessions: [...s.sessions, ...fakeRestorableSessions(spec.projectPath)]
      }));
      await wait(300);
    }

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

    if (spec.ui !== undefined) {
      const s = useApp.getState();
      if (spec.ui === 'shortcuts') s.setShortcutsOpen(true);
      if (spec.ui === 'create') s.setCreateOpen(true);
      if (spec.ui === 'attention') s.setAttentionOpen(true);
      await wait(400);
    }

    if (spec.toast !== undefined) {
      useApp.getState().toast(spec.toast.kind ?? 'info', spec.toast.text);
      await wait(200);
    }

    window.__gmuxShotReady = true;
  };

  window.__gmuxShotCleanup = async (): Promise<void> => {
    if (!window.gmux) return;
    // Fake sessions are renderer-only; nothing to clean up in main.
    if (drivenSessionId !== null) {
      await window.gmux.sessions.kill(drivenSessionId).catch(() => undefined);
      const extras = window.gmux.sessions as typeof window.gmux.sessions &
        GmuxSessionExtras;
      if (typeof extras.discard === 'function') {
        await extras.discard(drivenSessionId).catch(() => undefined);
      }
    }
    if (drivenProjectPath === null) return;
    const project = useApp
      .getState()
      .projects.find((p) => p.path === drivenProjectPath);
    if (project !== undefined) {
      await window.gmux.projects.remove(project.id).catch(() => undefined);
    }
  };
}
