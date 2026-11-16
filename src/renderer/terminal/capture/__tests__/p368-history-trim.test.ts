/**
 * Phase 368, items 4 and 6 (issue 44), on the history path: a line composed
 * from the server ends where a line copied from the screen ends, and the
 * terminals that draw history rows draw them with the session server's widths
 * (build/p368/SPEC.md §4.2 and §4.4).
 *
 * `capture-pane -J` keeps the spaces tmux drew at a line's end
 * (cmd-capture-pane.c), so a copy composed from the history ended its lines
 * with them, where a terminal with no tmux holds none. And the buffer the
 * joined lines are re-wrapped in counted every emoji one cell wide, where the
 * server drew two, so the re-wrap broke a line where the pane had not.
 *
 * The buffer terminal is the SHIPPING xterm, unopened. The width provider is
 * recorded rather than run, because what this file owns is the call: that the
 * session's table reaches it, and before the first byte is written, since a
 * provider made active after the write changes no cell already parsed. The
 * provider's own widths are ../../__tests__/p368-widths.test.ts's.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Terminal as XTerm } from '@xterm/xterm';

vi.stubGlobal('window', globalThis);
vi.stubGlobal('navigator', { userAgent: 'node', platform: 'MacIntel' });

/** Every registration, with what the buffer held when it was made. */
const recorded = vi.hoisted(() => ({
  registrations: [] as { table: unknown; firstRow: string; rows: number }[]
}));

vi.mock('../../tmux-widths', () => ({
  registerTmuxWidths: (term: XTerm, table: unknown) => {
    const buffer = term.buffer.active;
    recorded.registrations.push({
      table,
      firstRow: buffer.getLine(0)?.translateToString(true) ?? '',
      rows: buffer.length
    });
  }
}));

const { bufferTerminal, composeHistorySelection, composeText } = await import(
  '../history-copy'
);

describe('a line composed from the history ends at its last drawn cell', () => {
  it('drops the spaces -J kept at a line\'s end and keeps one a wrapped row ends in', async () => {
    const rows = [
      'x y   ',
      `${'a'.repeat(39)} ${'b'.repeat(10)}`,
      '日本語テキ abc 😀 end   ',
      '',
      'last  '
    ];
    const term = await bufferTerminal(rows, 40);
    expect(term.buffer.active.getLine(2)?.isWrapped).toBe(true);
    const text = composeText(term, { start: { x: 0, y: 0 }, end: { x: 40, y: 5 } });
    expect(text).toBe(
      ['x y', `${'a'.repeat(39)} ${'b'.repeat(10)}`, '日本語テキ abc 😀 end', '', 'last'].join(
        '\n'
      )
    );
    term.dispose();
  });

  it('composes a held range with no trailing space on any line, in both flavours', async () => {
    const calls: Record<string, unknown>[] = [];
    const bridge = {
      pane: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { ansi: 'git push    \n  --force-with-lease=origin/main   \nok\n', firstLine: 20 };
      }
    } as never;
    const pane = { id: 's1', tmuxName: 'gmux-s1' };
    const range = { start: { line: 20, col: 0 }, end: { line: 22, col: 1 }, cols: 60 };
    const plain = await composeHistorySelection(bridge, pane, range, null);
    expect(plain.text).toBe('git push\n  --force-with-lease=origin/main\nok');
    // The read is today's, joined by tmux: Phase 368 adds no join of its own.
    expect(calls.map((c) => c.join)).toEqual([true]);
    const rich = await composeHistorySelection(bridge, pane, range, {
      theme: { foreground: '#ffffff', background: '#000000' },
      fontFamily: 'Menlo',
      fontSizePx: 13
    });
    expect(rich.text).toBe(plain.text);
    expect(rich.html).toContain('--force-with-lease=origin/main');
  });
});

describe('the terminals that draw history rows take the session server\'s widths', () => {
  it('registers the table on the buffer terminal before the first byte is written', async () => {
    recorded.registrations.length = 0;
    const term = await bufferTerminal(['✅ done', 'next'], 30, '3.7b');
    expect(recorded.registrations).toEqual([{ table: '3.7b', firstRow: '', rows: 24 }]);
    // And the rows were written after it.
    expect(term.buffer.active.getLine(0)?.translateToString(true)).toBe('✅ done');
    term.dispose();
  });

  it('hands xterm\'s own table on when the session has none, as a session elsewhere does', async () => {
    recorded.registrations.length = 0;
    const term = await bufferTerminal(['plain'], 30);
    expect(recorded.registrations.map((r) => r.table)).toEqual([null]);
    term.dispose();
  });

  it('passes the session row\'s table through a composed copy', async () => {
    const bridge = {
      pane: async () => ({ ansi: 'one\ntwo\n', firstLine: 5 })
    } as never;
    const range = { start: { line: 5, col: 0 }, end: { line: 6, col: 2 }, cols: 40 };
    recorded.registrations.length = 0;
    await composeHistorySelection(
      bridge,
      { id: 's1', tmuxName: 'gmux-s1', cellWidths: '3.6a' },
      range,
      null
    );
    await composeHistorySelection(bridge, { id: 's2', tmuxName: 'gmux-s2' }, range, null);
    expect(recorded.registrations.map((r) => r.table)).toEqual(['3.6a', null]);
  });

  it('registers on the picture\'s terminal too, before it opens or writes (read, because it draws)', () => {
    // `rasterizeRows` needs a renderer and fonts, which this lane has not got,
    // so its order is read from the source it ships: the session's table is
    // registered right after the terminal is made, before `open` and `write`.
    const source = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8');
    const start = source.indexOf('async function rasterizeRows(');
    expect(start).toBeGreaterThan(0);
    const body = source.slice(start, source.indexOf('\n}\n', start));
    const made = body.indexOf('offscreen = new Terminal(');
    const registered = body.indexOf('registerTmuxWidths(offscreen, session.cellWidths ?? null);');
    const opened = body.indexOf('offscreen.open(');
    const written = body.indexOf('.write(');
    expect(made).toBeGreaterThan(0);
    expect(registered).toBeGreaterThan(made);
    expect(opened).toBeGreaterThan(registered);
    expect(written).toBeGreaterThan(registered);
    expect(body).toContain('allowProposedApi: true');
  });
});
