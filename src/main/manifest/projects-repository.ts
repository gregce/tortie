/**
 * The projects repository: every read and write of the `projects` table
 * (Phase 42 stage 6 split out of ./store.ts).
 *
 * Deliberately not durable. A lost project row costs a tab, not a session,
 * and session rows carry their own `project_path` (the measurement table in
 * ./sessions-repository.ts states the reason `upsertProject` stays at
 * NORMAL).
 */

import type Database from 'better-sqlite3';
import type { Project } from '@shared/types';

interface ProjectRow {
  id: string;
  path: string;
  name: string;
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

  listProjects(): Project[] {
    return this.db
      .prepare<[], ProjectRow>('SELECT * FROM projects ORDER BY name ASC')
      .all()
      .map((row) => ({ id: row.id, path: row.path, name: row.name }));
  }

  /** Remove a project tab. Sessions rows keep their project_path history. */
  deleteProject(id: string): void {
    this.db.prepare<[string]>('DELETE FROM projects WHERE id = ?').run(id);
  }
}
