/**
 * THE EDITOR'S RIGHT-CLICK MENU, composed as DATA (Phase 241).
 *
 * Until this phase the editor was the ONE surface in Tortie where a right
 * click did nothing. `MonacoHost.tsx` sets `contextmenu: false` with the
 * comment "context menus are native-only in gmux (DESIGN §3)", and nothing
 * native was ever put in its place, while the tree, the terminal, the search
 * results, the tabs, the sidebar and the split all answer one. That option
 * does not move — Monaco's own menu is a DOM menu and DESIGN §3 forbids it —
 * and this file is the native menu that goes in its place, through the same
 * `ui:popupMenu` bridge ../tree/tree-menu.ts, ../terminal/terminal-menu.ts
 * and ../search/result-menu.ts already compose against.
 *
 * Pure, so the shape of the menu is testable without a Monaco, a bridge or a
 * native menu: it returns the same `MenuItemSpec[]` the store's `setMenu`
 * takes everywhere else.
 *
 * ## THE RULING THIS FILE ENCODES
 *
 * The operator's second instruction of 2026-09-08, beside a photograph of
 * Cursor's editor menu: *"we should probably have a right click menu in
 * general, that allows you to use the capabilities monaco already supports and
 * the dynamic stuff like in issue 17 that is queued… **We should just support
 * what we already do if possible.**"* So no row here reaches a capability this
 * phase built. Every one is a Monaco action already compiled into the bundle,
 * a Tortie verb that already exists somewhere else in the product, or one of
 * the three reshapes in ./reshape.ts.
 *
 * ## THREE GROUPS DRAWN, AND A FOURTH THAT IS EMPTY ON PURPOSE
 *
 * **A, the reshapes, and it is the only DYNAMIC group.** A row is drawn only
 * when it applies to what is under the cursor, which is his word *dynamic*.
 * A MENU WITH NOTHING TO RESHAPE DRAWS NO GROUP A AND NO SEPARATOR FOR IT: an
 * empty section, or a greyed row, is the "TONS of words, bad" failure in menu
 * form.
 *
 * **B, the Monaco actions.** All eleven were pressed in the live editor and
 * all eleven work (docs/research/101 §1). Six of them — Cut, Copy, Paste,
 * Undo, Redo and Select All — are INVISIBLE to `getSupportedActions()`,
 * because Monaco registers the clipboard three as `MultiCommand`s and the
 * other three as core editor commands, and `trigger` falls through to both
 * after `getAction` misses. Deriving this list from that method, which is what
 * the entry first proposed, would have deleted six live rows.
 *
 * **C, the Tortie verbs that already exist elsewhere**, reached through their
 * existing call sites and never re-implemented. *Reveal in Explorer* was
 * looked for and DOES NOT EXIST anywhere in the product, so the row is dropped
 * rather than built, which is the entry's own rule.
 *
 * **D is the Cursor rows Tortie does not have, and it is empty on purpose.**
 * No *Add Symbol to Chat* and no *Add Symbol to New Chat*, because Tortie has
 * no chat and an agent is a terminal session. No *Create Rule*. No *Refactor…*
 * and no *Go to Definition*, because both need a language server and the scope
 * guardrail refuses LSP by name. No *Open on Remote (Web)* and no *Share*,
 * because neither has a host to point at. No *Copy As* submenu. And no command
 * palette, because this product has none and building one is a phase rather
 * than a row.
 *
 * ## NO MARK ON ANY ROW, argued rather than omitted
 *
 * src/main/menu.ts makes the same argument for the Edit menu, and this menu is
 * mostly that menu: the seven roles are AppKit's own and every Mac app draws
 * them bare. It is stronger here. The set in src/shared/menu-codicons.ts has
 * no cut, no undo, no redo, no fold, no unfold and no reformat mark at all, so
 * marking the minority would say the unmarked rows are lesser, and the surface
 * the operator's photograph shows draws no icons either.
 *
 * ## READ-ONLY IS ABSENCE, NOT GREY
 *
 * A deleted file, a truncated one, a past commit and a file on a machine
 * Tortie may not write to are not edit surfaces (`tabIsReadOnly` in
 * ./MonacoHost.tsx). Every row that would mutate is then ABSENT rather than
 * disabled, which is the rule ../tree/tree-menu.ts follows for a remote row: a
 * row nobody can use is noise on a 24 px menu.
 */

import type { MenuItemSpec } from '../state/store';
import { acceleratorToDisplay, keyDisplay } from '@shared/keymap';

/** The three reshapes, and the id ./use-editor-menu.ts applies each by. */
export type ReshapeRowId = 'table' | 'json-format' | 'json-minify';

/** One Monaco row: what it says, what `trigger` is given, and what it costs. */
export interface MonacoRow {
  label: string;
  /** The id handed to `editor.trigger('gmux-menu', id, null)`. */
  action: string;
  /** Right-hand keycap, only where Tortie's own keymap or an AppKit role
   *  guarantees the chord. Monaco's own ⌘F2, ⌃G and ⌥⌘[ are its keybinding
   *  service's, not Tortie's, so those four rows carry no hint rather than a
   *  promise this product does not make. */
  hint?: string;
  /** True for a row that changes the text, so it is absent when read-only. */
  mutates: boolean;
}

/**
 * GROUP B, as one table, so the menu, its test and the app run's per-row
 * matrix cannot disagree about which ids this product presses.
 */
export const MONACO_ROWS: readonly MonacoRow[] = [
  { label: 'Undo', action: 'undo', hint: acceleratorToDisplay('Cmd+Z'), mutates: true },
  {
    label: 'Redo',
    action: 'redo',
    hint: acceleratorToDisplay('Shift+Cmd+Z'),
    mutates: true
  },
  {
    label: 'Cut',
    action: 'editor.action.clipboardCutAction',
    hint: acceleratorToDisplay('Cmd+X'),
    mutates: true
  },
  {
    label: 'Copy',
    action: 'editor.action.clipboardCopyAction',
    hint: acceleratorToDisplay('Cmd+C'),
    mutates: false
  },
  {
    label: 'Paste',
    action: 'editor.action.clipboardPasteAction',
    hint: acceleratorToDisplay('Cmd+V'),
    mutates: true
  },
  {
    label: 'Select All',
    action: 'editor.action.selectAll',
    hint: acceleratorToDisplay('Cmd+A'),
    mutates: false
  },
  { label: 'Find', action: 'actions.find', hint: keyDisplay('editor.find'), mutates: false },
  {
    // It only makes cursors; the reason a person asks for them is to type
    // over every one at once, so it is absent on a tab that takes no
    // keystroke rather than offering multi-cursor that can do nothing.
    label: 'Change All Occurrences',
    action: 'editor.action.changeAll',
    mutates: true
  },
  { label: 'Go to Line…', action: 'editor.action.gotoLine', mutates: false },
  { label: 'Fold', action: 'editor.fold', mutates: false },
  { label: 'Unfold', action: 'editor.unfold', mutates: false }
];

/** What is under the cursor, with the dynamic half already decided. */
export interface EditorMenuTarget {
  /** The reshapes that apply RIGHT NOW. Empty draws no Group A at all. */
  reshapes: readonly ReshapeRowId[];
  /** The tab takes an edit. False drops every mutating row and Save. */
  writable: boolean;
  /** Phase 198's walk runs git on THIS Mac, so a remote file has no History. */
  historyAvailable: boolean;
}

export interface EditorMenuActions {
  reshape(id: ReshapeRowId): void;
  trigger(action: string): void;
  history(): void;
  copyPath(relative: boolean): void;
  save(): void;
}

/** The label each reshape row wears. Exported so the test names one thing. */
export const RESHAPE_LABELS: Record<ReshapeRowId, string> = {
  table: 'Format Table',
  'json-format': 'Format JSON',
  'json-minify': 'Minify JSON'
};

export function buildEditorMenu(
  target: EditorMenuTarget,
  actions: EditorMenuActions
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [];

  // -- A, the reshapes -----------------------------------------------------
  // No row, no separator. `reshapes` is already empty on a read-only tab,
  // because a reshape writes.
  for (const id of target.reshapes) {
    items.push({ label: RESHAPE_LABELS[id], run: () => actions.reshape(id) });
  }
  if (items.length > 0) items.push('sep');

  // -- B, what Monaco already does ----------------------------------------
  for (const row of MONACO_ROWS) {
    if (row.mutates && !target.writable) continue;
    items.push({
      label: row.label,
      ...(row.hint === undefined ? {} : { hint: row.hint }),
      run: () => actions.trigger(row.action)
    });
  }

  // -- C, what Tortie already does ----------------------------------------
  const tortie: (MenuItemSpec | 'sep')[] = [];
  if (target.historyAvailable) {
    tortie.push({ label: 'History', run: () => actions.history() });
  }
  tortie.push(
    { label: 'Copy Path', run: () => actions.copyPath(false) },
    { label: 'Copy Relative Path', run: () => actions.copyPath(true) }
  );
  if (target.writable) {
    tortie.push({
      label: 'Save',
      hint: keyDisplay('editor.save'),
      run: () => actions.save()
    });
  }
  if (tortie.length > 0) {
    if (items.length > 0) items.push('sep');
    items.push(...tortie);
  }

  return items;
}
