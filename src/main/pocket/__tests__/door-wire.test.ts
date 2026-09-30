/**
 * The wire between main and the door process (Phase 330, build/p330/SPEC.md
 * §4.5.2): both validators, every bound, and that a message which does not
 * validate is dropped WHOLE rather than half-read.
 */

import { describe, expect, it } from 'vitest';

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
