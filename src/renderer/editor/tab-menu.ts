/**
 * The editor tab strip's context menu, composed as DATA.
 *
 * PHASE 235 SPLIT IT OUT OF `EditorTabs.tsx`, where it was an unexported
 * function forty lines above its one caller and so could be pinned by nothing.
 * `src/renderer/tree/tree-menu.ts` is the house shape for exactly this job and
 * this file follows it: pure composition over a target, the capabilities the
 * build actually has, and injected actions, so a test reads the menu without
 * rendering the strip or raising a native menu.
 *
 * THE ONE THING IT ADDED IN THE SAME MOVE IS THE MACHINE. A tab can show a file
 * that lives on another computer — `EditorTab.remote` has carried that since
 * Phase 73 — and this menu never read the field. Two verbs were wrong because
 * of it, and the two answers are the ones the Explorer, Recents and Context
 * already give for the same question:
 *
 *  - **Reveal in Finder is ABSENT**, not disabled. Finder is on THIS Mac and
 *    the file is not, and both machines' home is `/Users/gdc`, so a colliding
 *    path revealed the wrong file rather than nothing. `tree-menu.ts:283`,
 *    `recent-menu.ts:60` and `context/menus.ts:75` each build no reveal row at
 *    all on a remote target, and an absent verb is one fewer menu item rather
 *    than a dead one.
 *  - **Copy Path carries the machine in front of it**, through
 *    `pathsForClipboard`, which is the Explorer's own composer and takes the
 *    label as its fourth argument. A bare absolute path names a folder on THIS
 *    Mac when it is pasted into a terminal here. Copy Relative Path is
 *    unchanged, because a relative path is true on both computers — that rule
 *    is `pathsForClipboard`'s own and is not restated here.
 *
 * No sentence is added to a remote tab's menu. The two menus differ by one
 * absent row and by what one verb copies, which is what the Explorer's two
 * menus already differ by.
 */

import { keyDisplay } from '@shared/keymap';
import type { MenuItemSpec } from '../state/store';
import { menuGlyph } from '../icons';
import { pathsForClipboard } from '../tree/tree-menu';

/** What was right-clicked: the fields of an `EditorTab` this menu reads. */
export interface TabMenuTarget {
  /** Absolute path, and on a remote tab it is a path on the other computer. */
  path: string;
  /** The same file relative to its project root. True on both computers. */
  relPath: string;
  /** A preview tab is the one that offers Keep Open. */
  preview: boolean;
  /** A deleted file cannot be revealed. */
  deleted: boolean;
  /** Present on the architecture map tab, whose path IS the repository root. */
  archMap?: unknown;
  /** Present on the diagnostics report tab, for the same reason. */
  diagnostics?: unknown;
  /**
   * Present when the file lives on another computer, carrying that machine's
   * own label. It is read for both of the answers in this file's header.
   */
  remote?: { machineLabel: string } | undefined;
}

/** What this build can do, and where this tab sits in the strip. */
export interface TabMenuCapabilities {
  /** How many tabs the strip holds — Close Others needs two. */
  tabCount: number;
  /** This tab's index in the strip, or -1 when it is not in it. */
  index: number;
  /** Whether any tab is saved, which is what Close Saved would close. */
  anySaved: boolean;
  /** Whether the fs bridge has a reveal at all (preload feature detection). */
  reveal: boolean;
}

/** The verbs, injected so the composition stays pure. */
export interface TabMenuActions {
  close(): void;
  closeOthers(): void;
  closeToRight(): void;
  closeSaved(): void;
  closeAll(): void;
  pin(): void;
  /** Put text on the clipboard. The text is composed here. */
  copyText(text: string): void;
  /** Hand a path on THIS Mac to Finder. Never called for a remote tab. */
  reveal(path: string): void;
}

/**
 * What Copy Path and Copy Relative Path put on the clipboard.
 *
 * It is `pathsForClipboard`, the Explorer's own composer, called the way the
 * Explorer's ROOT menu calls it — with the absolute path as the root and one
 * empty canonical — so the machine prefix is composed in exactly one place in
 * the product. Writing a second prefixer here is the defect the growth
 * guardrail names.
 */
export function tabClipboardPath(tab: TabMenuTarget, relative: boolean): string {
  return pathsForClipboard(
    relative ? '' : tab.path,
    relative ? [tab.relPath] : [''],
    relative,
    relative || tab.remote === undefined ? null : tab.remote.machineLabel
  );
}

/** The strip's menu for one tab. */
export function buildTabMenu(
  tab: TabMenuTarget,
  caps: TabMenuCapabilities,
  actions: TabMenuActions
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [
    {
      label: 'Close',
      // Every one of the five closes wears the × the tab itself draws, which
      // is the glyph a person is already pointing at when they open this menu.
      // The label is what says how many tabs go.
      ...menuGlyph('close'),
      hint: keyDisplay('editor.close'),
      run: () => actions.close()
    },
    {
      label: 'Close Others',
      ...menuGlyph('close'),
      disabled: caps.tabCount < 2,
      run: () => actions.closeOthers()
    },
    {
      label: 'Close to the Right',
      ...menuGlyph('close'),
      disabled: caps.index === -1 || caps.index === caps.tabCount - 1,
      run: () => actions.closeToRight()
    },
    {
      label: 'Close Saved',
      ...menuGlyph('close'),
      disabled: !caps.anySaved,
      run: () => actions.closeSaved()
    },
    { label: 'Close All', ...menuGlyph('close'), run: () => actions.closeAll() },
    'sep'
  ];
  if (tab.preview) {
    items.push({
      label: 'Keep Open',
      // Keeping a preview tab is the same act `Open in New Tab` names in the
      // tree and in search, and it wears the same mark.
      ...menuGlyph('pin'),
      run: () => actions.pin()
    });
    items.push('sep');
  }
  items.push({
    label: 'Copy Path',
    ...menuGlyph('copy'),
    run: () => actions.copyText(tabClipboardPath(tab, false))
  });
  // Phase 160: the map tab's path IS the repository root, so Copy Path already
  // says everything and a relative path of nothing would copy an empty string.
  // Phase 163: the report tab's path is a project root for the same reason.
  if (tab.archMap === undefined && tab.diagnostics === undefined) {
    items.push({
      label: 'Copy Relative Path',
      ...menuGlyph('copy'),
      run: () => actions.copyText(tabClipboardPath(tab, true))
    });
  }
  // PHASE 235. Absent on another machine, per this file's header. The disabled
  // form stays for the two reasons that are about THIS Mac: a build whose
  // preload has no reveal, and a file that is no longer there.
  if (tab.remote === undefined) {
    items.push({
      label: 'Reveal in Finder',
      ...menuGlyph('link-external'),
      disabled: !caps.reveal || tab.deleted,
      run: () => actions.reveal(tab.path)
    });
  }
  return items;
}
