# Phase 300 — SPEC

Authority: `docs/BACKLOG.md:31828` to `:31925` (`## Phase 300 — what a first read costs the person
waiting`). **Where this file and that entry disagree, THE ENTRY WINS.** Four places where this file
CORRECTS the entry are marked **CORRECTION** and each says why; a builder who thinks a correction is
wrong stops and asks rather than choosing.

Every number attributed to the operator's stores was measured on 2026-09-19 for the entry and is
**not re-measurable in this worktree**. His codex store is 26,312 records at 11.76 GB and his claude
records sit under 2,776 project directories. No builder reads them. Fixtures are synthesised from
`docs/research/assets/63-fixtures/`.

**AS VERIFIED, 2026-09-21 — READ THIS BEFORE §3, §5 AND §7.** The Tier 3 verify ran three lenses and
a judge over the build this SPEC describes, and the phase that LANDS is §4's cache ALONE. §3's reduced
counts read (the codex rule split and the `paths` flag) and §5.1's watermark mark were built exactly
as written, measured, and taken out: the split made the first read of a large codex record 15 to 47
percent SLOWER on the engine main actually runs while §7.1's deciding instrument had measured it
faster under node 22, and the flag's re-read cost was the operator's trade and he dropped it. §3.3 and
§7.2 below carry the verified numbers beside the ones the first build committed to, and
**§As verified** at the end is the record. Nothing in §3 or §5 is a build instruction any more.

---

## §1 What this phase is

| | |
| --- | --- |
| **Subject** | `perf(overview): a claude row with no record stops re-scanning every project folder` (as verified; the first build's `a first read stops holding the window` is no longer true) |
| **First body line** | `Phase 300: what a first read costs the person waiting, and the cache lands alone` |
| **Semver** | Patch. Nothing a person reads changes and no count moves. |
| **Tier** | **Tier 3.** `src/main/overview/reader/` is the one path every provider is read through and this phase changes what it admits before it parses. Evidence is a per-row matrix over real data; the parent-commit measurement is mandatory; three independent methods, one of them an attack. |

**The one sentence, as verified.** Opening the session manager again inside half a minute no longer
searches every claude project folder for each row that has no record yet; a very large record still
holds the window on the sheet's first open exactly as today. (The first build's sentence — the window
keeps painting while the first pass runs — was never true in the app and is withdrawn.)

Two findings, two different questions (entry `:31840`). **C4 is a READING question, not a scheduling
one**: the counts channel needs four numbers and two clocks and it builds the path index to get them,
and the path index is what forces 107 MiB of a 187 MiB codex record through `JSON.parse`. **C5 is a
CACHE question and the cache must be of the ANSWER**: it is recomputed on every ask and nothing about
it changed between asks.

---

## §2 File ownership — three builders, no file twice

The prompt's rough table held. **Two things I changed, and why:**

1. **`src/main/overview/service.ts` goes to A, not to B.** The watermark's optional field is read as
   one more clause beside `service.ts:279-285`, which is C4's own safety clause, and the paths flag's
   one `false` caller is `refreshRowForActivity` at `service.ts:435-449` in the same file. C4 owns it.
2. **B therefore reaches service.ts through a declared seam, not an edit.** B owns
   `src/main/overview/ipc.ts:101-105`, where `OverviewServiceDeps` is built, and a new file
   `src/main/overview/reader/resolve-cache.ts`. **A makes exactly two edits on B's behalf**, both
   written out in §4.3, and A makes no other change to the resolve path.

**The watermark JSON's optional field is A's**, whole: the type in `reader/watermark.ts`, the stamp in
`reader/containers.ts`, the clause in `service.ts`. It is C4's safety and splitting it across two
builders is how it gets half-built.

### Builder A — C4, read less

| File | What |
| --- | --- |
| `src/main/overview/keep-map.json` | codex's `item_completed` prefilter rule splits (§3.2) |
| `src/main/overview/reader/index.ts` | `ReadInput.paths`; `:118-141` skips `extractPathsFromText` when false |
| `src/main/overview/reader/containers.ts` | `:266`'s `extra` gated on paths; stamps the watermark field |
| `src/main/overview/reader/watermark.ts` | the optional field on the watermark type + `buildByteOffsetWatermark` |
| `src/main/overview/service.ts` | `readOneRow` gains the flag; `:279-285` gains the clause; `:435-449` is the one `false` caller; the two seam lines of §4.3 |
| `__tests__/reader-codex.test.ts`, `reader-claude.test.ts`, `reader-watermark.test.ts`, `service.test.ts`, and `p300-paths-flag.test.ts` (new) | the split rule on both reads; claude's extra dropped with counts unmoved; an absent field reading as "paths were read"; the clause and the one `false` caller; the flag's matrix per provider |

### Builder B — C5, cache the answer

| File | What |
| --- | --- |
| `src/main/overview/reader/resolve-cache.ts` (new) | the cache: key, TTL, 512 bound, factory |
| `src/main/overview/reader/resolve.ts` | `ResolveEnv` gains the cache; `:138-142`'s fallback asks and fills it |
| `src/main/overview/ipc.ts` | `:101-105` builds one cache into `deps` |
| `__tests__/resolve.test.ts`, `ipc.test.ts`, and `p300-resolve-cache.test.ts` (new) | the fallback's cached and uncached paths; the deps carry a cache; key, TTL, bound, two instances, provider scope |

### Builder C — the probe, the gates, the floor

| File | What |
| --- | --- |
| `build/p300/generate-codex-records.mjs` (new) | synthesises the four records from the committed fixture |
| `build/p300/probe-p300.mjs` (new) | `probe:p300`, one Electron, two instruments |
| `build/p300/ablation.mjs` (new) | `ablation:p300`, the eight clauses of entry `:31907` plus the integrator's ninth |
| `build/p300/split.mjs` (new) | the stage split through `conformance:overview --real`, the phase's FIRST step |
| `build/conformance-overview.mjs`, `build/overview-conformance-probe.mts` | the new rules; `--real` gains per-stage timing |
| `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 145 → 146 (§6.4) |
| `package.json` | `probe:p300`, `ablation:p300`, `measure:p300-split` |
| `build/p293/SPEC.md` | `:89-92` and `:2187-2188` rewritten (§7.3) |
| `docs/BACKLOG.md` | the phase's landing lines and the running log |

Nothing else is edited. `src/shared/**` is untouched, `docs/audits/contract-baseline.txt` is
untouched, and its `[ipc.invoke.channels] count=235` (`docs/audits/contract-baseline.txt:5`, counted
here: 235 rows) does not move.

---

## §3 C4, as an exact change

### 3.1 Which read builds the path index, and where the two reads diverge

There is **one** read, `readSessionLog` (`src/main/overview/reader/index.ts:81`), and **three**
callers of `readOneRow` (`src/main/overview/service.ts:207`):

| Caller | line | turnLimit | wants paths |
| --- | --- | --- | --- |
| `buildOverview` (the page, Catch Me Up, the fold) | `service.ts:161-163` | 1 or `MAX_TURN_LIMIT` | **yes** |
| `refreshSessionForFold` | `service.ts:386-394` | `MAX_TURN_LIMIT` | **yes** |
| `refreshRowForActivity` (the sheet's counts) | `service.ts:445` | **0** | **no** |

The path index is built in two places, both on the shared path. **The prefilter admits the lines it
needs**: `reader/containers.ts:266` — `const extra = cfg.paths?.prefilter ? [cfg.paths.prefilter] : [];`
— appends the provider's paths-only rule and `:267-272` compile it into the head filter. That is the
whole of claude's saving: entry `:31858` measured a real 112.2 MiB claude record going from 28.7 MiB
admitted to 24.0 and its parse from 27 ms to 17. **And the extractor runs over every turn's text**:
`reader/index.ts:118-141` calls `extractPathsFromText` (`reader/paths.ts:156`) on the ask text, the
answer text and every `pathTexts` entry, then `mergePathMentions`.

**The change.** `ReadInput` (`reader/index.ts:59-67`) gains a required `paths: boolean`.
`readOneRow` gains a `paths: boolean` parameter and passes it through. `containers.ts:266` becomes
`const extra = input.paths && cfg.paths?.prefilter ? [cfg.paths.prefilter] : [];`.
`reader/index.ts:118-141` builds `paths: []` and skips every `extractPathsFromText` call when the
flag is false.

**`pathSource` does NOT move.** `reader/index.ts:118` stays
`cfg.paths ? 'tool-calls' : 'text-only'`. It is a stored column (`store/schema.ts:81`,
`store/store.ts:353`) and making it the marker would put the phase's mode into a column, which is the
schema change §5.1 refuses. The marker is the watermark field and nothing else.

**The flag is an explicit parameter and is never derived from `turnLimit === 0`.** A later caller
wanting no turns but the path index would silently lose it. `ablation:p300`'s first clause is a
second `false` caller and it goes red.

### 3.2 The prefilter rule as it stands today, and the split

Today, `src/main/overview/keep-map.json:378-380` opens codex's prefilter at `headBytes: 200` and
`:389-392` is the rule this phase splits, verbatim:

```json
          {
            "class": "any",
            "head": "\"item_completed\""
          },
```

`codex.paths` (`keep-map.json`, the `paths` block) has **no** `prefilter` today — codex's paths are
read from `payload.item.command` off `item_completed` records that the shared rule above already
admits. That is the defect exactly. claude by contrast already has the shape
(`keep-map.json:289-296`, `class: "paths"`, head `"\"role\":\"assistant\""`).

**CORRECTION 1 — the entry's split is one rule short and would move a count.** Entry `:31884` says
the rule splits into "one carrying `requireAnywhere: ["AgentMessage"]` and a second `class: "paths"`
rule with no requirement". codex's **ask** predicate is an `or` whose second arm is
`payload.type == item_completed AND payload.item.type == UserMessage` (`keep-map.json`, `codex.ask.when`).
`decideWhole` (`reader/lines.ts:86-90`) ANDs every `requireAnywhere` entry, so a rule requiring
`AgentMessage` drops every `item_completed`/**UserMessage** line — and those lines ARE the person's
messages on the older vintage. The committed fixture
`docs/research/assets/63-fixtures/codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl`
carries both spellings in one file: line 6 is an ask as `item_completed`/`UserMessage`, lines 19, 20
and 25 are asks as `user_message`. The entry's own rule would lose line 6's ask and its turn.

**The split, corrected. `keep-map.json:389-392` becomes two rules**, because
`reader/lines.ts:197`'s `cands.some((r) => decideWhole(r, line))` is an OR across candidate rules and
is the only way to say "either item type":

```json
          {
            "class": "ask",
            "head": "\"item_completed\"",
            "requireAnywhere": ["\"UserMessage\""]
          },
          {
            "class": "answer",
            "head": "\"item_completed\"",
            "requireAnywhere": ["\"AgentMessage\""]
          },
```

and `codex.paths` gains, beside its `when` and `from`:

```json
        "prefilter": {
          "class": "paths",
          "head": "\"item_completed\""
        },
```

**The rule the split obeys, and it is the phase's strongest correctness claim.** *The reduced rule set
admits every record any COUNTED field is derived from, and drops only records that feed `paths`.*
Derived from codex's own map: `session_meta` (the join), `user_message` and
`item_completed`/`UserMessage` (`ask.when`), `agent_message`, `item_completed`/`AgentMessage` and
`task_complete`'s `payload.last_agent_message` (`answer.when`, `turn.answerFrom`), `task_started` and
`task_complete` (`turn.open`, `turn.close`), `<turn_aborted>` (`marksRecords`). The reduced set drops
`item_completed` whose `item.type` is anything else — `CommandExecution`, `Reasoning`, `FileChange` and
the rest — and `codex.paths.from` is `payload.item.command` alone. So turn count, ask count, reply
count and both clocks are IDENTICAL by construction and only `turn_fact.paths` differs. A builder who
cannot restate this rule has not understood the phase. Union when paths are ON = every
`item_completed` line, exactly as today, so **the page's admitted bytes are byte-identical**.

**CORRECTION 2 — `detectWideHead` cannot move under this flag, and the entry treats it as a risk.**
Entry `:31884` warns that `detectWideHead` (`reader/lines.ts:97-126`) "reading `wide` on a sorted-key
vintage makes the head 4 MiB per line and changes the shape of the saving". `detectWideHead` reads
`r.head` ONLY (`lines.ts:100`) and ignores `requireAnywhere`. Both split rules' `head` is
`"\"item_completed\""`, byte-identical to the rule they replace and to the new paths rule; claude's
paths rule head `"\"role\":\"assistant\""` is already byte-identical to its shared rule 0's head. So
**adding or dropping `extra` cannot change `prefilterMode` for either provider.** This becomes a
pinned invariant: *every paths-only rule's `head` is byte-identical to some shared rule's `head`, for
every provider that has one.* `conformance:overview` asserts it as text over `keep-map.json`, and the
probe still asserts `acct.prefilter === 'head'` on its synthesised records as entry `:31900` requires.

**Two more the entry names and this file keeps.** The marker is the ITEM type `"AgentMessage"` and not
the part type, so it is independent of Phase 299's C1, which edits the same block and lands first. And
`requireAnywhere` and `class` already exist (`reader/lines.ts:35-90`, `reader/map-types.ts:103-109`),
so **no new op enters the engine**. `class` is declared at `map-types.ts:104` and read by nothing under
`src/main/overview/reader/` — it is a label for a person and this phase does not start reading it. The
paths-only rule is dropped because it lives in `cfg.paths.prefilter`, which `containers.ts:266` already
gates, not because the engine learned a word.

### 3.3 The arithmetic, as the probe's target and not as a re-measurement

Every figure here was measured over the operator's own store on 2026-09-19 and recorded in the entry.
**None of it is re-measurable in this worktree and no builder may try.** They are the shape the probe
must reproduce on synthesised records of the same size, not values to assert.

**AS VERIFIED: the "At HEAD" column below is the first build's, taken under node 22 / V8 12.4, and
it is NOT what the reduced read cost where it ran.** Main runs Electron 43's Node 24 / V8 15, and on
that engine the same reduced read of a synthesised 960 MiB record took 2103 to 2513 ms in the app
against 1692 to 1834 ms today, four of four quiet interleaved pairs; reader alone under Electron's
engine 3027 to 3116 ms against 1638 to 1719; the ~87 ms floor was never reproduced on any run (the
200 MiB class in the app was 359 to 557 ms against 377 to 447, a noise band). The mechanism: the
reduced read copied every head-admitted line into a fresh Buffer, scanned it twice with whole-line
`indexOf`, and dropped it with no JS-heap allocation, so V8 15 never scavenged and the copies piled
up as external memory to the file's size (407 to 451 MB), allocation slowed across reads in one
process (271 → 499 → 1243 ms over three reads of one 200 MiB file) and the pile was swept later as a
112 to 629 ms main-thread block on the next ask. The reduced read was REMOVED. The column stays so
the shape of the mistake is on record beside the numbers that replaced it.

| Record | Stage | Today | First build (node 22, REMOVED) | Entry |
| --- | --- | --- | --- | --- |
| 186.8 MiB codex | byte scan | 53 ms | 53 ms | `:31854` |
| 186.8 MiB codex | admitted by `item_completed` | 107.4 MiB / 13,946 lines | 0.5 MiB / 544 lines | `:31856`, `:31860` |
| 186.8 MiB codex | `JSON.parse` of admitted | 151 ms | 1 ms | `:31856`, `:31860` |
| 186.8 MiB codex | whole-line `indexOf` decide | 0 | 33 ms | `:31860` |
| 186.8 MiB codex | measured floor | **204 ms** | ≈87 ms, never reproduced in the app | `:31856`, `:31860` |
| 190.6 MiB codex | `item_completed` admitted | 64.5 MiB / 263 lines | 0.0 MiB / 39 lines | `:31860` |
| 959.5 MiB codex | byte scan | 233 ms | 233 ms | `:31854`, `:31890` |

**The 544 lines and 0.5 MiB were measured with `"AgentMessage"` ALONE.** CORRECTION 1 adds the
`UserMessage` rule back, so the corrected read admits those 544 lines **plus the record's asks**. On a
codex record the asks are few and short beside the `CommandExecution` lines that carry the bytes, so
the saving stands, but **544 and 0.5 MiB are not pass/fail targets** — `build/p300/split.mjs` MEASURES
the corrected numbers and prints both, and a reading materially above 0.5 MiB is a finding to report,
not a failure to hide.

Two narrowings are **measured and refused** and no round re-derives them (entry `:31858`): a
second-stage `requireAnywhere` naming `"command"` drops 68 percent of the lines and only 10.5 percent
of the bytes at a cost of 39 ms, because the big lines are precisely the ones carrying `command`; and
claude has almost nothing to gain. **C4 is a codex-shaped defect.**

### 3.4 The watermark offsets are identical, which is why the resume stays honest

`acct.lastCompleteOffset` is set at `reader/lines.ts:251` on every complete line, whatever the
prefilter decided, so it is scan-level and identical under both rule sets. `openOffset` moves only on
turn open/close, and `task_started`/`task_complete` are kept by §3.2's rule. So
`containers.ts:345` — `const offset = pass.openOffset ?? pass.lastCompleteOffset;` — computes the same
offset for both reads. The watermark field of §5.1 exists for the **path index**, not for the offset.

---

## §4 C5, and the cache is of the ANSWER

### 4.1 Where the answer is computed

`resolveSessionLog` (`src/main/overview/reader/resolve.ts:104`), claude arm, `:135-142`:

```
135      const projects = join(home, '.claude', 'projects');
136      const direct = join(projects, dashEncodeClaudeCwd(realCwd), `${id}.jsonl`);
137      if (isFile(direct)) return { state: 'resolved', provider, file: direct, sessionId: null };
138      for (const dir of listDir(projects)) {
139        const p = join(projects, dir, `${id}.jsonl`);
140        if (isFile(p)) return { state: 'resolved', provider, file: p, sessionId: null };
141      }
142      return { state: 'no-file', provider };
```

`listDir` (`:87-93`) is one `readdirSync`; `isFile` (`:79-85`) is one `statSync` per entry. A row that
HAS a record at the direct path never enters the loop. A never-prompted row runs the loop to the end
**on every ask**, because `service.ts:233-241` resolves BEFORE the watermark check at `:279-285`, so a
warm store does not avoid it. `carryForward` (`service.ts:603-626`) stores `readState: 'no-file'` and
nothing reads it to skip the next scan.

Measured for the entry (`:31850`) over the real directory, warm, twelve runs: **min 14.3 ms, median
19.5 ms, max 30.8 ms**, of which the `readdirSync` is **1.9 ms**. So **the listing is 10 percent and
the 2,776 `statSync` calls are the other 90.** A cache of the LISTING buys 1.9 ms of a 19.5 ms median,
misses the `statSync` calls that are the rest, and caches a directory that grows by ones — a source of
wrong answers for a tenth of the win. **Cache the answer.**

### 4.2 What the cache is

| | |
| --- | --- |
| **What is cached** | the **negative answer of the FALLBACK only**: `{ state: 'no-file' }` reached by falling off `:141` |
| **Never cached** | the direct stat at `:137`; any `resolved`; any other provider; any other state |
| **Key** | `home` + `provider` + `id`. **The home is part of the key**, or a probe with a scratch HOME reads the real home's answer (entry `:31869`) |
| **TTL** | bounded staleness, one window. `MEASURE`: the builder states the window and its reason in the header; the safe default is 30 s, matching `use-sheet-refresh.ts`'s re-ask so a running row gets a fresh answer each cycle |
| **Bound** | 512 entries, oldest evicted. A cache with no bound in a process that runs for days is the defect a later round writes (entry `:31869`) |
| **Where it lives** | handed in on `ResolveEnv` (`resolve.ts:45-48`), so `resolveSessionLog` stays pure and a test hands it a fresh one. **Never a module-level cache.** |

**The clause a later round will delete, so it is written twice (entry `:31882`).** *The projects
directory's own mtime can only ever be a reason to DROP the cache and never a reason to trust it*,
because a new `<id>.jsonl` written into an EXISTING project directory does not move the parent's
mtime. What bounds the staleness is the TTL. What makes the TTL safe is that the normal first turn
writes to the **direct** path, which is never cached, so only the `cd`-elsewhere and symlink case is
delayed, and by at most the window.

**CORRECTION 3 — the first pass over N never-prompted rows still pays N scans, and the entry's
sentence can be read as saying otherwise.** Entry `:31882` says the cache saves "the 575 of 659 ms the
verifier measured in a warm pass over 161 rows". Those 161 rows are 161 DISTINCT ids, so nothing is
shared within one pass: the cache's win is the **second and every later ask of the same id inside the
window** — the sheet reopened, the 30 s re-ask, Details opened. The first pass after launch is
unchanged. The probe's C5 reading must therefore be taken on a **repeat** ask, and the four readings
of §7.1 name which.

### 4.3 The seam — the only two lines A writes for B

B declares in `resolve-cache.ts`:

```ts
export interface ResolveCache { /* get/set/size; B's shape */ }
export function createResolveCache(opts?: { ttlMs?: number; max?: number }): ResolveCache;
```

and adds `cache?: ResolveCache` to `ResolveEnv` (`resolve.ts:45-48`).

A adds, in `service.ts`, exactly these two things and nothing else on the resolve path:

1. `resolveCache?: ResolveCache;` on `OverviewServiceDeps` (`service.ts:64-86`), with the one-line
   reason and a note that it defaults to absent, which is today's behaviour.
2. `{ home: deps.home, cache: deps.resolveCache }` in place of `{ home: deps.home }` at
   `service.ts:241`.

B builds the one instance in `ipc.ts:101-105`. **One process, one cache, handed in** — the split
script of §7.1 proves two instances do not share one.

---

## §5 The two pinned refusals, in full

### 5.1 The watermark's optional field — NO schema change, NO `ALTER`

`store/schema.ts:33` is `OVERVIEW_SCHEMA_VERSION = 2`, every statement is `CREATE TABLE IF NOT
EXISTS`, and **the file contains no `ALTER` and no migration step** (confirmed by reading it): a bump
adds a table and cannot add a column, and the only other path is the drop-and-recreate reserved for a
store written by a newer build. But `schema.ts:51` declares `watermark TEXT -- JSON`, parsed at
`store/store.ts:325` and written at `:623` and `:655`. **An optional field on the watermark is a JSON
value and not a column.**

The field, exactly:

- Added to the `Watermark` union in `reader/watermark.ts:21-50`, **optional**, and to
  `buildByteOffsetWatermark` (`:97-115`). The safe spelling is a single optional boolean, e.g.
  `pathsRead?: boolean`. It is **written only when it is `false`**, so a page read's watermark JSON is
  byte-identical to today's and no stored row churns.
- **Absent means "the paths were read."** That is true of every watermark written before this phase.
- Stamped by `containers.ts` when the read ran with paths off and `work !== 'none'`. It is **never**
  stamped on a `work: 'none'` answer, because `containers.ts:275-286` returns the incoming `wm`
  verbatim and `service.ts:311` is `watermark: result.watermark ?? watermark` — so a counts read that
  finds the file unchanged cannot downgrade a page read's watermark.
- Read at `service.ts:279-285` as one more clause: the prior watermark is reused when the map version
  matches, the log path matches, **and** (paths are not wanted **or** the prior watermark did not skip
  them).

**What goes wrong if it is done the other way.** The counts read and the page read share one store and
one watermark. Without the field, turns first written by a counts read hold `turn_fact.paths` as
`'[]'`, and the next Catch Me Up read — whose watermark is satisfied — would never fill them. The page
draws its git marks from `turn.paths` at `src/main/overview/git-mark.ts:181`
(`const named = [...turn.paths, ...fromAnswer];`), so **Catch Me Up loses its git marks on every
session the sheet read first, silently and permanently.** That is the one way this phase can make
something worse, and the field is the whole of the fix.

And if it is done as a column instead: `ensureOverviewSchema` has no migration step, so the column
arrives only by the drop-and-recreate, which throws away every turn the store holds for a provider
that has since deleted its log. A patch release does not do that.

### 5.2 The `requireAnywhere` on a SPLIT rule, never the shared one

The narrowing goes on rules the paths-less read uses, with the **unrestricted** rule moved into
`codex.paths.prefilter`, which `containers.ts:266` already drops for a paths-less read. It never goes
on the rule the page also uses.

**What goes wrong if it is done the other way.** Put `requireAnywhere` on the single shared rule and
**the PAGE's admitted bytes change for every codex session, on every read**. Catch Me Up would stop
seeing `item_completed` records whose item is a `CommandExecution`, which is where
`codex.paths.from`'s `payload.item.command` lives — so every codex session's command paths, and the
git marks built from them, vanish from the page as well. It is the same loss as §5.1 and it needs no
watermark to trigger it. `ablation:p300` puts the requirement on the shared rule and
`conformance:overview`'s codex row must go red (entry `:31905`).

---

## §6 The probe — builder C

### 6.1 What `probe:p300` drives

ONE Electron through `withElectron` (`build/electron-run.mjs:883`), a scratch profile, a scratch
`HOME`, and the tmux socket `build/harness-socket.mjs` hands it. Every session is a shell; **nothing
is spawned and no token is spent**. The shape to copy is `build/p293/probe-p293.mjs`; the CDP half is
`build/cdp-client.mjs` over `build/cdp-target.mjs`, as `build/probe-p137-overview.mjs` uses them.
**A photograph is forbidden and `npm run shot` never runs.**

### 6.2 It SYNTHESISES its records

Under the scratch HOME, `build/p300/generate-codex-records.mjs` writes four codex records from the
committed fixture
`docs/research/assets/63-fixtures/codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl`
(8,731 bytes, 26 lines, counted here) into
`<scratch HOME>/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`, at **p50 68 KB, p99 5.9 MB,
200 MiB and 960 MiB**, matching the distribution entry `:31852` measured. The fixture already carries
all three item kinds the split turns on — `UserMessage` (line 6), `CommandExecution` (line 11),
`AgentMessage` (line 13) — so the generator grows a record by repeating `CommandExecution` records
between real asks and answers, which is the shape that makes the operator's records large. Manifest
rows are seeded through `src/main/harness/overview-seed.ts`, whose two refusals (`:36-45`) already
require an isolated harness launch and a profile under the harness directory. `MEASURE`: C confirms
`overview-seed.ts` needs no field; if it does, C owns the change and says so.

**Nothing under the person's home is copied out and no record of his is read** (entry `:31900`). Every
generated byte is deleted in a `finally`, and `gate:background` must see the generator and the
Electron both ended in a `finally` that names them.

The synthesised records must read `acct.prefilter === 'head'` and never `'wide'`, asserted through
`conformance:overview --real` over the same files, because a wide head measures a different thing than
a person pays.

### 6.3 Two instruments that share no clock

1. **A 20 ms ping from OUTSIDE main.** A loop injected into the renderer over CDP calls the existing
   cheap bridge door `window.gmux.settingsGet()` (`src/preload/index.ts:192` → `settings:get`,
   `src/shared/ipc/app.ts:428`) every 20 ms and records the worst round trip while the sheet's first
   ask runs. That is exactly what a person feels — main unavailable — measured the way `probe:p276`
   counts login shells from outside the app. **No new channel, no new `GMUX_*` name and no new harness
   smoke mode**, so `gate:contract` does not move.
2. **`perf_hooks.monitorEventLoopDelay`**, armed around `readSessionLog` inside the plain-node
   conformance run, never inside a shipped process and behind no flag.

**Their worst readings must agree within one frame.** Two instruments disagreeing means one is wrong
and the phase finds out which, the way the Phase 123 verifier did with its own cycle detector.

### 6.4 `HELPER_USER_FLOOR` 145 → 146, in the same commit

Confirmed: `build/assert-electron-teardown.mjs:250` reads `const HELPER_USER_FLOOR = 145;` and
`node build/assert-electron-teardown.mjs --list` printed **145** names, exit 0. `probe:p300` reaches
`build/electron-run.mjs`, so obligation 1 applies: adding a helper user can never turn `gate:electron`
red, so a floor left at 145 would let the new probe be deleted again in silence.
**`build/p300/probe-p300.mjs` is the one new helper user; `generate-codex-records.mjs`,
`ablation.mjs` and `split.mjs` launch no Electron.** If C's build makes more than one file reach the
helper, the floor rises by that many and the commit body names each.

---

## §7 The proof, and the operator's standing rule

### 7.1 What must be run

| Step | Command | What it must show |
| --- | --- | --- |
| **The split, FIRST** | `node build/p300/split.mjs` over `conformance:overview --real <file> --provider codex --repo <dir>`, at the parent and at HEAD | §3.3's stages, timed, on the records named there; and the rest of one record's 797 ms attributed to `reader/fold.ts` and `reader/expr.ts` **by name**. **A split that contradicts the recommendation stops the phase** (entry `:31875`) |
| **C5** | the twelve-run script over the real `~/.claude/projects`, read only, driving the shipping `resolveSessionLog` | parent: median near 19.5 ms, max near 30.8. HEAD: one `statSync` of the direct path plus one cache hit on the **second** ask of the same id in the window (§4.3). Two instances do not share one cache |
| **`probe:p300`** | `npm run probe:p300` | the four readings below, at `f6c11f57` and at this HEAD |
| **The matrix** | one row per resolved local session across every provider on this Mac, both commits | agent, provider, record size, read state, turn count, ask count, reply count, last-message clock, the drawn cell, and the read's own `work`, `prefilter`, `bytesRead`, `bytesParsed`. **No count may move and no cell's word may change, on any row, for any provider. A row that moves at all fails the arm, including upward.** |
| **`ablation:p300`** | `npm run ablation:p300` | as built, nine clauses; **as verified, FIVE**, one each, all red: the cache keyed without the home; the cache with no TTL; the cache covering the direct stat; the cache unbounded; the negative answer cached for a provider other than claude. The four clauses on the reduced read (the flag defaulting true on the page's read; the watermark field absent; the `requireAnywhere` on the shared rule; the head window made to depend on the caller) went with it |
| **Gates** | `typecheck`, `build`, `test`, `smoke:t1`, `conformance:overview`, `conformance:manager`, `ablation:p293` at 60 of 60 | `conformance:manager` proves the counts channel's answer is **byte-identical** |

**The four readings, at both commits, every one equal or lower at HEAD** (entry `:31901`): the worst
main-unavailable gap during the **first** ask over the 200 MiB record and over the 960 MiB record; the
same gap for a **WARM** pass in which every watermark is satisfied, because a cache and an extra
whole-line `indexOf` both cost something on the path that is already fast; the wall time of a 161-row
pass; and the worst gap for a **claude row with no record asked twice inside the window**, which is
C5's own reading (§4.3's CORRECTION 3). The verifier's 322 ms heartbeat gap is the fifth, measured the
same way at both commits.

**The attack, written by the verifier and not the builder** (entry `:31905`): a session whose turns
were first written by a counts read, then opened in Catch Me Up, whose git marks must be exactly what
they are today; a record appended to between the counts read and the page read; a claude row whose
record sits under a directory other than the direct one, asked twice inside the TTL and then again
after it; a claude row that gets its first turn while a negative answer is cached, whose record lands
at the direct path and must be found on the very next ask with no wait at all; two resolves in one
process with different homes; a cache asked 600 times for 600 ids against its bound; a codex vintage
that sorts its keys so `detectWideHead` trips; and the `requireAnywhere` on the shared rule.

### 7.2 The operator's rule — scenario, today, HEAD

**This phase is about TIME. A changed count is a regression here even if it looks like an
improvement**, and it belongs to Phase 299 instead. **No read may get slower and no count may
change.**

**AS VERIFIED.** The table the first build wrote is kept in the third column because it is the
prediction the app refuted; the fourth column is what the judge measured in the app (quiet machine,
interleaved parent and HEAD, synthesised records of the entry's own average line length, Electron
43's Node 24 / V8 15) for the build as it was, and the fifth is what LANDS, which is the cache alone.
Every scenario in the fifth column is today's number or better, and the reverifier takes it again.

| Scenario | Today (in the app) | First build predicted | First build measured | What lands |
| --- | --- | --- | --- | --- |
| Sheet opens, first ask, 200 MiB codex row (synthesised, 100 percent padding) | 377–447 ms | ~87 ms | 359–557 ms, a noise band; reader alone 290–303 vs 362–409 | today's |
| Sheet opens, first ask, 960 MiB codex row | 1692–1834 ms (4 runs) | ~½ s | **2103–2513 ms, worse in 4 of 4 pairs** | today's |
| The next ask after that first large read, any channel | no block, worst main gap 11–14.5 ms | — | **one block of 112–629 ms** | today's |
| Catch Me Up or the fold opened FIRST on a large codex record | 200 MiB 278–409 ms; 960 MiB 1613–1827 ms | "no change to the page's own read" | **200 MiB 429–700; 960 MiB 2345–2711, +31 to 55 percent** | today's |
| A second full read of one large record in one process (reader alone) | 200 MiB 297–361 ms, stable | — | 547 then 1244 ms; 960 MiB 9.5 s on the second | today's |
| Warm pass, every watermark satisfied | 27–34 ms | equal or lower | 20–28 ms | equal or lower |
| 161-row first pass, wall | 1794–1815 ms after the 960 MiB read | equal or lower | 1926–2237 ms, the block above and nothing else | today's |
| 161-row REPEAT pass inside the window | 1796–2210 ms | — | **11–13.5 ms, about 170x** | **11–13.5 ms**, the cache's |
| claude row with no record, first ask | 11–16 ms | unchanged | 12–13 ms | unchanged |
| claude row with no record, repeat ask in window | 8–10.5 ms | one `statSync` | **0.2–0.8 ms** | **0.2–0.8 ms** |
| Every count, every cell's word, every provider | — | identical | identical on every row of every arm and both engines | identical |
| Catch Me Up after the sheet read the record first (CORRECTION 4, once) | a stat plus a tail, 0.4–0.6 ms | a full read | 877 ms after 264 (200 MiB); 5933 ms after 3489 (960 MiB); with the split out and the flag kept, the parent's own full read, ~330–360 ms / ~1.6–1.8 s | **a stat plus a tail**, today's |
| The sheet open on a session still talking, folding chosen or Catch Me Up reopened, every 30 s cycle | a tail then a page read of none, 0.23–0.66 ms | not stated | **a full page read every cycle, 499–514 ms on 200 MiB, ~1.7 s on 960 MiB** | today's |

**CORRECTION 4 — the entry does not state this row, and the operator's rule is why it must be
stated.** §5.1's clause is correct and necessary, and its price is that a page read whose prior
watermark skipped the paths must re-read the record whole. Today that sequence — sheet first, Catch Me
Up second — costs the sheet ~800 ms and Catch Me Up a stat plus a tail. At HEAD it costs the sheet
~87 ms and Catch Me Up a full read. **No single wait at HEAD is longer than a wait that already exists
on that same surface today** (Catch Me Up opened first pays the full read today), and the **sum** of
the two is up to the decide cost higher, measured at 33 ms on the 186.8 MiB record. `MEASURE` both
sequences at both commits and put the numbers in the verdict. **Whether that counts as "a scenario
worse" is the operator's call, and no builder decides it.** The alternative is §5.1's silent loss of
the git marks, which is a correctness loss and is not an option.

**AS VERIFIED, and the operator's answer.** The probe never made a `paths: true` read, so CORRECTION
4's own `MEASURE` instruction was not carried out by the build; the judge measured it. As built the
sentence was false (page-after-sheet 877 ms on 200 MiB and 5.9 s on 960 MiB against page-first 331 ms
and 1.7 s today); with the split removed and the flag kept it became true again while the sum on 960
MiB was about 3 s against 1.7 s. And CORRECTION 4 priced ONE case where there were two: the sheet
re-asks every 30 s, a tail read that saw growth re-stamps `pathsRead: false`, and the fold's prepare
fires on turn end WITHOUT a person when folding is chosen, so a sheet open on a session still
talking paid a full page read EVERY cycle — 499 to 514 ms on 200 MiB and about 1.7 s on 960 MiB
against 0.23 to 0.66 ms today. Win and loss were one mechanism: the flag alone bought about a quarter
off the sheet's first read of a large codex record (960 MiB 1304–1336 vs 1782–1834 ms; 200 MiB
309–355 vs 443), with no block and the 170x intact, and cost those two re-reads. **The operator ruled
at 02:38 on 2026-09-21: DROP IT. Land the cache alone.** Two findings for whoever builds the flag
again: stamp only a byte-0 counts read and never a tail, or extract paths on the tail pass, which is
small.

### 7.3 `build/p293/SPEC.md` moves in the same commit

`build/p293/SPEC.md:89-92` states C4 and C5 as standing limits and `:2187-2188` states them with their
remedies. Both are rewritten in this commit to say what is true after it — including §8's open bound —
because a SPEC still stating these as standing limits is a SPEC a later round will build back.

---

## §8 The refusals, including the bound that stays open

- **No worker and no utility process.** `src/main/proc/identity.ts:81-84` keeps its two names and
  `src/main/symbols/pool.ts:4-21` says the budget has no free slot — "A fourth home for search work
  means deleting one of them first." A native-free worker would also leave `reader/resolve.ts` and the
  store write on main, so **it does not fix C5 at all**. The decision to spend a slot is the operator's.
- **No slicing.** `overview/activity.ts:138-143`'s yield stays between rows and not inside one,
  `reader/lines.ts:152-261` keeps its own loop, and `Fold` is still created inside `jsonlPass`
  (`reader/containers.ts:171`). Slicing is refused because its own failure shape — a live record
  restarting its read as `checkByteOffset` turns a changed size into a full read — is a **regression**
  under the operator's rule, and because `activity.ts`'s queue would hold the next ask for the whole
  sliced read.
- **THE BOUND THIS PHASE DOES NOT CLOSE, stated rather than hidden — AS VERIFIED, THIS PHASE DOES NOT
  MOVE IT AT ALL.** The first build wrote that the 959.5 MiB record would still hold main "about half
  a second" after a reduced read; measured in the app the reduced read held it 2.1 to 2.5 s against
  1.7 s today and was removed. What lands leaves the first read of a large record exactly what it is
  today: about 1.7 s on a synthesised 960 MiB record, about 0.4 s on the 200 MiB one, about 0.8 s on
  the operator's own 186.8 MiB record as measured on 2026-09-19. The measured direction for the queue
  is NOT slicing and NOT the reduced rule set: it is the scanner not copying a line it is about to
  reject — hold the chunk view instead of `Buffer.from(seg)` for a line that fits one chunk — which
  the verify's nocopy arm measured at **1122 ms on 960 MiB with no block**, and a line spanning chunks
  (his largest is 18.5 MB) still needs the copy path. That is a build with its own verification, not a
  drop for this fix. **Do not try to close it here.**
- **No partial count and no new word for one.** `NO_MESSAGES_WORD` is untouched and **no reading in
  this phase is partial.** Whether a row may ever say something honest about a number it has not
  finished counting — the tail-first read, and Phase 299's C6 `0+` — **is the operator's ruling and is
  not any builder's to answer. Build nothing that depends on it.**
- **No change to what any count means.** `LIST_ACTIVITY_SQL` (`store/store.ts:188-202`),
  `overview/activity-map.ts`'s truth table and `src/shared/overview.ts`'s invariants do not move.
- **No change to the page's own read.** Catch Me Up and the fold always read with the path index. AS
  VERIFIED this sentence was true of the admitted bytes and false of the work: the split's two
  whole-line `indexOf` misses ran on every `item_completed` line before the paths rule admitted it and
  the page read was 31 to 55 percent slower on every large codex record. With the split removed the
  page reads the parent's rule set byte for byte, and `probe:p300` now has a page arm so the gate can
  see the page from now on.
- **No schema change and no migration.** `OVERVIEW_SCHEMA_VERSION` stays at 2, no column is added, no
  `ALTER` enters a file that has never had one. Nothing new deletes and nothing back-fills. **No new op
  in the keep-map engine** either: codex gains the shape claude already has and `class` is still read by
  nothing.
- **No cache for any other provider's fallback.** Counted for the entry (`:31868`): cursor 52, grok
  152, gemini 311, pi 305, omp 61 entries against claude's 2,776 — claude is nine times the next
  largest. **Widening the cache without measuring is how a cache becomes a source of wrong answers.**
- **No narrowing of any fallback loop.** `resolve.ts:138-141` still accepts `<id>.jsonl` anywhere under
  the projects directory, because a session can `cd` and a project can be opened through a symlink.
  What is added is a memory of an answer, not a smaller place to look.
- **No contract change**, so `docs/audits/contract-baseline.txt` does not move and its channel count
  stays at 235. **No photograph, and `npm run shot` never runs. No release.**

---

## §As built — every difference from this SPEC, and why

Written by the integrator on 2026-09-20 over the three builders' work. Where this SPEC and Phase 300's
backlog entry disagreed, **the entry won and the difference is named here**.

### A. What the integrator CHANGED after reading both sides

1. **The head window no longer depends on the caller, and this is the one behavioural change of the
   integrator's round.** `readJsonl` (`src/main/overview/reader/containers.ts`) had one rule set: the
   reduced one went to `compileHead` AND to `detectWideHead`. `detectWideHead` is what decides how
   many bytes of each line the head test may look at, so it is a shared code path that now answered
   differently for the counts read than for the page — which is exactly the defect class §1 tells the
   integrator to catch. The build's defence was directional (a smaller rule set can only narrow the
   window, so a marker late in the reduced set is late in the full set too, so whenever the reduced
   read is the narrow one every shared marker is inside the narrow window) and **that last step is
   only true of the SAMPLE**: `detectWideHead` reads the first 64 KiB, so a shared marker late in a
   LATER line is found by a 4 MiB window and missed by a 200 byte one. On grok — the one provider
   whose paths head no shared rule carries — that is a moved count, which is the one thing this phase
   forbids. There is now `detectExtra` (always the full set) beside `compileExtra` (the flag's only
   reach). It costs nothing: for codex and claude the two sets give the same answer anyway. Pinned
   three ways — a text rule in `p300-paths-flag.test.ts` read over the shipping source, rule P2 of
   `conformance:overview` (now true by construction, and kept as the thing that goes red if a later
   round undoes it), and **`ablation:p300` clause 9**, which hands the detector the reduced set and
   must redden the pin.
2. **Two raw NUL bytes removed from the source.** `reader/resolve-cache.ts`'s `const SEP` held an
   actual 0x00 byte inside its string literal, and `p300-resolve-cache.test.ts` held another inside
   its key-collision assertion. Both are now the escape backslash-u-0000 written as six characters, which is
   the same value and no control byte. **The phase's own control-byte scan did not catch them**, and
   why matters for the verifier: `LC_ALL=C grep -nP` over the control-byte class, run on a file that
   contains a NUL, classifies the file as BINARY and reports nothing, exiting 1. It needs `grep -a`.
   Two builders read the value as a space and filed a finding that the module's "NUL separator"
   comment contradicted its code; the comment was right and the bytes were the problem.
3. **`ablation:p300` is 9 clauses, not 8.** Clause 9 is item 1 above. The entry's `:31906` names
   eight and a new rule owes an ablation, so the ninth is named as the integrator's in the script, in
   `verification-checks.mjs` and in §7.1's table.
4. **43 backlog citations corrected across 7 files.** Every `docs/BACKLOG.md:318xx` pointer written by
   this phase — in `split.mjs`'s printed `ENTRY_FLOORS`, `probe-p300.mjs`, `generate-codex-records.mjs`,
   `overview-conformance-probe.mts`, `conformance-overview.mjs` and this SPEC — pointed at a blank
   line or at the wrong bullet. Both builder B and builder C filed a finding about this and **both of
   their correction tables were themselves partly wrong**, so the map was re-derived by grep against
   the tree and is recorded here as the one source: verifier's numbers `:31846`, claude store
   `:31848`, C5's twelve runs `:31850`, codex store `:31852`, where the 797 ms is NOT `:31854`, where
   it IS `:31856`, the two rejected narrowings `:31858`, the one narrowing that pays `:31860`, the
   source bullets `:31862` to `:31872` (C4's yield `:31864`, the counts read `:31865`, the FIRST read
   `:31866`, C5 warm `:31867`, the other fallback loops `:31868`, the mode flag `:31869`, the worker
   budget `:31870`, the instrument `:31871`, what a person feels `:31872`), option 3 `:31882`,
   option 4 `:31884`, the recommendation `:31888`, the refusals and the open bound `:31890`, the
   operator's call `:31892`, the proof `:31894` to `:31907`, what is NOT `:31909`.
5. **`measure:p300-split`'s entry in `verification-checks.mjs` moved below `measure:p274-volumes`.**
   It had been inserted between p274's comment block and p274's own call.
6. **`timeStages`' decide instrument detects over the full rule set**, for the same reason as item 1:
   an instrument that models a reader the tree does not ship measures the wrong thing.
7. **The running-log line and `conformance:overview`'s P3 comment were rewritten** to say the grok
   hole is closed structurally rather than carried as a named risk.

### B. What this SPEC got wrong, confirmed by the build

- **CORRECTION 1 is real and is not a nicety** (builder A). Entry `:31884`'s single
  `requireAnywhere: ["AgentMessage"]` rule drops every `item_completed`/`UserMessage` ask, `decideWhole`
  ANDs, and `codex.turn.dropTurnsWithNoAsk` is true — so on a vintage that spells every ask that way the
  entry's own rule reads 0 turns. The split is `"UserMessage"` and `"AgentMessage"` as bare quoted
  VALUES, never `"type":"UserMessage"`, so a vintage writing a space after the colon cannot drop an ask.
- **CORRECTION 2's proposed invariant is RED at the parent** (builders A and C, independently). grok's
  paths head is `"sessionUpdate":"tool_call"` and no shared grok rule carries it. It is a named
  exception in the gate; item A.1 is why it can no longer bite.
- **§5.1 named only the byte-offset watermark and needed all three arms** (builder A). `ReadInput.paths`
  suppresses `extractPathsFromText` for every container, so with the mark on one arm a counts read of a
  `whole-doc` (deepseek, copilotide) or `content-hash` (cursor, cursoride) row would write empty
  `turn_fact.paths` and the next page read would answer `work: 'none'` and never fill them — the exact
  C4 regression, on four providers. The mark is on all three arms and stamped at all four fresh-watermark
  sites; every `work: 'none'` return still hands back `input.watermark` verbatim, so a counts read cannot
  downgrade what a page read recorded.
- **§2's file list is missing `build/verification-checks.mjs`** (builder C) and
  `build/p138-drift-dump.mts` (builder A), and it undercounts the `readSessionLog` call sites in
  `build/overview-conformance-probe.mts` at two where there are five. `build/` is not in
  `npm run typecheck`'s program and the module is typed `any` there, so an omitted flag would have read
  as `false` and silently dropped the index.
- **§4.3's declared `createResolveCache` signature has no clock** (builder B). The shipped one takes an
  optional `now`, additive and defaulted, because the TTL ablation and the TTL attack both need one.
- **`ablation:p293` is 69 ablations, not the "60 of 60" the entry's `:31907` states.** It passed at 69.
- **The open bound reads about a second, not "about half a second"** (builder C, reproduced by the
  integrator). Entry `:31890` estimates 233 ms of scan plus roughly 300 ms of decide on the 959.5 MiB
  record; `measure:p300-split` over a synthesised record of that size and of the entry's own average line
  length measures 215 ms of scan, which agrees, and about 1.0 s for the whole reduced read, which does
  not — the estimate does not carry the head pass over every line. `build/p293/SPEC.md` says a second.
- **`monitorEventLoopDelay` as §6.3 describes it samples nothing** (builder C). Armed and disabled around
  a synchronous call it takes zero samples. The instrument awaits a tick on both sides and fails on a
  zero-sample histogram.

### C. What is NOT proven, and must not be read as proven

- **Every timing claim.** No Electron ran, `probe:p300` is unexecuted and syntax-checked only, and no
  parent-commit build exists in this worktree. The four readings of entry `:31903`, the 20 ms ping's
  agreement with `monitorEventLoopDelay`, the per-row matrix of `:31905`, the heartbeat and the warm
  pass are all the app run's, at both commits.
- **Every number the entry states about the operator's own store.** 26,312 codex records at 11.76 GB,
  2,776 claude project directories, 107.4 MiB, 13,946 lines, 0.5 MiB, 544 lines, 151 ms, 33 ms, 204 ms,
  87 ms, 19.5 ms, 1.9 ms, 575 of 659 ms. **Not one of them was re-measured and nothing under his home
  was read.** Where `measure:p300-split`'s synthesised readings agree in shape (215 against 233 ms of
  scan on 960 MiB; 47.6 against 53 ms on 200 against 186.8 MiB) that is agreement on different bytes.
- **grok's sorted-key case.** No fixture exists. Item A.1 makes it unable to move a count, and that is
  an argument about the code rather than a reading.
- **The Catch Me Up cost of the mark, which the entry states as "once".** A counts read that RESUMES and
  writes new turns stamps `pathsRead: false` again, so a sheet left open on a running session re-arms the
  page's full read every 30 s. The entry's phrase "pays a full read of that record once" is true of a
  quiet session and not of a session the sheet is watching. A watermark carrying the offset at which the
  index stopped being filled would close it; that is a design change and is deliberately NOT in this
  phase, and it is the integrator's first open concern for the verifiers.
- **`out/p300-split/home/.codex` is left behind as empty directories** by `measure:p300-split`. Every
  generated BYTE is deleted in the `finally` (0 B measured), `out/` is gitignored, and the scaffolding is
  not removed.
- **`probe:p300` launches with `GMUX_SHOT` set**, because that branch of `src/main/harness/index.ts` is
  the only door to a seeded manifest and `GMUX_SHOT_JS` is the read-back knob. It writes a scratch PNG
  that is never read, never compared and deleted. The precedent is `build/p276/probe-p276.mjs:1052-1060`,
  which does the same. If that counts as a photograph it is a spec question and not a build one.

---

## §As verified — the fix round, 2026-09-21

Written by the fixer after the Tier 3 verify (three lenses — attribute, re-derive, parent — and a
judge; the verdicts are the main session's scratchpad files `p300-verdict-{judge,attribute,rederive,parent}.json`).
The verdict was `needs_work`, separable, and the fix runs once.

**What the judge attributed, mechanism by mechanism.**

- **(A) the resolve cache** — `reader/resolve-cache.ts`, the `cache` option on `ResolveEnv` in
  `reader/resolve.ts`, one instance in `overview/ipc.ts`, the `resolveCache` dep in `service.ts`.
  Owns the 170x (a repeat pass over 161 never-prompted claude rows 1796–2210 → 11–13.5 ms) and the
  0.2 ms repeat ask. Regresses nothing: the nocache arm kept every slowdown and lost only the 170x;
  the resolver alone reads 10.6 vs 10.7 ms per row. **KEPT.**
- **(B) the keep-map split** — codex's single `{class: any, head: "item_completed"}` rule split into
  ask/answer rules with `requireAnywhere`, plus `codex.paths.prefilter`, carried by
  `compileExtra`/`detectExtra` in `reader/containers.ts` and `compileHead`'s extra rules. On the
  engine main runs it made the FIRST read of a 960 MiB record 15 to 47 percent slower (1692–1834 →
  2103–2513 ms, 4 of 4 quiet pairs), the PAGE read 31 to 55 percent slower, compounded across reads in
  one process, and left a 112–629 ms block on the next ask; §7.1's deciding instrument ran under node
  22 where the same read is 2x faster. A defect on its own target, not a trade. **REMOVED** under the
  operator's rule; `keep-map.json`, `containers.ts` and `lines.ts` are the parent's byte for byte.
- **(C) the paths flag and its watermark stamp** — `readOneRow`'s `paths` parameter and third
  watermark clause, `stampPathsRead`/`watermarkSkippedPaths`, `ReadInput.paths`, the four stamp
  sites. About a quarter off a cold open of a large codex record; a full re-read on every Catch Me Up
  and every automatic fold while the sheet watched a talking session, ~1.7 s a cycle on 960 MiB
  against under a millisecond today. The operator's trade, and **he dropped it at 02:38 on
  2026-09-21**; `watermark.ts` and `index.ts` are the parent's byte for byte.

**What else the fix round changed.**

- `probe:p300` drains the pinger before reading its worst (the judge re-derived from the builders'
  four runs that every `worstPing(N)` was `wall(N-1)` minus about 20 ms, one label late), grades a
  pass on its wall and every other reading on the drained worst ping against the worst of one or more
  parent runs, reads a ping-graded delta inside one ping period as unresolved because the stuck
  ping's phase is up to one period, gains two page arms (`page-after-sheet`, Catch Me Up's read of the
  960 MiB record the sheet has just counted, a stat and a tail today; and `page-first`, Catch Me
  Up's read of a fifth, untouched 200 MiB record, the page's own full read) and a `first-small` arm
  over p50 and p99 so that `warm` is warm (the first build folded those two first reads into it), and
  takes its prefilter pin through the CHECKOUT'S OWN conformance script so the parent arm's pin is a
  parent reading.
- `build/p300/split.mjs` runs its stages under Electron's own node (`ELECTRON_RUN_AS_NODE=1` on the
  electron dist's binary) by default and prints `process.versions.v8`; it is demoted from the deciding
  instrument to a measurement in its header AND in its exit code, which now fails on nothing but a
  read that failed or two instruments more than a frame apart. `conformance:overview --real` prints
  the prefilter mode on its provider line and its `--stages` line carries the engine.
- `conformance:overview`'s rule 9 (P1–P4) and the `nopaths-*` cases are gone with the flag they
  compared; `ablation:p300` is five clauses; the flag's own test file and every test case asserting the
  split or the stamp are deleted (the commit body names them).
- The generator gained a fifth record, `page`, and follows the fixture Phase 299 grew to 30 lines.

**What is still not true.** The window does not keep painting while a large conversation is counted
for the first time: the read is still on the main thread and the sheet still draws `…` until it
finishes, exactly as today. The folder comparison Phase 299 handed over is still not built, and
nothing landed here makes it easier or harder. The 200 MiB class on a record of the operator's own
shape (58 percent `item_completed` against the synthesised 100) was never measured by any run.
