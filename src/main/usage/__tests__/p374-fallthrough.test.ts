/**
 * THE CODEX FALL-THROUGH (Phase 374, the first row written and the first gate
 * ablation).
 *
 * At the parent the service chose a provider's credential reader, host, headers
 * and parser by three `provider === 'claude' ? … : codex` ternaries, and the
 * compiler saw nothing wrong with a third member. So with only the new switch
 * on, the service read the person's Codex sign in, sent it to the Codex host
 * and drew Codex's numbers under the new provider's name while Codex's own
 * switch was off. Both arms of this file did exactly that before the table in
 * `../providers.ts` existed, and they are what keeps it from coming back.
 *
 * Every seam is injected. Nothing is read under any home and nothing is sent.
 */

import { describe, expect, it } from 'vitest';
import { USAGE_PROVIDERS, usageIsReceiver, usageLoginProvider } from '@shared/usage';
import { LOGIN_PROVIDERS } from '@shared/logins';
import { USAGE_PROVIDER_TABLE } from '../providers';
import { createUsageService } from '../service';
import { noReceiver } from './p374-receiver';

const CODEX_BODY = JSON.stringify({
  plan_type: 'pro',
  rate_limit: {
    primary_window: {
      limit_window_seconds: 604800,
      reset_after_seconds: 10,
      used_percent: 7
    },
    secondary_window: null
  }
});

describe('a receiver that is switched on alone', () => {
  for (const arm of ['read', 'refresh'] as const) {
    it(`asks nobody and opens no sign in, on ${arm}`, async () => {
      const sent: string[] = [];
      const opened: string[] = [];
      const asked: string[] = [];
      const service = createUsageService({
        credentials: {
          keychain: async () => {
            opened.push('keychain');
            return null;
          },
          readText: async (path) => {
            opened.push(path);
            return JSON.stringify({
              tokens: { access_token: 'CODEX-TOKEN', account_id: 'ACCOUNT' }
            });
          },
          env: {},
          home: '/Users/example'
        },
        transport: async (req) => {
          sent.push(`${req.host}${req.path} ${req.headers['authorization'] ?? ''}`);
          return { status: 200, body: CODEX_BODY, retryAfterAt: null };
        },
        settings: () => ({
          claude: false,
          codex: false,
          antigravity: true,
          bar: 'five-hour'
        }),
        logins: (provider) => {
          asked.push(provider);
          return { name: null, dir: null };
        },
        receiver: noReceiver(),
        now: () => 1_000_000,
        log: () => undefined
      });
      const snap = await service[arm]();
      expect(sent).toEqual([]);
      expect(opened).toEqual([]);
      expect(asked).toEqual([]);
      expect(snap.providers.map((p) => [p.provider, p.state])).toEqual([
        ['claude', 'off'],
        ['codex', 'off'],
        ['antigravity', 'waiting']
      ]);
      expect(snap.providers[2]?.fiveHour).toBeNull();
      expect(snap.providers[2]?.sevenDay).toBeNull();
      expect(snap.providers[2]?.plan).toBeNull();
    });
  }
});

describe('the table and the two lookups say one thing', () => {
  it('gives every provider an entry, and only a login provider a fetch', () => {
    expect(Object.keys(USAGE_PROVIDER_TABLE).sort()).toEqual([...USAGE_PROVIDERS].sort());
    for (const provider of USAGE_PROVIDERS) {
      const entry = USAGE_PROVIDER_TABLE[provider];
      expect(usageIsReceiver(provider)).toBe(entry.kind === 'receiver');
      expect(usageLoginProvider(provider)).toBe(
        entry.kind === 'fetch' ? entry.login : null
      );
      if (entry.kind === 'receiver') expect(Object.keys(entry)).toEqual(['kind']);
    }
  });

  it('answers no login for Antigravity, and the login providers stay two', () => {
    expect(usageLoginProvider('antigravity')).toBeNull();
    expect(usageLoginProvider('claude')).toBe('claude');
    expect(usageLoginProvider('codex')).toBe('codex');
    expect([...LOGIN_PROVIDERS]).toEqual(['claude', 'codex']);
  });
});
