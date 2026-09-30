/**
 * THE DOOR PROCESS, Tortie's first `utilityProcess` (Phase 330, build/p330/
 * SPEC.md §4.5).
 *
 * Built as its own entry (`electron.vite.config.ts`, emitted as
 * `out/main/pocket-door.js`) and forked by `./bind.ts` with an environment
 * of one variable (`TORTIE_DOOR=1`, never `{}`, which Electron reads as "not
 * set" and replaces with main's whole environment), `stdio: 'ignore'` and
 * `serviceName: 'Tortie Door'`. It reads nothing from its environment
 * (`conformance:pocket` E1). It is the whole of what
 * a stranger on the internet reaches, and research 132 §7.1 is why it is not
 * main: a flaw in Node's TLS, llhttp, URL parsing or `JSON.parse` would
 * otherwise be code execution in the process that writes Claude Code's
 * keychain item. Here it is code execution in a process that holds the door's
 * TLS key and the phones' pins and nothing else: no credential, no manifest,
 * no session, no logger, no Electron.
 *
 * IT IMPORTS ONLY `node:net`, `node:tls`, `node:http`, `node:crypto`,
 * `src/shared/` and `./door/` (`conformance:pocket` W2, and the allow-only wall
 * in `build/assert-import-boundaries.mjs`), and the built bundle is read for
 * the same thing (`conformance:pocket` U5). `process.parentPort` is a global
 * of a utility process, so it is typed here rather than imported.
 *
 * It is Tortie's own code, so it is inside CLAUDE.md refusal 1, and a
 * `utilityProcess` is a process and not a thread, so it is outside research 19
 * §O5's worker budget.
 */

import { createDoorListener } from './door/listener';
import type { FromDoor } from './door/wire';

/** The slice of Electron's `ParentPort` this process uses. */
interface ParentPortLike {
  on(event: 'message', listener: (event: { data: unknown }) => void): void;
  postMessage(message: FromDoor): void;
}

const parentPort = (process as unknown as { parentPort?: ParentPortLike }).parentPort;

if (parentPort === undefined) {
  // Not a utility process: there is nobody to answer to, so there is no door.
  process.exit(1);
} else {
  const door = createDoorListener((message) => parentPort.postMessage(message));
  parentPort.on('message', (event) => door.receive(event.data));
}
