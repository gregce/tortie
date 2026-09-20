/**
 * Phase 293. Every sentence the sheet says, byte for byte, and the two cell
 * tables of SPEC 3.4 row by row.
 *
 * What these tests hold:
 *  - the sentences of SPEC section 2 are the ones a person reads, to the
 *    character, plural rules included (`1 session ended.`, never
 *    `1 sessions ended`);
 *  - NULL IS NEVER DRAWN AS ZERO. A count that was not read is a dash and a
 *    word. A gemini row whose replies are not recorded draws `<u>+` and
 *    `Replies not recorded`, never a digit for the missing half;
 *  - ONE CLOCK IS NEVER DRAWN AS ANOTHER. A reply whose agent records no reply
 *    time says whose time it is drawing, in the small word and in the title;
 *  - a shell and a session on another machine never pass through the pending
 *    cell: they are decided without the answer;
 *  - `copy.ts` holds no `?? 0` at all, names no word of the session server's
 *    vocabulary, and no output of any function contains the text `null`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { OverviewSessionActivity } from '@shared/overview';
import * as copy from '../copy';
import { exactTime } from '../format';

const SOURCE = readFileSync(resolve(import.meta.dirname, '../copy.ts'), 'utf8');

const NOW = new Date(2026, 8, 18, 15, 56, 0).getTime();

function activity(
  patch: Partial<OverviewSessionActivity>
): OverviewSessionActivity {
  return {
    sessionId: 's1',
    coverage: 'complete',
    reason: null,
    userMessages: 3,
    agentMessages: 3,
    lastMessageAt: NOW - 3 * 3_600_000,
    lastMessageBy: 'agent',
    lastMessageClock: 'message',
    readAt: NOW,
    ...patch
  };
}

const NONE = {
  userMessages: null,
  agentMessages: null,
  lastMessageAt: null,
  lastMessageBy: null,
  lastMessageClock: null
} as const;

describe('the sentences of SPEC section 2, byte for byte (Phase 293)', () => {
  it('the title bar', () => {
    expect(copy.SHEET_ARIA_LABEL).toBe('Session manager');
    expect(copy.SHEET_TITLE).toBe('Sessions');
    expect(copy.SHEET_TITLE_HOVER).toBe(
      'Sessions across every project and machine'
    );
    expect(copy.TABLIST_LABEL).toBe('Session lifecycle');
    expect(copy.TAB_MANAGED).toBe('Managed');
    expect(copy.TAB_PAST).toBe('Past Sessions');
    expect(copy.REFRESH_LABEL).toBe('Refresh session list');
    expect(copy.CLOSE_LABEL).toBe('Close session manager');
  });

  it('the toolbar, filters mode', () => {
    expect(copy.SEARCH_PLACEHOLDER).toBe('Search sessions or projects');
    expect(copy.FILTER_PROJECT_LABEL).toBe('Filter by project');
    expect(copy.ALL_PROJECTS).toBe('All projects');
    expect(copy.FILTER_TAB_LABEL).toBe('Filter by open or closed project');
    expect(copy.TAB_FILTER_OPTIONS).toEqual([
      { value: 'all', label: 'All project tabs' },
      { value: 'closed', label: 'Tab closed' },
      { value: 'open', label: 'Tab open' }
    ]);
    expect(copy.FILTER_STATE_LABEL).toBe('Filter by session state');
    expect(copy.STATE_FILTER_OPTIONS).toEqual([
      { value: 'all', label: 'All states' },
      { value: 'running', label: 'Running' },
      { value: 'working', label: 'Working' },
      { value: 'needs-input', label: 'Needs input' },
      { value: 'idle', label: 'Idle' },
      { value: 'ended', label: 'Ended' },
      { value: 'unreachable', label: 'Unreachable' }
    ]);
  });

  it('a project option names the machine, then the closed tab', () => {
    expect(copy.projectOptionLabel('gmux', null, true)).toBe('gmux');
    expect(copy.projectOptionLabel('gmux', null, false)).toBe(
      'gmux · tab closed'
    );
    expect(copy.projectOptionLabel('gmux', 'Studio', true)).toBe(
      'gmux · Studio'
    );
    expect(copy.projectOptionLabel('gmux', 'Studio', false)).toBe(
      'gmux · Studio · tab closed'
    );
  });

  it('the toolbar, selection mode', () => {
    expect(copy.CLEAR_SELECTION_LABEL).toBe('Clear selection');
    expect(copy.selectedCount(4)).toBe('4 selected');
    expect(copy.selectionSummary(3, 0)).toBe('3 running');
    expect(copy.selectionSummary(3, 1)).toBe(
      '3 running · 1 ended or unreachable'
    );
    expect(copy.selectionSummary(0, 2)).toBe(
      '0 running · 2 ended or unreachable'
    );
    expect(copy.END_SELECTED).toBe('End selected sessions…');
  });

  it('the seven headings and their hover titles', () => {
    expect(copy.COLUMNS).toEqual([
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
    ]);
    expect(copy.ACTIONS_HEADING).toBe('Actions');
    expect(copy.selectAllLabel(12)).toBe('Select all 12 visible sessions');
    expect(copy.selectRowLabel('fix-auth', 'gmux')).toBe(
      'Select fix-auth in gmux'
    );
    expect(copy.rowActionsLabel('fix-auth')).toBe('Actions for fix-auth');
  });

  it('the row: its button, its small words and its chips', () => {
    expect(copy.END_SESSION).toBe('End session…');
    expect(copy.RESTORE).toBe('Restore');
    expect(copy.RESTORING).toBe('Restoring…');
    expect(copy.CONVERSATION_SAVED).toBe('Conversation saved');
    expect(copy.OUTPUT_SAVED).toBe('Output saved');
    expect(copy.CHIP_OPEN).toBe('Open tab');
    expect(copy.CHIP_CLOSED).toBe('Tab closed');
    expect(copy.createdOld('2d 1h')).toBe('2d 1h old');
    expect(copy.DASH).toBe('—');
    expect(copy.PENDING).toBe('…');
  });

  it('the footers, with their plurals', () => {
    expect(copy.managedFooter(1)).toBe('1 managed session');
    expect(copy.managedFooter(0)).toBe('0 managed sessions');
    expect(copy.managedFooter(14)).toBe('14 managed sessions');
    expect(copy.pastFooter(1, null)).toBe('1 session');
    expect(copy.pastFooter(5, null)).toBe('5 sessions');
    expect(copy.pastFooter(5, 3)).toBe('5 sessions across 3 projects');
    expect(copy.pastFooter(1, 1)).toBe('1 session across 1 project');
    expect(copy.PAST_FOOTER_RIGHT).toBe('Kept for 90 days.');
  });

  it('the Past tab', () => {
    expect(copy.removedLabel('Aug 12')).toBe('Removed Aug 12');
    expect(copy.RECOVERY_CONTINUES).toBe('Continues the conversation');
    expect(copy.RECOVERY_FRESH).toBe('Starts fresh');
    // The small line in the single list names the FOLDER, as today's panel
    // did, and never the project's name: two projects can be named alike (the
    // reverify, R1). Under a project's heading the heading says the folder.
    expect(copy.pastRowSmall('Codex', '~/work/api', 'Starts fresh')).toBe(
      'Codex · ~/work/api · Starts fresh'
    );
    expect(copy.pastRowSmall('Codex', '/srv/api-wt', 'Starts fresh')).toBe(
      'Codex · /srv/api-wt · Starts fresh'
    );
    expect(copy.pastRowSmall('Codex', null, 'Starts fresh')).toBe(
      'Codex · Starts fresh'
    );
    // Two folders with the same last segment read differently, which is the
    // whole point of drawing the path.
    expect(copy.pastRowSmall('Shell', '~/one/app', 'Starts fresh')).not.toBe(
      copy.pastRowSmall('Shell', '~/two/app', 'Starts fresh')
    );
    // The project filter tells two same-named projects apart by their folder,
    // and says nothing extra when no two collide (the reverify, R3).
    expect(copy.projectOptionLabel('app', null, true, '~/one/app')).toBe(
      'app · ~/one/app'
    );
    expect(copy.projectOptionLabel('app', null, false, '~/two/app')).toBe(
      'app · ~/two/app · tab closed'
    );
    expect(copy.projectOptionLabel('app', 'Studio', true, '~/one/app')).toBe(
      'app · Studio · ~/one/app'
    );
  });

  it('the inline expansions', () => {
    expect(copy.INLINE_CLOSE_LABEL).toBe('Close session action');
    expect(copy.renameLabel('fix-auth')).toBe("Rename 'fix-auth'");
    expect(copy.CANCEL).toBe('Cancel');
    expect(copy.SAVE_NAME).toBe('Save name');
    expect(copy.savedOutputHeading('fix-auth')).toBe('Saved output: fix-auth');
    expect(copy.restoreOpenHeading('gmux')).toBe("Open 'gmux' and restore?");
    expect(copy.restoreOpenBody('continues')).toBe(
      'This project’s tab is closed. The conversation continues when you press Enter in its terminal.'
    );
    expect(copy.restoreOpenBody('fresh')).toBe(
      'This project’s tab is closed. A fresh shell opens in the same folder.'
    );
    expect(copy.RESTORE_OPEN_CONFIRM).toBe('Open project and restore');
    expect(copy.INLINE_FAILED_HEADING).toEqual({
      end: 'The session couldn’t be ended',
      remove: 'The session couldn’t be removed',
      restore: 'The session couldn’t be restored',
      'restore-bare': 'The session couldn’t be restored',
      restart: 'The session couldn’t be restarted',
      'restart-bare': 'The session couldn’t be restarted'
    });
    expect(copy.RESTORE_STILL_HERE).toBe('The saved session is still here.');
    expect(copy.CLOSE).toBe('Close');
    expect(copy.RETRY).toBe('Retry');
    expect(copy.SESSION_CHANGED).toBe(
      'This session changed. Nothing was done.'
    );
  });

  it('the sheet-own menu rows and the Details help line', () => {
    expect(copy.SESSION_DETAILS).toBe('Session details');
    expect(copy.GO_TO_SESSION).toBe('Go to session');
    expect(copy.DETAILS_FACTS).toEqual({
      created: 'Created',
      messages: 'Messages',
      lastMessage: 'Last message',
      project: 'Project',
      recovery: 'Recovery'
    });
    expect(copy.DETAILS_HELP).toBe(
      '“Created” is when the session first opened. Message counts cover the current conversation and exclude tool events and terminal output. A + indicates only part of the history is available.'
    );
  });

  it('the two disabled-button titles say why, in one sentence each', () => {
    expect(copy.END_UNREACHABLE_TITLE).toBe(
      'Tortie cannot see whether this session is running, so it cannot end it.'
    );
    expect(copy.NOTHING_TO_RESTORE_TITLE).toBe(
      'Nothing was saved for this session, so there is nothing to restore.'
    );
  });

  it('the five states that replace the grid', () => {
    expect(copy.EMPTY_MANAGED).toEqual({
      icon: 'search',
      heading: 'No sessions to manage',
      body: 'Start a session from the Session menu. Projects don’t need to stay open for sessions to appear here.'
    });
    expect(copy.EMPTY_PAST).toEqual({
      icon: 'history',
      heading: 'No past sessions yet',
      body: 'Sessions you remove will appear here for 90 days.'
    });
    expect(copy.NO_MATCH_HEADING).toBe('No matching sessions');
    expect(copy.NO_MATCH_BODY).toBe(
      'Try another project or clear your filters.'
    );
    expect(copy.CLEAR_FILTERS).toBe('Clear filters');
    expect(copy.LOADING).toBe('Loading sessions…');
    expect(copy.READ_FAILURE).toEqual({
      icon: 'warning',
      heading: 'Sessions couldn’t be read',
      body: 'Your sessions haven’t changed. Try reading the list again.'
    });
    expect(copy.TRY_AGAIN).toBe('Try again');
  });
});

describe('batch End, its words and its plurals (Phase 293, SPEC 2.10)', () => {
  it('the heading and the confirm label count the named ids still eligible', () => {
    expect(copy.batchHeading(1)).toBe('End 1 running session?');
    expect(copy.batchHeading(3)).toBe('End 3 running sessions?');
    expect(copy.batchHeading(0)).toBe('End 0 running sessions?');
    expect(copy.batchConfirmLabel(1)).toBe('End 1 session');
    expect(copy.batchConfirmLabel(3)).toBe('End 3 sessions');
    expect(copy.BATCH_CANCEL_LABEL).toBe('Cancel ending selected sessions');
  });

  it('the body tells only the truths the single End already tells', () => {
    const local =
      'This stops what is running in them, including sessions in closed projects. What each printed is saved first, and they stay in Managed as Ended.';
    expect(copy.batchBody(false)).toBe(local);
    expect(copy.batchBody(true)).toBe(
      `${local} For a session on another machine, bringing it back always returns the folder, and it returns the conversation only when Tortie recorded one for this agent.`
    );
    // The study's promise is false for a row with no recorded conversation.
    expect(copy.batchBody(true)).not.toContain('conversations are kept');
  });

  it('the skipped line is a count WITH its reasons, and nothing when none', () => {
    expect(copy.batchSkippedLine({ ended: 0, unreachable: 0, gone: 0 })).toBe(
      ''
    );
    expect(copy.batchSkippedLine({ ended: 1, unreachable: 0, gone: 0 })).toBe(
      '1 selected session stays unchanged: 1 already ended'
    );
    expect(copy.batchSkippedLine({ ended: 2, unreachable: 1, gone: 1 })).toBe(
      '4 selected sessions stay unchanged: 2 already ended, 1 unreachable, 1 no longer here'
    );
    // The slice's count at open carries two reasons; the third is optional.
    expect(copy.batchSkippedLine({ ended: 0, unreachable: 2 })).toBe(
      '2 selected sessions stay unchanged: 2 unreachable'
    );
  });

  it('running, done and the two toasts', () => {
    expect(copy.batchRunningHeading(3)).toBe('Ending 3 sessions…');
    expect(copy.batchRunningHeading(1)).toBe('Ending 1 session…');
    expect(copy.BATCH_STOP).toBe('Stop');
    expect(copy.BATCH_DONE).toBe('Done');
    expect(copy.batchDoneHeading(2, 3)).toBe('2 of 3 sessions ended');
    expect(copy.batchDoneHeading(0, 1)).toBe('0 of 1 session ended');
    expect(copy.batchEndedToast(1)).toBe('1 session ended.');
    expect(copy.batchEndedToast(4)).toBe('4 sessions ended.');
    expect(copy.batchEndedToast(1)).not.toContain('1 sessions');
    expect(copy.batchClosedToast(2, 5)).toBe(
      '2 of 5 sessions ended. The rest were left running because the manager closed.'
    );
    // The fix round (the batch attack's P2): the manager closed during the
    // LAST target's own call, so nothing was left running and there is no
    // rest to speak of.
    expect(copy.batchClosedToast(1, 1, 0)).toBe('1 of 1 session ended.');
    expect(copy.batchClosedToast(2, 3, 0)).toBe('2 of 3 sessions ended.');
    expect(copy.batchClosedToast(1, 3, 2)).toBe(
      '1 of 3 sessions ended. The rest were left running because the manager closed.'
    );
    expect(copy.BATCH_LIST_FAILED).toBe(
      'Tortie could not read the session list, so it did not end this one.'
    );
  });

  it('one word per outcome, and a failure carries the failing layer’s sentence', () => {
    expect(copy.batchOutcomeWord({ state: 'pending' })).toBe('');
    expect(copy.batchOutcomeWord({ state: 'ending' })).toBe('Ending…');
    expect(copy.batchOutcomeWord({ state: 'ended' })).toBe('Ended');
    expect(copy.batchOutcomeWord({ state: 'skipped', reason: 'ended' })).toBe(
      'Already ended'
    );
    expect(
      copy.batchOutcomeWord({ state: 'skipped', reason: 'unreachable' })
    ).toBe('Unreachable');
    expect(copy.batchOutcomeWord({ state: 'skipped', reason: 'gone' })).toBe(
      'No longer here'
    );
    expect(
      copy.batchOutcomeWord({ state: 'failed', message: 'Session not found.' })
    ).toBe('Not ended. Session not found.');
    expect(copy.batchOutcomeWord({ state: 'not-run' })).toBe('Not run');
  });

  it('a target says where it is, and a machine is named between the two', () => {
    expect(copy.batchWhere('gmux', null)).toBe('gmux');
    expect(copy.batchWhere('gmux', 'Studio')).toBe('gmux · Studio');
    expect(copy.batchTargetLine('gmux', 'working')).toBe('gmux · Working');
    expect(copy.batchTargetLine('gmux · Studio', 'needs input')).toBe(
      'gmux · Studio · Needs input'
    );
  });

  it('raises the first letter of a status label and nothing else', () => {
    expect(copy.raisedLabel('working')).toBe('Working');
    expect(copy.raisedLabel('failed (exit 1)')).toBe('Failed (exit 1)');
    expect(copy.raisedLabel('killed (SIGTERM)')).toBe('Killed (SIGTERM)');
    expect(copy.raisedLabel('')).toBe('');
  });
});

describe('the Messages cell, SPEC 3.4 row by row (Phase 293)', () => {
  it('not answered yet: pending, and busy', () => {
    expect(copy.messagesCell(null, 'claude', false)).toEqual({
      main: '…',
      small: null,
      title: null,
      busy: true
    });
  });

  it('a shell never waits for the answer', () => {
    expect(copy.messagesCell(null, 'shell', false)).toEqual({
      main: '—',
      small: 'Shell',
      title: null,
      busy: false
    });
  });

  it('a session on another machine never waits for the answer', () => {
    expect(copy.messagesCell(null, 'claude', true)).toEqual({
      main: '—',
      small: 'Unavailable',
      title: null,
      busy: false
    });
  });

  it('complete: the total, the two halves and the title', () => {
    expect(
      copy.messagesCell(
        activity({ userMessages: 4, agentMessages: 3 }),
        'codex',
        false
      )
    ).toEqual({
      main: '7',
      small: '4 you · 3 agent',
      title: '4 user messages + 3 agent replies. Tool events excluded.',
      busy: false
    });
  });

  it('complete with zero turns is a real zero, because a record was read', () => {
    const cell = copy.messagesCell(
      activity({ userMessages: 0, agentMessages: 0, ...lastNone() }),
      'claude',
      false
    );
    expect(cell.main).toBe('0');
    expect(cell.small).toBe('0 you · 0 agent');
  });

  it('draws a large total in the locale’s own grouping', () => {
    const cell = copy.messagesCell(
      activity({ userMessages: 1000, agentMessages: 234 }),
      'claude',
      false
    );
    expect(cell.main).toBe((1234).toLocaleString());
  });

  it('partial with both counts: the total and a plus', () => {
    expect(
      copy.messagesCell(
        activity({
          coverage: 'partial',
          reason: 'record-gone',
          userMessages: 5,
          agentMessages: 4
        }),
        'claude',
        false
      )
    ).toEqual({
      main: '9+',
      small: 'Partial history',
      title: 'Only the available history is counted.',
      busy: false
    });
  });

  it('partial with NO reply count: the asks and a plus, and the missing half as words', () => {
    const cell = copy.messagesCell(
      activity({
        coverage: 'partial',
        reason: 'ask-only',
        userMessages: 3,
        agentMessages: null
      }),
      'gemini',
      false
    );
    expect(cell).toEqual({
      main: '3+',
      small: 'Replies not recorded',
      title: 'This agent’s record keeps your messages and not its replies.',
      busy: false
    });
    expect(JSON.stringify(cell)).not.toMatch(/\bnull\b.*agent|0 agent/);
  });

  // Phase 298, rough edge 2. The same record used to draw `0+ / Replies not
  // recorded` beside a Last message cell reading `No messages yet`, computed by
  // `lastMessageOf` from the very same two halves: a `+` on a zero promises more
  // where the cell beside it says there is none. The reading is narrow on
  // purpose — a record that KEPT both halves and counted zero of each still
  // draws its `0`, because that is a true zero and not an unrecorded one.
  it('partial with no reply count AND no asks: the dash and No messages yet, and the sort agrees', () => {
    const answer = activity({
      coverage: 'partial',
      reason: 'ask-only',
      userMessages: 0,
      agentMessages: null
    });
    expect(copy.messagesCell(answer, 'gemini', false)).toEqual({
      main: '—',
      small: 'No messages yet',
      title: null,
      busy: false
    });
    // The Messages column sorts by what the cell DRAWS, which is that
    // function's own stated promise, so a dash sorts with the other dashes.
    expect(copy.drawnMessageTotal(answer, 'gemini', false)).toBeNull();
    // A kept zero on both halves is a true zero and still reads as one.
    const both = activity({ userMessages: 0, agentMessages: 0 });
    expect(copy.messagesCell(both, 'gemini', false).main).toBe('0');
    expect(copy.drawnMessageTotal(both, 'gemini', false)).toBe(0);
  });

  it('not applicable: a dash and the word Shell', () => {
    expect(
      copy.messagesCell(
        activity({ coverage: 'not-applicable', reason: 'shell', ...NONE }),
        'shell',
        false
      )
    ).toEqual({ main: '—', small: 'Shell', title: null, busy: false });
  });

  it.each(['remote', 'unknown-session'] as const)(
    'unavailable, reason %s: a dash and Unavailable',
    (reason) => {
      expect(
        copy.messagesCell(
          activity({ coverage: 'unavailable', reason, ...NONE }),
          'claude',
          false
        )
      ).toEqual({ main: '—', small: 'Unavailable', title: null, busy: false });
    }
  );

  it.each([
    'no-id',
    'not-yet',
    'no-store',
    'unreadable',
    'wrong-conversation'
  ] as const)('unavailable, reason %s: a dash and Not recorded', (reason) => {
    expect(
      copy.messagesCell(
        activity({ coverage: 'unavailable', reason, ...NONE }),
        'claude',
        false
      )
    ).toEqual({ main: '—', small: 'Not recorded', title: null, busy: false });
  });

  it('a count that breaks the contract is a dash, never a zero', () => {
    // Invariant 2 says userMessages is a number under complete and partial. An
    // answer that breaks it is drawn as not recorded, never as `0`.
    const cell = copy.messagesCell(
      activity({ userMessages: null, agentMessages: null }),
      'claude',
      false
    );
    expect(cell.main).toBe('—');
    expect(cell.small).toBe('Not recorded');
  });
});

function lastNone(): Pick<
  OverviewSessionActivity,
  'lastMessageAt' | 'lastMessageBy' | 'lastMessageClock'
> {
  return { lastMessageAt: null, lastMessageBy: null, lastMessageClock: null };
}

describe('the Last message cell, SPEC 3.4 row by row (Phase 293)', () => {
  const at = NOW - (3 * 60 + 5) * 60_000;

  it('not answered yet: pending, and a shell never waits', () => {
    expect(copy.lastMessageCell(null, 'claude', NOW)).toEqual({
      main: '…',
      small: null,
      title: null,
      busy: true
    });
    expect(copy.lastMessageCell(null, 'shell', NOW)).toEqual({
      main: '—',
      small: 'Not applicable',
      title: null,
      busy: false
    });
  });

  it('clock message, by the agent', () => {
    expect(
      copy.lastMessageCell(activity({ lastMessageAt: at }), 'claude', NOW)
    ).toEqual({
      main: '3h 5m ago',
      small: 'Agent reply',
      title: exactTime(at),
      busy: false
    });
  });

  it('clock message, by you', () => {
    expect(
      copy.lastMessageCell(
        activity({ lastMessageAt: at, lastMessageBy: 'you' }),
        'antigravity',
        NOW
      )
    ).toEqual({
      main: '3h 5m ago',
      small: 'Your prompt',
      title: exactTime(at),
      busy: false
    });
  });

  it('clock ask: the reply is named, and the title says whose time it is', () => {
    const cell = copy.lastMessageCell(
      activity({ lastMessageAt: at, lastMessageClock: 'ask' }),
      'cursor',
      NOW
    );
    expect(cell).toEqual({
      main: '3h 5m ago',
      small: 'Agent reply',
      title: `${exactTime(at)}. Time of your last prompt. This agent records no reply time.`,
      busy: false
    });
    // Ablation 24's question: clock `ask` is never drawn as clock `message`.
    expect(cell.title).not.toBe(exactTime(at));
  });

  it('clock session: the small word changes, and the title says why', () => {
    expect(
      copy.lastMessageCell(
        activity({ lastMessageAt: at, lastMessageClock: 'session' }),
        'deepseek',
        NOW
      )
    ).toEqual({
      main: '3h 5m ago',
      small: 'Session updated',
      title: `${exactTime(at)}. This agent records no time per message.`,
      busy: false
    });
  });

  it('counts present and zero: No messages yet', () => {
    expect(
      copy.lastMessageCell(
        activity({ userMessages: 0, agentMessages: 0, ...lastNone() }),
        'claude',
        NOW
      )
    ).toEqual({ main: '—', small: 'No messages yet', title: null, busy: false });
  });

  it('counts present, above zero, and no time: Not recorded', () => {
    expect(
      copy.lastMessageCell(
        activity({ ...lastNone(), lastMessageBy: 'agent' }),
        'deepseek',
        NOW
      )
    ).toEqual({ main: '—', small: 'Not recorded', title: null, busy: false });
  });

  it('asks only, none of them yet: No messages yet, from the half that is known', () => {
    expect(
      copy.lastMessageCell(
        activity({
          coverage: 'partial',
          reason: 'ask-only',
          userMessages: 0,
          agentMessages: null,
          ...lastNone()
        }),
        'gemini',
        NOW
      ).small
    ).toBe('No messages yet');
  });

  it('not applicable, and unavailable for any reason', () => {
    expect(
      copy.lastMessageCell(
        activity({ coverage: 'not-applicable', reason: 'shell', ...NONE }),
        'shell',
        NOW
      )
    ).toEqual({ main: '—', small: 'Not applicable', title: null, busy: false });
    for (const reason of ['remote', 'not-yet', 'unreadable'] as const) {
      expect(
        copy.lastMessageCell(
          activity({ coverage: 'unavailable', reason, ...NONE }),
          'claude',
          NOW
        )
      ).toEqual({ main: '—', small: 'Not recorded', title: null, busy: false });
    }
  });

  it('a time with no clock, or with no author, is never guessed at', () => {
    expect(
      copy.lastMessageCell(
        activity({ lastMessageAt: at, lastMessageClock: null }),
        'claude',
        NOW
      ).small
    ).toBe('Not recorded');
    expect(
      copy.lastMessageCell(
        activity({ lastMessageAt: at, lastMessageBy: null }),
        'claude',
        NOW
      ).small
    ).toBe('Not recorded');
  });

  it('the settled answer for a row on another machine draws the same dash', () => {
    const settled = copy.remoteActivity('r1');
    expect(settled).toEqual({
      sessionId: 'r1',
      coverage: 'unavailable',
      reason: 'remote',
      ...NONE,
      readAt: null
    });
    expect(copy.lastMessageCell(settled, 'claude', NOW).small).toBe(
      'Not recorded'
    );
    expect(copy.messagesCell(settled, 'claude', true).small).toBe(
      'Unavailable'
    );
  });
});

describe('the Details facts (Phase 293, SPEC 2.9)', () => {
  const at = NOW - 3 * 3_600_000;

  it('Messages, with both counts', () => {
    expect(
      copy.detailsMessages(
        activity({ userMessages: 26, agentMessages: 20 }),
        'claude',
        false
      )
    ).toBe('46 · 26 you / 20 agent');
    expect(
      copy.detailsMessages(
        activity({
          coverage: 'partial',
          reason: 'record-gone',
          userMessages: 5,
          agentMessages: 4
        }),
        'claude',
        false
      )
    ).toBe('9+ · 5 you / 4 agent');
  });

  it('Messages, with the reply count NULL: words, never the text null and never 0', () => {
    const fact = copy.detailsMessages(
      activity({
        coverage: 'partial',
        reason: 'ask-only',
        userMessages: 3,
        agentMessages: null
      }),
      'gemini',
      false
    );
    expect(fact).toBe('3+ · 3 you · replies not recorded');
    expect(fact).not.toContain('null');
    expect(fact).not.toContain('0 agent');
  });

  it('Messages, with no count: the cell’s own small word', () => {
    expect(copy.detailsMessages(null, 'shell', false)).toBe('Shell');
    expect(copy.detailsMessages(null, 'claude', true)).toBe('Unavailable');
    expect(
      copy.detailsMessages(
        activity({ coverage: 'unavailable', reason: 'not-yet', ...NONE }),
        'claude',
        false
      )
    ).toBe('Not recorded');
    expect(copy.detailsMessages(null, 'claude', false)).toBe('…');
  });

  it('Last message, with a time: the moment, the small word, and the clock’s sentence', () => {
    expect(
      copy.detailsLastMessage(activity({ lastMessageAt: at }), 'claude')
    ).toBe(`${exactTime(at)} · Agent reply`);
    expect(
      copy.detailsLastMessage(
        activity({ lastMessageAt: at, lastMessageClock: 'ask' }),
        'cursor'
      )
    ).toBe(
      `${exactTime(at)} · Agent reply. Time of your last prompt. This agent records no reply time.`
    );
    expect(
      copy.detailsLastMessage(
        activity({ lastMessageAt: at, lastMessageClock: 'session' }),
        'deepseek'
      )
    ).toBe(
      `${exactTime(at)} · Session updated. This agent records no time per message.`
    );
  });

  it('Last message, with no time: the small word, and a shell is Not applicable in both places', () => {
    expect(copy.detailsLastMessage(null, 'shell')).toBe('Not applicable');
    expect(copy.lastMessageCell(null, 'shell', NOW).small).toBe(
      'Not applicable'
    );
    expect(
      copy.detailsLastMessage(
        activity({ userMessages: 0, agentMessages: 0, ...lastNone() }),
        'claude'
      )
    ).toBe('No messages yet');
    expect(copy.detailsLastMessage(null, 'claude')).toBe('…');
  });
});

describe('no output ever contains the text null (Phase 293)', () => {
  const activities: (OverviewSessionActivity | null)[] = [
    null,
    activity({}),
    activity({ agentMessages: null, coverage: 'partial', reason: 'ask-only' }),
    activity({ userMessages: null, agentMessages: null }),
    activity({ ...lastNone() }),
    activity({ lastMessageClock: null }),
    activity({ lastMessageBy: null }),
    activity({ lastMessageClock: 'ask' }),
    activity({ lastMessageClock: 'session' }),
    activity({ coverage: 'unavailable', reason: 'remote', ...NONE }),
    activity({ coverage: 'not-applicable', reason: 'shell', ...NONE })
  ];

  it('in any cell or any Details fact, for any answer', () => {
    const drawn: string[] = [];
    for (const one of activities) {
      for (const agent of ['claude', 'shell', 'gemini']) {
        for (const remote of [false, true]) {
          const m = copy.messagesCell(one, agent, remote);
          const l = copy.lastMessageCell(one, agent, NOW);
          drawn.push(m.main, m.small ?? '', m.title ?? '');
          drawn.push(l.main, l.small ?? '', l.title ?? '');
          drawn.push(copy.detailsMessages(one, agent, remote));
          drawn.push(copy.detailsLastMessage(one, agent));
        }
      }
    }
    expect(drawn.length).toBeGreaterThan(400);
    for (const text of drawn) {
      expect(text).not.toMatch(/null|undefined|NaN/);
    }
  });
});

describe('source-text pins on copy.ts (Phase 293)', () => {
  /** Comments out, by the two shapes this file uses. */
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(
    /(^|[^:])\/\/.*$/gm,
    '$1'
  );

  it('holds no `?? 0` at all, in code or in a comment', () => {
    expect(SOURCE).not.toMatch(/\?\?\s*0\b/);
    expect(SOURCE).not.toMatch(/\|\|\s*0\b/);
  });

  it('names no word of the session server’s vocabulary in any literal', () => {
    const literals =
      code.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ??
      [];
    expect(literals.length).toBeGreaterThan(80);
    const banned = [
      /tmux/i,
      /\bpanes?\b/i,
      /prefix/i,
      /socket/i,
      /ssh/i,
      /\battach/i,
      /\bdetach/i,
      /\bserver\b/i
    ];
    const found: string[] = [];
    for (const literal of literals) {
      for (const word of banned) {
        if (word.test(literal)) found.push(`${String(word)} in ${literal}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('computes a total only where both counts are numbers', () => {
    // The one addition in the file sits behind a typeof guard on both halves.
    const additions = code.match(/\buser\s*\+\s*agent\b/g) ?? [];
    expect(additions.length).toBe(1);
    expect(code).toMatch(/typeof agent === 'number'/);
    expect(code).toMatch(/typeof user !== 'number'/);
  });
});
