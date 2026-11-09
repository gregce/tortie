/**
 * The `capture-pane` argument builder — the four things a terminal capture
 * gets wrong if nobody pins them down (research 17 §2.1, all measured on
 * tmux 3.6a):
 *
 *   1. `-e` must be present, or the screenshot loses every color.
 *   2. `-J` must be ABSENT for a capture: it joins wrapped lines, destroying
 *      the on-screen wrapping the image exists to reproduce. It stays ON by
 *      default because snapshot replay wants joined lines.
 *   3. `-E` must never be passed: `-E -1` ends at the last HISTORY line and
 *      excludes the visible screen entirely.
 *   4. the target must be pane-addressable — a `$-id` or a bare name. The
 *      `=name` exact-match prefix works for target-SESSION and fails for
 *      target-PANE with "can't find pane".
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const execTmux = vi.fn(
  async (_args: string[], _options?: unknown): Promise<string> => 'output'
);

vi.mock('../supervisor', () => ({
  execTmux: (args: string[], options?: unknown) => execTmux(args, options),
  tmuxArgs: (args: string[]) => args
}));

const { capturePane, clearPaneHistory } = await import('../sessions');

function argsOf(): string[] {
  return execTmux.mock.calls[0]?.[0] ?? [];
}

describe('capturePane', () => {
  beforeEach(() => {
    execTmux.mockClear();
  });

  it('keeps colors and joins wrapped lines by default (snapshot replay)', async () => {
    await capturePane('$3', 500);
    const args = argsOf();
    expect(args).toContain('-e');
    expect(args).toContain('-J');
  });

  it('drops -J for a capture, so wrapping survives', async () => {
    await capturePane('$3', 500, { join: false });
    const args = argsOf();
    expect(args).toContain('-e');
    expect(args).not.toContain('-J');
  });

  it('starts N lines back and never passes -E', async () => {
    await capturePane('$3', 210, { join: false });
    const args = argsOf();
    expect(args.slice(args.indexOf('-S'))).toEqual(['-S', '-210']);
    expect(args).not.toContain('-E');
  });

  it('leaves a $-id target alone (never "=$3")', async () => {
    await capturePane('$3', 10);
    expect(argsOf()[argsOf().indexOf('-t') + 1]).toBe('$3');
  });

  it('clamps a negative or fractional line count', async () => {
    await capturePane('$3', -5);
    expect(argsOf()).toContain('-0');
  });
});

describe('clearPaneHistory', () => {
  beforeEach(() => {
    execTmux.mockClear();
  });

  it('drops the server-side history for one target', async () => {
    await clearPaneHistory('$7');
    expect(argsOf()).toEqual(['clear-history', '-t', '$7']);
  });
});

// Phase 209's exact range, its two-call extent read and their three rows went
// in Phase 295 (build/p353/SPEC.md D295-4): a range of history lines is read
// in one invocation by src/main/tmux/history-lines.ts, pinned by
// src/main/capture/__tests__/history-range.test.ts and, against real tmux,
// history-lines.integration.test.ts beside this file.
