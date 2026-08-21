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
import { OPEN_WITH_LABEL } from './open-with';
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
  /**
   * PHASE 90.3. The one sentence a remote row's menu ends with, or null for a
   * folder on this Mac.
   *
   * Its presence is what tells this function the rows are on another machine.
   * FOUR VERBS CROSS and the rest are absent, which is the split research 55
   * section 14.3 counted:
   *
   *  - Open and Open in New Tab cross, read only.
   *  - Copy Relative Path crosses unchanged, because a relative path is true on
   *    both computers.
   *  - Copy Path crosses with the machine in front of it.
   *  - Open With and Reveal in Finder are absent, because both start a program
   *    on this Mac against a file that is not here.
   *  - New File, New Folder, Rename and Duplicate are absent, because each
   *    needs a write script nobody has written.
   *  - Move to Trash is absent PERMANENTLY. `shell.trashItem` has no far side
   *    equal, and a remote `rm` would turn a recoverable delete into an
   *    unrecoverable one.
   *
   * PHASE 101 MOVED ONE OF THE FOUR. New File crosses on a machine a person has
   * let Tortie save on, under `remoteCreateFile` below. The other three stay
   * absent on every machine in both states, and Move to Trash stays absent
   * permanently for the reason above, which has not changed.
   *
   * The sentence itself is written once in src/renderer/app/machine-copy.ts and
   * this module never composes one.
   */
  readOnlyNote?: string | null;
  /**
   * PHASE 101. True when this machine carries a folder a person confirmed
   * Tortie may replace a file under, so New File crosses.
   *
   * IT IS ITS OWN FLAG RATHER THAN `mutate` FLIPPED TO TRUE, and the reason is
   * that `mutate` gates five verbs. Flipping it would put New Folder, Rename,
   * Duplicate and Move to Trash on the menu as well, and none of those has a
   * script on the far side. Absent, and false, both mean the same thing, which
   * is a folder on another machine that Tortie may not write into.
   */
  remoteCreateFile?: boolean;
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

/**
 * `openWith` is the Phase 39 submenu, already built by
 * `buildOpenWithSubmenu`. It is passed in rather than built here because it
 * needs an answer from main, and this function is pure. Null means the item
 * is not offered at all: an older preload without the channels, or a subject
 * that is not one openable file.
 */
export function buildTreeMenu(
  target: TreeMenuTarget,
  caps: TreeMenuCapabilities,
  actions: TreeMenuActions,
  openWith: (MenuItemSpec | 'sep')[] | null = null
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [];
  const { canonical, selection } = target;
  const single = selection.length === 1 ? selection[0] : undefined;
  const many = selection.length > 1;
  const isFolder = canonical !== null && isDirPath(canonical);
  // PHASE 90.3. A note means the rows are on another machine. Every verb that
  // writes, and every verb that starts a program on this Mac, is then absent
  // rather than disabled: a row nobody can use is noise on a 24 px menu, and
  // the one disabled line at the end says why once.
  const note = caps.readOnlyNote ?? null;
  const remote = note !== null;

  // -- open ----------------------------------------------------------------
  // The preview/pinned tab model is invisible until something says it out
  // loud (Phase 12.4): a single click recycles one italic tab, and a user who
  // never guesses the double-click reads that as "opening files is broken".
  // Naming both openings here is the teaching surface.
  if (canonical !== null && !isFolder && target.openable && !many) {
    items.push(
      { label: 'Open', run: () => actions.open(canonical, false) },
      { label: 'Open in New Tab', run: () => actions.open(canonical, true) }
    );
    // Open With sits with the two openings, under exactly their condition:
    // one file, not a folder, not a multi-row selection, and openable. A
    // folder, a socket, a FIFO or a device is not a document.
    if (openWith !== null && !remote) {
      items.push({
        label: OPEN_WITH_LABEL,
        submenu: openWith,
        // A parent item never fires on macOS; the id that comes back is
        // always a leaf's.
        run: () => undefined
      });
    }
    items.push('sep');
  }

  // -- create --------------------------------------------------------------
  // PHASE 101 SPLIT ONE BLOCK INTO TWO, and the split is the whole change.
  // The two items were pushed together under one condition, so a machine that
  // may take a new file would have taken a new folder with it, and there is no
  // script on the far side that makes a folder. They are two conditions now
  // and only the first of them crosses.
  const canCreateFile =
    (caps.mutate && !remote) || (remote && caps.remoteCreateFile === true);
  if (canCreateFile) {
    items.push({
      label: 'New File…',
      run: () => actions.newEntry(target.destDir, 'file')
    });
  }
  if (caps.mutate && !remote) {
    items.push({
      label: 'New Folder…',
      run: () => actions.newEntry(target.destDir, 'dir')
    });
  }

  // -- edit ----------------------------------------------------------------
  if (caps.mutate && !remote && single !== undefined) {
    items.push('sep', {
      label: 'Rename…',
      hint: 'F2',
      run: () => actions.rename(single)
    });
    if (caps.duplicate) {
      items.push({ label: 'Duplicate', run: () => actions.duplicate(single) });
    }
  }

  if (caps.mutate && !remote && selection.length > 0) {
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
  const canLocate =
    caps.reveal && !remote && revealTarget !== undefined && revealTarget !== null;
  if (canLocate) {
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

  // -- the one line that says why the rest is not here ----------------------
  // It is DISABLED, so it cannot be pressed, and it is last, so it reads as a
  // footnote rather than as a verb. An empty menu would be the alternative, and
  // a person right clicking a row deserves an answer.
  if (remote && note !== null && items.length > 0) {
    items.push('sep', { label: note, disabled: true, run: () => undefined });
  }

  return items;
}

/** Exported for the test — the plural noun is copy, and copy regresses. */
export { countedNoun };

/**
 * Clipboard text for a Copy Path / Copy Relative Path pick.
 *
 * PHASE 90.3 ADDED `machineLabel`. An absolute path from a tab on another
 * machine is pasted with that machine's own label and a colon in front of it,
 * e.g. `mac-pro:/Users/gdc/gmux/src`. A bare absolute path would name a folder
 * on THIS Mac when it is pasted into a terminal here, which is the one way this
 * verb could quietly point at the wrong computer.
 *
 * A RELATIVE path is unchanged, and that is deliberate. A relative path is true
 * on both computers, so putting a machine in front of it would make a true
 * string less useful.
 */
export function pathsForClipboard(
  rootPath: string,
  canonicals: readonly string[],
  relative: boolean,
  machineLabel: string | null = null
): string {
  return canonicals
    .map((canonical) => {
      const rel = canonical.endsWith('/') ? canonical.slice(0, -1) : canonical;
      if (relative) return rel;
      const abs = rel.length === 0 ? rootPath : `${rootPath}/${rel}`;
      return machineLabel === null ? abs : `${machineLabel}:${abs}`;
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
