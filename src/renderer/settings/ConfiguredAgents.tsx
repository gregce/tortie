/**
 * Settings → Agents → "From your configuration file" (Phase 23 C1).
 *
 * THIS IS THE CONFIRM GATE'S ONLY SURFACE, and the phase does not work without
 * it. `agents.json` can name a program, its arguments, its environment and the
 * command line that resumes it. Tortie will not start any of that until a
 * person has read the exact lines and pressed one button, out of band of any
 * agent turn, and the agreement is bound to a hash of the fields that decide
 * what runs. Change one of those fields and the row asks again.
 *
 * Three things are drawn here and each answers a failure a verifier found.
 *
 *  1. Every row that can cause a program to run, with its state. A row that is
 *     not confirmed says so, and says it next to the button that fixes it.
 *  2. The lines themselves. They are what the person agrees to, so they are
 *     shown before the button and recorded verbatim behind it. There is no
 *     "confirm" that does not first show what is being confirmed.
 *  3. Every row Tortie DROPPED, naming the field and the reason. Those
 *     sentences used to reach a console nobody has open. This is where a person
 *     reads them.
 *
 * WHAT THIS IS NOT. It is not a configuration editor, a template gallery or an
 * onboarding flow. There is no text box, no file picker and no way to write a
 * row from in here. The file is edited in the user's editor and the one item in
 * the application menu opens the folder. This surface reads, and it records one
 * agreement per row.
 */

import React, { useState } from 'react';
import type { ConfigRowView } from '@shared/ipc';
import { Codicon } from '../icons';
import { useSettingsStore } from './settings-store';

/** The chip beside a row's name, per confirmation state. */
const STATE_CHIP: Readonly<Record<ConfigRowView['state'], string>> = {
  confirmed: 'Confirmed',
  never: 'Not confirmed',
  changed: 'Changed since you confirmed it',
  unknown: 'Not known yet'
};

/**
 * One sentence under the name, in the person's terms rather than the gate's.
 *
 * `refusal` from main is the sentence a refused launch throws, and it is
 * written for that moment. This is written for the moment before, where the
 * person still has the button in front of them.
 */
function stateCaption(row: ConfigRowView): string {
  switch (row.state) {
    case 'confirmed':
      return 'You have confirmed this row. Tortie will start it.';
    case 'never':
      return 'Tortie will not start this agent until you read what it runs and confirm it.';
    case 'changed':
      return (
        'The file changed after you confirmed it, so Tortie will not start this ' +
        'agent. Read what it runs now and confirm it again.'
      );
    case 'unknown':
      return (
        'Tortie could not read the confirmation record from the system keychain, ' +
        'so it will not start this agent yet.'
      );
  }
}

function ConfiguredRow({ row }: { row: ConfigRowView }): React.JSX.Element {
  const confirm = useSettingsStore((s) => s.confirmConfigRow);
  const forget = useSettingsStore((s) => s.forgetConfigRow);
  const busy = useSettingsStore((s) => s.configBusy) === row.id;
  // Shut by default for a confirmed row and open by default for one that is
  // not. A person who has to make a decision should not have to find the
  // evidence first, and a person who already made it should not have the
  // whole command line in their way every time they open Settings.
  const [open, setOpen] = useState(row.state !== 'confirmed');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="set-config-row" data-config-id={row.id} data-state={row.state}>
      <div className="set-config-head">
        <div className="set-config-text">
          <span className="set-agent-name">{row.displayName}</span>
          <span className="set-agent-detail">
            <span className={`set-chip cfg-${row.state}`}>{STATE_CHIP[row.state]}</span>
            <span className="set-config-id">{row.id}</span>
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide what it runs' : 'Show what it runs'}
        </button>
      </div>

      <div className="set-config-caption">{stateCaption(row)}</div>

      {open ? (
        <div className="set-config-detail">
          <ul className="set-config-lines">
            {row.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {/* Research 31 section 6.5. The honesty sentence is part of the
              mechanism, not decoration: a person cannot give informed consent
              to a command line without being told what confirming means. It
              comes from main with the row, so this surface cannot omit it and
              cannot reword it. */}
          <p className="set-config-warning">{row.warning}</p>
          <div className="set-config-actions">
            {row.state === 'confirmed' ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  void forget(row.id).then(setError);
                }}
              >
                Withdraw confirmation
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || row.hash === ''}
                onClick={() => {
                  setError(null);
                  void confirm(row.id).then(setError);
                }}
              >
                {row.state === 'changed'
                  ? `Confirm the new ${row.displayName}`
                  : `Enable ${row.displayName}`}
              </button>
            )}
            <span className="set-config-hash" title="The hash your agreement is bound to">
              {row.hash.slice(0, 12)}
            </span>
          </div>
          {error !== null ? <div className="set-row-error">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ConfiguredAgents(): React.JSX.Element | null {
  const config = useSettingsStore((s) => s.config);
  const refresh = useSettingsStore((s) => s.refreshConfig);

  // A build whose preload has no `config` member, and a machine that has no
  // configuration file, both draw nothing at all. That is the ordinary case
  // and it must cost the user no space and no explanation.
  if (config === null) return null;
  if (config.rows.length === 0 && config.errors.length === 0) return null;

  return (
    <>
      <h2 className="set-group-label">From your configuration file</h2>
      <div className="set-section-caption">
        These agents come from <code>{config.directory}/agents.json</code>. Tortie
        will not start one until you have read what it runs and confirmed it.
      </div>

      {config.errors.length > 0 ? (
        <div className="set-card set-config-errors">
          <div className="set-config-errors-head">
            <Codicon name="warning" size={12} />
            <span>
              Tortie dropped {config.errors.length}{' '}
              {config.errors.length === 1 ? 'row' : 'rows'} whole. Nothing from{' '}
              {config.errors.length === 1 ? 'it' : 'them'} was used.
            </span>
          </div>
          {config.errors.map((e) => (
            <div className="set-config-error" key={`${e.id}:${e.field}:${e.reason}`}>
              <span className="set-config-error-field">{e.field}</span>
              <span className="set-config-error-reason">{e.reason}</span>
            </div>
          ))}
          <div className="set-config-errors-foot">
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
              Check the file again
            </button>
          </div>
        </div>
      ) : null}

      {config.rows.length > 0 ? (
        <div className="set-card">
          {config.rows.map((row) => (
            <ConfiguredRow key={row.id} row={row} />
          ))}
        </div>
      ) : null}
    </>
  );
}
