/**
 * Phase 293 — the one panel that opens inside the session manager, under its row.
 *
 * Every question the sheet asks and every answer it gives is drawn HERE, under
 * the row it is about, and never as a modal over the sheet: the End and Remove
 * confirmations, the rename field, the saved output, the details, the ask
 * before a closed project's tab is opened, the two bare confirmations and any
 * failure. A second layer over the sheet is a second place the keyboard can
 * fall, and a confirmation drawn away from its row can be read against the
 * wrong one.
 *
 * WHAT THIS FILE DOES NOT DO. It decides no gate and calls no lifecycle verb.
 * Every button hands `./actions.ts` nothing but the press, and that file reads
 * the row again by id and asks the verb's own gate before anything is called.
 * The words are `./copy.ts`'s and the shipped confirmations' own
 * (`endSessionConfirm` and the rest in ../state/resume.ts), byte for byte, so
 * the stacked confirm every other surface raises and this panel cannot say two
 * things.
 *
 * THREE RULES A LATER ROUND COULD BREAK WITHOUT NOTICING:
 *
 *  1. INITIAL FOCUS NEVER GOES TO A DESTRUCTIVE BUTTON. It goes to the rename
 *     field, to a failed panel's Close, or to the panel's close icon.
 *     `ConfirmDialog` does the opposite and this panel does not copy it: a
 *     held Enter that arrives with the panel would otherwise end a session.
 *  2. THE RENAME FIELD IS A PLAIN `.input`, never the shared `RenameInput`.
 *     That input takes focus by itself and commits on blur, and a blur is
 *     exactly what a click on Cancel causes.
 *  3. A BUSY PANEL DISABLES EVERY BUTTON IT HAS. The store marks it busy at
 *     the first press, so a second press, a double click or a repeating Enter
 *     finds nothing to press.
 *
 * The panel's React key is `${id}:${kind}` at the call site (SPEC §2.9), so a
 * panel that changes kind is a NEW panel: its mount effect runs again and a
 * held key never lands on the button that replaced the one it was pressed on.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import type { OverviewSessionActivity } from '@shared/overview';
import type { Session } from '@shared/types';
import { SavedOutputBody } from '../app/SavedOutputBody';
import { baseName } from '../editor/paths';
import { displayPath } from '../format';
import { Codicon } from '../icons';
import {
  bareRestartConfirm,
  bareRestoreConfirm,
  endSessionConfirm,
  pastSessionPromise,
  removeSessionConfirm
} from '../state/resume';
import type {
  SessionSheetInline,
  SessionSheetInlineKind
} from '../state/session-manager-slice';
import { useApp } from '../state/store';
import {
  cancelInline,
  confirmInline,
  retryInline,
  saveRename
} from './actions';
import {
  CANCEL,
  CLOSE,
  DASH,
  DETAILS_FACTS,
  DETAILS_HELP,
  detailsLastMessage,
  detailsMessages,
  INLINE_CLOSE_LABEL,
  INLINE_FAILED_HEADING,
  RECOVERY_CONTINUES,
  RECOVERY_FRESH,
  remoteActivity,
  renameLabel,
  RESTORE_OPEN_CONFIRM,
  RESTORE_STILL_HERE,
  restoreOpenBody,
  restoreOpenHeading,
  RETRY,
  SAVE_NAME,
  savedOutputHeading
} from './copy';
import { exactTime } from './format';
import type { ManageRow } from './projection';
import './session-manager-panels.css';

export interface InlinePanelProps {
  /** The row the panel sits under, as the sheet DRAWS it. Nothing here acts on it. */
  row: ManageRow;
  /** The store's one open panel, which is this row's. */
  inline: SessionSheetInline;
  /**
   * The row's group label, for the ask before a closed project's tab opens.
   * The sheet has it from the projection; without it the panel names the
   * folder the way the projection's last fallback does.
   */
  groupLabel?: string;
}

/** Where the keyboard goes when a panel of this kind appears. Never a destructive button. */
export type PanelFocus = 'input' | 'close-button' | 'close-icon';

/**
 * The first focus, by kind. Exported so the rule is stated over every kind
 * rather than inferred from a render.
 */
export function panelInitialFocus(kind: SessionSheetInlineKind): PanelFocus {
  if (kind === 'rename') return 'input';
  if (kind === 'failed') return 'close-button';
  return 'close-icon';
}

/** The words a confirmation panel shows and the button that acts on them. */
interface ConfirmWords {
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
}

/** The confirmation kinds, with the shipped words each one reads. */
function confirmWords(
  kind: SessionSheetInlineKind,
  session: Session,
  groupLabel: string
): ConfirmWords | null {
  switch (kind) {
    case 'end': {
      const words = endSessionConfirm(session);
      return { ...words, destructive: true };
    }
    case 'remove': {
      const words = removeSessionConfirm(session);
      return { ...words, destructive: true };
    }
    case 'restore-open':
      return {
        title: restoreOpenHeading(groupLabel),
        body: restoreOpenBody(pastSessionPromise(session)),
        confirmLabel: RESTORE_OPEN_CONFIRM,
        destructive: false
      };
    case 'restore-bare': {
      // Not destructive, as shipped: it brings a session back.
      const words = bareRestoreConfirm(session);
      return { ...words, destructive: false };
    }
    case 'restart-bare': {
      const words = bareRestartConfirm(session);
      return { ...words, destructive: false };
    }
    default:
      return null;
  }
}

/** The row's machine label, when it is on another machine or was. */
function machineLabelOf(session: Session): string | null {
  return session.machine?.label ?? session.machineGone?.label ?? null;
}

/** The Details facts, in the order SPEC §2.9 lists them. */
function detailsFacts(
  row: ManageRow,
  session: Session
): { label: string; value: string; title?: string }[] {
  const remote = row.gates.remote;
  // A session on another machine has no history on this Mac, so there is
  // nothing to wait for: its final dash is drawn at once.
  const activity: OverviewSessionActivity | null = remote
    ? remoteActivity(row.id)
    : row.activity;
  const facts: { label: string; value: string; title?: string }[] = [
    {
      label: DETAILS_FACTS.created,
      value: session.createdAt > 0 ? exactTime(session.createdAt) : DASH
    },
    {
      label: DETAILS_FACTS.messages,
      value: detailsMessages(activity, session.agent, remote)
    },
    {
      label: DETAILS_FACTS.lastMessage,
      value: detailsLastMessage(activity, session.agent)
    }
  ];
  const machine = machineLabelOf(session);
  const where = displayPath(session.projectPath, session.machine?.id);
  facts.push({
    label: DETAILS_FACTS.project,
    value: machine === null ? where : `${where} · ${machine}`,
    title: session.projectPath
  });
  if (session.machine === undefined && session.machineGone === undefined) {
    facts.push({
      label: DETAILS_FACTS.recovery,
      value:
        pastSessionPromise(session) === 'continues'
          ? RECOVERY_CONTINUES
          : RECOVERY_FRESH
    });
  } else if (
    session.machine !== undefined &&
    !session.machine.canRestore &&
    session.machine.restoreReason !== null
  ) {
    facts.push({
      label: DETAILS_FACTS.recovery,
      value: session.machine.restoreReason
    });
  }
  return facts;
}

/** The saved output expansion's body, over the store's one saved-output trio. */
function OutputBody({ session }: { session: Session }): React.JSX.Element {
  const output = useApp((s) => s.savedOutput);
  const loading = useApp((s) => s.savedOutputLoading);
  return <SavedOutputBody session={session} output={output} loading={loading} />;
}

/**
 * One expansion. On the Managed tab it is a whole table row directly under
 * its session's row, spanning the seven columns; on the Past tab, which is not
 * a table, it is a block directly under its row.
 */
export function InlinePanel({
  row,
  inline,
  groupLabel
}: InlinePanelProps): React.JSX.Element {
  const panel = <PanelBody row={row} inline={inline} groupLabel={groupLabel} />;
  if (row.tab === 'managed') {
    return (
      <tr
        className="sm-inline-row"
        data-manage-inline={row.id}
        data-kind={inline.kind}
      >
        <td colSpan={7}>{panel}</td>
      </tr>
    );
  }
  return (
    <div
      className="sm-inline-row sm-inline-row-past"
      data-manage-inline={row.id}
      data-kind={inline.kind}
    >
      {panel}
    </div>
  );
}

function PanelBody({
  row,
  inline,
  groupLabel
}: InlinePanelProps): React.JSX.Element {
  const { session } = row;
  const { kind } = inline;
  const busy = inline.busy === true;
  const headingId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeIconRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(session.name);

  // ONCE, on mount: the call site keys the panel by id and kind, so every new
  // kind is a new mount. Scroll it into view and give the keyboard to the one
  // control rule 1 allows.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'nearest' });
    const focus = panelInitialFocus(kind);
    if (focus === 'input') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (focus === 'close-button') {
      closeButtonRef.current?.focus();
    } else {
      closeIconRef.current?.focus();
    }
    // Mount only, by design: see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label =
    groupLabel ?? session.closedProject?.name ?? baseName(session.projectPath);
  const confirm = confirmWords(kind, session, label);
  const trimmed = draft.trim();
  const canSave = !busy && trimmed.length > 0 && trimmed !== session.name;

  let heading: React.ReactNode;
  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (confirm !== null) {
    heading = confirm.title;
    body = <p className="sm-inline-text">{confirm.body}</p>;
    actions = (
      <>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={cancelInline}
        >
          {CANCEL}
        </button>
        <button
          type="button"
          className={`btn ${confirm.destructive ? 'btn-destructive' : 'btn-primary'}`}
          disabled={busy}
          data-sm-confirm={kind}
          onClick={confirmInline}
        >
          {confirm.confirmLabel}
        </button>
      </>
    );
  } else if (kind === 'rename') {
    heading = (
      <label htmlFor={inputId} className="sm-inline-label">
        {renameLabel(session.name)}
      </label>
    );
    body = (
      <input
        id={inputId}
        ref={inputRef}
        className="input sm-rename-input"
        maxLength={120}
        spellCheck={false}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          // An IME's Enter composes a character, and a held Enter repeats. Only
          // a single, finished Enter saves.
          if (e.nativeEvent.isComposing || e.repeat) return;
          e.preventDefault();
          if (canSave) saveRename(row.id, draft);
        }}
      />
    );
    actions = (
      <>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={cancelInline}
        >
          {CANCEL}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSave}
          onClick={() => saveRename(row.id, draft)}
        >
          {SAVE_NAME}
        </button>
      </>
    );
  } else if (kind === 'failed') {
    const retry = inline.retry ?? 'end';
    heading = INLINE_FAILED_HEADING[retry];
    // The failing layer's own sentence, verbatim. A restore that failed kept
    // the row where it was, and says so.
    body = (
      <>
        <p className="sm-inline-text">{inline.message ?? ''}</p>
        {retry === 'restore' || retry === 'restore-bare' ? (
          <p className="sm-inline-text">{RESTORE_STILL_HERE}</p>
        ) : null}
      </>
    );
    actions = (
      <>
        <button
          type="button"
          ref={closeButtonRef}
          className="btn btn-secondary"
          disabled={busy}
          onClick={cancelInline}
        >
          {CLOSE}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={retryInline}
        >
          {RETRY}
        </button>
      </>
    );
  } else if (kind === 'output') {
    heading = savedOutputHeading(session.name);
    body = <OutputBody session={session} />;
  } else {
    heading = session.name;
    body = (
      <>
        <dl className="sm-details-facts">
          {detailsFacts(row, session).map((fact) => (
            <div key={fact.label} className="sm-details-fact">
              <dt>{fact.label}</dt>
              <dd title={fact.title}>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="sm-details-help">{DETAILS_HELP}</p>
      </>
    );
  }

  // The error line: a verb that failed and left its panel open (rename) says
  // why here. A `failed` panel's sentence IS its body.
  const error =
    kind !== 'failed' && inline.message !== undefined ? inline.message : null;

  return (
    <div
      ref={rootRef}
      className="sm-inline"
      role="group"
      aria-labelledby={headingId}
      aria-busy={busy ? 'true' : undefined}
      data-busy={busy ? 'yes' : 'no'}
    >
      <div className="sm-inline-head">
        <div id={headingId} className="sm-inline-title">
          {heading}
        </div>
        <button
          type="button"
          ref={closeIconRef}
          className="icon-btn sm-panel-icon"
          aria-label={INLINE_CLOSE_LABEL}
          disabled={busy}
          onClick={cancelInline}
        >
          <Codicon name="close" size="md" />
        </button>
      </div>
      {body === null ? null : <div className="sm-inline-body">{body}</div>}
      {error === null ? null : (
        <p className="sm-inline-error" role="alert">
          {error}
        </p>
      )}
      {actions === null ? null : (
        <div className="sm-inline-actions">{actions}</div>
      )}
    </div>
  );
}
