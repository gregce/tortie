/**
 * Persisted width of the editor split, per project.
 *
 * Its own module for two reasons: EditorPanel is the only *renderer* of the
 * width but not its only writer (the screenshot harness seeds it before the
 * panel ever mounts), and importing EditorPanel from the harness hook would
 * close a cycle — EditorPanel installs the hook.
 */

const LS_EDITOR_WIDTH = 'gmux.editorWidth';

export type EditorWidths = Record<string, number>;

export function loadEditorWidths(): EditorWidths {
  try {
    const raw = localStorage.getItem(LS_EDITOR_WIDTH);
    return raw === null ? {} : (JSON.parse(raw) as EditorWidths);
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
