# Phase 316.7 — the phone's Sessions tab shows, groups, sorts and filters every session — SPEC

Written by the spec step on 2026-10-02 in `/private/tmp/wt-p3167` at `c1a5fd38`, a LOCAL snapshot commit (never pushed) of
Phase 317's approved tree (End from the phone) on Phase 316.6's fixed tree (`551312f7`, the tab bar, Settings, Unpair) on
origin/main. Every `file:line` below was re-read at `c1a5fd38` on this date. Phase 318 (Reply) builds in parallel from the same
snapshot in `/private/tmp/wt-p318`; §12 lists every file both phases touch and what the main session reconciles at the replay.
316.6 is switching markdown off at landing; nothing here draws an answer, so nothing here depends on it.

Read with it, whole: `docs/BACKLOG.md` "## Phase 316.7" (his words and the entry this file reconciles), `build/p317/SPEC.md`
and its three "§As built" sections (End and End these as built, the shared gate move), `build/p3166/SPEC.md` and its "§As built"
(the tabs), `build/p293/SPEC.md` (the Mac's session manager this mirrors), CLAUDE.md's `conformance:manager`,
`conformance:pocket`, `conformance:ios` and `conformance:phonecopy` rows.

**Where this file and the entry disagree, this file wins, and §3 says why for each.**

---

## 1. What he asked, and what a person notices

His words, 2026-09-30: "I think we should also have a way of grouping, filtering sessions and sorting them because many many
sessions are old that tortie stores". His word to start, relayed by the harness: "that won't conflict".

- The **Sessions tab** opens on **Active** (a fresh install; afterwards on what he left), with **All · Active · Ended** under the
  title, so ended sessions are out of sight until he asks for them.
- Sessions sit under their **project** (a folder and its machine, the Mac's rule), each header with a **count**, a chevron that
  opens and closes it, the machine's badge, the folder only when two projects share a name, and the needs-input dot when a
  session in it waits, so a project he closed never hides one (§15 F3).
- **One menu** beside Select holds **Group by** (Project, None), **Sort by** (Recent activity, Name, Oldest first), **Agent**
  and **Machine** (each only when there is more than one to choose), and **Clear filters**.
- A row aged from its creation reads `3d old`; a row aged from its last output or its wait reads `3d`, as today. A row with no
  clock at all reads the dash, where today it reads `20000d`.
- The phone remembers Show, Group by and Sort by. A filter and an opened or closed project last until the app quits.
- **Select** (Phase 317's End these) works exactly as it does today on the rows drawn.
- The **Needs input** tab, its badge and Settings do not change.

## 2. Tier and the independent methods

**Tier 3.** A new read route on a door that faces the public internet through Funnel; it sends more of his words than today
(every listed session's name and project, where today's list stops at 200); the route list is a confirmed field of the door's
hash (`src/main/pocket/pairing.ts:342`), so the door asks him again; and it claims to work over every row set a person can have.

The verifier must do, and name in the verdict, at least these, two of them independent of every builder:

1. **The attack** (independent): the hostile query set against the real door through the stand-in (§9.4 Q2), the hostile
   bodies against the phone through `build/p316/hostile-door.mjs` (§9.5), the removal race (Q3), the hostile row set (§9.3).
2. **Re-derivation** (independent): the verifier's own reader, written from §6 of this file WITHOUT importing
   `src/shared/session-list.ts` or `src/main/pocket/routes.ts`, recomputes membership, groups, counts, order, ages, `collapsed`,
   `folder` and `omitted` for every combination over `probe:p3167`'s 2,000-row world, and compares the Mac sheet's groups under
   All with the door's (§9.6).
3. **His shape**: the shipping composer over a scratch manifest seeded to the counts §4 recorded from his once. No role reads his
   manifest again, under the main session's standing rule (§9.7, §15 F20).
4. **The parent**: `c1a5fd38` built, over the same worlds (§9.8).

## 3. Reconciled: the entry against the tree at `c1a5fd38`

| # | The entry says | The tree says | Ruling here |
| --- | --- | --- | --- |
| 1 | "`GET /v1/sessions`, the fifth" route | Five routes already: `pair`, `blocked`, `session`, `turns`, `end` (`src/main/pocket/door/table.ts:65-71`, `src/shared/ipc/pocket.ts:77-88`). 317 added `POST /v1/end` | `sessions` is the SIXTH. R4's pin moves from `d1fefb71…` (re-derived: `printf` of the five sorted lines through `shasum -a 256`) to `a6c1bb3caaa79907ac33a1361b68a403784d789ffd6c09de31f36a019eede056` (six lines, re-derived the same way). 318 moves it again; §12 |
| 2 | "317 moves the rest of the gate into the same file"; S2.1 adds `lifecycleOf(status)` | 317 MOVED `sessionActionGates` whole to `src/shared/session-gates.ts:265-315`, with `DOOR_GATE_ENV` at `:322-327`. The sheet's partition is two lines of `rowPasses` reading `row.gates.live`, `.unknown`, `.ended` (`src/renderer/session-manager/view.ts:116-117`) | No `lifecycleOf`. The door asks `sessionActionGates(session, session.status, DOOR_GATE_ENV)` and reads the same three fields; those two lines MOVE to `lifecycleKeeps` in `src/shared/session-list.ts`, which both `rowPasses` and the door call (D6) |
| 3 | "`Select` builds into `SessionsScreen.swift`" | 317 built End these as ONE attachable modifier, `.endBatch(_:list: ListModel)` (`ios/Tortie/Screens/EndBatch.swift:271-276`), reading rows from `ListModel.state` (`:324-328`) and calling `list.load()` on Done (`:368-371`); its header says "Phase 316.7's SessionsScreen adopts it by moving that line" (`:7-8`) | The modifier takes a protocol, `EndBatchList`, that `ListModel` and the new `SessionsModel` both conform to; its own logic does not change (§6.4.7) |
| 4 | Row shape: `sessionId, name, group, machine, statusDot, statusTitle, ageText, question` | 317's End these needs `end` on every row it selects over (`EndBatch.swift:64-66`, `:416`) | The row carries `end: PocketEndOffer` and a `waiting` word (§6.1) |
| 5 | "A Mac without this phase answers 404, drawn as the existing failure sentence" | A refused LIST read sends the phone to Pairing, not to a sentence: `.refused, .closedBeforeAnswer` with `kind == .list` answer `.pairAgain` (`ios/Tortie/Screens/DoorWords.swift:181-185`) | A refused `/v1/sessions` asks `/v1/blocked` once through the app's own `ListModel`; when that answers, the Sessions tab draws TODAY's two sections from it, byte for byte, Select included (D9). Only when both refuse does the phone go to Pairing, as today |
| 6 | Proposed caps 5,000 rows, 1 MiB | Measured (§4): 5,000 rows of his name lengths is 1,014,843 bytes, the budget itself, so the row cap would mean nothing | `POCKET_SESSIONS_MAX = 2000` rows and `POCKET_SESSIONS_BUDGET_BYTES = 1048576` (D4) |
| 7 | iOS build 5, after 316.6's 4 | 317 already set `CURRENT_PROJECT_VERSION = 5` (`ios/Tortie.xcodeproj/project.pbxproj:417,449,479`); his ruling of 2026-09-30 (running log): ONE TestFlight archive after every phone phase lands, numbered above every number they set | This phase does not touch the build number; rule (s) still reads 5 (D15) |
| 8 | "a build 4 phone still reads `others`" | No build 4 or 5 reached him: TestFlight 1.0.0 (3) is the last upload (running log, 2026-09-30) | `/v1/blocked` does not change, because a build 3 phone reads `others` (D2) |
| 9 | `ListScreen.swift:10-13` says the phone may order nothing; `facts.ts:228` lists sessions; `routes.ts:424-441` cuts others; `ipc.ts:447` the switch; `core.ts:2682` drops removed rows; `conformance-pocket.mjs:659`, `:1581` R4 and N1 | At `c1a5fd38`: `ListScreen.swift:21-26`; `facts.ts:237`; `routes.ts:497-514`; `ipc.ts:518-548`; `core.ts:2703` (`listSessions`) and `:2725` (`discarded` skipped); `conformance-pocket.mjs:788` (`ROUTE_PIN`), `:144` (N1) | Re-cited throughout. N1 already reads "no route names the push" since 317 (`:144`); `sessions` names none of its words |
| 10 | Every group's `folder` is the sheet's | The sheet ALWAYS draws the folder under a group (`src/renderer/session-manager/ManagedGrid.tsx:64-67`, `:92-94`) | The phone sends and draws it only when two groups share a label and a machine (the entry's rule), so less of his paths crosses the internet and a 390 pt row says just enough. A named difference, D7 |
| 11 | "Recent activity: by the clock the row draws" | Today's list order is `attentionRows` then `othersOrder` (`routes.ts:483`, `:367-383`, `:497-499`): waiting newest first, then rows with output newest first, then rows with none newest created | Recent activity IS that order, so Show All · Group None · Recent activity is today's list in today's order, uncapped (D10). Every row still draws the clock that placed it, and a creation clock now says `old` |
| 12 | Clear filters clears the agent and machine filters | The Mac's Clear filters resets every control, the lifecycle segment included (`SessionManagerSheet.tsx:370-381`) | Clear filters sets Show to All and clears both filters, the Mac's meaning (D12) |

## 4. Measured before this file was written

All in `…/scratchpad/p3167/spec/`, run with the tree's own pinned tsx (`node node_modules/tsx/dist/cli.mjs --tsconfig
tsconfig.node.json <script>`) from `/private/tmp/wt-p3167`. Each writes N sessions into a SCRATCH manifest through the shipping
`ManifestStore.insertSession` (`src/main/manifest/store.ts:373`), reads them back through `ManifestStore.listSessions`, and
removes its scratch directory in a `finally`. None reads his home. The machine is his Mac, shared with other phases' work, so
these are numbers under load.

**`measure.mts`, exit 0, 5 min 30 s.** The parent's answer is the SHIPPING `createPocketRoutes(facts).blocked()` at
`c1a5fd38`; the proposal is a prototype of §6.2's composer (scratch only). "real" names are 1 to 4 words, at most 27 characters
(his own longest, below); "worst" names are 300 characters, clipped to 200 by the prototype. 80 % ended, 15 % idle, 3 % running,
2 % waiting; one folder per 20 sessions; a third of the folders open as tabs.

| N listed | Parent `/v1/blocked` | Parent per row | Proposal, All · Project · Recent | Proposal per row | Compose, any combination |
| --- | --- | --- | --- | --- | --- |
| 500 real | 14 waiting + 200 others, 286 out of reach, 67,284 B | 314 B | 500 rows, 25 groups, 101,215 B | 202 B | 0.26 to 0.73 ms |
| 2,000 real | 48 + 200, 1,752 out of reach, 80,785 B | 326 B | 2,000 rows, 100 groups, 404,374 B | 202 B | 0.44 to 5.07 ms |
| 5,000 real | 109 + 200, 4,691 out of reach, 101,566 B | 329 B | 5,000 rows (prototype cap 5,000), 1,014,843 B | 203 B | up to 7.16 ms |
| 10,000 real | 182 + 200, 9,618 out of reach | 330 B | cut at 5,000 rows or 1 MiB, `omitted` the rest | 203 to 210 B | up to 14.03 ms |
| 2,000 worst | 34 + 200, 1,766 out of reach, 138,559 B | 592 B | 2,000 rows, 777,131 B | 389 B | up to 8.55 ms |
| 5,000 worst | 79 + 200, 166,961 B | 598 B | cut by the 1 MiB budget at 2,650 to 2,702 rows | 389 to 396 B | up to 7.17 ms |

**`measure2.mts`, exit 0.** `ManifestStore.listSessions` median of 9: 1.0 ms at 500, 2.5 ms at 2,000, 5.6 ms at 5,000.
`core.listSessions` (`src/main/sessions/core.ts:2703-2800`) adds about three `stat`s per row it cannot avoid
(`snapshotMaterialExists`, `savedOutputAt`, `stampRecordLocations`); three `statSync` per row on absent paths measured 11.9 ms
at 500, 49.1 ms at 2,000, 91.0 ms at 5,000, 195.2 ms at 10,000. **The parent pays this on every `/v1/blocked` read already.**

**`measure3.mts`, exit 0.** The End offer on a row is one `manifest.getSession` (`src/main/sessions/pocket-writes.ts:163-175`):
2,000 of them took 45.9 ms (median of 7), 500 took 14.4 ms. The parent asks it for at most 200 plus the waiting rows.

**So one `/v1/sessions` read at 2,000 rows costs the parent's listing (about 52 ms) plus at most about 46 ms of End offers plus
at most about 9 ms of composing, synchronously on main.** At his own count (below) it is a few milliseconds.

**His own manifest, counts only.** `sqlite3 "file:…/Tortie/gmux/manifest.db?mode=ro" ".backup <scratch>"` then counts from the
copy, deleted by an `EXIT` trap (confirmed gone with `ls`); exit 0 both runs. 354 rows: 252 removed (Past Sessions, never on the
phone), **102 listed** (55 idle, 9 running, 38 restorable), 23 folders, all on this Mac, 7 agents, the oldest listed 49 days old,
the busiest folder 27 sessions, no two listed folders sharing a name, names at most 27 characters (8.6 on average). Today his whole
list fits under the parent's 200; what crowds it is the 38 ended and the idle shells, which is what Show and grouping answer.

**Route pin**, re-derived with `printf '<lines>' | shasum -a 256`: the five lines at `c1a5fd38` give
`d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6`, which equals `conformance-pocket.mjs:788`; the six with
`GET /v1/sessions` give `a6c1bb3caaa79907ac33a1361b68a403784d789ffd6c09de31f36a019eede056`.

## 5. Decisions

- **D1. A new signed read, `GET /v1/sessions`, composed in main for the words the phone asks with.** The phone does no arithmetic
  on status, age or order (`build/p316/SPEC.md` §4.0; `ios/Tortie/Screens/ListScreen.swift:21-26`), so main must compose the
  order for the chosen words, so the words must reach main: a query on a signed GET, as `/v1/session?id=` and `/v1/turns` already
  carry (`ios/Tortie/Door/DoorClient.swift:263-271`). The alternative, one answer carrying every order as ranks, would make the
  phone sort and filter, which §4.0 refuses.
- **D2. `/v1/blocked` does not change.** The Needs input tab and its badge read it (`ios/Tortie/App/TortieApp.swift:419-422`),
  and the TestFlight build in his hand (1.0.0 (3)) reads `others`.
- **D3. The query is five closed parameters, each at most once, refused whole otherwise.** `show` (`active`, `ended`, `all`),
  `group` (`project`, `none`), `sort` (`recent`, `name`, `oldest`), `agent` and `machine` (an id of the shape
  `^[a-z][a-z0-9-]{0,31}$`, the one `src/shared/machines.ts:77` and `src/shared/agent-overlay.ts:394` both declare; `machine` also
  takes `local`). Absent `show`, `group` or `sort` is the default; absent `agent` or `machine` is no filter. An unknown parameter,
  a repeated one, an empty value, a word not in its list or a malformed id refuses the request: the route answers null, the door
  404, logged `route`, exactly as a refused turn range is (`routes.ts:399-427`, `:586-587`). Never a fallback, because a fallback
  draws a list the phone did not ask for. A percent-encoded spelling of a closed word decodes to that word and is that word
  (`URLSearchParams`, `src/main/pocket/server.ts:109-112`); a well-formed id that names nothing keeps no rows. No free text, so
  no search parameter ever crosses the door (D14).
- **D4. Caps: 2,000 rows and 1 MiB, rows and their groups counted together.** 2,000 is ten times today's 200 and about twenty
  times his 102. At 2,000 rows the answer measured 404 KB at his name lengths and 777 KB with every name at the 200-character
  clip, so the byte budget binds only for a hostile row set; 5,000 rows measured 1,014,843 B, the budget itself, so a 5,000 row
  cap would be the byte cap under another name. The main-process cost at the cap is about 110 ms (§4). **If `probe:p3167` Q4
  measures the route's main-thread time above 250 ms median at 2,000 rows on his Mac, the row cap drops to 1,000 in the fix round
  and nothing else changes.** `agents` and `machines` are cut at 64 each. Their labels are outside the budget, so the whole answer
  is at most 1 MiB, plus 128 choices of at most 200 UTF-16 units each (about 1.3 KB each even if every unit is escaped to 6
  bytes, so about 165 KB in total), plus under 5 KB of commas, `asked` and scalars. That is about 1.17 MiB, below the 2 MiB both
  sides refuse (`src/main/pocket/door/wire.ts:49`, `DoorClient.swift:158`). The earlier "1 MiB plus 32 KB" was arithmetic
  that did not allow for escaping (§15 F14). **WHICH rows the caps keep is chosen by Recent activity, waiting first, whatever
  the words drawn (§6.2 step 9), so no cap drops a session that needs input while a session that does not is drawn (§15 F2).**
- **D5. The clip.** Every string main does not already cap (a session's name, a group's label and folder, an agent's and a
  machine's label) is clipped to 200 UTF-16 units at ONE function, marked with `…`, and never cut between a high and a low
  surrogate. The question keeps its own cap (`src/main/activity/question.ts:51`, 200) and is not clipped again. The session screen
  still draws the whole name from `/v1/session`.
- **D6. One rule with the Mac, moved and not rewritten.** The group's identity (`groupIdentity`,
  `src/renderer/session-manager/projection.ts:168-187`), the non-empty label test (`named`, `:190-192`), the collection of a
  group's members, its closed-tab name and its machine label (`collect`, `:321-343`, its machine labeller made an argument, §15
  F12), the group comparator (the body of `orderGroups`, `:360-373`), the label rule (`:397-400`) and the lifecycle partition
  (`view.ts:116-117`) move to NEW
  `src/shared/session-list.ts`; the sheet calls them where it computed them, and the door calls the same functions. `displayPath`
  (`src/renderer/format.ts:54-61`) moves to NEW `src/shared/display-path.ts` and `format.ts` re-exports it, so none of its twenty
  importers moves. `createdOld` (`src/renderer/session-manager/copy.ts:256-258`) moves to `src/shared/age.ts` beside `formatAge`
  and `copy.ts` re-exports it. The sheet's one ordering step the phone does not take, open tabs first, is an ARGUMENT
  (`openAt`) the door passes empty, because the phone has no tabs.
- **D7. Groups are folders on machines, judged over EVERY listed session.** The key is `targetKey` of the session's target, or
  the tombstone key for a removed machine, exactly the sheet's. The label is the open tab's name, else the closed tab's, else the
  folder's own name. `folder` (home-relative on this Mac, as the machine states it elsewhere) is sent only when another group over
  the whole list shares the label AND the machine label, so a group reads the same under every choice. A group's `id` is the first
  16 base64url characters of sha256 of its key: stable across answers and choices, so the phone can remember which groups he
  opened, and it is not the path.
- **D8. Show.** Active is what `sessionActionGates` calls `live` or `unknown`; Ended is what it calls `ended`; All is every listed
  session. Unreachable rows are Active for the sheet's reason (`view.ts:98-105`). A group is `collapsed` only under All when none of
  its rows is Active. Needs input stays a tab; there is no state filter (a Working or Idle filter changes by the second and would
  empty itself while he reads it).
- **D9. A Mac older than this phase is today's tab, never Pairing.** §3 row 5. The phone only falls back after the app's own
  `/v1/blocked` read has ANSWERED, so a phone the Mac no longer knows still goes to Pairing, by that read's own routing. **The
  fallback is not sticky (§15 F6).** Every read of the older-Mac face (appear, pull, foreground) is the Sessions model's, which
  asks `/v1/sessions` first, so the first answer from an updated Mac brings the new tab back without a relaunch. Both faces sit
  under ONE End these attachment, so a face that changes while End these runs keeps its bar, its selection and its words. When
  the list's read draws a sentence, the Sessions model draws that same sentence. It never routes on its own.
- **D10. Sort.** *Recent activity* is today's order: the waiting rows in `attentionRows`' order (`src/main/tray/attention.ts:48-64`),
  then `othersOrder` (`routes.ts:367-383`), the same two functions `blocked()` uses. *Name* is `localeCompare`, the sheet's
  comparison (`view.ts:148-151`), ties by id. *Oldest first* is creation, ascending. A missing clock sorts last both ways. The sort
  acts inside each group; groups never reorder (`view.ts:26-28`).
- **D11. Ages: one clock is never drawn as another.** Under Recent activity and Name a row draws the clock that places it. A
  waiting row draws its wait, but ONLY from its stamp (`facts.blockedSince().get(id)`). Any other row draws its last output
  (`4m`), else its creation through `createdOld` (`3d old`), else nothing (the phone's dash). Under Oldest first every row draws
  its creation, `old`. A `createdAt` not above 0 is no clock (the sheet's rule, `copy.ts:304-310`). **A waiting row with no stamp
  yet draws by the creation rule, `3d old` or the dash, and never `attentionRows`' `since`.** That `since` falls back to
  `createdAt` (`src/main/tray/attention.ts:59`), so it draws a creation clock as a wait, and `20728d` for a `createdAt` of 0,
  measured through the shipping `blocked()` (§15 F1). The fallback still ORDERS the row, as it does today. `/v1/blocked` keeps
  its bytes (D2), so for the second or so before the poll stamps the row, the Needs input tab can still draw that one row's age
  that way. That is a residual for its own entry.
- **D12. Clear filters is the Mac's.** It sets Show to All and clears the agent and machine filters; it is drawn on the
  "No matching sessions" face always, and in the menu whenever Show is not All or a filter is set. "No sessions to manage" is
  drawn when the Mac lists no session at all (`total` 0), the sheet's own empty face (`copy.ts:879-883`).
- **D13. What the phone keeps.** Show, Group by and Sort by in `UserDefaults`, three keys, each decoded into its closed enum,
  anything else reading the default; the agent and machine filters and every opened or closed group for the app's life only,
  because a filter kept across launches hides sessions behind a control he cannot see. Nothing is stored on the Mac. The privacy
  manifest declares `NSPrivacyAccessedAPICategoryUserDefaults` with `CA92.1` (the app's own data, read by the app alone).
- **D14. No search.** Matching fetched rows makes the phone decide membership (§4.0); a search parameter puts free text into a
  signed query on a public door; the Mac's search matches paths the phone never receives. Its own entry, if he asks.
- **D15. The build number does not move** (§3 row 7). The main session numbers the one archive.
- **D16. Every pull refreshes everything the parent's pull refreshed.** In 316.6 one read fed the badge and both tabs. The
  Sessions tab's appear, pull and foreground re-read now run `/v1/sessions` AND the `ListModel`'s `/v1/blocked` together, so the
  badge and the Needs input tab are never staler than today. **A choice (Show, Group by, Sort by, Agent, Machine, Clear filters)
  reads `/v1/sessions` ALONE, and the Sessions model CANCELS its in-flight `/v1/sessions` read before it starts another (§15 F7).**
  Cancelling closes that read's connection (`DoorClient.swift:891-907`), so at most one `/v1/sessions` and one `/v1/blocked` read
  are in flight from this tab. The door allows four connections per source (`src/main/pocket/door/limits.ts:23`) and refuses the
  fifth before TLS (`listener.ts:399-402`, `source-cap`). The phone reads that refusal as `unreachable`. Without the cancel,
  three quick taps on Show would leave six reads open, and the newest one would draw "Can't reach your Mac" over a Mac that is
  working.
- **D17. No door change but the route.** The door process forwards a GET target with its query already
  (`wire.ts:303-304`, 1,024 characters at most, `:38`); the signature covers the target; refusal 7 is asked of every read's answer
  (`server.ts:197-206`). Nothing in the listener, `bind.ts`, `server.ts`, `pairing.ts`'s rules or the write path moves.

## 6. The mechanism

### 6.1 The contract — `src/shared/ipc/pocket.ts` (append-only)

1. `POCKET_ROUTE_IDS` (`:77-88`) gains `'sessions'` after `'end'`, with the comment `` `GET /v1/sessions` — every listed session,
   shown, grouped and sorted as asked (Phase 316.7). `` The file header's "three reads and, since Phase 317, one narrow write" becomes
   four reads.
2. NEW, after `PocketBlockedAnswer`:

```ts
export const POCKET_SESSIONS_SHOW = ['active', 'ended', 'all'] as const;
export const POCKET_SESSIONS_GROUP = ['project', 'none'] as const;
export const POCKET_SESSIONS_SORT = ['recent', 'name', 'oldest'] as const;
export type PocketSessionsShow = (typeof POCKET_SESSIONS_SHOW)[number];
export type PocketSessionsGroupBy = (typeof POCKET_SESSIONS_GROUP)[number];
export type PocketSessionsSortBy = (typeof POCKET_SESSIONS_SORT)[number];
/** What an absent word reads. */
export const POCKET_SESSIONS_DEFAULT = Object.freeze({ show: 'active', group: 'project', sort: 'recent' } as const);
/** The most rows one answer carries (build/p3167/SPEC.md D4). */
export const POCKET_SESSIONS_MAX = 2000;
/** The most bytes the rows and their groups take together (D4). */
export const POCKET_SESSIONS_BUDGET_BYTES = 1_048_576;
/** The one clip for a string main did not already cap (D5). */
export const POCKET_SESSIONS_CLIP_CHARS = 200;
/** The most agents, and the most machines, the menu is offered (D4). */
export const POCKET_SESSIONS_CHOICES_MAX = 64;

/** The words main read, echoed so a client can refuse an answer to another question. */
export interface PocketSessionsAsked {
  show: PocketSessionsShow; group: PocketSessionsGroupBy; sort: PocketSessionsSortBy;
  agent: string | null; machine: string | null;
}
export interface PocketSessionsRow {
  sessionId: string;
  name: string;                 // clipped (D5)
  group: number;                // an index into `groups`
  machine: PocketMachineLabel;  // clipped; null on this Mac
  statusDot: string;
  statusTitle: string;
  ageText: string | null;       // D11; null draws the dash
  waiting: boolean;             // session.status === 'needs_input', rowOf's own predicate (routes.ts:320)
  question: string | null;      // only when waiting; capped in main already
  end: PocketEndOffer;          // required here: only the composer builds these rows
}
export interface PocketSessionsGroup {
  id: string;                   // 16 base64url characters of sha256(key) (D7)
  label: string;                // clipped
  machine: PocketMachineLabel;  // clipped
  folder: string | null;        // clipped; only when another group shares label and machine (D7)
  count: number;                // rows the words keep in this group, cut or not
  omitted: number;              // of `count`, the rows the caps left out (§15 F4); count = drawn rows + omitted
  waiting: boolean;             // some row the words keep in this group is needs_input (§15 F3)
  collapsed: boolean;           // D8
}
export interface PocketSessionsChoice { id: string; label: string | null } // label null only for machine `local`
export interface PocketSessionsAnswer {
  asked: PocketSessionsAsked;
  rows: PocketSessionsRow[];
  groups: PocketSessionsGroup[];  // exactly the groups `rows` name, in the order their first row is emitted
                                  // (group order under Project, row order under None) (§15 F16)
  agents: PocketSessionsChoice[]; // over the rows Show keeps, before the filters; only ids the query reads (§15 F8)
  machines: PocketSessionsChoice[];
  total: number;                  // every listed session, before Show and the filters
  omitted: number;                // rows the words keep that the caps left out; the sum of the groups' `omitted`
  at: number;
  ageNote: string;                // POCKET_AGE_HONESTY
}
```

`PocketBlockedRow`, `PocketBlockedAnswer`, `PocketSessionAnswer`, `PocketTurnsAnswer` and the write shapes do not change, so
nothing 317 or 318 reads is reshaped.

### 6.2 The route — `door/table.ts`, `door/wire.ts`, `routes.ts`, `ipc.ts`

1. **`src/main/pocket/door/table.ts:65-71`** gains `{ id: 'sessions', method: 'GET', path: '/v1/sessions', reads: true,
   windowOnly: false, signed: true }` after `turns`. **`door/wire.ts`**: `DoorSignedRoute` (`:104`) and `SIGNED_ROUTES` (`:273`)
   gain `'sessions'`. Nothing else in the door process moves.
2. **`src/main/pocket/ipc.ts:518-548`**, the answer switch, gains `case 'sessions': return routes.sessions(query);`.
3. **`src/main/pocket/routes.ts`**, beside `readTurnRange` (`:399-427`):
   - `export type PocketSessionsQueryRefusal = 'parameter' | 'repeated' | 'word' | 'id';`
   - `export function readSessionsQuery(query: URLSearchParams): { ok: true; asked: PocketSessionsAsked } | { ok: false; reason:
     PocketSessionsQueryRefusal }`. It walks `query.keys()` once, counting each name: a name not among the five is `parameter`, a
     second of one is `repeated`. `show`, `group`, `sort` are compared for EQUALITY with the contract's three lists (`word` for an
     empty value or anything else); `agent` and `machine` are read ONE CHARACTER AT A TIME, a letter `a`-`z` first, then letters,
     digits or `-`, 1 to 32 characters (`id` otherwise); `machine` also takes `local` by equality. No pattern, no `RegExp`, no
     `.test(`, `.match(`, `.exec(` (R1's reason, `conformance-pocket.mjs:739-751`). **R1 reads the WHOLE of `routes.ts` for
     `startsWith(`, `RegExp(`, `.test(` and `default:`** (`:740-751`), so neither this reader, the clip nor the composer may use
     any of them. A `switch` over the words has no `default:` arm (§15 F15). The character walk is ONE exported function,
     `isSessionsId(value)`, which the reader and step 5 both call.
   - `createPocketRoutes` gains `sessions(query: URLSearchParams): PocketSessionsAnswer | null`, **synchronous, nothing awaited,
     no conversation read** (no `refresh`, `catchUp`, `lastTurn`, `turns`):
     1. `readSessionsQuery`; refused answers null.
     2. `at = now()`; `facts.sessions()` ONCE; `facts.projects()`; `facts.blockedSince()`.
     3. Per listed session, `gates = sessionActionGates(s, s.status, DOOR_GATE_ENV)`; Show keeps it when
        `lifecycleKeeps(asked.show, gates)` (D8).
     4. Groups over EVERY listed session (D7): `collectSessionGroups(sessions, facts.machineLabel)` (the sheet's `collect`,
        moved, §6.3) gives each group its identity (`sessionGroupIdentity`: key, target, path, machine id), its members in
        listing order, its closed-tab name (the FIRST non-empty `closedProject.name` among its members, the sheet's `??=`, not
        the first member's), and its machine label (the first non-null label among its members). The label is
        `sessionGroupLabel(openName, draft.closedName, identity.path)`, where `openName` is `firstNamed(p.name)` of the first
        project `p` with `sameTarget(targetOfProject(p), identity.target)`. Groups are ordered with
        `compareSessionGroups(a, b, NO_TABS)` (`NO_TABS` an empty map). `folder` is `displayPath(path, machineId ?? undefined)`
        when two groups share label and machine label. `id` is `node:crypto`'s sha256 of the key, base64url, first 16 characters.
     5. **The machine a row is on** is `identity.target.machineId`, `local` for This Mac. It is the groups' own rule, so the
        filter and the groups always agree. The one target rule folds a machine whose id is `local` into This Mac
        (`src/shared/workspace-target.ts:64-76`), so the filter folds it as the sheet's groups already do (§15 F9). `agents`
        is every distinct `s.agent` among Show's rows for which `isSessionsId(s.agent)` holds, labelled
        `facts.agentLabel(id)` clipped, ordered by label then id, at most 64. An id the query would refuse is never offered
        (§15 F8). Its rows stay listed and can be shown, but no filter names them. `machines` is `{ id: 'local', label: null }`
        first when any Show row's machine is `local`, then each other distinct machine id labelled by the first
        `facts.machineLabel(s)` on it, clipped, ordered by label then id, at most 64.
     6. Filters: `agent` keeps `s.agent === asked.agent`; `machine` keeps rows whose machine (step 5) is `asked.machine`. Kept =
        Show and the filters.
     7. Order (D10): `recent` is `attentionRows(kept, projects, stamps)`'s order, then the rest of kept sorted by
        `othersOrder(facts)`; `name` is `a.name.localeCompare(b.name)` then id; `oldest` is `createdAt` ascending with a
        `createdAt` not above 0 last, then id. Under `project` the rows are taken group by group in group order, each group's rows
        in that order (a stable partition of it); under `none`, the order itself.
     8. Each row (D11): `ageText` under `oldest` is `createdAt > 0 ? createdOld(formatAge(createdAt, at)) : null`. Otherwise:
        a waiting row WITH a stamp (`stamps.get(s.id)`, the map step 2 read) is `formatAge(stamp, at)`; a row with a finite
        `lastActivityAt` that is not waiting is `formatAge(lastActivityAt, at)`; every other row, a waiting row with no stamp
        included, is `createdAt > 0 ? createdOld(formatAge(createdAt, at)) : null`. `attentionRows`' `since` orders and never
        labels (§15 F1). `statusDot` and `statusTitle` are `facts.statusWord(s)` and `raisedLabel` of its label, as `rowOf`
        (`routes.ts:338-341`); `waiting` is `s.status === 'needs_input'`; `question` is the activity's non-empty question on a
        waiting row, else null; `end` is `facts.endOffer?.(s) ?? NO_END` (`:355`, `:269`).
     9. **CHOOSE BY PRIORITY, THEN EMIT IN ORDER (§15 F2).** The priority is the `recent` order of step 7 over ALL of kept
        (waiting rows in `attentionRows`' order, then `othersOrder`), whatever `sort` and `group` say. Walk kept in that
        priority, building each row (step 8) and measuring it as `Buffer.byteLength(JSON.stringify(row))`. A group is measured
        the first time one of its rows is chosen, as its JSON with `omitted` set to its `count` (which bounds the digits it can
        carry). Stop before the row that would pass `POCKET_SESSIONS_MAX` rows or `POCKET_SESSIONS_BUDGET_BYTES` bytes. The
        chosen set is a PREFIX of the priority, so it is deterministic and a re-derivation can recompute it. Then emit the
        chosen rows in step 7's display order. A row's group is pushed to `groups` the first time a row of it is emitted, and
        the row's `group` is that index. Row objects are built for at most `POCKET_SESSIONS_MAX + 1` rows, so the End offers
        (one `manifest.getSession` each) never grow with the list. A group's `count` is its kept rows; its `omitted` is its kept
        rows that were not chosen; its `waiting` is whether any of its kept rows is `needs_input`. `collapsed` is
        `asked.show === 'all'` and no kept row of the group is kept by `lifecycleKeeps('active', gates)`. The top-level
        `omitted = kept.length − rows.length`, which is the sum of the groups' `omitted`; `total = sessions.length`;
        `ageNote = POCKET_AGE_HONESTY`. Under All · None · Recent the chosen set is the first rows of the display order, so the
        answer is today's list in today's order, cut at 2,000 instead of today's 200. A waiting row is cut only when the waiting
        rows alone pass a cap. `/v1/blocked`'s `rows` are uncapped today, so that cannot happen at any count the phone can draw.
   - ONE `clipSessionText(text)` (D5) in this file, reading `POCKET_SESSIONS_CLIP_CHARS` once: past the cap it keeps
     `cap − 1` units, steps back one when the last kept unit is a high surrogate (`0xD800`–`0xDBFF`), and appends `…`.
   - `blocked()`, `session()`, `turns()`, `rowOf`, `othersOrder` and `projectNameOf` keep their bytes.

### 6.3 One rule with the Mac — `src/shared/session-list.ts` (NEW), `display-path.ts` (NEW), `age.ts`

Moved token for token (comments may move with them; an `export` added; nothing rewritten), each original deleted:

| Shared name | From | Read by |
| --- | --- | --- |
| `SessionGroupIdentity`, `sessionGroupIdentity(session)` | `projection.ts:150-187` (`Identity`, `groupIdentity`) | `projection.ts` `collect`, `routes.ts` |
| `firstNamed(label)` | `projection.ts:190-192` (`named`) | `projection.ts` (four sites), `routes.ts` |
| `SessionGroupDraft`, `collectSessionGroups(list, labelOf)` | `projection.ts:308-343` (`GroupDraft`, `collect`), with ONE change: `machineLabelOf(session, states)` becomes the argument `labelOf(session)`, so the sheet passes `(s) => machineLabelOf(s, input.machineStates)` and the door passes `facts.machineLabel` (§15 F12) | `projection.ts` `buildTab`, `routes.ts` |
| `compareSessionGroups(a, b, openAt)` | the comparator body of `orderGroups`, `projection.ts:361-372` | `projection.ts` `orderGroups` (its tab map), `routes.ts` (an empty map) |
| `sessionGroupLabel(openName, closedName, path)` | the label expression, `projection.ts:397-400`, with `baseName(path)` spelled `path.slice(path.lastIndexOf('/') + 1)` (the body of `src/renderer/editor/paths.ts:11-13`) | `projection.ts` `buildTab`, `routes.ts` |
| `lifecycleKeeps(lifecycle, gates)` | `view.ts:116-117` (`'all'` keeps every row) | `view.ts` `rowPasses`, `routes.ts` |
| `displayPath(path, machineId?)` in `display-path.ts` | `src/renderer/format.ts:54-61`; `format.ts` re-exports it | every current importer through `format.ts`, `routes.ts` |
| `createdOld(age)` in `age.ts` | `src/renderer/session-manager/copy.ts:256-258`; `copy.ts` re-exports it | `copy.ts` `createdCell`, `routes.ts` |

`session-list.ts` imports values (`localTarget`, `targetKey`, `targetOfSession`) from `./workspace-target`, types from `./types`
and `./session-gates`, and nothing else (§15 F18). Its header names the one difference the door takes (no tabs first) and why,
and the two the door draws differently: a creation age in one unit (`3d old`, where the sheet's Created cell draws
`ageTwoUnits`), and a Name tie broken by id (where the sheet keeps the incoming order, `view.ts:158-171`) (§15 F17).
`projection.ts` stops importing `baseName`; `conformance:manager`'s T13 ablation anchor on that import line is re-anchored
(§8.3).

### 6.4 The phone

1. **`ios/Tortie/Door/Contract.swift`** gains `PocketSessionsAnswer`, `PocketSessionsRow`, `PocketSessionsGroup`,
   `PocketSessionsChoice` and `PocketSessionsAsked` (`Show`, `GroupBy`, `SortBy` raw values are the contract's words; an unknown
   word refuses the answer), decoded strictly as its neighbours are: every number (`group`, `count`, a group's `omitted`,
   `total`, `omitted`) through `doorNumber` (rule (k)); a group's `waiting` a required `Bool`; `end` through the existing
   `PocketEndOffer` decoder (`:215-272`).
2. **`ios/Tortie/Door/DoorClient.swift`**: `static func sessionsTarget(_ query: SessionsQuery) -> String`, spelled once beside
   `sessionTarget` (`:263-271`), always `/v1/sessions?show=<w>&group=<w>&sort=<w>`, then `&agent=<id>` and `&machine=<id>` when
   set, each value through `queryValue` (`:273-296`); and `func sessions(_ query: SessionsQuery, door: PairedDoor) async throws ->
   PocketSessionsAnswer` through the one `signedGet`.
3. **`ios/Tortie/Screens/DoorWords.swift`**: `DoorReading` (`:46-58`) gains the REQUIREMENT `func sessions(_ query:
   SessionsQuery) async throws -> PocketSessionsAnswer`, with an extension default that throws `DoorFailure.refused`, so a
   reader with no such read (the tests' fakes) behaves as a Mac older than this phase. A requirement, for the reason `writer` is
   one (`:28-35`). `PairedReader` (`TortieApp.swift:643-676`) implements it.
4. **NEW `ios/Tortie/Screens/SessionsChoices.swift`**: `enum SessionsShow`, `SessionsGroupBy`, `SessionsSortBy` (String raw
   values, the contract's words; `.active`, `.project`, `.recent` the defaults); `struct SessionsQuery` (the three plus
   `agent: String?`, `machine: String?`); `protocol SessionsChoicesStore` (`load() -> (SessionsShow, SessionsGroupBy,
   SessionsSortBy)`, `save(...)`) and ITS ONLY `UserDefaults` implementation, keys `tortie.sessions.show`,
   `tortie.sessions.group`, `tortie.sessions.sort`, each read as `X(rawValue: defaults.string(forKey:) ?? "") ?? .default` and
   written as `.rawValue`. Nothing the door answered is stored.
5. **NEW `ios/Tortie/Screens/SessionsScreen.swift`**:
   - `SessionsDrawing` (pure, `init(_ answer:, asked:) throws`): REFUSES WHOLE an answer whose `asked` is not the query sent, a
     row id twice, a `group` outside `groups`, a group no row names, two groups with one id, a group whose rows are not contiguous
     under Project, a group whose `count` is not its rows drawn plus its `omitted`, a top-level `omitted` that is not the sum of
     the groups' `omitted`, a group whose `waiting` is false over a drawn row whose `waiting` is true, an `omitted` or `total`
     the checked sums cannot hold (`DoorNumber.sum`), or `total` below rows plus omitted. Each is
     `.failed(Copy.answerUnreadable)`. It builds each row's `RowDrawing` (below), the header text pieces, each group's
     `Copy.othersOmitted(group.omitted)` when above 0 (drawn as the group's last line under Project), the top-level
     `Copy.othersOmitted(omitted)` when above 0 (drawn above the foot), `ageNote` and `Copy.readAt(clock(at))`. A header's count
     says how many sessions the project HAS under the words, and the group's own line says how many of them are not drawn, so
     the count never stands over fewer rows with nothing beside it to say so (§15 F4).
   - `RowDrawing` gains an initialiser from a `PocketSessionsRow` (in this file, as an extension): under Project, the machine
     badge is left out (the header has it) and the line is the question on a waiting row that has one, else `statusTitle`; under
     None, the badge as today and the line exactly 316.6's (`ListScreen.swift:71-75`) with the group's label as the project. A
     null `ageText` draws `Copy.dash`. `waiting` draws weight 500, `end` is the row's.
   - `SessionsModel` (`@MainActor @Observable`): state `.loading`, `.loaded(SessionsDrawing)`, `.failed(String)`,
     `.olderMac`; the three remembered words (loaded from the store at init, saved on every change), the two filters and the
     opened-or-closed map keyed by group id, for its life; the newest-read-only `generation` rule `ListModel` keeps
     (`ListScreen.swift:155-157`, `:203-224`). It also keeps ONE handle to its in-flight `/v1/sessions` read, a `Task`, and
     **cancels it before it starts another** (D16, §15 F7). `load()` (appear, pull, foreground, Done) runs `door.sessions(query)`
     and `list.load()` together (D16); a choice change runs `door.sessions(query)` alone. On `.refused` or `.closedBeforeAnswer`
     it awaits the list's read, then, still the newest generation, sets `.olderMac` ONLY when the list's state is `.loaded`, and
     `.failed(sentence)` with the list's own sentence when the list's state is `.failed(sentence)`. It never calls a routing
     itself: a list read that is refused routes to Pairing (D9, §15 F19). Any other failure is
     `DoorWords.consequence(of:reading: .list)`. Every choice change is a new read with the old drawing kept until the newest
     lands. **While `batchHeld` (below) is true, `load()` runs `list.load()` alone and starts no `/v1/sessions` read, so neither
     the drawing nor the face changes under End these (§15 F5).** It conforms to `EndBatchList`: `batchRows` is, in `.loaded`,
     the rows drawn (groups in order, a group's rows only while it is open); in `.olderMac`, the list's `waiting + others`, the
     parent's rows; otherwise none.
   - `SessionsTab` (`View`), the ONE thing the Sessions tab draws: it applies `.endBatch(ends, list: model)` ONCE, outside both
     faces, and inside it draws `SessionsScreen` or, in `.olderMac`, today's `ListScreen(kind: .sessions, ..., ends: nil,
     reload: { await model.load() })`. One attachment means a change of face keeps End these' selection, bar and words
     (§15 F6). The older face's `EndBatchTitleControl` and rows read the outer attachment through the environment, which is
     exactly how they read it today, and its own `.endBatch(nil, ...)` line changes nothing.
   - `SessionsScreen` (`View`): a `LazyVStack` in a `ScrollView`, so 2,000 rows build only what is on screen. The title
     (`Copy.sessions`, `list-title`) with the menu button and `EndBatchTitleControl()` at its trailing edge; under it the Show
     control, three house buttons in one capsule drawn with `Tokens` (never a system segmented control, whose colours are not
     tokens), the chosen one with the selected trait; `model.alertsLine` and `model.notice` as `ListScreen` draws them; group
     headers under Project (chevron, label, count in the age face, `DotView(dot: .attention, title: Copy.needsInput)` when the
     group's `waiting` is true, open or closed, the machine badge, the folder muted under the label, one tap opens or closes);
     the rows (`RowView`, now internal, with `ListNames.sessions`); a group's `n more not shown.` as its last line when its
     `omitted` is above 0; the empty faces (D12); `list-sessions-left-out`; the foot (age note, `read <time>`). A project he
     closed keeps the needs-input dot on its header, so no tap of his can hide a waiting session without a mark (§15 F3).
     The menu: `Menu` holding `Picker`s for Group by and Sort by, Agent and Machine only
     when the answer names more than one, and Clear filters (D12); its label `line.3.horizontal.decrease.circle`, `.fill` while a
     filter is set, `accessibilityLabel(Copy.sessionsOptions)`. **While End these takes taps, the Show control, the menu and every
     header are disabled**, and `batchHeld` keeps a pull, the foreground and Done from replacing the drawing before End these
     ends (§15 F5), so the drawn set cannot change under a selection (the Mac batch's "the targets are the ids named at
     open"). `.refreshable`, `.task`, and the foreground tick as `ListScreen` (`:351-356`). The attachment is `SessionsTab`'s,
     not this view's. Every string from the door is `Text(verbatim:)` or the house `Words`.
6. **`ios/Tortie/App/TortieApp.swift`**: `AppModel` holds `private(set) var sessions: SessionsModel?`, made wherever `list` is
   made (`:172`, `:230`, `:322`) over the same reader and list, dropped in `lostPairing` (`:245-251`). The Sessions tab
   (`:524-531`) draws `SessionsTab` (§6.4.5), which draws `SessionsScreen`, or in `.olderMac` today's `ListScreen(kind:
   .sessions)`, the parent's tab byte for byte, under the one `.endBatch`. The Needs input tab, the badge, Settings, the routes
   and the alert taps do not change.
7. **`ios/Tortie/Screens/EndBatch.swift`**: `protocol EndBatchList: AnyObject { var batchRows: [RowDrawing] { get }; var
   batchHeld: Bool { get set }; func load() async }` (`@MainActor`). `endBatch(_:list:)` (`:271-276`), `EndBatchPiece` and
   `Attached` take `any EndBatchList`; `Attached.rows` (`:324-328`) becomes `list.batchRows`. **Two lines of `Attached` move
   (§15 F5).** `.onChange(of: model.phase, initial: true)` writes `list.batchHeld = model.phase != .off`, and Done becomes
   `model.finish(); list.batchHeld = false; Task { await list.load() }`, so the read Done asks for is never held.
   `EndBatchModel`, `BatchConfirm`, the runner and the three hooks keep their bytes.
8. **`ios/Tortie/Screens/ListScreen.swift`**: `RowView` (`:473`) internal; `ListModel: EndBatchList` (`batchRows` today's
   `waiting + others`, `batchHeld` a stored `Bool` it never reads, because nothing attaches End these over `ListModel` any
   more and its own `.endBatch` line needs the conformance to compile); `ListScreen` gains `var reload: (() async -> Void)? =
   nil`, and when it is set, `.refreshable`, `.task` and the foreground tick call it instead of `model.load()` /
   `model.appeared()` (§15 F6). `ListKind.sessions` and the two-section drawing STAY, because they are the older-Mac face.
9. **`ios/Tortie/Screens/Identifiers.swift`**: `screen-list`, `list-title`, `row-*`, `list-select` and the rest keep their names on
   the new screen, so every existing UI test step finds them. New: `list-show`, `list-show-all`, `list-show-active`,
   `list-show-ended`, `list-menu`, `group-<id>` (a container with the button trait), `group-label-<id>`, `group-count-<id>`,
   `group-machine-<id>`, `group-folder-<id>`, `group-waiting-<id>`, `group-left-out-<id>`, `list-no-match`,
   `list-clear-filters`, `list-no-sessions`, `list-sessions-left-out`. The header comment's table gains them.
10. **`ios/Tortie/PrivacyInfo.xcprivacy`**: `NSPrivacyAccessedAPITypes` holds one entry,
    `NSPrivacyAccessedAPICategoryUserDefaults` with reasons `["CA92.1"]`, and the comment says why.

### 6.5 S0, the mock — `docs/design/phone/`

`Main.html` becomes the new Sessions tab: the title with the menu button and Select, the Show control on Active, three projects
(one waiting row with its question under its header, which carries the needs-input dot; one header with the machine badge; two
headers named `app` with their folders muted, one of them closed and carrying the dot), rows aged `2m`, `1h` and `3d old`, the
foot, the tab bar. NEW `SessionsMenu.html`: the menu open (Group by ›
Project, Sort by › Recent activity, Agent, Machine, Clear filters) over the list, and below it the "No matching sessions" face
with its Clear filters button. NEW `SessionsOlderMac.html`: the parent's `Main.html`, byte for byte but its `<title>`, which is
what a phone shows against a Mac older than this phase, and which keeps the ledger's rules for "Needs your input (", "Everything
else (" and " more not shown." matching a screen. `index.html` names both new screens. The phone builder writes the mock first;
the drafts are this file's, taken as defaults on his go-ahead.

## 7. The words and where each is owned

`conformance:phonecopy` judges each. `/// Mac:` needles were read byte for byte at `c1a5fd38`.

| `Copy.` name | Words | Owner |
| --- | --- | --- |
| `showAll` | All | `/// Mac: src/renderer/session-manager/copy.ts ⟦label: 'All'⟧` |
| `showActive` | Active | `/// Mac: src/renderer/session-manager/copy.ts ⟦label: 'Active'⟧` |
| `showEnded` | Ended | `/// Mac: src/renderer/session-manager/copy.ts ⟦label: 'Ended'⟧` |
| `groupProject` | Project | `/// Mac: src/renderer/session-manager/copy.ts ⟦project: 'Project'⟧` |
| `groupNone` | None | `/// Mac: src/renderer/settings/fold-copy.ts ⟦FOLD_NONE_OPTION = 'None'⟧` |
| `agent` | Agent | `/// Mac: src/renderer/diagnostics/copy.ts ⟦COL_AGENT = 'Agent'⟧` |
| `allAgents` | All agents | `/// Mac: src/renderer/context/ContextHeader.tsx ⟦All agents`⟧` |
| `machine` | Machine | `/// Mac: src/renderer/machines/machine-choice.ts ⟦MACHINE_FIELD_LABEL = 'Machine'⟧` |
| `thisMac` | This Mac | `/// Mac: src/renderer/machines/machine-choice.ts ⟦THIS_MAC = 'This Mac'⟧` |
| `clearFilters` | Clear filters | `/// Mac: src/renderer/session-manager/copy.ts ⟦CLEAR_FILTERS = 'Clear filters'⟧` |
| `noMatchingSessions` | No matching sessions | `/// Mac: src/renderer/session-manager/copy.ts ⟦NO_MATCH_HEADING = 'No matching sessions'⟧` |
| `noSessions` | No sessions to manage | `/// Mac: src/renderer/session-manager/copy.ts ⟦heading: 'No sessions to manage'⟧` |
| `groupBy` | Group by | `/// Phone:` no Mac surface offers a choice of grouping; the sheet always groups by project |
| `sortBy` | Sort by | `/// Phone:` the sheet sorts by pressing a column heading, which a phone does not have |
| `sortRecent` | Recent activity | `/// Phone:` the order today's list already has, waiting first, then output, then creation; no Mac column is that clock |
| `sortName` | Name | `/// Phone:` the sheet's column for it is headed `Session`, which as a sort reads as nothing |
| `sortOldest` | Oldest first | `/// Phone:` the sheet's Created column ascending, said as a direction because a menu has no arrow |
| `allMachines` | All machines | `/// Phone:` no Mac surface filters sessions by machine |
| `sessionsOptions` | Group, sort and filter | `/// Phone:` the menu button's spoken name; the button draws no words |

The ages (`3d old`), the status titles, the group labels, folders, machine and agent labels and the counts are data from the
door. `PHONE_MAC_FLOOR` (`build/p311/copy-drift.mjs:1099`) rises from 68 by the twelve `/// Mac:` words above to 80;
`OWNED_RULE_FLOOR` (`:890`) rises by the number of owned mock rules the phone builder adds, and the builder states the number.

## 8. The gates

### 8.1 `conformance:pocket` (`build/conformance-pocket.mjs`) and `ablation:p313`

- **R4**: `ROUTE_PIN` (`:788`) to `a6c1bb3c…` with `--write-route-pin`, the comment naming both values. **R2**: unchanged code;
  it now reads six rows, the writes still exactly `end`. **N1**: unchanged.
- **O2, NEW, "the sessions answer is main's and bounded"**, read with the TypeScript parser in `routes.ts`: (a) `sessions` is not
  `async` and holds no `await`; (b) it calls `facts.sessions()` exactly once; (c) `POCKET_SESSIONS_MAX`,
  `POCKET_SESSIONS_BUDGET_BYTES`, `POCKET_SESSIONS_CLIP_CHARS` and `POCKET_SESSIONS_CHOICES_MAX` are imported from the contract,
  each read once, and none is re-spelled as a number; (d) one `clipSessionText`, comparing a unit with `0xD800` and `0xDBFF`,
  called for the name, the group label and folder, and the agent and machine labels; (e) `omitted` is the kept count minus the
  emitted rows; (f) a row's `group` is the length of `groups` read when its group is pushed; (g) `readSessionsQuery` compares the
  words with the contract's three lists, reads an id one character at a time, and holds no regular expression literal, `RegExp(`,
  `.test(`, `.match(` or `.exec(`; (h) Show is `lifecycleKeeps(` over `sessionActionGates(` with `DOOR_GATE_ENV`, both imported
  from `@shared/`, and the only status literal in the member is `'needs_input'`; (i) the groups come from `sessionGroupIdentity(`,
  `sessionGroupLabel(` and `compareSessionGroups(` imported from `@shared/session-list`, and no key is built from `targetKey(` in
  `routes.ts`; (j) a creation age is drawn through `createdOld(` from `@shared/age` and `formatAge` is the only formatter;
  **(k)** the cut CHOOSES in the `recent` priority and EMITS in display order: the loop that stops at `POCKET_SESSIONS_MAX` and
  `POCKET_SESSIONS_BUDGET_BYTES` walks an array built from `attentionRows(` and `othersOrder(`, never the display order, and a
  group's `omitted` is its kept rows minus its chosen rows (§15 F2, F4); **(l)** no `ageText` is composed from the `since` of an
  `attentionRows(` row: a waiting row's age reads the stamp map `facts.blockedSince()` answered (§15 F1); **(m)** the agent
  choices and the query reader call ONE `isSessionsId(` (§15 F8), and the machine filter and choices read the group identity's
  `target.machineId`, never `s.machine` (§15 F9).
- **O3, NEW, "the sessions answer reads no conversation"**: the member names none of `refresh`, `catchUp`, `lastTurn`, `turns`
  of `facts`, and `routes.ts` gains no import from `../overview/` (it keeps `MAX_TURN_LIMIT`, `:115`).
- **`ablation:p313`** (`build/ablation-p313.mjs`) gains one arm per clause, each red on its own rule: `O2a` the member made async
  with an `await`, `O2b` a second `facts.sessions()`, `O2c` `2000` re-spelled, `O2d` the surrogate step removed, `O2e` `omitted`
  0, `O2f` the index taken from `rows.length`, `O2g` a regex in the reader, `O2h` a `'exited'` literal in Show, `O2i` a
  `targetKey(` key, `O2j` an age without `createdOld`, `O2k` the cut walking the display order, `O2l` a waiting age from
  `attentionRows`' `since`, `O2m` the agent choices offered with no `isSessionsId(`, `O3a` a `facts.catchUp(` call, `R4x` a
  seventh route row. Each arm is also DRIVEN once through `routes.test.ts`'s fixtures, so an arm the text rule misses is red
  there: `O2k` loses the waiting row of a late group under a cap of 4, and `O2l` draws `20728d` for a no-stamp waiting row with
  `createdAt` 0 (the shapes of `…/scratchpad/p3167/adversary/attack.mts` A1 and A3).

### 8.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

Every arm against the in-process door with the honest arms beside it, each asserting its outcome: each word cased (`Active`),
doubled (`show=active&show=ended`), empty (`show=`), key-only (`?show`), an unknown parameter (`limit=1`), a percent-encoded
closed word (`show=%61ctive`, ANSWERED with `asked.show` `active`), a percent-encoded non-word, a NUL (`%00`), a 10 KB target
(refused by the door process at its target bound, `listener.ts:518`, with the word `malformed`; that check runs AFTER Node's
HTTP parser, so the arm asserts that main's request count did not move, and NEVER a parser counter of zero, which the shipping
door would fail, §15 F13), malformed ids (`Claude`, `9x`, 33 characters, `a/b`, `..`),
a well-formed id naming nothing (200, no rows, `omitted` 0), `/v1/sessions/` (no route), a `/v1/blocked` signature replayed on
`/v1/sessions` (`signature`), and a phone removed between verify and answer (`unpaired`, refusal 7). Every refused query answers
404 with no body; the log holds the word `route` and no query value.

### 8.3 `conformance:manager` (`build/p293/conformance-manager.mjs`, `manager-conformance-probe.mts`) and `ablation:p293`

- **T23** is re-pointed: the lifecycle partition is `lifecycleKeeps` in `src/shared/session-list.ts`, and `view.ts`'s `rowPasses`
  and `routes.ts` reach it and name no status literal for it.
- **T26, NEW, "one grouping rule"**: `sessionGroupIdentity`, `collectSessionGroups`, `sessionGroupLabel`,
  `compareSessionGroups`, `firstNamed` and `lifecycleKeeps` are declared once, in `src/shared/session-list.ts`; `projection.ts`
  and `routes.ts` import them; no `??=` over a closed-tab name or a machine label is written in `routes.ts` (§15 F12); no file under
  `src/` declares a second function comparing group labels with `localeCompare` beside a key; `projection.ts`'s `orderGroups`
  passes its tab map and `routes.ts` an empty one; `displayPath` is declared once, in `src/shared/display-path.ts`, and
  `createdOld` once, in `src/shared/age.ts`.
- **G3, NEW, driven** in the probe, in TWO arms over one fixture (two local folders named `app`, a remote `app`, a closed tab
  with its name on a member that is NOT the group's first, a folder with no tab, live, unknown and ended rows) (§15 F11):
  **G3a**, no project open on either side (the sheet's `projects: []`, the door's `facts.projects()` empty): the sheet's
  `buildManageProjection(...).managed` and the door's `createPocketRoutes(facts).sessions` under `show=all&group=project` agree
  on every group's label, order and row count. **G3b**, the SAME open projects handed to both: every group's label and row count
  agree by group key, and the door's order equals the sheet's groups re-sorted with `compareSessionGroups(a, b, new Map())`,
  which is the sheet's order with its one named difference, tabs first, taken out. A fixture with open projects on one side only
  disagrees by design, because the door names an open folder by its tab. In both arms the sheet's Active and Ended segments keep
  exactly the ids the door's Active and Ended keep.
- **`ablation:p293`** (`build/p293/ablation.mjs`): arms 18 and 19 (`:432-447`) re-anchor on `sessionGroupIdentity`'s key line in
  the shared file; T13 (`:640-647`) re-anchors on an import `projection.ts` still has; NEW arms for T26 (a second label rule in
  `routes.ts`; the door's groups ordered tabs-first; `displayPath` re-declared in `format.ts`) and G3 (the door's label falling
  back to the folder before the closed tab's name). Every arm red on its own rule.

### 8.4 `conformance:ios` (`build/conformance-ios.mjs`) rule (aa) and `ablation:p316`

`RULE_IDS` (`:6589`) gains `'aa'` between `'z'` and `'ab'`. **(aa) "the Sessions tab lays out what main composed, and keeps three
words"**: (1) `SessionsScreen.swift` and `SessionsChoices.swift` name no `sorted`, `.sort(`, `reversed`, `.filter(`, `.min(`,
`.max(` or `shuffled`; (2) `UserDefaults` appears in `SessionsChoices.swift` alone across the app, with exactly three key literals,
every `set(` storing a `.rawValue` of `SessionsShow`, `SessionsGroupBy` or `SessionsSortBy`, every read inside `init(rawValue:`
with `??`; (3) no `TextField`, `TextEditor`, `.searchable`, `@AppStorage` or `@SceneStorage` in either file; (4) `sessionsTarget`
is the one builder of a `/v1/sessions` target, in `DoorClient.swift`, its parameters in the order show, group, sort, agent,
machine, every value through `queryValue`; (5) `PrivacyInfo.xcprivacy` declares `NSPrivacyAccessedAPICategoryUserDefaults` with
exactly `["CA92.1"]` (rule (o) already requires the category from the Swift, `:2117-2140`); (6) the Show control, the menu and
every group header carry a `.disabled(` that reads the batch's `takesTaps`; (7) `.olderMac` is assigned in one place, after an
`await` of the list's `load()`, inside a branch that reads the list's `.loaded` state; **(8)** `SessionsModel`'s `load` reads
`batchHeld` before its `door.sessions(` call and returns without that call when it is true, and `EndBatch.swift`'s Done sets
`batchHeld = false` before it calls `load()` (§15 F5); **(9)** `SessionsModel` holds its `/v1/sessions` read in ONE stored
`Task`, and the statement that starts a new one is preceded, in the same function, by `.cancel()` on the old (§15 F7);
**(10)** `.endBatch(` appears once in `SessionsScreen.swift`, in `SessionsTab`, over both faces, and passes `ends: nil` to the
`ListScreen` it draws; `App/TortieApp.swift`'s Sessions `Tab` body draws `SessionsTab(` and builds no `ListScreen` of its own,
which is read over the `Tab(Copy.sessions` call's braces rather than as a literal, because the helper names its kind by a
variable (§15 F6). **`ablation:p316`**
(`build/p316/ablation-ios.mjs`) gains one arm per clause (a `.sorted` added, `UserDefaults` in `SessionsScreen.swift`, a fourth
key, a door string stored, a `TextField`, the target's order swapped, `CA92.2`, a `.disabled(` removed, `.olderMac` set before
the list answered, the `batchHeld` check removed, the `.cancel()` removed, a second `.endBatch(` on `SessionsScreen`), each red
on (aa). **(s)** still reads build 5.

### 8.5 `conformance:phonecopy` — §7.

### 8.6 Unmoved, each run: `gate:contract` (no channel moves: `docs/audits/contract-baseline.txt:168-180` names only `pocket:*`
channels), `gate:simulator` (floor 2), `gate:checks`, `gate:background`, `gate:knownhosts`, `conformance:handback`,
`conformance:push`, `conformance:redline`. **`gate:electron`**: `HELPER_USER_FLOOR` (`build/assert-electron-teardown.mjs:391`)
rises from 162 to **163** for `build/p3167/probe-p3167.mjs` (obligation 1). **`src/main/menu.ts` has no diff** (`git diff c1a5fd38
-- src/main/menu.ts` empty; MENU1 green).

## 9. The proof, run rather than read

### 9.1 The battery
`typecheck`, `build`, `test`, `smoke:t1`, `smoke`, `smoke:t3`, `package`, the gates of §8, `ablation:p313`, `ablation:p293`,
`ablation:p316`, `ablation:p296`, `vectors.mjs --check`, the probes' `--grader-self-test`s, and `test:ios` in Debug and Release on
iOS 26.3 and 18.3.

### 9.2 Unit tests that fail when a clause is removed
- `src/main/pocket/__tests__/routes.test.ts`: every Show × Group × Sort with and without each filter, over a fixture holding
  waiting, live, unknown, exited and restorable rows, a remote machine, two folders named `app`, a closed tab, a `createdAt` of 0
  and a name of 300 characters ending in a surrogate pair: membership, group order and contiguity, counts, `collapsed`, `folder`,
  ages (`old` exactly on creation clocks, null for no clock), the cut at 2,000 rows and at the budget with `omitted` exact, the
  clip at a surrogate boundary, `agents` and `machines` (This Mac first), and that Show All · None · Recent equals `blocked()`'s
  `rows` then `others` id for id. `readSessionsQuery` over every refusal word. And the revision's own cases (§15): under a cap
  shortened by injection to 4 rows, a waiting row in the group whose label sorts last is drawn under Project · Recent, Project ·
  Name and None · Oldest, with each group's `omitted` exact and summing to the top-level one (F2, F4); a waiting row with no stamp
  draws `3d old` or, with `createdAt` 0, null, and a stamped one its wait (F1); a group holding a waiting row reads
  `waiting: true` under every choice that keeps it (F3); an agent id `Bad_Id` on a listed session is never in `agents` and its
  row is still listed (F8); a machine whose id is `local` lands in This Mac's group and This Mac's filter, and `machines` names
  `local` once (F9); a closed-tab name on the second member labels the group (F12). `ipc.test.ts`, `pairing.test.ts` and
  `server.test.ts` hold six route ids and the line `Answers these and nothing else: blocked, end, pair, session, sessions, turns`.
- `src/shared/__tests__/p3167-session-list.test.ts`: each moved function against its parent body's answers.
- `ios/TortieTests/SessionsTests.swift`: `SessionsDrawing` refuses each malformed answer of §6.4.5 and draws an honest one;
  `RowDrawing`'s two lines and the dash; `SessionsModel` keeps the old drawing until the newest read lands, falls back only after
  the list answered, reads both on a pull and `/v1/sessions` alone on a choice, cancels the read a newer one replaces (a fake
  reader counts reads in flight and never sees two `/v1/sessions` at once over five choices in a row), keeps filters and
  opened groups for its life, starts no `/v1/sessions` read while `batchHeld`, leaves `.olderMac` on the first answer a pull
  through the older face gets, and draws the list's sentence when the list's read failed; `EndBatchList` rows skip closed groups
  and are the list's rows in `.olderMac`.
  `SessionsChoicesTests.swift`: three keys, a planted `bogus` reads the default, filters never stored. `DoorVectorTests` signs a
  `/v1/sessions` target byte for byte as `vectors.json` holds it.

### 9.3 `probe:p3167` — NEW, the Mac's door, ONE Electron, no Simulator
`build/p3167/probe-p3167.mjs`, through `withElectron`, a scratch profile, HOME and socket `gmux-p3167-<pid>`; the door published
through the STAND-IN Tailscale (`build/p330/tailscale-standin.mjs`, preflighted, sampled, every pid ended in a `finally`) and
`GMUX_POCKET_NAME_SERVERS` naming `build/p332/dns-standin.mjs` in its own process, as `probe:p313` does; `build/p316/node-phone.mjs`
pairs and reads; an `agents.json` renaming the Gemini, Qwen, Antigravity, Grok and Droid binaries before launch, read back from
`agents:list`. BEFORE launch `build/p3167/seed-sessions.mts` writes, through `insertSession`, 2,000 sessions into the scratch
manifest: ended and live-recorded rows over 60 folders, two local folders named `app`, a 300-character name carrying U+202E and
U+2066 to U+2069, and agents among `claude`, `codex`, `shell` (records only: nothing of theirs runs). Twelve live shells are made
through the bridge. The loopback machine of `build/scratch-machine.mjs` (as `probe:p293`'s R arm, its sshd ended in a `finally`)
holds a folder named `app` and two sessions. Arms:
- **Q1** every combination and each filter: each row once, groups contiguous under Project, counts sum to each total, every
  `group` in range, `omitted` exact, bytes under the budget, `asked` echoed; the three `app` groups distinct: the two local ones
  each with its folder, the loopback machine's with its machine badge and NO folder, because D7 sends a folder only when label
  AND machine label collide (§15 F10).
- **Q2** §8.2's query set live through the stand-in's forwarder: each 404, the door's log the word `route`, no query value.
- **Q3** 200 list reads from the node phone while the probe removes 50 ended sessions through the bridge: no id twice in an
  answer, no count disagreeing with its rows, no session in an answer composed after its removal answered.
- **Q4** the route's time at 2,000 rows (request to answer at the node phone, and main's own composing time if the harness can
  read it): reported; above 250 ms median, D4's fallback.
- **Q5** `/v1/blocked` answers the parent's shape: `others` capped at 200, `othersOmitted` the rest.
- **Q6** the confirm lines read `Answers these and nothing else: blocked, end, pair, session, sessions, turns`; a door confirmed
  at the parent's hash asks again.
- **Q7** `app.log` holds no session name, folder or query value.
- **PARENT** with `P3167_PARENT_CHECKOUT` (a built `c1a5fd38`): `/v1/sessions` answers 404; `/v1/blocked` reads 200 others and
  `othersOmitted` the rest. `--grader-self-test` grades recorded fixtures, each clause shown red, and starts nothing.

### 9.4 `probe:p316`'s `sessions` arm group (`P316_ARMS=sessions`), on Simulators made one at a time by `build/simulator-run.mjs`
Before launch, the probe writes 120 ended sessions over four projects (two folders named `app`, the bidi name) into its scratch
manifest through `build/p3167/seed-sessions.mts`. `ios/TortieUITests/P316DriveUITests.swift` gains steps `show:<word>`,
`menu:<section>:<label>`, `clear-filters`, `group:<id>`, `sessions-dump` (every `row-`, `group-` and `list-` element, scrolling the
lazy list to its end), and `relaunch-choices` (relaunch with no forget seam); a planted value is a launch argument
(`-tortie.sessions.show bogus`), UserDefaults' own argument domain, so no DEBUG seam is added. The group runs on its own fresh
Simulator, so no other arm meets a remembered choice. Every grade reads the node reader's `/v1/sessions` answer just before and
after the drive's own read; two answers that differ make that combination UNREADABLE, never a pass.
- **SL1** (26.3 and 18.3): a fresh install's Sessions tab is Active · Project · Recent; the headers' labels and counts are the
  answer's; no ended row is drawn.
- **SL2** (26.3): every Show × Group × Sort: the drawn row ids in order are the answer's (rows of closed groups absent, each
  `collapsed` header drawn closed), every age label the answer's `ageText` or the dash.
- **SL3** (26.3): Agent narrows to the answer for that agent; Clear filters draws Show All with no filter.
- **SL4** (26.3): a relaunch keeps the three words and drops the filter and every opened group; `bogus` reads Active.
- **SL5** (26.3): under All, a project with only ended rows starts closed with its count, a tap opens it.
- **SL6** (26.3 and 18.3): the planted conversation's session, ended on the Mac, is under Ended; it opens, its conversation pages to
  its first turn, and no End is drawn on it.
- **SL7** (26.3): End these: Select, three Active rows ticked, the Show control and the menu disabled while selecting; the run
  ends them as E7 does (E7's `drawnOrderOf` reads `/v1/sessions`' drawn order now). Then, BEFORE Done, a pull: every target's
  row and its outcome word are still drawn, read by `row-outcome-<id>` (§15 F5). After Done, under Active, the ended rows are
  gone and the drawn ids are the next answer's.
- **SL8** (26.3): the Needs input tab and its badge equal `/v1/blocked`'s waiting rows before and after a pull on Sessions.

### 9.5 The hostile door (`build/p316/hostile-door.mjs`), on 26.3 and on the 18.3 floor
NEW arms, each composed by the SHIPPING `createPocketRoutes(facts).sessions` over facts the door builds from
`seed-sessions.mts`' generator: **`sessions-cap`** (the 2,000-row cap with every name at the clip, the bidi name, three `app` groups
one of them remote, two machines, two agents, `omitted` above 0): the first row drawn within 2 s of the answer on both runtimes,
the last row reached with `list-sessions-left-out` saying the omitted count, the bidi name's label exactly its characters and its
age's frame inside the row's right edge, the two local `app` headers each with its folder and the remote one with its machine
badge and no folder (§15 F10), a `group-left-out-<id>` under each group whose `omitted` is above 0, the Machine section offered,
no XCUITest "main thread busy"; **`sessions-older-mac`** (`/v1/sessions` 404, `/v1/blocked` honest): the Sessions tab draws
`section-blocked` and `section-others` and Select; **`sessions-older-mac-recovers`** (`/v1/sessions` 404 for its first answer,
honest after it, which is a Mac updated under the phone): the older face draws, and ONE pull on it draws `list-show`, with no
relaunch (§15 F6); and one arm each for a duplicate id, a group out of range, a split group, a
count that is not its drawn rows plus its `omitted`, group `omitted` that do not sum to the top-level one, a `waiting: false`
group over a waiting row, `omitted` negative, `omitted` `Int.max`, an `asked` that is not the question, and an unknown Show word:
each ends drawn as `Copy.answerUnreadable` with the app alive. The existing list arms (huge-row, malformed, the HTTP arms) answer `/v1/sessions` too
on the Sessions tab's refresh, and `/v1/blocked` on the Needs input tab's.

### 9.6 Method 2, the re-derivation
The verifier's own reader recomputes §6.2 from this file for every combination over `probe:p3167`'s world and compares row for
row; and, through `probe:p293`'s drive or G3's harness, the Mac sheet's groups under All against the door's. Every difference is a
defect or a difference §3 names.

### 9.7 Method 3, his shape (revised under the main session's standing rule of 2026-10-02, §15 F20)
**No role reads his manifest again.** The standing rule at the foot of this file defines real data as "the committed fixtures
... or this repository's own files", and his `manifest.db` is neither. §4 recorded its shape once, counts only, before that rule
was written: 102 listed sessions (55 idle, 9 running, 38 restorable), 23 folders, 7 agents, names of 8.6 characters on average
and at most 27, the oldest listed 49 days old, and the busiest folder 27 sessions. `build/p3167/seed-sessions.mts` gains a
`--shape his` mode that writes exactly that shape into a scratch manifest. The verifier runs the shipping composer over it,
through a facts adapter that projects the rows as `core.listSessions` would (no file stat, no home read), and prints counts
only: each row in one group, counts summing to each total, bytes under the budget, `omitted` 0. CLAUDE.md's Tier 3 asks for
"real data or a per row matrix". The every-combination matrix over the 2,000-row world (§9.3, §9.6) is the per-row matrix, and
this is its shape check.

### 9.8 The parent, and no scenario worse than today

| Scenario | Today (`c1a5fd38`) | At HEAD |
| --- | --- | --- |
| Reaching a session he has | Sessions tab: waiting, then 200 others; the rest "n more not shown." and out of reach | Every session today's tab drew is within one tap: the Active face draws its active rows with no tap, and every other one is under Ended or All (each answer up to 2,000 rows and 1 MiB; a waiting row a hostile byte budget leaves out is still on the Needs input tab). Under All a project with no active session starts closed with its count (D8), so one tap on All alone draws only the open projects' rows, and a closed one opens with one more. Today's one list in today's order is All, then Menu › Group by › None, remembered after: All · None · Recent, cut at 2,000 where today cuts at 200. *Corrected by the fix round of 2026-10-03: this row said "one tap on All draws every listed session", which the verifier's drive refuted (31 of the 202 rows today's tab drew, 54 of 60 projects closed). D8 is unchanged; whether All should open every project is the operator's to rule.* |
| Needs input tab and badge | `/v1/blocked` | unchanged; a Sessions pull refreshes them as today's one read did |
| Select and End these | on the Sessions tab | on the Sessions tab, over the rows drawn |
| A row aged from creation | `3d` | `3d old` |
| A row with no clock | `20000d` | the dash |
| A waiting row the poll has not stamped yet | its creation age drawn as a wait, `20728d` with `createdAt` 0 (§15 F1, measured) | Sessions: `3d old` or the dash; Needs input tab unchanged (D2) |
| A waiting session in a list over the cap | never cut: `/v1/blocked`'s `rows` are uncapped | never cut while the waiting rows alone fit the caps (§15 F2) |
| A waiting session in a project he closed | no projects to close | the closed header keeps the needs-input dot (§15 F3) |
| A pull while End these runs or before Done | ended rows stay listed with their words | the drawing is held; every target keeps its word until Done (§15 F5) |
| Three quick choices | no choices | at most one `/v1/sessions` and one `/v1/blocked` in flight, never past the door's four (§15 F7) |
| New phone, Mac without this phase | — | today's Sessions tab, never Pairing, and the new tab back on the first pull after the Mac updates (§15 F6) |
| The Mac's work per Sessions read | listing plus at most about 200 End offers | listing plus at most 2,000 End offers and composing (§4) |
| A return to the foreground on Sessions | one read | two reads; a choice is one |
| The door's confirmation | five routes | six; he confirms once after the update, which 317's CHANGELOG item already says |

## 10. CHANGELOG, his checklist, the menus

**CHANGELOG** (`## Unreleased`, Added; the follow-up docs commit adds the link):

- `- The iPhone's Sessions tab opens on your active sessions grouped by project, with a count on each, and can show ended ones, sort them by recent activity, name or oldest first, and narrow them to one agent or machine; it remembers how you left it, and there is no search yet`

**His checklist**, NEW `build/p3167/CHECKLIST.md`, run on the one TestFlight build after every phone phase (his 2026-09-30 ruling):
open Sessions (Active, under projects, counts); tap Ended and open an old session (its conversation reads, nothing on it acts);
sort by Name, group by None, choose an agent, then Clear filters; quit the app and open it (the three choices kept, no filter);
Select still ends sessions. Not covered: search, removed sessions.

**The menus do not change.** No Mac surface moves; the phone's tab bar keeps its three tabs.

## 11. Builders, files and owners

Disjoint files. The integrator owns `CLAUDE.md`, `CHANGELOG.md`, this file's "§As built", and the regenerated
`ios/TortieTests/Fixtures/vectors.json`; `docs/BACKLOG.md` is the main session's.

1. **door** — `src/shared/ipc/pocket.ts`, NEW `src/shared/session-list.ts`, NEW `src/shared/display-path.ts`, `src/shared/age.ts`,
   `src/main/pocket/door/table.ts`, `src/main/pocket/door/wire.ts`, `src/main/pocket/routes.ts`, `src/main/pocket/ipc.ts`,
   `src/renderer/session-manager/projection.ts`, `src/renderer/session-manager/view.ts`, `src/renderer/session-manager/copy.ts`,
   `src/renderer/format.ts`, every test under `src/main/pocket/__tests__/`, `src/renderer/session-manager/__tests__/`,
   `src/renderer/settings/__tests__/p316-phone-section.test.tsx` that the route list or the move touches, NEW
   `src/shared/__tests__/p3167-session-list.test.ts`.
2. **macgates** — `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/p313/hostile-client.mts`,
   `build/p313/hostile-client.mjs`, `build/p293/conformance-manager.mjs`, `build/p293/manager-conformance-probe.mts`,
   `build/p293/ablation.mjs`, `build/p317/probe-p317.mjs` (its `ROUTE_LINE`, `:163`, and header line `:32`).
3. **phone** — `ios/Tortie/Door/Contract.swift`, `ios/Tortie/Door/DoorClient.swift`, `ios/Tortie/Screens/DoorWords.swift`, NEW
   `ios/Tortie/Screens/SessionsScreen.swift`, NEW `ios/Tortie/Screens/SessionsChoices.swift`, `ios/Tortie/Screens/ListScreen.swift`,
   `ios/Tortie/Screens/EndBatch.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/Tortie/Style/Copy.swift`,
   `ios/Tortie/App/TortieApp.swift`, `ios/Tortie/PrivacyInfo.xcprivacy`, every file under `ios/TortieTests/` except
   `Fixtures/vectors.json`, `docs/design/phone/Main.html`, NEW `SessionsMenu.html`, NEW `SessionsOlderMac.html`, `index.html`,
   `build/p311/copy-drift.mjs`.
4. **phonegates** — `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p316/vectors.mjs`.
5. **probes** — `build/p316/probe-p316.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `build/p316/hostile-door.mjs`,
   `build/p316/node-phone.mjs`, NEW `build/p3167/seed-sessions.mts` (with `--shape his`, §9.7), NEW
   `build/p3167/probe-p3167.mjs`, NEW `build/p3167/CHECKLIST.md`, `package.json` (`probe:p3167`),
   `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 163), `build/verification-checks.mjs` (the new script classified).

The §15 revision moves no file between builders. The door builder owns every `src/shared/` file this phase touches, and the
phone builder mirrors §6.1 as revised (a group's `omitted` and `waiting`) from this file, never from the door builder's tree.
`build/p317/CHECKLIST.md` and `build/p317/SPEC.md` name the five-route line. They are 317's landed records, and the main
session's replay rewrites the CHECKLIST line once, over the union with 318.

The **integrator** runs `node build/p316/vectors.mjs` then `--check` once door and phonegates land, the battery of §9.1 (no
Electron, no Simulator: `smoke`, `smoke:t3`, `package`, the probes and `test:ios` are the verifiers'), the ten-line duplicate
scan, a control, bidi, zero-width and BOM scan over the delta, writes CLAUDE.md's rows (pocket: O2, O3, the pin; manager: T26,
G3; ios: (aa) and `CA92.1`; `probe:p316`'s `sessions` group; a `probe:p3167` row) and the CHANGELOG item, and appends
"§As built". `git diff c1a5fd38` must be exactly this phase's delta.

## 12. What the main session reconciles with Phase 318 at the replay

Both phases edit, in disjoint hunks: `src/shared/ipc/pocket.ts` (route ids: 316.7 adds a read, 318 two writes),
`door/table.ts`, `door/wire.ts` (`SIGNED_ROUTES` here, `WRITE_ROUTES` there), `routes.ts` (`sessions` here, `PocketWrites` there),
`ipc.ts` (one switch arm here), `build/conformance-pocket.mjs` (R4 over the UNION of routes, re-pinned once with
`--write-route-pin` and re-derived by `printf | shasum`), `ablation-p313.mjs`, `hostile-client.mts`, `build/p317/probe-p317.mjs`'s
`ROUTE_LINE` (the union, sorted), `Contract.swift`, `DoorClient.swift`, `DoorWords.swift` (`DoorReading` here, `DoorWriting`
there), `TortieApp.swift` (`PairedReader`), `Copy.swift`, `Identifiers.swift`, `conformance-ios.mjs` (318 takes letters after
(ad)), `ablation-ios.mjs`, `probe-p316.mjs`, `P316DriveUITests.swift`, `hostile-door.mjs`, `node-phone.mjs`, `vectors.mjs` and
`vectors.json` (regenerated over both), `copy-drift.mjs` (floors summed), `docs/design/phone/index.html`, `CHANGELOG.md`,
`CLAUDE.md`. The confirm line and the door hash move once for the release.

## 13. What is NOT in this phase

- **No search, no Past Sessions, no removed session on the phone.**
- **No state filter, no project tree, no Messages or Last message sort** (those read every transcript).
- **No ordering, filtering or membership decided on the phone.** Main composes; the phone lays out and remembers three words.
- **No change to `/v1/blocked`, the Needs input tab, its badge, Settings, the write door or any write.**
- **No restore, remove or rename from the phone; no Face ID anywhere here.**
- **No choice stored on the Mac, and no filter stored anywhere.**
- **No Mac surface, no menu, no build number and no release.**

## 14. Open concerns for the builders and verifiers

1. Whether Node's and Chromium's `localeCompare` order every label alike is unmeasured; G3 compares them over its fixture only.
2. The Simulator is faster than his iPhone; SL and `sessions-cap` timings bound the Simulator, and his checklist the device.
3. `core.listSessions` stats files per row, which this file approximated (§4); Q4 measures the whole.
4. A group's `id` is a hash of a path; it is never the path, but a guess of a common path can be confirmed against it.
5. **Residual, the Mac's, not this phase's (§15 F9).** Settings derives the machine id `local` from a machine labelled "Local"
   (`src/renderer/settings/machines-store.ts:193-213`), the schema accepts it (`src/main/machines/schema.ts:268-275`), and the
   one target rule folds it into This Mac (`src/shared/workspace-target.ts:64-76`). Such a machine's `/Users/gdc/app` is
   therefore ONE group with this Mac's on the Mac sheet today, and on the phone after this phase, which follows the sheet. The fix
   is to refuse `local` as a machine id, in the schema and in `machineIdFrom`. That belongs to its own entry, with
   `conformance:machines`.
6. **Residual (§15 F1).** For the moment between a session's status turning to `needs_input` and the poll stamping it,
   `/v1/blocked`, which D2 leaves unchanged, still ages it from its creation as a wait. The Sessions tab no longer does.
7. **Residual, the sheet's too.** Two machines may carry one label (nothing makes labels unique), and the same remote path on
   both then draws two headers alike: label, badge and folder. The ids differ and nothing merges, but a person cannot tell them
   apart. The sheet's `path · label` line has the same limit.

## 15. Revision — the adversary, 2026-10-02

Every finding below was checked against the tree at `c1a5fd38`. Where code could show it, it was run through the pinned tsx
against the SHIPPING modules: `…/scratchpad/p3167/adversary/attack.mts` (exit 0) and `machine-id.mts` (exit 0). Neither
starts a process, reads a home or writes a file. Each finding names where it was applied above. The spec's own claims that
survived the attack are listed at the end.

- **F1, a clock drawn as another, CONFIRMED and measured.** `attentionRows` gives a waiting row with no stamp
  `since: s.createdAt` (`src/main/tray/attention.ts:59`), and D11 drew that `since` as the wait. Through the shipping
  `createPocketRoutes(facts).blocked()` (attack A1), a row created 5 days ago that waits with no stamp reads `5d`, its CREATION
  age drawn bare as a wait. A remote feed row with `createdAt` 0 reads `20728d`, which is the very age §1 said HEAD no longer
  draws. Applied: D11, §6.2 step 8, O2(l), §9.2, §9.8, §14.6.
- **F2, a cap could hide a session that needs input, CONFIRMED.** Step 9 cut in DISPLAY order, so under Project (labels A to Z),
  Name or Oldest first, a waiting row in a late group fell past the cap while idle rows in early groups were drawn. Today's
  `/v1/blocked` never cuts a waiting row: `rows` is uncapped (`routes.ts:487-494`) and only `others` is sliced (`:500-501`).
  Attack A3 reproduces it at a cap of 4: the spec's cut is `a1,a2,m1,m2` and drops the waiting `z1`; the revision's is
  `a1,a2,m1,z1`. Applied: D4, §6.2 step 9 (choose by the Recent priority, emit in display order), O2(k), §9.2, §9.8.
- **F3, a filter can hide a session that needs input: BY DESIGN for Show, Agent and Machine, NOT for a closed project.** Ended,
  an agent or a machine can leave a waiting row off the Sessions tab, as the Mac sheet's filters do. The Needs input tab and its
  badge read `/v1/blocked`, which no choice touches (D2), so a waiting session stays one tap away whatever he chose. But D13
  keeps every project he closed shut for the app's life, and a session that starts waiting in one of them was drawn nowhere on
  the tab with nothing to say so. Applied: a group's `waiting` (main's), drawn as the needs-input dot on the header open or
  closed (§1, §6.1, §6.4.5, §6.4.9, §6.5, §9.2, §9.5).
- **F4, a count could stand over fewer rows with nothing to say so, CONFIRMED by construction.** `count` is "cut or not", and
  after F2's cut the dropped rows can sit in the MIDDLE of groups, so a header reading 50 could stand over 10 rows. The only
  mark was the foot line, possibly two thousand rows away. Applied: a group's `omitted`, drawn as that group's own `n more not
  shown.`. The phone refuses an answer where a count is not its drawn rows plus that `omitted`, or where the groups' `omitted`
  do not sum to the total (§6.1, §6.4.5, O2(k), §9.5).
- **F5, End these' rows could change under it, CONFIRMED in code.** The spec disabled Show, the menu and the headers, but
  `.refreshable`, the foreground tick and Done still replace the drawing (`ListScreen.swift:351-356` is the pattern SessionsScreen
  copies). End these draws each outcome word ON THE ROW (`EndBatch.swift:444-456`, `ListScreen.swift:519-521`), from the list's
  rows (`:324-328`). Under the new default, Active, a pull during the run or before Done drops every session the run just ended,
  and its word with it. The bar says `Ended 3 of 3` over rows that are gone. Today those rows stay under Everything else. That
  is a scenario worse than today. Applied: `EndBatchList.batchHeld`, two lines of `Attached`, the model's hold (§6.4.5,
  §6.4.7, (aa)(8), SL7).
- **F6, the older-Mac face was sticky, and a face change would lose End these, CONFIRMED in code.** In `.olderMac` the tab drew
  `ListScreen`, whose pull, appear and foreground call `ListModel.load()` (`ListScreen.swift:351-356`). Nothing asked
  `/v1/sessions` again until the app relaunched or the pairing was lost, so a phone updated before its Mac kept the old tab after
  the Mac updated. And with `.endBatch` attached separately to each face, a face that changed mid-run would have dropped the bar
  while the registered runner wrote on. Applied: `SessionsTab` with ONE attachment, `ListScreen.reload` (§6.4.5, §6.4.6, §6.4.8,
  D9, (aa)(10), `sessions-older-mac-recovers`).
- **F7, choices could exceed the door's four connections and draw "Can't reach your Mac", CONFIRMED in code.** Each choice ran
  `load()`, two signed reads, and the generation rule DROPS a superseded answer without cancelling its read
  (`ListScreen.swift:203-224`). Only a cancelled Task closes its connection (`DoorClient.swift:891-907`, `:988-991`). The door
  holds four connections per source (`limits.ts:23`) and refuses the fifth before TLS (`listener.ts:399-402`). The phone reads a
  handshake that fails that way as `unreachable` (`DoorClient.swift:466-483`), which `DoorWords` draws as a failure. Three
  quick taps on Show held six reads. Applied: D16, §6.4.5, (aa)(9), §9.2.
- **F8, the menu could offer a choice the query refuses, CONFIRMED in code.** The manifest stores `agent` as any string
  (`src/main/manifest/codecs.ts:353`), and step 5 offered every distinct one. An id outside the reader's shape would be sent,
  refused with 404, and read by D9 as an older Mac, over a Mac with this phase. Applied: one `isSessionsId`, choices only for ids
  it accepts (§6.2 steps 3 and 5, O2(m), §9.2).
- **F9, a group cannot merge two folders on two machines, with one exception the Mac already has, CONFIRMED and measured.**
  `targetKey` writes every machine but This Mac as `<id>:<path>` (`workspace-target.ts:179-183`), and the key decides the
  group. Nothing in the listed set carries `machineGone`, because only `discarded` rows do and `listSessions` skips them
  (`core.ts:2725`). The exception: `machineIdFrom('Local', …)` answers `local` (machine-id.mts, exit 0), the schema accepts it,
  and `workspaceTarget` folds `local` into This Mac (attack A2: `/Users/gdc/app` keys alike on both). The spec's filter read
  `s.machine === undefined` for This Mac, so its filter disagreed with its own groups for such a machine, and it would have
  offered two choices with the id `local`. Applied: the filter and the choices read the group identity's machine (§6.2 steps 5
  and 6, O2(m), §9.2). The fold itself is §14.5.
- **F10, the probe arms contradicted D7, CONFIRMED.** Q1 and `sessions-cap` asked for all three `app` headers to carry a folder.
  D7 sends a folder only when label AND machine label collide, so the loopback machine's `app` has its badge and no folder.
  Applied: Q1, `sessions-cap`.
- **F11, G3 could not pass as written over a fixture with open projects, CONFIRMED.** The door labels an open folder by its tab
  (`facts.projects()`). The sheet with NO open tabs labels it by the closed-tab name or the folder, so the two disagree by design.
  With no projects on either side, the tab-name branch of the label went untested. Applied: G3a and G3b.
- **F12, a second spelling of the group's closed name and machine label, CONFIRMED.** Step 4 re-implemented the sheet's
  `collect` (`projection.ts:321-343`) as "the first member's" name, which is not the sheet's `??=`: the sheet takes the first
  NON-EMPTY name among the members. T26 did not guard it. Applied: `collect` moves as `collectSessionGroups(list, labelOf)` (D6,
  §6.2 step 4, §6.3, T26, §9.2).
- **F13, the 10 KB hostile arm would fail on the shipping door, CONFIRMED.** The target bound is checked at
  `listener.ts:518`, inside the request handler and after Node's HTTP parser, so "its parser counter zero" is false. Applied:
  §8.2.
- **F14, D4's arithmetic, CORRECTED.** 128 choices of a 200-unit label escape to about 165 KB, not 32 KB. The answer is still
  about 1.17 MiB at most, under both 2 MiB refusals. Applied: D4.
- **F15, R1 reads the whole of `routes.ts` for `startsWith(` and `default:`, not only patterns (`conformance-pocket.mjs:740-751`).**
  This is a builder's trap rather than a defect in the spec. Applied: §6.2 step 3.
- **F16, `groups`' order under None.** "In group order" contradicted step 9's push-on-first-emission. Applied: §6.1.
- **F17, two differences from the sheet the spec did not name.** A Name tie is broken by id where the sheet keeps the incoming
  order (`view.ts:158-171`), and the creation age is one unit where the sheet's Created cell draws `ageTwoUnits`
  (`copy.ts:304-310`). Applied: §6.3.
- **F18, wording.** `session-list.ts` imports VALUES from `./workspace-target`. Applied: §6.3.
- **F19, D9 left the Sessions model's state unset when the list's read drew a sentence.** Applied: §6.4.5.
- **F20, Method 3 against the main session's standing rule.** The rule appended below this file defines real data as committed
  fixtures or repository files, and his `manifest.db` is neither. §9.7 had a verifier copy it. Applied: §2 and §9.7 use the
  shape §4 already recorded, through a seed mode, and no role reads his manifest again.

**Attacked and STANDS.** The route pin (`d1fefb71…` re-derived from the five rows and `a6c1bb3c…` from the six, both by
`printf | shasum -a 256` and by node's `createHash` over the sorted lines; each equal to the spec's). The answer is bounded (rows
and groups under the measured budget, choices capped, the whole under both 2 MiB refusals, F14). Show reads the gates' own
partition (`session-gates.ts:265-315`; `effectiveStatusOf` is the identity, `store.ts:194-196`, so the door's `s.status` is
the sheet's). A listed session's facts are never empty before the door opens, because the door's `beforeOpen` resolves the
core first (`capabilities.ts:345-370`), so a `total` of 0 is a real zero and never a null drawn as one. Rows of closed groups,
and rows the caps left out, are never in `batchRows`, so End these names only rows drawn on the phone, and with F5 and F6 that
holds for the whole run. The Xcode project uses synchronized folders (`PBXFileSystemSynchronizedRootGroup`, 5), so the two new
Swift files need no project edit and touch nothing 318 numbers. No `UserDefaults` exists in the app today, so (aa)(2)'s "alone"
is satisfiable. Every `/// Mac:` needle of §7 was found in its file. `HELPER_USER_FLOOR` is 162 (`:391`), `PHONE_MAC_FLOOR`
68, `OWNED_RULE_FLOOR` 58, and `RULE_IDS` has no `aa` yet.


## The main session's standing rule (2026-10-02), binding on every role

Never read his conversation stores: his Claude Code and Codex logs, and anything under `~/.claude` or `~/.codex`. Real data for any test means the committed fixtures (`docs/research/assets/63-fixtures`, `build/fixtures/**`) or this repository's own files. A verifier on 2026-10-02 read 6,000 of his transcripts through main's reader because a brief named only his keychain and credentials; that must not happen again. If a measurement genuinely needs his live transcripts, stop and ask the operator.

## §As built — the integrator, 2026-10-02

Integrated in `/private/tmp/wt-p3167` over `c1a5fd38` from the five builders' trees. Nothing committed, staged or
stashed. No Electron launched, no Simulator booted; `xcodebuild build-for-testing` ran under lock slot `electron.lock2`,
released on the same command line, derived data at `…/scratchpad/p3167/dd-integrator`, deleted afterwards.
`git diff c1a5fd38` holds 54 tracked files and 14 new ones, all this phase's: the builders' files of §11, plus
`CLAUDE.md`, `CHANGELOG.md` and `ios/TortieTests/Fixtures/vectors.json` (the integrator's). `src/main/menu.ts` and
`ios/Tortie.xcodeproj` have no diff: the menus do not move and the build number stays 5 (D15).

### The integrator's ruling: a project the caps leave out whole

**The spec contradicted itself.** §6.1 says `groups` holds exactly the groups `rows` name AND that the top-level `omitted`
is the sum of the groups' `omitted`; §6.2 step 9 and O2(e) define the top-level `omitted` as `kept − rows`. When the caps
leave out EVERY row of a project, that project is named by no row, so it is in no group, and its rows are counted in the
top-level `omitted` alone: the sum comes out LOWER. The door builder measured it through the shipping composer (20
sessions per folder, created close together): 2,100 sessions, 100 of 105 groups drawn, `omitted` 100 and the groups'
sum 0; 5,000, 3,000 and 0; 10,000, 8,000 and 0. §6.4.5 made the phone refuse that answer, so every list past 2,000 rows
under All would have drawn "answer unreadable" where today draws 200 rows: a scenario worse than today.

**Ruled: the door's definitions stand, and every reader refuses only a sum ABOVE the top-level `omitted`.** The top-level
line already says the true number left out, and a header never stands over fewer rows than its count says, because each
drawn group still carries its own `omitted`. Applied, with each clause shown red on its own break:

- `ios/Tortie/Screens/SessionsScreen.swift`: `guard omittedSum <= answer.omittedRows`, the refusal renamed
  `omittedAboveTheAnswer`. `ios/TortieTests/SessionsTests.swift`: `testOmittedThatSumAboveTheAnswerAreRefused` and NEW
  `testAProjectWhollyLeftOutStillDraws` (the drawing's left-out line says the whole 4, the drawn group's says its 1).
  Planted `==` reddens the new test; planted `|| true` reddens the refusal test (scratch Catalyst runner, below).
- `build/p316/node-phone.mjs` (`sessionsAnswerProblems`, the probes' third reading): `omittedSum > answer.omitted`.
  `build/p3167/probe-p3167.mjs`: `q1Problems` compares `rows + omitted` with main's kept count (the old counts' sum was
  that same comparison while the equality held, and a counts check can no longer fire alone, so it is not kept), and the
  self-test gains a whole-cut answer that must draw. Planted `!==` reddens that case; planted `false` reddens the
  "sum above" case and the hostile door's `sessions-omitted-sum` arm.
- `build/p316/hostile-door.mjs`: `sessions-omitted-sum` now reads "groups whose omitted sum above the top-level omitted";
  its body already raised one group's `omitted` and `count` together, so it still breaks exactly that clause.
- `build/p3167/seed-sessions.mts` `countsOf`: the same inequality (his shape leaves nothing out, so Method 3 still
  requires `omitted` 0).
- `src/shared/ipc/pocket.ts` and `src/main/pocket/__tests__/routes.test.ts` already said so (the door builder's
  comment, and the unit test "a group whose every row the caps left out is in no row's group…"); `Contract.swift`'s
  comment now says the same.

### Recorded against the spec

- **§8.2 / F13, the 10 KB target.** It never reaches the target bound at `listener.ts:518`: the door's HTTP parser caps a
  request head at `DOOR_MAX_HEADER_BYTES = 8 * 1024` (`listener.ts:122`), Node refuses it first (`clientError`), and the
  door cuts the socket with the word `malformed` and writes no 404. The hostile client holds both: `SQ13` (10 KB, cut,
  `malformed`, main never asked, nothing forwarded) and `SQ13b` (2 KB, past the parser, the 1,024-character bound: 404, no
  body, `malformed`, main never asked). Neither asserts a parser counter of zero.
- **§7, the floors.** `PHONE_MAC_FLOOR` 68 → **79**, not 80: Show's `Ended` reuses the existing `Copy.ended` (copy-drift
  and CopyTests refuse a word declared twice), so eleven new `/// Mac:` words. `OWNED_RULE_FLOOR` 58 → **72** (fourteen
  owned mock rules). `thisMac` moved from a phone-owned word to the Mac's `THIS_MAC`.
- **§6.4.1, Swift names.** `groupIndex`, `sessionCount`, `omittedRows`, `totalSessions` mirror the JSON `group`, `count`,
  `omitted`, `total`, because a Swift field named `count` would make rule (k) read every `.count` in the app as door
  arithmetic. Rule (k) now counts 9 door numbers.
- **§6.4.5, two refusals the spec did not list.** Groups out of the order their first row is emitted
  (`groupOutOfOrder`, §6.1's own rule), and a menu choice with no label (but machine `local`) or two with one id
  (`choiceUnreadable`). No generation counter: the one stored `reading` Task, cancelled before the next starts, drops a
  superseded answer, so the app gains no arithmetic operator. `SessionsChoicesStore` returns a `SessionsWords` struct,
  not a tuple. `load()` is `load(listToo:)` with the `batchHeld` check first. Known cost as written: a face change runs one
  more read pair (the new face's `.task` calls `model.load()`).
- **§6.2, the door builder's choices.** A folder is sent when the DRAWN (clipped) label and machine label collide, since
  two labels differing only past the clip would draw alike. Groups are ordered by the sheet's comparator on the unclipped
  label with an empty tab map. Machine choices are filtered by `isSessionsId` too, labelled by the first non-null label a
  row on that machine gives, else the id. No separate `local` rule: `local` fits the id shape. A row is measured with its
  `group` at the number of groups, bounding every index's digits. `routes.ts`'s header keeps "two narrow writes", the line
  Phase 318 edits.
- **§8.3.** `ablation:p293`'s L1 arm re-anchored on the `lifecycleKeeps` call, whose old line moved. T23's "no second
  status table" scans `session-list.ts` and `routes.ts`, ignoring string literals in type positions. T26 also refuses a
  `??=` in `routes.ts` and a second `localeCompare` label comparator beside a `.key`. `build/p317/probe-p317.mjs`'s
  self-test line that asserted five route ids now asserts six, one line past the brief.
- **§8.4.** (aa)(3) also refuses `SecureField`; (aa)(8) also requires `EndBatch.swift` to set `batchHeld` from the
  batch's phase, without which the hold is never set. Known limit of (aa)(7): a list-read Task is recognised only when it
  is made over `list.load()` in a local, or handed in as a parameter by the model's own callers.
- **§9.2, the vectors (the integrator's addition).** `vectors.mjs` appends ONE request (`sessions`, every parameter set,
  so the six earlier requests keep their clocks and nonces) AND two answers composed by the SHIPPING `routes.sessions`
  over the vectors' own facts (`sessions-all-project`: All · Project · Recent, two groups on two machines;
  `sessions-active-none-name`). `DoorVectorTests.testTheSessionsAnswersReadBackAndDraw`, which skipped by name with no such
  answer, now REQUIRES both: each round-trips through `PocketSessionsAnswer` and draws through `SessionsDrawing`. The
  regenerated `vectors.json` grew 27 lines; the earlier requests, answers and every random value are unchanged.
- **§9.3 / §9.4, the probes builder's choices.** E4 presses `show:all` before Select (the tab opens on Active and E4's
  third row is ended). Q4 times main by subtraction (median `/v1/sessions` read less the median of a `/v1/session` read
  for an unknown id). Q7 looks for names and folders in the door's own log lines only, and for query values in every line
  after the door opened. Two answers differing in more than the clock and the ages make a reading UNREADABLE. The UI
  test's menu step relies on `SessionsScreen`'s Pickers with `.pickerStyle(.menu)`.
- **`HELPER_USER_FLOOR` 162 → 163** for `build/p3167/probe-p3167.mjs` (obligation 1). Phase 318 also raises it; the
  second to land sets 164 (318's §12).

### The duplicate scan (10-line windows, whitespace folded, at least seven non-trivial lines)

160 windows touched the delta before reconciling, 142 after:

- **Extracted:** `src/main/pocket/__tests__/ipc.test.ts` held the paired-phone prelude (pairing, the binding's HKDF, a
  signed request) three times: the session read in flight, the writes (Phase 317) and the new Sessions read. It is now
  one module-level `signingPhone(one, label)`; `heldOwner`, `reader` and `writer` call it. 122 `it(` blocks before and
  after, 126 tests green, typecheck green.
- **Kept, by design:** `src/shared/__tests__/p3167-session-list.test.ts` copies the parent bodies from `c1a5fd38` to judge
  each moved function against them (4 windows).
- **Left, and why:** `build/p3167/probe-p3167.mjs` shares 310 lines, in 16 runs of 8 or more, with
  `build/p317/probe-p317.mjs` (the stand-in Tailscale, the forwarder lookup, the bridge's `pocket(cdp, …)` call and the
  pairing drive), the same scaffolding `probe-p332`, `probe-p3321` and `probe-p3332` already share with p317 (12
  windows). A shared probe kit would rewrite landed probes that only their own Electron runs can prove, which no
  builder or integrator may launch, and would collide with Phase 318's edits to `probe-p317.mjs`. Its own entry.

### Commands, run by the integrator after reconciling

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p316/vectors.mjs`, then `--check` | 0, 0 | 7 signed requests, 10 answers; PASS |
| `npm run -s typecheck` | 0 | (after the `ipc.test.ts` extraction) |
| vitest, targeted (`src/main/pocket`, `src/renderer/session-manager`, `src/shared`, `p316-phone-section`, `src/renderer/__tests__`) | 0 | 61 files, 1,943 tests, 9 s |
| `node_modules/.bin/vitest run` (whole) | 0 | 1,037 files passed, 1 skipped; 18,555 tests passed, 7 skipped; 58 s |
| `conformance:pocket` | 0 | 79 rules, 13,872 checks |
| `conformance:pocket:hostile` | 0 | 145 arms |
| `conformance:ios` | 0 | 28 rules over 35 app files, 38 test files, 84 files under `ios/`; (aa) and (j) green |
| `conformance:phonecopy` (`--self-test`) | 0 | 138 words, 79 Mac (floor 79); 15 screens, 424 segments, 72 owned rules (floor 72) |
| `conformance:manager` | 0 | 64 rules, 2,688 checks |
| `gate:simulator`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 each | simulator 2 of floor 2; contract byte for byte; 251 check scripts; electron 163 of floor 163; background 3 starts, 19 of 19 fixtures |
| `ablation:p316` | 0 | 246 of 246 arms red on their own rule, every rule (a) to (z), (aa) to (ad) able to fail; 350 s |
| `ablation:p313` | 0 | PASS: 233 ablations, one clause each, every one red on the rule that owns it (a delta against the base), clone files restored by sha256; 929 s |
| `ablation:p293` | 0 | PASS: 91 ablations, every one red on the rule that owns it, clone files restored by sha256; 146 s |
| `probe-p3167`, `probe-p316`, `probe-p317`, `probe-p313`, `probe-p330`, `probe-p332` `--grader-self-test`; `hostile-door.mjs --self-test` | 0 each | p3167 9 graders, 33 clauses; p316 126 Sessions cases; p317 13 graders, 61 clauses; p330 14, 103; p332 9, 64; hostile door 59 arms |
| `seed-sessions.mts --shape his --check` (Method 3's shape, scratch manifest removed) | 0 | 354 written, 102 listed; 162 combinations, 0 failed, most 102 rows, 25,518 bytes, 0 omitted |
| `xcodebuild build-for-testing` through `xcodebuildRun`, Debug and Release (`ENABLE_TESTABILITY=YES`) | 0, 0 | TEST BUILD SUCCEEDED, 18 s and 37 s, 0 warnings in `ios/` |
| Scratch Catalyst XCTest runner (no Simulator, scratch HOME): `SessionsTests`, `SessionsChoicesTests` (in-memory defaults), `EndBatchTests`, `CopyTests`, the two `DoorVectorTests` sessions methods | 0 | 59 tests, 0 failures; no file appeared under `~/Library/Preferences` |
| `npm run -s build` | 0 | every gate inside it green, 35 s |
| Control, bidi, zero-width, soft hyphen and BOM scan of the delta's added lines and new files | — | 0 hits over 68 files |

### Open concerns

1. **The whole-project cut is a ruling, not the spec's text.** The verifier should attack it: a list past 2,000 kept rows
   under All, a group left out whole, the top-level line saying the true number, and no drawn header over fewer rows than
   its count.
2. `test:ios`, `probe:p316` (`P316_ARMS=sessions` and the hostile `sessions-*` arms), `probe:p3167` and the PARENT arm
   are the verifiers' and have not run. Q4 decides D4's fallback.
3. The probe scaffolding shared by p317, p3167, p332, p3321 and p3332 (above) is unextracted.
4. The integrator's `xcodebuildRun` wrote its two logs into the phone builder's scratch `xb/logs/` before they were moved
   to `…/p3167/integrator/xb/logs/`; the phone builder's own two logs of the same names were overwritten (its
   `result.txt` stands).
5. The phone builder's two incidents, both cleaned up and reported: a probe plist written to and removed from
   `~/Library/Preferences` (gone over a 40 s watch), and one `SecItemAdd` from a whole `DoorVectorTests` run in the
   Catalyst runner, refused by macOS with -34018 so nothing was written.
6. §14's concerns stand as written (`localeCompare` across Node and Chromium, Simulator timing, the `local` machine-id
   fold, the unstamped wait on `/v1/blocked`, two machines with one label).

## §As built — the fix round, 2026-10-03 and 2026-10-04

The verifier answered **needs_work** with four major problems, six minor ones and a nit. The fix ran in two sittings of
one role. **The first** (2026-10-03, about 13:35 to 16:29) made most of the edits below, drove them live under lock
slot `electron.lock`, and was stopped at the account's spend limit during its final battery, before it wrote this
section or reported. Its logs are in `…/scratchpad/p3167/fixer/`. The main session's notes for the second sitting said
nothing of the first remained; twelve files carried its edits. **The second** (2026-10-04) read each of those edits
against the verdict and kept them, made the changes marked *(second sitting)*, re-ran the integrator's commands and
the live arms itself, and wrote this. Its logs are in `…/scratchpad/p3167/fixer2/`. Nothing was committed, staged or
stashed; `/Users/gdc/gmux` was not written; no command of this round named `-L gmux`. Every `xcodebuild` used
`…/scratchpad/p3167/dd-fixer`, deleted afterwards. The smokes are the main session's landing battery.

### Each problem, and what changed

1. **probe:p3167 Q1 failed on a correct tree (major).** The arm wrote `remoteApp?.folder ?? 'no remote app group'`,
   and `??` turned the correct null folder into the sentence. The reading is now one pure function,
   `appsReading(groupsSeen)` in `build/p3167/probe-p3167.mjs`, which the arm calls; only an absent group reads the
   sentence. The self-test builds it from a recorded union, the way the arm does: the honest union reads
   `{local: 2, remote: 1, remoteFolder: null}` and passes Q1, no loopback group reads the sentence and Q1 is red, a
   folder sent on the loopback group reads as sent and Q1 is red. With the old `??` line planted, two cases fail.

2. **A project header read enabled while End these took taps (major).** The header was a `VStack` with
   `.onTapGesture`. The verifier's suggestion, the parts wrapped in a `Button` that `.accessibilityElement(children:
   .contain)` keeps readable part by part, ALSO read `isEnabled=true` on iOS 26.3 (the first sitting's probe:p316,
   SL7 failing on that clause alone): `.disabled(` sets the not-enabled trait only on a control's own element, and a
   container is a new element. **As built**, `GroupHeader` in `ios/Tortie/Screens/SessionsScreen.swift` draws its
   parts as before, each an element read by its own id, and the press is a plain `Button` laid over them by
   `.overlay`, carrying `.disabled(batch?.takesTaps ?? false)`, the group's label as its spoken name, the selected
   trait and `ID.group(id)`; the guard in `tapped()` stays. Rule (aa)(6) (`build/conformance-ios.mjs`) refuses a
   header whose `ID.group(` chain is not rooted at `Button`, takes an `.onTapGesture`, or has an
   `.accessibilityElement(`, with three new red fixtures, and `ablation:p316` gained `aa6b` (the tap gesture) and
   `aa6c` (the container). *(Second sitting)*: the header's doc comment and the `group-<id>` row of
   `Identifiers.swift`'s table no longer call it a container. **Known cost:** VoiceOver reads the label twice, once as
   the label's element and once as the button's name, because the parts must stay elements the UI tests read.

3. **The age clause failed honest ages drawn between the door's two reads (major).** `build/p316/probe-p316.mjs`
   gains `ageValue` and `ageBetween`: an age passes when it is either read's own word, or a word of the same clock
   (` old` on all three or on none) whose minutes lie between the two reads; the minutes rise across a unit change
   (`59m`, then `1h`); the dash matches only itself; a clock drawn as another never matches. `gradeSessionsDump` and
   the L1 list grader use it. Ten self-test cases, the verifier's own fixture (5m, 6m, 7m) first.
   **The grade also assumes the phone's read lies between the door's two reads, and three windows held no read.** The
   first sitting moved two: SL2's first combination is read by a pull, and SL7's after-reading marks the door before
   Done. *(Second sitting)*: this round's first probe:p316 run failed SL5 on exactly this, the opened project drawing
   `20m` where the door said `21m` both times, because a header's tap reads nothing and the phone's read was the one
   made before the mark. SL5's opened project and SL1 (26.3 and the 18.3 floor) are now read by a pull, and NEW
   `marksWithoutRead(steps)` refuses to run a drive with a window that holds no step that makes the phone read (a
   choice, Clear filters, a pull, a relaunch or Done), with two self-test cases. Re-run: SL1 to SL7 pass.

4. **sessions-cap could not read the menu after its 2,000-row walk (major).** `scrollToTop` in
   `ios/TortieUITests/P316DriveUITests.swift` swiped at most 60 times; it is now bounded by the step's wait (at least
   two minutes), never by a count, and swipes until `list-title` exists and is hittable, then at most three more until
   nothing moves. *(Second sitting)*: a stop short of the title, by the clock or by a swipe that moved nothing, says
   `{"step":"scroll-to-top","reached":false}` (the second path was silent), and `gradeCap` reads a menu that was never
   read as UNREADABLE when the menu step's own scroll stopped short, and as a FAIL when the scroll reached the top and
   no menu was there. Before, a never-read menu read `the menu offers no Machine section ([])` and blamed the phone for
   the drive. Two self-test cases.

5. **sessions-older-mac-recovers was unreadable by construction (minor).** `build/p316/hostile-door.mjs`'s
   `missing-first` refuses every `/v1/sessions` read until it is told the Mac updated (`releaseSessions()`, or the line
   `sessions-honest` on a served door's stdin), and emits `{kind: 'sessions-released'}`. The drive's step
   `sessions-pull:ack` prints `sessions-pull-ready` and waits for the probe's `pull-<seq>`; the probe tells the door,
   waits for its event, then writes the file. `gradeRecovers` reads UNREADABLE when the door was not told before the
   pull.

6. **SL8 never proved the badge (minor).** SL8's steps run on the 18.3 floor too, where the tab bar's badge is
   readable, graded by one helper (`sl8TabsOf`). On iOS 26.3 it stays UNREADABLE (the glass bar).

7. **§9.8 row 1 overclaimed (minor).** Corrected in place, marked as corrected, *(second sitting)* in the main
   session's words: every session today's tab drew is within one tap, through Active, Ended or All; today's one list in
   today's order is All, then Menu › Group by › None, remembered after. `build/p3167/CHECKLIST.md` row 4 says the same
   and no longer says All shows "every session". **D8 did not move**; whether All should open every project is the
   operator's to rule.

8. **The probe kit, the earlier verifier runs' leftovers and his `claude-1-2` (three minors)** are the main session's
   by its notes of 2026-10-04. This round touched none of them.

9. **The nit: a read already in flight when Select was pressed could replace the drawing.** `SessionsModel.landed`
   and `failed` (its top guard and the older-Mac branch after the list's read) draw nothing while `batchHeld`; Done
   reads again. NEW `SessionsTests.testAReadInFlightWhenTheHoldStartsDrawsNothing` holds an answer and then a refusal
   in flight, sets the hold, lets each land: the drawing is unchanged both times, and Done's read draws. With
   `landed`'s guard out the test fails twice; with `failed`'s guards out, once.

### One file outside the verdict: the Tailscale stand-in's forwarder

The first sitting's `probe:p3167` failed Q3 twice on `"a read answered 0 (aborted)"`, a body cut after its head. The
cause is the stand-in, not the door: `build/p330/tailscale-standin.mjs`'s forwarder called `client.destroy()` when
the door's side closed, which drops what the client socket had not yet handed to a slow reader. It now ends the
client (`client.end()`), as a real relay forwards the FIN after the data, destroys at once only on a close with an
error, and cuts a client that never closes after 5 s. **Measured by the second sitting** (`…/fixer2/q3ab2.mjs`: the
hostile door's `sessions-cap` answer of 2,000 rows read 800 times through the forwarder in two lanes, twice per
build, no Electron): the parent's stand-in (`c1a5fd38`, sha256 `0f28e31a…`) cut **30 of 1,600** reads `aborted`
(17, then 13); the tree's cut **0 of 1,600**. Its own `--self-test` passes (38 checks). Every phone probe shares it,
and **CLAUDE.md's `probe:p330` row names it as that probe's trigger**: no live `probe:p330` ran in this round, so the
reverify runs it or says why not.

### Commands, run by the second sitting

The battery ran with `HOME` and `ZDOTDIR` pointed at scratch directories, `HISTFILE=/dev/null` and `TERM_SESSION_ID`
unset; the live arms ran with `ZDOTDIR` and `TERM_SESSION_ID` unset (each probe gives its app its own scratch HOME).

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/p316/vectors.mjs --check` | 0 | 7 signed requests, 10 answers |
| `npm run -s typecheck` | 0 | 3 s |
| vitest, targeted (as the integrator's) | 0 | 61 files, 1,943 tests, 7 s |
| `node_modules/.bin/vitest run` (whole) | 0 | 1,036 files passed, 2 skipped; 18,548 tests passed, 14 skipped; 45 s. One file more skipped than the integrator's, `src/main/context/__tests__/scan.integration.test.ts` ("the reader on this machine", 7 tests), which skips under a scratch HOME because it reads the agent directories under the home |
| `conformance:pocket`, `conformance:pocket:hostile` | 0, 0 | 79 rules, 13,872 checks; 145 arms |
| `conformance:ios` | 0 | 28 rules over 35 app files, 38 test files, 84 files under `ios/` |
| `conformance:phonecopy`, `conformance:manager` | 0, 0 | phonecopy OK; 64 rules, 2,688 checks |
| `gate:simulator`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 each | simulator 2 of floor 2; contract byte for byte; electron 163 of floor 163 (no new script reaches the helper, so `HELPER_USER_FLOOR` stays 163); background 3 starts, 19 of 19 fixtures |
| `--grader-self-test`: p3167, p316, p317, p330, p332, p313; `hostile-door.mjs --self-test`; `tailscale-standin.mjs --self-test` | 0 each | p3167 9 graders, 33 clauses; p316 140 Sessions cases, 142 after item 3's windows; p317 13, 61; p330 14, 103; p332 9, 64; p313 N1; hostile door 59 arms; stand-in 38 checks |
| `seed-sessions.mts --shape his --check` | 0 | 354 written, 102 listed; 162 combinations, 0 failed, 0 omitted |
| `npm run -s build` | 0 | 32 s |
| `ablation:p316`, `ablation:p293`, `ablation:p313` | 0, 0, 0 | 248 of 248 (`aa6`, `aa6b`, `aa6c` red on (aa)), 315 s; 91, 135 s; 233, 882 s |
| After item 3's windows: `conformance:ios`, `gate:simulator`, `gate:background`, `gate:electron`, `gate:checks`, `conformance:phonecopy` | 0 each | |
| `q3ab2.mjs`, parent stand-in then the tree's, twice | — | 30 of 1,600 cut, then 0 of 1,600 |
| `test:ios`, iOS 26.3.1 (lock `electron.lock2`) | 0 | 154 s; Debug 405 tests and Release 402, 0 failures; the archive has no DEBUG seam, no NetworkExtension, no TailscaleKit |
| `test:ios`, iOS 18.3.1 | 0 | 146 s; Debug 405, Release 402, 0 failures |
| `probe:p3167` (`P3167_KEEP=1`) | 0 | 58 s, 8 of 8. Q1 apps `{local: 2, remote: 1, remoteFolder: null}` over 108 combinations, and 36 of the 109 kept answers carry the loopback machine's `app` group, every one with folder null (the kept directory was then removed); Q3 200 reads over 50 removals, 0 problems; Q4 76 ms against a 35 ms control, 41 ms composing at 2,000 rows |
| `probe:p316`, `P316_ARMS=sessions,hostile`, `P316_HOSTILE=sessions-cap,sessions-older-mac,sessions-older-mac-recovers` | 1 | 4,442 s. **PASS** SL1, SL2, SL3, SL4, SL6, SL7 on 26.3 (SL7's header clause included); SL1, SL6, SL8 on 18.3.1; `H sessions-cap` on 26.3 (first row 1,656 ms after the answer, 2,000 rows walked, Machine offered) and 18.3.1 (742 ms); `sessions-older-mac` and `sessions-older-mac-recovers` on both. **UNREADABLE** SL8 on 26.3 (the glass bar). **FAIL** SL5 on its age clause alone, which item 3's windows answer. RUN, Q1, N10, MD3, K2, no Electron left, 0 `p316-` Simulators left |
| `probe:p316`, `P316_ARMS=sessions`, after item 3's windows (lock `electron.lock`) | 1 | 2,029 s, under a load average of 230 to 270 from other work. **PASS** SL1 to SL7 on 26.3, SL1, SL6 and SL8 on 18.3.1; SL8 on 26.3 UNREADABLE. **FAIL** only on `withElectron`'s census: `1 session APPEARED on -L gmux during this launch: shell-1-6`. That is not this probe's: every session it makes is named (`p316-…`, `p3167-sl7a` to `c`) on the socket `gmux-p316-<pid>`, `shell-1-6` is the shape his own Tortie names a shell with, and the same arms in the run above reported nothing. The main session raises it with him |

Counted once at the end: no Electron, tmux server, Simulator or scratch directory of this round is left; both lock
slots were released on the command line that took them.

## §As built, the replay onto main beside 318 (the integrator, 2026-10-04)

Integrated in `/private/tmp/wt-p3167land`, a detached worktree at origin/main `da1138de`, which holds Phase 318 as
landed (`42becaeb`) and, since this file's snapshot `c1a5fd38`, Phase 317 as landed (`467b4e4a`), 316.6 (`b7cf94f3`),
320.1 (`62f832ae`), 320.2 (`18e7e6b6`) and b07c12f1's `probe-p334`. This phase's approved tree is the local commit
`47b922bc` (never pushed); its delta `git diff c1a5fd38 47b922bc` was applied with `git apply --3way` and left 31 files
conflicted. Each conflicted file was regenerated with `git merge-file --diff3` over base `c1a5fd38`, ours `da1138de`
and theirs `47b922bc`, so every hunk was read with its base, and resolved by hand from both sides and both approved trees
(318's `51c562db` and its landed form). Nothing was committed, staged or stashed; `/Users/gdc/gmux` was not written; no
command named `-L gmux`. No Electron and no probe ran; the one Simulator work was `test:ios`, on both runtimes, under
lock slot `electron.lock`, released on the command line that took it.

His ruling of 2026-10-04, "running sessions first, old tucked away", is what the tree already does and nothing here
moved it: an absent Show reads `active` (`POCKET_SESSIONS_DEFAULT`, `SessionsShow.standard`), and under All a project
with no active session arrives `collapsed` (§6.1, D8). The CHANGELOG item now says so in his words.

### The 31 conflicts, and why each reads as it does

Every one is a union. No hunk was settled by taking one side whole, because in every hunk each side added something
the other did not have.

| File | Resolution | Why |
| --- | --- | --- |
| `src/shared/ipc/pocket.ts` (2) | header: four reads and narrow writes; `POCKET_ROUTE_IDS` ends `'end', 'choose', 'say', 'sessions'` | main's three writes kept in main's order and the one read appended, so no existing index moves |
| `src/main/pocket/door/table.ts` (3) | `sessions` row before `end`, then `end`, `choose`, `say`; both doc paragraphs | reads before writes as 316.7 placed it; R4 hashes the sorted lines, so the order is not pinned |
| `src/main/pocket/door/wire.ts` (1) | `SIGNED_ROUTES` gains `sessions`, `WRITE_ROUTES` keeps `end`, `choose`, `say` | each side changed one of the two lines |
| `src/main/pocket/routes.ts` (3) | "Four questions, and three narrow writes"; both bullets, 318's now saying `/v1/sessions` carries no reply offer either; both import lists | the composer bodies merged cleanly; `sessions()` composes no `reply` |
| `src/main/pocket/__tests__/ipc.test.ts` (1) | the eight ids | |
| `src/main/pocket/__tests__/pairing.test.ts` (2) | the route line over eight; 318's hash test widened: 317's five, 318's seven, 316.7's six and a seven of the wrong shape each hash apart from the eight | refusal 8: a Mac confirmed at any earlier door asks once more |
| `src/main/pocket/__tests__/routes.test.ts` (4) | the caps mock and both imports; length 8 twice; `/v1/type` as the absent write (`/v1/say` is a route now); 318's reply describe block then 316.7's Sessions block | both appended at the file's end |
| `ios/Tortie/App/TortieApp.swift` (1) | "four reads … and three writes" | comment only |
| `ios/Tortie/Screens/DoorWords.swift` (1) | both header paragraphs | comment only |
| `ios/Tortie/Screens/Identifiers.swift` (2) | both tables and both id sets | disjoint names |
| `ios/TortieTests/CopyTests.swift` (3) | both mocks read; Answer.html's assertion and the menu's spoken name both kept; the doc line names 318's four words and 316.7's no search | |
| `ios/TortieTests/TokensTests.swift` (2) | twelve mocks: main's ten (318's `Idle` included) and `SessionsMenu`, `SessionsOlderMac` | still exactly the 15 colours; `test:ios` green |
| `ios/TortieUITests/P316DriveUITests.swift` (4) | both doc paragraphs, both id blocks, both step dispatchers, both step bodies | no name declared twice (checked) |
| `ios/TortieTests/Fixtures/vectors.json` (1) | both request lists so the file parses, then REGENERATED by `node build/p316/vectors.mjs` | never hand edited; the regenerated file differs from main's by exactly the `sessions` request and 316.7's two answers (27 lines), so every random value 318 recorded is kept |
| `build/conformance-pocket.mjs` (6) | both headers ("ninety-seven rules in all"), X11 and X12 as 318 widened them, Y1 to Y18 then O2a to O3, both rule bodies, both PHASES rows; `ROUTE_PIN` rewritten by `--write-route-pin` | see the pin below |
| `build/ablation-p313.mjs` (2) | both headers (292 entries) and both arm blocks | every arm's anchor read present in the worktree before the run (292 arms, 0 missing) |
| `build/p313/hostile-client.mts` (1) | both header paragraphs | the arms merged cleanly; 180 arms run |
| `build/conformance-ios.mjs` (2) | (aa)'s paragraph, which now says (s) reads 318's build 6, then 318's (ae) to (ag); both self-test blocks | 31 rules |
| `build/p316/ablation-ios.mjs` (4) | both headers, both arm blocks, the rule list `aa` and `ae` to `ag`, the PASS line "(a) to (z) and (aa) to (ag)" | 283 arms, no id twice |
| `build/p311/copy-drift.mjs` (2) | 316.7's folder `data` rule beside main's `owed` rule; `OWNED_RULE_FLOOR` 60 + 14 = **74** | the gate's own run reads 74 owned rules matched, floor 74 |
| `build/p316/hostile-door.mjs` (7) | both doc blocks; the reply arms then the sessions arms (a comma added after `reply-say-done`); both worlds; 318's POST branch above the GET list that now names `/v1/sessions`; both door fields (a comma after `replyWords`); `writesHold` counting 318's four writes and the self-test requiring `sessionsHold` too, its line saying both | `--self-test` 67 arms |
| `build/p316/node-phone.mjs` (1) | both header paragraphs | |
| `build/p316/probe-p316.mjs` (9) | both doc blocks; `P316_ARMS` default `order,floor,deny,hostile,end,reply,sessions`; the floor runtime for `floor`, `end`, `reply`, `sessions` or `hostile`; both imports (`REPLY_ARMS`, the p318 stand-in, `readSessions`, `tsxCli`); both constant blocks; both self-test lines and one exit over all six; both groups (reply, then sessions); the hostile loop is 316.7's `hostileArm` with 318's filter (`reply !== true`) | ours changed only that filter line in the loop 316.7 restructured |
| `build/p316/vectors.mjs` (3) | both header lines, both constant blocks, requests `end`, `choose`, `say`, `sessions` | the sessions request appended last, so 318's three keep their clocks and nonces |
| `build/p317/probe-p317.mjs` (2) | `ROUTE_LINE` over the eight, `WRITE_LINE` 318's; its header (316.7 had edited it, 318 had not) now names both lines over the union | `--grader-self-test` 13 graders, 61 clauses |
| `build/assert-electron-teardown.mjs` (1) | both paragraphs; `HELPER_USER_FLOOR` **165** | below |
| `build/verification-checks.mjs` (1), `package.json` (1) | both phases' entries | |
| `docs/design/phone/index.html` (1) | 316.7's 2b and 2c figures, then 318's caption for 3 | |
| `CHANGELOG.md` (1) | main's items, 316.7's markdown item still removed (316.6 landed markdown off), and 316.7's item reworded to his ruling | |
| `CLAUDE.md` (3) | the pocket row (318's then 316.7's paragraph, R4 `d95ecd27…` over eight, hostile and ablation clauses joined), the ios row ((aa) then (ae) to (ag), 283 arms), the `probe:p316` row (both groups; 316.7's group timed from its fix round), the reply row and the `probe:p3167` row kept | word-level three-way merges of each row, every conflict read by hand |

Files outside the 31: `build/p317/CHECKLIST.md`, `build/p318/CHECKLIST.md` and `build/p3167/CHECKLIST.md` each named a
route line of its own phase; all three now name the line the Mac will draw, `Answers these and nothing else: blocked,
choose, end, pair, say, session, sessions, turns` (317's also the joined write line), which §11 asked the replay to do.

### The pins and counts, each read from the gate that owns it

- **R4's membership pin moves on purpose** from 318's `0e8c9f46733b7fe7b706f071fa68bbedf135145757cef2e39d686feb9f5a7841`
  (seven lines) to `d95ecd272da5fbab8eadd9379ecce4eace9fd69c963be996aa6726ae7a22cf77` (eight), written by
  `node build/conformance-pocket.mjs --write-route-pin` and re-derived by `printf` of the eight sorted lines through
  `shasum -a 256`: the two agree, and both equal the value 318's spec predicted. (316.7 alone had pinned `a6c1bb3c…`.)
- **The confirm hash moves by the route list** (`sha256-pocket-exec-v3`, unchanged algorithm, `routes` a hashed field), so
  a Mac updated from 317, from 318 or from either phase alone **asks once to allow the door again**. `pairing.test.ts`
  holds it for each of those route sets.
- **The phone's build stays 6**: `ios/Tortie.xcodeproj` has no diff, and conformance:ios (s) reads 6.
- **`HELPER_USER_FLOOR` 163 → 165.** `gate:electron` on main reads 164 helper users against 163: 317's and 318's
  snapshots each raised 162 to 163, main took the raise once (317's), and b07c12f1 had raised 161 to 162 for
  `build/p334/probe-p334.mjs`, so 318's landing left `build/p318/probe-p318.mjs` uncounted. With
  `build/p3167/probe-p3167.mjs` the tree holds 165, and a floor of 164 would let either probe be deleted in silence.
- **`OWNED_RULE_FLOOR` 74** (318's 60 + 316.7's 14), **`PHONE_MAC_FLOOR` 79** (316.7's; 318 added no `/// Mac:` word):
  the gate reads 144 words, 79 judged against the Mac (floor 79), 17 screens, 455 segments, 74 owned rules (floor 74).
- conformance:pocket **97 rules** (318's 83 + 316.7's 14), conformance:pocket:hostile **180 arms** (119 at the parent,
  35 from 318, 26 from 316.7), conformance:ios **31 rules** (318's 30 + (aa)), ablation:p316 **283 arms** (main's 265 +
  316.7's 18), ablation:p313 **292 entries** (main's 273 + 316.7's 19), the hostile door's self-test **67 arms**,
  the vectors **9 signed requests, 3 of them writes, 10 answers**.
- `gate:contract` is byte for byte: no channel, schema, storage key or env name moved, so the baseline was not
  regenerated. `RUNNER_CALLER_FLOOR` reads 52 callers against 51 on main and here alike; neither phase moved it.

### The duplicate scan (10-line windows, whitespace folded, at least seven non-trivial lines)

Over every tracked source under `src/`, `build/`, `ios/` and `docs/design/phone/`: 380 windows that touch the delta
appear more than once; **107** appear more often here than in main AND than in `47b922bc`, which is what the merge made.
**None is in a file a conflict resolution wrote, and none is in `src/` or `ios/`.** 96 are `build/p3167/probe-p3167.mjs`
sharing `build/p317/probe-p317.mjs`'s scaffolding with `build/p318/probe-p318.mjs` (and some with `measure-writer.mjs`,
p330, p332, p3321 and p3332): each phase copied 317's door bring-up, pairing and word readers independently, so on one
tree they now match each other too. 11 are the mocks' shared CSS (`SessionsMenu.html` and `SessionsOlderMac.html`
beside 318's `Answer.html` and `Idle.html`), which every mock repeats by design. Neither is extracted: both phases'
integrators ruled the shared probe kit its own entry, because extracting rewrites landed probes that only their own
Electron runs can prove. A control, bidi, zero-width, soft hyphen, BOM, CR and no-break space scan of the delta's
14,944 added lines found nothing.

### No behaviour lost, checked both ways

Every line `git diff da1138de` removes that 316.7's own delta did not remove was listed: 61 lines in 20 files, each a
count, a pin, a route list or a sentence the union rewrote (above). Every line 316.7's delta added that is no longer in
the tree was listed: 22 files, each the same kind of rewrite. No line of 318's code, 317's End and End these, 316.6's
tabs and Settings, 320.1 or 320.2 was dropped, and no 316.7 behaviour was.

### Commands, run by the integrator after resolving

| Command | Exit | Numbers |
| --- | --- | --- |
| `node build/conformance-pocket.mjs --write-route-pin`; `printf … \| shasum -a 256` | 0 | both `d95ecd27…` over eight lines |
| `node build/p316/vectors.mjs`, then `--check` | 0, 0 | 9 signed requests (3 writes), 1 tampered target, 2 tampered write bodies, 10 answers, 3 alerts; PASS |
| `npm run -s typecheck` | 0 | 1,400 production files, 0 import violations, 0 runtime cycles, shared types OK; 18 s |
| `node_modules/.bin/vitest run` (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | 0 | 1,064 files passed, 2 skipped; 19,337 tests passed, 14 skipped; 51 s |
| `npm run -s build` | 0 | 34 s; every gate inside it green |
| `npm run -s package`, then `rm -rf release` | 0 | 137 s, signed, notarization skipped; `release/` removed |
| `conformance:pocket` | 0 | 97 rules, 15,620 checks; 15,627 after `npm run build`, with `U5` reading the built door |
| `conformance:pocket:hostile` | 0 | 180 arms, 8 s |
| `conformance:ios` | 0 | 31 rules over 37 app files, 43 test files, 91 files under `ios/` |
| `conformance:phonecopy` | 0 | 144 words, 79 Mac (floor 79); 17 screens, 455 segments, 74 owned rules (floor 74) |
| `conformance:choices`, `:handback`, `:manager`, `:machines` | 0 each | 27 clauses and 33 self-tests; PASS; 64 rules, 2,688 checks; PASS |
| `ablation:p316` | 0 | 283 of 283 arms red on their own rule, every rule (a) to (z) and (aa) to (ag) able to fail; 454 s |
| `ablation:p313` | 0 | 292 ablations, one clause each, every one red on the rule that owns it as a delta against the base, every clone file restored by sha256; 1,212 s |
| `--grader-self-test`: `probe-p316`, `probe-p317`, `probe-p318`, `probe-p3167`; `hostile-door.mjs --self-test` | 0 each | p316: 17 dumps, alerts 188, tabs 113, End 108, reply 65, Sessions 142 cases; p317 13 graders, 61 clauses; p318 25, 80; p3167 9, 33; hostile door 67 arms |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 each | byte for byte; 256 check scripts; 165 of floor 165; 3 starts, 19 of 19 fixtures; 2 of floor 2; hermetic |
| `xcodebuild build-for-testing`, Debug, through `xcodebuildRun` (no device) | 0 | 18 s |
| `test:ios`, iOS 26.3.1 (lock `electron.lock`) | 0 | 162 s; Debug 463 tests and Release 460, 0 failures; the device archive and both apps: no NetworkExtension, no TailscaleKit, no coverage, no DEBUG seam in Release |
| `test:ios`, iOS 18.3.1 (same lock) | 0 | 165 s; Debug 463, Release 460, 0 failures |

Counted once at the end: this role started no Electron, no tmux server and no probe; `xcrun simctl list devices | grep -c p316-` reads 0 with nothing booted; the derived data (`…/scratchpad/p3167land/dd-integrator*`) and `test:ios`'s two scratch directories are deleted, `release/` is gone, and no `/private/tmp/p313-ablation-*` or `p316-ablation-*` clone is left. The final `npm run -s build` after the last edit exited 0, and `gate:electron` read 165 of floor 165.

### Open concerns, for the verifiers and the main session

1. **Nothing ran live here.** `probe:p3167`, `probe:p316` with both its `reply` and `sessions` groups and the hostile
   `reply-*` and `sessions-*` arms, `probe:p318` and `probe:p317` are the verifiers'; `smoke:t1`, `smoke` and `smoke:t3`
   are the main session's landing battery. The one combined interaction no gate drives is 318's reply group opening its
   sessions through a Sessions tab that now opens on Active and lays rows out under projects; its sessions are live, so
   Active keeps them, and the `open:` step scrolls a lazy row into view, but only `probe:p316` proves it.
2. `HELPER_USER_FLOOR` is set to the count the gate reads (165), one above "rises by one", because main's floor was one
   behind; the commit body should name both probes.
3. The 107 duplicated windows above stay, as both phases ruled.
4. Every open concern of this file's two earlier "§As built" sections and of 318's stands as written.

## §As built, the replay's fix round (the fixer, 2026-10-04)

The verifier answered **needs_work** on two major problems. Both were the same defect in two probes. The merged door
draws the right eight-route line and reads `changed`, but two probes still pinned an older route line, so their live
confirm arms read red. Nothing under `src/main/` or `ios/` moved in this round. The fix ran once, in
`/private/tmp/wt-p3167land`. Nothing was committed, staged or stashed, `/Users/gdc/gmux` was not written, and no
command named `-L gmux`.

### Each problem, and what changed

| Verdict item | Change | Proof |
| --- | --- | --- |
| major: `build/p318/probe-p318.mjs` `ROUTE_LINE` and the self-test's `routeIdsOf` ids still named 318's seven routes, so R0 failed two clauses live | `ROUTE_LINE` is now `Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns`. The `routeIdsOf` ids are now the eight. R0's break fixture is now 318's own seven-route line, so it is the line the merge left behind. The header says 316.7 landed second, and that RP needs a parent with no reply route (`c1a5fd38` or `e657dfbf`, 318's parent on main). A parent at or after `42becaeb` reads RP red by design | `probe:p318` at HEAD: R0 PASS. Its lines and its confirm block hold the eight-route line and the three-write line before Allow |
| major: `build/p3167/probe-p3167.mjs` `ROUTE_LINE`, its header, the Q6 title and clause, and two comments named six routes; Q6 failed live | `ROUTE_LINE` is now the eight-route line. A new `PARENT_ROUTE_LINE` holds today's seven-route line, used by Q6's break and PARENT's honest fixture. Q6 now reads "the door asks again over eight routes". The header names `da1138de` as the parent (`c1a5fd38` when it was built), and the parent comment says seven routes, not five | `probe:p3167` with a built `da1138de` parent: Q6 PASS. The eight-route line is drawn before Allow, the agreement reads `changed`, and PARENT's own line has seven routes |
| nit: `CLAUDE.md`, the `probe:p3167` row said "Q6 the six-route confirm line" | It now says "Q6 the eight-route confirm line" | read |
| The verifier's root cause: each probe's self-test could not see a stale line, because its fixtures are built from the constant itself | `probe-p317.mjs`, `probe-p318.mjs` and `probe-p3167.mjs` each gain one self-test line. It reads `POCKET_ROUTE_IDS` out of `src/shared/ipc/pocket.ts` as text, sorts the ids, and asks that `ROUTE_LINE` names exactly them. A later phase that adds a route turns this self-test red, before any live arm is needed to catch it | Each probe's old line was put back in place and its self-test run, and the file was restored and checked by sha256. Every run went red on this check. In `probe-p3167` it was the **only** red line, which is why the self-test passed before |
| Outside the verdict, the same kind of stale text: the fixture in `src/renderer/settings/__tests__/p316-phone-section.test.tsx` said "the six routes since Phase 316.7 … as main composes them" | Its lines now carry the eight-route line and 318's three-write line, and its `routes` now include `choose` and `say`. There are still seven lines, so every index the test reads stays the same | the file: 104 of 104 tests; the full vitest run below |
| nit, R15b, which the verifier read red at HEAD (2 of 2) and at today (1 of 1) with the relay's cut counter at 0 | Not changed. It is not this merge's | This round's HEAD run read R15b **PASS**, with `cuts: 1`, the cut answering 0, the re-signed write `done`, and 1 submit after the resend. So R15b is an intermittent test of timing in the probe's relay, and it exists on main as landed. The main session should give it its own look |
| nit, RN's clipped path tail | Not changed. It is a fragility in the probe, already on main, and it does not block | n/a |

§9.3's Q6 sentence, which names six routes, is superseded by this section. The line Q6 holds now names eight.

### What ran live, under lock slot `electron.lock`

| Run | Exit | Numbers |
| --- | --- | --- |
| `probe:p3167` with `P3167_PARENT_CHECKOUT` at `da1138de` | 0 | 9 of 9 arms pass in 56.9 s. PARENT: `/v1/sessions` 404, `/v1/blocked` reads 200 others with `othersOmitted` 1,800 of 2,000, and its line names seven routes. Q6 draws the eight-route line and the three-write line before Allow, the agreement reads `changed`, and Allow listened. Q4 composes in 45 ms (73 ms read minus a 28 ms control). Q1, Q2, Q3, Q5, Q7 and RUN pass |
| `probe:p318` at HEAD, no parent | 2 | 23 pass, 0 fail, and RN unreadable because no parent ran. 384 s. R0 lines: the eight-route line and `Lets an allowed phone end a session, answer a numbered question and send a session one message`, before `never`, listening |

The parent was made with `git archive da1138de` into scratch, not as a worktree, so no file under `/Users/gdc/gmux/.git` was
written. Its `npm run -s build` exited 0 in 33 s. The scratch directory was deleted afterwards. Electrons were counted once
at the end: 14 lines before and 14 after, with the same pids. All of them are the operator's own.

### Commands, re-run after the fix

| Command | Exit | Numbers |
| --- | --- | --- |
| `printf` of the eight sorted route lines through `shasum -a 256`, and `ROUTE_PIN` in `build/conformance-pocket.mjs` | 0 | both `d95ecd272da5fbab8eadd9379ecce4eace9fd69c963be996aa6726ae7a22cf77`, so R4 is unmoved by this round |
| `node build/p316/vectors.mjs --check` | 0 | 9 signed requests, 3 of them writes, 1 tampered target, 2 tampered write bodies. Not regenerated |
| `npm run -s typecheck` | 0 | 1,400 production files, 0 import violations, 0 runtime cycles, shared types OK |
| `node_modules/.bin/vitest run` (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) | 0 | 1,064 files passed and 2 skipped; 19,337 tests passed and 14 skipped; 42 s |
| `npm run -s build` | 0 | 32 s, every gate inside it green. `gate:electron` reads 165 of floor 165 |
| `npm run -s package`, then `rm -rf release` | 0 | 138 s, signed, notarization skipped, `release/` removed |
| `conformance:pocket` | 0 | 97 rules, 15,627 checks |
| `conformance:pocket:hostile` | 0 | 180 arms, 6.9 s |
| `conformance:ios` | 0 | 31 rules over 37 app files, 43 test files and 91 files under `ios/` |
| `conformance:phonecopy` | 0 | 144 words, 79 judged against the Mac (floor 79); 17 screens, 455 segments, 74 owned rules (floor 74) |
| `conformance:choices`, `:handback`, `:manager`, `:machines` | 0 each | 27 clauses and 33 self-tests; PASS; 64 rules and 2,688 checks; PASS |
| `--grader-self-test`: `probe-p316`, `probe-p317`, `probe-p318`, `probe-p3167`; `hostile-door.mjs --self-test` | 0 each | p316 640 checks (Sessions 142 cases); p317 13 graders, 61 clauses, 113 checks; p318 25 graders, 80 clauses, 140 checks; p3167 9 graders, 33 clauses, 125 checks (each of the last three is one more than before, the route-id line); hostile door 67 arms |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:simulator`, `gate:knownhosts` | 0 each | byte for byte; 256 check scripts; 165 of floor 165; 3 starts, 19 of 19 fixtures; 2 of floor 2; PASS |
| `xcodebuild build-for-testing`, Debug, through `xcodebuildRun` | 0 | 18.7 s |
| `test:ios`, iOS 26.3.1 (lock `electron.lock`) | 0 | 160 s. Debug ran 463 tests and Release 460, with 0 failures. The device archive and both apps have no NetworkExtension, no TailscaleKit, no coverage, and no DEBUG seam in Release |
| `test:ios`, iOS 18.3.1 (same lock) | 0 | 152 s. Debug ran 463 tests and Release 460, with 0 failures |
| `ablation:p316` | 0 | 283 of 283 arms red on the rule that owns them, (a) to (z) and (aa) to (ag); 410 s |
| `ablation:p313` | 0 | 292 ablations, each red on the rule that owns it, and every clone file restored by sha256; 1,085 s |

Counted once at the end: 14 Electron lines before and 14 after, with the same pids. `xcrun simctl list devices | grep -c
p316-` reads 0, and nothing is booted. The lock slot was released on the line that ran `test:ios`, and both slots read free. The
`dd-fixer*` derived data, the scratch parent, `release/` and the `out/p3167` and `out/p318` reports are gone (the
reports were first copied to the fixer's scratch). No `/private/tmp/p313-ablation-*` or `p316-ablation-*` clone is left.

### Open concerns, for the reverifier and the main session

1. R15b is intermittent and already exists on main. The verifier read it red 3 times, and this round read it green
   once. It needs its own look, outside this merge.
2. `probe:p318`'s RP needs a parent with no reply route. Against `da1138de`, RP is red by design, and RN differs only in the
   clipped path tail (the verifier's nit, left alone).
3. Every open concern of the replay section above still stands as written.
