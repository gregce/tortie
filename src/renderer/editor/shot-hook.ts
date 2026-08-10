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
// Harness-only reach into the terminal domain: the point of the item-2 shot
// is that the REAL capture action runs, not a mock of it.
import { captureHistory, captureVisible } from '../terminal/capture';
import { getTerminal } from '../terminal/drop';
import { scrollBridge } from '../terminal/scroll/surface';
import { setStoredEditorWidth } from './panel-width';
import { useEditor } from './store';

export interface ShotDriveSpec {
  /** Absolute path of a repo to open as a project tab. */
  projectPath: string;
  /** Repo-relative file to open (as a diff by default). */
  openRel?: string;
  mode?: 'diff' | 'file';
  /**
   * Extra repo-relative files opened FOR KEEPS before `openRel`, so a capture
   * can show the accumulating tab strip (Phase 12 item 5) rather than the one
   * preview tab.
   */
  openRels?: string[];
  /**
   * Seed the editor split's width for this project, in CSS px. Applied
   * BEFORE the project is added, which is when the panel first mounts and
   * reads the stored widths — afterwards only the divider owns it. Still
   * clamped by the panel's own floor/ceiling, so passing a big number is a
   * reliable way to capture the widest layout the design permits.
   */
  editorWidth?: number;
  /** Turn the minimap / preview heading ruler on before capture. */
  minimap?: boolean;
  /** Force the opened tab's view (markdown: 'preview' | 'file' | 'split'). */
  editorMode?: 'diff' | 'file' | 'preview' | 'split';
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
   * Expand the newest commit in History and open N of its files as history
   * tabs (Phase 12 item 4). Drives the REAL rows — expand, then click file
   * rows — so the capture proves the whole path (log → commit detail →
   * git:commitFileDiff → a `<sha>^ → <sha>` tab), not a reimplementation of
   * it in the harness.
   */
  openCommitFiles?: number;
  /** Which History row `openCommitFiles` expands (0 = newest). */
  commitRow?: number;
  /**
   * Terminal items 1 + 2, end to end: type `command` into the session the
   * spec created, select the output, and run the real Capture Screen action
   * so the capture toast (with its Save…) is on screen for the shot.
   *
   * The native context menu itself can never appear in a capture: it is an
   * OS-owned window and `capturePage` only sees this one. What is stageable
   * is everything the menu drives — the selection Copy/Capture act on, and
   * the toast the capture raises.
   *
   * `historyLines` runs the LONG capture instead (Capture Last 250 / 1,000
   * Lines) — tmux capture-pane -e → an offscreen Terminal → serializeAsHtml
   * → rasterizeHtml → capture:image. That middle is unreachable from a unit
   * test (it needs a live pane, real font metrics and a real canvas), so this
   * is where it gets exercised; pair it with GMUX_SHOT_CAPTURE_OUT to keep
   * the PNG the run produced.
   */
  terminalCapture?: {
    command: string;
    selectRows?: number;
    historyLines?: number;
  };
  /**
   * Phase 12.3 scrollback, end to end: fill the session the spec created with
   * real output, then drive REAL wheel events at its `.xterm-screen` so the
   * capture proves the whole path — xterm's custom wheel handler → the
   * ScrollSurface → tmux copy-mode — rather than a store poke. The observed
   * `{position, history, …}` is logged for the harness (GMUX_SHOT_VERBOSE=1);
   * that number, not the pixels, is what says the wheel moved history.
   */
  scrollback?: {
    /** Typed into the session (each followed by Enter) to build a transcript. */
    commands?: string[];
    /** Milliseconds to wait after each command (agents answer slowly). */
    settleMs?: number;
    /** Wait (up to 40 s) until tmux holds this much history before scrolling. */
    minHistory?: number;
    /** Wheel notches scrolled BACK. 0 captures the bar at rest. */
    notches?: number;
    /** ⇧PageUp presses (the documented keyboard half of the wheel). */
    pageUps?: number;
    /**
     * Typed through the TERMINAL after scrolling (term.input → onData → the
     * surface), to assert the must-not-regress rule that typing returns a
     * scrolled pane to live output instead of feeding tmux copy-mode.
     */
    typeAfter?: string;
    /**
     * Pasted through the TERMINAL after `typeAfter` (term.paste → bracketed
     * paste → onData → the surface): the same must-not-regress rule for ⌘V
     * and the image-drop pipeline, which both write through term.paste.
     */
    pasteAfter?: string;
  };
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
    /** Set by main when the drive throws — the harness then exits non-zero. */
    __gmuxShotError?: string;
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Stage marker. The drive runs entirely inside the renderer, so without these
 * a stall is a black box from main's side — GMUX_SHOT_VERBOSE=1 tees the
 * renderer console into the harness output (src/main/index.ts).
 */
const step = (name: string): void => {
  console.log(`[shot-drive] ${name}`);
};

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
    // Let boot() finish first. It is not a correctness dependency any more
    // (boot unions rather than overwrites), but driving a half-booted app
    // measures the wrong thing.
    step('waiting for boot');
    for (let i = 0; i < 60 && !useApp.getState().ready; i++) await wait(100);
    const app = useApp.getState();
    drivenProjectPath = spec.projectPath;
    if (spec.editorWidth !== undefined) {
      setStoredEditorWidth(spec.projectPath, spec.editorWidth);
    }
    step(`opening project ${spec.projectPath}`);
    await app.addProjectPath(spec.projectPath);
    // Let the sidebar pull git status / tree so the shot shows real chrome.
    await wait(700);

    if (spec.session !== undefined) {
      const sessionName = spec.session.name ?? 'shot-shell';
      step(`creating session ${sessionName}`);
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
      step(`session ready (${String(drivenSessionId)})`);
    }

    if (spec.terminalCapture !== undefined && drivenSessionId !== null) {
      const sessionId = drivenSessionId;
      step('sending terminal command');
      window.gmux?.term.sendInput(sessionId, `${spec.terminalCapture.command}\n`);
      await wait(1500);
      const term = getTerminal(sessionId);
      const session = useApp
        .getState()
        .sessions.find((s) => s.id === sessionId);
      const historyLines = spec.terminalCapture.historyLines;
      if (term !== null && session !== undefined && historyLines !== undefined) {
        // Rasterizing hundreds of rows takes longer than a viewport grab —
        // the toast is the signal that the whole path finished.
        step(`captureHistory(${historyLines})`);
        await captureHistory(session, historyLines);
        step('captureHistory returned');
        await wait(1200);
      } else if (term !== null && session !== undefined) {
        const rows = spec.terminalCapture.selectRows ?? 8;
        const bottom = term.buffer.active.baseY + term.buffer.active.cursorY;
        term.selectLines(Math.max(0, bottom - rows), Math.max(0, bottom - 1));
        await wait(200);
        await captureVisible(session);
        await wait(600);
      }
    }

    if (spec.scrollback !== undefined && drivenSessionId !== null) {
      const sessionId = drivenSessionId;
      const settle = spec.scrollback.settleMs ?? 2500;
      for (const command of spec.scrollback.commands ?? []) {
        step(`scrollback: typing ${command}`);
        // Type the first character on its own, and give the TUI a beat to
        // react. Claude Code treats a leading `/` or `!` as a MODE switch
        // (command palette, shell mode) and only recognises it as one when it
        // arrives before the rest of the line — a single-chunk paste lands as
        // literal prompt text. Shells do not care either way.
        window.gmux?.term.sendInput(sessionId, command.slice(0, 1));
        await wait(800);
        window.gmux?.term.sendInput(sessionId, command.slice(1));
        await wait(300);
        // CR, not LF: a real Return key sends \r, and Claude Code's input
        // only submits on that (a shell accepts either).
        window.gmux?.term.sendInput(sessionId, '\r');
        await wait(settle);
      }
      // Wait for the transcript to actually EXIST before scrolling. An agent
      // renders shell output into its own transcript asynchronously, and a
      // wheel that arrives first enters copy-mode over an empty history,
      // scrolls nothing, and then gets dropped back to live by the next line
      // of output — a green log and a useless capture.
      const wantHistory = spec.scrollback.minHistory ?? 0;
      for (let i = 0; i < 80; i++) {
        const seen = await scrollBridge()?.state({ sessionId });
        if ((seen?.history ?? 0) >= wantHistory) break;
        await wait(500);
      }
      await wait(1200);
      const screen = document.querySelector<HTMLElement>(
        `.gmux-terminal-pane[data-session-id="${CSS.escape(sessionId)}"] ` +
          `.xterm-screen`
      );
      step(
        `scrollback: before wheel screen=${screen !== null} ` +
          `${JSON.stringify(await scrollBridge()?.state({ sessionId }))}`
      );
      const notches = spec.scrollback.notches ?? 0;
      const before = await scrollBridge()?.state({ sessionId });
      for (let i = 0; i < notches; i++) {
        screen?.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -120,
            deltaMode: 0,
            bubbles: true,
            cancelable: true
          })
        );
        await wait(80);
      }
      // ⇧PageUp goes through xterm's custom KEY handler, a different door
      // from the wheel — dispatch it at the textarea xterm actually listens
      // on, not at the screen.
      const textarea = document.querySelector<HTMLTextAreaElement>(
        `.gmux-terminal-pane[data-session-id="${CSS.escape(sessionId)}"] ` +
          `.xterm-helper-textarea`
      );
      for (let i = 0; i < (spec.scrollback.pageUps ?? 0); i++) {
        textarea?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'PageUp',
            code: 'PageUp',
            shiftKey: true,
            bubbles: true,
            cancelable: true
          })
        );
        await wait(150);
      }

      // Wait for the dispatched scroll to LAND. The surface batches wheel
      // deltas on a timer, and Chromium throttles timers hard in a window
      // that is not producing frames — which the capture window frequently is
      // not. Real scrolling is never in that state (you cannot wheel a hidden
      // window); this poll just keeps the harness from reading too early.
      const wantScroll =
        (notches > 0 || (spec.scrollback.pageUps ?? 0) > 0) &&
        (before?.history ?? 0) > 0;
      for (let i = 0; i < 24 && wantScroll; i++) {
        const seen = await scrollBridge()?.state({ sessionId });
        if ((seen?.position ?? 0) > 0) break;
        await wait(250);
      }
      await wait(600);
      const state = await scrollBridge()?.state({ sessionId });
      step(`scrollback result ${JSON.stringify(state ?? null)}`);

      if (spec.scrollback.typeAfter !== undefined) {
        // One xterm input event PER CHARACTER, fired back to back with no
        // await between them: the return-to-live is in flight while the rest
        // arrive, which is exactly the race that would swallow or reorder the
        // first keystroke. The pane must end up with the whole string.
        for (const ch of [...spec.scrollback.typeAfter]) {
          getTerminal(sessionId)?.input(ch);
        }
        await wait(1500);
        const after = await scrollBridge()?.state({ sessionId });
        step(`scrollback after typing ${JSON.stringify(after ?? null)}`);
      }

      if (spec.scrollback.pasteAfter !== undefined) {
        getTerminal(sessionId)?.paste(spec.scrollback.pasteAfter);
        await wait(1500);
        const after = await scrollBridge()?.state({ sessionId });
        step(`scrollback after paste ${JSON.stringify(after ?? null)}`);
      }
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

    if (spec.minimap !== undefined) {
      useEditor.getState().setMinimapEnabled(spec.minimap);
    }

    for (const rel of spec.openRels ?? []) {
      requestOpenFile({
        repoPath: spec.projectPath,
        relPath: rel,
        path: `${spec.projectPath}/${rel}`,
        mode: 'file',
        source: 'tree',
        preview: false
      });
      await wait(400);
    }

    if (spec.openRel !== undefined) {
      requestOpenFile({
        repoPath: spec.projectPath,
        relPath: spec.openRel,
        path: `${spec.projectPath}/${spec.openRel}`,
        mode: spec.mode ?? 'diff',
        source: 'worktree',
        preview: false
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
          : // A .md file opens rendered, not in Monaco (Phase 12 item 6).
            (document.querySelector('.md-content > *') ??
              document.querySelector('.monaco-editor'));
        const mounted =
          surface !== null && document.querySelector('.ed-skeleton') === null;
        if (mounted) break;
        await wait(250);
      }
      if (spec.editorMode !== undefined) {
        const ed = useEditor.getState();
        const id = ed.activeId;
        if (id !== null) ed.setMode(id, spec.editorMode);
        await wait(800);
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

    if (spec.openCommitFiles !== undefined && spec.openCommitFiles > 0) {
      const wanted = spec.commitRow ?? 0;
      let row: HTMLElement | null = null;
      for (let i = 0; i < 40 && row === null; i++) {
        row =
          document.querySelectorAll<HTMLElement>('.scm-hrow')[wanted] ?? null;
        if (row === null) await wait(250);
      }
      row?.click(); // expand → git:commitDetail
      const fileRows = (): HTMLElement[] =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.scm-hfile')
        ).filter((el) => !el.classList.contains('scm-hfile-loading'));
      for (let i = 0; i < 40 && fileRows().length === 0; i++) await wait(250);
      // Double-click = "open for keeps", so the tabs accumulate instead of
      // recycling the one preview slot. Re-query every time: opening a file
      // moves the row cursor, React re-renders the list, and a reference
      // captured before that is a detached node whose events reach nothing.
      const want = Math.min(spec.openCommitFiles, fileRows().length);
      for (let i = 0; i < want; i++) {
        fileRows()[i]?.dispatchEvent(
          new MouseEvent('dblclick', { bubbles: true })
        );
        await wait(600);
      }
      // Wait out the commitFileDiff round-trip + Shiki settling.
      for (let i = 0; i < 60; i++) {
        const painted =
          document
            .querySelector('diffs-container')
            ?.shadowRoot?.querySelector('pre') ?? null;
        if (painted !== null && document.querySelector('.ed-skeleton') === null) {
          break;
        }
        await wait(250);
      }
      await wait(1500);
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

    step('ready');
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
