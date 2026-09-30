/**
 * The door process, run in the calling process (Phase 330, build/p330/SPEC.md
 * §4.5.1).
 *
 * vitest has no `utilityProcess`, and neither has the hostile client, so both
 * drive a REAL TLS door through this: the same {@link createDoorListener} the
 * door process runs, behind the same {@link DoorSpawner} interface `bind.ts`
 * forks the real one through. Every message is `structuredClone`d and
 * delivered on a later turn, both ways, so what crosses is what would cross a
 * process boundary and nothing reaches the other side synchronously.
 *
 * Production never passes this. Only tests, `push-seam.ts` and the hostile
 * client name it (`conformance:pocket` U4).
 */

import { createDoorListener, type DoorListenerHandle, type DoorListenerOptions } from './listener';
import type { DoorChild, DoorSpawner, FromDoor, ToDoor } from './wire';

/** A spawner that also shows the listeners it started, for their counters. */
export interface InProcessDoor extends DoorSpawner {
  readonly doors: readonly DoorListenerHandle[];
}

export function inProcessDoor(options: DoorListenerOptions = {}): InProcessDoor {
  const doors: DoorListenerHandle[] = [];
  const spawn = (): DoorChild => {
    let exited = false;
    const onMessage: ((message: unknown) => void)[] = [];
    const onExit: ((code: number | null) => void)[] = [];
    const door = createDoorListener((message: FromDoor) => {
      const copy = structuredClone(message);
      setImmediate(() => {
        if (exited) return;
        for (const listener of onMessage) listener(copy);
      });
    }, options);
    doors.push(door);
    return {
      pid: undefined,
      post(message: ToDoor): void {
        if (exited) return;
        const copy = structuredClone(message);
        setImmediate(() => {
          if (!exited) door.receive(copy);
        });
      },
      onMessage(listener): void {
        onMessage.push(listener);
      },
      onExit(listener): void {
        onExit.push(listener);
      },
      kill(): void {
        if (exited) return;
        exited = true;
        door.kill();
        setImmediate(() => {
          for (const listener of onExit) listener(null);
        });
      }
    };
  };
  return Object.assign(spawn, { doors });
}
