# 81. A codex resume id names a session, never one of its sub agents

Phase 215 measure step, 2026-09-06. Everything below was read from the operator's own machine,
read only. His `~/.codex` was never written to. His live manifest was never opened for writing:
the repair was exercised against a copy under a scratch directory. `state_5.sqlite` was read by
copying it and its `-wal` and `-shm` siblings to scratch and opening the COPY with `mode=ro`.
No codex process was launched, so nothing here spends a turn or a token.

The scripts are `build/p215/`. `scan-rollouts.mjs` reads the first line of every rollout in a
codex home and writes one JSON record per file; the other four consume that.

## 0. Drift against the phase entry

| The entry says | What this tree and his store say | Verdict |
| --- | --- | --- |
| his row holds `01a0696a-75d1-…`, line 1 `thread_source: subagent`, `session_id`, `parent_thread_id` and `forked_from_id` all `01a06966-…`, `source.subagent.thread_spawn` with depth 1, agent_path `/root/gmux_forensics`, nickname Hegel | every field byte for byte | CONFIRMED |
| parent rollout on disk, 19,020,912 bytes | 19,020,912 bytes, mtime 2026-09-03 19:06 | CONFIRMED |
| parent last written half an hour after the sub agent | 23 minutes after THAT sub agent (18:43), but only 4 minutes after the LAST of the three (19:02) | drift, harmless |
| parent 18:31:56, three sub agents 18:36:19 / :25 / :30 | exact | CONFIRMED |
| codex descriptor `key: 'cwd-newest'`, `confidence: 'exact'`, confirm reads one field `payload.cwd` | `stores.ts:417-419`, confirm at 449-461 | CONFIRMED |
| muse refuses `subagent/` at `stores.ts` line 511 | the comment is at 509-510, the `recurse` guard at 512 | drift of two lines |
| `HARVEST_WINDOW_MS` six hours | `stores.ts:335` | CONFIRMED |
| registry line 645, FAST PATH AVAILABLE NOT YET USED | `registry.ts:645` | CONFIRMED |
| 25,973 threads rows / 482 user / 453 subagent / 25,038 null / 519 edges | exact, all five | CONFIRMED |
| his parent and its three children in `thread_spawn_edges`, all `open` | exact | CONFIRMED |
| **165 of 184 September rollouts are sub agents** | **165 of 185 today.** Excluding today's shard the September shards read 181 / 162; the entry's pair matches a snapshot taken after three of today's four rollouts landed and before the fourth. The ratio itself is stable at nine in ten | numerator exact, denominator moves as he works |
| the pre-assigned family is claude, cursor, cursoride, copilotide, droid, gemini, grok | **droid is `idCapture: { mode: 'unverified' }`** (`registry.ts:793`) and Tortie refuses to put an unverified flag on its argv, so droid is immune because NOTHING captures, not because Tortie names its session. cursoride and copilotide are `mode: 'none'`. cursor is `pre-assign-cmd`, not `--session-id`. Only claude, gemini, grok and pi use `--session-id` | the family is right, the REASON is wrong for three of the seven |
| pi is a harvested `cwd-newest` agent | pi is BOTH: `registry.ts:1221` pre-assigns, and its descriptor is `rescueOnly: true` (`stores.ts:648`), so its `cwd-newest` key runs only over rows already on disk | half right, and the half matters |

## 1. The three tests, over all 25,973 of his rollouts

T1 `thread_source === 'subagent'`, T2 `source.subagent` present, T3 `parent_thread_id` differs
from the record's own `id`. Zero parse errors, zero `.zst`, zero rollouts with no line-1 `id`,
zero filename-uuid disagreements.

| T1 T2 T3 | count | what these are |
| --- | --- | --- |
| `...` | 25,452 | ordinary sessions |
| `.2.` | 68 | sub agents from 0.116.0 to 0.128.0, before the `thread_source` column and before the top-level `parent_thread_id`. Their parent is ONLY inside `source.subagent.thread_spawn.parent_thread_id` |
| `12.` | 49 | `thread_source` present, parent only in the nested place |
| `123` | 404 | the modern shape |

- Any-of-three flags **521**. T1 alone 453, T2 alone 521, T3 alone 404.
- **T2 is a superset of the other two in his whole store.** T1 misses 68, T3 misses 117.
- **T3 never fires alone: zero records.** So it adds nothing today and carries the only
  false-positive risk in the set, because `forked_from_id` exists and a deliberate FORK of a
  resumable thread would plausibly carry a `parent_thread_id` too. His store contains no such
  fork to test against (every one of the 420 records with `forked_from_id !== id` is already a
  sub agent by T1 or T2), so that risk is UNTESTED rather than absent. **Ask T3 only when the
  record does not say `thread_source: 'user'`.** In his store that changes nothing, and it is
  what stops a future fork being refused.
- **False positives against a real session: ZERO for all three tests** over 25,452 session records.

`source` is not always an object. On a modern SESSION record it is a plain STRING; only a derived
record makes it an object with a `subagent` key. A `typeof === 'object'` guard is required.

### Two markers the entry does not name, both with zero false positives

| marker | on derived | on sessions |
| --- | --- | --- |
| top-level `agent_nickname` | 519 of 521 | 0 of 25,452 |
| top-level `multi_agent_version` | 404 | 0 |
| top-level `agent_path` | 398 | 0 |
| `subagent_history_start_ordinal` | 234 | 0 |

`agent_nickname` is the broadest single field after `source.subagent`. Worth a fourth test.

## 2. The chain

Walking every one of the 521 derived records to its nearest non-derived ancestor, reading the
parent from the top-level `parent_thread_id` and falling back to the nested one:

- **resolved in 1 hop 491, in 2 hops 25, in 3 hops 3.**
- **missing parent 0. Cycle 0. Self reference 0. Over any bound 0.**
- 89 distinct ids are named as a parent and **all 89 are present on disk**; 19 of them are
  themselves sub agents, which is what makes the 2 and 3 hop chains real.
- The declared `depth` field agrees with the measured hop count exactly (1:491, 2:25, 3:3), but the
  walk is what should be trusted, because `depth` is a number the vendor writes and the walk is a
  fact about the files.
- **2 records cannot be walked at all**: `019dca82-33fd-…` and `019dcae6-fa4b-…`, both codex
  0.125.0-alpha.3, both carrying `source.subagent` with NO `thread_spawn` inside it and no
  `parent_thread_id` anywhere. They are the LEFT ALONE case, and they are the only one in his store.

**Depth bound: 8.** The observed maximum is 3 and the declared maximum is 3. Eight is 2.6x that,
each hop is one bounded first-line read of a file already in the page cache, and a bound that is
generous costs nothing while a bound of 3 would silently stop repairing the day codex nests deeper.
The bound must be a REFUSAL that leaves the row alone, never a truncation that writes the last id
it reached.

**Where the parent id lives, over the 521:** both places and agreeing 404, nested only 115, top
level only 0, neither 2. So a repair that reads only `payload.parent_thread_id` would fail on 115
of his 521 derived records, which is 22 per cent. Read the nested field too.

## 3. The database

`~/.codex/state_5.sqlite`, 578 MB with a 4 MB `-wal`.

- `threads(id, rollout_path, cwd, created_at_ms, thread_source, agent_path, agent_nickname,
  agent_role, archived, …)`. 25,973 rows, which is exactly the number of rollout files on disk.
- `thread_spawn_edges(parent_thread_id, child_thread_id PRIMARY KEY, status)`. 519 rows,
  455 `open` and 64 `closed`. No self edge. 28 edges whose parent is itself a child, so the
  database states the same multi level nesting the rollouts do.
- **The column alone is not enough.** 66 edge children have `thread_source` NULL. Asking the
  column alone misses 68 of his derived records; asking `thread_source = 'subagent' OR an edge
  names it as a child` misses 2, and those 2 are the pair that has no parent anywhere.

### Can the database alone resolve a pane thread and refuse a sub agent?

Yes for the resolve: `threads` carries `cwd` and `created_at_ms` in one row with the id, which is
`cwd-newest` in one query, and it carries `rollout_path` so the answer can be checked against a
file. Yes for the refusal, using `thread_source` OR an edge.

**What it cannot answer.** The 2 alpha-build records above, which it holds with `thread_source`
NULL and no edge. And it does not resolve a pane: it knows a folder, not a tmux pane, so the
same-folder residual Phase 34 left open is untouched by adopting it.

### When it is absent or stale, and the one hazard nobody would predict

- At session open codex writes NEITHER a rollout NOR a `threads` row. Both appear on the first
  turn (measured 2026-08-11 on 0.147.0, unchanged). Adopting the database does not shorten the
  six hour watch.
- **`?mode=ro` on a WAL database with no `-shm` beside it CREATES the `-shm` file.** Measured:
  a copy holding only `db.sqlite` and `db.sqlite-wal` gained a `db.sqlite-shm` after one read-only
  `select count(*)`. His `~/.codex` is writable, so a read-only connection to his live file can
  write into his store. With no `-wal` present, `mode=ro` creates nothing.
- **`?immutable=1` creates nothing and is STALE.** Proved on a synthetic database: a row committed
  into the WAL and not checkpointed reads `1` under `immutable=1` where the truth is `1,42`. It
  ignores exactly the newest rows a harvest wants.
- **The rule that keeps both promises**: open `mode=ro` only when the `-shm` already exists or no
  `-wal` exists; otherwise fall through to the rollout parse. Never `immutable=1`, because a stale
  answer here is a wrong resume id, which is the whole defect.
- The file name is version stamped (`state_5`) and undocumented. A `state_6` is a silent absence,
  which is another reason the fallback is not optional.
- `rollout_path` resolves to an existing file for **25,972 of 25,973** rows. One does not:
  `sessions/2026/08/23/rollout-2026-08-23T16-14-08-01a03042-…jsonl`. Conversely one rollout on
  disk, `40a52ae8-f857-4d3b-8c0c-04606a0007d8` from 2025-08, has no `threads` row. Neither side is
  complete, which is the measured case for keeping both.
- **Archived threads.** `archived` is 0 for all 25,973 rows, every `rollout_path` is under
  `sessions/`, and `~/.codex/archived_sessions` DOES NOT EXIST on his machine. So the archive
  behaviour is unexercised here; the descriptor already watches that root and the rollout fallback
  is what covers a rollout moved into it, since the uuid survives in the filename.

### Do the two agree?

Over the 25,972 records both can see:

| | count |
| --- | --- |
| both call it derived | 519 |
| database derived, rollout says session | **0** |
| rollout derived, database says nothing | 2 (the alpha pair) |
| both call it a session | 25,451 |

And where both name a parent, **the parent id agrees on all 519, with zero disagreements**.

So there is no disagreement to adjudicate. The database never over-refuses, and the rollout catches
two records the database does not. That is the ordering: ask the database, and when it says nothing
ask the rollout, and refuse if either says derived.

## 4. The repair surface

The manifest is `<userData>/gmux/manifest.db`, `PRAGMA user_version` 18. The repair touches
`sessions.agent_session_id`, `sessions.resume_argv` and `sessions.resume_provenance` and nothing
else. `resume_provenance` is a JSON column of an all-optional interface (`manifest/agents.ts:367`),
so the repair note needs NO migration.

Measured against a COPY of his live manifest. 48 codex rows.

| outcome | rows |
| --- | --- |
| already a session, byte identical | 25 |
| no stored id, untouched | 19 |
| REPAIRED to parent, 1 hop | 4 |
| left alone for any other reason | 0 |

The four that move, before to after:

| row | name | status | before | after |
| --- | --- | --- | --- | --- |
| `63354c91` | Architecture REview | idle | `01a0696a-75d1-…` | `01a06966-7253-…` |
| `96150ad5` | codex-2 | discarded, removed | `01a0696a-75d1-…` | `01a06966-7253-…` |
| `680a4931` | codex-2 | discarded, removed | `01a06437-52d8-…` | `01a05ede-d84a-…` |
| `6482234f` | codex-3 | discarded, removed | `01a067b2-172c-…` | `01a05ede-d84a-…` |

`63354c91` is the session he reported and it repairs to exactly the id the entry predicts. Only
one of the four is live; the other three are removed rows.

Run twice against the copy: pass 1 moved 4, pass 2 moved 0, and the digest after pass 1 equals the
digest after pass 2. A digest over `(id, agent, agent_session_id, resume_argv, resume_provenance)`
for every non-codex row is byte identical across both passes. `resume_argv` keeps its extras:
`63354c91` comes out as
`["…/codex","resume","01a06966-7253-7a72-afc1-ae84664a7cd5","--dangerously-bypass-approvals-and-sandbox"]`.

**Where it runs.** `resumeIdHarvests(deps)`, `src/main/sessions/id-harvest.ts:324`, called once
from `src/main/sessions/core.ts:1778` after the boot reconcile. That loop already walks every
manifest row once per boot and already reads `agentSessionId`, and it SKIPS rows that hold one
(`id-harvest.ts:580` records that gate in those words) which is precisely the set the repair must
visit. The repair is a first pass in the same function, before the rescue arms any watch, so a
repaired row is not then rescued against the id it just left.

**How it proves itself idempotent.** After a repair the row's id is no longer a sub agent, so the
predicate answers `already-a-session` and the row is skipped. The gate arm is the two-pass run
above with the digest comparison, plus one arm that hands the repaired id back in and asserts zero
writes.

### Two findings the entry does not carry

1. **The repair creates duplicate ids across rows, and one duplicate already exists.** Today
   `01a0696a-75d1-…` is held by TWO rows (`63354c91` idle and `96150ad5` discarded). After the
   repair, `01a06966-…` is held by three rows, one of which (`172e96e9`, codex-1, restorable,
   same cwd `/Users/gdc/runstory`) already holds it and is untouched; and `01a05ede-…` is held by
   three, one of which (`683cef43`, "Massive GOAL RUNNER CHAD", restorable) already holds it.
   `agent_session_id` has no uniqueness constraint so nothing breaks, but two live Tortie rows
   pointing at one codex thread is a state the product has not been asked about. Name it as a
   stated limit or refuse the move when a LIVE row already holds the parent; do not empty either.
2. **A second surface holds the wrong id.** `<userData>/gmux/snapshots/<id>.capsules.json` carries
   `capsules[n].session.agentSessionId` and `capsules[n].session.resumeArgv`. His
   `63354c91-….capsules.json` names the sub agent id in all three of its capsules, and 66 of his
   72 capsule files carry an `agentSessionId`. `src/main/manifest/reconstruct.ts:504` takes its
   recipe from the first capsule that has one, so a manifest reconstruction after the repair would
   bring the sub agent id back. The capsule layout is append only and durable and must not be
   rewritten; the fix is to run the same pure predicate at reconstruct time, or to state the limit.

## 5. Is the parent resumable?

**UNMEASURED, and it cannot be measured without launching codex.** Everything short of that is
already green: the database says `thread_source: 'user'` for `01a06966-7253-7a72-afc1-ae84664a7cd5`,
no edge names it as a child, its line 1 carries no `source.subagent`, no `parent_thread_id` and no
`forked_from_id`, its `session_id` equals its own `id`, its rollout is 19 MB and on disk, and
codex's own refusal says "resume the parent first". None of that is `codex resume` returning. The
refusal is produced inside codex's thread/resume bootstrap and only running it exercises that path.

His one line, from `/Users/gdc/runstory`, which is the repaired `resume_argv` verbatim:

```
cd /Users/gdc/runstory && codex resume 01a06966-7253-7a72-afc1-ae84664a7cd5 --dangerously-bypass-approvals-and-sandbox
```

## 6. The class: the other three cwd-newest stores

### deepseek: NONE

- `~/.deepseek/sessions/` is FLAT, 34 files, `<uuid>.json`, no subdirectory at all, so there is
  nowhere for a derived stream to be filed separately either.
- All 34 have one top-level keyset, `schema_version, metadata, messages, system_prompt`, and
  `schema_version` is 1 in all 34.
- All 34 have one `metadata` keyset:
  `id, title, created_at, updated_at, message_count, total_tokens, model, workspace, mode`.
  There is no parent field, no source, no thread source and no spawn record. `mode` is `agent`
  in all 34.
- Grepping every session file for `subagent|sub_agent|sub-agent|parent_session|parent_thread|
  task_stream|delegat|spawn`: **0 hits in `metadata`**, 34 in `system_prompt` and 2 in message
  bodies, so the vocabulary appears only in prose the model was handed, never in a field that
  structures the store.
- `~/.deepseek/tasks/runtime/threads` and `.../turns`, which is where a derived stream would go if
  one existed, are EMPTY directories created 2026-05-10, and `state.json` reads `next_seq: 1`.
- `~/.codewhale` does not exist, so the successor root is unexercised.

### pi: NONE

- 56 session files under `~/.pi/agent/sessions/<cwd key>/`. Line 1 of every one of them is
  `{type: 'session', version: 3, id, timestamp, cwd}` and that is the whole keyset, in all 56.
  No parent, no source, no kind.
- The trap: later lines DO carry `parentId` (`model_change`, `thinking_level_change`, `message`).
  That is the record chain INSIDE one transcript, not a session parent. A future implementer
  reaching for `parentId` would refuse every pi session. Say so in the declaration.
- Nothing under `~/.pi` outside `agent/{bin,sessions,skills}` and `pi-acp`.

### omp: NONE

- 23 session files under `~/.omp/agent/sessions/<cwd key>/`. Line 1 is a `title` record
  (`pad, title, type, updatedAt, v`, plus `source` on 2 of them, whose only value is `"auto"`,
  meaning the title was generated). The `session` record is on line 2 and its keyset is
  `cwd, id, timestamp, type, version` (21) or that plus `title, titleSource` (2), version 3 in all
  23. No parent, no source, no kind.
- Grepping the whole session tree for `subagent|sub_agent|parentSessionId|parent_session|
  task_stream|spawnedBy|childSession`: **0 hits.**
- omp keeps three SQLite databases at `~/.omp/agent/{agent,history,models}.db`. Read read only on
  copies: `agent.db` is settings, auth, cache and model usage; `history.db` is `history(prompt,
  cwd, session_id)` and `session_titles(session_id, title)`; `models.db` is a model cache. **No
  thread table, no parent table, no spawn edge anywhere.** So unlike codex, omp states nothing in a
  database either.

### The shape of the required declaration

The field is DATA on the descriptor, not a method the pipeline hopes exists, and `none` is a claim
with its evidence attached:

```ts
/** REQUIRED. How a derived stream is told from a resumable session. */
derivedStream:
  | { kind: 'none'; measured: string }              // and `measured` says how you looked
  | { kind: 'path'; test: (name: string, depth: number, path: string) => boolean }
  | { kind: 'record'; test: (records: readonly Record<string, unknown>[]) => boolean };
```

- **codex** is `record`, asking T1, T2 and the narrowed T3 together over line 1.
- **muse** is `path`, and its existing `name === 'subagent'` guard in `recurse` becomes that
  implementation rather than a one off.
- **deepseek, pi, omp, qwen, antigravity** are `none`, with `measured` carrying the sentence from
  section 6 above.
- Required means the type has no default. A new agent does not compile without it, and a gate
  asserts every entry in `DESCRIPTORS` answers, so `none` is written by a person rather than
  reached by silence.

### Where the pipeline asks it, and there are TWO channels, not one

- **Local.** `consider()` in `src/main/manifest/harvest/watch.ts:672`. Both the FSEvents channel
  and the readdir poll funnel through it, and `d.confirm` is called from exactly one line, 712.
  The question goes immediately after `d.identify(path)` returns non-null at line 675 and BEFORE
  the freshness arithmetic and before `confirm`, so no key is ever applied to a derived record.
  The `path` form can also short circuit inside `scan()` at lines 416 and 422, which is where
  muse's guard lives today.
- **Remote, and this is the finding.** `src/main/manifest/harvest/remote.ts` is a SECOND consumer
  of `DESCRIPTORS` (Phase 73, connected machines). It reuses `roots` and `identify` but deliberately
  does NOT reuse `confirm`: `confirmRemoteCandidate` at line 462 is a hand written switch that
  re-implements every agent's confirm from head bytes, **and codex is one of its five arms**,
  reading the same single `payload.cwd` at lines 470-478. A fix confined to `stores.ts` leaves a
  connected machine taking sub agents exactly as this Mac does today. The `record` form of the
  declaration must therefore take PARSED RECORDS rather than a path, so one predicate serves the
  local read of a file and the remote read of head bytes, and `confirmRemoteCandidate` calls it
  before its switch.

## 7. Related

- `claimStrengthForKey` (`harvest/claim-strength.ts:64`) already returns `'matched'` rather than
  `'confirmed'` for `cwd-newest`, so the CLAIM ladder is honest today. What overstates is the
  descriptor's `confidence: 'exact'` at `stores.ts:419`, which reaches the row as
  `keyConfidence: 'exact'`; deepseek's identical key already declares `'weak'` at line 583.
- `npm run conformance:resume:capture` is not a file under `build/`. It is
  `GMUX_CONF_MODE=capture` over the Electron harness `GMUX_SMOKE=conformance-resume`, implemented
  in `src/main/conformance/resume.ts`. A no-turn gate arm for the sub agent predicate and the
  repair therefore belongs in a new `build/conformance-*.mjs` over committed fixtures, in the
  house style, not inside the resume conformance run.
