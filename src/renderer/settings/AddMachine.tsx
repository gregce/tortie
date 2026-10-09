/**
 * Phase 68. Add a machine. PHASE 340 rewrote it as pick, check and add
 * (build/p340/SPEC.md section 5.1, the design he was shown).
 *
 * THREE STEPS AND ONE PRESS, and the order is the design.
 *
 *  1. PICK (`data-machines-step="pick"`). The tailnet's own rows, which the Add
 *     a machine press already asked for, or Type an address… and Check. Advanced
 *     holds the account, the port and a program path for an odd place.
 *  2. CHECK (`check`). A pick or Check starts it, and Tortie signs in, finds
 *     the program through that machine's own shell and the usual install
 *     folders, and reads its version. It asks inline only when it must: trust a
 *     first-seen machine, a password once to put Tortie's key on it, which of
 *     two programs to run, or a prompt it does not recognise.
 *  3. ADD (`add`), drawn for every check that answered ok. One button,
 *     `Add <name>`, confirms the exact lines main hashed and prepares the
 *     machine. A version Tortie has not measured is one line on that button,
 *     and the agreement carries it.
 *
 * Then READY (`ready`): `<name> is ready.`, the agents on it and Open a folder
 * on it…, or main's own answer when Prepare refused.
 *
 * WHY THE ADD BUTTON WAITS FOR THE CHECK. The row names a program Tortie will
 * run on another machine. Until the check comes back with an absolute path the
 * machine itself reported, and main has composed the lines and the hash over
 * it, there is nothing a person could meaningfully agree to, so no Add button
 * exists. Typing a path under Advanced does not skip the check. It only tells
 * the check where to look.
 *
 * WHAT THE PICK STARTS, and why refusal 8 still holds (D5). A pick, a Check, a
 * candidate button and Check again are each a person's own press in Tortie's
 * own window. The check they start reads; it writes nothing on either machine
 * except Tortie's own record of a host key a person pressed Trust it for, and
 * it leaves nothing of Tortie's running. Nothing here starts on a keystroke: an
 * edit to the address, the account, the port or the path drops a finished
 * check, and checking again is a press.
 *
 * WHAT IS ONE PRESS AWAY (D17). Every hashed fact is on the face of the check
 * when Add can be pressed: the address and port, the account, the program and
 * its version. The exact lines, main's warning and sealing sentence, any write
 * paragraph and the version offer are under What it runs beside the button.
 *
 * `AddMachineView` draws and takes everything as a prop. `AddMachine` reads
 * the store and hands it over, for the reason in MachinesSection.tsx's header.
 */

import React from 'react';
import type {
  MachineAgentsView,
  MachinePrepareResult,
  MachinesResult,
  TailscalePeerView,
  TailscaleSourceResult
} from '@shared/ipc';
import { MACHINE_COLORS } from '@shared/machines';
import { formatAge } from '@shared/age';
import { useNow } from '../format';
import { ConnectionTestView } from './ConnectionTestView';
import { CopyButton } from './CopyButton';
import { AcceptVersionSheet, PrepareResult } from './MachineRow';
import {
  ADDING,
  ADD_TITLE,
  ADVANCED,
  AGENTS_ON_IT,
  BTN_ADD_CANCEL,
  BTN_CHECK,
  BTN_DONE,
  BTN_OPEN_FOLDER,
  BTN_TAILSCALE_LOOK_AGAIN,
  BTN_TYPE_ADDRESS,
  COLOUR_LABEL,
  COPY_INSTALL_COMMAND_LABEL,
  FIELD_COLOR,
  FIELD_HOST,
  FIELD_NAME,
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
  PREPARING,
  TAILNET_TITLE,
  TAILSCALE_EXPLAIN,
  TAILSCALE_INSTALL_COMMAND,
  TAILSCALE_LOOKING,
  TAILSCALE_NOT_INSTALLED,
  TAILSCALE_SOURCE_LABEL,
  TAILSCALE_WHY,
  WHAT_IT_RUNS,
  acceptsVersionLine,
  addLabel,
  lastLookedLine,
  readyLine
} from './machines-copy';
import {
  peerDisplayName,
  sheetOf,
  useMachinesStore,
  type AddedMachine,
  type KeyInstallState,
  type LiveTest,
  type MachineFormState
} from './machines-store';
import { useSettingsStore } from './settings-store';

// The name a tailnet row draws now lives beside the pick that writes it into
// the form (D28). It is re-exported so every reader keeps one import.
export { peerDisplayName };

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
 * what a person can press and it never removes a row. Anything Tortie has not
 * seen before, including an empty value, is treated as able, because Tortie
 * must not refuse a machine on a string it does not know.
 */
export function peerCanHost(os: string): boolean {
  return !CANNOT_HOST.has(os.trim().toLowerCase());
}

/** One machine the tailnet reported, as a button that checks it. */
function PeerRow({
  peer,
  disabled,
  onPick
}: {
  peer: TailscalePeerView;
  disabled: boolean;
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
      disabled={peer.alreadyAdded || !canHost || disabled}
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

/** The three things the list can be saying, derived and never stored. */
type TailnetState = 'unlooked' | 'missing' | 'installed';

function tailnetStateOf(tailscale: TailscaleSourceResult | null): TailnetState {
  if (tailscale === null) return 'unlooked';
  if (tailscale.binary === null) return 'missing';
  return 'installed';
}

/**
 * The hover of the list's head: what Tailscale is for, the path Tortie ran it
 * from and when it last looked. Every sentence the panel used to stand on its
 * face is here, one hover away (section 8.2).
 */
export function tailnetHover(
  tailscale: TailscaleSourceResult | null,
  readAt: number | null,
  now: number
): string {
  const lines: string[] = [TAILSCALE_WHY];
  if (tailscale !== null && tailscale.binary !== null) {
    lines.push(TAILSCALE_EXPLAIN);
    lines.push(`${TAILSCALE_SOURCE_LABEL} ${tailscale.binary}`);
  }
  if (readAt !== null) lines.push(lastLookedLine(formatAge(readAt, now)));
  return lines.join('\n');
}

/**
 * The list of machines on the tailnet. It starts nothing by being drawn: the
 * Add a machine press already asked, and Look again is a press.
 */
function TailnetList({
  tailscale,
  tailscaleBusy,
  readAt,
  now,
  checking,
  onFindTailnet,
  onUsePeer
}: {
  tailscale: TailscaleSourceResult | null;
  tailscaleBusy: boolean;
  readAt: number | null;
  now: number;
  checking: boolean;
  onFindTailnet(): void;
  onUsePeer(peer: TailscalePeerView): void;
}): React.JSX.Element {
  const state = tailnetStateOf(tailscale);
  return (
    <div className="mach-block mach-scan" data-tailscale-state={state}>
      <div className="mach-scan-head">
        <span className="mach-scan-title" title={tailnetHover(tailscale, readAt, now)}>
          {TAILNET_TITLE}
        </span>
        <button
          type="button"
          className="btn btn-secondary set-rescan"
          disabled={tailscaleBusy}
          data-machines-action="find-tailnet"
          onClick={onFindTailnet}
        >
          {tailscaleBusy ? <span className="set-spinner" aria-hidden="true" /> : null}
          {tailscaleBusy ? TAILSCALE_LOOKING : BTN_TAILSCALE_LOOK_AGAIN}
        </button>
      </div>

      {/* The command is drawn and never run. Tortie has no installer and this
          is a line for a person to paste into their own terminal. Main's own
          note is not drawn in this state, because it says the same thing. */}
      {state === 'missing' ? (
        <div className="set-agent-detail">
          <span className="set-agent-missing">{TAILSCALE_NOT_INSTALLED}</span>
          <code className="set-agent-cmd">{TAILSCALE_INSTALL_COMMAND}</code>
          <CopyButton
            text={TAILSCALE_INSTALL_COMMAND}
            label={COPY_INSTALL_COMMAND_LABEL}
          />
        </div>
      ) : null}

      {state === 'installed' && tailscale !== null ? (
        <>
          {/* Main's note, drawn once and nowhere else. */}
          {tailscale.note === null ? null : (
            <div className="mach-note">{tailscale.note}</div>
          )}
          {tailscale.peers.length > 0 ? (
            <div className="mach-peers">
              {tailscale.peers.map((peer) => (
                <PeerRow
                  key={peer.host}
                  peer={peer}
                  disabled={checking}
                  onPick={onUsePeer}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** The name the Add step and the running row use for the machine. */
export function effectiveLabel(form: MachineFormState, test: LiveTest | null): string {
  const typed = form.label.trim();
  if (typed !== '') return typed;
  return test?.draft?.host ?? form.host.trim();
}

/** The present agents' names, from the scan answer for one machine. */
function presentAgentNames(
  view: MachineAgentsView | undefined,
  names: ReadonlyMap<string, string>
): string[] {
  if (view === undefined) return [];
  return view.agents
    .filter((one) => one.presence === 'present')
    .map((one) => names.get(one.agentId) ?? one.agentId);
}

/** The last step: the machine is added, and what Prepare answered. */
function ReadyStep({
  added,
  result,
  preparing,
  agents,
  error,
  accepting,
  onAccept,
  onOpenFolder,
  onDone
}: {
  added: AddedMachine;
  result: MachinePrepareResult | undefined;
  preparing: boolean;
  agents: string[] | null;
  error: string | null;
  accepting: boolean;
  onAccept(): void;
  onOpenFolder(): void;
  onDone(): void;
}): React.JSX.Element {
  const ready = result !== undefined && result.class === 'prepared';
  return (
    <div className="mach-block mach-ready" data-machines-step="ready">
      {result === undefined && preparing ? (
        <div className="mach-check-running">
          <span className="set-spinner" aria-hidden="true" />
          <span className="mach-check-text">{PREPARING}</span>
        </div>
      ) : null}
      {ready ? (
        <>
          <div className="mach-ready-line" data-machines-ready={added.id}>
            {readyLine(added.label)}
          </div>
          {/* PHASE 342'S FIX ROUND. Main's one sentence that a session there
              can look a little different from one on this Mac, when the
              machine's tmux refused a setting its version was not measured
              refusing. One line under the ready line, and nothing at all on
              every machine Tortie measured. */}
          {typeof result?.note === 'string' && result.note.trim() !== '' ? (
            <div className="mach-note" data-machines-ready-note={added.id}>
              {result.note}
            </div>
          ) : null}
          {/* D19. The agents appear after Add, from the one scan Prepare
              starts, and only once that scan has answered. */}
          {agents === null || agents.length === 0 ? null : (
            <div className="mach-prepare-fact" data-machines-agents={added.id}>
              <span className="mach-prepare-label">{AGENTS_ON_IT}</span>
              <span className="mach-prepare-value">{agents.join(', ')}</span>
            </div>
          )}
        </>
      ) : null}
      {result !== undefined && !ready ? (
        <>
          <PrepareResult result={result} />
          <AcceptVersionSheet result={result} accepting={accepting} onAccept={onAccept} />
        </>
      ) : null}
      {error !== null ? <div className="set-row-error">{error}</div> : null}
      <div className="mach-ready-actions">
        {ready ? (
          <button
            type="button"
            className="btn btn-primary"
            data-machines-action="open-folder"
            onClick={onOpenFolder}
          >
            {BTN_OPEN_FOLDER}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary"
          data-machines-action="add-done"
          disabled={preparing && result === undefined}
          onClick={onDone}
        >
          {BTN_DONE}
        </button>
      </div>
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
  /** The draft check, or null. A saved row's check never reaches this view. */
  test: LiveTest | null;
  /** The key install for the machine being added, or null. */
  keyInstall: KeyInstallState | null;
  /** True once Type an address… has revealed the address field. */
  addressOpen: boolean;
  /** True while Advanced is open. */
  advancedOpen: boolean;
  /** True while the check's Details is open. */
  detailsOpen: boolean;
  /** The machine the Add press wrote, while the flow shows it ready. */
  added: AddedMachine | null;
  /** What Prepare answered for that machine, or undefined. */
  addedResult?: MachinePrepareResult | undefined;
  /** True while the add, or the prepare after it, is in flight. */
  preparing?: boolean;
  /** The agents found present on the added machine, by display name. */
  addedAgents?: string[] | null;
  /** True while an acceptance for the added machine is in flight. */
  accepting?: boolean;
  /** True while the add call is in flight. */
  busy: boolean;
  /** Main's sentence when a call was refused. Null otherwise. */
  error: string | null;
  onSetForm(patch: Partial<MachineFormState>): void;
  onClose(): void;
  onFindTailnet(): void;
  onUsePeer(peer: TailscalePeerView): void;
  onSetAddressOpen(open: boolean): void;
  onSetAdvancedOpen(open: boolean): void;
  onSetDetailsOpen(open: boolean): void;
  /** Check, or Return in the address field. */
  onStartTest(): void;
  onCheckAgain(): void;
  onPickCandidate(path: string): void;
  onAnswer(text?: string): void;
  onSendInput(text: string): void;
  onCancelTest(): void;
  /** Sends that machine's password once. Nothing here keeps a copy of it. */
  onInstallKey(password: string): void;
  onAdd(): void;
  onAcceptVersion(): void;
  onOpenFolder(): void;
  onDone(): void;
}

export function AddMachineView({
  machines,
  form,
  tailscale,
  tailscaleBusy,
  tailscaleReadAt,
  test,
  keyInstall,
  addressOpen,
  advancedOpen,
  detailsOpen,
  added,
  addedResult,
  preparing = false,
  addedAgents = null,
  accepting = false,
  busy,
  error,
  onSetForm,
  onClose,
  onFindTailnet,
  onUsePeer,
  onSetAddressOpen,
  onSetAdvancedOpen,
  onSetDetailsOpen,
  onStartTest,
  onCheckAgain,
  onPickCandidate,
  onAnswer,
  onSendInput,
  onCancelTest,
  onInstallKey,
  onAdd,
  onAcceptVersion,
  onOpenFolder,
  onDone
}: AddMachineViewProps): React.JSX.Element {
  // The sheet main composed at the end of the check. It is the only source of
  // the lines below and of the hash the agreement binds to, so the Add step
  // exists for exactly as long as there is a sheet.
  const sheet = sheetOf(test);
  const checking = test !== null && test.running;
  const label = effectiveLabel(form, test);
  // The version the SHEET binds, and nothing else decides it (D7 as revised).
  // The one line on the Add button is drawn only for a version the check read
  // and Tortie has not measured (D8), and it names what the sheet binds, so the
  // words under the button and the value the press sends are one value.
  const accepted = sheet?.acceptedTmuxVersion ?? null;
  const acceptsLine =
    accepted !== null &&
    accepted !== '' &&
    test?.outcome?.check?.versionKind === 'unmeasured'
      ? accepted
      : null;

  // Only so the age in the head's hover stays honest while the sheet is open.
  const now = useNow();
  // Type its path… lands the caret in the path field, which is what it is for.
  const pathRef = React.useRef<HTMLInputElement>(null);

  const typed = (patch: Partial<MachineFormState>): void => onSetForm(patch);

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
        {added !== null ? (
          <ReadyStep
            added={added}
            result={addedResult}
            preparing={preparing}
            agents={addedAgents}
            error={error}
            accepting={accepting}
            onAccept={onAcceptVersion}
            onOpenFolder={onOpenFolder}
            onDone={onDone}
          />
        ) : (
          <>
            {/* Step one. A pick, or an address a person types. */}
            <div className="mach-block mach-pick" data-machines-step="pick">
              <TailnetList
                tailscale={tailscale}
                tailscaleBusy={tailscaleBusy}
                readAt={tailscaleReadAt}
                now={now}
                checking={checking}
                onFindTailnet={onFindTailnet}
                onUsePeer={onUsePeer}
              />

              {addressOpen ? (
                <div className="mach-address" data-machines-address="1">
                  <label className="mach-field-row">
                    <span className="mach-field-label">{FIELD_HOST}</span>
                    <input
                      type="text"
                      className="mach-field"
                      data-machines-field="host"
                      spellCheck={false}
                      autoComplete="off"
                      value={form.host}
                      onChange={(e) => typed({ host: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !checking && form.host.trim() !== '') {
                          onStartTest();
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={checking || form.host.trim() === ''}
                    data-machines-action="test-draft"
                    onClick={onStartTest}
                  >
                    {BTN_CHECK}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-text mach-type-address"
                  aria-expanded={false}
                  data-machines-action="type-address"
                  onClick={() => onSetAddressOpen(true)}
                >
                  {BTN_TYPE_ADDRESS}
                </button>
              )}

              <details
                className="mach-advanced"
                data-machines-advanced="1"
                open={advancedOpen}
                onToggle={(e) =>
                  onSetAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)
                }
              >
                <summary>{ADVANCED}</summary>

                <label className="mach-field-row">
                  <span className="mach-field-label">{FIELD_USER}</span>
                  <input
                    type="text"
                    className="mach-field"
                    data-machines-field="user"
                    spellCheck={false}
                    autoComplete="off"
                    value={form.user}
                    onChange={(e) => typed({ user: e.target.value })}
                  />
                </label>
                <div className="mach-hint">{FIELD_USER_HINT}</div>

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
                    onChange={(e) => typed({ port: e.target.value })}
                  />
                </label>
                <div className="mach-hint">{FIELD_PORT_HINT}</div>

                <label className="mach-field-row">
                  <span className="mach-field-label">{FIELD_REMOTE_PATH}</span>
                  <input
                    type="text"
                    className="mach-field"
                    data-machines-field="remoteTmuxPath"
                    ref={pathRef}
                    spellCheck={false}
                    autoComplete="off"
                    value={form.remoteTmuxPath}
                    onChange={(e) => typed({ remoteTmuxPath: e.target.value })}
                  />
                </label>
                <div className="mach-hint">{FIELD_REMOTE_PATH_HINT}</div>
              </details>
            </div>

            {/* Step two. Started by a pick, Check or Return, and by nothing
                else. Its questions appear here only when they must. */}
            {test !== null ? (
              <div className="mach-block mach-step" data-machines-step="check">
                <ConnectionTestView
                  started={test.started}
                  transcript={test.transcript}
                  outcome={test.outcome}
                  running={test.running}
                  ask={test.ask ?? null}
                  mode="draft"
                  label={label}
                  host={test.draft?.host ?? form.host}
                  port={test.draft?.port ?? null}
                  detailsOpen={detailsOpen}
                  onDetailsToggle={onSetDetailsOpen}
                  onSend={onSendInput}
                  onCancel={onCancelTest}
                  onAnswer={onAnswer}
                  onPickCandidate={onPickCandidate}
                  onTypePath={() => {
                    onSetAdvancedOpen(true);
                    onSetAddressOpen(true);
                    if (typeof requestAnimationFrame === 'function') {
                      requestAnimationFrame(() => pathRef.current?.focus());
                    }
                  }}
                  onCheckAgain={onCheckAgain}
                  pathTyped={(test.draft?.remoteTmuxPath ?? null) !== null}
                  keyInstall={keyInstall}
                  onInstallKey={onInstallKey}
                />
              </div>
            ) : null}

            {/* Step three, drawn only once main has composed a sheet, which is
                every check that answered ok. The name and the colour are
                presentation, never hashed: editing the name changes the label
                and never the id the check ran under (D28). */}
            {sheet === null ? null : (
              <div className="mach-block mach-step mach-add-step" data-machines-step="add">
                <div className="mach-fields">
                  <label className="mach-field-row">
                    <span className="mach-field-label">{FIELD_NAME}</span>
                    <input
                      type="text"
                      className="mach-field"
                      data-machines-field="label"
                      spellCheck={false}
                      autoComplete="off"
                      placeholder={label}
                      value={form.label}
                      onChange={(e) => typed({ label: e.target.value })}
                    />
                  </label>
                  <label className="mach-field-row">
                    <span className="mach-field-label">{FIELD_COLOR}</span>
                    <select
                      className="set-select"
                      data-machines-field="color"
                      value={form.color}
                      onChange={(e) =>
                        typed({ color: e.target.value as MachineFormState['color'] })
                      }
                    >
                      {MACHINE_COLORS.map((color) => (
                        <option key={color} value={color}>
                          {COLOUR_LABEL[color]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mach-add-press">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    data-machines-action="add-confirm"
                    onClick={onAdd}
                  >
                    {busy ? ADDING : addLabel(label)}
                  </button>
                  {/* The one line a version Tortie has not measured adds. The
                      press accepts exactly what the sheet carries. */}
                  {acceptsLine === null ? null : (
                    <span className="mach-add-subline" data-machines-accepts={acceptsLine}>
                      {acceptsVersionLine(acceptsLine)}
                    </span>
                  )}
                </div>
                {error !== null ? <div className="set-row-error">{error}</div> : null}

                {/* What the press binds, exactly as main composed it, one press
                    away. */}
                <details className="mach-what" data-machines-what-it-runs="1">
                  <summary>{WHAT_IT_RUNS}</summary>
                  <ul className="set-config-lines">
                    {sheet.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  {machines !== null ? (
                    <p className="set-config-warning">
                      {`${machines.warning} ${machines.honesty}`}
                    </p>
                  ) : null}
                  {sheet.writeHonesty === null ? null : (
                    <p className="set-config-warning" data-machine-write-honesty>
                      {sheet.writeHonesty}
                    </p>
                  )}
                  {sheet.versionHonesty === undefined || sheet.versionHonesty === null ? null : (
                    <p className="set-config-warning" data-machine-version-honesty>
                      {sheet.versionHonesty}
                    </p>
                  )}
                  <div className="mach-prepare-fact">
                    <span className="mach-prepare-label">{PREPARE_SUPPORTED_LABEL}</span>
                    <span className="mach-prepare-value" data-measured-versions="1">{MEASURED_VERSIONS.join(', ')}</span>
                  </div>
                </details>
              </div>
            )}

            {/* An Add refused before any check is drawn, and the add-step's own
                error line is not on screen, so the sentence still reaches a
                person. */}
            {sheet === null && error !== null ? (
              <div className="set-row-error">{error}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function AddMachine(): React.JSX.Element {
  const machines = useMachinesStore((s) => s.machines);
  const form = useMachinesStore((s) => s.form);
  const setForm = useMachinesStore((s) => s.setForm);
  const closeAdd = useMachinesStore((s) => s.closeAdd);
  const finishAdd = useMachinesStore((s) => s.finishAdd);
  const tailscale = useMachinesStore((s) => s.tailscale);
  const tailscaleBusy = useMachinesStore((s) => s.tailscaleBusy);
  const tailscaleReadAt = useMachinesStore((s) => s.tailscaleReadAt);
  const findTailnet = useMachinesStore((s) => s.findTailnet);
  const usePeer = useMachinesStore((s) => s.usePeer);
  const test = useMachinesStore((s) => s.test);
  const startDraftTest = useMachinesStore((s) => s.startDraftTest);
  const checkAgain = useMachinesStore((s) => s.checkAgain);
  const pickCandidate = useMachinesStore((s) => s.pickCandidate);
  const answerAsk = useMachinesStore((s) => s.answerAsk);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const addMachine = useMachinesStore((s) => s.addMachine);
  const installKey = useMachinesStore((s) => s.installKey);
  const keyInstall = useMachinesStore((s) => s.keyInstall);
  const addressOpen = useMachinesStore((s) => s.addressOpen);
  const advancedOpen = useMachinesStore((s) => s.advancedOpen);
  const detailsOpen = useMachinesStore((s) => s.detailsOpen);
  const setAddressOpen = useMachinesStore((s) => s.setAddressOpen);
  const setAdvancedOpen = useMachinesStore((s) => s.setAdvancedOpen);
  const setDetailsOpen = useMachinesStore((s) => s.setDetailsOpen);
  const added = useMachinesStore((s) => s.added);
  const prepared = useMachinesStore((s) => s.prepared);
  const preparingId = useMachinesStore((s) => s.preparing);
  const accepting = useMachinesStore((s) => s.accepting);
  const acceptVersion = useMachinesStore((s) => s.acceptVersion);
  const openFolder = useMachinesStore((s) => s.openFolder);
  const agentsByMachine = useMachinesStore((s) => s.agentsByMachine);
  const busy = useMachinesStore((s) => s.busy) === 'add';
  const scan = useSettingsStore((s) => s.scan);

  const [error, setError] = React.useState<string | null>(null);

  // A check started from a saved row belongs to that row and is drawn there.
  const draftTest = test !== null && test.savedId === null ? test : null;
  // The same rule for the install. A row's install carries that row's id, and
  // the machine being added has none yet.
  const draftKeyInstall =
    keyInstall !== null && keyInstall.savedId === null ? keyInstall : null;

  const names = new Map((scan?.agents ?? []).map((a) => [a.id, a.displayName]));
  const addedView = added === null ? undefined : agentsByMachine[added.id];

  return (
    <AddMachineView
      machines={machines}
      form={form}
      tailscale={tailscale}
      tailscaleBusy={tailscaleBusy}
      tailscaleReadAt={tailscaleReadAt}
      test={draftTest}
      keyInstall={draftKeyInstall}
      addressOpen={addressOpen}
      advancedOpen={advancedOpen}
      detailsOpen={detailsOpen}
      added={added}
      addedResult={added === null ? undefined : prepared[added.id]}
      preparing={added !== null && (preparingId === added.id || busy)}
      addedAgents={addedView === undefined ? null : presentAgentNames(addedView, names)}
      accepting={added !== null && accepting === added.id}
      busy={busy}
      error={error}
      onSetForm={setForm}
      onClose={() => {
        setError(null);
        closeAdd();
      }}
      onFindTailnet={() => void findTailnet()}
      onUsePeer={(peer) => {
        setError(null);
        void usePeer(peer).then(setError);
      }}
      onSetAddressOpen={setAddressOpen}
      onSetAdvancedOpen={setAdvancedOpen}
      onSetDetailsOpen={setDetailsOpen}
      onStartTest={() => {
        setError(null);
        void startDraftTest().then(setError);
      }}
      onCheckAgain={() => {
        setError(null);
        void checkAgain().then(setError);
      }}
      onPickCandidate={(path) => {
        setError(null);
        void pickCandidate(path).then(setError);
      }}
      onAnswer={(text) => void answerAsk(text)}
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
      onAcceptVersion={() => {
        if (added === null) return;
        setError(null);
        void acceptVersion(added.id).then(setError);
      }}
      onOpenFolder={() => {
        if (added === null) return;
        setError(null);
        void openFolder(added.id).then(setError);
      }}
      onDone={() => {
        setError(null);
        finishAdd();
      }}
    />
  );
}
