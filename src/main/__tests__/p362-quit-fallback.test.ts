/**
 * Phase 362 — a long ⌘Q ends before the quit has saved: the 3 s fallback cut
 * the quit's own saving (build/p362/SPEC.md D1, D2, D3, and round A's W3).
 *
 * TWO MODULES ARE DRIVEN HERE, with electron mocked, the SHIPPING files and not
 * copies of them, except where a case says it reads a copy:
 *
 *   1. `requestQuit()` (src/main/menu.ts), over the REAL lifecycle module,
 *      fresh per case because its one transition never goes back, and vitest's
 *      fake timers. The mocked `app.quit()` flips that lifecycle the way
 *      `before-quit`'s first pass does. The fallback quits only a quit that has
 *      not begun (D1): with the quit begun, zero fallback `app.quit()` calls;
 *      with none begun, exactly one, at 3,000 ms. The event goes to the main
 *      window whichever window has focus, and with no main window the quit
 *      starts at once (D3).
 *   2. src/main/index.ts, imported with every one of its imports stood in for
 *      (the way p3571-quit-hardexit.test.ts imports it), so only its module
 *      scope runs. `before-quit` ends a begun quit whether the disposer
 *      resolved or threw, and only `'killed'` stops it (D2); and a Finder open
 *      or a refused second launch opens no window into a quitting app, while a
 *      window still up is shown as before (round A's W3).
 *
 * Every rule is also asked of a copy of its module with that rule taken back
 * out (the bare timer, the old target, the old `before-quit`, W3's line), read
 * from the shipping source and imported from a scratch folder with its relative
 * imports made absolute, so every stand-in still applies to it. Each copy must
 * read the defect, so each case is shown to fail without its rule. An edit that
 * no longer finds its text once fails the case.
 *
 * NOTHING HERE QUITS, OPENS A WINDOW OR SIGNALS ANYTHING: `app` and
 * `BrowserWindow` are recorders.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_QUIT_REQUESTED } from '@shared/ipc';

type Listener = (...args: unknown[]) => unknown;

/** A window as menu.ts sees it: a tag for its kind, and what its page was sent. */
interface FakeWin {
  readonly kind: 'app' | 'settings';
  destroyed: boolean;
  visible: boolean;
  readonly sent: unknown[][];
  isDestroyed(): boolean;
  isVisible(): boolean;
  webContents: { isDestroyed(): boolean; send(...args: unknown[]): void };
}

/** What the mocked process did. Hoisted: the mock factories read it. */
const h = vi.hoisted(() => ({
  quits: 0,
  order: [] as string[],
  /** Runs inside the mocked `app.quit()`: the menu cases flip the lifecycle there, as before-quit does. */
  onQuit: null as (() => void) | null,
  focused: null as unknown,
  windows: [] as unknown[],
  /** Every BrowserWindow index.ts constructed. */
  constructed: [] as { listeners: Map<string, Listener[]>; shows: number }[],
  appListeners: new Map<string, Listener[]>(),
  ready: false,
  /** What the stood-in disposer does (index.ts's `before-quit`). */
  dispose: (): Promise<string> => Promise.resolve('proceed'),
  /** Every warn line index.ts wrote, with its scope. */
  warns: [] as { scope: string; msg: string; fields: unknown }[],
  lifecycle: 'running' as 'running' | 'quitting'
}));

vi.mock('electron', () => {
  const listen = (event: string, cb: Listener): void => {
    const list = h.appListeners.get(event) ?? [];
    list.push(cb);
    h.appListeners.set(event, list);
  };
  class BrowserWindow {
    static getFocusedWindow(): unknown {
      return h.focused;
    }
    static getAllWindows(): unknown[] {
      return h.windows;
    }
    readonly listeners = new Map<string, Listener[]>();
    shows = 0;
    readonly webContents = { isDestroyed: (): boolean => false, send: (): void => undefined };
    constructor() {
      h.constructed.push(this);
      h.order.push('window.new');
    }
    on(event: string, cb: Listener): this {
      const list = this.listeners.get(event) ?? [];
      list.push(cb);
      this.listeners.set(event, list);
      return this;
    }
    once(event: string, cb: Listener): this {
      return this.on(event, cb);
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
      this.shows += 1;
    }
    focus(): void {
      return undefined;
    }
  }
  return {
    app: {
      on: listen,
      once: listen,
      quit: (): void => {
        h.quits += 1;
        h.order.push('app.quit');
        h.onQuit?.();
      },
      exit: (): void => {
        h.order.push('app.exit');
      },
      getPath: (): string => '/scratch/home',
      getVersion: (): string => '0.114.1',
      isPackaged: false,
      name: 'Tortie',
      whenReady: (): Promise<void> => new Promise<void>(() => undefined),
      isReady: (): boolean => h.ready,
      requestSingleInstanceLock: (): boolean => true,
      commandLine: { appendSwitch: (): void => undefined },
      focus: (): void => undefined,
      setAboutPanelOptions: (): void => undefined
    },
    BrowserWindow,
    Menu: {
      buildFromTemplate: (template: unknown) => ({ template }),
      setApplicationMenu: (): void => undefined,
      getApplicationMenu: (): null => null
    },
    dialog: { showErrorBox: (): void => undefined },
    ipcMain: { handle: (): void => undefined },
    session: {
      defaultSession: { flushStorageData: (): void => undefined, getStoragePath: (): null => null }
    },
    powerMonitor: { on: (): void => undefined, off: (): void => undefined }
  };
});

// menu.ts's own neighbours: the Settings window's identity is a tag here, so
// menu.ts's real targeting runs; the settings file and the rebuild door are
// kept off the person's files.
vi.mock('../settings/window', () => ({
  isSettingsWindow: (win: FakeWin | null) => win?.kind === 'settings',
  openSettingsWindow: (): void => undefined,
  closeSettingsWindowIfFocused: (): boolean => false
}));
vi.mock('../settings/store', () => ({ getSettings: () => ({ hotkeys: {} }) }));
vi.mock('../manifest/reconstruct-operator', () => ({ runOperatorReconstruction: () => Promise.resolve() }));

const MAIN = join(dirname(fileURLToPath(import.meta.url)), '..');
let copies = '';
let copyCount = 0;

beforeAll(() => {
  copies = mkdtempSync(join(tmpdir(), 'tortie-p362-quit-copy-'));
});
afterAll(() => {
  rmSync(copies, { recursive: true, force: true });
});

/**
 * Imports a copy of `src/main/<rel>` with `edits` made and its relative
 * imports made absolute, so it resolves the same modules, mocks included.
 */
async function importCopy<T>(rel: string, edits: readonly (readonly [string, string])[]): Promise<T> {
  let text = readFileSync(join(MAIN, rel), 'utf8');
  for (const [from, to] of edits) {
    expect(text.split(from).length - 1, `the ablation finds its text once: ${from}`).toBe(1);
    text = text.replace(from, () => to);
  }
  text = text.replace(/from '(\.\.?\/[^']+)'/g, (_m, spec: string) => `from '${resolve(dirname(join(MAIN, rel)), spec)}'`);
  copyCount += 1;
  const file = join(copies, `${String(copyCount)}-${basename(rel)}`);
  writeFileSync(file, text);
  return (await import(/* @vite-ignore */ file)) as T;
}

function makeWin(kind: 'app' | 'settings', opts: { visible?: boolean; destroyed?: boolean } = {}): FakeWin {
  const sent: unknown[][] = [];
  const win: FakeWin = {
    kind,
    destroyed: opts.destroyed ?? false,
    visible: opts.visible ?? true,
    sent,
    isDestroyed: () => win.destroyed,
    isVisible: () => win.visible,
    webContents: {
      isDestroyed: () => win.destroyed,
      send: (...args: unknown[]) => {
        sent.push(args);
      }
    }
  };
  return win;
}

const QUIT_EVENT = [EVT_QUIT_REQUESTED];

// ---------------------------------------------------------------------------
// 1. requestQuit(): the fallback (D1) and the target (D3)
// ---------------------------------------------------------------------------

describe('requestQuit: the 3 s fallback quits only a quit that has not begun (D1), at the main window (D3)', () => {
  type Menu = typeof import('../menu');
  let lifecycle: typeof import('../lifecycle');
  let menu: Menu;
  let main: FakeWin;
  let settings: FakeWin;

  beforeEach(async () => {
    vi.resetModules();
    lifecycle = await import('../lifecycle');
    menu = await import('../menu');
    expect(lifecycle.appLifecycleState()).toBe('running');
    h.quits = 0;
    h.order.length = 0;
    main = makeWin('app');
    settings = makeWin('settings');
    h.windows = [main, settings];
    h.focused = main;
    // What Electron's app.quit() does first: before-quit's first pass marks the quit.
    h.onQuit = () => {
      lifecycle.markAppQuitting();
    };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  }, 60_000);

  afterEach(() => {
    vi.useRealTimers();
    h.onQuit = null;
    h.windows = [];
    h.focused = null;
  });

  /** The renderer answered: its `app:quit` reached before-quit's first pass. */
  const rendererQuits = (): void => {
    lifecycle.markAppQuitting();
  };

  it('a quit that has not begun: the fallback quits once, at 3,000 ms and not before', () => {
    menu.requestQuit();
    expect(main.sent).toEqual([QUIT_EVENT]);
    vi.advanceTimersByTime(2_999);
    expect(h.quits).toBe(0);
    vi.advanceTimersByTime(1);
    expect(h.quits).toBe(1);
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(1);
  });

  it('the renderer answered at once (his everyday quit): zero fallback app.quit()', () => {
    menu.requestQuit();
    rendererQuits();
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(0);
  });

  it('the renderer answered after the first-quit message’s 1.5 s: zero fallback app.quit()', () => {
    menu.requestQuit();
    vi.advanceTimersByTime(1_500);
    rendererQuits();
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(0);
  });

  it('⌘Q again while the quit saves: the event is sent, and zero fallback app.quit()', () => {
    menu.requestQuit();
    rendererQuits();
    vi.advanceTimersByTime(1_000);
    menu.requestQuit();
    menu.requestQuit();
    expect(main.sent).toEqual([QUIT_EVENT, QUIT_EVENT, QUIT_EVENT]);
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(0);
  });

  it('a renderer that never answers, ⌘Q twice: one fallback quit, and never a second pass after it', () => {
    menu.requestQuit();
    vi.advanceTimersByTime(1_000);
    menu.requestQuit();
    vi.advanceTimersByTime(2_000);
    expect(h.quits).toBe(1);
    expect(lifecycle.appLifecycleState()).toBe('quitting');
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(1);
  });

  it('Settings focused: the event goes to the main window, not to Settings', () => {
    h.focused = settings;
    menu.requestQuit();
    expect(main.sent).toEqual([QUIT_EVENT]);
    expect(settings.sent).toEqual([]);
  });

  it('nothing focused (a harness app is never active): the main window', () => {
    h.focused = null;
    h.windows = [settings, main];
    menu.requestQuit();
    expect(main.sent).toEqual([QUIT_EVENT]);
    expect(settings.sent).toEqual([]);
  });

  it('the main window hidden, Settings in front: still the main window', () => {
    main.visible = false;
    h.focused = settings;
    menu.requestQuit();
    expect(main.sent).toEqual([QUIT_EVENT]);
    expect(settings.sent).toEqual([]);
  });

  it('only Settings open: app.quit() at once, nothing sent and no timer', () => {
    h.windows = [settings];
    h.focused = settings;
    menu.requestQuit();
    expect(h.quits).toBe(1);
    expect(settings.sent).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(1);
  });

  it('a main window torn down, or no window at all: app.quit() at once and no timer', () => {
    main.destroyed = true;
    h.focused = null;
    menu.requestQuit();
    expect(h.quits).toBe(1);
    expect(main.sent).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    h.windows = [];
    menu.requestQuit();
    expect(h.quits).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ablation: a copy with the bare timer put back cuts the begun quit (the defect)', async () => {
    const copy = await importCopy<Menu>('menu.ts', [
      ["  setTimeout(() => {\n    if (appLifecycleState() !== 'quitting') app.quit();\n  }, 3_000);", '  setTimeout(() => app.quit(), 3_000);']
    ]);
    // The renderer answered; the copy's timer still quits: before-quit's second pass.
    copy.requestQuit();
    rendererQuits();
    vi.advanceTimersByTime(3_000);
    expect(h.quits).toBe(1);
    // And ⌘Q twice with a renderer that never answers: the second timer is a second pass too.
    vi.resetModules();
    lifecycle = await import('../lifecycle');
    h.quits = 0;
    const again = await importCopy<Menu>('menu.ts', [
      ["  setTimeout(() => {\n    if (appLifecycleState() !== 'quitting') app.quit();\n  }, 3_000);", '  setTimeout(() => app.quit(), 3_000);']
    ]);
    again.requestQuit();
    vi.advanceTimersByTime(1_000);
    again.requestQuit();
    vi.advanceTimersByTime(60_000);
    expect(h.quits).toBe(2);
  });

  it('ablation: a copy with the old target sends ⌘Q from Settings to Settings, and with only Settings open waits 3 s', async () => {
    const copy = await importCopy<Menu>('menu.ts', [
      [
        '  const win = menuActionTarget();\n  if (win === null) {\n    app.quit();',
        '  const win =\n    BrowserWindow.getFocusedWindow() ??\n    BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());\n  if (!win) {\n    app.quit();'
      ]
    ]);
    h.focused = settings;
    copy.requestQuit();
    expect(settings.sent).toEqual([QUIT_EVENT]);
    expect(main.sent).toEqual([]);
    h.windows = [settings];
    copy.requestQuit();
    expect(h.quits).toBe(0);
    vi.advanceTimersByTime(3_000);
    expect(h.quits).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. src/main/index.ts: before-quit's end (D2) and no window into a quit (W3)
// ---------------------------------------------------------------------------

const noop = (): void => undefined;
const never = <T>(): Promise<T> => new Promise<T>(() => undefined);

/** A scoped logger that records warn lines, the one level D2 writes. */
const loggerFor = (scope: string): Record<string, (msg: string, fields?: unknown) => void> => ({
  info: noop,
  warn: (msg: string, fields?: unknown): void => {
    h.warns.push({ scope, msg, fields });
    h.order.push(`warn ${scope}`);
  },
  error: noop,
  debug: noop
});

/**
 * Every module src/main/index.ts imports, stood in for, so importing it runs
 * its module scope and nothing else. `./harness/launch-gate` and
 * `@shared/ipc` are pure and stay real.
 */
const INDEX_IMPORTS: readonly (readonly [string, () => Record<string, unknown>])[] = [
  [
    '../capabilities',
    () => ({
      disposeMainCapabilities: (): Promise<string> => {
        h.order.push('dispose');
        return h.dispose();
      },
      installMainCapabilities: () => (): Promise<string> => Promise.resolve('proceed')
    })
  ],
  ['../config/store', () => ({ initAgentOverlay: never })],
  ['../diagnostics/native-proof', () => ({ proveNativeModules: never })],
  ['../machines/store', () => ({ initMachines: never })],
  ['../diagnostics/process-gone', () => ({ installProcessGoneLogging: noop })],
  ['../diagnostics/milestones', () => ({ markMilestone: noop, MILESTONES: { appReady: 'a', windowShown: 'w' } })],
  ['../harness', () => ({ dispatchHarness: never })],
  ['../harness/usage-fixture', () => ({ installUsageFixture: noop })],
  ['../harness/keychain-harness', () => ({ installHarnessKeychain: noop })],
  ['../harness/vault-drive', () => ({ installVaultDrive: noop })],
  ['../harness/machine-seam', () => ({ installMachineSeam: noop })],
  ['../harness/push-seam', () => ({ installPushSeam: noop })],
  ['../harness/manifest-fault', () => ({ installManifestFault: noop })],
  ['../logins/ipc', () => ({ observeLoginsAtBoot: never, startLoginsWatch: never })],
  ['../env/watch', () => ({ startEnvWatch: noop, warmEnvAtBoot: never })],
  ['../cache/policy', () => ({ applyCachePolicy: noop })],
  [
    '../log',
    () => ({
      clearLogRunSentinel: (): void => {
        h.order.push('sentinel');
      },
      getLog: (scope: string) => loggerFor(scope),
      initLogging: noop,
      logEvent: noop,
      runLogBootSequence: noop
    })
  ],
  ['../log/crash', () => ({ startCrashCapture: noop })],
  ['../manifest/store', () => ({ isManifestStopped: () => false, manifestConnectionsLeftOpen: () => 0 })],
  [
    '../quit/storage-landing',
    () => ({ storageWritten: (): Promise<unknown> => Promise.resolve({ landing: 'settled', waitedMs: 151, moved: false }) })
  ],
  ['../log/snapshot', () => ({ collectBootEnv: never })],
  ['../notice', () => ({ postDurabilityNotice: () => true })],
  ['../assets', () => ({ registerAssetSchemePrivileged: noop })],
  ['../preview', () => ({ PREVIEW_PRIVILEGED_SCHEME: { scheme: 'gmux-preview' } })],
  ['../sessions', () => ({ getGmuxCore: never })],
  ['../migrate', () => ({ migrateUserDataIfNeeded: () => ({}), showRenameNoticeOnce: never })],
  [
    '../lifecycle',
    () => ({
      appLifecycleState: () => h.lifecycle,
      markAppQuitting: (): void => {
        h.lifecycle = 'quitting';
      }
    })
  ],
  ['../manifest/refusal', () => ({ manifestRefusal: () => null })],
  ['../db/schema-version', () => ({ isSchemaRefusal: () => false })],
  ['../notice/refusal-screen', () => ({ presentManifestRefusal: never })],
  ['../restore', () => ({ reconcileLoginItem: () => ({}) })],
  ['../security/trusted-window', () => ({ applyTrustedWindowPolicy: noop })],
  ['../tray', () => ({ installTray: noop })],
  ['../power', () => ({ installPowerHandlers: noop })],
  ['../typed-events', () => ({ broadcastEvent: noop })],
  ['../proc/identity', () => ({ applyProcessIdentity: noop })],
  ['../proc/orphans', () => ({ reapOrphanedTmuxClients: never })],
  [
    '../settings/chrome',
    () => ({ followChromeHue: noop, schemeArgsNow: () => [], windowBackgroundNow: () => '#000000' })
  ],
  [
    '../shell',
    () => ({
      nudgeRenderer: (): void => {
        h.order.push('nudge');
      },
      pickShellOpenPath: () => ({ path: null, dropped: [] }),
      setPendingShellOpen: noop
    })
  ],
  ['../shell/arrival', () => ({ resolveShellArrival: () => ({ kind: 'folder', folder: '/scratch/project' }) })],
  ['../updates/updater', () => ({ initUpdater: noop, isUpdateStaged: () => false })],
  ['../updates/self-check', () => ({ runPostUpdateSelfCheck: never })],
  ['../updates/ui', () => ({ announceRefusedInstallIfAny: never })]
];

/** The terms that make index.ts a harness launch; cleared so its branch is the person's. */
const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL', 'GMUX_PROBES'] as const;

describe('index.ts: a begun quit always ends (D2), and no window opens into it (W3)', () => {
  const savedEnv = new Map<string, string | undefined>();
  /** The listeners the shipping index.ts registered, by event. */
  let shipping = new Map<string, Listener[]>();

  /** Imports an index.ts (the shipping file or a copy) and answers the listeners it registered. */
  async function importIndex(load: () => Promise<unknown>): Promise<Map<string, Listener[]>> {
    h.appListeners.clear();
    await load();
    const mine = new Map(h.appListeners);
    h.appListeners.clear();
    return mine;
  }

  beforeAll(async () => {
    for (const term of HARNESS_TERMS) {
      savedEnv.set(term, process.env[term]);
      delete process.env[term];
    }
    vi.resetModules();
    for (const [path, factory] of INDEX_IMPORTS) vi.doMock(path, factory);
    shipping = await importIndex(() => import('../index'));
  }, 60_000);

  afterAll(() => {
    for (const [path] of INDEX_IMPORTS) vi.doUnmock(path);
    vi.resetModules();
    for (const term of HARNESS_TERMS) {
      const was = savedEnv.get(term);
      if (was === undefined) delete process.env[term];
      else process.env[term] = was;
    }
  });

  beforeEach(() => {
    h.order.length = 0;
    h.warns.length = 0;
    h.quits = 0;
    h.onQuit = null;
    h.lifecycle = 'running';
    h.ready = true;
    h.dispose = () => Promise.resolve('proceed');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Close every window a case opened, so the next case starts with none.
    for (const win of h.constructed.splice(0)) {
      for (const cb of win.listeners.get('closed') ?? []) cb();
    }
    vi.restoreAllMocks();
  });

  function only(listeners: Map<string, Listener[]>, event: string): Listener {
    const list = listeners.get(event) ?? [];
    expect(list, `one ${event} listener`).toHaveLength(1);
    return list[0]!;
  }

  /** Runs before-quit's first pass as Electron does. */
  function beforeQuit(listeners: Map<string, Listener[]>): void {
    only(listeners, 'before-quit')({
      preventDefault: (): void => {
        h.order.push('prevent');
      }
    });
  }

  /** Lets every pending promise and the next timer turn run. */
  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 25));

  /**
   * Runs `fn` with this file's own catcher of unhandled rejections in place of
   * the runner's, and answers what it caught (the old before-quit's rejection).
   */
  async function catchingRejections(fn: () => Promise<void>): Promise<unknown[]> {
    const caught: unknown[] = [];
    const theirs = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    const mine = (reason: unknown): void => {
      caught.push(reason);
    };
    process.on('unhandledRejection', mine);
    try {
      await fn();
      await settle();
    } finally {
      process.off('unhandledRejection', mine);
      for (const l of theirs) process.on('unhandledRejection', l);
    }
    return caught;
  }

  /** The Finder open, as Electron delivers it once the app has finished launching. */
  function openFile(listeners: Map<string, Listener[]>): void {
    for (const cb of listeners.get('will-finish-launching') ?? []) cb();
    const opened = h.appListeners.get('open-file') ?? [];
    h.appListeners.clear();
    expect(opened, 'one open-file listener').toHaveLength(1);
    opened[0]!({ preventDefault: noop }, '/scratch/project');
  }

  const secondLaunch = (listeners: Map<string, Listener[]>): void => {
    only(listeners, 'second-instance')({}, ['/Applications/Tortie.app/Contents/MacOS/Tortie', '--x']);
  };

  // --- D2 -------------------------------------------------------------------

  it('a disposer that rejects: app.quit() once, after one quit-scope warn line naming the error’s name only', async () => {
    h.dispose = () => Promise.reject(new TypeError('a watcher close said no, with words the log must not keep'));
    beforeQuit(shipping);
    await vi.waitFor(() => {
      expect(h.order).toContain('app.quit');
    });
    expect(h.order).toEqual(['prevent', 'dispose', 'warn quit', 'app.quit']);
    expect(h.quits).toBe(1);
    expect(h.warns).toEqual([
      {
        scope: 'quit',
        msg: 'the ordered teardown threw before it finished; quitting anyway',
        fields: { name: 'TypeError' }
      }
    ]);
    expect(JSON.stringify(h.warns)).not.toContain('watcher close');
  });

  it('a disposer that throws before it returns a promise, or rejects with no Error: app.quit() once each', async () => {
    h.dispose = () => {
      throw new RangeError('thrown at once');
    };
    beforeQuit(shipping);
    await vi.waitFor(() => {
      expect(h.quits).toBe(1);
    });
    expect(h.warns.map((w) => w.fields)).toEqual([{ name: 'RangeError' }]);
    h.lifecycle = 'running';
    h.dispose = () => Promise.reject('no Error at all');
    beforeQuit(shipping);
    await vi.waitFor(() => {
      expect(h.quits).toBe(2);
    });
    expect(h.warns.map((w) => w.fields)).toEqual([{ name: 'RangeError' }, { name: 'string' }]);
  });

  it('a disposer that answers proceed: app.quit() once and no warn line; killed: no app.quit() at all', async () => {
    beforeQuit(shipping);
    await vi.waitFor(() => {
      expect(h.quits).toBe(1);
    });
    expect(h.order).toEqual(['prevent', 'dispose', 'app.quit']);
    expect(h.warns).toEqual([]);
    h.order.length = 0;
    h.lifecycle = 'running';
    h.dispose = () => Promise.resolve('killed');
    beforeQuit(shipping);
    await settle();
    expect(h.order).toEqual(['prevent', 'dispose']);
    expect(h.quits).toBe(1);
  });

  it('the second pass lets the quit through: before-quit while quitting runs nothing', async () => {
    h.lifecycle = 'quitting';
    beforeQuit(shipping);
    await settle();
    expect(h.order).toEqual([]);
  });

  it('ablation: a copy with the old before-quit leaves a quit whose disposer rejected running, with no app.quit()', async () => {
    const copy = await importIndex(() =>
      importCopy('index.ts', [
        [
          "    let outcome: MainDisposeOutcome = 'proceed';\n    try {\n      outcome = await disposeCapabilities();\n    } catch (err) {\n      const name = err instanceof Error ? err.name : typeof err;\n      getLog('quit').warn('the ordered teardown threw before it finished; quitting anyway', { name });\n    }\n",
          '    const outcome = await disposeCapabilities();\n'
        ]
      ])
    );
    h.dispose = () => Promise.reject(new TypeError('no'));
    const caught = await catchingRejections(async () => {
      beforeQuit(copy);
      await settle();
    });
    expect(h.order).toEqual(['prevent', 'dispose']);
    expect(h.quits).toBe(0);
    expect(h.lifecycle).toBe('quitting');
    expect(caught.map((e) => (e as Error).name)).toEqual(['TypeError']);
  });

  // --- W3: no window into a quitting app ------------------------------------

  it('a Finder open while quitting, with no window up: no window is made', () => {
    h.lifecycle = 'quitting';
    openFile(shipping);
    expect(h.constructed).toHaveLength(0);
  });

  it('a refused second launch while quitting: no window is made', () => {
    h.lifecycle = 'quitting';
    secondLaunch(shipping);
    expect(h.constructed).toHaveLength(0);
  });

  it('controls: while running, a Finder open and a second launch each make the window', () => {
    openFile(shipping);
    expect(h.constructed).toHaveLength(1);
    expect(h.constructed[0]!.shows).toBe(1);
    for (const cb of h.constructed.splice(0)[0]!.listeners.get('closed') ?? []) cb();
    secondLaunch(shipping);
    expect(h.constructed).toHaveLength(1);
  });

  it('a window still up while quitting is shown again, and no second one is made', () => {
    openFile(shipping);
    expect(h.constructed).toHaveLength(1);
    h.lifecycle = 'quitting';
    openFile(shipping);
    expect(h.constructed).toHaveLength(1);
    expect(h.constructed[0]!.shows).toBe(2);
  });

  it('ablation: a copy without showAppWindow’s quitting return makes a window on a Finder open while quitting', async () => {
    const W3 = "  if (live === null && appLifecycleState() === 'quitting') return;\n";
    const copy = await importIndex(() => importCopy('index.ts', [[W3, '']]));
    h.lifecycle = 'quitting';
    openFile(copy);
    expect(h.constructed).toHaveLength(1);
    for (const win of h.constructed.splice(0)) for (const cb of win.listeners.get('closed') ?? []) cb();
    // The second launch's own quitting return still refuses it in that copy;
    // with both returns taken out, a second launch makes one too.
    secondLaunch(copy);
    expect(h.constructed).toHaveLength(0);
    const both = await importIndex(() =>
      importCopy('index.ts', [
        [W3, ''],
        [
          "    if (appLifecycleState() === 'quitting') return;\n    console.log('[gmux] a second launch was refused",
          "    console.log('[gmux] a second launch was refused"
        ]
      ])
    );
    secondLaunch(both);
    expect(h.constructed).toHaveLength(1);
  });
});
