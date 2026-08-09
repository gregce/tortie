/**
 * Confirm dialog — S6 modal chrome; destructive confirms use the error fill
 * (DESIGN.md §3 buttons: destructive only inside confirms).
 */

import React, { useEffect, useRef } from 'react';
import { useApp } from '../state/store';
import { trapTabKey } from './focus-trap';

export function ConfirmDialog(): React.JSX.Element | null {
  const confirm = useApp((s) => s.confirm);
  const setConfirm = useApp((s) => s.setConfirm);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (confirm) requestAnimationFrame(() => confirmRef.current?.focus());
  }, [confirm]);

  if (!confirm) return null;

  const run = (): void => {
    const { onConfirm } = confirm;
    setConfirm(null);
    onConfirm();
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirm(null);
      }}
    >
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={confirm.title}
        onKeyDown={(e) => {
          // aria-modal promises the shell behind the scrim is inert; make
          // the keyboard honor it (Tab cycles inside the dialog).
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            setConfirm(null);
          }
          if (e.key === 'Enter') {
            // Let a focused button run its NATIVE activation — otherwise
            // Enter on [Cancel] would confirm a destructive action.
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            run();
          }
        }}
      >
        <h2 className="modal-title">{confirm.title}</h2>
        <p className="modal-body">{confirm.body}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirm(null)}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${confirm.destructive ? 'btn-destructive' : 'btn-primary'}`}
            onClick={run}
          >
            {confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
