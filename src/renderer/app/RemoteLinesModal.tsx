/**
 * The last lines of a session on another machine (Phase 100).
 *
 * ## What it is, and what it is not
 *
 * It is ONE read at ONE instant. A person picks a depth, Tortie asks that
 * machine for that many lines of what the session printed, and the panel draws
 * what came back. Nothing refreshes it, and the second line under the title
 * says so on screen rather than leaving a person to watch a still picture.
 *
 * It is NOT a scrollbar. Research 57 section 3.1 refused a real remote
 * scrollbar twice over, and this phase does not reopen that. The refusal is the
 * reason the panel exists at all, so the button that opens it carries the
 * refusal as its tooltip.
 *
 * ## The two facts that are never both on screen (Phase 99.1)
 *
 * A short answer has two possible causes and they are different facts.
 *
 *  1. TORTIE CUT IT. The bytes that came back were over the ceiling main holds,
 *     so main kept the newest ones and dropped the rest. `truncated` is true and
 *     {@link READ_LINES_CUT} says which end went.
 *  2. THE SESSION HAS NO MORE. `lines` came back under `asked`, which means the
 *     read reached the start of what that session has kept.
 *     {@link READ_LINES_ALL_THERE} says so, and only when `asked` is above zero
 *     and nothing was cut.
 *
 * Phase 99 carried a cut through main and never drew it, so a list that had
 * been cut was drawn as if it were whole. That is what these two sentences and
 * the test beside them exist to stop happening again.
 *
 * ## It opens on the NEWEST line
 *
 * The feature is called reading the last lines, so the box is scrolled to its
 * bottom the moment an answer lands. The first build of this phase drew the
 * answer at its oldest line, which meant a person who asked for 25,000 lines
 * had to scroll 25,000 lines to reach the ones they opened the panel for.
 * {@link scrollToNewest} is the whole of it, and it runs again on every answer
 * rather than once, because pressing a deeper depth replaces the body.
 *
 * ## The bytes are drawn and never parsed
 *
 * The text is whatever a session printed on a machine Tortie does not control.
 * It arrives with the escape sequences and the single byte controls already
 * removed by main, and it then goes into a `<pre>` as a React child, so React
 * escapes it and nothing in it can become markup. No branch in this file reads
 * its content to decide anything.
 *
 * ## What the text is not
 *
 * Wrapped lines arrive joined. A long line the agent printed reads here as one
 * line, even though the session over there broke it across several rows. That
 * is the same reading "Capture Last 250 Lines" takes on this Mac, so a local
 * read and a remote read are the same bytes read the same way.
 *
 * ## Two components, and the reason is testability
 *
 * `RemoteLinesPanel` takes what it draws as props and reads no store.
 * `RemoteLinesModal` is the store connected wrapper and holds no markup of its
 * own. The split is the one ./SavedOutputModal.tsx documents: zustand answers a
 * server render from the store's INITIAL state, so a store connected component
 * cannot be driven by a test that renders to static markup, and this panel
 * decides which sentence a person reads.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MachineSessionLinesResult } from '@shared/ipc';
import { REMOTE_SESSION_LINE_DEPTHS } from '@shared/ipc';
import type { Session } from '@shared/types';
import { useApp } from '../state/store';
import { modalKeyDown } from './focus-trap';
import {
  READ_LINES_ALL_THERE,
  READ_LINES_CUT,
  READ_LINES_DEPTH_LABEL,
  READ_LINES_DEPTH_SCREEN,
  READ_LINES_EMPTY,
  READ_LINES_FAILED,
  READ_LINES_NO_BRIDGE,
  READ_LINES_NO_SESSION,
  READ_LINES_NOT_LIVE,
  READ_LINES_TITLE,
  readLinesCount,
  readLinesDepthLabel,
  readLinesHeader,
  readLinesNotConnected,
  readLinesReading,
  readLinesTitle,
  readLinesUnreachable,
  savedWhen
} from '../machines/presentation';
import './remote-lines.css';

export interface RemoteLinesPanelProps {
  /** The row this read belongs to, or null when neither list still holds it. */
  session: Session | null;
  /** What main answered for the last read, or null when there is no answer. */
  result: MachineSessionLinesResult | null;
  /** True while the one read is in flight. */
  loading: boolean;
  /** True when the last read was rejected rather than answered. */
  failed: boolean;
  /** The depth the panel last asked for. */
  depth: number;
  /** Read the same session again at this depth. */
  read: (lines: number) => void;
  close: () => void;
}

/**
 * Put one scrolling box at its bottom. PURE over the element.
 *
 * It is a named function rather than two lines inside an effect so the test
 * can press it, since this repository renders components to static markup and
 * a static render runs no effect. The element is typed as the two numbers it
 * uses, so a test can pass a plain object.
 */
export function scrollToNewest(
  el: { scrollTop: number; scrollHeight: number } | null
): void {
  if (el === null) return;
  el.scrollTop = el.scrollHeight;
}

/**
 * True when the session has kept less than was asked for.
 *
 * It is a separate function so the test can state the table of states rather
 * than inferring the rule from what a render happened to produce. It is false
 * whenever anything was cut, because a cut answer says nothing about how much
 * the session kept, and it is false for the screen alone, where `asked` is zero
 * and "everything this session has kept" would be a claim about nothing.
 */
export function showsAllThere(result: MachineSessionLinesResult): boolean {
  if (result.mode !== 'read') return false;
  if (result.truncated) return false;
  if (result.asked <= 0) return false;
  return result.lines < result.asked;
}

/**
 * The four depth buttons, as their own component.
 *
 * IT IS SPLIT OUT SO A TEST CAN PRESS THEM. This repository carries no jsdom
 * and no @testing-library/react, so a component is rendered with
 * `renderToStaticMarkup`, which produces markup and no handlers. A component
 * that calls no hook can instead be called as a plain function, which returns
 * the element tree with the shipped `onClick` still on it, and that is a real
 * press of the shipped handler rather than a claim about one. The panel below
 * calls three hooks, so it cannot be pressed that way.
 *
 * The depth a person last asked for is `aria-pressed`, not `disabled`. Pressing
 * it again is a real verb: it reads the session a second time at the same
 * depth, which is how a person sees what has been printed since.
 */
export function RemoteLinesDepths({
  depth,
  read
}: {
  depth: number;
  read: (lines: number) => void;
}): React.JSX.Element {
  return (
    <div
      className="remote-lines-depths"
      role="group"
      aria-labelledby="remote-lines-depth-label"
    >
      {REMOTE_SESSION_LINE_DEPTHS.map((lines) => (
        <button
          key={lines}
          type="button"
          className="btn btn-secondary btn-sm"
          aria-pressed={depth === lines}
          onClick={() => read(lines)}
        >
          {lines === 0 ? READ_LINES_DEPTH_SCREEN : readLinesDepthLabel(lines)}
        </button>
      ))}
    </div>
  );
}

/**
 * The panel itself. Pure over its props.
 *
 * The machine label comes from what main answered first, because that is the
 * row main read for this session at this instant. It falls back to the session
 * row's own label, and to the label a removed machine left behind, so a panel
 * opened on a row Tortie no longer holds still names where the session was.
 * With none of the three there is no machine to name, and the panel says the
 * session is not running on that machine any more rather than composing a
 * sentence with a hole in it.
 */
export function RemoteLinesPanel({
  session,
  result,
  loading,
  failed,
  depth,
  read,
  close
}: RemoteLinesPanelProps): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => closeRef.current?.focus());
  }, []);

  const title =
    session === null ? READ_LINES_TITLE : readLinesTitle(session.name);
  const label =
    result?.machineLabel ??
    session?.machine?.label ??
    session?.machineGone?.label ??
    null;

  // WHILE A READ IS IN FLIGHT THE PANEL SHOWS NO ANSWER AT ALL, and that is
  // deliberate. A second read of the same session is started by pressing a
  // deeper button, and the previous answer is still in the store while it runs.
  // Drawing it would put a counts sentence describing 1,000 lines above a panel
  // that is on its way to holding 25,000, which is the Phase 99.1 shape in a
  // different costume.
  const shown = loading ? null : result;

  // THE PANEL OPENS ON THE NEWEST LINE.
  //
  // It is a ref CALLBACK rather than an effect, and both halves of that are
  // deliberate. React calls a ref callback while it is committing, which is
  // before the browser paints, so the box is never drawn at its top and then
  // jumped to its bottom. And its identity is tied to `shown`, so it runs when
  // an answer lands and NOT on every render. A version that ran on every render
  // would drag a person back to the bottom while they were reading, and a
  // version that ran once would leave a deeper read at its oldest line.
  //
  // `shown` is the dependency rather than the text, since a second read of the
  // same session can come back byte for byte the same and still needs the box
  // put back at its bottom.
  const bodyRef = useCallback(
    (el: HTMLPreElement | null) => {
      scrollToNewest(el);
    },
    [shown]
  );

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal remote-lines-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            // Return has no verb here. The panel reads and does nothing.
            submit: () => undefined,
            close
          })
        }
      >
        <h2 className="modal-title">{title}</h2>

        {shown !== null && shown.mode === 'read' ? (
          <>
            {label === null ? null : (
              <p className="remote-lines-header">
                {readLinesHeader(label, savedWhen(shown.readAt))}
              </p>
            )}
            <p className="remote-lines-note">{READ_LINES_NOT_LIVE}</p>
            <p className="remote-lines-counts">
              {readLinesCount(shown.lines, shown.bytes)}
            </p>
            {shown.truncated ? (
              <p className="remote-lines-cut">{READ_LINES_CUT}</p>
            ) : null}
            {showsAllThere(shown) ? (
              <p className="remote-lines-all-there">{READ_LINES_ALL_THERE}</p>
            ) : null}
          </>
        ) : null}

        {loading && label !== null ? (
          // THE ONE SENTENCE THAT IS NOT SETTLED, and it has its own class for
          // that reason alone. Every other sentence below is an answer. This
          // one says a read is still running, and a probe that read them all
          // out of one class reported four empty reads for a feature that
          // works. Nothing else ever carries `remote-lines-reading`.
          <p className="remote-lines-reading">{readLinesReading(label)}</p>
        ) : loading ? (
          // Reading, with no machine to name. There is no honest in-flight
          // sentence without a label, so the settled one is drawn instead.
          <p className="remote-lines-empty">{READ_LINES_NO_SESSION}</p>
        ) : failed ? (
          // The call was rejected. It is a DIFFERENT fact from an older
          // preload, which is what the next branch says, and the toast that
          // carries the error is gone by the time a person reads this.
          <p className="remote-lines-empty">{READ_LINES_FAILED}</p>
        ) : shown === null ? (
          // No answer, nothing in flight and nothing rejected. A preload
          // without the bridge method leaves the panel here, with no error and
          // no crash, which is the posture every other extras consumer takes.
          <p className="remote-lines-empty">{READ_LINES_NO_BRIDGE}</p>
        ) : shown.mode === 'noSession' || label === null ? (
          <p className="remote-lines-empty">{READ_LINES_NO_SESSION}</p>
        ) : shown.mode === 'notConnected' ? (
          <p className="remote-lines-empty">{readLinesNotConnected(label)}</p>
        ) : shown.mode === 'unreachable' ? (
          <p className="remote-lines-empty">{readLinesUnreachable(label)}</p>
        ) : shown.text === '' ? (
          <p className="remote-lines-empty">{READ_LINES_EMPTY}</p>
        ) : (
          <pre ref={bodyRef} className="remote-lines-body">
            {shown.text}
          </pre>
        )}

        <p className="remote-lines-depth-label" id="remote-lines-depth-label">
          {READ_LINES_DEPTH_LABEL}
        </p>
        <RemoteLinesDepths depth={depth} read={read} />

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
export function RemoteLinesModal(): React.JSX.Element | null {
  const sessionId = useApp((s) => s.remoteLinesSessionId);
  const result = useApp((s) => s.remoteLines);
  const loading = useApp((s) => s.remoteLinesLoading);
  const failed = useApp((s) => s.remoteLinesFailed);
  const depth = useApp((s) => s.remoteLinesDepth);
  const read = useApp((s) => s.readRemoteLines);
  const close = useApp((s) => s.closeRemoteLines);
  const sessions = useApp((s) => s.sessions);
  const pastSessions = useApp((s) => s.pastSessions);

  // A row the live list no longer holds can still be in Past Sessions, so both
  // lists are asked. It is the same lookup ./SavedOutputModal.tsx makes.
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
    <RemoteLinesPanel
      session={session}
      result={result}
      loading={loading}
      failed={failed}
      depth={depth}
      read={read}
      close={close}
    />
  );
}
