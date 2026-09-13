/**
 * gmux editor store (zustand) — tabs, modes, dirty state, save.
 *
 * Owned by the editor stream (src/renderer/editor/**). Subscribes to the
 * canonical open-file bus (src/renderer/state/open-file.ts): SCM rows and
 * tree rows emit OpenFileRequests; this store turns them into tabs.
 *
 * S5 rules implemented here:
 *  - modified files open as DIFF vs HEAD by default (`mode: 'diff'`,
 *    rendered read-only by PierreDiff since Phase 11), untracked/clean open
 *    plain (`mode: 'file'`, Monaco), .md opens rendered (`mode: 'preview'`)
 *  - single preview tab (italic) reused until the file is edited or the row
 *    is opened for keeps; everything else ACCUMULATES (Phase 12 item 5)
 *  - max 10 tabs, LRU-evicting clean, non-active tabs
 *  - ⌘S saves via fs:writeFile; dirty dot until saved
 *  - §6.12 file-deleted-under-tab state (read-only + banner)
 *  - Phase 14: a request carrying an `OpenFileSelection` is a NAVIGATION —
 *    it forces File mode (the only surface with lines on it), it lands on
 *    RE-open of an already-open tab and not just on first open, and it hands
 *    MonacoHost a `pendingSelection` to reveal + select + flash exactly once
 *
 * TAB IDENTITY (`tab.id`, not `tab.path`). Every action, the Monaco model
 * registry and the view-state registry are keyed by `id`. For a worktree tab
 * `id` is the absolute path; for a HISTORY tab it is `${sha}:${relPath}`, so
 * the same file seen at two commits is two tabs, neither of which shares (or
 * disposes) the live file's buffer. The rule itself is ./tab-identity.
 *
 * THREE KINDS OF TAB (Phase 12 integration, DESIGN-SPEC S5C; the third added
 * by Phase 73):
 *  - worktree (`commit === null`) — LEFT is HEAD (`git:showHead`), RIGHT is
 *    the live buffer; editable, refreshed by the git watcher.
 *  - history  (`commit !== null`) — LEFT and RIGHT both come from
 *    `git:commitFileDiff` (`<sha>^ → <sha>`); IMMUTABLE, so it never reads
 *    the worktree, never saves, and the watcher skips it.
 *  - review   (`remote !== undefined`, Phase 73) — LEFT and RIGHT both come
 *    from `machines:reviewFile`, which reads them on ANOTHER COMPUTER. It is
 *    immutable for the same three reasons as history plus one more: the file
 *    is not on this Mac, so a save could only ever write over a different
 *    file. Its identity carries the machine id, so the same path on two
 *    machines is two tabs.
 * `origRelPath` is the path the LEFT side lives at, which differs from
 * `relPath` for a rename. Without it a renamed file diffs against nothing at
 * its new path and renders as a whole-file addition (Phase 11 carried
 * finding (a)) — that is why it is a first-class field and not a detail of
 * either loader.
 *
 * WHAT LIVES ELSEWHERE. This file is the state machine over the tab LIST.
 * Loading, saving and watcher refresh are ./tab-io; identity and left-path
 * are ./tab-identity; the strip's chrome is ./EditorTabs. They were one
 * 770-line file until the Phase-12 cohesion pass.
 *
 * PHASE 260 — TABS FOLLOW THE PROJECT (issue 19, research 119). THE INTERFACE,
 * written here so the strip, the panel and the projects slice wire to it
 * without guessing.
 *
 * STATE
 *   projectId            the project whose tabs are on screen, null before a
 *                        project is active. Moved ONLY by `switchProject`.
 *   tabs                 EVERY open tab of EVERY project. Never draw it raw.
 *   activeId, panelOpen  the CURRENT project's, mirrored from the two maps
 *                        below so every existing reader keeps working.
 *   activeIdByProject    per-project memory of the tab on screen
 *   panelOpenByProject   per-project memory of the panel's open state
 *                        (`sidebarViewByProject` in ../state/chrome-slice is
 *                        the pattern; these are in memory only, because tabs
 *                        are, research 119 §1)
 *
 * READ THE VISIBLE SET, never `tabs` (research 119 §4):
 *   visibleTabsOf(tabs, projectId)   pure; the tab menu's counts use it
 *   useVisibleTabs()                 the hook, shallow compared, so a patch to
 *                                    a hidden tab does not redraw the strip
 *   visibleTabs()                    the same off getState()
 *
 * ACTIONS
 *   switchProject(projectId)    swaps activeId and panelOpen from the maps and
 *                               DISPOSES NOTHING. `init()` subscribes it to the
 *                               app store's `activeProjectId`, so a switch by
 *                               any path — a project tab click, ⌘1..9,
 *                               closeProject's fallback — reaches it without
 *                               a caller; calling it again is a no-op.
 *   closeProjectTabs(projectId, onClosed)
 *                               closes that project's tabs through closeMany's
 *                               dirty prompt and calls onClosed once the last
 *                               one is gone, never after a Cancel. The ONE
 *                               place a project's tabs are closed because of
 *                               the project, and it is for a project being
 *                               CLOSED (research 119 §5.2). projects-slice's
 *                               closeProject reaches it through the shell seam
 *                               (state/shell-ops.ts) and removes the project
 *                               from inside onClosed.
 *
 * DEPS, read off the app store this file already imports for the dirty-close
 * confirm: `projects` and `activeProjectId` decide a new tab's `projectId`
 * (§5.1, asked of the FILE's path and never of the request's `repoPath`,
 * which a terminal link fills with the pane's project), and
 * `setActiveProject` is called when a tab of ANOTHER project is opened or
 * activated, so the person sees the file they clicked. A tab's project moves
 * after the open in exactly two cases, neither of which disposes anything:
 * the file's own folder becomes a project and the file is opened from it
 * (`rehome`), and a tab of no project meets the first active project
 * (`switchProject`).
 *
 * THE ONE HARD RULE: hiding is a filter and never a close. No forceCloseTab,
 * no preview-slot reuse and no MAX_TABS eviction ever reaches a hidden
 * project's tab (§2, §3). The preview slot and the cap are per project.
 *
 * AND THE CAP IS ASKED ON THE OPEN PATH ONLY. `rehome` moves a tab onto
 * another project's strip without asking `MAX_TABS`, and `switchProject`
 * hands EVERY tab of no project to the first active one the same way, so a
 * strip can hold more than ten. It was true at Phase 260's parent as well as
 * at its HEAD, and Phase 261 stated it rather than fixing it: the two movers
 * dispose nothing, and evicting somebody's tab as a side effect of a project
 * being ADDED is a worse answer than a strip that is over.
 *
 * PHASE 261 CORRECTED THIS PARAGRAPH TWICE, and the second correction is the
 * reason it is worth reading. The first version said "eleven, until the next
 * open there evicts it back down to ten" and both halves were false. The fix
 * round's replacement kept one of them: it called eleven `rehome`'s CEILING,
 * which is the same mistake in a smaller place, a number that is really an
 * increment stated as a bound. Every number below is measured by driving this
 * store in `__tests__/p261-strip-high-water.test.ts` rather than by reading it:
 *
 *   NEITHER MOVER HAS A CEILING. `rehome` moves one tab and never asks the
 *   cap, so it adds one PER MOVE: a strip at ten reads 11 after one rehome and
 *   12 after a second. `switchProject` adopts the WHOLE null strip in one go,
 *   so what it leaves is whatever the destination held plus whatever that
 *   strip held: five own tabs and eight adopted reads 13, and a second
 *   leave-and-adopt cycle reads 21. What bounds a strip is how many moves land
 *   on it and how big the adopted strip was, and neither is a number this file
 *   can state.
 *
 *   the next open does not bring it down. The eviction below removes EXACTLY
 *   ONE tab for the one it just pushed, so an over-cap strip stays where it is:
 *   measured at 11, 11, 11 across two further opens after a rehome, and at 21,
 *   21, 21, 21 across four after two adopt cycles. The high-water mark is where
 *   the strip lives until a person closes something.
 *
 * A strip that DRAINED would have to evict more than it adds, which is the
 * same "close somebody's tab because a project moved" this paragraph refuses,
 * so the limit is stated at its real size rather than made smaller by a
 * sentence.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { isImagePath, isSvgPath } from '@shared/image-types';
import {
  isLocalTarget,
  sameTarget,
  targetOfProject
} from '@shared/workspace-target';
import { useApp } from '../state/store';
import { onOpenFile } from '../state/open-file';
import { onRepoChanged } from '../state/repo-changed';
import type { OpenFileRequest } from '../state/open-file';
import { disposeModels, dropViewState } from './monaco-loader';
import { forgetRewindJournal } from './redline-journal';
import type { EditorMode, EditorTab } from './tab-types';
import { NO_BASELINE, nextBaseline } from './baseline';
import {
  ARCH_MAP_TAB_NAME,
  DIAGNOSTICS_TAB_NAME,
  fileInRepo,
  leftPathFor,
  remoteCommitTabId,
  remoteTabId,
  tabIdFor
} from './tab-identity';
import { compareTabName } from './save-sentences';
import { createTabIo } from './tab-io';
// Direct module import, not the ./markdown barrel: the barrel re-exports the
// preview component, whose skeleton comes from MonacoHost, which imports this
// store — a cycle for the sake of one predicate.
import { isMarkdownPath } from './markdown/markdown-path';
// Phase 20.5: the eligibility gate for a rendered page, shared with main's
// `gmux-preview:` handler so the tab and the handler cannot disagree.
import { canPreviewPath } from '@shared/preview-types';
import { baseName } from './paths';
import { gmuxBridge } from '../bridge';
import {
  readDiffBackgrounds,
  readInlineDiffMode,
  writeDiffBackgrounds,
  writeInlineDiffMode
} from '../pierre/diff-view-prefs';
import type { LineDiffTypes } from '@pierre/diffs';

// The tab vocabulary lives in ./tab-types (Phase 42 stage 8) so ./tab-io can
// name an EditorTab without importing this store. Re-exported here because
// this module is the tab surface every other file already imports from.
export type { EditorMode, EditorTab } from './tab-types';

/** The three views a markdown tab toggles between, in control order. */
export const MARKDOWN_MODES: readonly EditorMode[] = ['preview', 'file', 'split'];

/**
 * VS Code's opt-in limit. Its shipped default is unlimited, but this editor
 * is a side panel next to live terminals: past ten the strip is a scroll
 * exercise, and each tab holds a Monaco model. Dirty tabs are never evicted.
 */
const MAX_TABS = 10;

/**
 * Re-opening the same file inside this window counts as a double-click and
 * pins the tab. Emitters that send `preview: false` explicitly (a row's
 * double-click or ↩) do not depend on it; this is what makes a double-click
 * pin even from a plain-click emitter. macOS's own double-click interval is
 * 500 ms at the slider's midpoint.
 */
const DOUBLE_OPEN_MS = 500;

const LS_MINIMAP = 'gmux.minimap';
const LS_MARKDOWN_MODE = 'gmux.markdownMode';
const LS_DIFF_SPLIT = 'gmux.diffSideBySide';

/**
 * PHASE 260. The map key for "no project was active", so a tab opened before
 * any project exists still has a strip to be drawn in and a place to be
 * remembered.
 */
const NO_PROJECT_KEY = '';
const keyOf = (projectId: string | null): string => projectId ?? NO_PROJECT_KEY;

/**
 * PHASE 260. The tabs one project's strip draws: the ones that belong to it.
 * Pure, so the tab menu's counts and a test can ask it without a hook. A tab
 * with no `projectId` at all (a fixture built before this phase) reads as
 * null, which is the "no project active" strip.
 */
export function visibleTabsOf(
  tabs: readonly EditorTab[],
  projectId: string | null
): EditorTab[] {
  return tabs.filter((t) => (t.projectId ?? null) === projectId);
}

interface EditorState {
  tabs: EditorTab[];
  activeId: string | null;
  /** Panel visible (tabs survive a hidden panel; ⌘E/Esc toggle). */
  panelOpen: boolean;
  /**
   * PHASE 260. The project whose tabs are on screen. `activeId` and
   * `panelOpen` above are THIS project's, and are mirrored into the two maps
   * below on every write so a switch away and back finds them.
   */
  projectId: string | null;
  activeIdByProject: Record<string, string | null>;
  panelOpenByProject: Record<string, boolean>;
  /** Last open request — ⌘E reopens it when every tab was closed. */
  lastRequest: OpenFileRequest | null;
  /**
   * PHASE 260, committer's round. The project `lastRequest` LANDED in: the
   * tab's project at the moment the request was handled, a rehome included,
   * and the adopting project once a null-strip tab has joined one. ⌘E asks
   * THIS rather than `projectOf(lastRequest)`, because `projectOf` answers
   * where the request would land NOW, and for a file outside every root its
   * fallback clause is the CURRENT project: at 721b35c6 a global CLAUDE.md
   * opened from alpha, then ⌘E in bravo with no tabs, passed the guard, found
   * the hidden alpha tab and moved the app to alpha under a gesture that only
   * asked for the panel.
   */
  lastRequestProjectId: string | null;
  /** Monaco chunk failed to load (retryable; blocks File mode only —
   *  Diff mode renders via @pierre/diffs without Monaco). */
  monacoError: string | null;
  /** Minimap / preview scroll ruler, app-wide (persisted). */
  minimapEnabled: boolean;
  /**
   * Prefer the two-column diff (persisted, app-wide). The panel still forces
   * one column when it is too narrow for two — this is a preference, not an
   * override of what fits.
   */
  diffSideBySide: boolean;
  /**
   * How much of a changed line is picked out inside the row, and whether the
   * full-width change colour is painted (Phase 185, persisted, app-wide). Both
   * are read back from ../pierre/diff-view-prefs, which owns the keys
   * because the highlight pool needs the mode before this store exists.
   */
  diffInlineMode: LineDiffTypes;
  diffBackgrounds: boolean;

  init(): void;
  openFromRequest(req: OpenFileRequest): void;
  activate(id: string): void;
  /** Close with a Save / Don't Save / Cancel prompt when dirty. */
  closeTab(id: string): void;
  forceCloseTab(id: string): void;
  closeActive(): void;
  closeOthers(id: string): void;
  closeToRight(id: string): void;
  closeSaved(): void;
  closeAll(): void;
  /** Left/right through the strip. */
  cycleTab(delta: 1 | -1): void;
  /** ⌃Tab: through the most-recently-used order WITHOUT restamping it. */
  cycleMru(delta: 1 | -1): void;
  /** Release of the ⌃Tab modifier — the landed tab becomes most recent. */
  commitMru(): void;
  setMode(id: string, mode: EditorMode): void;
  /** Preview → permanent (first edit, double-click, or an explicit open). */
  pin(id: string): void;
  /**
   * PHASE 238. The person accepted, so this tab's shadow baseline becomes
   * `contents` and its generation moves (./baseline nextBaseline). NOTHING IS
   * WRITTEN TO DISK on this path — research 83 B.5 measured the file's md5
   * unchanged across a per-phrase accept — so this is the whole of what an
   * accept costs.
   *
   * IT PINS THE TAB, and that is a correctness step rather than a courtesy.
   * A redline opened the ordinary way, being ONE single click on an Explorer
   * row, is the PREVIEW tab, and the next single click on any other file
   * replaces that tab object and destroys the baseline with it. The Phase 238
   * measure step drove it in the running app both ways in one session: with
   * the tab unpinned an accept of 8 changes survived 0 of them, and the
   * identical click with the tab pinned survived all 8. So an accept pins
   * what it was made on, the way a first edit does.
   */
  acceptBaseline(id: string, contents: string, at: number): void;
  /**
   * MonacoHost calls this after it has revealed, selected and flashed the
   * range — a landing happens once per request, never again on the next
   * re-render or mode toggle.
   */
  clearPendingSelection(id: string): void;
  markDirty(id: string, dirty: boolean): void;
  save(): Promise<void>;
  setMinimapEnabled(on: boolean): void;
  setDiffSideBySide(on: boolean): void;
  setDiffInlineMode(mode: LineDiffTypes): void;
  setDiffBackgrounds(on: boolean): void;
  hidePanel(): void;
  /** ⌘E — show if hidden (reopening the last file if none), else hide. */
  togglePanel(): void;
  setMonacoError(message: string | null): void;

  activeTab(): EditorTab | null;
  /** PHASE 260. The current project's tabs — see `visibleTabsOf`. */
  visibleTabs(): EditorTab[];
  /**
   * PHASE 260. Show `projectId`'s tabs: its remembered active tab and panel
   * state come back from the maps, the outgoing project's are remembered, and
   * NOTHING IS DISPOSED. No-op when that project is already on screen.
   */
  switchProject(projectId: string | null): void;
  /**
   * PHASE 260. Close every tab of one project through the dirty prompt, for a
   * project being closed (research 119 §5.2). Works on a hidden project: a
   * hidden tab's close never moves the tab on screen. `onClosed` runs once
   * every tab is gone, at once when there were none, and never after a
   * Cancel or a failed save. The dirty tabs are asked about BEFORE any clean
   * tab is closed, so a Cancel keeps every tab of the project.
   */
  closeProjectTabs(projectId: string | null, onClosed?: () => void): void;
}

function readMinimapPref(): boolean {
  try {
    return localStorage.getItem(LS_MINIMAP) === '1';
  } catch {
    return false;
  }
}

/** Two columns when they fit, unless the user turned that off. */
function readDiffSideBySidePref(): boolean {
  try {
    return localStorage.getItem(LS_DIFF_SPLIT) !== '0';
  } catch {
    return true;
  }
}

/** Default view for a newly opened .md tab: the last one the user picked. */
function readMarkdownMode(): EditorMode {
  try {
    const raw = localStorage.getItem(LS_MARKDOWN_MODE);
    return MARKDOWN_MODES.includes(raw as EditorMode)
      ? (raw as EditorMode)
      : 'preview';
  } catch {
    return 'preview';
  }
}

/**
 * Rule (a) of research 19 §2.6, asked as a question about the SURFACE: can a
 * line number mean anything here?
 *
 * Diff (@pierre/diffs), rendered markdown and the image viewer are all
 * line-less — there is nowhere on any of them to put line 412 — so a request
 * that carries a selection is forced into File mode. `canDiff` is untouched,
 * so the mode chip still offers the diff one click away.
 *
 * The exception is a RASTER image: there is no text under it at all, and
 * forcing File mode would push a binary file through the text reader and
 * replace the picture with "binary file — there is no text diff to show".
 * Those keep the image viewer and ignore the selection. (An SVG is text, so
 * it lands in Source like any other file.)
 */
function landsInText(image: boolean, svg: boolean): boolean {
  return !image || svg;
}

/**
 * Rule (d): a PREVIEW open from the search results list must not steal
 * keyboard focus — the list owns ↑↓ while the user scans, and the editor is
 * previewing behind it. Every other gesture (including a pinned search open,
 * which is the user saying "I'm going there now") does focus the editor.
 */
function shouldFocusFor(req: OpenFileRequest): boolean {
  return req.source !== 'search' || req.preview === false;
}

let initialized = false;

export const useEditor = create<EditorState>((set, get) => {
  const gmux = gmuxBridge();

  const patchTab = (id: string, patch: Partial<EditorTab>): void => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t))
    }));
  };

  const tabById = (id: string): EditorTab | undefined =>
    get().tabs.find((t) => t.id === id);

  // Loading, saving and watcher-driven refresh live in ./tab-io — this store
  // is the state machine over the tab LIST; that module is the IO it
  // schedules.
  const io = createTabIo({
    patch: patchTab,
    byId: tabById,
    // Phase 73: a REVIEW tab is excluded here for the same reason a history
    // tab is. Its repository is on another computer, this Mac's watcher knows
    // nothing about it, and re-running the worktree refresh over one would
    // replace a file from that machine with whatever this Mac holds at the
    // same path.
    // Phase 160: the map tab is excluded the way a history tab is. Its body
    // is a drawing rather than a file, so there is nothing on disk for the
    // refresh to re-read, and running the worktree refresh over it would mark
    // it deleted because no file exists at its id.
    worktreeTabsIn: (repoPath) =>
      get().tabs.filter(
        (t) =>
          t.repoPath === repoPath &&
          t.commit === null &&
          t.remote === undefined &&
          t.archMap === undefined &&
          t.diagnostics === undefined &&
          // PHASE 240: a compare tab holds two versions handed in at open and
          // neither is what the file says now. Re-reading the file into it
          // would replace one of them with the live bytes and destroy the very
          // comparison the person opened it to read.
          t.compare === undefined
      )
  });

  // -- closing ---------------------------------------------------------------

  /**
   * The one dialog in gmux with three answers. A two-button destructive
   * confirm on a dirty buffer can only lose work; VS Code offers the save,
   * and `save()` already exists. Cancel abandons the whole close run.
   */
  const promptDirtyClose = (tab: EditorTab, next: () => void): void => {
    useApp.getState().setConfirm({
      title: `Save changes to '${tab.name}'?`,
      body: "Your changes will be lost if you don't save them.",
      confirmLabel: 'Save',
      onConfirm: () => {
        void io.save(tab.id).then((saved) => {
          // A failed write already raised a sticky toast; do not march on
          // through the rest of a Close All and lose the next buffer too.
          if (!saved) return;
          get().forceCloseTab(tab.id);
          next();
        });
      },
      altLabel: "Don't Save",
      onAlt: () => {
        get().forceCloseTab(tab.id);
        next();
      }
    });
  };

  /**
   * Close a run of tabs, prompting for each dirty one in turn (VS Code's
   * behavior: Cancel on any prompt stops the run and keeps the rest open).
   *
   * PHASE 260. `done` is called ONCE, when the run has closed its last tab,
   * and NEVER when the run stopped short: a Cancel on any prompt, or a save
   * that failed, leaves it uncalled. `closeProject` removes the project from
   * inside it, so a cancelled close keeps the project and its tabs — every
   * one of them, because `closeProjectTabs` hands the dirty ids in FIRST and
   * no clean tab is force-closed until every prompt has been answered.
   */
  const closeMany = (ids: string[], done?: () => void): void => {
    const rest = [...ids];
    const step = (): void => {
      for (;;) {
        const id = rest.shift();
        if (id === undefined) {
          done?.();
          return;
        }
        const tab = tabById(id);
        if (tab === undefined) continue;
        if (!tab.dirty) {
          get().forceCloseTab(id);
          continue;
        }
        promptDirtyClose(tab, step);
        return;
      }
    };
    step();
  };


  /** Last open gesture, for double-open → pin (see DOUBLE_OPEN_MS). */
  let lastOpen: { id: string; at: number } = { id: '', at: 0 };

  // -- PHASE 260: the project a tab belongs to, and the per-project memory ---

  /**
   * Research 119 §5.1's FIRST clause: the open project whose root holds the
   * file — the DEEPEST one when roots nest — or null when none does. A file
   * on a machine belongs to the project that IS that folder on that machine;
   * `fileInRepo` is never asked about a path on another computer.
   *
   * FIX ROUND. Asked of `req.path` and NEVER of `req.repoPath`. A terminal
   * link is emitted as `openFileAt(path, repoPath = the PANE's project)`
   * (../context/open-detail.ts), so `repoPath` is where the person IS and
   * says nothing about where the file is; admitting the project at
   * `req.repoPath` made the pane's project hold every request, the two roots
   * tied on length, and a file in bravo pressed in alpha's terminal opened
   * under alpha (`probe:p260` arm E, 4 findings at 8e5a5f43). A map or report
   * tab's path IS a root, which the equality covers. Nesting is the only way
   * two roots hold one file and nested roots never tie, so the deepest wins
   * without a tie-break.
   */
  const projectHolding = (req: OpenFileRequest): string | null => {
    const app = useApp.getState();
    const remote = req.remote;
    const holding = app.projects.filter((p) => {
      const target = targetOfProject(p);
      if (remote !== undefined) {
        return sameTarget(target, {
          machineId: remote.machineId,
          path: remote.repoPath
        });
      }
      return (
        isLocalTarget(target) &&
        (p.path === req.path || fileInRepo(p.path, req.path))
      );
    });
    const deepest = holding.sort((a, b) => b.path.length - a.path.length)[0];
    return deepest?.id ?? null;
  };

  /** Research 119 §5.1 whole: the holding project, else the active one. */
  const projectOf = (req: OpenFileRequest): string | null =>
    projectHolding(req) ?? useApp.getState().activeProjectId;

  /** The tab on screen and the panel state FOR one project, current or not. */
  const activeOf = (s: EditorState, projectId: string | null): string | null =>
    projectId === s.projectId
      ? s.activeId
      : (s.activeIdByProject[keyOf(projectId)] ?? null);
  const panelOf = (s: EditorState, projectId: string | null): boolean =>
    projectId === s.projectId
      ? s.panelOpen
      : (s.panelOpenByProject[keyOf(projectId)] ?? false);

  /**
   * EVERY write of a project's active tab and panel state goes through here,
   * so the maps and the mirrors can never disagree: the map entry is written
   * always, the mirror only when the project is the one on screen.
   */
  const focusPatch = (
    s: EditorState,
    projectId: string | null,
    activeId: string | null,
    panelOpen: boolean
  ): Partial<EditorState> => {
    const key = keyOf(projectId);
    const patch: Partial<EditorState> = {
      activeIdByProject: { ...s.activeIdByProject, [key]: activeId },
      panelOpenByProject: { ...s.panelOpenByProject, [key]: panelOpen }
    };
    if (projectId === s.projectId) {
      patch.activeId = activeId;
      patch.panelOpen = panelOpen;
    }
    return patch;
  };

  /**
   * A tab of another project is being opened or raised: the person clicked a
   * file, so they get to see it. The app store moves first, which reaches
   * `switchProject` through init's subscription; the direct call after it is
   * for the unsubscribed case and is a no-op otherwise.
   */
  const revealProject = (projectId: string | null): void => {
    if (projectId === get().projectId) return;
    if (projectId !== null && useApp.getState().activeProjectId !== projectId) {
      useApp.getState().setActiveProject(projectId);
    }
    get().switchProject(projectId);
  };

  /**
   * FIX ROUND (verifier item 3). Move ONE tab to another project's strip,
   * disposing nothing: the model, the view state and the journal are keyed by
   * the tab id, which does not change. If the tab was the project it leaves
   * remembered as its active one, that project remembers its next most recent
   * tab instead, or nothing, and its panel closes when nothing is left — the
   * same answer `forceCloseTab` gives, without the close.
   */
  const rehome = (id: string, to: string | null): void => {
    set((s) => {
      const tab = s.tabs.find((t) => t.id === id);
      if (tab === undefined) return {};
      const from = tab.projectId ?? null;
      if (from === to) return {};
      const tabs = s.tabs.map((t) =>
        t.id === id ? { ...t, projectId: to } : t
      );
      if (activeOf(s, from) !== id) return { tabs };
      const left = visibleTabsOf(tabs, from);
      const next =
        [...left].sort((a, b) => b.lastUsed - a.lastUsed)[0]?.id ?? null;
      return {
        tabs,
        ...focusPatch(s, from, next, left.length > 0 ? panelOf(s, from) : false)
      };
    });
  };

  return {
    tabs: [],
    activeId: null,
    panelOpen: false,
    projectId: null,
    activeIdByProject: {},
    panelOpenByProject: {},
    lastRequest: null,
    lastRequestProjectId: null,
    monacoError: null,
    minimapEnabled: readMinimapPref(),
    diffSideBySide: readDiffSideBySidePref(),
    diffInlineMode: readInlineDiffMode(),
    diffBackgrounds: readDiffBackgrounds(),

    init() {
      if (initialized || !gmux) return;
      initialized = true;
      // PHASE 260. The editor follows the active project from here on. The
      // app store is the one writer of `activeProjectId` and it has several
      // setters, so the editor listens to the VALUE rather than to any of
      // them; `switchProject` is idempotent, so a caller that also calls it
      // costs nothing.
      get().switchProject(useApp.getState().activeProjectId);
      useApp.subscribe((s, prev) => {
        if (s.activeProjectId !== prev.activeProjectId) {
          get().switchProject(s.activeProjectId);
        }
      });
      onOpenFile((req) => get().openFromRequest(req));
      // Shared debounce (state/repo-changed.ts): the editor's own 300 ms
      // window made open tabs the LAST surface to agree with the repo.
      onRepoChanged((repoPath) => {
        if (!get().tabs.some((t) => t.repoPath === repoPath)) return;
        void io.refreshRepo(repoPath);
      });
    },

    openFromRequest(req) {
      set({ lastRequest: req });
      // Phase 73. A review tab's identity carries the MACHINE as well as the
      // path, so the same path on two machines is two tabs and neither
      // collides with a file of that path on this Mac. That last collision is
      // not hypothetical: in the phase's own probes the far side IS this Mac,
      // so `/tmp/scratch/a.ts` names a real file here as well as there.
      //
      // The rule WAS written here rather than in ./tab-identity.ts because that
      // file belonged to no builder in Phase 73 and three builders were writing
      // this tree at once. PHASE 102 MOVED IT, because a rename on a machine is
      // a second caller that has to compose the same string, and a tab rekeyed
      // to a bare absolute path would collide with a local tab at that path.
      //
      // PHASE 90.3 ADDED THE REPOSITORY PATH. The key was
      // `machine:<machineId>:<relPath>`, which is the collision research 55
      // section 9.2 found: two folders on ONE machine that both hold `src/a.ts`
      // opened into one tab, and the second read replaced the first file's
      // bytes under the first file's tab. A folder on a machine is a project
      // tab from this phase, so two such folders on one machine is the ordinary
      // case rather than a corner of it.
      const id =
        req.remote === undefined
          ? tabIdFor(req)
          : req.commit !== undefined
            ? // PHASE 233. One file of one commit on a machine is its own tab,
              // beside the review tab of the same file.
              remoteCommitTabId(
                req.remote.machineId,
                req.remote.repoPath,
                req.commit.sha,
                req.relPath
              )
            : remoteTabId(req.remote.machineId, req.remote.repoPath, req.relPath);
      const now = Date.now();
      const redoubled = lastOpen.id === id && now - lastOpen.at < DOUBLE_OPEN_MS;
      lastOpen = { id, at: now };

      const selection = req.selection ?? null;

      const existing = tabById(id);
      if (existing !== undefined) {
        // FIX ROUND (verifier item 3). A file opened while its folder was not
        // a project belongs to the project it was opened FROM (§5.1's second
        // clause). When that folder later becomes a project and the file is
        // opened from it, the tab moves there rather than dragging the app
        // back to the project it happened to be opened from. Only a ROOT that
        // holds the file moves a tab; the fallback clause never does.
        const home = projectHolding(req);
        const willPin = req.preview === false || redoubled;
        if (home !== null && home !== (existing.projectId ?? null)) {
          // COMMITTER'S ROUND. A strip holds ONE preview slot (the S5 rule at
          // the top of this file), and a preview tab arriving from another
          // strip would make two. The arriving tab is the click, so the
          // destination's own clean preview is closed exactly as a preview
          // open of a new file closes it below — unless the arriving tab is
          // being pinned, which consumes no slot. The ARRIVING tab is never
          // disposed: it is the person's file, journal and all.
          if (existing.preview && !willPin) {
            const slot = visibleTabsOf(get().tabs, home).find(
              (t) => t.preview && !t.dirty && t.id !== id
            );
            if (slot !== undefined) get().forceCloseTab(slot.id);
          }
          rehome(id, home);
        }
        set({ lastRequestProjectId: home ?? existing.projectId ?? null });
        // PHASE 240. Compare is keyed by the file, so a second press lands
        // here. Its sides are the two versions AT THAT MOMENT, so they are
        // replaced rather than left: raising a tab holding a comparison from
        // two saves ago would be the stale answer this phase exists to stop.
        if (req.compare !== undefined) {
          patchTab(id, {
            headContents: req.compare.left,
            savedContents: req.compare.right
          });
        }
        get().activate(id);
        if (willPin) get().pin(id);
        // Rule (b). This path used to only raise the tab, which is exactly
        // right for a tree click and exactly wrong for a search hit: the
        // second match in a file the first match opened would silently do
        // nothing at all. Hand the landing to MonacoHost, and switch a
        // line-less surface (a diff, a rendered .md) back to File first —
        // otherwise the tab shows a view with no line 412 on it and the
        // pending selection has no consumer.
        if (selection !== null && landsInText(existing.image, existing.svg)) {
          patchTab(id, {
            pendingSelection: selection,
            pendingFocus: shouldFocusFor(req),
            ...(existing.mode === 'file' ? {} : { mode: 'file' as EditorMode })
          });
        }
        return;
      }

      // `preview: false` = "open this for keeps" (double-click / ↩), so it
      // must not consume the preview slot the next single click wants.
      const keep = req.preview === false;
      const markdown = isMarkdownPath(req.path);
      const commit = req.commit ?? null;
      // Phase 26 item 1. A file OUTSIDE this project's repository has no HEAD
      // version, so the diff path does not exist for it: it opens plain, no
      // diff is offered, and no git call is ever made for it. Decided HERE,
      // where the tab is created, so no reader downstream has to catch git
      // refusing an absolute path — the operator saw that refusal raw when a
      // context detail tab opened a global skill (`~/.claude/skills/…`).
      // History tabs are untouched: their content comes from this repo's own
      // history, so their paths are repo-relative by construction.
      const wantsDiff = req.mode === 'diff' && fileInRepo(req.repoPath, req.path);
      // An image gets the image viewer — but a RASTER one opened from a
      // commit does not: `fs:readImage` reads the working tree and HEAD, and
      // rendering that pair under a `<sha>` tab would show the user a
      // comparison they did not ask for. Those keep the existing honest
      // state ("binary file — there is no text diff to show") until an
      // arbitrary-revision image read exists.
      const svg = isSvgPath(req.path);
      // Phase 73: a raster image on another machine is excluded for the same
      // reason a raster image in a commit is. `fs:readImage` reads this Mac's
      // working tree and its HEAD, so pointing it at a review tab would draw a
      // comparison of two files nobody asked about.
      const image =
        isImagePath(req.path) &&
        (svg || (commit === null && req.remote === undefined));
      // Phase 20.5. The predicate is shared with main's preview handler, so
      // "this tab offers Preview" and "the handler will serve it" are one
      // answer. An HTML tab still opens in Source: see the flag's comment.
      const html = canPreviewPath(req.path);
      const origRelPath = leftPathFor(req);
      // Rule (a): a navigation lands in File mode, whatever the request or
      // the file extension would otherwise have chosen.
      const navigate = selection !== null && landsInText(image, svg);
      // PHASE 260. Decided here by research 119 §5.1. Moved after only by
      // `rehome` above, when the file's own folder becomes a project, and by
      // `switchProject`, when a tab of no project meets the first project.
      const projectId = projectOf(req);
      const tab: EditorTab = {
        id,
        path: req.path,
        relPath: req.relPath,
        origRelPath,
        repoPath: req.repoPath,
        projectId,
        // Phase 160. The map tab's `path` is a repository root, and the last
        // segment of a repository root is a folder name wearing a file's
        // clothes. The tab says what it is instead.
        name:
          req.archMap !== undefined
            ? ARCH_MAP_TAB_NAME
            : // Phase 163. The report tab's path is a project root too.
              req.diagnostics !== undefined
              ? DIAGNOSTICS_TAB_NAME
              : // PHASE 240. A compare tab sits beside the tab of the file it
                // compares, and two tabs reading `notes.md` would be a puzzle,
                // so it names both sides instead.
                req.compare !== undefined
                ? compareTabName(baseName(req.path))
                : baseName(req.path),
        // A .md file with tracked changes still opens as a diff — that is
        // the P4 gesture, and it is why the file was clicked. Everything
        // else markdown opens rendered. A history open is ALWAYS a diff:
        // clicking a file in a commit means "what did this commit do to it".
        mode: navigate
          ? 'file'
          : // PHASE 240. A comparison has exactly one reading and it is the
            // diff, whatever the file's extension would otherwise choose.
            req.compare !== undefined ||
              wantsDiff ||
              commit !== null ||
              req.remote !== undefined
            ? 'diff'
            : markdown
              ? readMarkdownMode()
              : // An SVG opens rendered, like a .md — it is a picture first
                // and markup second. A raster image has no second view.
                svg
                ? 'preview'
                : image
                  ? 'image'
                  : 'file',
        canDiff:
          req.compare !== undefined ||
          wantsDiff ||
          commit !== null ||
          req.remote !== undefined,
        markdown,
        image,
        svg,
        html,
        imageData: null,
        imageHead: null,
        imageRevision: 0,
        preview: !keep,
        commit,
        // Phase 73. Present only for a review of a file on another machine.
        // Every reader treats it the way it treats `commit`: read only, no
        // save, no watcher refresh, no read of a working tree on this Mac.
        ...(req.remote !== undefined ? { remote: req.remote } : {}),
        // Phase 160. Present only for the architecture map tab. Every reader
        // treats it the way it treats `commit`: no save, no dirty state, no
        // watcher refresh, and the panel draws the map instead of a file.
        ...(req.archMap !== undefined ? { archMap: req.archMap } : {}),
        // Phase 163. Present only for the diagnostics report tab, read by every
        // seam the way `archMap` is: no save, no dirty state, no watcher
        // refresh, and the panel draws the report instead of a file.
        ...(req.diagnostics !== undefined
          ? { diagnostics: req.diagnostics }
          : {}),
        // PHASE 240. Present only for a comparison of two strings. Read by
        // every seam the way `commit` is: read-only, never dirty, save
        // refused, no watcher refresh, no HEAD read.
        ...(req.compare !== undefined
          ? { compare: { fileName: baseName(req.path) } }
          : {}),
        pendingSelection: navigate ? selection : null,
        // Only ever false while there is a selection waiting to be consumed,
        // so a tab can never get stuck refusing focus: the landing resets it.
        pendingFocus: navigate ? shouldFocusFor(req) : true,
        dirty: false,
        deleted: false,
        truncated: false,
        // Phase 160. The map tab has nothing to load through this store: its
        // model lives in main's fact base and the map body fetches it itself.
        // Every other tab starts loading until its reader lands.
        loading:
          req.archMap === undefined &&
          req.diagnostics === undefined &&
          // PHASE 240: both sides arrived with the request, so nothing loads.
          req.compare === undefined,
        error: null,
        // PHASE 240. A comparison's two sides arrive with the request and are
        // moved by nothing after: LEFT is what the file said on disk, RIGHT is
        // the buffer the refused save would have written.
        savedContents: req.compare?.right ?? '',
        headContents: req.compare?.left ?? null,
        // PHASE 225. Nothing read and nothing heard from git yet; the first
        // successful read seeds it (./tab-io loadContents).
        baseline: NO_BASELINE,
        lastUsed: now,
        contextEntry: req.contextEntry ?? null,
        // PHASE 63. Non-null makes this a DRAFT: no disk read, dirty from the
        // moment it appears, and the model seeded from these bytes rather than
        // from `savedContents`, which stays empty because nothing is saved.
        draft: req.draft ?? null
      };

      // PHASE 260. A file of another project is shown in that project, before
      // the tab lands, so the set below writes the mirrors of the project it
      // belongs to.
      revealProject(projectId);

      set((s) => {
        let tabs = [...s.tabs];
        // PHASE 260. The preview slot is PER PROJECT: a hidden project's
        // preview tab is never the one a click in this project replaces,
        // because replacing it disposes its model, view state and journal —
        // the exact loss hiding exists to prevent (research 119 §2).
        const own = visibleTabsOf(tabs, projectId);
        const slot = keep
          ? undefined
          : own.find((t) => t.preview && !t.dirty);
        if (slot !== undefined) {
          // Reuse the single preview tab (VS Code behavior).
          disposeModels(slot.id);
          dropViewState(slot.id);
          forgetRewindJournal(slot.id);
          tabs = tabs.map((t) => (t.id === slot.id ? tab : t));
        } else {
          tabs.push(tab);
          // LRU-evict the stalest clean tab past the cap — never the new
          // one, never the one on screen, never unsaved work.
          //
          // PHASE 260. The cap is PER PROJECT and the candidates are THIS
          // project's tabs only. Research 119 §3: a hidden project's tabs are
          // by construction the stalest, so a global cap would evict exactly
          // the state the person believes is merely hidden, rewind journals
          // and all, the moment this project opened its eleventh file.
          if (own.length + 1 > MAX_TABS) {
            const evict = own
              .filter(
                (t) =>
                  !t.dirty && t.id !== tab.id && t.id !== activeOf(s, projectId)
              )
              .sort((a, b) => a.lastUsed - b.lastUsed)[0];
            if (evict !== undefined) {
              disposeModels(evict.id);
              dropViewState(evict.id);
              forgetRewindJournal(evict.id);
              tabs = tabs.filter((t) => t.id !== evict.id);
            }
          }
        }
        return {
          tabs,
          lastRequestProjectId: projectId,
          ...focusPatch(s, projectId, tab.id, true)
        };
      });

      if (
        req.archMap !== undefined ||
        req.diagnostics !== undefined ||
        // PHASE 240. NOTHING RUNS for a comparison either. Both sides came
        // with the request; a read here would replace one of them with what
        // the file says now, which is not what the person pressed Compare to
        // see.
        req.compare !== undefined
      ) {
        // Phase 160. NOTHING RUNS. The map tab reads no file, so every loader
        // below would land an error on a tab whose id names no file. The map
        // body asks main for the model itself, over the arch bridge, which is
        // what makes closing the tab free and reopening a redraw.
        // Phase 163. The diagnostics report tab is the same shape: its body
        // asks main for one capture when it mounts, and nothing runs here.
      } else if (req.draft !== undefined) {
        // PHASE 63. A DRAFT reads nothing. There may be no file at this path
        // at all, and asking for one would land an error on a tab whose whole
        // purpose is to hold text that has never been saved. `loading` goes
        // false here because the content already arrived with the request, and
        // `dirty` goes true because it has: closing the tab prompts to save,
        // which is what makes "Tortie wrote nothing" survivable.
        patchTab(id, { loading: false, dirty: true, savedContents: '' });
      } else if (req.remote !== undefined && commit !== null) {
        // PHASE 233. One file of one commit on a machine. One call to main
        // fills BOTH sides out of that machine's object database, never its
        // working tree and never this Mac's git.
        void io.loadRemoteCommitDiff(id, req.remote, commit);
      } else if (req.remote !== undefined) {
        // Phase 73. One call to main fills BOTH sides, from the machine. The
        // worktree loaders are deliberately not run: this file is not on this
        // Mac, and reading a file of the same name here would show a person a
        // diff of the wrong two things.
        void io.loadRemoteDiff(id, req.remote);
      } else if (commit !== null) {
        // One call fills BOTH sides. The worktree loaders are deliberately
        // not run: reading the live file here is exactly the bug item 4 is.
        void io.loadCommitDiff(id, commit);
      } else if (image && !svg) {
        // Never fs:readFile — that reader refuses binary content, which is
        // the whole reason images could not open before Phase 12.10.
        void io.loadImage(id, req.path);
        if (wantsDiff) void io.loadImageHead(id);
      } else {
        void io.loadContents(id, req.path);
        if (wantsDiff) void io.loadHead(id);
      }
    },

    activate(id) {
      const tab = tabById(id);
      if (tab === undefined) return;
      // PHASE 260. Raising a hidden project's tab shows that project first.
      const projectId = tab.projectId ?? null;
      revealProject(projectId);
      patchTab(id, { lastUsed: Date.now() });
      set((s) => focusPatch(s, projectId, id, true));
    },

    closeTab(id) {
      const tab = tabById(id);
      if (tab === undefined) return;
      if (tab.dirty) {
        promptDirtyClose(tab, () => undefined);
        return;
      }
      get().forceCloseTab(id);
    },

    forceCloseTab(id) {
      disposeModels(id);
      dropViewState(id);
      // PHASE 244, audit finding F1. A tab id is its absolute path, so without
      // this the next opening of the same file inherits this one's undo stack
      // and one press writes its bytes back. The journal's owner is the tab.
      forgetRewindJournal(id);
      set((s) => {
        const closing = s.tabs.find((t) => t.id === id);
        if (closing === undefined) return {};
        // PHASE 260. The next tab, and whether the panel stays, are questions
        // about the closed tab's OWN project's strip, on screen or not: a
        // hidden project's tab closing (closeProjectTabs) moves that project's
        // remembered active tab and never the one the person is looking at.
        const projectId = closing.projectId ?? null;
        const before = visibleTabsOf(s.tabs, projectId);
        const idx = before.findIndex((t) => t.id === id);
        const tabs = s.tabs.filter((t) => t.id !== id);
        const after = visibleTabsOf(tabs, projectId);
        let activeId = activeOf(s, projectId);
        if (activeId === id) {
          const next = after[Math.min(idx, after.length - 1)];
          activeId = next?.id ?? null;
        }
        return {
          tabs,
          ...focusPatch(
            s,
            projectId,
            activeId,
            after.length === 0 ? false : panelOf(s, projectId)
          )
        };
      });
    },

    closeActive() {
      const id = get().activeId;
      if (id !== null) get().closeTab(id);
    },

    // PHASE 260. Every close run and every cycle below reads the VISIBLE set,
    // research 119 §4: Close Others, Close All and ⌃Tab are gestures on the
    // strip the person can see, and a hidden project's tabs are not on it.

    closeOthers(id) {
      closeMany(
        get()
          .visibleTabs()
          .filter((t) => t.id !== id)
          .map((t) => t.id)
      );
    },

    closeToRight(id) {
      const tabs = get().visibleTabs();
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      closeMany(tabs.slice(idx + 1).map((t) => t.id));
    },

    closeSaved() {
      closeMany(
        get()
          .visibleTabs()
          .filter((t) => !t.dirty)
          .map((t) => t.id)
      );
    },

    closeAll() {
      closeMany(get().visibleTabs().map((t) => t.id));
    },

    closeProjectTabs(projectId, onClosed) {
      // FIX ROUND (verifier item 2). The DIRTY tabs go first. `closeMany`
      // force-closes each clean tab it meets until it reaches a dirty one, so
      // handed the strip in drawn order it had destroyed every clean tab ahead
      // of the first dirty one — model, view state, journal — before the
      // prompt was on screen, and a Cancel then "kept the project" without
      // them. Asked first, a Cancel at any prompt leaves every clean tab and
      // every unanswered dirty one exactly as they were; only what the person
      // answered Save or Don't Save to is gone.
      const own = visibleTabsOf(get().tabs, projectId);
      closeMany(
        [...own.filter((t) => t.dirty), ...own.filter((t) => !t.dirty)].map(
          (t) => t.id
        ),
        onClosed
      );
    },

    cycleTab(delta) {
      const { activeId } = get();
      const tabs = get().visibleTabs();
      if (tabs.length < 2) return;
      const idx = tabs.findIndex((t) => t.id === activeId);
      const next = tabs[(idx + delta + tabs.length) % tabs.length];
      if (next !== undefined) get().activate(next.id);
    },

    cycleMru(delta) {
      const { activeId } = get();
      const tabs = get().visibleTabs();
      if (tabs.length < 2) return;
      const order = [...tabs].sort((a, b) => b.lastUsed - a.lastUsed);
      const idx = order.findIndex((t) => t.id === activeId);
      const next = order[(idx + delta + order.length) % order.length];
      // No lastUsed stamp: holding ⌃ and tabbing again must keep walking
      // back through history, not ping-pong between two tabs.
      if (next !== undefined) {
        set((s) => focusPatch(s, s.projectId, next.id, true));
      }
    },

    commitMru() {
      const id = get().activeId;
      if (id !== null && tabById(id) !== undefined) {
        patchTab(id, { lastUsed: Date.now() });
      }
    },

    setMode(id, mode) {
      const tab = tabById(id);
      if (tab === undefined || tab.mode === mode) return;
      // PHASE 240. A comparison has one reading. There is no file under it to
      // edit, no HEAD version to fetch and no baseline to redline, so every
      // other mode would draw one of the two dead sides as if it were live.
      // The mode chip offers nothing on such a tab; this refuses it anyway,
      // the way the rule below refuses a mode no control offers.
      if (tab.compare !== undefined) return;
      // Phase 26 item 1, second half: the rule decided at creation holds for
      // the tab's whole life. A worktree tab outside the repository can never
      // enter diff mode, whoever asks — such a tab never has `canDiff`, so no
      // control offers this, but the state machine refuses it anyway.
      // Phase 194: the redline reads the same two sides the diff does, so it
      // is refused where the diff is refused and loads HEAD where the diff
      // loads HEAD.
      const wantsHead = mode === 'diff' || mode === 'redline';
      if (
        wantsHead &&
        tab.commit === null &&
        tab.remote === undefined &&
        !fileInRepo(tab.repoPath, tab.path)
      ) {
        return;
      }
      patchTab(id, { mode });
      // A history tab's LEFT side only ever comes from its commit — never
      // fall back to HEAD for it. Phase 73: a review tab's LEFT side only ever
      // comes from the machine, for the stronger version of the same reason.
      // `git.showHead` runs on THIS Mac, so asking it for a path on another
      // computer answers about a different file or refuses.
      if (wantsHead && tab.commit === null && tab.remote === undefined) {
        if (tab.image && !tab.svg) {
          if (tab.imageHead === null) void io.loadImageHead(id);
        } else if (tab.headContents === null) {
          void io.loadHead(id);
        }
      }
      // Only a mode every .md tab can open in is remembered as the default
      // for the next one: `diff` and `redline` need a HEAD version, and
      // `readMarkdownMode` refuses anything outside MARKDOWN_MODES anyway.
      if (tab.markdown && MARKDOWN_MODES.includes(mode)) {
        try {
          localStorage.setItem(LS_MARKDOWN_MODE, mode);
        } catch {
          /* cosmetic preference only */
        }
      }
    },

    pin(id) {
      const tab = tabById(id);
      if (tab !== undefined && tab.preview) patchTab(id, { preview: false });
    },

    acceptBaseline(id, contents, at) {
      const tab = tabById(id);
      if (tab === undefined) return;
      // The pin FIRST, so a tab that is replaced between these two lines is
      // not one this store ever recorded an accept on.
      get().pin(id);
      patchTab(id, {
        baseline: nextBaseline(tab.baseline, { kind: 'accept', contents, at })
      });
      // PHASE 243. An accept is the gesture the durable store exists for: it
      // is the one a person makes deliberately, and Phase 238 measured that
      // what they accepted died with the tab. It is recorded through the same
      // one path every other baseline move takes, and the write is never
      // awaited here — an accept redraws now and the receipt lands when it
      // lands.
      void io.persistBaseline(id);
    },

    clearPendingSelection(id) {
      const tab = tabById(id);
      if (tab === undefined || tab.pendingSelection === null) return;
      // `pendingFocus` returns to its default with it: the flag describes one
      // gesture, and the next tab activation must be free to focus normally.
      patchTab(id, { pendingSelection: null, pendingFocus: true });
    },

    markDirty(id, dirty) {
      const tab = tabById(id);
      if (tab === undefined || tab.dirty === dirty) return;
      // Monaco is read-only on a history tab, so this should never fire —
      // but a dirty commit tab would prompt to save an old revision over the
      // live file on close, which is not a risk worth leaving open.
      // Phase 73 widened this by one condition. A review tab is immutable for
      // a stronger reason than a history tab: the file it shows is not on this
      // Mac at all, so a save would write over whatever this Mac holds at that
      // path, which is somebody else's file or nothing.
      // Phase 160: the map tab has no text under it at all, so nothing can
      // legitimately mark it dirty, and a dirty map tab would prompt to save
      // a drawing over a repository root on close.
      // Phase 163: the report tab has no text under it either.
      // Phase 240: a compare tab holds two versions of a file and neither is
      // what the file says now, so a dirty one would prompt on close to save a
      // dead version over a live file.
      if (
        tab.commit !== null ||
        tab.remote !== undefined ||
        tab.archMap !== undefined ||
        tab.diagnostics !== undefined ||
        tab.compare !== undefined
      ) {
        return;
      }
      const patch: Partial<EditorTab> = { dirty };
      if (dirty && tab.preview) patch.preview = false; // edited → permanent
      patchTab(id, patch);
    },

    async save() {
      const id = get().activeId;
      if (id !== null) await io.save(id);
    },

    setMinimapEnabled(on) {
      set({ minimapEnabled: on });
      try {
        localStorage.setItem(LS_MINIMAP, on ? '1' : '0');
      } catch {
        /* cosmetic preference only */
      }
    },

    setDiffSideBySide(on) {
      set({ diffSideBySide: on });
      try {
        localStorage.setItem(LS_DIFF_SPLIT, on ? '1' : '0');
      } catch {
        /* cosmetic preference only */
      }
    },

    setDiffInlineMode(mode) {
      set({ diffInlineMode: mode });
      writeInlineDiffMode(mode);
    },

    setDiffBackgrounds(on) {
      set({ diffBackgrounds: on });
      writeDiffBackgrounds(on);
    },

    hidePanel() {
      set((s) => focusPatch(s, s.projectId, s.activeId, false));
    },

    togglePanel() {
      const s = get();
      if (s.panelOpen) {
        set((cur) => focusPatch(cur, cur.projectId, cur.activeId, false));
        return;
      }
      if (s.visibleTabs().length > 0) {
        set((cur) => focusPatch(cur, cur.projectId, cur.activeId, true));
      } else if (
        s.lastRequest !== null &&
        // PHASE 260. ⌘E in a project with no tabs reopens the last file OF
        // THIS PROJECT, never another project's, which would switch projects
        // under a gesture that only asked for the panel. The question is
        // which project the request LANDED in, recorded when it did; see
        // `lastRequestProjectId` for why the record is asked.
        s.lastRequestProjectId === s.projectId &&
        // AND where it would land NOW. The two disagree when a folder BECAME
        // a project after the open: the record says alpha, `projectOf` says
        // delta, and `openFromRequest` would reveal delta under a gesture that
        // only asked for alpha's panel. The record alone shipped that
        // regression at d15cd0c7; the re-ask alone shipped the CLAUDE.md one
        // at 721b35c6. Both clauses are needed, and the independent
        // re-verifier's RV4 case below pins the second.
        projectOf(s.lastRequest) === s.projectId
      ) {
        s.openFromRequest(s.lastRequest);
      }
    },

    setMonacoError(message) {
      set({ monacoError: message });
    },

    activeTab() {
      const s = get();
      return s.tabs.find((t) => t.id === s.activeId) ?? null;
    },

    visibleTabs() {
      const s = get();
      return visibleTabsOf(s.tabs, s.projectId);
    },

    switchProject(projectId) {
      const s = get();
      if (projectId === s.projectId) return;
      // FIX ROUND (verifier item 4). A tab opened while NO project was active
      // (the diagnostics tab at zero projects) has no strip a person can reach
      // once a project is active: ⌃Tab and the strip read the visible set, and
      // raising it by any other path put the editor on the null strip while
      // the app stayed on the project. So the null strip's tabs JOIN the first
      // project that becomes active, and the null strip is left empty. Nothing
      // is disposed: the tab id, and everything keyed by it, is unchanged.
      const adopt = s.projectId === null && projectId !== null;
      const adopted = adopt
        ? s.tabs.filter((t) => (t.projectId ?? null) === null)
        : [];
      const tabs =
        adopted.length > 0
          ? s.tabs.map((t) =>
              (t.projectId ?? null) === null ? { ...t, projectId } : t
            )
          : s.tabs;
      // The outgoing project's mirrors go into the maps first, so what a
      // switch back finds is what was on screen at the moment of leaving.
      const activeIdByProject = {
        ...s.activeIdByProject,
        [keyOf(s.projectId)]: adopt ? null : s.activeId
      };
      const panelOpenByProject = {
        ...s.panelOpenByProject,
        [keyOf(s.projectId)]: adopt ? false : s.panelOpen
      };
      const visible = visibleTabsOf(tabs, projectId);
      const key = keyOf(projectId);
      // An adopted strip arrives as it was on screen: its tab and its panel
      // state, not the project's remembered ones from before it was left.
      let activeId =
        (adopted.length > 0 ? s.activeId : null) ??
        activeIdByProject[key] ??
        null;
      if (activeId !== null && !visible.some((t) => t.id === activeId)) {
        activeId = null;
      }
      if (activeId === null && visible.length > 0) {
        activeId =
          [...visible].sort((a, b) => b.lastUsed - a.lastUsed)[0]?.id ?? null;
      }
      // Research 119 §5.3: a project with no tabs shows no editor; one with
      // tabs comes back as it was left, and a project never left is open.
      const panelOpen =
        visible.length > 0 &&
        (adopted.length > 0 ? s.panelOpen : (panelOpenByProject[key] ?? true));
      activeIdByProject[key] = activeId;
      panelOpenByProject[key] = panelOpen;
      // NOTHING IS DISPOSED HERE. Not a model, not a view state, not a
      // journal: the hidden project's tabs stay in `tabs` exactly as they are.
      set({
        tabs,
        projectId,
        activeId,
        panelOpen,
        activeIdByProject,
        panelOpenByProject,
        // The null strip's last request joins the project with its tabs.
        ...(adopt && s.lastRequestProjectId === null
          ? { lastRequestProjectId: projectId }
          : {})
      });
    }
  };
});

/**
 * PHASE 260. The strip's own read of the current project's tabs. Shallow
 * compared element by element, so a `patchTab` on a HIDDEN tab (a load
 * landing, a watcher tick) produces the same visible array and redraws
 * nothing on screen, while a patch to a visible tab still does.
 */
export function useVisibleTabs(): EditorTab[] {
  return useEditor(useShallow((s) => visibleTabsOf(s.tabs, s.projectId)));
}
