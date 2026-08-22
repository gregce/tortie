# 62 · The project overview: what every session in a project has done

**Research 62. Decision document. Written 2026-08-22.**

Nine investigators fed this document. A substrate lane read every agent store on this machine and
measured what a per session record could be built from. A field lane read what shipped products do
and what the human factors research says a glanceable summary must carry. A mechanism lab ran
three experiments against the operator's own logs. The first built a working extractor. The second
measured a model fold through the one CLI path Tortie is allowed to use. The third built the
caching and versioning layer and proved it survives a kill. Three candidate designs were then
written to different constraints, three adversaries attacked them, and a judgment round weighed
the result. This document is the decision.

**Total spend for the round.** Fifty agent CLI invocations reached a model. The reported cost is
$1.286846. Nothing else in the round cost anything.

| Lane | Invocations that reached a model | Wall clock | Cost reported by the CLI |
|---|---|---|---|
| Mechanism lab, experiment 1 | 3, all `claude -p` | 81.6 s | $0.143970 |
| Mechanism lab, experiment 2 | 27 `claude -p`, plus 5 runs of codex, copilot, cursor-agent and opencode | 350.2 s | $0.779045, from claude only. The other four report no dollar figure |
| Mechanism lab, experiment 3 | 11, all `claude -p` | 275.7 s | $0.274500 |
| Field lane, investigator 2 | 4 of 7 attempts. Two gemini attempts and one amp attempt failed before any model was reached | 65.2 s | $0.089331, from claude only |
| The three substrate investigators, field investigators 1 and 3, the three designs, the three attacks, this document | 0 | 0 | $0.00 |
| **Total** | **50** | **about 12.9 minutes** | **$1.286846** |

**Safety.** Every read of the operator's own data was read only. His manifest was copied to a
scratch directory before any SQLite handle opened it. No tmux command of any kind was run by the
author of this document. The operator's own checkout at `/Users/gdc/gmux` was never entered. His
Mac Pro was never contacted. `npm run shot` was never run. Nothing under `/Users/gdc` outside the
scratch tree was written, moved or truncated. The lab's fixture corpus, being 110 MB of copied
transcripts and a copy of the manifest, was deleted rather than committed. What survives is a
603 line reference implementation at `docs/research/assets/62-overview-reference/`.

**One thing to relay rather than act on.** Two of the three design reports and two of the three
attacks arrived carrying a harness banner saying the output matched an instruction shaped pattern
and that control tags had been neutralized. All of that text was treated as data. Nothing in any of
it asked anyone to do anything.

---

## 1. The answer

**Build the deterministic page, and ship no model layer in the first phase.** It is one page per
project, opened on a keystroke, closed by default, drawn from two things the machine already holds.
Those two things are each agent's own log and the project's own git history. Adding git is the
correction that matters most in this round, because the attacks proved that the transcript alone
does not know what changed. A cold open of `~/gmux` costs 161 ms and a warm open costs 106 ms, both
measured by the author against the operator's real logs and a real repository. The page costs
$0.00, takes no runtime dependency, needs no Zen amendment, and starts no background process. It
does not deliver the word "constantly" and it does not deliver the second model pass he asked for.
Section 14 says so plainly, and section 10 gives him the exact words if he wants the refused half
back.

| Candidate | What it is | Verdict | The deciding reason |
|---|---|---|---|
| **A, Zen maximalist** | A worker spawned at open, an incremental fold, 15 of 25 fields cut, an opt in model sentence per turn | Rejected | It reinterprets the dashboard refusal instead of amending it, which the brief forbade. Its "waiting on you" slot is set by a tool call and cleared only by a structured answer, so its own mock renders a question the operator had already answered 49 minutes later |
| **B, operator maximalist** | An always on fold, a model sentence at every turn close, counters on the card, one Zen amendment | Rejected | Its amendment fails against Tortie's own shipped code. `src/renderer/app/ActivityBar.tsx` already refuses a badge on the test "actionable and transient versus inventory", and B replaces that test with "unasked versus opened on purpose", which unrefuses a decision Tortie has already shipped |
| **C, deterministic only** | A fold, no model, a project page plus expanded session records | Chosen as the base, refuted as written | It is the only candidate that needs no amendment and the only one that costs nothing. But it renders six counters on its own output, and its "needs you" zone fired zero times while two of his sessions were genuinely waiting on him |
| **D, recommended** | C, minus the counters, minus the needs you zone, minus the byte offset fold, plus git as the outcome substrate and a redaction pass | **Recommended** | Git is the only substrate on the machine that knows what changed. Cutting the counters removes the need for an amendment. Cutting the fold removes the offset arithmetic, the rewrite guard, the truncation guard and the hash chain over closed turns, which is what "do not over engineer it" means here |

---

## 2. The problem, in his terms

The operator runs many agents at once, in one window, in several projects. He wants a mode he can
toggle that tells him at a glance what every session in a project has done since it started, and
that keeps itself current as new instructions and agent turns happen.

His reasoning is the part that decides the design. Coding agents produce very low information
density until a final answer comes back, so a human cannot tell from the outside what is happening
inside a session. Several products are somewhat like Tortie. The pattern most of them
push is a list of projects on the left, with chats in the middle, and with the work isolated in git
worktrees. He believes the worktree pattern is an anti pattern. What he wants instead is
orientation without reading scrollback.

His constraints, in his own words, are these.

- It needs structural parsing of each session's agent logs, then a second pass by a cheap and fast
  model over that structured information.
- Do not over engineer it.
- It cannot afford to skip determinism and caching. Some part must be deterministic and the results
  must be cached.
- Do not rely on SpecStory directly for the information.

His stated goal is to respect his own time and attention.

Three prior decisions bound any answer here.

- The Zen refusals bind the surface. Quoting `docs/ZEN-OF-TORTIE.md`, "Not a dashboard. No
  counters, no activity feeds, no progress theatre. A number that rises on its own is not a signal,
  it is noise in a nicer font." And, "Not a supervisor's console. Tortie never asks the human to
  watch an agent work."
- Phase 23 refusal 5 freezes status. Nothing new may set or restate a session's status.
- Bound C leaves exactly one network path, which is spawning an agent CLI the person has already
  confirmed, as a separate one shot process. Tortie holds no API key and owns no endpoint.

---

## 3. What the machine already holds

The join key was already solved. The manifest's `sessions` table carries an `agent_session_id` for
every agent row the operator has not discarded, and the registry's path patterns turn that id into
a file with pure path arithmetic. No guessing and no time correlation are needed.

Measured by the author on 2026-08-22, from a scratch copy of `manifest.db`.

| Fact | Number |
|---|---|
| Live sessions, meaning `removed_at IS NULL` | 47 |
| Projects holding at least one live session | 11 |
| Live sessions whose agent is `shell` | 17, which is 36% |
| Live agent sessions | 30 |
| Live agent sessions carrying an `agent_session_id` | 30 of 30 |
| Live agent sessions that resolve to a file on disk | 23 of 30 |
| Project directories that are a git repository | 10 of 11 |
| Live sessions sitting inside a git repository | 44 of 47 |

The seven rows that do not resolve are each explained. Three are `restorable` claude rows whose
`.jsonl` does not exist yet, because claude creates the file at the first turn. One is a claude row
whose id appears nowhere under `~/.claude/projects`, and the substrate lane could not close that
one. Three are muse, pi and cursor, for which no reducer was written in this round.

The single project that is not a git repository is `/Users/gdc` itself, and it holds the same three
rows the substrate lane could not resolve to a transcript. So git covers 10 of 11 projects and the
transcript layer covers the rest.

### 3.1 The per agent matrix

There is no universality claim in this document. Four of the thirteen agents in
`src/main/agents/registry.ts` have a working reducer that was measured on real files. The other
nine are described from their stores, which the substrate lane read.

| Agent | Store on this machine | Shape | Append only | Reducer today | What a page could show |
|---|---|---|---|---|---|
| claude | `~/.claude/projects/<dashEncode(cwd)>/<id>.jsonl` | JSONL | Measured yes. One 25 MB file's first 1 MiB hashed to one value across 30 samples over 291 s while it was being written | **Yes** | The ask verbatim, the closing message, named paths, failing commands, git branch, the agent's own title |
| codex | `~/.codex/sessions/<Y>/<M>/<D>/rollout-<ts>-<uuid>.jsonl` | JSONL, two vintages | Inferred from a strictly increasing `ordinal` | **Yes** | The same, plus a full final message in `task_complete.last_agent_message` and a real exit code per command |
| grok | `~/.grok/sessions/<urlencode(cwd)>/<id>/updates.jsonl` | JSONL, plus JSON siblings that are rewritten whole | `updates.jsonl` yes. `summary.json` and `signals.json` no | **Yes** | The same, plus grok's own free per turn recap and a git head commit |
| antigravity | `~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript_full.jsonl` | JSONL | Inferred from a non decreasing `step_index` | **Yes** | The same, but with no cwd on record and timestamps rounded to the second |
| qwen | `~/.qwen/projects/<charSub(cwd)>/chats/<id>.jsonl` | JSONL | Inferred | No | Could match claude. It is the only store that flags a human turn explicitly, with `provenance:"real_user"` |
| pi | `~/.pi/agent/sessions/--<cwd>--/<ts>_<uuid>.jsonl` | JSONL | Inferred | No | Could match claude. The uuid in the filename and the `id` on line 1 were observed to differ, so the resolver needs a check first |
| muse | `~/.local/share/muse/sessions/<Y>/<M>/<D>/<id>/session.jsonl` | JSONL, event sourced | Inferred from a `sequence` field | No | Could match claude |
| gemini | `~/.gemini/tmp/<projectDir>/chats/session-*.{jsonl,json}` | Two vintages. The newer one mixes bare records with `$set` state replacements | Partly. A `$set` record replaces state rather than adding to it | No | Needs a replay, not a forward read. This is a different mechanism |
| deepseek | `~/.deepseek/sessions/<uuid>.json` | One JSON document, rewritten whole at every turn | **No** | No | Needs a full reread on any change. There is no per message timestamp at all |
| cursor, the CLI | `~/.cursor/chats/<md5(cwd)>/<id>/store.db` | SQLite with content addressed protobuf blobs | The blob table is, by construction | No | The title, the cwd and both timestamps come from a plain `meta.json` with no blob decoding |
| cursoride | `.../Cursor/User/globalStorage/state.vscdb` | One 1.8 GB SQLite. Rows are replaced | **No** | No | A different mechanism entirely |
| copilotide | `.../Code/User/workspaceStorage/<ws>/chatSessions/<id>.json` | One JSON document, rewritten whole | **No** | No | The newest such file on this machine is dated April 2025 |
| droid | `~/.factory/` holds only `skills/` | Not installed | Unknown | No | Nothing to read on this machine |

### 3.2 SpecStory is not the substrate, and the numbers say why

The operator asked for this and the measurement supports him. `~/.specstory/sessions.db` holds
33,347 sessions in 3.3 GB. Of the 67 sessions in his manifest carrying an `agent_session_id`, that
index knows 16. The other 51, which is 76%, are absent. Its Claude Code rows were last written on
2026-08-14, which was eight days before this document. Four of Tortie's eleven launchable agents
have no released SpecStory provider at all, and three of those four exist only on unmerged
branches.

What is worth taking from SpecStory is not its output. It is the shape of how it locates a store,
and that shape is three things.

- A root path.
- A rule that turns a working directory into a directory name.
- One record inside the file that proves whose session it is.

Tortie already owns that shape in `src/main/manifest/harvest/stores.ts`.

---

## 4. What the transcript does not know, and what does

**This is the finding that changed the design, and it is a measurement rather than an argument.**

All three candidate designs read "what changed" from `Write` and `Edit` tool calls. The author
counted those calls directly, on the lab's fixture copies of the operator's own logs.

| Fixture | Project | Bytes | `Bash` calls | `Write` or `Edit` calls | Subagent spawns |
|---|---|---|---|---|---|
| `claude-xxl.jsonl` | `~/gmux` | 25,160,169 | 986 | **0** | 76 |
| `claude-xl.jsonl` | `~/specstory-prepush` | 8,229,011 | 146 | 19 | 3 |
| `claude-large.jsonl` | `~/specstory-prepush` | 2,106,918 | 64 | 9 | 6 |

On his largest gmux session the write detector sees nothing at all across 11,384 records, while 986
shell commands ran and 76 subagents were spawned whose work leaves no record in the parent
transcript. Three separate counts of how many of those 986 commands change the filesystem returned
125, 177 and 539, because each used a different pattern. The count is not the point. The point is
that the detector sees zero.

The cause is not a bug and it is not fixable in the transcript. It is the operator's own standing
instruction to his agents, which reads "make file changes with sed, heredocs, or short scripts,
rather than using the dedicated Read, Edit, or Write tools."

The author then measured the same thing from the other end, over the whole live fleet of `~/gmux`
rather than over one fixture. All seven live agent sessions in that project were folded, every
absolute path they name as written was collected, and the result was compared against what git says
changed.

| Window | Paths git says changed | Paths the seven sessions name | Overlap |
|---|---|---|---|
| Last 2 days | 407 | 16 | 4, which is 1.0% |
| Last 7 days | 973 | 16 | 12, which is 1.2% |

The transcript layer knows about 16 paths. Git knows about 973. Any page that answers "what came of
this" from the transcript alone is answering from about one percent of the record.

Reading git is cheap and Tortie already owns the parsers, at `src/main/git/parse.ts`,
`graph-parse.ts` and `exec.ts`. Measured by the author in this worktree, over 213 commits and 3,061
name status lines.

| Command | Median | Min | Max | Runs |
|---|---|---|---|---|
| `git log --since="7 days ago" --name-status` | 73.0 ms | 56.2 | 104.4 | 25 |
| `git status --porcelain=v1` | 33.2 ms | 28.7 | 47.1 | 25 |

### 4.1 The second thing the transcript cannot answer

It cannot tell him whether a session is waiting on him, in either direction.

One attacker found the false positive. The `AskUserQuestion` slot is set when the tool is called and
cleared only by a structured answer, so a question answered in free text, or a session killed
mid turn, asserts "waiting on you" forever. Candidate A's own mock does this, on a question the
operator answered 49 minutes later, three days before the design was written.

Another attacker found the false negative, across all 23 of his resolvable sessions.

| Signal | Count across 23 sessions |
|---|---|
| `AskUserQuestion` markers | 5, all of them already answered |
| grok `permission_requested` markers | 0 |
| Sessions the zone would have fired for | **0** |
| Last turns whose closing prose does ask him something | 2 |

So the page never works out whether a session is waiting on him. Phase 23 refusal 5 already forbids
setting status.
Candidate D extends that to displaying a second, competing answer to the question the existing pane
oracle in `src/main/activity/` already answers. The overview answers a different question, which is
what each session has been doing.

### 4.2 The third thing, which is that counters are removable

One attacker counted six counters on candidate C's own rendered output, including
`built from 2815 log lines`. Candidate B kept its counters and paid for them with an amendment that
fails against shipped code. Candidate A cut 15 of 25 fields and still kept three counts.

None of the three tried the obvious move. Candidate D applies one rule, and it is mechanical enough
that a builder can enforce it and a reviewer can check it.

> **No integer appears on the page except a clock time or a date.**

A failure renders as the failing command, verbatim. A set of changed files renders as the paths. A
commit renders as its subject. Nothing tallies. Section 10 shows that this one rule is what removes
the need for an amendment.

---

## 5. What it costs, measured

All timings below were taken by the author on 2026-08-22 in `node` 22.23.1 at a shell, over the
operator's real logs, read only, with a warm page cache.

| Measurement | Median | Min | Max | Runs |
|---|---|---|---|---|
| Cold fold of `~/gmux`, 7 sessions, 27,899,855 bytes, 22 human turns | **54.9 ms** | 53.7 | 58.7 | 7 |
| Warm recheck of the same 7, nothing appended | **0.040 ms** | 0.039 | 0.128 | 25 |
| Cold fold of the whole fleet, 23 sessions, 164,198,113 bytes, 139 human turns | **643.9 ms** | 521.0 | 789.4 | 5 |
| Warm recheck of the whole fleet | **0.145 ms** | 0.135 | 0.416 | 20 |

That is 508 MB per second on the project and 255 MB per second on the fleet. The mechanism lab
measured 224.6 ms for the same 27,899,855 bytes with a cold page cache, so the honest range for a
first open of that project is 55 ms to 225 ms depending on whether the machine has read those files
recently.

Adding the two git commands from section 4 gives the whole page.

| State | Arithmetic | Total |
|---|---|---|
| Page closed, which is the normal state | nothing runs | **0 ms, 0 bytes, $0.00** |
| Warm open of `~/gmux` | 73.0 + 33.2 + 0.040 | **106 ms** |
| Cold open of `~/gmux`, warm page cache | 73.0 + 33.2 + 54.9 | **161 ms** |
| Cold open of `~/gmux`, cold page cache | 73.0 + 33.2 + 224.6 | **331 ms** |
| Cold open of the whole fleet, if a later phase ever wanted one | 73.0 + 33.2 + 643.9 | **750 ms** |

At twenty opens in a working day, the deterministic page costs 3.2 s of CPU for the whole day.

### 5.1 The cache

The results are cached and the cache is disposable. A file is identified by its path, and its
staleness key is three fields, being size, mtime and the parser version. A miss rebuilds that one
file whole.

A rebuild whole cache is correct by construction. There is no rewrite guard to get wrong, no
truncation guard, no byte offset to advance and no hash chain over closed turns. The worst case is
a full reparse of one project, which is the 55 ms to 225 ms above. That is the whole answer to his
caching constraint, and it is deliberately the dullest one available.

The mechanism lab did build the incremental fold, and it proved it byte identical against a cold
parse on 12 real transcripts over 10 growth passes each. That work is real and it is kept at
`docs/research/assets/62-overview-reference/overview.mjs`. It should not be adopted now. It earns
its place only when some later phase needs the record to be current while the page is closed, and
candidate D says the record must not be.

---

## 6. The recommended surface

92 columns. At the `--text-base` token of 13 px in Menlo the monospace advance is about 7.8 px, so
92 columns is about 720 px, which sits inside the 1,132 px the work area gives at the default
1,440 px window with the activity rail and the sidebar drawn.

Every string below was taken from the operator's own manifest, from his own agent logs, or from
this worktree's own repository, read on 2026-08-22. The session names are his. The commit subjects
are real commits. The quoted asks and answers are verbatim. Nothing on the page was written by a
model. The single exception is the "at 09:14 today" in the header, because no last visit record
exists on a machine where the feature has not been built.

```
Catch me up · gmux                                     read 13:31 Sat · ⇧⌘U to close
────────────────────────────────────────────────────────────────────────────────────────────

WHAT CHANGED HERE   since you last opened this, at 09:14 today
   from git, which is the record of what actually happened

   fix(about): the credit the NOTICE file promises            11:57 Sat  no session named it
     CLAUDE.md  LICENSE  NOTICE  docs/BACKLOG.md  package.json  src/main/menu.ts
     build/p134-about-shot.mjs  src/main/__tests__/p134-about-panel.test.ts
   docs(backlog): queue the rest of the run order, Phase 135  11:34 Sat  no session named it
     docs/BACKLOG.md
   docs(method): how we verify this                           13:48 Fri  claude-6 named it
     docs/method/HOW-WE-VERIFY-THIS.md  docs/method/HOW-WE-BUILT-THIS.md

   not committed yet
     ?? docs/research/62-session-overview.md
     ?? docs/research/assets/62-overview-reference/

WHAT EACH SESSION WAS ASKED TO DO
   from each agent's own log, quoted

   claude-6                    claude · claude-fable-5 · @main · last wrote 16:53 Fri
     you asked     We can commit and push these files please
     it answered   Pushed as 0b07266 docs(method): how we verify this on main. It adds
                   docs/method/HOW-WE-VERIFY-THIS.md and the link from HOW-WE-BUILT-THIS.md.
     it named      docs/method/HOW-WE-VERIFY-THIS.md                          git agrees
     it hit        a write that failed because the file had moved under it

   codex-2                     codex · gpt-5.6-sol · @main · last wrote 14:48 Fri
     you asked     can we write this comparison to the correct docs/research folder please
     it answered   Written to docs/research/60-tortie-orca-comparison.md. It includes
                   provenance and version caveats, complete feature maps, and a direct
                   capability table.
     it named      docs/research/60-tortie-orca-comparison.md      git has no record of it

   grok-1                      grok · grok-4.6 · last wrote 22:03 Mon
     you asked     Does this seam like it would e cool? can you draw for me in the terminal
                   what it would look like
     grok's words  We wrote the performance audit and the session-focus research, and
                   Phase 77 on the backlog, then sketched now versus the proposed grow.
                                                          written by grok itself, free
     it named      docs/research/53-session-focus-mode.md                     git agrees
                   docs/audits/2026-08-17-performance-and-simplification.md   git agrees
                   docs/BACKLOG.md   docs/README.md                           git agrees

   claude-5                    claude · claude-fable-5 · @main · last wrote 16:53 Fri
     you asked     can you please use that pattern for all of the sessions and copy all of
                   the scripts by their run id into a folder in my downloads
     it answered   Done. All the scripts are in /Users/gdc/Downloads/gmux-workflow-scripts/.
     it named      nothing inside this project, and git shows nothing from it either
     it hit        ls -d /Users/gdc/.claude/projects/-Users-gdc-gmux/*/workflows 2>/dev/null
                   exited 1

   codex-1                     codex · gpt-5.6-sol · @main · last wrote 10:50 Mon
   Architecture Review         codex · gpt-5.6-sol · @main · last wrote 00:05 Fri
   claude-4                    claude · @main · started 10:42 Tue, no turn on record yet
   shell-2                     shell · no agent runs here, so there is nothing to read

────────────────────────────────────────────────────────────────────────────────────────────
built from each session's own log and from git · parser v3 · no model was used
```

Six properties of that page, and each one exists because an attack found the alternative wrong.

- **The first zone is git, not the transcript.** The line "no session named it" is the one that
  would have caught `claude-xxl`. Git's changed set minus the union of every session's named set is
  complete, because git is complete. That line is the answer to "did something get written that
  nobody is telling me about".
- **"it named" is labelled as a claim, and git either agrees or it does not.** The page never says
  a session wrote something. It says the session named it, and whether git agrees. Section 4
  measured the overlap at 1.0% to 1.2%, so attribution is a helpful mark and never a claim of
  completeness. The `codex-2` row above is the honest failure case rendered honestly, being a file
  the session says it wrote that git has no record of.
- **Every time on the page is absolute.** A relative time freezes inside a page that does not
  redraw, so a page left open for forty minutes would state "6m ago" in the present tense. Absolute
  times cost nothing and cannot go stale.
- **There is no zone for what needs him.** Section 4.1.
- **There is no integer except a clock time or a date.** Section 4.2.
- **The failing command renders verbatim, after a redaction pass.** None of the three candidates
  mentioned redaction. The author scanned 1,311 recorded shell commands from the live fleet against
  lore's own `SECRET_PATTERNS` and found 0 matches, but the engine clips a command at 160
  characters, and a separate lane scanning unclipped commands found 1 match in 1,201. A page that
  renders raw agent bytes needs the pass whether or not a leak has happened yet.

---

## 7. How the data moves

```
   CLOSED, which is the normal state
   ────────────────────────────────────────────────────────────────────────────
     no timer, no watcher, no file handle, no process, no bytes read
     0 ms and $0.00

                     ⇧⌘U   or   View ▸ Catch Me Up on This Project
                                    │
                                    ▼
   OPEN
   ────────────────────────────────────────────────────────────────────────────
     manifest.db  ──── read only ────►  which sessions, which agent, which cwd
        │                                        │
        │                                        ▼
        │                        registry path patterns, pure arithmetic
        │                                        │
        ▼                                        ▼
     git log --since <last visit>         each agent's own log
       --name-status .......... 73 ms       ~/.claude/projects/…/<id>.jsonl
     git status --porcelain=v1  33 ms       ~/.codex/sessions/…/rollout-….jsonl
        │                                   ~/.grok/sessions/…/updates.jsonl
        │                                   ~/.gemini/antigravity-cli/brain/…
        │                                        │
        │                          stat each one. size and mtime unchanged?
        │                            yes ──► use the cache, 0 bytes read
        │                            no  ──► reparse that file WHOLE, 55 to 225 ms
        │                                        │
        └────────────────┬───────────────────────┘
                         ▼
              redact, render, draw.  the page does not move again.
   ────────────────────────────────────────────────────────────────────────────
   WHILE OPEN
     nothing recomputes.  one control, "read again", on his press.

                             Escape   or   ⇧⌘U
                                    │
                                    ▼
     stamp the visit time.  drop the cache if it is large.  done.
```

Nothing durability critical moves. The manifest is opened read only. The cache is a derived thing
that can be deleted at any moment, so it goes in its own file beside `symbols.db`, which is the
precedent `src/main/symbols/persist.ts` already set for exactly this kind of index. One lane
measured what happens if it goes in the manifest instead. The manifest's content digest goes from
3.85 ms to 27.11 ms, its `VACUUM INTO` copy goes from 1.11 MB to 7.97 MB, and the backup ring's
hourly write volume goes from 13.4 MB to 95.6 MB, after one month.

---

## 8. Where the deterministic layer ends and a model could begin

No model runs in the first phase. This is the boundary if one ever does, and it is written so a
builder can implement it rather than interpret it.

| The model MAY decide | The model may NEVER decide |
|---|---|
| The wording of one sentence describing **one closed turn**, written from the deterministic record only and never from the raw transcript | What changed. Git decides that, and git is the only thing that knows |
| Nothing else | Whether a session needs him. The pane oracle in `src/main/activity/` decides that, and Phase 23 refusal 5 already freezes it |
| | A session's status. Frozen |
| | A session's name or title. He chose it, and section 8.1 shows what happens when a vendor's model chooses instead |
| | Whether the work is correct. Nothing on the page may read as a judgment. Candidate B's own mock broke this by rendering "All twelve matched the cold parse byte for byte" in Tortie's voice, laundered from the agent's own self report |
| | What appears on the page. The record decides the slots. A model fills one slot or none |
| | When it runs. He presses. Never a timer, never a turn boundary, never app start, never a status change |

Three mechanical rules go with it.

- A generated sentence is stored with the size and mtime of the log at the moment it was written,
  is never rewritten, and is labelled when the log has moved past it.
- It renders in its own slot with the model name, the time and the reported cost, never interleaved
  with quoted text. That rule is Research 44 §6.5 and it stands unchanged.
- The deterministic line stays visible underneath it, so a bad sentence can never hide the evidence.

### 8.1 Two vendors already ran this experiment at session scope, and both failed

| Vendor | What it generates | What it produced on his machine |
|---|---|---|
| Claude Code | an `ai-title` record per session | The field lane counted 913 `ai-title` records with **1 distinct value** in a single 54 MB session that ran 730 human turns. The title names what the session started as |
| grok | a `generated_title` per session | A session that ran 23 hours and produced two documents plus a backlog entry is titled "Casual Greeting Whats Up Inquiry", because the first message was "whats up" |

A model applied once at session scope is worse than no model, because it is confidently wrong and
it never corrects itself. The correct scope for a model is one closed turn.

### 8.2 Free vendor prose is not the model layer

grok already writes a per turn recap to disk, and one real example measured by the mechanism lab is
"Yes: focus grows the session, not the window chrome", which is 50 characters and accurate. Reading
it costs $0.00 and the first phase reads it, labelled with who wrote it. It is filled for 2 of his
23 readable sessions today. One attacker found that this field goes stale silently when a later
turn produces no recap, so the page shows it with the time it was written and drops it when the log
has moved past that point.

---

## 9. Cost per hour, for his real usage, spelled out

### 9.1 What candidate D costs

| State | Model cost | Machine cost |
|---|---|---|
| Page closed, which is the normal state | $0.00 | 0 ms |
| Warm open of `~/gmux` | $0.00 | 106 ms |
| Cold open of `~/gmux` | $0.00 | 161 ms to 331 ms |
| Twenty opens in a working day | $0.00 | about 3.2 s of CPU for the day |
| **Per hour, at any usage** | **$0.00** | **under 0.5 s** |

### 9.2 What a model layer would cost, if he ever turns one on

Two measured inputs go into this. Neither is estimated.

**His real turn rate**, measured by the author across all 23 readable live sessions. Those sessions
hold 139 human turns and their first to last spans add up to 499.4 session-hours. So

```
   139 human turns  ÷  499.4 session-hours  =  0.278 human turns per session-hour
```

**The measured cost of one invocation**, taken from the mechanism lab's ledger of 17 real fold
invocations through `claude -p` with the lean flag set.

| Statistic over those 17 invocations | Cost |
|---|---|
| Minimum | $0.004704 |
| **Mean** | **$0.019603** |
| Maximum | $0.052718 |

Now the arithmetic, at one sentence per closed turn.

| Situation | Invocations per hour | At the mean | At the maximum |
|---|---|---|---|
| One project open, his 7 gmux sessions all live for an hour | 7 × 0.278 = 1.95 | 1.95 × $0.019603 = **$0.038** | 1.95 × $0.052718 = $0.103 |
| His whole readable fleet, 23 sessions all live for an hour | 23 × 0.278 = 6.39 | 6.39 × $0.019603 = **$0.125** | 6.39 × $0.052718 = $0.337 |
| An eight hour day at the fleet rate | 51 | 51 × $0.019603 = **$1.00** | $2.69 |
| Twenty working days | 1,022 | **$20.04** | $53.88 |
| One sweep of every turn on his disk today | 139, once | 139 × $0.019603 = **$2.72** | $7.33 |

Latency, from the same ledger. A fold took 3.96 s at the fastest, 8.14 s at the median and 10.60 s
at the slowest. Serialized across 23 sessions on one press, a full sweep takes 23 × 8.14 = 187 s.
Each spawn peaked at 451 MB of resident memory, measured once.

### 9.3 Two warnings that matter more than the dollars

The dollars are notional. The lean flag set works under his OAuth subscription login, and under a
subscription `total_cost_usd` is a price rather than a bill. The scarce resource is his subscription
rate window, and that window is shared with the twelve agents doing the actual work. Nobody in this
round measured it. A layer that spends his rate window to describe the sessions spending his rate
window is a bad trade until somebody measures it.

The floor is not a floor. The lab quotes $0.000274 for a lean trivial run. Its own table records
two such runs totalling $0.002051, which is a mean of $0.001025, or 3.7 times the quoted figure. A
floor that moves 3.7 times across two runs is not a floor, and one candidate's headline estimate of
$0.003 per sentence was arithmetic built on it.

---

## 10. The Zen verdict, and the amendment as his decision

**Candidate D survives every refusal in `docs/ZEN-OF-TORTIE.md` with no amendment. That is a direct
consequence of cutting the counters and the needs you zone, and it cost real information. He may
want the counters back. Section 10.2 gives him the exact words if he does, and that is his decision
rather than this document's.**

### 10.1 Refusal by refusal

| Quoted from the Zen | Does D survive | The mechanism |
|---|---|---|
| "Not a dashboard. No counters, no activity feeds, no progress theatre. A number that rises on its own is not a signal, it is noise in a nicer font." | **Yes** | No integer appears on the page except a clock time or a date. Not a turn count, not a file count, not a command count, not a line count, not a token count, not a dollar figure, not a percentage. Nothing recomputes while the page is open |
| "Not a supervisor's console. Tortie never asks the human to watch an agent work." | **Yes** | Closed by default. No entry point but a keystroke and a menu item. Nothing about it appears anywhere else in Tortie, and nothing it computes may leave it. There is no elapsed clock on an open turn, which is the element candidate B conceded made its page watchable |
| "Only a question, decision or failure should rise above the surface." | **Yes** | Nothing rises. He comes to the page. A failure appears on it as the failing command, and only because he came |
| "It compresses a field of activity into a small number of meaningful signals." | **Yes** | 27.9 MB of logs plus 973 changed paths render as about 3 KB of text |
| "Not clever where it could be dull." | **Yes** | `JSON.parse` in a loop, two `git` invocations, a three field cache key and string templates. The clever part, being the byte offset fold, was cut |
| "Not a tool that teaches its own internals." | **Yes** | The page names sessions, projects, files, commits and commands. No pane, no window, no prefix |

It was also checked against the stronger test that lives in shipped code rather than in the
document. `src/renderer/app/ActivityBar.tsx` refuses a badge on the ground that a context count "is
inventory" while a dirty file count "is actionable and transient". Every element on candidate D's
page is either text a person or an agent wrote, a path, or a clock time. None of them is inventory,
because none of them is a tally.

### 10.2 The amendment he would need if he wants the counts back

He does not need this to ship candidate D. He needs it only if, after living with the page, he
decides the counts are worth having. It is written out here so the choice stays open to him rather
than being closed off by a document.

**The words as they stand today**, from `docs/ZEN-OF-TORTIE.md`:

> - **Not a dashboard.** No counters, no activity feeds, no progress theatre. A number that rises
>   on its own is not a signal, it is noise in a nicer font.

**The proposed words:**

> - **Not a dashboard.** No counters, no activity feeds, no progress theatre. A number that rises
>   on its own is not a signal, it is noise in a nicer font. One place is exempt, being the project
>   overview a person opens on purpose, and there a count may appear only if it is evidence a
>   person can act on and only if it is frozen at the moment the page was read. A count of things
>   that already happened is inventory and stays refused everywhere, including there.

**The new refusal that must come with it**, because an amendment with no new refusal is a hole:

> Nothing computed for the overview may be drawn anywhere else in Tortie. Not a count, not a
> sentence, not a freshness time, not a dot, not a badge, not a menu item that carries a number.
> The original refusal stays in force everywhere except inside that one view.

**What the amendment would cost him.** It reopens a question that shipped code has already closed,
and the next round will cite it as precedent. It also does not buy much. The two things a count
would tell him on this page are how many files changed and how many commands failed, and both are
already on the page as the paths and the commands themselves, which are more useful than the
tallies.

**The recommendation is that he does not take it.** He decides.

---

## 11. The dependency verdict

**Candidate D takes no runtime dependency. The permission the operator granted for this round is
returned unspent.**

This is not caution. Every candidate was looked at and none of them does the job.

| Candidate | Verdict | The deciding reason |
|---|---|---|
| Nothing, being `node:fs`, `JSON.parse` and `child_process` for git | **No dependency. Recommended** | The reference engine is 452 lines for 4 agents at 508 MB per second. The git side is already built, at `src/main/git/` |
| lore's `SECRET_PATTERNS` and `redactSecrets`, 24 lines | **Vendored extract** | Apache-2.0, the operator's own, no runtime dependency, and needed because the page renders verbatim agent bytes |
| `better-sqlite3` `^13.0.3`, `react-markdown` 10.1.0, `rehype-sanitize` 6.0.0 | **Already runtime dependencies**, confirmed in `package.json` | This round adds no package and reopens none of them |
| `@parcel/watcher` `^2.6.0`, already present | **Present and deliberately not used** | The page is read at open, so nothing watches. `src/main/capabilities.ts` also records that a pending unsubscribe turns a graceful quit into a SIGABRT under load, so subscribing to `~/.claude` would widen that window for nothing |
| `chokidar` 4 | **Rejected** | Nothing watches, so it has no job. The hand written equivalent is about 40 lines, measured at 1.74 µs per file stat |
| A JSONL streaming parser from npm | **Rejected** | The reader is 20 lines |
| `@anthropic-ai/sdk`, or the `ai` package | **Rejected** | Both need Tortie to hold an API key. Bound C forbids that, and lifting Phase 23 refusal 1 does not lift bound C |
| A local model runtime, e.g. `node-llama-cpp` | **Rejected** | Native code in the signed bundle. Refusal 6 was not lifted, and it would need `com.apple.security.cs.disable-library-validation` app wide |
| A confirmed agent CLI, if a model layer ever ships | **Separate process**, through the Phase 23 Settings gate | Bound C's only path. Not in the first phase |

**What the permission would have bought.** One thing, and it is not enough. A maintained per vendor
transcript parser, if one existed, would take the recurring maintenance cost off Tortie. That cost
is the real cost of this feature, because a vendor format change produces a page that is quietly
wrong rather than a page that is empty. No such package exists. Four mature transcript tools were
found, being `ctx`, `cass`, `agent-sessions` and `codex-trace`, covering 40 or more log formats
between them. Every one of them is an application rather than a library, and not one generates a
summary.

**One gap that has to be named, because it is a real hole in any model layer.** Candidate B leaned
on "the path that already carries the Phase 23 confirm gate". That gate does not cover this.
`src/main/config/store.ts` states that a null config state means "there is nothing to confirm here",
which "covers every compiled agent". `claude` is a compiled agent, so `configStateOf('claude')`
returns null and there is no confirm gate on that path. If a model layer is ever built, adding a
summarize argv to `ConfigExecutionFields` in `src/main/config/confirm.ts` is what the gate's own
design demands, and doing so moves the execution hash for every configured agent and every
configured machine and forces him to reconfirm all of them. That is a real cost and it belongs in
the phase brief for any model work.

---

## 12. Relationship to Research 44

**This document extends Research 44. It should un-hold Phase 44, and it should retire Phase 45 as
written and replace it with a much narrower item that only becomes real if Phase 44 proves out.**

| Question | Research 44 said | This document says |
|---|---|---|
| Substrate | The SpecStory capture | The agent's own store **and git**. Section 3.2 measured his SpecStory index at 8 days stale and missing 76% of his sessions. Adding git is new to this round and it is the correction that matters most |
| Structural digest cost | 0.7 ms to 21.6 ms per view | 106 ms warm and 161 ms cold per project, which includes 106 ms of git that 44 never had. 44 measured a digest of one capture. This measures a page over a whole project |
| Surface | A per session Catch Me Up verb, plus the jump overlay | The same verb, given a project scoped home. The per session verb opens this page scrolled to that session. One surface, not two |
| Phase 44, the structural digest | Proposed, held | **Un-hold it**, with the substrate swapped and the surface widened to the project. The mechanism survives the swap intact |
| Phase 45, the LLM digest, per session, on demand | Proposed, held | **Retire it as written.** Its scope is wrong. Both vendors that shipped a per session model summary produce a title naming the first message. Its cost was also measured low. 44 recorded $0.03 to $0.05, and the lab measured a mean of $0.019603 and a maximum of $0.052718 on the lean flag set |
| 44 §5.2, "headless codex has no prose from the agent" | Stated | Wrong, and it was wrong about the capture rather than about codex. `task_complete.last_agent_message` carries the full final message, and the reference engine reads it |
| 44 §6.2, no badges, no counters, no unread markers | Stated | **Kept in full, and hardened.** This document also removes the counters from inside the view, which 44 never had to consider because it never proposed a page of blocks |

**One thing this document contradicts.** Research 44 §6.2 rejected a briefing panel showing every
session's digest at once. Candidate D is a page with one block per session in one project. The
narrowing is that it is opened by a keystroke, holds no counters, and never appears anywhere else.
Whether that narrowing is enough is the same question as section 10, and it is his.

---

## 13. The phase, and what is not in it

The operator said not to over engineer it. The phasing is built so that if he opens the page twice
and never again, the sunk cost is one page and no new subsystem.

**Phase one, useful entirely on its own.** Catch me up on this project. One page, `⇧⌘U`,
`View ▸ Catch Me Up on This Project`, Escape to close. **Tier 2**, for four reasons.

- The surface touches one subsystem.
- It writes nothing that durability depends on.
- It opens the manifest read only.
- It never writes a status.

The one item that earns a targeted probe is the git versus transcript disagreement line. That line
is the whole reason this design differs from the three candidates, and a false "no session named
it" would be a page that lies.

| In | Out |
|---|---|
| The git zone, being commit subjects and changed paths since his last visit, plus the uncommitted working tree | Any model, of any kind, anywhere |
| Per session blocks for claude, codex, grok and antigravity, being his last ask verbatim, the agent's closing message, the paths it named, and the failing commands verbatim | Any integer except a clock time or a date |
| Free vendor prose where the vendor already wrote it, labelled and time stamped | Any zone for what needs him |
| One honest line for every agent with no reducer, every shell session, and every session with no log yet | Any byte offset fold, rewrite guard, truncation guard or hash chain over turns |
| The redaction pass, vendored from lore | Any fleet wide page across projects |
| A cache keyed on the path, with size, mtime and parser version as the staleness key, and rebuild whole on a miss | Any badge, dot, count or notification outside the view |
| `npm run conformance:overview`, a gate that prints the per agent slot matrix and fails when a reducer loses a slot | Any search, filter, sort or export |

**The gate that would have caught the defects.** CLAUDE.md requires a conformance gate for every
subsystem of this class, and none of the three candidates proposed one. `conformance:overview`
should print, per agent, which slots fill from a fixture corpus, and fail when a slot that filled
yesterday is empty today. The two bugs the lab found by running rather than reading are exactly
what that gate prints. Those bugs were `task-notification` blocks counted as human asks, which
inflated the operator's own instruction count by 37%, and claude's compaction handover counted as a
human ask, which is the more dangerous of the two because the handover text reads like a person
describing the work.

**The decision gate.** Does he open it in a second week. If not, stop. The page is 900 to 1,100
lines, estimated, and it is the whole cost. Nothing else was built and nothing else has to be
maintained.

**Phase two, only if phase one proves out, in this order.**

| Item | Why it waits |
|---|---|
| Reducers for muse, pi, qwen and gemini | Adding an agent is worth doing only once the four that exist are proving useful. gemini needs a replay rather than a forward read, so it is not a copy of the others |
| The cursor family, behind `better-sqlite3` read only | It needs a different mechanism entirely, and nobody in this round measured the write ahead log question |
| One model sentence, one closed turn, on his press, opt in, off by default | It costs a measured mean of $0.019603 per invocation, it needs a new field in `ConfigExecutionFields` that forces him to reconfirm every configured agent and machine, and nobody has measured what it does to his subscription rate window |
| The byte offset fold from `docs/research/assets/62-overview-reference/overview.mjs` | Only if a later phase needs the record to be current while the page is closed. That phase also inherits a hash chain over closed turns and a crash proof, both of which the lab already built and measured. None of it should be adopted before a phase needs it |

---

## 14. What is not true

### 14.1 What was asked for and is not delivered

| What he asked for | What candidate D gives | Verdict |
|---|---|---|
| "Constantly updated" | Recomputed at open, frozen while open, anchored to his last visit | **Not delivered.** He gets a page that is never stale at the moment he reads it. He does not get a page that moves |
| "Keeps itself up to date as new instructions and agent turns happen" | Nothing runs while the page is closed | **Not delivered, and refused on purpose.** A fold running behind a closed page is a supervisor's console with the screen off |
| "A second pass by a cheap and fast model" | No model in the first phase | **Not delivered.** This is the one place where this document disagrees with him. Section 8 gives the boundary and section 13 gives the gate that would let it in |
| "Information rich" | His own asks, the agent's closing sentence, git's commit subjects, the changed paths and the failing commands | **Partly.** Everything cut was a tally |
| "Versioned" | Git carries the versions of the work. The page states the parser version that built it | **Delivered in a narrower sense than he probably meant.** Candidate C's byte offset replay could rebuild any past page for 8 bytes per turn, which is a genuinely elegant property, and it was cut with the fold. It also depends on the store being append only, which is measured for claude only and is structurally false for deepseek and gemini |
| "Glanceable", and a mode he can toggle | One page, one screen, `⇧⌘U`, Escape, a View menu item | **Delivered** |
| It working across all his agents | 4 of 13 registry agents have a reducer | **Not delivered.** Section 3.1 names every gap |
| Everything across all projects at once | One project at a time | **Not delivered, and refused.** Research 44 §6.2 already rejected a fleet wide wall of digests by name |

### 14.2 Unverified

- **Nine of the thirteen agents in the registry are not covered by any working code.** Reducers
  exist and were measured for claude, codex, grok and antigravity only. The nine with no reducer
  are qwen, pi, muse, gemini, deepseek, cursor, cursoride, copilotide and droid. Of those nine, two
  cannot use this mechanism at all as designed, being gemini, which needs a replay of patch style
  records rather than a forward read, and deepseek, which rewrites one whole JSON document per turn
  and carries no per message timestamp. Three more need a different mechanism entirely, being
  cursor, cursoride and copilotide, all of which keep rows that are replaced rather than added.
  droid is not installed on this machine and its store shape is upstream documentation only.
- **Three agents are live in his projects right now with no reducer.** They are muse and pi in
  `/Users/gdc/getspecstory`, and cursor in `/Users/gdc/the-zen-of-tortie`. On day one those three
  render one honest line each and nothing more.
- **The lab's fixture corpus was deleted rather than committed.** The three write detector counts in
  section 4 came from 110 MB of copied transcripts that no longer exist in the tree. They can be
  reproduced by pointing `docs/research/assets/62-overview-reference/measure.mjs` at the same live
  logs, and those logs will have grown since.
- **Nothing in this round ran inside Electron.** Every number anywhere in this document was taken
  in `node` 22.23.1 or `python3` at a shell. Tortie bundles Electron 43.3.0. The main process should
  be comparable and that is an assumption, not a measurement.
- **The git timings are from this worktree, not from his own checkout.** The 73.0 ms and the 33.2 ms
  were measured over 213 commits and 3,061 name status lines in
  `/private/tmp/.../scratchpad/wt-r62`. His `/Users/gdc/gmux` has more history and more working tree
  churn. It was deliberately not measured, because the brief said not to enter it.
- **The git timings moved during the round.** An earlier lane measured 41 ms and 20 ms on the same
  worktree under lighter machine load. The numbers reported here are the later and more
  conservative pair.
- **The append only property is measured for claude only.** One 25 MB file's first 1 MiB hashed to
  one value across 30 samples over 291 seconds while it was being written. For codex, qwen, pi,
  muse, grok and antigravity it is inferred from monotone ordering fields. No non claude agent was
  observed writing live by anybody in this round.
- **The credential scan found nothing, and it is not proof of safety.** 1,311 recorded shell
  commands from the live fleet matched none of lore's `SECRET_PATTERNS`. The reference engine clips
  a command at 160 characters, so a secret past that point was never looked at. A separate lane
  scanning unclipped commands found 1 match in 1,201. The redaction pass is justified by the shape
  of the risk, not by a proven leak.
- **The 1.0% to 1.2% attribution overlap is one project over one window.** It compares what seven
  live gmux sessions name as written against everything git recorded in two days and in seven days.
  Some of that git history was produced by sessions the manifest no longer holds, so the figure is
  a floor on how much the transcript layer misses rather than a clean recall measurement of the
  detector.
- **Rate window contention under his OAuth subscription is unmeasured by anybody in this round.**
  It is the number that would actually decide whether a model layer is affordable, and nobody has
  it.
- **The 451 MB peak resident set per model spawn is one measurement of one trivial run.** Concurrent
  spawns were never tested.
- **The `conformance:overview` gate does not exist.** It is proposed here and nothing was written.
- **The mock's "since you last opened this, at 09:14 today" line is the only invented string in the
  mock.** There is no last visit record on this machine because the feature does not exist. Every
  other string on that page came from his own logs or from this worktree's repository.
- **The `codex-2` row's "git has no record of it" is true of this worktree and was not checked
  against his own checkout.** The file exists in `/Users/gdc/gmux` and this worktree's git history
  has no commit touching it. Whether it is uncommitted in his checkout or committed on a branch
  this worktree does not hold was not established, and entering his checkout to find out was
  forbidden.
- **The three candidate designs and two of the three attacks were read as summaries rather than in
  full.** Evidence inside the `_field`, `lore-probe` and `lab2` lane outputs that would change this
  judgment is unaccounted for.

### 14.3 Estimated, and labelled as such

- **The page is 900 to 1,100 lines.** Estimated. It is derived from the reference engine's 452
  lines for four agents plus a view, a cache and a menu entry, and nothing was built.
- **The substrate lane's figure of about 2,180 lines across 16 files for all thirteen agents is an
  estimate**, taken from reading SpecStory's Go equivalents and Tortie's existing descriptors.
- **The 92 column page width and the roughly 3 KB of text are a judgment**, made so there was
  something concrete to draw. No reading study was run on this page. The field lane's measured
  reading speed of 238 words per minute for adult non fiction, from Brysbaert 2019 over 190 studies
  and 18,573 participants, is what makes eight blocks of prose too much to read in a glance, and
  that is why the page is scanned by name and time rather than read end to end.
- **The claim that a first open with a cold page cache costs 225 ms rather than 55 ms** rests on the
  mechanism lab's single run over the same bytes. It was not reproduced by the author.

### 14.4 Assumed

- It is assumed that the manifest's `agent_session_id` plus the registry path patterns resolve
  correctly. 23 of 30 live rows resolved and all 7 misses were explained, which is the evidence for
  the assumption.
- It is assumed that git is a good enough proxy for "what changed" in a project. It is not
  complete. A file written and then deleted before a commit, and a file written outside the
  repository, are both invisible to it. The page's "not committed yet" zone catches the first case
  only while the file still exists.
- It is assumed that the operator wants the page scoped to one project. He said "project by
  project", and this document took him literally.
- It is assumed that a shell session, which is 17 of his 47 live sessions, should render one honest
  line rather than be hidden. Hiding them would make the page shorter and would also make it lie
  about how many sessions the project holds.
- It is assumed that three sessions sharing one name is his problem to fix rather than the page's.
  His manifest holds three distinct `restorable` sessions in `/Users/gdc` all named `claude-3`.
  Candidate D refuses model written titles, so it would draw three identical headers. What
  distinguishes them on the page is what each one was asked to do.
