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
 * another program's bytes, with two things taken out and nothing else
 * changed: the ANSI control sequences, removed in main, and the marker pair
 * Tortie asked that program to print around its answer. The answer itself is
 * exactly what the machine sent. The headline and the detail under the
 * transcript are main's, from the taxonomy, so the one alarming outcome
 * cannot be drawn calmly by a later edit to this file.
 *
 * THE ALARM. Exactly one outcome sets `alarm`, and it is the changed host
 * key. It is the only state on this surface that wears --error and
 * --error-wash. An expired key, a changed permission and a machine that is
 * simply off all share calm copy on purpose, because three ordinary things
 * that look alarming teach a person to ignore the one that is.
 *
 * PHASE 79. This surface now writes one more line of its own, and it is the
 * only one. Under main's two sentences it draws what a person can do next.
 * That line comes from REMEDY in machines-copy.ts and is keyed by main's own
 * class, so main still says what happened and this file only says what to do
 * about it. A class with nothing for a person to do draws nothing.
 *
 * PHASE 123. That line is drawn by `Remedy`, which moved to Remedy.tsx. This
 * file and KeyInstall.tsx both draw it, so it is owned by neither of them. The
 * words and the classes are the bytes they were.
 *
 * PHASE 130. The second header line no longer claims that Tortie does not
 * change the bytes. It did claim that, and the paragraph above this one is why
 * it was not exactly true: main removes the ANSI control sequences and this
 * view is handed a transcript with the marker pair already taken out. The line
 * now makes the two promises that are exact, being that Tortie does not store
 * the bytes and does not answer them for the person. The words themselves live
 * in TRANSCRIPT_SOURCE_LINE, in machines-copy.ts.
 *
 * PHASE 79.1. One block hangs under the advice, and it is the only place in
 * the product that offers to set up a key. It is rendered HERE rather than in
 * the Add sheet and again on the machine row, because both of those draw this
 * view, so one insertion point gives both of them the block and neither can
 * grow a copy that drifts. Whether it appears at all is `keySheetOf`'s
 * decision, and main decides whether there is a sheet to appear for. A surface
 * that passes no `onInstallKey` gets no block, which is how a caller says it
 * is not offering this.
 */

import React, { useState } from 'react';
import type { MachineTestOutcome, MachineTestStarted } from '@shared/ipc';
import { KeyInstall } from './KeyInstall';
import { Remedy } from './Remedy';
import {
  ANSWER_HINT,
  ANSWER_LABEL,
  BTN_CANCEL_TEST,
  BTN_SEND,
  TESTING,
  TRANSCRIPT_RUNNING_LABEL,
  TRANSCRIPT_SOURCE_LINE
} from './machines-copy';
import { keySheetOf, type KeyInstallState } from './machines-store';

// MachineRow.tsx reads `Remedy` through this file, which is where it lived
// until Phase 123. The re-export keeps that call site as it is, and it points
// one way, so no cycle comes back with it.
export { Remedy };

export interface ConnectionTestViewProps {
  started: MachineTestStarted;
  /** The program's own bytes, in order. */
  transcript: string;
  /** Null until the test ends. */
  outcome: MachineTestOutcome | null;
  running: boolean;
  onSend(text: string): void;
  onCancel(): void;
  /**
   * The key install for the machine this test is about, or null.
   *
   * Optional, so a surface written against the Phase 79 props still compiles
   * and simply offers no key.
   */
  keyInstall?: KeyInstallState | null;
  /**
   * Sends that machine's password once, to make a key and put it on the
   * machine. A caller that passes nothing offers no key at all.
   */
  onInstallKey?: (password: string) => void;
}

export function ConnectionTestView({
  started,
  transcript,
  outcome,
  running,
  onSend,
  onCancel,
  keyInstall,
  onInstallKey
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

      {outcome !== null ? <Remedy cls={outcome.class} /> : null}

      {/* PHASE 79.1. Under the advice, because it is the one thing on this
          panel that acts on the advice. */}
      {onInstallKey === undefined ? null : (
        <KeyInstall
          sheet={keySheetOf(outcome)}
          state={keyInstall ?? null}
          adviceAbove={outcome?.class ?? null}
          onInstall={onInstallKey}
        />
      )}
    </div>
  );
}
