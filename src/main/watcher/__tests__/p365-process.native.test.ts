/**
 * Phase 365: the watcher's one queue over REAL FSEvents (build/p365/SPEC.md
 * §4.1, §9.3), through the very path every site takes in plain Node:
 * `watchFolder` in `../host.ts`, the in-process port, the server and the queue
 * in `../process/`, and the repository's installed `@parcel/watcher` binding.
 *
 * Check type: native integration (the `*.native.test.ts` lane). It watches
 * scratch folders this file makes under the test's temporary directory and
 * nothing else. The library is the real one; a thin spy around it records
 * which folders were handed to the native subscribe and the native close, so
 * "never asked" is read rather than assumed.
 *
 * What it pins:
 *  - a watch, an event, a close, and nothing after the close;
 *  - a folder that is not there is `null`, and the native module is never
 *    asked (the existence check in the queue's turn);
 *  - a folder removed and closed at once: the close is answered at once, the
 *    queue is not held, and the native close runs only after the grace;
 *  - a folder removed, its watch closed, the folder made again and watched
 *    again: the new watch hears its events, because it joins the chain after
 *    the old one's graced close instead of joining the deleted root's
 *    stopped stream.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type * as ParcelWatcher from '@parcel/watcher';
import { canonicalPathSync } from '../../fs/folder-identity';

const spy = vi.hoisted(() => ({ subscribes: [] as string[], unsubscribes: [] as string[] }));

vi.mock('@parcel/watcher', async (importOriginal) => {
  const real = await importOriginal<typeof ParcelWatcher>();
  return {
    ...real,
    subscribe: async (
      dir: string,
      fn: ParcelWatcher.SubscribeCallback,
      opts?: ParcelWatcher.Options
    ): Promise<ParcelWatcher.AsyncSubscription> => {
      spy.subscribes.push(dir);
      const subscription = await real.subscribe(dir, fn, opts);
      return {
        unsubscribe: () => {
          spy.unsubscribes.push(dir);
          return subscription.unsubscribe();
        }
      };
    }
  };
});

const { watchFolder } = await import('../host');
const { WATCH_GONE_GRACE_MS } = await import('../process/queue');

type Seen = { type: string; path: string }[];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Write `file` every 100 ms until `seen` names it, or 10 s pass. */
async function writeUntilSeen(file: string, seen: Seen): Promise<boolean> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    writeFileSync(file, String(Date.now()));
    await sleep(100);
    if (seen.some((event) => event.path === file)) return true;
  }
  return false;
}

let scratch = '';

beforeAll(() => {
  // Canonical, because FSEvents reports canonical paths (/private/var/...).
  scratch = canonicalPathSync(mkdtempSync(join(tmpdir(), 'gmux-p365-native-')));
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('the watcher queue over real FSEvents', () => {
  it('watches, delivers an event, closes, and delivers nothing after the close', async () => {
    const dir = join(scratch, 'plain');
    mkdirSync(dir);
    const seen: Seen = [];
    const watch = await watchFolder(dir, {}, (err, events) => {
      if (err === null) seen.push(...events);
    });
    expect(watch).not.toBeNull();
    expect(watch!.dir).toBe(dir);
    expect(spy.subscribes).toContain(dir);
    expect(await writeUntilSeen(join(dir, 'a.txt'), seen)).toBe(true);
    await watch!.close();
    expect(spy.unsubscribes).toContain(dir);
    const before = seen.length;
    writeFileSync(join(dir, 'b.txt'), 'after');
    await sleep(800);
    expect(seen.length).toBe(before);
  });

  it('answers a folder that is not there with null, and never asks the native module', async () => {
    const before = spy.subscribes.length;
    const missing = join(scratch, 'never-made');
    expect(await watchFolder(missing, {}, () => undefined)).toBeNull();
    // A file is not a folder to watch either.
    const file = join(scratch, 'a-file');
    writeFileSync(file, 'x');
    expect(await watchFolder(file, {}, () => undefined)).toBeNull();
    expect(spy.subscribes.length).toBe(before);
  });

  it('answers the close of a folder removed a moment before at once, holds nothing, and closes natively after the grace', async () => {
    const gone = join(scratch, 'gone');
    const other = join(scratch, 'other');
    mkdirSync(gone);
    mkdirSync(other);
    const watch = await watchFolder(gone, {}, () => undefined);
    expect(watch).not.toBeNull();
    rmSync(gone, { recursive: true, force: true });
    const asked = Date.now();
    await watch!.close();
    expect(Date.now() - asked).toBeLessThan(WATCH_GONE_GRACE_MS / 2);
    // The queue is not held by the grace.
    const otherWatch = await watchFolder(other, {}, () => undefined);
    expect(otherWatch).not.toBeNull();
    expect(Date.now() - asked).toBeLessThan(WATCH_GONE_GRACE_MS);
    expect(spy.unsubscribes).not.toContain(gone);
    await sleep(WATCH_GONE_GRACE_MS + 600);
    expect(spy.unsubscribes).toContain(gone);
    await otherWatch!.close();
  });

  it('survives the watcher ending: one re-scan notice once the new stream started, and the same watch hears the next write', async () => {
    const { inProcessWatchersForTests } = await import('../process/in-process');
    const { WATCHER_RESTART_ERROR, watcherProcessObservation } = await import('../host');
    const dir = join(scratch, 'survivor');
    mkdirSync(dir);
    const seen: Seen = [];
    const errors: string[] = [];
    const watch = await watchFolder(dir, {}, (err, events) => {
      if (err !== null) errors.push(err.message);
      else seen.push(...events);
    });
    expect(watch).not.toBeNull();
    const restartsBefore = watcherProcessObservation().restarts;
    // An exit the host did not ask for, as a crash of the watcher process is.
    inProcessWatchersForTests().at(-1)!.kill();
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline && errors.length === 0) await sleep(50);
    expect(errors).toEqual([WATCHER_RESTART_ERROR]);
    expect(watcherProcessObservation().restarts).toBe(restartsBefore + 1);
    // Bound again through the queue: the watch the site holds still hears.
    expect(await writeUntilSeen(join(dir, 'after.txt'), seen)).toBe(true);
    expect(errors).toHaveLength(1);
    await watch!.close();
  }, 30_000);

  it('gives a folder made again, and watched again during its old watch graced close, a stream that hears it', async () => {
    const slot = join(scratch, 'slot');
    mkdirSync(slot);
    const first = await watchFolder(slot, {}, () => undefined);
    expect(first).not.toBeNull();
    rmSync(slot, { recursive: true, force: true });
    // Long enough for the FSEvents thread to see its root go and stop the stream.
    await sleep(500);
    await first!.close();
    mkdirSync(slot);
    const seen: Seen = [];
    const second = await watchFolder(slot, {}, (err, events) => {
      if (err === null) seen.push(...events);
    });
    expect(second).not.toBeNull();
    // It was bound after the old one's native close, never beside it.
    expect(spy.unsubscribes.lastIndexOf(slot)).toBeGreaterThanOrEqual(0);
    expect(await writeUntilSeen(join(slot, 'again.txt'), seen)).toBe(true);
    await second!.close();
  }, 30_000);
});
