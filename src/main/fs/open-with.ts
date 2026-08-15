/**
 * Open With (Phase 39) — which apps macOS registers for a file, and launching
 * one of them.
 *
 * ## Where the list comes from, and why it is not third party code
 *
 * The list is LaunchServices' own answer, read by spawning
 * `/usr/bin/osascript -l JavaScript -e <script> <file>`. The script calls
 * `NSWorkspace.URLsForApplicationsToOpenURL` and
 * `NSWorkspace.URLForApplicationToOpenURL` through the Objective C bridge.
 *
 * Read the `-l JavaScript` and do not reach for CLAUDE.md refusal 1. That
 * refusal forbids THIRD PARTY JavaScript executing in a Tortie process. The
 * script below is written by us, it is a string constant in this file, and it
 * runs inside an Apple binary in a separate process that Tortie spawns and
 * reaps. No third party code exists here and nothing here enters a Tortie
 * process.
 *
 * No Apple Events are sent either, so macOS asks for no automation
 * permission. The script talks to AppKit in its own process and never targets
 * another application, which is the only thing that raises the "wants access
 * to control" prompt.
 *
 * `URLsForApplicationsToOpenURL:` arrived in macOS 12.0 and Electron 43 does
 * not run below macOS 12, so there is no version branch. If a future macOS
 * withdraws the selector the script throws, osascript exits non zero, and the
 * caller takes the same degraded path as a timeout.
 *
 * ## The budget, and where it is enforced
 *
 * The menu must be built in under 150 ms. The lookup was measured at 45.6 ms
 * to 76.3 ms on an idle Mac for an extension the OS had already answered for,
 * at 206.8 ms for an extension genuinely never queried on this machine, and
 * at 323.1 ms once on a machine at load average 40. Waiting for it is
 * therefore not a design.
 *
 * There are two deadlines and they do different jobs.
 *
 *  - This one, OPEN_WITH_DEADLINE_MS, is main's. It bounds main's own answer.
 *  - OPEN_WITH_MENU_DEADLINE_MS, in src/renderer/tree/open-with.ts, is the
 *    renderer's. It is timed from before the IPC call, so the IPC round trip
 *    is inside it. That is the one the 150 ms budget is kept by.
 *
 * The budget is bounded by construction except when the event loop is
 * starved. The renderer's deadline is a timer, and a timer fires late on a
 * machine too busy to service it. Measured on 2026-08-15 across 26 readings:
 * from load average 15 to 82 it was 21 of 21 inside 150 ms, worst case
 * 136.7 ms; at load average 116 it was 2 of 5, with json at 207.5 ms, zzqq
 * at 192.1 ms and md at 154.2 ms, and those three also answered
 * 'unavailable'. Do not read either deadline as a guarantee at any load.
 *
 * Either deadline winning gives the same answer, 'unavailable', which draws
 * the degraded submenu. The lookup is NOT cancelled by either: it keeps
 * running and fills the per-extension cache, so the next right click on that
 * extension costs no spawn at all.
 *
 * ## Launching
 *
 * `/usr/bin/open` through runGuarded, with absolute paths only and no shell.
 * The app the user picked is not a child of Tortie: `open` hands the request
 * to LaunchServices and exits, so runGuarded reaping its process group can
 * never reach the app.
 */

import { appendFile, stat } from 'node:fs/promises';
import { extname, isAbsolute } from 'node:path';
import type {
  OpenWithApp,
  OpenWithApps,
  OpenWithAppsInput,
  OpenWithInput,
  OpenWithOutcome
} from '@shared/ipc';
import type { GuardedRunOptions, GuardedRunResult } from '../proc/guarded';
import { runGuarded } from '../proc/guarded';
import { resolveInsideRoot, resolveOpenProjectRoot } from './paths';

// ---------------------------------------------------------------------------
// Constants the tests assert rather than re-spell
// ---------------------------------------------------------------------------

/**
 * How long main waits for LaunchServices before it answers 'unavailable'.
 *
 * This number was 140 ms and that was wrong. The comment that sized it
 * assumed the work either side of this race cost 1 ms to 3 ms. It was
 * measured at up to 30.4 ms on a quiet machine and at 72.5 ms once under
 * load, all of it outside this deadline: the contextmenu event, the
 * component's own work, the IPC round trip in both directions and the item
 * array coming back. 140 plus 30.4 is 170.4 ms, which is outside the 150 ms
 * budget the charter set, so the old number could not deliver what it
 * claimed. A run on 2026-08-15 saw a first click return the degraded submenu
 * AND take 212.5 ms, which is the worst of both.
 *
 * 90 ms plus the worst overhead measured on a quiet machine is 120.4 ms, so
 * this number leaves about 30 ms of margin instead of none.
 *
 * This is not the only guard. The renderer runs its own deadline,
 * OPEN_WITH_MENU_DEADLINE_MS in src/renderer/tree/open-with.ts, timed from
 * before the IPC call, because the renderer is the only place that can see
 * the number the user feels. This one keeps main's own answer quick and
 * keeps the promise settling; that one is what bounds the menu.
 *
 * The cost of a smaller number is more first clicks showing the degraded
 * submenu on an extension nothing has queried yet. The backlog entry allows
 * that, the lookup is not cancelled, and the second click on that extension
 * costs no spawn at all.
 */
export const OPEN_WITH_DEADLINE_MS = 90;

/** runGuarded's own hard deadline on the osascript child. */
export const OPEN_WITH_LOOKUP_TIMEOUT_MS = 3000;

/** runGuarded's own hard deadline on the `open` child. */
export const OPEN_WITH_LAUNCH_TIMEOUT_MS = 5000;

/** The binary that answers the question. Ships with macOS. */
export const OSASCRIPT_BIN = '/usr/bin/osascript';

/** The binary that performs the launch. Ships with macOS. */
export const OPEN_BIN = '/usr/bin/open';

/**
 * The lookup, as JXA. One argument, the absolute file path. Prints one JSON
 * object on stdout and exits 0.
 *
 * A path that does not exist, and a file whose extension nothing claims, both
 * produce `{"defaultPath":null,"apps":[]}` with exit 0. Both are true
 * answers, and the caller treats them as answers rather than as errors.
 */
export const APP_LOOKUP_SCRIPT = `function run(argv) {
  ObjC.import('AppKit');
  var out = { defaultPath: null, apps: [] };
  var ws = $.NSWorkspace.sharedWorkspace;
  var fm = $.NSFileManager.defaultManager;
  var url = $.NSURL.fileURLWithPath($(argv[0]));
  var def = ws.URLForApplicationToOpenURL(url);
  if (!def.isNil()) out.defaultPath = ObjC.unwrap(def.path);
  var list = ws.URLsForApplicationsToOpenURL(url);
  if (!list.isNil()) {
    var n = parseInt(list.count, 10);
    for (var i = 0; i < n; i++) {
      var u = list.objectAtIndex(i);
      var b = $.NSBundle.bundleWithURL(u);
      var id = null;
      if (!b.isNil() && !b.bundleIdentifier.isNil()) {
        id = ObjC.unwrap(b.bundleIdentifier);
      }
      out.apps.push({
        path: ObjC.unwrap(u.path),
        name: ObjC.unwrap(fm.displayNameAtPath(u.path)),
        bundleId: id
      });
    }
  }
  return JSON.stringify(out);
}`;

// ---------------------------------------------------------------------------
// The prose the user reads on a refusal
// ---------------------------------------------------------------------------

/** The picked app is gone from disk since the menu was built. */
export const APP_MISSING_MESSAGE = 'That app is no longer on this Mac.';

/** The pick is not an application bundle at all. */
export const NOT_AN_APP_MESSAGE =
  'That is not an application. Choose a file that ends in .app.';

/** The file was deleted between the right click and the pick. */
export const FILE_MISSING_MESSAGE = 'That file is no longer there.';

/** `open` ran and refused. The stderr line is appended when there is one. */
export const LAUNCH_FAILED_MESSAGE = 'macOS refused to open the file.';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One row exactly as the script prints it, before any cleaning. */
export interface RawLookupRow {
  path: unknown;
  name: unknown;
  bundleId: unknown;
}

/** The whole script answer, before any cleaning. */
export interface RawLookup {
  defaultPath: string | null;
  rows: RawLookupRow[];
}

/** The 'ready' half of OpenWithApps, which is what the cache holds. */
export interface OpenWithReady {
  status: 'ready';
  defaultApp: OpenWithApp | null;
  apps: OpenWithApp[];
}

export interface OpenWithDeps {
  /**
   * Run a short-lived child. Production passes runGuarded, which always
   * settles and always reaps its process group.
   */
  run(
    bin: string,
    args: readonly string[],
    options: GuardedRunOptions
  ): Promise<GuardedRunResult>;
  /**
   * Absolute paths of the folders Tortie currently has open as projects. A
   * `root` that is not one of them is refused, exactly as in file-ops.ts.
   */
  listProjectRoots(): Promise<readonly string[]>;
  /**
   * True when `path` is an existing directory whose name ends in '.app'.
   * Injected so the dedupe rule and the launch refusals can be tested without
   * putting app bundles on the test machine's disk.
   */
  isAppBundle(path: string): Promise<boolean>;
  /**
   * Harness seam. When set, a launch RECORDS its argv and returns 'opened'
   * instead of spawning, so a live probe can prove the argv without starting
   * an app on the operator's machine. Null in every real run and in every
   * packaged build.
   */
  recordLaunch?: ((bin: string, args: readonly string[]) => Promise<void>) | null;
}

/**
 * Raise the system's own application panel and return the picked .app path,
 * or null when the user cancelled. Production is dialog.showOpenDialog, which
 * is NSOpenPanel, the same panel Finder raises for Open With then Other.
 *
 * It is a parameter of `open` rather than a dependency of the service because
 * the panel is parented to the window that asked, and only the IPC registrar
 * knows which window that is.
 */
export type AppChooser = () => Promise<string | null>;

export interface OpenWithService {
  /** Which apps macOS registers for this file. Never throws for a slow Mac. */
  apps(input: OpenWithAppsInput): Promise<OpenWithApps>;
  /** Launch the file with the chosen app. Reports failure, does not throw. */
  open(input: OpenWithInput, chooseApp: AppChooser): Promise<OpenWithOutcome>;
}

// ---------------------------------------------------------------------------
// Parsing, dedupe and sort — pure, so the rules are unit testable
// ---------------------------------------------------------------------------

/** Parse the script's stdout. Null when it is not the shape we asked for. */
export function parseLookup(stdout: string): RawLookup | null {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const apps = record['apps'];
  if (!Array.isArray(apps)) return null;
  const defaultPath = record['defaultPath'];
  return {
    defaultPath: typeof defaultPath === 'string' ? defaultPath : null,
    rows: apps.filter(
      (row): row is RawLookupRow => row !== null && typeof row === 'object'
    )
  };
}

/**
 * Rank a bundle path so the copy inside /Applications wins over a copy in a
 * build cache. 0 is the ordinary place for an app, 1 is everywhere else.
 */
function pathRank(path: string): number {
  if (path.startsWith('/Applications/')) return 0;
  if (path.startsWith('/System/Applications/')) return 0;
  if (path.startsWith('/System/Library/')) return 0;
  return 1;
}

/** The name to show when the bundle gave us nothing usable. */
function fallbackName(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  return base.endsWith('.app') ? base.slice(0, -4) : base;
}

/**
 * Dedupe and sort the raw rows into what the submenu draws.
 *
 * The raw list embarrasses a menu if it is shown as it arrives. On this
 * machine `.txt` came back with three separate copies of Visual Studio Code
 * and four copies of Chromium, from Playwright and Puppeteer caches and from
 * a `.vscode-test` directory. The rules, in order:
 *
 *  1. Drop a row whose path is not an existing directory ending in '.app'.
 *     LaunchServices can hold a stale registration.
 *  2. Group by bundle identifier. A row with no identifier groups by its own
 *     path, so a bundle with no identity is never merged with a stranger.
 *  3. Keep the best copy in each group: the lower path rank wins, then the
 *     shorter path.
 *  4. Take the default app out of the list, so it appears once, at the top,
 *     under its own label.
 *  5. Sort what remains by display name, case insensitive.
 *
 * Two apps with different identifiers and the same display name both survive.
 * That is what keeps "Google Chrome" and "Google Chrome for Testing" apart
 * while collapsing four copies of Chromium into one.
 */
export function normalizeLookup(
  raw: RawLookup,
  isRealApp: (path: string) => boolean
): OpenWithReady {
  const best = new Map<string, OpenWithApp>();
  /** Which group each path fell into, so the default can find its group. */
  const groupOfPath = new Map<string, string>();

  for (const row of raw.rows) {
    const path = row.path;
    if (typeof path !== 'string' || !isRealApp(path)) continue;
    const bundleId = typeof row.bundleId === 'string' ? row.bundleId : null;
    const name =
      typeof row.name === 'string' && row.name.length > 0
        ? row.name
        : fallbackName(path);
    const key = bundleId === null ? `path:${path}` : `id:${bundleId}`;
    groupOfPath.set(path, key);
    const app: OpenWithApp = { path, name, bundleId };
    const held = best.get(key);
    if (held === undefined) {
      best.set(key, app);
      continue;
    }
    const heldRank = pathRank(held.path);
    const rank = pathRank(path);
    if (rank < heldRank || (rank === heldRank && path.length < held.path.length)) {
      best.set(key, app);
    }
  }

  const defaultPath = raw.defaultPath;
  let defaultApp: OpenWithApp | null = null;
  let defaultKey: string | null = null;
  if (defaultPath !== null && isRealApp(defaultPath)) {
    // Find the default by its GROUP, not by its path. macOS can name a copy
    // in a build cache as the default while the copy in /Applications won the
    // dedupe, and matching on the path alone would then list that one app
    // twice: once at the top and once in the body of the menu.
    defaultKey = groupOfPath.get(defaultPath) ?? null;
    defaultApp = defaultKey === null ? null : (best.get(defaultKey) ?? null);
    defaultApp ??= {
      path: defaultPath,
      name: fallbackName(defaultPath),
      bundleId: null
    };
  }

  const rest: OpenWithApp[] = [];
  for (const [key, app] of best) {
    if (defaultApp !== null && (key === defaultKey || app.path === defaultApp.path)) {
      continue;
    }
    rest.push(app);
  }
  rest.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  return { status: 'ready', defaultApp, apps: rest };
}

/**
 * The cache key: the file extension, lowercased, with its dot. A file with no
 * extension gets '' and is never cached, because a bare `Makefile` and a bare
 * `LICENSE` do not resolve the same way.
 */
export function cacheKeyFor(absPath: string): string {
  return extname(absPath).toLowerCase();
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

/** One extension's place in the cache. */
interface CacheSlot {
  /** The answer, once a lookup succeeded. Null until then. */
  value: OpenWithReady | null;
  /** The lookup in flight, so two right clicks spawn one osascript. */
  inflight: Promise<OpenWithReady | null> | null;
}

/**
 * Resolve after `ms`, with an unref'd timer so a pending deadline is never the
 * reason the app or a test stays alive.
 */
function afterDeadline(ms: number): Promise<'deadline'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('deadline'), ms);
    timer.unref?.();
  });
}

export function createOpenWith(deps: OpenWithDeps): OpenWithService {
  const cache = new Map<string, CacheSlot>();

  /** Resolve + authorize the root, then prove the file is inside it. */
  async function resolveTarget(input: {
    root: unknown;
    path: unknown;
  }): Promise<string> {
    const realRoot = await resolveOpenProjectRoot(input.root, () =>
      deps.listProjectRoots()
    );
    return (await resolveInsideRoot(realRoot, input.path)).abs;
  }

  /** One osascript run. Resolves null for every failure shape. */
  async function lookup(absPath: string): Promise<OpenWithReady | null> {
    let result: GuardedRunResult;
    try {
      result = await deps.run(
        OSASCRIPT_BIN,
        ['-l', 'JavaScript', '-e', APP_LOOKUP_SCRIPT, absPath],
        { timeoutMs: OPEN_WITH_LOOKUP_TIMEOUT_MS }
      );
    } catch {
      return null;
    }
    if (result.spawnError !== null || result.timedOut || result.code !== 0) {
      return null;
    }
    const raw = parseLookup(result.stdout);
    if (raw === null) return null;

    // Ask the disk once per unique path, in parallel, then let the pure rule
    // do the rest.
    const paths = new Set<string>();
    if (raw.defaultPath !== null) paths.add(raw.defaultPath);
    for (const row of raw.rows) {
      if (typeof row.path === 'string') paths.add(row.path);
    }
    const real = new Set<string>();
    await Promise.all(
      [...paths].map(async (path) => {
        if (await deps.isAppBundle(path)) real.add(path);
      })
    );
    return normalizeLookup(raw, (path) => real.has(path));
  }

  /** Start (or join) the lookup for one cache key. */
  function lookupFor(key: string, absPath: string): Promise<OpenWithReady | null> {
    // No extension: never cached, so never coalesced either.
    if (key.length === 0) return lookup(absPath);

    let slot = cache.get(key);
    if (slot === undefined) {
      slot = { value: null, inflight: null };
      cache.set(key, slot);
    }
    if (slot.inflight !== null) return slot.inflight;

    const held = slot;
    const pending = lookup(absPath).then((answer) => {
      held.inflight = null;
      // Only a SUCCESS is cached. A timeout, a spawn error, a non zero exit or
      // unparseable output leaves the slot empty so the next right click
      // retries. An empty result from a successful lookup IS cached, because
      // "nothing claims .zzqq" is an answer.
      if (answer !== null) held.value = answer;
      return answer;
    });
    held.inflight = pending;
    return pending;
  }

  /** Validate a picked .app path and say why not in the user's words. */
  async function refuseApp(appPath: string): Promise<string | null> {
    if (!isAbsolute(appPath) || !appPath.endsWith('.app')) {
      return NOT_AN_APP_MESSAGE;
    }
    if (!(await deps.isAppBundle(appPath))) return APP_MISSING_MESSAGE;
    return null;
  }

  /** Spawn `open`, or record the argv when the harness seam is armed. */
  async function launch(args: readonly string[]): Promise<OpenWithOutcome> {
    const record = deps.recordLaunch;
    if (record !== undefined && record !== null) {
      await record(OPEN_BIN, args);
      return { status: 'opened' };
    }
    const result = await deps.run(OPEN_BIN, args, {
      timeoutMs: OPEN_WITH_LAUNCH_TIMEOUT_MS
    });
    if (result.spawnError !== null || result.timedOut || result.code !== 0) {
      const detail = result.stderr.split('\n')[0]?.trim() ?? '';
      return {
        status: 'failed',
        message: detail.length > 0 ? detail : LAUNCH_FAILED_MESSAGE
      };
    }
    return { status: 'opened' };
  }

  return {
    async apps(input: OpenWithAppsInput): Promise<OpenWithApps> {
      // The deadline covers the WHOLE answer, not only the child process.
      // Resolving the project root and proving the path is inside it both
      // touch the disk, and on the first call of a run the root lookup also
      // pulls the session core into the module graph. The budget the charter
      // set is on the menu the user sees, so it is measured from here.
      const answer = (async (): Promise<OpenWithApps> => {
        const abs = await resolveTarget(input);
        const key = cacheKeyFor(abs);
        const cached = cache.get(key)?.value;
        if (cached !== undefined && cached !== null) return cached;
        return (await lookupFor(key, abs)) ?? { status: 'unavailable' };
      })();
      // A refusal that lands after the deadline has nobody left to tell.
      answer.catch(() => undefined);

      const raced = await Promise.race([
        answer,
        afterDeadline(OPEN_WITH_DEADLINE_MS)
      ]);
      return raced === 'deadline' ? { status: 'unavailable' } : raced;
    },

    async open(
      input: OpenWithInput,
      chooseApp: AppChooser
    ): Promise<OpenWithOutcome> {
      const abs = await resolveTarget(input);
      try {
        await stat(abs);
      } catch {
        return { status: 'failed', message: FILE_MISSING_MESSAGE };
      }

      const app = input.app;
      if (app.kind === 'default') return launch([abs]);

      let appPath: string;
      if (app.kind === 'choose') {
        const picked = await chooseApp();
        if (picked === null) return { status: 'canceled' };
        appPath = picked;
      } else {
        appPath = app.appPath;
      }

      const refusal = await refuseApp(appPath);
      if (refusal !== null) return { status: 'failed', message: refusal };
      return launch(['-a', appPath, abs]);
    }
  };
}

// ---------------------------------------------------------------------------
// Production wiring
// ---------------------------------------------------------------------------

/** True when `path` is an existing directory whose name ends in '.app'. */
export async function isAppBundleOnDisk(path: string): Promise<boolean> {
  if (!path.endsWith('.app')) return false;
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * The harness seam of the live probe. `GMUX_OPEN_WITH_RECORD` names a file;
 * when it is set, a launch appends one JSON line naming the binary and the
 * argv and starts nothing. Unset in every real run and every packaged build,
 * and it is the same shape as GMUX_RECONSTRUCT_ROOT, GMUX_POWER_ROOT and
 * GMUX_CONFIG_ROOT, which already exist for exactly this reason.
 */
export function launchRecorder():
  | ((bin: string, args: readonly string[]) => Promise<void>)
  | null {
  const target = process.env['GMUX_OPEN_WITH_RECORD'];
  if (target === undefined || target.length === 0) return null;
  return async (bin, args) => {
    await appendFile(target, `${JSON.stringify({ bin, args })}\n`, 'utf8');
  };
}

/**
 * Production dependencies.
 *
 * `listProjectRoots` reads the manifest through the singleton core, so the
 * authority on "what is a project root" is the same list the tabs render
 * from. Imported lazily for the same reason file-ops.ts imports it lazily:
 * the fs channels must not drag the tmux core into the module graph at boot.
 */
export function defaultOpenWithDeps(): OpenWithDeps {
  return {
    run: (bin, args, options) => runGuarded(bin, args, options),
    listProjectRoots: async () => {
      const { getGmuxCore } = await import('../sessions');
      return (await getGmuxCore()).listProjects().map((p) => p.path);
    },
    isAppBundle: isAppBundleOnDisk,
    recordLaunch: launchRecorder()
  };
}
