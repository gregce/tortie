/**
 * Main's side of the door: the handler of what the door process forwards
 * (Phase 313; split across two processes by Phase 330, build/p330/SPEC.md
 * §4.6 "Main's side").
 *
 * WHAT THIS IS. Refusals 1 to 5 moved to the door process and have their own
 * tests over real TLS (`door-listener.test.ts`). What is left in main is what
 * only main can know — the quit, the window a person opened, the signature,
 * and whether the answer it composed may still leave — and this file drives
 * that with TYPED REQUESTS, exactly the shape `../door/wire.ts` lets through,
 * so no socket is needed to reach it.
 *
 * THE SECOND HALF IS END TO END ON THE SHIPPING OWNERS: a window opened by the
 * shipping `PocketPairing`, a presentation sealed and signed the phone's way,
 * an Allow that records the agreement and issues the certificate, and a read
 * verified by the shipping `PocketRequestVerifier` over the channel the
 * handshake would have named. Only the phone's half is written here.
 */

import { X509Certificate, createHash, generateKeyPairSync, randomBytes, type KeyObject } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

const MARKER = '--tortie-pocket-server-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

/** Every line the log wrote, as `level message`. */
const logged: string[] = [];

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string): void => {
      logged.push(`${level} ${msg}`);
    };
  return {
    ...real,
    getLog: () => ({ error: capture('error'), warn: capture('warn'), info: capture('info'), debug: capture('debug') })
  };
});

const pairing = await import('../pairing');
const { createPocketHandler, POCKET_READ_BODY_CAP_BYTES } = await import('../server');
const wire = await import('../door/wire');
type PocketHandlerDeps = import('../server').PocketHandlerDeps;
type DoorAdmission = import('../bind').DoorAdmission;
type DoorRequest = import('../door/wire').DoorRequest;
type PocketPhoneFields = import('../pairing').PocketPhoneFields;
type PocketExecutionFields = import('../pairing').PocketExecutionFields;

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p330-server-'));
  logged.length = 0;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

const HEADERS = {
  'x-tortie-phone': 'phone-a',
  'x-tortie-timestamp': '1790000000000',
  'x-tortie-nonce': '0123456789abcdef',
  'x-tortie-signature': 's'.repeat(86)
};

function signed(route: 'blocked' | 'session' | 'turns', target: string, channel = 'phone-a'): DoorRequest {
  return { route, method: 'GET', target, headers: HEADERS, body: new Uint8Array(0), channel };
}

const PRESENTATION = { iv: 'A'.repeat(16), ct: 'B'.repeat(40), tag: 'C'.repeat(22), ek: 'D'.repeat(59), sig: 'E'.repeat(86) };

const open: DoorAdmission = { stopping: () => false };

/** Deps that answer everything, each overridable. */
function deps(over: Partial<PocketHandlerDeps> = {}): PocketHandlerDeps {
  return {
    shuttingDown: () => false,
    pairingWindowOpen: () => true,
    present: () => ({ state: 'pending' }),
    verify: () => ({ ok: true, phoneId: 'phone-a' }),
    stillPaired: () => true,
    answer: async () => ({ rows: [] }),
    ...over
  };
}

const words = (): string[] => logged.filter((l) => l.startsWith('warn refused a request at the door: '));

// ---------------------------------------------------------------------------
// The handler, typed request by typed request
// ---------------------------------------------------------------------------

describe('what main refuses', () => {
  it('refuses everything once the quit has begun, and everything its door has begun to stop, and reads nothing', async () => {
    const touched: string[] = [];
    const quitting = createPocketHandler(
      deps({
        shuttingDown: () => true,
        present: () => {
          touched.push('present');
          return { state: 'pending' };
        },
        verify: () => {
          touched.push('verify');
          return { ok: true, phoneId: 'phone-a' };
        },
        answer: async () => {
          touched.push('answer');
          return {};
        }
      })
    );
    expect(await quitting(signed('blocked', '/v1/blocked'), open)).toEqual({ status: 404, body: null });
    expect(await quitting({ route: 'pair', presentation: PRESENTATION }, open)).toEqual({ status: 404, body: null });
    const stopping = createPocketHandler(deps());
    expect(await stopping(signed('blocked', '/v1/blocked'), { stopping: () => true })).toEqual({ status: 404, body: null });
    // One line per reason per handler: two handlers, one word.
    expect(new Set(words())).toEqual(new Set(['warn refused a request at the door: shutdown']));
    // Refusal 1 comes FIRST: a quitting main presents, verifies and composes nothing.
    expect(touched).toEqual([]);
  });

  it('asks main’s own window again for /pair, and presents nothing outside it', async () => {
    const presented: unknown[] = [];
    const handle = createPocketHandler(
      deps({
        pairingWindowOpen: () => false,
        present: (p) => {
          presented.push(p);
          return { state: 'pending' };
        }
      })
    );
    expect(await handle({ route: 'pair', presentation: PRESENTATION }, open)).toEqual({ status: 404, body: null });
    expect(presented).toEqual([]);
    expect(words()).toContain('warn refused a request at the door: window');
  });

  it('answers /pair its three states, and the certificate only with allowed', async () => {
    const answers = [
      { state: 'pending' },
      { state: 'refused' },
      { state: 'allowed', cert: 'Q0VSVA' },
      // A composer that grew a field would still say only the state.
      { state: 'pending', cert: 'leaked', extra: 1 },
      { state: 'refused', cert: 'leaked' }
    ] as unknown as ReturnType<PocketHandlerDeps['present']>[];
    const bodies: (string | null)[] = [];
    for (const answer of answers) {
      const handle = createPocketHandler(deps({ present: () => answer }));
      bodies.push((await handle({ route: 'pair', presentation: PRESENTATION }, open)).body);
    }
    expect(bodies).toEqual([
      '{"state":"pending"}',
      '{"state":"refused"}',
      '{"state":"allowed","cert":"Q0VSVA"}',
      '{"state":"pending"}',
      '{"state":"refused"}'
    ]);
  });

  it('hands the verifier the channel, the target, the body and the four headers, and the composer the query', async () => {
    const verified: unknown[] = [];
    const composed: unknown[] = [];
    const handle = createPocketHandler(
      deps({
        verify: (input) => {
          verified.push(input);
          return { ok: true, phoneId: 'phone-a' };
        },
        answer: async (route, query) => {
          composed.push([route.id, route.path, query.get('id'), query.get('limit')]);
          return { turns: [] };
        }
      })
    );
    const answer = await handle(signed('turns', '/v1/turns?id=ses_1&limit=5', 'phone-a'), open);
    expect(answer).toEqual({ status: 200, body: '{"turns":[]}' });
    expect(verified).toEqual([
      { method: 'GET', target: '/v1/turns?id=ses_1&limit=5', body: Buffer.alloc(0), channel: 'phone-a', headers: HEADERS }
    ]);
    expect(composed).toEqual([['turns', '/v1/turns', 'ses_1', '5']]);
  });

  it('refuses for the verifier’s reason, one log line per reason per process', async () => {
    const handle = createPocketHandler(deps({ verify: () => ({ ok: false, reason: 'channel' }) }));
    for (let i = 0; i < 5; i += 1) {
      expect(await handle(signed('blocked', '/v1/blocked'), open)).toEqual({ status: 404, body: null });
    }
    expect(words()).toEqual(['warn refused a request at the door: channel']);
  });

  it('answers nothing the composer has nothing for', async () => {
    const handle = createPocketHandler(deps({ answer: async () => null }));
    expect(await handle(signed('session', '/v1/session?id=nobody'), open)).toEqual({ status: 404, body: null });
    expect(words()).toContain('warn refused a request at the door: route');
  });
});

describe('refusal 7: the answer is admitted again before it leaves', () => {
  async function composedThen(press: () => void, over: Partial<PocketHandlerDeps> = {}, door: DoorAdmission = open) {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handle = createPocketHandler(
      deps({
        answer: async () => {
          await held;
          return { rows: [] };
        },
        ...over
      })
    );
    const answer = handle(signed('blocked', '/v1/blocked'), door);
    await Promise.resolve();
    press();
    release();
    return answer;
  }

  it('answers when nothing changed (the control)', async () => {
    expect(await composedThen(() => undefined)).toEqual({ status: 200, body: '{"rows":[]}' });
  });

  it('refuses, unpaired, an answer composed for a phone removed while it was in flight', async () => {
    let paired = true;
    const asked: string[] = [];
    const answer = await composedThen(
      () => {
        paired = false;
      },
      {
        stillPaired: (id) => {
          asked.push(id);
          return paired;
        }
      }
    );
    expect(answer).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['phone-a']);
    expect(words()).toContain('warn refused a request at the door: unpaired');
  });

  it('refuses an answer composed while the door that accepted it began to stop', async () => {
    let stopping = false;
    const answer = await composedThen(
      () => {
        stopping = true;
      },
      {},
      { stopping: () => stopping }
    );
    expect(answer).toEqual({ status: 404, body: null });
    expect(words()).toContain('warn refused a request at the door: shutdown');
  });

  it('refuses an answer composed while the quit began', async () => {
    let quitting = false;
    const answer = await composedThen(
      () => {
        quitting = true;
      },
      { shuttingDown: () => quitting }
    );
    expect(answer).toEqual({ status: 404, body: null });
  });
});

describe('the source of the handler', () => {
  it('parses no stranger’s JSON and reads no body off a socket: the door process did both', async () => {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(join(__dirname, '..', 'server.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(text).not.toMatch(/JSON\.parse\(/);
    expect(text).not.toMatch(/\.on\(\s*'data'/);
    expect(text).not.toMatch(/remoteAddress|from:/);
    expect(POCKET_READ_BODY_CAP_BYTES).toBe(1024);
    expect(wire.POCKET_READ_BODY_CAP_BYTES).toBe(POCKET_READ_BODY_CAP_BYTES);
  });
});

// ---------------------------------------------------------------------------
// End to end on the shipping owners
// ---------------------------------------------------------------------------

interface HonestPhone {
  readonly fields: PocketPhoneFields;
  readonly sign: KeyObject;
}

function honestPhone(label: string): HonestPhone {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const signingKey = ed.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  return {
    fields: {
      id: pairing.phoneIdOf(signingKey),
      label,
      signingKey,
      exchangeKey: x.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
      clientKey: ec.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
      pushToken: '',
      pushEnvironment: ''
    },
    sign: ed.privateKey
  };
}

describe('end to end on the shipping pairing and verifier', () => {
  it('pairs by proof, hands the certificate to the allowed phone alone, and reads over its own channel only', async () => {
    const { identity } = pairing.newIdentity();
    const { privateKey: doorKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const doorKeyPem = doorKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const { issueClientCertificate } = await import('../tls');
    let phones: PocketPhoneFields[] = [];
    const fields = (): PocketExecutionFields => ({
      ...pairing.EMPTY_POCKET_FIELDS,
      funnelProgram: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      tailnet: 'example.github',
      publicName: 'mac.tail00000.ts.net',
      publicPort: 8443,
      routes: ['pair', 'blocked', 'session', 'turns'],
      phones
    });
    const owner = new pairing.PocketPairing({
      identity: () => identity,
      fieldsNow: fields,
      savePhones: (next) => {
        phones = [...next];
        return true;
      },
      publicKeyPin: () => createHash('sha256').update('door').digest('base64url'),
      issueCertificate: (clientKey) => issueClientCertificate(doorKeyPem, clientKey, Date.now()).toString('base64url')
    });
    const verifier = new pairing.PocketRequestVerifier({ identity: () => identity, phones: () => phones });
    const handle = createPocketHandler({
      shuttingDown: () => false,
      pairingWindowOpen: () => owner.windowOpen(),
      present: (p) => owner.present(p),
      verify: (input) => {
        const v = verifier.verify(input);
        return v.ok ? { ok: true, phoneId: v.phone.id } : { ok: false, reason: v.reason };
      },
      stillPaired: (id) => phones.some((p) => p.id === id),
      answer: async (route) => ({ route: route.id })
    });

    const offer = owner.open();
    const good = honestPhone('the honest phone');
    const thief = honestPhone('a second phone that saw the screen');
    const presentationOf = (phone: HonestPhone): DoorRequest => {
      const body = pairing.sealPresentationAsPhone(
        offer.payload,
        {
          label: phone.fields.label,
          signingKey: phone.fields.signingKey,
          exchangeKey: phone.fields.exchangeKey,
          clientKey: phone.fields.clientKey
        },
        phone.sign
      );
      // What the door process forwards: the outer JSON, validated.
      const presentation = wire.presentationOf(JSON.parse(body.toString('utf8')));
      if (presentation === null) throw new Error('the phone’s own body did not validate at the door');
      return { route: 'pair', presentation };
    };

    expect((await handle(presentationOf(good), open)).body).toBe('{"state":"pending"}');
    const summary = pairing.describePocketDoor(owner.fieldsWithPending());
    const allowed = owner.allow({
      acknowledgement: pairing.POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: summary.lines,
      hashRead: summary.hash
    });
    expect(allowed).toEqual({ allowed: true, refusal: null });

    const answer = await handle(presentationOf(good), open);
    const body = JSON.parse(answer.body ?? '{}') as { state: string; cert?: string };
    expect(Object.keys(body).sort()).toEqual(['cert', 'state']);
    expect(body.state).toBe('allowed');
    const cert = new X509Certificate(Buffer.from(body.cert ?? '', 'base64url'));
    expect(cert.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url')).toBe(good.fields.clientKey);
    // A second phone that photographed the same screen proves another key.
    expect((await handle(presentationOf(thief), open)).body).toBe('{"state":"refused"}');

    // A signed read, verified by the shipping verifier, over the phone's own channel.
    const read = (channel: string, nonce = randomBytes(12).toString('hex')): DoorRequest => {
      const timestamp = String(Date.now());
      const target = '/v1/blocked';
      const signature = pairing.signAsPhone(good.sign, {
        method: 'GET',
        target,
        bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
        timestamp,
        nonce,
        binding: pairing.pairingBinding(identity, good.fields)
      });
      return {
        route: 'blocked',
        method: 'GET',
        target,
        headers: {
          'x-tortie-phone': good.fields.id,
          'x-tortie-timestamp': timestamp,
          'x-tortie-nonce': nonce,
          'x-tortie-signature': signature
        },
        body: new Uint8Array(0),
        channel
      };
    };
    expect(await handle(read(good.fields.id), open)).toEqual({ status: 200, body: '{"route":"blocked"}' });
    // The same valid signature over ANOTHER phone's connection.
    expect(await handle(read(thief.fields.id), open)).toEqual({ status: 404, body: null });
    expect(words()).toContain('warn refused a request at the door: channel');
    // A replay, byte for byte.
    const once = read(good.fields.id, 'a'.repeat(24));
    expect((await handle(once, open)).status).toBe(200);
    expect(await handle(once, open)).toEqual({ status: 404, body: null });
    expect(words()).toContain('warn refused a request at the door: replay');
  });
});
