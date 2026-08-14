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
