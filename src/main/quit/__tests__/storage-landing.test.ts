/**
 * Phase 357.1 round A — how the quit's hard exit knows the remembered settings
 * are on disk (src/main/quit/storage-landing.ts).
 *
 * Driven over REAL files in a scratch folder, written in LevelDB's log format
 * by a writer of this file's own: the checksum is computed bit by bit (the
 * module uses a table), and a record is cut into FIRST, MIDDLE and LAST
 * fragments, with a zero pad when fewer than seven bytes are left in a block,
 * exactly as LevelDB's `log::Writer::AddRecord` does. A torn record is written
 * the way a SIGKILL leaves one: the header on disk and none, or part, of its
 * payload. Nothing here reads a person's files.
 */

import { appendFileSync, mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { lastBlockWhole, QUIET_MS, SETTLE_MS, storageFolder, storageWritten } from '../storage-landing';

const BLOCK = 32_768;
const FULL = 1;
const FIRST = 2;
const MIDDLE = 3;
const LAST = 4;

/** CRC-32C bit by bit (no table), then LevelDB's mask. */
function crc32cBitwise(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0x82f63b78 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
const maskOf = (crc: number): number => (((crc >>> 15) | (crc << 17)) + 0xa282ead8) >>> 0;

/** One physical record: header (masked CRC of type and payload, length, type) then payload. */
function physical(type: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(7);
  header.writeUInt32LE(maskOf(crc32cBitwise(Buffer.concat([Buffer.from([type]), payload]))), 0);
  header.writeUInt16LE(payload.length, 4);
  header[6] = type;
  return Buffer.concat([header, payload]);
}

/** The bytes LevelDB's writer appends for one record to a log whose length is `at`. */
function recordBytes(at: number, payload: Buffer): Buffer {
  const out: Buffer[] = [];
  let offset = at % BLOCK;
  let pos = 0;
  let begin = true;
  do {
    const leftover = BLOCK - offset;
    if (leftover < 7) {
      if (leftover > 0) out.push(Buffer.alloc(leftover));
      offset = 0;
    }
    const avail = BLOCK - offset - 7;
    const len = Math.min(payload.length - pos, avail);
    const end = pos + len === payload.length;
    const type = begin && end ? FULL : begin ? FIRST : end ? LAST : MIDDLE;
    out.push(physical(type, payload.subarray(pos, pos + len)));
    offset += 7 + len;
    pos += len;
    begin = false;
  } while (pos < payload.length);
  return Buffer.concat(out);
}

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** A scratch profile with a `Local Storage/leveldb` folder; answers the profile and the folder. */
function profile(): { storagePath: string; dir: string } {
  const storagePath = mkdtempSync(join(tmpdir(), 'tortie-p3571-landing-'));
  dirs.push(storagePath);
  const dir = join(storagePath, 'Local Storage', 'leveldb');
  mkdirSync(dir, { recursive: true });
  // The files LevelDB keeps beside its log, none of which is a log.
  writeFileSync(join(dir, 'CURRENT'), 'MANIFEST-000001\n');
  writeFileSync(join(dir, 'LOCK'), '');
  writeFileSync(join(dir, 'MANIFEST-000001'), Buffer.alloc(40, 7));
  writeFileSync(join(dir, '000005.ldb'), Buffer.alloc(80, 9));
  return { storagePath, dir };
}

/** A log of `n` whole records of `size` bytes each; answers its length. */
function writeLog(file: string, n: number, size = 60): number {
  let bytes = Buffer.alloc(0);
  for (let i = 0; i < n; i += 1) bytes = Buffer.concat([bytes, recordBytes(bytes.length, Buffer.alloc(size, 65 + (i % 26)))]);
  writeFileSync(file, bytes);
  return bytes.length;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('lastBlockWhole: the last block of a log, read as the hard exit reads it', () => {
  it('an empty log and a log of whole records are whole', () => {
    expect(lastBlockWhole(new Uint8Array(0), 0)).toBe(true);
    const one = recordBytes(0, Buffer.from('a value of the window’s', 'utf8'));
    expect(lastBlockWhole(one, 0)).toBe(true);
    const two = Buffer.concat([one, recordBytes(one.length, Buffer.alloc(300, 1))]);
    expect(lastBlockWhole(two, 0)).toBe(true);
  });

  it('a torn record (the header alone, or part of the payload) is not whole', () => {
    const whole = recordBytes(0, Buffer.alloc(86, 3));
    expect(lastBlockWhole(whole.subarray(0, 7), 0)).toBe(false);
    expect(lastBlockWhole(whole.subarray(0, 50), 0)).toBe(false);
    expect(lastBlockWhole(whole.subarray(0, 3), 0)).toBe(false);
  });

  it('a record whose checksum does not hold is not whole', () => {
    const bad = Buffer.from(recordBytes(0, Buffer.alloc(40, 5)));
    bad[20] = (bad[20] ?? 0) ^ 0xff;
    expect(lastBlockWhole(bad, 0)).toBe(false);
  });

  it('a record split over a block boundary is whole only once its LAST fragment is there', () => {
    const lead = recordBytes(0, Buffer.alloc(BLOCK - 7 - 100, 1));
    const split = recordBytes(lead.length, Buffer.alloc(500, 2));
    const all = Buffer.concat([lead, split]);
    expect(all.length).toBeGreaterThan(BLOCK);
    // The FIRST fragment ends block 0 exactly; read alone, block 0 is incomplete.
    const block0 = all.subarray(0, BLOCK);
    expect(lastBlockWhole(block0, 0)).toBe(false);
    // With the LAST fragment written, the file's last block (block 1) is whole.
    expect(lastBlockWhole(all.subarray(BLOCK), BLOCK)).toBe(true);
  });

  it('a log ending in a block’s zero pad has a record on its way, so it is not whole', () => {
    // Leave 4 bytes in block 0, so the next record pads them and starts block 1.
    const lead = recordBytes(0, Buffer.alloc(BLOCK - 7 - 4, 1));
    expect(lead.length).toBe(BLOCK - 4);
    expect(lastBlockWhole(lead, 0)).toBe(true);
    const next = recordBytes(lead.length, Buffer.alloc(30, 2));
    const padded = Buffer.concat([lead, next.subarray(0, 4)]);
    expect(padded.length).toBe(BLOCK);
    expect(lastBlockWhole(padded, 0)).toBe(false);
    expect(lastBlockWhole(Buffer.concat([lead, next]).subarray(BLOCK), BLOCK)).toBe(true);
  });

  it('a zero header with room left in its block, a bad type, and an offset off a block boundary are not whole', () => {
    expect(lastBlockWhole(new Uint8Array(32), 0)).toBe(false);
    const typed = Buffer.from(recordBytes(0, Buffer.alloc(10, 1)));
    typed[6] = 9;
    expect(lastBlockWhole(typed, 0)).toBe(false);
    expect(lastBlockWhole(recordBytes(0, Buffer.alloc(10, 1)), 100)).toBe(false);
  });
});

describe('storageWritten: the wait the hard exit takes', () => {
  it('storageFolder names Chromium’s localStorage folder, and nothing for a session with no disk', () => {
    expect(storageFolder('/x/profile')).toBe(join('/x/profile', 'Local Storage', 'leveldb'));
    expect(storageFolder(null)).toBeNull();
    expect(storageFolder('')).toBeNull();
  });

  it('a whole log that does not move ends the wait once QUIET_MS have passed', async () => {
    const p = profile();
    writeLog(join(p.dir, '000003.log'), 4);
    const w = await storageWritten(p.storagePath, 1_000);
    expect(w.landing).toBe('settled');
    expect(w.moved).toBe(false);
    expect(w.waitedMs).toBeGreaterThanOrEqual(QUIET_MS);
    expect(w.waitedMs).toBeLessThan(1_000);
  });

  it('a commit that lands after the flush is waited for, then settled on', async () => {
    const p = profile();
    const file = join(p.dir, '000003.log');
    const len = writeLog(file, 2);
    const wait = storageWritten(p.storagePath, 2_000);
    // Inside the quiet window: the commit a flush started, landing late.
    await sleep(Math.floor(QUIET_MS / 3));
    appendFileSync(file, recordBytes(len, Buffer.alloc(86, 7)));
    const landedAt = performance.now();
    const w = await wait;
    expect(w.landing).toBe('settled');
    expect(w.moved).toBe(true);
    // It saw the move and stood still for SETTLE_MS after it, and never ended inside the quiet window.
    expect(performance.now() - landedAt).toBeGreaterThanOrEqual(SETTLE_MS - 5);
    expect(w.waitedMs).toBeGreaterThanOrEqual(QUIET_MS);
  });

  it('a second commit following the first inside the quiet window is waited for too', async () => {
    const p = profile();
    const file = join(p.dir, '000003.log');
    let len = writeLog(file, 1);
    const wait = storageWritten(p.storagePath, 2_000);
    await sleep(20);
    const one = recordBytes(len, Buffer.alloc(40, 1));
    appendFileSync(file, one);
    len += one.length;
    await sleep(QUIET_MS - 40);
    appendFileSync(file, recordBytes(len, Buffer.alloc(40, 2)));
    const lastAt = performance.now();
    const w = await wait;
    expect(w.landing).toBe('settled');
    expect(w.moved).toBe(true);
    expect(performance.now() - lastAt).toBeGreaterThanOrEqual(SETTLE_MS - 5);
  });

  it('a torn record holds the wait until the rest of it is written', async () => {
    const p = profile();
    const file = join(p.dir, '000003.log');
    const len = writeLog(file, 3);
    const rec = recordBytes(len, Buffer.alloc(86, 4));
    appendFileSync(file, rec.subarray(0, 7));
    const wait = storageWritten(p.storagePath, 2_000);
    await sleep(QUIET_MS + 150);
    let done = false;
    void wait.then(() => {
      done = true;
    });
    await sleep(10);
    expect(done).toBe(false);
    appendFileSync(file, rec.subarray(7));
    const w = await wait;
    expect(w.landing).toBe('settled');
    expect(w.waitedMs).toBeGreaterThanOrEqual(QUIET_MS + 150);
  });

  it('a torn record that is never finished runs the wait to its bound, and no further', async () => {
    const p = profile();
    const file = join(p.dir, '000003.log');
    const len = writeLog(file, 3);
    appendFileSync(file, recordBytes(len, Buffer.alloc(86, 4)).subarray(0, 7));
    const w = await storageWritten(p.storagePath, 400);
    expect(w.landing).toBe('bound');
    expect(w.waitedMs).toBeGreaterThanOrEqual(395);
    expect(w.waitedMs).toBeLessThan(900);
  });

  it('a FIRST fragment at the end of a block holds the wait until its LAST arrives', async () => {
    const p = profile();
    const file = join(p.dir, '000003.log');
    const lead = recordBytes(0, Buffer.alloc(BLOCK - 7 - 100, 1));
    const split = recordBytes(lead.length, Buffer.alloc(500, 2));
    const firstEnds = BLOCK - lead.length;
    writeFileSync(file, Buffer.concat([lead, split.subarray(0, firstEnds)]));
    const wait = storageWritten(p.storagePath, 2_000);
    await sleep(QUIET_MS + 100);
    let done = false;
    void wait.then(() => {
      done = true;
    });
    await sleep(10);
    expect(done).toBe(false);
    appendFileSync(file, split.subarray(firstEnds));
    expect((await wait).landing).toBe('settled');
  });

  it('the newest log is the one read (by number), and a log rotated in mid-wait is followed', async () => {
    const p = profile();
    writeLog(join(p.dir, '9.log'), 2);
    const tenLen = writeLog(join(p.dir, '10.log'), 1);
    // A torn tail in the OLDER log does not matter: 10 is newer than 9.
    appendFileSync(join(p.dir, '9.log'), Buffer.alloc(3, 1));
    const wait = storageWritten(p.storagePath, 2_000);
    await sleep(40);
    // Rotation: a newer log appears, the older ones go.
    writeLog(join(p.dir, '11.log'), 3);
    unlinkSync(join(p.dir, '10.log'));
    unlinkSync(join(p.dir, '9.log'));
    const w = await wait;
    expect(w.landing).toBe('settled');
    expect(w.moved).toBe(true);
    expect(tenLen).toBeGreaterThan(0);
  });

  it('no folder, no log, a folder that is a file, or no storage path: the wait runs to its bound and never throws', async () => {
    const p = profile();
    const missing = join(p.storagePath, 'nowhere');
    for (const path of [missing, p.storagePath, null]) {
      // p.storagePath has a folder but no log at all.
      const w = await storageWritten(path, 250);
      expect(w.landing).toBe('bound');
      expect(w.waitedMs).toBeGreaterThanOrEqual(245);
    }
    const fileAsFolder = join(p.storagePath, 'flat');
    writeFileSync(fileAsFolder, 'not a folder');
    mkdirSync(join(p.storagePath, 'flat-parent', 'Local Storage'), { recursive: true });
    writeFileSync(join(p.storagePath, 'flat-parent', 'Local Storage', 'leveldb'), 'a file where the folder should be');
    const w = await storageWritten(join(p.storagePath, 'flat-parent'), 250);
    expect(w.landing).toBe('bound');
  });

  it('a bound shorter than QUIET_MS ends the wait at the bound; a bound that is not a positive number ends it at once', async () => {
    const p = profile();
    writeLog(join(p.dir, '000003.log'), 2);
    const short = await storageWritten(p.storagePath, 60);
    expect(short.landing).toBe('bound');
    expect(short.waitedMs).toBeLessThan(QUIET_MS);
    for (const bad of [Number.NaN, -5, 0, Number.POSITIVE_INFINITY]) {
      const w = await storageWritten(p.storagePath, bad);
      expect(w.landing).toBe('bound');
      expect(w.waitedMs).toBeLessThan(50);
    }
  });
});
