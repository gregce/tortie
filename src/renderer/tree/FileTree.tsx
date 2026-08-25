/**
 * The project file tree (@pierre/trees) — S3 "Tree row" spec, Phase 11 swap,
 * Phase 12.9 file management.
 *
 * Rows [h:24] render inside Pierre's shadow DOM: chevron (folders) ·
 * material icon 16px — per-type for files, the generic folder pair for
 * directories (Phase 9 subset via a custom sprite sheet + the folder CSS in
 * pierre-icons.ts) · name · built-in git lane (status letter + color,
 * folder dot propagation — previously hand-rolled). Conflicted files add a
 * '!' row decoration in --git-conflict (Pierre has no conflict status).
 * Click / Enter on a file emits an open-in-editor request (diff mode when
 * the file has tracked changes).
 *
 * The Pierre model is path-first and imperative: lazy fs:readDir listings
 * from tree/store.ts are diffed into it via `batch`, expansion is watched
 * through `subscribe` to drive on-expand listing + per-project persistence,
 * and git status is fed with `setGitStatus` (aggregation is built in).
 * Theming crosses the shadow boundary only through the theme bridge
 * (src/renderer/pierre/theme-bridge.ts) — mount this component fresh per
 * project root (FilesSection keys it by rootPath).
 *
 * ── PHASE 12.9 — what this component now owns ─────────────────────────────
 * · CONTEXT MENU (item 2) via the library's `composition.contextMenu`, opened
 *   through `onOpen` into the NATIVE macOS menu (DESIGN.md §3 forbids a
 *   DOM-drawn one, so the React `renderContextMenu` slot stays empty). The
 *   verbs themselves live in tree-ops.ts; the shape lives in tree-menu.ts.
 * · DRAG TO MOVE (item 3) with `canDrag` locking `.git` and `canDrop` locking
 *   it as a destination, plus a ROOT drop on the empty space below the rows —
 *   Pierre only offers the root through a top-level FILE row, which is not
 *   where anyone aims.
 * · NAME FILTER (item 4): the library's own field, `hide-non-matches`.
 *
 * ── ONE SURFACE, FOUR MEANINGS (Phase 154 added the last two) ─────────────
 * A drag that STARTS here means MOVE over the tree and ATTACH over a terminal
 * pane. The contract is written once in terminal/drop/tree-drag.ts; this
 * component performs the tree's three obligations and nothing else — it arms
 * `beginTreeDrag` on the host's bubbled dragstart, it never installs a
 * window-level drag listener, and it never preventDefaults a dragover outside
 * its own box. The one line that is easy to miss is `effectAllowed`: Pierre
 * stamps 'move', and Chromium then REFUSES the pane's 'copy' outright (the
 * drop event never fires). Widening it to 'copyMove' is what lets the cursor
 * name which family you are in.
 *
 * With OPTION held, the same gesture means DRAG OUT: the HTML drag is ended
 * before it begins and `fs:startDrag` starts the operating system's own one,
 * so a row can be dropped into Finder as a real file. A renderer cannot do
 * that at all, which is why there is a channel.
 *
 * A drag that STARTS OUTSIDE THE APP and carries files means IMPORT: what is
 * dropped is copied into the folder under the pointer, or into the project
 * root over the empty space, matching the move rule exactly. Before this
 * phase that gesture belonged to the window router and opened a NEW PROJECT
 * TAB, and over the tree box it no longer does. Everywhere else in the window
 * it still does.
 *
 * All four live in use-tree-drag.ts, which is where the rules that keep them
 * apart are written down.
 *
 * ── PHASE 90.3 — the same tree, rows on another machine ───────────────────
 * A project can be a folder on another machine now, and this component draws
 * that tab's rows too. `remote` is the one prop that says so, and everything
 * that changes hangs off it:
 * · the listing comes from tree/store.ts, which fills the same cache from ONE
 *   `machines:listTree` call rather than one `fs:readDir` per folder;
 * · the persisted expansion key is the TARGET's key, so two machines holding
 *   the same path keep two sets;
 * · nothing is dimmed, because `git check-ignore` reads this Mac;
 * · dragging is refused at the source, because a drag arms the terminal pane's
 *   attach contract with ABSOLUTE paths and one from another machine names a
 *   file on this Mac or nothing at all;
 * · four verbs are in the menu and the rest are absent (see tree-menu.ts);
 * · Copy Path puts the machine in front of the path;
 * · an open carries the remote reference, so the editor reads both sides from
 *   that machine.
 *
 * ── PHASE 101, one of those verbs crosses ─────────────────────────────────
 * `remote.writeRoot` is the folder on that machine a person confirmed Tortie
 * may replace a file under, and null means they confirmed none. When it is
 * set, New File is on the menu and a create lands over there through
 * `machines.putFile` rather than through `fs:createFile`. Nothing else moves.
 * New Folder, Rename, Duplicate and Move to Trash stay absent on a folder on
 * another machine in both states, dragging is still refused at the source, and
 * a tab opened from such a tree is an edit surface only because that machine
 * carries a folder, never because the tab was opened from here.
 *
 * ── PHASE 102, two more of those verbs cross ──────────────────────────────
 * New Folder and Rename join New File on the same `remote.writeRoot` branch.
 * A create of a folder lands over there through `machines.makeDir` and a
 * rename through `machines.renameEntry`. Duplicate and Move to Trash are
 * still absent in both states, and dragging is still refused at the source
 * for the reason above, which does not expire with a write script.
 *
 * ── PHASE 127, four controllers moved behind this component ───────────────
 * Nothing a person sees changed. What left is the WIRING, and it left in four
 * pieces, each one responsibility:
 * · ./use-tree-model.ts builds the model, feeds it and keeps the expansion set;
 * · ./use-tree-rename.ts holds the verbs and the create editor's refusal;
 * · ./use-tree-menu.ts builds the native menu and raises it;
 * · ./use-tree-drag.ts is the tree's half of the drag contract.
 * What stayed here is the name filter with its clear affordance, the click,
 * double-click and key gestures, and the markup.
 *
 * Model options are captured ONCE (usePierreModel snapshots them on the first
 * render), so every callback reads the live state through a ref.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  FileTree as PierreTree,
  useFileTreeSearch
} from '@pierre/trees/react';
import type { GitFileStatus } from '@shared/types';
import { remoteTreeEmpty as remoteEmptyLine } from '../machines/explorer';
import { treeStyles } from '../pierre/theme-bridge';
import { Codicon } from '../icons';
import { openModeFor } from './decorations';
import type { TreeDensity } from './density';
import {
  filterReopenValue,
  folderExpansionAfterReopen
} from './filter-guard';
import type { FilterStash } from './filter-guard';
import { headerDestDir } from './header-actions';
import { requestOpenFile } from './open-file';
import { fromTextField, rowFromEvent } from './row-events';
import { useTreeHandle } from './tree-handle';
import { toRel } from './tree-paths';
import {
  asDirectory,
  useTreeExpansionWatch,
  useTreeModel
} from './use-tree-model';
import type { TreeRemote } from './use-tree-model';
import { useTreeDrag } from './use-tree-drag';
import { useTreeMenu } from './use-tree-menu';
import { useTreeRename } from './use-tree-rename';

/** Hit box of the filter's clear button, and its inset from the field edge. */
const CLEAR_BUTTON_PX = 16;
const CLEAR_BUTTON_INSET_PX = 4;

// ---------------------------------------------------------------------------
// FileTree
// ---------------------------------------------------------------------------

export function FileTree({
  rootPath,
  remote,
  statusFiles,
  isRepo,
  density
}: {
  rootPath: string;
  /**
   * PHASE 90.3, PHASE 101 AND PHASE 102. The machine this folder is on, or
   * null for this Mac. The four fields and the reason for each one are on
   * TreeRemote in ./use-tree-model.ts, because three of the hooks behind this
   * component read it and the sentence has one home.
   */
  remote: TreeRemote | null;
  statusFiles: readonly GitFileStatus[];
  /**
   * Whether this folder is a git repository. Only a repository can be asked
   * what it ignores, and asking a plain folder would spawn a git that answers
   * "fatal" every time the listing changes.
   */
  isRepo: boolean;
  /** Row spacing (Phase 47 item 3). FilesSection re-mounts on a change. */
  density: TreeDensity;
}): React.JSX.Element {
  /**
   * PHASE 90.3. The two things every branch below reads, computed once.
   *
   * `isRemote` is the whole switch. `storeKey` is what the expansion set is
   * remembered under, and it is the bare path for a folder on this Mac.
   */
  const isRemote = remote !== null;
  /**
   * PHASE 101. The folder on that machine Tortie may write a file under, or
   * null. Null for every folder on this Mac, and null for a machine nobody has
   * confirmed a folder for, which is every machine before that phase.
   */
  const remoteWriteRoot =
    remote !== null && remote.writeRoot !== null && remote.writeRoot.length > 0
      ? remote.writeRoot
      : null;

  const bridge = useTreeModel({
    rootPath,
    remote,
    isRemote,
    remoteWriteRoot,
    statusFiles,
    isRepo,
    density
  });
  const {
    model,
    treeInput,
    gitState,
    rootEmpty,
    hostRef,
    treeShadow,
    opsRef,
    openMenuRef,
    fedRef,
    reconcile,
    openDirs,
    sanctionFilterClose,
    sanctionUntilRef
  } = bridge;

  const { opsCreated, nameError } = useTreeRename({
    rootPath,
    remote,
    remoteWriteRoot,
    model,
    hostRef,
    treeShadow,
    opsRef,
    fedRef,
    hold: bridge.hold
  });

  // AFTER the verbs, deliberately: this watch's first pass calls `settle()` on
  // them, and it has run in that position since Phase 12.9.
  useTreeExpansionWatch({
    model,
    rootPath,
    storeKey: bridge.storeKey,
    opsRef,
    openDirs,
    initialExpanded: bridge.initialExpanded
  });

  // ----- the name filter ---------------------------------------------------
  const search = useFileTreeSearch(model);
  const registerHandle = useTreeHandle((s) => s.register);
  const setFilterOpen = useTreeHandle((s) => s.setFilterOpen);

  useEffect(() => {
    const ops = opsRef.current;
    if (ops === null) return;
    registerHandle({
      rootPath,
      toggleFilter: () => {
        if (model.isSearchOpen()) {
          sanctionFilterClose();
          model.closeSearch();
        } else model.openSearch();
      },
      filterValue: () => model.getSearchValue(),
      ops,
      paths: () => [...fedRef.current],
      reconcile,
      startRename: (canonical) => ops.startRename(canonical),
      newEntryTarget: () => headerDestDir(model.getSelectedPaths()),
      collapseAll: () => {
        // Deepest first, so a parent is never closed out from under a child
        // that is still open — Collapse All has to leave NOTHING expanded, or
        // re-opening one folder spills a whole subtree back.
        const open = openDirs().sort((a, b) => b.length - a.length);
        for (const path of open) asDirectory(model.getItem(path))?.collapse();
        return open.length;
      },
      shadowRoot: () =>
        hostRef.current?.querySelector('file-tree-container')?.shadowRoot ??
        null
    });
    return () => registerHandle(null);
    // opsCreated re-runs this once the verbs exist (the effect above).
  }, [
    model,
    rootPath,
    registerHandle,
    openDirs,
    opsCreated,
    sanctionFilterClose,
    reconcile
  ]);

  useEffect(() => {
    setFilterOpen(search.isOpen);
  }, [search.isOpen, setFilterOpen]);

  // The library's field carries no accessible name (it labels itself only
  // through aria-controls). Naming it is a two-line effect, not a fork.
  useEffect(() => {
    if (!search.isOpen) return;
    const input = hostRef.current
      ?.querySelector('file-tree-container')
      ?.shadowRoot?.querySelector('[data-file-tree-search-input]');
    if (input instanceof HTMLInputElement) {
      input.setAttribute('aria-label', 'Filter files by name');
    }
  }, [search.isOpen]);

  // ----- the filter survives clicking a result (Phase 47 item 2) -----------
  //
  // GUARD ONE, the blur swallow. The library closes the filter on the input's
  // own `onBlur`, which preact 11 binds as a plain 'blur' listener on the
  // input element itself. 'blur' does not bubble but it does CAPTURE, and it
  // is composed, so a capture listener on this host sits earlier in the path
  // than the input's own handler and `stopPropagation()` there means the
  // library never hears it. Nothing is reopened on this path, so no focus is
  // ever taken back from wherever the click went.
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const swallowSearchBlur = (event: FocusEvent): void => {
      const target = event.composedPath()[0];
      if (
        target instanceof HTMLElement &&
        target.hasAttribute('data-file-tree-search-input')
      ) {
        event.stopPropagation();
      }
    };
    host.addEventListener('blur', swallowSearchBlur, true);
    return () => host.removeEventListener('blur', swallowSearchBlur, true);
  }, []);

  // GUARD TWO, the reopen. A row click closes the filter unconditionally
  // inside the library's click plan, and Enter closes it from the field.
  // Neither is a gesture aimed at the filter, so both are stashed here and
  // put back by the model subscription below.
  const stashRef = useRef<FilterStash | null>(null);
  const reopeningRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const stashIfFiltering = (row: FilterStash['row']): void => {
      if (!model.isSearchOpen()) return;
      const value = model.getSearchValue();
      if (value.length === 0) return;
      stashRef.current = { value, at: Date.now(), row };
    };

    const onPointerDown = (event: PointerEvent): void => {
      // A modified click is a selection gesture; the library does not toggle
      // a folder for it, so neither does the reopen.
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      const hit = rowFromEvent(event);
      if (hit === null) {
        stashRef.current = null;
        return;
      }
      stashIfFiltering({
        path: hit.rel,
        kind: hit.type,
        wasExpanded:
          hit.type === 'folder' &&
          asDirectory(model.getItem(hit.rel))?.isExpanded() === true
      });
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing) return;
      // Escape is the one keystroke that means "put this filter away".
      if (event.key === 'Escape' && model.isSearchOpen()) {
        stashRef.current = null;
        sanctionFilterClose();
        return;
      }
      if (event.key === 'Enter') stashIfFiltering(null);
    };

    host.addEventListener('pointerdown', onPointerDown, true);
    host.addEventListener('keydown', onKeyDown, true);
    return () => {
      host.removeEventListener('pointerdown', onPointerDown, true);
      host.removeEventListener('keydown', onKeyDown, true);
    };
  }, [model, sanctionFilterClose]);

  useEffect(() => {
    let wasOpen = model.isSearchOpen();
    const unsubscribe = model.subscribe(() => {
      const isOpen = model.isSearchOpen();
      const previouslyOpen = wasOpen;
      wasOpen = isOpen;
      if (reopeningRef.current) return;
      const value = filterReopenValue({
        wasOpen: previouslyOpen,
        isOpen,
        sanctionedUntil: sanctionUntilRef.current,
        stash: stashRef.current,
        now: Date.now()
      });
      if (value === null) return;
      const stash = stashRef.current;
      stashRef.current = null;
      // A microtask, not this listener: the library is part-way through its
      // own emit loop, and re-entering it would run every other subscriber
      // against a state that is about to change again.
      reopeningRef.current = true;
      queueMicrotask(() => {
        try {
          // Re-apply the toggle the close undid, BEFORE reopening, so the
          // filter's own expansion snapshot is taken over the right state.
          const folder = folderExpansionAfterReopen(stash);
          if (folder !== null) {
            const dir = asDirectory(model.getItem(folder.path));
            if (folder.expand) dir?.expand();
            else dir?.collapse();
          }
          model.openSearch(value);
          wasOpen = model.isSearchOpen();
        } finally {
          reopeningRef.current = false;
        }
      });
    });
    return unsubscribe;
  }, [model]);

  // Pierre shows the WHOLE tree when a query matches nothing (rather than an
  // empty void), so the only honest signal is a line that says so — and says
  // what the filter can see, since it can only match rows already listed.
  const filterMissed =
    search.isOpen &&
    search.value.trim().length > 0 &&
    search.matchingPaths.length === 0;

  // ----- the clear affordance (Phase 47 item 2) ----------------------------
  // The library renders no clear button, and the filter now survives every
  // accidental close, so there has to be a deliberate way out that is not a
  // keystroke. The button is the HOST's, never injected into the preact-owned
  // shadow children, and it is placed over the field's right edge from the
  // field's live rect — the same technique the Phase 37 refusal note uses.
  const [clearBox, setClearBox] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null || !search.isOpen) {
      setClearBox(null);
      return;
    }
    const place = (): void => {
      const input = treeShadow()?.querySelector(
        '[data-file-tree-search-input]'
      );
      if (!(input instanceof HTMLElement)) {
        setClearBox(null);
        return;
      }
      const rect = input.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const next = {
        top: Math.round(
          rect.top - hostRect.top + (rect.height - CLEAR_BUTTON_PX) / 2
        ),
        left: Math.round(
          rect.right - hostRect.left - CLEAR_BUTTON_PX - CLEAR_BUTTON_INSET_PX
        )
      };
      setClearBox((prev) =>
        prev !== null && prev.top === next.top && prev.left === next.left
          ? prev
          : next
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(host);
    return () => observer.disconnect();
  }, [search.isOpen, treeShadow]);

  const clearFilter = useCallback((): void => {
    stashRef.current = null;
    sanctionFilterClose();
    model.closeSearch();
  }, [model, sanctionFilterClose]);

  // ----- gestures ----------------------------------------------------------

  /**
   * `keep` is VS Code's preview-tab distinction (Phase 12 item 5): a single
   * click opens a PREVIEW tab that the next single click recycles, while a
   * double-click or ↩ opens the file for keeps and the strip accumulates.
   */
  const openRel = useCallback(
    (canonical: string, keep = false): void => {
      const rel = toRel(canonical);
      const kind = treeInput.kinds.get(rel);
      if (kind === 'other') return; // sockets/FIFOs/devices stay inert
      requestOpenFile({
        repoPath: rootPath,
        relPath: rel,
        path: rootPath + '/' + rel,
        // Canonical bus mode: 'file' is the plain-open gesture. A file on
        // another machine is always opened plain: the diff base would be a
        // working tree on THIS Mac, which is not where the file is.
        mode:
          remote === null && openModeFor(gitState.byPath.get(rel)) === 'diff'
            ? 'diff'
            : 'file',
        source: 'tree',
        preview: !keep,
        // PHASE 90.3. Its presence is what makes the editor fill both sides
        // from that machine and treat the tab as read only.
        ...(remote === null
          ? {}
          : {
              remote: {
                machineId: remote.machineId,
                machineLabel: remote.label,
                repoPath: rootPath
              }
            })
      });
    },
    [rootPath, remote, treeInput, gitState]
  );

  // Pierre selects/focuses on click internally; opening is ours. A modified
  // click is a SELECTION gesture (⌘ toggles, ⇧ ranges) — opening a file the
  // user was only adding to a selection is the classic multi-select bug.
  const onClick = useCallback(
    (e: React.MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      const row = rowFromEvent(e.nativeEvent);
      if (row === null) return;
      // A pending create's row is not openable (Phase 37) — there is no file
      // yet. The click still blurs the editor, and the blur rules decide.
      if (row.rel === opsRef.current?.pendingPath()) return;
      if (row.type === 'file') openRel(row.rel);
    },
    [openRel]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent): void => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      const row = rowFromEvent(e.nativeEvent);
      if (row === null) return;
      if (row.rel === opsRef.current?.pendingPath()) return;
      if (row.type === 'file') openRel(row.rel, true);
    },
    [openRel]
  );

  /**
   * ↩ activates and ⌫ deletes. Pierre handles F2 (rename), the arrows, ⌘A and
   * type-to-filter itself and stops those keys inside the shadow root; what
   * reaches here is what it left alone. Keys typed into the rename input or
   * the filter field come through unhandled too, which is why `fromTextField`
   * is a hard gate rather than a nicety.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (fromTextField(e.nativeEvent) || model.isSearchOpen()) return;

      if (e.key === 'Enter') {
        const rel = model.getFocusedPath();
        if (rel === null) return;
        e.preventDefault();
        const dir = asDirectory(model.getItem(rel));
        if (dir !== null) dir.toggle();
        else openRel(rel, true);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        // PHASE 90.3. ⌫ is Move to Trash, and Move to Trash is absent for a
        // folder on another machine, permanently. `shell.trashItem` has no far
        // side equal and a remote `rm` would turn a recoverable delete into an
        // unrecoverable one.
        if (isRemote) return;
        const selected = model.getSelectedPaths();
        const focused = model.getFocusedPath();
        const targets =
          selected.length > 0 ? selected : focused === null ? [] : [focused];
        if (targets.length === 0) return;
        e.preventDefault();
        opsRef.current?.trash(targets);
      }
    },
    [model, isRemote, openRel]
  );

  const { onContextMenu } = useTreeMenu({
    rootPath,
    remote,
    isRemote,
    remoteWriteRoot,
    model,
    treeInput,
    opsRef,
    openMenuRef,
    openRel
  });

  const {
    rootArmed,
    importHover,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd
  } = useTreeDrag({
    rootPath,
    isRemote,
    remoteLabel: remote?.label ?? null,
    model,
    hostRef,
    opsRef,
    treeShadow
  });

  /**
   * PHASE 154. What the drop from outside paints, and why it is drawn by the
   * HOST rather than inside Pierre's shadow root.
   *
   * The library paints `data-item-drag-target` on a row for its OWN drags and
   * has no affordance for anybody else's, so there are two ways to show where
   * an external drop will land: set the library's attribute on its own row, or
   * draw a rectangle over that row from the host. The second is the one this
   * component already uses twice — the filter's clear button and the create
   * editor's refusal note are both placed from a live rect out of the shadow
   * root — so it is the pattern rather than a new one, and it reaches into
   * nothing the library owns.
   *
   * WHICH ROW. The ring goes on the DESTINATION FOLDER, which for a file row
   * is that file's own folder rather than the row under the pointer, because
   * the file is not where the drop lands. When the destination is the project
   * root, or when the destination folder has been scrolled out of view, the
   * whole tree box takes the ring instead: that is the same affordance the
   * root drop has worn since Phase 12.9, and it is the honest reduced
   * statement when no row on screen is the answer.
   */
  const importBox = importHover?.box ?? null;
  const importWholeBox = importHover !== null && importHover.box === null;

  // Host styles: the theme bridge's --trees-theme-* vars plus gmux type
  // tokens (fonts/sizes inherit as custom properties across the shadow
  // boundary — rules do not, values do).
  const hostStyle = useMemo(
    () =>
      ({
        ...treeStyles,
        '--trees-font-family': 'var(--font-ui)',
        '--trees-font-size': 'var(--text-sm)',
        '--trees-padding-inline': 'var(--space-2)'
      }) as React.CSSProperties,
    []
  );

  /**
   * PHASE 90.3. The empty folder line names the machine when the folder is on
   * one. The sentence itself comes from machines/explorer.ts; this picks
   * which of the two to draw and writes neither.
   */
  const emptyLine =
    remote === null ? 'This folder is empty.' : remoteEmptyLine(remote.label);

  return (
    <div
      className={
        'files-tree' +
        (rootArmed ? ' root-drop' : '') +
        (importWholeBox && importHover?.refused !== true ? ' import-drop' : '') +
        (importHover?.refused === true ? ' import-refused' : '')
      }
      ref={hostRef}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {rootEmpty && !search.isOpen ? (
        <div className="section-stub">{emptyLine}</div>
      ) : (
        <PierreTree
          model={model}
          style={hostStyle}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
          onContextMenu={onContextMenu}
          aria-label="Project files"
        />
      )}
      {importBox !== null ? (
        <div
          className="files-import-target"
          aria-hidden="true"
          style={{
            top: importBox.top,
            left: importBox.left,
            width: importBox.width,
            height: importBox.height
          }}
        />
      ) : null}
      {clearBox !== null ? (
        <button
          type="button"
          className="files-filter-clear"
          aria-label="Clear the filter"
          title="Clear the filter"
          style={{
            top: clearBox.top,
            left: clearBox.left,
            width: CLEAR_BUTTON_PX,
            height: CLEAR_BUTTON_PX
          }}
          onClick={clearFilter}
        >
          <Codicon name="close" size={12} />
        </button>
      ) : null}
      {filterMissed ? (
        <p className="files-filter-note">
          No matches in the folders you have opened.
        </p>
      ) : null}
      {nameError !== null ? (
        <div
          className="tree-name-error"
          role="alert"
          style={{
            top: nameError.top,
            left: nameError.left,
            maxWidth: nameError.maxWidth
          }}
        >
          {nameError.message}
        </div>
      ) : null}
    </div>
  );
}
