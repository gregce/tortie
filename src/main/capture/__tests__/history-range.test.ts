/**
 * Phase 209 — the clamp on an exact history range is main's, not tmux's.
 *
 * tmux moves a range above the top of the history to the oldest line and
 * answers ONE row for it, measured 2026-09-03 on a scratch server with 93
 * lines of history: `-S -1000 -E -999` printed the oldest line. A copy
 * composed from that row would be a line the person never selected. So the
 * service reads `#{history_size}` and `#{pane_height}` at the instant of
 * the capture, converts the renderer's oldest-first numbering itself, refuses
 * a range that is gone, and reports the line the first returned row really
 * is.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const capturePane = vi.fn(async (): Promise<string> => 'row\n');
const readPaneExtent = vi.fn(async () => ({ history: 861, rows: 43 }));

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  clipboard: {},
  dialog: {},
  nativeImage: {}
}));
vi.mock('../../tmux', () => ({
  resolvePaneTarget: async (name: string) => `$${name}`,
  capturePane: (...args: unknown[]) => capturePane(...(args as [])),
  readPaneExtent: (...args: unknown[]) => readPaneExtent(...(args as []))
}));

const { capturePaneText } = await import('../service');

beforeEach(() => {
  capturePane.mockClear();
  readPaneExtent.mockClear();
});

describe('capturePaneText with a range', () => {
  it('converts oldest-first lines to tmux coordinates against a fresh extent', async () => {
    const res = await capturePaneText({
      tmuxName: 's',
      historyLines: 0,
      range: { start: 536, end: 577 },
      join: true
    });
    expect(readPaneExtent).toHaveBeenCalledTimes(1);
    expect(capturePane).toHaveBeenCalledWith('$s', 0, {
      join: true,
      range: { start: 536 - 861, end: 577 - 861 }
    });
    expect(res).toEqual({ ansi: 'row\n', firstLine: 536 });
  });

  it('clamps a start above the top to the oldest line and says so', async () => {
    const res = await capturePaneText({
      tmuxName: 's',
      historyLines: 0,
      range: { start: -30, end: 5 }
    });
    expect(capturePane).toHaveBeenCalledWith('$s', 0, {
      join: false,
      range: { start: -861, end: 5 - 861 }
    });
    expect(res.firstLine).toBe(0);
  });

  it('cuts an end below the screen at the last row', async () => {
    await capturePaneText({
      tmuxName: 's',
      historyLines: 0,
      range: { start: 900, end: 5000 }
    });
    // 861 + 43 - 1 = 903 is the last row of the screen, tmux row 42.
    expect(capturePane).toHaveBeenCalledWith('$s', 0, {
      join: false,
      range: { start: 39, end: 42 }
    });
  });

  it('answers nothing for a range that is gone, rather than the oldest line', async () => {
    readPaneExtent.mockResolvedValueOnce({ history: 20, rows: 10 });
    const res = await capturePaneText({
      tmuxName: 's',
      historyLines: 0,
      range: { start: -50, end: -40 }
    });
    expect(capturePane).not.toHaveBeenCalled();
    expect(res).toEqual({ ansi: '', firstLine: 0 });
  });

  it('leaves the last N shape exactly as it was', async () => {
    await capturePaneText({ tmuxName: 's', historyLines: 207 });
    expect(readPaneExtent).not.toHaveBeenCalled();
    expect(capturePane).toHaveBeenCalledWith('$s', 207, { join: false });
  });
});
