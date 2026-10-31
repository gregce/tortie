# Phase 349 — "making it possible to rename sessions from the phone that it can access (and name sessions initially that are created via the phone)" — rename a session from the iPhone, and name one in New session — SPEC

Written by the spec step on 2026-10-21 in `/private/tmp/wt-p349`, a detached worktree at `266d7d91` ("docs(store): build
12's review notes, What to Test and claims"), and RESTORED by the rebuild's spec step on 2026-10-30 in
`/private/var/tmp/tortie-wt/wt-p349`, a detached worktree at origin/main `40aebfcc` ("docs(backlog): 0.113.0
published"), because macOS's temp cleanup deleted the first worktree, this file with it, while the phase was paused
(§0.1). `40aebfcc` is docs only over `266d7d91` (`README.md`, and the running log's last line in `docs/BACKLOG.md`),
and `266d7d91` is docs and frozen test fixtures over Phase 348's landed `b944aa20` (0.113.0 at `f1103aee`, build 12's
wire frozen at `f5fb5877`), so the product code the first spec measured is this tree's byte for byte. **`git diff
40aebfcc` in the worktree must be exactly Phase 349's delta.**

**What binds this spec, in order of authority.** His words of 2026-10-19: "One thing as a small next phase is making
it possible to rename sessions from the phone that it can access (and name sessions initially that are created via
the phone)." His standing rulings: Face ID only for End ("Only for End", his answer 5; "No Face ID, just confirm"); a
new route waits for its own Allow, and an allowed route's meaning, body keys and cap never change (333.12, his answer
10); no regression against today (a scenario worse than the parent is a defect: fix it or drop the part); just enough
words; nothing released, tagged or version-bumped without his word. Then the entry, `docs/BACKLOG.md` "## Phase 349"
(its mechanism items 1 to 14, D1 to D14, the proof, What moves on purpose, the stated trades, the release obligations
and What is NOT in this phase), which this spec carries whole and corrects only where it measured otherwise. Every
correction says so where it stands.

**The answer, measured.** The phone renames through ONE new signed write route, `rename` (`POST /v1/rename`), that
waits for its own Allow, and names a session at New session by starting it exactly as today and then sending one
rename to the id the Mac answered (D2), so `/v1/start` and every frozen phone stay byte for byte. The tmux name stops
carrying what tmux reads in it (D7, M1): on nine tmux versions, 3.2a to 3.7c, today's rule keeps 23 to 25 of the 54
corpus names exact on a create and 19 to 21 on a rename, and D7's keeps 54 of 54 on this Mac's rule from 3.5a and on
the far rule everywhere. That closes the Mac's own rename and create too: `/review`, `.env fix` and `-x` rename, `x;`
creates, and `#H` stays `#H` as the person reads it.

**The spec step MEASURED before it wrote** (§2, §15): M1 on scratch servers of all nine versions, M2 on the loopback
machine, M3 on an iPhone 16 Pro and an iPhone SE on iOS 26.3 and the 18.3 floor, the route pin and the body sizes
re-derived two ways. It started no Electron, no agent, no model turn, no real Tailscale, DNS or APNs and no ssh to a
real host; every Simulator went through `build/simulator-run.mjs` under one lock slot and was deleted in the helper's
`finally`; no screenshot was taken. It sent no name holding a tmux job sequence (`#(`) to any server.

---

## 0. This is a rebuild, and the hard rules

### 0.1 This is a rebuild (2026-10-30): what was carried, what was re-measured, and what differs

**Why.** Phase 349 was fully built and integrated once (2026-10-21), uncommitted, in `/private/tmp/wt-p349`, and its
attack lens approved it. macOS's automatic temp cleanup deleted that worktree, its scratch files and this file while
the phase was paused. His instruction: "restart it and build it exactly as it was". THE BLUEPRINT is
`/private/var/tmp/tortie-wt/p349-prev/`: `1-spec.json` (the first spec step's whole result), `table.json` (the same
builder table, paths moved to this run's folders), the four builders' reports, the integrator's, the probe review and
the attack lens. Where a report names `/private/tmp/wt-p349` read `/private/var/tmp/tortie-wt/wt-p349`; where it names
the old scratchpad's `p349`, read `/private/var/tmp/tortie-wt/scratch/p349`. Everything this run writes lives under
`/private/var/tmp`, which macOS does not clean: NEVER put work under `/private/tmp`.

**The text of this file is a reconstruction, not a byte copy.** The first SPEC.md was never committed and no copy of
it survived (the old scratch folders exist and are empty). This file is rebuilt from the blueprint, from the entry and
from the tree, in the house shape `build/p348/SPEC.md` uses, with every section number the builders' briefs cite
(`table.json`) holding what those briefs expect: §0 the hard rules, §2.1 to §2.3 M1 to M3, §4.1 to §4.5 the design per
builder (§4.4 step 7 the hostile door's rename arms, §4.5 steps 1 to 6 the faces), §5.1 to §5.3 the words and
identifiers, §6 what moves on purpose (item 3 holds the done line, item 6 the named Create's `pendingName`), §7.1 to
§7.3 the gates, §8.1 and §8.2 the app runs, §9.1 to §9.3 the builders and seams, §10.1 and §10.3 the proof, §11 the
integrator's steps (step 1 the CLAUDE.md rows, step 4 the door's gates and `ablation:p313`), §13 the CHANGELOG and the
checklist.

**Carried, with its date, never re-run** (the measurements of 2026-10-21, `1-spec.json`): M1 (how nine tmux versions
store a name, the fuzz, the `#` scan, flags and parse, the far stamp, the control client), M2 (the far round trips),
M3 (the phone: the row menu, the ⋯, the sheet, the field comparison, the parent's frames), the R4 pin and the body
sizes, the corrections to the entry, the history stats of that day, and every number the first build's builders,
integrator, probe reviewer and attack lens reported (§0.3).

**Re-measured at `40aebfcc`, because the tree needs it and the blueprint cannot give it** (§15.2):

1. **Every citation re-read at `40aebfcc`** (§3). The entry's line numbers are `1eb477bf`'s, before 348; the ones 348
   moved are given at this head. Nothing a decision rests on moved: the product code is `266d7d91`'s.
2. **The tmux servers rebuilt**, each `-V` checked exact and each started once on a scratch socket whose `#{version}`
   was read and which was ended by its own pid: 3.5a, 3.6, 3.6b and 3.7c by `node build/build-tmux-version.mjs <v>`
   into the worktree's gitignored `build/vendor/tmux-probe/<v>/bin/tmux`; 3.2a, 3.3a and 3.4 by research 131 §3.1's
   recipe (the probe builder's six rules copied into scratch, upstream tarballs held to research 131 §3.2's sha256,
   libevent and utf8proc static from the ship pin, 3.2a and 3.3a handed utf8proc through `CPPFLAGS` and `LDFLAGS`)
   into `/private/var/tmp/tortie-wt/scratch/p349/spec/tb/<v>/bin/tmux`; Homebrew's 3.6a
   (`/opt/homebrew/Cellar/tmux/3.6a/bin/tmux`, sha256 `70cbf669…`) and the vendored 3.7b
   (`build/vendor/tmux/bin/tmux`, sha256 `d7002f7d…`) read as they are. §2.1 lists the nine paths.
3. **M1's corpus RECONSTRUCTED and driven once over the rebuilt servers** (§2.1.1): the 2026-10-21 corpus went with
   the scratch folder, and the verb builder's 54/54 check and the verifiers need one. The reconstruction holds every
   name the entry and the blueprint name, filled to 54 by the classes M1 measured, and it reads EXACTLY the carried
   numbers on all eleven server configurations, every one of the six rules, create and rename: today's rule 24/20 on
   3.2a to 3.4, 25/21 on 3.5a to 3.6b and 23/19 on 3.7b and 3.7c; today's far rule 27/23 on 3.2a to 3.6b and 25/21 on
   3.7b and 3.7c (the first build's verb builder measured 27/23 on 3.6a and 25/21 on 3.7b); D7's local rule 53/53 on
   3.2a to 3.4 (the one miss `cost $HOME`) and 54/54 from 3.5a; D7's far rule 54/54 on all nine; D7 without the
   backslash map 47 or 48.
4. **R4's route pin re-derived two ways at this head** (§2.4): today `2f5feba1…`, with `POST /v1/rename`
   `3ba0fec56446be39e7ec0e15b17053cfcb1cbcb05d4448201c78cb7c078ed706`, as carried.

**What cannot be exactly as it was, and why** (each is a reconstruction a later reader can tell from a measurement):

- **The corpus's 54 names** are reconstructed (above, §2.1.1). The carried counts are the first corpus's; the
  reconstructed corpus reproduces every one of them, which is the evidence it is the same mix of classes, not that it
  is the same 54 strings.
- **The third name sentence's words.** Two of D5's three sentences are known (`Session name cannot be empty.`, the
  Mac's own, and `That name is too long.`, which the first build's door builder found already said in
  `src/renderer/tree/entry-name.ts:65`); the third, for a refused character, is not in the blueprint. This spec decides
  it as `That name holds a character Tortie does not use.` (§5.1), in the house family of `REPLY_TEXT_CHARACTER` and
  `PASTE_CHARACTER`.
- **Constant, member and identifier spellings the blueprint does not record**: the Mac constants for the three
  sentences (`SESSION_NAME_EMPTY`, `SESSION_NAME_TOO_LONG`, `SESSION_NAME_CHARACTER`), `RENAME_UNREACHABLE`'s words
  (made the way `END_UNREACHABLE_TITLE` is), the Copy names of §5.2 but `Copy.rename`, and the Rename sheet's
  identifiers of §5.3 (`rename-sheet`, `rename-field`, `rename-save`, `rename-cancel`, `rename-line`,
  `rename-writing`). The ones the blueprint records are kept exactly: `Copy.rename`, `Copy.sortName`,
  `ID.terminalMenuRename`, `row-rename-<id>`, `needs-row-rename-<id>`, `start-name`, `RenameBody`, `RenameResult`,
  `RenameRunner`, `RenameModel`, `RenameRegistry`, `DoorRenaming`, `SessionNameSheet`, `NameField`, `NameRule`,
  `renameSentence(for:sample:)`, `renameVerdict`, `renameTargetVerdict`, `renameOfferOf`, `renameOffer`,
  `renameAllowed`, `DOOR_RENAME_GATE_ENV`, `RENAME_FAILED`, `RENAME_UNREACHABLE`, `SESSION_NAME_MAX_UNITS`,
  `sessionNameRefusal`, `trimmedSessionName`, `RESERVED_TMUX_NAMES`, `holdBackTmuxSyntax`, `parseRenameBody`,
  `renameAnswer`, `renameSettled`, `renameActedOf`, `P349_SUITES`, `P349_PARENT_IOS`.
- **The numbering inside the new rule families**: RN1 to RN10 (§7.1), RNH0 to RNH12 (§7.2), bd1 to bd10 (§7.3) and
  RM1 to RM10 (§8.2) are spelled here from what each family must hold. The blueprint fixes RN9 (the one rule's one
  spelling) and RN10 (it reads `remoteRename`), bd5 (the row menu's guard line) and bd9 (the named Create's
  `pendingName`), RNH4 (two phones, `busy`), RNH6 (the refused names), RNH7 (the cap), RNH12 (no name in a log), RM6
  (End these with its control), RM8, RM9, RMP and RMH, and those are where the blueprint puts them.
- **The tmux builds' bytes.** The compiler, the SDK and the linker decide a binary's bytes; the version, the pinned
  tarballs and the `-V` line are what is held (`build/tmux-release.json`'s own note).
- **The base the delta is read against.** `table.json`'s integrator command reads `git -C … diff 266d7d91 --stat`,
  the first build's base. This worktree's base is `40aebfcc`, and `266d7d91..40aebfcc` adds `README.md` and the running
  log's last line, which are not this phase's, so every "diff against the base" in this file reads `40aebfcc` (§11
  step 10), and a diff against `266d7d91` shows those two docs files beside the phase.

### 0.2 What the first build decided where this spec was silent, and added after it: build it the same way

The first build's reports record choices the spec left open and work done after the spec. "Build it exactly as it
was" means these too. They are carried here so the builders, the integrator and the reviewers converge on the same
tree; none of them overrides a decision in §1.1.

- **door**: `renames` sits BEFORE `start` on the Sessions answer, because NS9 holds `start` last; a `done` with an
  empty or non-string name becomes `failed` with `RENAME_FAILED` (D21, as `startActOf` does); the parse ladder names
  `rename` explicitly and `paste` stays the fall-through, steps 2 to 4, 6 and 7 unmoved; `rowOf` carries `rename`, so
  the detail inherits it; beyond §6's list the rename necessarily reddens PS1, SU5, Z1, Z2 and AF2, which move on
  purpose and are named; RN9's one-spelling check asks for one declaration per sentence plus the Mac's own throw in
  `renameSessionAdmitted` (`Session name cannot be empty.` is already said inline in seven places, `That name is too
  long.` in `src/renderer/tree/entry-name.ts`); G1 gains a check of the code (`nameValueIn`) rather than a wider word
  list, which flagged `err.name` and ordinary prose; X6's `refusalBoundAt` reads a name in the function that declares
  it; X2 reads `parseRenameBody` among its parse functions; the rename vectors are composed over the SHIPPING verb
  (`createPocketWrites(...).rename` over a fake core), eight answers (`rename-done`, `-failed`, `-busy`, `-malformed`,
  `-refused-name`, `-refused-changed`, `-refused-gone`, `-refused-unreachable`), and the offers by a separate composer
  with one extra row (an ended remote session, which D3 offers no Rename): `blocked-rename`, `session-rename`,
  `sessions-renames`, no existing answer moving a byte; the `names` vectors read the trim set and the refused set off
  the shipping functions one code unit at a time, D5's list spelled once to hold that scan to, "only the Mac can hold
  it" decided by Node's `isWellFormed`; `sample.mjs` keeps `constants.renames` once and attaches it to every Sessions
  answer; the probe literals equal what `describePocketDoor` composes over all fifteen routes; `probe-p348`'s A0 reads
  past 349's `rename` in its two waiting-route clauses; the hostile client's RNH4 types its name `as it ends`, because
  `gate:background` reads the word "while" as a loop.
- **verb**: `renameTargetVerdict` asks `renameVerdict` over the name `'a'`, which the rule always passes, so the four
  arms are written once and `.canRename` is read only inside `renameVerdict`; the far-machine arm is a `runsNow` switch
  over every status; `remoteRename`'s warnings log `gmuxErrorPayloadOf(err)?.code ?? 'unknown'`; `p342-far-names.test.ts`
  gains driven Phase 349 blocks through that file's own harness; `ablation:p342` gains arm `b148e` (no existing arm
  named the restore line); `probe:p349` is classified `remote` in `build/verification-checks.mjs`; RN3's far half makes
  a shell on the loopback machine through the Mac and renames it from the phone at once, because a far start could run
  a real agent from his install folders; RN0 records the face's "Your phone can" row as not drawn over an agreement
  on record (`p333121-face.test.ts` holds that composer); RN6 is strict about stores.
- **phone-door**: `DoorRenaming` has a second requirement, `func session(_ sessionId: String) async throws ->
  PocketSessionAnswer` (the row's read first, D20, and the one read after a rename with no answer);
  `RenameModel.init(sessionId:name:renamer:registry:readsFirst:sample: = false)` with `readFirst(reread:)` and
  `save(reread:)`, the sheet closing when `phase` becomes `.done`; `StartModel.init(offer:renames: = false,
  setup:clock:)` with `lineDrawn(_:)` and `nameLine`; `StartSetup`'s members in the order mac, starter, registry,
  keeper, sample, renamer, renameRegistry, opened; the local name `pendingName` (§6 item 6); what is sent is the
  field's text as typed (the Mac trims), Save name is off when the trimmed text equals the held name as bytes; a
  New session name of only spaces keeps Create off with `Session name cannot be empty.`, and an empty field sends
  today's start alone.
- **faces**: the ⋯ makes the sheet's model AT THE PRESS (`renaming = rename.asked()`, D20); a `RenameAsked` wrapper
  whose id is `ObjectIdentifier(model)`, so a second press always gets a fresh sheet; `TerminalMenu.renaming(_:)` as a
  copy method rather than a new init argument, because `ios/TortieTests/EndTopTests.swift:56` (in no list) pins the
  `TerminalMenu(...)` line byte for byte; `RenameSetup { let model: @MainActor (sessionId, name, readsFirst) ->
  RenameModel }`, `RenameRowsAction`, `@Entry var renameRows` and `.renameRows(setup, reread:)` with one
  `.sheet(item:)` per tab; the older-Mac face handed no rename; the mocks `Rename.html` (the sheet at open, keyboard
  up) and `RowMenu.html` (a held row, Rename alone), `index.html` counting 26 screens, the keyboard's Done drawn with
  no label (a `done` segment is owed by Conversation.html's later-phase rule); `copy-drift.mjs` owning Rename and Save
  name, a `P349_PHONE_WORDS` judge with five mutations, seven screen and two module mutations, `OWNED_RULE_FLOOR` 109
  → 113 and `PHONE_MAC_FLOOR` 90 → 95.
- **integrator** (files in no builder's list, each named in its report): `ios/Tortie/Screens/EndBar.swift`'s
  `EndModel.init` gains `line: String? = nil`, because a named Create's page shows the rename's sentence on its one
  line, which lives in `EndModel` (bb9), and rule (v) gains an `insideInit` helper for that seed;
  `src/main/sessions/__tests__/p348-remove-verdict.test.ts`'s fake core gains `renameSession: async (): Promise<Session>
  => { throw new Error('a Remove never renames anything'); }` (`npm run typecheck` stays red without it, because
  `PocketWritesCore.renameSession` is required); `Contract.swift`'s two row encoders write the always-sent nullable
  fields as null; `RenameTests.appSwift()` resolves both paths before comparing (`/tmp` against `/private/tmp`); the
  `stopRequested` check in `RenameTests` skips its own declaration line; ablation arm `v62` re-anchored so
  `gate:background` does not read its quoted `line = …` as an assignment; `Route.session`'s new `line` has a default;
  arm `bd9a` also edits `pendingName` so its clone compiles; `npm run package` with `CSC_IDENTITY_AUTO_DISCOVERY=false`
  and a scratch HOME, so it never signs with the Developer ID in his login keychain.
- **probe review** (docs/method/HOW-WE-BUILT-THIS.md rule 9: the integrator's graders answered wrong on 18 of the
  reviewer's own recorded readings, 8 of them false PASSes; all fixed in the probe files and proved by their
  self-tests): in `probe-p349.mjs`, RN1's far read-back counts one `_` per CELL, not
  per code point (`farReadBackOf`, `cellsOf`; §2.2 measured three pictographs and two ZWJ as `______ fam`, so the
  corpus's four-person family reads back with eight); RN2 searches the far log for the typed name, its far D7 form and
  its stamp form (`RN2_TYPED`, `rn2NamesOf`); RN5's missing reads are UNREADABLE; RN7 is UNREADABLE when the parent's
  half is hollow; RUN copies the manifest BEFORE the ends and requires every agent session the run started
  (`agentsStarted`) with argv[0] inside the run; a moved history is read again after `HISTORY_QUIET_MS` = 180 s
  (`historyHeld`); and before each launch the probe exits 2 if a copy of `claude` or `codex` sits in the checkout's
  `extraBinDirsFor` absolute folders or the system folders of the app's PATH (`absoluteScanDirsOf`,
  `shadowCopiesOf`), or if those folders cannot be read; `build/p349/fixtures/graders.json` holds 86 readings. In
  `probe-p316.mjs`, `gradeRmp` reads an older build not driven as UNREADABLE (`P349_PARENT_IOS` and
  `P348_PARENT_IOS` both required); `start-name-read` `missing:true` is UNREADABLE in RM8, RM9, RMP and RMH's key arm;
  RM6 drives its control first (`row-menu-read` before `select:`); RMP's older-Mac and RMH's key arm need the main
  drive's controls (`rnControls`); RMH's row arm FAILS a drawn list with no sentence or with one; RMH's answer arms
  FAIL a ⋯ that opened with no Rename; the same shadow refusal before `writeHiddenAgents`; 108 rename self-test cases.
  In `build/p313/hostile-client.mts`, RNH12 also reads the log for RNH6's refused names and RNH7's 2,048-byte name.
  **Two findings were not fixable inside a probe file and stand for the verifier (§10.2)**: `probe:p3167` and
  `probe:p317` hide only the five `QUIET_AGENT_IDS` and hand the app the caller's own PATH, while Tortie's scan always
  searches `/opt/homebrew/bin` and `/usr/local/bin` (`src/main/tmux/resolve.ts:160-174`), so they would run his `omp`,
  `pi` and other binaries for a version and ARE NOT RUN as they stand; and `src/main/agents/detection.ts:577-601` runs
  `--version` on every SHADOWED copy of a name it resolves (up to four), which no `agents:list` verdict sees, so every
  probe of this phase refuses a shadow copy before launch.

### 0.3 What the first build measured, as a check for this one (2026-10-21; not requirements)

A rebuild that lands somewhere else on one of these says why in its report. **door**: `conformance:pocket` 190 rules
(25,244 checks; 25,251 at integration); `conformance:pocket:hostile` 343 arms; `ablation:p313` 59 new arms and 14
re-pointed, 793 entries, 74 new and moved arms all red in 816.7 s at integration; `ablation:p33311 --only C2,R8c` both
controls green (R8c had been stale since Phase 348); door vitests 32 files, 1,603 tests; new
`p349-rename-write.test.ts` 38 tests and `p349-rename-offers.test.ts` 7; `node-phone --self-test` 25 checks.
**Regenerated once**: `vectors.json` 887 → 4,950 lines and 257,901 → 336,845 bytes (50 signed requests, 42 of them
writes; 44 answers to 14 routes, 23 to writes; 157 names, 6 only the Mac can hold); `sample.json` 1,927,421 →
1,928,338 bytes with 64 `"rename": true` ("5 sessions, 288 states, 15,840 list answers from 71 pieces, 11 sessions, 6
screens, 4 histories"); `gate:onlyadd` A2 101 → 110 instances over 15 routes. **verb**: 14 vitest files, 344 tests;
`conformance:manager` 64 rules, 2,809 checks; the shipped rule's scratch-tmux check 54/54 on 3.7b and 3.6a for the
local rule (with and without dedupe) and `farTmuxName`; the parent's 23/19 (3.7b) and 25/21 (3.6a) local and 25/21
and 27/23 far; `probe:p349 --grader-self-test` 10 graders, 45 clauses (46 and 187 ok after the probe review); a
28-arm clone ablation of the verb. **phone-door**: Debug build-for-testing 21 s, Release 83 s; `hostile-door
--self-test` 164 arms, 12 of them rename; `test-ios --self-test` 146 door checks; a macOS harness over the
regenerated vectors 775 checks (the BMP's 25 trimmed characters and 76 refused code units the same on both sides).
**faces**: `conformance:phonecopy` 26 screens, 95 of 95 Mac words, 113 of 113 owned rules, 71 self-test arms.
**integrator**: `conformance:ios` 54 rules; `ablation:p316` 38 new arms, 728 in all, 42 of 42 red in 478 s; `test:ios`
green on 26.3 (341 s) and 18.3 (346 s), Debug 1,145 tests and Release 1,142; `npm run package` unsigned 53 s; `npm
test` 21,812 passed and 9 failed, all nine in the five native watcher and `/bin/ps` test files that fail inside the
history block and at the parent too (`store-watch.native`, `process-table.native`, `ps.native`,
`repo-watcher.native`, `p269-env-names`); `git diff 266d7d91` 98 tracked files and 18 new ones. **attack lens**:
approved (D7 re-derived from scratch on 3.7b, 3.6a, 3.2a, 3.4 and 3.5a; the `@gmux-name` stamp's `#(` attack inert on
3.2a and 3.7b; the 157 vector names re-derived; the partition over 7 statuses and two places; 25 hostile bodies).

### 0.4 The hard rules, stated once

Every builder, the integrator and every verifier holds these. A rule broken is a stop, not a note.

1. **NEVER commit, stage or stash.** `/Users/gdc/gmux` is READ ONLY. `git diff 40aebfcc` in
   `/private/var/tmp/tortie-wt/wt-p349` is exactly this phase's delta.
2. **NEVER `-L gmux`, not even to count.** Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids
   you started, after confirming them, in a `finally`. Do not stop processes you did not start (his own Tortie, his
   other Claude sessions and their tooling).
3. **Never read** his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any conversation store or
   his live Tortie profile (a Simulator's own keychain is fine). Real data means committed fixtures.
4. **HIS SHELL HISTORY IS NEVER WRITTEN BY US, enforced.** Every command you start that does not launch an Electron, a
   Simulator, sshd or xcodebuild runs under the history block:
   `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb <command>` (allows everything, denies every write
   to `~/.zsh_history` and `~/.bash_history` and their `.new` and `.LOCK` files). Never test it on his files. Record
   ONLY `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run that starts a shell, the app or a
   Simulator; never read the files' contents. His own terminals append to `~/.zsh_history` by themselves, so a move
   across a blocked command is his: note it and go on. A move across an unblocked run (Electron, Simulator, sshd,
   xcodebuild, each with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset): note it, start
   nothing for 3 minutes, stat again; moved again means his terminal, go on; still means STOP and report. M2 measured
   that sshd's own privilege-separation sandbox fails inside `sandbox-exec` (`sandbox initialization failed: Operation
   not permitted`), and xcodebuild's macro plugin server's sandbox refuses it too (exit 65).
5. **NO REAL AGENT EVER RUNS, NOT EVEN FOR A VERSION.** Every agent the app starts is a stand-in:
   `build/p318/stand-in.mjs` behind scratch `claude` and `codex`, `build/scratch-login.mjs`'s checks. Every probe hides
   EVERY probed registry row but the run's stand-ins before each launch (`build/hidden-agents.mjs`:
   `writeHiddenAgents(profile, prefix, hiddenAgentsBesides(['claude', 'codex']))`, its `hiddenAgentsPrecheck`, and
   `standInsOnlyVerdict` over `agents:list`), exiting 2 unless the app's own scan resolves only the stand-ins, and
   refuses a shadow copy of a stand-in's name in the absolute folders the scan walks (§0.2). A probe that cannot do
   that is not run, and you say so. After every run read the manifest's argv[0] for every agent session. Never start
   `gemini`, `qwen`, `agy`, `grok`, `omp` or `pi`.
6. **NO REAL TAILSCALE, DNS OR APNs** (the stand-ins `probe:p316`, `probe:p313` and `probe:p348` use). No ssh to a real
   host: another machine is `build/with-scratch-machine.mjs`'s or `build/scratch-machine.mjs`'s loopback machine with
   the quiet shell. Never `smoke:remote` or `smoke:machines`. Never import a `build/` script to inspect it; read it as
   text.
7. **Simulators only through `build/simulator-run.mjs`** (`withSimulator`; `P316_DEVICE` and `P316_RUNTIME` for
   `test:ios`), never Simulator.app, never a screenshot or screen recording: a visual claim is a frame or a label
   XCUITest read. Leave `TMPDIR` at the system default for phone probes. A UI drive on iOS 18.3 logs nothing per event
   (Phase 348 §0 rule 14: XCTAutomationSupport's log callback ends the app), and an arm the harness ended is
   UNREADABLE, never a pass or a fail.
8. **Every Electron through `build/electron-run.mjs` inside `build/harness-socket.mjs`.** The new
   `build/p349/probe-p349.mjs` reaches it, so `HELPER_USER_FLOOR` goes 178 → 179 in the same commit
   (`build/assert-electron-teardown.mjs:529`). No new script reaches `withSimulator` (the phone's arms are a group of
   `probe:p316`), so `SIMULATOR_USER_FLOOR` stays 5 (`build/assert-simulator-teardown.mjs:229`). **NEVER SIGNAL A PROBE
   WHILE ITS OWN TEARDOWN RUNS**: `build/electron-run.mjs` skips its last steps when a signal lands in its grace; let it
   end itself, or SIGINT once and wait.
9. **Every process you start, end in a `finally`.** Xcode derived data only under
   `/private/var/tmp/tortie-wt/scratch/p349/<role>/dd*`. Your scratch is
   `/private/var/tmp/tortie-wt/scratch/p349/<role>/`.
10. **The lock has three slots**: `zsh /private/tmp/tortie-ops/lock.sh try p349 phone` prints the slot or exits 1
    (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>`. Every
    `test:ios`, probe, Simulator or Electron run holds one. Another phase's research may hold a slot at the same time;
    wait for yours. Builders and the integrator launch no Electron except a probe's own `--grader-self-test`.
11. **Disk**: `df -h /` before any build; under 8 GB free, wait and report. **Install nothing.**
12. **THE PHONE MOVES TO BUILD 13 IN THIS PHASE** (rule (s); build 12 was archived from 348's landed tree, the running
    log of 2026-10-20): `PHONE_BUILD` in `build/conformance-ios.mjs:3487` becomes `'13'` and its "not uploaded"
    fixtures 14 (`:8791-8792`); every one of the SIX `CURRENT_PROJECT_VERSION` lines in
    `ios/Tortie.xcodeproj/project.pbxproj` (`:417`, `:449`, `:479`, `:501`, `:522`, `:543`) becomes 13. **The Mac's
    version does not move** (0.113.0): no release, no tag, no version bump; his word decides the next release.
13. **Builders never edit an integrator file** (§9.1): among them `ios/Tortie/App/TortieApp.swift`,
    `ios/Tortie/Screens/Identifiers.swift`, `ios/Tortie/Style/Copy.swift`, `ios/TortieUITests/P316DriveUITests.swift`,
    `build/p316/probe-p316.mjs`, `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `CHANGELOG.md`,
    `CLAUDE.md`, `ios/Tortie.xcodeproj/project.pbxproj` and the two generated fixtures (`vectors.json`, `sample.json`).
    A phone builder that needs a new word or identifier declares it, exactly as §5 spells it, in its OWN staging file
    (§9.2), which the integrator folds in byte for byte and deletes. A builder that finds it must edit a file in no
    list stops and names it (§0.2 names the two the first build met).
14. **Never send a name holding `#(` to a tmux server outside the verifier's one attack** (§10.2 Method 2), and
    then only on a scratch socket.

---

## 1. The answer first

A phone paired with a Mac running this build, once a person presses Allow for `rename`:

- **renames a session from the Terminal's ⋯**: `Rename`, with the Mac's pencil, is the ⋯'s SECOND item, after Catch
  Me Up and before End session… or Remove; its press opens a sheet titled `Rename` with `Cancel` and `Save name`, the
  whole name prefilled and selected and the keyboard up; Save asks no Face ID, the sheet closes, and the Terminal's
  title takes the name the Mac stored;
- **renames any session in a list by holding it**: every row of Needs input and Sessions takes the iPhone's own
  long-press menu holding Rename alone, which opens the same sheet after reading the session again for its whole name;
  a tap still opens the session, and while End these takes taps a row offers no menu;
- **names a session in New session**: a `Name` row under Agent, empty. Left empty, Create sends today's start byte for
  byte and the Mac names the session as before. Named, Create starts the session as today and then sends ONE rename to
  the id the Mac answered, and the session opens under the name the Mac stored; a rename not taken opens it under the
  Mac's name with the sentence on that page's one line;
- **on another machine, renames a session only while it runs** (D3): an ended one there offers no Rename.

On the Mac it is ONE new signed write route, `rename` (`POST /v1/rename`, cap 2,048), through the one write path and
its one ledger, answered by a shape of its own (`PocketRenameAnswer`, six fields), and two OPTIONAL keys (`rename` on
a blocked row, the detail and a Sessions row; `renames` on the Sessions answer). Under 333.12 the route WAITS on every
updated Mac that already holds an agreement: the door answers it `404 route` before the body, no row carries `rename`,
no answer carries `renames`, and Settings then Phone draws `New: rename sessions from your phone` with `Name a session
as you start it, or rename one later.` above an Allow of its own (0.113.0 shipped 348's two routes without it, D13).
And the tmux name stops carrying tmux syntax (D7), which fixes the Mac's own F2 and ⌘T too: a name that starts with a
slash, a dot or a dash renames, `x;` creates, and a name holding `#H`, `#S` or `#{…}` keeps exactly what was typed in
the name a person reads.

**The menus.** The Mac's native menus do not change: no Mac surface is added, renamed or removed, `Rename Session`
stays on F2 (`src/main/menu.ts:902`), and the New line is drawn by the Allow that Settings then Phone already holds. On
the phone, the Terminal's ⋯ holds Catch Me Up, Rename, then End session… or Remove, and a session row's long press
holds Rename.

### 1.1 The decisions, each with its reason

D1 to D14 are the entry's, carried; a correction this spec measured is marked **CORRECTED** and says what it measured.
D15 onward are this spec's own, each from a measurement or a reading named beside it. His three questions (§14) are
built with the defaults he was offered.

| # | Decision | From |
| --- | --- | --- |
| D1 | **Where Rename lives.** Second in the Terminal's ⋯ (`TerminalMenuControl`, `ios/Tortie/Screens/SessionScreen.swift:499-589`), before End session… or Remove; and alone in a native long-press menu (`.contextMenu`) on every row of Needs input and Sessions, reached through an environment value as End these is (`ListScreen.swift:538`), so (k)'s pinned `RowView` line (`ListScreen.swift:486`, held at `build/conformance-ios.mjs:1822`) does not move. Not on Catch Me Up's bar (End's, then Remove's), not on the Terminal's long press (it selects, 337.5), no swipe (the lists are not a `List`, `SessionsScreen.swift:701-702`). His "sessions … that it can access" includes ended ones, which open on Catch Me Up (`SessionScreen.swift:16-19`), so only the rows reach every session, and a long press is the iPhone's own place for a row's actions. M3 measured both on the four device pairs (§2.3) | his words; entry |
| D2 | **A named start is a start, then a rename by id.** `/v1/start` and build 11's and build 12's frozen start stay whole, and one route serves both asks. A `name` key on start would change an allowed route (`src/main/pocket/route-ledger.ts:18-20`) that every 0.112.x and 0.113.0 Mac answers malformed (`writes.ts:580`, the key set compared before anything else). A named start route keeps 333.12 whole too, but doubles NS1 to NS12 and bb1 to bb10, must share start's one in flight and its rate (`writes.ts:203-213`, `:1130-1149`), puts the name in the kept start, so a name corrected after a lost answer starts a second agent, and still needs `rename`. **His question 1** (§14); built as recommended | entry; §14 Q1 |
| D3 | **Which sessions.** On this Mac every session the shared gate offers Rename on (`canRename`, `src/shared/session-gates.ts:278`, `:295`: neither unknown nor removed), live or ended; on another machine only while it runs (`running`, `idle`, `needs_input`), because the Mac's own verb refuses one that ended during this run (`TARGET_UNBOUND`, `remote-sessions.ts:2254-2264`) and renames one that ended before in this Mac's records alone (`core.ts:3342-3349`). The Mac's F2 keeps both of today's behaviours. **His question 2** (§14); built as recommended | entry; §14 Q2 |
| D4 | **A third gate environment**, `DOOR_RENAME_GATE_ENV: SessionGateEnv = Object.freeze({ canRestore: false, canDiscard: false, shellPathReady: false, handback: undefined })` beside `DOOR_GATE_ENV` and `DOOR_REMOVE_GATE_ENV` (`src/shared/session-gates.ts:324-347`), of which the door asks `canRename` and nothing else, with a test that `canRename` reads none of ANY environment (it is `acts`), so 348's two keep "nothing else of either" | entry |
| D5 | **The name rule. CORRECTED: `src/shared/session-names.ts` ALREADY EXISTS** (Phase 346's `nextOrdinal`, `dedupedName` and `ordinalName`, `:22-44`), so the rule is ADDED to it, below them, its header widened. `trimmedSessionName(name)` is ECMAScript's own `String.prototype.trim`, which is how the Mac trims (`src/renderer/state/sessions-slice.ts:1298`); then `sessionNameRefusal(name)` over the trimmed name answers, in this order and one code unit at a time with no pattern: `empty` (`Session name cannot be empty.`, the Mac's own, `core.ts:3311`); `long`, over `SESSION_NAME_MAX_UNITS` = 120 UTF-16 units (the Mac sheet's `maxLength={120}`, `src/renderer/session-manager/InlinePanel.tsx:336`; `That name is too long.`); `character` for a C0 control (TAB, LF and CR included), DEL, a C1 control, a bidi embedding, override or isolate (U+202A to U+202E, U+2066 to U+2069), U+2028 or U+2029, or half of a surrogate pair (`That name holds a character Tortie does not use.`, §5.1), which could reorder the status beside a name in an alert's title (`src/main/push/alert.ts:100`). Anything else passes, a duplicate included, as on the Mac. A pairing code is 289 or 290 UTF-16 units and in both vectors its one-shot secret's key (`ps`, `ios/Tortie/Door/Pairing.swift:45`) starts at unit 239 or 240 (§2.4), past the 120th, so the cap refuses a whole code and no cut of one under it holds the secret; no second code test is written | entry; §2.4 |
| D6 | **No lock, and the cap.** The body names no expected old name: the last rename wins, as between two Mac windows. The cap of 2,048 holds the worst legal body (120 units each escaped `\u00XX`, 915 bytes measured, §2.4; 60 astral characters escaped as surrogate pairs, 915; 120 quotes or Swift slashes, 435; 555 raw), 2.2 times, and a longer name later. The name is any string and is NOT held to `onlyItsOwnBytes` (`writes.ts:376-382`): a key given twice keeps its last value, as say's text does, and the answer's `name` shows what landed | entry; §2.4 |
| D7 | **The tmux name holds tmux syntax back, not the door.** `sanitizeSessionName` (`src/main/tmux/names.ts:43-51`) gains `holdBackTmuxSyntax`, applied LAST (D17), which maps to `_` exactly what tmux reads in a name on every version M1 measured: **every backslash** (**CORRECTED**: tmux doubles a backslash on every version, so without this map D7 keeps 47 or 48 of 54, §2.1); every `#` followed by `{`, `(`, `#`, `,`, `}` or a one-letter format (`D F H I P S T W h`, the set every version reads, §2.1), and a `#` that ends the name; a final `;`; and a leading `-` or `$`. A name tmux takes whole today, such as `PR #12`, `#x`, `#[fg=red]ok` or `a;b`, stays whole unless it starts with `-` or `$`. That closes the Mac's own rename and create too, where a door refusal would refuse names ⌘T makes (`/review`, `.env fix`, `#123 fix`). A tmux name is drawn only where tmux's echo reaches a display name (`core.ts:1765-1774`), on a far Mac's own Tortie and for a moment here, and where a far stamp did not stick (`nameOf`, `remote-sessions.ts:3336-3339`), so only what tmux reads is mapped: mapping every `#` would draw `PR #12` there as `PR _12`, worse than today. **A leading `-`: CORRECTED REASON.** The entry's reason, that only 3.7b's source was read to honour `--`, does not hold: M1 measured `rename-session -t $N -- -x` working on all nine versions, 3.2a's getopt included, while `rename-session -t $N -x` fails on all nine. D7 still maps a leading `-` to `_`, so every composer's argv stays byte for byte as today (no `--` is added at `src/main/tmux/sessions.ts:224` or `remote-sessions.ts:2298`), one rule serves this Mac's name, the far name and the remote restore (D16), and a person at that machine handing the name to `-t` or `-s` is not handed a flag. `dedupeSessionName` (`names.ts:59-68`) treats `RESERVED_TMUX_NAMES = ['gmux-control']` as always taken (M1: `tmux -C new-session -A -s gmux-control` attaches to a person's own session of that name on 3.6a and 3.7b, and today it is deduped against only while it exists, `sessions.ts:215-217`), with a vitest pinning the list equal to `CONTROL_SESSION_NAME` (`src/main/tmux/control-client.ts:116`), because `names.ts` imports nothing. `farTmuxName` (`remote-sessions.ts:1082-1084`) keeps its body and still maps every `$`. The display name is never mapped, and a running session keeps its tmux name until it is renamed or restored | entry; M1 |
| D8 | **No Face ID** ("Only for End", his answer 5; "No Face ID, just confirm"). A rename destroys nothing; `ios/Tortie/Screens/SessionName.swift` and `NameField.swift` join `OWNER_CHECK_ABSENT` (`build/conformance-ios.mjs:6010`) | his rulings |
| D9 | **No kept write id.** With no format left in a tmux name, the same name twice holds one name (`src/main/machines/exec-plane.ts:349-354`), so a press after a lost answer is a fresh write, as Remove's is | entry |
| D10 | **The Allow words.** The write and honesty clause `rename a session`; the face clause `rename sessions`; the New line `{ title: 'rename sessions from your phone', sentence: 'Name a session as you start it, or rename one later.' }`. Once committed the clause can never change under this id (`route-ledger.ts:18-20`; gate:onlyadd R8). **His question 3** (§14); built as drafted | entry; §14 Q3 |
| D11 | **A sheet, its words, its field.** A sheet, because an alert closes on every button and a refusal would lose his text. The Mac's `Rename` (`src/renderer/app/session-actions.tsx:930`) and `Save name` (`src/renderer/session-manager/copy.ts:633`) and the phone's `Cancel` (`Copy.cancel`), never `Rename '<name>'`, which the phone's word reader cannot own (`ios/TortieTests/StyleSource.swift:195-220`). The field is the app's ONE `UITextField` (`ios/Tortie/Screens/NameField.swift`), with smart quotes, smart dashes, smart insert, autocorrection, capitalisation and spell checking off, because a SwiftUI field cannot turn smart punctuation off (`ios/Tortie/Screens/MessageStrip.swift:125-143`), so `fix--auth` arrives as typed, as the Mac's field does (`spellCheck={false}`, `InlinePanel.tsx:337`). **M3 measured that under XCUITest's typing in the Simulator a SwiftUI field kept `it's "x" fix--auth` too** (§2.3), so the difference D11 exists for is not shown by M3: the UIKit field stands on the API's ground, and the device check is on his CHECKLIST (§13) | entry; M3 |
| D12 | **New session's Name starts empty**, labelled with the phone's one `Name` (`Copy.sortName`, `ios/Tortie/Style/Copy.swift:121`): the phone cannot know the `<n>` the Mac picks as it creates (`ordinalName`, `src/shared/session-names.ts:42-44`), and a stale guess would be deduped to `claude-3-2` | entry |
| D13 | **The release.** 0.113.0 was published on 2026-10-20 with 348's `remove` and `paste` and without 349, so the entry's second arm holds: `rename` ships in the next Mac release with an Allow of its own, and the phone build that calls it is build 13, cut from this phase's tree; each half on his word | entry; the running log |
| D14 | **The offer rides every row**, as End's does (`rowOf`, `src/main/pocket/routes.ts:735`; the Sessions row, `:2064`), and not the detail alone, as 348's Remove does, because Rename is drawn on rows; its bytes count inside the sessions budget (`POCKET_SESSIONS_BUDGET_BYTES`, `src/shared/ipc/pocket.ts:592`), as End's do | entry |
| D15 | **THE FAR STAMP'S ESCAPE BELONGS IN `remoteStampArgs`** (`src/main/machines/remote-stamps.ts:42-48`): a value whose LAST character is `;` is sent with that `;` as a backslash then `;`, and nothing else in any value changes. Measured on all nine versions (§2.1): `x;` sent raw reads back `x`, escaped it reads back `x;`; a value starting with `-`, and `--`, are kept on every version, 3.2a included; `#H` is kept as typed and a backslash stays single; `$HOME` is kept but on 3.4, which stores `\$HOME` and which Phase 342's `dollarOnRead` already undoes. Every stamp goes through it (`@gmux-id`, `@gmux-agent`, `@gmux-name`, `@gmux-project`), so a project path ending in `;` is kept too | M1 |
| D16 | **THE EIGHTH PLACE A TMUX NAME IS COMPOSED**, which the entry's count of seven missed: the remote restore (`src/main/machines/remote-restore.ts:486-494`) maps `$` to `_` in the record's name by hand. It becomes `farTmuxName(record.tmuxName.length > 0 ? record.tmuxName : record.name, new Set())`: the far rule, D7 with it, and no dedupe, as today. `conformance:machines` condition 148 pins that line byte for byte (`build/conformance-machines.mjs:15531`), so its restore clause moves on purpose, and `ablation:p342` gains an arm naming it (no existing arm does) | the tree; §3 |
| D17 | **D7 runs LAST, after the 200-character cut** (`MAX_TMUX_NAME_LENGTH`, `names.ts:27`; the cut at `:49`) and before the empty fallback: every replacement is one unit for one unit, so the mapped name never passes 200, and a cut can never leave a `#` at the name's end or a `;` last unmapped. The rule is idempotent (M1's fuzz: 400 of 400, local and far) | M1 |
| D18 | **A SwiftUI `.accessibilityIdentifier` on a `UIViewRepresentable` REPLACES the UIKit view's own identifier** (M3, §2.3), so `NameField` sets its identifier and its accessibility label in `makeUIView` alone, and no caller attaches `.accessibilityIdentifier` to a `NameField(` | M3 |
| D19 | **New session's Name moves Create down 85.67 to 86 pt; on an iPhone SE with the keyboard up the bottom 7 pt (26.3) and 3 pt (18.3) of Create sit under the keyboard, and Create stays hittable** (M3). So the Name field is NOT focused when the sheet opens, and Return in it hides the keyboard rather than creating; Create is pressed by itself | M3 |
| D20 | **A row's sheet reads `/v1/session` first** (the list clips a name at 200, `routes.ts:2056`, while a blocked row and the detail carry it whole, `:713`), for the whole name and a fresh offer, and Save stays off until that read came back with `rename` still true; **the ⋯'s sheet reads nothing more**, because the Terminal already holds the latest detail, its whole name and its `rename`. The sheet's model is made at the press, so the name is fixed when he presses | the entry's item 12; M3 |
| D21 | **A rename's `done` whose name is not a non-empty string is answered `failed`** with `RENAME_FAILED`, as `startActOf` answers a start whose session a phone could not read (`writes.ts:707-718`), so `name` is a non-empty string exactly when `outcome` is `done` | §4.2 |

---

## 2. What the spec step measured, how, and the numbers

Every measurement of 2026-10-21 ran in that step's scratch on scratch copies of `ios/` (`cp -Rc`) and scratch tmux
servers; nothing in the worktree but this file was written. That scratch is gone; the numbers below are carried from
the step's own result (`1-spec.json`). What the rebuild of 2026-10-30 re-ran is marked **(rebuild)** and its scripts
are kept under `/private/var/tmp/tortie-wt/scratch/p349/spec/` (§15.2).

### 2.1 M1: how tmux stores a name (D5, D7, D15, D17), 2026-10-21

**How.** Scratch servers of all nine versions, each `-V` checked exact: 3.2a, 3.3a, 3.4, 3.5a, 3.6, Homebrew's 3.6a,
3.6b, the vendored 3.7b and 3.7c, on sockets `p349-m1-<v>-<pid>` with `-f /dev/null`, plus 3.6a and 3.7b again under a
copy of `resources/gmux-tmux.conf`, each with a scratch `HOME` and `SHELL=/bin/sh`, under the history block, never `-L
gmux`, every server ended in a `finally`; exit 0. 54 names went through `new-session -s` and `rename-session -t $N`,
each in the shipping composer's order (`src/main/tmux/sessions.ts:174-175`, `:224`), under six rules: today's local
rule (the shipped `sanitizeSessionName` with its dedupe), today's far rule (`farTmuxName`), D7's local rule, D7's far
rule, and each D7 rule without its backslash map. **A row is EXACT when the command exits 0, the `$`-id read-back of
`#{session_name}` equals the composed name, and `=<name>` resolves to that same `$`-id.**

| Rule | 3.2a, 3.3a, 3.4 | 3.5a, 3.6, 3.6a, 3.6b | 3.7b, 3.7c |
| --- | --- | --- | --- |
| today's local (create / rename) | 24 / 20 | 25 / 21 | 23 / 19 |
| today's far **(rebuild row)** | 27 / 23 | 27 / 23 | 25 / 21 |
| D7 local | 53 / 53 (the miss is `cost $HOME`, which the far rule covers) | 54 / 54 | 54 / 54 |
| D7 far | 54 / 54 | 54 / 54 | 54 / 54 |
| D7 without the backslash map | 47 to 48 (rebuild: 47 local, 48 far) | 48 | 48 |

The first step's result states the local rows, the D7 far row and "47-48 of 54" for the rule without its backslash map;
today's far row is the rebuild's (§2.1.1), and the first build's verb builder measured it at the parent as 27/23 on
3.6a and 25/21 on 3.7b, "the parent's numbers match §2.1 exactly". The rebuild re-ran every cell. The four names a create keeps and a rename loses under today's rule are the four whose tmux name starts with
`-` (`/review` and `.env fix` become `-review` and `-env fix`, `names.ts:17`, `:48`; `-x`; `--`), because
`rename-session` reads them as flags and `new-session -s` takes them whole. 3.2a to 3.4 lose `cost $HOME` (they store
`$` and a letter as `\$`); 3.7b and 3.7c lose `fix #` and `C#` (they drop a `#` that ends a name).

**The fuzz.** 400 seeded names: the D7 rule is idempotent on 400 of 400, local and far. Read back on all nine
versions, the far rule is exact on 400 of 400 everywhere; the local rule on 400 of 400 from 3.5a and 375 of 400 on 3.2a
to 3.4, every miss an inner `$` before a letter, `_` or `{`.

**The `#` scan**, every printable ASCII character after a `#` (all but `(`, never sent): every version reads the same
set, `#`, `,`, `}`, an unclosed `{` (which cuts the rest of the name), and the letters `D F H I P S T W h`. A `#` at the
end of a name is dropped only on 3.7b and 3.7c. Every version doubles a backslash. 3.2a to 3.6b map `.` and `:` to `_`.
3.2a and 3.3a write `$` and a letter as `\$`, and 3.4 adds a second backslash. `%` is never expanded, and `#[` is kept
as typed.

**Flags and the parse.** `rename-session -t $N -x` fails on all nine versions; `rename-session -t $N -- -x` works on
all nine, 3.2a's getopt included (the correction to D7's reason). A name `x;` fails on create on all nine (`unknown
command: -c`, the `;` ends the command, `cmd-parse.y:1098-1103`) and rename stores it as `x`. Today's rule makes
`/review` into `-review`, and renaming to it fails on all nine. `#{session_id}` on a create gives an empty name on
3.2a, 3.7b and 3.7c and is refused on 3.3a to 3.6b. A leading `$` is resolved as an id even behind `=`: on 3.2a and
3.7b, `kill-session -t '=$0'` killed the session whose id is `$0` and left the session named `$0`.

**The far stamp** (`set-option @gmux-name`), all nine versions (D15). A value whose LAST character is `;` must send
that `;` as a backslash then `;`, and that keeps every value intact (`x;` sent raw reads back `x`; escaped it reads back
`x;`). A value starting with `-`, and `--`, are kept on every version, 3.2a included. `#H` is kept as typed and a
backslash stays single. `$HOME` is kept except on 3.4, which stores `\$HOME`; Phase 342's `dollarOnRead` already
undoes that.

**The control client** on 3.6a and 3.7b: `%session-renamed $N <name>` matched the D7 name byte for byte for 11 of 11
names. `tmux -C new-session -A -s gmux-control` attached to a person's own session of that name on both versions, so
D7's dedupe treats `gmux-control` as always taken.

**Not run, by design**: no name holding a tmux job sequence (`#(`) was sent to any server. D7 maps a `#` before `(`
from 3.7b's source (`format.c:5693`, `:417`), and the entry's job-sequence arm stays with the verifier, as the entry
words it (§10.2 Method 2).

#### 2.1.1 The corpus (rebuild, 2026-10-30), and the servers it runs on

The 2026-10-21 corpus file went with the scratch folder. This is its RECONSTRUCTION: every name the entry's M1 and
Method 1 lists and the blueprint's reports name, filled to 54 by the classes §2.1 measured, with no `#(` in it. Driven
by `/private/var/tmp/tortie-wt/scratch/p349/spec/m1/m1.mjs` (the six rules transcribed from `names.ts` and
`remote-sessions.ts` at `40aebfcc`, D7 as §4.3 states it) over the eleven server configurations, it read EVERY cell of
§2.1's table exactly (90.2 s, exit 0; `m1-results.json` beside it holds every miss). The builders' and verifiers'
scratch-tmux checks run THIS corpus. As JSON, with `\\` a backslash and `\u200d` the zero-width joiner:

```json
["plain name", "claude-3", "fix--auth", "it's", "PR #12", "#x", "#[fg=red]ok", "50% done", "%Y", "a;b",
 "gmux-control", "café ☕", "مرحبا بالعالم", "日本語のセッション",
 "👨\u200d👩\u200d👧\u200d👦 fam", "<a × 120>", "<b × 121>", "<x × 250>",
 "/review", ".env fix", "-x", "--", "cost $HOME", "fix #", "C#",
 "a\\b", "c\\", "\\", "\\\\", "path\\to\\file", "x\\y z",
 "$0", "$HOME x", "x;", "a;b;",
 "#{session_id}", "#H", "#S", "#D", "#W", "#h", "#F", "#I", "#P", "#T",
 "##", "#,", "#}", "#{x", "PR #{session_name}", "fix #H here", "a##b", "#{?pane_dead,dead,live}", "deploy #S now"]
```

The three long names are written as placeholders: `<a × 120>` is `a` 120 times (the cap), `<b × 121>` is `b` 121
times, `<x × 250>` is `x` 250 times (past the 200 cut). The exact strings are
`/private/var/tmp/tortie-wt/scratch/p349/spec/m1/corpus.json` (54 strings; sha256 of their `JSON.stringify`
`126fbc2f8c052aa14867203c7ed3a45d37bca655a257262b40747a8ebfecb06d`), and every rule's output for each is `rules.json`
beside it, both written by `node m1.mjs --rules-only`, which starts nothing. `m1.mjs` itself starts servers when it
runs, so it is read as text, never imported. The first 25 are what
today's rule keeps exact on 3.5a to 3.6b; the other 29 are what it loses everywhere (six
backslashes, two leading `$`, two final `;`, nineteen `#` that tmux reads). Under D7 the interesting ones read:
`gmux-control` → `gmux-control-2`; `/review` → `_review`; `.env fix` → `_env fix`; `-x` → `_x`; `--` → `_-`; `fix #` →
`fix _`; `C#` → `C_`; `a\b` → `a_b`; `$0` → `_0`; `$HOME x` → `_HOME x`; `x;` → `x_`; `a;b;` → `a;b_`; `#{session_id}`
→ `_{session_id}`; `#H` → `_H`; `##` → `__`; `a##b` → `a_#b`; `cost $HOME` stays (far: `cost _HOME`); the 250-character
name is cut to 200 first.

**The nine servers** (rebuild, each `-V` printing exactly `tmux <v>`, each started once on a scratch socket whose
`#{version}` read back and which was ended by its own pid; their stale socket files removed):

| Version | Binary | Built by |
| --- | --- | --- |
| 3.2a | `/private/var/tmp/tortie-wt/scratch/p349/spec/tb/3.2a/bin/tmux` (1,376,920 bytes) | research 131 §3.1's recipe, `tb/build-old.mjs` |
| 3.3a | `…/spec/tb/3.3a/bin/tmux` (1,449,592) | the same |
| 3.4 | `…/spec/tb/3.4/bin/tmux` (1,488,280) | the same |
| 3.5a | `/private/var/tmp/tortie-wt/wt-p349/build/vendor/tmux-probe/3.5a/bin/tmux` (1,319,552) | `node build/build-tmux-version.mjs 3.5a` |
| 3.6 | `…/build/vendor/tmux-probe/3.6/bin/tmux` (1,387,040) | the same |
| 3.6a | `/opt/homebrew/Cellar/tmux/3.6a/bin/tmux` (946,528, sha256 `70cbf669…`) | Homebrew, read only |
| 3.6b | `…/build/vendor/tmux-probe/3.6b/bin/tmux` (1,387,056) | `build-tmux-version.mjs` |
| 3.7b | `/private/var/tmp/tortie-wt/wt-p349/build/vendor/tmux/bin/tmux` (1,437,872, sha256 `d7002f7d…`) | the vendored ship copy, read only |
| 3.7c | `…/build/vendor/tmux-probe/3.7c/bin/tmux` (1,437,872) | `build-tmux-version.mjs` |

### 2.2 M2: the far round trips (D3, the stated far wait), 2026-10-21

The loopback machine (`build/scratch-machine.mjs`) with the quiet shell, a scratch far home and
`SCRATCH_MACHINE_NO_OWN_KEYS=1`; an ssh wrapper with `-F none` and the yard's key; commands composed by the shipped
`tmuxCommand`; 30 rounds each. With the connection already open, on 3.7b a far rename's `rename-session` took p50 14.5
ms, and the three trips together (the rename, the `@gmux-name` stamp and the far list the verb waits for,
`remote-sessions.ts:2296-2331`) p50 42.9, p95 77.1 and max 82.4 ms; on 3.6a the three together p50 42.7, p95 49.6 and
max 52.9 ms. On a new connection: 81 ms and 71 ms. All of it under 1% of the door's 15,000 ms
(`ANSWER_TIMEOUT_MS`, `src/main/pocket/door/limits.ts:35`). Far read-back: 9 of 10 names came back exactly, in both the
tmux name and `@gmux-name`; the zero-width-joined family came back as `______ fam`, because the carriage forwards no
UTF-8 locale and tmux sends one `_` per cell, which is an older limit and not this phase's (§12.1). The door's own
POST-to-answer time needs the app and a door, so it is `probe:p349` RN4's.

M2 ran OUTSIDE the history block, measured necessarily: sshd's own privilege-separation sandbox fails inside
`sandbox-exec` (`sandbox initialization failed: Operation not permitted`; the first try exited 1 with `Connection
reset`). His history did not move across the run.

### 2.3 M3: the phone (D1, D11, D18, D19, D20), 2026-10-21

An iPhone 16 Pro and an iPhone SE (3rd generation) on iOS 26.3.1 and 18.3.1, through `withSimulator` under one lock
slot. Two `cp -Rc` copies of `ios/`, the parent and a throwaway prototype, each built once (19.8 s and 19.9 s), the
derived data removed afterwards.

- **The row menu**, on all four pairs: a native `.contextMenu` on `RowView` leaves the tap opening the Terminal; the
  Rename item is found by its identifier (`row-rename-<id>`, a button) and by its words; End these still ticks the row
  and offers no menu; a menu with empty content draws nothing on a long press.
- **The ⋯ with three items** (Catch Me Up, Rename, End session…) draws them in order, each found by identifier, 42 pt
  apart on 26.3 and 44 pt on 18.3.
- **The Rename sheet**: the keyboard comes up at once; the field's bottom sits 291 pt (SE) and 391 pt (16 Pro) above
  the keyboard; the first focus selects the whole name.
- **The field comparison**: under XCUITest's typing in the Simulator, BOTH a SwiftUI `TextField` and the UIKit field
  kept `it's "x" fix--auth` exactly, on all four pairs. M3 cannot show the difference D11 exists for; the UIKit field
  stands on the API's ground, and his device check is on the CHECKLIST (§13).
- **D18**: a SwiftUI `.accessibilityIdentifier` on the representable REPLACES the UIKit view's own identifier.
- **D19**: New session's Name row moves Create down 85.67 to 86 pt. On the SE with the keyboard up, the bottom 7 pt
  (26.3) and 3 pt (18.3) of Create sit under the keyboard; Create stays hittable.
- **The known 18.3 harness crash** (XCTAutomationSupport's log callback) ended two arms, the 16 Pro row arm and the SE
  start arm; each was re-run once on a fresh device and read whole. All four device runs were deleted with 0 left.

### 2.4 The numbers re-derived (D5, D6; R4)

- **R4's route pin.** Today's is `2f5feba1e9a0250faa601217a7ad7d3787a05cab3d70c571b64c3bd878343163`, reproduced; with
  `POST /v1/rename` it is `3ba0fec56446be39e7ec0e15b17053cfcb1cbcb05d4448201c78cb7c078ed706`, by two methods (node's
  `createHash('sha256')` over the fifteen sorted lines joined by a newline, `--write-route-pin`'s method; and `sort |
  perl -pe 'chomp if eof' | shasum -a 256`). **(rebuild)** Both re-derived at `40aebfcc` from `door/table.ts`'s TEXT
  (never imported), both ways, the same two values.
- **The worst rename bodies** (`{"name":…,"session":"<128>","write":"<32 hex>"}`): 915 bytes for 120 C0 units each
  escaped `\u00XX`, and the same for 60 astral characters escaped as surrogate pairs; 435 bytes for 120 quotes or Swift
  slashes; 555 bytes raw (120 three-byte characters). So the 2,048-byte cap is 2.2 times the worst.
- **The pairing codes.** The two vector pairing codes (`ios/TortieTests/Fixtures/vectors.json`'s `qr` payloads) are 289
  and 290 UTF-16 units, the one-shot secret's key at units 239 and 240, so the 120-unit cap can never hold a whole code,
  and no cut of one under it holds the secret.

### 2.5 The parent's frames (build 12, over See a sample), 2026-10-21

Read on the four device pairs, the "at least the parent's" of §8.2: a long press on a row does nothing; the ⋯ (`More`)
holds exactly Catch Me Up and End session…; New session has 0 text fields; Create is at `[16, 353.33, 370, 50]` on the
16 Pro at 26.3 and `[16, 322, 343, 50]` on the SE at 26.3; the "+" presses 50 × 36 on 26.3 and 54 × 44 on 18.3 (348's
stated trade, his ruling of 2026-10-20).

### 2.6 History, and what the spec step did not run, 2026-10-21

`~/.zsh_history` read `739283 1792544948` at the start and changed to `739327 1792546034` between two commands that
both ran under the history block, so that was his own terminal; `~/.bash_history` read `23166 1790702242` throughout.
Neither moved across any of the step's commands, including the three kinds that cannot run under the block
(xcodebuild, sshd and the Simulator runs, each with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and
`TERM_SESSION_ID` unset). **(rebuild)** `741827 1793377397` and `23166 1790702242` at the rebuild's first command and
after every command since; neither moved.

Not run, and why: (1) no name holding `#(` was sent (§2.1); (2) the door's own POST-to-answer time for a rename needs
the app and a door, so it is RN4's (§8.1); (3) no Electron, agent or real Tailscale, DNS or APNs, and no ssh to a real
host. At the end: no tmux, sshd, agent or ssh master of the step's left; 0 `p316-` devices; all three lock slots free;
80 GiB free.

---

## 3. The tree at this head, re-read (the entry's citations, corrected)

The entry's line numbers are origin/main's of `1eb477bf`, before 348 landed; the rebuild re-read every one this spec
builds on at `40aebfcc` (whose product code is `266d7d91`'s, the tree the first spec read). **Four corrections the
first spec made from reading the tree, each carried into a decision:**

1. **`src/shared/session-names.ts` ALREADY EXISTS** (`:1-44`: Phase 346's `nextOrdinal`, `dedupedName`,
   `ordinalName`), so D5's rule is added to it (D5).
2. **There is an EIGHTH place a tmux name is composed**: the remote restore (`src/main/machines/remote-restore.ts:486-494`,
   which maps `$` by hand), pinned byte for byte by `conformance:machines` condition 148
   (`build/conformance-machines.mjs:15531`), so that clause moves on purpose (D16). The other seven are the entry's:
   `src/main/tmux/sessions.ts:170`, `:220`; `src/main/sessions/core.ts:3338`, `:3347`;
   `src/main/sessions/launch-plan.ts:439`; `src/main/manifest/reconstruct.ts:927`; and `farTmuxName`
   (`src/main/machines/remote-sessions.ts:1082-1084`) at the far create and rename (`:1777`, `:2296`). The local
   restore needs no change: it creates through `tmux.createSession({ displayName: rec.name })`
   (`src/main/restore/restore.ts:1025-1026`), so `sessions.ts:170`'s rule reaches it.
3. **The far stamp's escape belongs in `remoteStampArgs`** (`src/main/machines/remote-stamps.ts:42-48`), the one
   composer of every stamp, not at the rename's call site (D15).
4. **Both of `remoteRename`'s warnings interpolate `err.message`** (`remote-sessions.ts:2305-2308`, the stamp; and
   `:2324-2327`, the manifest write), and an exec error's message carries the command and so the name
   (`src/main/machines/exec-plane.ts:868-871`; `src/main/tmux/errors.ts:67`): both log the error's code instead (§4.3
   step 7).

**What holds as the entry cites it** (unchanged since `1eb477bf`): the Mac's one rename `core.renameSession`
(`core.ts:3301-3352`; the blank refusal `:3310-3312`; the remote branch `:3316-3320`, its broadcast `:3318`; tmux by
`$`-id then the manifest `:3324-3341`; the ended session `:3342-3349`; the broadcast `:3350`); the echo handler
(`:1765-1774`); the renderer's trim (`src/renderer/state/sessions-slice.ts:1296-1302`); main's lifecycle gate with no
rename refusal (`src/main/sessions/lifecycle-gate.ts:59-117`); the shared gate's `acts` and `canRename`
(`src/shared/session-gates.ts:278`, `:295`); `boundRemoteRow` and `TARGET_UNBOUND` (`remote-sessions.ts:2254-2264`);
`remoteSessionRow` reading `rows` and `gone` (`:1190-1199`); `farTmuxName`'s comment on flags (`:1073-1078`); the far
list a rename waits for (`:2331`); `nameOf` (`:3336-3339`); `sanitizeSessionName` (`src/main/tmux/names.ts:43-51`,
`AMBIGUOUS` `:17`, the map `:48`, the cut `:49`), `dedupeSessionName` (`:59-68`), `formatSessionTarget` (`:75-77`);
`sessions.ts`'s create (`:166-174`), rename (`:206-227`, its `rename-session` `:224`, its `includeControl` dedupe
`:214-217`) and `resolvePaneTarget` (`:260-268`); the control session (`control-client.ts:116`,
`CONTROL_ATTACH_ARGS` `:144-150`); Clear and capture handed the tmux name (`src/renderer/terminal/terminal-menu.ts:238`;
`src/main/capture/service.ts:153`, `:206`); attach by `$`-id (`src/main/attach/attach-plan.ts:98-104`); the remote
ledger's `rename-session` row (`exec-plane.ts:349-354`); the stamp composer (`remote-stamps.ts:47`); the Mac's words
`Rename` (`src/renderer/app/session-actions.tsx:930`) and `Save name` (`src/renderer/session-manager/copy.ts:633`), its
field's cap and spell check (`src/renderer/session-manager/InlinePanel.tsx:336-337`), ⌘T's `Name`
(`src/renderer/app/CreateSessionModal.tsx:1377-1380`) and the draft a phone's rename drops
(`session-actions.tsx:1183-1188`); `Rename Session` on F2 (`src/main/menu.ts:902`); the alert title
(`src/main/push/alert.ts:100`); far tmux from 3.2a (`src/main/tmux/version.ts:216`); the route ledger's rule
(`src/main/pocket/route-ledger.ts:18-20`); the door's answer bound (`door/limits.ts:35`); one Allow to every waiting
route (`src/main/pocket/allowed-routes.ts:56-83`); the start's done answer (`src/main/sessions/pocket-start.ts:502`)
already bound to its `$`-id (`src/main/sessions/create-local.ts:695-696`); the phone's strict `end` read
(`ios/Tortie/Door/Contract.swift:197`); the start comment (`ios/Tortie/Door/DoorClient.swift:79-86`); New session's
header (`ios/Tortie/Screens/Start.swift:5-11`) and its kept start (`:102-123`); `Copy.sortName`
(`ios/Tortie/Style/Copy.swift:121`); CopyTests' one-declaration clause (`ios/TortieTests/CopyTests.swift:16-27`);
`MessageStrip`'s reason for UIKit (`ios/Tortie/Screens/MessageStrip.swift:125-143`); an ended session's Catch Me Up
(`ios/Tortie/Screens/SessionScreen.swift:16-19`); the word reader (`ios/TortieTests/StyleSource.swift:195-220`); the
one-shot secret (`ios/Tortie/Door/Pairing.swift:45`); the sample's book (`ios/Tortie/Sample/SampleBook.swift:4-14`);
the store checklist's two lines (`build/p333/STORE-CHECKLIST.md:149`, `:165`); `MAC_LIMITS` and `FROZEN_SETS_FLOOR`
(`build/assert-door-only-adds.mjs:297-308`, `:252`) and `ASK_ROWS` (`build/p33311/swift-wire.mjs:157-163`); (au)
(`build/conformance-ios.mjs:451`); the `docs/BACKLOG.md` lines the entry names.

**What 348 moved, at this head** (the entry's line, then this tree's):

| What | Entry (`1eb477bf`) | `40aebfcc` |
| --- | --- | --- |
| `POCKET_ROUTES` | `door/table.ts:110-123` | `src/main/pocket/door/table.ts:120-135`; its start comment `:102-109`, 348's `:111-118` |
| the route ids | `pocket.ts:106-155` | `POCKET_ROUTE_IDS` `src/shared/ipc/pocket.ts:118-153`, `POCKET_WRITE_ROUTE_IDS` `:176`, `POCKET_SESSION_WRITE_IDS` `:188`, `LEGACY_ALLOWED_ROUTES` `:205-217` |
| the write list in the header, its rename sentence | `pocket.ts:47-73`, `:72-73` | `:47-95`, `:83-84` ("Nothing here can set a status, start a process by itself, or restore, restart, resize or rename a session.") |
| a blocked row's `end`, the detail, a Sessions row's `end` | `pocket.ts:221`, `:405`, `:575` | `:321` (`PocketBlockedRow` `:243-322`), `PocketSessionDetail` `:429` (its `endConfirm` `:465`), `PocketSessionsRow` `:610-639` (`end` `:638`) |
| the sessions budget; the answer's `start` | `pocket.ts:557`; `:703` | `POCKET_SESSIONS_BUDGET_BYTES` `:592`; `start?` `:738` (`PocketSessionsAnswer` `:685-739`) |
| `POCKET_HONESTY_ADDED`, `POCKET_FACE_CLAUSES`, `POCKET_NEW_ROUTE_WORDS` | `pocket.ts:1338`, `:1471`, `:1498` | `:1452-1459`, `:1590-1607`, `:1622-1636` |
| `PocketStartAnswer`; 348's `PocketRemoveAnswer` | — | `:880-894`; `:990-999` |
| `DoorWriteRoute`, `WRITE_ROUTES` | `door/wire.ts:136`, `:324` | `:137`, `:325` |
| `POCKET_WRITE_BODY_CAPS` | `door/limits.ts:43-83` | comment `:43-97`, value `:98` |
| the ledger rows | — | `route-ledger.ts:63-78` (start `:75`, remove `:76`, paste `:77`) |
| `WRITE_CLAUSES` | `pairing.ts:426-432` | `:431-439` |
| the seven steps; the session verbs' branch | `writes.ts:1-80` | header `:1-98`; the branch `:943-1075` (STEP 1 `:957-976`, STEP 2 `:981-1002`, STEP 3 `:1004-1014`, `still` `:1019-1020`, STEP 4 and 5 `:1022-1054`, STEP 6 `:1058-1062`, STEP 7 `:1064-1066`) |
| the ledger key | `writes.ts:693` | `keyOf` `:912` |
| one in flight per phone and per session | `writes.ts:780-786` | `:1004-1014` |
| say's text parse | `writes.ts:413-421` | `parseSayBody` `:448-462` |
| start's keys, own-bytes rule, parse, its malformed | `writes.ts:172`, `:326-341`, `:491-500`, `:494` | `START_KEYS` `:196`, `onlyItsOwnBytes` `:364-382`, `parseStartBody` `:577-588`, its key check `:580` |
| start's one in flight and rate | `writes.ts:683`, `:187-189` | `writeStart` STEP 3 `:1130-1149`; `START_RATE_MAX` `:211`, `START_RATE_WINDOW_MS` `:213` |
| 348's `doorAnswer`; `startActOf`; `removeActedOf` | 348: `writes.ts:782` | `:782-803`; `:707-718`; `:812-819` |
| `PocketWrites` | `routes.ts:462` | `:504-542` ("SEVEN members and no eighth", `:501-502`) |
| rows carry End's offer; the list's clip; the name whole | `routes.ts:658`, `:1917`; `:1909`; `:636` | `rowOf` `:689-737` (`end` `:735`, `name` `:713`); the Sessions row `:2054-2066` (`name` clipped `:2056`, `end` `:2064`); the answer `:2112-2124` (`start` last, `:2123`) |
| `startAllowed()` | `ipc.ts:904-906` | `:907-909` (`removeAllowed` `:917-919`, `pasteAllowed` `:927-929`) |
| the wiring | `capabilities.ts:429-451` | `createPocketWrites` `:461-471`, `createPocketFacts` `:472-492` |
| R3's verb list; its `renameSession` reason | `conformance-pocket.mjs:1441-1449`, `:1447` | `FORBIDDEN` `:1534-…`, `['renameSession', 'a write verb']` `:1540` |
| X5's forbidden list; `NS_NOT_THE_ACT`; `NS_WRITE_IDS` | `:7067`; `:14632` | `NOT_THE_DOORS` `:7230`; `:15119`; `:15096` |
| R4's pin | — | `ROUTE_PIN` `:1201`, `routeLines` `:1214-1243` |
| T25 | `conformance-manager.mjs:138` | its row `:159`, its clause `:1398-…` |
| (aa3)'s `SESSIONS_TEXT_IN`; bb4's `START_NEVER` | `conformance-ios.mjs:6954`; `:16458` | `:7250`; `:17269` |
| `OWNER_CHECK_ABSENT`; (k)'s pinned `RowView` line; (ay) | `:5809`; `:1745`; 348: `:13952` | `:6010`; `:1822`; `:13866` |
| rule (t)'s Start arms | 348: `:18010` | `HOSTILE_START_ARMS` `:17684-17697` |
| rule (s) | 348: `:3291`, `:8491-8492` | `PHONE_BUILD = '12'` `:3487`; its next-build fixtures `:8791-8792` |
| `SAMPLE_MAY_NAME`, `SAMPLE_MAY_CALL`, `SAMPLE_REACH` | — | `:16099`, `:16138`, `:16150` |
| probe:p316's `gradeE1`, `gradePs10Menu`, `gradePm1` | `probe-p316.mjs:3829`, `:6512`, `:7396` | `:4100`, `:7454`, `:8336`; 348's `gradeRv1` `:6378` |
| probe:p316's `=name` reads | `:12655`, `:13577-13579` | `:14012`, `:14934-14936`, `:14954`, `:15004-15005`, `:15101`, `:15132`, `:15187` |
| the detail decoding the row | `Contract.swift:721-722` | `:877`; `PocketBlockedRow` `:148`, `PocketSessionsRow` `:1035` (`end` `:1076`), `PocketSessionsAnswer` `:1379` |
| `start`'s lenient read | `Contract.swift:1267` | `:1423-1426` |
| `StartResult`'s classification | `DoorClient.swift:920-966` | `:1027-1074`; `RemoveResult` `:1083-…`; `signedPost` `:543`; `WriteRoute` `:725-…`; `StartBody` `:836`, `RemoveBody` `:846` |
| New session's "no name" | `StartSheet.swift:19-20` | `:21-22` |
| what the app never does | `TortieApp.swift:89-100` | `:91-106` |
| the lists not a `List` | `SessionsScreen.swift:690-691` | `:701-702` |
| the ⋯ | 348: `SessionScreen.swift:459-588` | `TerminalMenu` `:460-478`, `TerminalMenuControl` `:499-589` (the menu `:563-585`, Remove's confirmation `:587`) |
| End these' environment | `ListScreen.swift:543` | `@Environment(\.endBatch)` `:538`; `RowView` `:530-603`, its `.onTapGesture(perform: tapped)` `:591`; `ListNames` `:310-337` |
| the two-item menu test | `TerminalMenuTests.swift:162` | `testOneMenuOfTwoItemsInOrder` `:164` |
| `HELPER_USER_FLOOR` | — | `build/assert-electron-teardown.mjs:529` (178) |
| `SIMULATOR_USER_FLOOR` | — | `build/assert-simulator-teardown.mjs:229` (5) |

**Also read for this phase.** `hiddenAgentsBesides` (`build/hidden-agents.mjs:105`), `writeHiddenAgents` (`:133`),
`standInsOnlyVerdict` (`:166`), `hiddenAgentsPrecheck` (`:219`); `OWNED_RULE_FLOOR` 109
(`build/p311/copy-drift.mjs:1414`), `checkTerminalFaces` (`:1615`), `PHONE_MAC_FLOOR` 90 (`:1762`);
`constants.start` (`build/p3333/sample.mjs:587`, `:787`); test:ios's start and Phase 348 doors
(`build/p316/test-ios.mjs:136-164`, `:1177-1283`); the frozen sets `launch`, `build-11`, `build-12`
(`ios/TortieTests/Fixtures/frozen/`, each read record naming `Contract.swift`, `DoorClient.swift` and
`SessionsScreen.swift`, e.g. `build-11.wire.json:9-17`, its start request `:685-697`); the mocks
(`docs/design/phone/`, 24 frames in `index.html`); the older probes' route and write lines
(`build/p317/probe-p317.mjs:175`, `:185`; `build/p318/probe-p318.mjs:221-222`; `build/p337/probe-p337.mjs:199-200`;
`build/p3167/probe-p3167.mjs:169`; `build/probe-p313.mjs:301`; `build/p348/probe-p348.mjs:928-929`);
`ios/TortieTests/EndTopTests.swift:56` (the `TerminalMenu(...)` line it pins).

---

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The route (builder `door`)

1. **The contract** (`src/shared/ipc/pocket.ts`):
   - `POCKET_ROUTE_IDS` (`:118-153`) gains `'rename'` LAST, after `'paste'`, with its one-line comment in the house
     shape of its neighbours (`POST /v1/rename` — rename one session, after the gate (Phase 349));
     `POCKET_WRITE_ROUTE_IDS = ['end', 'choose', 'say', 'keys', 'start', 'remove', 'paste', 'rename']` (`:176`), its
     comment saying EIGHT and naming Phase 349. `POCKET_SESSION_WRITE_IDS` (`:188`) and `LEGACY_ALLOWED_ROUTES`
     (`:205-217`) DO NOT MOVE: `rename` names a session and takes the session verbs' path, but it answers a shape of its
     own, and it waits for its own Allow.
   - `export type PocketRenameReason = 'malformed' | 'gone' | 'unreachable' | 'changed' | 'name';`
   - `export interface PocketRenameAnswer { verb: 'rename'; write: string; outcome: PocketWriteOutcome; reason:
     PocketRenameReason | null; sentence: string | null; name: string | null; }`: Start's six fields with `name` in
     `session`'s place (`PocketStartAnswer`, `:880-894`), with `PocketWriteAnswer`'s invariants (`write` `""` only on
     the one `refused` `malformed` that has none; `reason` non-null exactly when `refused`; `sentence` null exactly when
     `done`) and one more: `name`, the name main STORED, a non-empty string exactly when `done` (D21), else null. Its
     comment says the phone reads `reason` as an OPEN word. Never a `PocketWriteAnswer`, whose verb and reasons the
     frozen phones read as closed sets (348 D27).
   - `PocketBlockedRow` (`:243-322`, and so `PocketSessionDetail`) and `PocketSessionsRow` (`:610-639`) gain
     `rename?: boolean;`, its comment: present, and `true`, exactly when `rename` is served and the verdict (the name
     aside) passes now (D14); ABSENT otherwise and on a Mac older than this phase, which reads as no Rename.
   - `PocketSessionsAnswer` (`:685-739`) gains `renames?: boolean;`, OUTSIDE `start`, its comment: present, and
     `true`, exactly while `rename` is served, so a fault in it never hides the "+" (NS9; bb5).
   - `POCKET_HONESTY_ADDED` (`:1452-1459`) gains `rename: 'rename a session'` after `paste`; `POCKET_FACE_CLAUSES`
     (`:1590-1607`) gains `rename: 'rename sessions'`; `POCKET_NEW_ROUTE_WORDS` (`:1622-1636`) gains `rename: { title:
     'rename sessions from your phone', sentence: 'Name a session as you start it, or rename one later.' }` (add only;
     D10).
   - The header's write list (`:47-95`) says EIGHT and gains `rename` ("asks main to rename ONE session, through the
     gate the Mac's own Rename asks, by the Mac's own verb; on another machine only while it runs. Its answer is
     {@link PocketRenameAnswer}"), and its sentence at `:83-84` no longer says a phone cannot rename: "Nothing here can
     set a status, start a process by itself, or restore, restart or resize a session."
2. **The door** (`src/main/pocket/door/table.ts`, `door/limits.ts`, `door/wire.ts`, `route-ledger.ts`, `pairing.ts`):
   - `POCKET_ROUTES` (`table.ts:120-135`) appends
     `{ id: 'rename', method: 'POST', path: '/v1/rename', reads: false, windowOnly: false, signed: true }`, and the
     table's comment gains a paragraph for it (a signed `POST` alive outside any window, through the same one write
     path and ledger; its body names one session, a name and a write id, and nothing else; it waits for its own Allow,
     Phase 333.12). The start paragraph (`:102-109`) stops implying a phone names nothing: its body still names no
     path, flag, name or login, and a name typed in New session goes after it as a rename.
   - `POCKET_WRITE_BODY_CAPS` (`limits.ts:98`) gains `rename: 2_048`, its comment deriving it from the worst legal body
     (§2.4: `{"name":"<120 units each escaped \u00XX>","session":"<128>","write":"<32 hex>"}` is 915 bytes; 60 astral
     characters escaped as surrogate pairs 915; 120 quotes 435; raw 555), more than twice the worst, and a longer name
     later.
   - `door/wire.ts`: `DoorWriteRoute` (`:137`) and `WRITE_ROUTES` (`:325`) gain `'rename'`.
   - `POCKET_ROUTE_LEDGER` (`route-ledger.ts:63-78`) appends, after `paste`, ONE literal row and touches nothing else:
     `{ id: 'rename', method: 'POST', path: '/v1/rename', reads: false, signed: true, windowOnly: false, bodyCap: 2048, clause: 'rename a session' }`.
   - `WRITE_CLAUSES` (`pairing.ts:431-439`) gains `rename: 'rename a session'`.
3. **Until a person presses Allow** the route is not served: the door answers `404 route` before reading the body and
   forwards nothing; no row carries `rename` and no answer carries `renames` (both ask `renameAllowed()`, §4.2 step 6);
   Settings then Phone draws `New: rename sessions from your phone` and its sentence above an Allow of its own (D13).

### 4.2 The body, the answer, the write path and the offers (builder `door`)

1. **The body** (`src/main/pocket/writes.ts`): `const RENAME_KEYS = 'name,session,write';` beside `REMOVE_KEYS`
   (`:184`), and `export function parseRenameBody(body: Buffer): PocketRenameBody` through the ONE `JSON.parse`
   (`objectOf`, `:400-411`): the keys compared exactly with `RENAME_KEYS`; `write` by `isWriteId`, `session` by
   `isSessionId` (one character at a time, `:385-394`); `name` any string (`typeof name === 'string'`), the empty one
   included, as say's text is (`parseSayBody`, `:448-462`): its rules are the verb's, each with its sentence, and
   nothing here strips, trims or normalizes it. NOT held to `onlyItsOwnBytes` (D6): an escaped character is legal in a
   name, and a key given twice keeps its last value. A malformed body echoes its write id (`echoOf`, `:416-420`).
2. **The answer**: `export function renameAnswer(write, outcome, reason, sentence, name): string`, beside
   `removeAnswer`, composing the six fields one by one in the order verb, write, outcome, reason, sentence, name;
   exported for the vectors and the tests. `doorAnswer` (`:782-803`) gains its `rename` arm (`renameAnswer(write,
   outcome, reason, sentence, null)`), so a `busy` and a `malformed` are the verb's own shape.
3. **The path.** `rename` takes the session verbs' branch (`:943-1075`) as `remove` does: STEP 1's ladder names it
   explicitly (`verb === 'rename' ? parseRenameBody(body)`), `paste` staying the fall-through; STEP 2's ledger is keyed
   on phone, verb and write id (`keyOf`, `:912`); STEP 3's claims hold one write in flight per phone and per session
   ACROSS verbs (`:1004-1014`), so a rename and an End, keys or a paste never overlap on one session; STEP 4's last
   check asks `routeServed(verb)` last; STEP 5 starts `renameSettled(() => writes.rename({ sessionId: parsed.session,
   name: parsed.name }), parsed.write)` in the statement right after the last check, nothing between; `renameSettled`
   and `renameActedOf` are `removeSettled` and `removeActedOf` (`:812-838`) for the rename's shape, a rejection or a
   throw before the promise exists reading `failed` with `RENAME_FAILED`, and a `done` whose `name` is not a non-empty
   string read `failed` with `RENAME_FAILED` (D21). Steps 2 to 4, 6 and 7 do not move: STEP 7's one log line names the
   verb, the outcome word and the session id, never the name.
4. **The act's type** (`src/main/pocket/routes.ts`, `PocketWrites`, `:504-542`), after `paste`, its comment saying
   EIGHT members and no ninth:
   ```ts
   /**
    * Rename ONE session (Phase 349, build/p349/SPEC.md §4.3): the gate the Mac's Rename asks over the row
    * re-read by id, a session on another machine only while it runs, and the one name rule, then the Mac's
    * own rename with the trimmed name. It sets no status and logs nothing. Answers an outcome and never throws.
    */
   rename(input: { sessionId: string; name: string }): Promise<PocketRenameOutcome>;

   export type PocketRenameOutcome =
     | { outcome: 'done'; name: string }
     | { outcome: 'refused'; reason: Exclude<PocketRenameReason, 'malformed'>; sentence: string }
     | { outcome: 'failed'; sentence: string };
   ```
5. **The offers in the door** (`routes.ts`): `PocketFacts` (`:261-…`) gains `renameOffer?(session: Session): boolean;`
   and `renames?(): boolean;`, each a READ, absent from a host with no writes. `rowOf` (`:689-737`) adds
   `...(facts.renameOffer?.(session) === true ? { rename: true } : {})` after `end`, so the detail inherits it; the
   Sessions row composer (`:2054-2066`) the same after its `end`, inside the budget's measure (D14). The Sessions
   answer (`:2112-2124`) adds `...(facts.renames?.() === true ? { renames: true } : {})` BEFORE `start`, never inside
   it, so `start` stays last (NS9).
6. **The wiring.** `src/main/pocket/facts.ts` passes `renameOffer` and `renames` through as it passes `endOffer` and
   `start` (`:390-396`); `src/main/pocket/ipc.ts` gains `renameAllowed(): boolean { return this.routeServed('rename');
   }` beside `startAllowed()` (`:907-909`), NEVER a write's check (the write path asks `routeServed` itself);
   `src/main/capabilities.ts`'s facts (`:472-492`) hand `renameOffer: (session) => pocketHost?.renameAllowed() ===
   true && pocketWrites.renameOffer(session)` and `renames: () => pocketHost?.renameAllowed() === true`, so a Mac whose
   Allow waits offers nothing.

### 4.3 The verb and the two name rules (builder `verb`)

1. **The one name rule** (`src/shared/session-names.ts`, EXISTING, D5 corrected), below Phase 346's functions, its
   header widened to name both:
   ```ts
   /** The most UTF-16 units a session name may hold: the Mac sheet's own field (InlinePanel.tsx `maxLength={120}`). */
   export const SESSION_NAME_MAX_UNITS = 120;
   export const SESSION_NAME_EMPTY = 'Session name cannot be empty.';
   export const SESSION_NAME_TOO_LONG = 'That name is too long.';
   export const SESSION_NAME_CHARACTER = 'That name holds a character Tortie does not use.';
   export type SessionNameReason = 'empty' | 'long' | 'character';
   /** ECMAScript's own trim, which is how the Mac trims a name (sessions-slice.ts). */
   export function trimmedSessionName(name: string): string;
   /** Why a name is refused, in this order, or null: read one code unit at a time, no pattern. */
   export function sessionNameRefusal(name: string): { reason: SessionNameReason; sentence: string } | null;
   ```
   Over `trimmedSessionName(name)`: `empty` when no unit is left; `long` over `SESSION_NAME_MAX_UNITS` units; then
   `character` at the first refused unit: U+0000 to U+001F (TAB, LF and CR included), U+007F, U+0080 to U+009F,
   U+202A to U+202E, U+2066 to U+2069, U+2028, U+2029, a high surrogate not followed by a low one, or a low surrogate
   not preceded by a high one. A valid pair passes. Anything else passes, a duplicate included. Pure: no clock, no I/O.
2. **The third environment** (`src/shared/session-gates.ts`, D4): `DOOR_RENAME_GATE_ENV` after `DOOR_REMOVE_GATE_ENV`
   (`:342-347`), frozen, its comment saying the door asks `canRename` of it and nothing else, and that `canRename`
   reads none of any environment; the two existing environments' comments widen to say the door asks `canEnd` of the
   first, `canRemove` of the second and `canRename` of the third, and nothing else of any.
3. **The words** (`src/shared/lifecycle-words.ts`, after `REMOVE_FAILED` `:177`): `RENAME_FAILED` and
   `RENAME_UNREACHABLE` (§5.1).
4. **The verb** (`src/main/sessions/pocket-writes.ts`):
   - `PocketWritesCore` (`:105-127`) gains `renameSession(input: { sessionId: string; name: string }): Promise<Session>`
     ("the Mac's own rename, unchanged: tmux by `$`-id then the manifest, the far branch through `remoteRename`, the
     broadcast; it throws `INVALID_INPUT` and `SESSION_NOT_FOUND`"), which the core satisfies as it stands.
   - A PURE `export function renameVerdict(session: Session | undefined, name: string): PocketRenameVerdict`, its five
     arms in this order, each saying which gate owns it: (1) no listed row → `gone`, `SESSION_NOT_FOUND`; (2) the row
     `unknown` → `unreachable`, `RENAME_UNREACHABLE`; (3) `sessionActionGates(session, session.status,
     DOOR_RENAME_GATE_ENV).canRename` false → `changed`, `LIFECYCLE_SESSION_CHANGED`; (4) a row on another machine
     (`session.machine !== undefined`) that is not live (`running`, `idle`, `needs_input`) → `changed`,
     `LIFECYCLE_SESSION_CHANGED` (D3; the first build wrote it as a `runsNow` switch over every status, so a status
     added to the alphabet is a compile error); (5) `sessionNameRefusal(name)` non-null → `name`, its sentence. It
     reads `.canRename` and nothing else of the gate, and asks neither of main's gates.
   - `export function renameTargetVerdict(session)` (the first four arms, the name aside: the first build asks
     `renameVerdict(session, 'a')`, which the rule always passes) and `export function renameOfferOf(session): boolean`
     (that verdict passing), for the offer and the sample.
   - `createPocketWrites` gains `renameOffer(session: Session): boolean` (a READ: `renameOfferOf`) and
     `async rename(input)`: `deps.core()` null → `failed` `RENAME_FAILED`; the row re-read by id
     (`core.listSessions().find(...)`); `renameVerdict(session, input.name)`; refused → its arm; then the FIRST AWAIT,
     `await core.renameSession({ sessionId: input.sessionId, name: trimmedSessionName(input.name) })`, nothing awaited
     between the verdict and the verb (the verb broadcasts itself, `core.ts:3318`, `:3350`); `done` with the name main
     stored. A throw is told apart BY CODE ONLY, no error's text read: `SESSION_NOT_FOUND` → `refused` `gone`
     `SESSION_NOT_FOUND`; `INVALID_INPUT` (`TARGET_UNBOUND`, the row left a far machine's list) → `refused` `changed`
     `LIFECYCLE_SESSION_CHANGED`; anything else → `failed` `RENAME_FAILED`. No status setter, no `noteUserInput`, no
     log, nothing that names a machine's verb.
5. **D7 in `src/main/tmux/names.ts`**: `export function holdBackTmuxSyntax(name: string): string`, applied LAST inside
   `sanitizeSessionName`, after the 200-character cut and before the empty fallback (D17), every replacement one unit
   for one unit: every backslash; every `#` whose next character is one of `{ ( # , }` or `D F H I P S T W h`, and a
   `#` that is the last character; a final `;`; a leading `-` or `$`; each becomes `_`, each `#` judged by the
   character that followed it in the name handed in. `export const RESERVED_TMUX_NAMES: readonly string[] =
   Object.freeze(['gmux-control'])`, and `dedupeSessionName` treats every one as always taken, with a vitest pinning
   the list equal to `[CONTROL_SESSION_NAME]`. The header's rules list gains step 6, with M1's measured reason.
   `farTmuxName`'s body is unchanged (`remote-sessions.ts:1082-1084`): it now composes D7's far rule, `$` still `_`.
6. **D15 in `src/main/machines/remote-stamps.ts`**: `remoteStampArgs` sends a value whose last character is `;` with
   that one `;` replaced by two characters, a backslash then `;` (the value's other characters, and every value that
   does not end in `;`, unchanged); its comment cites §2.1's far-stamp measurement. A backslash typed into the source
   is written as `String.fromCharCode(92)` or checked after the write: in the first build's tool input a backslash
   directly before `;` was dropped.
7. **`remoteRename`'s two warnings** (`remote-sessions.ts:2305-2308`, `:2324-2327`) log the error's CODE
   (`gmuxErrorPayloadOf(err)?.code ?? 'unknown'`) and never its text, which can carry the command and so the name.
   Nothing else in `remoteRename` moves.
8. **D16 in `src/main/machines/remote-restore.ts:486-494`**: `const tmuxName = farTmuxName(record.tmuxName.length > 0
   ? record.tmuxName : record.name, new Set());`, its comment saying why (the far rule, D7 with it, no dedupe, as
   today), and `conformance:machines` condition 148's restore clause (`build/conformance-machines.mjs:15531`) moves to
   that line on purpose, with an `ablation:p342` arm (`b148e`) that reads it red.
9. **`conformance:manager`** (`build/p293/conformance-manager.mjs`): T25 (its row `:159`, its clause `:1398-…`) reads
   `renameVerdict` too (it imports `DOOR_RENAME_GATE_ENV` and `sessionNameRefusal`, asks `sessionActionGates(` ONCE
   with that environment and reads only `.canRename`, asks neither `endRefusal(` nor `removeRefusal(`, keeps the far
   arm, calls the name rule after the gate; `renameTargetVerdict` asks no gate itself), and G2 gains the driven Rename
   partition of §10.3 with a self-test of planted changes each read red.
10. **`probe:p349`** (new, §8.1), its fixtures, `build/p349/CHECKLIST.md` (§13), `package.json`'s script, its
    `build/verification-checks.mjs` classification and `HELPER_USER_FLOOR` 178 → 179.

### 4.4 The phone's door and the Rename sheet (builder `phone-door`)

1. **The contract** (`ios/Tortie/Door/Contract.swift`): `PocketBlockedRow` (`:148`, which the detail decodes as its
   row, `:877`) gains `var rename: Bool = false`, decoded STRICTLY beside `end` (`:197`): `rename = try c.decodeIfPresent(Bool.self,
   forKey: .rename) ?? false`, so a key that is not a Boolean makes the list unreadable, as a row missing a field does,
   and absent or null reads false; `PocketSessionsRow` (`:1035`) the same. `PocketSessionsAnswer` (`:1379`) gains `var
   renames: Bool = false`, decoded LENIENTLY beside `start`'s read (`:1423-1426`) and never inside it: anything but a
   Boolean `true` reads false and fails nothing else. `PocketRenameAnswer`: six fields, `verb` the literal `rename`,
   `reason` an open `String?` read for its sentence only, `name` non-nil exactly when `done`, with `PocketStartAnswer`'s
   invariants, refused WHOLE otherwise.
2. **The client** (`ios/Tortie/Door/DoorClient.swift`): `WriteRoute.rename(session: String, name: String)` with
   `static let renameTarget = "/v1/rename"`; `struct RenameBody: Encodable, Sendable { let name: String; let session:
   String; let write: String }`, sorted keys, built in `signedPost` (`:543`) alone; `func rename(_ sessionId: String,
   name: String, door: PairedDoor) async -> RenameResult` through `signedPost` with a FRESH write id every press and
   none kept (D9), never retried; `enum RenameResult` (cases `answered(PocketRenameAnswer)`, `notTaken`, `noAnswer`
   and `notSent(DoorFailure)`, and `withheld` true for `notSent(.cancelled)`) classified EXACTLY as `RemoveResult` is
   (`:1083-…`): by `handed`, a 200 an
   answer only when it names the rename and echoes the id this write carried. The header's comment (`:60-100`) gains
   the eighth write and stops saying nothing on the phone chooses a name (`:79-86`): the start still names none, and
   a name goes after it as a rename.
3. **The words of the door** (`ios/Tortie/Screens/DoorWords.swift`): `protocol DoorRenaming: Sendable { func
   rename(_ sessionId: String, name: String) async -> RenameResult }` (the first build added `func session(_
   sessionId: String) async throws -> PocketSessionAnswer`, §0.2); `DoorReading.renamer: (any DoorRenaming)? { get }`,
   `nil` by default in `extension DoorReading` as `starter` and `remover` are; and `static func renameSentence(for
   result: RenameResult, sample: Bool) -> String`, ALWAYS a sentence (rule (v)): the sample → `Copy.startSample`; a
   `done` → `Copy.rename` (the Mac's own word, as `removeSentence`'s done is `Copy.remove`, `:573-587`; §6 item 3); any
   other answer → the Mac's sentence, else `Copy.answerUnreadable`; `notTaken` and a write withheld
   (`notSent(.cancelled)`) → `Copy.renameNotTaken`; `noAnswer` → `Copy.endNoAnswer`; any other not sent → its
   failure's sentence.
4. **The one field** (`ios/Tortie/Screens/NameField.swift`, new): `struct NameField: UIViewRepresentable` over the app's
   ONE `UITextField` (`@Binding var text: String`, `identifier: String`, `label: String`, `focusOnAppear: Bool`,
   `onReturn: () -> Void`). `makeUIView` turns off `smartQuotesType`, `smartDashesType`, `smartInsertDeleteType`,
   `autocorrectionType`, `autocapitalizationType` and `spellCheckingType`, and sets the identifier and the accessibility
   label there ONLY (D18); its coordinator's `textField(_:shouldChangeCharactersIn:replacementString:)` refuses an edit
   whose result passes `NameRule.maxUnits` UTF-16 units; the FIRST focus selects the whole text; Return calls
   `onReturn`. Beside it `enum NameRule`: `static let maxUnits = 120`, `static func trimmed(_:)` with ECMAScript's
   EXACT trim set (U+0009 to U+000D, U+0020, U+00A0, U+1680, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F, U+3000
   and U+FEFF: 25 code points), and `static func refusal(_:)` in the Mac's order with the Mac's three sentences (§5.2),
   held to the Mac by the shared vectors' `names` section (rule (j), bd6). Its own file, because (aa3) and bb4 keep
   text fields out of `SessionsScreen.swift` and the Start files.
5. **Rename** (`ios/Tortie/Screens/SessionName.swift`, new; (au) is already "THE RENAME" of Catch Me Up,
   `build/conformance-ios.mjs:451`): `protocol RenameRegistry: AnyObject { func registerRename(_ runner: RenameRunner);
   func releaseRename(_ runner: RenameRunner) }`; `final class RenameRunner`, ONE target and one name fixed at the
   press, registered with the registry BEFORE its task starts, stopped by `AppModel.wentAway`, never retried, its `run`
   the app's ONE call of `rename(`; `@MainActor final class RenameModel` (the session id, the held name, the field's
   text, its phase, its line, `readsFirst`, `sample`) with `canSave` (off while the rule refuses the trimmed text, the
   trimmed text equals the held name as bytes, a read or a write runs, or a row's first read has not come back with
   `rename` true); and `struct SessionNameSheet: View`, in New session's family: the title `Rename`, `Cancel` leading
   and `Save name` trailing, the `NameField` focused on appear with the whole name selected, and ONE line under it drawn
   only when it has a sentence. Return saves whenever Save would. Done closes the sheet and reads the session again;
   a refusal keeps the sheet, his text and the Mac's sentence; a 404 or a withheld write draws `Copy.renameNotTaken`;
   no answer draws `Copy.endNoAnswer`, only over a read of the session that came back after it, as 348's Remove does.
   No owner check (`OWNER_CHECK_ABSENT`). D20: opened from a row the model reads `/v1/session` first; from the ⋯ it
   reads nothing more.
6. **New session's Name** (`ios/Tortie/Screens/Start.swift`, D2, D12): `StartSetup` (`:137-148`) gains `renamer: (any
   DoorRenaming)?` and `renameRegistry: (any RenameRegistry)?`; `opened` gains a third argument, `(_ id: String, _ name:
   String, _ line: String?)`; `StartModel` gains `name` (the field's text) and `renames` (the Sessions answer's). An
   empty trimmed name: Create sends today's start BYTE FOR BYTE (`StartBody`, `agent,project,write`), unchanged. A
   name: Create reads `Creating…` through the start, then, from the start's done arm, ONE `RenameRunner` registered
   before its task with the name fixed at the press (the local `pendingName`, §6 item 6), aimed at the id the start
   answered; then `opened(id, name, line)` with the name the rename answered when it was done, else the Mac's name and
   `renameSentence(for:sample:)` on the opened page's one line (where End's and Remove's are drawn). Nothing is
   retried, and the name is NEVER held in `KeptStart` (`:102-123`). The header (`:5-11`) stops saying nothing on the
   phone chooses a name.
7. **The hostile door** (`build/p316/hostile-door.mjs`) gains the rename arms, each named so rule (t) reads it, each
   graded on what the phone draws and on the relay's count:
   `rename-key-not-boolean`, `rename-key-null` and `rename-key-huge` (the Sessions answer's `renames` not a Boolean
   `true`: no Name drawn, the "+" stays, the list drawn); `rename-row-not-boolean` and
   `rename-blocked-row-not-boolean` (a Sessions row's and a Needs input row's `rename` not a Boolean: the list reads
   unreadable, as the `missing-fields` arm does); `rename-detail-not-boolean` (the session reads unreadable);
   `rename-answer-wrong-verb`, `rename-answer-no-echo`, `rename-answer-done-no-name` and
   `rename-answer-name-when-refused` (each not an answer this write can take: `Copy.endNoAnswer` over a read of the
   session); `rename-answer-unknown-reason` (an open word: the Mac's sentence drawn); `rename-404`
   (`Copy.renameNotTaken`). Twelve, and none of Start's `refused-no-reason`, `2mib`, `chunked` or `hold` (the probe
   review's finding 3, a stated narrowing).
8. **test:ios's transport door** (`build/p316/test-ios.mjs`): `P349_SUITES` (`RenameTests`, `NameFieldTests`,
   `RenameClientTests`, `P349RenameTransportTests`), each named in xcodebuild's own suite lines, and a listener under
   door A's key and admission, as Phase 348's (`:1225-1283`), taking `POST /v1/rename` verified as the vectors' phone
   over the method, path and BODY, recording every body byte for byte, answering `done` with the body's write id
   echoed and the name it carried as the stored name (`renameAnswerFor`).

### 4.5 The phone's faces (builder `faces`)

1. **The Terminal's ⋯** (`ios/Tortie/Screens/SessionScreen.swift`, `TerminalMenuControl` `:499-589`): Rename is the
   SECOND item, after Catch Me Up and before End session… or Remove, `Label(Copy.rename, systemImage: "pencil")` with
   `.accessibilityIdentifier(ID.terminalMenuRename)`, drawn ONLY where a renamer exists and the latest detail's
   `rename` is true. `SessionNameSheet` is attached to the control OUTSIDE the menu's items, as the confirmations are
   (`.endConfirmation` on the menu, `.removeConfirmation` on the control, `:586-587`), so it presents once the menu has
   closed. End session… and Remove do not move. `SessionDrawing` (`:56-…`) carries `rename` from the detail.
2. **The rows** (`ios/Tortie/Screens/ListScreen.swift`): `RowDrawing.rename`; a `RenameRowsAction` environment value
   (`@Entry var renameRows`) declared here, as End these' is reached (`:538`); `RowView` (`:530-603`) attaches
   `.contextMenu` right AFTER `.onTapGesture(perform: tapped)` (`:591`) holding Rename ALONE (`Label(Copy.rename,
   systemImage: "pencil")`, `names.rowRename(row.id)`), its content EMPTY while End these takes taps
   (`batch?.takesTaps`) or with no offer, which M3 measured draws nothing on a long press and leaves the tap and End
   these unchanged. `ListNames` (`:310-337`) gains `rowRename` (`row-rename-<id>` on Sessions, `needs-row-rename-<id>`
   on Needs input). Needs input and the older-Mac face present the sheet ONCE per tab (`.sheet(item:)`). (k)'s pinned
   line (`ListScreen.swift:486`) does NOT move.
3. **Sessions** (`ios/Tortie/Screens/SessionsScreen.swift`): its rows carry `rename`; `SessionsTab` attaches the same
   action, one sheet over both faces, as End these does; New session is handed the answer's `renames`. NO text field
   here ((aa3) unchanged).
4. **New session's Name row** (`ios/Tortie/Screens/StartSheet.swift`): under Agent, `RaisedLabel(Copy.sortName)` over
   `NameField(text:, identifier: ID.startName, label: Copy.sortName, focusOnAppear: false)`, empty, NOT focused when
   the sheet opens, Return hiding the keyboard (D19), disabled while a start runs, drawn ONLY where `model.renames` is
   true. `opened` takes three arguments. The header (`:21-22`) drops "no name".
5. **See a sample** (`ios/Tortie/Sample/**`, `sample.json` excepted): `SampleReader` is its own `DoorRenaming`
   (`renamer` answers itself) and its `rename` answers `.notTaken` without asking anything, so Save name and a named
   Create say `This is a sample, so nothing ran.` (`renameSentence(for:sample: true)`) and the book's names never
   change (`SampleBook.swift:4-14`); `SampleBook` copies `constants.renames` onto every Sessions answer as it copies
   `constants.start`.
6. **The mocks and their gate** (`docs/design/phone/**`, `build/p311/copy-drift.mjs`): `TerminalMenu.html` and 348's
   `TerminalMenuRemove.html` draw Rename second; a new `Rename.html` (the sheet at open, the keyboard up) and a row
   menu frame (`RowMenu.html`, a held row with Rename alone), each with its own iframe in `index.html`;
   `checkTerminalFaces` (`:1615`) reads Catch Me Up, Rename, then End session… or Remove, the sheet's bar order and the
   held row's menu; `PHONE_MAC_FLOOR` rises past 348's 90 (`:1762`) and `OWNED_RULE_FLOOR` past 109 (`:1414`).

---

## 5. Every word and identifier this phase adds, moves or keeps (spelled once, here)

### 5.1 The Mac's words (builders `door` and `verb`)

| Constant | File | Value | Builder |
| --- | --- | --- | --- |
| `SESSION_NAME_MAX_UNITS` | `src/shared/session-names.ts` | `120` | verb |
| `SESSION_NAME_EMPTY` | `src/shared/session-names.ts` | `'Session name cannot be empty.'` (the Mac's own, `core.ts:3311`, byte for byte) | verb |
| `SESSION_NAME_TOO_LONG` | `src/shared/session-names.ts` | `'That name is too long.'` (as `src/renderer/tree/entry-name.ts:65` says it) | verb |
| `SESSION_NAME_CHARACTER` | `src/shared/session-names.ts` | `'That name holds a character Tortie does not use.'` (decided by the rebuild, §0.1) | verb |
| `RENAME_FAILED` | `src/shared/lifecycle-words.ts` | `'Tortie could not rename this session.'` | verb |
| `RENAME_UNREACHABLE` | `src/shared/lifecycle-words.ts` | `'Tortie cannot see whether this session is running, so it cannot rename it.'` | verb |
| `POCKET_HONESTY_ADDED.rename` | `src/shared/ipc/pocket.ts` | `'rename a session'` | door |
| `POCKET_FACE_CLAUSES.rename` | `src/shared/ipc/pocket.ts` | `'rename sessions'` | door |
| `POCKET_NEW_ROUTE_WORDS.rename` | `src/shared/ipc/pocket.ts` | `{ title: 'rename sessions from your phone', sentence: 'Name a session as you start it, or rename one later.' }` | door |
| `WRITE_CLAUSES.rename`, the ledger row's `clause` | `src/main/pocket/pairing.ts`, `route-ledger.ts` | `'rename a session'` | door |
| `POCKET_WRITE_BODY_CAPS.rename`, the ledger row's `bodyCap` | `src/main/pocket/door/limits.ts`, `route-ledger.ts` | `2_048` / `2048` | door |

The rename's other refusals are words main already says: `SESSION_NOT_FOUND` (`gone`), `LIFECYCLE_SESSION_CHANGED`
(`changed`), and the door's own `POCKET_WRITE_SENTENCES.unreadable` (`malformed`) and `.busy`. RN9 holds each of the
three name sentences declared ONCE, in `session-names.ts`, beside the Mac's own throw of the first in
`renameSessionAdmitted` (`core.ts:3311`), which does not move.

The honesty sentence over every route a person allowed then reads `<POCKET_DOOR_HONESTY> It can also start a session
in a project open in Tortie, on this Mac or another machine, remove a session that has ended, paste text into a session
on this Mac and rename a session.` (`pocketDoorHonesty`, `pocket.ts:1475-1486`, the clauses in the table's key order).
The Allow's write line names `rename a session` after paste's clause, and its face says `New: rename sessions from
your phone` with `Name a session as you start it, or rename one later.` while it waits.

### 5.2 The phone's words (`ios/Tortie/Style/Copy.swift`, INTEGRATOR, from `P349DoorWords.swift`)

| Name | Owner line (the comment above it; rule (b) and CopyTests) | Value | Staged by |
| --- | --- | --- | --- |
| `rename` | `/// Mac: src/renderer/app/session-actions.tsx ⟦label: 'Rename',⟧` | `Rename` | phone-door |
| `saveName` | `/// Mac: src/renderer/session-manager/copy.ts ⟦SAVE_NAME = 'Save name'⟧` | `Save name` | phone-door |
| `nameEmpty` | `/// Mac: src/shared/session-names.ts ⟦SESSION_NAME_EMPTY = 'Session name cannot be empty.'⟧` | `Session name cannot be empty.` | phone-door |
| `nameTooLong` | `/// Mac: src/shared/session-names.ts ⟦SESSION_NAME_TOO_LONG = 'That name is too long.'⟧` | `That name is too long.` | phone-door |
| `nameCharacter` | `/// Mac: src/shared/session-names.ts ⟦SESSION_NAME_CHARACTER = 'That name holds a character Tortie does not use.'⟧` | `That name holds a character Tortie does not use.` | phone-door |
| `renameNotTaken` | `/// Phone: the door refused the rename before acting (a 404), or the app left before its bytes were handed` | `Your Mac did not rename it. Nothing was changed.` | phone-door |

Six words, five of them the Mac's own (so `conformance:phonecopy`'s `PHONE_MAC_FLOOR` rises from 90 to 95) and four of
them sentences. Reused, never declared again (CopyTests: a word is declared once): `Copy.sortName` (`Name`, New
session's label, `:121`), `Copy.cancel` (`:417`), `Copy.endNoAnswer` (`:564`), `Copy.startSample` (`This is a sample,
so nothing ran.`, `:856`), `Copy.creating` (`:837`), `Copy.answerUnreadable`. The section's MARK names Phase 349,
`Rename.html` and this table, and says a rename asks no Face ID (his ruling) and that its refusals are the Mac's own
sentences.

### 5.3 The identifiers (`ios/Tortie/Screens/Identifiers.swift`, INTEGRATOR, with its comment table)

| Name | Value | What it names | Staged by |
| --- | --- | --- | --- |
| `terminalMenuRename` | `terminal-menu-rename` | Rename in the Terminal's ⋯, a menu item | faces |
| `rowRename(_:)` | `row-rename-<id>` | Rename in a Sessions row's long-press menu, a button (M3 found it by this) | faces |
| `needsRowRename(_:)` | `needs-row-rename-<id>` | the same on a Needs input row | faces |
| `startName` | `start-name` | New session's Name field, set in `makeUIView` (D18) | phone-door |
| `renameSheet` | `rename-sheet` | the Rename sheet | phone-door |
| `renameField` | `rename-field` | its field, set in `makeUIView` (D18) | phone-door |
| `renameSave` | `rename-save` | `Save name` | phone-door |
| `renameCancel` | `rename-cancel` | `Cancel` | phone-door |
| `renameLine` | `rename-line` | the sheet's one line, present only when it has a sentence | phone-door |
| `renameWriting` | `rename-writing` | the progress mark while its write runs | phone-door |

Nothing is removed. `start-open`, `list-select`, `list-menu`, `terminal-menu`, `terminal-menu-catch-up`,
`terminal-menu-end` and `terminal-menu-remove` keep their values and places.

---

## 6. What moves on purpose (each red ON PURPOSE in the same commit, and named in its report)

Carried from the entry's "What moves on purpose" whole, numbered; this spec adds the rows marked **(spec)**.

1. **conformance:pocket** (builder `door`; §7.1). R2 (the writes are exactly EIGHT); R3's reason for `renameSession`
   (`build/conformance-pocket.mjs:1540`) reworded naming his request, as 346 did for `createSession` and 348 for
   `removeSession`, the door still never naming the verb; R4's membership pin moved to `3ba0fec5…`; X1 to X6, X11 and
   X12 widened to the eighth verb; X5's forbidden list (`NOT_THE_DOORS`, `:7230`) LOSES `renameSession`, which
   `pocket-writes.ts` now calls exactly once, inside `rename`, after `renameVerdict(`, while `NS_NOT_THE_ACT`
   (`:15119`) KEEPS it out of `pocket-start.ts`; Y1 (the caps); NS1 (`start, remove, paste, rename` last), `NS_WRITE_IDS`
   (`:15096`) and NS11 (eight members); AR9 (one more ledger row); G1 counts a rename body's name among what no log call
   may reach; and the new **RN** family (RN1 to RN10). **(spec)** The vitests, ablations and probes that spell the
   routes or caps are FOUND BY SEARCH, not from memory: the door builder runs
   `grep -rn "'remove', 'paste'\|\"remove\", \"paste\"\|start, remove, paste\|remove,paste\|paste: 'paste into a session'\|paste text into a session on this Mac\|fourteen" src build ios`
   over its own files before it returns and names each hit it moved (348 found and fixed the same kind,
   `build/p348/SPEC.md:1083-1090`); a hit that names fourteen routes as a frozen record of an older build (a ledger
   row, a frozen wire) is left alone and named as such. Known hits: `src/main/pocket/__tests__/door-wire.test.ts`,
   `ipc.test.ts`, `p318-body-caps.test.ts`, `p33312-served.test.ts`, `p333121-face.test.ts`, `p346-start-key.test.ts`,
   `p346-start-write.test.ts`, `p348-paste-write.test.ts`, `p348-remove-write.test.ts`, `pairing.test.ts`,
   `routes.test.ts`, `writes.test.ts`; `build/ablation-p313.mjs:6433-6434`, `:6959-6960`, `:7062`, `:7858`;
   `build/p33311/ablation.mjs` (the arms reading the moved tables); the probes' route and write lines
   (`build/p317/probe-p317.mjs:175`, `:185`; `build/p318/probe-p318.mjs:221-222`; `build/p337/probe-p337.mjs:199-200`;
   `build/p3167/probe-p3167.mjs:169`; `build/probe-p313.mjs:301`; `build/p348/probe-p348.mjs:928-929`).
2. **conformance:manager** (builder `verb`). T25 (`build/p293/conformance-manager.mjs:159`, its clause `:1398-…`)
   reads `renameVerdict`, and G2 gains a driven Rename partition (§10.3). **conformance:machines, conformance:remoteclose
   and conformance:farattach** run for `remote-sessions.ts`; condition 148's restore clause
   (`build/conformance-machines.mjs:15531`) moves to D16's line on purpose, and `ablation:p342` gains an arm for it.
   `src/main/tmux/__tests__/names.test.ts` gains the mapping, idempotence over seeded names and the reserved name pinned
   to `CONTROL_SESSION_NAME`; `src/main/machines/__tests__/p342-far-names.test.ts` and `remote-restore.test.ts` move
   with D7, D15 and D16; `src/shared/__tests__/p317-session-gates.test.ts` keeps its two environments' tests, and a
   sibling holds `DOOR_RENAME_GATE_ENV` and that `canRename` reads none of any environment.
3. **conformance:ios, the door's rules** (INTEGRATOR; §7.3). (ab) gains `RenameBody` (`name,session,write`) and
   `DoorClient.rename` among `signedPost`'s callers; (ac) gains `Screens/SessionName.swift` and `Screens/NameField.swift`
   in `OWNER_CHECK_ABSENT` (`build/conformance-ios.mjs:6010`); (ad) the rename runner, made at the press and registered
   before its task, the one made in the named Create's done arm stated; (t) widens to the rename over the transport and
   the hostile door's twelve rename arms (§4.4 step 7); **(v) widens to `renameSentence(for:sample:)`, ALWAYS a
   sentence, its done arm `Copy.rename`** (the Mac's own word, as `removeSentence`'s done is `Copy.remove`); (az)'s
   lists (`SAMPLE_MAY_NAME` `:16099`, `SAMPLE_REACH` `:16150`, `SAMPLE_MAY_CALL` `:16138`) gain `DoorRenaming`,
   `RenameResult` and `renamer`, and the sample's `Copy.rename`; (ba) the rename goes to the Mac whose space drew it
   (ba1, ba2); (j) the vectors' new `rename` and `names` sections, regenerated once; (b) the staged words, cleared by the
   fold.
4. **conformance:ios, the faces' rules** (INTEGRATOR). (ay) (`:13866`) reads the ⋯ as Catch Me Up, Rename, then End's or
   Remove's item: its entries `Button, Button, EndMenuItem, RemoveMenuItem`, Rename behind `if let rename`, and one
   `.sheet(item: $renaming)` outside the menu's items; (at) wherever `TerminalMenu`'s call changes (the first build
   used a copy method, `.renaming(_:)`, so `ios/TortieTests/EndTopTests.swift:56`'s pinned line holds); (aa3) and (k)'s
   pinned line (`:1822`, `ListScreen.swift:486`) do NOT move; and the new rule **(bd), A SESSION'S NAME** (§7.3).
5. **The phone's tests** (each builder its own, the integrator CopyTests). `TerminalMenuTests.testOneMenuOfTwoItemsInOrder`
   (`ios/TortieTests/TerminalMenuTests.swift:164`) becomes `testOneMenuOfThreeItemsInOrder` and reads three items, its
   confirmation, trailing-item and words tests widened; CopyTests pins the six new words and their owners;
   `StartContractTests`, `DoorContractTests`, `DoorClientTests`, `DoorVectorTests` (the `names` section held to the
   Mac's vectors) and `DoorWordsTests` widen; `ScreensDrawingTests`, `SessionsTests` and `SampleReaderTests` gain the
   faces' rows; the new `RenameTests`, `NameFieldTests`, `RenameClientTests` and `P349RenameTransportTests`
   (`P349_SUITES`).
6. **New session** (phone-door's `Start.swift`, the INTEGRATOR's bb rules). **bb4 is rewritten on purpose**: two ids and
   a write id still reach the start (`StartBody` holds exactly `agent`, `project` and `write`), and the sheet may hold
   the ONE field, a `NameField(` over the app's one `UITextField`, which the `\bTextField\b` of `START_NEVER`
   (`build/conformance-ios.mjs:17269`) and `SESSIONS_TEXT_IN` (`:7250`) never matched; every other word `START_NEVER`
   refuses still refuses. **bb5**: `renames` is read leniently beside `start` and never inside it, so a fault in it
   never hides the "+". **bb9 opens the session after the rename's answer**: in the start's done arm a named Create
   holds the typed name in the local `pendingName`, fixed at the press, makes ONE `RenameRunner` from it, and calls
   `opened(id, name, line)` only once that rename answered or failed; the name is never written to `KeptStart`.
   `StartTests` keeps `testOnlyTheTwoIdsAndAWriteIdLeaveThePhone` and gains the two writes (the start's bytes
   unchanged, then one rename to the answered id).
7. **probe:p316** (INTEGRATOR). `gradeE1` (`build/p316/probe-p316.mjs:4100`), `gradePs10Menu` (`:7454`), `gradePm1`
   (`:8336`) and 348's RV arms (`gradeRv1` `:6378`) read the ⋯ as Catch Me Up, Rename, then End session… or Remove; the
   new `rename` group (§8.2) with its self-test cases; the existing `=name` reads (`:14012`, `:14934-14936`, `:14954`,
   `:15004-15005`, `:15101`, `:15132`, `:15187`) stay on sessions the probe never renames, and the group reads tmux by
   `$`-id only.
8. **conformance:phonecopy** (builder `faces`). `TerminalMenu.html` and `TerminalMenuRemove.html` draw Rename second,
   `checkTerminalFaces` widening with them; the sheet and the row menu each get a frame with its own iframe in
   `index.html`; `PHONE_MAC_FLOOR` rises past 348's 90; the owned rules for Rename and Save name are held to the Mac's
   own modules.
9. **gate:onlyadd** (builder `door`). `MAC_LIMITS` (`build/assert-door-only-adds.mjs:297-308`) gains
   `{ mac: 'SESSION_NAME_MAX_UNITS', file: 'src/shared/session-names.ts' }` and `{ mac: 'POCKET_WRITE_BODY_CAPS.rename',
   file: 'src/main/pocket/door/limits.ts' }`, and `ASK_ROWS` (`build/p33311/swift-wire.mjs:157-163`) gains `{ phone:
   'NameRule.maxUnits', sum: ['NameRule.maxUnits'], mac: 'SESSION_NAME_MAX_UNITS', macFile: 'src/shared/session-names.ts',
   rule: 'mac>=phone' }`, so no later Mac lowers either under a frozen phone (D5). The frozen sets `launch`, `build-11`
   and `build-12` do NOT move and are NEVER resealed, because a route and optional keys are adds; P0 to P4 are re-run,
   because `Contract.swift`, `DoorClient.swift` and `SessionsScreen.swift` are in each set's read record
   (`build-11.wire.json:9-17`).
10. **What does not move.** `/v1/start`, with NS3, NS4 and NS7; gate:contract, because no IPC channel is added (its
    baseline holds no door route); the Mac's native menus (`Rename Session` stays on F2, `src/main/menu.ts:902`); the
    Mac's own `sessions:rename` and `core.renameSession`, but for the shared tmux name (D7).

---

## 7. The gates that move, on purpose

### 7.1 `conformance:pocket` (`build/conformance-pocket.mjs`, builder `door`)

- **R4's pin**: the sorted `METHOD path` lines (`routeLines`, `:1214-1243`) with `POST /v1/rename` hash to
  `3ba0fec56446be39e7ec0e15b17053cfcb1cbcb05d4448201c78cb7c078ed706` (§2.4, re-derived two ways before the table holds
  the row; `--write-route-pin` rewrites it on purpose), the comment above `ROUTE_PIN` (`:1201`) gaining Phase 349's
  paragraph beside 346's and 348's. `LEGACY_ROUTE_PIN` (`ea5930e0…`, `:1211`) does not move.
- **R2, R3, X1 to X6, X11, X12, Y1, NS1, NS11, AR9, G1** widen as §6 item 1 says. X5: "pocket-writes.ts calls
  `renameSession(` exactly once, inside `rename`, after `renameVerdict(` refused nothing, with nothing awaited between",
  and its gate clause reads `canEnd` of `DOOR_GATE_ENV` for `end`, `canRemove` of `DOOR_REMOVE_GATE_ENV` for `remove`
  and `canRename` of `DOOR_RENAME_GATE_ENV` for `rename`, never another field of any. Beyond the entry's list, the
  first build found the rename necessarily reddens PS1, SU5, Z1, Z2 and AF2 too (§0.2): each moves on purpose and is
  named.
- **NEW family RN (Rename)**, each a rule with its own self-test and ablation arm:
  - **RN1, THE ROUTE**: exactly one rename row, `POST /v1/rename`, signed, a write, `windowOnly: false`, last in
    `POCKET_ROUTES`, `POCKET_ROUTE_IDS` and `POCKET_WRITE_ROUTE_IDS`; its ledger row a literal, `bodyCap: 2048`,
    `clause: 'rename a session'`, equal to `WRITE_CLAUSES.rename` and `POCKET_HONESTY_ADDED.rename`; the face clause
    and the New line D10's exact words; `rename` in neither `LEGACY_ALLOWED_ROUTES` nor `POCKET_SESSION_WRITE_IDS`.
  - **RN2, THE BODY**: `parseRenameBody` compares the sorted keys with exactly `name,session,write`, reads `session` by
    `isSessionId` and `write` by `isWriteId`, takes `name` as any string, and does NOT ask `onlyItsOwnBytes(`.
  - **RN3, THE ANSWER**: `PocketRenameAnswer` is exactly the six fields in order, `verb` the literal `rename`,
    `PocketRenameReason` exactly `malformed`, `gone`, `unreachable`, `changed` and `name`; `renameAnswer` composes the
    six one by one; `doorAnswer` has its `rename` arm.
  - **RN4, THE PATH**: the session branch takes `rename` (STEP 1's ladder names it), and STEP 5 starts
    `renameSettled(` in the statement right after the last check, `renameActedOf` answering only the three shapes and
    a `done` without a non-empty name `failed` (D21).
  - **RN5, THE VERDICT'S ORDER**: `renameVerdict` is pure (no await, no call outside the gate and the rule), and its
    arms run gone, unreachable, the gate's `changed`, the far `changed`, then `name`; it reads `.canRename` of
    `DOOR_RENAME_GATE_ENV` and nothing else, and asks neither `endRefusal(` nor `removeRefusal(`.
  - **RN6, THE FIRST AWAIT**: in `rename`, `renameVerdict(` precedes the one `await`, which is
    `core.renameSession(` handed `trimmedSessionName(` of the name; nothing is awaited between them.
  - **RN7, CODES ONLY**: a throw is told apart by `isGmuxError` code alone; no `.message` of a caught value is read in
    the rename path.
  - **RN8, NOTHING ELSE**: nothing in the rename path sets a status, calls `noteUserInput(`, kills, logs, or names a
    machine's verb.
  - **RN9, THE ONE RULE**: `sessionNameRefusal`, `trimmedSessionName` and `SESSION_NAME_MAX_UNITS` are declared once,
    in `src/shared/session-names.ts`; each of the three sentences is declared once there (beside the Mac's own throw of
    the first in `renameSessionAdmitted`, `core.ts:3311`); on the Mac the door's verb alone reads the rule.
  - **RN10, THE OFFERS AND THE FAR LOG**: `rename: true` is set only by the two row composers and only when
    `facts.renameOffer?.(` answered true; `renames: true` only by the Sessions answer, beside `start` and never inside
    it; the wiring asks `renameAllowed()` before `renameOffer(`; and `remoteRename`'s two warnings log a code and never
    an error's text.

### 7.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`, run by `build/p313/hostile-client.mjs`; builder `door`) and `ablation:p313`

The hostile client drives, through the door's own listener, over a recording `PocketWrites`, beside the honest arms,
each graded on its reason word AND on main's row unchanged (a recording core):

- **RNH0**: `rename` on a door whose allowed set does not hold it: `404 route` before the body, nothing forwarded.
- **RNH1**: an honest rename acting once with its exact fields; **RNH1b**: the answer is the six fields, the name the
  one main stored (trimmed).
- **RNH2**: the same bytes again: the recorded answer, renamed once. **RNH3**: the same write id fresh-signed: the
  recorded answer, renamed once.
- **RNH4**: a rename and an End on one session from two phones: `busy` (the name it types reads `as it ends`, §0.2).
- **RNH5**: a rename while the same phone's keys write runs: `busy`; **RNH5b**: counted, the session renamed by
  neither.
- **RNH6**: every refused name (empty, spaces only, 121 units, each refused code unit as a JSON escape, a lone
  surrogate as `\ud800`): `refused` `name` with its sentence, nothing changed.
- **RNH7**: a body of 2,049 bytes dropped at the door (`404 oversized`, main never asked), and a 2,048-byte body that
  reaches main and is answered in words.
- **RNH8**: malformed bodies, each `refused` `malformed` with its write id echoed: a key missing, an extra key,
  `batch`, start's keys, Remove's keys, a number, `null` or an object for the name, a bad session id, a bad write id,
  not JSON, an array.
- **RNH9**: an unknown id (`gone`), a removed one (`gone`), one whose status is `unknown` (`unreachable`).
- **RNH10**: an ended remote session of each kind, one in its machine's `gone` map and one a record only: `changed`,
  nothing sent to any machine.
- **RNH11**: a phone removed before the act and the door stopping before it: `404` with nothing done; never a 404
  after the act.
- **RNH12**: no name in any log line: the door's and main's lines read for every typed name, RNH6's refused names and
  RNH7's 2,048-byte name.

`ablation:p313` gains one arm per new clause of RN and per moved clause (run with `P313_ONLY` over the new and moved
arms), each red on the rule that owns it, its literals that end at `paste` moved (§6 item 1). The first build counted
59 new arms and 14 re-pointed, 793 entries (§0.3).

### 7.3 `conformance:ios` (`build/conformance-ios.mjs`, INTEGRATOR) and `ablation:p316` (INTEGRATOR)

- **(s)**: `PHONE_BUILD` `'13'` (`:3487`) and its header prose, its "not uploaded" fixtures 14 (`:8791-8792`), the SIX
  `CURRENT_PROJECT_VERSION` lines 13; and none left at 12 (build 12 is archived).
- **(b)**: the staged words folded into `Copy.swift`, each with its owner line (§5.2).
- **(ab), (ac), (ad), (t), (v), (az), (ba), (j)** as §6 item 3 says; **(ay), (at)** as §6 item 4 says; **bb4, bb5, bb9**
  as §6 item 6 says.
- **NEW (bd), A SESSION'S NAME**, each clause with its own plant:
  - **bd1**: `UITextField` is named in `Screens/NameField.swift` alone, the app's ONE; no SwiftUI `TextField`,
    `SecureField` or `TextEditor` in `SessionName.swift`, `StartSheet.swift`, `Start.swift`, `ListScreen.swift` or
    `SessionsScreen.swift`.
  - **bd2**: `makeUIView` sets `smartQuotesType`, `smartDashesType` and `spellCheckingType` to `.no`,
    `smartInsertDeleteType` to `.no`, `autocorrectionType` to `.no` and `autocapitalizationType` to `.none`.
  - **bd3**: the identifier and the accessibility label are set in `makeUIView` alone, and no `.accessibilityIdentifier(`
    is attached to a `NameField(` call (D18).
  - **bd4**: `NameRule.maxUnits` is declared once, `120`, and the cap is enforced in
    `textField(_:shouldChangeCharactersIn:replacementString:)` over UTF-16 units.
  - **bd5**: `RowView`'s `.contextMenu {` follows its `.onTapGesture(perform: tapped)`, its content guarded by a rename
    setup, the row's `rename` and `!(batch?.takesTaps ?? false)` on ONE line, so no row menu is drawn under End these,
    and it holds exactly one `Button(` (Rename, `names.rowRename(row.id)`).
  - **bd6**: the Swift rule is held to the vectors: `NameRule`'s trim set is ECMAScript's 25 code points, its refused
    ranges D5's, its order the Mac's, and `DoorVectorTests` reads every row of the `names` section.
  - **bd7**: `RenameRunner.run` is the app's only call of a renamer's `rename(`; every runner is made at a press,
    registered before its task starts, stopped by `AppModel.wentAway`, and never retried; no write id is kept.
  - **bd8**: the sheet's Save is `.disabled(` by `canSave` (the rule, the unchanged name, a running read or write, a
    row's first read), and Return saves only where Save would.
  - **bd9**: the named Create: in `Start.swift`'s done arm the typed name is the local `pendingName`, fixed at the
    press, handed to ONE `RenameRunner`, and `opened(` is called after its answer; no `KeptStart(` carries a name.
  - **bd10**: a row's `rename` decoded strictly (`decodeIfPresent(Bool.self, forKey: .rename) ?? false`) beside `end`,
    and the Sessions answer's `renames` leniently beside `start`'s read, never inside it.
- `ablation:p316`: one plant per new (bd) clause and per moved clause (`s`, `ab`, `ac`, `ad`, `ay`, `az`, `ba`, `t`,
  `v`, `bb4`, `bb5`, `bb9`), each red on the rule that owns it, every kept anchor still finding its text; run with
  `P316_ONLY` over them.

### 7.4 The rest

- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`, builder `faces`): §6 item 8; every word the redrawn mocks draw
  owned; `OWNED_RULE_FLOOR` and `PHONE_MAC_FLOOR` raised to what the run matches.
- **`conformance:manager`** (builder `verb`): T25 and G2, §4.3 step 9 and §10.3.
- **`conformance:machines`** (builder `verb`): condition 148's restore clause (D16); `src/main/tmux/names.ts` and
  `remote-stamps.ts` now reach condition 148's `farTmuxName` drive. **`conformance:remoteclose`** and
  **`conformance:farattach`** run for `remote-sessions.ts` and do not move.
- **`gate:onlyadd`** (builder `door`; §6 item 9), **`ablation:p33311`** (its arms that read the moved tables; the first
  build re-anchored C2 and R8c, R8c stale since Phase 348), **`gate:contract`** (unchanged: no IPC channel), **`gate:simulator`**
  (unchanged), **`gate:checks`**, **`gate:electron`** (`HELPER_USER_FLOOR` 178 → 179), **`gate:background`** (a
  quoted `while` reads to it as a loop and a quoted `line = …` as an assignment: §0.2's RNH4 and v62).

---

## 8. The app runs (the builders write them; the verifier runs them)

### 8.1 `probe:p349` (new, `build/p349/probe-p349.mjs`, builder `verb`), the Mac side

One Electron at HEAD, with the parent built (`P349_PARENT_CHECKOUT`, a built checkout of `40aebfcc`, whose product
code is `266d7d91`'s, or exit 2) FIRST on the same profile, one after the other and never at once; both through
`build/electron-run.mjs` inside `build/harness-socket.mjs`, on a scratch profile, HOME and socket `gmux-p349-<pid>`,
inside `build/with-scratch-machine.mjs`'s loopback machine with `SCRATCH_MACHINE_QUIET_SHELL=1`,
`SCRATCH_MACHINE_SCRATCH_HOME=1` and `SCRATCH_MACHINE_NO_OWN_KEYS=1` (a scratch far home and none of his keys); two
`build/p316/node-phone.mjs` phones; the stand-in Tailscale (`build/p330/tailscale-standin.mjs`, preflighted by sha256,
sampled every second, a real Tailscale failing the run) and the DNS stand-in (`build/p332/dns-standin.mjs`) in the
probe's own process; `build/p318/stand-in.mjs` behind scratch `claude` and `codex` (exit 2 unless a login-shell
`command -v` with the app's PATH resolves both to it); BEFORE EVERY LAUNCH `hiddenAgentsPrecheck`, then
`writeHiddenAgents(profile, prefix, hiddenAgentsBesides(['claude', 'codex']))`, then `standInsOnlyVerdict` over
`agents:list` (exit 2 unless the scan resolves only the stand-ins), and the shadow refusal of §0.2; the app handed a
CLOSED PATH (the stand-ins, one node link, the system folders). No vendor process runs and no token is spent. Every
arm is graded against the trimmed name it typed (Method 1), never against the verb's report: the manifest through its
own reader, tmux's `#{session_name}` by `$`-id on the scratch socket (D7's name, never expanded), the far
`@gmux-name` and tmux name from the loopback machine's far command log, and the list each Mac window was sent.

| Arm | What it drives | Passes when |
| --- | --- | --- |
| **RN0** the Allow | a 0.113.0-shaped store with the fourteen routes allowed, then HEAD | `rename` answers `404 route` before the body (the door's own counters: no body read); no row carries `rename` and no answer `renames`; Settings then Phone draws `New: rename sessions from your phone` with its sentence; ONE Allow, after which `rename` answers and the offers appear. The face's "Your phone can" row is not drawn over an agreement on record; recorded as not drawn (its composer is held by `p333121-face.test.ts`) |
| **RN1** Method 1's matrix | from phone A, every name of §2.1.1's corpus and of the entry's Method 1 list (`#{session_id}`, `#H`, `fix #`, `PR #12`, `a;b`, `x;`, `/review`, `.env fix`, `-x`, `$0`, `gmux-control`, `fix--auth`, `it's`, the ZWJ family, Arabic, 120 and 121 units, each refused character), over a local shell, the Claude Code stand-in, the Codex stand-in, a local ended session and a live remote shell on the loopback machine | each taken name lands as typed (trimmed) in the manifest and in the windows' list, tmux holds D7's name by `$`-id, the far `@gmux-name` reads the typed name and the far tmux name D7's far rule (read one `_` per CELL where the carriage forwards no UTF-8 locale: `farReadBackOf`, `cellsOf`); every refused name answers `refused` `name` with its sentence and nothing changes |
| **RN2** an ended remote session | the remote session the PARENT's launch ended (a record only) and one ended during this run (its machine's `gone` map) | each answers `refused` `changed` and the far command log holds no command carrying the typed name, its far D7 form or its stamp form (`RN2_TYPED`, `rn2NamesOf`) |
| **RN3** a start, then a rename | local: a real phone start of the Claude Code stand-in, then a rename to a typed name; far: a shell made on the loopback machine THROUGH THE MAC (a far start could run a real agent from his install folders), renamed from the phone at once | each lands as RN1 grades it; how long the default `<agent>-<n>` name lived is PRINTED (the stated trade) |
| **RN4** M2 in the app | a far rename, 30 rounds | the door's POST-to-answer time printed against its 15,000 ms (`ANSWER_TIMEOUT_MS`); every round answered inside it |
| **RN5** a Mac window mid-rename | the session's own project tab focused (`__p293.addProject`), its own strip tab or row clicked, then F2: an inline rename draft open IN AN INPUT WHOSE SESSION IS THE ONE RENAMED while the phone's rename lands (the fix round) | the phone's name lands, the draft is dropped (the stated trade, `session-actions.tsx:1183-1188`), every other session reads unchanged (a missing read is UNREADABLE, and so is a draft F2 opened for another session, `owner`) |
| **RN6** where the name goes | after every arm | no typed name in `app.log` or its rotated file but on the Mac's own quit-time scrollback line (`snapshotPassLine`, older than this phase, which names every session it could not write; counted apart as `appLogKnown`, §12.1), none in the door's lines or any argv the process sampler saw; every file under the harness folder, walked by its REAL path and compared canonical (`canonicalOf`, `storeOfFile`, the fix round), that holds a typed name is one of the named stores (the manifest, the manifest's own backup ring `gmux/backups/manifest.db.<n>` and its staged `.part`, the snapshot capsules, the run's far log, an alert's title); any other file FAILS |
| **RN7** no name worse than the parent | the Mac's own `sessions:rename` over the corpus at the parent and at HEAD | no name reads worse at HEAD (landed where the parent failed is better; the same is the same); UNREADABLE when a parent rename op has a null display or stored name, or nothing landed at the parent |
| **RNP** the parent | the same signed requests at the parent | `POST /v1/rename` answers `404 route` with nothing forwarded; no row or answer carries `rename` or `renames` |
| **RUN** | — | every stand-in, the door and both Electrons ended; Electrons counted once at the end; a manifest copy taken BEFORE the ends holds every agent session the run started (`agentsStarted`) with argv[0] inside the run (a started session not found is UNREADABLE; with RN1 and RN3, `AGENT_ARMS`, both left out of `P349_ARMS` no agent session starts and the clause reads not run, the fix round); history unmoved, a moved history read again after `HISTORY_QUIET_MS` = 180 s (moved again is his terminal; held still FAILS; no re-read UNREADABLE) |

`--grader-self-test` grades recorded fixtures (`build/p349/fixtures/graders.json`) and starts nothing; every clause
that can say FAIL is shown red on a broken fixture of its own, and every UNREADABLE rule shown. `--preflight` and a bare
run both refuse and start nothing. `P349_KEEP=1` keeps the run folder; `P349_ARMS` narrows. Declared in `package.json`
as `probe:p349` in 348's shape (`node build/p349/probe-p349.mjs --preflight && node build/harness-socket.mjs --fresh
gmux-p349 'export GMUX_CONFIG_ROOT="$GMUX_HARNESS_DIR"; export SCRATCH_MACHINE_QUIET_SHELL=1; export
SCRATCH_MACHINE_SCRATCH_HOME=1; export SCRATCH_MACHINE_NO_OWN_KEYS=1; node build/with-scratch-machine.mjs -- node
build/p349/probe-p349.mjs'`), classified in `build/verification-checks.mjs` (`remote`, as the first build did), and
`HELPER_USER_FLOOR` 178 → 179.

### 8.2 `probe:p316`, the phone side (INTEGRATOR owns `probe-p316.mjs` and `P316DriveUITests.swift`)

A new group `rename`, on 26.3 and the 18.3 floor, beside 348's landed app, build 12 (`P349_PARENT_IOS`, `ios/` at
`40aebfcc`, which is `266d7d91`'s), and build 11's (`P348_PARENT_IOS`, `d2bb05ee`'s), both REQUIRED (an older build
not driven reads UNREADABLE). Its stand-ins and its hiding are the probe's own (`plantedResolve`; the shadow refusal
before `writeHiddenAgents`, §0.2). Arms, each read from the dump, the relay's count or the probe's own `capture-pane`
by `$`-id:

- **RM1** the ⋯ reads Catch Me Up, Rename, then End session… (a live session) or Remove (an ended one), each by
  identifier, and Rename's sheet opens titled Rename with Cancel and Save name, the whole name prefilled and selected,
  the keyboard up. A session page that could not reach the Mac draws no ⋯: its Try again is pressed once
  (`rename-reach`), and a page that press did not clear is UNREADABLE, never a ⋯ that did not open (the fix round's
  finding 14).
- **RM2** a row's long press on Sessions and on Needs input draws a menu of Rename alone (`row-rename-<id>`,
  `needs-row-rename-<id>`), a tap still opens the session, and the sheet reads `/v1/session` first: a planted
  300-character name, which the list clips at 200, is prefilled WHOLE.
- **RM3** Save sends ONE `POST /v1/rename` by the relay's count, asks no Face ID (`handle.biometry` is never needed),
  closes, and the title takes the Mac's name; tmux reads D7's name by `$`-id.
- **RM4** a refusal (the hostile door's `name` and `changed` answers, and a session removed under the sheet) keeps the
  sheet, his text and the Mac's sentence.
- **RM5** empty, unchanged and over-cap names keep Save off; the field never holds more than 120 units (a name the
  Mac holds past the cap only shrinks, the fix round). Save name is read off its BUTTON (`saveButtonOf`, XCUIElement
  type 9, from every element carrying `rename-save` in one snapshot, `saveAll`): iOS draws an `Other` wrapper at the
  button's frame that always reads enabled, the first match of any type found it, and a reading with no button is
  UNREADABLE (the fix round); RM1, RM2 and RM3 read Save the same way.
- **RM6** End these draws no row menu (a long press while it selects draws no Rename and leaves the row's selection
  as it was, which is what build 12's own app does: the verify lens measured a 1.2 s hold on a ticked row leaving it
  ticked at build 12 and at build 13, twice each; the fix round corrected "toggles the row"), beside its CONTROL: the
  same row held outside End these first (`row-menu-read` before `select:`) shows Rename by id. It is the drive's last
  act.
- **RM7** Home before the handshake withholds the write (the relay counts 0) and the sheet draws `Your Mac did not
  rename it. Nothing was changed.` Driven BEFORE RM6, its sheet then put away by Cancel (the fix round: `batch-done`
  presses Done, which End these draws only after a batch ran, so the list stayed selecting and RM7's row held an
  empty menu).
- **RM8** New session's Name is drawn only where `renames` says; left empty, Create sends today's start BYTE FOR BYTE at
  the relay (compared with the parent's own start bytes); a `start-name-read` with `missing:true` is UNREADABLE.
- **RM9** named, Create sends the start, then ONE rename to the id the start answered, and the Terminal opens under his
  name (`missing:true` UNREADABLE).
- **RM10** See a sample draws Rename and the Name on its own sessions; Save name and a named Create say `This is a
  sample, so nothing ran.`; the relay counts nothing.
- **RMP** each older app (build 12 and build 11) against the new Mac draws no Rename and no Name and its rows, ⋯ and
  start are unchanged; the new app against a 348 Mac (the parent door, which never sends `rename` or `renames`) draws
  neither; the absences need the main drive's controls (`rnControls`: RM6's row, RM8's Name).
- **RMH** the hostile door's twelve rename arms (§4.4 step 7): the key arms draw no Name and keep the "+" (needing
  `rnControls`); the row arms read unreadable, a drawn list with no sentence or with one FAILS (`sentence-missing` dump
  rows, `listRows`, as the H list arms read); the answer arms draw their line, and a ⋯ that opened with no Rename
  FAILS (RVH's rule).

The drive logs nothing per event; an arm the harness ended is UNREADABLE. `gradeE1`, `gradePs10Menu`, `gradePm1` and
the RV arms read the three items (§6 item 7). The first build's self-test held 77 rename cases at integration and 108
after the probe review (§0.2, §0.3).

### 8.3 `test:ios` (builder `phone-door` wires `build/p316/test-ios.mjs`; the phone builders write the tests)

`P349_SUITES` (`RenameTests`, `NameFieldTests`, `RenameClientTests`, `P349RenameTransportTests`), each named in
xcodebuild's own suite lines, and the transport door of §4.4 step 8: `P349RenameTransportTests` drives the SHIPPING
`DoorClient` over one exchange (a rename verified and answered; a rename of a 120-unit astral name, its body near the
915-byte worst; a write cancelled at 0.5 s while the handshake is held leaves ZERO requests, `.notSent(.cancelled)`, as
317's, 318's and 348's do); after each configuration the door's counts are read. Run on 26.3 and `P316_RUNTIME=18.3`,
Debug and Release, with `--read-app` unchanged.

---

## 9. Builders, disjoint files, and the seams

### 9.1 The table (FIXED: `table.json`'s, every file in exactly one list; a builder that finds it must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| **door** | `src/shared/ipc/pocket.ts`; `src/main/pocket/door/table.ts`; `src/main/pocket/door/limits.ts`; `src/main/pocket/door/wire.ts`; `src/main/pocket/route-ledger.ts`; `src/main/pocket/pairing.ts`; `src/main/pocket/writes.ts`; `src/main/pocket/routes.ts`; `src/main/pocket/facts.ts`; `src/main/pocket/ipc.ts`; `src/main/capabilities.ts`; `src/main/pocket/__tests__/**` (existing files that spell the routes, caps, clauses or face words; new p349-rename-write.test.ts, p349-rename-offers.test.ts); `build/conformance-pocket.mjs`; `build/p313/hostile-client.mts`; `build/ablation-p313.mjs`; `build/assert-door-only-adds.mjs`; `build/p33311/swift-wire.mjs`; `build/p33311/ablation.mjs` (only arms that read the moved tables); `build/p316/vectors.mjs`; `build/p3333/sample.mjs`; `build/p316/node-phone.mjs`; `build/probe-p313.mjs`; `build/p317/probe-p317.mjs`; `build/p318/probe-p318.mjs`; `build/p337/probe-p337.mjs`; `build/p3167/probe-p3167.mjs`; `build/p348/probe-p348.mjs` |
| **verb** | `src/shared/session-names.ts`; `src/shared/session-gates.ts`; `src/shared/lifecycle-words.ts`; `src/main/sessions/pocket-writes.ts`; `src/main/tmux/names.ts`; `src/main/machines/remote-sessions.ts`; `src/main/machines/remote-stamps.ts`; `src/main/machines/remote-restore.ts`; `src/shared/__tests__/p346-session-names.test.ts`; `src/shared/__tests__/p349-name-rule.test.ts` (new); `src/shared/__tests__/p317-session-gates.test.ts`; `src/shared/__tests__/p349-rename-gate.test.ts` (new); `src/main/sessions/__tests__/p317-pocket-writes.test.ts` (only if it lists the members); `src/main/sessions/__tests__/p349-rename-verb.test.ts` (new); `src/main/tmux/__tests__/names.test.ts`; `src/main/machines/__tests__/p342-far-names.test.ts`; `src/main/machines/__tests__/remote-restore.test.ts`; `src/main/machines/__tests__/p349-far-names.test.ts` (new); `build/p293/conformance-manager.mjs`; `build/conformance-machines.mjs` (condition 148's restore clause); `build/p342/ablation.mjs` (only an arm naming the restore line); `build/p349/probe-p349.mjs` (new); `build/p349/fixtures/**` (new); `build/p349/CHECKLIST.md` (new); `package.json` (probe:p349); `build/verification-checks.mjs` (classification of probe:p349); `build/assert-electron-teardown.mjs` (HELPER_USER_FLOOR 178 -> 179) |
| **phone-door** | `ios/Tortie/Door/Contract.swift`; `ios/Tortie/Door/DoorClient.swift`; `ios/Tortie/Screens/DoorWords.swift`; `ios/Tortie/Screens/NameField.swift` (new); `ios/Tortie/Screens/SessionName.swift` (new); `ios/Tortie/Screens/Start.swift`; `ios/Tortie/Screens/P349DoorWords.swift` (new STAGING); `ios/TortieTests/RenameTests.swift` (new); `ios/TortieTests/NameFieldTests.swift` (new); `ios/TortieTests/RenameClientTests.swift` (new); `ios/TortieTests/P349RenameTransportTests.swift` (new); `ios/TortieTests/StartTests.swift`; `ios/TortieTests/StartContractTests.swift`; `ios/TortieTests/DoorContractTests.swift`; `ios/TortieTests/DoorClientTests.swift`; `ios/TortieTests/DoorVectorTests.swift`; `ios/TortieTests/DoorWordsTests.swift`; `build/p316/hostile-door.mjs`; `build/p316/test-ios.mjs` |
| **faces** | `ios/Tortie/Screens/SessionScreen.swift`; `ios/Tortie/Screens/ListScreen.swift`; `ios/Tortie/Screens/SessionsScreen.swift`; `ios/Tortie/Screens/StartSheet.swift`; `ios/Tortie/Sample/**` (sample.json excepted); `ios/Tortie/Screens/P349FacesWords.swift` (new STAGING); `ios/TortieTests/TerminalMenuTests.swift`; `ios/TortieTests/SessionsTests.swift`; `ios/TortieTests/ScreensDrawingTests.swift`; `ios/TortieTests/SampleReaderTests.swift`; `docs/design/phone/**` (TerminalMenu.html, TerminalMenuRemove.html, Rename.html new, index.html, a row's menu frame); `build/p311/copy-drift.mjs` |
| **INTEGRATOR** | `ios/Tortie/App/TortieApp.swift`; `ios/Tortie/Screens/Identifiers.swift`; `ios/Tortie/Style/Copy.swift`; `ios/TortieUITests/P316DriveUITests.swift`; `build/p316/probe-p316.mjs`; `build/conformance-ios.mjs`; `build/p316/ablation-ios.mjs`; `CHANGELOG.md`; `CLAUDE.md`; `ios/Tortie.xcodeproj/project.pbxproj` (the six CURRENT_PROJECT_VERSION lines -> 13); `ios/TortieTests/Fixtures/vectors.json` (regenerated ONCE by node build/p316/vectors.mjs); `ios/Tortie/Sample/sample.json` (regenerated ONCE by node build/p3333/sample.mjs); `ios/TortieTests/CopyTests.swift`; tests that read TortieApp.swift's text, only if one must move: ios/TortieTests/EndTests.swift, MacsTests.swift, ReplyTests.swift, SampleAppTests.swift, ScreenSelectionTests.swift, SettingsTests.swift, StatusBarInsetTests.swift, TabsTests.swift, TerminalRouteTests.swift, UnpairTests.swift; the staging files ios/Tortie/Screens/P349DoorWords.swift and P349FacesWords.swift (folded into Copy.swift and Identifiers.swift, then deleted) |

Two files in no list met the first build, and the integrator reconciled each (§0.2):
`src/main/sessions/__tests__/p348-remove-verdict.test.ts` (its fake core needs `renameSession`, or `npm run typecheck`
stays red) and `ios/Tortie/Screens/EndBar.swift` (`EndModel.init(line:)`, for the named Create's one line). A builder
that meets either names it and leaves it to the integrator.

#### 9.1.1 The builders' briefs, as `table.json` gives them (the workflow hands each its own)

**door**, as `table.json` gives it:

> THIS IS A BUILD. Build the Mac's door for the `rename` route exactly as build/p349/SPEC.md §4.1, §4.2, §5.1, §6 and §7.1-7.2 say. The route `POST /v1/rename` is signed, a write, alive outside any window, with a 2,048-byte cap. It is appended last in POCKET_ROUTES, POCKET_ROUTE_IDS, POCKET_WRITE_ROUTE_IDS, DoorWriteRoute, WRITE_ROUTES, POCKET_WRITE_BODY_CAPS, the route ledger (a literal row, nothing else touched), WRITE_CLAUSES, POCKET_HONESTY_ADDED, POCKET_FACE_CLAUSES and POCKET_NEW_ROUTE_WORDS, using D10's exact words. It never goes in LEGACY_ALLOWED_ROUTES or POCKET_SESSION_WRITE_IDS. In writes.ts add parseRenameBody (keys exactly name,session,write; the name is any string, NOT onlyItsOwnBytes), renameAnswer (six fields in order, name non-null exactly when done), doorAnswer's rename arm, and renameSettled plus renameActedOf in step 5, in the statement right after the last check. Steps 2-4, 6 and 7 do not move. In routes.ts add PocketWrites.rename and PocketRenameOutcome, PocketFacts.renameOffer?/renames?, `rename: true` on both row composers exactly when renameOffer is true, and `renames: true` beside `start` and never inside it. Pass both through facts.ts; add ipc.ts renameAllowed() and the capabilities.ts wiring behind renameAllowed() === true. Move conformance:pocket on purpose: R2, R4 pin to 3ba0fec56446be39e7ec0e15b17053cfcb1cbcb05d4448201c78cb7c078ed706 (re-derive it two ways first), X1-X6, X11, X12, Y1, NS1, NS_WRITE_IDS, NS11, AR9, R3's renameSession reason (his request), X5 losing renameSession with its called-once check, NS_NOT_THE_ACT keeping it, G1, and the new RN1-RN10 family. Add the hostile client's rename arms (§7.2), one ablation:p313 arm per new or moved clause, and gate:onlyadd MAC_LIMITS plus ASK_ROWS rows (NameRule.maxUnits ≤ SESSION_NAME_MAX_UNITS); never reseal a frozen set. vectors.mjs gets a rename section plus a `names` section built from the verb builder's sessionNameRefusal and trimmedSessionName; sample.mjs gets renameOffer: renameOfferOf and renames: () => true; node-phone.mjs gets renameSession and renameAnswerOf. Do NOT regenerate vectors.json or sample.json (the integrator does that once). Re-point the six older probes' route and write-line checks, naming each line moved. The seam with the verb builder is exactly §9.3. Run what §10.1 lists for door (typecheck; your vitests and the full vitest under a scratch HOME; conformance:pocket; conformance:pocket:hostile; gate:onlyadd; each re-pointed probe's --grader-self-test; vectors/sample --check expected red until regeneration, named). Report every file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

**verb**, as `table.json` gives it:

> THIS IS A BUILD. Build the Mac's verb and both name rules, as build/p349/SPEC.md §4.3, §5.1, §6, §8.1 and §10.3 say. (1) In the EXISTING src/shared/session-names.ts (D5 corrected): SESSION_NAME_MAX_UNITS = 120, the three sentences, and sessionNameRefusal over name.trim() (order: empty, then over 120 UTF-16 units, then a refused code unit: C0, DEL, C1, U+202A-U+202E, U+2066-U+2069, U+2028/U+2029, an unpaired surrogate), read one unit at a time; plus trimmedSessionName. (2) DOOR_RENAME_GATE_ENV, with a test that canRename reads none of any env. (3) RENAME_FAILED and RENAME_UNREACHABLE in lifecycle-words.ts. (4) In pocket-writes.ts: PocketWritesCore.renameSession; a pure renameVerdict with its five arms in order (gone; unknown → unreachable; canRename(DOOR_RENAME_GATE_ENV) refuses → changed; a remote row that is not live → changed; the name rule → name); renameTargetVerdict and renameOfferOf exported; renameOffer; and rename(), whose first await is core.renameSession with the trimmed name, a throw told apart by code only, no status setter and no log. (5) D7 in names.ts, applied LAST, after the 200-character cut: every backslash, every # before {,(,#,,,} or D F H I P S T W h or at the end, a final ;, and a leading - or $ each become _. dedupeSessionName treats RESERVED_TMUX_NAMES ['gmux-control'] as always taken, with a vitest pinning it equal to CONTROL_SESSION_NAME. (6) D15: remoteStampArgs sends a value's final ; as a backslash plus ;. (7) remoteRename's two warnings log the error code, never its text; farTmuxName's body is unchanged. (8) D16: the remote restore's name becomes farTmuxName(record name, new Set()), and condition 148's restore clause plus any ablation:p342 arm naming it move on purpose. (9) conformance:manager T25 reads renameVerdict and G2 gains the Rename partition (§10.3). (10) Write the new probe:p349 (§8.1 arms RN0-RN7, RNP, RUN, using hidden-agents all-but-stand-ins via writeHiddenAgents(..., hiddenAgentsBesides(['claude','codex'])), hiddenAgentsPrecheck and standInsOnlyVerdict), its --grader-self-test fixtures, CHECKLIST.md (§13), the package.json script, its verification-checks classification, and HELPER_USER_FLOOR 179. Do NOT launch the probe's Electron; run only its --grader-self-test. Run what §10.1 lists for verb: typecheck; your vitests and the full vitest under a scratch HOME; conformance:manager, conformance:machines, conformance:remoteclose, conformance:farattach; gate:electron; and ONE scratch-tmux check of the SHIPPED sanitizeSessionName and farTmuxName on 3.7b and 3.6a, which must be 54/54 exact (use only sockets prefixed p349-, never gmux, ended in a finally, under the history block). Never send a #( name. Report every file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

**phone-door**, as `table.json` gives it:

> THIS IS A BUILD. Build the phone's door and the Rename sheet, as build/p349/SPEC.md §4.4, §5.2, §5.3 and §9.2-9.3 say. Contract.swift: a row's and the detail's `rename` decoded STRICTLY (decodeIfPresent(Bool) ?? false, beside `end`), PocketSessionsRow the same, `renames` decoded LENIENTLY beside start's read and never inside it, and PocketRenameAnswer with six fields, verb 'rename' and name non-nil exactly when done, or it refuses whole. DoorClient.swift: WriteRoute.rename and renameTarget, RenameBody (name, session, write; sorted, built in signedPost alone), rename(_:name:door:) with a fresh write id every press and none kept, and RenameResult classified exactly as RemoveResult. DoorWords.swift: DoorRenaming, DoorReading.renamer (default nil), and renameSentence(for:sample:), which is always a sentence. New NameField.swift: the app's one UITextField, with the six smart/correction/capitalisation/spelling types off in makeUIView, the identifier and label set in makeUIView only (D18), a 120-unit cap enforced in shouldChangeCharactersIn, the first focus selecting all, and an onReturn; beside it NameRule (maxUnits 120, ECMAScript's exact trim set, refusal in the Mac's order). New SessionName.swift: RenameRegistry, RenameRunner (the app's one rename( call), RenameModel and SessionNameSheet (Rename / Cancel / Save name, one line drawn only when it has a sentence, no owner check; D20's read-first when opened from a row). Start.swift: StartSetup.renamer and .renameRegistry; opened gains a third `line` argument; StartModel.name and .renames; a named Create sends today's start bytes unchanged, then ONE RenameRunner from the done arm, then opened(...). A name is never held in KeptStart. Declare your words and identifiers only in P349DoorWords.swift, exactly as §5.2/§5.3 spell them (the integrator folds them in). hostile-door.mjs gets the rename arms of §4.4 step 7. test-ios.mjs gets P349_SUITES and a transport door taking POST /v1/rename. Write the listed tests, including DoorVectorTests' `names` section held to the Mac's vectors. Do not edit integrator files (TortieApp.swift, Identifiers.swift, Copy.swift, conformance-ios.mjs, etc.). Run what §10.1 lists for phone-door: typecheck; a Simulator-free build-for-testing through xcodebuildRun with derived data under your own scratch dd* (outside the history block, scratch HOME/ZDOTDIR, HISTFILE=/dev/null; xcodebuild cannot run under sandbox-exec); and conformance:ios, reading its red lines as the integrator's and naming them. Run NO Simulator. Report every file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

**faces**, as `table.json` gives it:

> THIS IS A BUILD. Build the phone's faces, as build/p349/SPEC.md §4.5 steps 1-6 say. SessionScreen.swift: Rename is the SECOND item in TerminalMenuControl's ⋯ (Label(Copy.rename, systemImage: "pencil"), id ID.terminalMenuRename), drawn only where a renamer exists and the latest detail's `rename` is true; SessionNameSheet is attached outside the menu items; End session… / Remove do not move. ListScreen.swift: RowDrawing.rename; a RenameRowsAction environment value (@Entry renameRows) declared here; RowView attaches .contextMenu with Rename alone after .onTapGesture, empty while End these takes taps or with no offer (M3 measured that an empty menu draws nothing and the tap and End these are unchanged). ListNames gains rowRename (row-rename-<id> / needs-row-rename-<id>). Needs input and the older-Mac face present the sheet once per tab via .sheet(item:). (k)'s pinned RowView line at :486 must NOT move. SessionsScreen.swift attaches the same action and hands New session the answer's `renames`; add no TextField ((aa3) unchanged). StartSheet.swift: a Name row under Agent (RaisedLabel(Copy.sortName) over NameField, id start-name, empty, not auto-focused, Return hides the keyboard per D19), drawn only where model.renames is true. Sample: the reader is its own renamer, answering .notTaken. Mocks: Rename drawn second in TerminalMenu*.html, a new Rename.html and its iframe in index.html, and a row-menu frame. copy-drift.mjs: checkTerminalFaces reads Catch Me Up, Rename, then End/Remove, and PHONE_MAC_FLOOR rises. TerminalMenuTests reads three items. Declare words and identifiers only in P349FacesWords.swift, exactly as §5.2/§5.3 spell them. The seams with phone-door are SessionNameSheet, RenameModel, NameField and the decoded rename/renames (§9.3); if your build needs phone-door's files, wait until they exist and say so. Do not edit integrator files. Run what §10.1 lists for faces: typecheck; a Simulator-free build-for-testing through xcodebuildRun (derived data under your own scratch dd*, outside the history block with a scratch HOME); conformance:ios, naming its red lines as the integrator's; and conformance:phonecopy. Run NO Simulator. Report every file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

### 9.2 The staging files (how a phone builder compiles while the integrator owns Copy and ID)

`ios/Tortie/Screens/P349DoorWords.swift` (phone-door) and `ios/Tortie/Screens/P349FacesWords.swift` (faces) hold ONLY
`extension Copy { … }` and `extension ID { … }` with exactly §5.2's and §5.3's entries for that builder, each with its
owner comment, spelled exactly as those tables spell them (phone-door: the six words, `startName` and the sheet's six
identifiers; faces: `terminalMenuRename`, `rowRename(_:)`, `needsRowRename(_:)`). The project's folders are
synchronized groups (`objectVersion = 77`, `PBXFileSystemSynchronizedRootGroup`), so a new file needs no project edit.
The integrator moves each entry byte for byte into `Copy.swift` and `Identifiers.swift` (and the identifier table),
deletes the staging files, and only then runs conformance:ios and CopyTests, which would otherwise read a literal
outside `Copy.swift` (rule (b)). A builder whose word is not in §5 stops and names it; nothing else goes in a staging
file.

### 9.3 The seams, stated exactly so the four build at once

- **door ↔ verb (main)**: `PocketWrites.rename(input: { sessionId: string; name: string }):
  Promise<PocketRenameOutcome>` and `PocketRenameOutcome` (§4.2 step 4) are declared by door in `routes.ts` and
  implemented by verb in `pocket-writes.ts`; `PocketFacts.renameOffer?(session): boolean` and `renames?(): boolean`
  (door) are fed by `createPocketWrites(...).renameOffer(session)` (verb) through `capabilities.ts` (door);
  `renameOfferOf` and `renameTargetVerdict` exported by verb, read by door's `sample.mjs` and vectors; the rule's
  `sessionNameRefusal`, `trimmedSessionName`, `SESSION_NAME_MAX_UNITS` and the three sentences exported by verb from
  `src/shared/session-names.ts`, read by door's vectors (`names` section) and gate:onlyadd rows; `RENAME_FAILED` and
  `RENAME_UNREACHABLE` (verb, `lifecycle-words.ts`) used by door's `renameActedOf` and `renameSettled`;
  `DOOR_RENAME_GATE_ENV` (verb) read by RN5 and T25. Composed by the pinned tsx in `vectors.mjs` and `sample.mjs`,
  never by importing a `build/` script.
- **door ↔ phone-door (the wire)**: `POST /v1/rename` body `{name, session, write}` (sorted keys); `PocketRenameAnswer`
  (six fields, the order verb, write, outcome, reason, sentence, name; an open reason; `name` non-null exactly when
  `done`); a row's `rename?: true` (blocked rows, the detail, Sessions rows); the Sessions answer's `renames?: true`;
  the cap 2,048; `parseRenameBody` and `renameAnswer` exported by `writes.ts` for the vectors; `vectors.json`'s
  `rename` and `names` sections, regenerated ONCE by the integrator.
- **phone-door ↔ faces (the app's pieces)**: `SessionNameSheet`, `RenameModel` (its init as §0.2 records it),
  `NameField(text:identifier:label:focusOnAppear:onReturn:)`, the decoded `rename` on `PocketBlockedRow`,
  `PocketSessionsRow` and the detail, and `PocketSessionsAnswer.renames`; `StartModel.init(offer:renames:setup:clock:)`
  and `StartSetup.opened`'s three arguments. If a faces build needs phone-door's files, it waits until they exist and
  says so.
- **phone-door and faces ↔ INTEGRATOR (the app)**: `protocol DoorRenaming` and `DoorReading.renamer` (nil by default);
  `protocol RenameRegistry` in `SessionName.swift`; `RenameSetup` in `ListScreen.swift`. The integrator's
  `TortieApp.swift` edits: `PairedReader` a `DoorRenaming` (`renamer` answering `self`, `rename` calling
  `client.rename(sessionId, name:, door:)`); `AppModel` a `RenameRegistry` with `liveRenames`, every one stopped in
  `wentAway()` beside the Ends and Removes; `startSetup` passing `renamer: reader.renamer` and `renameRegistry: self`
  with the three-argument `opened`; `openStarted(mac:id:name:line:)` handing the line to the opened Terminal's one line
  (`EndModel.init(line:)`, §9.1's note); the two session routes building `RenameSetup { id, name, readsFirst in
  RenameModel(sessionId: id, name: name, renamer: renamer, registry: self, readsFirst: readsFirst, sample: inSample) }`
  only when `reader.renamer` is not nil, handed to the Needs input `ListScreen`, to `SessionsTab` and to `TerminalPage`
  through the route's own reader (rule (ba)); and the app's list of what it never does (`:91-106`) gains the rename (it
  renames a session only on his press, in the Mac's own words, with no Face ID).
- **phone-door and faces ↔ INTEGRATOR (the gates)**: the names conformance:ios reads (`NameField`, `NameRule`,
  `RenameRunner`, `RenameResult`, `RenameBody`, `RenameModel`, `SessionNameSheet`, `DoorRenaming`,
  `renameSentence(for:sample:)`, `pendingName`, `renameRows`, `RenameRowsAction`), §5.3's identifiers, `P349_SUITES`,
  and the hostile door's arm names (`rename-*`, §4.4 step 7), read by (t).
- **door ↔ the probes**: `node-phone.mjs` gains `renameSession(phone, door, { session, name, write })`, posting §9.3's
  body, and `renameAnswerOf`, which checks the six fields (the first build added `rowRenameOf` and
  `sessionsRenamesOf`, and a self-test that runs only when the file is started directly); the six older probes' route
  and write lines (§6 item 1).

---

## 10. The proof, run rather than read

### 10.1 What each builder runs before it returns (and reports with exit codes)

Every builder: `df -h /` first; the history stats before and after every run; `npm run typecheck` (a red line in a file
of another builder's is named, never fixed); the vitest files it owns, and the full `npm test`, under a scratch HOME
(`HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null`, `TERM_SESSION_ID` unset, under the history block; the five
native watcher and `/bin/ps` test files fail inside the block and at the parent, §0.3, and are named, never counted as
this phase's).

- **door**: `npm run conformance:pocket`; `npm run conformance:pocket:hostile`; `npm run gate:onlyadd`; each re-pointed
  probe's `--grader-self-test` (`build/probe-p313.mjs`, `build/p317/probe-p317.mjs`, `build/p318/probe-p318.mjs`,
  `build/p337/probe-p337.mjs`, `build/p3167/probe-p3167.mjs`, `build/p348/probe-p348.mjs`), each under one lock slot
  released on the same line; `node build/p316/vectors.mjs --check` and `node build/p3333/sample.mjs --check`, EXPECTED
  RED until the integrator regenerates (named: "requests", "answers" and "names" differ, and only the committed
  sample's bytes); `P313_ONLY=<its new and moved arms> npm run ablation:p313`; `npm run ablation:p33311 -- --only <its
  moved arms>`.
- **verb**: `npm run conformance:manager`, `conformance:machines`, `conformance:remoteclose`, `conformance:farattach`;
  `npm run gate:electron` (179 of floor 179); `node build/p349/probe-p349.mjs --grader-self-test` (never its
  Electron); and ONE scratch-tmux check of the SHIPPED `sanitizeSessionName` and `farTmuxName` over §2.1.1's corpus on
  the vendored 3.7b and Homebrew's 3.6a (§2.1.1's paths), which must read 54/54 exact, create and rename, local and
  far, on sockets prefixed `p349-` (never `gmux`), every server ended in a `finally`, under the history block, never a
  `#(` name; the parent's numbers printed beside them (§2.1: local 23/19 and 25/21, far 25/21 and 27/23).
- **phone-door** and **faces**: a Simulator-free `build-for-testing` through `build/simulator-run.mjs`'s
  `xcodebuildRun` (Debug, `generic/platform=iOS Simulator`, derived data under its own scratch `dd*`), OUTSIDE the
  history block (xcodebuild cannot run under `sandbox-exec`) with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`;
  `npm run conformance:ios`, reading its red lines as the integrator's and naming them; **faces** also `npm run
  conformance:phonecopy`. A phone builder runs NO Simulator (the integrator's `test:ios` is the first). phone-door
  also `node build/p316/hostile-door.mjs --self-test` and `node build/p316/test-ios.mjs --self-test`.

### 10.2 The verifier (Tier 3: the gates, real data as a per-row matrix, TWO independent methods, one an attack)

| Claim | The app run | The independent method(s) the verifier names |
| --- | --- | --- |
| The route waits for its own Allow, and answers once allowed | probe:p349 RN0, RNP | **attack**: `rename` before its Allow `404 route` with nothing forwarded (RNH0, the door's own counters), and the parent's door the same |
| A rename lands as typed, everywhere it goes, on every agent and machine | probe:p349 RN1, RN3, RN4; probe:p316 RM3, RM9 | **Method 1, re-derived against the typed name**: every arm graded against the trimmed name it typed, by the manifest's own reader, tmux's `#{session_name}` by `$`-id (mapped, never expanded), the far `@gmux-name` from the loopback machine's far command log, and the list each Mac window was sent, over a local shell, each stand-in, a local ended session and a live remote one (the per-row matrix). Phone against Mac is a regression check only, because both reach one verb |
| No name is lost, refused wrongly or worse than today | probe:p349 RN7; the scratch-tmux check | **re-derive D7 from scratch** against real tmux with the verifier's own corpus and grading, on create AND rename, at HEAD and at the parent (the first build's attack lens did this on 3.7b, 3.6a, 3.2a, 3.4 and 3.5a, under §2.1.1's servers) |
| A rename is refused wherever the Mac's own gate or D3 refuses it | probe:p349 RN2 | **the partition**, §10.3, driven by the verifier's own table, because a reader that asserts plain equality passes while reading nothing |
| Nothing a phone sends can do more | conformance:pocket:hostile RNH0 to RNH12 | **Method 2, the attack**: the hostile client's arms (§7.2), each graded on its reason word and on main's row unchanged; the hostile door's twelve arms (§4.4 step 7) through RMH; and `#(touch <scratch file>)` through the Mac's own `sessions:rename` at the parent and through both paths at HEAD, on a scratch socket: the file appears at the parent where M1 says tmux expands it (the first attack lens could not make a bare server's job tick; it showed the parent EXPANDS the name as a format, `#{session_id}` and `#S` empty, `#H` the host), and never at HEAD (no `#(` survives D7) |
| The `@gmux-name` stamp is inert | — | **attack**: the stamp set to a value holding `#(touch …)` and read back through the product's `#{q:@gmux-name}` on 3.2a and 3.7b runs no job (the first lens: stored literally, read back quoted) |
| The phone draws Rename only where the Mac offers it, and asks nothing more | probe:p316 RM1 to RM10, RMP, RMH on 26.3 and 18.3 | the relay's own counts and the dump's frames; RMP's absences against the main drive's controls |

**Not run as they stand, and why** (§0.2): `probe:p3167` and `probe:p317`, which CLAUDE.md names for these paths, hide
only five agents and hand the app the caller's PATH, so they would run his own agents' binaries for a version; the
verifier does not run them unless they first gain `build/hidden-agents.mjs`'s all-but-stand-ins mode, its precheck, a
closed PATH and the shadow refusal, and says so either way. `probe:p313` hides every launchable row but `claude` and
gives a closed PATH, but lacks the precheck: the verifier runs it only with the precheck added, or names why not.

### 10.3 The Rename partition (the verifier drives it; a reader that asserts plain equality passes while reading nothing)

Over every status (`running`, `idle`, `needs_input`, `unknown`, `exited`, `restorable`, `discarded`), on this Mac and on
another machine (`session.machine` set), the verifier computes `sessionActionGates(row, status,
DOOR_RENAME_GATE_ENV).canRename` and `renameVerdict(row, <a name the rule passes>)` itself and requires EXACTLY this
difference: both pass on this Mac's `running`, `idle`, `needs_input`, `exited` and `restorable`, and on another
machine's `running`, `idle` and `needs_input`; both refuse `unknown` (the verdict `unreachable`) and `discarded` (the
verdict `changed`) in both places; and ONLY on another machine's `exited` and `restorable` does the gate pass while the
verdict refuses `changed` (D3). And `canRename` answers the same over every environment (`DOOR_GATE_ENV`,
`DOOR_REMOVE_GATE_ENV`, `DOOR_RENAME_GATE_ENV` and one with every field set), because it is `acts`
(`src/shared/session-gates.ts:278`, `:295`). `renameTargetVerdict` and `renameOfferOf` track the first four arms; the
fifth (the name) is driven over D5's cases on its own. `conformance:manager` G2 holds the same table as a gate (§4.3
step 9). The first attack lens found 0 mismatches against its own table.

### 10.4 At the end, once

Electrons counted (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`), every
line that is not his own app named; `xcrun simctl list devices | grep -c p316-` reads 0 with nothing booted; no scratch
tmux server of the run left and its socket files removed; his `~/.zsh_history` and `~/.bash_history` size and time read
(a move across a blocked command is his terminal, §0.4 rule 4); and no builder, integrator or verifier names `-L gmux`,
not even to count.

---

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `df -h /` (stop and report under 8 GB free). Fold `P349DoorWords.swift` and `P349FacesWords.swift` byte for byte into
   `ios/Tortie/Style/Copy.swift` and `ios/Tortie/Screens/Identifiers.swift` (and its table), then delete them; make the
   `TortieApp.swift` edits of §9.3 (`PairedReader` as `DoorRenaming`, `AppModel` as `RenameRegistry` with `liveRenames`
   stopped in `wentAway`, `openStarted` handing the line through, the two session routes building the rename model,
   the `:91-106` comment); set `PHONE_BUILD` to `'13'` with its fixtures at 14, and the six `CURRENT_PROJECT_VERSION`
   lines to 13; write the three CHANGELOG items of §13 under `## Unreleased`, `### Added`, each ending with no full
   stop, so the follow-up docs commit adds its link; write **the CLAUDE.md rows**: the `conformance:pocket` row (the
   eighth write `POST /v1/rename`, signed, alive outside any window, cap 2,048; R4 pinned at `3ba0fec5…`; RN1 to RN10;
   X5's `renameSession` called once, inside `rename`, after `renameVerdict(`; the hostile client's RNH0 to RNH12; the
   `ablation:p313` count; its trigger paths gaining `src/shared/session-names.ts`, `renameSessionAdmitted` in
   `src/main/sessions/core.ts` and `remoteRename` in `src/main/machines/remote-sessions.ts`, which RN9 and RN10 read),
   the `conformance:manager` row (T25 holds `renameVerdict`; G2's Rename partition; `src/shared/session-names.ts` on
   its paths), the `conformance:machines` row (condition 148's restore clause reads D16's line, `b148e` its arm;
   `src/main/tmux/names.ts` and `remote-stamps.ts` reach its `farTmuxName` drive), the `conformance:ios` row (rule (bd),
   build 13, the moved rules), the `conformance:phonecopy` row (the sheet's and the row menu's frames, the floors), the
   `ios/**` row's (au)-to-(bd) account, and a new `probe:p349` row in the probes table beside probe:p316's `rename`
   group; write rule (bd) and the moved rules of §6 and §7.3 in `build/conformance-ios.mjs`, the `ablation:p316` arms,
   and probe:p316's `rename` group (§8.2) in `probe-p316.mjs` and `P316DriveUITests.swift`.
2. `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb node build/p316/vectors.mjs` then the same with
   `--check`; `node build/p3333/sample.mjs` then its `--check` (each ONCE, under the block, after every Mac change).
3. `npm run typecheck` · `npm run build` (runs conformance:ios, gate:simulator, gate:contract, gate:electron,
   gate:background, gate:knownhosts, gate:checks and conformance:harnessprobes; outside the block only if a step starts
   Xcode) · `HOME=<scratch> ZDOTDIR=<scratch> HISTFILE=/dev/null npm test` (the whole vitest, `TERM_SESSION_ID` unset,
   under the block).
4. `npm run conformance:pocket` · `npm run conformance:pocket:hostile` · `P313_ONLY=<the new and moved RN, R, X, NS, AR
   and G arms> npm run ablation:p313` · `npm run gate:onlyadd` (green against launch, build-11 and build-12; a red line
   is named, never resealed) · `npm run ablation:p33311 -- --only <its moved arms>` · `npm run gate:contract` (the
   baseline must NOT move; if it does, stop and name the line, or regenerate on purpose with `node
   build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` and say which lines moved).
5. `npm run conformance:ios` · `P316_ONLY=<the new (bd) and moved (s, ab, ac, ad, ay, az, ba, t, v, bb4, bb5, bb9)
   arms> npm run ablation:p316` · `npm run conformance:phonecopy` · `npm run conformance:manager` · `npm run
   conformance:machines` · `npm run conformance:remoteclose` · `npm run conformance:farattach` · `npm run ablation:p342
   -- --only <its re-pointed restore arm>` (only if the verb builder moved one).
6. `npm run gate:simulator` · `npm run gate:checks` · `npm run gate:electron` (`HELPER_USER_FLOOR` 179) · `npm run
   gate:background`.
7. Under the lock, outside the history block with a scratch HOME: `SLOT=$(sandbox-exec -f <the .sb> zsh
   /private/tmp/tortie-ops/lock.sh try p349 phone) && { npm run test:ios; sandbox-exec -f <the .sb> zsh
   /private/tmp/tortie-ops/lock.sh release $SLOT; }` (iPhone 16 Pro, iOS 26.3, Debug and Release), then the same with
   `P316_RUNTIME=18.3`.
8. Every new or moved probe's `--grader-self-test`: `node build/p349/probe-p349.mjs`, `build/p316/probe-p316.mjs`,
   `build/probe-p313.mjs`, `build/p317/probe-p317.mjs`, `build/p318/probe-p318.mjs`, `build/p337/probe-p337.mjs`,
   `build/p3167/probe-p3167.mjs` and `build/p348/probe-p348.mjs`, each with `--grader-self-test`.
9. The full battery: `npm run smoke && npm run smoke:t3 && npm run package` (never `smoke:remote` or `smoke:machines`;
   `package` with `CSC_IDENTITY_AUTO_DISCOVERY=false` and a scratch HOME, §0.2).
10. `git -C /private/var/tmp/tortie-wt/wt-p349 diff 40aebfcc --stat` read back: nothing outside the four builder lists
    and the integrator's (and the two files §9.1's note names, each named).
11. Append `## §As built (the integrator, <date>)` to this file: every decision built otherwise than written here and
    why, every red line moved on purpose with its rule, every command's exit code and PASS line, and `stat -f '%z %m'
    ~/.zsh_history ~/.bash_history` before and after every run outside the block. Nothing above it is edited.

---

## 12. What is NOT in this phase

- **No change to `/v1/start`.** Its body, cap, clause, answer and parse stay byte for byte, and there is no second
  start route.
- **No rename of a session that ended on another machine** (D3).
- **No Face ID, Touch ID or passcode** on a rename or a named start.
- **No Rename these** or batch rename, and no change to End these.
- **No dedupe on a rename**, and no change to ⌘T's silent `-2`.
- **No change to the Mac's own Rename**, `sessions:rename`, `core.renameSession`'s rules, its native menus or the IPC
  contract, beyond the shared tmux name (D7).
- **No renaming a project, tab, machine or phone**, and nothing of an agent's own title or conversation.
- **No Rename on Catch Me Up's bar, on 348's Sessions bar or on the Terminal's long press**, no swipe action and no
  editable title.
- **No prefilled Name**, no other New session field, and no "New session here" in the ⋯ (346).
- **No kept rename id**, and nothing queued, retried, stored or sent in the background.
- **No change to End, Remove, paste, keys, the reply, the "+" or the Sessions bar.**
- **No URL scheme, App Intent, widget or notification action** that reaches rename.
- **No mock sent to him first**, and no release, tag, version bump, upload or screenshot inside the phase.

### 12.1 Stated trades (said, never claimed fixed)

The entry's, whole, plus what this spec measured:

- **A named start is two writes.** The Mac's `<agent>-<n>` shows for about one round trip, longer on another machine
  (M2: 42.9 ms p50 for a far rename's three trips on an open connection, about 80 ms on a new one); an alert sent in
  that time carries it; and a rename not taken leaves it, said on one line. The second write comes from the done arm of
  his Create press, not from a press of its own.
- **No lock, no Face ID.** A sheet opened before another rename overwrites it, as two Mac windows do, and a lock would
  need a new route id. A lost, unlocked phone can rename every session it lists; nothing is destroyed.
- **Busy.** A phone has one write in flight (`writes.ts:1004-1014`). A rename sent while another of its writes runs,
  the Terminal's keys included, answers `busy` and keeps his name in the field; and while a rename runs, a far one for
  as long as M2 measures, its other writes answer `busy`.
- **The far wait.** A far rename waits for one more list (`remote-sessions.ts:2331`); past the door's 15 s the phone
  reads the session again and draws `Your Mac did not answer. This is the session as it reads now.` over what it reads.
- **Other machines.** An ended session there cannot be renamed from the phone. Where the far machine is a Mac running
  its own Tortie, its windows show the far tmux name that `farTmuxName` gives, not the name typed, as after the Mac's
  F2 today, because its echo handler copies tmux's name (`core.ts:1765-1774`). D7 holds back what ANY measured version
  reads, so it changes that name where tmux changed or refused it before, and also where one far tmux kept it: a
  final `#`, which only 3.7b and 3.7c drop (the verify lens measured the Mac's own rename to `fix #` on the loopback
  machine's 3.6a keeping the far tmux name `fix #` at the parent and storing `fix _` at HEAD), and a leading `-` on a
  create, which `new-session -s` took (`-x` is `_x` now) though `rename-session` reads one as flags. The display name,
  the `@gmux-name` stamp and the phone are unchanged by it (corrected in the fix round, which had said "only where tmux
  changed or refused it before"). A far session's names read back one `_` per cell for each character outside ASCII
  where the carriage forwards no UTF-8 locale (M2: the family as `______ fam`), and the Mac's window lists that
  read-back and the phone's rename answer carries it (Arabic answers `_____ _______`), as the parent's own F2 already
  shows (`caf_ __`), so it is older than this phase; the far `@gmux-name` keeps the name typed.
- **A typed name in app.log.** The Mac's own quit-time scrollback line (`snapshotPassLine`,
  `src/main/sessions/reconcile-plan.ts:182`, `scrollback pass (app-quit) … Not written: "<name>" (nothing on
  screen)`) names every session it could not write by its display name, so a name typed on the phone reaches app.log
  there exactly as one typed on the Mac does at the parent (the verify lens found `named at start` there in the phone
  run). No log line this phase adds names one: the phone's write line names the session's id. RN6 counts a canary on
  that line alone apart (`appLogKnown`) and FAILS one on any other line (the fix round).
- **The Mac's own rename changes too.** Names that failed or were rewritten land as typed (D7); a running session keeps
  its tmux name until it is renamed or restored; and tmux's echo can still show the tmux name as the display name for a
  moment (`core.ts:1765-1774`, `:3326-3331`).
- **On 3.2a to 3.4 an inner `$` before a letter, `_` or `{`** in a name composed by this Mac's rule is stored with a
  backslash (M1: `cost $HOME`, 375 of 400 fuzz names). This Mac's rule only ever meets the bundled 3.7b, and a far
  machine is given the far rule, which maps every `$`, so no session Tortie makes meets it; stated so a later round
  never hands this Mac's rule to a far server.
- **A Mac window mid-rename** loses its draft when the phone's name lands (`src/renderer/app/session-actions.tsx:1183-1188`).
- **Two renames at once.** `core.renameSession` admits without serializing (`core.ts:3301-3305`), so a phone rename
  and the Mac's F2 on one session in the same moment can leave the manifest's tmux name behind tmux's (`:3324-3341`),
  which Clear and capture read; attach goes by `$`-id (`src/main/attach/attach-plan.ts:98-104`), and the next rename
  mends it.
- **The field's smart punctuation** is off by the API (D11); that a person's own keyboard on a device keeps
  `it's "x" fix--auth` exactly is his CHECKLIST row (§13), because the Simulator kept it for a SwiftUI field too (M3).
- **The hostile door's rename arms leave out four of Start's** (`refused-no-reason`, a 2 MiB answer, chunked and
  hold), so a rename whose answer is held is not driven live (the probe review's finding 3).

---

## 13. For the main session at landing (release obligations)

- **The CHANGELOG items** (under `## Unreleased`, `### Added`, each ending with no full stop before the follow-up's
  commit link):
  - "Rename a session from your iPhone, from the Terminal's ⋯ or by holding the session in a list. A session on
    another machine can be renamed while it runs, and your Mac asks you to allow renaming once, in Settings then Phone"
  - "New session on your iPhone takes a name. Left empty, your Mac names the session as before"
  - "On your Mac, renaming a session to a name that starts with a slash, a dot or a dash now works, and a name with #
    in it, or one ending in ;, keeps exactly what you typed"
- D13's release, each half on his word: the next Mac release carries `rename` with an Allow of its own, beside phone
  build 13, which calls it; the phone build that calls `rename` ships with the Mac release that serves it.
- At that release build 13's wire is frozen beside launch, build-11 and build-12, and `FROZEN_SETS_FLOOR` raised 3 → 4
  (`build/assert-door-only-adds.mjs:252`).
- `build/p333/STORE-CHECKLIST.md`: the review notes (`:149`; 3,960 of 4,000 bytes before his phone number) and the
  claims table gain Rename and the Name within 4,000 bytes (so a sentence elsewhere is shortened, named in the commit),
  and still say Face ID is asked only before ending a session (`:165`); What to Test gains build 13.
- `build/p349/CHECKLIST.md` (builder `verb`) for his seat: on the updated Mac, Settings then Phone draws `New: rename
  sessions from your phone` with `Name a session as you start it, or rename one later.`, and he presses Allow once; on
  his own phone (build 13), hold a session in Sessions, choose Rename, type `it's "x" fix--auth` with the iPhone's own
  keyboard and smart punctuation on in iOS's settings, Save name, and the Mac shows exactly that; rename a running
  session on his Mac Pro from the Terminal's ⋯; name one in New session and see it open under that name on both;
  see that an ended session on the Mac Pro offers no Rename; and that nothing asked Face ID.
- The running log gets its lines, and the phase's scratch (`/private/var/tmp/tortie-wt/scratch/p349/`, the worktree, the
  rebuilt tmux servers under it and the worktree's `build/vendor/tmux-probe/`) is cleaned after the follow-up push
  (CLAUDE.md), on his word.

---

## 14. Questions for him (the main session asks; the builders build the default meanwhile)

1. **How should a name typed in New session reach the Mac?** Recommended, and what is built: start the session as
   today, then send one rename to the id the Mac answered (D2). The phones already released, and the Mac's start route,
   stay exactly as they are; one Allow covers it; and fixing a name after a lost answer can never start a second agent.
   The alternative carries the name inside the start, which needs a second start route with its own Allow and doubles
   the start's checks. It would still need rename for every other session.
2. **Should an ended session on another machine be renamable from the phone?** Recommended, and what is built: no (D3).
   The Mac's own rename refuses a session that ended during this run, and for one that ended before, it changes only
   this Mac's records, never the machine. So the phone offers Rename exactly where the Mac's rename does the whole job.
   The alternative would rename only this Mac's record of such a session.
3. **Are the Allow words right?** Built as drafted (D10): `New: rename sessions from your phone`, with `Name a session as
   you start it, or rename one later.`, and the permission line `rename a session`. Once committed, that line can never
   change under this route, so this is the moment to change any of them.

---

## 15. The spec step's commands, exit codes and numbers (the evidence trail)

### 15.1 The spec step of 2026-10-21 (carried from `1-spec.json`; its scratch is gone)

| Step | What ran | Exit | Numbers |
| --- | --- | --- | --- |
| M1 | nine scratch servers (3.2a, 3.3a, 3.4, 3.5a, 3.6, Homebrew 3.6a, 3.6b, vendored 3.7b, 3.7c), each `-V` checked exact, sockets `p349-m1-<v>-<pid>`, `-f /dev/null`, plus 3.6a and 3.7b under a copy of `gmux-tmux.conf`; 54 names × six rules × create and rename; the 400-name fuzz; the `#` scan; the flags; the far stamp; the control client; all under the history block | 0 | §2.1 |
| M2 | the loopback machine, quiet shell, scratch far home, `NO_OWN_KEYS`; an ssh wrapper with `-F none`; 30 rounds each on 3.7b and 3.6a; OUTSIDE the block (sshd's sandbox fails inside `sandbox-exec`; the first try exited 1, `Connection reset`) | 0 | §2.2 |
| M3 | four device pairs through `withSimulator` under one lock slot; two `cp -Rc` copies of `ios/` built once each (19.8 s, 19.9 s); the 18.3 harness crash ended two arms, each re-run once on a fresh device | 0 | §2.3, §2.5; 0 devices left |
| R4 pin, body sizes, pairing codes | node's `createHash` and `sort \| perl chomp \| shasum` | 0 | §2.4 |
| history | `stat -f '%z %m'` before and after every run | — | `739283 1792544948` → `739327 1792546034` between two blocked commands (his terminal); `23166 1790702242` throughout |
| at the end | — | — | no tmux, sshd, agent or ssh master left; 0 `p316-` devices; all three lock slots free; 80 GiB free |

### 15.2 The rebuild's spec step, 2026-10-30 (this file's restore)

Every command ran under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`, the tmux ones with
`HOME` and `ZDOTDIR` a scratch folder, `HISTFILE=/dev/null`, `SHELL=/bin/sh` and `TERM_SESSION_ID` unset; no Electron,
Simulator, sshd, xcodebuild, agent, Tailscale, DNS stand-in or APNs ran; no `-L gmux`; no `#(` name was sent. The
scripts and their outputs are kept under `/private/var/tmp/tortie-wt/scratch/p349/spec/` (`r4.mjs`, `tb/build-old.mjs`
and `tb/built.json`, `m1/m1.mjs`, `m1/dbg.mjs`, `m1/corpus.json`, `m1/rules.json` and `m1/m1-results.json`, `logs/`).

| Step | Command | Exit | Numbers |
| --- | --- | --- | --- |
| the tree moved? | `git diff 266d7d91 40aebfcc --stat` | 0 | `README.md` and `docs/BACKLOG.md` (the running log's last line) only: the product code is the first spec's |
| citations | read at `40aebfcc` (`grep -n`, `sed -n`) | 0 | §3; nothing a decision rests on moved |
| R4 pin, two ways | `node r4.mjs` (the table read as TEXT); `grep \| sed \| LC_ALL=C sort \| perl -pe 'chomp if eof' \| shasum -a 256` | 0 | today `2f5feba1…` (14 routes); with `POST /v1/rename` `3ba0fec56446be39e7ec0e15b17053cfcb1cbcb05d4448201c78cb7c078ed706`, both ways |
| disk | `df -h /` | 0 | 60 to 69 GiB free |
| 3.5a, 3.6, 3.6b, 3.7c | `GMUX_TMUX_TARBALL_DIR=build/vendor/tmux/cache node build/build-tmux-version.mjs <v>`, one loop, in the worktree | 0 | each tarball's sha256 matched `build/tmux-probe-versions.json`; built in 26.6 s, 25.4 s, 26.6 s and 27.9 s; 1,319,552, 1,387,040, 1,387,056 and 1,437,872 bytes; each scratch server `p83-<v>-<pid>` read `#{version}` back and was ended by its pid |
| 3.2a, 3.3a, 3.4 | `node tb/build-old.mjs 3.2a 3.3a 3.4` (research 131 §3.1's recipe) | 0 | each tarball's sha256 matched research 131 §3.2; libevent 2.1.12-stable and utf8proc 2.10.0 static from the ship cache, matched to the ship pin; 26.1 s (with the two libraries), 10.1 s and 10.3 s; 1,376,920, 1,449,592 and 1,488,280 bytes; servers `p349-tb-<v>-<pid>` read `#{version}` and ended by pid |
| nine `-V` | each binary's `-V` and sha256 | 0 | exactly `tmux 3.2a` … `tmux 3.7c`; Homebrew 3.6a `70cbf669…` and the vendored 3.7b `d7002f7d…`, the hashes research 131 names |
| leftovers | `ps` for a tmux on `-L p83`/`-L p349`; `lsof` on each socket file | 0 | no server left; the seven stale socket files (`p349-tb-*` ×3, `p83-*` ×4) removed by exact name |
| the corpus | `node m1/m1.mjs --rules-only` (written to `m1/rules.json`, its names to `m1/corpus.json`) | 0 | 54 names, none holding `#(`, no rule composing one; sha256 `126fbc2f…` |
| M1 over the corpus, first try | `node m1/m1.mjs` | 0 | every cell 0: `display-message -p -t '=<name>'` is a PANE target and answered empty, so the exact-name read used `=<name>:` (as `build/p316/probe-p316.mjs`'s `=${s.tmuxName}:` reads do), checked on 3.7b by `node m1/dbg.mjs` (exit 0) |
| M1 over the corpus | `node m1/m1.mjs` | 0 | 90.2 s; every cell of §2.1, eleven configurations, six rules, create and rename (§2.1.1) |
| history | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run | — | `741827 1793377397` and `23166 1790702242` at the first command and after every command since; neither moved |

---

## §As built (the integrator, 2026-10-30)

The rebuild's integration, in `/private/var/tmp/tortie-wt/wt-p349` on `40aebfcc`, made in two runs of the one step. The
first was cut off by a usage limit at 17:07 after 459 tool calls, while it read why `test:ios` failed on iOS 26.3; the
second continued from its record, fixed those two failures, and ran the commands once more with everything in. Nothing
was committed, staged or stashed, `/Users/gdc/gmux` was not written, and no `-L gmux` was named. Every command ran under
`sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` except the Xcode and Simulator runs (the first run's
Debug `build-for-testing` checks and every `test:ios`), which ran outside it with `HOME` and `ZDOTDIR` a scratch folder,
`HISTFILE=/dev/null` and no `TERM_SESSION_ID`, each `test:ios` under one lock slot; the slips are named in decision 8.
No Electron was started, no agent ran, and no probe ran but the grader self-tests, which start nothing. The integrator's
scratch is `/private/var/tmp/tortie-wt/scratch/p349/integrator/` (the edit scripts, the logs under `logs/`, the derived
data under `dd*`).

### What the integrator built, file by file

| File | What |
| --- | --- |
| `ios/Tortie/Style/Copy.swift` | §5.2's six words, folded byte for byte from `P349DoorWords.swift` under `MARK: - Rename`, each with its owner line |
| `ios/Tortie/Screens/Identifiers.swift` | §5.3's ten identifiers and their table rows, folded byte for byte from both staging files |
| `ios/Tortie/Screens/P349DoorWords.swift`, `P349FacesWords.swift` | deleted after the fold |
| `ios/Tortie/App/TortieApp.swift` | §9.3: `PairedReader` as `DoorRenaming` (`renamer`, `rename(_:name:)`), `AppModel` as `RenameRegistry` with `liveRenames` stopped in `wentAway`, `renameSetup(_:)` (the sample's flag read once), `openStarted(mac:id:name:line:)` handing the line through `Route.session`, both session routes and both lists handed the setup, and the header and never-does comments |
| `ios/Tortie/Screens/EndBar.swift` | §0.2: `EndModel.init(…, line: String? = nil)`, the named Create's line |
| `src/main/sessions/__tests__/p348-remove-verdict.test.ts` | §0.2: the fake core's `renameSession`, which throws |
| `ios/Tortie.xcodeproj/project.pbxproj` | the six `CURRENT_PROJECT_VERSION` lines, 12 → 13 |
| `ios/TortieTests/SettingsTests.swift` | the version row reads `1.0.0 (13)` (in the integrator's list; it moved with the build number) |
| `ios/TortieTests/CopyTests.swift` | `testTheRenamesWordsArePinned`: the five Mac words with their owners, `renameNotTaken` the phone's own, `sortName` still `Name`, no `renameName` or `renameCancel`, no owner check named |
| `ios/TortieUITests/P316DriveUITests.swift` | twelve steps (§8.2) and their helpers, and a row read after walking back to the list the way `open` walks |
| `ios/TortieTests/Fixtures/vectors.json`, `ios/Tortie/Sample/sample.json` | regenerated once each |
| `build/conformance-ios.mjs` | rule (bd) bd1 to bd10, `PHONE_BUILD` 13 with its fixtures at 14, and the moved rules (s), (ab), (ac), (ad), (ay), (az), (ba), (t), (v), bb4, bb5 and bb9, each with its own fixtures |
| `build/p316/ablation-ios.mjs` | 38 new arms and 8 re-pointed (728 in all, 690 at the parent), `bd` in a full run, and `P316_SCRATCH` |
| `build/p316/probe-p316.mjs` | the `rename` group, its graders and 172 self-test cases, `P349_PARENT_IOS`, the shadow refusal, and E1, PS10, PM1 and RV1 reading the ⋯'s three items |
| `ios/Tortie/Door/Contract.swift` (phone-door's; the second run's reconcile, decision 5) | `PocketSessionsAsked`, `PocketSessionsGroup` and `PocketSessionsChoice` each gain an `encode(to:)` writing every key, a nullable one as `null` |
| `ios/TortieTests/StartContractTests.swift` (phone-door's; the second run's reconcile, decision 5) | bb5's "read once" counts the reads that decode, as conformance:ios bd10 does, and pins the answer's one write-back |
| `CHANGELOG.md` | §13's three items under `## Unreleased` / `### Added`, no full stop |
| `CLAUDE.md` | the rows of §11 step 1: `conformance:pocket`, `conformance:manager`, `conformance:machines`, `conformance:ios`, `conformance:phonecopy`, `probe:p316`, the new `probe:p349`, and `probe:p3167` and `probe:p317`'s new safety |

### Decisions built otherwise than written here, or where this file is silent

1. **bb4 reads New session's Name inside a member.** The faces builder draws the `NameField` in `private var
   namePart`, whose one use sits behind `if model.renames`. bb4 now passes a `NameField(` either directly behind that
   `if` or inside a member whose every use is behind it, and two fixtures hold both ways (the member form passes; the
   member drawn outside `renames` is caught).
2. **Two arm ids moved.** The first build's `bb4b` and `bb9b` are already ids of Phase 346, so this phase's arms are
   `bb4c` and `bb9c` (`bb5b` kept), header and `P316_ONLY` example with them.
3. **Five arms re-pointed** because Phase 349 moved their anchors: `b8` and `ay15` (the Terminal menu's line now
   carries `.renaming(...)`, its control `rename: rename`), `bb1a`, `bb9a` and `ba11` (`openStarted` and its push now
   carry the line). `v62` is anchored by a pattern on its guard, as the first build did, so `gate:background` never
   reads a quoted `line = …`.
4. **The `rename` group's readings**, each chosen so the arm reads what it claims:
   - RM3, RM4, RM7 and RM9 count main's ONE log line per write (X11), not the relay, whose count includes reads.
   - RM4 removes the session on the Mac through the bridge (End, then Remove, as N6 does) between the sheet's read and
     its Save, and grades the Mac's own sentence for what main holds then (`Session not found.` when it lists it no
     more, `This session changed. Nothing was done.` when it lists it removed). The hostile door's refused answers are
     RMH's.
   - RM2 reads Save OFF over the prefilled name (unchanged, and past the cap at 300 units) and ON after a name typed
     over it: `canSave` refuses an unchanged name, so "Save on once the first read came back offering Rename" can
     only be read through a typed name. The Needs input row's tap is not asked (no step opens a waiting row), and the
     grader skips that clause there and nowhere else.
   - RM8's start is compared with build 12's own start over the same world by its keys, its two ids and a fresh
     32-hex write id: the write id is random, so those 32 characters are the only bytes that can differ.
   - RMP drives each older app with its OWN UI test: the ⋯ by `end-top` (nothing pressed), the list's rows with no
     sentence, and New session's dump with no `start-name`. A row's long press is not a step an older UI test has, so
     an older build's rows are read as drawn and not refused. This app against a 348 Mac is the hostile door's
     `start-404` world (the shipping composer's answers with no `rename` and no `renames`).
   - RMH's answer arms press Rename in the ⋯ of the world's live session; its row arms read the list's sentence as the
     H list arms read it, the blocked-row arm on the Needs input tab; its key arms read the "+", the Name and the list.
   - E1, PS10 and PM1 read Catch Me Up, Rename, then End session… exactly, and RV1 and RV6 (through
     `removeFaceProblems`) Catch Me Up, Rename, then Remove; PM1 also holds Rename to `terminal-menu-rename`; the RV
     drives attach the ⋯'s rows from the `terminal-menu` line printed as `remove-read` opened it.
   - The shadow refusal (§0.2's probe review) scans `extraBinDirsFor`'s folders and the app's PATH beside the
     stand-ins (the run's `node` folder and the system folders), by name only.
   - D7 is this file's own reading (`d7Of`), held to §2.1.1's interesting names by the self-test, never imported.
5. **The Sessions answer writes back as the door writes it, all the way down** (the second run). `test:ios` on 26.3
   failed two tests in Debug and Release alike. `DoorContractTests.testTheSessionsAnswerWritesRenamesOnlyWhenTrue`
   could not read back what the phone-door builder's new answer encoder wrote (`keyNotFound(agent)` in `asked`),
   because `asked`, the groups and the choices kept Swift's synthesized encoders, which leave a nil out where the door
   always sends the key as `null`. And `StartContractTests.testTheRenamesKeyIsReadBesideStartInSource` counted every
   `forKey: .renames`, so the encoder's write-back read as a second read (3 parts where it wanted 2). The three nested
   types gain encoders that write every key, a nullable one as `null`, which is the reconcile the first build's
   integrator made to the two row encoders (§0.2); and the test counts the lines that both name `forKey: .renames` and
   decode (one), as bd10 counts `decode…(…forKey: .renames)`, and pins the one other line to `if renames { try
   c.encode(renames, forKey: .renames) }`. These encoders run only in tests: the app encodes no answer, so nothing the
   phone draws or sends changes. No ablation:p316 anchor moved: the seven literal anchors in `Contract.swift` occur as
   before (bd10a's matches both row decoders, as it did).
6. **`ablation:p342` reads `P342_ONLY`, never `--only`.** §11 step 5's `-- --only` form is ignored by the script, so
   the first run's `npm run ablation:p342 -- --only b148e` ran the WHOLE ablation. The usage limit cut it off during
   arm `b148a`, whose killed child read as `exit 1, newly red nothing`, and left its clone and two of
   conformance:machines' scratch folders under `/private/tmp`. The second run ran `P342_ONLY=b148a,b148e,b000c`:
   `b148e` (the verb builder's moved restore arm) and `b148a` both red on condition 148 and the control unmoved, so
   that reading was the kill and not a gate gone blind.
7. **The test count is 18 short of the first build's, and the rebuild keeps it.** This build's `test:ios` executes
   1,127 tests in Debug and 1,124 in Release, against the first build's 1,145 and 1,142. The parent has 1,059 test
   methods and this tree 1,129: the rebuild added 70 (phone-door 56, faces 13, the integrator's one in `CopyTests`),
   where the first build added about 88. The faces builder's counts match its blueprint report in number (two new in
   `TerminalMenuTests` beside the one renamed, five in `ScreensDrawingTests`, four in `SessionsTests`, two in
   `SampleReaderTests`), so the 18 are in the phone-door builder's files, whose report gives no per-file count in
   either build. The integrator writes no builder's tests, so the gap is named here and not filled.
8. **Slips, named.** First run: the `rm` of the two staging files ran outside the history block; a watch script
   started to wait on two runs held a `pgrep -f` behind a `grep` that had not matched, and was stopped at once and
   replaced by one with no process lookup, having signalled nothing; and decision 6's whole p342 ablation, whose
   leftovers the second run removed (443 MB and two `p342-conformance-*` folders under `/private/tmp`, by exact path,
   after `lsof` showed no process holding them and their pids gone). Second run: a few reads at its start ran outside
   the block (`ls`, `wc`, `cat` of the profile, the `cp` of the first 26.3 log), and one wait loop (`grep` and
   `sleep`), which was stopped and armed again inside the block. And `node build/p316/ablation-ios.mjs --list`, meant
   to count arms, started a FULL 728-arm ablation, because the script has no `--list`; it ran for about four minutes,
   beside the 18.3 `test:ios`, before its task was stopped. `lsof` then showed no process in its clone (the four node
   processes in the worktree all wrote to the 18.3 log), the clone (92 MB, under `/private/tmp` by the script's
   default) was removed by exact path, and the worktree's delta read the same after (98 files, +16,977 −771, 18 new).
   The 18.3 run passed regardless. His history did not move across any of them.

### Commands, exit codes and numbers, against the first build's integrator (2026-10-21)

The final battery (`logs/final-*.txt`) ran after the second run's fixes, every command once, in §11's order. The first
run's logs (`logs/*.txt`, 15:16 to 17:07) read the same as the battery on every command the battery repeated.

| Command | Exit | This rebuild | The first build's integrator |
| --- | --- | --- | --- |
| `df -h /` | – | 40 to 42 GiB free throughout | 70 GB free at the end |
| `node build/p316/vectors.mjs`, once (first run), then `--check` (and again in the battery) | 0, 0, 0 | 50 signed requests (42 writes), 44 answers to 14 routes (23 to writes), 157 names (6 only the Mac can hold); 887 → 6,015 lines and 257,901 → 366,071 bytes | 0; the same counts, 887 → 4,950 lines and 257,901 → 336,845 bytes (the `names` section's shape is this rebuild's door builder's, its decision 3) |
| `node build/p3333/sample.mjs`, once, then `--check` (and again in the battery) | 0, 0, 0 | 1,927,421 → 1,928,338 bytes, 64 `"rename": true` and one `"renames": true`; 5 sessions, 288 states, 15,840 list answers from 71 pieces | 0; the same bytes and counts |
| `npm run typecheck` | 0 | 0 import violations over 1,434 files and 8,175 imports, 0 cycles | 0; 0 violations, 0 cycles |
| `npm run build` | 0 | 45 s; conformance:ios PASS (54 rules), gate:onlyadd PASS, the contract inventory byte for byte, gate:electron 179 of floor 179, conformance:harnessprobes PASS | first try 1 (gate:background on `v62`), then 0 in 44 s |
| `npm test` (scratch HOME, in the block) | 1 | 53 s; 1,164 files, 21,844 tests: 21,826 passed, 4 failed, 14 skipped. The 4 are in 3 files (`process-table.native`, `ps.native` twice, `p269-env-names`), each because the block refuses `/bin/ps`; no shell the last one starts outlived it | 1, 51 s; 21,812 passed, 9 failed in five files (`/bin/ps` and FSEvents) |
| `conformance:pocket` | 0 | 190 rules, 25,516 checks, 11 s | 0; 190 rules, 25,251 checks |
| `conformance:pocket:hostile` | 0 | 343 arms, 17.2 s | 0; 343 arms |
| `P313_ONLY=<the door builder's 73 arms> ablation:p313`, with `P313_SCRATCH` (first run) | 0 | 919.6 s; 73 of 73 red on the rule that owns each (59 new, 14 re-pointed); 793 entries | 0, 816.7 s; 74 arms, 793 entries |
| `gate:onlyadd` | 0 | build-11, build-12 and launch as sealed; 37 routes served, 479 requests replayed, A2 110 instances over 15 routes; nothing resealed | 0; 3 frozen sets as sealed |
| `ablation:p33311 --only C2,R8c` (first run) | 0 | both controls green, 19 s | 0; both controls green |
| `gate:contract` | 0 | the baseline byte for byte, unmoved | 0; unmoved |
| `conformance:ios` | 0 | 54 rules over 61 app files, 91 test files and 185 files under `ios/`, 10 s | 0; 54 rules |
| `P316_ONLY=<46 arms> ablation:p316`, with `P316_SCRATCH` (first run) | 0 | 46 of 46 red on the rule that owns each (38 new, 8 re-pointed), the clone removed, the worktree unmoved; 728 entries | 0, 478 s; 42 of 42 red, 728 entries |
| `conformance:phonecopy` | 0 | 26 screens, 878 segments, 95 of 95 Mac words, 113 of 113 owned rules | 0 (§0.3: 95 of 95, 113 of 113) |
| `conformance:manager` | 0 | 64 rules, 2,832 checks | 0; 64 rules (2,809 checks at the verb builder) |
| `conformance:machines` | 0 | 24 s | 0, 26 s |
| `conformance:remoteclose` | 0 | 11 tests | 0 |
| `conformance:farattach` | 0 | 11 rules | 0 |
| `P342_ONLY=b148a,b148e,b000c ablation:p342` (decision 6) | 0 | 119.5 s; `b148e` and `b148a` red on condition 148, the control unmoved, the clone gone | 0; `b148e` red on condition 148 |
| `gate:simulator` | 0 | 5 reach `withSimulator`, floor 5 | 0 |
| `gate:checks` | 0 | 275 check scripts classified, 54 `tsxCli()` importers of floor 54 | 0 |
| `gate:electron` | 0 | 179 of floor 179 | 0; 179 of 179 |
| `gate:background` | 0 | 577 files, 3 long-lived starts each ended in a `finally`, 19 of 19 fixtures | 0 |
| `test:ios`, iOS 26.3, first run (outside, under a slot) | 1 | 383 s; Debug 1,127 and Release 1,124 executed, 2 failures each (decision 5) | first and second tries 1, 1 (65 failures, then 1) |
| `test:ios`, iOS 26.3 (outside, under a slot) | 0 | 395 s; Debug 1,127 and Release 1,124, 0 failures; build-11 662, build-12 727 and launch 623 rows as sealed; the rename door read, verified and answered 5 of 5 (bodies of 319, 110, 110, 93 and 915 bytes); no `p316-` device left | 0, 341 s; Debug 1,145 and Release 1,142 (decision 7) |
| `test:ios`, iOS 18.3 (outside, under a slot) | 0 | 294 s; the same counts, rows and door | 0, 346 s; the same counts as its 26.3 |
| The grader self-tests, under one slot: `probe-p349`, `probe-p316`, `probe-p313`, `probe-p317`, `probe-p318`, `probe-p337`, `probe-p3167`, `probe-p348` | 0 each | p349 10 graders and 43 clauses (188 ok); p316's Phase 349 section 172 cases (2,106 ok in all); p313 PASS; p317 13 and 62; p318 25 and 80; p337 24 and 99; p3167 9 and 34; p348 17 and 65 | 0 each; p316's Phase 349 section 77 cases (108 after the probe review); p349 10 graders, 46 clauses and 187 ok after it |
| `npm run package`, unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`, scratch HOME, every signing and notarization variable removed) | 0 | 53 s; DMG 173,177,646 bytes, ZIP 172,786,902 bytes; the app's signing skipped, the three nested binaries signed ad hoc, nothing notarized, no native module rewritten (the rebuild step's three modules keep their times); the Electron zip and the DMG builder downloaded into the scratch HOME | 0, 53 s; DMG 173,177,592 bytes, ZIP 172,784,572 bytes |
| `git diff 40aebfcc --stat` | 0 | 98 tracked files (+16,977 −771) and 18 new; nothing outside the four builder lists and the integrator's but this file and the two files §9.1's note names (`EndBar.swift` and `p348-remove-verdict.test.ts`) | 98 tracked (+14,827 −652) and 18 new, against `266d7d91` |

### History

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `741827 1793377397` and `23166 1790702242` at the first
command of each run and after every run since, inside the block and outside it: across both `test:ios` runs of the
second run, the battery, the self-tests and `package`. Neither moved.

### What did not run, and why

- **The live `rename` group of probe:p316 and probe:p349.** They start an Electron and Simulators, which are the
  verifiers'. The driver, its UI steps and the shadow refusal are proven by `node --check`, by `test:ios`'s
  `build-for-testing`, which compiles the UI test target (the test plan holds `TortieUITests`), and by the 172 self-test
  cases, not by a run.
- **`smoke:t1`, `smoke`, `smoke:t3`, `smoke:remote` and `smoke:machines`.** The computed task forbids them; §11 step
  9's `package` ran alone.
- **`npm test`'s four `/bin/ps` tests outside the block.** They need `/bin/ps`, which the history block refuses
  (`spawnSync /bin/ps EPERM`); running them outside the block is not allowed. The first build named the same family at
  the parent.
- **The whole of `ablation:p313`, `ablation:p316` and `ablation:p342`.** §11 names the arms this phase adds or moves,
  and those ran; a full run is the verifier's.
- **The two relayed requests.** The first run's (John's comment on scrollback for pi) is not part of this phase. The
  second run's (that real agents may test the phone, and that the other workflows continue) asks nothing of this
  step: it ran no agent and no probe, held at most one lock slot at a time, released each as it ended, and left no
  process, Simulator or slot behind.

### The fix round (2026-10-30 and 31)

Three verify lenses read this build. The attack lens approved, with one nit and no change asked. The phone lens and
the Mac lens each answered needs_work. Every finding they raised was a defect of a PROBE or of this file's words, not
of what the Mac or the phone does, except the phone lens's two nits on the Rename sheet. No lens found a scenario worse
than the parent, so nothing was dropped. The fix ran once, in `/private/var/tmp/tortie-wt/wt-p349`, in two runs of the
one step: the first (2026-10-30, 19:36 to 20:56) was cut off by a usage limit after 236 tool calls, while its second
probe:p316 run was still going, and the second (2026-10-31) continued from its record, kept every edit it had made,
changed finding 9 on his ruling, added finding 14 from the first run's own reading, and ran what was left. Nothing was
committed, staged or stashed, and `/Users/gdc/gmux` was not written. No real agent ran. On `-L gmux`, see finding 9:
the first run's three app runs listed it, read only, through the helper's census; the second run's listed nothing. The
fixer's scratch is `/private/var/tmp/tortie-wt/scratch/p349/fixer/`: the edit scripts under `edits/`, the pre-fix
copies under `orig/` (the first run's) and `orig2/` (the second's), the logs under `logs/`, the derived data under
`dd-*`, and the second run's scratch `tmux` under `shim/`.

| # | Lens and finding | What changed | Where |
| --- | --- | --- | --- |
| 1 | phone, MAJOR: probe:p316 read Save name off the wrong element, so RM5 and RM2 (both tabs) failed on a correct app | The UI test presses and reads Save name as its BUTTON, `app.buttons.matching(identifier:)`, and prints `saveAll`: every element carrying `rename-save` in one snapshot, with its XCUIElement type. iOS draws an `Other` element (type 1) at the button's frame that always reads enabled, and `element(_:)`, the first match of any type, found it. The graders read only the button (type 9) through `saveButtonOf`, and a reading with no button is UNREADABLE, in RM1, RM2, RM3 and RM5. A row sheet's settle loop now runs its whole 15 s unless a line is drawn, because Save stays off over the name it holds | `ios/TortieUITests/P316DriveUITests.swift` (`saveButton`, `saveReadings`), `build/p316/probe-p316.mjs` (`saveButtonOf`, `gradeRm1`, `gradeRm2`, `gradeRm3`, `gradeRm5`) |
| 2 | phone, MAJOR: RM6 asked a hold during End these to toggle the row, which build 12 never did | RM6 now grades build 12's own reading. The hold draws no Rename and leaves the row's selection as it was, and a hold that ticks or unticks the row FAILS. §8.2 is corrected | `gradeRm6`, its arm title, §8.2 |
| 3 | phone, minor: RM7 was never driven, because `batch-done` presses Done, which End these draws only after a batch ran | RM7 now runs BEFORE RM6, and its sheet is closed with Cancel. RM6 is the drive's last act. `batch-done` left the rename drive | the rename drive's steps |
| 4 | phone, minor: a name typed on the phone reached app.log through the Mac's quit-time scrollback line | Named as a known place in §8.1 and §12.1 (a stated trade). The line names every session it could not write by its display name, and it did so before this phase too. RN6 reads app.log and its rotated file with `appLogCanaryHits`. That function counts a canary found only on that line separately (`appLogKnown`) and FAILS a canary on any other line, so RN6 cannot go red on that line. `src/main/sessions/reconcile-plan.ts` is unchanged. It is a Mac log line from before this phase, outside this phase's files, and naming sessions by id would change what he reads in every quit's line | `build/p349/probe-p349.mjs`, §8.1, §12.1 |
| 5 | phone, nit: Save name is off for a refused character with no reason given | NOT DONE. The sheet would draw a sentence it has never drawn, which a nit does not earn in a fix round. New session's Name already says why. This is left for a later round | — |
| 6 | phone, nit: a name the Mac holds past the cap could not be shortened one unit at a time | DONE. `NameField.takes` also takes an edit that leaves no more units than the field holds. A name past 120 units shrinks one unit at a time and never grows, and every name at or under the cap is held exactly as before. Four asserts were added to `testTheFieldTakesNoEditPastTheCap` | `ios/Tortie/Screens/NameField.swift`, `ios/TortieTests/NameFieldTests.swift` |
| 7 | Mac, MAJOR: RN5 renamed a session whose draft it never opened. `machineUp` had focused the far folder's tab, so the session's row was not drawn, the click found nothing, and F2 opened the active session's draft | RN5 focuses the session's own project tab first (`__p293.addProject`). It then clicks that session's own `.stab` or `.srow`, presses F2, and puts its draft only into an input whose `[data-session-id]` is the renamed session (`owner`). A draft F2 opened for another session, or no draft at all, is UNREADABLE. Four broken readings and one honest variant were added | `build/p349/probe-p349.mjs` (RN5's drive and its UNREADABLE rule), `fixtures/graders.json` |
| 8 | Mac, MAJOR: RN6 could not pass on macOS. The walk yielded `/var/…` paths, every store was built under `/private/var/…`, and the manifest's own backup ring was named nowhere | RN6 walks the harness folder by its real path and compares every path in canonical form (`canonicalOf`, `storeOfFile`). The manifest's backup ring (`gmux/backups/manifest.db.<n>` and a staged `.manifest.db.<stamp>.part`, `recovery.ts`) is now a named store. The self-test reads a `/var` path against `/private/var` stores both ways, the ring, and four files that are no store. §8.1 lists the ring | `build/p349/probe-p349.mjs`, `fixtures/graders.json`, §8.1 |
| 9 | Mac, minor: `build/electron-run.mjs`'s layer-4 census lists sessions on `-L gmux` around every launch that names a scratch socket, which the brief forbids even to count | CHANGED in the second run, on his ruling relayed with its brief: no run of ours lists his server, not even to count. (The first run had left it his call and named it in the header.) probe:p349 now hands the helper its socket through the app's env alone (`GMUX_TMUX_SOCKET`, `tmuxSocket: null`), as the Mac lens's own instrument did, so the helper still refuses a socket that is not a scratch one and judges the socket the app announces (its layers 2 and 3), and its census, which it reads only for a launch that names `tmuxSocket`, never runs. The per-launch `kill-server` the helper made for a named socket is the probe's own now (`endScratchServer`, in `launch`'s `finally`, by the socket's name alone), so HEAD still starts with no server of the parent's alive, and `build/harness-socket.mjs` still ends what is left after the run. `build/electron-run.mjs` and every other phase's probe are unchanged. STILL REACHING THE CENSUS, for him: every other probe this phase's rows name passes `tmuxSocket: SOCKET`, being probe:p316, which this phase runs (its `rename` group), and probe:p313, probe:p317, probe:p318, probe:p337, probe:p3167 and probe:p348, which no lens of this phase ran. The first run's three app runs (probe:p349 once, probe:p316 twice) listed `-L gmux` through that census, read only (`list-sessions`), before the ruling. The second run's listed nothing: probe:p349 names no socket to the helper, and each of the second run's app runs had a scratch `tmux` first on the PATH of the probe's own node process (the probes close the app's PATH), which answered the census's one argv with no sessions, refused any other argv naming that socket, logged each call, and passed every other argv to Homebrew's tmux unchanged (`fixer/shim/tmux`, proved first with `/bin/echo` standing in for tmux, so no test of it could reach a server). Its log is the measurement: 0 calls across probe:p349, so the census did not run, and probe:p316's count is in the table below. `build/with-scratch-machine.mjs` takes the first `tmux` on that PATH as the loopback machine's program, so probe:p349's far commands ran through it too, on the harness socket, unchanged | `build/p349/probe-p349.mjs` (`launchOptions`, `endScratchServer`, `launch`, the header), its CLAUDE.md row |
| 10 | Mac, minor: §12.1 said D7 changes a far tmux name "only where tmux changed or refused it before", which is not true | Corrected. D7 holds back what ANY measured version reads, so on a far 3.6a it also changes a final `#` (only 3.7b and 3.7c drop one) and a create's leading `-`. The display name, the `@gmux-name` stamp and the phone are unchanged. No code change was made: the raw far tmux name is not what this Mac or the phone draws. Keeping a final `#` for a far tmux older than 3.7b would make the far rule depend on a version the carriage reads | §12.1 |
| 11 | Mac, nit: names outside ASCII read back one `_` per cell in the window and in the phone's answer | §12.1 now says that the window lists the read-back and the phone's answer carries it, as the parent's own F2 already shows | §12.1 |
| 12 | Mac, nit: RUN failed whenever `P349_ARMS` left out RN1 and RN3 | RUN's manifest clause reads as not run when neither of the two arms that start an agent session ran (`AGENT_ARMS`), and passes then only with no agent session started | `build/p349/probe-p349.mjs`, `fixtures/graders.json`, §8.1 |
| 13 | attack, nit: this Mac's local rule on 3.2a to 3.4 | No change. It is stated in §12.1 already, and the far rule covers every far server | — |
| 14 | the fix round's own first probe:p316 run: RM1 18.3 read FAIL ("the ⋯ did not open its menu") and RM3 18.3 UNREADABLE. The session's page had drawn `Tortie could not reach your Mac.` and no ⋯, because the door refused one TLS handshake as the page read it (`refused a connection at the door: handshake`, app.log, 00:24:43.547Z); the list's read before it had answered. The first run's second probe:p316 run and the phone lens's run passed both arms, and the door's listener (`listener.ts`) and the phone's transport are unchanged by this phase, so it is a flake of the world, read as a defect of the app | `renameOpen` presses that page's own Try again ONCE, as a person would, and prints `rename-reach` (what the page drew, whether Try again was there to press, whether it cleared). RM1 reads a page the press did not clear as UNREADABLE, naming the sentence, never as a ⋯ that did not open, and a pass after a cleared page says so in its line. Six self-test cases (UNREADABLE twice, UNREADABLE beside a ⋯ line that says it opened, a pass, and two FAILs after a cleared page) | `ios/TortieUITests/P316DriveUITests.swift` (`renameOpen`, `Seen.sessionFailureRetry`), `build/p316/probe-p316.mjs` (`gradeRm1`, `rnReachBefore`, the header), the probe:p316 CLAUDE.md row |

**Commands, exit codes and numbers: the first run (2026-10-30).** Everything except the Xcode, Simulator and
Electron runs ran under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. Those ran outside it, with
`HOME` and `ZDOTDIR` the fixer's scratch folder, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, each under ONE lock
slot, one at a time.

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 2,161 ok lines (the phone lens's re-run read 2,149; 12 new cases); the Phase 349 section 227 cases |
| `node build/p349/probe-p349.mjs --grader-self-test` | 0 | 246 ok lines, 10 graders, 43 clauses, 151 readings (138 before; 13 new); 8 new reader checks |
| `node build/p316/vectors.mjs --check`, `node build/p3333/sample.mjs --check` | 0, 0 | unchanged: 50 signed requests, 44 answers; 5 sessions, 288 states, 15,840 list answers |
| `npm run typecheck` | 0 | clean |
| `npm run build` | 0 | 61 s; conformance:ios PASS, gate:onlyadd PASS, the contract inventory byte for byte, gate:electron 179 of floor 179 |
| `npm test` (scratch HOME, in the block) | 1 | 81 s; 21,844 tests: 21,826 passed, 4 failed, 14 skipped. The same four `/bin/ps` tests as the integrator's (`process-table.native`, `ps.native` twice, `p269-env-names`) |
| `conformance:pocket`, `conformance:pocket:hostile` | 0, 0 | 190 rules, 25,516 checks; 343 arms, 17.3 s |
| `gate:onlyadd`, `gate:contract` | 0, 0 | build-11, build-12 and launch as sealed, 37 routes, 479 requests replayed; the baseline unmoved |
| `conformance:ios` | 0 | 54 rules over 61 app files, 91 test files and 185 files under `ios/` |
| `conformance:phonecopy`, `:manager`, `:machines`, `:remoteclose`, `:farattach` | 0 each | manager 64 rules and 2,832 checks; machines 44 s (beside `test:ios`); remoteclose 11 tests; farattach 11 rules |
| `gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | 5 of floor 5; 275 check scripts; 179 of floor 179; 577 files and 19 of 19 fixtures |
| `P316_ONLY=bd1a,…,bd10b ablation:p316` (the 18 `bd` arms, `NameField.swift`'s five among them), with `P316_SCRATCH` under the fixer's folder | 0 | 264 s; 18 of 18 red on rule (bd), the clone removed, the worktree unmoved |
| the eight grader self-tests (p349, p316, p313, p317, p318, p337, p3167, p348) | 0 each | p313 14, p317 128, p318 141, p337 308, p3167 139, p348 427 ok lines, each PASS |
| `npm run test:ios`, iOS 26.3 (outside, one slot) | 0 | 407 s; Debug 1,127 and Release 1,124 executed, 0 failures; build-11 662, build-12 727 and launch 623 rows as sealed; the rename door 5 of 5 read, verified and answered (bodies of 319, 110, 110, 93 and 915 bytes) |
| `P349_KEEP=1 npm run -s probe:p349`, the parent the Mac lens's built `40aebfcc` (outside, one slot) | 0 | 242 s; 10 of 10 arms PASS, 0 FAIL, 0 UNREADABLE. RN5: the session's own tab focused, its `.stab` clicked, the draft's `owner` the renamed session, the phone's rename done in 14.5 ms, the draft holding the phone's name after it, 12 other sessions unchanged. RN6: 104 files read by their real path, 10 canaries, 18 hits, each in a named store (8 in the manifest, 8 in its backup `manifest.db.000004`, 2 in the far log); app.log 0 hits and 0 known; 385 rename lines for 385 that acted; 2,318 argv samples, 0 hits. RN3: the default name lived 323 ms here and 990 ms far. RN4: p50 64.9 ms, p95 90.3 ms, max 99.1 ms against 15,000. RUN: 3 agent sessions started, all inside the run |
| the manifest's argv[0], read by this round with `sqlite3` from a copy of the kept run's manifest | — | 14 rows: the two `claude` rows and the one `codex` row are the run's own wrappers under `p349/home/.local/bin`; every shell is `/bin/zsh -l` or empty (far). No real agent ran |
| `P316_ARMS=rename probe:p316`, build 12 and build 11 the phone lens's parent trees (outside, one slot), run 1 | 1 | 1,889 s; 39 of 41 arms PASS. RM1 to RM7 and RM9 on 26.3 (Save read off its button, RM6 graded as build 12 reads, RM7 driven before it), RM8, RM10, RMP and the twelve RMH arms; RM1 18.3 FAIL ("the ⋯ did not open its menu") and RM3 18.3 UNREADABLE: finding 14 |
| the same, run 2 | — | started at 20:46 and cut off by the usage limit at 20:56, after RM1 to RM7 and RM9 on 26.3 and RM1 and RM3 on 18.3 had passed; the main session ended what it left (a booted Simulator, the scratch server and its six stand-in panes, a crash handler, the lock slot) |

**The second run (2026-10-31).** The same rules: everything under the block but the Simulator and Electron runs and
the three `/bin/ps` test files, which ran outside it with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and no
`TERM_SESSION_ID`, the app runs each under ONE lock slot and never two at once. The ablations ran in the block beside
them. Logs under `fixer/logs/` (`p349-2`, `p349-rn5`, `ti-18`, `p316-rename-3`, `abl-*`, `g2-*`, `g3-*`, `pstest`,
`package`).

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p349/probe-p349.mjs --grader-self-test`, after finding 9's edit | 0 | 246 ok lines, 10 graders, 43 clauses |
| `node build/p316/probe-p316.mjs --grader-self-test`, after finding 14's edit | 0 | 2,167 ok lines; the Phase 349 section 233 cases (227 and finding 14's six) |
| `xcrun swiftc -parse ios/TortieUITests/P316DriveUITests.swift` | 0 | — (the UI test target was then compiled by `test:ios` 18.3 and by probe:p316's B1) |
| `npm run typecheck` | 0 | 0 import violations over 1,434 files and 8,175 imports, 0 runtime cycles |
| `npm run build` | 0 | 44 s; conformance:ios PASS (54 rules), gate:onlyadd PASS (the three frozen sets as sealed), the contract inventory byte for byte, gate:electron 179 of floor 179, gate:background 577 files and 19 of 19 fixtures, gate:simulator 5 of floor 5, gate:checks 275 check scripts, conformance:harnessprobes PASS |
| `conformance:ios`, `gate:electron`, `gate:background`, `gate:checks`, `gate:simulator`, each again on its own | 0 each | as in the build |
| `conformance:push` (its H3 reads `probe-p316.mjs`) | 0 | 26 rules, 2,404 checks |
| `npm test` (scratch HOME, in the block), after this run's edits | 1 | 49 s; 1,164 files, 21,844 tests: 21,826 passed, 4 failed, 14 skipped; the four are the `/bin/ps` tests again, and nothing else |
| `vitest run` of `process-table.native`, `ps.native` and `p269-env-names` (`src/main/tmux/__tests__`), outside the block, scratch HOME | 0 | 3 files, 10 tests passed, 2 s: the four the block refuses `/bin/ps` to pass, so the whole suite is green (21,830 passed and 14 skipped of 21,844) |
| `ablations.sh`: `P313_ONLY=<the integrator's 73 arms> ablation:p313` with `P313_SCRATCH`; `ablation:p33311 --scratch … --only C2,R8c`; `P342_ONLY=b148a,b148e,b000c ablation:p342` | 0, 0, 0 | 897 s, 73 of 73 red on the rule that owns each, base 12 checks green, every clone file restored by sha256; 19 s, 2 of 2 controls green; 144 s, `b148a` and `b148e` red on condition 148 and the control unmoved. Each clone gone |
| `npm run test:ios`, `P316_RUNTIME=18.3` (outside, one slot) | 0 | 355 s; Debug 1,127 and Release 1,124 executed, 0 failures; build-11 662, build-12 727 and launch 623 rows as sealed; the rename door 5 of 5 read, verified and answered (bodies of 319, 110, 110, 93 and 915 bytes); the device archive unsigned, no DEBUG seam; 0 `p316-` devices left |
| `check-parents.sh` | 0 | the Mac lens's parent's `routes.ts`, `names.ts`, `session-names.ts`, `core.ts` and `package.json` are `40aebfcc`'s; `parent-b12` 194 files at `40aebfcc` and `parent-b11` 186 at `d2bb05ee`, 0 differ, 0 extra |
| `P349_KEEP=1 npm run -s probe:p349`, the parent the Mac lens's built `40aebfcc`, `tmuxSocket: null` (outside, one slot) | 0 | 228 s; 10 of 10 arms PASS. The scratch server ended by the probe after each launch (`ended`, twice). RN5: the session's own tab focused, its `.stab` clicked, the draft's owner the renamed session, the phone's rename done in 14.0 ms, the draft `p349 the window draft` holding the phone's name after it, 12 other sessions unchanged. RN6: 104 files read, 10 canaries, 18 hits, each in a named store (8 in the manifest, 8 in `backups/manifest.db.000004`, 2 in the far log); app.log 0 hits and 0 known; 385 rename lines for 385 that acted; 2,320 argv samples, 0 hits. RN3: the default name lived 248 ms here and 941 ms far. RN4: p50 56.1 ms, p95 91.6 ms, max 95.6 ms against 15,000. RUN: 3 agent sessions started, all inside the run, 0 real Tailscale in 228 samples, nothing left. The scratch `tmux` logged 0 calls naming `-L gmux` |
| `P349_ARMS=RN5 npm run -s probe:p349` (outside, one slot) | 0 | 33 s; 4 of 4 PASS (RNP, RN0, RN5, RUN), RUN's manifest clause read as not run because no arm started an agent (finding 12, live); the scratch `tmux` logged 0 calls |
| the manifest's argv[0], from a copy of probe:p349's kept manifest | — | 14 rows: two `claude` and one `codex`, each the run's own wrapper under `p349/home/.local/bin`; every shell `/bin/zsh -l` or empty |
| `P316_ARMS=rename probe:p316`, `P349_PARENT_IOS` and `P348_PARENT_IOS` the phone lens's build 12 and build 11, `P316_KEEP=1`, the scratch `tmux` first on its PATH (outside, one slot) | 0 | 1,734 s; 41 of 41 arms PASS, 0 FAIL, 0 UNREADABLE: RM1 to RM7 and RM9 on 26.3 (RM2 on both tabs; RM5 with the field at 120 of 130 units typed; RM6 the selection as build 12 leaves it; RM7 withheld by Home with its line), RM1 and RM3 on the 18.3 floor (`it's "x" fix--auth` kept exactly, its page reaching the Mac at once, so no Try again was pressed), RM8, RM9 (one start, then ONE rename of its id, the Terminal under `named at start`), RM10, RMP (build 12, build 11 and this app against a 348 Mac), the twelve RMH arms, and RUN, Q1, N10, MD3, K2, no Electron and no `p316-` Simulator left. The helper's census asked `-L gmux list-sessions` twice (before and after the launch) and the scratch `tmux` answered both with no sessions: nothing reached his server |
| the manifest's argv[0], from a copy of probe:p316's kept manifest | — | 15 rows: six `claude`, each the run's own wrapper under `p316-probe-80757/home/.local/bin`; nine shells, `/bin/zsh -l` |
| `npm run package`, unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`, scratch HOME with the integrator's caches, every signing and notarization variable removed), in the block | 0 | 53 s; DMG 173,169,284 bytes, ZIP 172,805,271 bytes; the app's signing skipped, its three nested binaries signed ad hoc, nothing notarized |
| `git diff 40aebfcc --stat` | 0 | 98 tracked files (+17,277 −774) and 18 new; this run's edits are `build/p349/probe-p349.mjs`, `build/p316/probe-p316.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `CLAUDE.md` and this file |

**History.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `741827 1793377397` and `23166 1790702242` at the
first command of each run, before and after every run outside the block (both runs' app runs, both `test:ios`, the
`/bin/ps` tests and `package`) and at the end. Neither moved.

**What did not run, and why.**

- **`smoke`, `smoke:t3`, `smoke:remote` and `smoke:machines`.** The last two are forbidden by name. The first two
  start `electron .` straight from `build/harness-socket.mjs`, outside `build/electron-run.mjs`, with the caller's
  `HOME` and no hidden rows or stand-ins, which the brief's rule for any app run refuses. This round touched no Mac
  product code (`src/` is as the integrator left it), so `npm run package` alone of §11 step 9 ran, as the
  integrator's did.
- **The whole `ablation:p313`, `ablation:p316` and `ablation:p342`.** The arms this phase added or moved ran (the
  integrator's sets, and the first run's 18 `bd` arms after `NameField.swift` moved); a full run is the verifier's.
- **probe:p313, probe:p317, probe:p318, probe:p337, probe:p3167 and probe:p348 live.** No lens of this phase ran them,
  and they still reach the helper's census (finding 9); their self-tests ran in the first run.
- **The phone lens's two nits as product changes beyond finding 6.** Finding 5 is left for a later round, as said.
- **Finding 14's Try again, live.** The second run's probe:p316 reached the Mac on the first read in every drive, so
  `rename-reach` was never printed and the press was never made; the path is proved by `swiftc -parse`, by the UI
  test target compiling in `test:ios` and in B1, and by its six self-test cases, not by a run. Only RM1's two drives
  read `rename-reach`; RMH's answer arms and RM10 open the ⋯ the same way and grade it as before.
