# Phase 332.1 — the Pair card shows the name check working — SPEC

Written by the spec step on 2026-09-30 in `/private/tmp/wt-p3321` at `75edbf5e` (origin/main). Every `file:line` below
was re-read at this head. Phase 332 landed at `333087da`; between it and this head Phase 316.5 (alerts, `f90ff8cc`) and
Phase 323 (`af5d2748`) landed and moved most of the entry's line numbers, but neither touched the name check:
`git diff 333087da..75edbf5e -- src/main/pocket/public-name.ts` is empty, and the `naming` face, `beginNameCheck`,
`nameRoundNow`, `settleNameRound`, `armNameRound` and `pairable` are byte for byte `333087da`'s. **The parent build for
every "before" measurement is `75edbf5e`**, the tip this phase lands on, and what the operator runs today.

Read with it, whole: the Phase 332.1 entry (`grep -n "^## Phase 332.1 " docs/BACKLOG.md`, to the next `## Phase`), the
running-log lines of 2026-09-30 "HIS FIRST PAIRING THROUGH FUNNEL WORKED" and "PHASE 332.1 QUEUED", and
`build/p332/SPEC.md` §4.7, §4.9, §4.12, §4.14 with its three "§As built" sections (the fix round moved
`NAME_CONFIRM_YES_ROUNDS` and `NAME_UNREADABLE_ROUNDS` to 1 and added `NAME_OPEN_AFTER_ROUNDS` = 18,
`src/main/pocket/public-name.ts:116`, `:123`, `:132`). Where this file and the entry disagree, §3 says so and this
file wins.

**His words, 2026-09-30:** "we definitely should add a follow up phase to show progress re: public dns checking in the
phone screen (that is delightful and not overwhelming)". The phone screen is Settings → Phone on the Mac.

**The hard rules for every step, stated once.** No test, probe or agent asks real DNS for his name or loops on a real
DNS server: every probe runs `build/p332/dns-standin.mjs` on 127.0.0.1 named by `GMUX_POCKET_NAME_SERVERS`, and every
test injects `fakeNameDeps`. The Funnel child is always Phase 330's stand-in. No real interface is bound. Builders and
the integrator launch no Electron. No screenshot: a visual claim is a rectangle, a label or a computed style a probe
read. No model turn; gemini, qwen, agy, grok and droid are renamed away before every launch.

---

## 1. The answer first

**What gets built.** The round already works out every server's answer (`askNameRound`,
`src/main/pocket/public-name.ts:628-637`) and throws all of it away but the verdict (`:639`). It now hands the answers
out as well, kinds only, in server order. The host stamps its run with a monotonic clock, and one new status field,
`nameProgress`, carries four things to the sheet: the last round's answers, whether a round is out, how long the check
has run, and how long until the next round. The Pair card draws them as four small dots, one moving line and one quiet
line. **No rule moves**: the parser, the verdict, `roundVerdictOf`, `nextNameStreak`, the gaps, both open-anyway rules,
the 3:00 window and the log are byte for byte today's.

**What a person sees** (Settings → Phone → Pair a phone):

```
 ●○●○  Publishing your Mac’s name · 2 of 4 see it          ← the moving line (aria-live)
       Checking again in 20 s                               ← the quiet line
 ...
 ○◌●○  Publishing your Mac’s name · 1 of 4 see it          ← one server did not answer
       Checking now                                         ← the four dots dim once while a round is out
 ...
 ○●●○  Publishing your Mac’s name · 2 of 4 see it
       1 min · checking again in 60 s
 ...
 ●●●●  Your Mac’s name is live
       Took 2 min
       [ Pair ]                                             ← appears below; nothing above it moves
```

- When Pair opens without a confirmation (an unreadable round, or the 18th round of no), the moving line becomes
  `Tortie could not confirm your Mac’s name, so a first scan may fail.`, checking goes on in the quiet line, and Pair
  appears below.
- A remembered name shows Pair at once with no dots, exactly as today. A later visit to Settings → Phone after the name
  confirmed shows Pair alone, exactly as today.
- Hover: the block says the checking sentence; each dot says `Sees your Mac’s name`, `Not there yet` or `Did not
  answer`; the quiet line says `Pair opens when a round finds your Mac’s name and no server says it is missing.`

**The seams, decided (§5 gives each reason).**

| Seam | Decision |
| --- | --- |
| The round's answers | A new `NameRound` type (`NameRoundResult` plus `answers`), returned by `askNameRound` only, so `roundVerdictOf`'s type and body do not move. §5.1 |
| The clock | `NameCheckDeps.monotonic()`, shipping `performance.now()` (Node's global, no import). Monotonic and never moved by setting the clock. **It counts the Mac's sleep**: measured on this Mac, the entry's "awake time" is false. §5.2 |
| The four fields | `PocketStatus.nameProgress: { answers, asking, elapsedMs, nextInMs } \| null`, durations not times, no string. §5.4 |
| When it is pushed | When a round starts (`asking`) and when it ends (`answers`, `nextInMs`), through `announce()`, not `changed()`. At most two pushes a minute after the first rounds. §5.3 |
| When it is null | Before a run, for a switch-on (`reask`) round, while the door is not published or the switch is off. After a confirmation the last round stays, frozen, until the next run or an unpublish. §5.3 |
| The words | Seven short labels in `PhoneSection.tsx`; one hover sentence in the contract beside `POCKET_NAME_SENTENCES`, which does not move a byte. §5.5.2 |
| The dots | 6 px (`--space-3`), filled `--text-secondary`, else the house's 1.5 px hollow ring in `--text-muted`. No amber, no accent, no `.dot` class, no new token. §5.5.4 |
| The motion | One opacity breath a round on the dot row (0.5 while asking, `--dur-base`, `--ease-out`). No keyframes, no loop. Reduced motion refuses it by the house rule. §5.5.4 |
| The place | Both rows keep their height whatever they say (Phase 174.1); the dot slot is four dots wide before any round answers; the block sits where it sits on both faces, so nothing above Pair moves. §5.5.3 |
| The tick | A 1 s renderer interval on its own `performance.now()`, only while the block is drawn and the check is live. §5.5.5 |
| Pair | Still `pairable` alone: `pairingStage`, `pairAfterAllowNext` and `onPair` never read `nameProgress` (D10). |
| The gates | `conformance:pocket` D4 restated, D5 and D6 widened, **D10** new; ten new `ablation:p313` arms. §8 |
| The probe | A new `probe:p3321`, ONE launch per build, four scripted DNS stand-ins replaying his flapping name. `HELPER_USER_FLOOR` 157 → 158. §9.3 |

**The menus do not change.** `Pair a Phone…` stays at `src/main/menu.ts:615`. No surface is added, renamed or removed.

---

## 2. The tree at this head, re-read

| What | Where | Note |
| --- | --- | --- |
| `NameCheckDeps` | `src/main/pocket/public-name.ts:220-227` | gains `monotonic()` |
| `NameRoundResult` | `public-name.ts:234-237` | unchanged; `NameRound` extends it |
| `roundVerdictOf` | `public-name.ts:559-566` | unchanged, byte for byte |
| `nextNameStreak` | `public-name.ts:575-603` | unchanged, byte for byte |
| `askNameRound` | `public-name.ts:609-643`; early returns `:616`, `:619`, `:627`; answers `:628-637`; verdict `:639`; catch `:641` | returns `NameRound` |
| `defaultNameCheckDeps` | `public-name.ts:895-906`; the id `:899` (`id: () => randomInt(0, 0x10000),`, an ablation `from:`) | gains `monotonic: () => performance.now(),` |
| The module's "It reads no clock" | `public-name.ts:59-60` | restated (§5.2) |
| Constants after the fix round | `NAME_CONFIRM_YES_ROUNDS` 1 `:116`, `NAME_UNREADABLE_ROUNDS` 1 `:123`, `NAME_OPEN_AFTER_ROUNDS` 18 `:132`, `NAME_CHECK_GAPS_MS` `:103`, `NAME_SERVERS_MAX` 4 `:84` | unchanged |
| The house's monotonic precedent | `src/main/push/engine.ts:143`, `deps.monotonic?.() ?? performance.now()` | the name `monotonic` follows it |
| `NameRun` | `src/main/pocket/ipc.ts:287-303` | gains `startedAt`, `nextAt`, `endedAt`, `answers` |
| Host fields | `ipc.ts:404-409` (`names`, `nameRun`, `nameRuns`) | gains `nameShown` |
| `status()` | `ipc.ts:684-742`; `nameCheck: this.nameCheckNow(),` `:731` (an ablation `from:`), `pairable: this.pairable(),` `:732` | gains `nameProgress` after `:732` |
| `changed()` / `announce()` | `ipc.ts:1244-1247` / `:1254-1264` | `changed()` also asks the alerts' port to re-arm (316.5); `announce()` only broadcasts |
| `beginNameCheck` | `ipc.ts:1280-1300`, called once at `:1030` | stamps `startedAt`, sets `nameShown` |
| `stopNameCheck` | `ipc.ts:1307-1311`, first line of `unpublish` `:1166` and `unexpectedlyDown` `:1052` | clears `nameShown` |
| `nameRoundNow` | `ipc.ts:1323-1340`; `run.cancel = null;\n    run.inFlight = true;` `:1327-1328` (an ablation `from:`) | pushes when a round starts |
| `settleNameRound` | `ipc.ts:1348-1394`; the verdict log `:1363` (an ablation `from:`); the push `:1393` | keeps answers, stamps `endedAt`, pushes when a round ends |
| `armNameRound` | `ipc.ts:1400-1405`; its 4-line `armFunnelRestart` block (an ablation `from:`) | stamps `nextAt` on a line before the block |
| `nameCheckSoon` (the wake) | `ipc.ts:1412-1418`, called from `wakeCheck` `:1112` | unchanged |
| `nameCheckNow` / `pairable` | `ipc.ts:1421-1426` / `:1435-1441` | unchanged |
| `beginPairing`'s two refusals | `ipc.ts:1642`, `:1656` (`${POCKET_NAME_SENTENCES.checking} No code was shown.`) | unchanged |
| `PocketNameCheck` | `src/shared/ipc/pocket.ts:390` | the new types go after it |
| `PocketStatus.pairable` | `pocket.ts:486` | `nameProgress` goes after it |
| `POCKET_NAME_SENTENCES` | `pocket.ts:724-727` | does not move a byte |
| `EVT_POCKET_CHANGED` | `pocket.ts:825` | the push |
| The sheet | `src/renderer/settings/PhoneSection.tsx`: header `:1-34`; `CODE_FIRST_NAME` `:91-92`; `pairingStage` `:224-239` (`return status.pairable ? 'ready' : 'naming';` `:238`, an ablation `from:`); `pairAfterAllowNext` `:256-266`; `PhoneViewProps` `:314`; `PairCard` `:370`; `waiting` face `:438-445`; `naming` face `:447-454`; `ready` face `:456-469`; `PhoneSection` `:708`; the status pull and `onChanged` `:740-766`; the code's 1 s interval `:774-786`; `onPair` `:915-925` | §5.5 |
| The sheet's CSS | `src/renderer/settings/phone-section.css` (126 lines); `.phone-block` `:11-17`, `.phone-line` `:29-36` | gains the name block's rules |
| The session dot | `src/renderer/styles/globals.css:282-288` (`.dot`, 8 px); the hollow ring `inset 0 0 0 1.5px` `:304-317` | never reused; its ring shape is |
| Motion | `DESIGN.md:395-403` (§5); `--dur-base` 160 ms `tokens.css:381`; `--ease-out` `:383`; reduced motion `tokens.css:655-698` (`transition-property: none !important` `:696`) | |
| The Phase 174.1 rule | `docs/DESIGN-SPEC.md:832` ("reserved in layout whether or not it speaks") | |
| Size tokens | `--space-1` 2 px … `--space-3` 6 px `tokens.css:165-167`; `--lh-sm` 18 px `:231`; `--text-xs` 11 px / `--lh-xs` 16 px `:228-229` | |
| `conformance:pocket` | `build/conformance-pocket.mjs`: 52 rules, 12,255 checks, PASS at this head (run by this step); `D_RULES` `:4013`; D4 `nameStartRule` `:4386-4479` (the clock regex `:4453`); D5 `nameLogRule` `:4481-4520`; D6 `pairableRule` `:4522-4602`; `PHASES` `:4870-4910` | §8.1 |
| `ablation:p313` | `build/ablation-p313.mjs`: 143 arms at this head; `NAMES` `:124`, `IPC` `:106`, `SHARED` `:107`, `PHONE_SECTION` | §8.2 |
| `HELPER_USER_FLOOR` | `build/assert-electron-teardown.mjs:357`, **157**, 157 users counted (run by this step) | → 158 |
| `probe:p332`'s card reader | `build/p332/probe-p332.mjs:749-756`; H1's sample `checking: c.text.includes(WORDS.checking)` at `:967`; H1's clause `:237-241` | reads the block's title too (§9.4) |
| The probe classification | `build/verification-checks.mjs:643` (`electron('probe:p332')`) | `probe:p3321` beside it |
| The contract inventory | `docs/audits/contract-baseline.txt`, 567 lines; `node build/contract-inventory.mjs --check` exit 0 at this head | **no line moves** (§8.3) |
| His checklist | `build/p330/CHECKLIST.md:30-35`, `:57-63`, `:145-151`, `:154-160`, `:172-177`, `:211` | quote the old sentence; all move (§8.5) |
| The CHANGELOG item | `CHANGELOG.md:12`, the iPhone item under `## Unreleased` | gains one clause (§8.6) |

---

## 3. Where the entry is wrong or stale at this head

| # | The entry says | What is true | What this spec does |
| --- | --- | --- | --- |
| 1 | Line numbers (`ipc.ts:258-273`, `:1224`, `:1267`, `:1292`, `:1307`, `:1337`, `:1344`, `:1586`, `:1600`; `PhoneSection.tsx:87`, `:203-218`, `:402-409`, `:411-424`; `pocket.ts:419`, `:486`, `:702-705`; `conformance-pocket.mjs:4188`) | Phase 316.5 moved every one. The entry was written before it landed | §2 cites them at this head |
| 2 | `clock()` "is monotonic and counts awake time, as the timer does, so a Mac that slept shows the time spent checking, not the night" | **Measured by this step on this Mac, Node 22.23.1, libuv 1.51.0**: `process.hrtime` read 2,114,501 s; `CLOCK_MONOTONIC`, which counts sleep, 2,114,494 s; `CLOCK_UPTIME_RAW` (awake time, `mach_absolute_time`) 1,722,843 s. Node's clock, and `performance.now()` with it, COUNTS SLEEP (391,651 s of it since the boot of 2026-09-06; `pmset -g log` shows the sleeps). Node offers main no awake-time clock, and D1 forbids the import a native one would need | The clock is still `performance.now()`: monotonic, never moved by setting the clock, and nothing decides from it. The elapsed time it draws includes any sleep during the check. Stated as a limit (§5.2, §12) |
| 3 | (332's own comment, `ipc.ts:1408-1411`) "a timer does not count the sleep" | libuv's loop time is the same clock, so a timer due during sleep is due at wake. `nameCheckSoon` is then redundant on this Node, and harmless (`run.inFlight` and the cancel keep one round) | Stated, not changed: it is 332's rule and this phase changes none |
| 4 | "`NameRoundResult` gains `answers`" | `roundVerdictOf`'s declared return type IS `NameRoundResult` (`public-name.ts:561`); a required member would change its type and body, which the entry says do not move | A new exported `NameRound extends NameRoundResult`; `askNameRound` alone returns it (§5.1) |
| 5 | "`NameCheckDeps` gains `clock()`" | The house's name for this seam is `monotonic` (`src/main/push/engine.ts:143`) | `monotonic()` (§5.2) |
| 6 | "after a confirmation it keeps the last round, frozen, until the next run", stamped on `NameRun` | A confirmation sets `this.nameRun = null` (`ipc.ts:1381`), and `nameCheckNow` reads `nameRun === null` as `none` (`:1424`). Keeping the run alive would change a rule | A separate host field, `nameShown`, holds the run the sheet draws (§5.3) |
| 7 | "`nameRoundNow` pushes when a round starts and `settleNameRound` when it ends" through `this.changed()` | Since 316.5, `changed()` also asks the alerts' port to re-arm (`ipc.ts:1244-1247`); `announce()` "broadcasts the status, and NOTHING ELSE" (`:1250-1253`). A round moves nothing an alert reads | Progress-only pushes use `announce()`; a push that moves `nameCheck` or `pairable` keeps `changed()` (§5.3) |
| 8 | D6 as landed: the sheet "compares `nameCheck` only with `'unreadable'`" (`conformance-pocket.mjs:4590-4600`) | "Your Mac's name is live" needs `nameCheck === 'confirmed'`; inferring it from the progress shape would draw "live" from something main did not say | D6 restated: `'unreadable'` or `'confirmed'`, never inside `pairingStage`, `pairAfterAllowNext` or `onPair` (§8.1) |
| 9 | "its one `CSSTransition` ends within `--dur-base`"; "every dot reads `data-asking`" | One transition means the opacity sits on the ROW; four dots each dimming would be four | `data-asking` and the opacity are the row's (`[data-phone-name-dots]`); each dot carries `data-answer` (§5.5.4) |
| 10 | `HELPER_USER_FLOOR` "(`build/assert-electron-teardown.mjs:351`, 156) does not move: no new script reaches `build/electron-run.mjs`" | It is 157 at `:357`. And this spec writes a new probe (§9.3, why), which raises it | 157 → 158. **Phase 326 lands beside this one at 158**: whichever commits second makes it 159, and the committer reconciles |
| 11 | H7 in `probe:p332` | `probe:p332`'s first launch always runs P1/H1 with ONE stand-in (`probe-p332.mjs:937-1015`, P1's body is not behind `ARMS.has`), and H7 needs FOUR at launch. Its arms cannot share that launch | A new `probe:p3321`, one launch per build (§9.3) |
| 12 | P7 "at `333087da`" | The card is byte for byte the same at `75edbf5e` (§ header) | The parent is `75edbf5e` |
| 13 | His checklist "quotes the old line at `:34`, `:157`, `:211` and `:214`" | It quotes it at `:34`, `:58-59`, `:62`, `:148-150`, `:157-159`, `:174` and `:211`; `:214` is the unreadable row, whose words do not move | All of them move (§8.5) |
| 14 | "`2 min · checking again in 40 s`" and "`N min`" | Under a minute, `0 min` says nothing true and `1 min` says something false | Under a minute the elapsed half is left out and the line starts `Checking …`; `Took under a minute` (§5.5.2) |
| 15 | The hover sentence for the quiet line among the sheet's words | It states MAIN's round rule (`roundVerdictOf`); the sheet's header says every sentence of explanation is main's, from the shared contract (`PhoneSection.tsx:29-30`) | `POCKET_NAME_ROUND_RULE` in `src/shared/ipc/pocket.ts`, beside `POCKET_NAME_SENTENCES` (§5.4) |
| 16 | "H1 reads the checking sentence from the block's title" | `probe:p332` reads the card's `innerText` (`probe-p332.mjs:967`), which a title is not part of | `probe-p332.mjs`'s card reader reads the title as well (§9.4) |

---

## 4. The question left to the spec step: does the round rule change?

The entry asked whether "one round with a record and no NXDOMAIN" should become "every server answered the record at
least once in the last N rounds", answered "with the flapping measurement: how often one question got NXDOMAIN, minute
by minute, until the flapping stopped".

**That measurement does not exist and cannot be taken by an agent.** What is recorded is his own, in the running log
of 2026-09-30: the door on at about 14:19, Pair at about 14:26 (7 minutes; the first time, 8); per round, 1 to 3 of the
4 `ts.net` servers answered the record, the same question to the same server a second apart answered the record then
NXDOMAIN, and all four agreed at 14:26. Nothing minute by minute was kept. Taking it again needs a real DNS question
for his name in a loop, which the hard rules forbid, and Tailscale re-publishing his name, which only he can cause.

**The answer: no change.** His own numbers decide it. Through the whole flap, 1 to 3 of 4 servers answered NXDOMAIN in
every round. A phone's resolver that asks one of them at random during that time meets the NXDOMAIN with a chance of
roughly a quarter to three quarters, and keeps it for 300 s (the zone's SOA minimum, `build/p330/SPEC.md` O4), which is
longer than the 3:00 window: the failed first scan Phase 332 exists to stop. "Every server answered once in the last N
rounds" would have confirmed inside the flap. The rule that showed his code at 14:26, the first round no server said
NXDOMAIN, is the one that protects the scan. This phase makes the wait legible instead, which is what he asked for. A
change to when a code shows would be Tier 3 and his own ruling; nothing here needs it, so it is not put to him.

---

## 5. The design, seam by seam

### 5.1 The round hands out its answers — `src/main/pocket/public-name.ts` (builder `main`)

```ts
/**
 * A round as the host reads it (Phase 332.1): the verdict, and each kept
 * server's answer, kinds only, in the order the servers were asked. Empty when
 * nothing was asked (a refused name, a refused override, no servers, a throw).
 */
export interface NameRound extends NameRoundResult {
  readonly answers: readonly NameAnswer[];
}
```

`askNameRound`'s return type becomes `Promise<NameRound>`. Its body changes in exactly five places and nowhere else:

- the three early returns (`:616`, `:619`, `:627`) and the `catch` (`:641`) gain `answers: NO_NAME_ANSWERS`, a
  module-private `const NO_NAME_ANSWERS: readonly NameAnswer[] = Object.freeze([]);`. The refused-override line stays
  one `if` whose condition names `'refused'` and whose return names `'override-unusable'`, which D7 reads
  (`conformance-pocket.mjs:4672`);
- `:639` becomes `return { ...roundVerdictOf(answers), answers: answers.map((a) => a.answer) };`.

`Promise.all` keeps server order, so `answers[i]` is the `i`-th server of `GMUX_POCKET_NAME_SERVERS`, or of the search's
cache. There are at most four by construction (`NAME_SERVERS_MAX`, `:84`; the override takes 1 to 4). The line
`const query = encodeNameQuery(deps.id(), name, 'A', false);` stays byte for byte (ablation `D2a`).

**Nothing else in the file moves.** `encodeNameQuery`, `readNameReply`, `judgeZoneAnswer`, `isPublicV4`,
`roundVerdictOf`, `nextNameStreak`, `findZoneServers`, `nameServersFrom` and the transport are byte for byte; the
integrator proves it with `git diff -U0 75edbf5e -- src/main/pocket/public-name.ts` (§7.4).

### 5.2 The clock

```ts
export interface NameCheckDeps {
  …
  /**
   * Milliseconds on a clock nobody can set (Phase 332.1): read ONLY to tell the
   * sheet how long the check has run and when it asks next. Nothing in the
   * check decides from it (`conformance:pocket` D10). On macOS it counts the
   * Mac's sleep (build/p3321/SPEC.md §3 row 2, measured).
   */
  monotonic(): number;
}
```

`defaultNameCheckDeps` gains `monotonic: () => performance.now(),` on the line after `id: () => randomInt(0, 0x10000),`
(which stays byte for byte). `performance` is Node's global, as `src/main/push/engine.ts:143` uses it, so D1's import
list (`node:dgram`, `node:crypto`, `node:net`) does not move. The module header's "It reads no clock" (`:59-60`)
becomes: "It reads one clock, the monotonic one in `defaultNameCheckDeps`, and only for the sheet's progress; the
deadline is a `setTimeout`, and the schedule is gaps the host sleeps through."

**Why monotonic and not `Date.now`.** A wall clock moves when it is set, by NTP, by hand or by travel, so an elapsed
time read from it can go backwards or jump an hour. D4's original reason stands for every decision the check makes; this
clock makes none, and a monotonic one also draws no nonsense.

**Why not awake time.** There is no awake-time clock in Node on macOS (§3 row 2). A Mac that sleeps through a check
therefore reads, on waking, the time since the check began, the night included: `540 min · checking now`. That is true
of the clock and rare in life (it needs the door left on, the name unconfirmed, and the lid shut), and the round the wake
brings forward pushes a fresh status at once. Inferring awake time from late timers was considered and refused: it is a
rule of its own, for a display nicety, in a phase that adds none.

### 5.3 The host — `PocketHost` in `src/main/pocket/ipc.ts` (builder `main`)

**State.** `NameRun` (`:287-303`) gains:

```ts
  /** When this run began, on the names deps' monotonic clock (Phase 332.1). Read by nameProgressNow alone. */
  readonly startedAt: number;
  /** When the armed timer asks next, or null before the first gap. Read by nameProgressNow alone. */
  nextAt: number | null;
  /** When the run confirmed, or null. Read by nameProgressNow alone. */
  endedAt: number | null;
  /** The last answered round, server order, kinds only. Read by nameProgressNow alone. */
  answers: readonly NameAnswer[];
```

and the host gains, beside `nameRun` (`:407`):

```ts
  /**
   * The run the sheet draws (Phase 332.1): the running one, or the one that
   * just confirmed, until the next run or the door stops publishing. A
   * separate field because a confirmation ends `nameRun`, and `nameCheckNow`
   * reads that end. Read by nameProgressNow alone (D10).
   */
  private nameShown: NameRun | null = null;
```

**Where each is written, and nowhere else** (D10):

| Field | Written in | As |
| --- | --- | --- |
| `startedAt`, `nextAt`, `endedAt`, `answers` (initial) | `beginNameCheck`'s run literal (`:1286-1295`) | `startedAt: this.names.monotonic(), nextAt: null, endedAt: null, answers: []` |
| `nameShown` | `beginNameCheck`, on the line after `this.nameRun = run;` (`:1296`) | `this.nameShown = run;` |
| `nameShown` | `stopNameCheck`, on the line after `this.nameRun = null;` (`:1309`) | `this.nameShown = null;` |
| `nextAt` | `armNameRound`, as its FIRST statement, above the untouched 4-line `armFunnelRestart` block | `run.nextAt = this.names.monotonic() + gapMs;` |
| `answers` | `settleNameRound`, on the line after `run.last = verdict;` (`:1364`), so only an answer that passed the write guard is drawn | `run.answers = round.answers;` |
| `endedAt` | `settleNameRound`'s confirmed branch, on the line before `this.nameRun = null;` (`:1381`) | `run.endedAt = this.names.monotonic();` |

`settleNameRound(run: NameRun, round: NameRound)`, and `nameRoundNow`'s `failed` (`:1329`) becomes
`const failed: NameRound = { verdict: 'unreadable', reason: 'error', answers: [] };`. The import at `:163-173` takes
`type NameAnswer` and `type NameRound` in place of `type NameRoundResult`.

**The field.** One new method, called from ONE place, `status()`:

```ts
  /**
   * What the sheet draws while the Mac's name is checked (Phase 332.1). Null
   * before a run, for a switch-on round (which stays invisible: Pair shows at
   * once over a remembered name), and while the door is not published or the
   * switch is off. After a confirmation the last round stays, frozen, until
   * the next run. DECIDES NOTHING (`conformance:pocket` D10): Pair is
   * `pairable` alone.
   */
  private nameProgressNow(): PocketNameProgress | null {
    const run = this.nameShown;
    if (run === null || run.mode !== 'checking' || !this.published() || this.readStore()?.enabled !== true) return null;
    const now = this.names.monotonic();
    const ended = run.endedAt !== null;
    return {
      answers: [...run.answers],
      asking: !ended && run.inFlight,
      elapsedMs: Math.max(0, Math.round((run.endedAt ?? now) - run.startedAt)),
      nextInMs: ended || run.inFlight || run.nextAt === null ? null : Math.max(0, Math.round(run.nextAt - now))
    };
  }
```

and in `status()`, on the line after `pairable: this.pairable(),` (`:732`): `nameProgress: this.nameProgressNow(),`.
`nameCheck: this.nameCheckNow(),` (`:731`) stays byte for byte (ablation `D4a`). The line `const now =
this.names.monotonic();` must stay unique in the file (ablations `D4f`, `D4i`).

Why each null: `run.mode !== 'checking'` keeps the switch-on round invisible, so a remembered name shows Pair with no
dots, as today; a switch-on round that answers no turns the run to `checking` (`:1369-1374`), and the dots then show
that round. `!this.published()` and the switch read the same two facts `pairable()` reads (`:1438`), so between an off
and its close the field is already null, as `pairable` is already false (the 332 integrator's window).

**The elapsed belongs to a run**, as the streak does (332's "after his ruling", the count belongs to a run). A restart
after an unexpected exit, an off and on, or an Allow begins a new run, and the elapsed starts again from nothing. The
quiet line then omits the minutes until one has passed. Stated, not fixed: carrying it would carry a run across a
counted start, which is 332's rule to keep.

**The pushes.**

1. **A round starts.** The last statement of `nameRoundNow` (after its `void askNameRound(…)` chain):
   ```ts
   // THE ROUND STARTS, told to the sheet (Phase 332.1): the dots breathe once.
   // `announce`, not `changed`: nothing an alert reads has moved.
   if (run.mode === 'checking') this.announce();
   ```
   It is reached only when a round really starts (the two guards above `:1324-1326` return first). The lines
   `run.cancel = null;\n    run.inFlight = true;` stay adjacent (ablation `D4d`).
2. **A round ends.** `settleNameRound`'s last line (`:1393`) becomes:
   ```ts
   if (this.nameCheckNow() !== checkBefore || this.pairable() !== pairableBefore) this.changed();
   else if (run.mode === 'checking') this.announce();
   ```
   A confirmation, an open-anyway and a switch-on `no` move `nameCheck` or `pairable` and keep `changed()`, as today.
   A round that moves neither and belongs to a checking run is announced. A write-guarded answer pushes nothing (it
   returns first).

So a steady check pushes exactly twice a round: at most two a minute once the gaps reach 60 s, six in the first 95 s.
A switch-on round that keeps its confirmation pushes nothing new. Nothing pushes while the door is off.

**The log does not move.** No log call is added. `settleNameRound`'s three lines already sit behind a change of verdict
(`run.last !== verdict`, `:1363`), the confirmation (`step.confirmed`) or a change of `opened` (`!opened`); D5 now holds
that (§8.1). A flapping name of five rounds `[no, no, no, no, yes]` logs `the Mac’s name check read no: nxdomain` once
and `the Mac’s name check read yes: record` once, as today.

**What a push carries that it did not.** Four numbers and booleans and at most four of three words. No name, server,
address, port, packet or reason word (D10).

### 5.4 The contract — `src/shared/ipc/pocket.ts` (builder `main`)

After `PocketNameCheck` (`:390`):

```ts
/** One kept server's answer in the last round of the Mac's name check, kinds only (Phase 332.1). */
export type PocketNameAnswer = 'record' | 'negative' | 'unreadable';

/**
 * The Mac's name check, as the sheet draws it (Phase 332.1, build/p3321/SPEC.md
 * §5.4). DURATIONS, NOT TIMES: main and the renderer are different processes,
 * and a duration crosses without a wall clock. NO FREE TEXT: no name, server,
 * address or reason word reaches the renderer. IT DECIDES NOTHING: Pair follows
 * {@link PocketStatus.pairable} alone (`conformance:pocket` D10).
 */
export interface PocketNameProgress {
  /** The last answered round, one per server in the order they were asked, at most four. Empty until a round answers. */
  answers: readonly PocketNameAnswer[];
  /** A round is being asked now. */
  asking: boolean;
  /** How long this check has run, on main's monotonic clock (the Mac's sleep included); frozen once it confirmed. */
  elapsedMs: number;
  /** Until the next round; null while a round is out, and once it confirmed. */
  nextInMs: number | null;
}
```

`PocketStatus` gains, after `pairable` (`:486`):

```ts
  /**
   * The Mac's name check, drawn (Phase 332.1): its last round, whether one is
   * out, how long it has run and when it asks next. Null before a check, for
   * the one round that re-asks a remembered name, and while the door is not
   * published. The sheet draws it and decides nothing from it.
   */
  nameProgress: PocketNameProgress | null;
```

After `POCKET_NAME_SENTENCES` (`:724-727`, which does not move a byte, because `checking` is the first half of
`beginPairing`'s refusal at `ipc.ts:1642` and `:1656`):

```ts
/**
 * The round rule, said on the hover of the Pair card's quiet line while the
 * name is checked (Phase 332.1). Main's rule (`roundVerdictOf`,
 * src/main/pocket/public-name.ts): a round confirms when a server answered the
 * record and none said the name is missing.
 */
export const POCKET_NAME_ROUND_RULE = 'Pair opens when a round finds your Mac’s name and no server says it is missing.';
```

No channel, no event, no preload member, no `GMUX_*` name, no storage key. `src/preload/pocket.ts` is untouched.

### 5.5 The card — `src/renderer/settings/PhoneSection.tsx` and `phone-section.css` (builder `sheet`)

#### 5.5.1 When the block is drawn

One component, `NameCheck`, drawn in exactly two places:

- **the `naming` face** (`:447-454`), in place of today's one line, whenever `status.nameProgress !== null`. With
  `nameProgress` null (no run; defensive) it draws today's line, `POCKET_NAME_SENTENCES.checking`, unchanged;
- **the `ready` face** (`:456-469`), between the notice and Pair, when `status.nameProgress !== null` and EITHER
  `status.nameCheck === 'unreadable'` (the unreadable sentence takes the moving line's place, checking goes on in the
  quiet line) OR `status.nameCheck === 'confirmed'` and this mount watched the wait. With `nameCheck === 'unreadable'`
  and `nameProgress` null it draws today's `[data-phone-name-unreadable]` line, unchanged.

**"This mount watched the wait"** is one boolean of `PhoneSection`'s state, `nameWatched`: set true when the stage is
`naming` with a non-null `nameProgress`; set false when the stage is `showing` (a code shows) or `start` (the door is
off); gone with the mount. So a later visit to Settings → Phone after the name confirmed shows Pair alone, exactly
today's resting face, and the "live" lines are seen only by someone who watched the wait. It is handed to `PhoneView`
as the prop `nameWatched`.

One pure exported helper decides it, used by `PairCard` and by the tick (§5.5.5):

```ts
export function nameBlockShown(status: PocketStatus | null, stage: PairingStage, watched: boolean): boolean
// naming → nameProgress !== null; ready → nameProgress !== null && (nameCheck === 'unreadable' || (watched && nameCheck === 'confirmed')); else false
```

#### 5.5.2 The words, and who owns each

Drafts for his approval; each is one change if he words it otherwise.

| Where | Words | Owner |
| --- | --- | --- |
| Moving line, before any round answered | `Publishing your Mac’s name` | `NAME_PUBLISHING`, `PhoneSection.tsx` |
| Moving line, after a round | `Publishing your Mac’s name · 3 of 4 see it` | `NAME_PUBLISHING` + `nameSeeing(n, m)` → `${n} of ${m} see it` |
| Moving line, confirmed | `Your Mac’s name is live` | `NAME_LIVE` |
| Moving line, opened without a confirmation | `Tortie could not confirm your Mac’s name, so a first scan may fail.` | `POCKET_NAME_SENTENCES.unreadable`, contract, unchanged |
| Quiet line, a round out | `checking now` | `NAME_CHECKING_NOW` |
| Quiet line, a gap | `checking again in 40 s` (rounded UP to 5 s; 0 or less reads `checking now`) | `nameNextIn(ms)` |
| Quiet line, elapsed | `2 min` (whole minutes, floored; nothing under a minute) | `nameElapsed(ms)` → `string \| null` |
| Quiet line, composed | `[elapsed, next]` joined by ` · ` (U+00B7 between spaces, the house separator), first letter upper-cased: `Checking again in 20 s`, `2 min · checking again in 40 s`, `3 min · checking now` | `nameTimeLine(…)` |
| Quiet line, confirmed | `Took 8 min`; under a minute `Took under a minute` | `nameTook(ms)` |
| Block hover (naming face only) | `Pair opens once your Mac’s name is on the internet, which can take a few minutes.` | `POCKET_NAME_SENTENCES.checking`, contract, unchanged |
| Quiet line hover (while live) | `Pair opens when a round finds your Mac’s name and no server says it is missing.` | `POCKET_NAME_ROUND_RULE`, contract, new |
| Dot hovers | `Sees your Mac’s name` / `Not there yet` / `Did not answer` | `NAME_DOT_WORDS: Record<PocketNameAnswer, string>` |
| Dot row label (`role="img"`) | `3 of 4 name servers see your Mac’s name` | `nameDotsLabel(n, m)` |

Every apostrophe is U+2019, as `CODE_FIRST_NAME` writes it. The words `Copy.swift` quotes (`PHONE_TITLE`, `BTN_PAIR`,
`BTN_TRY_AGAIN`, `CODE_EXPIRED`) do not move a byte (`conformance:phonecopy`).

One composer, pure and exported, reads the status and the age and answers everything the block draws:

```ts
export interface NameCardWords {
  readonly state: 'checking' | 'live' | 'unreadable';
  readonly line: string;          // the moving line
  readonly time: string;          // the quiet line
  readonly answers: readonly PocketNameAnswer[];
  readonly asking: boolean;
}
export function nameCardWords(status: PocketStatus, progress: PocketNameProgress, ageMs: number): NameCardWords
```

`unreadable` when `status.nameCheck === 'unreadable'`; `live` when `status.nameCheck === 'confirmed'` (the quiet line is
`nameTook(progress.elapsedMs)`, the age ignored); otherwise `checking`. While live the elapsed drawn is
`elapsedMs + ageMs` and the gap `nextInMs - ageMs`.

#### 5.5.3 The shape, and why nothing above Pair moves

```html
<div class="phone-name" data-phone-name data-phone-name-state="checking|live|unreadable" title="…naming face only…">
  <div class="phone-name-row">
    <span class="phone-name-dots" data-phone-name-dots data-asking="true|false" role="img" aria-label="3 of 4 …">
      <span class="phone-name-dot" data-answer="record" title="Sees your Mac’s name"></span> … one per answer
    </span>
    <p class="phone-line" data-phone-name-line aria-live="polite" [data-phone-name-unreadable]>…</p>
  </div>
  <p class="phone-name-time" data-phone-name-time title="…while live…">…</p>
</div>
```

- With no answers yet the dot row has no `role`, no label and `aria-hidden="true"`, and keeps its width.
- `data-phone-name-unreadable` sits on the moving line exactly when it holds the unreadable sentence, so
  `probe:p332` H6's reader (`[data-phone-name-unreadable]`, its text and that it precedes Pair) reads it unchanged.
- **The Phase 174.1 rule** (`docs/DESIGN-SPEC.md:832`): each row keeps its height whatever it says (`min-height`), and
  the dot slot is four dots wide before any round has answered, so the moving line never shifts sideways when the first
  dots arrive. The block is the first thing after the notice on BOTH faces, so when Pair appears below it, the dot
  row's and both lines' rectangles are where they were. A moving line long enough to wrap (the unreadable sentence, in
  a sheet narrower than about 480 px) grows by a line; it is never clipped. Stated limit (§12).

#### 5.5.4 The look and the motion (`phone-section.css`)

Appended under a `the Mac’s name check (Phase 332.1)` divider, with the file header's "every measure is a token"
sentence amended to name the dots' 1.5 px ring, the house's hollow-dot ring (`globals.css:304-317`):

```css
.phone-name {
  --phone-name-dots: calc(4 * var(--space-3) + 3 * var(--space-2));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-self: stretch;
}
.phone-name-row { display: flex; align-items: center; gap: var(--space-3); min-height: var(--lh-sm); }
.phone-name-row > .phone-line { flex: 1 1 auto; min-width: 0; }
.phone-name-dots {
  display: inline-flex; flex: 0 0 auto; align-items: center; gap: var(--space-2);
  width: var(--phone-name-dots);
  transition: opacity var(--dur-base) var(--ease-out);
}
/* ONE BREATH A ROUND (DESIGN.md §5): half opacity while a round is out, back when it answers. A state change, never a loop. */
.phone-name-dots[data-asking='true'] { opacity: 0.5; }
.phone-name-dot {
  width: var(--space-3); height: var(--space-3); border-radius: 50%; flex: 0 0 auto;
  background: transparent; box-shadow: inset 0 0 0 1.5px var(--text-muted);
}
.phone-name-dot[data-answer='record'] { background: var(--text-secondary); box-shadow: none; }
.phone-name-time {
  margin: 0 0 0 calc(var(--phone-name-dots) + var(--space-3));
  min-height: var(--lh-xs); font-size: var(--text-xs); line-height: var(--lh-xs);
  color: var(--text-muted); font-variant-numeric: tabular-nums;
}
```

- **The dots** are 6 px, smaller than a session's 8 px `.dot` and never its classes. **Shape carries the state**: filled
  `--text-secondary` when that server's last answer was the record; otherwise the 1.5 px ring of `--text-muted`, for
  `negative` and `unreadable` alike, told apart on hover. No `--status-*` (no amber, which is needs-input; no working
  blue) and no `--accent`.
- **The motion is one breath a round**: the row goes to half opacity over `--dur-base` when a round goes out and back
  when it answers, two state-change transitions on ONE element, and no `@keyframes`, no `animation`, no `infinite`.
  The needs-input pulse stays the one perpetual motion (`DESIGN.md:399`). A round of 70 ms reverses the transition
  part-way, a faint flicker; that is the round, seen. A dot's fill changes instantly with the round's answer.
- **Reduced motion** refuses the transition by the house rule (`tokens.css:696`): the dim lands in one frame.
- **No new token**, so `tokens.css` is untouched and `conformance:hue` is not owed.

#### 5.5.5 The tick, and the age

`PhoneSection` keeps `statusAt`, the renderer's own `performance.now()` when the status it holds arrived, and `mono`, the
same clock at the last tick. Every place that sets the status (the first pull `:746-749`, `onChanged` `:751-755`, and
the six press answers `setDoor`, `confirmDoor`, `allowPhone`, `removePhone`, `setPushAlerts`, `forgetPushKey`) goes
through one `adopt(s)` that sets all three. `PhoneView` gets `nameAgeMs = Math.max(0, mono - statusAt)`.

A `setInterval` of 1 s sets `mono` only while `nameBlockShown(…)` and `status.nameCheck !== 'confirmed'`: no timer while
the block is not drawn or is frozen. Main's every push re-stamps it, so the renderer's clock adds at most the seconds
since the last push (a round is pushed at least once a minute, and the wake's round pushes at once).

#### 5.5.6 What the sheet does NOT read it for

`pairingStage` (`:224-239`), `pairAfterAllowNext` (`:256-266`) and `onPair` (`:915-925`) do not change and never name
`nameProgress` (D10). Pair follows `pairable` alone, and the carried press still asks for the code once on
`pairable`.

### 5.6 What does not change

The phone (`ios/**`; `Copy.pairNameNotYet` and `Copy.pairNameNotFound` already say the right thing, and 316.5, 317 and
318 own `ios/`), `src/preload/pocket.ts`, the menus, `capabilities.ts`, the push seam, the door, the round rule, the
log, and the contract inventory.

---

## 6. Side by side with today (`75edbf5e`)

| Scenario | Today | After this phase | Reading |
| --- | --- | --- | --- |
| Never turns the door on | nothing | nothing: no run, no clock read, no push, `nameProgress` null | same |
| First pairing, name not public yet (his 7 to 8 minutes, flapping) | one sentence that never moves, for minutes | dots per server, the count, the minutes and the next check; Pair at the same moment | **better**, his request |
| Name public, nothing remembered (one round trip) | the checking line for about 0.2 s, then Pair takes its place | the block for about 0.2 s, then `Your Mac’s name is live` / `Took under a minute` with Pair below, on that mount only | same moment; Pair no longer jumps up |
| A remembered name (relaunch, off and on, Allow after Remove) | Pair at once | Pair at once, no dots | same |
| A remembered name that has gone (switch-on round answers no) | Pair, then the checking line replaces it | Pair, then the block (that round's dots) replaces it | same, plus progress |
| A network that blocks DNS, nothing remembered | the checking line for the round's 2 s, then the unreadable line above Pair | the block for 2 s, then the unreadable sentence in the moving line, the dots and `Checking again in 20 s`, Pair below | same moment; one quiet line more above Pair, which says checking goes on |
| A name that answers no for 18 rounds | the checking line 15½ minutes, then the unreadable line and Pair | the block 15½ minutes, then the same with the dots | better |
| A Funnel restart mid-check | the checking line returns | the block returns, its minutes from nothing | same; stated (§5.3) |
| The Mac sleeps mid-check | the line is unchanged | the minutes include the sleep | stated limit (§5.2) |
| Reduced motion | no motion | no motion | same |
| Cost | one push per change of verdict | two pushes a round (at most two a minute), and a 1 s renderer tick only while the live block is drawn | stated |

No row is slower: the round rule does not move, so `pairable` turns true at the same moment at both builds, which
`probe:p3321` measures (P7 against H7, P9 against H9).

---

## 7. Builders, disjoint files, and who owns what is shared

Three builders. Nothing outside a builder's list may be edited by that builder. Where one needs another's interface it
codes against this file's exact names, and the integrator reconciles.

| Builder | Owns |
| --- | --- |
| **main** — the round, the host, the contract | `src/main/pocket/public-name.ts`; `src/main/pocket/ipc.ts`; `src/shared/ipc/pocket.ts`; `src/main/pocket/__tests__/dns-fixtures.ts`; `src/main/pocket/__tests__/public-name.test.ts`; `src/main/pocket/__tests__/ipc.test.ts`; `src/main/pocket/__tests__/switch-queue.test.ts` (only if the fake's new member needs it) |
| **sheet** — the card | `src/renderer/settings/PhoneSection.tsx`; `src/renderer/settings/phone-section.css`; `src/renderer/settings/__tests__/p316-phone-section.test.tsx` |
| **proof** — the stand-in, the probe, the gates, the paper | `build/p332/dns-standin.mjs`; `build/p3321/probe-p3321.mjs` (new); `build/p332/probe-p332.mjs` (the card reader and H1's sample ONLY); `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/assert-electron-teardown.mjs`; `build/verification-checks.mjs`; `package.json`; `CLAUDE.md`; `CHANGELOG.md`; `build/p330/CHECKLIST.md` |

**Shared files, and their one owner.** `package.json`, `build/verification-checks.mjs`,
`build/assert-electron-teardown.mjs`, `CLAUDE.md` and `CHANGELOG.md` belong to **proof**; `main` and `sheet` write
their needs in their hand-off. `src/shared/ipc/pocket.ts` belongs to **main**, which lands it FIRST.
`docs/audits/contract-baseline.txt` belongs to **the integrator**, who expects it not to move (§8.3). This file belongs
to the integrator after this step, who appends "§As built — 332.1". `docs/BACKLOG.md` belongs to no builder.
`ios/**`, `src/preload/**`, `src/main/menu.ts`, `src/main/capabilities.ts`, `src/main/harness/push-seam.ts`,
`src/renderer/styles/tokens.css` and `globals.css`: nobody, this phase.

### 7.1 Builder `main`

0. **Land first**: `PocketNameAnswer`, `PocketNameProgress`, `PocketStatus.nameProgress` and `POCKET_NAME_ROUND_RULE`
   in the contract (§5.4), and `NameRound` and `NameCheckDeps.monotonic` (§5.1, §5.2), because `sheet` and `proof`
   code against them.
1. §5.1 and §5.2 in `public-name.ts`; §5.3 in `ipc.ts`. Keep every `from:` string `build/ablation-p313.mjs` names in
   `public-name.ts` and `ipc.ts` byte for byte (list them with
   `awk '/file: (NAMES|IPC|SHARED),/{getline a; print a}' build/ablation-p313.mjs`); §2 names the four that sit inside
   the code this phase edits. Where one must move, say so in the hand-off and `proof` re-aims the arm.
2. `dns-fixtures.ts`: `fakeNameDeps` gains `monotonic`, a fake clock that starts at 0 and moves only by hand
   (`names.advance(ms)`, and `names.monotonicAt()` to read it), or `options.monotonic` when a test passes its own. The
   header's "reads no clock" becomes "reads only its own hand-moved clock".
3. **`public-name.test.ts`**, run rather than read: four servers answering record, NXDOMAIN, silent and record give
   `answers` `['record', 'negative', 'unreadable', 'record']` in that order and the verdict `no`; the same four
   reordered give the answers reordered and the same verdict; every early return (`bad-name`, `outside-zone`,
   `override-unusable`, `no-servers`, a throw) answers `answers: []`; `defaultNameCheckDeps(…).monotonic()` is finite and
   never decreases over two reads; every existing hostile row still answers its verdict and reason (they stay as they
   are, which is the proof the verdict did not move).
4. **`ipc.test.ts`**, over the fake clock, in a new `describe('the name check, drawn (Phase 332.1)')`:
   - `nameProgress` is null with the door off, before a run, for a switch-on round (with `pairable` true and one held
     question), after an off, and in the window between an off and its close (the integrator's held-queue shape,
     `:1825-2066`);
   - a switch-on round that answers no makes it visible, with that round's answers and `nextInMs` 20,000;
   - a round's start pushes `asking: true` with the last round's answers and `nextInMs: null`; its end pushes the new
     answers in server order (four servers), `asking: false` and `nextInMs` equal to the armed gap; `advance(5_000)`
     reads `nextInMs` 15,000 and `elapsedMs` 5,000 more;
   - **exactly two `pocket:changed` pushes a round** in the steady state, counted in `sent` (`:61`), none in a gap,
     and the alerts' port's `changed` count does not move across a round (`fakePort`, `:2466-2570`);
   - after a confirmation: `asking` false, `nextInMs` null, `elapsedMs` frozen across `advance(60_000)`, the answers
     kept, until the next counted start (off and on: null for its switch-on round);
   - 18 rounds of no: `nameCheck` `unreadable`, `pairable` true, and the progress still moving (`asking`, `nextInMs`
     60,000);
   - a flapping run `[no, no, unreadable, no, yes]` logs `the Mac’s name check read` exactly four times (each change of
     verdict), and no logged line names an answer kind's array, a port or the name;
   - `vi.spyOn(Date, 'now')` moved a day forward and back mid-check moves no `elapsedMs` and no `nextInMs`;
   - `JSON.stringify(status().nameProgress)` has exactly the keys `answers`, `asking`, `elapsedMs`, `nextInMs`, and no
     string but the three answer kinds;
   - the wake (`nameCheckSoon`) pushes `asking: true` once.
5. **Runs, and nothing else:** `npm run -s typecheck`; `node node_modules/vitest/vitest.mjs run src/main/pocket`;
   `node build/conformance-pocket.mjs` read only, once `proof` has landed D10. No Electron.

### 7.2 Builder `sheet`

1. §5.5 whole: `NameCheck`, `nameBlockShown`, `nameCardWords`, the word constants and functions of §5.5.2,
   `nameWatched`, `adopt`, the tick, the props `nameAgeMs` and `nameWatched` on `PhoneViewProps` (the `api === null`
   branch passes `0` and `false`), and the CSS of §5.5.4. The header comment (`:1-34`) says in one line that the naming
   face draws the check's dots; `pairingStage`'s line `return status.pairable ? 'ready' : 'naming';` stays byte for byte
   (ablations `D6b`, `D10c`).
2. **`p316-phone-section.test.tsx`**: the `status()` fixture (`:116-140`) gains `nameProgress: null`, and `draw()` the
   two props. Then:
   - the composers, row by row: `nameNextIn` at 20,000 / 19,999 / 15,001 / 15,000 / 1 / 0 / −5 → 20, 20, 20, 15, 5 s,
     `checking now`, `checking now`; `nameElapsed` at 59,999 / 60,000 / 119,999 / 120,000 → none, `1 min`, `1 min`,
     `2 min`; `nameTook` at 59,999 / 157,000; `nameSeeing(3, 4)`; `nameDotsLabel(3, 4)`; `nameCardWords` for a first
     round out, a round answered, the same 11 s later (`Checking again in 10 s`), 97 s in
     (`1 min · checking again in 60 s`), confirmed (the age ignored), and `unreadable`;
   - `nameBlockShown`'s table, every stage × null/non-null progress × the three `nameCheck`s × watched;
   - drawn: the naming face's block, its `title` the checking sentence and the sentence absent from the visible text,
     four dots with `data-answer` in order, `data-asking`, `role="img"` and its label, `aria-live` on the moving line,
     no Pair; the ready face with `unreadable` and a progress: the unreadable sentence on `[data-phone-name-unreadable]`
     inside the block, before Pair; ready, confirmed and watched: `Your Mac’s name is live` and `Took 2 min` before
     Pair; ready, confirmed and NOT watched: **byte for byte the HTML of the same status with `nameProgress` null**
     (today's resting face); the start face with a progress left over: no block; with no answers yet: the dot row
     `aria-hidden` and no `role`;
   - decisions unmoved: `pairingStage` and `pairAfterAllowNext` answer the same for `nameProgress` null, asking,
     answered and frozen, at every `pairable`;
   - the CSS, read as text: the name block's rules name no `animation`, no `@keyframes`, no `infinite`, no `--status-`
     and no `--accent`; their one `transition` is `opacity var(--dur-base) var(--ease-out)` on `.phone-name-dots`; their
     colours are `--text-secondary` and `--text-muted` alone; and no `className` in `PhoneSection.tsx` names `dot ` or
     `dot-`.
3. **Runs:** `typecheck`; `node node_modules/vitest/vitest.mjs run src/renderer/settings`; `node
   build/conformance-pocket.mjs` read only; `node build/p311/copy-drift.mjs --self-test`. No Electron.

### 7.3 Builder `proof`

1. **`build/p332/dns-standin.mjs` gains a `{ script }` mode**: `setMode({ script: ['record', 'nx', 'silent', …] })`;
   the n-th `A` question for the name since the script was set gets the n-th entry, and past the end the last entry
   repeats; each entry is one of the existing string modes (`hold` included). A question for another name or type is
   answered as `record` mode answers it and does not advance the script. Log rows gain `step` (the entry's index, or
   null). The header lists the mode. `--self-test` gains a row: a three-entry script over four questions answers in
   order and repeats the last, read back by the file's own reader.
2. **`build/p3321/probe-p3321.mjs`** (§9.3), through `build/electron-run.mjs`, with `--grader-self-test`.
3. **`build/p332/probe-p332.mjs`, the card reader only** (§9.4).
4. **`conformance:pocket`**: D4 restated, D5 and D6 widened, D10 new, the header's rule count and a Phase 332.1
   paragraph (§8.1).
5. **`ablation:p313`**: the ten arms of §8.2, each newly red on its own rule; re-aim any arm `main` or `sheet` reports
   moved; the header's count.
6. **The obligations**: `HELPER_USER_FLOOR` 157 → 158 (`build/assert-electron-teardown.mjs:357`), and the commit body
   names `build/p3321/probe-p3321.mjs`; `"probe:p3321": "node build/p3321/probe-p3321.mjs"` in `package.json` beside
   `probe:p332`, classified `electron('probe:p3321')` in `build/verification-checks.mjs` after `:643` with a comment in
   the house shape. **Say in the hand-off that Phase 326 lands beside this phase at 158.**
7. **The paper** (§8.4 to §8.6): `CLAUDE.md`, `CHANGELOG.md`, `build/p330/CHECKLIST.md`.
8. **Runs:** `node build/p332/dns-standin.mjs --self-test`; `node build/p3321/probe-p3321.mjs --grader-self-test`;
   `node build/p332/probe-p332.mjs --grader-self-test`; `node --check` over every script edited;
   `node build/assert-electron-teardown.mjs`; `node build/assert-background-teardown.mjs`;
   `node build/assert-hermetic-checks.mjs`; `node build/verification-checks.mjs`; `node build/conformance-pocket.mjs`;
   and `npm run -s ablation:p313` once `main` and `sheet` are in. No Electron.

### 7.4 The integrator

Reconcile the three against this file's names; run `node build/contract-inventory.mjs --check` and confirm it is
green WITHOUT regenerating (a move is a finding: types are not in the inventory, `build/p332/SPEC.md` §3 row 1); prove
§5.1's "nothing else in the file moves" with `git diff -U0 75edbf5e -- src/main/pocket/public-name.ts` (every hunk is
inside `NameCheckDeps`, the new `NameRound`/`NO_NAME_ANSWERS`, `askNameRound`'s five returns, `defaultNameCheckDeps`
and the header comment); run the duplicated-block scan over `build/p3321/` against `build/p332/` and `build/p330/` and
extract or name each window with its reason, as 332's integrator did; run §9.1's integrator gates; append
"§As built — 332.1" with every file, decision and command.

---

## 8. The gates, clause by clause

### 8.1 `conformance:pocket` (builder `proof`)

Each rule fails as `[p313 D<n>]`. `D_RULES` (`:4013`) gains `'D10'`; `RULES` gains D10's row; `PHASES` gains
`['the progress decides nothing', nameProgressRule, 'D10']`; the header gains a Phase 332.1 paragraph and the count
becomes fifty-three.

- **D4, restated, not deleted.** Every clause it holds today stays. It changes in three places:
  - the quiet list (`:4418`) gains `PocketHost.nameProgressNow`: it names none of `beginNameCheck`, `nameRoundNow`,
    `askNameRound`, `armFunnelRestart` or `exchange`;
  - **the wall clock stays refused**: no name-check method nor `nextNameStreak` names `Date.now`, `new Date`,
    `performance` or a bare `now(` (the regex at `:4453`, unchanged);
  - **the one clock is fenced**: in `ipc.ts`, every call whose callee is `monotonic` is exactly `this.names.monotonic()`
    and sits inside `beginNameCheck`, `armNameRound`, `settleNameRound` or `nameProgressNow`; in `public-name.ts`,
    `performance` is named only inside `defaultNameCheckDeps`, whose `monotonic` property is exactly
    `() => performance.now()`, and `Date.now` and `new Date` appear nowhere in the file (comments blanked).
  The rule's sentence becomes "…the timer is armed through armFunnelRestart alone; no name-check method reads the wall
  clock, and the monotonic one is read in four methods only, for the sheet; and names: is handed to PocketHost only by
  tests".
- **D5, widened.** Its clauses stay. New: every log call inside `settleNameRound` has an enclosing `if` within the
  method whose condition names `last`, `opened` or `confirmed`: a line per change of verdict, of `opened`, or the
  confirmation, and never a line per round.
- **D6, widened.** Its clauses stay, except the last: `PhoneSection.tsx` compares `.nameCheck` only with
  `'unreadable'` or `'confirmed'`, and never inside `pairingStage`, `pairAfterAllowNext` or a live `onPair`.
- **D10, new: the progress decides nothing and carries nothing.**
  1. `src/shared/ipc/pocket.ts` declares `PocketNameAnswer` as exactly the union `'record' | 'negative' | 'unreadable'`;
     `PocketNameProgress` with exactly four property signatures, `answers` (`readonly PocketNameAnswer[]`), `asking`
     (`boolean`), `elapsedMs` (`number`) and `nextInMs` (`number | null`); and `PocketStatus.nameProgress` as
     `PocketNameProgress | null`. No member of either is a `string`.
  2. In `ipc.ts`, a READ of `.startedAt`, `.nextAt`, `.endedAt` or `.answers`, or of `this.nameShown`, occurs only
     inside `nameProgressNow`; a WRITE of each occurs only where §5.3's table puts it (`beginNameCheck`,
     `stopNameCheck`, `armNameRound`, `settleNameRound`). A property access that is the left side of an assignment, or a
     property of `beginNameCheck`'s run literal, is a write. The one exempt read is `round.answers` on the right of
     `settleNameRound`'s `run.answers = round.answers;`, whose object is the `NameRound` parameter, not a run (none of
     these names occurs in `ipc.ts` at this head, so the rule reads names without a type checker).
  3. `nameProgressNow` is called exactly once, in `status()`, as `nameProgress: this.nameProgressNow()`.
  4. In `PhoneSection.tsx`, `pairingStage`, `pairAfterAllowNext` and every live `onPair` name no `nameProgress`.

### 8.2 `ablation:p313` (builder `proof`)

Ten arms, each NEWLY red on its own rule alone in the clone, the tree unmoved by sha256. 143 → 153.

| Arm | Rule | File | The break (`from` → `to`) |
| --- | --- | --- | --- |
| `D4f` | D4 | `IPC` | `    const now = this.names.monotonic();` → `    const now = Date.now();` (the wall clock in `nameProgressNow`) |
| `D4g` | D4 | `IPC` | `    const check = this.nameCheckNow();` → `    const check = this.names.monotonic() < 0 ? 'none' : this.nameCheckNow();` (the clock read in `pairable`) |
| `D4h` | D4 | `NAMES` | `    monotonic: () => performance.now(),` → `    monotonic: () => Date.now(),` |
| `D4i` | D4 | `IPC` | `    const now = this.names.monotonic();` → `    this.nameRoundNow(run);\n    const now = this.names.monotonic();` (the status read starts a round) |
| `D5b` | D5 | `IPC` | `    run.last = verdict;` → `    run.last = verdict;\n    pocketLog.info('the Mac’s name check asked a round');` |
| `D6d` | D6 | `PHONE_SECTION` | `  if (status.pairable) return { phase: 'no', pair: true };` → `  if (status.nameCheck === 'confirmed' \|\| status.pairable) return { phase: 'no', pair: true };` |
| `D10a` | D10 | `SHARED` | `  nextInMs: number \| null;` → `  nextInMs: number \| null;\n  server: string;` |
| `D10b` | D10 | `IPC` | `    if (!pocketDoorStatus().listening \|\| !this.published() \|\| this.readStore()?.enabled !== true) return false;` → the same with `\|\| this.nameShown?.answers.length === 0` before `)` (Pair reads the progress) |
| `D10c` | D10 | `PHONE_SECTION` | `  return status.pairable ? 'ready' : 'naming';` → `  return status.pairable && status.nameProgress?.asking !== true ? 'ready' : 'naming';` |
| `D10d` | D10 | `IPC` | `    if (run === null) return 'none';` → `    if (run === null \|\| run.endedAt !== null) return 'none';` (a stamp decides `nameCheck`) |

`D6d`'s `from` names `pairAfterAllowNext`'s line at `PhoneSection.tsx:262`; `D10c`'s is `pairingStage`'s `:238`, which
`D6b` also edits (arms are independent). Every `from` must occur exactly once in its file after the builders land; the
integrator re-reads them.

### 8.3 `gate:contract`

**No line moves.** `PocketStatus`'s fields and the contract's constants are not in the inventory
(`build/p332/SPEC.md` §3 row 1, and this step's own `--check` at this head). The integrator runs `--check` and does not
regenerate; a move is a finding. The commit body says so.

### 8.4 `CLAUDE.md` (builder `proof`)

- The `conformance:pocket` row (`CLAUDE.md:317`), after its Phase 332 sentence: "Since Phase 332.1 the check is DRAWN
  and decides nothing: `D10` holds `PocketNameProgress` to exactly four members and no string, the name run's stamps
  and `nameShown` read by `nameProgressNow` alone and `nameProgressNow` by `status()` alone, and `pairingStage`,
  `pairAfterAllowNext` and `onPair` naming no `nameProgress`; `D4` still refuses the wall clock and now fences the one
  monotonic clock to four methods, `performance.now()` its one shipping body; `D5` holds every log line in
  `settleNameRound` behind a change of verdict, of `opened` or the confirmation; and `D6` lets the sheet compare
  `nameCheck` with `'confirmed'` too, never in the three Pair functions."
- A new probe row, after `probe:p332`'s (`:351`): `probe:p3321` | `nameProgressNow` and the name run's stamps in
  `src/main/pocket/ipc.ts`, `askNameRound`'s answers in `public-name.ts`, the name block of `PhoneSection.tsx` and its
  rules in `phone-section.css`, or `build/p3321/**` | "about 5 min at HEAD and 4 at a parent, not yet measured; ONE
  Electron per build, one after the other, on a scratch profile, HOME and socket `gmux-p3321-<pid>`; FOUR
  `build/p332/dns-standin.mjs` stand-ins in the probe's own process on 127.0.0.1, each answering a script, named by
  `GMUX_POCKET_NAME_SERVERS`; the Tailscale stand-in behind its preflight and sampler; main's UDP sampled with `lsof`
  every 2 s; the quiet `agents.json` before the launch and `agents:list` read back. Four silent servers (P9/H9), his
  flapping name (2, 1 with one silent, 3, 2, then 4 of 4; P7/H7) and reduced motion (H8): the dots against each round's
  answers re-derived from the stand-ins' logs, the count, the next check rounded up to 5 s, one opacity breath a round
  and no animation, `Took N min`, the rectangles above Pair equal before and after it appears, and Pair at the parent's
  moment. No phone, no agent, no token. `--grader-self-test` grades recorded fixtures and starts nothing;
  `P3321_PARENT_CHECKOUT` reads P9 and P7 at a parent build. Verifiers only, under the lock".

### 8.5 `build/p330/CHECKLIST.md` (builder `proof`)

Every quote of the old sentence moves, in his words for the card:

- `:30-35` ("Until then the **Pair a phone** card says …"): "Until then the **Pair a phone** card shows four small
  dots, one for each of your name's servers, filled as each one sees your Mac's name, beside "Publishing your Mac’s
  name · 2 of 4 see it", and under it how long it has been and when Tortie checks again. There is nothing to press, so
  the first scan should work: no extra actions."
- Row 2 (`:57-63`): "…then "Publishing your Mac’s name" with its dots under **Pair a phone**, the count moving as the
  name's servers see it, then the code on its own…"; its first **Write down** becomes "the counts you saw (for example
  2, 1, 3, 2 of 4), whether anything on the card moved other than the dots, the count and the two times, and the last
  "N min" the card showed before the code appeared. That is how long your Mac's name took to reach the internet,
  measured by Tortie rather than by hand." (A carried press shows the code the moment the name is live, so `Took N
  min` is seen only by someone who did not press Pair first.)
- Rows 11 and 12 (`:145-151`, `:154-160`) and "Three things to know" (`:172-177`): "the card changes to "Pair opens
  once…"" → "the card changes to the dots and "Publishing your Mac’s name""; "if the "Pair opens once…" line came back"
  → "if the dots came back".
- The table row at `:211`: the words `Publishing your Mac’s name`, `N of 4 see it`, `Your Mac’s name is live`,
  `Took N min` → `NAME_PUBLISHING`, `nameSeeing`, `NAME_LIVE`, `nameTook` in `PhoneSection.tsx`; the dots
  `[data-phone-name-dots]`; the checking sentence now on the block's hover; driven by `probe:p3321` H7 and H9 and by
  `probe:p332` H1 (the title).

The real flap over his network is the one proof only his checklist can give (§9.6).

### 8.6 `CHANGELOG.md` (builder `proof`) — one item, his style, no link

The iPhone item under `## Unreleased` (`:12`) gains one clause and no new item, because each commit appears once:
"…which must be awake with Tortie open, the first code shows once your Mac's name is on the internet, which can take
several minutes**, with Settings then Phone showing how far it has got**, and the app is on TestFlight rather than the
App Store (…)". The phase commit adds no link; the follow-up docs commit appends this commit's link after
`333087da`'s. Before the commit, every `- ` line of `## Unreleased` must still match `tortie/commit/`.

---

## 9. The proof, run rather than read

**Tier 2.** CLAUDE.md's questions: he reported it, so Tier 2 at least and the parent measurement is mandatory; it is
a rendered surface WITH new state (one status field and a clock read in main), so not Tier 1. It loses no work, claims
nothing across agents or machines, spawns nothing, holds no credential and sends nothing 332 does not already send
(the name check's packets are byte for byte), so not Tier 3. **Independent methods:** (1) **measure the parent**:
`probe:p3321` at `75edbf5e` and at HEAD, the same scripts, side by side; (2) **re-derive**: the verifier builds its own
expected card from the four stand-ins' raw logs in the probe's kept report, with a composer of its own and never the
shipping one or the probe's grader, and compares it with every recorded DOM sample.

### 9.1 Gates

- **The integrator runs:** `npm run -s typecheck`; `npm run -s build` (which runs `gate:electron` at 158,
  `gate:background`, `gate:checks`, `gate:contract`, `gate:simulator`, `gate:knownhosts` and `conformance:ios`);
  `npx vitest run` once, whole; `conformance:pocket`; `conformance:pocket:hostile` (the paths trigger it; nothing it
  drives moves); `ablation:p313`; `conformance:phonecopy` (`Copy.swift` quotes `PhoneSection.tsx`);
  the self-tests of §7.3 item 8; raw control bytes and trailing whitespace over every touched file, and
  `git diff --check`. `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` is the main session's.
- **The verifiers run:** `smoke:t1`, `smoke` and `smoke:t3`; `probe:p3321` at the parent and at HEAD; `probe:p332`
  `P332_ARMS=H0,P1` at HEAD (the title reader, §9.4). **No `ios/` file changes, so `test:ios` is not owed;
  `conformance:hue` is not owed (no token moves); `conformance:push` is not owed (no push path moves).**

### 9.2 Vitest

§7.1 items 3 and 4, §7.2 item 2. Baseline at this head (run by this step): the three touched files, 198 tests, green.

### 9.3 `probe:p3321` — the parent measurement and the app run (builder `proof` writes it; verifiers run it under THE LOCK)

**Why a new probe.** `probe:p332`'s first launch always runs P1/H1 with one stand-in and a carried press, and its arms
grade one question per round; these arms need four stand-ins from the launch and no carried press. A new file, one
launch per build, is the smaller and safer change (Tier 2: one app run per build drives every claim). It raises the
floor (§3 row 10).

**The world.** `RUN=/private/tmp/p3321-probe-<pid>` with `home/`, `harness/profile/`, `project/`, `standin/`; the tmux
socket `gmux-p3321-<pid>` (never `gmux`); `GMUX_CONFIG_ROOT` under the profile; `--use-mock-keychain`;
`GMUX_PROBES=1`, `GMUX_LOG_FILE=1`; every inherited `CLAUDE*` variable stripped, as `probe-p332.mjs` does.
`writeQuietAgents(PROFILE)` before the launch and `quietAgentsHeld(agents:list)` after it, refusing to go on otherwise.
Tailscale is `makeStandin` behind `preflightStandin` and `watchForRealTailscale`, exactly as `probe:p332`. **FOUR DNS
stand-ins**, `makeDnsStandin({ name: NAME, mode: { script: ['silent'] } })` ×4 in the probe's own process on
`127.0.0.1`, `GMUX_POCKET_NAME_SERVERS` their `servers` joined by `,` in a fixed order A, B, C, D; before the launch each
preflights its own value, and the joined value must pass `loopbackOnlyServers` and equal the four joined. **The UDP
sampler** reads `lsof -a -p <main pid> -iUDP -n -P` every 2 s: any peer that is not `127.0.0.1` fails the run and ends
the app. No phone: nothing is paired. Every stand-in pid is ended by pid and the four DNS stand-ins are closed in the
`finally`; the launch goes through `withElectron`.

**Driving.** `attachMain`, `attachSettings` (Settings → Phone), the bridge's `pocket.setDoor`, the sheet's Allow
(`[data-phone-action="confirm-door"]`) when the lines are ready, as `probe-p332.mjs:765-790` does. Never a press of
Pair: no carried press, so the ready face is read, not the code. On the Settings target the probe installs ONE
recorder before the first arm: capture listeners on `document` for `transitionrun`, `transitionend`,
`transitioncancel`, `animationstart` and `animationend`, each event kept as
`{ type, property, animationName, target: 'dots' | <class>, t }`. It reads the card every 100 ms while a round is out
and every 250 ms otherwise:

```js
// one cdpEval: the stage; the card's innerText; the block's title and data-phone-name-state; each dot's data-answer in
// order; the row's data-asking, aria-label, aria-hidden, computed opacity and transitionDuration; the moving line's
// text and whether it carries data-phone-name-unreadable; the quiet line's text and title; the rectangles (x, y, width,
// height) of the dot row, the moving line, the quiet line and Pair; whether the block precedes Pair; the card's
// getAnimations({ subtree: true }) as [kind, property or name]; --dur-base read from :root.
```

**The arms, in this order, in ONE launch per build.** `P3321_ARMS` picks; the parent runs `P9,P7`, HEAD runs
`H9,H7,H8`. The same scripts run at both builds; only the grading differs.

1. **P9 / H9 — four silent servers, nothing remembered** (a network that blocks DNS). Before the switch, 5 s idle with
   the sheet open: the four stand-ins logged nothing. All four `{ script: ['silent'] }`. `setDoor on`, Allow, wait for
   `listening` and read until `pairable`, then 12 s more.
   - **P9 (parent) graded:** the first round reached all four, each silent; `pairable` within 3 s of `listening`; until
     then the card's text was one sentence, the checking sentence, and no Pair; after, the unreadable line above Pair;
     the line's rectangle before equals the unreadable line's after.
   - **H9 (HEAD) graded:** the same stand-in clauses; `pairable` within 3 s of `listening`, and within 1 s of the
     parent's delay when the parent reading exists; before Pair: the naming face's block, `title` the checking
     sentence, no dots, the row `aria-hidden`, the moving line `Publishing your Mac’s name`, the quiet line `Checking
     now`, no Pair; after: four dots `unreadable`, the moving line the unreadable sentence carrying
     `data-phone-name-unreadable`, `data-phone-name-state="unreadable"`, the block before Pair; **the dot row's and both
     lines' rectangles equal before and after Pair appears** (within 0.5 px); the quiet line `Checking again in 20 s`
     within 1 s of the round's end and **`Checking again in 10 s` 11 s later (the renderer's tick)**.
   Then `setDoor off`, wait for `off`.
2. **P7 / H7 — his flapping name.** Scripts, in server order A, B, C, D (record = R, NXDOMAIN = N, silent = S):

   | Round | A | B | C | D | Sees it | Verdict | Starts at (from the first) |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | 1 | R | N | R | N | 2 of 4 | no | 0 s |
   | 2 | N | S | R | N | 1 of 4, one silent | no | 20 s (ends at 22 s, the deadline) |
   | 3 | R | R | N | R | 3 of 4 | no | 52 s |
   | 4 | N | R | R | N | 2 of 4 | no | 97 s |
   | 5 | R | R | R | R | 4 of 4 | yes, confirmed | 157 s |

   A is `['record','nx','record','nx','record']`, B `['nx','silent','record','record','record']`, C
   `['record','record','nx','record','record']`, D `['nx','nx','record','nx','record']`. Every server flaps, and every
   round of the flap holds 1 to 3 records, his measurement. `setDoor on` (the agreement survives the off), wait for
   `listening`, read until 10 s after `pairable`.
   - **Both builds:** five rounds, each reaching all four stand-ins, every question `A`, RD 0, for the name
     (`nameQuestionProblems`); round starts 0, 20, 52, 97 and 157 s (each within 1 s); `pairable` within 1 s of round
     five's end.
   - **P7 (parent) graded:** until `pairable`, every sample of the card's text is the one checking sentence (one
     distinct text), and no Pair. **His complaint, measured.**
   - **H7 (HEAD) graded**, against expectations the grader re-derives from the four stand-ins' logs with its own
     spelling of the words (it reads no composer of the tree): at each round's end (the first sample after it), the
     dots equal that round's answers in server order (R → `record`, N → `negative`, S → `unreadable`), the row's label
     `N of 4 name servers see your Mac’s name`, and the moving line `Publishing your Mac’s name · N of 4 see it`; the
     quiet line `Checking again in 20 s`, `… 30 s`, `… 45 s` after rounds 1 to 3 and `1 min · checking again in 60 s`
     after round 4; **while round two waited out its silent server, every sample read `data-asking="true"`, round
     one's dots, `Checking now`, and the row's computed opacity reached 0.5**; across H7 the recorder holds no
     `animationstart`, every `transitionrun` in the card is `opacity` on the dot row, the row's
     `transitionDuration` equals `--dur-base`, and `getAnimations` sampled 500 ms into round two is empty; after round
     five, within 1 s: `data-phone-name-state="live"`, `Your Mac’s name is live`, `Took 2 min` (re-derived:
     `floor((round five's end − round one's start) / 60 s)`), four `record` dots, Pair below the block; the block's
     rectangles after round four equal those after Pair appears; `pairable` within 1 s of the parent's moment when the
     parent reading exists (**no slower**); and `app.log`, sliced from H7's start, holds exactly two
     `the Mac’s name check read` lines, `no: nxdomain` then `yes: record`, the changes of verdict re-derived from the
     logs, and no line naming a stand-in port, the name or the address.
3. **H8 (HEAD) — reduced motion.** `Emulation.setEmulatedMedia` on the Settings target with
   `prefers-reduced-motion: reduce`, as `build/p240/save-choice.mjs:316` does; `matchMedia` must then match; the
   recorder's list is cleared. `setDoor off`, then scripts A `['nx','silent']`, B, C, D `['nx','record']`, then
   `setDoor on`: the switch-on round over the kept confirmation answers no, the block appears (`0 of 4`), and 20 s later
   round two holds A for its 2 s deadline and confirms on the other three. Graded: the block appeared after the
   switch-on round; during round two the row's computed opacity read 0.5 in the first sample after its push; across H8
   the recorder holds no `transitionrun` and no `animationstart`, and every `getAnimations` sample is empty; `live`
   after round two.
4. **RUN, both builds:** the Tailscale preflight and the four DNS preflights passed; the quiet agents held; no real
   Tailscale sampled and no forbidden argv at the stand-in; the UDP sampler saw no peer but `127.0.0.1`; `app.log`
   holds neither the stand-in's name nor `203.0.113.10`; every question any stand-in logged was `A`, RD 0, for the name;
   every stand-in pid ended and the four DNS stand-ins closed.

**The report.** `out/p3321/probe-p3321-<parent|head>.json` holds every arm's grade, every raw card sample with its time,
the recorder's events, the four stand-ins' full logs and the `app.log` slice, so a verifier can re-derive without the
grader. The HEAD run reads the parent's file and prints P9 beside H9 and P7 beside H7: `pairable`'s delay, the
distinct card texts, and what the card held at each round. `P3321_PARENT_CHECKOUT=<a built checkout at 75edbf5e>`
runs the parent; `P3321_KEEP=1` keeps the scratch world; `--grader-self-test` grades recorded fixtures through
`gradeFixtures` (`build/probe-graders.mjs`), every clause shown red on its own break, and starts nothing. Exit 0 all
passed, 1 an arm failed, 2 could not run or could not read an arm, which is never a pass. It refuses (exit 2) when the
checkout has no build. Expected cost: about 4 minutes at the parent and 5 at HEAD, not yet measured.

**The verifier's parent build.** `git worktree add --detach /private/tmp/wt-p3321-parent 75edbf5e`, `cp -Rc
node_modules` and `cp -Rc build/vendor` from this worktree, `npm run -s build` there, then from HEAD:
`P3321_PARENT_CHECKOUT=/private/tmp/wt-p3321-parent npm run -s probe:p3321`, then `npm run -s probe:p3321`. Remove the
parent worktree afterwards with `git worktree remove`.

### 9.4 `probe:p332`'s card reader (builder `proof`)

At HEAD the naming face's visible text no longer holds the checking sentence; its block's `title` does. `card()`
(`probe-p332.mjs:749-756`) also reads `[data-phone-name]`'s `title` as `nameTitle`, and H1's sample (at `:967`) becomes
`checking: c.text.includes(WORDS.checking) || c.nameTitle === WORDS.checking`, which reads the parent's text and HEAD's
title alike. Nothing else in the file moves; its `--grader-self-test` stays 9 graders and 64 clauses.

### 9.5 The independent methods (the verifiers)

**Method 1, measure the parent.** §9.3 at `75edbf5e` and at HEAD, the side-by-side of §6 filled with the numbers:
`pairable`'s delay in P9/H9 and its moment in P7/H7 (equal within 1 s, or the phase regresses), and what the card held
at each round.

**Method 2, re-derive.** In the verifier's own scratch script, never the probe's grader: read the kept HEAD report's
four stand-in logs, group the questions into rounds by time, map each answer to a dot, compose the expected moving
line, quiet line (from the round ends and the schedule) and dot row with the verifier's OWN composer, and compare with
EVERY recorded sample, not only the ones the grader picks. Then ATTACK the shape: a stand-in log whose round two A is
answered after the app's deadline, and a sample taken in the 100 ms after a push, are the places a composer and the
drawn card can disagree; say whether they did.

### 9.6 His checklist

§8.5's rows are the only proof over his network against dnsimple's real anycast: what the dots did while the name
flapped, whether anything else on the card moved, and the minutes it read when the code appeared.

---

## 10. Constants

| Name | Value | Where | Source |
| --- | --- | --- | --- |
| The dot | 6 px (`--space-3`), the ring 1.5 px | `phone-section.css` | the entry; `globals.css:304-317`'s hollow dot |
| The dot slot | four dots: `4 × --space-3 + 3 × --space-2` (36 px) | `phone-section.css` | `NAME_SERVERS_MAX` 4, `public-name.ts:84` |
| The breath | opacity 0.5 over `--dur-base` (160 ms), `--ease-out` | `phone-section.css` | DESIGN.md §5 |
| The tick | 1 s | `PhoneSection.tsx` | the code countdown's interval, `:776` |
| The next check's rounding | up to 5 s | `nameNextIn` | the entry |
| The elapsed | whole minutes, floored; nothing under one | `nameElapsed` | §3 row 14 |
| The pushes | two a round | `ipc.ts` | §5.3 |
| `HELPER_USER_FLOOR` | 157 → 158 (159 if Phase 326 lands first) | `build/assert-electron-teardown.mjs:357` | §3 row 10 |
| `conformance:pocket` | 52 → 53 rules | `build/conformance-pocket.mjs` | §8.1 |
| `ablation:p313` | 143 → 153 arms | `build/ablation-p313.mjs` | §8.2 |
| The H7 script | §9.3's table | `build/p3321/probe-p3321.mjs` | the running log, 2026-09-30 |

---

## 11. What is NOT in this phase

- **No change to when a code shows.** The round rule, the gaps, `NAME_CONFIRM_YES_ROUNDS`, `NAME_UNREADABLE_ROUNDS`,
  `NAME_OPEN_AFTER_ROUNDS`, the 3:00 window and `pairable` stay (§4).
- **No phone change, no TestFlight build, no `test:ios`.**
- **No server name, address, port, reason word, packet or round count on the renderer.** His public name shows only
  where the switch line already shows it.
- **No new log line, channel, event, preload member, storage key or `GMUX_*` name.** The contract inventory does not
  move.
- **No new token, no keyframes, no looping animation, no amber and no accent.**
- **No notification, sound, badge or menu-bar mark** when the name goes live.
- **No awake-time clock**, no inference of sleep from late timers, and no elapsed carried across a counted start.
- **No change to `nameCheckSoon`**, though on this Node a timer already counts the sleep (§3 row 3).
- **No menu change and no release.** Phases 311 onward stay unreleased.

---

## 12. Open concerns handed to the verifiers

1. **The sleep is counted.** Main's elapsed includes a sleep during the check (§3 row 2, measured with Node alone).
   Whether Chromium's `performance.now()` in the Settings renderer counts sleep was not measured; it adds at most the
   seconds between pushes. Nobody here may sleep his Mac to see it.
2. **A moving line that wraps.** At a Settings width under about 480 px the unreadable sentence wraps and the quiet
   line moves down one line when it replaces `Publishing your Mac’s name`. The probe measures at the app's default
   window width; say what width it was.
3. **The faint flicker.** A round answered in under `--dur-base` reverses the dim part-way. Say whether a round of the
   stand-in's speed (a few ms) shows a `transitioncancel` and whether anything else transitions.
4. **The frozen block is per mount.** A person who closes and reopens Settings while the name is still being checked
   sees the block again (the mount watches the naming face); after it confirmed, a reopened sheet shows Pair alone. Say
   whether either reads as a regression against today's face.
5. **Two pushes a round.** Each push also makes the renderer read `pocket:pairingState` (`PhoneSection.tsx:753`). Count
   the pushes and the reads over H7 and say whether either is more than §5.3 says.
6. **Phase 326 and the floor**, and **Phase 333.2** (`SCAN_LINE` and the alerts group in `PhoneSection.tsx`):
   whichever lands second rebases; the functions do not overlap.

---

## §As built — 332.1

Written by the integrator on 2026-10-01 in `/private/tmp/wt-p3321` at `75edbf5e`, over the three builders' tree.
Nothing was committed, staged or stashed. No Electron was launched, nothing was installed, and no DNS packet left
127.0.0.1. The integrator edited ONE file, this one: the builders' tree reconciled without a source edit.

### The files

| Builder | File | What |
| --- | --- | --- |
| main | `src/shared/ipc/pocket.ts` (+36) | `PocketNameAnswer`, `PocketNameProgress` (exactly `answers`, `asking`, `elapsedMs`, `nextInMs`), `PocketStatus.nameProgress` after `pairable`, `POCKET_NAME_ROUND_RULE` after `POCKET_NAME_SENTENCES`, which did not move a byte. Landed first. |
| main | `src/main/pocket/public-name.ts` (+30 −8) | `NameRound`, `NO_NAME_ANSWERS`, `askNameRound`'s five returns, `NameCheckDeps.monotonic()`, `monotonic: () => performance.now(),` after the `id:` line, the header's clock sentence (§5.1, §5.2). |
| main | `src/main/pocket/ipc.ts` (+64 −7) | `NameRun`'s four stamps, `nameShown`, `nameProgressNow` called from `status()` alone, the round-start push at the end of `nameRoundNow`, the round-end `else if` after `changed()`, `failed` a `NameRound`; the module header now says the check "decides nothing from a clock" (§5.3). |
| main | `src/main/pocket/__tests__/dns-fixtures.ts`, `public-name.test.ts`, `ipc.test.ts` | The hand-moved clock (`advance`, `monotonicAt`, and `monotonicReads`, which §7.1 did not ask for); 9 new `public-name` tests and 17 under `the name check, drawn (Phase 332.1)`. `switch-queue.test.ts` did not need to move. |
| sheet | `src/renderer/settings/PhoneSection.tsx` (+262 −16) | §5.5 whole: the four labels and `NAME_DOT_WORDS`, the composers, `NameCardWords`/`nameCardWords`, `nameBlockShown`, two pure exports the spec did not name (`nameWatchedNext`, `nameTicking`), `NameCheck`, the block on the naming and ready faces, `adopt` as the one status setter, `nameWatched`, the 1 s tick, the two props. |
| sheet | `src/renderer/settings/phone-section.css` (+72) | §5.5.4, plus `height: var(--space-3)` on `.phone-name-dots` (below). Tokens only. |
| sheet | `src/renderer/settings/__tests__/p316-phone-section.test.tsx` (+524) | 29 new tests (48 to 77). |
| proof | `build/p332/dns-standin.mjs` (+83 −10) | The `{ script }` mode, `step` on every log row, 9 self-test rows. |
| proof | `build/p3321/probe-p3321.mjs` (new, 1,548 lines) | §9.3. |
| proof | `build/p332/probe-p332.mjs` (+3 −3) | `card()` reads the block's title as `nameTitle`; H1's sample reads either. Nothing else. |
| proof | `build/conformance-pocket.mjs` (+307 −11) | 53 rules: D4 restated with the clock fence, D5 and D6 widened, D10 new. |
| proof | `build/ablation-p313.mjs` (+112 −2) | The ten arms of §8.2, 153 in all. |
| proof | `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 157 → 158. |
| proof | `package.json`, `build/verification-checks.mjs`, `CLAUDE.md`, `CHANGELOG.md`, `build/p330/CHECKLIST.md` | `probe:p3321`, its classification, the `conformance:pocket` sentence and the probe row, one CHANGELOG clause with no link, every checklist quote of the old sentence. |
| integrator | `build/p3321/SPEC.md` | This section. |

`docs/audits/contract-baseline.txt` was NOT regenerated: `contract-inventory --check` is green byte for byte (§8.3).

### The seams, read from both sides

- **`public-name.ts` moved only where §7.4 allows.** `git diff -U0 75edbf5e -- src/main/pocket/public-name.ts` has
  nine hunks: the header comment, `NameCheckDeps.monotonic`, `NameRound` and `NO_NAME_ANSWERS`, `askNameRound`'s
  return type, its three early returns, its last line and its `catch`, and the one line in `defaultNameCheckDeps`.
  `roundVerdictOf`, `nextNameStreak`, the parser, the transport and the search are untouched.
- **The contract and its three readers.** `ipc.ts` returns `PocketNameProgress` from `nameProgressNow` (its
  `NameAnswer[]` is the same three-word union as `PocketNameAnswer`). The sheet imports the two types and
  `POCKET_NAME_ROUND_RULE`. The probe and `conformance:pocket` D10 name the same four fields.
- **The words.** The probe spells its own words (it reads no composer of the tree). Byte for byte they are the
  sheet's: `Publishing your Mac’s name`, `Your Mac’s name is live`, `… name servers see your Mac’s name`, `Took under a
  minute`, `checking now`, `checking again in`, the ` · ` separator, and the contract's two sentences and round rule,
  every apostrophe U+2019.
- **The DOM.** Every selector the probe reads exists in `NameCheck` as §5.5.3 draws it: `[data-phone-name]`,
  `data-phone-name-state`, `[data-phone-name-dots]` with `data-asking`, `role` and `aria-label`/`aria-hidden`,
  `[data-answer]` with its `title`, `[data-phone-name-line]` with `aria-live` and `data-phone-name-unreadable`,
  `[data-phone-name-time]` with its `title`. `probe:p332`'s `[data-phone-name-unreadable]` reader still finds the
  unreadable line inside the block.
- **The stand-in's script.** `setMode({ script })` is what the probe calls with `SILENT_SCRIPTS`, `H7_SCRIPTS` and
  `H8_SCRIPTS`; the log rows the probe's `roundsOf` reads carry `answered` as the script mode writes it.
- **The ablation arms.** All 153 arms' `from` strings were re-read against the tree
  (`scratchpad/p3321/integrator/froms.mjs`): 151 occur exactly once. `D6a` (`ipc.ts`) and `T1`
  (`build/p313/hostile-client.mts`) occur twice, and both did so at `75edbf5e` (the harness replaces the first, so
  neither moved). The 53 arms on the four source files this phase edits all find their strings, including the ten
  new ones and `D2a`'s question line.

### Re-derived by the integrator, at the parent and at HEAD (`scratchpad/p3321/integrator/diff/`)

**The rule did not move: one scripted world through both builds' `PocketHost`.** One test block, written only
against helpers the parent's `ipc.test.ts` already had, was appended to a `cp -Rc` clone of HEAD's tree and to a
`git archive 75edbf5e` clone, and run in each. It drives 43 steps over four servers: his flap; an unreadable round
opening Pair, a no closing it, an error round opening it again; the record; a wake mid-gap; an off and on whose
switch-on round keeps the name; an off and on whose switch-on round loses it; 22 rounds of no past the 18-round rule;
the record; a fresh run; and a round held out across an off. At every step it records the status projection that
decides something (`state`, `nameCheck`, `pairable`), every question (server, name, type, RD), every gap the check
sleeps, and every log line.

**0 differences** across 43 steps, 144 questions and 23 log lines, and the collapsed sequence of pushed projections
(23) is the same at both builds. HEAD pushed 102 statuses where the parent pushed 44. In the steady state exactly 2
per round, so 2 a minute once the gaps reach 60 s; 11 against 9 over the counted start (the double push main's
finding 4 names); none in a gap; the same count as the parent on every off, on and switch-on step (2, 6, 7), so a
switch-on round adds nothing; and no `nameProgress` on any parent push. `nameProgress` was null on every push of a
switch-on round, an off and a door not published.

**The sheet draws nothing new where it should not: every status HEAD pushed, drawn by both builds' `PhoneView`.**
Each of the 102 pushed statuses was rendered by HEAD's and by the parent's `PhoneView` with `nameWatched` false and
true and `nameAgeMs` 0 and 11 s: 408 renders.

- 136 are byte for byte the parent's, among them all 132 whose status carried `nameProgress: null` (the switch-on
  rounds, the offs, before a run) and the ready face confirmed with nobody watching.
- 272 differ, and every one is where §5.5.1 owes the block: the naming face (204), the ready face with `unreadable`
  (64), and the ready face confirmed with `nameWatched` true (4).
- In every one of the 272, the markup outside the Pair card (the element carrying `data-phone-stage`) is the
  parent's byte for byte.
- The stage is the parent's in 408 of 408, and Pair is drawn exactly where the parent draws it in 408 of 408.

### The duplicated-block scan (`scratchpad/p3321/integrator/dupscan.mjs`, 332's scan re-aimed)

Every 10-line window (whitespace normalised, comment-only and brace-only lines dropped, under 300 characters
skipped) across `src/` and `build/`, reported where one occurrence touches a line this phase added: **54 windows**.
All lie in `build/p3321/probe-p3321.mjs` against `build/p332/probe-p332.mjs` (and 13 of them also against
`build/p330/probe-p330.mjs`), in four groups of the probe scaffolding: the `arm`/`cannotRead` report helpers
(`:913-926`), the UDP sampler with `stopIfLeaked`, `sleep` and `waitFor` (`:952-972`), the attach and bridge
helpers `devtoolsPort`, `targets`, `attachMain`, `attachSettings`, `pocket`, `status` and `waitStatus`
(`:994-1066`), and the launch body inside `withElectron` (`:1261-1278`). None is in `src/`.

**Named, not extracted.** §9.4 binds `probe-p332.mjs` to "nothing else in the file moves" beyond `card()` and H1's
sample, and an extraction must move those blocks out of it; and as 332's integrator ruled, changing how a probe
drives the app when nobody in this round may launch it is a risk the scan does not earn. The p3321 copies are now
byte for byte p332's (the scan matches them exactly), so a later round extracts them as one mechanical move into a
module beside `build/probe-graders.mjs`, with both probes run live in that round.

### Commands, run by the integrator

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | about 2 s (`tsc -b` incremental); import boundaries 82 fixtures and 0 violations, 0 runtime cycles, shared types OK |
| `node node_modules/vitest/vitest.mjs run src/main/pocket src/renderer/settings src/shared src/main/harness/__tests__/push-seam.test.ts` | 0 | 73 files, 1,718 tests, 6.2 s |
| `node node_modules/vitest/vitest.mjs run` (whole, once) | 0 | 1,024 files passed, 1 skipped; 17,882 tests passed, 7 skipped; 72 s |
| `node build/conformance-pocket.mjs` | 0 | PASS, 53 rules, 12,422 checks, 2.29 s |
| `node build/p313/hostile-client.mjs` (`conformance:pocket:hostile`) | 0 | PASS, 96 arms, 0.49 s |
| `npm run -s ablation:p313` | 0 | PASS, 153 of 153 arms each newly red on the rule that owns it, the ten new ones (`D4f` to `D4i`, `D5b`, `D6d`, `D10a` to `D10d`) red on their own rule alone; base 0 red; worktree never written; clone removed; 531 s (under a load average of 8 to 16 from other work) |
| `node build/p311/copy-drift.mjs --self-test`, then plain (`conformance:phonecopy`) | 0, 0 | `phonecopy OK` both |
| `node build/contract-inventory.mjs --check` (`gate:contract`) | 0 | byte for byte; NOT regenerated, no line moved |
| `node build/assert-hermetic-checks.mjs` (`gate:checks`) | 0 | 244 check scripts classified |
| `node build/assert-electron-teardown.mjs` (`gate:electron`) | 0 | 158 helper users against the floor of 158 |
| `node build/assert-background-teardown.mjs` (`gate:background`) | 0 | 19 of 19 fixtures; 4 starters, each ended in a `finally` |
| `node build/verification-checks.mjs` | 0 | a module, read by the hermetic gate; prints nothing |
| `node build/p332/dns-standin.mjs --self-test` | 0 | 61 checks |
| `--grader-self-test` of `probe-p3321`, `probe-p332`, `probe-p330` | 0 each | 6 graders and 54 clauses; 9 and 64 (unchanged); 14 and 103 |
| `node --check` over the seven edited or new scripts | 0 | |
| `git diff --check 75edbf5e`; control bytes, CR and trailing whitespace over all 21 touched files | 0 | none |
| `scratchpad/p3321/integrator/froms.mjs` | 0 | 153 arms; 151 `from` strings once; `D6a` and `T1` twice, as at `75edbf5e` |
| `scratchpad/p3321/integrator/dupscan.mjs` | 0 | 54 windows, all probe scaffolding (above) |
| `scratchpad/p3321/integrator/diff/run.sh`, then `compare.mjs`, `compare-render.mjs`, `compare-region.mjs` | 0 each | 43 steps, 144 questions, 23 log lines, 0 differences; 102 pushes against 44; 408 renders, 136 identical, 272 owed, 0 outside the card, Pair alike 408 of 408 |
| `npm run -s build` (once, last) | 0 | 50 s; `gate:electron` 158 of 158, `gate:background` 19 of 19, `gate:simulator`, `gate:knownhosts`, `gate:checks` 244, `conformance:ios` 22 rules, `gate:contract` byte for byte |

**Not run by the integrator.** `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` (the main session's), and every
live run: `smoke:t1`, `smoke`, `smoke:t3`, `probe:p3321` at the parent and at HEAD, and `probe:p332`
`P332_ARMS=H0,P1`. Those are the verifiers', under the lock.

### Where the entry and this spec were wrong or loose, found while building

1. **§7.1 item 3, "the existing rows stay as they are", cannot hold.** 30 assertions compared `askNameRound`'s
   result with `.toEqual({ verdict, reason })`, and a result that carries `answers` fails them (21 tests went red).
   main changed `.toEqual(` to `.toMatchObject(` on exactly those 30 lines and moved no expected value; the
   `roundVerdictOf` rows stay `.toEqual`, which is what proves that function's shape did not move (main).
2. **§5.5.4's CSS gives the empty dot row no height.** An empty flex item centred in its row is 0 px high, so the
   first dots would move its rectangle by 3 px and H9's "the dot row's rectangle equal before and after Pair" would
   fail on the first round. `height: var(--space-3)` was added, with a test pin and an ablation arm. Reasoned from
   the flexbox rules, not measured; H9 measures it (sheet).
3. **`asking: !ended && run.inFlight`'s `!ended &&` cannot be reached.** A confirmed run is no longer `nameRun`, so
   no round is asked of it again, and `settleNameRound` clears `inFlight` before it stamps `endedAt`. Kept as written;
   no test can see it, which is why main's 35th ablation stays green (main).
4. **The first round of a checking run is pushed twice with the same status**: `nameRoundNow` announces, then
   `openNow`'s own `changed()` follows. Only at a counted start (11 pushes against the parent's 9, measured above)
   (main).
5. **§7.4 asks to extract duplicated blocks; §9.4 forbids the move.** Named instead (above).
6. **D6 is older than this phase and still has a gap**: `const { nameCheck } = status` would pass it. D10 does catch
   a destructured `nameProgress` (proof).
7. **"Quiet line hover (while live)"** was read as "while the check runs", meaning the checking and unreadable
   states, as §5.5.5 and the contract's comment say; the frozen `Took N min` line has no title (sheet).

### The open concerns handed to the verifiers

1. **Pair at the parent's moment, measured live.** The differential holds the rule step for step in the host; only
   `probe:p3321` P7 against H7 and P9 against H9 hold it in the running app. That is the side-by-side his rule asks
   for, and nothing here replaces it.
2. **The dot row's height, the wrap, and the rectangles above Pair.** Item 2 above is reasoned, not measured. H9 and
   H7 read the rectangles; say the Settings width the probe ran at (`width` in each sample), and whether the
   unreadable sentence wrapped beside the dots (§12 concern 2). P9 at the parent may go red for a parent reason if
   the checking sentence wraps and the unreadable one does not.
3. **The `live` face after a confirm faster than a frame.** `nameWatched` is set by an effect after the naming face
   COMMITS. If main's round-start push and its confirming push both reach the renderer before React renders the
   first, the naming face is never drawn, the mount never watched, and the person sees today's resting face (Pair
   alone) rather than `Your Mac’s name is live`. Not a regression against today, but §6's row "Name public, nothing
   remembered" promises the live lines on that mount. Loopback rounds of a few ms make this likelier in the probe
   than over real DNS; none of H9, H7 or H8 depends on it, because each holds the naming face for seconds.
4. **H9's `Checking again in 10 s` clause** reads the renderer's 1 s tick against the sample's own time. When a
   sample lands within the push's latency of `end + 11 s`, and the tick's phase is unlucky, the line can still read
   15 s. Worked out at well under 1% a run, not measured; a red there is that clause before it is the sheet.
5. **The 150 ms `HEARD_MS` window and the 100 ms after a push** (§9.5's attack) are where the drawn card and a
   composer can disagree. Re-derive from the kept report's raw samples, all of them, not only the graded ones.
6. **The faint flicker and the push count** (§12 concerns 3 and 5): the HEAD run prints H7's transitions run and
   cancelled and its pushes; each push also costs one `pocket:pairingState` read in the renderer.
7. **A run whose fields stop counting while the door stays published** (332's concern 7) now draws its last round
   with `Checking now` until the next counted start, where the parent drew the checking sentence. Same reach, same
   rule; the integrator found no path to it.
8. **Phase 326 and the floor.** `HELPER_USER_FLOOR` is 158 here; Phase 326 lands beside this phase at 158, so
   whichever commits second makes it 159.
