/**
 * The one readiness question a remote verb asks before it composes anything.
 *
 * MOVED HERE IN PHASE 123, from `./remote-sessions.ts`, and the function's body
 * is unchanged. Three files asked `./remote-sessions.ts` for this check, and two
 * of them were files `./remote-sessions.ts` itself imports. That made a runtime
 * cycle of six modules. The check reads the machine context and nothing that
 * belongs to a session, so it is a leaf and it belongs in a leaf.
 *
 * `./remote-sessions.ts` re-exports it, so every one of its roughly thirty
 * callers is unchanged. The two files inside the old cycle name this module
 * directly, being `./dir-list.ts` and `./remote-image.ts`.
 */

import { gmuxError } from '../errors';
import {
  machineContext,
  machineGeneration,
  type RemoteMachineContext
} from './context';
import { MACHINE_NOT_READY } from './remote-copy';

/**
 * The context for a machine Tortie has already signed in to, or a refusal.
 *
 * Two things are asked, and both have to be true. There has to be a registered
 * context, which only `prepareMachine` creates and which the confirm gate stands
 * in front of. And the machine's own program search list has to have been read
 * for the current connection, which is what `prepareMachine` step 5 does. The
 * exec plane refuses a mutating verb without the second one anyway; asking here
 * as well is what turns that into a sentence a person can act on.
 *
 * @throws GmuxError INVALID_INPUT with {@link MACHINE_NOT_READY}.
 */
export function readyRemoteContext(machineId: string): RemoteMachineContext {
  let ctx;
  try {
    ctx = machineContext(machineId);
  } catch {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `${machineId} has no registered connection in this run`
    );
  }
  if (ctx.kind !== 'remote') {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `${machineId} resolved to this Mac rather than to a machine`
    );
  }
  if (machineGeneration(machineId).remotePath === null) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `no program search list is recorded for ${machineId}'s current connection`
    );
  }
  return ctx;
}
