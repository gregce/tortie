# 33 — Durability reconciliation: the single roadmap

> **This document supersedes [26](26-tortie-durability-architecture-and-recovery.md) and [28](28-remote-sessions.md) as the durability roadmap. Both remain in the repository as evidence and are not to be edited — a committed research document is a record.** Read this for what to build and in what order. Read 26 for the exemplar extraction, the invariants and the original fault matrix; read 28 for the defect narratives and proof methods. Where this document disagrees with either, this document is the decision.

| Assessment fact | Value |
| --- | --- |
| Date | 12 August 2026 |
| Codebase adjudicated | `0b615d0` (research 31 committed; a Phase 18 chrome-layout build is editing `src/renderer/**` concurrently — every line reference below was re-grepped at `0b615d0` and renderer references may drift by a few lines) |
| Inputs | [26](26-tortie-durability-architecture-and-recovery.md) read in full (its subject); [28](28-remote-sessions.md) read in full (its partial successor); [27](27-release-and-updates.md), [29](29-context-sidebar.md), [30](30-specstory-distribution.md), [31](31-extensions.md); [The Zen of Tortie](../ZEN-OF-TORTIE.md) as the tiebreaker; `CLAUDE.md` for invariants and tiers; committed source, read-only |
| Purpose | 26 carries 30 numbered items. 28 compressed part of them into G1–G9 and **never named A8, M6, M9, B5 or B7**. 26's §12 keep/defer/cut, §13 fault matrix, §14 roadmap and §15 success measures were written before Phases 16 and 17 and have never been revisited. Two of the five unnamed items were then independently rediscovered at full cost by workflows that never cited 26. |
| Status of this document | **This is the durability roadmap. 26 and 28 are evidence behind it.** Where this document and either of them disagree, this document is the decision. Neither is superseded as *evidence*: 26 holds the exemplar extraction and the invariants; 28 holds the defect narratives, the proof methods and the remote verdict. |

---

## 0. How to read this

Three claims, and everything else follows from them.

**One item shipped out of thirty.** A1 — and only because Phase 16.5 needed it for a rename, not because durability was scheduled. That is not a criticism; it is the fact that decides the sequencing. Two independent re-verifications (28's Appendix A, and mine at `0b615d0`) reached it separately.

**Nineteen items are better specified somewhere else than in 26.** 28 restated ten of them as G1–G9 with proof methods and expected-loss ranking. 27 took A9's compatibility half and 30 took M9's version half and made both executable. For those, the successor is the place to look, and this document's job is to point there and name what the successor left behind — because **nine of the nineteen are superseded only in part**, and a half-covered item filed under "SUPERSEDED" is exactly how work disappears.

**Nine items are live and wholly unowned.** Five because 28 never mentioned them (A8, M6, B5, B7, and M9's residue), two because 28 explicitly put them below its line (M7, M8), one because 28 put it below the line and the code says that placement is wrong (B6), and two because the audit pass reopened them (B9, B10 — §0.1). One item is cut outright. §3.5 merges these nine with the nine residues and 28's G1–G9 into a single ranked queue.

A note on the SHIPPED verdict, because it is the dangerous one. Exactly one item earns it. Every other item where something real exists in the tree is recorded as SUPERSEDED or OPEN with the shipped fragment named in §4, so the fragment gets reused and the remaining work does not get retired by a plausible-sounding module name. §4 is the anti-duplication list and is the most immediately useful section here.

### 0.1 Adversarial audit pass — what it changed

A final pass re-opened every file behind every SHIPPED or partly-shipped claim and re-ran every environment measurement, looking for the three shapes that produce a false retirement: a harness that exists but gates nothing, a happy path implemented without its failure path, and one-of-several counted as all. Three verdicts moved and two claims were corrected:

1. **A1 — SHIPPED, but only on the happy path.** The failure branch tells the user nothing and then permanently disables itself. Proven by probe, not argued. §3.1.
2. **B9 and B10 — CUT reversed, both.** They rested on a single premise — "Time Machine already backs up the continuity root" — supported by two `tmutil` readings that do not mean what they were read to mean. Measured: automatic backups are **off**, the newest snapshot is **127 days old**, and the Tortie root has never been backed up once. §3.4.
3. **Corrected, without changing a verdict:** the attach-host backpressure claim (it pauses the PTY; it never detaches, and a client that has never acked has flow control switched *off* after 3 s — `attach-host.ts:390-407`), and the disk-low notice (there *is* one unprompted sample, 5 s after boot, `sessions/core.ts:492-494` — the missing caller is the post-snapshot one its own doc comment at `scrollback/watch.ts:150-153` promises).

The three verdicts that survived the hardest challenge, and should not be re-litigated: **B2**'s repricing (the `VACUUM INTO` + `DbVerification` engine is real and has been run against real 40-session user data — the marker at `~/Library/Application Support/Tortie/.userdata-migration.json` records `sessions: 41`, `ok: true`), **M2**'s split (the harness is genuinely excellent; `out/` is `.gitignore:3` and no `package` script invokes conformance, so the gate genuinely does not exist), and **B5**'s measurements (43 snapshots, all `-rw-r--r--`, zero secret matches, exactly one explicit file mode in the whole main process at `drop/store.ts:173`).

---

## 1. The thirty verdicts

| Item | Verdict | Where it now lives, in one line |
| --- | --- | --- |
| **A1** stable durability root + rename migration | **SHIPPED (happy path)** | `src/main/migrate/userdata.ts`, `smoke:migrate`, 14 + 14 tests. One clause cut, and one **P1 failure-path defect proven by probe** — see §3.1. |
| **A2** bundled pinned tmux, durable `-S` socket | SUPERSEDED | 28 **G8**, fully, plus the orphan-socket case 26 lacked. 27 §2.5 adds a measured new argument. |
| **A3** headless Tortie Host | SUPERSEDED | 28 **G3**, and improved: G3 splits out a tray-residency stage 1 that 26 did not have. |
| **A4** Host as sole mutation authority | SUPERSEDED | 28 **G3 stage 2**, partly — the versioned protocol is deferred, not specified. |
| **A5** authority matrix | SUPERSEDED | 28 **G9**, partly — G9 is one row of the matrix, sharply argued. The table itself is unowned. |
| **A6** durable restore state machine | SUPERSEDED | 28 **G5**, partly — G5 is the minimum useful slice; the full state graph is not scheduled. |
| **A7** durable spatial state | SUPERSEDED | 28 **G7**, fully. |
| **A8** versioned agent recovery contracts | **OPEN** | Nobody's. Rediscovered by 30 §2 and 31 §5.0 at full cost. **§2.1.** |
| **A9** upgrades as recovery transactions | SUPERSEDED | 27 §4 (compatibility numbers, downgrade refusal) + 28 **G2** step 3 (the pre-migration verified copy). Together, fully. |
| **A10** isolation and fault boundaries | SUPERSEDED | 28 **G8** pays down the socket half. The rest — fake provider stores, controlled clocks, fault injection, bounded shutdown — is unowned. See §7. |
| **M1** continuity certificate | SUPERSEDED | 28 **G6** item 2, partly. The narrow half already shipped (`src/renderer/app/resume.ts`). |
| **M2** conformance as a persisted release gate | SUPERSEDED | 28 **G6** item 3 + 30 §2.4 **D5**. The harness itself is shipped; persistence, isolation and enforcement are not. |
| **M3** adaptive checkpoint scheduler | SUPERSEDED | 28 **G1** + **G1a**, fully, and sharpened with a measured-RPO pass condition. |
| **M4** self-describing continuity capsules | SUPERSEDED | 28 **G4** item 4, partly — the cheap half. The reconstruction-source half is G2 step 4. |
| **M5** resume provenance chain | SUPERSEDED | 28 **G6**, fully. |
| **M6** restore preflight and verified handoff | **OPEN** | Nobody's. Two of its six checks shipped; four did not, and the post-Enter confirmation is unowned. **§2.2.** |
| **M7** Agent Attention Contract | **OPEN** | 28 put it below its line by name. Still real, still large. **§3.3.** |
| **M8** attention leases and causal dedup | **OPEN** | Same. **§3.3.** |
| **M9** safe environment fingerprint | SUPERSEDED | 30 §2.4 **D1–D4**, partly — the agent-version field and the drift surface. The rest is unowned. **§2.3.** |
| **M10** deterministic repair and reconstruction | SUPERSEDED | 28 **G2** step 4, fully. |
| **B1** critical SQLite hardening | SUPERSEDED | 28 **G2** steps 1–2, fully. |
| **B2** online generational DB recovery copies | SUPERSEDED | 28 **G2** step 3, fully — and much cheaper than 26 priced it. |
| **B3** power-loss-safe recovery objects | SUPERSEDED | 28 **G4** items 1–2, fully. |
| **B4** immutable retention | SUPERSEDED | 28 **G4** item 3, partly — snapshots only; the DB ring is G2. |
| **B5** minimise and protect sensitive recovery data | **OPEN** | Nobody's, and its shape changed. Rediscovered by 29. **It is a precondition of G1, not a follow-up. §2.4.** |
| **B6** reversible remove, restart, archive | **OPEN** | 28 put it below its line. Cheaper and more damaging than that placement implies. **§3.3.** |
| **B7** calm Recovery Centre | **OPEN** | Nobody's — and four of 28's own items post messages to it. **§2.5.** |
| **B8** selective append-only continuity journal | **CUT** | Its one load-bearing slice is G5 item 3. **§3.4.** |
| **B9** encrypted portable recovery bundle | **OPEN (below the line)** | ~~Time Machine already does this~~ — **premise falsified by measurement, see §3.4.** Reduced to an S-cost "export a verified copy" over B2's shipped engine; the encrypted archive format stays deferred. |
| **B10** user-owned off-device protection | **OPEN · XS** | ~~The OS already does it~~ — on the one machine we can measure, it does not: Time Machine `AutoBackup = 0`, last snapshot **2026‑04‑07**, destination unmountable. **§3.4.** |

**Totals: 1 SHIPPED (happy path only) · 19 SUPERSEDED · 9 OPEN · 1 CUT.**

Those totals understate the live work, and the understatement is the trap this document exists to close. **Nine of the nineteen superseded items are superseded only in part** — A4, A5, A6, A10, M1, M2, M4, M9, B4 — and the residue of each is named with an owner in §3.2 rather than left to be inferred from the word "SUPERSEDED". The honest count of live durability work is therefore **9 open items plus 9 residues**, ranked as one queue in §3.5.

---

## 2. The five orphans

These are the items no successor named. Two of them were rediscovered independently, which is the measurable cost of leaving 26 unreconciled, and the reason this document exists.

### 2.1 A8 — versioned agent recovery contracts · OPEN · cost M · Tier 3

**Restated against `0b615d0`.** The manifest has five migrations (`src/main/manifest/store.ts:436-513`) and none of them records anything about the agent beyond its id. The full picture:

- **The wrapper's version is recorded; the agent's is not.** `sessions.specstory` JSON carries `binVersion`, explicitly so "a restore after a mid-flight `brew upgrade` replays the same binary it launched with" (30 §2.2, confirmed). There is no `agent_version` column. The reasoning that justified `binVersion` applies with more force to the thing whose resume semantics are actually being relied on.
- **Restore reads the live registry for correctness-bearing data.** `src/main/restore/restore.ts:60-68` documents its own limitation in a comment: *"The manifest cannot answer this: `AgentLaunchSpec.requiresOriginalCwd` is set at launch and never persisted, so restore has to ask the registry."* The `catch` below it returns `false` for any id the registry no longer launches — and for a pi-shaped agent, `false` means restore quietly opens an empty session that looks resumed. 31 §5.0 found this independently, confirmed it by reading the tree, and made it P0 for every one of its four competing extension proposals: it is the precondition none of them could choose between.
- **Drift is the steady state, measured.** 30 §2.1 re-probed every installed agent three days after `helpVerifiedVersion` was written: **five of nine drifted**. claude 2.1.226→2.1.228, cursor 2025.09.18→2026.08.11, antigravity 1.0.2→1.1.12, qwen 0.21.7→0.21.9, pi 0.79.1→0.84.1. Every load-bearing flag survived *this time*. It broke once before (codex#21761, the reason the Phase 13.5 harness exists) and nothing in the current build would have told the user.
- **Restore does zero version checking** (30 §2.4 D4, confirmed: `src/main/restore/restore.ts` replays the recorded argv verbatim).

**Why this is the most expensive orphan.** Two unrelated workflows spent full research effort rediscovering halves of it. 30 produced D1–D5; 31 produced clause (c) of its winning proposal. Neither cited 26. Both arrived at the same instruction: **persist the contract at create time; stop reading the live registry on the restore path.**

**The fix, as the two successors already specify it.** Migration `006`: add `agent_version TEXT`, populated from `DetectedAgent.version` (already computed, already cached — no new subprocess on the create path), plus every registry field the restore path reads for correctness, starting with `requiresOriginalCwd`. `restore.ts` stops importing `getLaunchableEntry` for anything load-bearing; `agentDisplayName` may stay registry-backed because it is cosmetic and its fallback is honest. Then 30's D3 two-layer drift check and D4's one-sentence warning on the armed resume, and D5's derived conformance-staleness trigger.

**Proof method.** Fixture migrations across adapter versions: create a row under registry state X, mutate the registry to state Y (including *deleting* the agent's row), restore, assert the outcome is identical to X. `npm run conformance:resume:capture` (~16 s, no turns, no tokens) is the cheap gate CLAUDE.md already mandates for anything under `agents/registry.ts` and `manifest/**`; the full roundtrip once for the phase. Tier 3 on two counts: durability, and a claim of universality across agents.

**Sequencing.** A8 is a migration on the sessions table. So are G6 (provenance) and G7 (spatial state). Doing them as three separate migrations on a manifest with no verified copies is three chances to be wrong; doing them after G2's ring exists is the right order, and doing A8 *with* G6 is the right pairing because both are "persist what the capture actually knew".

### 2.2 M6 — restore preflight and verified handoff · OPEN · cost M · Tier 3

26 asked for six preflight checks before restore creates anything. At `0b615d0`, two exist and four do not, and the post-handoff half does not exist at all.

| M6 check | State at `0b615d0` |
| --- | --- |
| Exact cwd exists, or the user approved a provider-safe relocation | **Shipped.** `restore.ts:203-218`; `resumeNeedsOriginalCwd` (`:69`) consults the registry and refuses with an actionable message for qwen and pi. Seven tests in `restore/__tests__/cwd-guard.test.ts`. |
| Required binary exists and its version is compatible | **Half.** The *SpecStory wrapper* binary is checked and healed (`armableResumeArgv`, four tests in `capture-rearm.test.ts`). The *agent* binary is not checked at all, and no version comparison happens anywhere — that half is A8. |
| Provider record and captured identity still agree | **Absent.** Requires the provenance G6 will persist. |
| Checkpoint generation and hash are valid | **Absent.** Requires the generations G4 will create. |
| Target tmux and Tortie identities are unused | **Absent** as a preflight. Reconciliation enforces the invariant afterwards (`manifest/__tests__/reconcile.test.ts`, 14 tests including "never binds two live sessions to one row"), which is not the same thing. |
| Required credentials available without reading or storing them | **Absent**, and now interacts with 29's finding — see §2.4. |

**What is uniquely M6's, after G4, G5, G6 and A8 have each taken their piece.** Two things, and they are the reason M6 should not simply be dissolved into its neighbours:

1. **The plan before the side effects.** Today `restoreSessionInTmux` creates the tmux session first (`restore.ts:236`) and discovers problems afterwards. G5 fixes what is *reported*; it does not move the checks *before* the create. A restore that fails after creating a session leaves a wrong session behind, and G5's honest status will correctly describe a mess that need not have been made.
2. **`conversation_confirmed` after the user presses Enter.** Nothing observes the provider after the armed command is submitted. This is the one place where Tortie could turn "armed" into proof, and it is the natural consumer of the hook receiver that already exists for claude (`src/main/activity/hooks.ts`).

**Verdict.** Keep M6 as its own item, scheduled *after* G5 and A8, scoped to exactly those two things. Its other four checks are correctly absorbed. Proof method: fixtures that force each precondition to fail and assert nothing was created; then a live Tier 3 case for the confirmation path on one hook-capable agent (claude) with an explicit statement that the other ten stay at `restored_armed`, which is honest and must not be dressed up.

### 2.3 M9 — safe environment fingerprint · SUPERSEDED (partly) by 30 §2.4

30's D1 (`agent_version`) and D4 (drift warning on the armed resume) are the largest single field of M9's fingerprint and its entire user-facing surface, arrived at independently. What 30 does not carry:

- exact cwd identity and repository/worktree identity (a moved or re-cloned repo changes `realpath(cwd)`, which is the store key for five of eleven agents — 28 §1.2 measured this and it is the same fact from the other side)
- safe binary hash, shell, architecture
- names, never values, of adapter-declared required environment variables
- selected toolchain versions where an adapter needs them

**Adjudication.** The residue is real but small, and every part of it is a column on the same migration A8 already needs. Fold it into A8 as fields rather than tracking it separately; the cost of a column on a migration you are writing anyway is nearly zero, and the cost of a second migration later is not. The one part worth arguing about is the repository/worktree identity, because it is the field that would let Tortie say *"this conversation was recorded in a checkout that is no longer at this path"* — the single most likely real-world resume failure after version drift. Keep it. Drop nothing else, but do not build a separate fingerprint module.

### 2.4 B5 — minimise and protect sensitive recovery data · OPEN · **precondition of G1**

**26 framed this as protecting Tortie's own recovery data. 29 showed the larger exposure runs the other way.** Both halves are live.

*Tortie's own data, at `0b615d0`:*

- `src/main/restore/snapshots.ts:88-95` — `mkdir` with defaults and `writeFile(tmp, text, 'utf8')` with no mode. Snapshots are terminal transcripts. They land at default umask, not `0600`. The template for doing this right is already in the tree: `src/main/drop/store.ts:173` writes `{ mode: 0o600 }`.
- There is **no per-project opt-out for terminal capture**. Today that is survivable because capture happens twice a day at shutdown. **G1 makes capture continuous.** 26's Challenge 3 said exactly this — "the real change is frequency and retention" — and then B5 was never scheduled and G1 was ranked fourth without naming it as a dependency.
- `src/main/activity/hooks.ts:101` records the discipline already being applied — bodies capped, "never a line of payload in the log". That is the right instinct, applied in one place, not a policy.
- No `safeStorage` use anywhere in `src/` (grepped). Per 26 Challenge 8 that is the correct answer for local state, and it should stay the answer.

*Other people's data, per 29:* plaintext provider keys in `~/.qwen/settings.json` and `~/.deepseek/config.toml`; a bearer token in an `env` block in `~/.cursor/mcp.json`; OAuth material in `~/.gemini/antigravity-cli/antigravity-oauth-token` and `~/.codex/auth.json`. 29 §2.6 states the rule absolutely: *Tortie never renders a config value that is a credential*, with a redaction predicate at 29 §7.3. That rule belongs to the Context sidebar phase, but the *underlying* fact — Tortie's processes read directories full of live credentials — belongs to B5, because the diagnostics export and the Recovery Centre will both want to quote paths from exactly those directories.

*And 31 §5.4 adds a third surface:* `settings.json` is plain user-writable JSON with an atomic-rename write and **no integrity check**, and Tortie runs dozens of prompt-injectable agents under the same uid with write access to `$HOME`. The measured hole is narrow — `sanitizeSettings` filters `launchDefaults` against `catalogedFlags(id)`, so arbitrary argv cannot be injected — but an agent can pre-enable a *cataloged* danger flag (`--dangerously-skip-permissions`) and add its key to `dangerAcknowledged`, after which the next hotkey quick-create launches with the sandbox off, durably, with no modal. 31 files this as a bug to fix independently of any extension work. It is B5's threat model, restated: **the adversary this product uniquely has is the agent**, and B5 was written before anyone had said so.

**The fix, split by cost.**

| Part | Cost | Tier | Proof |
| --- | --- | --- | --- |
| `0600` on snapshots and their directory; audit every other write under `<userData>/gmux/` | XS | 2 | Permission assertions in `restore/__tests__`; one fixture asserting a pre-existing world-readable snapshot is tightened, not left |
| Per-project terminal-checkpoint opt-out, landed **with** G1 rather than after it | S | 2 | Setting round-trips; a session in an opted-out project produces no checkpoint file at all |
| A redaction predicate shared by diagnostics, the Recovery Centre and (later) Context — one implementation, per CLAUDE.md's grep-before-writing rule | S | 2 | 29 §7.3's key pattern plus secret fixtures drawn from the five real files 29 names |
| The `dangerAcknowledged` / `launchDefaults` quick-create hole | XS | 2 | A danger preset never auto-applies on a modal-less quick-create regardless of `dangerAcknowledged`; the acknowledgement gates the modal's friction, not the flag. 31 §5.4 specifies it. |

**The sequencing finding, stated once because it is the point of this section: B5's first two rows must land in the same phase as G1, not after it.** Shipping continuous capture before the permissions and the opt-out means shipping a product that writes more sensitive data, more often, at default umask, with no way to turn it off — and then retrofitting privacy onto files already on disk.

### 2.5 B7 — calm Recovery Centre · OPEN · cost M · Tier 2 (with Tier 3 on its triggers)

There is no Recovery Centre in the tree. What exists is its narrow ancestor: `src/renderer/app/resume.ts` (`ResumeReadiness` = `conversation | capturing | directory | none`, `restoreSummary`, `restoreActionCopy`), which tells the user before a reboot what will come back. That is real work and it earned 26's honesty score increase. It is not a repair surface.

**The finding that makes B7 urgent, which neither 26 nor 28 states: four of 28's own items have no channel to speak through.**

| Item | The message it must deliver | Where it goes today |
| --- | --- | --- |
| **G1a** (28's rank 0) | "A checkpoint failed — the disk is full. Your transcripts are not being saved." | `console.warn` in `snapshotAllSessions` (`sessions/core.ts:792`). 28's own fix text says "through the channel that later becomes the Recovery Centre" — that channel is B7 and 28 does not name it. |
| **G2** | "The manifest was damaged. The original is preserved at «path». Here is a verified copy from «time»." | Nowhere. `openGmuxDatabase` throws `FS_FAILED`. |
| **G4** | "The newest generation was torn; Tortie selected the one before it." | Nowhere. |
| **B6** | "Removed. Undo." | Nowhere; removal is a confirm dialog and a hard delete. |

**Verdict.** B7 is not a late polish item; it is the shared dependency of the first phase 28 recommends. Build the smallest version that carries a message and preserves damaged state, and build it **in Phase A with G1a**, not at the end. The Zen tiebreaker governs the scope and is unusually clear here: visible only when a layer is degraded or when the user deliberately opens it; no counters, no streaks, no health score, no ambient feed. One line when something needs a human; nothing at all when it does not. 26 §11 Challenge 10 already decided this and should not be reopened — what was wrong was the schedule, not the design.

---

## 3. The remaining twenty-five, adjudicated — and the queue they produce

### 3.1 The one that shipped

**A1 — stable durability root and rename migration · SHIPPED**

Evidence at `0b615d0`, read rather than inferred:

- `src/main/migrate/userdata.ts` (943 lines). Copy-first into `<userData>.migrating`, verified in staging before publication, published by a single atomic `rename()` when the target is absent or entry-by-entry when Chromium created it first. An in-progress marker is written *before* the first publish so an interrupted run is resumed, not mistaken for finished. Anything it must overwrite is moved into `<userData>/.pre-migration-<ts>/`, never removed. The original is opened readonly throughout, including the SQLite connections, and the database is copied by `VACUUM INTO` from a readonly connection (`userdata.ts:638`) with per-table row-count verification (`DbVerification`, `userdata.ts:179`). A denylist, not an allowlist, so future files migrate automatically. Nothing in the module can stop the app booting.
- 26's four proof requirements, matched: upgrade from the released gmux identity (`smoke:migrate`, `GMUX_SMOKE=migrate`, `index.ts:1596`, run against a populated fixture *with live tmux sessions*); interrupted-copy resume ("resumes an interrupted migration instead of treating half of it as done"); a decision when both roots hold data ("prefers the new directory when BOTH already hold data"); and no move-first or delete-first path anywhere. Plus tests for idempotence, copying committed WAL content while another connection holds the manifest open, non-SQLite `.db` byte-for-byte, and never duplicating per-instance lock files. `migrate/notice.ts` has 14 copy tests including "says the originals are still there — never 'moved'".

**One P1 defect, found by the adversarial audit pass and PROVEN by probe, not argued.** Everything above describes the success path. The failure path is silent and one-way:

1. `migrateUserData` returns `status: 'failed'` on any thrown error (`userdata.ts:509-517`) or any staging verification failure (`:431-444`). Correctly, it publishes nothing and leaves the original intact.
2. **The user is never told.** `showRenameNoticeOnce` gates on success — `notice.ts:77-80`, `if (marker?.status !== 'complete' && !migratedNow) return { shown: false, reason: 'no-migration' }`. A failed migration produces no marker (markers are written at publish time), so no dialog, no toast, nothing. The only trace is `console.log` in a terminal a shipped-app user does not have.
3. The app launches anyway (by design — `migrate/index.ts:76-88` returns rather than throws), and booting *creates* the payload the migration later refuses to overwrite: `openGmuxDatabase` does `mkdirSync(dirname(dbPath))` (`db/sqlite.ts:48`), so `<userData>/gmux/` exists from the first boot.
4. On **every** subsequent launch `hasOwnPayload(targetDir)` (`userdata.ts:875-879`) is therefore true, and the migration returns `skipped` / `target-has-data` — "leaving both directories alone" — **forever**, even after the user fixes whatever caused the failure.

Probe (independent of the repo's suites; run with a scratch vitest config, nothing written under `src/`): a legacy root holding `settings.json` + `gmux/manifest.db` plus one file at mode `000` (a Chromium file with odd permissions, a partial backup restore — nothing exotic). Result: `FIRST: failed / error / EACCES … copyfile …`; target absent, `Tortie.migrating` left behind; simulate one normal boot; fix the permission; `SECOND: skipped / target-has-data`. The 41-session manifest stays in the old root and no future launch will ever carry it.

Nothing exercises this. `grep -n "failed\|verification\|EACCES\|chmod" src/main/migrate/__tests__/userdata.test.ts src/main/migrate/smoke.ts` returns exactly one hit, and it is a success assertion (`smoke.ts:376`). All fourteen unit cases and the migrate smoke drive the happy path; the case where the test named "prefers the new directory when BOTH already hold data" fires *because the previous launch failed* is untested and is a data-abandonment shape.

Fix, and it is **XS**: (a) show the notice on `failed` too, saying plainly that data is still in the old folder and nothing was lost; (b) write an in-progress/failed marker to the target *before* the app can create its own payload, so `hasOwnPayload` never wins over an unfinished migration; (c) one test per branch. Tier 2. **This matters beyond the rename**: 28's G2 proposes generalising exactly this module into `manifest/recovery.ts` as the recurring backup engine, and a recurring backup that fails silently and then permanently disables itself is worse than none.

**One clause is CUT.** The item's title asks for a root "whose identity does not change with marketing names". It still does: `app.getPath('userData')` resolves to `~/Library/Application Support/Tortie`. Building a name-independent root now would mean a *second* migration of every user's data to remove the theoretical cost of a *third*. The harm the clause protects against is now covered by a proven, re-runnable, tested mechanism. **Reopen condition:** a second product rename, a second bundle id, or a variant build (a beta channel with its own `appId` would silently fork the continuity root — 27 §3.4 makes channels "one line away", so this is the realistic trigger).

### 3.2 Superseded, with what the successor left behind

For each, the successor is authoritative. Named here only so nothing falls between them.

- **A2 → G8 (fully).** 27 §2.5 adds a measured argument 26 did not have: `supervisor.ts:99` passes `-f <confPath>` on every call and that path is inside the bundle an update replaces; on a **cold start with the file missing, tmux silently starts a server at `history-limit 2000` instead of Tortie's 25000**, exit 0, no error. The app is already coupled to a file inside its own bundle. That is an argument for bundling and pinning, not against.
- **A3 → G3 (improved).** G3 stage 1 — hide to the tray Tortie already ships (`src/main/tray/`) instead of `app.quit()` at `index.ts:1702` — is not in 26 at all, and 28 prices it at ~80% of the loss reduction for ~5% of the effort. 26's staged extraction (domain services behind injected path/clock/process interfaces → in-process Host → signed `SMAppService` LoginItem, never a privileged LaunchDaemon) remains the correct end state and is unchanged.
- **A4 → G3 stage 2 (partly).** 28 defers the versioned protocol without respecifying it; 26 §8 A4 remains the only design (idempotency keys, monotonic sequence, snapshot-plus-delta reconnect). 28 §6.2 R2 notes the same component is what a headless Linux host would need — which is why it is cheap later and expensive now.
- **A5 → G9 (partly).** G9 is one row of the matrix — *only the machine that owns a process may assert its liveness* — argued from a data-loss shape: `sessions/core.ts:551`'s server-exit handler infers process death from transport death, producing `restorable` for a live session, and "Restore all" then starts a second agent in the same worktree. **The residue is the table itself** and its table-driven reconciliation tests. It is unowned, it is cheap (26 §8 A5 already contains the table), and it is the artefact that keeps G5, G6 and G9 from each inventing their own answer to "who is right when two sources disagree". Write it as a doc plus a test file when G5 lands.
- **A6 → G5 (partly).** G5 is items 1–2 of a three-item fix and 28 says so: `running` becomes unreachable from a partial result, the renderer reads stage results instead of the presence of `resumeArgv`. The full graph in 26 §8 A6 — `declared → live → {checkpointed, completed, lost_live_process} → …` — is not scheduled by anyone. Do not build the whole graph on spec; let G5's four stage-derived statuses be the first four nodes and grow it when a second consumer needs it.
- **A7 → G7 (fully).** 28 adds the near-miss that proves it: the Tortie rename carried `localStorage` only because `Local Storage` was absent from `SKIP_ENTRIES` — a judgement about a Chromium directory name, not a durability decision.
- **A9 → 27 §4 + G2 step 3 (fully, between them).** 27 measured the downgrade matrix against a replica of migrations 001–005 plus a hypothetical 006: additive is genuinely safe, breaking is *hit* rather than detected — the old build boots fine and throws at `insertSession`, i.e. Step 0 of session creation, the worst possible place — and the quiet hazard is an old build writing NULLs into a new load-bearing column. The answer is `PRAGMA user_version` + a `min_compatible_version` and a blocking refusal, both currently 0 and free. G2's ring supplies the pre-migration verified copy. Note the interaction with A8: **A8's migration 006 is the first one written after 27's rule exists, so it is the first that must set the compatibility numbers.**
- **A10 → G8 (partly).** "`smoke:t3` moves onto an isolated `-S` socket as part of this work" is one clause of A10. The rest — fake provider stores, controlled clocks, a fault-injection harness, bounded shutdown, renderer backpressure — is unowned and reappears in §7 as unexercised faults. `conformance:resume` still runs on the shared live server (`conformance/resume.ts:704,724` use `tmux.TMUX_SOCKET`), which is the specific instance that matters most because it creates real agent sessions.
- **M1 → G6 item 2 (partly).** The shipped narrow half is `src/renderer/app/resume.ts`. G6 makes `armed` a family and lets weakness reach the copy. The layers 26 asked for that nobody owns: `layout` (needs G7) and `external_dependencies` (needs A8/M9). Add them as fields when those land rather than as a certificate module.
- **M2 → G6 item 3 + 30 §2.4 D5 (partly).** The laboratory is shipped and is Tortie's strongest trust evidence (`src/main/conformance/resume.ts`; `conformance:resume` full roundtrip, `conformance:resume:capture` ~16 s as the per-commit gate CLAUDE.md already mandates). Three clauses remain: results are not persisted per session; the harness shares the live socket; and `GMUX_CONF_STRICT` defaults to `false` (`resume.ts:202`), so a blocked provider does not fail the run. 30's D5 supplies what 26 could not — a *derived* staleness trigger, comparing live versions against the versions recorded in the last conformance report rather than against a hand-maintained constant.
- **M3 → G1 + G1a (fully, sharpened).** Confirmed at HEAD: no capture timer exists; the only `setInterval` in `sessions/core.ts` is the status poller (`core.ts:1067`); `powerMonitor` is not referenced anywhere in `src/`. G1 adds a *measured* RPO pass condition, which is what turns 26's aspiration into a claim.
- **M4 → G4 item 4 (partly).** 28 takes the cheap half (session UUID, generation and parent, reason, cwd, line and byte counts, SHA-256) and says so. The expensive half — capsules as the source for rebuilding a lost manifest — is G2 step 4's input. Between them the item is covered; the thing to guard is that G4's metadata must be *sufficient* for G2's reconstruction, so G4 should not ship before someone has written down what G2 will need to read.
- **M5 → G6 (fully).** Confirmed: `harvest/stores.ts` produces `confidence: 'exact' | 'weak'` and grace-timer acceptance per agent; `resumeCaptureFor` (`sessions/core.ts:198-212`) derives the stored value from the capture *mechanism* alone and cannot express any of it.
- **M10 → G2 step 4 (fully).** With 28's guardrail preserved: reconstruction must not weaken identity-never-names to make itself easier; ambiguity produces a human decision.
- **B1 → G2 steps 1–2 (fully).** Confirmed: `src/main/db/sqlite.ts:51-53` sets exactly three pragmas (`journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000`) and nothing else — no `quick_check`, no quarantine.
- **B2 → G2 step 3 (fully, and repriced).** 26 priced this as new work. It is not: the `VACUUM INTO` + `DbVerification` row-count machinery is written, exercised, and was run against real 40-session user data during the rename. B2 is a scheduling problem over shipped code, and that repricing is 28's single best contribution.
- **B3 → G4 items 1–2 (fully).** Confirmed at `snapshots.ts:86-95`: tmp + rename with no `fsync` on the file, no directory sync, no hash, no `COMPLETE` marker, one destructively replaced path. `grep -rn "fsync\|fdatasync" src/main/` returns nothing.
- **B4 → G4 item 3 (partly).** Snapshots only. The database ring is G2 step 3. Keep 26's pruning invariant in both: pruning is a separate transaction that can never remove the current generation and its last verified predecessor together.

### 3.3 Open, and deliberately below the line — but not for the reasons given

**M7 — Agent Attention Contract · OPEN · cost L · Tier 3.** At `0b615d0` the detector is `src/main/activity/{monitor,state-machine,oracles,screen,process,panes}.ts` plus a loopback hook receiver that **only claude supports** (`hooks.ts:11-14`; codex hooks are deliberately unimplemented because they need `--dangerously-bypass-hook-trust`). There is no provider-neutral structured contract, no `tortie signal`, no causal IDs. 28 is right to put this below the line: it is large, and its benefit is fidelity rather than loss prevention. One caveat for whoever picks it up — 26 §9 M7's external references (A2A task lifecycle, ACP session updates, Codex app-server) are a year of protocol churn old and must be re-verified live before any of them is designed against.

**M8 — leases and causal dedup · OPEN · cost M · Tier 3.** The local substitute already exists and works: `state-machine.ts:44` requires consecutive captures with the dialog gone before releasing `needs_input`, and `:239-286` handles the user's own keystroke as a release. That is a well-tuned heuristic, not a lease. Expiry-to-`unknown` (rather than to `idle`) is the one clause worth extracting early and cheaply, because it is the same honesty principle as G9 applied to attention rather than to liveness. **Do that clause with G9; leave the rest below the line.**

**B6 — reversible remove, restart, archive · OPEN · cost S–M · Tier 3.** 28 put this in its tail. I disagree with the placement, and the code is why. `src/renderer/state/store.ts:880-899` at `0b615d0` (Phase 18 has moved it to `:976` in the working tree — re-grep, do not trust the number): `restartSession` calls `discard(sessionId)` **first**, then creates a replacement with only `{name, projectPath, cwd, agent}`. The comment above the call states the reason for the order — *"so the restarted session takes back its name"* — which is a display-name collision traded against a lost snapshot. Two defects, both confirmed at HEAD:

1. If the create fails, the user's recovery path is already gone — the row and its snapshot were deleted to free the name.
2. The replacement silently drops the original launch flags (`extraArgs`) and the SpecStory capture choice. A session restarted after Phase 15 stops being captured, and nothing says so.

That is data loss and silent capability loss, from a button, on a path with no undo. It is Tier 3 by CLAUDE.md ("anything that can lose or destroy user data") and it is small. **Move it up: pair it with G5**, since both are about not lying to the user about what a lifecycle operation actually did, and both touch the same status plumbing. The tombstone-plus-undo half can wait for B7's channel; the transactional restart cannot.

### 3.4 Cut — and two cuts the audit pass reopened

**B8 — selective append-only continuity journal · CUT.** Its one load-bearing slice is already scheduled as G5 item 3 ("journal the restore attempt before acting, so a crash between stages resumes or rolls back rather than skipping to healthy"), and G2 step 4's reconstruction reads capsules and tmux stamps, not a journal. What remains is a general audit log with previous-event hashes for a product with one user and no compliance requirement. 26 itself warned against event-sourcing ordinary state; a journal nobody reads is the same mistake wearing a durability hat. **Reopen when:** a reconstruction case is found that capsules plus tmux stamps genuinely cannot resolve, or Tortie acquires a user who must answer "what happened to this session" after the fact.

**B9 and B10 — REOPENED by the audit pass. Both cuts rested on one premise, and the premise is false.**

The premise was "Time Machine already backs up `~/Library/Application Support/Tortie`". The evidence offered for it was `tmutil isexcluded` returning `[Included]` and `tmutil destinationinfo` naming a destination. Neither statement means a backup exists. `[Included]` means *not excluded*; a destination means *configured*. Measured on the operator's machine on 2026‑08‑12, read-only:

```
tmutil latestbackup       → Failed to mount destination (Code=19)
AutoBackup                → 0                       (automatic backups OFF)
last SnapshotDate         → 2026-04-07 10:55:34     (127 days ago)
RESULT                    → 101 · "Insufficient battery power remaining (12%)"
tmutil listlocalsnapshots / → (none)
```

The rename to Tortie happened on 2026‑08‑09/12. The last Time Machine snapshot predates it by four months, so **`~/Library/Application Support/Tortie` has never been backed up at all**, and the newest off-device copy of the legacy root is 127 days and roughly 40 sessions stale. The one user we can measure has no off-device protection for any Tortie state.

A second, machine-independent objection stands even when Time Machine *is* running. It copies `manifest.db`, `manifest.db-wal` and `manifest.db-shm` as three ordinary files read at three different instants. That is precisely the torn three-file copy `userdata.ts:589-597` documents as unsafe and refuses to perform — the reason `copyDatabase` takes a `VACUUM INTO` snapshot instead. Measured now: `manifest.db` is 69,632 bytes last written 10:23 and `manifest.db-wal` is 3,946,992 bytes last written 13:56, so **every manifest write of the last three and a half hours exists only in the WAL**. Tortie's own code says you may not back that up with `cp`.

- **B10 · OPEN · XS · Tier 1.** Not a cloud, not tenancy — 28 §1.2's posture holds. What is owed is honesty: Tortie must not silently assume off-device protection it has not observed. Minimum: read the last verified recovery point (B4's second clause) and, once, say plainly whether anything outside this machine holds a copy. One `tmutil latestbackup` call is a legitimate read; so is simply refusing to make the claim. Proof: assert the stated date matches `tmutil`, and that the copy degrades honestly when the destination is unreachable.
- **B9 · OPEN, below the line · repriced S for its useful half.** The clean-Mac scenario now has no answer at all. But the answer is not a bespoke encrypted archive format (L, and machinery the Zen would not thank us for). It is **"Export a copy" over B2's already-shipped engine**: `VACUUM INTO` from a readonly connection plus `DbVerification` row counts (`userdata.ts:604-670`), the snapshots directory, and `settings.json`, written wherever the user points it — consistent by construction, unlike Time Machine's copy. Gate it behind G2 as the B-series pass argued: exporting generations nobody has verified converts an integrity gap into a portable one. The encryption, the version inventory (which must carry A8's agent versions, not just Tortie's) and the import side stay deferred. **Reopen the full bundle when:** Tortie owns durable state outside userData, or a second user exists.

---

### 3.5 The reconciled OPEN queue — one ranked list

28's G1–G9 merged with everything still live from 26, **deduplicated to one entry per defect**, ranked by expected loss to the user rather than by cost or by section order. Where 26 and 28 described the same defect in different words, the entry says so and 26's label is retired. Phase letters map to §8's sequence.

| # | Entry (merged ids) | The defect, in one line | Cost | Tier | Proof method | Ph |
| ---: | --- | --- | :--: | :--: | --- | :--: |
| 1 | **G1a** ≡ 26 B7's notice channel | `snapshotAllSessions` swallows ENOSPC into `console.warn` (`core.ts:792-797`): protection silently stops and nothing says so | XS | 2 | Fill a loopback image, run a capture pass, assert exactly one notice and no success reported | A |
| 2 | **G5 + A6** — *same defect, two names* | `core.ts:832` discards `replayed`/`armedCommand`; `:836-841` writes `running`. A restore whose replay and arming both threw reads as healthy | S | 2 | Force each stage to throw; assert the stored status is never `running`. **Roadmap Gate 0's exit test** | A |
| 2b | **A6's journal half** (inside G5, at risk of trim) | The attempt is not journalled before acting, so a crash mid-restore neither resumes nor rolls back | M | 3 | `SIGKILL` between each pair of stage transitions; assert the next launch neither duplicates nor overstates | A |
| 3 | **B6(a)** — 28 ranked this in its tail; the code says that is wrong | `restartSession` calls `discard()` **before** `create()` (`store.ts:880-899` at HEAD; `:976` in Phase 18's tree), and drops `extraArgs` + capture choice | XS | 3 | Force `create` to throw at each failure point; assert row, snapshot and hook settings all survive | A |
| 3b | **A1's failure path** — the one SHIPPED item's residue (§3.1) | A failed migration tells the user nothing, then `hasOwnPayload` permanently disables the retry. Proven by probe | XS | 2 | Probe already written (§3.1): fail the copy, boot once, fix the cause, assert the second run still migrates. **Fix before G2 generalises this module** | A |
| 4 | **G2 step 1 + B1** | No `quick_check` anywhere; SQLite's default init writes over a damaged file the user still needs | XS | 3 | Corrupt a fixture DB; assert quarantine-rename, not a read-write open. **Split from the rest of G2 — it is independent and unrecoverable** | C→A |
| 5 | **G4 + B3 + M4's dropped fields** | `snapshots.ts:82-98` is tmp+rename with a fixed per-session temp name, no fsync, no hash, no generation, destructive replace | M | 3 | Power-cut simulation; assert no torn publish. **Carry M4's recipes/versions in the capsule at build time** — G2's reconstruction is unbuildable without them | A |
| 6 | **B5(a)(b)** — 26-only, rediscovered by 29 | Modes inherited from umask everywhere but `drop/store.ts:173`; no per-project capture opt-out; 500-line floor with no off switch | XS+S | 2 | Assert modes on every file under the root after create/snapshot/quit; secret-fixture test with capture off. **Precondition of #7, not a follow-up** | B |
| 7 | **G1 + M3** | No scheduler, no `powerMonitor`; every capture point is a shutdown event, and `%exit` fires after the server is dead | M | 3 | `smoke:checkpoint` — SIGKILL at a random point, **measure byte distance from last checkpoint to true tail** | B |
| 8 | **G2 steps 2–4 + B2 + M10** | No verified ring, no `FULL` on critical commits, no reconstruction. B2's engine already exists in `migrate/userdata.ts` — this is scheduling, not new code | M | 3 | Interrupt the prune; assert ≥1 verified predecessor survives (B4's dropped invariant). Reconstruct from capsules + tmux stamps into an empty manifest | C |
| 9 | **G9 + A5 + M8's expiry clause** | Transport loss reads as process loss; `SessionStatus` has no `unknown`. **One union change serves all three — do it once** | M | 3 | Sever the control connection with the server demonstrably alive; assert never `restorable`, no second spawn under "Restore all". Table-driven disagreement tests = A5's matrix | C |
| 10 | **A8 + G6 + M5 + M9's residue** — *28 has no A8, and G6 cannot be built without it* | No `adapter_version`, no `agent_version`, `requiresOriginalCwd` never persisted (`restore.ts:67-68` documents its own defect); harvest confidence discarded | M | 3 | `conformance:resume:capture` (mandated gate); flip a registry flag and assert restore obeys the **row**; per-agent version matrix. **One migration with G6 — see §2.1** | D |
| 11 | **C′ — the general fault harness** | Every harness quits politely; no `SIGKILL` of the app exists anywhere | M | 3 | One SIGKILL-at-random-point-and-relaunch harness on an isolated `-S` socket. **Lights up 7 matrix rows at once** (§7.1) | C′ |
| 12 | **B7 minimal + B4's second clause** | Four of 28's own items post messages to a surface that does not exist; nothing can state the last verified recovery point | S | 2 | Extend `EVT_SCROLLBACK_NOTICE` with one `kind` per degraded state; screenshot read. **Not a dashboard** (§2.5) | A |
| 13 | **M6a–d** — 26-only | Agent binary unchecked at preflight (the SpecStory sibling one level up already does it); no plan before `tmux.createSession`; no `conversation_confirmed` after Enter | XS→M | 2/3 | Move the agent binary out of PATH, assert refusal with **no armed line typed**; run the harness's own recall assertion against a user session | E |
| 14 | **G3 stage 1** | `index.ts:1702-1704` `window-all-closed → app.quit()`; rows 15–16 are structurally untestable until something is alive to observe them | S | 2/3 | Close the window, exit an agent, assert the receipt lands | B |
| 15 | **G7 + A7** | Tab order, active project and active session live in `localStorage`; they survived the rename because the denylist is generous, not by decision | S | 2 | **Scope to the place, not the pixels** (§3.2) — halves the cost and removes the objection | D |
| 16 | **M2's residue + 30 D5** | Harness shipped and excellent; the gate is not persisted, not isolated, not enforced, and nothing reads the report | S+M | 2/3 | Assert the emitted JSON names an agent version; downgrade one CLI and assert the report is declared stale **and** the product's promise visibly downgrades | D |
| 17 | **B10** — reopened by the audit pass | Tortie must not assume off-device protection it has not observed; on the one machine measurable, none exists | XS | 1 | Assert the stated date matches `tmutil`, and that the claim degrades honestly when the destination is unreachable | A |
| 18 | **G8 + A2 + A10's socket half** | System tmux, `-L` under `TMPDIR`, no orphan-socket detection. **Split: orphan detection is S/Tier 2 and lands early; bundling is L and sits behind signing** | S / L | 2 / 3 | Unlink the socket pathname with the server alive; assert detection, not a silent empty world | C / F |
| 19 | **G3 stage 2 + A3 + A4** | No Host. A4's idempotency keys and sequences are **acceptance criteria on this entry, not a separate item** — retrofitting them later is a breaking protocol change | L | 3 | As 28 specifies. Prerequisite, and cheap: **inject the continuity root** instead of reading `app` in `store.ts:19` / `snapshots.ts:18` (S, Tier 1) | F |
| 20 | **B9's useful half** — reopened, repriced L→S | "Export a verified copy" over B2's shipped engine. Gated behind #8: exporting unverified generations converts an integrity gap into a portable one | S | 3 | Import onto a machine with no provider auth and a different local path; enumerate what did *not* come back (matrix row 29) | — |
| 21 | **M7, M8 (remainder), B6(b)** | Provider-neutral attention contract; leases and causal IDs; tombstone plus bounded undo. Correctly below the line | L / M | 3 | — | — |

**Three dedup notes, so nobody schedules the same work twice.** (a) 26's M3 and 28's G1 are one defect; G1's wording wins because it names the trigger (last healthy heartbeat, not `%exit`) and the measurement. (b) 26's M5 and 28's G6 are one defect; G6 wins because it names the adversary. (c) 26's A6 and 28's G5 are one defect with two halves that price very differently — entries 2 and 2b above — and G5 ships without closing A6 if 2b is dropped.

**One cross-cutting schema fact.** Entries 2, 9 and 21 all land on `SessionStatus` (`src/shared/types.ts:22-27`, five members, no `unknown`). One union change, one phase — not three.

---

## 4. Already built — do not rebuild

The single most reusable output of this reconciliation. Every row is code that exists at `0b615d0` and that a future durability phase would otherwise write again.

| You are about to build | It already exists here | What it gives you |
| --- | --- | --- |
| Verified online database copies (**B2 / G2 step 3**) | `src/main/migrate/userdata.ts:591-660` (`VACUUM INTO` from a readonly connection), `:179` (`DbVerification` per-table row counts), `:745` (`verifyStaging`) | The whole engine. Generalise it out of `migrate/` into `manifest/recovery.ts`; do not write a `db.backup()` path from scratch. Exercised against real user data — the marker records `sessions: 41`, `ok: true`. **Reuse the copy and verify engine; do NOT reuse its failure semantics** — see §3.1, where a failure is silent and then permanently self-disabling. A recurring backup with that behaviour is worse than none. |
| Anywhere you need a pragma or a migration (**B1 / A8 / A9**) | `src/main/db/sqlite.ts` — one opener, one pragma set, one name-keyed migration runner, each step in an immediate transaction | CLAUDE.md's rule and the module's own header: the copies had already drifted once. Every change goes through here. |
| Atomic-ish file replacement (**B3 / G4**) | `src/main/restore/snapshots.ts:86-95` tmp+rename; `src/main/drop/store.ts:173` `{ mode: 0o600 }` | The rename half is right and the mode template is right — they are just in different files. G4 needs both plus `fsync`. |
| "Will this session's conversation come back?" (**M1 narrow half**) | `src/renderer/app/resume.ts` — `ResumeReadiness`, `resumeMarkLabel`, `resumeNote`, `restoreSummary`, `restoreActionCopy` | The presentation model G6 must extend, not replace. It is already honest about four states; G6 splits the strongest one. |
| Proving a resume actually resumed (**M2**) | `src/main/conformance/resume.ts` + `cases.ts` + `report.ts`; `npm run conformance:resume`, `conformance:resume:capture` | Real create → nonce → capture → kill → restore → marker-turn through Tortie's own path. A replayed transcript cannot pass it. |
| Refusing an unsafe cwd substitution (**M6 check 1**) | `src/main/restore/restore.ts:69` + `:203-218`; 7 tests in `cwd-guard.test.ts` | Registry-driven, not a hardcoded list. The pattern A8 should follow — except reading the manifest instead of the registry. |
| Healing a dead recorded binary path (**M6 check 2, wrapper only**) | `armableResumeArgv`, `restore.ts:134`; 4 tests in `capture-rearm.test.ts` | Including the rename case. The agent-binary equivalent does not exist and is A8. |
| A place to live when the window closes (**G3 stage 1**) | `src/main/tray/` (`index.ts`, `attention.ts`, `disposeTray()`) | The tray is built. G3 stage 1 is changing `index.ts:1702` and keeping `GmuxCore` alive, not building a tray. |
| Not logging secrets (**B5**) | `src/main/activity/hooks.ts:101` — bodies capped, never a payload line in the log | The discipline exists in one module. B5 turns it into a shared predicate. |
| Identity reconciliation you must not weaken (**M10 / G2 step 4**) | `src/main/manifest/store.ts:776-800` (`reconcile`, claiming only by `gmuxId`) + `manifest/__tests__/reconcile.test.ts` (15 cases) | Including "ignores a session stamped with an id from another manifest" and "does NOT adopt a foreign session that took the row name". |
| Two same-agent sessions in one directory (**G6 fixtures**) | `manifest/__tests__/harvest.test.ts` — "separates two muse sessions sharing one directory", "picks the session that started with THIS pane", "accepts an unclassifiable rollout only after the grace period" | The adversarial cases G6 needs partly exist as *capture* tests. G6 adds the assertion that the resulting confidence is stored. |
| Deterministic SQLite concurrency faults (**G2 fixtures**) | `src/main/db/__tests__/sqlite.test.ts` — reproduces `SQLITE_BUSY_SNAPSHOT` in worker threads and pins the IMMEDIATE-transaction fix | The precedent for how to write G2's truncated-page and removed-WAL fixtures. |

---

## 5. §11 adversarial review, re-adjudicated

All twelve verdicts still hold. Three gained decisive new evidence; two need their *schedule* corrected, not their conclusion.

| Challenge | 26's verdict | Now |
| --- | --- | --- |
| 1 — a background Host may be theatre | Keep, staged | **Holds; staging corrected.** 28 inserts a stage 0 (tray residency) that 26 did not consider, worth ~80% of the loss for ~5% of the effort. 26's three-stage extraction remains the end state. |
| 2 — four truths create ambiguity | Narrow and sequence | **Holds.** The pressure point is now concrete: G2 step 4's reconstruction is where someone will be tempted to match on names. Both 26 and 28 forbid it; A5's residual matrix is what makes the rule testable. |
| 3 — continuous snapshots become surveillance | Keep, with permissions, bounds, opt-out | **Holds, and is now the most urgent unscheduled thing in §11.** Every mitigation it names is B5, B5 was never scheduled, and G1 is queued fourth. See §2.4. |
| 4 — checksums create false confidence | Keep hashes, separate semantic verification | **Holds.** G4 (hashes) and G6 (semantics) implement exactly the split, in that order. |
| 5 — exact resume depends on private provider formats | Keep, make support empirical and versioned | **Holds, and is now measurable.** 30 §2.1: five of nine agents drifted in three days. "Capability expires when the installed CLI changes" was unimplementable when 26 wrote it and is implementable now via 30's D3/D5 — but only after A8 records what the session launched under. |
| 6 — auto-submit would feel seamless | Cut auto-submission | **Holds. Settled twice** (26 §11.6, 28 §1.5). Do not reopen. |
| 7 — native process checkpointing | Cut | **Holds, reinforced from an unexpected direction.** 28 §3: every sandbox vendor's "persistence" is snapshot-and-recreate of the disk, not process continuity. The industry has not solved what CRIU could not. |
| 8 — encrypt all local state | Permissions and minimisation at P0; encryption for portable bundles | **Holds, emphasis moved.** 29 shows the near-term risk is Tortie *displaying* other people's credentials, not failing to encrypt its own. The "encryption for portable bundles" clause has no consumer *yet* — B9's reopened half (§3.4) is an unencrypted verified copy the user places themselves, and encryption re-enters only if the full bundle is ever built. |
| 9 — off-device backup becomes a cloud product | Local-first, account-free | **Holds, hardened.** 28 §1.2 independently reached "no, and not later either", with the €4.35/month arithmetic and the finding that five of eleven agents key their store to `realpath(cwd)` in a home directory. |
| 10 — recovery UI becomes a dashboard | Keep a small Recovery Centre behind degradation | **Verdict holds; schedule was wrong.** 26 got the design right and then never scheduled it, and four of 28's items now need it. §2.5. |
| 11 — bundling tmux is a maintenance burden | Keep bundling, accept the obligation | **Holds, with a measured new argument.** 27 §2.5: the app is *already* coupled to a file inside its own bundle (`-f <confPath>`), and losing it silently drops `history-limit` to 2000 on a cold start. |
| 12 — workspace backup completes the promise | Cut repository backup from the core | **Holds.** 28 §5.2's dirty-tree seam is the same conclusion from the remote side. |

**One challenge 26 did not make, and should have:** *a durability roadmap that nobody schedules is indistinguishable from no roadmap.* Thirty items, four gates, one shipped in a year of phases — and two items rediscovered from scratch by workflows that had 26 available. The structural fix is not more items; it is that this document exists, is singular, and is short enough to be re-read before each phase.

---

## 6. §12 keep / defer / cut, re-cut

**The framing that has to change first.** §12's "Keep now" is described as *the minimum honest public durability release* — fourteen items gated on a public launch. There is no public launch, there is no update feed (27 §1.3: self-update is structurally impossible until the app is signed), and there is one user, who is the operator. Gating durability work on a launch that is not scheduled is what produced a year with one item shipped. **Re-cut against a different question: what loses the operator's work this month, and what would make the answer knowable.**

| 26 §12 line | Still holds? | Now |
| --- | --- | --- |
| Keep now 1 — stable root + rename migration | **Shipped** | A1. Done. |
| Keep now 2 — bundled pinned tmux, no-kill socket transition | Yes, but late | G8, phase E. 27 §2.5 strengthens the case; nothing makes it urgent. |
| Keep now 3 — authority matrix + typed restore state machine | Yes, **split** | G5 now (the truthfulness slice); A5's matrix as a doc+test with it; the full state graph not on spec. |
| Keep now 4 — versioned adapter contracts + provenance | Yes, **and it is the biggest unowned item** | A8 + G6, together, one migration. §2.1. |
| Keep now 5 — persisted, isolated, release-enforced conformance | **Overtaken** | Demoted to G6 item 3 + 30's D5. The harness is shipped; the enforcement clause has no release to enforce against yet. |
| Keep now 6 — adaptive checkpoints + versioned capsules | Yes | G1 + G4. **Add B5's first two rows to the same phase.** §2.4. |
| Keep now 7 — restore preflight, staged outcomes, confirmed handoff | Yes, **split three ways** | G5 (staged outcomes) now; M6 (preflight-before-create, post-Enter confirmation) after A8. §2.2. |
| Keep now 8 — `synchronous=FULL` + integrity checks | Yes | G2 steps 1–2. |
| Keep now 9 — verified generational DB copies | Yes, **much cheaper than priced** | G2 step 3, over shipped code. §4. |
| Keep now 10 — power-loss-safe writes and retention | Yes | G4. |
| Keep now 11 — reversible remove and transactional restart | Yes, **promote** | B6. 28's tail placement understates it; the restart path can destroy the recovery row before proving the replacement. §3.3. |
| Keep now 12 — calm Recovery Centre | Yes, **promote hard** | B7 is a dependency of Phase A, not a finale. §2.5. |
| Keep now 13 — isolated sockets, roots, providers, fault injection | Yes, **and it is the least-covered item in the whole set** | A10 residue. §7 names every fault nothing exercises. |
| Keep now 14 — packaging, signing, notarisation, upgrade compatibility | Yes, **and far cheaper than 26 knew** | 27 §0.1: a Developer ID Application certificate already exists on this machine, valid to 2031, with an App Store Connect key beside it. `BUILD-STATUS.md` and `electron-builder.yml` both say otherwise and are stale. The only missing credential is an issuer UUID. This is its own phase, not a durability item. |
| Keep next 1 — Host + protocol | Yes, **stage 1 promoted** | G3. |
| Keep next 2 — spatial state + hot exit | Yes | G7. |
| Keep next 3 — attention contract, leases, causal IDs | Yes, below the line | M7/M8, minus the expiry-to-`unknown` clause, which rides with G9. §3.3. |
| Keep next 4 — environment fingerprint + drift repair | **Partly promoted** | The agent-version field and the drift surface become fields on A8's migration (30 D1–D4). §2.3. |
| Keep next 5 — deterministic reconstruction | **Promoted to now** | G2 step 4. |
| Keep next 6 — continuity journal | **Cut** | §3.4. |
| Keep next 7 — encrypted portable bundle | **Cut** | §3.4. |
| Keep next 8 — off-device destination | **Cut** | §3.4. |
| Defer 1 — remote attachment | **Adjudicated in full** | 28: yes, as SSH attach to a machine the user owns; never as operated infrastructure; behind local phases A–C; and behind R0.5 first measuring whether the real complaint is "my laptop slept" (whose fix is `caffeinate` plus honest labelling, one day). |
| Defer 2–5, 7, 8 — raw PTY recording, provider-store archival, cross-device rebinding, dirty-workspace backup, VM capsules, recovery briefs | Yes, unchanged | 28 §3 adds evidence against VM/sandbox capsules; 28 §5.2 adds the dirty-tree seam. |
| Defer 6 — hosted Tortie backup service | **Upgraded to a cut** | 28 §1.2: "No, and not later either." |
| Cut 1–10 | All hold | Auto-execution re-affirmed twice. **Add four:** a Tortie-operated fleet (28 §6.2), the general continuity journal, the portable bundle, off-device generations. |

---

## 7. §13 fault matrix — coverage audit

**This is 26's most reusable artefact, and it has never been checked against the harnesses.** The harnesses in question: `smoke:t1` (create in one process, assert survival + reattach + kill in a second), `smoke:t3` (create with known scrollback, kill the *session* out-of-band, restorable → restore → armed; runs a claude and a non-claude shape), `smoke:capture` (SpecStory wrap), `smoke:identity` (external rename, foreign squatter, kill, stale-row reconcile, pane markers, external SIGTERM as signal), `smoke:procid` (process ownership and reap), `smoke:migrate` (rename against a populated fixture with live tmux), `conformance:resume` (per-agent nonce → capture → kill → restore → marker turn), plus the unit suites named in §4.

| # | Matrix row | Coverage | What actually exercises it |
| --- | --- | --- | --- |
| 1 | Before declaration commit — kill creator | **none** | — |
| 2 | After declaration, before spawn — kill creator | **none** | `reconcile.test.ts` covers the *steady-state* stale row, not a kill at this boundary |
| 3 | After spawn, before UUID stamp — kill creator | **none** | — |
| 4 | After UUID stamp, before launch record — kill creator | **none** | — |
| 5 | During provider-ID harvest — hide enumeration / delay store write | partial | `harvest.test.ts`: grace-period acceptance, ppid-chain walk, "waits rather than guessing". Asserts *capture*; nothing asserts the stored confidence, because none is stored (G6) |
| 6 | Two same-provider agents — interleave store writes | partial | `harvest.test.ts` "separates two muse sessions sharing one directory". Not covered for claude/qwen/cursor, which is where the `realpath(cwd)` collision actually bites |
| 7 | Missing original cwd — restore qwen or pi | **covered** (unit) | `cwd-guard.test.ts`, 7 cases, registry-driven. Not run as a Tier 3 injected fault, but the invariant is asserted |
| 8 | Missing or changed binary — restore | partial | `capture-rearm.test.ts` covers the *SpecStory* binary including the rename. The **agent** binary is unchecked (A8) |
| 9 | During checkpoint write — kill or power loss | **none** | — |
| 10 | During database backup — kill | **none** (n/a today) | No backup path exists |
| 11 | During migration — kill app | partial | `userdata.test.ts` "resumes an interrupted migration" covers the *userData* migration. **Schema** migration interruption is untested |
| 12 | During each restore stage — kill app/tmux client | **none** | — |
| 13 | After command armed — reopen UI | partial | `smoke:t3` asserts the armed line exists. Reopen-without-duplicating-it is untested |
| 14 | After user submits resume — provider rejects ID | **none** | `conformance:resume` proves the *success* path only |
| 15 | Clean process exit while UI is closed | **none**, and known-broken | `remain-on-exit failed` leaves no receipt; the row is later misclassified `restorable` |
| 16 | Failed process while UI is closed | partial | `smoke:identity` records an external SIGTERM as a signal — with the UI **running** |
| 17 | Electron crash — kill renderer and main | **none** | `smoke:t1`'s two-process shape is an *orderly* quit. No `SIGKILL` anywhere |
| 18 | Host crash | n/a | No Host |
| 19 | tmux **server** loss — kill server | **none** | `smoke:t3` kills the *session*, not the server. The `%exit` path at `core.ts:551` is never exercised |
| 20 | Reboot — kill all user processes | **none** automated | Simulated by `smoke:t3`'s session kill; the real thing is the operator's `docs/ACCEPTANCE.md` |
| 21 | Socket pathname removed while server lives | **none** | G8's orphan case |
| 22 | Manifest corruption | **none** | No fixture produces a damaged database |
| 23 | Empty manifest with live sessions | partial | `reconcile.test.ts` proves foreign sessions are left alone. Nothing covers the whole-database-empty case, which is the one that strands every session at once |
| 24 | Disk full | **none** | G1a; today `snapshotAllSessions` (`core.ts:792`) swallows ENOSPC into `console.warn` |
| 25 | Permission denial on root or provider store | **none** | — |
| 26 | Product rename over existing state | **covered** | `smoke:migrate` + 14 (`userdata.test.ts`) + 14 (`notice.test.ts`) unit cases. The only row covered at harness tier — and even here the coverage is happy-path only: one hit for `failed`/`verification`/`EACCES` across both suites, and it is a success assertion (§3.1) |
| 27 | Upgrade with live sessions | **none** | 27 §0.2 makes it a precondition of the first update: installed twice, session-id list byte-identical |
| 28 | Renderer backpressure | **none** | — |
| 29 | Restore on a clean Mac from a bundle | **none** | Reopened (B9, §3.4). Once "export a verified copy" exists: import onto a machine with no provider auth and a different local path, and enumerate what did *not* come back. |

**Score: 2 rows covered, 6 partial, 20 unexercised, 1 not applicable.**

One row the matrix should gain from the audit pass, because it is the fault that produced the A1 defect and it generalises to every item in the G2 family: **"a recovery mechanism fails" — the copy, the checkpoint or the migration itself errors. Expected: the user is told in the same breath, and the mechanism stays armed for the next attempt rather than disabling itself.** Today, exercised nowhere, and `migrate/userdata.ts` fails both halves (§3.1).

### 7.1 The faults nothing currently exercises

Named explicitly, because this is the list a fault-harness phase should be built from. Ordered by what a failure costs the user.

1. **Any `SIGKILL` of the app, anywhere.** Rows 1–4, 9, 12, 17. Every harness quits politely. The entire crash-safety story is untested, and it is the story the product is sold on. One `SIGKILL`-at-a-random-point harness with a relaunch-and-assert phase would light up seven rows at once, and 28's proposed `smoke:checkpoint` is already that shape — **build it as a general fault harness, not as a checkpoint harness**.
2. **Killing the tmux server** (row 19). The T2 path — the one `%exit` handler at `core.ts:551` whose own comment concedes its captures "fail harmlessly" — has never been run. `smoke:t3` kills a session, which takes a different code path.
3. **Disk full** (row 24) and **permission denial** (row 25). Neither has ever been simulated; the ENOSPC path is measurably wrong today.
4. **Manifest corruption and the empty manifest** (rows 22–23). No fixture in the tree produces a damaged database. `sqlite.test.ts` proves the worker-thread pattern that would make these deterministic.
5. **Restore-stage interruption and provider rejection** (rows 12, 14). Everything about restore that is tested tests the happy path.
6. **Clean exit and failure while the UI is closed** (rows 15–16). Structurally untestable until G3 stage 1 gives Tortie a process that is still alive to observe them — which is an argument for G3 stage 1 that 28 does not make.
7. **Upgrade with live sessions** (row 27) and **socket pathname removal** (row 21). Both are 27/G8 preconditions.
8. **Renderer backpressure** (row 28). Never considered outside 26.

### 7.2 Rows the matrix is missing

Proved necessary by work done after 26. Add them.

| Boundary | Injected failure | Required invariant | Source |
| --- | --- | --- | --- |
| Transport loss on a healthy server | Sever the control connection while the server is demonstrably alive | Never `restorable`; no snapshot-on-exit path runs; no restore affordance appears; no second spawn under a forced "Restore all" | 28 G9 |
| Checkpoint write on a full disk | Fill a loopback image, run a capture pass | One degraded-protection notice, exactly once; no successful state reported | 28 G1a |
| Cold start with the bundled conf missing | Delete `resources/gmux-tmux.conf`, start with no server running | Refuse or repair — never a silent `history-limit 2000` server | 27 §2.5 |
| Second app instance | Launch while one is running (every updater relaunches) | One instance owns the continuity root; the second defers or focuses. No lock exists anywhere in `src/main/` today | 27 §2.7 |
| Agent CLI upgraded between launch and restore | Bump the agent binary, then restore | Still armed, never rewritten, with one sentence naming the recorded version and the store path | 30 §2.4 D4 |
| Registry row removed after create | Delete the agent's registry entry, restore a session that used it | `requiresOriginalCwd` and every other correctness-bearing field come from the manifest; the pi-shaped silent-empty-session case cannot occur | 31 §5.0 |
| Agent writes `settings.json` | Have an agent add a cataloged danger flag to `launchDefaults` plus its key to `dangerAcknowledged` | The next hotkey quick-create does **not** launch with the sandbox off without a modal | 31 §5.4 |

---

## 8. §14 roadmap — what actually happened

26's roadmap was four gates. Here is the honest accounting at `0b615d0`, four days after it was written.

**Gate 0 — "make current claims honest" (horizon: immediate). Not met.** Its exit test is *"no UI state or documentation uses a stronger recovery verb than the stored evidence permits"*, and it fails at one line: `sessions/core.ts:832-839` destructures `replayed` and `armedCommand` out of existence and writes `status: 'running'`. Of five bullets: the shipped readiness distinction was already true when 26 was written (it is not progress); partial restore still reports `running`; capture provenance is still not persisted; documentation was largely corrected, but by the rename work and `docs/research/32-phase18-name-audit.md` rather than by Gate 0.

**Gates 1, 2, 3, 4 — not started.** No stable-root work beyond A1, no pinned tmux, no state machine, no checkpoints, no capsules, no SQLite integrity, no recovery ring, no reversible deletion, no Recovery Centre, no Host, no spatial state, no export.

**What happened instead, and whether it was right.** Phase 16.5 (the rename plus A1's migration), Phase 17 (install at `/Applications/Tortie.app`), Phase 18 (chrome layout, user-reported, running now), and five research documents totalling ~660 KB: 27 release/update/CI, 28 remote plus the durability re-ranking, 29 the Context sidebar, 30 SpecStory distribution and agent drift, 31 extensibility.

That was not wasted. 27 turned A9 and the packaging half of §12's line 14 into executable specs and found a Developer ID certificate everyone believed did not exist. 28 turned ten items into ranked defects with proof methods and repriced B2 from "new work" to "a scheduling problem over shipped code". 30 measured drift at five of nine agents in three days. But **five research documents landed and zero durability items shipped**, and two of them rediscovered 26 items at full cost. The roadmap's failure mode was not that it was wrong; it was that it was 30 items long, gated on a public release that is not scheduled, and never re-read.

**The replacement sequence.** 28's phases A–D, with the four corrections this reconciliation makes. Every phase is one Workflow in CLAUDE.md's shape (spec → parallel builders with disjoint file ownership → integrator → independent verifiers → fix round → commit).

| Phase | Contents | The corrections this document makes | Tier |
| --- | --- | --- | --- |
| **A** | G1a (ENOSPC notice) + G5 (restore honesty) + G4 (power-loss-safe generations) **+ B7 minimal (§2.5) + B6 transactional restart (§3.3)** | G1a has no channel to speak through without B7; B6 pairs with G5 because both are about not lying about what a lifecycle operation did | 2, Tier 3 for G4's fault cases and B6 |
| **B** | G3 stage 1 (tray residency) + G1 (checkpoint scheduler) **+ B5 rows 1–2 (§2.4)** | Do not ship continuous capture before the permissions and the per-project opt-out | 3 |
| **C** | G2 (integrity gate, `FULL` on critical commits, verified ring, reconstruction) + G9 (transport loss ≠ process loss) + orphan-socket detection **+ A5's matrix as a doc and a test file + M8's expiry-to-`unknown` clause** | G9 without the matrix is one row of an unwritten table; expiry-to-`unknown` is the same honesty principle and is cheap alongside it | 3 |
| **C′** | **The fault harness (§7.1 item 1)** — one `SIGKILL`-at-a-random-point-and-relaunch harness on an isolated `-S` socket and `userData` | 28 proposes this as `smoke:checkpoint` inside G1. Build it as a general harness: it lights up seven matrix rows, and it is the A10 residue | 3 |
| **D** | **A8 + M9's residue (§2.1, §2.3)** + G6 (provenance) + G7 (spatial state) — one migration, setting 27 §4's compatibility numbers | 28 has no A8. It is the largest unowned item, it was rediscovered twice, and it shares a migration with G6 | 3 / 2 |
| **E** | M6's two residual clauses (§2.2) — preflight before side effects, `conversation_confirmed` after Enter | Depends on A8 and G5 | 3 |
| **F** | G8 (bundled pinned tmux, `-S`, no-kill handoff) + G3 stage 2 (the Host) | Unchanged from 28. Packaging-risk items, correctly late | 3 |
| **Parallel, not durability** | Signing + notarisation + `min_compatible_version` + single-instance lock (27 §0.2) | The cheapest high-value work in the whole set, and 26 mispriced it because `BUILD-STATUS.md` was stale | 2 / 3 |
| **Below the line** | M7, M8 (remainder), remote R0.5/R1 | 28's gates hold: R1 never before phases A–C, and never before R0.5 rules out "my laptop slept" | — |

**One sequencing rule, stated because it is the only thing here that can silently go wrong: A8, G6 and G7 are three migrations on the sessions table. Do them after Phase C's verified ring exists, and pair A8 with G6 in one migration.** Migrating a manifest that has no second copy is the situation the whole backlog exists to prevent.

---

## 9. §15 success measures — written for a product Tortie is not

Stated plainly, as asked: **yes.** §15 is titled *"Success measures for a 100,000-user daily driver"* and it measures a population. Tortie has one user, who is the operator, and no telemetry — nor should it have any, because the Zen's third promise is about the user's attention and a measurement pipeline is the classic way to start spending it.

Of the eleven measures, seven cannot be computed at n=1 and never will be: *"more than 99.9%"*, *"more than 99.99% in automated sampling"*, *"declining and source-calibrated"*, *"increasing toward all ordinary cases"*, *"median human decisions"* (a median of one), and the two rate-shaped ones about interruptions. They are the right measures for the company Tortie might become and the wrong instrument for deciding what to build next week.

Four survive, and they survive precisely because they are **absolute invariants rather than rates** — a single counterexample falsifies them, which is exactly what a fault harness produces:

- unexpected live-session loss after UI failure: **zero** in supported conditions
- restore attempts that end in an overstated healthy state: **zero** (this is G5, and it is currently violated by one line)
- duplicate notifications for one causal request: **zero**
- idle resource use low enough to go unnoticed on a developer laptop (**measurable today**, and G3 stage 1 requires the number in its commit message)

**Replace the other seven with things a single build can assert.** Each is a number one harness run produces, and each belongs in the commit message of the phase that earns it:

| Measure | How it is produced |
| --- | --- |
| Measured recovery-point objective, in seconds, under continuous output | 28's `smoke:checkpoint` byte-distance measurement (Phase B) |
| Fault-matrix rows with a passing harness — **today 2 of 29** | §7's audit, re-run each phase. This is the single best scalar for durability progress and it did not exist before this document |
| Restore stage outcomes reachable from a partial failure — target: `running` unreachable | Unit fixtures forcing `typeIntoPane` to throw at each stage (Phase A) |
| Conformance passes per agent **and version**, with the date the evidence was taken | `conformance:resume` + 30's D5 derived staleness trigger |
| Agents whose recorded launch version differs from the installed one | A8's `agent_version` column plus 30's D3 drift check |
| Critical-commit latency before and after `synchronous=FULL` | G2 step 2, measured and recorded (Phase C) |
| Idle CPU, wakeups and RSS over 30 minutes with 10 sessions and the window closed | G3 stage 1, in the commit message (Phase B) |

And keep 26's closing instruction verbatim, because it is the part of §15 that ages perfectly: *do not optimise "agents watched", "sessions displayed", notification volume or time in app.*

---

## 10. What this document does not settle

- **The A4 protocol.** Nobody has designed the versioned local protocol; 26 §8 A4 remains the only sketch. It is not needed until G3 stage 2, and 28 §6.2 R2 notes it is the same component a headless Linux host would need — which is the argument for designing it once, late.
- **M7's external references.** A2A, ACP and the Codex app-server have all moved since 26 cited them. Re-verify live before designing against any of them.
- **Whether Phase 18's renderer work moves G7's ground.** It is editing `src/renderer/state/store.ts` and adding `SessionRail`/`SessionStrip` while this was written. G7's spec must be re-derived against the tree at the time it is written, not against these line numbers.
- **The remote question.** Settled by 28 and not reopened here: SSH attach to a machine the user owns, never operated infrastructure, behind local phases A–C, behind R0.5. The one trigger that genuinely reopens it — agent vendors moving to account-side conversation storage keyed by an ID rather than a home directory and a `realpath(cwd)` — is worth watching deliberately.

---

## 11. Sources

Project documents, all read for this reconciliation:

- [26 — durability, architecture and recovery](26-tortie-durability-architecture-and-recovery.md) (the subject)
- [28 — remote sessions, and the durability that comes first](28-remote-sessions.md) (the partial successor)
- [27 — release, versioning and self-update](27-release-and-updates.md) · [29 — the Context sidebar](29-context-sidebar.md) · [30 — SpecStory distribution, drift and provider discovery](30-specstory-distribution.md) · [31 — extensibility](31-extensions.md) · [25 — codebase context](25-codebase-context.md)
- [The Zen of Tortie](../ZEN-OF-TORTIE.md) (the tiebreaker) · `CLAUDE.md` (invariants and verification tiers) · [BACKLOG](../BACKLOG.md)

Source read at `0b615d0` for the verdicts above: `src/main/migrate/userdata.ts`, `src/main/db/sqlite.ts`, `src/main/manifest/store.ts`, `src/main/manifest/harvest/stores.ts`, `src/main/sessions/core.ts`, `src/main/restore/{restore,snapshots,command,login-item}.ts`, `src/main/tmux/supervisor.ts`, `src/main/activity/{hooks,state-machine,monitor}.ts`, `src/main/conformance/resume.ts`, `src/main/index.ts`, `src/main/drop/store.ts`, `src/renderer/app/resume.ts`, `src/renderer/state/store.ts`, `resources/gmux-tmux.conf`, `package.json`, and the test suites named in §4 and §7.
