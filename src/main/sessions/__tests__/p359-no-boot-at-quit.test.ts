/**
 * Phase 359 — a second session core boots while Tortie quits
 * (build/p359/SPEC.md §4.1: D1, D2, D4, D6).
 *
 * THE DEFECT. The quit's one `shutdownGmuxCore()` empties the core's slot and
 * sets its lifecycle back to `empty` (Phases 77 and 116 left the slot open on
 * purpose, so a harness can boot again in one process), and the quit runs on
 * after it. A window's blur, a sleep or a wake, a Live Diagnostics tick and a
 * startup the quit overtook each asked `getGmuxCore()` there and booted a
 * second core inside the quitting process, one nothing disposed. At the parent
 * that core quarantined and put back a damaged session list with nobody told,
 * rewrote the sessions table after the quit generation and spent a backup
 * generation (build/p359/SPEC.md §0.1, §2.1).
 *
 * WHAT IS PINNED. Once the app is quitting, `getGmuxCore()` boots nothing: with
 * the slot empty it gives the typed `SHUTTING_DOWN` refusal Phase 116 already
 * gives during the shutdown. A core already in the slot, ready or still
 * booting, is handed back as before. The check reads the app's one-way quit
 * flag (src/main/lifecycle.ts), so a harness cycle, which never marks the app
 * quitting, still boots twice. And a startup the quit refused says so in the
 * boot log instead of `core boot failed`.
 *
 * EVERY CASE DRIVES THE SHIPPING MODULES, FRESH: `vi.resetModules()` and a new
 * import of `../core` and `../../lifecycle` per case, because the quit flag's
 * one transition never goes back. The one thing replaced is `GmuxCore.boot`,
 * by a spy whose stand-in core records every step it is asked for, so each
 * boot is counted and each teardown reads as one sentence. The stand-in has a
 * `joinHookShutdown`, the teardown's last step, so a teardown that ended
 * through the shutdown's own catch would read short. No tmux, no manifest, no
 * window, no file of anybody's.
 *
 *   1. the defect closed: boot, quit, shutdown, then every ask refuses and
 *      boots nothing;
 *   2. the running core is handed back while the quit runs (D2);
 *   3. a boot in flight at the press is joined, then disposed once; and (3b)
 *      the same with the quit's shutdown begun while that boot is held;
 *   4. a quit before startup asked: nothing boots at all;
 *   5. a boot that failed is not retried in a quit; and (5b) nor is one that
 *      was in flight at the press and failed after it;
 *   6. the harness cycle: no quit flag, two real boots;
 *   7. the power door, over the drivable monitor with src/main/index.ts's
 *      three deps copied as text: (a) a suspend and a resume after the quit's
 *      shutdown boot nothing and the power log carries the refusal; (b) a
 *      suspend and a resume after the press and BEFORE the shutdown still
 *      reach the running core (no regression); (c) the copy is compared with
 *      index.ts's own text, so it cannot drift unnoticed;
 *   8. the ablation: a copy of core.ts with D1's check and its import taken
 *      out boots a second core in the drives of cases 1, 4 and 7a, and the
 *      harness cycle still boots twice; the same copy with nothing taken out
 *      refuses exactly as the shipping file does, so the copy is faithful and
 *      the difference is the check;
 *   9. the startup line (D4): src/main/index.ts imported with every module it
 *      imports stood in for (the electron-free ones excepted) and its startup
 *      run against a REAL core: a quit before startup asked logs
 *      `the session core was not started, because Tortie is quitting` once,
 *      at info, and no `core boot failed`; any other failure still logs
 *      `core boot failed`; and a copy without the branch logs the quit as a
 *      failed boot.
 *
 * UNHANDLED REJECTIONS FAIL THE FILE (vitest's default), which is how
 * "quietly" is read: every door answers the refusal through a catch it has.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { gmuxErrorPayloadOf } from '../../errors';
import type { PowerHandlerDeps } from '../../power';
import type { DrivableMonitor } from '../../power/drivable-monitor';
import type { GmuxCore } from '../core';

type CoreModule = typeof import('../core');
type LifecycleModule = typeof import('../../lifecycle');
type ErrorsModule = typeof import('../../errors');

/** The modules one case drives, imported fresh for it, all of one generation. */
interface Fresh {
  readonly core: CoreModule;
  readonly lifecycle: LifecycleModule;
  readonly errors: ErrorsModule;
}

/** `src/main`. */
const MAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The one refusal sentence (core.ts's SHUTDOWN_REFUSAL; lifecycle.ts says the same). */
const REFUSAL = 'Tortie is quitting, so this action was not started.';

/** The startup line D4 adds to src/main/index.ts, word for word. */
const QUIT_LINE = 'the session core was not started, because Tortie is quitting';

/** Lets every pending promise and the next timer turn run. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 25));

/** The core module the running case drives, shut down after it whatever happened. */
let current: CoreModule | null = null;

let copies = '';
let copyCount = 0;

beforeAll(() => {
  copies = mkdtempSync(join(tmpdir(), 'tortie-p359-core-copy-'));
});

afterAll(() => {
  rmSync(copies, { recursive: true, force: true });
});

afterEach(async () => {
  // A failed assertion must not leave a live slot behind it.
  await current?.shutdownGmuxCore();
  current = null;
  vi.restoreAllMocks();
});

/** Asserts the fresh generation starts where a launch starts. */
function started(gen: Fresh): Fresh {
  current = gen.core;
  expect(gen.lifecycle.appLifecycleState()).toBe('running');
  expect(gen.core.coreLifecycleState()).toBe('empty');
  return gen;
}

/** The shipping core, lifecycle and errors, imported fresh. */
async function fresh(): Promise<Fresh> {
  vi.resetModules();
  const lifecycle = await import('../../lifecycle');
  const core = await import('../core');
  const errors = await import('../../errors');
  return started({ core, lifecycle, errors });
}

/**
 * Writes a copy of `src/main/<rel>` with `edits` made (each must find its text
 * exactly once) and its relative imports made absolute, so it resolves the
 * very modules the shipping file does, stand-ins included. Answers its path.
 * (p362-quit-fallback.test.ts's `importCopy`, copied, split in two so one copy
 * can be imported fresh more than once.)
 */
function writeCopy(rel: string, edits: readonly (readonly [string, string])[]): string {
  let text = readFileSync(join(MAIN, rel), 'utf8');
  for (const [from, to] of edits) {
    expect(text.split(from).length - 1, `the ablation finds its text once: ${from}`).toBe(1);
    text = text.replace(from, () => to);
  }
  text = text.replace(
    /from '(\.\.?\/[^']+)'/g,
    (_m, spec: string) => `from '${resolve(dirname(join(MAIN, rel)), spec)}'`
  );
  copyCount += 1;
  const file = join(copies, `${String(copyCount)}-${basename(rel)}`);
  writeFileSync(file, text);
  return file;
}

/** A copy of core.ts, imported fresh with the shipping lifecycle and errors. */
async function freshCopy(file: string): Promise<Fresh> {
  vi.resetModules();
  const lifecycle = await import('../../lifecycle');
  const core = (await import(/* @vite-ignore */ file)) as CoreModule;
  const errors = await import('../../errors');
  return started({ core, lifecycle, errors });
}

/** Every step the quit's one shutdown runs, in Phase 116's order, the hook server's join last. */
const TEARDOWN = [
  'begin-shutdown',
  'join',
  'snapshot:app-quit',
  'drain',
  'ring',
  'dispose',
  'join-hook'
] as const;

/** The whole teardown of the stand-in named `tag`. */
const whole = (tag: string): string[] => TEARDOWN.map((step) => `${tag}:${step}`);

/**
 * A stand-in for a booted core, holding only what the shutdown and the power
 * handlers ask of it (core-singleton.test.ts's `fakeCore` shape, written again
 * here, plus `joinHookShutdown` and the two power calls). Every step is
 * appended to `order` under its tag.
 */
function standIn(order: string[], tag: string): GmuxCore {
  const at = (step: string): void => {
    order.push(`${tag}:${step}`);
  };
  const core = {
    beginShutdown: (): void => at('begin-shutdown'),
    joinAdmitted: async (): Promise<void> => at('join'),
    snapshotAllSessions: async (reason?: string): Promise<void> =>
      at(`snapshot:${reason ?? 'app-quit'}`),
    captureSyncsIdle: async (): Promise<void> => at('drain'),
    takeManifestGenerationOnQuit: async (): Promise<null> => {
      at('ring');
      return null;
    },
    dispose: (): void => at('dispose'),
    joinHookShutdown: async (): Promise<void> => at('join-hook'),
    takeManifestGenerationOnSuspend: async (): Promise<null> => {
      at('suspend-generation');
      return null;
    },
    scheduleRefresh: (): void => at('refresh')
  };
  return core as unknown as GmuxCore;
}

/** Spies `GmuxCore.boot`: each boot appends `boot core<n>` and hands back stand-in `core<n>`. */
function countBoots(core: CoreModule, order: string[]) {
  let n = 0;
  return vi.spyOn(core.GmuxCore, 'boot').mockImplementation(async () => {
    n += 1;
    const tag = `core${String(n)}`;
    order.push(`boot ${tag}`);
    return standIn(order, tag);
  });
}

/** The settled rejection of a promise, or null when it resolved. */
async function rejectionOf(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => null,
    (err: unknown) => err
  );
}

/** The refusal `getGmuxCore()` gives, Phase 116's own: typed, the one sentence, detail `getGmuxCore`. */
function expectRefusal(gen: Fresh, err: unknown): void {
  expect(err, 'getGmuxCore() refused').toBeInstanceOf(gen.errors.GmuxError);
  expect(gmuxErrorPayloadOf(err)).toEqual({
    code: 'SHUTTING_DOWN',
    message: REFUSAL,
    detail: 'getGmuxCore'
  });
}

// ---------------------------------------------------------------------------
// 1 to 6: the slot, once the quit has begun (D1, D2)
// ---------------------------------------------------------------------------

describe('getGmuxCore() boots no core once the quit has begun (D1, D2)', () => {
  it('1. the defect closed: after the quit’s shutdown every ask refuses with SHUTTING_DOWN and boots nothing', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);

    await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    await gen.core.shutdownGmuxCore();
    expect(order).toEqual(['boot core1', ...whole('core1')]);
    expect(gen.core.coreLifecycleState()).toBe('empty');

    // The parent booted `core2` here, inside the quitting process.
    const first = gen.core.getGmuxCore();
    const second = gen.core.getGmuxCore();
    // Each refusal is its own: a refusal never fills the slot.
    expect(second).not.toBe(first);
    const [a, b] = await Promise.all([rejectionOf(first), rejectionOf(second)]);
    expectRefusal(gen, a);
    expectRefusal(gen, b);
    expect(boot).toHaveBeenCalledTimes(1);
    expect(gen.core.coreLifecycleState()).toBe('empty');

    // Nothing is left for a shutdown to do: the slot stayed empty.
    await gen.core.shutdownGmuxCore();
    expect(order).toEqual(['boot core1', ...whole('core1')]);
  });

  it('2. the running core is handed back while the quit runs, and the quit’s one shutdown disposes it', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);

    const running = await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    // The disposer's steps before shutdownGmuxCore() ask for it, and get it.
    expect(await gen.core.getGmuxCore()).toBe(running);
    expect(await gen.core.getGmuxCore()).toBe(running);
    expect(gen.core.coreLifecycleState()).toBe('ready');
    expect(boot).toHaveBeenCalledTimes(1);

    await gen.core.shutdownGmuxCore();
    expect(order).toEqual(['boot core1', ...whole('core1')]);
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).toHaveBeenCalledTimes(1);
  });

  it('3. a boot in flight at the press is joined, not doubled, and disposed once', async () => {
    const gen = await fresh();
    const order: string[] = [];
    let finishBoot!: (core: GmuxCore) => void;
    const held = new Promise<GmuxCore>((resolve) => {
      finishBoot = resolve;
    });
    const boot = vi.spyOn(gen.core.GmuxCore, 'boot').mockImplementation(() => {
      order.push('boot core1');
      return held;
    });

    const startup = gen.core.getGmuxCore();
    expect(gen.core.coreLifecycleState()).toBe('booting');
    gen.lifecycle.markAppQuitting();
    const joined = gen.core.getGmuxCore();
    expect(joined).toBe(startup);

    const core1 = standIn(order, 'core1');
    finishBoot(core1);
    expect(await startup).toBe(core1);
    expect(await joined).toBe(core1);
    expect(gen.core.coreLifecycleState()).toBe('ready');

    await gen.core.shutdownGmuxCore();
    expect(order).toEqual(['boot core1', ...whole('core1')]);
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).toHaveBeenCalledTimes(1);
  });

  it('3b. the quit’s shutdown begun while that boot is still held joins it, disposes it once, and boots nothing after', async () => {
    const gen = await fresh();
    const order: string[] = [];
    let finishBoot!: (core: GmuxCore) => void;
    const held = new Promise<GmuxCore>((resolve) => {
      finishBoot = resolve;
    });
    const boot = vi.spyOn(gen.core.GmuxCore, 'boot').mockImplementation(() => {
      order.push('boot core1');
      return held;
    });

    const startup = gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    const shutdown = gen.core.shutdownGmuxCore();
    expect(gen.core.coreLifecycleState()).toBe('shuttingDown');
    // Phase 116's refusal, the function's first statement, during the shutdown.
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));

    const core1 = standIn(order, 'core1');
    finishBoot(core1);
    expect(await startup).toBe(core1);
    await shutdown;
    expect(order).toEqual(['boot core1', ...whole('core1')]);
    expect(gen.core.coreLifecycleState()).toBe('empty');
    // Phase 359's refusal, after it.
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).toHaveBeenCalledTimes(1);
  });

  it('4. a quit pressed before startup asked: the ask refuses and nothing boots at all', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);

    gen.lifecycle.markAppQuitting();
    // The disposer's shutdown returns at once: no boot was ever asked.
    await gen.core.shutdownGmuxCore();
    expect(gen.core.coreLifecycleState()).toBe('empty');

    // Startup's first ask (src/main/index.ts), reached after the quit began.
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).not.toHaveBeenCalled();
    expect(order).toEqual([]);
    expect(gen.core.coreLifecycleState()).toBe('empty');
  });

  it('5. a boot that failed is not retried in a quit', async () => {
    const gen = await fresh();
    const boot = vi
      .spyOn(gen.core.GmuxCore, 'boot')
      .mockRejectedValue(new Error('tmux is missing'));

    await expect(gen.core.getGmuxCore()).rejects.toThrow('tmux is missing');
    expect(gen.core.coreLifecycleState()).toBe('empty');
    gen.lifecycle.markAppQuitting();

    // Outside a quit this call retries (the "Try again" path); in one it refuses.
    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).toHaveBeenCalledTimes(1);
    expect(gen.core.coreLifecycleState()).toBe('empty');
  });

  it('5b. nor is a boot that was in flight at the press and failed after it', async () => {
    const gen = await fresh();
    let failBoot!: (err: Error) => void;
    const held = new Promise<GmuxCore>((_resolve, reject) => {
      failBoot = reject;
    });
    const boot = vi.spyOn(gen.core.GmuxCore, 'boot').mockReturnValue(held);

    const startup = gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    expect(gen.core.getGmuxCore()).toBe(startup);
    failBoot(new Error('tmux went away mid boot'));
    await expect(startup).rejects.toThrow('tmux went away mid boot');
    expect(gen.core.coreLifecycleState()).toBe('empty');

    expectRefusal(gen, await rejectionOf(gen.core.getGmuxCore()));
    expect(boot).toHaveBeenCalledTimes(1);
  });

  it('6. the harness cycle: with no quit flag, boot, shutdown, boot, shutdown boots twice, each teardown whole', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);

    const a = await gen.core.getGmuxCore();
    await gen.core.shutdownGmuxCore();
    expect(gen.core.coreLifecycleState()).toBe('empty');
    const b = await gen.core.getGmuxCore();
    expect(b).not.toBe(a);
    expect(gen.core.coreLifecycleState()).toBe('ready');
    await gen.core.shutdownGmuxCore();

    expect(boot).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['boot core1', ...whole('core1'), 'boot core2', ...whole('core2')]);
    expect(gen.lifecycle.appLifecycleState()).toBe('running');
    expect(gen.core.coreLifecycleState()).toBe('empty');
  });
});

// ---------------------------------------------------------------------------
// 7: the power door (D3), over the shipping handlers and the drivable monitor
// ---------------------------------------------------------------------------

/**
 * The marker comments around the copy below. Each is built in two pieces here
 * so the joined text occurs in this file exactly once, at the marker itself.
 */
const COPY_BEGINS = '// --- the copy of src/main/index.ts' + '’s power deps begins ---';
const COPY_ENDS = '// --- the copy of src/main/index.ts' + '’s power deps ends ---';

/**
 * The three deps src/main/index.ts hands `installPowerHandlers({…})` (its
 * lines 778 to 807 at this phase), copied as TEXT because that file cannot be
 * imported here without its whole startup. One line is left out:
 * `broadcastEvent(EVT_POWER_RESUME)`, the first statement of `onResume`, which
 * reaches windows. Case 7c compares the copy with index.ts's text.
 */
function powerDeps(getGmuxCore: () => Promise<GmuxCore>, monitor: DrivableMonitor): PowerHandlerDeps {
  return {
    monitor,
    // --- the copy of src/main/index.ts’s power deps begins ---
    captureAll: async () => {
      const core = await getGmuxCore();
      await core.snapshotAllSessions('system-sleep');
    },
    takeManifestGeneration: async () => {
      const core = await getGmuxCore();
      const result = await core.takeManifestGenerationOnSuspend();
      if (result === null) return 'unchanged';
      return result.ok ? 'taken' : 'failed';
    },
    onResume: () => {
      void getGmuxCore()
        .then((core) => core.scheduleRefresh())
        .catch(() => undefined);
    }
    // --- the copy of src/main/index.ts’s power deps ends ---
  };
}

/** Comments dropped and white space folded, so two spellings of one text compare equal. */
const folded = (text: string): string =>
  text
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The power scope's console lines by level (src/main/log writes info to console.log and warn to console.warn). */
function powerLines(): { info: string[]; warn: string[] } {
  const info: string[] = [];
  const warn: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
    if (String(line).startsWith('[gmux-power] ')) info.push(String(line));
  });
  vi.spyOn(console, 'warn').mockImplementation((line?: unknown) => {
    if (String(line).startsWith('[gmux-power] ')) warn.push(String(line));
  });
  return { info, warn };
}

/** Waits for the suspend's own closing line, which the handler writes once both steps settled. */
async function suspendFinished(lines: { info: string[] }): Promise<void> {
  await vi.waitFor(
    () => {
      expect(
        lines.info.some((l) =>
          l.includes('suspend: the capture and the manifest generation both finished')
        )
      ).toBe(true);
    },
    { timeout: 5_000 }
  );
}

/** The shipping power handlers over a drivable monitor, wired to `gen`'s core with index.ts's deps. */
async function installPower(gen: Fresh): Promise<DrivableMonitor> {
  const { installPowerHandlers } = await import('../../power');
  const { drivableMonitor } = await import('../../power/drivable-monitor');
  const monitor = drivableMonitor();
  installPowerHandlers(powerDeps(gen.core.getGmuxCore, monitor));
  return monitor;
}

describe('7. the power door: a sleep or a wake during the quit (D3)', () => {
  it('7a. after the quit’s shutdown, a suspend and a resume boot nothing, and the power log carries the refusal', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);
    const lines = powerLines();
    const monitor = await installPower(gen);

    await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    await gen.core.shutdownGmuxCore();

    // The parent booted a second core here, captured on it and asked it for
    // a suspend generation (build/p359/SPEC.md §2.1).
    monitor.fire('suspend');
    await suspendFinished(lines);
    monitor.fire('resume');
    await settle();

    expect(boot).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['boot core1', ...whole('core1')]);
    expect(gen.core.coreLifecycleState()).toBe('empty');
    expect(lines.warn).toHaveLength(2);
    expect(lines.warn[0]).toContain('[gmux-power] suspend capture failed: ');
    expect(lines.warn[1]).toContain('[gmux-power] suspend: taking a manifest generation failed: ');
    for (const line of lines.warn) expect(line).toContain('"code":"SHUTTING_DOWN"');
    expect(
      lines.info.filter((l) =>
        l.includes('suspend: no manifest generation was taken, and the warning above names the reason')
      )
    ).toHaveLength(1);
    expect(
      lines.info.some((l) => l.includes('took a manifest generation') || l.includes('has not changed'))
    ).toBe(false);
    // The resume runs its handler and answers the refusal through its catch.
    expect(lines.info.some((l) => l.includes('resume: clearing the terminal glyph atlas'))).toBe(true);
  });

  it('7b. no regression: after the press and BEFORE the shutdown, a suspend captures on the running core and asks it for a suspend generation, and a resume reaches it', async () => {
    const gen = await fresh();
    const order: string[] = [];
    const boot = countBoots(gen.core, order);
    const lines = powerLines();
    const monitor = await installPower(gen);

    await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    // A lid closed right after ⌘Q, while the disposer's early joins run.
    monitor.fire('suspend');
    await suspendFinished(lines);
    monitor.fire('resume');
    await settle();

    expect(order).toEqual([
      'boot core1',
      'core1:snapshot:system-sleep',
      'core1:suspend-generation',
      'core1:refresh'
    ]);
    expect(boot).toHaveBeenCalledTimes(1);
    expect(lines.warn).toEqual([]);
    expect(
      lines.info.some((l) =>
        l.includes('suspend: the manifest has not changed, so no generation was taken')
      )
    ).toBe(true);

    // And the quit's one shutdown then disposes that same core.
    await gen.core.shutdownGmuxCore();
    expect(order.slice(4)).toEqual(whole('core1'));
    expect(boot).toHaveBeenCalledTimes(1);
  });

  it('7c. the copied deps are src/main/index.ts’s own, word for word but the one broadcast', () => {
    const index = readFileSync(join(MAIN, 'index.ts'), 'utf8');
    const call = '  installPowerHandlers({\n';
    expect(index.split(call).length - 1, 'index.ts calls installPowerHandlers once').toBe(1);
    const start = index.indexOf(call);
    const end = index.indexOf('\n  });\n', start);
    expect(end).toBeGreaterThan(start);
    const shipped = folded(index.slice(start, end + '\n  });'.length));

    const mine = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    expect(mine.split(COPY_BEGINS).length - 1).toBe(1);
    expect(mine.split(COPY_ENDS).length - 1).toBe(1);
    const copy = folded(
      mine.slice(mine.indexOf(COPY_BEGINS) + COPY_BEGINS.length, mine.indexOf(COPY_ENDS))
    );

    const broadcast = 'broadcastEvent(EVT_POWER_RESUME); ';
    expect(shipped.split(broadcast).length - 1, 'the one line the copy leaves out').toBe(1);
    expect(shipped.replace(broadcast, '')).toBe(`installPowerHandlers({ ${copy} });`);
  });
});

// ---------------------------------------------------------------------------
// 8: the ablation, a copy of core.ts with D1 taken out
// ---------------------------------------------------------------------------

describe('8. the ablation: a copy of core.ts with D1’s check and its import taken out', () => {
  const D1_IMPORT = "import { appLifecycleState } from '../lifecycle';\n";
  const D1_CHECK =
    "    if (appLifecycleState() === 'quitting') {\n" +
    "      return Promise.reject(shutdownRefusal('getGmuxCore'));\n" +
    '    }\n';

  /** The copy with nothing taken out (the control) and the copy without D1, written once each. */
  let control = '';
  let ablated = '';

  beforeAll(() => {
    control = writeCopy('sessions/core.ts', []);
    ablated = writeCopy('sessions/core.ts', [
      [D1_IMPORT, ''],
      [D1_CHECK, '']
    ]);
  });

  /** Case 1's drive: boot, quit, shutdown, then ask. Answers the boots and what the ask got. */
  async function afterTheShutdown(gen: Fresh): Promise<{ boots: number; asked: unknown }> {
    const order: string[] = [];
    const boot = countBoots(gen.core, order);
    const first = await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    await gen.core.shutdownGmuxCore();
    const asked = await gen.core.getGmuxCore().then(
      (core) => {
        expect(core).not.toBe(first);
        return core;
      },
      (err: unknown) => err
    );
    return { boots: boot.mock.calls.length, asked };
  }

  /** Case 4's drive: quit, shutdown, then startup's ask. */
  async function beforeStartup(gen: Fresh): Promise<{ boots: number; asked: unknown }> {
    const boot = countBoots(gen.core, []);
    gen.lifecycle.markAppQuitting();
    await gen.core.shutdownGmuxCore();
    const asked = await gen.core.getGmuxCore().then(
      (core) => core,
      (err: unknown) => err
    );
    return { boots: boot.mock.calls.length, asked };
  }

  it('control: the copy with nothing taken out refuses in every drive, exactly as the shipping file does', async () => {
    const one = await freshCopy(control);
    const r1 = await afterTheShutdown(one);
    expect(r1.boots).toBe(1);
    expectRefusal(one, r1.asked);
    await one.core.shutdownGmuxCore();

    const four = await freshCopy(control);
    const r4 = await beforeStartup(four);
    expect(r4.boots).toBe(0);
    expectRefusal(four, r4.asked);
  });

  it('without D1, case 1’s drive boots TWICE and hands back a second core inside the quit (the defect)', async () => {
    const gen = await freshCopy(ablated);
    const r = await afterTheShutdown(gen);
    expect(r.boots).toBe(2);
    expect(gen.errors.gmuxErrorPayloadOf(r.asked)).toBeNull();
    expect(r.asked).toBeTypeOf('object');
    // A core nobody's shutdown will dispose: the quit's one shutdown already ran.
    expect(gen.core.coreLifecycleState()).toBe('ready');
  });

  it('without D1, case 4’s drive boots the core a quit before startup refused', async () => {
    const gen = await freshCopy(ablated);
    const r = await beforeStartup(gen);
    expect(r.boots).toBe(1);
    expect(gen.errors.gmuxErrorPayloadOf(r.asked)).toBeNull();
    expect(gen.core.coreLifecycleState()).toBe('ready');
  });

  it('without D1, case 7a’s suspend after the shutdown boots a second core and captures on it, as the parent did', async () => {
    const gen = await freshCopy(ablated);
    const order: string[] = [];
    const boot = countBoots(gen.core, order);
    const lines = powerLines();
    const monitor = await installPower(gen);

    await gen.core.getGmuxCore();
    gen.lifecycle.markAppQuitting();
    await gen.core.shutdownGmuxCore();
    monitor.fire('suspend');
    await suspendFinished(lines);

    expect(boot).toHaveBeenCalledTimes(2);
    expect(order).toEqual([
      'boot core1',
      ...whole('core1'),
      'boot core2',
      'core2:snapshot:system-sleep',
      'core2:suspend-generation'
    ]);
    expect(lines.warn).toEqual([]);
  });

  it('and without D1 the harness cycle still boots twice, as it does with it (case 6)', async () => {
    for (const file of [ablated, control]) {
      const gen = await freshCopy(file);
      const order: string[] = [];
      const boot = countBoots(gen.core, order);
      await gen.core.getGmuxCore();
      await gen.core.shutdownGmuxCore();
      await gen.core.getGmuxCore();
      await gen.core.shutdownGmuxCore();
      expect(boot).toHaveBeenCalledTimes(2);
      expect(order).toEqual(['boot core1', ...whole('core1'), 'boot core2', ...whole('core2')]);
    }
  });
});

// ---------------------------------------------------------------------------
// 9: the startup line (D4), over src/main/index.ts with its imports stood in for
// ---------------------------------------------------------------------------

describe('9. the startup line (D4): a startup the quit refused says so, and not “core boot failed”', () => {
  /** The terms that make index.ts a harness launch; cleared so its branch is the person's. */
  const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL', 'GMUX_PROBES'] as const;
  const savedEnv = new Map<string, string | undefined>();

  /**
   * How many times startup asks for the core (src/main/index.ts, lines 623,
   * 654 and 694 at this phase). A new ask must answer the refusal through a
   * catch of its own, so a change in the number is a reason to read it.
   */
  const STARTUP_ASKS = 3;
  const STARTUP_ASKS_WHY =
    'startup asks for the core three times; a new ask must answer the quit’s refusal through a catch';

  /** The D4 branch, exactly as src/main/index.ts holds it, for the ablated copy. */
  const D4_BRANCH =
    '    // PHASE 359. A quit pressed before startup asked for the core: getGmuxCore()\n' +
    '    // refuses to boot one in a quitting app, which is the quit, not a failure.\n' +
    "    if (isGmuxError(err, 'SHUTTING_DOWN')) {\n" +
    `      bootLog.info('${QUIT_LINE}');\n` +
    '      return;\n' +
    '    }\n';

  /** What the stood-in modules saw during the one index.ts import a case makes. */
  const seen = {
    lines: [] as { scope: string; level: string; msg: string }[],
    asks: 0,
    done: false
  };
  /** The real generation the stood-in `getGmuxCore` and lifecycle forward to. */
  let real: Fresh | null = null;

  const noop = (): void => undefined;
  const never = <T>(): Promise<T> => new Promise<T>(() => undefined);
  const logger = (scope: string): Record<string, (msg: string) => void> => {
    const at =
      (level: string) =>
      (msg: string): void => {
        seen.lines.push({ scope, level, msg });
      };
    return { error: at('error'), warn: at('warn'), info: at('info'), debug: at('debug') };
  };
  const realGen = (): Fresh => {
    if (real === null) throw new Error('no real generation for this case');
    return real;
  };

  /** Electron as index.ts uses it: `whenReady` resolves, so the startup runs. */
  const electronStandIn = (): Record<string, unknown> => {
    class BrowserWindow {
      static getFocusedWindow(): null {
        return null;
      }
      static getAllWindows(): unknown[] {
        return [];
      }
      readonly webContents = { isDestroyed: (): boolean => false, send: noop };
      on(): this {
        return this;
      }
      once(): this {
        return this;
      }
      loadFile(): Promise<void> {
        return Promise.resolve();
      }
      loadURL(): Promise<void> {
        return Promise.resolve();
      }
      isDestroyed(): boolean {
        return false;
      }
      isMinimized(): boolean {
        return false;
      }
      restore(): void {
        return undefined;
      }
      show(): void {
        return undefined;
      }
      focus(): void {
        return undefined;
      }
    }
    return {
      app: {
        on: noop,
        once: noop,
        quit: noop,
        exit: noop,
        focus: noop,
        getPath: (): string => '/scratch/p359/home',
        isPackaged: false,
        name: 'Tortie',
        whenReady: (): Promise<void> => Promise.resolve(),
        isReady: (): boolean => true,
        requestSingleInstanceLock: (): boolean => true,
        commandLine: { appendSwitch: noop }
      },
      BrowserWindow,
      dialog: { showErrorBox: noop },
      ipcMain: { handle: noop },
      session: { defaultSession: { flushStorageData: noop, getStoragePath: (): null => null } }
    };
  };

  /**
   * Every module src/main/index.ts imports, stood in for, by its path from this
   * file (p362-quit-fallback.test.ts's list, written again here), so importing
   * it runs its module scope and its startup and nothing else. Three are real:
   * `./errors` (D4 reads it), `./harness/launch-gate` and `@shared/ipc`, all
   * pure. `./sessions` forwards each ask to the case's REAL core, and
   * `./lifecycle` is that core's own lifecycle, as in production they share
   * one; `./updates/updater`'s `initUpdater`, startup's last call, marks the
   * startup done.
   */
  const STAND_INS: readonly (readonly [string, () => Record<string, unknown>])[] = [
    [
      '../../capabilities',
      () => ({
        disposeMainCapabilities: (): Promise<string> => Promise.resolve('proceed'),
        installMainCapabilities: () => (): Promise<string> => Promise.resolve('proceed')
      })
    ],
    ['../../config/store', () => ({ initAgentOverlay: never })],
    [
      '../../diagnostics/native-proof',
      () => ({ proveNativeModules: () => Promise.resolve({ ok: true, detail: 'p359 stand-in' }) })
    ],
    ['../../machines/store', () => ({ initMachines: never })],
    ['../../diagnostics/process-gone', () => ({ installProcessGoneLogging: noop })],
    [
      '../../diagnostics/milestones',
      () => ({ markMilestone: noop, MILESTONES: { appReady: 'a', windowShown: 'w' } })
    ],
    ['../../harness', () => ({ dispatchHarness: () => Promise.resolve(false) })],
    ['../../harness/usage-fixture', () => ({ installUsageFixture: noop })],
    ['../../harness/keychain-harness', () => ({ installHarnessKeychain: noop })],
    ['../../harness/vault-drive', () => ({ installVaultDrive: noop })],
    ['../../harness/machine-seam', () => ({ installMachineSeam: noop })],
    ['../../harness/push-seam', () => ({ installPushSeam: noop })],
    ['../../harness/manifest-fault', () => ({ installManifestFault: noop })],
    ['../../logins/ipc', () => ({ observeLoginsAtBoot: never, startLoginsWatch: never })],
    ['../../env/watch', () => ({ startEnvWatch: noop, warmEnvAtBoot: never })],
    ['../../cache/policy', () => ({ applyCachePolicy: noop })],
    [
      '../../log',
      () => ({
        clearLogRunSentinel: noop,
        getLog: logger,
        initLogging: noop,
        logEvent: noop,
        runLogBootSequence: noop
      })
    ],
    ['../../log/crash', () => ({ startCrashCapture: noop })],
    [
      '../../manifest/store',
      () => ({ isManifestStopped: () => false, manifestConnectionsLeftOpen: () => 0 })
    ],
    ['../../quit/storage-landing', () => ({ storageWritten: never })],
    ['../../log/snapshot', () => ({ collectBootEnv: never })],
    ['../../notice', () => ({ postDurabilityNotice: () => true })],
    ['../../assets', () => ({ registerAssetSchemePrivileged: noop })],
    ['../../preview', () => ({ PREVIEW_PRIVILEGED_SCHEME: { scheme: 'gmux-preview' } })],
    [
      '../../sessions',
      () => ({
        getGmuxCore: (): Promise<GmuxCore> => {
          seen.asks += 1;
          return realGen().core.getGmuxCore();
        }
      })
    ],
    [
      '../../migrate',
      () => ({ migrateUserDataIfNeeded: () => ({}), showRenameNoticeOnce: never })
    ],
    [
      '../../lifecycle',
      () => ({
        appLifecycleState: () => realGen().lifecycle.appLifecycleState(),
        markAppQuitting: (): void => realGen().lifecycle.markAppQuitting()
      })
    ],
    ['../../manifest/refusal', () => ({ manifestRefusal: () => null })],
    ['../../db/schema-version', () => ({ isSchemaRefusal: () => false })],
    ['../../notice/refusal-screen', () => ({ presentManifestRefusal: never })],
    ['../../restore', () => ({ reconcileLoginItem: () => ({}) })],
    ['../../security/trusted-window', () => ({ applyTrustedWindowPolicy: noop })],
    ['../../tray', () => ({ installTray: noop })],
    ['../../power', () => ({ installPowerHandlers: () => noop })],
    ['../../typed-events', () => ({ broadcastEvent: noop })],
    ['../../proc/identity', () => ({ applyProcessIdentity: noop })],
    ['../../proc/orphans', () => ({ reapOrphanedTmuxClients: never })],
    [
      '../../settings/chrome',
      () => ({ followChromeHue: noop, schemeArgsNow: () => [], windowBackgroundNow: () => '#000000' })
    ],
    [
      '../../shell',
      () => ({
        nudgeRenderer: noop,
        pickShellOpenPath: () => ({ path: null, dropped: [] }),
        setPendingShellOpen: noop
      })
    ],
    ['../../shell/arrival', () => ({ resolveShellArrival: () => ({ kind: 'refused', reason: 'p359' }) })],
    [
      '../../updates/updater',
      () => ({
        initUpdater: (): void => {
          seen.done = true;
        },
        isUpdateStaged: () => false
      })
    ],
    ['../../updates/self-check', () => ({ runPostUpdateSelfCheck: never })],
    ['../../updates/ui', () => ({ announceRefusedInstallIfAny: never })]
  ];

  beforeAll(() => {
    for (const term of HARNESS_TERMS) {
      savedEnv.set(term, process.env[term]);
      delete process.env[term];
    }
  });

  afterAll(() => {
    for (const term of HARNESS_TERMS) {
      const was = savedEnv.get(term);
      if (was === undefined) delete process.env[term];
      else process.env[term] = was;
    }
  });

  /**
   * Imports index.ts (`load`) with every stand-in in place and `gen` behind the
   * core and the lifecycle, waits until its startup has run to its last call,
   * then takes every stand-in away again, so the next case imports real modules.
   */
  async function startupOver(gen: Fresh, load: () => Promise<unknown>): Promise<void> {
    seen.lines.length = 0;
    seen.asks = 0;
    seen.done = false;
    real = gen;
    vi.spyOn(console, 'log').mockImplementation(noop);
    vi.doMock('electron', electronStandIn);
    for (const [path, factory] of STAND_INS) vi.doMock(path, factory);
    try {
      vi.resetModules();
      await load();
      await vi.waitFor(
        () => {
          expect(seen.done, 'the startup ran to its last call').toBe(true);
        },
        { timeout: 10_000 }
      );
      // The startup catch runs a turn after the ask it catches.
      await settle();
    } finally {
      vi.doUnmock('electron');
      for (const [path] of STAND_INS) vi.doUnmock(path);
      vi.resetModules();
    }
  }

  /** The boot scope's lines, level and words. */
  const bootLines = (): { level: string; msg: string }[] =>
    seen.lines.filter((l) => l.scope === 'boot').map(({ level, msg }) => ({ level, msg }));

  it('9a. a quit pressed before startup asked: the startup’s three asks boot nothing, and the boot log says the quit once, at info', async () => {
    const gen = await fresh();
    const boot = countBoots(gen.core, []);
    gen.lifecycle.markAppQuitting();
    // The disposer's shutdown, which returns at once: nothing was booted.
    await gen.core.shutdownGmuxCore();

    await startupOver(gen, () => import('../../index'));

    expect(seen.asks, STARTUP_ASKS_WHY).toBe(STARTUP_ASKS);
    expect(boot).not.toHaveBeenCalled();
    expect(bootLines()).toEqual([{ level: 'info', msg: QUIT_LINE }]);
    expect(seen.lines.some((l) => l.msg.includes('core boot failed'))).toBe(false);
    expect(gen.core.coreLifecycleState()).toBe('empty');
  }, 30_000);

  it('9b. control: a boot that fails for any other reason still logs core boot failed, at error, once', async () => {
    const gen = await fresh();
    const boot = vi
      .spyOn(gen.core.GmuxCore, 'boot')
      .mockRejectedValue(new Error('tmux is missing'));

    await startupOver(gen, () => import('../../index'));

    expect(seen.asks, STARTUP_ASKS_WHY).toBe(STARTUP_ASKS);
    expect(boot).toHaveBeenCalledTimes(1);
    expect(bootLines()).toEqual([{ level: 'error', msg: 'core boot failed: tmux is missing' }]);
  }, 30_000);

  it('9c. ablation: a copy of index.ts without the branch logs the quit as a failed boot, at error', async () => {
    const copy = writeCopy('index.ts', [[D4_BRANCH, '']]);
    const gen = await fresh();
    const boot = countBoots(gen.core, []);
    gen.lifecycle.markAppQuitting();

    await startupOver(gen, () => import(/* @vite-ignore */ copy));

    expect(seen.asks, STARTUP_ASKS_WHY).toBe(STARTUP_ASKS);
    expect(boot).not.toHaveBeenCalled();
    const lines = bootLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]?.level).toBe('error');
    expect(lines[0]?.msg).toMatch(/^core boot failed: /);
    expect(lines[0]?.msg).toContain('"code":"SHUTTING_DOWN"');
    expect(seen.lines.some((l) => l.msg === QUIT_LINE)).toBe(false);
  }, 30_000);
});
