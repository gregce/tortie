/**
 * What the saved output panel draws between its title and its buttons
 * (Phase 72, drawn in two places since Phase 293).
 *
 * WHY THIS IS ITS OWN FILE. Two surfaces show one session's saved output now:
 * the modal every session menu opens (./SavedOutputModal.tsx), and the
 * expansion the session manager opens under a row, because nothing may stack
 * as a modal over that sheet. The words a person reads about a saved copy, and
 * above all the moment it was taken, are the point of both, and a second
 * spelling of them is a second answer the first time either is edited. So both
 * draw this component, and each keeps only its own frame: the modal its scrim,
 * title and Close button, the sheet its panel heading and close icon.
 *
 * It is pure over its props and reads no store, for the reason the modal's
 * header gives: a component that decides copy has to be testable from a static
 * render, and zustand answers a server render from the store's initial state.
 *
 * The text is drawn as a React child of a `<pre>` and never parsed, exactly as
 * before the move. `readSavedOutput` in main already took the escape sequences
 * and control bytes out, and React escapes whatever is left.
 */

import React from 'react';
import type { SavedSessionOutput } from '@shared/ipc';
import type { Session } from '@shared/types';
import {
  conversationCopyLine,
  SAVED_OUTPUT_LOADING,
  SAVED_OUTPUT_NONE,
  SAVED_OUTPUT_UNVERIFIED,
  savedOutputHeader,
  savedOutputHeaderLocal
} from '../machines/session-restore';

export interface SavedOutputBodyProps {
  /** The row this output belongs to, or null when neither list still holds it. */
  session: Session | null;
  /** What main answered, or null when there is nothing saved. */
  output: SavedSessionOutput | null;
  /** True while the one read is in flight. */
  loading: boolean;
}

/**
 * The copy's header, the conversation line, the unverified warning and the
 * text, in that order.
 *
 * The machine label comes from the SESSION row rather than from the capsule's
 * machine id, because the row carries the label a person chose and the capsule
 * carries an identifier. A row whose machine a person removed keeps the label
 * in `machineGone`, so a tombstoned session still says where its output came
 * from. With neither, the header names no machine rather than naming an
 * identifier nobody recognises.
 */
export function SavedOutputBody({
  session,
  output,
  loading
}: SavedOutputBodyProps): React.JSX.Element {
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
    <>
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
    </>
  );
}
