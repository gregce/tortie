/**
 * Phase 68. The one visible connection test, drawn. PHASE 340 made it a
 * checklist (build/p340/SPEC.md D9, section 5.1 step 2).
 *
 * WHAT A PERSON READS. While the check runs, one row, `Checking <name>…`, and
 * Stop. When it ends, a list of ticks built from what the machine reported:
 * the address it reached, the account it signed in as, the program it found
 * and that program's version. Every value on those rows arrives from main on
 * `outcome.check`, read from the one block Tortie's own check printed, so this
 * file writes the words around them and never a value. A check that did not
 * succeed draws main's headline as its one failed row, and the advice under it.
 *
 * QUESTIONS, INLINE, ONLY WHEN NEEDED. A first-seen machine asks one question
 * with its fingerprint and a Trust it button, which sends `yes` and nothing
 * else, and only to the live check's open question. A prompt this view does not
 * recognise draws the program's own last line, a password field and Send, and
 * opens Details, because the reason for such a question is on the lines above
 * it. A check that found more than one program asks which one to run, and runs
 * none of them until a person picks. A machine that asked for a password or
 * turned the sign in down draws the key step (./KeyInstall.tsx).
 *
 * DETAILS. The transcript, Tortie's two lines above it, main's own detail and,
 * while the check runs, the answer field and Send that were always on screen.
 * They are one press away, and they are kept, because a prompt the quiet rule
 * misses must still be answerable (D9 as revised).
 *
 * THE ALARM. Exactly one outcome sets `alarm`, and it is the changed host
 * key. It is the only state on this surface that wears --error and
 * --error-wash. An expired key, a changed permission and a machine that is
 * simply off all share calm copy on purpose, because three ordinary things
 * that look alarming teach a person to ignore the one that is.
 *
 * THE WORDS, and where each comes from. The two transcript lines are Tortie's
 * and say so. Everything in the transcript is another program's bytes, with
 * the ANSI control sequences and Tortie's own markers taken out in main. The
 * headline and the detail are main's, from the taxonomy, so the one alarming
 * outcome cannot be drawn calmly by a later edit to this file. The advice under
 * a failed row is REMEDY, keyed by main's own class.
 */

import React, { useState } from 'react';
import type {
  MachineTestAsk,
  MachineTestOutcome,
  MachineTestStarted
} from '@shared/ipc';
import { Codicon } from '../icons';
import { KeyInstall } from './KeyInstall';
import { Remedy } from './Remedy';
import {
  ANSWER_HINT,
  ANSWER_LABEL,
  BTN_RECHECK,
  BTN_SEND,
  BTN_STOP,
  BTN_TRUST,
  BTN_TYPE_PATH,
  CHECK_UNREAD_REMEDY,
  CHECK_UNREAD_REMEDY_TYPED,
  CHOOSE_PROGRAM,
  DETAILS_LABEL,
  FOUND_SOURCE_HOVER,
  HOST_KEY_ASK,
  TRANSCRIPT_RUNNING_LABEL,
  TRANSCRIPT_SOURCE_LINE,
  VERSION_NOT_READ,
  VERSION_UNREADABLE,
  checkingLine,
  fingerprintLine,
  foundLine,
  reachedLine,
  signedInLine,
  versionLine,
  versionUnmeasuredLine
} from './machines-copy';
import { keySheetOf, type KeyInstallState } from './machines-store';

// MachineRow.tsx reads `Remedy` through this file, which is where it lived
// until Phase 123. The re-export keeps that call site as it is.
export { Remedy };

/** The classes a check reaches only after the machine answered and signed in. */
const SIGNED_IN_CLASSES: ReadonlySet<string> = new Set([
  'ok',
  'program-choice',
  'no-program'
]);

export interface ConnectionTestViewProps {
  started: MachineTestStarted;
  /** The program's own bytes, in order. */
  transcript: string;
  /** Null until the test ends. */
  outcome: MachineTestOutcome | null;
  running: boolean;
  /** PHASE 340. The question the live check is waiting on, or null. */
  ask?: MachineTestAsk | null;
  /**
   * PHASE 340. `draft` for the Add flow, `saved` for a row. A saved row's path
   * is a hashed field that only Remove and add again changes, so a saved check
   * offers no candidate buttons and no Type its path….
   */
  mode?: 'draft' | 'saved';
  /** PHASE 340. The name the running row says it is checking. */
  label?: string;
  /** PHASE 340. The address and port the check ran against. */
  host?: string;
  port?: number | null;
  /** PHASE 340. Whether Details is open. A prompt opens it. */
  detailsOpen?: boolean;
  onDetailsToggle?: (open: boolean) => void;
  /** Sends one line to the running program, from the field under Details. */
  onSend(text: string): void;
  /** Stops the running check. */
  onCancel(): void;
  /** PHASE 340. Answers the open question: `yes` for Trust it, a line for a prompt. */
  onAnswer?: (text?: string) => void;
  /** PHASE 340. Runs the check again with one of the programs it found. */
  onPickCandidate?: (path: string) => void;
  /** PHASE 340. Opens Advanced on the program path. */
  onTypePath?: () => void;
  /** PHASE 340. Runs the same check again. */
  onCheckAgain?: () => void;
  /**
   * PHASE 340's fix round. True when the check ran with a program path, typed
   * or the saved row's. Such a check already reads past an answer something
   * else printed into, so Type its path… is not offered again for it.
   */
  pathTyped?: boolean;
  /** The key install for the machine this test is about, or null. */
  keyInstall?: KeyInstallState | null;
  /**
   * Sends that machine's password once, to make a key and put it on the
   * machine. A caller that passes nothing offers no key at all.
   */
  onInstallKey?: (password: string) => void;
}

/**
 * How one row of the list reads.
 *
 *  - `ok`, a tick: the check got past this step.
 *  - `note`, a quiet mark: a fact a person may want before Add, being a version
 *    Tortie has not measured, one it did not read, or one it could not read.
 *    None of them stops the Add press (D8 as revised), so none wears a failure.
 *  - `failed`: the step the check could not get past.
 *  - `alarm`: the changed host key, and nothing else.
 */
type CheckTone = 'ok' | 'note' | 'failed' | 'alarm';

const TONE_MARK: Readonly<Record<CheckTone, string>> = {
  ok: 'check',
  note: 'info',
  failed: 'circle-slash',
  alarm: 'warning'
};

/** One row of the list. */
function CheckRow({
  kind,
  text,
  title,
  tone = 'ok'
}: {
  kind: string;
  text: string;
  title?: string;
  tone?: CheckTone;
}): React.JSX.Element {
  return (
    <div
      className={`mach-check-row${tone === 'ok' ? '' : ` ${tone}`}${tone === 'alarm' ? ' failed' : ''}`}
      data-machines-check-row={kind}
      data-check-tone={tone}
      {...(title === undefined || title === '' ? {} : { title })}
    >
      <Codicon
        name={TONE_MARK[tone]}
        size="sm"
        className="mach-check-mark"
      />
      <span className="mach-check-text">{text}</span>
    </div>
  );
}

/** The version row, in whichever of its four answers main gave. */
function versionRow(check: NonNullable<MachineTestOutcome['check']>): {
  text: string;
  tone: CheckTone;
} | null {
  if (check.program === null) return null;
  const version = check.version;
  switch (check.versionKind) {
    case 'measured':
      return version === null ? null : { text: versionLine(version), tone: 'ok' };
    case 'unmeasured':
      return version === null
        ? null
        : { text: versionUnmeasuredLine(version), tone: 'note' };
    case 'not-read':
      return { text: VERSION_NOT_READ, tone: 'note' };
    case 'unreadable':
      return { text: VERSION_UNREADABLE, tone: 'note' };
    default:
      return null;
  }
}

/** The field a prompt is answered in. Its text is never kept. */
function AskField({ onSend }: { onSend(text: string): void }): React.JSX.Element {
  const [text, setText] = useState('');
  const send = (): void => {
    onSend(text);
    // Cleared on the same tick the bytes leave. The usual prompt Tortie does
    // not recognise is a passphrase or a code, so nothing typed here is kept.
    setText('');
  };
  return (
    <div className="mach-ask-answer">
      <input
        type="password"
        className="mach-field"
        data-machines-field="ask-answer"
        spellCheck={false}
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
      />
      <button
        type="button"
        className="btn btn-primary"
        data-machines-action="ask-send"
        onClick={send}
      >
        {BTN_SEND}
      </button>
    </div>
  );
}

/** The answer field under Details, as it always was. */
function AnswerField({ onSend }: { onSend(text: string): void }): React.JSX.Element {
  const [answer, setAnswer] = useState('');
  const send = (): void => {
    onSend(answer);
    // Nothing a person types here is kept. The field is cleared the moment
    // the bytes leave, and no copy of them is held anywhere in this window.
    setAnswer('');
  };
  return (
    <>
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
          className="btn btn-secondary"
          data-machines-action="send"
          onClick={send}
        >
          {BTN_SEND}
        </button>
      </div>
      <div className="mach-answer-hint">{ANSWER_HINT}</div>
    </>
  );
}

export function ConnectionTestView({
  started,
  transcript,
  outcome,
  running,
  ask = null,
  mode = 'draft',
  label,
  host,
  port = null,
  detailsOpen = false,
  onDetailsToggle,
  onSend,
  onCancel,
  onAnswer,
  onPickCandidate,
  onTypePath,
  onCheckAgain,
  pathTyped = false,
  keyInstall,
  onInstallKey
}: ConnectionTestViewProps): React.JSX.Element {
  const check = outcome?.check ?? null;
  // PHASE 340's fix round. Main marks an outcome `signedIn` when Tortie's own
  // marker came back, which happens only after the sign in, so an `unknown`
  // whose answer could not be read still says it reached the machine.
  const signedIn =
    outcome !== null && (SIGNED_IN_CLASSES.has(outcome.class) || outcome.signedIn === true);
  const answerUnread = outcome?.class === 'unknown' && outcome.signedIn === true;
  // A draft check with no path can be run again with one, and a typed path is
  // read past what was printed into the answer (the fix round).
  const offerPath = mode === 'draft' && onTypePath !== undefined && !pathTyped;
  const failed = outcome !== null && outcome.class !== 'ok' && outcome.class !== 'program-choice';
  const version = outcome?.class === 'ok' && check !== null ? versionRow(check) : null;
  // The question is drawn only while the check that asked it is still running,
  // so a Trust it can never be pressed into a check that has ended.
  const openAsk = running ? ask : null;

  return (
    <div
      className="mach-test"
      data-test-id={started.testId}
      data-alarm={outcome !== null && outcome.alarm ? 'yes' : 'no'}
    >
      {running ? (
        <div className="mach-check-running" data-machines-check-row="running">
          <span className="set-spinner" aria-hidden="true" />
          <span className="mach-check-text">
            {checkingLine(label ?? host ?? '')}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            data-machines-action="cancel-test"
            onClick={onCancel}
          >
            {BTN_STOP}
          </button>
        </div>
      ) : null}

      {openAsk !== null && openAsk.kind === 'host-key' ? (
        <div className="mach-ask" data-machines-ask="host-key">
          <div className="mach-ask-question">{HOST_KEY_ASK}</div>
          <div className="mach-ask-fingerprint">{fingerprintLine(openAsk.fingerprint)}</div>
          {onAnswer === undefined ? null : (
            <button
              type="button"
              className="btn btn-primary"
              data-machines-action="trust"
              onClick={() => onAnswer()}
            >
              {BTN_TRUST}
            </button>
          )}
        </div>
      ) : null}

      {openAsk !== null && openAsk.kind === 'prompt' ? (
        <div className="mach-ask" data-machines-ask="prompt">
          {/* The program's own line, drawn as it printed it. */}
          <div className="mach-ask-question">{openAsk.text}</div>
          {onAnswer === undefined ? null : (
            <AskField onSend={(text) => onAnswer(text)} />
          )}
        </div>
      ) : null}

      {outcome !== null ? (
        <div
          className={`mach-check${outcome.alarm ? ' alarm' : ''}`}
          data-outcome-class={outcome.class}
        >
          {signedIn && host !== undefined && host !== '' ? (
            <CheckRow kind="reached" text={reachedLine(host, port)} />
          ) : null}
          {signedIn && check !== null && check.signedInAs !== null ? (
            <CheckRow kind="signed-in" text={signedInLine(check.signedInAs)} />
          ) : null}
          {outcome.class === 'ok' && check !== null && check.program !== null ? (
            <CheckRow
              kind="found"
              text={foundLine(check.program.path)}
              title={FOUND_SOURCE_HOVER[check.program.source]}
            />
          ) : null}
          {version === null ? null : (
            <CheckRow kind="version" text={version.text} tone={version.tone} />
          )}

          {outcome.class === 'program-choice' ? (
            <div className="mach-candidates" data-machines-candidates="1">
              <div className="mach-ask-question">{CHOOSE_PROGRAM}</div>
              {(check?.candidates ?? []).map((one) =>
                mode === 'draft' && onPickCandidate !== undefined ? (
                  <button
                    type="button"
                    key={one.path}
                    className="btn btn-secondary mach-candidate"
                    data-machines-candidate={one.path}
                    title={FOUND_SOURCE_HOVER[one.source]}
                    onClick={() => onPickCandidate(one.path)}
                  >
                    {one.path}
                  </button>
                ) : (
                  <div
                    key={one.path}
                    className="mach-candidate-text"
                    data-machines-candidate-text={one.path}
                    title={FOUND_SOURCE_HOVER[one.source]}
                  >
                    {one.path}
                  </div>
                )
              )}
              <div className="mach-hint">{outcome.detail}</div>
            </div>
          ) : null}

          {failed ? (
            <CheckRow
              kind="failed"
              text={outcome.headline}
              title={outcome.detail}
              tone={outcome.alarm ? 'alarm' : 'failed'}
            />
          ) : null}
        </div>
      ) : null}

      {outcome !== null && failed ? (
        <Remedy
          cls={outcome.class}
          {...(answerUnread
            ? { text: offerPath ? CHECK_UNREAD_REMEDY : CHECK_UNREAD_REMEDY_TYPED }
            : {})}
        />
      ) : null}

      {outcome !== null && failed ? (
        <div className="mach-check-actions">
          {(outcome.class === 'no-program' && mode === 'draft' && onTypePath !== undefined) ||
          (answerUnread && offerPath) ? (
            <button
              type="button"
              className="btn btn-secondary"
              data-machines-action="type-path"
              onClick={onTypePath}
            >
              {BTN_TYPE_PATH}
            </button>
          ) : null}
          {onCheckAgain === undefined ? null : (
            <button
              type="button"
              className="btn btn-secondary"
              data-machines-action="check-again"
              onClick={onCheckAgain}
            >
              {BTN_RECHECK}
            </button>
          )}
        </div>
      ) : null}

      {/* PHASE 79.1, made one step of the check by PHASE 340 (D10). Under the
          advice, because it is the one thing on this panel that acts on it. */}
      {onInstallKey === undefined ? null : (
        <KeyInstall
          sheet={keySheetOf(outcome)}
          state={keyInstall ?? null}
          adviceAbove={outcome?.class ?? null}
          onInstall={onInstallKey}
        />
      )}

      <details
        className="mach-details"
        data-machines-details="1"
        open={detailsOpen}
        onToggle={(e) => onDetailsToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>{DETAILS_LABEL}</summary>
        {/* The two Tortie lines. The exact argv rides as an attribute and a
            tooltip rather than a third visible line, so what a person reads
            above the rule stays two sentences long and both are Tortie's. */}
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
        {outcome === null ? null : (
          <div className="mach-outcome" data-outcome-detail={outcome.class}>
            <div className="mach-outcome-head">{outcome.headline}</div>
            <div className="mach-outcome-detail">{outcome.detail}</div>
          </div>
        )}
        {/* Kept while the check runs, as it always was: a prompt the quiet
            rule misses can still be answered here (D9 as revised). */}
        {running ? <AnswerField onSend={onSend} /> : null}
      </details>
    </div>
  );
}
