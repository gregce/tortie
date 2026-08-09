/**
 * gmux editor store (zustand) — tabs, modes, dirty state, save.
 *
 * Owned by the editor stream (src/renderer/editor/**). Subscribes to the
 * canonical open-file bus (src/renderer/state/open-file.ts): SCM rows and
 * tree rows emit OpenFileRequests; this store turns them into tabs.
 *
 * S5 rules implemented here:
 *  - modified files open as DIFF vs HEAD by default (`mode: 'diff'`),
 *    untracked/clean open plain (`mode: 'file'`)
 *  - single preview tab (italic) reused until the file is edited
 *  - max 5 tabs, LRU-evicting clean tabs
 *  - ⌘S saves via fs:writeFile; dirty dot until saved
 *  - §6.12 file-deleted-under-tab state (read-only + banner)
 */

import { create } from 'zustand';
import { errorText, useApp } from '../state/store';
import { onOpenFile } from '../state/open-file';
import type { OpenFileRequest } from '../state/open-file';
import type { GmuxFsExtras } from '@shared/ipc';
import {
  disposeModels,
  dropViewState,
  getWorkingModel,
  resetWorkingModel
} from './monaco-loader';

export type EditorMode = 'diff' | 'file';

export interface EditorTab {
  /** Absolute file path — the tab's identity. */
  path: string;
  /** Path relative to repoPath (git:showHead input). */
  relPath: string;
  /** Absolute repo/project root. */
  repoPath: string;
  /** Basename, shown on the tab. */
  name: string;
  mode: EditorMode;
  /** True when a HEAD version exists to diff against (mode chip visible). */
  canDiff: boolean;
  /** Preview tab (italic): replaced by the next open until edited. */
  preview: boolean;
  dirty: boolean;
  /** §6.12 — deleted on disk under the open tab. */
  deleted: boolean;
  /** Opened truncated (read cap) — read-only. */
  truncated: boolean;
  /** File contents (and HEAD contents in diff mode) still loading. */
  loading: boolean;
  /** Friendly load-failure line (binary file, permission…). */
  error: string | null;
  /** Last known on-disk contents (dirty = model text !== this). */
  savedContents: string;
  /** HEAD contents for the diff original side (null until loaded). */
  headContents: string | null;
  /** LRU stamp. */
  lastUsed: number;
}

const MAX_TABS = 5;

interface EditorState {
  tabs: EditorTab[];
  activePath: string | null;
  /** Panel visible (tabs survive a hidden panel; ⌘E/Esc toggle). */
  panelOpen: boolean;
  /** Last open request — ⌘E reopens it when every tab was closed. */
  lastRequest: OpenFileRequest | null;
  /** Monaco chunk failed to load (retryable). */
  monacoError: string | null;

  init(): void;
  openFromRequest(req: OpenFileRequest): void;
  activate(path: string): void;
  /** Close with dirty-confirm. */
  closeTab(path: string): void;
  forceCloseTab(path: string): void;
  closeActive(): void;
  cycleTab(delta: 1 | -1): void;
  setMode(path: string, mode: EditorMode): void;
  /** Preview → permanent (first edit, or double-click on the tab). */
  pin(path: string): void;
  markDirty(path: string, dirty: boolean): void;
  save(): Promise<void>;
  hidePanel(): void;
  /** ⌘E — show if hidden (reopening the last file if none), else hide. */
  togglePanel(): void;
  setMonacoError(message: string | null): void;

  activeTab(): EditorTab | null;
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function dirName(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

let initialized = false;

/** git:changed refresh debounce per repo (watcher bursts → one pass). */
const GIT_REFRESH_DEBOUNCE_MS = 300;

export const useEditor = create<EditorState>((set, get) => {
  const gmux = window.gmux as typeof window.gmux | undefined;
  const fsExtras = gmux
    ? (gmux.fs as typeof gmux.fs & GmuxFsExtras)
    : null;

  const patchTab = (path: string, patch: Partial<EditorTab>): void => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, ...patch } : t))
    }));
  };

  const loadContents = async (path: string): Promise<void> => {
    if (!gmux) return;
    try {
      const result = await gmux.fs.readFile(path);
      patchTab(path, {
        savedContents: result.contents,
        truncated: result.truncated,
        loading: false,
        error: null,
        deleted: false
      });
    } catch (err) {
      patchTab(path, { loading: false, error: errorText(err) });
    }
  };

  const loadHead = async (path: string): Promise<void> => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!gmux || tab === undefined) return;
    try {
      const head = await gmux.git.showHead({
        repoPath: tab.repoPath,
        path: tab.relPath
      });
      patchTab(path, { headContents: head });
    } catch (err) {
      // Diff base unavailable (repo vanished, git failed): fall back to a
      // plain editor rather than a broken diff.
      patchTab(path, { mode: 'file', canDiff: false });
      useApp
        .getState()
        .toast('error', `Could not load the HEAD version — ${errorText(err)}`);
    }
  };

  // -- external change handling (git watcher drives this) -------------------

  const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const refreshRepoTabs = async (repoPath: string): Promise<void> => {
    if (!gmux) return;
    const tabs = get().tabs.filter((t) => t.repoPath === repoPath);
    for (const tab of tabs) {
      // Existence check (feature-detected; skipped without fs:readDir).
      if (typeof fsExtras?.readDir === 'function') {
        try {
          const dir = await fsExtras.readDir(dirName(tab.path));
          const exists = dir.entries.some((e) => e.name === tab.name);
          if (!exists) {
            patchTab(tab.path, { deleted: true });
            continue;
          }
          if (tab.deleted) patchTab(tab.path, { deleted: false });
        } catch {
          /* parent unreadable — leave the tab as-is */
        }
      }
      // Reload clean buffers so the editor tracks the agent's edits.
      if (!tab.dirty) {
        try {
          const result = await gmux.fs.readFile(tab.path);
          if (result.contents !== tab.savedContents) {
            patchTab(tab.path, {
              savedContents: result.contents,
              truncated: result.truncated
            });
            resetWorkingModel(tab.path, result.contents);
          }
        } catch {
          /* transient read failure — keep the buffer */
        }
      }
      // Keep the diff base honest (HEAD moves on commit) and let a
      // freshly-modified file grow its Diff|File toggle.
      try {
        const head = await gmux.git.showHead({
          repoPath: tab.repoPath,
          path: tab.relPath
        });
        const current = get().tabs.find((t) => t.path === tab.path);
        if (current === undefined) continue;
        const patch: Partial<EditorTab> = { headContents: head };
        if (!current.canDiff && head !== current.savedContents) {
          patch.canDiff = true;
        }
        patchTab(tab.path, patch);
      } catch {
        /* non-repo or git failure — plain mode keeps working */
      }
    }
  };

  return {
    tabs: [],
    activePath: null,
    panelOpen: false,
    lastRequest: null,
    monacoError: null,

    init() {
      if (initialized || !gmux) return;
      initialized = true;
      onOpenFile((req) => get().openFromRequest(req));
      gmux.git.onChanged((repoPath) => {
        if (!get().tabs.some((t) => t.repoPath === repoPath)) return;
        const existing = refreshTimers.get(repoPath);
        if (existing !== undefined) clearTimeout(existing);
        refreshTimers.set(
          repoPath,
          setTimeout(() => {
            refreshTimers.delete(repoPath);
            void refreshRepoTabs(repoPath);
          }, GIT_REFRESH_DEBOUNCE_MS)
        );
      });
    },

    openFromRequest(req) {
      set({ lastRequest: req });
      const existing = get().tabs.find((t) => t.path === req.path);
      if (existing !== undefined) {
        get().activate(req.path);
        return;
      }

      const now = Date.now();
      const tab: EditorTab = {
        path: req.path,
        relPath: req.relPath,
        repoPath: req.repoPath,
        name: baseName(req.path),
        mode: req.mode,
        canDiff: req.mode === 'diff',
        preview: true,
        dirty: false,
        deleted: false,
        truncated: false,
        loading: true,
        error: null,
        savedContents: '',
        headContents: null,
        lastUsed: now
      };

      set((s) => {
        let tabs = [...s.tabs];
        // Reuse the single preview tab (VS Code behavior).
        const preview = tabs.find((t) => t.preview && !t.dirty);
        if (preview !== undefined) {
          disposeModels(preview.path);
          dropViewState(preview.path);
          tabs = tabs.map((t) => (t.path === preview.path ? tab : t));
        } else {
          tabs.push(tab);
          // LRU-evict the stalest clean tab past the cap (never the new one).
          if (tabs.length > MAX_TABS) {
            const candidates = tabs
              .filter((t) => !t.dirty && t.path !== tab.path)
              .sort((a, b) => a.lastUsed - b.lastUsed);
            const evict = candidates[0];
            if (evict !== undefined) {
              disposeModels(evict.path);
              dropViewState(evict.path);
              tabs = tabs.filter((t) => t.path !== evict.path);
            }
          }
        }
        return { tabs, activePath: tab.path, panelOpen: true };
      });

      void loadContents(req.path);
      if (req.mode === 'diff') void loadHead(req.path);
    },

    activate(path) {
      const tab = get().tabs.find((t) => t.path === path);
      if (tab === undefined) return;
      patchTab(path, { lastUsed: Date.now() });
      set({ activePath: path, panelOpen: true });
    },

    closeTab(path) {
      const tab = get().tabs.find((t) => t.path === path);
      if (tab === undefined) return;
      if (tab.dirty) {
        useApp.getState().setConfirm({
          title: `Close '${tab.name}'?`,
          body: 'Its unsaved changes will be lost. This cannot be undone.',
          confirmLabel: 'Close tab',
          destructive: true,
          onConfirm: () => get().forceCloseTab(path)
        });
        return;
      }
      get().forceCloseTab(path);
    },

    forceCloseTab(path) {
      disposeModels(path);
      dropViewState(path);
      set((s) => {
        const idx = s.tabs.findIndex((t) => t.path === path);
        const tabs = s.tabs.filter((t) => t.path !== path);
        let activePath = s.activePath;
        if (s.activePath === path) {
          const next = tabs[Math.min(idx, tabs.length - 1)];
          activePath = next?.path ?? null;
        }
        return {
          tabs,
          activePath,
          panelOpen: tabs.length === 0 ? false : s.panelOpen
        };
      });
    },

    closeActive() {
      const path = get().activePath;
      if (path !== null) get().closeTab(path);
    },

    cycleTab(delta) {
      const { tabs, activePath } = get();
      if (tabs.length < 2) return;
      const idx = tabs.findIndex((t) => t.path === activePath);
      const next = tabs[(idx + delta + tabs.length) % tabs.length];
      if (next !== undefined) get().activate(next.path);
    },

    setMode(path, mode) {
      const tab = get().tabs.find((t) => t.path === path);
      if (tab === undefined || tab.mode === mode) return;
      patchTab(path, { mode });
      if (mode === 'diff' && tab.headContents === null) void loadHead(path);
    },

    pin(path) {
      const tab = get().tabs.find((t) => t.path === path);
      if (tab !== undefined && tab.preview) patchTab(path, { preview: false });
    },

    markDirty(path, dirty) {
      const tab = get().tabs.find((t) => t.path === path);
      if (tab === undefined || tab.dirty === dirty) return;
      const patch: Partial<EditorTab> = { dirty };
      if (dirty && tab.preview) patch.preview = false; // edited → permanent
      patchTab(path, patch);
    },

    async save() {
      const tab = get().activeTab();
      if (!gmux || tab === null) return;
      if (tab.deleted || tab.truncated || tab.error !== null) return;
      const model = getWorkingModel(tab.path);
      if (model === null) return;
      const value = model.getValue();
      try {
        await gmux.fs.writeFile(tab.path, value);
        patchTab(tab.path, { savedContents: value, dirty: false });
      } catch (err) {
        useApp
          .getState()
          .toast('error', `Save failed — ${errorText(err)}`, { sticky: true });
      }
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
      return s.tabs.find((t) => t.path === s.activePath) ?? null;
    }
  };
});
