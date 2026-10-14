# Phase 333.11.1 — "Land it, queue the gaps": the guardrail replays every way the launch phone asks, and a resealed Mac limit is caught — SPEC

Written by the spec step on 2026-10-13 in `/private/tmp/wt-p33311`, a detached worktree at origin/main `5f5efba2`
("docs(backlog): 0.111.2 published"). The phone at this head is build 10 (`CURRENT_PROJECT_VERSION = 10`,
`ios/Tortie.xcodeproj/project.pbxproj:417`) and the Mac is 0.111.2 (`package.json:4`). The frozen set `launch` was written
at `85f90247` (Phase 333.11) from build 7's sources, seal `28e18b14…`, `format: 1`. Every `file:line` here was read at
`5f5efba2` on this date.

**The spec step measured before it wrote** (§11 holds every command, exit code and number). It read the phone's request
builders by hand, wrote that reading down as a record, generated from it every request the launch phone can make, signed
each with the frozen phone's own seed, and had the SHIPPING gate replay all 158 of them through the shipping door (R2: 158
checked, R5: 96, green). It then planted V1 to V4 and G3 to G5 (and thirteen plants of its own) in a `cp -Rc` clone: every one
of the seven reads GREEN at the parent's gate, which is the defect; the replay set of §4.4 turns V1 to V4 and V9 to V12 red
with the shipping gate unchanged, and leaves V5 to V8 and Z0 green. It took no lock slot (no Simulator, no `xcodebuild`, no
Electron), started no agent and no model turn, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain
or his live Tortie profile, and `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737549 1791921744` and
`23166 1790702242` at its start and at its end.

**His word, 2026-10-08**, on Phase 333.11's second needs_work: **"Land it, queue the gaps"**. The entry is
`docs/BACKLOG.md` "## Phase 333.11.1"; it lists the seven plants (V1 to V4, G3 to G5), the two gaps, the mechanism, the
proof and what is not in the phase. 333.11's own spec, `build/p33311/SPEC.md`, is what this one widens, and every rule it
states that this file does not change still holds.

**The order of authority.** His word, then the backlog entry, then the main session's task text, then this file. The tree at
`5f5efba2` overrides any picture of it here. §Attack records what this file's own attack changed.

---

## 0. The hard rules, stated once

- **Nothing a person sees moves.** No file under `src/` or `ios/Tortie/` is edited; no route, answer, QR field, hashed field,
  copy, menu, phone code or build number. `git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt` is
  empty at the end. Semver none, no CHANGELOG item, no release.
- **Not 333.4's files.** Phase 333.4 is editing `build/simulator-run.mjs`, `build/p316/**` and the phone's UI tests in
  another worktree. This phase edits none of them, and needs none of them edited (D12). `ios/TortieTests/DoorFrozenTests.swift`
  is not edited either.
- Never commit, stage or stash. `/Users/gdc/gmux` is read only; every command starts `cd /private/tmp/wt-p33311 &&` (or a
  role's scratch); every heredoc delimiter is quoted. `git diff 5f5efba2` is exactly this phase's delta. Install nothing.
- Never `-L gmux`; never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started. Never read his
  keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` or his live Tortie profile. No model turn, no real
  Tailscale, DNS or APNs. No screenshot. **No Electron**: this phase launches none.
- **His shell history**: before and after every command that starts a shell, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; stop and report if either moves. A test that starts a shell runs with a
  scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset.
- **The lock has three slots**, shared with two other phases: `zsh /private/tmp/tortie-ops/lock.sh try p33311` prints the
  slot or exits 1 (retry every 60 s in a NEW command), and `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same
  command line. Every `test:ios` holds a slot. Simulators only through `build/simulator-run.mjs` (`test:ios`), never
  Simulator.app. Xcode derived data only under
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33311/<role>/dd*`
  (`P316_DERIVED_DATA`). `df -h /` before any build; under 8 GB free, wait and report.
- Scratch is `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33311/<role>/`.

---

## 1. The answer first

333.11 froze what the launch phone REQUIRES of the Mac's answers well, and froze what it SENDS thinly: one request per
route, and the Mac's own limits as the Mac stated them on the day. Its reverify found both thin places with seven plants
that every clause passed. This phase closes them without a new clause family.

1. **Every request the launch phone can make is frozen and replayed.** The reader gains a second half: it reads the phone's
   request builders in `ios/Tortie/Door/DoorClient.swift` (the five query targets and the four write bodies) into a
   REQUEST RECORD — per route, each query name or body key, whether the phone sends it always or only sometimes, whether it
   may be null, and the closed set its value is drawn from. The record is sealed into the frozen set (format 2) and is part
   of the projection, so P0 holds it to the phone's bytes and P4 reports it. From the sealed record and the frozen vectors
   the gate builds the CROSS PRODUCT of every way each route can be asked — every word of every closed set, a `Bool` both
   ways, every sometimes-sent name absent and present, a nullable key null and not, and a keys write with every key name —
   signs each as the frozen phone signs (its own seed, its own canonical text, its own body bytes, each proved first on the
   frozen requests), and R2 and R5 replay all of them through the shipping door. Measured: 156 ways over the ten signed
   routes, 44 already frozen requests, 112 generated, 158 replays with the 46 frozen ones; under 50 ms more than today.
2. **The Mac-side rows are held to the phone, not to the seal.** Where the phone's own Swift says the number, it is read
   from the Swift on every run (the ASKS: the keys write's 64 items and 1,024 text bytes, the page of 108 rows it asks for,
   the 4 s it keeps a line, the four connections it holds at once) and R4 holds the Mac to the larger of that and the
   sealed value. A4 requires every Mac-held bound to name its Mac constants, from the sealed set AND from the reader's own
   table. Where only the Mac knows the number (the four write body caps, the pair cap), `--replace` refuses a set that is
   lower, shorter or missing against the one it replaces, and **F1 compares the set with every committed copy of itself**
   through `git` (decided here, D9): a resealed hand edit since the last commit is red, and a Mac-side row lower than any
   committed copy's is red. It costs about 50 ms with `git` and 0.2 ms without (a printed note, never a silent pass).
3. **The ablation** gains V1 to V4 and G3 to G5 as red arms, ten arms of the spec's own, six controls, and two modes.

The re-freeze happens once, in the integrator: `--freeze launch --replace --why …` writes format 2, appends 333.11's seal to
`history`, and prints the lines that moved (153 under `/requests`, 30 under `asks`, §7). The phone's wire is otherwise
unchanged (P4 read EQUALS launch at `5f5efba2`), the frozen vectors do not move, and the phone's half (`DoorFrozenTests`)
needs no edit; `test:ios` runs on iOS 26.3 and 18.3 because the file the phone reads changes.

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **The record is read from the phone's request builders, by the same reader that reads its decoders**, never from the Mac's query readers and never from the vectors. The vectors' requests (which `DoorFrozenTests` proves the phone still writes byte for byte) are then CHECKED against the record (F3), so the reader and the phone's own output must agree before anything is replayed | the entry's mechanism 1; 333.11 D1 ("never guessed from the Mac's composer") |
| D2 | **The replay is the cross product per route**, not one change at a time: a Mac that refuses `show=active` only when `agent` is absent is a narrowing, and one-at-a-time misses it. Every dimension is one the phone's builders vary independently (§2.1); a value that is not a dimension (an id, a whole number, free text) is never invented: it is the frozen request's own bytes | measured §2.3; V3's red request is `show=active … agent absent` |
| D3 | **A generated request is signed as the frozen phone signs it**, never by the Mac's `canonicalRequestText`: the frozen phone's private seed (`keys.phoneSigningSeed` in the frozen vectors), its canonical template re-derived from the 46 frozen `canonical` texts, and its body bytes from a serializer proved on all 38 frozen write bodies. Ed25519 is deterministic, so re-signing every frozen request must reproduce its frozen signature byte for byte. Each proof that fails is R2 red by name | measured §2.3 (46 of 46 re-signed equal, 38 of 38 bodies round-trip) |
| D4 | **The ceiling is 1,024 replays per set**, measured, and a cross product past it is R2 red by name, never sampled. 1,024 replays cost about 160 ms over 46 (§2.3), so the 3 s budget holds with room | the entry ("caps it only by that measurement") |
| D5 | **The record is sealed and in the projection** (`projectionOf` gains `requests`). P0's same-bytes rule then refuses a resealed edit of the record while the phone's files are unchanged (plant P0d), and P4 reports a change in what the phone sends. `read` does not change: every file the record is read from (`DoorClient.swift`, `Contract.swift`, `SessionsChoices.swift`) is already in it | 333.11 §6.2 P0 |
| D6 | **Format 2**: format 1 plus `requests` and `asks`, with format 1's arm generator unchanged. `FORMATS_READ` becomes `[2]`: format 1 is retired by THIS ruled re-freeze of the only set that uses it (333.11 §4.1, "a format is retired only by a ruled re-freeze of every set that uses it"), so a format-1 file reads F1 red with that sentence | 333.11 SPEC §4.1 |
| D7 | **The phone's own numbers are ASKS**, a curated table in the reader naming the Swift constant and the Mac constant (as `BOUND_ROWS` is), whose values are read from the Swift on every run and sealed at the freeze. R4 holds each Mac constant to the larger of today's reading and every sealed value. Asks are NOT in the projection and NOT in `read`: their files (`ScreenKeys.swift`, `ScreenScrollback.swift`, `App/TortieApp.swift`) move in most phone phases, and naming them in `read` would switch off P0's and `test:ios`'s same-bytes guard for the decoders whenever they do. Nothing is lost: a resealed ask cannot lower a floor that is also read from the Swift | §2.4; `build/p316/test-ios.mjs:1496-1506` (the guard that would weaken) |
| D8 | **Mac-only rows**: the phone has no number for `POCKET_WRITE_BODY_CAPS.end`, `.choose`, `.say`, `.keys` or `POCKET_PAIR_BODY_CAP_BYTES`. Measured: no byte cap on a message anywhere in `Screens/Reply.swift` or `Screens/MessageStrip.swift`; the keys write's caps are on items and text bytes (asks), and its body bytes are the encoder's and the Mac's ids'; the presentation's size is set by `Pairing.swift`'s seal, and `PairingOffer.maxPayloadBytes` is the QR's, not the presentation's. These are held by `--replace` (D11) and by F1's committed copies (D9) | §2.4 |
| D9 | **F1 compares the set with its committed copies through `git`: yes.** (a) A set whose seal differs from the copy committed at HEAD must carry that copy's seal as the next entry of its append-only `history`, or it was edited and resealed by hand. (b) No Mac-side row may be lower, shorter or missing against ANY committed copy (`git log -- <file>`). Measured ~50 ms with full history (21 ms log, 14 ms per copy, 14 ms HEAD), 0.2 ms with no `git` (a note: "git is not on PATH: committed copies not compared"), 12.7 ms outside a repository (a note), and a depth-1 clone (CI's `actions/checkout`) sees only the graft, equal to HEAD (a note). It is the only check that holds the Mac-only rows against a reseal, and it closes the window between a hand edit and its commit for the decoder half too | the entry ("the spec step decides"); §2.5 |
| D10 | **A4**: every bound whose rule names the Mac (`mac<=phone`, `mac<phone*1000`, `equal`, `mac-in-phone`) must list at least one Mac constant in the sealed set; the constants checked are the sealed list UNION the reader's own `BOUND_ROWS` list for the same phone constant; the phone value is the SMALLER of the sealed and today's for `<=` and `<`, both for `equal`, the intersection for `mac-in-phone`. So emptying a sealed list (G4) is red twice, and a resealed phone value cannot loosen it | the entry ("only needs a non-empty Mac list") |
| D11 | **`--replace` refuses a set whose Mac-side rows are lower, shorter or missing** against the set it replaces: a `macLimits` row (by `mac`) missing or lower, a bound's Mac list (by `phone`) shorter, an `asks` row (by `phone`) missing or lower. Nothing is written and every refused row is printed. Lowering one is not a re-freeze: by his word it is a retirement of the set (333.11 §15), never this flag | the entry |
| D12 | **The phone's half does not move.** `DoorFrozenTests.swift`'s `FrozenWire` reads `format` as an `Int` and ignores unknown keys (`ios/TortieTests/DoorFrozenTests.swift:224-260`); `test-ios.mjs` computes its rows from the set's instances, arms and vectors requests (`frozenRowsWanted`, `build/p316/test-ios.mjs:1516-1536`), none of which move, and proves the set by `projection()`, which the reader widens for both sides alike (`:1473-1489`). A row for each generated request would need `test-ios.mjs` to grade it, and `build/p316/**` is 333.4's | §0; measured |
| D13 | **The arms**: V1 to V4 (R5) and G3 to G5 (R4, A4; F1 too) from the entry; the spec's own V9 to V12 (R2: the query readers and the write path see the variants too), G1 (F1, already caught), G6 (F1 alone: a Mac-only row resealed lower), P0c (an idiom the request reader does not know), P0d (a resealed record), F3e (a record that disagrees with the vectors) and X5 (a request-reader rule broken, refused by its fixtures); controls Z0, V5 to V8 and G2; modes M5 and M6. The reverify's own V5 to V8, G1 and G2 left with its scratch, so these are re-derived from the entry's words ("which 333.11 already catches or must leave green") | §5 |
| D14 | **Tier 2.** Invisible to a person; touches no tmux, manifest, restore or session; spawns nothing for a person (the gate's new spawn is `git log` and `git show`, read only, with `GIT_OPTIONAL_LOCKS=0`); holds no credential; sends nothing. The gates are the evidence; `test:ios` on two runtimes is its app run | CLAUDE.md "The tier sets the BUDGET" |
| D15 | **The re-freeze records the tree it read**: phone build 10 and Mac 0.111.2, where `launch` said 7 and 0.110.0. That is honest about the sources: since `85f90247` only `ios/Tortie/App/TortieApp.swift` moved under `ios/Tortie` (`ad317f86`, See a sample), no file the projection reads moved, and the kept lines read 3 at both. The `--why` sentence says the wire is unchanged; the history entry keeps 7 and 0.110.0 | §2.6, §7 |
| D16 | **No new clause family.** R2, R4, R5 and A4 widen; F1 gains the committed copies; F3 gains the record's own consistency (it is "the set holds together"); P0 reads the request builders as it reads decoders | the entry ("No new clause family") |

---

## 2. What the spec step measured in the tree

### 2.1 The request builders, read by hand

`ios/Tortie/Door/DoorClient.swift`, targets spelled once (`:354-405`), bodies (`:686-743`), the write switch (`:494-505`):

| Route | Builder | Name or key | Sent | Value, and where it comes from |
| --- | --- | --- | --- | --- |
| `GET /v1/blocked` | `static let blockedTarget = "/v1/blocked"` (`:357`) | none | — | — |
| `GET /v1/session` | `sessionTarget(_:)` (`:365-367`) | `id` | always | text, `queryValue(sessionId)` |
| `GET /v1/sessions` | `sessionsTarget(_:)` (`:392-399`), `var target = … + … + …` then two `if let` | `show`, `group`, `sort` | always | `queryValue(query.show.rawValue)` → `SessionsShow` {all, active, ended}; `SessionsGroupBy` {project, none}; `SessionsSortBy` {recent, name, oldest} (`Screens/SessionsChoices.swift:26-50`, the stored properties `:54-62`) |
| | | `agent`, `machine` | sometimes (`if let agent = query.agent`, `if let machine = query.machine`) | text, `queryValue(…)` |
| `GET /v1/turns` | `turnsTarget(_:limit:to:)` (`:401-405`) | `id`; `limit` | always | text; whole number `max(1, limit)` (every caller passes `TurnPages.pageSize`, 20, `Contract.swift:1569`) |
| | | `to` | sometimes (`if let to`) | whole number |
| `GET /v1/screen` | `screenTarget(_:since:)` (`:372-376`) | `id`; `since` | always; sometimes (`if let since`) | text; text |
| `GET /v1/scrollback` | `scrollbackTarget(…)` (`:384-386`), one expression | `id`, `from`, `count`, `depth`, `wrap`, `keep` | always | text; four whole numbers; `keep.rawValue` → `ScrollbackKeep` {top, bottom} (`Contract.swift:1350-1352`) |
| `POST /pair` | `present` (`:347-352`) | the sealed presentation | — | opaque: R3 opens it |
| `POST /v1/end` | `EndBody` (`:689-693`), synthesized | `batch`; `session`, `write` | always | `Bool` (End these sends `true`, `Screens/EndBar.swift:100`); text |
| `POST /v1/choose` | `ChooseBody` (`:700-706`) | `mark`, `marker`, `question`, `session`, `write` | always | text |
| `POST /v1/say` | `SayBody` (`:713-717`) | `session`, `text`, `write` | always | text |
| `POST /v1/keys` | `KeysBody` (`:726-743`), custom `encode(to:)` | `dialog` | always, NULL ALLOWED (`try c.encode(dialog, …)` of a `String?` writes `null`) | text |
| | | `keys` | always | `[KeyItem]`; `KeyItem` encodes `{"t": text}` or `{"k": ScreenKeyName.rawValue}` (`Contract.swift:1530-1544`), 35 names (`:1446-1481`) |
| | | `session`, `turn`, `write` | always | text |

`signedPost` sets `encoder.outputFormatting = [.sortedKeys]` (`:494`). The writes' targets carry no query (`:358-363`).

### 2.2 The request record — the contract between the reader and the gate

`readPhoneWire(root).requests` returns exactly this (canonical JSON sha256
`2610fa53ad798dd11ed401564273675c0da9c16e8ec8654cd44b481dd67a6ffc`, measured from the hand reading above): sorted by
`path` then `method`; `query` in the order the builder spells the names; `body.fields` sorted by key (the phone sorts); a
`oneOf` in the order of the enum's cases.

```json
[
  {"method":"POST","path":"/pair","query":[],"body":{"opaque":"presentation"}},
  {"method":"GET","path":"/v1/blocked","query":[],"body":null},
  {"method":"POST","path":"/v1/choose","query":[],"body":{"fields":[
    {"name":"mark","sent":"always","null":false,"value":"text"},{"name":"marker","sent":"always","null":false,"value":"text"},
    {"name":"question","sent":"always","null":false,"value":"text"},{"name":"session","sent":"always","null":false,"value":"text"},
    {"name":"write","sent":"always","null":false,"value":"text"}]}},
  {"method":"POST","path":"/v1/end","query":[],"body":{"fields":[
    {"name":"batch","sent":"always","null":false,"value":"bool"},{"name":"session","sent":"always","null":false,"value":"text"},
    {"name":"write","sent":"always","null":false,"value":"text"}]}},
  {"method":"POST","path":"/v1/keys","query":[],"body":{"fields":[
    {"name":"dialog","sent":"always","null":true,"value":"text"},
    {"name":"keys","sent":"always","null":false,"value":{"array":{"oneOf":[{"key":"t","value":"text"},{"key":"k","value":{"words":"ScreenKeyName"}}]}}},
    {"name":"session","sent":"always","null":false,"value":"text"},{"name":"turn","sent":"always","null":false,"value":"text"},
    {"name":"write","sent":"always","null":false,"value":"text"}]}},
  {"method":"POST","path":"/v1/say","query":[],"body":{"fields":[
    {"name":"session","sent":"always","null":false,"value":"text"},{"name":"text","sent":"always","null":false,"value":"text"},
    {"name":"write","sent":"always","null":false,"value":"text"}]}},
  {"method":"GET","path":"/v1/screen","query":[{"name":"id","sent":"always","value":"text"},{"name":"since","sent":"sometimes","value":"text"}],"body":null},
  {"method":"GET","path":"/v1/scrollback","query":[{"name":"id","sent":"always","value":"text"},{"name":"from","sent":"always","value":"int"},
    {"name":"count","sent":"always","value":"int"},{"name":"depth","sent":"always","value":"int"},{"name":"wrap","sent":"always","value":"int"},
    {"name":"keep","sent":"always","value":{"words":"ScrollbackKeep"}}],"body":null},
  {"method":"GET","path":"/v1/session","query":[{"name":"id","sent":"always","value":"text"}],"body":null},
  {"method":"GET","path":"/v1/sessions","query":[{"name":"show","sent":"always","value":{"words":"SessionsShow"}},
    {"name":"group","sent":"always","value":{"words":"SessionsGroupBy"}},{"name":"sort","sent":"always","value":{"words":"SessionsSortBy"}},
    {"name":"agent","sent":"sometimes","value":"text"},{"name":"machine","sent":"sometimes","value":"text"}],"body":null},
  {"method":"GET","path":"/v1/turns","query":[{"name":"id","sent":"always","value":"text"},{"name":"limit","sent":"always","value":"int"},
    {"name":"to","sent":"sometimes","value":"int"}],"body":null}
]
```

The vocabulary, closed: `sent` is `always` or `sometimes`; a query item is `{ name, sent, value }`; a body field is
`{ name, sent, null, value }`; `value` is `"text"`, `"int"`, `"bool"`, `{ "words": "<Swift String enum>" }`,
`{ "array": <value> }` or `{ "oneOf": [ { "key", "value" }, … ] }` (one key per alternative); `body` is `null` (a GET),
`{ "fields": [...] }`, or `{ "opaque": "presentation" }` (`/pair`, R3's). In the frozen file each entry also carries
`"route": "<id>"`, mapped from the door's table at the freeze as `routes` are; `projectionOf` drops `route`, because
today's reading is the phone's and has no ids.

`readPhoneWire(root).asks` returns exactly this (canonical sha256
`4913ec9f313ced2d5edcdd8cf5681ddad51f36d504f03ab6ab2b657e386a3333`), sorted by `phone`, `swift` the file the value was
read from:

```json
[
  {"phone":"DoorLine.freshFor","value":4,"mac":"KEEP_ALIVE_TIMEOUT_MS","macFile":"src/main/pocket/door/limits.ts","rule":"mac>phone*1000","swift":"ios/Tortie/Door/DoorClient.swift"},
  {"phone":"DoorLine.keptLines+1","value":4,"mac":"PER_SOURCE_MAX","macFile":"src/main/pocket/door/limits.ts","rule":"mac>=phone","swift":"ios/Tortie/App/TortieApp.swift"},
  {"phone":"ScreenKeySender.mostItems","value":64,"mac":"POCKET_KEYS_MAX_ITEMS","macFile":"src/shared/ipc/pocket.ts","rule":"mac>=phone","swift":"ios/Tortie/Screens/ScreenKeys.swift"},
  {"phone":"ScreenKeySender.mostTextBytes","value":1024,"mac":"POCKET_KEYS_MAX_TEXT_BYTES","macFile":"src/shared/ipc/pocket.ts","rule":"mac>=phone","swift":"ios/Tortie/Screens/ScreenKeys.swift"},
  {"phone":"ScrollbackLayout.pageRows+overlapRows","value":108,"mac":"POCKET_SCROLLBACK_MAX_COUNT","macFile":"src/shared/ipc/pocket.ts","rule":"mac>=phone","swift":"ios/Tortie/Screens/ScreenScrollback.swift"}
]
```

### 2.3 The replay set, counted and timed

The cross product of §4.4 over the record and the frozen vectors (46 requests: 7 reads, 1 on `/pair`, 38 writes):

| Route | Dimensions | Ways | Already frozen | Generated |
| --- | --- | --- | --- | --- |
| sessions | `show` 3 × `group` 2 × `sort` 3 × `agent` 2 × `machine` 2 | 72 | 1 | 71 |
| keys | the item list 36 (each of the 35 names alone, and the frozen text-and-`BSpace` list) × `dialog` 2 | 72 | 35 | 37 |
| turns, screen | `to`, `since` absent or present | 2 each | 1 each | 1 each |
| scrollback | `keep` 2 | 2 | 1 | 1 |
| end | `batch` 2 | 2 | 1 | 1 |
| blocked, session, choose, say | none | 1 each | 1 each (session: 2 requests, one way) | 0 |
| **all ten signed routes** | | **156** | **44** | **112** |

The replay set is the 46 frozen requests plus the 112 generated: **158**. Measured with the SHIPPING gate unchanged over an
extended copy of the frozen set (`--into`): `R2 … (158 checked)`, `R5 … (96 checked)`, PASS. Time, interleaved runs at a
load average near 600: 46 replays 535 to 694 ms, 158 replays 573 to 671 ms; at a load average near 50: 448 to 526 ms, 453
to 470 ms, and 1,024 replays (the generated ones copied with fresh nonces) 595 to 635 ms, so about 0.17 ms a replay. The
proofs behind the signing (§4.4) all held: 46 of 46 frozen canonical texts re-derived by the template, 46 of 46 signatures
reproduced by re-signing with the frozen seed, 38 of 38 frozen write bodies round-tripped by the serializer.

### 2.4 The phone's own numbers behind the Mac-side rows

| `macLimits` row | Frozen | The phone's own number | Becomes |
| --- | --- | --- | --- |
| `POCKET_KEYS_MAX_ITEMS` | 64 | `ScreenKeySender.mostItems = 64` (`Screens/ScreenKeys.swift:58`) | ask, `mac>=phone` |
| `POCKET_KEYS_MAX_TEXT_BYTES` | 1,024 | `ScreenKeySender.mostTextBytes = 1_024` (`:61`) | ask, `mac>=phone` |
| `POCKET_SCROLLBACK_MAX_COUNT` | 128 | a page asks `ScrollbackLayout.pageRows` 100 + `overlapRows` 8 = 108 rows (`Screens/ScreenScrollback.swift:232`, `:234`; the frozen scrollback request's `count=108`). Its 128 is also the answer bound `PocketScrollbackAnswer.mostRows` (A4, ≤), so it stays pinned at exactly 128 as 333.11 §2.4 said | ask, `mac>=phone` |
| `KEEP_ALIVE_TIMEOUT_MS` | 5,000 | `DoorLine.freshFor = 4` s (`Door/DoorClient.swift:1128`): the phone reuses a kept line under 4 s idle and closes it at 4 s, so the door must keep it LONGER | ask, `mac>phone*1000` |
| `PER_SOURCE_MAX` | 4 | `PairedScreenDoor` holds three `DoorLine(keeps: true)` (`App/TortieApp.swift:1141`, `:1142`, `:1144`), and a press is one more one-shot exchange beside them (`build/p3371/SPEC.md` D30: "everything at once with a press, four, which is the door's per-source cap") | ask, `mac>=phone`, the most kept lines one type holds, plus one |
| `POCKET_WRITE_BODY_CAPS.end`, `.choose` | 512 each | none: the bodies carry the Mac's own ids | Mac only (D8) |
| `POCKET_WRITE_BODY_CAPS.say` | 32,768 | none: no byte cap on a message in `Screens/Reply.swift` or `Screens/MessageStrip.swift` | Mac only |
| `POCKET_WRITE_BODY_CAPS.keys` | 16,384 | its items and text bytes are asks; its bytes are not a Swift number | Mac only |
| `POCKET_PAIR_BODY_CAP_BYTES` | 4,096 | none (`PairingOffer.maxPayloadBytes` is the QR's) | Mac only |

The reader reads each value with its own `readConstant` (all five measured: 64, 1,024, 100 and 8, 4) and counts the kept
lines (3 in `App/TortieApp.swift`; the one other `DoorLine(` in the app is `DoorLine(keeps: false)` inside `DoorLine.once`,
`Door/DoorClient.swift:1157`). Every value is the same at `85f90247` (TortieApp.swift read 3 there too).

### 2.5 The committed copies: what `git` costs, and without it

Measured with `spawnSync('git', ['-C', root, …])` and `GIT_OPTIONAL_LOCKS=0`, median of five:

| Where | `git log --format=%H -- ios/TortieTests/Fixtures/frozen/launch.wire.json` | `git show <c>:<file>` | Copies seen |
| --- | --- | --- | --- |
| the worktree (full history) | 21.4 ms | 13.6 ms | 1 (`85f90247`) |
| a `cp -Rc` clone of it (the ablation's), whose `.git` file points at the same worktree gitdir | 28.0 ms | 20.3 ms | 1; the gitdir's `index` mtime did not move |
| a `git clone --depth 1` (what `actions/checkout` makes in every workflow under `.github/workflows/`) | 13.5 ms | 12.1 ms | 1, the graft `5f5efba2`, equal to HEAD |
| `PATH=/nonexistent` (no `git`) | 0.2 ms, `ENOENT` | — | none: a note |
| not a repository | 12.7 ms, exit 128 | — | none: a note |

So the check costs about 50 ms on every build, nothing in an environment without `git`, and in CI's shallow checkout it
compares with HEAD alone; every local build (builders, integrator, landing) has the whole history. No gate inside
`npm run build` spawned `git` before; this one reads only (`log`, `show`, `rev-parse`) and writes nothing.

### 2.6 The plants at the parent

Each planted in a `cp -Rc` clone of this worktree, judged by the PARENT's gate (`node build/assert-door-only-adds.mjs
--root <clone> --json`), and, for the request arms, by the same unchanged gate over the replay set of §4.4 (`--into` an
extended copy of the frozen set), which is what this phase makes the gate do by itself:

| Plant | What it changes | Parent | Parent over the replay set |
| --- | --- | --- | --- |
| Z0 | nothing | GREEN | GREEN |
| **V1** | turns arm in `ipc.ts` refuses a query with no `to` | **GREEN** | RED R5 `variant:turns:1` |
| **V2** | screen arm refuses a query with no `since` | **GREEN** | RED R5 `variant:screen:1` |
| **V3** | sessions arm refuses a query with no `agent` | **GREEN** | RED R5 (`show=active&group=none&sort=name&machine=…`) |
| **V4** | sessions arm refuses `show=active` | **GREEN** | RED R5 |
| V5 | turns arm refuses a query with no `limit` (always sent) | GREEN | GREEN |
| V6 | sessions arm refuses a query missing `show`, `group` or `sort` (always sent) | GREEN | GREEN |
| V7 | sessions arm refuses `show=archived` (never sent) | GREEN | GREEN |
| V8 | scrollback arm refuses a query with no `keep` (always sent) | GREEN | GREEN |
| V9 | `readSessionsQuery` refuses `show=active` (`routes.ts`) | GREEN | RED R2 `the shipping readSessionsQuery refuses it (word)` |
| V10 | `readScreenQuery` refuses a query with no `since` | GREEN | RED R2 `(since)` |
| V11 | `parseEndBody` refuses `batch: true` (`writes.ts`) | GREEN | RED R2 `reached no verb, not exactly end` |
| V12 | `parseKeysBody` refuses a named key other than `BSpace` while a `dialog` mark is sent | GREEN | RED R2 `variant:keys:1` |
| G1 | `PER_SOURCE_MAX` 2 in the wire, NOT resealed; `limits.ts` 2 | RED F1 (seal) | — |
| G2 | `say: 65_536` in `limits.ts` | GREEN | — |
| **G3** | wire `PER_SOURCE_MAX` 2, resealed; `limits.ts` 2 | **GREEN** | — |
| **G4** | wire `PocketScreen.widest` Mac list `[]`, resealed; `POCKET_SCREEN_MAX_COLS = 1024` | **GREEN** | — |
| **G5** | wire `KEEP_ALIVE_TIMEOUT_MS` row removed, resealed; constant `3_000` | **GREEN** | — |
| G6 | wire `POCKET_WRITE_BODY_CAPS.say` 16,384, resealed; `say: 16_384` | GREEN | — |
| P0c | `if let to { target.append("&to=\(to)") }` in `turnsTarget` | GREEN | — |

The seven of the entry all read green at the parent: confirmed. Every planted file was restored and checked by sha256.

---

## 3. The reader — `build/p33311/swift-wire.mjs` (builder **reader**)

Plain node still (imports `node:crypto`, `node:fs`, `node:path` and the lexer only), because `build/p316/test-ios.mjs`
imports it with no tsx. Every new statement it does not understand is an UNREAD item `{ file, line, why }`, which P0 turns
red by name, exactly as for decoders.

### 3.1 Tokens carry their holes

`tokenize` gives a `str` token `holes: [<code text>, …]`, each `src.text.slice(h.start, h.end)` of the lexer's `holes`
(`build/swift-lex.mjs` already returns them; it is not edited). A hole's code is tokenized by the same `tokenize` over a
source made of that text (a helper `holeTokens(text)`).

### 3.2 The target builders (`readTargetBuilder(mod, owner, name, unread)`)

For every target `readRoutes` used (a `signedGet`'s `Self.<x>Target`, `pairTarget`, and the write targets), in
`DoorClient`:

- **`static let <x> = "<path>"`**: `query: []`. A `?` in it is unread.
- **`static func <x>(<params>) -> String { … }`**, parameters read as `[label] name: Type[?]`, whose body is EXACTLY one of:
  1. one string expression (`"…"` with holes, optionally `"…" + "…"` across lines) as an implicit return; or
  2. `var <t> = <string expression>`, then zero or more `if let <n> { <t> += <string expression> }` or
     `if let <n> = <ref> { <t> += <string expression> }`, then `return <t>`.
  Anything else in the body (a `switch`, a loop, a ternary, `<t>.append(`, a second variable, any other `if`) is unread at
  its line.
- **The string**: the static text of the strings in order, a hole standing where each sat. The path is the text before
  `?`; after it, `&`-separated `name=<one hole>` pairs, every name a literal and every value EXACTLY one hole. A literal
  value, an empty name or a value with text around its hole is unread.
- **A hole** is one of: `queryValue(<ref>)` with `<ref>` a `String` → `"text"`; `queryValue(<ref>.rawValue)` or
  `<ref>.rawValue` with `<ref>` of a raw `String` enum `E` → `{ "words": "E" }`; `<ref>` of `Int` → `"int"`;
  `max(<integer literal>, <ref>)` with `<ref>` an `Int` → `"int"`. `queryValue` must be `DoorClient`'s own static func.
  Anything else is unread.
- **A ref** is a parameter, an `if let` binding (its type the optional's wrapped type: the parameter's, or the stored
  property's for `= <param>.<prop>`), or `<param>.<prop>` where the parameter's type is a struct read with
  `scanMembers` (`SessionsQuery`'s `var show: SessionsShow`, `var agent: String?`). Anything else is unread.
- **Sent**: a pair in the initial string is `always`; a pair inside an `if let` is `sometimes`. EVERY `sent` the reader
  writes, a query name's and a body key's alike (§3.3), goes through ONE line, which the ablation's X5 plants, spelled
  exactly:
  `const sentIn = (conditional) => (conditional ? 'sometimes' : 'always');`

### 3.3 The write bodies (`readBodyType(mod, qual, unread)`)

- `signedPost`'s `switch route { case .<verb>(let …): body = try encoder.encode(<Type>(…)) … }` maps each verb to a body
  type; `WriteRoute.target`'s `case .<verb>: DoorClient.<x>Target` maps the verb to the path `readRoutes` already reads.
  A case of another shape is unread.
- **A synthesized `Encodable`** (a struct whose parts declare no `encode(to:)`): its stored properties in order, the wire
  key the `CodingKeys` raw value when one is declared, else the name; `T?` is `sometimes` (the synthesized encoder omits a
  nil), `null: false`.
- **A custom `func encode(to encoder: Encoder) throws`** whose body is `var <c> = encoder.container(keyedBy:
  CodingKeys.self)` and then only `try <c>.encode(<prop>, forKey: .<key>)` (`always`; `null: true` when `<prop>` is
  `T?`) or `try <c>.encodeIfPresent(<prop>, forKey: .<key>)` (`sometimes`); or, for an enum, a `switch self` whose every
  case is `case .<case>(let <x>): try <c>.encode(<x>[.rawValue], forKey: .<key>)`, read as `{ "oneOf": [...] }` in case
  order. Anything else (a `try?`, a second statement in a case, a computed expression) is unread.
- **A value's kind** from its Swift type: `String` → `"text"`, `Int` → `"int"`, `Bool` → `"bool"`, a raw `String` enum
  (or `<x>.rawValue` of one) → `{ "words": … }`, `[T]` → `{ "array": kind(T) }`, a type with a custom encoder → its record.
  Any other type is unread.
- Fields sorted by wire key (the phone sorts, `:494`). `/pair`'s body is `{ "opaque": "presentation" }`.

### 3.4 The asks (`ASK_ROWS`, exported, curated like `BOUND_ROWS`)

```js
export const ASK_ROWS = Object.freeze([
  { phone: 'DoorLine.freshFor', sum: ['DoorLine.freshFor'], mac: 'KEEP_ALIVE_TIMEOUT_MS', macFile: 'src/main/pocket/door/limits.ts', rule: 'mac>phone*1000' },
  { phone: 'DoorLine.keptLines+1', kept: 'DoorLine', plus: 1, mac: 'PER_SOURCE_MAX', macFile: 'src/main/pocket/door/limits.ts', rule: 'mac>=phone' },
  { phone: 'ScreenKeySender.mostItems', sum: ['ScreenKeySender.mostItems'], mac: 'POCKET_KEYS_MAX_ITEMS', macFile: 'src/shared/ipc/pocket.ts', rule: 'mac>=phone' },
  { phone: 'ScreenKeySender.mostTextBytes', sum: ['ScreenKeySender.mostTextBytes'], mac: 'POCKET_KEYS_MAX_TEXT_BYTES', macFile: 'src/shared/ipc/pocket.ts', rule: 'mac>=phone' },
  { phone: 'ScrollbackLayout.pageRows+overlapRows', sum: ['ScrollbackLayout.pageRows', 'ScrollbackLayout.overlapRows'], mac: 'POCKET_SCROLLBACK_MAX_COUNT', macFile: 'src/shared/ipc/pocket.ts', rule: 'mac>=phone' }
]);
```

- A `sum` row's value is the sum of `readConstant` over its constants; any error is unread.
- The `kept` row (`keptLinesByType(mod, unread)`): every `DoorLine(` in the app is either `DoorLine(keeps: true)` or
  `DoorLine(keeps: false)` as a literal argument, or unread; a `DoorLine(keeps: true)` is counted against the innermost
  type declaration that holds it; the row's value is the largest count any one type holds, plus `plus`. A count of zero
  is unread ("no type holds a kept line, so the connections the phone opens at once cannot be read").
- `swift` is the path of the file the value was read from (for `kept`, the file of the type with the most).
- **The asks are read after the projection's reading and `mod.used` is put back to what it was before them**, so `read`
  names exactly the files the projection was read from (D7).

### 3.5 What `readPhoneWire` returns, the projection, `read`

- `readPhoneWire(root)` returns everything it returns today plus `requests` (§2.2, every route `readRoutes` returns, in
  that order) and `asks` (§2.2). A route `readRoutes` returns with no record, or a record for no route, is unread.
- A `{ "words": E }` whose `E` is no `SEND_ROWS` phone, and a `SEND_ROWS` row no record field uses, are each unread (the
  gate's F3 asks the same of the sealed set).
- `projectionOf(wire)` gains `requests: (wire.requests ?? []).map(({ method, path, query, body }) => ({ method, path,
  query, body }))`, sorted by `path` then `method`. `asks` is NOT in it (D7). `leafLines` and `differingPaths` need no
  change.
- `read` is unchanged at this head: the record is read from `DoorClient.swift`, `Contract.swift` and
  `SessionsChoices.swift`, all already in it.

### 3.6 Its own proof: three new fixtures

`proveReader` gains, for a fixture whose expect names `requests`, the request reader's own run: `targets` (`{ "<Owner>.<name>":
{ path, query } }`), `bodies` (`{ "<Type>": <body record> }`), `kept` (`{ "<Type>": <count> }`); and its unread lines join
the decoder's in `unread`. The new fixtures (`build/p33311/fixtures/`):

- `requests-targets.swift.txt` / `.expect.json`: a static target; a one-expression builder with `queryValue`, `.rawValue`
  and a whole number; a `var` builder continued with `+` across lines and two `if let` (one `= query.agent`, one bare), with
  `max(1, limit)`; a struct of query words.
- `requests-bodies.swift.txt` / `.expect.json`: a synthesized body of `String`, `Bool`, `Int`, a raw enum and a `T?`
  (`sometimes`); a custom encoder writing a `String?` as `null` (`always`, `null: true`); an enum item encoder of two
  cases; two types holding two and three `DoorLine(keeps: true)` and one `DoorLine(keeps: false)`.
- `requests-unread.swift.txt` / `.expect.json`, one unread line each: `target.append(…)`; `if since != nil { … }`; a
  literal query value (`&keep=top`); a hole calling an unknown function; a `switch` in a builder; `try? c.encode(…)`; an
  `encode` of a computed expression; `DoorLine(keeps: flag)`.

The 333.11 fixtures keep passing unchanged.

---

## 4. The gate — `build/assert-door-only-adds.mjs` (builder **gate**)

### 4.1 Format 2

`FORMATS_READ = [2]`. A format-1 set is F1 red: "format 1 was retired by Phase 333.11.1's ruled re-freeze; re-freeze with
--freeze <label> --replace --why". The `--replace` path still reads a format-1 file as `previous` (seal, history,
`macLimits`, bounds). `buildWire` writes `format: 2` and, after `sends`, `requests` (today's record, each with its `route`
id from the table row of the same method and path; a record with no row is a freeze problem) and `asks`. `generateArms` is
unchanged (format 2 keeps format 1's generator, D6). The header comment and `CLAUSES` say what each clause now asks:

- F1 `every frozen wire parses, its format is read here, its seal holds, and against its committed copies it is neither edited by hand nor lower on the Mac side`
- F3 `at least N frozen set(s), each holding together, its request record agreeing with its vectors`
- R2 `every request the frozen phone can make replays through the shipping door`
- R4 `the Mac's limits are at least the frozen ones and the phone's own, and every word the phone sends is still read`
- R5 `main still answers every request the frozen phone can make on a read route`
- A4 `the Mac's caps stay inside the frozen and today's phone bounds, and every Mac-held bound names its constants`

R5's comment that claimed coverage of "a newly required name, a refused value" (the reverify's nit) is rewritten to say
it drives every request of §4.4.

### 4.2 F1: the committed copies (D9)

For each set whose file lies under `ROOT` (a set under `--into` elsewhere, or an untracked one, gets a note):

- `git` is spawned as `spawnSync('git', ['-C', ROOT, …], { encoding: 'utf8', timeout: 10_000, maxBuffer: 64 MiB, env })`,
  `env` being `process.env` with `GIT_OPTIONAL_LOCKS=0` and `GIT_TERMINAL_PROMPT=0` and WITHOUT `GIT_DIR`,
  `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_COMMON_DIR`, `GIT_OBJECT_DIRECTORY` and `GIT_ALTERNATE_OBJECT_DIRECTORIES`
  (a build run from a git hook inherits them). `ENOENT`, a non-zero exit, a timeout, or `rev-parse --show-prefix` printing
  anything (ROOT is not the top level) is a NOTE on F1 naming what was not compared, never red and never silent.
  `rev-parse --is-shallow-repository` printing `true` adds the note "a shallow clone: only the copies after its graft".
- **(a) No hand edit since the commit.** `git show HEAD:<rel>`; when it exists and its seal differs from the working
  set's, the working set's `history` must begin with the HEAD copy's `history` entry for entry and hold, at the next
  index, `seal` equal to the HEAD copy's seal. Otherwise red: "`<label>` differs from the copy committed at HEAD
  (`<seal8>`) and its history does not continue that copy's: it was edited and resealed by hand, not replaced with
  --freeze --replace --why".
- **(b) Never lower on the Mac side than any committed copy.** For every commit of `git log --format=%H -- <rel>`, its
  copy (`git show <c>:<rel>`; one that is not JSON is a note) is compared with the working set by `macSideLosses(copy,
  set)` (§4.8): every finding is red, naming the commit.
- Counted: one per copy compared. Measured cost §2.5.

### 4.3 F3: the record holds together

Added to F3, for each set: `requests` and `asks` are arrays; every frozen route has exactly one record (by method and
path) and every record names a frozen route; every `{ "words": E }` names a `sends` row and every `sends` row is used;
every query word is RFC 3986 unreserved bytes (`A-Z a-z 0-9 - . _ ~`, so the phone's `queryValue` leaves it as it is);
**every frozen vectors request on a recorded route conforms to its record** (names in the record's order, every `always`
name present, no other name, a word inside its set, a `bool` a boolean, `null` only where allowed, every item one of the
`oneOf` shapes), the `/pair` request excepted (opaque); every dimension can be replayed (§4.4: a base exists on the route,
a `sometimes` name or a nullable key has a frozen non-null value to send); every ask row is well formed (`phone`, a finite
`value` ≥ 0, `mac`, `macFile`, `rule` one of `mac>=phone` and `mac>phone*1000`, unique `phone`).

### 4.4 The replay set (R2, R5): every request the frozen phone can make

`replaysOf(set)`, computed once per set, deterministic, from the SEALED record and the FROZEN vectors only (never today's
reading: the launch phone is the one frozen):

1. **The proofs first**, each failure R2 red by name and no request replayed for that set: (i) every frozen `canonical`
   shares one first line `lead`, and `[lead, method.toUpperCase(), target, sha256(body), timestamp, nonce,
   identity.binding].join('\n')` equals every frozen `canonical`; (ii) the frozen phone's key is
   `createPrivateKey({ key: <PKCS8 prefix 302e020100300506032b657004220420> ‖ keys.phoneSigningSeed, format: 'der', type:
   'pkcs8' })`, and `sign(null, canonical, key)` as base64url equals every frozen `signature`; (iii) the serializer —
   object keys sorted, strings by `JSON.stringify` with every `/` written `\/`, arrays and literals as JSON — writes every
   frozen write body back byte for byte.
2. **Dimensions**, per record: a query item or body field is a dimension when its value is a word set (every word, from
   the set's own `sends` row, in that order), `bool` (`false`, `true`), `sometimes` (absent, then the present form), `null:
   true` (`null`, then the first non-null value any frozen request on the route sends), or an `array` whose `oneOf` has a
   word alternative (every distinct item list the frozen requests on the route send, by serializer bytes, in vectors order,
   then a one-item list `[{ <key>: w }]` for every word `w` not already a distinct list). Everything else takes the base's
   value as it is.
3. **The base**: the first frozen request (vectors order) on the route whose query holds every name of the record (GET)
   or whose body holds every `always` key (POST).
4. **Points**: the cross product of the dimensions, in record order. A frozen request OCCUPIES the point its own values
   name (for a `sometimes` text, present or absent; for a nullable key, null or not). Every unoccupied point is one
   generated request, indexed by its position in the product: `name` `variant:<route>:<index>`; GET target
   `<path>?<name>=<value>&…` over the present names in record order (a word as it is, any other value the base's raw,
   still-encoded bytes); POST body the base's parsed body with the point's values, written by the serializer; `timestamp`,
   `id` and the write id the base's; `nonce` `sha256("p33311.1|<route>|<index>")`'s first 32 hex; `canonical` by (i);
   `signature` by (ii); and, so R2 can read them back, `asked` for sessions (the three words and `agent`/`machine` as
   `URLSearchParams` reads them, `null` when absent) and `page` for scrollback (`id`, the four numbers, `keep`).
5. **The ceiling**: `REPLAY_CEILING = 1_024` replays per set, frozen and generated together. Over it, R2 is red: "the
   cross product of `<label>` is N requests, over the ceiling of 1,024 measured to keep the gate inside its 3 s budget
   (build/p33311/SPEC-1.md §2.3): raise it with a measurement, never sample".

At this head: 112 generated, 158 replayed (§2.3).

### 4.5 R2 and R5 over it

- **R2** loops over `replaysOf(set)` where it looped over `v.requests`, unchanged otherwise: the canonical text, the
  shipping route match, the URL parse and `id`, the shipping verifier at the request's own clock, the shipping query
  reader with its read-back (`asked` and `page` now present on every sessions and scrollback replay, `since` and `to` read
  back as before), and a write through a fresh shipping `createPocketWriteHandler` reaching exactly its verb with the
  body's fields. A finding names the request (`variant:sessions:2`) and its target.
- **R5** drives every READ replay of the route through `server.ts` into main's own read switch, as it drives the frozen
  ones: it must reach `routes.<id>` once, be answered 200 with what that answered, and hand on every word of its query.
- The PASS line: `N requests replayed (F frozen, G more ways the frozen phone asks)`. The `--json` summary gains
  `replays: { frozen, generated }` and `git: { copies, notes }`.

### 4.6 R4: the phone's own numbers

After the `macLimits` and `sends` loops: the asks of today's reading (`today.asks`) and of every sealed set, joined by
`phone`, each held at the LARGEST value any of them names. For each: `macConstant(macFile, mac)`; `mac>=phone` requires
`x >= value`, `mac>phone*1000` requires `x > value * 1000`. Red sentences name both sides and the Swift file:
"`PER_SOURCE_MAX` is 2, below the 4 connections the phone opens at once (`DoorLine.keptLines+1`,
ios/Tortie/App/TortieApp.swift)"; "`KEEP_ALIVE_TIMEOUT_MS` is 3000 ms, not more than the 4 s the phone keeps a line
(`DoorLine.freshFor`, ios/Tortie/Door/DoorClient.swift): the door would close a line the phone still means to reuse". A
sealed ask whose phone constant today's reader no longer names is still applied at its sealed value.

### 4.7 A4: every Mac-held bound names its constants (D10)

For each sealed bound whose rule is `mac<=phone`, `mac<phone*1000`, `equal` or `mac-in-phone`: an empty `mac` is red
("`PocketScreen.widest`'s Mac list is empty in the sealed set: nothing holds a Mac constant to this bound"); the constants
checked are the sealed list ∪ the reader's `BOUND_ROWS` list for the same `phone`; the phone value is min(sealed, today)
for `<=` and `<`, both for `equal`, and the intersection for `mac-in-phone`. `instance<=phone` rows keep their empty list.

### 4.8 `--replace` refuses a lower Mac (D11)

One shared function, `macSideLosses(previous, next)`, used by F1 (b) and by `--replace`, answering a finding per:

- a `previous.macLimits` row whose `mac` `next` lacks ("missing") or holds lower ("lower");
- a `previous.bounds` row with a non-empty `mac` whose `phone` `next` lacks, or whose `next` list is not a superset
  ("shorter");
- a `previous.asks` row whose `phone` `next` lacks or holds lower (a format-1 copy has no asks: nothing to compare).

In the freeze path, after `buildWire` and before any clause or write: when `previous` exists and `macSideLosses(previous,
built)` finds anything, print `[gate:onlyadd] FAIL: --replace would lower what the Mac holds for the phone in <label>:`, one
line per finding, `nothing was written`, and exit 1.

### 4.9 The freeze print

`--replace` already prints the moved projection lines and `macLimits` lines; it prints `asks` lines the same way
(`asks/<n>/…`). Everything else in §9 of 333.11's spec holds.

---

## 5. The ablation — `build/p33311/ablation.mjs` (builder **gate**)

### 5.1 The new arms, each planted in the clone as 333.11's are

`ipc.ts` is `src/main/pocket/ipc.ts`; `WIRE` is `ios/TortieTests/Fixtures/frozen/launch.wire.json`, edited as JSON and,
where it says so, resealed with the existing `reseal`. Every `find` below matched exactly once at `5f5efba2`.

| Id | Clause (and also red) | Plant |
| --- | --- | --- |
| V1 | R5 | `ipc.ts`: `return id === null\n              ? null\n              : await routes.turns(` → `return id === null \|\| query.get('to') === null\n              ? null\n              : await routes.turns(` |
| V2 | R5 | `ipc.ts`: `return routes.screen(query, closing);` → `return query.get('since') === null ? null : routes.screen(query, closing);` |
| V3 | R5 | `ipc.ts`: `return routes.sessions(query);` → `return query.get('agent') === null ? null : routes.sessions(query);` |
| V4 | R5 | `ipc.ts`: `return routes.sessions(query);` → `return query.get('show') === 'active' ? null : routes.sessions(query);` |
| V9 | R2 | `src/main/pocket/routes.ts`: `  const show = closedWord(query.get('show'), POCKET_SESSIONS_SHOW, POCKET_SESSIONS_DEFAULT.show);` → `  const show = query.get('show') === 'active' ? undefined : closedWord(query.get('show'), POCKET_SESSIONS_SHOW, POCKET_SESSIONS_DEFAULT.show);` |
| V10 | R2 | `routes.ts`: `  const since = query.get('since');\n  if (since !== null && !isLowerHexOf` → `  const since = query.get('since');\n  if (since === null) return { ok: false, reason: 'since' };\n  if (since !== null && !isLowerHexOf` |
| V11 | R2 | `src/main/pocket/writes.ts`: `typeof batch !== 'boolean') return { ok: false, write };` → `typeof batch !== 'boolean' \|\| batch) return { ok: false, write };` |
| V12 | R2 | `writes.ts`: after `  if (keys.length > 1 && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };` add `\n  if (dialog !== null && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };` |
| G1 | F1 | WIRE: `macLimits` `PER_SOURCE_MAX` value 2, NOT resealed; `src/main/pocket/door/limits.ts`: `export const PER_SOURCE_MAX = 4;` → `= 2;` |
| G3 | R4 (F1) | WIRE: `PER_SOURCE_MAX` value 2, resealed; `limits.ts` as G1 |
| G4 | A4 (F1) | WIRE: the `PocketScreen.widest` bound's `mac` `[]`, resealed; `src/shared/ipc/pocket.ts`: `export const POCKET_SCREEN_MAX_COLS = 512;` → `= 1024;` |
| G5 | R4 (F1) | WIRE: the `KEEP_ALIVE_TIMEOUT_MS` row removed from `macLimits`, resealed; `limits.ts`: `export const KEEP_ALIVE_TIMEOUT_MS = 5_000;` → `= 3_000;` |
| G6 | F1 | WIRE: `POCKET_WRITE_BODY_CAPS.say` value 16384, resealed; `limits.ts`: `say: 32_768` → `say: 16_384` (no phone number exists for it: F1's committed copy alone holds it) |
| P0c | P0 | `ios/Tortie/Door/DoorClient.swift`: `if let to { target += "&to=\(to)" }` → `if let to { target.append("&to=\(to)") }` |
| P0d | P0 | WIRE: the `turns` record's `to` item `sent` `"always"`, resealed (the phone's bytes did not move, so its reading must equal the sealed one) |
| F3e | F3 | WIRE: the `sessions` record loses its `machine` item, resealed (the frozen `sessions` request sends `machine`) |
| X5 | reader | `build/p33311/swift-wire.mjs`: `const sentIn = (conditional) => (conditional ? 'sometimes' : 'always');` → `const sentIn = (conditional) => (conditional ? 'always' : 'always');` (`reader: true`: the clone's own gate must refuse on `requests-targets`) |

**Controls, which must read GREEN** (adding stays allowed, and the replay reaches no further than the phone):

| Id | Plant |
| --- | --- |
| Z0 | nothing (`edits: []`) |
| V5 | `ipc.ts`: `return id === null\n              ? null\n              : await routes.turns(` → `return id === null \|\| query.get('limit') === null\n              ? null\n              : await routes.turns(` (the phone always sends `limit`) |
| V6 | `ipc.ts`: `return routes.sessions(query);` → `return query.get('show') === null \|\| query.get('group') === null \|\| query.get('sort') === null ? null : routes.sessions(query);` |
| V7 | `ipc.ts`: `return routes.sessions(query);` → `return query.get('show') === 'archived' ? null : routes.sessions(query);` |
| V8 | `ipc.ts`: `return routes.scrollback(query, closing);` → `return query.get('keep') === null ? null : routes.scrollback(query, closing);` |
| G2 | `limits.ts`: `say: 32_768` → `say: 65_536` |

### 5.2 The harness

- An arm may name `alsoRed: [<clause>]`; it reads red only when its clause AND every `alsoRed` clause are red (G3, G4,
  G5: F1). This proves the phone-derived floor and the committed copy each hold the plant on their own.
- `edits: []` plants nothing and restores nothing (Z0).
- **`git` is required.** The clone is a `cp -Rc` of the worktree, so its `.git` file reaches the same history (measured
  §2.5). With no `git`, G6 and the `alsoRed` halves read MISS and the run fails, never passes.
- **Modes**, run after the arms as M1 to M4 are:
  - **M5** `--replace` refuses a LOWER Mac row: freeze `launch` into a fresh `p33311-freeze-c`; plant `say: 16_384` in
    the clone's `limits.ts`; `--freeze launch --into <c> --replace --why "ablation: lower"` must exit 1, print
    `POCKET_WRITE_BODY_CAPS.say` and `nothing was written`, and leave `<c>/launch.wire.json` at its sha256; restore.
  - **M6** `--replace` refuses MISSING and SHORTER rows: freeze into a fresh `p33311-freeze-d`; add to its file a
    `macLimits` row `{ "mac": "P33311_ONLY_THEN", "file": "src/main/pocket/door/limits.ts", "value": 1, "rule":
    "now>=frozen" }` and `P33311_TOO` to the widest bound's `mac`, resealed; `--replace --why "ablation: missing"` must exit
    1 naming both and write nothing.
- The last line becomes `ABLATION_P33311: <red>/60 red, <green>/12 controls green` at this head (43 + 17 arms, 6 + 6
  controls), modes `held` M1 to M6.

---

## 6. CLAUDE.md (builder **gate**)

- The `gate:onlyadd` row of "The path-triggered gates": its paths gain `ios/Tortie/Screens/ScreenKeys.swift`,
  `ios/Tortie/Screens/ScreenScrollback.swift` and `ios/Tortie/App/TortieApp.swift` (the asks); its cost becomes "~1 s,
  inside `npm run build`, spawns the pinned tsx once and `git` read only (log, show; with no `git` it says so and decides
  on the rest)"; its proof gains one sentence: "Since Phase 333.11.1 it replays every request the launch phone can make
  (the cross product of its request builders' closed words, sometimes-sent names, nullable keys and key names, read from
  the Swift and sealed, signed with the frozen phone's own seed), holds the Mac's limits to the phone's own numbers read
  from the Swift, requires every Mac-held bound to name its constants, and compares the set with every committed copy of
  itself, so a Mac-side row resealed lower is red"; and the arm count becomes "60 arms and 12 controls" (the integrator
  writes the measured numbers).
- Obligation 5 gains: "`--replace` refuses a set whose Mac-side rows (its limits, a bound's Mac constants, the phone's
  asks) are lower, shorter or missing; lowering one is a retirement of that set by his word, never a re-freeze."

---

## 7. The re-freeze (the integrator, once)

After both builders report, the gate over the unchanged `launch` reads F1 red (format 1 retired), F3 red (no record, no
asks) and P0 red (the same phone bytes now read with a request record the set lacks), P4 DIFFERS at `/requests`, and nothing
else; the integrator confirms exactly that, then:

```
cd /private/tmp/wt-p33311 && node build/assert-door-only-adds.mjs --freeze launch --replace --why "Phase 333.11.1: format 2 adds the request record (every way the launch phone asks) and its asks (the numbers its requests need of the Mac); the wire it reads and sends is otherwise unchanged, P4 read EQUALS launch before"
```

Expected: exit 0; the moved lines are the 153 `+ /requests/…` lines (the record of §2.2) and the 30 lines of `asks`,
and no `-` line; `launch.vectors.json` written byte-identical (its sha256 `dcbcf27c…` is today's `vectors.json`); `history`
gains `{ seal: 28e18b14…, phoneBuild: "7", macVersion: "0.110.0", why }`; `phoneBuild` reads 10 and `macVersion`
0.111.2 (D15); the arms and `unarmed` are the same as before. Then `npm run -s gate:onlyadd` must PASS with P4 EQUALS
launch. The commit body names the moved lines by section (the record's canonical sha256 `2610fa53…` and the asks'
`4913ec9f…`) and why, as obligation 5 asks.

---

## 8. Builders, disjoint files

| Builder | Owns (creates or edits) | Must not touch |
| --- | --- | --- |
| **reader** | `build/p33311/swift-wire.mjs`; NEW `build/p33311/fixtures/requests-targets.swift.txt`, `requests-targets.expect.json`, `requests-bodies.swift.txt`, `requests-bodies.expect.json`, `requests-unread.swift.txt`, `requests-unread.expect.json` | everything else; `build/swift-lex.mjs` (not needed) |
| **gate** | `build/assert-door-only-adds.mjs`, `build/p33311/ablation.mjs`, `CLAUDE.md` (§6) | everything else |
| **integrator** | `ios/TortieTests/Fixtures/frozen/launch.wire.json` (by §7's command only, never by hand), this file's `§As built` | `src/**`, `ios/Tortie/**`, `ios/TortieTests/**` otherwise, `build/p316/**`, `build/simulator-run.mjs`, `package.json`, `build/verification-checks.mjs`, `build/conformance-ios.mjs`, `build/swift-lex.mjs`, `build/p33311/SPEC.md`, `docs/**`, `CHANGELOG.md`, `docs/audits/contract-baseline.txt` |

The gate builder develops against the contract of §2.2: before the reader lands it can write a scratch format-2 set
(today's `launch.wire.json` with `format: 2`, §2.2's `requests` with route ids and `asks`, one `history` entry, resealed)
under its scratch and judge it with `--into`; P0 and P4 read the difference until the reader is in, and nothing else
should. The two builders share the worktree and edit no file in common.

---

## 9. The proof, run rather than read

### 9.1 Each builder, before it reports

- **reader**: `node -e` over `readPhoneWire('/private/tmp/wt-p33311')` printing the sha256 of `canonical(requests)` and of
  `canonical(asks)`, which must be `2610fa53…` and `4913ec9f…`, `unread` empty and `Object.keys(read)` unchanged; every
  fixture proved (`proveReader` problems empty, 12 files); each new fixture shown to fail when the rule it proves is
  broken (at least the X5 line); `node build/assert-door-only-adds.mjs` (333.11's gate, until the gate builder's lands) red on P0 alone, with P4 DIFFERS at
  `/requests`, until the re-freeze.
- **gate**: over a scratch format-2 set: R2 `158 checked`, 112 generated; each proof of §4.4 shown red on a broken copy of
  the frozen vectors in its scratch (a changed signature, a changed canonical, a body with a space); F1's notes with
  `PATH` lacking `git`; the gate's time against 333.11's on the same machine, interleaved; `node --check` of both files.

### 9.2 The integrator's battery

`df -h /`; the history `stat`; §7's re-freeze; `npm run typecheck`; `npm run build` (the gate inside it, `gate:contract`
last and its baseline unmoved); `npm run -s gate:onlyadd` alone, with its time; the whole vitest under a scratch `HOME`;
`npm run -s ablation:p33311` (every one of the 60 arms red on its clause and every `alsoRed`, the 12 controls green, M1 to
M6 held); `npm run -s conformance:pocket`; `npm run -s conformance:ios` (the frozen file is under `ios/`; rule f reads its
JSON); `npm run -s gate:contract`; `npm run -s gate:checks`; `node build/p316/test-ios.mjs --self-test`; and
`git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt` empty.

### 9.3 `test:ios`, under the lock

`npm run test:ios` on iOS 26.3 and `P316_RUNTIME=18.3 npm run test:ios`, each holding a slot and with
`P316_DERIVED_DATA` under the role's scratch: `DoorFrozenTests` named in xcodebuild's suite lines, every frozen row as
sealed (the same rows as at `85f90247`, since the instances, arms and vectors did not move), `P33311_PROOF=launch` (the
reader's projection, now with the record, equals the re-frozen set's), every refuse arm refusing, and the run green, in
Debug and Release.

### 9.4 The verifier's independent methods (Tier 2: at least one the builders did not use)

- **Re-derive the record by hand** for at least two routes (sessions and keys) from `DoorClient.swift`, `SessionsChoices.swift`
  and `Contract.swift`, and compare with the sealed `requests`; count the cross product of those two routes by hand
  (72 and 72) and compare with the gate's `replays`.
- **Attack with plants of its own** taken from the phone's request builders and not listed in §5 (examples: a Mac that
  refuses `BSpace` alone in a keys write; a sessions arm that refuses `group=project` only with `sort=name`; a scrollback
  reader that refuses `keep=top`; a turns reader that needs `to` when `limit` is 20; a hand edit that reseals the record
  after a phone file moved), and say which clause caught each or that none did.
- **Measure the parent**: V1 to V4 and G3 to G5 pass the gate at `5f5efba2` (§2.6), red at HEAD.

---

## 10. What is NOT in this phase

- No change to the phone app, the door, any route, answer, QR field or hashed field; no build number, copy or menu; no
  CHANGELOG item; no release.
- **Not 333.12** (a Mac update that adds a route asks every paired phone to press Allow again); 318.1 still waits for it.
- **No new clause family**; the rule itself does not change: adding stays allowed, and no control C1 to C6 turns red.
- **No phone half for the generated requests.** `DoorFrozenTests` proves the phone still writes the 46 frozen requests
  byte for byte; that it would write each of the 112 generated ones is the reader's reading of its builders, proved on
  fixtures and cross-checked against those 46 by F3. A row per generated request needs `build/p316/test-ios.mjs`, which is
  333.4's (D12).
- **Free-text and whole-number values are replayed only as the frozen requests spell them.** A Mac that narrows an id's
  grammar or a number's range is caught only when a frozen value exercises it (the frozen `odd-id` session request and
  the `studio-mac` machine id do). The record names those values `text` and `int`; it does not enumerate them.
- **Dimensions are independent.** The replay assumes what the builders show, that the phone combines its words freely. A
  later Mac rule that couples two values the phone's own UI never combines would read red here, and that is a ruling, not
  a pass.
- **An old Mac with a new phone, for requests.** A new phone that newly sends a name or a word the launch Mac refuses is
  reported by P4 ("DIFFERS … /requests/…") and is not red; making it red is a P-side widening for a later phase.
- **The connections count is D30's design, read from the code**: the most kept lines one type holds, plus one one-shot
  exchange. A later phone that runs two one-shots beside its kept lines is not counted until the `+ 1` is re-measured.
- **In a shallow clone** (CI's) F1 compares with HEAD's copy alone and says so; every local build compares every copy.
- **Lowering a Mac-side row on purpose** has no flag: by D11 it is a retirement of the set by his word.
- No change to `build/verification-checks.mjs`: `gate:onlyadd` and `ablation:p33311` stay `pure`, because `git` is
  optional to the gate (a note) and present wherever the ablation runs.
- **The window before a record is committed (added by the fix round, the reverify's W16).** F1 (b) holds the
  request record, `sends` and `routes` against every committed copy, so no way the frozen phone asks can be taken out
  and resealed once a copy with a record is in history. Until this phase lands, the only committed copy (`85f90247`)
  is format 1 and holds no record, so nothing compares a hand-resealed record with history. After it lands, F1 (a)
  still accepts a hand edit that appends the HEAD copy's seal to `history`, so the guard in that case is F1 (b) alone.
  P0's same-bytes rule holds the record only while every phone file in `read` is unchanged. The request half of F1 (b)
  is proved through `--replace` (mode M7), which calls the same function.

---

## 11. Every command the spec step ran

From `/private/tmp/wt-p33311` unless named. `$S` is the spec role's scratch.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| S1 | `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at the start, before every shell-starting step, and at the end | 0 | `737549 1791921744` and `23166 1790702242` every time |
| S2 | `df -h /`; `memory_pressure \| grep percentage` | 0 | 64 GB free at the start, 46 GB later; 38 percent free |
| S3 | `npm run -s gate:onlyadd` | 0 | PASS in 541 ms; 46 requests replayed, 10 Mac limits, P4 EQUALS launch |
| S4 | `git log` over the frozen files and over `ios/` since `85f90247`; `git show --stat ad317f86` | 0 | the set is from `85f90247` only; under `ios/Tortie` only `App/TortieApp.swift` moved since (See a sample) |
| S5 | `node $S/consts.mjs .` (the reader over today's phone) | 0 | `mostItems` 64, `mostTextBytes` 1024, `freshFor` 4, `pageRows` 100, `overlapRows` 8, `pageSize` 20; word sets 3, 2, 3, 2, 35; `DoorLine(keeps: true)` 3 in TortieApp.swift, `keeps:` 1 more in DoorClient.swift (`false`); `unread` 0 |
| S6 | `node $S/git-cost.mjs .` and over the clone and a `git clone --depth 1 --no-checkout` (2.3 s, removed after) | 0 | §2.5 |
| S7 | `node $S/gen-variants.mjs . $S/frozen-x` (a first, byte-deduplicated generator) and the shipping gate `--into $S/frozen-x` ×3 | 0 | 191 replays, PASS, 576 to 674 ms |
| S8 | `node $S/gen-design.mjs . $S/frozen-d` (§4.4's algorithm) | 0 | 46 frozen, 46 re-signed equal, 38 bodies round-trip, 112 generated, 158 replayed, 156 ways (§2.3) |
| S9 | the shipping gate, interleaved six times over the frozen set and `--into $S/frozen-d`; then four times over 46, 158 and 1,024 (`$S/scale.mjs`) | 0 | §2.3 |
| S10 | `/bin/cp -Rc . $S/clone` | 0 | 6.3 s |
| S11 | `node $S/plants.mjs . $S/clone $S/frozen-x` then over `$S/frozen-d`, and `$S/plants-v12.mjs` | 0 | §2.6; every file restored by sha256 |
| S12 | `node $S/record.mjs .`; `node $S/asks.mjs .` | 0 | the record's 153 projection lines, sha256 `2610fa53…`; the asks' 30, `4913ec9f…` |
| S13 | `shasum -a 256 ios/TortieTests/Fixtures/vectors.json ios/TortieTests/Fixtures/frozen/launch.vectors.json` | 0 | both `dcbcf27c…`: the re-freeze writes the same vectors |

---

## §Attack — the spec step's own attack, and what it changed

| Attack | What the draft did | Now |
| --- | --- | --- |
| A1 "Generate the variants from today's reading, it is simpler" | the first draft replayed today's record | the SEALED record: the launch phone's requests do not change when today's phone does (§4.4) |
| A2 "Sign the variants with the Mac's `canonicalRequestText`" | it did; the verifier then checks the Mac against itself | the frozen phone's template, key and bytes, each proved on the 46 frozen requests first (D3) |
| A3 "One change at a time is enough" | one-factor variants, 11 | the cross product: V3's first red request combines two dimensions (D2) |
| A4 "Variants with the base's write id duplicate the frozen keys requests" | the byte-deduplicated generator made 145 | points occupied by a frozen request are skipped: 112 (§2.3) |
| A5 "Put the asks' files in `read`, every file the reading used" | it did | `TortieApp.swift` moves in most phone phases and would switch off P0's and test:ios's same-bytes guard; asks stay outside the projection and are floored by today's reading instead (D7) |
| A6 "A forger reseals the record weaker" | not held | P0's same-bytes rule (plant P0d) while the phone's files are unchanged, and F1 (a) before any commit |
| A7 "A forger lowers a Mac-only cap and reseals" | `--replace` alone, which a hand edit never runs | F1 (b) against every committed copy (G6) |
| A8 "F1 makes `npm run build` fail where `git` is odd" | red on any `git` error | a note on every environmental failure; red only on a finding (D9) |
| A9 "A git hook runs the build with `GIT_DIR` set" | not considered | `GIT_DIR` and its kin removed from the child's environment (§4.2) |
| A10 "A factory hides the kept lines and the floor falls to 1" | count only | a `DoorLine(` of any other shape is unread, a count of 0 is unread, and the sealed 4 floors it anyway (§3.4) |
| A11 "The phone half must prove each variant" | proposed new `DoorFrozenTests` rows | `test-ios.mjs` refuses rows the set does not name and is 333.4's; stated as a limit (§10) |

---

## §As built (the integrator)

Written by the integrator on 2026-10-13 in `/private/tmp/wt-p33311`, at `5f5efba2` with both builders' work in the tree.
Nothing was committed, staged or stashed. `/Users/gdc/gmux` was only read. No Electron, model turn, real Tailscale, DNS or
APNs. The two `test:ios` runs each held one lock slot.

### What was built, and the files

| File | Who | What |
| --- | --- | --- |
| `build/p33311/swift-wire.mjs` | reader | §3: holes on string tokens and `holeTokens`; `readTargetBuilder`; `readWriteBodies`, `readBodyType` and verbs mapped to paths through `WriteRoute.target`; `ASK_ROWS` and `keptLinesByType`; `readPhoneWire` returns `requests` and `asks`; `projectionOf` gains `requests` without `route`; `proveReader` reads `targets`, `bodies`, `kept` and `writes`. The one `sentIn` line X5 plants appears exactly once |
| `build/p33311/fixtures/requests-{targets,bodies,unread}.{swift.txt,expect.json}` | reader | §3.6. The unread fixture holds 55 lines it must refuse |
| `build/assert-door-only-adds.mjs` | gate | §4: format 2, F1 against committed copies, F3's record half, `replaysOf` with its three proofs and `REPLAY_CEILING = 1_024`, R2 and R5 over every replay, R4 asks, A4 Mac lists, a shared `macSideLosses` and the `--replace` refusal |
| `build/p33311/ablation.mjs` | gate | §5: the arms, controls, `alsoRed`, `edits: []`, a reader arm's `fixture`, and modes M5 and M6 |
| `CLAUDE.md` | gate, then the integrator | §6. The integrator changed two phrases in the `gate:onlyadd` row: `git` read only now says "(rev-parse, log, show" because the gate also runs `rev-parse`, and the controls are described as "12 controls that add or narrow only what the launch phone never sends", because V5 to V8 and Z0 add nothing |
| `ios/TortieTests/Fixtures/frozen/launch.wire.json` | integrator, through §7's command only | format 2, re-frozen once (below) |
| this file's §As built | integrator | |

`git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt | wc -l` prints **0**. `launch.vectors.json` did not move.

### Where the tree differs from this file, and why

1. **P0 read GREEN before the re-freeze, not red as §7 expected.** The sealed `read` named `ios/Tortie/Door/Pairing.swift`
   at `3fa834c6…`. That is the file's bytes at `f90ff8cc`. The tree at `85f90247` and at `5f5efba2` holds `f2ed8963…`,
   which `700f54ed` wrote. The integrator re-derived this with `git show <c>:ios/Tortie/Door/Pairing.swift | shasum`
   at `f90ff8cc`, `85f90247` and `700f54ed`. So since 333.11 landed, P0's same-bytes rule has been off for `launch`
   (that rule only applies when every phone file in `read` is byte-identical), and the same was true of test-ios.mjs's
   guard. The re-freeze recomputes `read`, and in `read` only the `Pairing.swift` hash moved, so the rule is on again.
   Arm P0d reading red after the re-freeze proves it is on. Both builders found this independently.
2. **The re-freeze moved 184 lines, not 183**: the 153 `+ /requests/…` lines and 30 `+ asks/…` lines §7 named, plus one
   `- /requests = []`. That line comes from the format-1 projection: `projectionOf` writes `requests: []` when a set
   holds no record. There is no other `-` line.
3. **66 arms, not 60.** The gate builder added six arms so that every new red condition is seen red at least once:
   - F1h: a history that does not continue the committed copy's.
   - F1v: a retired format.
   - F3f: a malformed ask.
   - R2s: a frozen signature the seed does not reproduce.
   - R2c: a cross product past the ceiling, 1,383 replays.
   - A4d: a resealed phone value that today's phone still bounds.

   The controls stay at 12.
4. **Variant indices put "absent" and "null" first**, as §4.4 orders them. So V1's red request is `variant:turns:0`, not
   §2.6's `variant:turns:1`, which came from the spec step's scratch generator that put "absent" last.
5. **`git` also runs with `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null`**, on top of §4.2. This means the
   gate reads none of the person's own git settings, so a configured colour or signature line cannot reach what it
   parses.
6. **Stricter than this file**, in both builders. Each is named in its builder's report.
   - Proof (ii) also checks that the seed's public key equals `keys.phoneSigningKey`.
   - F3 requires body fields sorted by key, refuses a record with both a query and a body, and requires a base on every
     recorded route except `/pair`.
   - The reader refuses each of these:
     - a `signedPost` without exactly one `.sortedKeys` encoder
     - a `String` hole without `queryValue`
     - `if var`
     - `Double`, `[T?]` and an object of fields inside a value
     - a type that holds itself

### The re-freeze (§7), once

Before the re-freeze, the gate over the unchanged set (`node build/assert-door-only-adds.mjs`) exited **1** in 807 ms:

- F1 was red with "format 1 was retired by Phase 333.11.1's ruled re-freeze; …".
- F3 was red with two findings: no asks, and no request record.
- P4 read DIFFERS at 154 paths, starting with `/requests`.
- Every other clause was green, P0 included (see item 1 above).

`node build/assert-door-only-adds.mjs --freeze launch --replace --why "Phase 333.11.1: format 2 adds the request record
(every way the launch phone asks) and its asks (the numbers its requests need of the Mac); the wire it reads and sends is
otherwise unchanged, P4 read EQUALS launch before"` exited **0**. Every clause was green. P4 read EQUALS launch. It
froze `launch` at phone build 10 and Mac 0.111.2 (D15): 11 routes, 35 types, 503 arms and 15 unarmed, the same arms and
`unarmed` as before. It took 724 ms.

- **Moved lines: 184.**
  - `- /requests = []`.
  - 153 `+ /requests/…` lines: the record of §2.2. Its canonical sha256, with `route` dropped, is `2610fa53ad798dd11ed401564273675c0da9c16e8ec8654cd44b481dd67a6ffc`, re-derived from the sealed file.
  - 30 `+ asks/…` lines. Their canonical sha256 is `4913ec9f313ced2d5edcdd8cf5681ddad51f36d504f03ab6ab2b657e386a3333`. The asks, in order:

    | Phone value | Value | Mac value |
    | --- | --- | --- |
    | `DoorLine.freshFor` | 4 | `KEEP_ALIVE_TIMEOUT_MS`, `mac>phone*1000` |
    | `DoorLine.keptLines+1` | 4 | `PER_SOURCE_MAX` |
    | `ScreenKeySender.mostItems` | 64 | `POCKET_KEYS_MAX_ITEMS` |
    | `ScreenKeySender.mostTextBytes` | 1024 | `POCKET_KEYS_MAX_TEXT_BYTES` |
    | `ScrollbackLayout.pageRows+overlapRows` | 108 | `POCKET_SCROLLBACK_MAX_COUNT` |

    Every rule not named is `mac>=phone`.
- **Top-level fields that changed**: `format` (1 to 2), `phoneBuild` (7 to 10), `macVersion` (0.110.0 to 0.111.2), `read`
  (only `ios/Tortie/Door/Pairing.swift`, from `3fa834c6…` to `f2ed8963…`), `requests` and `asks` (new), `history` and
  `seal` (`28e18b14…` to `7a9b955f6fa401eaa69da47792c6c515d95925e9fff80c60fdd785073ade71a4`).
- **`history`** gained one entry: `{ seal: 28e18b14…, phoneBuild: "7", macVersion: "0.110.0", why }`, with the `--why`
  sentence above.
- The record's 11 entries carry the route ids `pair`, `blocked`, `choose`, `end`, `keys`, `say`, `screen`, `scrollback`,
  `session`, `sessions` and `turns`.
- **Vectors**: `ios/TortieTests/Fixtures/vectors.json` and `frozen/launch.vectors.json` both have sha256 `dcbcf27c…`,
  byte-identical.
- `git diff --stat 5f5efba2 -- ios/TortieTests/Fixtures/frozen/` shows only `launch.wire.json`, with 166 lines added and
  6 removed. Its sha256 went from `90d4a64e…` to `124642bc…`.

### Every command the integrator ran

From `/private/tmp/wt-p33311`. `$I` is
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33311/integrator`.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| I1 | `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, at the start, around every step below, and at the end | 0 | `737549 1791921744` and `23166 1790702242` every time. Neither moved |
| I2 | `df -h /`; `memory_pressure \| grep percentage` | 0 | 90 GB free at the start, 88 GB at the lowest. Memory was 62 percent free, then 59. The load average was 7 to 45 |
| I3 | `node build/assert-door-only-adds.mjs` before the re-freeze | 1 | as stated above, 807 ms (1.53 s wall) |
| I4 | the re-freeze, as stated above | 0 | 184 lines moved, 724 ms |
| I5 | `shasum -a 256` of the vectors and both frozen files; `git diff --stat 5f5efba2 -- ios/TortieTests/Fixtures/frozen/` | 0 | as stated above |
| I6 | `node -e` with `readPhoneWire` and `canonical` over the tree and the sealed set | 0 | today's record and sealed record are both `2610fa53…`, the asks are both `4913ec9f…`, and `unread` is 0 |
| I7 | `/usr/bin/time -p npm run -s gate:onlyadd` | 0 | **PASS** in 712 ms (1.41 s wall). 1 frozen set (launch: phone build 10, Mac 0.111.2); 11 routes served; **158 requests replayed (46 frozen, 112 more ways the frozen phone asks)**; 2 presentations opened; 26 instances over 12 routes conform; 10 Mac limits held; **1 committed copy compared**; 15 fields unarmed; P4 EQUALS launch. R2 checked 158, R5 96, F3 669, F1 3, R4 20 and A4 19 |
| I8 | `npm run typecheck` | 0 | 2.27 s (`tsc -b` was incremental). Import boundaries: 1,427 files, 0 violations. No runtime cycles; shared types OK |
| I9 | `npm run build` | 0 | 38.45 s. Every embedded gate passed. `gate:onlyadd` PASS in 680 ms with the same line as I7. `contract-inventory` matched the baseline byte for byte |
| I10 | `env -u TERM_SESSION_ID HOME=$I/home ZDOTDIR=$I/home HISTFILE=/dev/null npm test` | 0 | 1,132 test files passed and 2 skipped; 21,125 tests passed and 14 skipped; 73.26 s |
| I11 | `P33311_SCRATCH=$I/ablation npm run -s ablation:p33311` | 0 | **ABLATION_P33311: 66/66 red, 12/12 controls green**, M1 to M6 held, 173 s, unplanted PASS. V1 to V4 were red on R5. V9 to V12 were red on R2. G1 was red on F1 and R4. G3 was red on R4 with F1 (`alsoRed`). G4 was red on A4 with F1. G5 was red on R4 with F1. G6 was red on F1. P0c and P0d were red on P0. F3e was red on F3 (and P0). X5 was refused on `requests-targets.swift.txt`. C1 to C6, Z0, V5 to V8 and G2 were green. The clone was removed: `$I/ablation` is empty |
| I12 | `npm run -s conformance:pocket` | 0 | PASS: 136 rules and 19,645 checks in 10.32 s |
| I13 | `npm run -s conformance:ios` | 0 | PASS: 50 rules over 52 app files, 70 test files and 136 files under `ios/`; 13.7 s |
| I14 | `npm run -s gate:contract` | 0 | the inventory matched `docs/audits/contract-baseline.txt` byte for byte |
| I15 | `npm run -s gate:checks` | 0 | 268 check scripts classified; 0 of 566 build scripts run Go |
| I16 | `node build/p316/test-ios.mjs --self-test` | 0 | self-test PASS (76 checks); frozen grader self-test PASS (26 checks); sample book self-test PASS (12 checks) |
| I17 | `lock.sh try p33311`, which took `electron.lock` at 21:43:20, then `P316_DERIVED_DATA=$I/dd-263 npm run test:ios`, then `lock.sh release`, which released it at 21:48:55 | 0 | 335 s. The reader read 12 fixtures. "the phone's decoders read exactly launch: its refuse arms are asserted" (`P33311_PROOF=launch`). On iOS 26.3.1, Debug ran 827 tests and Release 824, with 0 failures and 0 skipped. **Frozen set launch: 617 of 617 rows as sealed; arms 462 refused, 41 accepted, 0 skipped**, in both configurations, the same rows as at `85f90247`. The suite check, which names DoorFrozenTests if it did not run, passed. The Simulator was shut down and deleted, and 0 `p316-` devices were left |
| I18 | `lock.sh try p33311`, which took `electron.lock` at 21:49:18, then `P316_RUNTIME=18.3 P316_DERIVED_DATA=$I/dd-183 npm run test:ios`, then `lock.sh release`, which released it at 21:53:59 | 0 | 280 s. On iOS 18.3.1, Debug ran 827 tests and Release 824, with 0 failures. Frozen set launch: 617 of 617 rows as sealed; arms 462 refused, 41 accepted, 0 skipped, in both configurations. `P33311_PROOF=launch`. 0 `p316-` devices were left, and 0 were booted |
| I19 | `git diff 5f5efba2 --stat`; `git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt \| wc -l` | 0 | 5 tracked files changed, with 2,043 lines added and 91 removed. **0** |
| I20 | `rm -rf $I/dd-263* $I/dd-183*` | 0 | about 1.95 GB freed. Before removing, `ps` confirmed that no process named the path |

### For the commit body (obligation 5)

The set `launch` was re-frozen once, on his ruling "Land it, queue the gaps", with `--replace --why`. 184 lines moved:

- `- /requests = []`, the empty list format 1's projection had.
- 153 `+ /requests/…` lines: the request record, sha256 `2610fa53…`. It is every query name and body key the launch
  phone's request builders send, always or only sometimes, nullable or not, and the closed set each value comes from.
- 30 `+ asks/…` lines: the asks, sha256 `4913ec9f…`. They are the five numbers the phone's own Swift asks of the Mac.

`read` moved only `Pairing.swift`'s hash. The sealed value was the bytes at `f90ff8cc`, so P0's same-bytes guard had
been off since `85f90247`. `history` records the replaced seal `28e18b14…`, build 7 and 0.110.0. The decoders' half of the
wire did not move: P4 read EQUALS launch before and after, and the vectors are byte-identical.

### The fix round (the fixer, once)

Written by the fixer on 2026-10-13 in `/private/tmp/wt-p33311`, after the verifier's `needs_work`. The fix ran once.
Nothing was committed, staged or stashed. `/Users/gdc/gmux` was only read. No Electron, Simulator, lock slot, model
turn, real Tailscale, DNS or APNs. `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737549 1791921744` and
`23166 1790702242` at the start, around every command that started a shell, and at the end. Neither moved.

**What the verifier found, and what happened to each.**

| Finding | Plant | Now |
| --- | --- | --- |
| Major: a Mac-held bound re-ruled and resealed left A4 | W20: `PocketScreen.widest` resealed as `instance<=phone`, `POCKET_SCREEN_MAX_COLS = 1024` | Red on A4 and F1. A4 applies the reader's own rule as well as the sealed one, and F1 (b) reports a changed rule against every committed copy. Arm A4r |
| Minor: a bound's Mac file came from the seal | W21: `macFile` resealed to a decoy holding 512, the real constant 1024 | Red on A4 and F1. A4 reads every constant the reader names from the reader's file. F1 (b) reports a moved file. Arm A4f |
| Minor: a limit's file came from the seal | W22: the `say` row's `file` resealed to a decoy holding 32,768, the real cap 16,384 | Red on R4 and F1. R4 reads every constant from the file the gate's own tables name. F1 (b) reports a moved file. Arm R4f |
| Minor: nothing compared the record with history | W16: a phone file moved, `agent` resealed as `always`, V3 planted | F1 (b) and `--replace` now hold `routes`, `requests` and `sends` against the copy they compare with. W16 stays green until a committed copy holds a record, which this phase's own commit makes. Stated in §10. Mode M7 proves it through `--replace` |
| Nit: a factory hid the kept lines | W18: three `DoorLine.kept()` calls, one factory | Red on P0. A kept line counts only as the whole initializer of a stored property in a type's body. Anything else is unread. Arm X6 |
| Nit: `verification-checks.mjs` says git is not needed | — | Not fixed. §8 puts the file out of bounds for this phase, and the verifier asked for a later phase or the spec owner's word |

**The files the fix changed.**

| File | What |
| --- | --- |
| `build/assert-door-only-adds.mjs` | `GATE_FILES` and `gateFileOf`: the file the gate's own tables (`MAC_LIMITS`, `BOUND_ROWS`, `ASK_ROWS`, `SEND_ROWS`) name for each Mac constant, with two tables disagreeing red on R4. R4 reads every limit, ask and word list from that file, and the sealed file only when no table names the constant. R4 also holds the frozen words against the reader's own `SEND_ROWS` list when its name differs from the sealed one. A4 applies the sealed rule and the reader's rule, reads every reader-named constant from the reader's file, notes a rule mismatch, and holds a reader-named bound the sealed set lacks at today's value. `macSideLosses` also reports a re-ruled bound, a raised or changed bound value, a lowered least value, a path no longer bounded, an ask whose constant or rule changed, and a limit, bound or ask moved to a file the gate's own tables do not name. A new `requestLosses` reports a route, record, query name or body key gone, a `sometimes` now `always`, a nullable key now never null, a closed-set, Bool or key-list value of another shape, and a word gone from `sends`. F1 (b) and `--replace` call both. F1's clause sentence, the header comment and the `--replace` message say so |
| `build/p33311/swift-wire.mjs` | `storedInitializer` and its use in `keptLinesByType` (W18). The asks still read 4, 4, 64, 1,024 and 108, the record and asks hash as before, and `unread` is empty |
| `build/p33311/fixtures/requests-unread.swift.txt`, `.expect.json` | 28 lines appended: a factory, an extension's factory, a local, a computed property, a list and a chained call, each unread (lines 494, 498, 502, 503, 504 and 511), and one typed stored property that counts (`"Factory": 1`) |
| `build/p33311/ablation.mjs` | A `create` edit (a file the clone does not have; the restore removes it). Arms A4r, A4f, R4f and A4n (each red on its clause AND F1) and X6. Modes M7 (`--replace` refuses a lost way of asking) and M8 (it refuses a bound re-ruled, raised, its least value lowered or a path unbounded), through one `replaceRefuses` helper |
| `CLAUDE.md` | The `gate:onlyadd` row says what the fix round holds and counts 71 arms. Obligation 5 says `--replace` also refuses a re-ruled or moved row and a lost way of asking |
| this file | §10's new bullet, and this section |

`launch.wire.json` (`124642bc…`), `launch.vectors.json` and `vectors.json` (`dcbcf27c…`) did not move, so the set was
not re-frozen. `git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt build/p316
build/simulator-run.mjs package.json build/verification-checks.mjs ios/TortieTests/DoorFrozenTests.swift | wc -l`
prints **0**.

**Decisions, and where each comes from.**

1. **A file may move only to the file the gate's own tables name** (the verifier asked for any moved file to be
   reported). A constant moved in a refactor then needs `MAC_LIMITS` or `BOUND_ROWS` updated and a ruled re-freeze,
   not a retirement. A decoy is never the table's file, so the exemption does not weaken the check. R4 and A4 read from
   the table's file anyway.
2. **A rule never changes, with no exemption** (the verifier: "whose rule changed or left MAC_HELD_RULES"). The
   launch phone's own Swift decides the rule, so no re-freeze of `launch` can honestly change it.
3. **A4 does not turn red on a rule mismatch by itself.** It applies both rules and writes a note. Making the mismatch
   red would also turn a later widening of `BOUND_ROWS` red. F1 (b) is the clause that holds the rule.
4. **A4 holds a reader-named bound the sealed set lacks, at today's value** (my own, beyond the verdict). W20 with the
   row renamed (arm A4n) otherwise left A4 again. Today's phone at `5f5efba2` reads every bound the set holds, so
   nothing new is checked on the clean tree: A4 still counts 19.
5. **`macSideLosses` also compares bound values, least values and bounded paths** (my own, beyond the verdict). A4's
   `min(sealed, today)` stops a resealed raise only while today's phone keeps its value. A later phone that raised its
   own bound would otherwise let a resealed launch value rise with it, and a `--replace` of `launch` from that phone
   would record the wrong phone.
6. **`requestLosses` is one function used by F1 (b) and `--replace`** (the verifier: "Make F1 (b) also hold
   `requests`"). `--replace` refusing the same losses keeps the two from disagreeing, because a set `--replace` wrote
   would otherwise be red on F1 at its next build. It also covers `routes` and `sends`, because R2 and R5 build their
   replays from the sealed `sends` words, so a word resealed out of `sends` stops being replayed.
7. **W18 is fixed in the reader, not stated as a limit.** The rule is narrow: an initializer of a stored property in
   a type's body is what all four kept lines in the app and the fixtures are.
8. **`test:ios` was not run again.** The fix moved no file it reads except the reader. Its pre-run proof
   (`frozenProof`) was run directly and read `launch` as proven with the reader's 12 fixtures, and its `--self-test`
   passed. The frozen set, its vectors, `DoorFrozenTests.swift` and the phone's code did not move, and those are what
   its 617 rows read. `conformance:pocket` and the vitest suite read none of the files the fix changed.

**Every command the fixer ran.** From `/private/tmp/wt-p33311`. `$X` is
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p33311/fixer`.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| X1 | the history `stat`, around every command below | 0 | `737549 1791921744` and `23166 1790702242` every time |
| X2 | `df -h /` | 0 | 86 GB free at the start, 84 GB at the lowest |
| X3 | `npm run -s gate:onlyadd`, after the first edits | 0 | PASS in 1,458 ms (2.39 s wall) at a load average near 90 |
| X4 | `readPhoneWire` and `proveReader` through `node -e` | 0 | record `2610fa53…`, asks `4913ec9f…`, `unread` 0, `PER_SOURCE_MAX`'s ask 4 from `TortieApp.swift`; 12 fixtures, 0 problems |
| X5 | `/bin/cp -Rc` the tree to `$X/clone`, then the verifier's own `plants.mjs` over it with this tree's gate, all 28 plants | 0 | W1 to W13, W14b, W15 and W18 to W22 red; W20 and W21 red on F1 and A4, W22 on F1 and R4, W18 on P0. W14 (folded), W16 (§10), W17 (§10) and W23 (caught by `conformance:pocket`) green, as the verifier read them. H1 to H4 green. Every file restored by sha256 |
| X6 | `--freeze launch --into $X/rf1 --replace --why …` over `5f5efba2`'s format-1 copy, and `--into $X/rf2` over today's set | 0, 0 | No loss against either. The set written over format 1 equals this tree's `launch` apart from `history`'s reason and the seal |
| X7 | `P33311_SCRATCH=$X/ablation npm run -s ablation:p33311`, before arm A4n | 0 | `70/70 red, 12/12 controls green (117 s)`, M1 to M8 held |
| X8 | `frozenProof()` from `build/p316/test-ios.mjs` through `node -e`; `node build/p316/test-ios.mjs --self-test` | 0, 0 | `launch` proven, "the phone's reader read its 12 fixture(s) as expected"; self-test PASS |
| X9 | `npm run typecheck` | 0 | 2.35 s; 1,427 files, 0 import violations, no runtime cycles |
| X10 | `npm run build`, before arm A4n and A4's renamed-bound half | 0 | 47.28 s; `gate:onlyadd` PASS in 741 ms; `contract-inventory` matched byte for byte |
| X11 | `npm run -s gate:onlyadd` twice, and `--json` | 0 | 727 ms and 649 ms (1.35 s and 1.26 s wall). Counts as before the fix: F1 3, F3 669, R2 158, R4 20, R5 96, A4 19; 46 frozen and 112 generated replays; 1 committed copy; no note |
| X12 | `P33311_SCRATCH=$X/ablation npm run -s ablation:p33311`, final | 0 | **`ABLATION_P33311: 71/71 red, 12/12 controls green (122 s)`**, unplanted PASS, M1 to M8 held. A4r, A4f and A4n red on A4 and F1, R4f on R4 and F1, X6 refused on `requests-unread.swift.txt`. The clone was removed: `$X/ablation` is empty |
| X13 | `npm run build`, final | 0 | 45.98 s. `assert-hermetic-checks` PASS (268 scripts), `conformance:ios` PASS (50 rules), `gate:onlyadd` PASS in 879 ms, `contract-inventory` matched byte for byte |
| X14 | `npm run -s gate:onlyadd` twice | 0 | 621 ms and 609 ms (1.17 s and 1.13 s wall), load average 49 to 68 |
| X15 | X5 again over a fresh clone `$X/clone2`, against the final gate, then `rm -rf` of the clone | 0 | The same reading as X5, plant for plant |
| X16 | `git diff 5f5efba2 -- src/ ios/Tortie/ docs/audits/contract-baseline.txt build/p316 build/simulator-run.mjs package.json build/verification-checks.mjs ios/TortieTests/DoorFrozenTests.swift \| wc -l`; `shasum -a 256` of the three vectors and frozen files; `node --check` of the three `.mjs` files | 0 | **0**; `124642bc…`, `dcbcf27c…`, `dcbcf27c…`; all three parse. The X5 `sentIn` line and the X6 `heldWhereMade` line each appear exactly once |
