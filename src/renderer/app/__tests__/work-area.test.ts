/**
 * The work area's STRUCTURAL invariants (Phase 18 item 3).
 *
 * These are source-level assertions on purpose. What they guard cannot be
 * observed in a unit test — the renderer here is Electron with a real xterm —
 * and it is expensive to get wrong:
 *
 *  - if either wrapper is ever made conditional (the obvious temptation, since
 *    the strip inside it only exists in one orientation), React re-keys the
 *    subtree on every orientation switch, xterm tears down, and every visible
 *    pane recreates its WebGL context;
 *  - the drag engine hit-tests the strip through `[data-slot="session-strip"]`
 *    and the terminal through `[data-slot="terminal-stack"]`
 *    (src/renderer/app/split/surface-dnd.ts). Moving the strip's markup
 *    without those attributes silently kills tab reorder and drag-to-split;
 *  - a width TRANSITION anywhere in the work row is a stream of
 *    ResizeObserver fits and therefore a stream of tmux resizes of live work.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_DIR = join(__dirname, '..');
const read = (name: string): string =>
  readFileSync(join(APP_DIR, name), 'utf8');

const appSource = read('App.tsx');
/**
 * The shell body, with JSX comments removed — the layout comment inside it
 * quotes the very element names these assertions look for.
 */
const app = appSource
  .slice(appSource.indexOf('<div className="shell-body">'))
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const terminalRegion = read('TerminalRegion.tsx');
const sessionStrip = read('SessionStrip.tsx');
const css = read('work-area.css');

/** The line an element opens on, trimmed. */
function lineWith(source: string, needle: string): string {
  const line = source.split('\n').find((l) => l.includes(needle));
  expect(line, `expected to find ${needle}`).toBeDefined();
  return (line ?? '').trim();
}

describe('work area structure', () => {
  it('renders the column wrapper above the terminal+editor row', () => {
    const area = app.indexOf('<div className="work-area"');
    const row = app.indexOf('<div className="work-row">');
    const region = app.indexOf('<TerminalRegion />');
    const editor = app.indexOf('<EditorPanelLazy />');
    expect(area).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(area);
    expect(region).toBeGreaterThan(row);
    expect(editor).toBeGreaterThan(region);
  });

  it('renders BOTH wrappers unconditionally — a conditional one remounts xterm', () => {
    for (const needle of [
      '<div className="work-area"',
      '<div className="work-row">',
      '<TerminalRegion />',
      '<EditorPanelLazy />'
    ]) {
      const line = lineWith(app, needle);
      expect(line, `${needle} must not be conditional`).not.toMatch(/\?|&&/);
    }
  });

  it('makes the session strip the only orientation-dependent child', () => {
    const between = app.slice(
      app.indexOf('<div className="work-area"'),
      app.indexOf('<div className="work-row">')
    );
    expect(between).toContain("orientation === 'top' ? <SessionStrip /> : null");
  });

  it('keeps the drag engine’s two hit-test slots where it looks for them', () => {
    // src/renderer/app/split/surface-dnd.ts hit-tests exactly these.
    expect(sessionStrip).toContain('data-slot="session-strip"');
    expect(sessionStrip).toContain('className="stab-list"');
    expect(terminalRegion).toContain('data-slot="terminal-stack"');
  });

  it('leaves the tab strip out of the terminal region entirely', () => {
    // The whole point of the hoist: no band of the strip's kind may be
    // rendered inside the region the editor is a sibling of.
    expect(terminalRegion).not.toContain('session-strip');
    expect(terminalRegion).not.toContain('stab-list');
    expect(terminalRegion).not.toContain('SessionTabStrip');
  });

  it('animates nothing in the work area (a fit per frame is a tmux resize per frame)', () => {
    expect(css).not.toMatch(/transition|animation/);
  });

  it('gives the work row a containing block for the fill and overlay editors', () => {
    expect(css).toMatch(/\.work-row\s*\{[^}]*position:\s*relative/);
  });
});
