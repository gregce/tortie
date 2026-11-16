/**
 * Phase 368 (build/p368/SPEC.md D1, D3): a session on this Mac is made at the
 * size it will be shown, by `-x` and `-y` on its `new-session` line, and the
 * one validator every size passes through.
 *
 * WHAT WAS WRONG. `createSession` passed no size, so every session was made at
 * tmux's `default-size` of 80 by 24 and its first attach was always one size
 * change for the program in it (research 145 section 3.2: a Claude resumed at
 * 80 columns and repainted at the pane's width left items 10 to 12 twice).
 *
 * Nothing here starts tmux: `createSession`'s transport is a recorder, as in
 * `p354-argument.test.ts`. Every expected argv is written by hand from D3:
 * `-x <cols> -y <rows>` directly after `-s <name>`, and nothing at all without
 * a size, so a create with none is byte for byte what it was at the parent.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sanitizeTerminalSize,
  TERMINAL_SIZE_BOUNDS
} from '@shared/terminal-size';

/** Every argv `createSession` handed tmux, in order. */
const handed: string[][] = [];

vi.mock('../supervisor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../supervisor')>();
  return {
    ...actual,
    execTmux: (args: string[]) => {
      handed.push([...args]);
      // `list-sessions` answers no session; `new-session -P -F` answers one parseable create line.
      return Promise.resolve(args[0] === 'new-session' ? '$9 1700000000 0 1  4242 p368\n' : '');
    }
  };
});

/**
 * What the LOCAL RESTORE handed this Mac's create. The restore reaches tmux
 * through the module's index, which is replaced here by a recorder, as in
 * `../../restore/__tests__/outcome.test.ts`; this file's own create cases above
 * import `../sessions` directly and are not touched by it.
 */
const restoreCreates = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock('../index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../index')>()),
  installUserPath: () => Promise.resolve(process.env['PATH'] ?? ''),
  createSession: (input: Record<string, unknown>) => {
    restoreCreates.push(input);
    return Promise.resolve({
      sessionId: '$99',
      tmuxName: 'p368-restored',
      createdAt: 0,
      attached: false,
      windows: 1,
      panePid: 4242
    });
  },
  execTmux: () => Promise.resolve('')
}));

// No saved scrollback to replay, and no window to tell.
vi.mock('../../restore/snapshots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../restore/snapshots')>()),
  resolveSnapshot: () => null
}));
vi.mock('../../typed-events', () => ({ broadcastEvent: () => undefined }));

const { createSession } = await import('../sessions');
const { restoreSessionInTmux } = await import('../../restore/restore');

const root = mkdtempSync(join(tmpdir(), 'tortie-p368-create-'));

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  handed.length = 0;
});

/** The `new-session` argv of one create. */
async function created(size?: unknown): Promise<string[]> {
  handed.length = 0;
  await createSession({
    displayName: 'p368',
    cwd: root,
    argv: ['claude'],
    ...(size !== undefined ? { size: size as never } : {})
  });
  const line = handed.find((args) => args[0] === 'new-session');
  if (line === undefined) throw new Error('no new-session was handed to tmux');
  return line;
}

describe('-x and -y on the new-session line (D3)', () => {
  it('directly after -s <name>, columns then rows', async () => {
    const args = await created({ cols: 124, rows: 39 });
    const name = args.indexOf('-s');
    expect(args.slice(name, name + 6)).toEqual(['-s', 'p368', '-x', '124', '-y', '39']);
    // Everything else is where it was: the folder, then the command.
    expect(args.indexOf('-c')).toBe(name + 6);
    expect(args.slice(-2)).toEqual(['--', 'claude']);
  });

  it('absent without a size: byte for byte the parent’s line', async () => {
    const args = await created();
    expect(args).not.toContain('-x');
    expect(args).not.toContain('-y');
    const name = args.indexOf('-s');
    expect(args.slice(0, name + 3)).toEqual([
      'new-session',
      '-d',
      '-P',
      '-F',
      args[4] as string,
      '-s',
      'p368',
      '-c'
    ]);
  });

  it('both bounds are sizes', async () => {
    expect(await created({ cols: 2, rows: 1 })).toEqual(
      expect.arrayContaining(['-x', '2', '-y', '1'])
    );
    expect(await created({ cols: 1000, rows: 500 })).toEqual(
      expect.arrayContaining(['-x', '1000', '-y', '500'])
    );
  });

  it('one past either bound, a fraction, or not a number sends neither', async () => {
    for (const bad of [
      { cols: 1, rows: 1 },
      { cols: 1001, rows: 500 },
      { cols: 2, rows: 0 },
      { cols: 2, rows: 501 },
      { cols: 80.5, rows: 24 },
      { cols: 80, rows: Number.NaN },
      { cols: '80', rows: '24' },
      null,
      'big'
    ]) {
      const args = await created(bad);
      expect([JSON.stringify(bad), args.includes('-x') || args.includes('-y')]).toEqual([
        JSON.stringify(bad),
        false
      ]);
    }
  });
});

describe('the local restore hands its size to the create (D2, D3)', () => {
  function restorable(): Parameters<typeof restoreSessionInTmux>[0] {
    return {
      id: 'sess-368',
      name: 'back',
      tmuxName: 'back',
      projectPath: root,
      cwd: root,
      agent: 'shell',
      status: 'restorable',
      createdAt: 1,
      lastSeen: 2,
      argv: ['/bin/zsh', '-l']
    } as Parameters<typeof restoreSessionInTmux>[0];
  }

  it('the size it was handed, and none without one', async () => {
    restoreCreates.length = 0;
    await restoreSessionInTmux(restorable(), { size: { cols: 124, rows: 39 } });
    await restoreSessionInTmux(restorable(), {});
    expect(restoreCreates).toHaveLength(2);
    expect(restoreCreates[0]?.['size']).toEqual({ cols: 124, rows: 39 });
    expect('size' in (restoreCreates[1] ?? {})).toBe(false);
  });
});

describe('sanitizeTerminalSize, the one validator (D1)', () => {
  it('holds the attach host’s own bounds', () => {
    expect({ ...TERMINAL_SIZE_BOUNDS }).toEqual({
      minCols: 2,
      maxCols: 1000,
      minRows: 1,
      maxRows: 500
    });
    expect(Object.isFrozen(TERMINAL_SIZE_BOUNDS)).toBe(true);
  });

  it('answers whole sizes inside the bounds, and a new frozen object holding only the two numbers', () => {
    const given = { sessionId: 's', cols: 124, rows: 39, extra: 'x' };
    const size = sanitizeTerminalSize(given);
    expect(size).toEqual({ cols: 124, rows: 39 });
    expect(size).not.toBe(given);
    expect(Object.isFrozen(size)).toBe(true);
    expect(sanitizeTerminalSize({ cols: 2, rows: 1 })).toEqual({ cols: 2, rows: 1 });
    expect(sanitizeTerminalSize({ cols: 1000, rows: 500 })).toEqual({ cols: 1000, rows: 500 });
  });

  it('answers null for everything else', () => {
    const NOT_SIZES: readonly unknown[] = [
      undefined,
      null,
      0,
      '124x39',
      [124, 39],
      {},
      { cols: 124 },
      { rows: 39 },
      { cols: 1, rows: 39 },
      { cols: 1001, rows: 39 },
      { cols: 124, rows: 0 },
      { cols: 124, rows: 501 },
      { cols: 124.5, rows: 39 },
      { cols: 124, rows: 39.5 },
      { cols: Number.NaN, rows: 39 },
      { cols: Number.POSITIVE_INFINITY, rows: 39 },
      { cols: -124, rows: 39 },
      { cols: '124', rows: '39' },
      { cols: 124n, rows: 39 }
    ];
    // The index rides with each answer, so a failure names the shape.
    NOT_SIZES.forEach((bad, index) => {
      expect([index, sanitizeTerminalSize(bad)]).toEqual([index, null]);
    });
  });
});
