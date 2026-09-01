# How independent verification worked, 30 August to 1 September 2026

Status. Audit of 36 workflow runs read from their journals under the session's `subagents/workflows/` directory. 31 runs carried a verifier. 5 did not: the debts scan, the rookery investigation and research 73, 74 and 75. Nothing in this document is taken from memory. Every number is read from a journal result, and the classification of findings into methods is this audit's own reading of what each verifier said it did.

## The answer to the first question

Attack rather than confirm found the most defects. Of the 40 findings a verifier rated blocking or should_fix, 18 came from an attack, 6 from re-deriving a number by a different method, 5 from a hostile fixture, 3 from a run over real data, 1 from measuring the parent commit, 6 from reading code or repository state, and 1 from the single app run itself. The project's belief that re-deriving is the highest yield method did not hold as a count. It held in a narrower form: re-derivation was the method behind the 3 hardest catches at reverify (Phase 193's 39 spawns against the gate's 38, Phase 185's markup lengths passed off as character counts, Phase 181.2's comment claiming a cap refused strings 3 to 5 characters under it), and it was what proved every fix, because the runs that fixed something measured the parent commit and HEAD with the same instrument. The belief that reading finds nothing held for product behaviour and failed for process: reading found no defect in what the app does, and found 6 defects in versions, log lines, uncommitted bytes, a design document and a harness `finally` block.

Two more things the count shows. A verdict of pass did not mean no defects: 9 of the 20 first verdicts that read pass or approved carried a should_fix item, and in 8 of those 9 a fix round ran anyway (the ninth, Phase 182, died before one could). And the verifier's own instrument was wrong before the code was in 7 runs (168, 172 reverify, 180, 181.1, 189, 191, 193); in every case the verifier said so and re-derived before writing a verdict, which is the Phase 123 pattern the project already recorded.

## Findings by method

Counts are of findings rated blocking or should_fix, or named as the reason for a needs_work verdict. Notes are excluded: the structured defect lists alone hold 56 notes against 20 should_fix and 3 blocking, the later runs' prose findings add more, and most notes are limits rather than defects.

| Method | Findings | Runs where it found them |
| --- | --- | --- |
| Attack rather than confirm | 18 | 170 (2), 173, 174.1, 175, 178, 180, 181, 181.1, 182, 182 verify (2), 182 reverify, 185, 186, 187, 191, 194 |
| Reading code, documents or repository state | 6 | 175, 181.1, 181.2, 182 reverify, 185, 191 |
| Re-derive by a different method | 6 | 178, 181.2 reverify, 185 reverify (2), 191, 193 reverify |
| Write a hostile fixture | 5 | 177, 188, 191, 193, 194 |
| Run over real data | 3 | 169, 170, 191 |
| The one app run | 1 | 181.1 |
| Measure the parent commit | 1 | 172 |

What each method was good at:

- Attack found false claims. Phase 180's checker reported a must-not crossed by 33 real Swift imports as convergent. Phase 181's meter drew nothing for 15 minutes after its switch was turned on. Phase 182's token rode in a curl argv while 3 documents said it never did. Phase 173's typecheck was red from a clean cache while the commit body said green.
- Re-derivation found disagreements in numbers everyone else had agreed on. Phase 193's reverifier wrote an AST scanner against the gate's regex scanner, disagreed by 2, found 1 of the 2 was its own bug, and the other was a real site at the parent commit.
- Hostile fixtures found bytes nobody had written. Phase 177's literal `null` file vanished without a line. Phase 188's out of range epoch failed the whole capture. Phase 194's old side beginning with a newline produced a projection 1 byte too long.
- Real data found environment truths. Phase 169's omp binary sat on its own onboarding wizard, so the resume harness could not reach a turn.
- The parent measurement rarely found a defect on its own, but it was mandatory in 11 operator reported phases and it is what turned before and after into numbers: minus 9 px to 0 px (174.2), 37 of 200 to 0 of 200 (187), 24 of 26 snapshots to 0 of 25 (182 reverify).

## What the verifier caught that the builder's checks missed

Grouped by kind, with the run that produced each.

A claim that was false when measured:

- Phase 182 verify (wf_18e19be4-cd9): the token was in curl's argv, dumped verbatim from a PATH shim, while `statusline.ts`, the commit body and research 72 all said it was never in an argv.
- Phase 178 (wf_4aa306c8-694): the commit body said the face read "1276 swift, 166 c, 43 kt". The face read "168 md, 87 swift, 43 kt". The figures came from a different file universe.
- Phase 175 (wf_97a99198-8b3): the body said turning Architecture off removes all of it. An open map tab stayed open and usable.
- Phase 173 (wf_567ad947-33a): the body said typecheck green. From a clean cache it exited 2 with TS2532. The builder's green was a stale incremental cache.
- Phase 191 (wf_eeffde70-9c9): a comment 4 lines above the edited rule said the control row could never overflow at the panel floor. The row needed 356 px and had 319.
- Phase 194 (wf_bf079d0d-887): a commit body said the probe passed 23 of 23 rows. Run as committed, the drive never finished.

A byte off in a projection or a count:

- Phase 194: the coarse line partition clamped `lastIndexOf('\n', -1)` to index 0 and claimed a leading newline common to both sides, 10,591 bytes against a 10,590 byte file.
- Phase 185 reverify (wf_02d474ff-d87): the source comment's 1,555, 1,723 and 1,177 highlighted characters were markup lengths. The decoded text was 1,550, 1,718 and 1,172, one `&#x3C;` per mode.
- Phase 193 reverify (wf_99bc9978-5f2): 39 unrouted ssh spawns at the parent, not 38. The missed site was `probe-control-dialect.mjs:375`, a `let file` assigned `sshBin` in an else branch.

A guard that could not fail:

- Phase 181.1 (wf_906900a0-4b0): the phase's own probe asserted 0 overlap at all 7 widths on the parent build that had the defect, because the spill was visible overflow and never moved a box.
- Phase 187 (wf_72fb4899-1cf): with half the two line fix reverted, all 6 shipped arms and the verifier's own 200 life fuzz still passed. The belt line was unguarded.
- Phase 193: 9 of 21 hostile scripts walked past a gate whose printed line said none could. At reverify, 4 of 14 new shapes walked past the widened gate, all one family, and a whole planted probe was read and passed.
- Phase 185: deleting the pool push left typecheck, build and 11,309 tests green. The only guard had no npm script and no entry in `verification-checks.mjs`.
- Phase 181.2 (wf_a8d9df3b-7f0): `.usage-card` back to `z-index: 60` left every gate green and brought the operator's photograph back.

Verified bytes that were never committed:

- Phase 182 reverify: the fix round was 8 modified files and 1 untracked file, uncommitted. HEAD still published the token, 24 of 26 process table snapshots, and the committed log line said the fix was in that landing.
- Phase 193: 4 of 26 files were untracked. A `git commit -a` would have shipped 19 scripts importing a module that did not exist.
- Phase 188.1 (wf_3fdacca8-d71) and Phase 191 both answered the standing question with md5s, so the committer could prove it staged the verified bytes.

A claim understated or overstated:

- Phase 181.2 reverify: the fix round replaced a comment overstating the shape with one overstating the cap. `sk-ant-oat01-abcd` at 17 characters passed both against a cap of 20.
- Phase 188.1: the entry said the live loop delivered some samples then stopped. At the parent it delivered 0.
- Phase 191: the copy admission said one row interleaves. Every redline row in range interleaved and each changed block arrived 3 times.
- Phase 185 reverify: the log line said the toggle's 3 strings were the only user visible "colour". `machines-copy.ts:592` still exports `FIELD_COLOUR = 'Colour'`.

A regression or exposure in an unrelated place:

- Phase 188 (wf_6e52b648-f4f): a new `toISOString` on a manifest stamp meant one corrupt row failed the whole capture and killed the live loop after 3 ticks.
- Phase 182 reverify: the worktree was 2 commits behind and a naive landing would have reverted Phase 189 across 10 files.
- Phase 193 build: the builder's own `runSsh` returned stdout plus stderr and leaked a host key warning into a checked in golden, 53 bytes to 139. The builder caught it by running the goldens script rather than trusting it compiled.

## How corrections happened

Fixed in the fix round, then approved at reverify: 169, 170, 177, 178, 180, 175, 181, 174.1, 181.1, 187, 191. In 11 of the 17 reverifies the answer was safe to commit.

Fixed by the committer re-deriving after a refused or truncated reverify:

- Phase 173 (8e0030f): the reverify said no and its text was truncated. The committer wiped every tsbuildinfo, proved typecheck green, rebased onto 2 phases that had landed in parallel, and bumped to 0.89.4 against the phase's own "version stays". It stacked the fix as `4b8427b` rather than amending as the reverifier had demanded.
- Phase 181.2 (e176a7e): the committer ran the real exported function through tsx and printed the table the fix round should have printed. Every specimen the round said was refused came back drawable.
- Phase 185 (c9dbf5a): the reverify said no and its text was truncated to "two documented measurements are wrong". The committer re-derived and fixed 3 different wrong numbers: the eager set growth (161,871 written, 160,196 and 160,189 measured by 2 routes), the wash colour, and a 1,101 against 1,103 file count. The reverifier's 2 named findings are not mentioned in the committer's report, and as of this audit the tree still carries 1,555 in `diff-view-prefs.ts:38` and `'Colour'` in `machines-copy.ts:592`.
- Phase 182 (f10d616): the committer re-derived the open finding with the clock advanced 15 seconds at a time, measured 120 warn lines an hour from one idle pane, fixed it, proved the check red against the unfixed code, and rebased.
- Phase 193 (e47aa07): the fix round and the reverifier disagreed on 38 against 39. The committer ran the committed gate against a copy of the parent tree, got 38, fixed name resolution to follow a name to a name 3 levels deep, and confirmed 39 with a second AST scanner.

Recorded as a known limit and not fixed after the verdict, on principle:

- Phase 172 (c29cffb): `probe-p63-arch.mjs` red at parent and HEAD alike. The charter said record, do not fix.
- Phase 188 (06fbe2c): the committer declined the verifier's recommended one clause guard so that the verified bytes stayed the committed bytes. It became Phase 188.1.
- Phase 188.1 (18a516b): the committer declined its verifier's one suggestion for the same reason and checked the 3 md5s before staging and again after the gates.
- Phase 178: the third defect (any grammarless extension takes a slot) was left for the operator's ruling.
- Phase 187 (7d15e68): `core.ts:2296` still lets a tombstoned record leave its id uncovered. Named by the reverifier as a live edge for the next round.

Refuted as a false or misshapen finding:

- Phase 182 fix round refuted the shape of finding 3: Claude Code reads `<gitRoot>/.claude/settings.local.json`, not `settings.json`, settled with `claude --debug` and 3 controls. The reverifier then read the binary's own string table and found both files are checkout scoped, so the defensive over inclusion was correct.
- Phase 193 fix round refuted "2 extra hits" (it was 4, one a product function inside a String.raw template), refuted "V3, S1b and K2 are contrived" (a 20 line constant folder catches all 3), and refuted its own count of 12 shapes (13, the thirteenth a plain reassignment).
- Phase 191 fix round refuted the cause of F6: a pasteboard write replaces every flavour, so an image was gone before `clipboard.clear()` ran. Measured with osascript, 8 flavours before and 4 text flavours after one write.
- Phase 191 verifier refuted its own anchor finding: two slots looked off by one until git's own diff showed it groups a trailing blank line into the block.
- Phase 181.1 verifier refuted its own first finding: "the floor never fires on a live resize" dissolved under focus emulation. Electron throttles an unfocused renderer.
- Phase 193 reproduce refuted the charter's method: macOS OpenSSH expands `~` from getpwuid, so a scratch HOME would have stayed at 0 bytes while every write landed in the real file.

## Where the process itself failed

| Failure | Runs | What it produced |
| --- | --- | --- |
| Agents dying on session limits | 182 (2 agents started, never returned, no commit); 194 (5 failed entries, a builder and a fix agent each continued a dead predecessor, reverify approved after 3 resumes of one run id and landed at 53feab7); 185 (one key started 5 times, a dead fix agent left safety commit 468a67d) | "Commit in small steps so a death loses little" in the 182 and 187 scripts, which name the 5 deaths |
| Verified work left uncommitted | 182 reverify (8 files uncommitted, HEAD still carried the defect); 193 (4 untracked files) | The `verifiedBytesAreCommitted` field in every verifier schema from 188.1 on, answered with md5s |
| A stale incremental cache masking a type error | 173 | "typecheck from a clean cache", which every later run states it did |
| Hashes needing correction after a rebase | 187 (4 hashes rewritten by the rebase, corrected in place in the docs commit); 182 (8bd0245 became 650b5b3) | A log line names a hash that already exists on the remote, so the docs commit follows the phase commit |
| A git checkout discarding log text | 182 committer: `git checkout --` of the dirty BACKLOG dropped 1,125 characters of a 4,048 character line that `--numstat` showed as 1 insertion, 1 deletion. Restored from a backup taken first | Back up the running log before any checkout of it |
| Truncated verdict text reaching the next agent | 173, 177, 179, 185 | Committers re-derived rather than trusting a summary. In 185 the re-derivation found different defects and left the reverifier's 2 open |
| An incomplete result returned mid work | 173 fix agent returned "the matrix is on row 9 of 10, I will proceed" | The reverifier found the post fix matrix unfinished and refused |
| Background render throttling corrupting probe readings | 174.1 (queryLocalFonts rejected on an occluded page, timers stretched to one a minute); 181.1 (a ResizeObserver delivered once per run); 194 (a 15 second wait took 74 seconds under the pin) | `setAlwaysOnTop` in the shot harness, focus emulation in probes, and the finding that the pin does not stop every throttle |
| Charter premises found false | 170 (the mechanism), 172 (files "grown since" were exactly the audit's sizes), 173 (sign in was never blocked), 178 (3 true unresolved were 6), 193 (13 scripts were 18, the scratch HOME method unsound), 187 (the named mechanism was half the cause) | Every phase now quotes its requirements back and states a premise check before building |
| Stray processes from earlier rounds | 173 (a wt-p140 sshd and 2 agents from 23 August); 187 (an ssh-agent from the phase's own probe, `scratchYard` called above the `try`); 193 (an sshd from probe-control-deadline still listening) | 187 moved the agent teardown into a `finally`. The probe-control-deadline sshd is still up and named for a backlog entry |
| Flaky tests under load | 187 reverify (2 git integration timeouts with swap at 31.7 GB of 32.7 GB); 194 fix (a 187 ms symbol budget read 227 ms); 170 committer (1 unreproduced failure) | Re-run once alone, then the full suite, and say which |
| The verifier over its budget or brief | 191 (3 app runs for Tier 2, its own selector bug); 192 (`probe:p132` completed a real install into a scratch project) | Both named it rather than omitting it |

Two probes were found dead in passing: `probe:keyinstall` and `probe:controldeadline` both die with `ReferenceError: tsxCli is not defined` at f10d616, found by the 193 reproduce agent.

## Techniques worth keeping

1. A PNG decoder written from scratch to read painted pixels. First in Phase 174.2 (wf_a69950eb-394), where the alignment offset was re-derived 3 ways and the pixels agreed with the box model at minus 9 px and 0 px. Reused in 181.2 to prove occlusion by pixels rather than z-index arithmetic, in 189 (wf_d5882022-dae) to derive the tab floor from where Chromium actually placed its ellipsis, and in 192 (wf_7781b3a9-e5b), where it caught its own calibration error because Chrome paints in P3 and sRGB green arrived as [117,251,76].
2. Rendering the parent's own component beside HEAD's over one report. Phase 188 extracted `DiagnosticsBody` from the parent with `git show` and rendered both with `renderToStaticMarkup`: two byte identical rows with 0 title attributes at the parent, 8 distinct cells at HEAD. Phase 188.1 materialised the parent module as an untracked sibling, md5 verified, so the comparison never touched the tracked file.
3. A randomized fuzz of a state machine at both commits. Phase 187 drove 200 lives over a 7 step vocabulary the phase never combined, then one Remove: 37 of 200 came back at the parent and 0 of 200 at HEAD, at 8 times the phase's own cohort. Its per line ablation is what found the unguarded belt.
4. An AST scanner written to cross check a regex scanner. Phase 193's verifier and reverifier both parsed with the TypeScript compiler against the gate's hand lexer and regular expressions, and the second disagreement was the real one. The committer kept the second scanner as the confirmation of 39.
5. `ssh -F /dev/null -G` to prove a leak target without connecting. Phase 193 turned every scanner miss from a style complaint into a demonstrated path into the operator's file, and proved HOME redirection changes nothing.
6. Hashing the operator's own files before and after, and every file under a scratch tree. Phase 182 verify hashed the 3 settings files and a path to sha256 map of whole trees before and after 9 refusal rows. Phase 193 hashed `known_hosts` at the start of every round, after every gate and at the end, 2,120 bytes and one sha256 throughout.
7. PATH shims that record every argv a generated script runs, and a process table sampled every 50 ms during the post. Phase 182 verify and reverify used both, and they found the argv leak that 3 documents denied.
8. Mutation testing the verifier's own instrument before trusting it. Phase 181 mutated the shipped source 5 ways and proved its 46 assertions could fail. Phase 182 verify planted a sentinel in every root so a scan of 136,768,010 bytes could be seen to fail. Phase 182 reverify's refusal matrix first came back all NONE, which would have been a matrix that could not fail, and the verifier said so.

## Per phase matrix

Runs are oldest first. First verdict and final verdict are the words the journal holds. Hash is the phase or version commit the committer returned.

| Phase | Run | First verdict | Methods named | What was found | How corrected | Final | Hash |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 168 | wf_03117187-d9b | pass | re-derive (own ps and top, own Python from the charter) | 2 notes: no photograph, rank 1 branch untested | none needed | committed | c05e99b |
| 169 | wf_1eab7568-2ec | pass | re-derive (real omp over 7 cwds), attack (forged store, blinded identity) | omp wizard blocks the resume harness (should_fix) | harness env `OMP_SKIP_SETUP`, recall still blocked by a 403 | reverify yes | d0e80a2 |
| 170 | wf_dfb32364-3b9 | pass | re-derive (60 pids, 12.94 s), real data (per pid footprint), attack (resting face) | top costs a core; live ticks read not read; capture during live | 2 fixed in integration, streaming top 17.6 percent of a core | reverify yes | c01c013 |
| 171 | wf_b404c53a-740 | pass | re-derive (AST recount 213 to 215), hostile plant, parent (ps premise) | 4 notes; flight latch recorded, became 183 | none | committed | 32ec650 |
| 174 | wf_fbd0e772-972 | pass | hostile fixture (26 shapes through 3 real sinks) | 1 note | none | committed | 4b350cd |
| 172 | wf_5b50d6cb-8f7 | pass | re-derive (AST surface, 182 lines, 0 diff), attack (facade), parent (both trees run) | `probe-p63-arch` red at both commits; brief premise false | recorded per charter | reverify yes | c29cffb |
| 176 | wf_9469ca20-69a | pass | parent and HEAD gestures in one process, attack (4 shapes) | 2 notes | none | committed | 3d9bb38 |
| 177 | wf_2e2b25b6-91c | pass | hostile fixture (17 files), parent (2 lines to 1) | literal null vanishes silently (should_fix) | fixed, 5 tests red first | approved | 69d0e27 |
| 173 | wf_567ad947-33a | needs_work | re-derive (raw artifacts), attack (clean cache typecheck), real data (own matrix run) | typecheck red (blocking); body misattributes run 2 | optional chaining; reverify NO; committer re-derived | committed | 8e0030f |
| 183 | wf_8a4ed2df-088 | pass | re-derive (own frame starved harness at both commits) | 1 note | none | committed | dc8bdcd |
| 178 | wf_4aa306c8-694 | needs_work | re-derive (own scanner, 6 unresolved file for file), attack (planted quote) | held lane mislabelled; 1276 swift claim false | both fixed | reverify yes | 25b5622 |
| 179 | wf_b2b44e68-8e7 | pass | re-derive (blind scanner, 100 crossings), attack (5 fixtures), real run | 2 notes | none | committed | 25a49fb |
| 180 | wf_4e9a04a8-cc8 | needs_work | re-derive (893 pairs), attack (false green end to end), hostile fixture | must-not crossed by 33 imports reads convergent (blocking) | directory owners, fixture pins | reverify yes | 8036fa2 |
| 175 | wf_97a99198-8b3 | pass | attack (real Settings, relaunch), re-derive (planted old shape) | map tab survives switch off; no version bump | close tabs, derived scan, 0.92.0 | reverify yes | 92bcd46 |
| 181 | wf_d91e7e2a-44a | needs_work | attack (opt in journey), hostile corpus mutation tested, real IPC, network recording, own wire client | meter ignores its switch (blocking); 3 notes | subscription, bounds, probe | reverify yes | cf08930 |
| 174.1 | wf_b56baed9-2e3 | pass | parent on the true commit, own journey, third route (sfnt), attack (263 families) | 2 offered fonts called not installed | platform first, bidi strip, alwaysOnTop | reverify yes | 68de77e |
| 181.1 | wf_906900a0-4b0 | needs_work | re-derive (fit rule), parent, hostile fixture (live second row), attack (gate at parent) | mini wears rail clothes; gate cannot fail; log not appended | scoped CSS, probe fails 13 at parent | reverify yes | df37192 |
| 181.2 | wf_a8d9df3b-7f0 | pass | re-derive (DOM geometry), parent plus PNG, hostile fixture (40), real Settings | no bump; no guard; gate comment overstated | probe; comment made worse | reverify NO; committer fixed | e176a7e |
| 185 | wf_02d474ff-d87 | pass | re-derive (own LCS), attack (remove the fix), parent, fresh profile | probe unnamed; DESIGN-SPEC stale; 4 notes | fix agent died; second fix; reverify NO | committer fixed 3 other numbers; 2 reverify items still open | c9dbf5a |
| 182 | wf_086e6e5b-5f3 | pass | attack (9 cases), re-derive ingest, hostile fixture (13 shapes) with sentinel control | log amplification (should_fix); 5 notes | run died, 2 agents never returned | no commit | none |
| 186 | wf_bc5caf9a-254 | needs_work | re-derive (repo generator plus own normaliser), attack (docs against the tree) | capture in Menlo note false for bundled faces | 3 fixed, 1 ruled | committed, not pushed | 3b2dc08 (tortiedotsh) |
| 174.2 | wf_a69950eb-394 | approved | re-derive 3 ways (box model, hit test, pixels), attack (32 frames) | 2 advisory | none | committed | 7917485 |
| 187 | wf_72fb4899-1cf | needs_work | fuzz (200 lives), attack (6 scenarios), ablation, real data | stale list reinstates row; belt unguarded; stray agent | removal instant, arms G to K, `finally` | reverify yes | 7d15e68 |
| 188 | wf_6e52b648-f4f | approved | re-derive (own SQL), hostile fixture (7 shapes), parent rendered beside HEAD | RangeError exposure; newline; overflow | declined on principle, became 188.1 | committed | 06fbe2c |
| 189 | wf_d5882022-dae | approved | pixels (floor 41.97 px), attack (20 names at parent too), guard against parent tree | none blocking; 4 limits | none | committed | f7d131f |
| 182 verify | wf_18e19be4-cd9 | needs_work | hostile fixture (whole pipeline), refusal by hash, PATH shims, gate red at origin | token in curl argv; log amplification (both blocking) | `curl -K`, once per reason, git root, 0600 | reverify needs_work; committer fixed | f10d616 |
| 192 | wf_7781b3a9-e5b | approved | attack, hit test 4 ways with pixels, parent same instrument, canonical p132 (66 of 66) | none blocking; 5 notes | none | committed | 2742c9e |
| 188.1 | wf_3fdacca8-d71 | approved | hostile fixture (18 values, 3 surfaces), drove the live loop, builder's test against parent | entry understated; guard term order | none, suggestion declined | committed | 18a516b |
| 193 | wf_99bc9978-5f2 | needs_work | AST scanner against regex, 21 hostile fixtures, sandbox-exec, own sshd, `ssh -G` | 9 leak shapes pass the gate | widened gate, 31 fixtures | reverify needs_work (alias family, 39); committer fixed | e47aa07 |
| 191 | wf_eeffde70-9c9 | needs_work | re-derive (own jsdiff, 9 of 9), drive from scratch, Segmenter discriminator, gate mutations | control cut off at floor; whitespace row unmarked; invariant false; restore not in `finally` | 8 commits; 2 findings corrected in shape | approved | e238ff1 |
| 194 | wf_bf079d0d-887 | needs_work | re-derive (own 19 fixtures), attack (coarse path), parent from git archive, clipboard, ablation | projection 1 byte long; last word insertion on next line | fix round: prefix 0 stays 0 (c6b8ffd); shared whitespace peeled out of a del ins pair (ae5f4b8); gate ablated 87 and 47 reds | approved | 53feab7, log 97249a4 |

Runs without a verifier, one line each:

- wf_b5506579-95f, the rookery investigation: 4 investigators and a writer produced research 71, committed as b4e9d25.
- wf_d139d3be-36c, the unqueued debts scan: 5 scanners and a ranker, no commit.
- wf_da0520c1-61d, research 73: 4 findings and a writer produced `docs/research/73-prose-redline.md`, no commit result in the journal.
- wf_0b860b10-3bb, research 74: 4 findings and a writer produced `docs/research/74-redline-in-the-diff-view.md`, no commit result.
- wf_31bfab57-b45, research 75: 10 agents produced `docs/research/75-chrome-visual-language.md` and 4 mocks, no commit result.

## What to change

1. Give the verifier's finding list a separate channel from its prose. Four committers received a truncated verdict and re-derived. In Phase 185 that left the reverifier's 2 named blockers open in the tree today. The `findings` field survives truncation where `report` does not, and the committer should read it first.
2. Keep the standing `verifiedBytesAreCommitted` question, and make the answer md5s of the files rather than a yes. Phase 188.1 and 191 showed the shape; 182 and 193 showed why.
3. Plan for an attack in every brief, not only a re-derivation. Attack found 3 times as many blocking defects as re-derivation. Re-derivation stays the method for any number the phase claims, and the parent measurement stays mandatory wherever the operator reported the defect.
4. Write the reading checklist down and stop calling it verification. It found 6 process defects and no behaviour defect. It belongs to the committer's checks, where versions, log lines and untracked files already live.
5. End the sshd that probe-control-deadline left listening, and queue the 2 dead probes the 193 reproduce agent found.
