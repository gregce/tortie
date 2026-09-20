/**
 * Every sentence the session manager says (Phase 293).
 *
 * ONE FILE, BECAUSE A SECOND WORDING IS A SECOND POLICY. The sheet, its inline
 * panels, the batch panel and the verbs behind them all read their words from
 * here, so the vocabulary audit reads one file and a later round cannot type a
 * sentence straight into a component. Where Tortie already says something, the
 * shipped words win over the study's: `unreachable` and not `Unavailable` for a
 * session Tortie cannot see, `Rename` and not `Rename…`, the End and Remove
 * confirmations from `../state/resume.ts` byte for byte. This file holds only
 * what the sheet says that nothing said before.
 *
 * THE TWO RULES THE CELLS BELOW KEEP, and both were defects in the first pass
 * of this phase's spec:
 *
 *  1. NULL IS NEVER DRAWN AS ZERO. A count is a digit only where main read a
 *     record and answered a number. Everything else is a dash and a word. This
 *     file adds two counts together in exactly one place, behind a check that
 *     both are numbers, and it defaults a missing count to nothing at all.
 *  2. ONE CLOCK IS NEVER DRAWN AS ANOTHER. Two agents record no time on a
 *     reply. For those the age drawn is a prompt's time or the record's own,
 *     and the small word and the hover title say which, so `Agent reply` never
 *     sits over a time the reply did not have.
 *
 * Nothing here reads the store, the DOM or the clock. Every function is pure,
 * and the clock is an argument.
 */

import type {
  OverviewActivityClock,
  OverviewSessionActivity
} from '@shared/overview';
import type {
  BatchRowOutcome,
  SessionSheetRetry,
  SessionSheetState
} from '../state/session-manager-slice';
import { ageTwoUnits, dayLabel, exactTime } from './format';

// ---------------------------------------------------------------------------
// The title bar
// ---------------------------------------------------------------------------

export const SHEET_ARIA_LABEL = 'Session manager';
export const SHEET_TITLE = 'Sessions';
export const SHEET_TITLE_HOVER = 'Sessions across every project and machine';
export const TABLIST_LABEL = 'Session lifecycle';
export const TAB_MANAGED = 'Managed';
export const TAB_PAST = 'Past Sessions';
export const REFRESH_LABEL = 'Refresh session list';
export const CLOSE_LABEL = 'Close session manager';

// ---------------------------------------------------------------------------
// The toolbar
// ---------------------------------------------------------------------------

export const SEARCH_PLACEHOLDER = 'Search sessions or projects';
export const FILTER_PROJECT_LABEL = 'Filter by project';
export const ALL_PROJECTS = 'All projects';
export const FILTER_TAB_LABEL = 'Filter by open or closed project';
export const FILTER_STATE_LABEL = 'Filter by session state';

export const TAB_FILTER_OPTIONS: readonly {
  value: SessionSheetState['tabFilter'];
  label: string;
}[] = [
  { value: 'all', label: 'All project tabs' },
  { value: 'closed', label: 'Tab closed' },
  { value: 'open', label: 'Tab open' }
];

/**
 * The state filter's seven options. `Running` is three statuses and `Working`
 * is one of them; which statuses each keeps is ./view.ts's table, not this
 * one, because a label is not a rule. `Unreachable` is the shipped word for a
 * session Tortie cannot see (`../app/status.ts`); the study's `Unavailable` is
 * kept only as the Messages word for a history that is not on this Mac.
 */
export const STATE_FILTER_OPTIONS: readonly {
  value: SessionSheetState['stateFilter'];
  label: string;
}[] = [
  { value: 'all', label: 'All states' },
  { value: 'running', label: 'Running' },
  { value: 'working', label: 'Working' },
  { value: 'needs-input', label: 'Needs input' },
  { value: 'idle', label: 'Idle' },
  { value: 'ended', label: 'Ended' },
  { value: 'unreachable', label: 'Unreachable' }
];

/** One project option: the label, then the machine, then the closed tab. */
export function projectOptionLabel(
  label: string,
  machineLabel: string | null,
  tabOpen: boolean,
  /**
   * The folder, passed ONLY when another project on the list draws the same
   * label and machine (the reverify, R3): two folders named `app` made two
   * identical options. Null otherwise, because the folder on every row would
   * be a path in a list of names.
   */
  folder: string | null = null
): string {
  const machine = machineLabel === null ? '' : ` · ${machineLabel}`;
  const where = folder === null ? '' : ` · ${folder}`;
  return `${label}${machine}${where}${tabOpen ? '' : ' · tab closed'}`;
}

export const CLEAR_SELECTION_LABEL = 'Clear selection';
export const END_SELECTED = 'End selected sessions…';

export function selectedCount(n: number): string {
  return `${String(n)} selected`;
}

/** `<e> running`, plus the rest of the selection when there is any. */
export function selectionSummary(running: number, rest: number): string {
  const head = `${String(running)} running`;
  return rest > 0 ? `${head} · ${String(rest)} ended or unreachable` : head;
}

// ---------------------------------------------------------------------------
// The Managed grid
// ---------------------------------------------------------------------------

export type ManageSortKey = NonNullable<SessionSheetState['sort']>['key'];

/**
 * The five sortable headings, in drawn order. The explanation a person might
 * want lives in the hover title and nowhere on the resting face. The Messages
 * title says `in the current conversation` because the count restarts when an
 * agent starts a new record file, and a row can read `8d old` beside `2`.
 */
export const COLUMNS: readonly {
  key: ManageSortKey;
  label: string;
  title: string;
}[] = [
  { key: 'name', label: 'Session', title: 'Session' },
  { key: 'state', label: 'State', title: 'State' },
  {
    key: 'created',
    label: 'Created',
    title:
      'When the session was first created, not when its project tab was last opened.'
  },
  {
    key: 'messages',
    label: 'Messages',
    title:
      'User messages plus agent replies in the current conversation. Tool events and shell output excluded.'
  },
  {
    key: 'last-message',
    label: 'Last message',
    title:
      'Time since the most recent recorded user or agent message. Not the last time the process was seen alive.'
  }
];

export const ACTIONS_HEADING = 'Actions';

export function selectAllLabel(n: number): string {
  return `Select all ${String(n)} visible sessions`;
}

export function selectRowLabel(name: string, groupLabel: string): string {
  return `Select ${name} in ${groupLabel}`;
}

export function rowActionsLabel(name: string): string {
  return `Actions for ${name}`;
}

export const END_SESSION = 'End session…';
export const RESTORE = 'Restore';
export const RESTORING = 'Restoring…';
export const CONVERSATION_SAVED = 'Conversation saved';
export const OUTPUT_SAVED = 'Output saved';
export const CHIP_OPEN = 'Open tab';
export const CHIP_CLOSED = 'Tab closed';
export const DASH = '—';
export const PENDING = '…';

/**
 * Why `End session…` is off on a row Tortie cannot see. The study says the
 * MACHINE is unreachable, which is false for a session on this Mac whose
 * session host stopped answering, so the sentence names the session.
 */
export const END_UNREACHABLE_TITLE =
  'Tortie cannot see whether this session is running, so it cannot end it.';

/** Why `Restore` is off on an ended row that saved nothing. */
export const NOTHING_TO_RESTORE_TITLE =
  'Nothing was saved for this session, so there is nothing to restore.';

export function createdOld(age: string): string {
  return `${age} old`;
}

/**
 * A status label with its first letter raised.
 *
 * The grid raises it in CSS, so the text a probe reads stays `statusVisual`'s
 * own. This is for the places CSS cannot reach one word of a longer line: the
 * batch panel's `<group> · <State>`, and the state column's sort key.
 */
export function raisedLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---------------------------------------------------------------------------
// The cells
// ---------------------------------------------------------------------------

/** What one grid cell draws. `small` and `title` are absent as null. */
export interface ActivityCell {
  main: string;
  small: string | null;
  title: string | null;
  busy: boolean;
}

function dashCell(small: string | null): ActivityCell {
  return { main: DASH, small, title: null, busy: false };
}

const PENDING_CELL: ActivityCell = {
  main: PENDING,
  small: null,
  title: null,
  busy: true
};

const SHELL_WORD = 'Shell';
const UNAVAILABLE_WORD = 'Unavailable';
const NOT_RECORDED_WORD = 'Not recorded';
const NOT_APPLICABLE_WORD = 'Not applicable';
const NO_MESSAGES_WORD = 'No messages yet';
const PARTIAL_WORD = 'Partial history';
const NO_REPLIES_WORD = 'Replies not recorded';
const YOUR_PROMPT_WORD = 'Your prompt';
const AGENT_REPLY_WORD = 'Agent reply';
const SESSION_UPDATED_WORD = 'Session updated';

/** What follows the moment when the age drawn is the PROMPT's time. */
const ASK_CLOCK_NOTE =
  'Time of your last prompt. This agent records no reply time.';
/** What follows the moment when the age drawn is the record's own time. */
const SESSION_CLOCK_NOTE = 'This agent records no time per message.';

/**
 * The Created cell. A `createdAt` that is not above 0 is a dash with no small
 * and no title, and it never reaches `dayLabel`: a feed-only row on another
 * machine reads 0 when the far side's field is unreadable, and `Dec 31, 1969`
 * beside `20,000d old` would be a lie about that row.
 */
export function createdCell(createdAt: number, now: number): ActivityCell {
  if (!(createdAt > 0)) return dashCell(null);
  return {
    main: dayLabel(createdAt, now),
    small: createdOld(ageTwoUnits(createdAt, now)),
    title: exactTime(createdAt),
    busy: false
  };
}

/**
 * The answer a row on another machine has before main is asked, and after.
 *
 * Its history is not on this Mac, so there is nothing to wait for. The grid
 * hands this to both cells instead of a null, which is how such a row draws
 * its final dash at once and never the pending mark.
 */
export function remoteActivity(sessionId: string): OverviewSessionActivity {
  return {
    sessionId,
    coverage: 'unavailable',
    reason: 'remote',
    userMessages: null,
    agentMessages: null,
    lastMessageAt: null,
    lastMessageBy: null,
    lastMessageClock: null,
    readAt: null
  };
}

/** The two counts, where a record was read. Null when neither may be drawn. */
function countsOf(
  activity: OverviewSessionActivity
): { user: number; agent: number | null } | null {
  if (activity.coverage !== 'complete' && activity.coverage !== 'partial') {
    return null;
  }
  const user = activity.userMessages;
  // The contract says this is a number here. An answer that breaks it is
  // drawn as not recorded. It is never defaulted to a digit.
  if (typeof user !== 'number') return null;
  const agent = activity.agentMessages;
  return { user, agent: typeof agent === 'number' ? agent : null };
}

/** The word under a Messages dash, decided from the answer alone. */
function noCountWord(activity: OverviewSessionActivity): string {
  if (activity.coverage === 'not-applicable') return SHELL_WORD;
  if (
    activity.coverage === 'unavailable' &&
    (activity.reason === 'remote' || activity.reason === 'unknown-session')
  ) {
    return UNAVAILABLE_WORD;
  }
  return NOT_RECORDED_WORD;
}

/**
 * The Messages cell, SPEC 3.4's first table.
 *
 * A shell and a session on another machine are decided from `agent` and
 * `remote`, without the answer, so neither ever draws the pending mark.
 */
export function messagesCell(
  activity: OverviewSessionActivity | null,
  agent: string,
  remote: boolean
): ActivityCell {
  if (agent === 'shell') return dashCell(SHELL_WORD);
  if (remote) return dashCell(UNAVAILABLE_WORD);
  if (activity === null) return PENDING_CELL;
  const counts = countsOf(activity);
  if (counts === null) return dashCell(noCountWord(activity));
  const { user, agent: replies } = counts;
  if (replies === null) {
    return {
      main: `${user.toLocaleString()}+`,
      small: NO_REPLIES_WORD,
      title: 'This agent’s record keeps your messages and not its replies.',
      busy: false
    };
  }
  const total = sumOf(user, replies);
  if (activity.coverage === 'partial') {
    return {
      main: `${total.toLocaleString()}+`,
      small: PARTIAL_WORD,
      title: 'Only the available history is counted.',
      busy: false
    };
  }
  return {
    main: total.toLocaleString(),
    small: `${String(user)} you · ${String(replies)} agent`,
    title: `${String(user)} user messages + ${String(replies)} agent replies. Tool events excluded.`,
    busy: false
  };
}

/** The one addition in this file. Both halves are numbers by its signature. */
function sumOf(user: number, agent: number): number {
  return user + agent;
}

/** The small word and the explaining sentence for one clock. */
function clockWords(
  clock: OverviewActivityClock,
  by: 'you' | 'agent'
): { small: string; note: string | null } {
  switch (clock) {
    case 'message':
      return {
        small: by === 'you' ? YOUR_PROMPT_WORD : AGENT_REPLY_WORD,
        note: null
      };
    case 'ask':
      // The last turn holds a reply and the agent put no time on it. The reply
      // is still what came last, so it is named; the title says whose time the
      // age is.
      return { small: AGENT_REPLY_WORD, note: ASK_CLOCK_NOTE };
    case 'session':
      return { small: SESSION_UPDATED_WORD, note: SESSION_CLOCK_NOTE };
  }
}

/**
 * What the Last message cell knows, before it is laid out for the grid or for
 * Details: a moment with its words, or a word alone.
 */
type LastMessage =
  | { kind: 'pending' }
  | { kind: 'word'; word: string }
  | { kind: 'time'; at: number; small: string; note: string | null };

function lastMessageOf(
  activity: OverviewSessionActivity | null,
  agent: string
): LastMessage {
  if (agent === 'shell') return { kind: 'word', word: NOT_APPLICABLE_WORD };
  if (activity === null) return { kind: 'pending' };
  if (activity.coverage === 'not-applicable') {
    return { kind: 'word', word: NOT_APPLICABLE_WORD };
  }
  const counts = countsOf(activity);
  if (counts === null) return { kind: 'word', word: NOT_RECORDED_WORD };
  const at = activity.lastMessageAt;
  const clock = activity.lastMessageClock;
  const by = activity.lastMessageBy;
  if (typeof at === 'number') {
    // A time with no clock, or with no author, breaks the contract. Guessing
    // either would draw one clock as another, so it is drawn as not recorded.
    if (clock === null || by === null) {
      return { kind: 'word', word: NOT_RECORDED_WORD };
    }
    return { kind: 'time', at, ...clockWords(clock, by) };
  }
  // No time. Whether anything was said is read from the half, or halves, that
  // are known; a reply count that is not recorded adds nothing to it.
  const known =
    counts.agent === null ? counts.user : sumOf(counts.user, counts.agent);
  return {
    kind: 'word',
    word: known === 0 ? NO_MESSAGES_WORD : NOT_RECORDED_WORD
  };
}

/**
 * The Last message cell, SPEC 3.4's second table. A session on another machine
 * gets the dash a local row with no record gets, and no sentence about being
 * on another machine.
 */
export function lastMessageCell(
  activity: OverviewSessionActivity | null,
  agent: string,
  now: number
): ActivityCell {
  const last = lastMessageOf(activity, agent);
  if (last.kind === 'pending') return PENDING_CELL;
  if (last.kind === 'word') return dashCell(last.word);
  const moment = exactTime(last.at);
  return {
    main: `${ageTwoUnits(last.at, now)} ago`,
    small: last.small,
    title: last.note === null ? moment : `${moment}. ${last.note}`,
    busy: false
  };
}

/**
 * The number the Messages cell draws, for the column's sort, or null where it
 * draws a dash. It is the cell's own reading and not a second one, so a column
 * sorted by Messages is sorted by what a person sees in it: `7+` sorts as 7,
 * and a dash sorts with the other dashes, last (./view.ts).
 */
export function drawnMessageTotal(
  activity: OverviewSessionActivity | null,
  agent: string,
  remote: boolean
): number | null {
  if (agent === 'shell' || remote || activity === null) return null;
  const counts = countsOf(activity);
  if (counts === null) return null;
  return counts.agent === null
    ? counts.user
    : sumOf(counts.user, counts.agent);
}

/**
 * The moment the Last message cell draws an age for, for the column's sort,
 * or null where it draws a dash. Whichever clock it was read from, because the
 * cell draws the age of that clock and says which one it is.
 */
export function drawnLastMessageAt(
  activity: OverviewSessionActivity | null,
  agent: string
): number | null {
  const last = lastMessageOf(activity, agent);
  return last.kind === 'time' ? last.at : null;
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

export const SESSION_DETAILS = 'Session details';
export const GO_TO_SESSION = 'Go to session';

export const DETAILS_FACTS = {
  created: 'Created',
  messages: 'Messages',
  lastMessage: 'Last message',
  project: 'Project',
  recovery: 'Recovery'
} as const;

export const DETAILS_HELP =
  '“Created” is when the session first opened. Message counts cover the current conversation and exclude tool events and terminal output. A + indicates only part of the history is available.';

export const RECOVERY_CONTINUES = 'Continues the conversation';
export const RECOVERY_FRESH = 'Starts fresh';

/**
 * The Messages fact. With both counts, `<total><+> · <u> you / <a> agent`.
 * With the reply count not recorded, the asks and WORDS for the missing half.
 * With no count, the word the grid cell draws under its dash.
 */
export function detailsMessages(
  activity: OverviewSessionActivity | null,
  agent: string,
  remote: boolean
): string {
  if (agent === 'shell') return SHELL_WORD;
  if (remote) return UNAVAILABLE_WORD;
  if (activity === null) return PENDING;
  const counts = countsOf(activity);
  if (counts === null) return noCountWord(activity);
  const { user, agent: replies } = counts;
  if (replies === null) {
    return `${user.toLocaleString()}+ · ${String(user)} you · replies not recorded`;
  }
  const plus = activity.coverage === 'partial' ? '+' : '';
  return `${sumOf(user, replies).toLocaleString()}${plus} · ${String(user)} you / ${String(replies)} agent`;
}

/**
 * The Last message fact: the moment, the grid cell's small word, and, for the
 * two clocks that are not the message's own, the sentence that says so. With
 * no time it is the small word alone, so a shell reads `Not applicable` here
 * exactly as it does in the grid.
 */
export function detailsLastMessage(
  activity: OverviewSessionActivity | null,
  agent: string
): string {
  const last = lastMessageOf(activity, agent);
  if (last.kind === 'pending') return PENDING;
  if (last.kind === 'word') return last.word;
  const head = `${exactTime(last.at)} · ${last.small}`;
  return last.note === null ? head : `${head}. ${last.note}`;
}

// ---------------------------------------------------------------------------
// Inline expansions
// ---------------------------------------------------------------------------

export const INLINE_CLOSE_LABEL = 'Close session action';
export const CANCEL = 'Cancel';
export const CLOSE = 'Close';
export const RETRY = 'Retry';
export const SAVE_NAME = 'Save name';
export const RESTORE_OPEN_CONFIRM = 'Open project and restore';

/** One info toast, when a row changed under a panel or a menu pick. */
export const SESSION_CHANGED = 'This session changed. Nothing was done.';

/** Added under main's own sentence when a restore failed: the row kept its place. */
export const RESTORE_STILL_HERE = 'The saved session is still here.';

/** The straight quotes are the shipped confirmations' own (`End '<name>'?`). */
export function renameLabel(name: string): string {
  return `Rename '${name}'`;
}

export function savedOutputHeading(name: string): string {
  return `Saved output: ${name}`;
}

export function restoreOpenHeading(label: string): string {
  return `Open '${label}' and restore?`;
}

/** The inline ask before a restore opens a closed project's tab. */
export function restoreOpenBody(promise: 'continues' | 'fresh'): string {
  const next =
    promise === 'continues'
      ? 'The conversation continues when you press Enter in its terminal.'
      : 'A fresh shell opens in the same folder.';
  return `This project’s tab is closed. ${next}`;
}

/** The `failed` panel's heading, by the verb that failed. */
export const INLINE_FAILED_HEADING: Record<SessionSheetRetry, string> = {
  end: 'The session couldn’t be ended',
  remove: 'The session couldn’t be removed',
  restore: 'The session couldn’t be restored',
  'restore-bare': 'The session couldn’t be restored',
  restart: 'The session couldn’t be restarted',
  'restart-bare': 'The session couldn’t be restarted'
};

// ---------------------------------------------------------------------------
// Batch End
// ---------------------------------------------------------------------------

function sessionWord(n: number): string {
  return n === 1 ? 'session' : 'sessions';
}

export const BATCH_CANCEL_LABEL = 'Cancel ending selected sessions';
export const BATCH_STOP = 'Stop';
export const BATCH_DONE = 'Done';

/** A target that could not be re-read is never ended. This is its sentence. */
export const BATCH_LIST_FAILED =
  'Tortie could not read the session list, so it did not end this one.';

export function batchHeading(n: number): string {
  return `End ${String(n)} running ${sessionWord(n)}?`;
}

export function batchConfirmLabel(n: number): string {
  return `End ${String(n)} ${sessionWord(n)}`;
}

/**
 * The confirmation's body, composed from the truths the single End already
 * tells and from nothing the renderer cannot know. The study's `Saved output
 * and conversations are kept` is false for a row with no recorded conversation
 * and unknowable for a row on another machine, so it is not said.
 */
export function batchBody(anyRemote: boolean): string {
  const local =
    'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.';
  if (!anyRemote) return local;
  return `${local} For a session on another machine, bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.`;
}

/**
 * The skipped records: a count WITH its reasons, never a list. The empty
 * string when nothing was skipped. `gone` is optional because the count taken
 * when the panel opens has two reasons, and the third appears only when a
 * named id leaves the list while the panel is open.
 */
export function batchSkippedLine(counts: {
  ended: number;
  unreachable: number;
  gone?: number;
}): string {
  const gone = counts.gone === undefined ? 0 : counts.gone;
  const total = counts.ended + counts.unreachable + gone;
  if (total === 0) return '';
  const parts: string[] = [];
  if (counts.ended > 0) parts.push(`${String(counts.ended)} already ended`);
  if (counts.unreachable > 0) {
    parts.push(`${String(counts.unreachable)} unreachable`);
  }
  if (gone > 0) parts.push(`${String(gone)} no longer here`);
  const head =
    total === 1
      ? '1 selected session stays unchanged:'
      : `${String(total)} selected sessions stay unchanged:`;
  return `${head} ${parts.join(', ')}`;
}

export function batchRunningHeading(n: number): string {
  return `Ending ${String(n)} ${sessionWord(n)}…`;
}

export function batchDoneHeading(ended: number, n: number): string {
  return `${String(ended)} of ${String(n)} ${sessionWord(n)} ended`;
}

/** The trailing word on one target. Nothing at all before its turn comes. */
export function batchOutcomeWord(outcome: BatchRowOutcome): string {
  switch (outcome.state) {
    case 'pending':
      return '';
    case 'ending':
      return 'Ending…';
    case 'ended':
      return 'Ended';
    case 'skipped':
      return outcome.reason === 'ended'
        ? 'Already ended'
        : outcome.reason === 'unreachable'
          ? 'Unreachable'
          : 'No longer here';
    case 'failed':
      return `Not ended. ${outcome.message}`;
    case 'not-run':
      return 'Not run';
  }
}

/** The one success toast. The study's `1 sessions ended` is a bug. */
export function batchEndedToast(n: number): string {
  return `${String(n)} ${sessionWord(n)} ended.`;
}

/**
 * The sheet closed while a batch ran. The second sentence is said only when
 * something WAS left not run: when the manager closed during the last target's
 * own call there is no rest, and "The rest were left running" was false
 * (the Phase 293 fix round, the batch attack's P2). `notRun` defaults to the
 * targets that did not end, the one caller's shape before that round.
 */
export function batchClosedToast(
  ended: number,
  n: number,
  notRun: number = n - ended
): string {
  const head = `${String(ended)} of ${String(n)} ${sessionWord(n)} ended.`;
  return notRun > 0
    ? `${head} The rest were left running because the manager closed.`
    : head;
}

/** Where a named target is: its group, and its machine when it has one. */
export function batchWhere(
  groupLabel: string,
  machineLabel: string | null
): string {
  return machineLabel === null ? groupLabel : `${groupLabel} · ${machineLabel}`;
}

/** One target's second span: where it is, then its state as drawn. */
export function batchTargetLine(where: string, stateLabel: string): string {
  return `${where} · ${raisedLabel(stateLabel)}`;
}

// ---------------------------------------------------------------------------
// The footers, the Past tab, and the states that replace the grid
// ---------------------------------------------------------------------------

export function managedFooter(n: number): string {
  return `${String(n)} managed ${sessionWord(n)}`;
}

/** `projects` is null unless the project filter is All. */
export function pastFooter(n: number, projects: number | null): string {
  const head = `${String(n)} ${sessionWord(n)}`;
  if (projects === null) return head;
  return `${head} across ${String(projects)} ${projects === 1 ? 'project' : 'projects'}`;
}

export const PAST_FOOTER_RIGHT = 'Kept for 90 days.';

/**
 * The hover title on `Kept for 90 days.`: the two sentences today's Past
 * Sessions footer carried that the sheet's face does not (the Phase 293 fix
 * round, W8). Behind hover, under "just enough words".
 */
export const PAST_FOOTER_HOVER =
  'Restore one to pick it back up. Capture files stay in each project’s history folder.';

/**
 * The small line under a Past row's name: the agent; the FOLDER the session
 * ran in, `displayPath(cwd)`, exactly as today's Past Sessions drew it; then
 * what Restore will do, or what Tortie last knew of its machine.
 *
 * THE FOLDER AND NEVER THE PROJECT'S NAME (the reverify of the operator's
 * ruling A, 2026-09-19, R1). The first pass at the ruling put the project's
 * LABEL here, and two projects can share a folder name: with `/nr/one/app` and
 * `/nr/two/app` both removed, every row read `Shell · app · Starts fresh` and
 * a person could not tell them apart, where today they read `…/one/app` and
 * `…/two/app`. The machine is not here either: the name line's badge says it
 * (R2), and a machine a person removed is named by the tombstone sentence.
 * Filtered to one project the rows sit under that project's head, which says
 * the folder, so `folder` is null there unless the session ran outside it.
 */
export function pastRowSmall(
  agentLabel: string,
  folder: string | null,
  detail: string
): string {
  return [agentLabel, folder, detail]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(' · ');
}

export function removedLabel(date: string): string {
  return `Removed ${date}`;
}

/** A state that replaces the grid: its codicon, its heading and its body. */
export interface SheetState {
  icon: string;
  heading: string;
  body: string;
}

export const EMPTY_MANAGED: SheetState = {
  icon: 'search',
  heading: 'No sessions to manage',
  body: 'Start a session from the Session menu. Projects don’t need to stay open for sessions to appear here.'
};

export const EMPTY_PAST: SheetState = {
  icon: 'history',
  heading: 'No past sessions yet',
  body: 'Sessions you remove will appear here for 90 days.'
};

export const NO_MATCH_HEADING = 'No matching sessions';
export const NO_MATCH_BODY = 'Try another project or clear your filters.';
export const CLEAR_FILTERS = 'Clear filters';
export const LOADING = 'Loading sessions…';

export const READ_FAILURE: SheetState = {
  icon: 'warning',
  heading: 'Sessions couldn’t be read',
  body: 'Your sessions haven’t changed. Try reading the list again.'
};

export const TRY_AGAIN = 'Try again';
