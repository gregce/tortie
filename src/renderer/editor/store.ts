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
 */

import { create } from 'zustand';
import { isImagePath, isSvgPath } from '@shared/image-types';
import { useApp } from '../state/store';
import { onOpenFile } from '../state/open-file';
import { onRepoChanged } from '../state/repo-changed';
import type { OpenFileRequest } from '../state/open-file';
import { disposeModels, dropViewState } from './monaco-loader';
import type { EditorMode, EditorTab } from './tab-types';
import {
  ARCH_MAP_TAB_NAME,
  DIAGNOSTICS_TAB_NAME,
  fileInRepo,
  leftPathFor,
  remoteTabId,
  tabIdFor
} from './tab-identity';
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
  readDiffRedline,
  readInlineDiffMode,
  writeDiffBackgrounds,
  writeDiffRedline,
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

interface EditorState {
  tabs: EditorTab[];
  activeId: string | null;
  /** Panel visible (tabs survive a hidden panel; ⌘E/Esc toggle). */
  panelOpen: boolean;
  /** Last open request — ⌘E reopens it when every tab was closed. */
  lastRequest: OpenFileRequest | null;
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
  /**
   * The redline (Phase 191, persisted, app-wide, off by default). A THIRD
   * reading of a change, drawn as one flowing marked-up line underneath the
   * two rows Pierre already draws, in the stacked layout and over prose only.
   * It is a mode a person chooses rather than a replacement for what the diff
   * view does today, so it lives here beside the other two drawing answers.
   */
  diffRedline: boolean;

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
  setDiffRedline(on: boolean): void;
  hidePanel(): void;
  /** ⌘E — show if hidden (reopening the last file if none), else hide. */
  togglePanel(): void;
  setMonacoError(message: string | null): void;

  activeTab(): EditorTab | null;
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
          t.diagnostics === undefined
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
   */
  const closeMany = (ids: string[]): void => {
    const rest = [...ids];
    const step = (): void => {
      for (;;) {
        const id = rest.shift();
        if (id === undefined) return;
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

  return {
    tabs: [],
    activeId: null,
    panelOpen: false,
    lastRequest: null,
    monacoError: null,
    minimapEnabled: readMinimapPref(),
    diffSideBySide: readDiffSideBySidePref(),
    diffInlineMode: readInlineDiffMode(),
    diffBackgrounds: readDiffBackgrounds(),
    diffRedline: readDiffRedline(),

    init() {
      if (initialized || !gmux) return;
      initialized = true;
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
          : remoteTabId(req.remote.machineId, req.remote.repoPath, req.relPath);
      const now = Date.now();
      const redoubled = lastOpen.id === id && now - lastOpen.at < DOUBLE_OPEN_MS;
      lastOpen = { id, at: now };

      const selection = req.selection ?? null;

      const existing = tabById(id);
      if (existing !== undefined) {
        get().activate(id);
        if (req.preview === false || redoubled) get().pin(id);
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
      const tab: EditorTab = {
        id,
        path: req.path,
        relPath: req.relPath,
        origRelPath,
        repoPath: req.repoPath,
        // Phase 160. The map tab's `path` is a repository root, and the last
        // segment of a repository root is a folder name wearing a file's
        // clothes. The tab says what it is instead.
        name:
          req.archMap !== undefined
            ? ARCH_MAP_TAB_NAME
            : // Phase 163. The report tab's path is a project root too.
              req.diagnostics !== undefined
              ? DIAGNOSTICS_TAB_NAME
              : baseName(req.path),
        // A .md file with tracked changes still opens as a diff — that is
        // the P4 gesture, and it is why the file was clicked. Everything
        // else markdown opens rendered. A history open is ALWAYS a diff:
        // clicking a file in a commit means "what did this commit do to it".
        mode: navigate
          ? 'file'
          : wantsDiff || commit !== null || req.remote !== undefined
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
        canDiff: wantsDiff || commit !== null || req.remote !== undefined,
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
        loading: req.archMap === undefined && req.diagnostics === undefined,
        error: null,
        savedContents: '',
        headContents: null,
        lastUsed: now,
        contextEntry: req.contextEntry ?? null,
        // PHASE 63. Non-null makes this a DRAFT: no disk read, dirty from the
        // moment it appears, and the model seeded from these bytes rather than
        // from `savedContents`, which stays empty because nothing is saved.
        draft: req.draft ?? null
      };

      set((s) => {
        let tabs = [...s.tabs];
        const slot = keep
          ? undefined
          : tabs.find((t) => t.preview && !t.dirty);
        if (slot !== undefined) {
          // Reuse the single preview tab (VS Code behavior).
          disposeModels(slot.id);
          dropViewState(slot.id);
          tabs = tabs.map((t) => (t.id === slot.id ? tab : t));
        } else {
          tabs.push(tab);
          // LRU-evict the stalest clean tab past the cap — never the new
          // one, never the one on screen, never unsaved work.
          if (tabs.length > MAX_TABS) {
            const evict = tabs
              .filter(
                (t) => !t.dirty && t.id !== tab.id && t.id !== s.activeId
              )
              .sort((a, b) => a.lastUsed - b.lastUsed)[0];
            if (evict !== undefined) {
              disposeModels(evict.id);
              dropViewState(evict.id);
              tabs = tabs.filter((t) => t.id !== evict.id);
            }
          }
        }
        return { tabs, activeId: tab.id, panelOpen: true };
      });

      if (req.archMap !== undefined || req.diagnostics !== undefined) {
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
      if (tabById(id) === undefined) return;
      patchTab(id, { lastUsed: Date.now() });
      set({ activeId: id, panelOpen: true });
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
      set((s) => {
        const idx = s.tabs.findIndex((t) => t.id === id);
        const tabs = s.tabs.filter((t) => t.id !== id);
        let activeId = s.activeId;
        if (s.activeId === id) {
          const next = tabs[Math.min(idx, tabs.length - 1)];
          activeId = next?.id ?? null;
        }
        return {
          tabs,
          activeId,
          panelOpen: tabs.length === 0 ? false : s.panelOpen
        };
      });
    },

    closeActive() {
      const id = get().activeId;
      if (id !== null) get().closeTab(id);
    },

    closeOthers(id) {
      closeMany(get().tabs.filter((t) => t.id !== id).map((t) => t.id));
    },

    closeToRight(id) {
      const tabs = get().tabs;
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      closeMany(tabs.slice(idx + 1).map((t) => t.id));
    },

    closeSaved() {
      closeMany(get().tabs.filter((t) => !t.dirty).map((t) => t.id));
    },

    closeAll() {
      closeMany(get().tabs.map((t) => t.id));
    },

    cycleTab(delta) {
      const { tabs, activeId } = get();
      if (tabs.length < 2) return;
      const idx = tabs.findIndex((t) => t.id === activeId);
      const next = tabs[(idx + delta + tabs.length) % tabs.length];
      if (next !== undefined) get().activate(next.id);
    },

    cycleMru(delta) {
      const { tabs, activeId } = get();
      if (tabs.length < 2) return;
      const order = [...tabs].sort((a, b) => b.lastUsed - a.lastUsed);
      const idx = order.findIndex((t) => t.id === activeId);
      const next = order[(idx + delta + order.length) % order.length];
      // No lastUsed stamp: holding ⌃ and tabbing again must keep walking
      // back through history, not ping-pong between two tabs.
      if (next !== undefined) set({ activeId: next.id, panelOpen: true });
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
      // Phase 26 item 1, second half: the rule decided at creation holds for
      // the tab's whole life. A worktree tab outside the repository can never
      // enter diff mode, whoever asks — such a tab never has `canDiff`, so no
      // control offers this, but the state machine refuses it anyway.
      if (
        mode === 'diff' &&
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
      if (mode === 'diff' && tab.commit === null && tab.remote === undefined) {
        if (tab.image && !tab.svg) {
          if (tab.imageHead === null) void io.loadImageHead(id);
        } else if (tab.headContents === null) {
          void io.loadHead(id);
        }
      }
      if (tab.markdown && mode !== 'diff') {
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
      if (
        tab.commit !== null ||
        tab.remote !== undefined ||
        tab.archMap !== undefined ||
        tab.diagnostics !== undefined
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

    setDiffRedline(on) {
      set({ diffRedline: on });
      writeDiffRedline(on);
    },

    hidePanel() {
      set({ panelOpen: false });
    },

    togglePanel() {
      const s = get();
      if (s.panelOpen) {
        set({ panelOpen: false });
        return;
      }
      if (s.tabs.length > 0) {
        set({ panelOpen: true });
      } else if (s.lastRequest !== null) {
        s.openFromRequest(s.lastRequest);
      }
    },

    setMonacoError(message) {
      set({ monacoError: message });
    },

    activeTab() {
      const s = get();
      return s.tabs.find((t) => t.id === s.activeId) ?? null;
    }
  };
});
