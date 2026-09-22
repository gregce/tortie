/**
 * The door's address, its refusals and its death (Phase 313, builder A).
 *
 * WHAT THIS FILE NEVER DOES. It never binds anything but `127.0.0.1` on a port
 * nothing else holds, and every listener it opens — the door's and the
 * squatter's — is closed in a `finally` or in `afterEach`, whatever happened.
 * It never reads this machine's real interface table: every address question
 * is answered from a table written here, so the answers are the same on any
 * machine and no test can be decided by whether Tailscale happens to be up.
 * The one thing that IS real is the loopback bind, and it is real on purpose:
 * a teardown that is asserted rather than driven proves nothing.
 *
 * The door is forced to loopback by `GMUX_POCKET_LOOPBACK`, the same harness
 * override `probe:p313` uses, and that override turns the self-origin refusal
 * off by default, because under loopback every client is this machine. The
 * tests that drive that refusal turn it back on explicitly.
 */

import { readFileSync } from 'node:fs';
import { request } from 'node:https';
import { createServer, type Server } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DOOR_SENTENCES,
  HARNESS_LOOPBACK_ENV,
  MAX_CONNECTIONS,
  addressIsStale,
  chooseTailnetAddress,
  doorAddressIsStale,
  isSelfOrigin,
  isTailnetIpv4,
  joinPocketDoor,
  pocketDoorStatus,
  resetPocketDoorForTests,
  startPocketDoor,
  stopPocketDoor,
  tailnetCandidates,
  type DoorStartInput,
  type InterfaceTable
} from '../bind';
import {
  IDENTITY_SENTENCES,
  POCKET_TLS_SEAL_PREFIX,
  ensureDoorIdentity,
  pocketCertificateFingerprint,
  pocketPublicKeyFingerprint,
  pocketTlsMaterial,
  type IdentitySealPort
} from '../tls';

// ---------------------------------------------------------------------------
// Tables, written here rather than read off this machine
// ---------------------------------------------------------------------------

/** What this Mac's own table looked like on 2026-09-22, addresses changed. */
const REAL_SHAPE: InterfaceTable = {
  lo0: [
    { address: '127.0.0.1', family: 'IPv4', internal: true, netmask: '255.0.0.0' }
  ],
  en0: [
    {
      address: '192.168.1.40',
      family: 'IPv4',
      internal: false,
      netmask: '255.255.255.0'
    }
  ],
  utun4: [
    {
      address: '100.101.102.103',
      family: 'IPv4',
      internal: false,
      netmask: '255.255.255.255'
    },
    {
      address: 'fd7a:115c:a1e0::1234',
      family: 'IPv6',
      internal: false,
      netmask: 'ffff:ffff:ffff:ffff::'
    }
  ]
};

/** A carrier-NAT'ed Wi-Fi: an address in the range, on the LAN interface. */
const CARRIER_NAT: InterfaceTable = {
  en0: [
    {
      address: '100.70.1.2',
      family: 'IPv4',
      internal: false,
      netmask: '255.255.192.0'
    }
  ]
};

const NO_TAILNET: InterfaceTable = {
  lo0: [
    { address: '127.0.0.1', family: 'IPv4', internal: true, netmask: '255.0.0.0' }
  ],
  en0: [
    {
      address: '10.0.0.5',
      family: 'IPv4',
      internal: false,
      netmask: '255.255.255.0'
    }
  ]
};

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

let dir: string;
let opened: Server[] = [];

const seal: IdentitySealPort = {
  available: () => true,
  seal: (text) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
  open: (blob) => {
    if (typeof blob !== 'string' || blob.length === 0) return '';
    const text = Buffer.from(blob, 'base64').toString('utf8');
    if (!text.startsWith(POCKET_TLS_SEAL_PREFIX)) return '';
    return text.slice(POCKET_TLS_SEAL_PREFIX.length);
  }
};

/** The real identity module, over a scratch file and a readable fake seal. */
const identity: DoorStartInput['identity'] = (options) =>
  ensureDoorIdentity({ ...options, seal });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p313-bind-'));
  process.env[HARNESS_LOOPBACK_ENV] = '1';
  resetPocketDoorForTests();
});

afterEach(async () => {
  await joinPocketDoor();
  resetPocketDoorForTests();
  for (const server of opened) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  opened = [];
  delete process.env[HARNESS_LOOPBACK_ENV];
  rmSync(dir, { recursive: true, force: true });
});

/** A port nothing holds right now, found and released. */
async function freePort(): Promise<number> {
  const probe = createServer();
  try {
    return await new Promise<number>((resolve) => {
      probe.listen(0, '127.0.0.1', () => {
        resolve((probe.address() as { port: number }).port);
      });
    });
  } finally {
    await new Promise<void>((resolve) => probe.close(() => resolve()));
  }
}

/** Hold a port, so the door meets a squatter. Closed in `afterEach`. */
async function squat(port: number): Promise<Server> {
  const server = createServer();
  opened.push(server);
  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });
  return server;
}

interface Answer {
  status: number;
  body: string;
}

function get(port: number, ca: string, path = '/'): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        // Node's global agent keeps sockets alive, and a reused socket the
        // door has since closed answers ECONNRESET rather than the refusal
        // this file is measuring. Every request here is its own connection.
        agent: false,
        ca: [ca],
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function startInput(over: Partial<DoorStartInput> & { port: number }): DoorStartInput {
  return {
    handle: (_req, res) => {
      res.statusCode = 200;
      res.end('answered');
    },
    identity,
    identityPath: join(dir, 'pocket-identity.json'),
    ...over
  };
}

// ---------------------------------------------------------------------------
// The address
// ---------------------------------------------------------------------------

describe('the address is read, never chosen', () => {
  it('knows the tailnet range by its edges', () => {
    expect(isTailnetIpv4('100.64.0.0')).toBe(true);
    expect(isTailnetIpv4('100.127.255.255')).toBe(true);
    expect(isTailnetIpv4('100.63.255.255')).toBe(false);
    expect(isTailnetIpv4('100.128.0.0')).toBe(false);
    expect(isTailnetIpv4('192.168.1.1')).toBe(false);
    // Spellings a hand-rolled parser lets through and a kernel reads
    // differently.
    expect(isTailnetIpv4('100.064.0.1')).toBe(false);
    expect(isTailnetIpv4(' 100.64.0.1')).toBe(false);
    expect(isTailnetIpv4('100.64.0.1.')).toBe(false);
    expect(isTailnetIpv4('0.0.0.0')).toBe(false);
  });

  it('takes the /32 on the tunnel and refuses the carrier-NAT Wi-Fi', () => {
    expect(chooseTailnetAddress(REAL_SHAPE)?.address).toBe('100.101.102.103');
    expect(chooseTailnetAddress(REAL_SHAPE)?.interfaceName).toBe('utun4');
    // In the range, on en0, and NOT a /32: a carrier NAT lease, never a door.
    expect(tailnetCandidates(CARRIER_NAT)).toEqual([]);
    expect(chooseTailnetAddress(CARRIER_NAT)).toBeNull();
    expect(chooseTailnetAddress(NO_TAILNET)).toBeNull();
    expect(chooseTailnetAddress({})).toBeNull();
  });

  it('prefers the interface that also carries the tailnet’s own IPv6', () => {
    const two: InterfaceTable = {
      utun9: [
        {
          address: '100.65.1.1',
          family: 'IPv4',
          internal: false,
          netmask: '255.255.255.255'
        }
      ],
      utun4: REAL_SHAPE['utun4'] ?? []
    };
    expect(chooseTailnetAddress(two)?.address).toBe('100.101.102.103');
    expect(tailnetCandidates(two).map((c) => c.address)).toEqual([
      '100.101.102.103',
      '100.65.1.1'
    ]);
  });

  it('refuses to bind at all when there is no tailnet address', async () => {
    delete process.env[HARNESS_LOOPBACK_ENV]; // the real address path
    const port = await freePort();
    const result = await startPocketDoor(
      startInput({ port, table: NO_TAILNET })
    );
    expect(result).toEqual({
      ok: false,
      reason: 'no-tailnet-address',
      sentence: DOOR_SENTENCES['no-tailnet-address']
    });
    expect(pocketDoorStatus().listening).toBe(false);
    // Nothing is listening on that port, so a squatter can still take it.
    const held = await squat(port);
    expect(held.listening).toBe(true);
  });
});

describe('a connection from this machine itself', () => {
  it('is refused by address, in either spelling', () => {
    expect(isSelfOrigin('100.101.102.103', '100.101.102.103')).toBe(true);
    expect(isSelfOrigin('::ffff:100.101.102.103', '100.101.102.103')).toBe(true);
    expect(isSelfOrigin('100.64.9.9', '100.101.102.103')).toBe(false);
    // A socket with no source is refused rather than admitted.
    expect(isSelfOrigin(undefined, '100.101.102.103')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The listener
// ---------------------------------------------------------------------------

describe('the door', () => {
  it('opens, answers over TLS the client verified, and closes', async () => {
    const port = await freePort();
    const started = await startPocketDoor(startInput({ port }));
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.address).toBe('127.0.0.1');
    expect(started.port).toBe(port);
    expect(started.selfOriginRefused).toBe(false); // the loopback harness
    expect(started.shortFingerprint).toMatch(/^[0-9A-F]{4} [0-9A-F]{4} [0-9A-F]{4}$/);

    const readBack = ensureDoorIdentity({
      path: join(dir, 'pocket-identity.json'),
      seal,
      names: { addresses: ['127.0.0.1'], dnsNames: [] }
    });
    if (readBack.kind !== 'ready') throw new Error('no identity');
    const answer = await get(port, readBack.identity.certPem);
    expect(answer).toEqual({ status: 200, body: 'answered' });

    const status = pocketDoorStatus();
    expect(status.listening).toBe(true);
    expect(status.certificateFingerprint).toBe(started.certificateFingerprint);
    // The status a surface draws carries no key material of any kind.
    expect(JSON.stringify(status)).not.toContain('PRIVATE KEY');

    const report = await stopPocketDoor();
    expect(report.joined).toBe(true);
    expect(pocketDoorStatus().listening).toBe(false);
    // The listener is GONE: the port is free and a request is refused.
    await expect(get(port, readBack.identity.certPem)).rejects.toMatchObject({
      code: 'ECONNREFUSED'
    });
    const held = await squat(port);
    expect(held.listening).toBe(true);
  });

  it('refuses a port something else holds, and never moves to another', async () => {
    const port = await freePort();
    await squat(port);
    const result = await startPocketDoor(startInput({ port }));
    expect(result).toEqual({
      ok: false,
      reason: 'port-taken',
      sentence: DOOR_SENTENCES['port-taken']
    });
    const status = pocketDoorStatus();
    expect(status.listening).toBe(false);
    expect(status.port).toBe(0);
    expect(status.lastRefusal).toBe('port-taken');
  });

  it('refuses a port a person could not have confirmed', async () => {
    for (const port of [0, 80, 443, 1023, 70_000, 8_080.5]) {
      const result = await startPocketDoor(startInput({ port }));
      expect(result).toEqual({
        ok: false,
        reason: 'invalid-port',
        sentence: DOOR_SENTENCES['invalid-port']
      });
    }
    expect(pocketDoorStatus().listening).toBe(false);
  });

  it('refuses to open with no certificate, and says the identity’s own sentence', async () => {
    const port = await freePort();
    const result = await startPocketDoor(
      startInput({
        port,
        identity: (options) =>
          ensureDoorIdentity({
            ...options,
            seal: { ...seal, available: () => false, open: () => null }
          })
      })
    );
    expect(result).toEqual({
      ok: false,
      reason: 'no-certificate',
      sentence: IDENTITY_SENTENCES['seal-unavailable']
    });
    expect(pocketDoorStatus().listening).toBe(false);
    const held = await squat(port);
    expect(held.listening).toBe(true);
  });

  it('destroys a connection from its own address before a header is read', async () => {
    const port = await freePort();
    let handled = 0;
    const started = await startPocketDoor(
      startInput({
        port,
        refuseSelfOrigin: true,
        handle: (_req, res) => {
          handled += 1;
          res.statusCode = 200;
          res.end('should not happen');
        }
      })
    );
    expect(started.ok).toBe(true);
    const readBack = ensureDoorIdentity({
      path: join(dir, 'pocket-identity.json'),
      seal,
      names: { addresses: ['127.0.0.1'], dnsNames: [] }
    });
    if (readBack.kind !== 'ready') throw new Error('no identity');
    await expect(get(port, readBack.identity.certPem)).rejects.toBeTruthy();
    expect(handled).toBe(0);
  });

  it('joins the request it had already accepted, then goes', async () => {
    const port = await freePort();
    let release = (): void => undefined;
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    await startPocketDoor(
      startInput({
        port,
        handle: async (_req, res) => {
          await slow;
          res.statusCode = 200;
          res.end('late');
        }
      })
    );
    const readBack = ensureDoorIdentity({
      path: join(dir, 'pocket-identity.json'),
      seal,
      names: { addresses: ['127.0.0.1'], dnsNames: [] }
    });
    if (readBack.kind !== 'ready') throw new Error('no identity');
    const inFlight = get(port, readBack.identity.certPem).catch(() => null);
    // Let the request be accepted before the stop begins.
    await new Promise((resolve) => setTimeout(resolve, 120));
    const stopping = stopPocketDoor();
    release();
    const report = await stopping;
    await inFlight;
    expect(report.accepted).toBe(1);
    expect(report.joined).toBe(true);
    expect(pocketDoorStatus().listening).toBe(false);
  });

  it('holds its material only while it is answering with it', async () => {
    expect(pocketTlsMaterial()).toBeNull();
    expect(pocketCertificateFingerprint()).toBeNull();
    const port = await freePort();
    const started = await startPocketDoor(startInput({ port }));
    if (!started.ok) throw new Error('did not open');
    expect(pocketCertificateFingerprint()).toBe(started.certificateFingerprint);
    expect(pocketPublicKeyFingerprint()).toBe(started.publicKeyFingerprint);
    expect(pocketTlsMaterial()?.cert).toContain('BEGIN CERTIFICATE');
    await stopPocketDoor();
    // Nothing is answering, so there is no certificate to draw or to pin.
    expect(pocketTlsMaterial()).toBeNull();
    expect(pocketCertificateFingerprint()).toBeNull();
    expect(pocketPublicKeyFingerprint()).toBeNull();
  });

  it('does not meet itself as a squatter when two starts race', async () => {
    const port = await freePort();
    const [first, second] = await Promise.all([
      startPocketDoor(startInput({ port })),
      startPocketDoor(startInput({ port }))
    ]);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    // One listener, so one stop frees the port.
    await stopPocketDoor();
    const held = await squat(port);
    expect(held.listening).toBe(true);
  });

  it('opens nothing once the quit has begun', async () => {
    const port = await freePort();
    await joinPocketDoor(); // the disposer's own line
    const result = await startPocketDoor(startInput({ port }));
    expect(result).toEqual({
      ok: false,
      reason: 'quitting',
      sentence: DOOR_SENTENCES['quitting']
    });
    const held = await squat(port);
    expect(held.listening).toBe(true);
  });

  it('answers the quit with an empty report when it never opened', async () => {
    expect(await joinPocketDoor()).toEqual({
      accepted: 0,
      joined: true,
      waitedMs: 0
    });
  });

  it('says its address is stale when the tunnel’s address went away', async () => {
    // The question the sleeping machine asks: the door is bound to an address
    // that is no longer on any interface.
    expect(addressIsStale('100.101.102.103', NO_TAILNET)).toBe(true);
    expect(addressIsStale('100.101.102.103', REAL_SHAPE)).toBe(false);
    // A different tailnet address after a re-login is stale too.
    expect(addressIsStale('100.64.7.7', REAL_SHAPE)).toBe(true);
    // A door bound to loopback by the harness is never stale, and neither is
    // a door that is not open.
    expect(addressIsStale('127.0.0.1', NO_TAILNET)).toBe(false);
    expect(addressIsStale(null, NO_TAILNET)).toBe(false);
    const port = await freePort();
    await startPocketDoor(startInput({ port }));
    expect(doorAddressIsStale(NO_TAILNET)).toBe(false);
    await stopPocketDoor();
    expect(doorAddressIsStale(NO_TAILNET)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The two rules read as text, because they are one line away from gone
// ---------------------------------------------------------------------------

describe('the source of the module', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'bind.ts'),
    'utf8'
  );
  /**
   * The CODE half. The prose is asked its own question below, because a
   * refusal named in a comment is documentation and a refusal named in code
   * would be the opposite of this module's rule.
   */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');

  it('binds exactly once and never to a wildcard address', () => {
    expect(code.match(/\.listen\(/g) ?? []).toHaveLength(1);
    expect(code).not.toContain('0.0.0.0');
    expect(code).not.toMatch(/\.listen\(\s*0\b/);
    // The port is the caller's; the address is this module's own choice.
    expect(code).toMatch(/server\.listen\(input\.port, address,/);
  });

  it('asks the interface table and never a program', () => {
    expect(code).toContain('networkInterfaces');
    expect(code).not.toContain('execFile');
    expect(code).not.toContain('spawn');
    expect(code).not.toContain('tailscale');
  });

  it('says both refusals in its own prose, so a later round reads them', () => {
    expect(source).toContain('Never `0.0.0.0`');
    expect(source).toContain('never `tailscale status`');
  });

  it('carries the connection cap the hook server carries', () => {
    expect(MAX_CONNECTIONS).toBe(32);
    expect(code).toContain('server.maxConnections = MAX_CONNECTIONS');
  });
});
