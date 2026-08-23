/**
 * Phase 68. Add a machine.
 *
 * FOUR STEPS, IN ORDER, and the order is the design. A person picks or types
 * an address, tests the connection and watches it happen, reads the lines the
 * agreement will be bound to, and presses one button that writes the row and
 * records the confirmation together. The button is disabled until the machine
 * itself has answered, and Phase 87 moved the reason onto the button as its
 * tooltip rather than under it as a paragraph, because a control that is off
 * without saying why is a puzzle rather than a safeguard.
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
 * for.
 *
 * PHASE 79. The picker is now reachable from two presses of the same button
 * rather than one, and both of them are a person's. The panel above it is
 * drawn before either press, and it says what Tailscale is for here, when
 * Tortie last looked, and how to install Tailscale when there is none. Opening
 * this sheet still runs nothing. The panel is built from what the last look
 * left in the store, so the first press is the first process.
 *
 * The panel copies the agent scan in Settings, which answers the same three
 * questions for an agent that is not on this Mac. A person who has read one
 * has read the other.
 *
 * PHASE 79.1. A draft test that came back with the machine turning the sign in
 * down offers to set up a key, and the block that does it is drawn by
 * ConnectionTestView, which this sheet already renders. So this file gains two
 * props and no markup. A machine can be given a key BEFORE it is added, which
 * is the case the whole rung exists for: the operator's own Mac refused him,
 * and a machine that refuses cannot be tested, so it can never be added.
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
import { formatAge, useNow } from '../format';
import { Codicon } from '../icons';
import { ConnectionTestView } from './ConnectionTestView';
import { CopyButton } from './CopyButton';
import {
  ADD_DISABLED_REASON,
  ADD_TITLE,
  ADVANCED,
  BTN_ADD_CANCEL,
  BTN_ADD_CONFIRM,
  BTN_FIND_TAILNET,
  BTN_TAILSCALE_LOOK_AGAIN,
  BTN_TEST,
  COLOUR_LABEL,
  COPY_INSTALL_COMMAND_LABEL,
  FIELD_COLOUR,
  FIELD_HOST,
  FIELD_LABEL,
  FIELD_PORT,
  FIELD_PORT_HINT,
  FIELD_REMOTE_PATH,
  FIELD_REMOTE_PATH_HINT,
  FIELD_USER,
  FIELD_USER_HINT,
  MEASURED_VERSIONS,
  PEER_ALREADY_ADDED,
  PEER_CANNOT_HOST,
  PEER_OFFLINE,
  PEER_THIS_MAC,
  PREPARE_SUPPORTED_LABEL,
  TAILSCALE_EXPLAIN,
  TAILSCALE_INSTALL_COMMAND,
  TAILSCALE_LOOKING,
  TAILSCALE_NOT_INSTALLED,
  TAILSCALE_NOT_LOOKED,
  TAILSCALE_SOURCE_LABEL,
  TAILSCALE_TITLE,
  TAILSCALE_WHY,
  TESTING,
  lastLookedLine,
  tailnetCountLine
} from './machines-copy';
import {
  sheetOf,
  useMachinesStore,
  type KeyInstallState,
  type LiveTest,
  type MachineFormState
} from './machines-store';

/**
 * The names Tailscale hands back for a machine that has no useful one.
 *
 * An iOS device reports the HostName `localhost`, and main falls back to the
 * HostName when it has nothing better, so a person with two iPhones on their
 * tailnet reads `localhost` twice and cannot tell the rows apart.
 */
const PLACEHOLDER_NAMES: ReadonlySet<string> = new Set([
  '',
  'localhost',
  'localhost.localdomain'
]);

/**
 * The name to draw for one machine.
 *
 * The full address is already on the wire as `host`, and its first label is
 * the name Tailscale itself shows in its own list. When the name Tortie was
 * given says nothing, that label is used instead. The address is drawn beside
 * it either way, so nothing is hidden by this.
 */
export function peerDisplayName(peer: TailscalePeerView): string {
  if (!PLACEHOLDER_NAMES.has(peer.name.trim().toLowerCase())) return peer.name;
  const label = peer.host.split('.')[0] ?? '';
  return label === '' ? peer.name : label;
}

/** The systems that cannot keep a session alive. Lowercase, trimmed. */
const CANNOT_HOST: ReadonlySet<string> = new Set([
  'ios',
  'ipados',
  'android',
  'tvos'
]);

/**
 * False for a device that cannot run a session.
 *
 * The judgement comes from one string another program supplied, so it narrows
 * what a person can press and it never removes a row. A phone a person can see
 * in the Tailscale app and cannot see in Tortie reads as Tortie being broken.
 * Anything Tortie has not seen before, including an empty value, is treated as
 * able, because Tortie must not refuse a machine on a string it does not know.
 */
export function peerCanHost(os: string): boolean {
  return !CANNOT_HOST.has(os.trim().toLowerCase());
}

/** One machine the tailnet reported, as a button that fills the form. */
function PeerRow({
  peer,
  onPick
}: {
  peer: TailscalePeerView;
  onPick(peer: TailscalePeerView): void;
}): React.JSX.Element {
  const canHost = peerCanHost(peer.os);
  const name = peerDisplayName(peer);

  const marks: string[] = [];
  if (peer.isThisMac) marks.push(PEER_THIS_MAC);
  if (peer.alreadyAdded) marks.push(PEER_ALREADY_ADDED);
  if (!peer.online) marks.push(PEER_OFFLINE);
  if (!canHost) marks.push(PEER_CANNOT_HOST);

  return (
    <button
      type="button"
      className="mach-peer"
      data-machines-peer={peer.host}
      data-peer-online={peer.online ? 'yes' : 'no'}
      data-peer-can-host={canHost ? 'yes' : 'no'}
      data-peer-name-source={name === peer.name ? 'hostname' : 'tailnet'}
      disabled={peer.alreadyAdded || !canHost}
      onClick={() => onPick(peer)}
    >
      <span className="mach-peer-name">{name}</span>
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

/** The three things the panel can be saying, derived and never stored. */
type TailnetState = 'unlooked' | 'missing' | 'installed';

function tailnetStateOf(tailscale: TailscaleSourceResult | null): TailnetState {
  if (tailscale === null) return 'unlooked';
  if (tailscale.binary === null) return 'missing';
  return 'installed';
}

/**
 * PHASE 79. What Tailscale is for here, when Tortie last looked, and what to
 * do when there is no Tailscale on this Mac.
 *
 * The operator pressed the one button this sheet used to offer, read a single
 * sentence saying no program was found, and had nowhere to go. The panel now
 * answers the three questions the agent scan answers for a missing agent,
 * which are what this is, whether it is here, and how to get it.
 *
 * IT STARTS NOTHING. Everything drawn here comes from what the last press left
 * in the store. The button is the only thing that can run the program, and a
 * person presses it.
 */
function TailscalePanel({
  tailscale,
  tailscaleBusy,
  readAt,
  now,
  onFindTailnet,
  onUsePeer
}: {
  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  readAt: number | null;
  now: number;
  onFindTailnet(): void;
  onUsePeer(peer: TailscalePeerView): void;
}): React.JSX.Element {
  const state = tailnetStateOf(tailscale);

  // The same population main's own note counts, being everything that is not
  // the Mac this window is running on.
  const others =
    tailscale === null
      ? 0
      : tailscale.peers.filter((peer) => !peer.isThisMac).length;

  return (
    <div className="mach-block mach-scan" data-tailscale-state={state}>
      <div className="mach-scan-head">
        <span className="mach-scan-title">{TAILSCALE_TITLE}</span>
        <span className="set-scan-age">
          {readAt === null
            ? TAILSCALE_NOT_LOOKED
            : lastLookedLine(formatAge(readAt, now))}
        </span>
        <button
          type="button"
          className="btn btn-secondary set-rescan"
          disabled={tailscaleBusy}
          data-machines-action="find-tailnet"
          onClick={onFindTailnet}
        >
          {tailscaleBusy ? (
            <span className="set-spinner" aria-hidden="true" />
          ) : (
            <Codicon name="search" size={12} />
          )}
          {tailscaleBusy
            ? TAILSCALE_LOOKING
            : state === 'unlooked'
              ? BTN_FIND_TAILNET
              : BTN_TAILSCALE_LOOK_AGAIN}
        </button>
      </div>

      {state === 'unlooked' ? <div className="mach-hint">{TAILSCALE_WHY}</div> : null}

      {/* The command is drawn and never run. Tortie has no installer and this
          is a line for a person to paste into their own terminal.
          Main's own note is NOT drawn in this state. It says the same thing as
          the sentence beside the command, in other words, and a person should
          not read it twice. Do not add it back. */}
      {state === 'missing' ? (
        <>
          <div className="set-agent-detail">
            <span className="set-agent-missing">{TAILSCALE_NOT_INSTALLED}</span>
            <code className="set-agent-cmd">{TAILSCALE_INSTALL_COMMAND}</code>
            <CopyButton
              text={TAILSCALE_INSTALL_COMMAND}
              label={COPY_INSTALL_COMMAND_LABEL}
            />
          </div>
          <div className="mach-hint">{TAILSCALE_WHY}</div>
        </>
      ) : null}

      {state === 'installed' && tailscale !== null ? (
        <>
          <div className="mach-source">
            <span className="mach-source-label">{TAILSCALE_SOURCE_LABEL}</span>
            <span className="mach-source-path">{tailscale.binary}</span>
          </div>
          <div className="mach-scan-count">{tailnetCountLine(others)}</div>
          <div className="mach-hint">{TAILSCALE_EXPLAIN}</div>
          {/* Main's note, drawn once and nowhere else. An empty tailnet used to
              print the same sentence twice, because this file kept a copy of
              it under its own name. */}
          {tailscale.note === null ? null : (
            <div className="mach-note">{tailscale.note}</div>
          )}
          {tailscale.peers.length > 0 ? (
            <div className="mach-peers">
              {tailscale.peers.map((peer) => (
                <PeerRow key={peer.host} peer={peer} onPick={onUsePeer} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export interface AddMachineViewProps {
  /** Carries the two sentences main owns. Null until the first read. */
  machines: MachinesResult | null;
  form: MachineFormState;
  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  /** When the last look at Tailscale finished. Null until one has. */
  tailscaleReadAt: number | null;
  /** The draft test, or null. A saved row's test never reaches this view. */
  test: LiveTest | null;
  /**
   * The key install for the machine being added, or null. A saved row's
   * install never reaches this view, for the reason its test does not.
   */
  keyInstall: KeyInstallState | null;
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
  /** Sends that machine's password once. Nothing here keeps a copy of it. */
  onInstallKey(password: string): void;
  onAdd(): void;
}

export function AddMachineView({
  machines,
  form,
  tailscale,
  tailscaleBusy,
  tailscaleReadAt,
  test,
  keyInstall,
  busy,
  error,
  onSetForm,
  onClose,
  onFindTailnet,
  onUsePeer,
  onStartTest,
  onSendInput,
  onCancelTest,
  onInstallKey,
  onAdd
}: AddMachineViewProps): React.JSX.Element {
  // The sheet main composed at the end of the test. It is the only source of
  // the lines below and of the hash the agreement binds to, so the button is
  // off for exactly as long as there is no sheet.
  const sheet = sheetOf(test);
  const canAdd = sheet !== null && !busy;
  const testing = test !== null && test.running;

  // Only so the age in the panel head stays honest while the sheet is open.
  const now = useNow();

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
        <TailscalePanel
          tailscale={tailscale}
          tailscaleBusy={tailscaleBusy}
          readAt={tailscaleReadAt}
          now={now}
          onFindTailnet={onFindTailnet}
          onUsePeer={onUsePeer}
        />

        {/* Step two. The person's own keystrokes.
            PHASE 130. This is the only .mach-block in the sheet that is a
            stack of labelled field rows, and a labelled row is a group of
            two. It carries .mach-fields so a field sits closer to its own
            hint than to the next field. The Tailscale panel, the test block
            and the confirm sheet are stacks of paragraphs and keep the plain
            .mach-block rhythm. */}
        <div className="mach-block mach-fields">
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

        {/* Step three. The only affordance here that starts a process.
            PHASE 79. The versions Tortie has measured are on screen BEFORE the
            test runs, not only in the refusal afterwards. A person about to
            add a machine can go and check what it runs first, rather than
            learning the rule from a machine that was turned down. */}
        <div className="mach-block">
          <div className="mach-prepare-fact">
            <span className="mach-prepare-label">{PREPARE_SUPPORTED_LABEL}</span>
            <span className="mach-prepare-value" data-measured-versions="1">
              {MEASURED_VERSIONS.join(', ')}
            </span>
          </div>
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
            keyInstall={keyInstall}
            onInstallKey={onInstallKey}
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
              omit them nor reword them. Phase 87 draws them in one paragraph
              rather than two, which removes one paragraph gap. The shortening
              itself happened in main, where MACHINE_PATH_HONESTY lost its
              third sentence. This surface still draws whatever main sends,
              word for word. */}
          {machines !== null ? (
            <p className="set-config-warning">
              {`${machines.warning} ${machines.honesty}`}
            </p>
          ) : null}

          {/* PHASE 101. The paragraph that says what replacing a file costs.
              A machines file an agent can write can carry a folder on a NEW
              row, and this sheet would then grant file replacement. The answer
              to whether the paragraph is drawn is main's, off the same fields
              the lines above come from, so a sheet whose lines name a folder
              can never be read without it. It is drawn nowhere else on this
              sheet and it is not one of the lines, because the lines are
              exactly what the hash covers. */}
          {sheet === null || sheet.writeHonesty === null ? null : (
            <p className="set-config-warning" data-machine-write-honesty>
              {sheet.writeHonesty}
            </p>
          )}

          {/* The reason the button is off rides on the button rather than
              standing under it. A control that is off without saying why is a
              puzzle, and the tooltip is only spread while it is off, so an
              enabled button carries no title at all. */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdd}
            {...(canAdd ? {} : { title: ADD_DISABLED_REASON })}
            data-machines-action="add-confirm"
            onClick={onAdd}
          >
            {BTN_ADD_CONFIRM}
          </button>
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
  const tailscaleReadAt = useMachinesStore((s) => s.tailscaleReadAt);
  const findTailnet = useMachinesStore((s) => s.findTailnet);
  const usePeer = useMachinesStore((s) => s.usePeer);
  const test = useMachinesStore((s) => s.test);
  const startDraftTest = useMachinesStore((s) => s.startDraftTest);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const addMachine = useMachinesStore((s) => s.addMachine);
  const installKey = useMachinesStore((s) => s.installKey);
  const keyInstall = useMachinesStore((s) => s.keyInstall);
  const busy = useMachinesStore((s) => s.busy) === 'add';

  const [error, setError] = useState<string | null>(null);

  // A test started from a saved row belongs to that row and is drawn there.
  const draftTest = test !== null && test.savedId === null ? test : null;
  // The same rule for the install. A row's install carries that row's id, and
  // the machine being added has none yet.
  const draftKeyInstall =
    keyInstall !== null && keyInstall.savedId === null ? keyInstall : null;

  return (
    <AddMachineView
      machines={machines}
      form={form}
      tailscale={tailscale}
      tailscaleBusy={tailscaleBusy}
      tailscaleReadAt={tailscaleReadAt}
      test={draftTest}
      keyInstall={draftKeyInstall}
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
      onInstallKey={(password) => {
        setError(null);
        void installKey(password).then(setError);
      }}
      onAdd={() => {
        setError(null);
        void addMachine().then(setError);
      }}
    />
  );
}
