# Phase 299 — the counts a row draws. Builder contract.

Written by the spec agent from Phase 299's entry in `docs/BACKLOG.md` (the entry begins at
`docs/BACKLOG.md:31726` and ends at the `## Phase 300` heading, `:31828`). **Where this file and the
entry disagree, THE ENTRY WINS and you say so in your report.** §9 lists every place this file
CORRECTS a line number or a value the entry gives, each one read out of the tree at `c1de8e0f`.

Every file:line below was read at `c1de8e0f` in `/private/tmp/wt-p299`. Where the entry gives no
value, this file says **MEASURE** and names the command.

---

## §1 What the phase is

| | |
| --- | --- |
| **Subject** | `fix(overview): the counts a row draws are that session's own` |
| **First body line** | `Phase 299: three counting defects the session manager inherited` |
| **Semver** | Patch |
| **Tier** | **3.** The keep map is the one piece of data every provider is read through and this phase edits two providers' rules and the engine that reads them, so the claim is a claim across providers. Evidence is a per-row matrix over real data, two independent methods one of which is an attack, and the parent-commit measurement is mandatory. |

**What a person sees change.** A row's counts stop being wrong in three specific ways: a codex reply
written only as an `AgentMessage` on a turn that closed with no `last_agent_message` is counted
instead of lost; a row whose conversation id names a record belonging to a different folder draws
`— / Not recorded` instead of that other folder's numbers as `complete`; and a slash command typed
with no arguments counts as the person's message, so the reply to it stops replacing the previous
turn's reply. **No verb, no column, no channel and no sentence a person reads changes.**

---

## §2 File ownership. No file appears twice.

The split in the task brief put `keep-map.json` in two hands (A for the codex half, C for the claude
half) and put `reader/resolve.ts` in B's. **Both are changed here, and the reasons are:**

1. **`keep-map.json` is ONE file and goes to A whole.** C1 edits codex's `partWhen` and version; C3
   edits claude's `commandEcho` and version. Two builders in one JSON file is the seam the brief
   forbids fudging, so A owns all four edits and C owns only the engine. The field name C3 needs is
   the seam, pinned in §5.2, so A and C never have to agree at runtime by luck.
2. **`reader/resolve.ts` is NOT CHANGED AT ALL.** The entry's refusals say so twice: "No change to
   `resolve.ts`'s fallback loops" and "The claude directory name is never the evidence… The fallback
   at `resolve.ts:138-141` stays." C2 is a comparison AFTER the read, in `service.ts`. B owns
   `service.ts` and the doc note in `folder-identity.ts`, and touches `resolve.ts` never.
3. **`reader/map-types.ts` goes to C, not A.** The new `commandEcho` field needs a line on the
   hand-written `TransformOp` type, and that type is the engine's, not the data's.
4. **D owns every committed pin the appended fixture moves.** §6.2 enumerates them; there are six
   and the entry names none.

| Builder | Defect | Files, and nothing else |
| --- | --- | --- |
| **A** | C1 + both version bumps + C3's map half | `src/main/overview/keep-map.json` |
| **B** | C2 | `src/main/overview/service.ts`<br>`src/main/fs/folder-identity.ts` (the doc note at `:199-201` only — no code)<br>`src/main/overview/__tests__/service.test.ts` |
| **C** | C3's engine half | `src/main/overview/reader/expr.ts`<br>`src/main/overview/reader/map-types.ts`<br>`src/main/overview/__tests__/p299-bare-command.test.ts` (NEW) |
| **D** | gates and fixtures | `docs/research/assets/63-fixtures/codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl`<br>`docs/research/assets/63-fixtures/claude-bare-command.jsonl` (NEW)<br>`build/conformance-overview.mjs`<br>`build/overview-conformance-probe.mts`<br>`src/main/overview/__tests__/reader-helpers.ts`<br>`src/main/overview/__tests__/reader-codex.test.ts`<br>`src/main/overview/__tests__/store-activity.test.ts`<br>`src/main/overview/__tests__/reader-defects.test.ts`<br>`build/p293/SPEC.md` |

**Nobody owns `docs/BACKLOG.md`.** The running-log line is the integrator's, in the commit that
lands the phase.

**Nobody owns `src/renderer/**`.** No copy moves. `NO_MESSAGES_WORD` (`copy.ts:272`) and
`NOT_RECORDED_WORD` (`copy.ts:270`) are byte-for-byte untouched. If a builder finds a word that has
to move, **that word goes to the operator and the builder stops**, because the copy in this domain is
his ruling.

---

## §3 The three defects, with the line as it reads today

### C1 — the codex answer slot asks for a spelling no real record uses

**Today.** `src/main/overview/keep-map.json:592-597`, inside the codex `answer.text.firstOf`'s second
branch (`:590-600`), inside `answer.text` (`:585-602`):

```json
              "partWhen": {
                "eq": [
                  "type",
                  "text"
                ]
              },
```

**The change (A).** `partWhen` becomes, with `or` **required** and not merely preferred (§5.2):

```json
              "partWhen": {
                "or": [
                  { "eq": ["type", "Text"] },
                  { "eq": ["type", "text"] }
                ]
              },
```

Write it in the file's own expanded style, matching the surrounding indentation. Nothing else in the
slot moves: the first branch `{ "field": "payload.message" }` at `:587-589` stays, and the turn's
rescue `answerFrom: { "field": "payload.last_agent_message" }` at `:629-631` with
`"pick": "close-answer-else-last-answer"` at `:632` stays, so the rescue keeps winning wherever it
has text.

**The number.** 94,841 `AgentMessage` parts in the real store are spelled `Text` and 0 are spelled
`text`; 2,890 of 34,805 `task_complete` records carry `last_agent_message` as `""` or `null`, which
is **8.3 percent**, and those are exactly the turns that lose their reply today. All of those are the
entry's corpus readings and **no builder re-derives them** — the operator's records are not read in
this phase (§8).

The number a builder DOES move is the gate's: `build/conformance-overview.mjs`'s codex `answers`.
**MEASURE** after D's fixture lands, with `npx vitest run --no-cache src/main/overview/__tests__/reader-codex.test.ts`
and the reading the appended record produces. The prediction is `turns: 3 → 4` at both the parent and
HEAD, and `answers: 3 → 4` at HEAD while the parent stays 3, because `dropTurnsWithNoAsk`
(`keep-map.json:636`) drops a turn with no ASK and not a turn with no answer.

### C2 — the record's own folder is already in the result and nothing reads it

**Today.** The record's folder is read during the pass the reader already makes
(`reader/containers.ts:192-195`), handed back on `ContainerJoin` (`:358-364`, the interface at
`:46-50`) and carried on `ReadResult.join.cwd` (`reader/index.ts:52`). **`service.ts` never reads it**
— `grep -rn "result\.join" src/main/overview/` returns nothing, confirmed at `c1de8e0f`. And
`keep-map.json:22` has declared `"confirm": "cwd"` since Phase 137, falling into `JoinCfg`'s index
signature (`reader/map-types.ts:186-193`); `grep -rn '"confirm"' src/ build/` finds exactly one hit,
the declaration itself.

The claude door that lets a foreign record in is `reader/resolve.ts:134-143`, and specifically the
loop at `:138-141` which accepts `<id>.jsonl` under any of 2,776 project directories and answers
`resolved`. The codex door is `:144-167`, whose day shards are scanned newest-first by the
`-<id>.jsonl` suffix and never ask the record's folder. **Neither is narrowed.**

**The change (B), in `service.ts`.** `readOneRow` is the ONE read path — `buildOverview` at `:162`,
`refreshSessionForFold` at `:386` and `refreshRowForActivity` at `:445` all go through it — so one
insertion covers the page, the fold and `overview:activity`. Between the successful read (the `catch`
closes at `:303`) and the store write (`const sessionRow` at `:305`), add the comparison. On a
refusal, take the branch the file already has at `:255-271`: `carryForward(row, prior, provider,
'wrong-conversation', detail)`, set `stored.logPath = location.file`, `store.upsertSession(stored)`,
and return `quietState(row, prior, provider, 'wrong-conversation', detail)`. `quietState` is defined
at `:578` and `carryForward` at `:603`.

**The four clauses, each one a line a later round can delete. All four are required.**

1. **`'different'` alone is not enough.** `sameFolder` answers `'different'` when either side is
   *proven absent* (`folder-identity.ts:213`, `:219`, `probeOther` at `:229-236`). The refusal
   requires `'different'` **and both folders to have statted**. §5.1 pins the exact mechanism.
2. **Identity, never spelling.** Phase 274 rule 23 binds: `dev`+`ino`, never a case fold, never a
   `.normalize()`. This phase adds no comparison of its own — it calls `sameFolder` and nothing else.
3. **The claude directory name is never the evidence.** `resolve.ts` is untouched.
4. **Nothing is deleted.** On a refusal the read's turns are simply not written; the store keeps what
   it already held, and the truth table refuses to draw it —
   `overview/activity-map.ts:148-157`'s `RECORD_MISSING` maps `'wrong-conversation'` to reason
   `'wrong-conversation'` with coverage `unavailable` (`:156`), and invariant 1 in
   `src/shared/overview.ts:229-233` makes every value field null. No schema change, no new deletion
   path, no migration.

**The detail string.** The page's sentence is fixed (`OUTCOME_WRONG_CONVERSATION`,
`src/renderer/overview/copy.ts:76-77`) and the sheet's cell is `— / Not recorded`, pinned at
`p293-copy.test.ts:539-553`, so `detail` reaches no count. It is stored, so **it must name no path**:
write the relationship, e.g. `the record names a different folder`.

**The number.** Five of 110 resolved local rows, from the entry's verifier. **MEASURE at HEAD and at
`f6c11f57`** with the §7 matrix. If the count is not five, say so.

### C3 — the engine empties any argument-less command

**Today.** `src/main/overview/reader/expr.ts:204-213`:

```ts
      case 'commandEcho': {
        const name = tagged(t, op.nameTag ?? '');
        if (name === null) break;
        const args = tagged(t, op.argsTag ?? '') ?? '';
        t =
          (op.dropCommands ?? []).includes(name.trim()) || args.trim() === ''
            ? ''
            : (name.trim() + ' ' + args.trim()).trim();
        break;
      }
```

`:209`'s `args.trim() === ''` is the whole of C3. The emptied text then hits the
`empty after transform` drop rule at `keep-map.json:224-229` and the ask is dropped. The turn-folding
that follows has two shapes, both in `reader/fold.ts`: a **kept** ask flushes the open turn and opens
a new one (`:220-231`, and claude's `turn.open` is the string `"ask"` at `keep-map.json:282`, so the
flush at `:221-223` always fires); a **dropped** ask does not, it falls through to `applyDrop` at
`:232`; and an answer is kept only `if (answer?.kind === 'kept' && this.cur)` at `:235`. So a bare
command **as a session's first message** leaves `this.cur` null and the reply is **discarded
outright**, and one **mid-session** leaves the previous turn open, appends the reply there, and
`"pick": "last-answer-before-close"` (`keep-map.json:287`) makes it the reply that turn draws.

**The change (C).** `expr.ts:204-213` becomes exactly:

```ts
      case 'commandEcho': {
        const name = tagged(t, op.nameTag ?? '');
        if (name === null) break;
        const args = tagged(t, op.argsTag ?? '') ?? '';
        // Phase 299, C3. A command typed with no arguments is still the
        // person's own message. WHETHER it is dropped is the vendor's rule and
        // lives in the keep map, because 215 of the 650 empty-argument records
        // on this Mac name a command the map means to KEEP. `dropCommands`
        // keeps its job unchanged: it is checked first and still wins.
        const dropBare = (op.bareCommand ?? 'drop') === 'drop';
        t =
          (op.dropCommands ?? []).includes(name.trim()) || (dropBare && args.trim() === '')
            ? ''
            : (name.trim() + ' ' + args.trim()).trim();
        break;
      }
```

`(name.trim() + ' ' + args.trim()).trim()` with empty `args` yields the bare name, which is what the
entry asks for: `/as-built-architecture` is counted as the person's message.

And `reader/map-types.ts:47-68`'s `TransformOp` gains ONE field after `dropCommands?: string[];` at
`:67`:

```ts
  /**
   * Phase 299, C3. `'keep'` counts a command typed with no arguments as the
   * person's message, under its own name. `'drop'`, the default, is the
   * behaviour before this phase, so every provider that omits the field is
   * unchanged. `dropCommands` is checked FIRST either way.
   */
  bareCommand?: 'drop' | 'keep';
```

**The change (A), in the map.** `keep-map.json`'s one `commandEcho` op — and
`grep -c '"op": "commandEcho"' src/main/overview/keep-map.json` reads **1**, so claude is its only
user — is the object at `:81-96`. Add `"bareCommand": "keep"` after `"argsTag": "command-args",` at
`:84`, before `"dropCommands"` at `:85`.

**The number.** 215 of the 650 empty-argument records across 28 distinct names, from the entry's
corpus. The other 444 name one of the nine `dropCommands` entries (`keep-map.json:85-95`: `/model`,
`/effort`, `/login`, `/config`, `/logout`, `/status`, `/theme`, `/vim`, `/terminal-setup`) and are
**still dropped**. That 444 is the behaviour that must not move.

---

## §4 The two version bumps

`keep-map.json` carries `"mapVersion": 1` at `:2` and a per-provider `"version": 1` at fourteen
places. **Exactly two move, and no third.**

| Line | Provider | 1 → 2 | Why |
| --- | --- | --- | --- |
| `:13` | claude | yes | C3 changes claude's ask rules |
| `:352` | codex | yes | C1 changes codex's answer rules |
| `:660`, `:798`, `:917`, `:1037`, `:1204`, `:1388`, `:1572`, `:1697`, `:1847`, `:1924`, `:2036`, `:2147` | the other twelve | **no** | Their rules do not change and they are not re-read |

`"mapVersion"` at `:2` **does not move.** It is the map's own version and no rule reads it as a
watermark key; `service.ts:282` compares `prior.mapVersionAtLastRead` against
`providerVersion(provider)` (`reader/map.ts:23-27`), which is the PER-PROVIDER number.

**What re-reading records already stored means for a person, and this is the part a later round will
get wrong.** `service.ts:279-285` reuses a stored watermark **only** when
`prior.mapVersionAtLastRead === mapVersion` **and** `prior.logPath === location.file`. A bump makes
the first test fail, `watermark` is `null`, and `readSessionLog` (`:289-296`) reads the whole file
from byte 0. `store.ts`'s `replaceTurnsFrom` (`:646`) then deletes the tail, inserts the new turns and
their facts, and stamps the watermark, the map version and the read time **in one durable
transaction** — `store.ts:13-17` states it and a crash anywhere inside it leaves the previous state
intact and readable.

So for a person: **each claude row and each codex row pays one full read, once, at the next time
something asks for it** — the sheet opening, Catch Me Up, or a refresh. Nothing happens on a timer
and nothing happens at boot. That read is `build/p293/SPEC.md:89-92`'s measured cost, up to about
0.8 s for a 196 MB codex record with the page cache warm, and it is C4, which is **not fixed here**.
The store does not grow: `store.ts:25-28` measures the store at 0.166 percent of log bytes and a full
re-read replaces rather than appends. **There is no migration, no back-fill and no new deletion
path.** The nine other providers keep version 1 and are not re-read.

---

## §5 The seams. Two things more than one builder depends on.

### §5.1 `sameFolder` — B calls it, B never defines it, and `'unknown'` is not `'different'`

**Owner of the definition: nobody in this phase.** `src/main/fs/folder-identity.ts:203-222` is Phase
274's and its CODE does not change. B may change only the doc note at `:199-201`.

```ts
export function sameFolder(
  a: string,
  b: string,
  statAt: FolderStatFn = defaultStat
): FolderSameness
```

with `export type FolderSameness = 'same' | 'different' | 'unknown';` (`:72`),
`export type FolderStatFn = (path: string) => FolderStatIds;` (`:102`) and
`export interface FolderStatIds { readonly dev: number | bigint; readonly ino: number | bigint; }`
(`:84-87`). The default seam is `statSync(path, { bigint: true })` (`:112-113`), bigint on purpose
because an APFS inode past 2^53 rounds and merging two real folders is the data-loss direction.

**The order of its answers, read out of the code:**

| Branch | Answer | B's reading |
| --- | --- | --- |
| `a === b` byte-equal, `:208` | `'same'` | no syscall at all |
| both stat, identities differ, `:221` | `'different'` | **the only refusal** |
| `a` proven absent, `:213` | `'different'` | leave the row `resolved` |
| `a` unreadable, `b` proven absent, `probeOther` `:233` | `'different'` | leave the row `resolved` |
| `b` proven absent, `:219` | `'different'` | leave the row `resolved` |
| anything else | `'unknown'` | leave the row `resolved` |

**B IS THE FIRST CALLER IN THE TREE TO TREAT `'unknown'` DIFFERENTLY FROM `'different'`.** So
`folder-identity.ts:199-201`, which today reads

```
 * NO CALLER IN PHASE 274 ACTS ON `'unknown'`. It takes the same branch
 * `'different'` takes, which is exactly the behaviour before this phase, so an
 * unreadable row cannot regress anybody.
```

**must move in the same commit**, or it is left saying something untrue. Replace it with a note that
names Phase 299's caller and says what it does: it refuses only when both sides statted and their
identities differ, and it takes `'unknown'` and an absent side the same way it takes `'same'`.
Do not change the code and do not change the `@link`s; `conformance:samefolder`'s rule 10 reads this
file's imports and its `realpathSync.native` call as TEXT (`build/p274/conformance-samefolder.mjs:561-574`).

**HOW B GETS "both statted" WITHOUT A SECOND SYSCALL AND WITHOUT DEPENDING ON `sameFolder`'S ORDER.**
Pass a memoising `statAt` that records what succeeded and re-throws so the errno survives — the doc
at `:98-100` requires the errno, because a caller reads `err.code`:

```ts
const recordCwd = result.join.cwd;
if (recordCwd !== null && recordCwd !== '') {
  const seen = new Map<string, FolderStatIds | null>();
  const statAt = (p: string): FolderStatIds => {
    try {
      const st = statSync(p, { bigint: true });
      seen.set(p, st);
      return st;
    } catch (err) {
      seen.set(p, null);
      throw err;
    }
  };
  const answer = sameFolder(recordCwd, row.cwd, statAt);
  const bothStatted = seen.get(recordCwd) != null && seen.get(row.cwd) != null;
  if (answer === 'different' && bothStatted) {
    // the refusal
  }
}
```

`Session.cwd` is `string` and non-null (`src/shared/types.ts:180`), so only the record's side needs a
null check. `statSync` is a bare `statSync(`, not a bare `realpathSync(`, so Phase 274's rule 23 is
untouched — the rule forbids `realpathSync(` and permits `statSync` by name
(`conformance-samefolder.mjs:561`). B imports `statSync` from `node:fs` and `sameFolder`,
`type FolderStatIds` from `../fs/folder-identity`.

Statting both again after a `'different'` also works, at two extra syscalls on the rare refusal path.
Either form is acceptable. **What is NOT acceptable** is reading `'different'` as the whole refusal,
or inferring "both statted" from `sameFolder`'s internal control-flow ORDER rather than from what the
seam actually saw.

### §5.2 The `or` op — A writes it, C never touches it, and it is REQUIRED

`reader/expr.ts:52-57`:

```ts
export function test(pred: MapPredicate | null | undefined, ctx: unknown): boolean {
  if (pred == null) return true;
  const keys = Object.keys(pred);
  const op = keys[0];
  if (op === undefined) return true;
  const a = pred[op] as never;
```

**`test` reads `Object.keys(pred)[0]` and IGNORES EVERY OTHER KEY.** A predicate written with two
keys silently tests only the first. `or` is at `:62-63` and `eq` at `:66-69`; the whole vocabulary is
the switch at `:59-113` and there is **no `in` op**. So "accept either spelling" can only be written
with `or`, and a builder who writes `{ "eq": [...], "eq2": [...] }` or two sibling keys gets a rule
that tests one spelling and looks like it tests two. **C adds no op and changes nothing in `test`.**

---

## §6 The hostile fixture set — builder D

### §6.1 What every base case looks like today, and why it matters

`build/overview-conformance-probe.mts:494-496` passes `cwd: '/Users/dev/demo-app'` for claude and
`cwd: '/Users/example/rookery'` for codex. The codex fixture's own `session_meta` at line 1 carries
`"cwd":"/Users/example/rookery"` and the claude fixture's records carry `"cwd":"/Users/dev/demo-app"`.
**Both are byte-equal to what the probe passes, so `sameFolder` answers `'same'` at `:208` with no
syscall for every base case.** No existing case is a control for the absent-folder clause. D must add
one.

### §6.2 What appending to the codex fixture moves. The entry names none of these.

The codex fixture is read by six committed pins and seven probes. The probes copy it into a scratch
home and hard-code no turn count (checked at `c1de8e0f`), so they are low risk, but the pins are D's
to move in the same commit:

| Pin | What it says today | After |
| --- | --- | --- |
| `reader-codex.test.ts:24-28` | `turns.length` 3, answers 3 | **MEASURE** — predicted 4 and 4 |
| `store-activity.test.ts:53-54` | codex `{ turns: 3, user: 4, agent: 3 }` | **MEASURE** |
| `store-activity.test.ts:199-203` | `SUM(queued)` 4 over 3 turns, `countTurns` 3 | **MEASURE** |
| `reader-defects.test.ts:110-200` | derived fixtures compared against the codex base at `:129-130` | **MEASURE** |
| `conformance-overview.mjs:171-184` | codex `{ turns: 3, answers: 3, ratio: 0.078 }` | **MEASURE**; `RATIO_TOLERANCE` at `:216` is 0.05 and **is not widened** — the banked ratio is RE-DERIVED from `keptBytes / size` (`:298`) |
| `conformance-overview.mjs:230` | `ACTIVITY_EXPECT` codex `{ user: 4, agent: 3 }` | **MEASURE** |
| `resolve.test.ts:65-71` | the fixture's PATH only, no counts | unchanged |

`reader-helpers.ts:30-35`'s `JSONL_CASES` is where a NEW fixture file is registered.

### §6.3 The fixture table. Every expected value is derived, and the reason is given.

| # | Fixture | Right answer | Why |
| --- | --- | --- | --- |
| 1 | codex `AgentMessage` part `"type":"Text"`, turn's `task_complete` has `"last_agent_message":""` | **counted** as the turn's answer | This is C1. It is the shape 94,841 real records have and 2,890 turns close with. At the parent it reads 0 answers on that turn. **This is the record the gate exists for.** |
| 2 | part `"type":"text"` | **counted** | The committed fixture at `:13` spells it lowercase (verified). The `or` accepts both; breaking either arm must redden. |
| 3 | part `"type":"TEXT"` | **not counted** | `eq` is `===` (`expr.ts:68`). Two spellings were measured; a third is a guess, and guessing widens the rule. |
| 4 | part `"type":"Texts"` | **not counted** | Same reason. A prefix match would accept it and `eq` must not be loosened to one. |
| 5 | codex turn carrying a `Text` part AND a non-empty `last_agent_message` | **the rescue wins, and the reply is counted ONCE** | `"pick": "close-answer-else-last-answer"` (`keep-map.json:632`). `fold.ts:235` pushes the slot answer and `:244-245` then reads `answerFrom`; the pick, not the count, decides which is drawn. The turn's answer count must be 1, never 2. |
| 6 | `task_complete` whose `last_agent_message` is whitespace only | **the `Text` part wins** | `extract`'s `firstOf` skips a branch that yields falsy (`expr.ts:119-124`), and a whitespace answer must not beat a real one. **MEASURE** whether the shipping `pick` treats `"   "` as present; if it does, say so — that is a reading the entry does not give. |
| 7 | a reply whose own text quotes a `task_complete` line | **counted once, as a reply** | Real: the entry's two corpus counts disagree by exactly one line for this reason, and 2,890 + 31,916 = 34,806 over 34,805 records. A record is classified by its `payload.type`, never by its text. |
| 8 | a record whose recorded folder is **absent** and spelled differently from the session's | **stays `resolved`** | `sameFolder` answers `'different'` for a proven-absent side (`:213`, `:219`). This is the clause that stops the phase refusing a good record, and **§6.1 proves no existing case covers it.** A session whose project folder was deleted must keep its counts. |
| 9 | folders differing only by **case**, both real, on a case-SEPARATING volume | **`different` → refused** | `RealName` and `realname` are two real folders there. `conformance:samefolder`'s §8 row 1 already drives it; this phase adds no comparison, so the row is inherited. |
| 10 | the same pair on a case-FOLDING volume | **`same` → `resolved`** | One folder, two spellings. Refusing it would be the merge defect issue 25 in reverse. |
| 11 | **NFC against NFD**, on either kind of volume | **`same` → `resolved`** | A case-sensitive APFS volume still folds normalisation; `conformance:samefolder`'s §8 row 4 is that reading and it is why the design asks the volume rather than the string. |
| 12 | the record's folder is a **symlink** to the session's | **`same` → `resolved`** | Same `dev`+`ino` through the link. A project opened through a symlink is issue 25's neighbour and must not be refused. |
| 13 | claude, bare `<command-name>/as-built-architecture</command-name>` with empty `<command-args></command-args>`, as the session's ONLY message | **1 ask, 1 reply** | C3. At the parent: `this.cur` is null at `fold.ts:235` and the record reads **0 turns**, which is the verifier's `— / No messages yet`. |
| 14 | the same bare command BETWEEN two real turns | **its own turn; the previous turn keeps its own reply** | At the parent the reply folds into the previous turn and `"last-answer-before-close"` draws it there, so the previous turn's drawn reply is the reply to an invisible message. |
| 15 | a bare command that **is** on `dropCommands`, e.g. `<command-name>/model</command-name>` with empty args | **still dropped** | `expr.ts:209`'s `||` checks the list FIRST. This is 444 of the 650 real records and it is the behaviour that must not move. |
| 16 | a bare `<command-name>` whose name is not a command at all, e.g. `hello` with empty args | **counted, under that name** | The map's rule is about the TAG, not about whether a name looks like a command. Inventing a shape test here is a rule nobody measured. |
| 17 | a command with args, on and off `dropCommands` | **unchanged from today** | The control. `/effort ultracode` (fixture `:14`) stays dropped, `/loop …` (`:16`, `:18`) stays kept. |

**The claude fixture has NO bare command today** — `:14` is `/effort` with args and on `dropCommands`;
`:16` and `:18` are `/loop` with args. So `conformance:overview`'s claude row is invariant under C3 in
exactly the way the codex row is invariant under C1. The entry states this reading for C1 only. **Both
halves need a fixture that can fail**, and rows 13 to 16 are it. Put them in a NEW
`claude-bare-command.jsonl` rather than in `claude-session.jsonl`, so the claude row's banked
`turns: 3, answers: 3, ratio: 0.0413` (`conformance-overview.mjs:158-170`) does not move and only one
provider's pins are in motion.

**Each of rows 1, 13, 14 and 8 is also driven with its rule ABLATED one at a time**, so the gate is
proved able to go red on the clause that owns it: the `Text` arm of the `or`; `bareCommand: "keep"` in
the map; `dropBare` in the engine; and `bothStatted` in `service.ts`. A clause whose removal leaves
the gate green has asserted nothing — that is what `conformance:facts` rule F2 and `ablation:p274`
were written for.

### §6.4 `providerVersion`

`build/overview-conformance-probe.mts:1021` today:

```ts
      mapVersionAtLastRead: r === null ? null : 1,
```

becomes `r === null ? null : providerVersion(agent)`, in the SAME commit as the bumps. The stub
hard-codes the map version, and the whole point of a bump is that a version is read and not assumed.
`providerVersion` is exported from `src/main/overview/reader` (`map.ts:23-27`) and the probe already
imports that module dynamically; **MEASURE** the import shape the file uses at `:685` and `:708`
(`mod.resolveSessionLog`) and follow it.

---

## §7 The proof

**A photograph is forbidden and `npm run shot` may never run.** No builder launches Electron, runs
`npm run build`, any smoke, any probe or `npm run package`. Builders run `npm run -s typecheck` and
targeted `npx vitest run --no-cache <path>`. The main session runs the battery.

**The tier's required evidence.** Two independent methods, one an attack, plus a per-row matrix over
real data at `f6c11f57` and at HEAD, plus the parent-commit measurement.

1. **Attack (the verifier's, not a builder's): the hostile fixture set of §6.3**, seventeen rows each
   with a derived expected value, plus four ablations.
2. **Re-derive independently (the verifier's):** its own counter over the same sessions, written
   without reading this phase's code and without reusing Phase 293's verifier — codex's
   `item_completed` `AgentMessage` and `task_complete` records reconciled against the store's
   `userMessages`/`agentMessages`, and claude's `<command-name>` records classified into dropped, kept
   and bare and reconciled against the turn count. A disagreement means one of the two is wrong and
   the phase finds out which.
3. **The per-row matrix**, one row per resolved local session across every provider on this Mac, at
   `f6c11f57` and at HEAD, each row carrying agent, provider, harvest key, provenance source, the
   record's folder, the session's folder, the `sameFolder` answer, the read state, the ask count, the
   reply count and the drawn cell.

**THE OPERATOR'S STANDING RULE, and how it is measured.** No row's count may get worse. The matrix is
run at `f6c11f57` and at HEAD over the same real sessions and the same fixtures, and read as three
questions:

- **Every row that counts correctly today counts identically tomorrow.** A row that moves for no
  named reason **fails the arm**.
- **The rows that move, move upward or move to a named refusal.** Upward under C1 and C3 only; to
  `— / Not recorded` under C2 only. Each is listed with its reason.
- **A row that reads worse at HEAD drops the clause that caused it.** In particular: **the whole of
  C2 drops if five rows cannot be refused without refusing a sixth that is right.** That is measured
  by counting, at HEAD, the rows whose read state became `wrong-conversation`, and asking of each one
  whether the record's folder really is another folder — by `dev`+`ino`, by hand, from the matrix's own
  two folder columns. If any refused row's two folders are one folder, or if any refused row's folders
  do not both exist, the clause that refused it is wrong and **C2 comes out of the phase**. C1 and C3
  are independent of it and stay.

**The exchange C2 makes, stated plainly.** Those five rows lose a number and gain `— / Not recorded`.
A count that is another folder's conversation is not this row's count, so replacing it with the word
the sheet already has for "I cannot honestly count this" is not a row's count getting worse.

**Gates.** `typecheck`, `build`, `test`, `smoke:t1`; `conformance:overview` (the path-triggered gate
for `src/main/overview/**`); `conformance:manager` (`overview:activity`'s answer for five rows changes,
and its driven half must read exactly what it reads today); `conformance:samefolder`
(`folder-identity.ts` is read by a new caller); `ablation:p293` unchanged.

**`gate:contract` is untouched.** No channel, no manifest field, no `gmux.*` key, no `GMUX_*` name and
no harness mode. `docs/audits/contract-baseline.txt` does not change — it is **550 lines** at
`c1de8e0f`, not the 235 the entry states (§9.6).

**`HELPER_USER_FLOOR` does not move at 145** (`build/assert-electron-teardown.mjs:250`). No new script
reaches `build/electron-run.mjs`, because none of this needs an Electron.

**`build/p293/SPEC.md` moves in the same commit**, because a SPEC that still states these three as
standing limits is a SPEC a later round will build back. Two places, and §9 corrects the entry's
citations: `:83-88` (§1's limits) and `:2179-2188` (the verification's C1 to C5 block). **`:2189-2190`
STAYS** — the copy question is the operator's and this phase does not answer it.

**After your edits, every builder runs and reports:**

```
LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]" <each file you touched>
```

---

## §8 The refusals, from the entry

- **C4 and C5 are not in this phase.** The 0.8 s first read and the `~/.claude/projects` scan are the
  next two entries. Nothing here makes either worse: no read is added, the yield between rows
  (`activity.ts:29-32`) is untouched, and the version bumps pay their full read once at the next ask
  rather than on a timer.
- **No worker and no slicing.** The read stays synchronous, stays on main, one row at a time, yielding
  between rows and not inside one.
- **No new op in the keep-map engine.** C1 is written with `or` and `eq`, which already exist. C3 adds
  ONE field to an existing transform and one conditional, and nothing else in `reader/expr.ts` moves.
- **No engine rule for any provider but claude and codex.** Thirty-three other `partWhen` sites
  (`grep -c partWhen` reads 34 in total) are untouched, and twelve other providers keep `"version": 1`
  and are not re-read.
- **No change to `dropCommands`.** The nine names stay, the drop still wins, and the 444 bare records
  naming one of them are still dropped.
- **No copy decision.** `No messages yet` stays byte-for-byte at `copy.ts:272`. C3's wording and C6's
  `0+` are the operator's rulings and no builder makes them.
- **No deletion of stored turns and no migration.** The bump replaces turns as a consequence of
  re-reading, inside the transaction `store.ts` already has. The overview schema does not move.
- **No change to harvest.** `cwd-newest` stays codex's key (`harvest/stores.ts:528-529`),
  `IDENTITY_HARVEST_KEYS` gains no member (`harvest/claim-strength.ts:60-61`),
  `claimStrengthForKey` (`:64`) is not touched and no claim is re-rated.
- **No change to `resolve.ts`'s fallback loops.** Both stay. What is added is a comparison after the
  record is read, not a narrowing of where it is looked for.
- **Nothing acts on `'unknown'` as though it were `'different'`.** An absent or unreadable folder on
  either side leaves the row exactly as it reads today. This is the clause a later round is most likely
  to simplify away.
- **No status, no verb, no column and no channel.** Nothing here can set a session's status, end one or
  restore one.
- **No release.**
- **NEVER READ THE OPERATOR'S OWN RECORDS.** His codex store is 26,312 records at 11.76 GB and his
  claude records sit under 2,776 project directories. Every fixture in this phase is SYNTHESISED or
  taken from `docs/research/assets/` and `build/fixtures/`. Nothing written may print a token, a
  credential or a line of his conversation. If you believe you need his real data, say so in your
  report instead of reading it.

---

## §9 Where this file CORRECTS the entry

Each read out of the tree at `c1de8e0f`. The entry is right about every mechanism; these are
citations and one value.

1. **`build/p293/SPEC.md:2132-2141` is not the verification findings.** It is **§9, "The operator's
   rulings"** — `:2137-2140` is the R1/R2/R3 table. The C1 to C5 block with the remedy each one wants
   is at **`:2179-2188`**. The Gates bullet's instruction to move `:2132-2141` would edit the wrong
   lines; move `:2179-2188` instead.
2. **`build/p293/SPEC.md:2140-2141` is not the copy question.** `:2140` is R2, the sheet's corner
   radius; `:2141` is R3, agent messages and the schema. The `No messages yet` question and C6's `0+`
   are at **`:2189-2190`**.
3. **`build/p293/SPEC.md:2259` does not route the findings to §9.** It is an adversary table header.
   The routing line is **`:2308`**: `| Matrix P2, aggregate C1, C2, C3 and C5 | … queued in §9 | §9 |`.
4. **`src/renderer/session-manager/copy.ts:240` is not `NO_MESSAGES_WORD`.** `:240` is the close of a
   doc comment above `raisedLabel` at `:241`. `NO_MESSAGES_WORD = 'No messages yet'` is at **`:272`**,
   used at `:393` and `:481`. `NOT_RECORDED_WORD = 'Not recorded'` is at `:270`.
5. **`p293-copy.test.ts:511-524` does not pin the `wrong-conversation` cell.** `:511-513` is a gemini
   kept zero and `:516-524` is the shell cell. The `wrong-conversation` pin is the `it.each` at
   **`:539-553`** — the reason in the list at `:544`, the assertion `{ main: '—', small: 'Not
   recorded', title: null, busy: false }` at `:552`.
6. **`docs/audits/contract-baseline.txt` is 550 lines, not 235.** `wc -l` at `c1de8e0f` reads 550. The
   claim the entry is making — that the file does not change — is still true; only the number is wrong.
7. **`store.ts:360-364` is not the one-transaction claim.** It is `assertTurnsContiguousFrom`'s doc.
   The claim is at **`:13-17`** and `replaceTurnsFrom` is defined at `:646`.
8. **`fold.ts` drifts by two to four lines.** The kept-ask block is **`:220-231`** (entry: `:219-228`);
   a dropped ask reaches `applyDrop` at **`:232`** (entry: "falls through to `:229`", which is
   `collectMeta` inside the kept branch); the answer condition
   `if (answer?.kind === 'kept' && this.cur)` is at **`:235`** inside `:234-239` (entry: `:232-235`).
   Every mechanism the entry describes is correct at the corrected lines.
9. **Smaller drifts, all naming the right block.** `keep-map.json`'s `commandEcho` OP OBJECT is
   `:81-96`; `:80` is `"transform": [`. The codex `firstOf` array is `:586-601` (entry: `:585-600`).
   `service.ts`'s watermark reuse is `:279-285`; `:286` is blank. `activity.ts` yields between rows at
   `:29-32` (entry: `:30-33`). `conformance-overview.mjs`'s codex EXPECT row is `:171-184` with
   `answers: 3` at `:174` (entry: `:159-176`, which is the claude row plus codex's first lines).
   `answerFrom` is `:629-631` with its field at `:630` (entry: `:626-630`, which is the tail of the
    `close` predicate plus it). `dropTurnsWithNoAsk` is at `:636` (entry: `:634-636`, which is the
    `carry` block and it).
10. **The entry's "0 `agent_message` records anywhere in the store" is a real-store reading and the
    FIXTURE has two**, at `:12` and `:26`. Not a contradiction, but a builder must know that on the
    fixture the first `firstOf` branch `{ "field": "payload.message" }` DOES fire, so the fixture's
    three answers do not all come from the rescue.
11. **The entry does not say that the claude fixture holds no bare command at all**, so
    `conformance:overview`'s claude row is invariant under C3 exactly as the codex row is invariant
    under C1. §6.3 rows 13 to 16 are the fixtures that end that reading.
12. **The entry does not name the six committed pins that appending to the codex fixture moves.** §6.2
    lists them. They are all D's, in the same commit.

---

## §As built — where the build differs from this file, and why

Written by the integrator after the four builders landed, so a verifier reads the deviations here
rather than discovering them. Every reading below is a command run in the worktree, not a reading of
code. Nothing in §8's refusals was broken: no copy word moved, no channel, no schema, no deletion
path, no new op, no `dropCommands` change, no harvest change, no `resolve.ts` change, no status,
no release, and `HELPER_USER_FLOOR` did not move.

### 1. `src/main/overview/activity-map.ts` gained a clause, and §2 gave nobody that file

**This is the largest deviation and it is what makes C2's outcome true.** §3's C2 and the phase
entry's C2 clause 4 both state the outcome as "the truth table refuses to draw them… coverage
`unavailable`", citing `activity-map.ts:156`. `:156` is only the `RECORD_MISSING` entry, which
supplies the REASON. The coverage is decided lower down, and **row 7 hard-codes `coverage: 'partial'`
and `reason: 'record-gone'` for all three missing read states whenever the store holds turns**, which
the five C2 rows do hold, because they are exactly the rows that already read and stored the other
folder's conversation.

Builder B found this by reading and measured it with a throwaway suite. The integrator re-derived it
independently through the shipping `toActivity`, and the reading was:

```
WITH stored turns : {"coverage":"partial","reason":"record-gone","u":5,"a":4}
NO stored turns   : {"coverage":"unavailable","reason":"wrong-conversation","u":null}
```

So without a change here the five rows would have drawn **`9+` / `Partial history`** under the
sentence "Only the available history is counted" — with **another folder's counts** — instead of
`— / Not recorded`. That is not the fix the entry describes, and a verifier holding the matrix against
the entry would have been right to call it needs_work.

The change is one clause: `wrong-conversation` takes row 6 whatever the store holds. `no-file` and
`unreadable` are untouched, because a record that has gone kept counts that really are this session's.
`activity-map.test.ts`'s row-7 `it.each` had pinned all three states, so the pin moved: two of the
three stay in row 7 and `wrong-conversation` gets its own `it` in the row-6 direction. `build/p293/
SPEC.md`'s truth table rows 6 and 7 were amended in the same commit, because a SPEC still saying row 7
covers three states is a SPEC a later round builds back.

Nothing else reads row 7's answer: `grep` for `record-gone` outside tests returns exactly one line,
its own, and no gate script under `build/p293/` names either reason, which is why
`conformance:manager` (56 rules, 2240 checks) and `ablation:p293` (69 ablations) stayed green.

### 2. `src/main/overview/__tests__/activity.test.ts` gained the end-to-end chain, and §2 gave nobody that file either

`service.test.ts` drives the comparison and `activity-map.test.ts` drives the truth table, one on each
side of the store. **Nothing drove the chain**, and the chain is where the defect above lived. Three
`it`s were added to the file whose job is that orchestration with a REAL SQLite store and the real
`statSync`: two real folders refused and drawing nothing; a symlink alias to the session's own folder
still counted, which is identity-not-spelling end to end; and a folder that never existed leaving the
row alone, which is the `'unknown'`-is-not-`'different'` clause.

Proved falsifiable in both directions: ablating the integrator's `activity-map.ts` clause reddens 2 of
the 82 tests in the two files, and ablating **builder B's** `service.ts` refusal reddens the first of
the three. Both files were restored and compared by sha256.

### 3. `bareCommand` is read with `!== 'keep'`, not §3's `=== 'drop'`

§3 prescribes `const dropBare = (op.bareCommand ?? 'drop') === 'drop';`. Under that form the only
things that DROP are the exact word `drop` and the absent field, so `"Keep"`, `"true"` or any typo
reads as the NEW behaviour. Builders C and D reported it independently, C named
`!== 'keep'` as one character away and behaviour-identical for every value the type allows, and C left
the ruling open in a doc comment. **The ruling is made here and the narrow form ships**, for three
reasons: `reader/map.ts` casts the JSON straight to `KeepMap` so nothing validates the value at
runtime and the value IS the guard; the two failure directions are not equal, since failing to `keep`
loses the fix for one provider and is today's reading, while failing the other way turns a counting
rule on for a provider that never asked for it; and §6.3 rows 3 and 4 refuse `TEXT` and `Texts`
because a third spelling is a guess, which is the same argument about a value.

`p299-bare-command.test.ts`'s pin moved with it — `'Keep'` now reads as dropped — and reverting the
expression to §3's form reddens exactly that one test of its 24.

### 4. `conformance:overview` pins both version bumps as VALUES, which §6.4 did not ask for

§6.4 asked for `providerVersion(agent)` at the probe's hard-coded `1`, and D did that at both activity
sites and at the redaction write. Builder A then found that **the codex bump is asserted by nothing**:
the gate's structural check accepts any number at or above 1, and the new `mapVersionsAsked` check
holds the stub against whatever the map says, so it is self-consistent with a version that slid back.
Measured: with codex's version reverted to 1 the whole overview suite stayed green. Claude's bump is
pinned by C's test; codex's was not.

A version bump is invisible in every count on this page — the fixtures are read from byte 0 with no
stored watermark, so C1 and C3 read correctly on them whatever the version says. What the bump buys is
the only thing a version buys, which is that a session ALREADY READ has its watermark retired. That is
a durability claim and it now has a pin of its own: `claude: 2`, `codex: 2`, and **every one of the
other twelve providers at 1**, the second half being the entry's refusal that no other provider is
re-read. Both directions measured red: codex at 1 fails, and grok raised to 2 fails.

### 5. Deviations the builders declared, carried forward unchanged

D's five (§6.2's `CLAUDE_BARE_CASE` as its own export rather than a `JSONL_CASES` member, because
`store-activity.test.ts` asserts `TRUTH`'s keys ARE that map's keys and uses the key as the provider;
the claude fixture as a probe case rather than a `BASE` case, since `BASE` is keyed by provider; row 13
derived rather than committed, since a committed file has one first message; two more hard-coded map
versions replaced than §6.4 named; rows 8 to 12 belonging to B or inherited from
`conformance:samefolder`) are all sound and all stand. B's doc-only edit to `folder-identity.ts`
shifted `sameFolder` from `:186` to `:219`; nothing reads that file by line number and
`conformance:samefolder` reads it as text.

### 6. What the integrator did NOT do, and the verifiers own

- **No corpus number was re-derived.** `94,841`, `2,890 of 34,805`, `8.3 percent`, `215 of 650`, `444`
  and `five of 110` are all readings over the operator's own store, which §8 forbids touching. Every
  one of them is unverified in this build.
- **`build/p299/SPEC.md` §7's per-row matrix over real data was not run**, and it is the tier's
  required evidence.
- **`docs/research/assets/63-keep-map/verify.js:13`** still pins codex at 3 turns and 3 answers and
  would fail if run by hand. It is research 63's frozen record of what the reference reader measured in
  August, no gate and no package script invokes it, and it was left alone deliberately.

### 7. C2 WAS REMOVED WHOLE AFTER THE VERIFY, and this section overrides every C2 clause above it

Sections 3, 5.1, 6 and 8 design the folder comparison in full. **None of it ships in Phase 299.** The
Tier 3 verify found the comparison SOUND — three lenses drove 28 good folder classes (symlink either way
and two deep, `/tmp` against `/private/tmp`, the `/System/Volumes/Data` firmlink proved from identity,
NFC against NFD on both volume kinds, case on a folding volume, a dangling symlink, a symlink loop, EACCES
behind mode-000, deleted folders, an unexpanded `~`, a trailing space) and it refused none — and then
found it UNAFFORDABLE, which the operator's standing rule answers: a regressing part is removed and queued.

The regression, measured at both builds by the verify and again by the reverify with its own harness:
the comparison ran AFTER `readSessionLog`, so a refused row discarded a full synchronous read of the
whole record on every ask, for ever. Four successive asks of one 20 MB record handed `readSessionLog` a
watermark of null / null / null / null at about 227 / 214 / 198 / 199 ms and stored 0 turns, where the
same row without the comparison reads null / reused / reused / reused at 225 / 0.2 / 0.1 / 0.2 ms. The
sheet re-asks every running id every 30 seconds. A record naming its OWN folder reused at both builds,
so the cost only ever landed on the rows the comparison was trying to help.

It could not be repaired in the one fix round, and that is a measurement: stamping the watermark makes
the next read a TAIL read, a codex tail read reaches no `session_meta`, so `join.cwd` comes back null,
the comparison is skipped, and `service.ts` rewrites the row `ok` drawing the other folder's counts again
— driven end to end. The honest fix needs new semantics, a refusal sticky per resolved `logPath` or a
comparison taken BEFORE the log is opened, and it must answer what this round discovered: **`join.cwd` is
a property of the PASS, not of the record.** One codex file answers one folder from byte 0 and another
as a tail after a resume, so a stored watermark could make a cell alternate between a count and
`— / Not recorded` every 30 seconds.

**What was removed**: the comparison in `service.ts`, its `statAt` seam and `realStat` default, the doc
note in `folder-identity.ts`, the C2 cases in `service.test.ts` and `activity.test.ts`, AND the
`activity-map.ts` routing of `wrong-conversation` to row 6 that §As built item 1 added — the reverify
found that with the comparison gone, that routing could only reach antigravity's pre-existing resolver
refusal, and for a relocated antigravity session holding real turns from an earlier read it turned
`6+ / Partial history` into `— / Not recorded`, hiding counts that are this session's own. All six files
are byte-identical to the parent. **What stays**: both keep-map bumps, each tied to a shipping fix
(claude 2 for the bare-command rule, codex 2 for the answer slot); nothing of C2 was carried by either.

**Phase 300 owns the comparison now**, with these measurements in hand. `keep-map.json:22`'s
`"confirm": "cwd"` stays as it has stood since Phase 137, declared and read by nobody.
