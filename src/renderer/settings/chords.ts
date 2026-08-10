/**
 * Hotkey chords (S13 Hotkeys) — pure capture/format/validation logic for the
 * shortcut recorder. No DOM types beyond a minimal event shape, so the whole
 * module unit-tests in node.
 *
 * Canonical form: an Electron accelerator string with modifiers in the fixed
 * order Ctrl → Alt → Shift → Cmd (e.g. "Shift+Cmd+C"). Everything — storage
 * (GmuxSettings.hotkeys), conflict tables, and menu registration — speaks
 * this one form; display converts to macOS glyph order (⌃⌥⇧⌘).
 *
 * DESIGN.md §4: user chords must include ⌘ or ⌃; the recorder rejects any
 * chord already in the app map, used by another row, or reserved by macOS —
 * nothing in the table is ever silently shadowed.
 */

// ---------------------------------------------------------------------------
// Event → accelerator
// ---------------------------------------------------------------------------

/** The subset of KeyboardEvent the capture logic reads (testable shape). */
export interface ChordKeyEvent {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_KEYS = new Set([
  'Meta',
  'Control',
  'Alt',
  'Shift',
  'CapsLock',
  'Fn',
  'FnLock'
]);

/**
 * Normalize the non-modifier key of a keydown to an Electron accelerator
 * key token. Letters/digits come from e.code (layout- and Shift-stable:
 * ⇧+c must record as Shift+Cmd+C, not a different character). Returns null
 * for pure-modifier presses and keys that can't be an accelerator.
 */
export function eventKeyToken(e: ChordKeyEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;

  const codeLetter = /^Key([A-Z])$/.exec(e.code);
  if (codeLetter?.[1] !== undefined) return codeLetter[1];
  const codeDigit = /^Digit([0-9])$/.exec(e.code);
  if (codeDigit?.[1] !== undefined) return codeDigit[1];
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.key)) return e.key;

  switch (e.key) {
    case 'ArrowUp':
      return 'Up';
    case 'ArrowDown':
      return 'Down';
    case 'ArrowLeft':
      return 'Left';
    case 'ArrowRight':
      return 'Right';
    case ' ':
      return 'Space';
    case 'Enter':
      return 'Enter';
    case 'Tab':
      return 'Tab';
    default:
      break;
  }
  // Single printable characters (punctuation) pass through as-is.
  if (e.key.length === 1 && e.key.charCodeAt(0) > 32) return e.key;
  return null;
}

/**
 * Build the canonical accelerator for a keydown, or null when the press is
 * modifier-only / not accelerator-material. Does NOT validate — a chord
 * without ⌘/⌃ still round-trips so validateChord can name the problem.
 */
export function eventToAccelerator(e: ChordKeyEvent): string | null {
  const key = eventKeyToken(e);
  if (key === null) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Cmd');
  return [...mods, key].join('+');
}

/** Re-order any accelerator's modifiers into the canonical form. */
export function normalizeAccelerator(accel: string): string {
  const tokens = accel.split('+');
  const key = tokens[tokens.length - 1] ?? '';
  const mods = new Set(tokens.slice(0, -1));
  const ordered = (['Ctrl', 'Alt', 'Shift', 'Cmd'] as const).filter((m) =>
    mods.has(m)
  );
  return [...ordered, key].join('+');
}

// ---------------------------------------------------------------------------
// Display (⌃⌥⇧⌘ glyph order)
// ---------------------------------------------------------------------------

const KEY_GLYPHS: Record<string, string> = {
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Enter: '↩',
  Space: '␣',
  Tab: '⇥'
};

/** "Shift+Cmd+C" → "⇧⌘C" (keycap-chip text for the recorder + menus). */
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

// ---------------------------------------------------------------------------
// Conflict tables
// ---------------------------------------------------------------------------

/**
 * The DESIGN.md §4 app map + native Edit-menu roles, in canonical form.
 * Value = the action name the error line reports ("Already used by <x>").
 */
export const RESERVED_APP_CHORDS: Readonly<Record<string, string>> = {
  'Cmd+T': 'New session',
  'Cmd+O': 'Open project',
  ...Object.fromEntries(
    Array.from({ length: 9 }, (_v, i) => [
      `Cmd+${i + 1}`,
      `Switch to project ${i + 1}`
    ])
  ),
  'Ctrl+Tab': 'Next project',
  'Ctrl+Shift+Tab': 'Previous project',
  'Alt+Cmd+Up': 'Previous session',
  'Alt+Cmd+Down': 'Next session',
  'Alt+Cmd+Left': 'Focus split left',
  'Alt+Cmd+Right': 'Focus split right',
  'Cmd+J': 'Sessions that need input',
  'Cmd+S': 'Save',
  'Cmd+Enter': 'Commit staged',
  'Cmd+E': 'Toggle editor',
  'Shift+Cmd+E': 'Explorer',
  'Ctrl+Shift+G': 'Source control',
  'Cmd+B': 'Toggle sidebar',
  'Shift+Cmd+]': 'Next editor tab',
  'Shift+Cmd+[': 'Previous editor tab',
  'Cmd+W': 'Close editor tab',
  'Cmd+F': 'Find',
  'Cmd+/': 'Keyboard shortcuts',
  'Cmd+,': 'Settings',
  'Cmd+Q': 'Quit gmux',
  // Native Edit-menu roles (menu accelerators fire before the renderer).
  'Cmd+C': 'Copy',
  'Cmd+V': 'Paste',
  'Cmd+X': 'Cut',
  'Cmd+A': 'Select all',
  'Cmd+Z': 'Undo',
  'Shift+Cmd+Z': 'Redo'
};

/** Chords macOS itself owns — registering them would be silently shadowed. */
export const RESERVED_MACOS_CHORDS: Readonly<Record<string, string>> = {
  'Cmd+Space': 'Spotlight',
  'Cmd+Tab': 'the app switcher',
  'Cmd+H': 'Hide',
  'Alt+Cmd+H': 'Hide others',
  'Cmd+M': 'Minimize',
  'Cmd+`': 'Cycle windows',
  'Shift+Cmd+3': 'Screenshots',
  'Shift+Cmd+4': 'Screenshots',
  'Shift+Cmd+5': 'Screenshots',
  'Alt+Cmd+Escape': 'Force quit',
  'Ctrl+Cmd+Space': 'Emoji & symbols',
  'Ctrl+Cmd+F': 'Full screen',
  'Shift+Cmd+Q': 'Log out'
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ChordValidation =
  | { ok: true; accelerator: string }
  | { ok: false; reason: string };

export interface ChordContext {
  /** Currently assigned chords: agent id → canonical accelerator. */
  assigned: Readonly<Partial<Record<string, string>>>;
  /** Display name per agent id (for the "Already used by" message). */
  displayNames: Readonly<Partial<Record<string, string>>>;
  /** The row being recorded — its own current chord never conflicts. */
  selfAgentId: string;
}

/**
 * Full recorder validation (S13): must include ⌘ or ⌃; must not collide
 * with the §4 app map, macOS-reserved chords, or another agent row.
 */
export function validateChord(
  accel: string,
  ctx: ChordContext
): ChordValidation {
  const canonical = normalizeAccelerator(accel);
  const tokens = canonical.split('+');
  const mods = new Set(tokens.slice(0, -1));
  if (!mods.has('Cmd') && !mods.has('Ctrl')) {
    return { ok: false, reason: 'Shortcut must include ⌘ or ⌃' };
  }
  const appOwner = RESERVED_APP_CHORDS[canonical];
  if (appOwner !== undefined) {
    return { ok: false, reason: `Already used by ${appOwner}` };
  }
  const osOwner = RESERVED_MACOS_CHORDS[canonical];
  if (osOwner !== undefined) {
    return { ok: false, reason: `Reserved by macOS for ${osOwner}` };
  }
  for (const [agentId, chord] of Object.entries(ctx.assigned)) {
    if (agentId === ctx.selfAgentId || chord === undefined) continue;
    if (normalizeAccelerator(chord) === canonical) {
      const name = ctx.displayNames[agentId] ?? agentId;
      return { ok: false, reason: `Already used by New ${name} session` };
    }
  }
  return { ok: true, accelerator: canonical };
}
