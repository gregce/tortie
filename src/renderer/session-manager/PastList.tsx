/**
 * The Past tab (Phase 293), where a removed session is restored without
 * opening its project first.
 *
 * NOT a table: no headings, no checkboxes, no sort. A removed session has one
 * verb, coming back, and nothing on this tab is ever ended, so there is
 * nothing to select and no column worth comparing.
 *
 * ONE LIST, IN MAIN'S ORDER (the operator's ruling, 2026-09-19, option A).
 * Newest removal first, exactly as `sessions:listRemoved` answers and as
 * today's Past Sessions drew it, so the session removed last is the top row
 * and the one before it is the second, whichever projects they were in. Each
 * row names the FOLDER it ran in, as today's panel did, with the whole folder
 * on hover; its machine is on the name line's badge, not repeated in the small
 * line (the reverify, R1 and R2). Only when the project filter names one
 * project are the rows
 * drawn under that project's heading, the one the Managed grid draws, in the
 * same order. ./view.ts decides which (`visiblePastList`).
 *
 * Each row says BEFORE the click whether Restore continues the conversation
 * or starts fresh (`pastSessionPromise`, Phase 29's honest disclosure). A row
 * whose machine a person removed says what Tortie last knew and when, and its
 * Restore is off with the reason beside it rather than missing. Those two
 * sentences are DIFFERENT, as shipped (`../settings/machines-copy.ts`); the
 * study printed one sentence twice.
 *
 * Every handler hands `row.id` to ./actions.ts, which re-reads the row from
 * `pastSessions` and asks `canRestorePastNow` over the fresh row.
 */

import React from 'react';
import { isOutsideProject } from '../app/session-actions';
import { displayPath } from '../format';
import {
  tombstoneLine,
  tombstoneRestoreRefused
} from '../settings/machines-copy';
import { agentShortLabel } from '../state/agents';
import { pastSessionPromise } from '../state/resume';
import type { SessionSheetState } from '../state/session-manager-slice';
import {
  pastRowSmall,
  RECOVERY_CONTINUES,
  RECOVERY_FRESH,
  removedLabel
} from './copy';
import { exactTime, removedDate } from './format';
import { InlinePanel } from './InlinePanel';
import {
  GroupHeading,
  MoreButton,
  NameButton,
  PrimaryButton,
  rowIsInert
} from './ManagedGrid';
import type { ManageGroup, ManageRow } from './projection';
import type { PastEntry } from './view';

/**
 * The row's small line: the agent, the folder the session ran in as today's
 * panel drew it, and the promise or the tombstone. Under a project's heading
 * the heading says the folder, so it is drawn only when the session ran
 * outside that project, a worktree. The reverify of the operator's ruling
 * found the project's NAME here instead of the folder, which left two
 * projects named alike indistinguishable (./copy.ts's `pastRowSmall`, R1).
 */
function smallOf(row: ManageRow, underHead: boolean): string {
  const { session } = row;
  const folder =
    !underHead || isOutsideProject(session) ? displayPath(session.cwd) : null;
  return pastRowSmall(agentShortLabel(session.agent), folder, promiseOf(row));
}

/** The promise a past row makes, or what Tortie last knew of its machine. */
function promiseOf(row: ManageRow): string {
  const gone = row.session.machineGone;
  if (gone !== undefined) {
    return tombstoneLine(
      gone.label,
      gone.forgottenAt,
      gone.lastSeenAt,
      gone.lastStatus
    );
  }
  return pastSessionPromise(row.session) === 'continues'
    ? RECOVERY_CONTINUES
    : RECOVERY_FRESH;
}

function PastRow({
  row,
  group,
  underHead,
  sheet,
  now
}: {
  row: ManageRow;
  group: ManageGroup;
  /** Drawn under its project's heading, which already names the project. */
  underHead: boolean;
  sheet: SessionSheetState;
  now: number;
}): React.JSX.Element {
  const gone = row.session.machineGone;
  const removedAt = row.session.removedAt;
  const inert = rowIsInert(row, sheet);
  const inline = sheet.inline;
  const open = inline !== null && row.id.length > 0 && inline.id === row.id;
  return (
    <>
      <div
        className={`sm-past-row${open ? ' sm-row-open' : ''}`}
        data-manage-row={row.id}
        // The group this row belongs to, heading or not, for the probe's
        // matrix (build/p293/probe-p293.mjs arm 10).
        data-row-group={row.groupKey}
        data-machine-gone={gone === undefined ? 'no' : 'yes'}
      >
        <div
          className="sm-past-identity"
          // The small line shortens a long folder; the hover says the whole
          // one, so two projects deep in different trees are still told apart.
          title={row.session.cwd}
        >
          <NameButton row={row} small={smallOf(row, underHead)} />
        </div>
        <div
          className="sm-past-state"
          // The day alone cannot tell two removals on one day apart; the hover
          // says the time (the fix round, W2).
          {...(removedAt !== undefined && removedAt > 0
            ? { title: exactTime(removedAt) }
            : {})}
        >
          {removedAt !== undefined && removedAt > 0
            ? removedLabel(removedDate(removedAt, now))
            : null}
        </div>
        {row.id.length > 0 ? (
          <div className="sm-row-actions">
            <PrimaryButton row={row} inert={inert} />
            <MoreButton row={row} inert={inert} />
          </div>
        ) : null}
        {gone !== undefined ? (
          <p className="sm-past-note">{tombstoneRestoreRefused(gone.label)}</p>
        ) : null}
      </div>
      {open ? (
        // A block directly under its row, drawn by the panel itself. Keyed by
        // id AND kind for the reason the grid gives.
        <InlinePanel
          key={`${row.id}:${inline.kind}`}
          row={row}
          inline={inline}
          groupLabel={group.label}
        />
      ) : null}
    </>
  );
}

export function PastList({
  groups,
  list,
  sheet,
  now
}: {
  groups: readonly ManageGroup[];
  /** The single list, in main's order; null when the tab draws `groups`. */
  list: readonly PastEntry[] | null;
  sheet: SessionSheetState;
  now: number;
}): React.JSX.Element {
  if (list !== null) {
    return (
      <div className="sm-past">
        {list.map(({ row, group }) => (
          <PastRow
            key={row.id}
            row={row}
            group={group}
            underHead={false}
            sheet={sheet}
            now={now}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="sm-past">
      {groups.map((group) => (
        <section
          key={group.key}
          className="sm-past-group"
          aria-label={group.label}
        >
          <div
            className="sm-group"
            data-manage-group={group.key}
            data-tab-open={group.tabOpen ? 'yes' : 'no'}
          >
            <GroupHeading group={group} />
          </div>
          {group.rows.map((row) => (
            <PastRow
              key={row.id}
              row={row}
              group={group}
              underHead
              sheet={sheet}
              now={now}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
