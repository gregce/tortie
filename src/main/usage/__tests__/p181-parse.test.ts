/**
 * The two parsers against the shapes measured over the wire on 2026-08-31
 * (docs/research/72 section 8), and against twelve shapes nobody has seen.
 *
 * The fixtures below carry the measured KEYS with invented numbers. No token,
 * no identifier and no real value from the operator's account is in this file
 * or anywhere else in the tree.
 */

import { describe, expect, it } from 'vitest';
import {
  CODEX_FIVE_HOUR_SECONDS,
  CODEX_WEEKLY_SECONDS,
  classifyCodexWindow,
  claudeScoped,
  claudeWindow,
  isoToMs,
  parseClaudeUsage,
  parseCodexUsage
} from '../parse';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

/** The Claude body's measured shape, values invented. */
function claudeBody(): Record<string, unknown> {
  return {
    amber_ladder: null,
    cinder_cove: null,
    iguana_necktie: null,
    juniper_tide: null,
    omelette_promotional: null,
    tangelo: null,
    seven_day_cowork: null,
    seven_day_oauth_apps: null,
    seven_day_omelette: null,
    seven_day_opus: null,
    seven_day_sonnet: null,
    member_dashboard_available: true,
    five_hour: {
      limit_dollars: null,
      locked_reason: null,
      remaining_dollars: null,
      resets_at: '2026-08-31T20:00:00.282569+00:00',
      used_dollars: null,
      utilization: 2.0
    },
    seven_day: {
      limit_dollars: null,
      locked_reason: null,
      remaining_dollars: null,
      resets_at: '2026-09-03T20:00:00.282569+00:00',
      used_dollars: null,
      utilization: 56.0
    },
    // A populated window with a NULL reset, which the measured body carried.
    nimbus_quill: {
      resets_at: null,
      utilization: 0.0
    },
    limits: [
      {
        group: 'session',
        is_active: false,
        kind: 'session',
        percent: 2,
        resets_at: '2026-08-31T20:00:00.282569+00:00',
        scope: null,
        severity: 'normal'
      },
      {
        group: 'weekly',
        is_active: false,
        kind: 'weekly_all',
        percent: 56,
        resets_at: '2026-09-03T20:00:00.282569+00:00',
        scope: null,
        severity: 'normal'
      },
      {
        group: 'weekly',
        is_active: true,
        kind: 'weekly_scoped',
        percent: 100,
        resets_at: '2026-09-03T20:00:00.282569+00:00',
        scope: { model: { display_name: 'Fable', id: null }, surface: null },
        severity: 'critical'
      }
    ]
  };
}

describe('the Claude parser, against the measured shape', () => {
  it('reads utilization out of both named windows', () => {
    const out = parseClaudeUsage(claudeBody());
    expect(out.fiveHour?.percent).toBe(2);
    expect(out.sevenDay?.percent).toBe(56);
  });

  it('reads resets_at as an ISO string and not as seconds or milliseconds', () => {
    const out = parseClaudeUsage(claudeBody());
    expect(out.fiveHour?.resetsAt).toBe(
      Date.parse('2026-08-31T20:00:00.282569+00:00')
    );
  });

  it('finds the per model weekly row only inside limits, with a capital F', () => {
    const out = parseClaudeUsage(claudeBody());
    expect(out.scoped).toEqual({
      label: 'Fable',
      percent: 100,
      resetsAt: Date.parse('2026-09-03T20:00:00.282569+00:00')
    });
  });

  it('invents nothing from the three top level names orca probes', () => {
    const body = claudeBody();
    delete body['limits'];
    // The names orca looks for and this account's response does not carry.
    body['fable_weekly'] = { utilization: 91 };
    body['seven_day_fable'] = { utilization: 92 };
    body['fable_seven_day'] = { utilization: 93 };
    expect(parseClaudeUsage(body).scoped).toBeNull();
  });

  it('survives a present window whose reset is null', () => {
    expect(claudeWindow({ utilization: 0, resets_at: null })).toEqual({
      percent: 0,
      resetsAt: null
    });
  });

  it('tolerates used_percentage without preferring it', () => {
    expect(claudeWindow({ used_percentage: 12 })?.percent).toBe(12);
    expect(claudeWindow({ utilization: 3, used_percentage: 99 })?.percent).toBe(3);
  });
});

describe('the Claude parser, against shapes nobody has seen', () => {
  const hostile: [string, unknown][] = [
    ['null', null],
    ['a string', 'five_hour'],
    ['a number', 7],
    ['an array', [{ five_hour: { utilization: 5 } }]],
    ['windows that are strings', { five_hour: 'nope', seven_day: 'nope' }],
    ['a utilization that is a string', { five_hour: { utilization: '50' } }],
    ['a utilization that is NaN', { five_hour: { utilization: Number.NaN } }],
    ['limits that is an object', { limits: { kind: 'weekly_scoped' } }],
    ['a limits row that is null', { limits: [null] }],
    [
      'a scoped row with no display name',
      { limits: [{ kind: 'weekly_scoped', percent: 9, scope: { model: {} } }] }
    ]
  ];
  for (const [name, body] of hostile) {
    it(`draws no number for ${name}`, () => {
      const out = parseClaudeUsage(body);
      expect(out.fiveHour).toBeNull();
      expect(out.scoped).toBeNull();
    });
  }

  it('clamps a percentage that is out of range', () => {
    expect(claudeWindow({ utilization: -3 })?.percent).toBe(0);
    expect(claudeWindow({ utilization: 250 })?.percent).toBe(100);
  });

  it('draws NOTHING for a number that is not finite, rather than a hundred', () => {
    // 1e309 parses out of JSON as Infinity. A bar at full is a claim about
    // the account, and the honest answer to a number nobody can read is no
    // number at all.
    expect(claudeWindow({ utilization: 1e309 })).toBeNull();
  });

  it('reads no reset out of a string that is not a date', () => {
    expect(isoToMs('soon')).toBeNull();
    expect(isoToMs(1_788_747_997)).toBeNull();
  });

  it('takes the first scoped row and does not throw on the rest', () => {
    const rows = [
      { kind: 'weekly_all', percent: 1 },
      { kind: 'weekly_scoped', percent: 4, scope: { model: { display_name: 'Fable' } } },
      { kind: 'weekly_scoped', percent: 5, scope: { model: { display_name: 'Other' } } }
    ];
    expect(claudeScoped(rows)?.label).toBe('Fable');
  });
});

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------

/** The measured Codex body, values invented, identifiers as sentinels. */
function codexBody(): Record<string, unknown> {
  return {
    email: 'SENTINEL_EMAIL',
    user_id: 'SENTINEL_USER',
    account_id: 'SENTINEL_ACCOUNT',
    plan_type: 'pro',
    rate_limit: {
      allowed: true,
      limit_reached: false,
      // THE TRAP: primary is the WEEKLY window and secondary is null.
      primary_window: {
        limit_window_seconds: 604800,
        reset_after_seconds: 559202,
        reset_at: 1788747997,
        used_percent: 2
      },
      secondary_window: null
    },
    additional_rate_limits: [
      {
        limit_name: 'GPT-5.3-Codex-Spark',
        metered_feature: 'codex_bengalfox',
        rate_limit: {
          allowed: true,
          limit_reached: false,
          primary_window: {
            limit_window_seconds: 18000,
            reset_after_seconds: 100,
            reset_at: 1788700000,
            used_percent: 77
          },
          secondary_window: null
        }
      }
    ]
  };
}

describe('the Codex parser, against the measured shape', () => {
  it('THE TRAP: a weekly primary window never lands in the five hour slot', () => {
    const out = parseCodexUsage(codexBody(), NOW);
    expect(out.fiveHour).toBeNull();
    expect(out.sevenDay?.percent).toBe(2);
  });

  it('classifies by limit_window_seconds and never by position', () => {
    const body = codexBody();
    const rate = body['rate_limit'] as Record<string, unknown>;
    rate['primary_window'] = {
      limit_window_seconds: CODEX_FIVE_HOUR_SECONDS,
      reset_after_seconds: 60,
      used_percent: 40
    };
    rate['secondary_window'] = {
      limit_window_seconds: CODEX_WEEKLY_SECONDS,
      reset_after_seconds: 120,
      used_percent: 8
    };
    const out = parseCodexUsage(body, NOW);
    expect(out.fiveHour?.percent).toBe(40);
    expect(out.sevenDay?.percent).toBe(8);
  });

  it('classifies the same way when the two are swapped', () => {
    const body = codexBody();
    const rate = body['rate_limit'] as Record<string, unknown>;
    rate['secondary_window'] = {
      limit_window_seconds: CODEX_FIVE_HOUR_SECONDS,
      reset_after_seconds: 60,
      used_percent: 40
    };
    rate['primary_window'] = {
      limit_window_seconds: CODEX_WEEKLY_SECONDS,
      reset_after_seconds: 120,
      used_percent: 8
    };
    const out = parseCodexUsage(body, NOW);
    expect(out.fiveHour?.percent).toBe(40);
    expect(out.sevenDay?.percent).toBe(8);
  });

  it('prefers the relative countdown over the absolute stamp', () => {
    const out = parseCodexUsage(codexBody(), NOW);
    expect(out.sevenDay?.resetsAt).toBe(NOW + 559202 * 1000);
  });

  it('reads reset_at as UNIX SECONDS when no countdown is given', () => {
    const body = codexBody();
    const rate = body['rate_limit'] as Record<string, unknown>;
    const win = rate['primary_window'] as Record<string, unknown>;
    delete win['reset_after_seconds'];
    const out = parseCodexUsage(body, NOW);
    expect(out.sevenDay?.resetsAt).toBe(1788747997 * 1000);
  });

  it('never draws a per model bucket out of additional_rate_limits', () => {
    const out = parseCodexUsage(codexBody(), NOW);
    expect(out.fiveHour).toBeNull();
    expect(JSON.stringify(out)).not.toContain('77');
  });

  it('carries no email, user id or account id into the parse', () => {
    const text = JSON.stringify(parseCodexUsage(codexBody(), NOW));
    expect(text).not.toContain('SENTINEL_EMAIL');
    expect(text).not.toContain('SENTINEL_USER');
    expect(text).not.toContain('SENTINEL_ACCOUNT');
  });
});

describe('the Codex parser, against shapes nobody has seen', () => {
  const hostile: [string, unknown][] = [
    ['null', null],
    ['a string', 'rate_limit'],
    ['an array', [{ rate_limit: {} }]],
    ['a rate_limit that is a string', { rate_limit: 'none' }],
    ['windows that are numbers', { rate_limit: { primary_window: 4 } }],
    [
      'a window with no duration',
      { rate_limit: { primary_window: { used_percent: 50 } } }
    ],
    [
      'a duration that is a string',
      {
        rate_limit: {
          primary_window: { limit_window_seconds: '18000', used_percent: 50 }
        }
      }
    ],
    [
      'a duration nobody has a slot for',
      {
        rate_limit: {
          primary_window: { limit_window_seconds: 3600, used_percent: 50 }
        }
      }
    ]
  ];
  for (const [name, body] of hostile) {
    it(`draws no number for ${name}`, () => {
      const out = parseCodexUsage(body, NOW);
      expect(out.fiveHour).toBeNull();
      expect(out.sevenDay).toBeNull();
    });
  }

  it('takes a duration one minute either side of the named one', () => {
    expect(classifyCodexWindow({ limit_window_seconds: 18_040 })).toBe('five-hour');
    expect(classifyCodexWindow({ limit_window_seconds: 604_760 })).toBe('weekly');
    expect(classifyCodexWindow({ limit_window_seconds: 18_200 })).toBeNull();
  });

  it('clamps a percentage that is out of range', () => {
    const out = parseCodexUsage(
      {
        rate_limit: {
          primary_window: {
            limit_window_seconds: 18000,
            used_percent: 5000,
            reset_after_seconds: 0
          }
        }
      },
      NOW
    );
    expect(out.fiveHour?.percent).toBe(100);
  });
});
