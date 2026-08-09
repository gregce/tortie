/**
 * TerminalHost — mounts TerminalPanes ONLY for visible sessions.
 *
 * Hidden sessions cost nothing (no xterm instance, no attach PTY — the
 * architecture's biggest scalability lever); switching sessions unmounts
 * one pane (detach) and mounts another (fresh attach + tmux redraw).
 *
 * Pure component: the app stream's store decides which sessions are
 * visible/focused and passes them down. In v1 exactly one session is
 * visible per project tab, but the host lays out any number as a column
 * (future splits).
 */

import React from 'react';
import type { Session } from '@shared/types';
import { TerminalPane } from './TerminalPane';
import './terminal.css';

export interface TerminalHostProps {
  /** All known sessions (lookup source for the visible ids). */
  sessions: Session[];
  /** Sessions whose panes should exist right now (usually one). */
  visibleSessionIds: string[];
  /** Which visible pane owns the keyboard. */
  focusedSessionId?: string | null;
}

export function TerminalHost({
  sessions,
  visibleSessionIds,
  focusedSessionId = null
}: TerminalHostProps): React.JSX.Element {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const visible: Session[] = [];
  for (const id of visibleSessionIds) {
    const session = byId.get(id);
    if (session) visible.push(session);
  }

  return (
    <div className="gmux-terminal-host" data-slot-owner="terminal">
      {visible.length === 0 ? (
        <div className="gmux-terminal-empty">
          <div className="gmux-terminal-empty-title">No session selected</div>
          <div>Press ⌘T to start a new session.</div>
        </div>
      ) : (
        visible.map((session) => (
          <TerminalPane
            key={session.id}
            sessionId={session.id}
            status={session.status}
            focused={session.id === focusedSessionId}
          />
        ))
      )}
    </div>
  );
}
