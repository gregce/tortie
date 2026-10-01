/**
 * The phone alerts, composed for a person (Phase 316.5, build/p3165/SPEC.md
 * §5.1): Phase 314's engine and sender, built for the first time outside a
 * harness, and the Apple push key's port for Settings then Phone.
 *
 * ## Why it is here and not in `../push/`
 *
 * `conformance:push` W1 holds that `src/main/push/` names the credentials and
 * pocket domains by type only, and a composition needs both by value (the
 * key's store, the door's destinations). So it lives beside the push, as
 * `../sessions/fold-wiring.ts` lives beside the fold, and the push stays pure.
 *
 * ## INERT UNTIL A PERSON TURNS ALERTS ON AND CONFIRMS
 *
 * The one question is the door's own `PocketHost.pushDestinations()`, which is
 * `[]` unless the alerts switch is on, the door's fields are the ones a person
 * confirmed, and a paired phone holds a live device token. While it is empty
 * NOTHING is composed: no core is waited for, no feed is subscribed, no key is
 * read, no sender and no engine exist. {@link PhoneAlerts.rearm} puts one step
 * on this module's own serial chain (the 316.1 queue's shape: one tail, and a
 * failed step never stops the next), and the step asks that question again:
 *
 *   - WANTED AND NOT COMPOSED: wait for the core through the door's own
 *     `beforeOpen` (`deps.ready`, which waits for the first window and never
 *     boots the core itself), ASK AGAIN (a Remove may have landed while it
 *     waited), then build ONE sender and ONE engine, subscribe the one blocked
 *     feed, and observe once, which SEEDS SILENTLY: a session already waiting
 *     when the alerts arm is never announced (314 E6).
 *   - NOT WANTED AND COMPOSED: unsubscribe, close the engine's admission, and
 *     join it, which closes the sender.
 *   - Otherwise nothing.
 *
 * The host asks again on every change it broadcasts (`PocketAlertsPort.
 * changed`), so a person who never turned alerts on pays one
 * `pushDestinations()` per change, which returns on its first line.
 *
 * ## The one sender, and where it may dial
 *
 * `origin` is Apple's host for EACH TOKEN'S environment (`apnsOrigin`, the one
 * place either host is spelled), and `allowRemote` is `!isHarnessLaunch(...)`,
 * the one site in `src/` that passes it (`conformance:push` H2). So a person's
 * launch reaches `api.push.apple.com` or its sandbox by the token, and a
 * harness launch can reach only the loopback stand-in its override names; with
 * no override the sender refuses Apple before any socket.
 *
 * ## What it never does
 *
 * It never names the session core's getter (`conformance:push` P1), so it can
 * never be the thing that boots it. It logs a fixed line when it arms or
 * disarms, and the engine's own sentence, and NEVER a key, a token, a payload
 * or a word of an alert (`conformance:push` G1).
 */

import { BrowserWindow, app, dialog, type OpenDialogOptions, type WebContents } from 'electron';
import type { PocketBlockedRow, PocketPushKeyResult } from '@shared/ipc/pocket';
import { apnsKeyStoreForApp, type ApnsKeyStore } from '../credentials';
import { alertsHarnessOverride, type AlertsHarnessOverride } from '../harness/alerts-override';
import { isHarnessLaunch } from '../harness/launch-gate';
import { getLog } from '../log';
import type { PocketAlertsPort, PocketHost } from '../pocket/ipc';
import type { WakeMark } from '../power/wake-mark';
import { apnsOrigin, createApnsSender, type ApnsSender } from '../push/apns';
import { createPushEngine, type PushEngine } from '../push/engine';
import { onBlockedChange } from '../tray/blocked-feed';
import { KEY_PICK_MESSAGE, readKeyFile } from './key-file';

/** How long the quit waits for this module's chain before it stops waiting. */
export const PHONE_ALERTS_JOIN_MS = 3_000;

export interface PhoneAlertsDeps {
  /** The door's owner: `pushDestinations`, `dropPushToken`, `announce`. */
  host(): PocketHost | null;
  /** The door's own `beforeOpen`: the first window, then join the core's boot. */
  ready(): Promise<void>;
  /** The door's own `/v1/blocked` rows, `createPocketRoutes(facts).blocked().rows`. */
  rows(): readonly PocketBlockedRow[];
  /** The ONE `WakeMark`, over Electron's `powerMonitor`. */
  wake: WakeMark;
  // TESTS ONLY (`conformance:push` P1): production takes the defaults below.
  /** Default `apnsKeyStoreForApp()`. */
  keys?: ApnsKeyStore;
  /** Default: the ONE `createApnsSender` call. */
  makeSender?(): ApnsSender;
  /** Default: the harness key file, else the native file panel. */
  pickFile?(sender: WebContents): Promise<string | null>;
}

export interface PhoneAlerts {
  readonly port: PocketAlertsPort;
  rearm(): void;
}

/** What the quit reaches: this module's one instance. */
interface Instance {
  begin(): void;
  join(): Promise<void>;
}

let instance: Instance | null = null;

const alertsLog = getLog('push');

/**
 * The harness override for this launch, or null. An ordinary launch, whose
 * variable is unset, answers on the first line and asks Electron nothing.
 */
function harnessOverrideNow(): AlertsHarnessOverride | null {
  if ((process.env['GMUX_HARNESS_ALERTS'] ?? '') === '') return null;
  return alertsHarnessOverride(process.env, app.getPath('userData'), () => {
    try {
      return app.commandLine.hasSwitch('use-mock-keychain');
    } catch {
      return false;
    }
  });
}

export function createPhoneAlerts(deps: PhoneAlertsDeps): PhoneAlerts {
  let closed = false;
  /** THE CHAIN'S ONE TAIL. It never rejects, so a failed step cannot stop the next. */
  let chain: Promise<void> = Promise.resolve();
  /** Steps queued or running, for the quit's one line. */
  let steps = 0;
  let armed: { readonly engine: PushEngine; readonly off: () => void } | null = null;
  /**
   * Steps waiting for the core right now. Such a step composes nothing once
   * the quit has begun, so the quit does not wait for it: on a launch that
   * opens no window (a refusal screen) the core's wait never ends, and a quit
   * held three seconds for it would be a quit this phase made slower.
   */
  let parked = 0;

  /** Read once, and only when something needs it. */
  let harnessRead: AlertsHarnessOverride | null | undefined;
  const harness = (): AlertsHarnessOverride | null => {
    if (harnessRead === undefined) harnessRead = harnessOverrideNow();
    return harnessRead;
  };

  let store: ApnsKeyStore | null = null;
  const keys = (): ApnsKeyStore => {
    if (deps.keys !== undefined) return deps.keys;
    store ??= apnsKeyStoreForApp();
    return store;
  };

  /** THE ONE SENDER IN `src/` A PERSON'S LAUNCH BUILDS. */
  const defaultSender = (): ApnsSender => {
    const override = harness();
    return createApnsSender({
      origin: (env) => override?.origins[env] ?? apnsOrigin(env),
      allowRemote: !isHarnessLaunch(process.env)
    });
  };

  const announce = (): void => {
    try {
      deps.host()?.announce();
    } catch {
      /* the sheet redraws at its next status; nothing here is worth a throw */
    }
  };

  /** Log the engine's sentence, once per sentence (the engine counts), and redraw the sheet. */
  const said = (engine: PushEngine): void => {
    const sentence = engine.status().sentence;
    if (sentence !== null) alertsLog.warn(sentence);
    announce();
  };

  /** The door's own `beforeOpen`, counted while it waits (see {@link parked}). */
  const ready = async (): Promise<void> => {
    parked += 1;
    try {
      await deps.ready();
    } finally {
      parked -= 1;
    }
  };

  /**
   * Compose, in the SPEC's order: the core first, the question asked again,
   * then one sender and one engine, the feed, and the silent seed.
   */
  async function arm(): Promise<void> {
    await ready();
    const host = deps.host();
    if (closed || host === null || host.pushDestinations().length === 0) return;
    const sender = deps.makeSender?.() ?? defaultSender();
    let built: PushEngine | null = null;
    const engine = createPushEngine({
      rows: () => deps.rows(),
      destinations: () => host.pushDestinations(),
      providerKey: () => keys().read(),
      sender,
      drop: (destination) => host.dropPushToken(destination.tokenDigest),
      wake: deps.wake,
      say: () => {
        if (built !== null) said(built);
      }
    });
    built = engine;
    const off = onBlockedChange(() => engine.observe());
    armed = { engine, off };
    // THE SEED: the first observe is never a join (314 E6).
    engine.observe();
    alertsLog.info('phone alerts armed');
    announce();
  }

  async function disarm(): Promise<void> {
    const was = armed;
    if (was === null) return;
    armed = null;
    was.off();
    was.engine.beginShutdown();
    await was.engine.join();
    alertsLog.info('phone alerts disarmed');
    announce();
  }

  async function step(): Promise<void> {
    if (closed) return;
    const wanted = (deps.host()?.pushDestinations().length ?? 0) > 0;
    if (wanted && armed === null) {
      await arm();
      return;
    }
    if (!wanted && armed !== null) await disarm();
  }

  const rearm = (): void => {
    if (closed) return;
    steps += 1;
    const run = chain.then(step).catch(() => {
      alertsLog.warn('a phone alerts step failed; the next change asks again');
    });
    chain = run.then(() => {
      steps -= 1;
    });
  };

  // ---------------------------------------------------------------------------
  // The key's port (SPEC §5.2.2)
  // ---------------------------------------------------------------------------

  /** `undefined`: not read yet. A keep or a forget moves `keyTurn`, so an older read cannot win. */
  let keyCache: string | null | undefined;
  let keyTurn = 0;
  let keyReading = false;

  const readKeyIdOnce = (): void => {
    if (keyReading || keyCache !== undefined) return;
    keyReading = true;
    const turn = keyTurn;
    // A store that cannot even be built reads as no key, and never throws
    // into the status the sheet is drawn from.
    void Promise.resolve()
      .then(() => keys().read())
      .catch(() => null)
      .then((key) => {
        keyReading = false;
        if (turn !== keyTurn || keyCache !== undefined) return;
        keyCache = key?.keyId ?? null;
        announce();
      });
  };

  const pickFile = async (sender: WebContents): Promise<string | null> => {
    if (deps.pickFile !== undefined) return deps.pickFile(sender);
    // A HARNESS LAUNCH NEVER MEETS A PANEL (conformance:push P3). With the
    // override it answers the override's file; WITHOUT one it answers nothing
    // chosen, at once. The 316.5 fix round: a probe that pressed every pocket
    // channel (probe:p313's census) opened a real native panel on his screen
    // that nobody answered, and the probe never finished.
    const override = harness();
    if (override !== null) return override.keyFile;
    if (isHarnessLaunch(process.env)) return null;
    const window = BrowserWindow.fromWebContents(sender);
    const options: OpenDialogOptions = { message: KEY_PICK_MESSAGE, properties: ['openFile'] };
    const answer = window === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(window, options);
    if (answer.canceled || answer.filePaths.length !== 1) return null;
    return answer.filePaths[0] ?? null;
  };

  const port: PocketAlertsPort = {
    keyId: () => {
      readKeyIdOnce();
      return keyCache ?? null;
    },
    sentence: () => armed?.engine.status().sentence ?? null,
    chooseKey: async (sender): Promise<PocketPushKeyResult> => {
      const path = await pickFile(sender);
      if (path === null) return { kept: false, refusal: null };
      const read = await readKeyFile(path);
      if (!read.ok) return { kept: false, refusal: read.refusal };
      const kept = await keys().keep(read.key);
      if (!kept.ok) return { kept: false, refusal: kept.reason };
      keyTurn += 1;
      keyCache = read.key.keyId;
      announce();
      return { kept: true, refusal: null };
    },
    forgetKey: async () => {
      await keys().forget();
      keyTurn += 1;
      keyCache = null;
      announce();
    },
    changed: () => rearm()
  };

  // ---------------------------------------------------------------------------
  // The quit
  // ---------------------------------------------------------------------------

  instance = {
    begin: () => {
      closed = true;
      armed?.off();
      armed?.engine.beginShutdown();
    },
    join: async () => {
      const started = Date.now();
      const inFlight = steps;
      let bounded = false;
      // A step parked on the core composes nothing now that the quit has
      // begun, and every step behind it returns on its first line, so there is
      // nothing of the chain's to settle: it is not waited for.
      const settling = parked > 0 ? Promise.resolve() : chain;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          bounded = true;
          resolve();
        }, PHONE_ALERTS_JOIN_MS);
        timer.unref?.();
        void settling.then(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      await armed?.engine.join();
      if (inFlight > 0 || bounded) {
        getLog('quit').info(
          `settled phone alerts: ${String(inFlight)} step(s), ${bounded ? 'NOT joined' : 'joined'} after ${String(Date.now() - started)} ms`,
          { steps: inFlight, joined: !bounded, waitedMs: Date.now() - started }
        );
      }
    }
  };

  return { port, rearm };
}

/**
 * Close the alerts' admission. SYNCHRONOUS, the first line of the ordered
 * disposer beside the door's own: no step starts, the feed is unsubscribed and
 * the engine's timers and wake listeners are gone before anything is awaited.
 * Calling it twice is calling it once; with nothing composed it does nothing.
 */
export function beginPhoneAlertsShutdown(): void {
  instance?.begin();
}

/**
 * Join what was already running: the chain, bounded by
 * {@link PHONE_ALERTS_JOIN_MS}, then the engine's own bounded join, which
 * closes the sender. Awaited before the session core closes, because a flush
 * reads its rows through the core.
 *
 * THE BOUND, measured (the 316.5 fix round): the engine's join waits up to its
 * `JOIN_BOUND_MS` (3 s) for a send in flight and then up to the sender's own
 * close bound (2 s), so a quit with alerts armed and a send hung at Apple
 * takes about five seconds here (measured 5,003 ms). The chain's three seconds
 * are not added to that: a step still running holds no engine (a disarm has
 * already let go of it, and an arm is parked on the core, which the quit does
 * not wait for). With alerts never turned on nothing is composed and this
 * returns at once (measured 0.13 ms).
 */
export async function joinPhoneAlerts(): Promise<void> {
  await instance?.join();
}
