# Research 63. The keep map, and a reader that proves it

This directory holds the map of what a session log is worth reading, one entry per provider, and a
reader that uses it. Node only. No dependencies. No Electron. Nothing here launches a process or
makes a request.

## What is here

| File | What it is |
| --- | --- |
| `keep-map.json` | The map, as DATA. One entry per provider, thirteen entries. A vendor change edits this file, not the code. |
| `lib/expr.js` | The evaluator for the map. It knows nothing about any provider. |
| `lib/lines.js` | The streaming JSONL scanner that decides from raw bytes BEFORE `JSON.parse`. |
| `lib/fold.js` | Folds an ordered record stream into turns, per the map's `turn` block. |
| `lib/fixtures.js` | Turns the three descriptive fixtures back into real files, so the same reader runs against them. |
| `lib/discover.js` | Finds real session logs on this machine. Read only. |
| `read.js` | The reader. One entry point, four containers. |
| `verify.js` | Runs every fixture through the reader and asserts the slots. This is the shape `npm run conformance:overview` needs. |
| `measure.js` | Measures the reader on real logs. Read only. |

## Run it

```
node read.js --provider claude --file ~/.claude/projects/<dir>/<id>.jsonl
node verify.js
node --expose-gc measure.js --top 12
```

## The four things it does

**1. The map is data.** There is no per provider parser. `read.js` has four container readers,
being `jsonl`, `json-doc`, `sqlite-cursor` and `sqlite-cursoride`, and everything else is a value
in `keep-map.json`. The predicates, the field paths, the text transforms, the drop rules with their
reasons, the turn boundary and the watermark kind are all values. Adding the fourteenth agent is a
new entry in the JSON.

**2. It skips before parsing.** For a JSONL provider the scanner reads the first `headBytes` of a
line, tests raw byte substrings, and if the line fails it discards the rest of that line AS IT
STREAMS. A rejected line is never made into a Buffer and never reaches `JSON.parse`. The largest
single line in the operator's codex store is 18,568,273 bytes and the reader never holds it.

**3. It returns only the five things the page needs.** Per turn: the ask verbatim with its
timestamp, the closing answer verbatim with its timestamp, the turn as its own object, plus the
join and the watermark once per session. Nothing else crosses the boundary.

**4. It supports a watermark.** For an append only log the watermark is a byte offset, plus the
file size, the mtime and a hash of the first 4,096 bytes as a replacement guard. The offset stored
is the offset of the line that OPENED the still open turn, so resuming re-emits that turn whole. A
file that has not moved costs one `stat`.

## The refusals this reader keeps

- It never opens a cursor CLI store with `immutable=1`. 18 of 44 of them keep most of their content
  in the write ahead log and `immutable=1` returns `no such table: blobs`.
- It never uses a timestamp as a watermark. claude's goes backwards 2,572 times in 102,024 records.
- It never applies gemini's `$set.messages` as a clear. Applying it faithfully loses 44 of 45 turns.
- It never takes a `PLANNER_RESPONSE` that also carries `tool_calls` as antigravity's answer, and
  never takes a claude record whose `message.model` is `<synthetic>`, because that is the CLI
  speaking, not the agent.
- It drops a codex turn that has no human ask. 328 of 786 turns in the twelve largest files were
  started by codex's own goal loop.

## Known defects. Read these before you trust a number this reader prints

An adversary lane attacked this reader after it was measured, and **nothing here was fixed
afterwards**, so every number in `docs/research/63-provider-keep-map.md` section 17 describes these
bytes rather than a later version of them. Section 19 of that document holds the full list with the
measurement behind each one. The six that matter:

1. **claude, silent data loss.** `prefilter.headBytes` misses claude cli 2.1.178, which sorts its
   keys. On one real 21.48 MB file that loses 91.1% of the kept bytes.
2. **codex, silent data loss.** The same defect for codex cli 0.139.0, which writes `payload` first.
   On one real 103.90 MB file that loses 99.55% of the kept bytes.
3. **cursor, silent data loss.** `blobProbeBytes` is 24 and the marker it looks for closes at byte 29.
   That loses 50 of 221 message blobs, and every answer in 10 of 40 stores. Changing it to 32 fixes
   every case.
4. **codex has no turn boundary for cli 0.87 and earlier**, which writes no `task_started`. One real
   file with 341 asks returns 1 turn.
5. **The modification time guard never runs.** `read.js` calls `fs.statSync` without
   `{ bigint: true }`, so both sides of the comparison are the string `"undefined"`. Only size
   equality is actually checked.
6. **A rewrite below the first 4,096 bytes resumes into a stale offset and reports success.** There is
   also no check that the byte before the resume offset is a newline.

Three further gaps are not defects in the code. gemini's answer rule is proved only against its own
fixture, because no real gemini file on this machine holds an answer. The claude drop list still misses
three false ask shapes, being 3.8% of accepted asks. And the raw byte skip is a LOSS for gemini,
deepseek and copilotide, so the map needs a flag saying whether to run it and does not have one.
