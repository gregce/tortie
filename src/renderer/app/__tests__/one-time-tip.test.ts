/**
 * Phase 12.4/12.6 — "show this once, ever".
 *
 * The module carries one hard guarantee and one non-obvious failure rule, and
 * both are invisible at the call site, so both are pinned here:
 *  - the flag is written BEFORE the toast, so a second call (even one racing
 *    the first in the same tick) is a silent no-op;
 *  - storage that cannot be READ or WRITTEN counts as already-shown. A tip
 *    that cannot be remembered would otherwise fire on every single use —
 *    the exact nag the mechanism exists to prevent.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();

// The tip reaches the shell through the zustand store's toast action; the
// store itself reads `window` at import time and is not what these tests are
// about, so it is stubbed rather than instantiated.
vi.mock('../../state/store', () => ({
  useApp: { getState: () => ({ toast }) }
}));

interface FakeStorage {
  items: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A localStorage stand-in whose reads and writes can each be made to throw. */
function installStorage(
  opts: { getThrows?: boolean; setThrows?: boolean } = {}
): FakeStorage {
  const items = new Map<string, string>();
  const storage: FakeStorage = {
    items,
    getItem(key) {
      if (opts.getThrows === true) throw new Error('storage disabled');
      return items.get(key) ?? null;
    },
    setItem(key, value) {
      if (opts.setThrows === true) throw new Error('quota exceeded');
      items.set(key, value);
    }
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

const { oneTimeTipShown, showOneTimeTip } = await import('../one-time-tip');

const FLAG = 'gmux.tipShown.open-in-new-tab';

beforeEach(() => {
  toast.mockClear();
});

describe('showOneTimeTip', () => {
  it('toasts the first time and records the flag', () => {
    const storage = installStorage();
    expect(showOneTimeTip('open-in-new-tab')).toBe(true);
    expect(toast.mock.calls).toEqual([
      ['info', 'Tip: double-clicking a file opens it in a new tab too.']
    ]);
    expect(storage.items.get(FLAG)).toBe('1');
  });

  it('is silent every later time, including within the same tick', () => {
    installStorage();
    showOneTimeTip('open-in-new-tab');
    toast.mockClear();
    // The flag is written before the toast, so the second call is already
    // looking at a "shown" flag even with no await between them.
    expect(showOneTimeTip('open-in-new-tab')).toBe(false);
    expect(showOneTimeTip('open-in-new-tab')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('stays silent when the flag is already set from a previous run', () => {
    const storage = installStorage();
    storage.items.set(FLAG, '1');
    expect(oneTimeTipShown('open-in-new-tab')).toBe(true);
    expect(showOneTimeTip('open-in-new-tab')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('treats unreadable storage as already-shown', () => {
    // Cannot tell whether it fired before → assume it did. Repeating a tip
    // forever is worse than never showing it.
    installStorage({ getThrows: true });
    expect(oneTimeTipShown('open-in-new-tab')).toBe(true);
    expect(showOneTimeTip('open-in-new-tab')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('does not toast when the flag cannot be written', () => {
    // Storage readable but not writable: showing the tip now would show it
    // again on the next launch, and the one after that.
    installStorage({ setThrows: true });
    expect(showOneTimeTip('open-in-new-tab')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps one flag per tip', () => {
    const storage = installStorage();
    showOneTimeTip('open-in-new-tab');
    toast.mockClear();
    // A different tip is a different flag — the first must not mute it.
    expect(showOneTimeTip('quit-hold')).toBe(true);
    expect(toast.mock.calls).toEqual([
      ['info', 'Quitting — your sessions keep running.']
    ]);
    expect(storage.items.get('gmux.tipShown.quit-hold')).toBe('1');
  });

  it('honors the quit toast’s pre-catalog flag', () => {
    // Phase 8.3 shipped this toast under its own key. Folding it into the
    // catalog must not re-show it to someone who has already seen it.
    const storage = installStorage();
    storage.items.set('gmux.quitToastShown', '1');
    expect(oneTimeTipShown('quit-hold')).toBe(true);
    expect(showOneTimeTip('quit-hold')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});
