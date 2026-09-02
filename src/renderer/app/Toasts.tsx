/**
 * S10 — Toasts: bottom-right, max 3 visible (older collapse to "+n"),
 * info/success auto-dismiss 5s, errors sticky with ×.
 *
 * PHASE 93 gave a sticky toast its own class, and the reason is measured. The
 * text is clamped to two lines. The refusals this phase writes are two
 * sentences, because the second sentence is the one saying the session is
 * still running and was not ended. MEASURED live on 2026-08-19 at the panel's
 * 360 px width: a 197 character refusal filled 5 lines of 20 px and the box
 * showed 40 px of them, so the half that matters was not on screen at all.
 * A toast that goes away by itself is still clamped to two lines, because a
 * person cannot scroll something that leaves in five seconds. A sticky one
 * stays until it is dismissed, so it is allowed six.
 */

import React from 'react';
import { useApp } from '../state/store';
import { Codicon } from '../icons';

/* Codicon ids per toast kind (round 1 — codicons carry all UI chrome). */
const ICONS = {
  info: 'info',
  success: 'pass',
  error: 'error'
} as const;

export function Toasts(): React.JSX.Element | null {
  const toasts = useApp((s) => s.toasts);
  const dismissToast = useApp((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  const visible = toasts.slice(-3);
  const hidden = toasts.length - visible.length;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {hidden > 0 ? (
        <div className="toast-overflow num">+{hidden} more</div>
      ) : null}
      {visible.map((toast) => {
        const sticky = toast.sticky ?? toast.kind === 'error';
        return (
          <div key={toast.id} className={`toast${sticky ? ' toast-sticky' : ''}`}>
            <span className={`toast-icon ${toast.kind}`}>
              <Codicon name={ICONS[toast.kind]} size="lg" />
            </span>
            <span className="toast-text">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  toast.action?.run();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            {sticky ? (
              <button
                type="button"
                className="icon-btn"
                aria-label="Dismiss"
                onClick={() => dismissToast(toast.id)}
              >
                <Codicon name="close" size="md" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
