/**
 * S9 — full-window states: first run (§6.1) and tmux missing (§6.4).
 * Copy is final, verbatim from DESIGN.md §6. Type-only, quiet.
 */

import React, { useState } from 'react';
import { useApp } from '../state/store';
import { CopyIcon } from './icons';

export function FirstRun(): React.JSX.Element {
  const openProject = useApp((s) => s.openProject);
  return (
    <div className="empty" data-slot="terminal-stack">
      <div className="empty-inner">
        <h2 className="empty-title">Open a project to get started</h2>
        <p className="empty-body">
          A project is any folder — a git repo gets the full sidebar. Sessions
          you start keep running even when gmux is closed.
        </p>
        <div className="empty-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void openProject()}
          >
            Open project…
          </button>
        </div>
        <div className="empty-hint">
          <span className="key">⌘O</span>
        </div>
      </div>
    </div>
  );
}

const INSTALL_CMD = 'brew install tmux';

export function TmuxMissing(): React.JSX.Element {
  const retryBoot = useApp((s) => s.retryBoot);
  const toast = useApp((s) => s.toast);
  const [checking, setChecking] = useState(false);

  return (
    <div className="empty">
      <div className="empty-inner">
        {/* §6.4 — the ONLY surface where the word tmux may appear. */}
        <h2 className="empty-title">gmux needs tmux to keep sessions alive</h2>
        <p className="empty-body">
          gmux runs sessions on a private tmux server so they survive quits
          and crashes. It never touches your own tmux setup.
        </p>
        <div className="empty-actions">
          <span className="code-row">
            {INSTALL_CMD}
            <button
              type="button"
              className="icon-btn"
              aria-label="Copy install command"
              onClick={() => {
                void navigator.clipboard.writeText(INSTALL_CMD).then(
                  () => toast('info', 'Command copied'),
                  () => toast('error', 'Could not copy the command')
                );
              }}
            >
              <CopyIcon size={14} />
            </button>
          </span>
        </div>
        <div className="empty-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={checking}
            onClick={() => {
              setChecking(true);
              void retryBoot().finally(() => setChecking(false));
            }}
          >
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>
    </div>
  );
}
