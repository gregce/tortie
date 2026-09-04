// A CDP client with flattened sessions and event listeners, for the browser endpoint and page targets.
import { randomBytes } from 'node:crypto';
import { connect as netConnect } from 'node:net';
function frame(payload) {
  const data = Buffer.from(payload, 'utf8'); const mask = randomBytes(4); let header;
  if (data.length < 126) header = Buffer.from([0x81, 0x80 | data.length]);
  else if (data.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(data.length, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(data.length), 2); }
  const masked = Buffer.alloc(data.length); for (let i = 0; i < data.length; i += 1) masked[i] = data[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}
export function connect(url) {
  const m = /^ws:\/\/([^:/]+):(\d+)(\/.*)$/.exec(url); if (!m) throw new Error('not a ws url: ' + url);
  return new Promise((resolve, reject) => {
    const sock = netConnect(Number(m[2]), m[1]); const key = randomBytes(16).toString('base64');
    let upgraded = false, buf = Buffer.alloc(0), fragments = [], nextId = 1; const pending = new Map(); const listeners = [];
    sock.on('connect', () => sock.write(`GET ${m[3]} HTTP/1.1\r\nHost: ${m[1]}:${m[2]}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    sock.on('error', (e) => reject(e));
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) { const idx = buf.indexOf('\r\n\r\n'); if (idx === -1) return; const head = buf.subarray(0, idx).toString(); buf = buf.subarray(idx + 4); if (!/ 101 /.test(head)) { reject(new Error('upgrade refused')); sock.destroy(); return; } upgraded = true; resolve(api); }
      for (;;) {
        if (buf.length < 2) return; const fin = (buf[0] & 0x80) !== 0; const op = buf[0] & 0x0f; let len = buf[1] & 0x7f; let off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return; const payload = buf.subarray(off, off + len); buf = buf.subarray(off + len);
        if (op === 0x9) { const mk = randomBytes(4); const ms = Buffer.alloc(payload.length); for (let i = 0; i < payload.length; i += 1) ms[i] = payload[i] ^ mk[i & 3]; sock.write(Buffer.concat([Buffer.from([0x8a, 0x80 | payload.length]), mk, ms])); continue; }
        if (op !== 0x1 && op !== 0x0) continue; fragments.push(payload); if (!fin) continue;
        const text = Buffer.concat(fragments).toString('utf8'); fragments = []; let msg; try { msg = JSON.parse(text); } catch { continue; }
        if (msg.id === undefined) { for (const l of listeners) { try { l(msg); } catch { /* listener */ } } continue; }
        const w = pending.get(msg.id); if (w) { pending.delete(msg.id); w(msg); }
      }
    });
    const api = {
      call(method, params, sessionId, timeoutMs = 60000) {
        const id = nextId; nextId += 1; const msg = { id, method, params: params ?? {} }; if (sessionId) msg.sessionId = sessionId;
        sock.write(frame(JSON.stringify(msg)));
        return new Promise((res, rej) => { pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result ?? {}))); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`${method} timed out`)); } }, timeoutMs); });
      },
      on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
      close() { sock.destroy(); }
    };
  });
}
/** A page session over a flattened browser connection. */
export function session(cdp, sessionId) {
  return {
    sessionId,
    call: (method, params, timeoutMs) => cdp.call(method, params, sessionId, timeoutMs),
    async eval(expression, timeoutMs = 60000) {
      const r = await cdp.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId, timeoutMs);
      if (r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text));
      return r.result?.value;
    },
    on: (fn) => cdp.on((m) => { if (m.sessionId === sessionId) fn(m); })
  };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
