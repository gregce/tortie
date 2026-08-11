/**
 * The explorer's context menu, composed as DATA.
 *
 * NATIVE, NOT DRAWN. DESIGN.md §3 makes macOS `Menu.popup` the only context
 * menu in gmux, so @pierre/trees' context-menu composition is wired to
 * `onOpen` — the hook that hands us the item and the anchor — rather than to
 * its React `render`/`renderContextMenu` slot, which exists to mount a DOM
 * surface we are not allowed to have. The library still owns everything
 * around the menu (right-click and the ⇧F10 / menu-key path both route
 * through it, the row focuses first, the anchor rect is measured for us);
 * only the surface is ours, and ours is the OS's.
 *
 * FINDER'S SELECTION RULE, which this file encodes and S3D already states for
 * the SCM list: the verbs apply to the WHOLE selection when the row you
 * right-clicked is inside it, and to that row alone when it is not. Labels
 * name the count rather than leaving a bare verb over a set.
 *
 * Pure so the shape of the menu is testable without a tree, a bridge, or a
 * native menu: `buildTreeMenu` returns the same `MenuItemSpec[]` the store's
 * `setMenu` takes everywhere else in the app.
 */

import type { FsMoveConflict } from '@shared/fs-ops';
import type { MenuItemSpec } from '../state/store';
import { baseNameOf, isDirPath } from './tree-paths';

/** What was right-clicked, with the selection rule already resolved. */
export interface TreeMenuTarget {
  /** Canonical path of the row, or null for the blank area (= the root). */
  canonical: string | null;
  /** The paths the verbs act on. Empty for the root menu. */
  selection: readonly string[];
  /** Where "New File"/"New Folder" land, canonically ('' = project root). */
  destDir: string;
  /** False for rows that cannot be opened at all (sockets, FIFOs, devices). */
  openable: boolean;
}

/** Which verbs this build can actually perform (preload feature detection). */
export interface TreeMenuCapabilities {
  mutate: boolean;
  duplicate: boolean;
  reveal: boolean;
}

export interface TreeMenuActions {
  open(canonical: string, keep: boolean): void;
  newEntry(destDir: string, kind: 'file' | 'dir'): void;
  rename(canonical: string): void;
  duplicate(canonical: string): void;
  reveal(canonical: string): void;
  copyPaths(canonicals: readonly string[], relative: boolean): void;
  trash(canonicals: readonly string[]): void;
}

/** "3 files" / "2 folders" / "4 items" — the noun a plural verb needs. */
function countedNoun(canonicals: readonly string[]): string {
  const dirs = canonicals.filter(isDirPath).length;
  if (dirs === 0) return `${canonicals.length} files`;
  if (dirs === canonicals.length) return `${canonicals.length} folders`;
  return `${canonicals.length} items`;
}

export function buildTreeMenu(
  target: TreeMenuTarget,
  caps: TreeMenuCapabilities,
  actions: TreeMenuActions
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [];
  const { canonical, selection } = target;
  const single = selection.length === 1 ? selection[0] : undefined;
  const many = selection.length > 1;
  const isFolder = canonical !== null && isDirPath(canonical);

  // -- open ----------------------------------------------------------------
  // The preview/pinned tab model is invisible until something says it out
  // loud (Phase 12.4): a single click recycles one italic tab, and a user who
  // never guesses the double-click reads that as "opening files is broken".
  // Naming both openings here is the teaching surface.
  if (canonical !== null && !isFolder && target.openable && !many) {
    items.push(
      { label: 'Open', run: () => actions.open(canonical, false) },
      { label: 'Open in New Tab', run: () => actions.open(canonical, true) },
      'sep'
    );
  }

  // -- create --------------------------------------------------------------
  if (caps.mutate) {
    items.push(
      {
        label: 'New File…',
        run: () => actions.newEntry(target.destDir, 'file')
      },
      {
        label: 'New Folder…',
        run: () => actions.newEntry(target.destDir, 'dir')
      }
    );
  }

  // -- edit ----------------------------------------------------------------
  if (caps.mutate && single !== undefined) {
    items.push('sep', {
      label: 'Rename…',
      hint: 'F2',
      run: () => actions.rename(single)
    });
    if (caps.duplicate) {
      items.push({ label: 'Duplicate', run: () => actions.duplicate(single) });
    }
  }

  if (caps.mutate && selection.length > 0) {
    items.push('sep', {
      // Honest label: gmux never unlinks. `shell.trashItem` is the only
      // deletion in the app, so the menu says where the file is going.
      label: many
        ? `Move ${countedNoun(selection)} to Trash`
        : 'Move to Trash',
      hint: '⌫',
      destructive: true,
      run: () => actions.trash(selection)
    });
  }

  // -- locate --------------------------------------------------------------
  const locate: (MenuItemSpec | 'sep')[] = [];
  const revealTarget = single ?? canonical;
  if (caps.reveal && revealTarget !== undefined && revealTarget !== null) {
    locate.push({
      label: 'Reveal in Finder',
      run: () => actions.reveal(revealTarget)
    });
  }
  if (selection.length > 0) {
    locate.push(
      {
        label: many ? 'Copy Paths' : 'Copy Path',
        run: () => actions.copyPaths(selection, false)
      },
      {
        label: many ? 'Copy Relative Paths' : 'Copy Relative Path',
        run: () => actions.copyPaths(selection, true)
      }
    );
  } else if (canonical === null) {
    // Root menu: the project folder itself is still worth reaching.
    locate.push({
      label: 'Copy Path',
      run: () => actions.copyPaths([''], false)
    });
  }
  if (locate.length > 0) {
    if (items.length > 0) items.push('sep');
    items.push(...locate);
  }

  return items;
}

/** Exported for the test — the plural noun is copy, and copy regresses. */
export { countedNoun };

/** Clipboard text for a Copy Path / Copy Relative Path pick. */
export function pathsForClipboard(
  rootPath: string,
  canonicals: readonly string[],
  relative: boolean
): string {
  return canonicals
    .map((canonical) => {
      const rel = canonical.endsWith('/') ? canonical.slice(0, -1) : canonical;
      if (relative) return rel;
      return rel.length === 0 ? rootPath : `${rootPath}/${rel}`;
    })
    .join('\n');
}

/** The toast after a copy, naming what landed on the clipboard. */
export function copiedMessage(count: number, relative: boolean): string {
  const what = relative ? 'Relative path' : 'Path';
  return count === 1 ? `${what} copied` : `${count} paths copied`;
}

/**
 * The subject of a confirmation: `"notes.md"` for one, a counted noun for
 * several. Never a bare verb over a set — the dialog has to say what goes.
 */
export function describeEntries(canonicals: readonly string[]): string {
  const first = canonicals[0];
  if (canonicals.length === 1 && first !== undefined) {
    return `"${baseNameOf(first)}"`;
  }
  return countedNoun(canonicals);
}

/**
 * One sentence naming every collision a move would cause, and saying what
 * Replace actually does — which, because a displaced entry is trashed first,
 * is still recoverable.
 */
export function describeConflicts(
  conflicts: readonly FsMoveConflict[]
): string {
  const names = conflicts.map((c) => `"${baseNameOf(c.to.relPath)}"`);
  const [only] = names;
  if (names.length === 1 && only !== undefined) {
    return `${only} already exists there. Replacing it moves the existing one to the Trash.`;
  }
  const head = names.slice(0, 3).join(', ');
  const rest = names.length > 3 ? `, and ${names.length - 3} more,` : '';
  return `${head}${rest} already exist there. Replacing them moves the existing ones to the Trash.`;
}
