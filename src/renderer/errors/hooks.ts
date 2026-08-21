/**
 * Renderer error capture (Phase 35, research 42).
 *
 * Before this module, an uncaught renderer exception was fully silent in a
 * packaged build: no console survives packaging, and nothing else was
 * listening. `installRendererErrorCapture(scope)` is called once per window,
 * from src/renderer/main.tsx with 'renderer' and from
 * src/renderer/settings/main.tsx with 'settings'. It installs three things:
 *
 *   - `window.onerror`, which writes one error record with the message, the
 *     source file, the line and the column.
 *   - a `window.addEventListener('unhandledrejection')` listener, which
 *     writes one error record with the reason stringified.
 *   - nothing else. The React error boundary lives beside this file and
 *     writes through the same bounded writer, so one window shares one cap.
 *
 * THE BOUNDS, because an error loop must never eat the log budget. This
 * window writes at most 50 lines per run, below main's own 200 line per
 * sender cap, and a line identical to the one just written is suppressed.
 * Fifty is deliberate: a render loop that throws on every frame writes a
 * handful of distinct lines and then stops, and the file still has room for
 * every other scope.
 *
 * FEATURE DETECTION: when `window.gmux.log` is absent the hooks do nothing.
 * And the one rule the whole log module lives by holds here too: logging
 * never throws into a caller. Every path out of this file swallows its own
 * failures.
 */

import type { InstalledGmuxApi, RendererLogScope } from '@shared/ipc';
import { gmuxBridge } from '../bridge';

/** Lines this window may write per run. Below main's 200 per sender. */
const LOCAL_LINE_CAP = 50;

/** Local mirror of main's message truncation, to keep the IPC payload small. */
const MSG_MAX = 2048;

let installedScope: RendererLogScope | null = null;
let written = 0;
let lastKey: string | null = null;

function bridge(): NonNullable<InstalledGmuxApi['log']> | null {
  try {
    return gmuxBridge()?.log ?? null;
  } catch {
    return null;
  }
}

/** One line of text for an arbitrary rejection reason. */
function reasonText(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason) ?? String(reason);
  } catch {
    return String(reason);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/**
 * The one bounded writer this window has. The error boundary calls it too,
 * so the 50 line cap and the consecutive-duplicate suppression cover every
 * captured error in the window, whichever hook saw it first.
 */
export function writeErrorRecord(
  scope: RendererLogScope,
  msg: string,
  fields?: Record<string, unknown>
): void {
  try {
    const api = bridge();
    if (api === null) return;
    if (written >= LOCAL_LINE_CAP) return;
    const bounded = msg.length > MSG_MAX ? msg.slice(0, MSG_MAX) : msg;
    const key = `${bounded}|${safeStringify(fields)}`;
    if (key === lastKey) return;
    lastKey = key;
    written += 1;
    void api
      .append({
        level: 'error',
        scope,
        msg: bounded,
        ...(fields !== undefined ? { fields } : {})
      })
      .catch(() => undefined);
  } catch {
    // Logging must never become the thing that breaks the app.
  }
}

/**
 * Install the window-level hooks. Idempotent per window: a second call is a
 * no-op, so a hot-reloaded entry module cannot stack handlers.
 */
export function installRendererErrorCapture(scope: RendererLogScope): void {
  try {
    if (installedScope !== null) return;
    if (bridge() === null) return;
    installedScope = scope;

    const previous = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msg =
        typeof message === 'string'
          ? message
          : error instanceof Error
            ? `${error.name}: ${error.message}`
            : 'Unknown error';
      writeErrorRecord(scope, msg, {
        source: source ?? '',
        line: lineno ?? 0,
        col: colno ?? 0
      });
      if (typeof previous === 'function') {
        try {
          return previous(message, source, lineno, colno, error) === true;
        } catch {
          return false;
        }
      }
      return false;
    };

    window.addEventListener('unhandledrejection', (event) => {
      writeErrorRecord(scope, reasonText(event.reason));
    });
  } catch {
    // A window with no capture is degraded, not broken. Never throw here.
  }
}

/** The installed scope and the line count so far (tests). */
export function rendererErrorCaptureState(): {
  scope: RendererLogScope | null;
  written: number;
} {
  return { scope: installedScope, written };
}

/** Reset the module state between tests. Never called by the app. */
export function resetRendererErrorCapture(): void {
  installedScope = null;
  written = 0;
  lastKey = null;
}
