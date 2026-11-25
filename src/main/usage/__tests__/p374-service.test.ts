/**
 * The service with a received row beside the two that are asked for (Phase 374,
 * rows U1, U2, U7, U8 and U9).
 *
 * Every seam is injected: no folder, no Electron, no keychain, no network, and
 * every number, plan word and account mark is invented here.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import type { UsageProviderSnapshot, UsageSnapshot } from '@shared/usage';
import type { CredentialDeps } from '../credentials';
import type { UsageRequest, UsageResponse } from '../transport';
import { USAGE_POLL_MS, createUsageService } from '../service';
import {
  HASH_B,
  fakeFolder,
  forbiddenReceiver,
  line,
  type FakeFolder,
  type LineBucket
} from './p374-receiver';

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.UTC(2031, 0, 10, 12, 0, 0);
const iso = (at: number): string => new Date(at).toISOString();

const CLAUDE_BODY = JSON.stringify({
  five_hour: { utilization: 2, resets_at: iso(T0 + HOUR) },
  seven_day: { utilization: 56, resets_at: iso(T0 + 72 * HOUR) }
});
const CODEX_BODY = JSON.stringify({
  plan_type: 'pro',
  rate_limit: {
    primary_window: {
      limit_window_seconds: 604800,
      reset_after_seconds: 100,
      used_percent: 7
    },
    secondary_window: null
  }
});

interface H {
  service: ReturnType<typeof createUsageService>;
  folder: FakeFolder;
  sent: UsageRequest[];
  opened: string[];
  asked: string[];
  logs: string[];
  told: UsageSnapshot[];
  now: number;
  on: UsageSettings;
  respond: (req: UsageRequest) => Promise<UsageResponse> | UsageResponse;
}

function on(over: Partial<UsageSettings> = {}): UsageSettings {
  return { claude: false, codex: false, antigravity: false, bar: 'five-hour', ...over };
}

function harness(settings: UsageSettings): H {
  const h: H = {
    sent: [],
    opened: [],
    asked: [],
    logs: [],
    told: [],
    now: T0,
    on: settings,
    respond: (req: UsageRequest) => ({
      status: 200,
      body: req.host === 'api.anthropic.com' ? CLAUDE_BODY : CODEX_BODY,
      retryAfterAt: null
    })
  } as unknown as H;
  h.folder = fakeFolder(() => h.now);
  const credentials: CredentialDeps = {
    keychain: async () => {
      h.opened.push('keychain');
      return JSON.stringify({ claudeAiOauth: { accessToken: 'CLAUDE', subscriptionType: 'max' } });
    },
    readText: async (path) => {
      h.opened.push(path);
      return JSON.stringify({
        OPENAI_API_KEY: null,
        tokens: { access_token: 'CODEX', account_id: 'ACCOUNT' }
      });
    },
    env: {},
    home: '/Users/example'
  };
  h.service = createUsageService({
    credentials,
    transport: async (req) => {
      h.sent.push(req);
      return h.respond(req);
    },
    settings: () => h.on,
    logins: (provider) => {
      h.asked.push(provider);
      return { name: null, dir: null };
    },
    receiver: h.folder.port,
    now: () => h.now,
    log: (event) => h.logs.push(event),
    onChanged: (snapshot) => h.told.push(snapshot)
  });
  return h;
}

/** One file lands, whole, at this moment. */
function write(
  h: H,
  q: Record<string, LineBucket>,
  id = 's1',
  over: Record<string, unknown> = {}
): void {
  h.folder.files = [
    ...h.folder.files.filter((f) => f.id !== id),
    { id, text: line(q, over), mtimeMs: h.now }
  ];
  h.folder.mtime = h.now;
}

const rowOf = (s: UsageSnapshot | undefined, p: string): UsageProviderSnapshot => {
  const found = s?.providers.find((one) => one.provider === p);
  if (found === undefined) throw new Error(`no ${p} row`);
  return found;
};

describe('U1: a received row asks nobody', () => {
  for (const arm of ['read', 'refresh'] as const) {
    it(`sends nothing, opens no sign in and asks no login, on ${arm}`, async () => {
      const h = harness(on({ antigravity: true }));
      write(h, { 'gemini-5h': { f: 0.75 } });
      for (let i = 0; i < 5; i += 1) {
        h.now += USAGE_POLL_MS * 2;
        write(h, { 'gemini-5h': { f: 0.75 - i / 10 } });
        const snap = await h.service[arm]();
        expect(rowOf(snap, 'antigravity').state).toBe('ok');
      }
      expect(h.sent).toEqual([]);
      expect(h.opened).toEqual([]);
      expect(h.asked).toEqual([]);
      expect(h.logs).toEqual([]);
    });
  }

  it('draws what arrived, and says it is waiting before anything has', async () => {
    const h = harness(on({ antigravity: true }));
    h.folder.waiting = 'captured';
    expect(rowOf(await h.service.read(), 'antigravity')).toMatchObject({
      state: 'waiting',
      waitingFor: 'captured'
    });
    write(h, { 'gemini-5h': { f: 0.75 }, 'gemini-weekly': { f: 0.5 } }, 's1', { p: 'Example Plan' });
    expect(rowOf(await h.service.read(), 'antigravity')).toMatchObject({
      state: 'ok',
      waitingFor: null,
      plan: 'Example Plan',
      fiveHour: { percent: 25, resetsAt: null },
      sevenDay: { percent: 50, resetsAt: null },
      readAt: T0,
      login: null,
      retryAfter: null
    });
  });

  it('is read on every ask, whatever the interval and the floor say', async () => {
    const h = harness(on({ antigravity: true }));
    for (const f of [0.9, 0.8, 0.7]) {
      h.now += 10;
      write(h, { 'gemini-5h': { f } });
      const snap = await h.service.refresh();
      expect(rowOf(snap, 'antigravity').fiveHour?.percent).toBe(
        Math.round((1 - f) * 1000) / 10
      );
    }
  });

  it('a folder that cannot be listed leaves what is held standing', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    await h.service.read();
    h.folder.port.read = () => {
      throw new Error('no');
    };
    expect(rowOf(await h.service.read(), 'antigravity').fiveHour?.percent).toBe(25);
    expect(h.logs).toEqual([]);
  });
});

describe('U2: Claude and Codex are the rows, requests and headers they were', () => {
  /** A whole script of asks, with the third switch as given. */
  async function drive(antigravity: boolean): Promise<{
    sent: unknown[];
    rows: unknown[];
    asked: string[];
    opened: string[];
    logs: string[];
  }> {
    const h = harness(on({ claude: true, codex: true, antigravity }));
    if (antigravity) write(h, { 'gemini-5h': { f: 0.75 } });
    const rows: unknown[] = [];
    const take = (s: UsageSnapshot): void => {
      rows.push(rowOf(s, 'claude'), rowOf(s, 'codex'));
    };
    take(await h.service.read());
    h.now += MIN / 2;
    take(await h.service.refresh());
    h.now += MIN;
    take(await h.service.refresh());
    h.respond = () => ({ status: 429, body: '', retryAfterAt: h.now + HOUR });
    h.now += USAGE_POLL_MS + 1;
    take(await h.service.read());
    h.now += MIN * 2;
    take(await h.service.refresh());
    h.respond = () => ({ status: 401, body: '', retryAfterAt: null });
    h.now += 2 * HOUR;
    take(await h.service.read());
    h.on = { ...h.on, codex: false };
    take(await h.service.read());
    h.on = { ...h.on, codex: true };
    h.now += 1;
    take(await h.service.read());
    return {
      sent: h.sent.map((r) => ({ host: r.host, path: r.path, headers: r.headers })),
      rows,
      asked: h.asked,
      opened: h.opened,
      logs: h.logs
    };
  }

  it('byte for byte, with the third switch on and off', async () => {
    const off = await drive(false);
    const both = await drive(true);
    expect(JSON.stringify(both)).toBe(JSON.stringify(off));
    expect(off.sent.length).toBeGreaterThanOrEqual(8);
  });

  it('and they are the two requests the parent sends, whole', async () => {
    const h = harness(on({ claude: true, codex: true, antigravity: true }));
    await h.service.read();
    expect(
      h.sent.map((r) => ({ host: r.host, path: r.path, headers: r.headers }))
    ).toEqual([
      {
        host: 'api.anthropic.com',
        path: '/api/oauth/usage',
        headers: {
          authorization: 'Bearer CLAUDE',
          'anthropic-beta': 'oauth-2025-04-20',
          'user-agent': 'claude-code/2.1.0',
          accept: 'application/json'
        }
      },
      {
        host: 'chatgpt.com',
        path: '/backend-api/wham/usage',
        headers: {
          authorization: 'Bearer CODEX',
          'user-agent': 'codex-cli',
          'openai-beta': 'codex-1',
          originator: 'Codex Desktop',
          'chatgpt-account-id': 'ACCOUNT',
          accept: 'application/json'
        }
      }
    ]);
    expect(h.asked).toEqual(['claude', 'codex']);
  });
});

describe('U7: the last payload is kept, exactly', () => {
  it('follows an alternation step for step, says nothing, and tells once per change', async () => {
    const h = harness(on({ antigravity: true }));
    await h.service.read();
    const a = { 'gemini-5h': { f: 0.8123 }, 'gemini-weekly': { f: 0.6412 } };
    const b = { 'gemini-5h': { f: 0.8101 }, 'gemini-weekly': { f: 0.6379 } };
    const drawn: [number | undefined, number | undefined][] = [];
    for (const step of [a, b, a, b, a]) {
      h.now += 400;
      write(h, step);
      expect(h.service.pulse()).toBe(true);
      const row = rowOf(h.told.at(-1), 'antigravity');
      drawn.push([row.fiveHour?.percent, row.sevenDay?.percent]);
      expect(rowOf(h.service.current(), 'antigravity')).toEqual(row);
      // A look with nothing new tells nobody.
      const told = h.told.length;
      h.now += 100;
      h.service.pulse();
      expect(h.told.length).toBe(told);
    }
    expect(drawn).toEqual([
      [18.8, 35.9],
      [19, 36.2],
      [18.8, 35.9],
      [19, 36.2],
      [18.8, 35.9]
    ]);
    expect(h.told.length).toBe(5);
    expect(h.logs).toEqual([]);
  });
});

describe('U8: the pulse never moves another row', () => {
  it('tells nothing before a window has been answered', () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    expect(h.service.pulse()).toBe(true);
    expect(h.told).toEqual([]);
  });

  it("repeats Claude's and Codex's last ANSWERED rows while a read is half done", async () => {
    const h = harness(on({ claude: true, codex: true, antigravity: true }));
    const answered = await h.service.read();
    const claude = rowOf(answered, 'claude');
    const codex = rowOf(answered, 'codex');
    // A second read begins. Claude answers at once, Codex hangs, so main holds
    // a newer Claude row that no window has been told.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    h.respond = async (req) => {
      if (req.host !== 'api.anthropic.com') await gate;
      return {
        status: 200,
        body:
          req.host === 'api.anthropic.com'
            ? JSON.stringify({ five_hour: { utilization: 90 } })
            : CODEX_BODY,
        retryAfterAt: null
      };
    };
    h.now += USAGE_POLL_MS + 1;
    const second = h.service.read();
    await new Promise((r) => setTimeout(r, 5));
    expect(rowOf(h.service.current(), 'claude').fiveHour?.percent).toBe(90);
    write(h, { 'gemini-5h': { f: 0.75 } });
    expect(h.service.pulse()).toBe(true);
    expect(h.told.length).toBe(1);
    expect(rowOf(h.told[0], 'claude')).toEqual(claude);
    expect(rowOf(h.told[0], 'codex')).toEqual(codex);
    expect(rowOf(h.told[0], 'antigravity').fiveHour?.percent).toBe(25);
    release();
    const done = await second;
    expect(rowOf(done, 'claude').fiveHour?.percent).toBe(90);
    // The next telling repeats what that read answered.
    h.now += 10;
    write(h, { 'gemini-5h': { f: 0.5 } });
    h.service.pulse();
    expect(rowOf(h.told[1], 'claude')).toEqual(rowOf(done, 'claude'));
  });

  it('empties a row whose switch has gone off since, and never fills one', async () => {
    const h = harness(on({ claude: true, codex: false, antigravity: true }));
    await h.service.read();
    h.on = { ...h.on, claude: false, codex: true };
    write(h, { 'gemini-5h': { f: 0.75 } });
    h.service.pulse();
    expect(h.told[0]?.providers.map((p) => [p.provider, p.state])).toEqual([
      ['claude', 'off'],
      ['codex', 'off'],
      ['antigravity', 'ok']
    ]);
    expect(h.sent.length).toBe(1);
  });

  it('a live post of Claude is an answer too', async () => {
    const h = harness(on({ claude: true, antigravity: true }));
    await h.service.read();
    h.now += MIN;
    const reset = String(Math.floor((T0 + HOUR) / 1000));
    expect(h.service.applyTap('s', `v=1&s=s&cfg=&five_pct=41&five_reset=${reset}`)).toBe(
      'applied'
    );
    expect(h.told.length).toBe(1);
    h.now += 1;
    write(h, { 'gemini-5h': { f: 0.75 } });
    h.service.pulse();
    expect(rowOf(h.told.at(-1), 'claude').fiveHour?.percent).toBe(41);
  });
});

describe('the pulse looks seldom, and only while a window is in front', () => {
  it('lists only when the folder moved or the minute did, once something is held', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    await h.service.read();
    const reads = (): number => h.folder.calls.filter((c) => c === 'read').length;
    expect(reads()).toBe(1);
    for (let i = 0; i < 8; i += 1) {
      h.now += 5_000;
      expect(h.service.pulse()).toBe(true);
    }
    expect(reads()).toBe(1);
    h.now = T0 + MIN;
    h.service.pulse();
    expect(reads()).toBe(2);
    h.now += 1;
    write(h, { 'gemini-5h': { f: 0.5 } });
    h.service.pulse();
    expect(reads()).toBe(3);
  });

  it('finds a file the folder only began to answer for after the first ask', async () => {
    // Which sessions there are is said once at boot, and a window can ask before.
    const h = harness(on({ antigravity: true }));
    await h.service.read();
    h.folder.files = [{ id: 's', text: line({ 'gemini-5h': { f: 0.75 } }), mtimeMs: T0 - 1 }];
    h.now += 5_000;
    h.service.pulse();
    expect(rowOf(h.told[0], 'antigravity').fiveHour?.percent).toBe(25);
  });

  it('opens nothing while no window is in front, and goes on', async () => {
    const h = harness(on({ antigravity: true }));
    await h.service.read();
    h.folder.focused = false;
    h.folder.calls.length = 0;
    h.now += HOUR;
    write(h, { 'gemini-5h': { f: 0.75 } });
    expect(h.service.pulse()).toBe(true);
    expect(h.folder.calls).toEqual([]);
    h.folder.focused = true;
    h.service.pulse();
    expect(h.told.length).toBe(1);
  });

  it('turns ok into stale with nothing new in the folder', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    expect(rowOf(await h.service.read(), 'antigravity').state).toBe('ok');
    h.now += 31 * MIN;
    h.service.pulse();
    const row = rowOf(h.told[0], 'antigravity');
    expect(row.state).toBe('stale');
    expect(row.readAt).toBe(T0);
  });
});

describe('U9: off opens nothing', () => {
  it('reads no folder, on read, refresh, current, pulse or shutdown', async () => {
    const h = harness(on({ claude: true, codex: true }));
    const asked: string[] = [];
    const service = createUsageService({
      credentials: { keychain: async () => null, readText: async () => null, env: {}, home: '/u' },
      transport: async () => ({ status: 200, body: '{}', retryAfterAt: null }),
      settings: () => h.on,
      logins: () => ({ name: null, dir: null }),
      receiver: forbiddenReceiver(asked),
      now: () => h.now,
      log: () => undefined
    });
    const snap = await service.read();
    expect(rowOf(snap, 'antigravity').state).toBe('off');
    await service.refresh();
    service.current();
    expect(service.pulse()).toBe(false);
    await service.shutdown();
    // Counted and not only thrown: the service catches what a folder throws.
    expect(asked).toEqual([]);
  });

  it('takes the numbers off and clears the folder once, when a run finds it off', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    await h.service.read();
    h.on = on();
    h.folder.calls.length = 0;
    const snap = await h.service.read();
    expect(rowOf(snap, 'antigravity')).toMatchObject({ state: 'off', fiveHour: null, plan: null });
    await h.service.read();
    await h.service.refresh();
    expect(h.folder.calls).toEqual(['clear']);
    // And on again waits: the numbers are gone with the files.
    h.on = on({ antigravity: true });
    expect(rowOf(await h.service.read(), 'antigravity').state).toBe('waiting');
  });

  it('clears once too when a create made a place before any read found it on', async () => {
    const h = harness(on());
    h.folder.opened = true;
    await h.service.read();
    await h.service.read();
    expect(h.folder.calls).toEqual(['clear']);
  });

  it('a pulse that finds it off clears once and answers stop', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    await h.service.read();
    h.on = on();
    h.folder.calls.length = 0;
    expect(h.service.pulse()).toBe(false);
    expect(h.service.pulse()).toBe(false);
    expect(h.folder.calls).toEqual(['clear']);
    expect(rowOf(h.service.current(), 'antigravity').state).toBe('off');
  });

  it('after shutdown a read answers what is held and opens nothing', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 } });
    await h.service.read();
    await h.service.shutdown();
    h.folder.calls.length = 0;
    h.now += 1;
    write(h, { 'gemini-5h': { f: 0.1 } });
    const snap = await h.service.read();
    expect(rowOf(snap, 'antigravity').fiveHour?.percent).toBe(25);
    expect(h.service.pulse()).toBe(false);
    expect(h.folder.calls).toEqual([]);
    expect(h.told).toEqual([]);
  });
});

describe('accounts', () => {
  it("draws nothing of the first account after the second's first file", async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.75 }, '3p-weekly': { f: 0.2 } }, 'a', { p: 'Example One' });
    await h.service.read();
    h.now += 1_000;
    write(h, { 'gemini-weekly': { f: 0.9 } }, 'b', { h: HASH_B });
    h.service.pulse();
    const row = rowOf(h.told[0], 'antigravity');
    expect(row).toMatchObject({ fiveHour: null, second: null, plan: null });
    expect(row.sevenDay?.percent).toBe(10);
    expect(JSON.stringify(h.told)).not.toContain(HASH_B);
  });

  it('removing the newest session does not bring the older one back', async () => {
    const h = harness(on({ antigravity: true }));
    write(h, { 'gemini-5h': { f: 0.1 } }, 'old');
    h.now += MIN;
    write(h, { 'gemini-5h': { f: 0.75 } }, 'new');
    await h.service.read();
    h.folder.files = h.folder.files.filter((f) => f.id === 'old');
    h.now += 1;
    h.folder.mtime = h.now;
    h.service.pulse();
    expect(h.told).toEqual([]);
    expect(rowOf(await h.service.read(), 'antigravity').fiveHour?.percent).toBe(25);
  });
});
