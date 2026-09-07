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

/**
 * The same body with its comments gone (Phase 220's fix round).
 *
 * Every ordering assertion below is an index comparison, and this file is
 * written the way the rest of the repository is: the sentence explaining WHY
 * the credential join sits above the core shutdown contains the word `await`
 * twice, so a first-await index taken over the commented text reads a comment
 * rather than a statement. Strings are left alone because no assertion here
 * looks inside one.
 */
function code(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
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

  /**
   * PHASE 220's FIX ROUND. The credentials domain's two lines, and their
   * POSITIONS, which are the whole of what they promise.
   *
   * `beginCredentialShutdown()` is worth nothing unless it is synchronous and
   * first: an await in front of it is a window in which a list, a choose, the
   * boot observe or a late watch start can still be admitted. And the join is
   * where it is because an observe reaches the manifest through the live
   * sessions seam, so a credential write must settle BEFORE `shutdownGmuxCore`
   * closes the owner it asks. Moving the join below that line left the whole
   * battery green, including the credentials gate's own disposer scanner, which
   * checked only that the two calls were there and in that function.
   */
  it('closes credential admission first and joins before the core is shut down', () => {
    const bare = code(body);
    const begin = bare.indexOf('beginCredentialShutdown()');
    const join = bare.indexOf('await joinCredentialShutdown()');
    const core = bare.indexOf('shutdownGmuxCore()');
    const firstAwait = bare.indexOf('await ');
    expect(begin).toBeGreaterThan(-1);
    expect(join).toBeGreaterThan(-1);
    expect(core).toBeGreaterThan(-1);
    expect(firstAwait).toBeGreaterThan(-1);
    // Admission closes before anything is awaited at all.
    expect(begin).toBeLessThan(firstAwait);
    // And what was accepted settles before its owners close.
    expect(join).toBeLessThan(core);
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
