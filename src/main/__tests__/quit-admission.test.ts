/**
 * Every IPC door closes the moment quit starts (Phase 144, stage 1 of the
 * 36 plan).
 *
 * Three instruments, and together with an existing guardrail they close the
 * whole surface:
 *
 *  1. UNIT, real wrapper: the one typed `handle` wrapper admits a trusted
 *     invoke while the app lifecycle reads running, and refuses it with the
 *     typed SHUTTING_DOWN payload, without calling the handler, once
 *     `markAppQuitting()` has run. The modules are imported fresh per test so
 *     the monotonic state cannot leak between cases.
 *  2. SOURCE SHAPE, the composition root: the first before-quit pass calls
 *     `markAppQuitting()` before `event.preventDefault()` and before any
 *     `await`, so admission closes synchronously with the quit gesture. This
 *     is the same instrument quit-dispose-order.test.ts uses on the disposer,
 *     for the same reason: what matters is a few lines of ordering.
 *  3. SOURCE SHAPE, the wrapper: `src/main/typed-ipc.ts` registers through
 *     exactly ONE `ipc.handle(` call site and the lifecycle check sits inside
 *     it, before the handler dispatch. Combined with guardrail 1 in
 *     src/shared/__tests__/ipc-single-bridge.test.ts, which proves nothing
 *     else in the tree calls `ipcMain.handle`, this is the gate the plan asks
 *     for: every invoke handler still goes through typed-ipc.ts, and so every
 *     one of them is behind the refusal.
 *
 * The live half of the proof is GMUX_SMOKE=quit-doors
 * (src/main/harness/quit-doors.ts), which drives four REAL mutation handlers
 * through the REAL window while the REAL quit is held open.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// The comment stripper the source scanning guardrails share. The ordering
// checks below must read code, not prose: the word "await" in a comment is
// not an await.
import { stripComments } from '../../shared/__tests__/source-scan';

const MAIN = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A fresh module registry per test: the lifecycle transition is one way on
 * purpose, so a test that flips it must not poison the next one.
 */
async function freshWorld() {
  vi.resetModules();
  const lifecycle = await import('../lifecycle');
  const typed = await import('../typed-ipc');
  const trusted = await import('../security/__tests__/trusted-test-sender');
  const errors = await import('../errors');
  return { lifecycle, typed, trusted, errors };
}

type Captured = (event: unknown, ...args: unknown[]) => unknown;

/** A fake IpcMain that captures what the wrapper registers. */
function captureIpc(): { ipc: never; get: (channel: string) => Captured } {
  const handlers = new Map<string, Captured>();
  const ipc = {
    handle: (channel: string, cb: Captured) => {
      handlers.set(channel, cb);
    }
  };
  return {
    ipc: ipc as never,
    get: (channel: string) => {
      const cb = handlers.get(channel);
      if (cb === undefined) throw new Error(`no handler for ${channel}`);
      return cb;
    }
  };
}

describe('the app lifecycle state (src/main/lifecycle.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('starts running, and markAppQuitting flips it once and for good', async () => {
    const lifecycle = await import('../lifecycle');
    expect(lifecycle.appLifecycleState()).toBe('running');
    lifecycle.markAppQuitting();
    expect(lifecycle.appLifecycleState()).toBe('quitting');
    // Idempotent, and still quitting.
    lifecycle.markAppQuitting();
    expect(lifecycle.appLifecycleState()).toBe('quitting');
  });

  it('exports no way back to running', async () => {
    const lifecycle = await import('../lifecycle');
    // The export surface is the whole contract: one sentence, one reader,
    // one forward transition. A new export that resets or reopens the state
    // must fail here and say why it exists.
    expect(Object.keys(lifecycle).sort()).toEqual([
      'APP_QUIT_REFUSAL',
      'appLifecycleState',
      'markAppQuitting'
    ]);
  });
});

describe('the one typed invoke wrapper refuses after quit starts', () => {
  it('admits a trusted invoke while running', async () => {
    const { typed, trusted } = await freshWorld();
    const { ipc, get } = captureIpc();
    const fn = vi.fn(() => undefined);
    typed.handle(ipc, 'app:quit', fn);
    get('app:quit')(trusted.trustedInvokeEvent());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('refuses with the typed SHUTTING_DOWN payload once quitting, and never calls the handler', async () => {
    const { lifecycle, typed, trusted, errors } = await freshWorld();
    const { ipc, get } = captureIpc();
    const fn = vi.fn(() => undefined);
    typed.handle(ipc, 'app:quit', fn);
    lifecycle.markAppQuitting();
    let thrown: unknown = null;
    try {
      get('app:quit')(trusted.trustedInvokeEvent());
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(errors.GmuxError);
    const payload = (thrown as InstanceType<typeof errors.GmuxError>).payload;
    expect(payload.code).toBe('SHUTTING_DOWN');
    expect(payload.message).toBe(lifecycle.APP_QUIT_REFUSAL);
    expect(payload.detail).toContain('app:quit');
    expect(fn).not.toHaveBeenCalled();
  });

  it('still refuses an untrusted sender first, quitting or not', async () => {
    const { lifecycle, typed } = await freshWorld();
    const { ipc, get } = captureIpc();
    typed.handle(ipc, 'app:quit', () => undefined);
    lifecycle.markAppQuitting();
    const stranger = {
      sender: { id: 424_242, mainFrame: {} },
      senderFrame: null
    };
    expect(() => get('app:quit')(stranger)).toThrowError(/untrusted sender/);
  });
});

describe('source shape: admission closes synchronously with the quit gesture', () => {
  const indexSrc = stripComments(readFileSync(join(MAIN, 'index.ts'), 'utf8'));
  const typedSrc = stripComments(
    readFileSync(join(MAIN, 'typed-ipc.ts'), 'utf8')
  );

  /** The before-quit handler, from registration to its own closer. */
  function beforeQuitBody(): string {
    const start = indexSrc.indexOf("app.on('before-quit'");
    expect(start, 'found the before-quit handler').toBeGreaterThan(-1);
    const stop = indexSrc.indexOf('\n});', start);
    expect(stop, 'found the end of the handler').toBeGreaterThan(start);
    return indexSrc.slice(start, stop);
  }

  it('the composition root marks quitting before preventDefault and before any await', () => {
    const body = beforeQuitBody();
    const mark = body.indexOf('markAppQuitting();');
    expect(mark, 'the handler flips the lifecycle state').toBeGreaterThan(-1);
    const prevent = body.indexOf('event.preventDefault()');
    expect(prevent, 'the handler defers the quit once').toBeGreaterThan(-1);
    expect(mark, 'the state change comes before the deferral').toBeLessThan(
      prevent
    );
    const firstAwait = body.indexOf('await');
    expect(
      firstAwait === -1 || mark < firstAwait,
      'no await sits before the state change'
    ).toBe(true);
  });

  it('the second pass is read from the same lifecycle state, not a local flag', () => {
    const body = beforeQuitBody();
    expect(body).toContain("appLifecycleState() === 'quitting'");
    expect(indexSrc).not.toContain('quitFlowStarted');
  });

  it('typed-ipc registers through one ipc.handle call and gates it on the lifecycle', () => {
    const registrations = typedSrc.match(/ipc\.handle\(/g) ?? [];
    expect(registrations).toHaveLength(1);
    const site = typedSrc.indexOf('ipc.handle(');
    const gate = typedSrc.indexOf("appLifecycleState() === 'quitting'");
    const dispatch = typedSrc.indexOf('return fn(');
    expect(gate, 'the lifecycle gate exists').toBeGreaterThan(site);
    expect(
      gate,
      'the gate sits before the handler dispatch'
    ).toBeLessThan(dispatch);
    // The refusal is the existing typed shape, not a second transport.
    expect(typedSrc).toContain("'SHUTTING_DOWN'");
    expect(typedSrc).toContain('APP_QUIT_REFUSAL');
  });
});
