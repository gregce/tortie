# Tortie durability, architecture and recovery assessment

| Assessment fact | Value |
| --- | --- |
| First assessment | 11 August 2026 at `7a47257`: 51 out of 100 |
| Second assessment | 11 August 2026 at `ae6a1b7`: 63 out of 100 |
| Pre-Phase 19 assessment | 12 August 2026 at `a47e377`: 64 out of 100 |
| Current committed assessment | 12 August 2026 at `3be5d0e`: 70 out of 100 |
| Decision | Tortie now has a credible same-machine recovery layer. It still does not earn the whole promise in [The Zen of Tortie](../ZEN-OF-TORTIE.md). |
| Scope | Committed product code only. Early Phase 20 working-tree changes, the scheduled-task lock and temporary verifier files receive no score credit. |

## Executive verdict

Tortie now scores 70 out of 100 as a committed product, up from 64 immediately before Phase 19 and 51 at the first assessment.

The improvement is real. Tortie already did one difficult thing unusually well: a tmux server, rather than the Electron window, owns the live processes. Closing or crashing the interface can leave shells, agents and servers running. Session intent is written before spawn. Sessions are reconciled by immutable identity rather than display name. The committed rename work now carries data from gmux to Tortie by copying first, verifying the copy and keeping the original. It also closes a race that could mark a newly created live session as restorable.

Phase 19 turns several of the original report's recommendations into working mechanisms:

- snapshots are immutable, hashed generations written through a shared durable-write path
- SQLite is checked before write access, and a damaged manifest is quarantined before a best-effort rebuild
- restore records what actually came back and journals its intent before side effects
- restart creates the replacement before discarding the original and retains launch flags and capture choice
- suspend forces a checkpoint, degraded protection reaches a quiet notice channel, and tmux configuration is verified
- an isolated fault harness can kill Electron at named write and restore boundaries, relaunch it and judge the survivors

The committed build survived the full 16-case `SIGKILL` battery. It was killed around declaration, spawn, identity stamping, snapshot publication, each restore stage, quit and 3 seeded random moments. Every relaunch preserved the expected rows, processes and verified snapshots with no orphaned live session.

The complete promise is not yet credible enough for a 100,000-user daily driver.

The remaining gap is no longer mainly false restore copy or a single mutable snapshot. It is architectural and operational:

- watchfulness still ends with Electron because there is no independent Tortie Host
- output created after Tortie quits still has no timed checkpoint
- exact and weak conversation-ID evidence still collapse into the same broad armed state
- meaningful spatial state remains renderer-local
- there is no generational SQLite backup ring, verified off-device copy or restore drill
- Tortie still depends on system tmux and the temporary legacy `-L gmux` socket
- the app is unsigned, unnotarised, arm64-only and has no authenticated update path

The central architectural problem is simple:

> tmux survives the window, but Tortie's watchfulness does not.

The attention monitor, hook receiver, session-ID harvesters, manifest reconciler, snapshot scheduler and tray all live in Electron main. When the app quits, only the processes remain. Tortie stops observing them, stops recording exits and stops taking new recovery checkpoints.

The product should therefore evolve into this shape:

```text
Disposable Tortie UI
        │
        │ versioned local protocol
        ▼
Durable Tortie Host
  ├── session authority and restore state machine
  ├── attention adapters and hook receiver
  ├── resume capture and conformance evidence
  ├── checkpoint and recovery service
  └── tmux control client
        │
        ▼
Pinned tmux server
  └── owns the live PTYs and processes
```

This is not a proposal to replace tmux, become a cloud control plane or rebuild VS Code. It is a proposal to make the invisible machinery match the promise already made by the interface.

The original report recommends 30 changes:

- 10 architectural changes
- 10 product and technology mechanisms
- 10 backup and recovery-sanctity changes

Phase 19 substantially lands the typed restore result, SQLite integrity gate, snapshot generations, quiet notice channel and crash harness. The highest-priority work after it is the verified database backup ring, versioned recovery evidence, a durable Host, spatial-state durability and a releasable pinned substrate.

## 1. What is being scored

The Zen makes three promises:

1. Your work continues.
2. Your attention stays yours.
3. Nothing important gets lost.

Those promises contain five different kinds of continuity. They must not be collapsed into the word “persistence”.

| Continuity layer | What it means | Current owner |
| --- | --- | --- |
| Live process continuity | A running shell, agent or server continues when the UI disappears. | tmux |
| Conversation continuity | The provider resumes the exact agent conversation, including its own private context. | Provider resume mechanism plus Tortie evidence |
| Readable terminal recovery | Recent terminal output can be read after the live server is gone. | Tortie text snapshots |
| Spatial continuity | Projects, sessions, splits, focus, editor state and window geometry return as a place. | Manifest plus renderer storage |
| Disaster recovery | Durable state can be detected, verified and restored after corruption, upgrade failure or disk loss. | Not yet implemented as a complete system |

T1, T2 and T3 remain useful shorthand:

- T1: the interface quits, crashes or updates while the tmux server survives
- T2: the tmux server dies but the machine and local files remain
- T3: the machine reboots, logs out or loses all live processes

T1 can preserve a process. T2 and T3 can only reconstruct. A readable terminal snapshot is not an exact terminal screen. Relaunching an agent with a summary is not the same as resuming its native conversation. A same-disk copy is not protection against disk loss.

These distinctions are part of product honesty, not implementation trivia.

## 2. Method and evidence standard

This assessment used four forms of evidence.

| Evidence grade | Meaning |
| --- | --- |
| Committed | Present in committed source and exercised by ordinary tests or direct code paths |
| Working tree | Present only in local modifications; not treated as a product capability |
| Documented | Claimed or designed in project documents but not matched by the current implementation |
| External | Verified against first-party documentation or primary source code |

The audit traced the lifecycle from declaration through spawn, observation, snapshot, process loss, restore and deletion. It reviewed the tmux supervisor and configuration, manifest schema and reconciliation, activity engine, hook receiver, agent registry and harvesters, restore service, renderer persistence, settings, app lifecycle and packaging.

Three independent reviews covered:

- architecture and exact failure boundaries
- technology mechanisms and feasibility
- backup, integrity, privacy and restoration sanctity

The recommendations then went through an adversarial keep, defer and cut pass. A mechanism survived only if it improved a stated continuity layer without turning Tortie into a dashboard, a new multiplexer, a general backup product or a cloud fleet manager.

The Phase 19 commit passed type checking and a production build. Its recorded gate passed 2,060 tests, skipped 2 and failed none. It also passed T1 create and verify, T3 restore for Claude and Pi, 6 resume-conformance capture cases, the power smoke, all 11 migration stages and the full fault battery. Every harness ran on its own named socket. The operator's 9 live sessions were unchanged before and after the gates.

This assessment independently reran 262 focused Phase 19 tests successfully. It also reran the isolated crash battery outside the managed process sandbox: all 16 cases passed. Every survey relaunch exited cleanly and found the expected manifest rows, tmux sessions and verified snapshots with no orphaned live session. The initial in-sandbox attempt ended in `SIGABRT` before application boot and was treated as an environment failure, not product evidence.

The recorded live resume matrix passed 8 installed agents end to end. It proved recall with a second nonce created after the simulated reboot. This is stronger evidence than replayed text containing the first nonce. The harness is still opt-in and uses an isolated named `-L` socket rather than a stable full `-S` path. It does not make blocked providers fail unless strict mode is enabled.

The assessment also credits the copy-first gmux-to-Tortie migration and the Phase 16.5.1 stale-reconciliation guard. It credits Phase 19 only where implementation, integration and tests agree. It does not award credit for the planned Phase 20 database backup ring, Phase 21 recovery contracts or the early uncommitted Phase 20 transaction changes.

## 3. Named exemplars and what to extract

This assessment does not judge Tortie in a vacuum. It extracts specific, proven behavior from products that are already strong at one part of the problem.

### 3.1 iTerm2: process ownership and honest restoration language

[iTerm2 session restoration](https://iterm2.com/documentation-restoration.html) separates live reattachment from restored screen contents. Long-lived session servers can keep jobs alive through a GUI crash or upgrade, but a reboot kills those jobs. iTerm2 does not pretend that readable restored contents are a live process.

Tortie should extract:

- a disposable GUI attached to a longer-lived process owner
- explicit language for live reattachment versus reconstructed content
- delayed or reversible destruction where practical

Tortie should intentionally diverge by keeping tmux objects hidden. Projects and named sessions remain the user model.

### 3.2 VS Code Agent Host: a client-independent control plane

The [VS Code Agent Host architecture](https://code.visualstudio.com/docs/agents/concepts/agent-host) makes the host authoritative and allows it to run independently of display clients. Clients receive an initial state and ordered actions. A reconnecting client receives missed actions or a fresh snapshot.

Tortie should extract:

- a host that remains watchful without an open window
- a versioned client protocol
- one authority for durable mutations
- snapshot plus ordered-delta reconnection

Tortie should intentionally diverge by remaining local-first, terminal-open and provider-independent. It does not need Copilot, an account or a supported chat transport to admit an ordinary CLI process.

### 3.3 tmux and WezTerm: do not rebuild the PTY owner

The [tmux server model](https://github.com/tmux/tmux/wiki/Getting-Started) already owns processes independently of clients. [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode) supplies immutable IDs, asynchronous notifications, flow control and resynchronisation mechanisms for GUI integrations. [WezTerm multiplexing](https://wezterm.org/multiplexing.html) independently demonstrates the same split between a headless mux server and disposable GUI clients.

Tortie should extract stable IDs, controlled resynchronisation and a clear server/client boundary. It should not replace tmux with a home-grown PTY daemon.

### 3.4 Zellij: frequent inspectable state and armed restoration

[Zellij session resurrection](https://zellij.dev/documentation/session-resurrection.html) serialises layout frequently and can restore commands behind a user gesture. It shows the value of current, inspectable recovery material without pretending to checkpoint live native processes.

Tortie should extract continuous state capture and retain its existing choice to arm agent resume commands without pressing Enter automatically.

### 3.5 SQLite and restic: integrity is a behavior, not a file copy

SQLite's [online backup API](https://www.sqlite.org/backup.html) creates a consistent copy of a live database. Its [synchronous and integrity pragmas](https://www.sqlite.org/pragma.html) distinguish consistency from power-loss durability and provide `quick_check`, `integrity_check` and `foreign_key_check`. `WAL + synchronous=NORMAL` can preserve consistency while still losing a recent committed transaction after power loss.

[restic repository checking](https://restic.readthedocs.io/en/stable/045_working_with_repos.html#checking-integrity-and-consistency) and [append-only guidance](https://restic.readthedocs.io/en/stable/060_forget.html#security-considerations-in-append-only-mode) provide the relevant backup properties: immutable generations, content identity, verification, retention and separation of write from delete authority.

Tortie should extract those properties for its small continuity corpus. It should not become a general source-tree backup. Git, the user's existing backup system and optional workspace protection own repository files.

## 4. Current score

The score is a decision aid, not telemetry. It is weighted by the product promise, not by code volume.

| Dimension | Weight | 11 Aug baseline | Pre-Phase 19 | Current `3be5d0e` | Current change | Reason |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Live process continuity | 20 | 17 | 17 | 17 | 0 | tmux still owns processes. Config verification and crash tests improved, but system tmux and `-L gmux` remain. |
| Exact conversation recovery | 20 | 17 | 17 | 17 | 0 | Semantic recall remains strong. Weak provenance, adapter drift and release enforcement remain open. |
| Attention protection | 15 | 10 | 10 | 10 | 0 | Detection remains strong while Electron runs and absent when it quits. |
| Spatial continuity | 10 | 4 | 4 | 4 | 0 | Browser storage can survive an ordinary UI restart, but splits, focus and editor tabs are not part of the durable recovery model. |
| Integrity and disaster recovery | 15 | 5 | 5 | 9 | +4 | Phase 19 adds durable generations, hashes, integrity checks, quarantine, rebuild and suspend capture. Multi-file quarantine is not rollback-safe, and there is no database backup ring. |
| Packaging and upgrade safety | 10 | 3 | 4 | 5 | +2 | The rename migration is real, retryable and content-verified. System tmux, signing, notarisation and updates remain open. |
| Restore honesty and repair | 10 | 7 | 7 | 8 | +1 | Phase 19 persists actual outcomes and journals attempts. The renderer can still toast success from stale pre-restore evidence, and restart can orphan an old pane after kill failure. |
| Total | 100 | 63 | 64 | 70 | +7 | Phase 19 improves the sanctity of recovery rather than adding visible breadth. |

The committed product is now the first version that can reasonably claim a same-machine recovery system rather than a collection of restoration primitives. It is not yet a 100,000-user daily driver because the observer, substrate, release channel and off-device story remain below that standard.

### 4.1 Latest progress against the 30 recommendations

The status below assesses committed `3be5d0e`. Early Phase 20 changes in the working tree receive no credit.

| Item | Latest status | Evidence and remaining boundary |
| --- | --- | --- |
| A1 stable durability root and rename migration | Substantially landed | Copy-first migration, staged content verification, original retention, persistent failure notice and retry are committed. |
| A2 pinned tmux and durable `-S` socket | Open | Phase 19 verifies the packaged config and live `history-limit`, but production still uses unpinned system tmux and `-L gmux`. |
| A3 headless Tortie Host | Prepared | Session logic is extracted, but the observer still dies with Electron. |
| A4 Host as sole mutation authority | Prepared | Typed IPC is centralised. There is no independent protocol, ordered reconnect or client-independent lifetime. |
| A5 authority matrix | Partial | UUID ownership and stale-snapshot exemptions are strong. Provider evidence, recovery generations and foreign-session reconstruction still lack one coded authority table. |
| A6 durable restore state machine | Partial | Restore outcome and failure stage are persisted separately from liveness, and a durable attempt journal detects interruption. The success toast and steady row are not yet driven by that result. |
| A7 durable spatial state | Open | Chrome geometry is more coherent, but meaningful spatial state remains outside the manifest. |
| A8 versioned adapter contracts | Open | Agent and adapter versions, original recovery rules and conformance evidence are not stored with each session. |
| A9 recovery-safe upgrades | Partial | Rename migration is copy-first and content-aware. There is no general pre-schema backup ring, downgrade protocol or signed old-to-new release test. |
| A10 isolated fault boundaries | Substantially landed | The fault harness uses a private profile and socket, named fault points, real `SIGKILL` and survivor surveys. Provider stores and clocks are not fully virtualised. |
| M1 continuity certificate | Partial | Recovery readiness is visible and the first shortfall per kind raises a notice. Steady restore outcomes are not rendered, and exact, weak and grace capture evidence still collapse into one armed promise. |
| M2 resume-conformance laboratory | Substantially landed | Semantic recall passes 8 installed agents. Results are not persisted per version or required by the release command. |
| M3 adaptive checkpoint scheduler | Partial | Suspend joins quit, close and detected server exit as a capture point. There is still no timed or activity-adaptive checkpoint while the app is absent. |
| M4 self-describing continuity capsules | Substantially landed | Three immutable body generations carry versioned capsule metadata, hashes, parent generation, reason, cwd and size. |
| M5 resume provenance chain | Open | Harvester source, confidence and grace acceptance are still not persisted. |
| M6 restore preflight and verified handoff | Partial | Cwd and wrapper checks fail closed; stage outcomes are now honest. Provider evidence checks and post-Enter confirmation remain. |
| M7 Agent Attention Contract | Partial | The layered detector remains strong. There is no provider-neutral structured protocol with causal IDs. |
| M8 attention leases and causal deduplication | Open | Evidence remains heuristic and process-local. |
| M9 safe environment fingerprint | Partial | Absolute binary and wrapper re-resolution handle some drift. No versioned recovery fingerprint is persisted. |
| M10 deterministic repair and reconstruction | Partial | Tortie can quarantine and rebuild a damaged SQLite file. Quarantine is not rollback-safe across the database and sidecars, and a lost manifest cannot yet be reconstructed authoritatively from tmux stamps and capsules. |
| B1 critical SQLite hardening | Partial | The shared opener checks before write access and attempts quarantine. A later sidecar rename failure can leave the database set split. Ordinary writes remain WAL plus NORMAL by design. |
| B2 online database recovery copies | Open | Phase 20's verified backup ring has not landed. A `.recover` rebuild is not a known-good backup. |
| B3 power-loss-safe recovery objects | Substantially landed | Unique staging, size and SHA-256 verification, file flush, atomic rename and directory flush now protect snapshot publication. |
| B4 immutable retention | Partial | Snapshot bodies retain three immutable generations. Database generations do not yet exist. |
| B5 sensitive-data protection | Partial | Durable files are created owner-only. Project opt-out, shared redaction policy and recovery-data minimisation remain open. |
| B6 reversible remove and restart | Partial | Restart is create-first and carries flags and capture choice. If killing the old live pane fails, the old row is still discarded; remove is destructive and has no undo tombstone. |
| B7 calm Recovery Centre | Foundation landed | A quiet, once-per-kind notice channel reports degraded protection and can reveal quarantined state. Generation selection, restore-as-copy and guided repair remain absent. |
| B8 selective continuity journal | Cut from core | The narrow restore-attempt journal landed. A general event ledger remains unnecessary. |
| B9 encrypted portable recovery bundle | Open | No verified export and import path exists. |
| B10 user-owned off-device protection | Diagnostic only | Tortie can avoid falsely claiming Time Machine protection. It does not create or verify an off-device generation. |

Phase 19 closes the most damaging truth and same-disk integrity defects. The next score increase will not come from adding more snapshot machinery. It requires the database backup ring, recovery-contract provenance, a durable observer and a distributable substrate.

Two adversarial findings cap the score.

First, restore truth has reached storage but not every surface. Main persists a typed result and posts the first shortfall notice of each kind. The renderer's success path still reads the old session's `resumeArgv` and can say “press Enter … to resume” after command arming failed. The steady session row does not read the persisted restore result. A once-per-kind notice is therefore the only visible correction for later partial restores.

Second, quarantine protects evidence on the ordinary path but is not one atomic move. It renames the database first and each WAL, shared-memory or journal sidecar afterwards. If a later rename fails, the database can be moved while an original sidecar remains. The snapshot ring has a related concentration risk: bodies are immutable and verified, but one mutable capsule-index file decides which bodies are readable. These are narrower defects than the pre-Phase 19 design, but they prevent a 10 out of 15 integrity score.

### 4.2 Historical progress against the 30 recommendations at `ae6a1b7`

The table below is retained as the 11 August baseline. Section 4.1 supersedes it for current status.

| Item | Status | Current evidence |
| --- | --- | --- |
| A1 stable durability root and rename migration | Open | `userData` remains app-name-derived. Phase 16.5 is still backlog work. |
| A2 pinned tmux and durable `-S` socket | Open | Tortie still finds system tmux and uses `-L gmux`. |
| A3 headless Tortie Host | Prepared | Phase 16 extracted `sessions/core.ts`, but its lifecycle still belongs to Electron. |
| A4 Host as sole mutation authority | Prepared | Typed IPC and events are centralised. There is no independent Host protocol or reconnect sequence. |
| A5 authority matrix | Partial | UUID reconciliation is strong. Provider evidence and recovery copies still lack explicit authority rules in code. |
| A6 durable restore state machine | Open | Restore still jumps from `restorable` to `running` after partial side effects. |
| A7 durable spatial state | Open | Layout, project selection and editor presentation remain browser-local. |
| A8 versioned adapter contracts | Partial | The registry is richer and conformance-tested. Adapter version and evidence are not stored per session. |
| A9 recovery-safe upgrades | Partial | Migrations are transactional and share one opener. There is no verified pre-migration copy or rollback generation. |
| A10 isolated fault boundaries | Partial | Test coverage grew greatly and conformance isolates `userData`. It still shares the live `-L gmux` server. |
| M1 continuity certificate | Partial | Broad recovery readiness is visible. Exact, weak and grace evidence still collapse into `armed`. |
| M2 resume-conformance laboratory | Substantially landed | The real semantic round trip passes 8 installed agents. Persistence, isolation and mandatory release enforcement remain. |
| M3 adaptive checkpoint scheduler | Open | Phase 13.7 added scrollback diagnostics and loss notices, not timed snapshots. |
| M4 self-describing continuity capsules | Open | Snapshots remain one mutable text file per session. |
| M5 resume provenance chain | Open | Confidence, source path and grace acceptance are not persisted. |
| M6 restore preflight and verified handoff | Partial | Original-cwd and missing SpecStory paths now fail or heal safely. Restore stages and post-Enter confirmation are not durable. |
| M7 Agent Attention Contract | Partial | The layered detector and registry are strong. There is no provider-neutral structured contract with causal IDs. |
| M8 attention leases and causal deduplication | Open | Current state remains heuristic and process-local. |
| M9 safe environment fingerprint | Partial | Absolute binary resolution and SpecStory re-resolution handle some drift. No persisted fingerprint exists. |
| M10 deterministic repair and reconstruction | Open | A missing manifest still strands live Tortie sessions as foreign. |
| B1 critical SQLite hardening | Partial | `busy_timeout`, immediate transactions and guarded boot landed. `NORMAL`, no integrity gate and no quarantine remain. |
| B2 online database recovery copies | Open | No `db.backup()` recovery ring exists. |
| B3 power-loss-safe recovery objects | Open | Snapshot replacement has no hash, `fsync`, unique generation or retained predecessor. |
| B4 immutable retention | Open | One snapshot is overwritten. |
| B5 sensitive-data protection | Partial | SpecStory packaging and diagnostics are careful. Recovery data still lacks a complete permissions, redaction and encryption policy. |
| B6 reversible remove and restart | Open | Restart is delete-first and drops original flags and capture choice. |
| B7 calm Recovery Centre | Partial | Ready-to-restore UI is much clearer. Corruption, generation preview and restore-as-copy remain absent. |
| B8 selective continuity journal | Open | SQLite WAL is still the only journal-like state and is not recovery history. |
| B9 encrypted portable recovery bundle | Open | No export or import path exists. |
| B10 user-owned off-device protection | Open | No verified off-device generation path exists. |

The distribution is revealing. Most visible resume work has landed or partially landed. Almost every disaster-recovery item remains open. The next score increase will require deeper durability work rather than more recovery copy or more supported agents.

### 4.3 What moved the 11 August score

Exact conversation recovery rose from 11 to 17 because the harness now proves semantic recall. It generates a marker before the simulated reboot and a second marker afterwards. The resumed agent must join them. Replayed scrollback cannot satisfy that assertion.

Restore honesty rose from 4 to 7 because users can now see whether a session will restore its conversation, is still capturing an ID, or will return only to its directory. The original-cwd guard also prevents a convincing but empty Pi or Qwen session.

Integrity rose from 3 to 5. The shared SQLite opener, explicit write timeout and immediate read-then-write transactions remove 2 observed concurrency failure modes. Guarded boot stops a reconcile error from hiding every session. These changes do not provide power-loss durability, corruption detection or recovery copies.

Packaging rose from 2 to 3. The bundled SpecStory binary is pinned, hash-verified and treated as a required package input. Restore can re-resolve a missing recorded SpecStory path. This is real continuity work. The app itself remains unsuitable for broad external distribution.

### 4.4 What did not move on 11 August

Live process continuity stays at 17. tmux still keeps work alive, but Tortie still depends on whichever system tmux it finds and a temporary `-L` socket.

Attention protection stays at 10. The detector is capable while Electron runs. Closing the final window still shuts down the observer, hook receiver, harvesters and reconciler.

Spatial continuity stays at 4. More spatial features exist, including richer splits and editor surfaces, but their meaningful state still lives outside the durable core. More browser-local state does not improve recovery sanctity.

## 5. What already works and should be preserved

### 5.1 Process ownership is correctly separated from the window

The [tmux supervisor](../../src/main/tmux/supervisor.ts#L41) attaches clients to a server that owns the PTYs. Quitting Tortie disposes the clients, not the server. This is the strongest current invariant and should remain the centre of the architecture.

### 5.2 Intent is written before spawn

The manifest row is inserted before process creation in [the session creation path](../../src/main/sessions/core.ts#L1349), then removed if spawn fails. A crash cannot easily leave an unrecorded process that was successfully declared. This is a good transactional boundary.

### 5.3 Identity is stronger than display names

Tortie stamps an immutable UUID into the tmux pane environment and reconciles against it in [the manifest store](../../src/main/manifest/store.ts#L623). It refuses to adopt sessions merely because a name matches. This protects foreign tmux sessions and lets names remain user-facing labels.

### 5.4 Attention detection is layered

The [activity monitor](../../src/main/activity/monitor.ts#L1) combines native agent state, tmux observations, process-tree evidence and terminal inference. It continues to inspect hidden panes while the app is open. This is more defensible than treating screen scraping as semantic truth.

### 5.5 Restore retains human control

The [restore command builder](../../src/main/restore/command.ts#L18) arms the native provider resume command without pressing Enter. For an agent that can mutate files, deploy code or spend money, that user gesture is a feature rather than friction.

### 5.6 Migrations and snapshot replacement have useful atomicity

Schema migrations run transactionally. Text snapshots use temporary-write then rename in [the snapshot store](../../src/main/restore/snapshots.ts#L57). These protect against some app-crash failure modes. They are useful primitives, although neither is yet a complete durability or backup design.

### 5.7 Conversation recovery is now tested semantically

The [resume-conformance harness](../../src/main/conformance/resume.ts) uses Tortie's real session path. It creates an agent session, plants a nonce, captures the provider identity, kills the tmux session, restores the recorded command and asks the resumed agent to join the old nonce with a new one.

That final step matters. Replayed terminal text contains the old nonce, so searching the pane would create a false pass. Only an agent holding the original conversation can answer with both values. The recorded matrix in [BUILD-STATUS.md](../../BUILD-STATUS.md) reports 8 end-to-end passes, one provider-account block and one agent not installed.

The harness is opt-in and version results are not yet stored with sessions. It now uses an isolated named `-L` socket, which protects the operator's live server but does not exercise the proposed durable full `-S` production path. It proves today's tested matrix, not a permanent guarantee.

### 5.8 Recovery readiness is visible before reboot

The [resume presentation model](../../src/renderer/app/resume.ts) now distinguishes conversation recovery, capture in progress, directory-only recovery and plain shells. Restore-all tells the user how many conversations will return before acting. This closes a major honesty gap from the first assessment.

## 6. Failure boundaries at the 11 August baseline

This section records the evidence at `ae6a1b7`. Section 4.1 is authoritative for committed `3be5d0e`. Phase 19 materially narrows 6.5, 6.10, 6.11 and 6.14 by persisting restore outcomes, checking and quarantining SQLite, publishing verified snapshot generations and making restart create-first. It does not close them completely: the current residual defects are stated after the section 4.1 table. The other boundaries remain current unless section 4.1 says otherwise.

### 6.1 Closing Tortie preserves processes but ends watchfulness

The app lifecycle in [main/index.ts](../../src/main/index.ts#L1197) quits Electron when the window closes. The activity monitor, hook server, harvesters, reconciler and snapshot service are all disposed. Agents can continue in tmux, but questions, failures, successful exits and newly discovered conversation IDs are no longer recorded.

This contradicts the emotional promise that the user can look away without anxiety. The work continues, but Tortie is no longer vigilant.

### 6.2 Output produced after quit can vanish at reboot

Snapshots are taken on orderly quit, explicit close and detected server exit. [The snapshot module](../../src/main/restore/snapshots.ts#L1) still documents the hard-crash window. Phase 13.7 added scrollback diagnostics and honest loss notices, not timed checkpoints. If an agent continues after Tortie quits and the machine then loses power, the new terminal output has no disk checkpoint.

### 6.3 Server-exit snapshotting happens after the useful moment

The server-exit handler begins snapshotting after the tmux control connection reports exit in [sessions/core.ts](../../src/main/sessions/core.ts#L520). At that point `capture-pane` will normally be unavailable. T2 recovery therefore depends on the older snapshot.

### 6.4 A clean process exit while Tortie is absent can be misclassified

The tmux configuration uses `remain-on-exit failed` in [gmux-tmux.conf](../../resources/gmux-tmux.conf#L58). A process that exits with status zero while Electron is absent can disappear without a durable exit receipt. On the next launch the manifest may see a declared session with no live identity and classify it as restorable rather than completed.

### 6.5 At baseline, restore could fail partly and still report success

[restore.ts](../../src/main/restore/restore.ts#L242) can catch snapshot replay or resume-command arming failures and return partial results. The caller in [sessions/core.ts](../../src/main/sessions/core.ts#L796) does not preserve those outcomes before setting the session to `running`. The renderer can therefore show reassuring copy because an old `resumeArgv` exists, even though the command was not armed.

This is the most serious truthfulness defect. A recovery product must fail closed.

### 6.6 Working-directory recovery now fails closed

Phase 13.5.1 fixed the most dangerous provider-specific restore defect. [The restore preflight](../../src/main/restore/restore.ts#L185) now consults the registry for agents that require their original working directory. If a Qwen or Pi conversation has an armed resume and its original directory is missing, restore stops with an actionable error. It no longer falls back to the project root and creates an empty lookalike conversation.

The rule is still derived from the current registry rather than persisted with the session's adapter version. A future registry change can reinterpret an old row. That remaining risk belongs to the versioned adapter contract in A8.

### 6.7 Resume evidence is flattened into an optimistic state

Phase 13.5a harvest results include source path, confidence and whether a grace timer was used in [the harvester store contract](../../src/main/manifest/harvest/stores.ts#L72). The capture path in [sessions/core.ts](../../src/main/sessions/core.ts#L636) persists the session ID, resume arguments and broad `armed` state, but not the evidence. Exact, weak and grace-accepted results can therefore become the same `armed` state.

Phase 13.5b now renders the broad `ResumeCapture` states. The interface distinguishes conversation recovery, capture in progress, directory-only recovery and plain shells. Restore-all states the exact split before the user acts.

The remaining honesty gap sits within `armed`. The type calls it a validated ID even though weak and grace-timer matches also become `armed`. Harvest provenance is logged but not persisted. A timed-out live watcher can also remain `capturing` until a later refresh re-arms it. The broad UI state is now useful; the evidence beneath the strongest state is still too coarse.

### 6.8 Manifest loss can strand live sessions

Tortie mirrors some metadata into tmux, but reconciliation adopts only IDs already known to SQLite. If the manifest is empty or corrupt, stamped live sessions are treated as foreign. The documentation claim that sessions are self-describing when the manifest is lost is not true in the current implementation.

### 6.9 Spatial memory is outside the durable model

[layout.ts](../../src/renderer/state/layout.ts#L1) explicitly stores split geometry in renderer `localStorage`; the manifest does not know the split tree. Other active project and workbench choices are also browser-local in [store.ts](../../src/renderer/state/store.ts#L268). This can survive an ordinary restart, but it is not versioned, backed up, integrity-checked or repairable.

The Zen promises a coherent place, not merely surviving processes. Spatial state is meaningful continuity.

### 6.10 At baseline, the manifest was consistent but not protected enough

The SQLite connection uses `WAL + synchronous=NORMAL` in [manifest/store.ts](../../src/main/manifest/store.ts#L377). There is no boot integrity check, rolling online backup or corrupt-database quarantine. One damaged or missing database can remove the index that connects projects, sessions, resume evidence and live tmux identities.

### 6.11 At baseline, the snapshot was one unverified plaintext generation

Each session overwrites one text file. The write has no schema, generation ID, content hash, reason, line count, byte count, `fsync`, directory sync or retained predecessor. Concurrent snapshot attempts share a fixed temporary name. It is a useful recent transcript, not a sanctified recovery object.

### 6.12 Packaging does not match the documented substrate

The build still uses system tmux and a fixed `-L gmux` label in [supervisor.ts](../../src/main/tmux/supervisor.ts#L41). The design documents specify a bundled pinned tmux and an app-support socket. The package configuration remains unsigned and not hardened in [electron-builder.yml](../../electron-builder.yml#L118).

The current `-L` socket sits under tmux's temporary-directory convention. macOS cleanup can remove the pathname while a server still lives, leaving it unreachable. A product rename can also split state if Electron derives a new `userData` directory before migration.

Packaging has improved around SpecStory. The bundled binary is version-pinned, hash-verified, mandatory at package time and prepared for nested signing. Restore can replace a dead recorded bundle path with the current bundled or installed binary. This earns the packaging score increase.

It does not solve public distribution. The app remains ad-hoc signed, without hardened runtime, notarisation, stapling or an update feed. The gmux-to-Tortie `userData` migration and legacy socket adoption are still backlog items.

### 6.13 Login restoration is visible and manual

[login-item.ts](../../src/main/restore/login-item.ts#L27) registers the main app at login. Ordinary startup creates and shows the window. Sessions remain ready for manual restoration. This does not match the documented hidden recovery flow, and it does not supply a background continuity service.

### 6.14 At baseline, restart was destructive and lossy

[The renderer restart path](../../src/renderer/state/store.ts#L880) deletes the old row and snapshot before creating the replacement. A creation failure removes the user's recovery path. The replacement also keeps only name, project, cwd and agent. It drops original launch flags and the SpecStory capture choice.

Restart must use the transactional replacement described in B6. The current behavior is not a safe recovery action.

## 7. Target invariants

Before adding mechanisms, Tortie should write down the invariants they serve.

1. Closing, crashing or updating any UI client does not end a live process or stop continuity observation.
2. A session is never adopted, resumed, removed or rebound by display name.
3. Declared intent is durable before a process can exist.
4. A restore attempt never becomes healthy until every required stage has a recorded result.
5. Exact conversation recovery is claimed only after provider-native identity correlation and a version-matched marker-turn conformance pass.
6. Weak evidence remains weak through storage, restore and UI copy.
7. A missing original working directory never silently changes the meaning of an agent resume.
8. A current-state copy is not called a backup until it has been opened, checked and restored in isolation.
9. Corrupt current state is quarantined and preserved. Recovery never destroys evidence.
10. Healthy durability remains quiet. Tortie speaks only when protection is degraded or judgment is required.

## 8. Improvement inventory: architecture

Priorities mean:

- P0: required before a public daily-driver durability claim
- P1: required before growth makes recovery incidents operationally expensive
- P2: useful only after the local foundation is proven and demand is observed

### A1. Establish a stable, brand-independent durability root

Priority: P0

Electron's `userData` path is influenced by application identity. Renaming gmux to Tortie can therefore create an empty new world while the old manifest, settings and snapshots remain elsewhere.

Define one versioned continuity root whose identity does not change with marketing names. Implement a copy-first migration that inventories the old root, creates a consistent database backup, copies objects, verifies hashes and semantic counts, opens the new database, and leaves the old root intact until a later user-approved cleanup.

Proof required:

- upgrade tests from every released gmux identity to Tortie
- downgrade and interrupted-copy tests
- a visible recovery choice when both roots contain newer state
- no move-first or delete-first path

Zen effect: a rename must not make the user reconstruct anything.

### A2. Bundle and pin tmux behind a durable full socket path

Priority: P0

Keep tmux as the process owner. Bundle a signed, verified version and its configuration. Use `-S` with a full path inside the stable continuity root rather than relying permanently on `-L gmux` and a temporary-directory convention.

The transition must preserve existing servers. A new application version should discover the legacy `-L gmux` server, attach without killing it, and defer socket or server migration until its sessions drain or the user explicitly performs a verified handoff. A GUI update must never imply a tmux restart.

Proof required:

- old-client/new-server and new-client/old-server compatibility tests
- socket pathname deletion and permission repair tests
- an upgrade test with active shells, full-screen TUIs and agents
- runtime verification of binary hash, version and configuration

Zen effect: Tortie owns the dependency while keeping it invisible.

### A3. Create a headless Tortie Host

Priority: P1, with the extraction boundary designed during P0

Move watchfulness into a user-level background helper registered through [Apple `SMAppService`](https://developer.apple.com/documentation/servicemanagement/smappservice). The Host should own the manifest, tmux control connection, hook receiver, attention engine, session-ID harvesters, checkpoint scheduler and recovery service. Electron becomes a disposable local client.

Use a LaunchAgent or bundled LoginItem, not a privileged LaunchDaemon. The Host needs user-session access and should stop at logout. Reboot remains reconstruction rather than process checkpointing.

Stage the work:

1. Extract Electron-independent domain services behind injected path, clock and process interfaces.
2. Run the Host in the main process while preserving the future protocol boundary.
3. Move it into a signed helper once behavior is covered by fault tests.

Proof required:

- close every UI window, let an agent complete or ask permission, then reopen and observe the correct recorded state
- update or crash Electron while checkpointing continues
- prove one Host instance owns one continuity root
- measure idle CPU, wakeups, memory and battery use

Zen effect: this closes the gap between “the work continues” and “Tortie remains watchful”.

### A4. Make the Host the sole mutation authority

Priority: P1

Use a versioned local JSON-RPC protocol over a Unix-domain socket. Every mutation carries an idempotency key. Every accepted durable mutation receives a monotonic sequence number. A reconnecting UI supplies its last sequence and receives missing actions or a complete snapshot.

Do not turn the whole product into event sourcing. The protocol needs ordered actions for client synchronisation; the persistence model can continue to use ordinary projection tables plus a narrow continuity journal.

Proof required:

- duplicated and reordered client requests do not duplicate sessions or deletes
- a client that misses events converges without a full app restart
- an old client receives a clear compatibility response from a new Host
- a renderer crash cannot leave a half-applied durable mutation

Zen effect: reconnection becomes invisible instead of a refresh ritual.

### A5. Publish an authority matrix

Priority: P0

Today, tmux, SQLite, provider stores and renderer storage each know part of the truth. Define which source is authoritative for every field and which sources are evidence or recovery copies.

| Fact | Authority | Supporting evidence |
| --- | --- | --- |
| User intended a Tortie session | Continuity database | Journal and capsule |
| Process is live | tmux observation | Process tree and control events |
| Provider conversation identity | Provider-native record correlated to pane | Launch record and capture provenance |
| Session display name | Continuity database | Mirrored tmux metadata |
| Recent readable output | Verified checkpoint generation | Live `capture-pane` while available |
| Project and split layout | Continuity database | Recovery bundle |
| Restore succeeded | Restore-attempt state machine | Shell, replay and provider verification receipts |

Ambiguity becomes `degraded`, `unknown` or `repair_required`. It never becomes an optimistic healthy state.

Proof required: table-driven reconciliation tests for every pairwise and three-way disagreement.

### A6. Replace overloaded status with a durable restore state machine

Priority: P0

Use explicit continuity states rather than forcing declaration, process health and restore progress into one `status` field.

```text
declared
  └── live
       ├── checkpointed
       ├── completed
       └── lost_live_process
              ├── restorable_verified
              ├── restorable_degraded
              └── repair_required

restorable_verified
  └── restoring
       ├── restored_shell_only
       ├── restored_transcript
       ├── restored_armed
       ├── conversation_confirmed
       └── restore_failed
```

Persist a restore attempt before acting. Journal the shell creation, snapshot replay, resume arming, user submission and provider confirmation separately. Each transition must be idempotent so a crash can continue or roll back safely.

Proof required: kill Tortie between every two transitions and prove that the next launch neither duplicates nor overstates the result.

### A7. Move meaningful spatial state into the continuity store

Priority: P1

Persist project-tab order, active project and session, session order, split tree and ratios, focus, editor tabs, cursor positions, workbench mode and window geometry in a versioned Host-owned schema. Keep transient drag and animation state in the renderer.

Include hot-exit recovery for unsaved editor buffers if Tortie continues to offer editing. [VS Code Hot Exit](https://code.visualstudio.com/docs/editing/codebasics#_hot-exit) is the appropriate behavioral exemplar: dirty content survives ordinary restarts without pretending to replace source control or machine backup.

Proof required:

- crash and reopen with several projects, splits and dirty editor buffers
- migrate layout schemas forwards and backwards using recovery copies
- restore on a smaller or missing display without hiding windows off-screen

Zen effect: the developer returns to a place, not an inventory.

### A8. Make agent adapters versioned recovery contracts

Priority: P0

An adapter should declare more than launch and resume arguments. Persist the adapter ID and version with each session, along with:

- provider and CLI identity
- original launch recipe
- native conversation key type
- supported capture sources
- original-working-directory requirement
- binary and version compatibility rules
- whether bare resume is dangerous
- repair strategies
- latest conformance result

Restore must use the recorded contract or an explicit migration from it. It must not silently apply the current adapter's assumptions to an older session.

Proof required: fixture migrations across adapter versions and live canaries across supported CLI versions.

### A9. Make upgrades and schema changes recovery transactions

Priority: P0

Before any migration, create and verify an online database recovery copy plus the relevant session capsules. Record application, Host, adapter, tmux and schema versions. Apply migrations transactionally, run integrity and semantic checks, then mark the new generation current.

If a new app cannot safely talk to the existing Host or tmux server, it should remain read-only or offer a clear deferral. It must not kill live work to make versions agree.

Proof required:

- power loss during every migration phase
- new UI with old Host and old UI with new Host
- failed migration with automatic quarantine and intact recovery copy
- app rename and app downgrade while sessions are live

### A10. Build isolation and fault boundaries into the architecture

Priority: P0

Every integration test must be able to select a temporary `userData` root, a unique `-S` tmux socket, fake provider stores and controlled clocks. Live-agent canaries must be opt-in and use isolated projects and sockets. Ordinary tests must never touch the user's daily-driver tmux server or provider sessions.

Supervise long-lived watchers and expose bounded shutdown. A blocked renderer must cause the disposable client to detach, not cause unbounded Electron IPC queueing. Reattachment should backfill from tmux or a checkpoint.

Proof required: the fault matrix in section 13 runs without shared user state and can kill any single process safely.

## 9. Improvement inventory: technology and new mechanisms

Most mechanisms below are not novel computer-science primitives. The product value comes from composing them into an unusually strong invariant: every interruption carries evidence, every resume claim is tested, and every recovery claim is verified before Tortie trusts it.

### M1. Create a quiet continuity certificate for each session

Priority: P0

Maintain a machine-readable assessment of each recovery layer:

```text
process: live | gone | unknown
conversation: exact_verified | exact_unverified | degraded_brief | unavailable
terminal_checkpoint: generation + captured_at + verified
layout: generation + verified
external_dependencies: available | changed | missing
```

This is not a score, badge or dashboard. Healthy certificates stay invisible. The interface uses them to choose honest verbs and speaks only when a relied-upon layer becomes degraded.

Examples:

- “Reattach” means the same live process still exists.
- “Resume conversation” means native provider identity passed conformance.
- “Restore shell and transcript” means no exact conversation claim is available.
- “Repair required” means proceeding automatically could create the wrong state.

Proof required: copy tests that forbid stronger language when any prerequisite is weak or stale.

### M2. Make resume conformance a persisted release gate

Priority: P0

The deterministic laboratory now exists. For each supported provider and installed CLI version it:

1. launch through Tortie's real creation path
2. submit a unique marker
3. prove capture of the provider-native conversation ID
4. destroy the tmux session
5. restore using the persisted recipe
6. submit or query a second marker
7. prove the resumed agent retains the first marker's context

The committed evidence records 8 end-to-end passes. It also distinguishes provider blockage from a Tortie failure.

The remaining work is to record provider version, adapter version, capture source, result and timestamp as product evidence. If a previously passing version fails, downgrade the capability instead of continuing to promise exact resume. The harness now has an isolated named `-L` socket; move both tests and production to the intended durable full `-S` path. Make strict coverage part of the release decision for every advertised provider.

Cheap fake-store and argv fixtures belong in ordinary CI. Real providers belong in isolated, explicit canaries because they may consume paid resources or change accounts.

This is already Tortie's strongest trust evidence. Release enforcement and per-session evidence can turn it into a durable trust moat.

### M3. Add an adaptive terminal checkpoint scheduler

Priority: P0

Take rendered `capture-pane` checkpoints while the server is healthy rather than waiting for shutdown. Trigger on changed content with a maximum interval, and also before sleep, update, explicit quit and destructive actions. Stagger sessions, hash content to skip unchanged writes, bound history and reduce cadence on battery.

Start with readable rendered text. Do not begin with raw PTY flight recording. Raw streams can contain secrets, grow rapidly and fail to reconstruct alternate screens or overwritten terminal grids.

Proof required:

- a measured maximum recovery-point objective under continuous output
- bounded CPU, disk and wakeups at 10, 50 and 100 sessions
- correct behavior for full-screen TUIs, Unicode and very large scrollback
- privacy controls and per-project opt-out

### M4. Make every checkpoint a self-describing continuity capsule

Priority: P0

Write immutable generation directories or objects that contain:

- Tortie session UUID and schema version
- generation and parent generation IDs
- reason and capture timestamp
- project path, exact cwd and repository/worktree identity
- original and resume recipes
- provider session key and provenance reference
- terminal snapshot line count, byte count and SHA-256
- app, Host, tmux, provider and adapter versions
- lifecycle and continuity-certificate summary
- a `COMPLETE` marker written last

The capsule provides inspectable recovery evidence outside the SQLite index. It should not copy private provider stores by default. It can record their paths, safe identity hashes and backup requirements.

Proof required: rebuild a missing manifest from capsules plus live tmux identities without adopting foreign sessions.

### M5. Preserve a resume provenance chain

Priority: P0

Persist how Tortie learned every provider session ID:

- source record or protocol
- correlation key and expected process
- exact, weak or unverified confidence
- capture timestamp
- whether a grace timeout accepted the candidate
- original cwd and provider store root
- provider and adapter versions
- last marker-turn conformance result

A checksum proves bytes, not meaning. Exact correlation or a successful marker-turn test is required before the product calls a conversation recoverable.

Proof required: fixtures with two concurrent same-provider agents, stale store records, copied repositories, missing process visibility and reused session IDs.

### M6. Add restore preflight and a verified handoff

Priority: P0

Before creating anything, build a restore plan and verify:

- exact cwd exists or the user approved a provider-safe relocation
- required binary exists and its version is compatible
- provider record and captured identity still agree
- checkpoint generation and hash are valid
- target tmux and Tortie identities are unused
- required credentials are available without reading or storing them

Create the replacement under temporary identities. Replay the verified transcript. Arm the command. Only after the user presses Enter should Tortie observe the provider and record `conversation_confirmed`.

If confirmation is impossible, retain `restored_armed` or `restored_shell_only`. Never call either `running` as a substitute for proof.

### M7. Define an Agent Attention Contract

Priority: P1

Normalise structured provider observations into:

```text
working
waiting_input
waiting_permission
completed
failed
idle
unknown
```

Every observation also carries source, confidence, time, lease expiry, provider session ID and causal request or turn ID. Use sources in this order:

1. provider protocol or app server
2. provider hook
3. explicit Tortie signal or shell integration
4. process-tree evidence
5. terminal inference

The [A2A task lifecycle](https://a2a-protocol.org/latest/topics/life-of-a-task/), [Agent Client Protocol session updates](https://agentclientprotocol.github.io/typescript-sdk/types/SessionUpdate.html) and [Codex app-server lifecycle](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) show that working, input-required, approval and terminal states are becoming explicit protocol concepts.

Tortie should offer a tiny local `tortie signal` protocol for unsupported tools. Hooks improve fidelity but never become an admission requirement.

### M8. Use leases, causal acknowledgement and evidence-aware attention

Priority: P1

A `working` state expires unless renewed. Expiry becomes `unknown`, not `idle`. A permission request remains actionable until the same request ID is resolved. Repeated observations with one causal ID generate one interruption. User input acknowledges only the waiting state it answers.

Confidence should influence behavior, not create noisy UI. A low-confidence terminal guess can change a subtle internal state or invite more evidence; it cannot produce a definitive “needs input” alert without corroboration.

Proof required:

- recorded terminal fixtures for false prompts, spinners, BEL, full-screen TUIs and repeated permission text
- calibration by source and provider version
- interruption budgets showing no duplicate notifications for one decision

### M9. Record a safe environment fingerprint

Priority: P1

Recovery often fails because the shell has changed even when the manifest is intact. Record a minimal fingerprint:

- exact cwd identity and repository/worktree identity
- executable path, version and safe binary hash
- shell and architecture
- names, but not values, of adapter-declared required environment variables
- selected toolchain versions where an adapter needs them

On restore, show only actionable drift. Never persist the whole environment. Environment variables commonly contain tokens, socket secrets and credentials.

Proof required: missing binary, changed PATH, relocated repository, deleted worktree, architecture change and provider downgrade cases.

### M10. Add deterministic repair and manifest reconstruction

Priority: P1

When SQLite is missing or corrupt, scan three evidence sets:

1. verified continuity capsules
2. live tmux sessions carrying Tortie UUIDs and capsule hashes
3. the selective continuity journal

Build a proposed reconstruction. Validate ownership, UUID uniqueness, project identity and capsule hashes. Present ambiguous cases as a small repair decision. Import under new database transactions and keep the damaged database and plan for inspection.

Never scan names and silently adopt matches. Never reset to an empty state merely because the current database will not open.

Proof required: empty database with live sessions, corrupted database with intact capsules, duplicate UUID, stale capsule, foreign tmux session and partially written reconstruction.

## 10. Improvement inventory: backup modes and sanctity

Tortie should use three protection layers:

```text
Layer 1: live continuity
  pinned tmux + durable socket

Layer 2: local recovery ring
  verified SQLite copies + capsules + layouts + retained checkpoints

Layer 3: user-owned disaster recovery
  encrypted portable bundle or chosen off-device destination
```

Layer 1 protects against the UI disappearing. Layer 2 protects against process, app and local-state failure. Layer 3 protects against device loss. None substitutes for another.

### B1. Harden continuity-critical SQLite transactions

Priority: P0

Use `synchronous=FULL` for declaration, provider-ID capture, destructive intent, restore transition and migration commits. Low-value attention observations can remain batched or use a less expensive path after measurement.

Run `quick_check` at boot, `foreign_key_check` after migration and `integrity_check` periodically or when a fault is suspected. If a check fails, quarantine the database and enter recovery. Do not open it read-write and let default initialisation overwrite the user's apparent state.

Proof required:

- measured latency for critical commits
- simulated truncated pages, missing WAL, corrupt index and foreign-key violations
- an invariant test that corrupt state is preserved before recovery begins

### B2. Create online generational database recovery copies

Priority: P0

Use `better-sqlite3`'s online `db.backup(destination)` path rather than copying an open database file. Keep generations for:

- pre-migration
- post-migration verified
- meaningful lifecycle changes
- a bounded hourly and daily ring
- last known healthy shutdown

Open every staged copy, run checks and validate semantic invariants before labelling it restorable. A copied file that has never been opened is only a candidate.

Proof required: restore a sampled generation into a temporary continuity root and reconcile it without accessing the live database.

### B3. Give recovery objects power-loss-safe write semantics

Priority: P0

For snapshots, capsules, settings and bundle manifests:

1. write to a unique temporary object
2. flush and `fsync` the file
3. verify size and SHA-256
4. atomically replace or rename
5. sync the containing directory where the platform permits
6. write the generation `COMPLETE` marker last
7. serialise writers per session

SHA-256 detects accidental corruption. It does not prove semantic identity or defend against an attacker who can rewrite both object and hash. Add authentication only if the threat model later requires it.

### B4. Use immutable retention with recovery-point semantics

Priority: P0

Do not overwrite the only good generation. Retain a small ring based on meaningful recovery value, for example:

- last few critical events
- recent hourly generations
- recent daily generations
- pre-upgrade and last-known-healthy generations

Deduplicate unchanged content. Expose the last verified recovery point in repair UI, not as an ambient counter. Pruning is a separate transaction that never removes the current and final verified predecessors together.

Proof required: every retained generation can be enumerated, opened and restored; interruption during pruning leaves at least one verified predecessor.

### B5. Minimise and protect sensitive recovery data

Priority: P0

Create directories with user-only access and files with mode `0600`. Redact hook payloads and diagnostics. Do not store whole environments. Give users project-level control over terminal checkpointing because output can contain secrets.

For local state, permissions and data minimisation come first. Transparent encryption tied only to the current Keychain can make corruption repair or cross-machine restoration harder. Use Electron [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) or Keychain-backed keys where the local threat model justifies it. Portable and off-device bundles must always use client-side encryption plus a user-held recovery method.

Proof required: permission tests, secret fixtures, key loss, locked Keychain and redacted diagnostic export.

### B6. Make remove, restart and archive reversible

Priority: P0

The current remove path hard-deletes manifest state and asynchronously removes the snapshot. Restart can destroy the old session before the replacement is proven.

Change removal into tombstone plus a bounded undo period. Keep recovery generations through retention. Change restart into a transaction:

1. checkpoint and verify the old session
2. declare a replacement under a new temporary identity
3. prove creation and any requested resume state
4. switch the visible binding
5. tombstone the old session

Proof required: crash after every step, replacement spawn failure and user undo after UI restart.

### B7. Build a calm Recovery Centre

Priority: P0

Show this surface only when a continuity layer is degraded or when the user deliberately opens it. It should answer:

- what failed
- what is still alive
- the newest verified recovery point
- which parts can be restored exactly
- which parts are readable transcript or degraded context only
- what decision, if any, is required

Offer preview, restore as a copy, inspect location, retry, explicit relocation and redacted diagnostics. Preserve damaged state. Default to the safest reversible operation.

Do not add backup streaks, health scores, fleet counts or activity theatre.

### B8. Add a selective append-only continuity journal

Priority: P1, after B1 to B4

Record only durability-critical facts such as declaration, process binding, resume capture, exit receipt, checkpoint verification, restore stage, archive and removal. Give each event a schema version, monotonic sequence, idempotency key and previous-event hash. Write the event and its projection change in one SQLite transaction.

The journal is for audit and reconstruction. It is not an excuse to event-source ordinary UI state, nor is the SQLite WAL a substitute. WAL is recycled crash-recovery state, not historical retention.

Proof required: rebuild projection tables from the journal and compare their semantic digest to the live database.

### B9. Provide an inspectable encrypted Tortie recovery bundle

Priority: P1

Export or import a portable bundle containing:

- a verified database snapshot
- selected continuity capsules and terminal generations
- spatial state and safe settings
- schema, app, Host and adapter versions
- object hashes and inventory
- explicit external dependencies

Provider-native transcript stores should be excluded by default and listed as dependencies. They are private formats, may be live, may contain sensitive content and can change without notice. Provider-aware archival can become an explicit opt-in after safe-copy behavior is proven.

The bundle must be client-side encrypted with a recovery secret that is not available only from the lost Mac.

### B10. Offer user-owned off-device protection without mandatory cloud state

Priority: P2 before 100,000 users, after local restoration is proven

Allow a user-chosen folder, Time Machine-protected location or append-only object store. Upload only verified immutable generations. Separate normal write authority from retention deletion where the destination supports it.

[Apple Time Machine](https://support.apple.com/en-us/104984) already offers familiar local versioned backup, and [restic's append-only model](https://restic.readthedocs.io/en/stable/060_forget.html#security-considerations-in-append-only-mode) is a better reference than inventing a Tortie cloud account.

Do not sync a live SQLite directory through Dropbox or iCloud. Do not claim a same-disk recovery ring protects against device loss. Do not copy repository contents unless the user separately enables workspace protection.

Proof required: restore on a clean Mac with a different local path, missing provider authentication and no access to the original Keychain.

## 11. Adversarial review

The first recommendation pass was intentionally expansive. This pass asks whether each attractive mechanism is necessary, feasible and compatible with the Zen.

### Challenge 1: a background Host may be architecture theatre

Objection: tmux already survives Electron. A second process adds signing, launch registration, protocol versioning, lifecycle races and more code that can fail.

Evidence: the current Electron process does more than display. It owns every observation and recovery service. The exact scenario Tortie promises—close the app and let agents continue—turns those services off. App-owned periodic timers cannot close a GUI-absent checkpoint gap.

Verdict: keep, but stage it. First extract a Host-shaped boundary inside the main process. Move it to a signed helper only after isolated fault tests prove the domain boundary. tmux remains the PTY owner; the Host is a small control and recovery plane, not another multiplexer.

### Challenge 2: a ledger, capsules, tmux metadata and SQLite create four truths

Objection: redundancy can create more ambiguity than it resolves.

Evidence: the current single SQLite index is already a single recovery point, while tmux and provider stores necessarily contain independent live facts. Some redundancy is unavoidable. The danger comes from unclear authority.

Verdict: narrow and sequence the work. Start with one SQLite authority plus immutable recovery copies and one compact per-session capsule. Add the selective journal only after restore from ordinary generations works. Keep the authority matrix executable in reconciliation tests. Do not event-source tabs, preferences or view state.

### Challenge 3: continuous snapshots may quietly become surveillance

Objection: terminal output can contain secrets, customer data and credentials. Frequent capture also consumes battery and disk.

Evidence: shutdown-only capture already stores the same class of sensitive data, but without a clear privacy model. The real change is frequency and retention.

Verdict: keep adaptive rendered checkpoints, with user-only permissions, bounded history, content-change detection, battery-aware cadence and per-project opt-out. Defer raw PTY flight recording. Do not store full environments. Measure at realistic session counts before enabling an aggressive default.

### Challenge 4: checksums and immutable generations can create false confidence

Objection: a valid hash proves that bytes did not change. It does not prove that the bytes describe the right provider conversation or a restorable state.

Evidence: current capture can accept weak correlation through a grace timer. Hashing that result would preserve the ambiguity perfectly.

Verdict: keep hashes for accidental corruption, but make semantic verification separate. Provider identity needs exact correlation or marker-turn conformance. A recovery generation is trusted only after file checks, database checks and semantic invariants all pass.

### Challenge 5: exact agent resume will always depend on private provider formats

Objection: providers can change local stores, remote account behavior and CLI flags without notice. Tortie cannot guarantee another product's persistence.

Evidence: the registry contains provider-specific assumptions, but the real conformance command now checks them. The remaining failure would be treating one recorded pass as permanent or letting a blocked provider retain an unconditional claim.

Verdict: keep provider-native resume, but make support empirical and versioned. Capability expires when the installed CLI changes or a conformance result becomes stale. “Recovered context” remains a separate degraded mode and is never called resume.

### Challenge 6: restoring a session automatically would feel more seamless

Objection: requiring Enter after reboot looks like an unfinished restoration.

Evidence: agent commands can mutate a repository, deploy code, access credentials or spend money. The environment may have drifted. Zellij's armed-command behavior is a useful safety precedent.

Verdict: cut automatic submission. Preserve the user gesture. Improve the preflight and post-submission verification so the pause feels intentional and trustworthy.

### Challenge 7: native process checkpointing would close T3 completely

Objection: reconstructing shells and conversations is weaker than restoring memory and file descriptors.

Evidence: [CRIU is Linux software](https://criu.org/Main_Page) and depends on Linux kernel facilities. A macOS equivalent for arbitrary local processes is not a practical product substrate. A VM can save whole-machine state but adds images, environment boundaries, authentication friction and another filesystem.

Verdict: cut native macOS checkpoint claims. Defer opt-in hermetic VM capsules to a specialised future mode. The daily driver should be honest about T3: processes die; Tortie restores verified intent, conversation and readable context.

### Challenge 8: encrypting all local state sounds safer

Objection: terminal history and agent metadata are sensitive, so every local object should be encrypted immediately.

Evidence: encryption tied to one Keychain can make offline repair and cross-device recovery harder. It does not help if malware runs as the unlocked user. Permission errors, excessive capture and diagnostic leaks are more immediate risks.

Verdict: require user-only permissions, redaction and data minimisation at P0. Require encryption for portable and off-device bundles. Add local encryption where the threat model and recovery-key design are explicit, rather than using it as a security adjective.

### Challenge 9: off-device backup could turn Tortie into a cloud product

Objection: 100,000 users need reliable cross-device recovery, which suggests accounts, hosted storage and sync.

Evidence: a mandatory service would add authentication, billing, privacy, support and availability as new ways to lose trust. Existing user-owned destinations and mature backup tools already solve object storage.

Verdict: keep local-first and account-free. Build a verified encrypted bundle and user-owned destination first. Remote attachment should come before copying “live” state between machines. Consider a hosted destination only after observed demand and independent local export are proven.

### Challenge 10: richer recovery UI could become the dashboard the Zen rejects

Objection: certificates, generations, integrity checks and restore history invite a large observability surface.

Evidence: most users need only to know what needs judgment now. Healthy internal state has no claim on attention.

Verdict: keep a small Recovery Centre behind degradation or deliberate inspection. No backup streaks, status theatre, fleet counters, health score or ambient recovery feed. Use the machinery to remove anxiety, not visualise it.

### Challenge 11: bundling tmux creates a maintenance burden

Objection: the system package transfers security updates and compatibility work to someone else. Bundling makes Tortie responsible for nested signing, CVEs and long-lived server upgrades.

Evidence: system availability, version and configuration are not stable enough for a product promising invisible durability to 100,000 people. A running server also cannot be replaced casually.

Verdict: keep bundling and accept the obligation. Maintain an explicit no-kill server lifecycle. Verify versions at runtime, ship security updates, and let old servers drain rather than forcing them to match the GUI.

### Challenge 12: workspace backup would make “nothing important gets lost” more complete

Objection: a perfect session recovery is little comfort if untracked files disappear.

Evidence: silently copying ignored files or worktrees can capture large artefacts, secrets and licensed data. Git and machine backup already have well-understood ownership. Tortie's distinctive responsibility is continuity metadata and session intent.

Verdict: cut repository backup from the core promise. A later encrypted, explicit workspace-protection mode can cover dirty and untracked files without changing Git state. It must remain separate from session recovery.

## 12. Final keep, defer and cut decisions

### Keep now

These form the minimum honest public durability release:

1. stable durability root and verified gmux-to-Tortie migration
2. bundled pinned tmux with a no-kill socket transition
3. authority matrix and typed restore state machine
4. versioned adapter recovery contracts and preserved provenance
5. persisted, isolated and release-enforced marker-turn conformance
6. adaptive rendered checkpoints and versioned capsules
7. restore preflight, staged outcomes and confirmed handoff
8. `synchronous=FULL` for critical transactions plus integrity checks
9. verified generational database recovery copies
10. power-loss-safe recovery-object writes and retention
11. reversible remove and transactional restart
12. calm Recovery Centre
13. isolated sockets, roots, providers and fault injection for tests
14. packaging, signing, notarisation and upgrade compatibility

### Keep next

These are necessary for the product to remain trustworthy as adoption grows:

1. headless Tortie Host and sole-mutation protocol
2. durable spatial state and dirty-editor hot exit
3. structured Agent Attention Contract with leases and causal IDs
4. safe environment fingerprint and drift repair
5. deterministic manifest reconstruction
6. selective continuity journal
7. encrypted portable recovery bundle
8. user-owned off-device destination

### Defer until evidence supports them

1. remote Host attachment over SSH or a private mesh
2. raw PTY flight recording
3. provider-store archival copies
4. cross-device provider-session rebinding
5. opt-in dirty-workspace backup
6. a hosted Tortie backup service
7. VM-backed hermetic project capsules
8. provider-neutral recovery briefs for unsupported agents

### Cut from the core design

1. replacing tmux with a custom PTY daemon
2. arbitrary native macOS process checkpointing
3. a privileged LaunchDaemon solely to survive logout
4. automatic execution of restored agent commands
5. full event sourcing for ordinary UI state
6. syncing an open SQLite directory through a consumer file-sync service
7. copying private provider stores by default
8. storing the whole process environment
9. calling transcript injection an exact resume
10. an ambient backup or agent-fleet dashboard

## 13. Fault and acceptance matrix

The promise is not proven by unit coverage alone. Each row must run against an isolated continuity root and `-S` socket. A release report should record the app, Host, tmux, adapter and provider versions exercised.

| Boundary | Injected failure | Required invariant |
| --- | --- | --- |
| Before declaration commit | Kill creator | No process exists and no misleading session appears. |
| After declaration, before spawn | Kill creator | Intent remains recoverable or is safely rolled back on reconcile. |
| After spawn, before UUID stamp | Kill creator | Process is not adopted by name; repair is explicit. |
| After UUID stamp, before launch record | Kill creator | Reconcile finds identity and reconstructs without duplication. |
| During provider-ID harvest | Hide process enumeration or delay store write | Evidence remains weak or unknown; exact resume is not claimed. |
| Two same-provider agents | Interleave store writes | Each ID correlates to the correct pane or becomes ambiguous. |
| Missing original cwd | Restore Qwen or Pi | State becomes `repair_required`; no project-root fallback runs. |
| Missing or changed binary | Restore | Preflight stops before creating a misleading replacement. |
| During checkpoint write | Kill Host or lose power | Previous verified generation remains complete. |
| During database backup | Kill Host | Staged copy is ignored unless it opens and verifies. |
| During migration | Kill app or Host | Old verified copy remains available and current state is quarantined if unclear. |
| During each restore stage | Kill app, Host or tmux client | Retry is idempotent and never skips to healthy. |
| After command is armed | Reopen UI | Command remains visible and unsubmitted; no duplicate line is injected. |
| After user submits resume | Provider rejects ID | State becomes failed or repair-required, not conversation-confirmed. |
| Clean process exit while UI is closed | Exit zero | Durable exit receipt records completion rather than restorable loss. |
| Failed process while UI is closed | Exit non-zero | Failure is retained and raised once, with no duplicate notification. |
| Electron crash | Kill renderer and main | tmux and Host continue; client reconnects from ordered state. |
| Host crash | Kill helper | tmux continues; Host restarts, reconciles and does not duplicate side effects. |
| tmux server loss | Kill server | Latest verified checkpoint and provider evidence define the precise recovery point. |
| Reboot | Kill all user processes | Restored place, transcript and exact supported conversations match recorded certificates. |
| Socket path removed | Delete pathname while server lives | Tortie detects the orphan condition and offers a no-kill recovery path where possible. |
| Manifest corruption | Damage pages or remove WAL | Database is quarantined; a verified copy or reconstruction plan is offered. |
| Empty manifest with live sessions | Replace DB | Foreign sessions remain untouched; Tortie sessions can be proposed from verified capsules. |
| Disk full | Fail declaration, checkpoint, backup and prune writes | No successful state is reported; previous generations remain intact. |
| Permission denial | Remove access to root or provider store | State becomes degraded with one actionable repair, not reset. |
| Product rename | Start Tortie over existing gmux state | Copy-first migration finds and verifies every project and session. |
| Upgrade with live sessions | Change app, Host and bundled tmux versions | No running server is killed; compatibility or deferral is explicit. |
| Renderer backpressure | Stop output acknowledgements | Disposable client detaches; Host and tmux memory remain bounded. |
| Restore on a clean Mac | Import encrypted bundle | User can inspect and rebind projects without the old Keychain or path layout. |

Real agent conformance adds one provider-specific assertion: a unique marker from before destruction remains semantically available after native resume. Seeing an old line in replayed terminal text does not satisfy this assertion.

## 14. Sequenced roadmap

### Gate 0: make current claims honest

Time horizon: immediate

- keep the shipped distinction between live reattachment, exact conversation resume, capture in progress and directory-only recovery
- stop marking partial restore as `running`
- persist capture provenance
- correct documentation that currently claims bundled tmux, app-support sockets, self-description, stored layout or hidden login restoration
- update the Phase 13.5 backlog and shared type comments so shipped capture paths, missing UI and timeout behavior are described accurately

Exit test: no UI state or documentation uses a stronger recovery verb than the stored evidence permits.

### Gate 1: sanctify the local recovery path

Time horizon: before the public daily-driver claim

- stable root and rename migration
- pinned tmux packaging and socket transition
- typed restore state machine
- adaptive checkpoints and continuity capsules
- critical SQLite durability and integrity checks
- online recovery-copy ring and retained generations
- reversible deletion, transactional restart and Recovery Centre
- isolate the shipped resume canaries and add the remaining fault harness

Exit test: every P0 row in the fault matrix passes, including restore from a sampled generation and exact marker-turn resume for every advertised provider/version.

### Gate 2: keep watch when the window is gone

Time horizon: before scaling beyond an enthusiast daily-driver cohort

- extract and ship the Tortie Host
- make the Host authoritative through a versioned protocol
- move attention, harvest, reconciliation and checkpoint scheduling out of Electron
- persist spatial state in the Host-owned store
- add structured attention leases and deduplication

Exit test: close the window for hours while agents work, ask, fail and exit; reopen into the correct place with no lost checkpoint interval beyond the stated objective.

### Gate 3: make recovery portable

Time horizon: before 100,000 users

- encrypted recovery export and import
- user-owned off-device generations
- clean-Mac rebinding and compatibility preflight
- recovery-key support and restore rehearsal
- privacy and retention policy suitable for organisations

Exit test: a user who loses the original Mac can restore Tortie-owned continuity state from a user-held secret and verified bundle, while the product clearly identifies provider conversations or workspace data that depend on external systems.

### Gate 4: expand only from observed need

Time horizon: later

Consider remote attachment, provider-store archival, workspace protection, raw flight recording or hosted storage only after local continuity metrics and recovery incidents identify a real gap. None is required to prove the Zen.

## 15. Success measures for a 100,000-user daily driver

Avoid engagement measures that reward more supervision. Measure whether Tortie removes reconstruction and false interruption.

| Measure | Desired direction |
| --- | --- |
| Unexpected live-session loss after UI failure | Zero in supported conditions |
| Advertised exact-resume conformance | 100% for named provider/version pairs |
| Restore attempts that end in an overstated healthy state | Zero |
| Sessions with a recent verified recovery point | More than 99.9% when checkpointing is enabled |
| Verified recovery-copy restore success | More than 99.99% in automated sampling |
| False “needs input” interruptions | Declining and source-calibrated |
| Duplicate notifications for one causal request | Zero |
| Median human decisions needed after ordinary reopen | Zero |
| Median human decisions needed after reboot | One or fewer per active agent, because resume stays armed |
| Incidents recovered without support or manual file surgery | Increasing toward all ordinary corruption and migration cases |
| Idle Host resource use | Low enough to remain unnoticed on a developer laptop |

Do not optimise “agents watched”, “sessions displayed”, notification volume or time in app. Those measures conflict with the product's job.

## 16. What the final architecture uniquely achieves

The market inventory in [Agent workspace product inventory](24-agent-workspace-product-inventory.md) shows that many products already run multiple agents, organise panes, preserve chat, create worktrees or show status. VS Code's Agents window and Agent Host make “several agents beside code” an especially weak differentiator.

Tortie's defensible result is the combination:

> A disposable, familiar workbench observes a durable local Host. tmux keeps arbitrary work alive. Structured evidence decides what deserves attention. Provider-native resume is claimed only when it has been tested. Recovery copies are trusted only after they have been restored. Healthy machinery stays invisible.

That is how the product can become more durable without becoming more operational. The architecture gets stronger; the interface gets calmer.

The Zen after this work remains unchanged:

- the shell outlives the window
- the conversation returns when the provider can truly resume it
- every thread keeps its place
- only questions, decisions, failures and degraded protection rise
- recovery requires no knowledge of tmux, SQLite, adapters or backup generations

## 17. Sources

Project evidence:

- [The Zen of Tortie](../ZEN-OF-TORTIE.md)
- [Pre-build architecture assessment](../audits/2026-08-09-prebuild-architecture-assessment.md)
- [Reboot survival research](09-reboot-survival.md)
- [Agent workspace product inventory](24-agent-workspace-product-inventory.md)
- [tmux supervisor](../../src/main/tmux/supervisor.ts)
- [tmux configuration](../../resources/gmux-tmux.conf)
- [manifest store](../../src/main/manifest/store.ts)
- [session lifecycle and restore orchestration](../../src/main/sessions/core.ts)
- [snapshot store](../../src/main/restore/snapshots.ts)
- [restore service](../../src/main/restore/restore.ts)
- [restore journal](../../src/main/restore/journal.ts)
- [durable-write service](../../src/main/durable/write.ts)
- [database integrity gate](../../src/main/db/integrity.ts)
- [database salvage path](../../src/main/db/recover.ts)
- [safe restart transaction](../../src/main/restart/restart.ts)
- [power-event checkpointing](../../src/main/power/index.ts)
- [fault harness](../../build/fault-harness.mjs)
- [activity monitor](../../src/main/activity/monitor.ts)
- [agent registry](../../src/main/agents/registry.ts)
- [resume harvester](../../src/main/manifest/harvest/index.ts)
- [renderer layout persistence](../../src/renderer/state/layout.ts)
- [packaging configuration](../../electron-builder.yml)

External primary sources:

- [iTerm2 session restoration](https://iterm2.com/documentation-restoration.html)
- [iTerm2 tmux integration](https://iterm2.com/documentation-tmux-integration.html)
- [tmux concepts](https://github.com/tmux/tmux/wiki/Getting-Started)
- [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode)
- [WezTerm multiplexing](https://wezterm.org/multiplexing.html)
- [Zellij session resurrection](https://zellij.dev/documentation/session-resurrection.html)
- [VS Code Agent Host](https://code.visualstudio.com/docs/agents/concepts/agent-host)
- [VS Code advanced terminal persistence](https://code.visualstudio.com/docs/terminal/advanced)
- [VS Code Agents](https://code.visualstudio.com/docs/agents/concepts/agents)
- [VS Code Hot Exit](https://code.visualstudio.com/docs/editing/codebasics#_hot-exit)
- [Apple `SMAppService`](https://developer.apple.com/documentation/servicemanagement/smappservice)
- [SQLite online backup API](https://www.sqlite.org/backup.html)
- [SQLite corruption guidance](https://www.sqlite.org/howtocorrupt.html)
- [SQLite pragmas](https://www.sqlite.org/pragma.html)
- [`better-sqlite3` backup API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [restic integrity checking](https://restic.readthedocs.io/en/stable/045_working_with_repos.html#checking-integrity-and-consistency)
- [restic append-only guidance](https://restic.readthedocs.io/en/stable/060_forget.html#security-considerations-in-append-only-mode)
- [Electron application paths](https://www.electronjs.org/docs/latest/api/app)
- [Electron `safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage)
- [CRIU overview](https://criu.org/Main_Page)

## 18. Final decision

Do not broaden Tortie into a more complete IDE or a more visible orchestrator. Deepen the one promise competitors still struggle to make honestly.

The committed architecture proves that a session can outlive its window and that a gmux installation can move to Tortie without moving first or deleting the original. Phase 19 also proves that a killed app can recover across an interrupted restore without losing the manifest, live tmux session or last verified snapshot generation.

The next architecture must prove that Tortie can remain watchful without the window, recover the right conversation rather than merely a shell, restore the same place, detect when its evidence is weak, recover from a verified database copy rather than last-resort salvage, and ship that behavior on a pinned and authenticated substrate.

When those paths are boring, inspectable and continuously tested, Tortie can make a rare daily-driver promise:

> Close it without fear. Return without reconstruction. If recovery is uncertain, Tortie will know before it tells you that you are safe.
