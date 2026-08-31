/**
 * The card names the account, and main is where that word is decided
 * (Phase 181.2).
 *
 * TWO PROVIDERS, TWO SOURCES, measured in docs/research/72 section 8: Claude
 * names `subscriptionType` on the login item and names no plan in its usage
 * body at all, and Codex names `plan_type` on the usage body and names no
 * plan in its file. So this file drives both routes end to end and, more
 * importantly, drives what must NEVER come out of either: the Codex body
 * carries an address, a user id and an account id at its top level, and a
 * uuid on `plan_type` would be an identifier arriving through the one field
 * that is now read.
 *
 * Every value here is invented for this file. No token, no address and no
 * real plan from anybody's account is in this tree.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import { parseClaudeUsage, parseCodexUsage } from '../parse';
import { readClaudeCredential, readCodexCredential } from '../credentials';
import type { CredentialDeps } from '../credentials';
import { createUsageService } from '../service';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

const A_UUID = '11111111-2222-3333-4444-555555555555';

function codexBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'SENTINEL_EMAIL',
    user_id: 'SENTINEL_USER',
    account_id: 'SENTINEL_ACCOUNT',
    plan_type: 'pro',
    rate_limit: {
      primary_window: {
        limit_window_seconds: 604800,
        reset_after_seconds: 10,
        used_percent: 7
      },
      secondary_window: null
    },
    ...over
  };
}

describe('the plan word out of the Codex body', () => {
  it('is the plain word the vendor states', () => {
    expect(parseCodexUsage(codexBody(), NOW).plan).toBe('pro');
  });

  it('is null when the body states none', () => {
    const body = codexBody();
    delete body['plan_type'];
    expect(parseCodexUsage(body, NOW).plan).toBeNull();
  });

  it('is null rather than an identifier, whatever the field holds', () => {
    for (const hostile of [
      A_UUID,
      'SENTINEL_ACCOUNT_11111111_2222_3333_4444',
      'someone@example.com',
      42,
      null,
      { plan: 'pro' }
    ]) {
      expect(parseCodexUsage(codexBody({ plan_type: hostile }), NOW).plan).toBeNull();
    }
  });

  it('survives a body with no rate limit at all', () => {
    const body = codexBody();
    delete body['rate_limit'];
    const out = parseCodexUsage(body, NOW);
    expect(out.plan).toBe('pro');
    expect(out.fiveHour).toBeNull();
    expect(out.sevenDay).toBeNull();
  });
});

describe('the plan word out of the Claude login', () => {
  function deps(payload: unknown): CredentialDeps {
    return {
      keychain: async () => JSON.stringify(payload),
      readText: async () => null,
      env: {},
      home: '/Users/example'
    };
  }

  it('is the plain word the item states', async () => {
    const out = await readClaudeCredential(
      deps({ claudeAiOauth: { accessToken: 'ACCESS', subscriptionType: 'max' } })
    );
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: 'max'
    });
  });

  it('is null when the item states none, and the login still works', async () => {
    const out = await readClaudeCredential(
      deps({ claudeAiOauth: { accessToken: 'ACCESS' } })
    );
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: null,
      plan: null
    });
  });

  it('never draws the tier, which is not a plan a person recognises', async () => {
    const out = await readClaudeCredential(
      deps({
        claudeAiOauth: {
          accessToken: 'ACCESS',
          rateLimitTier: 'SENTINEL_TIER'
        }
      })
    );
    expect(JSON.stringify(out)).not.toContain('SENTINEL_TIER');
  });

  it('names no plan for Codex, whose file states none', async () => {
    const out = await readCodexCredential({
      keychain: async () => null,
      readText: async () =>
        JSON.stringify({
          auth_mode: 'chatgpt',
          OPENAI_API_KEY: null,
          tokens: { access_token: 'ACCESS', account_id: 'ACCOUNT' }
        }),
      env: {},
      home: '/Users/example'
    });
    expect(out).toEqual({
      kind: 'ok',
      token: 'ACCESS',
      accountId: 'ACCOUNT',
      // `auth_mode` is a login method rather than a plan, so nothing is drawn.
      plan: null
    });
  });
});

describe('the Claude usage body names no plan of its own', () => {
  it('so the parse leaves the field null and the login decides', () => {
    expect(
      parseClaudeUsage({ five_hour: { utilization: 2 }, subscriptionType: 'max' })
        .plan
    ).toBeNull();
  });
});

describe('what reaches the snapshot', () => {
  const on: UsageSettings = { claude: true, codex: true, bar: 'five-hour' };

  function service(planWord: unknown) {
    return createUsageService({
      credentials: {
        keychain: async () =>
          JSON.stringify({
            claudeAiOauth: { accessToken: 'ACCESS', subscriptionType: 'max' }
          }),
        readText: async () =>
          JSON.stringify({
            OPENAI_API_KEY: null,
            tokens: { access_token: 'ACCESS', account_id: 'SENTINEL_ACCOUNT' }
          }),
        env: {},
        home: '/Users/example'
      },
      transport: async (req) => ({
        status: 200,
        body:
          req.host === 'api.anthropic.com'
            ? JSON.stringify({ five_hour: { utilization: 32 } })
            : JSON.stringify(codexBody({ plan_type: planWord })),
        retryAfterAt: null
      }),
      settings: () => on,
      now: () => NOW,
      log: () => undefined
    });
  }

  it('carries one plain plan word per provider and nothing else', async () => {
    const snap = await service('pro').read();
    expect(snap.providers.map((p) => p.plan)).toEqual(['max', 'pro']);
  });

  it('carries NO identifier even when the plan field holds one', async () => {
    const snap = await service(A_UUID).read();
    expect(snap.providers.map((p) => p.plan)).toEqual(['max', null]);
    const text = JSON.stringify(snap);
    expect(text).not.toContain(A_UUID);
    expect(text).not.toContain('SENTINEL_EMAIL');
    expect(text).not.toContain('SENTINEL_USER');
    expect(text).not.toContain('SENTINEL_ACCOUNT');
    expect(text).not.toContain('ACCESS');
  });
});
