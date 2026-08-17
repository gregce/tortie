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
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MachinePrepareResult, MachineRowView } from '@shared/ipc';
import { ConnectionTestView } from './ConnectionTestView';
import {
  BTN_CONFIRM,
  BTN_CONFIRM_CHANGED,
  BTN_HIDE,
  BTN_PREPARE,
  BTN_REMOVE,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_KEEP,
  BTN_SHOW,
  BTN_TEST_AGAIN,
  BTN_WITHDRAW,
  CONFIRMED_LIST_LABEL,
  CURRENT_LIST_LABEL,
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
  REMOVE_QUESTION,
  STATE_CHIP,
  STATE_SENTENCE
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
  result
}: {
  result: MachinePrepareResult;
}): React.JSX.Element {
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

export function MachineRow({ row }: { row: MachineRowView }): React.JSX.Element {
  const confirm = useMachinesStore((s) => s.confirmMachine);
  const forget = useMachinesStore((s) => s.forgetMachine);
  const remove = useMachinesStore((s) => s.removeMachine);
  const startSavedTest = useMachinesStore((s) => s.startSavedTest);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const test = useMachinesStore((s) => s.test);
  const prepare = useMachinesStore((s) => s.prepareMachine);
  const prepared = useMachinesStore((s) => s.prepared[row.id]);
  const preparing = useMachinesStore((s) => s.preparing) === row.id;
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
          {row.refusal === null ? null : (
            <p className="mach-refusal">{row.refusal}</p>
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

          {prepared === undefined ? null : <PrepareResult result={prepared} />}

          <div className="mach-remove">
            {removing ? (
              <>
                <span className="mach-remove-question">{REMOVE_QUESTION}</span>
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
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
