/**
 * Making a NEW project (Phase 12.9 item 1) — the rules, with the world
 * injected so they are testable without a filesystem.
 *
 * Until now ⌘O was the only way into gmux: you could open a folder that
 * already existed and nothing else. Starting a piece of work therefore meant
 * leaving the app, making a directory in some other terminal, and coming
 * back — in a product whose whole claim is that the work lives here.
 *
 * WHY THIS IS NOT ASSEMBLED FROM THE Phase 12.9 fs:* CHANNELS. Every one of
 * those proves its target sits inside an already-open project root before it
 * touches the disk. A folder that does not exist yet is, by construction,
 * outside all of them — the guard that makes those channels safe is exactly
 * what makes them unable to do this. So this is its own operation, with its
 * own (much narrower) rule: create ONE directory, with a single-segment
 * name, inside a parent the user picked from the native dialog.
 *
 * The three steps are deliberately ordered so a failure never strands the
 * user halfway: create the folder → (optionally) `git init` → add it as a
 * project. A `git init` that fails does NOT fail the creation; the folder
 * exists and opens as a non-git project, which is a state gmux already
 * renders properly (DESIGN.md §6.3) and the user can initialize from the
 * sidebar. Nothing here ever deletes anything.
 */

import type { CreateProjectInput, CreateProjectResult } from '@shared/ipc';
import { projectPathFor, validateProjectName } from '@shared/project-create';
import { visibleName } from '@shared/visible-name';
import type { Project } from '@shared/types';
import { gmuxError } from '../errors';

/** What creating a project needs from the outside world. */
export interface ProjectCreateDeps {
  /** True when the path exists (file OR directory). */
  exists(path: string): Promise<boolean>;
  /** True when the path exists AND is a directory. */
  isDirectory(path: string): Promise<boolean>;
  /** mkdir, non-recursive — the parent is required to exist already. */
  makeDirectory(path: string): Promise<void>;
  /** `git init` in the new folder; rejects with git's own message. */
  gitInit(path: string): Promise<void>;
  /** The manifest-backed add that ⌘O already goes through. */
  addProject(path: string): Promise<Project>;
}

export interface ProjectCreator {
  create(input: CreateProjectInput): Promise<CreateProjectResult>;
}

export function createProjectCreator(
  deps: ProjectCreateDeps,
  /**
   * PHASE 359, THE FIX ROUND (build/p359/SPEC.md "### The fix round"). Resolves
   * when the quit's project step begins (`disposeProjectCloneIpc` in
   * ./index.ts, awaited before the session core's shutdown). From then a
   * create still in `git init` adds its project without waiting for git, the
   * way a failed `git init` already does, so the add reaches the core that is
   * still running; once the quit has begun no core boots to answer an add that
   * comes later. Without it a create waits for git as it always has.
   */
  quitBegun?: Promise<void>
): ProjectCreator {
  const create = async (
    input: CreateProjectInput
  ): Promise<CreateProjectResult> => {
    if (input === null || typeof input !== 'object') {
      throw gmuxError('INVALID_INPUT', 'A project name and folder are needed.');
    }
    // Trailing slashes are normalized away FIRST, so the directory check,
    // the collision check and the created path all reason about one spelling
    // of the parent (a hand-typed "~/src/" is otherwise a different string
    // from the picker's "/Users/me/src").
    const raw = String(input.parentDir ?? '').trim().replace(/\/+$/, '');
    const parentDir = raw === '' && input.parentDir?.trim() === '/' ? '/' : raw;
    const name = String(input.name ?? '').trim();

    if (parentDir.length === 0 || !parentDir.startsWith('/')) {
      throw gmuxError('INVALID_INPUT', 'Choose a folder to create it in.');
    }
    const nameError = validateProjectName(name);
    if (nameError !== null) throw gmuxError('INVALID_INPUT', nameError);
    if (!(await deps.isDirectory(parentDir))) {
      throw gmuxError(
        'INVALID_INPUT',
        'That folder does not exist any more.',
        parentDir
      );
    }

    const path = projectPathFor(parentDir, name);
    if (await deps.exists(path)) {
      // Not an error state to recover FROM — the user picks another name —
      // so it names the collision rather than the errno.
      // PHASE 274.3, the fix round of Phase 352: the name a person reads
      // has what cannot be seen written out; the detail keeps the path.
      throw gmuxError(
        'INVALID_INPUT',
        `'${visibleName(name)}' already exists in that folder.`,
        path
      );
    }

    try {
      await deps.makeDirectory(path);
    } catch (err) {
      throw gmuxError(
        'FS_FAILED',
        `Could not create '${visibleName(name)}'.`,
        (err as Error).message
      );
    }

    // A failed `git init` must not cost the user the folder they just made:
    // report it, open the project anyway, and let §6.3's [Initialize
    // repository] be the retry.
    let isRepo = false;
    let gitError: string | undefined;
    if (input.gitInit) {
      const failed = (err: unknown) => ({ ok: false as const, message: (err as Error).message });
      let init: Promise<{ ok: boolean; message: string | undefined }>;
      try {
        init = deps.gitInit(path).then(() => ({ ok: true as const, message: undefined }), failed);
      } catch (err) {
        init = Promise.resolve(failed(err));
      }
      // PHASE 359, THE FIX ROUND. A quit that begins while git runs ends the
      // wait: the folder is made and opens as a project either way, and git
      // finishes its own `init` on its own.
      const ran =
        quitBegun === undefined
          ? await init
          : await Promise.race([init, quitBegun.then(() => null)]);
      if (ran !== null) {
        isRepo = ran.ok;
        gitError = ran.message;
      }
    }

    const project = await deps.addProject(path);
    return {
      project,
      path,
      isRepo,
      ...(gitError !== undefined ? { gitError } : {})
    };
  };

  return { create };
}
