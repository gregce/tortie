/**
 * A store is watched, and a sign in is seen at once (Phase 211).
 *
 * ## THE COMPLAINT THIS ANSWERS
 *
 * The operator asked on 2026-09-03: after a `/login` in a session, Tortie "does
 * not immediately update and refresh". Phase 204 observed a store only at boot
 * and in front of a `logins:list`, so a sign in was noticed the next time a
 * surface happened to ask, and never before. This watches the exact files a
 * sign in changes and runs ONE observe when one of them moves, then asks every
 * surface to redraw.
 *
 * ## fs.watch, ON THE DIRECTORY, NOT A src/main/watcher SUBSCRIPTION
 *
 * This is `node:fs`'s own `watch`, not a subscription through
 * `../watcher/`, so the FSEvents exclusion budget the app's real file watcher
 * lives under is untouched; `npm run conformance:watcher` runs anyway to prove
 * it. And it watches the DIRECTORY the file sits in rather than the file
 * itself, because a file watcher goes silent after a rename-over and a vendor
 * that writes its credential by staging-and-renaming would never be seen. The
 * event callback matches the one basename it cares about, so the directory
 * watch is as narrow as a file watch without the rename blindness.
 *
 * ## ONE OBSERVE PER BURST, AND IT WRITES NO VENDOR STORE
 *
 * The vendor rewrites its own store in bursts, being an hourly token rotation
 * for claude and several writes on one sign in, so a storm of file events
 * collapses into ONE observe: a run in flight ignores every further event and
 * a trailing event schedules exactly one more run. An observe writes only
 * Tortie's own store, so the watcher can never sign a session out; all it does
 * is keep an account and ask the surfaces to redraw.
 *
 * ## THE KEYCHAIN BACKSTOP, BY ATTRIBUTES ONLY
 *
 * On macOS a claude credential is a keychain item, and a sign in that rewrites
 * only the item moves no file, so a file watch alone would miss it. A slow poll
 * reads the item's ATTRIBUTES, never its payload, and runs an observe when the
 * attribute fingerprint moved. It is the backstop rather than the primary
 * signal: the file watch answers within a moment, and this answers within its
 * interval when nothing on disk moved.
 *
 * ## NOTHING HERE LOGS, AND NOTHING HERE COMPOSES A PAYLOAD
 *
 * The only thing this pushes outward is a request to redraw, carried by a
 * `logins:changed` event that has no payload at all. No credential, no digest,
 * no address, and no path crosses out of main because of this file.
 */

import { watch } from 'node:fs';
import { basename, dirname } from 'node:path';
import { LOGIN_PROVIDERS, type LoginProviderId } from '@shared/logins';
import {
  claudeAccountFileFor,
  claudeServicesFor,
  codexAuthFileFor
} from '../usage/login-accounts';
import { keychainAccount, keychainModified } from './security';
import { loginDirIn, loginDirOnDisk } from '../logins/dirs';
import { readLoginsFile } from '../logins/store';
import { observeProvider, type KeepDeps } from './keep';

/** How long a burst of file events is allowed to settle into one observe. */
export const WATCH_DEBOUNCE_MS = 400;

/** The floor between two observes, so a storm cannot spin them. */
export const OBSERVE_MIN_INTERVAL_MS = 5_000;

/** How often the keychain backstop reads attributes, when it runs at all. */
export const KEYCHAIN_POLL_MS = 30_000;

/** One directory to watch, and the basename inside it that matters. */
export interface WatchTarget {
  provider: LoginProviderId;
  dir: string;
  file: string;
}

/** The seams. The gate hands in fakes and opens no real watcher. */
export interface WatchDeps {
  keep: KeepDeps;
  /** Push `logins:changed` and drop any held login list. Called after an observe. */
  emitChanged(): void;
  /**
   * Open a directory watcher. The default is `node:fs`'s own `watch`; the gate
   * hands in a fake that it can fire by hand.
   */
  watchDir?(dir: string, onEvent: (file: string | null) => void): { close(): void };
  /**
   * The claude keychain attribute fingerprint, or null when there is nothing to
   * read. ATTRIBUTES ONLY: it never asks for `-w`.
   */
  keychainFingerprint?(): Promise<string | null>;
  setTimeout?(fn: () => void, ms: number): { clear(): void };
  setInterval?(fn: () => void, ms: number): { clear(): void };
  now?(): number;
}

/**
 * Every directory a sign in of any provider could change, being the vendor's
 * own location and every login Tortie made whose folder is on disk.
 *
 * IT WATCHES THE FILE'S DIRECTORY. For claude the file is `.claude.json`, whose
 * default location is `~/.claude.json`, so the directory watched for the
 * default is the home directory and the callback matches the one basename. For
 * codex the file is `auth.json`.
 */
export function watchTargetsFor(keep: KeepDeps): WatchTarget[] {
  const out: WatchTarget[] = [];
  const seen = new Set<string>();
  const add = (provider: LoginProviderId, file: string) => {
    const dir = dirname(file);
    const key = `${provider} ${dir} ${basename(file)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ provider, dir, file: basename(file) });
  };
  const stores = keep.stores;
  for (const provider of LOGIN_PROVIDERS) {
    // The default store, being the person's own location.
    add(
      provider,
      provider === 'claude'
        ? claudeAccountFileFor(stores, null)
        : codexAuthFileFor(stores, null)
    );
    for (const row of readLoginsFile(keep.root).file.logins) {
      if (row.provider !== provider) continue;
      const loginDir = loginDirIn(keep.root, provider, row.id);
      if (loginDirOnDisk(keep.root, provider, loginDir) !== 'ok') continue;
      add(
        provider,
        provider === 'claude'
          ? claudeAccountFileFor(stores, loginDir)
          : codexAuthFileFor(stores, loginDir)
      );
    }
  }
  return out;
}

/** A running credential watch. Stopping it closes every watcher it opened. */
export interface CredentialWatch {
  stop(): void;
  /** For the gate: run the debounced observe as if an event had fired. */
  poke(): void;
  /**
   * Re-derive the targets and open a watcher for every one that is new,
   * closing every one that is gone (Phase 211 fix round). A login made in
   * Settings after the boot, or promoted by an observe, has a directory that
   * did not exist when the watch started, and the first build never looked
   * again, so a sign in inside a session under it was not seen until the
   * next launch. Called after every change to the login set and after every
   * observe, and it is cheap: one file read and one stat per login.
   */
  refresh(): void;
  /** For the gate: the directories being watched right now. */
  watching(): string[];
}

/**
 * Start watching every store, running one observe per burst and asking the
 * surfaces to redraw.
 *
 * IT IS STARTED ONCE FROM THE BOOT and stopped at quit. A directory that
 * cannot be watched is skipped rather than fatal, because a home that a watcher
 * cannot open is not a reason to fail the app.
 */
export function startCredentialWatch(deps: WatchDeps): CredentialWatch {
  const now = deps.now ?? (() => Date.now());
  const openWatch = deps.watchDir ?? defaultWatchDir;
  const setT =
    deps.setTimeout ??
    ((fn, ms) => {
      const id = setTimeout(fn, ms);
      id.unref?.();
      return { clear: () => clearTimeout(id) };
    });
  const setI =
    deps.setInterval ??
    ((fn, ms) => {
      const id = setInterval(fn, ms);
      id.unref?.();
      return { clear: () => clearInterval(id) };
    });

  // ONE WATCHER PER TARGET, keyed by directory and basename, so a refresh can
  // tell a target that is new from one that is already watched.
  const watchers = new Map<string, { close(): void }>();
  const keyOf = (t: WatchTarget): string => `${t.dir}\u0000${t.file}`;
  let stopped = false;

  function refresh(): void {
    if (stopped) return;
    let targets: WatchTarget[];
    try {
      targets = watchTargetsFor(deps.keep);
    } catch {
      return;
    }
    const wanted = new Set(targets.map(keyOf));
    for (const [key, w] of watchers) {
      if (wanted.has(key)) continue;
      watchers.delete(key);
      try {
        w.close();
      } catch {
        // Already gone.
      }
    }
    for (const target of targets) {
      const key = keyOf(target);
      if (watchers.has(key)) continue;
      try {
        watchers.set(
          key,
          openWatch(target.dir, (file) => {
            // ONLY THE ONE BASENAME, so a directory watch is as narrow as a
            // file watch. A null filename is the platform not telling us which
            // file moved, and it is treated as "maybe ours".
            if (file === null || file === target.file) schedule();
          })
        );
      } catch {
        // A directory that cannot be watched is skipped, not fatal.
      }
    }
  }

  let pending = false;
  let running = false;
  // FAR ENOUGH IN THE PAST that the first burst waits only the debounce, not
  // the floor between observes. The floor exists to stop a storm spinning, not
  // to delay the first sign in Tortie sees.
  let lastRunAt = now() - OBSERVE_MIN_INTERVAL_MS;
  let timer: { clear(): void } | null = null;

  function schedule(): void {
    if (stopped) return;
    pending = true;
    if (timer !== null || running) return;
    const since = now() - lastRunAt;
    const wait = Math.max(WATCH_DEBOUNCE_MS, OBSERVE_MIN_INTERVAL_MS - since);
    timer = setT(() => {
      timer = null;
      void run();
    }, wait);
  }

  async function run(): Promise<void> {
    if (running || stopped) return;
    running = true;
    pending = false;
    lastRunAt = now();
    try {
      for (const provider of LOGIN_PROVIDERS) {
        try {
          await observeProvider(deps.keep, provider);
        } catch {
          // One provider's observe failing is not a reason to skip the redraw.
        }
      }
      // AN OBSERVE CAN MAKE A LOGIN, by promotion, so the targets are read
      // again before anybody is told, and the new directory is watched from
      // this moment rather than from the next launch.
      refresh();
      deps.emitChanged();
    } finally {
      running = false;
      // AN EVENT THAT ARRIVED DURING THE RUN gets exactly one more run, after
      // the floor, which is what collapses a storm into one observe per burst.
      if (pending && !stopped) schedule();
    }
  }

  // THE KEYCHAIN BACKSTOP, on a slow interval, by attributes only.
  let interval: { clear(): void } | null = null;
  let lastFingerprint: string | null = null;
  if (deps.keychainFingerprint !== undefined) {
    const poll = deps.keychainFingerprint;
    interval = setI(() => {
      void poll()
        .then((fingerprint) => {
          if (fingerprint === null) return;
          if (lastFingerprint === null) {
            lastFingerprint = fingerprint;
            return;
          }
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            schedule();
          }
        })
        .catch(() => undefined);
    }, KEYCHAIN_POLL_MS);
  }

  refresh();

  return {
    stop: () => {
      stopped = true;
      if (timer !== null) timer.clear();
      if (interval !== null) interval.clear();
      for (const w of watchers.values()) {
        try {
          w.close();
        } catch {
          // Already gone.
        }
      }
      watchers.clear();
    },
    poke: () => schedule(),
    refresh,
    watching: () => [...watchers.keys()].map((k) => k.slice(0, k.indexOf('\u0000')))
  };
}

/** The real directory watcher, over `node:fs`. */
function defaultWatchDir(
  dir: string,
  onEvent: (file: string | null) => void
): { close(): void } {
  const w = watch(dir, { persistent: false }, (_event, filename) => {
    onEvent(typeof filename === 'string' ? filename : null);
  });
  // A watcher error must not crash the app; the backstop still covers a store.
  w.on('error', () => undefined);
  return { close: () => w.close() };
}

/**
 * The default keychain attribute fingerprint for the claude default store, or
 * null when there is nothing to read. ATTRIBUTES ONLY, never `-w` (Phase 211).
 *
 * IT READS THE MODIFICATION DATE (fix round), because that is the attribute
 * that moves when the item is rewritten. The first build read the account
 * attribute alone, which the vendor sets to the user name and never changes on
 * a sign in, so the backstop could not see the one thing it exists for, being
 * a credential rewritten with no file moving. The account is kept in the
 * fingerprint as well, so an item replaced under another account still moves
 * it.
 */
export async function defaultKeychainFingerprint(keep: KeepDeps): Promise<string | null> {
  const stores = keep.stores;
  if (!stores.keychainForClaude) return null;
  const parts: string[] = [];
  for (const service of claudeServicesFor(stores, null)) {
    const account = await keychainAccount(stores.runner, service);
    const modified = await keychainModified(stores.runner, service);
    parts.push(`${service}=${account ?? ''}@${modified ?? ''}`);
  }
  return parts.join(' ');
}
