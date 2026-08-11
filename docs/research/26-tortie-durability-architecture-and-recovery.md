# Tortie durability, architecture and recovery assessment

Date: 2026-08-11  
Decision: Tortie has the right process substrate, but it does not yet earn the whole promise in [The Zen of Tortie](../ZEN-OF-TORTIE.md).  
Scope: the committed product at `6dbd249`, the current Phase 13.5 working tree, and the path to a trustworthy daily driver for 100,000 users.

## Executive verdict

Tortie already does one difficult thing unusually well. A tmux server, rather than the Electron window, owns the live processes. Closing or crashing the interface can leave shells, agents and servers running. Session intent is written before spawn. Sessions are reconciled by immutable identity rather than display name. Those choices make the foundation credible.

The complete promise is not yet credible.

The committed product scores about 45 out of 100 against the Zen. The current uncommitted Phase 13.5 work could raise that to about 55 out of 100 after real agent-resume conformance. T1 process continuity alone scores about 85 out of 100. The gap is everything around it: watchfulness while the UI is absent, exact conversation recovery, honest restore outcomes, spatial restoration, database integrity, generational backup, upgrade safety and user-visible repair.

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

The report recommends 30 changes:

- 10 architectural changes
- 10 product and technology mechanisms
- 10 backup and recovery-sanctity changes

The highest-priority work is not another visible feature. It is a typed restore state machine, a stable storage and socket boundary, verified agent resume, continuous recovery checkpoints, SQLite integrity and recovery copies, and a calm repair path that never reports success after partial failure.

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
| Shipped | Present in committed source and exercised by ordinary tests or direct code paths |
| Working tree | Present only in modified or untracked Phase 13.5 work; not treated as a released capability |
| Documented | Claimed or designed in project documents but not matched by the current implementation |
| External | Verified against first-party documentation or primary source code |

The audit traced the lifecycle from declaration through spawn, observation, snapshot, process loss, restore and deletion. It reviewed the tmux supervisor and configuration, manifest schema and reconciliation, activity engine, hook receiver, agent registry and harvesters, restore service, renderer persistence, settings, app lifecycle and packaging.

Three independent reviews covered:

- architecture and exact failure boundaries
- technology mechanisms and feasibility
- backup, integrity, privacy and restoration sanctity

The recommendations then went through an adversarial keep, defer and cut pass. A mechanism survived only if it improved a stated continuity layer without turning Tortie into a dashboard, a new multiplexer, a general backup product or a cloud fleet manager.

The full restricted-environment test run passed 566 tests. Six environment-dependent tests could not complete because tmux socket access, FSEvents and process enumeration were restricted. Type checking passed. Focused backup tests passed 40 cases. These results support the ordinary code paths but do not prove reboot, power-loss, corruption or real-provider resume behavior. There is no isolated fault-injection or resume-conformance release gate today.

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

| Dimension | Weight | Committed | Working tree | Reason |
| --- | ---: | ---: | ---: | --- |
| Live process continuity | 20 | 17 | 17 | tmux owns processes and the GUI detaches cleanly, but packaging and socket location remain fragile. |
| Exact conversation recovery | 20 | 6 | 11 | Shipped coverage is narrow. Phase 13.5 broadens capture, but provenance and real resume proof are missing. |
| Attention protection | 15 | 10 | 12 | The tiered detector is strong while Electron runs. It stops watching when the app quits. |
| Spatial continuity | 10 | 4 | 4 | Important project and split state remains renderer `localStorage`, not the durable core. |
| Integrity and disaster recovery | 15 | 3 | 3 | Single database, overwritten snapshots, no checks, generations, restore drill or off-device mode. |
| Packaging and upgrade safety | 10 | 2 | 2 | System tmux, temporary socket, unsigned package and no live-server migration protocol. |
| Restore honesty and repair | 10 | 3 | 6 | The prototype improves capture state, but partial restore can still be labelled successful and the recovery UI is absent. |
| Total | 100 | 45 | 55 | Working-tree score assumes Phase 13.5 passes conformance and lands safely. |

The product therefore has an unusual shape: a strong foundation under an under-proven promise. That is a better problem than a polished interface over a disposable process model, but it still blocks a daily-driver durability claim.

## 5. What already works and should be preserved

### 5.1 Process ownership is correctly separated from the window

The [tmux supervisor](../../src/main/tmux/supervisor.ts#L41) attaches clients to a server that owns the PTYs. Quitting Tortie disposes the clients, not the server. This is the strongest current invariant and should remain the centre of the architecture.

### 5.2 Intent is written before spawn

The manifest row is inserted before process creation in [the session creation path](../../src/main/ipc.ts#L994), then removed if spawn fails. A crash cannot easily leave an unrecorded process that was successfully declared. This is a good transactional boundary.

### 5.3 Identity is stronger than display names

Tortie stamps an immutable UUID into the tmux pane environment and reconciles against it in [the manifest store](../../src/main/manifest/store.ts#L623). It refuses to adopt sessions merely because a name matches. This protects foreign tmux sessions and lets names remain user-facing labels.

### 5.4 Attention detection is layered

The [activity monitor](../../src/main/activity/monitor.ts#L1) combines native agent state, tmux observations, process-tree evidence and terminal inference. It continues to inspect hidden panes while the app is open. This is more defensible than treating screen scraping as semantic truth.

### 5.5 Restore retains human control

The [restore command builder](../../src/main/restore/command.ts#L18) arms the native provider resume command without pressing Enter. For an agent that can mutate files, deploy code or spend money, that user gesture is a feature rather than friction.

### 5.6 Migrations and snapshot replacement have useful atomicity

Schema migrations run transactionally. Text snapshots use temporary-write then rename in [the snapshot store](../../src/main/restore/snapshots.ts#L57). These protect against some app-crash failure modes. They are useful primitives, although neither is yet a complete durability or backup design.

## 6. Precise current failure boundaries

### 6.1 Closing Tortie preserves processes but ends watchfulness

The app lifecycle in [main/index.ts](../../src/main/index.ts#L1197) quits Electron when the window closes. The activity monitor, hook server, harvesters, reconciler and snapshot service are all disposed. Agents can continue in tmux, but questions, failures, successful exits and newly discovered conversation IDs are no longer recorded.

This contradicts the emotional promise that the user can look away without anxiety. The work continues, but Tortie is no longer vigilant.

### 6.2 Output produced after quit can vanish at reboot

Snapshots are taken on orderly quit, explicit close and detected server exit. [The snapshot module](../../src/main/restore/snapshots.ts#L1) documents the hard-crash window. If an agent continues after Tortie quits and the machine then loses power, the new terminal output has no disk checkpoint.

### 6.3 Server-exit snapshotting happens after the useful moment

The server-exit handler begins snapshotting after the tmux control connection reports exit in [ipc.ts](../../src/main/ipc.ts#L375). At that point `capture-pane` will normally be unavailable. T2 recovery therefore depends on the older snapshot.

### 6.4 A clean process exit while Tortie is absent can be misclassified

The tmux configuration uses `remain-on-exit failed` in [gmux-tmux.conf](../../resources/gmux-tmux.conf#L58). A process that exits with status zero while Electron is absent can disappear without a durable exit receipt. On the next launch the manifest may see a declared session with no live identity and classify it as restorable rather than completed.

### 6.5 Restore can fail partly and still report success

[restore.ts](../../src/main/restore/restore.ts#L59) can catch snapshot replay or resume-command arming failures and return partial results. The caller in [ipc.ts](../../src/main/ipc.ts#L550) does not preserve those outcomes before setting the session to `running`. The renderer can therefore show reassuring copy because an old `resumeArgv` exists, even though the command was not armed.

This is the most serious truthfulness defect. A recovery product must fail closed.

### 6.6 The working-directory fallback can resume the wrong conversation

Restore falls back from a missing original `cwd` to the project root. The Phase 13.5 registry records that Qwen and Pi require the original working directory, and [the launch contract](../../src/main/manifest/agents.ts#L110) says restore must enforce this. That constraint is not persisted through the current restore path. Pi can create a new empty conversation under a superficially plausible command.

### 6.7 Resume evidence is flattened into an optimistic state

Phase 13.5 harvest results include source path, confidence and whether a grace timer was used in [harvest.ts](../../src/main/manifest/harvest.ts#L78). The capture path in [ipc.ts](../../src/main/ipc.ts#L416) persists only the session ID and resume arguments. Exact, weak and grace-accepted evidence can therefore become the same `armed` state.

The new shared `ResumeCapture` type is not yet rendered into a user-visible honesty boundary. Code comments promise more fidelity than the interface provides.

### 6.8 Manifest loss can strand live sessions

Tortie mirrors some metadata into tmux, but reconciliation adopts only IDs already known to SQLite. If the manifest is empty or corrupt, stamped live sessions are treated as foreign. The documentation claim that sessions are self-describing when the manifest is lost is not true in the current implementation.

### 6.9 Spatial memory is outside the durable model

[layout.ts](../../src/renderer/state/layout.ts#L1) explicitly stores split geometry in renderer `localStorage`; the manifest does not know the split tree. Other active project and workbench choices are also browser-local in [store.ts](../../src/renderer/state/store.ts#L268). This can survive an ordinary restart, but it is not versioned, backed up, integrity-checked or repairable.

The Zen promises a coherent place, not merely surviving processes. Spatial state is meaningful continuity.

### 6.10 The manifest is consistent but not protected enough

The SQLite connection uses `WAL + synchronous=NORMAL` in [manifest/store.ts](../../src/main/manifest/store.ts#L377). There is no boot integrity check, rolling online backup or corrupt-database quarantine. One damaged or missing database can remove the index that connects projects, sessions, resume evidence and live tmux identities.

### 6.11 The snapshot is one unverified plaintext generation

Each session overwrites one text file. The write has no schema, generation ID, content hash, reason, line count, byte count, `fsync`, directory sync or retained predecessor. Concurrent snapshot attempts share a fixed temporary name. It is a useful recent transcript, not a sanctified recovery object.

### 6.12 Packaging does not match the documented substrate

The build still uses system tmux and a fixed `-L gmux` label in [supervisor.ts](../../src/main/tmux/supervisor.ts#L41). The design documents specify a bundled pinned tmux and an app-support socket. The package configuration remains unsigned and not hardened in [electron-builder.yml](../../electron-builder.yml#L118).

The current `-L` socket sits under tmux's temporary-directory convention. macOS cleanup can remove the pathname while a server still lives, leaving it unreachable. A product rename can also split state if Electron derives a new `userData` directory before migration.

### 6.13 Login restoration is visible and manual

[login-item.ts](../../src/main/restore/login-item.ts#L27) registers the main app at login. Ordinary startup creates and shows the window. Sessions remain ready for manual restoration. This does not match the documented hidden recovery flow, and it does not supply a background continuity service.

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

