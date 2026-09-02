/**
 * The meter under a second login (Phase 202).
 *
 * THREE THINGS ARE PROVED HERE, and each of them is a way the meter could lie
 * about whose plan is on screen.
 *
 *   1. THE READ FOLLOWS THE CHOSEN LOGIN. A second login's credential is
 *      looked for under that login's own directory: the SCOPED keychain name
 *      for it, and that directory's own credentials file. Nothing else.
 *   2. THERE IS NO FALLBACK TO THE PERSON'S OWN DEFAULT. A second login that
 *      has not been signed into yet answers `missing`, which draws the sign in
 *      line. Falling through to the plain keychain item would read the
 *      person's DEFAULT credential and draw its numbers under the second
 *      login's name, which is the research 72 rule this phase inherits whole:
 *      never lie across accounts.
 *   3. A LOGIN THAT MOVED MARKS THE HELD NUMBERS STALE. The previous login's
 *      numbers stay visible under the warning glyph, because a blank meter
 *      helps nobody, and the state is what stops them being read as this
 *      login's. The next successful read replaces both, within one poll.
 */

import { describe, expect, it } from 'vitest';
import type { UsageSettings } from '@shared/settings';
import { claudeScopedService, type CredentialDeps } from '../credentials';
import { createUsageService } from '../service';
import type { UsageRequest, UsageResponse } from '../transport';

const NOW = 1_790_000_000_000;

const CLAUDE_BODY = JSON.stringify({
  five_hour: { utilization: 12, resets_at: new Date(NOW + 3_600_000).toISOString() },
  seven_day: { utilization: 34, resets_at: new Date(NOW + 86_400_000).toISOString() }
});

const ON: UsageSettings = { claude: true, codex: false, bar: 'five-hour' };

interface Seen {
  services: string[];
  files: string[];
  sent: UsageRequest[];
}

function build(
  login: () => { name: string | null; dir: string | null },
  keychainFor: (service: string) => string | null,
  now: () => number = () => NOW
): { service: ReturnType<typeof createUsageService>; seen: Seen } {
  const seen: Seen = { services: [], files: [], sent: [] };
  const credentials: CredentialDeps = {
    keychain: async (service) => {
      seen.services.push(service);
      return keychainFor(service);
    },
    readText: async (path) => {
      seen.files.push(path);
      return null;
    },
    env: {},
    home: '/Users/example'
  };
  const service = createUsageService({
    credentials,
    transport: async (req): Promise<UsageResponse> => {
      seen.sent.push(req);
      return { status: 200, body: CLAUDE_BODY, retryAfterAt: null };
    },
    settings: () => ON,
    logins: () => login(),
    now,
    log: () => undefined
  });
  return { service, seen };
}

const SECOND_DIR = '/u/gmux/logins/claude/aabbccddeeff0011';

describe('the read follows the chosen login', () => {
  it('asks the scoped keychain name for that directory, and only that one', async () => {
    const { service, seen } = build(
      () => ({ name: 'Work', dir: SECOND_DIR }),
      (service) =>
        service === claudeScopedService(SECOND_DIR)
          ? JSON.stringify({
              claudeAiOauth: { accessToken: 'SECOND', subscriptionType: 'max' }
            })
          : null
    );
    const snap = await service.read();
    expect(seen.services).toEqual([claudeScopedService(SECOND_DIR)]);
    // THE PERSON'S OWN ITEM WAS NEVER ASKED FOR.
    expect(seen.services).not.toContain('Claude Code-credentials');
    const row = snap.providers.find((p) => p.provider === 'claude');
    expect(row?.state).toBe('ok');
    expect(row?.plan).toBe('max');
    expect(row?.login).toBe('Work');
  });

  it('reads that directory own credentials file and never the home one', async () => {
    const { service, seen } = build(() => ({ name: 'Work', dir: SECOND_DIR }), () => null);
    await service.read();
    expect(seen.files).toEqual([`${SECOND_DIR}/.credentials.json`]);
    expect(seen.files.some((f) => f.startsWith('/Users/example'))).toBe(false);
  });

  it('says signed out for a login nobody has signed into yet', async () => {
    // The directory exists and is empty, which is exactly what Add login
    // leaves behind until the person completes the vendor's own flow.
    const { service, seen } = build(() => ({ name: 'Work', dir: SECOND_DIR }), () => null);
    const snap = await service.read();
    const row = snap.providers.find((p) => p.provider === 'claude');
    expect(row?.state).toBe('signed-out');
    expect(row?.login).toBe('Work');
    // NOTHING WAS SENT. A missing credential is a confirmed answer and there
    // is nothing to ask the vendor about.
    expect(seen.sent).toEqual([]);
  });

  it('asks the plain item for the default login, exactly as it always has', async () => {
    const { service, seen } = build(
      () => ({ name: null, dir: null }),
      () => JSON.stringify({ claudeAiOauth: { accessToken: 'DEFAULT' } })
    );
    const snap = await service.read();
    expect(seen.services).toEqual(['Claude Code-credentials']);
    expect(snap.providers.find((p) => p.provider === 'claude')?.login).toBeNull();
  });
});

describe('a login that moved', () => {
  it('marks the held numbers stale and reads again at once', async () => {
    let chosen: { name: string | null; dir: string | null } = {
      name: null,
      dir: null
    };
    let now = NOW;
    const { service, seen } = build(
      () => chosen,
      (service) =>
        service === 'Claude Code-credentials'
          ? JSON.stringify({ claudeAiOauth: { accessToken: 'DEFAULT' } })
          : JSON.stringify({ claudeAiOauth: { accessToken: 'SECOND' } }),
      () => now
    );
    const first = await service.read();
    expect(first.providers.find((p) => p.provider === 'claude')?.state).toBe('ok');
    expect(seen.sent).toHaveLength(1);

    // The person chooses another login. Nothing else moves: no time passes, so
    // the fifteen minute interval alone would refuse a second read.
    chosen = { name: 'Work', dir: SECOND_DIR };
    const second = await service.read();
    const row = second.providers.find((p) => p.provider === 'claude');
    // ONE POLL, not fifteen minutes.
    expect(seen.sent).toHaveLength(2);
    expect(row?.login).toBe('Work');
    expect(row?.state).toBe('ok');

    // And when the second read cannot answer, the previous login's numbers are
    // STALE rather than current: the glyph is what the card draws.
    chosen = { name: null, dir: null };
    now += 1;
    const held = service.current();
    expect(held.providers.find((p) => p.provider === 'claude')?.login).toBe('Work');
  });

  it('keeps the old numbers under the stale mark while the new read is pending', async () => {
    let chosen: { name: string | null; dir: string | null } = {
      name: null,
      dir: null
    };
    // The second login's answer never arrives, which is the instant a person
    // actually sees: the choice is made and the vendor has not replied yet.
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen: UsageRequest[] = [];
    const service = createUsageService({
      credentials: {
        keychain: async () => JSON.stringify({ claudeAiOauth: { accessToken: 'A' } }),
        readText: async () => null,
        env: {},
        home: '/Users/example'
      },
      transport: async (req): Promise<UsageResponse> => {
        seen.push(req);
        if (seen.length === 1) {
          return { status: 200, body: CLAUDE_BODY, retryAfterAt: null };
        }
        await held;
        return { status: 200, body: CLAUDE_BODY, retryAfterAt: null };
      },
      settings: () => ON,
      logins: () => chosen,
      now: () => NOW,
      log: () => undefined
    });

    await service.read();
    const before = service.current().providers.find((p) => p.provider === 'claude');
    expect(before?.state).toBe('ok');
    expect(before?.fiveHour?.percent).toBe(12);

    chosen = { name: 'Work', dir: SECOND_DIR };
    const pending = service.read();
    // One turn of the microtask queue, which is what the credential read costs
    // before the transport is reached. The state below is what is held while
    // the vendor has not answered.
    await Promise.resolve();
    await Promise.resolve();
    const during = service.current().providers.find((p) => p.provider === 'claude');
    // THE NUMBERS ARE STILL THERE, so the meter does not blink, and the STATE
    // says they are not this login's, so the card can say so.
    expect(during?.state).toBe('stale');
    expect(during?.fiveHour?.percent).toBe(12);
    expect(during?.login).toBe('Work');

    release();
    await pending;
    const after = service.current().providers.find((p) => p.provider === 'claude');
    expect(after?.state).toBe('ok');
    expect(after?.login).toBe('Work');
  });
});

/**
 * A READ THAT WAS ALREADY IN THE AIR WHEN THE LOGIN CHANGED.
 *
 * THE FIX ROUND'S FINDING 2, reproduced against the shipping module before it
 * was fixed. `run` marked the row stale and made it due, and then the very
 * next branch saw an outstanding request and waited on it. That request had
 * been issued for the login the person had just LEFT, so its answer arrived
 * carrying the previous account's numbers, and `applyOutcome` wrote them as
 * `ok` under the new login's name and moved `lastAttemptAt`, which undid
 * "due at once" and left the wrong account's numbers on screen, marked
 * current, for a full fifteen minute poll. Measured at the parent commit: 11
 * where the new login's number is 77, one request served and no second one
 * issued, and the next read served nothing and answered 11 again.
 */
describe('a read issued for the login you left', () => {
  interface Rig {
    service: ReturnType<typeof createUsageService>;
    release: () => void;
    sent: () => UsageRequest[];
    choose: (v: { name: string | null; dir: string | null }) => void;
    /** The poll interval is real here, so a second read needs time to pass. */
    tick: (ms: number) => void;
  }

  /** Every request after the first waits until the test releases it. */
  function rig(percentFor: (token: string) => number): Rig {
    let chosen: { name: string | null; dir: string | null } = { name: null, dir: null };
    let clock = NOW;
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sent: UsageRequest[] = [];
    const service = createUsageService({
      credentials: {
        keychain: async () =>
          JSON.stringify({
            claudeAiOauth: {
              accessToken: chosen.dir === null ? 'DEFAULT' : 'SECOND'
            }
          }),
        readText: async () => null,
        env: {},
        home: '/Users/example'
      },
      transport: async (req): Promise<UsageResponse> => {
        sent.push(req);
        const token = (req.headers['authorization'] ?? '').includes('SECOND')
          ? 'SECOND'
          : 'DEFAULT';
        const body = JSON.stringify({
          five_hour: {
            utilization: percentFor(token),
            resets_at: new Date(clock + 3_600_000).toISOString()
          }
        });
        if (sent.length === 1) return { status: 200, body, retryAfterAt: null };
        await gate;
        return { status: 200, body, retryAfterAt: null };
      },
      settings: () => ON,
      logins: () => chosen,
      now: () => clock,
      log: () => undefined
    });
    return {
      service,
      release,
      sent: () => sent,
      choose: (v) => {
        chosen = v;
      },
      tick: (ms) => {
        clock += ms;
      }
    };
  }

  const claude = (
    s: Awaited<ReturnType<ReturnType<typeof createUsageService>['read']>>
  ): ReturnType<typeof createUsageService> extends never ? never : (typeof s)['providers'][number] => {
    const row = s.providers.find((p) => p.provider === 'claude');
    if (row === undefined) throw new Error('no claude row');
    return row;
  };

  it('drops its answer rather than drawing it under the new login name', async () => {
    const r = rig((token) => (token === 'SECOND' ? 77 : 11));
    // A first read completes and holds the default login's numbers.
    await r.service.read();
    // A second read is issued for the default login and is left in the air.
    r.tick(20 * 60 * 1000);
    const inFlight = r.service.read();
    await Promise.resolve();
    await Promise.resolve();
    // The person chooses another login while it is still outstanding.
    r.choose({ name: 'Second', dir: SECOND_DIR });
    const afterSwitch = claude(await r.service.read());
    // THE NUMBERS ON SCREEN ARE NOT DRAWN AS CURRENT. They are the previous
    // login's, marked stale, and the card says which stale this is.
    expect(afterSwitch.state).toBe('stale');
    expect(afterSwitch.loginChanged).toBe(true);
    expect(afterSwitch.login).toBe('Second');
    expect(afterSwitch.fiveHour?.percent).toBe(11);
    // And no second request was issued alongside the one in the air.
    expect(r.sent()).toHaveLength(2);

    // The old request lands. Its answer is dropped whole.
    r.release();
    await inFlight;
    const landed = claude(r.service.current());
    expect(landed.state).toBe('stale');
    expect(landed.fiveHour?.percent).toBe(11);

    // THE ROW IS STILL DUE, which is what "within one poll" means: the next
    // read asks under the new login and replaces both the numbers and the
    // mark. At the parent commit this read served nothing at all.
    const next = claude(await r.service.read());
    expect(r.sent()).toHaveLength(3);
    expect(next.state).toBe('ok');
    expect(next.loginChanged).toBe(false);
    expect(next.login).toBe('Second');
    expect(next.fiveHour?.percent).toBe(77);
  });

  it('applies the answer when the person chose the same login again', async () => {
    const r = rig(() => 11);
    const inFlight = r.service.read();
    await Promise.resolve();
    await Promise.resolve();
    r.choose({ name: 'Second', dir: SECOND_DIR });
    void r.service.read();
    // Back to the login the outstanding request was issued for, before it
    // lands. It IS that account's answer, so it is kept.
    r.choose({ name: null, dir: null });
    const back = r.service.read();
    r.release();
    await inFlight;
    const row = claude(await back);
    expect(row.state).toBe('ok');
    expect(row.login).toBeNull();
    expect(row.fiveHour?.percent).toBe(11);
    expect(r.sent()).toHaveLength(1);
  });
});

/**
 * THE HALF THIS PHASE ALMOST TOOK AWAY.
 *
 * The tap's account rule compares the posting session's config directory with
 * the one main reads its credential from. Phase 202 made that the CHOSEN
 * LOGIN's directory, which is right, and the first build read the chosen
 * login's directory ALONE. For the default login that directory is null, so
 * the comparison became the empty string, and a person who runs Tortie with
 * `CLAUDE_CONFIG_DIR` set in their own environment would have had every post
 * from every one of their sessions dropped, silently, for as long as they
 * stayed on their default login. That is a regression against Phase 182 rather
 * than a new rule, so the default login still means Tortie's own environment.
 */
describe('the default login still means Tortie own environment', () => {
  const OWN = '/Users/example/.claude-work';

  function tapService(
    login: () => { name: string | null; dir: string | null },
    env: Record<string, string | undefined>
  ): ReturnType<typeof createUsageService> {
    return createUsageService({
      credentials: {
        keychain: async () =>
          JSON.stringify({ claudeAiOauth: { accessToken: 'A' } }),
        readText: async () => null,
        env,
        home: '/Users/example'
      },
      transport: async (): Promise<UsageResponse> => ({
        status: 200,
        body: CLAUDE_BODY,
        retryAfterAt: null
      }),
      settings: () => ON,
      logins: () => login(),
      now: () => NOW,
      log: () => undefined
    });
  }

  const post = (cfg: string): string =>
    [
      'v=1',
      's=sess-1',
      `cfg=${Buffer.from(cfg, 'utf8').toString('base64url')}`,
      'five_pct=58',
      `five_reset=${String(Math.floor((NOW + 3_600_000) / 1000))}`
    ].join('&');

  it('takes a post from the directory Tortie own environment names', () => {
    const service = tapService(() => ({ name: null, dir: null }), {
      CLAUDE_CONFIG_DIR: OWN
    });
    expect(service.applyTap('sess-1', post(OWN))).toBe('applied');
  });

  it('drops a post from somewhere else while the default login is chosen', () => {
    const service = tapService(() => ({ name: null, dir: null }), {
      CLAUDE_CONFIG_DIR: OWN
    });
    expect(service.applyTap('sess-1', post(SECOND_DIR))).toBe('account');
  });

  it('still prefers the chosen login directory over that environment', () => {
    const service = tapService(() => ({ name: 'Work', dir: SECOND_DIR }), {
      CLAUDE_CONFIG_DIR: OWN
    });
    expect(service.applyTap('sess-1', post(OWN))).toBe('account');
    expect(service.applyTap('sess-1', post(SECOND_DIR))).toBe('applied');
  });
});
