/**
 * cursor, the CLI, through the product reader against a real store.db built
 * from the committed description. The matrix row is 3 turns, 2 answers.
 * Defect 6 lives here: the blob probe is 32 bytes, because the role marker
 * closes at byte 29 and a 24 byte probe lost every answer in 10 of 40
 * stores.
 */

import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterAll, describe, expect, it } from 'vitest';
import { KEEP_MAP, readSessionLog } from '../reader';
import { buildCursorStore, keptText, scratchDir } from './reader-helpers';

describe('reader, cursor', () => {
  const dir = scratchDir('cursor');
  const file = buildCursorStore(dir);
  const r = readSessionLog({
    provider: 'cursor',
    file,
    sessionId: null,
    cwd: '/Users/example/rookery',
    projectPath: '/Users/example/rookery',
    watermark: null
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fills the matrix row, 3 turns and 2 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(2);
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    expect(all).not.toContain('<user_info>');
    expect(all).not.toContain('Looking at the workspace');
  });

  it('sets blobProbeBytes to 32, defect 6', () => {
    expect(KEEP_MAP.providers['cursor']!.blobProbeBytes).toBe(32);
  });

  it('probes a whole role marker, the word assistant survives the 32 byte head', () => {
    const db = new Database(file, { readonly: true, fileMustExist: true });
    try {
      const rows = db
        .prepare('select substr(data,1,32) as head from blobs')
        .all() as Array<{ head: unknown }>;
      const heads = rows.map((row) =>
        Buffer.isBuffer(row.head) ? row.head.toString('utf8') : String(row.head)
      );
      expect(heads.some((h) => h.includes('assistant'))).toBe(true);
    } finally {
      db.close();
    }
  });

  it('reads the ask clock from the timestamp tag', () => {
    expect(r.turns[0]!.ask.at).toContain('2026');
  });

  it('resumes by root blob id, an unchanged store is no work', () => {
    const r2 = readSessionLog({
      provider: 'cursor',
      file,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: r.watermark
    });
    expect(r2.work).toBe('none');
    expect(r2.acct.bytesRead).toBe(0);
  });

  it('reads the join from the meta row', () => {
    expect(r.join.sessionId).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('an appended blob is a suffix read that re-emits the tail turn with its index', () => {
    const dir2 = scratchDir('cursor-suffix');
    try {
      const file2 = buildCursorStore(dir2);
      const first = readSessionLog({
        provider: 'cursor',
        file: file2,
        sessionId: null,
        cwd: '/Users/example/rookery',
        projectPath: '/Users/example/rookery',
        watermark: null
      });
      // Extend the chain with one new ask blob and a new root that is an
      // exact prefix extension of the old one, the shape 11 superseded
      // roots showed in one real session.
      const db = new Database(file2);
      const newBlob = Buffer.from(
        JSON.stringify({
          role: 'user',
          content: [{ type: 'text', text: '<user_query>and add a version route</user_query>' }]
        }),
        'utf8'
      );
      const newId = 'ab'.repeat(32);
      db.prepare('insert into blobs (id,data) values (?,?)').run(newId, newBlob);
      const metaRow = db.prepare("select value from meta where key='0'").get() as {
        value: string;
      };
      const meta = JSON.parse(Buffer.from(metaRow.value, 'hex').toString('utf8')) as {
        latestRootBlobId: string;
      };
      const oldRoot = db
        .prepare('select data from blobs where id=?')
        .get(meta.latestRootBlobId) as { data: Buffer };
      const newRootId = 'cd'.repeat(32);
      const entry = Buffer.concat([Buffer.from('0a20', 'hex'), Buffer.from(newId, 'hex')]);
      // The digest list is protobuf field 1 entries back to back at the
      // front of the blob, so appending the new entry after the last one
      // keeps the old chain as an exact prefix.
      const digestsLen = 34 * 9;
      const extended = Buffer.concat([
        oldRoot.data.subarray(0, digestsLen),
        entry,
        oldRoot.data.subarray(digestsLen)
      ]);
      db.prepare('insert into blobs (id,data) values (?,?)').run(newRootId, extended);
      meta.latestRootBlobId = newRootId;
      db.prepare("update meta set value=? where key='0'").run(
        Buffer.from(JSON.stringify(meta), 'utf8').toString('hex')
      );
      db.close();
      const second = readSessionLog({
        provider: 'cursor',
        file: file2,
        sessionId: null,
        cwd: '/Users/example/rookery',
        projectPath: '/Users/example/rookery',
        watermark: first.watermark
      });
      expect(second.work).toBe('suffix');
      const lastBefore = first.turns[first.turns.length - 1]!;
      expect(second.turns[0]!.index).toBe(lastBefore.index);
      expect(second.turns[second.turns.length - 1]!.ask.text).toBe('and add a version route');
    } finally {
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });
});
