# Phase 355 — the conversation reader can finish a line with bytes it never read — SPEC

Written by the spec step on 2026-11-03 in `/private/var/tmp/tortie-wt/wt-p355`, a detached worktree at origin/main
`91077c5e` ("docs(backlog): 352 landed, and the # folder bug joins 353"). **`git diff 91077c5e` in the worktree must be
exactly Phase 355's delta**, this file included. origin/main moves while the phase runs (Phase 350 lands beside it);
nobody here rebases, pulls or merges. The charter is `docs/BACKLOG.md` "## Phase 355" (`:44433`), binding as written
with its mechanism, its proof and its refusals, and the measurements behind it in `build/p352/SPEC.md` "Found, not this
phase's, owed an entry" (`:1056-1068`). Phase 352's §4.7 (`:531-542`, the 310 view) is the code beside this fix that
must not move. Started on his word of 2026-11-03: "Start it now". His standing rulings bind: no regression against
today; just enough words; nothing released, tagged, version-bumped, archived or uploaded.

| | |
| --- | --- |
| Subject | `fix(overview): the reader finishes a line only from bytes it read` (the entry's) |
| First body line | `Phase 355: no stale bytes in a conversation's last line` |
| Semver | Patch, unreleased, Mac only, released on his word |
| Lane | Build: Spec → Build (ONE builder) → [Integrate] → Verify (Tier 3) → [Fix once → Reverify] → Commit |
| Tier | **3**: the read path every count and every Catch Me Up page comes from, and the defect reads memory that was never the file's (the entry) |
| The fix | **The entry's second spelling**: the newline search runs over `chunk.subarray(0, n)`, taken once per read (§1.1 D1, by measurement, §2.4) |
| Menus | **No change.** No surface is added, renamed or removed |
| Contract | **No change.** No channel, schema, `gmux.*` key, `GMUX_*` name or smoke mode; `docs/audits/contract-baseline.txt` does not move |
| `HELPER_USER_FLOOR` | **Unchanged.** No script reaching `build/electron-run.mjs` is added; no probe and no ablation script is committed (D9) |
| CHANGELOG | **One item** under `## Unreleased`, `### Fixed` (§5): a count a person reads moves at the parent (§2.2, §2.5) |
| Map versions | **Unchanged** (claude 2, codex 2, every other provider 1, as `conformance:overview` pins them); Q1 |

## 0. The hard rules, stated once (the builder, an integrator if the workflow runs one, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p350*`.
- Scratch lives under `/private/var/tmp/tortie-wt/scratch/p355/<role>/`, never under `/private/tmp`, which macOS cleans.
- **THE RECORDS THIS READER READS ARE HIS CONVERSATIONS.** Never read his keychain, credentials, `~/.ssh`, `~/Keys`,
  `~/.claude`, `~/.claude.json`, `~/.codex`, any agent's or conversation store, his shell history's contents, or his live
  Tortie profile. Every record read in this phase is a committed fixture under `docs/research/assets/63-fixtures/` or one
  the reader of this file writes under its own scratch. A scratch `HOME` for every process.
- `-L gmux` is named only by `build/electron-run.mjs`'s own read-only census, around a launch that names a scratch
  `tmuxSocket`. Nothing of yours aims at it.
- **No real agent runs, not even for a version.** Every app run writes
  `writeHiddenAgents(profile, '<prefix>', hiddenAgentsBesides([]))` from `build/hidden-agents.mjs` before its launch and
  reads `AGENTS_LIST_EXPR` back (`standInsOnlyVerdict(list, { standIns: [] })`); a run whose answer is not ok is
  UNREADABLE. Every Electron APP goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch
  profile, `HOME` and socket.
- **A timing that is evidence runs under Electron's own Node** (`ELECTRON_RUN_AS_NODE=1` and
  `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`, as `build/p300/split.mjs` does), never plain node.
  The engine is printed beside every number (Electron 43.3.0, Node 24.18.1, V8 15.0.245.23-electron.0 at this head).
- His shell history is never written by us: every command that does not launch an Electron app runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` with a scratch `HOME` and `ZDOTDIR`,
  `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset. `/bin/ps` will not start inside it, so the four native tests that
  start `/bin/ps` (`ps.native.test.ts` twice, `process-table.native.test.ts`, `p269-env-names.test.ts`) fail there by
  design: name each, never run them outside the block. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history`
  before and after every run that starts a shell or the app. His own terminals append on their own: a move across an
  unblocked run means start nothing for 3 minutes and stat again; moved again is his, still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming them. Every
  process you start ends in a `finally`, and **a writer that grows a record while it is read is bounded by a hard
  deadline and killed by pid in a `finally`**. No Simulator; nothing under `ios/` moves. No real Tailscale, DNS, APNs or
  ssh; never `smoke:remote` or `smoke:machines`.
- Never import a `build/` script to inspect it; read it as text. Importing `build/electron-run.mjs` and
  `build/hidden-agents.mjs` to USE them is how a probe launches.
- The lock has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p355 <role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>`. Every probe, app
  run, `ELECTRON_RUN_AS_NODE` run and timing holds one; Phase 350 takes slots too. `df -h /` before any build; under
  8 GB free, wait and report.
- Run gates as `node build/<gate>.mjs` or with `npm_config_update_notifier=false`: a bare `npm run` printed npm's
  update notice, which is a registry request (§15).

## 0.1 What the entry got wrong at this tree (the tree wins; each correction binds the builder)

1. **Citations.** The read is `src/main/overview/reader/lines.ts:237`, the unbounded search `:242`
   (`const nl = chunk.indexOf(10, i);`), the segment `:244`, Phase 310's view `:264`. `nl` is a `const`, so the entry's
   first spelling needs `let`; it is not chosen (D1).
2. **"869 or 870 lines run to run" is the engine's allocator, not the record.** A record longer than one chunk reads the
   same every run on both engines (§2.1: 10 of 10, every chunk size tried): the bytes past `n` are the previous read's,
   byte for byte. A run-to-run difference needs a FIRST read shorter than the chunk (a record under 1 MiB, or every
   tail read from a watermark), whose remainder no read of this scan wrote, and then depends on what memory the engine
   hands back: under Electron 43's node 0 of 38 such reads finished a line, and a fresh 1 MiB `Buffer.allocUnsafe` held
   zeros in 80 of 80 probes; under node 22.23.1 (the vitest lane) 10 of 38 did, and 52 of 80 fresh buffers held an
   earlier buffer's newlines (§2.1). The entry's first record reproduces exactly in shape: 217 bytes past the end, its
   last line 39 bytes of the file and 216 of the read before (§2.1, row 1). Main's own allocator in the app is not
   measured here (§10.2 states it); the fix does not depend on it.
3. **What a person meets is wider than "a line made partly of bytes that were never in the file".** The finished line
   usually fails `JSON.parse` and is dropped, and what moves is the count and the watermark: past the end of the record,
   so the next read re-reads the whole record (§2.2, case S: 1,117,851 bytes where 751 sufficed). When it parses, a
   record that is not in the file is folded: a reply drawn on the open turn before its line was written, spliced from
   another record (§2.5: 41 of 227 cut points), or a turn marker that opens a phantom turn (§2.3). When the record
   grows during the read, the split record is LOST and its turn closes without it, for good (§2.2, case G: the session's
   replies read 4 where the record holds 5, after the next read too).
4. **The CHANGELOG condition is met**: a count a person reads moves (the replies on record, case G) and a reply is drawn
   that the record does not hold (§2.5). One item (§5).
5. **Two tests exist only to step around this defect and move on purpose**: `p310-scan-views.test.ts`'s STATED LIMIT
   (`:516-525`) and its sizing of every unfinished record to end where a chunk ends (`:400`, `:552-557`).
6. **The research 63 reference reader carries the same search** (`docs/research/assets/63-keep-map/lib/lines.js:90`)
   and stays as it is: `conformance:overview --reference` runs it as the control that must keep its defects, and the
   new defect row is asserted to BITE there (§2.7).
7. **"conformance:overview at both builds, every row that moves named"**: no existing row can move. Every committed
   record the scanner reads ends in a newline (the 10 JSONL records, §2.8) and every record the probe derives is written
   with one, and a record whose last byte is a newline never sends the search past `n`. The gate gains one row on
   purpose (§4.4).

## 1. The answer first

| | Verdict | One line |
| --- | --- | --- |
| **355** | **build** (Tier 3) | `scanFile` searches `chunk.subarray(0, n)` for each line's newline, so a line is finished, counted, handed or used for the watermark only from bytes the read returned; nothing else in the reader moves |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The second spelling**: after `acct.bytesRead += n;` (`lines.ts:239`) one line `const got = chunk.subarray(0, n);`, and `:242` becomes `const nl = got.indexOf(10, i);`. `seg` (`:244`) and the view (`:264`) are not edited | Measured (§2.4). Both spellings read correctly in all 2,499 attack cases, but (a) the first still SEARCHES past the read: 217 bytes on the entry's record, 434,137 on a record under one chunk and 1,032,153 on a 16 KiB tail read, against 0 for the second; (b) that search is the parent's cost too, and the second is 16 to 51 µs faster per read of a record whose last line is unfinished (every read of a conversation being written), equal elsewhere; (c) the bound is structural: there is no byte past `n` in what the search sees, where the first spelling is a second statement a later edit can drop or widen by one (the `nl > n` ablation fails 25 of 1,392 cases, §2.4) |
| D2 | Nothing else in `lines.ts` moves: `compileHead`, `decideHead`, `decideWhole`, `detectWideHead`, `finishLine`, the head window, every `ScanAccounting` field's meaning, the view line `:264` byte for byte. The header gains a Phase 355 paragraph; the `scanFile` docblock says the search sees only the bytes a read returned | Entry mechanism 2; §0.1 item 1 |
| D3 | `containers.ts`, `watermark.ts`, `fold.ts`, `expr.ts`, `map.ts`, `index.ts`, `keep-map.json` and `service.ts` are not edited | Entry: "Nothing else in the reader moves"; the survey (§2.6) finds no other site that reads past a read |
| D4 | No map version moves (no stored watermark is retired) | Entry refusal ("No change to what is admitted, parsed or counted beyond a line that was never whole"); a bump re-reads every session of a provider once, a slower first Catch Me Up, which is worse than today on every Mac it reaches. Damage already stored stays until that session is read whole again: Q1 |
| D5 | The vitest that holds the bound is a new `src/main/overview/__tests__/p355-scan-bounds.test.ts` (§4.3); `p310-scan-views.test.ts` loses its STATED LIMIT and its chunk-end sizing (§4.2) | §0.1 item 5; the house's one-file-per-phase test shape |
| D6 | `conformance:overview` gains `lines` on every read, one derived record `codex-unfinished` built only from the committed codex fixture's own records, and one defect row, asserted fixed in product mode and asserted to BITE in `--reference` (§4.4) | Entry proof ("conformance:overview at both builds"); the gate's own house pattern for derived defects (`conformance-overview.mjs:585-725`); §2.7 measured it red at the parent on both engines, 3 of 3 |
| D7 | The gate's derived record is the M7 shape exactly, not the reply sweep | §2.5 and §2.7: a reply sweep over the committed records drew no reply at the parent in 223 of 223 cuts (their tails never close the JSON) and costs 2.8 to 3.3 s; M7 is red at the parent on three readings at once, deterministic, for three reads (about 15 ms each by §2.7's sweep) |
| D8 | CHANGELOG one item (§5); `CLAUDE.md`'s `conformance:overview` row one sentence (§4.5) | §0.1 item 4; CLAUDE.md "Gates before any commit" |
| D9 | No probe and no ablation script is committed; the builder runs §10.1's ablation arms in a scratch clone, and the in-repo proof that the new clauses can fail is the gate's `--reference` row (the reference reader carries the same search) and the new test's own self-checks (§4.3 a, b) | Phase 352's 310 precedent (its ablations ran in a clone); keeps `HELPER_USER_FLOOR`, `package.json` and `build/verification-checks.mjs` still |
| D10 | ONE builder, `reader`, owns every file of the delta (§9.1). An integrator step, if the workflow runs one, has no seam to reconcile and runs §11 | One domain, seven files |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block, against the SHIPPING `src/main/overview/reader/` at `91077c5e` (called
"parent" below) or against scratch copies of its seven JSONL-path files (`containers.ts`, `expr.ts`, `fold.ts`,
`lines.ts`, `map-types.ts`, `map.ts`, `watermark.ts` and `keep-map.json`) made by `bin/make-trees.mjs`, each edit
asserted to apply once: **treeP** byte for byte (a control: it read exactly as the worktree in every case, §2.2),
**treeA** the first spelling, **treeB** the second, **treeA1** `if (nl > n) nl = -1;` and **treeB1**
`chunk.subarray(0, n + 1)` (the two one-byte-wide ablations). Scripts, records and logs:
`/private/var/tmp/tortie-wt/scratch/p355/spec/` (`bin/`, `m355/`, `logs/`). Engines: **Electron** = Electron 43.3.0,
Node 24.18.1, V8 15.0.245.23-electron.0 through `ELECTRON_RUN_AS_NODE=1`; **node** = the gates' node 22.23.1 (from
`.nvmrc`), V8 12.4.254.21-node.56. TypeScript through the pinned `node_modules/tsx/dist/cli.mjs`. One lock slot
(`electron.lock`) for every Electron and timing run.

### 2.1 M1: the defect, re-measured at `91077c5e` (the SHIPPING `scanFile`, no prefilter)

`bin/m1-defect.mts` writes JSONL-shaped records of 256-byte lines whose last line has no newline and reads them with the
shipping `scanFile`; `bin/m1-run.zsh` runs every case in 10 fresh processes per engine; `bin/summarize.mjs` reads the
distinct readings. "Whose" is checked byte by byte: a byte at file offset `q` past the end equal to `file[q − chunk]` is
the previous read's.

| Record, read | Size | Truth: lines, last whole line ends | Parent: lines, `lastCompleteOffset` | Past the end | The last line handed | Electron: 10 runs read | node: 10 runs read |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.5 MiB, last line 39 bytes, shipping 1 MiB chunk | 1,572,903 | 6,144, 1,572,864 | **6,145, 1,573,120** | 217 | 255 bytes: 39 real, **216 the previous read's** | the same 10 times | the same 10 times |
| the same, chunk 64 | 1,572,903 | 6,144, 1,572,864 | **6,145, 1,572,928** | 25 | 39 real, 24 the previous read's | the same 10 times | the same 10 times |
| the same, chunks 4,096 and 65,536 | 1,572,903 | 6,144, 1,572,864 | **6,145, 1,573,120** | 217 | 39 real, 216 the previous read's | the same 10 times each | the same 10 times each |
| 1,678,214 bytes, last line 200 bytes, 1 MiB chunk | 1,678,214 | 7,171, 1,678,014 | **7,172, 1,678,270** | 56 | 200 real, 55 the previous read's | the same 10 times | the same 10 times |
| 600 KiB (under one chunk: the first read is short) | 614,439 | 2,400, 614,400 | 2,400, 614,400 | 0 | — | 10 of 10 right | 10 of 10 right |
| a tail read of the last 20,000 bytes from a watermark | 1,572,903 | 78 from the read's start, 1,572,864 | — | — | — | 10 of 10 right | **2 of 10 finished the line from memory no read wrote** (4,841 and 216 bytes past the end) |
| 600 KiB after another 1 MiB record was read and let go, 6 rounds × 3 processes | 614,439 | 2,400, 614,400 | — | — | — | 18 of 18 right | **8 of 18 finished it** (34 to 11,938 bytes past the end); the other record's marker in none |

`bin/m1-alloc.mjs`, a fresh `Buffer.allocUnsafe(1 MiB)` after 1 MiB buffers filled with newlines were let go, 40 rounds
× 2 processes: **Electron 0 of 80 held a newline (80 of 80 all zeros); node 22.23.1 52 of 80 held one** (24 and 28).
Under `/usr/local/bin/node` 22.14.0, outside the supported range, the record under one chunk finished in 3 of 10 runs,
up to 208,883 bytes past the end; it is not an engine anything ships on and is not read further.

### 2.2 M2: what a person can see, through the SHIPPING `readJsonl` and codex map (Electron)

`bin/m2-reader.mts`, codex-shaped records the script writes (shapes copied from the committed codex fixture), past one
chunk with lines the codex head refuses, then whole turns. Read the way `service.ts` reads: a first read, then a read
from its watermark, merged the way `store.replaceTurnsFrom` merges (`service.ts:331-340`).

**Case S, a last line not finished when it is read** (record 1,117,200 bytes, the unfinished line at 1,117,100):

| | Watermark offset | `lines` | The next read, after the line finishes |
| --- | --- | --- | --- |
| parent (and treeP) | **1,117,767 (567 past the end), no turn open** | **1,112** | **`full`, 1,117,851 bytes** |
| treeA, treeB | 1,117,100 (the unfinished line's start) | 1,111 | `tail`, 751 bytes |

**Case G, a record that grows while it is read** (`fs.readSync` wrapped: after the scanner's first short read, the rest
of turn 3's unfinished `task_complete`, turn 4 and turn 5's opening arrive before its next read; 31 reads, the hook
fired in every tree):

| | Turn 3 after the growing read | After the next growth, merged as the store merges | Replies on record |
| --- | --- | --- | --- |
| parent (and treeP) | **no reply, no duration** (its `task_complete` split by a stale newline, both halves dropped) | **turn 3 still has no reply**: the watermark moved on to turn 5's opening | **4 of 5** |
| treeA, treeB | "REPLY 3", 10,003 ms | equal to a whole read | 5 of 5 |

### 2.3 M4: a finished line can parse (a phantom turn)

`bin/m4-gate-shape.mts`: the committed codex fixture's first record, 1 MiB and 64 KiB of head-refused padding lines,
lines 2 to 27, and 120 bytes of line 28 (a `task_started`). At the parent the 120 bytes plus the previous read's
`xxx…"}}` PARSED: a `task_started` whose `turn_id` ends in padding, which opened a turn. Parent: `lines` 1,140 of
1,139, the watermark **open** at 1,123,472; treeB: 1,139, not open. Both engines, 3 of 3. (D7 uses committed records as
filler instead, §2.7.)

### 2.4 M3: the decision, measured (Electron)

`bin/m3-decide.mts`. **Part 1**, the bytes the newline search examines PAST the bytes the read returned, counted exactly
by wrapping `Buffer.prototype.indexOf` and `fs.readSync`:

| Read | parent | treeA | **treeB** | treeA1 (`nl > n`) | treeB1 (`n + 1`) |
| --- | --- | --- | --- | --- | --- |
| 1.5 MiB, last line unfinished, 1 MiB chunk | 217 (lines wrong) | 217 | **0** | 217 | 1 |
| 600 KiB, last line unfinished, 1 MiB chunk | 434,137 | 434,137 | **0** | 434,137 | 1 |
| a 16 KiB tail read from a watermark, last line unfinished | 1,032,153 | 1,032,153 | **0** | 1,032,153 | 1 |
| 1.5 MiB, last line unfinished, chunk 64 | 25 (lines wrong) | 25 | **0** | 25 | 1 |
| 1.5 MiB, every line finished (control) | 0 | 0 | 0 | 0 | 0 |

**Part 2, the attack**: a 720-byte record of 23-byte lines and a last unfinished line of 58 bytes, cut at every byte
(1 to 58), at chunk sizes 1, 2, 3, 5, 7, 8, 13, 16, 31, 64, 100 and 4,096 and starts 0 and 5, each against a reference
reader that splits the whole file at newlines: 1,392 static cases, **25 of them with the previous read's newline exactly
at the read's end** (`chunk[n]`); and the same cuts growing during the read (the rest of the line and one more line
arrive after the first short read), 1,107 cases where the growth fired:

| | Static wrong | Static past the end | Growing wrong |
| --- | --- | --- | --- |
| parent | **294** | 294 (25 of them at size + 1) | **294** |
| treeA | 0 | 0 | 0 |
| **treeB** | **0** | **0** | **0** |
| treeA1, one byte too wide | **25** | 25 | **25** |
| treeB1, one byte too wide | **25** | 25 | **25** |

**Part 4, the cost**, per call, the three copies interleaved call by call (µs, p50 with p10 in brackets):

| Read | Run 1 (3,000 calls each, load 7 to 12): parent / A / **B** | Run 2 (4,000 calls each, load 3.2 to 3.9): parent / A / **B** |
| --- | --- | --- |
| 16 KiB record, last line unfinished | 91.8 (79.2) / 91.3 (79.0) / **74.8 (64.0)** | 97.6 (83.8) / 99.0 (84.6) / **68.9 (38.3)** |
| 16 KiB tail read from a watermark, last line unfinished | 87.5 (75.0) / 87.9 (75.2) / **71.0 (59.7)** | 94.7 (82.0) / 94.6 (82.3) / **43.4 (30.6)** |
| 16 KiB record, every line finished | 71.5 / 71.4 / 71.9 | 52.7 / 52.7 / 53.2 |
| 1.5 MiB record, last line unfinished | 417.2 / 415.8 / 417.5 | 427.0 / 427.1 / 428.4 |

Part 3, totals per round over a 200 MiB record of finished lines: 31.9 / 29.8 / 29.9 ms median of 7. Its 2,000-file
rows are not read: identical work ranged from 575 to 6,426 ms under the machine's load.

### 2.5 M5: a reply the record does not hold (both engines, identical)

`bin/m5-garble.mts`: about 1.1 MiB of whole codex-shaped turns whose replies vary among seven sentences, then a last
turn whose `agent_message` is cut k bytes in, for every k (227 cuts). The truth for every cut: the last turn has its
ask and no reply yet.

| | Last turn has no reply (right) | A reply with words never in that record | A reply that reads like the whole message before it was written |
| --- | --- | --- | --- |
| parent | 186 | **37**, e.g. "Step 769, note 1: the lint step is slow because it walkStep 30 is done." and "Step 769, note 1: the liturn-30" | **4** |
| treeB | **227** | 0 | 0 |

### 2.6 The survey: every other place that could read past what a read returned

| Site | Buffer | Bounded by | Verdict |
| --- | --- | --- | --- |
| `lines.ts:120-122` `detectWideHead` | `allocUnsafe(64 KiB)` | `buf.subarray(0, Math.max(0, n))` | clean |
| `lines.ts:202`, `:209`, `:252` the head window | `allocUnsafe(headBytes)` | `subarray(0, headLen)`, or full once filled | clean (after D1 it is only ever filled from `seg`, which ends at or before `n`) |
| `containers.ts:123-125` `readFirstRecord` | `allocUnsafe(64 KiB)` | `subarray(0, n)` before the search | clean |
| `containers.ts:485-497` the `docStopAt` read | `allocUnsafe(64 KiB)`, reused | `Buffer.from(buf.subarray(0, n))` | clean (dead while deepseek's `skipWorthIt` is false) |
| `containers.ts:585-587` `readHeadText` | `allocUnsafe(n)` | `subarray(0, r)` | clean |
| `watermark.ts:62-64` `hashRange` | `allocUnsafe(n)` | `subarray(0, r)` | clean |
| `watermark.ts:89-91` `newlineBeforeOffset` | `allocUnsafe(1)` | `r === 1 &&` | clean |
| `src/main/sessions/codex-repair.ts:464-467` | `Buffer.alloc(256 KiB)` | `subarray(0, read)` | clean |
| `src/main/fs/guarded-write.ts:299-307` | `Buffer.alloc(want)` per pass | `subarray(0, got)` | clean |
| `src/main/updates/shipit-state.ts:348-350` | `Buffer.alloc`, fresh, zeroed | ignores the count | outside the class: a short read leaves zeros, never stale bytes, and a line of zeros matches no shape and is skipped (`:464-470`); not this phase |

The asynchronous reads under `src/main` (`context/port.ts:89-91`, `manifest/harvest/stores.ts:1246-1249` and
`:1282-1285`, `agents/health.ts:311-314`, `alerts/key-file.ts:93-99`, `drop/prepare.ts:52-54`, `fs/ipc.ts:93-110`) are
outside the class and each is bounded by `bytesRead`. `quickopen/worker.ts:258-267` splits strings from a child's
standard output, not a buffer a read filled.

### 2.7 M7 and M8: the gate's derived record, at the parent and through treeB (both engines, 3 of 3 runs)

`bin/m7-gate-fixture.mts`, the record D6 builds (§4.4): the committed codex fixture's line 1, its lines 2 to 27
repeated until the record passes 1 MiB and 40 KiB (each repetition ends on line 27, a `task_complete`, so no turn is
open), then the first 120 bytes of line 28 (a `task_started`). 1,090,532 bytes, 3,199 newlines, the unfinished line at
1,090,412. Then the rest of line 28 and lines 29 and 30 are appended, and it is read from the watermark and from nothing.

| | `lines` | Watermark offset, open | The next read | The first read's turns, then the next read's |
| --- | --- | --- | --- | --- |
| parent | **3,200** | **1,090,604 (72 past the end)**, not open | **`full`, 1,091,120 bytes** | 369, then **all 370 again** (739 where the whole read has 370) |
| treeB | 3,199 | 1,090,412, not open | `tail`, 708 bytes | 369, then the 1 new turn: equal to the whole read's 370 |

Merged the way the store merges, both builds end on the whole read's 370 turns: at this shape the parent's damage is the
count, the watermark and a full re-read, which is what the gate's row holds (§4.4).

`bin/m8-reference.mjs`, the research 63 reference reader the gate's `--reference` mode runs, over the same record:
`lines` 3,200, watermark 1,090,604. It bites.

`bin/m6-gate-reply.mts`, the reply sweep over the committed records instead (line 30, an `agent_message`, cut at every
byte, after lines 2 to 27 repeated 123 times): the parent drew a reply in 0 of 223 cuts and miscounted `lines` in 223
of 223; treeB 0 and 0; 2.8 to 3.3 s per sweep. Not the gate's clause (D7).

### 2.8 M9: the gates and tests at the parent

- Every committed record the scanner reads ends in a newline: the 10 JSONL records under
  `docs/research/assets/63-fixtures/` (`tail -c 1`), and the five JSON documents too. The sixteenth file,
  `qwen-chat.runtime.json`, ends in `}`; it is a sidecar the resolver reads whole, never through `scanFile`.
- `node build/conformance-overview.mjs`: exit 0, PASS, 66 lines, sha256
  `2f69f488b9e6df78953de2041568940e07f37df6666a4dadd3a4f8341b199008` (the same hash Phase 352's integrator recorded),
  kept as `logs/conformance-overview-parent.table.txt`. `--reference`: exit 0, PASS, sha256
  `850c233cba40b1138a1fd59c631126c08d4d0a02366479489a9a04d23bfc01c6`, kept as
  `logs/conformance-overview-parent-reference.txt`.
- `vitest run src/main/overview/`: 44 files, 734 tests, exit 0. `p310-scan-views.test.ts`: 28 tests, exit 0.

## 3. The tree at this head, re-read (what the builder starts from)

| What | Where, at `91077c5e` |
| --- | --- |
| The scanner | `src/main/overview/reader/lines.ts`: header `:1-40` (Phase 310's paragraph `:25-39`), `scanFile` docblock `:162-171`, the function `:172-285`: the chunk `:182`, the head window `:202`, `finishLine` `:206-230`, the read `:237`, `bytesRead` `:239`, the search `:242`, `end` `:243`, `seg` `:244`, the view `:264`, `lastCompleteOffset` `:275` |
| The one production caller | `src/main/overview/reader/containers.ts:178-210` (`jsonlPass`, parses inside the callback, keeps nothing); the watermark `:342-354` (`offset = openOffset ?? lastCompleteOffset` `:345`) |
| The resume guard | `src/main/overview/reader/watermark.ts:124-136` (`checkByteOffset`) |
| The store's merge | `src/main/overview/service.ts:331-340` (`replaceTurnsFrom` from the first returned turn's index) |
| Phase 310's test | `src/main/overview/__tests__/p310-scan-views.test.ts`: the reference reader `:133-176`, the copy model `:194-235`, the trailing-line case `:399-409` (comment `:400`), the STATED LIMIT `:516-525`, the sweep `:526-582` with `unfinished` `:552-557` |
| The repository's fs interception pattern | `src/main/fs/__tests__/p244-read-cap-bytes.test.ts:31-55` (`vi.hoisted` observation, `vi.mock('node:fs', …)` wrapping `readSync`) |
| The gate | `build/conformance-overview.mjs`: header `:1-91`, the defect checks `:585-725` (`defect()` `:591`, reference `:606-655`, product `:656-725`), the tables `:1006-1070`; `build/overview-conformance-probe.mts`: `NormalRead` `:92-113`, `referenceReader`'s return `:165-184`, `productReader`'s `:224-243`, `emptyRead` `:451-472`, `CODEX_FILE` `:779`, the derived cases `:1631-1783`, the product block `:1785` |
| The reference control | `docs/research/assets/63-keep-map/lib/lines.js:90` (the same search), `read.js:72` (its watermark) |
| Words | `CHANGELOG.md:15-21` (`### Fixed` under `## Unreleased`, last item `:21`); `CLAUDE.md:324` (the `conformance:overview` row) |

## 4. The design (builder `reader`)

### 4.1 `lines.ts`

1. D1, exactly: `const got = chunk.subarray(0, n);` after `acct.bytesRead += n;`, and `const nl = got.indexOf(10, i);`
   for the search. A comment at that line, in the file's voice: the chunk is reused and `allocUnsafe`, so a byte past
   `n` is the previous read's or memory no read of this file wrote.
2. The header gains a paragraph, "Phase 355, the bound", after Phase 310's: what the search did, what it cost (a line
   finished with the previous read's bytes, a watermark past the end, a reply the record does not hold, a reply lost
   from a record that grew during the read: §2.1, §2.2, §2.5), and why the search runs over a view of the bytes read
   rather than a check after it (§2.4). The docblock's "A trailing line with no newline is NOT consumed" gains "and the
   newline search sees only the bytes a read returned".
3. Nothing else (D2). The scratch copy `treeB` (lines.ts sha256 prefix `b42e4b3adbcbbb85`) is the measured shape before
   comments.

### 4.2 `p310-scan-views.test.ts`

1. Delete the STATED LIMIT comment (`:516-525`).
2. `unfinished(chunkSize, start)` (`:552-557`) stops sizing the record to a chunk's end: two forms per chunk size and
   start, a 23-byte unfinished line (`kept(23)`) and a 1-byte one (`fill(1)`), whatever chunk they end in. Every other
   line of the sweep stays.
3. `:400`'s comment loses its parenthesis about the limit; its two cases and their numbers stay.
4. No other case moves; all 28 stay green at HEAD.

### 4.3 `p355-scan-bounds.test.ts` (new)

Over the SHIPPING `scanFile`, `compileHead` and `readJsonl` with the shipping codex map. `vi.mock('node:fs', …)` in
p244's shape wraps `readSync` with a hoisted observation that, while armed, appends a given text to a given path after
the first read of that path that returns more than 0 and fewer bytes than it asked for, then disarms. A reference
reader of the test's own (the whole file split at newlines; a trailing line with no newline is not a line).

- **(a) the bound, at every cut.** §2.4 part 2's matrix: a record of short lines and a last unfinished line cut at
  every byte, chunk sizes 1, 2, 3, 5, 7, 8, 13, 16, 31, 64, 100 and 4,096, starts 0 and 5: every `ScanAccounting` field
  and every handed offset and byte equal to the reference reader's, and no `lastCompleteOffset` past the size. The test
  counts, from each record alone, the cases where the byte one chunk before the last read's end is a newline (where a
  search one byte too wide meets a stale newline at `chunk[n]`), and **requires at least one** (the measured matrix
  holds 25).
- **(b) memory no read wrote.** `vi.spyOn(Buffer, 'allocUnsafe')` once, asserted called with the chunk size, returns a
  chunk filled with `0x0a`; a second case fills it with a marker line (`"never in the file"\n`) repeated. A record
  smaller than the chunk with an unfinished last line, read from 0 and from a mid offset (a tail read): the answer
  equals the reference reader's and no handed byte holds the marker. The test asserts the chunk it was handed was
  filled, so the case cannot pass on fresh zeros.
- **(c) a record that grows during the read.** At chunk sizes 3, 16, 64 and 4,096 and every cut of the last line: the
  rest of the line and one more line arrive after the first short read; every handed line is a whole line of the final
  record at its own offset, and the answer equals the reference reader's over the final record. A cut whose last read
  is a whole chunk never fires the growth and is not counted; the test requires at least one fired case per chunk size.
- **(d) no reply before its line is whole** (§2.5's shape, records the test writes, past one 1 MiB chunk, replies
  varied): for every cut of the last reply's line, `readJsonl`'s last turn has its ask and no reply.
- **(e) no reply lost when the record grows during the read** (§2.2 case G's shape): the turn whose `task_complete`
  was unfinished keeps its reply and duration; after a further growth, the turns merged as `service.ts:331-340` merges
  them equal a whole read; the replies on record equal the whole read's.

### 4.4 `conformance:overview`

1. `build/overview-conformance-probe.mts`: `lines: number` on `NormalRead`, from `r.acct.lines` in both readers, `0` in
   `emptyRead`. `appendFileSync` joins the `node:fs` import.
2. `buildCodexUnfinished(src, out)` beside the other builders: §2.7's record exactly, lines numbered from 1 (line 1 is
   `lines[0]` of the file split at newlines): line 1; lines 2 to 27 (`lines.slice(1, 27)`) repeated until
   `Buffer.byteLength` passes `(1 << 20) + 40 * 1024`; the first 120 bytes of line 28 (`lines[27]`), after asserting the
   fixture holds 30 lines, line 27 is a `task_complete` and line 28 a `task_started` (else the case reads as failed and
   says which). It returns the unfinished line's offset, the newline count of what it wrote, and the rest (line 28's
   remainder and lines 29 and 30, each with its newline).
3. After `claude-changed`: `cases['codex-unfinished']` (no watermark), `out.unfinished = { at, newlines, size,
   lastByte }`, then the rest appended, `cases['codex-unfinished-next']` (from the first read's watermark) and
   `cases['codex-unfinished-whole']` (from nothing). Codex job: `cwd` `/Users/example/rookery`, as the other codex cases.
4. `build/conformance-overview.mjs`: one defect row, `'355 an unfinished line'`. Product: want
   `counted at its newline; the next read resumes`, pass when every read is ok, `lastByte` is not a newline, `lines`
   equals `newlines`, the watermark's `offset` equals `at` and `open` is false, the next read's `work` is `tail`, and
   the first read's turns followed by the next read's equal the whole read's. Reference: want
   `the reference reader counts a line past the bytes it read`, pass when the read is ok, `lastByte` is not a newline
   and `lines` equals `newlines + 1`. `got`: `<lines> lines of <newlines>, watermark <offset> for <at>[ open], next
   <work>`. The header's WHAT IT FAILS ON gains item 9 for it, in two sentences.
5. Every other row of both tables stays byte for byte: the diff against §2.8's two parent logs is that one row.

### 4.5 Words in the repository

- `CHANGELOG.md`: §5's item, last under `## Unreleased`, `### Fixed`, no commit link.
- `CLAUDE.md:324`, one sentence appended to the `conformance:overview` row: "Since Phase 355 the scanner's newline search
  sees only the bytes a read returned, so a line is counted, handed or used for a watermark only once its newline is
  read; the `codex-unfinished` row holds it over the committed codex records, red at the parent and in `--reference`,
  and `p355-scan-bounds.test.ts` holds it at every cut and chunk size, over memory no read wrote and over a record that
  grows during the read."

## 5. Words

No surface word moves. The CHANGELOG item, verbatim:

```
- Catch Me Up no longer shows a reply with words from elsewhere in the conversation, or drops a reply for good, when it reads a conversation the agent is still writing: a line is read only once the agent has finished it
```

## 6. What moves on purpose (each named in the builder's report)

| What | Why |
| --- | --- |
| `p310-scan-views.test.ts`'s STATED LIMIT and its chunk-end sizing (`:400`, `:516-525`, `:552-557`) | They step around this defect (§0.1 item 5) |
| `conformance:overview`'s defect table: one row added, in both modes | D6 |
| `conformance:overview`'s probe output: `lines` on every case, three new cases, `unfinished` | D6 |
| The hermetic test-file count (`assert-hermetic-checks`), +1 | The new test file |
| `measure:p300-split`'s numbers, if any move | None should (§2.4 part 3); the verifier reads it |

## 7. The gates that move

- `conformance:overview` (§4.4), product and `--reference`.
- `gate:checks` (a new `*.test.ts` under `src/`) and `npm run build`'s hermetic count.
- Unchanged and run: `typecheck`, `build` (with `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:contract`,
  `conformance:ios` inside it), `test`, `conformance:samefolder` (its rule 23 reads `src/main/overview`), `gate:contract`.

## 8. The app runs (none is committed; D9)

The verifier's own, one launch per build, through `withElectron` inside `build/harness-socket.mjs`, hidden agents, a lock
slot: a codex session seeded through `GMUX_OVERVIEW_SEED` under a `GMUX_SHOT` launch (the path
`build/p300/probe-p300.mjs` uses, read as text) whose record, placed where the resolver looks under the scratch `HOME`,
is §2.5's shape cut where the parent draws a spliced reply; Catch Me Up's turns read back through `GMUX_SHOT_JS`. Parent:
the spliced reply on the last turn; HEAD: none. This is the one reading taken on main's own engine and allocator.

## 9. Builder, files, and the brief

### 9.1 The files (one builder; a file not in this list is not edited, and a builder that must edit one stops and names it)

| Builder | Files |
| --- | --- |
| **reader** | `src/main/overview/reader/lines.ts`; `src/main/overview/__tests__/p310-scan-views.test.ts`; `src/main/overview/__tests__/p355-scan-bounds.test.ts` (new); `build/overview-conformance-probe.mts`; `build/conformance-overview.mjs`; `CHANGELOG.md`; `CLAUDE.md` (the one row) |

`git diff --stat 91077c5e` at the end: those seven paths and this SPEC, nothing else (`out/` is ignored and the probe
removes its scratch).

### 9.2 The brief (the workflow hands it to the builder)

> THIS IS A BUILD. Build Phase 355 exactly as build/p355/SPEC.md §0.1, §1.1 and §4 say, in the files of §9.1 only.
> (1) src/main/overview/reader/lines.ts `scanFile`: after `acct.bytesRead += n;` add `const got = chunk.subarray(0, n);`
> and make the search `const nl = got.indexOf(10, i);`; leave `seg = chunk.subarray(i, end)`, the view line
> `const c = held.length === 0 && nl !== -1 ? seg : Buffer.from(seg);` and everything else byte for byte; add the header
> paragraph and the docblock clause of §4.1. (2) p310-scan-views.test.ts: delete the STATED LIMIT comment, make
> `unfinished` two forms (`kept(23)` and `fill(1)`) not sized to a chunk end, drop `:400`'s parenthesis; nothing else.
> (3) New src/main/overview/__tests__/p355-scan-bounds.test.ts with cases (a) to (e) of §4.3, using p244-read-cap-bytes'
> `vi.mock('node:fs')` shape for growth and `vi.spyOn(Buffer, 'allocUnsafe')` once for the chunk; (a) requires at least
> one stale-newline-at-`n` case and (b) asserts its chunk was filled. (4) build/overview-conformance-probe.mts and
> build/conformance-overview.mjs: §4.4 exactly (`lines` on NormalRead, `buildCodexUnfinished`, three cases, the
> `'355 an unfinished line'` row in both modes, item 9 in the header). (5) CHANGELOG.md: §5's item verbatim, last under
> `## Unreleased`, `### Fixed`, no link. CLAUDE.md: §4.5's sentence on the `conformance:overview` row. Do not touch
> containers.ts, watermark.ts, fold.ts, map.ts, index.ts, keep-map.json, service.ts, any map version, the research 63
> reader, package.json or build/verification-checks.mjs. Run, each with its exit code and PASS line: `npm run
> typecheck`; your two vitest files with `--reporter=verbose` (p310 28 of 28, p355 every case); the full vitest under
> the history block with a scratch HOME (name the four /bin/ps native failures, nothing else red); `node
> build/conformance-overview.mjs` and `node build/conformance-overview.mjs --reference`, each diffed against SPEC §2.8's
> parent logs (the only difference the new row); `npm run gate:checks`; `npm run build`; `npm run
> conformance:samefolder`; and §10.1's ablation arms in a scratch clone under /private/var/tmp/tortie-wt/scratch/p355/builder/,
> the worktree never written by them. Do NOT launch an Electron app and do not time anything (the verifier's, under a
> lock slot). Report every file changed, every command with its exit code and numbers, the history stats, and what you
> could not run and why. Hard rules: SPEC §0.

## 10. The proof, run rather than read

### 10.1 What the builder runs before it returns (§9.2), and the ablation arms

In a `cp -Rc` clone of the worktree's files under the builder's scratch, `node_modules` included (an APFS clone is
cheap; in Phase 352 a clone whose `node_modules` was a symlink ran a vitest that found no tests), each arm alone, each
restored by sha256 before the next, the clone removed by its literal path at the end:

| Arm | Change in the clone | Must read |
| --- | --- | --- |
| A0 | none | everything green |
| A1 | `lines.ts`'s search back to the parent's `chunk.indexOf(10, i)` (no `got`) | p355 (a) to (e) red, p310's sweep red, `conformance:overview` red on `355 an unfinished line` (3,200 of 3,199, 1,090,604 for 1,090,412, next `full`); its `--reference` mode PASS as at A0 (it never reads `lines.ts`) |
| A2 | `chunk.subarray(0, n + 1)` | p355 (a) red on the stale-newline-at-`n` cases (§2.4: 25 of 1,392 static) |
| A3 | the first spelling one byte wide: `let nl = chunk.indexOf(10, i); if (nl > n) nl = -1;` | p355 (a) red as A2 |
| A4 | `buildCodexUnfinished` writes a newline after its 120 bytes | the row FAILS saying the record is not unfinished, in both modes |
| A5 | (b)'s fill removed (the spy returns `Buffer.alloc(size)`) | (b) fails on its own fill check, not silently green |

### 10.2 The verifier (Tier 3, one lens): two independent methods and an attack, at the parent and at HEAD

A parent worktree at `91077c5e`: `git worktree add --detach /private/var/tmp/tortie-wt/wt-p355-parent 91077c5e`, then
`cp -Rc` of `node_modules` and `build/vendor` from this worktree, built for the app arm. Removed after landing (§13).

- **Gates**: `typecheck`, `build`, `test` (history block; the four `/bin/ps` tests named), `conformance:overview` and
  `--reference` at both builds (HEAD's tables equal §2.8's but the one row), `gate:checks`, `conformance:samefolder`.
- **Measure the parent commit**: re-run §2.1's entry rows (10 fresh processes per engine), §2.2's cases S and G, §2.5 and
  §2.7 at the parent and at HEAD, with the verifier's own copies of the instruments or its own. HEAD: no
  `lastCompleteOffset` past the size, the same lines every run, the next read `tail`, turn 3's reply kept and 5 of 5
  replies, no reply before its line is whole.
- **The attack**: (1) every cut of a last unfinished line at chunk sizes 1 to 4,096 and at the shipping 1 MiB, starts 0
  and mid-record, the stale-newline-at-`n` count printed; (2) memory no read wrote, both as a filled chunk and as each
  engine hands it back, records under one chunk and tail reads, 10 fresh processes per engine; (3) **a REAL writer**: a
  separate process appending codex-shaped records in pieces (each record split at a random byte, a short sleep between
  pieces), bounded by a hard deadline and killed by pid in a `finally`, while the verifier's harness reads the record
  over and over through the SHIPPING `readJsonl` under Electron's node, from nothing and from each watermark, merging as
  the store merges; graded after the writer stops against a whole read of the final record: every handed line a whole
  line of the final record at its own offset, no watermark past the size the read saw, the merged turns equal to the
  whole read. The parent's damage counted beside HEAD's zero.
- **Re-derive**: a reader of the verifier's own (its own split at newlines, its own count of whole lines and of the
  last whole line's end, and its own ask and reply count for the codex records) re-deriving every `lines`, every
  watermark offset and the per-provider turns and replies of `conformance:overview`'s matrix over the 14 committed
  records the gate reads (its 13 base cases and `claude-bare-command.jsonl`) and `codex-unfinished`, at both builds.
- **Cost**: §2.4 part 4's per-call shape, parent against HEAD interleaved under Electron's node (HEAD equal or faster
  everywhere), and `measure:p300-split` with `P300_SIZES=p50,p99,big` at both builds, interleaved, under a lock slot.
- **The app arm**: §8, one launch per build.
- **Stated limits**: main's allocator is read only through the app arm; the timing is per call under
  `ELECTRON_RUN_AS_NODE`, not main.
- **No regression against today**: a table of every reading, parent and HEAD. Expected: none worse. A reply that the
  parent drew early because the stale bytes happened to equal the line's real end (§2.5, 4 of 227) appears at HEAD once
  the line is whole; that is the file's truth, not a regression, and is said so.

### 10.3 At the end, once

The Electron count of CLAUDE.md (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v
defunct`; his `/Applications/Tortie.app` and other apps' crashpads are not ours), no `p355` socket under
`/private/tmp/tmux-501/`, every lock slot released, no writer left, the history stats.

## 11. The battery (the builder's; an integrator's if the workflow runs one), in order, each with its exit code and PASS line

1. `df -h /`; history stats.
2. `npm run typecheck`
3. `npm run build`
4. `npm test` under the history block with a scratch `HOME` (the four `/bin/ps` native failures named, nothing else red)
5. `node build/conformance-overview.mjs`; `node build/conformance-overview.mjs --reference` (each diffed against §2.8)
6. `npm run gate:checks`; `npm run gate:contract`
7. `npm run conformance:samefolder`
8. `git diff --stat 91077c5e` (§9.1's seven paths and this SPEC)
9. History stats again.

`smoke:t1`, `smoke` and `smoke:t3` start `electron .` from `harness-socket.mjs`'s shell line, not through
`build/electron-run.mjs`; nothing they exercise moves here. The main session's at landing, as in Phase 352 (its D24).

## 12. What is NOT in this phase

- The entry's refusals, whole: no change to what is admitted, parsed or counted beyond a line that was never whole; no
  release.
- No map version bump and no re-read of sessions already read (Q1).
- Not the research 63 reference reader: it keeps its search, because `--reference` must keep carrying its defects.
- Not `shipit-state.ts`'s uncounted read (§2.6: zeros, never stale bytes, skipped by its parser).
- No change to Phase 310's view, to the head rule, to the keep map or to the fold.
- No committed probe, no committed ablation script, no `package.json` or `build/verification-checks.mjs` change.
- Nothing under `ios/`.

## 13. For the main session at landing

- The running log line and "→ LANDED" on the entry; the follow-up docs commit adds the CHANGELOG item's link.
- Q1 to him.
- Scratch to remove after landing: `/private/var/tmp/tortie-wt/scratch/p355/` (this step's is about 33 MB: records,
  logs and five scratch copies of the reader) and the verifier's parent worktree
  `/private/var/tmp/tortie-wt/wt-p355-parent` if it made one.

## 14. Questions for him (the main session asks; the build proceeds on the default)

- **Q1.** After this, Catch Me Up reads a line only once the agent has finished it. A reply already lost by the old
  reading (it took a conversation growing during a read) stays lost in Tortie's own copy until that conversation is read
  again in full, which happens rarely. Leave it (the default; nothing gets slower), or have every conversation read once
  in full after the update (each conversation's first Catch Me Up after the update is slower, once)?

## 15. The spec step's commands, exit codes and numbers

Scratch `/private/var/tmp/tortie-wt/scratch/p355/spec/`. Every command ran under the history block with `HOME` and
`ZDOTDIR` under the scratch, except the history `stat` reads themselves, row 3 and row 19's `ps`. The rows are grouped
by instrument, not in the order they ran.

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` of the two history files | — | `742100 1793638187`, `23166 1790702242` |
| 2 | `git rev-parse HEAD`, `status`, `log`; `df -h /` | 0 | `91077c5e`, clean; 67 GiB free |
| 3 | `zsh lock.sh status` | 0 | **ran outside the block** (read only); three slots free |
| 4 | `lock.sh try p355 spec` | 0 | `electron.lock`, held through every run below, released in row 19 |
| 5 | `bin/m1-defect.mts entry`, once (Electron) | 0 | §2.1 row 1 |
| 6 | `bin/m1-run.zsh electron 10` | 0 | 88 readings, 7 s |
| 7 | `bin/m1-run.zsh node 10`, first try | 126 | the script was not executable; re-run with `zsh -f` |
| 8 | `bin/m1-run.zsh node 10` under `/usr/local/bin/node` 22.14.0, then under 22.23.1; `bin/m1-alloc.mjs` ×2 per engine | 0 | §2.1; 88 readings each |
| 9 | `bin/make-trees.mjs` ×2 (the second adds treeA1, treeB1) | 0 | treeP `9793459bc67b5791` (= the worktree's lines.ts), treeA `bd2caecec45c0c82`, treeB `b42e4b3adbcbbb85`, treeA1 `4a56b1cc6fa47da0`, treeB1 `dba0e6209a35d04b` |
| 10 | a shell loop copying trees with `rm -rf` of a variable path | — | **refused by the tool's safety check, not run**; replaced by row 9's fixed-path removal |
| 11 | `bin/m2-reader.mts` (Electron) | 0 | §2.2; 222 reads |
| 12 | `bin/m3-decide.mts 1,2`, then with treeA1, treeB1 (Electron) | 0, 0 | §2.4 parts 1 and 2; 2 s |
| 13 | `bin/m3-decide.mts 3` (Electron) | 0 | 197 s; §2.4 part 3 |
| 14 | `bin/m3-decide.mts 4` ×2 (Electron, 3,000 then 4,000 calls) | 0, 0 | §2.4 part 4; 16 s and about 20 s |
| 15 | `bin/m4-gate-shape.mts`, `bin/m5-garble.mts` (×3), `bin/m6-gate-reply.mts`, `bin/m7-gate-fixture.mts` (each on both engines where §2 says so), `bin/m8-reference.mjs` | 0 each | §2.3, §2.5, §2.7 |
| 16 | `npm run conformance:overview` | 0 | 3 s; PASS; npm printed an update notice (a registry request): later gates ran as `node build/…` |
| 17 | `node build/conformance-overview.mjs`; `--reference` | 0, 0 | §2.8 hashes |
| 18 | `vitest run src/main/overview/`; `vitest run …/p310-scan-views.test.ts --reporter=verbose` | 0, 0 | 44 files, 734 tests; 28 |
| 19 | `lock.sh release`; history `stat`; the Electron count | 0 | **ran outside the block: `stat` and `ps`**; history unmoved; no Electron of this step (the bare `Tortie`, pid 90306, and its crashpad are his `/Applications/Tortie.app`; the other crashpads are Granola, Chrome, Cursor and Slack) |

**History**: `~/.zsh_history` `742100 1793638187` and `~/.bash_history` `23166 1790702242` at the start, before and
after every run and at the end: never moved. **Left behind**: no process of this step, no lock slot, no socket; the
200 MiB and 4,000 small records of row 13 removed in its `finally`; the scratch folder above (§13). **Not run, and why**: no app launch (the verifier's
app arm, §8); no `measure:p300-split` or `probe:p300` (the verifier's, against built code); the full `npm test` (the
builder's); the native lane (four `/bin/ps` tests cannot pass under the block); nothing of his read, no real agent.

## §As built (the builder `reader`, 2026-11-03)

Built in `/private/var/tmp/tortie-wt/wt-p355`, HEAD still `91077c5e`; nothing committed, staged or stashed. Scratch
`/private/var/tmp/tortie-wt/scratch/p355/builder/` (1.0 MB: `bin/` holds `ablate.mjs`, `stale-count.mjs` and
`probe-unfinished.mjs`; `logs/` every log named below; `home/` the scratch `HOME`). No Electron launched, nothing timed,
no lock slot taken (§9.2: those are the verifier's).

### The files (§9.1's seven, and this SPEC)

`git diff --numstat 91077c5e`: `CHANGELOG.md` +1 −0, `CLAUDE.md` +1 −1, `build/conformance-overview.mjs` +50 −0,
`build/overview-conformance-probe.mts` +94 −0, `p310-scan-views.test.ts` +8 −22, `lines.ts` +24 −2; untracked,
`src/main/overview/__tests__/p355-scan-bounds.test.ts` (639 lines) and `build/p355/`. Nothing else (`out/` holds the
build's `main`, `preload` and `renderer`, ignored).

| File | What changed |
| --- | --- |
| `src/main/overview/reader/lines.ts` | D1 exactly: after `acct.bytesRead += n;` a three-line comment and `const got = chunk.subarray(0, n);`, and the search is `const nl = got.indexOf(10, i);`. `seg = chunk.subarray(i, end)` and the view line `const c = held.length === 0 && nl !== -1 ? seg : Buffer.from(seg);` are byte for byte the parent's. The header gains "Phase 355, the bound" after Phase 310's paragraph (what the search did, what it cost, why a view and not a check); the `scanFile` docblock's trailing-line sentence gains "and the newline search sees only the bytes a read returned" (§4.1) |
| `src/main/overview/__tests__/p310-scan-views.test.ts` | §4.2: the STATED LIMIT block deleted; `unfinished(chunkSize, start)` replaced by `UNFINISHED`, two records, `WHOLE + kept(23)` and `WHOLE + fill(1)`, read at every chunk size 1 to 48 and every start beside `whole`; `:400`'s comment reads "Each record ends where a chunk ends." The other cases are unchanged |
| `src/main/overview/__tests__/p355-scan-bounds.test.ts` (new) | §4.3's (a) to (e): 8 tests ((a) 1, (b) 4, (c) 1, (d) 1, (e) 1) over the SHIPPING `scanFile`, `compileHead` and `readJsonl` with the shipping codex map; `vi.mock('node:fs')` in p244's shape for the growth, `vi.spyOn(Buffer, 'allocUnsafe')` for the chunk |
| `build/overview-conformance-probe.mts` | §4.4 items 1 to 3: `appendFileSync` imported; `lines` on `NormalRead`, from `r.acct.lines` in both readers and `0` in `emptyRead`; `buildCodexUnfinished` beside `buildCodexInApp`; after `claude-changed`, `codex-unfinished`, `out.unfinished`, the rest appended, `codex-unfinished-next` and `codex-unfinished-whole` |
| `build/conformance-overview.mjs` | §4.4 item 4: the header's WHAT IT FAILS ON gains item 9 (two sentences); the `'355 an unfinished line'` row in both modes |
| `CHANGELOG.md` | §5's item verbatim, last under `## Unreleased`, `### Fixed`, no commit link |
| `CLAUDE.md` | §4.5's sentence verbatim, appended to the `conformance:overview` row |

### The builder's decisions (new unless a source is named)

| Id | Decision | Why |
| --- | --- | --- |
| B1 | (a) reads every record twice, with no prefilter and through a compiled 8-byte head (`compileHead` of one rule, head `{"n":`, refusing `"n":2`, which refuses lines 2 and 20 to 29 and admits the unfinished line), against a head model in the test's reference reader: 2,784 cases over §2.4's 1,392 records | §4.3 names `compileHead`; the head window copies from `seg`, so the bound is held there too, and `linesSkippedOnHead` is asserted non-zero so the half is not idle |
| B2 | (b)'s record is 1,000 lines of 20 bytes and a 40-byte unfinished line, read from 0 and from 10,000, so every read ends on a multiple of 20 and the 20-byte marker line in the chunk begins exactly at the read's end | A search past the read then carries the whole marker, so "no handed line holds the marker" bites on the marker's own text, beside "every handed line is a whole line of the record at its offset" |
| B3 | (b)'s spy fills whatever `Buffer.allocUnsafe` hands out while the scanner runs, records each size asked, requires exactly `[1048576]` (no prefilter, so no head buffer), and requires the chunk's bytes past the read to equal an independently filled buffer's | §4.3 (b): "asserted called with the chunk size", and the case "cannot pass on fresh zeros" (A5) |
| B4 | The growth hook finds the record's reads by the descriptors `openSync` returned for its path while armed (`openSync` is wrapped beside `readSync`) and fires on the first read of that path that returns more than 0 and fewer bytes than it asked for | §4.3's hook. In (e) `readJsonl`'s other reads of the record (`readFirstRecord` and `detectWideHead`, 64 KiB at 0; the watermark's two 4,096-byte hashes) are whole on a record over 1 MiB, so the first short read is the scanner's |
| B5 | (c) compares every accounting field but `size` and `mtimeNs` with the reference over the record as it stands after the scan, and holds `size` to the size before it (the scanner's `fstat` comes before the growth); a cut whose growth never fired is compared the same way over the unchanged record, and is not counted toward "fired at least once per chunk size" | §4.3 (c) |
| B6 | (d) writes the head once and puts each cut on with `truncateSync` and `appendFileSync` rather than writing 1.1 MiB 227 times; it also requires the turn count; budget 120 s (4.3 s measured). The record is 768 whole turns (1,090,601 bytes with the last turn's opening and ask), the reply line 228 bytes and the cuts 1 to 227, as m5's | Cost; m5's shape kept whole (whole turns, seven sentences), because the stale bytes a short read meets come from the turns about 40 KiB into the record |
| B7 | (e) also requires the growth to fire exactly once and the growing read's turns to equal a whole read of the record as it then stood | So (e) cannot pass on a record that did not grow |
| B8 | **Deviation from §4.4 item 4's words.** The reference want reads `the reference reader counts past the bytes it read` (50 characters), not `the reference reader counts a line past the bytes it read` (57) | The defect table pads that column to 52 (`pad(d[1], 52)`, unchanged) and 57 characters run into the verdict (`…it readpass`). The row's condition is the spec's |
| B9 | `got` is prefixed `the record is not unfinished, it ends in a newline: ` when the written record's last byte is a newline, and reads `the record was not built (<why>)` when the builder threw (its three cases then read `failed` with the builder's sentence, which names the line that moved) | §10.1 A4: the row must fail "saying the record is not unfinished"; §4.4 item 2: "says which" |
| B10 | The builder takes the fixture's non-empty lines (`split('\n').filter((l) => l.trim() !== '')`, as every builder in the probe does), and "the first 120 bytes" is a byte slice | A bare split has 31 elements, the last empty. The fixture is ASCII, so 120 bytes are m7's 120 characters |
| B11 | The row is pushed after both branches of the seven defect checks | It is the last row of the defect table in both modes, and every other row prints as at the parent (§4.4 item 5) |
| B12 | `WHOLE_BYTES` goes with `unfinished`, its only reader; the two unfinished records are written once per `it` | `noUnusedLocals` holds the tests project; the records no longer depend on the chunk size or the start (§4.2 item 2) |
| B13 | The header says "its last complete offset, which the watermark resumes from" where a first draft said "watermark" | §2.1 measured the scanner's `lastCompleteOffset`; the watermark takes it when no turn is open. The first ablation run was against that draft, a comment-only difference; the second ran against the final tree |

### The numbers

**`conformance:overview`, product** (`node build/conformance-overview.mjs`): exit 0, PASS, 67 lines, sha256
`2aa6f4053a7e50ed1edbcdc5ac4b884f13ffb8c8c83ead6d305f44d2c2e22aae`. Against §2.8's parent table (`2f69f488…`) `diff`
prints one added line, line 37: `355 an unfinished line    counted at its newline; the next read resumes       pass     3199 lines of 3199, watermark 1090412 for 1090412, next tail`.
**`--reference`**: exit 0, PASS, sha256 `4d9ac85e61423b7d3d39ea1da86d426db1dbc7b99bca120b898b335ac93091db`; against
`850c233c…` one added line, line 37: `355 an unfinished line    the reference reader counts past the bytes it read  pass     3200 lines of 3199, watermark 1090604 for 1090412, next tail`.
Both runs byte-identical before and after B13.

**The probe's record** (`bin/probe-unfinished.mjs`, the probe run as the gate runs it): `unfinished` =
`{ at: 1090412, newlines: 3199, size: 1090532, lastByte: 48 }`. Product: the first read 3,199 lines, `full`, 1,090,532
bytes, 369 turns and 369 replies, watermark 1,090,412 not open, turn index 369; the next read `tail`, 708 bytes, 3
lines, 1 turn (open); the whole read 3,202 lines, 1,091,120 bytes, 370 turns. Reference: 3,200 lines, watermark
1,090,604, next `tail` of 516 bytes from inside a line. §2.7's numbers exactly. `lines` on every other case, product:
base claude 30, codex 30, grok 18, antigravity 13, qwen 17, pi 11, omp 12, muse 14, gemini 27, deepseek 1, cursor 9,
cursoride 7, copilotide 1, every `second-*` 0; claude-sorted 30, claude-traps 36, claude-bare 12, claude-bare-only 2,
codex-part-text and -TEXT 34, codex-reordered 30, codex-nomarkers 21, codex-inapp 32, cursor-offset 9, claude-changed 30.
Reference: the same but cursoride 8 and claude-changed 0 (its `none`). No row reads them but the new one.

**The tests** (vitest 4.1.10 under node 22.23.1, the history block, scratch `HOME`):

- `p310-scan-views.test.ts` 28 of 28; `p355-scan-bounds.test.ts` 8 of 8: (a) 0.46 s, (b) 1 to 2 ms each, (c) 0.04 s,
  (d) 4.3 s, (e) 9 ms.
- (a)'s count of cases whose previous read left a newline exactly at the read's end: **25**, re-derived from the records
  alone by `bin/stale-count.mjs` (chunk 2: 1, 3: 1, 5: 2, 7: 1, 8: 2, 13: 2, 16: 2, 31: 4, 64: 4, 100: 6), §2.4's 25.
- `vitest run src/main/overview/`: exit 0, 45 files, 742 tests (§2.8's parent: 44, 734).
- The full suite, twice at HEAD: exit 1, 1,168 files (5 failed, 1,161 passed, 2 skipped), 21,935 tests (9 failed, 21,912
  passed, 14 skipped), 49 s and 55 s. **The parent's**, in the clone with the six edited files put back by blob hash
  (`git hash-object` equal to `git rev-parse 91077c5e:<path>` for each) and the new test removed: exit 1, 1,167 files
  (5 failed, 1,160 passed, 2 skipped), 21,927 tests (9 failed, 21,904 passed, 14 skipped), 54 s. **The same nine
  failures by name at both**: the four `/bin/ps` tests §0 names (`ps.native.test.ts` twice, `process-table.native.test.ts`,
  `p269-env-names.test.ts`) and **five FSEvents tests §0 does not name** (`store-watch.native.test.ts` once,
  `repo-watcher.native.test.ts` four times: "the change was never delivered by the native stream", "the barrier write
  … produced no fire"). The five fail alone under the block too, at a load average of 3.45, and no file under
  `src/main/{watcher,config,proc,manifest,tmux}` differs from `91077c5e`: the history block stops FSEvents delivery as it
  stops `/bin/ps`. None was run outside it. HEAD adds one file and eight tests, all green.

**The ablation arms** (§10.1), each alone in a `cp -Rc` clone of the worktree (`node_modules` and `build/vendor` real
copies, the `.git` pointer removed first), every edited file put back and checked by sha256 before the next arm
(`lines.ts` `4d01f1aebdf9a013`, the p355 test `58fd82873c551d81`, the probe `46862635187a8a99`), the three equal to the
worktree's afterwards, the worktree never written, the clone removed by its literal path. Two runs, under node 22.23.1
(V8 12.4.254.21-node.56), the vitest lane's and the gate's engine; the second against the final tree:

| Arm | p355 red | p310 red | (a) wrong of 2,784 | (c) wrong of 232 | (d) cuts drawing a reply, of 227 | `conformance:overview` | `--reference` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0 none | 0 of 8 | 0 of 28 | 0 | 0 | 0 | PASS | PASS |
| A1 `chunk.indexOf(10, i)`, no `got` | **8 of 8** | **3**, the sweep | 711, 667 | 102, 85 | **41, 41** | **FAIL on the row**: `3200 lines of 3199, watermark 1090604 for 1090412, next full` | PASS, as at A0 |
| A2 `chunk.subarray(0, n + 1)` | (a); (b) both newline fills; (c) | 3 | **53, 51** | 5, 4 | 0 | PASS | PASS |
| A3 `let nl = chunk.indexOf(10, i); if (nl > n) nl = -1;` | (a); (b) both newline fills; (c) | 3 | **52, 54** | 4, 5 | 0 | PASS | PASS |
| A4 a newline after the 120 bytes | 0 | 0 | 0 | 0 | 0 | **FAIL**: `the record is not unfinished, it ends in a newline: 3200 lines of 3200, watermark 1090533 for 1090412, next tail` | **FAIL**, the same words |
| A5 the spy returns `Buffer.alloc(size)` | **(b) ×4** on `the chunk was filled past the read` | 0 | 0 | 0 | 0 | PASS | PASS |

The deterministic floor under A2 and A3 is 50, §2.4's 25 once per head; the cases above it, and every count that moved
between the two runs, are chunk 4,096's, whose first read is short, so what lies past it is whatever node 22 hands back
for a fresh `allocUnsafe(4096)`: the entry's run-to-run reading, at the parent. (d)'s 41 is §2.5's 37 + 4 to the cut. The
codex gate record's byte one chunk before its end is not a newline, so A2 and A3 leave the row green, as §2.4 predicts
for a record without the stale-at-`n` shape.

**The other gates**: `npm run typecheck` exit 0, twice (import boundaries 0 violations over 1,435 files, no runtime
cycles, shared types OK; `tsconfig.tests.json` holds the new test under `strict` and `noUnusedLocals`); `npm run build`
exit 0, twice (`gate:electron` 179 scripts against a floor of 179, unchanged; `gate:background`; `gate:simulator`;
`gate:knownhosts`; the hermetic check 276 check scripts and 1,168 test files; `conformance:ios` 54 rules;
`gate:onlyadd`; `conformance:harnessprobes`; the contract inventory equal to the baseline byte for byte);
`npm run gate:checks` exit 0; `npm run gate:contract` exit 0; `npm run conformance:derived` exit 0 (14 of 14 ablations
red); `npm run conformance:samefolder` exit 0 (114 files in the domain against a floor of 100, 0 bare `realpathSync(`,
9 of 9 ablations red, its image detached). Every `npm run` ran with `npm_config_update_notifier=false` (§0).

### The commands, in order, each under the history block unless named

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` of the two history files (outside, by rule) | — | `742100 1793638187`, `23166 1790702242` |
| 2 | `grep`, `sed` and `git` reads of the entry, both SPECs, the code; `df -h /` | 0 | 67 GiB free; HEAD `91077c5e` |
| 3 | `vitest run` the p355 and p310 files, `--reporter=verbose` | 0 | 36 of 36, 5.0 s |
| 4 | `node bin/stale-count.mjs` | 0 | 1,392 records, 25 |
| 5 | `node build/conformance-overview.mjs`; `--reference`; `diff` against §2.8's logs | 0, 0 | one row each |
| 6 | `npm run typecheck` | 0 | |
| 7 | `vitest run src/main/overview/` | 0 | 45 files, 742 tests |
| 8 | `npm run build` | 0 | |
| 9 | `npm test` | 1 | the nine; 49 s |
| 10 | `vitest run` the two FSEvents files alone | 1 | 5 of 5, load 3.45 |
| 11 | `cp -Rc` the worktree to the clone, `rm` its `.git` | 0 | |
| 12 | `node bin/ablate.mjs` | 0 | the table's first readings |
| 13 | `npm run gate:checks`, `gate:contract`, `conformance:derived`, `conformance:samefolder` | 0 each | |
| 14 | the B13 edit; `rm -rf` the clone by its literal path | 0 | |
| 15 | `npm run typecheck`; `npm run build`; the two files; `src/main/overview/` | 0 each | 36; 45 files, 742 tests |
| 16 | `npm test` | 1 | the nine; 55 s |
| 17 | a second clone; `node bin/ablate.mjs` (`P355_ABLATION_OUT=…/logs/ablation-final`) | 0, 0 | the table's second readings |
| 18 | the clone put back to the parent by blob hash; `npm test` there | 0, 1 | the same nine; 54 s |
| 19 | `rm -rf` the clone by its literal path; `node bin/probe-unfinished.mjs` product and reference | 0 each | the record above |
| 20 | `node build/conformance-overview.mjs`; `--reference`; `diff` | 0, 0 | the hashes above |
| 21 | the Electron count, `ls /private/tmp/tmux-501/`, `ps` of my paths (outside, read only) | — | nothing of mine: the bare `Tortie` (pid 90306) and the crashpads are his `/Applications/Tortie.app`, Granola, Chrome, Cursor and Slack; 0 `p355` sockets |

Outside the block, besides rows 1 and 21: read-only `ls`, `cat` of my own logs, `df`, `uptime`, a `ps` after row 9 that
found no survivor of `p269-env-names.test.ts`'s hanging shell (the one `sleep 120` it showed is another session's watch
loop, left alone), and one heredoc that wrote `bin/stale-count.mjs`; none starts a shell. Every shell, node, npm,
vitest, git, `cp` and `rm` ran inside.

**History**: `~/.zsh_history` `742100 1793638187` and `~/.bash_history` `23166 1790702242` at the start, around every
run that started a shell, and at the end: never moved.

**Not run, and why**: no app launch, `measure:p300-split`, `probe:p300` or timing (the verifier's, §8 and §10.2, under a
lock slot); no `smoke:t1`, `smoke` or `smoke:t3` (the main session's at landing, §11); the four `/bin/ps` tests and the
five FSEvents tests cannot pass inside the block and were never run outside it; main's own allocator is the verifier's
app arm. Nothing of his read, no real agent, nothing under `ios/`.

**Left behind**: no process, socket, disk image, lock slot or clone; the scratch folder above (§13).
