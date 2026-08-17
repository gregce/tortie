/**
 * Phase 68. The one visible connection test, drawn.
 *
 * WHAT THIS IS. A plain text view of the bytes one program printed, with the
 * ANSI control sequences already removed in main, plus one field a person can
 * answer that program with.
 *
 * WHAT THIS IS NOT, stated because a person will reasonably expect otherwise.
 * It is not a terminal. It does not redraw, it does not move a cursor, and a
 * program that paints a full screen will look wrong in it. The ssh client's
 * own questions are plain lines, which is the whole reason this is enough.
 *
 * The words a person reads here come from three places and only three. The
 * two header lines are Tortie's and say so. Everything in the transcript is
 * another program's bytes, unchanged. The headline and the detail under the
 * transcript are main's, from the taxonomy, so the one alarming outcome
 * cannot be drawn calmly by a later edit to this file.
 *
 * THE ALARM. Exactly one outcome sets `alarm`, and it is the changed host
 * key. It is the only state on this surface that wears --error and
 * --error-wash. An expired key, a changed permission and a machine that is
 * simply off all share calm copy on purpose, because three ordinary things
 * that look alarming teach a person to ignore the one that is.
 */

import React, { useState } from 'react';
import type { MachineTestOutcome, MachineTestStarted } from '@shared/ipc';
import {
  ANSWER_HINT,
  ANSWER_LABEL,
  BTN_CANCEL_TEST,
  BTN_SEND,
  TESTING,
  TRANSCRIPT_RUNNING_LABEL,
  TRANSCRIPT_SOURCE_LINE
} from './machines-copy';

export interface ConnectionTestViewProps {
  started: MachineTestStarted;
  /** The program's own bytes, in order. */
  transcript: string;
  /** Null until the test ends. */
  outcome: MachineTestOutcome | null;
  running: boolean;
  onSend(text: string): void;
  onCancel(): void;
}

export function ConnectionTestView({
  started,
  transcript,
  outcome,
  running,
  onSend,
  onCancel
}: ConnectionTestViewProps): React.JSX.Element {
  const [answer, setAnswer] = useState('');

  const send = (): void => {
    onSend(answer);
    // Nothing a person types here is kept. The field is cleared the moment
    // the bytes leave, and no copy of them is held anywhere in this window.
    setAnswer('');
  };

  return (
    <div
      className="mach-test"
      data-test-id={started.testId}
      data-alarm={outcome !== null && outcome.alarm ? 'yes' : 'no'}
    >
      {/* The two Tortie lines. The exact argv rides as an attribute and a
          tooltip rather than a third visible line, so what a person reads
          above the rule stays two sentences long and both of them are
          Tortie's. */}
      <div className="mach-test-head">
        <div
          className="mach-test-tortie"
          title={started.commandLine}
          data-command-line={started.commandLine}
        >
          <span className="mach-test-label">{TRANSCRIPT_RUNNING_LABEL}</span>
          <span className="mach-test-path">{started.sshPath}</span>
        </div>
        <div className="mach-test-tortie">{TRANSCRIPT_SOURCE_LINE}</div>
      </div>

      <pre className="mach-transcript" data-machines-transcript="1">
        {transcript}
      </pre>

      {running ? (
        <div className="mach-answer">
          <label className="mach-answer-field">
            <span className="mach-answer-label">{ANSWER_LABEL}</span>
            <input
              type="text"
              className="mach-field"
              data-machines-field="answer"
              spellCheck={false}
              autoComplete="off"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            data-machines-action="send"
            onClick={send}
          >
            {BTN_SEND}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            data-machines-action="cancel-test"
            onClick={onCancel}
          >
            {BTN_CANCEL_TEST}
          </button>
        </div>
      ) : null}

      {running ? (
        <div className="mach-answer-hint">{ANSWER_HINT}</div>
      ) : null}

      {running && outcome === null ? (
        <div className="mach-testing">{TESTING}</div>
      ) : null}

      {outcome !== null ? (
        <div
          className={`mach-outcome${outcome.alarm ? ' alarm' : ''}`}
          data-outcome-class={outcome.class}
        >
          <div className="mach-outcome-head">{outcome.headline}</div>
          <div className="mach-outcome-detail">{outcome.detail}</div>
        </div>
      ) : null}
    </div>
  );
}
