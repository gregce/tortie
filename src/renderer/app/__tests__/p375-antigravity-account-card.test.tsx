/**
 * The Antigravity card names the account its numbers belong to (Phase 375;
 * build/p375/SPEC.md D8, rows C1 to C5), run rather than read.
 *
 * The row carries the address its own sessions handed Tortie's script, as the
 * optional `email` only that row ever has. The card draws Phase 203's
 * `Login: <address>` from it, in the place Claude's and Codex's login line
 * goes, and still offers no Choose login. A Claude or Codex row's own `email`
 * is never read, a malformed one draws no line, and the address is never in a
 * row's resting accessible text.
 *
 * This repository carries no jsdom, so the meter renders through
 * `renderToStaticMarkup`, which answers a zustand hook with the store's INITIAL
 * state. Every address and every number here is invented.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LoginRow, LoginsSnapshot } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import type { UsageProviderSnapshot } from '@shared/usage';
import { emptyUsageProvider } from '@shared/usage';
import { useUsage } from '../../state/usage';
import {
  UsageCardBlock,
  UsageMeter,
  cardLines,
  loginEmailOf,
  usageCardGroups
} from '../UsageMeter';
import { USAGE_LOGIN_CONTROL } from '../usage-copy';

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const A = 'p375-face-a@example.invalid';
const STRAY = 'p375-stray@example.invalid';

const antigravity: UsageProviderSnapshot = {
  ...emptyUsageProvider('antigravity', 'ok'),
  fiveHour: { percent: 4, resetsAt: NOW + 2 * HOUR },
  sevenDay: { percent: 2, resetsAt: NOW + 3 * DAY },
  second: {
    label: 'Other models',
    fiveHour: { percent: 3, resetsAt: NOW + 2 * HOUR + 60_000 },
    sevenDay: { percent: 1, resetsAt: NOW + 4 * DAY }
  },
  readAt: NOW - 60_000
};

const claude: UsageProviderSnapshot = {
  ...emptyUsageProvider('claude', 'ok'),
  fiveHour: { percent: 37, resetsAt: NOW + HOUR },
  sevenDay: { percent: 12, resetsAt: null },
  plan: 'max'
};
const codex: UsageProviderSnapshot = {
  ...emptyUsageProvider('codex', 'ok'),
  sevenDay: { percent: 9, resetsAt: null },
  plan: 'plus'
};

function added(provider: 'claude' | 'codex', name: string, email: string | null): LoginRow {
  return {
    provider,
    name,
    isDefault: false,
    chosen: false,
    present: true,
    email,
    kept: false,
    restores: false
  };
}

/** The p202 and p203 shapes: a default with an address, an added login with one. */
const logins: LoginsSnapshot = {
  logins: [
    defaultLoginRow('claude', true, true, 'claude-own@example.com'),
    added('claude', 'Work', 'work@example.com'),
    defaultLoginRow('codex', true, true, 'codex-own@example.com')
  ],
  problems: [],
  at: NOW
};

/** The lines of one Antigravity row, as the parent's card drew them. */
const PARENT_LINES = [
  'Antigravity',
  'Plus plan',
  'Gemini 4% 5h, Resets in 2h 0m',
  'Gemini 2% wk, Resets in 3d 0h',
  'Other models 3% 5h, Resets in 2h 1m',
  'Other models 1% wk, Resets in 4d 0h'
];

const initial = useUsage.getInitialState();
const before = initial.snapshot;

afterEach(() => {
  initial.snapshot = before;
});

function linesOf(p: UsageProviderSnapshot, snapshot: LoginsSnapshot = logins): string[] {
  const groups = usageCardGroups([p], NOW, [], snapshot);
  return groups[0]?.lines ?? [];
}

describe('C1: the Antigravity card names its account', () => {
  it('C1: draws Login: <address> right after the plan line, and every other line as the parent', () => {
    const row = { ...antigravity, plan: 'plus', email: A };
    const lines = linesOf(row);
    expect(lines).toEqual([...PARENT_LINES.slice(0, 2), `Login: ${A}`, ...PARENT_LINES.slice(2)]);
  });

  it('C1: draws the line after the name when no plan was named', () => {
    const lines = linesOf({ ...antigravity, email: A });
    expect(lines[0]).toBe('Antigravity');
    expect(lines[1]).toBe(`Login: ${A}`);
    expect(lines.slice(2)).toEqual(PARENT_LINES.slice(2));
  });

  it('C1: names the account on a stale row and on a row with no window too', () => {
    const stale = linesOf({ ...antigravity, state: 'stale', readAt: NOW - 42 * 60_000, email: A });
    expect(stale[1]).toBe(`Login: ${A}`);
    expect(stale).toContain('Last reported 42m ago');
    const empty: UsageProviderSnapshot = {
      ...emptyUsageProvider('antigravity', 'no-windows'),
      email: A
    };
    expect(linesOf(empty)).toEqual([
      'Antigravity',
      `Login: ${A}`,
      'Antigravity reported no plan window.'
    ]);
  });

  it('C1: draws exactly the parent lines when the row names no address', () => {
    expect(linesOf({ ...antigravity, plan: 'plus' })).toEqual(PARENT_LINES);
    expect(cardLines({ ...antigravity, plan: 'plus' }, NOW)).toEqual(PARENT_LINES);
  });

  it('C1: never draws the login name a snapshot holds, with or without an address', () => {
    const named = { ...antigravity, plan: 'plus', login: 'Work', loginChanged: true };
    expect(linesOf(named)).toEqual(PARENT_LINES);
    const lines = linesOf({ ...named, email: A });
    expect(lines).toContain(`Login: ${A}`);
    expect(lines.join(' | ')).not.toContain('Work');
  });
});

describe('C2: Claude and Codex are the parent\'s', () => {
  // Recorded from the parent's card (8d58c391) over the same rows.
  const PARENT: Record<string, string[]> = {
    claudeDefault: ['Claude', 'Max plan', 'Login: claude-own@example.com', '37% 5h, Resets in 1h 0m', '12% wk'],
    claudeWork: ['Claude', 'Max plan', 'Login: work@example.com', '37% 5h, Resets in 1h 0m', '12% wk'],
    claudeUnknown: ['Claude', 'Max plan', 'Login: Spare', '37% 5h, Resets in 1h 0m', '12% wk'],
    codexDefault: ['Codex', 'Plus plan', 'Login: codex-own@example.com', '9% wk']
  };

  it('C2: draws the lines, groups and Choose login the parent drew, a stray email on the row ignored', () => {
    const rows: [string, UsageProviderSnapshot][] = [
      ['claudeDefault', { ...claude, email: STRAY }],
      ['claudeWork', { ...claude, login: 'Work', email: STRAY }],
      ['claudeUnknown', { ...claude, login: 'Spare', email: STRAY }],
      ['codexDefault', { ...codex, email: STRAY }]
    ];
    for (const [name, row] of rows) {
      const groups = usageCardGroups([row], NOW, [], logins);
      expect(groups[0]?.lines, name).toEqual(PARENT[name]);
      expect(groups[0]?.login).toBe(row.provider);
      expect(loginEmailOf(logins, row)).not.toBe(STRAY);
      const drawn = renderToStaticMarkup(
        <UsageCardBlock group={groups[0]!} onChooseLogin={() => undefined} />
      );
      expect(drawn).toContain(`data-login-control="${row.provider}"`);
      expect(drawn).toContain(USAGE_LOGIN_CONTROL);
      expect(drawn).not.toContain(STRAY);
    }
  });

  it('C2: answers each login provider\'s address from the logins store alone', () => {
    expect(loginEmailOf(logins, { ...claude, email: STRAY })).toBe('claude-own@example.com');
    expect(loginEmailOf(logins, { ...claude, login: 'Spare', email: STRAY })).toBeNull();
    expect(loginEmailOf(logins, { ...codex, email: STRAY })).toBe('codex-own@example.com');
  });
});

describe('C3: no control and no logins read for Antigravity', () => {
  it('C3: renders no button and asks the logins store nothing', () => {
    const asked: string[] = [];
    const watched = new Proxy(logins, {
      get(target, key, receiver) {
        asked.push(String(key));
        return Reflect.get(target, key, receiver) as unknown;
      }
    });
    const groups = usageCardGroups([{ ...antigravity, email: A }], NOW, [], watched);
    expect(asked).toEqual([]);
    expect(groups.map((g) => g.login)).toEqual([null]);
    const drawn = renderToStaticMarkup(
      <UsageCardBlock group={groups[0]!} onChooseLogin={() => undefined} />
    );
    expect(drawn).toContain(`Login: ${A}`);
    expect(drawn).not.toContain('<button');
    expect(drawn).not.toContain(USAGE_LOGIN_CONTROL);
    expect(drawn).not.toContain('data-login-control');
  });
});

describe('C4: the address is on the hover card alone', () => {
  function draw(density: 'full' | 'compact' | 'mini', providers: UsageProviderSnapshot[]): string {
    initial.snapshot = { at: NOW, providers };
    return renderToStaticMarkup(<UsageMeter density={density} />);
  }

  it('C4: the resting row\'s accessible text (full, compact, mini) never holds the address', () => {
    const states: UsageProviderSnapshot[] = [
      { ...antigravity, email: A },
      { ...antigravity, state: 'stale', email: A },
      { ...emptyUsageProvider('antigravity', 'no-windows'), email: A },
      { ...antigravity, fiveHour: null, sevenDay: null, email: A }
    ];
    for (const row of states) {
      for (const density of ['full', 'compact', 'mini'] as const) {
        const markup = draw(density, [claude, row]);
        expect(markup, `${density} ${row.state}`).toContain('usage-hidden');
        expect(markup, `${density} ${row.state}`).toContain('Antigravity');
        expect(markup, `${density} ${row.state}`).not.toContain(A);
        expect(markup, `${density} ${row.state}`).not.toContain('@');
      }
    }
  });
});

describe('C5: a malformed address draws no line', () => {
  it('C5: draws no Login line for an address the shared check refuses', () => {
    const bad = [
      'jö@example.invalid',
      `${'a'.repeat(300)}@example.invalid`,
      'a"b@example.invalid',
      'a\\b@example.invalid',
      'two@at@example.invalid',
      'nodot@example',
      ' lead@example.invalid',
      '<b>x</b>@example.invalid',
      '‮evil@example.invalid'
    ];
    for (const email of bad) {
      const row = { ...antigravity, plan: 'plus', email };
      expect(loginEmailOf(logins, row), email).toBeNull();
      expect(linesOf(row), email).toEqual(PARENT_LINES);
    }
  });

  it('C5: draws no line over a value of another type an older or hostile main sent', () => {
    for (const email of [42, null, { at: '@' }, ['x@example.invalid']]) {
      const row = { ...antigravity, plan: 'plus', email } as unknown as UsageProviderSnapshot;
      expect(linesOf(row)).toEqual(PARENT_LINES);
    }
  });
});
