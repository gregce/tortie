# Phase 316.5 — the alert opens the session it names — SPEC

Written by the spec step on 2026-09-30 in `/private/tmp/wt-p3165` at `2abdea43` (origin/main: Phases 314, 330 and 332
landed, and the running-log line "HE PUT THREE PHONE PHASES IN THE RELEASE"). **`2abdea43` is the parent build for every
"before" measurement.** Every `file:line` below was re-read at this head.

Read with it, whole: `build/p316/SPEC.md` §4 "S5" and "Owed to S5 by 316.4's verifiers"; `build/p314/SPEC.md` (§1 to §3,
§9, and its three "§As built" sections); `build/p330/SPEC.md` §1, §3, §4.11 to §4.13 and its three "§As built" sections;
`build/p332/SPEC.md` §1 and its "§As built" sections; the running-log lines of 2026-09-30 at the end of
`docs/BACKLOG.md`. **S5 was written on 2026-09-22, before Phase 330. Where S5 and 330 as built disagree, 330 as built
wins, and §3 says so row by row.** Where this file and S5 disagree, this file wins.

**His ruling, 2026-09-30:** "316.5 Alerts", "317 End, behind Face ID", "318 Reply" are in this release. 316.5 starts
now; 317 builds after it lands, because both change the door's routes and the app.

**The hard rules for every step of this phase, stated once.** His APNs key (`~/Keys`, any `.p8` of his) is NEVER read by
an agent: every test, gate and probe makes a scratch P-256 key in scratch and deletes it in a `finally` (Phase 314's
shape), and he imports his own through Settings → Phone. No request reaches Apple's real APNs hosts from any test or
probe: Apple is `build/p314/apns-stand-in.mjs` on `127.0.0.1`, and no Simulator run ever calls
`registerForRemoteNotifications` (§5.6.2, made structural). No `tailscale funnel`, no Tailscale command that changes his
tailnet: the Funnel child is Phase 330's stand-in and DNS is Phase 332's. No real interface is bound. Nothing is
installed. Never `-L gmux`, never `pkill`, his Tortie is never signalled. No `npm run shot`, no screenshot or screen
recording of a Simulator. Gemini, Qwen, Antigravity and Grok are never started (a scratch `agents.json` renames them
before every Electron launch and `agents:list` is read back). **No model turn is spent in this phase: 0** (§7.8).
Builders and the integrator launch no Electron and boot no Simulator.

---

## 1. The answer first

**What gets built.**

1. **The Mac composes Phase 314's engine for a person, for the first time.** A new module, `src/main/alerts/index.ts`,
   is composed once in `src/main/capabilities.ts` beside the door. It is INERT until the door's own
   `PocketHost.pushDestinations()` answers at least one destination, which is true only when the alerts switch is on,
   the door's fields are the ones a person confirmed, and a paired phone holds a live device token. Only then does it
   wait for the session core (the door's own `beforeOpen`, which never boots it), subscribe to the blocked feed, and
   build ONE sender and ONE engine. It disarms the moment that answer is empty (Remove, alerts off, the door off, a
   changed agreement). It joins the ordered disposer: begun on the first synchronous line, joined before
   `shutdownGmuxCore()`.
2. **He keeps his APNs key through Settings → Phone.** A new row under **Alerts**, drawn only while the alerts are on or
   a key is kept: **Apple push key**, `Not chosen.` or `Key 6782V6SJJ7`, **Choose…** and **Forget**. Choose opens the
   native file panel in main; main reads the `.p8` he picked (the key id from Apple's own file name,
   `AuthKey_<ten>.p8`), and keeps it through Phase 314's sealed store. The topic and team are compiled facts of the
   phone app, not settings.
3. **The phone asks for notification permission after it reads the code and before it presents.** Allowed, it presents
   its device token and environment inside the sealed presentation (`apt`, `ape`, which Phase 314 already built on the
   Mac). Denied, it presents without them and pairs all the same.
4. **A tap on an alert opens the session it names.** `tortie.session` in Phase 314's single alert is read; a count
   alert, a badge or anything unreadable opens the list. A session the door no longer knows draws the Mac's own
   sentence for exactly that case, `Tortie no longer has a record of that session.`, on the list.
5. **A changed address draws one line:** on launch, a paired phone whose device token or environment is not the one it
   presented draws `Pair again to get alerts.` on the list (§5.6.5 has the whole table).
6. **`aps-environment` becomes the app's only entitlement**, `UIBackgroundModes` stays absent, and the phone is 1.0.0 (3).

**What a person does, the first time** (him, §8): upload 1.0.0 (3); open it; the list says `Pair again to get alerts.`
because 1.0.0 (2) presented no address; Remove the iPhone on the Mac, pull on the phone, press Pair, scan, allow alerts
when iOS asks, match, Allow on the Mac; turn on **Alert my phone when a session waits** and Allow; choose the key. From
then on a session that starts waiting arrives as one alert, and tapping it opens that session.

**The seams, decided (§5 gives the reasons):**

| Seam | Decision |
| --- | --- |
| Where the engine is composed | `src/main/alerts/index.ts`, called once from `installMainCapabilities` beside the door; the only production call of `createPushEngine` and `createApnsSender` |
| How it stays inert | Composed only while `pocketHost.pushDestinations().length > 0`; re-asked on every change the host broadcasts; nothing subscribed, read or built otherwise |
| The core | The door's own `beforeOpen` (first window, then join the boot), shared; the alerts module never calls `getGmuxCore` |
| The host per environment | Already Phase 314's: `send` asks `origin(request.environment)` (`src/main/push/apns.ts:485-486`), the engine hands each destination's environment (`src/main/push/engine.ts:348`). Production passes `apnsOrigin`. `src/main/push/**` is NOT edited |
| `allowRemote` | Exactly one site in `src/`: `allowRemote: !isHarnessLaunch(process.env)` in `src/main/alerts/index.ts`, the value Phase 314's H2 pinned for this round |
| The alert's JSON | Unchanged, byte for byte Phase 314's (`src/main/push/alert.ts:94-126`): single `thread-id` = session id and `tortie: {v:1, session}`; count `thread-id` = `tortie-waiting` and `tortie: {v:1}` |
| The token's path | Unchanged on the Mac: `apt`/`ape` in the sealed presentation (`pairing.ts:979-988`), 32 to 256 hex and one of two words, both or neither, refused whole; stored with the phone and hashed in `sha256-pocket-exec-v3` (`pairing.ts:294-310`, `:322`); gone with Remove; dropped on Apple's 410 |
| The key | A port on `PocketHost` (`PocketHostDeps.alerts`) that the pocket domain calls and never implements; two new `pocket:*` channels; not a hashed field |
| A harness launch | `GMUX_HARNESS_ALERTS=<dir>` names loopback origins and a scratch key file, under the push seam's own four refusals; in every other launch it is ignored, and a harness launch with no override can reach nothing because `allowRemote` is false there |
| The permission ask | `PairingModel.read`, after the fingerprint is drawn and before `door.pair` |
| Registration with Apple | `registerForRemoteNotifications` is named once, in the `#else` of `#if DEBUG`: a DEBUG build (every Simulator run) never asks Apple for a token; it takes `-TortieDebugPushToken <hex>` or none |
| The environment the phone presents | Compile time: `development` under `#if DEBUG`, `production` otherwise (§5.6.1 says why, and the one case it gets wrong) |
| Simulator delivery | `xcrun simctl push` through `withSimulator`'s handle only (`handle.push`), held by `gate:simulator` |

**What does not change:** `src/main/push/**`, `src/main/harness/push-seam.ts`, the route table (R4's pin), the confirm
hash's algorithm (`sha256-pocket-exec-v3`), the door process, the Funnel child, the name check, the menus, the manifest,
the tmux layer, every status.

**Subject.** `feat(push): alert the phone when a session waits, and open that session from the alert`
**First body line.** `Phase 316.5: the alert opens the session it names`
**Semver.** Minor on the desktop (a new row in Settings then Phone, and alerts sent for the first time) and 1.0.0 (3)
of the iOS app. No version bump and no tag in this commit: his rule holds releases until the phone works end to end,
and he put this phase in that release.
**Tier 3.** It sends his words (session and project names in the alert) and a device address to a vendor, it holds a
credential (his APNs provider key, imported through a new surface), and it changes a pairing path. Two independent
methods, one an attack, plus the parent measurement (§7.6), a fix round if any verdict is `needs_work`, and an
independent reverify of that fix.
**Charter.** `build/p316/SPEC.md` §4 S5 and "Owed to S5"; `build/p314/SPEC.md` §1.1 row 3, §1.2 rows 5 and 15, §2, §3.6,
§6.3 H2; `build/p330/SPEC.md` §1 and §4.12; research 127 §6 and §11.6 (push for anyone but him stays his, §11 below);
research 128 §5 and §8 item 8.
**Menus.** No change. The new row is inside Settings → Phone, which `Pair a Phone…` already opens
(`src/main/menu.ts:615`, Phase 316.1); no surface is added, renamed or removed.

---

## 2. The tree at this head, re-read

What Phase 314, 330 and 332 already built that S5 asked for, so this phase does not build it again.

| S5 asked for | Where it already is | This phase |
| --- | --- | --- |
| The presentation's token and environment, validated, one bad field refusing the whole presentation | `presentedPush` and `pushFieldsOf` (`src/main/pocket/pairing.ts:948-988`), called inside `openPresentation` (`:1441-1449`); `PUSH_TOKEN_RE = /^[0-9a-fA-F]{32,256}$/`, both or neither, folded to lowercase | Nothing on the Mac. The phone starts sending them |
| Stored with the phone, in the confirmed hash, gone with Remove | `PocketPhoneFields.pushToken`/`pushEnvironment` (`pairing.ts:213-220`); `NORMALIZE.phones` emits both (`:294-310`); `sha256-pocket-exec-v3` (`:322`); a stored row whose push fields are present and malformed is dropped whole (`:899-932`) | Nothing |
| The confirm lines saying where alerts go | `describePocketDoor` (`pairing.ts:399-441`): `Alerts for "<label>" go through Apple (<environment>), device <8 hex>` | Nothing; the probe reads that line (N0) |
| The host picked per token environment | `apnsOrigin` (`src/main/push/apns.ts:76-80`), `options.origin(request.environment)` (`:485-486`), `environment: destination.environment` (`engine.ts:348`) | Production passes `origin: apnsOrigin` |
| The alert carrying the session id as the thread id and a custom key | `singlePayload` (`src/main/push/alert.ts:94-111`): `"thread-id": sessionId` and `"tortie": {"v":1,"session":sessionId}`; `countPayload` (`:113-126`) carries `tortie-waiting` and `{"v":1}` | The phone reads `tortie.session` |
| A dead token dropped | `PocketHost.dropPushToken` (`src/main/pocket/ipc.ts:1790-1802`), `PUSH_TOKEN_STOPPED` drawn per phone (`src/renderer/settings/PhoneSection.tsx:576-580`) | Nothing |
| The switch as a confirmed field | `PocketHost.setPushAlerts` (`ipc.ts:1733-1760`), `pocket:setPushAlerts` (`:1813-1815`), the sheet's Alerts card (`PhoneSection.tsx:599-619`) | Nothing, except the key row beside it |
| The ONE `WakeMark` | `capabilities.ts:347`, over Electron's `powerMonitor` | Handed to the engine |
| The provider key's sealed store | `apnsKeyStore` (`src/main/credentials/apns-key.ts`), `apnsKeyStoreForApp()` (`src/main/credentials/index.ts:544`) | Its first production caller |
| The sheet's Remove notice | `noticeToDraw` keyed by `phoneId` (`PhoneSection.tsx:124-139`, `:870-871`) | Nothing (owed item 1, §4) |

**What nothing composes today.** `createPushEngine(` and `createApnsSender(` are called in `src/` only by the push seam
(`src/main/harness/push-seam.ts:851`, `:853`); the door's composition (`capabilities.ts:330-377`) builds a `PocketHost`
and a `WakeMark` and no engine. So today the Alerts switch records a confirmed field and sends nothing, and nothing lets
a person keep a key: `apnsKeyStoreForApp` has one caller, the push seam.

---

## 3. Where S5 is wrong or stale at this head

| # | S5 says | What is true | This spec |
| --- | --- | --- | --- |
| 1 | "Starts when S4's checklist passes on his phone, and 314 has landed" | 314 landed (`89458498`); S4's build 1 was uploaded on 2026-09-29; Phase 330 then replaced the tailnet node, and build 2 (`cdc9c373`) is archived and waiting for his upload. His ruling of 2026-09-30 starts 316.5 now | Starts now, at `2abdea43` |
| 2 | `pairing.ts` gains optional `pt` (hex, at most 200) and `pe` | Phase 314 built them as `apt` and `ape`, 32 to 256 hex, both or neither (§2) | Nothing to build on the Mac. The names are `apt` and `ape` |
| 3 | `conformance:pocket` gains P1, "a token only through `/pair`; write routes still 0" | Paid by 314 as N1 (no push route, R4's pin) and N2 (the token's one door in). `P1` is now Phase 330's PROXY-source rule | No P1. A new K3 holds the key port (§6.1) |
| 4 | `aps-environment`: "the profile gives `development` for the Xcode arm and `production` for TestFlight" | Debug is ad hoc with no team and no profile (`project.pbxproj:411-439`); only Release is signed, by his team, and the Organizer's App Store Connect export re-signs it for distribution | The file says `development` (Xcode's own spelling); his TestFlight build is exported with `production` |
| 5 | "If it does not choose the host per token, S5 edits `apns.ts`" | It does choose it (§2) | `src/main/push/**` is not edited at all |
| 6 | Proof: the tap "must open that exact session"; "a session that no longer exists draws main's own sentence" | The door answers every refusal, an unknown session id included, with the same 404 and no body (`src/main/pocket/server.ts:125`; `routes.ts:448-455`), so main cannot send a sentence without breaking 313's rule that a refusal says nothing | The phone draws the Mac's own sentence for exactly this case, `NO_SUCH_SESSION` (`src/renderer/app/reach-copy.ts:39`), quoted byte for byte in `Copy.swift` and judged by `conformance:phonecopy`, and only when the list then reads 200 (§5.6.4) |
| 7 | "On each launch, if the token has changed, the app draws one line" | A phone paired under 1.0.0 (2) presented no address and was never asked, which is not "changed" but needs the same line | §5.6.5's table, which adds that row |
| 8 | "Ends at TestFlight build 2 (`CURRENT_PROJECT_VERSION 2`)" | 2 is Phase 330's (`project.pbxproj:417`, `:449`) and is archived | 1.0.0 (3), every configuration |
| 9 | Method A: "delivered with `xcrun simctl push <udid> <bundle> <file>`" | `gate:simulator` allows only `build/simulator-run.mjs` to name a device verb, and a handle may run only its seven verbs (`simulator-run.mjs:147-155`) | A new handle method, `push`, and `gate:simulator` refuses the verb anywhere else (§5.8) |
| 10 | "the checklist gains three rows" | The S4 checklist (`build/p316/CHECKLIST.md`) still describes TailscaleKit; 330 has its own (`build/p330/CHECKLIST.md`) | A new `build/p3165/CHECKLIST.md`, with the pair-again steps and rows (a) to (c) (§8) |
| 11 | Files: compose "`createPushEngine` over … `apnsKeyStoreForApp`" | Right, but nothing lets a person put a key IN that store, and §5 row 7 of 316 says "you give it to 314", which gave it no door | This phase builds the picker (§5.2) |
| 12 | `conformance:ios` gains "`UIBackgroundModes` is still absent" | Already rule (e) since 316.2 (`build/conformance-ios.mjs:44-65`) | Restated in (w) as "no `remote-notification` string anywhere under `ios/`" |
| 13 | "One real alert on his phone, timestamped at both ends" | Right, and it is still the only proof of delivery through Apple | Checklist row (a) |
| 14 | 316 §2 row 5: a hostile arm for "a token minted for the wrong environment" | The stand-in answers `400 BadDeviceToken` for a token at the origin it was not seeded for (`apns-stand-in.mjs:40-42`), and `conformance:push` E7 drives the drop | The app run sends one phone's token to each origin and grades both (N3) |
| 15 | (not said) Phase 314's H2 "pinned at 0 in this phase; the round that wires production raises it to exactly 1, computed from `!isHarnessLaunch(process.env)`" (`build/conformance-push.mjs:55`, `:299-322`) | This is that round | H2 becomes exactly one, in `src/main/alerts/index.ts`, with that exact value (§6.2) |

---

## 4. Owed to S5 — every item checked

| # | Owed | State at `2abdea43` | Proof |
| --- | --- | --- | --- |
| 1 | The Pair a phone card keeps "Paired with iPhone." after Remove | **Paid by Phase 330.** The notice carries the phone it names and is drawn only while that phone is paired | `PhoneSection.tsx:124-139` (`noticeToDraw`, "316.4 owed item 1"), `:870-871` (Remove clears it) |
| 2 | Nothing durable refuses a Release build compiled with DEBUG | **Paid by Phase 330.** `conformance:ios` rule (u), `ruleNoDebugInRelease` (`build/conformance-ios.mjs:2461-2479`), and `test:ios --read-app` searches every Mach-O file for the seam ARGUMENT strings (`build/p316/test-ios.mjs:161`, `DEBUG_SEAM_ARGUMENTS`) | This phase adds the fifth argument, `-TortieDebugPushToken`, to that list (§6.5) |
| 3 | The S4 checklist corrections (key just before pairing, a new Terminal tab, Always Allow, the capitalised labels, Register Device) | **Paid by the main session at 316.4** | `build/p316/CHECKLIST.md:74`, `:79`, `:83`, `:118`, `:224` |

---

## 5. The design, seam by seam

### 5.1 The composition — `src/main/alerts/index.ts` (NEW), `src/main/capabilities.ts`

**Why a new directory and not `src/main/push/`.** `conformance:push` W1 holds that `src/main/push/` imports
`main/credentials/` and `main/pocket/` by type only, and the composition needs both by value (`apnsKeyStoreForApp`,
the host's `pushDestinations`). A composition inside `push/` would have to loosen W1. So it lives beside it, like
`src/main/sessions/fold-wiring.ts` beside the fold, and `push/` stays pure.

**Its surface (pinned; the gates are written against these names):**

```ts
// src/main/alerts/index.ts
export interface PhoneAlertsDeps {
  host(): PocketHost | null;                     // the door's owner: pushDestinations, dropPushToken, announce
  ready(): Promise<void>;                        // the door's own beforeOpen: first window, then join the core's boot
  rows(): readonly PocketBlockedRow[];           // the door's own /v1/blocked rows, createPocketRoutes(facts).blocked().rows
  wake: WakeMark;                                // the ONE WakeMark, capabilities.ts:347
  // Tests only (conformance:push P1): production takes the defaults below.
  keys?: ApnsKeyStore;                           // default apnsKeyStoreForApp()
  makeSender?(): ApnsSender;                     // default: the ONE createApnsSender call
  pickFile?(sender: WebContents): Promise<string | null>; // default: the harness key file, else dialog.showOpenDialog
}
export interface PhoneAlerts { readonly port: PocketAlertsPort; rearm(): void }
export function createPhoneAlerts(deps: PhoneAlertsDeps): PhoneAlerts;   // registers itself as the module's one instance
export function beginPhoneAlertsShutdown(): void;                       // synchronous, first line of the disposer
export function joinPhoneAlerts(): Promise<void>;                       // bounded by PHONE_ALERTS_JOIN_MS
export const PHONE_ALERTS_JOIN_MS = 3_000;
```

**The default sender, the one call in `src/`:**

```ts
createApnsSender({
  origin: (env) => override?.origins[env] ?? apnsOrigin(env),
  allowRemote: !isHarnessLaunch(process.env)
})
```

`override` is `alertsHarnessOverride(...)` (§5.2.4), null in every launch that is not an armed harness run. So a
person's launch dials `https://api.push.apple.com:443` or `https://api.sandbox.push.apple.com:443` by each token's
environment, and a harness launch can reach only a loopback origin: with an override it is the stand-in, and with none
the sender refuses Apple's hosts before any socket (`apns.ts:181`, `REMOTE_REFUSED`), because `allowRemote` is false.

**Arming, the whole rule.** `rearm()` puts one step on the module's own serial chain (the 316.1 queue's shape: one tail,
a failed step never stops the next). The step asks `host()?.pushDestinations().length > 0`:

- **Wanted and not composed:** `await deps.ready()`; ask again (a Remove may have landed); then build the sender, then
  `createPushEngine({ rows, destinations: () => host.pushDestinations(), providerKey: () => keys.read(), sender, drop:
  (d) => host.dropPushToken(d.tokenDigest), wake, say })`, subscribe `onBlockedChange(() => engine.observe())` (the one
  feed, `src/main/tray/blocked-feed.ts`), and call `engine.observe()` once, which SEEDS SILENTLY (314 E6): a session
  already waiting when alerts arm is not announced. Log `phone alerts armed` (no value).
- **Not wanted and composed:** unsubscribe, `engine.beginShutdown()`, `await engine.join()` (which closes the sender,
  `engine.ts:519-527`). Log `phone alerts disarmed`.
- **Otherwise:** nothing.

`rearm()` is called once at install, after `openAtLaunch()`, and from `PocketAlertsPort.changed()`, which the host calls
inside its own `changed()` (every broadcast of `pocket:changed`, `ipc.ts:1198-1208`, 21 call sites: Allow, confirm,
Remove, the switches, a drop, a Tailscale read). A person who never turned alerts on pays, per change, one
`pushDestinations()` that returns at its first line (`store === null || !store.pushAlerts`, `ipc.ts:1764-1765`).

**Why arm on `pushDestinations()` and not on the switch alone.** It is 314's one answer to "may anything be sent now",
it already reads the switch first and the confirmation second, and the engine asks it again at every join and every
flush. So "inert until a person turns alerts on and confirms" holds twice: the engine does not exist before, and a
destination list that empties while it exists sends nothing (314 §3.6). A disarm and a re-arm give a fresh engine that
seeds silently, which is what 314's engine does with an empty destination list anyway (a join while unconfirmed is never
announced later, `engine.ts:266-272`). Named cost: a badge that should fall across a disarm is corrected only by the next
alert.

**`say`.** The engine's own `say` logs each sentence once (`engine.ts:164-175`). The composer's `say` logs
`engine.status().sentence` (a `@shared/push-copy` constant, set before `say` is called, `engine.ts:166`) through
`getLog('push')` and calls `host.announce()`, so the sheet redraws the sentence. No value is ever logged
(`conformance:push` G1 widened, §6.2).

**`ready`, and why the composition never boots the core.** `capabilities.ts` lifts the door's `beforeOpen`
(`capabilities.ts:368-371`) into one function, `coreReady`, and hands it to both the door and the alerts:

```ts
const coreReady = async (): Promise<void> => { await firstWindow(); pocketCore = await getGmuxCore(); };
```

The alerts module never names `getGmuxCore` (P1). The same `pocketCore` is what the door's facts read, so the engine's
rows and the door's `/v1/blocked` rows come from one composer over one core (`createPocketRoutes(facts)`, stateless,
`routes.ts:72-74`). A refusal screen opens no window, so on that path nothing composes.

**The quit** (`disposeMainCapabilities`, `capabilities.ts:518-`):

- `beginPhoneAlertsShutdown()` on the same synchronous run as `beginPocketShutdown()` (`:536`) and
  `beginFunnelShutdown()` (`:541`), before the first `await`: closes admission to the chain, unsubscribes the feed,
  and calls `engine.beginShutdown()` (admission closed on its first line, timers cancelled, wake listeners removed,
  `engine.ts:510-517`).
- `await joinPhoneAlerts()` right after `await joinPocketDoor()` (`:634`) and before `await shutdownGmuxCore()`
  (`:662`): a flush in flight reads rows through the core, so it settles before the core closes. Bounded by
  `PHONE_ALERTS_JOIN_MS` (the chain) plus the engine's own `JOIN_BOUND_MS` (3 s, `engine.ts:76`). One log line, counts
  only, when anything was in flight.

**The composition in `capabilities.ts`, in order** (`:330-377` today):

```ts
const wakes = new WakeMark(powerMonitor);                       // unchanged
const coreReady = async () => { await firstWindow(); pocketCore = await getGmuxCore(); };
const facts = createPocketFacts({ core: () => pocketCore, overview: {...}, wakes: () => wakes.wakes() }); // unchanged
const alertRoutes = createPocketRoutes(facts);
const alerts = createPhoneAlerts({ host: () => pocketHost, ready: coreReady, rows: () => alertRoutes.blocked().rows, wake: wakes });
pocketHost = new PocketHost({ facts, beforeOpen: coreReady, onResume: (cb) => wakes.onResume(() => cb()), alerts: alerts.port });
registerPocketIpc(ipcMain, pocketHost);
void pocketHost.openAtLaunch();
alerts.rearm();
```

### 5.2 The key, and Settings → Phone's picker

#### 5.2.1 `src/main/alerts/key-file.ts` (NEW)

```ts
export const PHONE_APP_TOPIC = 'com.itavero.tortie.phone';   // the phone app's bundle id, conformance:ios (w) holds it equal
export const PHONE_APP_TEAM = '4GRQMF5T5U';                  // the team that signs it, conformance:ios (w) holds it equal
export const KEY_FILE_MAX_BYTES = 4_096;                     // apns-key.ts's own P8_MAX_CHARS
export function keyIdOfFileName(name: string): string | null; // /^AuthKey_([A-Z0-9]{10})\.p8$/ on the basename
export async function readKeyFile(path: string): Promise<{ ok: true; key: ApnsProviderKey } | { ok: false; refusal: string }>;
export const KEY_PICK_MESSAGE = 'Choose the Apple push key for Tortie’s iPhone app';
export const KEY_NAME_REFUSED = 'Tortie reads the key id from the file’s name, AuthKey_ then ten letters or digits. Choose the file Apple gave you. Nothing was changed.';
export const KEY_FILE_UNREADABLE = 'Tortie could not read that file. Nothing was changed.';
export const KEY_FILE_TOO_LARGE = 'That file is too large to be an Apple push key. Nothing was changed.';
```

**Why the topic and team are compiled, not asked.** Tortie's phone app is one app, `com.itavero.tortie.phone`, signed
by one team (`project.pbxproj:450`, `:460`). A provider key only reaches that app if it is that team's, so asking a
person to type either would ask them to type the compiled world back (CLAUDE.md: "configuration selects from choices
the compiled world already contains"). The key id is Apple's own, in the file name Apple gives the download.

**`readKeyFile`, in order, each refusal a sentence and never a value:** the name first (`KEY_NAME_REFUSED`, before the
file is opened); then `open(path, O_RDONLY | O_NONBLOCK)` (a FIFO never blocks the read), `fstat` on the descriptor,
refused unless a regular file of at most `KEY_FILE_MAX_BYTES` (`KEY_FILE_UNREADABLE`, `KEY_FILE_TOO_LARGE`); read exactly
that many bytes; close in a `finally`. Then `{ keyId, teamId: PHONE_APP_TEAM, topic: PHONE_APP_TOPIC, p8: text }`
goes to `keys.keep(...)`, whose own refusal sentences (`apns-key.ts`, "The Apple push key was not kept, because …") are
answered as they are. Nothing here logs; the bytes are dropped with the function.

#### 5.2.2 The port — `src/main/pocket/ipc.ts`

The pocket domain may not name the credentials, the push sender or the alerts module (`conformance:pocket` R3, widened
in §6.1), so the key reaches the sheet through an interface the host calls and never implements:

```ts
// src/main/pocket/ipc.ts
export interface PocketAlertsPort {
  keyId(): string | null;                         // the kept key's id, or null (none, or not read yet); a cache, never a read of the key
  sentence(): string | null;                      // the engine's standing sentence, or null while disarmed
  chooseKey(sender: WebContents): Promise<PocketPushKeyResult>;  // the picker, the read, the keep
  forgetKey(): Promise<void>;
  changed(): void;                                // the host changed something: re-ask whether alerts are armed
}
PocketHostDeps.alerts?: PocketAlertsPort;         // production: capabilities.ts; tests: fakes; the push seam: none
PocketHost.announce(): void;                      // broadcast pocket:changed without calling alerts.changed()
PocketHost.choosePushKey(sender): Promise<PocketPushKeyResult>;   // { kept: false, refusal: null } with no port
PocketHost.forgetPushKey(): Promise<PocketStatus>;
```

`changed()` becomes `announce()` plus `this.deps.alerts?.changed()`. `status()` gains `pushKeyId: this.deps.alerts?.keyId()
?? null` and `pushSentence: this.deps.alerts?.sentence() ?? null`. The handlers:

```ts
handle(ipc, 'pocket:choosePushKey', (event) => host.choosePushKey(event.sender));
handle(ipc, 'pocket:forgetPushKey', () => host.forgetPushKey());
```

**`keyId()` is lazy.** The alerts module holds `string | null | undefined` (undefined: not read). The first `keyId()`
returns null and starts ONE `keys.read()`, whose answer is cached and announced. A keep or a forget sets the cache and
announces. So a person who never opens Settings → Phone reads nothing, and one who does reads one absent file once.

**The key is not a hashed field.** It decides who SIGNS an alert, not where his words go (the phones' tokens do, and
they are hashed); changing it starts no process (refusal 8). 314 did not hash it either. Keeping, replacing or
forgetting it needs no confirm, and nothing is sent until the next flush reads it (314: "the key is read only inside a
flush").

#### 5.2.3 The contract and the bridge — `src/shared/ipc/pocket.ts`, `src/preload/pocket.ts`

- `PocketStatus.pushKeyId: string | null` — ten capital letters or digits, which is public (it is the `kid` in every
  provider token Apple is sent). `PocketStatus.pushSentence: string | null`. Neither is named like a token (N2's
  `TOKEN_LIKE`, `conformance-pocket.mjs:1669`).
- `export interface PocketPushKeyResult { kept: boolean; refusal: string | null }` — a cancelled panel is
  `{ kept: false, refusal: null }`.
- `'pocket:choosePushKey': { req: []; res: PocketPushKeyResult }`, `'pocket:forgetPushKey': { req: []; res: PocketStatus }`,
  and the two bridge members. The channel map's comment names them among the channels that change state.
- `gate:contract`: `[ipc.invoke.channels] count=246` becomes `248` (`docs/audits/contract-baseline.txt:5`) with
  `pocket:choosePushKey` and `pocket:forgetPushKey` added under `:168-178`; `[env.names] count=116` becomes `117`
  (`:401`) with `GMUX_HARNESS_ALERTS` added beside `GMUX_HARNESS_DIR` (`:427-430`). Five lines move and nothing else.

#### 5.2.4 A harness launch — `src/main/harness/alerts-override.ts` (NEW)

`GMUX_HARNESS_ALERTS=<dir>`, `<dir>/alerts.json` read once:

```json
{ "origins": { "development": "http://127.0.0.1:<port>", "production": "http://127.0.0.1:<port>" },
  "keyFile": "<dir>/AuthKey_P3165SCRAT.p8" }
```

```ts
export interface AlertsHarnessOverride { readonly origins: Readonly<Record<ApnsEnvironment, string>>; readonly keyFile: string | null }
export function alertsHarnessOverride(env: NodeJS.ProcessEnv, userDataDir: string, mockKeychain: () => boolean): AlertsHarnessOverride | null;
```

Its refusals are the push seam's own four, read through the push seam's one function rather than written again:
`pushSeamDir({ ...env, GMUX_HARNESS_PUSH: env['GMUX_HARNESS_ALERTS'] ?? '' }, userDataDir, mockKeychain)` (an isolated
launch or `GMUX_PROBES=1`; a harness directory holding the profile; `<dir>` inside it; the mock keychain). Then every
origin must satisfy the push seam's `isSeamOrigin` (`http://127.0.0.1:<port>` and nothing else), and `keyFile`, when
present, must sit inside `GMUX_HARNESS_DIR`. Anything else refuses the whole file. `push-seam.ts` is imported, never
edited (editing it would owe `probe:p314`, which starts Gemini). In a harness launch `pickFile` answers `keyFile` without
a panel, so a probe never meets a native dialog; everything after it (the name, the read, the keep) is the shipping path.

#### 5.2.5 The sheet — `src/renderer/settings/PhoneSection.tsx`

Under the Alerts switch row (`PhoneSection.tsx:599-619`):

- `status.pushSentence`, when not null, as one caption in the warn style (`data-phone-alert-sentence`).
- **The key row, drawn only while `status.pushAlerts || status.pushKeyId !== null`** (`data-phone-key`): label
  `PUSH_KEY_LABEL`, caption `status.pushKeyId === null ? PUSH_KEY_NONE : pushKeyChosen(status.pushKeyId)`, and
  **Choose…** (`data-phone-action="choose-key"`), plus **Forget** (`data-phone-action="forget-key"`) when a key is kept.
  A refusal is drawn in the sheet's existing `error` line.

```ts
export const PUSH_KEY_LABEL = 'Apple push key';
export const PUSH_KEY_NONE = 'Not chosen.';
export function pushKeyChosen(keyId: string): string { return `Key ${keyId}`; }
export const BTN_CHOOSE_KEY = 'Choose…';
export const BTN_FORGET_KEY = 'Forget';
```

**Why hidden at rest.** A person who never turns alerts on sees exactly today's sheet (the parent measurement, §7.6),
and the one person who can hold the key sees the row the moment he turns alerts on. Just enough words.

### 5.3 The token's path, end to end (nothing new on the Mac)

Phone (§5.6.2) → the sealed inner JSON's `apt`/`ape` → the door process's outer bounds (`POCKET_PAIR_BODY_CAP_BYTES`
4 KiB, `door/limits.ts:41`; `PRESENTATION_CT_MAX` 4096, `door/wire.ts:46`) → `openPresentation` → `presentedPush`
(`pairing.ts:1441-1449`, `:979-988`) → the pending phone → the sheet's lines (`Alerts for …`) → Allow records the
agreement over the hash that includes the token (`NORMALIZE.phones`) → `PocketPhoneFields` in the sealed store →
`pushDestinations()` → the engine → `:path /3/device/<token>` at the origin of its environment. Remove deletes the phone
and moves the hash; Apple's 410 or `BadDeviceToken` puts the digest on the unhashed dead list; the phone reads
`stopped` and the sheet draws `PUSH_TOKEN_STOPPED`. A real presentation is about 1,350 bytes with a 256-hex token, well
inside the cap; a 10 KB token cannot reach main at all.

### 5.4 The alert's JSON, and what the tap reads

Unchanged, and pinned by 314 (`alert.ts:94-126`; `build/p314/SPEC.md` §2.3 with the fix round's "every" rule):

```json
{"aps":{"alert":{"title":"<name> needs input","body":"<project> · <agentLabel>"},"badge":N,"sound":"default","thread-id":"<sessionId>"},"tortie":{"v":1,"session":"<sessionId>"}}
{"aps":{"alert":{"title":"Needs your input (N)","body":"<names>"},"badge":N,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}
{"aps":{"badge":N}}
```

Nothing of the conversation beyond what 314 already carries: the session's name, its project, the agent's name, the
status word and the count. The tap reads `tortie.session` and nothing else; `thread-id` is Apple's grouping and is never
read by the app.

### 5.5 The Mac's words, in one place

| Where | Words | Status |
| --- | --- | --- |
| The sheet | `Apple push key`, `Not chosen.`, `Key <id>`, `Choose…`, `Forget` | NEW, `PhoneSection.tsx` |
| The panel | `Choose the Apple push key for Tortie’s iPhone app` | NEW, `key-file.ts` |
| Refusals | `KEY_NAME_REFUSED`, `KEY_FILE_UNREADABLE`, `KEY_FILE_TOO_LARGE` | NEW, `key-file.ts` |
| Refusals | "The Apple push key was not kept, because …" | 314's, `apns-key.ts` |
| Under the switch | `PUSH_NO_KEY`, `PUSH_KEY_REFUSED`, `PUSH_UNREACHABLE`, `PUSH_CLOCK_BEHIND` | 314's, `src/shared/push-copy.ts`, drawn for the first time |

### 5.6 The phone — `ios/**`

#### 5.6.1 New files and their surface

- `ios/Tortie/Alerts/Alerts.swift` (pure, no UIKit):
  - `enum PushEnvironment: String { case development, production; static let current: PushEnvironment }` —
    `.development` under `#if DEBUG`, `.production` in `#else`.
  - `struct PushAddress: Equatable, Sendable, Codable { let token: String; let environment: PushEnvironment }` with a
    failable init: `token` lowercase hex of 32 to 256 characters (the Mac's `PUSH_TOKEN_RE`, folded), and
    `static func hex(_ data: Data) -> String`.
  - `enum PushAuthorization { case notDetermined, denied, authorized }` (`provisional` and `ephemeral` are authorized).
  - `protocol PushAddressing: Sendable { func authorization() async -> PushAuthorization; func askForPairing() async ->
    PushAddress?; func currentAddress() async -> PushAddress? }`.
  - `enum AlertTap: Equatable { case list; case session(String); static func parse(_ userInfo: [AnyHashable: Any]) ->
    AlertTap }` — `.session` only when `tortie` is a dictionary, `v` is the integer 1, and `session` is a String matching
    `^[A-Za-z0-9-]{1,128}$`; everything else is `.list`.
  - `enum AlertLine { static func shows(kept: PushAddress?, authorization: PushAuthorization, current: PushAddress?) -> Bool }`.
  - `@MainActor @Observable final class AlertInbox { static let shared; private(set) var pending: AlertTap?; func post(_:); func take() -> AlertTap? }`.
- `ios/Tortie/Alerts/SystemAlerts.swift`: `final class SystemPushAddressing: PushAddressing` over
  `UNUserNotificationCenter` (`requestAuthorization(options: [.alert, .sound, .badge])`,
  `notificationSettings()`), and the address: in `#if DEBUG`, `AlertsDebugSeam.token()` (the argument
  `-TortieDebugPushToken <hex>`, or none) and NEVER Apple; in `#else`, `UIApplication.shared.registerForRemoteNotifications()`
  and the `AppDelegate`'s callback, bounded at 10 s, a failure or a timeout answering nil.
- `ios/Tortie/App/AppDelegate.swift`: `final class AppDelegate: NSObject, UIApplicationDelegate,
  UNUserNotificationCenterDelegate`, adopted with `@UIApplicationDelegateAdaptor` in `TortieApp`. It sets itself as the
  notification center's delegate in `application(_:didFinishLaunchingWithOptions:)` (so a tap that COLD-launches the app
  is delivered), forwards `didRegisterForRemoteNotificationsWithDeviceToken` and `didFailToRegister…` to
  `SystemPushAddressing`, posts `AlertTap.parse(response.notification.request.content.userInfo)` to `AlertInbox.shared`
  from `didReceive`, and answers `willPresent` with `[.banner, .list, .sound]`.
- `ios/TortieTests/AlertsTests.swift`.

**Why the environment is compile time.** The token's environment is the signed app's `aps-environment`, which the
provisioning profile sets. Every DEBUG build is ad hoc with no team and reaches no device; his only path to his phone is
Archive → Distribute App → App Store Connect, whose re-signing sets `production`. Reading `embedded.mobileprovision` at
run time would be exact in one more case and parses a signed blob this app has no other reason to read. **The one case it
gets wrong, named:** a Release build run from Xcode straight onto a device carries a development profile while the app
says `production`; Apple answers `400 BadDeviceToken`, the Mac drops the token and draws `PUSH_TOKEN_STOPPED`. The
checklist never runs Release from Xcode.

#### 5.6.2 The permission ask and the presentation

- `PairingModel` (`Screens/PairingScreen.swift:74-97`) gains `alerts: any PushAddressing`. `read(_:)` draws the
  fingerprint (`door.begin`), THEN `let push = await alerts.askForPairing()`, THEN `door.pair(pending.with(push: push),
  …)`. iOS shows its question only when the answer is `notDetermined`; a second pairing on the same install is not asked
  again. **A denial, a registration that fails or times out, or a token outside the bounds all present with no
  address, and pair.**
- `PendingPairing` (`Door/Pairing.swift:266-273`) gains `push: PushAddress?`. The sealed inner JSON (`Inner`,
  `:197-202`) gains optional `ape` and `apt`, encoded only when present (synthesised `encodeIfPresent`), so with sorted
  keys it reads `{"ape":"…","apt":"…","ck":…,"ek":…,"label":…,"xk":…}` and without them it is byte for byte today's.
- `PairedDoor` (`Door/Keys.swift:305-329`) gains `push: PushAddress?` — the address this phone PRESENTED. The Keychain
  `Record` (`:488-505`) gains optional `apt` and `ape`, and stays `v: 2` under `pairing-v2`, so a 1.0.0 (2) pairing still
  loads and reads as "presented none". A record whose push fields are present and malformed, or only one of the two, does
  not read back whole and is removed with its keys (`decode`, `:543-`), the Mac's own rule for a stored phone row.

#### 5.6.3 The tap

- `Route` (`App/TortieApp.swift:43-47`) gains `case alerted(id: String)`, drawn by the same `SessionRoute` with an empty
  name and its own routing. `SessionScreen` titles itself with the loaded answer's name once it has one
  (`SessionScreen.swift:154`), so a session opened from an alert is titled by the door.
- `AppModel.openFromAlert(_ tap: AlertTap)`: when the root is `.pairing` and a pairing is kept, switch to reading first
  (`cameToForeground`'s own rule, `:150-159`); when none is kept, do nothing (Pairing stays). Clear the list's notice.
  `.list` sets `path = []`. `.session(id)` sets `path = [.alerted(id: id)]`, replacing whatever was pushed.
- `RootView` observes `AlertInbox.shared.pending` and hands each tap to `openFromAlert` exactly once.

#### 5.6.4 The session that no longer exists

The alerted route's `SessionModel` reads `/v1/session?id=`. On a 404 it calls its routing's `backToList`, which for an
alerted route is `AppModel.backToList(saying: Copy.noSuchSession)`: `path = []` and `list.notice =
Copy.noSuchSession`. The list then reads on appear. **A 404 there too** is a phone the door no longer knows, and goes to
Pairing as today (`DoorWords.swift:108-109`), so the sentence is never drawn over an unpaired phone. A list read that
answers 200 keeps it: the Mac is answering this phone, and it does not know that session.

```swift
/// Mac: src/renderer/app/reach-copy.ts ⟦NO_SUCH_SESSION = 'Tortie no longer has a record of that session.'⟧
static let noSuchSession = "Tortie no longer has a record of that session."
```

It is drawn at the top of the list (`ID.listNotice = "list-notice"`) and cleared when he opens a row, when another alert
opens, and on his next return to the foreground; the list's own read on appear does not clear it.
**Named limit (316.1 concern 8):** a store read that fails on the Mac also answers as an unknown id, so the sentence can
be said of a session that exists; it is the door's rule that a refusal says nothing, and it stays.

#### 5.6.5 `Pair again to get alerts.`

On each launch, when a pairing is kept, `AppModel` asks `authorization()` and, only when authorized,
`currentAddress()` (Release registers with Apple here, which Apple asks apps to do on every launch; DEBUG reads the seam).
`AlertLine.shows(kept:authorization:current:)`:

| Kept (what it presented) | Authorization | Current | Line | Why |
| --- | --- | --- | --- | --- |
| none | not determined | — | **yes** | Paired under 1.0.0 (2), never asked; pairing again asks |
| none | denied | — | no | He said no |
| none | authorized | none | no | Registration failed; nothing to say |
| none | authorized | an address | **yes** | Allowed later in iOS Settings; the Mac holds no address |
| an address | denied | — | no | He turned alerts off in iOS Settings (row c); the Mac's token is still his |
| an address | not determined | — | **yes** | Permission was reset; pairing again asks |
| an address | authorized | none | no | Cannot tell |
| an address | authorized | the same | no | — |
| an address | authorized | different token or environment | **yes** | Apple gave a new one (a restore, a reinstall of iOS) |

```swift
/// Phone: this iPhone's alert address is not the one the Mac holds, and the
/// Mac learns it only inside a pairing (build/p314/SPEC.md section 1.1 row 3:
/// no route carries it). No Mac surface draws the phone's address.
static let pairAgainForAlerts = "Pair again to get alerts."
```

Drawn under the title (`ID.listAlertsLine = "list-alerts-line"`). **It says what, not how**, on purpose (just enough
words): pairing again is Remove on the Mac, a pull on the phone, and a scan, and the pairing screen then says what to
press. A fresh install already forgets its pairing (`InstallMark`), so this line is almost only the 1.0.0 (2) → (3) step
and Apple's rare new token. The full stop follows `Copy.swift`'s rule that a one-line sentence ends with one.

#### 5.6.6 What the app never does, and the DEBUG seam

- No `registerForRemoteNotifications` outside the `#else` of `#if DEBUG` in `Alerts/SystemAlerts.swift`, and exactly
  once; so the Debug build, which is every Simulator run, never asks Apple for a token. The Release test host
  (`test:ios`) never registers either: registration happens only at pairing and at a launch with a kept pairing, and
  `test:ios` runs on a fresh device with none.
- No badge write (`applicationIconBadgeNumber`, `setBadgeCount`): the Mac owns the badge (314 §1.2 row 6).
- No Notification Service Extension, no `mutable-content`, no `content-available`, no
  `didReceiveRemoteNotification`, no background mode, no fourth target.
- No `print`, `debugPrint`, `dump(`, `NSLog`, `os_log` or `Logger(` anywhere in the app: a token, a `userInfo` or a
  payload can never reach a log.
- `-TortieDebugPushToken <hex>` is the fifth DEBUG seam, inside `#if DEBUG` (rule d), read by `SystemPushAddressing`'s
  DEBUG arm.

### 5.7 Entitlement, signing and the build number — `ios/Tortie/Tortie.entitlements`, `project.pbxproj`

- `Tortie.entitlements` holds exactly `<key>aps-environment</key><string>development</string>`. It is named by the
  app's Debug and Release configurations (`project.pbxproj:414`, `:446`) and by no test target.
- Debug stays ad hoc with no team (`:415-418`): a Simulator build carries the entitlement as simulated entitlements and
  needs no profile. The phone builder measures `xcodebuild build` for the Simulator SDK and an unsigned device archive
  with it, exit 0, and reads the built Simulator app's `codesign -d --entitlements`.
- Release stays automatic with his team (`:447-450`). Xcode's automatic signing adds the Push Notifications capability
  to the App ID and the profile when it has his account; when it cannot, he turns it on at developer.apple.com (§9).
- No `SystemCapabilities` block and no `com.apple.Push` line: Xcode derives the capability from the entitlements file,
  and a second spelling is a second place to disagree.
- `CURRENT_PROJECT_VERSION = 3` in all six configurations (`:417`, `:449`, `:479`, `:501`, `:522`, `:543`);
  `MARKETING_VERSION` stays 1.0.0.

### 5.8 Simulator delivery — `build/simulator-run.mjs`, `build/assert-simulator-teardown.mjs`

- The handle gains `push(bundleId, payloadText)`: `bundleId` a dotted bundle id; `payloadText` a JSON object with an
  `aps` object and at most 4,096 bytes (simctl's own rule, `xcrun simctl help push`); the helper writes it 0600 under
  the handle's own scratch, runs `xcrun simctl push <its own udid> <bundleId> <file>` asynchronously with its owned
  children (pitfall b), and deletes the file in a `finally`. It can only ever name the handle's own device.
- `gate:simulator`: `push` joins the verbs only the helper may name (`DEVICE_VERBS`, `assert-simulator-teardown.mjs:87`,
  or a list of its own beside it), a whole command line `simctl push …` outside the helper is refused, with one bad
  fixture and one helper ablation (the helper's device check removed). `SIMULATOR_USER_FLOOR` stays 2.

---

## 6. The gates, clause by clause

Every new clause has an ablation that must turn it red on its own, and an arm whose `from` text is absent FAILS by name.

### 6.1 `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`

- **B1**: THIRTEEN channels in all three places (`build/conformance-pocket.mjs:100`, `:962`).
- **R3** forbidden words gain `main/alerts/`, `../alerts/`, `showOpenDialog` and `apnsKeyStore`
  (`conformance-pocket.mjs:974-1004`): the door names neither the key, the picker nor the composition.
- **K3 (NEW), THE PUSH KEY NEVER ENTERS THE DOOR.** `PocketAlertsPort` is an interface of exactly five members and none
  returns key material (their return types are `string | null`, `Promise<PocketPushKeyResult>`, `Promise<void>` and
  `void`); `PocketPushKeyResult` has exactly `kept` and `refusal`; `status()` reads `keyId()` and `sentence()` and nothing
  else of the port; the two handlers call only `host.choosePushKey(event.sender)` and `host.forgetPushKey()`, which call
  only the port; `PocketHostDeps.alerts` is handed by `src/main/capabilities.ts` and tests alone (U4's shape).
- **The rule count** in the header moves from fifty-one to fifty-two.
- **`ablation:p313`** gains `B1c` (the preload drops `choosePushKey`), `K3a` (a port member answers the `p8`), `K3b`
  (`ipc.ts` imports `../alerts/`), `K3c` (the push seam hands a port), each red on its own rule.
- **`conformance:pocket:hostile`** (`build/p313/hostile-client.mts`) gains four presentation arms beside 314's 17*:
  a 257-hex `apt` (fits the cap) answered `refused`; `ape: "sandbox"` answered `refused`; `apt` without `ape` answered
  `refused`; a sealed presentation carrying a 10 KB `apt`, dropped at the door's body cap with nothing presented (the
  window stays `waiting`). And one honest arm: 64 uppercase hex with `production`, answered `pending`, the pending
  phone's fields holding it lowercased.

### 6.2 `conformance:push`, `ablation:p314`

- **H2** becomes: exactly one site in `src/` passes `allowRemote`, in `src/main/alerts/index.ts`, and its value is the
  expression `!isHarnessLaunch(process.env)` read by the TypeScript parser; everything else in H2 stands
  (`build/conformance-push.mjs:55`, `:299-322`).
- **H3**'s file set gains `src/main/alerts/__tests__/`, `src/main/harness/__tests__/alerts-override.test.ts` and
  `build/p316/probe-p316.mjs` (`:364-368`); no `allowRemote` in any of them.
- **P1 (NEW), THE PRODUCTION COMPOSITION.** In `src/`, outside tests, `createPushEngine(` and `createApnsSender(` are
  called only in `src/main/push/` itself, `src/main/harness/push-seam.ts` and `src/main/alerts/index.ts`, and exactly
  once each in the last; in `alerts/index.ts` the engine is built only in the function that first awaited
  `deps.ready()` and then read `pushDestinations().length`; the sender's `origin` names `apnsOrigin`; and nothing under
  `src/main/alerts/` names `getGmuxCore`, so the composition can never boot the core.
- **P2 (NEW), THE QUIT.** In `disposeMainCapabilities`, `beginPhoneAlertsShutdown()` is called before its first
  `await`, and `await joinPhoneAlerts()` comes after `await joinPocketDoor()` and before `await shutdownGmuxCore()`.
- **G1** reads `src/main/alerts/` too: no key, JWT, token, payload, title, body, question or answer reaches a log call.
- **W1** adds: `src/main/alerts/` names no `main/logins/`.
- **`ablation:p314`** gains `H2b` (`allowRemote: true`), `H2c` (a second site), `P1a` (the engine built before
  `ready`), `P1b` (the arm check removed), `P1c` (the alerts module calls `getGmuxCore`), `P2a` (the join after the core
  shutdown), `P2b` (the begin after an await), `G1b` (a log call naming the token), each red on its own rule; 31 arms
  become 39.

### 6.3 `conformance:credentials`

Rule 23 gains clause **(e)**: `apnsKeyStoreForApp` is named, outside `src/main/credentials/` and tests, by exactly
`src/main/alerts/index.ts` and `src/main/harness/push-seam.ts` (the text scan beside `ALLOWED_VALUE`,
`build/conformance-credentials.mjs:1486`), with one ablation (a third caller). The gate is owed anyway: CLAUDE.md
triggers it on `src/main/capabilities.ts`'s ordered disposer.

### 6.4 `conformance:ios`, `ablation:p316` (`build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`)

- **(d)** five DEBUG seams: `-TortieDebugPushToken` joins the four.
- **(w) (NEW), THE ENTITLEMENT.** `Tortie.entitlements`, read by `plutil -convert json`, is exactly
  `{"aps-environment":"development"}`; both app configurations name it and no other target names an entitlements file;
  no `SystemCapabilities` and no `com.apple.Push` in the project; the project holds exactly three targets; no
  `remote-notification` string anywhere under `ios/`; and `PHONE_APP_TOPIC` and `PHONE_APP_TEAM` in
  `src/main/alerts/key-file.ts` equal the app's `PRODUCT_BUNDLE_IDENTIFIER` and `RELEASE_TEAM`
  (`conformance-ios.mjs:2613`).
- **(x) (NEW), THE ALERT'S REFUSALS.** `registerForRemoteNotifications` exactly once under `ios/Tortie`, in
  `Alerts/SystemAlerts.swift`, inside the `#else` of `#if DEBUG`; `requestAuthorization(` exactly once, in the same
  file; `UNUserNotificationCenter` named only in `Alerts/SystemAlerts.swift` and `App/AppDelegate.swift`; `userInfo`
  read only by `AlertTap.parse` (and handed to it by the delegate); `PushEnvironment.current` is `.development` in the
  `#if DEBUG` arm and `.production` in the `#else`; `apt` and `ape` spelled once each, in `Door/Pairing.swift`'s
  `Inner`; and none of `applicationIconBadgeNumber`, `setBadgeCount`, `UNNotificationServiceExtension`,
  `didReceiveRemoteNotification`, `content-available`, `mutable-content`, `print(`, `debugPrint(`, `dump(`, `NSLog`,
  `os_log`, `Logger(` anywhere in the app.
- **(s)** holds `CURRENT_PROJECT_VERSION` 3, one version.
- **`ablation:p316`** gains, each red on its own rule: `d7` (the push seam out of `#if DEBUG`), `w1` (a second
  entitlement, `com.apple.developer.usernotifications.time-sensitive`), `w2` (`production` in the file), `w3` (a
  `remote-notification` string), `w4` (the topic constant moved), `x1` (the registration out of the `#else`), `x2` (a
  second registration), `x3` (`setBadgeCount`), `x4` (`print(token)`), `x5` (`userInfo` read in a screen), `x6`
  (`PushEnvironment` production under DEBUG). 140 plants become 151.
- `ios/TortieTests/InfoPlistTests.swift:77-84`'s `testTheEntitlementsAreEmpty` becomes
  `testTheOnlyEntitlementIsApsEnvironment`.

### 6.5 `test:ios` (`build/p316/test-ios.mjs`)

- `DEBUG_SEAM_ARGUMENTS` (`:161`) gains `-TortieDebugPushToken`: a Release binary holds none of five, a Debug binary all
  five.
- **A new read, both ways:** the Release app's Mach-O files hold the bytes `registerForRemoteNotifications` (the app asks
  Apple for its address) and the Debug app's hold none (the control, and the proof that no Simulator run can ask).
- The built Simulator Debug app's `codesign -d --entitlements :-` is exactly `aps-environment` = `development`.
- `PASS_WORDS` (`:172`) becomes, pinned because his checklist quotes it:
  `none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam, and it asks Apple for its alert address`.
- The XCTest rows it runs gain `AlertsTests` (§7.3).

### 6.6 The rest

- **`gate:contract`**: §5.2.3's five lines, regenerated by the integrator with
  `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, the commit body naming them.
- **`build/assert-import-boundaries.mjs`** `DIRECTORY_WALLS`: `{ dir: 'main/alerts/', forbidden: ['main/logins/'] }`,
  and `main/pocket/`'s row gains `main/alerts/`.
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): `Copy.swift` holds 34 `/// Mac:` words (33 today) and one
  more phone word with its reason.
- **`build/p316/vectors.mjs`** and `ios/TortieTests/Fixtures/vectors.json`: (1) a sealed presentation WITH `apt`/`ape`:
  the Swift inner bytes with sorted keys, pinned, and the Mac's `openPresentation` answering exactly that token and
  environment; (2) the three alert shapes composed by the SHIPPING `composeAlert`/`composeBadge`
  (`src/main/push/alert.ts`), each with the tap `AlertTap.parse` must answer (single → that session; count and badge →
  the list).
- **`gate:electron`**: no new script reaches `build/electron-run.mjs`; `HELPER_USER_FLOOR` stays 156
  (`build/assert-electron-teardown.mjs:351`).
- **`gate:checks`**: no script is added; `build/verification-checks.mjs`'s notes for `probe:p316`, `test:ios`,
  `conformance:push`, `ablation:p313`, `ablation:p314` and `ablation:p316` carry the new counts.

---

## 7. The proof, run rather than read

### 7.1 Gates (builders run their own; the integrator runs them all)

`npm run -s typecheck`; `npm run -s build` (with `gate:electron`, `gate:background`, `gate:simulator`,
`gate:knownhosts`, `gate:checks`, `conformance:ios`, `gate:contract` inside it); `conformance:pocket`,
`conformance:pocket:hostile`, `conformance:push`, `conformance:credentials`, `conformance:phonecopy`; `ablation:p313`,
`ablation:p314`, `ablation:p316` whole (the integrator); `node build/p316/vectors.mjs --check`;
`node build/assert-import-boundaries.mjs`; `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` (the integrator, as
330's did). **The smokes (`smoke:t1`, `smoke`, `smoke:t3`) start an Electron and are the verifiers', under the lock.**

### 7.2 Vitest (the Mac)

- `src/main/alerts/__tests__/alerts.test.ts`: never armed composes nothing (no `ready`, no sender, no subscription, no
  key read); armed composes once, after `ready`, and seeds silently; a Remove, alerts off and a changed agreement each
  disarm and close the sender; a re-arm while one is pending composes once; `beginPhoneAlertsShutdown` then
  `joinPhoneAlerts` is bounded and closes; a block → exactly one request per destination at the in-process h2c stand-in
  on its environment's origin; `say` announces; the key port (lazy `keyId`, choose with a harness file, forget). The
  file fences `node:http2` exactly as `src/main/push/__tests__/apns.test.ts` does (314's I2) and asserts the fence
  empty after each test. The DEFAULT sender factory is exercised by one test only, with `GMUX_PROBES=1` set for it, and
  must answer `later` with `REMOTE_REFUSED` and dial nothing.
- `src/main/alerts/__tests__/key-file.test.ts`: the name rule (ten capitals or digits; lowercase, nine, eleven and no
  prefix refused before any open); a directory, an absent file, 4,097 bytes; an RSA key, a P-384 key and text through
  `keep`'s own refusals; an honest scratch key kept and read back through `apnsKeyStore` with an injected seal.
- `src/main/harness/__tests__/alerts-override.test.ts`: the refusal table (the push seam's four, a non-loopback origin,
  a name, `https:`, a key file outside the harness directory), each refusing the whole file.
- `src/main/pocket/__tests__/ipc.test.ts` and `disposer.test.ts`: `changed()` calls the port; `announce()` does not;
  `status()` carries the two fields; the two channels; the quit order.
- `src/renderer/settings/__tests__/p316-phone-section.test.tsx`: the key row hidden at rest, drawn with alerts on or a
  key kept, `Not chosen.`, `Key <id>`, Forget only when kept, a refusal in the error line, the sentence line.

### 7.3 XCTest (`test:ios`, verifiers, iOS 26.3 and 18.3, Debug and Release)

`AlertsTests`: `AlertTap.parse` over the three vectors and over hostile shapes (no `tortie`; `tortie` not a dictionary;
`v` 2, `"1"` and 1.5; `session` an Int, empty, 129 characters, `../x`, `a b`, `%2F`, a NUL, non-ASCII) → `.list`;
`AlertLine.shows` over every row of §5.6.5; `PushAddress` bounds and folding; the presentation's inner bytes with and
without an address (vectors); the Keychain record round trip with and without, and a half-present pair refused;
`PairingModel` with fakes: the address is asked AFTER the fingerprint and BEFORE `pair`, and a nil address still calls
`pair`; `AppModel.openFromAlert` with a fake door: a live session → `.alerted(id)`; a 404 then list 200 → `path = []`
and the notice; a 404 then list 404 → Pairing, no notice; `.list` → the list; unpaired → Pairing unchanged.
`InfoPlistTests.testTheOnlyEntitlementIsApsEnvironment`.

### 7.4 `probe:p316` — the app run (builder `proof` writes it; verifiers run it under THE LOCK)

It keeps its shape (one Electron, the stand-in Tailscale, the DNS stand-in, Simulators one at a time) and gains, IN ITS
OWN PROCESS, Phase 314's APNs stand-in (`startApnsStandIn`, two h2c listeners on 127.0.0.1, seeded with the topic
`com.itavero.tortie.phone`, the scratch public key and each phone's token → environment), a scratch P-256 key written
0600 as `<harness>/alerts/AuthKey_P3165SCRAT.p8`, and `GMUX_HARNESS_ALERTS=<harness>/alerts` for the app. The stand-in
is closed and the key deleted in the `finally`. The preflight refuses unless the override names only 127.0.0.1.

**The UI test protocol, pinned** (`P316DriveUITests.swift`, phone; the reader, proof). Two new inputs through the
`TEST_RUNNER_` prefix: `P316_PUSH_TOKEN` (hex; every launch passes `-TortieDebugPushToken <hex>` when set) and
`P316_NOTIFICATIONS` (`allow` or `deny`, default `allow`). The `pair` step, after the fingerprint, waits up to 10 s for
springboard's notification question; when it appears it prints `{"step":"notifications","asked":true,"title":…,
"buttons":[…]}`, presses by label (`Allow`, or `Don’t Allow` / `Don't Allow`), and prints
`{"step":"notifications","answered":"allow"|"deny"}`; when none appears it prints `{"step":"notifications","asked":false}`.
New steps: `alert` (press Home, print `{"step":"ready-for-alert"}`, wait for a notification banner from Tortie in
springboard, print `{"step":"banner","label":…}`, tap it, wait for `screen-session` or `screen-list`, dump `alert`);
`alert-cold` (the same after `app.terminate()`, `"cold":true`, and the app must reach running-foreground from the tap);
`alert-gone` and `alert-list` (as `alert`, dumping under their own names); `relaunch-token:<hex>` (terminate, relaunch
WITHOUT `-TortieDebugForgetPairing`, with that token, dump `relaunch` once the list settles); `no-banner:<s>` (wait that
long, print `{"step":"banner","label":null}` when none came). Frames and labels only; never a photograph. The probe
delivers the payload queued for each `ready-for-alert` through `handle.push`.

**The arms, in order** (26.3 unless named; D0 to D2, P1, L1, S1, T1, R1, M1, K1, F1 and the hostile arms stay):

| # | Arm | Must read |
| --- | --- | --- |
| N1 | The key, through the bridge: `pocket.choosePushKey()` with the harness key file | `pushKeyId` = `P3165SCRAT`; the sealed file is not the PEM |
| D2 | The node reader pairs (unchanged) presenting a production token | its confirm line `Alerts for "…" go through Apple (production), device <8 hex>` |
| N2 | Alerts on, then Allow through the sheet's own lines | `phone alerts armed` in `app.log` once; 0 requests at the stand-in (D0's waiting session is not announced) |
| N0 | P1, with `P316_NOTIFICATIONS=allow` | iOS asked, AFTER the fingerprint line and while the Mac's pairing view was still `waiting`; answered allow; the Mac's lines hold `Alerts for "<label>" go through Apple (development), device <first 8 hex of sha256(the seam token)>`; the phone row reads `alerts: 'on'` |
| N3 | A new `ask` session blocks (the fake `claude`) | main reads it `needs_input` first (else UNREADABLE); then exactly one request at the development origin for the app's token and one at the production origin for the node reader's, both 200, single shape, JWT verifying under the scratch public key, `apns-topic` the phone's bundle id, and the body byte-equal to the probe's own composition from the node reader's `/v1/blocked` rows |
| N4 | `alert`, delivering N3's recorded body | the banner tapped; `screen-session` titled with that session's name |
| N5 | `alert-cold`, the same body | the app cold-launched by the tap straight onto that session |
| N6 | `alert-gone`: that session is ended and removed on the Mac, then the same body delivered | `screen-list` with `list-notice` = `Tortie no longer has a record of that session.`; alive |
| N7 | `alert-list`: a count-shape body, then a single-shape body whose `tortie.session` is `../x` | the list each time, no `list-notice`, alive |
| N8 | `relaunch-token:<another hex>`, then `relaunch-token:<the paired hex>` | `list-alerts-line` = `Pair again to get alerts.` the first time and absent the second (the control) |
| N9 | Alerts off, and a new `ask` session blocks | `phone alerts disarmed` once; 0 requests after 15 s |
| F1+ | iOS 18.3 (the floor, MANDATORY): pairing with `allow`, then `alert` with a single-shape body naming a live session, composed by the probe | the tap opens it on 18.3 |
| ND | A new 26.3 Simulator (`P316_ARMS` gains `deny`, default on): pairing with `P316_NOTIFICATIONS=deny` | pairs; no `Alerts for` line for it and its row reads `alerts: 'none'`; `list`, `open:<id>` and `conversation` all drawn; a delivered body shows no banner in 20 s (`no-banner:20`); alive |
| N10 | After the app is gone | `app.log` holds no token hex, no JWT, no PEM line and no payload JSON |

The report prints digests, lengths and the probe's own names. `P316_KEEP=1` keeps, for the verifier's re-derivation,
the node reader's `/v1/blocked` rows read at the block, every stand-in record, and every body delivered. Budget about
15 to 20 minutes, measured by the verifier; one Electron; four Simulators one after another. At the end, once: the
Electron count (CLAUDE.md's command) and `xcrun simctl list devices | grep -c p316-` reading 0 with nothing booted.

### 7.5 The independent methods (Tier 3: two, one of them an attack)

- **Method A, re-derive.** The verifier writes its own composer of 314's alert JSON (§5.4 and 314 §2.2 to §2.4, the
  fix round's "every" rule) and byte-compares it with every body the stand-in received, going red on a one-character
  mutation of its own output; verifies every ES256 signature with its own implementation against the scratch public
  key; recomputes which origin each token must reach from the environment each phone presented (the Mac's own
  `Alerts for … (<environment>)` lines, and the seam token the probe chose); and checks that each tap drew the name
  the door holds for `tortie.session`. It shares no code with `src/main/push/` or `src/main/alerts/`.
- **Method B, attack.** At least: the gone session (N6); notifications denied (ND); the hostile presentations (§6.1);
  the wrong environment (N3's two origins, and a phone's token presented at the other origin answered `BadDeviceToken`
  and dropped); hostile tap payloads of the verifier's own through `handle.push`; a cold launch; hostile key files of the
  verifier's own through the picker's harness path (a FIFO, a directory, 4,097 bytes, an RSA key, a misnamed file); a
  Remove while a flush is in flight; and **a harness launch WITHOUT the override**, which must dial nothing: main's
  sockets read with `lsof` show no peer but loopback, the stand-in's connection counts do not move, and `app.log` holds
  `REMOTE_REFUSED` once.

### 7.6 The parent measurement (mandatory, whatever the tier)

At `2abdea43` and at HEAD, one after the other, for a person who never turns alerts on (a fresh profile, three
sessions, one of them waiting): Settings → Phone's rectangles are identical (the key row is hidden at rest); `app.log`
holds no `phone alerts` line at HEAD; no Tortie utility process, no Tailscale spawn, no listening socket and no peer but
loopback from main in 60 s; `pocket:status` differs only by `pushKeyId: null` and `pushSentence: null`; quit time equal
within noise. A row that reads worse than the parent is removed, not argued (his no-regression rule).

### 7.7 The path-triggered runs this phase owes (verifiers, under THE LOCK)

`probe:p313` (the pocket wiring in `capabilities.ts`, `PhoneSection.tsx`, `src/main/pocket/**`) and `probe:p330` (the
quit in `capabilities.ts`, `PhoneSection.tsx`), once each. **Not owed:** `probe:p314` (nothing on its paths moves:
`src/main/push/**`, `push-seam.ts` and the wake rule are untouched, and its Gemini arms may not run under this phase's
rules); `probe:p332` (the naming face is untouched).

### 7.8 Model turns

**0.** No real agent runs: the blocks are `probe:p316`'s committed dialog printed by a `/bin/sh` `claude`, which a new
session in its `starting` state is captured on every tick (314's real-agent round, R1), so the one-second race does
not apply.

---

## 8. His checklist — `build/p3165/CHECKLIST.md` (builder `proof`)

In his words, each row saying what to open, press and see, then "Not covered yet" and a table of where every word it
names was found. Before anything: 1.0.0 (2) is archived and he may upload it or skip it; 1.0.0 (3) supersedes it.

1. **Get this build running on the Mac** (`git pull --rebase --autostash origin main`, `npm run dev`).
2. **Archive, check and upload 1.0.0 (3).** In a new Terminal tab, `open ios/Tortie.xcodeproj`; scheme Tortie, Any iOS
   Device (arm64); Product → Archive. If Xcode says the profile or App ID lacks Push Notifications, turn it on (§9 step
   1) and archive again. Show in Finder; `node build/p316/test-ios.mjs --read-app ` and drag the archive in. **You should
   see** `none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam, and it asks Apple for
   its alert address`. Distribute App → App Store Connect → Distribute; answer Missing Compliance if asked.
3. **Install 1.0.0 (3)** from TestFlight and open it. **You should see** your list with `Pair again to get alerts.` under
   the title, because 1.0.0 (2) never asked for alerts.
4. **Pair again.** On the Mac, Settings → Phone → Phones → **Remove** your iPhone. On the phone, pull down: it goes to
   Pairing. On the Mac, **Pair**. On the phone, scan. **You should see** iOS ask "“Tortie” Would Like to Send You
   Notifications"; press **Allow**. Match the six groups. On the Mac, the lines include `Alerts for "<your iPhone>" go
   through Apple (production), device …`; press **Allow**. **You should see** the phone's row with `Alerts on`.
5. **Turn alerts on.** Under **Alerts**, switch on **Alert my phone when a session waits**, read the lines, press
   **Allow**. **You should see** the **Apple push key** row with `Not chosen.`
6. **Choose the key.** Press **Choose…** and pick your `AuthKey_6782V6SJJ7.p8`. **You should see** `Key 6782V6SJJ7`.
7. **(a) One alert.** Lock the phone. On the Mac, make a session wait on you (a Claude Code permission question). Write
   down the Mac's clock when its dot turns amber and the lock screen's time on the alert. **You should see** one alert,
   `<session> needs input` over `<project> · Claude Code`, never what it asks. An observation, not a rate.
8. **(b) Tap it.** **You should see** Tortie open on that session.
9. **(c) Alerts off in iOS.** Settings → Notifications → Tortie → Allow Notifications off. Open Tortie: the list, a
   session and its conversation all work, and no line asks you to pair. Make another session wait: nothing arrives on
   the phone. Turn them back on.
10. **Optional, the gone session.** Remove a session on the Mac whose alert is still on the lock screen, then tap that
    alert. **You should see** the list with `Tortie no longer has a record of that session.`

**Not covered yet:** nothing arrives while the Mac sleeps or Tortie is quit (the Mac says the waits it first sees after
waking in one alert); the alert never says what the session asks; turning the door off stops alerts, because the tap
reads through it; End from the phone is 317 and replying is 318; alerts reach only a phone paired with a key of the
app's publisher (research 127 §11.6 is still his).

---

## 9. What HE does, in order (also the `operatorSteps` of this step's answer)

1. If Xcode's automatic signing cannot add it when he archives: at developer.apple.com → Certificates, Identifiers &
   Profiles → Identifiers → `com.itavero.tortie.phone`, turn on **Push Notifications** and save. His key must serve
   the production environment and this app; if Apple refuses it, the sheet says "Apple refused Tortie’s push key, so it
   told your phone nothing." under the switch after the first alert.
2. Pull and run this build on the Mac.
3. Archive 1.0.0 (3), run `--read-app` on it, and upload it through the Organizer (Distribute App → App Store Connect).
   Build 2 may be skipped.
4. Install 1.0.0 (3) from TestFlight.
5. Pair again: Remove the iPhone on the Mac, pull on the phone, Pair, scan, **Allow** alerts when iOS asks, match, Allow
   on the Mac.
6. Turn on **Alert my phone when a session waits** and Allow.
7. Choose his key in Settings → Phone → Apple push key → **Choose…** (`AuthKey_6782V6SJJ7.p8`). No agent ever touches
   that file.
8. Run checklist rows (a), (b) and (c).

---

## 10. Builders, disjoint files, and who owns what is shared

Three builders, working in `/private/tmp/wt-p3165` at the same time. No file is in two lists. Builders launch no
Electron, boot no Simulator, run no `npm test` whole, no smoke, no probe, no package; they never commit, stage or stash,
never touch `/Users/gdc/gmux`, and keep every command under 90 s except `xcodebuild` (phone), which uses
`-derivedDataPath /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3165/dd-phone`, ad
hoc, no team, device builds unsigned. Where a builder needs another's interface it codes against §5's pinned names and
the integrator reconciles. No raw control bytes in any file.

| Builder | Owns |
| --- | --- |
| **mac** | NEW `src/main/alerts/index.ts`, `src/main/alerts/key-file.ts`, `src/main/alerts/__tests__/alerts.test.ts`, `src/main/alerts/__tests__/key-file.test.ts`, `src/main/harness/alerts-override.ts`, `src/main/harness/__tests__/alerts-override.test.ts`; `src/main/capabilities.ts`; `src/main/pocket/ipc.ts`; `src/main/pocket/__tests__/ipc.test.ts`, `disposer.test.ts`; `src/shared/ipc/pocket.ts` (and `src/shared/ipc/index.ts` only if the facade must re-export `PocketPushKeyResult`); `src/preload/pocket.ts`; `src/renderer/settings/PhoneSection.tsx`, `phone-section.css`, `__tests__/p316-phone-section.test.tsx`; `build/assert-import-boundaries.mjs`; `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/p313/hostile-client.mts`; `build/conformance-push.mjs`; `build/ablation-p314.mjs`; `build/conformance-credentials.mjs` |
| **phone** | `ios/**` (every Swift file, `TortieTests`, `TortieUITests/P316DriveUITests.swift`, `Tortie.entitlements`, `ios/Tortie.xcodeproj/project.pbxproj`, `ios/TortieTests/Fixtures/vectors.json`); `build/conformance-ios.mjs`; `build/p316/ablation-ios.mjs`; `build/p316/test-ios.mjs`; `build/p316/vectors.mjs`; `build/p311/copy-drift.mjs` |
| **proof** | `build/simulator-run.mjs`; `build/assert-simulator-teardown.mjs`; `build/p316/probe-p316.mjs`; `build/p316/node-phone.mjs` (only if a need appears; it already seals `apt`/`ape`, `:231-234`); NEW `build/p3165/CHECKLIST.md`; and the shared files `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `CLAUDE.md`, `CHANGELOG.md`, `DEVELOPMENT.md` |

**Shared files, and their one owner.** `package.json`, `build/verification-checks.mjs`,
`build/assert-electron-teardown.mjs` (no change expected: the floor stays 156), `CLAUDE.md`, `CHANGELOG.md` and
`DEVELOPMENT.md` belong to **proof**, who writes the others' needs from their hand-offs; `mac` and `phone` put what they
need there in their reports. `ios/Tortie.xcodeproj/project.pbxproj` belongs to **phone** (new Swift files, version 3),
and nobody else edits it. `docs/audits/contract-baseline.txt` belongs to **the integrator**, regenerated once mac is in.
`ios/TortieTests/Fixtures/vectors.json` is phone's and the integrator regenerates it once mac is in
(`node build/p316/vectors.mjs`, then `--check`). `build/p3165/SPEC.md` is this file; the integrator appends
"§As built". `docs/BACKLOG.md` belongs to no builder.

### 10.1 Builder `mac` — what to build

1. §5.1, §5.2 and §5.5 exactly: the alerts module, the key file, the override, the port on `PocketHost`, the two
   channels, the bridge, the sheet's rows, and the composition and quit in `capabilities.ts`. **Do not edit
   `src/main/push/**` or `src/main/harness/push-seam.ts`** (import from them).
2. The gates of §6.1, §6.2, §6.3 and §6.6's wall, each clause with its ablation, and the hostile client's five arms.
3. §7.2's vitest files.
4. Runs, and nothing else: `npm run -s typecheck`; `npx vitest run --no-cache src/main/alerts src/main/harness
   src/main/pocket src/renderer/settings src/main/push`; `conformance:pocket`, `conformance:pocket:hostile`,
   `conformance:push`, `conformance:credentials`; `P313_ONLY=`/`P314_ONLY=` subsets naming the new arms;
   `node build/assert-import-boundaries.mjs`; `node build/contract-inventory.mjs --check` (red until the integrator
   regenerates: say which lines).
5. Report: every file, every pinned name you had to word differently, the lines `proof` must put into `CLAUDE.md` and
   `verification-checks.mjs`, and the hand-off for the contract baseline.

### 10.2 Builder `phone` — what to build

1. §5.6 and §5.7 exactly, the XCTest rows of §7.3, and the UI test protocol of §7.4 (the Swift half).
2. The gates of §6.4, §6.5 and the vectors and copy of §6.6.
3. Runs: `xcodebuild build` and `build-for-testing` for the Simulator SDK (Debug and Release, `ENABLE_TESTABILITY=YES`
   for Release), and an unsigned Release device archive, each into your derived data path, ad hoc, no team;
   `codesign -d --entitlements :-` on the built Simulator app; `node build/p316/test-ios.mjs --read-app` on the Release
   Simulator app and on the archive, and on the Debug app for the control; `conformance:ios`, `ablation:p316`,
   `conformance:phonecopy`, `node build/p311/copy-drift.mjs --self-test`, `node build/p316/vectors.mjs --check` once
   mac's pieces exist. **No Simulator is booted:** `test:ios` is the verifiers'.
4. Report: the entitlement's build results, the new rule counts, and any wording the protocol needed.

### 10.3 Builder `proof` — what to build

1. §5.8: `handle.push` and its gate, with fixtures and the helper ablation; `node build/assert-simulator-teardown.mjs`
   green.
2. §7.4: the arms, the APNs stand-in, the scratch key, the override, the new UI-test steps' reader, `P316_KEEP`, and
   `--grader-self-test` fixtures for every new arm with each clause red on its own break. Everything started ends in a
   `finally`, by pid.
3. §8's checklist, every word it names checked against the tree and tabled.
4. The shared files: `package.json` (no new script), `build/verification-checks.mjs` (notes), `CLAUDE.md` (the
   `conformance:pocket`, `conformance:push`, `conformance:credentials`, `conformance:ios`, `test:ios`, `probe:p316` and
   `gate:simulator` rows, and `src/main/alerts/**` in the `conformance:push` path list; one line each in the house
   style), `DEVELOPMENT.md` (one paragraph for `GMUX_HARNESS_ALERTS` beside `GMUX_TAILSCALE_BIN` and
   `GMUX_POCKET_NAME_SERVERS`, `:73-90`), and `CHANGELOG.md` (§10.5).
5. Runs: `node build/p316/probe-p316.mjs --grader-self-test`, `node --check` on every script you touched,
   `node build/assert-simulator-teardown.mjs`, `node build/assert-electron-teardown.mjs`,
   `node build/assert-background-teardown.mjs`, `node build/assert-hermetic-checks.mjs`.

### 10.4 The integrator

Reconciles the pinned names, regenerates `vectors.json` and the contract baseline (the body names the five lines),
runs §7.1 whole including the three ablations and `package`, runs
`LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over every touched text file, scans for duplicated blocks of ten or
more lines, and appends "§As built — 316.5" to this file. It launches no Electron and boots no Simulator.

### 10.5 The CHANGELOG item (under `## Unreleased`, `### Added`; the follow-up docs commit adds the link)

- Your iPhone now tells you when a session starts waiting on you, and tapping the alert opens that session: allow alerts when the phone asks as it pairs, then turn on Alert my phone when a session waits in Settings then Phone and choose the app's Apple push key there. The alert names the session and its project and never what it asks, it goes through Apple and not while your Mac sleeps, and a phone paired before this version must pair again to get alerts

---

## 11. What is NOT in this phase

- **No edit to `src/main/push/**` or `src/main/harness/push-seam.ts`.** The sender, the engine, the alert's bytes and
  the wake are Phase 314's as built.
- **No new route, no write route, no token-refresh route.** A changed address is "pair again" (314 §1.1 row 3).
- **No question, excerpt or conversation byte in any alert,** no Notification Service Extension, no `mutable-content`,
  no Live Activity, widget or Dynamic Island, no `time-sensitive` or `critical`.
- **No background mode**, no background fetch, no badge written by the phone.
- **No alert while the Mac sleeps or Tortie is quit.** No alert for a row already waiting when alerts arm or Tortie
  starts (314 E6).
- **No push for anyone but him.** Research 127 §11.6 is still his; alerts need the app publisher's key.
- **No hashing of the key**, and no keychain for it: 314's sealed file.
- **No list refresh on an alert arriving in the foreground**; a tap opens the session, and the list reads on appear, on
  return to the foreground and on pull, as today.
- **No pressable "Pair again"** on the phone; pairing again is the Mac's Remove and a scan.
- **No re-run of `probe:p314`** (§7.7), and no Gemini, Qwen, Antigravity or Grok started by anything.
- **No End (317), no reply or choices (318), no release, no tag.**

---

## 12. Open concerns handed to the verifiers

1. **The banner in XCUITest is unmeasured on iOS 26.3 and 18.3.** No builder may boot a Simulator. If a banner cannot be
   found or tapped by label, the arm is UNREADABLE (exit 2), never a pass; Notification Center is the fallback the
   verifier may try, and says so.
2. **The ad hoc Debug build with `aps-environment`** is believed to build for the Simulator with simulated entitlements;
   the phone builder measures the build, and the verifiers measure that the app still launches, pairs and is tapped
   open.
3. **Whether iOS delivers `didReceive` for a cold launch before `RootView` observes the inbox.** The inbox holds the one
   pending tap for exactly this; N5 measures it.
4. **The compile-time environment's one wrong case** (§5.6.1), and **the sentence over a store read that failed**
   (§5.6.4), are named limits, not defects; attack them if you think otherwise.
5. **`pushSentence` is re-read on every status**, so a sentence that clears after a good send is redrawn at the next
   status push, not at once.
6. **Signing with his account is untestable by construction.** Whether automatic signing adds Push Notifications to the
   App ID by itself is his step 1's question.

---

## §As built — 316.5 (the integrator, 2026-09-30)

Built by three builders (`mac`, `phone`, `proof`) and reconciled here, in `/private/tmp/wt-p3165` over `2abdea43`. No
Electron was launched and no Simulator booted by any builder or by the integrator; no model turn was spent (0); no
request reached Apple; his key was never read.

### Research 136 supersedes this spec in one place, and binds it

**Alerts are his alone** (research 127 §11.6, Phase 314 Ruling 6): only the Mac holding the phone app's APNs key can
send. So the phone asks iOS for alerts ONLY when the Mac it is pairing with can send, and the pairing answer says so.

| Decision | Where |
| --- | --- |
| **The field.** `POST /pair`'s `pending` answer gains ONE optional word, `"alerts": true`, the literal and nothing else. A Mac that cannot send answers `{"state":"pending"}`, byte for byte the answer before this phase, so a 1.0.0 (2) phone reads it as it did. `refused` and `allowed` never carry it | `PocketPairAnswer` (`src/main/pocket/pairing.ts:1229`), `pairBody` (`src/main/pocket/server.ts:108-112`) |
| **"Can send"** is the switch on, the door's fields confirmed, and a key kept (`keyId()` of the port, a cache, never a read of the key). The host adds the word in its `present` wrapper, because only the host holds the alerts' port; the pairing owner answers the state alone | `PocketHost.alertsCanSend` (`src/main/pocket/ipc.ts:1852`), the wrapper at `:454-459` |
| **The phone** reads `alerts` on `pending` only: absent or `null` is "cannot send", a non-boolean refuses the answer. It presents first with no address; on the first `pending` carrying `alerts: true` it asks iOS ONCE, then presents again at once with `apt`/`ape`. The pairing keeps the address of the LAST presentation the Mac answered `pending` to, and whether that Mac said it could send (`sends: true` in the Keychain record, written only when true) | `PairAnswer.pending(macSends:)` (`ios/Tortie/Door/Contract.swift:450`, `:472`), `PairingFlow.attempt` (`ios/Tortie/Door/Pairing.swift:435-448`), `PairingStore.Record.sends` (`Door/Keys.swift`) |
| **`Pair again to get alerts.`** is drawn only for a pairing whose Mac said it could send; for any other, the launch check asks iOS nothing and never registers with Apple. A 1.0.0 (2) pairing never draws it | `AlertLine.shows` guard (`ios/Tortie/Alerts/Alerts.swift:203`), `AppModel.checkAlertAddress` (`App/TortieApp.swift`) |
| **Settings → Phone.** The `Apple push key` row is always drawn once main answers, first in the Alerts card (`Not chosen.` or `Key <id>`, **Choose…**, **Forget** when kept). The alert switch, its caption and main's sentence are drawn ONLY while a key is kept or alerts are already on (the second case so a switch left on by an earlier build can be turned off). A Mac with no key shows no switch: hidden rather than held with a line, because it is fewer words and no control that cannot be pressed | `pushSwitchShown` (`src/renderer/settings/PhoneSection.tsx:274`, drawn at `:667`) |

This supersedes: SPEC.md (this file) §1 items 3 and 5 and "What a person does"; §5.2.5 ("hidden at rest"); §5.6.2
("asks before `door.pair`"); §5.6.5 row 1 (a 1.0.0 (2) pairing is now `no`); §7.3 ("asked AFTER the fingerprint and
BEFORE `pair`": it is now asked inside the pairing, after the first `pending` that says the Mac can send); §7.4 N0
("while the Mac's pairing view was still `waiting`": it may be `presented`, and what holds is that iOS asked before the
Mac ALLOWED the phone); §8 and §9's order (the key and the switch now come BEFORE pairing again, and step 3 no longer
sees the line); §10.5's CHANGELOG text (it gave the superseded order and read as open to anyone; `proof` wrote a
corrected item). And `build/p316/SPEC.md:660`, "the pairing flow asks for notification permission before it presents".
A new probe arm, **N11**, holds the refusal: a phone pairing with a Mac that cannot send is never asked, draws no alert
line, and no alert word from `Copy.swift` appears.

### Owed to S5, checked

1. The Pair a phone card after Remove: **paid by Phase 330** (`noticeToDraw`, `PhoneSection.tsx:156`).
2. Nothing durable refused a Release build compiled with DEBUG: **paid by Phase 330** (`ruleNoDebugInRelease`,
   `build/conformance-ios.mjs:2500`, and `test:ios --read-app`); this phase adds the fifth seam argument,
   `-TortieDebugPushToken`, to `DEBUG_SEAM_ARGUMENTS` (`build/p316/test-ios.mjs:179`).
3. The S4 checklist corrections: **paid at 316.4** (`build/p316/CHECKLIST.md`).

### Where the build differs from this spec, and why

- **`pairing.ts` and `server.ts` belonged to no builder (§10)**, but research 136's word needs both. `mac` wrote the
  change as a tested patch in scratch; the integrator applied it (`git apply --check` clean): the type, `pairBody`, the
  host's `present` wrapper, N3 widened (the word only beside `pending`, only as the literal `true`, the type likewise),
  ablations N3c and N3d with N3b's `from` text repaired for the split line, hostile arms 17m to 17o through the SHIPPING
  `pairBody`, and two `ipc.test.ts` tests through the host's own handler. The integrator also corrected `server.ts`'s
  comment that presenting "reads nothing of main's state": it now reads the switch, the agreement and the key's cached id.
- **K3 gained a clause** (`alertsCanSend` reads the port's `keyId()` and nothing else) with ablation K3d.
- **`ablation:p313`** is 143 arms (136 at the head, plus B1c, K3a to K3d, N3c, N3d). **`ablation:p314`** is 40, not
  39: `P1d` proves P1 follows the module's counted `ready()` wrapper, which exists so a quit never waits on a core that
  will not come (a refusal screen opens no window). **`ablation:p316`** is 154, not 151 (x7 to x9 are research 136's).
  **`conformance:pocket:hostile`** is 96 arms: 17g to 17j the presentation refusals, 17k the honest arm, 17l the kept
  token lowercased and named by digest, 17m to 17o the `pending` word.
- **Extra exports:** `KeyFileAnswer` (`key-file.ts`), `ALERTS_OVERRIDE_FILE` and `parseAlertsOverride`
  (`alerts-override.ts`). The import wall now reads a bare directory import as its index (`'../alerts'`), which also
  closed `'../push'` getting past the pocket wall.
- **§6.5's entitlement read.** `codesign -d --entitlements :-` on the ad hoc Simulator app answers an empty dictionary.
  The entitlements are the simulated ones in the executable's `__TEXT,__entitlements` section, which also carry Xcode's
  own `application-identifier` (`4GRQMF5T5U.com.itavero.tortie.phone`), measured at the parent too. `test:ios` reads the
  section and allows that one key. The integrator decoded the section of its own Debug build independently:
  `{application-identifier, aps-environment: development}`.
- **`App/DebugLaunch.swift` (not in the spec)**, DEBUG only: a launch by iOS (a tap that cold-launches the app) carries
  no argument, so the DEBUG seams (endpoint, still dot, push token, never the pairing code or the forget) are carried in
  a file in the app's own container. Rule (d) holds it inside `#if DEBUG`; the Release read finds none of the five
  seam strings.
- **`SessionScreen`'s title** is the door's name once loaded, for every session (the alerted route has no list name).
- **The CHECKLIST** uses **TestFlight Internal Only**, as build 2 did, where §8 said "App Store Connect"; both sign for
  App Store distribution, which is what sets `production`.
- **The duplicated block scan** found one group: the `node:http2` fence in `src/main/alerts/__tests__/alerts.test.ts`
  and `src/main/push/__tests__/apns.test.ts`. §7.2 asks for it "exactly as" 314's, and `vi.mock` must sit in each file;
  left as it is.

### Runs at the reconciled tree (the integrator)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | boundaries 1381 files, 7823 imports, 0 violations; no runtime cycles |
| `npx vitest run --no-cache` over `src/main/{alerts,harness,pocket,push,credentials}` and `src/renderer/settings` | 0 | 82 files, 1819 tests, 15 s |
| `conformance:pocket` | 0 | 52 rules, 12236 checks (12243 once `out/` existed, U5 read) |
| `conformance:pocket:hostile` | 0 | 96 arms |
| `conformance:push` | 0 | 25 rules, 2310 checks |
| `conformance:credentials` | 0 | rule 23 (e): callers exactly `alerts/index.ts` and `push-seam.ts`, a planted third reads red; 100 s |
| `conformance:ios` | 0 | 22 rules; red on (j) until `vectors.json` was regenerated, then PASS |
| `node build/p316/vectors.mjs`, then `--check` | 0, 0 | one line moved: `pairAnswers.pendingSends` = `{"state":"pending","alerts":true}` |
| `ablation:p316` | 0 | 154 of 154, 175 s |
| `ablation:p313` | 0 | 143 of 143, 579 s (run beside the other three) |
| `ablation:p314` | 0 | 40 of 40, 355 s |
| `conformance:phonecopy` | 0 | 63 words, 34 judged against the Mac, 29 the phone's own |
| `gate:simulator` | 0 | 10 of 10 bad fixtures, 9 controls, 22 of 22 helper ablations, floor 2 |
| `gate:electron` | 0 | 156 against a floor of 156 (no new script reaches the helper) |
| `gate:background`, `gate:checks`, `gate:knownhosts`, `assert-import-boundaries` | 0 | 19 of 19 fixtures; 240 check scripts classified |
| `gate:contract` | 1, then 0 | regenerated: exactly the five lines of §5.2.3 |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 176 alert cases |
| `xcodebuild archive` Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO` | 0 | 20 s; "code object is not signed at all"; `CFBundleVersion` 3 |
| `test-ios.mjs --read-app` on that archive | 0 | 1 Mach-O file; the pinned pass words; `registerForRemoteNotifications` present, no `TortieDebug` string, no NetworkExtension, UserNotifications linked |
| `xcodebuild build` Debug, Simulator SDK; `--read-app` on it (the control) | 0; 1 | the five seams found, no registration selector, as a control must |
| The phone builder's macOS XCTest harness, re-run by the integrator over the tree's sources and the regenerated vectors | 0 | 82 tests, 0 failures, `testThePairAnswersAreTheDoors` included |
| `npm run -s build` | 0 | 37 s |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 52 s, unsigned |
| Control bytes over the 67 touched files | — | 0 |

### Open concerns for the verifiers

1. **The rest sheet is not today's sheet.** A person with no key now sees the Alerts card holding `Apple push key`,
   `Not chosen.`, **Choose…** where the parent drew the alert switch. §7.6's "rectangles identical at rest" cannot
   hold; judge it against the no-regression rule (the parent's switch promised alerts it could not send). Also judge
   whether a Mac that is not his should show an Alerts card at all, since research 136 says no copy promises alerts.
2. **A stale Allow in the ordinary flow.** The phone now re-presents mid-window (with its address) when the Mac can
   send, which moves the confirm hash. An Allow pressed on lines drawn before the redraw (the sheet polls every
   second) is refused with Phase 330's "Tortie could not record what you agreed to, so it allowed nothing", and an
   Allow pressed while iOS's question is still up pairs with no address (the phone then says `Pair again to get
   alerts.`, at its next launch, not this one). Drive both.
3. **The probe infers "can send" from `pocket:status`** (`macCanSend`), not from the `/pair` bytes the phone received.
   Read the bytes too, or accept the phone's `notifications` line as the observable.
4. **`/pair` from the internet can start the one lazy key read** (only a phone holding the window's secret reaches
   `pending`); a pending answer also reads the confirm record file once. Only a yes or no leaves main.
5. **One frame of `Not chosen.`** the first time the sheet opens in a launch, before the lazy read answers.
6. Everything in §12 stands: the banner in XCUITest is unmeasured on 26.3 and 18.3; a cold-launch tap reaching the
   inbox before `RootView` observes it (N5); the compile-time environment's one wrong case; the sentence over a store
   read that failed; signing with his account is untestable by construction.
7. **Not run by anyone yet:** `test:ios`, `probe:p316` (budget 20 to 25 minutes, unmeasured), `probe:p313`,
   `probe:p330`, the smokes, and §7.6's parent measurement. The screen-level XCTest rows (`PairingModel`, `AppModel`,
   the list, the launch check) compile but have run only in the verifiers' future `test:ios`.

## §As built — 316.5's fix round (the fixer, 2026-09-30)

Two verdicts came back `needs_work`: lens 1 (the attack: hostile taps on a real iOS 26.3 Simulator, an Electron
driver of its own, 19 ablations) and lens 2 (the re-derivation: its own alert composer and ES256 verifier, the
parent measured, the owed probes run whole). This round fixes every major and minor of both, once. The fixer
launched no Electron and booted no Simulator, spent no model turn (0), read no key of his and reached no Apple
host. **Every claim below that needs a Simulator or an Electron is the reverifier's to run** (§"Owed to the
reverify" at the end).

### What was wrong, and what this round did

| # | Verdict | The defect | The fix |
| --- | --- | --- | --- |
| 1 | Lens 1, **major** | A tap on an alert for a session the Mac does not have almost never drew `Tortie no longer has a record of that session.` (5 taps of 5, from the list and from another session's screen). iOS hands the tap over BEFORE the scene is active, so `openFromAlert`, the 404, `backToList(saying:)` and the list's read ran first, and `cameToForeground()` then cleared the sentence. N6 passed only because the probe left the SAME session on screen, where the tap changes nothing | The sentence is cleared when he LEAVES the app (`AppModel.wentAway()`, called on `.background`), never on the return (`cameToForeground()` no longer clears it). `backToList(saying:)` now asks the list's read itself (`noticeRead`) instead of relying on the list reappearing, because a loopback door answers the 404 before the push that showed the session has finished. N6 now taps from the LIST (a new UI step, `back`) and a new arm, N6b, taps the same alert from ANOTHER session's screen (`visit:<id>`); the grader reads the dump before each ready line (`before`) and a tap not arranged as named is UNREADABLE, never a pass. XCTest: `testTheReturnATapBringsKeepsTheSentence` (both orders of read and return, from the list and from a session: each red on the old `cameToForeground`), `testTheSentenceGoesWhenHeLeavesAndOnTheNextAlert` |
| 2 | Lens 2, **major** | `probe:p313` could not finish: its census pressed the new `pocket:choosePushKey`, and a harness launch with no `GMUX_HARNESS_ALERTS` opened a real native file panel on his screen that nobody answered (90 s timeout, UNREADABLE). SPEC §5.2.4's "a probe never meets a native dialog" held only with the override | **Removed, not repaired** (his no-regression rule): a harness launch never opens the panel, override or none. `pickFile` returns null after the override's arm when `isHarnessLaunch(process.env)`, so the press answers `{ kept: false, refusal: null }` at once. **`conformance:push` P3 (NEW), THE PANEL**: `showOpenDialog` under `src/main/alerts/` only in `index.ts`, and every call in a function that FIRST returns on `isHarnessLaunch(process.env)`; ablations P3a (the return removed) and P3b (moved below the panel). Vitest: "a harness launch with NO override opens no panel". `build/probe-p313.mjs`'s census names `choosePushKey` and `forgetPushKey` as harmless presses, with the reason |
| 3 | Lens 1, minor | No gate held that each token's environment picks Apple's host in a person's launch: `apnsOrigin('production')` was green everywhere (V1) | P1 widened: the origin is a function of one parameter and every `apnsOrigin` call is handed THAT parameter. Ablation P1e. Vitest "a person's launch … hands the sender Apple's host BY EACH TOKEN'S ENVIRONMENT" reads `createApnsSender`'s options with a sender that dials nothing: `allowRemote` true, development → `https://api.sandbox.push.apple.com:443`, production → `https://api.push.apple.com:443`; and its pair under `GMUX_PROBES=1`, `allowRemote` false |
| 4 | Lens 1, minor | The durable drop of a dead token was held by nothing: `drop: () => undefined` was green (V3) | P1 widened: the engine's `drop` hands its destination's `tokenDigest` to `dropPushToken`. Ablation P1f. Vitest: a stand-in answering `410 Unregistered` and `400 BadDeviceToken` through the composition's own `drop` reaches `host.dropPushToken(digest)` |
| 5 | Both, minor | Every probe's RUN arm failed on his Mac while his own Tortie published its door: `realTailscaleIn` flagged ANY real `Tailscale funnel …` on the machine (his pid 40762, then 19779, parent 33203) | `build/p330/tailscale-standin.mjs`: a real Tailscale CLI whose parent is a LIVE process in the table and not under this run's roots is someone else's (`foreignTailscaleIn`), reported by pid as `notThisRun` (in `probe:p316` and `probe:p313`'s readings) and never failed or signalled. Still flagged: anything under the roots, an orphan (parent 1) and one whose parent is not in the table. The watcher now ACCUMULATES every root it was ever handed, plus the probe's own pid, so a relaunch cannot turn this run's earlier child into "someone else's". Three self-test rows (his Tortie's funnel not flagged and reported; the same funnel under a root flagged; this run's grandchild flagged); 38 checks PASS. Lens 2 called this a later round's; it is fixed here because both lenses named it and it failed every probe on his machine |
| 6 | Lens 1, minor | The quit bound was understated: with alerts armed and a send hung at Apple the join holds the quit about 5 s (measured 5,003 ms), not "three and three more" | Stated truly in `joinPhoneAlerts`'s comment and `capabilities.ts`: at most about five seconds (the engine's 3 s for a send in flight, then the sender's 2 s close); the chain's own 3 s is never added, because a step still running holds no engine. `src/main/push/**` is not edited, so the bound is stated, not lowered. SPEC §5.1 "The quit" is corrected by this line |
| 7 | Both, minor | An Allow pressed on the Mac while iOS was still asking paired with no address and said `Pair again to get alerts.` only at the NEXT launch; an Allow over lines drawn before the phone re-presented was refused with Phase 330's sentence about confirming the door | (a) The phone runs the launch's address check the moment a pairing ends (`AppModel.paired` → `addressCheck`), so that case says `Pair again to get alerts.` at once (XCTest `testAPairingThatHeldNoAddressSaysSoAtOnce`, both ways). (b) `PocketPairing.allow` refuses a hash that moved, before anything is signed or written, in the pairing card's words: "What this phone would be allowed changed after it was shown. Read it again and allow what it says now. Nothing was changed." (a throw, as `confirmPocketDoor`'s was, which the sheet draws; vitest in `pairing.test.ts`: the older sheet refused with that sentence, the fresh one pairs with the address). (c) The checklist's row 6 says both, and keeps "Press Allow on the phone first". The Mac-side "hold Allow until the second presentation" was NOT built: it changes the pairing window's states, its gates and the sheet, which a single fix round should not |
| 8 | Lens 1, minor | Pairing the phone with a second Mac: the first Mac keeps the token and goes on alerting, and a tap asks the second Mac for a session it never had; the alert names no Mac | Named in the checklist's "Not covered yet" ("One Mac per phone … Remove the iPhone on the Mac you no longer pair it with"). A Mac digest in `tortie` is a later phase's |
| 9 | Lens 1, nit | A phone row read `Alerts on` whenever it held a token, after the key was forgotten or the switch turned off (research 136: no copy promises alerts) | `alertsReachPhones(status)` (switch on, confirmed, key kept) gates the chip; vitest over the three ways it is false |
| 10 | Lens 1, nit | Every person's sheet shows `Apple push key · Not chosen. · Choose…` at rest | **His call, unchanged.** It promises nothing and is not worse than the parent's switch that could never send (both lenses: `worse: false`). Hiding the card leaves Choose… no home; he rules |
| 11 | Lens 2, nit | The smoke harness left Electron's crashpad handler running | Not fixed: it predates this phase and is `build/harness-socket.mjs`'s, outside this phase's files |
| 12 | Lens 2, nit | §7.4's budget and §7.6's "rectangles identical" | Measured by lens 2: `probe:p316` took 21.5 minutes (1,287 s, two extra taps included); CLAUDE.md's row now says so. §7.6 as it stands: the section rectangle [224,24,512,414] and 20 of 25 elements identical, every byte above the Alerts card identical, the Alerts row in the same box with research 136's content |

### Where §5 and §7 now read differently

- §5.6.4 "cleared … on his next return to the foreground" is now "cleared when he leaves the app": the return a
  tap causes must keep what that tap said. And the list's read that says the sentence is asked by the refusal
  itself, not left to the list appearing.
- §5.1 "The quit": at most about five seconds with alerts armed and a send hung, as row 6 says.
- §5.2.4's "a probe never meets a native dialog" is now true of every harness launch (P3).
- §7.4: N6 is tapped from the list after a `back`; N6b, from another session's screen after `visit:<id>`. The
  UI test protocol gains those two steps (`P316DriveUITests.swift`, `probe-p316.mjs`'s header).
- `conformance:push` is 26 rules; `ablation:p314` is 44 arms; `probe:p316 --grader-self-test` is 184 cases.

### Runs at the fixed tree (the fixer)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npx vitest run --no-cache src/main/alerts` | 0 | 2 files, 35 tests |
| The three new alerts tests against their clause removed, in place, restored and `cmp`-checked | red, red, red | V1 → the origin test red; V3 → both drop tests red; the harness return removed → the panel test red |
| `npx vitest run --no-cache` over `src/main/{alerts,harness,pocket,push,credentials}` and `src/renderer/settings` | 0 | 82 files, 1,826 tests (1,819 before) |
| `npm run -s typecheck` | 0 | 1,381 files, 7,823 imports, 0 violations; no runtime cycles |
| `conformance:push` | 0 | 26 rules, 2,317 checks (P1 11, P3 3) |
| `ablation:p314` with `P314_ONLY=P1e,P1f,P3a,P3b` | 0 | 4 of 4 newly red on their own rule, 35.6 s |
| `conformance:pocket`, `conformance:pocket:hostile` | 0, 0 | 52 rules, 12,262 checks; 96 arms |
| `conformance:credentials` | 0 | 54 s; rule 23 (e): exactly `alerts/index.ts` and `push-seam.ts` |
| `conformance:ios` | 0 | 22 rules over 23 app files and 18 test files |
| `ablation:p316` | 0 | 154 of 154, 113 s |
| `node build/p330/tailscale-standin.mjs --self-test` | 0 | 38 checks |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 184 cases (176 before: N6's arrangement four, N6b three, the tap reader's `before` one) |
| `xcodebuild build-for-testing`, Simulator SDK, Debug and Release (`ENABLE_TESTABILITY=YES`), ad hoc, `dd-fixer` | 0, 0 | TortieApp, AlertsTests and P316DriveUITests compiled; no Simulator booted |
| `xcodebuild archive` Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO`; `--read-app` on it | 0; 0 | 9 s; `CFBundleVersion` 3; the pinned pass words |
| `--read-app` on the Debug Simulator app (the control) | 1 | 11 problems, as a control must: the seams present, no registration |
| `contract-inventory --check`, `assert-import-boundaries`, `gate:simulator`, `gate:electron`, `gate:background`, `gate:checks` (hermetic), `gate:knownhosts`, `conformance:phonecopy`, `copy-drift --self-test`, `vectors.mjs --check` | all 0 | no contract line moved; `HELPER_USER_FLOOR` 156 against 156 (no new script reaches the helper); floor 2 for the Simulator helper |
| `ablation:p314` whole | 0 | 44 of 44 newly red on their own rule, 293 s |
| `npm run -s build` | 0 | 31 s, with `conformance:ios` and `gate:contract` inside it |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 47 s, unsigned |
| The integrator's duplicated-block scan, re-run | — | the same one group as before (the `node:http2` fence, deliberate, §As built above) |
| `LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over the 20 files this round touched | — | 0 |
| `ablation:p313` whole | 0 | 143 of 143, 421 s (run beside the other two ablations) |

The macOS XCTest harness (`phone/harness`) was not re-run: it compiles copies of `Door/` and `Alerts/`, and this
round changed neither; the new XCTest rows live in `AlertsTests` against `AppModel`, which needs UIKit and so
runs only in `test:ios`.

### Owed to the reverify (run live, under THE LOCK)

1. **The major, live.** `probe:p316`'s N6 (now from the list) and N6b (from another session's screen) on iOS 26.3,
   and the verifier's own VX5R shape: a tap on an alert naming a session id that never existed, from the list
   three times and from another session's screen once. Each must draw `Tortie no longer has a record of that
   session.` The fix assumes SwiftUI delivers `.background` when he leaves (the scene-phase change the app's
   `wasAway` already relied on), not on the way back; a sentence missing after a tap would say otherwise.
2. **`test:ios`** on 26.3 and 18.3, Debug and Release: the new rows `testTheReturnATapBringsKeepsTheSentence`,
   `testTheSentenceGoesWhenHeLeavesAndOnTheNextAlert`, `testAPairingThatHeldNoAddressSaysSoAtOnce`, and the two
   rewritten gone-session rows have only been COMPILED (Debug and Release `build-for-testing`).
3. **`probe:p313` whole**, which must now finish: C0 answers `pocket:choosePushKey` at once with no panel. And its
   RUN arm, `probe:p316`'s, `probe:p330`'s and `probe:p332`'s with his door on: his Funnel child must appear under
   `notThisRun` by pid and the arm must not fail on it.
4. **The Allow timings** neither verifier drove: Allow on the Mac while iOS is still asking (the phone must say
   `Pair again to get alerts.` as the pairing ends), and an Allow inside the second after the phone re-presents
   (the Mac must refuse with "What this phone would be allowed changed after it was shown. …" and a fresh Allow
   pair).
5. **The `Alerts on` chip**: drawn with a key kept and the switch on and confirmed; gone after Forget.
