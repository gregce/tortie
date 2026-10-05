/**
 * The folder pins: every read and write of the `remote_folder_pins` table
 * (Phase 336, migration 019).
 *
 * ## What one row is
 *
 * The identity of ONE folder on ONE other machine, taken when a person opened
 * it as a project, so that every later write into that folder can ask the
 * machine, in the same call that writes, whether the folder it is about to
 * write under is still the folder that was opened.
 *
 * The identity is the far side's `<device>:<inode>` of the folder itself, the
 * pair `stat` prints over `"<folder>/."`. It is read by the `folder-pin` script
 * and compared by the write scripts' own prelude, both in
 * `../machines/remote-scripts.ts`; this file stores it and reads it back and
 * decides nothing else.
 *
 * ## Why it is a table of its own, and not a column on `remote_projects`
 *
 * `./projects-repository.ts` is pinned by digest in `conformance:samefolder`
 * rule 4, and a pin is not that file's question. A separate table with the
 * same key, `(machine_id, path)`, also says exactly what is true: one pin per
 * folder per machine, and a closed tab, which deletes its project row, leaves
 * its pin behind INERT, because only open project rows are ever candidates for
 * a write. Opening the folder again by hand overwrites it.
 *
 * ## The key is the stored path BYTE FOR BYTE
 *
 * `path` is the project row's stored path, the string the folder listing
 * echoed at the open. It is never resolved, normalised or case folded here:
 * two spellings are two keys, and the far side judges what a spelling IS by
 * identity, in the same call as the write. A text rule applied here would be a
 * guess about another computer's filesystem made on this one.
 *
 * ## A malformed identity reads as no pin
 *
 * Every identity crosses `^[0-9]{1,20}:[0-9]{1,20}$` in BOTH directions. A
 * write refuses anything else, and a row whose identity does not match (a hand
 * edited manifest, a planted row) reads back as undefined, which is the same
 * answer as no row at all. What a planted VALID pin can do is stated in
 * build/p336/SPEC.md D7: it can make a write go where the far side's own home
 * and reserved-name rules still allow, and never wider, because those are
 * judged on that machine by identity in the same call and never from this
 * table.
 *
 * ## Durable, because a pin must outlive a quit
 *
 * A pin taken at the open and lost before the next write is a pin the first
 * write takes again from whatever folder is at that path then, which is the
 * swap the pin exists to catch. So the write is a durable commit, the shape the
 * restore journal and the remote execution journal use. It is one row per
 * hand open or per first write, a person's own action each time, so the
 * 4.2 ms a durable commit costs (research 34 section 1.1) is never paid on a
 * clock.
 *
 * ## No prune
 *
 * One row per folder a person has opened on another machine. That is bounded
 * by what a person does by hand, and the table holds nothing about a session,
 * so it has no retention question.
 */

import type Database from 'better-sqlite3';
import { durableTransaction } from '../db/sqlite';
import { manifestError } from './codecs';

/**
 * The one shape a folder identity may have: a device number and an inode
 * number, each 1 to 20 decimal digits, joined by one colon.
 *
 * Twenty digits holds every unsigned 64-bit value. Anything else, including a
 * trailing newline, a sign, a space or the word `none` the far script prints
 * when it cannot read the folder, is not an identity.
 */
export const REMOTE_FOLDER_IDENTITY_PATTERN = /^[0-9]{1,20}:[0-9]{1,20}$/;

/** True when `value` is a folder identity in the one shape above. */
export function isRemoteFolderIdentity(value: unknown): value is string {
  return typeof value === 'string' && REMOTE_FOLDER_IDENTITY_PATTERN.test(value);
}

/** One folder's pin, as the write path reads it. */
export interface RemoteFolderPin {
  /** The machine row's id. */
  readonly machineId: string;
  /** The project row's stored path on that machine, byte for byte. */
  readonly path: string;
  /** `<device>:<inode>` of the folder on that machine, when it was pinned. */
  readonly identity: string;
  /** Local epoch ms of the pin. */
  readonly pinnedAt: number;
}

/** One row of `remote_folder_pins` (migration 019, Phase 336). */
interface RemoteFolderPinRow {
  machine_id: string;
  path: string;
  identity: string;
  pinned_at: number;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export class RemoteFolderPins {
  constructor(private readonly db: Database.Database) {}

  /**
   * The pin for one folder on one machine, or undefined when there is none
   * or the stored identity is not in the one shape.
   */
  remoteFolderPin(machineId: string, path: string): RemoteFolderPin | undefined {
    if (!nonEmpty(machineId) || !nonEmpty(path)) return undefined;
    const row = this.db
      .prepare<[string, string], RemoteFolderPinRow>(
        'SELECT * FROM remote_folder_pins WHERE machine_id = ? AND path = ?'
      )
      .get(machineId, path);
    if (row === undefined || !isRemoteFolderIdentity(row.identity)) return undefined;
    return {
      machineId: row.machine_id,
      path: row.path,
      identity: row.identity,
      pinnedAt: Number(row.pinned_at)
    };
  }

  /**
   * Record, or replace, the pin for one folder on one machine.
   *
   * It refuses an identity that is not in the one shape, and a machine id or
   * path that is empty, and writes nothing when it refuses. It never decides
   * WHETHER a pin should be taken: the write path's rule is that a hand open
   * pins, a first write pins a row that has none, and a folder the machine
   * says is not the pinned one is never re-pinned, and that rule lives with
   * the write path (`../machines/write-folder.ts`), not here.
   *
   * @throws INVALID_INPUT, with nothing written.
   */
  setRemoteFolderPin(
    machineId: string,
    path: string,
    identity: string,
    at: number = Date.now()
  ): void {
    if (!nonEmpty(machineId) || !nonEmpty(path)) {
      throw manifestError(
        'INVALID_INPUT',
        'Tortie did not record that folder, because the machine or the folder was not named. Nothing was written.'
      );
    }
    if (!isRemoteFolderIdentity(identity)) {
      throw manifestError(
        'INVALID_INPUT',
        'Tortie did not record that folder, because what the machine answered is not a folder identity. Nothing was written.'
      );
    }
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, string, string, number]>(
          `INSERT INTO remote_folder_pins (machine_id, path, identity, pinned_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(machine_id, path)
             DO UPDATE SET identity = excluded.identity,
                           pinned_at = excluded.pinned_at`
        )
        .run(machineId, path, identity, at);
    });
  }
}
