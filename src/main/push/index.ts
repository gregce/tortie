/**
 * The push domain (Phase 314): telling a paired phone, once, through Apple's
 * push service, when a session starts waiting on the person.
 *
 * Three modules, one job each:
 *
 *   - `./apns.ts`   the sender: one HTTP/2 POST per alert, an ES256 provider
 *                   token, Apple's answers mapped to what happens next. It
 *                   refuses every origin but a loopback stand-in unless it is
 *                   built with `allowRemote`, and nothing in Phase 314 builds
 *                   it that way.
 *   - `./alert.ts`  the bytes: the door's own rows in, one payload out, never a
 *                   question and never a conversation byte.
 *   - `./engine.ts` the when: joins, coalescing, the wake window, the badge's
 *                   fall, the drop, the stop and the one retry.
 *
 * NOTHING IN AN ORDINARY LAUNCH COMPOSES THIS DOMAIN in Phase 314. The harness
 * seam (`../harness/push-seam.ts`) composes it for the probe; the round that
 * gives the phone an app (Phase 316) composes it for a person, registers the
 * engine's `beginShutdown`/`join` with the ordered disposer, and hands the
 * wake mark Electron's `powerMonitor`.
 *
 * This domain names `../credentials/apns-key` and `../pocket/pairing` by type
 * only, and never names `../logins/`: the key and the destinations arrive
 * injected through `PushEngineDeps`.
 */

export {
  IDLE_CLOSE_MS,
  TOKEN_REUSE_MS,
  apnsOrigin,
  createApnsSender,
  providerTokenSigningInput,
  type ApnsAnswer,
  type ApnsEnvironment,
  type ApnsRequest,
  type ApnsSender,
  type ApnsSenderOptions
} from './apns';
export {
  APNS_PAYLOAD_MAX_BYTES,
  WAITING_THREAD,
  composeAlert,
  composeBadge,
  type AlertPlan
} from './alert';
export {
  ALERT_FLOOR_MS,
  COALESCE_MS,
  RETRY_AFTER_MS,
  createPushEngine,
  type PushEngine,
  type PushEngineDeps,
  type PushEngineState
} from './engine';
