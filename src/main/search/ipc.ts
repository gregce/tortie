/**
 * search:* IPC — the per-domain registrar (growth guardrail 2), called once
 * from main-process boot:
 *
 *     import { registerSearchIpc } from './search';
 *     registerSearchIpc(ipcMain);
 *
 * and, on quit:
 *
 *     import { disposeSearchIpc } from './search';
 *     disposeSearchIpc();
 *
 * The one design point worth stating here rather than in the engine: a search
 * belongs to the WINDOW that asked for it, not to the app. The sink is built
 * from `event.sender`, which gives the engine both the delivery address and
 * the "one live search per window" key, and a window that closes mid-search
 * takes its ripgrep child with it instead of leaving one running against a
 * project nobody is looking at.
 */

import type { IpcMain, WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import { searchResultsChannel } from '@shared/ipc';
import type { SearchProgress } from '@shared/ipc';
import { gmuxError } from '../tmux/errors';
import { resolveProjectRoot } from '../fs/paths';
import { handle } from '../typed-ipc';
import { readSearchContext } from './context';
import { ContentSearchEngine } from './engine';
import type { SearchSink } from './engine';

const engine = new ContentSearchEngine();

/** Senders we have already hooked, so 'destroyed' is wired exactly once. */
const hooked = new WeakSet<WebContents>();

function sinkFor(sender: WebContents): SearchSink {
  if (!hooked.has(sender)) {
    hooked.add(sender);
    sender.once('destroyed', () => {
      engine.cancelForSink(`wc:${sender.id}`);
    });
  }
  return {
    key: `wc:${sender.id}`,
    alive: () => !sender.isDestroyed(),
    send: (searchId: string, progress: SearchProgress) => {
      if (sender.isDestroyed()) return;
      sender.send(searchResultsChannel(searchId), progress);
    }
  };
}

export function registerSearchIpc(ipc: IpcMain): void {
  handle(ipc, 'search:start', async (event, input) => {
    if (typeof input?.query !== 'string' || input.query.length === 0) {
      throw gmuxError('INVALID_INPUT', 'Type something to search for.');
    }
    // Prove the root before minting a stream: a project folder that has been
    // renamed out from under the app should fail here, once, with a friendly
    // message — not as an ENOENT inside a stream the UI is already painting.
    const repoPath = await resolveProjectRoot(input.repoPath);

    const searchId =
      typeof input.searchId === 'string' && input.searchId.length > 0
        ? input.searchId
        : randomUUID();

    engine.start({ ...input, repoPath }, sinkFor(event.sender), searchId);
    return { searchId };
  });

  handle(ipc, 'search:cancel', (_event, searchId) => {
    engine.cancel(searchId);
  });

  handle(ipc, 'search:context', (_event, input) => readSearchContext(input));
}

/** Quit-time teardown: SIGKILL every live ripgrep. */
export function disposeSearchIpc(): void {
  engine.dispose();
}
