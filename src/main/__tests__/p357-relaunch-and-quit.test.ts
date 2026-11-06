/**
 * Phase 357 — the notice's Restart and the quit after a session list stopped
 * reading correctly (build/p357/SPEC.md D12, D13, D14, §0.1 items 1 and 2).
 *
 * TWO THINGS ARE DRIVEN HERE, with electron mocked, against the SHIPPING
 * module rather than a copy of it:
 *
 *   1. `app:relaunch`, through the one typed `handle` wrapper and a trusted
 *      sender, in its three answers: nothing at all unless this run posted the
 *      `manifest-stopped` notice; a quit and never a relaunch in a harness
 *      launch, whichever of the four harness terms says so; otherwise a
 *      relaunch and then a quit, in that order.
 *   2. `disposeMainCapabilities`' last branch. It runs the WHOLE ordered
 *      disposer, which with nothing installed walks empty sets, so the branch
 *      is reached only after every other step (the tray's disposal among
 *      them). With no connection left open it answers `proceed`, as today.
 *      With a REAL store stopped while its file checked fine, which the store
 *      holds open on purpose, it clears the run sentinel, ends the process
 *      with SIGKILL (stubbed here) and answers `killed`, in that order. And
 *      on its FIRST synchronous lines, before anything is awaited, it writes
 *      the crash log's repeat counts once (D16), so that record is on disk
 *      long before either exit.
 *
 * And, read as source, that `installMainCapabilities` registers the Restart
 * exactly once, beside `app:quit`, so the handler driven here is the one a
 * window reaches.
 *
 * NOTHING HERE RELAUNCHES OR KILLS ANYTHING: `app` is a recorder and
 * `process.kill` is stubbed before the disposer runs. No window, no tmux, no
 * person's data.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** What the mocked process did, in order. Hoisted: the mock factories read it. */
const h = vi.hoisted(() => ({ order: [] as string[], userData: '', quitLines: [] as string[] }));

vi.mock('electron', () => ({
  app: {
    quit: (): void => {
      h.order.push('app.quit');
    },
    relaunch: (): void => {
      h.order.push('app.relaunch');
    },
    getPath: (): string => h.userData,
    getVersion: (): string => '0.114.0',
    on: (): void => undefined,
    once: (): void => undefined
  },
  BrowserWindow: { getAllWindows: (): unknown[] => [] },
  powerMonitor: { on: (): void => undefined, off: (): void => undefined }
}));

/** The sentinel clear, recorded so its place before the signal is read. */
vi.mock('../log', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../log')>()),
  clearLogRunSentinel: (): void => {
    h.order.push('sentinel');
  }
}));

/** The crash log's repeat counts (the crash builder's export), recorded, not written. */
vi.mock('../log/crash', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../log/crash')>()),
  flushCrashRepeats: (): void => {
    h.order.push('crash.repeats');
  }
}));

/** The tray is the disposer's last step before the branch; recorded, not run. */
vi.mock('../tray', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../tray')>()),
  disposeTray: (): void => {
    h.order.push('tray');
  }
}));

/** The quit's own stdout lines (writeSync to fd 1), caught; every other write passes. */
vi.mock('node:fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs')>();
  return {
    ...real,
    writeSync: (fd: number, data: unknown, ...rest: unknown[]): number => {
      if (fd === 1 && typeof data === 'string' && data.startsWith('[gmux] quit:')) {
        h.quitLines.push(data);
        return data.length;
      }
      return (real.writeSync as (...a: unknown[]) => number)(fd, data, ...rest);
    }
  };
});

h.userData = mkdtempSync(join(tmpdir(), 'tortie-p357-quit-'));

const { registerRelaunchIpc, disposeMainCapabilities } = await import('../capabilities');
const { postDurabilityNotice, resetDurabilityNoticesForTests } = await import('../notice');
const { trustedInvokeEvent } = await import('../security/__tests__/trusted-test-sender');
const { ManifestStore, manifestConnectionsLeftOpen, setManifestFaultHook } = await import(
  '../manifest/store'
);
const { SRC, relPath, sourceFiles, stripComments } = await import(
  '../../shared/__tests__/source-scan'
);

type Handler = (event: unknown, ...args: unknown[]) => unknown;

/** A fake IpcMain that keeps what the typed wrapper registers. */
function captured(): { ipc: never; channels: () => string[]; get: (c: string) => Handler } {
  const handlers = new Map<string, Handler>();
  return {
    ipc: { handle: (channel: string, cb: Handler) => handlers.set(channel, cb) } as never,
    channels: () => [...handlers.keys()],
    get: (channel) => {
      const cb = handlers.get(channel);
      if (cb === undefined) throw new Error(`no handler for ${channel}`);
      return cb;
    }
  };
}

/** The four harness terms `isHarnessLaunch` reads, cleared and put back around each test. */
const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL', 'GMUX_PROBES'] as const;
const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  h.order.length = 0;
  h.quitLines.length = 0;
  resetDurabilityNoticesForTests();
  for (const term of HARNESS_TERMS) {
    savedEnv.set(term, process.env[term]);
    delete process.env[term];
  }
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const term of HARNESS_TERMS) {
    const was = savedEnv.get(term);
    if (was === undefined) delete process.env[term];
    else process.env[term] = was;
  }
  setManifestFaultHook(null);
  vi.restoreAllMocks();
});

afterAll(() => {
  rmSync(h.userData, { recursive: true, force: true });
});

/** Press Restart: one invoke of the registered handler from a trusted window. */
function pressRestart(): unknown {
  const { ipc, get, channels } = captured();
  registerRelaunchIpc(ipc);
  expect(channels()).toEqual(['app:relaunch']);
  return get('app:relaunch')(trustedInvokeEvent());
}

/** Every console line written at one level, joined. */
function linesOf(spy: (...a: unknown[]) => unknown): string {
  return (spy as unknown as { mock: { calls: unknown[][] } }).mock.calls
    .map((call) => String(call[0]))
    .join('\n');
}

// ---------------------------------------------------------------------------
// The Restart (D13, D14)
// ---------------------------------------------------------------------------

describe('app:relaunch (D13, D14)', () => {
  it('does nothing at all unless this run posted the stopped list notice', () => {
    expect(pressRestart()).toBeUndefined();
    expect(h.order).toEqual([]);
    expect(linesOf(console.warn)).toContain('restart refused');
  });

  it('is not armed by any other notice', () => {
    postDurabilityNotice({ kind: 'backup-failing', detail: 'the take failed' });
    postDurabilityNotice({ kind: 'unclean-exit', newDumps: 1 });
    pressRestart();
    expect(h.order).toEqual([]);
  });

  it('relaunches and then quits, in that order, once the notice was posted', () => {
    postDurabilityNotice({ kind: 'manifest-stopped', fileFine: true });
    pressRestart();
    expect(h.order).toEqual(['app.relaunch', 'app.quit']);
    expect(linesOf(console.log)).toContain('restart asked: relaunching');
  });

  it('says the same for a damaged or unreadable file: one sentence, one restart', () => {
    postDurabilityNotice({ kind: 'manifest-stopped', fileFine: null });
    pressRestart();
    expect(h.order).toEqual(['app.relaunch', 'app.quit']);
  });

  for (const term of HARNESS_TERMS) {
    it(`a harness launch (${term}) quits and is never relaunched`, () => {
      // GMUX_PROBES counts at ANY value, `0` included, as the socket does.
      process.env[term] = term === 'GMUX_PROBES' ? '0' : '1';
      postDurabilityNotice({ kind: 'manifest-stopped', fileFine: true });
      pressRestart();
      expect(h.order).toEqual(['app.quit']);
      expect(linesOf(console.log)).toContain(
        '[gmux-quit] restart asked: a harness launch is not relaunched'
      );
    });
  }
});

// ---------------------------------------------------------------------------
// The quit's last branch (D10 to D12). ORDER MATTERS BELOW: the store's held
// list never empties, by design, so the `proceed` case runs first.
// ---------------------------------------------------------------------------

describe('disposeMainCapabilities, its last branch (D12)', () => {
  it('proceeds exactly as today when no session list connection was left open', async () => {
    const kill = vi.spyOn(process, 'kill').mockImplementation(() => true);
    expect(manifestConnectionsLeftOpen()).toBe(0);
    const outcome = disposeMainCapabilities();
    // The crash log's repeat counts are written on the disposer's first
    // synchronous lines: before this call has returned its promise (D16).
    expect(h.order).toEqual(['crash.repeats']);
    await expect(outcome).resolves.toBe('proceed');
    expect(kill).not.toHaveBeenCalled();
    expect(h.order).toEqual(['crash.repeats', 'tray']);
    expect(h.quitLines).toEqual([]);
  });

  it('with a connection left open, ends the process without closing it, after every other step', async () => {
    const dir = mkdtempSync(join(h.userData, 'manifest-'));
    const store = new ManifestStore(join(dir, 'manifest.db'));
    setManifestFaultHook((op) => {
      if (op === 'listSessions') {
        throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
      }
    });
    expect(() => store.listSessions()).toThrow();
    setManifestFaultHook(null);
    // The file checked fine, so the store holds its connection open (D10).
    expect(manifestConnectionsLeftOpen()).toBe(1);
    store.close();
    expect(manifestConnectionsLeftOpen()).toBe(1);

    const kill = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      h.order.push(`kill ${String(pid === process.pid)} ${String(signal)}`);
      return true;
    });
    await expect(disposeMainCapabilities()).resolves.toBe('killed');
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith(process.pid, 'SIGKILL');
    // The tray is the last step before the branch; the sentinel goes before
    // the signal, because the signal does not wait.
    expect(h.order).toEqual(['crash.repeats', 'tray', 'sentinel', 'kill true SIGKILL']);
    expect(h.quitLines).toEqual([
      '[gmux] quit: the session list connection stopped reading correctly and is left open; ending the process without closing it\n'
    ]);
  });
});

// ---------------------------------------------------------------------------
// The registration, read as source
// ---------------------------------------------------------------------------

describe('the Restart is registered once, beside app:quit (D13)', () => {
  const MAIN = join(__dirname, '..');
  const capabilities = readFileSync(join(MAIN, 'capabilities.ts'), 'utf8');
  /** The text with every comment blanked, so prose naming a call is not one. */
  const code = (text: string): string =>
    text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('installMainCapabilities calls registerRelaunchIpc(ipcMain) once, right after app:quit', () => {
    const start = capabilities.indexOf('export function installMainCapabilities(');
    const end = capabilities.indexOf('\n}', start);
    expect(start).toBeGreaterThan(-1);
    const install = code(capabilities.slice(start, end));
    expect(install.split('registerRelaunchIpc(ipcMain);').length - 1).toBe(1);
    const quit = install.indexOf("handle(ipcMain, 'app:quit'");
    const relaunch = install.indexOf('registerRelaunchIpc(ipcMain);');
    expect(quit).toBeGreaterThan(-1);
    expect(relaunch).toBeGreaterThan(quit);
    // Nothing but the quit's own three lines between them.
    expect(install.slice(quit, relaunch).replace(/\s+/g, ' ').trim()).toBe(
      "handle(ipcMain, 'app:quit', () => { app.quit(); });"
    );
  });

  it('nothing else in main registers it or relaunches the app', () => {
    const where = (needle: string): string[] => {
      const out: string[] = [];
      for (const file of sourceFiles(join(SRC, 'main'))) {
        const count = stripComments(readFileSync(file, 'utf8')).split(needle).length - 1;
        for (let i = 0; i < count; i += 1) out.push(relPath(file));
      }
      return out;
    };
    // The declaration and the one call in installMainCapabilities.
    expect(where('registerRelaunchIpc(')).toEqual(['main/capabilities.ts', 'main/capabilities.ts']);
    expect(where('app.relaunch(')).toEqual(['main/capabilities.ts']);
    expect(code(capabilities).split('app.relaunch(').length - 1).toBe(1);
  });
});
