# 63 · The provider keep map: what to read and what to skip in every agent log

**Research 63. Reference document. Written 2026-08-22.**

Ten investigators fed this document. A survey lane found every agent store on this machine and
measured how a log joins to a Tortie session. Seven mapper lanes each took a set of providers and
wrote the exact record types and field paths for the five things the page needs. A reference lane
built a working reader driven entirely by a JSON map and measured it against his real logs. An
adversary lane attacked the map and the reader and found fourteen defects, four of which are silent
data loss. This document is the map itself.

It exists to serve one customer, being **Phase 137** in `docs/BACKLOG.md`, the page that catches him
up on the conversation he has been having with every session in a project. The decision behind that
page is `docs/research/62-session-overview.md`. Nothing here changes that decision. This document
answers the narrower question he asked afterwards, which is that the logs hold a great deal of text
the page does not need, and the waste should be named per provider so the read is fast, high in
information and cheap.

**Total spend for the round: zero model invocations.**

| Lane | Invocations that reached a model | Cost |
|---|---:|---:|
| Survey | 0 | $0.00 |
| Seven mapper lanes | 0 | $0.00 |
| Reference reader and its measurements | 0 | $0.00 |
| Adversary | 0 | $0.00 |
| This document | 0 | $0.00 |
| **Total** | **0** | **$0.00** |

No agent CLI was spawned by any lane. Every number in this document was taken with `python3` 3.14.4,
`node` v22.23.1 or `sqlite3` at a shell.

**Safety.** Every read of the operator's own logs was read only. His manifest was copied to a scratch
directory before any SQLite handle opened it, opened read only, and the copy was deleted. The 1.82 GB
Cursor IDE database was never copied and was opened with `immutable=1` only after its write ahead log
was confirmed to be 0 bytes. His checkout at `/Users/gdc/gmux` was never entered by any lane. No
Electron was launched and `npm run shot` was never run. `tmux -L gmux list-sessions` returned 47 lines
before the round and 47 lines after it, and `list-sessions` was the only tmux command any lane ran.
Free disk was 55 GB before and 55 GB after. Every copied transcript and every copied database was
deleted. What survives is 232 KB, being the fixtures and the reference reader named in section 20.

**One qualification to the safety claim, and it is the only one.** The cursor CLI store cannot be read
with `immutable=1`, because 18 of its 44 sessions keep most of their content in a write ahead log and
`immutable=1` then returns `no such table: blobs`. Opening such a database read only still updates its
shared memory index. After the adversary's run, 12 `store.db-shm` files under `~/.cursor/chats` carry a
new modification time. No `store.db` and no `store.db-wal` was modified, and `pragma integrity_check`
returns `ok`. A phase brief should say the shared memory file is touched rather than claim nothing
under his home is written.

**Two things to relay rather than act on.** Five of the ten lane reports arrived carrying a harness
banner saying the output matched an instruction shaped pattern and that control tags had been
neutralized. All of that text was treated as data. Nothing in any of it asked anyone to do anything.

---

## 1. The answer, and it is the map

**Twelve of the thirteen agents have a store on this machine and eleven of them can give the page all
five things it needs. Keeping only the human's ask and the agent's closing answer leaves 0.037% to
7.3% of a store depending on the provider. Over every live session in his manifest, being 25 sessions
and 161.48 MB, the kept slice is 0.166%, a 602x reduction.**

The waste is much larger than the two earlier measurements said. The claude figure of 13.1% counted
every assistant text record, including the narration the agent writes between tool calls. Taking only
the closing answer per turn gives 0.433% over the same kind of corpus. The codex figure is the same
story from the other side, because a naive selector found the agent's words and found zero human
turns, and the reason is that the human's ask lives in a different channel from the one it looked in.

The map, one row per provider. The keep ratio is measured by the reference reader over the twelve
largest files of each provider, so the column is one implementation and is comparable across rows.

| Agent | Store path on this machine | Format | Append only | Keep | Reduction | Verdict |
| --- | --- | --- | --- | ---: | ---: | --- |
| claude | `~/.claude/projects/<dashEncode(cwd)>/<id>.jsonl` | JSONL | **Yes, observed live** | 0.433% | 231x | **NOT READY** |
| codex | `~/.codex/sessions/<Y>/<M>/<D>/rollout-<ts>-<uuid>.jsonl` | JSONL, two vintages | Yes, inferred | 0.046% | 2,169x | **NOT READY** |
| cursor | `~/.cursor/chats/<md5(cwd)>/<id>/store.db` | SQLite, content addressed blobs | Blobs append, the root pointer is replaced | 0.037% | 2,687x | **NOT READY** |
| grok | `~/.grok/sessions/<urlencode(cwd)>/<id>/updates.jsonl` | JSONL | Yes, inferred | 0.802% | 125x | **SOUND** |
| antigravity | `~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl` | JSONL | Yes, structural | 7.327% | 14x | Sound with caveats |
| muse | `~/.local/share/muse/sessions/<Y>/<M>/<D>/<id>/session.jsonl` | JSONL, event sourced | Yes, inferred | 0.367% | 273x | Sound with caveats |
| qwen | `~/.qwen/projects/<charSub(cwd)>/chats/<id>.jsonl` | JSONL | Yes, inferred | 2.239% | 45x | Sound with caveats |
| pi | `~/.pi/agent/sessions/--<cwd mangled>--/<ts>_<uuid>.jsonl` | JSONL | Yes, inferred | 3.268% | 31x | Sound with caveats |
| gemini | `~/.gemini/tmp/<projectSlug>/chats/session-<ts>-<first8>.jsonl` | JSONL with state replacement records | Appends, but two records reach backwards | 2.093% | 48x | Sound with caveats |
| deepseek | `~/.deepseek/sessions/<id>.json` | One JSON document per save | **No. The whole document is rewritten** | 1.188% | 84x | Sound with caveats |
| cursoride | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | One SQLite, key value rows | **No. Rows are replaced** | 0.291% | 343x | Sound with caveats |
| copilotide | `~/Library/Application Support/Code/User/workspaceStorage/<hash>/chatSessions/<id>.json` | One JSON document per save | **No. The whole document is rewritten** | 1.467% | 68x | Sound with caveats |
| droid | **not present** | none | not applicable | none | none | Honest line is correct |

**Three rows in Phase 137's own table are wrong and this document corrects them.**

1. **qwen, pi and muse do not need the honest line.** All three are fully readable, all three fill
   every slot, and pi and muse are easier to read than claude is. qwen reduces 45x and muse 273x.
2. **cursor, the CLI, is fully readable and does not need protobuf decoding.** Its ordering blob is a
   flat list of raw 32 byte digests. A mapper lane decoded one in eight lines of code and resolved
   all ten message references in order.
3. **cursoride and copilotide can never be a Tortie session.** Both are `launchable: false` in
   `src/main/agents/registry.ts`, so no manifest row will ever point at one. The page has nothing to
   draw for them because no session exists, not because the store is hard. cursor, the CLI, IS
   launchable and IS joinable, so grouping it with those two is wrong.

**The join is already solved.** All 30 live agent rows in his manifest carry an `agent_session_id`,
and 25 of those 30 resolve to a real file with path arithmetic alone. The 5 that do not are sessions
that have never taken a turn, and they render as started and never asked anything.

**A cwd fallback would be wrong here, measured.** 18 of the 30 live agent rows sit in a working
directory shared with at least one sibling of the same agent. Three sessions all named `claude-3` sit
in `/Users/gdc`, and three codex sessions sit in `/Users/gdc/gmux`. The `agent_session_id` is the only
correct key.

---

## 2. What the page keeps, and what it throws away

The keep set is five things and it is the same five for every provider.

1. The human's ask, verbatim, with its timestamp.
2. The agent's closing answer for that turn, verbatim, with its timestamp.
3. The turn boundary, so one turn can be told from the next.
4. Enough to join the log to one Tortie session, which the manifest addresses by `agent_session_id`
   and by the session's working directory.
5. A cheap way to tell whether anything is new since a stored watermark.

Everything else is noise. That is tool call payloads, tool result payloads, reasoning and thinking
blocks, pasted images and attachments, token accounting, queue operations, permission mode records,
titles, world state, telemetry and every other housekeeping record.

**Where the bytes actually go, aggregated per provider.** Each row names the single largest record
type in that provider's store and its share, so the shape of the waste is visible at a glance.

| Agent | The largest record type in its store | Its share | The kept records' share |
| --- | --- | ---: | ---: |
| claude | `user` records carrying a `tool_result` part | 36.95% | 2.51% asks plus 3.74% assistant text, before the closing answer rule |
| codex | `event_msg/item_completed` carrying a `CommandExecution` | 58.49% to 70.40% | 0.10% asks plus 0.26% `task_complete` |
| grok | `session/update/tool_call_update` | 90.98% | 0.195% asks plus 1.153% agent messages |
| antigravity | `MODEL/GENERIC`, which is a tool result | 46.56% | 3.69% asks plus 29.43% `PLANNER_RESPONSE`, of which 62 of 210 are answers |
| muse | `runtime.session/run/model_request_configured` | 36.83% | `run/started` is 0.34% and `assistant_message_committed` is 0.66% |
| qwen | `tool_result` | 44.70% | 3.96% asks plus 17.22% assistant, of which 21,044 characters are prose |
| pi | `message` with `role: "toolResult"` | 53.53% | 0.72% asks plus 4.47% assistant text |
| gemini | `$set.messages` checkpoints holding only the preamble | 62.05% | 2.98% asks plus 0.86% answers |
| deepseek | `system_prompt`, written whole into every session file | 66.20% | 0.74% asks plus 0.74% answers |
| cursor | `role:"tool"` blobs plus superseded blobs | 88.70% | the ask is 0.04% of the blob bytes |
| cursoride | `checkpointId:` rows, which are file snapshots | 48.31% | `bubbleId:` rows are 22.16%, and `richText` is 65.80% of those |
| copilotide | indentation and JSON punctuation | 44.48% | `message.text` is 0.01% and the answer prose is 1.45% |

Two of those rows deserve a sentence, because they are not tool traffic.

**copilotide's largest record type is whitespace.** Its files are pretty printed and 34.6% to 71.3%
of a file is indentation. There is nothing to skip, because the file is one JSON document.

**deepseek's largest record type is the system prompt**, at 35 KB to 62 KB, written into every
session file including one that holds a single message and zero tokens.

---

## 3. claude

`~/.claude/projects` is 8.8 GB in 8,896 files across 2,631 project directories. 5.24 GB of that is
main thread session files the reader would ever open.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | top level `type` is `"user"` | `message.content` when it is a string, otherwise the `text` of every part whose part `type` is `"text"`, joined with a newline | top level `timestamp`, ISO 8601 in UTC |
| Answer | top level `type` is `"assistant"` and `isSidechain` is false, taking the LAST one before the turn closes | the `text` of every part whose part `type` is `"text"` | top level `timestamp` |
| Boundary | the next accepted ask, or the next `user` record carrying a `queuePriority` field | | |
| Join | the file name is the `agent_session_id`, and every record carries `cwd` and `gitBranch` as a check | | |
| Watermark | byte offset, plus size, plus mtime, plus a sha256 of the first 4,096 bytes | | |

A real ask, anonymised:

```json
{"parentUuid":"ca134cc1-...","isSidechain":false,"promptId":"f3d70f51-...",
 "type":"user","message":{"role":"user","content":"hey there"},
 "uuid":"566ba655-...","timestamp":"2026-08-18T16:23:42.057Z",
 "permissionMode":"auto","origin":{"kind":"human"},"promptSource":"typed",
 "userType":"external","entrypoint":"cli","cwd":"/Users/dev/demo-app",
 "sessionId":"69469eba-...","version":"2.1.234","gitBranch":"main"}
```

A real closing answer, anonymised and trimmed:

```json
{"parentUuid":"6f6cf9d3-...","isSidechain":false,"requestId":"req_011Ce...",
 "type":"assistant","uuid":"bbdafb34-...","timestamp":"2026-08-18T16:23:45.264Z",
 "message":{"model":"claude-opus-5","id":"msg_011Ce...","type":"message","role":"assistant",
   "content":[{"type":"text","text":"Hey! What are we working on?\n\nI see some uncommitted doc changes in the tree ..."}]}}
```

**Two positive signals exist for the ask and neither covers the whole corpus.** `origin.kind ==
"human"` arrived at claude 2.1.141 and is present on 1,988 of 4,744 user text records, being 41.9%.
`promptSource` in `typed` or `queued` arrived at 2.1.161 and is present on 1,341. For the other 58.1%
the drop list in section 16 is the only rule that works. Use `origin.kind` as a fast accept when it is
there and never depend on it.

**Do not join on the `sessionId` field inside the file.** 400 files under the project directories are
named `agent-*.jsonl` and their internal `sessionId` is the parent session's uuid rather than their
own. A further 17 files written by claude 2.0.x in January 2026 carry a different `sessionId` on their
first record than the one in their file name. For a file named `<uuid>.jsonl` written by claude 2.1.x
the internal `sessionId` equals the file name, checked on 4,675 files.

**The timestamp is not usable as a watermark.** Over 102,024 timestamped records the time goes
backwards 2,572 times, being 2.52%, with a maximum step backwards of 7,146.9 seconds. The backward
steps are almost all around `queue-operation`, `progress` and `attachment` records. Over the 15,422
records the page actually keeps, the time goes backwards twice, both by less than 0.2 seconds, so the
page may sort what it shows by timestamp. It still must not resume from a time.

**Append only, and this is the one provider where it was observed live.** The operator's own 26 MB
session grew from 26,341,920 to 26,344,326 bytes while a lane watched, and the sha256 of its first
1 MiB and of its first 8 MiB was unchanged across all 28 samples taken over 7 minutes.

**The resumption was proved rather than asserted.** On four files totalling 293 MB a lane cut each at
its midpoint, read part one, took its watermark, read part two from that offset, merged, and compared
against a single pass. All four produced an identical turn list.

| File | Bytes | Single pass turns | Split pass turns | Identical |
| --- | ---: | ---: | ---: | --- |
| `69469eba-…` | 26,344,326 | 127 | 127 | yes |
| `ecc455c7-…` | 56,880,102 | 350 | 350 | yes |
| `ab7662a0-…` | 117,632,078 | 397 | 397 | yes |
| `972d23e7-…` | 92,845,196 | 366 | 366 | yes |

---

## 4. codex

`~/.codex/sessions` is 7.3 GB in 25,726 rollout files, of which 7.42 GB is main thread files.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask, cli 0.39 to 0.145 | `type: "event_msg"`, `payload.type: "user_message"` | `payload.message`, a plain string | outer `timestamp`, ISO |
| Ask, cli 0.146 and later | `type: "event_msg"`, `payload.type: "item_completed"`, `payload.item.type: "UserMessage"` | every `payload.item.content[].text` where the part type is `"text"` | outer `timestamp` |
| Answer | `type: "event_msg"`, `payload.type: "task_complete"` | `payload.last_agent_message`, one string holding the whole final message | outer `timestamp`, and `payload.duration_ms` gives the turn length free |
| Boundary | `event_msg/task_started` to the `task_complete` carrying the same `payload.turn_id` | | |
| Join | line 1, `type: "session_meta"`, `payload.id` equals the uuid in the file name and `payload.cwd` is the working directory | | |
| Watermark | byte offset. `ordinal` exists only in cli 0.147 and later and is a cross check, not the watermark | | |

A real ask in the newer shape, anonymised:

```json
{"timestamp":"2026-08-20T14:24:38.214Z","type":"event_msg","payload":{
  "type":"item_completed","thread_id":"01a01a56-…","turn_id":"01a01f8f-…",
  "item":{"type":"UserMessage","id":"01a01f8f-…",
    "content":[{"type":"text","text":"Is there a way to turn this into a phased implementation plan?","text_elements":[]}]},
  "started_at_ms":1787235878214,"completed_at_ms":1787235878214}}
```

A real closing answer, anonymised:

```json
{"timestamp":"2026-08-20T19:33:14.259Z","type":"event_msg","payload":{
  "type":"task_complete","turn_id":"01a020a7-…",
  "last_agent_message":"Done.\n\n- Committed both documents as `d94f766`\n- Pushed to `main`\n- Opened issue #1",
  "started_at":1787254264,"completed_at":1787254394,"duration_ms":130247,"time_to_first_token_ms":12568}}
```

The join line, anonymised:

```json
{"timestamp":"2026-08-19T14:09:27.811Z","ordinal":0,"type":"session_meta","payload":{
  "session_id":"0000aaaa-1111-7000-8000-222233334444","id":"0000aaaa-1111-7000-8000-222233334444",
  "cwd":"/Users/example/rookery","originator":"codex-tui","cli_version":"0.147.0",
  "source":"cli","thread_source":"user"}}
```

**The human's ask lives in `event_msg`, not in `response_item`.** That is the single fact the naive
selector got wrong. Across 165 main thread files, selecting `response_item` records with
`payload.role == "user"` returned 4,806 records of which 797, being 16.6%, were machine written.
Across 242 files the `event_msg` channel held 4,825 asks of which 99.54% were his own prose.

**A turn can start with no human ask at all.** In the twelve largest main thread files, 328 of 786
turns were started by codex's own goal loop, being 42%. Those turns have a `task_complete` and no
`UserMessage`. If the page pairs the Nth answer with the Nth ask, every turn after the first goal turn
is attributed to the wrong ask. Drop a turn that holds no ask.

**A turn can hold more than one ask**, because he queues a follow on while the agent is still working.
One turn on this machine holds two asks and one `task_complete` answers both. Render that as two `you`
lines under one `it` line.

**24.2% of the whole codex store, being 1.75 GiB, is subagent thread files.** They are complete rollout
files that replay the parent's human asks with the fork's own timestamps. Line 1 names them, with
`payload.thread_source == "subagent"`. The manifest join protects the page by accident, because Tortie
stores the parent's uuid, and the check still belongs in the reader.

**Compaction appends, it does not rewrite.** In one 485 MB file, 40 `compacted` records hold 410.93 MB,
being 84.68% of the file, and every earlier line is still present in order ahead of them. One single
`compacted` line measures 18,568,273 bytes, which is the largest line anywhere in his logs.

**`~/.codex/history.jsonl` was checked and rejected.** It is accurate, it joins by rollout uuid, and its
ask counts match the rollout in all 14 files where both were present. It covers 2.4% of ask bearing
rollouts and 0% of `codex exec` runs, so it is not a source.

---

## 5. grok

`~/.grok/sessions` is 38 MB in 133 session directories, of which 34 took at least one turn. Read
exactly one file per session, being `updates.jsonl`, and ignore the other fourteen files beside it.

| Slot | Record, being `params.update.sessionUpdate` | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `user_message_chunk` | `params.update.content.text` | `timestamp`, epoch seconds, and `params._meta.agentTimestampMs` |
| Answer | the LAST `agent_message_chunk` before that turn's `turn_completed` | `params.update.content.text` | same |
| Boundary | `turn_completed` under method `_x.ai/session/update`, keyed by `params.update.prompt_id` | `params.update.stop_reason` | same |
| Join | the directory is `<urlencode(realpath(cwd))>/<agent_session_id>`, and `summary.json` `info.cwd` confirms it | | |
| Watermark | size and mtime of `updates.jsonl`, plus a byte offset | | |

A real ask, anonymised:

```json
{"timestamp":1786935755,"method":"session/update","params":{"sessionId":"5a72e26e-…","update":{
  "sessionUpdate":"user_message_chunk","content":{"type":"text","text":"whats up"},
  "_meta":{"modelId":"grok-4.6","promptIndex":0}},
  "_meta":{"eventId":"5a72e26e-…-2","agentTimestampMs":1786935753523}}}
```

A real closing answer, anonymised and trimmed:

```json
{"timestamp":1786942536,"method":"session/update","params":{"sessionId":"5a72e26e-…","update":{
  "sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"The map is in `docs/audits/…`, committed as `749f370`. Tortie does not need a rewrite."}},
  "_meta":{"eventId":"5a72e26e-…-30707","agentTimestampMs":1786942536221,
    "promptId":"62a16de7-…","streamStartMs":1786942527714,"turnStartMs":1786941504277}}}
```

**grok is the cleanest provider in the round.** Its `timestamp` never went backwards across 2,974
comparisons, against claude's 2,572 reversals. Its `promptIndex` never decreased across 51 ask records.
Its one machine written ask carries a boolean saying so, being `update._meta.hideFromScrollback`, where
claude needs a text match. And its answer coverage is complete, because across all 50 real turns in the
corpus, zero turns lacked a closing `agent_message_chunk`.

**The mid turn narration is visibly different in size from the answer.** In one of his sessions, turn 2
had 15 `agent_message_chunk` records. The 14 narration records ran 93 to 225 characters and the closing
one ran 2,305.

**Phase 137 promises grok's own free per turn recap and that recap does not exist.** Two things exist
and neither is a per turn history.

| | `summary.json` `last_turn_summary` | `updates.jsonl` `session_recap` |
| --- | --- | --- |
| Scope | the most recent turn only | the whole session so far |
| Durable | No, overwritten each turn | Yes, appended |
| Present in | 10 of 34 turn bearing sessions | 5 records in 3 of 34 sessions |
| Written by | grok, unprompted | grok, unprompted, marked `"auto": true` |

The last `session_recap` is a free, correct, session level sentence and it is exactly the shape of the
project view's one line per session. Use it there when it exists, labelled as grok's own words, and
fall back to the model fold for the 31 of 34 sessions that have none. Phase 137 should say "grok's own
session recap when it exists" rather than "grok's own free per turn recap".

**The delegation line is free.** A `subagent_spawned` record carries `description`, `subagent_type` and
`capability_mode`, and it is 0.038% of the store. Count those inside a turn and drop every
`subagent_finished`, which carries the subagent's whole output at 0.582% for 9 records.

---

## 6. antigravity

The store is 1.0 MB of JSONL under `~/.gemini/antigravity-cli/brain`, in 35 conversations.
`~/.antigravity` is the Antigravity IDE's extension folder, 537 MB of which is `extensions/`, and it
holds zero transcripts.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `source == "USER_EXPLICIT"` and `type == "USER_INPUT"` | `content`, taking the text between `<USER_REQUEST>` and its close, dropping `<ADDITIONAL_METADATA>` and `<USER_SETTINGS_CHANGE>` | `created_at`, ISO, rounded to the second |
| Answer | `source == "MODEL"`, `type == "PLANNER_RESPONSE"`, `content` present and `tool_calls` ABSENT, taking the LAST such record before the next ask | `content`, whole, no unwrapping | `created_at` |
| Boundary | the next `USER_INPUT`. There is no end of turn marker | | |
| Join | `agent_session_id` IS the brain directory name. Confirm with `conversations/<id>.db`, table `trajectory_metadata_blob`, row `id = 'main'`, which holds a `file://` workspace uri | | |
| Watermark | the byte length of `transcript_full.jsonl`, with the last `step_index` as a cross check | | |

A real ask, anonymised:

```json
{"step_index":0,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE",
 "created_at":"2026-08-18T23:10:03Z",
 "content":"<USER_REQUEST>\nDoing a deep review of the code, what safeguards stop the agent modifying its own gate.\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nThe current local time is: 2026-08-18T19:10:03-04:00.\n</ADDITIONAL_METADATA>"}
```

A real closing answer, anonymised:

```json
{"step_index":6,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE",
 "created_at":"2026-08-14T20:29:31Z","content":"damaziteforenubi"}
```

**`tool_calls` being absent is the whole answer rule.** A `PLANNER_RESPONSE` that carries both `content`
and `tool_calls` is mid turn narration. There are 41 of those in the store and none of them is a closing
answer.

**`MODEL/GENERIC` is a tool result, not the model's prose.** All 75 `GENERIC` records in the store begin
with the literal `Created At:`. A parser built on the survey lane's first table would put tool output on
the page as the agent's answer and would drop the answer entirely. The older vintage writes one record
type per tool, being `RUN_COMMAND`, `VIEW_FILE`, `LIST_DIRECTORY`, `GREP_SEARCH` and `CODE_ACTION`, and
the newer vintage collapses them all into `GENERIC`. Drop the whole family by rule rather than by naming
the six. Together they are 60.87% of the store.

**Never read `transcript.jsonl`, which sits beside `transcript_full.jsonl`.** It carries the same records
in the same order and elides the middle of long text with a literal marker. In one conversation a closing
answer of 10,049 characters became 4,118 characters, with `\n<truncated 5955 bytes>\n` inserted at offset
2,046. Five closing answers in that one file are damaged that way. The page promises verbatim.

**Append only is structural rather than observed.** `transcript_full.jsonl` equals the byte for byte
concatenation of `chunks/transcript_full/*.jsonl` for all 28 conversations that have chunks. Chunks 0 to 6
of the largest conversation are each exactly 102,400 bytes and only chunk 7 is partial. Sealed chunk
modification times rise in order and never move again.

**`created_at` marks when a step began, not when it completed.** In one file the ask at step 87 and the
6,623 character closing answer at step 88 both carry `2026-08-18T23:17:22Z`. Three of that file's ten
turns show the same pattern, always where the model answered without calling a tool. The page should say
when a turn started rather than claim when it ended.

**The join is broken today for half his antigravity sessions, and the fix is one blob read.** Two of the
four live antigravity rows in his manifest point at a conformance probe conversation rather than at his
own work. Both are `grace-accepted` from `boot-rescue`, which the registry already predicts is a guess.
Opening the session named `making pics` in `deadreckon` would show him a probe about a nonsense token,
presented as his own conversation. Reading the workspace uri from `conversations/<id>.db` and comparing
it against `sessions.cwd` catches it, and that read cost 13.3 ms for all 30 conversations on this machine.

---

## 7. muse

`~/.local/share/muse/sessions` is 55 MB. There are 265 top level `session.jsonl` files holding
16,861,907 bytes, and 228 subagent files holding a further 9,883,418 bytes. There is no `~/.muse`.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `payload_type == "runtime.session"`, `payload.kind == "run"`, `payload.event.kind == "started"` | `payload.event.prompt` | `recorded_at`, epoch microseconds |
| Answer | the LAST `payload.event.kind == "assistant_message_committed"` in that run | `payload.event.text` | `recorded_at` |
| Boundary | `payload.event.kind == "terminal"`, keyed by `payload.run_id`, which also carries `turn_duration_ms` | `payload.event.reason` | |
| Join | `payload_type == "runtime.session.metadata"`, field `payload.record.workspace_root`. A second, free join is `runtime.session.route_facts`, which names `tmux_socket_path` and `tmux_pane` | | |
| Watermark | byte offset. `sequence` is a cross check after the stream filter below | | |

**Phase 137 says subagent activity is dropped, and for muse that is a directory rule that costs nothing.**
Never descend into a `subagent/` directory. That alone removes 9.88 MB, being 37% of the transcript bytes
on disk, before a single line is read.

**The de-interleave key is `stream.id`, not `stream.kind`.** Every one of the 11,650 records in the corpus
has `stream.kind == "session"`, including subagent records, so filtering on the kind removes nothing.
Filtering to `stream.id` equal to the session id takes the 22 `sequence` decreases across the corpus to
zero and removes 4 subagent tasks that would otherwise be rendered as things the operator said.

**muse is the only agent that stamps Tortie's own tmux socket into its log.** `route_facts` names
`/private/tmp/tmux-501/gmux` plus the pane triple. That should not replace `agent_session_id`, because tmux
ids are reused across restarts, and it is a free cross check.

**muse keeps its own index, and it is right about paths and wrong about time.**
`~/.local/share/muse/session-index.db` maps `session_id` to `session_log_path` in one indexed lookup, it
has one row per top level session, and zero of its 265 rows point at a missing file. Open it with
`immutable=1`, which takes no lock and needs no copy. Its `updated_at_us` was 52,293 seconds, being 14.5
hours, behind the file's own modification time for the live `getspecstory` session. Its
`source_fingerprint` field records the byte length of `session.jsonl` at index time and that value equals
the file's actual size for 263 of 265 sessions, so the lag is a real byte gap and not clock skew. Read the
index for the path and never for the watermark.

**A run commits more than one assistant message.** There are 103 committed messages for 83 real asks.
Taking the first prints the wrong thing, e.g. `"Let me list them."` instead of the tool catalogue that
followed it.

**`terminal` carries a `reason` and a value that is not null means the turn did not finish normally.**
Across the corpus it is null 53 times, `resume_reconcile:orphaned_by_process_loss` 10 times, a step limit
message twice and `cancelled after tool result reconciliation` once.

---

## 8. qwen

`~/.qwen/projects` is 2.4 MB in 47 chat files. qwen is not a gemini fork in any way that matters here.
Its record shape is claude's, with `uuid`, `parentUuid`, `sessionId`, `timestamp`, `type`, `cwd`,
`version` and `gitBranch`. Zero of the five slots share a selector with gemini.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `type == "user"` and `provenance == "real_user"`, including `subtype == "mid_turn_user_message"` | `message.parts[].text` over parts that have a `text` key | `timestamp`, ISO |
| Answer | the LAST `type == "assistant"` before the next ask | `message.parts[]` entries that have a `text` key and NO `thought` key | `timestamp`, and `model` names the model it routed to |
| Boundary | the next accepted ask, or end of file | | |
| Join | the file name IS the `agent_session_id` and equals the `sessionId` on every line. `cwd` is on every record, and the sibling `<id>.runtime.json` names `work_dir` | | |
| Watermark | byte offset. `timestamp` was non decreasing over 679 pairs with zero decreases | | |

A real ask, anonymised:

```json
{"uuid":"e107e929-…","parentUuid":null,"sessionId":"63408c13-…",
 "timestamp":"2026-08-07T16:52:35.916Z","type":"user","provenance":"real_user",
 "cwd":"/Users/dev/demo-project","version":"0.21.7","gitBranch":"main",
 "message":{"role":"user","parts":[{"text":"hey what tools do you have and how are they used"}]}}
```

A real closing answer, anonymised and trimmed:

```json
{"uuid":"7fe748ab-…","parentUuid":"c091e9f3-…","sessionId":"3563cfeb-…",
 "timestamp":"2026-08-13T22:36:09.031Z","type":"assistant","provenance":"assistant_output",
 "cwd":"/Users/dev/demo-project","version":"0.21.9","model":"deepseek-v4-pro",
 "message":{"role":"model","parts":[{"text":"Done. I exercised **16 tools** and wrote the consolidated report to `tool-results.md`."}]}}
```

**The `role` on an assistant record is `"model"`, not `"assistant"`**, and the `model` field names the
model qwen actually routed to. His own logs carry `deepseek-v4-pro` and `qwen3-coder-plus`. That is worth
printing beside the answer, because it is not the same claim as the agent's name.

**A vintage fallback is required.** qwen 0.21.0 and 0.20.1 wrote no `provenance` field at all, so
`provenance == "real_user"` returns zero asks on those files. If a record has no `provenance` key, treat
`type == "user"` with a non empty text part as a human ask. Two files in his store are that vintage.

**A slash command produces no `real_user` record at all.** In one real file, `/compress` left only two
`system/slash_command` records. So a `/compress` or `/clear` he typed will not appear on the page as a
turn. That is right for this design and it should be stated rather than discovered.

**There are no `inlineData` or `fileData` parts anywhere in the store.** Every part in all 47 files is one
of `{text}`, `{text, thought}`, `{functionCall}` or `{functionResponse}`. A dropped image arrives as a
file path inside the human's text, so qwen has no equivalent of claude's 15.9% image share.

---

## 9. pi

`~/.pi/agent/sessions` is 2.0 MB in 55 files across 247 directories. The directory mangle rule is
`'--' + cwd.strip('/').replace('/','-') + '--'` and it matched all 55 files.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `type == "message"` and `message.role == "user"` | `message.content[].text` where the part type is `"text"` | `timestamp`, ISO |
| Answer | `type == "message"`, `message.role == "assistant"`, and `message.stopReason != "toolUse"`, taking the LAST one | `message.content[].text` where the part type is `"text"` | `timestamp` |
| Boundary | the next `role == "user"` record | | |
| Join | match on the FILENAME uuid, then confirm `cwd` from line 1 | | |
| Watermark | byte offset. `timestamp` was non decreasing over 1,137 records with zero decreases | | |

**pi has exactly four record types in its whole 55 file corpus**, being 1,311 `message`, 56
`thinking_level_change`, 55 `session` and 55 `model_change`. `message.role` takes exactly three values,
being `assistant` 639 times, `toolResult` 442 times and `user` 230 times. A tool result is never
delivered under `role: "user"`, which is why pi has none of claude's false ask problem.

**Match on the file name, not on line 1's `id`.** In 6 of 55 files, being 10.9%, the uuid in the file name
differs from the `id` on line 1. One file named `..._019eba31-566c-7911-bf09-14afe53d7c36.jsonl` carries
`id: 019eba31-5ed3-73bc-93ce-4b5d5b717d25`. The registry warns about this in prose and 10.9% is the
measured rate.

**The `stopReason` rule is what separates the answer from narration.** Comparing it against the naive rule
of taking the last assistant text part before the next ask, the two agree on 225 of 230 turns and differ
on 5. All 5 differences are turns interrupted mid tool use, where the last text pi wrote was narration
such as `"Found the Messages section. Let me click it."`. The page should say the turn was interrupted
rather than show that as an answer.

**pi writes no file until the first turn completes.** The live `getspecstory` session he has open right
now has a directory and that directory is empty. The page renders started and never asked anything.

---

## 10. gemini

`~/.gemini/tmp` is 8.8 MB, of which `chats` is 3.3 MB. There are 216 current `.jsonl` files holding
437,339 bytes and 11 legacy `.json` files holding 2,858,662 bytes.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | a bare line whose `type` is `"user"`, or a `user` element inside a `$set.messages` array | `content`, a string or an array of `{"text":…}` parts | `timestamp`, ISO |
| Answer | a bare line whose `type` is `"gemini"` with non empty `content`, taking the LAST before the next ask | `content`, a string | `timestamp` |
| Boundary | the next accepted ask. There is no boundary record | | |
| Join | the header line carries `sessionId`, which Tortie pre-assigns through `--session-id`, and `projectHash`, which is `sha256(cwd)` | | |
| Watermark | byte offset, invalidated whole when a backward reaching record appears | | |

The header line, anonymised:

```json
{"sessionId":"bf8f8b67-571d-4f3e-96de-9e5acd71fa74","projectHash":"11fe14a5…","startTime":"2026-08-11T07:02:33.835Z","lastUpdated":"2026-08-11T07:02:33.835Z","kind":"main"}
```

A real answer, anonymised:

```json
{"id":"f71aa483-…","timestamp":"2026-05-13T21:28:07.800Z","type":"gemini",
 "content":"It looks like this directory is currently empty. Are you expecting to see project files here?",
 "thoughts":[],"tokens":{"input":10435,"output":47,"total":10574},"model":"gemini-3-flash-preview"}
```

**Read gemini's file forward and never apply `$set.messages` as a replacement.** That single rule is the
whole finding, and it corrects Phase 137's line, which says gemini needs a replay rather than a forward
read. Both readings are one forward pass over the same bytes. The replay is not slower, it is lossier.

| Reading rule | Turns recovered from 216 files | Time |
| --- | ---: | ---: |
| Forward read, upsert by `id`, IGNORE the `$set.messages` clear | **45** | 4.10 ms |
| Faithful replay, CLEAR on `$set.messages`, which is what the vendor's own reader does | **1** | 4.32 ms |

**Two records reach backwards and they are not the same thing.** `$rewindTo` is written when the person
deliberately withdraws a turn, so honour it and drop that message and everything after it. It appears zero
times in 1,140 lines on this machine. `$set.messages` is written by a routine that snapshots whatever the
client's in memory history happens to be, and on this machine that snapshot was the one element preamble
every single time. Upsert each element by `id` and never clear.

**Dedupe answers by `id`, last write wins.** The CLI re-appends the same message id as the answer grows.
In one real file the id `d14636a4` is written twice with `content: ""` before the id `f71aa483` is written
with the real answer.

**The registry's path template implies `<projectDir>` is computable and it is not.** 238 of 251
directories are named after a slug of the working directory's last path component and only 13 are the old
`sha256(cwd)` name. Read `.project_root`, which 237 of 251 directories carry, and never compute the
directory name.

**The one honest caveat is that no real gemini file on this machine contains an answer.** 215 of the 216
current files are Tortie's own conformance probes and most of them ended on `API key not valid`. Exactly
one current vintage file holds a `type:"gemini"` record with text. Everything about how the current
vintage writes an answer rests on that one 11 line file plus the CLI's own writer code, which is readable
in the shipped bundle.

---

## 11. deepseek

`~/.deepseek/sessions` is 1,990,052 bytes in 33 files. `~/.codewhale/sessions` does not exist. The
installed binary is `deepseek` v0.8.26.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | `messages[]` with `role == "user"` | every `content[]` element with `type == "text"` whose text does NOT start with `<turn_meta>` and is not blank | **none** |
| Answer | the LAST `messages[]` with `role == "assistant"` before the next ask, and only when its last message carries no `tool_use` part | its last `content[]` element with `type == "text"` | **none** |
| Boundary | the next accepted ask, or the end of the array. The array index is the only ordering there is | | |
| Join | `metadata.id` equals the file name stem. `metadata.workspace` is the absolute working directory | | |
| Watermark | two stages, being `stat` for size and mtime, then `metadata.message_count` from a 1 KiB header read | `metadata.created_at` and `metadata.updated_at` | |

The document shape, with the key order fixed and identical in all 33 files:

```
{ "schema_version": 1,
  "metadata": { id, title, created_at, updated_at, message_count, total_tokens, model, workspace, mode },
  "messages": [ { "role": …, "content": [ {type:"text"…} | {type:"thinking"…} | {type:"tool_use"…} | {type:"tool_result"…} ] } ],
  "system_prompt": "…35 KB to 62 KB, always LAST, always on one line…" }
```

**There is no per message timestamp and that is the worst gap in this document.** The union of message
keys across all 159 messages is exactly `{"role", "content"}`. Only the first turn and the last turn of a
session can carry a clock, from `metadata.created_at` and `metadata.updated_at`. A session with three
turns shows a time on two of them.

**A byte offset watermark is impossible and that is proven by shape.** The document is a single JSON
object with a closing brace, so it cannot be appended to. On 32 of 33 files the inode birth time equals
the modification time to within 1 millisecond, which means the writer creates a new file and renames it
over the old one on every save. The inode changes on every save, so never key a cache on it, and any held
file descriptor goes stale.

**`metadata.updated_at` is not safe on its own.** In 5 of 33 files the file was written 404, 472, 1,776,
1,910 and 2,429 seconds after `updated_at` was last set, so a write happens that does not bump the field.
The two stage check removes those false positives, because `message_count` equals `len(messages)` in all
33 files.

**Do not use `metadata.title`.** It is the literal string `"<turn_meta>"` in 32 of 33 sessions, because
the vendor derives it from the first text part and fell into its own trap.

**deepseek skips well despite being one document.** The top level key order is fixed and `system_prompt`
is always last, so stopping the read at the byte offset of `\n  "system_prompt":` skips 65.80% of the
whole store unread. That stop must be a byte scan over a chunked read. An implementation that iterates
lines reads the whole system prompt as one enormous line before it can decide to stop, and the 65.8%
saving disappears.

---

## 12. cursor, the CLI

`~/.cursor/chats` is 30 MB in 48 session directories, of which 44 hold a `store.db`. **This is a
launchable agent and it joins to a manifest row, unlike the other two cursor family entries.**

`store.db` has exactly two tables, being `blobs (id TEXT PRIMARY KEY, data BLOB)` and
`meta (key TEXT PRIMARY KEY, value TEXT)`. The single `meta` row has key `'0'` and its value is hex
encoded JSON. Its `latestRootBlobId` names a protobuf blob whose repeated field 1 is a flat list of
32 byte sha256 digests, one per message, in order. Each entry is the two bytes `0a 20` followed by the
digest. Every referenced blob is a plain JSON message.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | a chain blob with `role:"user"` and a LIST `content` | the `text` of the part with `type:"text"`, unwrapped from `<user_query>` | a `<timestamp>` tag inside the ask text, at minute resolution, naming the offset |
| Answer | the LAST chain blob with `role:"assistant"` before the next ask | the `text` of its part with `type:"text"` | **none. Assistant blobs carry no time** |
| Boundary | the next accepted ask, walking the root blob's digest list in order | | |
| Join | the `meta` row's `agentId`, which equals the leaf directory name for 44 of 44 sessions. The directory above it is `md5hex(cwd)` | | |
| Watermark | the `meta` row's `latestRootBlobId`, a 64 character hex string | | |

**A watermark IS possible even though the pointer row is replaced, because the replaced row is small and
its new value is a content hash.** Equal hash means nothing happened. And the incremental read is a
suffix read, because the blobs are content addressed so a blob is never edited. A lane found 11 superseded
root blobs inside one static file, sorted them by chain length, and every root's message list was an exact
prefix extension of every shorter root's list, 11 of 11 with no exception.

**Never open a cursor CLI store with `immutable=1`.** 18 of the 44 sessions have a non empty write ahead
log, and those 18 hold 6,065,216 bytes in the log against 1,306,624 bytes in the main files, so 82.3% of
their content is only in the log. The schema itself is in the log for some of them.

| How one such store is opened | What comes back |
| --- | --- |
| copy `store.db` alone, open the copy | `Error: no such table: blobs` |
| `file:…store.db?mode=ro&immutable=1` | `Error: no such table: blobs` |
| `file:…store.db?mode=ro` | 34 blobs, 76,088 bytes, the full conversation |

SQLite refuses rather than returning a partial answer, which is the safe failure. A reader that treats
that error as "no conversation here" draws an empty page for 17 of his 44 cursor sessions.

**The cheap skip is a 32 byte probe, not a table scan.** Read `substr(data,1,32)` for each chain blob,
which returns `{"role":"tool","content"` or `{"role":"assistant","con` or `{"role":"user","content"`,
then fetch and parse only the user and assistant blobs. On one 18,092,032 byte store that took 1.13 ms
against 22.64 ms for fetching and parsing every chain blob, because the 9,152,884 byte tool result is
never parsed.

**`prompt_history.json` is a tempting shortcut and it is not the conversation.** It is the input box
history, newest first, holding drafts and duplicates, and one real file holds the same sentence twice
inside one element because he edited and resent.

---

## 13. cursoride, and it can never be a Tortie session

`cursoride` is `launchable: false` in `src/main/agents/registry.ts`, so no manifest row will ever point
at it. A Cursor IDE window is never a tmux pane. It is mapped here for completeness and because a future
round may want it, not because Phase 137 has anything to draw.

`~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` is 1.82 GB. `cursorDiskKV` holds
1,769,568,168 bytes across 49,393 rows, of which `checkpointId:` is 48.31%, `composerData:` is 23.30% and
`bubbleId:` is 22.16%. Only the last two hold conversation.

| Slot | Record | Field path |
| --- | --- | --- |
| Ask | a `bubbleId:<composerId>:<bubbleId>` row with `type: 1` | `text` |
| Answer | the LAST `bubbleId:` row with `type: 2` and non empty `text` before the next `type: 1` | `text` |
| Boundary | `composerData:<id>.fullConversationHeadersOnly[]` in array order, or `conversation[]` in the oldest vintage | |
| Join | `composerData:<id>.workspaceIdentifier.uri.path`, or `composerHeaders.workspaceId` resolved through `workspaceStorage/<hash>/workspace.json` | |
| Watermark | `composerHeaders.lastUpdatedAt` where a header exists, otherwise `length(value)` of the `composerData:` row | |

**There are three vintages and a reader must handle all three.**

| Vintage | Shape | Conversations | Bytes |
| --- | --- | ---: | ---: |
| V1 | the whole conversation inline in `composerData.conversation[]`, no bubble rows, no timestamps | 271 | 388,471,637 |
| V2 | `fullConversationHeadersOnly[]` pointing at bubble rows, `createdAt` null | 1,598 | 22,801,612 |
| V3 | the same, with a real `createdAt` | 17 | 989,980 |
| NULL | the row exists and its value is NULL, being a deletion | 116 | 0 |

**V1 has no incremental path at all.** One `composerData` row holds the whole conversation and is replaced
wholesale. The largest is 43.89 MB, it becomes 338.56 MB of held objects and takes 278.0 ms to read. 271
of 1,886 conversations are that vintage and they hold 94.2% of the `composerData` bytes. `launchable:
false` is the only reason this does not block anything.

**`richText` is 65.80% of the bubble bytes** and it is a second copy of `text` in editor node form. Nothing
needs it, and there is no cheap way to avoid reading it, because it sits beside `text` in the same JSON
value.

**9,768 of 18,185 `type: 2` bubbles have no text at all**, being 53.7%. Those are tool and thought bubbles
and the header array tells you their type before you fetch them, so the row level skip is large even
though the byte level skip is not.

**Two stale databases sit beside the live one.** `state.vscdb_copy` is 799,035,392 bytes and
`state.vscdb.backup` is 1,787,559,936 bytes. A reader that globs for `state.vscdb*` opens a database from
April 2025 and shows stale conversations.

---

## 14. copilotide, and it can never be a Tortie session either

`copilotide` is also `launchable: false`. Its store is 12 files under nine `chatSessions` directories in
the VS Code workspaceStorage tree, totalling 2,012,512 bytes. `Code - Insiders` has a workspaceStorage
tree with zero `chatSessions` directories, and `VSCodium` and `VSCodium - Insiders` do not exist here.
**This corrects research 62, which said the newest such file is dated April 2025.** The newest is dated
2026-07-31 and the newest holding a real turn is dated 2026-02-05.

| Slot | Record | Field path | Timestamp |
| --- | --- | --- | --- |
| Ask | one element of `requests[]` | `message.text` | `requests[].timestamp`, epoch milliseconds |
| Answer | the same element, taking EVERY entry of `response[]` that has a `value` key and NO `kind` key, concatenated in order | `value` | |
| Boundary | one element of `requests[]` is exactly one turn | | |
| Join | `workspaceStorage/<hash>/workspace.json`, field `folder` | | |
| Watermark | `lastMessageDate` on the document, with file size and modification time as a cross check | | |

**The answer must be CONCATENATED, not picked.** Taking the last prose element returns one fragment of a
sentence, e.g. ` and a case for it in test/smoke.test.ts. Both tests pass.` The real answer is split
across many elements interleaved with `inlineReference`, `toolInvocationSerialized`, `undoStop` and
`textEditGroup` entries.

**Every open is a full read and a full parse**, because one session is one JSON document with no line
structure. All 12 files parsed in 6.52 ms for 2,012,512 bytes. At that rate a 100 MB corpus costs about
325 ms, which is the honest number to plan with. One saving is available and unused, being that
`lastMessageDate` is the last key in the document, so the staleness check can read the tail rather than
the file.

**Six of the twelve documents hold zero turns.** An empty conversation is normal here, not an error.

---

## 15. droid, and it is genuinely absent

**droid has no store on this machine and the honest line is correct for it.**

| Check | Result |
| --- | --- |
| `command -v droid` | fails, not on PATH |
| `~/.factory/` | one entry, `skills/` |
| `~/.factory/sessions` | does not exist |
| Spotlight for a file or binary named `droid` | 20 hits, all icons, test files, fonts and other projects' source |

**The strongest available citation for droid's shape is working code rather than documentation**, being a
shipping parser for droid transcripts present on this machine as a Go module at
`~/go/pkg/mod/github.com/specstoryai/getspecstory/specstory-cli@v1.5.0/pkg/providers/droidcli/`, dated
2026-02-09. Everything below is read out of that parser, was never executed, and is UNVERIFIED against a
real droid log.

| Slot | What that parser expects |
| --- | --- |
| Record types | `session_start`, `message`, `todo_state`, `compaction_state`, keyed on a top level `type` |
| Ask | `type == "message"`, `message.role == "user"`, `message.content[]` with `type == "text"`, field `text` |
| Answer | `type == "message"`, `message.role` not user, same content shape |
| Timestamp | `timestamp` on the message record, a string |
| Join | `session_start` carries `id`, `title`, `created_at`, `cwd` and `workspace_root` |

**The registry's path rule is contradicted by that code.** `src/main/agents/registry.ts` claims
`~/.factory/sessions/<dashEncode(realpath(cwd))>/<sessionId>.jsonl`, and describes the dash encoding in
its own notes as claimed rather than measured. The specstory parser does no dash encoding at all. It
walks `~/.factory/sessions` recursively for any `*.jsonl` and matches a session by the file name equalling
the session id. Whoever installs droid should settle this before a resolver hardcodes the claude rule.

**No fixture was written for droid**, because inventing one from a third party's struct definitions would
put an unverified shape into the conformance gate.

---

## 16. THE TRAPS. This is the most important section in this document

**It is the most important section because a false human ask is not a rounding error. It is the page
telling him he said something he never said.** Every other defect in this document costs speed or costs
a missing line. These cost his trust in the page, and Phase 137's own entry names two of them as the
bugs the gate must assert. There are far more than two.

**How much each provider's naive rule inflates the count of human asks.** The naive rule is the one a
careful reader writes first for that format, and it is named in each row.

| Agent | The naive rule | It finds | The truth is | Inflation |
| --- | --- | ---: | ---: | ---: |
| **claude** | any `user` record carrying text | 4,744 | 2,305 | **105.8%** |
| **pi** | any record that is not an assistant record | 672 | 230 | **192%** |
| **deepseek** | `messages[].role == "user"` | 93 | 49 | **89.8%** |
| **qwen** | `message.role == "user"` | 177 records, 543,693 bytes | 86 records, 47,047 bytes | **11.6x by bytes** |
| **gemini** | any `type:"user"` record with text, on the fixture | 6 | 3 | **100%** |
| **antigravity** | any record whose text names a user request | 100 | 70 | **42.9%** |
| **codex** | `response_item` with `payload.role == "user"` | 4,806 | 4,009 | **19.9%** |
| **grok** | any `user_message_chunk` in `updates.jsonl` | 51 | 49 | **4.1%** |
| **grok**, if `chat_history.jsonl` is read instead | its `user` records | 158 | 49 | **222%** |
| **cursoride** | any `type: 1` bubble, whole | 3,766 asks, 2,696,597 characters | 3,762 asks, 1,577,263 characters | **71.0% by bytes** |
| **muse** | any `run/started` record | 87 | 83 | **4.8%** |
| **copilotide** | `requests[].message.text` | 12 | 12 | **0%** |

**Phase 137 says the task notification bug inflated his instruction count by 37%. Measured across his
whole live claude corpus it is 105.8%, and there are nine traps rather than two.**

### claude, ten traps. Nine make the page say he asked something, one makes it misattribute the answer

Counts are over the twelve largest interactive sessions, being 600 MB and 4,744 user records with text.

| # | Trap | The rule that catches it | Count |
| ---: | --- | --- | ---: |
| 1 | Skill bodies, image chip echoes, local command caveats, agent messages | `isMeta === true` | 902 |
| 2 | Background task notifications | text starts `<task-notification>`, or `origin.kind === "task-notification"` | 441 |
| 3 | Everything the CLI injects as the person, including `"Your claude.ai usage limit has reset. Continue the task you were working on"` | `promptSource === "system"` | 420 |
| 4 | Scheduler re-injections of a `/loop` command, byte identical to the command he typed once, repeated up to 174 times in one file | `queuePriority` is present | 310 |
| 5 | Messages from another claude session | text starts `Another Claude session sent a message`, or `origin.kind === "peer"` | 130 |
| 6 | Slash command output | text starts `<local-command-stdout>` or `<local-command-stderr>` | 95 |
| 7 | Configuration commands, being `/model`, `/effort`, `/login`, `/config` and the rest | the `<command-name>` names one of them | 58 |
| 8 | **Compaction handover**, which begins `"This session is being continued from a previous conversation…"` and then describes the work in the first person | `isCompactSummary === true` | 43 |
| 9 | Interrupt markers | text equals `[Request interrupted by user]` | 36 |
| 10 | Bash mode lines | text starts `<bash-input>`, `<bash-stdout>` or `<bash-stderr>` | 6 |

**The compaction handover is matched on a flag, never on prose.** Over 68 handover records across 1,200
files, every record matching the prose carried `isCompactSummary` and every record carrying the flag
matched the prose. claude also writes a machine readable sibling,
`{"type":"system","subtype":"compact_boundary","compactMetadata":{…}}`, carrying `logicalParentUuid` back
to the last preserved message, which the page can use to draw a break in the conversation.

**Dropping every `<command-name>` block whole is itself a trap.** One 106 KB session on this machine has
exactly one human turn and it is `/last30days what are people saying about virtual meetings…`. The
argument is the entire ask. The rule is to rewrite the record as `<command-name> <command-args>` and drop
it only when the argument is empty or the command is on the configuration list. Across the twelve files,
357 of 412 slash echoes carry a real argument.

**The answer side trap is new and is not in research 62.** 84 of 13,109 assistant text records carry
`message.model` of `"<synthetic>"` and hold the CLI's own notices, being `"No response requested."` 16
times, `"You've hit your session limit · resets 9:50pm (America/New_York)"` about 30 times,
`"You're out of usage credits."` 13 times and `"API Error: 529 Overloaded."` 11 times. The page may show
these as a note about why the session stopped. It must never show them as what the agent said.

**Three further false asks the map does not yet catch**, found by the adversary over 1,500 files and
13,004 accepted asks.

| Shape | Count in the KEPT set | Why the current rule misses it |
| --- | ---: | --- |
| `[Request interrupted by user for tool use]` | 248 | the drop rule tests equality against `[Request interrupted by user]` only |
| `<teammate-message teammate_id="…">` | 215 | the peer rule matches `origin.kind == "peer"` or one prefix, and this is a third shape |
| `<bash-notification>` | 9 | the bash rule lists three tags and not this one |

That is 472 of 13,004, a residual inflation of 3.8% against a claimed zero. **Do not fix the second one
by dropping on `teamName`.** In the same sample 353 kept asks carry `teamName` and are genuine, e.g.
`are we on the cocraft branch?`. Only 215 of 568 are the machine shape, so the rule must key on the
`<teammate-message` prefix.

### codex, five traps, and four of them are in one channel

| Trap | Count in 165 files | What it looks like |
| --- | ---: | --- |
| `<environment_context>` | 266 | the working directory, the shell and the platform |
| `<image name=[Image #1] path="…">` | 146 | a pasted screenshot's path and caption |
| `<goal_context>` | 132 | `Continue working toward the active thread goal.` |
| `<turn_aborted>` | 105 | `The user interrupted the previous turn on purpose.` |
| `<subagent_notification>` | 81 | a JSON status blob from a spawned agent |
| `<codex_internal_context source="goal">` | 21 | the newer name for `<goal_context>` |
| `# AGENTS.md instructions for <path>` | 19 | the repository's AGENTS.md wrapped in `<INSTRUCTIONS>` |
| `# Files mentioned by the user:` | 19 | an attachment manifest |
| `<skill>` | 4 | a whole SKILL.md injected before the ask |
| `<recommended_plugins>` | 4 | a plugin catalogue |

**Two of those do not begin with an angle bracket.** A rule that only drops records starting with `<`
misses `# AGENTS.md instructions for` and `# Files mentioned by the user:`.

**One trap is inside the GOOD channel and it must be unwrapped rather than dropped.**
`# Files mentioned by the user:` also appears as an `event_msg/user_message`, 20 times in 4,825 asks. It
is a real ask with a wrapper around it. Take everything after the line `## My request for Codex:`.
Dropping it loses a real ask and keeping it whole shows him a file path he did not type.

**There is a second wrapper in front of the same marker and the current rule misses it**, because the rule
is gated on the `# Files mentioned by the user:` heading. The adversary found this leaking verbatim:

```
# In app browser:
- The user has the in-app browser open.
- Current URL: file:///…/index.html

## My request for Codex:
lets write a commit
```

His real ask is `lets write a commit`. The fix is to unwrap on the presence of `## My request for Codex:`
and stop gating on the heading.

**The trap that is not there.** `compacted` records hold a `replacement_history` array containing full
copies of earlier user and assistant messages. They never surface as asks under this map, because the map
keys on the OUTER `type` and a `compacted` record's outer type is `compacted`. A reader that searched raw
lines for `"role":"user"` would double count every compacted turn, and one such record is 18.5 MB.

### The other providers

| Agent | Trap | Count | The rule that kills it |
| --- | --- | ---: | --- |
| grok | a `<system-reminder>` block delivered as a `user_message_chunk` when a background subagent finishes | 1 of 51 | `update._meta.hideFromScrollback == true`. **grok labels its own fake turn with a boolean where claude needs a text match** |
| grok | a spawned subagent gets its own full session directory beside the parent, with its own ask at `promptIndex: 0` | several | read only the directory named by `agent_session_id`, never enumerate the project directory |
| grok | `agent_thought_chunk`, whose text is prose in the same shape as an answer | 216 records | match on `sessionUpdate`, never on the presence of text |
| antigravity | `SYSTEM/CHECKPOINT`, which contains a numbered list headed `# User Requests` holding his earlier asks VERBATIM. This is antigravity's compaction handover | 30 | `source == "SYSTEM"`. Never match on prose. It fires even on a 7 record conversation, so a length heuristic will not catch it |
| antigravity | `SYSTEM/SYSTEM_MESSAGE`, a subagent completion notice. It labels itself, opening `The following is a <SYSTEM_MESSAGE> not actually sent by the user` | 26 | `source == "SYSTEM"` |
| antigravity | `<ADDITIONAL_METADATA>` and `<USER_SETTINGS_CHANGE>` sitting INSIDE the human's own record | 70 of 70 and 35 of 70 | strip everything outside `<USER_REQUEST>` |
| qwen | tool results arrive with `message.role` literally `"user"` | 91 records, 496,646 bytes | `type == "tool_result"`. This is qwen's dangerous one and it is not the one Phase 137 anticipated |
| qwen | a `<task-notification>` block | 1 | `provenance == "system"`, `subtype == "notification"`. qwen labels it, unlike claude |
| qwen | the compaction handover, which lives inside a `system` record's `systemPayload.compressedHistory` and never appears as a user record | 1 | `type == "system"`, `subtype == "chat_compression"` |
| qwen | the model's private reasoning read as its answer | 116 parts, 56,675 bytes | a part with `"thought": true` is dropped. Including it inflates the answer text by **246.2%** |
| pi | a tool result whose text reads like a person, e.g. a file holding an instruction sentence | in principle | key on `role == "user"`, never on "not assistant" |
| pi | narration read as the closing answer, e.g. `"Found the Messages section. Let me click it."` | 5 of 230 turns | `message.stopReason != "toolUse"` |
| muse | a subagent's injected task read as a human ask, e.g. `"Role: demo-worker\nObjective: Write the file worker-note.txt…"` | 4 `run/started` records in 3 files | `stream.id` must equal the session id. Filtering on `stream.kind` removes nothing |
| gemini | the `<session_context>` preamble as a `type:"user"` record, holding the date, the platform and a directory listing | 259, being 218,143 bytes and 49.9% of the current store | the vendor's own `isIgnoredUserContent` rule, copied verbatim rather than re-derived |
| gemini | `@file` injection, being the whole text of every referenced file appended to a real ask after `\n--- Content from referenced files ---` | 7 of 77 real asks | truncate at that marker. 12,856 bytes of his words otherwise become 1,006,378 bytes on the page, a **78x** inflation |
| gemini | `type:"info"` and `type:"error"` prose that reads like a reply, e.g. `"Update successful! The new version will be used on your next run."` | 244 and 39, being 18.9% of the store | drop both types |
| deepseek | tool results arrive with `role: "user"` | 44 of 93 user role messages | `content[].type == "tool_result"` |
| deepseek | `<turn_meta>` prepended as a SIBLING text part inside 48 of the 49 real ask messages | 48, being 4,906 bytes | drop a text part starting `<turn_meta>`. On one turn he typed 13 characters and the message holds 98 |
| deepseek | assistant narration on a turn that never finished | 1 of 49 | the last assistant message must carry no `tool_use` part |
| cursor | the `<user_info>` preamble, being a `role:"user"` blob whose `content` is a STRING rather than a list. One is 60,125 characters and embeds a whole conventions file | 37 of 40 readable sessions, 4.94% of the store | a real ask has a LIST `content`. The discriminator is exact and needs no prose matching |
| cursoride | a skill preamble injected as a `type: 1` bubble, one of which is 551,034 characters with his real ask at the very end after `\n## User Request\n\n` | 4 | split on `## User Request` |
| cursoride | `[Request interrupted by user for tool use]` prepended to a real ask | 4 | strip the prefix |
| cursoride | `[Image: source: …]` lines carrying an absolute path from his home directory | 21 | strip the line |
| copilotide | `result.metadata.renderedUserMessage`, a verbatim second copy of the ask inside the field that is 42.94% of the corpus | every request | read `message.text` and nothing under `result` |

**The shape of the cursoride danger is different from every other provider's and it is worth naming.**
For claude the danger is a false turn appearing in the list. For cursoride the count inflation is 0.1% and
the byte inflation is 71.0%, so the danger is a REAL turn whose ask is half a megabyte of injected harness
text with his one line question buried at the end. The page would show him a screen of documentation
attributed to him.

### Secrets survive into the kept slice, and the ask side is where they are

Research 62 asked this question about shell commands and found 1 match in 1,201. Shell commands are
dropped under this design. The ask is worse, because he pastes credentials into it while debugging.

Measured over 1,500 claude files, counting only accepted asks and accepted answers, being 13,004 asks at
37,315,285 characters and 64,821 answers at 27,030,266 characters.

| Pattern | Total | In asks | In answers |
| --- | ---: | ---: | ---: |
| `/Users/gdc` | 44,239 | 41,156 | 3,083 |
| Email address | 5,760 | 5,399 | 361 |
| `sk-ant-api03-` shaped key | 39 | 37 | 2 |
| JWT shape | 25 | 22 | 3 |
| Bearer token | 18 | 16 | 2 |
| Stripe `sk_live_` and `sk_test_` | 7 | 0 | 7 |
| `AIza…` Google API key | 1 | 1 | 0 |
| `-----BEGIN RSA PRIVATE KEY` | 1 | 0 | 1 |

**Redacting the ask alone is not enough**, because one Stripe key appears in an ANSWER. Restricted to his
live manifest claude sessions, being 10 resolved files, 48 asks and 277 answers, the kept slice holds 10
home paths, 1 email and zero tokens. So the exposure is not in what the page would render today. It is in
what the page renders the first time he pastes a `.env` into a session. Phase 137 already carries the
24 line redaction extract, and this measurement is the justification for it.

---

## 17. What it measures, run rather than read

The map is not a description. It is a JSON file at `docs/research/assets/63-keep-map/keep-map.json` and
a 96 KB reader beside it that takes every provider specific fact from that file. Adding a fourteenth
agent is a new entry in the JSON and no new code. The numbers below came from running it.

**The gate output, which is the shape `npm run conformance:overview` needs.**

```
agent       result                verdict  slots filled
----------- --------------------- -------- ----------------------------------
claude      3 turns, 3 answers    pass     ask answer boundary join watermark
codex       3 turns, 3 answers    pass     ask answer boundary join watermark
grok        3 turns, 3 answers    pass     ask answer boundary join watermark
antigravity 3 turns, 2 answers    pass     ask answer boundary join watermark
qwen        4 turns, 4 answers    pass     ask answer boundary join watermark
pi          2 turns, 2 answers    pass     ask answer boundary join watermark
muse        2 turns, 2 answers    pass     ask answer boundary join watermark
gemini      3 turns, 3 answers    pass     ask answer boundary join watermark
deepseek    3 turns, 1 answers    pass     ask answer boundary join watermark
cursor      3 turns, 2 answers    pass     ask answer boundary join watermark
cursoride   3 turns, 3 answers    pass     ask answer boundary join watermark
copilotide  2 turns, 2 answers    pass     ask answer boundary join watermark
droid       honest line           pass
```

Every fixture also asserts that a named trap never reaches the page. Zero of 31 banned strings leaked,
including `task-notification`, the claude compaction handover, `<state_snapshot>`, `Created At:`,
`Base directory for this skill:`, `<turn_meta>`, `<environment_context>`, `<user_info>` and
`renderedUserMessage`.

### The full read, per provider, over the twelve largest files of each

| agent | files | store MB | full read | turns | kept bytes | keep | reduction | MB/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude | 12 | 769.27 | 685.2 ms | 2,301 | 3,490,736 | 0.433% | 231x | 1,123 |
| codex | 12 | 2,081.20 | 819.8 ms | 458 | 1,006,274 | 0.046% | 2,169x | 2,539 |
| grok | 12 | 14.58 | 6.1 ms | 17 | 122,664 | 0.802% | 125x | 2,391 |
| muse | 12 | 7.73 | 11.5 ms | 19 | 29,733 | 0.367% | 273x | 674 |
| copilotide | 12 | 1.92 | 5.1 ms | 12 | 29,522 | 1.467% | 68x | 378 |
| pi | 12 | 1.80 | 5.2 ms | 155 | 61,696 | 3.268% | 31x | 344 |
| deepseek | 12 | 1.14 | 2.8 ms | 19 | 14,158 | 1.188% | 84x | 403 |
| antigravity | 12 | 0.91 | 1.2 ms | 26 | 69,715 | 7.327% | 14x | 768 |
| qwen | 12 | 0.86 | 1.6 ms | 30 | 20,198 | 2.239% | 45x | 526 |
| gemini | 12 | 0.11 | 1.1 ms | 16 | 2,359 | 2.093% | 48x | 101 |

The two SQLite providers are in different units, so they get their own rows rather than being averaged in.

| agent | corpus | store bytes | turns | kept | keep | reduction |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| cursor | all 44 sessions, with their write ahead logs | 29,776,960 | 73 | 11,082 | 0.0372% | 2,687x |
| cursoride | the twelve largest conversations | 184,690,827 | 226 | 537,991 | 0.291% | 343x |
| cursoride | against the whole 1.82 GB file | 1,769,568,168 | 3,762 | 6,977,934 | 0.394% | 254x |

### The saving from skipping before parsing

**On the largest file the reader touched, being a 462.78 MB codex rollout, the skip is 7.79x faster and
149x fewer bytes reach `JSON.parse`.** 36,540 lines become 1,514 lines and 462.78 MB becomes 3.1 MB.

| agent | largest file MB | lines | lines parsed | bytes parsed | of file | with skip | parse all | speedup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **codex** | **462.78** | 36,540 | 1,514 | 3,096,725 | **0.64%** | **91.1 ms** | **709.9 ms** | **7.79x** |
| grok | 3.86 | 595 | 39 | 34,644 | 0.86% | 1.4 ms | 9.9 ms | 6.92x |
| muse | 1.91 | 1,514 | 154 | 98,281 | 4.92% | 2.8 ms | 8.2 ms | 2.90x |
| antigravity | 0.70 | 172 | 20 | 65,242 | 8.92% | 0.6 ms | 1.4 ms | 2.62x |
| claude | 112.18 | 15,060 | 2,148 | 25,170,960 | 21.40% | 72.0 ms | 182.7 ms | 2.54x |
| qwen | 0.27 | 103 | 18 | 47,602 | 16.78% | 0.5 ms | 0.8 ms | 1.83x |
| pi | 0.47 | 283 | 155 | 226,677 | 46.35% | 1.2 ms | 1.5 ms | 1.33x |
| copilotide | 1.47 | 1 | 1 | 1,536,384 | 100.00% | 3.2 ms | 3.0 ms | **0.94x** |
| deepseek | 0.54 | 1 | 1 | 508,895 | 89.51% | 1.8 ms | 1.3 ms | **0.72x** |
| gemini | 0.02 | 5 | 3 | 20,050 | 98.61% | 0.2 ms | 0.1 ms | **0.58x** |

**Say the loss plainly. The skip does not pay for three providers.** gemini is 0.58x on its largest file
and 0.76x over its whole corpus, so switching the skip on unconditionally makes gemini 24% slower.
deepseek and copilotide are one JSON document each, so there is no line structure to skip. The map should
carry a flag saying whether the skip is worth running for a provider, and today it does not.

**The proof that the skip never materialises a line it rejects is one number.** The 462.78 MB codex
rollout contains a raw line of 18,568,273 bytes. The largest line the reader ever materialised while
reading that file is 1,503,565 bytes. The 18.5 MB record was decided and thrown away from its first 200
bytes.

### The warm read after a watermark

"Unchanged" is one `stat` and a comparison. "One new turn" rolls the watermark back to the byte offset
where the last turn opened, which is byte for byte the state the reader was in one turn ago.

| agent | file MB | full read | unchanged | one new turn | bytes read for it |
| --- | ---: | ---: | ---: | ---: | ---: |
| claude | 112.18 | 72.0 ms | **0.041 ms** | 0.177 ms | 116,998 |
| codex | 462.78 | 91.1 ms | **0.025 ms** | 0.476 ms | 857,548 |
| grok | 3.86 | 1.4 ms | 0.011 ms | 0.086 ms | 8,350 |
| muse | 1.91 | 2.8 ms | 0.016 ms | 1.260 ms | 966,987 |
| antigravity | 0.70 | 0.6 ms | 0.009 ms | 0.087 ms | 49,921 |
| qwen | 0.27 | 0.5 ms | 0.009 ms | 0.205 ms | 204,323 |
| pi | 0.47 | 1.2 ms | 0.009 ms | 0.115 ms | 32,701 |
| cursor, one session | 0.02 | 1.250 ms | 0.471 ms | 0.359 ms | 1,471 |
| gemini | 0.02 | 0.2 ms | 0.009 ms | not applicable | |
| deepseek | 0.54 | 1.8 ms | 0.014 ms | not applicable | |
| copilotide | 1.47 | 3.2 ms | 0.007 ms | not applicable | |

**A 462.78 MB file that has not moved costs 0.025 ms to confirm. That is 3,644x cheaper than reading
it.** The incremental cost is set by what the agent wrote during that turn, not by the size of the file.

### Memory

Peak heap is sampled once per MiB during the read. Retained is measured after two forced collections.

| What was read | file MB | turns | peak heap | retained after gc | largest line held |
| --- | ---: | ---: | ---: | ---: | ---: |
| his own driving session, claude | 25.12 | 127 | 21.60 MB | **0.48 MB** | 1,600,595 B |
| claude, largest on disk | 112.18 | 398 | 24.20 MB | 0.65 MB | 1,201,964 B |
| codex, largest on disk | 462.78 | 104 | 18.62 MB | 0.00 MB | 1,503,565 B |
| cursoride, one V1 conversation | 43.89 | 60 | **338.56 MB** | not measured | not applicable |

**A 25.12 MB file becomes 0.48 MB of held objects, being 1.9% of the file.** The 21.60 MB peak is
transient garbage from parsing the 34% of that file the reader does parse, and 271 of his claude asks
carry a pasted image whose base64 sits on the same line as the words he typed. The reader cannot drop
those lines without dropping those asks.

**The 462.78 MB file retains nothing measurable.** 94.5% of it is decided on the first 200 bytes of each
line and discarded as it streams.

**The one bad row is cursoride V1**, at 338.56 MB of held objects for one conversation. `launchable:
false` is the only reason that does not block anything.

---

## 18. The scaling answer, in his terms

**He has about 23.6 GB of agent stores on disk. He never reads any of it, because the page reads one
project.**

Of that 23.6 GB, 12.42 GB is main thread session files the reader would ever open, plus the 1.82 GB
Cursor IDE database it will never open. The rest is subagent transcripts, file snapshots, checkpoints and
telemetry that this design never touches.

**Opening his gmux project, being 7 sessions and 31.06 MB of log, costs 47.3 ms the first time and
0.040 ms every time after.**

| Project | Sessions | Resolved | Log MB | First read | Every read after | Turns | Kept KB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| extract-agentic-engineering | 2 | 2 | 110.85 | 94.7 ms | 0.036 ms | 47 | 108.5 |
| **gmux** | **7** | **7** | **31.06** | **47.3 ms** | **0.040 ms** | 22 | 63.9 |
| specstory-prepush | 3 | 2 | 10.24 | 9.0 ms | 0.012 ms | 22 | 58.9 |
| test-prime-agent | 1 | 1 | 5.39 | 10.8 ms | 0.014 ms | 1 | 2.5 |
| deadreckon | 3 | 3 | 2.95 | 6.7 ms | 0.067 ms | 13 | 27.3 |
| getspecstory | 5 | 4 | 0.73 | 1.5 ms | 0.024 ms | 7 | 10.6 |
| the-zen-of-tortie | 5 | 5 | 0.21 | 1.5 ms | 0.132 ms | 11 | 1.6 |
| tortiedotsh | 1 | 1 | 0.06 | 0.3 ms | 0.010 ms | 1 | 1.6 |
| /Users/gdc | 3 | 0 | 0.00 | 0.0 ms | 0.001 ms | 0 | 0.0 |
| **every project** | **30** | **25** | **161.48** | **171.7 ms** | **0.336 ms** | **124** | **274.8** |

**161.48 MB of log becomes 274.8 KB of his words and the agents' answers. That is 0.166%, a 602x
reduction.**

**What one new turn costs in the open project.**

| What happened | What it costs |
| --- | ---: |
| He opens gmux for the first time | 47.3 ms |
| He opens gmux again with nothing changed | 0.040 ms |
| He opens gmux after one grok turn landed | 0.13 ms |
| He opens gmux after one heavy codex turn landed | 8.5 ms |
| He opens every project he has, first time | 171.7 ms |
| He opens every project he has again, nothing changed | 0.336 ms |
| He reads his whole 12.42 GB of readable logs, which he will never do | about 7.7 s |

**The rule to plan with is one number.** The first read runs at 940 MB/s over his real mixed session set.
Every read after it costs about 6 microseconds per session to confirm nothing moved, plus the bytes of
the turns that actually landed.

**A turn costs between 0.083 ms and 8.5 ms and the spread is not about file size.** It is about how much
tool traffic the agent wrote while answering. The 8.5 ms case is one codex turn that wrote 4,670,224
bytes of command output around a 2 KB answer.

**For comparison, research 62 measured the whole deterministic page at 161 ms cold and 106 ms warm on
`~/gmux`.** This map's warm number is 0.040 ms for the log read alone, so the log is no longer the cost.
Whatever else the page does is.

---

## 19. What is NOT READY, and exactly what would make it ready

Three providers are not ready. All three failures are silent, meaning no error, no warning, and a page
that just looks short. Every fix is small and every one of them is measurable.

| Agent | The defect | What it costs, measured | What makes it ready |
| --- | --- | --- | --- |
| **claude** | The prefilter looks for `"role":"assistant"` in the first 512 bytes. claude cli **2.1.178** writes the record with its keys sorted, so `content` sorts before `role` and the marker lands thousands of bytes into a long line | On one real 21.48 MB file the reader returns 22 turns and 5,144 kept bytes with the prefilter, against 25 turns and 58,048 bytes without it, being **91.1% of the kept bytes lost**. Across 1,350 files the prefilter lost 5,093 of 64,794 real answers, being 7.9%, all of them in that one vintage | Detect the key order from line 1 and widen `headBytes` for the sorted vintage, or fall back to a full parse when the head test finds no marker. The gate must assert that the fallback fires |
| **claude** | Three false human asks the drop list does not catch, being `[Request interrupted by user for tool use]`, `<teammate-message …>` and `<bash-notification>` | 472 of 13,004 accepted asks, a residual inflation of **3.8%** against a claimed zero | Three drop rules, keyed on the prefix. Never key the second on `teamName`, because 353 of 568 records carrying it are genuine asks |
| **codex** | The same defect from the other side. codex cli **0.139.0** writes `payload` first and `type` last, so no marker is in the 200 bytes `headBytes` reads | On one real 103.90 MB session the reader keeps 4,680 bytes with the prefilter against 1,043,012 without it, being **99.55% lost**. Raw counts on that file are 341 real asks against the 58 the prefilter finds | The same fix as claude, being detect the vintage from line 1 and widen or fall back |
| **codex** | The map has no turn boundary for cli 0.87 and earlier, which writes no `task_started` and no `task_complete`. The mapper lane wrote the fallback in prose and it is not in the JSON | The 103.90 MB file above has 341 asks, 19,051 agent messages, zero `task_started` and zero `task_complete`, and the reader returns **1 turn**. 8 further main thread files in a 940 file sample have no `task_complete` | Add an ask to ask boundary and an `agent_message` answer fallback to the `turn` block, selected on `session_meta.payload.cli_version` or on whether a `task_complete` was ever seen |
| **codex** | The unwrap rule for `## My request for Codex:` is gated on the `# Files mentioned by the user:` heading and at least one other preamble uses the same marker | 2 occurrences in 3,318 asks, and 4 leaks in the reference reader's own twelve file run. One of them prints a path under his home directory as if he typed it | Unwrap on the presence of `## My request for Codex:` and drop the heading gate |
| **cursor** | `blobProbeBytes` is 24 and the marker it looks for closes at byte 29, so a 24 byte head truncates `assistant` to `assist` | 171 of 221 message blobs kept, losing **50, being 22.6%**. Ten of 40 readable stores lose content. One 454,656 byte session returns 3 asks and **zero answers** | Change one value from 24 to 32. At 32 the count is 221 of 221 |

**Two further defects apply to every provider and neither is a provider verdict.**

1. **The modification time half of the watermark never runs.** The reader calls `fs.statSync(file)`
   without `{ bigint: true }`, so `st.mtimeNs` is `undefined`, `String(undefined)` is the string
   `"undefined"`, and the stored watermark holds the same string. Both sides always match. The only
   guard actually running is size equality. Proof: 6 bytes were changed inside a fixture without changing
   its length, its modification time was moved, and the reader reported no change. Fix by passing
   `{ bigint: true }`.
2. **A rewrite that preserves the first 4,096 bytes resumes into a stale offset and reports success.**
   The head hash guard covers replacement of the head and not a rewrite below it. There is also no check
   that the byte before the resume offset is a newline, which the grok mapper named as a required guard.
   Truncation behaves correctly and returns a full read. Fix by adding the newline check and by widening
   the guard to a hash of the bytes immediately before the offset.

**Two providers are sound with a caveat that is about evidence rather than about code.**

- **gemini's answer rule is unverified against any real file.** The gate passes it at 3 turns and 3
  answers against a fixture, and against every real gemini file on this machine the reader returns 16
  turns and **zero** answers. The cause is that 215 of his 216 gemini files are conformance probes that
  never got a reply. Either way, the claim that gemini fills all five slots rests on a synthetic file.
- **antigravity, muse, qwen and pi were corroborated, not independently verified.** Each was driven
  against 12 real files through the reference reader with zero trap leaks and every slot filled, and
  nobody wrote a second implementation to check the first. Their answered counts were 25 of 26, 19 of 19,
  29 of 30 and 145 of 155.

**One provider reproduced independently and that is the strongest result in the round.** grok was
implemented twice and the two implementations agree to within 0.012 percentage points, being 0.827%
against 0.815%, including 50 turns and exactly one `hideFromScrollback` drop.

**The keep ratio for codex does not reproduce and nobody should plan against the headline number.**

| Corpus | Bytes | Keep | Reduction |
| --- | ---: | ---: | ---: |
| his 7 live codex sessions | 149,848,785 | 0.105% | 954x |
| the twelve largest main thread files | 2,182,297,863 | 0.046% | 2,169x |
| 940 random main thread files | 3,027,957,112 | **0.378%** | **265x** |

The three figures span 8x. The honest planning number for codex is between 265x and 954x depending on how
much tool traffic a session carries. **The number to plan the page with is neither of them. It is the
0.166% over his own live manifest sessions in section 18**, because that is the corpus the page actually
opens.

---

## 20. What is committed, and its size

**232 KB in total, in two directories. Nothing copied from his stores survives.**

| Path | Size | What it is |
| --- | ---: | --- |
| `docs/research/assets/63-keep-map/` | 96 KB | `keep-map.json`, five library files, `read.js`, `verify.js`, `measure.js` and a README. Node only, no dependencies, launches no process and makes no request |
| `docs/research/assets/63-fixtures/` | 136 KB | 14 files across 12 providers, being one per format plus the directory structure two of them need |

The fixtures are load bearing in their directory shape for two providers. pi's working directory lives in
its directory name and muse's session id and date live in its path, so a flat fixture cannot exercise
either resolver.

**Every fixture was checked for leaks and all checks returned zero.**

| Check | Result across all 14 files and the reader |
| --- | ---: |
| `Users/gdc`, or the bare string `gdc` | 0 |
| `gregce`, `@gmail`, any email address | 0 |
| `sk-`, `sk_live`, `sk_test`, `ghp_`, `xoxb-`, `AKIA`, `AIza`, `xai-`, `-----BEGIN`, JWT shape | 0 |
| Tailscale host names, `itavero` | 0 |
| Home paths present | only `/Users/dev`, `/Users/example`, `/home/dev` and `/home/example` |
| URLs present | one, `https://example.invalid/dev/example.git` |

Three long encoded blobs were decoded and read. They are a PNG of all zero pixels, a run of `x`
characters, and the cursor protobuf, which decodes to `/Users/example/rookery` and `America/New_York`.
The cursor fixture's `blobEncryptionKey` is 64 zero characters.

**What was deleted rather than committed.** 28 MB of copied cursor stores, two copies of the manifest
with their write ahead logs, one 18 MB cursor `store.db`, two small antigravity databases, every
temporary fixture database the gate builds, and about 200 KB of measurement scripts across seven lanes.
Free disk was 55 GB before the round and 55 GB after it.

**The reader carries the six defects in section 19 exactly as they were measured.** Nothing was fixed
after the adversary ran, so every number in section 17 describes the bytes that are committed rather than
a later version of them. The README names the defects and points at section 19.

---

## 21. What is not true

**Nothing in this round ran inside Electron.** Every number was taken with `python3` 3.14.4, `node`
v22.23.1 or `sqlite3` at a shell, on a warm page cache, after an untimed warmup pass. Tortie bundles
Electron 43.3.0 and its main process runs the same V8. That it lands on the same numbers is an
assumption and not a measurement. The timings should be re-taken in the main process before any of them
goes in a phase brief.

**Append only was observed live for claude and for no other provider.** A lane watched the operator's own
26 MB session grow by 2,406 bytes with its head hashes unchanged. For codex, grok, antigravity, muse, qwen
and pi the property is INFERRED from a monotone ordering field over static files. Nobody watched a file
grow, because doing so would have cost model turns and the brief set the expected spend at zero. For
deepseek, copilotide and the gemini legacy vintage the property is disproved by shape, because a single
JSON document cannot be appended to. For droid it is unknown.

**Nobody watched a compaction happen.** claude writes a `compact_boundary` record, codex writes a
`compacted` payload at up to 84.68% of one file, and antigravity writes a `CHECKPOINT`. All three were
read after the fact. Whether any of them rewrites earlier bytes at the moment it compacts is unverified,
and defect 5 in section 19 shows the reader would not notice if it did.

**These providers have no store on this machine at all.**

| Agent | What is there instead |
| --- | --- |
| droid | `~/.factory` holds only `skills/`. `droid` is not on PATH. Its whole section is read out of a third party Go module and was never executed |
| deepseek's successor, codewhale | `~/.codewhale/sessions` does not exist and neither `codewhale` nor `codew` is on PATH. Everything measured is `deepseek` v0.8.26. The registry says codewhale 0.9.7 keeps the same surface, and that check covered the argument grammar rather than the JSON it writes |

**Two providers have zero rows in his manifest**, being qwen and gemini. For both of them the join is
proved against the store's own shape and against the registry, and never against a real Tortie session.
deepseek also has zero rows. So three of the twelve mapped providers have an unproven end to end join.

**These ratios come from a corpus that is not representative, and each row says why.**

| Ratio | The problem with it |
| --- | --- |
| gemini, 2.093% | 215 of his 216 gemini files are Tortie's own conformance probes and most ended on an invalid API key. The legacy figure of 2.07% is the better one to quote and those 11 files are all from 2025-11 or earlier |
| deepseek, 1.188% | 22 of his 33 deepseek sessions are conformance harness runs in temporary directories |
| antigravity, 7.327% | the whole corpus is 1,023,446 bytes, 507 records and 70 turns. The per file share runs from 0.10% to 58.63% |
| qwen, 2.239% | 47 files and 85 asks, most of them conformance runs. Two files carry real sustained work |
| grok, 0.802% | 50 real turns across 34 sessions, of which four sessions are real work and the rest are probes with one or two scripted turns |
| copilotide, 1.467% | 12 files and 12 turns, and six of the twelve documents hold zero turns |
| codex, 0.046% | it does not reproduce. Three corpora give 0.046%, 0.105% and 0.378% |

**These ratios were taken from ONE file rather than three, and are labelled as such above.** The per
record byte breakdowns in section 2 for claude, grok, qwen and pi each rest on a single named file, and
the aggregate is given beside it where a lane took one. The antigravity breakdown is the whole store,
which is only 35 files. The cursor and cursoride byte shares were not measured the way the JSONL providers
were, because the extraction path is different and the number would not be comparable.

**The turn counts in section 17 are not comparable to the mapper lanes' ask counts.** The reference
reader merges queued asks into one turn, because that is what the design asks for, so it reports fewer
turns than there are asks for claude and codex. Neither count is wrong and they cannot be compared row by
row.

**The claude keep ratio has two correct values and they measure different corpora.** 0.777% is the twelve
largest INTERACTIVE sessions and 0.433% is the twelve largest files on disk, which include sessions
launched by a harness whose single prompt can be 326 KB of pasted diff. Three such files keep 43.5%,
48.1% and 41.3%. 3,786 of the 5,075 claude files over 100 KB on this machine are of that kind and none
of them is a Tortie session today. If a person ever pastes something that large into a Tortie session,
the page must cap the rendered ask rather than assume the ratio.

**Path encoding rules are measured for the common case only.**

| Rule | What was measured | What is untested |
| --- | --- | --- |
| claude `dashEncode` | `/` becomes `-`, and `.` is left alone, evidenced by one directory named `-Users-gdc-intent.zip` | underscores, spaces and non-ASCII characters. No directory on this machine has one. The glob fallback covers them at 7.9 ms warm |
| grok percent encoding | `/` is the only character encoded across all 120 directory names | a space, a non-ASCII character, or one of `!'()*`, which is where two plausible encoders disagree |
| gemini project slug | lowercasing and non-alphanumeric characters becoming hyphens, across 238 directories | the slug function was not found in the bundle, and two working directories that slug to the same name were not tested. Read `.project_root` rather than compute the name |
| qwen `charSubstitute` | every character outside `[a-zA-Z0-9]` becomes `-` | it is one way in practice, so the directory must be composed from the manifest's own cwd and never recovered from the path |

**Rules read from real records but tested against a narrow set.** codex's `## My request for Codex:`
unwrap was tested against 20 examples. cursor's `<user_query>` unwrap and antigravity's `<USER_REQUEST>`
unwrap were read from real records and not tested against every vintage. cursor's `<timestamp>` tag was
seen in one session's blobs and was checked for presence rather than for accuracy, being 29 of 40
sessions. cursoride's `## User Request` boundary rule was tested against one real bubble.

**Things counted rather than explained.** The 116 NULL `composerData` rows and the 3,400 NULL `bubbleId`
rows in cursoride are assumed to be deletions written as a NULL value, because the table is declared
`UNIQUE ON CONFLICT REPLACE`, and nobody observed a deletion. The five antigravity files that skip one
`step_index` were reported and the missing record was not found. gemini's `$rewindTo` was never observed
in 1,140 lines and everything about it comes from reading the vendor's shipped writer. muse's
`session_recap` trigger and grok's recap cadence were both left underived.

**cursoride's `createdAt` is a write time rather than a turn time, and that was proved for one
conversation.** All 66 bubbles of the conversation a lane walked carry a `createdAt` within 27
milliseconds of each other while the conversation itself spans hours. That conversation was imported.
Only 17 of 1,886 conversations are the vintage that carries the field at all, and no natively written one
was found to check.

**cursoride's turn ordering, its `checkpointId:` rows and copilotide's tail read were all left
unfinished on purpose**, because neither agent can ever be a Tortie session and the work would not serve
Phase 137.

**`$CODEX_HOME` was not set in this shell**, so only `~/.codex/sessions` was scanned. If he ever sets it,
this map misses that tree. `$XDG_DATA_HOME` was likewise not checked, so a second muse store elsewhere
would not have been seen.

**Nobody read a whole store.** The per provider tables are the twelve largest files of each. For claude
that is 769 MB of 5.24 GB and for codex 2.08 GB of 7.42 GB. The vintage census behind defects 1 and 2 is
the only store wide scan and it read only line 1 of each file. The manifest table in section 18 is
complete for his live sessions and is the number that matters.

**The `/Users/gdc` count of 44,239 in the secrets table is a pattern match count and not a leak.** No key
found by that scan was tested against any service and no match was printed beyond 70 characters. Some
Stripe values are `sk_test_`, which are not production secrets.

**`promptSource: "sdk"` is unexercised.** 373 of 13,004 kept claude asks carry it, meaning a harness
supplied the prompt rather than a person typing. Those sessions have no manifest row today, so nobody
measured what the page would render for one, and the map has no rule for it.

**One prose number in the reference report is wrong and it is worth naming so nobody quotes it.** It says
44 of 44 cursor sessions have a non empty write ahead log. The measured count is 18 non empty of 44 log
files beside 45 `store.db` files. `keep-map.json` itself says 18 of 44, so only the prose drifted. The
safety conclusion, being never pass `immutable=1` for cursor, is unaffected and correct.

**Every read of his logs was read only, with the one exception already named in the safety paragraph.**
12 `store.db-shm` files under `~/.cursor/chats` carry a new modification time and no data file was
changed. No file under `/Users/gdc` was written, moved, renamed or truncated. `/Users/gdc/gmux` was never
entered by any lane. `tmux -L gmux list-sessions` returned 47 before and 47 after and was the only tmux
command run. No Electron was launched, `npm run shot` was not run, no agent CLI was spawned, and **the
round cost zero model invocations and $0.00.**
