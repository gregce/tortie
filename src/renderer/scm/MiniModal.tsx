/**
 * Mini-modal (DESIGN-SPEC S3A) — Create branch… / Create tag…, from the
 * branch menu or a commit's context menu. w:360, S6 chrome, one mono input,
 * optional "from a1b2c3d" caption, inline validation; ↩ creates, Esc cancels.
 */

import React, { useEffect, useRef, useState } from 'react';
import { trapTabKey } from '../app/focus-trap';

export interface MiniModalSpec {
  /** "Create branch" | "Create tag" (sentence case — S12.8). */
  title: string;
  /** Input placeholder, e.g. "branch-name". */
  placeholder: string;
  /** Caption under the input when created from a commit: "from a1b2c3d". */
  caption?: string;
  /**
   * Runs the git verb. Resolves null on success (modal closes) or an
   * inline-error line (modal stays open, input keeps its text).
   */
  submit(name: string): Promise<string | null>;
}

export function MiniModal({
  spec,
  onClose
}: {
  spec: MiniModalSpec;
  onClose: () => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const create = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    const failure = await spec.submit(trimmed);
    setBusy(false);
    if (failure === null) onClose();
    else setError(failure);
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal scm-mini-modal"
        role="dialog"
        aria-modal="true"
        aria-label={spec.title}
        onKeyDown={(e) => {
          trapTabKey(e, e.currentTarget);
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
          if (e.key === 'Enter') {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            e.preventDefault();
            void create();
          }
        }}
      >
        <h2 className="modal-title">{spec.title}</h2>
        <input
          ref={inputRef}
          className={`input input-mono scm-mini-input${error !== null ? ' input-error' : ''}`}
          type="text"
          placeholder={spec.placeholder}
          aria-label={spec.placeholder}
          value={name}
          spellCheck={false}
          disabled={busy}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {error !== null ? (
          <p className="input-error-text scm-mini-note" role="alert">
            {error}
          </p>
        ) : spec.caption !== undefined ? (
          <p className="scm-mini-caption scm-mini-note">{spec.caption}</p>
        ) : null}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || name.trim().length === 0}
            onClick={() => void create()}
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
