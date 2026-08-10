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
  /**
   * Inject two renderer-only fake agent sessions (claude working, codex
   * needs-input) so the session tab strip / right list shows the full
   * round-1 vocabulary: agent icons, status dots, needs-input emphasis.
   * Pure store injection — nothing reaches main or the manifest.
   */
  fakeTabs?: boolean;
  /**
   * Hover the HEAD commit row in the SCM History section and wait for the
   * rich hover card (round 1, change 5) to open before capture.
   */
  hoverHistory?: boolean;
  /**
   * Switch the sidebar view before capture ('explorer' shows the Pierre
   * file tree; readiness waits for shadow-DOM rows to render).
   */
  sidebarView?: 'scm' | 'explorer';
  /**
   * Explorer only: expand directories by clicking their real rows
   * (canonical tree paths, trailing '/' — e.g. "src/"). Exercises the
   * expand → lazy fs:readDir → batch pipeline, not just the paint.
   */
  expandRels?: string[];
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
      const sessionName = spec.session.name ?? 'shot-shell';
      await useApp.getState().createSession({
        name: sessionName,
        agent: spec.session.agent ?? 'shell'
      });
      // The created session reaches the store via the sessions:changed
      // event, which races this hook — poll for it so drivenSessionId is
      // always recorded and cleanup never leaks the session.
      for (let i = 0; i < 40 && drivenSessionId === null; i++) {
        const created = useApp
          .getState()
          .sessions.find((x) => x.name === sessionName);
        drivenSessionId = created?.id ?? null;
        if (drivenSessionId === null) await wait(250);
      }
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

    if (spec.fakeTabs === true) {
      const now = Date.now();
      const base = { projectPath: spec.projectPath, cwd: spec.projectPath };
      const fakes: Session[] = [
        {
          ...base,
          id: 'shot-tab-1',
          name: 'api-refactor',
          tmuxName: 'api-refactor',
          agent: 'claude',
          status: 'running',
          createdAt: now - 42 * 60_000
        },
        {
          ...base,
          id: 'shot-tab-2',
          name: 'tests',
          tmuxName: 'tests',
          agent: 'codex',
          status: 'needs_input',
          createdAt: now - 12 * 60_000
        }
      ];
      useApp.setState((s) => ({ sessions: [...s.sessions, ...fakes] }));
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
      // Ready when the mode's surface is mounted and the loading skeleton is
      // gone: Pierre's shadow-DOM host with rendered rows for diff mode,
      // Monaco for file mode.
      const wantDiff = (spec.mode ?? 'diff') === 'diff';
      for (let i = 0; i < 120; i++) {
        const surface = wantDiff
          ? (document.querySelector('diffs-container')?.shadowRoot?.querySelector(
              'pre'
            ) ?? null)
          : document.querySelector('.monaco-editor');
        const mounted =
          surface !== null && document.querySelector('.ed-skeleton') === null;
        if (mounted) break;
        await wait(250);
      }
      // Syntax highlight settles async (Shiki streams tokens in diff mode).
      await wait(wantDiff ? 1200 : 600);
    }

    if (spec.sidebarView !== undefined) {
      useApp.getState().setSidebarView(spec.sidebarView);
      if (spec.sidebarView === 'explorer') {
        // Ready when the Pierre tree host has rendered rows in its shadow root.
        for (let i = 0; i < 40; i++) {
          const host = document.querySelector('file-tree-container');
          if (host?.shadowRoot?.querySelector('[data-item-path]') != null) {
            break;
          }
          await wait(250);
        }
        for (const rel of spec.expandRels ?? []) {
          const row = document
            .querySelector('file-tree-container')
            ?.shadowRoot?.querySelector<HTMLElement>(
              `[data-item-path="${rel}"]`
            );
          row?.click();
          // Children render once the lazy fs:readDir listing lands.
          for (let i = 0; i < 20; i++) {
            const child = document
              .querySelector('file-tree-container')
              ?.shadowRoot?.querySelector(`[data-item-parent-path="${rel}"]`);
            if (child !== null && child !== undefined) break;
            await wait(250);
          }
        }
        await wait(400);
      }
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

    if (spec.hoverHistory === true) {
      // History rows live in the SCM view (default). Wait for the log to
      // land, then synthesize the hover; React derives onMouseEnter from a
      // bubbling mouseover with an outside relatedTarget.
      let row: Element | null = null;
      for (let i = 0; i < 40 && row === null; i++) {
        row = document.querySelector('.scm-hrow');
        if (row === null) await wait(250);
      }
      if (row !== null) {
        row.dispatchEvent(
          new MouseEvent('mouseover', {
            bubbles: true,
            relatedTarget: document.body
          })
        );
        // Card opens after the 600ms hover delay; give the commit detail
        // (files/stat line) time to fill in from the prefetch.
        for (let i = 0; i < 20; i++) {
          if (document.querySelector('.scm-card') !== null) break;
          await wait(250);
        }
        await wait(600);
      }
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
