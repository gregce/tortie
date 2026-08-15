# 44 · Session digests: helping the human supervise many agents

**Research 44. Decision document. Written 2026-08-14.**

Three lanes fed this document, and a judgment round weighed the options after all three
reported.

- A substrate lane inventoried every transcript record on this machine that a digest could be
  built from, read only.
- A field lane read what shipped products do about summarizing agent activity, and what the
  supervision research says a digest must do.
- A mechanism lab built a working parser, measured it on real captures, and ran 3 one shot LLM
  digests through the operator's own claude CLI.

**Safety and spend.** Every read was read only. The manifest was only opened via a scratchpad
copy. No tmux command beyond read only list-sessions ran. The lab spent exactly 3 headless
agent invocations, $0.1205 total by the CLI's own report, itemized in section 5. Nothing outside
this file was written to the repo.

---

## 1. The answer

**Ship two phases.** Phase A ships a structural digest. It is computed on demand from the
SpecStory capture, in 0.7 to 21.6 ms measured, at zero cost, and it is shown in exactly two
places. The first place is a per session Catch Me Up verb whose answer opens in a place you go.
The second place is the existing jump overlay for needs input, which gains the same digest at
the moment the human returns. Phase B ships an LLM digest as an opt in behind the same Catch Me
Up verb. It is produced by one shot of an agent CLI the user personally confirmed through the
Phase 23 gate, at a measured 15 to 19 s and $0.03 to $0.05 per ask.

Nothing computes continuously. Nothing badges. Nothing sets status. Nothing leaves the machine
unless the user both turned the LLM path on and asked about a specific session.

Phase A blocks nothing on Phase B. If Phase B is never built, Phase A still removes the
scrollback tax for interactive sessions and states its limits for headless ones.

---

## 2. The problem, from the operator

The operator runs many agents all day. Tortie made running them in one window effortless and
durable, and the status system answers who needs attention. What it does not answer is what an
agent has done. Getting that answer today means reading the scrollback of turns and tool calls,
session by session, and that is a taxing undertaking. The ask is a concise, opt in summary
parsed from the sessions' conversation logs, so the operator can multitask with less strain
while keeping velocity and understanding high.

The Zen constraints bound any design here. Only a question, decision or failure rises above the
surface. A summary is a place you go, or an answer to an explicit ask. It never shouts, never
badges, never counts. Status semantics are frozen, and needs input comes only from session
behavior.

The privacy and execution boundaries also bound it. Phase 25 telemetry is deferred and its
refusals stand, so Tortie never sends conversation content to any endpoint it owns. Phase 23
allows no third party code in Tortie processes, and configuration may only select from the
compiled world or name an executable the user personally confirmed. That leaves exactly one
network path for LLM summarization, which is spawning an agent CLI the user already has,
confirmed and authenticated, as a separate one shot process, opt in.

---

## 3. What Tortie already has to build on

Three substrate layers exist today. The join key across all of them is the manifest's
`agent_session_id`. It equals the uuid on line 5 of the SpecStory capture, and it resolves the
agent's own store path through the registry patterns in `src/main/agents/registry.ts`. This was
verified live twice, e.g., the manifest row "zen of tortie" (claude, /Users/gdc/gmux) resolves
to `~/.claude/projects/-Users-gdc-gmux/aa5fc3cd-a011-4ce1-ae96-5339b490f27f.jsonl`, present at
1.9 MB.

### 3.1 SpecStory captures, the primary substrate

5,993 capture files exist machine wide, all in one format (Markdown v2.1.0). Every capture
starts with a generator comment, carries the provider and session uuid on line 5, marks turns
with `_**User (ts)**_` and `_**Agent (model ts)**_` headers, and wraps tool calls in typed
`<tool-use data-tool-type="..." data-tool-name="...">` blocks. Tool calls are therefore
mechanically distinguishable from prose by tag, not by heuristics. About 2,208 older files are a
pre v2 format with no session id line, and a digest cannot resolve those to a session.

The last user ask is deterministically findable. Take the last user block whose body does not
start with a slash command artifact (`<command-name>`, `<local-command-stdout>`,
`<local-command-stderr>`, `<local-command-caveat>`). Claude Code records slash command noise as
extra user turns, and this rule was verified to skip it correctly on a real capture.

Per agent census and quality:

| Agent | Captures on disk | Capture quality |
|---|---|---|
| Claude Code | 2,732 | Clean. Read paths backticked, Edit paths inside the result sentence, Bash blocks carry description plus command. Write blocks carry no file path. |
| Codex CLI | 702 | Two vintages. 2026-05 files have typed exec blocks with command, output and exit code. Current gpt-5.6-sol files mark every call `unknown`/`exec`, input truncated to about 200 chars, no output. Only `apply_patch` keeps its type, so edited paths survive but commands mostly do not. One 762 KB, 24 h capture has 2,132 agent turn markers and 0 user turn markers. |
| Cursor IDE | 48 | Clean but hollow. "Edit file: path" summaries with empty bodies. |
| VS Code Copilot IDE | 20 | Not examined by the parser. |
| Muse Code | 17 | Clean simple turns. |
| Cursor CLI | 16 | Not examined by the parser. |
| Qwen Code | 11 | Cleanest observed. Typed blocks, `Path:` lines, unified diffs, shell results inline. |
| Gemini CLI | 6 | The one file read has no tool-use markup at all, tool calls are plain prose. Rests on 1 example. |
| Grok Build | 2 | Clean simple turns. |
| Antigravity CLI | 2 | Clean simple turns. |
| pi, deepseek, droid | 0 | Absent. Bundled specstory 2.8.0 has no pi provider, and no deepseek or droid capture exists among the 5,993 files. |

The qwen and muse captures on disk came from dev builds of specstory that Tortie does not ship.

### 3.2 The agents' own stores

10 of 12 agents have a structured store on disk (JSON or SQLite). None of the 12 stores raw
terminal text. Raw stores are large, e.g., one codex rollout is 95,001,427 bytes for 4,806
lines, with 61.4 MB in full tool output records. Captures are 40 to 130 times smaller than raw
stores for the same activity, so a digest should read the capture or a bounded tail of the
store, never the whole raw store.

| Agent | Store | Shape |
|---|---|---|
| claude | `~/.claude/projects/<dashEncode(cwd)>/<id>.jsonl` (22,065 files here) | Typed JSONL with per line timestamp, cwd, gitBranch, and typed content blocks. Uniquely, it already contains an `ai-title` record (an AI written session title) and a `last-prompt` record with the verbatim last user ask. No other agent precomputes either. |
| codex | `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` (25,672 files) | JSONL, plus an unadopted state_5.sqlite threads index. |
| qwen | `~/.qwen/projects/<charSub(cwd)>/chats/<id>.jsonl` | JSONL. |
| pi | `~/.pi/agent/sessions/--<cwd>--/<startTs>_<uuid>.jsonl` | JSONL with roles user/assistant/toolResult and typed thinking/text/toolCall blocks. |
| gemini | `~/.gemini/tmp/<projectDir>/chats/session-*.jsonl` | Patch style records that need replay to reconstruct. |
| deepseek | `~/.deepseek/sessions/<uuid>.json` | One document, messages array with roles, written at first turn. |
| muse | `~/.local/share/muse/sessions/.../session.jsonl` | Event sourced, prompt text inside run events. |
| antigravity | `brain/<id>/.system_generated/logs/transcript_full.jsonl` | Typed step records (USER_INPUT and others). |
| cursor CLI | `~/.cursor/chats/<md5(cwd)>/<id>/store.db` | SQLite blobs of protobuf, readable text inside but needs decode. |
| cursor IDE | state.vscdb | Per registry notes, not opened. |
| copilot IDE | workspaceStorage chatSessions | Per registry notes, not opened. |
| droid | `~/.factory/sessions` JSONL | Upstream documentation only, not installed here. |

### 3.3 Live facts, no parsing needed

The manifest row plus the activity monitor already give who, where, status, last output time and
the last non empty screen line without reading any transcript. Claude's tier 0 oracle adds a
busy/shell/idle/waiting status plus a free text `waitingFor` such as "permission prompt".

Two gaps in this layer:

- No status transition history is persisted anywhere. `setStatus` overwrites one column, and
  transitions exist only as in memory 1 Hz broadcasts while the app runs. A digest of "what
  happened" cannot be assembled from status alone today.
- Scrollback snapshots under `<userData>/gmux/snapshots` are point in time terminal text with
  ANSI codes, written only at quit, close, death and %exit. They are not per turn records.

### 3.4 Scale, measured

- A busy codex capture: 762,542 bytes and 2,132 agent turns over 24.0 h, which is 89 turns/h
  average and 310 turns/h in the peak hour.
- One long claude session's raw JSONL: 30,558,872 bytes over about 132 h, with 421 typed user
  messages and a peak of 224 user plus assistant records per hour.
- The same day's claude JSONL grows about 40 to 130 times faster than its capture.

The substrate lane ran 0 agent invocations and spent 0 tokens.

---

## 4. What the field ships, and what the research says

### 4.1 Products

No shipped multiplexer summarizes across sessions today. Cloud products attach a vendor paid
summary to each finished task. Terminal multiplexers show only status plus diff. The single
terminal native precedent for LLM summaries is Claude Code, which generates them through the
user's own authenticated account, either cost bounded in the background or opt in on demand.
That Claude Code shape is exactly the one network path Tortie's refusals leave open.

| Product | What is summarized | Who pays | Source |
|---|---|---|---|
| OpenAI Codex cloud | Per task summary plus diff at task end ("Review the summary and diff") | Vendor/plan, model unstated | learn.chatgpt.com/docs/cloud |
| Cursor cloud agents | No prose digest. PRs with "screenshots, videos, and logs" | User, "charged at API pricing for the selected model" | cursor.com/docs/background-agent |
| Devin | Slack in-thread updates; Session Insights at teardown (issue timeline, feedback, knowledge usage) | Vendor, "at no additional cost" | docs.devin.ai/product-guides/session-insights |
| Factory droids | None found ("Delegate a task, review the diff, and merge") | n/a | docs.factory.ai |
| GitHub Agent HQ | Mission control statuses; Copilot self review before the human sees code | Vendor/plan | github.blog "Welcome home, agents" |
| Warp | None. Statuses plus notifications only | User plan | docs.warp.dev/agents/using-agents |
| Conductor | None found | n/a | conductor.build |
| claude-squad | None. Preview tab and diff tab per instance | n/a | github.com/smtg-ai/claude-squad |
| Claude Code | Compaction summaries, --resume descriptions, /insights report, rewind summaries, subagent result summaries | User's own account. Background resume descriptions "typically under $0.04 per session" | code.claude.com/docs/en/costs |

What user threads show is that review is the felt bottleneck, not launching. From the Conductor
Show HN thread (228 points), one commenter can "just about manage to stay focused enough to
properly review the output of a single Claude agent", and another asked for a dashboard because
paused agents get forgotten at "3 or more running at a time". From the Omnara thread (310
points), users want alerts only at decision moments. No user commentary praising or dismissing
any product's summaries as such was found.

### 4.2 Research findings that bear on this design

1. **Summaries help at the moment of return, not during work.** In Mark, Gudith and Klocke (CHI
   2008), interrupted conditions finished in 20.31 and 20.60 minutes versus 22.77 uninterrupted,
   with no error difference, while stress rose from 6.92 to 9.46 on a 20 point scale after only
   20 minutes of interrupted work. Leroy (2009, doi:10.1016/j.obhdp.2009.04.002) named the
   mechanism attention residue. A digest is a re-entry aid the operator goes to. A pushed mid
   work summary is itself an interruption.
2. **False urgency poisons the whole display.** Lee and See (Human Factors 2004, 6,253
   citations) is the standard account of matching trust to actual reliability. Wickens and Dixon
   (2007, doi:10.1080/14639220500370105) is widely cited for a reliability crossover near 0.70
   below which an imperfect alert harms performance relative to no alert. An LLM's guess at
   "needs attention" cannot meet that bar, so the digest must be descriptive and must never set
   or imply status.
3. **A summary must point at evidence, never stand in for it.** In "Coding with Enemy" (arXiv
   2606.05647), 94% of over 100 developers failed to detect agent sabotage in five hour tasks,
   and 56% accepted malicious code even when a safety monitor warned them. In "(Im)Paired
   Programming" (arXiv 2607.26375, 54 participants), agent users completed faster but lost code
   comprehension. A digest must cite the concrete record so the human can drill in, and it must
   not present itself as a review or a safety layer.
4. **Operators misjudge what agents did.** METR (July 2025) measured experienced developers
   taking 19% longer with AI tools while believing they were 20% faster. Numbers in a digest
   correct this. Prose adjectives do not.
5. **Humans are poor sustained monitors.** This is the founding premise of supervisory control
   (Sheridan, cited from standard knowledge, not fetched this session). Pull based, on demand
   digests fit that reality. Streams and feeds do not, and the Zen refusal "not a supervisor's
   console" already encodes this.

No product examined offers a cross session, on demand digest inside a terminal multiplexer.
Devin's Session Insights is the closest structural precedent, but it is vendor hosted. The field
lane's web search budget was exhausted, so coverage came from direct fetches of known URLs plus
the HN Algolia API, and a competitor with such a feature could have been missed.

---

## 5. What the lab measured

### 5.1 The structural parser

One 130 line node script parses SpecStory Markdown v2.1.0 for Claude Code, Codex CLI and Qwen
Code with one grammar. The header comment gives agent kind, session id and start time. Turn
markers give the spine. Typed tool-use blocks give the tool counts and file paths. Per turn
timestamps give the span.

Parse times, measured:

| Capture | Size | Time |
|---|---|---|
| Qwen | 6 KiB | 0.7 ms |
| Claude | 373 KiB | 6.5 ms |
| Codex, 690 messages | 269 KiB | 21.6 ms |
| Largest on the machine, 2,132 messages | 745 KiB | 10.3 ms |

The structural digest is effectively free and could run at every render.

### 5.2 The structural digests, verbatim

Claude Code session (a 12 file merge conflict resolution):

```
[1] Claude Code (claude-opus-5) · 6 user turns, 162 agent messages · span 1h 7m, quiet 2d
[2] 136 tool calls: Bash 87, Edit 28, Read 18, Write 2, +1 kinds
[3] edited 16 files: .../pkg/cmd/utils.go, .../main.go, .../pkg/cmd/check.go (+13 more)
[4] last ask: "Let's address the remaining."
[5] last said: "All twelve files are resolved, and the merge now builds, tests and lints
    clean end to end. ..."
```

Qwen Code session:

```
[1] Qwen Code (deepseek-v4-pro) · 2 user turns, 15 agent messages · span 3h 41m, quiet 7d
[2] 8 tool calls: run_shell_command 3, read_file 2, edit 1, write_file 1, +1 kinds
[3] edited 2 files: ~/qwen-testbed/src/calc.py, ~/qwen-testbed/CHANGES.md
[4] last ask: "In one word, which Python file did you edit earlier in this session?"
[5] last said: "calc.py"
```

The audit against the full qwen capture found this digest fully faithful.

Headless Codex session, the honest failure mode:

```
[1] Codex CLI (gpt-5.6-sol) · 0 user turns, 83 agent messages · span 33m, quiet 24m
[2] 83 tool calls: exec 70, wait 6, spawn_agent 3, wait_agent 3, +1 kinds
[3] edited 0 files
[4] last ask: (none recorded in this capture)
[5] last said: (no prose from the agent)
```

Volume and time only, no substance. And this weak case is common, not rare. All 5 codex captures
in the gmux area, plus 2 more in a sibling project, have 0 user turns and no agent prose. They
are codex exec or orchestrator runs.

### 5.3 The honesty audit on the claude digest

The digest was correct on turns, span, last ask and last statement (byte matched against the
real final message). Two misses were found:

- Claude Code Write blocks in v2.1.0 captures carry no file path, so 2 written files are absent
  from the files line, which undercounts 18 as 16. Edit blocks do carry the path.
- Truncating the last message to its first 200 chars kept the verdict but dropped the two open
  items at the end of the message ("git add ... is yours to run" and "Want it removed?"). The
  pending question is exactly what front truncation loses.

### 5.4 The LLM digests, exact spend

3 invocations of `claude -p --model haiku` (resolved claude-haiku-4-5-20251001), with
`--output-format json` and `--max-budget-usd 0.50` each:

| Run | Input | Bytes in | Wall | Cost |
|---|---|---|---|---|
| 1 | Qwen capture | 6,620 | 16.4 s (8.5 s API) | $0.0273 |
| 2 | Headless codex capture | 36,228 | 15.2 s (8.7 s API) | $0.0450 |
| 3 | Claude merge capture, head 15 KB plus tail 30 KB of 373 KB | 45,350 | 19.1 s (11.6 s API) | $0.0482 |

Total $0.1205. Note the cost floor. Even the 6.6 KB transcript cost $0.027, because `claude -p`
carries the Claude Code harness prompt, which is 18k to 22k cache read plus 10k to 20k cache
creation tokens per run.

Run 2, on the structural failure case, verbatim:

> GOAL: Audit and plan simplification of the gmux Electron and TypeScript architecture... DONE:
> Created comprehensive architecture audit document, analyzed existing codebase, reorganized
> documentation, updated cross-references, and committed all changes to git. STATE: Audit
> document created and committed... NEEDS: Human review of audit findings and decision on which
> simplifications to implement first.

Its central claim verified against reality. gmux commit 9581852, "docs(audit): archive the
pre-build architecture assessment", exists and matches the transcript's final exec commands.

Run 3, on the truncated claude merge session, surfaced all 3 open items, including the pending
question the structural digest dropped. Run 1 was accurate but added nothing over the structural
digest on the same clean session.

### 5.5 Staleness, from files touched

SpecStory flushes behind the live session by a measured 8 s and 17 s on two active captures, and
0 s on an idle one. One file's mtime moved 33.7 h after its last turn with no new transcript
content, so mtime alone is a change hint, not a truth. The rule that follows: a digest stores
the capture's byte size and last in-file timestamp at compute time, and it is stale when either
changes, or when the status oracle records a transition later than that timestamp. The oracle
comparison also covers the 8 to 17 s flush window during which the capture is always behind the
live session.

---

## 6. The judged design

### 6.1 The mechanism ladder

The lab measured the split, so this is not taste. The structural digest is faithful on
interactive sessions and parses the largest capture on the machine in 10.3 ms. It fails honestly
on headless codex sessions, and those are the common case in the operator's fleet. The LLM
digest recovered exactly those sessions, and its 15 to 19 s latency and $0.027 cost floor per
call disqualify it from any ambient or automatic role.

| Option | Verdict | Deciding reason |
|---|---|---|
| Structural only, forever | Rejected | The operator's fleet is heavy on headless codex sessions, where the structural digest degrades to volume and time with no substance. |
| LLM for everything | Rejected | $0.027 floor and 15 to 19 s per digest, and run 1 showed the LLM adds nothing over the structural digest on clean interactive sessions. |
| Both in one phase | Rejected | The LLM path needs the Phase 23 confirm gate, settings copy, caching and cost display. Bundling it delays the free digest that already covers the interactive case. |
| **Structural in Phase A, LLM opt in in Phase B** | **Chosen** | Each mechanism does only what it measured well at, and the free one ships first. |

Phase A also attempts one structural improvement the lab observed but did not build. Headless
codex transcripts carry `update_plan` tool inputs with step lists and statuses, and a
deterministic parser can extract these as a substance line at zero cost. This rests on 1
observed capture, so Phase A treats it as a stretch item with its own fixture check, not a
promise.

### 6.2 The surface

The Zen test for each candidate is whether it is a place you go or an answer to an ask, and
whether it can shout.

| Candidate | Verdict | Deciding reason |
|---|---|---|
| **Catch Me Up verb, answer in a place you go** | **Chosen** | It is the literal definition of an answer to an explicit ask. It also gives the Phase B LLM digest its only home, since 15 to 19 s of latency only makes sense after an ask. |
| **Enriched jump overlay for needs input** | **Chosen** | The research says summaries help at the moment of return, not during work. The jump is the return. The structural digest renders in under 22 ms, so it adds no latency to a surface that already exists and already shows the last screen line. |
| Hover digest on the session row | Rejected | Hover fires from pointer travel, not from an ask. It turns scanning the session list into reading summaries the human did not request, which is supervision by another name. |
| Briefing panel of every session's digest | Rejected | A wall of digests across the fleet is a dashboard, and the refusals name that directly. The field found no evidence anyone wants fleet prose. Review pain is per session at the moment of return. |

The refusals, restated for the phase brief so no builder drifts. No badges. No counters. No
unread markers. No auto opening panels. No digest pushed on a status transition. No digest text
in a notification. The digest never sets, colors, or implies status, which is Phase 23 refusal 5
and the frozen status rule. A session with no capture (shell sessions, pi, deepseek, and the
2,208 pre v2 captures) gets the honest fallback, which is the live facts the manifest and
activity monitor already hold plus the sentence "no transcript record exists for this session",
never an invented summary.

### 6.3 When digests compute

| Option | Verdict | Deciding reason |
|---|---|---|
| Continuously | Rejected | For the LLM it is dollars per hour per session. For the structural digest it buys nothing, because on demand is already under 22 ms. |
| On needs input transition | Rejected | Precomputing the LLM digest spends the operator's money without an ask, and a precomputed digest tempts a future round to surface it ambiently. The structural digest needs no precompute to be instant. |
| **On demand only** | **Chosen** | Structural recomputes fresh at every render, so it is never stale by more than the capture flush lag. The LLM digest runs only on an explicit ask and is cached. |

Staleness is displayed, never hidden, because the capture always trails the live session by a
measured 8 to 17 s. Every digest shows "as of" the capture's last in-file timestamp. A cached
LLM digest is marked stale by the rule in section 5.5. File mtime is never trusted alone.

### 6.4 The privacy line, stated plainly

- Phase A moves zero bytes off the machine. It reads capture files already on disk and stores
  nothing, since it recomputes on demand.
- Phase B sends conversation content only when three things are all true. The user turned the
  feature on in Settings. The user confirmed the digest binary through the existing Phase 23
  gate, which is hash bound, lives only in Settings, and sits out of band of any agent turn. The
  user asked about a specific session. The content goes only to wherever that confirmed agent
  CLI already sends its prompts, under the user's own account. Tortie itself owns no endpoint
  and never will under the Phase 25 refusals.
- One honest wrinkle the copy must state. If the user digests a codex session with a claude
  binary, a transcript one vendor produced goes to a different vendor. "The same account that
  already saw the conversation" is only true when the digest agent matches the session agent, so
  the copy says where the text goes rather than implying it goes nowhere new.
- LLM digests are cached locally under `<userData>/gmux/` with the session id, the two staleness
  keys, the model name, the timestamp and the reported cost. Nothing else is stored.

Settings copy, drafted to the operator's writing rules:

> Catch Me Up can ask an agent on this machine to write a short summary of a session. Tortie
> never sends conversation content anywhere itself. When you ask for a summary, Tortie runs the
> agent binary you confirm below as a separate one shot process and passes it that session's
> transcript. The transcript goes wherever that agent normally sends prompts, under your own
> account, even when a different agent ran the session. Each summary costs about what one short
> agent turn costs, roughly 3 to 5 cents. This is off until you turn it on.

### 6.5 Trust affordances

A wrong digest is worse than scrollback, so every affordance below is a requirement of Phase A
or B, not polish.

- Provenance is always labeled. Structural lines are presented as counts and quotes from the
  record. Model prose is boxed separately under a header naming the agent, the model, the time
  and the reported cost. The two are never interleaved.
- Every structural line is a link. Clicking the last ask, a file, or the last statement opens
  the capture at that turn, so the digest points at evidence instead of standing in for it. This
  is the direct answer to the sabotage finding in section 4.2.
- Numbers over adjectives everywhere, per the METR result. The digest shows "87 Bash calls, 16
  files, 1h 7m" and never shows "productive".
- Staleness is always visible, per the rule in section 6.3.
- The last statement excerpt keeps the tail of the message, not the head. The lab proved front
  truncation keeps the verdict and drops the pending question, and the pending question is the
  one thing the returning human needs.
- The known undercounts are stated in the digest itself, not papered over. Claude Write blocks
  carry no path in v2.1.0 captures, so the files line reads "16 files (paths for 2 writes not
  recorded)" when it applies.
- The LLM digest carries a fixed one line disclaimer that it is a summary and not a review, and
  it must cite files and commands so the human can drill in.

---

## 7. The phase split and tiers

| Phase | Contents | Tier | Reason |
|---|---|---|---|
| A, structural digest and surfaces | Parser module in main keyed by `agent_session_id`, digest IPC over the one typed bridge, Catch Me Up verb and its panel, enriched jump overlay, no capture fallback, `update_plan` stretch item | Tier 2 for the surfaces, plus a per agent fixture matrix for the parser | The parser claims one grammar across agents, and CLAUDE.md sends universality claims to full evidence. A conformance style fixture run over real captures from every agent with captures on disk (claude, codex both vintages, qwen, cursor, gemini, muse, grok, antigravity, copilot) is that evidence, and it is cheap because parsing is milliseconds. The UI itself is additive and read only, so Tier 2 covers it. |
| B, LLM opt in | Settings surface riding the existing Phase 23 confirm gate, one shot spawn of the confirmed binary, local cache with the two staleness keys, provenance labeling, cost display | Tier 3 on the execution gate, Tier 2 on the UI | Phase B makes configuration cause a process to run, which is exactly what refusal 8 governs, so the confirm hash must be proven to move for every execution bearing field. Verification includes at most 2 live one shot invocations as evidence, with spend stated. `conformance:agents` runs if `main/config/**` is touched. |

---

## 8. What is not true, and what is unverified

- The structural parser is proven on 3 of the 10 capture producing agents. Cursor, gemini,
  grok, antigravity, muse and copilot captures exist on disk and were never run through it. The
  Phase A fixture matrix exists to close this.
- The `update_plan` fallback for headless codex rests on 1 capture and was never implemented or
  measured.
- About 2,208 of the 5,993 captures are a pre v2 format with no session id line. The digest will
  not resolve those sessions, and Phase A shows "no transcript record" for them rather than a
  guess.
- The staleness rule comparing oracle transitions to capture timestamps is derived from source,
  not exercised against the live app.
- The lab's head plus tail truncation for large transcripts was tested on 1 session. A session
  whose decisive content sits in the middle could mislead the LLM digest, and this is untested.
- Dollar figures are the claude CLI's own self report and were not checked against billing. The
  $0.027 harness floor might shrink with flags that were not tried, since the 3 invocation
  budget was spent on the three transcript shapes.
- No status transition history exists anywhere in Tortie, so no digest can narrate status
  changes over time. That would be new state and is out of scope for both phases.
- No shipped product offers a cross session digest inside a terminal multiplexer, so there is
  no field precedent to copy from, only the Claude Code cost and consent shape to imitate. The
  field lane also ran without its web search budget, so a competitor with such a feature could
  have been missed.
- Why the 24 h codex capture has 0 user turn markers is not established. It may be a headless
  spawned session rather than a capture defect. Relatedly, codex emits one agent marker per tool
  call, so "turns per hour" overstates conversational turns for codex relative to claude.
- Gemini capture messiness rests on 1 example of 6 files. Newer specstory builds may mark gemini
  tools up properly.
- droid's store shape is upstream documentation only, and the cursor IDE and copilot IDE store
  structures are taken from registry notes. Those databases were not opened.
- The claude tier 0 oracle file is claude's internal state, not a documented API. Its
  `waitingFor` text could change shape in any release.
- The 0.70 reliability crossover attributed to Wickens and Dixon (2007) is recalled from the
  literature. The citation was verified this session, the number was not. The HN quotes were
  extracted through a summarizing model and may be lightly paraphrased, though the thread IDs
  are exact.
- The cause of the 33.7 h mtime jump on one capture was not identified.
