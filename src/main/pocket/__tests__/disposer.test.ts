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
 * PHASE 330 adds the Funnel child's two lines, and the order between them and
 * the door's is the point: `beginFunnelShutdown()` is synchronous and before
 * the first await, beside `beginPocketShutdown()`, and `await joinFunnel()` is
 * BEFORE `await joinPocketDoor()`, so nothing on the internet is still pointed
 * at the listener while it closes. UNPUBLISHING COMES FIRST.
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

  it('shreds an open pairing window at quit (Phase 316)', () => {
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

describe('the Funnel child in the quit (Phase 330)', () => {
  const body = code(disposerBody());

  it('closes the Funnel child’s admission on the same synchronous line, before anything is awaited', () => {
    const begin = body.indexOf('beginFunnelShutdown()');
    const firstAwait = body.indexOf('await ');
    expect(begin).toBeGreaterThan(-1);
    expect(begin).toBeLessThan(firstAwait);
    expect(body.match(/beginFunnelShutdown\(\)/g) ?? []).toHaveLength(1);
  });

  it('joins the Funnel child BEFORE the door, and both before the core', () => {
    const funnel = body.indexOf('await joinFunnel()');
    const door = body.indexOf('await joinPocketDoor()');
    const core = body.indexOf('shutdownGmuxCore()');
    expect(funnel).toBeGreaterThan(-1);
    expect(funnel).toBeLessThan(door);
    expect(door).toBeLessThan(core);
    expect(body).not.toContain('void joinFunnel()');
    expect(body.match(/joinFunnel\(\)/g) ?? []).toHaveLength(1);
  });

  it('logs counts only, and nothing the child printed', () => {
    const line = body.slice(body.indexOf('await joinFunnel()'), body.indexOf('await joinPocketDoor()'));
    expect(line).toContain('funnel.children');
    expect(line).toContain('funnel.ended');
    for (const word of ['url', 'publicName', 'stdout', 'stderr', 'argv', 'command']) {
      expect(line).not.toContain(word);
    }
  });

  it('hands the door owner the wake, and composes no Funnel seam of its own', () => {
    const all = code(src);
    expect(all).toMatch(/onResume:\s*\(cb\)\s*=>\s*wakes\.onResume\(/);
    // `tailscale` and `door` are test and harness seams only (U4).
    expect(all).not.toMatch(/tailscale:\s/);
    expect(all).not.toMatch(/\bdoor:\s*inProcessDoor/);
  });
});

describe('the phone alerts in the quit (Phase 316.5)', () => {
  const body = code(disposerBody());

  it('closes the alerts’ admission on the same synchronous run as the door’s, before anything is awaited', () => {
    const begin = body.indexOf('beginPhoneAlertsShutdown()');
    const firstAwait = body.indexOf('await ');
    expect(begin).toBeGreaterThan(-1);
    expect(begin).toBeLessThan(firstAwait);
    expect(body.match(/beginPhoneAlertsShutdown\(\)/g) ?? []).toHaveLength(1);
  });

  it('joins the alerts AFTER the door and BEFORE the core, awaited and once', () => {
    const alerts = body.indexOf('await joinPhoneAlerts()');
    const door = body.indexOf('await joinPocketDoor()');
    const core = body.indexOf('shutdownGmuxCore()');
    expect(alerts).toBeGreaterThan(-1);
    expect(alerts).toBeGreaterThan(door);
    expect(alerts).toBeLessThan(core);
    expect(body).not.toContain('void joinPhoneAlerts()');
    expect(body.match(/joinPhoneAlerts\(\)/g) ?? []).toHaveLength(1);
  });

  it('composes the alerts once, after the launch step, over the door’s own wait for the core', () => {
    const all = code(src);
    expect(all.match(/createPhoneAlerts\(/g) ?? []).toHaveLength(1);
    expect(all.match(/\balerts\.rearm\(\)/g) ?? []).toHaveLength(1);
    expect(all.indexOf('alerts.rearm()')).toBeGreaterThan(all.indexOf('.openAtLaunch('));
    // ONE wait for the core, handed to both: the door never boots it and
    // neither do the alerts.
    expect(all).toMatch(/beforeOpen:\s*coreReady/);
    expect(all).toMatch(/ready:\s*coreReady/);
    expect(all).toMatch(/alerts:\s*alerts\.port/);
    // Not the push seam's engine, and no sender composed here.
    expect(all).not.toContain('createPushEngine');
    expect(all).not.toContain('createApnsSender');
  });
});
