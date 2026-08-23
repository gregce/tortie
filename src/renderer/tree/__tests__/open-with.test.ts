/**
 * The Open With submenu's SHAPE (Phase 39).
 *
 * This is the only place the submenu can be checked at all. A macOS menu is
 * an OS-owned window, so `capturePage` cannot photograph it, and the live
 * probe can only read back the array the renderer built. So the three shapes
 * are pinned here as label arrays, exactly as a reader would see them.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpenWithApp, OpenWithApps } from '@shared/ipc';
import { OPEN_WITH_DEADLINE_MS } from '../../../main/fs/open-with';
import type { MenuItemSpec } from '../../menus/spec';
import {
  OPEN_DEFAULT_LABEL,
  OPEN_WITH_MENU_DEADLINE_MS,
  OTHER_LABEL,
  buildOpenWithSubmenu,
  defaultAppLabel,
  openWithAppsWithinBudget,
  openWithFailureToast
} from '../open-with';
import type { OpenWithActions } from '../open-with';

function app(name: string, path = `/Applications/${name}.app`): OpenWithApp {
  return { path, name, bundleId: `com.test.${name.toLowerCase()}` };
}

function actions(): OpenWithActions {
  return { withApp: vi.fn(), withDefault: vi.fn(), choose: vi.fn() };
}

/** Labels with separators shown, so their placement is part of the assertion. */
function labels(items: (MenuItemSpec | 'sep')[]): string[] {
  return items.map((item) => (item === 'sep' ? 'sep' : item.label));
}

describe('the normal submenu', () => {
  const ready = {
    status: 'ready' as const,
    defaultApp: app('Preview', '/System/Applications/Preview.app'),
    apps: [app('Bear'), app('Safari'), app('WhatsApp')]
  };

  it('puts the default first and marks it with the word', () => {
    expect(labels(buildOpenWithSubmenu(ready, actions()))).toEqual([
      'Preview (default)',
      'sep',
      'Bear',
      'Safari',
      'WhatsApp',
      'sep',
      'Other…'
    ]);
  });

  it('opens with the app whose row was picked', () => {
    const act = actions();
    const items = buildOpenWithSubmenu(ready, act);
    const safari = items.find(
      (item): item is MenuItemSpec => item !== 'sep' && item.label === 'Safari'
    );
    safari?.run();
    expect(act.withApp).toHaveBeenCalledWith(ready.apps[1]);
  });

  it('offers only the default and Other when nothing else is registered', () => {
    expect(
      labels(
        buildOpenWithSubmenu(
          { status: 'ready', defaultApp: app('Preview'), apps: [] },
          actions()
        )
      )
    ).toEqual(['Preview (default)', 'sep', 'Other…']);
  });
});

describe('the submenu when nothing claims the file', () => {
  it('is Other alone, because claiming a default would be a lie', () => {
    const items = buildOpenWithSubmenu(
      { status: 'ready', defaultApp: null, apps: [] },
      actions()
    );
    expect(labels(items)).toEqual([OTHER_LABEL]);
  });

  it('raises the system panel from that one item', () => {
    const act = actions();
    const items = buildOpenWithSubmenu(
      { status: 'ready', defaultApp: null, apps: [] },
      act
    );
    const other = items[0];
    if (other !== undefined && other !== 'sep') other.run();
    expect(act.choose).toHaveBeenCalled();
  });
});

describe('the submenu when the lookup did not answer', () => {
  it('degrades to the default app plus Other', () => {
    const items = buildOpenWithSubmenu({ status: 'unavailable' }, actions());
    expect(labels(items)).toEqual([OPEN_DEFAULT_LABEL, 'sep', OTHER_LABEL]);
  });

  it('lets macOS choose, rather than naming an app it cannot name', () => {
    const act = actions();
    const items = buildOpenWithSubmenu({ status: 'unavailable' }, act);
    const first = items[0];
    if (first !== undefined && first !== 'sep') first.run();
    expect(act.withDefault).toHaveBeenCalled();
    expect(act.withApp).not.toHaveBeenCalled();
  });
});

describe('the words', () => {
  it('marks the default the way Finder does', () => {
    expect(defaultAppLabel('Preview')).toBe('Preview (default)');
  });

  it('names the app in the toast when it knows which one failed', () => {
    expect(openWithFailureToast('Bear', 'That app is no longer on this Mac.')).toBe(
      'Could not open the file with Bear. That app is no longer on this Mac.'
    );
  });

  it('drops the name when the default app was used', () => {
    expect(openWithFailureToast(null, '')).toBe('Could not open the file');
  });
});

// ---------------------------------------------------------------------------
// The budget, enforced in the renderer because that is where it is felt
// ---------------------------------------------------------------------------

describe('the renderer deadline', () => {
  const input = { root: '/root', path: '/root/a.png' };

  /** Install a fake bridge whose openWithApps settles when we say. */
  function install(answer: () => Promise<OpenWithApps>): void {
    (globalThis as { window?: unknown }).window = {
      gmux: { fs: { openWithApps: answer, openWith: vi.fn() } }
    };
  }

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.useRealTimers();
  });

  it('is 120 ms, which leaves room under the 150 ms budget', () => {
    expect(OPEN_WITH_MENU_DEADLINE_MS).toBe(120);
    expect(OPEN_WITH_MENU_DEADLINE_MS).toBeLessThan(150);
  });

  it('sits above main deadline by the worst round trip measured', () => {
    // The two numbers only make sense together, so one test reads both. A
    // test may do this and production code may not. Every file under a
    // __tests__ directory belongs to tsconfig.tests.json (Phase 124), which
    // is the one project that references both the renderer and main, and
    // __tests__ is exempt from the import boundary check as well.
    //
    // Main must usually answer before the renderer gives up, or main's cache
    // would fill for a click nobody is waiting on any more. The gap is the
    // worst round trip measured on a quiet machine, 30.4 ms.
    expect(OPEN_WITH_MENU_DEADLINE_MS - OPEN_WITH_DEADLINE_MS).toBe(30);
  });

  it('passes a quick answer straight through', async () => {
    const ready: OpenWithApps = { status: 'ready', defaultApp: null, apps: [] };
    install(async () => ready);
    expect(await openWithAppsWithinBudget(input, 50)).toEqual(ready);
  });

  it('answers unavailable when the whole round trip overruns', async () => {
    // The point of this test is the case main's own deadline cannot cover.
    // Main answered 'ready' here, in time by its own clock. The renderer
    // still gave up, because what the user waits for is the round trip and
    // this one took longer than the deadline.
    install(
      () =>
        new Promise<OpenWithApps>((resolve) => {
          setTimeout(
            () => resolve({ status: 'ready', defaultApp: null, apps: [] }),
            80
          );
        })
    );
    const started = Date.now();
    const answer = await openWithAppsWithinBudget(input, 20);
    expect(answer).toEqual({ status: 'unavailable' });
    expect(Date.now() - started).toBeLessThan(80);
  });

  it('lets a rejection through so a refused path is not read as a slow one', async () => {
    install(async () => {
      throw new Error('refused');
    });
    await expect(openWithAppsWithinBudget(input, 50)).rejects.toThrow('refused');
  });

  it('does not reject when the bridge fails after the deadline', async () => {
    install(
      () =>
        new Promise<OpenWithApps>((_resolve, reject) => {
          setTimeout(() => reject(new Error('late refusal')), 40);
        })
    );
    expect(await openWithAppsWithinBudget(input, 5)).toEqual({
      status: 'unavailable'
    });
    // Give the late rejection time to land. It must not become an unhandled
    // rejection, which vitest would fail the run for.
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
});
