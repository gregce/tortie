/**
 * The PROXY v2 reader and the per-source limiter (Phase 330, build/p330/
 * SPEC.md §4.6 steps 1 and 2).
 *
 * Pure: no socket, no timer. The headers are spelled here byte by byte from
 * the PROXY protocol's own table, not through `../door/proxy-v2.ts`, so the
 * reader is held to the protocol rather than to itself.
 */

import { describe, expect, it } from 'vitest';

import { PER_SOURCE_MAX, createSourceLimiter } from '../door/limits';
import { PROXY_V2_MAX_BYTES, readProxyV2, type ProxyHeader } from '../door/proxy-v2';

const SIGNATURE = [0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a];

function tcp4(source: [number, number, number, number], extra: number[] = [], length?: number): Buffer {
  const block = [...source, 127, 0, 0, 1, 0xc7, 0x38, 0x20, 0xfb, ...extra];
  const len = length ?? block.length;
  return Buffer.from([...SIGNATURE, 0x21, 0x11, len >> 8, len & 0xff, ...block]);
}

function tcp6(sourceLastByte: number): Buffer {
  const src = new Array<number>(16).fill(0);
  src[0] = 0x20;
  src[1] = 0x01;
  src[15] = sourceLastByte;
  const dst = new Array<number>(16).fill(0);
  dst[15] = 1;
  const block = [...src, ...dst, 0xc7, 0x38, 0x20, 0xfb];
  return Buffer.from([...SIGNATURE, 0x21, 0x21, 0, block.length, ...block]);
}

describe('readProxyV2', () => {
  it('reads a TCP4 header and hands back exactly the bytes after it', () => {
    const hello = Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05]);
    const read = readProxyV2(Buffer.concat([tcp4([203, 0, 113, 7]), hello]));
    expect(read.kind).toBe('ok');
    if (read.kind !== 'ok') return;
    expect(read.header.family).toBe('tcp4');
    expect(read.header.headerBytes).toBe(28);
    expect(read.header.addressBlock).toHaveLength(12);
    expect(read.rest.equals(hello)).toBe(true);
  });

  it('reads a TCP6 header', () => {
    const read = readProxyV2(tcp6(9));
    expect(read.kind).toBe('ok');
    if (read.kind === 'ok') {
      expect(read.header.family).toBe('tcp6');
      expect(read.header.addressBlock).toHaveLength(36);
      expect(read.rest).toHaveLength(0);
    }
  });

  it('skips TLVs inside the length, and never hands them on as the address block', () => {
    const tlv = [0x04, 0x00, 0x03, 0xaa, 0xbb, 0xcc];
    const read = readProxyV2(tcp4([1, 2, 3, 4], tlv));
    expect(read.kind).toBe('ok');
    if (read.kind === 'ok') {
      expect(read.header.headerBytes).toBe(16 + 12 + tlv.length);
      expect(read.header.addressBlock).toHaveLength(12);
    }
  });

  it('asks for more at every prefix of a good header, byte by byte', () => {
    const whole = tcp4([203, 0, 113, 7]);
    for (let n = 0; n < whole.length; n += 1) {
      expect(readProxyV2(whole.subarray(0, n)).kind).toBe('more');
    }
    expect(readProxyV2(whole).kind).toBe('ok');
  });

  it('refuses at the FIRST byte that is not the signature, without waiting', () => {
    // A ClientHello straight at the port: 0x16 is not 0x0d.
    expect(readProxyV2(Buffer.from([0x16])).kind).toBe('refused');
    expect(readProxyV2(Buffer.from('GET / HTTP/1.1\r\n')).kind).toBe('refused');
    // PROXY v1's text form.
    expect(readProxyV2(Buffer.from('PROXY TCP4 1.2.3.4 5.6.7.8 1 2\r\n')).kind).toBe('refused');
    const nearly = Buffer.from(SIGNATURE);
    nearly[11] = 0x0b;
    expect(readProxyV2(nearly).kind).toBe('refused');
  });

  it('refuses LOCAL, another version, and every family but TCP4 and TCP6', () => {
    const base = tcp4([1, 2, 3, 4]);
    for (const [at, value] of [
      [12, 0x20],
      [12, 0x11],
      [12, 0x22],
      [13, 0x00],
      [13, 0x12],
      [13, 0x31],
      [13, 0x22]
    ] as const) {
      const bad = Buffer.from(base);
      bad[at] = value;
      expect(readProxyV2(bad).kind, `byte ${String(at)} = ${String(value)}`).toBe('refused');
      // And as soon as that byte arrives, not after the rest.
      expect(readProxyV2(bad.subarray(0, at + 1)).kind).toBe('refused');
    }
  });

  it('refuses a length under the family’s address block or over 216', () => {
    expect(readProxyV2(tcp4([1, 2, 3, 4], [], 11)).kind).toBe('refused');
    expect(readProxyV2(tcp4([1, 2, 3, 4], [], 217)).kind).toBe('refused');
    const six = tcp6(1);
    six.writeUInt16BE(35, 14);
    expect(readProxyV2(six).kind).toBe('refused');
    // 216 is the most, and it is allowed.
    const most = tcp4([1, 2, 3, 4], new Array<number>(216 - 12).fill(0), 216);
    expect(readProxyV2(most).kind).toBe('ok');
    expect(most).toHaveLength(PROXY_V2_MAX_BYTES);
  });
});

describe('the per-source limiter, the one reader of the source', () => {
  const header = (source: [number, number, number, number], port = 51_000): ProxyHeader => {
    const read = readProxyV2(tcp4(source));
    if (read.kind !== 'ok') throw new Error('bad fixture');
    // The source PORT differs on every connection a client opens; it is not
    // part of the key.
    read.header.addressBlock.writeUInt16BE(port, 8);
    return read.header;
  };

  it('admits four from one source, refuses the fifth, and counts per source', () => {
    const limiter = createSourceLimiter();
    const releases = [];
    for (let i = 0; i < PER_SOURCE_MAX; i += 1) {
      const release = limiter.admit(header([192, 0, 2, 9], 50_000 + i));
      expect(release).not.toBeNull();
      releases.push(release);
    }
    expect(limiter.admit(header([192, 0, 2, 9], 60_000))).toBeNull();
    expect(limiter.admit(header([192, 0, 2, 10]))).not.toBeNull();
    expect(limiter.sources()).toBe(2);
    releases[0]?.();
    // Releasing twice frees one place, not two.
    releases[0]?.();
    expect(limiter.admit(header([192, 0, 2, 9]))).not.toBeNull();
    expect(limiter.admit(header([192, 0, 2, 9]))).toBeNull();
  });

  it('keys TCP4 and TCP6 apart, and forgets a source once it holds nothing', () => {
    const limiter = createSourceLimiter(1);
    const read6 = readProxyV2(tcp6(7));
    if (read6.kind !== 'ok') throw new Error('bad fixture');
    const a = limiter.admit(header([0, 0, 0, 0]));
    const b = limiter.admit(read6.header);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    a?.();
    b?.();
    expect(limiter.sources()).toBe(0);
  });
});
