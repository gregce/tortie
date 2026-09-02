/**
 * The joined shutdown (Phase 200, the audit's P1 lifecycle item).
 *
 * Every arm here was RED at the parent commit and is green now. What the
 * 0.98.0 audit found, in the order the quit path meets it:
 *
 *  1. `GmuxHookServer.stop()` called `server.close()` without awaiting its
 *     callback and returned in the same tick. A request that had ALREADY
 *     passed the token lookup went on reading its body and called `onTap`
 *     afterwards, which reaches the usage service, which is disposed later in
 *     the same quit.
 *  2. `disposeUsageService()` set its singleton to null and nothing else. It
 *     neither cancelled nor awaited the read in flight, so an https request
 *     carrying the person's bearer token and a `/usr/bin/security` child both
 *     outlived it.
 *  3. That same null was a rebuild instruction rather than a refusal: the next
 *     late tap or read built a SECOND service during shutdown.
 *
 * WHAT THIS FILE STARTS. One http server on 127.0.0.1 with an ephemeral port,
 * closed in an `afterAll`, and one child process per keychain arm, being a
 * shell script this file writes into its own temporary directory that sleeps
 * until it is killed. It reads nothing under any home, opens no keychain,
 * makes no request off this machine and spends no token.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GmuxHookServer } from '../../activity/hooks';
import { isGmuxError } from '../../errors';
import { guardedChildPids } from '../../proc/guarded';
import { KEYCHAIN_BIN, keychainReader, type CredentialDeps } from '../credentials';
import { createUsageService } from '../service';
import type { UsageRequest, UsageResponse } from '../transport';
import type { UsageSettings } from '@shared/settings';

const TOKEN = 'aaaaaaaabbbbbbbbccccccccdddddddd';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// A child that never exits on its own, so a cancel that does nothing is
// visible as a process still running rather than as a race.
const scratch = mkdtempSync(join(tmpdir(), 'p200-shutdown-'));
const NEVER_EXITS = join(scratch, 'security');
writeFileSync(NEVER_EXITS, '#!/bin/sh\nsleep 600\n', 'utf8');
chmodSync(NEVER_EXITS, 0o755);

const sockets: Socket[] = [];

afterAll(() => {
  for (const one of sockets) one.destroy();
  rmSync(scratch, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. The hook server: admission closes before anything can be delivered
// ---------------------------------------------------------------------------

describe('a request paused after token admission', () => {
  it('cannot call usage after the hook shutdown completes', async () => {
    const taps: string[] = [];
    const server = new GmuxHookServer({
      onEvent: () => undefined,
      onSessionEnd: () => undefined,
      onTap: (id) => taps.push(id)
    });
    const port = await server.start(0);
    expect(port).toBeGreaterThan(0);
    server.register(TOKEN, 'sess-1');

    // A post whose token is valid and whose body arrives in two pieces. The
    // first piece is written now, so the handler is past the token lookup and
    // waiting on the rest of the body.
    const sock = connect(port, '127.0.0.1');
    sockets.push(sock);
    // A socket the server destroyed answers a write with EPIPE, which is the
    // ordinary end of a status line post that arrives during quit.
    sock.on('error', () => undefined);
    await new Promise<void>((resolve) => sock.once('connect', () => resolve()));
    const body = 'v=1&five_hour_pct=50';
    sock.write(
      `POST /u/${TOKEN} HTTP/1.1\r\n` +
        `Host: 127.0.0.1:${String(port)}\r\n` +
        `Content-Length: ${String(body.length)}\r\n\r\n` +
        body.slice(0, 4)
    );
    await sleep(150);
    expect(taps).toEqual([]);
    expect(server.inFlightCount).toBe(1);

    // Shutdown, then the rest of the body. At the parent this delivered the
    // tap; the join and the second admission check are what stop it.
    const report = await server.stop();
    expect(server.shutdownStarted).toBe(true);
    expect(server.listening).toBe(false);
    sock.write(body.slice(4));
    await sleep(300);
    expect(taps).toEqual([]);
    expect(report.accepted).toBe(1);
    sock.destroy();
  }, 15_000);

  it('refuses a post that arrives after shutdown without looking a token up', async () => {
    const taps: string[] = [];
    const server = new GmuxHookServer({
      onEvent: () => undefined,
      onSessionEnd: () => undefined,
      onTap: (id) => taps.push(id)
    });
    const port = await server.start(0);
    server.register(TOKEN, 'sess-1');
    // The socket is opened while the server is up and used after it is down,
    // which is the shape a status line has: it belongs to a durable session
    // that outlives the app.
    const sock = connect(port, '127.0.0.1');
    sockets.push(sock);
    // A socket the server destroyed answers a write with EPIPE, which is the
    // ordinary end of a status line post that arrives during quit.
    sock.on('error', () => undefined);
    await new Promise<void>((resolve) => sock.once('connect', () => resolve()));
    await server.stop();
    sock.write(
      `POST /u/${TOKEN} HTTP/1.1\r\n` +
        `Host: 127.0.0.1:${String(port)}\r\n` +
        `Content-Length: 2\r\n\r\nhi`
    );
    await sleep(200);
    expect(taps).toEqual([]);
    sock.destroy();
  }, 15_000);

  it('a second start after a stop is refused rather than binding a port', async () => {
    const server = new GmuxHookServer({
      onEvent: () => undefined,
      onSessionEnd: () => undefined
    });
    const port = await server.start(0);
    expect(port).toBeGreaterThan(0);
    await server.stop();
    expect(await server.start(0)).toBe(0);
    expect(server.listening).toBe(false);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// 2. The usage service: cancelled and joined before its disposer resolves
// ---------------------------------------------------------------------------

/** Credential deps that answer instantly and touch nothing. */
function tokenDeps(): CredentialDeps {
  return {
    keychain: () =>
      Promise.resolve(
        JSON.stringify({
          claudeAiOauth: { accessToken: 'ACCESS', subscriptionType: 'max' }
        })
      ),
    readText: () => Promise.resolve(null),
    env: {},
    home: '/nonexistent'
  };
}

const settingsOn = (): UsageSettings => ({
  claude: true,
  codex: false,
  bar: 'five-hour'
});

describe('a held endpoint request', () => {
  it('is cancelled before the usage disposal resolves', async () => {
    let seen: UsageRequest | null = null;
    let aborted = false;
    const transport = (req: UsageRequest): Promise<UsageResponse> => {
      seen = req;
      return new Promise<UsageResponse>((_resolve, reject) => {
        req.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('usage request cancelled'));
        });
      });
    };
    const service = createUsageService({
      credentials: tokenDeps(),
      transport,
      settings: settingsOn,
      logins: () => ({ name: null, dir: null }),
      now: () => Date.now(),
      log: () => undefined
    });
    const read = service.read();
    let settled = false;
    void read.finally(() => {
      settled = true;
    });
    await sleep(50);
    expect(seen).not.toBeNull();
    expect(settled).toBe(false);

    const report = await service.shutdown();
    // The order the audit asked for: cancelled, then joined, and only then
    // does the disposer resolve.
    expect(aborted).toBe(true);
    expect(report.cancelled).toBe(1);
    expect(report.joined).toBe(true);
    expect(settled).toBe(true);
    await read;
  }, 15_000);

  it('the transport never opens a socket for a request cancelled first', async () => {
    // The real transport, with a signal that is already aborted. It must
    // reject without ever putting the person's bearer token on a wire.
    const { httpsTransport } = await import('../transport');
    const ending = new AbortController();
    ending.abort();
    await expect(
      httpsTransport({
        host: 'example.invalid',
        path: '/',
        headers: {},
        signal: ending.signal
      })
    ).rejects.toThrow(/cancelled/);
  });
});

describe('a keychain child that never exits', () => {
  it('is killed before the usage disposal resolves', async () => {
    const reader = keychainReader(NEVER_EXITS);
    const deps: CredentialDeps = {
      keychain: reader.keychain,
      readText: () => Promise.resolve(null),
      env: {},
      home: '/nonexistent',
      cancel: reader.cancel
    };
    // `guardedChildPids` is the OWNED registry the audit asked this child to be
    // routed through, so reading it is how this test knows the child exists.
    const before = new Set(guardedChildPids());
    const service = createUsageService({
      credentials: deps,
      transport: () => {
        throw new Error('the credential never answered, so nothing is sent');
      },
      settings: settingsOn,
      logins: () => ({ name: null, dir: null }),
      now: () => Date.now(),
      log: () => undefined
    });
    const read = service.read();
    let settled = false;
    void read.finally(() => {
      settled = true;
    });
    await sleep(400);
    const mine = guardedChildPids().filter((pid) => !before.has(pid));
    expect(mine.length).toBeGreaterThan(0);
    expect(settled).toBe(false);

    const report = await service.shutdown();
    expect(report.children).toBe(1);
    expect(report.joined).toBe(true);
    expect(settled).toBe(true);
    await sleep(200);
    for (const pid of mine) expect(alive(pid)).toBe(false);
    await read;
  }, 20_000);
});

// ---------------------------------------------------------------------------
// 3. A read or a tap after shutdown refuses, and recreates nothing
// ---------------------------------------------------------------------------

describe('after the usage shutdown', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('a read gets a typed refusal and no service is built', async () => {
    const ipc = await import('../ipc');
    ipc.resetUsageServiceForTests();
    await ipc.disposeUsageService();
    expect(ipc.usageShutdownStarted()).toBe(true);
    // The refusal is the typed one every other capability answers a late
    // renderer invoke with, and the builder itself is what refuses, so no
    // caller can rebuild the domain by forgetting to ask first.
    let thrown: unknown = null;
    try {
      ipc.usageService();
    } catch (err) {
      thrown = err;
    }
    expect(isGmuxError(thrown, 'SHUTTING_DOWN')).toBe(true);
    expect(isGmuxError(ipc.usageShutdownRefusal(), 'SHUTTING_DOWN')).toBe(true);
    ipc.resetUsageServiceForTests();
  });

  it('a tap one tick later builds nothing at all', async () => {
    const ipc = await import('../ipc');
    ipc.resetUsageServiceForTests();
    ipc.resetUsageTapLog();
    await ipc.disposeUsageService();
    await sleep(0);
    // The parent built a whole second service here, keychain read and all.
    // The parent built a whole second service here. `applyUsageTap` swallows
    // everything by design, so the proof that nothing was built is that the
    // builder itself now throws: a tap that reached it would surface as that
    // throw rather than as a service.
    ipc.applyUsageTap('sess-1', 'v=1&five_hour_pct=50');
    await sleep(0);
    expect(() => ipc.usageService()).toThrow();
    // And the same refusal one level down, for a caller holding the object.
    const service = createUsageService({
      credentials: tokenDeps(),
      transport: () => {
        throw new Error('a shut down service sends nothing');
      },
      settings: settingsOn,
      logins: () => ({ name: null, dir: null }),
      now: () => Date.now(),
      log: () => undefined
    });
    await service.shutdown();
    expect(service.applyTap('sess-1', 'v=1&five_hour_pct=50')).toBe('shutdown');
    ipc.resetUsageServiceForTests();
  });

  it('is idempotent and immediate with nothing in flight', async () => {
    const ipc = await import('../ipc');
    ipc.resetUsageServiceForTests();
    const startedAt = Date.now();
    const first = await ipc.disposeUsageService();
    const second = await ipc.disposeUsageService();
    const elapsed = Date.now() - startedAt;
    expect(first.cancelled).toBe(0);
    expect(second.cancelled).toBe(0);
    expect(first.joined).toBe(true);
    // The no work quit path is the ordinary one and it may not become slow.
    expect(elapsed).toBeLessThan(50);
    ipc.resetUsageServiceForTests();
  });
});

// ---------------------------------------------------------------------------
// 4. Live Diagnostics ends without the renderer's help
// ---------------------------------------------------------------------------

describe('a visible live Diagnostics tab at quit', () => {
  it('loses its timer, its destroyed listener and its instrument child', async () => {
    const live = await import('../../diagnostics/live');
    let disarmed = 0;
    let closed = 0;
    live.startLiveSampling({
      begin: () => ({ id: 'w1' }),
      finish: () => Promise.resolve({} as never),
      send: () => undefined,
      onGone: () => () => {
        disarmed += 1;
      },
      close: () => {
        closed += 1;
      },
      intervalMs: 60_000
    });
    expect(live.liveSamplingActive()).toBe(true);
    expect(live.liveTimerCount()).toBe(1);

    // This is the CALL the ordered main disposer makes now. Nothing in this
    // test plays the renderer: no liveStop is sent, no window is destroyed and
    // no replacement start is issued, which are the only three ways the
    // subscription used to end.
    live.stopLiveSampling();

    expect(live.liveSamplingActive()).toBe(false);
    expect(live.liveTimerCount()).toBe(0);
    expect(disarmed).toBe(1);
    expect(closed).toBe(1);

    // And it is idempotent, which is why the disposer can call it
    // unconditionally beside the others.
    live.stopLiveSampling();
    expect(closed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. The one program this domain runs
// ---------------------------------------------------------------------------

describe('the keychain binary', () => {
  it('is the compiled path and nothing a person can write', () => {
    expect(KEYCHAIN_BIN).toBe('/usr/bin/security');
  });
});
