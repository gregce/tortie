/**
 * Every harness drive App.tsx used to carry, in one chunk the person's launch
 * never loads (Phase 127).
 *
 * WHAT THIS FILE IS. Fifteen probe modules (Phase 63 added the Architecture
 * view's), the four registrar calls that arm
 * them, and the shot-layout wrapper that adds the layout stream's knobs to the
 * editor stream's base drive. Nothing here runs in a normal launch, because
 * `./probe-loader.ts` only imports this file when the renderer's own URL
 * carries `harness=1`. Rollup therefore emits it as a separate chunk, and
 * `build/assert-probe-containment.mjs` reads the built output to prove the
 * entry chunk does not carry it.
 *
 * THE PROBES STAY ON THE SHIPPED PATH. Every drive here calls the same store
 * actions and dispatches the same real DOM events it did when this code lived
 * in App.tsx. The `projectDigit` knob below dispatches a capture-phase keydown
 * on `window`, which is exactly where `./keyboard.ts` listens, so the digit
 * lands through the shipped handler rather than through a store call. A loader
 * that gave the probes a second path would make every screenshot a photograph
 * of the harness.
 *
 * ORDER. `loadProbes()` awaits this module from src/renderer/main.tsx, after
 * the static import of ./App has evaluated and before `createRoot(...).render`.
 * `armShellPathProbe()` still runs before the first render and before
 * `bootApp()`, which is the moment it has to see. `npm run probe:shellpath`
 * proves that rather than asserting it.
 *
 * PHASE 165 MOVED EIGHT MORE DRIVES HERE, and the reason is the split. Until
 * this phase `installShotHook()` ran at module scope of
 * src/renderer/editor/EditorPanel.tsx, the three Source Control drives at
 * module scope of scm/ScmSection.tsx, the three Explorer drives at module
 * scope of tree/FilesSection.tsx and the enable dialog's at module scope of
 * context/enable/EnableForDialog.tsx, each "because this module is the one
 * that view always loads". Those four modules are lazy now. A module scope
 * call in a lazy module runs only after its chunk arrives and never on a
 * launch that shows another subject, and src/main/harness/shot.ts polls for
 * `window.__gmuxShotDrive` from the moment the page loads. So the eight are
 * installed by `armSurfaceDrives()` below, FIRST, which is the position they
 * had when they ran during App.tsx's import, and `prev` in the layout wrapper
 * is a function for the same reason it always was. Every launch that reads any
 * of the eight sets one of the four `isHarnessLaunch` terms, so every one of
 * them is armed; that was checked against every reader under build/ and
 * src/main on 2026-08-29 rather than assumed.
 */

import { acceleratorToDisplay } from '@shared/keymap';
import { useApp, whenSessionsPositionPushed } from '../state/store';
import type { SidebarViewId } from '../state/store';
import { isSidebarViewId } from '../state/sidebar-views';
import { useLayout } from '../state/layout';
// PHASE 93. The harness drive for build/probe-p93-attention.mjs. It assigns one
// property to `window` when its registrar is called and changes nothing else.
import { registerP93AttentionDrive } from './p93-attention-drive';
// PHASE 96. The harness drive for build/probe-p96-remote-surfaces.mjs, in the
// same shape as the one above.
import { registerP96RemoteSurfacesDrive } from './p96-remote-surfaces-drive';
// PHASE 95. The harness drive for build/probe-p95-scroll.mjs, same shape again.
import { registerP95ScrollDrive } from '../terminal/p95-scroll-drive';
import { driveZoom } from '../zoom/shot-probe';
import type { ZoomProbeSpec } from '../zoom/shot-probe';
import { driveQuickOpen } from '../quickopen/shot-probe';
import type { QuickOpenProbeSpec } from '../quickopen/shot-probe';
import { driveSearch, driveSymbols } from '../search/shot-probe';
import type { SearchProbeSpec, SymbolProbeSpec } from '../search/shot-probe';
import { driveContext } from '../context/shot-probe';
import type { ContextProbeSpec } from '../context/shot-probe';
// PHASE 63. The Architecture view's drive, read by build/probe-p63-arch.mjs.
// It stages the ten awkward verdict shapes and measures what the rendered rows
// carried at the width it was given. The runner launches ONE app, drives this
// hook again from inside the window for each width, and asserts the section 9.6
// estimate at the 220px floor rather than printing it. An earlier version of
// this comment named a runner file that did not exist, and the version after
// that claimed a measurement nobody had taken.
import { driveArch } from '../arch/shot-probe';
import type { ArchProbeSpec } from '../arch/shot-probe';
import { driveSessionFocus } from './focus-shot-drive';
import type { SessionFocusProbeSpec } from './focus-shot-drive';
// PHASE 137. The Catch Me Up page's drive, read by
// build/probe-p137-overview.mjs. It presses the real ⇧⌘U where it can and
// says so when it cannot.
import { driveOverview } from '../overview/shot-probe';
import type { OverviewProbeSpec } from '../overview/shot-probe';
import { armShellPathProbe, driveShellPath } from './shell-path-shot-drive';
import type { ShellPathProbeSpec } from './shell-path-shot-drive';
// PHASE 100. The screenshot read's own hook. It opens the last lines panel on a
// real session on a real machine and reports what the panel drew.
import { driveRemoteLines } from './p100-lines-shot';
import type { RemoteLinesProbeSpec } from './p100-lines-shot';
import { driveRemoteRuns } from '../scm/p105-runs-shot';
import type { RemoteRunsProbeSpec } from '../scm/p105-runs-shot';
import { driveRemoteBranch } from '../scm/p106-branch-shot';
import type { RemoteBranchProbeSpec } from '../scm/p106-branch-shot';
import { driveRemoteHistory } from '../scm/p107-history-shot';
import type { RemoteHistoryProbeSpec } from '../scm/p107-history-shot';
// PHASE 120. The LOCAL Runs section's own hook, in the Phase 105 shape.
// PHASE 156. The build time menu icon generator's hook. It reads back the
// cache `warmMenuIcons()` fills, so the PNG set main ships is the output of
// the ONE rasterizer this product has rather than a second copy of it.
import { registerP156MenuIconsDrive } from '../icons/p156-menu-icons-drive';
// PHASE 165. The eight surface drives that used to install themselves at
// module scope of a module that is lazy now. See the header.
import { installShotHook } from '../editor/shot-hook';
import { registerP97UntrackedDrive } from '../scm/p97-untracked-drive';
import { registerP103StageDrive } from '../scm/p103-stage-drive';
import { registerP104CommitDrive } from '../scm/p104-commit-drive';
import { registerTargetShotDrive } from './target-shot-drive';
import { registerRemoteBootDrive } from './remote-boot-drive';
import { registerP154Probe } from '../tree/p154-probe';
import { registerEnableShotProbe } from '../context/enable/shot-probe';
import { driveLocalRuns } from '../scm/p120-runs-shot';
import type { LocalRunsProbeSpec } from '../scm/p120-runs-shot';

// ---------------------------------------------------------------------------
// Screenshot-harness extension (round 1): the editor stream's shot hook
// (src/renderer/editor/shot-hook.ts) drives project/session/editor state;
// this wrapper adds the layout stream's knobs — session-surface orientation
// and sidebar view — read from extra fields on the same GMUX_SHOT_DRIVE JSON.
// Inert outside the harness.
// ---------------------------------------------------------------------------

interface ShotLayoutExtras {
  orientation?: 'top' | 'right';
  sidebarView?: SidebarViewId;
  /**
   * Phase 10 (S4A): after the base drive created its real session, create
   * three more real shell sessions and stage all four as a 2×2 split grid
   * (real terminals, real attach flow — four visible panes at once).
   */
  splitGrid?: boolean;
  /** Arm the drop overlay on the grid's last pane (left half) for capture. */
  splitDrop?: boolean;
  /**
   * Flow-control verification: flood two grid panes with heavy output
   * (`seq`) while all four are attached, then let the burst drain before
   * capture — the acks must keep every pane alive and rendering.
   */
  splitStress?: boolean;
  /**
   * Phase 12.12 item 4: extra project tabs (absolute paths), because the ⌘
   * number hints are a property of the STRIP — one tab proves nothing about
   * where the digits land or whether they reflow their neighbours. Added
   * after the base drive so the driven project stays the active one, and
   * removed again by cleanup.
   */
  extraProjects?: string[];
  /**
   * Phase 12.12 item 4: hold ⌘ for real (a capture-phase Meta keydown on
   * window, exactly what the gesture listens for) and wait past the reveal
   * dwell, so the capture shows the hints rather than a claim about them.
   * Cleanup releases it.
   */
  holdCommand?: boolean;
  /**
   * Phase 12.12 item 3: press ⌘<digit> for real and log which tab it landed
   * on, so "⌘9 is the LAST project" is asserted against the shipped handler
   * and the live tab order — not only against project-shortcuts.test.ts.
   */
  projectDigit?: number;
  /**
   * Phase 12.11: drive per-region zoom with the REAL chord and report what
   * moved — xterm's font, the tmux geometry, a scrolled pane's position, and
   * a hit-test round trip inside every CSS-zoomed region. The findings are
   * console lines (GMUX_SHOT_VERBOSE=1 tees them into the harness output),
   * because none of those four is legible in a PNG.
   */
  zoom?: ZoomProbeSpec;
  /**
   * Phase 14: press ⌘P for real, type a query one character at a time
   * through the shipped handler, and report what came back — the rows,
   * their highlighted characters, and the per-keystroke round trip. None
   * of that is legible in a PNG, and "the palette opened" is the one
   * part of it that is.
   */
  quickOpen?: QuickOpenProbeSpec;
  /**
   * Phase 14: drive ⌘⇧F for real — press the chord, type through the input's
   * own handler, measure time-to-first-painted-row, and open a result. The
   * one thing research 19 §7.3 admits was never measured is time-to-first
   * PAINT with React and virtualization in the loop; this is where it gets
   * measured.
   */
  search?: SearchProbeSpec;
  /** Phase 14: drive ⌘⇧O, including the cold-index state at 200 ms. */
  symbols?: SymbolProbeSpec;
  /**
   * Phase 22: stage the Context view and MEASURE what its row is carrying.
   * Research 29 §5.9 makes three responsive claims — what survives at 340px,
   * at 260px and at 220px — and each of them is a claim about the shipped
   * stylesheet under a live layout engine, which no unit test can see.
   */
  context?: ContextProbeSpec;
  /**
   * Phase 63: stage the Architecture view and MEASURE what it is carrying.
   * Research 49 section 9.6 admits in its own words that the 220px fit is an
   * estimate rather than a measurement, "because nobody launched the app in
   * this workflow", and names this probe as where it gets checked.
   */
  arch?: ArchProbeSpec;
  /**
   * Open the ⌘/ shortcuts overlay for capture. Phase 14 added a seventh
   * KEYMAP group and the overlay is a three-column flow, so "does the new
   * group land somewhere sane" is a question only a picture answers.
   */
  shortcuts?: boolean;
  /**
   * Phase 80.1. Press ⇧⌘↩ for real and record every `Terminal.onResize` with
   * its offset in milliseconds from the press.
   *
   * This is the phase's one Tier 3 measurement. The claim is that a live
   * multiplexed surface receives NO resize until the flight ends, and a
   * resize is the one thing about this mode that costs the person their work,
   * because every fit sends new columns and rows to a real session. No
   * screenshot can show it and no unit test can see it, so the driver prints
   * a table of leaf id, columns, rows and offset, and the probe reads tmux on
   * the harness socket at the same time as the second, independent witness.
   */
  sessionFocus?: SessionFocusProbeSpec;
  /**
   * Phase 137. Open the Catch Me Up page at one of its three levels and
   * report what it drew. The project and session levels are opened with the
   * real ⇧⌘U keydown on window, so the shipped handler runs. The several
   * level goes through the store, because the rail has no multi select for
   * a drive to stage, and the console report names which route ran.
   */
  overview?: OverviewProbeSpec;
  /**
   * Phase 100. Open the last lines panel on a session that runs on another
   * machine, wait for the read to answer, and report what the panel drew.
   *
   * The screenshot is the point of this one. What has to be read off the image
   * is a set of sentences, and a sentence is a thing a person reads rather than
   * a number a test can compare. The hook is what gets the panel open and
   * settled before the harness takes the picture.
   */
  remoteLines?: RemoteLinesProbeSpec;
  /**
   * Phase 105. Seed one runs answer for a tab whose folder is on another
   * machine, open the group through its own control, and report every sentence
   * it drew.
   *
   * The screenshot is the point of this one. Four of the sentences exist to say
   * what is not true about the list, being when it was read, that it does not
   * refresh, which commit is checked out over there and that the rows can be
   * the newest few. Whether all four fit under the rows without being clipped
   * is a question only a picture answers.
   */
  remoteRuns?: RemoteRunsProbeSpec;
  /**
   * Phase 120. Seed the LOCAL Runs section with five runs, being a queued
   * one, a running one, a succeeded one, a failed one, and a running release
   * whose head branch is a tag name, then open the group through its own
   * control and report what it drew.
   *
   * The screenshot is the point of this one. The phase's claim is that a
   * queued row, two spinning rows and a tag run's row are drawn side by side
   * with their live states, and whether the five glyphs read clearly at once
   * is a question only a picture answers.
   */
  localRuns?: LocalRunsProbeSpec;
  /**
   * Phase 106. Seed one branch answer for a tab whose folder is on another
   * machine, open the group through its own control, and report every sentence
   * it drew with the box the layout engine gave it.
   *
   * The screenshot is the point of this one. Four of the sentences exist to say
   * what is not true, being that the answer does not refresh, that the two
   * counts were measured against a copy that machine holds, that Tortie changes
   * nothing over there and that only the checked out branch is read. Whether
   * all four fit under the group without being clipped is a question only a
   * picture answers, and the driver turns it into a pair of numbers as well.
   */
  remoteBranch?: RemoteBranchProbeSpec;
  /**
   * Phase 107. Seed one history answer for a tab whose folder is on another
   * machine, open the group through its own control, optionally press Load
   * more once, and report every sentence it drew with the box the layout engine
   * gave it.
   *
   * The screenshot is the point of this one. Six of the sentences exist to say
   * what is not true, being that the answer does not refresh, that older
   * commits exist behind the page, that Tortie stops at a ceiling, that the
   * ahead and behind marks were read for the page and no further, that a page
   * is read fresh so the lines on the left can move, and that the files one
   * commit changed are not read at all. This body is the tallest one the column
   * draws, so whether all of them fit under the group is a question only a
   * picture answers, and the driver turns it into a pair of numbers as well.
   */
  remoteHistory?: RemoteHistoryProbeSpec;
  /**
   * Phase 81. Start a restore and a create before the login shell has
   * answered, read every Restore control out of the document while the
   * answer is still coming, and report when each of those moments was.
   *
   * The phase's claims are all about order in time. A screenshot cannot show
   * an order and a unit test cannot see a real login shell, so the driver
   * prints a table of moments and build/probe-shell-path.mjs reads the panes
   * those verbs produced as the second, independent witness.
   */
  shellPath?: ShellPathProbeSpec;
}

/**
 * Install the eight drives that used to run at module scope of a surface
 * module (Phase 165), in the order those modules were evaluated before the
 * split: the editor panel first, then Source Control, then the Explorer, then
 * the Context subject's enable dialog.
 *
 * `installShotHook` is first because `installShotLayoutExtras` below wraps
 * the function it installs, and refuses if it is not there.
 */
function armSurfaceDrives(): void {
  // The base screenshot drive, src/renderer/editor/shot-hook.ts. Polled by
  // src/main/harness/shot.ts and by capture-remote.ts.
  installShotHook();
  // The three Source Control drives, read by build/probe-p97-untracked.mjs,
  // build/probe-p103-shot.mjs and build/probe-p104-shot.mjs through
  // GMUX_SHOT_JS, which is evaluated once after the base drive finishes.
  registerP97UntrackedDrive();
  registerP103StageDrive();
  registerP104CommitDrive();
  // The three Explorer drives, read by build/probe-workspace-target.mjs,
  // build/probe-remote-project.mjs and build/probe-p154-drop.mjs.
  registerTargetShotDrive();
  registerRemoteBootDrive();
  registerP154Probe();
  // The enable dialog's drive. No script under build/ reads it today; it is
  // kept armed because the phase removes nothing.
  registerEnableShotProbe();
}

/**
 * Arm the four module-load drives, in the order App.tsx called them.
 *
 * It is one function rather than four bare statements so the order is a thing
 * a reader can see and a test can name.
 */
function armModuleLoadDrives(): void {
  // PHASE 81 harness hook, armed as early as the renderer runs because the
  // moment it has to see, the session list arriving, is over before any drive
  // can start. It takes four timestamps and its store subscription removes
  // itself as soon as it has them. Nothing else in a real run reaches it.
  armShellPathProbe();

  // PHASE 93 harness hook, in the same shape. It assigns one object to `window`
  // and reads nothing until build/probe-p93-attention.mjs calls a method on it.
  registerP93AttentionDrive();

  // PHASE 96 harness hook, same again, read by build/probe-p96-remote-surfaces.mjs.
  registerP96RemoteSurfacesDrive();

  // PHASE 95 harness hook, in the same shape and for the same reason.
  registerP95ScrollDrive();

  // PHASE 156 hook, same shape again, read by build/generate-menu-icons.mjs.
  registerP156MenuIconsDrive();
}

/**
 * Wrap the editor stream's base drive with the layout knobs above.
 *
 * This body is the one App.tsx ran inside a `useEffect`. It runs at load now,
 * before the first render, so the wrapper is in place before any harness can
 * call `__gmuxShotDrive`. There is no teardown, because nothing ever unmounts
 * the renderer.
 */
function installShotLayoutExtras(): void {
  const w = window as unknown as {
    __gmuxShotDrive?: (spec: unknown) => Promise<void>;
    __gmuxShotCleanup?: () => Promise<void>;
  };
  const prev = w.__gmuxShotDrive;
  if (typeof prev !== 'function') return;
  const prevCleanup = w.__gmuxShotCleanup;
  /** Extra real sessions created for splitGrid — killed by cleanup. */
  let extraIds: string[] = [];
  /** Extra project tabs added for the ⌘-hint capture — closed by cleanup. */
  let extraProjectIds: string[] = [];
  /** ⌘ is being held for the capture — released by cleanup. */
  let commandHeld = false;

  w.__gmuxShotDrive = async (spec: unknown): Promise<void> => {
    const wait = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const ext = spec as ShotLayoutExtras;
    if (ext.orientation === 'right' || ext.orientation === 'top') {
      useApp.getState().setSessionOrientation(ext.orientation);
      // The setter above already pushed the new position to main (that is
      // the ONLY path — Phase 14.7). The harness just waits for the round
      // trip so the capture never races the View menu's radios; it does not
      // repeat the call, which would be a second mechanism.
      await whenSessionsPositionPushed();
      console.log('[shot-drive] sessionsPosition → main: settled');
    }
    await prev(spec);
    // Phase 18.55's rule applied to the harness too: the views are DATA, so
    // this asks the list rather than naming the two it happened to know.
    // Written out by hand it excluded Search from the day Search shipped.
    if (isSidebarViewId(ext.sidebarView)) {
      // The base drive already flipped __gmuxShotReady — pull it back
      // down while the view swaps so main never captures mid-switch.
      window.__gmuxShotReady = false;
      useApp.getState().showSidebarView(ext.sidebarView);
      // Let the freshly mounted view settle (tree listing, git status)
      // before main captures the page.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      window.__gmuxShotReady = true;
    }
    if (ext.splitGrid === true) {
      window.__gmuxShotReady = false;
      const app = useApp.getState();
      const before = new Set(
        app.projectSessions().map((x) => x.id)
      );
      for (const name of ['split-2', 'split-3', 'split-4']) {
        await app.createSession({ name, agent: 'shell' });
      }
      // Sessions land via the sessions:changed event — poll for all four.
      let ids: string[] = [];
      for (let i = 0; i < 40; i++) {
        ids = useApp
          .getState()
          .projectSessions()
          .filter((x) => x.status !== 'exited' && x.status !== 'restorable')
          .map((x) => x.id);
        if (ids.length >= 4) break;
        await wait(250);
      }
      extraIds = ids.filter((id) => !before.has(id));
      const projectPath = useApp.getState().activeProject()?.path ?? null;
      const four = ids.slice(0, 4);
      if (projectPath !== null && four.length === 4) {
        useLayout.getState().stageGrid(projectPath, four);
      }
      // Four panes attach + draw their prompts.
      await wait(3000);
      if (ext.splitStress === true) {
        await wait(4000); // all four attaches settle before the flood
        for (const id of [four[1], four[2]]) {
          if (id !== undefined) {
            window.gmux?.term.sendInput(id, 'seq 1 60000; echo FLOW-OK\r');
          }
        }
        await wait(6000); // bursts drain through the per-session acks
      }
      if (ext.splitDrop === true) {
        const target = four[3];
        if (target !== undefined) {
          useLayout.getState().setSplitDrop({ leafId: target, edge: 'left' });
        }
        await wait(200);
      }
      window.__gmuxShotReady = true;
    }
    // Phase 12.12 item 4 — a real strip, then a real ⌘.
    if (Array.isArray(ext.extraProjects) && ext.extraProjects.length > 0) {
      window.__gmuxShotReady = false;
      const app = useApp.getState();
      const before = new Set(app.projects.map((p) => p.id));
      for (const path of ext.extraProjects) {
        await app.addProjectPath(path);
      }
      await wait(600);
      extraProjectIds = useApp
        .getState()
        .projects.filter((p) => !before.has(p.id))
        .map((p) => p.id);
      // The driven project stays the one on screen.
      const driven = useApp.getState().projects.find((p) => before.has(p.id));
      if (driven !== undefined) useApp.getState().setActiveProject(driven.id);
      window.__gmuxShotReady = true;
    }
    if (typeof ext.projectDigit === 'number') {
      window.__gmuxShotReady = false;
      // Capture-phase keydown on window is exactly where useKeyboardMap
      // listens, so this is the shipped path and not a call to the store.
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: String(ext.projectDigit),
          code: `Digit${ext.projectDigit}`,
          metaKey: true,
          bubbles: true
        })
      );
      await wait(300);
      const app = useApp.getState();
      const ordered = app.orderedProjects();
      const at = ordered.findIndex((p) => p.id === app.activeProjectId);
      console.log(
        `[shot-drive] projectDigit ${acceleratorToDisplay(
          `Cmd+${String(ext.projectDigit)}`
        )} of ${ordered.length}` +
          ` tabs → index ${at} ("${ordered[at]?.name ?? ''}")`
      );
      window.__gmuxShotReady = true;
    }
    if (ext.holdCommand === true) {
      window.__gmuxShotReady = false;
      // The gesture listens on window in the CAPTURE phase for a Meta
      // keydown; anything less than a real event would be testing the
      // harness. Then wait past the dwell (220ms) plus the fade.
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Meta',
          code: 'MetaLeft',
          metaKey: true,
          bubbles: true
        })
      );
      commandHeld = true;
      await wait(700);
      window.__gmuxShotReady = true;
    }
    // Phase 12.11 — last, so it zooms whatever the earlier knobs built.
    if (ext.zoom !== undefined) {
      window.__gmuxShotReady = false;
      const first = useApp
        .getState()
        .projectSessions()
        .find((x) => x.status !== 'exited' && x.status !== 'restorable');
      await driveZoom({
        ...ext.zoom,
        ...(ext.zoom.sessionId === undefined && first !== undefined
          ? { sessionId: first.id }
          : {})
      });
      window.__gmuxShotReady = true;
    }
    // Phase 14 — after everything else, so the palette opens over the
    // finished layout and the capture shows it in its real surroundings.
    if (ext.quickOpen !== undefined) {
      window.__gmuxShotReady = false;
      await driveQuickOpen(ext.quickOpen);
      window.__gmuxShotReady = true;
    }
    if (ext.shortcuts === true) {
      window.__gmuxShotReady = false;
      useApp.getState().setShortcutsOpen(true);
      await wait(400);
      window.__gmuxShotReady = true;
    }
    if (ext.search !== undefined) {
      window.__gmuxShotReady = false;
      await driveSearch(ext.search);
      window.__gmuxShotReady = true;
    }
    if (ext.symbols !== undefined) {
      window.__gmuxShotReady = false;
      await driveSymbols(ext.symbols);
      window.__gmuxShotReady = true;
    }
    if (ext.context !== undefined) {
      window.__gmuxShotReady = false;
      useApp.getState().showSidebarView('context');
      if (ext.context.width !== undefined) {
        useApp.getState().setSidebarWidth(ext.context.width);
      }
      await wait(300);
      await driveContext(ext.context);
      window.__gmuxShotReady = true;
    }
    // Phase 63, in the shape of the Context knob directly above it. The view
    // is shown through the store's own action and the width is set through the
    // store's own setter, which is what a drag does, so the container query
    // being measured is the one a person would produce.
    if (ext.arch !== undefined) {
      window.__gmuxShotReady = false;
      useApp.getState().showSidebarView('arch');
      if (ext.arch.width !== undefined) {
        useApp.getState().setSidebarWidth(ext.arch.width);
      }
      await wait(300);
      await driveArch(ext.arch);
      window.__gmuxShotReady = true;
    }
    // Phase 80.1, after everything else, so the chord fires over the
    // finished layout. With `splitGrid` set, that layout is four real
    // attached sessions, which is the substrate the Tier 3 claim needs.
    if (ext.sessionFocus !== undefined) {
      window.__gmuxShotReady = false;
      await driveSessionFocus(ext.sessionFocus);
      window.__gmuxShotReady = true;
    }
    // Phase 137. After the layout knobs, so the page opens over the finished
    // layout and the picture shows it in its real surroundings.
    if (ext.overview !== undefined) {
      window.__gmuxShotReady = false;
      await driveOverview(ext.overview);
      window.__gmuxShotReady = true;
    }
    // Phase 100. After everything else, so the panel opens over the finished
    // layout and the picture shows it in its real surroundings.
    if (ext.remoteLines !== undefined) {
      window.__gmuxShotReady = false;
      await driveRemoteLines(ext.remoteLines);
      window.__gmuxShotReady = true;
    }
    // Phase 105. After the layout has settled, so the group opens in its real
    // surroundings and the picture shows it under the Changes group.
    if (ext.remoteRuns !== undefined) {
      window.__gmuxShotReady = false;
      await driveRemoteRuns(ext.remoteRuns);
      window.__gmuxShotReady = true;
    }
    // Phase 120. The same shape for the LOCAL Runs group, so the section
    // opens in its real surroundings and the picture shows the five glyphs
    // over the finished layout.
    if (ext.localRuns !== undefined) {
      window.__gmuxShotReady = false;
      await driveLocalRuns(ext.localRuns);
      window.__gmuxShotReady = true;
    }
    // Phase 106. After the Runs drive, so a picture that carries both groups
    // shows each of them in the state its own driver left it in.
    if (ext.remoteBranch !== undefined) {
      window.__gmuxShotReady = false;
      await driveRemoteBranch(ext.remoteBranch);
      window.__gmuxShotReady = true;
    }
    // Phase 107. After the Branch drive, so a picture that carries every
    // group shows each of them in the state its own driver left it in.
    if (ext.remoteHistory !== undefined) {
      window.__gmuxShotReady = false;
      await driveRemoteHistory(ext.remoteHistory);
      window.__gmuxShotReady = true;
    }
    // Phase 81. It runs as early as the harness lets a drive run, because
    // every claim it measures is about the seconds before the login shell
    // answers. GMUX_SHOT_DELAY_MS is what decides how early that is.
    if (ext.shellPath !== undefined) {
      window.__gmuxShotReady = false;
      await driveShellPath(ext.shellPath);
      window.__gmuxShotReady = true;
    }
  };

  w.__gmuxShotCleanup = async (): Promise<void> => {
    if (commandHeld) {
      window.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Meta', code: 'MetaLeft', bubbles: true })
      );
      commandHeld = false;
    }
    for (const id of extraProjectIds) {
      // The bridge directly, not closeProject() — that one raises the
      // §4 confirm dialog, which a cleanup pass has nobody to answer.
      await window.gmux?.projects.remove(id).catch(() => undefined);
    }
    extraProjectIds = [];
    for (const id of extraIds) {
      await window.gmux?.sessions.kill(id).catch(() => undefined);
      const extras = window.gmux?.sessions;
      if (typeof extras?.discard === 'function') {
        await extras.discard(id).catch(() => undefined);
      }
    }
    await prevCleanup?.();
  };
}

/**
 * The one export. `./probe-loader.ts` awaits this module and calls it.
 */
export function installProbes(): void {
  armSurfaceDrives();
  armModuleLoadDrives();
  installShotLayoutExtras();
}
