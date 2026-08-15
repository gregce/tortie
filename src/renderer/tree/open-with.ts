/**
 * Open With (Phase 39) — the submenu's SHAPE, and the typed doorway to the
 * two channels behind it.
 *
 * The shape is pure so it can be tested without a tree, a bridge or a native
 * menu, which matters more here than anywhere else in the explorer: a macOS
 * menu is an OS-owned window, so `capturePage` cannot photograph it and a
 * screenshot can never show that this list was right.
 *
 * Nothing here decides anything about the apps themselves. Which apps macOS
 * registers, which one is the default, and every refusal all live in
 * src/main/fs/open-with.ts, because only main can spawn a process.
 */

import type {
  GmuxOpenWithExtras,
  OpenWithApp,
  OpenWithApps,
  OpenWithAppsInput,
  OpenWithInput,
  OpenWithOutcome
} from '@shared/ipc';
import type { MenuItemSpec } from '../state/store';

// ---------------------------------------------------------------------------
// Every string the user reads
// ---------------------------------------------------------------------------

/** The parent item on the explorer's context menu. */
export const OPEN_WITH_LABEL = 'Open With';

/**
 * The degraded first item. It appears only when the lookup did not answer,
 * never when the lookup answered with nothing: claiming a default that does
 * not exist would be a lie.
 */
export const OPEN_DEFAULT_LABEL = 'Open in Default App';

/**
 * The last item, always present. The single character '…' matches
 * 'New File…', 'New Folder…' and 'Rename…' already on this menu.
 */
export const OTHER_LABEL = 'Other…';

/**
 * The default app's row. Finder marks the default with the word rather than
 * a check glyph, and a word also survives a screenshot read.
 */
export function defaultAppLabel(name: string): string {
  return `${name} (default)`;
}

/**
 * The toast after a launch that failed.
 *
 * Two sentences when main sent prose of its own, e.g. "Could not open the
 * file with Bear. That app is no longer on this Mac." The headline alone
 * carries no trailing period, matching 'Could not reveal the file in Finder'
 * and 'Could not copy the path' in the same menu.
 */
export function openWithFailureToast(
  appName: string | null,
  message: string
): string {
  const head =
    appName === null
      ? 'Could not open the file'
      : `Could not open the file with ${appName}`;
  const detail = message.trim();
  return detail.length === 0 ? head : `${head}. ${detail}`;
}

// ---------------------------------------------------------------------------
// The submenu
// ---------------------------------------------------------------------------

export interface OpenWithActions {
  /** Open the file with one app the user picked off the list. */
  withApp(app: OpenWithApp): void;
  /** Open the file with whatever macOS picks. The degraded item only. */
  withDefault(): void;
  /** Raise the system's own application panel and open with the pick. */
  choose(): void;
}

/**
 * Build the submenu for one file. Three shapes, and each says something
 * different and true:
 *
 *  - The lookup answered with apps. The default is first and marked, then a
 *    separator, then the rest by name, then a separator, then 'Other…'.
 *  - The lookup answered with nothing. Just 'Other…', because there is no
 *    default to offer.
 *  - The lookup did not answer. 'Open in Default App' plus 'Other…', which
 *    still gives the user both things that matter.
 *
 * There is no cap on the length. A long macOS menu scrolls, and hiding an app
 * with no way to tell is worse than a tall menu.
 */
export function buildOpenWithSubmenu(
  apps: OpenWithApps,
  actions: OpenWithActions
): (MenuItemSpec | 'sep')[] {
  const items: (MenuItemSpec | 'sep')[] = [];

  if (apps.status === 'unavailable') {
    items.push({
      label: OPEN_DEFAULT_LABEL,
      run: () => actions.withDefault()
    });
  } else {
    const { defaultApp } = apps;
    if (defaultApp !== null) {
      items.push({
        label: defaultAppLabel(defaultApp.name),
        run: () => actions.withApp(defaultApp)
      });
    }
    if (apps.apps.length > 0) {
      if (items.length > 0) items.push('sep');
      for (const app of apps.apps) {
        items.push({ label: app.name, run: () => actions.withApp(app) });
      }
    }
  }

  if (items.length > 0) items.push('sep');
  items.push({ label: OTHER_LABEL, run: () => actions.choose() });
  return items;
}

// ---------------------------------------------------------------------------
// The bridge, feature detected like every other optional fs channel
// ---------------------------------------------------------------------------

function extras(): GmuxOpenWithExtras {
  return (window.gmux?.fs ?? {}) as GmuxOpenWithExtras;
}

/**
 * True when this build's preload carries both channels. Without them the
 * explorer simply does not show Open With, rather than showing an item that
 * throws on click.
 */
export function canOpenWith(): boolean {
  const api = extras();
  return (
    typeof api.openWithApps === 'function' && typeof api.openWith === 'function'
  );
}

export function openWithApps(input: OpenWithAppsInput): Promise<OpenWithApps> {
  const fn = extras().openWithApps;
  if (typeof fn !== 'function') {
    return Promise.reject(new Error('fs.openWithApps is not available'));
  }
  return fn(input);
}

// ---------------------------------------------------------------------------
// The budget, enforced where it is felt
// ---------------------------------------------------------------------------

/**
 * How long the renderer waits for the whole answer before it draws the
 * degraded submenu.
 *
 * Main runs a deadline of its own, OPEN_WITH_DEADLINE_MS. Main's deadline
 * cannot keep the 150 ms budget on its own, because it starts after the IPC
 * call has already been made and ends before the reply has been delivered.
 * That work was measured at up to 30.4 ms on a quiet machine and at 72.5 ms
 * once under load, and a first click was seen returning the degraded submenu
 * after 212.5 ms because main's deadline had answered on time while the round
 * trip had not.
 *
 * This deadline is timed from before the IPC call, so the round trip is
 * inside it rather than outside it. 120 ms leaves about 30 ms for building
 * the item array and raising the menu, which was measured in single digit
 * milliseconds.
 *
 * THE CAP IS BOUNDED BY CONSTRUCTION EXCEPT WHEN THE EVENT LOOP IS STARVED,
 * and that is a measured statement rather than a caveat. A `setTimeout(120)`
 * only fires when the renderer's event loop gets to it, so on a machine busy
 * enough to delay the timer itself the deadline is delivered late and the
 * budget breaks. The verifier measured 26 readings on 2026-08-15. From load
 * average 15 to 82 it was 21 of 21 inside 150 ms with a worst case of
 * 136.7 ms, cold extensions included. At load average 116 it was 2 of 5:
 * json 207.5 ms, zzqq 192.1 ms and md 154.2 ms. Each of those three also
 * came back 'unavailable', which is the worst of both, being a long wait and
 * then the short menu. Holding the budget at that load is not reachable
 * while osascript is spawned on the click path, so the honest claim is the
 * one above with its numbers, not a promise the code cannot keep.
 *
 * A late answer is not wasted. Main is still filling its per-extension cache,
 * so the next right click on that extension is a cache hit and shows the full
 * list.
 */
export const OPEN_WITH_MENU_DEADLINE_MS = 120;

/**
 * Ask for the apps, and give up at OPEN_WITH_MENU_DEADLINE_MS.
 *
 * Giving up means answering 'unavailable', which is the same answer main
 * gives when its own deadline wins, so there is one degraded shape and not
 * two. A rejection from the bridge is left to the caller, because a refused
 * path and a slow machine are different things and the caller treats them
 * differently.
 */
export function openWithAppsWithinBudget(
  input: OpenWithAppsInput,
  deadlineMs: number = OPEN_WITH_MENU_DEADLINE_MS
): Promise<OpenWithApps> {
  const asked = openWithApps(input);
  // An answer that lands after the deadline has nobody left to tell, and an
  // unhandled rejection would surface as a console error in a run that was
  // otherwise fine.
  asked.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gaveUp = new Promise<OpenWithApps>((resolve) => {
    timer = setTimeout(() => resolve({ status: 'unavailable' }), deadlineMs);
  });
  return Promise.race([asked, gaveUp]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

export function openWith(input: OpenWithInput): Promise<OpenWithOutcome> {
  const fn = extras().openWith;
  if (typeof fn !== 'function') {
    return Promise.reject(new Error('fs.openWith is not available'));
  }
  return fn(input);
}
