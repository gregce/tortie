/**
 * Phase 68. Settings → Machines.
 *
 * A machine is a place Tortie may sign in to as you, and run a program there
 * with your files and your credentials. This section is where a person names
 * one, reads what it will run, and agrees to it. It is the only surface in
 * Tortie that can do any of that, and removing it makes every configured
 * machine unusable rather than making it convenient.
 *
 * PHASE 79. THE STANDING BLOCK OF FOUR SENTENCES IS GONE, and nothing it said
 * was dropped from the product. It sat between a person and the one button
 * they came here for, and one of its sentences had been false since Phase 70
 * shipped remote sessions. Each of the rest now stands where it decides
 * something.
 *
 *  1. The sentence about never adopting other work is drawn on the row,
 *     immediately above Prepare, which is the button it is a promise about.
 *  2. Main's sealing sentence is drawn at both moments of agreement, being the
 *     Add sheet and the row's confirm block. It still rides on the result, so
 *     no surface can drop it or soften it.
 *  3. The sentence about where a machine's identity is recorded is behind the
 *     disclosure, with the half of the caption that named the confirm rule.
 *  4. The sentence saying a session cannot be opened on a machine is deleted,
 *     because a person can open one.
 *
 * THE EMPTY STATE IS A HEADING, ONE SENTENCE AND ONE BUTTON. A person with no
 * machines has no file to check, no row to read and nothing to disclose, so
 * none of those are drawn for them.
 *
 * THE DROPPED ROWS BLOCK. A row that failed a check is dropped entire and
 * never partly merged. The sentence naming the field and the reason has to
 * reach a person, and this is where they read it. It mirrors the configured
 * agents block for the same reason the row mirrors the agent row.
 *
 * WHY THERE ARE TWO EXPORTS. `MachinesView` draws, and takes everything it
 * draws as a prop. `MachinesSection` reads the store and hands it over. The
 * split is what lets the unit tests render this surface at all: zustand
 * serves its INITIAL state to a server render, so a test that seeded the
 * store and rendered a connected component would quietly read defaults and
 * assert nothing. Every other surface in this phase is split the same way.
 */

import React, { useEffect } from 'react';
import type { MachinesResult } from '@shared/ipc';
import { Codicon } from '../icons';
import { AddMachine } from './AddMachine';
import { MachineRow } from './MachineRow';
import {
  ADD_TITLE,
  BRIDGE_MISSING,
  BTN_CHECK_AGAIN,
  DISCLOSURE_LABEL,
  HONESTY_OWN_RECORD,
  SECTION_CAPTION,
  SECTION_CONFIRM_LINE,
  SECTION_TITLE,
  droppedRowsLine
} from './machines-copy';
import { useMachinesStore } from './machines-store';
import './machines.css';

export interface MachinesViewProps {
  /** What the file says and what is on record. Null until the first read. */
  machines: MachinesResult | null;
  /** False when this build's preload has no machines surface. */
  supported: boolean;
  adding: boolean;
  onOpenAdd(): void;
  onReload(): void;
}

export function MachinesView({
  machines,
  supported,
  adding,
  onOpenAdd,
  onReload
}: MachinesViewProps): React.JSX.Element {
  if (!supported) {
    return (
      <section aria-label={SECTION_TITLE}>
        <h1 className="set-title">{SECTION_TITLE}</h1>
        <div className="set-card">
          <div className="set-empty-line">{BRIDGE_MISSING}</div>
        </div>
      </section>
    );
  }

  const rows = machines?.rows ?? [];
  const errors = machines?.errors ?? [];

  // Nobody has added a machine and nothing was dropped. There is a heading, a
  // sentence and a button, and that is the whole screen.
  const empty = rows.length === 0 && errors.length === 0;

  return (
    <section aria-label={SECTION_TITLE}>
      <h1 className="set-title">{SECTION_TITLE}</h1>
      <div className="set-section-caption">{SECTION_CAPTION}</div>

      {errors.length > 0 ? (
        <div className="set-card set-config-errors">
          <div className="set-config-errors-head">
            <Codicon name="warning" size={12} />
            <span>{droppedRowsLine(errors.length)}</span>
          </div>
          {errors.map((e) => (
            <div
              className="set-config-error"
              key={`${e.id}:${e.field}:${e.reason}`}
            >
              <span className="set-config-error-field">{e.field}</span>
              <span className="set-config-error-reason">{e.reason}</span>
            </div>
          ))}
          <div className="set-config-errors-foot">
            <button
              type="button"
              className="btn btn-secondary"
              data-machines-action="reload-after-errors"
              onClick={onReload}
            >
              {BTN_CHECK_AGAIN}
            </button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? null : (
        <div className="set-card">
          {rows.map((row) => (
            <MachineRow
              key={row.id}
              row={row}
              honesty={machines?.honesty ?? null}
            />
          ))}
        </div>
      )}

      {/* Two sentences a person needs once and does not need on every visit.
          They are shut by default and they are not drawn at all on the empty
          screen, where there is nothing yet for them to be about. */}
      {empty ? null : (
        <details className="mach-disclosure">
          <summary>{DISCLOSURE_LABEL}</summary>
          <p className="mach-honesty-line">{SECTION_CONFIRM_LINE}</p>
          <p className="mach-honesty-line">{HONESTY_OWN_RECORD}</p>
        </details>
      )}

      {adding ? null : (
        <div className="set-section-toolbar mach-toolbar">
          <button
            type="button"
            className="btn btn-primary"
            data-machines-action="open-add"
            onClick={onOpenAdd}
          >
            {ADD_TITLE}
          </button>
          {/* Here for every row, not only for a row that was dropped.
              MEASURED: the live probe changed the address in machines.json from
              outside the app and main knew 429 ms later, and the list on screen
              still read Confirmed, because nothing pushes a file change to this
              window and the only way to re-read was a button that appears only
              when a row failed a check. The gate refused the connection either
              way, so nothing unsafe happened, but the screen said one thing and
              Tortie would have done another. Tortie writes this file itself and
              a person may hand edit it, so asking it to look again is an
              ordinary thing to want.
              PHASE 79. It is not drawn when there is no row, because a person
              who has added nothing has no file to check. The dropped rows block
              keeps its own copy of this button, since a row that failed a check
              means there IS a file to look at again. */}
          {rows.length === 0 ? null : (
            <button
              type="button"
              className="btn btn-secondary"
              data-machines-action="reload"
              onClick={onReload}
            >
              {BTN_CHECK_AGAIN}
            </button>
          )}
        </div>
      )}

      {adding ? <AddMachine /> : null}
    </section>
  );
}

export function MachinesSection(): React.JSX.Element {
  const init = useMachinesStore((s) => s.init);
  const machines = useMachinesStore((s) => s.machines);
  const supported = useMachinesStore((s) => s.supported);
  const adding = useMachinesStore((s) => s.adding);
  const openAdd = useMachinesStore((s) => s.openAdd);
  const reload = useMachinesStore((s) => s.reload);

  // One read when the section opens. It reaches memory in main, so it costs
  // no disk access, and it starts nothing.
  useEffect(() => init(), [init]);

  return (
    <MachinesView
      machines={machines}
      supported={supported}
      adding={adding}
      onOpenAdd={openAdd}
      onReload={() => void reload()}
    />
  );
}
