/**
 * cdp-client.mjs. One small devtools protocol client for the probes under
 * build/ (Phase 165).
 *
 * Ten probes under build/ each carry their own copy of this client, the first
 * of them written in Phase 127. This file is that client, exported, so the
 * eleventh probe imports it rather than copying it. The copies are not
 * repointed here, because Phase 165 owns none of them; a later consolidation
 * round can, and this is the file it repoints to.
 *
 * It speaks the websocket framing by hand over `node:net` so it needs no
 * dependency, answers pings, and collects the two events a probe needs to say
 * WHY a leg came back empty, being console lines and thrown exceptions, once
 * the caller has sent `Runtime.enable`.
 *
 * It starts nothing, opens no file, and touches nothing under the person's
 * home. It connects to the address it is given and nothing else.
 */

import { randomBytes } from 'node:crypto';
import { connect as netConnect } from 'node:net';

/** One masked text frame, as a client must send it. */
export function wsClientFrame(payload) {
  const data = Buffer.from(payload, 'utf8');
  const mask = randomBytes(4);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x81, 0x80 | data.length]);
  } else if (data.length < 65_536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

/** The events a client keeps unless the caller names its own list. */
const DEFAULT_COLLECT = ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown'];

/**
 * Connect to one devtools websocket url. Resolves to an object with
 * `call(method, params, timeoutMs)`, `events()` and `close()`. Events
 * whose method is in `options.collect` are kept for `events()`; the
 * default is console lines and thrown exceptions. Name `Network.*` methods
 * to see what a page fetched, after sending `Network.enable`.
 */
export function wsConnect(url, options = {}) {
  const collect = new Set(options.collect ?? DEFAULT_COLLECT);
  const m = /^ws:\/\/([^:/]+):(\d+)(\/.*)$/.exec(url);
  if (m === null) throw new Error(`not a ws url: ${url}`);
  return new Promise((resolvePromise, reject) => {
    const sock = netConnect(Number(m[2]), m[1]);
    const key = randomBytes(16).toString('base64');
    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragments = [];
    const pending = new Map();
    const events = [];
    let nextId = 1;
    sock.on('connect', () => {
      sock.write(
        `GET ${m[3]} HTTP/1.1\r\nHost: ${m[1]}:${m[2]}\r\n` +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    sock.on('error', (err) => reject(err));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        buf = buf.subarray(idx + 4);
        if (!/ 101 /.test(head)) {
          reject(new Error(`websocket upgrade refused:\n${head}`));
          sock.destroy();
          return;
        }
        upgraded = true;
        resolvePromise(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const fin = (buf[0] & 0x80) !== 0;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.subarray(off, off + len);
        buf = buf.subarray(off + len);
        if (op === 0x9) {
          const mask = randomBytes(4);
          const masked = Buffer.alloc(payload.length);
          for (let i = 0; i < payload.length; i += 1)
            masked[i] = payload[i] ^ mask[i & 3];
          sock.write(
            Buffer.concat([
              Buffer.from([0x8a, 0x80 | payload.length]),
              mask,
              masked
            ])
          );
          continue;
        }
        if (op !== 0x1 && op !== 0x0) continue;
        fragments.push(payload);
        if (!fin) continue;
        const text = Buffer.concat(fragments).toString('utf8');
        fragments = [];
        let msg;
        try {
          msg = JSON.parse(text);
        } catch {
          continue;
        }
        if (msg.id === undefined) {
          if (collect.has(msg.method)) events.push(msg);
          continue;
        }
        const waiter = pending.get(msg.id);
        if (waiter !== undefined) {
          pending.delete(msg.id);
          waiter(msg);
        }
      }
    });
    const api = {
      call(method, params, timeoutMs = 90_000) {
        const id = nextId;
        nextId += 1;
        sock.write(
          wsClientFrame(JSON.stringify({ id, method, params: params ?? {} }))
        );
        return new Promise((res, rej) => {
          pending.set(id, res);
          setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              rej(new Error(`${method} timed out after ${timeoutMs / 1000} s`));
            }
          }, timeoutMs);
        });
      },
      /** Every collected event seen since its domain was enabled. */
      events() {
        return events;
      },
      close() {
        sock.destroy();
      }
    };
  });
}

/**
 * Evaluate one expression on a page and return its value, awaiting a promise
 * if the expression returns one. Throws with the page's own message when the
 * expression throws.
 */
export async function cdpEval(cdp, expression, timeoutMs = 90_000) {
  const r = await cdp.call(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    timeoutMs
  );
  if (r.result?.exceptionDetails) {
    throw new Error(
      `page threw: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`
    );
  }
  return r.result?.result?.value;
}
