/**
 * The login control and the card's login lines (Phase 202).
 *
 * These are the pure halves of the surface, pinned without a window: what the
 * native menu offers, what a pick means, and which lines the hover card grows.
 * The app run drives the rest.
 *
 * THE LINE THAT MATTERS MOST is the one about sessions elsewhere. A running
 * session keeps the login it started with for its whole life, so a person who
 * has just switched is looking at sessions these numbers are not about. The
 * meter says so, which is research 72's never lie across accounts rule applied
 * to the sessions in front of the person rather than to the numbers alone.
 */

import { describe, expect, it } from 'vitest';
import { emptyUsageProvider, type UsageProviderSnapshot } from '@shared/usage';
import { DEFAULT_LOGIN_NAME, defaultLoginRow, type LoginRow } from '@shared/logins';
import {
  LOGIN_ADD_LABEL,
  LOGIN_MENU_ADD,
  LOGIN_NOT_SIGNED_IN,
  loginMenuItems,
  loginMenuPick
} from '../login-menu';
import { cardLines, sessionsElsewhere } from '../UsageMeter';
import { USAGE_LOGIN_SWITCHING, USAGE_STALE_MARK } from '../usage-copy';

const NOW = 1_790_000_000_000;

function row(over: Partial<UsageProviderSnapshot> = {}): UsageProviderSnapshot {
  return {
    ...emptyUsageProvider('claude', 'ok'),
    fiveHour: { percent: 12, resetsAt: null },
    ...over
  };
}

describe('the native menu', () => {
  // PHASE 203 REWROTE WHAT THESE ROWS DRAW. A login is drawn as its account:
  // the address leads, the name Tortie holds is the second line, and `Default`
  // is no longer a label on any face. It is still the row's NAME, which is the
  // reserved manifest key and what a pick comes back as.
  const rows: LoginRow[] = [
    defaultLoginRow('claude', true, true, 'greg@itavero.software'),
    {
      provider: 'claude',
      name: 'Work',
      isDefault: false,
      chosen: false,
      present: true,
      email: 'work@example.com',
      kept: false,
      restores: false
    },
    {
      provider: 'claude',
      name: 'Spare',
      isDefault: false,
      chosen: false,
      present: false,
      email: null,
      kept: false,
      restores: false
    },
    {
      provider: 'claude',
      name: 'Fresh',
      isDefault: false,
      chosen: false,
      present: true,
      email: null,
      kept: false,
      restores: false
    }
  ];

  it('draws every login as its account, and Default is not a label', () => {
    const items = loginMenuItems(rows);
    expect(items.map((i) => i.label)).toEqual([
      '✓ greg@itavero.software',
      '  work@example.com',
      '  Spare',
      '  Fresh',
      '',
      LOGIN_ADD_LABEL
    ]);
    expect(items[4]?.type).toBe('separator');
    // The word is gone from every face and is still the id underneath.
    expect(items.map((i) => i.label).join(' ')).not.toContain(DEFAULT_LOGIN_NAME);
    expect(items[0]?.id).toBe(`login:pick:${DEFAULT_LOGIN_NAME}`);
  });

  it('says whose each login is, and what is missing when nothing is', () => {
    const items = loginMenuItems(rows);
    // The default is marked as the one Tortie does not own.
    expect(items[0]?.sublabel).toBe('Your own sign in');
    // A named login keeps the name Tortie holds as its second word.
    expect(items[1]?.sublabel).toBe('Work');
    expect(items[2]?.sublabel).toBe(LOGIN_NOT_SIGNED_IN);
    // Signed in, and the vendor's own file names no address yet, which is
    // every login until the account has taken a turn.
    expect(items[3]?.sublabel).toBe('Account not known yet');
  });

  it('reads a pick, and reads a dismissal as nothing', () => {
    expect(loginMenuPick(null)).toBeNull();
    expect(loginMenuPick(LOGIN_MENU_ADD)).toEqual({ kind: 'add' });
    expect(loginMenuPick('login:pick:Work')).toEqual({ kind: 'choose', name: 'Work' });
    // A name with a colon in it is impossible, because the name filter refuses
    // one, but the reader is written so that the rest of the id is the name
    // rather than the first segment of it.
    expect(loginMenuPick('login:pick:')).toBeNull();
    expect(loginMenuPick('something-else')).toBeNull();
  });
});

describe('the card lines', () => {
  it('names no login for the default, which is every install before this', () => {
    expect(cardLines(row(), NOW).join(' | ')).not.toContain('Login');
  });

  it('names the login the numbers came from', () => {
    expect(cardLines(row({ login: 'Work' }), NOW)).toContain('Login: Work');
  });

  it('says which stale it is, so a switch never reads as a failed read', () => {
    // A READ THAT FAILED. The mark is the true one for this row.
    expect(cardLines(row({ state: 'stale' }), NOW)).toContain(USAGE_STALE_MARK);
    // A PERSON WHO JUST CHOSE ANOTHER ACCOUNT. Nothing failed: the numbers on
    // screen are the previous login's until the next read lands, and saying
    // the last read failed would be a false sentence about it.
    const switching = cardLines(row({ state: 'stale', login: 'Work', loginChanged: true }), NOW);
    expect(switching).toContain(USAGE_LOGIN_SWITCHING);
    expect(switching).not.toContain(USAGE_STALE_MARK);
    // And it is only ever said beside stale.
    expect(cardLines(row({ loginChanged: true }), NOW)).not.toContain(USAGE_LOGIN_SWITCHING);
  });

  it('says how many running sessions are somewhere else, and on which login', () => {
    const lines = cardLines(
      row({ login: 'Work' }),
      NOW,
      new Map([[DEFAULT_LOGIN_NAME, 2]])
    );
    expect(lines).toContain(`2 sessions on ${DEFAULT_LOGIN_NAME}`);
  });
});

describe('counting the sessions that are somewhere else', () => {
  const sessions = [
    { agent: 'claude', status: 'running' as const },
    { agent: 'claude', status: 'running' as const, login: 'Work' },
    { agent: 'claude', status: 'exited' as const },
    { agent: 'codex', status: 'running' as const },
    { agent: 'shell', status: 'running' as const }
  ];

  it('is empty when every running session is on the meter own login', () => {
    expect(sessionsElsewhere([sessions[0]!], row({ login: null }))).toEqual(new Map());
  });

  it('counts by login name, with no login meaning the default', () => {
    expect(sessionsElsewhere(sessions, row({ login: 'Work' }))).toEqual(
      new Map([[DEFAULT_LOGIN_NAME, 1]])
    );
    expect(sessionsElsewhere(sessions, row({ login: null }))).toEqual(
      new Map([['Work', 1]])
    );
  });

  it('counts no ended session and no other agent', () => {
    // The exited claude row and the codex and shell rows are all left out: an
    // ended session runs under nothing, and another agent is another meter.
    const counts = sessionsElsewhere(sessions, row({ login: 'Work' }));
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(1);
  });
});
