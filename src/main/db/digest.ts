/**
 * digest.ts — prove two SQLite databases hold the same rows, not the same
 * number of rows (Phase 19 item 10).
 *
 * ## The defect this replaces
 *
 * The rename migration verified a copied database by comparing per table row
 * counts. Research 34 §3.2 measured why that is not verification. A copy of the
 * operator's real manifest taken WITHOUT its write ahead log had identical row
 * counts in every table and `integrity_check` returned ok, while a per table
 * content hash showed `sessions` differing, with `last_seen` stale on all 40
 * rows and `status` stale on one. Tortie's manifest churn is almost entirely
 * `UPDATE` against those two columns, and a row count cannot see an `UPDATE`.
 *
 * The replacement is a sha256 per table over the rows in a fixed order. It was
 * measured at 0.30 ms on the real manifest, against 0.72 ms for the
 * `VACUUM INTO` that produces the copy being checked, so it is free at this
 * size.
 *
 * ## Why the rows are ordered by every column
 *
 * The obvious order is the rowid, and it is wrong here. `VACUUM` renumbers
 * rowids for any table that does not declare an INTEGER PRIMARY KEY, so a
 * snapshot of a healthy database would compare unequal to its source through
 * no fault of the copy. Ordering by every column in declared order is stable
 * under that renumbering, and it is the same comparison on both sides.
 *
 * Phase 20 reuses this as the verification step of the backup ring, which is
 * why it lives beside the one database opener rather than inside the migration
 * that needed it first.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';

/** Type tags, so a string "1" and an integer 1 cannot hash the same. */
const TAG_NULL = 0x00;
const TAG_INT = 0x01;
const TAG_REAL = 0x02;
const TAG_TEXT = 0x03;
const TAG_BLOB = 0x04;
const ROW_END = 0x0a;

/**
 * Every table the user's data lives in, sorted, with SQLite's own bookkeeping
 * left out.
 *
 * Three callers had written this query out: the digest below, the migration's
 * row count, and the rebuild's row count. Two of the three had drifted in
 * their formatting already.
 */
export function userTableNames(db: Database.Database): string[] {
  return db
    .prepare<[], { name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' " +
        "AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all()
    .map((t) => t.name);
}

/**
 * table -> how many rows it holds, or -1 when the count would not answer.
 *
 * This is NOT verification and no caller may treat it as such. An `UPDATE`
 * does not change a count, and Tortie's manifest churn is almost entirely
 * `UPDATE`. It is kept because a count is what a person reads in a log line.
 * Use `tableDigests` to decide whether two databases agree.
 */
export function tableRowCounts(db: Database.Database): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of userTableNames(db)) {
    const row = db
      .prepare<[], { c: number }>(
        `SELECT COUNT(*) AS c FROM "${name.replace(/"/g, '""')}"`
      )
      .get();
    out[name] = row?.c ?? -1;
  }
  return out;
}

/**
 * table -> sha256 over its column names and every row, in a fixed order.
 *
 * A table this connection cannot read is reported as `unreadable: <message>`
 * rather than skipped. Two databases that fail the same way still compare
 * equal, which is the honest answer, and a table that became unreadable in one
 * of them compares unequal, which is the answer that matters.
 */
export function tableDigests(db: Database.Database): Record<string, string> {
  const out: Record<string, number | string> = {};
  for (const name of userTableNames(db)) {
    out[name] = digestOneTable(db, name);
  }
  return out as Record<string, string>;
}

function digestOneTable(db: Database.Database, table: string): string {
  const quoted = `"${table.replace(/"/g, '""')}"`;
  const hash = createHash('sha256');
  try {
    const columns = db
      .prepare<[], { name: string }>(`PRAGMA table_info(${quoted})`)
      .all()
      .map((c) => c.name);
    // The header catches a dropped or renamed column even on an empty table.
    hash.update(`${table}|${columns.join(',')}|`, 'utf8');

    const order = columns.map((_, i) => String(i + 1)).join(',');
    const sql =
      columns.length === 0
        ? `SELECT * FROM ${quoted}`
        : `SELECT * FROM ${quoted} ORDER BY ${order}`;
    const rows = db.prepare(sql).raw(true).iterate() as Iterable<unknown[]>;
    for (const row of rows) {
      for (const value of row) hash.update(encodeValue(value));
      hash.update(Buffer.of(ROW_END));
    }
    return hash.digest('hex');
  } catch (err) {
    return `unreadable: ${(err as Error).message}`;
  }
}

function encodeValue(value: unknown): Buffer {
  if (value === null || value === undefined) return Buffer.of(TAG_NULL);
  if (typeof value === 'bigint') {
    return tagged(TAG_INT, Buffer.from(value.toString(10), 'utf8'));
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? tagged(TAG_INT, Buffer.from(value.toString(10), 'utf8'))
      : tagged(TAG_REAL, Buffer.from(value.toExponential(17), 'utf8'));
  }
  if (typeof value === 'string') {
    return tagged(TAG_TEXT, Buffer.from(value, 'utf8'));
  }
  if (Buffer.isBuffer(value)) return tagged(TAG_BLOB, value);
  if (value instanceof Uint8Array) return tagged(TAG_BLOB, Buffer.from(value));
  // SQLite has five storage classes and the four above cover them. Anything
  // else is a driver surprise, and it is hashed rather than dropped.
  return tagged(TAG_TEXT, Buffer.from(String(value), 'utf8'));
}

/** tag, then the byte length, then the bytes, so nothing runs together. */
function tagged(tag: number, body: Buffer): Buffer {
  const header = Buffer.alloc(5);
  header.writeUInt8(tag, 0);
  header.writeUInt32BE(body.length, 1);
  return Buffer.concat([header, body]);
}

/**
 * Name every table the two sides disagree about, in a sentence a support answer
 * can quote. Empty means the two databases hold the same rows.
 */
export function digestDifferences(
  source: Record<string, string>,
  copy: Record<string, string>
): string[] {
  const names = [...new Set([...Object.keys(source), ...Object.keys(copy)])].sort();
  const out: string[] = [];
  for (const name of names) {
    const a = source[name];
    const b = copy[name];
    if (a === b) continue;
    if (a === undefined) out.push(`${name}: only in the copy`);
    else if (b === undefined) out.push(`${name}: missing from the copy`);
    else out.push(`${name}: contents differ`);
  }
  return out;
}
