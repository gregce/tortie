/**
 * The closed folders on other machines: every read and write of the
 * `closed_remote_folders` table (Phase 344, migration 020).
 *
 * ## What one row is
 *
 * The record that a person closed the project tab for ONE folder on ONE other
 * machine, and has not opened it again since. It holds the tab's name when it
 * closed and the local instant of the close, and nothing about a session.
 *
 * The re-home in `../machines/remote-rehome.ts` puts a session on another
 * machine in the tab for its folder there, and opens that tab when the folder
 * has none. A folder a person closed must stay closed, and until this table the
 * only record of a close was the Phase 93 stamp on the folder's SESSION ROWS. A
 * folder none of whose sessions has a row on this Mac (Tortie on that machine,
 * Tortie on another Mac, a build before Phase 90.3) carried no stamp, so every
 * pass opened its tab again. This row needs no session row.
 *
 * ## Why it is a table of its own
 *
 * The stamp needs a session row, which is the limit this closes, and the
 * folder's `remote_projects` row is deleted with the tab. The key is the one
 * `remote_folder_pins` has, `(machine_id, path)`: one record per folder per
 * machine, and the same path on two machines is two records.
 *
 * ## Only folders on other machines
 *
 * Nothing re-opens a tab on this Mac by itself, so a local row would be a
 * record nothing reads. `./sessions-repository.ts` writes a row for a folder on
 * another machine only, and a local close writes exactly what it wrote before.
 *
 * ## The key is the stored path BYTE FOR BYTE
 *
 * `path` is the folder's stored path on that machine, the string its project
 * row and its sessions carry. It is never resolved, normalised or case folded
 * here: two spellings are two keys, and a closed folder holds that folder and
 * no folder under it.
 *
 * ## A planted row reads as no record
 *
 * A row whose name is not a non-empty string, or whose instant is not a finite
 * number, reads back as undefined, the same answer as no row at all. An
 * `INTEGER` column stores a planted `'abc'` as text, so the instant is read by
 * its type and never by its column. A record that cannot be read fails OPEN:
 * the folder gets its tab back, which is what happened before this phase.
 *
 * ## Durable to write, ordinary to clear
 *
 * The write runs inside `markProjectTabClosed`'s durable transaction, beside
 * the stamps, because a close that a power loss discards brings the tab back,
 * which is the defect. The clear runs inside `clearProjectTabClosed`'s ordinary
 * transaction, beside the stamps, because a clear that is lost leaves a record
 * beside a tab that is open again, which holds nothing while the tab's row
 * exists, and the next close writes it again. Neither method here opens a
 * transaction of its own.
 *
 * ## No prune
 *
 * One row per folder a person closed on another machine and has not opened
 * since, which is bounded by what a person does by hand. Opening the folder
 * again deletes it. Removing a machine deletes none, as it deletes none of that
 * machine's other records: kept, a row is inert while the machine is gone, and
 * the tabs he closed stay closed if it is added again under the same id.
 */

import type Database from 'better-sqlite3';

/** The record of one closed folder on one machine, as the readers take it. */
export interface ClosedRemoteFolder {
  /** The machine row's id. Never `local`. */
  readonly machineId: string;
  /** The folder's stored path on that machine, byte for byte. */
  readonly path: string;
  /** The tab's name at the moment it closed. */
  readonly projectName: string;
  /** Local epoch ms of the close. */
  readonly closedAt: number;
}

/**
 * One row of `closed_remote_folders` (migration 020, Phase 344), as SQLite
 * hands it back. Both fields are `unknown`, because a planted row can hold
 * anything a column will store.
 */
interface ClosedRemoteFolderRow {
  project_name: unknown;
  closed_at: unknown;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export class ClosedRemoteFolders {
  constructor(private readonly db: Database.Database) {}

  /**
   * The record of a close for one folder on one machine, or undefined when
   * there is none, when the machine or the folder is not named, or when the
   * row is not in the one shape. A read; it writes nothing.
   */
  closedRemoteFolder(machineId: string, path: string): ClosedRemoteFolder | undefined {
    if (!nonEmpty(machineId) || !nonEmpty(path)) return undefined;
    const row = this.db
      .prepare<[string, string], ClosedRemoteFolderRow>(
        'SELECT project_name, closed_at FROM closed_remote_folders WHERE machine_id = ? AND path = ?'
      )
      .get(machineId, path);
    if (row === undefined) return undefined;
    if (typeof row.project_name !== 'string' || row.project_name.length === 0) return undefined;
    if (typeof row.closed_at !== 'number' || !Number.isFinite(row.closed_at)) return undefined;
    return { machineId, path, projectName: row.project_name, closedAt: row.closed_at };
  }

  /**
   * Record, or replace, the close of one folder on one machine.
   *
   * It opens NO transaction: its one caller is `markProjectTabClosed`, which
   * calls it inside its own durable transaction, after the stamps, and only
   * with a record the closed-tab codec read back whole, so the name is never
   * empty and the instant is always finite. A second close of the same folder,
   * after an older build opened it again, replaces the name and the instant.
   */
  recordClosedRemoteFolder(record: ClosedRemoteFolder): void {
    this.db
      .prepare<[string, string, string, number]>(
        `INSERT INTO closed_remote_folders (machine_id, path, project_name, closed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(machine_id, path)
           DO UPDATE SET project_name = excluded.project_name,
                         closed_at = excluded.closed_at`
      )
      .run(record.machineId, record.path, record.projectName, record.closedAt);
  }

  /**
   * Delete the record of a close for one folder on one machine, because the
   * folder has a tab again.
   *
   * It opens NO transaction: its one caller is `clearProjectTabClosed`, which
   * calls it inside its own ordinary transaction, beside the stamps. Its WHERE
   * names the key's two columns path first, so that the read above is the one
   * WHERE in this file that names them machine first.
   *
   * @returns how many rows were deleted, 0 or 1.
   */
  forgetClosedRemoteFolder(machineId: string, path: string): number {
    return this.db
      .prepare<[string, string]>(
        'DELETE FROM closed_remote_folders WHERE path = ? AND machine_id = ?'
      )
      .run(path, machineId).changes;
  }
}
