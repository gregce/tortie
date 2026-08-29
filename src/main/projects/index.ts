/**
 * src/main/projects — `projects:create` (Phase 12.9 item 1) and the three
 * clone channels (Phase 18.6 item 5).
 *
 * Wiring only; the rules are in ./create.ts and ./clone.ts. Registered from
 * main boot alongside the other registrars:
 *
 *     import { registerProjectCreateIpc, registerProjectCloneIpc } from './projects';
 *     registerProjectCreateIpc(ipcMain);
 *     registerProjectCloneIpc(ipcMain);
 *
 * and, on quit:
 *
 *     import { disposeProjectCloneIpc } from './projects';
 *     await disposeProjectCloneIpc();
 *
 * The frozen projects:* channels (add/list/remove/pickDirectory) stay where
 * they have always been, in src/main/ipc.ts next to the core they read from.
 * These live apart because they are the only project channels that WRITE to
 * the filesystem, and that deserves its own small module with its own tests
 * rather than another branch inside the 1,600-line boot registrar.
 *
 * A clone belongs to the WINDOW that asked for it, exactly as a search does.
 * The sink is built from `event.sender`, which gives the engine both the
 * delivery address and the one-clone-per-window key, and a window that
 * closes mid clone takes its git child with it rather than leaving one
 * writing into a folder nobody is looking at.
 */

import type { IpcMain, WebContents } from 'electron';
import { mkdir, stat } from 'node:fs/promises';
import { cloneProgressChannel } from '@shared/ipc';
import type { CloneDone, CloneProgress } from '@shared/ipc';
import { noteEvent } from '../diagnostics/ipc-sample';
import { runGitOrThrow } from '../git/exec';
import { handle } from '../typed-ipc';
import { CloneEngine, preflightClone } from './clone';
import type { CloneSink } from './clone';
import type { ProjectCreateDeps } from './create';
import { createProjectCreator } from './create';

export {
  createProjectCreator,
  type ProjectCreateDeps,
  type ProjectCreator
} from './create';
export { cloneGitEnv, preflightClone, CloneEngine } from './clone';

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

// ---------------------------------------------------------------------------
// Cloning (Phase 18.6 item 5)
// ---------------------------------------------------------------------------

const cloneEngine = new CloneEngine();

/** Senders already hooked, so 'destroyed' is wired exactly once. */
const hooked = new WeakSet<WebContents>();

function sinkFor(sender: WebContents): CloneSink {
  const key = `wc:${String(sender.id)}`;
  if (!hooked.has(sender)) {
    hooked.add(sender);
    sender.once('destroyed', () => {
      cloneEngine.cancelForSink(key);
    });
  }
  return {
    key,
    alive: () => !sender.isDestroyed(),
    send: (cloneId: string, frame: CloneProgress | CloneDone) => {
      if (sender.isDestroyed()) return;
      // Phase 163: one branch, counted only while a capture is open.
      noteEvent();
      sender.send(cloneProgressChannel(cloneId), frame);
    }
  };
}

/**
 * Register the three clone channels. Call once during main-process boot.
 */
export function registerProjectCloneIpc(ipc: IpcMain): void {
  handle(ipc, 'projects:clonePreflight', (_e, input) => preflightClone(input));
  handle(ipc, 'projects:clone', async (event, input) => {
    const cloneId = await cloneEngine.start(input, sinkFor(event.sender));
    return { cloneId };
  });
  handle(ipc, 'projects:cancelClone', (_e, cloneId) => {
    cloneEngine.cancel(cloneId);
  });
}

/**
 * Quit-time teardown: cancel any clone still running, which is the same code
 * path as pressing Cancel. Awaited by `before-quit`, and bounded there, so a
 * quit during a clone never leaves a repository half written and never waits
 * on a network.
 */
export function disposeProjectCloneIpc(): Promise<void> {
  return cloneEngine.dispose();
}
