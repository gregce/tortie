/**
 * The quit path awaits the two worker disposals (Phase 77, item 3).
 *
 * This is a SOURCE-SHAPE test, the same instrument
 * src/main/sessions/__tests__/end-restore-order.test.ts already uses, and for
 * the same reason. `disposeMainCapabilities` tears down a live tmux client, a
 * repo watcher, a tray and a set of guarded children, so exercising it
 * functionally here would prove the mocks rather than the product. What
 * matters is a few lines of ordering, and those are pinned cheaply.
 *
 * Until Phase 77 the two lines read `void disposeQuickOpenIpc()` and `void
 * disposeSymbolsIpc()`. Both functions are `async`, both terminate a
 * `worker_threads` Worker, and the doc header of each module shows the call
 * with `await` in front of it. A worker still terminating when
 * node::FreeEnvironment runs is the same class of pending completion Phase 36
 * measured as fatal three lines above, so the quit path now awaits them.
 *
 * What is pinned:
 *  1. Neither disposer is fired with `void` any more.
 *  2. Both are settled by one `Promise.allSettled`.
 *  3. That await sits after the watcher drain and before reapGuardedChildren,
 *     which is where the two `void` lines were.
 *  4. The wedge guard is 2,000 ms, so an edit that removes the bound, or that
 *     lets the quit hang on a worker that never answers, fails here.
 *  5. That guard's timer is cleared once the race has settled. Phase 73.1,
 *     rows 20 and 37, moved the bound from a bare `setTimeout` into the
 *     `afterMs` helper for exactly that reason, so the expectation names the
 *     helper and the `cancel()` call rather than the old inline timer.
 *
 * What is NOT pinned here, and is measured instead: the quit latency this
 * await adds. With neither surface ever opened the pair resolves in well under
 * 1 ms, because the coordinator and the service are both still null.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CAPABILITIES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'capabilities.ts'
);
const src = readFileSync(CAPABILITIES, 'utf8');

/** The body of the quit-time disposer, from its declaration to its own `}`. */
function disposerBody(): string {
  const start = src.indexOf(
    'export async function disposeMainCapabilities('
  );
  expect(start, 'found disposeMainCapabilities').toBeGreaterThan(-1);
  const stop = src.indexOf('\n}', start);
  expect(stop, 'found the end of disposeMainCapabilities').toBeGreaterThan(
    start
  );
  return src.slice(start, stop);
}

/** The same body with every run of whitespace collapsed to one space. */
function flat(body: string): string {
  return body.replace(/\s+/g, ' ');
}

describe('disposeMainCapabilities (the quit-time teardown)', () => {
  const body = disposerBody();

  it('fires neither worker disposer with void', () => {
    expect(body).not.toContain('void disposeQuickOpenIpc()');
    expect(body).not.toContain('void disposeSymbolsIpc()');
  });

  it('settles both worker disposers in one Promise.allSettled', () => {
    expect(flat(body)).toContain(
      'Promise.allSettled([disposeQuickOpenIpc(), disposeSymbolsIpc()])'
    );
  });

  it('awaits them after the watcher drain and before the child reap', () => {
    const drain = body.indexOf('drainWatcherCloses(');
    const workers = body.indexOf('disposeQuickOpenIpc()');
    const reap = body.indexOf('reapGuardedChildren()');
    expect(drain).toBeGreaterThan(-1);
    expect(workers).toBeGreaterThan(-1);
    expect(reap).toBeGreaterThan(-1);
    expect(drain).toBeLessThan(workers);
    expect(workers).toBeLessThan(reap);
  });

  // -------------------------------------------------------------------------
  // Phase 200. The three capabilities the 0.98.0 audit found outside the order
  // -------------------------------------------------------------------------

  it('joins the usage disposal and live Diagnostics in the same allSettled', () => {
    // The usage disposer is asynchronous now, so being INSIDE the allSettled
    // is what makes the quit wait for the request and the keychain child it
    // cancels. Live Diagnostics used to be ended only by the renderer's own
    // liveStop, by the subscribing window being destroyed, or by a replacement
    // start; on a quit with a visible live tab none of those is guaranteed.
    const flatBody = flat(body);
    expect(flatBody).toContain('disposeUsageService(),');
    expect(flatBody).toContain('stopLiveSampling();');
    const settle = body.indexOf('Promise.allSettled([');
    const usage = body.indexOf('disposeUsageService()');
    const live = body.indexOf('stopLiveSampling()');
    const drain = body.indexOf('drainWatcherCloses(');
    expect(settle).toBeGreaterThan(-1);
    expect(usage).toBeGreaterThan(settle);
    expect(live).toBeGreaterThan(settle);
    // Both inside the FIRST allSettled, which is the one the watcher drain
    // chains off, so the bound and the wedge guard already cover them.
    expect(usage).toBeLessThan(drain);
    expect(live).toBeLessThan(drain);
  });

  it('never fires the usage disposal with void', () => {
    // It used to be one synchronous line. A `void` in front of the
    // asynchronous one would put the quit back where the audit found it.
    expect(body).not.toContain('void disposeUsageService()');
  });

  it('bounds the wait at 2,000 ms, clears that timer, and swallows a rejection', () => {
    expect(flat(body)).toContain(
      'const workerGuard = afterMs(2_000); ' +
        'await Promise.race([ ' +
        'Promise.allSettled([disposeQuickOpenIpc(), disposeSymbolsIpc()]), ' +
        'workerGuard.wait ' +
        ']).catch(() => undefined); ' +
        'workerGuard.cancel();'
    );
  });
});
