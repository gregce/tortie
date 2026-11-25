/**
 * Phase 375, the address on the received row (build/p375/SPEC.md §7.1 rows B2,
 * B3 and B4, D5 to D7).
 *
 * Every seam is injected: no folder, no Electron, no keychain, no network, and
 * every number, plan word and address is invented here.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import type { UsageProviderSnapshot, UsageSnapshot } from '@shared/usage';
import { antigravityRow, newestReading, parseAntigravityFile } from '../antigravity/receive';
import type { CredentialDeps } from '../credentials';
import { createUsageService } from '../service';
import type { UsageRequest } from '../transport';
import { HASH_A, HASH_B, fakeFolder, line } from './p374-receiver';

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.UTC(2031, 0, 10, 12, 0, 0);
const iso = (at: number): string => new Date(at).toISOString();
const A = 'first.p375@example.invalid';
const B = 'second.p375@example.invalid';

const q1 = { 'gemini-5h': { f: 0.75, r: iso(T0 + HOUR) } };

describe('B2: the reader', () => {
  it('B2: a valid e is the reading’s email, the numbers beside it', () => {
    const r = parseAntigravityFile(line(q1, { e: A }));
    expect(r?.email).toBe(A);
    expect(r?.hash).toBe(HASH_A);
    expect(r?.buckets['gemini-5h']?.f).toBe(0.75);
  });

  it('B2: a malformed e is null and keeps the numbers, each field checked on its own', () => {
    const long = `a@${'d'.repeat(237)}.example.invalid`;
    expect(long).toHaveLength(255);
    for (const bad of [42, true, {}, [A], long, 'pérson@example.invalid', 'a"b@example.invalid', 'a\\b@example.invalid', 'a@b@example.invalid', 'person@example', 'a\nb@example.invalid', '']) {
      const r = parseAntigravityFile(line(q1, { e: bad }));
      expect([bad, r?.email, r?.buckets['gemini-5h']?.f, r?.hash]).toEqual([bad, null, 0.75, HASH_A]);
    }
  });

  it('B2: no e at all is null; null is null', () => {
    expect(parseAntigravityFile(line(q1))?.email).toBeNull();
    expect(parseAntigravityFile(line(q1, { e: null }))?.email).toBeNull();
  });

  it('B2: an e with no valid hash is no reading', () => {
    for (const h of [undefined, '', 'x', 'A'.repeat(64), 'a'.repeat(63), 7]) {
      const over: Record<string, unknown> = { e: A, h };
      if (h === undefined) over['h'] = undefined;
      const text = JSON.stringify({ ...JSON.parse(line(q1)), ...over });
      expect([h, parseAntigravityFile(text)]).toEqual([h, null]);
    }
  });
});

describe('B3: the row carries it, and only this row', () => {
  it('B3: ok, stale and no-windows carry it; waiting carries none', () => {
    const at = (text: string, now: number): UsageProviderSnapshot =>
      antigravityRow(newestReading([{ id: 's', text, mtimeMs: T0 }], now), now);
    const ok = at(line(q1, { e: A }), T0 + MIN);
    const stale = at(line(q1, { e: A }), T0 + 40 * MIN);
    const none = at(line({ 'gemini-5h': { f: 0.5, d: true } }, { e: A }), T0 + MIN);
    const waiting = at(line({ 'gemini-5h': { f: 0.5, r: iso(T0 + MIN) } }, { e: A }), T0 + 2 * MIN);
    expect([ok.state, ok.email]).toEqual(['ok', A]);
    expect([stale.state, stale.email]).toEqual(['stale', A]);
    expect([none.state, none.email]).toEqual(['no-windows', A]);
    expect([waiting.state, 'email' in waiting]).toEqual(['waiting', false]);
    expect('email' in antigravityRow(null, T0)).toBe(false);
  });

  it('B3: off carries none, whatever the folder holds', async () => {
    const h = harness({ claude: false, codex: false, antigravity: false, bar: 'five-hour' });
    h.folder.files = [{ id: 's1', text: line(q1, { e: A }), mtimeMs: h.now }];
    const snap = await h.service.read();
    const row = snap.providers.find((p) => p.provider === 'antigravity');
    expect([row?.state, 'email' in (row ?? {})]).toEqual(['off', false]);
    expect(JSON.stringify(snap).includes('@')).toBe(false);
  });

  it('B3: a reading with no address adds no key at all', () => {
    const row = antigravityRow(newestReading([{ id: 's', text: line(q1), mtimeMs: T0 }], T0 + MIN), T0 + MIN);
    expect(row.state).toBe('ok');
    expect('email' in row).toBe(false);
    expect(Object.keys(row)).toEqual(['provider', 'state', 'fiveHour', 'sevenDay', 'scoped', 'second', 'waitingFor', 'plan', 'login', 'loginChanged', 'readAt', 'retryAfter']);
  });

  /**
   * Claude's and Codex's rows with every switch on and an address in the
   * Antigravity file, as JSON. The literal is what the PARENT (`8d58c391`)
   * composed over this same harness, recorded by the builder through the
   * parent's own service, so a field this phase added to their rows reads red.
   */
  const PARENT_ROWS =
    '[{"provider":"claude","state":"ok","fiveHour":{"percent":2,"resetsAt":1925816400000},"sevenDay":{"percent":56,"resetsAt":1926072000000},"scoped":null,"second":null,"waitingFor":null,"plan":"max","login":null,"loginChanged":false,"readAt":1925812800000,"retryAfter":null},{"provider":"codex","state":"ok","fiveHour":null,"sevenDay":{"percent":7,"resetsAt":1925812900000},"scoped":null,"second":null,"waitingFor":null,"plan":"pro","login":null,"loginChanged":false,"readAt":1925812800000,"retryAfter":null}]';

  it('B3: Claude’s and Codex’s rows hold no email key and no @, and are the parent’s JSON byte for byte', async () => {
    const h = harness({ claude: true, codex: true, antigravity: true, bar: 'five-hour' });
    h.folder.files = [{ id: 's1', text: line(q1, { e: A }), mtimeMs: h.now }];
    h.folder.mtime = h.now;
    for (const snap of [await h.service.read(), await h.service.refresh(), h.service.current()]) {
      const asked = snap.providers.filter((p) => p.provider !== 'antigravity');
      for (const p of asked) expect([p.provider, 'email' in p, JSON.stringify(p).includes('@')]).toEqual([p.provider, false, false]);
      expect(JSON.stringify(asked)).toBe(PARENT_ROWS);
      const ag = snap.providers.find((p) => p.provider === 'antigravity');
      expect(ag?.email).toBe(A);
      // The address is in that one field and in no other.
      expect(JSON.stringify({ ...ag, email: undefined }).includes('@')).toBe(false);
    }
    // The Codex body names an address at its top level, and it is read nowhere.
    expect(h.sent.length).toBeGreaterThan(0);
  });
});

describe('B4: accounts never mix', () => {
  it('B4: over an A, B, A, B replay of two sessions, every look draws one file’s address and numbers', async () => {
    const h = harness({ claude: false, codex: false, antigravity: true, bar: 'five-hour' });
    await h.service.read();
    const steps: [id: string, hash: string, email: string | null, f: number][] = [
      ['s1', HASH_A, A, 0.9],
      ['s2', HASH_B, B, 0.4],
      ['s1', HASH_A, A, 0.8],
      ['s2', HASH_B, B, 0.3],
      ['s1', HASH_A, null, 0.7],
      ['s2', HASH_B, B, 0.2]
    ];
    const files = new Map<string, { id: string; text: string; mtimeMs: number }>();
    for (const [id, hash, email, f] of steps) {
      h.now += MIN + 1;
      const over: Record<string, unknown> = { h: hash };
      if (email !== null) over['e'] = email;
      files.set(id, { id, text: line({ 'gemini-5h': { f, r: iso(h.now + HOUR) } }, over), mtimeMs: h.now });
      h.folder.files = [...files.values()];
      h.folder.mtime = h.now;
      h.service.pulse();
      const row = h.service.current().providers.find((p) => p.provider === 'antigravity');
      expect([id, row?.fiveHour?.percent, row?.email]).toEqual([id, Math.round((1 - f) * 1000) / 10, email ?? undefined]);
      if (email === null) expect('email' in (row ?? {})).toBe(false);
    }
    // And every broadcast the pulse made says one file's address with that file's own numbers.
    expect(h.told.length).toBe(steps.length);
    for (const snap of h.told) {
      const row = snap.providers.find((p) => p.provider === 'antigravity');
      const step = steps.find(([, , , f]) => Math.round((1 - f) * 1000) / 10 === row?.fiveHour?.percent);
      // A broadcast whose row or numbers are missing is no reading of one file, so it may not pass as one.
      expect([row === undefined, step === undefined]).toEqual([false, false]);
      expect([row?.fiveHour?.percent, row?.email]).toEqual([row?.fiveHour?.percent, step?.[2] ?? undefined]);
    }
  });
});

interface H {
  service: ReturnType<typeof createUsageService>;
  folder: ReturnType<typeof fakeFolder>;
  sent: UsageRequest[];
  told: UsageSnapshot[];
  now: number;
}

const CLAUDE_BODY = JSON.stringify({
  five_hour: { utilization: 2, resets_at: iso(T0 + HOUR) },
  seven_day: { utilization: 56, resets_at: iso(T0 + 72 * HOUR) }
});
const CODEX_BODY = JSON.stringify({
  email: 'codex.p375@example.invalid',
  user_id: 'user-p375',
  account_id: 'account-p375',
  plan_type: 'pro',
  rate_limit: { primary_window: { limit_window_seconds: 604800, reset_after_seconds: 100, used_percent: 7 }, secondary_window: null }
});

function harness(settings: UsageSettings): H {
  const h = { sent: [], told: [], now: T0 } as unknown as H;
  h.folder = fakeFolder(() => h.now);
  const credentials: CredentialDeps = {
    keychain: async () => JSON.stringify({ claudeAiOauth: { accessToken: 'CLAUDE', subscriptionType: 'max' } }),
    readText: async () => JSON.stringify({ OPENAI_API_KEY: null, tokens: { access_token: 'CODEX', account_id: 'ACCOUNT' } }),
    env: {},
    home: '/Users/example'
  };
  h.service = createUsageService({
    credentials,
    transport: async (req) => {
      h.sent.push(req);
      return { status: 200, body: req.host === 'api.anthropic.com' ? CLAUDE_BODY : CODEX_BODY, retryAfterAt: null };
    },
    settings: () => settings,
    logins: () => ({ name: null, dir: null }),
    receiver: h.folder.port,
    now: () => h.now,
    log: () => undefined,
    onChanged: (snapshot) => h.told.push(snapshot)
  });
  return h;
}
