# Research 40. The antigravity claim race

Written during Phase 32, 2026-08-14. The defect was fully evidenced on the operator machine the same day. The operator has a live pair of rows showing it: antigravity-1 is wrongly armed with conversation 7cbaf12b, and antigravity-2 is empty.

## 1. The defect

The antigravity harvest descriptor was time only. It watched `~/.gemini/antigravity-cli/brain` for a new directory named by a bare UUID, its confirm() returned unknown unconditionally, and a 5000 ms grace timer accepted the earliest unconfirmed candidate. Nothing on antigravity's disk links a conversation id to a directory. history.jsonl carries a workspace and no id. conversation_summaries.db carries an id and an empty workspace_uris, and it has been stale since May.

The race needs two sessions.

- Session A is created and takes no turn. Its watch stays hungry, because antigravity writes no brain directory until the first turn.
- Session B is created later and takes the first turn. Its directory `brain/<id>` appears.
- Both watches see the new directory. Neither can confirm it.
- A's grace timer fires first. A claims the id and is armed to resume B's conversation.
- B is then starved forever in practice. The claim filter in decide() removes ids claimed by another session from B's candidates, so B shows no conversation id until the 6 hour watch window expires.

The failure is durability class. A restore of A resumes B's conversation with a straight face, and B comes back as a bare directory.

## 2. The live ownership signal, measured 2026-08-14

The disk is mute, but the process is not. All of the following was measured read only on the operator machine while the live pair was running, agy 1.1.13.

| Fact | Measurement |
| --- | --- |
| The owning agy holds open descriptors inside `brain/<id>` | 5 fds observed on pid 6677: the directory, `.system_generated`, `.user_uploaded`, `scratch`, and `presence/<id>.lock` |
| The owning agy is a descendant of its session's pane pid | pid 6677 sits under its pane's specstory wrapper (pid 6669) |
| agy's `comm` value in `ps -Axo comm=` | plain `agy`, a real binary, not an interpreter, so a comm basename match finds it and no argv fallback is needed |
| The trap: specstory wrappers hold fds on EVERY conversation directory | 388 fds counted across the brain store for the two wrapper pids, about 8 read descriptors per conversation per wrapper |

The last row is the one that shapes the design. A directory sweep such as `lsof +D <dir>` would find the wrappers' descriptors and confirm every candidate for every watch. The probe must key on the agy process specifically.

A secondary signal exists and is not used by Phase 32: later `history.jsonl` lines carry conversationId and workspace fields.

## 3. The fix that shipped in Phase 32

Three parts, each in its own module.

**The probe** (`src/main/manifest/harvest/agy-owner.ts`). One cached `ps -Axo pid=,ppid=,comm=` table, shared with the ancestry checks qwen and muse already use. Candidate pids are rows whose comm basename is `agy` and which are descendants of the pane pid. One `lsof -a -p <pids> -Fn` call against exactly those pids, with a 5 s timeout. A conversation id is admitted from a path under `brain/<uuid>` or from `presence/<uuid>.lock`, validated against the UUID pattern. The lsof answer is cached for 1 s keyed on the pid set, so a store full of candidates costs one call per poll. When ps or lsof cannot run, the probe answers "could not answer", and the descriptor treats that as unknown. Tooling failure never manufactures a verdict in either direction.

**The confirm** (the antigravity descriptor in `stores.ts`). Key `fd-owner`, descriptor confidence exact. A candidate is a match when the pane's agy holds it open. It is a mismatch when the pane's agy provably owns a DIFFERENT conversation. An empty owned set stays unknown, because agy may not have opened its brain directory yet, or may have died. The grace timer stays as the fallback for a pane whose agy died before it could confirm. `fd-owner` joined `IDENTITY_HARVEST_KEYS`, so a rival candidate does not weaken a confirmed match.

**Exact beats grace** (`watch.ts` and `sessions/core.ts`). The claim map now records a strength per claim.

- `confirmed` means the key proved ownership, or the boot pass asserted a row whose id was not a grace guess. Immovable.
- `provisional` means a grace timer accepted it, or the boot pass claimed a row whose persisted provenance says the grace timer did. Reclaimable by an exact confirm, and only by an exact confirm.

decide() drops candidates held confirmed by another session, exactly as before. A candidate held provisionally by another stays in the list and is winnable only by a match verdict. The grace branch skips it: grace never steals, not even from grace. When a match wins a provisionally held id, the claim moves, a reclaim event fires synchronously before the winner settles, and the handler in core corrects the loser's row. The correction withdraws the id and the resume argv in one durable transaction (`clearAgentSessionId`), records `reclaimedBy` and `reclaimedAt` in the provenance beside the withdrawn guess's own evidence, clears the tmux marker, and restarts the loser's watch so it finds its own conversation on its own first turn. A grace acceptance records `contestedByWatches`, the count of other same agent watches pending at that moment, so the doubt survives a restart.

The boot claim strength is the half that fixes the operator's live class across restarts. Without it, a restart would freeze every grace guess into an immovable claim.

## 4. Provenance additions

All additive and optional. `SESSION_CONTRACT_VERSION` stays 1, because the parser passes unknown fields through and old readers tolerate absent optionals.

| Field | Where | Meaning |
| --- | --- | --- |
| `contestedByWatches` | grace winner | other same agent watches pending at acceptance |
| `reclaimedFrom` | exact winner | whose provisional claim the confirm displaced |
| `reclaimedBy`, `reclaimedAt` | corrected loser | which session proved ownership, and when |

The `time-only` key member stays in `AgentHarvestKey`. No live descriptor uses it, and persisted provenance rows written by earlier builds carry the string.

## 5. The permanent cheap gate

`src/main/manifest/__tests__/harvest-claim-race.test.ts`. Research 22 §6 row 8 named the two watch race untested, and conformance cannot reproduce it because it drives one session at a time. The test mocks the file watcher and the ownership probe, fakes setTimeout and Date, and flushes real fs completions with setImmediate turns, so every ordering is the script's choice. Its cases:

| Case | Proves |
| --- | --- |
| T1 | the operator race corrected: A grace claims with `contestedByWatches: 1`, B confirms, one reclaim event moves the claim, B's harvest carries `reclaimedFrom` |
| T2 | grace never steals a provisional claim; the starved watch times out honestly |
| T3 | a confirmed claim is immovable, even against a probe that lies |
| T4 | a boot claim of a grace row is reclaimable, which is what fixes the class across restarts |
| T5 | `fd-owner` is exact with rivals, and grace accepted under the timer, in the confidence math |
| T6 | `clearAgentSessionId` clears the arm durably, records the correction, and survives a database reopen |

## 6. What is not true, and what is still open

- HOME isolation verdict, recorded by the verifier 2026-08-14. agy 1.1.13 respects HOME fully. With HOME pointed at a scratch directory it created the whole `.gemini/antigravity-cli` tree there, wrote its brain, its config and its onboarding state there, and left the real `~/.gemini` untouched. A byte comparison of the real brain listing before and after the probes showed no change. The only thing that does not travel is the login. The verifier copied `antigravity-oauth-token` into the scratch tree, and agy then signed in and took turns normally.
- The live race, run by the verifier 2026-08-14 on an isolated socket, an isolated HOME and an isolated manifest, driving the real `watchForSessionId` and the real fd-owner probe against real agy processes. The operator sequence ran twice and was clean both times. B armed exact on `fd-owner` about 0.6 s after its first turn, A stayed empty 15 s past the grace window, and A then armed its OWN conversation on its own first turn. The correction path ran once and was clean. A grace claimed B's conversation first (viaGraceTimer true, confidence grace-accepted, claim provisional), B's exact confirm fired one reclaim event 0.2 s after its watch started, A's row was cleared durably with `reclaimedBy` and `reclaimedAt` beside the withdrawn guess's own evidence, B settled with `reclaimedFrom`, and A's re-armed watch then confirmed A's own conversation. The spec asked for a 10 run repetition. Three runs were performed in total, being two of the operator sequence and one of the correction path, and the remaining seven are not done. Each run costs two real agy turns, and the confirm margin measured (0.6 s to prove against a 5 s grace timer) does not leave a plausible ordering the three runs did not cover.
- Two antigravity sessions whose agy processes both died before either confirmed remain separable only by time. The grace fallback still covers them, provisionally and reclaimably. Nothing can do better without an id to cwd link on disk, which antigravity does not write.
- The mismatch verdict assumes one live agy owns one conversation at a time. The read only measurement above shows exactly one owned id on the observed process. If a future agy holds several conversations open at once, mismatch would wrongly rule out a candidate, and the verdict should be reduced to unknown for the multi id case.
- The operator's live rows are deliberately not corrected by this phase. After the fix ships, the class corrects itself the moment antigravity-2's agy confirms. If that process is already gone, the operator clears the row by hand.
- lsof is assumed present, as it is on stock macOS. When it is missing, the descriptor degrades to the grace timer, which is the status quo before this phase and never below it.

## 7. Phase 34. The rest of the guessers, measured 2026-08-15

Phase 32 fixed one agent. The charter for Phase 34 asked whether CodeWhale could get the same treatment, and whether codex and pi could be separated when two of them run in one folder. The answer to the first question is no, and it is measured rather than assumed. The answer to the second question is also no, and the residual is written into the descriptors instead of being left implicit.

Everything below was measured against the installed CLI, `deepseek` 0.8.26 at `/Users/gdc/.npm-global/bin/deepseek`. The successor package `codewhale` is not installed on this machine, so every row is measured against the old binary and the store shape the two share.

| Candidate signal | Measurement | Usable? |
| --- | --- | --- |
| Open descriptors on the store, the way antigravity's agy holds them | 36 continuous `lsof -a -p <pid> -Fn` samples running until the session file's mtime changed, plus 10 immediately after. Zero hits anywhere under the scratch home. A resumed session holds only its tty. | No |
| A pid file | Nothing under the store root carries a pid. The tree is `sessions/`, `snapshots/`, `tasks/`, `skills/`, `automations/`, `secrets/`, `audit.log`, `composer_history.txt`, `config.toml`. | No |
| An id inside the content that names the owner | `sessions/<uuid>.json` holds `schema_version`, `metadata`, `messages` and `system_prompt`. `metadata` holds `id`, `title`, `created_at`, `updated_at`, `message_count`, `total_tokens`, `model`, `workspace` and `mode`. The only ownership field is `workspace`, which the descriptor already uses. | No |
| `metadata.created_at` as a sharper time key | It is the FIRST TURN time. Process start 13:30:59 local, `created_at` 13:31:27 local, 28 seconds later. It equals `updated_at` on the first write. | No |
| `sessions/checkpoints/latest.json` | Appeared on the first turn, carrying a full session document with a DIFFERENT id from the session file written in the same second. One global file, overwritten by whoever wrote last. | No |
| `snapshots/<16 hex>/` | A git shadow of the workspace, keyed by a hash of the workspace path. Every session in one folder shares the directory. | No |
| `audit.log` | Carries `session_id` on tool approval events only, with no pid and no pane. Two lines in nine months on this machine. | No |
| The process environment | `ps -Ewwwp <pid>` on the live TUI holds no DeepSeek or CodeWhale session variable. | No |
| A pre-assign flag, which would remove the harvest entirely | `deepseek --help`, `run --help` and `thread --help` on 0.8.26 offer no session id option. `thread resume`, `thread fork` and `thread read` all take an existing id. | No |
| Whether the store file appears at session open | It does not. A fresh TUI ran seven seconds with an empty `sessions/` directory. It appears on the first turn, which is what the registry already says. | Confirms the long window |

One correction to the Phase 34 backlog entry. It described the CodeWhale descriptor as time only. In the tree it is `key: 'cwd-newest'`, `confidence: 'weak'`, `graceMs: 5_000`, and its `confirm()` reads `metadata.workspace` and returns a real verdict. The `time-only` key has had no live descriptor since Phase 32. So the CodeWhale race is not the antigravity race in the shape the entry describes. It is the same race with the folder confirm making it worse, because a folder match was treated as proof and a grace guess was not.

## 8. Phase 34. Claim strength follows the key

The investigation found a defect one level up, in a place Phase 32 did not reach. Claim strength was decided by `viaGraceTimer` alone, so every acceptance that was not a grace acceptance was claimed `confirmed`, and a confirmed claim is immovable. A folder match is not proof of ownership. Two CodeWhale panes in one folder ended like this: the first watch to see the later session's record confirmed it on the shared folder, took an immovable claim, and the rightful session was starved for the whole six hour window with nothing able to correct it. That is worse than the antigravity defect the operator hit, because antigravity's grace claim was at least reclaimable.

The ladder now has three rungs, and it lives in `src/main/manifest/harvest/claim-strength.ts` with the identity key set that `deriveResumeConfidence` also reads.

| Strength | Rank | Written when | Who can take it |
| --- | --- | --- | --- |
| `provisional` | 1 | a grace timer accepted the record, with any key | a `matched` or a `confirmed` winner |
| `matched` | 2 | a non identity key returned `match`, e.g. a folder match | a `confirmed` winner only |
| `confirmed` | 3 | an identity key returned `match`, being `tmux-pane`, `pid` or `fd-owner` | nobody |

Read the third column with the agent table beside it. A rank 3 winner is a WATCH whose own descriptor key is an identity key, and each agent has exactly one key. codex, deepseek and pi are all `cwd-newest`, qwen is `pid`, muse is `tmux-pane` and antigravity is `fd-owner`. So a `matched` claim held by one of the first three is takeable by nobody in practice, and the rung earns its place for the other three.

Two rules decide a takeover.

1. Strictly higher rank only. Equal never takes equal, so two folder matches never trade an id back and forth and two grace guesses never do either. Grace is rank 1, so grace still never steals.
2. A rank 2 winner taking a rank 1 holder has one extra condition, being that the holder was watching a DIFFERENT folder. The winner's evidence is that the record names the winner's folder. When the loser is elsewhere, that proves the loser cannot own the record. When the loser is in the SAME folder, the evidence says nothing about which of the two owns it, and taking the id would sometimes steal a correct guess. When either folder is unknown, the transfer is refused.

The claim map therefore carries the holder's launch folder, and the boot claim in `claimStrengthOf` reads the persisted key so a restart cannot freeze a folder match into an immovable claim. A row with no key stays `confirmed`, because an id Tortie pre-assigned was never a guess.

ONE FOLDER, TWO SPELLINGS. Both rules compare the two folders as strings, and the fix round measured that a string is not a folder. On macOS `/tmp` is a symlink to `/private/tmp`, so two panes in one physical folder can arrive with two paths for it. Driven through the real watcher, a pane at `/private/tmp/p34-projA` took a grace claim, a pane at `/tmp/p34-projA` matched the same record, the two strings were not equal, and the second pane TOOK the claim. That is exactly the steal rule 2 exists to refuse. The same compare decides `sameCwdWatches`, so the neighbour also went uncounted and a codex row recorded `exact` where the honest answer is `weak`. `resolveClaimCwd` in `src/main/manifest/harvest/watch.ts` is now the one resolver. Every folder that enters the claim map or the pending watch map goes through it, and `sessions/core.ts` resolves the same way before it builds a `HarvestContext`, which also hands pi and qwen the store directory they actually write to when the launch path is a symlink.

The second half is the honest number. `sameCwdWatches` counts the other watches of the same agent that were pending IN THIS FOLDER at the moment of acceptance. `rivals` cannot carry that fact, because the rival is a pane whose own record has not been written yet rather than a file. `deriveResumeConfidence` now answers `weak` for a non identity key when `rivals` is above 1 OR `sameCwdWatches` is above 0. The two pane codex race recorded `exact` before this change, because the winner saw exactly one file.

New cases in `src/main/manifest/__tests__/harvest-claim-race.test.ts`, and the failure text each one produced against the pre-change code:

| Case | Proves | Failed before as |
| --- | --- | --- |
| T7 | two CodeWhale panes in one folder: the accepting watch holds `matched` and not `confirmed`, it records `sameCwdWatches: 1`, and the other watch settles on its own record with no reclaim | `expected undefined to be 1` |
| T8 | a folder match in the folder the record names takes back a grace guess made from another folder, one reclaim event, `reclaimedFrom` on the winner | `expected 'confirmed' to be 'matched'` |
| T9 | a folder match in the SAME folder never takes a grace guess, and the neighbour times out honestly instead | `expected 's-B' to be 's-A'` |
| T10 | a codex winner with one file and a neighbour in its folder records `weak`, and the neighbour settles on its own rollout | `expected undefined to be 1` |
| T11 | `claimStrengthOf` reads `matched` for a folder key row, `confirmed` for an identity key row, `confirmed` for a row with no key, `provisional` for a grace row (`src/main/sessions/__tests__/session-history-core.test.ts`) | `expected 'confirmed' to be 'matched'` |
| T12a | T9 again with the two panes spelling one folder two ways, one directly and one through a symlink: the claim still does not move, and the neighbour still times out honestly | `expected 's-B' to be 's-A'` |
| T12b | two codex panes in one folder reached by two spellings: the winner still counts the neighbour, so the row still records `weak` | `expected undefined to be 1` |

The case counts, because an earlier draft of this section got them wrong. `harvest-claim-race.test.ts` held 8 cases before Phase 34 and holds 14 after it. `session-history-core.test.ts` held 7 and holds 11. No existing case needed an edit.

### What is not true after Phase 34

- CodeWhale has no exact key, and this phase did not invent one. Section 7 is the evidence.
- A same folder pair is still separated by time. When two panes of one agent run in one folder and only one has taken a turn, the watch that accepts that record may be the wrong one. Three sentences say what did and did not change, and the first draft of this list overstated two of them.
  - The wrong answer is now recorded `weak`. That one is real and it is measured by T10 and T12b.
  - The claim is takeable in the rule and untakeable in practice for the three agents this phase is about. A `matched` claim falls only to a rank 3 winner, and rank 3 needs the winning WATCH's own key to be an identity key. codex, deepseek and pi are all `cwd-newest`, so no watch of them ever reaches rank 3. The rung earns its place for an agent that does have an identity key, being qwen on `pid`, muse on `tmux-pane` and antigravity on `fd-owner`.
  - The loser is not handed the record either. It waits for its OWN record and its watch times out honestly at the end of the window when that session never takes a turn and so never writes one. T9 asserts that outcome and its comment says it plainly.
- No user interface changed. The renderer reads `resumeCapture` and never reads `resumeProvenance.confidence`.
- The successor `codewhale` binary is not installed on this machine, so every CodeWhale measurement above is against `deepseek` 0.8.26 and the store shape the two share.
