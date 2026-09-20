/**
 * The Managed tab's grid (Phase 293).
 *
 * A REAL `<table>`: one `<tbody>` per group, sticky headings, seven columns.
 * A table because a person compares these rows down a column (which is the
 * oldest, which has said the most, which has been quiet longest), and a table
 * is what gives a screen reader the same comparison.
 *
 * Every row is keyed by SESSION ID and every group by its GROUP KEY, never by
 * an index, so a refresh or a push re-renders a row in place and the node that
 * holds the keyboard stays the node that holds it.
 *
 * WHAT THIS FILE NEVER DOES: act on the row it drew. Every handler hands
 * `row.id` to ./actions.ts, which re-reads the row by that id and asks that
 * verb's own gate over the fresh row (SPEC 4.0). And no row stamps
 * `data-session-id`: `focusedSessionRowId()` and `menuPointFor()` read that
 * attribute, and a second bearer behind a modal is how a menu for one session
 * lands on another. The sheet's rows are `data-manage-*` only.
 */

import React, { useLayoutEffect, useRef } from 'react';
import type { OverviewSessionActivity } from '@shared/overview';
import { MachineBadge } from '../app/MachineBadge';
import { displayPath } from '../format';
import { AgentIcon, Codicon } from '../icons';
import { agentShortLabel } from '../state/agents';
import { hasRestoreMaterial, resumeReadiness } from '../state/resume';
import type { SessionSheetState } from '../state/session-manager-slice';
import { useApp } from '../state/store';
import { openDetails, openRowMenu, runPrimary } from './actions';
import {
  ACTIONS_HEADING,
  CHIP_CLOSED,
  CHIP_OPEN,
  COLUMNS,
  CONVERSATION_SAVED,
  createdCell,
  END_SESSION,
  lastMessageCell,
  messagesCell,
  OUTPUT_SAVED,
  remoteActivity,
  RESTORE,
  RESTORING,
  rowActionsLabel,
  selectAllLabel,
  selectRowLabel,
  type ActivityCell,
  type ManageSortKey
} from './copy';
import { InlinePanel } from './InlinePanel';
import { focusChain, nameSelector } from './open';
import type { ManageGroup, ManageRow } from './projection';
import { selectAllState, selectAllWrite } from './view';

/**
 * The folder a group is in, as a person reads it: home-relative on this Mac,
 * and exactly as the other computer states it anywhere else. A group whose
 * machine a person removed carries no machine id, and its path is still that
 * machine's, so it is never rewritten to `~` either.
 */
function groupPathText(group: ManageGroup): string {
  if (group.machineLabel === null) return displayPath(group.path);
  return `${group.path} · ${group.machineLabel}`;
}

/** One group's heading row content, shared with the Past list. */
export function GroupHeading({
  group
}: {
  group: ManageGroup;
}): React.JSX.Element {
  return (
    <div className="sm-group-head">
      <span className="sm-group-name">
        <Codicon name="folder" size="md" />
        <strong>{group.label}</strong>
        <span className="sm-group-count">{group.rows.length}</span>
        <span
          className={`sm-chip ${group.tabOpen ? 'sm-chip-open' : 'sm-chip-closed'}`}
        >
          {group.tabOpen ? CHIP_OPEN : CHIP_CLOSED}
        </span>
      </span>
      <span className="sm-group-path" title={group.path}>
        {groupPathText(group)}
      </span>
    </div>
  );
}

/** One cell's main line and its small word, as ./copy.ts decided them. */
export function CellView({ cell }: { cell: ActivityCell }): React.JSX.Element {
  return (
    <>
      <span
        className="sm-cell-main"
        {...(cell.title !== null ? { title: cell.title } : {})}
        {...(cell.busy ? { 'aria-busy': 'true' as const } : {})}
      >
        {cell.main}
      </span>
      {cell.small !== null ? <small>{cell.small}</small> : null}
    </>
  );
}

/**
 * The activity a row's two cells are drawn from. A session on another machine
 * never waits for main: its history is not on this Mac, so it is handed its
 * settled answer at once and draws its final dash on the first frame.
 */
function activityOf(row: ManageRow): OverviewSessionActivity | null {
  return row.gates.remote ? remoteActivity(row.id) : row.activity;
}

/**
 * The small word under an ended LOCAL row's state. A row on another machine
 * draws none, because the projection carries neither its resume argv nor its
 * capture and the renderer cannot know which is true. An exited row with
 * nothing saved draws none either: `Output saved` would be false there, and
 * its Restore button already says why it is off.
 */
function endedSmall(row: ManageRow): string | null {
  if (!row.gates.ended || row.gates.remote) return null;
  if (resumeReadiness(row.session) === 'conversation') return CONVERSATION_SAVED;
  if (row.status === 'restorable' || hasRestoreMaterial(row.session)) {
    return OUTPUT_SAVED;
  }
  return null;
}

/**
 * The ONE visible button. It can change verb under a finger: a row that ends
 * by itself flips `End session…` to `Restore` in place, and an Enter meant for
 * End would restore. So when the verb changes while this button holds the
 * keyboard, the keyboard moves to the row's name in the same commit, and a
 * click hands `runPrimary` the verb it was DRAWN with, which asks that verb's
 * own gate over the fresh row (Phase 293, SPEC 4.0; p293-drawn-verb.test.tsx).
 */
export function PrimaryButton({
  row,
  inert
}: {
  row: ManageRow;
  inert: boolean;
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement | null>(null);
  const verb = row.primary.verb;
  const was = useRef(verb);
  useLayoutEffect(() => {
    if (was.current === verb) return;
    was.current = verb;
    if (ref.current !== null && document.activeElement === ref.current) {
      focusChain([nameSelector(row.id)]);
    }
  }, [verb, row.id]);
  const primary = row.primary;
  const title = primary.title ?? undefined;
  if (primary.verb === 'end') {
    return (
      <button
        ref={ref}
        type="button"
        className="btn btn-secondary btn-sm sm-end"
        data-manage-primary={row.id}
        data-verb="end"
        disabled={!primary.enabled || inert}
        {...(title !== undefined ? { title } : {})}
        onClick={() => runPrimary(row.id, row.tab, 'end')}
      >
        <Codicon name="close" size="sm" />
        {END_SESSION}
      </button>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      className={`btn btn-secondary btn-sm sm-restore${row.tab === 'past' ? ' past-restore' : ''}`}
      data-manage-primary={row.id}
      data-verb="restore"
      disabled={!primary.enabled || primary.busy || inert}
      {...(title !== undefined ? { title } : {})}
      onClick={() => runPrimary(row.id, row.tab, 'restore')}
    >
      <Codicon name="history" size="sm" />
      {primary.busy ? RESTORING : RESTORE}
    </button>
  );
}

/** The ellipsis. Its menu is NATIVE, through ./actions.ts and `ui:popupMenu`. */
export function MoreButton({
  row,
  inert
}: {
  row: ManageRow;
  inert: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="sm-icon-btn"
      data-manage-more={row.id}
      aria-haspopup="menu"
      aria-label={rowActionsLabel(row.session.name)}
      disabled={inert}
      onClick={(e) => openRowMenu(row, e.currentTarget.getBoundingClientRect())}
    >
      <Codicon name="ellipsis" size="md" />
    </button>
  );
}

/** The name button: the agent's mark, the name, the machine, the agent. */
export function NameButton({
  row,
  small
}: {
  row: ManageRow;
  small: string;
}): React.JSX.Element {
  const { session } = row;
  return (
    <button
      type="button"
      className="sm-name"
      data-manage-name={row.id}
      disabled={row.id.length === 0}
      onClick={() => openDetails(row.id, row.tab)}
    >
      <AgentIcon agent={session.agent} size={19} className="sm-agent" />
      <span className="sm-name-text">
        <span className="sm-name-line">
          <strong>{session.name}</strong>
          <MachineBadge machine={session.machine} className="sm-machine" />
        </span>
        <small>{small}</small>
      </span>
    </button>
  );
}

/** Whether a row accepts no press at all: restoring, its verb busy, or a batch running. */
export function rowIsInert(
  row: ManageRow,
  sheet: Pick<SessionSheetState, 'inline' | 'batch'>
): boolean {
  if (sheet.batch?.phase === 'running') return true;
  // Restoring, whatever the row's verb reads: a restore that has not answered
  // yet can already read live, and End on it would race its own restore.
  if (row.restoring) return true;
  if (row.primary.verb === 'restore' && row.primary.busy) return true;
  return sheet.inline?.busy === true && sheet.inline.id === row.id;
}

function ManagedRow({
  row,
  group,
  checked,
  open,
  inert,
  now
}: {
  row: ManageRow;
  group: ManageGroup;
  checked: boolean;
  /** Its expansion is open under it. */
  open: boolean;
  inert: boolean;
  now: number;
}): React.JSX.Element {
  const { session, visual } = row;
  const hasId = row.id.length > 0;
  const activity = activityOf(row);
  const created = createdCell(session.createdAt, now);
  const messages = messagesCell(activity, session.agent, row.gates.remote);
  const last = lastMessageCell(activity, session.agent, now);
  const small = endedSmall(row);
  return (
    <tr
      className={`sm-row${checked ? ' checked' : ''}${open ? ' sm-row-open' : ''}`}
      data-manage-row={row.id}
      data-status={row.status}
    >
      <td className="sm-col-select">
        {hasId ? (
          <label className="sm-check">
            <input
              type="checkbox"
              data-manage-check={row.id}
              aria-label={selectRowLabel(session.name, group.label)}
              checked={checked}
              disabled={inert}
              onChange={(e) =>
                useApp
                  .getState()
                  .setSessionSheetChecked([row.id], e.currentTarget.checked)
              }
            />
          </label>
        ) : null}
      </td>
      <td className="sm-col-session">
        <NameButton row={row} small={agentShortLabel(session.agent)} />
      </td>
      <td className="sm-col-state">
        <span className="sm-state">
          <span className={`dot dot-${visual.dot}`} aria-hidden="true" />
          <span className="sm-state-label" data-dot={visual.dot}>
            {visual.label}
          </span>
        </span>
        {small !== null ? <small>{small}</small> : null}
      </td>
      <td className="sm-col-created">
        <CellView cell={created} />
      </td>
      <td className="sm-col-messages">
        <CellView cell={messages} />
      </td>
      <td className="sm-col-last">
        <CellView cell={last} />
      </td>
      <td className="sm-col-actions">
        {hasId ? (
          <div className="sm-row-actions">
            <PrimaryButton row={row} inert={inert} />
            <MoreButton row={row} inert={inert} />
          </div>
        ) : null}
      </td>
    </tr>
  );
}

/** The sort glyph: unsorted, ascending, descending. */
function sortGlyph(
  key: ManageSortKey,
  sort: SessionSheetState['sort']
): { glyph: string; aria: 'ascending' | 'descending' | 'none' } {
  if (sort === null || sort.key !== key) return { glyph: 'unfold', aria: 'none' };
  return sort.dir === 1
    ? { glyph: 'arrow-up', aria: 'ascending' }
    : { glyph: 'arrow-down', aria: 'descending' };
}

/**
 * First click ascending, a second click on the same column flips it. The
 * button keeps its node across the re-render, so the keyboard stays on it.
 */
function nextSort(
  key: ManageSortKey,
  sort: SessionSheetState['sort']
): NonNullable<SessionSheetState['sort']> {
  if (sort !== null && sort.key === key) {
    return { key, dir: sort.dir === 1 ? -1 : 1 };
  }
  return { key, dir: 1 };
}

/**
 * The header checkbox. A click with NOTHING checked checks every visible row,
 * by id; a click with anything checked, some or all, CLEARS, because an
 * indeterminate click that selected everything would widen a batch a person
 * had narrowed by hand.
 */
function SelectAll({
  visibleIds,
  checked,
  disabled
}: {
  visibleIds: readonly string[];
  checked: Record<string, true>;
  disabled: boolean;
}): React.JSX.Element {
  const ref = useRef<HTMLInputElement | null>(null);
  const state = selectAllState(visibleIds, checked);
  useLayoutEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <label className="sm-check">
      <input
        ref={ref}
        id="sm-select-all"
        type="checkbox"
        aria-label={selectAllLabel(visibleIds.length)}
        checked={state === 'all'}
        disabled={disabled || visibleIds.length === 0}
        onChange={() => {
          const s = useApp.getState();
          const sheet = s.sessionSheet;
          if (sheet === null) return;
          const write = selectAllWrite(visibleIds, sheet.checked);
          if (write.on) s.setSessionSheetChecked(write.ids, true);
          else s.clearSessionSheetChecked();
        }}
      />
    </label>
  );
}

export function ManagedGrid({
  groups,
  visibleIds,
  sheet,
  now
}: {
  groups: readonly ManageGroup[];
  visibleIds: readonly string[];
  sheet: SessionSheetState;
  now: number;
}): React.JSX.Element {
  const batchRunning = sheet.batch?.phase === 'running';
  const inline = sheet.inline;
  return (
    <table className="sm-grid">
      <thead>
        <tr>
          <th className="sm-col-select" scope="col">
            <SelectAll
              visibleIds={visibleIds}
              checked={sheet.checked}
              disabled={batchRunning}
            />
          </th>
          {COLUMNS.map((column) => {
            const { glyph, aria } = sortGlyph(column.key, sheet.sort);
            return (
              <th key={column.key} scope="col" aria-sort={aria}>
                <button
                  type="button"
                  className="sm-sort"
                  data-sort={column.key}
                  title={column.title}
                  onClick={() =>
                    useApp
                      .getState()
                      .patchSessionSheet({ sort: nextSort(column.key, sheet.sort) })
                  }
                >
                  {column.label}
                  <Codicon name={glyph} size="sm" />
                </button>
              </th>
            );
          })}
          <th className="sm-col-actions" scope="col">
            <span className="sr-only">{ACTIONS_HEADING}</span>
          </th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.key}>
          <tr
            className="sm-group"
            data-manage-group={group.key}
            data-tab-open={group.tabOpen ? 'yes' : 'no'}
          >
            <th colSpan={7} scope="rowgroup">
              <GroupHeading group={group} />
            </th>
          </tr>
          {group.rows.map((row) => {
            const open =
              inline !== null && row.id.length > 0 && inline.id === row.id;
            return (
              <React.Fragment key={row.id}>
                <ManagedRow
                  row={row}
                  group={group}
                  checked={sheet.checked[row.id] === true}
                  open={open}
                  inert={rowIsInert(row, sheet)}
                  now={now}
                />
                {open ? (
                  // The panel draws its own `tr.sm-inline-row` spanning the
                  // seven columns. Keyed by id AND kind, so a panel that
                  // changes kind remounts and a held key never lands on the
                  // button that replaced the one it was pressed on.
                  <InlinePanel
                    key={`${row.id}:${inline.kind}`}
                    row={row}
                    inline={inline}
                    groupLabel={group.label}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
