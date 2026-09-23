/**
 * build/p316/node-phone.mjs — a phone written in node, from the door's WIRE
 * FORMAT and not from `src/main/pocket/` (Phase 316.2).
 *
 * WHY A THIRD IMPLEMENTATION. The Mac's door is TypeScript and the app is
 * Swift; `probe:p316`'s Method A needs a reader that is neither, so the Swift is
 * never the judge of the Swift and the door is never the judge of the door
 * (build/p316/SPEC.md §4 S2, Method A). Everything here is re-derived from
 * `pairing.ts`'s documented format — the seven-line canonical text, the X25519
 * binding under `tortie-pocket-bind-v1`, the seal under `tortie-pocket-pair-v1`,
 * the phone id under `tortie-pocket-id-v1`, and the SPKI pin the Swift way (the
 * 26-byte P-256 header, the 65-byte point, sha256, base64url; SPEC §3.3) — so a
 * change on either side that the other did not make shows up as a refusal.
 * build/probe-p313.mjs carries its own copy of the same client, written for
 * Phase 316.1; this file is the one a later probe imports rather than copies.
 *
 * It also holds the two halves the hostile door and its self-test share: the
 * door-side verifier (the same format read from the other end, so the hostile
 * door can say whether the app's signature held), and a SOCKS5 client for the
 * stand-in's self-test.
 *
 * LOOPBACK ONLY. Every connection this file makes is to 127.0.0.1, directly or
 * through a SOCKS5 stand-in on 127.0.0.1. `request` refuses any other host
 * before a socket exists. It logs nothing: not a key, not a signature, not a
 * body.
 */

import {
  X509Certificate,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  verify as verifyWith
} from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
export const shaHex = (data) => createHash('sha256').update(data).digest('hex');
const J = JSON.stringify;

/** The DER header of a P-256 SubjectPublicKeyInfo, before its 65-byte point. */
export const SPKI_P256_HEADER = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');

/** The pin of a peer certificate, the phone's way, or null. */
export function pinOfPeer(peer) {
  if (peer === undefined || peer === null) return null;
  if (Buffer.isBuffer(peer.pubkey) && peer.pubkey.length === 65) {
    return b64u(createHash('sha256').update(Buffer.concat([SPKI_P256_HEADER, peer.pubkey])).digest());
  }
  if (Buffer.isBuffer(peer.raw)) {
    const spki = new X509Certificate(peer.raw).publicKey.export({ type: 'spki', format: 'der' });
    return b64u(createHash('sha256').update(spki).digest());
  }
  return null;
}

/** The pin of a PEM certificate, from its SubjectPublicKeyInfo. */
export function pinOfPem(certPem) {
  const spki = new X509Certificate(certPem).publicKey.export({ type: 'spki', format: 'der' });
  return b64u(createHash('sha256').update(spki).digest());
}

/** The six groups of four both screens show, over both of the phone's keys. */
export function fingerprintOf(signingKey, exchangeKey) {
  return (shaHex(`tortie-pocket-fp-v1\n${signingKey}\n${exchangeKey}`).slice(0, 24).match(/.{4}/g) ?? []).join(' ');
}

/** A fingerprint reduced to its hex digits, lower case, for comparison. */
export const fingerprintDigits = (text) => String(text ?? '').toLowerCase().replace(/[^0-9a-f]/g, '');

/** The binding of one pairing, from either end: X25519, then HKDF. */
export function bindingOf(privateKey, peerSpkiB64u, doorExchangeKey, phoneExchangeKey) {
  const shared = diffieHellman({
    privateKey,
    publicKey: createPublicKey({ key: Buffer.from(peerSpkiB64u, 'base64url'), format: 'der', type: 'spki' })
  });
  return Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${doorExchangeKey}\n${phoneExchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
}

/** The seven lines a signature covers. */
export function canonicalText(method, target, bodySha, timestamp, nonce, binding) {
  return ['tortie-pocket-req-v1', method.toUpperCase(), target, bodySha, timestamp, nonce, binding].join('\n');
}

/** A phone: its two long-lived keys, its id, its binding to one door, its fingerprint. */
export function makePhone(label, doorExchangeKey) {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const signingKey = b64u(signing.publicKey.export({ type: 'spki', format: 'der' }));
  const exchangeKey = b64u(exchange.publicKey.export({ type: 'spki', format: 'der' }));
  return {
    label,
    id: shaHex(`tortie-pocket-id-v1\n${signingKey}`).slice(0, 32),
    signingKey,
    exchangeKey,
    signPrivate: signing.privateKey,
    binding: bindingOf(exchange.privateKey, doorExchangeKey, doorExchangeKey, exchangeKey),
    fingerprint: fingerprintOf(signingKey, exchangeKey)
  };
}

/** The pairing key the QR's one-shot secret derives. */
const sealKeyOf = (psB64u) => Buffer.from(hkdfSync('sha256', Buffer.from(psB64u, 'base64url'), Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));

/** A presentation sealed under the QR's secret, the phone's way. */
export function sealPresentation(psB64u, phone) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKeyOf(psB64u), iv);
  const plain = Buffer.from(J({ label: phone.label, ek: phone.signingKey, xk: phone.exchangeKey }), 'utf8');
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.from(J({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }), 'utf8');
}

/** The door's side: open a sealed presentation, or null. */
export function openPresentation(psB64u, body) {
  try {
    const outer = JSON.parse(Buffer.from(body).toString('utf8'));
    const iv = Buffer.from(String(outer.iv ?? ''), 'base64url');
    const ct = Buffer.from(String(outer.ct ?? ''), 'base64url');
    const tag = Buffer.from(String(outer.tag ?? ''), 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;
    const decipher = createDecipheriv('aes-256-gcm', sealKeyOf(psB64u), iv);
    decipher.setAuthTag(tag);
    const inner = JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'));
    if (typeof inner.ek !== 'string' || typeof inner.xk !== 'string') return null;
    return { label: String(inner.label ?? ''), signingKey: inner.ek, exchangeKey: inner.xk };
  } catch {
    return null;
  }
}

/** The door's side: does this signed request hold for this phone? One word. */
export function verifySigned({ method, target, headers, body, phone, doorExchangePrivate, doorExchangeKey }) {
  const id = headers['x-tortie-phone'];
  const timestamp = headers['x-tortie-timestamp'];
  const nonce = headers['x-tortie-nonce'];
  const signature = headers['x-tortie-signature'];
  if (phone === null || phone === undefined) return 'unpaired';
  if (id !== shaHex(`tortie-pocket-id-v1\n${phone.signingKey}`).slice(0, 32)) return 'phone';
  if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 64) return 'nonce';
  if (typeof timestamp !== 'string' || !/^\d+$/.test(timestamp) || Math.abs(Number(timestamp) - Date.now()) > 60_000) return 'clock';
  const binding = bindingOf(doorExchangePrivate, phone.exchangeKey, doorExchangeKey, phone.exchangeKey);
  const text = canonicalText(method, target, shaHex(body ?? Buffer.alloc(0)), timestamp, nonce, binding);
  try {
    const key = createPublicKey({ key: Buffer.from(phone.signingKey, 'base64url'), format: 'der', type: 'spki' });
    return verifyWith(null, Buffer.from(text, 'utf8'), key, Buffer.from(String(signature ?? ''), 'base64url')) ? 'ok' : 'signature';
  } catch {
    return 'signature';
  }
}

/** The headers a signed GET carries. */
export function signedHeaders(phone, target) {
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const text = canonicalText('GET', target, shaHex(Buffer.alloc(0)), timestamp, nonce, phone.binding);
  return {
    'x-tortie-phone': phone.id,
    'x-tortie-timestamp': timestamp,
    'x-tortie-nonce': nonce,
    'x-tortie-signature': b64u(signWith(null, Buffer.from(text, 'utf8'), phone.signPrivate))
  };
}

/**
 * One request to a door on 127.0.0.1. It never rejects: a refusal that arrives
 * as a dead socket is itself a reading. Nothing is sent before the pin holds;
 * `pin: null` skips the check and is for the hostile door's self-test alone.
 */
export function request({ host = '127.0.0.1', port, method, target, headers = {}, body = null, pin, timeoutMs = 20_000, capBytes = Infinity }) {
  if (host !== '127.0.0.1') return Promise.resolve({ status: 0, body: '', bytes: 0, error: `refused to dial ${host}; this client dials 127.0.0.1 only` });
  return new Promise((done) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done(value);
    };
    const req = httpsRequest({ host, port, method, path: target, agent: false, rejectUnauthorized: false, headers }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on('data', (c) => {
        bytes += c.length;
        if (bytes > capBytes) {
          req.destroy();
          finish({ status: res.statusCode ?? 0, body: '', bytes, error: 'over the cap' });
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => finish({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8'), bytes }));
      res.on('error', (err) => finish({ status: 0, body: '', bytes, error: String(err?.message ?? err) }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timed out')));
    req.on('socket', (socket) => {
      socket.on('secureConnect', () => {
        if (pin === null) return;
        const got = pinOfPeer(socket.getPeerCertificate?.());
        if (got !== pin) {
          socket.destroy();
          finish({ status: 0, body: '', bytes: 0, error: 'the door presented a key that is not the pinned one' });
        }
      });
    });
    req.on('error', (err) => finish({ status: 0, body: '', bytes: 0, error: String(err?.message ?? err) }));
    if (body !== null) req.write(body);
    req.end();
  });
}

/** A signed GET from an honest phone. */
export function signedGet(phone, door, target, options = {}) {
  return request({ port: door.port, method: 'GET', target, headers: signedHeaders(phone, target), pin: door.pin, ...options });
}

/** POST /pair with a presentation. */
export function present(door, sealed, options = {}) {
  return request({ port: door.port, method: 'POST', target: '/pair', headers: { 'content-type': 'application/json' }, body: sealed, pin: door.pin, ...options });
}

/** Every page of one conversation, newest first, back to the first turn, as the phone must page it. */
export async function pageBack(phone, door, sessionId, limit, maxPages = 400) {
  const pages = [];
  let to = null;
  for (let i = 0; i < maxPages; i += 1) {
    const target = `/v1/turns?id=${encodeURIComponent(sessionId)}&limit=${String(limit)}${to === null ? '' : `&to=${String(to)}`}`;
    const answer = await signedGet(phone, door, target);
    let body = null;
    try {
      body = JSON.parse(answer.body);
    } catch {
      body = null;
    }
    if (answer.status !== 200 || body === null || !Array.isArray(body.turns)) return { ok: false, pages, why: `page ${String(i)} answered ${String(answer.status)} ${answer.error ?? ''}` };
    pages.push(body);
    if (body.more !== true) return { ok: true, pages, why: '' };
    if (body.turns.length === 0) return { ok: false, pages, why: `page ${String(i)} says more and carries nothing` };
    to = body.turns[0].index - 1;
  }
  return { ok: false, pages, why: `more than ${String(maxPages)} pages` };
}

/**
 * A SOCKS5 CONNECT through a stand-in on 127.0.0.1, then TLS over it: the node
 * twin of what TailscaleKit's `URLSession+Tailscale.swift` does (SPEC §3.2),
 * for the stand-in's self-test. `ipv4` is written as ATYP=1.
 */
export function socksTls({ socksPort, ipv4, port, servername = undefined }) {
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port: socksPort });
    let stage = 'greet';
    let buf = Buffer.alloc(0);
    const fail = (why) => {
      socket.destroy();
      done({ ok: false, why });
    };
    socket.setTimeout(10_000, () => fail('timed out'));
    socket.once('connect', () => socket.write(Buffer.from([5, 1, 0])));
    socket.on('error', (err) => fail(String(err?.message ?? err)));
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (stage === 'greet' && buf.length >= 2) {
        if (buf[0] !== 5 || buf[1] !== 0) return fail(`the stand-in answered the greeting ${buf.subarray(0, 2).toString('hex')}`);
        buf = buf.subarray(2);
        stage = 'connect';
        const octets = ipv4.split('.').map(Number);
        const req = Buffer.from([5, 1, 0, 1, ...octets, (port >> 8) & 0xff, port & 0xff]);
        socket.write(req);
        return;
      }
      if (stage === 'connect' && buf.length >= 10) {
        const code = buf[1];
        socket.removeAllListeners('data');
        socket.setTimeout(0);
        if (code !== 0) return fail(`the stand-in refused the CONNECT with ${String(code)}`);
        const tls = tlsConnect({ socket, rejectUnauthorized: false, servername });
        tls.once('secureConnect', () => done({ ok: true, tls, peer: tls.getPeerCertificate() }));
        tls.once('error', (err) => done({ ok: false, why: String(err?.message ?? err) }));
      }
    });
  });
}
