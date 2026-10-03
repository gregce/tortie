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
    expect(doorRequestOf(read({ method: 'POST' }))).toBeNull();
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

// PHASE 317 (build/p317/SPEC.md §5.3.1): the two writes. The method is POST
// EXACTLY for a write and GET exactly for a read, a write's target is its
// route's path byte for byte with no query, and its body is at most its OWN
// route's cap. Nothing here parses the body.
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
    expect(POCKET_WRITE_BODY_CAPS).toEqual({ end: 512 });
    expect(Object.isFrozen(POCKET_WRITE_BODY_CAPS)).toBe(true);
    expect(doorRequestOf(write({ body: new Uint8Array(512) }))).not.toBeNull();
    expect(doorRequestOf(write({ body: new Uint8Array(513) }))).toBeNull();
    // A read is still held to the read cap.
    expect(POCKET_READ_BODY_CAP_BYTES).toBe(1024);
  });

  it('refuses a route that is neither a read nor the one write', () => {
    expect(doorRequestOf(write({ route: 'say', target: '/v1/say' }))).toBeNull();
    expect(doorRequestOf(write({ route: 'choose', target: '/v1/choose' }))).toBeNull();
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
