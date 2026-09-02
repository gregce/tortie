/**
 * The statusLine tap (Phase 182): the wire reader and the five ingest rules.
 *
 * WHAT THIS FILE IS FOR, and it is not the reader's happy path. The tap's
 * wire shape is the OPPOSITE of the endpoint's on both fields that matter
 * (docs/research/72 section 10.4): `used_percentage` as an INTEGER where the
 * endpoint gives `utilization` as a FLOAT, and `resets_at` in UNIX SECONDS
 * where the endpoint gives an ISO 8601 string. A reader that drifted onto the
 * other source's assumptions would be wrong by a factor of a thousand on the
 * reset and silently right on nothing. So the first block feeds this reader
 * the ENDPOINT's shapes and demands that it refuse them.
 *
 * Every seam is injected. Nothing here opens a keychain, reads anything under
 * anybody's home, spawns a process or reaches a network.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import type { CredentialDeps } from '../credentials';
import type { UsageRequest, UsageResponse } from '../transport';
import {
  USAGE_TAP_DEDUPE_MS,
  USAGE_TAP_SUPPRESS_MS,
  createUsageService
} from '../service';
import {
  TAP_BODY_CAP_BYTES,
  parseTapBody,
  tapConfigKey,
  decodeConfigKey,
  normalizeConfigDir,
  shellQuote,
  statusLineBlock,
  textNamesStatusLine
} from '../statusline';

const NOW = 1_790_000_000_000;
/** Two hours ahead of NOW, in the seconds the tap actually sends. */
const RESET_SECONDS = Math.floor(NOW / 1000) + 7200;

function body(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

function goodBody(over: Record<string, string> = {}): string {
  return body({
    v: '1',
    s: 'sess-1',
    cfg: '',
    five_pct: '58',
    five_reset: String(RESET_SECONDS),
    seven_pct: '41',
    seven_reset: String(RESET_SECONDS),
    ...over
  });
}

describe('the reader refuses the OTHER source shapes', () => {
  it('reads the tap seconds as seconds, not milliseconds', () => {
    const sample = parseTapBody(goodBody(), NOW);
    expect(sample?.fiveHour).toEqual({
      percent: 58,
      resetsAt: RESET_SECONDS * 1000
    });
  });

  it('drops an ISO 8601 reset, which is the ENDPOINT shape', () => {
    const sample = parseTapBody(
      goodBody({ five_reset: '2026-09-01T20:00:00.282569+00:00' }),
      NOW
    );
    // The percent still lands; only the reset the reader could not read is
    // absent. A guessed date would be worse than no countdown.
    expect(sample?.fiveHour).toEqual({ percent: 58, resetsAt: null });
  });

  it('drops a reset so far ahead it is not a plan window', () => {
    const sample = parseTapBody(goodBody({ five_reset: '99999999999' }), NOW);
    expect(sample?.fiveHour?.resetsAt).toBeNull();
  });
});

describe('hostile bodies', () => {
  const cases: [string, string][] = [
    ['no version', body({ s: 'sess-1', five_pct: '10' })],
    ['a version nobody shipped', goodBody({ v: '2' })],
    ['no session id', body({ v: '1', five_pct: '10' })],
    ['an empty session id', goodBody({ s: '' })],
    ['no window at all', body({ v: '1', s: 'sess-1', cfg: '' })],
    ['a percent that is not a number', goodBody({ five_pct: 'NaN', seven_pct: 'x' })],
    ['a negative percent', goodBody({ five_pct: '-3', seven_pct: '-1' })],
    ['a percent in scientific notation', goodBody({ five_pct: '1e309', seven_pct: '1e5' })],
    ['a config key that is not base64url', goodBody({ cfg: '../../etc' })],
    ['an empty body', '']
  ];
  for (const [name, raw] of cases) {
    it(`refuses ${name}`, () => {
      expect(parseTapBody(raw, NOW)).toBeNull();
    });
  }

  it('refuses a body over the cap without reading it', () => {
    const padded = `${goodBody()}&pad=${'x'.repeat(TAP_BODY_CAP_BYTES)}`;
    expect(parseTapBody(padded, NOW)).toBeNull();
  });

  it('clamps a percent over 100 rather than widening a bar past its track', () => {
    const sample = parseTapBody(goodBody({ five_pct: '400' }), NOW);
    expect(sample?.fiveHour?.percent).toBe(100);
  });

  it('takes one window and says nothing about the other', () => {
    const sample = parseTapBody(
      body({ v: '1', s: 'sess-1', cfg: '', seven_pct: '41' }),
      NOW
    );
    expect(sample?.fiveHour).toBeNull();
    expect(sample?.sevenDay).toEqual({ percent: 41, resetsAt: null });
  });
});

describe('the config key', () => {
  it('survives a path with a space, which is why it is encoded at all', () => {
    const dir = '/Users/x/Library/Application Support/claude & co';
    expect(decodeConfigKey(tapConfigKey(dir))).toBe(dir);
  });

  it('is the same account written with or without a trailing slash', () => {
    expect(tapConfigKey('/Users/x/.claude/')).toBe(tapConfigKey('/Users/x/.claude'));
    expect(normalizeConfigDir(undefined)).toBe('');
  });

  it('never carries a padding character, which a form body would re-encode', () => {
    expect(tapConfigKey('/Users/x/.claude')).not.toContain('=');
    expect(tapConfigKey('/Users/x/.claude')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('the settings fragment', () => {
  it('names the script as a command, quoted', () => {
    expect(statusLineBlock('/a b/s.sh')).toEqual({
      statusLine: { type: 'command', command: `'/a b/s.sh'` }
    });
  });

  it('quotes a path holding a single quote so it cannot break out', () => {
    expect(shellQuote(`/a'b`)).toBe(`'/a'\\''b'`);
  });

  it('sees a status line the person named', () => {
    expect(textNamesStatusLine('{"statusLine":{"type":"command","command":"x"}}')).toBe(true);
    expect(textNamesStatusLine('{"statusLine":"anything"}')).toBe(true);
  });

  it('sees none in a file that names none, is null, or does not parse', () => {
    expect(textNamesStatusLine('{"model":"opus"}')).toBe(false);
    expect(textNamesStatusLine('{"statusLine":null}')).toBe(false);
    // claude's own rule: files with errors are skipped entirely, so a broken
    // file names nothing at all rather than something unknown.
    expect(textNamesStatusLine('{not json')).toBe(false);
    expect(textNamesStatusLine(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The ingest rules
// ---------------------------------------------------------------------------

const CLAUDE_BODY = JSON.stringify({
  five_hour: { utilization: 2, resets_at: '2026-08-31T20:00:00.000000+00:00' },
  seven_day: { utilization: 56, resets_at: '2026-09-03T20:00:00.000000+00:00' },
  limits: [
    {
      kind: 'weekly_scoped',
      percent: 100,
      resets_at: '2026-09-03T20:00:00.000000+00:00',
      scope: { model: { display_name: 'Fable' } }
    }
  ]
});

interface Harness {
  service: ReturnType<typeof createUsageService>;
  sent: UsageRequest[];
  pushes: number;
  now: number;
  on: UsageSettings;
  env: Record<string, string | undefined>;
  /**
   * PHASE 202. Which login this meter is on. `null`/`null` is the person's own
   * default sign in, which is what every case here except the account rule
   * uses and what every install has before a second login is added.
   */
  login: string | null;
  loginDir: string | null;
}

function harness(over: Partial<Harness> = {}): Harness {
  const h = {
    sent: [] as UsageRequest[],
    pushes: 0,
    now: NOW,
    on: { claude: true, codex: false, bar: 'five-hour' } as UsageSettings,
    env: {} as Record<string, string | undefined>,
    login: null as string | null,
    loginDir: null as string | null,
    ...over
  } as Harness;
  const credentials: CredentialDeps = {
    keychain: async () =>
      JSON.stringify({ claudeAiOauth: { accessToken: 'ACCESS' } }),
    readText: async () => null,
    env: h.env,
    home: '/Users/example'
  };
  h.service = createUsageService({
    credentials,
    transport: async (req): Promise<UsageResponse> => {
      h.sent.push(req);
      return { status: 200, body: CLAUDE_BODY, retryAfterAt: null };
    },
    settings: () => h.on,
    // Phase 202: which login this meter is on. The default login's directory
    // is the empty string on the wire, which is what a pane on the default
    // login encodes for itself.
    logins: () => ({ name: h.login, dir: h.loginDir }),
    now: () => h.now,
    log: () => undefined,
    onChanged: () => {
      h.pushes += 1;
    }
  });
  return h;
}

function claudeRow(snap: { providers: { provider: string }[] }): any {
  return snap.providers.find((p) => p.provider === 'claude');
}

describe('rule 1 — nothing while off', () => {
  it('drops a post while the switch is off, and the meter stays empty', () => {
    const h = harness({ on: { claude: false, codex: false, bar: 'five-hour' } });
    expect(h.service.applyTap('sess-1', goodBody())).toBe('off');
    expect(claudeRow(h.service.current()).state).toBe('off');
    expect(h.pushes).toBe(0);
  });
});

describe('rule 2 — a shape nobody recognises is not a number', () => {
  it('drops it and changes nothing', () => {
    const h = harness();
    expect(h.service.applyTap('sess-1', 'v=1&s=sess-1')).toBe('shape');
    expect(claudeRow(h.service.current()).fiveHour).toBeNull();
  });
});

describe('rule 3 — the body may not name a session the token does not own', () => {
  it('drops a post claiming another session', () => {
    const h = harness();
    expect(h.service.applyTap('sess-OTHER', goodBody())).toBe('session');
    expect(claudeRow(h.service.current()).fiveHour).toBeNull();
  });
});

describe('rule 4 — never lie across accounts', () => {
  it('drops a post from a session logged in under another config dir', () => {
    const h = harness();
    const foreign = goodBody({ cfg: tapConfigKey('/Users/x/.claude-work') });
    expect(h.service.applyTap('sess-1', foreign)).toBe('account');
    expect(claudeRow(h.service.current()).fiveHour).toBeNull();
  });

  // PHASE 202 CHANGED WHAT "THIS ACCOUNT" MEANS, and this pair is the change.
  // The comparison used to be against Tortie's OWN process environment, which
  // was right while there was exactly one account and became the wrong answer
  // the moment a person can choose. It is now the CHOSEN LOGIN's directory.
  it('takes a post from the chosen login own directory', () => {
    const h = harness({ login: 'Work', loginDir: '/u/gmux/logins/claude/aa/' });
    const same = goodBody({ cfg: tapConfigKey('/u/gmux/logins/claude/aa') });
    expect(h.service.applyTap('sess-1', same)).toBe('applied');
    expect(claudeRow(h.service.current()).login).toBe('Work');
  });

  it('drops a post from the DEFAULT login while a second one is chosen', () => {
    const h = harness({ login: 'Work', loginDir: '/u/gmux/logins/claude/aa' });
    // A session started before the switch goes on posting, and its config dir
    // is the default one, which the tap encodes as the empty string.
    expect(h.service.applyTap('sess-1', goodBody())).toBe('account');
    expect(claudeRow(h.service.current()).fiveHour).toBeNull();
  });
});

describe('rule 5 — the same numbers again are not news', () => {
  it('dedupes an identical post inside the window and takes it after', () => {
    const h = harness();
    expect(h.service.applyTap('sess-1', goodBody())).toBe('applied');
    h.now += USAGE_TAP_DEDUPE_MS - 1;
    expect(h.service.applyTap('sess-1', goodBody())).toBe('duplicate');
    expect(h.pushes).toBe(1);
    h.now += 2;
    expect(h.service.applyTap('sess-1', goodBody())).toBe('applied');
    expect(h.pushes).toBe(2);
  });

  it('takes a post whose numbers moved, inside the same window', () => {
    const h = harness();
    h.service.applyTap('sess-1', goodBody());
    h.now += 1000;
    expect(h.service.applyTap('sess-1', goodBody({ five_pct: '59' }))).toBe(
      'applied'
    );
    expect(claudeRow(h.service.current()).fiveHour.percent).toBe(59);
  });
});

describe('what a taken post does to the snapshot', () => {
  it('draws the numbers and pushes them, with no request of any kind', () => {
    const h = harness();
    expect(h.service.applyTap('sess-1', goodBody())).toBe('applied');
    const row = claudeRow(h.service.current());
    expect(row.state).toBe('ok');
    expect(row.fiveHour).toEqual({ percent: 58, resetsAt: RESET_SECONDS * 1000 });
    expect(row.sevenDay.percent).toBe(41);
    expect(row.readAt).toBe(NOW);
    expect(h.sent).toEqual([]);
    expect(h.pushes).toBe(1);
  });

  it('KEEPS the per model weekly row and the plan word the endpoint gave', async () => {
    // Research 72 section 10.4: the tap carries five_hour and seven_day and
    // NOTHING else, so a tap that overwrote the whole parse would take the
    // Fable row off the card for as long as it kept suppressing the poll.
    const h = harness();
    await h.service.read();
    expect(claudeRow(h.service.current()).scoped.label).toBe('Fable');
    h.now += 1000;
    h.service.applyTap('sess-1', goodBody());
    const row = claudeRow(h.service.current());
    expect(row.scoped.label).toBe('Fable');
    expect(row.scoped.percent).toBe(100);
    expect(row.fiveHour.percent).toBe(58);
  });

  it('says nothing about a window the tap did not name', () => {
    const h = harness();
    h.service.applyTap('sess-1', goodBody());
    h.now += USAGE_TAP_DEDUPE_MS + 1;
    h.service.applyTap(
      'sess-1',
      body({ v: '1', s: 'sess-1', cfg: '', seven_pct: '44' })
    );
    const row = claudeRow(h.service.current());
    // The five hour window is the one the second post said nothing about, and
    // a bar that emptied itself on silence would be the meter lying.
    expect(row.fiveHour.percent).toBe(58);
    expect(row.sevenDay.percent).toBe(44);
  });
});

describe('a fresh live snapshot suppresses the endpoint poll', () => {
  it('keeps the poll away for five minutes and lets it through after', async () => {
    const h = harness();
    h.service.applyTap('sess-1', goodBody());
    // The row is otherwise due: nothing has ever been asked for it, so this
    // read would make a request if the tap had not just answered.
    h.now += USAGE_TAP_SUPPRESS_MS - 1;
    await h.service.read();
    expect(h.sent).toEqual([]);
    h.now += 2;
    await h.service.read();
    expect(h.sent.length).toBe(1);
  });

  it('never suppresses the refresh control, because that is a person asking', async () => {
    const h = harness();
    h.service.applyTap('sess-1', goodBody());
    h.now += 60_000;
    await h.service.refresh();
    expect(h.sent.length).toBe(1);
  });

  it('leaves a Retry-After the vendor asked for standing', async () => {
    const h = harness();
    h.service.applyTap('sess-1', goodBody());
    const row = claudeRow(h.service.current());
    expect(row.retryAfter).toBeNull();
    expect(row.state).toBe('ok');
  });
});
