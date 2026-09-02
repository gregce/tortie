/**
 * The tree's context menu, and it is the OS's menu.
 *
 * This is a hook behind FileTree.tsx. DESIGN.md forbids a DOM drawn context
 * menu, so `composition.contextMenu` renders nothing and its `onOpen` calls
 * through `openMenuRef` into `setMenu`, which is the one door onto the
 * ui:popupMenu bridge. The shape of the menu is built in ./tree-menu.ts and the
 * verbs it calls are in ./tree-ops.ts. What is here is the wiring between them,
 * plus the three things only this surface does: copy a path, reveal a row in
 * Finder, and ask main which apps can open one file.
 */

import { useCallback } from 'react';
import type { OpenWithApps, OpenWithHandler } from '@shared/ipc';
import { useApp } from '../state/store';
import { useGitDepth } from '../scm/depth';
import type { MenuItemSpec } from '../state/store';
import { REMOTE_COPIED_WITH_MACHINE } from '../machines/explorer';
import { showOneTimeTip } from '../app/one-time-tip';
import { canReveal, reveal } from './fs-bridge';
import { canDuplicate, canMutate } from './fs-ops-bridge';
import {
  buildOpenWithSubmenu,
  canOpenWith,
  openWith,
  openWithAppsWithinBudget,
  openWithFailureToast
} from './open-with';
import { canWriteEntries } from './remote-bridge';
import { rowFromEvent } from './row-events';
import {
  buildTreeMenu,
  copiedMessage,
  pathsForClipboard
} from './tree-menu';
import { absOf, isDirPath, parentOf, toRel } from './tree-paths';
import type { TreeModelBridge, TreeRemote } from './use-tree-model';

export interface TreeMenuOptions
  extends Pick<TreeModelBridge, 'model' | 'treeInput' | 'opsRef' | 'openMenuRef'> {
  rootPath: string;
  remote: TreeRemote | null;
  isRemote: boolean;
  remoteWriteRoot: string | null;
  /** The tree's open gesture, which the menu's Open and Open in New Tab reuse. */
  openRel: (canonical: string, keep?: boolean) => void;
}

export interface TreeMenuResult {
  /** The blank area below the rows, which is the project root. */
  onContextMenu: (e: React.MouseEvent) => void;
}

export function useTreeMenu({
  rootPath,
  remote,
  isRemote,
  remoteWriteRoot,
  model,
  treeInput,
  opsRef,
  openMenuRef,
  openRel
}: TreeMenuOptions): TreeMenuResult {
  const setMenu = useApp((s) => s.setMenu);
  const toast = useApp((s) => s.toast);

  const copyPaths = useCallback(
    (canonicals: readonly string[], relative: boolean): void => {
      // PHASE 90.3. An absolute path from a tab on another machine is pasted
      // with that machine in front of it, because a bare absolute path names a
      // folder on THIS Mac when it is pasted into a terminal here.
      const text = pathsForClipboard(
        rootPath,
        canonicals,
        relative,
        relative || remote === null ? null : remote.label
      );
      void navigator.clipboard.writeText(text).then(
        () =>
          toast(
            'info',
            !relative && remote !== null
              ? REMOTE_COPIED_WITH_MACHINE
              : copiedMessage(canonicals.length, relative)
          ),
        () => toast('error', 'Could not copy the path')
      );
    },
    [rootPath, remote, toast]
  );

  const revealPath = useCallback(
    (canonical: string): void => {
      void reveal(absOf(rootPath, canonical)).catch(() =>
        toast('error', 'Could not reveal the file in Finder')
      );
    },
    [rootPath, toast]
  );

  /**
   * Open one file with one app (Phase 39). The launch itself is main's:
   * `/usr/bin/open` is spawned there, and the app it starts is not a child of
   * Tortie. A cancel at the system panel says nothing, because the user
   * cancelled on purpose.
   */
  const runOpenWith = useCallback(
    (canonical: string, app: OpenWithHandler, appName: string | null): void => {
      void openWith({
        root: rootPath,
        path: absOf(rootPath, canonical),
        app
      }).then(
        (outcome) => {
          if (outcome.status === 'failed') {
            toast('error', openWithFailureToast(appName, outcome.message));
          }
        },
        () => toast('error', openWithFailureToast(appName, ''))
      );
    },
    [rootPath, toast]
  );

  /**
   * The Open With submenu for one row, or null when the item is not offered.
   *
   * Awaiting main here is what makes `showMenuAt` async, and it is why the
   * whole menu waits, not only this item. The wait is bounded here rather
   * than in main: `openWithAppsWithinBudget` starts its clock before the IPC
   * call, so the round trip is inside the deadline instead of added to it.
   * When the deadline wins the answer is 'unavailable' and the submenu
   * degrades to 'Open in Default App' plus 'Other…', which is a shape the
   * user can still act on.
   */
  const openWithItemsFor = useCallback(
    async (
      canonical: string
    ): Promise<(MenuItemSpec | 'sep')[] | null> => {
      if (!canOpenWith()) return null;
      let apps: OpenWithApps;
      try {
        apps = await openWithAppsWithinBudget({
          root: rootPath,
          path: absOf(rootPath, canonical)
        });
      } catch {
        // A guard in main refused the path. Offering to open it would be a
        // promise this build cannot keep, so the item is simply absent.
        return null;
      }
      return buildOpenWithSubmenu(apps, {
        withApp: (app) =>
          runOpenWith(canonical, { kind: 'app', appPath: app.path }, app.name),
        withDefault: () => runOpenWith(canonical, { kind: 'default' }, null),
        choose: () => runOpenWith(canonical, { kind: 'choose' }, null)
      });
    },
    [rootPath, runOpenWith]
  );

  /**
   * Build and raise the menu. Finder's rule decides the subject: the verbs
   * apply to the whole selection when the clicked row is inside it, and to
   * that row alone when it is not.
   */
  const showMenuAt = useCallback(
    async (canonical: string | null, x: number, y: number): Promise<void> => {
      const ops = opsRef.current;
      const selected = canonical === null ? [] : model.getSelectedPaths();
      const selection =
        canonical === null
          ? []
          : selected.includes(canonical)
            ? [...selected]
            : [canonical];
      const rel = canonical === null ? '' : toRel(canonical);
      const destDir =
        canonical === null
          ? ''
          : isDirPath(canonical)
            ? canonical
            : parentOf(canonical);

      const openable = treeInput.kinds.get(rel) !== 'other';
      // One file, not a folder, not a multi-row selection, and openable —
      // exactly the condition Open and Open in New Tab appear under.
      const single =
        canonical !== null &&
        !isDirPath(canonical) &&
        openable &&
        selection.length <= 1;
      const openWithItems =
        single && !isRemote ? await openWithItemsFor(canonical) : null;

      const items = buildTreeMenu(
        {
          canonical,
          selection,
          destDir,
          openable
        },
        {
          mutate: !isRemote && ops !== null && canMutate(),
          duplicate: canDuplicate(),
          reveal: !isRemote && canReveal(),
          readOnlyNote: remote?.readOnlyNote ?? null,
          // PHASE 101. Its own flag rather than `mutate` flipped to true,
          // because `mutate` gates five verbs and only this one has a script
          // on the far side.
          remoteCreateFile:
            isRemote && ops !== null && remoteWriteRoot !== null,
          // PHASE 102. A second flag for the two entry verbs, and it reads the
          // channel as well as the folder. A build whose preload predates this
          // phase leaves New Folder and Rename off a remote row rather than
          // offering a verb it cannot carry out.
          remoteWriteEntries:
            isRemote &&
            ops !== null &&
            remoteWriteRoot !== null &&
            canWriteEntries()
        },
        {
          open: (path, keep) => {
            openRel(path, keep);
            if (keep) showOneTimeTip('open-in-new-tab');
          },
          // PHASE 198. The tree's own open gesture, pinned, then the Source
          // Control view, whose File history section follows the active tab
          // and is asked to open if the person had collapsed it.
          history: (path) => {
            openRel(path, true);
            useApp.getState().showSidebarView('scm');
            useGitDepth.getState().revealFileHistory();
          },
          newEntry: (dir, kind) => ops?.newEntry(dir, kind),
          rename: (path) => ops?.startRename(path),
          duplicate: (path) => ops?.duplicate(path),
          reveal: revealPath,
          copyPaths,
          trash: (paths) => ops?.trash(paths)
        },
        openWithItems
      );
      if (items.length === 0) return;
      setMenu({ x, y, items });
    },
    [
      model,
      treeInput,
      isRemote,
      remote,
      remoteWriteRoot,
      openRel,
      revealPath,
      copyPaths,
      setMenu,
      openWithItemsFor
    ]
  );

  openMenuRef.current = (item, context): void => {
    // The row is already focused by the library. Close its own (empty)
    // surface immediately: gmux's menu is the OS's, and there is nothing
    // to render into the slot.
    const rect = context.anchorRect;
    void showMenuAt(item.path, rect.left, rect.bottom);
    context.close();
  };

  /**
   * The blank area below the rows is the ROOT. Pierre's row handler already
   * ran (and preventDefault'd) for a real row, so a hit here means empty
   * space — the only place "New File at the top level" can be asked for
   * without first finding a top-level row to aim at.
   */
  const onContextMenu = useCallback(
    (e: React.MouseEvent): void => {
      if (rowFromEvent(e.nativeEvent) !== null) return;
      e.preventDefault();
      void showMenuAt(null, e.clientX, e.clientY);
    },
    [showMenuAt]
  );

  return { onContextMenu };
}
