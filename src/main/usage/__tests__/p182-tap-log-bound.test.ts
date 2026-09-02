/**
 * What a DROPPED tap post may write to the log (Phase 182, fix of 2026-09-01).
 *
 * The fix round bounded the PRE token path in `hooks.ts`, where a post is
 * refused by the route before its token has been looked up. This file covers
 * the other half, which nothing had looked at: a post carrying a REAL token is
 * not refused by the route at all. It is answered, and it is the SERVICE that
 * drops it, in `applyUsageTap`. Two of those outcomes repeat for the life of
 * the session rather than happening once, and neither needs an attacker.
 *
 * THE CADENCE IS THE POINT OF THIS FILE. A burst of posts back to back is not
 * the shape this defect has. The script throttles itself to one post per pane
 * per fifteen seconds, so the honest measurement is a clock advanced fifteen
 * seconds at a time, which is what the first two cases do. Before the fix that
 * produced 120 warn lines an hour from one idle pane and 240 an hour from a
 * session logged in under a second config dir, at 142 real bytes a line
 * against a 4 MiB log pair.
 *
 * Every seam is injected. Nothing here opens a keychain, reads anything under
 * anybody's home, spawns a process, binds a socket or reaches a network.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every line this path writes, so the bound is counted rather than argued. */
const logged: { level: string; msg: string; reason: string }[] = [];
function record(level: string) {
  return (msg: string, fields?: unknown) => {
    const reason = (fields as { reason?: string } | undefined)?.reason ?? '';
    logged.push({ level, msg, reason });
  };
}
vi.mock('../../log', () => ({
  getLog: () => ({
    error: record('error'),
    warn: record('warn'),
    info: record('info'),
    debug: record('debug')
  })
}));
vi.mock('../../typed-events', () => ({ broadcastEvent: () => undefined }));
vi.mock('../../settings/store', () => ({
  getSettings: () => ({ usage: { claude: true, codex: false, bar: 'five-hour' } })
}));
vi.mock('../credentials', () => ({
  defaultCredentialDeps: () => ({
    keychain: async () =>
      JSON.stringify({ claudeAiOauth: { accessToken: 'ACCESS' } }),
    readText: async () => null,
    env: {},
    home: '/Users/example'
  })
}));
// PHASE 202. The meter reads the CHOSEN login, and this file drives the ipc
// wiring rather than the service directly, so the store is stubbed at the
// default login. That is what every install has before a second one is added,
// and it is what makes the account rule below compare against the empty
// string, which is how a pane on the default login encodes its own directory.
vi.mock('../../logins', () => ({
  loginsRoot: () => '/nowhere/gmux/logins',
  effectiveLogin: () => ({ name: null, dir: null, fellBack: false, asked: null })
}));
vi.mock('../transport', () => ({
  httpsTransport: async () => ({ status: 200, body: '{}', retryAfterAt: null })
}));

import { applyUsageTap, disposeUsageService, resetUsageTapLog } from '../ipc';
import { TAP_THROTTLE_SECONDS, tapConfigKey } from '../statusline';

const START = 1_790_000_000_000;
const RESET_SECONDS = Math.floor(START / 1000) + 7200;
/** One hour at the script's own throttle, which is what a real pane does. */
const POSTS_PER_HOUR = 3600 / TAP_THROTTLE_SECONDS;

function body(over: Record<string, string> = {}): string {
  return Object.entries({
    v: '1',
    s: 'sess-1',
    cfg: '',
    five_pct: '58',
    five_reset: String(RESET_SECONDS),
    seven_pct: '41',
    seven_reset: String(RESET_SECONDS),
    ...over
  })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

/** One pane posting the same body for an hour, at the shipped throttle. */
function anHourOf(raw: string): void {
  for (let i = 0; i < POSTS_PER_HOUR; i += 1) {
    applyUsageTap('sess-1', raw);
    vi.advanceTimersByTime(TAP_THROTTLE_SECONDS * 1000);
  }
}

const warns = () => logged.filter((l) => l.level === 'warn');
const debugs = () => logged.filter((l) => l.level === 'debug');

beforeEach(() => {
  logged.length = 0;
  disposeUsageService();
  resetUsageTapLog();
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

describe('an expected drop is not an incident', () => {
  it('an idle pane writes no warning all hour, and the drops are debug', () => {
    anHourOf(body());
    // The throttle is fifteen seconds and the dedupe window is thirty, so
    // every second post is a duplicate for as long as the numbers hold.
    expect(warns()).toEqual([]);
    expect(debugs().length).toBe(POSTS_PER_HOUR / 2);
    expect(new Set(debugs().map((l) => l.reason))).toEqual(new Set(['duplicate']));
  });

  it('a session still posting after the switch went off writes no warning', () => {
    // `off` was already debug before this fix and must stay there.
    anHourOf(body({ cfg: tapConfigKey('/Users/example/.claude') }));
    expect(warns().filter((l) => l.reason === 'off')).toEqual([]);
  });
});

describe('a drop worth seeing is seen ONCE', () => {
  it('a second config dir writes one line an hour, not one per post', () => {
    anHourOf(body({ cfg: tapConfigKey('/Users/example/.claude-work') }));
    expect(warns()).toEqual([
      { level: 'warn', msg: 'usage.tap.dropped', reason: 'account' }
    ]);
  });

  it('a payload shape nobody recognises writes one line an hour', () => {
    // This is the vendor change case: a claude release that moved the block
    // would otherwise write a line every fifteen seconds, per pane, forever.
    anHourOf('v=1&s=sess-1');
    expect(warns().map((l) => l.reason)).toEqual(['shape']);
  });

  it('the whole path costs three lines for the life of the process', () => {
    anHourOf(body({ cfg: tapConfigKey('/Users/example/.claude-work') }));
    anHourOf('v=1&s=sess-1');
    for (let i = 0; i < POSTS_PER_HOUR; i += 1) {
      applyUsageTap('sess-SOMEONE-ELSE', body());
      vi.advanceTimersByTime(TAP_THROTTLE_SECONDS * 1000);
    }
    expect(warns().map((l) => l.reason).sort()).toEqual([
      'account',
      'session',
      'shape'
    ]);
  });

  it('the seam forgets, so the bound is the set and not a first call', () => {
    applyUsageTap('sess-1', 'v=1&s=sess-1');
    expect(warns().length).toBe(1);
    applyUsageTap('sess-1', 'v=1&s=sess-1');
    expect(warns().length).toBe(1);
    resetUsageTapLog();
    applyUsageTap('sess-1', 'v=1&s=sess-1');
    expect(warns().length).toBe(2);
  });
});
