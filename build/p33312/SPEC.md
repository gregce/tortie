# Phase 333.12 — "a Mac update that adds a door route silently turns off every paired phone until Allow": an update keeps every paired phone working, and only a new route waits for Allow — SPEC

Written by the spec step on 2026-10-14 in `/private/tmp/wt-p33312`, a detached worktree at origin/main `c608070c`
("docs(backlog): his answers to research 141, and 333.12 started"). The parent measured is the release `v0.111.1`
(tag object `4532247a`, commit `b97d3b85`). Between `v0.111.1` and `c608070c` nothing under `src/main/pocket/`,
`src/shared/ipc/pocket.ts`, `src/renderer/settings/PhoneSection.tsx`, `src/renderer/settings/phone/` or
`src/main/capabilities.ts` moved (`git diff --stat v0.111.1 c608070c` over those paths names only tests, the frozen set
and `build/assert-door-only-adds.mjs`), so every `file:line` below holds at both, and the parent's door IS this head's door.

**The spec step MEASURED before it wrote** (§12 holds every command, exit code and number). It re-read every citation of
the entry at `c608070c` (all hold, §2); extracted `v0.111.1` twice into its scratch with `git archive` (no worktree was
added, so `/Users/gdc/gmux/.git` was not written), planted a twelfth read route `probe` into one copy, and drove the
door's own pieces through the pinned tsx with a stand-in `electron` (a scratch userData and a reversible seal, no
keychain): `pocketConfirmStatus`, `PocketHost.mayOpen`, `pushDestinations`, `alertsCanSend` and `openAtLaunch`, then
`removePhone` and `setPushAlerts(false)` on a two-phone door. It took no lock slot (no Electron, no Simulator), started no
agent and no model turn, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live
Tortie profile, and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` was read at its start and around every tsx run: no
command of this step moved either file. `~/.zsh_history` DID move once between two of its commands, written by an
interactive shell his own Tortie started at 20:23:16; §12 records how that was told apart.

**What it found at the parent, in one paragraph.** A store and a record confirmed by a 0.111.1 Mac hash to `bc2abd95…`
over the eleven routes. The same profile read by `v0.111.1` with one route planted reads `changed` (`95380e20…` over
twelve): `mayOpen` false, `pushDestinations` 0, `alertsCanSend` false, the launch `refused`, and the stand-in Tailscale
asked NOTHING, not even `status`, so neither the door process nor the Funnel child can start. Unplanted, the same profile
reads `confirmed`, `mayOpen` true, one push destination, and the launch goes on to read Tailscale. On a two-phone door,
Remove of one phone reads `never` with 0 push destinations, so the OTHER phone goes dark too; alerts off reads `changed`
with exactly one line moved, which today's sheet then confirms by itself (§3).

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.12" (`:41715`); `docs/research/141-several-macs-and-starting-sessions-from-the-phone.md`
§2.3 (`:175-203`) and §4.1 (`:338-402`); the running log line of 2026-10-14 with his eleven answers (`docs/BACKLOG.md`,
last entry); `src/main/pocket/{pairing,ipc,server,writes,bind,routes}.ts`, `src/main/pocket/door/{wire,listener,table,limits}.ts`,
`src/shared/ipc/pocket.ts`, `src/renderer/settings/PhoneSection.tsx`, `src/renderer/settings/phone/steps.ts`,
`src/main/config/confirm-record.ts`, `src/main/harness/push-seam.ts`; `build/conformance-pocket.mjs` R4, SU5, SU6, X12, Y2;
`build/assert-door-only-adds.mjs` R2 and R5; `build/ablation-p313.mjs`; `build/p313/hostile-client.mts`;
`ios/TortieTests/Fixtures/frozen/launch.wire.json`.

**His word, 2026-10-14**, research 141's questions 9 and 10: **(9) "yes"** — Remove keeps the other phones working with no
Allow, inside this phase; **(10) "never"** — a pairing Allow never allows a waiting route; only the Allow whose lines name
a route allows it. Refusal 8 binds every clause: no route answers before a person at the Mac confirmed lines that name it,
and the hash stays over what decides what runs.

**The order of authority.** His word, then research 141 §4.1, then the backlog entry, then the main session's task text,
then this file. The tree at `c608070c` overrides any picture of it here. §Attack, at the end, records what this file's own
attack changed.

---

## 0. The hard rules, stated once

- **No phone code moves.** Nothing under `ios/` is edited, no phone build number moves, and
  `ios/TortieTests/Fixtures/vectors.json` stays byte for byte (`node build/p316/vectors.mjs --check`, inside `npm run build`).
- **No door route is added and no route's meaning moves.** `POCKET_ROUTE_IDS` stays the eleven (SU5 stays green), R4's pin
  stays `ea5930e0…`, `POCKET_EXECUTION_HASH_ALGORITHM` stays `sha256-pocket-exec-v3`, and no IPC channel is added
  (`docs/audits/contract-baseline.txt` does not move; `gate:contract` proves it).
- **Do not edit any file the two phases beside this one own.** 333.4: `build/simulator-run.mjs`,
  `build/assert-simulator-teardown.mjs`, `build/p316/test-ios.mjs`, `build/verification-checks.mjs`, `package.json`,
  `ios/TortieUITests/P316DriveUITests.swift`, `ios/TortieTests/ScreenScrollerTests.swift`. 347.1:
  `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts`, `build/conformance-pathdoors.mjs`. A
  `package.json` script or a `verification-checks.mjs` row this phase needs is NAMED in the report (§11) and added by the
  main session at landing.
- **Do not edit `src/main/harness/push-seam.ts`** (D16): CLAUDE.md's trigger table makes it owe `probe:p314`, which runs
  real agents and real model turns, and this phase may start neither.
- Nobody commits, stages or stashes. `/Users/gdc/gmux` is read only; every shell command begins
  `cd /private/tmp/wt-p33312 &&` or works in the role's scratch,
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33312/<role>/`. Heredoc
  delimiters are quoted. `git diff c608070c` in this worktree is exactly 333.12's delta. Install nothing.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end
  only pids you started. His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` and live Tortie profile are
  never read. **No model turn**; agents are stand-ins only; never start gemini, qwen, agy or grok
  (`build/hidden-agents.mjs` before every launch).
- **His shell history**: before and after every command that starts a shell or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves. Any shell a test starts runs with a
  scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- **No real Tailscale, DNS or APNs**: the Tailscale stand-in (`build/p330/tailscale-standin.mjs` behind
  `GMUX_TAILSCALE_BIN`, preflighted by sha256, sampled), the DNS stand-in (`build/p332/dns-standin.mjs`,
  `GMUX_POCKET_NAME_SERVERS`) and Phase 314's APNs stand-in (`build/p314/apns-stand-in.mjs` behind
  `GMUX_HARNESS_ALERTS`), exactly as `probe:p313` and `probe:p3332` use them. No screenshot.
- **Builders and the integrator launch no Electron.** Every Electron goes through `build/electron-run.mjs` inside
  `build/harness-socket.mjs`, killed in a `finally`; the one new script that reaches it raises `HELPER_USER_FLOOR` (§8).
- **THE LOCK** has three slots shared with two other phases: `zsh /private/tmp/tortie-ops/lock.sh try p33312` (prints the
  slot or exits 1; retry every 60 s in a NEW command), released with `zsh /private/tmp/tortie-ops/lock.sh release <dir>`
  on the same command line. **Disk**: `df -h /` before any parent build or package; under 8 GB free, wait and report.
- **His rule: no scenario worse than today.** Every behaviour that changes is compared with the parent in §9.

---

## 1. The answer first

Today the door's route list is a hashed field that is always THIS BUILD's table, so the update that adds any route moves
the hash, the door reads `changed`, and every paired phone and its alerts go dark until a person presses Allow. This phase
keeps `routes` in the hash and keeps `sha256-pocket-exec-v3`, but makes `routes` mean **the routes a person allowed**:

1. **`allowedRoutes` lives in the sealed `pocket.json` store** (`PocketStore`), read back whole or not at all. When it is
   absent or does not read back whole, the allowed set is `LEGACY_ALLOWED_ROUTES`, the eleven every 0.111.x Mac answered.
   So every 0.111.x store hashes byte for byte as it did, and the update that brings this switches nobody off.
2. **The door serves the routes that are both allowed and in this build.** The door process is handed that set at its
   start and on every change, and refuses a route outside it with the same `404 route` an older Mac gives, before the body;
   main refuses the same before it verifies, again before a read's answer leaves, and in the write path's last check.
3. **A route in this build that is not allowed WAITS.** Settings then Phone draws today's confirm block under a published
   door, its lines the PROPOSAL (the allowed set plus the waiting routes), with Allow; the door stays published and alerts
   keep flowing meanwhile. With nothing waiting the sheet is exactly today's.
4. **Only the Allow whose lines name a waiting route allows it.** `pocket:confirmDoor` records the proposal and then writes
   `allowedRoutes`; the pairing Allow records over the allowed set and the new phone; the alerts-off press and Remove
   record a NARROWER agreement in main, never the proposal.
5. **Remove keeps the other phones working** (his answer 9): Remove on a confirmed door with another phone left records
   the door less that phone, and nothing else stops.

Nothing a person sees changes until a later phase adds a route (346 is the first), except that removing one of two phones
no longer stops the other, and turning alerts off no longer restarts the door.

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **Where the allowed set lives**: `PocketStore.allowedRoutes: readonly string[] \| null` in `src/main/pocket/pairing.ts`, inside the seal (`POCKET_STORE_SEAL_PREFIX`, `:654`), read only by `readPocketStore` (`:805-858`) through `allowedRoutesOf` and written only through `writePocketStore` (`:1032`). `null` means "absent or not whole": read as `LEGACY_ALLOWED_ROUTES`. An older Mac drops the field on its next write, because `readPocketStore` rebuilds the store field by field (`:830-858`) | entry mechanism 1; research 141 §4.1 items 1, 2 |
| D2 | **Whole means**: an array of 1 to `POCKET_ROUTE_LEDGER.length` distinct strings, each an id of THIS build's route ledger (D12), holding every `LEGACY_ALLOWED_ROUTES` id. Anything else (absent, `null`, not an array, empty, a duplicate, a non-string, an id the ledger does not list, a legacy id missing) reads as `null`, never partly. An id the ledger lists that this build's table no longer has IS whole: it stays allowed and hashed and is not served (research 141 §4.1 item 10, "a removed route needs no prompt") | entry mechanism 1, proof "the attack"; CLAUDE.md "an invalid row is dropped whole" |
| D3 | **`LEGACY_ALLOWED_ROUTES` is declared in `src/shared/ipc/pocket.ts`**, sorted, `as const satisfies readonly PocketRouteId[]`, beside `POCKET_ROUTE_IDS`, because the honesty composer (D13) needs its type and `src/shared` cannot import main. `gate:onlyadd` R7 and `conformance:pocket` AR3 hold it equal, as a set, to `launch.wire.json`'s `routes`, and its ledger rows' `METHOD path` membership hash to `ea5930e0…` | entry mechanism 1 |
| D4 | **`fields()` never reads this build's table**: its `routes` are `allowedRoutesFor(store?.allowedRoutes ?? null)` ALWAYS, record or no record. That is stronger than the entry's "when a record exists", and simpler to hold: the table enters only the proposal (D5), the served set and the waiting set (D6). A door with no record reads `never` whatever its routes say, so nothing a `never` door decides reads them | entry mechanism 2, made unconditional |
| D5 | **The proposal is `proposedRoutes(allowed, build, onRecord)`** in the new `src/main/pocket/allowed-routes.ts`: with no record (`never`) exactly the build's table (J39, a first Allow allows every route); otherwise `allowed ∪ build`, sorted. `PocketHost.proposal(fields, state)` is `{ ...fields, routes: proposedRoutes(fields.routes, pocketRouteIds(), state !== 'never') }`. `status().confirmLines` and `confirmHash` are the PROPOSAL's (`describePocketDoor(this.proposal(…))`); with nothing waiting the proposal equals `fields()` byte for byte, so every sheet, probe and seam that confirms `status().confirmLines`/`confirmHash` today keeps doing exactly that | entry mechanism 2; task ("the proposal function's name") |
| D6 | **Served and waiting**: `servedRoutesOf(allowed, build)` is the build's ids that are allowed, in the table's order; `waitingRoutesOf(allowed, build, onRecord)` is the build's ids that are not, only while a record exists (`confirmed` or `changed`), else `[]`. `PocketStatus` gains `routesAllowed` (the served set) and `routesWaiting`. `PocketStatus.routes` stays this build's table, unread by the sheet as today | entry mechanisms 3, 4 |
| D7 | **The door process is handed the served set**: `ToDoor`'s `start` carries `routes` (REQUIRED: a start without it is dropped whole and the door never says `listening`) and `update` may carry it (`src/main/pocket/door/wire.ts:89-96`). Each id must be a `POCKET_ROUTES` id, distinct, at most the table's length; anything else drops the message whole. The listener refuses a route outside it with `refuseRequest(res, 'route')` in the statement after the unknown-route refusal (`door/listener.ts:488-489`), before the window check and before `readCapped` | entry mechanism 3 |
| D8 | **Main asks the same question three times**, through one `PocketHost.routeServed(id)` reading `servedRoutesOf(this.fields().routes, pocketRouteIds())` and nothing else (no record read per request, D21): `server.ts` after refusal 1 and before the pairing arm and `deps.verify` (`:166`, `:178-179`); again in refusal 7 beside `deps.stillPaired` with nothing awaited (`:209-216`); and `writes.ts`'s last check (`:588`) and its `still` (`:583`), as a fourth ask beside the three. The door process's copy can lag main's; main's answer is the one that holds | entry mechanism 3 |
| D9 | **`confirmDoor` records the proposal, then writes the store, then updates the door** (`src/main/pocket/ipc.ts:2157-2190`): the confirmable check as today; `confirmPocketDoor(proposal, consent)`; when the proposal's routes differ from `fields().routes` as a set, `writeStore({ ...store, allowedRoutes: [...proposal.routes] })`; then `postRoutes()` (no restart on a published door) and `queueStart()` as today on a door that is on and not published. **Record first, store second** is the pairing path's order and its stated safe direction (`pairing.ts:1626-1640`): a store write that fails after a recorded agreement leaves the door reading `changed`, which closes it (`closeUnlessConfirmed`) and answers `allowed: false` with `POCKET_ALLOWED_NOT_SAVED` (D9a). Never wider | entry mechanism 5, first bullet |
| D9a | **The one new sentence** is main's refusal, never drawn on a happy path: `POCKET_ALLOWED_NOT_SAVED = 'Tortie could not save what you allowed, so the door will not answer until you allow it again.'` in `src/shared/ipc/pocket.ts`. No word is added to any resting face | CLAUDE.md "Just enough words" |
| D10 | **The pairing Allow needs no edit and gets a rule**: `PocketPairing.allow` (`pairing.ts:1579`) records `fieldsWithPending()` (`:1547-1566`), which is `fieldsNow()` plus the phone, and `fieldsNow` is `() => this.fields()` (`ipc.ts:547`): the allowed set, never the proposal. AR8 pins both, so a later edit that hands it the proposal is red | his answer 10; entry mechanism 5, second bullet |
| D11 | **The alerts-off press is a main-side path of its own, and the sheet's self-confirm is deleted.** `setPushAlerts(false)` reads `fields()` and the gate BEFORE its store write, and when the door read `confirmed` it calls `narrowPocketDoor(before, after)` (D11b) after the write and before its first await, so the door never closes and never restarts. `PhoneSection.tsx`'s `onSetPushAlerts` stops calling `confirmDoor` (`:1399-1415`) and `onlyOneLineMoved` (`:455-465`) is deleted with its test. WHY NOT A RENDERER REFUSAL: refusing in the renderer leaves alerts-off with a route waiting as a door that reads `changed`, whose only way back is an Allow over lines that name the waiting route, so turning alerts off would force allowing the route. Main's narrowing can only take away. It is also one path rather than two, and no renderer code can widen anything | entry mechanism 5, third bullet; his answer 10; task ("a main-side path or a renderer refusal") |
| D11b | **`narrowPocketDoor(before, after)`** in `pairing.ts` writes a record over `after` only when `isPocketSubtraction(before, after)` (exactly one phone gone with every other field equal, or `pushAlerts` true → false with every other field equal, compared by `canonicalPocketText`) AND the record on file is `pocketExecutionHash(before)` under a known seal. It needs no acknowledgement because it can only take away ("a subtraction needs no human", `pairing.ts:724`); its record's `lines` are `describePocketDoor(after).lines`. Its only callers are `removePhone` and `setPushAlerts` (AR8) | entry mechanism 8 |
| D11c | **Remove** (`ipc.ts:2203-2216`) reads `before = this.fields()` and its gate state before the store write (the write stays before the first await, X9), and narrows when the door read `confirmed`, the after-fields are the before-fields less exactly that phone, AND AT LEAST ONE PHONE REMAINS; otherwise it withdraws with `forgetPocketDoor()` as today. Removing the LAST phone keeps today's behaviour (the door stops until Allow): his answer 9 is about the OTHER phones, today's sheet and `probe:p313`'s L1 arm both read a Remove of the only phone as withdrawing the agreement, and a door published for nobody is not a scenario anyone asked for (§13 Q1) | his answer 9; entry mechanism 8; his no-regression rule |
| D12 | **The route ledger is `src/main/pocket/route-ledger.ts`**: `POCKET_ROUTE_LEDGER`, one LITERAL row per id ever in a committed build (`id`, `method`, `path`, `reads`, `signed`, `windowOnly`, `bodyCap`, `clause`), and `POCKET_LEDGER_IDS`. Measured: no id has ever left the table (§12 M3), so it holds the eleven. A TypeScript module rather than JSON because main's reader (D2) imports it and `tsconfig.main.json` includes no JSON outside `src/main/overview/`. AR9 holds the table, `limits.ts`'s caps and `WRITE_CLAUSES` to it; `gate:onlyadd` R8 holds it add-only against every committed copy and every frozen set | entry mechanism 7; task ("the route ledger's path") |
| D13 | **The honesty sentence is composed over the allowed set**: `pocketDoorHonesty(allowed)` in `src/shared/ipc/pocket.ts` answers `POCKET_DOOR_HONESTY` byte for byte for the eleven, plus `It can also <clauses>.` for allowed ids outside the eleven, each clause from `POCKET_HONESTY_ADDED: Readonly<Record<Exclude<PocketRouteId, LegacyAllowedRouteId>, string>>` (`{}` today, so a phase that adds a route cannot compile until it writes its clause, and may rule its words). `POCKET_DOOR_HONESTY` STAYS a literal const, because X12, Z15, Z30 and the `p317`, `p318` and `p337` probes read it as one. The sheet draws `pocketDoorHonesty(status.routesAllowed)` | entry mechanism 6 |
| D14 | **A downgrade then upgrade.** At `v0.111.1` the routes are its own table: a record over exactly the eleven reads `confirmed` there (the downgrade is seamless while nothing beyond the eleven was ever allowed), and a record over more reads `changed` there (today's downgrade). 0.111.1's next store write drops `allowedRoutes`. Back on this phase's build: field absent → the eleven → `confirmed` if the record is over the eleven, `changed` if it was over more; field intact (0.111.1 never wrote) → as before the downgrade. A build that does not know a later build's id reads that store's field as not whole → the eleven → `changed`. In every case the door is at most what was confirmed: **never wider** | task ("how a downgrade then upgrade reads"); research 141 §4.1 item 11 |
| D15 | **The app run is a NEW probe, `probe:p33312`** (`build/p33312/probe-p33312.mjs`), not arms of `probe:p313`: it relaunches ONE profile across FOUR builds (`v0.111.1`, `v0.111.1` planted, this head, this head planted), which `probe:p313`'s three launches of one build cannot hold, and it needs `build/p33312/plant.mjs`. It is built from `probe:p313`'s, `probe:p3332`'s and `probe:p3167`'s own pieces (§7) | task ("a new probe:p33312 or new arms of probe:p313") |
| D16 | **`push-seam.ts` is not edited.** Its `confirmNow` and `openDoorForPairing` confirm `pocketConfirmStatus(host.fields())`'s lines and hash (`src/main/harness/push-seam.ts:643-649`, `:712-716`), which equal the proposal's whenever nothing waits, which is every build until a phase adds a route. Stated for 346: its seam must confirm `status().confirmLines`/`confirmHash` instead, and that edit owes `probe:p314` | CLAUDE.md trigger table (`push-seam.ts` → `probe:p314`, real agents); this phase's hard rules |
| D17 | **No phone code, and `test:ios` is not owed**: no `ios/**` file and no vector moves (`vectors.mjs --check` byte for byte, inside `npm run build`); the pairing and signing functions `test:ios` keys on (`pairing.ts`'s `phoneIdOf`, `pairFingerprint`, `pairingBinding`, the presentation and the verifier, and `tls.ts`) are not edited | entry "What is NOT"; CLAUDE.md probes table (`test:ios`) |
| D18 | **Tier 3**: it decides which requests from the internet are answered (refusal 8's ground) and whether every stranger's phone stays reachable across an update. Two independent methods, one an attack, the parent measured at `v0.111.1`, and the app run. It touches no tmux, manifest or session | CLAUDE.md "The tier sets the BUDGET"; the entry |
| D19 | **New gate ids**: `conformance:pocket` `AR1`–`AR12` (§6.1), its hostile client's `PR1`–`PR7` (§6.2), `gate:onlyadd` `R7` and `R8` (§6.3). Widened on purpose: `SU6` (the honesty is the composer's call) and `Y2` (four asks); `X1` needs no edit, because it finds the last check by its `stillPaired(` call | entry mechanism 9 |
| D20 | **`PocketExecutionFields.routes` widens to `readonly string[]`** (a ledger id this build no longer has may be allowed, D2). The canonical text is unchanged: `NORMALIZE.routes` sorts strings as it always did (`pairing.ts:296`) | D2 |
| D21 | **Main's served set reads the store, not the record.** `routeServed` is asked on every request; reading and opening the sealed record there would add a keystore call to every read. The door runs only on a record the gate read `confirmed` (`mayOpen`, `ipc.ts:1500-1512`), every press that moves a field closes a door that no longer reads `confirmed` (`closeUnlessConfirmed`, `:1555-1564`), and the allowed set only GROWS at run time (only `confirmDoor` writes it, after its record), so the store's set is never wider than the record's | `src/main/config/confirm-record.ts:146-154` ("Do not put the cache back") |
| D22 | **An Allow pressed while the door is opening is served**: `openNow` hands `startPocketDoor` `routes: this.servedRoutes()` and, once the door answered `listening`, calls `postRoutes()` once more, so an Allow that landed between the fork and the listen is not lost until the next restart | §Attack A9 |
| D23 | **The sheet draws a waiting route on a published door only**: `publishRow`'s listening arm (`steps.ts:352-359`) keeps `STATE_PUBLISHED`, `published` and its hover, and its body is `[{ kind: 'confirm' }]` when `routesWait(status)` (listening, `confirmable`, `routesWaiting.length > 0`), else `[]` as today. Every other arm is unchanged: a refused, opening, off or `changed` door draws what it draws today | entry mechanism 4; SU6 |
| D24 | **No CHANGELOG line is written by a builder.** The two draft items go to the main session at landing (§11), so this phase never edits `CHANGELOG.md` beside 333.4 and 347.1 | the task (parallel phases) |

---

## 2. The tree at this head, re-read

Every citation the entry makes was re-read at `c608070c`. **None moved.** The table records each, and the few the spec
step added.

| What | Where, at `c608070c` (= `v0.111.1`) | Held? |
| --- | --- | --- |
| `fields().routes` is `pocketRouteIds()` | `src/main/pocket/ipc.ts:806-819`, `:815` | yes |
| routes sorted in the canonical text | `src/main/pocket/pairing.ts:296` (`NORMALIZE.routes`) | yes |
| the algorithm | `pairing.ts:324` (`sha256-pocket-exec-v3`) | yes |
| the Allow lines' route list and write clauses | `pairing.ts:445`, `:450`; `WRITE_CLAUSES` `:410-415` (not exported) | yes |
| `changed` and its sentence | `pairing.ts:549-551`; `changedRefusal` `:506-512` | yes |
| `mayOpen` refuses with one log line | `ipc.ts:1500-1512` | yes |
| the launch's result discarded | `src/main/capabilities.ts:464` (`void pocketHost.openAtLaunch()`) | yes |
| "A MOVED FIELD NEVER RESTARTS" | `ipc.ts:1434` | yes |
| the push answers nothing unless confirmed | `ipc.ts:2318-2323` (`pushDestinations`), `:2351-2355` (`alertsCanSend`) | yes |
| the pairing Allow needs a listening door | `pairing.ts:1618-1625`; records at `:1626`, saves phones `:1635` | yes |
| `confirmDoor` | `ipc.ts:2157-2190` | yes |
| the alerts-off self-confirm | `src/renderer/settings/PhoneSection.tsx:1399-1415`; `onlyOneLineMoved` `:455-465` | yes |
| Remove withdraws the agreement | `ipc.ts:2203-2216`, `forgetPocketDoor()` at `:2212` | yes |
| `PocketStore` and "a subtraction needs no human" | `pairing.ts:704-739`, `:724` | yes |
| the store's seal prefix | `pairing.ts:654` | yes |
| `readPocketStore` rebuilds field by field | `pairing.ts:805-858` | yes |
| `writePocketStore` | `pairing.ts:1032` | yes |
| the store literal that is not a spread | `ipc.ts:736-746` (`identityNow`): every other write spreads `...store` (`:762`, `:1169`, `:1838`, `:1855`, `:1929`, `:1958`, `:2019`, `:2058`, `:2208`, `:2299`, `:2368`) | added |
| the door process's pins in `start` and `update` | `src/main/pocket/door/wire.ts:89-96`; validator `toDoorOf` `:343-399` | yes |
| the door's unknown-route refusal | `src/main/pocket/door/listener.ts:488-489`; the body read `:502` | yes |
| main's unknown-route refusal | `src/main/pocket/server.ts:178-179`; the pair arm `:166`; refusal 7 `:209-216` | yes |
| the write path's last check and `still` | `src/main/pocket/writes.ts:588` and `:583-584` | yes |
| the start call that forks the door | `ipc.ts:1281-1287` (`startPocketDoor({ handle, publicHost, pins, windowOpen })`) | added |
| the status' confirm lines and hash | `ipc.ts:904-906`; `routes: POCKET_ROUTE_IDS` `:918` | added |
| the sheet's confirm block | `PhoneSection.tsx:844-870`, `data-phone-confirm` at `:849`, honesty at `:852` | yes |
| step 2's listening arm (first match wins, before the confirm arm) | `src/renderer/settings/phone/steps.ts:352-359`; `doorNeedsConfirm` `:106-113`, used `:360` | added |
| `POCKET_DOOR_HONESTY` | `src/shared/ipc/pocket.ts:1107-1109` | yes (`:1107`) |
| SU6 "Keep today's block" | `build/conformance-pocket.mjs:312` (title), `:11448-11512` (body) | yes |
| SU5 and its eleven | `conformance-pocket.mjs:311`, `ROUTES_BEFORE_3331` `:10588`, the check `:11420` | yes |
| R4's pin | `conformance-pocket.mjs:951` (`ea5930e0…`) | yes |
| Y2's three asks | `conformance-pocket.mjs:6830` | added |
| the vitest that pins a moved route list | `src/main/pocket/__tests__/pairing.test.ts:530-580` (two `it`s) | yes, `:553` is inside the second |
| the push seam's confirm | `src/main/harness/push-seam.ts:643-649`, `:712-716` | added |
| R2 and R5 build the shipping handlers | `build/assert-door-only-adds.mjs:2218` (write path), `:2536-2546` (`throughDoor`) | added |
| the other builders of the two handlers | `build/p316/vectors.mjs:1019`, `:1362`; `build/p313/hostile-client.mts:1047`, `:1064`; `src/main/pocket/__tests__/{server,writes}.test.ts` (31 sites) | added |
| the frozen launch routes | `ios/TortieTests/Fixtures/frozen/launch.wire.json` `routes` (11 rows: id, method, path, signed, windowOnly, reads), `routeMembership` `ea5930e0…` | yes |

### 2.1 What a stranger has confirmed

`v0.111.0` and `v0.111.1` hold the same eleven ids; no route id has ever left `POCKET_ROUTE_IDS` in any commit (§12 M3:
four at `38346773`, five at `467b4e4a`, seven at `42becaeb`, eight at `851b3c4c`, ten at `d3d59055`, eleven at
`f5ff5183` and at both tags and this head). So `LEGACY_ALLOWED_ROUTES` is exactly the eleven and the ledger holds eleven
rows.

### 2.2 The door's routes, as the ledger will hold them

| id | method | path | reads | signed | windowOnly | bodyCap | clause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pair` | POST | `/pair` | true | false | true | 4096 (`POCKET_PAIR_BODY_CAP_BYTES`) | null |
| `blocked` | GET | `/v1/blocked` | true | true | false | 1024 (`POCKET_READ_BODY_CAP_BYTES`) | null |
| `session` | GET | `/v1/session` | true | true | false | 1024 | null |
| `turns` | GET | `/v1/turns` | true | true | false | 1024 | null |
| `sessions` | GET | `/v1/sessions` | true | true | false | 1024 | null |
| `screen` | GET | `/v1/screen` | true | true | false | 1024 | null |
| `scrollback` | GET | `/v1/scrollback` | true | true | false | 1024 | null |
| `end` | POST | `/v1/end` | false | true | false | 512 | `end a session` |
| `choose` | POST | `/v1/choose` | false | true | false | 512 | `answer a numbered question` |
| `say` | POST | `/v1/say` | false | true | false | 32768 | `send a session one message` |
| `keys` | POST | `/v1/keys` | false | true | false | 16384 | `type into any session as you would at this Mac` |

The caps are the door's own (`listener.ts:230-233` `bodyCapOf`; `door/limits.ts:41`, `:77`; `wire.ts:36`); the clauses
are `WRITE_CLAUSES` (`pairing.ts:410-415`); the rest is `door/table.ts`'s `POCKET_ROUTES`.

### 2.3 Where today's semantics are assumed by a probe

- `probe:p313` L1: a Remove of the ONLY phone withdraws the agreement and launch 3 must not publish. D11c keeps it true.
- `probe:p316` N9 and R1: alerts off and a Remove re-confirm through `confirmListening`, which answers "already
  confirmed" when the door is (`build/p316/probe-p316.mjs:1406-1427`). They keep working; their comments that the door
  "closes until confirmed again" become stale and are left for the phase that next edits that file.
- `probe:p317` W1 and `probe:p337` (`:511`) read `changed` at HEAD against a parent with fewer routes. They still do: a
  parent's record over five or ten routes against this phase's eleven (the field is absent, so the eleven) reads `changed`.

---

## 3. The parent, measured (method 1, the cheap way)

Two copies of `v0.111.1` were extracted with `git archive` under
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33312/spec/{parent,planted}`,
each with a symlink to this worktree's `node_modules`. `spec/plant.mjs` planted one read route into `planted/`:
`'probe'` in `POCKET_ROUTE_IDS`, the row `{ id: 'probe', method: 'GET', path: '/v1/probe', reads: true, windowOnly: false,
signed: true }` in `door/table.ts`, `'probe'` in `wire.ts`'s `DoorSignedRoute` and `SIGNED_ROUTES`, and
`case 'probe': return { planted: true };` in `ipc.ts`'s read switch (5 edits, 4 files, every anchor matched once).
`spec/electron-stub.ts` stood in for `electron` through a scratch `tsconfig` `paths` entry: `app.getPath` answers a
scratch userData, `safeStorage` seals with a marker (never the keychain), `utilityProcess.fork` throws. The pinned tsx is
`/private/tmp/wt-p33312/node_modules/tsx/dist/cli.mjs`.

`spec/measure.mts` with `P33312_MODE=seed` at the PARENT wrote a 0.111.1 store (one phone with a client key and an alert
address, port 8443, the stored Tailscale facts, `bindAtLaunch`, `enabled`, `pushAlerts`) and recorded the agreement over
`pocketRouteIds()` the way the Allow press does. `P33312_MODE=read` then built the SHIPPING `PocketHost` over a recording
Tailscale (every exec answers a failed read, every spawn throws) and a door spawner that throws:

| Tree | routes | hash now | recorded | state | `mayOpen` | push destinations | `alertsCanSend` | launch | Tailscale asked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `v0.111.1` | 11 | `bc2abd95…` | `bc2abd95…` | confirmed | true | 1 | true | refused (the stub's read) | `status --json --peers=false` |
| `v0.111.1` + `probe` | 12 | `95380e20…` | `bc2abd95…` | **changed** | **false** | **0** | **false** | refused | **nothing** |

The planted build never asks Tailscale, so it never forks the door process and never spawns the Funnel child; the sheet's
refusal is `changedRefusal`'s sentence. That is the outage, measured.

`spec/measure-presses.mts` on a fresh userData with TWO phones confirmed (both with alert addresses), at the parent:

| Press | state before | after | `mayOpen` after | push destinations after |
| --- | --- | --- | --- | --- |
| `removePhone(first)` | confirmed (2 destinations) | **never** | false | **0** — the second phone and its alerts are off |
| `setPushAlerts(false)` | confirmed (2 destinations) | changed, exactly 1 line moved | false | 0 (the switch) |

The second row is main alone: today's sheet then calls `confirmDoor(after)` because one line moved (`PhoneSection.tsx:1405-1414`),
after `closeUnlessConfirmed` (`ipc.ts:2302`) has already stopped a published door, so today's alerts-off restarts the door.

---
## 4. The design, whole

### 4.1 Three sets, never confused

| Set | What it is | Computed by | Read by |
| --- | --- | --- | --- |
| **allowed** | the routes a person allowed: the store's `allowedRoutes` when it reads back whole, else `LEGACY_ALLOWED_ROUTES` | `allowedRoutesFor(store?.allowedRoutes ?? null)` | `fields().routes`, so the hash, the gate, the pairing Allow, the push, the narrowing records |
| **proposal** | what the next door Allow agrees to: the build's table with no record, else allowed ∪ build | `proposedRoutes(allowed, pocketRouteIds(), state !== 'never')` | `status().confirmLines`/`confirmHash`, `confirmDoor` |
| **served** | what answers now: the build's ids that are allowed, in the table's order | `servedRoutesOf(allowed, pocketRouteIds())` | the door process (start, update), `routeServed` in main, `status().routesAllowed`, the honesty sentence |

`routesWaiting` = `waitingRoutesOf(allowed, pocketRouteIds(), state === 'confirmed' || state === 'changed')`.

Invariants, each held by a rule in §6: served ⊆ allowed; with nothing waiting, proposal = allowed as a set, so the
proposal's hash IS `fields()`'s; allowed ⊇ `LEGACY_ALLOWED_ROUTES` always; the store's allowed set is written by
`confirmDoor` alone, after its record, to the proposal it recorded.

### 4.2 Why refusal 8 still holds

The door opens only when `pocketExecutionHash(fields())` equals the sealed record (`mayOpen` → `assertPocketDoorMayBind`),
and `fields().routes` is the allowed set. The record is written by `confirmPocketDoor` over lines a person read
(`consent.hashRead` must be the drawn hash, `pairing.ts:612-619`), or by `narrowPocketDoor`, which only takes away. The
served set is a subset of the allowed set. So every route that answers is in a set whose hash a person confirmed, with
every other hashed field as it stood. Nothing confirms on update; agreeing to eleven routes keeps meaning eleven routes
after an update adds a twelfth.

### 4.3 The flows a person meets

- **Update that adds nothing (this phase's own update over 0.111.x).** The store has no `allowedRoutes` → the eleven →
  the same hash → `confirmed`. Nothing waits; the sheet is today's; the door publishes at launch as before.
- **Update that adds a route (346 and later).** `confirmed`; `routesWaiting` names it; the door publishes and serves the
  allowed set; the phone's request for the new route reads `404 route`, as from an older Mac; Settings then Phone shows
  today's confirm block under "Published" with the proposal's lines and Allow. Allow → the record over the proposal, the
  store's allowed set, the door process updated with no restart; the new route answers.
- **First setup.** `never`: the block shows the build's whole table; the first Allow allows every route (J39).
- **A moved field (public name, tailnet, program, port, push switch on, `bindAtLaunch`).** `changed` as today; the block's
  lines are the proposal, so they name any waiting route too, and one Allow agrees to both (no per-route choice, §10).
- **Pairing a phone while a route waits.** The pairing card's lines are the allowed set plus the phone; its Allow records
  exactly that. The route still waits (his answer 10).
- **Alerts off.** Main records the door less the alerts in the same press, while it reads `confirmed`; the door neither
  closes nor restarts; a waiting route still waits. Alerts ON moves a hashed field and asks as today.
- **Remove one of two or more phones.** Main records the door less that phone; the others keep reading; the removed
  phone's sockets are cut by the pins update as today. Remove of the only phone withdraws, as today.
- **Downgrade and back.** §1.1 D14.

---

## 5. The mechanism, file by file

Every name below is the name to use. Builders own files as §8 lists; a seam two builders share is stated here exactly so
both can build at once.

### 5.1 `src/shared/ipc/pocket.ts` (builder **core**; append-only edits)

1. After `POCKET_WRITE_ROUTE_IDS` (`:139-141`), declare:
   ```ts
   export const LEGACY_ALLOWED_ROUTES = [
     'blocked', 'choose', 'end', 'keys', 'pair', 'say', 'screen', 'scrollback', 'session', 'sessions', 'turns'
   ] as const satisfies readonly PocketRouteId[];
   export type LegacyAllowedRouteId = (typeof LEGACY_ALLOWED_ROUTES)[number];
   ```
   with a comment saying what it is (the eleven every Mac from 0.111.0 to Phase 333.12 answered, the allowed set of every
   store that never recorded one; held to `launch.wire.json` by `gate:onlyadd` R7 and `conformance:pocket` AR3).
2. `PocketStatus` (`:854-977`) gains, after `routes`:
   ```ts
   /** This build's routes a person allowed, in the table's order: what the door answers (Phase 333.12). */
   routesAllowed: readonly PocketRouteId[];
   /** This build's routes a person has not allowed yet, while an agreement is on record; empty otherwise (Phase 333.12). */
   routesWaiting: readonly PocketRouteId[];
   ```
   and the doc of `confirmLines` says they are the PROPOSAL's: the door as it stands with every waiting route in it, which
   are exactly the hashed facts `pocket:confirmDoor` records.
3. After `POCKET_DOOR_HONESTY` (`:1107-1109`, unchanged, still a literal):
   ```ts
   const POCKET_HONESTY_ADDED: Readonly<Record<Exclude<PocketRouteId, LegacyAllowedRouteId>, string>> = Object.freeze({});
   export function pocketDoorHonesty(allowed: readonly string[]): string
   ```
   answering `POCKET_DOOR_HONESTY` when no allowed id has an added clause, else
   `` `${POCKET_DOOR_HONESTY} It can also ${clauses}.` `` with the clauses in the table's key order joined as the Allow
   line joins its own (commas, ` and ` before the last). Pure, and it adds no import to the file.
4. `export const POCKET_ALLOWED_NOT_SAVED = 'Tortie could not save what you allowed, so the door will not answer until you allow it again.';`
   (D9a).

### 5.2 `src/main/pocket/route-ledger.ts` (new, builder **core**)

`export interface PocketLedgerRow { readonly id: string; readonly method: 'GET' | 'POST'; readonly path: string; readonly reads: boolean; readonly signed: boolean; readonly windowOnly: boolean; readonly bodyCap: number; readonly clause: string | null }`,
`export const POCKET_ROUTE_LEDGER: readonly PocketLedgerRow[] = Object.freeze([ … ])` holding §2.2's eleven rows in the
table's order, EVERY VALUE A LITERAL (no import, no computed value, no spread), and
`export const POCKET_LEDGER_IDS: ReadonlySet<string> = new Set(POCKET_ROUTE_LEDGER.map((r) => r.id))`. The header says:
one row per id ever in a committed build; never edited or removed, only appended; an id's row is its meaning, so a route
whose method, path, signing, window, cap or clause must change takes a NEW id. It imports nothing.

### 5.3 `src/main/pocket/allowed-routes.ts` (new, builder **core**)

Pure (no `fs`, no `electron`, no clock). Imports `LEGACY_ALLOWED_ROUTES` and `type PocketRouteId` from
`@shared/ipc/pocket` and `POCKET_LEDGER_IDS`, `POCKET_ROUTE_LEDGER` from `./route-ledger`.

```ts
/** D2: the stored list, whole, sorted and frozen, or null. */
export function allowedRoutesOf(raw: unknown): readonly string[] | null;
/** D1: the allowed set: the stored list, or the eleven. */
export function allowedRoutesFor(stored: readonly string[] | null): readonly string[];
/** D5: with no record the build's table; otherwise allowed ∪ build; sorted. */
export function proposedRoutes(allowed: readonly string[], build: readonly PocketRouteId[], onRecord: boolean): readonly string[];
/** D6: the build's ids that are allowed, in the build's order. */
export function servedRoutesOf(allowed: readonly string[], build: readonly PocketRouteId[]): readonly PocketRouteId[];
/** D6: the build's ids that are not, only on record; else []. */
export function waitingRoutesOf(allowed: readonly string[], build: readonly PocketRouteId[], onRecord: boolean): readonly PocketRouteId[];
```

### 5.4 `src/main/pocket/pairing.ts` (builder **core**)

1. `PocketExecutionFields.routes` becomes `readonly string[]`, its doc "the routes a person ALLOWED (Phase 333.12): the
   hash agrees to them, and a build that answers more makes the rest wait".
2. `PocketStore` gains `readonly allowedRoutes: readonly string[] | null;` with the doc of D1.
3. `readPocketStore` sets `allowedRoutes: allowedRoutesOf((parsed as { allowedRoutes?: unknown }).allowedRoutes)`.
4. `WRITE_CLAUSES` is exported (the vitest of AR9 reads it); its body is unchanged.
5. `export function isPocketSubtraction(before: PocketExecutionFields, after: PocketExecutionFields): boolean` and
   `export function narrowPocketDoor(before: PocketExecutionFields, after: PocketExecutionFields): ConfirmRecord | null`
   exactly as D11b: compare `canonicalPocketText`; read `readState()` once; refuse unless `sealKnown` and the row's hash
   is `pocketExecutionHash(before)`; write `{ id, hash, algorithm, at: Date.now(), lines: describePocketDoor(after).lines }`
   with `writeConfirmRecords`; `fireConfirmationChanged()` on success; null on any refusal.
6. `confirmPocketDoor`'s doc "The only way a pocket confirmation is ever written" becomes "the only way one is written
   over lines a person read; `narrowPocketDoor` is the other, and it can only take away".
7. Nothing else in the file moves: not `NORMALIZE`, not the algorithm, not `describePocketDoor` (it already reads the
   routes it is handed, `:445`, `:450`), not the pairing owner, not a function `test:ios` keys on.

### 5.5 `src/main/pocket/ipc.ts` (builder **core**)

1. `fields()` (`:806-819`): `routes: allowedRoutesFor(store?.allowedRoutes ?? null)`. It names no `pocketRouteIds(`,
   `POCKET_ROUTES`, `POCKET_ROUTE_IDS` or `proposedRoutes(`.
2. `identityNow()`'s literal (`:736-746`) carries `allowedRoutes: store?.allowedRoutes ?? null`.
3. New private methods, each declared once:
   - `proposal(fields: PocketExecutionFields, state: PocketConfirmState): PocketExecutionFields` → `{ ...fields, routes: proposedRoutes(fields.routes, pocketRouteIds(), state !== 'never') }`;
   - `servedRoutes(): readonly PocketRouteId[]` → `servedRoutesOf(this.fields().routes, pocketRouteIds())`;
   - `routeServed(id: PocketRouteId): boolean` → `this.servedRoutes().includes(id)`;
   - `postRoutes(): void` → `if (!pocketDoorStatus().listening) return; updatePocketDoor({ routes: this.servedRoutes() });`
4. The handlers: `createPocketWriteHandler({ …, routeServed: (id) => this.routeServed(id) })` and
   `createPocketHandler({ …, routeServed: (id) => this.routeServed(id) })`.
5. `openNow`: `startPocketDoor({ handle, publicHost, pins: this.pins(), windowOpen, routes: this.servedRoutes(), … })`;
   after `door.ok`, before the Funnel start, `this.postRoutes()` (D22).
6. `status()`: `const offered = describePocketDoor(this.proposal(fields, gate.state));` then `confirmLines: offered.lines`,
   `confirmHash: offered.hash`, `routesAllowed: this.servedRoutes()`,
   `routesWaiting: waitingRoutesOf(fields.routes, pocketRouteIds(), gate.state === 'confirmed' || gate.state === 'changed')`.
   `confirmState`, `refusal` and everything else read `gate` (the allowed set) as today.
7. `confirmDoor` (`:2157-2190`), in this order: `fields`; the confirmable refusal as today; `gate = pocketConfirmStatus(fields)`;
   `proposal = this.proposal(fields, gate.state)`; `record = confirmPocketDoor(proposal, consent)` (the throw on a moved
   hash stays); if `record !== null` and the proposal's routes differ from `fields.routes` as a set,
   `saved = store !== null && this.writeStore({ ...store, allowedRoutes: [...proposal.routes] })`, else `saved = true`;
   on a record the two resets as today; on `record && saved`: `this.postRoutes()` and, as today, `queueStart()` when the
   switch is on and the door is not published; on `record && !saved`: `void this.closeUnlessConfirmed()`; answer
   `allowed: record !== null && saved`, refusal today's sentence when `record === null`, `POCKET_ALLOWED_NOT_SAVED` when
   `!saved`.
8. `removePhone` (`:2203-2216`): `before = this.fields()` and `wasConfirmed = pocketConfirmStatus(before).state === 'confirmed'`
   read before the store write; the write, `postPins`, `addedAt`, `verifier.forget` as today, before the first await;
   then `const narrowed = wasConfirmed && kept.length > 0 && narrowPocketDoor(before, this.fields()) !== null;` and
   `if (!narrowed) forgetPocketDoor();`; then `await this.closeUnlessConfirmed()` as today. Its doc says the others stand.
9. `setPushAlerts` (`:2288-2306`): after the store is known and the switch differs, `before = this.fields()` and its gate
   state before the write; after a successful write, `if (!on && wasConfirmed) narrowPocketDoor(before, this.fields());`,
   still before the first await; then `closeUnlessConfirmed()` and the rest as today. Its doc says off narrows in main and
   on asks as today.
10. Nothing else moves: `pushDestinations`, `alertsCanSend`, `mayOpen`, `rechecks`, `returnMayRun`, `stillPublished`, the
    name check and the pairing owner read `fields()` and so read the allowed set with no edit.

### 5.6 `src/main/pocket/server.ts` (builder **door**)

`PocketHandlerDeps` gains `routeServed(id: PocketRouteId): boolean;` (REQUIRED; doc: "this build's route a person
allowed, asked before anything of a request is read and again before a read's answer leaves"). In the handler: right
after refusal 1 (`if (closing()) return refuse('shutdown');`, `:164`) and before the pair arm (`:166`),
`if (!deps.routeServed(request.route)) return refuse('route');`. In refusal 7, after `stillPaired` and before `closing()`:
`if (!deps.routeServed(route.id)) return refuse('route');`, nothing awaited between it and the return.

### 5.7 `src/main/pocket/writes.ts` (builder **door**)

`PocketWriteDeps` gains `routeServed(id: PocketWriteRouteId): boolean;` (REQUIRED). The last check (`:588`) becomes
`if (deps.shuttingDown() || door.stopping() || !deps.stillPaired(verifiedPhone) || !deps.routeServed(verb)) return { status: 404, body: null };`
and `still` (`:583-584`) asks the same four, in that order. Nothing is added between the last check and the act.

### 5.8 `src/main/pocket/door/wire.ts`, `door/listener.ts`, `bind.ts` (builder **door**)

- `wire.ts`: `ToDoor`'s start gains `readonly routes: readonly PocketRouteId[];`, update `readonly routes?: readonly PocketRouteId[];`.
  A `routesOf(value)` validator: an array of at most `POCKET_ROUTES.length` distinct strings, each a `POCKET_ROUTES` id, or
  null. `toDoorOf`'s start returns null without valid `routes`; its update returns null for present-but-invalid `routes`.
  The header's "what crosses" list names the served set.
- `listener.ts`: `let served = new Set<PocketRouteId>();` set from the start message and replaced on an update that
  carries `routes`; in `handleRequest`, the statement after `if (route === null) return refuseRequest(res, 'route');`
  (`:489`) is `if (!served.has(route.id)) return refuseRequest(res, 'route');`. No socket is cut when the set moves: each
  request is asked.
- `bind.ts`: `DoorStartInput.routes: readonly PocketRouteId[]` (required), posted in the start message (`:322-328`);
  `update()` and `updatePocketDoor()` (`:374-379`, `:604`) take `routes?` beside `pins?` and `windowOpen?`.

### 5.9 `src/renderer/settings/phone/steps.ts` and `PhoneSection.tsx` (builder **core**)

- `steps.ts`: `export function routesWait(status: PocketStatus): boolean` → `status.state === 'listening' && status.confirmable && status.routesWaiting.length > 0`;
  `publishRow`'s listening arm keeps its state, key and hover and draws `body: routesWait(status) ? [{ kind: 'confirm' }] : []`.
  `doorNeedsConfirm` is unchanged. Re-exported from `PhoneSection.tsx` beside `doorNeedsConfirm`.
- `PhoneSection.tsx`: the confirm block draws `<p className="set-config-warning">{pocketDoorHonesty(status.routesAllowed)}</p>`
  where it drew `POCKET_DOOR_HONESTY` (`:852`), and nothing else in the block moves; `onSetPushAlerts` keeps its
  `run(…).then(adopt)` and calls no `confirmDoor`; `onlyOneLineMoved` is deleted. `confirmDoor` (the helper, `:1295-1305`)
  is called from `onConfirmDoor` alone. No new word, no new class, no new colour, no menu change.

---
## 6. The gates that move, on purpose (builder **gates**)

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`): twelve new rules, two widened

Each rule is a row of `RULES` with owner `build/p33312/SPEC.md D…`, read with the TypeScript parser as the file's other
rules are, comments blanked, and counts what it checked (a zero where something must be is red). The gate stays
spawn-free: no rule here runs `git` (the ledger's history is `gate:onlyadd` R8's).

| Id | Owner | The rule |
| --- | --- | --- |
| AR1 | D1, D2 | THE ALLOWED SET IS SEALED AND READ WHOLE: `PocketStore` declares `allowedRoutes: readonly string[] \| null`; `readPocketStore` sets it from `allowedRoutesOf(` alone; `allowedRoutesOf` is declared once, in `src/main/pocket/allowed-routes.ts`, refuses (answers `null`) for a non-array, an empty array, more entries than `POCKET_ROUTE_LEDGER`, a non-string, a duplicate, an id outside `POCKET_LEDGER_IDS` and a list missing any `LEGACY_ALLOWED_ROUTES` id, each a branch the rule finds; no type in `src/shared/` and no door answer carries `allowedRoutes` |
| AR2 | D4 | FIELDS ARE THE ALLOWED SET: `PocketHost.fields()` composes `routes` from `allowedRoutesFor(` over the store's `allowedRoutes` and names no `pocketRouteIds(`, `POCKET_ROUTES`, `POCKET_ROUTE_IDS` or `proposedRoutes(`; `allowedRoutesFor` answers the stored list or `LEGACY_ALLOWED_ROUTES` and nothing else |
| AR3 | D3 | THE LEGACY LIST IS THE LAUNCH LIST: `LEGACY_ALLOWED_ROUTES` is declared once, in `src/shared/ipc/pocket.ts`, a literal sorted array of the eleven, equal as a set to `ios/TortieTests/Fixtures/frozen/launch.wire.json`'s `routes`; the sorted `METHOD path` lines of its ledger rows hash (sha256, joined by `\n`) to `ROUTE_PIN` (`ea5930e0…`) and to the frozen `routeMembership` |
| AR4 | D9, D12 | ONE WRITER OF THE ALLOWED SET: across `src/main/**`, the only object literal or assignment that gives `allowedRoutes` a value other than the store's own (`...store` carried through, or `store?.allowedRoutes ?? null`) is in `PocketHost.confirmDoor`, AFTER its `confirmPocketDoor(` call, and its value is the proposal's `routes` |
| AR5 | D7, D8 | BOTH REFUSALS BEFORE THE BODY: in `door/listener.ts` the statement after the null-route refusal refuses `'route'` for a route not in the served set, and its offset is before `readCapped(` and before the `windowOnly` test; `toDoorOf` drops a start without valid `routes` and an update with invalid ones, each id checked against `POCKET_ROUTES`; in `server.ts` `deps.routeServed(` is asked after refusal 1 and before the pair arm and `deps.verify(`, and again in refusal 7 with nothing awaited between it and the return |
| AR6 | D8, D22 | ONE SERVED SET: `PocketHost` declares `servedRoutes`, `routeServed` and `postRoutes` once each; `servedRoutes` reads `this.fields().routes` and `pocketRouteIds()` through `servedRoutesOf(` and nothing else (no record read); both handlers are handed `routeServed`; `startPocketDoor(` is handed `routes: this.servedRoutes()`; `updatePocketDoor({ routes` is called only inside `postRoutes`; `postRoutes` is called in `confirmDoor` and in `openNow` after the door answered, and returns while the door is not listening |
| AR7 | D13 | THE WORDS FOLLOW THE ALLOWED SET: `pocketDoorHonesty` is declared once, in `src/shared/ipc/pocket.ts`, and DRIVEN (transpiled in memory) answers `POCKET_DOOR_HONESTY` byte for byte for `LEGACY_ALLOWED_ROUTES`; `POCKET_HONESTY_ADDED` is typed `Record<Exclude<PocketRouteId, LegacyAllowedRouteId>, string>`; the sheet's confirm block draws `pocketDoorHonesty(status.routesAllowed)` and no file under `src/renderer` draws `POCKET_DOOR_HONESTY` itself; `describePocketDoor`'s route and clause lines read only `fields.routes` |
| AR8 | D9, D10, D11, D11b | THE THREE CONFIRM PATHS AND THE TWO NARROWINGS: (a) `confirmDoor` hands `confirmPocketDoor(` the result of `this.proposal(`, never `this.fields()`; (b) `PocketPairing` is built with `fieldsNow: () => this.fields()` and `allow` hands `confirmPocketDoor(` `this.fieldsWithPending()` alone; (c) in `PhoneSection.tsx` the `confirmDoor` helper is called exactly once, inside `onConfirmDoor`, and `onSetPushAlerts` calls no `confirmDoor` and no `api.confirmDoor`; (d) `narrowPocketDoor(` is called only in `removePhone` and `setPushAlerts`, and its body calls `isPocketSubtraction(` and compares the record's hash with `pocketExecutionHash(before)` before `writeConfirmRecords(`; `isPocketSubtraction` admits exactly one phone gone or `pushAlerts` true to false, by `canonicalPocketText(` |
| AR9 | D12 | THE TABLE IS HELD TO THE LEDGER: `POCKET_ROUTE_LEDGER`'s rows are literals; every `POCKET_ROUTES` row has a ledger row of the same id with the same `method`, `path`, `reads`, `signed` and `windowOnly`; its `bodyCap` equals the door's cap for that row (`POCKET_WRITE_BODY_CAPS[id]` for a write, `POCKET_READ_BODY_CAP_BYTES` for a signed read, `POCKET_PAIR_BODY_CAP_BYTES` for the pairing row); its `clause` equals `WRITE_CLAUSES[id]` for a write and is `null` for a read; ledger ids are distinct; every `LEGACY_ALLOWED_ROUTES` id is a ledger id |
| AR10 | D11c | REMOVE KEEPS THE OTHERS: `removePhone` reads `this.fields()` and `pocketConfirmStatus(` BEFORE its store write; the store write stays before the first await (X9 unchanged); `narrowPocketDoor(` is called only under the confirmed reading AND `kept.length > 0`; `forgetPocketDoor()` is reached only when that did not record |
| AR11 | D5, D6 | THE STATUS: `status()` answers `confirmLines` and `confirmHash` from ONE `describePocketDoor(this.proposal(` call, `routesAllowed: this.servedRoutes()`, and `routesWaiting` from `waitingRoutesOf(` over `fields.routes` with the on-record condition naming `'confirmed'` and `'changed'`; `PocketStatus` declares both lists as `readonly PocketRouteId[]`; `proposedRoutes` answers the build alone when not on record |
| AR12 | D23 | THE SHEET DRAWS A WAITING ROUTE ON A PUBLISHED DOOR: `steps.ts`'s `publishRow` listening arm keeps `STATE_PUBLISHED`, `'published'` and `doorListening(` and draws `[{ kind: 'confirm' }]` exactly under `routesWait(status)`, which reads `state === 'listening'`, `confirmable` and `routesWaiting.length > 0` and nothing else; `doorNeedsConfirm`'s body is unchanged |

Widened, on purpose:

- **SU6** ("Keep today's block"): the block holds `confirmLines`, `POCKET_CONFIRM_WARNING`, the honesty sentence as
  `pocketDoorHonesty(status.routesAllowed)` (not the bare const), `POCKET_FUNNEL_RIGHT_WARNING` under
  `funnel.asksApproval` and `confirm-door`, none inside a `<details>`; `confirmDoor` still hands
  `current.confirmLines` and `current.confirmHash` unsliced. The rule's title gains "plus the waiting lines inside it,
  which are the proposal's own lines".
- **Y2**: `still` asks exactly the FOUR asks of the last check (`deps.shuttingDown`, `door.stopping`,
  `deps.stillPaired`, `deps.routeServed`), and the two lists are equal. X1 needs no edit: it finds the last check by its
  `stillPaired(` call, and one more `||` in its condition adds no statement.
- **SU5, R4, X12, Z15, Z30 do not move**, and must stay green: no route is added, the honesty constant is still the
  literal they read.

### 6.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

Every `createPocketHandler`, `createPocketWriteHandler` and `startPocketDoor` the client composes is handed the served
set from ONE variable, `served` (initially the eleven, through the shipping `servedRoutesOf(allowedRoutesFor(null),
pocketRouteIds())`), so every existing arm reads as today. Then the pending-route arms, each graded on its reason word
and, where the refusal is before HTTP or before the body, on the parser and forward counters:

| Arm | What | Want |
| --- | --- | --- |
| PR1 | `served` without `sessions` (an `update` posted to the live door): the honest phone's signed `GET /v1/sessions?…` | `refused-404:route`, `forwarded` unchanged (main never asked) |
| PR2 | the same with a 16 KiB body | `refused-404:route`, never `oversized`: refused before the body is read |
| PR3 | main's handler alone, handed a well-formed `sessions` `DoorRequest` while `routeServed` says no | refused `route`, `verify` called 0 times |
| PR4 | `served` without `say`: an honest `POST /v1/say` | `refused-404:route`, the recording `writes` saw nothing |
| PR5 | the write path with `routeServed` answering no only at the last check (yes before) | 404, no verb called, the ledger keeps no entry |
| PR6 | a read whose answer is composed while `routeServed` turns false before refusal 7 | refused `route`, no body leaves |
| PR7 | the full set posted again by `update`: PR1's request | `ok`, the same answer as the honest arm `0f/v1/sessions` |

Beside them the existing honest arms stay in the same table, so a door that refuses everything fails the run.

### 6.3 `gate:onlyadd` (`build/assert-door-only-adds.mjs`)

- **R2 and R5 drive a door set up with the launch allowed set**: the write handler (`:2218`) and `throughDoor`'s base deps
  (`:2536-2546`) are handed `routeServed: (id) => served.includes(id)` where `served` is the SHIPPING
  `servedRoutesOf(allowedRoutesFor(allowedRoutesOf(undefined)), pocketRouteIds())`, so a composition that stopped serving
  a frozen route reddens R2 or R5 for every request on it.
- **R7, a launch-shaped store keeps the eleven's hash** (new clause): for each frozen set, a store object shaped as 0.111.x
  writes it (exactly `identity`, `phones`, `publicPort`, `tailnetFacts`, `bindAtLaunch`, `enabled`, `pushAlerts`,
  `deadPushTokens`, `nameConfirmed`, no `allowedRoutes`) read through the SHIPPING `allowedRoutesOf` and `allowedRoutesFor`
  gives exactly the frozen set's route ids; `pocketExecutionHash` over a fixed field set with those routes equals the hash
  over the frozen ids; `LEGACY_ALLOWED_ROUTES` equals the `launch` set's ids; and the served set for that store holds
  every frozen route.
- **R8, the route ledger only adds** (new clause): every frozen set's route is a ledger row with its frozen `method`,
  `path`, `signed`, `windowOnly` and `reads`; and against EVERY committed copy of `src/main/pocket/route-ledger.ts`
  (`git log --format=%H -- <path>` and `git show`, read only, the F1 machinery and env), every row of the copy is in
  today's ledger unchanged. No committed copy (true until this phase lands) or no `git` is a printed note, never red and
  never silent. The comparison is one pure function so `ablation:p33311` can drive it with a planted older copy.
- The header's clause list gains R7 and R8; F4 still holds the wiring.

### 6.4 The attacks beside the gates

- **`ablation:p313`** (`build/ablation-p313.mjs`) gains at least one arm per AR rule (AR1a… AR12a; AR1, AR5, AR8 and AR9
  at least two each, one per clause that carries the safety: e.g. `allowedRoutesOf` accepting an id outside the ledger,
  the listener's served check moved after `readCapped(`, `server.ts`'s top ask removed, `confirmDoor` recording
  `this.fields()`, the pairing owner handed the proposal, the sheet's alerts-off self-confirm put back,
  `narrowPocketDoor` called from `confirmDoor`, `isPocketSubtraction` admitting a route added, a ledger cap that is not
  the door's), an arm for SU6's widened clause and one for Y2's fourth ask, and every existing arm whose `from` anchor this
  phase moved is re-anchored so it still reddens the rule it owns (the integrator lists them). Two new driven checks join
  `CHECKS`: `allowed` (vitest over `src/main/pocket/__tests__/p33312-allowed-routes.test.ts`) and `served` (vitest over
  `src/main/pocket/__tests__/p33312-served.test.ts`), each tagged `[p313 allowed]` and `[p313 served]` by the harness, for
  the arms whose clause only a driven owner shows (the record-then-store order, the narrowing's subtraction test, the last
  check's fourth ask). The header gains a PHASE 333.12 paragraph with the new count.
- **`ablation:p33311`** (`build/p33311/ablation.mjs`) gains `R7a` (`LEGACY_ALLOWED_ROUTES` without `keys`: R7 red, R2 or R5
  `alsoRed`), `R7b` (`allowedRoutesFor` answering `[]` for `null`: R7 and R5 red), `R8a` (a ledger row's `path` moved
  against the frozen set: R8 red), `R8h` (the history half driven through the pure function with a planted older copy
  whose row differs: red) and `R8g` (a ledger row edited in the clone, read against the REAL committed copies: red; until
  a committed copy exists it prints `not run: no committed copy of the ledger yet`, never a pass and never a fail). A
  control `R8c`: a twelfth ledger row appended, green.
- **`build/p316/vectors.mjs`** hands its `createPocketHandler` (`:1019`) and `createPocketWriteHandler` (`:1362`) the same
  served predicate as R2 (the launch allowed set). `node build/p316/vectors.mjs --check` must still read
  `ios/TortieTests/Fixtures/vectors.json` byte for byte; if one byte moves, the edit is wrong (D17).

---
## 7. The app run: `probe:p33312` (builder **probe**)

### 7.1 What it is and what it refuses

`build/p33312/probe-p33312.mjs`, run as
`node build/harness-socket.mjs --fresh gmux-p33312 'node build/p33312/probe-p33312.mjs'` (the package script the main
session adds, §11). ONE scratch world for the whole run: a profile under `GMUX_HARNESS_DIR`, a quiet scratch `HOME` and
`ZDOTDIR` with `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, the socket `GMUX_TMUX_SOCKET` that `harness-socket.mjs`
composed (`gmux-p33312-…`, never `gmux`). The profile is RELAUNCHED across builds, ONE Electron at a time, each through
`withElectron` (`build/electron-run.mjs`), killed in its `finally`.

It is built from pieces that already exist, imported, never copied: `build/p316/node-phone.mjs` (the phones, the signed
reads and writes, `sendKeys`), `build/p330/tailscale-standin.mjs` behind a scratch wrapper named by `GMUX_TAILSCALE_BIN`
with `probe:p313`'s sha256 preflight and per-second sampler (a real Tailscale in any sample fails the run; a real
Tailscale a process outside the run owns is reported by pid, as `probe:p316` does), `build/p332/dns-standin.mjs` in the
probe's own process named by `GMUX_POCKET_NAME_SERVERS` with main's UDP sampled by `lsof` (any peer not 127.0.0.1 fails
the run), `build/p314/apns-stand-in.mjs` in the probe's own process behind `GMUX_HARNESS_ALERTS`'s `alerts.json` with a
scratch P-256 key written 0600 and deleted in the `finally` (as `probe:p3332`), `build/hidden-agents.mjs` before EVERY
launch with `agents:list` read back, and the `/bin/sh` `claude` that prints the committed Phase 312 dialog fixture (as
`probe:p313`), so a session blocks with no vendor process and no token.

It refuses, exit 2, before anything starts: when any of the four checkouts below is missing, has no `out/main/index.js`,
or has an `out/` older than its `src/` (`probe:p340`'s rule); when `P33312_HEAD_PLANTED` or `P33312_PARENT_PLANTED` does
not carry `plant.mjs`'s marker; when any stand-in fails its preflight; when `~/.zsh_history` or `~/.bash_history`
(`stat -f '%z %m'`, read only) differs at the end from the start (then the run FAILS and says so). It signals only pids it
started, by pid, after re-reading their command line; never `pkill`, never a negative pid.

### 7.2 The four builds and the plant

| Name | Env | What |
| --- | --- | --- |
| PARENT | `P33312_PARENT_CHECKOUT` | `v0.111.1` (`b97d3b85`), built (`npm ci` is NOT run: `cp -Rc` this worktree's `node_modules`, then `node node_modules/electron-vite/bin/electron-vite.js build`) |
| PARENT_PLANTED | `P33312_PARENT_PLANTED` | a second `v0.111.1` copy with `node build/p33312/plant.mjs <dir>`, built the same way |
| HEAD | this worktree | `npm run build` |
| HEAD_PLANTED | `P33312_HEAD_PLANTED` | `cp -Rc` of this worktree (no `out/`, no `release/`), planted, built with the bundler alone (its gates would refuse a planted route, which is the point of them) |

`build/p33312/plant.mjs <checkout>` plants ONE signed read route, `probe` (`GET /v1/probe`), answering `{ "planted": true }`:
`'probe'` appended to `POCKET_ROUTE_IDS`; the row appended to `door/table.ts`'s `POCKET_ROUTES`; `'probe'` in `wire.ts`'s
`DoorSignedRoute` and `SIGNED_ROUTES`; `case 'probe': return { planted: true };` before `case 'pair':` in `ipc.ts`'s read
switch; and, where `src/main/pocket/route-ledger.ts` exists (HEAD), the ledger row
`{ id: 'probe', method: 'GET', path: '/v1/probe', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null }`.
Every anchor must match exactly once or NOTHING is written (exit 1, naming the anchor). It writes a marker file
`.p33312-planted` at the checkout's root, refuses a checkout without one of the two shapes, refuses `/Users/gdc/gmux`
and any path not under `/private/tmp`, and refuses a checkout already planted. The spec step's own `spec/plant.mjs`
(§3) is its proof of shape on `v0.111.1`.

### 7.3 The launches and the arms

Six launches on one profile, in this order. Every arm's verdict is read from outside the app (the node phones, the
stand-ins' own logs and records, `ps -Ao pid,ppid,command`, `capture-pane -p` on the scratch socket, and
`window.gmux.pocket.status()` over CDP), never from a report the app wrote about itself. Presses are the sheet's own:
`window.gmux.pocket.*` exactly as Settings then Phone calls it, and, where the arm is about the BUTTON, a click dispatched
on the real element (`[data-phone-action="confirm-door"]`).

**L1 at PARENT, the stranger's Mac** (setup; its arms are the baseline): door on, the lines, Allow; published through the
stand-in; the scratch key kept through the override; alerts on, Allow; phone A and phone B paired (v:3, the proof, both
presenting an alert address `apt`/`ape`); both read `/v1/blocked` 200; a session newly blocks and the APNs stand-in records
at least one alert. **B1** grades it: no arm after this is readable unless L1 reached two paired, reading phones with
alerts recorded.

**L2 at HEAD, the update that fixes it** (no press): **U1** published with no press; `confirmState` `confirmed`;
`routesWaiting` `[]`; `routesAllowed` the eleven; `confirmHash` equal to L1's last `confirmHash` (the same agreement, byte
for byte); no `[data-phone-confirm]` element in Settings then Phone; both phones read; a new block records an alert.

**L3 at PARENT_PLANTED, the parent measured** (no press): **M1** `confirmState` `changed`; never published; the stand-in
records no `funnel` argv since this launch began; no door process (no child of the app's main pid carrying the door
module); both phones' connections to the last forwarder port are refused; a new block → the APNs stand-in records 0 alerts
in 45 s; and the sealed `pocket.json` and `config-confirmations.json` are byte for byte what L2 left (sha256), so L4 starts
from the profile a 0.111.x Mac and this phase's Mac left.

**L4 at HEAD_PLANTED, a route waits** (no press until H5):
- **H1** published with no press; `confirmed`; `routesWaiting` `['probe']`; `routesAllowed` the eleven; the door process
  and Funnel child pids recorded.
- **H2** both phones read `/v1/blocked` and `/v1/screen`; a `keys` write of the text `p33312` into a scratch shell session
  answers `done` and `capture-pane -p` shows it; a new block records an alert.
- **H3** phone A's signed `GET /v1/probe` → 404 with no body (the door's `route`), repeated 3 times.
- **H4** Settings then Phone: step 2 reads `published` and holds exactly ONE `[data-phone-confirm]`, whose lines are
  `status.confirmLines` and name `probe` in the routes line, and whose honesty line is `POCKET_DOOR_HONESTY` byte for byte.
- **H5 pairing does not allow it** (his answer 10): phone C paired through the pairing card: the card's lines do NOT name
  `probe`; after its Allow, `routesWaiting` is still `['probe']` and H3's request still reads 404.
- **H6 alerts off does not allow it, and does not restart**: alerts off (the sheet's switch): `confirmState` `confirmed` at
  the next status with no Allow pressed; `routesWaiting` still `['probe']`; H3 still 404; door and Funnel pids unchanged; a
  new block records 0 alerts in 45 s.
- **H7 Allow allows it, with no restart**: the click on `confirm-door`: within 10 s `routesWaiting` `[]` and phone A's
  `GET /v1/probe` → 200 `{"planted":true}`; door and Funnel pids unchanged.
- **H8 Remove keeps the others**: remove phone C (the sheet's Remove): with no other press, phones A and B read 200
  within 5 s and every read after; phone C's next connection is refused at the handshake; `confirmState` `confirmed`; pids
  unchanged.
- **H9 a moved public name still shuts the door** (control): the stand-in's `dnsName` moved and the sheet's Try again
  pressed: `confirmState` `changed`, the Funnel child gone, phones refused; the name put back and Try again pressed: the
  door publishes again with no Allow (the agreement never moved) and A reads.

**L5 at PARENT, the downgrade**: **DG1** `changed` (the record holds twelve routes, the parent hashes eleven), never
published, phones refused; then the switch off and on (the parent writes its store, dropping `allowedRoutes`), still never
published.

**L6 at HEAD_PLANTED, the upgrade back**: **DG2** `changed`, never published, `/v1/probe` never answered at any moment of
L5 or L6 before the Allow; the Allow → published, `/v1/probe` 200. Never wider than what a person allowed.

**RUN**: the Tailscale preflight held, no real Tailscale sampled, no forbidden argv reached the stand-in, main's UDP only to
127.0.0.1, the APNs stand-in reached only on 127.0.0.1, `agents:list` read the four agents renamed before every launch, no
Electron, stand-in or child of this run left (`ps -Ao pid,ppid,rss,comm` as CLAUDE.md counts it), the scratch socket file
unlinked, his two history files unmoved, and `app.log` holds no token, nonce, signature, PEM line or `apt`.

### 7.4 What it writes, and its self-test

`out/p33312/probe-p33312.json` (per arm a verdict, a sentence, the pids and hashes it compared, never a key, a token, a
signature or a one-shot secret); `P33312_KEEP=1` keeps the scratch world and writes `rederive/` with every status and every
phone answer for the verifier's own reader. `P33312_ARMS` picks arms. Exit 0 when every arm passed, 1 when one failed, 2
when it could not run or an arm was unreadable, which is never a pass.
`node build/p33312/probe-p33312.mjs --grader-self-test` grades recorded fixtures for every arm, each shown red on its own
break and green on its honest reading, and starts nothing (no Electron, no stand-in, no shell) — the integrator runs it;
never through `npm run`, which would hand the flag to `harness-socket.mjs` (the `probe:p336` lesson).

Cost: not yet measured. Budget it at 15 to 25 minutes: six launches, four builds (made first, outside the probe), and five
45-second alert waits. Verifiers only, under THE LOCK.

---
## 8. Builders, disjoint files, and the seams

Four builders. Every file is in exactly one list. None is a file 333.4 or 347.1 owns (§0). Each builder runs
`npm run typecheck` and the vitest files it owns (with a scratch `HOME`) before it returns, and launches no Electron.

| Builder | Owns | Task |
| --- | --- | --- |
| **core** | `src/shared/ipc/pocket.ts`; `src/main/pocket/allowed-routes.ts` (new); `src/main/pocket/route-ledger.ts` (new); `src/main/pocket/pairing.ts`; `src/main/pocket/ipc.ts`; `src/renderer/settings/PhoneSection.tsx`; `src/renderer/settings/phone/steps.ts`; `src/main/pocket/__tests__/p33312-allowed-routes.test.ts` (new); `src/main/pocket/__tests__/pairing.test.ts`; `src/main/pocket/__tests__/ipc.test.ts`; `src/main/pocket/__tests__/switch-queue.test.ts`; `src/main/pocket/__tests__/p3331-return.test.ts`; `src/main/pocket/__tests__/p3331-setup.test.ts`; `src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `src/renderer/settings/__tests__/p3331-steps.test.tsx` | §5.1 to §5.5 and §5.9: the allowed set, the ledger, the reader, the proposal, the served and waiting sets, `confirmDoor`, the two narrowings, the status, the sheet. The tests of §9.2 rows C1 to C14 |
| **door** | `src/main/pocket/server.ts`; `src/main/pocket/writes.ts`; `src/main/pocket/bind.ts`; `src/main/pocket/door/wire.ts`; `src/main/pocket/door/listener.ts`; `src/main/pocket/__tests__/p33312-served.test.ts` (new); `src/main/pocket/__tests__/server.test.ts`; `src/main/pocket/__tests__/writes.test.ts`; `src/main/pocket/__tests__/bind.test.ts`; `src/main/pocket/__tests__/door-wire.test.ts`; `src/main/pocket/__tests__/door-listener.test.ts` | §5.6 to §5.8: the served set handed to and held by the door process, and main's three asks. The tests of §9.2 rows S1 to S8 |
| **gates** | `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/p313/hostile-client.mts`; `build/assert-door-only-adds.mjs`; `build/p33311/ablation.mjs`; `build/p316/vectors.mjs` | §6: AR1 to AR12, SU6 and Y2 widened, PR1 to PR7, R2/R5 driven with the launch allowed set, R7 and R8, every new and re-anchored ablation arm, the vectors' served predicate |
| **probe** | `build/p33312/probe-p33312.mjs` (new); `build/p33312/plant.mjs` (new); `build/p33312/CHECKLIST.md` (new); `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 173 → 174, one line, and nothing else in the file) | §7 and the checklist row of §9.4. Writes the probe and its self-test; never runs the probe |

**The seams, exact** (two builders build against them at once; the integrator reconciles):

1. `PocketHandlerDeps.routeServed(id: PocketRouteId): boolean` (door) ← `routeServed: (id) => this.routeServed(id)` in `ipc.ts` (core).
2. `PocketWriteDeps.routeServed(id: PocketWriteRouteId): boolean` (door) ← the same in `ipc.ts` (core).
3. `DoorStartInput.routes: readonly PocketRouteId[]` and `updatePocketDoor(update: { pins?: …; windowOpen?: boolean; routes?: readonly PocketRouteId[] })` (door) ← `openNow` and `postRoutes` (core); the `ipc.test.ts` mock of `../bind` records `routes` in `door.inputs` and `door.updates` (core).
4. `allowedRoutesOf`, `allowedRoutesFor`, `servedRoutesOf` exported from `src/main/pocket/allowed-routes.ts` (core) ← imported by `assert-door-only-adds.mjs`, `hostile-client.mts` and `vectors.mjs` under tsx (gates).
5. `LEGACY_ALLOWED_ROUTES`, `pocketDoorHonesty`, `POCKET_DOOR_HONESTY` from `src/shared/ipc/pocket.ts`, `POCKET_ROUTE_LEDGER` from `route-ledger.ts`, `WRITE_CLAUSES`, `narrowPocketDoor` and `isPocketSubtraction` from `pairing.ts` (core) ← read by the gates (gates).
6. `PocketStatus.routesAllowed`, `routesWaiting`, and the meaning of `confirmLines`/`confirmHash` (core) ← read by the probe over CDP (probe).
7. `build/p33312/plant.mjs`'s anchors (probe) ← the shapes of `wire.ts` (door), `ipc.ts`'s read switch and `route-ledger.ts` (core): the switch's `case 'pair':` line, the `SIGNED_ROUTES` line and the `DoorSignedRoute` line keep today's spelling.

---

## 9. The proof, run rather than read

### 9.1 The battery (the integrator, then the committer at landing)

`npm run typecheck`; `npm run build` (which runs `conformance:ios` and its `vectors.mjs --check`, `gate:onlyadd`,
`gate:electron`, `gate:background`, `gate:checks`, `gate:contract` and the rest); the whole vitest with a scratch `HOME`;
`npm run package` (then `release/` removed); `conformance:pocket`, `conformance:pocket:hostile`, `gate:onlyadd`,
`conformance:machines` (`src/renderer/settings/**` moved), `conformance:phonecopy` (`PhoneSection.tsx` moved),
`conformance:push` (the push reads `fields()`), `ablation:p313`, `ablation:p33311`, `gate:contract` (must read no diff),
`gate:checks`, `gate:electron` (the floor 174), `gate:background`, and `node build/p33312/probe-p33312.mjs --grader-self-test`.
`smoke:t1` launches an Electron and is the verifier's.

### 9.2 What each builder's tests must show (driven, not read)

Core (`p33312-allowed-routes.test.ts` unless named; a waiting route is made by `vi.mock('../door/table')` adding a
`probe` row and `vi.mock('../route-ledger')` adding its ledger row, through the SHIPPING `PocketHost` with
`ipc.test.ts`'s mocks of `electron` and `../bind`):

| Row | Shows |
| --- | --- |
| C1 | `allowedRoutesOf` over: absent, `null`, `{}`, `[]`, a non-string, a duplicate, an id outside the ledger, the eleven less `keys`, the eleven + an id outside the ledger → `null`; the eleven in any order → the eleven sorted; the eleven + a ledger id the table lacks → kept |
| C2 | a launch-shaped store (no `allowedRoutes`) and its record from the 0.111.1 field set hash to the same value under `fields()` (the record reads `confirmed`); read `launch.wire.json`'s ids, not a list in the test |
| C3 | `never`: `confirmLines` name the build's whole table; `routesWaiting` `[]`; Allow writes `allowedRoutes` only when the table differs from the eleven |
| C4 | a route waits: `confirmed`, `routesWaiting ['probe']`, `routesAllowed` the eleven, `confirmLines` name `probe`, `pushDestinations` non-empty, `mayOpen` true |
| C5 | Allow while waiting: record first (spy order on the two writes), store second with exactly the proposal's routes; the door gets one `update` with twelve routes; no `stopPocketDoor`, no second `startPocketDoor` |
| C6 | Allow while waiting with the store write failing: `allowed: false`, `POCKET_ALLOWED_NOT_SAVED`, the gate reads `changed`, a published door is closed, the served set never held `probe` |
| C7 | a renderer handing `confirmDoor` the ALLOWED set's hash while a route waits is refused ("changed after it was shown"), nothing recorded |
| C8 | the pairing Allow while waiting: the card's lines do not name `probe`; the record is the eleven + the phone; `probe` still waits |
| C9 | alerts off while waiting: `confirmed` at once, the record is the eleven with alerts off, `probe` still waits, no `stopPocketDoor`; alerts off on a `changed` door records nothing |
| C10 | Remove one of two: `confirmed`, the record is the door less that phone, the other phone's `stillPaired` and `pushDestinations` hold, no `stopPocketDoor`; Remove of the only phone: `never`, as today |
| C11 | a downgrade: a record over twelve with the store's field dropped (written as 0.111.1 writes it) → `changed`, `routesAllowed` the eleven, never `probe` |
| C12 | `pairing.test.ts`: `:530-580`'s two tests re-aimed: a moved ALLOWED set moves the hash, under the same algorithm; `isPocketSubtraction` and `narrowPocketDoor` both ways (a phone added, a field moved, alerts on, a route added: refused; one phone gone, alerts off: recorded; a record that is not `before`'s: refused) |
| C13 | `p3331-steps.test.tsx`: a listening status with `routesWaiting ['probe']` and `confirmable` draws step 2 `published` with one `confirm` piece; with `[]` exactly today's face; a refused or off status with a waiting route draws what it draws today |
| C14 | `p316-phone-section.test.tsx`: the block's honesty line is `POCKET_DOOR_HONESTY` for the eleven; `onSetPushAlerts` reaches `api.setPushAlerts` and never `api.confirmDoor`; `onlyOneLineMoved` is gone |

Door (`p33312-served.test.ts` unless named):

| Row | Shows |
| --- | --- |
| S1 | `toDoorOf`: a start without `routes`, with an unknown id, a duplicate, or more ids than the table → null; an update with bad `routes` → null; good ones round-trip |
| S2 | the in-process listener started without `sessions` refuses the honest phone's `GET /v1/sessions` `route`, before the body (a 16 KiB body still reads `route`), forwarding nothing; after an `update` with the full set it is forwarded |
| S3 | the same for a write route (`POST /v1/say`): refused `route` before the body; nothing forwarded |
| S4 | `server.ts`: `routeServed` false → `route`, `verify` called 0 times; for `pair` too |
| S5 | `server.ts` refusal 7: `routeServed` turning false while the read was composed → `route`, no body |
| S6 | `writes.ts`: `routeServed` false only at the last check → 404, no verb called, the ledger keeps no pending entry |
| S7 | `writes.ts`: `still` answers false when `routeServed` turns false after the claim |
| S8 | `bind.ts`: the start message carries `routes`; `updatePocketDoor({ routes })` posts one `update` |

### 9.3 The verifier: Tier 3, two independent methods and the app run

The verifier must do at least two things the builders did not, one of them an attack, and name them in the verdict
(CLAUDE.md "THE GOVERNING RULE"):

- **Method 1, the parent measured.** `probe:p33312`'s L3 (PARENT_PLANTED) is the app's own reading of the outage, beside
  this file's §3 reading of the pieces; HEAD's L2 and L4 the same profile with the fix. Both readings are required; the
  numbers in the verdict.
- **Method 2, the attack.** Its own plants, written by the verifier, never `ablation:p313`'s alone: each of the three
  confirm paths tried as a way to widen the allowed set (the pairing card handed the proposal, alerts off on a door with a
  route waiting and a moved name together, a Remove whose after-fields also added a route, `confirmDoor` handed the
  allowed set's hash); `allowedRoutes` deleted, emptied, given an unknown id and given a ledger id the build lacks, each
  written into a real sealed store through the shipping `writePocketStore` under tsx with a stand-in seal (the shape of
  `spec/measure.mts`), and the gate's reading compared with the verifier's OWN canonical text and sha256 (a second
  implementation of `canonicalPocketText`, written from §4.1 and `pairing.ts`'s documented rule, not imported); the
  downgrade (L5, L6). The verdict lists each plant and whether the served set ever exceeded the confirmed one (it must
  never).
- **The app run.** `probe:p33312` once, under THE LOCK, with all four builds, and its `P33312_KEEP=1` answers re-derived by
  the verifier's own reader.
- **The battery** re-run once, not twice.

Verdicts are typed `{ verdict, evidence, problems }`. A `needs_work` goes to one fix round and an INDEPENDENT reverify of
the failed items, live; a second `needs_work` stops the workflow and goes to the operator.

### 9.4 One checklist row for him (`build/p33312/CHECKLIST.md`)

His real phone paired with the Mac he uses today (0.111.1 or 0.111.2, whose doors are the same eleven routes), on his
real Funnel. Install the 333.12 build over it and open Tortie FROM THE DOCK, not from a shell (0.111.1's lesson: a shell
gives the Tailscale child a variable a Dock launch does not). With no press: the phone keeps reading, Settings then Phone
shows no Allow, and an alert arrives when a session starts waiting. Then turn alerts off: no Allow is asked, the phone
keeps reading. Turn them on: one Allow, whose lines differ only in the alerts line.

---

## 10. What is NOT in this phase

- **No new route**, and no route's meaning moves. SU5 and R4 stay green; `POCKET_ROUTE_IDS` is the eleven.
- **No key telling the phone which routes are offered.** 346 adds its own.
- **No v4 hash, no per-route off switch, no per-route choice at Allow, no last-seen time per phone.** An Allow over a moved
  field and a waiting route agrees to both, because the lines name both.
- **No other field relaxes.** A new public name, tailnet, program, port, push switch turned ON or `bindAtLaunch` still
  shuts the door until Allow, as today. Only the two subtractions (one phone of several, alerts off) record themselves.
- **No visual mark on the waiting lines, no new word on any resting face, no menu change.** The block is today's block;
  the one new sentence is a refusal drawn only when a store write fails (D9a).
- **No phone code**: no `ios/**` file, no vector, no phone build number. The phone's Allow line
  (`ios/Tortie/Style/Copy.swift:752`) stays true for the fields that still shut the door.
- **No edit to `src/main/harness/push-seam.ts`** (D16), and none to `probe:p313`, `probe:p316`, `probe:p317` or
  `probe:p337`, whose readings stay true (§2.3).
- **No change to 318.1**, which he deferred on 2026-10-13.
- **No release**, and no CHANGELOG line written by a builder (D24).

---

## 11. For the main session at landing

- **`package.json`** (333.4 owns it during the build): `"probe:p33312": "node build/harness-socket.mjs --fresh gmux-p33312 'node build/p33312/probe-p33312.mjs'"`.
- **`build/verification-checks.mjs`** (333.4 owns it during the build): `electron('probe:p33312')` beside
  `electron('probe:p313')`, with a comment in that file's style: one profile relaunched across `v0.111.1`, `v0.111.1`
  planted, HEAD and HEAD planted; the Tailscale, DNS and APNs stand-ins; no vendor process; no token;
  `P33312_PARENT_CHECKOUT`, `P33312_PARENT_PLANTED`, `P33312_HEAD_PLANTED`, `P33312_KEEP`, `P33312_ARMS`.
- **`HELPER_USER_FLOOR`**: this phase raises it to 174. If 333.4 or 347.1 also raised it, the landing reconciles to the
  sum of the scripts each added.
- **`CLAUDE.md`**: in the `conformance:pocket` row, one sentence: "Since Phase 333.12 the route list a record is checked
  against is the set a person ALLOWED, sealed in `pocket.json` and the eleven launch routes when absent: AR1 to AR12 hold
  the reader, `fields()`, the proposal, the one writer (`confirmDoor`, after its record), the served set handed to the door
  process and asked by main three times, the honesty composer, the three confirm paths and the two narrowings (Remove of
  one of several phones, alerts off), and the table held to `src/main/pocket/route-ledger.ts`; the hostile client's PR1 to
  PR7 drive a route that waits." In the `gate:onlyadd` row: "Since Phase 333.12 R2 and R5 drive a door set up with the
  launch allowed set, R7 holds that a launch-shaped store keeps the eleven's hash, and R8 that the route ledger only adds
  (against every committed copy)." In the probes table, a `probe:p33312` row from §7.
- **`CHANGELOG.md`** under `## Unreleased`, the entry's two items: "A Tortie update that adds something your iPhone can do
  no longer switches the iPhone off: what you allowed keeps working, and only the new thing waits for Allow in Settings
  then Phone." and "Removing one phone in Settings then Phone no longer stops your other phones until you press Allow."
  The first is invisible until 346; the release that carries it carries 346 or says nothing of it.
- **After the landing commit**: `node build/p33311/ablation.mjs --only R8g` once, now that a committed copy of the
  ledger exists: R8's history half must read red on its plant through real `git`; then the running-log line and the scratch clean-up
  (this worktree, `scratchpad/p33312/**`, the four probe checkouts).

---
## 12. What the spec step measured, how, and the numbers

All under `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33312/spec/`
(`spec/` below), with `HOME` and `ZDOTDIR` set to `spec/home`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset for every
tsx run. No lock slot (no Electron, no Simulator). `df -h /`: 53 GiB free.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| M1 | `git -C /private/tmp/wt-p33312 archive v0.111.1 src tsconfig.node.json package.json \| tar -x -C spec/{parent,planted}`, `node_modules` symlinked to this worktree's | 0 | 76 MB in `spec/` |
| M2 | `node spec/plant.mjs spec/planted` | 0 | `5 edits in 4 files`; `diff -r` shows exactly the five |
| M3 | `node spec/ids.mjs 38346773 467b4e4a 42becaeb 851b3c4c d3d59055 f5ff5183 v0.111.0 v0.111.1 c608070c` (`git show` of `src/shared/ipc/pocket.ts`, the list parsed) | 0 | 4, 5, 7, 8, 10, 11, 11, 11, 11 ids; every list a superset of the one before: no id ever left |
| M4 | the frozen `routes`' sorted `METHOD path` lines, sha256 (node) | 0 | `ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14` = R4's pin = `routeMembership` |
| M5 | `P33312_MODE=seed` over `spec/parent` (`node <pinned tsx> --tsconfig spec/tsconfig.parent.json spec/measure.mts`) | 0 | 11 routes; store written; recorded; `bc2abd95269ce050d2870506d6a5c19de8e4f11e485ea9300e8102b9d24007cc`; `confirmed` |
| M6 | `P33312_MODE=read` over `spec/parent` | 0 | `confirmed`, `mayOpen` true, 1 push destination, `alertsCanSend` true, launch `refused` (the stub's read), Tailscale asked `status --json --peers=false`; 0.44 s |
| M7 | `P33312_MODE=read` over `spec/planted`, the same userData | 0 | 12 routes, `95380e20243a8ce40db91f9f1746ef07069c44be54f5d6ebb1a332f046f1fd6a` against `bc2abd95…`, `changed`, `mayOpen` false, 0, false, `refused`, Tailscale asked NOTHING; 0.40 s |
| M8 | `spec/measure-presses.mts`, `P33312_PRESS=remove`, two phones, `spec/parent` | 0 | `confirmed` (2 destinations) → `never`, `mayOpen` false, 0 destinations |
| M9 | the same, `P33312_PRESS=alertsoff` | 0 | `confirmed` → `changed`, exactly 1 line moved, `mayOpen` false |
| M10 | `git diff --stat v0.111.1 c608070c` over the pocket domain, the sheet, the contract and `capabilities.ts` | 0 | no source moved (only tests, the frozen set and `assert-door-only-adds.mjs`) |

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737549 1791921744` and `23166 1790702242`
at the start and around M5 to M9, unchanged across every command this step ran. Before a re-timing of M6 and M7 it read
`737736 1792023873` (`~/.zsh_history` modified at 20:24:33), and the same after that run. The step looked, read only:
`ps` shows an interactive `/bin/zsh` (pid 22506) started at 20:23:16 by `/Applications/Tortie.app/Contents/Resources/bin/tmux`
(pid 7822, his own Tortie's server), 77 s before the write; this step's shells are children of its own `claude` process
(14694) and are `zsh -c`, which keeps no history, and the file had not moved across the dozens of them before. The write is
his own session's. It is reported to the main session; this step started no shell that runs code after it.
`~/.bash_history` never moved.

---

## 13. Questions for him

1. **Removing the LAST phone.** His answer 9 keeps the OTHER phones working. With no other phone, this phase keeps today's
   behaviour: the agreement is withdrawn and the door stops until Allow (D11c). The alternative keeps the door published
   for no phone, so pairing again takes one Allow instead of two. Recommended: today's behaviour.

---

## §Attack — the spec step's own attack, and what it changed

| # | Attack | What it changed |
| --- | --- | --- |
| A1 | "A renderer refusal is enough for alerts off." With a route waiting, a refused self-confirm leaves the door `changed`, and the only way back is an Allow whose lines name the route: turning alerts off would force allowing it | D11: main narrows, the sheet's self-confirm is deleted |
| A2 | "`fields()` should switch to the table when no record exists" (the entry's wording). Then `fields()`'s meaning depends on a record read, and a `never` door's routes differ from a `confirmed` one's for no gain: nothing a `never` door decides reads them | D4: `fields()` is the allowed set always; the table enters only the proposal and the served and waiting sets |
| A3 | "Hash the proposal into `status().confirmHash` only while something waits." Two meanings of one field is a bug waiting; and with nothing waiting the proposal IS `fields()` byte for byte | D5: `confirmLines`/`confirmHash` are always the proposal's |
| A4 | "Narrow the agreement on every Remove." Removing the only phone would leave a published door for nobody, and `probe:p313` L1 asserts the opposite | D11c: narrow only while another phone remains |
| A5 | "Main's served check can read the record." It is asked on every request; the record is sealed; the allowed set only grows at run time and only after its record | D21: the store, not the record |
| A6 | "Store first, then record." A record write that then fails leaves a store wider than any record, and a later corruption of the record would read it | D9: record first, the pairing path's order; a failed store write reads `changed` and closes |
| A7 | "An unknown id in the stored list can be dropped and the rest kept." Partial merging is exactly what CLAUDE.md forbids, and the rest would then hash to a set nobody confirmed | D2: whole or `null` |
| A8 | "A removed route must leave the allowed set." Then the update that removes it would move the hash and darken every phone, the very outage this phase ends | D2: a ledger id the table lacks stays allowed and hashed, unserved |
| A9 | An Allow pressed while the door is OPENING is posted nowhere (`postRoutes` returns while not listening) and the new route would wait until the next restart | D22: `openNow` posts the served set once more after the door answered |
| A10 | "Replace `POCKET_DOOR_HONESTY` with a composer." X12, Z15, Z30 and three probes read the constant as a literal; replacing it breaks five readers for no gain while no route is added | D13: the constant stays; the composer returns it for the eleven |
| A11 | "Edit `push-seam.ts` to confirm the proposal." It owes `probe:p314`, which runs real agents and real model turns, which this phase may not | D16: not edited; equal while nothing waits; stated for 346 |
| A12 | "The ledger's add-only check belongs in `conformance:pocket`." It needs `git`, and that gate spawns nothing; `gate:onlyadd` already reads committed copies read only | D12, §6.3: R8 in `gate:onlyadd`; AR9 in `conformance:pocket` holds the table to the ledger without `git` |
| A13 | "Make the door process's `routes` optional on start." An older or broken main that forgot it would get a door that serves the whole table | D7: required on start; a start without it is dropped and the door never listens |
| A14 | "`routesAllowed` is derivable in the sheet as `routes` minus `routesWaiting`." The sheet spells no predicate main owns (`steps.ts`'s header) | D6: main answers both lists |

---

## §As built

Written by the integrator, then the fix round if there is one.

Written by the integrator on 2026-10-15 in `/private/tmp/wt-p33312`, a detached worktree at `c608070c`. Nothing was
committed, staged or stashed. No Electron, no Simulator, no lock slot, no agent and no model turn. Nothing was read under
`~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live Tortie profile. `git diff c608070c` is this phase
alone: 28 tracked files and 8 new ones, nothing under `ios/`, no file 333.4 or 347.1 owns, and no
`src/main/harness/push-seam.ts`.

### What was built, by builder

| Builder | Files | What |
| --- | --- | --- |
| core | `src/shared/ipc/pocket.ts`, `src/main/pocket/{allowed-routes,route-ledger}.ts` (new, 83 and 65 lines), `pairing.ts`, `ipc.ts`, `src/renderer/settings/PhoneSection.tsx`, `phone/steps.ts`, and the tests `p33312-allowed-routes.test.ts` (new, 14 tests, rows C1 to C11), `pairing.test.ts` (C12), `ipc.test.ts`, `p316-phone-section.test.tsx` (C14), `p3331-steps.test.tsx` (C13) | §5.1 to §5.5 and §5.9 as written. `switch-queue`, `p3331-return` and `p3331-setup` needed no edit |
| door | `src/main/pocket/{server,writes,bind}.ts`, `door/{wire,listener}.ts`, and the tests `p33312-served.test.ts` (new, 18 tests, S1 to S8), `server`, `writes`, `bind`, `door-wire`, `door-listener` | §5.6 to §5.8 as written |
| gates | `build/conformance-pocket.mjs` (AR1 to AR12, SU6 and Y2 widened, X9 widened), `build/p313/hostile-client.mts` (PR0 to PR7 and PR5b), `build/assert-door-only-adds.mjs` (R2 and R5 driven with the launch allowed set, R7, R8, `--ledger-copy`), `build/ablation-p313.mjs` (43 arms, three re-anchored, two checks), `build/p33311/ablation.mjs` (R7a, R7b, R8a, R8h, R8g, control R8c), `build/p316/vectors.mjs` | §6 |
| probe | `build/p33312/{probe-p33312.mjs,plant.mjs,CHECKLIST.md}` (new, 2,057, 291 and 40 lines), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 173 to 174, one line) | §7 and §9.4. Never run |
| integrator | `build/conformance-pocket.mjs`, `CHANGELOG.md`, `CLAUDE.md`, this section | below |

### Decisions the spec did not name, and where each came from

- **core.** `routeServed` sits after the `now` spread in the write handler's deps, so `ablation:p313`'s X9a anchor still
  matches once. The "proposal differs from the allowed set" test in `confirmDoor` is written inline as length plus
  subset, which is set equality because neither list holds a duplicate. Stated, not a defect: with no record, Allow writes
  the build's table only when it differs from the eleven (C3); if a later build ever dropped one of the eleven, that stored
  list would read back as not whole and the door would read `changed`. It can never widen, and no id has ever left the
  table (§12 M3).
- **door.** `routesOf` is not exported (`toDoorOf` is the one way in). An empty served set is valid, because it is only
  narrower and main never sends one. The cap of the table's length is kept as §5.8 asks, although a list of distinct table
  ids can never exceed it, so the door builder's own arm against it stayed green by construction. The listener's set
  starts empty, so nothing is served before the start message.
- **gates.** X9 admits `routeServed` in `PocketWriteDeps`; it went red the moment the door builder added the field, and
  the spec named only SU6 and Y2 as widened. The ablation clone also copies `ios/TortieTests/Fixtures/frozen`, without
  which its base read red on AR3 and `allowed`. AR4 counts only `store?.allowedRoutes ?? null` or `store.allowedRoutes` as
  carrying the stored value, with exactly one writer. AR10 finds the kept list by its `.phones.filter(` and the confirmed
  reading by `pocketConfirmStatus(`, never by a variable's name. AR12 pins `doorNeedsConfirm`'s body text, which §5.9 says
  is unchanged. PR5 and PR6 withdraw the route through hooks in the client's write wrapper and its `blocked` case, so one
  `served` variable stays the only source. `gate:onlyadd --ledger-copy <file>` adds one planted copy to R8's comparison
  and can only add a finding.
- **probe.** It imports nothing from `probe:p313` or `probe:p3332`, because both start their run at module top level and
  importing either would launch an Electron; it imports the shared pieces and `ROUTE_PREFIX` from `probe:p3167`, which has
  an `isMain` guard. H9 cannot be driven by Try again alone (on a published, confirmed door `setDoor(true)` returns on its
  first line), so the probe moves the stand-in's `dnsName` and sends SIGINT to the stand-in's own Funnel child by pid,
  after re-reading that its command line names `tailscale-standin.mjs` (probe:p330 A8's and probe:p332 H5's pattern), then
  calls `window.gmux.pocket.setDoor({ on: true })` exactly as the sheet's `onRetryDoor` does. That SIGINT is the one signal
  it sends to a pid it did not start directly; the verifier should know it. `P33312_ARMS` always keeps L1 and every launch
  a picked arm depends on.
- **integrator.** The duplicate scan found one block worth extracting (below).

### The seams, reconciled

| # | Seam | How it was confirmed |
| --- | --- | --- |
| 1, 2 | `PocketHandlerDeps.routeServed` and `PocketWriteDeps.routeServed`, required, fed by `routeServed: (id) => this.routeServed(id)` in `ipc.ts` | `tsc -b` exit 0. Every other builder of the two handlers hands the launch served set: `assert-door-only-adds.mjs:2273`, `:2594`, `vectors.mjs:1026`, `:1370` and `hostile-client.mts:1072`, `:1098`, `:2924`. Nothing else under `src/` or `build/` builds either handler |
| 3 | `DoorStartInput.routes` and `updatePocketDoor({ routes })` ← `openNow` and `postRoutes` | `startPocketDoor(` is called once (`ipc.ts:1359`) with `routes: this.servedRoutes()`, and the hostile client's two starts (`:1209`, `:1224`) pass `served`. AR6 holds it |
| 4 | `allowedRoutesOf`, `allowedRoutesFor`, `servedRoutesOf` ← the gates under tsx | `gate:onlyadd` R7 (16 checks), the hostile client's `served`, and `vectors.mjs --check` byte for byte |
| 5 | `LEGACY_ALLOWED_ROUTES`, `pocketDoorHonesty`, `POCKET_ROUTE_LEDGER`, `WRITE_CLAUSES`, `narrowPocketDoor`, `isPocketSubtraction` ← the gates | AR1 to AR12 green |
| 6 | `PocketStatus.routesAllowed`, `routesWaiting`, the meaning of `confirmLines`/`confirmHash` ← the probe over CDP | the probe's self-test checks its own copies of the eleven against `LEGACY_ALLOWED_ROUTES` and `launch.wire.json`. Driven only by the verifier's app run |
| 7 | `plant.mjs`'s anchors ← `wire.ts`, `ipc.ts`'s read switch, `route-ledger.ts` | on a `cp -Rc` of the FINAL `src/` in the integrator's scratch: `--dry-run` exit 0, "6 edits in 5 files (shape head)"; the real plant exit 0 and `probe` in the ledger, `POCKET_ROUTE_IDS`, `DoorSignedRoute` and `SIGNED_ROUTES`; the copy removed |

### What the integrator changed

- **`build/conformance-pocket.mjs`**: the one duplicated block in the delta outside the test rigs. SU7's `liveHandler` and
  AR8's `live` were the same ten-line predicate (a JSX attribute whose value is a live function, never `() => undefined`).
  It is now one module-level `liveJsxHandlers(file, name)`, called by both. `conformance:pocket` read 148 rules, 20,504
  checks, PASS after it, and `ablation:p313` ran over it.
- **The duplicate scan.** 34 ten-line windows touching added lines repeat somewhere. They are this one, the eleven ids
  written out as a literal in `pairing.test.ts`, and test rigs. `p33312-allowed-routes.test.ts` copies `ipc.test.ts`'s
  `PocketHost` rig, and `p33312-served.test.ts` copies `bind.test.ts`'s loopback connector. Those are left as they are:
  `vi.mock` is per file, and `switch-queue.test.ts`, `p3331-return.test.ts` and `p3331-setup.test.ts` already carry the
  same rig for the same reason.
- **`CHANGELOG.md`**: under `## Unreleased`, a `### Fixed` with the entry's two items word for word, each ending with no
  full stop so the follow-up docs commit can add the commit link. The spec changed neither item's truth. The first stays
  invisible until 346 adds a route.
- **`CLAUDE.md`**: the `conformance:pocket` row gains one sentence naming AR1 to AR12, SU6, Y2 and PR0 to PR7, and its
  ablation count gains "43 more since Phase 333.12, 527 in all". The `gate:onlyadd` row gains a sentence on R2, R5, R7 and
  R8, and its ablation count becomes 76 arms and 13 controls. A `probe:p33312` row goes after `probe:p3332`, its cost "not
  yet measured, budgeted at 15 to 25 minutes".

### The battery

All run from `/private/tmp/wt-p33312`. Every test or gate that might start a shell ran with
`HOME=ZDOTDIR=<integrator scratch>/home`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset. `df -h /` read 75 GiB free
before the build and before the package. The load average was 18 to 61 throughout, because two other phases were running.

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 0 | 2.4 s; import boundaries 1429 files, 8125 imports, 0 violations; 0 runtime cycles |
| `npm run build` | 0 | 37.6 s. Inside it: `gate:electron` 174 helper users against the floor of 174; `gate:background` 3 of 561 files; `conformance:ios` PASS, 50 rules, its (j) `vectors.mjs --check` matching; `gate:onlyadd` PASS, R1 to R8 ok (R7 16 checks, R8 13 checks plus the note "no committed copy of src/main/pocket/route-ledger.ts yet"); `gate:checks` 268 scripts; `contract-inventory` byte for byte |
| `npm test` | 0 | 57.5 s; 1134 files passed and 2 skipped; 21,167 tests passed and 14 skipped |
| the phase's 14 test files (vitest JSON reporter) | 0 | 813 of 813: `p33312-allowed-routes` 14, `p33312-served` 18, `pairing` 109, `ipc` 135, `server` 23, `writes` 147, `bind` 29, `door-wire` 21, `door-listener` 48, `switch-queue` 36, `p3331-return` 39, `p3331-setup` 24, `p316-phone-section` 108, `p3331-steps` 62 |
| `npm run package`, then `rm -rf release` | 0, 0 | 119 s; signed `Tortie.app`, a DMG and a zip, 831 MB, removed |
| `npm run conformance:pocket` | 0 | 148 rules, 20,504 checks, 6.5 s (after the integrator's extraction) |
| `npm run conformance:pocket:hostile` | 0 | 279 arms, PR0 to PR7 and PR5b ok, 19.6 s |
| `npm run gate:onlyadd` | 0 | 2.3 s; the same reading as inside the build |
| `npm run conformance:machines` | 0 | 27.2 s |
| `npm run conformance:phonecopy` | 0 | 4.0 s |
| `npm run conformance:push` | 0 | 26 rules, 2,394 checks, 8.4 s |
| `npm run ablation:p313` | 0 | PASS, 527 ablations, each red on the rule that owns it, measured as a delta against a green base (9 checks); 4,229 s at load averages of 6 to 61, with a scratch HOME. The three re-anchored arms A4b, Y2a and SU20 read red on A4, Y2 and SU6. Every clone file was restored and proved by sha256, and the worktree was never written |
| `node build/p33311/ablation.mjs` (`ablation:p33311`) | 0 | 75 of 75 red, 13 of 13 controls green, 1 not run (R8g: "no committed copy of the ledger yet"), 127 s. R7a red on R2 and R7; R7b on R2, R5 and R7; R8a and R8h on R8; R8c green |
| `node build/p316/vectors.mjs --check` | 0 | 0.4 s, byte for byte |
| `npm run gate:contract` | 0 | no diff: no channel added |
| `npm run gate:checks` | 0 | 268 check scripts classified |
| `npm run gate:electron` | 0 | 174 against the floor of 174 |
| `npm run gate:background` | 0 | 3 of 561 files start a process, each ended in a `finally` |
| `node build/p33312/probe-p33312.mjs --grader-self-test` | 0 | 15 graders, 70 clauses, 148 checks, each clause red on its own break; nothing started |
| `node build/p33312/plant.mjs --dry-run` and a real plant on a copy of the final `src/` | 0, 0 | 6 edits in 5 files, shape head |

`smoke:t1`, `smoke`, `smoke:t3`, `smoke:remote` and `smoke:machines` were not run: they launch an Electron, so they are
the verifier's.

### For the main session at landing

- **`package.json`**: `"probe:p33312": "node build/harness-socket.mjs --fresh gmux-p33312 'node build/p33312/probe-p33312.mjs'"`.
- **`build/verification-checks.mjs`**: `electron('probe:p33312')` beside `electron('probe:p313')`, in the same commit as
  the package script, or `gate:checks` reads red.
- **`HELPER_USER_FLOOR`**: 174 here. Reconcile to the base plus every script 333.4 and 347.1 added.
- **After the landing commit**: `node build/p33311/ablation.mjs --only R8g` once, which must read red through real `git`.
- No `test:ios` is owed (no `ios/**` file, vector or pairing or signing function moved), no menu changed, no release.

### Not yet proven

`probe:p33312` has never run: it needs the four builds and THE LOCK, and the verifier runs it. R8's history half has not
read a committed copy, because none exists until this phase lands. The verifier's two independent methods (§9.3) are
still owed.

### His shell history

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737736 1792023873` and `23166 1790702242` at the integrator's
start, before and after every command that started a shell or a test, and at the end. Neither file moved. That is the
baseline the spec step recorded after his own Tortie's shell wrote `~/.zsh_history` at 20:24:33 on 2026-10-14.

### The fix round

Written by the fixer on 2026-10-15 in the same worktree. Both verify lenses answered `needs_work`: lens 1 (the attack)
with three minors and two nits, and lens 2 (the app run) with two majors and two nits, both majors in the probe. The fix
runs once. Nothing was committed, staged or stashed. No Electron, no Simulator, no lock slot, no agent and no model turn.

**A first fixer run stopped part way.** It edited eight files between 02:11 and 02:15 and left no report (its two `.keep`
copies in its scratch equal the live files byte for byte). This run read every one of those edits, kept them, re-ran their
gates and their ablations, and did the rest. The table names which run made each change.

| Finding | What changed | Proof |
| --- | --- | --- |
| Lens 1, minor (K18): nothing held the allowed set's store write to a record that was actually sealed | First run. `conformance:pocket` AR4 now requires the one writer in `confirmDoor` to sit under `record !== null` as a top-level conjunct of an enclosing guard, or after an early return on `record === null` (`arUnderRecord`, `arTopConjuncts`). New vitest C6b in `p33312-allowed-routes.test.ts`: with the RECORD's seal failing, the Allow is refused with the record's own sentence, no store seal is written at all, `allowedRoutes` reads `null` on disk, `fields().routes` and `routeServed` leave the route out, the door process gets no routes update, and the door stays listening and confirmed with no start, no stop and its one push destination. New arm `AR4d` drops the conjunct | `AR4d` red on AR4 and `allowed` |
| Lens 1, minor (K16): AR8 (d) did not pin what each narrowing is handed | First run. AR8 (d) requires `removePhone` and `setPushAlerts` each to hand `narrowPocketDoor(` exactly a const read from `this.fields()` BEFORE the store write, and `this.fields()` after it. New arms `AR8h` (alerts off hands the proposal), `AR8i` (Remove hands the proposal) and `AR8j` (alerts off reads its before-fields after its write) | each red on AR8 and `allowed` |
| Lens 1, minor: the honesty sentence beside Allow was composed over the routes already allowed, not over what that Allow grants | First run. `PocketStatus` gains `routesOffered: readonly PocketRouteId[]`, which `status()` answers as `servedRoutesOf(proposal.routes, pocketRouteIds())` from the ONE `this.proposal(` its `confirmLines` and `confirmHash` come from, and the confirm block draws `pocketDoorHonesty(status.routesOffered)`. **D13 as built**: the sheet hands `routesOffered`, not `routesAllowed`. For the eleven it is today's sentence byte for byte (`POCKET_HONESTY_ADDED` is `{}`), so no word on any face moves. AR7, AR11 and SU6 now read `routesOffered`; new arms `AR7d` and `AR11e`; `SU20`, `AR7a`, `SU6w` and `AR11a` re-anchored; one new driven check, `phone` (`p316-phone-section.test.tsx`, three new rows, with the composer wrapped to say a clause for a planted `probe`: a waiting route on a published door, a first setup, and a `changed` door whose offered set differs from its served set). No channel moved, so the contract baseline did not | `AR7d` red on SU6, AR7 and `phone`; `AR11e` red on AR11 and `allowed`; the four re-anchored arms red on their own rules |
| Lens 1, nit: D21's corner, a store wider than its record after an older Mac's Allow that wrote no store | This run. Stated in `servedRoutes`' comment in `ipc.ts`. New vitest C11b drives it: the gate reads `changed` while `routesAllowed` names the route, `openAtLaunch()` answers `refused`, the door process is started 0 times and handed nothing, no alert goes out, and the Allow that reopens the door names the route in its lines and in `routesOffered`. The code is not changed: no door runs in that state, so nothing is served, and asking the record on every request is the cost D21 refuses | C11b green |
| Lens 1, nit: the integrator wrote the CHANGELOG items, which D24 left to landing | Not changed. For the main session at landing (below) | |
| Lens 2, major: H2 read `turn` and `dialog` from the top of the `/v1/screen` answer, which carries them inside `screen`, so the keys write was rightly refused `malformed` | This run. New pure `keysContextOf(answer)` in `probe-p33312.mjs` reads the picture's own `turn` and `dialog`, as the phone and `probe:p337` do; H2 sends exactly that, and reads UNREADABLE rather than sending a write when a 200 answer holds no picture with a turn. The self-test now drives it over `REAL_SCREEN_ANSWER`, the body phone A was answered in the verify's run 1 (synthetic: a scratch shell the probe made), in two new checks | self-test PASS, 154 checks. Ablated in a `cp -Rc` clone to read the top of the answer: the self-test exits 1, FAIL on exactly those 2 checks |
| Lens 2, major: RUN's "the scratch socket file is gone" could never pass, because tmux 3.7b leaves its socket file after `kill-server` | This run. The teardown now records `socketExistedAfterTeardown` and unlinks the file by its exact name after the server is ended, under the harness socket's own shape (`/^gmux-p33312[a-z0-9-]*-\d+$/`, asked again), as `probe:p321` does | On a scratch `-L gmux-p33312-fixtest-<pid>` server of the vendored tmux 3.7b, with a scratch HOME and ZDOTDIR: the file was there while the server was up, still there after `kill-server` (`socketExistedAfterTeardown: true`), gone after the block, and nothing was left |
| Lens 2, nit: a later build that drops one of the eleven would make a first Allow read back as not whole | This run. The route ledger's header gains "Before a phase removes one of the first eleven", naming the two ways out. Unreachable in this phase | |
| Lens 2, nit: the block pushes the Pair row below a 532 px window's fold while a route waits | Not changed: it is today's block at today's size. Phase 346 should know | |

`CLAUDE.md`, this run: the `conformance:pocket` row reads `pocketDoorHonesty(status.routesOffered)` and counts the fix
round's six arms (49 since Phase 333.12, 533 in all); the `probe:p33312` row has the verify's measured cost (262 s for all
six launches, 98 s for H1 to H9) and says the socket file is unlinked in its `finally`.

#### The battery, re-run

All from `/private/tmp/wt-p33312`, after every source edit. Every command that might start a shell ran with `HOME` and
`ZDOTDIR` set to the fixer's scratch `home`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset (the package used his HOME,
for the Electron download cache, with signing off). `df -h /` read 83 GiB free before the package. The load average was 5
to 18, with the full ablation running beside most of it.

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 0 | 6 s; import boundaries 1429 files, 8125 imports, 0 violations |
| `npm run build` | 0 | 37 s. Inside it: `gate:electron` 174 against the floor of 174; `conformance:ios` PASS, 50 rules, (j) `vectors.mjs --check` matching; `gate:onlyadd` PASS, R7 16 checks, R8 13 checks; `gate:checks` 268 scripts; `contract-inventory` byte for byte |
| `npm test` | 0 | 55 s; 1134 files passed and 2 skipped; 21,172 tests passed and 14 skipped (the integrator's 21,167, plus C6b, C11b and the three `phone` rows) |
| the phase's 14 test files (vitest JSON reporter) | 0 | 818 of 818: `p33312-allowed-routes` 16, `p33312-served` 18, `pairing` 109, `ipc` 135, `server` 23, `writes` 147, `bind` 29, `door-wire` 21, `door-listener` 48, `switch-queue` 36, `p3331-return` 39, `p3331-setup` 24, `p316-phone-section` 111, `p3331-steps` 62 |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package`, then `rm -rf release` | 0, 0 | 57 s; unsigned `Tortie.app`, a DMG and a zip, 831 MB, removed. Signing was left off so nothing asked his keychain for an identity; nothing this fix touched is packaging |
| `npm run conformance:pocket` | 0 | 148 rules, 20,515 checks, 6 s |
| `npm run conformance:pocket:hostile` | 0 | 279 arms, 16.9 s |
| `npm run gate:onlyadd` | 0 | 0.7 s |
| `npm run conformance:machines` | 0 | 21 s |
| `npm run conformance:phonecopy` | 0 | 2 s |
| `npm run conformance:push` | 0 | 26 rules, 2,394 checks, 5.9 s |
| `npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background` | 0, 0, 0, 0 | no contract diff; 268 scripts; 174 against 174; 3 of 561 files start a process, each ended in a `finally` |
| `node build/p316/vectors.mjs --check` | 0 | byte for byte |
| `P313_ONLY=AR4c,AR4d,AR8h,AR8i,AR8j,AR7d,AR11e,SU20,AR7a,SU6w,AR11a node build/ablation-p313.mjs` | 0 | 11 of 11 red on their own rules, 126.6 s, every clone file restored by sha256 |
| `npm run ablation:p313` (whole) | 0 | PASS, 533 ablations (the integrator's 527 and the fix round's six), each red on the rule that owns it, measured as a delta against a green base (10 checks, `phone` the tenth); 3,784 s at load averages of 5 to 18, with a scratch HOME; every clone file restored and proved by sha256, and the worktree never written |
| `node build/p33311/ablation.mjs` | 0 | 75 of 75 red, 13 of 13 controls green, 1 not run (R8g, no committed ledger yet), 137 s |
| `node build/p33312/probe-p33312.mjs --grader-self-test` | 0 | 15 graders, 70 clauses, 154 checks; nothing started |
| `node build/p33312/plant.mjs --dry-run`, then a real plant, on a `cp -Rc` of the final tree | 0, 0 | 6 edits in 5 files, shape head; the copy removed |

#### Still owed to the reverify

`probe:p33312` live, under the lock, with the parent at `v0.111.1` and both planted copies: H2 and RUN's socket clause are
the items that failed, and nothing else in the probe moved. `smoke:t1` and the other Electron smokes, as before.

#### For the main session at landing, added by the fix round

- **`CHANGELOG.md`**: the integrator wrote the two items under `## Unreleased`, which D24 left to landing because 333.4 and
  347.1 run beside this phase. Reconcile them there. A person meets one change today that neither item names: turning
  alerts off no longer closes and restarts the door.
- **A leaked process that is not this phase's code**: a `tail -n 0 -f …/scratchpad/p33312/apprun/run.log` (pid 48786,
  parent 1) left by lens 2's run. The fixer did not start it and did not end it.

His two history files read `737736 1792023873` and `23166 1790702242` at the fixer's start, before and after every command
that started a shell, a test, a tmux server or the package, and at the end. Neither moved.
