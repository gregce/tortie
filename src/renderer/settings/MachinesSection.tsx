/**
 * Phase 68. Settings → Machines.
 *
 * A machine is a place Tortie may sign in to as you, and run a program there
 * with your files and your credentials. This section is where a person names
 * one, reads what it will run, and agrees to it. It is the only surface in
 * Tortie that can do any of that, and removing it makes every configured
 * machine unusable rather than making it convenient.
 *
 * WHAT THIS RELEASE CANNOT DO, said on the section rather than in a release
 * note. You cannot open a session on a machine yet. The two standing honesty
 * lines above the list say so, and they are drawn on every visit rather than
 * behind a disclosure, because a promise a person has to go looking for is
 * not a promise.
 *
 * THE THIRD LINE SAYS WHERE THE MACHINE'S IDENTITY IS RECORDED. Answering
 * the connection test makes the sign in program write down which machine
 * answered. Tortie names a file of its own for that and reads the person's own
 * record without ever adding to it. The line is drawn here because the first
 * build of this phase did the opposite and nobody could have known.
 *
 * THE FOURTH HONESTY LINE COMES FROM MAIN. `MachinesResult.honesty` is the
 * sentence that says confirming seals which program Tortie runs, not the
 * bytes of that program. It rides on the result exactly as the confirm
 * warning does, so this file can neither drop it nor soften it.
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
  EMPTY_LINE,
  HONESTY_NO_ADOPTION,
  HONESTY_NO_SESSIONS_YET,
  HONESTY_OWN_RECORD,
  SECTION_CAPTION,
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

  return (
    <section aria-label={SECTION_TITLE}>
      <h1 className="set-title">{SECTION_TITLE}</h1>
      <div className="set-section-caption">{SECTION_CAPTION}</div>

      <div className="set-card mach-honesty">
        <p className="mach-honesty-line">{HONESTY_NO_ADOPTION}</p>
        <p className="mach-honesty-line">{HONESTY_NO_SESSIONS_YET}</p>
        <p className="mach-honesty-line">{HONESTY_OWN_RECORD}</p>
        {machines === null ? null : (
          <p className="mach-honesty-line">{machines.honesty}</p>
        )}
      </div>

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

      <div className="set-card">
        {rows.length === 0 ? (
          <div className="set-empty-line">{EMPTY_LINE}</div>
        ) : (
          rows.map((row) => <MachineRow key={row.id} row={row} />)
        )}
      </div>

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
          {/* Always here, not only when a row was dropped.
              MEASURED: the live probe changed the address in machines.json from
              outside the app and main knew 429 ms later, and the list on screen
              still read Confirmed, because nothing pushes a file change to this
              window and the only way to re-read was a button that appears only
              when a row failed a check. The gate refused the connection either
              way, so nothing unsafe happened, but the screen said one thing and
              Tortie would have done another. Tortie writes this file itself and
              a person may hand edit it, so asking it to look again is an
              ordinary thing to want. */}
          <button
            type="button"
            className="btn btn-secondary"
            data-machines-action="reload"
            onClick={onReload}
          >
            {BTN_CHECK_AGAIN}
          </button>
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
