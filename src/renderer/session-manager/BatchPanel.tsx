/**
 * Phase 293 — the one confirmation that ends several sessions, and its report.
 *
 * It sits at the top of the grid, inside the sheet, and it is drawn in three
 * phases: `confirm`, where it names every session it would end; `running`,
 * where each named session gains the word for what happened to it; and
 * `done`, drawn only when something did not end, which lists every target
 * with its outcome. When every target ended the panel closes by itself and one
 * toast says how many (./actions.ts).
 *
 * THE LIST NEVER GROWS. The ids named when the confirmation opened are an
 * upper bound, frozen in the store by session id. On every render a named
 * session that is no longer eligible leaves the list and joins the skipped
 * line under its PRESENT reason; a session that BECAME eligible after the
 * panel opened (a machine that reconnected, a session restored from another
 * window) is never added. The heading counts what is still named, so it can
 * only fall, and the press ends exactly the sessions this panel lists.
 *
 * Every name and every state is read BY ID at render, from the rows the sheet
 * draws and from the session list, never from a copy kept when the panel
 * opened, so a session that was renamed or ended while the panel was open is
 * shown as it is.
 *
 * It decides nothing that acts. Its buttons hand the press to ./actions.ts,
 * which freezes the targets again at that instant and ends them one at a time.
 */

import React, { useEffect, useRef } from 'react';
import type { Session } from '@shared/types';
import { statusVisual } from '../app/status';
import { Codicon } from '../icons';
import type {
  BatchRowOutcome,
  SessionSheetBatch
} from '../state/session-manager-slice';
import { effectiveStatusOf, useApp } from '../state/store';
import { cancelBatch, confirmBatch, dismissBatch, stopBatch } from './actions';
import { batchEligibility } from './batch-end';
import type { BatchSkipReason } from './batch-end';
import {
  BATCH_CANCEL_LABEL,
  BATCH_DONE,
  BATCH_STOP,
  batchBody,
  batchConfirmLabel,
  batchDoneHeading,
  batchHeading,
  batchOutcomeWord,
  batchRunningHeading,
  batchSkippedLine,
  batchTargetLine,
  CANCEL
} from './copy';
import type { ManageRow } from './projection';
import './session-manager-panels.css';

/**
 * The rows the sheet DRAWS on the Managed tab under the current filters, by
 * session id. A named session that is not among them is not a session the
 * person can see, and a batch never ends one of those.
 */
export type ManageRowsById =
  | ReadonlyMap<string, ManageRow>
  | Readonly<Record<string, ManageRow | undefined>>;

export interface BatchPanelProps {
  batch: SessionSheetBatch;
  rowsById: ManageRowsById;
}

/** One drawn row by id, from either shape the sheet may hold them in. */
function rowOf(rows: ManageRowsById, id: string): ManageRow | undefined {
  if (rows instanceof Map) return rows.get(id);
  return (rows as Readonly<Record<string, ManageRow | undefined>>)[id];
}

/** What the confirmation shows now: the named sessions still eligible, and why the rest are not. */
export interface BatchConfirmView {
  /** Named at open AND still drawn AND still eligible, in the named order. */
  still: { id: string; where: string; row: ManageRow }[];
  /** Named at open and no longer eligible, by their PRESENT reason. */
  left: Record<BatchSkipReason, number>;
}

/**
 * The confirmation's live list. Pure over what it is handed, so the rule that
 * the list shrinks and never grows is stated in one place and tested there.
 * It reads only the named list: an id that was not named is not asked about.
 */
export function batchConfirmView(
  batch: SessionSheetBatch,
  rowsById: ManageRowsById,
  machineKnown: (machineId: string) => boolean
): BatchConfirmView {
  const still: BatchConfirmView['still'] = [];
  const left: Record<BatchSkipReason, number> = {
    ended: 0,
    unreachable: 0,
    gone: 0
  };
  for (const target of batch.named) {
    const row = rowOf(rowsById, target.id);
    if (row === undefined) {
      left.gone += 1;
      continue;
    }
    const answer = batchEligibility(row.session, row.gates, machineKnown);
    if (answer === 'yes') still.push({ id: target.id, where: target.where, row });
    else left[answer] += 1;
  }
  return { still, left };
}

/** A target's drawn state, from the session list by id, or null when it has none. */
function stateLabelOf(session: Session | undefined): string | null {
  if (session === undefined) return null;
  return statusVisual(effectiveStatusOf(session), session).label;
}

function OutcomeWord({ outcome }: { outcome: BatchRowOutcome }): React.JSX.Element | null {
  const word = batchOutcomeWord(outcome);
  if (word === '') return null;
  return <span className="sm-batch-outcome">{word}</span>;
}

export function BatchPanel({ batch, rowsById }: BatchPanelProps): React.JSX.Element {
  const sessions = useApp((s) => s.sessions);
  const pastSessions = useApp((s) => s.pastSessions);
  const machineStates = useApp((s) => s.machineStates);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const doneRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  // The confirmation takes the keyboard on its CANCEL icon, never on the
  // destructive button: a held Enter that opened it must not also press it.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'nearest' });
    if (batch.phase === 'confirm') cancelRef.current?.focus();
    // Mount only: a new batch is a new panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The report is the one phase whose button takes the keyboard, because it
  // is what is left to press. It is a separate element with its own key, so
  // nothing held from the press before it lands on it.
  useEffect(() => {
    if (batch.phase === 'done') doneRef.current?.focus();
  }, [batch.phase]);

  const byId = (id: string): Session | undefined =>
    sessions.find((one) => one.id === id);
  // A target another window removed is in the removed list, and its name is
  // still the name the person selected. One that was started over is in
  // neither, and draws its outcome with no name rather than an identifier.
  const nameOf = (id: string): string =>
    byId(id)?.name ?? pastSessions.find((one) => one.id === id)?.name ?? '';
  const whereOf = (id: string): string =>
    batch.named.find((one) => one.id === id)?.where ?? '';

  if (batch.phase === 'confirm') {
    const known = new Set(machineStates.map((one) => one.id));
    const view = batchConfirmView(batch, rowsById, (id) => known.has(id));
    const n = view.still.length;
    const anyRemote = view.still.some(({ row }) => row.gates.remote);
    const skipped = batchSkippedLine({
      ended: batch.skippedAtOpen.ended + view.left.ended,
      unreachable: batch.skippedAtOpen.unreachable + view.left.unreachable,
      gone: view.left.gone
    });
    return (
      <section
        ref={rootRef}
        className="sm-batch"
        data-phase="confirm"
        aria-labelledby="sm-batch-title"
      >
        <div className="sm-inline-head">
          <h2 id="sm-batch-title" className="sm-inline-title">
            {batchHeading(n)}
          </h2>
          <button
            type="button"
            ref={cancelRef}
            className="icon-btn sm-panel-icon"
            aria-label={BATCH_CANCEL_LABEL}
            onClick={cancelBatch}
          >
            <Codicon name="close" size="md" />
          </button>
        </div>
        <div className="sm-inline-body">
          <p className="sm-inline-text">{batchBody(anyRemote)}</p>
          <ul className="sm-batch-targets">
            {view.still.map(({ id, where, row }) => {
              const session = byId(id);
              const name = session?.name ?? row.session.name;
              const state = stateLabelOf(session) ?? row.visual.label;
              return (
                <li key={id} data-batch-target={id}>
                  <strong>{name}</strong>
                  <span>{batchTargetLine(where, state)}</span>
                </li>
              );
            })}
          </ul>
          {skipped === '' ? null : <p className="sm-batch-skipped">{skipped}</p>}
        </div>
        <div className="sm-inline-actions">
          <button
            type="button"
            key="cancel"
            className="btn btn-secondary"
            onClick={cancelBatch}
          >
            {CANCEL}
          </button>
          <button
            type="button"
            key="confirm"
            className="btn btn-destructive"
            data-sm="batch-confirm"
            disabled={n === 0}
            onClick={() => void confirmBatch()}
          >
            {batchConfirmLabel(n)}
          </button>
        </div>
      </section>
    );
  }

  const n = batch.targets.length;
  const ended = batch.targets.filter(
    (id) => batch.outcomes[id]?.state === 'ended'
  ).length;
  const running = batch.phase === 'running';
  return (
    <section
      ref={rootRef}
      className="sm-batch"
      data-phase={batch.phase}
      aria-labelledby="sm-batch-title"
      aria-busy={running ? 'true' : undefined}
    >
      <div className="sm-inline-head">
        <h2 id="sm-batch-title" className="sm-inline-title">
          {running ? batchRunningHeading(n) : batchDoneHeading(ended, n)}
        </h2>
      </div>
      <div className="sm-inline-body">
        <ul className="sm-batch-targets">
          {batch.targets.map((id) => {
            const session = byId(id);
            const outcome = batch.outcomes[id] ?? { state: 'pending' as const };
            const state = stateLabelOf(session);
            return (
              <li
                key={id}
                data-batch-target={id}
                data-outcome={outcome.state}
                {...(outcome.state === 'skipped'
                  ? { 'data-reason': outcome.reason }
                  : {})}
              >
                <strong>{nameOf(id)}</strong>
                <span>
                  {state === null ? whereOf(id) : batchTargetLine(whereOf(id), state)}
                </span>
                <OutcomeWord outcome={outcome} />
              </li>
            );
          })}
        </ul>
      </div>
      <div className="sm-inline-actions">
        {running ? (
          <button
            type="button"
            key="stop"
            className="btn btn-secondary"
            data-sm="batch-stop"
            disabled={batch.stopRequested}
            onClick={stopBatch}
          >
            {BATCH_STOP}
          </button>
        ) : (
          <button
            type="button"
            key="done"
            ref={doneRef}
            className="btn btn-primary"
            data-sm="batch-done"
            onClick={dismissBatch}
          >
            {BATCH_DONE}
          </button>
        )}
      </div>
    </section>
  );
}
