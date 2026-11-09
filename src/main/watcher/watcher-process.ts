/**
 * THE WATCHER PROCESS (Phase 365, build/p365/SPEC.md §4.1, D1, D7, D13).
 *
 * Built as its own entry (`electron.vite.config.ts`, emitted as
 * `out/main/watcher-process.js`) and forked by `./host.ts` with an environment
 * of one variable (`TORTIE_WATCHER=1`, never `{}`, which Electron reads as "not
 * set" and replaces with main's whole environment), `stdio: 'ignore'` and
 * `serviceName: 'Tortie Watcher'`, lazily, at the first watch.
 *
 * WHY A PROCESS. `@parcel/watcher` 2.6.0 races itself (research 143 §2.5, §7;
 * upstream issue #271), and the spec step measured the damage landing in main's
 * own heap, the allocator SQLite's page cache lives in, within 5 to 60 seconds
 * of a storm of folders created and removed while watched. With the one queue,
 * the existence check and the grace in here, main never faulted in any shape
 * the spec step drove, and a fault in here costs a new process and one re-read
 * per watch (`./host.ts`), not Tortie (§2.4, §2.5). The research's own words
 * bind what follows: if the damage comes back with the watcher outside main,
 * the watcher is cleared.
 *
 * IT IMPORTS ONLY `node:fs`, `@parcel/watcher` and `./process/` (the allow-only
 * wall in `build/assert-import-boundaries.mjs`, and `conformance:watcher`
 * W365-1). It reads nothing from its environment, writes no file, starts
 * nothing, and holds no credential, manifest or session: what it needs arrives
 * as a message (`./process/wire.ts`). `process.parentPort` is a global of a
 * utility process, so it is typed here rather than imported, as the door does.
 *
 * It ends with main: at a normal quit it exits with main, and after main's
 * SIGKILL it was gone 3 ms later (the spec's §0.1 item 11), so the quit needs
 * no step of its own.
 */

import { statSync } from 'node:fs';
import * as parcelWatcher from '@parcel/watcher';
import { serveWatchQueue } from './process/queue';
import type { FromWatcher } from './process/wire';

/** The slice of Electron's `ParentPort` this process uses. */
interface ParentPortLike {
  on(event: 'message', listener: (event: { data: unknown }) => void): void;
  postMessage(message: FromWatcher): void;
}

const parentPort = (process as unknown as { parentPort?: ParentPortLike }).parentPort;

if (parentPort === undefined) {
  // Not a utility process: there is nobody to answer to, so there is no watcher.
  process.exit(1);
} else {
  const server = serveWatchQueue(
    {
      native: parcelWatcher,
      exists: (dir) => {
        try {
          return statSync(dir).isDirectory();
        } catch {
          return false;
        }
      },
      now: () => Date.now(),
      setTimeout: (callback, ms) => setTimeout(callback, ms)
    },
    (message) => parentPort.postMessage(message)
  );
  parentPort.on('message', (event) => server.receive(event.data));
}
