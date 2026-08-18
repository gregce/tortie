/**
 * THE keymap — every gmux shortcut, defined once, as data.
 *
 * WHY THIS FILE EXISTS: shortcuts used to live in three hand-maintained
 * places — the ⌘/ overlay's `GROUPS` array, the Settings recorder's
 * `RESERVED_APP_CHORDS` table, and the accelerator string literals in
 * src/main/menu.ts. They drifted, which is how the ⇧↩ row went missing when
 * Phase 12.5 shipped it and how ⇧⌘N (New project) never became a reserved
 * chord the recorder would refuse. All three now RENDER FROM `KEYMAP`.
 *
 * THE CONTRACT, and it binds every future phase: **adding or changing a
 * shortcut is a one-line change to `KEYMAP` and nothing else.** No surface
 * may keep its own list. If you find yourself typing a chord string into a
 * component, a menu template, or a tooltip, you are creating the next drift —
 * add it here and read it back with `accelerator()` / `keyDisplay()`.
 *
 * Two fields carry the words, and they are not interchangeable:
 *  - `action` — the short scannable label (≤ ~24 chars). It is what the ⌘/
 *    overlay shows, and what the recorder's "Already used by <x>" names.
 *  - `explain` — one plain-language sentence saying what the shortcut does
 *    and, where it matters, when it applies. This is the Settings explainer.
 *
 * Chords are canonical Electron accelerators ("Shift+Cmd+E" — modifiers in
 * Ctrl → Alt → Shift → Cmd order) so one string serves the native menu, the
 * conflict table, and the keycap glyphs. A chord with `accelerator: null` is
 * display-only: ↑↓, S, and the "…" that stands in for ⌘2…⌘7.
 *
 * GROUPS are the six from the Phase 12.12 spec. App-level chords (⌘/, ⌘,
 * Esc, ⌘Q) sit at the end of "Views & layout" rather than earning a seventh
 * group — deliberate, so the spec's grouping stays the grouping.
 */

import type { AnyMenuActionWithProjects } from './ipc';

// ---------------------------------------------------------------------------
// Accelerator primitives — the single implementation.
//
// These used to live in src/renderer/settings/chords.ts, which the main
// process cannot import. They moved here so the menu, the recorder, and the
// keycaps all spell a chord the same way; chords.ts re-exports them, so every
// existing import keeps working.
// ---------------------------------------------------------------------------

const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Cmd'] as const;

/** Re-order any accelerator's modifiers into the canonical form. */
export function normalizeAccelerator(accel: string): string {
  const tokens = accel.split('+');
  const key = tokens[tokens.length - 1] ?? '';
  const mods = new Set(tokens.slice(0, -1));
  const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
  return [...ordered, key].join('+');
}

/**
 * Non-letter keys that have a glyph. Everything else prints as itself, which
 * is why letters and digits need no entry.
 *
 * Three keys deliberately print as WORDS, for the reason DESIGN.md §3 gives
 * for setting keycaps in sans rather than mono — a chip you have to squint at
 * is not a reminder. MEASURED on the ⌘/ overlay at 11px: ⇞ and ⇟ differ only
 * by the fill of a 6px arrowhead and were indistinguishable side by side, and
 * ␣ read as an empty chip with a rendering fault. PgUp / PgDn / Space cannot
 * be misread.
 */
const KEY_GLYPHS: Readonly<Record<string, string>> = {
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Enter: '↩',
  Tab: '⇥',
  Backspace: '⌫',
  Delete: '⌦',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Escape: 'Esc',
  Plus: '+',
  Home: '↖',
  End: '↘'
};

/** "Shift+Cmd+C" → "⇧⌘C" — keycap text, in macOS glyph order ⌃⌥⇧⌘. */
export function acceleratorToDisplay(accel: string): string {
  const tokens = normalizeAccelerator(accel).split('+');
  const key = tokens[tokens.length - 1] ?? '';
  const mods = new Set(tokens.slice(0, -1));
  let out = '';
  if (mods.has('Ctrl')) out += '⌃';
  if (mods.has('Alt')) out += '⌥';
  if (mods.has('Shift')) out += '⇧';
  if (mods.has('Cmd')) out += '⌘';
  return out + (KEY_GLYPHS[key] ?? key);
}

/** True when a chord could collide with a user-recorded hotkey (⌘ or ⌃). */
function hasCommandModifier(accel: string): boolean {
  const mods = accel.split('+').slice(0, -1);
  return mods.includes('Cmd') || mods.includes('Ctrl');
}

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export const KEYMAP_GROUPS = [
  { id: 'sessions', title: 'Sessions' },
  { id: 'projects', title: 'Projects' },
  { id: 'terminal', title: 'Terminal & scrolling' },
  { id: 'editor', title: 'Editor & files' },
  { id: 'git', title: 'Git' },
  // Phase 14. Search earns its own group rather than being scattered through
  // "Views & layout" and "Editor & files": ⌘⇧F, ⌘⇧O, the three modifiers and
  // F4 are one mental model, and a cheat sheet that splits them across two
  // columns is a cheat sheet you have to read twice.
  { id: 'search', title: 'Search' },
  { id: 'views', title: 'Views & layout' }
] as const satisfies readonly { id: string; title: string }[];

export type KeymapGroup = (typeof KEYMAP_GROUPS)[number];
export type KeymapGroupId = KeymapGroup['id'];

/**
 * Where a chord applies. Not decoration: two entries may legitimately share
 * an accelerator when their scopes differ (⌃⇥ cycles projects everywhere and
 * editor tabs inside the editor), and the Settings map shows the scope so
 * that reads as intent rather than as a bug.
 */
export type KeymapScope =
  | 'app'
  | 'session'
  | 'terminal'
  | 'editor'
  | 'explorer'
  | 'git'
  | 'search'
  | 'palette';

export const SCOPE_LABELS: Readonly<Record<KeymapScope, string>> = {
  app: 'Anywhere',
  session: 'In the session list',
  terminal: 'In a session',
  editor: 'In the editor',
  explorer: 'In the file tree',
  git: 'In source control',
  search: 'In the search view',
  palette: 'In the go-to-file palette'
};

export interface KeymapChord {
  /** Canonical Electron accelerator, or null for a display-only token. */
  readonly accelerator: string | null;
  /** Keycap text (⌘⇧⌥⌃↩⇥ glyphs). */
  readonly display: string;
  /** 'key' renders as a chip; 'text' is connective tissue (the "…" range). */
  readonly kind: 'key' | 'text';
}

export type KeymapSource = 'built-in' | 'user-assigned';

export interface KeymapEntry {
  /** Stable id — `<domain>.<verb>`. Referenced by menus, tooltips, tests. */
  readonly id: string;
  readonly keys: readonly KeymapChord[];
  /** Short scannable label — overlay rows, conflict messages. */
  readonly action: string;
  /** One plain sentence — the Settings explainer. */
  readonly explain: string;
  readonly group: KeymapGroupId;
  readonly scope: KeymapScope;
  /** True only for rows the user can re-record (per-agent session hotkeys). */
  readonly assignable: boolean;
  readonly source: KeymapSource;
  /** The native menu item that mirrors this, when one exists. */
  readonly menuAction?: AnyMenuActionWithProjects;
  /** Render the chords as `first … last` instead of listing every one. */
  readonly collapseRange?: boolean;
}

/** A chord that is a real accelerator. */
function k(accelerator: string): KeymapChord {
  const canonical = normalizeAccelerator(accelerator);
  return {
    accelerator: canonical,
    display: acceleratorToDisplay(canonical),
    kind: 'key'
  };
}

/** A chord that is only ever shown, never registered (↑↓, S). */
function lit(display: string): KeymapChord {
  return { accelerator: null, display, kind: 'key' };
}

/** Connective text between chords — today only the ⌘1…⌘8 ellipsis. */
const ELLIPSIS: KeymapChord = { accelerator: null, display: '…', kind: 'text' };

// ---------------------------------------------------------------------------
// The keymap
// ---------------------------------------------------------------------------

export const KEYMAP = [
  // -- Sessions -------------------------------------------------------------
  {
    id: 'session.new',
    keys: [k('Cmd+T')],
    action: 'New session',
    explain:
      'Opens the new-session sheet for the project you are looking at, so you pick the agent and the name in one place.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'new-session'
  },
  {
    id: 'session.rename',
    keys: [k('F2')],
    action: 'Rename session',
    explain:
      'Renames the highlighted session, or the active one when the keyboard is in a terminal. Double-clicking the name does the same.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'rename-session'
  },
  {
    id: 'session.next',
    keys: [k('Alt+Cmd+Down')],
    action: 'Next session',
    explain:
      'Moves down the session list. Where a session is split, it steps to the split below first and only then to the next session.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'next-session'
  },
  {
    id: 'session.prev',
    keys: [k('Alt+Cmd+Up')],
    action: 'Previous session',
    explain:
      'Moves up the session list, stepping through splits on the way, the mirror of the shortcut above.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'prev-session'
  },
  {
    id: 'session.focusLeft',
    keys: [k('Alt+Cmd+Left')],
    action: 'Focus split left',
    explain:
      'Moves the keyboard to the split on the left. At the left edge nothing happens — it never wraps to another session.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'session.focusRight',
    keys: [k('Alt+Cmd+Right')],
    action: 'Focus split right',
    explain: 'Moves the keyboard to the split on the right.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'session.attention',
    keys: [k('Cmd+J')],
    action: 'Sessions needing input',
    explain:
      'Lists every session waiting on you across all projects, not just this one. Enter jumps to the session you pick.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'attention'
  },
  {
    id: 'session.focusTerminal',
    keys: [lit('↑↓'), k('Enter')],
    action: 'Focus the terminal',
    explain:
      'Arrow keys walk the session list; Return hands the keyboard to that session so you can type to the agent.',
    group: 'sessions',
    scope: 'session',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'session.end',
    keys: [],
    action: 'End session…',
    explain:
      'Deliberately has no shortcut. Ending a session lives in the menu and the row’s ⋯, and always asks first — nothing ends by accident.',
    group: 'sessions',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'end-session'
  },

  // -- Projects -------------------------------------------------------------
  {
    id: 'project.open',
    keys: [k('Cmd+O')],
    action: 'Open project…',
    explain:
      'Adds a folder as a project tab. Opening one that is already open just brings its tab forward.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'open-project'
  },
  {
    id: 'project.new',
    keys: [k('Shift+Cmd+N')],
    action: 'New project…',
    explain:
      'Creates the folder for you — pick where it goes and what it is called, optionally run git init, and it opens as a tab.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'new-project'
  },
  {
    id: 'project.switch',
    keys: [
      k('Cmd+1'),
      k('Cmd+2'),
      k('Cmd+3'),
      k('Cmd+4'),
      k('Cmd+5'),
      k('Cmd+6'),
      k('Cmd+7'),
      k('Cmd+8')
    ],
    collapseRange: true,
    action: 'Switch to project',
    explain:
      'Jumps to a project tab by its position in the strip. Hold ⌘ on its own and each tab shows its number.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'project.last',
    keys: [k('Cmd+9')],
    action: 'Last project',
    explain:
      'Always the rightmost tab, however many are open — the same convention browsers use, so the tail is never unreachable.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'project.next',
    keys: [k('Ctrl+Tab')],
    action: 'Next project',
    explain:
      'Steps to the next tab in strip order, wrapping at the end. Add ⇧ to go the other way.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'next-project'
  },
  {
    id: 'project.prev',
    keys: [k('Ctrl+Shift+Tab')],
    action: 'Previous project',
    explain: 'Steps to the previous tab in strip order, wrapping at the start.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'prev-project'
  },
  {
    id: 'project.close',
    keys: [],
    action: 'Close project…',
    explain:
      'Menu only, and it asks first. Closing a tab never ends the sessions inside it — they keep running.',
    group: 'projects',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'close-project'
  },

  // -- Terminal & scrolling -------------------------------------------------
  {
    id: 'terminal.copyOrInterrupt',
    keys: [k('Cmd+C')],
    action: 'Copy or interrupt',
    explain:
      'With text selected it copies. With nothing selected it sends the interrupt an agent reads as “stop” — the gesture you want when something runs away.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'terminal.selectAll',
    keys: [k('Cmd+A')],
    action: 'Select all output',
    explain: 'Selects everything on the session’s screen.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'terminal.clear',
    keys: [k('Cmd+K')],
    action: 'Clear the screen',
    explain:
      'Clears the visible screen and the session’s history. The agent itself is untouched and keeps running.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'terminal.scrollBack',
    keys: [k('Shift+PageUp')],
    action: 'Scroll back',
    explain:
      'Walks up the session’s history a screen at a time. Typing anything drops you back to the live end.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'terminal.scrollForward',
    keys: [k('Shift+PageDown')],
    action: 'Scroll forward',
    explain: 'Walks back down towards the live end of the output.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'terminal.newline',
    keys: [k('Shift+Enter')],
    action: 'New line in the prompt',
    explain:
      'Adds a line to what you are typing instead of sending it; Return still sends. Works with the agents that support multi-line input.',
    group: 'terminal',
    scope: 'terminal',
    assignable: false,
    source: 'built-in'
  },

  // -- Editor & files -------------------------------------------------------
  {
    id: 'editor.save',
    keys: [k('Cmd+S')],
    action: 'Save file',
    explain: 'Writes the file in the front editor tab to disk.',
    group: 'editor',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'save-file'
  },
  {
    id: 'editor.toggle',
    keys: [k('Cmd+E')],
    action: 'Show or hide the editor',
    explain:
      'Opens the editor on the file you had last, or puts it away and returns the keyboard to the session.',
    group: 'editor',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'toggle-editor'
  },
  {
    id: 'editor.nextTab',
    keys: [k('Shift+Cmd+]'), k('Alt+Cmd+Right')],
    action: 'Next editor tab',
    explain:
      'Moves along the tab strip in order. The ⌘⌥ form only applies while the keyboard is in the editor, so it never fights split focus.',
    group: 'editor',
    scope: 'editor',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'editor.prevTab',
    keys: [k('Shift+Cmd+[')],
    action: 'Previous editor tab',
    explain: 'Moves back along the tab strip; ⌘⌥← does the same in the editor.',
    group: 'editor',
    scope: 'editor',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'editor.recentTabs',
    keys: [k('Ctrl+Tab')],
    action: 'Recent editor tabs',
    explain:
      'Hold ⌃ and tap ⇥ to walk back through the files you were just in; let go to land on one. Add ⇧ to walk the other way.',
    group: 'editor',
    scope: 'editor',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'editor.close',
    keys: [k('Cmd+W')],
    action: 'Close editor tab',
    explain:
      'Closes the front editor tab and nothing else. ⌘W never closes a session, a project, or the window.',
    group: 'editor',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'close-editor-tab'
  },
  {
    id: 'editor.find',
    keys: [k('Cmd+F')],
    action: 'Find in file',
    explain: 'Opens the editor’s find bar for the file in front.',
    group: 'editor',
    scope: 'editor',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'files.open',
    keys: [k('Enter')],
    action: 'Open the file',
    explain:
      'Opens the highlighted file in the editor — as a diff against HEAD when it has changes. On a folder it expands or collapses it.',
    group: 'editor',
    scope: 'explorer',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'files.trash',
    keys: [k('Backspace')],
    action: 'Move to Trash',
    explain:
      'Sends the selected files to the macOS Trash after confirming, so anything you delete can be put back from Finder.',
    group: 'editor',
    scope: 'explorer',
    assignable: false,
    source: 'built-in'
  },

  // -- Git ------------------------------------------------------------------
  {
    id: 'git.commit',
    keys: [k('Cmd+Enter')],
    action: 'Commit staged',
    explain:
      'Commits what is staged using the message in the box, from anywhere in the source control view.',
    group: 'git',
    scope: 'git',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'git.stage',
    keys: [k('Space'), lit('S')],
    action: 'Stage or unstage file',
    explain:
      'Toggles the highlighted file between the Changes and Staged groups.',
    group: 'git',
    scope: 'git',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'git.openDiff',
    keys: [k('Enter')],
    action: 'Open diff',
    explain:
      'Opens the highlighted file’s diff against HEAD in the editor.',
    group: 'git',
    scope: 'git',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'git.selectAll',
    keys: [k('Cmd+A')],
    action: 'Select all changes',
    explain:
      'Selects every file in the list so one keystroke can stage or discard the lot.',
    group: 'git',
    scope: 'git',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'git.discard',
    keys: [k('Backspace')],
    action: 'Discard file…',
    explain:
      'Throws away the working-tree changes in the selected files. Always confirmed, because this one is not recoverable.',
    group: 'git',
    scope: 'git',
    assignable: false,
    source: 'built-in'
  },

  // -- Search ---------------------------------------------------------------
  {
    id: 'view.quickOpen',
    keys: [k('Cmd+P')],
    action: 'Go to file',
    explain:
      'Finds a file anywhere in the project by name or path — type the parts you remember, in order, and the matched letters are highlighted so you can see why a row is there. Enter opens it in the reusable preview tab, ⌘Enter keeps it. Add :412 to land on a line. Press ⌘P again to widen the search to every open project.',
    group: 'search',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'quick-open'
  },
  {
    id: 'quickOpen.open',
    keys: [k('Enter')],
    action: 'Open the highlighted file',
    explain:
      'Opens it in the reusable preview tab — the one that gets recycled by the next preview open — so walking a list of candidates does not leave a tab behind for each one.',
    group: 'search',
    scope: 'palette',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'quickOpen.keep',
    keys: [k('Cmd+Enter')],
    action: 'Open in a new tab',
    explain:
      'Opens the highlighted file for keeps instead of into the preview slot. Holding ⌘ while clicking the row does the same thing.',
    group: 'search',
    scope: 'palette',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'view.search',
    keys: [k('Shift+Cmd+F')],
    action: 'Search in project',
    explain:
      'Opens the Search view and puts the cursor in the box, seeded from whatever you had selected. Press it again inside the box to select what is there rather than closing the view.',
    group: 'search',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'show-search'
  },
  {
    id: 'view.symbols',
    keys: [k('Shift+Cmd+O')],
    action: 'Go to symbol',
    explain:
      'Jumps to a definition by name — functions, types, classes, struct fields. Starts on the file you are looking at; type # to search the whole project. The first use of a project builds its index in the background and says so.',
    group: 'search',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'go-to-symbol'
  },
  {
    id: 'search.matchCase',
    keys: [k('Alt+Cmd+C')],
    action: 'Match case',
    explain:
      'Makes the search case-sensitive. Only while the keyboard is inside the Search view, so it cannot fire while you are typing in a session.',
    group: 'search',
    scope: 'search',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'search.wholeWord',
    keys: [k('Alt+Cmd+W')],
    action: 'Match whole word',
    explain:
      'Only matches the query when it stands alone as a word, not inside a longer one.',
    group: 'search',
    scope: 'search',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'search.regex',
    keys: [k('Alt+Cmd+R')],
    action: 'Use regular expression',
    explain:
      'Treats the query as a regular expression. A one-character query is allowed in this mode, because a one-character pattern is a real one.',
    group: 'search',
    scope: 'search',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'search.nextResult',
    keys: [k('F4')],
    action: 'Next result',
    explain:
      'Steps to the next search result from anywhere and previews it, so you can walk a result set without leaving the editor.',
    group: 'search',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'search.prevResult',
    keys: [k('Shift+F4')],
    action: 'Previous result',
    explain: 'Steps back to the previous search result and previews it.',
    group: 'search',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },

  // -- Views & layout -------------------------------------------------------
  {
    id: 'view.explorer',
    keys: [k('Shift+Cmd+E')],
    action: 'Explorer',
    explain:
      'Shows the file tree, opening the sidebar if it was collapsed. Press it again while the tree has focus to hand the keyboard back to the session.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'show-explorer'
  },
  {
    id: 'view.scm',
    keys: [k('Ctrl+Shift+G')],
    action: 'Source control',
    explain: 'Shows branches, changes and history, the same open-then-focus way.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'show-scm'
  },
  {
    // Phase 22. ⌃⇧C sits beside ⌃⇧G on purpose, and ⇧⌘C is deliberately left
    // free: DESIGN.md §4 uses it as the worked example of a user-recorded
    // per-agent hotkey, so taking it would make the documented example
    // un-recordable.
    //
    // Phase 60 added the View menu item, so the chord is discoverable there.
    id: 'view.context',
    keys: [k('Ctrl+Shift+C')],
    action: 'Context',
    explain:
      'Shows what your agents are configured to run on in this project: skills, MCP servers, hooks, plugins and the instruction files that load with them. Press it again while the list has focus to hand the keyboard back to the session.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'show-context'
  },
  {
    id: 'view.sidebar',
    keys: [k('Cmd+B')],
    action: 'Toggle sidebar',
    explain:
      'Collapses or restores the sidebar to give the terminals the full width. The activity bar stays put.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'toggle-sidebar'
  },
  {
    id: 'view.fillEditor',
    keys: [k('Cmd+Shift+B')],
    action: 'Fill the window',
    explain:
      'Puts the sidebar and the session list away so the open file has the whole window, then brings them back exactly as they were. The session names stay on screen throughout.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'toggle-editor-fill'
  },
  {
    // Phase 80.1. Session focus sits beside editor fill because they are the
    // same kind of thing. Fill gives the open file the window. Focus gives
    // the session surface the window.
    //
    // THE CHORD IS ⇧⌘↩ AND IT IS NOT ⇧⌘C. The Phase 80.1 backlog entry says
    // the research found ⇧⌘C free. The research says the opposite in its
    // section 8, and three places in this tree agree with the research: the
    // comment on view.context above, DESIGN.md §4 which uses ⇧⌘C as the
    // worked example of a per-agent hotkey, and Claude Code's
    // defaultHotkeyHint of 'c' in src/main/agents/registry.ts. Taking ⇧⌘C
    // would put it in RESERVED_APP_CHORDS, and validateChord() would then
    // refuse the documented example for every person who tried to record it.
    //
    // ⇧⌘↩ is free. No other row in this file carries it, macOS reserves no
    // Enter chord, and macOS never delivers a Command chord to a pty, so no
    // agent CLI can want it. The research's other candidate, ⌃⇧↩, is worse
    // for that exact reason, because Ctrl IS a terminal modifier.
    // src/shared/__tests__/focus-chord.test.ts holds all of this down.
    id: 'view.sessionFocus',
    keys: [k('Shift+Cmd+Enter')],
    action: 'Focus the session',
    explain:
      'Grows the session you are in, and every split beside it, until it fills the window. Press it again, or press Escape when the keyboard is not in a session, to put the rest of Tortie back.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'toggle-session-focus'
  },
  {
    id: 'view.sessionsPosition',
    keys: [],
    action: 'Sessions top or right',
    explain:
      'Puts the session surface across the top as a tab strip or down the right as a list. The toggle sits in the SESSIONS header and in the View menu.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'view.zoomIn',
    keys: [k('Cmd+Plus')],
    action: 'Zoom in',
    explain:
      'Enlarges the text where you are working — the focused session, the sidebar, or the editor — not the whole window.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'view.zoomOut',
    keys: [k('Cmd+-')],
    action: 'Zoom out',
    explain: 'Shrinks the text in the region you are working in.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'view.zoomReset',
    keys: [k('Cmd+0')],
    action: 'Reset zoom',
    explain: 'Returns the focused region to its normal size.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'view.zoomResetAll',
    keys: [k('Shift+Cmd+0')],
    action: 'Reset all zoom',
    explain: 'Returns every region to its normal size at once.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'app.shortcuts',
    keys: [k('Cmd+/')],
    action: 'Keyboard shortcuts',
    explain: 'Opens this list. The full map with explanations lives in Settings.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'shortcuts'
  },
  {
    id: 'app.settings',
    keys: [k('Cmd+,')],
    action: 'Settings',
    explain:
      'Opens the Settings window — agents, launch defaults, and the shortcut map. ⌘W closes it.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in',
    menuAction: 'settings'
  },
  {
    id: 'app.escape',
    keys: [k('Escape')],
    action: 'Close topmost layer',
    explain:
      'Closes whatever is on top — menu, then overlay, then modal. It only reaches the session when nothing is above it.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  },
  {
    id: 'app.quit',
    keys: [k('Cmd+Q')],
    action: 'Quit Tortie',
    explain:
      'Quits the app. Your sessions keep running and come back exactly as you left them when you reopen it.',
    group: 'views',
    scope: 'app',
    assignable: false,
    source: 'built-in'
  }
] as const satisfies readonly KeymapEntry[];

export type KeymapId = (typeof KEYMAP)[number]['id'];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

const BY_ID = new Map<string, KeymapEntry>(
  KEYMAP.map((e): [string, KeymapEntry] => [e.id, e])
);

/** The entry for an id. Throws on an unknown id — ids are compile-time. */
export function keymapEntry(id: KeymapId): KeymapEntry {
  const entry = BY_ID.get(id);
  if (entry === undefined) throw new Error(`Tortie keymap: no entry "${id}"`);
  return entry;
}

/**
 * The canonical accelerator for a shortcut — what src/main/menu.ts passes to
 * Electron. Throws when the entry is deliberately unaccelerated (End
 * session…, Close project…), which is a coding error at the call site.
 */
export function accelerator(id: KeymapId): string {
  const first = keymapEntry(id).keys.find((c) => c.accelerator !== null);
  if (first?.accelerator == null) {
    throw new Error(`Tortie keymap: "${id}" has no accelerator`);
  }
  return first.accelerator;
}

/** Keycap text for a shortcut — tooltips, hints, menu-adjacent copy. */
export function keyDisplay(id: KeymapId): string {
  return keymapEntry(id).keys[0]?.display ?? '';
}

/**
 * The chords a surface should SHOW. Identical to `entry.keys` except for
 * ranges, where ⌘1…⌘8 renders as three tokens instead of eight chips.
 */
export function displayChords(entry: KeymapEntry): readonly KeymapChord[] {
  if (entry.collapseRange !== true || entry.keys.length < 3) return entry.keys;
  const first = entry.keys[0];
  const last = entry.keys[entry.keys.length - 1];
  if (first === undefined || last === undefined) return entry.keys;
  return [first, ELLIPSIS, last];
}

// ---------------------------------------------------------------------------
// Sections — what the ⌘/ overlay and the Settings map both render
// ---------------------------------------------------------------------------

export interface KeymapSection {
  readonly group: KeymapGroup;
  readonly entries: readonly KeymapEntry[];
}

/**
 * The keymap in display order, grouped. `extra` folds in runtime rows — the
 * user's per-agent session hotkeys — so no surface has to merge two lists.
 */
export function keymapSections(
  extra: readonly KeymapEntry[] = []
): readonly KeymapSection[] {
  return KEYMAP_GROUPS.map((group) => ({
    group,
    entries: [
      ...KEYMAP.filter((e) => e.group === group.id),
      ...extra.filter((e) => e.group === group.id)
    ]
  })).filter((section) => section.entries.length > 0);
}

/** Substring match over the words a person would actually type. */
export function keymapMatches(entry: KeymapEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const haystack = [
    entry.action,
    entry.explain,
    ...entry.keys.map((c) => c.display),
    ...entry.keys.map((c) => c.accelerator ?? '')
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** Filter sections by query, dropping groups that end up empty. */
export function filterKeymapSections(
  sections: readonly KeymapSection[],
  query: string
): readonly KeymapSection[] {
  if (query.trim() === '') return sections;
  return sections
    .map((s) => ({
      group: s.group,
      entries: s.entries.filter((e) => keymapMatches(e, query))
    }))
    .filter((s) => s.entries.length > 0);
}

// ---------------------------------------------------------------------------
// User-assigned rows (Phase 10 per-agent hotkeys)
// ---------------------------------------------------------------------------

export interface AssignableAgent {
  readonly id: string;
  readonly displayName: string;
  /** The recorded chord, or undefined when the row is still unassigned. */
  readonly accelerator?: string | undefined;
}

/** The id an agent's launch row carries in the keymap. */
export function agentKeymapId(agentId: string): string {
  return `session.launch:${agentId}`;
}

/**
 * The keymap rows for the launchable agents — assigned or not. Settings
 * renders these with their recorder; the ⌘/ overlay shows only the assigned
 * ones, so a chord you set is discoverable from the same place as every
 * built-in.
 */
export function agentKeymapEntries(
  agents: readonly AssignableAgent[]
): readonly KeymapEntry[] {
  return agents.map((agent) => ({
    id: agentKeymapId(agent.id),
    keys:
      agent.accelerator !== undefined && agent.accelerator !== ''
        ? [k(agent.accelerator)]
        : [],
    action: `New ${agent.displayName} session`,
    explain: `Creates a ${agent.displayName} session in the project you are looking at, without opening the sheet.`,
    group: 'sessions',
    scope: 'app',
    assignable: true,
    source: 'user-assigned'
  }));
}

// ---------------------------------------------------------------------------
// Conflicts — the recorder's table, derived rather than retyped
// ---------------------------------------------------------------------------

/**
 * The built-in entry that owns an accelerator, or undefined. When two scopes
 * share a chord (⌃⇥) the app-wide owner is returned, because that is the one
 * a user-recorded chord would actually shadow.
 */
export function builtInOwner(accel: string): KeymapEntry | undefined {
  const canonical = normalizeAccelerator(accel);
  const owners = KEYMAP.filter((e) =>
    e.keys.some((c) => c.accelerator === canonical)
  );
  return owners.find((e) => e.scope === 'app') ?? owners[0];
}

/**
 * Native Edit-menu roles. They are not gmux shortcuts — there is nothing to
 * explain and no row to render — but a recorded chord that collided with one
 * would be silently eaten by the menu, so they belong in the conflict table.
 * (⌘C and ⌘A are absent on purpose: the terminal gives them gmux meanings,
 * so they are real KEYMAP entries above.)
 */
export const NATIVE_ROLE_CHORDS: Readonly<Record<string, string>> = {
  'Cmd+V': 'Paste',
  'Cmd+X': 'Cut',
  'Cmd+Z': 'Undo',
  'Shift+Cmd+Z': 'Redo'
};

/**
 * Every chord gmux already owns, accelerator → the action to name in the
 * recorder's "Already used by <x>". Derived from KEYMAP: a shortcut added
 * above becomes un-recordable the same commit, which is the whole point.
 */
export const RESERVED_APP_CHORDS: Readonly<Record<string, string>> =
  Object.freeze(
    KEYMAP.reduce<Record<string, string>>(
      (acc, entry) => {
        for (const chord of entry.keys) {
          if (chord.accelerator === null) continue;
          if (!hasCommandModifier(chord.accelerator)) continue;
          acc[chord.accelerator] ??= entry.action;
        }
        return acc;
      },
      { ...NATIVE_ROLE_CHORDS }
    )
  );
