/**
 * Phase 68. Add a machine.
 *
 * FOUR STEPS, IN ORDER, and the order is the design. A person picks or types
 * an address, tests the connection and watches it happen, reads the lines the
 * agreement will be bound to, and presses one button that writes the row and
 * records the confirmation together. The button is disabled until the machine
 * itself has answered, and the reason is written under it while it is
 * disabled, because a control that is off without saying why is a puzzle
 * rather than a safeguard.
 *
 * WHY THE ADD BUTTON WAITS FOR THE TEST. The row names a program Tortie will
 * run on another machine. Until the connection test comes back with an
 * absolute path that the machine itself reported, Tortie has never seen that
 * program and a person cannot meaningfully agree to it. Typing a path under
 * Advanced does not skip the test. It only tells the test what to look for.
 *
 * THE TAILNET PICKER, and the one thing it is careful about. Tortie runs the
 * Tailscale program at a pinned absolute path and shows that path on screen
 * before it runs anything. A name served by PATH is never used, because a
 * planted program earlier on PATH is the exact attack the confirm gate exists
 * for. The picker is reachable from one button and from nowhere else.
 *
 * WHAT THIS SURFACE NEVER DOES. It writes nothing until the button is
 * pressed. It starts nothing on a keystroke. It reads no file. It sends no
 * answer to the program on a person's behalf.
 *
 * `AddMachineView` draws and takes everything as a prop. `AddMachine` reads
 * the store and hands it over. The reason for the split is in the header of
 * MachinesSection.tsx.
 */

import React, { useState } from 'react';
import type {
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult
} from '@shared/ipc';
import { MACHINE_COLORS } from '@shared/machines';
import { Codicon } from '../icons';
import { ConnectionTestView } from './ConnectionTestView';
import {
  ADD_DISABLED_REASON,
  ADD_TITLE,
  ADVANCED,
  BTN_ADD_CANCEL,
  BTN_ADD_CONFIRM,
  BTN_FIND_TAILNET,
  BTN_TEST,
  COLOUR_LABEL,
  FIELD_COLOUR,
  FIELD_HOST,
  FIELD_LABEL,
  FIELD_PORT,
  FIELD_PORT_HINT,
  FIELD_REMOTE_PATH,
  FIELD_REMOTE_PATH_HINT,
  FIELD_USER,
  FIELD_USER_HINT,
  PEER_ALREADY_ADDED,
  PEER_OFFLINE,
  PEER_THIS_MAC,
  TAILSCALE_EMPTY,
  TAILSCALE_EXPLAIN,
  TAILSCALE_MISSING,
  TAILSCALE_SOURCE_LABEL,
  TESTING
} from './machines-copy';
import {
  sheetOf,
  useMachinesStore,
  type LiveTest,
  type MachineFormState
} from './machines-store';

/** One machine the tailnet reported, as a button that fills the form. */
function PeerRow({
  peer,
  onPick
}: {
  peer: TailscalePeerView;
  onPick(peer: TailscalePeerView): void;
}): React.JSX.Element {
  const marks: string[] = [];
  if (peer.isThisMac) marks.push(PEER_THIS_MAC);
  if (peer.alreadyAdded) marks.push(PEER_ALREADY_ADDED);
  if (!peer.online) marks.push(PEER_OFFLINE);

  return (
    <button
      type="button"
      className="mach-peer"
      data-machines-peer={peer.host}
      disabled={peer.alreadyAdded}
      onClick={() => onPick(peer)}
    >
      <span className="mach-peer-name">{peer.name}</span>
      <span className="mach-peer-host">{peer.host}</span>
      <span className="mach-peer-os">{peer.os}</span>
      {marks.map((mark) => (
        <span className="mach-peer-mark" key={mark}>
          {mark}
        </span>
      ))}
    </button>
  );
}

/** The pinned path, or the plain sentence saying why there is none. */
function TailnetSource({
  tailscale
}: {
  tailscale: TailscaleSourceResult | null;
}): React.JSX.Element | null {
  if (tailscale === null) return null;
  if (tailscale.binary === null) {
    return <div className="mach-note">{TAILSCALE_MISSING}</div>;
  }
  return (
    <div className="mach-source">
      <span className="mach-source-label">{TAILSCALE_SOURCE_LABEL}</span>
      <span className="mach-source-path">{tailscale.binary}</span>
    </div>
  );
}

export interface AddMachineViewProps {
  /** Carries the two sentences main owns. Null until the first read. */
  machines: MachinesResult | null;
  form: MachineFormState;
  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  /** The draft test, or null. A saved row's test never reaches this view. */
  test: LiveTest | null;
  /** True while the add call is in flight. */
  busy: boolean;
  /** Main's sentence when a call was refused. Null otherwise. */
  error: string | null;
  onSetForm(patch: Partial<MachineFormState>): void;
  onClose(): void;
  onFindTailnet(): void;
  onUsePeer(peer: TailscalePeerView): void;
  onStartTest(): void;
  onSendInput(text: string): void;
  onCancelTest(): void;
  onAdd(): void;
}

export function AddMachineView({
  machines,
  form,
  tailscale,
  tailscaleBusy,
  test,
  busy,
  error,
  onSetForm,
  onClose,
  onFindTailnet,
  onUsePeer,
  onStartTest,
  onSendInput,
  onCancelTest,
  onAdd
}: AddMachineViewProps): React.JSX.Element {
  // The sheet main composed at the end of the test. It is the only source of
  // the lines below and of the hash the agreement binds to, so the button is
  // off for exactly as long as there is no sheet.
  const sheet = sheetOf(test);
  const canAdd = sheet !== null && !busy;
  const testing = test !== null && test.running;

  // The tailnet answered and had nothing to offer. That is a different
  // sentence from "no program was found", and a person needs to be able to
  // tell them apart.
  const emptyTailnet =
    tailscale !== null &&
    tailscale.binary !== null &&
    tailscale.peers.length === 0;

  return (
    <div className="mach-add" data-machines-add="1">
      <div className="mach-add-head">
        <h2 className="set-group-label">{ADD_TITLE}</h2>
        <button
          type="button"
          className="btn btn-secondary"
          data-machines-action="add-cancel"
          onClick={onClose}
        >
          {BTN_ADD_CANCEL}
        </button>
      </div>

      <div className="set-card mach-card">
        {/* Step one. One button, and nothing runs before it is pressed. */}
        <div className="mach-block">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={tailscaleBusy}
            data-machines-action="find-tailnet"
            onClick={onFindTailnet}
          >
            <Codicon name="search" size={12} />
            {BTN_FIND_TAILNET}
          </button>
          <div className="mach-hint">{TAILSCALE_EXPLAIN}</div>
          <TailnetSource tailscale={tailscale} />
          {tailscale !== null && tailscale.note !== null ? (
            <div className="mach-note">{tailscale.note}</div>
          ) : null}
          {emptyTailnet ? (
            <div className="mach-note">{TAILSCALE_EMPTY}</div>
          ) : null}
          {tailscale !== null && tailscale.peers.length > 0 ? (
            <div className="mach-peers">
              {tailscale.peers.map((peer) => (
                <PeerRow key={peer.host} peer={peer} onPick={onUsePeer} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Step two. The person's own keystrokes. */}
        <div className="mach-block">
          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_HOST}</span>
            <input
              type="text"
              className="mach-field"
              data-machines-field="host"
              spellCheck={false}
              autoComplete="off"
              value={form.host}
              onChange={(e) => onSetForm({ host: e.target.value })}
            />
          </label>

          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_LABEL}</span>
            <input
              type="text"
              className="mach-field"
              data-machines-field="label"
              spellCheck={false}
              autoComplete="off"
              value={form.label}
              onChange={(e) => onSetForm({ label: e.target.value })}
            />
          </label>

          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_COLOUR}</span>
            <select
              className="set-select"
              data-machines-field="color"
              value={form.color}
              onChange={(e) =>
                onSetForm({ color: e.target.value as MachineFormState['color'] })
              }
            >
              {MACHINE_COLORS.map((color) => (
                <option key={color} value={color}>
                  {COLOUR_LABEL[color]}
                </option>
              ))}
            </select>
          </label>

          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_USER}</span>
            <input
              type="text"
              className="mach-field"
              data-machines-field="user"
              spellCheck={false}
              autoComplete="off"
              value={form.user}
              onChange={(e) => onSetForm({ user: e.target.value })}
            />
          </label>
          <div className="mach-hint">{FIELD_USER_HINT}</div>
        </div>

        {/* Step two and a half. Two fields most people never open. */}
        <details className="mach-advanced">
          <summary>{ADVANCED}</summary>

          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_PORT}</span>
            <input
              type="text"
              inputMode="numeric"
              className="mach-field mach-field-short"
              data-machines-field="port"
              spellCheck={false}
              autoComplete="off"
              value={form.port}
              onChange={(e) => onSetForm({ port: e.target.value })}
            />
          </label>
          <div className="mach-hint">{FIELD_PORT_HINT}</div>

          <label className="mach-field-row">
            <span className="mach-field-label">{FIELD_REMOTE_PATH}</span>
            <input
              type="text"
              className="mach-field"
              data-machines-field="remoteTmuxPath"
              spellCheck={false}
              autoComplete="off"
              value={form.remoteTmuxPath}
              onChange={(e) => onSetForm({ remoteTmuxPath: e.target.value })}
            />
          </label>
          <div className="mach-hint">{FIELD_REMOTE_PATH_HINT}</div>
        </details>

        {/* Step three. The only affordance here that starts a process. */}
        <div className="mach-block">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={testing || form.host.trim() === ''}
            data-machines-action="test-draft"
            onClick={onStartTest}
          >
            {testing ? TESTING : BTN_TEST}
          </button>
        </div>

        {test !== null ? (
          <ConnectionTestView
            started={test.started}
            transcript={test.transcript}
            outcome={test.outcome}
            running={test.running}
            onSend={onSendInput}
            onCancel={onCancelTest}
          />
        ) : null}

        {/* Step four. The lines are exactly the facts the hash covers, and
            they arrive from main on the outcome rather than being composed
            here. The name and the colour are not among them and never appear
            here. */}
        <div className="mach-block mach-sheet">
          {sheet !== null ? (
            <ul className="set-config-lines">
              {sheet.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          {/* Both come from main on the result, so this surface can neither
              omit them nor reword them. */}
          {machines !== null ? (
            <>
              <p className="set-config-warning">{machines.warning}</p>
              <p className="set-config-warning">{machines.honesty}</p>
            </>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdd}
            data-machines-action="add-confirm"
            onClick={onAdd}
          >
            {BTN_ADD_CONFIRM}
          </button>
          {canAdd ? null : <div className="mach-hint">{ADD_DISABLED_REASON}</div>}
          {error !== null ? <div className="set-row-error">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function AddMachine(): React.JSX.Element {
  const machines = useMachinesStore((s) => s.machines);
  const form = useMachinesStore((s) => s.form);
  const setForm = useMachinesStore((s) => s.setForm);
  const closeAdd = useMachinesStore((s) => s.closeAdd);
  const tailscale = useMachinesStore((s) => s.tailscale);
  const tailscaleBusy = useMachinesStore((s) => s.tailscaleBusy);
  const findTailnet = useMachinesStore((s) => s.findTailnet);
  const usePeer = useMachinesStore((s) => s.usePeer);
  const test = useMachinesStore((s) => s.test);
  const startDraftTest = useMachinesStore((s) => s.startDraftTest);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const addMachine = useMachinesStore((s) => s.addMachine);
  const busy = useMachinesStore((s) => s.busy) === 'add';

  const [error, setError] = useState<string | null>(null);

  // A test started from a saved row belongs to that row and is drawn there.
  const draftTest = test !== null && test.savedId === null ? test : null;

  return (
    <AddMachineView
      machines={machines}
      form={form}
      tailscale={tailscale}
      tailscaleBusy={tailscaleBusy}
      test={draftTest}
      busy={busy}
      error={error}
      onSetForm={setForm}
      onClose={() => {
        setError(null);
        closeAdd();
      }}
      onFindTailnet={() => void findTailnet()}
      onUsePeer={usePeer}
      onStartTest={() => {
        setError(null);
        void startDraftTest().then(setError);
      }}
      onSendInput={(text) => void sendTestInput(text)}
      onCancelTest={() => void cancelTest()}
      onAdd={() => {
        setError(null);
        void addMachine().then(setError);
      }}
    />
  );
}
