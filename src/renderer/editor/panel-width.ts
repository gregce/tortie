/**
 * Persisted width of the editor split, per project.
 *
 * Its own module for two reasons: EditorPanel is the only *renderer* of the
 * width but not its only writer (the screenshot harness seeds it before the
 * panel ever mounts), and importing EditorPanel from the harness hook would
 * close a cycle — EditorPanel installs the hook.
 *
 * The stored value is the user's INTENT, not a presentation fact (Phase 18):
 * it is kept verbatim and the panel renders `min(stored, editorMaxWidth(...))`,
 * so shrinking the window and growing it back returns the exact chosen width.
 * The only rewriting done here is defensive — the JSON is a user-writable
 * localStorage blob, and a NaN or a 12-pixel entry would otherwise reach the
 * layout.
 */

import {
  clampEditorWidth,
  defaultSplitWidth,
  EDITOR_MIN
} from '../state/chrome-geometry';

const LS_EDITOR_WIDTH = 'gmux.editorWidth';

/**
 * Widest width we will believe from storage. Not a layout limit (the panel
 * clamps to the live work area on every render) — just the point past which
 * a number is certainly corrupt rather than someone's ultrawide monitor.
 */
const MAX_STORED_PX = 8192;

export type EditorWidths = Record<string, number>;

/**
 * Drop what is not a finite number; clamp what survives into the range a
 * panel can actually be laid out at. Pure, so the rules are testable without
 * a DOM.
 */
export function sanitizeEditorWidths(raw: unknown): EditorWidths {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: EditorWidths = {};
  for (const [projectPath, value] of Object.entries(
    raw as Record<string, unknown>
  )) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    out[projectPath] = Math.round(
      Math.min(Math.max(value, EDITOR_MIN), MAX_STORED_PX)
    );
  }
  return out;
}

/**
 * The width a panel opens at in a work row this wide, before any drag: 45% of
 * the row, never under 480px, never past the terminal's floor. The arithmetic
 * itself lives in chrome-geometry with every other limit, so the grid test
 * that proves the terminal never enters the reflow band is testing the same
 * number the panel opens at.
 */
export function defaultEditorWidth(workArea: number): number {
  return defaultSplitWidth(workArea);
}

/**
 * PERSIST INTENT, CLAMP PRESENTATION — the rule that makes a shrinking window
 * a non-event. `stored` is the user's chosen width and is never rewritten to
 * fit; this returns what to LAY OUT today. Shrink the window and grow it back
 * and the chosen width returns exactly.
 */
export function renderedEditorWidth(
  stored: number | undefined,
  workArea: number
): number {
  return clampEditorWidth(stored ?? defaultEditorWidth(workArea), workArea);
}

export function loadEditorWidths(): EditorWidths {
  try {
    const raw = localStorage.getItem(LS_EDITOR_WIDTH);
    return raw === null ? {} : sanitizeEditorWidths(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveEditorWidths(widths: EditorWidths): void {
  try {
    localStorage.setItem(LS_EDITOR_WIDTH, JSON.stringify(widths));
  } catch {
    /* cosmetic state only */
  }
}

/**
 * Set one project's width. Only useful BEFORE the panel mounts (it reads the
 * store once); afterwards the divider drag owns it.
 */
export function setStoredEditorWidth(projectPath: string, px: number): void {
  const widths = loadEditorWidths();
  widths[projectPath] = px;
  saveEditorWidths(widths);
}
