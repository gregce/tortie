/**
 * Phase 68. One machine, drawn. PHASE 340 made it a name, a status and one
 * button (build/p340/SPEC.md D11 as revised, D12, D17, D20, section 5.2).
 *
 * AT REST, A ROW IS FIVE THINGS: a colour dot, the machine's name, a status
 * chip, one line of facts (its address, its system and its version, each only
 * when it is known in this run) and one button for the next thing. A ⋯ button
 * beside it opens a NATIVE menu, through `ui:popupMenu`, holding Prepare this
 * machine, Test the connection, What Tortie runs there…, Stop trusting this
 * machine and Remove…. Nothing on this row draws a menu in the DOM, and a build
 * with no `popupMenu` gets a ⋯ press that does nothing.
 *
 * The chip and the next step are `machineStatusOf`'s (./machine-status.ts),
 * which reads only what main composed on the row and whether a Prepare for this
 * row is in flight here. The chip's hover is the sentence that explains it.
 *
 * ONE PANEL AT A TIME OPENS UNDER THE ROW, and each is one press away:
 *
 *  - `review`, the agreement: the lines (both labelled lists on a row whose
 *    details changed), main's warning and sealing sentence, any write
 *    paragraph, main's refusal, and Confirm. Confirm CONFIRMS ONLY (D12). A row
 *    reaching Review… is one nobody added in the Add flow, and a separate
 *    Prepare press keeps a second look before anything starts there.
 *  - `what`, What Tortie runs there…: the same lines and sentences, the key
 *    line, an accepted version, the fingerprint of what was confirmed, the
 *    promise that Tortie adopts nothing, Prepare's settings table and the row
 *    id. This supersedes Phase 131's rule that the consent facts stand on the
 *    face of the row; on his design they are one menu pick away (D17).
 *  - `test`, the check, in saved mode, with its key step.
 *  - `remove`, the removal question, unchanged.
 *  - `prepare`, a Prepare answer that is not `prepared`, with Phase 83's
 *    acceptance sheet when the machine named a version nobody measured.
 *
 * PHASE 131'S ONE TRANSITION IS KEPT. A row that moves from confirmed to
 * anything else while Settings is open opens its review panel by itself, once.
 * It sets UI state and starts nothing.
 *
 * WHAT THIS IS NOT. It is not an editor. Nothing here writes a field of the
 * machines file. A person changes a machine in their own editor, or removes
 * it here and adds it again.
 */

import React, { useEffect, useRef } from 'react';
import type { MachinePrepareResult, MachineRowView } from '@shared/ipc';
import { gmuxBridge } from '../bridge';
import { Codicon } from '../icons';
import { ConnectionTestView, Remedy } from './ConnectionTestView';
import {
  machineFactsOf,
  machineStatusOf,
  NEXT_STEP_LABEL,
  type MachineNextStep
} from './machine-status';
import {
  acceptanceStands,
  machineMenuFactsOf,
  machineMenuItems,
  runMachineMenuItem
} from './machine-menu';
import {
  ACCEPTED_VERSION_LABEL,
  ACCEPTED_VERSION_NONE,
  ACCEPTING_VERSION,
  BTN_ACCEPT_VERSION,
  BTN_CLOSE,
  BTN_CONFIRM,
  BTN_CONFIRM_CHANGED,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_KEEP,
  CONFIRMED_LIST_LABEL,
  CURRENT_LIST_LABEL,
  HONESTY_NO_ADOPTION,
  KEY_NOT_MADE_YET,
  keyNamedOnEveryCommand,
  moreLabel,
  PREPARE_EXPLAIN,
  PREPARE_OPTION_DISAGREES,
  PREPARE_PATH_MISSING,
  PREPARE_PATH_READ,
  PREPARE_SETTINGS_LABEL,
  PREPARE_SUPPORTED_LABEL,
  PREPARE_VERSION_LABEL,
  PREPARING,
  removeQuestion,
  ROW_HASH_LABEL
} from './machines-copy';
import { useMachinesStore } from './machines-store';

/**
 * What Prepare answered, drawn.
 *
 * Every sentence here comes from main on the result. This component writes no
 * sentence of its own beyond the labels in machines-copy.ts, so a later edit to
 * this file cannot draw a refusal as a success or an alarm calmly. The Add
 * flow's last step draws it too.
 */
export function PrepareResult({
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

      {/* This refusal says Tortie will not start work on that machine, and a
          refusal stays where a person cannot miss it. */}
      {result.class === 'prepared' && !result.pathCaptured ? (
        <p className="mach-prepare-note">{PREPARE_PATH_MISSING}</p>
      ) : null}

      <Remedy cls={result.class} />
    </div>
  );
}

/**
 * PHASE 83. The sheet a person reads before they accept a version Tortie has
 * not measured.
 *
 * Every line and the warning come from main with the result, and the hash they
 * are bound to goes back unchanged, so this surface can neither compose the
 * sheet nor reword it. Main sends a sheet only for a machine that named a
 * version Tortie has not measured, so the block does not exist otherwise.
 */
export function AcceptVersionSheet({
  result,
  accepting,
  onAccept
}: {
  result: MachinePrepareResult;
  /** True while this row's acceptance and the prepare after it are in flight. */
  accepting: boolean;
  onAccept: () => void;
}): React.JSX.Element | null {
  const sheet =
    result.class === 'version-unmeasured' ? (result.acceptSheet ?? null) : null;
  if (sheet === null) return null;
  return (
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

/** The row's lines, both lists on a row whose details changed. */
function RowLines({ row }: { row: MachineRowView }): React.JSX.Element {
  return row.state === 'changed' ? (
    <>
      <Lines label={CONFIRMED_LIST_LABEL} lines={row.confirmedLines} />
      <Lines label={CURRENT_LIST_LABEL} lines={row.lines} />
    </>
  ) : (
    <Lines label={null} lines={row.lines} />
  );
}

/**
 * The sentences that stand beside the lines at every moment of agreement:
 * main's warning, main's sealing sentence, the write paragraph when the row
 * carries a folder, and main's refusal. All of them arrive from main, so this
 * surface can neither omit them nor reword them.
 */
function AgreementSentences({
  row,
  honesty
}: {
  row: MachineRowView;
  honesty: string | null;
}): React.JSX.Element {
  return (
    <>
      <p className="set-config-warning">{row.warning}</p>
      {honesty === null ? null : <p className="set-config-warning">{honesty}</p>}
      {row.writeHonesty === undefined || row.writeHonesty === null ? null : (
        <p className="set-config-warning" data-machine-write-honesty>
          {row.writeHonesty}
        </p>
      )}
      {row.refusal === null ? null : <p className="mach-refusal">{row.refusal}</p>}
    </>
  );
}

/**
 * The ⋯ press. It asks for the native menu at the button's corner and runs the
 * row a person picked, through the one runner the probe hook also uses. A build
 * whose preload has no `popupMenu` gets nothing at all: there is no DOM menu to
 * fall back to, by the UI rule.
 */
export async function pressMachineMore(
  row: MachineRowView,
  at: { x: number; y: number }
): Promise<void> {
  const host = gmuxBridge();
  if (host === undefined || typeof host.popupMenu !== 'function') return;
  const picked = await host.popupMenu({
    x: Math.round(at.x),
    y: Math.round(at.y),
    items: machineMenuItems(row, machineMenuFactsOf(useMachinesStore.getState(), row.id))
  });
  if (picked === null) return;
  await runMachineMenuItem(picked, row);
}

/** Shuts the panel open under a row. It sets UI state and starts nothing. */
function ClosePanel({ onClose }: { onClose(): void }): React.JSX.Element {
  return (
    <div className="set-config-actions">
      <button
        type="button"
        className="btn btn-secondary"
        data-machines-action="close-panel"
        onClick={onClose}
      >
        {BTN_CLOSE}
      </button>
    </div>
  );
}

/** The button for the row's next step, which each kind presses differently. */
function NextStep({
  row,
  next,
  open,
  disabled,
  onPress
}: {
  row: MachineRowView;
  next: MachineNextStep;
  open: boolean;
  disabled: boolean;
  onPress(): void;
}): React.JSX.Element {
  // A row nobody confirmed opens and shuts its agreement with this button, and
  // it keeps the attribute five setup helpers in older probes press, with the
  // state they read before pressing (D22).
  const lines = next === 'review' && row.state !== 'confirmed';
  const action =
    next === 'prepare'
      ? 'prepare'
      : next === 'open-folder'
        ? 'open-folder'
        : next === 'set-up-sign-in'
          ? 'set-up-sign-in'
          : lines
            ? 'toggle-lines'
            : 'review-version';
  return (
    <button
      type="button"
      className="btn btn-secondary mach-next"
      data-machines-next={next}
      data-machines-action={action}
      {...(lines ? { 'aria-expanded': open } : {})}
      {...(next === 'prepare' ? { title: PREPARE_EXPLAIN } : {})}
      disabled={disabled}
      onClick={onPress}
    >
      {NEXT_STEP_LABEL[next]}
    </button>
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
  const remove = useMachinesStore((s) => s.removeMachine);
  const sendTestInput = useMachinesStore((s) => s.sendTestInput);
  const cancelTest = useMachinesStore((s) => s.cancelTest);
  const checkAgain = useMachinesStore((s) => s.checkAgain);
  const answerAsk = useMachinesStore((s) => s.answerAsk);
  const test = useMachinesStore((s) => s.test);
  const prepare = useMachinesStore((s) => s.prepareMachine);
  const setUpSignIn = useMachinesStore((s) => s.setUpSignIn);
  const openFolder = useMachinesStore((s) => s.openFolder);
  const installKey = useMachinesStore((s) => s.installKey);
  const keyInstall = useMachinesStore((s) => s.keyInstall);
  const acceptVersion = useMachinesStore((s) => s.acceptVersion);
  const detailsOpen = useMachinesStore((s) => s.detailsOpen);
  const setDetailsOpen = useMachinesStore((s) => s.setDetailsOpen);
  const prepared = useMachinesStore((s) => s.prepared[row.id]);
  const preparing = useMachinesStore((s) => s.preparing) === row.id;
  const accepting = useMachinesStore((s) => s.accepting) === row.id;
  const busy = useMachinesStore((s) => s.busy) === row.id;
  const panel = useMachinesStore((s) => s.panels[row.id] ?? null);
  const setPanel = useMachinesStore((s) => s.setPanel);
  const error = useMachinesStore((s) => s.rowErrors[row.id] ?? null);
  const setRowError = useMachinesStore((s) => s.setRowError);

  const liveTest = test !== null && test.savedId === row.id ? test : null;
  // An acceptance runs a Prepare after it, so it reads as one in flight too.
  // A finished check of this row that answered ok makes an older last sign-in
  // that wanted a key stale (the fix round), so the row reads on to Prepare.
  const status = machineStatusOf(row, {
    preparing: preparing || accepting,
    checkedOkAt:
      liveTest !== null && !liveTest.running && liveTest.outcome?.class === 'ok'
        ? (liveTest.endedAt ?? null)
        : null
  });
  const facts = machineFactsOf(row);

  // PHASE 131, kept. A row that STOPS being usable while a person is looking at
  // it opens its agreement, once, on that transition. It is a transition rather
  // than a rule, so a person can shut it again and it stays shut. It sets UI
  // state and starts nothing.
  const wasConfirmed = useRef(row.state === 'confirmed');
  useEffect(() => {
    if (wasConfirmed.current && row.state !== 'confirmed') setPanel(row.id, 'review');
    wasConfirmed.current = row.state === 'confirmed';
  }, [row.state, row.id, setPanel]);

  // An install belongs to one machine. A row draws the one that names it and
  // never the one that names its neighbour.
  const rowKeyInstall =
    keyInstall !== null && keyInstall.savedId === row.id ? keyInstall : null;

  /** Main's sentence under the row when a press was refused. */
  const said = (p: Promise<string | null>): void => {
    void p.then((text) => {
      if (text !== null) setRowError(row.id, text);
    });
  };

  const confirmLabel = row.state === 'changed' ? BTN_CONFIRM_CHANGED : BTN_CONFIRM;

  return (
    <div
      className="mach-row"
      data-machine-id={row.id}
      data-state={row.state}
      data-machine-status={status.chip}
    >
      <div className="mach-head">
        <span className="mach-dot" data-machine-color={row.color} aria-hidden="true" />
        <div className="mach-text">
          <span className="mach-name-line">
            <span className="set-agent-name">{row.label}</span>
            <span
              className={`set-chip mach-chip${status.alarm ? ' alarm' : ''}`}
              data-machine-chip={status.chip}
              title={status.hover}
            >
              {status.word}
            </span>
          </span>
          <span className="mach-facts" data-machine-facts={row.id}>
            {facts.join(' · ')}
          </span>
        </div>
        {status.next === null ? null : (
          <NextStep
            row={row}
            next={status.next}
            open={panel === 'review'}
            disabled={busy || preparing}
            onPress={() => {
              // One press of the next step, and every call it makes is this
              // press's. Nothing else on this row reaches these calls.
              const next = status.next;
              setRowError(row.id, null);
              if (next === 'review') {
                // OPENS, never shuts (the fix round). A row that stops being
                // confirmed opens this panel by itself, and a toggle there made
                // a person's first press of Review… shut it and hide Confirm.
                // The panel has its own Close.
                setPanel(row.id, 'review');
              } else if (next === 'review-version') {
                // Phase 83's acceptance sheet is Prepare's answer, so Review…
                // on a row whose machine named a new version runs Prepare.
                setPanel(row.id, 'prepare');
                said(prepare(row.id));
              } else if (next === 'set-up-sign-in') {
                said(setUpSignIn(row.id));
              } else if (next === 'open-folder') {
                said(openFolder(row.id));
              } else if (next === 'prepare') {
                setPanel(row.id, 'prepare');
                said(prepare(row.id));
              }
            }}
          />
        )}
        <button
          type="button"
          className="icon-btn mach-more-btn"
          data-machines-more={row.id}
          aria-haspopup="true"
          aria-label={moreLabel(row.label)}
          title={moreLabel(row.label)}
          onClick={(e) => {
            const at = e.currentTarget.getBoundingClientRect();
            void pressMachineMore(row, { x: at.left, y: at.bottom });
          }}
        >
          <Codicon name="ellipsis" size="md" />
        </button>
      </div>

      {panel === 'review' && row.state !== 'confirmed' ? (
        <div className="set-config-detail mach-panel" data-machines-panel="review">
          <RowLines row={row} />
          <AgreementSentences row={row} honesty={honesty} />
          <div className="set-config-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              data-machines-action="confirm"
              onClick={() => {
                setRowError(row.id, null);
                said(confirm(row.id));
              }}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              data-machines-action="close-panel"
              onClick={() => setPanel(row.id, null)}
            >
              {BTN_CLOSE}
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'what' ? (
        <div className="set-config-detail mach-panel" data-machines-panel="what">
          <RowLines row={row} />
          <AgreementSentences row={row} honesty={honesty} />
          {/* Which key Tortie signs in with (Phase 84, item 7). THREE STATES:
              a file name, none, and ABSENT, which means main did not answer and
              neither sentence is drawn. */}
          {row.keyFile === undefined ? null : (
            <p className="set-config-caption" data-machine-key-line>
              {row.keyFile === null ? KEY_NOT_MADE_YET : keyNamedOnEveryCommand(row.keyFile)}
            </p>
          )}
          {!acceptanceStands(row.acceptedTmuxVersion) ? null : (
            <div className="mach-prepare-fact" data-machines-accepted={row.id}>
              <span className="mach-prepare-label">{ACCEPTED_VERSION_LABEL}</span>
              <span className="mach-prepare-value" data-machine-accepted-version>
                {row.acceptedTmuxVersion}
              </span>
            </div>
          )}
          <div className="mach-prepare-fact">
            <span className="mach-prepare-label">{ROW_HASH_LABEL}</span>
            <span className="set-config-hash" title={row.hash} data-machine-hash={row.hash}>
              {row.hash.slice(0, 12)}
            </span>
          </div>
          <p className="mach-prepare-explain">{HONESTY_NO_ADOPTION}</p>
          {prepared !== undefined && prepared.class === 'prepared' && prepared.pathCaptured ? (
            <p className="mach-prepare-note">{PREPARE_PATH_READ}</p>
          ) : null}
          {prepared === undefined || prepared.options.length === 0 ? null : (
            <div className="mach-prepare-options">
              <div className="mach-prepare-label">{PREPARE_SETTINGS_LABEL}</div>
              <ul className="set-config-lines">
                {prepared.options.map((option) => (
                  <li
                    key={option.name}
                    data-prepare-option={option.name}
                    data-prepare-agrees={option.agrees ? 'yes' : 'no'}
                  >
                    {option.name} {option.wanted}
                    {option.agrees ? null : (
                      <span className="mach-prepare-disagrees">{PREPARE_OPTION_DISAGREES}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="set-config-id">{row.id}</span>
          <ClosePanel onClose={() => setPanel(row.id, null)} />
        </div>
      ) : null}

      {panel === 'test' && liveTest !== null ? (
        <div className="mach-panel" data-machines-panel="test">
          <ConnectionTestView
            started={liveTest.started}
            transcript={liveTest.transcript}
            outcome={liveTest.outcome}
            running={liveTest.running}
            ask={liveTest.ask ?? null}
            mode="saved"
            label={row.label}
            host={row.host}
            port={row.port}
            detailsOpen={detailsOpen}
            onDetailsToggle={setDetailsOpen}
            onSend={(text) => void sendTestInput(text)}
            onCancel={() => void cancelTest()}
            onAnswer={(text) => void answerAsk(text)}
            onCheckAgain={() => {
              setRowError(row.id, null);
              said(checkAgain());
            }}
            keyInstall={rowKeyInstall}
            onInstallKey={(password) => {
              setRowError(row.id, null);
              said(installKey(password));
            }}
          />
          {liveTest.running ? null : <ClosePanel onClose={() => setPanel(row.id, null)} />}
        </div>
      ) : null}

      {panel === 'remove' ? (
        <div className="mach-remove" data-machines-panel="remove">
          {/* PHASE 72. The question names the sessions Tortie holds a record of
              on that machine, counted. It sends nothing to the machine and it
              ends nothing there. */}
          <span className="mach-remove-question">
            {removeQuestion(row.label, row.sessions ?? 0)}
          </span>
          <button
            type="button"
            className="btn btn-destructive"
            disabled={busy}
            data-machines-action="remove-confirm"
            onClick={() => {
              setPanel(row.id, null);
              said(remove(row.id));
            }}
          >
            {BTN_REMOVE_CONFIRM}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            data-machines-action="remove-keep"
            onClick={() => setPanel(row.id, null)}
          >
            {BTN_REMOVE_KEEP}
          </button>
        </div>
      ) : null}

      {/* While a Prepare for this row runs, the panel says so, even over an
          answer an earlier press left, so a stale refusal is never read as
          what this press concluded. */}
      {panel === 'prepare' && preparing ? (
        <div className="mach-panel mach-check-running" data-machines-panel="preparing">
          <span className="set-spinner" aria-hidden="true" />
          <span className="mach-check-text">{PREPARING}</span>
        </div>
      ) : null}

      {panel === 'prepare' &&
      !preparing &&
      prepared !== undefined &&
      prepared.class !== 'prepared' ? (
        <div className="set-config-detail mach-panel" data-machines-panel="prepare">
          <PrepareResult result={prepared} />
          <AcceptVersionSheet
            result={prepared}
            accepting={accepting}
            onAccept={() => {
              setRowError(row.id, null);
              said(acceptVersion(row.id));
            }}
          />
          <ClosePanel onClose={() => setPanel(row.id, null)} />
        </div>
      ) : null}

      {error !== null ? <div className="set-row-error">{error}</div> : null}
    </div>
  );
}
