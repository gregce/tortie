/**
 * The wire between main and the door process (Phase 330, build/p330/SPEC.md
 * §4.5.2): both validators, every bound, and that a message which does not
 * validate is dropped WHOLE rather than half-read.
 */

import { describe, expect, it } from 'vitest';

import { POCKET_WRITE_BODY_CAPS } from '../door/limits';
import {
  DOOR_ANSWER_MAX_BYTES,
  DOOR_REFUSAL_WORDS,
  POCKET_READ_BODY_CAP_BYTES,
  doorRequestOf,
  fromDoorOf,
  presentationOf,
  signatureHeadersOf,
  toDoorOf
} from '../door/wire';

const PIN = 'A'.repeat(43);
const HEADERS = {
  'x-tortie-phone': 'phone-a',
  'x-tortie-timestamp': '1790000000000',
  'x-tortie-nonce': '0123456789abcdef',
  'x-tortie-signature': 's'.repeat(86)
};
const PRESENTATION = { iv: 'A'.repeat(16), ct: 'B'.repeat(40), tag: 'C'.repeat(22), ek: 'D'.repeat(59), sig: 'E'.repeat(86) };

function read(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    route: 'blocked',
    method: 'GET',
    target: '/v1/blocked',
    headers: HEADERS,
    body: new Uint8Array(0),
    channel: 'phone-a',
    ...over
  };
}

describe('what the door forwards', () => {
  it('keeps exactly the fields the type names, and nothing else on the object', () => {
    const got = doorRequestOf({ ...read(), source: '203.0.113.7', raw: 'bytes' });
    expect(got).not.toBeNull();
    expect(Object.keys(got ?? {}).sort()).toEqual(['body', 'channel', 'headers', 'method', 'route', 'target']);
    const headers = signatureHeadersOf({ ...HEADERS, cookie: 'x', host: 'y' });
    expect(Object.keys(headers ?? {}).sort()).toEqual([
      'x-tortie-nonce',
      'x-tortie-phone',
      'x-tortie-signature',
      'x-tortie-timestamp'
    ]);
  });

  it('refuses every header out of its bound', () => {
    for (const [name, value] of [
      ['x-tortie-phone', ''],
      ['x-tortie-phone', 'p'.repeat(65)],
      ['x-tortie-timestamp', ''],
      ['x-tortie-timestamp', '1'.repeat(21)],
      ['x-tortie-nonce', 'n'.repeat(15)],
      ['x-tortie-nonce', 'n'.repeat(65)],
      ['x-tortie-signature', ''],
      ['x-tortie-signature', 's'.repeat(129)]
    ] as const) {
      expect(signatureHeadersOf({ ...HEADERS, [name]: value }), `${name}=${value.length}`).toBeNull();
    }
    expect(signatureHeadersOf({ ...HEADERS, 'x-tortie-nonce': ['a', 'b'] })).toBeNull();
  });

  it('refuses a target over 1,024 characters, not in origin form, a body over the cap, and no channel', () => {
    expect(doorRequestOf(read({ target: `/v1/blocked?${'x'.repeat(1024)}` }))).toBeNull();
    expect(doorRequestOf(read({ target: 'v1/blocked' }))).toBeNull();
    expect(doorRequestOf(read({ body: new Uint8Array(POCKET_READ_BODY_CAP_BYTES + 1) }))).toBeNull();
    expect(doorRequestOf(read({ body: 'not bytes' }))).toBeNull();
    expect(doorRequestOf(read({ channel: null }))).toBeNull();
    expect(doorRequestOf(read({ route: 'pair' }))).toBeNull();
    expect(doorRequestOf(read({ route: 'end' }))).toBeNull();
    expect(doorRequestOf(read({ route: 'choose' }))).toBeNull();
    expect(doorRequestOf(read({ route: 'say' }))).toBeNull();
    expect(doorRequestOf(read({ route: 'keys' }))).toBeNull();
    expect(doorRequestOf(read({ method: 'POST' }))).toBeNull();
  });

  // PHASE 337 (build/p337/SPEC.md §5.1, D1, D2): the Screen's read is a signed
  // GET like the others, its query carried in the target untouched, and never
  // a POST; the door reads nothing of the query, which main refuses itself.
  it('forwards the Screen read, a signed GET with its query, and refuses it as a POST (Phase 337)', () => {
    const target = '/v1/screen?id=3f2a1b4c-0000-4000-8000-000000000001&since=0123456789ab';
    expect(doorRequestOf(read({ route: 'screen', target }))).toEqual({
      route: 'screen',
      method: 'GET',
      target,
      headers: HEADERS,
      body: new Uint8Array(0),
      channel: 'phone-a'
    });
    expect(doorRequestOf(read({ route: 'screen', method: 'POST', target }))).toBeNull();
    expect(doorRequestOf(read({ route: 'screen', target: `/v1/screen?${'x'.repeat(1024)}` }))).toBeNull();
    expect(doorRequestOf(read({ route: 'screens', target: '/v1/screen' }))).toBeNull();
  });

  // PHASE 337.1 (build/p3371/SPEC.md §5.1, D1, D7): one page of the Screen's
  // history is a signed GET like the others, its six names carried in the
  // target untouched, and never a POST; the door reads nothing of the query,
  // which main refuses itself.
  it('forwards the history read, a signed GET with its query, and refuses it as a POST (Phase 337.1)', () => {
    const target = '/v1/scrollback?id=3f2a1b4c-0000-4000-8000-000000000001&from=2900&count=108&depth=3000&wrap=120&keep=bottom';
    expect(doorRequestOf(read({ route: 'scrollback', target }))).toEqual({
      route: 'scrollback',
      method: 'GET',
      target,
      headers: HEADERS,
      body: new Uint8Array(0),
      channel: 'phone-a'
    });
    expect(doorRequestOf(read({ route: 'scrollback', method: 'POST', target }))).toBeNull();
    expect(doorRequestOf(read({ route: 'scrollback', target: `/v1/scrollback?${'x'.repeat(1024)}` }))).toBeNull();
    expect(doorRequestOf(read({ route: 'scrollbacks', target: '/v1/scrollback' }))).toBeNull();
    expect(doorRequestOf(read({ route: 'history', target: '/v1/scrollback' }))).toBeNull();
  });

  // PHASE 316.7 (build/p3167/SPEC.md §6.2): the Sessions tab's read is a signed
  // GET like the other three, its query carried in the target untouched, and
  // nothing else about the door moved.
  it('forwards the Sessions read, a signed GET with its query, and refuses it as a POST', () => {
    const target = '/v1/sessions?show=all&group=none&sort=name&agent=claude&machine=local';
    const got = doorRequestOf(read({ route: 'sessions', target }));
    expect(got).toEqual({
      route: 'sessions',
      method: 'GET',
      target,
      headers: HEADERS,
      body: new Uint8Array(0),
      channel: 'phone-a'
    });
    expect(doorRequestOf(read({ route: 'sessions', method: 'POST', target }))).toBeNull();
    expect(doorRequestOf(read({ route: 'sessions', target: `/v1/sessions?${'x'.repeat(1024)}` }))).toBeNull();
    expect(doorRequestOf(read({ route: 'session', target: '/v1/session?id=a' }))).not.toBeNull();
    expect(doorRequestOf(read({ route: 'sessionz', target: '/v1/sessions' }))).toBeNull();
  });

  it('holds a presentation to its five bounded base64url fields', () => {
    expect(presentationOf(PRESENTATION)).toEqual(PRESENTATION);
    for (const [name, value] of [
      ['iv', 'A'.repeat(15)],
      ['tag', 'C'.repeat(23)],
      ['sig', 'E'.repeat(85)],
      ['ek', 'D'.repeat(129)],
      ['ct', ''],
      ['ct', 'B'.repeat(4097)],
      ['ct', 'a+b/'],
      ['iv', 5]
    ] as const) {
      expect(presentationOf({ ...PRESENTATION, [name]: value }), `${name}`).toBeNull();
    }
    expect(doorRequestOf({ route: 'pair', presentation: PRESENTATION })).toEqual({
      route: 'pair',
      presentation: PRESENTATION
    });
  });

  it('validates every message the door sends main', () => {
    expect(fromDoorOf({ kind: 'listening', localPort: 51_234 })).toEqual({ kind: 'listening', localPort: 51_234 });
    expect(fromDoorOf({ kind: 'listening', localPort: 0 })).toBeNull();
    expect(fromDoorOf({ kind: 'refused', reason: 'bind-failed' })).not.toBeNull();
    expect(fromDoorOf({ kind: 'refused', reason: 'port-taken' })).toBeNull();
    for (const word of DOOR_REFUSAL_WORDS) expect(fromDoorOf({ kind: 'refusal', word })).not.toBeNull();
    expect(fromDoorOf({ kind: 'refusal', word: '203.0.113.7' })).toBeNull();
    expect(fromDoorOf({ kind: 'request', id: 1, generation: 2, request: read() })).not.toBeNull();
    expect(fromDoorOf({ kind: 'request', id: -1, generation: 2, request: read() })).toBeNull();
    expect(fromDoorOf({ kind: 'request', id: 1, generation: 2, request: read({ channel: 7 }) })).toBeNull();
    expect(fromDoorOf({ kind: 'stopped', accepted: 1, joined: true, waitedMs: 3 })).not.toBeNull();
    expect(fromDoorOf({ kind: 'nothing' })).toBeNull();
    expect(fromDoorOf('listening')).toBeNull();
  });
});

// PHASE 317 (build/p317/SPEC.md §5.3.1), widened by PHASE 318 (build/p318/SPEC.md
// §5.1.1): the three writes, end, choose and say. The method is POST EXACTLY for
// a write and GET exactly for a read, a write's target is its route's path byte
// for byte with no query, and its body is at most its OWN route's cap. Nothing
// here parses the body.
describe('a write the door forwards', () => {
  function write(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      route: 'end',
      method: 'POST',
      target: '/v1/end',
      headers: HEADERS,
      body: new Uint8Array(Buffer.from('{"batch":false,"session":"s","write":"' + '0'.repeat(32) + '"}')),
      channel: 'phone-a',
      ...over
    };
  }

  it('lets a POST to its exact path through, with exactly the fields the type names', () => {
    const got = doorRequestOf({ ...write(), source: '203.0.113.7' });
    expect(got).not.toBeNull();
    expect(got).toMatchObject({ route: 'end', method: 'POST', target: '/v1/end', channel: 'phone-a' });
    expect(Object.keys(got ?? {}).sort()).toEqual(['body', 'channel', 'headers', 'method', 'route', 'target']);
  });

  it('refuses a write that is not a POST, and a read that is not a GET', () => {
    expect(doorRequestOf(write({ method: 'GET' }))).toBeNull();
    expect(doorRequestOf(write({ method: 'post' }))).toBeNull();
    expect(doorRequestOf(read({ method: 'POST' }))).toBeNull();
  });

  it('refuses a write whose target is not its own path byte for byte', () => {
    for (const target of ['/v1/end?x=1', '/v1/end?', '/v1/end/', '/v1/End', '/v1/unpair', '/v1/endx', '/v1/blocked']) {
      expect(doorRequestOf(write({ target })), target).toBeNull();
    }
    // The write the fix round removed is no route at all (build/p317/SPEC.md "§Fix round").
    expect(doorRequestOf(write({ route: 'unpair', target: '/v1/unpair' }))).toBeNull();
    expect(doorRequestOf(write({ route: 'unpair', target: '/v1/end' }))).toBeNull();
  });

  it('holds the write to its OWN route’s cap, and lets a body exactly at the cap through', () => {
    expect(POCKET_WRITE_BODY_CAPS).toEqual({ end: 512, choose: 512, say: 32_768, keys: 16_384 });
    expect(Object.isFrozen(POCKET_WRITE_BODY_CAPS)).toBe(true);
    expect(doorRequestOf(write({ body: new Uint8Array(512) }))).not.toBeNull();
    expect(doorRequestOf(write({ body: new Uint8Array(513) }))).toBeNull();
    // A read is still held to the read cap.
    expect(POCKET_READ_BODY_CAP_BYTES).toBe(1024);
  });

  it('lets a POST to /v1/choose and /v1/say through, each its own route and its own path (Phase 318)', () => {
    for (const route of ['choose', 'say'] as const) {
      const got = doorRequestOf(write({ route, target: `/v1/${route}` }));
      expect(got, route).toMatchObject({ route, method: 'POST', target: `/v1/${route}`, channel: 'phone-a' });
      expect(Object.keys(got ?? {}).sort()).toEqual(['body', 'channel', 'headers', 'method', 'route', 'target']);
      // Never as a GET, never at another write's path, never with a query.
      expect(doorRequestOf(write({ route, target: `/v1/${route}`, method: 'GET' })), route).toBeNull();
      expect(doorRequestOf(write({ route, target: '/v1/end' })), route).toBeNull();
      for (const near of [`/v1/${route}?x=1`, `/v1/${route}/`, `/v1/${route.toUpperCase()}`, `/v1/${route}s`]) {
        expect(doorRequestOf(write({ route, target: near })), near).toBeNull();
      }
    }
    expect(doorRequestOf(write({ route: 'end', target: '/v1/say' }))).toBeNull();
  });

  it('holds choose to 512 bytes and say to 32,768, each exactly at its cap through and one byte over refused (Phase 318)', () => {
    const at = (route: 'choose' | 'say', n: number) => doorRequestOf(write({ route, target: `/v1/${route}`, body: new Uint8Array(n) }));
    expect(at('choose', 512)).not.toBeNull();
    expect(at('choose', 513)).toBeNull();
    expect(at('say', 32_768)).not.toBeNull();
    expect(at('say', 32_769)).toBeNull();
    // Each route's own cap, never another's: a say body over end's 512 still crosses.
    expect(at('say', 24_771)).not.toBeNull();
    expect(doorRequestOf(write({ body: new Uint8Array(24_771) }))).toBeNull();
  });

  // PHASE 337 (build/p337/SPEC.md §5.1, D1, D17): the keys write, its own
  // path, a POST only, never with a query, and its own cap of 16,384.
  it('lets a POST to /v1/keys through at its own path and holds it to 16,384 bytes (Phase 337)', () => {
    const got = doorRequestOf(write({ route: 'keys', target: '/v1/keys' }));
    expect(got).toMatchObject({ route: 'keys', method: 'POST', target: '/v1/keys', channel: 'phone-a' });
    expect(Object.keys(got ?? {}).sort()).toEqual(['body', 'channel', 'headers', 'method', 'route', 'target']);
    expect(doorRequestOf(write({ route: 'keys', target: '/v1/keys', method: 'GET' }))).toBeNull();
    expect(doorRequestOf(write({ route: 'keys', target: '/v1/say' }))).toBeNull();
    expect(doorRequestOf(write({ route: 'say', target: '/v1/keys' }))).toBeNull();
    for (const near of ['/v1/keys?x=1', '/v1/keys?', '/v1/keys/', '/v1/KEYS', '/v1/key']) {
      expect(doorRequestOf(write({ route: 'keys', target: near })), near).toBeNull();
    }
    const at = (n: number) => doorRequestOf(write({ route: 'keys', target: '/v1/keys', body: new Uint8Array(n) }));
    expect(at(16_384)).not.toBeNull();
    expect(at(16_385)).toBeNull();
    // §14 M15's worst legal keys body crosses; at end's cap it would not.
    expect(at(7_359)).not.toBeNull();
    expect(doorRequestOf(write({ body: new Uint8Array(7_359) }))).toBeNull();
  });

  it('refuses a route that is neither a read nor one of the four writes', () => {
    for (const route of ['unpair', 'reply', 'type', 'interrupt', 'resize', 'paste']) {
      expect(doorRequestOf(write({ route, target: `/v1/${route}` })), route).toBeNull();
    }
  });

  it('copies the body rather than handing on the caller’s bytes', () => {
    const bytes = new Uint8Array(Buffer.from('{}'));
    const got = doorRequestOf(write({ body: bytes }));
    expect(got !== null && got.route !== 'pair' ? got.body : null).not.toBe(bytes);
  });

  it('crosses as a request message main validates the same way', () => {
    expect(fromDoorOf({ kind: 'request', id: 1, generation: 2, request: write() })).not.toBeNull();
    expect(fromDoorOf({ kind: 'request', id: 1, generation: 2, request: write({ target: '/v1/end?q' }) })).toBeNull();
  });
});

describe('what main tells the door', () => {
  const start = {
    kind: 'start',
    generation: 3,
    tls: { key: 'k', cert: 'c' },
    pins: [{ phoneId: 'phone-a', spkiSha256: PIN }],
    host: { name: 'mac.tail00000.ts.net', port: 8443 },
    windowOpen: false
  };

  it('accepts a start, and refuses one with generation 0, a bad pin, a duplicate key or no host', () => {
    expect(toDoorOf(start)).toEqual(start);
    expect(toDoorOf({ ...start, generation: 0 })).toBeNull();
    expect(toDoorOf({ ...start, pins: [{ phoneId: 'a', spkiSha256: 'short' }] })).toBeNull();
    expect(
      toDoorOf({
        ...start,
        pins: [
          { phoneId: 'a', spkiSha256: PIN },
          { phoneId: 'b', spkiSha256: PIN }
        ]
      })
    ).toBeNull();
    expect(toDoorOf({ ...start, host: { name: '', port: 8443 } })).toBeNull();
    expect(toDoorOf({ ...start, host: { name: 'x', port: 70_000 } })).toBeNull();
    expect(toDoorOf({ ...start, windowOpen: 'yes' })).toBeNull();
  });

  it('refuses an answer that carries a body on a 404, or a body over 2 MiB', () => {
    expect(toDoorOf({ kind: 'answer', id: 1, status: 404, body: null })).not.toBeNull();
    expect(toDoorOf({ kind: 'answer', id: 1, status: 404, body: 'the reason' })).toBeNull();
    expect(toDoorOf({ kind: 'answer', id: 1, status: 500, body: null })).toBeNull();
    expect(toDoorOf({ kind: 'answer', id: 1, status: 200, body: 'x'.repeat(DOOR_ANSWER_MAX_BYTES) })).not.toBeNull();
    expect(toDoorOf({ kind: 'answer', id: 1, status: 200, body: 'x'.repeat(DOOR_ANSWER_MAX_BYTES + 1) })).toBeNull();
    // Bytes, not characters: two-byte characters count twice.
    expect(toDoorOf({ kind: 'answer', id: 1, status: 200, body: 'é'.repeat(DOOR_ANSWER_MAX_BYTES / 2 + 1) })).toBeNull();
  });

  it('refuses an update whose pins do not validate, whole', () => {
    expect(toDoorOf({ kind: 'update', windowOpen: true })).toEqual({ kind: 'update', windowOpen: true });
    expect(toDoorOf({ kind: 'update', pins: [{ phoneId: 'a', spkiSha256: PIN }], windowOpen: 1 })).toBeNull();
    expect(toDoorOf({ kind: 'update', pins: 'all' })).toBeNull();
    expect(toDoorOf({ kind: 'shutdown' })).toEqual({ kind: 'shutdown' });
    expect(toDoorOf({ kind: 'stop', extra: 1 })).toEqual({ kind: 'stop' });
  });
});
