/**
 * Past Sessions (Phase 29, research 39 §10), the way back after Remove.
 *
 * Remove writes a tombstone now instead of deleting the manifest row, and
 * this panel is the WHOLE surface over those rows. One Session-menu item
 * opens it, a search field narrows it, and Restore on a row runs the same
 * Phase 26.3 machinery every other restore uses. There is no badge, no
 * count, no reopen shortcut and no Delete Forever verb. Those absences are
 * refusals recorded in the research, not gaps.
 *
 * Each row says BEFORE the click whether Restore continues the conversation
 * or starts fresh (pastSessionPromise in ./resume.ts), because that honest
 * per-row disclosure is the reason design B won the adversarial round. Rows
 * arrive presorted from main, newest removal first by removedAt, and are
 * never re-sorted here.
 *
 * PHASE 72 ADDED A SECOND WAY A ROW GETS HERE. A person can remove a MACHINE,
 * and every session Tortie held a record of on that machine becomes a row in
 * this panel carrying `machineGone`. Such a row says what Tortie last knew and
 * when, and its Restore button is off with the reason beside it rather than
 * missing. The sentences come from src/renderer/settings/machines-copy.ts,
 * beside the removal question they answer, so the two halves of one promise
 * are written in one place and audited by one test.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@shared/types';
import {
  tombstoneLine,
  tombstoneRestoreRefused
} from '../settings/machines-copy';
import { agentShortLabel } from '../state/agents';
import { useApp } from '../state/store';
import { displayPath } from './format';
import { modalKeyDown } from './focus-trap';
import { pastSessionPromise, SHELL_PATH_PENDING_TITLE } from './resume';
import './past-sessions.css';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

/**
 * The row's removal date: "removed Aug 12" within the current year, and
 * "removed Aug 12, 2025" once the year is not this year. Local time, because
 * the user reads it against their own clock. Exported for the unit test.
 */
export function removedDateLabel(
  removedAtMs: number,
  nowMs: number = Date.now()
): string {
  const removed = new Date(removedAtMs);
  const month = MONTHS[removed.getMonth()] ?? '';
  const year = removed.getFullYear();
  const suffix = year === new Date(nowMs).getFullYear() ? '' : `, ${year}`;
  return `removed ${month} ${removed.getDate()}${suffix}`;
}

/**
 * The search rule as one pure function the test can hold: case-folded
 * substring over the session name and the project path. The incoming order
 * (main's, newest removal first) is preserved. Exported for the unit test.
 */
export function filterPastSessions(
  sessions: readonly Session[],
  query: string
): Session[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...sessions];
  return sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.projectPath.toLowerCase().includes(q)
  );
}

export function PastSessionsModal(): React.JSX.Element | null {
  const open = useApp((s) => s.pastOpen);
  const setOpen = useApp((s) => s.setPastOpen);
  const rows = useApp((s) => s.pastSessions);
  const loading = useApp((s) => s.pastLoading);
  const restoringIds = useApp((s) => s.restoringIds);
  const restorePastSession = useApp((s) => s.restorePastSession);
  // Phase 81. A past row restores through the same main-side path, so it takes
  // the same gate. The panel can be opened during the second it is off.
  const shellPathReady = useApp((s) => s.shellPathReady);

  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Reset the search and hand over the keyboard on every open.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const visible = useMemo(() => filterPastSessions(rows, query), [rows, query]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="modal past-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Past Sessions"
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            // Return has no verb here. Restore is a per-row button, and
            // modalKeyDown already lets a focused button run itself.
            submit: () => undefined,
            close: () => setOpen(false)
          })
        }
      >
        <h2 className="modal-title">Past Sessions</h2>

        <input
          ref={searchRef}
          className="input past-search"
          type="text"
          placeholder="Search by name or project"
          aria-label="Search by name or project"
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="past-list" role="list" aria-label="Past sessions">
          {loading ? null : visible.length === 0 ? (
            <div className="past-empty">
              {rows.length === 0
                ? 'Nothing here yet. Sessions you remove are kept here for 90 days.'
                : 'No past sessions match your search.'}
            </div>
          ) : (
            visible.map((session) => {
              const restoring = restoringIds[session.id] === true;
              // PHASE 72. A row whose machine a person removed. Tortie can no
              // longer reach the machine that holds the work, so Restore is
              // off and the row carries the sentence saying so.
              const gone = session.machineGone;
              return (
                <div
                  className="past-row"
                  role="listitem"
                  key={session.id}
                  data-machine-gone={gone === undefined ? undefined : 'yes'}
                >
                  <div className="past-row-main">
                    <div className="past-row-line1">
                      <span className="past-name">{session.name}</span>
                      <span className="past-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="past-agent">
                        {agentShortLabel(session.agent)}
                      </span>
                      <span className="past-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="past-folder">
                        {displayPath(session.cwd)}
                      </span>
                      {session.removedAt !== undefined ? (
                        <>
                          <span className="past-sep" aria-hidden="true">
                            ·
                          </span>
                          <span className="past-date">
                            {removedDateLabel(session.removedAt)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div className="past-promise">
                      {gone === undefined
                        ? pastSessionPromise(session) === 'continues'
                          ? 'Continues the conversation'
                          : 'Starts fresh'
                        : tombstoneLine(
                            gone.label,
                            gone.forgottenAt,
                            gone.lastSeenAt,
                            gone.lastStatus
                          )}
                    </div>
                    {gone === undefined ? null : (
                      /* The same muted voice the promise line uses. A row
                         whose machine is gone is a fact rather than an
                         alarm, and the button beside it is already off. */
                      <div className="past-promise">
                        {tombstoneRestoreRefused(gone.label)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary past-restore"
                    disabled={
                      restoring || gone !== undefined || !shellPathReady
                    }
                    {...(shellPathReady
                      ? {}
                      : { title: SHELL_PATH_PENDING_TITLE })}
                    onClick={() => void restorePastSession(session.id)}
                  >
                    {restoring ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="past-footer">
          Sessions you remove are kept here for 90 days. Restore one to pick
          it back up. Capture files stay in each project&rsquo;s history
          folder.
        </p>
      </div>
    </div>
  );
}
