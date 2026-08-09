/**
 * S10 — Toasts: bottom-right, max 3 visible (older collapse to "+n"),
 * info/success auto-dismiss 5s, errors sticky with ×.
 */

import React from 'react';
import { useApp } from '../state/store';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, XIcon } from './icons';

const ICONS = {
  info: InfoIcon,
  success: CircleCheckIcon,
  error: CircleAlertIcon
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
        const Icon = ICONS[toast.kind];
        const sticky = toast.sticky ?? toast.kind === 'error';
        return (
          <div key={toast.id} className="toast">
            <span className={`toast-icon ${toast.kind}`}>
              <Icon size={16} />
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
                <XIcon size={14} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
