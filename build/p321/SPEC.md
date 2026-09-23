# build/p321 — the questions real agents draw turn amber

Phase 321, "so we can fix this correctly", part two (docs/BACKLOG.md, `## Phase 321`; research 129 §9 items 2 to
4). This is the phase's spec step: the entry reconciled with the tree at `ecb6997a` and with Phase 319 PARKED,
every shape designed against the banked corpus and attacked with its own false ambers before a line of it is
built, and the build split between three builders with disjoint files. Written 2026-09-23.

**What this document is not.** It is not the proof. Every number below is the spec step's, read over the corpus
with a scratch copy of the proposed clauses, so the builders do not start from guesses. The verifiers re-derive
all of it by methods of their own (§9).

---

## 0. The phase in one paragraph

Five screen-watched agents draw questions the numbered detector cannot read, and two agents are masked. After
this phase, **six named shapes** (compiled registry data, never configuration) are read beside the unchanged
numbered verdict for cursor, qwen, opencode, antigravity and Claude Code's launch window; **antigravity's
repaint stops hiding its own anchored questions**; and **grok's helpers stop counting as a running tool**, so
grok reads idle when it rests. Every other agent reads exactly as today, the numbered verdict is byte for byte
and its inputs are unchanged, the status set is unchanged, the choice channel is unchanged, and the ceiling of
six amber sessions **stands** (his correction of 2026-09-23) and is measured as a limit, not lifted. The three
parts are **separable**: each one can be removed whole under the no-regression rule without touching the others.

**Fix round, 2026-09-23 (§12.9): two shapes, not six, and no antigravity part.** Both verifiers answered
needs_work. Four shapes each turned amber on a screen that is not a question, and under his rule (a shape or
clause that adds a false amber is removed, not repaired) they were REMOVED whole: `cursor-trust-gate` and
`cursor-run-permission` (his paste of cursor's own rows into the input cursor draws on the last row after a
skipped permission, measured live, and a shell or pager showing the trust rows), `opencode-permission` (a shell
or pager showing its rows) and `antigravity-arrow-list` (a shell or pager showing its rows, and the pickers agy
draws with the same component), with antigravity's `writesWhileAsking` exemption, which had no other use.
**cursor, opencode and antigravity lose their shapes and read exactly what the parent reads.** What stays:
`qwen-confirmation`, `claude-trust-gate` and grok's `residentHelpers`, the last with a launch-window clause the
fix round added. Two findings are not a fix-round change and wait for his ruling (§12.9.5).

---

## 1. Where the entry disagrees with the tree or with the rules, and the decision at each seam

### 1.1 What moved since the entry was written

| Entry says | The tree at `ecb6997a` | Decision |
| --- | --- | --- |
| Line numbers read at `5ddbee19`, "319 moves lines" | `src/main/activity/` and `src/main/agents/registry.ts` are byte-identical from `5ddbee19` to `ecb6997a` (`git diff --stat` lists neither); 319 is parked and uncommitted in its own worktree | **Every citation in the entry still holds.** Re-read: `state-machine.ts:346` (the `dialog` line), `:332-335` (output, CPU, tool child), `:351-352` (the reset), `:397-412` (release), `:51`, `:55`, `:194` (`freshState`); `monitor.ts:587-600`, `:612-620`, `:1140-1190`, `:1155-1158`, `:1243`; `screen.ts:66-74`, `:90-101`, `:284-303`; `process.ts:135-141`, `:39`; `registry.ts:320-336`, `:472`, `:547`, `:616`, `:1042-1043`, `:1200`, `:1486-1497`, `:1603`, `:1980`, `:1987`, `:1999-2002`; `agent-overlay.ts:632`, `:645-647`; `sessions.ts:272`; `remote-sessions.ts:1032`; CLAUDE.md `:282` |
| "Depends on Phase 319 landed"; "every line below is read before 319" | 319 parked (his ruling "Park it, go to 321") | Superseded by the entry's own correction. **The parent is `ecb6997a`** (origin/main at this step; re-point to whatever origin/main is when the phase commits, and state it) |
| `HELPER_USER_FLOOR` "149 at `5ddbee19`, `:292`, and 319 raises it first" | **150 at `build/assert-electron-teardown.mjs:300`** (314 and 320 each added a probe) | `probe:p321` raises it to **151** |
| "After a minute of silence … raised in every cell. This is the check that Phase 319's peek reads the new shapes" | No peek exists | **Rewritten as a limit row** (§9.6): a shape-read question drawn in one write after the probe window closes is missed at today's rate (about 25% at the 2 s cadence, 0% at 1 s), exactly as a numbered one is. The shapes add no timing loss of their own and recover none |
| Proof rows that assume the ceiling lifted | The ceiling stands | **A limit row** (§9.6), including the one consequence the entry did not state (§1.3 item 4) |

### 1.2 Where the entry is wrong, found while designing

1. **antigravity's `animatesWhenIdle: true` (mechanism item 6) would widen the fault this phase must not
   widen.** Today antigravity 1.2.7's repaint every 2.0 s is what hides the unchanged numbered verdict on its
   screens: at 1 s, one tick of every pair sees output and resets the count. The flag stops output counting,
   so the numbered verdict would start reading antigravity's input box and prose the way it already reads every
   other screen-tier agent's: his own dialog-shaped words typed or pasted into antigravity's input box would go
   from never amber at 1 s to amber, and the flag also makes antigravity always probed, which at 2 s puts
   captures on ticks today never takes (research 129 §3.1's one-write class, the class Phase 319 was parked
   for). The entry's own "What is NOT" says "This phase must not widen it". **Decision: antigravity keeps
   `animatesWhenIdle: false`** and gains `writesWhileAsking: true` (§4.3): its output stops resetting a
   dialog ONLY on a tick where one of its own ANCHORED shapes is on the screen. Everything else about antigravity
   reads as today, including its "running" at rest, which becomes a named limit and its own entry.
2. **grok's resident rule as written would also widen it.** Today grok's helpers reset the numbered count on
   every tick; the entry's rule stops that too, so his numbered words typed into grok would start turning amber.
   **Decision: the residents stop being WORK but keep HIDING the numbered verdict** (§4.4). grok reads idle when
   it rests; a grok question still never turns amber, as today. None is recorded (its default mode asks
   nothing), so nothing measured is lost.
3. **"0 `not-question` screens read `true` at HEAD for any agent" is unachievable as written**, because the
   unchanged numbered verdict already reads 3 captures of gemini's ANSWERED trust gate as a question at the
   parent (the box stays drawn for about 3 s while gemini restarts, with its input box below it: a/gemini at
   +40.4, +41.5 and +42.4 s, answer at +39.4 s). HEAD must equal the parent there (the floor). **The rule becomes:
   0 `not-question` screens that the parent reads `false` read `true` at HEAD, for any agent**, and every parent
   false positive is listed, never hidden. This screen is also the plainest evidence for why every shape here is
   anchored to the bottom of the screen (§3.1).
4. **Two of the 17 question instances can never be raised by any cadence.** Adversary 1 answered cursor's trust
   gate 0.59 s after it was drawn and its run permission 0.70 s after (`adv1/cursor`), and a confirmation needs
   two consecutive captures at least one tick apart (`DIALOG_CONFIRM_TICKS`). **15 of the 17 are raisable**;
   the two are rows marked "answered before a second capture could exist", never left out. A question that
   stays up only a few seconds (B's cursor trust gate, 5.4 s) may be raisable at 1 s and not at 2 s; the
   verifier computes raisability per cadence from the byte timeline (the agent's last write before the answer,
   plus `QUIET_MS`, plus two ticks) and grades only raisable cells.
5. **The live confirmation's qwen turn breaks a hard rule.** qwen may never run outside a scratch HOME, and a
   scratch HOME has no sign-in, so qwen's permission question cannot be drawn live. **qwen's rows are the
   recordings' only**, and its width robustness is stated as unmeasured.
6. **Research 129's live run installed two agent updates.** `agy` was rewritten at 2026-09-22 18:23:57 and
   `grok-1.0.41` was installed (and the `grok` link repointed) at 18:24:02, 7 s and 12 s after investigator A's
   run launched them at 18:23:50; the recordings' own banners read antigravity 1.2.7 and grok 1.0.34, and the
   installed binaries now read 1.2.8 and 1.0.41. So launching agy or grok installs things. **No live launch of
   agy or grok in this phase** unless the verifier finds, in the installed binary itself, a switch that turns its
   updater off, and shows the install unchanged afterwards. opencode (1.18.32 installed since 2026-09-21, before
   the research; its sidebar in A's run read 1.18.31), cursor-agent (2026.09.18, unchanged since 2026-09-18) and
   Claude Code (2.1.280, `DISABLE_AUTOUPDATER=1`) showed no change across that run. The main session should tell
   the operator: his agy and grok were updated by a research run on 2026-09-22.
   **Fix round correction: cursor-agent DID change, and "unchanged since 2026-09-18" above is wrong.** Its
   `versions/2026.09.18-9a7762b` directory was created at 2026-09-22 18:24:31 and `~/.local/bin/cursor-agent` and
   `agent` were repointed at 18:24:35, 41 s after investigator A's launch at 18:23:50, which is why A's banner
   reads v2026.09.02 and the later recordings read 2026.09.18 (the attack verifier's `stat` of the install). So
   cursor installs on launch too. Its own bundle has a hidden `--disable-auto-update` flag and an
   `AGENT_CLI_UPDATE_CHECK_URL` override; any live cursor launch passes the first, points the second at a closed
   loopback port, and shows the install unchanged afterwards (§9.7). The main session should add cursor to what
   it tells the operator.
7. **"The stand-in writes that agent's recorded bytes"** (the app run). The raw recordings are in `/private/tmp`
   and disclose; a probe that reads them fails after a reboot and copies his account address into an app
   profile. **The stand-ins draw the committed redacted screens** (§6.3), with each agent's MEASURED write
   behaviour (antigravity's 2.0 s repaint, grok's helpers), and read no recording.
8. **"Every distinct screen of the 1,410" into the tree.** Nothing in the detector or the shapes reads above the
   24-row window (`dialogWindow`, `screen.ts:90-97`), and everything above it is more disclosure. **What is
   committed is each distinct screen's detector window** (the last 24 inked rows, which is what both readers
   see, so a verdict on the committed window equals the verdict on the raw capture by construction), deduplicated
   AFTER redaction: at most 1,219 distinct windows before redaction, fewer after (§2.4).
9. **"antigravity's working … settles to idle after"** assumed the flag. Without it (item 1) the row becomes:
   every antigravity tick outside a drawn shape question reads what the parent reads.
10. **Claude Code's shape was an assumption; it is now measured** (§4.5): 2.1.280 writes no
    `~/.claude/sessions/<pid>.json` while its folder-trust gate is drawn, so its native oracle is silent then and
    the shape is reachable. One consequence the entry did not state is a limit (§1.3 item 3).

### 1.3 Consequences the entry did not state, named as limits rather than fixed

1. **The ⌘J excerpt for a shape-read question is the screen's last line**, because no shape puts a question on
   the channel (`uiUpdate`, `monitor.ts:1049-1112`): for cursor's trust gate that is its box's bottom border,
   for antigravity its model row, for opencode its sidebar's version row. No copy, surface or channel changes in
   this phase; a later entry may give shapes a question row. (Fix round: with the two shapes that stay, the line
   is qwen's `Waiting for user confirmation...` row and Claude Code's `Enter to confirm · Esc to cancel`.)
2. **antigravity still reads "running" at rest** at 1 s (it did at the parent: in A's live run the 1 s monitor
   read `running` for all 595 s), because its repaint is still work outside a drawn question. Its own entry.
3. **Claude Code's trust gate answered outside Tortie's keyboard stays amber until Claude's first turn.** When
   the gate is answered through Tortie's own keyboard path, `noteUserInput` (`monitor.ts:514-520`) releases it at
   once. Answered any other way (another tmux client, a script), Claude writes its registry file with `idle`,
   the native verdict speaks first, and `commitVerdict` refuses `needs_input → idle` (`state-machine.ts:458`),
   so the amber holds until Claude reads `busy`. The same holds today for the older numbered gate. Measured and
   reported (§9.4), not fixed.
4. **The ceiling of six trades victims, and only inside a question's probe window** (restated in the fix round;
   the build's wording left the window out, and the app run's arm (e) was built on that omission). A newly caught
   question is `needs_input`, so it takes one of the six capture slots every blocked session takes
   (`monitor.ts:612-620`, `:1243`). With six sessions blocked on numbered questions, a shape question drawn in a
   seventh is not raised at either build. If one of the six is freed while the seventh is still inside its probe
   window (`AMBIGUOUS_WINDOW_MS`, 60 s after its last work), at HEAD the seventh takes the freed slot and a numbered
   question drawn after it waits, where at the parent the seventh is no question and the numbered one takes the
   slot. If the slot is freed only after the seventh has left its window, the seventh is never captured again and
   is never raised at either build, exactly like a numbered question drawn under a full ceiling today (research
   129 §3.3), and the freed slot goes to the next question at both. The count of amber sessions is never lower at
   HEAD; which question is amber can differ. This is the ceiling he ruled stands; no fix round may touch it. The
   app run grades both halves (arm (e), §12.9).
5. **grok's resident rule has one edge left** (§4.4): a detached tool still alive at the first rest the rule
   records (grok's first turn's, or one from before a Tortie restart that is still alive when grok next rests) is
   taken for a helper and reads idle while it lasts, where the parent reads working. The fix round's launch-window
   clause (§12.9) closed the rest of the build's second edge: a Tortie restart under a grok that is already
   resting records nothing until grok draws again, so that grok reads working, as at the parent, until its next
   turn ends. Nothing the monitor reads tells a helper from a turn's detached tool (both are grok's detached
   children, present before the rest), so the remaining edge is **his to rule on** under the no-regression rule:
   keep it as a stated limit, or remove the grok part whole (it is separable: the registry field, `noteResidents`
   and `coveredByResidents`). Today grok reads working on every tick in every case, the case where it rests with
   nothing but its helpers included.
6. **Capture displacement below the ceiling** (found by the matrix verifier; not a fix-round change). Every
   question HEAD newly catches is `needs_input` and takes a capture slot on every tick it waits, so the other
   ambiguous sessions share fewer of the six and their five-capture screen memory stretches out in time. A quiet
   session whose final screen was not captured before it read idle reads its next capture as a change: a false
   `running` about one screen memory long, and an invented turn boundary. A numbered question drawn meanwhile is
   confirmed a tick or more later. With the build's six shapes (four newly caught questions up at once in
   recording a) the matrix verifier measured, at 2 s over 10 phases: invented boundaries opencode 5 to 21, qwen 0
   to 12, pi 0 to 7; gemini's gate one tick later in 7 to 8 of 10 phases, 2 to 6 cells past the entry's bound of
   the parent median plus one tick. The trade begins BELOW six, which item 4 did not say. Removing four shapes
   for their false ambers also shrinks it (§12.9.4 has the re-measure), but every newly caught question costs a
   slot, so it cannot reach zero while the capture policy stands. **His ruling**: accept it as a named limit and
   restate the entry's two landing rows it breaks ("no later than the parent's median plus one tick" and "none is
   a real turn lost or invented"), or queue the capture policy Phase 319 parked (capture a blocked session only
   when its stamp moves) with its own side-by-side.

## 2. The corpus

### 2.1 Where it is, and what the main session does first

Research 129's recordings, in the `p319` directory of the research session's scratchpad (research 129 §8
names it). **`/private/tmp` does not survive a reboot. Before any builder starts, the main session copies the
corpus to a place outside `/private/tmp` and outside the repository**, and every script reads it from
`P321_CORPUS` only, with no default path committed (the path names an account, which is why Phase 319's fix
round took it out of the tree). Every file below was re-hashed at this step, 2026-09-23. The 33 that Phase 319's
uncommitted `build/p319/SPEC.md` §2 pinned all match its pins; `a/rec/panes.jsonl`, `status.jsonl`,
`launches.jsonl` and `choice.jsonl` are pinned here for the first time:

| File (under the corpus root) | sha256 |
| --- | --- |
| `a/rec/antigravity.bytes.jsonl` | `6fe3bd8223072d9697a534d6b845bd65a413a3c73c1e60f965d0b8a5914feca0` |
| `a/rec/captures.jsonl` | `93e7fe8eca273b2805c55fd8d025a0c905e8cc2e274cc4ee562db43c63a6dc82` |
| `a/rec/claude.bytes.jsonl` | `3f15606b3a87e22723dd934921d957bb31e355e4d47b99c894e9c7c848df5586` |
| `a/rec/codex.bytes.jsonl` | `3d8cb10943d781433f21c085409926a1814edf70dc06c121b9c49fc464e7944d` |
| `a/rec/cursor.bytes.jsonl` | `e83c7d9a84839b9219959c6380e014b30d6094366dc995c9ff2b619aacaa2ea1` |
| `a/rec/events.jsonl` | `d3fb91fbcd1380f4c17134f92ac289b10a7abdbaae7766597750d4af83242fe8` |
| `a/rec/gemini.bytes.jsonl` | `140f453a69bf1483b776230a12805a5497c47ac9bca477b605f8b20df23b6a6e` |
| `a/rec/grok.bytes.jsonl` | `39e1a7a8f192b72a686f19ceb482341ad926391f8f894fa0e0422833f40cb46e` |
| `a/rec/omp.bytes.jsonl` | `c2f0539058747f767f90127659d04ecbbee7c47d1917ea17c697b671b62c0c77` |
| `a/rec/opencode.bytes.jsonl` | `5f21d9cfe18f41382bfce97bf1c7e86c89b03c3ced16bcf4bab8883222deba0e` |
| `a/rec/pi.bytes.jsonl` | `b4f7d819ded132fa56fdc9a0f5673b993ff8bab29616c140d87ce163d6990d3a` |
| `a/rec/ps.jsonl` | `950d69b80179e3356eee28b19ae1b3765f6dffb1dccc08b7956228041ec68f17` |
| `a/rec/qwen.bytes.jsonl` | `7edfd0b8e0bf566ec721a3a7a5a73c8c98521cfae2be495ebba0bcc8853bb895` |
| `a/rec/panes.jsonl` | `640d8cd0a375f5dbe9beba5d56b3ea7c2764e86ca9bb192a91f8de6912c85eea` |
| `a/rec/status.jsonl` | `2971a21441c30e64a8ce28981867dfa41db79d1004c283eabbd36a6d984f40e3` |
| `a/rec/launches.jsonl` | `a4eafe2ab5c9d1e3109b03166ba4b278b6fc5e0525bb94f57e9699b683bf70f6` |
| `a/rec/choice.jsonl` | `95a3d10f6e15a3025005bfcc0d34d9b407f47cee7e90cbb966b945bf11668279` |
| `adv1/rec/focus-caps.jsonl` | `0d7a319621262babe7e01acad43b49d85af789943aed96eadd1a1dca82f6e640` |
| `adv1/rec/focus-cursor.bytes.jsonl` | `d659cca5a19bf319c67ecaa79314d7da0fe89efed5b05771cc707337ff14fb70` |
| `adv1/rec/focus-events.jsonl` | `894284503f4046dc836f6e84ef3ec5dfd7b391fdae8dba27897d2d022a03c009` |
| `adv1/rec/focus-grok.bytes.jsonl` | `a3b6e62dbb0c9b9cc9fe2f877b2ed88ada831c7b0f28e9f2a5822bcd833afeb8` |
| `adv1/rec/focus-ps.jsonl` | `cea1d7a084f018aa6b0d4fb4e56becbaa40eea66d393d3f45ce3f15117ba918c` |
| `adv1/rec/focus-qwen.bytes.jsonl` | `f2802b6d6bddaa113903ce63547f4e9a818a62f66c36c9448830b175c4061122` |
| `rec/cursor-agent-caps.jsonl` | `065c4bc39b18fbfc8a01d2a4225b6267c6f0221054db66aad65c9e7e7b29c230` |
| `rec/cursor-agent-events.jsonl` | `6d6546af3ab11c1729009aecb8d22a5b22028656b78ecb0d0d0c7b6a225bc99b` |
| `rec/cursor-agent.jsonl` | `c8fb8e666ce9955144893caf985308c8224ac273476bea05dc362741df50f549` |
| `rec/gemini-caps.jsonl` | `891126e7647d3ce4aff8d8e109ee0fe579b1b7601871bc04c6b63796b53d9eb4` |
| `rec/gemini-events.jsonl` | `950178a09b3cea3c4a51f9bc6ae2485d1189f0b58a620dfd8bd391e0e37b69d1` |
| `rec/gemini.jsonl` | `9ee574ec364bccc77b3d53841b13a25fef7782eb8de3261e9c3adf4dc4884b53` |
| `rec/grok-caps.jsonl` | `217dadcbf9d81f547c4f1e3e0583b99ab137e227f6b82d01c3f4f2a3ac8cfda6` |
| `rec/grok-events.jsonl` | `2ec6a6d1a431d425c6868ebc867bed4dc7eb7b12028956de3c5ad3f17f57d6f7` |
| `rec/grok.jsonl` | `5b1acd5b104a77e9788e2ad20bdeb1537f59a85afcffa73fd6c5d133804a2b5d` |
| `rec/qwen-caps.jsonl` | `b9a10442f334f834cd65472a8e0f1bb284151f835211967473cc0a0fbda64a7f` |
| `rec/qwen-events.jsonl` | `c80d8a9394fa045990d8aaf6e64ac0f6f9dde63bac376398f9e7c7bf1ce64644` |
| `rec/qwen.jsonl` | `95e8b213249f405cdbbfb8753ed0b8fff16ba9c98a57851bbee1fd35fa4e98b8` |
| `adv2/real-pi-70.txt` | `a1b577be8e0230988d423f354e2d1af698f6bcb275074f1746d6b8dc5bbee237` |
| `adv2/real-pi-160x40.txt` | `50bd8d655d13d05ea0ee827cea4cda77affab8ad9cab9a33060b0edf104cff35` |

If the corpus is lost before Builder A has made the committed screens, the recorder is re-run ONCE, at no more
than 4 real turns, on a scratch socket of its own, with no gemini, no qwen, no agy and no grok (§1.2 items 5
and 6), and every agent process ended by pid in its `finally`.

### 2.2 What it discloses, and what may never enter the tree

The captures draw: the scratch path (which names his account), his home directory, antigravity's banner (his
account address and plan), gemini's banner (skill names under his home), qwen's and cursor's footers (model
names and the path). The process tables name his MCP servers. The key events hold the typed prompts. Agents'
answers are prose. **None of that enters the tree, a report or a log.** Counts, times and the agents' own UI
text only. No prompt text and no conversation line in any report.

### 2.3 The labels, derived by hand

17 question instances (research 129 and Phase 319's §3 table, re-derived here from the capture streams and the
key events; the verifier derives them a third time by its own method before reading anyone's):

| Recording | Question | Drawn (capture clock) | Answered | Captures while up | Parent reads it | Raisable |
| --- | --- | ---: | ---: | ---: | --- | --- |
| a/gemini | trust gate | +10.05 | +39.36 | 29 | yes | yes |
| a/cursor | workspace trust | +3.02 | +39.40 | 31 | no | yes |
| a/cursor | run permission 1 | +70.42 | +88.81 | 19 | no | yes |
| a/cursor | run permission 2 | +181.50 | +242.25 | 61 | no | yes |
| a/qwen | run permission 1 (Ask mode) | +361.65 | +378.93 | 18 | no | yes |
| a/qwen | run permission 2 (Ask mode) | +456.78 | +519.25 | 63 | no | yes |
| a/opencode | an outside folder | +443.79 | +518.28 | 75 | no | yes |
| a/antigravity | folder trust | +7.74 | +39.32 | 30 | no | yes |
| a/antigravity | run permission 1 | +72.42 | +87.81 | 16 | yes, masked by its repaint | yes |
| a/antigravity | run permission 2 | +180.53 | +241.24 | 61 | yes, masked by its repaint | yes |
| a/claude | folder trust (2.1.280) | +2.52 | +38.40 | 31 | no | yes |
| a/codex | update prompt | +2.58 | +38.84 | 31 | yes | yes |
| adv1/cursor | workspace trust | +2.19 | +2.20 | 1 | no | **no: answered 0.59 s after it was drawn** |
| adv1/cursor | run permission | +27.50 | +27.51 | 1 | no | **no: answered 0.70 s after it was drawn** |
| b/cursor | workspace trust | +2.52 | +7.91 | 22 | no | per cadence (up 5.4 s) |
| b/cursor | run permission | +16.60 | +49.49 | 131 | no | yes |
| b/gemini | trust gate | +3.02 | +12.12 | 37 | yes | yes |

Times are seconds from each stream's first capture (Phase 319's table used each byte stream's first byte, so
its numbers differ by the launch offset). **Two clocks, stated in the fix round** (the matrix verifier's nit):
"Drawn (capture clock)" is when the RECORDER's poll first saw the question, which lags the byte timeline by up
to 2.5 s (gemini's gate is in the bytes at +7.54 s and in the captures at +10.05 s); and `labels.json` counts
each stream from that stream's own first capture, so two streams of one run are offset from each other by up
to 1.31 s. Compare across streams only after aligning them. **No question**: a/pi, a/omp, a/grok, adv1/grok, b/grok, adv1/qwen,
b/qwen. **Not measurable**: gemini's turns (none completed), droid (not installed), any grok question (none
recorded).

### 2.4 What Builder A commits, and the one redaction pass

- `build/fixtures/questions/labels.json`: the 17 instances (recording, question, drawn, answered, raisable) and
  one label per committed window: `question` (between a question's first frame and its answering key),
  `answering` (from the key to the first frame without the question's live marks, excluded from both sides and
  counted), or `not-question`. Derived from the byte timeline and the key events and read by eye, **never from
  a detector, including the new shapes**.
- `build/fixtures/questions/<source>-<agent>.jsonl`: one line per distinct REDACTED window,
  `{ "id", "label", "rows" }`, rows as a JSON array of strings (JSON escaping keeps every committed byte
  printable; the phase's no-raw-control-bytes rule is checked by a scan over every committed file, and a
  plain-text capture from `capture-pane -p` carries no ESC to begin with).
- **The pass, one mechanical script, `build/p321/screens.mts --make`** (and `--check`, which needs no corpus):
  1. The window: pop trailing blank lines, keep the last 24 (exactly `dialogWindow`).
  2. The slots: the scratch prefix to `/work/<agent>`, the home directory to `~`, antigravity's account address
     and plan row removed, gemini's skill names to `skill-1…`, any MCP server name to `mcp-1…` (the names are read
     from the recorded process tables at run time and never written anywhere), then `redactText`
     (`src/main/overview/redact.ts:74`).
  3. **Prose to shape.** Each agent gets a hand-written CHROME table in the script: the rows that are the
     agent's own UI (banners, input box, footers, hints, spinners, tool-call headers, option rows, headers), each
     a regex with a comment naming the recording it was read from. A chrome row is kept with its slots redacted
     (a command name inside an option row becomes `x…`). **Every other row is shaped**: each letter to `x` (`X`
     for a capital), digits, punctuation, spacing and box drawing kept. So no answer and no prompt is committed,
     and every row keeps its length, its indent and its ink. A question's own rows are chrome by construction.
  4. **The check, both ways, on every window**: the parent verdict (`detectDialog` at `ecb6997a`, a literal copy
     in the script, as `p312-choices.test.ts:84-110` does) and the HEAD verdict (numbered OR the agent's shapes)
     must equal their verdicts on the raw window. A window where shaping moves either verdict (for example a
     prose row carrying a `QUEST` phrase above numbered rows) is DROPPED, never kept as prose, and the number
     dropped per recording is reported.
  5. **The disclosure scan**: an address pattern, `/Users/`, `/private/tmp/`, the account's flattened scratch
     prefix, a uuid, every MCP and skill name read at run time. A window that still matches is dropped and
     counted. Then dedupe. Then the positive windows and the `answering` windows are read by eye.
  6. The report says what was redacted, per class and per recording, and never prints a raw row.
- **Named positives in `src/main/activity/__tests__/fixtures/`** (full redacted screens, same pass):
  `claude-trust-2-1-280.txt`, `cursor-trust-gate.txt`, `cursor-trust-answered.txt` (the trap, §3.2),
  `cursor-run-permission.txt`, `qwen-run-permission.txt`, `qwen-run-permission-scrollbar.txt` (the second
  question, drawn with qwen's scrollbar column), `opencode-permission.txt`, `antigravity-trust-gate.txt`,
  `antigravity-run-permission.txt`. Nine files; `FIXTURE_FLOOR` (`p312-choices.test.ts:72`) rises from 13 to
  **22** in the same commit. The old numbered `claude-workspace-trust.txt` stays: an older Claude Code draws it.
  Adding them keeps every row of `p312-choices.test.ts` green unchanged, because `detectDialog` does not move.

---

## 3. The shapes

### 3.1 The rule every shape obeys, and why

The numbered verdict reads the whole 24-row window and asks only that a `1.` row, a `2.` row and a hint or
question phrase be somewhere in it. That is why it reads gemini's ANSWERED gate for 3 s (§1.2 item 3), and why
his dialog-shaped words in an input box read as a question today (research 129 §9 item 6). A live question has
four things an answered, quoted, printed or typed one does not have all of, and **every shape requires all four**:

1. **The agent's own option rows**, as that agent draws them (never a phrase list shared across agents).
2. **The live focus mark on one of them** (`▶`, `→`, `›`, `❯`, `>`), where the agent draws one. opencode marks
   focus by colour only, which a plain capture loses, so its shape has no focus clause and leans on 3 and 4.
3. **The live hint or key row** the agent draws only while the question waits (`Enter to select`, `(esc or n)`,
   `Waiting for user confirmation...`, `enter confirm`, `Enter to confirm · Esc to cancel`, `↑/↓ Navigate`).
4. **The bottom**: the question REPLACES the agent's input box, so at most `tail` inked rows (a border-stripped
   row with any character) sit below the LAST hint row. Every one of these agents draws its input box and a
   footer below its conversation at idle and while working (read in each recording), so text in the input box,
   text the agent prints, an answered question in history and a shell prompt after the agent exits all have at
   least two inked rows below them. `tail` is 0 or 1, measured per shape.

Plus two structural rules: the focus row sits at most `span` rows above the hint row, and where a header is
named, it sits at most `askSpan` rows above the focus row. **No clause anchors `$` on a row an agent can draw
a scrollbar or a sidebar beside** (qwen's `█` column in its second question; opencode's sidebar).

### 3.2 The six shapes, the reference spelling measured at this step

**The fix round removed four of these whole** (§12.9): `cursor-trust-gate`, `cursor-run-permission`,
`opencode-permission` and `antigravity-arrow-list`. The table and the counts below are the spec step's and the
build's; each of the four held over the corpus and still read a screen outside it as a question.

`DialogShapeId` is the closed union of these six ids. Builder B may tighten a spelling against the committed
screens; every change is re-measured over the whole corpus and every committed fixture, and the table's
numbers are then the builder's, stated.

| Id | Agent, version it was measured on | Options and focus | Hint | Tail | Header |
| --- | --- | --- | --- | ---: | --- |
| `cursor-trust-gate` | cursor-agent, banner v2026.09.02 (A) and 2026.09.18 (adv1, B), at 160 and 120 columns | `▶ [a] Trust this workspace` / `[q] Quit`, focus `▶` on either keyed row | `Enter to select` (the row `Use arrow keys to navigate, Enter to select, or press the key shown`) | 1 (the box's `╰…╯`) | none: the options are cursor's literal rows |
| `cursor-run-permission` | cursor-agent, the same | a focus row `→ <text> (<key>)` and at least one other keyed row `<text> (<key>)` | `(esc or n)` on the reject row, which is the last row | 0 | `Run this command?` within 3 rows above the focus |
| `qwen-confirmation` | qwen 0.22.0, Ask mode | `› N. <text>` (focus) and another `N. <text>` row | a braille spinner then `Waiting for user confirmation...`, the last row | 0 | none: the footer is qwen's own wait status, recorded only for `Allow execution of: '<cmd>'?` |
| `opencode-permission` | opencode, sidebar 1.18.31 | the one button row `Allow once   Allow always   Reject` | `enter confirm` on that same row | 1 (the sidebar's version row) | `△ Permission required` within 16 rows above |
| `claude-trust-gate` | Claude Code 2.1.280 (`hideIndexes`, focus "No, exit", Phase 314 R3) | `❯ No, exit` / `Yes, I trust this folder`, focus `❯` on either | `Enter to confirm · Esc to cancel`, the last row | 0 | none |
| `antigravity-arrow-list` | agy 1.2.7 | a focus row `> <text>` or `> N. <text>` and another option row | `↑/↓ Navigate…` | 1 (its model row, or `esc to cancel` beside it) | none: one shape reads its folder trust and both numbered permissions |

**Measured at this step** over every capture of the corpus (7,591 captures: 657 labelled question, 47
answering, 6,887 not-question, by the table in §2.3):

| Shape | Question captures of its agent read `true` | Its agent's other captures read `true` | Any other agent's captures read `true` |
| --- | --- | --- | --- |
| `cursor-trust-gate` | 54 of 54 (a 31, b 22, adv1 1) | 0 | 0 |
| `cursor-run-permission` | 212 of 212 (a 80, b 131, adv1 1) | 0 | 0 |
| `qwen-confirmation` | 81 of 81 | 0 | 0 |
| `opencode-permission` | 75 of 75 | 0 | 0 |
| `claude-trust-gate` | 31 of 31 | 0 | 0 |
| `antigravity-arrow-list` | 107 of 107 (trust 30, permissions 16 and 61) | 0 | 0 |

**The cursor trap, read directly:** after cursor's trust gate was answered, all 555 later captures of a/cursor
still draw the answered box (`[a] Trust this workspace` with no `▶`, and `⏳ Trusting workspace...` where the
hint was), 25 of them inside the 24-row window, and `cursor-trust-gate` reads 0 of the 555: the focus, the hint
and the tail clause each refuse it on its own. Over the 13 committed fixtures the six shapes read one:
`antigravity-signin-choice.txt` (antigravity's first-run sign-in choice, `> 1. Google OAuth` over
`↑/↓ Navigate · enter Select`), which is a real question the numbered verdict misses today (its hint is not
in `HINT`), so it is reported as a question the shape also reads, not as a false amber.

**Over the corpus no single clause is needed**: every question screen carries all four, and every non-question
screen fails more than one. So each clause is owned by a **one-clause-off twin** (§5.1), a real question
screen with exactly one live property taken away, which every full shape refuses and exactly one ablation
turns true. Built at this step for all six from real captures: the question with the agent's own idle input box
and footer appended below (tail owns it), the focus glyph blanked (focus owns it), the hint row blanked (hint
owns it); every full shape refused all of them.

### 3.3 `detectShapes`

`export function detectShapes(capture: string, shapes: readonly DialogShapeId[]): boolean` in
`src/main/activity/screen.ts`, beside the verdict and never inside it, over the same `dialogWindow`. It takes
no agent id and reads no registry. An empty list answers `false` before it reads the capture. `BORDER`, `OPT1`,
`OPT2`, `HINT`, `QUEST`, `DIALOG_ROWS`, `detectDialogRows` and `detectDialog` do not move, and **no new line in
`screen.ts` may repeat any `ablation:p312` needle** (its arms must each still match exactly once: the verdict
loop's lines, `return detectDialogRows(capture).atChoice;`, the `OPT1` literal, and the collector lines at
`screen.ts:423-444`). The table is `DIALOG_SHAPES: Readonly<Record<DialogShapeId, DialogShape>>`, one entry per
id, each with a comment naming the recordings and the version it was measured on.

---

## 4. The registry fields and the rules

### 4.1 `AgentActivityProfile` (`registry.ts:320-336`) gains three optional fields

```ts
/** Named question shapes this agent draws, read beside the numbered verdict. Compiled, never configured. */
dialogs?: readonly DialogShapeId[];
/** This agent keeps writing while its question is drawn, so output is not work on a tick where one of its
 *  own shapes is on the screen. Measured: agy 1.2.7 writes every 2.0 s at idle and while asking. */
writesWhileAsking?: true;
/** The detached helpers this agent starts and keeps (grok's MCP servers) are not a running tool once it has
 *  rested; they still hide the numbered verdict exactly as they always have. */
residentHelpers?: true;
```

`DialogShapeId` is imported as a TYPE from `../activity/screen`, which is no runtime edge
(`build/assert-no-runtime-cycles.mjs` excludes type-only imports). **No configuration reaches any of it**: the
overlay refuses `activity` whole (`src/shared/agent-overlay.ts:645-647`), `activityProfileFor`
(`registry.ts:1999-2002`) reads only the compiled rows, and `src/shared/` is not touched. `DEFAULT_ACTIVITY`
and `SHELL_ACTIVITY` list nothing.

| Row | Adds | Comment carries |
| --- | --- | --- |
| claude (`:547`) | `dialogs: ['claude-trust-gate']` | Read only while the registry file is absent, measured 2026-09-23 on 2.1.280 (§4.5) |
| cursor (`:616`) | `dialogs: ['cursor-trust-gate', 'cursor-run-permission']` | The versions and the trap |
| antigravity (`:1043`) | `dialogs: ['antigravity-arrow-list']`, `writesWhileAsking: true` | The comment "Idle byte-silence VERIFIED" is rewritten: 1.2.7 writes every 2.0 s at idle (169 chunks over 340 s) and while asking; `animatesWhenIdle` stays `false` on purpose (§1.2 item 1) |
| qwen (`:1200`) | `dialogs: ['qwen-confirmation']` | 0.22.0, Ask mode only; his default Auto mode asks nothing |
| grok (`:1497`) | `residentHelpers: true` | The census as COUNTS (six detached helpers, first seen 6.1 s after launch, present to the end; no names) |
| opencode (`:1603`) | `dialogs: ['opencode-permission']` | 1.18.31 |

gemini, codex, pi, omp, droid, deepseek, muse, every configured agent and every unknown agent: nothing.

### 4.2 `inferredVerdict` (`state-machine.ts:312-395`): the change, exactly

Everything not named here is unchanged, including the order of the tiers.

```ts
const numbered = screen !== null && detectDialog(screen);            // detectDialog keeps ONE call site
const shaped = screen !== null && detectShapes(screen, profile.dialogs ?? NO_SHAPES);

// antigravity only: its own write while its anchored question is drawn is not work.
const outputIsWork = outputEvidence && !(shaped && profile.writesWhileAsking === true);

// grok only (§4.4): helpers present at its first rest are not a running tool.
noteResidents(st, profile, ctx, pane, { quiet, reflowing, cpuBusy, screenChanged, toolChild });
const residentOnly = toolChild && coveredByResidents(st, ctx.proc, pane.panePid);
const workingTool = toolChild && !residentOnly;

if (outputIsWork || cpuBusy || workingTool) { /* the existing branch, unchanged */ }

const dialog = shaped || (numbered && !residentOnly);
```

- For every agent without the new fields: `shaped` is false, `outputIsWork === outputEvidence`,
  `residentOnly` is false, `workingTool === toolChild`, `dialog === numbered`. **Byte-identical behaviour.**
- The numbered verdict's count is reset by exactly the evidence that resets it today, for every agent: for
  antigravity by its output (a numbered-only screen is never `shaped`), for grok by its helpers (`residentOnly`
  hides it). **So no screen the numbered verdict misreads can turn amber at HEAD where it could not at the
  parent** (the entry's "must not widen" rule, held by construction and measured anyway, §9.5).
- `toolChild` keeps its line (`state-machine.ts:335`, `hasToolChild`, `process.ts:135-141`, both unchanged).
- The confirmation is still `DIALOG_CONFIRM_TICKS` consecutive captures, the release is still
  `releaseNeedsInput` (`:402-412`), `commitVerdict` is untouched, and no constant moves.
- `state-machine.ts` names no `capture-pane` and no spawn (`conformance:handback`'s `readsScreen` and
  `startsProcess`, `build/handback-conformance-probe.mts:534-536`).

### 4.3 antigravity, `writesWhileAsking`

A tick where antigravity's own anchored shape is on the screen does not read its repaint as work, so its trust
gate and both permissions confirm on two consecutive captures at 1 s and at 2 s, and a drawn question holds
while antigravity keeps repainting (today a numbered antigravity question caught at 2 s is RELEASED by its own
repaint two captures later; at HEAD it holds until answered). When the question is answered the shape is gone,
the repaint is work again, and the release is today's. His words in its input box are not `shaped` (the tail
refuses them, §3.1), so they meet today's reset, and its prose likewise. **Cost: none.** Its capture set and
`ps` are the parent's on every tick outside a drawn question (it reads `working` at 1 s and is always in the
probe window, as today).

### 4.4 grok, `residentHelpers`

- `SessionState` (`state-machine.ts:73-174`) gains `residents: number[] | null`, `null` in `freshState`
  (`:194`), set to `null` in `noteAgentLeft` (`:777-795`, Phase 141's `left`). `forget` already drops the state.
- **Recording**, once per life: on the first tick where the profile has `residentHelpers`, `residents` is
  null, a table and a capture were read, output is quiet and not reflowing, CPU is not busy, the screen memory
  says unchanged (`!screenChanged`), and `toolChild` is true, `residents` becomes every pid `toolChildPids`
  returns. That is grok's first rest after its first turn: grok draws continuously before its first turn (about 6
  to 10 chunks a second in all three recordings) and while it works (0.2 s gaps), so no earlier tick is quiet.
- **Pruning**: on every tick with a table, a resident pid the table no longer holds is dropped (a table is a
  complete snapshot, so absence is death), so a later process that reuses the pid is never excused. An empty
  list stays empty and is never re-recorded.
- **`coveredByResidents`**: true when every pid `toolChildPids` returns is a resident. A detached child born
  after the rest counts exactly as today.
- `process.ts` gains `toolChildPids(snap, root): number[]` (ascending) beside `hasToolChild`, whose body does
  not change; a test row holds `hasToolChild(s, r) === toolChildPids(s, r).length > 0` over every table the
  tests build and every recorded table.
- **Measured at this step over a/rec's 1,172 grok samples**: the detached descendants at the first rest
  (181 to 186 s: the silent stretch begins at 179.2 s, output is quiet 2 s later, and the screen memory needs
  its five unchanged captures) are exactly the six helpers first seen at 6.1 s; the turn's own `sleep` wrapper
  was gone by 174.0 s and a one-sample child at 177.5 s before that; the second turn's tool (born 367.4 s) is
  not a resident.
- **A fresh grok that has never run a turn reads `working` at both builds**, because it draws continuously
  until its first turn; stated, not fixed.
  CPU would not hold grok working at rest (research 129 and the entry: one busy one-second interval in each
  silent stretch, never two in a row, and the rule needs two).
- **Edges, stated (§1.3 item 5)**: a detached tool still alive at the first rest (a background job from turn one
  that outlives it) and any detached tool alive when Tortie restarts under a resting grok are recorded as
  residents and read idle while they last. An MCP server restarted later has a new pid and counts as a tool,
  which is today's `working`.
- **Cost: lower.** Today grok reads `working` on every tick, so it is always in the probe window and every tick
  takes a `ps` (research 129's unit cost on this Mac: 36.7 ms wall, 33.3 ms CPU) and a capture share. At HEAD a
  rested grok leaves the window after `AMBIGUOUS_WINDOW_MS` and costs nothing, so research 18's A9 holds again
  for a fleet whose grok sessions rest.

### 4.5 Claude Code, measured at this step

One launch, no turn and no answer: Claude Code 2.1.280 in a fresh scratch folder on a scratch tmux socket of
the spec step's own, the environment emptied (`env -i`, so no inherited Claude Code session variable and no
`TMUX`, Phase 314 R6 and R8), `DISABLE_AUTOUPDATER=1`, at 120 columns. The gate was drawn within 0.5 s, as
`❯ No, exit` / `Yes, I trust this folder` / `Enter to confirm · Esc to cancel`. **For the 10 s that followed,
no `~/.claude/sessions/<pid>.json` existed for its pid**, so `nativeVerdict` answers null for the whole gate
and the shape is read. It was ended by pid with TERM, it was gone, no registry file was left, and the socket
and the folder were removed. What the launch may have left: the scratch folder's entry in Claude Code's own
configuration, as `conformance:resume` and `probe:p314` leave.

---

## 5. Tests, ablation and gates

### 5.1 `src/main/activity/__tests__/p321-shapes.test.ts` (Builder B)

- One describe per shape: every committed `question` window of its agent reads `true`; every `not-question`
  window of the same agent reads `false`; `cursor-trust-answered.txt` reads `false`; its one-clause-off twins
  (built in the test from its positive fixture and that agent's own committed idle rows: the input box and
  footer appended below; the focus glyph blanked; the hint row blanked or replaced by the agent's own post-answer
  row; the header removed where there is one; the question's rows placed INSIDE the agent's own input box, as
  his typed words would sit) each read `false`.
- Cross-agent: every shape over every other agent's committed windows, with the counts PINNED (0 at this step),
  so a change is a red row rather than a silent widening.
- `detectShapes` with an empty list reads nothing; `DEFAULT_ACTIVITY` and `SHELL_ACTIVITY` list no shape; the
  agents named in §4.1 as "nothing" list none.
- The floor: over every committed window and fixture, `detectDialog` equals the literal parent copy
  (`p312-choices.test.ts` already holds this for the fixtures; this file holds it for the corpus windows).
- Cost: 20,000 calls on a question screen and an idle screen, parent (numbered alone) against HEAD (numbered
  plus the agent's shapes), in Phase 312's shape (`screen.ts:273-282`), reported in µs.

### 5.2 `src/main/activity/__tests__/p321-masking.test.ts` (Builder B)

The shipping state machine on a virtual clock, profiles from the compiled registry:

- **antigravity**: a repaint every 2.0 s with the trust gate drawn reaches `needs_input` at 1 s and at 2 s over
  10 tick phases; the same with a permission screen; the question answered releases as today; his numbered
  words in its input box under the same repaint read exactly the parent's sequence (a literal copy of the
  parent's `inferredVerdict` is the oracle, as `p312-choices.test.ts` copies the parent detector); its idle
  screen under the repaint reads what the parent reads.
- **grok**: helpers born at 6 s, output until 180 s, then silence: residents recorded at the first rest, then
  `idle`; a tool born after reads `working`; a helper that dies is pruned and a new process with its pid counts;
  his numbered words with only residents present never reach `needs_input` (hidden, as the parent); the agent
  leaving clears the set, and a relaunch records a new one.
- **Every other profile**: over the same inputs, HEAD's verdict sequence equals the parent oracle's, tick for
  tick.
- Every existing row of `signals.test.ts`, `p312-choices.test.ts` (except `FIXTURE_FLOOR`, Builder A's),
  `p312-question.test.ts`, `p311-question.test.ts`, `monitor.test.ts`, `reflow.test.ts`,
  `turn-boundary.test.ts`, `p141-witness.test.ts` and `p141-drop-edge.test.ts` stays green UNCHANGED. A row
  that has to change is a finding for the verifier, not an edit.

### 5.3 `build/p321/ablation.mjs`, `ablation:p321` (Builder B writes it, Builder C names it in `package.json`)

Over a `cp -Rc` clone of `src/`, one clause at a time from the SHIPPING source, the row that owns it red BY
NAME, every file restored and compared by sha256 in a `finally`, an unedited control green, every needle
matching exactly once. Arms, at least: each shape's options, focus (not opencode), hint, tail and header
clauses (about 24); the `detectShapes` term in `dialog`; the `shaped &&` in `outputIsWork` (antigravity's
exemption widened to "output never counts": his-words-under-the-repaint row red); `writesWhileAsking` removed
from the row; `!residentOnly` removed from `dialog` (grok his-words row red); `residentHelpers` removed from the
row; each clause of the recording rule (quiet, CPU, screen, the null guard); the pruning; the clear in
`noteAgentLeft`. `ablation:p312` must stay green unchanged.

### 5.4 Gates amended in the same commit (Builder C)

- `conformance:choices` keeps clauses 1 to 17 byte for byte and gains: `DIALOG_SHAPES` holds exactly the ids of
  `DialogShapeId`, each defined once; `detectShapes` has exactly one production call site, `state-machine.ts`,
  and its second argument there names `profile.dialogs`; `choiceUpdate` names neither `detectShapes` nor
  `DIALOG_SHAPES` (no shape's rows on the choice channel); and the verdict line keeps `detectDialog(` (clause 3
  still reads one call site). Comments blanked, as the gate already does.
- `conformance:agents` gains: none of `dialogs`, `writesWhileAsking`, `residentHelpers` appears in the
  overlay's hand-written type (`AgentOverlayV1`, `agent-overlay.ts:133`), and `REFUSED_ROW_FIELDS.activity`
  still stands; an overlay row carrying `activity: { dialogs: [...] }` is refused with the field named.
- CLAUDE.md `:282` stops saying the numbered verdict is the ONLY screen-derived route to `needs_input` and names
  the compiled shapes beside it; its path set gains the three `activity` fields in `registry.ts`. The probe
  table gains one line for `probe:p321`, naming `screen.ts`'s shapes, the three fields and `process.ts`'s
  tool-child rule as its triggers.
- `HELPER_USER_FLOOR` 150 → 151 (`build/assert-electron-teardown.mjs:300`); `build/verification-checks.mjs`
  classifies `probe:p321` and `ablation:p321`.
- Path-triggered runs for the files touched: `conformance:choices`, `conformance:handback`,
  `conformance:phonecopy` (`src/main/activity/**`: no log call may reach a capture), `conformance:agents`,
  `conformance:installs`, `conformance:resume:capture` (`registry.ts`), `gate:checks` (new tests),
  `gate:electron` and `gate:background` (the probe and its stand-ins). **`gate:contract` must not move**: no
  field of the activity profile crosses IPC (`contract-baseline.txt` carries none).

---

## 6. The builders

Three builders, disjoint files. **Builder C owns every shared file** (`package.json`, `CLAUDE.md`,
`build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`). Builder A owns the one `FIXTURE_FLOOR`
line in `p312-choices.test.ts` and nothing else in that file. `src/shared/` is not touched. `docs/BACKLOG.md` is
the main session's. No builder launches Electron, runs `npm run build`, `npm test` whole, a smoke, a probe or
package; commands stay under 90 s or are backgrounded into the phase's scratch directory and polled.

### 6.1 Builder A, the corpus

Owns `build/p321/corpus.mjs` (the pins in §2.1, `P321_CORPUS` only, refuses a moved file, loaders that hand
out bytes and never print them; Phase 319's uncommitted `corpus.mjs` is a reference, not a source to trust),
`build/p321/screens.mts` (`--make` and `--check`, §2.4, plus `--matrix`: per recording and per window, parent
verdict against HEAD verdict, which `--check` runs with no corpus), `build/fixtures/questions/**`, the nine
fixtures in §2.4, and `FIXTURE_FLOOR` 13 → 22. Reads `detectShapes` from Builder B's `screen.ts` at run time for
the HEAD column. Reports what was redacted, how many windows were dropped and why, and the labels' derivation.

### 6.2 Builder B, the detector

Owns `src/main/activity/screen.ts`, `src/main/activity/state-machine.ts`, `src/main/activity/process.ts`,
`src/main/agents/registry.ts`, `src/main/activity/__tests__/p321-shapes.test.ts`,
`src/main/activity/__tests__/p321-masking.test.ts` and `build/p321/ablation.mjs`. Builds §3 and §4 exactly,
names every departure with the measurement that forced it, and starts from the committed screens as Builder A
lands them (the fixture names in §2.4 are fixed by this document). Measures §5.1's cost.

### 6.3 Builder C, the gates and the app run

Owns `build/conformance-choices.mjs`, `build/conformance-agents.mjs`, `build/p321/probe-p321.mjs`,
`build/p321/stand-in.mjs`, `package.json`, `CLAUDE.md`, `build/verification-checks.mjs` and
`build/assert-electron-teardown.mjs`. Writes the gate clauses against the names this document fixes
(`detectShapes`, `DialogShapeId`, `DIALOG_SHAPES`, `dialogs`, `writesWhileAsking`, `residentHelpers`,
`toolChildPids`), each with an in-memory self-test arm that must go red.

`probe:p321`, in `probe:p314`'s shape: one Electron through `build/electron-run.mjs`, a scratch profile, a
scratch `HOME` and its own tmux socket, no Tortie window focused so the poll runs at 2 s (the cadence gated by
the rate measured over each arm's own span, as Phase 319's fix round built it), the APNs sender aimed at
Phase 314's local stand-in. Sessions are the REAL registry rows `cursor`, `qwen`, `opencode`, `antigravity`,
`claude` and `grok`, each launched through `stand-in.mjs` under the bare names (`cursor-agent`, `qwen`,
`opencode`, `agy`, `claude`, `grok`) on the scratch login shell's `PATH` (`.zprofile` and `.zshrc`, as
`probe:p314` sets it). **Before any arm, the probe asserts each bare name resolves to the stand-in inside the
scratch login shell, and reads UNREADABLE and exits 2 if any resolves elsewhere**, because every one of them is
installed on this Mac. The stand-in answers every argv the row sends (cursor's `create-chat` pre-assignment,
`registry.ts:607`, among them), reads the pane size and reads UNREADABLE below the committed screen's width,
and draws the committed redacted screens only: the agent's idle screen, its question screen, and for
antigravity a redraw every 2.0 s; for grok a detached helper at launch and a detached tool mid-turn, both ended
by pid in the `finally`. Arms, each at the parent build and at HEAD: (a) each question: amber, the tray, ⌘J and
one push at HEAD, none at the parent for the shapes; (b) grok after its turn: `idle` at HEAD, `running` at the
parent; (c) his own typing of each shape's rows into each session's input row, the stand-in echoing it above
its footer: no amber at either; (d) a pi row and a shell row: identical at both; (e) the ceiling: six blocked,
then a seventh shape question: no push at either (a control, §1.3 item 4). Electrons counted once, at the end.

### 6.4 The integrator

Reconciles the three, runs typecheck, the p321 and every §5.2 existing test file, every §5.4 gate, and
backgrounds `ablation:p312` and `ablation:p321` into the scratch directory and polls. Writes §10 of this file
("as built"). Does not launch Electron.

---

## 7. What each part costs, stated before it is measured

| Part | Captures | `ps` | Other |
| --- | --- | --- | --- |
| The shapes | Unchanged, except that a newly caught question is `needs_input` and is captured every tick while it waits, as every question is | Unchanged | µs per capture (§5.1), under `MAX_CAPTURES_PER_TICK` captures a tick |
| antigravity | Unchanged outside a drawn question | Unchanged | None |
| grok | Lower: none once rested and out of the window | Lower: one fewer reason for a table every tick | A9 holds for a resting grok |
| The ceiling | Six slots, shared with newly caught questions (§1.3 item 4) | | |

---

## 8. Tier and independent methods

**Tier 3**: status semantics for six registry rows, a claim across every screen-tier agent it names, and he
asked for it, so the parent measurement is mandatory. **Independent methods, named before the work starts**:
(1) **run over real data**, with a replay harness the verifier writes itself (not research 129's and not any
builder's); (2) **attack**, first arms his own words spelling each shape typed and pasted into each real agent's
input box, and cursor's answered trust box; (3) **re-derive independently**: the verifier labels the corpus from
the byte timeline and the key events by its own method, then computes the recall and false-positive table
itself; (4) **measure the parent commit**, every row at `ecb6997a` and at HEAD in the same run. A fix round if
any verdict is needs_work, and an independent reverify of that fix, once.

---

## 9. The proof, run rather than read

### 9.1 Gates

`npm run typecheck && npm run build && npm run smoke:t1`, the full battery (test, smoke, smoke:t3, package),
§5.4's path-triggered gates, `ablation:p312` green unchanged, `ablation:p321` every arm red on its owner and the
control green, `gate:contract` unmoved.

### 9.2 The detector matrix over every committed window, parent and HEAD

Per agent and per window: parent verdict and HEAD verdict. Required: every raisable `question` window of cursor,
qwen, opencode, Claude Code 2.1.280 and antigravity reads `true` at HEAD; **0 windows the parent reads `false`
and the labels call `not-question` read `true` at HEAD**; every parent false positive listed by window (gemini's
answered gate); for gemini, codex, pi, omp and grok HEAD equals the parent on every window. Every shape over
every other agent's windows, hits reported. Every rate with its denominator.

### 9.3 The labels, re-derived

The verifier's own labels, derived from the byte timeline and the key events before reading `labels.json`;
every disagreement read by eye and ruled in the report.

### 9.4 The replay matrix over real recordings, parent against HEAD

The verifier's harness replays every banked recording into scratch panes on its own socket (never `-L gmux`),
each agent's recorded process table remapped onto the replay pane (B's run has none and says so), recorded keys
fed to `noteUserInput` as the app does for his typing, through the BUILT monitor, at 1 s and 2 s over at least
10 tick phases. Per question: reached `needs_input` or not, and when. Per agent: false ambers, `running`
transitions, turn boundaries, captures and `ps` per tick. Required: every question the parent raises, HEAD
raises no later than the parent's median plus one tick; every raisable shape question raised at HEAD at each
cadence where it is raisable; antigravity's three raised at 1 s (parent: 0 of 30 for its two permissions);
grok `idle` in its two silent stretches (parent: `working` on every tick); **0 false ambers at HEAD beyond the
parent's**; every turn boundary that differs attributed to its cause (grok's are expected to be NEW at real turn
ends, and each must be one; none may be a real turn lost). Claude's row replays with an empty scratch registry,
so its screen is read for the whole recording, which is a harsher test than the product's launch window; the
gate answered with and without `noteUserInput` measures §1.3 item 3. "Not measurable" rows for gemini's turns,
droid and a grok question.

### 9.5 The attack, parent and HEAD

- **His own words.** Each shape's rows typed key by key and pasted in one burst into each agent's input box,
  no Enter: live where the agent may be launched (§9.7), and as recorded idle screens with the rows composed
  into the input box for every agent. Neither cadence may raise amber at HEAD where the parent does not; for
  antigravity under its repaint and grok with residents, the numbered verdict's reading must equal the parent's
  tick for tick. A shape that causes a new amber is dropped whole.
- **An agent printing the shapes**: each agent's recorded screens with the shape rows composed into its answer
  area, working and idle, and cursor's answered trust box for the rest of its session, a question answered and
  redrawn as history, a shape drawn above 40 rows of later output.
- **grok at its worst**: a tool started before its first rest (reads idle while it lasts, stated); a tool born
  after (`working`); a detached tool that outlives a later turn (`working`, as today); a `sleep 25` detached tool
  run under every agent (`working`, the case `process.ts:17-20` exists for); a Tortie restart under a resting
  grok with a background tool (stated edge); leave and return clears the set.
- **The unanchored twins**: every one-clause-off twin in §5.1 at both cadences in the replay.
- **Cost on a real 30-session load** (research 129's shape: settled, footer repainters, a 2 s repainter,
  blocked, working, scrolled back, from recorded bytes, with antigravity and grok sessions in it): `list-panes`
  (exactly 1 a tick), `ps`, captures, the monitor's CPU and the tmux server's CPU, parent then HEAD. HEAD equal
  or lower everywhere except the newly caught questions' own captures while they wait; with every session
  settled, one `list-panes` and nothing else (A9).

### 9.6 The limits, measured and named

- **After a minute of silence**: each shape's question collapsed into one write after 90 s of silence, 200 cells
  at 2 s and 200 at 1 s, at HEAD, against a numbered question (gemini's gate) the same way at the parent: the
  two rates must agree within the cell noise (about 145 of 200 at 2 s, 200 of 200 at 1 s, research 129 §6.2).
- **The ceiling of six**: 0, 5, 6 and 8 sessions blocked, then a shape question; 5 numbered-blocked plus one
  shape-blocked, then a numbered question (the trade in §1.3 item 4); both cadences, parent and HEAD, amber
  counts per cell.

### 9.7 One live confirmation on the installed agents

**Fix round:** cursor-agent installs on launch too (§1.2 item 6), so a live cursor launch passes its hidden
`--disable-auto-update`, sets `AGENT_CLI_UPDATE_CHECK_URL` to a closed loopback port, and records the install's
resolved path, sha256 and mtimes before and after; a change is reported at once as an install.

On a scratch socket (`-L p321v-*`), scratch folders deleted afterwards, every agent process ended by pid in a
`finally`, parent and HEAD monitors watching the same panes at once. **Launched only**: cursor-agent, Claude
Code (`env -i`, `DISABLE_AUTOUPDATER=1`, `TMUX` unset, as §4.5) and opencode (its updater switched off by a
switch read from the installed binary, or not launched). **Never**: gemini, qwen, droid, and agy and grok unless
§1.2 item 6's condition is met. Before and after, each binary's resolved path, version and mtime are recorded;
any change is reported at once as an install. At most 3 real turns: cursor's run permission and opencode's
permission, refused (`n`, Reject). Trust gates cost no turn: cursor's is answered `a` (its trust answer for a
deleted folder is left, stated), Claude Code's is refused with Esc. **While each question is up the pane is
resized through 80×24, 100×30, 120×40 and 160×45** and captured at each, so the shapes are measured at Tortie's
widths at no extra turn; a width at which the agent draws the question whole and a shape reads `false` is a
finding. His own words typed into each launched agent's input box, no Enter. Transition for transition, HEAD
matches the parent except where the parent missed.

### 9.8 `probe:p321`, the app run (§6.3), at a built parent and at HEAD, under the Electron lock.

### 9.9 What cannot be proven here

What grok asks and how it draws it. gemini's next gate. droid. qwen live, and qwen at any width but 160.
antigravity 1.2.8 and grok 1.0.41 live, unless their updaters can be switched off. How each shape fares on the
next release of its agent, which is why every shape names the version it was measured on. How often the
ceiling's trade happens in his use.

---

## 10. What is NOT in this phase

- **No change to the numbered verdict** or to what resets it, for any agent. `detectDialog` stays
  `detectDialogRows(...).atChoice`, and Phase 312's floor stays green unchanged.
- **No shape for gemini, codex, pi, omp, droid, grok, deepseek, muse, a shell, a configured agent or an unknown
  agent.** Widening the floor for every agent is its own entry, with a negative corpus across agents.
- **No shape, helper rule or write-while-asking from configuration**, and no new door, setting or file that
  could carry one (refusal 5).
- **No `animatesWhenIdle` change for antigravity**; its "running" at rest is its own entry (§1.3 item 2).
- **No grok question**, and no unmasking of the numbered verdict behind grok's helpers. No grok title oracle and
  no grok hooks (`registry.ts:1486-1496` keeps both deferred).
- **No list of process names anywhere.** Residents are whatever was there at the first rest.
- **No change to the ceiling of six, `QUIET_MS`, `AMBIGUOUS_WINDOW_MS`, `MAX_CAPTURES_PER_TICK`,
  `REFLOW_GRACE_MS`, `DIALOG_CONFIRM_TICKS`, `DIALOG_CLEAR_TICKS`, `CPU_BUSY_PERCENT`, `CPU_BUSY_TICKS` or either
  cadence**, and nothing from Phase 319.
- **No choice rows, no screen question and no excerpt change for the shapes**: they raise `needs_input` with
  `{ atChoice: false }`; `marker` stays digits only.
- **No fix for his own words read as a question** (research 129 §9 item 6), and the attack proves this phase did
  not widen it.
- **No fix for gemini's late trust gate, no amber while scrolled back, no App Nap work, nothing for remote
  sessions, nothing for Claude Code's permission prompts or Codex.**
- **No live gemini, qwen, droid, agy or grok** (§9.7), no read or delete of any agent's conversation store.
- **No committed raw recording, prompt, answer, account, path or MCP name.**
- **No status, no status word, no copy, no surface and no menu.** The native menus are untouched.
- **No release.** Phases 311 onward accumulate unreleased until the phone works end to end.

---

## 11. What the spec step ran, so nobody re-derives it

All reads were of this worktree, of Phase 319's parked worktree (read only) and of the corpus; the one file
written in the tree is this one. Scripts lived in the spec step's scratch directory and are not committed.

| What | Result |
| --- | --- |
| `git diff --stat 5ddbee19 ecb6997a -- src/ build/ package.json CLAUDE.md` | 21 files, none under `src/main/activity/` or `src/main/agents/`; exit 0 |
| sha256 of every corpus file | all 37 in §2.1 (33 match Phase 319's pins; `panes`, `status`, `launches`, `choice` recorded here first); exit 0 |
| Labeller over every capture stream and key event (§2.3) | 7,591 captures: 657 question, 47 answering, 6,887 not-question; 1,410 distinct screens, 1,219 distinct 24-row windows |
| The six reference shapes over every capture, every committed fixture, and the twins (§3.2) | the table in §3.2; the twins refused by every full shape |
| The grok census over a/rec's process table (§4.4) and the write rates of all three grok recordings | as stated |
| One Claude Code launch to its gate, no answer (§4.5), ended by TERM in a `finally` | no registry file in 10 s; the process gone; nothing left in the registry; exit 0. A first attempt addressed the pane with a target this tmux does not accept, found no pane id, and its `finally` ended the socket, which ended that Claude by the hang-up; a process check afterwards found no Claude younger than two minutes |
| `--version` of cursor-agent, qwen, opencode, agy, claude and grok under his home | 2026.09.18-9a7762b, 0.22.0, 1.18.32, 1.2.8, 2.1.280, 1.0.41. **`qwen --version` was run outside a scratch HOME, against the rule**; no qwen or npm process remained and no file in qwen's install was newer than ten minutes afterwards. No install's mtime moved (agy and grok still read 2026-09-22 18:23:57 and 18:24:02) |
| `stat` of each install against the recording clock | the evidence in §1.2 item 6 |

## 12. As built

The integrator's record, 2026-09-23. Nothing here is a verdict: the verifiers re-derive all of it (§8, §9).

### 12.1 The parent, and what moved under it

The worktree's HEAD is `ecb6997a`. origin/main moved to `ee6f033a` during the build; the one commit between
them touches `docs/BACKLOG.md` alone (2 lines, the phase's "started" line), so every source file this phase
reads or edits is byte-identical at both. **The parent for every measurement is `ecb6997a`**; the committer
re-points to origin/main's tip and says so.

### 12.2 Who owns what, reconciled

Each file has one owner and no file was edited by two builders. The integrator edited two: the comment above
`FIXTURE_FLOOR` in `p312-choices.test.ts` (it still said "thirteen"; no row changed, 73 of 73 green after), and
this section.

| Owner | Files |
| --- | --- |
| A, the corpus | `build/p321/corpus.mjs`, `build/p321/screens.mts`, `build/fixtures/questions/` (labels.json and 18 window files, 1,238 windows, 2.6 MB), the nine fixtures of §2.4, `FIXTURE_FLOOR` 13 to 22 |
| B, the detector | `src/main/activity/screen.ts`, `state-machine.ts`, `process.ts`, `src/main/agents/registry.ts`, `p321-shapes.test.ts` (112 rows), `p321-masking.test.ts` (40 rows), `build/p321/ablation.mjs` |
| C, the gates and the app run | `build/conformance-choices.mjs` (clauses 18 to 22), `build/conformance-agents.mjs` (section 10), `build/p321/stand-in.mjs`, `build/p321/probe-p321.mjs`, `package.json` (`probe:p321`, `ablation:p321`), `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 150 to 151), `CLAUDE.md` |

The seams, read from both sides: A's `--check` pins each window's parent and HEAD verdict as computed through
B's shipping `detectShapes` and registry, and passes over B's final bytes; C's clauses 18 to 22 read B's
spellings (`DIALOG_SHAPES`, `DialogShapeId`, `detectShapes(screen, profile.dialogs ?? NO_SHAPES)`,
`const numbered = screen !== null && detectDialog(screen)`) and pass; C's stand-in draws A's committed windows
and fixtures and nothing else; B's tests read A's windows and fixtures; `ablation:p321` is B's script under
C's `package.json` name, classified pure. `src/shared/` is untouched (`git diff --stat ecb6997a -- src/shared`
is empty) and `gate:contract` is byte for byte.

### 12.3 Departures from §3 and §4, each with what forced it (the builders' measurements)

1. **`cursor-run-permission`'s header reach is 6, not 3** (B). cursor moves its `→` with the arrow keys and a
   focus on the fourth option sits five rows under the header; every recording has the focus on the first
   option, so the corpus reads the same at 3 and at 6.
2. **An option row is never the hint row, except where `span` is 0** (B). Without it cursor's reject row,
   which carries the hint, always satisfied the option clause, so that clause could never fail. opencode's
   buttons share the hint row (`span: 0`).
3. **antigravity's option is a numbered row or a `Yes…`/`No…` row** (B), not any inked row: its
   `Run this command?` sits directly above its first option and would stand in for the options.
4. **cursor's trust gate** pins its hint to the start of cursor's own row and its focus and option to its two
   literal rows (B). **opencode** splits into a hint (`\benter confirm\b`) and an option (the button run on the
   same row) so each can be ablated alone (B).
5. **`noteResidents` takes an explicit `captured` flag** (B): §4.2 left "a capture was read" implicit. It has
   its own ablation arm (M4).
6. **`answering` is 0 captures, not 47** (A). §2.4's own definition, "from the key to the first frame without
   the question's live marks", gives 0 for all 17 instances, because the first capture after every key has
   already lost its live marks. The spec step's 47 came from a 2 s window after each key, which contradicts
   §1.2 item 3 (gemini's answered gate at +40.42 and +41.48 counted as parent false positives). **Integrator's
   ruling: 0 stands**, with §1.2 item 3; B measured 0 shape hits in the 2 s after any answering key over the
   raw corpus, so the choice moves no shape number, only whether gemini's two answered-gate windows are counted
   as the parent's false positives (they are, and listed: `a-gemini-0004`, `a-gemini-0005`). Labels: 657
   question, 0 answering, 6,934 not-question, of 7,591.
7. **Each window line carries `verdicts: { parent, head }`** (A), so `--check` proves the redaction moved no
   verdict without the corpus. **Integrator: kept.**
8. **More disclosure classes than §2.2 named** (A): omp's MCP server names and a plugin config path, pi's
   installed skills, Claude Code's plan and weekly usage with its reset time and timezone, codex's usage-limit
   resets, and footer model names. All shaped; the address and the plan beside it are blanked to width so the
   window's geometry holds. The account name and home for the scan come from the passwd entry, so the scan
   holds under a scratch `HOME`.
9. **`conformance:choices` clause 22, the closed set is exactly the six measured ids** (C, beyond §5.4).
   **Integrator: kept.** Clause 18 alone admits a seventh id declared in both places; 22 makes adding a shape
   a deliberate gate edit, which is what "every shape names the version it was measured on" asks.
10. **CLAUDE.md's `conformance:agents` row** gains its Phase 321 clause and `shared/agent-overlay.ts` in its
    path set, and "spawns nothing" became "spawns only the pinned tsx" (C). **Integrator: checked and kept**:
    the gate already spawned the pinned tsx at the parent (`build/conformance-agents.mjs:132` at `ecb6997a`).
11. **The probe types each question's last 24 inked rows**, not the whole fixture (C): the nine fixtures are up
    to 45 rows and do not fit an input box. It sends a trailing `;` as `-H 3b`, because tmux drops a semicolon
    that ends a `send-keys` argument. It reads "the tray" as the door's blocked rows, the feed the menu-bar item
    is rebuilt from. It launches a pi row as the control §6.3 names.
12. **"(c) no amber at either" cannot hold for every cell** (C): typing `antigravity-run-permission`'s rows into
    any input box makes the PARENT's numbered verdict read a question (6 of 42 compositions, all of them that
    screen). That is the existing fault (research 129 §9 item 6); the probe reports those 6 cells and grades the
    other 36. The verifier should also hold all 42 to "no amber at HEAD that the parent did not raise", which is
    the entry's own rule.

### 12.4 The numbers each builder measured (theirs, stated)

- **The shapes over the raw corpus** (B, all 7,591 captures): cursor-trust-gate 54 of 54, cursor-run-permission
  212 of 212, qwen-confirmation 81 of 81, opencode-permission 75 of 75, claude-trust-gate 31 of 31,
  antigravity-arrow-list 107 of 107; 0 not-question captures and 0 captures in the 2 s after an answering key
  read true, for any agent under any shape. Of the 13 older fixtures the shapes read only
  `antigravity-signin-choice.txt`, a real question the numbered verdict misses (its hint is not in `HINT`).
- **Over the committed windows** (A's `--matrix`, B's test): every question window of the five shape agents
  reads true at HEAD (antigravity 3, claude 1, cursor 7, opencode 1, qwen 4), 14 of them HEAD-only; no
  not-question window the parent reads false reads true at HEAD; no window reads true at the parent and false
  at HEAD; every agent without a shape equals the parent; each shape over every other agent's windows hits 0.
  cursor's answered box is 2 distinct windows standing for 25 captures inside the window, both false.
- **The redaction** (A): 1,238 windows committed (24 question, 1,214 not-question, 17 of them empty
  `rows: []`), 1 pair merged after redaction (a/grok), 1 dropped by the verdict check (adv2 pi at 160x40,
  where shaping pi's answer removes the phrase the parent's false positive reads), 0 by the disclosure scan.
  Slots: 1,044 path, 57 home, 20 address, 158 skill, 764 MCP; 8,839 rows kept as UI text, 5,850 shaped,
  3,021 in-row parts shaped. 30 skill and 11 MCP names read at run time and never written.
- **Cost, 20,000 calls, parent against HEAD** (B's run; the integrator's run of the same row in brackets):
  cursor permission 5.3 to 9.7 µs (5.66 to 12.09), qwen permission 5.6 to 9.6 (5.73 to 9.71), cursor at rest
  2.8 to 5.2 (2.88 to 5.05), antigravity at rest 13.9 to 25.8 (12.85 to 24.46), gemini with no shapes 9.3 to
  9.3 (9.04 to 9.01).
- **`ablation:p321`** (B): 48 of 48 arms red on their owning row by name, 310.9 s, control green before and
  after, clone restored by sha256 and removed, worktree never written. **`ablation:p312`** (B and C, each in a
  clone): 23 of 23.

### 12.5 What the integrator ran, on the final bytes

No Electron, no build, no whole `npm test`, no smoke, no probe, no package, no agent, no model turn.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run -s typecheck` | 0 | 2.1 s (incremental); import boundaries 0 violations, 0 runtime cycles, shared types OK |
| `npx vitest run --no-cache src/main/activity src/main/agents src/shared` | 0 | 43 files, 880 passed, 1 skipped (the corpus row), 12.4 s |
| the same skipped row with `P321_CORPUS` set (`p321-shapes.test.ts`) | 0 | 112 of 112 |
| `p312-choices.test.ts` after the comment edit | 0 | 73 of 73 |
| `npm run -s conformance:choices` | 0 | 25 clauses, 19 self-tests red as they must be, 1.7 s |
| `npm run -s conformance:agents` | 0 | section 10: 10.1 to 10.4 yes, self-tests 5, 2, 3, 3 red; 8 rows through the shipping loader, 1.2 s |
| `npm run -s conformance:installs` | 0 | 15 rows, 0.3 s |
| `npm run -s conformance:push` | 0 | 23 rules, 2,165 checks, 5.9 s |
| `npm run -s conformance:handback` | 0 | 0.6 s |
| `npm run -s conformance:phonecopy` | 0 | 0.7 s |
| `npm run -s gate:checks` | 0 | 134 electron among the classified |
| `npm run -s gate:electron` | 0 | 151 against a floor of 151 |
| `npm run -s gate:background` | 0 | 3 starters, each ended in a `finally`; 19 of 19 fixtures |
| `npm run -s gate:knownhosts` | 0 | |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `screens.mts --check` | 0 | 1,238 windows, 9 fixtures, verdicts as pinned, 0.35 s |
| `screens.mts --make`, twice, output hashed before and after | 0 | 41 files byte-identical across runs; the report's counts equal A's |
| sha256 of the 37 corpus files against §2.1 | 0 | 37 of 37 match; `corpus.mjs` pins the same 37 |
| `ablation:p312` in a `cp -Rc` clone | 0 | 23 of 23, 53.9 s, restored by sha256; clone removed |
| `ablation:p321` | see §12.7 | |
| control-byte scan of every touched file, two methods (a regex that fires on a planted ESC, and a byte walk) | | 0 of 91 files |

### 12.6 What the integrator did that no builder did (independent, and what it found)

1. **A differential against the SHIPPED parent source**, not a literal copy of it: `git archive ecb6997a` of
   `src/main/activity`, `src/main/agents` and `redact.ts` into scratch, both builds' `inferredVerdict` and
   `commitVerdict` driven with the same random ticks (1 s and 2 s, output, CPU, detached children appearing and
   vanishing, captures missing) over the committed windows, for all 15 registry rows, `shell` and an unknown id,
   28,800 ticks each. Every agent without a new field: **0 differing verdicts or states** (codex, gemini, droid,
   deepseek, muse, pi, omp, cursoride, copilotide, shell, unknown). **The floor: 0 ticks on any agent where the
   parent reads `needs_input` and HEAD does not.** Over not-question windows and his-words compositions only,
   12,000 ticks per agent: HEAD's `needs_input` ticks equal the parent's exactly for every agent, antigravity
   under a repaint and grok with residents included. grok: `needs_input` 444 at both, `idle` 598 at HEAD against
   400. `detectDialog` over every committed window: 0 differences.
2. **The disclosure scan by another method**: every surviving non-`x` word in the committed windows, labels and
   the nine fixtures listed and read by eye (2,086 distinct, agent UI, versions, times and ids only); 46 skill
   and MCP names read from his agents' own configuration directories (names never printed) checked against every
   new file: 0 hits; the process-table command names intersected with the committed vocabulary: generic words
   only; `/Users/`, `/private/tmp`, his account name, his company and address shapes, uuids: none in any new file
   or added line except the APNs test topic `software.itavero.tortie.p321`, which follows `probe:p314`'s own.
3. **The overlay attacked directly**: six rows carrying `activity.dialogs`, `activity.residentHelpers`, a
   top-level `dialogs`, and a configured agent carrying all three through the shipping `parseAgentOverlay`:
   every one dropped whole with the field named; `activityProfileFor` still answers the compiled rows alone.
4. **His words composed at every depth** (the tail clause attacked): each question's rows cut at its hint and
   composed into every not-question window of each shape agent with 0 to 3 of that window's bottom rows below.
   At 2 or more rows below nothing reads except three cursor compositions, and reading them found the concern in
   §12.8 item 1.

### 12.7 `ablation:p321` on the final bytes

`npm run -s ablation:p321`, exit 0, 312.0 s: **48 of 48 arms turned the row that owns them red by name** (S1
to S25 the six shapes' clauses, D1 the empty-list guard, M1 to M14 the dialog line, antigravity's exemption and
the resident rule clause by clause, P1 `toolChildPids`, R1 to R7 each registry row's field); the unedited control
green before and after (152 rows), every clone file restored and proved by sha256, the worktree never written,
the clone removed. It reads a clone of `src/` taken at its start; the integrator's one edit during the run was
the `p312-choices.test.ts` comment, which the harness neither edits nor watches.

### 12.8 Open concerns for the verifiers

1. **cursor's "tell the agent what to do instead" input sits on the LAST row with nothing below it**
   (`b-cursor-0021`: after a permission is skipped, `→ Tell the agent what to do instead (Enter to send, empty to
   skip, Esc to cancel)` is the bottom row). Composed offline, a paste of cursor's trust-box rows that starts on a
   new line inside that input (`▶ [a] Trust this workspace` / `[q] Quit` / `Use arrow keys to navigate, Enter to
   select…` below the `→` row) reads `cursor-trust-gate` TRUE at HEAD and false at the parent, because the tail
   clause is met by construction there. Unmeasured: whether cursor draws a multi-line paste in that input that way
   at all (Enter sends in it). This is exactly the §9.5 his-words arm; it needs cursor live (cursor may be
   launched, §9.7) or it stands as a stated limit. If it reproduces, the entry's rule is that the shape is dropped
   whole unless a tightening (for example, requiring the hint row to sit inside cursor's box, `│…│` in the raw
   row, which a typed row does not) is re-measured over the whole corpus and re-ablated. The same question stands
   for any agent state not recorded here that puts an input on the last row: antigravity's `tab Amend`, qwen's
   `suggest changes`, opencode after Reject.
2. **The committed corpus is thin on questions after dedupe**: 1 to 7 question windows per agent, so the in-tree
   recall rows have small denominators. The capture-level numbers exist only over the raw corpus; the verifier's
   replay is where they are re-derived.
3. **`P321_CORPUS` is still in `/private/tmp`** (research 129's scratch). §2.1 says the main session moves it
   before anything else; it has not moved. A reboot loses the replay's input.
4. **`conformance:resume:capture` was not run** by anyone: it runs `npm run build` and starts Electron, which
   builders and the integrator may not. It is path-triggered by `registry.ts`.
5. **`probe:p321` has never run**: its duration, the real pane sizes and the measured cadence are unknown, and
   CLAUDE.md's row says "not yet measured" on purpose. It needs `npm run build` first (its script, like
   `probe:p314`'s, does not build).
6. **A pre-existing cost, not this phase's** (B): `normalizeCapture`'s `\s+$` is quadratic on a row whose last
   column is ink (grok's and qwen's `█` scrollbar), 277.6 µs a call on grok's resting window against 18.7 µs for
   `detectDialog`, paid by the state machine and `choiceUpdate`. Its own entry.
7. **A shape re-raises after his key releases it** if still drawn two captures later, as a numbered dialog does
   today (for example cursor's focus moved by the arrow keys). The corpus shows 0 shape hits after an answering key.
8. **`screens.mts --check` is in no gate.** It is the only thing that re-runs the disclosure scan over the
   committed windows; it reads the passwd entry, which `gate:checks` forbids a TEST to do, so wiring it into the
   battery is a decision, not an oversight.
9. **b/grok's start screen draws a telemetry opt-in** (`Opt out` / `Opt in` above a live input box). It blocks
   nothing; labelled not-question as §2.3 has it.
10. **Stated edges that stand** (§1.3): the ⌘J excerpt for a shape question is the screen's last line;
    antigravity reads `running` at rest; Claude's gate answered outside Tortie's keyboard holds amber until its
    first turn; the ceiling of six trades victims; grok's two resident edges.

### 12.9 The fix round (2026-09-23)

The fixer's record. Both verifiers answered needs_work. The rule the round ran under: **a shape or clause that adds
any false amber or loses any catch is REMOVED, not repaired.** The fix runs once; a second needs_work goes to the
operator. Nothing here is a verdict: the reverify re-derives it by its own method.

#### 12.9.1 Every finding, and what was done

| Verdict | Finding | Severity | Done |
| --- | --- | --- | --- |
| attack | cursor's two shapes read his paste of cursor's own rows into the input cursor draws on the LAST row after a skipped permission (trust rows live on cursor-agent 2026.09.18; permission rows on the live layout) | major | **Removed**: `cursor-trust-gate` and `cursor-run-permission`, whole |
| attack | the tail-1 shapes read a shell, pager or editor in the session showing their rows (cursor 8, opencode 7, antigravity 24 of the verifier's hostile screens, 10/10 at both cadences) | major | **Removed**: `opencode-permission` and `antigravity-arrow-list` too. The two kept shapes have a tail of 0 and refused all 39 |
| attack | `antigravity-arrow-list` reads the pickers agy draws with the same component as its sign-in choice | major (plausible) | Removed with the shape above; `writesWhileAsking`, whose only use was that shape, removed from the type, the row and `inferredVerdict` |
| matrix | grok's residents recorded in the launch window, before grok's first byte, as the one short-lived child there; the set emptied and grok read working for life in 9 of 28 cells | minor | **Fixed**: `noteResidents` records only once the pane's output stamp has moved past the one the rule first saw in this life (`SessionState.residentBase`, cleared in `noteAgentLeft`). Re-measured: 28 of 28 cells rest (§12.9.4) |
| attack | grok's stated edge: a detached tool still alive at the first rest reads idle while it lasts, where the parent reads working | minor | **Not fixed; his ruling** (§12.9.5). Narrowed: a Tortie restart under a resting grok now records nothing until grok draws again |
| matrix | probe arm (e) freed the slot 60 s after the draw, which is the probe window, so it graded a case where the trade cannot happen | major | **Fixed**: arm (e) rewritten in three parts (§12.9.2); §1.3 item 4 restated with the window |
| matrix | capture displacement: every newly caught question takes a capture slot every tick, so quiet sessions flash running and a numbered question is confirmed later, below the ceiling | major | **Not a fix-round change** (it is the capture policy and the ceiling); stated as §1.3 item 6 and re-measured after the removal (§12.9.4); **his ruling** (§12.9.5) |
| attack | cursor-agent installed an update during research 129's run; §1.2 item 6 said it did not | minor | **Fixed**: §1.2 item 6 corrected, §9.7 requires `--disable-auto-update`, a closed loopback `AGENT_CLI_UPDATE_CHECK_URL`, and the install hashed before and after |
| attack | an overlay row patching a compiled id keeps that id's compiled shapes and helper rule | nit | **Fixed**: one sentence on `dialogs` in `AgentActivityProfile` |
| matrix | the entry's "0 of 30" for antigravity at 1 s; §2.3's capture clock; `labels.json`'s per-stream clocks | nit | §2.3 states both clocks. `labels.json` is left as generated (its times are the recorder's, and `--make` would overwrite a hand note). The BACKLOG number is the main session's (§12.9.7) |

**Which agents lose their shape: cursor, opencode and antigravity.** Their questions are missed again exactly as at
the parent (antigravity's two numbered permissions stay the numbered verdict's, masked by its repaint as before).
**What is kept:** `qwen-confirmation` (qwen 0.22.0, Ask mode), `claude-trust-gate` (Claude Code 2.1.280, launch
window) and grok's `residentHelpers`.

#### 12.9.2 What changed, file by file

- `src/main/activity/screen.ts`: `DialogShapeId` is the two kept ids; `DIALOG_SHAPES` holds two entries;
  `DialogShape` loses `header` and the nullable focus, and `shapeOn` loses the header walk and the options-on-the-hint
  path, which no kept shape used. No numbered-verdict line moved; no `ablation:p312` needle is repeated.
- `src/main/activity/state-machine.ts`: the output term is `outputEvidence` again for every agent (the `outputIsWork`
  exemption is gone); `residentBase` added to `SessionState`, `freshState` and `noteAgentLeft`; `noteResidents`
  takes the pane and refuses to record while `pane.activityAt <= st.residentBase`. The dialog line is unchanged.
- `src/main/agents/registry.ts`: `writesWhileAsking` removed; the cursor, antigravity and opencode rows are the
  parent's literals again, each with a comment saying why it has no shape; the overlay-patch sentence; grok's comment
  names the launch-window clause and the edge.
- `src/main/activity/__tests__/p321-shapes.test.ts` (64 rows): the two shapes over their windows, twins, and the
  cross-agent pins; new rows for the kept shapes' rows printed by a shell prompt, `less`, `vim` and `man` (15), for
  the removed agents reading the parent's verdict over every window of theirs, and for their question fixtures read
  by no shape.
- `src/main/activity/__tests__/p321-masking.test.ts` (34 rows): antigravity's section removed, so antigravity,
  cursor and opencode are among the rows held to the literal parent rule tick for tick (under the 2.0 s repaint and
  with his numbered words in the input box among the inputs); grok gains a launch-child scenario, a relaunch inside
  the probe window with a launch child, and a launch-window row in the clause-by-clause section.
- `build/p321/ablation.mjs`: 29 arms (was 48): S1 to S8 the two shapes' hint, tail, focus and option; D1; M1, M3 to
  M14; **M15** the launch-window clause, **M16** its clear in `noteAgentLeft`, **M17** the base read once per life;
  P1; R2 to R4. The antigravity arms (M2, R1, R7) and the removed shapes' arms went with their clauses.
- `build/conformance-choices.mjs`: clause 22's closed set is the two kept ids; clause 20's sentence; self-test
  sample ids. 25 clauses and 19 self-tests as before.
- `build/conformance-agents.mjs`: section 10 names two fields and still refuses the name `writesWhileAsking`, so it
  cannot return as configuration; its driven rows patch cursor with a compiled shape and claude with an empty list.
- `build/p321/screens.mts`: the four removed-shape fixtures are pinned `head: false`. `--make` then regenerated
  `build/fixtures/questions/`: five window files and `labels.json` moved, and **only their HEAD verdict pins moved**
  (9 question windows, cursor 7, opencode 1, antigravity's trust gate 1, and 4 fixture pins, true to false); every
  row, id, label and parent pin is byte for byte the build's, and no fixture `.txt` moved.
- `build/p321/probe-p321.mjs`: arm (a) grades the four removed-shape questions as never amber and no push at either
  build; arm (c)'s answered box is expected unraised at both; **arm (e) in three parts**: (e1) a qwen confirmation
  drawn under six numbered blocks, not raised in 20 s at either; (e2) one slot freed about 21 s after the draw,
  INSIDE the window: at HEAD the qwen question takes it and a numbered question drawn after is not raised, at the
  parent the reverse; (e3) back to six, a qwen confirmation drawn and left 75 s, past the window, then a slot freed:
  not raised at either build, and a numbered question drawn after takes the slot at both. The window is read from
  the launched checkout's `AMBIGUOUS_WINDOW_MS`, and a freeing that lands on the wrong side of it reads UNREADABLE.
- `build/p321/stand-in.mjs`, `build/verification-checks.mjs`, `CLAUDE.md`: comments and the three rows.
- Not changed in this round: `process.ts`, the nine fixtures, `p312-choices.test.ts`, `package.json`,
  `HELPER_USER_FLOOR` (151), `corpus.mjs`.

#### 12.9.3 The commands, on the final bytes

No Electron, no build, no whole `npm test`, no smoke, no probe, no package, no agent, no model turn, nothing
installed, never `-L gmux`.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run -s typecheck` | 0 | 0 import violations, 0 runtime cycles, shared types OK |
| `vitest run src/main/activity src/main/agents src/shared` with `P321_CORPUS` | 0 | 43 files, 827 passed; without it 826 passed, 1 skipped (the corpus row) |
| the two p321 files alone | 0 | 98 rows (64 and 34) |
| `conformance:choices` | 0 | 25 clauses; 19 self-tests red as they must |
| `conformance:agents` | 0 | 10.1 to 10.4 yes; self-tests 5, 2, 3, 3 red; 8 rows through the shipping loader |
| `conformance:installs`, `:handback`, `:phonecopy` | 0 | |
| `conformance:push` | 0 | 23 rules, 2,165 checks, 5.9 s |
| `gate:checks`, `gate:background`, `gate:knownhosts` | 0 | background: 3 starters, 19 of 19 fixtures |
| `gate:electron` | 0 | 151 against a floor of 151 |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `screens.mts --make`, twice | 0 | 41 files byte-identical across the two runs; against the build, the pins above only |
| `screens.mts --check` | 0 | 1,238 windows, 18 files, 9 fixtures |
| `screens.mts --matrix` | 0 | HEAD-only question windows: claude 1, qwen 4; cursor, opencode and antigravity equal the parent on every window; parent false positives 2 (`a-gemini-0004`, `-0005`), equal at HEAD; `qwen-confirmation` 0 of 964 and `claude-trust-gate` 0 of 1,116 windows of other agents |
| `verifyCorpus()` | 0 | 37 pins, 0 missing, 0 moved |
| `ablation:p312` in a `cp -Rc` clone | 0 | 23 of 23, 58 s |
| `ablation:p321` | 0 | 29 of 29 arms red on their owner by name, control green before and after, clone restored by sha256 and removed, 310.7 s on the final bytes |
| control-byte scan of every changed or untracked file | | 47 files, 0 with a control byte; a planted ESC is detected |

#### 12.9.4 The re-measure over the real recordings

**Not an independent method**: the matrix verifier's replay scripts, copied into this round's scratch directory and
pointed at a snapshot of the fixed `src/` (byte-identical to the worktree but for grok's registry comment, added
after), with the verifier's own clone of `ecb6997a` as the parent, on a socket of this round's own. One replicate:
F1 is recording a, F2 is adv1 with the four b recordings; each 28 cells per build (2 cadences by 10 tick phases with
his recorded keys fed to `noteUserInput`, and 2 by 4 without). Labels are the verifier's. The reverify should measure
by its own.

- **Catches (F1).** qwen's two permissions: HEAD 10/10 and 4/4 at both cadences (medians 4.8 and 4.1 s at 1 s, 7.3
  and 6.6 s at 2 s), parent 0. Claude Code's gate: HEAD 10/10 and 4/4 (3.2 s, 7.4 s), parent 0. cursor's three,
  opencode's and antigravity's trust gate: 0 at both builds in every cell. antigravity's permissions: identical at both
  builds (perm1 4/10 at 2 s, perm2 3/10 at 2 s, worst 55.8 s; 0 at 1 s). gemini's gate: 10/10 at both; 1 s median
  14.6 s at both; 2 s parent 18.1 s [17.2..19.0], HEAD 16.9 s [16.0..17.8], **no cell past the parent's median plus
  one tick**. codex identical. F2: b-gemini identical (1 s 10/10 at 6.9 s; 2 s 8/10); adv1's two cursor questions 0/28
  at both (answered before a second capture); b-cursor's two 0 at both.
- **False ambers: 0 at both builds in every cell of F1 and F2.**
- **Turn boundaries** (the verifier's rule: a running onset with no byte in the 4 s before and no key in the 1.5 s
  before). At 2 s every session reads the same count at both builds (opencode 4 and 4, qwen 0 and 0, pi 0 and 0, omp 3
  and 3, gemini 9 and 9), where the build's six shapes had read opencode 5 to 31, qwen 0 to 32 and pi 0 to 7 in the
  verifier's A1. At 1 s with keys HEAD reads fewer (opencode 13 against 23, qwen 21 against 29, omp 6 against 7) and
  the same elsewhere; without keys gemini and omp read one more in one cell each and opencode and qwen fewer. **It is
  not zero cell by cell**: qwen at 1 s phase 0 flashes running at 12 s while Claude Code's gate holds a slot (6 to
  39 s), and the parent has flashes HEAD lacks elsewhere (opencode's 22 to 23 s in 7 of 14 cells). Claude Code's 10
  and 7 are its gate's release at his answering key, 10 ms before the key's recorded offset in the replay's timers,
  0.3 s before the parent's own running onset for the same answer.
- **grok.** HEAD rests in **28 of 28 cells of recording a** (idle for 0.91 to 0.95 of both silent stretches at 1 s,
  0.85 to 0.91 at 2 s; the build's rule rested in 19 of 28) and **28 of 28 of adv1** (0.91 to 0.92 at 1 s, 0.78 to
  0.87 at 2 s); the parent 0 of 56 (0.00). b/grok (no process table) identical. Its new transitions sit on his keys
  and grok's writes, plus a 3 s running flash near 571 s in 3 of 14 cells at 1 s: the helpers used about 8 % CPU over
  569.3 to 570.3 s and the CPU rule's two busy ticks caught it, which the parent hides under running on every tick.
- **Cost.** F1 `ps` 6,091 against 6,091 at 1 s, 3,026 against 3,046 at 2 s; captures of grok 3,611 against 5,291 at
  1 s, of claude 2,280 against 2,113 (its gate holds a slot while it waits), every other session within 70. F2 `ps`
  1,785 against 1,842 and 867 against 926. Tick lateness p99, median over monitors: F1 20 to 24 ms at both builds; F2
  148 to 818 ms at both, the machine's load average between 7 and 15.

#### 12.9.5 For the operator, and the landing waits on it

1. **Capture displacement below the ceiling** (§1.3 item 6). After the removal the recordings show no invented
   boundary at 2 s and fewer at 1 s, and no numbered question later than the parent's median plus one tick, but a
   newly caught question still takes a slot on every tick it waits, so the effect is smaller, not gone. Accept it as
   a named limit (and restate the entry's two landing rows it touches), or queue the capture policy Phase 319 parked.
2. **grok's remaining edge** (§1.3 item 5): a detached tool alive at grok's first recorded rest reads idle while it
   lasts, where the parent reads working. Nothing the monitor reads separates it from a helper. Keep it as a stated
   limit, or remove the grok part whole under the no-regression rule; it is separable.

#### 12.9.6 What this round could not do, and why

- **`probe:p321` has not run since this round rewrote arms (a), (c) and (e).** The fixer launches no Electron; the
  reverify runs it at a built parent and at HEAD under the Electron lock. Arm (e)'s two new halves have never run.
- No live agent and no model turn: cursor's rejection input was not re-driven (its shapes are gone), and nothing new
  was launched. **qwen after "No, suggest changes" is not recorded**: whether qwen ever draws an input on its last
  row, which is the one screen the kept qwen shape's tail of 0 would not refuse, is unmeasured. Claude Code's shape is
  read only while its registry file is absent, which bounds the same question for it to the launch window.
- `conformance:resume:capture` (path-triggered by `registry.ts`) needs a build and an Electron. Claude Code's gate
  answered outside Tortie while its oracle speaks (§1.3 item 3) is still unmeasured.
- One replay replicate, not two, and the replay is the matrix verifier's method, not a new one.
- `ablation:p321` ran twice: once before grok's registry comment was added (29 of 29, 328.9 s) and once on the
  final bytes (29 of 29, 310.7 s, exit 0, clone restored by sha256 and removed, worktree never written).

#### 12.9.7 What the entry and this spec got wrong, found in the fix round

- §3.1's premise that "the question replaces the agent's input box, so at most `tail` inked rows sit below it" holds
  only while the agent's own UI is in the foreground and draws something below its input. A shell, a pager or an
  editor in the session (a restored session, an agent that exited) and an agent input drawn on the last row (cursor
  after a skipped permission) break it, so a tail above 0 is unsafe. Both kept shapes have a tail of 0.
- §1.2 item 6: cursor-agent updated itself during research 129's run.
- §1.3 item 4: the trade happens only inside a question's probe window, and displacement begins below six.
- §4.4: "no earlier tick is quiet" ignored the launch window before grok's first byte.
- The entry names six shapes and an antigravity part; two shapes and grok's rule survive. **The BACKLOG entry is the
  main session's**: it needs the removal, the two rulings above, and its antigravity number restated: the parent
  raised antigravity's permissions at 1 s in 2 of 10 cells of the verifier's A1 and 0 of 10 in A2 and in F1, not
  "0 of 30".

### 12.10 His ruling of 2026-09-23, "One narrow round, then land", and the round that ran it

The fixer's record. The reverify of §12.9 answered needs_work, and the verdict went to the operator. His ruling, in
full: (1) a shape applies ONLY while that session's AGENT is the pane's foreground program, read from what the
monitor already knows about the pane's foreground process, with no `ps` per tick if the existing reads can answer it
and the cost stated exactly if they cannot, so that a shell, a pager, `tail`, `cat` or `watch` in the foreground
reads no shape; (2) grok's `residentHelpers` removed whole, its field, rule, tests and arms, so grok goes back to
exactly today; (3) the one-tick delay a newly caught question costs another agent's question under the ceiling of six
is ACCEPTED and named as a limit, and must be the only worse row; and the probe's focus reading fixed and its socket
unlinked in its `finally`. Nothing else moves. The numbered path is byte-identical for every agent without a shape.

#### 12.10.1 The foreground gate, and why it reads what it reads

**What the monitor already knows about the pane's foreground process**, read from the tree:

| Read | When it is taken | What it can say |
| --- | --- | --- |
| `#{pane_current_command}` (`PaneFacts.currentCommand`, `panes.ts`) | every tick, in the one `list-panes` | tmux's NAME for the pane's foreground program: the `p_comm` of the foreground process group's leader |
| the fleet table's STAT `+` (`holdsTerminal`, `foregroundChildOf`, `process.ts`) | every tick some session is in its probe window (the table every capture of an ambiguous session already rides on) | WHICH process holds the terminal: the pane's own program while it carries `+`, otherwise the child of it that does (a shell's job) |
| the Phase 141 witness (`st.witnessPid`) | when claude's record exists, or a shell's foreground child names the agent | the agent's pid, in the restored shape only |

**Neither free read answers alone, measured over the tree and this Mac:**

- The name is not the agent's name for the two agents with a shape. Claude Code 2.1.280 is
  `~/.local/share/claude/versions/2.1.280` behind the `claude` symlink, so its `p_comm` is its version string
  (`panes.ts`'s own note: "claude reports its version string"); qwen 0.22.0's launcher ends in
  `exec "$ROOT/node/bin/node" "$ROOT/lib/cli-entry.js"` (read from the installed launcher), so its name is `node`, the
  name of every node program; research 129's process table reads the pane's own program as `node` in 1,166 of 1,170
  qwen samples. Under SpecStory capture the name is `specstory`. A name list would be per agent, per install shape
  and per release.
- The table's `+` cannot tell a session Tortie created (the agent IS the pane's own program, `Ss+`) from a restored
  session before its resume (the login shell at its prompt, also `Ss+`, nothing under it).
- The witness is taken for a session Tortie created only from claude's registry record, and Claude Code 2.1.280's
  trust gate is drawn BEFORE that record exists (§4.5), which is the only time its shape is read. A qwen Tortie
  created has no witness at all (its foreground has no child that names it).

**So the gate is the Phase 141 rule, asked of the process holding the terminal.** `foregroundProgram(proc, panePid)`
(state-machine.ts) is the pane's own program while the table marks it `+`, otherwise `foregroundChildOf`. It is the
agent when its whole command line names one of the row's binaries by `commandNamesAgent` over `binaryCandidatesFor`,
the rule that names a witness (Phase 141): `claude --session-id …` names claude, qwen's
`…/qwen-code/node/bin/node …/qwen-code/lib/cli-entry.js` names qwen by its `qwen-` directory (the case Phase 141's fix
round wrote that clause for), `specstory run claude … -c …` names claude, and `-zsh`, `tail -n +1 -f log`,
`sleep 600` and `watch …` name nothing. The line is read by the monitor (`readForegrounds`, monitor.ts, concurrently
with the captures and before the verdicts), `ps -o command= -p <pid>` through the injectable `readCommand`
(`readProcessCommand`, measured at 2.3 ms in research 64), and recorded as `st.foreground = { pid, name, agent }` by
`noteForeground`. `foregroundToRead` asks for a read ONLY when the row lists a shape, the tick has a table, and the
process holding the terminal or tmux's name for it changed since the last read. The verdict asks
`agentHoldsTerminal(pane, st, ctx.proc)` before `detectShapes`, in the one `&&` chain of `const shaped`: the reading
must say `agent`, tmux's name must be the one it was read under, and, with a table, the process holding the terminal
must be the one it read. On a tick with no table (a blocked session past its probe window with nothing else
ambiguous) the reading stands while tmux's name is unchanged.

**THE COST, exactly.** No `ps` per tick, and no new table: the gate reads the table the tick already took. One
`ps -o command= -p <pid>` (2.3 ms) per change of the process holding the terminal or of tmux's name for it, only for a
row that lists a shape (qwen and claude), only on a tick that took a table and wants a capture of that session. A
steady session costs one read in its life (`p321-foreground.test.ts`: 30 ticks, reads `[500]`); every other row costs
none (codex, gemini, grok, pi, cursor, opencode, antigravity, shell and an unknown agent: 0 reads over 10 ticks each,
with tables taken). For a healthy claude session with its record, the native oracle answers and it is never captured,
so it is never read.

**What it adds to the latency of a catch: nothing measured.** The read runs beside the captures and is awaited before
the verdicts, so the first capture of a life is already gated.

**The limits of the gate, stated.** (a) It inherits the named-process rule's reach: a program whose command line
carries a token whose program name IS the agent's binary (a log file named exactly `claude` passed to `tail`, a script
under a directory named `qwen-…`) passes, where `claude.log`, `rows-qwen.txt` and `screen.log` do not. (b) A replay
harness must run its replay pane under a command line that names the agent (`exec -a qwen …`), as the probe's
stand-ins now do, or inject `readCommand`; one that runs `node replay.mjs` will read the shapes as never asked. (c) On
a tick with no table the reading stands while tmux's name is unchanged; a program of the same name taking the terminal
without printing anything is the case that leaves (it prints, or the table returns within its probe window).

#### 12.10.2 What changed, file by file

- `src/main/activity/state-machine.ts`: the resident rule is gone whole (`residents`, `residentBase`, `noteResidents`,
  `coveredByResidents`, `RestEvidence`, the two clears in `noteAgentLeft`, the `toolChildPids` import); the strong
  evidence line is the parent's `outputEvidence || cpuBusy || toolChild` again; `dialog = numbered || shaped` where
  `shaped = screen !== null && agentHoldsTerminal(pane, st, ctx.proc) && detectShapes(screen, profile.dialogs ?? NO_SHAPES)`;
  `SessionState.foreground`, `ForegroundReading`, `foregroundProgram`, `foregroundToRead`, `noteForeground` and
  `agentHoldsTerminal` added. `detectDialog` keeps its one call site and its line.
- `src/main/activity/monitor.ts`: `readForegrounds`, awaited beside `captureScreens` in one `Promise.all`; two
  imports. Nothing in `uiUpdate` or `choiceUpdate` moved.
- `src/main/activity/process.ts`: **byte-identical to `ecb6997a`** (`toolChildPids` and its comment removed).
- `src/main/agents/registry.ts`: `residentHelpers` removed from `AgentActivityProfile`; grok's row and its comment are
  the parent's byte for byte; the `dialogs` comment says a shape is asked only while the agent holds the terminal.
- `src/main/activity/__tests__/p321-foreground.test.ts` (new, 24 rows): the SHIPPING `SessionActivityMonitor` over
  fake `list-panes` lines carrying `#{pane_current_command}`, a fake table carrying STAT, and `ps -o command=` per
  pid, every read injected. The reverify's hostile cases for qwen and Claude Code, each at 1 s and 2 s: `tail -f` of a
  screen log (3 tick phases), `cat` then `sleep`, `watch` over `tmux capture-pane`, a restored session before its
  resume (the login shell at a prompt drawing nothing below the replayed rows), and a handback (qwen raised as the
  shell's job, released once it left, never raised again; the gate rows a Claude Code left behind). Each hostile screen
  is first shown to be one the parent's numbered verdict does not read and the agent's own shape does. The kept
  catches through the same harness: each agent as the pane's own program and as the login shell's job, and qwen's
  launcher exec'ing node. The clauses: an exec to a shell under the same pid, another program under the same tmux
  name, a table in which nothing holds the terminal, a relaunch under the same name, a question held past its probe
  window on ticks with no table, tmux renaming the foreground on such a tick, one read for a steady foreground and
  none for a row with no shape; and `foregroundProgram` over four tables.
- `src/main/activity/__tests__/p321-masking.test.ts` (21 rows): the grok sections removed (resident rule, recording
  clauses, relaunches); its harness does the monitor's one read through the shipping `foregroundToRead` and
  `noteForeground`; the kept catches run in both pane shapes, and a `tail` twin reads nothing; grok is among the rows
  held to the literal parent rule tick for tick, with its six helpers alive for its whole life; and a row that lists no
  shape must end with `st.foreground` null.
- `src/main/activity/__tests__/p321-shapes.test.ts` (63 rows): the `toolChildPids` rows and the corpus row that
  compared it with `hasToolChild` removed with the function; grok's profile pinned to the parent's
  `{ tier: 'screen', animatesWhenIdle: false, verified: 'unverified' }`, and no row's `activity` may carry a key
  beyond the parent's and `dialogs`.
- `build/p321/ablation.mjs` (23 arms): the resident arms (M3 to M17, P1, R2) removed; M1's needle is the new dialog
  line; **F1** the gate taken off the shape call (owners: all ten hostile rows, the exec and same-name clauses, and
  masking's `tail` twin); **F2** the reading's `agent` ignored; **F3** tmux's name ignored; **F4** the table ignored;
  **F5** no re-read on a new name; **F6** no re-read on a new pid; **F7** the foreground always the pane's own program;
  **F8** never it; **F9** any command line counts; **F10** the monitor never reads; **F11** a row with no shape read.
- `build/conformance-choices.mjs`: **clause 23**, read with the TypeScript parser: the one `detectShapes` call is the
  last operand of an `&&` chain that is the whole value of a `const`, holding `screen !== null` and exactly one
  `agentHoldsTerminal(pane, st, ctx.proc)`; the gate is declared once and reads `.agent`, `currentCommand` and
  `foregroundProgram(`; `noteForeground` decides `agent` by `commandNamesAgent` over `binaryCandidatesFor`; it and
  `foregroundToRead` are called only from monitor.ts's `readForegrounds`, which `runTick` calls once; and
  `foregroundToRead` reads `profile.dialogs`. Seven self-tests, each red: the gate taken off, the gate ORed (which
  the first draft of the clause read GREEN, because `a || b && c` parses as `a || (b && c)`; the const-chain rule is
  what closed it), the gate not reading the reading, `agent` decided without the rule, a second call site, the tick
  never reading, and a row with no shape read. 26 clauses, 26 self-tests.
- `build/conformance-agents.mjs`: prose only. Section 10 still refuses the names `residentHelpers` and
  `writesWhileAsking` in the overlay's types, schema, floor profiles and loader, so neither can come back as
  configuration.
- `build/p321/probe-p321.mjs`: **the focus** (the reverify's finding: the app's blur handler re-asks `isFocused()`,
  so emitting the event over a window macOS made key read nothing): the window's focus is taken away for real,
  `w.blur()` then `app.hide()` only if that did not take, each waited on until no window reads focused, then the
  event is emitted, and it is re-asserted before every section with the outcome recorded per section. **The socket**:
  `kill-server` as a belt and the socket file under `tmux-<uid>` unlinked in the `finally`, guarded by its own
  `gmux-p321-` prefix, with an arm saying it is gone. **The stand-ins run under the bare name** (`exec -a`, the
  wrapper now `#!/bin/bash`), because the gate asks the command line and `node …/stand-in.mjs` names no agent.
  **Arm (b)** is grok as today at both builds (`running` after its turn and while a later tool runs). **Arm (f)**, new:
  a qwen and a Claude Code session whose pane runs `zsh -f -i` (the wrapper's shell branch, taken only on a terminal
  and only once per flag, so a version probe never takes it), in which `tail -n +1 -f`, `clear; cat …; sleep 600` and
  a watch-like `while` loop print the agent's committed question rows LAST; each cell is readable only when the pane
  shows the rows last and the program holds the terminal; no `needs_input` and no push at either build. **`draw()`**
  sizes a pane the app has resized under it again, once, and redraws before reading it unreadable (found by this
  round's own arm (e), §12.10.4).
- `build/verification-checks.mjs`, `CLAUDE.md`: the three rows restated (the `dialogs` field alone, the foreground
  gate as a trigger path, clause 23, the probe's arms and its focus and socket).
- Not changed: `screen.ts`, the nine fixtures, `build/fixtures/questions/`, `screens.mts`, `corpus.mjs`,
  `stand-in.mjs`, `p312-choices.test.ts`, `package.json`, `HELPER_USER_FLOOR` (151), `src/shared/`.

**`git diff ecb6997a` over grok's row and the state machine's resident code is empty**: `process.ts` 0 lines; no hunk
of `registry.ts` falls in grok's row (lines 1462 to 1575); `grep` for `residentHelpers`, `residents`, `residentBase`,
`toolChildPids`, `noteResidents` and `coveredByResidents` over `src/` finds 0.

#### 12.10.3 The limit his ruling accepted, restated

**Capture displacement below the ceiling of six** (§1.3 item 6, §12.9.4) is the one worse row, accepted by his ruling
of 2026-09-23 as the price of catching new questions: a newly caught question is `needs_input` and takes one of the
six capture slots on every tick it waits, and a slot it holds is a capture another session does not get that tick.
**It has two faces, and both are the same displacement** (named at his ruling of 2026-09-23, "Tiny fix, then land"):

1. **Another agent's question raised one tick later** in a busy fleet (the reverify's measure: gemini 7 of 10 cells
   at 1 s, codex and antigravity 1 to 2 cells at 2 s).
2. **Another session's idle and running moments moved.** A session that is not captured on a tick reads nothing new
   that tick, so a short flash of idle between two stretches of running (or of running between two rests) can be
   read a tick later, or missed, or read where the parent did not read it. The reverify's replay of the real
   recordings, parent against HEAD, measured 29 session-cells losing one turn boundary and 12 gaining one, and
   they are two things, restated as measured at his ruling of 2026-09-23 ("Tiny fix, then land", item 4):
   - **In other sessions, 13 cells lose a boundary and 10 gain one.** That is this displacement, and it is the
     accepted row.
   - **In qwen's own sessions, 16 cells lose a boundary and 2 gain one**, and that is not displacement: it is qwen's
     own idle and running flicker INSIDE a question the shapes now hold amber, which the parent read as boundaries
     because it never saw the question. Those boundaries are gone because the question is caught. That is the catch
     working, not a worse row.

The entry's landing rows "no later than the parent's median plus one tick" and "none is a real turn lost or invented"
are restated under it: both faces are accepted, and neither is claimed away. The foreground gate adds no delay of its own (§12.10.1). grok's resident edge (§1.3 item 5) is gone with the
rule: grok reads `working` on every tick, exactly as at the parent.

#### 12.10.4 The commands, on the final bytes

No live agent, no model turn, nothing installed, never `-L gmux`, no `pkill`, nothing signalled but this round's own
processes. Every Electron launch was under the orchestrator's lock (taken 13:57:45 as `p321`, released 14:28:05).

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run -s typecheck` | 0 | 0 import violations, 0 runtime cycles, shared types OK |
| `npx vitest run --no-cache src/main/activity src/main/agents` | 0 | 22 files, 544 passed (p321-shapes 63, p321-masking 21, p321-foreground 24); every existing row of `signals`, `p312-choices`, `p312-question`, `p311-question`, `monitor`, `reflow`, `turn-boundary`, `p141-witness` and `p141-drop-edge` green unchanged |
| `npm run -s conformance:choices` | 0 | 26 clauses; Phase 321's 26 self-tests red as they must |
| `npm run -s conformance:agents` | 0 | 10.1 to 10.4 yes, self-tests 5, 2, 3, 3 red; 8 rows through the shipping loader |
| `npm run -s conformance:installs`, `:handback`, `:phonecopy`, `:push` | 0 | push 23 rules, 2,165 checks |
| `npm run -s gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 | electron 151 against a floor of 151; background 3 starters, 19 of 19 fixtures |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `screens.mts --check`, `--matrix` (the pinned tsx) | 0, 0 | 1,238 windows, 9 fixtures, verdicts as pinned; the detector matrix unchanged (the gate is not a detector clause) |
| `npm run -s ablation:p321` | 0 | 23 of 23 arms red on their owner by name, control 108 rows green before and after, restored by sha256, worktree never written, 112.7 s on the final bytes (108.6 s on the bytes before the last comment edit) |
| `node build/p312/ablation.mjs` in a `cp -Rc` clone | 0 | 23 of 23 |
| `P321_ONLY=M1,F1,…,F11 node build/p321/ablation.mjs` (the gate's arms alone, first) | 0 | 12 of 12 |
| control-byte scan of every changed or untracked file but the capture fixtures, with a planted ESC | | 39 files, 0 with a control byte; the planted ESC detected |
| `npm run -s build` (under the lock) | 0 | every in-build gate green |
| `npm run -s probe:p321` at HEAD (under the lock) | 2 | 20 readings: 19 PASS and arm (e) UNREADABLE (below) |
| `P321_ARMS=e npm run -s probe:p321` at HEAD (under the lock) | 1 | arm (e) 3 of 3 PASS; the run marked FAIL by `electron-run`'s census of `-L gmux` (below) |

**`probe:p321` at HEAD, read whole** (`out/p321/probe-p321.json`, two runs; no parent run in this round):

- The cadence: 0.47 ticks a second with a session present, and every section between 0.46 and 0.53. **The focus fix
  was not exercised**: in both runs the window was never focused (`0 focused before`, re-read before each of the 14
  sections), so the `blur()` and `app.hide()` path ran no step. It is written, and it is unproven on a run where macOS
  gives the window the focus.
- (a) qwen's two confirmations and Claude Code 2.1.280's gate: needs_input 4.8 s, 5.4 s and 5.4 s after the draw, each
  in the door's blocked rows, a ⌘J row and exactly one push. This is the foreground gate passing a stand-in that runs
  under the bare name. cursor's two, opencode's and antigravity's trust gate: never amber, no push. antigravity's
  numbered permission: caught at 3.0 s this run (a reading, at either build).
- (b) grok as today: `running` on every poll for 45 s after its turn, and through and after a later tool.
- (c) the answered box: no needs_input, no push. His words, 42 typings: 36 graded, 0 amber or pushed; the 6 that the
  parent's own numbered verdict reads (antigravity's permission rows typed into each input) are the existing fault,
  ungraded, 5 amber this run (not grok's, whose helper holds it working).
- (d) pi rests idle, the shell reads idle, neither ever needs_input.
- **(e) the ceiling, first run UNREADABLE**: the seventh session's pane was 206x42 when qwen's screen was drawn, because
  the app sizes a session it has just created to its own view when it attaches it, and that landed after `launch`
  sized it. **A probe defect found by this round and fixed in `draw()`**: size the pane again once and redraw before
  reading it unreadable. **Rerun, arm (e) alone: 3 of 3 PASS**: under six numbered blocks the qwen confirmation is not
  raised in 20 s and sends nothing; one slot freed 22.1 s after the draw, inside the window, and the qwen question
  takes it while an eighth numbered question is not raised (the stated trade, §1.3 item 4); a shape question left
  76.9 s, past the 60 s window, is never raised and a numbered one drawn after takes the slot.
- **(f) the reverify's hostile shells: 6 of 6 cells, 0 needs_input, 0 pushes**, each cell read only after the pane
  showed the question rows last and `#{pane_current_command}` read the program (`tail`, `sleep`, `sleep`) for qwen
  and for Claude Code.
- Teardown: 0 Electrons of this run left (18 on the machine after, 20 before, all the operator's); 35 and 11 stand-in,
  helper, tool and shell processes seen, 0 left; **the socket file was still there after the teardown in both runs and
  was unlinked by the new `finally` step**, nothing left. Two older files, `gmux-p321-98629` (11:06) and
  `gmux-p321-38806` (11:26), no server on either, sit in `/private/tmp/tmux-501/` from runs before this round (the
  leak this fix closes); this round did not create them and left them.
- **The (e) rerun's FAIL line is `electron-run`'s census, not an arm**: "1 session APPEARED on -L gmux during this
  launch: GITHUB APP; 1 session WENT from -L gmux during this launch: codex-8". Neither name is one this probe gives a
  session (`q-`, `g-`, `c-`, `w-`, `d-`, `e-`, `f-` and `metronome`), the probe launches no codex, and the app was
  handed `GMUX_TMUX_SOCKET=gmux-p321-<pid>` under `electron-run`'s socket refusal; the operator's own Tortie was
  working during the 8 minutes. This round did not touch `-L gmux` and cannot prove it from the census, which
  cannot tell who wrote; the first run, 35 minutes long, tripped nothing.

#### 12.10.5 What this round could not do

- No reverify of its own: the replay over the real recordings, the 40 of 40 catches cell by cell, and the hostile cases
  in the reverify's own harness are the reverifier's (§12.10.1 (b): a replay pane must run under a command line that
  names the agent). The unit rows and the probe hold the kept catches and the hostile shells; neither is the
  recordings.
- The focus fix is unexercised (above). No parent build was probed in this round.
- `conformance:resume:capture` (path-triggered by `registry.ts`) was not run: this round's `registry.ts` change is a
  field removed and a comment, and the gate starts Electron under its own build.

### 12.11 His ruling of 2026-09-23, "Tiny fix, then land", and the round that ran it

The fixer's record. The reverify of §12.10 kept everything but one worse row: the foreground gate asked Phase 141's
witness rule (`commandNamesAgent`), which examines EVERY token of a command line, so a program that is not the agent
passed whenever an ARGUMENT named it (`tail -f /tmp/qwen-screen`, `tail -f ./qwen-2`, `less ~/logs/claude/screen`,
`vim ~/work/qwen-demo/Makefile`, `watch … capture-pane -t claude`, and any extensionless path under
`/private/tmp/claude-501/`, as an argument or as the program itself). His ruling, in full: give the gate its OWN
stricter rule and leave Phase 141's witness rule alone. A command line counts as the agent only when a PROGRAM token
names it: argv[0]'s program name (its basename), or, when argv[0] is an interpreter or a known wrapper (node, bun,
deno, python, python3, sh/bash/zsh `-c`, `specstory run`), its first script argument's program name, read off the
registry's own install shapes for qwen and Claude Code. A path in any later argument never counts. Also name both
faces of the one accepted row in §12.10.3 (done there), and write `probe:p321`'s measured duration into its CLAUDE.md
row. Nothing else moves. This section supersedes §12.10.1's "So the gate is the Phase 141 rule, asked of the process
holding the terminal" and that section's limit (a); the rest of §12.10.1 stands.

#### 12.11.1 The rule, `commandRunsAgent` (state-machine.ts)

`noteForeground` now decides `agent` by `commandRunsAgent(command, binaryCandidatesFor(agent))`. It counts only a
program token, and only by `programName` (the basename with a script suffix taken off, the same helper Phase 141 uses),
never by a directory:

- argv[0];
- argv[0] one of `node`, `bun`, `deno`, `python`, `python3`: its first argument that does not begin with `-`, one
  `run` skipped;
- argv[0] one of `sh`, `bash`, `zsh`, with `-c` (alone or in a short cluster such as `-lc`) among its LEADING options:
  the first word of the command string, which is the token after `-c` in the line `ps` prints; an operand before the
  `-c` ends the search;
- argv[0] `specstory` and argv[1] `run`: the first word of its `-c` string.

**The install shapes, read from the tree and this Mac, not by launching anything:**

| Registry row, install | What holds the terminal, as `ps -o command=` prints it | Program token |
| --- | --- | --- |
| claude: installer (signature `realpath-under ~/.local/share/claude/versions`), Homebrew cask, Linux packages: a native binary | `claude --session-id <uuid>`: Tortie launches it by its bare name (Phase 12.7 F3); research 129's sampler recorded its `comm` as `claude` (`Ss+`) in 1,146 samples | argv[0] |
| claude and qwen: npm, a Homebrew formula, and Claude Code's old `~/.claude/local` (`extraProbeDirs`): a bin script under `#!/usr/bin/env node` | `node <prefix>/bin/claude …` (or an absolute interpreter where a shebang was rewritten) | the interpreter's script |
| claude under capture (`wrapArgv`, src/main/specstory/wrap.ts) | `<abs>/specstory run claude --no-version-check --silent [--no-cloud-sync] -c claude --session-id <uuid>` | the `-c` string |
| a one-element argv (`createSession` passes `-- <argv>`; tmux hands one element to its shell) | `zsh -c qwen`, until the shell execs it | the `-c` string |
| qwen: standalone installer (signatures `~/.qwen/source.json`, `realpath-under ~/.local/lib/qwen-code`) | `<R>/node/bin/node <R>/lib/cli-entry.js …`, R `~/.local/lib/qwen-code`. Read from the installed 0.22.0: `~/.local/bin/qwen` is `exec '<R>/bin/qwen' "$@"`, which is `exec "$ROOT/node/bin/node" "$ROOT/lib/cli-entry.js" "$@"`; research 129 recorded the pane's own program as `node` (`Ss+`) in 1,166 samples with its `--expose-gc` relaunch under it as `node` (`S+`) in 2,293, and the registry's correction 4 names the chain `cli-entry.js -> cli.js -> …` | the bundled runtime, below |

**The last shape carries no program named for the agent** (`node` and `cli-entry`). So an interpreter given as an
absolute path and its script, also absolute, name the agent when the DEEPEST directory the two share is named for it
(the agent's name, or its name and a dash): an install carrying its own runtime (`bundledRuntime`). That is the one
place a directory counts, and it is asked of the pair, never of either alone: `node /private/tmp/claude-501/x/replay.mjs`
(the replay harness's own shape) and `/usr/local/bin/node /private/tmp/claude-501/x/replay.mjs` share no such directory
and read no agent.

**The bundled-runtime clause and the shell's `-c` were narrowed by §12.12** (his ruling "Tiny fix, then land", after
its reverify): the shared directory must be EXACTLY an install root the registry's own signature names for the row
(`qwen-code`, and none for Claude Code), and a shell's `-c` counts only when it is one simple command. The paragraph
above is the rule as this round built it; §12.12.1 is the rule as it lands.

**Its limits, stated.** (a) A script whose own program name IS the agent's binary passes (`node …/claude.mjs`, the
`.mjs` taken off), as the ruling's "its first script argument's program name" says it must. The python form
(`python3 ~/logs/claude`) passes or not with the Python build: Homebrew's framework Python re-execs itself as
`…/Python.app/Contents/MacOS/Python`, so the line `ps` prints begins with `Python`, which is no interpreter this rule
names, and it reads no agent. (b) As narrowed by §12.12: an absolute interpreter and script whose deepest shared
directory is named exactly `qwen-code` read as qwen wherever that directory is (a checkout of qwen-code's own
repository that carries its own node, say); nothing reads as Claude Code by a directory, and a home directory named
for the agent (`/Users/claude/…`) no longer passes. (c) A row that gains a shape and whose process carries its name
in no program token (muse's `muse-bin-<version>`) reads its shapes as never asked, the side that raises nothing. (d) A
SpecStory `-c` whose argv[0] holds an escaped space splits in `ps`'s line and reads no agent; Tortie's bare-name launch
never has one. (e) An interpreter option that takes a separate value (`node -r x script.js`) makes that value the
script, which reads no agent unless the value itself is named for it.

**Two limits no command-line rule can close, stated as indistinguishable** (his ruling "Tiny fix, then land", item 3).
(f) **argv[0] spoofed**: `exec -a claude tail -f ~/screen.log` runs `tail` under the line `claude -f
/Users/…/screen.log`, and `ps -o command=` prints exactly that; it reads as Claude Code and its rows turn amber. (g) **A
symlink named for the agent that points at another program**: `ps` prints the name it was run by, never what the link
resolves to. These are not holes a stricter rule would close, because the real thing looks the same: Claude Code's own
installer IS such a symlink (`~/.local/bin/claude` into `~/.local/share/claude/versions/<version>`, and the process's
`comm` is the version string), and `probe:p321`'s stand-ins run under `exec -a <bare name>` precisely so their line
reads as the real agent's does. Anything that can tell the two apart has to ask something other than the command line,
and the ruling kept the gate on the command line.

**Phase 141's witness rule is untouched**: `commandNamesAgent`, `isScriptToken`, `programName` and
`binaryCandidatesFor` are byte-identical to `ecb6997a` (sha1 of each function's text, parent against now:
`1a9d107a935e`, `c061ba4209b8`, `dda0f9453980`, `6ee7ccc45796`, each equal). Its callers, the witness in monitor.ts
and `resume-in-place.ts`, are unchanged.

**What each rule reads, the reverify's list and the kept shapes** (`p321-foreground.test.ts`, both kept agents):

| Command line (for each of qwen and claude, `a` the agent) | Phase 141's rule | The gate's rule |
| --- | --- | --- |
| `tail -f /tmp/a-screen`, `tail -f ./a-2`, `less /Users/example/logs/a/screen`, `vim /Users/example/work/a-demo/Makefile`, `watch -n 60 tmux capture-pane -p -t a`, `tail -f /private/tmp/a-501/…/scratchpad/screen`, `/private/tmp/a-501/x/watch 60 tmux capture-pane -p -t %1`, `tail -f /Users/example/logs/a`, `sh -c tail -f /tmp/a-screen; sleep 600`, `node /private/tmp/a-501/x/replay.mjs` | agent, all 20 | not the agent, all 20 |
| qwen standalone (own program, job, resumed), npm, Homebrew formula, `zsh -c qwen`; claude by bare name (own, job, resumed), npm, `~/.claude/local`, SpecStory | agent | agent |

#### 12.11.2 What changed, file by file

- `src/main/activity/state-machine.ts`: `commandRunsAgent` (exported) with `INTERPRETERS`, `C_SHELLS`,
  `shellCommandWord`, `interpretedScript` and `bundledRuntime`; `noteForeground`'s one line now names
  `commandRunsAgent`; the `ForegroundReading` comment and its `agent` field's say which rule. Nothing else.
- `src/main/activity/__tests__/p321-foreground.test.ts` (24 rows to 59), through the SHIPPING monitor:
  **"a program whose ARGUMENTS name the agent is not the agent, and never turns amber"**, 20 rows (the ten command
  lines above for each kept agent, each as the login shell's job at 1 s and 2 s, each first shown to be one Phase
  141's rule names, and each proved READ by the gate, `reads.command` holding the job's pid);
  **"every install shape of the two agents with a shape is the agent, and its question turns amber"**, 10 rows (the
  shapes above, as the pane's own program and as the shell's job where each occurs, at 1 s and 2 s, each
  `needs_input`); and **"commandRunsAgent, clause by clause"**, 5 rows (the option skip and `run`, `-c` only among
  leading options, SpecStory's `run` and `-c`, the pair and its DEEPEST shared directory, nothing and no candidate).
- `build/p321/ablation.mjs` (23 arms to 29): F9's needle is the new line (owners now also the 20 new rows); **F12**
  the reading asks `commandNamesAgent` again (owners: the 20); **F13** `commandRunsAgent` answers as
  `commandNamesAgent` (the 20 and four clause rows); **F14** the interpreter's script off (npm, Homebrew formula,
  claude npm and `~/.claude/local`, and the option-skip row); **F15** the bundled runtime off (qwen's standalone rows,
  the existing kept qwen rows, the launcher-exec row and the pair row); **F16** a shell's `-c` off (`zsh -c qwen` and
  the `-c` row); **F17** SpecStory's `-c` off (the captured Claude Code row).
- `build/conformance-choices.mjs`: clause 23's reading check names `commandRunsAgent` over `binaryCandidatesFor`;
  **clause 24, "the gate never asks Phase 141's witness rule"**, read with the TypeScript parser: `commandRunsAgent`
  declared once; every function the gate's path reaches through state-machine.ts's own declarations, from
  `noteForeground`, `agentHoldsTerminal` and `foregroundToRead`, names neither `commandNamesAgent` nor its
  `isScriptToken`, as a call or as a value; that path reaches `commandRunsAgent`; and monitor.ts's `readForegrounds`
  names neither. Seven self-tests, each red: the reading reverted to the witness rule, the rule delegating to it, a
  helper of the rule asking it, the witness rule handed in as a value, `isScriptToken` asked by the rule, the
  monitor's read naming it, and the reading never reaching the rule. 27 clauses, 33 self-tests.
- `build/verification-checks.mjs` (a comment), `CLAUDE.md`: the `conformance:choices` row names `commandRunsAgent`
  among its triggers and says the reading is made by the gate's own program-token rule and never Phase 141's, "seven
  clauses"; the `probe:p321` row reads "about 25 to 35 minutes per build (measured on 2026-09-23: 35 min at HEAD in
  the fix round's run, 25 min 17 s in the reverify's)" and names `commandRunsAgent` among its triggers.
- §12.10.3 names both faces of the accepted row.
- Not changed: `monitor.ts`, `registry.ts`, `screen.ts`, `process.ts`, `p321-masking.test.ts`, `p321-shapes.test.ts`,
  every fixture, `probe-p321.mjs`, `stand-in.mjs`, `package.json`, `HELPER_USER_FLOOR` (151), `src/shared/`, the
  contract baseline.

#### 12.11.3 The commands, on the final bytes

No live agent, no model turn, nothing installed, no Electron launched (the Electron lock was not taken), never
`-L gmux`, no `pkill`, nothing signalled.

| Command | Exit | Result |
| --- | ---: | --- |
| the rule over 46 command lines through the pinned tsx, before any test was written | 0 | the 32 hostile and control lines read no agent, the 14 install lines read the agent; Phase 141's rule named 26 of the 32 |
| `npx vitest run src/main/activity/__tests__/p321-foreground.test.ts` in a `cp -Rc` clone with `noteForeground` reverted to `commandNamesAgent` | 1 | 20 red of 80 (with masking): exactly the 20 hostile rows; the install rows stay green, as they must, both rules accepting them |
| the same with `commandRunsAgent`'s body answering `return commandNamesAgent(command, candidates)` | 1 | 24 red of 80: the 20 and four clause rows; clone removed |
| `node build/conformance-choices.mjs` in a clone holding the state machine from before this round | 1 | clauses 23 and 24 RED, every other clause green; five of clause 24's self-tests could not be built there, the function they break not existing yet |
| `npm run -s typecheck` | 0 | 0 import violations, 0 runtime cycles, shared types OK |
| `npx vitest run --no-cache src/main/activity src/main/agents` | 0 | 22 files, 579 passed (544 before this round, plus 35) in 16.4 s |
| `npm run -s conformance:choices` | 0 | 27 clauses; 33 self-tests red as they must |
| `npm run -s conformance:agents` | 0 | 10.1 to 10.4 yes, self-tests 5, 2, 3, 3 red |
| `npm run -s conformance:handback` (path-triggered by state-machine.ts) | 0 | PASS |
| `npm run -s ablation:p321` (to `scratchpad/p321-pt-abl.log`) | 0 | 29 of 29 arms red on their owner by name, control 143 rows green before and after, restored by sha256, worktree never written, 161.0 s |
| `P321_ONLY=F9,F12,…,F17 node build/p321/ablation.mjs` (the new arms first) | 0 | 7 of 7, 37.1 s |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `npm run -s gate:electron`, `gate:background`, `gate:checks`, `gate:knownhosts` (again after the last comment edit, with `conformance:choices` and the contract check) | 0 | electron 151 against a floor of 151; background 3 starters, 19 of 19 fixtures |
| control-byte scan of the seven files this round changed, with a planted ESC | | 0 files with a control byte; the planted ESC detected |

#### 12.11.4 What this round could not do

- No app run. `probe:p321`'s stand-ins run under `exec -a <bare name>`, so argv[0] names the agent under either rule
  and the probe cannot tell the two rules apart; its hostile arm (f) uses `tail`, `sleep` and a `while` loop whose
  command lines name no agent under either. The 20 hostile rows through the shipping monitor, their revert proof and
  arms F12 and F13 are this round's evidence. The reverify's own harness over real processes (`h/hostile.mts`) is the
  reverifier's to re-run.
- Of the install shapes, only this Mac's were read from real files (qwen's standalone launcher, Claude Code's
  installer symlink, research 129's process tables). The npm, Homebrew formula, `~/.claude/local` and Linux package
  shapes are derived from the registry's install rows and the `#!/usr/bin/env node` convention, not observed on a
  running process here.
- `npm run build` was not run: nothing a build compiles moved outside `src/main/activity/state-machine.ts`, which the
  typecheck and the in-build gates above cover; the integrator's battery owns it.

### 12.12 His ruling of 2026-09-23, "Tiny fix, then land", after its reverify, and the round that ran it

The fixer's record. The reverify of §12.11 kept the program-token rule: 13 hostile shapes per agent on real processes
never amber, qwen's and Claude Code's catches 180 of 180, and 0 false ambers over every recording. It found exactly
four things, each with a fix it prescribed, and this round does only those: (1) `bundledRuntime` read any absolute
interpreter and script whose deepest shared directory was `<agent>` or `<agent>-*` as the agent, for ANY agent, so
`…/qwen-demo/rt/bin/node …/qwen-demo/tools/show.js` and the same under `claude-demo` turned amber; (2)
`sh -c '<agent> … && sleep 600'` kept reading as the agent after it exited (31 s measured); (3) limits the rule cannot
close were not stated; (4) §12.10.3's face 2 lumped two different things together. This section supersedes §12.11.1's
paragraph on the bundled runtime and its `-c` bullet; the rest of §12.11 stands.

#### 12.12.1 The two narrowings (state-machine.ts)

**Item 1, the install root, read from the registry.** `commandRunsAgent(command, candidates, roots)` takes a third
argument, and `noteForeground`'s one line hands it `bundledRootsFor(agent)`. `bundledRootsFor` reads the row's
`install.signature` from the compiled registry (`getRegistryEntry`, the one new import) and keeps the last directory
of each `realpath-under` signature ONLY when that directory is itself named for the agent (one of its binaries, or one
and a dash), which is what makes it an install ROOT rather than a directory of versions or binaries. Over today's
registry that is qwen's `~/.local/lib/qwen-code`, giving `['qwen-code']`, and `[]` for every other row, a configured
agent included: Claude Code's `~/.local/share/claude/versions`, cursor's `~/.local/share/cursor-agent/versions`,
codex's `~/.codex/packages/standalone` and grok's `~/.grok/bin` each end in a directory named for no agent.
`bundledRuntime` answers false with no roots, and otherwise only when the deepest directory the absolute interpreter
and its script share is EXACTLY one of them. So the shared directory must be `qwen-code`, and Claude Code never
reaches the clause. Nothing in the registry moved; no code line of state-machine.ts spells `qwen-code` (5 comment
lines do, and the tests).

**Item 2, a shell's `-c` is one simple command or nothing.** `shellCommandWord` answers the `-c` string's first word
only when no token from that word to the end of the line matches `` NOT_ONE_COMMAND = /[;&|`()]|\\012/ ``: a list, a
pipe or a background (`;`, `&`, `|`), a subshell or a substitution (a parenthesis, a backtick), or a newline AS
macOS's `ps` PRINTS ONE. Measured on this Mac before writing it: `od -c` of `ps -o command=` for
`sh -c "sleep 6<newline>sleep 1"` is one line, `s h - c s l e e p 6 \ 0 1 2 s l e e p 1`, the newline written as the
four characters `\012`. (A carriage return, which `ps` prints as `^M`, is no separator to a shell and is not asked.) Every token after the string is asked too, because `ps` loses the quoting and cannot say
where the string ended. It is a character test, so `2>&1` is refused too, which is the side that raises nothing; the
one shape Tortie hands a shell, the one-element `zsh -c qwen`, carries none of them. **SpecStory's `-c` is not
narrowed**: its own splitter (`spi.SplitCommandLine`, src/main/specstory/wrap.ts) runs that argv, not a shell, and
Tortie's quoter escapes every unsafe character in it, so nothing there is an operator, and a launch flag such as
`Bash(git:*)` rides in it, which a parenthesis test would turn into a lost catch.

**What the rule reads now, over lines measured or taken from the reverify** (the shipping `commandRunsAgent` through
`node_modules/.bin/tsx --tsconfig tsconfig.main.json`, exit 0):

| Agent | Command line | Phase 141's rule | The gate's rule |
| --- | --- | --- | --- |
| qwen | `/Users/example/work/qwen-demo/rt/bin/node /Users/example/work/qwen-demo/tools/show.js` | agent | not the agent |
| claude | `/Users/example/work/claude-demo/rt/bin/node /Users/example/work/claude-demo/tools/show.js` | agent | not the agent |
| claude | `sh -c claude --session-id x && sleep 600` | agent | not the agent |
| claude | `sh -c claude --session-id x\012sleep 600` | agent | not the agent |
| qwen | `/Users/gdc/.local/lib/qwen-code/node/bin/node /Users/gdc/.local/lib/qwen-code/lib/cli-entry.js` | agent | agent |
| qwen | `zsh -c qwen` | agent | agent |
| claude | `/Applications/Tortie.app/Contents/Resources/bin/specstory run claude --no-version-check --silent -c claude --session-id x` | agent | agent |
| claude | `claude -f /private/tmp/…/typecheck.log` (measured: `bash -c "exec -a claude tail -f …"`, `comm` `claude`) | agent | agent, limit (f) |
| claude | `node /Users/example/tools/claude.mjs` | agent | agent, limit (a) |
| claude | `python3 /Users/example/logs/claude` | agent | agent, limit (a) |
| claude | `/opt/homebrew/Cellar/python@3.14/3.14.4_1/Frameworks/Python.framework/Versions/3.14/Resources/Python.app/Contents/MacOS/Python /Users/example/logs/claude` (measured: what `ps` prints for this Mac's `python3`) | agent | not the agent, limit (a) |

**Its new limit, stated.** A newline is read as macOS's `ps` writes it (`\012`); a `ps` that writes it another way
(procps writes `?`) is not read, and `readProcessCommand` keeps the first line only, so a `ps` that wrote a raw
newline would hand the rule the part before it. Tortie reads macOS's.

#### 12.12.2 The limits and the face (items 3 and 4)

- **Item 3** is in §12.11.1: limit (a)'s example is now `node …/claude.mjs`, and the python form is said to depend on
  the Python build (measured above: Homebrew's framework Python re-execs as `Python`, which reads no agent); (b) is
  restated for item 1; and (f) argv[0] spoofing and (g) a symlink named for the agent are stated as
  indistinguishable by any command-line rule, because Claude Code's own installer is such a symlink and the probe's
  stand-ins run under `exec -a`.
- **Item 4** is in §12.10.3: face 2 is restated as measured by the reverify, 13 cells losing a boundary and 10 gaining
  one in other sessions (displacement, the accepted row), and 16 losing and 2 gaining in qwen's own sessions, which is
  qwen's idle and running flicker inside the question it now holds amber: the catch working. The numbers are the
  reverify's; this round restated them and did not re-measure.

#### 12.12.3 What changed, file by file

- `src/main/activity/state-machine.ts`: `getRegistryEntry` imported; `commandRunsAgent` takes `roots`;
  `noteForeground` hands it `bundledRootsFor(agent)`; `bundledRuntime` asks `roots` and nothing else;
  `bundledRootsFor` (exported) added; `NOT_ONE_COMMAND` added and `shellCommandWord` asks it; the comments on the
  reading, the rule and its limits restated. `commandNamesAgent`, `isScriptToken`, `programName`,
  `binaryCandidatesFor` and `witnessEligible` are byte-identical to `ecb6997a` (sha1 of each function's text, parent
  against now: `c8281ef537d0`, `12b71b0da3ed`, `cc6c1d71fe21`, `776c13612518`, `2e5750ed168f`, each equal).
- `src/main/activity/__tests__/p321-foreground.test.ts` (59 rows to 89), through the SHIPPING monitor:
  **"a directory named for the agent that is not its install root is not the agent, and never turns amber"**, 8 rows
  (for each kept agent the reverify's `<agent>-demo` project, a project named exactly for the agent, qwen's install
  shape under `<agent>-code-demo`; for Claude Code also qwen's install shape under `claude-code` and a pair under its
  own signature's `versions`), each as the shell's job at 1 s and 2 s, each first shown to be the bundled-runtime shape
  by its twin under `qwen-code` reading as qwen and never as Claude Code, and each proved READ by the gate;
  **"a shell whose `-c` string is more than one simple command is not the agent, and never turns amber"**, 20 rows
  (`&&` the reverify's, `||`, `;`, `&`, `|`, `&&` written against its words, `\012`, `$(…)`, a backtick and `<(…)`,
  for each kept agent, with the agent gone and `sleep` holding the terminal with the shell), each first shown to begin
  with its one-simple-command twin, which reads the agent, and with the agent's bare name as its first word; and in
  "commandRunsAgent, clause by clause", **"a shell's `-c` counts only when it is ONE simple command"** and **"the
  install root is READ FROM THE REGISTRY, and only qwen's row names one, so Claude Code never reaches it"** (the root
  re-derived from qwen's own `realpath-under`, `['qwen-code']`, `[]` for every other registry id and for a configured
  agent), and the directory row renamed "…is EXACTLY the row's install root" with the new pairs added. Every call of
  the rule hands it the row's roots. Every install-shape row still reaches `needs_input`.
- `build/p321/ablation.mjs` (29 arms to 33): F9, F12, F14 and F15's needles follow the new lines; F13 and F15 name the
  renamed row; **F18** the directory rule from before the narrowing, inlined at its one call site (owners: the seven
  project rows the old rule accepted and the EXACTLY row); **F19** every `realpath-under` root kept, named for the
  agent or not, so Claude Code reaches the rule with `versions` (the `versions` row, the EXACTLY row, the registry
  row); **F20** a shell's `-c` counted whatever it holds (the 20 compound rows and the one-simple-command row);
  **F21** the newline as `ps` prints it not read (the two `\012` rows and the one-simple-command row).
- `build/p321/SPEC.md`: §12.10.3 face 2, §12.11.1's limits and its pointer to this section, and this section.
- Not changed: `monitor.ts`, `registry.ts`, `process.ts`, `screen.ts` (sha256 before and after this round equal),
  `conformance-choices.mjs` (its clauses 23 and 24 hold as written: `noteForeground` still calls `commandRunsAgent`
  once and `binaryCandidatesFor` once, and `bundledRootsFor`, now on the gate's path, names no witness rule), every
  fixture, `probe-p321.mjs`, `stand-in.mjs`, `package.json`, `HELPER_USER_FLOOR` (151), `src/shared/`, the contract
  baseline, CLAUDE.md (its `conformance:choices` row still says the rule counts "a shell's `-c` … first word"; it does
  not name either narrowing, which the integrator may add).

#### 12.12.4 The commands, on the final bytes

No live agent, no model turn, nothing installed, no Electron, never `-L gmux`, no `pkill`; the only processes signalled
were this round's own `sleep`, `sh`, `tail` and `python3` measurements, each ended by pid in a trap, none left.

| Command | Exit | Result |
| --- | ---: | --- |
| `sh -c "sleep 6<newline>sleep 1"` and `sh -c "sleep 6 && sleep 1"` read by `ps -o command=` (measurement) | 0 | the newline printed as `\012` on one line; `&&` printed as is |
| `sh -c "sleep 3; : x<carriage return>y"` read by `ps -o command=` (measurement) | 0 | printed as `^M`, so the first draft's `\015` clause matched nothing real and was dropped; a carriage return is no separator to a shell |
| `bash -c "exec -a claude tail -f …"` and this Mac's `python3 -c …` read by `ps` (measurement) | 0 | `claude -f …` with `comm` `claude`; `…/Python.app/Contents/MacOS/Python -c …` |
| the rule over the measured lines through tsx | 0 | the table in §12.12.1 |
| revert proof in a `cp -Rc` clone (`scratchpad/p321-nw/revert-proof.mjs`), control | 0 | 89 of 89 green |
| the same, item 1 reverted (the old directory rule at the call site) | 1 | 8 red: the seven project rows the old rule accepted and the EXACTLY row |
| the same, item 1's row filter reverted (every `realpath-under` root kept) | 1 | 3 red: the `versions` row, the EXACTLY row and the registry row |
| the same, item 2 reverted (`-c`'s first word whatever follows) | 1 | 21 red: the 20 compound rows and the one-simple-command row; clone removed |
| `npm run -s typecheck` | 0 | 0 import violations, 0 runtime cycles, shared types OK |
| `npx vitest run --no-cache src/main/activity src/main/agents` | 0 | 22 files, 609 passed (579 before this round, plus 30) in 25.3 s |
| `P321_ONLY=F9,F12,F13,F14,F15,F18,F19,F20,F21 node build/p321/ablation.mjs` (the moved and new arms first, on the bytes before the `\015` clause was dropped) | 0 | 9 of 9, 40.2 s |
| `npm run -s ablation:p321` (to `scratchpad/p321-nw-abl.log`), on the final bytes | 0 | 33 of 33 arms red on their owner by name, control 173 rows green before and after, restored by sha256, worktree never written, 141.2 s (141.1 s on the bytes before the drop) |
| `npm run -s conformance:choices` | 0 | 27 clauses; 33 self-tests red as they must |
| `npm run -s conformance:agents` | 0 | PASS; 8 rows through the shipping loader |
| `npm run -s conformance:handback` (path-triggered by state-machine.ts) | 0 | PASS |
| `npm run -s conformance:installs` | 0 | PASS, 15 rows (registry.ts did not move; run because the rule now reads its install map) |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `npm run -s gate:electron`, `gate:background`, `gate:checks`, `gate:knownhosts` | 0 | electron 151 against a floor of 151; background 3 starters, 19 of 19 fixtures |

#### 12.12.5 What this round could not do

- No app run: `probe:p321`'s stand-ins run under `exec -a <bare name>` and its hostile arm (f) uses `tail`, `sleep` and a
  `while` loop, so the probe cannot tell the rule before these narrowings from the rule after them. The unit rows
  through the shipping monitor, their revert proof and arms F18 to F21 are this round's evidence; the reverify's own
  harness over real processes is the reverifier's to re-run.
- Items 3 and 4 restate the reverify's measurements and this round's own `ps` readings; the replay over the real
  recordings was not re-run here.
- `npm run build` was not run: nothing a build compiles moved outside `src/main/activity/state-machine.ts`, which the
  typecheck and the in-build gates above cover.
