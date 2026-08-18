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
import type {
  MachineTestClass,
  MachineTestOutcome,
  MachineTestStarted
} from '@shared/ipc';
import { KeyInstall } from './KeyInstall';
import {
  ANSWER_HINT,
  ANSWER_LABEL,
  BTN_CANCEL_TEST,
  BTN_SEND,
  REMEDY,
  REMEDY_LABEL,
  TESTING,
  TRANSCRIPT_RUNNING_LABEL,
  TRANSCRIPT_SOURCE_LINE
} from './machines-copy';
import { keySheetOf, type KeyInstallState } from './machines-store';

/**
 * What a person can do about one outcome, drawn apart from what happened.
 *
 * Main names the outcome and this names the next step, and the two are kept
 * visually separate so a person can tell the report from the advice. It is
 * exported because Prepare answers with the same classes and a second copy of
 * this block would be the duplication the growth guardrail forbids.
 *
 * A class with nothing for a person to do draws nothing at all. Advice under
 * an outcome that worked would be noise.
 */
export function Remedy({ cls }: { cls: MachineTestClass }): React.JSX.Element | null {
  const text = REMEDY[cls];
  if (text === null) return null;
  return (
    <div className="mach-remedy" data-remedy-class={cls}>
      <div className="mach-remedy-label">{REMEDY_LABEL}</div>
      <p className="mach-remedy-text">{text}</p>
    </div>
  );
}

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
