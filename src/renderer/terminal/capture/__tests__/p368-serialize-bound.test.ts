/**
 * Phase 368, item 6 (issue 44): Copy as HTML and a picture of the buffer end
 * each row at the pane's right edge (build/p368/SPEC.md §4.4).
 *
 * `serializeRow` read a row to the row's own length, and a pane's rows keep
 * their old length after it narrows, because a tmux client draws in xterm's
 * alternate buffer and xterm neither reflows nor trims that buffer's rows. So
 * Copy as HTML carried cells nobody could see, coloured, into a document.
 * The terminal here is the shipping xterm, unopened, narrowed exactly as a
 * pane is: 140 columns drawn, 96 shown, two rows redrawn at the new width.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ITheme, Terminal as XTerm } from '@xterm/xterm';

vi.stubGlobal('window', globalThis);
vi.stubGlobal('navigator', { userAgent: 'node', platform: 'MacIntel' });

const { Terminal } = await import('@xterm/xterm');
const { serializeAsHtml } = await import('../serialize');

const THEME: ITheme = { foreground: '#eeeeee', background: '#111111', red: '#ff0000' };

function write(term: XTerm, data: string): Promise<void> {
  return new Promise((resolve) => term.write(data, resolve));
}

/**
 * Six rows drawn at 140, each ending in 22 red 界 in columns 96 to 139, then
 * the pane narrowed to 96 and rows 0 and 1 redrawn with an erase to the end
 * of the line, which xterm bounds by the new width.
 */
async function narrowed(): Promise<XTerm> {
  const term = new Terminal({ cols: 140, rows: 6, allowProposedApi: true });
  await write(term, '\u001b[?1049h');
  for (let r = 0; r < 6; r += 1) {
    const text = `row ${r}`.padEnd(95, '.');
    await write(term, `\u001b[${r + 1};1H${text}E\u001b[31m${'界'.repeat(22)}\u001b[39m`);
  }
  term.resize(96, 6);
  await write(term, '\u001b[1;1Hrsync -avz\u001b[K\u001b[2;1Hdocker run\u001b[K');
  return term;
}

const OPTIONS = {
  theme: THEME,
  fontFamily: 'Menlo',
  fontSizePx: 13,
  // The floor reads the live theme otherwise; 1 changes no colour.
  contrastFloor: 1
} as const;

describe('a serialized row ends at the pane\'s right edge', () => {
  it('draws no cell past column 96 on any row, coloured or not', async () => {
    const term = await narrowed();
    expect(term.buffer.active.getLine(3)?.length).toBe(140);
    const html = serializeAsHtml(term, { ...OPTIONS, range: { startLine: 0, endLine: 5 } });
    expect(html).not.toContain('界');
    expect(html).not.toContain('color:#ff0000');
    // The last cell inside the edge is kept on every row nothing rewrote.
    for (const r of [2, 3, 4, 5]) expect(html).toContain(`row ${r}`.padEnd(95, '.') + 'E');
    expect(html).toContain('rsync -avz');
    expect(html).toContain('docker run');
    term.dispose();
  });

  it('bounds a selection made before the pane narrowed, which can name column 140', async () => {
    const term = await narrowed();
    const html = serializeAsHtml(term, {
      ...OPTIONS,
      onlySelection: true,
      selection: { start: { x: 90, y: 2 }, end: { x: 140, y: 4 } }
    });
    expect(html).not.toContain('界');
    expect(html).toContain('.....E');
    term.dispose();
  });

  it('leaves a row that fits the pane exactly as it was', async () => {
    const term = new Terminal({ cols: 20, rows: 3, allowProposedApi: true });
    await write(term, `\u001b[31m${'r'.repeat(20)}\u001b[39m\r\nplain`);
    const html = serializeAsHtml(term, { ...OPTIONS, range: { startLine: 0, endLine: 1 } });
    expect(html).toContain(`<span style="color:#ff0000">${'r'.repeat(20)}</span>`);
    expect(html).toContain('plain');
    term.dispose();
  });
});
