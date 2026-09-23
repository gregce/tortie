/**
 * The door's place in the ordered disposer (Phase 313, builder A).
 *
 * A SOURCE-SHAPE test, the instrument `src/main/__tests__/quit-dispose-order.ts`
 * already uses and for the same reason: `disposeMainCapabilities` tears down a
 * live tmux client, a repo watcher, a tray and a set of guarded children, so
 * running it here would prove the mocks. What matters is three positions, and
 * each of them is one edit away from being wrong in a way no other check would
 * catch:
 *
 *  1. `beginPocketShutdown()` is SYNCHRONOUS AND BEFORE THE FIRST AWAIT. An
 *     await in front of it is a window in which a request from the tailnet is
 *     still admitted while the quit is running.
 *  2. `await joinPocketDoor()` is ABOVE `shutdownGmuxCore()`, because every
 *     route reads session truth through the core.
 *  3. It is also above `disposeOverviewIpc()`, because the turns route reads
 *     the overview store, and that store is closed in the race further down.
 *
 * And one thing that must NOT be there: nothing in the composition root opens
 * a door BY ITSELF. Since Phase 316 the door opens at launch through exactly
 * one call, the owner's `openAtLaunch`, which binds only on fields a person
 * confirmed; so `startPocketDoor` must not appear in this file at all, and the
 * owner's own `start()` is never called from it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CAPABILITIES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'capabilities.ts'
);
const src = readFileSync(CAPABILITIES, 'utf8');

/** The body of the quit-time disposer, from its declaration to its own `}`. */
function disposerBody(): string {
  const start = src.indexOf('export async function disposeMainCapabilities(');
  expect(start, 'found disposeMainCapabilities').toBeGreaterThan(-1);
  const stop = src.indexOf('\n}', start);
  expect(stop, 'found the end of disposeMainCapabilities').toBeGreaterThan(start);
  return src.slice(start, stop);
}

/** The same body with its comments gone: every assertion is an index. */
function code(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('the door in the quit', () => {
  const body = code(disposerBody());

  it('closes the door’s admission before anything is awaited', () => {
    const begin = body.indexOf('beginPocketShutdown()');
    const firstAwait = body.indexOf('await ');
    expect(begin).toBeGreaterThan(-1);
    expect(firstAwait).toBeGreaterThan(-1);
    expect(begin).toBeLessThan(firstAwait);
  });

  it('joins the door before the core and before the overview store close', () => {
    const join = body.indexOf('await joinPocketDoor()');
    const core = body.indexOf('shutdownGmuxCore()');
    const overview = body.indexOf('disposeOverviewIpc()');
    expect(join).toBeGreaterThan(-1);
    expect(core).toBeGreaterThan(-1);
    expect(overview).toBeGreaterThan(-1);
    expect(join).toBeLessThan(core);
    expect(join).toBeLessThan(overview);
  });

  it('never fires the join with void, and says each line once', () => {
    expect(body).not.toContain('void joinPocketDoor()');
    expect(body.match(/joinPocketDoor\(\)/g) ?? []).toHaveLength(1);
    expect(body.match(/beginPocketShutdown\(\)/g) ?? []).toHaveLength(1);
  });

  it('shreds an open pairing window, and the tailnet key in it, at quit (Phase 316)', () => {
    expect(body.match(/pocketHost\?\.pairing\.cancel\(\)/g) ?? []).toHaveLength(1);
    // After the door is closed, so nothing can present into a window that is
    // being shredded.
    expect(body.indexOf('pocketHost?.pairing.cancel()')).toBeGreaterThan(
      body.indexOf('await joinPocketDoor()')
    );
  });

  it('opens no door at boot except through the launch step (Phase 316)', () => {
    const all = code(src);
    expect(all).not.toContain('startPocketDoor');
    expect(all).not.toMatch(/pocketHost\??\.start\(/);
    expect(all.match(/\.openAtLaunch\(/g) ?? []).toHaveLength(1);
  });

  it('logs counts and a boolean, and nothing a request carried', () => {
    const line = body.slice(
      body.indexOf('await joinPocketDoor()'),
      body.indexOf('disposeProjectCloneIpc')
    );
    expect(line).toContain('pocket.accepted');
    expect(line).toContain('pocket.joined');
    expect(line).not.toContain('address');
    expect(line).not.toContain('fingerprint');
    expect(line).not.toContain('body');
  });
});
