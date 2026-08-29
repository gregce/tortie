/**
 * p163-facts.ts, the pure half of the Phase 163 capture harness.
 *
 * Everything here is a function over values, so the arithmetic the harness
 * writes into its JSON is unit tested without an Electron. The harness proper
 * (./p163-capture.ts) does the launching, creating and reading; this file
 * decides how many sessions to make and how the owned process rows fold into
 * the two totals the charter says must never be added together.
 *
 * THE SPLIT, stated once. Rows fall into four groups by the ROLE the
 * ownership walk gave them, never by name:
 *
 *   tortie         the app, its Electron helpers, its tmux clients and its
 *                  short lived probes: everything under the main pid
 *   sessionServer  the private tmux server, which is Tortie's and is not a
 *                  session's, kept on its own line (spec open question six)
 *   sessions       every pane's process and every descendant of it, which is
 *                  the supervised agent workload a plain terminal would hold
 *   strays         orphaned clients and probes an earlier app left behind
 *
 * The RSS sums here are the familiar secondary number and are labelled as
 * such in the field name. Private memory and physical footprint belong to the
 * diagnostics report itself, which is another builder's file.
 */

import type { GmuxProcess, GmuxProcessRole } from '../diagnostics/owned-processes';

/** The group a role belongs to. Exhaustive, so a new role fails to compile. */
export type OwnedGroup = 'tortie' | 'sessionServer' | 'sessions' | 'strays';

const GROUP_OF: Record<GmuxProcessRole, OwnedGroup> = {
  app: 'tortie',
  'app-helper': 'tortie',
  'attach-client': 'tortie',
  // Phase 163 collection added these two roles beside attach-client: the
  // event bus client is under the app, and an ssh helper is Tortie's whether
  // it is a live child or a persisted master launchd now holds.
  'control-client': 'tortie',
  'ssh-helper': 'tortie',
  probe: 'tortie',
  'session-server': 'sessionServer',
  session: 'sessions',
  'session-child': 'sessions',
  'orphan-client': 'strays',
  'orphan-probe': 'strays'
};

export function groupOf(role: GmuxProcessRole): OwnedGroup {
  return GROUP_OF[role];
}

export interface GroupTotal {
  processes: number;
  rssBytes: number;
}

export interface OwnedSummary {
  tortie: GroupTotal;
  sessionServer: GroupTotal;
  sessions: GroupTotal & {
    /** Rows with the `session` role, being one per pane. */
    panes: number;
    /** Distinct session names the walk attributed rows to. */
    named: number;
  };
  strays: GroupTotal;
  /** Every row counted exactly once across the four groups. */
  total: number;
}

const zero = (): GroupTotal => ({ processes: 0, rssBytes: 0 });

export interface SummarizeOptions {
  /**
   * The name of Tortie's own control session, whose pane the walk lists like
   * any other pane. Its shell is Tortie's event bus keepalive and never a
   * person's session, so it folds into `tortie`. Measured on 2026-08-29: on a
   * zero session profile the walk answered one `session` row, and it was this.
   */
  controlSession?: string;
}

/**
 * Fold the ownership walk's rows into the four groups. Each row lands in
 * exactly one group, so `total` equals the row count by construction and the
 * probe asserts that rather than trusting it.
 */
export function summarizeOwned(
  rows: readonly GmuxProcess[],
  options: SummarizeOptions = {}
): OwnedSummary {
  const out: OwnedSummary = {
    tortie: zero(),
    sessionServer: zero(),
    sessions: { ...zero(), panes: 0, named: 0 },
    strays: zero(),
    total: rows.length
  };
  const control = options.controlSession;
  const names = new Set<string>();
  for (const row of rows) {
    const isControl =
      control !== undefined && control !== '' && row.sessionName === control;
    const group = out[isControl ? 'tortie' : groupOf(row.role)];
    group.processes += 1;
    group.rssBytes += row.rssBytes;
    if (isControl) continue;
    if (row.role === 'session') out.sessions.panes += 1;
    if (row.sessionName !== undefined && row.sessionName !== '') {
      names.add(row.sessionName);
    }
  }
  out.sessions.named = names.size;
  return out;
}

/**
 * How many sessions the harness creates on this launch. A warm launch on the
 * same profile and the same scratch server finds the cold launch's sessions
 * alive and reconciled, so it creates only the shortfall, and never a negative
 * number.
 */
export function planCreates(wanted: number, alive: number): number {
  if (!Number.isInteger(wanted) || wanted < 0) return 0;
  if (!Number.isInteger(alive) || alive < 0) return wanted;
  return Math.max(0, wanted - alive);
}

/** The session names the harness owns, zero padded so they sort. */
export function harnessSessionName(index: number): string {
  return `p163-${String(index).padStart(2, '0')}`;
}

export function isHarnessSessionName(name: string): boolean {
  return /^p163-\d{2,}$/.test(name);
}
