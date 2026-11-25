/**
 * The meter's third row, which nobody asks for (Phase 374; build/p374/SPEC.md
 * R1 to R3), run rather than read.
 *
 * Antigravity's numbers arrive from its own sessions. So its row names no
 * login and offers none, its second model group is on the card and not on the
 * face, its empty row says what would fill it, its stale row says an age
 * rather than a failure, and a meter of nothing but such rows has no refresh.
 *
 * This repository carries no jsdom, so the meter renders through
 * `renderToStaticMarkup`. The server renderer answers a zustand hook with the
 * store's INITIAL state, which is why the snapshot is put there. The hover card
 * is a portal and opens on a pointer, so its blocks are drawn one at a time.
 *
 * Every number here is invented.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LoginsSnapshot } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import type {
  UsageProviderSnapshot,
  UsageWaitingFor
} from '@shared/usage';
import { USAGE_PROVIDERS, emptyUsageProvider } from '@shared/usage';
import { useUsage } from '../../state/usage';
import {
  UsageCardBlock,
  UsageMeter,
  barPercent,
  cardLines,
  loginEmailOf,
  usageCanRefresh,
  usageCardGroups,
  usageLine
} from '../UsageMeter';
import type { UsageDensity } from '../UsageMeter';
import {
  USAGE_LOGIN_CONTROL,
  USAGE_LOGIN_SWITCHING,
  USAGE_REFRESH,
  USAGE_STALE_MARK,
  usageReportedLine,
  usageStateLine
} from '../usage-copy';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const claude: UsageProviderSnapshot = {
  ...emptyUsageProvider('claude', 'ok'),
  fiveHour: { percent: 37, resetsAt: null },
  sevenDay: { percent: 12, resetsAt: null }
};
const codex: UsageProviderSnapshot = {
  ...emptyUsageProvider('codex', 'ok'),
  fiveHour: { percent: 41, resetsAt: null },
  sevenDay: { percent: 9, resetsAt: null }
};
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

const initial = useUsage.getInitialState();
const before = initial.snapshot;

function draw(
  density: UsageDensity,
  providers: UsageProviderSnapshot[]
): string {
  initial.snapshot = { at: NOW, providers };
  return renderToStaticMarkup(<UsageMeter density={density} />);
}

/** What a person sees on the face, being the markup without the hidden text. */
function face(markup: string): string {
  return markup.replace(/<span class="usage-hidden">[^<]*<\/span>/g, '');
}

afterEach(() => {
  initial.snapshot = before;
});

/** Everything a login could be drawn from, all of it present and tempting. */
const logins: LoginsSnapshot = {
  logins: [
    defaultLoginRow('claude', true, true, 'claude@example.com'),
    defaultLoginRow('codex', true, true, 'codex@example.com')
  ],
  problems: [],
  at: NOW
};

describe('R1: three rows on the face', () => {
  it('draws them in the one order, at each density', () => {
    for (const density of ['full', 'compact', 'mini'] as const) {
      const markup = draw(density, [claude, codex, antigravity]);
      const rows = density === 'mini' ? 'usage-mini-row' : 'usage-row';
      expect(markup.split(`class="${rows}"`).length - 1).toBe(3);
      const at = ['Claude', 'Codex', 'Antigravity'].map((name) =>
        markup.indexOf(`<span class="usage-hidden">${name}.`)
      );
      expect(at.every((i) => i >= 0)).toBe(true);
      expect([...at].sort((a, b) => a - b)).toEqual(at);
    }
  });

  it('leads with the five hour number, and the bar fills to that one', () => {
    expect(usageLine(antigravity)).toBe('4% 5h · 2% wk');
    expect(barPercent(antigravity, 'five-hour')).toBe(4);
    expect(barPercent(antigravity, 'most-used')).toBe(4);
    expect(face(draw('full', [antigravity]))).toContain('4% 5h · 2% wk');
  });

  it('keeps the second group off the face, even when it is the fuller one', () => {
    const full: UsageProviderSnapshot = {
      ...antigravity,
      second: {
        label: 'Other models',
        fiveHour: { percent: 97, resetsAt: null },
        sevenDay: null
      }
    };
    expect(barPercent(full, 'most-used')).toBe(4);
    for (const density of ['full', 'compact', 'mini'] as const) {
      const drawn = face(draw(density, [full]));
      expect(drawn).not.toContain('Other models');
      expect(drawn).not.toContain('97');
    }
  });

  it('draws the row Claude and Codex had, unmoved by the third', () => {
    const two = face(draw('compact', [claude, codex]));
    const three = face(draw('compact', [claude, codex, antigravity]));
    const rows = (markup: string): string[] =>
      markup.split('<span class="usage-row">').slice(1);
    expect(rows(three)[0]).toBe(rows(two)[0]);
    // The second row of two is also the last, so it carries the closing tags.
    expect(rows(two)[1]?.startsWith(rows(three)[1] ?? 'absent')).toBe(true);
  });

  it('draws nothing at all while every switch is off', () => {
    const off = USAGE_PROVIDERS.map((p) => emptyUsageProvider(p));
    for (const density of ['full', 'compact', 'mini'] as const) {
      expect(draw(density, off)).toBe('');
    }
  });
});

describe('R1: the card', () => {
  it('names the second group after the two windows of the face', () => {
    expect(cardLines({ ...antigravity, plan: 'plus' }, NOW)).toEqual([
      'Antigravity',
      'Plus plan',
      'Gemini 4% 5h, Resets in 2h 0m',
      'Gemini 2% wk, Resets in 3d 0h',
      'Other models 3% 5h, Resets in 2h 1m',
      'Other models 1% wk, Resets in 4d 0h'
    ]);
  });

  it('leaves out a window the second group did not name', () => {
    const lines = cardLines(
      {
        ...antigravity,
        second: {
          label: 'Other models',
          fiveHour: null,
          sevenDay: { percent: 1, resetsAt: null }
        }
      },
      NOW
    );
    expect(lines.filter((line) => line.startsWith('Other models'))).toEqual([
      'Other models 1% wk'
    ]);
  });

  it('draws no number it cannot draw honestly', () => {
    const lines = cardLines(
      {
        ...antigravity,
        second: {
          label: 'Other models',
          fiveHour: { percent: Number.NaN, resetsAt: null },
          sevenDay: { percent: Number.POSITIVE_INFINITY, resetsAt: null }
        }
      },
      NOW
    );
    expect(lines.join(' ')).not.toContain('Other models');
  });

  it('is drawn over a row an older harness staged, with no second field', () => {
    const old = { ...claude } as Partial<UsageProviderSnapshot>;
    delete old.second;
    delete old.waitingFor;
    expect(cardLines(old as UsageProviderSnapshot, NOW)).toEqual([
      'Claude',
      '37% 5h',
      '12% wk'
    ]);
    expect(draw('mini', [old as UsageProviderSnapshot])).toContain('37% 5h');
  });

  it('says the second group to a screen reader when it is all there is', () => {
    const only = { ...antigravity, fiveHour: null, sevenDay: null };
    expect(draw('mini', [only])).toContain('Other models 3% 5h');
  });
});

describe('R1: no login for a provider that has none', () => {
  it('draws no login line, even over a snapshot that names one', () => {
    const named = { ...antigravity, login: 'Work', loginChanged: true };
    const lines = cardLines(named, NOW, new Map([['Work', 2]]), 'a@example.com');
    expect(lines.join(' | ')).not.toContain('Login');
    expect(lines.join(' | ')).not.toContain('@');
    expect(lines.join(' | ')).not.toContain('session');
  });

  it('asks the login list for no address', () => {
    expect(loginEmailOf(logins, antigravity)).toBeNull();
    expect(loginEmailOf(logins, claude)).toBe('claude@example.com');
    expect(loginEmailOf(logins, codex)).toBe('codex@example.com');
  });

  it('draws Choose login for Claude and Codex and not for Antigravity', () => {
    const groups = usageCardGroups([claude, codex, antigravity], NOW, [], logins);
    expect(groups.map((g) => g.login)).toEqual(['claude', 'codex', null]);
    const drawn = groups.map((group) =>
      renderToStaticMarkup(
        <UsageCardBlock group={group} onChooseLogin={() => undefined} />
      )
    );
    expect(drawn[0]).toContain('data-login-control="claude"');
    expect(drawn[0]).toContain(USAGE_LOGIN_CONTROL);
    expect(drawn[1]).toContain('data-login-control="codex"');
    expect(drawn[2]).not.toContain('data-login-control');
    expect(drawn[2]).not.toContain(USAGE_LOGIN_CONTROL);
    expect(drawn[2]).not.toContain('<button');
  });

  it('reads no login list to open a card that names none', () => {
    // The card opens on a pointer, which no test here can send, so the one
    // call that reads the login store is held by its text: once, and only
    // behind the question whether a drawn row has a login at all.
    const source = readFileSync(join(__dirname, '..', 'UsageMeter.tsx'), 'utf8');
    expect(source.split('loadLogins()').length - 1).toBe(1);
    expect(source).toContain(
      'if (groups.some((group) => group.login !== null)) void loadLogins();'
    );
  });

  it('draws no control for anybody on a build with no popup menu', () => {
    const groups = usageCardGroups([claude], NOW, [], logins);
    expect(
      renderToStaticMarkup(
        <UsageCardBlock group={groups[0]!} onChooseLogin={null} />
      )
    ).not.toContain('<button');
  });
});

describe('R2: the words of a row with nothing to draw', () => {
  const words: Record<UsageWaitingFor, string> = {
    session: 'Shows after a new Antigravity session starts.',
    'own-status-line': 'Your own Antigravity status line or settings are in use.',
    version: 'Needs Antigravity CLI 1.4.10 or later.',
    captured: 'A session SpecStory captures does not report its plan.',
    'start-failed':
      'A new Antigravity session ended at once, so this row waits for the next Antigravity update, or until this meter is turned off and on.',
    unwritable: 'Tortie could not write its status line script.'
  };

  for (const [why, line] of Object.entries(words) as [UsageWaitingFor, string][]) {
    it(`says why it waits: ${why}`, () => {
      const row: UsageProviderSnapshot = {
        ...emptyUsageProvider('antigravity', 'waiting'),
        waitingFor: why
      };
      expect(cardLines(row, NOW)).toEqual(['Antigravity', line]);
      expect(draw('mini', [row])).toContain(line);
      // The resting face is the name and nothing else.
      expect(face(draw('full', [row]))).toContain(
        '<span class="usage-none">Antigravity</span>'
      );
      expect(face(draw('full', [row]))).not.toContain(line);
    });
  }

  it('reads as no session yet when main named no reason', () => {
    expect(usageStateLine('antigravity', 'waiting')).toBe(words.session);
    expect(usageStateLine('antigravity', 'waiting', null)).toBe(words.session);
  });

  it('never tells a person to sign in, refresh a login or read a failure', () => {
    for (const line of Object.values(words)) {
      expect(line).not.toMatch(/sign in|login|failed|could not be read/i);
    }
  });
});

describe('R2: a stale row says which stale it is', () => {
  it('says the age for a row nobody asks for, and never a failure', () => {
    for (const [ago, said] of [
      [42 * 60_000, '42m'],
      [5 * HOUR, '5h'],
      [3 * DAY, '3d']
    ] as const) {
      const lines = cardLines(
        { ...antigravity, state: 'stale', readAt: NOW - ago },
        NOW
      );
      expect(lines).toContain(`Last reported ${said} ago`);
      expect(lines).not.toContain(USAGE_STALE_MARK);
      expect(lines).not.toContain(USAGE_LOGIN_SWITCHING);
    }
  });

  it('never says now, and says nothing over a time it was not given', () => {
    expect(usageReportedLine(NOW, NOW)).toBe('Last reported 1m ago');
    expect(usageReportedLine(NOW + DAY, NOW)).toBe('Last reported 1m ago');
    expect(usageReportedLine(null, NOW)).toBe('');
    expect(usageReportedLine(Number.NaN, NOW)).toBe('');
    expect(
      cardLines({ ...antigravity, state: 'stale', readAt: null }, NOW).join(' ')
    ).not.toContain('Last reported');
  });

  it('keeps the parent mark for the two that are asked', () => {
    for (const row of [claude, codex]) {
      const lines = cardLines({ ...row, state: 'stale', readAt: NOW - HOUR }, NOW);
      expect(lines).toContain(USAGE_STALE_MARK);
      expect(lines.join(' ')).not.toContain('Last reported');
    }
    expect(
      cardLines({ ...claude, state: 'stale', loginChanged: true }, NOW)
    ).toContain(USAGE_LOGIN_SWITCHING);
  });
});

describe('R3: the refresh control', () => {
  it('is there while any drawn row is one that is asked', () => {
    expect(usageCanRefresh([claude])).toBe(true);
    expect(usageCanRefresh([codex, antigravity])).toBe(true);
    for (const density of ['full', 'compact', 'mini'] as const) {
      const markup = draw(density, [codex, antigravity]);
      expect(markup).toContain(`aria-label="${USAGE_REFRESH}"`);
      expect(markup.split('<button').length - 1).toBe(1);
    }
  });

  it('is absent when every drawn row is one nobody asks for', () => {
    expect(usageCanRefresh([antigravity])).toBe(false);
    // A switched off Claude row is not drawn, so it keeps no control.
    const off = emptyUsageProvider('claude');
    for (const density of ['full', 'compact', 'mini'] as const) {
      const markup = draw(density, [off, antigravity]);
      expect(markup).not.toContain('<button');
      expect(markup).not.toContain(USAGE_REFRESH);
    }
  });

  it('leaves the same box behind, with no press on it', () => {
    for (const density of ['compact', 'mini'] as const) {
      const markup = draw(density, [antigravity]);
      expect(markup).toContain('<div class="usage-press usage-press-still">');
      expect(draw(density, [claude])).toContain('class="usage-press"');
    }
  });

  it('promises no press under a pointer', () => {
    const css = readFileSync(join(__dirname, '..', 'usage-meter.css'), 'utf8');
    expect(css).toContain(
      '.usage-press:hover:not(:disabled):not(.usage-press-still) {'
    );
    expect(css).toMatch(/\.usage-press-still \{\s*cursor: default;\s*\}/);
    // The same box: the still one declares nothing that could move a row.
    expect(css.split('.usage-press-still {').length - 1).toBe(1);
  });
});
