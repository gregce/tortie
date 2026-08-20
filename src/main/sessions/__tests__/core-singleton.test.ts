/**
 * The core fails closed once shutdown starts (Phase 116, audit phase 0).
 *
 * House pattern from Phase 97: the test that pinned the old behaviour becomes
 * the test that pins the new one. Until this phase the first case asserted
 * that `getGmuxCore()` during a held shutdown hands back the core being torn
 * down. That was the pinned defect: for the whole snapshot window, up to
 * 8,000 ms, every mutating IPC handler could acquire the dying core and run a
 * create, a kill or a remote exec that the teardown never joined.
 *
 * What this file pins now:
 *  - acquisition during a held shutdown is REFUSED with the typed
 *    `SHUTTING_DOWN` payload, one boot only, lifecycle reads `shuttingDown`
 *  - the teardown sentence starts with the join: begin-shutdown, join,
 *    snapshot, drain, ring, dispose
 *  - a mutation admitted before shutdown is joined before the snapshot pass
 *  - the lifecycle walks its whole circle, empty to booting to ready to
 *    shuttingDown to empty, and a second cycle boots for real
 *  - a boot that fails after shutdown started leaves the state `empty`
 *  - the REAL mutators on the prototype refuse once `beginShutdown()` ran,
 *    async ones with a rejection and synchronous ones with a throw
 *
 * It is functional rather than source shape. `../core` imports cleanly
 * outside Electron, the same way `restore-status.test.ts` imports it, so
 * `GmuxCore.boot` can be replaced with a fake that records what the teardown
 * asked it to do.
 */

import type { WebContents } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import {
  coreLifecycleState,
  getGmuxCore,
  GmuxCore,
  shutdownGmuxCore
} from '../core';

/** Let queued microtasks run. */
const settle = (): Promise<void> => new Promise((r) => setImmediate(r));

/** The whole teardown sentence, in the Phase 116 order. */
const WHOLE = [
  'begin-shutdown',
  'join',
  'snapshot-start',
  'snapshot',
  'drain',
  'ring',
  'dispose'
];

/**
 * A stand-in for a booted core, holding only what the teardown touches.
 * Every step it runs is appended to `order`, so the test reads the teardown
 * as a sentence rather than as separate assertions. `hold` keeps the
 * shutdown inside the snapshot pass; `admittedWork` is what `joinAdmitted`
 * waits for, standing in for the admission ledger.
 */
function fakeCore(
  order: string[],
  hold?: Promise<void>,
  admittedWork?: Promise<void>
): { core: GmuxCore; order: string[] } {
  const core = {
    beginShutdown: (): void => {
      order.push('begin-shutdown');
    },
    joinAdmitted: async (): Promise<void> => {
      if (admittedWork !== undefined) await admittedWork;
      order.push('join');
    },
    snapshotAllSessions: async (): Promise<void> => {
      order.push('snapshot-start');
      if (hold !== undefined) await hold;
      order.push('snapshot');
    },
    captureSyncsIdle: (): Promise<void> => {
      order.push('drain');
      return Promise.resolve();
    },
    takeManifestGenerationOnQuit: (): Promise<null> => {
      order.push('ring');
      return Promise.resolve(null);
    },
    dispose: (): void => {
      order.push('dispose');
    }
  };
  return { core: core as unknown as GmuxCore, order };
}

/** The settled rejection of a promise, or null when it resolved. */
async function rejectionOf(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => null,
    (err: unknown) => err
  );
}

afterEach(async () => {
  // A failed assertion must not leave a live slot for the next file.
  await shutdownGmuxCore();
  vi.restoreAllMocks();
});

describe('the core singleton across a shutdown', () => {
  it('refuses acquisition during a held shutdown instead of handing back the dying core', async () => {
    const order: string[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = fakeCore(order, held);
    const boot = vi.spyOn(GmuxCore, 'boot').mockResolvedValue(first.core);

    await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(1);

    // The shutdown is now inside the snapshot pass and stays there.
    const shutdown = shutdownGmuxCore();
    await settle();
    expect(order).toEqual(['begin-shutdown', 'join', 'snapshot-start']);

    // This call used to hand back the core being torn down. It is refused.
    const refusal = await rejectionOf(getGmuxCore());
    expect(refusal).toBeInstanceOf(GmuxError);
    expect((refusal as GmuxError).payload.code).toBe('SHUTTING_DOWN');
    expect((refusal as GmuxError).payload.detail).toBe('getGmuxCore');
    expect(boot).toHaveBeenCalledTimes(1);
    expect(coreLifecycleState()).toBe('shuttingDown');

    release();
    await shutdown;
    expect(order).toEqual(WHOLE);

    // And the slot is empty once dispose has returned, so the next caller
    // boots for real.
    const second = fakeCore([]);
    boot.mockResolvedValue(second.core);
    const after = await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(2);
    expect(after).toBe(second.core);
  });

  it('a second caller joins the teardown in flight rather than starting one', async () => {
    const order: string[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const only = fakeCore(order, held);
    vi.spyOn(GmuxCore, 'boot').mockResolvedValue(only.core);

    await getGmuxCore();
    const a = shutdownGmuxCore();
    const b = shutdownGmuxCore();
    await settle();
    release();
    await Promise.all([a, b]);

    // One teardown, not two. A second dispose would appear here.
    expect(order).toEqual(WHOLE);
  });

  it('joins an admitted mutation before the snapshot pass begins', async () => {
    const order: string[] = [];
    let releaseMutation!: () => void;
    const mutation = new Promise<void>((resolve) => {
      releaseMutation = resolve;
    });
    const admittedWork = mutation.then(() => {
      order.push('mutation-resolved');
    });
    const only = fakeCore(order, undefined, admittedWork);
    vi.spyOn(GmuxCore, 'boot').mockResolvedValue(only.core);

    await getGmuxCore();
    const shutdown = shutdownGmuxCore();
    await settle();
    // The join is waiting on the admitted mutation. Nothing after it ran.
    expect(order).toEqual(['begin-shutdown']);

    releaseMutation();
    await shutdown;
    expect(order.indexOf('mutation-resolved')).toBeLessThan(
      order.indexOf('snapshot-start')
    );
    expect(order).toEqual([
      'begin-shutdown',
      'mutation-resolved',
      'join',
      'snapshot-start',
      'snapshot',
      'drain',
      'ring',
      'dispose'
    ]);
  });

  it('walks the whole lifecycle circle, and a second cycle boots for real', async () => {
    expect(coreLifecycleState()).toBe('empty');

    const orderA: string[] = [];
    let releaseHold!: () => void;
    const held = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    const a = fakeCore(orderA, held);
    let resolveBoot!: (core: GmuxCore) => void;
    const bootPromise = new Promise<GmuxCore>((resolve) => {
      resolveBoot = resolve;
    });
    const orderB: string[] = [];
    const b = fakeCore(orderB);
    const boot = vi
      .spyOn(GmuxCore, 'boot')
      .mockReturnValueOnce(bootPromise)
      .mockResolvedValueOnce(b.core);

    const acquiring = getGmuxCore();
    expect(coreLifecycleState()).toBe('booting');
    resolveBoot(a.core);
    await acquiring;
    expect(coreLifecycleState()).toBe('ready');

    const shutdown = shutdownGmuxCore();
    // Set synchronously, before any await, so the gate closes in the same
    // tick the quit flow starts.
    expect(coreLifecycleState()).toBe('shuttingDown');
    releaseHold();
    await shutdown;
    expect(coreLifecycleState()).toBe('empty');
    expect(orderA).toEqual(WHOLE);

    // Cycle two is real work, not a settled promise joined by accident.
    await getGmuxCore();
    expect(boot).toHaveBeenCalledTimes(2);
    expect(coreLifecycleState()).toBe('ready');
    await shutdownGmuxCore();
    expect(coreLifecycleState()).toBe('empty');
    expect(orderB).toEqual(WHOLE);
  });

  it('a boot that fails after shutdown started leaves the state empty', async () => {
    let rejectBoot!: (err: Error) => void;
    const bootPromise = new Promise<GmuxCore>((_resolve, reject) => {
      rejectBoot = reject;
    });
    vi.spyOn(GmuxCore, 'boot').mockReturnValue(bootPromise);

    const acquiring = getGmuxCore();
    expect(coreLifecycleState()).toBe('booting');
    const shutdown = shutdownGmuxCore();
    expect(coreLifecycleState()).toBe('shuttingDown');

    rejectBoot(new Error('tmux went away mid boot'));
    await expect(acquiring).rejects.toThrow('tmux went away mid boot');
    await expect(shutdown).resolves.toBeUndefined();
    expect(coreLifecycleState()).toBe('empty');
  });

  it('does nothing when no core was ever booted', async () => {
    const boot = vi.spyOn(GmuxCore, 'boot');
    await shutdownGmuxCore();
    expect(boot).not.toHaveBeenCalled();
    expect(coreLifecycleState()).toBe('empty');
  });

  it('a boot that failed leaves nothing to tear down and does not throw', async () => {
    vi.spyOn(GmuxCore, 'boot').mockRejectedValue(new Error('tmux is missing'));
    await expect(getGmuxCore()).rejects.toThrow('tmux is missing');
    await expect(shutdownGmuxCore()).resolves.toBeUndefined();
    expect(coreLifecycleState()).toBe('empty');
  });
});

/**
 * The refusal on the REAL methods, driven through the prototype seam that
 * p95-scroll-no-pane.test.ts documents. The bare core has no manifest, no
 * tmux and no exec plane, so if any body ran past the guard the test would
 * die with a TypeError instead of the typed refusal. The typed refusal
 * arriving is itself the proof that no insert, no spawn, no remote exec and
 * no boot occurred.
 */
describe('the real mutators refuse once beginShutdown ran (Phase 116)', () => {
  const REFUSAL = 'Tortie is quitting, so this action was not started.';

  function bareShuttingDownCore(): GmuxCore {
    const core = Object.create(GmuxCore.prototype) as GmuxCore;
    core.beginShutdown();
    return core;
  }

  it('the six admitted mutators reject with SHUTTING_DOWN', async () => {
    const core = bareShuttingDownCore();
    const cases: [string, Promise<unknown>][] = [
      [
        'createSession',
        core.createSession({ name: 'p116', projectPath: '/tmp', agent: 'shell' })
      ],
      ['restoreSession', core.restoreSession('p116-id')],
      [
        'renameSession',
        core.renameSession({ sessionId: 'p116-id', name: 'p116-renamed' })
      ],
      ['killSession', core.killSession('p116-id')],
      ['attachSession', core.attachSession('p116-id', {} as WebContents)],
      [
        'addRemoteProject',
        core.addRemoteProject({ machineId: 'p116-machine', path: '/tmp' })
      ]
    ];
    for (const [entry, promise] of cases) {
      const err = await rejectionOf(promise);
      expect(err).toBeInstanceOf(GmuxError);
      expect((err as GmuxError).payload.code).toBe('SHUTTING_DOWN');
      expect((err as GmuxError).payload.detail).toBe(entry);
      expect((err as GmuxError).payload.message).toBe(REFUSAL);
    }
  });

  it('the four synchronous mutators throw SHUTTING_DOWN in the same tick', () => {
    const core = bareShuttingDownCore();
    const cases: [string, () => unknown][] = [
      ['addProject', (): unknown => core.addProject('/tmp')],
      ['removeProject', (): void => core.removeProject('p116-project')],
      ['discardSession', (): void => core.discardSession('p116-id')],
      ['removeSession', (): void => core.removeSession('p116-id')]
    ];
    for (const [entry, call] of cases) {
      let thrown: unknown = null;
      try {
        call();
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(GmuxError);
      expect((thrown as GmuxError).payload.code).toBe('SHUTTING_DOWN');
      expect((thrown as GmuxError).payload.detail).toBe(entry);
      expect((thrown as GmuxError).payload.message).toBe(REFUSAL);
    }
  });
});
