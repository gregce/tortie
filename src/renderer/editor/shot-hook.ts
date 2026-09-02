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
import { useApp } from '../state/store';
import { requestOpenFile } from '../state/open-file';
import type { OpenFileSelection } from '../state/open-file';
// Harness-only reach into the terminal domain: the point of the item-2 shot
// is that the REAL capture action runs, not a mock of it.
import { captureHistory, captureVisible } from '../terminal/capture';
import { getTerminal } from '../terminal/drop';
import { driveTreeDrop } from '../terminal/drop/shot-probe';
import type { TreeDropProbeSpec } from '../terminal/drop/shot-probe';
import { driveTreeOps } from '../tree/shot-probe';
import type { TreeOpsProbeSpec } from '../tree/shot-probe';
import { driveSelectionMenu } from '../terminal/selection-shot-probe';
import type { SelectionProbeSpec } from '../terminal/selection-shot-probe';
import { driveSplitGroup, stopSplitGroupHolds } from '../app/split/shot-probe';
import type { SplitGroupProbeSpec } from '../app/split/shot-probe';
import { scrollBridge } from '../terminal/scroll/surface';
import { setStoredEditorWidth } from './panel-width';
import { useEditor } from './store';
import { driveRedlineView } from './redline-shot-probe';
import type { RedlineViewProbeSpec } from './redline-shot-probe';
import { driveFileHistory } from './file-history-shot-probe';
import type { FileHistoryProbeSpec } from './file-history-shot-probe';
import { driveInlineAgreement } from './agreement-shot-probe';
import type { InlineAgreementProbeSpec } from './agreement-shot-probe';
// PHASE 163. The report tab's one door, driven the way the menu row drives it.
import { openDiagnosticsReport } from '../diagnostics/open-report';

export interface ShotDriveSpec {
  /** Absolute path of a repo to open as a project tab. */
  projectPath: string;
  /** Repo-relative file to open (as a diff by default). */
  openRel?: string;
  mode?: 'diff' | 'file';
  /**
   * Open `openRel` as a NAVIGATION (Phase 14): the same request a search hit
   * emits, so a capture can prove the reveal + selection actually happened
   * instead of asserting it from the code. 1-based line, 0-based columns —
   * the bus contract, unmodified.
   */
  selection?: OpenFileSelection;
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
  /**
   * Sidebar width in CSS px, applied before the project opens. The SCM
   * sections degrade against the PANE's width via container queries, so a
   * capture that cannot set it can only ever photograph one responsive tier.
   * Clamped by the store's own bounds — since Phase 18 that is
   * `[SIDEBAR_MIN, sidebarMaxWidth(window)]`, i.e. 220px up to half the LIVE
   * window, not the old fixed 220–400.
   */
  sidebarWidth?: number;
  /**
   * localStorage entries written before the project opens — per-repo
   * preferences (history scope, section collapse) are read on component
   * mount, so a capture has no other way to stage them.
   */
  localStorage?: Record<string, string>;
  /** Turn the minimap / preview heading ruler on before capture. */
  minimap?: boolean;
  /**
   * Phase 185. Drive the diff view's own control THROUGH ITS BUTTONS, with the
   * diff already open, and read what actually got drawn: the `data-diff-span`
   * count and the highlighted text in each of the four inline modes, and the
   * computed row colour with the backgrounds on and off. It exists because an
   * option that is passed and ignored looks exactly like one that works until
   * somebody counts the spans, and the mode this app runs on is the WORKER
   * POOL's copy rather than the surface's own.
   *
   * `'cycle'` clicks every control. `'read'` touches nothing and reports what
   * the app came up drawing, which is how a second launch on the same profile
   * proves the choice survived and reached a diff opened afterwards.
   */
  diffDrawing?: 'cycle' | 'read';
  /**
   * Phase 185 fix round. A repo-relative file that is IDENTICAL to HEAD,
   * opened as a diff after the readings above are taken, to prove the control
   * row is not drawn over a diff that is not there. The row's condition has to
   * be the skeleton's own: `unchanged` alone cannot be true until the old side
   * has arrived, so testing it alone drew the row through the load and took it
   * away when "No changes" resolved, which a person sees as a flash. The
   * reading is anchored on the SKELETON being up, so the row it looks at
   * belongs to the file being opened and never to the diff still leaving the
   * screen. The pair is re-opened afterwards, so the capture is unchanged.
   */
  identicalRel?: string;
  /**
   * Phase 194. Drive the REDLINE VIEW, being the fourth mode in the
   * segmented control, over the prose fixtures named here, and read the
   * composed document back as the runs it is made of so the probe can hold
   * the two projections against the files it wrote. See
   * ./redline-shot-probe for the journey.
   */
  redline?: RedlineViewProbeSpec;
  /**
   * Phase 198. Drive the FILE HISTORY section, from the Explorer row's own
   * menu to the last tab closed, and read every step off the DOM and the
   * editor store. See ./file-history-shot-probe for the journey. Needs no
   * `openRel`: the section follows the tab the menu row opens.
   */
  fileHistory?: FileHistoryProbeSpec;
  /**
   * Phase 190. Open each named file as a diff, click all four inline modes
   * through the real buttons and read what was drawn and what the row said
   * beside the control, then open the cost fixtures only to read what the
   * comparison cost. See ./agreement-shot-probe. Runs after `openRel`, and
   * needs no `openRel` of its own.
   */
  inlineAgreement?: InlineAgreementProbeSpec;
  /**
   * Force the opened tab's view (markdown/svg: 'preview' | 'file' | 'split';
   * a raster image: 'image' for the viewer, 'diff' for before/after).
   */
  editorMode?: 'diff' | 'file' | 'preview' | 'split' | 'image' | 'redline';
  /** Create a real durable session (killed again by the cleanup hook). */
  session?: { agent?: AgentKind; name?: string };
  /**
   * Inject renderer-only fake sessions in the §6.8 post-reboot restore state
   * (restorable rows + Restore-all bar + armed-resume copy). Never touches
   * the manifest — pure store injection for visual capture.
   */
  fakeRestore?: boolean;
  /**
   * Phase 13.5: inject one LIVE session per resume-capture state (armed,
   * capturing, unavailable, shell) so a capture shows the pre-reboot answer
   * to "which of these comes back with its conversation". Pure store
   * injection. `orientation` additionally flips the session surface, since
   * the dense tab strip carries a glyph while the identity strip has room
   * for the words.
   */
  fakeResume?: boolean;
  orientation?: 'top' | 'right';
  /** Select an injected fixture row by NAME before capture. */
  focusSession?: string;
  /**
   * Inject two renderer-only fake agent sessions (claude working, codex
   * needs-input) so the session tab strip / right list shows the full
   * round-1 vocabulary: agent icons, status dots, needs-input emphasis.
   * Pure store injection — nothing reaches main or the manifest.
   */
  fakeTabs?: boolean;
  /**
   * Inject one renderer-only session that was KILLED FROM OUTSIDE (status
   * 'exited' with `exitSignal`, the Phase 12.7 F2 shape) and focus it, so the
   * capture shows the honest banner — "Session terminated by SIGTERM
   * (external)" — instead of the old "exit 143". Pure store injection.
   */
  fakeKilled?: boolean;
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
   * Phase 40 item 1, end to end: drag a real selection over several rows in
   * the session the spec created, fire a real contextmenu event, record the
   * menu the renderer built, and optionally run one of its items for real.
   * Needs `session`, and something printed into the pane first (use
   * `scrollback.commands`). Owned by
   * src/renderer/terminal/selection-shot-probe.ts; the reading is logged as
   * `[shot-drive] selectionMenu result …` (GMUX_SHOT_VERBOSE=1).
   */
  selectionMenu?: SelectionProbeSpec;
  /**
   * Phase 12.10 item 2, end to end: fire real DragEvents from a synthesized
   * tree drag at the file tree and then at the session pane, and read back
   * what armed and what landed. Needs `session` and `sidebarView: 'explorer'`.
   * Owned by src/renderer/terminal/drop/shot-probe.ts; the result is logged
   * as `[shot-drive] treeDrop result …` (GMUX_SHOT_VERBOSE=1).
   */
  treeDrop?: TreeDropProbeSpec;
  /**
   * Phase 12.9 items 2-4, end to end: run the explorer's file verbs against
   * a scratch folder inside the driven project, through the mounted tree's
   * own TreeOps and the real fs:* channels. Needs `sidebarView: 'explorer'`.
   * Owned by src/renderer/tree/shot-probe.ts; the per-step table is logged
   * as `[shot-drive] treeOps result …` (GMUX_SHOT_VERBOSE=1).
   */
  treeOps?: TreeOpsProbeSpec;
  /**
   * Phase 40 item 2: build a real multiplexed group of 2 or 3 sessions, focus
   * one leaf, and optionally hold one leaf at needs_input, so a capture shows
   * the focus box, the dim on the other panes, and the status dot on a dimmed
   * pane. Owned by src/renderer/app/split/shot-probe.ts; the created session
   * ids are recorded here so the cleanup kills every one of them.
   */
  splitGroup?: Omit<SplitGroupProbeSpec, 'projectPath'>;
  /**
   * Switch the sidebar view before capture ('explorer' shows the Pierre
   * file tree; readiness waits for shadow-DOM rows to render).
   *
   * PHASE 63 ADDED 'arch', and it had to: the Architecture view's own claim is
   * that its header and its rows survive the 220px sidebar minimum, that claim
   * is about the shipped stylesheet under a live layout engine, and a
   * photograph is the only thing that can see it. A union that did not name
   * the view could not drive the picture at all.
   */
  sidebarView?: 'scm' | 'explorer' | 'arch';
  /**
   * Collapse the sidebar (⌘B). The editor panel is a FRACTION of the center
   * region, so this is the only lever the harness has on how wide the panel
   * can get — which is what decides every two-column-vs-one threshold in
   * DESIGN-SPEC S5C (the diff's 640px floor, and Phase 12.10's image
   * comparison, which shares it).
   */
  sidebar?: boolean;
  /**
   * Explorer only: expand directories by clicking their real rows
   * (canonical tree paths, trailing '/' — e.g. "src/"). Exercises the
   * expand → lazy fs:readDir → batch pipeline, not just the paint.
   */
  expandRels?: string[];
  /** Open a UI layer before capture. */
  ui?: 'shortcuts' | 'create' | 'attention' | 'new-project';
  /**
   * Phase 12.9 item 1, end to end: run the REAL projects:create (mkdir +
   * optional `git init` + projects:add + focus) and leave the new tab open
   * for the capture. Only the native folder picker is skipped — everything
   * downstream of it is the shipped path, including the §6.2 fleet the new
   * project lands on. The result is logged as `[shot-drive] newProject …`.
   */
  newProject?: {
    parentDir: string;
    name: string;
    gitInit?: boolean;
    /**
     * `false` opens the DIALOG and types the name into it instead of
     * creating anything — the draft state, where the path preview and the
     * enabled Create button live. Real input events, so the component's own
     * onChange and validation run.
     */
    submit?: boolean;
  };
  /**
   * Phase 12.10 item 1: dispatch REAL wheel events at the image viewport and
   * read the zoom back out. The listener has to be attached non-passively by
   * hand (React's root wheel listener is passive, so preventDefault there is
   * a no-op) — a defect no screenshot can show, because the picture simply
   * would not move. Logged as `[shot-drive] imageZoom …`.
   */
  imageZoom?: { notches: number };
  /** Show a toast before capture (kind defaults to info). */
  toast?: { kind?: 'info' | 'success' | 'error'; text: string };
  /**
   * PHASE 163. Open the diagnostics report tab through its one door, wait for
   * the capture to land, and read the face back into
   * `window.__gmuxP163Surface`: the group labels and totals, the row counts,
   * whether any figure on the face is the sum of the two totals, and the
   * exact bytes the Copy report button would place on the clipboard. The
   * capture is the real one, over the real bridge.
   */
  diagnosticsReport?: boolean;
}

declare global {
  interface Window {
    __gmuxShotDrive?: (spec: ShotDriveSpec) => Promise<void>;
    __gmuxShotCleanup?: () => Promise<void>;
    __gmuxShotReady?: boolean;
    /** Set by main when the drive throws — the harness then exits non-zero. */
    __gmuxShotError?: string;
    /** PHASE 163. What the diagnostics report drew, read off the DOM. */
    __gmuxP163Surface?: unknown;
    /** `window.__gmuxP185Drawing`: the per-mode span reading (Phase 185). */
    __gmuxP185Drawing?: unknown;
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

/**
 * Set a controlled input's value the way a keyboard would: through the
 * native value setter plus a real `input` event, which is what React's
 * synthetic onChange listens for. Assigning `.value` alone is swallowed.
 */
function typeInto(selector: string, value: string): void {
  const el = document.querySelector<HTMLInputElement>(selector);
  if (el === null) return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Project path the drive opened — removed again by the cleanup hook. */
let drivenProjectPath: string | null = null;
/** Real session created by the drive — killed again by the cleanup hook. */
let drivenSessionId: string | null = null;
/** Phase 40: real sessions the split-group probe made — killed by cleanup. */
let splitGroupIds: string[] = [];
/** Timer re-asserting renderer-only fixtures over main's session list. */
let fakeReinject: number | null = null;

/** Add `rows` to the store and keep them there until cleanup. */
function holdFakes(rows: Session[]): void {
  const inject = (): void => {
    useApp.setState((s) => {
      const known = new Set(s.sessions.map((x) => x.id));
      const missing = rows.filter((x) => !known.has(x.id));
      return missing.length === 0 ? s : { sessions: [...s.sessions, ...missing] };
    });
  };
  inject();
  if (fakeReinject !== null) window.clearInterval(fakeReinject);
  fakeReinject = window.setInterval(inject, 200);
}

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
      // Phase 13.5: the restore bar has to state the SPLIT, so the fixture
      // has to contain one. This is the row the phase exists for — a qwen
      // session whose conversation id was never captured, which used to look
      // exactly like the claude rows above it.
      ...base,
      id: 'shot-fake-4',
      name: 'qwen-1',
      tmuxName: 'qwen-1',
      agent: 'qwen' as AgentKind,
      resumeCapture: 'unavailable',
      createdAt: now - 55 * 60_000
    },
    {
      ...base,
      id: 'shot-fake-3',
      name: 'shell-1',
      tmuxName: 'shell-1',
      agent: 'shell',
      resumeCapture: 'none',
      createdAt: now - 25 * 60 * 60_000
    }
  ];
}

/**
 * Phase 13.5 — one LIVE session per resume-capture state, so a capture can
 * show what the user sees BEFORE a reboot rather than after one. The names
 * are the user's own live manifest rows from the bug report: muse-1, qwen-1
 * and pi-1 all had no resume armed and no way to find that out.
 *
 * Renderer-only injection; nothing reaches main or the manifest.
 */
function fakeResumeSpectrum(projectPath: string): Session[] {
  const base = { projectPath, cwd: projectPath };
  const now = Date.now();
  const agent = (id: string): AgentKind => id as AgentKind;
  return [
    {
      ...base,
      id: 'shot-res-1',
      name: 'claude-api',
      tmuxName: 'claude-api',
      agent: 'claude',
      status: 'running',
      agentSessionId: 'f9d3f6f2-0000-4000-8000-000000000001',
      resumeArgv: ['claude', '--resume', 'f9d3f6f2…'],
      resumeCapture: 'armed',
      createdAt: now - 42 * 60_000
    },
    {
      ...base,
      id: 'shot-res-2',
      name: 'pi-1',
      tmuxName: 'pi-1',
      agent: agent('pi'),
      status: 'idle',
      agentSessionId: '019ed309-0000-7000-8000-000000000002',
      resumeArgv: ['pi', '--session-id', '019ed309…'],
      resumeCapture: 'armed',
      createdAt: now - 31 * 60_000
    },
    {
      ...base,
      id: 'shot-res-3',
      name: 'muse-1',
      tmuxName: 'muse-1',
      agent: agent('muse'),
      status: 'running',
      resumeCapture: 'capturing',
      createdAt: now - 4 * 60_000
    },
    {
      ...base,
      id: 'shot-res-4',
      name: 'qwen-1',
      tmuxName: 'qwen-1',
      agent: agent('qwen'),
      status: 'idle',
      resumeCapture: 'unavailable',
      createdAt: now - 18 * 60_000
    },
    {
      ...base,
      id: 'shot-res-5',
      name: 'shell-1',
      tmuxName: 'shell-1',
      agent: 'shell',
      status: 'idle',
      resumeCapture: 'none',
      createdAt: now - 9 * 60_000
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
    // PHASE 197 (nit 2). A drive that names no project opens none. The type
    // says the field is required and a JavaScript caller can still leave it
    // out: the Phase 105 record in docs/BACKLOG.md is a runs only spec that
    // reached projects:add with undefined and raised three toasts over the
    // picture. One step line says so instead.
    const hasProject =
      typeof spec.projectPath === 'string' && spec.projectPath !== '';
    drivenProjectPath = hasProject ? spec.projectPath : null;
    // BEFORE the project opens: per-repo preferences (section scope, collapse
    // state…) are read by their components on mount, so writing them after
    // would photograph the default rather than the state under test.
    for (const [key, value] of Object.entries(spec.localStorage ?? {})) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* a capture-only knob; never worth failing the drive */
      }
    }
    if (spec.sidebarWidth !== undefined) app.setSidebarWidth(spec.sidebarWidth);
    if (spec.editorWidth !== undefined && hasProject) {
      setStoredEditorWidth(spec.projectPath, spec.editorWidth);
    }
    if (hasProject) {
      step(`opening project ${spec.projectPath}`);
      await app.addProjectPath(spec.projectPath);
    } else {
      step('no projectPath in the drive spec, so no project is opened');
    }
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

    // Phase 40 item 2. Runs before any capture wait because it creates real
    // sessions and multiplexes them, which is what the focus box and the dim
    // are drawn on. projectPath comes from the drive spec, never from the
    // probe's own JSON, so the group is always built in the open project.
    if (spec.splitGroup !== undefined) {
      step('splitGroup: building the group');
      splitGroupIds = await driveSplitGroup({
        ...spec.splitGroup,
        projectPath: spec.projectPath
      });
      step(`splitGroup ids ${splitGroupIds.join(',')}`);
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

    // Phase 40 item 1. After the scrollback block, because the pane needs
    // printed output before there is anything to drag a selection over.
    if (spec.selectionMenu !== undefined && drivenSessionId !== null) {
      step('selectionMenu: dragging a selection, then right-clicking');
      const result = await driveSelectionMenu(
        drivenSessionId,
        spec.selectionMenu
      );
      step(`selectionMenu result ${JSON.stringify(result)}`);
    }

    const fixture =
      spec.fakeResume === true
        ? fakeResumeSpectrum(spec.projectPath)
        : spec.fakeRestore === true
          ? fakeRestorableSessions(spec.projectPath)
          : null;
    if (fixture !== null) {
      // HELD, not injected once: main owns `sessions`, and any
      // sessions:changed that lands between here and the capture replaces
      // the array wholesale, taking renderer-only rows with it. The first
      // "right"-orientation run photographed exactly that — an empty dock
      // behind a perfectly correct component.
      holdFakes(fixture);
      await wait(400);
    }

    if (spec.focusSession !== undefined) {
      const focus = (fixture ?? []).find((x) => x.name === spec.focusSession);
      if (focus !== undefined) useApp.getState().setActiveSession(focus.id);
      await wait(400);
    }

    if (spec.orientation !== undefined) {
      useApp.getState().setSessionOrientation(spec.orientation);
      await wait(500);
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

    if (spec.fakeKilled === true) {
      const killed: Session = {
        projectPath: spec.projectPath,
        cwd: spec.projectPath,
        id: 'shot-killed-1',
        name: 'claude-api',
        tmuxName: 'claude-api',
        agent: 'claude',
        status: 'exited',
        // No exitCode at all: a process that dies BY a signal reports an
        // empty #{pane_dead_status}. This is the case that used to render as
        // a plain, unexplained "Session ended".
        exitSignal: 'term',
        createdAt: Date.now() - 26 * 60_000
      };
      useApp.setState((s) => ({ sessions: [...s.sessions, killed] }));
      await wait(200);
      useApp.getState().setActiveSession(killed.id);
      await wait(500);
    }

    if (spec.minimap !== undefined) {
      useEditor.getState().setMinimapEnabled(spec.minimap);
    }

    if (
      spec.sidebar !== undefined &&
      useApp.getState().sidebarVisible !== spec.sidebar
    ) {
      useApp.getState().toggleSidebar();
      await wait(250);
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
        // A selection makes this the search gesture, not the tree gesture —
        // including the `source`, because the focus rule keys off it.
        source: spec.selection !== undefined ? 'search' : 'worktree',
        preview: false,
        ...(spec.selection !== undefined ? { selection: spec.selection } : {})
      });
      // Ready when the mode's surface is mounted and the loading skeleton is
      // gone: Pierre's shadow-DOM host with rendered rows for diff mode,
      // Monaco for file mode. A navigation is always Monaco — the bus forces
      // File mode for it, whatever `mode` asked for.
      const wantDiff =
        spec.selection === undefined && (spec.mode ?? 'diff') === 'diff';
      for (let i = 0; i < 120; i++) {
        const surface = wantDiff
          ? // An image opened as a diff is the before/after comparison, not
            // Pierre — same gesture, different renderer (Phase 12.10).
            (document.querySelector('.imgc-img') ??
              document.querySelector('diffs-container')?.shadowRoot?.querySelector(
                'pre'
              ) ??
              null)
          : // A .md file opens rendered, not in Monaco (Phase 12 item 6);
            // an image opens in the viewer, which is neither.
            (document.querySelector('.imgv-img') ??
              document.querySelector('.md-content > *') ??
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
        // The viewer needs one measured frame before it can fit the image.
        for (let i = 0; i < 20; i++) {
          const img = document.querySelector<HTMLImageElement>('.imgv-img');
          if (img === null || img.complete) break;
          await wait(100);
        }
        await wait(800);
      }
      // Syntax highlight settles async (Shiki streams tokens in diff mode).
      await wait(wantDiff ? 1200 : 600);

      if (spec.diffDrawing !== undefined) {
        step('reading how the diff is drawn in each inline mode');
        const shadow = (): ShadowRoot | null =>
          document.querySelector('diffs-container')?.shadowRoot ?? null;
        /** Every intra-line highlight Pierre drew, in document order. */
        const spanTexts = (): string[] =>
          Array.from(
            shadow()?.querySelectorAll('[data-diff-span]') ?? []
          ).map((el) => el.textContent ?? '');
        const bgOf = (sel: string, pseudo?: string): string => {
          const el = shadow()?.querySelector(sel);
          return el === null || el === undefined
            ? 'none'
            : getComputedStyle(el, pseudo).backgroundColor;
        };
        /**
         * Hold until the NEW highlight has landed, then until it stops moving.
         *
         * The pool clears its caches and re-highlights off the main thread, so
         * the count straight after a click is still the OLD mode's. Waiting
         * only for stability is not enough and was measured failing: the old
         * count is perfectly stable for as long as the worker takes, so a
         * stability-only wait latches the previous mode and every reading comes
         * out shifted by one click. So this waits for the count to LEAVE the
         * value it had before the click first, and only then for it to settle.
         *
         * IT GIVES UP, and says so. Under the very defect the probe exists to
         * catch, being a mode that reaches the options prop but never the
         * worker pool, the count never leaves `from` and a wait with no
         * ceiling never returns. At the 150 turns this used to run, that is
         * 30s a mode and 120s for the four, twice the 60s drive deadline in
         * src/main/harness/shot.ts, so the run died on the deadline and said
         * `drive never finished` and then row 0, no reading at all, which is
         * the same pair a tree with NO control row prints. The defect and its
         * absence looked identical. So the wait is capped at 30 turns of
         * 200ms, being 6s a mode, and the reading comes back regardless with
         * `settled` false when the count never moved. The caller then reports
         * the identical counts and rows 3 to 6 name the defect.
         *
         * Both ends measured on 2026-08-31 by deleting the pool push and the
         * pool seed, running `npm run probe:p185`, then putting them back and
         * running it again. First launch, being boot, drive, read and capture
         * together: 12.2s honest with every row passing and settled true, and
         * 32.4s under the defect, failing on rows 3 to 6 at 188/188/188 with
         * settled false. The 20.2s between the two runs is four capped waits
         * standing where four honest ones were, so an honest click lands in
         * about 0.9s and the cap is over six times it. The same defect run at
         * 50 turns took 48.6s, which still finished and stood 16s nearer the
         * deadline for nothing.
         */
        const settle = async (
          from: number
        ): Promise<{ texts: string[]; settled: boolean }> => {
          let moved = false;
          let last = -1;
          let steady = 0;
          for (let i = 0; i < 30; i++) {
            const now = spanTexts();
            if (!moved) {
              if (now.length !== from) moved = true;
            } else if (now.length === last) {
              steady += 1;
              if (steady >= 3) return { texts: now, settled: true };
            } else {
              steady = 0;
              last = now.length;
            }
            await wait(200);
          }
          return { texts: spanTexts(), settled: false };
        };

        // What the app drew on its own, before this drive touched anything.
        const restingTexts = spanTexts();

        const buttons = (): HTMLButtonElement[] =>
          Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              '.ed-diff-bar .ed-mode-opt'
            )
          );
        const modes: Record<string, unknown> = {};
        const cycling = spec.diffDrawing === 'cycle';
        for (const label of cycling
          ? ['Off', 'Words', 'Phrases', 'Characters']
          : []) {
          const btn = buttons().find((b) => (b.textContent ?? '') === label);
          const from = spanTexts().length;
          btn?.click();
          const { texts, settled } = await settle(from);
          modes[label] = {
            clicked: btn !== undefined,
            pressed: btn?.getAttribute('aria-pressed') ?? null,
            // False means the count never left the previous mode's, so this
            // reading is the OLD mode's drawing rather than this one's.
            settled,
            spans: texts.length,
            chars: texts.reduce((n, t) => n + t.length, 0),
            sample: texts.slice(0, 12),
            stored: localStorage.getItem('gmux.diffInlineMode')
          };
        }

        // The backgrounds answer, read as colour off the running app rather
        // than asserted: a changed row against a context row, both ways round.
        const paint = document.querySelector<HTMLButtonElement>(
          '.ed-diff-bar .ed-icon-btn'
        );
        const readPaint = (): unknown => ({
          pressed: paint?.getAttribute('aria-pressed') ?? null,
          attr: shadow()?.querySelector('pre')?.hasAttribute('data-background') ?? null,
          addition: bgOf('[data-line][data-line-type="change-addition"]'),
          deletion: bgOf('[data-line][data-line-type="change-deletion"]'),
          // Pierre's own word for an unchanged row. It is NOT an absent
          // data-line-type, which is what the first cut of this drive looked
          // for and why it read "none" both ways round.
          context: bgOf('[data-line][data-line-type="context"]'),
          // The change bar is a `::before` on the number column, styled in a
          // block outside `:where([data-background])`. Reading the element
          // instead of the pseudo reads the gutter wash, which is part of what
          // the backgrounds answer turns off.
          bars: bgOf(
            '[data-column-number][data-line-type="change-addition"]',
            '::before'
          ),
          // The intra-line highlight is styled outside that block too, so it
          // has to survive the wash going away.
          spans: (shadow()?.querySelectorAll('[data-diff-span]') ?? []).length,
          stored: localStorage.getItem('gmux.diffBackgrounds')
        });
        const backgroundsOn = readPaint();
        if (cycling) paint?.click();
        // Turning the wash off must not re-highlight anything, so unlike a
        // mode change there is nothing to wait to LAND. One second is a
        // re-render, and the span count is asserted equal either side.
        await wait(1000);
        const backgroundsOff = readPaint();

        const bar = document.querySelector<HTMLElement>('.ed-diff-bar');
        // Held by reference as well as on the window, so the excursion below
        // can add its answer to the same object the capture reads.
        const drawing: Record<string, unknown> = {
          bar: bar !== null,
          // The bar must fit the panel at its narrow floor, or the last
          // control is off the end and unreachable.
          barFits: bar === null ? null : bar.scrollWidth <= bar.clientWidth,
          barWidth: bar?.clientWidth ?? null,
          /** What the row actually needs: its children plus its gaps and padding. */
          barNeeds:
            bar === null
              ? null
              : Math.round(
                  Array.from(bar.children).reduce(
                    (n, c) => n + c.getBoundingClientRect().width,
                    0
                  ) +
                    6 * (bar.children.length - 1) +
                    16
                ),
          panelWidth:
            document.querySelector<HTMLElement>('.ed-panel')?.clientWidth ?? null,
          labels: buttons().map((b) => b.textContent ?? ''),
          titles: buttons().map((b) => b.getAttribute('title') ?? ''),
          // What the app came up drawing, before any click. This is the whole
          // reading of a 'read' run.
          atRest: {
            pressed:
              buttons()
                .filter((b) => b.getAttribute('aria-pressed') === 'true')
                .map((b) => b.textContent ?? '') ?? [],
            spans: restingTexts.length,
            chars: restingTexts.reduce((n, t) => n + t.length, 0)
          },
          modes,
          backgroundsOn,
          backgroundsOff
        };
        window.__gmuxP185Drawing = drawing;
        step('read how the diff is drawn');

        if (spec.identicalRel !== undefined) {
          step('opening a file identical to HEAD, watching for a flash');
          const barUp = (): boolean =>
            document.querySelector('.ed-diff-bar') !== null;
          const skeletonUp = (): boolean =>
            document.querySelector('.ed-skeleton') !== null;
          const stateTitle = (): string =>
            document.querySelector('.ed-state-title')?.textContent ?? '';
          requestOpenFile({
            repoPath: spec.projectPath,
            relPath: spec.identicalRel,
            path: `${spec.projectPath}/${spec.identicalRel}`,
            mode: 'diff',
            source: 'tree',
            preview: false
          });
          /**
           * Anchored on the SKELETON, which is the moment the panel belongs to
           * the file being opened rather than to the diff leaving the screen.
           *
           * A poll alone would be luck: the head side arrives fast enough
           * that a run of this probe measured the skeleton up for ONE 25ms
           * sample, so the next run could step straight over the window this
           * exists to look at. So the same reading is taken from a
           * MutationObserver as well, which cannot step over it: the
           * skeleton's own insertion is a mutation, and the callback reads the
           * document the commit just produced. The poll stays as the second
           * pair of eyes. `skeletonSamples` is the evidence itself, so a run
           * that never saw the skeleton reports 0 and the row FAILS rather
           * than passing on having looked at nothing.
           */
          let skeletonSamples = 0;
          let barWithSkeleton = false;
          let resolved = false;
          const look = (): void => {
            if (!skeletonUp()) return;
            skeletonSamples += 1;
            if (barUp()) barWithSkeleton = true;
          };
          const watcher = new MutationObserver(look);
          watcher.observe(document.body, { childList: true, subtree: true });
          try {
            for (let i = 0; i < 400; i++) {
              look();
              if (stateTitle() === 'No changes') {
                resolved = true;
                break;
              }
              await wait(25);
            }
          } finally {
            watcher.disconnect();
          }
          // And it must not come back after the empty state resolves.
          let barAfter = barUp();
          for (let i = 0; i < 20; i++) {
            if (barUp()) barAfter = true;
            await wait(50);
          }
          drawing['identical'] = {
            rel: spec.identicalRel,
            skeletonSamples,
            barWithSkeleton,
            resolved,
            state: stateTitle(),
            barAfter
          };

          // Back to the pair, so what gets photographed is the diff this run
          // is about rather than an empty state.
          requestOpenFile({
            repoPath: spec.projectPath,
            relPath: spec.openRel ?? '',
            path: `${spec.projectPath}/${spec.openRel ?? ''}`,
            mode: 'diff',
            source: 'tree',
            preview: false
          });
          for (let i = 0; i < 60; i++) {
            if (shadow()?.querySelector('[data-diff-span]') != null) break;
            await wait(250);
          }
          step('the identical file was read and the pair is back');
        }
      }

      /**
       * PHASE 194. The redline view, driven through the real segmented
       * control over every fixture and along the journey the backlog names.
       * The copies are last and main runs them: GMUX_SHOT_CLIPBOARD names
       * the selections and main runs the window's own Copy command over
       * each, then reads what the SYSTEM clipboard received.
       */
      if (spec.redline !== undefined) {
        step('driving the redline view');
        await driveRedlineView(spec.projectPath, spec.openRel ?? '', spec.redline);
        step('read the redline view');
      }
    }

    if (spec.fileHistory !== undefined) {
      step('driving the file history section');
      await driveFileHistory(spec.projectPath, spec.fileHistory);
      step('read the file history section');
    }

    if (spec.inlineAgreement !== undefined) {
      step('driving the inline control over the agreement fixtures');
      await driveInlineAgreement(spec.projectPath, spec.inlineAgreement);
      step('read the inline control');
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

    // After sidebarView, because the probe needs the tree on screen to prove
    // that the pointer over it arms nothing.
    if (spec.treeDrop !== undefined && drivenSessionId !== null) {
      step('treeDrop: driving the tree → pane attach');
      const result = await driveTreeDrop(spec.treeDrop, {
        sessionId: drivenSessionId,
        rootPath: spec.projectPath,
        scroll: scrollBridge()
      });
      step(`treeDrop result ${JSON.stringify(result)}`);
    }

    // Same reason: the verbs run against the mounted tree, so the explorer
    // has to be the visible view before this can drive anything.
    if (spec.treeOps !== undefined) {
      step('treeOps: driving the explorer file verbs');
      const result = await driveTreeOps(spec.treeOps);
      step(`treeOps result ${JSON.stringify(result)}`);
    }

    if (spec.imageZoom !== undefined) {
      const viewport = document.querySelector<HTMLElement>('.imgv-viewport');
      const readout = (): string =>
        document.querySelector('.imgv-zoom')?.textContent ?? 'none';
      const before = readout();
      const rect = viewport?.getBoundingClientRect();
      for (let i = 0; i < Math.abs(spec.imageZoom.notches); i++) {
        viewport?.dispatchEvent(
          new WheelEvent('wheel', {
            // Negative deltaY = zoom IN, anchored under the pointer, which is
            // parked right of centre so the anchoring is observable.
            deltaY: spec.imageZoom.notches > 0 ? -120 : 120,
            clientX: (rect?.left ?? 0) + (rect?.width ?? 0) * 0.7,
            clientY: (rect?.top ?? 0) + (rect?.height ?? 0) * 0.5,
            bubbles: true,
            cancelable: true
          })
        );
        await wait(60);
      }
      await wait(300);
      const img = document.querySelector<HTMLImageElement>('.imgv-img');
      step(
        `imageZoom before=${before} after=${readout()} ` +
          `imgWidth=${String(img?.getBoundingClientRect().width ?? 0)} ` +
          `transform=${img?.style.transform ?? 'none'}`
      );
    }

    if (spec.newProject !== undefined) {
      // The REAL dialog, driven the way a person drives it: open, type into
      // both fields, then press its own Create button. Only the native
      // folder picker is skipped — everything after it (validation, the path
      // preview, projects:create, the focused tab, the §6.2 fleet, and the
      // keyboard handoff onto its default agent tile) is the shipped path.
      step('newProject: opening the dialog');
      useApp.getState().setNewProjectOpen(true);
      await wait(300);
      typeInto('#new-project-dir', spec.newProject.parentDir);
      typeInto('#new-project-name', spec.newProject.name);
      if (spec.newProject.gitInit === false) {
        document
          .querySelector<HTMLInputElement>('.modal .preset-check')
          ?.click();
      }
      await wait(300);
      if (spec.newProject.submit !== false) {
        step('newProject: pressing Create project');
        document
          .querySelector<HTMLButtonElement>('.modal .btn-primary')
          ?.click();
        await wait(1500);
        const names = useApp
          .getState()
          .projects.map((p) => p.name)
          .join(',');
        step(
          `newProject created=${String(
            useApp.getState().activeProject()?.path ?? 'none'
          )} projects=[${names}] focus=${
            document.activeElement?.className ?? 'none'
          }`
        );
      }
    }

    if (spec.ui !== undefined) {
      const s = useApp.getState();
      if (spec.ui === 'shortcuts') s.setShortcutsOpen(true);
      if (spec.ui === 'create') s.setCreateOpen(true);
      if (spec.ui === 'attention') s.setAttentionOpen(true);
      if (spec.ui === 'new-project') s.setNewProjectOpen(true);
      await wait(400);
    }

    if (spec.toast !== undefined) {
      useApp.getState().toast(spec.toast.kind ?? 'info', spec.toast.text);
      await wait(200);
    }

    if (spec.diagnosticsReport === true) {
      step('opening the diagnostics report');
      openDiagnosticsReport();
      // A capture holds its window open for a moment; the face says Capturing
      // on its capture button until the report lands or fails. Phase 170 put
      // the live control ahead of it, so the detector reads every button
      // rather than the first, which this drive did until then.
      const capturing = (): boolean =>
        Array.from(document.querySelectorAll('.diag-btn')).some(
          (el) => (el.textContent ?? '') === 'Capturing'
        );
      for (let i = 0; i < 120; i++) {
        const drawn =
          document.querySelector('.diag-body') !== null ||
          document.querySelector('.diag-note') !== null;
        if (drawn && !capturing()) break;
        await wait(250);
      }
      await wait(300);
      const text = (sel: string): string[] =>
        Array.from(document.querySelectorAll(sel)).map(
          (el) => el.textContent ?? ''
        );
      const totals = text('.diag-group-total');
      const mb = (s: string): number => {
        const m = /(\d+(?:\.\d+)?) MB/.exec(s);
        return m === null ? 0 : Number(m[1]);
      };
      const sum = totals.length === 2 ? mb(totals[0] ?? '') + mb(totals[1] ?? '') : null;
      const figures = text('.diag-fig-value').concat(text('.diag-line-value'));
      const reportTab = useEditor
        .getState()
        .tabs.find((tab) => tab.diagnostics !== undefined);
      window.__gmuxP163Surface = {
        tabName: text('.ed-tab-name'),
        title: text('.diag-title')[0] ?? null,
        when: text('.diag-when')[0] ?? null,
        note: text('.diag-note'),
        groups: text('.diag-group-label'),
        totals,
        shellRows: document.querySelectorAll('.diag-group-shell tbody tr').length,
        sessionRows: document.querySelectorAll('.diag-group-sessions tbody tr').length,
        childRows: document.querySelectorAll('.diag-child').length,
        kinds: text('.diag-group-shell .diag-kind'),
        sumOfTotalsMb: sum,
        sumAppearsOnFace:
          sum !== null && figures.some((f) => mb(f) === sum && sum > 0),
        // Phase 170 moved the milestones into the ladder and put the quiet
        // watcher disclosure ahead of the Electron one, so both readings
        // name what they want rather than trusting position.
        milestones: text('.diag-ladder-value'),
        electronProof:
          text('.diag-disclosure > summary').find((s) =>
            s.includes('Electron')
          ) ?? null,
        unnamed: document.querySelectorAll('.diag-unnamed').length,
        buttons: text('.diag-btn'),
        openTabs: useEditor.getState().tabs.length,
        // The exact bytes Copy report would place on the clipboard, so a
        // verifier can scan them for a secret without a clipboard. Read off
        // the DOM's own data attribute, set by the tab when a report lands.
        copyText:
          reportTab === undefined
            ? null
            : document.querySelector('.diag')?.getAttribute('data-copy') ?? null
      };
      step('diagnostics report read');
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
    if (fakeReinject !== null) {
      window.clearInterval(fakeReinject);
      fakeReinject = null;
    }
    stopSplitGroupHolds();
    if (!window.gmux) return;
    // Fake sessions are renderer-only; nothing to clean up in main.
    const created = [
      ...(drivenSessionId === null ? [] : [drivenSessionId]),
      ...splitGroupIds
    ];
    splitGroupIds = [];
    for (const id of created) {
      await window.gmux.sessions.kill(id).catch(() => undefined);
      const extras = window.gmux.sessions;
      if (typeof extras.discard === 'function') {
        await extras.discard(id).catch(() => undefined);
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
