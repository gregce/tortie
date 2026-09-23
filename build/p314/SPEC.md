# Phase 314 — the phone is told, once, when a session starts waiting on him

This file is the surface the builders build to and the proof binds to. It was written against the tree at
`ce754649` (origin/main, the Phase 313 landing plus its docs commit), with the Phase 314 entry in
`docs/BACKLOG.md` (`## Phase 314 `, line 33279), research 127 §6 and §8, research 128 §2, §5 and §8 item 8, the
Phase 313 entry as landed, `build/p313/SPEC.md` (both "As built" sections and "the page, ruled out") and
`docs/method/HOW-WE-VERIFY-THIS.md` §1 open beside it.

**Where this file and the entry disagree, this file wins, and §1 says why at every point with the file and
line that proves it.** The entry was written on 2026-09-21, before Phase 313 was built, and four of its
assumptions are false of the tree that landed on 2026-09-22.

**Tier 3**, by two of CLAUDE.md's questions outright: it holds a credential (Ita Vero's APNs provider key) and
it sends his words (session names, project names) to a vendor. Two independent methods, one an attack, a fix
round if any verdict is `needs_work`, and an independent reverify of that fix.

**NOTHING IN THIS PHASE IS VISIBLE TO A PERSON, AND IT SHIPS NO RELEASE AND NO CHANGELOG ITEM.** The sender,
the key store, the wake rule and the alert are built, gated and attacked. Nothing in an ordinary launch
composes them, because the only thing a push can go to is a phone paired through Phase 313's door, and that
door is switched on by nothing until Phase 316 (313 mechanism 9, unbuilt). A CHANGELOG item would describe a
sender with nobody to send to. `## Unreleased` is not touched, and the round that makes the phone real (316)
writes the item fresh. The entry's Semver paragraph ("After this phase his phone is told") is false of any
tree this phase can produce and is corrected in §1.

---

## 1. Where the entry disagrees with the tree, and the decision at each seam

### 1.1 The four the orchestrator named

| # | The entry says | The tree | Decision |
| --- | --- | --- | --- |
| 1 | "The status word from the label table Phase 313 moved to `src/shared/`" (mechanism 4) | **No `src/shared/status-words.ts` exists.** 313 mechanism 8 is marked NOT BUILT (`docs/BACKLOG.md` Phase 313 mechanism 8; `build/p313/SPEC.md` "§As built … What §1 to §5 got wrong", row §1). The door reads its word through the injected `PocketFacts.statusWord` (`src/main/pocket/routes.ts:175`, used at `:237`). `statusVisual` stays in `src/renderer/app/status.ts:296` because the module imports the store. | **Reuse what the door reads; do not build the move.** The alert is composed FROM the door's own `/v1/blocked` rows (§2.1), so its status word is `row.statusLabel`, which is exactly what the door would answer. Only a `needs_input` row can ever join the blocked set (`attentionRows`, `src/main/tray/attention.ts:48-64`), so the only word an alert can ever draw is `statusVisual`'s `needs_input` arm, `'needs input'` (`status.ts:303-304`). **Cost, named:** there is still no main-side spelling of that word. In this phase the only composer of `PocketFacts` is the harness seam (§5), which answers `statusWord` with that one word spelled once; `conformance:push` rule `S1` holds the seam's spelling byte-equal to `status.ts`'s `case 'needs_input'` arm read as text. Two spellings held equal by a gate is weaker than one spelling, and 313 mechanism 8 remains the wiring round's (316) to build. The move was the larger choice: it touches the renderer's `statusVisual`, re-points the six owned rules in `build/p311/copy-drift.mjs` whose module is `status.ts`, and changes nothing a phone can see in this phase. |
| 2 | "The switch is an execution-bearing field on Phase 313's confirm" (mechanism 5) | 313's confirm hashes `PocketExecutionFields` (`src/main/pocket/pairing.ts:166`): `bindAddress`, `port`, `bindAtLaunch`, `routes`, `phones`, through `NORMALIZE` (`:197`) under `sha256-pocket-exec-v1`. There is no Settings → Phone, no confirm sheet, and `registerPocketIpc` (`src/main/pocket/ipc.ts:478`) is called from nowhere; `new PocketHost` appears in no production file. | **`pushAlerts: boolean` becomes a sixth field of `PocketExecutionFields`, hashed, default `false`, stored in the sealed `PocketStore`.** Turning it on moves the door's hash, so both the door and the push refuse until a person confirms again through `PocketHost.confirmDoor` (`ipc.ts`), which supplies `POCKET_CONFIRM_ACKNOWLEDGEMENT` in main. Each paired phone's device token and APNs environment also enter the hash (§1.1 row 3), because they decide WHERE his words go — `confirm.ts:144`'s rule read literally. The algorithm name moves to `sha256-pocket-exec-v2` because the canonical text changed shape; no v1 record exists in the wild (the door has never been switched on), and a record written under v1 would read as `changed` (`pocketConfirmStatus` compares the hash; `readConfirmRecords` uses the algorithm name only as a fallback, `src/main/config/confirm-record.ts:120-121`), which is the safe direction. **No Settings surface, no IPC channel and no menu row are invented here:** the switch is `PocketHost.setPushAlerts(on)`, reached in this phase by the harness seam and the tests only; the channel, the sheet and the row are 316's, with 313 mechanism 9. **Turning OFF takes effect for the push at once** (the engine reads the stored switch before anything else) and, like every field change under 313's rule, makes the door ask again; 316's sheet confirms that in the same press. |
| 3 | Where the phone's APNs device token comes from is not said; "no write route, and no route at all added to Phase 313's closed table" | `POCKET_ROUTES` (`routes.ts:115`) is frozen, four rows, `R4` pins its membership by sha256 `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080` (`build/conformance-pocket.mjs:491`). `/pair` is POST, window-only, unsigned, sealed under the QR's one-shot secret (`pairing.ts` `PocketPairing.present`, `openPresentation` `:837`), body cap 4 KiB (`:692`). | **The token rides inside the pairing presentation, the sealed inner JSON `POST /pair` already carries.** Two new optional keys beside `label`, `ek`, `xk`: `apt` (the device token, hex) and `ape` (`'development'` or `'production'`, the environment the phone's `aps-environment` entitlement minted it in — research 128 §5 and §8 item 8). No route is added, no path moves, `R4`'s pin does not move. A presentation whose `apt` is not lowercase-normalisable hex of 32 to 256 characters, or whose `ape` is not one of the two words, or that carries `ape` without `apt`, is refused WHOLE with the one word `refused`. **When Apple rotates the token, the answer is "pair again", and it is a limit, named.** Apple's own page: "APNs issues a new token when the user restores a device from a backup, when the user installs your app on a new device, and when the user reinstalls the operating system" (https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns). Apple tells the provider by answering `410 Unregistered` (or `400 BadDeviceToken`); the engine drops that token (§3.4), the phone's view reads `alerts: 'stopped'`, and `PUSH_TOKEN_STOPPED` is the sentence 316's Settings draws. All three of Apple's causes are a restore, a new phone or a reinstall, after which the pairing itself is usually gone too. A later route that lets a paired phone refresh its token is a write route, is its own entry with its own tier, and is refused here. |
| 4 | "`HELPER_USER_FLOOR` rises from 147 (`build/assert-electron-teardown.mjs:272`)" | `const HELPER_USER_FLOOR = 148;` at `build/assert-electron-teardown.mjs:282`. The 313 entry already recorded this correction. | **It rises from 148 to 149**, in the commit that adds `build/probe-p314.mjs`, the one new script reaching `build/electron-run.mjs`. |

### 1.2 The other places the entry is wrong or loose, found reading the tree

| # | The entry | The tree, or Apple | Decision |
| --- | --- | --- | --- |
| 5 | "the thread id is the session id — so a session that blocks twice replaces its own card rather than stacking, which is Apple's own mechanism" (mechanism 3) | `thread-id` GROUPS: "An app-specific identifier for grouping related notifications" (https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification). What REPLACES is the `apns-collapse-id` header: "An identifier you use to merge multiple notifications into a single notification for the user … The value of this key must not exceed 64 bytes" (https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns). | **Both carry the session id** on a single alert (a `randomUUID()`, 36 bytes, `src/main/sessions/create-local.ts:425`). The re-block attack asserts the HEADER, because that is the mechanism that keeps one card. |
| 6 | "The badge is the count of blocked rows and rises for nothing else" (mechanism 4) | A badge written only by alerts cannot FALL, so after he answers at the Mac the phone's badge keeps a count of sessions that no longer wait. That is "a number that … is noise" (`attention.ts:1-11`). | **A badge-only correction is sent when the blocked count FALLS below the last badge sent**: `{"aps":{"badge":N}}`, no alert, no sound, no word, `apns-priority: 5`, `apns-expiration: 0` (Apple: "If the value is `0`, APNs attempts to deliver the notification only once and doesn't store it", so it can never displace a stored alert while the phone is offline). It never RISES: a rise only ever arrives inside an alert, and an alert only ever follows a join. Driven by `E1` and `E3`. |
| 7 | "`apns-priority: 10`" as the whole of it | Apple: "Specify `10` to send the notification immediately. Specify `5` to send the notification based on power considerations". | Alerts are `10`. The badge-only fall (row 6) is `5`. |
| 8 | Semver: "After this phase his phone is told, once, when a session starts waiting on him" | Nothing in an ordinary launch composes the sender; pairing is unreachable (row 2); there is no phone app until 316. | Corrected in the header of this file: nothing is user-visible; no release; no CHANGELOG item. |
| 9 | "The one proof that cannot be a stand-in, run once by the integrator and not in the battery: one real push to his own phone, timestamped at both ends" | There is no app to receive it, and this phase's hard rules forbid a real APNs key and a real push. | **Struck from 314.** It is the first line of 316's TestFlight checklist. Every number this phase reports is about the bytes Tortie sends to a loopback stand-in and never about delivery. |
| 10 | The sentence "Ages start again when Tortie restarts on your Mac **or when your Mac wakes**" is "still copy in this commit" (mechanism 2) | False for rows seen before the sleep: `blockedSince` keeps a row's stamp for as long as it stays blocked (`prev.get(session.id) ?? now`, `attention.ts:42`), and a sleep does not restart the process, so those rows keep their true age. Only rows FIRST SEEN in the wake window read from the wake. | **The sentence that ships is `POCKET_AGE_HONESTY = 'Waits first seen after your Mac wakes or Tortie restarts are timed from then.'`** (NEW), a constant in `src/shared/ipc/pocket.ts` beside the other honesty sentences, drawn by 316's app and by nothing in 314. |
| 11 | The wake alert says the rows "blocked during" the sleep | For a LOCAL agent that is not what happens: when the Mac sleeps the agent's process sleeps too. What the wake window gathers is (a) the flurry of rows that reach a dialog in the first seconds after the wake as frozen agents resume, and (b) anything the poll could not see before the freeze. For both, the only true statement is "first seen when the Mac woke". | **The wake alert says `Seen when your Mac woke`** (NEW) and never "while asleep". It is true of every row it covers. |
| 12 | "The alert carries … the machine" (mechanism 4); research 127 §6 lists the same five slots | `remoteRowStatus` never produces `needs_input` (`src/main/machines/remote-sessions.ts:1032-1034`), so every row that can join is on this Mac and the door answers `machine: null` for it. The approved mock (`docs/design/phone/Lock.html`) draws `fix-login needs input` over `webapp · Claude Code` and no machine. | The composer draws the machine only when it is non-null, and the engine filters `machine !== null` rows out before anything (`E2`), so the machine is never drawn in this phase. The slot exists so a later ruling on research 127 §11.5 does not have to invent one. |
| 13 | "`PowerMonitorLike` … the monitor is injectable (`:118`)" and `VaultSeal` "(`:128`)" | `PowerMonitorLike` is at `src/main/power/index.ts:65-68`; the injection is `deps.monitor ??` at `:217`. `VaultSeal` is at `src/main/credentials/vault.ts:137`. `sealedVault` is at `:258` as the entry says. | Line numbers corrected; nothing depends on them. |
| 14 | The trigger is "a row that JOINS the blocked set" off `blockedSince` | True, but the map lives in a module-level `since` in `src/main/tray/index.ts:51`, updated only by the tray's `refresh`, fed by `core.onSessionsBroadcast`, which is ONE SLOT (`src/main/sessions/core.ts:885`, called at `:2466`) that the tray assigns (`tray/index.ts` `installTray`). A second consumer that assigned the slot would silently unplug the menu-bar sentinel. And `PocketFacts.blockedSince`'s own promise (`routes.ts`, "The door is handed the SAME map") has no producer outside the tray. | **The map and the slot move into ONE owner, `src/main/tray/blocked-feed.ts`** (§9.2), which assigns the slot once and fans out. The tray subscribes to it and behaves byte for byte as before; the push engine and (from 316) the door read the same map. Pinned by the tray's own tests plus a feed test. |
| 15 | Research 128 §8 item 8: "`src/main/push/apns.ts` selects its host from the build's `aps-environment`" | The Mac has no build of the phone's; the environment is a fact of the TOKEN, which the phone knows. | The host is chosen PER DESTINATION from the environment the phone presented with its token (row 3). A token sent to the other environment is answered `400 BadDeviceToken` by Apple ("Verify … that the token matches the environment") and is dropped like a 410. The stand-in reproduces that (§5.2). |
| 16 | Tortie restarting is not mentioned | On launch the engine's first sight of the blocked set would make every blocked row a "join" — the same twenty-cards failure as the wake. | **The engine's first observe SEEDS SILENTLY** (`E6`). Named limit: a session that started waiting while Tortie was not running is never alerted; it is in the badge of the next send and in the list when he opens the app. |

### 1.3 Two things the entry does not touch and 316 must read

- **316's item 8 duplicates this phase** ("`src/main/push/apns.ts` beside the credentials domain … Web push is removed in the same commit") and its item 10 says "the push switch and the pairing rows live in the Settings → Phone section the door phase already added", which does not exist. There is no web push in the tree to retire (313's page is gone). This is recorded for the orchestrator; this phase does not edit 316's entry.
- **His two open questions from 313 stay his.** The alert's tap will ask `/v1/session?id=`, which today answers any id (313 question 2); and the door's address rule (313 question 3). Nothing here answers either, in code or in copy.

---

## 2. The alert, exactly

### 2.1 Where its words come from

The alert is composed FROM the door's own answer: `createPocketRoutes(facts).blocked().rows` (`routes.ts`), the same composer `GET /v1/blocked` runs, in `attentionRows`'s order (newest-blocked first). The composer READS ONLY these row fields, and `conformance:push` rule `A2` holds the list by AST:

`sessionId`, `name`, `project`, `machine`, `agentLabel`, `statusLabel`, `seenAtWake`

It never reads `question`, `choices`, `statusDot`, `blockedSince`, `catchUp`, `lastAnswer`, `turnCount`, `handoff`, and no answer text of any kind. **Never the question, never an excerpt, never a conversation byte: a native alert is JSON Apple reads** (research 127 §6). The question stays behind the tap, which reads it from the door.

Every string the alert draws is one of:

| Piece | Source | Status |
| --- | --- | --- |
| the session's name | `row.name` | the person's own words (data) |
| the status word | `row.statusLabel` → `'needs input'` | Tortie's (`status.ts:303-304`), §1.1 row 1 |
| the project's name | `row.project` | data |
| the agent's name | `row.agentLabel`, e.g. `Claude Code` | Tortie's (`src/main/agents/registry.ts:504`, `displayName`) |
| the machine | `row.machine` when non-null (never, §1.2 row 12) | data |
| `Needs your input` | `NEEDS_YOUR_INPUT` in `src/main/tray/attention.ts` (moved out of `tray/index.ts`'s literal) | Tortie's: the tray's header and ⌘J's `Needs your input (` (`src/renderer/app/AttentionOverlay.tsx`) |
| `Seen when your Mac woke` | `PUSH_WAKE_SEEN` in `src/shared/push-copy.ts` | **NEW** |
| ` · `, ` (`, `)`, `…` | the composer | Tortie's separator and ellipsis |

The single alert's first line is the approved mock's (`docs/design/phone/Lock.html`: `fix-login needs input` over `webapp · Claude Code`), which `build/p311/copy-drift.mjs` has carried as owed by Phase 314 (`/^[a-z0-9-]+ needs input$/`). It moves to `owned` in this commit (§6.6).

### 2.2 The three shapes, and when each is used

- **single** — exactly one row is announced and it is NOT `seenAtWake`.
- **count** — two or more rows are announced, or any announced row is `seenAtWake` (so a wake is always said, even for one row).
- **badge** — nothing is announced and the blocked count fell below the last badge sent (§1.2 row 6).

`announce` is the set of rows that JOINED since the last send and are STILL blocked when the send is composed, in the door's order. `N`, the blocked count, is the number of door rows with `machine === null` at compose time. It is the badge and it is the number ⌘J's `Needs your input (N)` header draws (⌘J counts `effectiveStatusOf(x) === 'needs_input'`, the renderer's view of the same status, `src/renderer/app/AttentionOverlay.tsx:204-214`), so the phone's badge, the card's title and ⌘J's header say one number.

### 2.3 The exact bytes

`JSON.stringify` with no spacing, keys in EXACTLY this order. The verifier's re-derivation byte-compares against these rules.

**single**

```json
{"aps":{"alert":{"title":"<name> <statusLabel>","body":"<project> · <agentLabel>"},"badge":N,"sound":"default","thread-id":"<sessionId>"},"tortie":{"v":1,"session":"<sessionId>"}}
```

(When `machine` is non-null the body is `<project> · <agentLabel> · <machine>`; never in this phase.)

**count**

```json
{"aps":{"alert":{"title":"Needs your input (N)","body":"<body>"},"badge":N,"sound":"default","thread-id":"tortie-waiting"},"tortie":{"v":1}}
```

`<body>` is the announced rows' names joined by ` · `, newest first, prefixed by `Seen when your Mac woke · ` when ANY announced row is `seenAtWake`. The wake alert's sentence is therefore, for three rows:

`Needs your input (3)` / `Seen when your Mac woke · w3 · w2 · w1`

**badge**

```json
{"aps":{"badge":N}}
```

What is deliberately absent from every shape: `mutable-content` (the Notification Service Extension is later Swift), `content-available`, `category`, `target-content-id`, `relevance-score`, and **`interruption-level`**, so iOS uses its default `active`. `time-sensitive` and `critical` are refused: the first needs an entitlement this app will not ask for and the second "would be a lie about severity" (entry, What is NOT). `sound` is `"default"` on alerts (Apple: "Specify the string `"default"` to play the system sound"), so the person controls it in iOS Settings; it is absent on the badge shape. The `tortie` key carries the session id for the tap and nothing else; the id is an opaque UUID and not a conversation byte.

### 2.4 The ceiling

Apple: "For all other remote notifications, the maximum payload size is 4 KB (4096 bytes)"
(https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification). The composer
guarantees `Buffer.byteLength(payload, 'utf8') <= 4096` by a DETERMINISTIC clip, pinned here so the
re-derivation can reproduce it byte for byte:

1. Compose. If it fits, send it.
2. **single**: replace `row.name` with its longest prefix of whole code points followed by `…` such that the payload fits. If the empty name plus `…` still does not fit, do the same to `row.project`, then to `row.agentLabel`.
3. **count**: drop names from the END of the body one at a time, appending ` · …` once after the last kept name, until it fits. If only the first name (and the wake segment) is left and it still does not fit, clip that name as in step 2.
4. No lone surrogate is ever produced (a code point is never split), and the result always parses as JSON.

### 2.5 The headers

| Header | Alert | Badge-only | Source |
| --- | --- | --- | --- |
| `:method` | `POST` | `POST` | Apple, sending page |
| `:path` | `/3/device/<token>`, lowercase hex, refused before composing if not hex | same | Apple: "`<device_token>` is the hexadecimal bytes that identify the user's device" |
| `authorization` | `bearer <provider token>` (§2.6) | same | Apple, token page |
| `apns-topic` | the key record's `topic` (the phone app's bundle id) | same | Apple: "In general, the topic is your app's bundle ID/app ID" |
| `apns-push-type` | `alert` | `alert` | Apple: "`alert`: The push type for notifications that trigger a user interaction—for example, an alert, badge, or sound" |
| `apns-priority` | `10` | `5` | Apple, quoted in §1.2 row 7 |
| `apns-expiration` | `floor(now/1000) + 3600` | `0` | Apple: "If the value is nonzero, APNs stores the notification and tries to deliver it at least once … If the value is `0`, APNs attempts to deliver the notification only once and doesn't store it." One hour: long enough to survive a tunnel, short enough that a morning's card does not arrive at night. |
| `apns-collapse-id` | single: the session id; count: `tortie-waiting` | absent | Apple, quoted in §1.2 row 5 (64 bytes max; a UUID is 36) |
| `apns-id` | absent | absent | Apple: "If you omit this header, APNs creates a UUID for you" |

Hosts, from Apple (same page): development `https://api.sandbox.push.apple.com:443`, production
`https://api.push.apple.com:443`, over "HTTP/2 and TLS 1.2 or later". **Each host string is spelled exactly
once in `src/`, inside `apnsOrigin` in `src/main/push/apns.ts` (`H1`), and nothing in this phase ever dials
either** (`H2`, `H3`). Apple asks providers to "Reuse a connection as long as possible"; the sender keeps one
HTTP/2 session per origin, closes it after 30 minutes idle, on `suspend` (its sockets do not survive a sleep)
and on shutdown.

### 2.6 The provider token

Apple (https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns):
header `{"alg":"ES256","kid":"<key id>"}`, claims `{"iss":"<team id>","iat":<seconds>}`, "APNs supports only
the ES256 algorithm", base64URL, sent as `bearer <token>`; "Refresh your token no more than once every 20
minutes and no less than once every 60 minutes"; "If the value in the `iat` field is more than one hour old,
APNs rejects any notifications containing the token, returning an `ExpiredProviderToken` (403) error."

- **Signing input, pinned byte for byte:** `b64url('{"alg":"ES256","kid":"' + keyId + '"}') + '.' + b64url('{"iss":"' + teamId + '","iat":' + iat + '}')`, `iat` an integer number of seconds, base64url with no padding. The signature is `crypto.sign('sha256', input, { key, dsaEncoding: 'ieee-p1363' })`, 64 bytes, base64url.
- **Reuse:** the token is reused while `0 <= now - iat < 50 min` by the WALL clock (a monotonic clock does not advance during a sleep on macOS, so an eight-hour sleep would read as a young token). At 50 minutes or more it is re-minted. **If `now - iat < 0` (the clock moved backwards) it is REUSED, not re-minted** — Apple judges the token by Apple's clock, and re-minting on every backwards jump would trip `TooManyProviderTokenUpdates`.
- **A 403 `ExpiredProviderToken`** re-mints once and retries that one request once. A second 403 on the retry stops with a sentence. There is never a third attempt.
- The key is never logged, never in an argv, never in any answer, and never leaves the Mac. The token string is never logged either.

### 2.7 Apple's answers, and what each does

From https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns.

| Answer | Kind | What the engine does |
| --- | --- | --- |
| `200` | ok | nothing more |
| `410 Unregistered`, `410 ExpiredToken` | `drop` | drops that destination's token (§3.4) and never sends to it again. Apple: "There is no need to send further pushes to the same device token" |
| `400 BadDeviceToken` | `drop` | the same: a token for the other environment, or a garbled one, cannot succeed on retry |
| `400 DeviceTokenNotForTopic`, `400` other, `403 InvalidProviderToken`, `403 MissingProviderToken`, `413` | `stop` | stops sending for as long as the SAME key record is in place, and says `PUSH_KEY_REFUSED` once. The token is NOT dropped: the fault is the key or the topic, not the phone |
| `403 ExpiredProviderToken` | `reauth` | §2.6 |
| `429` | `later` | no retry; the next join or fall sends the current state |
| `500`, `503`, a stream or connection error | `retry` | exactly ONE retry after 15 s, recomposed from the rows as they are then (a row answered in the meantime is not announced); a second failure says `PUSH_UNREACHABLE` once and gives up |

---

## 3. The wake rule, exactly

### 3.1 The one age function

```ts
// src/main/tray/attention.ts
export interface WakeWindow { readonly suspendedAt: number | null; readonly resumedAt: number }
export const WAKE_WINDOW_MS = 15_000;
export function blockedAge(stamp: number, wakes: readonly WakeWindow[]): { readonly since: number; readonly seenAtWake: boolean }
```

`seenAtWake` is `true` when `stamp >= w.resumedAt && stamp <= w.resumedAt + WAKE_WINDOW_MS` for ANY `w` in
`wakes`. `since` is `stamp`. Pure, wall-clock epoch ms, the same clock `blockedSince` stamps with. **It is the
only place in `src/` that compares a stamp with a resume time** (`conformance:push` rule `Y1`), and every
surface that draws an age reads its answer:

- **the door's `/v1/blocked` answer** — `PocketBlockedRow` gains `seenAtWake: boolean`, set in `routes.ts`'s `rowOf` from `blockedAge(stamp, facts.wakes())`. `blockedSince` is unchanged. A client draws `since your Mac woke` for a `seenAtWake` row and an age from `blockedSince` otherwise. (`PocketSessionDetail` extends the row and carries it too.)
- **the alert** — reads `row.seenAtWake` off the same row and never recomputes it (§2.3).
- **316's settings line** — `POCKET_AGE_HONESTY` (§1.2 row 10).

So the alert and the door cannot disagree: the alert IS the door's rows. ⌘J's own ages come from the
renderer's `attentionSince` map (`src/renderer/app/AttentionOverlay.tsx`) and read "just now" after a wake
exactly as they do today; that is not a surface this phase moves, and it is named rather than fixed.

### 3.2 Why fifteen seconds

A chosen number, stated as chosen. The poll runs at 2 s when no Tortie window has focus
(`STATUS_POLL_IDLE_MS`, `src/main/sessions/core.ts:557`, which is the case on a Mac that has just woken), a
dialog needs `DIALOG_CONFIRM_TICKS = 2` consecutive captures (`src/main/activity/state-machine.ts:51`), and
the resume schedules an immediate reconcile (`src/main/index.ts:745`, `core.scheduleRefresh()`). So a
dialog on screen at the first tick after the wake is confirmed within about 4 s; frozen agents resuming and
reaching a dialog take seconds more. Fifteen is about four times the confirm span. `E5` drives both edges
(a row first seen at 15,000 ms is in the batch; one at 15,001 ms is not).

### 3.3 The window, step by step

1. **`suspend`** (from `WakeMark`, §9.2): the engine marks itself asleep, cancels its pending timer (the rows already pending stay pending), and closes its HTTP/2 sessions.
2. **`resume`**: `WakeMark` records `{ suspendedAt, resumedAt: now }` (at most 16 remembered, oldest dropped). The engine clears asleep, sets `wakeUntil = monotonic() + WAKE_WINDOW_MS`, cancels any timer, and schedules ONE flush at `WAKE_WINDOW_MS`.
3. **Inside the window**, every join goes to `pending` and schedules nothing. A join is suppressed, which is the entry's word.
4. **The flush** composes ONE alert from `pending ∩ still blocked`, in the door's order: count shape, `Seen when your Mac woke` when any row is `seenAtWake` (§2.2). Rows pending from before the suspend fold into the same alert with `seenAtWake: false`, because their stamp is true.
5. **After the window**, ordinary coalescing resumes (§3.5).

The WAKE is told by `WakeMark` over an injected `PowerMonitorLike` (`src/main/power/index.ts:65-68`), so every
test, the gate and the probe drive it without sleeping a machine. In production the composer (316) hands
`WakeMark` Electron's `powerMonitor`, the same object `installPowerHandlers` already listens to
(`src/main/index.ts:719`); two listeners on one event, and `src/main/power/index.ts` is not edited.

### 3.4 The drop

A `drop` answer calls `deps.drop(destination)`, which the composer wires to `PocketHost.dropPushToken(tokenDigest)`:
the token's sha256 goes into the sealed `PocketStore.deadPushTokens` (at most 64, oldest dropped),
`pushDestinations()` stops answering it, the phone's view reads `alerts: 'stopped'`, and the engine says
`PUSH_TOKEN_STOPPED` once. **`deadPushTokens` is NOT a hashed field**: a subtraction that can only narrow where
his words go needs no human, and hashing it would switch the door off on every 410. The dead list survives a
restart because it is in the sealed store. Pairing the same phone again with a NEW token is a new digest and
is live; with the SAME token it stays dead.

### 3.5 Ordinary time

- The first join after a send opens a window: the flush fires at `max(COALESCE_MS, lastSentAt + ALERT_FLOOR_MS − now)` on the monotonic clock, with `COALESCE_MS = 4_000` (`DIALOG_CONFIRM_TICKS × STATUS_POLL_IDLE_MS`: the spread across which rows flipped by one event are confirmed) and `ALERT_FLOOR_MS = 30_000` (chosen).
- Everything that joins before the flush is in it. A row that joins and leaves inside the window is not announced.
- A fall below the last badge with nothing to announce schedules the same flush, which sends the badge shape.
- **Nothing rises for `working` or `idle`, ever** (research 127 §4): a join is a row entering `attentionRows`, which admits `needs_input` alone.
- **Nothing rises for a Mac Pro row**: the engine drops `machine !== null` rows from the rows it reads, from the announce set and from the count, before anything else (`E2`).
- Windows and floors use the MONOTONIC clock, so a wall clock moved backwards cannot delay a send by an hour. The wall clock is used for `iat`, `apns-expiration` and nothing else in the engine.

### 3.6 Inert, and what a person who never pairs sees

**In this phase nothing in an ordinary launch composes the engine.** The one new boot call,
`installPushSeam()`, returns at its first refusal in every launch that is not an armed harness run (§5.1).
The production changes an ordinary launch executes are two: the tray now reads its map through
`blocked-feed.ts` (behaviour byte-identical, pinned by `src/main/tray/__tests__/tray-menu.test.ts` and a new
feed test), and that one refused seam call. A person who never pairs a phone sees nothing change.

**The engine's own inertness, for the round that composes it:** `observe()` tracks which ids are blocked
(pure, in memory) and does NOTHING else unless a join or a fall happened; only then does it ask
`deps.destinations()`, and an empty answer — no paired phone with a live token, the switch off, or the door's
current hash not confirmed — schedules nothing, reads no key, opens no connection and writes no log line.
The key is read only inside a flush, and a key that cannot be opened sends nothing and says `PUSH_NO_KEY` once
per run.

---

## 4. The attack and the re-derivation, reconciled

### 4.1 The attack — THE WAKE IS ITS FIRST ARM

Every arm is driven twice: under plain node by `conformance:push` over the shipping engine, sender and
composer with an injected clock against an in-process loopback HTTP/2 stand-in (seconds, in the battery),
and in the running app by `probe:p314` (§5) where the arm needs the app. The last column says where.

| Arm | Must be | Where |
| --- | --- | --- |
| **W. The wake.** An eight-hour sleep; three sessions first seen blocked inside the window after the resume | ONE request per destination, count shape, body starting `Seen when your Mac woke`, the three names; the door's `/v1/blocked` rows for those three read `seenAtWake: true` and every other row `false`; the provider token re-minted (its `iat` moved by at least eight hours) | both |
| W-edge. A row first seen at `resumedAt + 15,000` and one at `+15,001` | the first is in the wake alert and `seenAtWake`; the second is not, and goes out in ordinary coalescing | conformance |
| W-pending. A row joined 2 s before the suspend | folded into the wake alert, `seenAtWake: false` | conformance |
| Twenty rows flip at once | ONE request per destination, count shape, `Needs your input (20)` | both |
| A stale device token answered `410` | dropped, never retried (zero later requests to that path, across a later join and across a fresh `readPocketStore()`); the other phone still told | both |
| A token for the wrong environment (`400 BadDeviceToken` from the stand-in's other origin) | dropped exactly like a 410 (research 128 §8 item 8's hostile case) | conformance |
| A push while the door is down | sent: the push does not depend on the door listening (it depends on the door's CONFIRMED fields). The probe never binds the door, so every arm is this arm | both |
| A push aimed at a device that was removed | zero requests to its path, ever after; and, because removal withdraws the door's confirmation (`ipc.ts:439-451`), zero requests to anyone until the door is confirmed again | both |
| A payload at the ceiling (names of 10,000 UTF-16 units, emoji and CJK) | ≤ 4096 bytes, valid UTF-8, parses, clipped by §2.4 exactly | conformance |
| A key that cannot be opened (a plaintext key JSON planted at the slot's file, the same-uid attacker's shape; and a seal that cannot open) | no send, `PUSH_NO_KEY` said once, no throw, the app still answers | both |
| The clock moved backwards between the join and the send | the alert is sent once; the cached token is reused, not re-minted; a stand-in `403 ExpiredProviderToken` then costs exactly one re-mint and one retry; no negative number anywhere in the payload | both |
| Block, clear, block again | the second alert carries the SAME `apns-collapse-id` and `thread-id` as the first; the clear in between sends one badge-only `0` at priority 5, expiration 0 | both |
| `working` and `idle` transitions | zero alerts, zero badge rises | conformance |
| A remote row forced to `needs_input` | never announced, never counted | conformance |
| Launch with N rows already blocked | zero requests | conformance |
| The switch off; no phone; the door unconfirmed | zero key reads, zero connections, zero timers | both |
| A presentation with a malformed `apt` / `ape` | `POST /pair` answers `refused`; nothing presented | hostile client (313's, widened) |
| A canary string in `question`, in a choice label, and in every non-allowlisted row field | absent from every payload and every header | conformance |
| An origin `http://10.0.0.1:1`, `http://localhost:1` (a NAME), and `https://api.push.apple.com` without `allowRemote` | refused before any socket; the stand-in's connection count does not move | conformance |

### 4.2 The re-derivation — the second independent method, and NO BUILDER WRITES IT

A verifier, sharing no code with `src/main/push/`, takes the door rows the probe printed (`[gmux-push-seam]
blocked …`, §5.3) and the requests the stand-in recorded, and:

1. **Builds the alert's JSON itself** from those rows with its own reader and the rules of §2.2 to §2.4, and byte-compares it with every body the stand-in received. It must also go red on a one-character mutation of its own output, so it cannot pass by reading nothing.
2. **Recomputes the signing input** from Apple's documented claim set (§2.6) with its own base64url and its own JSON, and byte-compares it with the first two segments of every received `authorization` token. **The input, never the key.** It verifies each signature with its own implementation (for example WebCrypto `subtle.verify` with `ECDSA`/`P-256`/`SHA-256` over the raw 64-byte `r||s`) against the scratch PUBLIC key the probe generated. ECDSA signatures are randomised, so a signature is verified and never byte-compared.
3. **Recomputes every header** of §2.5 from the same rows and the probe's own clock readings.
4. **Recomputes `seenAtWake`** for every printed row from the stamps and the probe's own record of when it fired `resume`, and holds it equal to the door's answer and to the alert's wake segment.

No key byte, token, JWT or payload byte of a real person exists anywhere in this: the key is generated in
scratch, the token is random, and the sessions are the probe's own.

---

## 5. `probe:p314`

### 5.1 The harness seam, and the pattern it copies

There is no Settings surface and there will not be one in this phase, so the probe seeds a paired phone and a
scratch key through **a harness seam of the kind two phases already ship**: `installMachineSeam`
(`src/main/harness/machine-seam.ts`, Phase 231: a JSON command file re-read every 100 ms, applied once per
`seq`, one printed line per applied sequence, dropped whole when malformed) and `installVaultDrive`
(`src/main/harness/vault-drive.ts`, Phase 304: the shipping credential store driven inside the real app).
Both are installed from `src/main/index.ts:488-496`, BEFORE `dispatchHarness`, under the same three refusals.

**`src/main/harness/push-seam.ts`, `installPushSeam()`**, called on the line after `installMachineSeam()`.
`GMUX_HARNESS_PUSH=<dir>` names a directory. It installs NOTHING and prints NOTHING unless ALL of:

1. the launch is isolated (`isIsolatedLaunch`) or an armed probe run (`GMUX_PROBES === '1'`);
2. `GMUX_HARNESS_DIR` is set and the profile (`app.getPath('userData')`) is inside it (`isInside`, `src/main/harness/fold-stub.ts`);
3. `<dir>` is inside `GMUX_HARNESS_DIR`;
4. `app.commandLine.hasSwitch('use-mock-keychain')` — the seam seals a key and a store, and without the mock keychain a scratch-`HOME` launch reaches his real `Tortie Safe Storage` item (the 2026-08-16 incident recorded in `src/main/index.ts`);
5. every origin in `seed.json` is `http://127.0.0.1:<port>`; anything else is refused whole.

When installed it:

- installs the blocked feed (§9.2) and subscribes the engine to it;
- builds a `WakeMark` over a DRIVABLE monitor (`drivableMonitor()`, moved out of `src/main/power/smoke.ts` into `src/main/power/drivable-monitor.ts` so there is one copy, and `smoke.ts` re-pointed to it);
- keeps the scratch key through the SHIPPING store, `apnsKeyStoreForApp().keep(...)`, reading the PEM from `seed.key.p8File` (under the harness directory);
- builds a `PocketHost` with `bindAddress: () => '127.0.0.1'` and the facts below, and PAIRS each seeded phone THROUGH THE SHIPPING PATH: `beginPairing()`, a presentation sealed with `sealPresentationAsPhone` (§9.1) carrying the phone's public keys, `apt` and `ape`, `host.pairing.present(body, '127.0.0.1')`, then `host.allowPhone({ linesRead, hashRead })` from `host.pairing.view()`. The acknowledgement is supplied inside `PocketHost`, as it always is;
- sets `setPushAlerts(seed.alerts)` and confirms the door through `host.confirmDoor` with the lines and hash `pocketConfirmStatus(host.fields())` answers;
- **never calls `host.start()`**: the door never listens in this probe, so "a push while the door is down" is every arm;
- composes the engine with the sender aimed at `seed.origins` (`allowRemote` never passed);
- prints `[gmux-push-seam] installed phones=<n> key=<present|absent> alerts=<on|off> confirm=<state>`.

`PocketFacts` in the seam: `sessions` and `projects` from the core; `blockedSince` = the feed's map;
`wakes` = the seam's `WakeMark`; `activity: () => undefined` (main has no tap for the question and the alert
must never carry it); `statusWord` = the one word of §1.1 row 1; `agentLabel` = `getRegistryEntry(id).displayName`
(`src/main/agents/registry.ts:1729`); `machineLabel` = the session's machine label or `null`; `emptyLine` =
`NOTHING_NEEDS_YOU`; `catchUp`, `lastTurn`, `turns`, `handoff` answer empty.

**Commands** (`<dir>/commands.json`, `{ "seq": n, "commands": [...] }`, machine-seam's shape, dropped whole when
malformed): `suspend`; `resume` (fires the monitor, then `core.scheduleRefresh()` as production's resume does);
`clock {offsetMs}` (skews the ENGINE's and the SENDER's wall clock only — the feed's stamps and `WakeMark` keep
the real clock); `blocked` (prints the door's rows projected to `sessionId`, `name`, `project`, `agentLabel`,
`statusLabel`, `machine`, `blockedSince`, `seenAtWake` — never `question` or `choices`); `status` (engine state,
destination count, dead-token count, each phone's `alerts`, and a fresh `readPocketStore()` dead count);
`push-off`, `push-on` (each sets the switch and confirms); `remove-phone {label}`; `confirm`; `break-key`
(plants a plaintext key JSON at the slot's file path, the same-uid attacker's shape); `restore-key` (keeps the
seed key again from the file). The engine's sentences are printed as `[gmux-push-seam] said <id>`.

### 5.2 The stand-in

`build/p314/apns-stand-in.mjs`, IN the probe's own node process (not a child, so `gate:background` has no new
start to judge), `node:http2` `createServer()` (cleartext h2c) on `127.0.0.1` port `0`, TWO listeners — one
playing the development origin, one the production origin — closed in the probe's `finally`. It records every
stream (path, the §2.5 headers, the JWT's decoded header and claims, whether the signature verifies under the
scratch public key, the body bytes, the status it answered) and answers from a script the probe sets: `200`
with an `apns-id` by default; `410 {"reason":"Unregistered","timestamp":…}`, `403 ExpiredProviderToken` once,
`500`, per token. A token presented to the origin it was not seeded for answers `400 BadDeviceToken`; a topic
other than the seed's answers `400 DeviceTokenNotForTopic`. **It is the only thing the sender is ever aimed at,
in every test, gate and probe.** The TLS leg to Apple is therefore not driven in this phase and cannot be
without the network this phase refuses; the sender's refusal of `http:` to anything but `127.0.0.1`/`[::1]`
is what makes the cleartext stand-in safe to allow. `conformance:push`'s driven half imports the same module.

### 5.3 The run

One Electron through `build/electron-run.mjs`'s `withElectron`, copied from `build/p311/probe-p311.mjs`'s shape:
a scratch `HOME`, a scratch profile under `GMUX_HARNESS_DIR`, its own tmux socket (`GMUX_TMUX_SOCKET`, a
name composed from the probe's pid, never `gmux`), `args: ['--remote-debugging-port=0', '--use-mock-keychain']`,
`GMUX_PROBES=1`, `GMUX_LOG_FILE=1`, `GMUX_SPECSTORY_NO_CLOUD=1`, `GMUX_HARNESS_PUSH=<dir>`. **The fake agent is
p311's shape** (a `/bin/sh` `claude` on the scratch `PATH`), looped: it prints `working`, waits for `<triggers>/$GMUX_SESSION_ID.go`
(the pane-env stamp every Tortie session carries, `src/main/tmux/env.ts:33`),
then prints the committed fixture `src/main/activity/__tests__/fixtures/claude-permission-prompt.txt`, waits for
the file to go, clears, and loops — so every block is reached through the shipped inferred tier and no vendor
process runs. Sessions are created through `window.__gmuxP202.createSession(name, 'claude')` over CDP, exactly
as p311 does. The scratch P-256 key is generated in the probe with `node:crypto`, its PEM written 0600 under
the harness directory for the seam, and removed with the whole run directory in the `finally`.

**The sleep is driven, never taken.** The machine does not sleep, so its poll keeps running; "blocked during
the sleep" is therefore driven as what the Mac actually does on a real wake — the rows are FIRST SEEN after the
resume: the probe sends `suspend`, `resume` + `clock +8h`, and only then writes the three triggers. (Writing
them between `suspend` and `resume` would stamp them with a true pre-resume time and they would correctly NOT
read `seenAtWake`.)

The arms, in this order, one app run, every constant the shipping one (so the run takes minutes, most of it
the 30 s floor). **Between arms the probe clears what the last arm blocked and waits until the stand-in has been
quiet for the floor plus a margin**, so every request is attributed to the arm that caused it and a pending
badge-only flush never swallows the next arm's join into its own send:

| # | Arm | Reading |
| --- | --- | --- |
| P0 | Seed: key kept, phones A and B paired (both `development`), alerts on, confirmed | the installed line; stand-in 0 requests; door not listening |
| P1 | Inert: `push-off`; `s1` blocks | 0 requests after 10 s; `push-on`; `s1` is not announced when the switch returns (it is not a join) |
| P2 | Single: `s1` clears, then blocks | 2 requests (A, B), single shape, all §2.5 headers, JWT verifies, badge 1 |
| P3 | Re-block: `s1` clears, blocks again | a badge-only `0` (priority 5, expiration 0), then 2 single alerts whose `apns-collapse-id` and `thread-id` equal P2's |
| P4 | Twenty: `s2`…`s21` at once | 2 requests, count shape, `Needs your input (20)` (plus any row still blocked) |
| P5 | **The wake**: all clear; `suspend`; `resume` + `clock +8h`; `w1`…`w3` block | 2 requests at about resume + 15 s, count shape with `Seen when your Mac woke`; `blocked` shows those three `seenAtWake: true`; the JWT's `iat` moved ≥ 8 h |
| P6 | Clock backwards: `clock −2h`; stand-in answers `403 ExpiredProviderToken` once for A; a row blocks | A: 2 requests (403, then 200 with a different token); B: 1 |
| P7 | Key: `break-key`; a row blocks | 0 requests, `said no-key` once, `status` still answers; `restore-key` |
| P8 | 410: stand-in answers `410 Unregistered` for B; a row blocks; later another | first: A 200, B 410; `status` dead=1, B `stopped`, store dead count 1; second: A only |
| P9 | Removed: `remove-phone A`; a row blocks | 0 requests to anyone; `confirm`; another row: still 0 to A |
| P10 | The log, after the app is gone | `app.log` holds neither token's hex, no recorded JWT, no line of the PEM body, no recorded payload JSON |

Then Electron is counted once with CLAUDE.md's command. The report is `out/p314/probe-p314.json` and prints
digests, lengths and the probe's own synthetic names; it never prints a token, a JWT or a key byte.
`P314_PARENT_CHECKOUT=<a built checkout at the parent>` runs the same launch at the parent, where the seam
line never appears and every arm grades `unreadable, the build predates the seam`. **Verifiers only**: the probe
starts an Electron and takes the orchestrator's Electron lock first; builders write it and never run it.

---

## 6. The gates

### 6.1 `conformance:credentials` — rule 23, THE APNs KEY

Added beside rule 22 in `build/conformance-credentials.mjs` and its driven half in
`build/credentials-conformance-probe.mts`, over the SHIPPING `src/main/credentials/apns-key.ts`:

- **(a) driven:** a scratch P-256 PKCS#8 key generated in the gate, kept through `apnsKeyStore(dir, seal)` with an injected `VaultSeal`, read back: the answer's sha256 equals the input's; `<dir>/apns-provider.cred` exists, is mode 0600 in a 0700 directory, and its bytes are NOT the record, contain no `-----BEGIN`, and hold no 64-byte window of the PEM's base64 body; `securityCallCount()` does not move across keep, read and forget.
- **(b) driven:** a seal that cannot be made keeps nothing (no file at the slot or its `.pending` staged place) and answers the one write's own sentence (`src/main/credentials/swap.ts`); a seal that cannot OPEN answers `null`; a plaintext key JSON planted at the slot's path answers `null` (the seal refuses a blob it did not write).
- **(c) driven:** an invalid record is refused WHOLE with the field named — a key that is not P-256, a key id or team id that is not ten characters of `[A-Z0-9]`, a topic that is not a dotted bundle id.
- **(d) scanned, over the tree and every ablated copy:** `apns-key.ts` names no `keychain`, no `security`, no `legacyKeychainVault`, no `defaultSecurityRunner` and no `-i`; it writes only through `safeSwap(vaultTarget(…))` over `sealedVault(dir, seal, NO_LEGACY)`; no module under `src/renderer/`, `src/preload/` or `src/shared/` names `apns-key`, `APNS_KEY_SLOT` or `apnsKeyStore`; and the only non-test importers of `apns-key` are `src/main/credentials/index.ts`, `src/main/harness/push-seam.ts`, and `src/main/push/` by `import type` only.
- **Rule 9 now covers the sealed file's bytes too**: no byte window of the scratch key appears in any file the gate's arms leave behind.
- **Two ablations**, in the ABLATIONS table, each red on rule 23: **the seal dropped so the file equals the key** (the seal handed to `sealedVault` in `apns-key.ts` replaced by an identity seal `{ wrap: (t) => t, open: (b) => b }`), and **a send attempted with no seal** (`read()` bypasses `backend.get` and parses the file's text itself, so the planted plaintext key of (b) is answered). The `from` texts are the pinned lines of §9.1.

### 6.2 `conformance:pocket`, widened

- **`R3`'s forbidden words** gain `main/push/`, `../push/`, `node:http2` and `push.apple.com`: the door speaks to a phone and nothing else, and cannot name the sender. `main/credentials/` and `main/logins/` stay forbidden — the door still names no credentials module.
- **`N1` (new): no push route exists.** No route id, path or member of `POCKET_ROUTE_IDS` names `push`, `apns`, `notify`, `device`, `token` or `alert`, and `R4`'s pin is still `ad9ce821…` byte for byte.
- **`N2` (new): the token has one door in and none out.** The presentation parser validates `apt` as bounded hex and `ape` as one of two words and refuses otherwise; no renderer-facing type in `src/shared/ipc/pocket.ts` (`PocketStatus`, `PocketPhoneView`, `PocketPairingView`, `PocketBlockedRow`) has a field named like a token; `PocketPushDestination` lives in `src/main/pocket/pairing.ts` and nowhere in `src/shared/`.
- **`G1`'s poison words** gain `jwt`, `bearer`, `pem`, `apt`, `pushToken`, `deviceToken`.
- **`ablation:p313`** gains three arms: a `push` row added to `POCKET_ROUTES` (red on `N1` and `R4`), a `pushToken` field added to `PocketPhoneView` (red on `N2`), and `import '../push/engine'` added to `ipc.ts` (red on `R3`).
- **`conformance:pocket:hostile`** gains one arm: a presentation whose `apt` is not hex is answered `refused`, and one whose `apt` and `ape` are honest is answered `pending` and allowed.

### 6.3 `conformance:push` — NEW, with `ablation:p314` beside it

`build/conformance-push.mjs` (text and AST, with the TypeScript parser as `conformance:pocket` does) plus its
driven half `build/p314/push-conformance.mts` run through `tsxCli()` (the hostile client's shape). Plain node,
no Electron, no tmux, no ssh, no agent, no network: the driven half stands up `build/p314/apns-stand-in.mjs`
on `127.0.0.1` and closes it in a `finally`. Every failure prints `[p314 <rule>]`. `--list` prints the rules.

| Rule | Asserts |
| --- | --- |
| `H1` | `api.push.apple.com` and `api.sandbox.push.apple.com` each spelled once in `src/`, inside `apnsOrigin` in `src/main/push/apns.ts`; driven: `apnsOrigin` maps the two environments to them |
| `H2` | the sender refuses `http:` unless the host is `127.0.0.1` or `[::1]`, and any non-loopback origin unless built with `allowRemote: true`, BEFORE any socket; no file in `src/` passes `allowRemote` (pinned at 0 in this phase; the round that wires production raises it to exactly 1, computed from `!isHarnessLaunch(process.env)`) |
| `H3` | every test, gate and probe aims the sender at loopback: no non-loopback origin literal reaches `createApnsSender`, `http2.connect` or `connect` in `src/main/push/__tests__/`, `build/p314/`, `build/conformance-push.mjs`, `build/ablation-p314.mjs`, `build/probe-p314.mjs` |
| `J1` | the provider token's signing input byte for byte (§2.6), base64url with no padding, a 64-byte `ieee-p1363` signature that verifies under the scratch public key |
| `J2` | reuse under 50 min, re-mint at 50, NO re-mint when the clock went backwards, one re-mint and one retry on `ExpiredProviderToken`, never a third |
| `A1` | the three shapes byte for byte (§2.3), key order, the allowlist of keys and nothing else, ≤ 4096 bytes |
| `A2` | the composer reads only the §2.1 row fields (AST); driven canaries never reach a payload or a header |
| `A3` | the ceiling (§2.4), deterministic, valid UTF-8 |
| `A4` | the headers (§2.5), alert and badge-only |
| `C1` | every string literal reaching `title` or `body` is `NEEDS_YOUR_INPUT`, `PUSH_WAKE_SEEN`, ` · `, ` (`, `)` or `…`; the single title is exactly `` `${row.name} ${row.statusLabel}` `` |
| `E1` | nothing for `working` or `idle`; no badge rise without an alert |
| `E2` | nothing for a row whose `machine` is not null |
| `E3` | twenty joins → one request per destination; the floor; a join-and-leave is not announced; a fall → badge-only |
| `E4` | re-block keeps `apns-collapse-id` and `thread-id` |
| `E5` | the wake (§3.3), both edges, the pending fold, the eight-hour re-mint |
| `E6` | the first observe seeds silently |
| `E7` | §2.7's table, every row driven against the stand-in |
| `E8` | inert: zero key reads, zero connects, zero timers when there is no destination; one sentence and no send when there is no key |
| `E9` | `beginShutdown` closes admission on its first line before any await, cancels timers, and `join` is bounded |
| `G1` | no key, JWT, token, payload, title, body, question or answer in any log call in `src/main/push/` (conformance:pocket `G1`'s shape, poison words widened) |
| `W1` | `src/main/push/` names no `main/logins/`, imports from `main/credentials/` and `main/pocket/` by `import type` only, and `src/main/pocket/` names no `main/push/` |
| `Y1` | `seenAtWake` is computed only by `blockedAge`; `WAKE_WINDOW_MS` is spelled once; no file in `src/main/push/` compares a stamp with a resume time |
| `S1` | the seam's one status word equals `statusVisual`'s `case 'needs_input'` label in `src/renderer/app/status.ts`, byte for byte |

**`ablation:p314`** (`build/ablation-p314.mjs`, `build/ablation-p313.mjs`'s shape: an APFS clone of `src/` and
`build/` under `/private/tmp/p314-ablation-<pid>`, `node_modules` symlinked, every edited file restored and
proved by sha256, the clone removed in a `finally` and on a signal, the worktree's bytes asserted unmoved, the
base's red rules recorded first and each arm required to make ITS OWN rule newly red). One arm per rule above,
each a text edit of a pinned line (§9.3). **An arm whose `from` text is absent FAILS by name; it never skips.**
`P314_ONLY=` runs named arms.

### 6.4 The walls

`build/assert-import-boundaries.mjs` `DIRECTORY_WALLS`: `main/pocket/`'s forbidden list gains `main/push/`,
and a fourth row `{ dir: 'main/push/', forbidden: ['main/logins/'] }` with its reason. (The type-only rule for
`main/credentials/` and `main/pocket/` is `W1`'s, because the wall table is by path.)

### 6.5 `gate:contract`, `gate:background`, `gate:electron`, `gate:checks`

- **`gate:contract`**: one env name moves, `GMUX_HARNESS_PUSH` (`[env.names]` 115 → 116). No invoke channel, no smoke mode, no manifest change, no storage key. Regenerated with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` after the other builders land, and the commit body names the line.
- **`gate:background`**: no new long-lived child. The stand-in is an in-process listener closed in a `finally`; the fake agents are started by tmux and end with the scratch server in `withElectron`'s `finally`. Run and green; `build/background-fixtures.mjs` gains an entry only if a verifier finds a shape that walks past it.
- **`gate:electron`**: `HELPER_USER_FLOOR` 148 → 149 (`build/assert-electron-teardown.mjs:282`), for `build/probe-p314.mjs`.
- **`gate:checks`**: `build/verification-checks.mjs` gains `pure('conformance:push')`, `pure('ablation:p314')` and `electron('probe:p314')`, each with its environment requirement and skip rule.

### 6.6 The copy ledger

`build/p311/copy-drift.mjs`: the owed rule `/^[a-z0-9-]+ needs input$/` (Phase 314) becomes an `owned` rule
with `module: 'src/main/push/alert.ts'`, `draws: ' needs input'`, and as its `needle` the single title's template
literal exactly as §9.3 pins it in `alert.ts`, backticks included (so the ledger fails the day the composition
changes), and `OWNED_RULE_FLOOR` rises 25 → 26 in the same commit. The `owned` branch already accepts a `when`
rule (`ruleMatches`), so the ledger's mechanics do not change. The owed caption "The last line is only there when
the question can be decrypted on this phone…" stays owed, re-labelled to the Notification Service Extension's
later entry rather than Phase 314, because this phase refuses the question line.

### 6.7 CLAUDE.md

The path-triggered table gains a row: `src/main/push/**`, `src/main/credentials/apns-key.ts`,
`src/main/power/wake-mark.ts`, `src/main/tray/blocked-feed.ts`, `blockedAge` and `WAKE_WINDOW_MS` in
`src/main/tray/attention.ts`, `src/shared/push-copy.ts`, `src/main/harness/push-seam.ts` → **`conformance:push`**
(its measured time, "no Electron, no network: one loopback stand-in"), naming `ablation:p314` beside it. The
`conformance:credentials` row gains one sentence for rule 23; the `conformance:pocket` row gains one for `N1`,
`N2` and the push words in `R3`. The probes table gains `probe:p314` (when: `src/main/push/**`, the seam, or the
wake rule; cost: minutes, one Electron). Each is one line in the house style; the history stays in the backlog.

### 6.8 The battery the integrator runs, and what is not the integrator's

Builders and the integrator run only `npm run -s typecheck` and targeted `npx vitest run --no-cache <path>`,
each command under 90 s, plus the gates above that fit under 90 s (`conformance:push`, `conformance:pocket`,
`conformance:pocket:hostile`, `conformance:phonecopy`, `node build/contract-inventory.mjs --check`,
`node build/assert-electron-teardown.mjs`, `node build/assert-background-teardown.mjs`,
`node build/assert-hermetic-checks.mjs`, `conformance:credentials` at about 40 s) and the ablations as
`P314_ONLY=`/`P313_ONLY=` subsets. **The full `npm test`, `npm run build`, the smokes, `probe:p314`,
`ablation:p313` whole, `ablation:p314` whole and package are the verifiers'.**

---

## 7. What is NOT in this phase

- **Nothing user-visible.** No Settings → Phone, no switch on any surface, no key-entry sheet, no IPC channel (so `gate:contract`'s invoke count stays 243), no preload member, no menu row — the native menus do not change because no surface is added — and no CHANGELOG item.
- **No production composition.** Nothing in an ordinary launch builds the engine, hands `WakeMark` Electron's `powerMonitor`, or registers the engine with the ordered disposer in `src/main/capabilities.ts`. The engine exposes `beginShutdown()`/`join()` for 316 to register.
- **No real APNs key, no real push, no network.** Every key is generated in scratch; the sender is aimed at a loopback stand-in everywhere; neither Apple host is ever dialled. The "one real push to his phone" is 316's.
- **No question, no excerpt and no conversation byte in any alert.** No `mutable-content`, no Notification Service Extension.
- **No Live Activity, no widget, no Dynamic Island, no critical or time-sensitive alert.**
- **No web push, no VAPID, no service worker.**
- **No push for anyone but the operator.** Research 127 §11.6 is still his ruling.
- **No failure alert.** `attention.ts` ships `needs_input` alone.
- **No push while the Mac is asleep**, and the door's confirm line for the switch says so. The wake batch is what this phase adds.
- **No alert for a row already blocked when Tortie starts** (§1.2 row 16).
- **No change to the 1 Hz poll, its cadence, `attentionRows`'s order, or what makes a session blocked.** The tray's behaviour is unchanged; only where its map lives moves.
- **No route added to 313's table**, no write route, and no token-refresh route.
- **No `src/shared/status-words.ts`** (313 mechanism 8 stays 316's), and no change to ⌘J's ages.
- **No answer to his two open questions from 313** (the scope of `/v1/session`, and the `/32` without a ULA).
- **No release.**

---

## 8. The builders

Three builders, DISJOINT files, working in `/private/tmp/wt-p314` at the same time. No file appears in two
lists. Each brief below stands alone; each builder also reads §2, §3 and §9 of this file, which are the surface
all three build to. **The re-derivation of §4.2 is written by no builder.** Builders never launch Electron, never
run `npm run build`, `npm test` whole, a smoke, a probe or package, never commit, stage or stash, never touch
`/Users/gdc/gmux`, and keep every command under 90 s.

**Builder C owns the shared files**: `docs/audits/contract-baseline.txt`, `package.json`,
`build/verification-checks.mjs`, `CLAUDE.md`, and also `build/p311/copy-drift.mjs`,
`build/assert-import-boundaries.mjs` and `build/assert-electron-teardown.mjs`.

### Builder A — the key, the switch, the token, and the door's age

**Owns:** `src/main/credentials/apns-key.ts` (new), `src/main/credentials/index.ts`,
`src/main/credentials/__tests__/apns-key.test.ts` (new), `src/main/pocket/pairing.ts`, `src/main/pocket/ipc.ts`,
`src/main/pocket/routes.ts`, `src/shared/ipc/pocket.ts`, `src/main/tray/attention.ts`,
`src/main/tray/__tests__/attention.test.ts`, every test under `src/main/pocket/__tests__/`,
`build/p313/hostile-client.mts`, `build/conformance-credentials.mjs`, `build/credentials-conformance-probe.mts`,
`build/conformance-pocket.mjs`, `build/ablation-p313.mjs`.

Build §9.1 exactly. In short: the APNs provider key is kept in a new one-slot sealed store,
`apnsKeyStore(dir, seal)` over `sealedVault(dir, seal, NO_LEGACY)` written through `safeSwap(vaultTarget(…))`,
with `apnsKeyStoreForApp()` in `credentials/index.ts` choosing `electronSeal()` or `harnessSeal()` by
`isHarnessLaunch` and the directory `<userData>/gmux/push/`; nothing in it can reach a keychain. The door's
fields gain `pushAlerts` (hashed) and each phone gains `pushToken`/`pushEnvironment` (hashed), arriving only in
the pairing presentation's sealed `apt`/`ape`; the store gains an unhashed `deadPushTokens`; `PocketHost` gains
`setPushAlerts`, `pushDestinations`, `dropPushToken`; `PocketStatus` gains `pushAlerts` and `PocketPhoneView`
gains `alerts`; the hash algorithm becomes `sha256-pocket-exec-v2`; `describePocketDoor` draws the new lines of
§9.1. `attention.ts` gains `WakeWindow`, `WAKE_WINDOW_MS`, `blockedAge`, `NEEDS_YOUR_INPUT` and
`NOTHING_NEEDS_YOU`; `routes.ts` sets `seenAtWake` from `blockedAge(stamp, facts.wakes())` and `PocketFacts`
gains `wakes()`; `PocketBlockedRow` gains `seenAtWake`; `POCKET_AGE_HONESTY` lands in `pocket.ts`. Export
`sealPresentationAsPhone` from `pairing.ts` for the tests and the harness ONLY, the way `signAsPhone` is.
**Grep for every construction of `PocketFacts`, `PocketPhoneFields` and `PocketStore`** (the hostile client
builds all three directly) and give each the new members, or tsx will fail at run time where tsc said nothing.
Then write rule 23 and its two ablations into `conformance:credentials` (§6.1), the `conformance:pocket` widening,
the three `ablation:p313` arms and the hostile client's arm (§6.2). Prove it with
`npx vitest run --no-cache src/main/credentials/__tests__/apns-key.test.ts src/main/pocket src/main/tray/__tests__/attention.test.ts`,
`npm run -s typecheck`, `node build/conformance-credentials.mjs`, `node build/conformance-pocket.mjs`,
`node build/p313/hostile-client.mjs`, and `P313_ONLY=<the three new arms> node build/ablation-p313.mjs`.
Report every hash-affecting change and every line you had to edit in someone else's pinned text.

### Builder B — the sender, the engine, the feed and the wake

**Owns:** `src/main/push/apns.ts`, `src/main/push/alert.ts`, `src/main/push/engine.ts`, `src/main/push/index.ts`
(all new), `src/main/push/__tests__/*.test.ts` (new), `src/shared/push-copy.ts` (new),
`src/main/power/wake-mark.ts` (new), `src/main/power/__tests__/wake-mark.test.ts` (new),
`src/main/tray/blocked-feed.ts` (new), `src/main/tray/__tests__/blocked-feed.test.ts` (new),
`src/main/tray/index.ts`, `src/main/tray/__tests__/tray-menu.test.ts`.

Build §9.2 exactly: the sender (`node:http2` and `node:crypto` only, no dependency — CLAUDE.md refusal 6 is not
approached), the provider token (§2.6), the composer (§2.1 to §2.4, the single title literally
`` `${row.name} ${row.statusLabel}` ``), the answer table (§2.7), the engine (§3), `WakeMark` over an injected
`PowerMonitorLike`, and the blocked feed that takes `core.onSessionsBroadcast` ONCE and fans out, with the tray
re-pointed to it and to `NEEDS_YOUR_INPUT`/`NOTHING_NEEDS_YOU` from `attention.ts` (Builder A adds those; build
to the pinned names). **The tray must behave byte for byte as before**: `trayMenuTemplate` unchanged, the same
rows for the same sessions in the same order. `src/main/push/` imports `main/credentials/apns-key` and
`main/pocket/pairing` by `import type` ONLY and never names `main/logins/`. The sender's default is safe: a
non-loopback origin is refused unless `allowRemote: true`, `http:` is refused for anything but `127.0.0.1` and
`[::1]`, a token that is not lowercase hex is refused before a path is composed, and nothing in this phase
passes `allowRemote`. No log call carries a key, a token, a JWT, a payload, a title or a body; sentences are
`src/shared/push-copy.ts`'s constants, each logged at most once per run. Your unit tests use an in-process
`node:http2` h2c server on `127.0.0.1:0` closed in a `finally`, an injected wall clock, an injected monotonic
clock and an injected scheduler. Prove it with `npx vitest run --no-cache src/main/push src/main/power src/main/tray`
and `npm run -s typecheck`.

### Builder C — the seam, the probe, the gate, and the shared files

**Owns:** `src/main/harness/push-seam.ts` (new), `src/main/harness/__tests__/push-seam.test.ts` (new),
`src/main/index.ts` (one import and one call), `src/main/power/drivable-monitor.ts` (new),
`src/main/power/smoke.ts` (re-point to it), `build/p314/apns-stand-in.mjs`, `build/p314/push-conformance.mts`,
`build/conformance-push.mjs`, `build/ablation-p314.mjs`, `build/probe-p314.mjs` (all new),
`build/assert-import-boundaries.mjs`, `build/assert-electron-teardown.mjs`, `build/p311/copy-drift.mjs`,
`package.json`, `build/verification-checks.mjs`, `docs/audits/contract-baseline.txt`, `CLAUDE.md`.

Build §5 and §6.3 to §6.7. The seam copies `machine-seam.ts`'s shape and `vault-drive.ts`'s refusals and adds the
mock-keychain refusal and the loopback-origin refusal (§5.1); its vitest proves every refusal with a table of
environments, the way `machine-seam`'s own test does. `installPushSeam()` goes on the line after
`installMachineSeam()` in `src/main/index.ts`. Move `drivableMonitor` out of `src/main/power/smoke.ts` into
`src/main/power/drivable-monitor.ts` and re-point `smoke.ts`, so the harness seam and the power smoke share one
copy. Write the stand-in (§5.2) once and import it from both the probe and `push-conformance.mts`; it runs in
the importing process and is closed in that process's `finally`. Write `conformance:push` against the surface
pinned in §9 while A and B build it, as `build/p313/SPEC.md` recorded the operator's rule: the gate defines the
surface and the implementation is renamed to match; where a pinned name turns out wrong, say so rather than
loosening the gate. Write `probe:p314` (§5.3) from `build/p311/probe-p311.mjs`'s launch and create code, through
`withElectron`, everything ended in a `finally`, refusing (exit 2) when the checkout has no build; you do NOT run
it. Then the shared files: the walls (§6.4), the floor to 149, the ledger move and `OWNED_RULE_FLOOR` to 26
(§6.6), three `package.json` scripts (`conformance:push`, `ablation:p314`, `probe:p314`), three
`verification-checks.mjs` entries, the CLAUDE.md rows (§6.7), and LAST, after A and B report, the contract
baseline regenerated (§6.5). Prove it with `node build/conformance-push.mjs` (it will be red until A and B land;
say which rules and why), `P314_ONLY=<a few arms> node build/ablation-p314.mjs`, `npx vitest run --no-cache
src/main/harness/__tests__/push-seam.test.ts src/main/power`, `node build/assert-import-boundaries.mjs`,
`node build/assert-electron-teardown.mjs`, `node build/assert-background-teardown.mjs`,
`node build/assert-hermetic-checks.mjs`, `node build/p311/copy-drift.mjs --self-test` and
`node build/contract-inventory.mjs --check`.

### The integrator

Reconciles the seams the three name (the pinned names of §9, `attention.ts`'s exports used by B and C, the
seam's `PocketFacts`), runs §6.8's battery, re-aims any `ablation:p313`/`ablation:p314` arm whose `from` text no
longer matches the built source, runs `LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over every touched file,
and appends an "As built" section to THIS file saying where the tree and §1 to §9 disagree. The backlog's full
section, its running-log line and the commit are the main session's.

### The verifiers (Tier 3)

Independent of every builder and of each other. Each takes the orchestrator's Electron lock before any command
that starts an Electron. **The attack** is §4.1, with the wake first, run in `probe:p314` and in
`conformance:push`, plus anything the verifier writes itself. **The second method** is §4.2's re-derivation,
written by the verifier. Also: the full `npm test`, `npm run build`, `ablation:p313` and `ablation:p314` whole;
`out/main/index.js` measured before and after (the pocket and push domains are now reachable from the bundle's
entry through `installPushSeam`, where 313 left pocket tree-shaken out; the verifier confirms that nothing in an
ordinary launch reaches `startPocketDoor`, `createApnsSender` or a key read, and that the sender's
non-loopback refusal sentence survived the bundler); the tray side by side with the parent (same session
sequence, same menu template, byte for byte); and one Electron count at the end. A verdict is typed
(`verdict`, `evidence`, `problems`) and names the independent method it used.

---

## 9. The surface every builder builds to

These names, signatures and lines are PINNED. The gate and the ablations are written against them in parallel.

### 9.1 Builder A's surface

```ts
// src/main/credentials/apns-key.ts
export const APNS_KEY_SLOT = 'apns-provider';
export interface ApnsProviderKey {
  readonly keyId: string;   // ^[A-Z0-9]{10}$
  readonly teamId: string;  // ^[A-Z0-9]{10}$
  readonly topic: string;   // a dotted bundle id, ^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$, at most 155 bytes
  readonly p8: string;      // PKCS#8 PEM of an EC prime256v1 private key, stored re-exported (canonical)
}
export type ApnsKeyField = 'keyId' | 'teamId' | 'topic' | 'p8';
export interface ApnsKeyStore {
  keep(key: ApnsProviderKey): Promise<{ ok: true } | { ok: false; reason: string; field: ApnsKeyField | null }>;
  read(): Promise<ApnsProviderKey | null>;
  forget(): Promise<void>;
}
export function apnsKeyStore(dir: string, seal: VaultSeal): ApnsKeyStore;
```

Pinned lines (the ablations' `from` texts), each exactly once in the file:

```ts
  const backend = sealedVault(dir, seal, NO_LEGACY);
    const text = await backend.get(APNS_KEY_SLOT);
    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);
```

The stored payload is `JSON.stringify({ v: 1, keyId, teamId, topic, p8 })`. `read()` answers `null` for an
absent, unopenable, unparsable or invalid record and never throws. The module never logs.

```ts
// src/main/credentials/index.ts (added)
export function apnsKeyDir(): string;               // join(app.getPath('userData'), 'gmux', 'push')
export function apnsKeyStoreForApp(): ApnsKeyStore; // isHarnessLaunch(process.env) ? harnessSeal() : electronSeal()
export { apnsKeyStore, APNS_KEY_SLOT, type ApnsProviderKey, type ApnsKeyStore } from './apns-key';
```

```ts
// src/main/pocket/pairing.ts (changed)
export interface PocketPhoneFields {           // + two fields, both hashed
  readonly pushToken: string;                  // lowercase hex, 32..256 chars, or '' when the phone gave none
  readonly pushEnvironment: '' | 'development' | 'production';
}
export interface PocketExecutionFields { readonly pushAlerts: boolean; /* + the five existing */ }
export const POCKET_EXECUTION_HASH_ALGORITHM = 'sha256-pocket-exec-v2';
// NORMALIZE: pushAlerts: (v) => v; phones emit [id, label, signingKey, exchangeKey, address, pushToken, pushEnvironment]
export interface PocketStore { readonly pushAlerts: boolean; readonly deadPushTokens: readonly string[]; /* + existing */ }
export interface PocketPresentation { readonly pushToken: string; readonly pushEnvironment: '' | 'development' | 'production'; /* + existing */ }
export interface PocketPushDestination {
  readonly phoneId: string;
  readonly token: string;          // never logged, never in any answer to the renderer
  readonly environment: 'development' | 'production';
  readonly tokenDigest: string;    // sha256(token) hex; the only form stored in deadPushTokens
}
export function sealPresentationAsPhone(offerPayload: string, presentation: {
  label: string; signingKey: string; exchangeKey: string; pushToken?: string; pushEnvironment?: 'development' | 'production';
}): Buffer;                        // tests and the harness ONLY; nothing in the shipping door calls it
```

The presentation's sealed inner JSON gains `apt` and `ape` (§1.1 row 3). A stored phone row with no push fields
reads as `''`/`''`; a row whose push fields are present and malformed is dropped whole. `deadPushTokens` is
filtered to 64-hex strings and bounded to 64.

`describePocketDoor` lines, NEW copy:

- `pushAlerts: true` → `Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps`
- `pushAlerts: false` → `Tells your phone nothing through Apple`
- for each phone with a token → `Alerts for "<label>" go through Apple (<environment>), device <first 8 hex of sha256(token)>`

```ts
// src/main/pocket/ipc.ts, PocketHost (added)
setPushAlerts(on: boolean): PocketStatus;
pushDestinations(): readonly PocketPushDestination[];  // [] unless pushAlerts AND pocketConfirmStatus(fields()).state === 'confirmed'
dropPushToken(tokenDigest: string): void;              // appends to deadPushTokens; the hash does not move
```

```ts
// src/shared/ipc/pocket.ts (added)
PocketBlockedRow.seenAtWake: boolean;
PocketStatus.pushAlerts: boolean;
PocketPhoneView.alerts: 'none' | 'on' | 'stopped';
export const POCKET_AGE_HONESTY = 'Waits first seen after your Mac wakes or Tortie restarts are timed from then.';
```

```ts
// src/main/pocket/routes.ts
PocketFacts.wakes(): readonly WakeWindow[];   // a read, like every member
// rowOf: seenAtWake: blockedAge(blockedSince, facts.wakes()).seenAtWake
```

```ts
// src/main/tray/attention.ts (added; the existing functions unchanged)
export interface WakeWindow { readonly suspendedAt: number | null; readonly resumedAt: number }
export const WAKE_WINDOW_MS = 15_000;
export function blockedAge(stamp: number, wakes: readonly WakeWindow[]): { readonly since: number; readonly seenAtWake: boolean };
export const NEEDS_YOUR_INPUT = 'Needs your input';
export const NOTHING_NEEDS_YOU = 'Nothing needs you';
```

### 9.2 Builder B's surface

```ts
// src/shared/push-copy.ts (NEW copy, every string)
export const PUSH_WAKE_SEEN = 'Seen when your Mac woke';
export const PUSH_NO_KEY = 'Tortie could not open its Apple push key, so it told your phone nothing.';
export const PUSH_KEY_REFUSED = 'Apple refused Tortie’s push key, so it told your phone nothing.';
export const PUSH_TOKEN_STOPPED = 'Your phone stopped taking alerts from this Mac. Pair it again to turn them back on.';
export const PUSH_UNREACHABLE = 'Tortie could not reach Apple, so this alert was not sent.';
export type PushSentenceId = 'no-key' | 'refused-key' | 'dropped' | 'unreachable';
```

```ts
// src/main/push/apns.ts
export type ApnsEnvironment = 'development' | 'production';
export function apnsOrigin(env: ApnsEnvironment): string;   // the ONE place both Apple hosts are spelled
export function providerTokenSigningInput(keyId: string, teamId: string, iatSeconds: number): string;
export interface ApnsRequest {
  readonly token: string; readonly environment: ApnsEnvironment; readonly topic: string;
  readonly payload: string; readonly priority: 10 | 5; readonly expiration: number; readonly collapseId: string | null;
}
export type ApnsAnswer =
  | { readonly ok: true }
  | { readonly ok: false; readonly status: number; readonly reason: string; readonly kind: 'drop' | 'stop' | 'reauth' | 'later' | 'retry' };
export interface ApnsSender {
  send(key: ApnsProviderKey, request: ApnsRequest): Promise<ApnsAnswer>;   // re-mints once on ExpiredProviderToken inside
  close(): Promise<void>;
}
export function createApnsSender(options: {
  origin(env: ApnsEnvironment): string;   // production: apnsOrigin; every test, gate and probe: a loopback stand-in
  allowRemote?: boolean;                  // default false
  now?(): number;                         // wall clock, for iat and the reuse window
}): ApnsSender;
export const TOKEN_REUSE_MS = 50 * 60_000;
export const IDLE_CLOSE_MS = 30 * 60_000;
```

The cached provider token is keyed by the sha256 of the key record, so a different key, key id or team id
re-mints; `stop` (§2.7) is remembered against the same digest, so keeping a corrected key lifts it.

```ts
// src/main/push/alert.ts (pure)
export const APNS_PAYLOAD_MAX_BYTES = 4096;
export const WAITING_THREAD = 'tortie-waiting';
export interface AlertPlan {
  readonly kind: 'single' | 'count' | 'badge';
  readonly payload: string; readonly priority: 10 | 5;
  readonly collapseId: string | null; readonly ttlSeconds: number;   // 3600 for alerts, 0 for badge
}
export function composeAlert(input: { readonly announce: readonly PocketBlockedRow[]; readonly blockedCount: number }): AlertPlan;
export function composeBadge(blockedCount: number): AlertPlan;
```

```ts
// src/main/push/engine.ts
export const COALESCE_MS = 4_000;
export const ALERT_FLOOR_MS = 30_000;
export const RETRY_AFTER_MS = 15_000;
export interface PushEngineDeps {
  rows(): readonly PocketBlockedRow[];                    // the door's own /v1/blocked rows
  destinations(): readonly PocketPushDestination[];
  providerKey(): Promise<ApnsProviderKey | null>;
  sender: ApnsSender;
  drop(destination: PocketPushDestination): void;
  wake: { onSuspend(cb: () => void): () => void; onResume(cb: (w: WakeWindow) => void): () => void };
  now?(): number; monotonic?(): number;
  schedule?(fn: () => void, ms: number): () => void;      // default setTimeout(...).unref()
  say?(id: PushSentenceId): void;                          // default: the bounded log, once per id per run
}
export interface PushEngine {
  observe(): void;
  status(): { readonly state: 'inert' | 'ready' | 'asleep' | 'no-key' | 'refused'; readonly sentence: string | null; readonly lastBadge: number | null; readonly pending: number };
  beginShutdown(): void;   // admission closed on its FIRST line, before any await
  join(): Promise<void>;   // bounded
}
export function createPushEngine(deps: PushEngineDeps): PushEngine;
```

```ts
// src/main/power/wake-mark.ts
export const WAKE_MEMORY = 16;
export class WakeMark {
  constructor(monitor: PowerMonitorLike, now?: () => number);
  wakes(): readonly WakeWindow[];                        // oldest first, at most WAKE_MEMORY
  onSuspend(cb: () => void): () => void;
  onResume(cb: (w: WakeWindow) => void): () => void;
  dispose(): void;                                       // removes both monitor listeners
}
```

```ts
// src/main/tray/blocked-feed.ts
export interface BlockedSnapshot { readonly sessions: readonly Session[]; readonly projects: readonly Project[]; readonly since: ReadonlyMap<string, number> }
export function installBlockedFeed(core: { onSessionsBroadcast: ((s: Session[]) => void) | null; listSessions(): Session[]; listProjects(): Project[] }, now?: () => number): void; // idempotent; the ONE assignment of the slot
export function onBlockedChange(listener: (snapshot: BlockedSnapshot) => void): () => void;
export function blockedSinceMap(): ReadonlyMap<string, number>;
export function resetBlockedFeedForTests(): void;
```

The stamps stay `blockedSince(prev, sessions, now)`'s (`attention.ts:34-45`), unchanged.

### 9.3 Pinned lines the `ablation:p314` arms edit (Builder B writes each exactly once)

- the loopback refusal in `apns.ts`: `  if (!isLoopbackOrigin(url) && options.allowRemote !== true) {`
- the hex refusal in `apns.ts`: `  if (!/^[0-9a-f]+$/.test(request.token)) {`
- the reuse test in `apns.ts`: `  if (age < TOKEN_REUSE_MS) return cached.token;` (a NEGATIVE age reuses, §2.6; the `J2` arm adds `age >= 0 &&` and must go red)
- the remote filter in `engine.ts`: `    const rows = deps.rows().filter((row) => row.machine === null);`
- the silent seed in `engine.ts`: `    if (!seeded) {`
- the wake suppression in `engine.ts`: `    if (wakeUntil !== null && monotonic() < wakeUntil) return;`
- the drop in `engine.ts`: `      if (answer.kind === 'drop') deps.drop(destination);`
- the single title in `alert.ts`: `` `${row.name} ${row.statusLabel}` ``
- the shape choice in `alert.ts`: `  const single = input.announce.length === 1 && !input.announce[0].seenAtWake;`
- the wake test in `attention.ts` (Builder A): `    (w) => stamp >= w.resumedAt && stamp <= w.resumedAt + WAKE_WINDOW_MS`

A builder who must word one of these differently says so in the report; the integrator re-aims the arm.

---

## §As built — the integrator, 2026-09-22

Three builders built §8 on disjoint files; the integrator reconciled their seams, re-ran §6.8's battery, and
fixed what is recorded under "What the integrator changed". Where this section and §1 to §9 disagree, this
section says what the tree does. Nothing here is visible to a person, and there is still NO CHANGELOG item and
no release (header of this file).

### What the integrator changed, and why

| # | Change | Why, and the proof |
| --- | --- | --- |
| I1 | **A fall is an EVENT, not a state** (`src/main/push/engine.ts` `observe`, `let left` / `const fell = left && lastBadge !== null && ids.size < lastBadge;`). | The builders' engine asked "is the count below the last badge DELIVERED" on every broadcast of any session, so a badge-only send Apple refused was sent again on the next broadcast, every `COALESCE_MS`, beside its one retry. That breaks §2.7 (one retry, none for a 429). Measured on the builders' engine with four new tests (`engine.test.ts`, "a fall is an event, not a state"), 2 s polls for ten minutes: **282** badge sends against a 500 (the rule allows 2), **143** against a 429 (allows 1), a refused key read **150** more times across 300 polls (allows 0), and the next honest fall arriving as `[1, 1, 0]` rather than `[1, 0]`. All four green after the fix. `conformance:push` E7 gains the same scenario driven against the stand-in (58 checks, was 57), and `ablation:p314` gains arm **`E7b`** (the fall asked as a state again), newly red on E7. **Named limit:** a badge-only send that fails for good leaves the phone's badge stale until the next join or fall. |
| I2 | **`src/main/push/__tests__/apns.test.ts` no longer passes `allowRemote`, and `node:http2`'s `connect` is FENCED in that file.** | `conformance:push` H3 was red on `apns.test.ts:222` (`allowRemote: true`), and two tests aimed the sender at Apple's real hosts with only the sender's own refusals and a non-hex token between them and a dial; vitest has no fence. The cleartext test now walks `HOSTILE_ORIGINS` (`http://10.0.0.1:80`, `http://localhost:80`, H3's one exemption) with no `allowRemote`, and still pins the cleartext refusal because it is checked first (removing it makes the remote refusal answer with a different reason). The fence (`vi.mock('node:http2')`) refuses and records anything but `127.0.0.1`/`[::1]`, and `afterEach` asserts the record empty. **Proved**: every refusal in `apns.ts` ablated in place (both refusal functions returning null), the file then restored and proved by sha256: 4 tests red, the fence recorded `api.sandbox.push.apple.com` and `10.0.0.1`, and nothing was dialled. What is lost: "cleartext is refused EVEN WITH `allowRemote`" is now proved by the refusal ORDER (read) and not driven, because H3 forbids `allowRemote` in every test, gate and probe. |
| I3 | `RUNNER_CALLER_FLOOR` 50 → 51 (`build/assert-hermetic-checks.mjs`). | `build/conformance-push.mjs` is the fifty first `tsxCli()` caller; the file's own rule raises the floor in the commit that brings one in. |
| I4 | CLAUDE.md's `conformance:push` row and `build/verification-checks.mjs`'s `ablation:p314` note say 24 arms, at least one per rule. | I1's `E7b`. |

### Where the tree differs from §1 to §9 (the builders' decisions, reconciled and kept)

- **§9.3 shape choice.** As pinned, `composeAlert(input: { announce: readonly PocketBlockedRow[] … })` makes the pinned line `!input.announce[0].seenAtWake` fail to compile under `noUncheckedIndexedAccess`. The parameter is named `request`, destructured `[head, ...rest]` (empty → the badge shape), and a local `const input = { announce: [head, ...rest] as const, … }` carries the pinned line byte for byte. The pinned line is unchanged; the pinned SIGNATURE is not quite what §9.2 says.
- **§2.7 has no row for the sender's LOCAL refusals.** A refused origin answers `later` with status 0 (logged once per sender, naming no origin); a device token that is not lowercase hex answers `drop` (it can never succeed); a key that cannot sign answers `stop` with reason `KeyUnusable`, without connecting. Any other 4xx is `stop`, any other 5xx `retry`. A second `ExpiredProviderToken` on the one retry comes back as `reauth` and the engine treats it as a stop (`refused-key`). Two phones answered expired at once cost ONE re-mint (the failed token is compared with the cached one).
- **§3.5** does not say whether a badge-only send counts toward the 30 s floor. It does not: `lastSentAt` moves on alerts only.
- **§3.6 "zero timers"** holds for joins and falls with no destination. A `resume` schedules the wake flush whatever the destinations (§3.3 step 2); that flush reads no key and opens nothing when there is none. An empty `destinations()` on a join also CLEARS `pending`, so a join while the switch is off is never announced later (probe arm P1's reading).
- **§2.4 step 3** does not say whether ` · …` still follows when the count body is clipped down to its first name. It does, when names were dropped. Past §2.4: a single alert that cannot fit after its name, project and agent are each clipped to `…` is sent in the count shape (unreachable while a session id is a UUID).
- **§1.1 row 3** names "`ape` without `apt`"; the tree refuses `apt` without `ape` too (both or neither), folds uppercase hex to lowercase, and drops a STORED phone row whose push fields are present and malformed.
- **`isPushTokenDigest`** (`pairing.ts`) is a length and a character class rather than the pinned fixed-width 64-hex pattern, because `conformance:pocket` A2 refuses that pattern anywhere in the pocket domain. The code moved; A2 was not loosened.
- **`describePocketDoor`**: the switch line follows the routes line, and each phone's `Alerts for …` line follows its `Allows the phone …` line (§9.1 pins the words, not the order).
- **`PocketPhoneView.alerts`** says whether the phone's TOKEN is live, dropped or absent; it does not read the switch, which is `PocketStatus.pushAlerts`.
- **`seenAtWake`** is computed in `rowOf`, so `/v1/session` carries it too, from the `createdAt` fallback stamp for a session that is not blocked.
- **The seam has SIX refusals** (§5.1 lists five): the seed's `p8File` must sit inside `GMUX_HARNESS_DIR`. It asks for the core only after the first window exists (`browser-window-created`), so it never boots the core ahead of the manifest refusal and the overlay read. Its lines go to the console only, never `app.log`. `clock {offsetMs}` SETS the offset (the probe sends +8 h, then +6 h to go back two). `remove-phone` prints `taken off the door`, because `S1` refuses any status-like word but the one.
- **`blocked-feed.ts`** refuses a second, different core (logged). `disposeTray` no longer resets the stamps, because the map lives in the feed; production installs the tray once and disposes it at quit, so this is not observable.
- **`trayMenuTemplate`** takes a `ReadonlyMap` (a widening; the output is unchanged).
- **`ablation:p313`**: `R3b` re-aimed (Builder A changed its import line in `routes.ts`); `N1` must redden `R4` as well as `N1`.
- **§6.2's hostile "allowed"** cannot be driven under plain node, because `allow` needs the OS keystore; arm `17e` (what the person is asked to allow names the device by a digest the client computed itself) stands in for it.
- **Exports beyond §9**: `checkApnsProviderKey`, `APNS_TOPIC_MAX_BYTES` (`apns-key.ts`); `providerKeyDigest`, `classifyApnsAnswer`, `REQUEST_TIMEOUT_MS` (20 s), `ApnsSenderOptions` (`apns.ts`); `JOIN_BOUND_MS` (3 s), `PushEngineState` (`engine.ts`); `listenerCount` (`drivable-monitor.ts`); `isPushTokenDigest`, `pushTokenDigest`, `POCKET_DEAD_TOKEN_MEMORY` (`pairing.ts`).
- **The ledger's owed decrypt caption** is now owed to "the Notification Service Extension’s later entry" rather than Phase 314.

### What the integrator re-derived rather than trusted

- **The five seams, read from both sides.** (1) Trigger to sender: `core.onSessionsBroadcast` → `blocked-feed.ts` (the one assignment) → `onBlockedChange` → `engine.observe()` → `deps.rows()` = the door's own `routes.blocked().rows` → `composeAlert` → `sender.send`. (2) Sealed key to sender: `apnsKeyStoreForApp().read()` (null on any fault, never throws) → `providerKey()`, read only inside a flush → `mintProviderToken(key.p8)`. (3) Device token to sender: sealed `apt`/`ape` → `openPresentation`'s `presentedPush` → `PocketPresentation` → `allow` → `PocketPhoneFields` (hashed) → `pushDestinations()` → `destination.token` → `:path`, and `environment` → the origin. (4) The age: `blockedAge` in `attention.ts` → `rowOf`'s `seenAtWake` → the alert reads `row.seenAtWake` and never recomputes it (`Y1` green). (5) Inert: `installPushSeam()` returns on its first line when `GMUX_HARNESS_PUSH` is unset; nothing else in `src/main` constructs `PocketHost`, `createApnsSender`, `createPushEngine` or `WakeMark`.
- **Nothing rises for `working`/`idle` or a remote row**: a join is an id entering the door's rows, which are `attentionRows` (needs_input alone), and `localRows()` drops `machine !== null` before anything else.
- **No secret reaches a log call**: every log call on the new path is `apns.ts:435` (one of four constant refusal sentences), `engine.ts` (the four `push-copy` sentences and one constant), `blocked-feed.ts` (two constants), and the seam's `console.log` (counts, states, phone labels, the door rows without question or choices). Main does not patch `console` into `app.log`.
- **No route was added**: `POCKET_ROUTES` is untouched and `R4`'s pin holds (`conformance:pocket` green).
- **No socket but loopback in a test**: every listener in the diff binds `127.0.0.1`; the Apple hosts appear in tests only as seam-parser input (the sender mocked to throw) and in the gate's `HOSTILE_ORIGINS` behind its fence; `apns.test.ts` is now fenced (I2).
- **Every ablation arm's `from` text**, read out of both tables by a scratch reader: all 24 `ablation:p314` arms present exactly once; the 31 `ablation:p313` arms present, `S3` twice in `bind.ts` and `T1` eight times in the hostile client, both as at the parent and both replaced first-occurrence by that harness.

### The battery, as run by the integrator (each under 90 s)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1358 production files, 7692 imports, 0 violations; 0 cycles |
| `npx vitest run --no-cache src/main/push src/main/power src/main/tray src/main/pocket src/main/credentials src/main/harness` | 0 | 42 files, 689 tests, 3.8 s |
| `npx vitest run --no-cache src/shared build/p311` | 0 | 22 files, 293 tests |
| `npm run -s conformance:push` | 0 | 23 rules, 2130 checks, 4.5 s (1 of 23 red, H3, before I2) |
| `P314_ONLY=… node build/ablation-p314.mjs`, three batches | 0, 0, 0 | 7 + 7 + 10 = all 24 arms, each newly red on its own rule; 38.5 s, 38.6 s, 51.1 s |
| `npm run -s conformance:credentials` | 0 | 56.6 s; 12 of 12 rule 23 fixtures; 78 of 78 ablations red |
| `npm run -s conformance:pocket` | 0 | 23 rules, 1887 checks, 0.76 s |
| `npm run -s conformance:pocket:hostile` | 0 | 40 arms, 0.59 s (17a to 17f among them) |
| `npm run -s conformance:phonecopy` | 0 | phonecopy OK |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte; `[env.names]` 116 with `GMUX_HARNESS_PUSH` |
| `node build/assert-background-teardown.mjs` | 0 | 462 files, 2 long-lived starts, 19 of 19 fixtures |
| `node build/assert-hermetic-checks.mjs` | 0 | 230 scripts; 51 `tsxCli()` callers, floor 51 |
| `node build/assert-electron-teardown.mjs` | 0 | 149 reach the helper, floor 149 |
| `node build/assert-import-boundaries.mjs` | 0 | 53 fixtures, 4 directory walls, 0 violations |
| `LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over the 51 touched files, and a byte scan in node | 1 (no match) | 0 files with a control byte |

Not run, and the verifiers': `npm test` whole, `npm run build`, the smokes, `probe:p314` (never run by anyone yet), `ablation:p313` whole, `ablation:p314` in one command, package.

### Open concerns for the verifiers

1. **`ablation:p313`'s arm `T1` dials off this Mac.** It rewrites the hostile client's first `'127.0.0.1'`, which is a CONNECT target (`host:`), to `'100.64.0.1'`, so the driven half makes an outbound connection attempt into the tailnet range and waits about 90 s (Builder A's run measured 97.5 s). It is Phase 313's arm, unchanged here and the same at the parent. Running `ablation:p313` whole does it; `P313_ONLY` without `T1` does not. The operator's call, not this phase's.
2. **The push is tied to the tailnet address.** `pushDestinations()` requires the door's CURRENT fields to be confirmed, and those fields include `bindAddress` (`chooseTailnetAddress()` in production). With Tailscale down or re-addressed, the hash reads `changed` and every push stops with no sentence (`status()` reads `inert`). In this phase the seam pins the address to `127.0.0.1`, so nothing shows it; it is Phase 316's to decide.
3. **`probe:p314` has never run.** Its own Electron count keeps only lines whose command names the profile, which misses the bare `Tortie` main process CLAUDE.md warns about (count by parent pid). Arm P4 needs all twenty rows confirmed within `COALESCE_MS` (4 s) of the first; a straggler goes out 30 s later and the arm reads after 8 s.
4. **Attack the other state-versus-event paths the way I1 was found.** A retry is armed per failed flush; a failed ALERT is not re-sent except by its one retry; the wake flush uses the state check on purpose. Drive broadcasts BETWEEN the scripted answers, not only timers, because that is what hid I1 from every builder test.
5. **`S1` is two spellings held equal by a gate** (the seam's `'needs input'` and `status.ts`'s arm); §1.1 row 1 names the cost and 313 mechanism 8 remains 316's.
6. **The bundle.** `installPushSeam` pulls the pocket and push domains into `out/main/index.js`; confirm an ordinary launch reaches no `startPocketDoor`, `createApnsSender` or key read, and that the sender's refusal sentences survived the bundler (§8, the verifiers).

## §As built — the fix round, 2026-09-22

Both Tier 3 verdicts came back `needs_work`: three major problems (a red unit test, a probe arm that could not pass, and a send with no time limit) and six minor ones between them. The fix ran once. Every change below sits where the finding named it. Nothing was removed, because none of these changes makes anything worse for a person who never pairs a phone. That launch still composes none of this (`installPushSeam` returns on its first line), and the one production-reachable change outside `src/main/push/` is `PocketHost.dropPushToken`, which nothing in an ordinary launch constructs. There is still NO CHANGELOG item and no release.

### What the fix round changed

| # | Finding (verdict) | Change | Where | Proof |
| --- | --- | --- | --- | --- |
| F1 | **major**: `npm test` red. `ipc-sample-sites.test.ts` read `deps.sender.send(` at `engine.ts:311` as a renderer push that was not counted (lens 1, lens 2) | The APNs call is bound as `const apns = deps.sender;` and called as `apns.send(…)`, with a comment saying why. The scanner was not loosened, and no `noteEvent()` was added to an HTTP call | `src/main/push/engine.ts` `deliver` | `ipc-sample-sites.test.ts` green; `src/main` + `src/shared` vitest has only the 5 native FSEvents failures, which both verifiers reproduced at the parent |
| F2 | **major**: a request on a connection that never becomes ready had no time limit. A stalled TLS handshake was still pending at 180 s, and the stuck session was handed to every later send (lens 1). **minor**: a silent h2c peer's session was kept after a timeout, so the retry used the same dead connection; a 200 whose body trickled forever never settled (lens 1) | **Each request has ONE deadline, on the module's own timer**, replacing the stream's idle `setTimeout`. When `REQUEST_TIMEOUT_MS` (20 s) passes with no status, the request settles as unreachable and `abandon()` forgets and DESTROYS its session. That settles every stream on the session, pending ones included, and the next send dials fresh. When the deadline passes after a status has arrived, the request settles on that status and the stream is reset. A body past `ANSWER_READ_BYTES` settles immediately. `ApnsSenderOptions.requestTimeoutMs` is new, **for tests and gates only**, so a silent peer can be driven in 300 ms. Production leaves it unset, and a value that is not a positive finite number is ignored | `src/main/push/apns.ts` `post`, `abandon`, header | `apns.test.ts`: 4 new tests (a stalled TLS handshake, a silent h2c peer, a trickle, a flood past the cap). `conformance:push` E7: `peersThatNeverAnswer()` covers both silent peers, checking that the send settles, the dead connection is closed, and a second connection is dialled, plus the trickle through the stand-in's new `{ trickle: true }`. Arms **E7c** (the abandon deleted) and **E7d** (the deadline put back to the stream's idle timer, the first build's exact code) are each newly red on E7 |
| F3 | **major**: `probe:p314` P4 could not pass. The monitor captures at most `MAX_CAPTURES_PER_TICK = 6` screens a tick, and held dialogs take the whole budget, so the verifiers saw 6 of 20 blocked in one run and 1 of 20 in the other (lens 1, lens 2) | **P4 now blocks exactly `MAX_CAPTURES_PER_TICK` sessions**, read from `src/main/activity/monitor.ts` by text, and it runs only once `AMBIGUOUS_WINDOW_MS` (read from `state-machine.ts`) has passed since the probe last made a pane print, so no other pane competes for a capture. It expects one request per phone, `Needs your input (N)`, badge N, and every name in the body. When the monitor never confirms the N sessions, or a row was already blocked, the arm is graded **unreadable, not failed**, and at HEAD **an unreadable arm exits 2 and is never a pass**. The probe now creates 16 sessions rather than 30. Twenty at once stays proved under node (`conformance:push` E3). **CORRECTED AFTER THE REVERIFY: what this fix got wrong.** It read the capture budget as the only way the monitor misses a block, so it graded "unreadable" in P4 alone. The fake agent printed its dialog in ONE burst after a long silence, and the monitor misses that shape about 1 time in 5 (171 of 800 simulated timings, the one second activity race named under "§As built — the real-agent round"). Every other arm graded that miss as a push failure. | `build/probe-p314.mjs` header, constants, P4 | **Run by the reverifier: exit 1 in 2 of 2 runs, on DIFFERENT arms, and neither red arm was a push defect.** The operator ruled on 2026-09-22 that the app run drives real agents ("should we just use a real agent? … so we can fix this correctly"). **Superseded by "§As built — the real-agent round"**: real agents, and every arm graded in two steps, the block read from main first and the push judged only when it blocked |
| F4 | **minor**: a 410 drop only held if the sealed write succeeded, so with the keystore gone the dead token was asked on every later alert (lens 1) | **Both sides.** The engine keeps its own `dead` set of digests for the run and reads every destination through `liveDestinations()`. `PocketHost.dropPushToken` now BELIEVES the drop in memory even when `writePocketStore` fails, because the change only narrows where his words go. Named limit: a restart before the next successful write forgets it | `src/main/push/engine.ts` `settle`, `liveDestinations`; `src/main/pocket/ipc.ts` `dropPushToken` | `engine.test.ts` "never asks a dropped token again even when the host could not write the drop down"; `ipc.test.ts` "is dropped for this run even when the sealed write fails", where the view reads `stopped`, the hash does not move, and the disk still reads `[]`. `conformance:push` E7 has the same scenario against the stand-in with a host that never narrows; arm **E7e** is newly red on E7 |
| F5 | **minor**: when a row left while its alert was in flight, the phone kept a badge above the blocked count (lens 1) | After a DELIVERED send, if the local count is now below the badge just delivered, the badge-only flush is armed at the same delay a fall arms (`nextFlushDelay()`, extracted from `observe`). It is never armed inside the wake window, because the wake's own flush says the count. This is one check per delivery and not a state polled per broadcast, so I1 is not reopened | `src/main/push/engine.ts` `deliver` | `engine.test.ts` "corrects the badge when a row leaves while its alert is in flight"; `conformance:push` E3 "a row leaves while its alert is in flight", which holds the send in flight through `World.hold()`. Arm **E3b** is newly red on E3 |
| F6 | **minor**: a second `ExpiredProviderToken` after the one re-mint stopped the key for the whole run and blamed the key, when the cause is the Mac's clock (lens 1 left this to the operator; lens 2 asked for the fix) | **A `reauth` that reaches the engine is a clock fault.** The key is not stopped and the token is not dropped. The engine says the NEW sentence `PUSH_CLOCK_BEHIND` = `This Mac’s clock is behind Apple’s, so this alert was not sent.` once (`PushSentenceId` gains `'clock'`), and the next join mints again and tries, which is what lets a corrected clock send. The key stop stays for `InvalidProviderToken`, `MissingProviderToken`, `DeviceTokenNotForTopic`, other 4xx and 413. The sender is unchanged: one re-mint and one retry, never a third (J2) | `src/shared/push-copy.ts`; `src/main/push/engine.ts` `settle`, `SENTENCES` | `engine.test.ts` "reads a second ExpiredProviderToken as this Mac’s clock…"; `conformance:push` E7 "a second ExpiredProviderToken is the clock, not the key". Arm **E7f** (the reauth made a key stop again) is newly red on E7 |
| F7 | **minor**: the wake alert put `Seen when your Mac woke` in front of a row that was pending from BEFORE the sleep, which is false of that row and contradicts §1.2 row 11 (lens 2) | **A SPEC ruling, made here, and the operator can reverse it:** the lead is drawn only when EVERY announced row is `seenAtWake` (`announce.every`, was `some`). A mixed batch is still ONE count alert with every name, in the door's order, and no lead. This supersedes §2.3's `<body>` rule, which is left as written above: read "prefixed by `Seen when your Mac woke · ` when EVERY announced row is `seenAtWake`". §3.3 step 4's fold is unchanged. One row seen at the wake is still the count shape with the lead (§2.2 and the pinned shape line are untouched). Why not the other shape the verdict offered, which puts the pre-sleep names before or after the lead: either placement is still read as "these were seen at the wake", and it adds a second separator rule to a 4 KB clip | `src/main/push/alert.ts` `composeAlert` | `alert.test.ts` "leaves the wake out when ANY announced row was not first seen at it"; `conformance:push` A1 checks the mixed composer, and E5 splits into the pure wake (`Seen when your Mac woke · w3 · w2 · w1`, badge 4) and a new "a row pending from before the suspend" scenario (`w1 · p`). Arm **A1b** (`every` put back to `some`) is newly red on A1 and E5 |
| F8 | **nit**: two pairings that presented one device token each received every alert (lens 1) | `liveDestinations()` asks each token digest once | `src/main/push/engine.ts` | `engine.test.ts` "asks a token two pairings presented once"; `conformance:push` E7; arm **E7g** is newly red on E7 |
| F9 | **nit**: the probe's own Electron count could not see a leaked bare `Tortie` (lens 1) | The count now matches the run's own pids: `handle.pid` (the shim) and `handle.appPid()` are recorded in the `finally`, and any Electron, `Tortie` or crashpad line whose pid or parent pid is one of them counts as this run's, besides any line naming the profile | `build/probe-p314.mjs` | Syntax checked; the reverifier runs it |

**Re-aimed:** `ablation:p314` arm `E8`'s `from` is now `    if (liveDestinations().length === 0) {`, because the destination read moved into `liveDestinations()`. **`ablation:p314` is 31 arms** (24 + A1b, E3b, E7c, E7d, E7e, E7f, E7g). CLAUDE.md's `conformance:push` row (its time is now ~6 s, plus the new clauses and 31 arms) and the note in `build/verification-checks.mjs` say so.

### Where the tree now differs from §1 to §9, beyond the table

- **§2.3's count body.** The lead is drawn only when every announced row is `seenAtWake` (F7). §4.1's W-pending arm now reads "folded into the wake alert, `seenAtWake: false`, and the alert does not lead with the wake".
- **§2.6 and §2.7's `403 ExpiredProviderToken` row.** A second `ExpiredProviderToken` on the retry no longer stops. It says `PUSH_CLOCK_BEHIND` and the next join tries again (F6). This supersedes the integrator's line "the engine treats it as a stop (`refused-key`)".
- **§2.7's "a stream or connection error" row** now includes a peer that never answers. Its deadline is the request's own, 20 s, and the connection is destroyed (F2).
- **§9.2 `createApnsSender` options** gain `requestTimeoutMs?`, for tests and gates only (F2).
- **§9.2 `src/shared/push-copy.ts`** gains `PUSH_CLOCK_BEHIND`, NEW copy, and `PushSentenceId` gains `'clock'` (F6).
- **§5.2 the stand-in** gains `{ trickle: true }` and a second export, `startSilentPeer()`, a TCP listener on `127.0.0.1` that never writes. Its importer closes it in a `finally`. It is not a child process, so `gate:background` has nothing new to judge, and the gate stays green.
- **§5.3 P4** is "`MAX_CAPTURES_PER_TICK` at once", and an unreadable arm at HEAD exits 2 (F3).

### Named limits, not fixed

- **`apns-expiration` is read from the Mac's clock.** Under a skewed clock it can already be in the past for Apple, which then does not store the alert for an offline phone. The Mac has no other clock, and F6 now names the fault in words.
- **A clock that stays wrong costs one re-mint per flush.** Each flush is refused twice and mints once. Apple may then answer `429 TooManyProviderTokenUpdates`, which is `later`. Flushes are bounded by the 30 s floor for alerts and by real falls for badges.
- **The monitor's capture budget is older than this phase and belongs to the operator.** With hook-less agents, a seventh session that reaches a dialog while six are held is never captured, so it is never seen blocked, never in the tray, and never pushed. The push can only announce what the status monitor confirms (lens 1, F3).
- **A drop that could not be sealed lasts only this run** (F4).
- **§1.2 row 11's claim now holds, because a mixed batch says no lead.** In that case the alert says nothing about the wake at all, although the door still marks each wake row `seenAtWake` (F7).

### The battery, as run by the fixer (each under 90 s)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1358 production files, 7692 imports, 0 violations; 0 cycles |
| `npx vitest run --no-cache src/main/push src/main/power src/main/tray src/main/pocket src/main/credentials src/main/harness src/main/diagnostics/__tests__/ipc-sample-sites.test.ts` | 0 | 43 files, 703 tests |
| `npx vitest run --no-cache src/main src/shared` | 1 | 560 files, 9723 passed, 7 skipped, 5 failed, all 5 in `store-watch.native` and `repo-watcher.native` (FSEvents, environmental, reproduced at the parent by both verifiers); `ipc-sample-sites` green |
| `npm run -s conformance:push` | 0 | 23 rules, 2165 checks, 6.44 s |
| `P314_ONLY=A1b,E3b,E7c,E7d,E7e,E7f,E7g,E8 node build/ablation-p314.mjs` | 0 | 8 of 8 newly red on their own rule, 83.7 s |
| `P314_ONLY=` the other 23 arms, three batches run at once | 0, 0, 0 | 8 + 8 + 7, each newly red on its own rule; 65.4 s, 65.4 s, 59.4 s. All 31 arms are proved |
| `npm run -s conformance:credentials` | 0 | 64 s |
| `npm run -s conformance:pocket` | 0 | 23 rules, 1891 checks |
| `npm run -s conformance:pocket:hostile` | 0 | 40 arms |
| `npm run -s conformance:phonecopy`, `node build/p311/copy-drift.mjs` and `--self-test` | 0 | phonecopy OK |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `node build/assert-electron-teardown.mjs` | 0 | 149 reach the helper, floor 149 |
| `node build/assert-background-teardown.mjs` | 0 | 462 files, 2 long-lived starts, 19 of 19 fixtures |
| `node build/assert-hermetic-checks.mjs` | 0 | 230 scripts, 51 `tsxCli()` callers, floor 51 |
| `node build/assert-import-boundaries.mjs` | 0 | 0 violations |

Not run, and the reverifier's: `probe:p314` (F3 and F9 have not been driven in the app), `npm run build`, `npm test` whole, `ablation:p314` in one command, and `ablation:p313`.

## §As built — the real-agent round, 2026-09-22

The reverify of the fix round came back `needs_work` a second time on one major problem. `probe:p314` exited 1 in 2 of 2 runs, on different arms. The push itself was proved by that reverify: 25 requests were re-derived byte for byte, every ES256 signature verified, and every attack held. The red arms came from the probe's fake agent, a `/bin/sh` `claude` that printed a committed dialog in ONE burst after a long silence. The activity monitor misses that shape about 1 time in 5, and the probe graded each miss as a push failure (F3, corrected above). The verdict went to the operator, and **his ruling of 2026-09-22 was "should we just use a real agent? … so we can fix this correctly."**

This round rewrote the agent side of the app run to drive real agents. **The push code did not move.** `src/main/push/`, the seam, the key store, the wake rule, the pairing and the door are byte for byte as the reverify left them, because no real-agent run exposed a push defect. `src/main/activity/` was not touched: the monitor's gap is Phase 319's, and Phase 319 is being researched beside this round.

### What changed

| # | Change | Why, and the proof |
| --- | --- | --- |
| R1 | **Real agents, and two of them.** (a) The real Gemini CLI, under the SCRATCH home, with no account, no sign-in and no model turn. In a folder it has never seen, it asks `Do you trust the files in this folder?` as a numbered choice before anything else, and that question is the block. The block is cleared by ending the session, so the question is never answered. (b) The real Claude Code, under the operator's own sign-in, as `conformance:resume` runs it. A wrapper restores his HOME and adds no flag, so the shipped recipe decides every flag. Its real permission request arrives through its HOOK (`PermissionRequest`, registry tier native, hooks `claude-settings`). Escape refuses it each time, so the file is never written. | His ruling. The Gemini question is the committed `gemini-trust-gate.txt` shape, and a preflight on a throwaway socket saw Gemini CLI 0.60.0 draw it live. **Why a question at launch is seen at once, by the state machine's rule:** a new session's state is `starting` (`freshState`). `worthProbing` is true for a `starting` session whatever `#{window_activity}` says, and stays true for 60 s after `lastWorkingAt`. So the session is ambiguous and CAPTURED on every tick within the budget, and two consecutive captures holding the dialog (`DIALOG_CONFIRM_TICKS`) make it `needs_input`. Nothing on that path reads the whole-second activity timestamp that the one second race turns on. Measured: 19 Gemini sessions per run, every one blocked in main, in runs 1 to 3. |
| R2 | **Every arm is graded in two steps.** Step 1 asks whether the session really blocked, read from MAIN (`sessions:list`, and the door's own rows through the seam's `blocked` command), never from the renderer's store. If it did not, the arm reads UNREADABLE, names the agent and the reason, and is never a push failure. When an alert was expected and none came, main is read again: a row that left the blocked set before the flush is unreadable, and a row still blocked is a push failure. Only then is the push judged. At HEAD an unreadable arm exits 2, which is never green. | The ruling's own rule. Run 1 used it as designed: the four Claude arms read UNREADABLE, each naming Claude Code and the reason. The operator's own permission settings let it write the file without asking, so nothing blocked. They did not read as FAIL. |
| R3 | **Claude Code in the operator's configuration, measured rather than assumed.** (1) Claude Code 2.1.280's folder trust question draws no numerals and focuses "No, exit" (`hideIndexes: !0, cancelFirst: !0, focus: "cancel"`, read from the installed binary). A bare Enter would end the session, so the probe presses Down and presses Enter only once it reads "Yes, I trust this folder" focused. (2) His Claude Code starts in "don't ask" mode, as its footer says, and that mode never raises a request. The probe presses Shift+Tab, which is his own keystroke for the session's mode, until the footer reads "manual mode on". That turns the safeguard ON for this one session, with no flag and no settings file touched. (3) His allow rules let it create a file in the working folder without asking in either mode. So the file is asked for inside the scratch project's `.claude/` folder, a protected path Claude Code asks about whatever the allow rules say. The probe verifies each of these steps from the screen before it presses anything, and reads UNREADABLE when a step fails. | Run 1 wrote `p314.txt` in "don't ask" mode with no request. A preflight in manual mode wrote it again with no request. A second preflight asking for `.claude/p314.txt` drew `Do you want to create p314.txt?` with numbered options 1 to 3, Escape refused it, and nothing was written. **One session blocks, clears and blocks again, so the arm takes TWO short turns**: turn 1 raises a request (P2), Escape clears it, and turn 2 raises it again (P3). The only question this Claude Code draws that the monitor can see is the permission request. |
| R4 | **The held release.** "Many at once" means the rows join inside one `COALESCE_MS`, and a real agent's start time varies by seconds. So P4's `MAX_CAPTURES_PER_TICK` sessions and P5's three sessions are each put into tmux copy-mode the moment they exist. Copy-mode is Tortie's own scroll primitive, and the monitor deliberately holds a pane in it (`pane.inMode`, Phase 12.3). Once every pane has drawn its question, they are released together with one tmux command. P4 reads the door's stamps back and is unreadable if they spread past `COALESCE_MS`. P4 and P5 are unreadable if any of their sessions was seen blocked before the release. | P4's stamps spread 0 ms, 0 ms and 1,001 ms in runs 1 to 3, inside the 4,000 ms window. The wake's three rows were first seen 4,296 ms (run 1), 2,192 ms (run 2) and 2,222 ms (run 3) after the resume, inside the 15 s window. |
| R5 | **Two arms added** to what §5.3 named, from the list the orchestrator carried. **P4b, the coalesced window:** after a single alert, two more rows join 4 to 14 s later, inside the 30 s floor, and exactly ONE more request per phone carries both, newest first, at the floor. **P3, working and idle raise nothing:** zero requests while either turn worked (main read `running` during both), and after the second refusal only the badge-only 0 goes out, with main then reading `idle`. | Runs 2 and 3. A REMOTE row is still `conformance:push` E2's alone (see below). |
| R6 | **The app is not this agent's child.** Every Claude Code session variable the probe inherited is REMOVED from the app's environment, and so from every pane. A probe run from a Claude Code session carries that session's id, its messaging socket and its token, the child-session marker, and eight more. His Tortie, started from the Dock, has none of them, and his login shell sets none (measured, names only). The report lists the names and never the values. | In a preflight with the inherited environment, the scratch Claude's footer read `Transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION marker`. So a Claude the probe starts reads the orchestrating session's variables, and the messaging token among them names a socket that session listens on. With them stripped, its pane holds 0 such variables (measured). |
| R7 | **Agent processes are ended by pid.** A real Gemini CLI does NOT end on the hang-up tmux sends when its session ends. On a throwaway socket, both its processes survived a `kill-server` and ended on the first TERM. So when an arm ends its sessions, the probe ends by pid every process it recorded under the scratch server that is no longer under a live pane and still has its recorded command line, with TERM first and then KILL. The `finally` does the same after the teardown. A new closing arm, **no agent process of this run is left**, counts what survives. | `orphansEnded` read 38 in runs 1 to 3, which is both processes of every one of the 19 Gemini sessions. After the teardown, 0 were still up and 0 were left. |
| R8 | **It installs nothing.** Gemini's settings in the scratch home set `general.enableAutoUpdate: false`, `general.enableAutoUpdateNotification: false`, `privacy.usageStatisticsEnabled: false` and `security.folderTrust.enabled: true`, with the key paths read from the installed bundle's schema. An `npm` on the scratch PATH refuses. Claude runs with `DISABLE_AUTOUPDATER=1`. The Claude wrapper also unsets `TMUX` and `TMUX_PANE`. The pid file Claude Code writes into his home would otherwise name a scratch pane (`%0`, `%1`…), and Tortie matches those files by PANE ID ALONE (`claude-registry.ts`), so his running Tortie could read it as one of his own panes. | The committed Gemini fixture itself shows `Attempting to automatically update now...` under a scratch home, and the Gemini on this Mac is an npm-global install that such an update would rewrite. With the settings in place, the preflight drew no update line. |
| R9 | **Documents.** F3 above is corrected. CLAUDE.md's `probe:p314` row and `build/verification-checks.mjs`'s note now describe real agents, two turns, the strip and the end by pid, instead of the fake `claude`. `HELPER_USER_FLOOR` stays 149, because no script was added. | `gate:electron`, `gate:background` and `gate:checks` are green inside `npm run -s build` in runs 1 to 3. |

### Where §5.3 now differs, beyond the table

- There is no fake agent, no trigger file and no `P314_TRIGGERS` or `P314_SCREEN`, and the committed Claude fixture is no longer read. Sessions are created per arm, not all at once, and every arm ends its own sessions before the quiet wait, so no pane competes for a capture. The old settle for `AMBIGUOUS_WINDOW_MS` is gone.
- P1 blocks a Gemini session with the switch off. P2 and P3 are Claude Code's real permission request, twice, on one session. P4 is `MAX_CAPTURES_PER_TICK` Gemini sessions released together. P4b is new. P5's three sessions are started and held BEFORE the suspend and released after the resume, which is the "first seen at the wake" of §5.3, driven with real agents. P6 to P9 each block one or two Gemini sessions.
- P1 now restores the switch in a `finally`, so an unreadable P1 cannot leave every later arm with the push off.
- The ceiling of the one launch is 40 minutes (was 30). Each run measured about 13 to 15 minutes.

### Named limits, not fixed

- **The one second activity race, shared by the push, the tray and ⌘J.** An agent silent for longer than `AMBIGUOUS_WINDOW_MS` (60 s, `src/main/activity/state-machine.ts:55`) that then draws a question in one burst is missed by the status monitor about 1 time in 5. That is 171 of 800 simulated timings, the reverify's measurement. `#{window_activity}` is whole seconds (`src/main/activity/panes.ts:145`), so the first tick after the burst can already read the pane as quiet against `QUIET_MS` (2 s). The session is then never worth probing, never captured and never seen blocked. It is not in the tray, not in ⌘J and not pushed. The push can only announce what the monitor confirms, so this is a limit of all three and not of the push. **It is Phase 319's,** researched with real agents, and this phase does not touch `src/main/activity/`. This probe does not drive that shape, and the limit stays true.
- **Claude Code's folder trust question is invisible to the screen tier.** Claude Code 2.1.280 draws it with no numerals (`hideIndexes`) and focuses "No, exit". `detectDialog` needs `1.` and `2.` rows, so a person who opens Claude Code in a new folder is told nothing by the tray, ⌘J or the push while it waits, and no hook fires for that question. The reading `claudeTrust` was `{ numerals: false, blockedInMain: false }` in runs 1 to 3. The committed `claude-workspace-trust.txt` is an older, numbered shape. This is Phase 319's.
- **Ending a Gemini CLI session in Tortie leaves its processes running.** When a session ends, Tortie runs `tmux kill-session` through `killSession` in `src/main/sessions/core.ts`. Gemini CLI's two node processes survive the hang-up that sends, reparent to launchd, and keep running until something sends TERM. The probe ended 38 of them per run. This is a product defect outside this phase and it is not fixed here. It was NOT inspected on the operator's own sessions. During the round, four `gemini … --yolo --skip-trust` process pairs with parent pid 1 were running on this Mac. They are consistent with the same leak, but whose they are was not inspected, and they were not touched.
- **The probe's Claude reads no pid registry.** The scratch app runs under a scratch home, and the wrapper hides the scratch server from Claude, so Tortie's registry tier never answers for `s1`. Its block is the hook's, and the screen's, because the permission request draws numerals. The registry half of Claude's native tier, as his own app reads it, is not driven by this run.
- **The Claude arms depend on his Claude Code configuration, and say so.** They need Shift+Tab to reach a mode that asks, and a protected path he has not allowed. A configuration that allows it (a rule for `.claude/`, or a mode Shift+Tab cannot leave) makes those arms UNREADABLE, never green by accident.
- **What the Claude session leaves in his home**, as `conformance:resume` does: the transcript and prompt history of each run's two turns in Claude Code's own store, and the scratch folder's trust answer in his Claude config. The probe never reads any of it. The two preflight turns left the same, under the scratchpad.
- **Not driven in the app, and why.** A REMOTE row forced to `needs_input` needs a second machine, and `remoteRowStatus` never produces that status, so no real agent can put one in front of the engine. `conformance:push` E2 drives it. A row already blocked at launch (E6), a join and leave inside the window (E3), the ceiling (A3), the wrong-environment token (E7) and every refusal of the sender (H2) are also the gate's.

### The runs

Each run took the Electron lock, ran `npm run -s build` (including `gate:electron`, `gate:background`, `gate:checks`, `gate:contract`), and ran `npm run probe:p314`. The lock was released on the same command line.

| Run | Build | Probe | Arms | Model turns |
| --- | --- | --- | --- | --- |
| 1 | 0 (35 s) | **2** (14 min 38 s) | P0 ×2, P1, P4, P4b, P5 ×3, P6, P7, P8 ×2, P9, P10, no Electron left and no agent left all PASS. P2 and the three P3 arms were UNREADABLE: Claude Code in his "don't ask" mode wrote the file with no request, so nothing blocked. Not a push reading. | 1 |
| 2 | 0 (28 s) | **0** (13 min 2 s) | All 20 PASS. P2: a real permission request blocked `s1` in main 3,517 ms after turn 1, and one single alert per phone went out (221 bytes, JWT verifies). P3: the refusal sent a badge-only 0 (priority 5, expiration 0). Turn 2 blocked `s1` again after 2,110 ms, with collapse id and thread id equal to P2's. Zero requests while either turn worked, and idle seen after. P4: 6 at once, 0 ms apart. P4b: `x3 · x2` at 30,007 ms. P5: seen 2,192 ms after the resume, alerted at resume + 15,008 ms, `Seen when your Mac woke · w1 · w2 · w3`, the door `seenAtWake` true for all three, `iat` moved 29,125 s. P6: A `[403, 200]`, B 1. P7: 0 sent, `no-key` once. P8: A 200, B 410, dead 1 and stopped; then B 0. P9: 0 and 0. P10: 67 needles, none in `app.log`. | 2 |
| 3 | 0 (29 s) | **0** (13 min 10 s) | All 20 PASS. P2: a real permission request blocked `s1` 4,222 ms after turn 1, and one single alert per phone went out (221 bytes each). P3: badge-only 0, then a re-block 2,815 ms after turn 2 with the same collapse id and thread id, zero requests while either turn worked, and idle seen after. P4: 6 at once, 1,001 ms apart. P4b: `x3 · x2` at 30,006 ms. P5: seen 2,222 ms after the resume, alerted at resume + 15,008 ms, and the door `seenAtWake` true for all three. `iat` moved 29,124 s. P6: A `[403, 200]`, B 1. P7: 0 sent, `no-key` once. P8: A 200, B 410, then B 0. P9: 0 and 0. P10: 67 needles, none in `app.log`. | 2 |

**Preflights**, outside the probe, on throwaway tmux sockets in the scratchpad, each ended in the same command:

- Gemini's trust question under a scratch home. This found the hang-up survival: the two orphans were confirmed by working directory and ended by TERM.
- Claude Code's trust question, which was drawn with no numerals and "No, exit" focused.
- Claude Code's starting mode, read twice from its footer: once with the inherited variables, once with them stripped. It was "don't ask" both times.
- One turn in manual mode, which wrote `p314.txt` with no request.
- One turn asking for `.claude/p314.txt`, which asked, and was refused.

**Model turns in this round: 7.** That is 1 (run 1), 2 (preflights), 2 (run 2) and 2 (run 3). **A green run spends exactly 2.** No Gemini session took a turn or used an account.

### The battery, as run by this round

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1358 production files, 7692 imports, 0 violations; 0 cycles |
| `npm run -s build`, before each run | 0, 0, 0 | 35 s, 28 s, 29 s; `contract-inventory` byte for byte |
| `npm run probe:p314` | 2, 0, 0 | 20 arms each; runs 2 and 3 green in a row, 20 of 20 PASS |
| `npm run -s conformance:push` | 0 | 23 rules, 2165 checks, 5.83 s |
| `node build/assert-electron-teardown.mjs` | 0 | 149 reach the helper, floor 149 |
| `node build/assert-background-teardown.mjs` | 0 | 462 files, 2 long-lived starts, 19 of 19 fixtures |
| `node build/assert-hermetic-checks.mjs` | 0 | `verification-checks.mjs`'s note changed, and the classification did not |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `LC_ALL=C grep -cP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` over every file touched | 0 matches | `build/probe-p314.mjs`, `build/p314/SPEC.md`, `build/verification-checks.mjs`, `CLAUDE.md` |

### What this round did not do

- It did not move the push code, the seam, `src/main/activity/`, the monitor's capture budget or any constant, and it fixed none of the three limits above.
- It did not drive a remote row in the app, or the registry half of Claude's native tier.
- It did not run `npm test` whole, `ablation:p314`, `ablation:p313`, the smokes or package. Those are the verifiers'. It did not run the parent reading (`P314_PARENT_CHECKOUT`).
- It did not commit, stage or stash.
