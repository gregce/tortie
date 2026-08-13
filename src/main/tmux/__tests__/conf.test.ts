/**
 * Phase 19 item 13 — the conf inside the bundle, and proving it applied.
 *
 * The defect this covers, measured on tmux 3.6a on a scratch socket on
 * 2026-08-12. With the conf path missing, `new-session -d` exits 0 and creates
 * the session, and the server it created reports `history-limit 2000`,
 * `exit-empty on`, `status on` and `remain-on-exit off`. Passing the real conf
 * to that server afterwards changes nothing, because tmux reads the file only
 * when it creates the server.
 *
 * These tests use the REAL resources/gmux-tmux.conf for the parser, so a future
 * edit that renames the option or reformats the line is caught here rather than
 * discovered as a shallow scrollback months later. Nothing here runs tmux.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import {
  assertConfUsable,
  declaredHistoryLimit,
  lastConfVerification,
  TMUX_BUILTIN_HISTORY_LIMIT,
  verifyHistoryLimitWith,
  type ConfVerifyDeps
} from '../supervisor';

/** The structured payload a refusal carries (message is its JSON). */
function refusalOf(confPath: string): GmuxError['payload'] {
  try {
    assertConfUsable(confPath);
  } catch (err) {
    if (err instanceof GmuxError) return err.payload;
    throw err;
  }
  throw new Error(`assertConfUsable accepted ${confPath}`);
}

const REAL_CONF = join(__dirname, '..', '..', '..', '..', 'resources', 'gmux-tmux.conf');

const scratch = mkdtempSync(join(tmpdir(), 'gmux-conf-test-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function write(name: string, body: string): string {
  const path = join(scratch, name);
  writeFileSync(path, body, 'utf8');
  return path;
}

describe('declaredHistoryLimit', () => {
  it('reads the number the shipped conf actually declares', () => {
    const declared = declaredHistoryLimit(REAL_CONF);
    expect(declared).not.toBeNull();
    // Not asserted as a literal 25000: the number has already moved once
    // (50,000 to 25,000, Phase 13.7) and the parser's job is to track it,
    // not to freeze it. What must never be true is that it reads as tmux's
    // own default, because then the read-back would police the wrong number.
    expect(declared).toBeGreaterThan(TMUX_BUILTIN_HISTORY_LIMIT);
  });

  it('reads the shipped conf and DEFAULT_SCROLLBACK_LINES as the same number', async () => {
    // The conf's own comment asks for these two to be kept in sync, and until
    // now nothing checked. A fresh install runs at the conf's depth until the
    // first settings write, so a drift here is a silent depth change.
    const { DEFAULT_SCROLLBACK_LINES } = await import('@shared/settings');
    expect(declaredHistoryLimit(REAL_CONF)).toBe(DEFAULT_SCROLLBACK_LINES);
  });

  it('accepts the spellings tmux accepts', () => {
    expect(declaredHistoryLimit(write('a.conf', 'set -g history-limit 1234\n'))).toBe(1234);
    expect(
      declaredHistoryLimit(write('b.conf', 'set-option -g history-limit 4321\n'))
    ).toBe(4321);
    expect(declaredHistoryLimit(write('c.conf', 'setw -g history-limit 99\n'))).toBe(99);
    expect(
      declaredHistoryLimit(write('d.conf', '  set -gq  history-limit   7777  \n'))
    ).toBe(7777);
  });

  it('is not fooled by a commented-out line', () => {
    const path = write(
      'e.conf',
      '# set -g history-limit 999\nset -g history-limit 25000\n'
    );
    expect(declaredHistoryLimit(path)).toBe(25000);
  });

  it('returns null when the conf declares no depth at all', () => {
    expect(declaredHistoryLimit(write('f.conf', 'set -g status off\n'))).toBeNull();
  });

  it('returns null rather than throwing when the file is gone', () => {
    expect(declaredHistoryLimit(join(scratch, 'nope.conf'))).toBeNull();
  });
});

describe('assertConfUsable', () => {
  it('accepts the conf the app actually ships', () => {
    expect(() => assertConfUsable(REAL_CONF)).not.toThrow();
  });

  it('refuses a missing file', () => {
    expect(() => assertConfUsable(join(scratch, 'missing.conf'))).toThrowError(
      /tmux configuration is missing/
    );
  });

  it('refuses a zero-byte file, which an existence check would pass', () => {
    // This is the case the old `existsSync` guard let through. A half-written
    // update leaves a 0-byte conf, and tmux then starts a server on its own
    // defaults exactly as it does with no file at all.
    const empty = write('empty.conf', '');
    const payload = refusalOf(empty);
    expect(payload.code).toBe('TMUX_NOT_FOUND');
    expect(payload.detail).toContain('empty (0 bytes)');
  });

  /**
   * Measured before the fix round: a conf at mode 000 and 3,886 bytes passed a
   * stat plus size test, `tmux start-server -f <it>` exited 0, the server came
   * up on the built-in defaults, and the app then failed with TMUX_UNREACHABLE
   * saying the session server would not start. That is the wrong diagnosis for
   * the exact fault this function exists to name.
   */
  it('refuses a file it cannot read, which stat and size both pass', () => {
    const unreadable = write('unreadable.conf', 'set -g history-limit 25000\n');
    chmodSync(unreadable, 0o000);
    try {
      expect(statSync(unreadable).size).toBeGreaterThan(0);
      expect(statSync(unreadable).isFile()).toBe(true);
      const payload = refusalOf(unreadable);
      expect(payload.code).toBe('TMUX_NOT_FOUND');
      expect(payload.detail).toContain('cannot be read');
    } finally {
      chmodSync(unreadable, 0o644);
    }
  });

  it('refuses a directory at the conf path', () => {
    const dir = join(scratch, 'conf-as-dir');
    mkdirSync(dir, { recursive: true });
    expect(refusalOf(dir).detail).toContain('is not a file');
  });

  it('names Tortie in the message and keeps the path in the detail', () => {
    // The message reaches a toast verbatim through errorText(), so it is
    // product copy. The protected filename must not appear in it.
    const missing = join(scratch, 'missing2.conf');
    const payload = refusalOf(missing);
    expect(payload.message).toContain('Tortie');
    expect(payload.message).not.toContain('gmux-tmux.conf');
    expect(payload.detail).toContain(missing);
  });
});

describe('verifyHistoryLimitWith — reading back what tmux actually set', () => {
  const CONF = write('verify.conf', 'set -g history-limit 25000\n');

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  /** A fake server that answers `limit` and records what was set on it. */
  function server(limit: number | null): ConfVerifyDeps & { sets: number[] } {
    let current = limit;
    const sets: number[] = [];
    return {
      sets,
      readLimit: async () => current,
      setLimit: async (lines) => {
        sets.push(lines);
        current = lines;
      }
    };
  }

  it('passes when the server is running the depth the conf declares', async () => {
    const s = server(25000);
    const v = await verifyHistoryLimitWith(CONF, false, s);

    expect(v.applied).toBe(true);
    expect(v.repaired).toBe(false);
    expect(v.observed).toBe(25000);
    expect(s.sets).toEqual([]);
  });

  it('repairs a cold start that came up on tmux built-in 2000', async () => {
    // This is the defect. `-f` exited 0, the server exists, and it is running
    // at a depth the conf never asked for.
    const s = server(TMUX_BUILTIN_HISTORY_LIMIT);
    const v = await verifyHistoryLimitWith(CONF, false, s);

    expect(s.sets).toEqual([25000]);
    expect(v.repaired).toBe(true);
    expect(v.applied).toBe(true);
    expect(v.observed).toBe(25000);
    expect(v.detail).toContain('repaired on this boot');
  });

  it('says out loud that the conf did not apply', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await verifyHistoryLimitWith(CONF, false, server(TMUX_BUILTIN_HISTORY_LIMIT));

    expect(
      err.mock.calls.some(([m]) => String(m).includes('started WITHOUT'))
    ).toBe(true);
  });

  it('leaves a WARM server alone, because 2000 there is the user setting', async () => {
    // A user who set 2,000 lines in Settings must not have it overwritten by
    // a number that came out of the bundle.
    const s = server(TMUX_BUILTIN_HISTORY_LIMIT);
    const v = await verifyHistoryLimitWith(CONF, true, s);

    expect(s.sets).toEqual([]);
    expect(v.repaired).toBe(false);
    expect(v.applied).toBe(false);
    expect(v.detail).toContain('server was already running');
  });

  it('leaves a cold start at some OTHER depth alone', async () => {
    // 8,000 is nobody's default. It came from somewhere deliberate, and this
    // function has no business deciding it is wrong.
    const s = server(8000);
    const v = await verifyHistoryLimitWith(CONF, false, s);

    expect(s.sets).toEqual([]);
    expect(v.applied).toBe(false);
  });

  it('does not "repair" when the conf itself declares 2000', async () => {
    const conf2000 = write('two-thousand.conf', 'set -g history-limit 2000\n');
    const s = server(TMUX_BUILTIN_HISTORY_LIMIT);
    const v = await verifyHistoryLimitWith(conf2000, false, s);

    expect(s.sets).toEqual([]);
    expect(v.applied).toBe(true);
  });

  it('reports honestly when tmux will not answer at all', async () => {
    const v = await verifyHistoryLimitWith(CONF, false, server(null));

    expect(v.observed).toBeNull();
    expect(v.applied).toBe(false);
    expect(v.detail).toBe('tmux would not report history-limit');
  });

  it('a repair that fails is reported as not applied, never as applied', async () => {
    const s: ConfVerifyDeps = {
      readLimit: async () => TMUX_BUILTIN_HISTORY_LIMIT,
      setLimit: async () => {
        throw new Error('server went away');
      }
    };
    const v = await verifyHistoryLimitWith(CONF, false, s);

    expect(v.repaired).toBe(false);
    expect(v.applied).toBe(false);
  });

  it('records the read-back where a bug report can find it', async () => {
    await verifyHistoryLimitWith(CONF, false, server(25000));
    expect(lastConfVerification()?.observed).toBe(25000);
  });
});
