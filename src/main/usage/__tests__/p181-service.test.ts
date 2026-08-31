/**
 * The usage service (Phase 181): the negative control, the poll discipline
 * and the stale policy.
 *
 * THE NEGATIVE CONTROL IS THE FIRST TEST AND IT IS THE POINT OF THE FILE.
 * While a provider's switch is off, the credential reader and the transport
 * both THROW when called, and the service still answers. That is the proof
 * the charter asks for, made mechanical: off means no keychain is opened, no
 * credentials file is read and no request leaves.
 *
 * Every seam is injected. This file opens no keychain, reads nothing under
 * anybody's home, spawns nothing and reaches no network.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import type { CredentialDeps } from '../credentials';
import type { UsageRequest, UsageResponse } from '../transport';
import {
  USAGE_POLL_MS,
  USAGE_REFRESH_FLOOR_MS,
  USAGE_STALE_MS,
  createUsageService
} from '../service';

const CLAUDE_BODY = JSON.stringify({
  five_hour: { utilization: 2, resets_at: '2026-08-31T20:00:00.000000+00:00' },
  seven_day: { utilization: 56, resets_at: '2026-09-03T20:00:00.000000+00:00' }
});

const CODEX_BODY = JSON.stringify({
  email: 'SENTINEL_EMAIL',
  user_id: 'SENTINEL_USER',
  account_id: 'SENTINEL_ACCOUNT',
  plan_type: 'pro',
  rate_limit: {
    primary_window: {
      limit_window_seconds: 604800,
      reset_after_seconds: 10,
      reset_at: 1788747997,
      used_percent: 7
    },
    secondary_window: null
  }
});

interface Harness {
  service: ReturnType<typeof createUsageService>;
  sent: UsageRequest[];
  credentialCalls: number;
  logs: string[];
  now: number;
  on: UsageSettings;
  respond: (req: UsageRequest) => UsageResponse;
  /** Overridden per test; the default reader below answers with a token. */
  credentials?: CredentialDeps;
}

/** The reader and the transport both explode. Anything that calls them fails. */
function forbidden(): CredentialDeps {
  return {
    keychain: () => {
      throw new Error('the keychain was opened while the meter was off');
    },
    readText: () => {
      throw new Error('a credentials file was read while the meter was off');
    },
    env: {},
    home: '/Users/example'
  };
}

function harness(over: Partial<Harness> = {}): Harness {
  const h = {
    sent: [] as UsageRequest[],
    credentialCalls: 0,
    logs: [] as string[],
    now: 1_000_000,
    on: { claude: true, codex: true } as UsageSettings,
    respond: (req: UsageRequest): UsageResponse => ({
      status: 200,
      body: req.host === 'api.anthropic.com' ? CLAUDE_BODY : CODEX_BODY,
      retryAfterAt: null
    }),
    ...over
  } as Harness;
  const credentials: CredentialDeps = {
    keychain: async () => {
      h.credentialCalls += 1;
      return JSON.stringify({ claudeAiOauth: { accessToken: 'ACCESS' } });
    },
    readText: async () => {
      h.credentialCalls += 1;
      return JSON.stringify({
        OPENAI_API_KEY: null,
        tokens: { access_token: 'ACCESS', account_id: 'ACCOUNT' }
      });
    },
    env: {},
    home: '/Users/example'
  };
  h.service = createUsageService({
    credentials: over.credentials ?? credentials,
    transport: async (req) => {
      h.sent.push(req);
      return h.respond(req);
    },
    settings: () => h.on,
    now: () => h.now,
    log: (event) => h.logs.push(event)
  });
  return h;
}

describe('THE NEGATIVE CONTROL: a switch that is off', () => {
  it('reads no credential and sends no request, over a reader that throws', async () => {
    const h = harness({
      on: { claude: false, codex: false },
      credentials: forbidden()
    });
    const snap = await h.service.read();
    expect(h.sent).toEqual([]);
    expect(snap.providers.map((p) => p.state)).toEqual(['off', 'off']);
    expect(snap.providers.every((p) => p.fiveHour === null)).toBe(true);
  });

  it('sends nothing for the OFF provider while the other one is on', async () => {
    const h = harness({ on: { claude: true, codex: false } });
    await h.service.read();
    expect(h.sent.map((r) => r.host)).toEqual(['api.anthropic.com']);
  });

  it('sends nothing even when the person presses refresh', async () => {
    const h = harness({
      on: { claude: false, codex: false },
      credentials: forbidden()
    });
    await h.service.refresh();
    expect(h.sent).toEqual([]);
  });

  it('takes the numbers off the screen the moment a switch goes off', async () => {
    const h = harness();
    expect((await h.service.read()).providers[0]?.fiveHour?.percent).toBe(2);
    h.on = { claude: false, codex: false };
    const snap = await h.service.read();
    expect(snap.providers[0]).toEqual({
      provider: 'claude',
      state: 'off',
      fiveHour: null,
      sevenDay: null,
      scoped: null,
      readAt: null,
      retryAfter: null
    });
  });
});

describe('what crosses the wire', () => {
  it('names the two vendor hosts and nothing else', async () => {
    const h = harness();
    await h.service.read();
    expect(h.sent.map((r) => `${r.host}${r.path}`).sort()).toEqual([
      'api.anthropic.com/api/oauth/usage',
      'chatgpt.com/backend-api/wham/usage'
    ]);
  });

  it('carries the bearer token in the request and NEVER in the answer', async () => {
    const h = harness();
    const snap = await h.service.read();
    expect(h.sent[0]?.headers['authorization']).toBe('Bearer ACCESS');
    expect(JSON.stringify(snap)).not.toContain('ACCESS');
  });

  it('carries no email, user id or account id out of the Codex body', async () => {
    const h = harness();
    const text = JSON.stringify(await h.service.read());
    expect(text).not.toContain('SENTINEL_EMAIL');
    expect(text).not.toContain('SENTINEL_USER');
    expect(text).not.toContain('SENTINEL_ACCOUNT');
    expect(text).not.toContain('ACCOUNT');
  });

  it('logs a provider and an outcome word, never a token or a body', async () => {
    const h = harness({
      respond: () => ({ status: 500, body: 'ACCESS leaked?', retryAfterAt: null })
    });
    await h.service.read();
    expect(h.logs).toEqual(['usage.read.failed', 'usage.read.failed']);
  });
});

describe('the poll discipline', () => {
  it('makes one request per provider and then holds for fifteen minutes', async () => {
    const h = harness();
    await h.service.read();
    await h.service.read();
    h.now += USAGE_POLL_MS - 1;
    await h.service.read();
    expect(h.sent.length).toBe(2);
    h.now += 1;
    await h.service.read();
    expect(h.sent.length).toBe(4);
  });

  it('lets the refresh control past the interval but never past the floor', async () => {
    const h = harness();
    await h.service.read();
    h.now += 1_000;
    await h.service.refresh();
    expect(h.sent.length).toBe(2);
    h.now += USAGE_REFRESH_FLOOR_MS;
    await h.service.refresh();
    expect(h.sent.length).toBe(4);
  });

  it('makes ONE request when two calls land in the same tick', async () => {
    const h = harness();
    await Promise.all([h.service.read(), h.service.read(), h.service.read()]);
    expect(h.sent.length).toBe(2);
  });

  it('honours a Retry-After and refuses even a refresh until it passes', async () => {
    const h = harness({
      respond: () => ({
        status: 429,
        body: '',
        retryAfterAt: 1_000_000 + 3_600_000
      })
    });
    await h.service.read();
    expect(h.sent.length).toBe(2);
    h.now += 3_599_000;
    await h.service.refresh();
    expect(h.sent.length).toBe(2);
    h.now += 2_000;
    await h.service.refresh();
    expect(h.sent.length).toBe(4);
  });
});

describe('the face a failure draws', () => {
  it('keeps the last numbers under the stale state for thirty minutes', async () => {
    const h = harness();
    await h.service.read();
    h.respond = () => ({ status: 500, body: '', retryAfterAt: null });
    h.now += USAGE_POLL_MS;
    const stale = (await h.service.read()).providers[0];
    expect(stale?.state).toBe('stale');
    expect(stale?.fiveHour?.percent).toBe(2);
  });

  it('gives up the numbers once the stale window has passed', async () => {
    const h = harness();
    await h.service.read();
    h.respond = () => ({ status: 500, body: '', retryAfterAt: null });
    h.now += USAGE_STALE_MS + USAGE_POLL_MS;
    const gone = (await h.service.read()).providers[0];
    expect(gone?.state).toBe('unavailable');
    expect(gone?.fiveHour).toBeNull();
  });

  it('says signed out ONLY when no credential exists at all', async () => {
    const h = harness({
      credentials: {
        keychain: async () => null,
        readText: async () => null,
        env: {},
        home: '/Users/example'
      }
    });
    const snap = await h.service.read();
    expect(snap.providers.map((p) => p.state)).toEqual([
      'signed-out',
      'signed-out'
    ]);
    expect(h.sent).toEqual([]);
  });

  it('says expired on a refusal, and never signed out', async () => {
    const h = harness({
      respond: () => ({ status: 401, body: '', retryAfterAt: null })
    });
    const snap = await h.service.read();
    expect(snap.providers[0]?.state).toBe('expired');
  });

  it('says api key billing rather than signed out for a codex api key', async () => {
    const h = harness({
      on: { claude: false, codex: true },
      credentials: {
        keychain: async () => null,
        readText: async () =>
          JSON.stringify({ OPENAI_API_KEY: 'sk-EXAMPLE', tokens: {} }),
        env: {},
        home: '/Users/example'
      }
    });
    const snap = await h.service.read();
    expect(snap.providers[1]?.state).toBe('api-key');
    expect(h.sent).toEqual([]);
  });

  it('says no windows when the vendor answers with none', async () => {
    const h = harness({
      respond: () => ({ status: 200, body: '{}', retryAfterAt: null })
    });
    const snap = await h.service.read();
    expect(snap.providers[0]?.state).toBe('no-windows');
  });

  it('never crashes on a body that is not JSON at all', async () => {
    const h = harness({
      respond: () => ({ status: 200, body: '<html>nope', retryAfterAt: null })
    });
    const snap = await h.service.read();
    expect(snap.providers[0]?.state).toBe('unavailable');
    expect(snap.providers[0]?.fiveHour).toBeNull();
  });

  it('never crashes when the transport itself throws', async () => {
    const h = harness();
    h.respond = () => {
      throw new Error('no route to host');
    };
    const snap = await h.service.read();
    expect(snap.providers[0]?.state).toBe('unavailable');
  });
});
