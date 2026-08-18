/**
 * Saved output (Phase 72), the copy Tortie kept and the moment it was taken.
 *
 * ONE session menu item opens it. It shows the newest copy Tortie holds for
 * that session, on this Mac, and above the text it always shows when the copy
 * was taken.
 *
 * ## Why the capture time is the point of the panel
 *
 * Saved output looks exactly like live output. A screen of an agent working is
 * a screen of an agent working whether it was read a second ago or four hours
 * ago, and the difference decides whether a person acts on it. So the time is
 * not a detail in a corner: it is the first line, it is there in every state,
 * and when it was never recorded the panel says that instead of drawing a date
 * from nowhere.
 *
 * ## Why the panel exists at all
 *
 * For a session on another machine, bringing it back does NOT put the saved
 * output into the recreated session on that machine. Research 51 section 4.5
 * defers the one write to the far side to M6, and the two ways of doing it
 * without a write are refused in `src/main/machines/remote-capsule.ts`. So the
 * output stays here, and this is where a person reads it.
 *
 * ## The second line, and it is about a different copy (Phase 73, item 5)
 *
 * A session on another machine has two copies on this Mac and they are not the
 * same thing. The first is the screen a pane printed, and the line above it
 * says when that was read. The second is the agent's own conversation file,
 * which Tortie brings home while it is connected to the machine, and the line
 * under the header says when that last happened.
 *
 * The promise is last sync staleness and nothing else. A machine that has been
 * out of reach for a day carries the same instant it carried a day ago, so the
 * sentence gets older rather than being refreshed. The line is drawn for every
 * session that runs on a machine, including one Tortie has never copied, and
 * that case says so rather than drawing a date from nowhere.
 *
 * ## The bytes are drawn and never parsed
 *
 * The text is whatever a pane printed, on a machine Tortie does not control. It
 * arrives with the escape sequences and the single byte controls already
 * removed, by `readSavedOutput` in main, which is where this codebase's one
 * ANSI stripper lives. It then goes into a `<pre>` as a React child, so React
 * escapes it and nothing in it can become markup. No branch in this file reads
 * its content to decide anything. Fault matrix row 8 drives control sequences,
 * a bell and 4 KB of random bytes through it.
 *
 * ## Two components, and the reason is testability
 *
 * `SavedOutputPanel` takes what it draws as props and reads no store.
 * `SavedOutputModal` is the store connected wrapper and holds no markup of its
 * own. The split exists because the panel decides which sentence a person
 * reads, and a component that decides copy has to be testable without a live
 * store: zustand answers a server render from the store's INITIAL state, so a
 * store connected component cannot be driven by a test that renders to static
 * markup.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { SavedSessionOutput } from '@shared/ipc';
import type { Session } from '@shared/types';
import { useApp } from '../state/store';
import { modalKeyDown } from './focus-trap';
import {
  SAVED_OUTPUT_LOADING,
  SAVED_OUTPUT_NONE,
  SAVED_OUTPUT_TITLE,
  SAVED_OUTPUT_UNVERIFIED,
  conversationCopyLine,
  savedOutputHeader,
  savedOutputHeaderLocal
} from './machine-copy';
import './saved-output.css';

export interface SavedOutputPanelProps {
  /** The row this output belongs to, or null when neither list still holds it. */
  session: Session | null;
  /** What main answered, or null when there is nothing saved. */
  output: SavedSessionOutput | null;
  /** True while the one read is in flight. */
  loading: boolean;
  close: () => void;
}

/**
 * The panel itself. Pure over its props.
 *
 * The machine label comes from the SESSION row rather than from the capsule's
 * machine id, because the row carries the label a person chose and the capsule
 * carries an identifier. A row whose machine a person removed keeps the label
 * in `machineGone`, so a tombstoned session still says where its output came
 * from. With neither, the header names no machine rather than naming an
 * identifier nobody recognises.
 */
export function SavedOutputPanel({
  session,
  output,
  loading,
  close
}: SavedOutputPanelProps): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => closeRef.current?.focus());
  }, []);

  const label = session?.machine?.label ?? session?.machineGone?.label ?? null;
  const header =
    output === null
      ? null
      : label === null
        ? savedOutputHeaderLocal(output.capturedAt)
        : savedOutputHeader(label, output.capturedAt);

  // PHASE 73, item 5. The second line, and it is drawn only for a session that
  // runs on a machine right now. A session on this Mac keeps its conversation
  // on this Mac, so there is nothing to copy and nothing to say. A row whose
  // machine a person removed has no `machine` either, and the line would be a
  // statement about a copy nothing can refresh.
  //
  // It is drawn in every other state of this panel, including the state where
  // there is no saved screen at all, because the two are separate copies: the
  // screen is what a pane printed and this is the agent's own conversation
  // file. A person who has one may not have the other.
  const conversation =
    session?.machine === undefined
      ? null
      : conversationCopyLine(session.machine.conversationSyncedAt);

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal saved-output-modal"
        role="dialog"
        aria-modal="true"
        aria-label={SAVED_OUTPUT_TITLE}
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            // Return has no verb here. The panel reads and does nothing.
            submit: () => undefined,
            close
          })
        }
      >
        <h2 className="modal-title">
          {session === null
            ? SAVED_OUTPUT_TITLE
            : `${SAVED_OUTPUT_TITLE}: ${session.name}`}
        </h2>

        {header === null ? null : (
          <p className="saved-output-header">{header}</p>
        )}
        {conversation === null ? null : (
          <p className="saved-output-conversation">{conversation}</p>
        )}
        {output !== null && !output.verified ? (
          <p className="saved-output-warning">{SAVED_OUTPUT_UNVERIFIED}</p>
        ) : null}

        {loading ? (
          <p className="saved-output-empty">{SAVED_OUTPUT_LOADING}</p>
        ) : output === null ? (
          <p className="saved-output-empty">{SAVED_OUTPUT_NONE}</p>
        ) : (
          <pre className="saved-output-body">{output.text}</pre>
        )}

        <div className="modal-actions">
          <button
            ref={closeRef}
            type="button"
            className="btn btn-secondary"
            onClick={close}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** The store connected wrapper. It renders null unless a session is open. */
export function SavedOutputModal(): React.JSX.Element | null {
  const sessionId = useApp((s) => s.savedOutputSessionId);
  const output = useApp((s) => s.savedOutput);
  const loading = useApp((s) => s.savedOutputLoading);
  const close = useApp((s) => s.closeSavedOutput);
  const sessions = useApp((s) => s.sessions);
  const pastSessions = useApp((s) => s.pastSessions);

  // A row the live list no longer holds can still be in Past Sessions, so both
  // lists are asked.
  const session = useMemo(() => {
    if (sessionId === null) return null;
    return (
      sessions.find((one) => one.id === sessionId) ??
      pastSessions.find((one) => one.id === sessionId) ??
      null
    );
  }, [sessionId, sessions, pastSessions]);

  if (sessionId === null) return null;
  return (
    <SavedOutputPanel
      session={session}
      output={output}
      loading={loading}
      close={close}
    />
  );
}
