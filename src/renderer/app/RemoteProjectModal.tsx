/**
 * Open a folder on a machine (Phase 90.3).
 *
 * ## What it is
 *
 * The fourth project verb, beside Open Project…, New Project… and Clone
 * Repository…. A person picks a machine, picks a folder over there, and gets a
 * project tab for that folder. Every sidebar in that tab then reads that
 * machine, and nothing in it can write.
 *
 * ## It follows the two dialogs that came before it
 *
 * Same scrim, same field rhythm, Return opens from any field, Escape cancels,
 * focus trapped. The one structural difference is the folder picker, which is
 * Tortie's own panel rather than the one macOS ships, for the reason
 * `./RemoteDirPicker.tsx` states in its header: the native panel walks THIS
 * Mac's disk and a folder chosen in it names nothing over there.
 *
 * ## It composes no refusal of its own
 *
 * Main answers a reason WORD and this file turns it into a sentence. That is
 * the shape `machines:listDir` already uses. The seven reasons and the already
 * open case are the whole set, so `refusalText` below is total and there is no
 * fallback sentence that could ever be the one a person reads.
 *
 * ## What it never does
 *
 * It writes nothing on either computer. It starts no process anywhere.
 *
 * ## What changed in Phase 92
 *
 * This header used to say that a folder opened here is deliberately kept off
 * the home screen's recent list, on the ground that every row on that list
 * opens a folder on this Mac. That is no longer true. A recents row now carries
 * the machine its folder is on, the home screen draws that machine's name
 * beside the path, and clicking the row opens the folder over there. So a
 * folder opened from this sheet is remembered exactly as a local one is, by the
 * same `rememberProject` call in main.
 *
 * This file's own behaviour did not change. It still calls
 * `addRemoteProject(machineId, path)` and nothing else, and main does the
 * remembering.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MachineRowView } from '@shared/ipc';
import { useApp } from '../state/store';
import { RemoteDirPicker } from './RemoteDirPicker';
import { MachineOptions, anyMachineNotReady } from './CreateSessionModal';
import {
  MACHINE_FIELD_LABEL,
  MACHINE_NOT_SIGNED_IN_HINT,
  OPEN_REMOTE_BUTTON,
  OPEN_REMOTE_TITLE,
  addRemoteRefusal,
  openRemoteFolderLabel,
  openRemoteHonesty,
  remoteProjectAlreadyOpen
} from './machine-copy';
import { modalKeyDown } from './focus-trap';

/**
 * The three words this sheet needs that are not about a machine.
 *
 * Every sentence that names a machine comes from `./machine-copy.ts`, which is
 * where the vocabulary audit reads them. These three label a button and a state
 * of this sheet and say nothing about any computer, so they stay beside the
 * buttons they label.
 */
const REMOTE_PROJECT_BUSY = 'Opening…';
const REMOTE_PROJECT_CANCEL = 'Cancel';
const REMOTE_PROJECT_CHOOSE = 'Choose…';

export function RemoteProjectModal(): React.JSX.Element | null {
  const open = useApp((s) => s.remoteProjectOpen);
  const setOpen = useApp((s) => s.setRemoteProjectOpen);
  const addRemoteProject = useApp((s) => s.addRemoteProject);
  const toast = useApp((s) => s.toast);

  const [machines, setMachines] = useState<MachineRowView[]>([]);
  const [machineId, setMachineId] = useState('');
  const [path, setPath] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pathRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setMachineId('');
    setPath('');
    setPickerOpen(false);
    setError(null);
    setBusy(false);
  }, [open]);

  /**
   * Read the machines once per opening, from the channel Settings and the
   * create sheet already use. It reads memory in main and starts nothing.
   *
   * Only usable rows are offered, for the same reason the create sheet offers
   * only usable rows: an unconfirmed row would refuse anyway, and offering a
   * choice that cannot be taken spends a person a click to find that out.
   */
  useEffect(() => {
    if (!open) return undefined;
    const api = window.gmux?.machines;
    if (api === undefined) {
      setMachines([]);
      return undefined;
    }
    let cancelled = false;
    void api.rows().then(
      (result) => {
        if (cancelled) return;
        const rows = result.rows.filter((row) => row.usable);
        setMachines(rows);
        const first = rows[0];
        if (first !== undefined) setMachineId((id) => (id === '' ? first.id : id));
      },
      () => {
        if (!cancelled) setMachines([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const machine = machines.find((row) => row.id === machineId) ?? null;
  const label = machine?.label ?? '';
  const ready = !busy && machine !== null && path.trim().length > 0;

  const submit = (): void => {
    if (busy || machine === null) return;
    const wanted = path.trim();
    if (wanted.length === 0) {
      setError(addRemoteRefusal('notAbsolute', wanted, label));
      pathRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    void addRemoteProject(machine.id, wanted)
      .then((result) => {
        if (!result.ok) {
          setBusy(false);
          setError(addRemoteRefusal(result.reason, wanted, label));
          pathRef.current?.focus();
          return;
        }
        // The tab is already focused by the store. The only thing left to say
        // is the one thing that is not obvious from the screen, which is that
        // this folder already had a tab and Tortie moved to it.
        if (result.alreadyOpen) toast('info', remoteProjectAlreadyOpen(label));
        setOpen(false);
      })
      .catch(() => {
        setBusy(false);
        setError(addRemoteRefusal('unreachable', wanted, label));
      });
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={OPEN_REMOTE_TITLE}
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            submit,
            close: () => setOpen(false)
          })
        }
      >
        <h2 className="modal-title">{OPEN_REMOTE_TITLE}</h2>

        {machines.length === 0 ? (
          <p className="field-caption">{MACHINE_NOT_SIGNED_IN_HINT}</p>
        ) : (
          <>
            <div className="field">
              <label className="field-label" htmlFor="remote-project-machine">
                {MACHINE_FIELD_LABEL}
              </label>
              <select
                id="remote-project-machine"
                className="input"
                value={machineId}
                onChange={(e) => {
                  setMachineId(e.target.value);
                  // The folder belongs to whichever machine was chosen a moment
                  // ago, so it is never carried across, and the panel shuts
                  // rather than showing one machine's folders under another
                  // machine's name.
                  setPath('');
                  setPickerOpen(false);
                  setError(null);
                }}
              >
                <MachineOptions rows={machines} />
              </select>
              {anyMachineNotReady(machines) ? (
                <p className="field-caption">{MACHINE_NOT_SIGNED_IN_HINT}</p>
              ) : null}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="remote-project-dir">
                {openRemoteFolderLabel(label)}
              </label>
              <div className="field-row">
                <input
                  id="remote-project-dir"
                  ref={pathRef}
                  className={`input input-mono${error !== null ? ' input-error' : ''}`}
                  value={path}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => {
                    setPath(e.target.value);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={machine === null}
                  onClick={() => setPickerOpen((was) => !was)}
                >
                  {REMOTE_PROJECT_CHOOSE}
                </button>
              </div>
              {pickerOpen && machine !== null ? (
                <RemoteDirPicker
                  machineId={machine.id}
                  machineLabel={label}
                  initialPath={path.trim()}
                  onChoose={(chosen) => {
                    setPath(chosen);
                    setPickerOpen(false);
                    setError(null);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              ) : null}
              <p className="field-caption">{openRemoteHonesty(label)}</p>
            </div>
          </>
        )}

        {error !== null ? <div className="modal-error">{error}</div> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(false)}
          >
            {REMOTE_PROJECT_CANCEL}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready}
            onClick={submit}
          >
            {busy ? REMOTE_PROJECT_BUSY : OPEN_REMOTE_BUTTON}
            {!busy ? <span aria-hidden="true">↩</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
