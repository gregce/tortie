/**
 * Phase 68. One machine, drawn.
 *
 * This row is the confirm gate's second surface, and it works the way the
 * configured agents row works (src/renderer/settings/ConfiguredAgents.tsx),
 * on purpose. A person who learned one has learned the other.
 *
 * Three things are drawn and each answers a question a person actually has.
 *
 *  1. Whether Tortie will sign in to this machine, in one chip and one
 *     sentence, next to the button that changes the answer.
 *  2. The exact lines the agreement is bound to. There is no confirm button
 *     that does not first show what is being confirmed. On a row whose
 *     details moved, both lists are drawn and labelled, so a person reads the
 *     change rather than guessing at it.
 *  3. What the machine says when Tortie speaks to it, on request and never
 *     otherwise. `Test the connection again` is the only affordance on this
 *     row that can start a process, and it reaches the gate in main first.
 *
 * WHAT THIS IS NOT. It is not an editor. Nothing here writes a field of the
 * machines file. A person changes a machine in their own editor, or removes
 * it here and adds it again.
 *
 * PHASE 79.1. A row whose test came back with the machine turning the sign in
 * down now offers to set up a key. The block itself is drawn by
 * ConnectionTestView, which this row already renders, so nothing about the
 * block is written twice. This row's part is to hand down the install that
 * belongs to IT, matched on the row id, so one row's answer is never drawn
 * under another row's machine.
 *
 * PHASE 84. The row says which key Tortie signs in with. Tortie has written a
 * key of its own for a machine since Phase 79.1 and named it on no command it
 * sent, so every sign in went through whatever key the person had loaded and
 * nothing on screen said so. The sentence is drawn only when main answered the
 * question, because a row that guesses is the thing this change exists to stop.
 *
 * PHASE 79. Two sentences that used to stand in a block above the whole list
 * now stand on the row, because that is where each of them decides something.
 * The sentence about never adopting other work sits immediately above Prepare,
 * which is the button that starts something on the other machine. Main's
 * sealing sentence sits in the block a person reads before they press Confirm,
 * which is the moment of agreement. It arrives as a prop from the section so
 * this file can neither omit it nor reword it, exactly as the Add sheet does.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MachinePrepareResult, MachineRowView } from '@shared/ipc';
import { ConnectionTestView, Remedy } from './ConnectionTestView';
import {
  ACCEPTED_VERSION_LABEL,
  ACCEPTED_VERSION_NONE,
  ACCEPTING_VERSION,
  BTN_ACCEPT_VERSION,
  BTN_ALLOW_WRITES,
  BTN_CONFIRM,
  BTN_CONFIRM_CHANGED,
  BTN_HIDE,
  BTN_PREPARE,
  BTN_REMOVE,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_KEEP,
  BTN_CONFIRM_WRITES,
  BTN_SHOW,
  BTN_STOP_SAVING,
  BTN_TEST_AGAIN,
  BTN_WITHDRAW,
  BTN_WITHDRAW_VERSION,
  CONFIRMED_LIST_LABEL,
  CONFIRMING_WRITES,
  CURRENT_LIST_LABEL,
  HONESTY_NO_ADOPTION,
  KEY_NOT_MADE_YET,
  keyNamedOnEveryCommand,
  PREPARE_EXPLAIN,
  PREPARE_OPTION_DISAGREES,
  PREPARE_PATH_MISSING,
  PREPARE_PATH_READ,
  PREPARE_SERVER_BORN,
  PREPARE_SERVER_WARM,
  PREPARE_SETTINGS_LABEL,
  PREPARE_SUPPORTED_LABEL,
  PREPARE_VERSION_LABEL,
  PREPARING,
  removeQuestion,
  SAVING_TITLE,
  savingOffExplain,
  savingOnLine,
  STATE_CHIP,
  STATE_SENTENCE,
  STOP_SAVING_EXPLAIN,
  WITHDRAW_VERSION_EXPLAIN,
  WRITE_ROOT_LABEL
} from './machines-copy';
import { useMachinesStore } from './machines-store';

/**
 * What Prepare answered, drawn.
 *
 * Every sentence here comes from main on the result. This component writes no
 * sentence of its own beyond the labels in machines-copy.ts, so a later edit to
 * this file cannot draw a refusal as a success or an alarm calmly.
 */
function PrepareResult({
  result,
  accepting,
  onAccept
}: {
  result: MachinePrepareResult;
  /** True while this row's acceptance and the prepare after it are in flight. */
  accepting: boolean;
  onAccept: () => void;
}): React.JSX.Element {
  // PHASE 83. Main sends a sheet only for a machine that named a version Tortie
  // has not measured. A machine Tortie measured needs no acceptance, and a
  // machine that would not name a version has nothing to bind one to, so the
  // block below simply does not exist for either.
  const sheet =
    result.class === 'version-unmeasured' ? (result.acceptSheet ?? null) : null;
  return (
    <div
      className="mach-prepare-result"
      data-prepare-class={result.class}
      data-prepare-alarm={result.alarm ? 'yes' : 'no'}
    >
      <div className="mach-prepare-headline">{result.headline}</div>
      <p className="mach-prepare-detail">{result.detail}</p>

      {result.version === null ? null : (
        <div className="mach-prepare-fact">
          <span className="mach-prepare-label">{PREPARE_VERSION_LABEL}</span>
          <span className="mach-prepare-value" data-prepare-version>
            {result.version}
          </span>
        </div>
      )}

      {result.class === 'version-unmeasured' ? (
        <div className="mach-prepare-fact">
          <span className="mach-prepare-label">{PREPARE_SUPPORTED_LABEL}</span>
          <span className="mach-prepare-value" data-prepare-supported>
            {result.supported.join(', ')}
          </span>
        </div>
      ) : null}

      {result.class === 'prepared' ? (
        <>
          <p className="mach-prepare-note">
            {result.serverBorn ? PREPARE_SERVER_BORN : PREPARE_SERVER_WARM}
          </p>
          <p className="mach-prepare-note">
            {result.pathCaptured ? PREPARE_PATH_READ : PREPARE_PATH_MISSING}
          </p>
        </>
      ) : null}

      {result.options.length === 0 ? null : (
        <div className="mach-prepare-options">
          <div className="mach-prepare-label">{PREPARE_SETTINGS_LABEL}</div>
          <ul className="set-config-lines">
            {result.options.map((option) => (
              <li
                key={option.name}
                data-prepare-option={option.name}
                data-prepare-agrees={option.agrees ? 'yes' : 'no'}
              >
                {option.name} {option.wanted}
                {option.agrees ? null : (
                  <span className="mach-prepare-disagrees">
                    {PREPARE_OPTION_DISAGREES}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PHASE 83. The sheet a person reads before they accept a version
          Tortie has not measured. Every line and the warning come from main
          with the result, and the hash they are bound to goes back unchanged,
          so this surface can neither compose the sheet nor reword it. */}
      {sheet === null ? null : (
        <div className="mach-accept" data-machines-accept={result.id}>
          <p className="mach-prepare-explain">{ACCEPTED_VERSION_NONE}</p>
          <Lines label={null} lines={sheet.lines} />
          <p className="set-config-warning">{sheet.warning}</p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={accepting}
            data-machines-action="accept-version"
            onClick={onAccept}
          >
            {accepting ? ACCEPTING_VERSION : BTN_ACCEPT_VERSION}
          </button>
        </div>
      )}

      {/* PHASE 79. Prepare answers with main's own classes, so it gets the
          same advice the connection test gets, from the same table. A person
          who reads that the machine has no program should not have to go
          looking for what to do about it. */}
      <Remedy cls={result.class} />
    </div>
  );
}

/** One labelled list of the lines an agreement covers. */
function Lines({
  label,
  lines
}: {
  label: string | null;
  lines: readonly string[];
}): React.JSX.Element {
  return (
    <div className="mach-lines-block">
      {label === null ? null : <div className="mach-lines-label">{label}</div>}
      <ul className="set-config-lines">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PHASE 101. The block where a person lets Tortie save a file on one machine,
 * and the block where they take that back.
 *
 * IT IS THE `mach-accept` BLOCK'S SHAPE, on purpose, because that is this
 * phase's precedent and a person who learned one has learned the other. One
 * field, one sheet composed entirely in main, one button.
 *
 * THE FIELD IS THE ONLY THING THIS SURFACE DECIDES. It sends the folder to
 * main and draws back what main answered. It composes no line of the sheet and
 * it computes no hash, which is the one thing the confirm gate exists to
 * prevent. A folder main's validator refuses draws main's own sentence and
 * leaves no sheet, so there is nothing to press.
 *
 * THE PARAGRAPH BESIDE THE SHEET IS NOT IN THE SHEET'S LINES. `writeHonesty`
 * arrives with the sheet and says what a replacement costs. It is drawn
 * wherever it is not null, and the answer to whether it is null is made in
 * main, so no surface can forget it.
 */
function SavingFiles({
  row,
  busy,
  onError
}: {
  row: MachineRowView;
  busy: boolean;
  onError: (message: string | null) => void;
}): React.JSX.Element {
  const readSheet = useMachinesStore((s) => s.writeSheet);
  const clearSheet = useMachinesStore((s) => s.clearWriteSheet);
  const allowWrites = useMachinesStore((s) => s.allowWrites);
  const forget = useMachinesStore((s) => s.forgetMachine);
  const held = useMachinesStore((s) => s.writeSheets[row.id]);
  const allowing = useMachinesStore((s) => s.allowing) === row.id;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const root =
    row.writeRoot === undefined || row.writeRoot === null || row.writeRoot === ''
      ? null
      : row.writeRoot;

  // One read per pause rather than one per keystroke. The call reads memory in
  // main and answers, so it starts nothing and sends nothing to any machine,
  // and the pause is only so a half typed folder does not draw a refusal under
  // every character.
  useEffect(() => {
    if (!open) return;
    const typed = draft.trim();
    if (typed.length === 0) {
      clearSheet(row.id);
      setFieldError(null);
      return;
    }
    const timer = setTimeout(() => {
      void readSheet(row.id, typed).then(setFieldError);
    }, 250);
    return () => clearTimeout(timer);
  }, [open, draft, row.id, readSheet, clearSheet]);

  const sheet = held !== undefined && held.root === draft.trim() ? held.sheet : null;

  if (root !== null) {
    return (
      <div className="mach-writes" data-machines-writes={row.id}>
        <div className="mach-lines-label">{SAVING_TITLE}</div>
        <p className="mach-prepare-explain" data-machine-write-root={root}>
          {savingOnLine(root, row.label)}
        </p>
        {row.writeHonesty === undefined || row.writeHonesty === null ? null : (
          <p className="set-config-warning">{row.writeHonesty}</p>
        )}
        <p className="mach-prepare-explain">{STOP_SAVING_EXPLAIN}</p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          data-machines-action="stop-saving"
          onClick={() => {
            onError(null);
            void forget(row.id).then(onError);
          }}
        >
          {BTN_STOP_SAVING}
        </button>
      </div>
    );
  }

  return (
    <div className="mach-writes" data-machines-writes={row.id}>
      <div className="mach-lines-label">{SAVING_TITLE}</div>
      <p className="mach-prepare-explain">{savingOffExplain(row.label)}</p>
      {open ? (
        <>
          <label className="mach-field-row">
            <span className="mach-field-label">{WRITE_ROOT_LABEL}</span>
            <input
              type="text"
              className="mach-field"
              value={draft}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              data-machines-field="write-root"
              onChange={(e) => setDraft(e.currentTarget.value)}
            />
          </label>
          {fieldError !== null ? (
            <div className="set-row-error">{fieldError}</div>
          ) : null}
          {sheet === null ? null : (
            <>
              <Lines label={null} lines={sheet.lines} />
              <p className="set-config-warning">{sheet.warning}</p>
              {sheet.writeHonesty === null ? null : (
                <p className="set-config-warning">{sheet.writeHonesty}</p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || allowing}
                data-machines-action="allow-writes"
                onClick={() => {
                  onError(null);
                  void allowWrites(row.id).then((message) => {
                    onError(message);
                    if (message === null) {
                      setOpen(false);
                      setDraft('');
                    }
                  });
                }}
              >
                {allowing ? CONFIRMING_WRITES : BTN_CONFIRM_WRITES}
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          data-machines-action="open-writes"
          onClick={() => setOpen(true)}
        >
          {BTN_ALLOW_WRITES}
        </button>
      )}
    </div>
  );
}

export function MachineRow({
  row,
  honesty
}: {
  row: MachineRowView;
  /**
   * Main's sealing sentence, handed down from the section. Null until the
   * first read of the machines file has answered.
   */
  honesty: string | null;
}): React.JSX.Element {
  const confirm = useMachinesStore((s) => s.confirmMachine);
  const forget = useMachinesStore((s) => s.forgetMachine);
  const remove = useMachinesStore((s) => s.removeMachine);
  const startSavedTest = useMachinesStore((s) => s.startSavedTest);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const test = useMachinesStore((s) => s.test);
  const prepare = useMachinesStore((s) => s.prepareMachine);
  const installKey = useMachinesStore((s) => s.installKey);
  const keyInstall = useMachinesStore((s) => s.keyInstall);
  const acceptVersion = useMachinesStore((s) => s.acceptVersion);
  const prepared = useMachinesStore((s) => s.prepared[row.id]);
  const preparing = useMachinesStore((s) => s.preparing) === row.id;
  const accepting = useMachinesStore((s) => s.accepting) === row.id;
  const busy = useMachinesStore((s) => s.busy) === row.id;

  // Shut for a machine that is ready and open for one that is not. A person
  // who has a decision to make should not have to find the evidence first,
  // and a person who already made it should not meet the whole command line
  // every time they open Settings.
  const [open, setOpen] = useState(row.state !== 'confirmed');
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A row that STOPS being usable while a person is looking at it opens
  // itself, once, on that transition.
  //
  // MEASURED: the live probe watched a row go from confirmed to changed after
  // an edit from outside the app, in 429 ms, and the two lists saying what was
  // agreed to and what the file says now were both still behind the
  // disclosure, because the state above only decides how the row FIRST
  // renders. The chip and the sentence changed and the evidence did not
  // appear. It is a transition rather than a rule, so a person can still shut
  // an unusable row and have it stay shut.
  const wasConfirmed = useRef(row.state === 'confirmed');
  useEffect(() => {
    if (wasConfirmed.current && row.state !== 'confirmed') setOpen(true);
    wasConfirmed.current = row.state === 'confirmed';
  }, [row.state]);

  const liveTest = test !== null && test.savedId === row.id ? test : null;
  // An install belongs to one machine. A row draws the one that names it and
  // never the one that names its neighbour.
  const rowKeyInstall =
    keyInstall !== null && keyInstall.savedId === row.id ? keyInstall : null;

  const confirmLabel =
    row.state === 'changed' ? BTN_CONFIRM_CHANGED : BTN_CONFIRM;

  return (
    <div className="mach-row" data-machine-id={row.id} data-state={row.state}>
      <div className="mach-head">
        <span
          className="mach-dot"
          data-machine-color={row.color}
          aria-hidden="true"
        />
        <div className="mach-text">
          <span className="set-agent-name">{row.label}</span>
          <span className="set-agent-detail">
            <span className={`set-chip mach-${row.state}`}>
              {STATE_CHIP[row.state]}
            </span>
            <span className="mach-host">{row.host}</span>
            <span className="set-config-id">{row.id}</span>
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={open}
          data-machines-action="toggle-lines"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? BTN_HIDE : BTN_SHOW}
        </button>
      </div>

      <div className="set-config-caption">{STATE_SENTENCE[row.state]}</div>

      {open ? (
        <div className="set-config-detail">
          {row.state === 'changed' ? (
            <>
              <Lines label={CONFIRMED_LIST_LABEL} lines={row.confirmedLines} />
              <Lines label={CURRENT_LIST_LABEL} lines={row.lines} />
            </>
          ) : (
            <Lines label={null} lines={row.lines} />
          )}

          {/* Both sentences come from main with the row, so this surface can
              neither omit them nor reword them. The warning is what
              confirming means. The refusal is the sentence a refused
              connection prints, shown here while the button that fixes it is
              still in front of the person. */}
          <p className="set-config-warning">{row.warning}</p>
          {/* PHASE 79. The confirm button below is a moment of agreement, and
              main's sealing sentence belongs at every one of them. It used to
              be drawn once above the list, where a person had already scrolled
              past it by the time they reached this button. */}
          {honesty === null ? null : (
            <p className="set-config-warning">{honesty}</p>
          )}
          {/* PHASE 101. The paragraph that says what replacing a file costs.
              It is drawn HERE, on the ordinary confirm sheet, and not only on
              the block below, because a row that already carries a folder
              still carries it through an ordinary re-confirm. A person is
              never re-granted file replacement on a sheet that does not say
              so in full. The answer to whether it is drawn is main's, off the
              same fields the sheet's lines come from, so no surface can
              forget it and no surface decides it by reading a line. */}
          {row.writeHonesty === undefined || row.writeHonesty === null ? null : (
            <p className="set-config-warning" data-machine-write-honesty>
              {row.writeHonesty}
            </p>
          )}
          {row.refusal === null ? null : (
            <p className="mach-refusal">{row.refusal}</p>
          )}

          {/* PHASE 84, item 7. Which key Tortie signs in with, said on the row
              rather than left to be guessed at. Tortie has written a key of
              its own since Phase 79.1 and named it on no command it sent, so
              every sign in went through whatever key the person had loaded and
              nothing on screen said so.

              THREE STATES, NOT TWO. A file name means the key is on this Mac
              and Tortie names it on every command. Null means there is none.
              ABSENT means main did not answer the question, and then neither
              sentence is drawn, because a row that guesses is the thing this
              item exists to stop. */}
          {row.keyFile === undefined ? null : (
            <p className="set-config-caption" data-machine-key-line>
              {row.keyFile === null
                ? KEY_NOT_MADE_YET
                : keyNamedOnEveryCommand(row.keyFile)}
            </p>
          )}

          <div className="set-config-actions">
            {row.state === 'confirmed' ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                data-machines-action="withdraw"
                onClick={() => {
                  void forget(row.id).then(setError);
                }}
              >
                {BTN_WITHDRAW}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                data-machines-action="confirm"
                onClick={() => {
                  setError(null);
                  void confirm(row.id).then(setError);
                }}
              >
                {confirmLabel}
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || liveTest?.running === true}
              data-machines-action="test-saved"
              onClick={() => {
                setError(null);
                void startSavedTest(row.id).then(setError);
              }}
            >
              {BTN_TEST_AGAIN}
            </button>

            <span
              className="set-config-hash"
              title={row.hash}
              data-machine-hash={row.hash}
            >
              {row.hash.slice(0, 12)}
            </span>
          </div>

          {/* PHASE 69. The first affordance in Tortie that STARTS something on
              another computer. It is enabled only for a row a person confirmed,
              and the sentence above it says what it will do before it does it.
              The refusal for an unconfirmed row is main's, on the other side of
              the bridge, so this button being off is a courtesy rather than the
              safeguard. */}
          <div className="mach-prepare">
            {/* PHASE 79. First, because it is the promise this button is
                bound by. Tortie creates what it runs there and leaves
                everything else alone. */}
            <p className="mach-prepare-explain">{HONESTY_NO_ADOPTION}</p>
            <p className="mach-prepare-explain">{PREPARE_EXPLAIN}</p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || preparing || !row.usable}
              data-machines-action="prepare"
              onClick={() => {
                setError(null);
                void prepare(row.id).then(setError);
              }}
            >
              {preparing ? PREPARING : BTN_PREPARE}
            </button>
          </div>

          {/* PHASE 83. The version this person accepted for this machine, and
              the one button that withdraws it. It is drawn only for a row that
              carries one, so a machine running a version Tortie measured shows
              nothing here at all. */}
          {row.acceptedTmuxVersion === null ||
          row.acceptedTmuxVersion === undefined ? null : (
            <div className="mach-accepted" data-machines-accepted={row.id}>
              <div className="mach-prepare-fact">
                <span className="mach-prepare-label">
                  {ACCEPTED_VERSION_LABEL}
                </span>
                <span
                  className="mach-prepare-value"
                  data-machine-accepted-version
                >
                  {row.acceptedTmuxVersion}
                </span>
              </div>
              <p className="mach-prepare-explain">{WITHDRAW_VERSION_EXPLAIN}</p>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                data-machines-action="withdraw-version"
                onClick={() => {
                  setError(null);
                  void forget(row.id).then(setError);
                }}
              >
                {BTN_WITHDRAW_VERSION}
              </button>
            </div>
          )}

          {/* PHASE 101. Saving files on this machine, off by default and turned
              on by one person doing one thing once. It sits after the accepted
              version block because both are things a person granted, and
              before the removal question because removal is the last thing on
              the row. */}
          <SavingFiles row={row} busy={busy} onError={setError} />

          {prepared === undefined ? null : (
            <PrepareResult
              result={prepared}
              accepting={accepting}
              onAccept={() => {
                setError(null);
                void acceptVersion(row.id).then(setError);
              }}
            />
          )}

          {/* PHASE 72. The question names the sessions Tortie holds a record
              of on that machine, counted, because removing a machine turns
              every one of them into a record of what Tortie last knew. It
              sends nothing to the machine and it ends nothing there. */}
          <div className="mach-remove">
            {removing ? (
              <>
                <span className="mach-remove-question">
                  {removeQuestion(row.label, row.sessions ?? 0)}
                </span>
                <button
                  type="button"
                  className="btn btn-destructive"
                  disabled={busy}
                  data-machines-action="remove-confirm"
                  onClick={() => {
                    setRemoving(false);
                    void remove(row.id).then(setError);
                  }}
                >
                  {BTN_REMOVE_CONFIRM}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-machines-action="remove-keep"
                  onClick={() => setRemoving(false)}
                >
                  {BTN_REMOVE_KEEP}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                data-machines-action="remove"
                onClick={() => setRemoving(true)}
              >
                {BTN_REMOVE}
              </button>
            )}
          </div>

          {error !== null ? <div className="set-row-error">{error}</div> : null}

          {liveTest !== null ? (
            <ConnectionTestView
              started={liveTest.started}
              transcript={liveTest.transcript}
              outcome={liveTest.outcome}
              running={liveTest.running}
              onSend={(text) => void sendTestInput(text)}
              onCancel={() => void cancelTest()}
              keyInstall={rowKeyInstall}
              onInstallKey={(password) => {
                setError(null);
                void installKey(password).then(setError);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
