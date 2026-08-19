/**
 * The projects repository: every read and write of the `projects` table
 * (Phase 42 stage 6 split out of ./store.ts) and, since Phase 90.3, of the
 * `remote_projects` table beside it.
 *
 * Deliberately not durable. A lost project row costs a tab, not a session,
 * and session rows carry their own `project_path` (the measurement table in
 * ./sessions-repository.ts states the reason `upsertProject` stays at
 * NORMAL).
 *
 * ## Two tables, one id space (Phase 90.3)
 *
 * A folder on this Mac lives in `projects` and a folder on another machine
 * lives in `remote_projects`. They are two tables because `projects.path` is
 * UNIQUE, and `/Users/gdc/gmux` here and `/Users/gdc/gmux` over there are two
 * different folders that must both be able to have a tab.
 *
 * They are ONE id space, and that is what keeps every existing caller correct.
 * `projects:remove` takes an id and does not know or care which table the row
 * is in, so {@link ProjectsRepository.deleteProject} deletes from both. Ids are
 * uuids, so a delete can never reach a row it was not aimed at.
 *
 * {@link ProjectsRepository.listProjects} returns the local rows first, in
 * exactly the order they were returned before this phase, and then the remote
 * rows. A remote row carries `machineId`; a local row does not, exactly as
 * before, so every reader that has never heard of a machine still reads a local
 * project correctly.
 */

import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Project } from '@shared/types';

interface ProjectRow {
  id: string;
  path: string;
  name: string;
}

interface RemoteProjectRow {
  id: string;
  machine_id: string;
  path: string;
  name: string;
  added_at: number;
}

/** What an add of a folder on a machine knows. */
export interface RemoteProjectInput {
  /** The machine row's id. */
  readonly machineId: string;
  /** Absolute, ON THAT MACHINE. */
  readonly path: string;
  /** What a person reads on the tab. */
  readonly name: string;
}

export class ProjectsRepository {
  constructor(private readonly db: Database.Database) {}

  /** Insert or update by unique path (idempotent "add project"). */
  upsertProject(project: Project): Project {
    this.db
      .prepare(
        `INSERT INTO projects (id, path, name) VALUES (@id, @path, @name)
         ON CONFLICT(path) DO UPDATE SET name = excluded.name`
      )
      .run({ id: project.id, path: project.path, name: project.name });
    // Path conflicts keep the ORIGINAL row id — return the row as stored.
    const stored = this.getProjectByPath(project.path);
    return stored ?? project;
  }

  getProjectByPath(path: string): Project | undefined {
    const row = this.db
      .prepare<[string], ProjectRow>('SELECT * FROM projects WHERE path = ?')
      .get(path);
    return row ? { id: row.id, path: row.path, name: row.name } : undefined;
  }

  // -------------------------------------------------------------------------
  // Folders on other machines (Phase 90.3)
  // -------------------------------------------------------------------------

  /**
   * Insert or update by `(machine_id, path)`, and return the row as STORED.
   *
   * The read back matters for the same reason it matters above. A second add of
   * a folder that already has a tab keeps the ORIGINAL id, so the renderer
   * focuses the tab that is already open instead of drawing a second one.
   */
  upsertRemoteProject(input: RemoteProjectInput): Project {
    this.db
      .prepare(
        `INSERT INTO remote_projects (id, machine_id, path, name, added_at)
         VALUES (@id, @machineId, @path, @name, @addedAt)
         ON CONFLICT(machine_id, path) DO UPDATE SET name = excluded.name`
      )
      .run({
        id: randomUUID(),
        machineId: input.machineId,
        path: input.path,
        name: input.name,
        addedAt: Date.now()
      });
    const stored = this.getRemoteProject(input.machineId, input.path);
    // The read back cannot miss: the insert above either wrote the row or
    // updated the row that was already there. The fallback exists so the type
    // is honest rather than because a case is known.
    return (
      stored ?? {
        id: randomUUID(),
        path: input.path,
        name: input.name,
        machineId: input.machineId
      }
    );
  }

  /** One folder on one machine, or undefined. */
  getRemoteProject(machineId: string, path: string): Project | undefined {
    const row = this.db
      .prepare<[string, string], RemoteProjectRow>(
        'SELECT * FROM remote_projects WHERE machine_id = ? AND path = ?'
      )
      .get(machineId, path);
    return row
      ? { id: row.id, path: row.path, name: row.name, machineId: row.machine_id }
      : undefined;
  }

  /** Every folder on every machine, machine first and then name. */
  listRemoteProjects(): Project[] {
    return this.db
      .prepare<[], RemoteProjectRow>(
        'SELECT * FROM remote_projects ORDER BY machine_id ASC, name ASC'
      )
      .all()
      .map((row) => ({
        id: row.id,
        path: row.path,
        name: row.name,
        machineId: row.machine_id
      }));
  }

  /**
   * Local rows in their existing order, then the rows on other machines.
   *
   * The local half is byte for byte what this method returned before Phase
   * 90.3, so a build with no machines reads exactly the list it always read.
   */
  listProjects(): Project[] {
    const local = this.db
      .prepare<[], ProjectRow>('SELECT * FROM projects ORDER BY name ASC')
      .all()
      .map((row) => ({ id: row.id, path: row.path, name: row.name }));
    return [...local, ...this.listRemoteProjects()];
  }

  /**
   * Remove a project tab, of either kind. Sessions rows keep their
   * `project_path` history.
   *
   * Both statements run because the caller has one id and no way to know which
   * table holds it. Ids are uuids, so the statement that does not match its
   * row deletes nothing.
   */
  deleteProject(id: string): void {
    this.db.prepare<[string]>('DELETE FROM projects WHERE id = ?').run(id);
    this.db
      .prepare<[string]>('DELETE FROM remote_projects WHERE id = ?')
      .run(id);
  }
}
