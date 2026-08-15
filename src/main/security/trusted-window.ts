/**
 * THE trusted-window policy (Phase 42 stage 1) — navigation and new-window
 * restrictions plus the IPC sender trust check, stated once and applied to
 * every window Tortie creates for its own renderers.
 *
 * Before this module, the policy lived inline in the main window's
 * `createWindow()` and the Settings window had none: a `window.open` or a
 * plain `<a href>` in the Settings renderer could have navigated that window
 * anywhere. The audit (docs/audits/2026-08-14-electron-typescript-architecture.md,
 * "As-built corrections") called that out, and extending the policy to the
 * Settings window is the one sanctioned hardening of the stage.
 *
 * Three rules, and why each is shaped the way it is:
 *
 * 1. **New windows never open.** `setWindowOpenHandler` denies everything;
 *    an http(s) target goes to the system browser instead. Terminal web
 *    links and rendered-markdown targets are links OUT of Tortie, never new
 *    Tortie windows.
 *
 * 2. **A Tortie window never navigates.** `setWindowOpenHandler` only covers
 *    `window.open` / `target=_blank`. A plain `<a href="https://…">` — which
 *    rendered markdown is full of — would navigate the renderer away from
 *    the app, tearing down every terminal attachment with it. Each window is
 *    a single fixed document: nothing may navigate it except the initial
 *    load and a dev-server reload (a navigation to its own current URL).
 *
 * 3. **Privileged IPC answers only windows Tortie created.** Every window
 *    that passes through `applyTrustedWindowPolicy` is registered as a
 *    trusted sender; `src/main/typed-ipc.ts` — THE one invoke registrar —
 *    asks this module before dispatching any handler. The preload runs only
 *    in the top frame, so a legitimate invoke always arrives from a
 *    registered WebContents' main frame; anything else (a subframe, a
 *    WebContents Tortie never made) is refused by name. This is the
 *    Electron security checklist's "validate the sender" item, held in one
 *    place instead of 124 handler bodies.
 *
 * The decisions are pure functions so the policy is testable without a
 * BrowserWindow; the apply/register functions are the only Electron-touching
 * surface.
 */

import { shell } from 'electron';
import type {
  BrowserWindow,
  IpcMainInvokeEvent,
  WebContents
} from 'electron';

// ---------------------------------------------------------------------------
// Pure decisions
// ---------------------------------------------------------------------------

export interface NavigationDecision {
  /** Let the window perform the navigation / open the child window. */
  allow: boolean;
  /** Hand the URL to the system browser instead. */
  openExternally: boolean;
}

const EXTERNAL_URL = /^https?:/i;

/** window.open / target=_blank: never a child window; http(s) → browser. */
export function decideWindowOpen(url: string): NavigationDecision {
  return { allow: false, openExternally: EXTERNAL_URL.test(url) };
}

/**
 * In-window navigation: only a reload (same URL) may proceed; http(s)
 * targets go to the system browser; everything else is dropped.
 */
export function decideNavigation(
  url: string,
  currentUrl: string
): NavigationDecision {
  if (url === currentUrl) return { allow: true, openExternally: false };
  return { allow: false, openExternally: EXTERNAL_URL.test(url) };
}

// ---------------------------------------------------------------------------
// IPC sender trust
// ---------------------------------------------------------------------------

/** WebContents ids trusted to invoke privileged IPC. */
const trustedSenders = new Set<number>();

/**
 * Mark a WebContents Tortie created as a trusted IPC sender. Registration
 * lives exactly as long as the WebContents does.
 */
export function registerTrustedIpcSender(contents: WebContents): void {
  const id = contents.id;
  trustedSenders.add(id);
  contents.once('destroyed', () => {
    trustedSenders.delete(id);
  });
}

/**
 * Is this invoke from the main frame of a WebContents Tortie registered?
 * `senderFrame` is null when the frame was disposed mid-flight; the sender
 * registration already answers ownership, so a disposed frame does not turn
 * a trusted window's call into a refusal.
 */
export function isTrustedIpcSender(event: IpcMainInvokeEvent): boolean {
  if (!trustedSenders.has(event.sender.id)) return false;
  const frame = event.senderFrame;
  return frame === null || frame === event.sender.mainFrame;
}

/** Refuse an invoke from anything but a trusted window, naming the channel. */
export function assertTrustedIpcSender(
  event: IpcMainInvokeEvent,
  channel: string
): void {
  if (!isTrustedIpcSender(event)) {
    throw new Error(
      `ipc: refused '${channel}' from an untrusted sender ` +
        `(webContents ${String(event.sender.id)})`
    );
  }
}

// ---------------------------------------------------------------------------
// Window policy
// ---------------------------------------------------------------------------

/**
 * Apply the full trusted-window policy to a window Tortie created: new
 * windows denied (http(s) → system browser), navigation locked to reloads,
 * and the window's WebContents registered as a trusted IPC sender.
 */
export function applyTrustedWindowPolicy(win: BrowserWindow): void {
  registerTrustedIpcSender(win.webContents);

  win.webContents.setWindowOpenHandler(({ url }) => {
    const decision = decideWindowOpen(url);
    if (decision.openExternally) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const decision = decideNavigation(url, win.webContents.getURL());
    if (decision.allow) return;
    event.preventDefault();
    if (decision.openExternally) void shell.openExternal(url);
  });
}
