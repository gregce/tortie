# Phase 333.11 — "the door's answers only add": freeze what the launch phone reads and sends, and one gate keeps every later Mac inside it — SPEC

Written by the spec step on 2026-10-08 in `/private/tmp/wt-p33311`, a detached worktree at origin/main `01a25b99`
("docs(backlog): the three phases rebuilt from their transcripts after the reboot"). The phone at this base is TestFlight
build 7 (`CURRENT_PROJECT_VERSION = 7`, `ios/Tortie.xcodeproj/project.pbxproj:417`) and the Mac is 0.110.0
(`package.json:4`). Every `file:line` here was read at `01a25b99` on this date.

**The spec step MEASURED before it wrote** (§14 holds every command, exit code and number). It read the door's route
table, the phone's every decoder, the vectors, the R4 pin and `gate:contract`'s baseline; it ran
`node build/p316/vectors.mjs --check` once (exit 0, 0.52 s), a scratch reading of the phone's decoders
(`/private/tmp/tortie-ops/p33311/spec/measure-decoders.py`: 26 decodable types, 165 decode statements, 162 coding keys,
none unread), and a scratch TypeScript program over the pocket contract (`measure-ts.mjs`: 171 ms over 74 files, 521 ms
with `src/main/pocket/pairing.ts` over 245). It took no lock slot, because it started no Simulator, no `xcodebuild` and no
Electron; it started no agent and no model turn; it read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, his keychain,
`~/Keys` or his live Tortie profile; and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `735939 1791483475` and
`23166 1790702242` at its start and at its end.

Read with it, whole: `docs/research/140-the-public-beta-beside-the-release.md` §5 row 13, §7.1 to §7.3 and §8 rows 7 and 9
(the Paseo rule it cites, `getpaseo_paseo/docs/protocol-compatibility.md:16`); `ios/Tortie/Door/Contract.swift`,
`DoorClient.swift`, `Pairing.swift`; `src/main/pocket/door/table.ts`, `door/limits.ts`, `routes.ts`, `writes.ts`;
`src/shared/ipc/pocket.ts`; `build/p316/vectors.mjs`; `build/conformance-pocket.mjs` R4 (`:877-1003`);
`build/contract-inventory.mjs` and `gate:contract`; and, read only, the specs of the two phases landing first,
`/private/tmp/wt-p3331/build/p3331/SPEC.md` (D30: "No door route, no QR change, no hashed field") and
`/private/tmp/wt-p3373/build/p3373/SPEC.md` (§0: "No Mac change: nothing under `src/` moves, no door route, no contract
line"; the vectors unedited).

**His word, 2026-10-08**, on 333.11 as research 140 put it to him (the phone and the Mac update separately, so a phone on
an older build talks to a newer Mac and the reverse; a missing required key refuses a whole answer today, and nothing stops
a Mac release removing or renaming one, or a route the phone uses): **"ok that sounds great. do it"**.

**The order of authority.** His word, then research 140 §8 row 7, then the main session's task text, then this file. The
tree at `01a25b99` overrides any picture of it here. §Attack, at the end, records what this file's own attack changed.

---

## 0. The hard rules, stated once

- **Nothing a person sees moves.** No product file under `src/` or `ios/Tortie/` is edited. `git diff 01a25b99 -- src/
  ios/Tortie/ docs/audits/contract-baseline.txt` is empty at the end. No door route, no answer shape, no QR field, no hashed
  field, no build number, no native menu, no copy.
- Builders and the integrator launch no Electron and boot no Simulator, except the integrator's battery `smoke` steps
  under the lock. Verifiers take THE LOCK for `test:ios` and any app run: `zsh /private/tmp/tortie-ops/lock.sh try
  p33311` (prints the slot or exits 1; retry every 60 s in a NEW command; never with the `phone` argument), and release with
  `zsh /private/tmp/tortie-ops/lock.sh release <dir>` on the same command line.
- `/Users/gdc/gmux` is read only: every shell command begins `cd /private/tmp/wt-p33311 &&` (or the role's scratch,
  `/private/tmp/tortie-ops/p33311/<role>/`), and every heredoc delimiter is quoted (`<<'EOF'`). Prefer the Write and Edit
  tools for files (a shell edit is invisible to the replay that rebuilds a wiped tree). Nobody commits, stages or stashes.
  `git diff 01a25b99` in this worktree is exactly 333.11's delta. Install nothing.
- **Do not touch `/private/tmp/wt-p3331` or `/private/tmp/wt-p3373`.** Both land before this phase. Files they also edit
  (`build/conformance-ios.mjs`, `build/p316/test-ios.mjs`, `ios/TortieTests/**`, `CLAUDE.md`, `CHANGELOG.md`) take SMALL,
  ADDITIVE edits here: new declarations and new blocks at the ends of lists. The one non-additive edit, moving `lexSwift`
  out of `build/conformance-ios.mjs` (D17), touches lines neither phase edits.
- No real Tailscale, DNS or APNs. Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep`
  pattern or a negative pid. His keychain, credentials, APNs key (`~/Keys`), `~/.ssh`, conversation stores (`~/.claude`,
  `~/.codex`) and live Tortie profile are never read. **No model turn**; `smoke:remote`, `smoke:machines`, `probe:p268`
  and `probe:p336` are not run.
- **His shell history**: before and after every command that starts a shell, a Simulator or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. Any shell a test starts runs with a scratch `HOME` and `ZDOTDIR`,
  `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- Simulators only through `build/simulator-run.mjs`; every `xcodebuild` uses
  `-derivedDataPath /private/tmp/tortie-ops/p33311/dd-<role>`, deleted before the role returns. Every Electron through
  `build/electron-run.mjs`, killed in a `finally`; this phase adds no script that reaches it.
- Three other phases run beside this one. Before any heavy step read `df -h /` and `memory_pressure | grep percentage`;
  under 8 GB free disk or under 20 percent free memory, wait (re-check every 5 minutes, at most 30), then report BLOCKED.
- No `GMUX_*` name is added anywhere (it would move `docs/audits/contract-baseline.txt`). The phone half's one variable is
  `P33311_PROOF`.

---

## 1. The answer first

When the launch Mac release is cut, the phone in strangers' hands is frozen: it will call the same eleven routes, send the
same requests and refuse an answer the same way for as long as it is installed. This phase writes that phone down, as data
the tree keeps, and adds ONE gate to `npm run build` that holds every later Mac to it.

**What is frozen** (one set, labelled `launch`, two files under `ios/TortieTests/Fixtures/frozen/`):

1. **The routes the phone calls**: each of the eleven with its method, path, signedness, window and read/write, the
   answer type the phone decodes it with, and the membership hash R4 pins (`ea5930e0…`, `build/conformance-pocket.mjs:939`).
2. **What the phone requires of each answer**, READ FROM THE PHONE'S OWN DECODERS by a Swift reader (never from the Mac's
   composer): every key, whether it must be there, whether it may be null, its kind (string, bool, a fractional number, a
   whole number, a count, a colour, an array, an object, or one of a closed set of words), the discriminated cases
   (`/pair`'s answer, the End offer), the phone's bounds (`PocketScreen.widest` and its kin) and the formats it checks
   (a mark, a question id, a certificate, the QR's fields and version).
3. **The vectors**: `ios/TortieTests/Fixtures/vectors.json` copied byte for byte — the shipping Mac's answers and the
   phone's signed requests, presentations and keys at the freeze.
4. **What the phone sends that the Mac must keep reading**: the words of its queries and keys, the statuses it reads, and
   the Mac's own request and connection limits at the freeze.

**The gate, `gate:onlyadd`** (`build/assert-door-only-adds.mjs`, inside `npm run build`, one spawn of the pinned tsx,
budget 3 s), asks on every commit, **a new Mac with an old phone**: does the door still serve every frozen route, accept
every frozen request through its own verifier, readers and write path, open every frozen presentation, compose answers
whose every frozen key is present with a kind the frozen phone accepts, keep every word the phone refuses outside of out of
its own types, and keep every cap inside the frozen phone's bounds? And, read as text, **an old Mac with a new phone**: does
the phone today require any key the frozen set does not, or accept less than it did?

**The phone's half, `DoorFrozenTests`** (run by `test:ios`, graded row by row by `build/p316/test-ios.mjs`): the phone
today decodes every frozen answer, as sent, with every optional key taken out (what an older Mac sends) and with unknown
keys at every depth; still writes every frozen request byte for byte; and, while its decoders still read exactly the frozen
shape, REFUSES each mutation the frozen set says it refuses, which is the phone itself proving the freeze was read right.

**The rule it enforces**, Paseo's (research 140 §4, "Never flip optional to required, remove a field, or narrow a type"),
read for Tortie's phone (§3): adding a route, an optional key, or a field the phone ignores is allowed; adding a WORD to one
of the eight closed sets the phone refuses outside of, raising a cap past a frozen bound, or lowering a limit an old phone's
requests fit inside, is a narrowing and is not.

**What a deliberate break does**: `node build/assert-door-only-adds.mjs --freeze launch --replace --why "<sentence>"`
regenerates the set on purpose, prints every line that moved and keeps the reason in the file, and the commit body says
which lines and why — the way `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` re-baselines.

Nothing here changes what a person sees: **no CHANGELOG item, no semver, no menu change** (D13).

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **The frozen set is read three ways and never guessed.** Routes from the shipping table (`src/main/pocket/door/table.ts:100-112`) intersected with the targets the phone spells (`ios/Tortie/Door/DoorClient.swift:356-406`); shapes, words, bounds and formats from the phone's Swift by the reader of §5; instances from `vectors.json`, which `vectors.mjs --check` holds equal to the shipping TypeScript on every build (`build/conformance-ios.mjs:10864-10873`, rule j). The Mac's composer contributes INSTANCES (and the launch Mac's own request limits, D5) only, never a shape | the task ("never guessed from the Mac's composer"); research 140 §8 row 7 |
| D2 | **Where it lives**: `ios/TortieTests/Fixtures/frozen/<label>.wire.json` and `<label>.vectors.json`, label `launch`. Under the phone's test fixtures so `DoorFrozenTests` reads it from the checkout or from its bundle exactly as `DoorVectorFile.load` does (`ios/TortieTests/DoorVectorTests.swift:807-815`), and the synchronized `TortieTests` group (`ios/Tortie.xcodeproj/project.pbxproj:44-63`) takes the files with no project edit. The Mac's gate reads it there, as `gate:contract` reads its baseline under `docs/audits/` | `gate:contract`'s shape; measured: the test target is a `PBXFileSystemSynchronizedRootGroup` |
| D3 | **Unknown keys are ignored by every decoder, so ADDING A KEY IS SAFE; ADDING A WORD TO A CLOSED SET IS NOT.** Measured: no `allKeys`, `singleValueContainer`, `unkeyedContainer` or `nestedContainer` in `ios/Tortie`; every decoder uses `container(keyedBy:)`; the vectors' `withUnknown` copies (`build/p316/vectors.mjs:1206-1213`) decode (`DoorVectorTests.swift:617-633`). But eight word sets refuse the WHOLE answer on a word they do not know: `PocketWriteAnswer.Verb`, `.Outcome`, `.Reason` (`Contract.swift:302-312`; a write then reads "no answer", `DoorClient.swift:806-809`), `PocketScreenAbsence` (`:1282`), `PocketScrollbackAbsence` (`:1356`), `/pair`'s state (`:987-988`, pairing stops), the QR's `v` (`Pairing.swift:109`, `unsupportedCode`) and the echoed `SessionsShow`/`GroupBy`/`SortBy` (`Screens/SessionsChoices.swift:26-50`). The End offer's state is OPEN (`Contract.swift:251-252`, an unknown word draws no End) and so is every plain-string word (`statusDot`, `coverage`, …). This is the finding the task asked to be measured; §3 makes it a rule | measured, §2.3 |
| D4 | **A phone bound is part of the type.** The phone refuses a screen wider than `PocketScreen.widest` (512), taller than `tallest` (200), with more than `mostStyles` (1,024) styles, a history index past `deepest` (100,000), a page of more than `PocketScrollbackAnswer.mostRows` (128) rows (`Contract.swift:1166-1171`, `:1363`), an answer over `DoorLimits.answerCap` (2 MiB) and an exchange over `DoorLimits.timeout` (15 s) (`DoorClient.swift:177-180`). A Mac that raises `POCKET_SCREEN_MAX_COLS`, `MAX_SCROLLBACK_LINES` (behind `POCKET_SCROLLBACK_MAX_INDEX`, `src/shared/ipc/pocket.ts:1433`) or `SCREEN_HOLD_MS` (`src/main/screen/watch.ts:75`) past them breaks every old phone with no key moved, so each pairing is a frozen row | measured, §2.4 |
| D5 | **Requests are frozen too.** "The Mac still serves every frozen route" means an old phone's REQUEST still lands: every frozen signed request replays through the shipping route match, URL parse, verifier (at its own clock), query reader and write path; the frozen presentations open under the shipping opener; and the Mac's request and connection limits (`POCKET_WRITE_BODY_CAPS`, `POCKET_PAIR_BODY_CAP_BYTES`, `PER_SOURCE_MAX`, `KEEP_ALIVE_TIMEOUT_MS`, the keys caps, the page count) and word lists do not fall below the frozen ones. `PER_SOURCE_MAX` (4, `src/main/pocket/door/limits.ts:23`) is the one a Terminal's kept lines live inside, and `KEEP_ALIVE_TIMEOUT_MS` (5,000, `:33`) the one its 4 s reuse rides on (`DoorClient.swift:41-50`) | the task ("serves every frozen route"); `vectors.mjs:431-521` is the precedent |
| D6 | **The read routes' dispatch is checked by its text.** A route can stay in the table while main stops answering it: the one read switch (`src/main/pocket/ipc.ts:518-569`) would answer it `null`, a 404. The gate reads that switch with the TypeScript parser: an arm per frozen read route that returns `routes.<id>(` | §Attack T3 |
| D7 | **An "old Mac" is the launch Mac AND every earlier Mac the phone already falls back for.** The phone reads `end`, `endConfirm`, `reply`, `screen`, `depth`/`space` and `alerts` only if present, so a 0.110.0 Mac still draws (`Contract.swift:196-197`, `:604-617`, `:1225-1233`; `SessionsScreen.swift:427-431`; his no-regression rule, research 140 §7.1). The frozen "optional" encodes that tolerance, so a later phone that flips one of them to required fails, even though the launch Mac always sends it | research 140 §7.1 ("Tortie's silent fallback … is kept") |
| D8 | **One gate, inside `npm run build`, right after `node build/conformance-ios.mjs`.** It spawns only the pinned tsx, once, through `build/ts-runner.mjs` (as `vectors.mjs` does; `gate:contract` spawns node too, `build/contract-inventory.mjs:266`), so it can import the shipping TypeScript and the `typescript` package. Measured parts: a TypeScript program over `pocket.ts` and `pairing.ts`, 521 ms; `vectors.mjs --check`, the closest relative, 0.52 s. Budget 3 s; the integrator records the measured time | the task ("ONE gate on every commit … like gate:contract") |
| D9 | **The phone's half is `DoorFrozenTests`, graded by `test:ios`, and cannot drop out silently.** Every row it must print is named by the sealed frozen file, `test-ios.mjs` counts them per configuration, the suite must appear in xcodebuild's own suite lines (`suitesNotRun`, `build/p316/test-ios.mjs:1188-1191`), and the Mac's gate itself reads that the test file and its suite entry still exist (F4) | the task ("how test:ios proves it ran") |
| D10 | **The refuse arms are the proof of the freeze, and hold only while the phone's decoders are the frozen ones.** `test-ios.mjs` runs the §5 reader over today's phone; when its projection equals a frozen set's, it hands `P33311_PROOF=<label>` to the tests and every refuse arm of that set must refuse. When the phone has changed (perhaps legitimately relaxed), refuse arms print `skipped` and only accept arms are asserted, because those hold forever (D7) | §Attack T8 |
| D11 | **The seal.** Each wire file holds `seal`, the sha256 of its canonical body (every other key, sorted, `JSON.stringify` with no spaces). A hand edit that does not reseal is red (F1). Inside it, the route-membership hash must equal its own routes' and every arm must resolve in the frozen vectors (F3) | the task ("a frozen file edited by hand without the flag") |
| D12 | **The vectors gain the answers they never composed**, so every frozen route has a shipping instance: a scrollback page and a scrollback absence, a screen `unchanged` and a screen absence, and five write answers composed by the SHIPPING write handler (`createPocketWriteHandler`, `src/main/pocket/writes.ts:466`) over a recording `writes`. Today `vectors.json` holds no answer to `/v1/scrollback` and no write answer at all (§2.5) | measured; clause A1 |
| D13 | **No CHANGELOG item, no semver, no menu, no contract-baseline line.** A person never hits a gate; CHANGELOG.md's rules leave out what a person will not hit. The subject is `test(pocket)` | CHANGELOG.md's head; CLAUDE.md "Release notes" |
| D14 | **Cross-field relations are NOT frozen.** The phone also refuses an answer whose fields disagree (a write answer's reason without `refused`, a screen's cursor outside it, a sessions answer whose counts do not add up, a page that overlaps). Those are semantics, not shape; freezing them means porting the phone's checks to JavaScript, a second phone. Listed by name in §13 so a later round sees what is unguarded | scope; Paseo's rule is shape |
| D15 | **The QR is in; the push alert's payload is out.** An old phone scanning a new Mac's code is the first thing it reads, so the QR's keys, `v`, ports and formats are frozen. Alerts are not offered to a stranger at launch (333.1, research 140 §10.4), and `AlertTap.parse` falls back to the list rather than refusing (`ios/Tortie/Alerts/Alerts.swift:161-166`) | research 140 §8 row 3 |
| D16 | **The label is `launch` and its provenance is honest.** Frozen here from build 7's sources and Mac 0.110.0; neither phase landing first moves the wire (333.1's D30; 337.3's §0). On every run the gate prints whether today's phone wire equals `launch` (P4); if the landed head reads "differs", the main session runs `--freeze launch --replace --why …` before landing, and 333.7's tag step reads the same line | the task ("regenerates the frozen set at landing if either moved it") |
| D17 | **One Swift lexer.** The reader needs comments and strings blanked exactly as `conformance:ios` blanks them. `lexSwift` MOVES byte for byte to `build/swift-lex.mjs`; `build/conformance-ios.mjs` imports and re-exports it (its export surface unchanged). Importing `conformance-ios.mjs` would run it, because it has no import guard (`:10687-11336`). Nothing else imports or ablates `lexSwift` (`grep -rln lexSwift build src`: only `conformance-ios.mjs`) | CLAUDE.md "Grep for an existing helper"; "scan for duplicated 10+ line blocks and extract" |
| D18 | **Tier 2.** Invisible to a person; touches no tmux, manifest, restore or session; spawns nothing for a person, holds no credential, sends nothing anywhere. The gates ARE the evidence: the verifier re-derives and attacks rather than photographs. Its one "app run" is `test:ios` once, under the lock | CLAUDE.md "The tier sets the BUDGET" |

---

## 2. The tree at this head, re-read

### 2.1 The routes: the phone calls exactly the eleven the door has

| Route id | Method, path | Signed | Window only | Reads | Phone target (`DoorClient.swift`) | Phone answer type |
| --- | --- | --- | --- | --- | --- | --- |
| `pair` | `POST /pair` | no | yes | yes | `pairTarget` `:356` | `PairAnswer` (`present`, `:347-351`) |
| `blocked` | `GET /v1/blocked` | yes | no | yes | `blockedTarget` `:357` | `PocketBlockedAnswer` (`:223-225`) |
| `session` | `GET /v1/session?id=` | yes | no | yes | `sessionTarget` `:365-367` | `PocketSessionAnswer` (`:231-236`) |
| `turns` | `GET /v1/turns?id=&limit=[&to=]` | yes | no | yes | `turnsTarget` `:401-405` | `PocketTurnsAnswer` (`:250-259`) |
| `sessions` | `GET /v1/sessions?show=&group=&sort=[&agent=][&machine=]` | yes | no | yes | `sessionsTarget` `:392-399` | `PocketSessionsAnswer` (`:244-246`) |
| `screen` | `GET /v1/screen?id=[&since=]` | yes | no | yes | `screenTarget` `:372-376` | `PocketScreenAnswer` (`:299-305`) |
| `scrollback` | `GET /v1/scrollback?id=&from=&count=&depth=&wrap=&keep=` | yes | no | yes | `scrollbackTarget` `:384-386` | `PocketScrollbackAnswer` (`:327-339`) |
| `end`, `choose`, `say`, `keys` | `POST /v1/<id>` | yes | no | no | `endTarget` … `keysTarget` `:360-363` | `PocketWriteAnswer` (`WriteResult.of`, `:798-820`) |

The table (`src/main/pocket/door/table.ts:100-112`) holds the same eleven, `POCKET_ROUTE_IDS` names them
(`src/shared/ipc/pocket.ts:101-127`), and R4's membership pin over their sorted `METHOD path` lines is `ea5930e0…`
(`build/conformance-pocket.mjs:939`). R4 pins EXACT membership (any add or removal is red until re-pinned); this phase pins
the frozen routes as a SUBSET, so adding a route is allowed here and stays R4's and 333.12's business.

The phone already treats a 404 from a newer route as an older Mac in three places: Sessions (`SessionsScreen.swift:427-431`,
`.olderMac`), the Screen (an absent `screen` key, `Contract.swift:614-617`) and the history (337.3 D8: a 404 turns the
fill off). That is how a NEW route stays safe for an old Mac, and it is not this phase's to change.

### 2.2 The phone's decoders

`ios/Tortie/Door/Contract.swift` holds 26 decodable types and 26 `init(from decoder:)` bodies, with 165 decode statements
over 162 coding keys, every key read (§14 M3): `decode` 92, `nullable` 40, `doorNumber` 14, `decodeIfPresent` 6,
`nullableDoorNumber` 6, `screenColor` 5, `contains` 2. Eight bodies have control flow:

- two discriminated by a word: `PocketEndOffer` switches inline on `try c.decode(String.self, forKey: .state)` with
  `Word.offered`/`Word.unreachable` and a `default:` that assigns `.none` (`:244-254`); `PairAnswer` binds
  `let word = try c.decode(String.self, forKey: .state)`, switches on `word` with `case "pending", "refused":` holding
  `guard !c.contains(.cert)` and then `if word == "pending" { … decodeIfPresent(Bool.self, forKey: .alerts) … }`, and a
  `default:` that throws (`:966-990`);
- one key read twice: `PocketScreenStyle.bg`, `nullable(String)` then `screenColor` in the else branch;
- optional halves behind `contains` and `if let … decodeIfPresent`: `PocketScreen.depth` (`:1228-1233`) and
  `PocketSessionDetail.reply` (`:610-614`);
- and relations, a `guard … else { throw }` or a `holdsTogether` call AFTER every decode (`PocketWriteAnswer`,
  `PocketScreen`, `PocketScreenAnswer`, `PocketScrollbackAnswer`), D14.

Decode calls also sit inside expressions (`self = .offered(batch: try c.decode(Bool.self, forKey: .batch))`, `?? .none`,
`?? false`). `PocketSessionDetail` flattens `PocketBlockedRow` (`try PocketBlockedRow(from: decoder)`, `:596`). The QR is a
synthesized `Decodable` (`Pairing.swift:87-96`, eight `let`s, all required). Outside the door's graph, `Alerts.swift:88`
(its container is named `container`) and `Keys.swift:540` decode the phone's own Keychain records; nothing a route answers
reaches them.

### 2.3 What an unknown key and an unknown word do (the task's measurement)

- **An unknown key**: ignored at every depth, by every decoder (D3). Adding an optional key or a field the phone does not
  read never breaks an old phone.
- **An unknown word**: refuses the whole answer in the eight closed sets of D3; is drawn neutral in a plain string
  (`StatusDot.unknown`, `Contract.swift:467-475`); draws no End in the End offer; opens the list in a push payload.
- **A known key in the wrong case**: `/pair`'s `cert` on `pending` or `refused` refuses (`Contract.swift:970-973`).
- **A whole number with a fraction**: refuses (`doorNumber` decodes `Int`); a `Double` field takes either.

### 2.4 The bounds and the limits on each side

| Phone (frozen, read from Swift) | Value | Mac (read on every commit) | Rule |
| --- | --- | --- | --- |
| `PocketScreen.widest` (`Contract.swift:1166`) | 512 | `POCKET_SCREEN_MAX_COLS` (`pocket.ts:1335`) | Mac ≤ phone |
| `PocketScreen.tallest` (`:1167`) | 200 | `POCKET_SCREEN_MAX_ROWS` (`:1336`) | Mac ≤ phone |
| `PocketScreen.mostStyles` (`:1168`) | 1,024 | `POCKET_SCREEN_MAX_STYLES` (`:1337`) | Mac ≤ phone |
| `PocketScreen.deepest` (`:1171`) | 100,000 | `POCKET_SCROLLBACK_MAX_INDEX` = `MAX_SCROLLBACK_LINES` (`pocket.ts:1433`, `src/shared/settings.ts:787`) | Mac ≤ phone |
| `PocketScrollbackAnswer.mostRows` (`:1363`) | 128 | `POCKET_SCROLLBACK_MAX_COUNT` (`pocket.ts:1430`) | Mac ≤ phone |
| `DoorLimits.answerCap` (`DoorClient.swift:177`, `2 * 1024 * 1024`) | 2,097,152 | `POCKET_SCREEN_MAX_BYTES`, `POCKET_SESSIONS_BUDGET_BYTES` (`pocket.ts:1339`, `:501`) | Mac ≤ phone |
| `DoorLimits.timeout` (`:180`) | 15 s | `SCREEN_HOLD_MS` (`src/main/screen/watch.ts:75`) | Mac < phone × 1000 |
| `PairingOffer.version` (`Pairing.swift:63`) | 3 | `POCKET_QR_VERSION` (`src/main/pocket/pairing.ts:1167`) | equal |
| `DoorEndpoint.publicPorts` (`DoorClient.swift:136`) | {8443, 10000} | `POCKET_PUBLIC_PORTS` (`pocket.ts:149`) | Mac ⊆ phone |
| the statuses `DoorClient.decode` and `WriteResult.of` read (`:615-629`, `:803-817`) | {200, 404} | `DoorAnswer`'s `status` (`src/main/pocket/bind.ts:108`), the wire answer's `status` (`src/main/pocket/door/wire.ts:97`), every `sendPocket(` status (`door/listener.ts:332`, `:555`, `:608`, `:747`) | Mac ⊆ phone |
| `PairAnswer.certificateCap` (`Contract.swift:960`), `PairingOffer.maxPayloadBytes` (`Pairing.swift:66`) | 4,096, 4,096 | none (instances only) | instance ≤ phone |

The Mac's request and connection limits at the freeze, which an old phone was built to fit (rule: today ≥ frozen):
`POCKET_KEYS_MAX_ITEMS` 64 and `POCKET_KEYS_MAX_TEXT_BYTES` 1,024 (`pocket.ts:1341-1342`); `POCKET_WRITE_BODY_CAPS` end 512,
choose 512, say 32,768, keys 16,384, `POCKET_PAIR_BODY_CAP_BYTES` 4,096, `PER_SOURCE_MAX` 4 and `KEEP_ALIVE_TIMEOUT_MS`
5,000 (`src/main/pocket/door/limits.ts:77`, `:41`, `:23`, `:33`); and `POCKET_SCROLLBACK_MAX_COUNT` 128 as the most rows a
page may ASK for. `POCKET_SCROLLBACK_MAX_COUNT` is therefore both an answer cap (≤ 128) and an ask cap (≥ 128): frozen at
exactly 128 until a ruled change splits it.

The words the phone sends: `SessionsShow` {all, active, ended}, `SessionsGroupBy`, `SessionsSortBy`
(`SessionsChoices.swift:26-50`), `ScrollbackKeep` {top, bottom} (`Contract.swift:1350`) and the 35 `ScreenKeyName` raw
values (`:1446-1481`); the Mac reads them through `POCKET_SESSIONS_SHOW`/`_GROUP`/`_SORT` (`pocket.ts:485-492`),
`PocketScrollbackKeep` (`:1436`) and `POCKET_SCREEN_KEY_NAMES` (`:1327-1331`).

### 2.5 The vectors

`ios/TortieTests/Fixtures/vectors.json` (118,978 bytes) holds 46 signed requests (38 writes, 35 of them one key each), 2
tampered targets and 3 tampered bodies, 2 pins, 1 client certificate, 3 seals, 2 QR payloads, 4 `/pair` answers, 3 alerts,
and 11 answers: `blocked`, `session-talk`, `session-waiting`, five `turns-*`, two `sessions-*` and `screen-sample`. It has NO
`/v1/scrollback` answer, no screen `unchanged` or absence, and no write answer (D12). Every answer name is its route id, a
`-`, and a label, or the route id alone (`blocked`), which is how the gate maps an instance to a route.

---

## 3. The rule, for Tortie's phone

**May change, any time, with no flag:**

- add a route (R4 and 333.12 decide whether it may land; the phone falls back on its 404);
- add a key to an answer, at any depth (an old phone ignores it);
- add a word to an OPEN set (the End offer's state, any plain-string word);
- send a key the phone reads only if present, or stop sending it (the phone falls back, D7);
- lower an answer cap, raise a request or connection limit, accept more words in a query;
- for the phone: read a new key only if present, accept more words, accept a wider bound, stop reading a key.

**May not change without `--freeze <label> --replace --why …`, his ruling, and the moved lines in the commit body:**

- remove a frozen route, re-path it, flip its signedness, window or read/write, or stop answering it (R1, R5);
- refuse a frozen request: a renamed or newly required query name or body key, a new signing rule, a lower limit (R2,
  R4); fail to open a frozen presentation (R3); compute an identity differently (R6);
- remove a key the frozen phone requires, make it optional in the Mac's type, send null where the phone does not accept
  it, change its kind (A2, A3);
- **add a word to a closed set** (A3); raise a cap past a frozen phone bound, hold a poll past its timeout, change the QR
  version, publish on a port the phone does not dial, answer a status it does not read (A4, A5);
- for the phone: require a key the frozen set does not hold required, narrow a kind, drop a word it accepted, shrink a
  bound, change the QR version (P1 to P3).

The second list is what makes an old phone draw `Copy.answerUnreadable`, read "no answer" after a write that may have
landed, lose its Terminal's lines, or stop pairing. Every item on it is one clause below with one ablation.

---

## 4. The frozen set — format and place

### 4.1 Files

- `ios/TortieTests/Fixtures/frozen/launch.vectors.json` — `ios/TortieTests/Fixtures/vectors.json` copied BYTE FOR BYTE at
  the freeze (after §7's additions).
- `ios/TortieTests/Fixtures/frozen/launch.wire.json` — the wire, written by `--freeze` and never by hand.
- `FROZEN_SETS_FLOOR = 1` in the gate. A commit that adds a set raises it; a deliberate retirement (by his word, when no
  phone of that set can still run: a TestFlight build expires 90 days after upload, research 140 §7.4) lowers it and names
  the label in the commit body, as `HELPER_USER_FLOOR` is kept (CLAUDE.md obligation 1).
- **`format: 1`.** The gate reads every format it ever wrote. A later reader that needs a new vocabulary writes `format: 2`
  and keeps reading 1; a format is retired only by a ruled re-freeze of every set that uses it.

### 4.2 `launch.wire.json`

Pretty-printed JSON, keys in this order, deterministic (no clock, no absolute path; a second `--freeze` of an unchanged tree
writes the same bytes):

```json
{
  "about": "The wire Tortie's phone spoke when this set was frozen: the routes it calls, what it requires of each answer, the words and bounds it holds the Mac to, and the arms that prove it. Written by node build/assert-door-only-adds.mjs --freeze launch. NEVER EDIT BY HAND: gate:onlyadd checks the seal on every build.",
  "format": 1,
  "label": "launch",
  "phoneBuild": "7",
  "phoneVersion": "1.0.0",
  "macVersion": "0.110.0",
  "read": { "ios/Tortie/Door/Contract.swift": "<sha256>", "ios/Tortie/Door/DoorClient.swift": "<sha256>", "ios/Tortie/Door/Pairing.swift": "<sha256>", "ios/Tortie/Screens/SessionsChoices.swift": "<sha256>", "src/main/pocket/door/table.ts": "<sha256>", "ios/TortieTests/Fixtures/vectors.json": "<sha256>" },
  "vectors": { "file": "launch.vectors.json", "sha256": "<sha256 of that file>" },
  "routes": [ { "id": "blocked", "method": "GET", "path": "/v1/blocked", "signed": true, "windowOnly": false, "reads": true, "answer": "PocketBlockedAnswer" } ],
  "routeMembership": "<sha256 of the sorted METHOD path lines, R4's method>",
  "qr": { "answer": "PairingOffer.Wire" },
  "types": {
    "PocketBlockedAnswer": { "fields": { "ageNote": { "presence": "required", "null": false, "kind": "string" }, "othersOmitted": { "presence": "required", "null": false, "kind": "count" }, "rows": { "presence": "required", "null": false, "kind": { "array": { "type": "PocketBlockedRow" } } } } },
    "PocketSessionDetail": { "flattens": ["PocketBlockedRow"], "fields": { "screen": { "presence": "optional", "null": true, "kind": "bool" } }, "relations": false },
    "PocketEndOffer": { "tag": "state", "words": "open", "cases": { "offered": { "batch": { "presence": "required", "null": false, "kind": "bool" } }, "unreachable": { "title": { "presence": "required", "null": false, "kind": "string" } } } },
    "PairAnswer": { "tag": "state", "words": "closed", "cases": { "pending": { "alerts": { "presence": "optional", "null": true, "kind": "bool" }, "cert": { "presence": "absent" } }, "refused": { "cert": { "presence": "absent" } }, "allowed": { "cert": { "presence": "required", "null": false, "kind": "string" } } } },
    "PocketWriteAnswer.Outcome": { "words": ["busy", "done", "failed", "refused"] }
  },
  "formats": [ { "type": "PocketScreenAnswer", "key": "revision", "format": "mark", "swift": "PocketReplyOffer.isMark" } ],
  "bounds": [ { "phone": "PocketScreen.widest", "value": 512, "applies": ["PocketScreen.cols", "PocketScrollbackAnswer.wrap"], "min": 1, "mac": "POCKET_SCREEN_MAX_COLS", "rule": "mac<=phone" } ],
  "macLimits": [ { "mac": "PER_SOURCE_MAX", "file": "src/main/pocket/door/limits.ts", "value": 4, "rule": "now>=frozen" } ],
  "sends": [ { "phone": "SessionsShow", "words": ["active", "all", "ended"], "mac": "POCKET_SESSIONS_SHOW" } ],
  "statuses": [200, 404],
  "instances": { "answers/blocked": "blocked", "pairAnswers/pending": "pair", "qr/funnel-8443": "qr" },
  "arms": [ { "id": "A0001", "instance": "answers/blocked", "pointer": "/ageNote", "op": "remove", "expect": "refuse" } ],
  "unarmed": [ "PocketHandoff.kind" ],
  "history": [],
  "seal": "<sha256>"
}
```

(The excerpt shows one entry per section; the file holds them all.) The vocabulary:

- **presence**: `required` (read by `decode`, `nullable`, `doorNumber`, `nullableDoorNumber` or `screenColor` outside any
  presence branch), `optional` (`decodeIfPresent`, or read only after `contains`), `absent` (a case that refuses the key
  when present, `guard !<c>.contains(.k)`). Inside a discriminated case the presence is that case's.
- **null**: whether `null` is accepted (`nullable`, `nullableDoorNumber`, `decodeIfPresent`).
- **kind**: `string`, `bool`, `double` (any JSON number), `int` (a JSON integer: a synthesized or `decode(Int.self)` read),
  `count` (`doorNumber`: an integer 0 to 9,007,199,254,740,991, `Contract.swift:101-123`), `color` (`screenColor`: `#` and
  six lowercase hex, `:1044-1055`), `{ "array": <kind> }`, `{ "type": "<Swift type>" }` (an object read by that type's
  decoder), `{ "words": "<Swift enum>" }` (a closed set whose words are listed under `types`).
- **tag/words/cases**: a discriminated object. `words: "closed"` when the switch's `default:` throws; `"open"` when it
  assigns.
- **relations**: true when the decoder checks fields against each other after reading them (D14). Recorded, not enforced.
- **formats**, **bounds**: §5.5's rows. **macLimits**, **sends**, **statuses**: §2.4.
- **instances**: every instance in the frozen vectors and the route it belongs to: `answers/<name>` (route = the name up to
  its first `-`, or the whole name), `pairAnswers/<name>` (`pair`), `qr/<name>` (`qr`, the payload text).
- **arms**: §8.2. **unarmed**: every `Type.key` that no frozen instance carries a value for (e.g. `PocketHandoff`, always
  null today), so no arm proves it; the gate prints the count on every run.
- **history**: one entry per `--replace`: `{ "seal": <the replaced seal>, "phoneBuild", "macVersion", "why": <the
  --why sentence> }`, appended, never edited.

---

## 5. The reader of the phone — `build/p33311/swift-wire.mjs` (builder **gate**)

Plain `.mjs` (no TypeScript), importable from the gate and from `test-ios.mjs`. It imports `lexSwift` from
`build/swift-lex.mjs` (D17) and nothing beyond Node's `fs`, `path` and `crypto`.

### 5.1 What it reads

Every `.swift` file under `ios/Tortie/` (47 at this head), lexed once each: comments blanked in `code`, string contents
blanked in `bare`. Types are module-global, so a decoder that moves files is still found. It classifies only what is
reachable from the route roots (§5.3) and the QR; the Keychain records it meets elsewhere are skipped, never classified.

### 5.2 What it understands, and nothing else

Over `bare` text (string literals read from `strings` where a word is needed), whitespace and newlines insignificant,
parentheses balanced:

1. `enum CodingKeys: String, CodingKey { case a, b; case x = "y" }` — Swift name to wire key.
2. `extension T: Codable|Decodable { … init(from decoder: Decoder) throws { … } }`, and the same on the type's own
   declaration. The container is `let <name> = try decoder.container(keyedBy: CodingKeys.self)`, any variable name.
3. Calls on that container ANYWHERE in the body (a statement, an argument, `if let x = try …`, `… ?? <default>`):
   `decode(T.self, forKey: .k)`, `nullable(T.self, forKey: .k)`, `doorNumber(forKey: .k)`,
   `nullableDoorNumber(forKey: .k)`, `decodeIfPresent(T.self, forKey: .k)`, `screenColor(forKey: .k)`, and
   `<c>.contains(.k)`: an `if <c>.contains(.k) { … }` whose then-branch reads `.k` makes `.k` optional; a
   `guard !<c>.contains(.k)` makes it `absent` in the case that holds it. `try X(from: decoder)` is a flatten. `T` is a
   Swift type name, `[T]` or `[[T]]`.
4. A discriminant: a `String` read on the container, inline (`switch try <c>.decode(String.self, forKey: .t) {`) or bound
   first (`let w = try <c>.decode(String.self, forKey: .t)` then `switch w {`). Case labels list words, as literals or as
   `Word.x` (resolved to the `static let x = "…"` inside the type's own `enum Word`). Inside a case listing several words,
   `if w == "x" { A } else { B }` narrows: A is word x's, B the case's other words'. Calls inside a case are that case's
   words'. A `default:` that throws makes the set `closed`; one that assigns makes it `open`.
5. A key read twice (`PocketScreenStyle.bg`: `nullable(String)`, then `screenColor` in the else branch) merges: presence
   is the strongest read's, null is accepted when any read accepts it, the kind is the narrowest non-null read's (`color`).
6. A `guard … else { throw … }` or a call such as `Self.holdsTogether(…)` after the reads is a relation: the type gets
   `"relations": true` and nothing else (D14).
7. A synthesized `Decodable` (`struct Wire: Decodable { let v: Int … }`, no `init(from:)`): every stored `let`/`var` is
   `required` unless its type is `T?` or `Optional<T>` (then `optional`, null accepted); the wire key is the property name
   unless a `CodingKeys` maps it.
8. `enum E: String, … Codable|Decodable { case a; case b = "B" }` — a closed word set (the raw value, else the case
   name). The same form without `Codable`/`Decodable` (`ScrollbackKeep`, `ScreenKeyName`) is read for `sends` only.
9. Constants: `static let n = <integer literal>` (with `_`), or a product or sum of such literals (`2 * 1024 * 1024`), a
   `TimeInterval` literal, and a `Set<Int>` literal (`publicPorts`). Anything else a bound names is unreadable.

**Anything else inside a reachable decoder is an UNREAD STATEMENT and the reader reports it with its file and line** (P0).
A reader that silently skipped a new idiom would freeze a phone that requires more than the file says.

### 5.3 The route roots

From `DoorClient.swift`: every `signedGet(<T>.self, target: Self.<x>Target…)` (multi-line allowed) names a root type and a
target; the target's path is the static string `<x>Target`, or the leading path of the first string literal the function
`<x>Target(…)` returns. `/pair` is `present`'s `Self.decode(<T>.self, …)` beside `Self.pairTarget`; the four writes are
`WriteRoute.target`'s cases with `WriteResult.of`'s `JSONDecoder().decode(<T>.self`. Signedness: the phone signs every
route but `present`'s; at the freeze that must equal the table's `signed` column. A route of the Mac's table the phone names
no target for is not frozen (printed); a phone target the table does not hold is red at the freeze.

### 5.4 What it returns

`readPhoneWire(root) → { routes, qr, types, bounds (phone half), sends (phone half), statuses, version, ports, unread[],
read }` and `projection(wire)`: the part compared for P4 and the proof (the types reachable from the roots and the QR,
bounds' phone values, sends' phone words, statuses, the QR version and ports), as canonical JSON.

### 5.5 The formats and bounds rows (written into the frozen file at the freeze)

| Row | Applies to | Mirrors |
| --- | --- | --- |
| `mark` | `PocketScreenAnswer.revision`; `PocketScreen.dialog` (null accepted), `.space`; `PocketScrollbackAnswer.space` | `PocketReplyOffer.isMark` (`Contract.swift:425-427`), asked at `:1314`, `:1246-1255`, `:1263-1267`, `:1412-1437` |
| `questionId` | `PocketScreen.turn` | `.isQuestionId` (`:416-422`), asked at `:1266` |
| `certificate` | `PairAnswer.cert` (case `allowed`) | `Base64URL.decode`, non-empty, ≤ `certificateCap` (`:979-984`) |
| `version` | the QR's `v`, equal to `PairingOffer.version` | `Pairing.swift:109` |
| `port` | the QR's `port`, one of `DoorEndpoint.publicPorts` | `Pairing.swift:111` |
| `publicName`, `pin`, `ed25519Spki`, `x25519Spki`, `secret`, `positive` | the QR's `host`, `fp`, `dk`, `dx`, `ps`, `exp` | `Pairing.swift:110-118` |
| bounds | §2.4's first six rows, each with the fields it applies to and its minimum | `holdsTogether` (`:1259-1278`, `:1412-1437`) |

These rows are the only part the reader cannot take from a decoder statement: each is a row in the reader's own code naming
the Swift predicate or constant it mirrors, the constant's VALUE is read from the Swift (§5.2 rule 9), and each format row
is proven against the phone by a refuse arm (§8.2). A later edit to the reader's table never weakens a frozen set, because
every clause checks against the rows SEALED IN THE FILE.

### 5.6 Its own proof

Before reading the tree it reads its fixtures, `build/p33311/fixtures/*.swift.txt` (never `.swift`, so nothing under
`build/` is compiled or swept by `conformance:ios`), each beside the expected JSON: a plain decoder; a multi-line call; a
container named `container`; a flatten; an inline discriminant with `Word` constants and an assigning `default`; a
let-bound discriminant with a two-word case, `guard !c.contains`, an `if w == "x"` narrowing and a throwing `default`; the
double read of `bg`; `if c.contains(.k)`; `if let … decodeIfPresent` and `?? default`; a decode inside an enum payload; a
synthesized `Decodable` with an `Optional`; a closed enum with raw values; a product constant; a trailing relation; and one
UNREAD idiom that must be reported. A fixture that reads otherwise turns the gate red before any clause runs ("every
scanner proves itself first", as `conformance:ios` does).

---

## 6. The gate — `build/assert-door-only-adds.mjs`, `npm run gate:onlyadd` (builder **gate**)

### 6.1 Its run

- **The outer run** (plain node) re-runs this file under the pinned tsx (`tsxCli()` from `build/ts-runner.mjs`,
  `spawnSync`, a 60 s timeout, `env` plus one marker), exactly as `build/p316/vectors.mjs:148-168` does, and exits with its
  status. Nothing it starts outlives it.
- **The inner run** reads the frozen sets; runs the reader over the tree; builds ONE `ts.Program` over
  `src/shared/ipc/pocket.ts` and `src/main/pocket/pairing.ts` with `tsconfig.node.json`'s options (measured 521 ms); parses
  `src/main/pocket/{ipc,routes,bind,writes}.ts`, `src/main/pocket/door/{table,limits,wire,listener}.ts` and
  `src/main/screen/watch.ts` with `ts.createSourceFile` alone; and imports the shipping
  `src/main/pocket/{pairing,routes,writes,door/table,door/limits}.ts` for R2, R3 and R6. It opens no socket, binds nothing,
  starts nothing else and reads nothing under the person's home.
- **A constant is read** by its exported name: its literal type in the checker, else its initializer folded from the AST
  (numeric literals with `_`, `+ - *`, parentheses, `as const`, `Object.freeze({ … } as const)` members, a readonly
  tuple of literals, and an identifier that resolves to such a constant in the same file or one it imports). Anything else
  is red with the constant's name, never skipped.
- **Every clause counts what it checked**, and a count of zero where the frozen set holds items is red ("a scanner that
  stopped finding is never taken for a clean tree").
- **Order**: the reader's fixtures, then F, R, A, P. Every clause runs and prints `ok` or `FAIL` with its findings (25 at
  most each, then a count), as `conformance:ios` prints; any FAIL exits 1.
- **The last line**, on a pass: `[gate:onlyadd] PASS: 1 frozen set (launch: phone build 7, Mac 0.110.0); 11 routes served,
  N requests replayed, 2 presentations opened, M instances over K routes conform, J Mac limits held, U fields unarmed; the
  phone's wire today EQUALS launch.` (or `DIFFERS from launch at P paths: …`, P4, never red).
- **Modes**: `--freeze <label>`, `--replace`, `--why "<sentence>"` (§9); `--into <dir>` (write or read the frozen sets in
  `dir` instead of `ios/TortieTests/Fixtures/frozen/`, for the builder's own tests); `--root <dir>` (judge another tree, as
  `conformance:ios --root` does, for the ablation); `--json` (end with one `GATE_ONLYADD:{…}` line).
- **Where it runs**: inside `npm run build`, immediately after `node build/conformance-ios.mjs` (so rule j has already held
  `vectors.json` to the shipping TypeScript), and as `npm run gate:onlyadd` on its own.

### 6.2 The clauses, each with its one-clause ablation

The ablations are planted by `build/p33311/ablation.mjs` (`npm run ablation:p33311`, §6.3) in a `cp -Rc` clone; each must
turn its own clause red. Where an ablation edits the composer, the clone's `vectors.json` is regenerated with
`node build/p316/vectors.mjs` first.

**F — the frozen sets themselves**

| Clause | Asks | Ablation (red on this clause) |
| --- | --- | --- |
| F1 | Every `*.wire.json` parses, its `format` is one the gate reads, and its `seal` equals the sha256 of its canonical body | delete one field from `types.PocketBlockedAnswer.fields` in the clone's `launch.wire.json`, seal left as it was |
| F2 | Its `vectors.sha256` equals the sha256 of its vectors file | change one byte inside a string of `launch.vectors.json` |
| F3 | At least `FROZEN_SETS_FLOOR` sets exist, and each holds together: every route's `answer` is a key of `types`; `routeMembership` equals the sha256 of its own routes' sorted `METHOD path` lines; every type a `kind` names is in `types`; every instance resolves in the frozen vectors and names a frozen route or `qr`; every arm's instance and pointer resolve (an `add` arm's key absent), its op is one of §8.2's and its `expect` the op's | delete `launch.wire.json`; (second arm) reseal a file whose one arm points at `/noSuchKey` |
| F4 | The gate is wired and its halves still exist: `package.json`'s `build` runs `build/assert-door-only-adds.mjs`; `build/verification-checks.mjs` classifies `gate:onlyadd`; `build/p316/test-ios.mjs` exports `P33311_SUITES` naming `DoorFrozenTests` and passes `P33311_PROOF`; `ios/TortieTests/DoorFrozenTests.swift` exists and names `Fixtures/frozen`; `build/conformance-ios.mjs` still spawns `build/p316/vectors.mjs --check` for rule j | delete `ios/TortieTests/DoorFrozenTests.swift`; (second arm) take `assert-door-only-adds.mjs` out of `build` |

**R — the routes and the requests: a new Mac, an old phone**

| Clause | Asks | Ablation |
| --- | --- | --- |
| R1 | Every frozen route is a row of the shipping `POCKET_ROUTES` (read with the TypeScript parser as R4 reads it, `conformance-pocket.mjs:943-972`) with the same `id`, `method`, `path`, `signed`, `windowOnly` and `reads`, and its id is in `POCKET_ROUTE_IDS` | remove the `scrollback` row; (second arm) `turns` with `signed: false` |
| R2 | Every frozen request replays through the shipping door: `matchPocketRoute(METHOD, pathname)` finds its frozen route; `new URL(target, base)` reads `pathname + search` back byte for byte and the same `id`; a fresh `PocketRequestVerifier` over the identity `openIdentity` makes from the frozen Mac seeds and the frozen phone fields, at the request's own clock and over the phone's channel, answers `ok`; the route's shipping reader reads the frozen words back (`readSessionsQuery` → `asked`, `readScreenQuery` → `id` and the `since` the target spells, `readScrollbackQuery` → `page`, `readTurnRange` accepts its `limit` and `to`); and a write's body is at most the shipping `POCKET_WRITE_BODY_CAPS[verb]` and, handed to a fresh SHIPPING `createPocketWriteHandler` over a recording `writes` that answers `done`, reaches exactly its verb with the frozen fields and answers 200 with an answer that conforms to the frozen `PocketWriteAnswer` (A2's checker). A frozen request on no signed route (the `lowercase-method-with-body` vector) is held by `canonicalRequestText` over its facts equalling its frozen `canonical`. Every frozen request is one or the other, counted | `CHOOSE_KEYS` in `writes.ts` gains `,force`; (second arm) `readScreenQuery` reads `held` instead of `since` |
| R3 | The frozen presentations open: a shipping `PocketPairing` over the frozen identity, `openPresentation(secret, body)` on `seal.fromPhone.body` and `pushSeal.body`, reads the frozen keys and label (and the frozen alert address on the second), and `presentationProofText(challenge, …)` over each body's fields verifies under its `ek` | `'tortie-pocket-pair-v1'` → `'…-v2'` in `pairing.ts` |
| R4 | The Mac's request and connection limits are at least the frozen values (`macLimits`), and every word the frozen phone sends is still a word the Mac reads (`sends`: `POCKET_SESSIONS_SHOW`, `_GROUP`, `_SORT`, the `PocketScrollbackKeep` union, `POCKET_SCREEN_KEY_NAMES`) | `POCKET_KEYS_MAX_ITEMS = 32`; (second arm) `'oldest'` out of `POCKET_SESSIONS_SORT`; (third) `PER_SOURCE_MAX = 2` |
| R5 | Main still answers every frozen READ route: the one read switch (the `answer:` arrow in `src/main/pocket/ipc.ts`, `:518-569`) has a `case '<id>':` whose arm returns `routes.<id>(`; `pair` is answered in `server.ts` (`createPocketHandler` answers `request.route === 'pair'` with `pairBody(`, `src/main/pocket/server.ts:165-175`); and every frozen WRITE route is one of `POCKET_WRITE_ROUTE_IDS` (`pocket.ts:139`), which R2 drives | delete the `case 'turns':` arm |
| R6 | The identities an old phone computes are the ones the Mac computes: over the frozen keys, the shipping `phoneIdOf`, `pairFingerprint`, `pairingBinding`, `clientKeyPinOf` and `spkiPinOf` (over each frozen pin's `publicKeyFingerprint`) equal the frozen `identity` and `pins` | `phoneIdOf` hashes a different slice |

**A — the answers: a new Mac, an old phone**

| Clause | Asks | Ablation |
| --- | --- | --- |
| A1 | Coverage: (a) every frozen route with instances in the frozen vectors has at least one instance in today's `vectors.json`; (b) every Swift type that the frozen vectors reach through `required`, non-null keys from a root (arrays included) is reached in today's. A type reached only through an optional or nullable key that lost its last instance is printed (`A3 alone holds it now`), never red, because the Mac may stop sending an optional key (§3) | drop the scrollback answers from `vectors.mjs`'s list and regenerate |
| A2 | Every instance in today's `vectors.json` whose route is frozen conforms, recursively, to the frozen shape: each `required` key present (each case's for a discriminated object; `absent` keys absent), `null` only where accepted, the JSON kind the frozen kind reads (`count` an integer 0 to 2^53−1, `int` an integer, `color` `#` and six lowercase hex), a closed word inside its frozen set (an unknown discriminant word refused only when `closed`), every `formats` row and every `bounds` row holding (a value from `min` to the phone value; an array's length for `styles` and `rows`; the answer's bytes under `answerCap`; the QR payload's bytes under `maxPayloadBytes`). Unknown keys are ignored, as the phone ignores them | the blocked composer in `routes.ts` drops `emptyLine`, then regenerate; (second arm) it writes `othersOmitted` as `String(n)` |
| A3 | The Mac's TYPES still promise it, so a branch the vectors never compose is held too. Each frozen route's TS answer type: `blocked` … `scrollback` by the type names `createPocketRoutes`' declared members return (`routes.ts:1315-1325`, read with the parser, `Promise<…>` and `\| null` unwrapped, each name exported from `pocket.ts`); the writes' `PocketWriteAnswer`; `pair`'s `PocketPairAnswer` (`pairing.ts:1265-1268`). Walked in the checker alongside the frozen shape: every frozen `required` key is a property that is not optional and admits no `undefined`; its type is of a compatible kind (`string` or a string-literal union for `string`, `color`, `words`; `boolean` or a boolean literal; `number` or a number literal for `double`, `int`, `count`; an array; an object); it admits `null` only where the phone accepts null; every frozen closed-word path's TS type is a union of string literals, all inside the frozen set; for a discriminated object, every TS member's tag literal is a frozen case when the set is `closed`, and every member whose tag is a frozen case has that case's required keys | add `\| 'quota'` to `PocketWriteReason` (A2 stays green: no composed answer says it); (second arm) `ageNote?: string` in `PocketBlockedAnswer` |
| A4 | The Mac's constants stay inside the frozen phone: the `bounds` rows `mac<=phone` (`POCKET_SCREEN_MAX_COLS` … `POCKET_SESSIONS_BUDGET_BYTES`), `SCREEN_HOLD_MS < timeout × 1000`, `POCKET_QR_VERSION` equal to the frozen version, `POCKET_PUBLIC_PORTS` inside the frozen ports. A named constant that no longer exists or cannot be read is red with its name | `POCKET_SCREEN_MAX_COLS = 1024`; (second arm) `MAX_SCROLLBACK_LINES = 200_000`; (third) `SCREEN_HOLD_MS = 20_000` |
| A5 | Every status the door answers is one the frozen phone reads: `DoorAnswer`'s `status` (`bind.ts:108`) and the wire answer's `status` (`door/wire.ts:97`) are unions of number literals inside the frozen `statuses`, and every `sendPocket(` call under `src/main/pocket/door/` passes a number literal inside them or a member typed by one of those unions | `DoorAnswer`'s `status: 200 \| 404 \| 204`; (second arm) `sendPocket(res, 400, null)` in `listener.ts` |

**P — the phone: an old Mac, a new phone, read as text**

| Clause | Asks | Ablation |
| --- | --- | --- |
| P0 | The reader reads every decoder reachable from today's route roots and the QR with no unread statement, and every bound and send it names resolves. And it agrees with itself: when every phone file a frozen set's `read` names is byte-identical to the frozen hash, today's projection must EQUAL that set's (a reader that reads the same bytes two ways is broken) | add `x = try c.decodeIfPresentOrDefault(String.self, forKey: .x)` to a reachable decoder |
| P1 | No path of a frozen route's answer is `required` today unless the frozen set holds it `required` (in the same case): no flip from optional to required, and no new required key, because an old Mac never sends it (D7) | `screen = try c.decode(Bool.self, forKey: .screen)` in `PocketSessionDetail` |
| P2 | No frozen path is narrowed today: its kind accepts at least the frozen kind (`double` ⊇ `int` ⊇ `count`; `string` ⊇ `color` and `words`; an open tag ⊇ a closed one), `null` is still accepted where it was, every word of a frozen closed set is still a word, every frozen discriminant case is still a case | remove `busy` from `PocketWriteAnswer.Outcome`; (second arm) `blockedSince = try c.doorNumber(forKey: .blockedSince)` |
| P3 | No phone bound is below its frozen value; the QR version is the frozen one; the phone's ports and statuses include the frozen ones | `static let widest = 256` |
| P4 | Never red: prints whether today's projection (§5.4) equals each frozen set's, and the first 10 paths where it differs | — |

**Controls**, each of which must stay GREEN in the ablation (they prove adding is allowed): **C1** the Mac adds
`macVersion?: string` to `PocketBlockedAnswer` and the blocked composer sends it (vectors regenerated); **C2** the Mac
adds a GET row `/v1/probe` with a new id to the table and to `POCKET_ROUTE_IDS` (`conformance:pocket` R4 goes red there,
not this gate); **C3** the phone reads a new key with `decodeIfPresent` in `PocketBlockedAnswer`; **C4** the Mac adds
`{ state: 'later' }` to the `PocketEndOffer` union (an open set); **C5** the Mac raises `PER_SOURCE_MAX` to 8.

### 6.3 `build/p33311/ablation.mjs` (builder **gate**)

`npm run ablation:p33311`. One `cp -Rc` clone of the worktree into `/private/tmp/tortie-ops/p33311/<role>/ablation-<pid>`
(node_modules and build/vendor included, copy-on-write), removed in a `finally`. For each arm: plant (a string replacement
that must match exactly once, or a file removal), regenerate `vectors.json` in the clone when the arm says so, run `node
build/assert-door-only-adds.mjs --root <clone> --json`, and assert the owning clause is red (other clauses may be red too)
or, for a control, that the gate passes; restore each planted file and check its sha256 equals the original before the next
arm. It prints one line per arm and `ABLATION_P33311: <red>/<arms> red, <green>/<controls> controls green`; any miss exits
1. Every process it starts it waits for (`spawnSync`); nothing outlives it (`gate:background`).

---

## 7. The vectors gain what they never composed — `build/p316/vectors.mjs` (builder **vectors**)

Appended to `answerShapes` (`vectors.mjs:1215-1229`), so every earlier answer and every request keeps its bytes; the
requests list is NOT touched (every request's clock and nonce stay):

| Name | Composed by | Over |
| --- | --- | --- |
| `scrollback-page` | the shipping `routes.scrollback(query, () => false)` with the request vector's own ask (`from` 2,861, `count` 108, `depth` 2,969, `wrap` 120, `keep` bottom, `vectors.mjs:347`) | a `facts.scrollback` that answers rows the shipping `scrollbackOf` accepts inside that ask: the committed sample's styles (`build/fixtures/screen/sample-claude-2.1.287.json`) and its runs cut to `wrap`, or plain text rows; never a hand-written answer |
| `scrollback-ended` | the same route | a `facts.scrollback` answering `why: 'ended'` with every other field null or empty |
| `screen-unchanged` | the shipping `routes.screen` with `since` the sample's revision | a `facts.screen` answering `unchanged` |
| `screen-ended` | the same route | a `facts.screen` answering `why: 'ended'` |
| `end-done`, `choose-changed`, `say-failed`, `keys-done`, `end-malformed` | the SHIPPING `createPocketWriteHandler` (`writes.ts:466`), each a fresh handler, handed the bodies the request vectors already hold (`end`, `choose`, `say`, `keys-text`) and, for the last, a body that is not JSON | a recording `writes` answering `done`, `refused` `changed` with its sentence, `failed` with its sentence, and `done`; `stillPaired: () => true`, `shuttingDown: () => false`, a door that is not stopping, `now: () => T` |

Each composed answer is asserted against what the facts were chosen to produce (as `vectors.mjs:1239-1267` does for End
and reply), so a vector set that composed the wrong shape fails by name. The header's section list and the closing counts
line gain the new answers. `node build/p316/vectors.mjs` regenerates `ios/TortieTests/Fixtures/vectors.json`, and
`--check` passes afterwards with no other byte moved (the builder diffs the file: only `answers` gains entries).
`DoorVectorTests.testTheSessionsAnswersReadBackAndDraw` (`DoorVectorTests.swift:671-684`) expects exactly two
`sessions-*` answers; none is added.

---

## 8. The phone's half (builder **phone**)

### 8.1 `ios/TortieTests/DoorFrozenTests.swift` (new)

Reads every `*.wire.json` under `Fixtures/frozen/` (the checkout path beside the test file first, the bundle second, as
`DoorVectorFile.load` does) and its vectors file, and checks the vectors file's sha256 with CryptoKit. A small `FrozenWire`
`Decodable` reads only the sections it needs (`label`, `routes`, `instances`, `arms`, `vectors`), and a small
`FrozenVectors` reads only `keys`, `identity`, `requests`, `seal`, `pushSeal`, `qr`, `pairAnswers` and `answers`: never
`DoorVectorFile`, whose sections move with the current vectors.

**Decoding by route, never by Swift name** (one function, `decode(route:data:)`): `pair` → `PairAnswer`; `blocked` →
`PocketBlockedAnswer`; `session` → `PocketSessionAnswer`; `turns` → `PocketTurnsAnswer`; `sessions` →
`PocketSessionsAnswer`; `screen` → `PocketScreenAnswer`; `scrollback` → `PocketScrollbackAnswer`; `end`, `choose`, `say`,
`keys` → `PocketWriteAnswer`; `qr` → `PairingOffer.parse`. A frozen route with no case fails by name.

The tests, each printing one row per item, `P33311|<label>|<item>|<expect>|<got>`:

1. **`testEveryFrozenAnswerDecodes`** (items `decode:<instance>` and, where the vectors hold one, `decode:<instance>+unknown`;
   expect `accept`): every frozen instance decodes as sent and as its `withUnknown` copy; a sessions answer then draws
   (`SessionsDrawing(answer, asked:)` over its own echoed words); the turns answers page as `DoorVectorTests` pages them
   when `turns-newest`, `turns-to-24` and `turns-to-4` are present; a session answer's decoded `end`, `replyOffer` and
   `drawsScreen` equal what its JSON says (nothing the old Mac offered is lost to a degrade); a write answer whose `write`
   is `""` reads `echoesNoId`.
2. **`testTheArms`** (item `arm:<id>`): applies each arm of §8.2 to its instance (JSONSerialization, a JSON-pointer edit,
   re-serialized) and decodes by route. Accept arms are asserted always. Refuse arms are asserted only when the process
   environment's `P33311_PROOF` names this set's label; otherwise the row prints `skipped`.
3. **`testTheFrozenRequestsAreTheOnesThisPhoneSends`** (item `request:<name>`, expect `same`): for every frozen request,
   today's `DoorSignature.canonicalText` over its facts equals its frozen `canonical`; today's `RequestSigner` over the
   frozen phone seed writes the four headers in order and a signature that verifies over that text (CryptoKit signs with
   randomness, so the bytes are not compared); its target is what today's builder spells from the inputs read out of the
   target itself (`sessionTarget`, `turnsTarget`, `sessionsTarget`, `screenTarget`, `scrollbackTarget`, the static
   targets); and a write's body is what today's `EndBody`/`ChooseBody`/`SayBody`/`KeysBody` encoder writes with sorted keys
   from the frozen body's own fields, byte for byte. And the pairing (items `request:seal` and `request:pushSeal`): today's
   presentation plaintext for the frozen keys and label equals `seal.fromPhone.plaintext` (and `pushSeal.plaintext` with
   the frozen address), and today's proof text over its fields equals the frozen `proof`.
4. **`testTodaysVectorsDecodeByTheirRoutes`** (item `today:<instance>`, expect `accept`): every answer in TODAY's
   `vectors.json` whose route a frozen set names decodes by that route on today's phone: the current Mac and the current
   phone meeting over the answers §7 adds, which `DoorVectorTests` does not name.

To reuse the sessions query reader, `DoorVectorTests.sessionsQuery` (`DoorVectorTests.swift:202-215`) loses `private`; it
is the one edit to that file.

### 8.2 The arms (generated by the gate at the freeze, sealed in the file)

For each frozen instance in name order, walking the parsed JSON (an array's FIRST element only), each `Type.key` gets each
applicable op ONCE across the whole set (the first instance that carries a value there), ids `A0001` upward:

| Op | Applied to | Expect |
| --- | --- | --- |
| `remove` | a `required` key | refuse |
| `kind` | any present key: a string, colour or word → `0`; a number or bool → `"p33311"`; an array → `{}`; an object → `[]` | refuse |
| `null` | a `required` key that does not accept null | refuse |
| `fraction` | a present `int`, `count` or `double` → its value + 0.5 | refuse for `int` and `count`, accept for `double` |
| `word` | a closed set's word, or a tag → `"p33311-unknown"` | refuse when closed, accept when open |
| `add` | an `absent` key in its case (`cert` on `pending`, `refused`) → `"p33311"` | refuse |
| `format` | each `formats` row: a mark → 13 lowercase hex; a question id → `"p33311"`; a certificate → `"!"`; `v` → its value + 1; `port` → 443; each other QR field → one value outside it | refuse |
| `older` | each object that has `optional` keys: all of them removed at once (what an older Mac sends) | accept |
| `unknown` | each instance: `{"p33311Unknown":{"nested":[1]}}` added to every object at every depth | accept |

No arm sets a nullable key to null and none tests a bound, because the phone's relations (D14) would refuse for another
reason (a write's `reason` null beside `refused`; 201 rows that are not 201 lines) and the arm would prove nothing; bounds
and null are held by P2 and P3 on the phone's text, and their values by A2 and A4. Single optional keys are not removed one
at a time for the same reason (`depth` without `space` refuses, `Contract.swift:1246-1255`). At this head the generator is
expected to make about 500 arms; the integrator records the number.

### 8.3 `build/p316/test-ios.mjs` (builder **phone**)

- `export const P33311_SUITES = Object.freeze(['DoorFrozenTests'])`, appended beside `P3371_SUITES`, and added to the
  `suitesNotRun` union (`:1787`).
- **Before the runs**: read every frozen set; run `readPhoneWire` and `projection` (`build/p33311/swift-wire.mjs`) over
  today's phone; for each set whose projection equals today's, add its label to `P33311_PROOF` (comma-joined) in `testEnv`
  (the helper hands it to the tests). Say which: `the phone's decoders read exactly launch: its refuse arms are asserted`,
  or `… differ from launch at N paths: its refuse arms print skipped`. When every phone file a set's `read` names is
  byte-identical to its hash and the projections still differ, that is a problem (P0's consistency, asked again here).
- **After each configuration**: from the run's output read every `P33311|…` row and require, per set, every arm id, every
  `decode:` item, every `request:` and every `today:` item exactly once; `accept` → `accept`; `same` → `same`; `refuse` →
  `refuse` when the set is in `P33311_PROOF`, else `skipped`. Any missing, doubled or wrong row is a problem (listed, at
  most 25), and a configuration with a problem is not a pass. Print one summary line per set and configuration.
- **`--self-test`** gains checks of that grader: a missing arm row named; a refuse arm `skipped` while proof holds named; an
  accept arm that refused named; a doubled row named; a clean run passes.

### 8.4 How `test:ios` proves it ran

Four ways at once, none of which the test itself controls: xcodebuild's own `Test Suite 'DoorFrozenTests' passed|failed`
line (`suitesNotRun`); the row count, which `test-ios.mjs` takes from the sealed frozen file and not from the test; the
`P33311_PROOF` arms, which a test that decoded nothing could not answer `refuse` to; and F4, which turns every BUILD red if
`DoorFrozenTests.swift` or `P33311_SUITES` disappears.

---

## 9. The regenerate flag, and the rule for using it

`node build/assert-door-only-adds.mjs --freeze <label> [--replace --why "<sentence>"]`:

1. Runs the reader over today's phone; refuses (exit 1, the unread statements listed) if P0 would be red, if a phone
   target names a route the table does not hold, or if the phone's signed routes differ from the table's.
2. Copies `vectors.json` to `<label>.vectors.json`, builds the wire file (§4.2) with its formats, bounds, macLimits, sends,
   instances, arms and seal, and runs every clause against the result before writing anything.
3. Refuses if `<label>.wire.json` exists, unless `--replace` is given; `--replace` requires a non-empty `--why`, appends
   `{ seal, phoneBuild, macVersion, why }` of the replaced file to `history`, and prints every line of the old projection
   that moved (`- old`, `+ new`), so the commit body can name them.
4. Writes both files and prints `froze <label>: phone build B, Mac V, R routes, T types, A arms, U unarmed`.

**The rule** (the integrator writes it into CLAUDE.md, §10): `--freeze` with a NEW label is used when a public phone build
changes what it reads (the new set is added beside `launch`, and `FROZEN_SETS_FLOOR` is raised). `--replace` is used only
(a) before the launch Mac tag exists, to refresh `launch` at a landing whose P4 line reads "differs", or (b) for a break he
ruled, and the commit body names every moved line and why, as a deliberate contract change names its baseline lines
(CLAUDE.md obligation 3). A green build after `--replace` is never evidence that an old phone still works; the ruling is.

**This phase** runs `--freeze launch` once, in the integrator, after §7's vectors exist.

---

## 10. CLAUDE.md (the integrator)

Three edits, each small:

1. In "### Gates before any commit", the sentence listing the gates inside `npm run build` gains `gate:onlyadd` after
   `conformance:ios`, and the sentence after it gains: "`gate:onlyadd` is Phase 333.11's: the routes, requests, keys, words,
   bounds and limits the launch phone holds the door to, frozen under `ios/TortieTests/Fixtures/frozen/`; adding a route, an
   optional key or a field is allowed, and adding a word to a closed set the phone refuses outside of is not."
2. "### The four obligations that ride along in the same commit" becomes five; the fifth: "**A deliberate change to what a
   released phone reads or sends regenerates its frozen set** with `node build/assert-door-only-adds.mjs --freeze <label>
   --replace --why "…"` in the same commit, only on his ruling or before the launch Mac tag, and the commit body names every
   moved line and why. A new public phone build that reads something new freezes its own set beside `launch` and raises
   `FROZEN_SETS_FLOOR`." The heading's "four" becomes "five".
3. The `test:ios` row of the probes table gains one sentence: "Since Phase 333.11 it runs `DoorFrozenTests` over every
   frozen set and grades its rows: every frozen answer decodes, as sent, with every optional key removed and with unknown
   keys; every frozen request is still written byte for byte; and, while the phone's decoders read exactly a frozen set
   (`P33311_PROOF`), every refuse arm refuses."

---

## 11. Builders, disjoint files, and who owns what is shared

| Builder | Owns (creates or edits) | Must not touch |
| --- | --- | --- |
| **gate** | NEW `build/assert-door-only-adds.mjs`, NEW `build/p33311/swift-wire.mjs`, NEW `build/swift-lex.mjs` (a byte-for-byte copy of `lexSwift` from `build/conformance-ios.mjs:504-617` with its header comment), NEW `build/p33311/fixtures/**`, NEW `build/p33311/ablation.mjs` | `build/conformance-ios.mjs`, `package.json`, anything under `ios/` or `src/` |
| **vectors** | `build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json` (regenerated by the script, never by hand) | the requests list's existing entries, anything under `src/` |
| **phone** | NEW `ios/TortieTests/DoorFrozenTests.swift`, `build/p316/test-ios.mjs`, `ios/TortieTests/DoorVectorTests.swift` (only `sessionsQuery`'s `private`) | `ios/Tortie/**`, the project file |
| **integrator** | `package.json` (`gate:onlyadd`, `ablation:p33311`, the `build` chain), `build/verification-checks.mjs` (`pure('gate:onlyadd')` and the ablation's class), `build/conformance-ios.mjs` (delete `lexSwift`'s body, add `import { lexSwift } from './swift-lex.mjs';` and `export { lexSwift };`), the two frozen files (by `--freeze launch` only), `CLAUDE.md` (§10), this file's `§As built` | `docs/BACKLOG.md` (the main session's), `CHANGELOG.md` (no item, D13), `docs/audits/contract-baseline.txt` (must not move) |

Until the integrator moves the lexer, the gate builder's `build/swift-lex.mjs` is a copy; the builder shows the two are
byte-identical (a `diff` of the function) in its report. The gate builder develops against frozen sets it writes with
`--freeze launch --into <its scratch>` over the vectors as they are, and re-runs once the vectors builder is done. The
phone builder may compile its test with `xcodebuild build-for-testing` (its own DerivedData, no Simulator) and runs
`node build/p316/test-ios.mjs --self-test` and `node build/conformance-ios.mjs`; `test:ios` itself is the verifier's.

---

## 12. The proof, run rather than read

### 12.1 The battery (the integrator, then the committer at landing)

`npm run typecheck`; `npm run build` (which now runs `gate:onlyadd` after `conformance:ios`, and `gate:contract` last, whose
baseline must not move); `node build/assert-door-only-adds.mjs` alone, with its time; `npm run -s ablation:p33311`;
`node build/p316/vectors.mjs --check`; `node build/conformance-ios.mjs` (the lexer moved; every scanner fixture must still
pass) and `npm run -s ablation:p316` once, because `conformance-ios.mjs` changed; `node build/p316/test-ios.mjs
--self-test`; `node build/assert-hermetic-checks.mjs`; `npm test`; `npm run smoke`, `npm run smoke:t3` and `npm run
package` under the lock. `git diff 01a25b99 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt` is empty.

### 12.2 `test:ios` (the verifier, under the lock)

`npm run test:ios` once, on iOS 26.3 (it runs Debug and Release). It must name `DoorFrozenTests` in its suite lines, print
every frozen row, assert every refuse arm (`P33311_PROOF=launch`, because no phone file moves in this phase), and pass.
The verifier records the arm and row counts and the run's time. The 18.3 floor is not required (no phone code moves), and
is the verifier's to add if the slot allows.

### 12.3 What the verifier must produce, and its independent methods

Tier 2: the gates, one `test:ios` run, and at least one method the builders did not use, named in the verdict:

- **Re-derive the frozen set by a different method.** Read `Contract.swift` by hand or with a reader of the verifier's own
  and list every required key of three answers (`blocked`, `screen`, `scrollback`) and the six bound rows against
  `holdsTogether` (that `cols` is held by `widest`, and so on); compare with the frozen file. The refuse arms of the
  `test:ios` run are the phone's own judgement of the same thing.
- **Attack, do not confirm.** Plant at least three breaks the ablation does not list (examples: a Mac that sends `at` as an
  ISO string; a write reason added to the TS union AND composed; a phone that requires `alerts` on `pending`; a new query
  name the Mac requires on `/v1/turns`; `KEEP_ALIVE_TIMEOUT_MS = 3_000`; a hand edit that reseals) and say which clause
  caught each, or that none did. A break nothing catches is either a §13 limit already named or a finding.
- **Measure the parent.** At `01a25b99` the gate does not exist; show that two of the ablation's plants (for example
  `POCKET_SCREEN_MAX_COLS = 1024` and the `CHOOSE_KEYS` plant) pass `npm run build` at the parent, which is the defect this
  phase closes.

---

## 13. What is NOT in this phase

- **No route added, no answer changed, no QR or hashed field moved, no phone code.** Nothing under `src/` or
  `ios/Tortie/` is edited; the contract baseline does not move.
- **No phone UI and no copy.** No CHANGELOG item, no semver, no native menu change, no build number.
- **No release cut.** The Mac tag, its order with build 8 (research 140 §7.2) and 333.7's steps are not this phase's; 333.7
  reads P4's line at the tag.
- **Not 333.12.** A Mac update that adds a route still shuts the door until Allow; whether routes are hashed one by one is
  333.12's research. This gate ALLOWS adding a route; R4 and 333.12 decide whether one may land.
- **No cross-field relations frozen (D14).** Unguarded for an old phone and a new Mac, by name: a write answer's
  reason-with-`refused` and sentence-unless-`done` (`Contract.swift:334-342`); a reply offer that `agrees(with:)` its
  options (a failure degrades to no button, `:399-411`, `:609-614`); a screen answer's `unchanged`/screen/absence and
  sentence rules (`:1314-1325`); a screen's cursor, line count and run widths (`:1259-1278`) and a page's (`:1412-1437`);
  the depth and space together (`:1246-1255`); the sessions answer's counts, order and echo (`SessionsScreen.swift`
  `SessionsDrawing`); the turns' rising indexes (`TurnPages`, `Contract.swift:1567-1653`); every answer's session id echo
  (`DoorClient.swift:235`, `:303`, `:336`). The frozen instances still exercise them for a NEW phone (§8.1 test 1).
- **No frozen copy of the launch decoder compiled into the tests.** It would be the only way to run the old phone's
  relations against a new Mac, but two decoders with one set of names cannot share a test target without renaming, and a
  renamed copy is no longer the launch decoder.
- **A whole number the Mac starts sending with a fraction** is caught only on a composed instance (A2); the TypeScript type
  says `number` either way.
- **The live screen and page composers are on no vector's path** (the fix round, from the verifier's nit). `composeScreen`
  and `composePage` in `src/main/screen/compose.ts` are what main runs for a live Terminal, but `screen-sample` and
  `scrollback-page` are built from the committed sample's runs (§7), so a value change inside them (the verifier planted
  `cells + 0.5`) passes A2, and A3 holds only the type, which does not move. The screen's own gates
  (`conformance:pocket` Z, `measure:p337`) are what read those composers; this phase does not.
- **A route that refuses inside `routes.<id>` itself** (the verifier's M9c, a refusal for `limit` above 10 inside
  `routes.turns`) is not driven by this gate: R5 drives main's read switch over a recording `routes`, and R2 drives the
  query readers. It is caught inside `npm run build` by `conformance:ios` rule j, because `vectors.mjs --check` then
  reads "the shipping composer answered nothing" for every turns answer and exits 1 (measured in the fix round: the gate
  alone PASSES that plant).
- **Adding an optional key to an answer `vectors.mjs` checks exactly** (`screen-unchanged`, the D12 answers) makes
  `vectors.mjs` refuse to regenerate until its own expectation is edited too: friction on an addition §3 allows, not a
  refusal by this gate.
- **A deliberate `--replace`** is a ruling, not something a gate can tell from a mistake. The flag makes it loud (the moved
  lines printed, the reason kept in `history`, obligation five), and nothing more.
- **No push payload** (D15), **no transport**: TLS versions, SNI, Content-Length framing, Funnel, the PROXY header, the
  door's key and the persistence of its pin are `conformance:pocket`'s and `conformance:ios` (t)'s, unchanged.
- **No retirement of a set and no second set.** `launch` is the only one; adding or retiring one is a later phase or his
  word.

---

## 14. What the spec step measured, how, and the numbers

| # | Command (from `/private/tmp/wt-p33311` unless named) | Exit | Result |
| --- | --- | --- | --- |
| M1 | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` at the start and the end | 0, 0 | `735939 1791483475` and `23166 1790702242`, both times |
| M2 | `df -h /`; `memory_pressure \| grep percentage` | 0 | 43 GB free; 61 percent free |
| M3 | `python3 -I /private/tmp/tortie-ops/p33311/spec/measure-decoders.py ios/Tortie/Door/Contract.swift` | 0 | 26 types; control flow in 8 (`PairAnswer`, `PocketEndOffer`, `PocketScreen`, `PocketScreenAnswer`, `PocketScreenStyle`, `PocketScrollbackAnswer`, `PocketSessionDetail`, `PocketWriteAnswer`); statements `decode` 92, `nullable` 40, `doorNumber` 14, `decodeIfPresent` 6, `nullableDoorNumber` 6, `screenColor` 5, `contains` 2; 162 coding keys, none unread |
| M4 | `grep -rn 'allKeys\|singleValueContainer\|unkeyedContainer\|nestedContainer' ios/Tortie --include='*.swift'` | 1 | no match: every decoder is keyed, unknown keys ignored |
| M5 | `grep -rn 'enum .*: String.*\(Codable\|Decodable\)' ios/Tortie --include='*.swift'` | 0 | the closed sets of D3, and `PushEnvironment` (a Keychain record's, on no route) |
| M6 | `/usr/bin/time -p node build/p316/vectors.mjs --check` | 0 | PASS, `real 0.52`; 46 signed requests (38 writes), 2 pins, 1 client certificate, 3 seals, 2 QR payloads, 4 `/pair` answers, 11 answers, 3 alerts |
| M7 | `node /private/tmp/tortie-ops/p33311/spec/measure-ts.mjs /private/tmp/wt-p33311` (and `… pairing`) | 0, 0 | one program over `pocket.ts`: 171 ms, 74 files, walk 11 ms, every answer's properties and optionality resolved, `PocketWriteReason` read as its 12 literals; with `pairing.ts`: 521 ms, 245 files |
| M8 | `python3` over `vectors.json`: each answer's keys | 0 | as §2.5; `session-*` carry `end`, `endConfirm`, `reply`, `screen`; `screen-sample` carries `depth` and `space` |
| M9 | `sed -n 877,1003p build/conformance-pocket.mjs` | 0 | R4: sorted `METHOD path` lines, sha256 `ea5930e0…`, `--write-route-pin` |
| M10 | `grep -c 'init(from decoder: Decoder)' ios/Tortie/Door/Contract.swift`; `find ios/Tortie -name '*.swift' \| wc -l`; `grep -rln 'init(from decoder' ios/Tortie` | 0 | 26; 47 app files; decoders in `Contract.swift` and `Alerts/Alerts.swift` (a Keychain record) only |
| M11 | `wc -c ios/TortieTests/Fixtures/vectors.json`; `shasum -a 256` of the six files the freeze reads | 0 | 118,978 bytes; `Contract.swift` `0562bd94…`, `DoorClient.swift` `9c67dc95…`, `Pairing.swift` `3fa834c6…`, `SessionsChoices.swift` `dbb3abda…`, `table.ts` `ee69c6ae…`, `vectors.json` `8fa33585…` |
| M12 | `grep -n '^export const\|^export function' src/main/pocket/door/limits.ts`; `grep -rn 'sendPocket(' src/main/pocket` | 0 | `PER_SOURCE_MAX` 4, `KEEP_ALIVE_TIMEOUT_MS` 5,000, `POCKET_PAIR_BODY_CAP_BYTES` 4 KiB, `POCKET_WRITE_BODY_CAPS`; the door sends 404 literals and the wire answer's `status` (`200 \| 404`) only |
| M13 | `grep -rln lexSwift build src` | 0 | `build/conformance-ios.mjs` alone |

---

## 15. Questions for him

None blocks the build. One default is recorded for a later round: **a frozen set is retired only by his word**, once no
phone of it can still run (TestFlight builds expire after 90 days; App Store builds do not), and the retiring commit lowers
`FROZEN_SETS_FLOOR` and names the set.

---

## §Attack — the spec step's own attack, and what it changed

The draft was attacked on the five shapes the task named and on how it could fail quietly. Each row: the attack, what the
draft did, and the revision now in the text above.

| # | Attack | The draft | Revision |
| --- | --- | --- | --- |
| T1 | **A key removed from the Mac's answer.** `ageNote` taken out of `PocketBlockedAnswer` and its composer, vectors regenerated | A2 red on the instance, A3 red on the type | held; the ablation plants it (A2 arm, A3 second arm) |
| T2 | **A key removed from a type no current answer carries** (`PocketHandoff.label`: `handoff` is null in every session today) | A2 cannot see it | A3 walks the TS type through the nullable `handoff` and catches it; `unarmed` lists the fields no instance proves |
| T3 | **A route dropped without leaving the table**: main's read switch loses `case 'turns'`, so the door answers 404 forever while R1 and R4 stay green | not covered | R5 added (D6): every frozen read route has an arm that returns `routes.<id>(` |
| T4 | **A type narrowed on the Mac's side by a WORD**: `'quota'` added to `PocketWriteReason`; no vector composes it | A2 alone would pass it | A3 compares every closed-word union to the frozen set; the ablation shows A2 green and A3 red on the same plant |
| T5 | **A type narrowed by a BOUND**: `POCKET_SCREEN_MAX_COLS = 1024`, `MAX_SCROLLBACK_LINES = 200_000`, `SCREEN_HOLD_MS = 20_000` | covered by A4 | held; three arms |
| T6 | **A limit lowered under an old phone**: `PER_SOURCE_MAX = 2` (a Terminal holds the poll, the keys and the side line, `DoorClient.swift:41-50`), `KEEP_ALIVE_TIMEOUT_MS` under the phone's 4 s reuse (a write on a closing line reads "no answer") | the draft froze only the body and keys caps | `macLimits` gains `PER_SOURCE_MAX`, `KEEP_ALIVE_TIMEOUT_MS`, `POCKET_PAIR_BODY_CAP_BYTES` (D5, R4, a third R4 arm, control C5) |
| T7 | **A status the phone does not read**: the door process answering 400 or 204 | A5 read `DoorAnswer` only, and the door process sends through `sendPocket(` with its own literals | A5 reads `DoorAnswer`, the wire answer's `status` and every `sendPocket(` call (M12) |
| T8 | **Refuse arms asserted forever**: a later phone that legitimately relaxes (makes a key optional) would fail its own test | the draft asserted them always | D10: refuse arms only while today's projection equals the frozen one (`P33311_PROOF`); accept arms always |
| T9 | **The proof never runs, silently**: a reader bug makes every projection "differ", so every refuse arm prints `skipped` forever | not covered | P0's consistency: byte-identical phone files must give an equal projection; `test-ios.mjs` asks it again before the runs; §12.2 requires `P33311_PROOF=launch` in this phase's run |
| T10 | **A frozen file edited by hand without the flag** | F1's seal | held; plus F3's internal checks, so a resealed file with a dangling arm or a wrong membership hash is red |
| T11 | **F3 tied to code that will change**: the draft required the sealed arms to EQUAL what today's generator makes, so improving the generator later would turn every old set red | a real defect | F3 now checks only that each arm RESOLVES in its own frozen vectors with a known op; `format` versions the vocabulary (§4.1) |
| T12 | **Coverage that forbids what §3 allows**: the draft's A1 required every frozen type to keep an instance, so a Mac that stops sending an optional `endConfirm` (allowed) would be red | a real contradiction | A1(b) only follows `required`, non-null keys; a type reached only through an optional or nullable key is printed, and A3 holds it |
| T13 | **A frozen set guessed from the Mac's composer** | D1: shapes from the Swift reader only | held; the formats and bounds rows are the one curated part, so each names its Swift source, its value is read from Swift, each format is proven by a refuse arm, and the verifier re-derives the six bound rows against `holdsTogether` (§12.3) |
| T14 | **The reader misses an idiom the phone already uses**: `PairAnswer` binds the word with `let` and narrows inside a two-word case with `if word == "pending"`; `PocketEndOffer` decodes inside an enum payload; `Alerts.swift` names its container `container` | the draft's rules covered only `switch try c.decode` and `c.` statements | §5.2 rules 2 to 4 widened; each idiom is a fixture (§5.6) |
| T15 | **Constants TypeScript will not fold** (`2 * 1024 * 1024` on the phone; `Object.freeze({ … } as const)` on the Mac), and a TS program that would pull half of `src/main` in through `routes.ts`, `watch.ts` and `bind.ts` | the draft named a program over five roots and "a const initializer the checker folds" | the checker program is `pocket.ts` and `pairing.ts` (measured 521 ms); everything else is read with the parser and the explicit fold rule of §6.1; an unreadable constant is red by name |
| T16 | **A test that silently drops out**: `DoorFrozenTests` deleted, its suite entry removed, rows not printed, the gate taken out of `build`, the rule-j freshness check removed, the frozen directory emptied, a clause looping over nothing | partly | F3's floor, F4's wiring, the row count from the sealed file, `suitesNotRun`, and §6.1's "a zero count where the set holds items is red" |
| T17 | **A deliberate `--replace` used to turn a red build green** | the draft relied on the commit body | `--replace` requires `--why`, keeps it in `history`, prints the moved lines; obligation five; §13 says the gate cannot tell a ruling from a mistake |
| T18 | **A new phone that adds a query name or a body key to an existing route**: an old Mac refuses it (`/v1/sessions` refuses an unknown name; every write body is read strictly, `writes.ts:276-371`) | not covered by the gate | `DoorFrozenTests` test 3: today's builders and body encoders must reproduce every frozen request byte for byte |
| T19 | **The scrollback page the vectors builder composes might not fit the request's own `wrap` of 120** (the sample is wider), so `scrollbackOf` answers null | not foreseen | §7 tells the builder the rows must be ones the shipping `scrollbackOf` accepts inside the ask, cut to `wrap`, never a hand-written answer |
| T20 | **The second A2 ablation** (a 13-character `revision`) would be refused by the shipping screen re-composer before the vectors were written, proving nothing | a bad arm | replaced by `othersOmitted` written as a string |

What survives the attack as a stated limit is in §13: cross-field relations, a whole number sent with a fraction, a
deliberate replace, and the transport.

---

## §As built — the integrator, 2026-10-08

Integrated in `/private/tmp/wt-p33311` over `01a25b99`, from the three builders' reports (gate, vectors, phone) and
then the battery. Load averages during the run swung between 30 and 448, with three other phases beside it; every time
below was taken under that load.

### What the integrator changed, and why

| File | Change | From |
| --- | --- | --- |
| `build/conformance-ios.mjs` | `lexSwift`'s 128 lines (its header comment and body, lines 490 to 617) deleted; `import { lexSwift } from './swift-lex.mjs';` after the `png-read.mjs` import; `export { lexSwift };` where the function was, under a four-line comment. Before the edit, `diff` of lines 490 to 617 against `build/swift-lex.mjs` lines 18 to 145 was empty (exit 0) | D17 |
| `package.json` | `"gate:onlyadd": "node build/assert-door-only-adds.mjs"` after `gate:contract`; `"ablation:p33311": "node build/p33311/ablation.mjs"` after `ablation:p343`; `node build/assert-door-only-adds.mjs &&` in `build` immediately after `node build/conformance-ios.mjs &&` (the spelling the F4b plant removes) | §6.1, §11 |
| `build/verification-checks.mjs` | `pure('gate:onlyadd')` after `pure('gate:contract')` and `pure('ablation:p33311')` after `pure('ablation:p343', NEEDS.vitest)`, each under a comment saying what it runs and what it does not | §11; F4 |
| `build/assert-hermetic-checks.mjs` | `RUNNER_CALLER_FLOOR` 51 → 53, with its account: the count read 52 at `01a25b99` (one caller had come in without the floor following it) and `build/assert-door-only-adds.mjs` is the fifty third | that constant's own rule: "the floor is raised in the commit that brings a caller in" |
| `build/assert-door-only-adds.mjs` | the wire file's `about` sentence says "Never edit it by hand" where it said "NEVER EDIT BY HAND" | **found by the integrator**: the first `--freeze launch` into the tree turned `conformance:ios` rule (f) RED, `ios/TortieTests/Fixtures/frozen/launch.wire.json:2 names NEVER`, because rule (f) refuses every token shaped like a NetworkExtension class (`/\bNE[A-Z][A-Za-z]\w*/`) in every JSON file under `ios/`. The builders froze only into their scratch, outside `ios/`, so none of them could see it. The comment above `aboutOf` now says why it is sentence case. The set was then deleted and frozen again |
| `ios/TortieTests/Fixtures/frozen/launch.wire.json`, `launch.vectors.json` | written by `node build/assert-door-only-adds.mjs --freeze launch`, never by hand | §9 |
| `CLAUDE.md` | §10's three edits (`gate:onlyadd` in the inside-build sentence and its own sentence after it; "The five obligations", the fifth added; one sentence on the `test:ios` row) and, as the task asked, ONE row in the path-triggered table beside `gate:contract`, naming the paths that move the gate, its cost and `ablation:p33311` | §10; the task ("write the CLAUDE.md row") |
| this file | this section | §11 |

Nothing else of the builders' work was edited. Their duplication was read for: `test-ios.mjs`'s `canonicalJson` and
`jsonPathsDiffer` sit beside `swift-wire.mjs`'s `canonical` and `differingPaths`, but each is under ten lines and
`test-ios.mjs` loads the reader dynamically so its self-test can hand it a stand-in, so they were left.

**No CHANGELOG item** (D13): a person never hits a gate. No semver, no menu change, no contract-baseline line.

### The frozen set

`froze launch: phone build 7, Mac 0.110.0, 11 routes, 35 types, 503 arms, 15 unarmed` (exit 0, 1.05 s wall, 616 ms
inside). `launch.wire.json` is 92,868 bytes, sha256 `90d4a64ef719036e0f585195a9040e727f0ae55dd6c42922dbb9a16e6ced6705`;
`launch.vectors.json` is 175,041 bytes, sha256 `dcbcf27c422ce7a93364a67155aea5c9685ec92153426f97e3f78fc67104bfcb`,
byte for byte `ios/TortieTests/Fixtures/vectors.json` (`cmp`, exit 0). Before the `about` fix the wire's sha256 was
`ef68aa0f…`, equal to the gate builder's scratch freeze, so two freezes in two places wrote the same bytes.

- `routeMembership` `ea5930e0…`, R4's own pin; 26 instances; 14 formats, 11 bounds, 10 Mac limits, 5 sends; statuses
  `[200, 404]`; `history` empty.
- The 503 arms: remove 148 refuse, kind 155 refuse, null 114 refuse, fraction 22 refuse and 10 accept, word 9 refuse and
  1 accept, format 13 refuse, add 1 refuse, older 4 accept, unknown 26 accept: 462 refuse, 41 accept.
- The 15 unarmed fields (no frozen instance carries a value): `PocketBlockedRow.machine`, `PocketEndOffer.title`,
  `PocketHandoff.kind`, `.label`, `.url`, `PocketReplyOffer.command`, `PocketScreen.dialog`, `PocketScreenStyle.bg`,
  `PocketSessionDetail.handoff`, `.lastAnswer`, `PocketSessionsAsked.agent`, `.machine`, `PocketSessionsGroup.folder`,
  `PocketTurn.absence`, `.notice`. A3 holds them by type.

### Every command, its exit code and its numbers

| Command (from `/private/tmp/wt-p33311`) | Exit | Result |
| --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at the start, around every command that started a shell, a Simulator or the app, and at the end | 0 | `735939 1791483475` and `23166 1790702242` every time |
| `df -h /`; `memory_pressure \| grep percentage`, before every heavy step | 0 | 24 to 33 GB free; 41 to 58 percent free |
| `node build/p316/vectors.mjs --check` | 0 | PASS, 0.36 s: 46 signed requests (38 writes), 2 pins, 1 client certificate, 3 seals, 2 QR payloads, 4 /pair answers, 20 answers to 10 routes (5 of them to writes), 3 alerts |
| `diff` of `lexSwift` in `conformance-ios.mjs` against `swift-lex.mjs` (the function, then the whole block with its comment) | 0, 0 | empty |
| `node build/assert-hermetic-checks.mjs` (gate:checks), after the classification and after the floor | 0, 0 | PASS: 264 check scripts classified; 53 tsxCli() callers against a floor of 51, then of 53 |
| `node build/assert-door-only-adds.mjs --freeze launch` (first) | 0 | as above; every clause ok, F4 5 checked, P4 EQUALS launch |
| `node build/conformance-ios.mjs` after that freeze | **1** | rule (f) red on `NEVER` in `launch.wire.json` (above) |
| `--freeze launch` again after the fix | 0 | `… 503 arms, 15 unarmed (616 ms)`, 1.05 s wall |
| `node build/conformance-ios.mjs` | 0 | PASS, 45 rules over 47 app files, 62 test files and 122 files under ios/, 3.04 s |
| `/usr/bin/time -p node build/assert-door-only-adds.mjs`, four runs | 0 ×4 | PASS, wall 0.89, 1.02, 1.06 and 1.07 s; inside 509 to 654 ms; inside `npm run build`, 1,519 ms at a load average near 150. The last line: `PASS: 1 frozen set (launch: phone build 7, Mac 0.110.0); 11 routes served, 46 requests replayed, 2 presentations opened, 26 instances over 12 routes conform, 10 Mac limits held, 15 fields unarmed; the phone's wire today EQUALS launch.` Clause counts: F1 1, F2 1, F3 574, F4 5, R1 11, R2 46, R3 2, R4 15, R5 11, R6 6, A1 32, A2 26, A3 379, A4 10, A5 6, P0 2, P1 12, P2 12, P3 12, P4 1 |
| `npm run -s ablation:p33311 -- --scratch /private/tmp/tortie-ops/p33311/integrator`, before the `about` fix | 0 | `ABLATION_P33311: 36/36 red, 5/5 controls green (91 s)`; M1 to M4 held |
| the same, over the final set | 0 | `ABLATION_P33311: 36/36 red, 5/5 controls green (86 s)`, 85.8 s wall; the unplanted clone PASS; M1 to M4 held; the clone removed |
| `npm run -s ablation:p316` (because `conformance-ios.mjs` changed) | 0 | `PASS: 392 of 392 arms red on the rule that owns them, every rule (a) to (z) and (aa) to (au) proved able to fail, the clone removed, the working tree unmoved`, 1,837 s at load averages of 55 to 448 |
| `node build/p316/test-ios.mjs --self-test` | 0 | 66 door checks and the frozen grader's 26 checks, 11.7 s |
| `node build/contract-inventory.mjs --check` (gate:contract) | 0 | the inventory matches `docs/audits/contract-baseline.txt` byte for byte, 1.95 s |
| `npm run typecheck` | 0 | 4.9 s; import boundaries 0 violations, no runtime cycles, shared types OK |
| `npm run build` | 0 | 64.4 s; `conformance:ios` PASS, then `gate:onlyadd` PASS, then `conformance:harnessprobes` PASS and `gate:contract` OK |
| `npm test` (HOME and ZDOTDIR under the integrator's scratch, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | 0 | 1,116 files passed and 2 skipped; 20,657 tests passed and 14 skipped; 105 s |
| `npm run -s conformance:pocket` | 0 | PASS: 127 rules, 18,025 checks, 11.07 s |
| `npm run -s conformance:pocket:hostile` | 0 | PASS in 18.71 s, 270 arms |
| `zsh /private/tmp/tortie-ops/lock.sh try p33311` | 0 | `electron.lock3`, released on the same command line (exit 0) |
| `node build/p316/test-ios.mjs` on iOS 26.3 (`P316_SCRATCH` and `P316_DERIVED_DATA=/private/tmp/tortie-ops/p33311/dd-integrator`) | 0 | 411 s. The reader read its 9 fixtures; "the phone's decoders read exactly launch: its refuse arms are asserted" (`P33311_PROOF=launch`). Debug: 653 tests, 0 failures, 0 skipped, **frozen set launch: 617 of 617 rows as sealed; arms 462 refused, 41 accepted, 0 skipped**. Release: 650 tests, 0 failures, 0 skipped, the same 617 of 617 rows. The Simulator shut down and deleted; 0 devices named `p316-` left by this run |
| `npm run package` | 0 | 181 s; the zip and DMG built; `release/` (831 MB) removed afterwards |
| `git diff 01a25b99 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt \| wc -c` | 0 | 0 |

**Not run, by the task's word**: `smoke:t1`, `smoke` and `smoke:t3`. Nothing here changes what the app launches: no file
under `src/` moved. The 18.3 floor of `test:ios` was not run (§12.2: not required, no phone code moves).

**Removed**: `/private/tmp/tortie-ops/p33311/dd-integrator`, `-release` and `-device` (894 MB together), the `test:ios`
scratch, every ablation clone, and the package output. The integrator launched no Electron, and no Simulator of this
run is left.

### For the landing

- `git diff 01a25b99 --stat`: `CLAUDE.md`, `build/assert-hermetic-checks.mjs`, `build/conformance-ios.mjs`,
  `build/p316/test-ios.mjs`, `build/p316/vectors.mjs`, `build/verification-checks.mjs`,
  `ios/TortieTests/DoorVectorTests.swift`, `ios/TortieTests/Fixtures/vectors.json` and `package.json` modified; new
  `build/assert-door-only-adds.mjs`, `build/swift-lex.mjs`, `build/p33311/` (this file, `swift-wire.mjs`, `ablation.mjs`,
  nine fixtures each with its expectation), `ios/TortieTests/DoorFrozenTests.swift` and
  `ios/TortieTests/Fixtures/frozen/launch.{wire,vectors}.json`.
- **Merges with 333.1 and 337.3, which land first.** `test-ios.mjs`'s suites union line is the one line 337.3 also
  edits, so it needs a hand merge there (the phone builder's note). `CLAUDE.md`'s `test:ios` row and its inside-build
  sentence may need the same. If either phase moved `vectors.json`, `node build/p316/vectors.mjs` and then
  `node build/assert-door-only-adds.mjs --freeze launch --replace --why "<sentence>"` refresh the set before the
  landing, as D16 says; if P4 reads "differs" at the landed head, that is the same step. If either brought in a
  `tsxCli()` caller, `RUNNER_CALLER_FLOOR` follows it.
- The subject is `test(pocket)` (D13).

### The fix round — the fixer, 2026-10-08

The verify answered `needs_work` with one major, one minor and one nit. The fix ran once, in this worktree, and touched
only the gate, its ablation, this file and the gate's CLAUDE.md row. Nothing under `src/` or `ios/` moved, and the frozen
set was not regenerated: `launch.wire.json` still hashes to `90d4a64e…` and `launch.vectors.json` to `dcbcf27c…`, the
integrator's bytes.

**Major — a newly required query name in main's read switch passed (R5).** The verifier added `|| query.get('v') ===
null` to the turns arm of `src/main/pocket/ipc.ts`'s read switch (M9b), the same to the session arm (M9d) and
`query.get('v') === null ? null :` to the blocked arm (M9e). Each would answer every launch phone's `/v1/turns`,
`/v1/session` or `/v1/blocked` (its main list) with a 404. The gate, `conformance:pocket` and the pocket vitest all passed,
because R5 read the switch as TEXT: it asked only that the arm return `routes.<id>(` and read every frozen name, and
never refused an extra condition. **R5 is now DRIVEN, and D6's "checked by its text" is superseded:**

- The `answer:` arrow is found by the parser as before, cut out of the file, transpiled in memory
  (`ts.transpileModule`, module none, ES2022) and closed over a `routes` the gate hands it (`callableReadSwitch`). This is
  the shape `conformance:pocket` already uses to make its tick table callable. The text is the judged checkout's own
  source, which the gate already runs by importing `routes.ts` and `writes.ts`.
- Every frozen READ request (7 at `launch`: `blocked`, `session`, `odd-id`, `turns-older`, `sessions`, `screen`,
  `scrollback`) goes through the SHIPPING `createPocketHandler` of `src/main/pocket/server.ts`. That handler is handed the
  SHIPPING `PocketRequestVerifier` over the frozen seeds at the request's own clock, as `ipc.ts` hands it, and its
  `answer` is that read switch over a recording `routes` (`recordingRoutes`), whose every member answers a fresh marker.
  The request must reach `routes.<id>` exactly once and no other member, and must be answered 200 with exactly the
  marker `routes.<id>` returned. Every `name=value` of the frozen query must also reach that call's arguments
  (`wordReaches`), whether the arm hands over the query whole, a string or a field of an object. So any condition the arm
  adds, whatever its shape (`query.get`, `query.has`, a value test, a renamed name), is red by the request's name. An arm
  that names anything beyond `routes`, `route`, `query` and `closing` throws when driven, and that is red with what it
  named, never skipped.
- `pair` is driven too: every frozen `/pair` answer (4 at `launch`) is handed to `server.ts`'s pair arm as the pairing
  owner's state, inside a window, and must leave 200 as an answer conforming to the frozen `PairAnswer` (A2's checker) in
  the same state. This replaces the text test that `server.ts` calls `pairBody(…)`.
- Removed: the text rule that an arm reading `query.get` must read every frozen name. The drive subsumes it, and the rule
  was over-strict: an arm that hands `routes.turns` the query whole would have read red.
- Kept: the text rules that a `case '<id>':` exists and returns `routes.<id>(`. They give the plainest sentence when an
  arm is deleted (ablation R5).
- R5 now counts 22 (11 routes, 7 read requests driven, 4 `/pair` answers driven), where it counted 11.

**Minor — a resealed edit to the arms passed (F3).** The seal is a sha256 anyone can recompute, and nothing re-derived
the arms. The verifier deleted all 462 refuse arms, resealed, and every clause stayed green (H4). `test:ios` would then
have asked for 41 arm rows instead of 503. **F3 now runs the freeze's own `generateArms` again** over the set's sealed
types, formats, routes and QR type and the instances of its vectors (which F2 holds byte for byte). It requires the
sealed `arms` back exactly, arm by arm (compared by `canonical`), and the same `unarmed` list. The finding names how
many arms are missing or changed and how many were not made, with the first five ids. `generateArms` is now part of
format 1: a later change to what it makes is a format 2, which keeps format 1's generator for the sets written with it
(the comment at the check says so). `build/p316/test-ios.mjs`'s `frozenRowsWanted` still takes the arm list from the
sealed file. It is left unedited, because 337.3 also edits that file and F3 now holds the sealed list to the generator
on every build that `test:ios` runs from.

**Nit — the live composers and vectors.mjs's friction.** §13 gains three bullets. The first: `composeScreen` and
`composePage` are on no vector's path, so a value change inside them (the verifier's M11) is not this gate's. The second:
a refusal inside `routes.<id>` itself (M9c) is held by `conformance:ios` rule j and not by this gate (measured below). The
third: an optional key added to an answer `vectors.mjs` checks exactly makes `vectors.mjs` refuse to regenerate until its
expectation is edited. That is friction, not a refusal by this gate. `vectors.mjs` itself is not changed.

**The ablation**, `build/p33311/ablation.mjs`, gains seven arms and one control. They are F3c (one refuse arm dropped and
resealed), F3d (every refuse arm dropped and resealed, the verifier's H4), R5b (M9b), R5c (M9e), R5d (M9d), R5e (the
turns arm reads `sid`, the rename the removed text rule used to catch) and R5f (`server.ts` sends an allowed phone's
`cert` as `certificate`). The control is C6: the blocked arm reads a query name no old phone sends
(`query.get('v') === 'later' ? null : …`), which must stay green, because R5 refuses a newly REQUIRED name and not a new
one. The header says six controls.

**CLAUDE.md**: the `gate:onlyadd` row says each read request is driven through `server.ts` into main's own read switch
and that the sealed arms are re-derived, and its count reads "43 arms and 6 controls".

#### Every command, its exit code and its numbers (the fix round)

Load averages ran from 227 to 433 throughout, with three other phases beside this one; every time below was taken under
that load.

| Command (from `/private/tmp/wt-p33311`) | Exit | Result |
| --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at the start, around `npm run build`, `npm test` and the single vitest file, and at the end | 0 | `735939 1791483475` and `23166 1790702242` every time |
| `df -h /`; `memory_pressure \| grep percentage`, before the ablation and the build | 0 | 20 to 22 GB free; 43 and 49 percent free |
| `node build/p33311/ablation.mjs --only F3b,F3c,F3d,R5,R5b,R5c,R5d,R5e,R5f,C6` (while building) | 0 | `9/9 red, 1/1 controls green (24 s)` |
| the gate over a clone with M9b and M9e planted | 1 | R5 FAIL, two findings: `request blocked: main's read switch reached no route for GET /v1/blocked, not routes.blocked once, so the door answers this old phone's request 404`, and the same for `turns-older`; every other clause ok |
| the gate over a clone whose wire kept only its 41 accept arms, resealed (H4) | 1 | F1 ok; F3 FAIL: `its 41 sealed arm(s) are not the 503 its own types, formats and instances make (462 missing or changed, first A0001, …; 0 not made)` |
| M9c in a clone (`if (asked > 10) return null;` after `readTurnRange` in `routes.turns`): `node build/p316/vectors.mjs --check`, then the gate | 1, 0 | vectors: `answer turns-…: the shipping composer answered nothing` for every turns answer, then `route turns: the vectors hold no answer`; the gate PASSES. Stated in §13: rule j inside `npm run build` holds it |
| `npm run -s ablation:p33311 -- --scratch /private/tmp/tortie-ops/p33311/fixer` | 0 | `ABLATION_P33311: 43/43 red, 6/6 controls green (68 s)`, 68.65 s wall; the unplanted clone PASS; M1 to M4 held; the clone removed |
| `node build/assert-door-only-adds.mjs`, eight runs | 0 ×8 | PASS, every clause ok; inside 551 to 2,461 ms, wall 0.96 to 5.08 s (the slow runs at load averages of 345 to 433); inside `npm run build` 581 ms. Counts: F3 575 (was 574, plus the regeneration), R5 22 (was 11), the rest as the integrator's. Last line unchanged: `… 11 routes served, 46 requests replayed, 2 presentations opened, 26 instances over 12 routes conform, 10 Mac limits held, 15 fields unarmed; the phone's wire today EQUALS launch.` |
| `node build/assert-door-only-adds.mjs --freeze launch --into <scratch>`; `cmp` of both files against the tree | 0, 0, 0 | `froze launch: … 503 arms, 15 unarmed (1093 ms)`; both files byte-identical to the frozen set in the tree, so F3's generator gives the sealed bytes back |
| `node build/p316/vectors.mjs --check` | 0 | PASS, 0.50 s, the integrator's counts |
| `node build/conformance-ios.mjs` | 0 | PASS, 45 rules over 47 app files, 62 test files and 122 files under ios/, 2.73 s |
| `node build/assert-hermetic-checks.mjs` | 0 | PASS: 264 check scripts classified; 53 `tsxCli()` callers against a floor of 53 (this round adds none) |
| `node build/contract-inventory.mjs --check` | 0 | matches `docs/audits/contract-baseline.txt` byte for byte, 1.05 s |
| `node build/p316/test-ios.mjs --self-test` | 0 | the frozen grader's 26 checks PASS, 11.55 s |
| `npm run -s typecheck` | 0 | 2.78 s; import boundaries 0 violations, no runtime cycles, shared types OK |
| `npm run -s build` | 0 | 38.98 s; `conformance:ios` PASS, `gate:onlyadd` PASS (581 ms), `conformance:harnessprobes` PASS, `gate:contract` OK |
| `npm test` (HOME and ZDOTDIR under the fixer's scratch, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | **1** | 1,115 files passed, 2 skipped, 1 failed; 20,656 tests passed, 14 skipped, 1 failed; 92 s. The one failure is `src/main/sessions/__tests__/p141-resume-in-place.test.ts`, "adopts the session back when the returned command names its own conversation". That test waits `settle(2_500)` of wall clock, and it ran at a load average near 300. This phase does not touch that file or anything under `src/` |
| that file alone, the same environment | 0 | 31 of 31 passed |
| `npm run -s conformance:pocket` | 0 | PASS: 127 rules, 18,025 checks, 12.32 s |
| `npm run -s conformance:pocket:hostile` | 0 | PASS in 18.27 s, 270 arms |
| `git diff 01a25b99 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt \| wc -c` | 0 | 0 |

**Not rerun, and why.** `ablation:p316` was not rerun, because this round does not touch `build/conformance-ios.mjs`.
`test:ios` was not rerun, because nothing it reads moved: the frozen files keep the integrator's sha256, and
`DoorFrozenTests.swift`, `build/p316/test-ios.mjs` and everything under `ios/` are untouched. It is the reverify's to
run. `npm run package` was not rerun, because the only build-time change is the gate, and `npm run build` ran it. The
smoke runs stay unrun, as the integrator recorded. No lock slot was taken, no Electron launched, no Simulator booted and
no `xcodebuild` run, so there is no DerivedData to remove. The ablation clones were removed by the script's `finally`, and
the fixer's own M9c clone by hand.

### The landing — rebased over 333.1, 342 and 337.3, 2026-10-09

Rebased from `01a25b99` onto `dd7c8934`. Four files conflicted, each resolved keeping both sides: `package.json`'s
`build` (342's `assert-docker-teardown.mjs` kept, `assert-door-only-adds.mjs` after `conformance-ios.mjs` as before);
`build/assert-hermetic-checks.mjs` (342 had raised `RUNNER_CALLER_FLOOR` to 52 and this phase to 53; the count reads 52
at `dd7c8934`, because the rule counts only top-level `build/*.mjs` and `build/p342/measure-p342.mjs` is not one, and 53
with `assert-door-only-adds.mjs`, so the floor is 53 with both sentences kept); `build/p316/test-ios.mjs`'s suites union
(`P3373_SUITES` and `P33311_SUITES` both); `CLAUDE.md` (342's `gate:docker` and this phase's `gate:onlyadd` in the
inside-build sentence, and on the `test:ios` row 333.1's `SiteLinkTests` sentence then this phase's). `conformance-ios.mjs`
merged by itself: main's rules (av) to (ay) are there, and its `lexSwift` block was byte-identical to `swift-lex.mjs`.

**The one thing the merge broke.** 333.1 made `PairingOffer.parse` decode a `Marker` (`v`, and `fp`, `dk`, `dx` as
optionals) from the QR before its `Wire`. The reader took the FIRST decode in `parse` as the QR's type, so it read the
QR as `Marker`, P4 read 41 paths different and P0 went red on the eight QR format rows. Re-freezing could not help (the
freeze refuses while P0 is red) and would have frozen the QR short. `swift-wire.mjs` now takes the LAST type `parse`
decodes as the QR's answer, and holds every type decoded before it to asking nothing more (`preReadAsksMore`: each of its
fields a field of the answer of the same kind, required there when required here, null refused there when refused
here), or P0 is red by name. Proved over a copy of `ios/Tortie`: a `Marker` reading a key `Wire` does not, and one
reading `fp` as an `Int`, were each red; one requiring `dk` stayed green. After it P4 reads **EQUALS launch**, so the set
was **not** re-frozen (§9: `--replace` only on "differs"); its files keep `90d4a64e…` and `dcbcf27c…`, and
`launch.vectors.json` is still byte for byte `vectors.json`. Build 9's `Pairing.swift` hash differs from the one the set
names, so `test:ios`'s consistency check is not asked of it; the projection is.
