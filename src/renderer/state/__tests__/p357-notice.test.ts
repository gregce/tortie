/**
 * Phase 357 — what the person reads when the session list stops reading
 * correctly while Tortie runs (build/p357/SPEC.md D15, §5).
 *
 * Main posts ONE `manifest-stopped` notice through `postDurabilityNotice`, and
 * this window draws it: a sticky error toast with the one sentence and a
 * Restart action that asks main to relaunch (`gmux.relaunch`, D13). The person
 * presses it; nothing restarts on its own. The sentence is the same whatever
 * the file check said, because only the log names that verdict.
 *
 * A sticky toast is allowed six lines (src/renderer/app/Toasts.tsx), which is
 * why this sentence may run past the two-line budget `notice.test.ts` holds
 * every auto-dismissing line to; it is held to the sticky budget here instead.
 *
 * Driven through the real subscription: `bootApp`, then the notice channel's
 * own callback, as `./notice.test.ts` does.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GmuxNotice } from '@shared/notice';
import {
  MANIFEST_STOPPED_NOTICE,
  MANIFEST_STOPPED_RESTART
} from '@shared/manifest-stopped-copy';

let onNoticeCb: ((notice: GmuxNotice) => void) | null = null;
let relaunches = 0;
/** Whether the installed bridge carries `relaunch`; a window with no preload has none. */
let bridgeHasRelaunch = true;

function bridge(): Record<string, unknown> {
  return {
    sessions: {
      list: () => Promise.resolve([]),
      onChanged() {},
      onStatusChanged() {}
    },
    projects: { list: () => Promise.resolve([]) },
    scrollback: {
      onNotice: (cb: (notice: GmuxNotice) => void) => {
        onNoticeCb = cb;
        return () => undefined;
      }
    },
    notice: { pending: () => Promise.resolve([]) },
    ...(bridgeHasRelaunch
      ? {
          relaunch: () => {
            relaunches += 1;
            return Promise.resolve();
          }
        }
      : {})
  };
}

const gmuxHolder: { gmux: Record<string, unknown> } = { gmux: {} };

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  get gmux() {
    return gmuxHolder.gmux;
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

gmuxHolder.gmux = bridge();

const { useApp } = await import('../store');
const { bootApp } = await import('../subscriptions');
await bootApp();

/** Send one notice through the live subscription and read the toast it made. */
function say(notice: GmuxNotice): ReturnType<typeof useApp.getState>['toasts'][number] {
  useApp.setState({ toasts: [] } as never);
  onNoticeCb?.(notice);
  const toasts = useApp.getState().toasts;
  expect(toasts).toHaveLength(1);
  const toast = toasts[0];
  if (toast === undefined) throw new Error('no toast');
  return toast;
}

beforeEach(() => {
  relaunches = 0;
  bridgeHasRelaunch = true;
  gmuxHolder.gmux = bridge();
  useApp.setState({ toasts: [] } as never);
});

describe('the stopped session list notice (D15)', () => {
  it('is one sticky error toast with the sentence and a Restart that asks main to relaunch', () => {
    expect(onNoticeCb).not.toBeNull();
    const toast = say({ kind: 'manifest-stopped', fileFine: true });
    expect(toast.text).toBe(MANIFEST_STOPPED_NOTICE);
    expect(toast.text).toBe(
      "Tortie's session list stopped reading correctly. Your sessions are still running. Restart Tortie to load it again."
    );
    expect(toast.kind).toBe('error');
    expect(toast.sticky).toBe(true);
    expect(toast.action?.label).toBe(MANIFEST_STOPPED_RESTART);
    expect(toast.action?.label).toBe('Restart');
    // Nothing restarts until the person presses it.
    expect(relaunches).toBe(0);
    toast.action?.run();
    expect(relaunches).toBe(1);
  });

  it('says the same sentence whatever the file check said', () => {
    for (const fileFine of [true, false, null]) {
      const toast = say({ kind: 'manifest-stopped', fileFine });
      expect(toast.text).toBe(MANIFEST_STOPPED_NOTICE);
      expect(toast.action?.label).toBe('Restart');
    }
  });

  it('a window whose bridge has no relaunch gets the same toast and no button', () => {
    bridgeHasRelaunch = false;
    gmuxHolder.gmux = bridge();
    const toast = say({ kind: 'manifest-stopped', fileFine: true });
    expect(toast.text).toBe(MANIFEST_STOPPED_NOTICE);
    expect(toast.sticky).toBe(true);
    expect(toast.action).toBeUndefined();
  });

  it('fits a sticky toast, and carries no dash, no tmux word and no file verdict', () => {
    // Six lines of about 29 characters beside the button (Toasts.tsx).
    expect(MANIFEST_STOPPED_NOTICE.length).toBeLessThanOrEqual(6 * 29);
    expect(MANIFEST_STOPPED_NOTICE).not.toContain('—');
    expect(MANIFEST_STOPPED_NOTICE).not.toContain('–');
    expect(MANIFEST_STOPPED_NOTICE).not.toMatch(/\b(pane|window|prefix|tmux|SQLite|database|damaged)\b/i);
  });
});
