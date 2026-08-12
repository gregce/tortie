/**
 * src/main/projects — `projects:create` (Phase 12.9 item 1).
 *
 * Wiring only; the rules are in ./create.ts. Registered from main boot
 * alongside the other registrars:
 *
 *     import { registerProjectCreateIpc } from './projects';
 *     registerProjectCreateIpc(ipcMain);
 *
 * The frozen projects:* channels (add/list/remove/pickDirectory) stay where
 * they have always been, in src/main/ipc.ts next to the core they read from.
 * This one lives apart because it is the only project channel that WRITES to
 * the filesystem, and that deserves its own small module with its own tests
 * rather than another branch inside the 1,600-line boot registrar.
 */

import type { IpcMain } from 'electron';
import { mkdir, stat } from 'node:fs/promises';
import { runGitOrThrow } from '../git/exec';
import { handle } from '../typed-ipc';
import type { ProjectCreateDeps } from './create';
import { createProjectCreator } from './create';

export {
  createProjectCreator,
  type ProjectCreateDeps,
  type ProjectCreator
} from './create';

/** Production dependencies: the real filesystem, real git, the real core. */
function defaultDeps(): ProjectCreateDeps {
  const statOrNull = async (
    path: string
  ): Promise<{ isDirectory: boolean } | null> => {
    try {
      const info = await stat(path);
      return { isDirectory: info.isDirectory() };
    } catch {
      return null;
    }
  };
  return {
    exists: async (path) => (await statOrNull(path)) !== null,
    isDirectory: async (path) => (await statOrNull(path))?.isDirectory === true,
    makeDirectory: (path) => mkdir(path).then(() => undefined),
    gitInit: async (path) => {
      // The same call the §6.3 [Initialize repository] button makes, through
      // the same runner — one git spawn path, one set of env guarantees.
      await runGitOrThrow(path, ['init'], 'Could not initialize a repository.');
    },
    addProject: async (path) => {
      // Lazy, like every other main module that needs the core: a project
      // channel must not drag tmux into the boot module graph.
      const { getGmuxCore } = await import('../sessions');
      return (await getGmuxCore()).addProject(path);
    }
  };
}

/**
 * Register `projects:create`. Call once during main-process boot. `deps` is
 * for tests; production passes nothing.
 */
export function registerProjectCreateIpc(
  ipc: IpcMain,
  deps?: ProjectCreateDeps
): void {
  const creator = createProjectCreator(deps ?? defaultDeps());
  handle(ipc, 'projects:create', (_e, input) => creator.create(input));
}
