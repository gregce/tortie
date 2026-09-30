/**
 * build/p316/node-phone.mjs — a phone written in node, from the door's WIRE
 * FORMAT and not from `src/main/pocket/` (Phase 316.2; v:3 since Phase 330).
 *
 * WHY A THIRD IMPLEMENTATION. The Mac's door is TypeScript and the app is
 * Swift; the probes need a reader that is neither, so the Swift is never the
 * judge of the Swift and the door is never the judge of the door
 * (build/p316/SPEC.md §4 S2, Method A). Everything here is re-derived from the
 * documented format (build/p330/SPEC.md §4.7 and §4.8) — the seven-line
 * canonical text, the X25519 binding under `tortie-pocket-bind-v1`, the seal
 * under `tortie-pocket-pair-v1`, the challenge under
 * `tortie-pocket-challenge-v1` and the proof over it, the phone id under
 * `tortie-pocket-id-v1`, the three-key fingerprint under `tortie-pocket-fp-v2`,
 * and the pins the Swift way (the 26-byte P-256 header, the 65-byte point,
 * sha256, base64url) — so a change on either side that the other did not make
 * shows up as a refusal. build/probe-p313.mjs, build/p330/probe-p330.mjs and
 * build/p316/probe-p316.mjs import this file rather than carry a copy.
 *
 * WHAT A PHONE IS, from Phase 330: three long-lived keys (Ed25519 signing,
 * X25519 exchange, and the P-256 CLIENT key its TLS handshakes complete with),
 * and, once allowed, the client certificate the Mac issued over that key. A
 * paired phone presents that identity on EVERY connection (mutual TLS); the
 * door destroys a connection whose client key is not a paired phone's before
 * an HTTP byte is parsed (SPEC §4.6 step 4).
 *
 * HOW IT DIALS. Always 127.0.0.1 — the stand-in's forwarder, a door's loopback
 * port, or a hostile door — and never an address the QR names. The QR's `host`
 * is a public `.ts.net` NAME: it goes into the TLS server name (SNI) and the
 * `Host` header, exactly as the phone sends it, and is never resolved.
 * `request` refuses any other dial host before a socket exists.
 *
 * It also holds the door-side halves the hostile door shares: opening a
 * presentation and checking its proof, and verifying a signed request, the
 * same format read from the other end. It logs nothing: not a key, not a
 * signature, not a body.
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
import { connect as tlsConnect } from 'node:tls';

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
export const shaHex = (data) => createHash('sha256').update(data).digest('hex');
const J = JSON.stringify;

/** The QR version this phone reads. */
export const QR_VERSION = 3;
/** The public ports a door may be published on (build/p330/SPEC.md §4.2.3). */
export const PUBLIC_PORTS = Object.freeze([8443, 10000]);

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

/** The door's pin for a client key: base64url sha256 of its SPKI DER (SPEC §4.7.5). */
export const clientKeyPinOf = (clientKeyB64u) => b64u(createHash('sha256').update(Buffer.from(clientKeyB64u, 'base64url')).digest());

/** The six groups of four both screens show, over ALL THREE of the phone's keys (v2, SPEC §4.4). */
export function fingerprintOf(signingKey, exchangeKey, clientKey) {
  return (shaHex(`tortie-pocket-fp-v2\n${signingKey}\n${exchangeKey}\n${clientKey}`).slice(0, 24).match(/.{4}/g) ?? []).join(' ');
}

/** The phone's id: derived from its signing key, so nobody chooses it. */
export const phoneIdOf = (signingKey) => shaHex(`tortie-pocket-id-v1\n${signingKey}`).slice(0, 32);

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

/**
 * A phone: its three long-lived keys, its id, its binding to one door, its
 * fingerprint, and (after `adoptCertificate`) its client certificate.
 */
export function makePhone(label, doorExchangeKey) {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const signingKey = b64u(signing.publicKey.export({ type: 'spki', format: 'der' }));
  const exchangeKey = b64u(exchange.publicKey.export({ type: 'spki', format: 'der' }));
  const clientKey = b64u(client.publicKey.export({ type: 'spki', format: 'der' }));
  return {
    label,
    id: phoneIdOf(signingKey),
    signingKey,
    exchangeKey,
    clientKey,
    clientKeyPin: clientKeyPinOf(clientKey),
    signPrivate: signing.privateKey,
    clientPrivatePem: client.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    binding: bindingOf(exchange.privateKey, doorExchangeKey, doorExchangeKey, exchangeKey),
    fingerprint: fingerprintOf(signingKey, exchangeKey, clientKey),
    certPem: null
  };
}

const derToPem = (der) => `-----BEGIN CERTIFICATE-----\n${(Buffer.from(der).toString('base64').match(/.{1,64}/g) ?? []).join('\n')}\n-----END CERTIFICATE-----\n`;

/**
 * Take the certificate `/pair` answered `allowed` with. Refused unless it
 * parses and names THIS phone's client key, because a certificate over any
 * other key would fail every handshake the door pins.
 */
export function adoptCertificate(phone, certB64u) {
  try {
    const der = Buffer.from(String(certB64u ?? ''), 'base64url');
    const x509 = new X509Certificate(der);
    const spki = x509.publicKey.export({ type: 'spki', format: 'der' });
    if (b64u(spki) !== phone.clientKey) return { ok: false, why: 'the certificate names another key than this phone\'s client key' };
    phone.certPem = derToPem(der);
    return { ok: true, why: '', subject: x509.subject, issuer: x509.issuer, validTo: x509.validTo, der };
  } catch (err) {
    return { ok: false, why: `the certificate does not parse: ${String(err?.message ?? err)}` };
  }
}

// ---------------------------------------------------------------------------
// The QR
// ---------------------------------------------------------------------------

const B64U = /^[A-Za-z0-9_-]+$/;

/** Is `host` a public name the phone accepts (SPEC §4.8.1)? */
export function hostIsPublicName(host) {
  if (typeof host !== 'string' || host.length === 0 || host.length > 253 || host !== host.toLowerCase() || !host.endsWith('.ts.net')) return false;
  const labels = host.split('.');
  return labels.length >= 3 && labels.every((l) => /^[a-z0-9-]{1,63}$/.test(l) && !l.startsWith('-') && !l.endsWith('-'));
}

/**
 * Read a QR payload the way the phone must (SPEC §4.8.1): exactly the eight
 * keys, v:3, a `.ts.net` name, port 8443 or 10000, a 32-byte pin, two keys of
 * their kind, a 16 to 64 byte secret, and a positive expiry. No `tk`, no address.
 */
export function readOffer(payload) {
  let offer;
  try {
    offer = JSON.parse(String(payload));
  } catch {
    return { ok: false, why: 'not JSON' };
  }
  const keys = Object.keys(offer ?? {});
  const want = ['v', 'host', 'port', 'fp', 'dk', 'dx', 'ps', 'exp'];
  if (J(keys) !== J(want)) return { ok: false, why: `the keys are ${J(keys)}, not ${J(want)} in that order` };
  if (offer.v !== QR_VERSION) return { ok: false, why: `v is ${J(offer.v)}` };
  if (!hostIsPublicName(offer.host)) return { ok: false, why: `host ${J(offer.host)} is not a .ts.net name` };
  if (!PUBLIC_PORTS.includes(offer.port)) return { ok: false, why: `port ${J(offer.port)} is not 8443 or 10000` };
  const bytes = (s) => (typeof s === 'string' && B64U.test(s) ? Buffer.from(s, 'base64url') : null);
  const fp = bytes(offer.fp);
  if (fp === null || fp.length !== 32 || b64u(fp) !== offer.fp) return { ok: false, why: 'fp is not 32 bytes of base64url' };
  const keyOf = (s, type) => {
    try {
      return createPublicKey({ key: Buffer.from(s, 'base64url'), format: 'der', type: 'spki' }).asymmetricKeyType === type;
    } catch {
      return false;
    }
  };
  if (!keyOf(offer.dk, 'ed25519')) return { ok: false, why: 'dk is not an Ed25519 key' };
  if (!keyOf(offer.dx, 'x25519')) return { ok: false, why: 'dx is not an X25519 key' };
  const ps = bytes(offer.ps);
  if (ps === null || ps.length < 16 || ps.length > 64) return { ok: false, why: 'ps is not 16 to 64 bytes' };
  if (!Number.isFinite(offer.exp) || offer.exp <= 0) return { ok: false, why: 'exp is not a positive time' };
  return { ok: true, why: '', offer };
}

// ---------------------------------------------------------------------------
// The presentation (SPEC §4.7.2)
// ---------------------------------------------------------------------------

/** The pairing key the QR's one-shot secret derives. */
const sealKeyOf = (psB64u) => Buffer.from(hkdfSync('sha256', Buffer.from(psB64u, 'base64url'), Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));

/** The window's challenge, derived from the secret alone. */
export const challengeOf = (psB64u) => b64u(Buffer.from(hkdfSync('sha256', Buffer.from(psB64u, 'base64url'), Buffer.alloc(0), 'tortie-pocket-challenge-v1', 32)));

/** The text a presentation's signature covers. */
export const proofTextOf = (challenge, iv, ct, tag) => ['tortie-pocket-present-v1', challenge, iv, ct, tag].join('\n');

const sortedJson = (object) => J(Object.fromEntries(Object.keys(object).sort().map((k) => [k, object[k]])));

/**
 * A presentation sealed under the QR's secret and signed over the window's
 * challenge, the phone's way: `{"ct","ek","iv","sig","tag"}`, the inner JSON's
 * keys sorted too. `options.signWith` hands in another signing key (the attack
 * arms' wrong-key proof); `options.challenge` another challenge (a stale one).
 */
export function sealPresentation(psB64u, phone, options = {}) {
  const inner = { ck: phone.clientKey, ek: phone.signingKey, label: phone.label, xk: phone.exchangeKey };
  if (typeof options.pushEnvironment === 'string') inner.ape = options.pushEnvironment;
  if (typeof options.pushToken === 'string') inner.apt = options.pushToken;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKeyOf(psB64u), iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(sortedJson(inner), 'utf8')), cipher.final()]);
  const sealed = { iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) };
  const proof = proofTextOf(options.challenge ?? challengeOf(psB64u), sealed.iv, sealed.ct, sealed.tag);
  const sig = b64u(signWith(null, Buffer.from(proof, 'utf8'), options.signWith ?? phone.signPrivate));
  return Buffer.from(sortedJson({ ...sealed, ek: phone.signingKey, sig }), 'utf8');
}

/**
 * The door's side: open a presentation and check its proof. Returns the phone
 * it names and whether the proof held, or null when it does not open.
 */
export function openPresentation(psB64u, body) {
  try {
    const outer = JSON.parse(Buffer.from(body).toString('utf8'));
    if (J(Object.keys(outer).sort()) !== J(['ct', 'ek', 'iv', 'sig', 'tag'])) return null;
    const iv = Buffer.from(String(outer.iv), 'base64url');
    const ct = Buffer.from(String(outer.ct), 'base64url');
    const tag = Buffer.from(String(outer.tag), 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;
    const decipher = createDecipheriv('aes-256-gcm', sealKeyOf(psB64u), iv);
    decipher.setAuthTag(tag);
    const inner = JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'));
    if (typeof inner.ek !== 'string' || typeof inner.xk !== 'string' || typeof inner.ck !== 'string') return null;
    let proofOk = false;
    try {
      const key = createPublicKey({ key: Buffer.from(String(outer.ek), 'base64url'), format: 'der', type: 'spki' });
      proofOk = key.asymmetricKeyType === 'ed25519' && inner.ek === outer.ek &&
        verifyWith(null, Buffer.from(proofTextOf(challengeOf(psB64u), outer.iv, outer.ct, outer.tag), 'utf8'), key, Buffer.from(String(outer.sig), 'base64url'));
    } catch {
      proofOk = false;
    }
    return { label: String(inner.label ?? ''), signingKey: inner.ek, exchangeKey: inner.xk, clientKey: inner.ck, proofOk };
  } catch {
    return null;
  }
}

/** The door's side: does this signed request hold for this phone? One word. */
export function verifySigned({ method, target, headers, body, phone, doorExchangePrivate, doorExchangeKey, channel }) {
  const id = headers['x-tortie-phone'];
  const timestamp = headers['x-tortie-timestamp'];
  const nonce = headers['x-tortie-nonce'];
  const signature = headers['x-tortie-signature'];
  if (phone === null || phone === undefined) return 'unpaired';
  if (id !== phoneIdOf(phone.signingKey)) return 'phone';
  if (channel !== undefined && channel !== clientKeyPinOf(phone.clientKey)) return 'channel';
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

// ---------------------------------------------------------------------------
// The wire. 127.0.0.1 and nothing else, ever.
// ---------------------------------------------------------------------------

/**
 * A door to dial: `port` on 127.0.0.1 (the stand-in's forwarder, or a door's
 * own loopback port), with the QR's NAME and PUBLIC PORT for SNI and `Host`,
 * and the QR's pin.
 */
export function doorFrom(offer, dialPort) {
  return { port: dialPort, name: offer.host, publicPort: offer.port, pin: offer.fp };
}

/**
 * One request to a door on 127.0.0.1. It never rejects: a refusal that arrives
 * as a dead socket is itself a reading. Nothing is accepted before the pin
 * holds; `pin: null` skips the check and is for the hostile door's self-test
 * alone. `identity` is a phone whose certificate is adopted: its client key and
 * certificate are presented on the handshake (TLS 1.3 only, as the phone).
 * `door.name` goes into SNI and `Host` as `<name>:<publicPort>`; `servername`
 * and `hostHeader` override either for the attack arms.
 */
export function request({ host = '127.0.0.1', door, method, target, headers = {}, body = null, identity = null, pin = door?.pin, timeoutMs = 20_000, capBytes = Infinity, servername, hostHeader, onWritten = () => undefined }) {
  if (host !== '127.0.0.1') return Promise.resolve({ status: 0, body: '', bytes: 0, error: `refused to dial ${host}; this client dials 127.0.0.1 only` });
  return new Promise((done) => {
    let settled = false;
    let handshook = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      done({ handshook, ...value });
    };
    const sni = servername ?? door.name;
    const tls = {
      minVersion: 'TLSv1.3',
      rejectUnauthorized: false,
      ...(typeof sni === 'string' && sni !== '' && !/^\d+\.\d+\.\d+\.\d+$/.test(sni) ? { servername: sni } : {})
    };
    if (identity !== null && identity.certPem !== null) {
      tls.cert = identity.certPem;
      tls.key = identity.clientPrivatePem;
    }
    const allHeaders = { ...headers, host: hostHeader ?? `${door.name}:${String(door.publicPort ?? door.port)}` };
    const req = httpsRequest({ host, port: door.port, method, path: target, agent: false, headers: allHeaders, ...tls }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on('data', (c) => {
        bytes += c.length;
        if (bytes > capBytes) {
          req.destroy();
          finish({ status: res.statusCode ?? 0, body: '', bytes, error: 'over the cap', headers: res.headers });
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => finish({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8'), bytes, headers: res.headers }));
      res.on('error', (err) => finish({ status: 0, body: '', bytes, error: String(err?.message ?? err) }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timed out')));
    req.on('socket', (socket) => {
      socket.on('secureConnect', () => {
        handshook = true;
        if (pin === null) return;
        const got = pinOfPeer(socket.getPeerCertificate?.());
        if (got !== pin) {
          socket.destroy();
          finish({ status: 0, body: '', bytes: 0, error: 'the door presented a key that is not the pinned one' });
        }
      });
    });
    req.on('error', (err) => finish({ status: 0, body: '', bytes: 0, error: String(err?.message ?? err) }));
    // `onWritten` once the request has left in full (probe:p313's A3 reads
    // where a request is by it), or once it is settled without leaving.
    req.on('finish', () => onWritten());
    req.on('close', () => onWritten());
    if (body !== null) req.write(body);
    req.end();
  });
}

/** A signed GET from an honest phone, presenting its client identity when it has one. */
export function signedGet(phone, door, target, options = {}) {
  return request({ door, method: 'GET', target, headers: signedHeaders(phone, target), identity: phone.certPem === null ? null : phone, ...options });
}

/** POST /pair with a presentation. No client identity: a phone that is not yet paired has none. */
export function present(door, sealed, options = {}) {
  return request({ door, method: 'POST', target: '/pair', headers: { 'content-type': 'application/json', 'content-length': String(sealed.length) }, body: sealed, ...options });
}

/** `/pair`'s word, and the certificate when it is `allowed`. */
export function pairAnswerOf(answer) {
  try {
    const body = JSON.parse(answer.body);
    return { state: typeof body?.state === 'string' ? body.state : null, cert: typeof body?.cert === 'string' ? body.cert : null, keys: Object.keys(body ?? {}).sort() };
  } catch {
    return { state: null, cert: null, keys: [] };
  }
}

/**
 * Present, then present again until `allowed` or `refused` or `tries` run out,
 * and adopt the certificate. `between` is awaited after each `pending` (the
 * probe presses Allow there). Each presentation is sealed and signed afresh.
 */
export async function pairThrough(door, offer, phone, { tries = 30, everyMs = 1_000, between = async () => undefined, sealOptions = {} } = {}) {
  const words = [];
  for (let i = 0; i < tries; i += 1) {
    const answer = await present(door, sealPresentation(offer.ps, phone, sealOptions));
    const word = pairAnswerOf(answer);
    words.push(word.state ?? `status ${String(answer.status)} ${answer.error ?? ''}`.trim());
    if (word.state === 'allowed') {
      const adopted = adoptCertificate(phone, word.cert);
      return { ok: adopted.ok, words, why: adopted.why, cert: adopted };
    }
    if (word.state === 'refused' || word.state === null) return { ok: false, words, why: `/pair answered ${words[words.length - 1]}` };
    await between(i);
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return { ok: false, words, why: `still ${words[words.length - 1]} after ${String(tries)} presentations` };
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
 * Raw bytes over TLS to 127.0.0.1, and every byte the door sends back until it
 * closes (bounded). For the hostile door's HTTP arms, which a parser that
 * tidies an answer would hide, and for the attack arms' forged requests.
 */
export function rawExchange({ door, bytes, identity = null, pin = door?.pin, timeoutMs = 10_000, capBytes = 4 * 1024 * 1024, servername }) {
  return new Promise((done) => {
    const chunks = [];
    let got = 0;
    let handshook = false;
    let settled = false;
    const sni = servername ?? door.name;
    const socket = tlsConnect({
      host: '127.0.0.1',
      port: door.port,
      minVersion: 'TLSv1.3',
      rejectUnauthorized: false,
      ...(typeof sni === 'string' && sni !== '' ? { servername: sni } : {}),
      ...(identity !== null && identity.certPem !== null ? { cert: identity.certPem, key: identity.clientPrivatePem } : {})
    });
    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      done({ handshook, bytes: Buffer.concat(chunks), error: error ?? null });
    };
    socket.setTimeout(timeoutMs, () => finish('timed out'));
    socket.once('secureConnect', () => {
      handshook = true;
      if (pin !== null && pinOfPeer(socket.getPeerCertificate()) !== pin) return finish('the door presented a key that is not the pinned one');
      socket.write(bytes);
    });
    socket.on('data', (c) => {
      got += c.length;
      if (got > capBytes) return finish('over the cap');
      chunks.push(c);
    });
    socket.on('end', () => finish(null));
    socket.on('close', () => finish(null));
    socket.on('error', (err) => finish(String(err?.message ?? err)));
  });
}
