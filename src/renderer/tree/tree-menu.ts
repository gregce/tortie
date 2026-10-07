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

import type { FsImportConflict, FsMoveConflict } from '@shared/fs-ops';
import type { MenuItemSpec } from '../state/store';
import { menuGlyph } from '../icons';
import { OPEN_WITH_LABEL } from './open-with';
import { baseNameOf, isDirPath, toRel } from './tree-paths';

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
  /**
   * PHASE 343. True when the right-clicked row, or any row of the selection
   * the verbs act on, sits UNDER a link (strictly below a link drawn as a
   * folder). From the Explorer, through a link, Tortie reads and never writes,
   * so every verb that writes is absent and the menu ends with
   * `LINK_READ_ONLY_NOTE`. The link row itself is not under a link and keeps
   * every item it had. Absent reads as false, as the remote flags below do.
   */
  underLink?: boolean;
  /**
   * PHASE 343 (its fix round). True when the right-clicked row is a LINK drawn
   * as a folder. Before this phase that row was drawn as a leaf, so it carried
   * the file rows' Open With and History, and both worked: Open With handed the
   * linked folder to another app, and History showed the link's own commits.
   * A folder row offers neither, so this flag keeps both on the link row, each
   * aimed at the LINK's own spelling (`.claude/skills`, never `.claude/skills/`),
   * exactly as before. Open and Open in New Tab are not kept: on a link to a
   * folder they opened a tab that could not be read, and a click on the row now
   * opens the folder. Absent reads as false.
   */
  linkRow?: boolean;
}

/**
 * PHASE 343. The one disabled line a menu over a row under a link ends with,
 * on either computer. On another machine it REPLACES the machine's own note
 * rather than standing beside it: one footnote, never two.
 */
export const LINK_READ_ONLY_NOTE = 'Read only through a link';

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
   * WHAT CROSSES, counted after Phase 102 rather than described:
   *
   *  - Open and Open in New Tab cross, read only.
   *  - Copy Relative Path crosses unchanged, because a relative path is true on
   *    both computers.
   *  - Copy Path crosses with the machine in front of it.
   *  - New File crosses in a folder Tortie may write under on that machine
   *    (since Phase 336, any project open on a confirmed machine, outside the
   *    folders it never writes in; until then, the folder a person typed in
   *    Settings), under `remoteCreateFile` below. Phase 101 shipped it.
   *  - New Folder and Rename cross under the same condition, under
   *    `remoteWriteEntries` below. Phase 102 shipped both.
   *  - Duplicate is absent. It has no script on the far side and research 57
   *    section 12 leaves it out of this round.
   *  - Open With and Reveal in Finder are absent, because both start a program
   *    on this Mac against a file that is not here.
   *  - Move to Trash is absent PERMANENTLY. `shell.trashItem` has no far side
   *    equal, and a remote `rm` would turn a recoverable delete into an
   *    unrecoverable one.
   *  - PHASE 343. On a row UNDER A LINK nothing that writes crosses, on either
   *    computer: New File, New Folder, Rename, Duplicate, Move to Trash and
   *    History are absent, and `LINK_READ_ONLY_NOTE` replaces this sentence.
   *    The LINK ROW itself keeps every verb it had, Open With and History
   *    included (`TreeMenuTarget.linkRow`).
   *
   * The sentence itself is written once in src/renderer/machines/explorer.ts and
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
  /**
   * PHASE 102. True when this machine carries a confirmed folder AND this
   * build can reach the two entry channels, so New Folder and Rename cross.
   *
   * IT IS A SECOND FLAG RATHER THAN A WIDER `remoteCreateFile`. New File is
   * gated on the same confirmed folder and it shipped a phase earlier, and its
   * tests read it by name. Absent, and false, both mean the same thing, which
   * is a folder on another machine whose entries Tortie may not change.
   */
  remoteWriteEntries?: boolean;
}

export interface TreeMenuActions {
  open(canonical: string, keep: boolean): void;
  /**
   * Phase 198. Open the file for keeps and show its history in the Source
   * Control view's File history section, which follows the active tab.
   */
  history(canonical: string): void;
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
  // PHASE 343. A row under a link, or a selection holding one. Every verb that
  // writes is absent rather than disabled, for the reason the remote note gives
  // above, and History too, because `git log` through a link prints nothing
  // with exit 0, which would read as a file with no history (measured, A8).
  const underLink = target.underLink === true;

  // Open With and History, built once for the two rows that carry them: one
  // openable file (below) and (PHASE 343) the link row drawn as a folder.
  const openWithItem = (): MenuItemSpec | null =>
    openWith !== null && !remote
      ? {
          label: OPEN_WITH_LABEL,
          // A CHOSEN mark, and one reason covers all six rows that wear it. It
          // hands the file to a program outside Tortie, which is the same
          // journey `Reveal in Finder` makes below and the same mark.
          ...menuGlyph('link-external'),
          submenu: openWith,
          // A parent item never fires on macOS; the id that comes back is
          // always a leaf's.
          run: () => undefined
        }
      : null;
  // PHASE 198. Absent for a folder on another machine, because the walk runs
  // git on this Mac against a repository that is not here; and (PHASE 343)
  // absent under a link, because `git log` past a link prints nothing.
  const historyItem = (subject: string): MenuItemSpec | null =>
    !remote && !underLink
      ? {
          label: 'History',
          // The mark the View menu's File History row wears, and the one the
          // codicon set binds to a history.
          ...menuGlyph('history'),
          run: () => actions.history(subject)
        }
      : null;

  // -- open ----------------------------------------------------------------
  // The preview/pinned tab model is invisible until something says it out
  // loud (Phase 12.4): a single click recycles one italic tab, and a user who
  // never guesses the double-click reads that as "opening files is broken".
  // Naming both openings here is the teaching surface.
  if (canonical !== null && !isFolder && target.openable && !many) {
    items.push(
      {
        label: 'Open',
        // A CHOSEN mark: no surface draws `go-to-file`. Its reason, and the
        // reason for every other chosen mark, is in the table in
        // src/renderer/icons/codicon-menu-icon.ts.
        ...menuGlyph('go-to-file'),
        run: () => actions.open(canonical, false)
      },
      {
        label: 'Open in New Tab',
        // A CHOSEN mark. The one difference between these two rows is that
        // the second keeps the tab, which is what VS Code's own vocabulary and
        // this codicon both call pinning. The glyph is the only place a menu
        // can say it.
        ...menuGlyph('pin'),
        run: () => actions.open(canonical, true)
      }
    );
    // Open With sits with the two openings, under exactly their condition:
    // one file, not a folder, not a multi-row selection, and openable. A
    // folder, a socket, a FIFO or a device is not a document.
    const withApp = openWithItem();
    if (withApp !== null) items.push(withApp);
    // PHASE 198. History sits with the openings because it IS one: the file
    // opens for keeps and the sidebar switches to Source Control, where the
    // File history section follows the tab that just opened. Under Open's
    // own gate, one file and not a folder, because git follows one file.
    const history = historyItem(canonical);
    if (history !== null) items.push(history);
    items.push('sep');
  } else if (canonical !== null && target.linkRow === true && !many) {
    // PHASE 343 (its fix round). The link row keeps the two items it carried
    // when it was drawn as a leaf, aimed at the link's own spelling: Open With
    // hands the linked folder to another app, and History follows the link's
    // own commits (`git log -- .claude/skills`), as they did before this phase.
    const leaf = toRel(canonical);
    const before = items.length;
    const withApp = openWithItem();
    if (withApp !== null) items.push(withApp);
    const history = historyItem(leaf);
    if (history !== null) items.push(history);
    if (items.length > before) items.push('sep');
  }

  // -- create --------------------------------------------------------------
  // PHASE 101 SPLIT ONE BLOCK INTO TWO, and the split is why both items can be
  // reasoned about on their own. The two were pushed together under one
  // condition, so a machine that may take a new file would have taken a new
  // folder with it, and no script on the far side made a folder.
  //
  // PHASE 102 TURNED THE SECOND ONE ON, under its own flag. The two conditions
  // stay separate, because the two flags are separate and a build may set one
  // without the other.
  const canCreateFile =
    !underLink &&
    ((caps.mutate && !remote) || (remote && caps.remoteCreateFile === true));
  const canCreateFolder =
    !underLink &&
    ((caps.mutate && !remote) || (remote && caps.remoteWriteEntries === true));
  if (canCreateFile) {
    items.push({
      label: 'New File…',
      // The Explorer header's own two buttons, which do exactly these two
      // things and draw exactly these two glyphs.
      ...menuGlyph('new-file'),
      run: () => actions.newEntry(target.destDir, 'file')
    });
  }
  if (canCreateFolder) {
    items.push({
      label: 'New Folder…',
      ...menuGlyph('new-folder'),
      run: () => actions.newEntry(target.destDir, 'dir')
    });
  }

  // -- edit ----------------------------------------------------------------
  // PHASE 102 SPLIT THIS BLOCK TOO. Rename crosses on a machine with a
  // confirmed folder and Duplicate does not, so the two verbs no longer share
  // one condition. Duplicate keeps the local one, because it has no script on
  // the far side.
  const canRename =
    !underLink &&
    ((caps.mutate && !remote) || (remote && caps.remoteWriteEntries === true));
  if (canRename && single !== undefined) {
    items.push('sep', {
      label: 'Rename…',
      // A CHOSEN mark, shared by all three Rename rows in the product. Rename
      // is the one verb here that changes a name in place, and `edit` is the
      // pencil the codicon set binds to editing a value in place.
      ...menuGlyph('edit'),
      hint: 'F2',
      run: () => actions.rename(single)
    });
  }
  if (
    caps.mutate &&
    !remote &&
    !underLink &&
    single !== undefined &&
    caps.duplicate
  ) {
    items.push({
      label: 'Duplicate',
      // A second copy of the file on disk, which is the same idea the copy
      // glyph carries everywhere else, applied to bytes instead of text.
      ...menuGlyph('copy'),
      run: () => actions.duplicate(single)
    });
  }

  if (caps.mutate && !remote && !underLink && selection.length > 0) {
    items.push('sep', {
      // Honest label: gmux never unlinks. `shell.trashItem` is the only
      // deletion in the app, so the menu says where the file is going.
      label: many
        ? `Move ${countedNoun(selection)} to Trash`
        : 'Move to Trash',
      // The one row in this menu that reaches the Trash, and the one glyph in
      // the set that draws it. It stays destructive, because the confirm
      // behind it is where the red lives.
      ...menuGlyph('trash'),
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
      // It hands the file to Finder, so it wears the glyph this app uses for
      // leaving Tortie. Every `Reveal in Finder` row in the product wears it.
      ...menuGlyph('link-external'),
      run: () => actions.reveal(revealTarget)
    });
  }
  if (selection.length > 0) {
    locate.push(
      {
        label: many ? 'Copy Paths' : 'Copy Path',
        ...menuGlyph('copy'),
        run: () => actions.copyPaths(selection, false)
      },
      {
        label: many ? 'Copy Relative Paths' : 'Copy Relative Path',
        ...menuGlyph('copy'),
        run: () => actions.copyPaths(selection, true)
      }
    );
  } else if (canonical === null) {
    // Root menu: the project folder itself is still worth reaching.
    locate.push({
      label: 'Copy Path',
      ...menuGlyph('copy'),
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
  //
  // PHASE 343. ONE footnote. Under a link it is the link's line on either
  // computer, and on another machine it REPLACES the machine's note: the link
  // is the nearer reason, and two disabled lines would be noise.
  const footnote = underLink ? LINK_READ_ONLY_NOTE : remote ? note : null;
  if (footnote !== null && items.length > 0) {
    items.push('sep', { label: footnote, disabled: true, run: () => undefined });
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
/**
 * PHASE 154. The same sentence for a drop from OUTSIDE the project.
 *
 * It is a second function rather than a widened `describeConflicts` because
 * the two answers name different things. A move conflict carries the entry
 * that cannot land, which is a row inside the project. An import conflict
 * carries only the incoming NAME, because the thing being brought in has no
 * path inside the project at all and never will until it lands. What both
 * sentences do share is the promise at the end, which is the one that matters:
 * replacing sends the existing entry to the Trash rather than away.
 */
export function describeImportConflicts(
  conflicts: readonly FsImportConflict[]
): string {
  const names = conflicts.map((c) => `"${c.name}"`);
  const [only] = names;
  if (names.length === 1 && only !== undefined) {
    return `${only} already exists there. Replacing it moves the existing one to the Trash.`;
  }
  const head = names.slice(0, 3).join(', ');
  const rest = names.length > 3 ? `, and ${names.length - 3} more,` : '';
  return `${head}${rest} already exist there. Replacing them moves the existing ones to the Trash.`;
}

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
