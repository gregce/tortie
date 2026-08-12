# Remote sessions for Tortie — and the durability that comes first

| Assessment fact | Value |
| --- | --- |
| Date | 12 August 2026 |
| Codebase assessed | `db3cd02` (Phase 17 shipped) |
| Questions | **(A)** Which durability gaps in [assessment 26](26-tortie-durability-architecture-and-recovery.md) should close next, in what order? **(B)** Should Tortie offer durable *remote* sessions, on what infrastructure, and should Tortie build and operate that infrastructure? |
| Inputs | Assessment 26 read in full; [The Zen of Tortie](../ZEN-OF-TORTIE.md); [FINAL-REPORT §2](../FINAL-REPORT.md); `CLAUDE.md`; committed Tortie source, read-only; prior art at `/Users/gdc/stoa` and `/Users/gdc/specstory-sync`, read-only; live provider verification on 12 August 2026 |
| Headline | **Close five local gaps first. Do not build remote infrastructure — ever. Ship remote as SSH attach to machines the user already owns, and only after the local gaps close.** |
| Structure | §1–§7 are the synthesis and the decision. Appendices A, B and C are the three independent dimension write-ups the synthesis rests on, kept whole because they carry the evidence. |

---

## 1. Recommendation

### 1.1. The local durability fixes, ranked

Ranked by **expected loss** — how much of the user's work disappears, times how often the triggering situation occurs, divided by the cost to close — not by assessment 26's release-gate priorities. The full defect detail and proof methods are in §2 and Appendix A.

| Rank | Fix | Why it is here, in one sentence | Cost | Tier |
| ---: | --- | --- | --- | --- |
| **0** | **G1a — surface the silent ENOSPC** | A checkpoint that fails on a full disk is caught and `console.warn`-ed, so the user quits believing their transcripts were saved: the worst behaviour in the product and the smallest fix in this list. | XS | 2 |
| **1** | **G5 — stop reporting `running` after a partial restore** | `core.ts:836` destructures away `replayed` and `armedCommand` and sets `status:'running'`, so a recovery product's one saleable asset — the accuracy of its own status — is destroyed for a day's work. | S | 2 |
| **2** | **G4 — power-loss-safe snapshot generations** | The single snapshot per session is replaced destructively with no `fsync` and no predecessor, so one badly-timed power cut leaves no good copy at all. | S | 2–3 |
| **3** | **G3 stage 1 — tray residency instead of quit** | `window-all-closed → app.quit()` disposes every observer at exactly the moment the product promises is safe; hiding to the tray Tortie already ships recovers roughly 80% of that loss for roughly 5% of the Host's effort. | S | 3 |
| **4** | **G1 — timed checkpoints with a stated RPO** | There is no capture timer at all, so a crash loses every session's readable output back to the last clean quit — in the promised workflow, the entire unattended period. | M | 3 |
| **5** | **G2 — manifest integrity gate, verified ring, quarantine, reconstruction** | The manifest is the only single file whose loss is total across every project, and the verified-copy machinery that fixes it already shipped in `migrate/userdata.ts` and has been run against real user data. | S–M | 3 |
| **6** | **G9 — transport loss must not be read as process loss** | Control-client exit unconditionally triggers the server-death path, and the state it produces (`restorable` for a session that is alive) invites a "Restore all" that starts a second agent in the same worktree — a data-loss shape, and the precondition for anything remote. | S | 3 |
| **7** | **G6 — persist resume provenance** | `resumeCaptureFor` derives `armed` from the capture *mechanism*, so an exact correlation and a grace-timer guess are stored identically and the user can be handed someone else's conversation with full confidence. | M | 3 |
| **8** | **G7 — move spatial state into the durable model** | The arrangement of work lives in renderer `localStorage` and survived the Tortie rename by a judgement about a Chromium directory name rather than a durability decision. | M | 2 |
| **9** | **G8 + G3 stage 2 — bundled tmux on an owned socket, and the Host** | The two large packaging-heavy items; pull orphan-socket detection out of G8 and land it early, because that is the part that turns a frightening state into a recoverable one. | M–L | 3 |

### 1.2. The remote verdict

Four answers, because "should we do remote" is four different questions.

| Question | Answer | The reason, in one sentence |
| --- | --- | --- |
| **Build** the infrastructure? | **No, and not later either.** | No sandbox vendor supports days, so "infrastructure we build and maintain" means becoming a hosting company — a fleet of ordinary VMs plus an image, an updater, a reaper, quotas, abuse handling, egress billing, a support surface and a credential broker — for a benefit the user can buy for €4.35 a month on hardware they already control. |
| **Buy** a sandbox substrate? | **No.** | Every sandbox product verified today caps continuous runtime at 24 hours or less and offers snapshot-and-recreate rather than a process that keeps running, and — decisively — five of the eleven agents in `registry.ts` key their conversation store to `realpath(cwd)` inside a home directory, so exact conversation resume cannot survive a disposable filesystem. |
| **Defer** the remote product? | **Yes — behind the local gates.** | Remote attach must not ship before §1.1 items 0–6 have landed, because building a remote continuity root before the local one has an integrity gate, verified copies and honest restore statuses means shipping the same defects twice, on a machine the user cannot easily inspect. |
| **Do the cheap thing** now? | **Yes, two of them.** | G9 fixes a WAN-shaped correctness bug that is already reachable locally and is the gate for everything remote; and before funding a quarter of remote work, measure whether the real complaint is "my laptop slept", whose fix is `caffeinate` while sessions are active plus honest labelling, and costs a day. |

**The shape when remote does ship: Tortie on the other machine, attached over SSH.** The remote box runs an ordinary Tortie owning its own tmux server, its own manifest, its own harvesters and its own loopback hook receiver; the local app swaps `spawn tmux attach-session` for `ssh <host> tmux attach-session` and is a *client*, not a second authority. The repo problem disappears because the code lives permanently where the work happens. The manifest problem disappears because there is one per machine. The credential problem disappears because it is the user's own box and they are already logged in. Design in §4.

### 1.3. The recommended provider

**First choice: the machine the user already owns** — a desktop, a work box, a Mac mini. No vendor, no egress, no account, keys already present, and the agent's `~/.claude/projects/…` store is exactly where it would be locally.

**Second choice, if they need to rent one: an ordinary always-on VPS, bought by the user in their own account.** Hetzner CX22 at roughly €4.35/month for 2 vCPU, 4 GB and 40 GB NVMe is the cheapest credible option; Fly Machines always-on with a volume is roughly $21.50/month of compute plus $6/month for 40 GB if the user wants the Fly platform. Tortie documents a cloud-init recipe and implements none of it.

**Not a candidate at any price: the sandbox platforms.** Their lifetime ceilings, idle auto-stops and snapshot-and-recreate persistence are not a limitation to route around; they contradict the thesis that the live process outlives the window. Survey in §3.

---

## 2. The local backlog, with proof method per item

Every claim below was re-verified against `db3cd02` rather than inherited from assessment 26; line references are HEAD. Nothing in Phases 16–17 closed any of these. Full defect narratives are in Appendix A §1.3.

| # | The defect, as it stands at `db3cd02` | The fix | How it is proven | Cost | Tier |
| --- | --- | --- | --- | --- | --- |
| **G1a** | `snapshotAllSessions` catches ENOSPC from `writeFile` and emits `console.warn`. The user is told nothing and quits believing transcripts were saved. | One degraded-protection notice, emitted once, through the channel that later becomes the Recovery Centre. | Fill a loopback disk image, run a capture pass, assert the notice fires exactly once and that no successful state is reported. | XS | 2 |
| **G1** | No capture timer exists. The only real capture points are app quit and `killSession`; the `%exit` handler at `sessions/core.ts:551` fires *after* the server is dead and its own comment concedes the captures "fail harmlessly". | Adaptive checkpoint scheduler in a new `src/main/restore/checkpoint.ts`, driven by `GmuxCore`; capture on the last healthy control-mode heartbeat rather than on `%exit`; force a capture on `powerMonitor` `suspend` (not used anywhere in `src/` today); publish a recovery-point objective in UI copy. | New `smoke:checkpoint` in the `GMUX_SMOKE` family: isolated `-S` socket and `userData`, sessions emitting known output continuously, `SIGKILL` the main process at a random point, relaunch and **measure the byte distance from the last checkpoint to the true tail**. Pass condition is a measured maximum RPO plus bounded CPU, disk writes and wakeups at 10, 50 and 100 sessions. Fixtures for full-screen TUI, wide Unicode and 50,000-line scrollback. | M | 3 |
| **G2** | `db/sqlite.ts` sets three pragmas and nothing else: no `quick_check`, no second copy anywhere on disk, no quarantine, no reconstruction. `synchronous=NORMAL` can discard the declaration row at `sessions/core.ts:1444` while the spawned process survives. An empty manifest strands every live session, because the identity rule correctly refuses to adopt them. | `quick_check` + quarantine in `openGmuxDatabase`; `synchronous=FULL` on critical commits only; **generalise the shipped `VACUUM INTO` + `DbVerification` row-count machinery out of `migrate/userdata.ts` into `manifest/recovery.ts`** as a verified ring; deterministic reconstruction from `@gmux-id` stamps requiring an explicit human decision. | Extend `db/__tests__/sqlite.test.ts` (which already reproduces `SQLITE_BUSY_SNAPSHOT` deterministically) with truncated-page, removed-WAL, corrupt-index and FK-violation fixtures. Then `smoke:recovery`: corrupt the live database, boot, assert the damaged file survives at its quarantine path, a generation restored into a temporary root, and **foreign tmux sessions untouched**. Record before/after latency for each commit promoted to `FULL`. | S–M | 3 |
| **G3** | `index.ts:1702` quits on `window-all-closed`, disposing the activity monitor, hook receiver, ID harvesters, reconciler, snapshot service and tray. Lost: exit receipts (`remain-on-exit failed` means a clean exit leaves no trace, so it is later misclassified `restorable`), late conversation IDs, and failure notices. | **Stage 1:** hide to the existing tray instead of quitting; Quit becomes an explicit act. **Stage 2:** assessment 26's A3/A4 Host, extracted in-process first, then a signed `SMAppService` LoginItem — never a privileged LaunchDaemon. | Stage 1: `smoke:tray` — close the window, drive an agent to completion and to a failure inside tmux, wait past a checkpoint interval, reopen, assert the exit receipts, the checkpoint and the harvested ID are all present; plus a **measured** idle CPU / wakeups / RSS line over 30 minutes with 10 sessions, recorded in the commit message. Stage 2: the full fault matrix in 26 §13, killing helper and client independently. | S / L | 3 |
| **G4** | `restore/snapshots.ts` writes tmp + rename with no `fsync` on the file, no directory sync, one destructively replaced generation, no hash, no `COMPLETE` marker, and no per-session write lock (`killSession` and `snapshotAllSessions` can collide). | Unique temp object, `fsync`, verify size and SHA-256, rename, `fsync` the directory, write `COMPLETE` last; per-session in-process lock; small content-hash-deduplicated ring; capsule metadata (session UUID, generation and parent, reason, cwd, line and byte counts, hash). | Unit pass for the write sequence at `smoke:t1` tier, then Tier 3 faults: `SIGKILL` mid-write and assert the previous verified generation is intact **and selected**; ENOSPC and assert no success is reported and the predecessor survives. | S | 2–3 |
| **G5** | `restore/restore.ts` computes and returns `replayed` and `armedCommand`; `sessions/core.ts:836` destructures `const { info } = outcome` and sets `status:'running'`. The renderer keeps promising conversation recovery because a `resumeArgv` exists on the record. | Persist three stage results (`shell_created`, `transcript_replayed`, `resume_armed`) and derive `restored_armed` / `restored_transcript` / `restored_shell_only` / `restore_failed`; make `running` unreachable from a partial result; the renderer reads stages, not `resumeArgv`; journal the attempt before acting. | Tier 2 fixtures forcing `typeIntoPane` to throw at each stage, asserting the resulting status **and the exact UI string**. Tier 3 for the journal: kill the app between each pair of transitions and assert the next launch neither duplicates the session nor overstates the result. | S | 2 |
| **G6** | `harvest/stores.ts` produces source path, confidence and grace-timer acceptance; none is persisted. `resumeCaptureFor` (`sessions/core.ts:198`) derives the stored value from the capture *mechanism* alone. Two same-agent sessions in one cwd are distinguishable only by timing. | Persist the provenance chain (source record, correlation key, confidence `exact`/`weak`/`grace_accepted`, capture time, original cwd, provider store root, provider and adapter versions); make `armed` a family and let weakness survive into the copy; wire the `conformance:resume` result into the session record. | `conformance:resume:capture` (~16 s, no turns, no tokens) as the cheap gate, plus adversarial fixtures: two same-agent sessions in one directory with interleaved store writes, a stale store record, a copied repository, hidden process enumeration, a reused session ID. **Invariant: ambiguity produces weak or unknown, never an exact claim.** Full `conformance:resume` roundtrip once for the phase. | M | 3 |
| **G7** | `renderer/state/layout.ts` and `store.ts` keep split geometry, active project and workbench choices in `localStorage` — unversioned, unbacked, uncheckable, inside the Chromium profile rather than the continuity root. It survived the rename only because `Local Storage` was absent from `SKIP_ENTRIES`. | Versioned, main-process-owned schema in the manifest for tab order, active project and session, session order, split tree and ratios, focus, editor tabs, workbench mode and window geometry. Transient drag and animation state stays in the renderer. | Tier 2 plus one targeted fault: crash and reopen with several projects, splits and dirty buffers; migrate the layout schema forwards and backwards from a recovery generation; restore onto a smaller or missing display without placing a window off-screen. | M | 2 |
| **G8** | `tmux/supervisor.ts` uses whatever tmux the system provides over `-L gmux`, which resolves under `TMPDIR`. macOS can remove the socket pathname while the server lives — every session running, none reachable. | Bundle and pin a signed tmux with its config; new servers on `-S` inside the continuity root; discover the legacy `-L gmux` server and attach **without killing it**, deferring handoff until its sessions drain or the user explicitly migrates. Runtime hash and version verification. | Tier 3: old-client/new-server and new-client/old-server compatibility; socket pathname deletion and permission repair; upgrade with active shells, full-screen TUIs and agents mid-turn. `smoke:t3` moves onto an isolated `-S` socket as part of this, which also pays down 26's A10. | M–L | 3 |
| **G9** | `sessions/core.ts` begins the server-death path when the control connection reports exit. Locally that is a fair proxy; it is still an unconditional inference from *transport* to *process*. The state it can produce — `restorable` for a live session — makes "Restore all" start a second agent on the same branch in the same worktree. | Make `unknown` a first-class state distinct from `restorable`; a session whose liveness cannot be asserted offers no restore button; **only the machine that owns a process may assert its liveness**. This is 26's A5/A6 with a sharper motivation. | Tier 3 fault injection: sever the control connection while the server is demonstrably healthy and assert the session never becomes `restorable` and no snapshot-on-exit path runs; assert no duplicate manifest row and no second spawn under a forced "Restore all". | S | 3 |

**Five things that must not be re-litigated by a well-meaning cleanup.** tmux owns the processes and the app is a client. Intent is written before spawn (`sessions/core.ts:1444`). Identity, never names — and G2's reconstruction must not weaken this to make reconstruction easier; the correct response to ambiguity is a human decision. Resume is armed, not executed. One opener, one pragma set, one migration runner.

---

## 3. The substrate survey, verified 12 August 2026

Two questions were asked of every product: **can it run a tmux server continuously for days**, and **when it stops, does the running process come back or only the disk?**

### 3.1. Sandbox and managed-environment products

| Product | Idle / default stop | Maximum continuous runtime | What actually persists | Indicative price | Candidate? |
| --- | --- | --- | --- | --- | :---: |
| **E2B** | 5 min | **1 h (Hobby), 24 h (Pro)** | Best in class: pause preserves filesystem **and memory and running processes**, retained indefinitely with no TTL, ~1 s resume. But on pause "the service won't be accessible from the outside and all the clients will be disconnected", and pausing costs ~4 s per GB of RAM. | $0.1008/h for 2 vCPU + $0.0162/GiB/h RAM ⇒ ~$0.166/h for 2 vCPU / 4 GiB; **$150/month** Pro floor for anything over 1 h | **No** — a paused sandbox is a paused agent, and 24 h is a hard ceiling |
| **Modal** | 5 min | **24 h** | Filesystem snapshots chain sandboxes; volumes; CPU memory snapshots are GA, GPU snapshots alpha. Docs recommend snapshot-and-restore for anything longer. | Per-second compute | **No** |
| **Vercel Sandbox** | 5 min | **45 min (Hobby), 24 h (Pro)** | Ephemeral Firecracker microVM; snapshots for continuity | Per-second compute | **No** |
| **Cloudflare Sandbox SDK** | Sleeps after 10 min idle, configurable | Can be kept alive until `destroy()` | State ephemeral; `createBackup()` / `restoreBackup()` across sleep | Container pricing | **No** — no runtime guarantee, ephemeral disk |
| **Daytona** | **Auto-stop at 15 min, and it triggers "even if there are internal processes running"** | Configurable wall-clock TTL | Running / Stopped / Archived / Deleted; auto-archive after 7 days stopped (30 days by some docs), filesystem moved to object storage | Per-second compute | **No** — the auto-stop explicitly ignores a busy process, which is the exact case |
| **Fly Sprites** (Jan 2026) | **Sleeps after 30 s** | No stated cap while awake | Marketed as persistent VMs for agents. Filesystem persists on NVMe synced to object storage; **RAM does not — running processes stop and in-memory data is lost.** Fly's own guidance is that a Sprite stays awake only while a process started via exec or console is writing stdout to its TTY; there is a live community thread titled *"Sprite: stay awake with tmux"* describing exactly this failure with Claude Code. | ~$0.46 for a 4-hour intensive session; ~$4/month for 30 hours awake | **No** — the sharpest case of an ephemeral product wearing a durable label |
| **Runloop** | Configurable idle shutdown, extendable via API | Not stated | Suspend/resume preserves **disk only**; daemons and running processes must be restarted after resume | Per-hour devbox | **No** |
| **Depot agent sandboxes** | — | ~8 h session limit (secondary source) | Persistent filesystem, git integration; **async-only, no real-time interactive shell** | — | **No** — no interactive attach at all |
| **GitHub Codespaces** | Idle timeout 30 min default, **settable only 5–240 min** | Stopped, not killed; stopped codespaces retained 30 days | The interesting near-miss: GitHub counts "terminal activity, either input **or output**" as activity, so a *busy* agent keeps a codespace alive indefinitely — and a *waiting* agent does not. | Per compute-hour | **No** — it fails at precisely Tortie's defining moment, the agent waiting for a human |
| **Ona (ex-Gitpod)** | 30 min without user input | **Maximum timeout 24 h**; organisation lifetime policies can lock down sooner | Workspace lifecycle with stop/start | — | **No** — and being acquired by OpenAI for Codex, per 11 June 2026 reporting |

### 3.2. Long-lived machines — the actual candidates

| Substrate | Lifetime cap | Indicative price | Notes | Candidate? |
| --- | --- | --- | --- | :---: |
| **The user's own desktop or Mac mini** | None | Already paid for | No vendor, no egress, no account, keys already present, provider stores already in the right place | **Yes — first choice** |
| **Hetzner Cloud CX22** | None | ~**€4.35/month** for 2 vCPU / 4 GB / 40 GB NVMe (sources spread €3.79–€4.35 depending on region and VAT; note Hetzner raised CPX prices on 1 April 2026) | The cheapest credible always-on developer box | **Yes** |
| **Fly Machines, always-on + volume** | None documented | shared-cpu-2x at $0.0056/h = $4.04/month for 512 MB, plus ~$5/GB/30 days of RAM ⇒ ~**$21.50/month** for 2 vCPU / 4 GB; volumes $0.15/GB/month; egress $0.02/GB in NA and EU | Ignore Fly's *suspend*: it is limited to machines of 2 GB or less and snapshots are explicitly not guaranteed to survive deploys, host migration or maintenance | **Yes** |
| **EC2 / GCE / DigitalOcean** | None | DigitalOcean basic from $4/month; 2 vCPU / 4 GB premium Intel at $24/month | The reference case: a VM has no session concept, so there is no ceiling for a vendor to quietly change | **Yes** |
| **Coder** | None | Self-hosted; you pay raw compute (~$0.15/h for 4 vCPU / 8 GB on AWS as of July 2026) | Architecturally a real candidate, but `coderd` is a control plane over infrastructure **you still run** — it moves the operating burden, it does not remove it | **Yes, with a caveat** |

### 3.3. Two facts the table makes unavoidable

**Per-second pricing is a bet that you stop.** A continuous week of 2 vCPU / 4 GiB costs about **$27.80 on E2B** — on top of a $150/month floor, and impossible anyway because of the 24-hour ceiling — against roughly **$6.40 on Fly** and about **€1.00 on Hetzner**. That is 25× to 60× for a product engineered to be switched off. And removing the TTL removes the cost backstop that both prior-art projects on this machine relied on explicitly: `specstory-sync`'s TTL constant is literally commented *"the cost backstop"*.

**Even the vendor with the deepest possible integration does not hold the machine.** Claude Code on the web, verified today: *"Cloud sessions stop after a period of inactivity and the session's VM is reclaimed… Reopen the session from claude.ai/code to provision a fresh VM with your conversation history restored."* They keep the conversation and reprovision the box. And their repo transport is a `git bundle` under 100 MB that **does not include untracked files** and cannot push back to a remote. Anthropic, with unlimited budget and control of both ends, ships that. There is no clever fourth option waiting to be found.

---

## 4. The architecture for the recommended path

Everything below describes **R1 — Tortie on the other machine, attached over SSH**. It is deliberately small: the only genuinely new durability-critical code is a host record and a staleness rule.

### 4.1. Where the tmux server lives

The remote box runs an ordinary Tortie. It owns its own tmux server on its own `-L gmux` socket with `resources/gmux-tmux.conf`, its own manifest, its own snapshot ring, its own harvesters, its own hook receiver on its own loopback, and its own SpecStory capture. Every invariant in `CLAUDE.md` holds there unchanged, because it is the same program.

The local app changes one thing in plane 2. Instead of

```
node-pty spawn: tmux attach-session -t =<name>
```

it spawns

```
ssh -o ControlMaster=auto -o ControlPersist=… -o ServerAliveInterval=15 <host> \
    tmux -L gmux attach-session -t =<name>
```

Rendering, 8 ms batching and the existing watermark flow control (pause above 256 KB unacked, resume below 64 KB) are untouched. tmux has no network listener and no authentication layer by design — its security model is filesystem permissions — so the transport must be something else, and SSH is the one that passes the Zen's own test.

**Latency, stated honestly.** Control mode has no local echo prediction; every keystroke is a round trip. 1–15 ms on a LAN is indistinguishable from local; 40–80 ms cross-country is noticeable in a TUI and fine in an agent prompt; 90–140 ms transatlantic is perceptibly laggy to type into; 150–400 ms with jitter is unpleasant. The workload saves it: agentic coding is paste-a-paragraph then read-a-lot-of-output, and bulk output pipelines well. **Remote agent panes are usable at continental distance; remote TUI editing is where the user feels the wire** — and Tortie's editor is Monaco over files, not vim in a pane.

Mosh gives predictive echo but **does not support tmux control mode**. Eternal Terminal does support control mode and is the right *optional* upgrade for flaky links, with a documented pathological case of 30–60 second reattach after laptop wake. Neither is a requirement.

**Two networked-multiplexer options are rejected, not overlooked.** A Tortie relay or broker puts a Tortie-operated service in the path of live coding, so the availability of that service becomes the availability of the user's work; if NAT traversal is the real need, the boring answer already exists and the user owns it — a WireGuard mesh such as Tailscale, whose Personal plan covers up to 6 users with unlimited user-owned devices at no cost. And `wezterm-mux-server` was already excluded in FINAL-REPORT §2.2; WezTerm issue #7692 — a mux-server alive with healthy memory while `wezterm cli list` times out and new attaches hang — is exactly the failure mode a bespoke networked control plane produces, and exactly the one Tortie would then own.

### 4.2. Repo sync: there is none, and that is the design

The four candidate mechanisms all break something real: clone-and-push loses uncommitted work, `.env` files and untracked files; a synced worktree (Mutagen, Syncthing) has to resolve conflicts with no human present, over a tree an agent is rewriting at machine speed while `npm install` churns tens of thousands of files; a mounted filesystem puts every `git status` and every ripgrep across the WAN and turns a network stall into a blocked app; and "remote is the source of truth" requires the editor, tree, git and search to execute remotely.

R1 chooses the fourth, and it costs nothing, because under R1 the remote *is* a whole Tortie. **The code lives permanently on the machine where the work happens.** The repo problem does not arise; it is dissolved.

Two rules follow.

**Locus is a property of the project tab, never of the session.** The tree, the git panel, the file watcher, the search index and the editor all follow the code. A tab holding some local and some remote sessions is a tab whose file tree and `git status` are true for some of its panes and false for others. Mixed-locus projects must not be buildable.

**Moving work between machines is a git operation and the interface says so.** "Move to `<host>`" shows exactly what will travel — commits to push, dirty tracked files — and names the untracked files that will be left behind, then requires a gesture. This is the armed-resume precedent (26 Challenge 6) applied to a second irreversible action.

### 4.3. Manifest ownership

Three shapes are possible and only one survives contact with a network.

A **single local manifest with a host column** is cheapest and wrong in the failure case: the local database cannot learn that a remote agent exited or the remote box rebooted until the app reconnects, so it is routinely stale about liveness — which is how the duplicate-agent failure happens. A **synced manifest** puts two writers on durability-critical rows with no human to resolve conflicts; 26 already cut consumer file-sync of an open SQLite directory, and a purpose-built two-way sync is the same mistake with more code.

**One manifest per machine, owned by the Tortie that owns the processes, plus a local index of hosts and an explicitly stale-able cached projection.** Authority follows the processes, which is what 26's A5 authority matrix already says.

| Fact | Authority | When the host is unreachable |
| --- | --- | --- |
| A Tortie session was intended on host H | The manifest on H, mirrored into the local index at creation | Intent is known; state is not |
| That session's process is live | tmux observation on H | **`unknown` — never `restorable`, never `running`** |
| Provider conversation identity | Provider store on H, correlated to the pane on H | Last known, marked stale, with the age shown |
| Recent readable output | Verified checkpoint on H, mirrored opportunistically | Serve the cached copy, labelled with its age |
| Restore succeeded | The restore state machine on H | Cannot be asserted at all |

The rule that falls out is one line and it is the whole safety argument: **a machine may only assert liveness about processes it owns.** That is G9, which is why G9 is worth doing on its own merits before any of this exists.

### 4.4. Secrets

**No broker. Ever.** Both serious implementations of remote agent compute built one — Anthropic states that in Anthropic-hosted environments credentials "are never inside the sandbox with Claude Code; authentication is handled through a secure proxy using scoped credentials", and stoa mints a GitHub App installation token into a clone URL. A broker is a service with an availability obligation, a rotation story, an audit story and a breach story. Tortie would become a custodian of other people's GitHub and model-provider access, which changes what the company is, in service of a feature with no measured demand.

On the user's own box the problem does not get solved, it **disappears**: the agents are already logged in, `gh` is already authenticated, signing keys and `.env` files are already there. This is the same reasoning 26 used in B10 when it chose a user-chosen backup destination over a Tortie cloud account.

Two constraints remain. SSH agent forwarding is a real privilege escalation — anything with root on the remote can use the forwarded agent for the life of the connection — so if it is offered at all it is **off by default and per-host**. And if credentials ever must reach a box, the only acceptable shape is short-lived and scoped: a GitHub App installation token, never a user PAT, and never `specstory-sync`'s 10-year device refresh token, which is recorded here as the anti-pattern it is.

Note also the per-agent cost that a headless remote would add. Claude Code alone has three browserless auth paths (`ANTHROPIC_API_KEY`, which bills separately from a subscription; `claude setup-token` producing a roughly year-long `CLAUDE_CODE_OAUTH_TOKEN` requiring Pro or Max; or forwarding the OAuth callback port), and capability varies within them — `claude remote-control` accepts only interactive subscription auth. Multiply by eleven agents, and `CLAUDE.md`'s Tier 3 rule for anything claimed to work universally across agents makes that a per-agent, per-host, per-OS matrix that must keep passing. R1 avoids it entirely because the user logged in themselves.

### 4.5. The interface that hides it

The resolving distinction: **hide the transport, show the locus.** The user never sees SSH options, control-mode state, socket paths, reconnect backoff or round-trip times. The user must always be able to see which machine a project's work lives on, because location changes what is *true* — which files open, whether `git status` reflects what the agent sees, whether image drop works, what restore means.

1. **The locus badge lives on the project tab**, one short host name styled like the branch indicator. Local projects show nothing, because a badge on everything is a badge on nothing.
2. **Honest verbs extend, they do not multiply.** Transport loss reads "Reconnecting"; host unreachability reads "Unknown — cannot reach `<host>`". Neither may ever render as `restorable` or `running`, and a session whose liveness cannot be asserted offers no restore button.
3. **Moving work shows what travels and what stays, and requires a gesture.**
4. **Degradation is stated once per project, at creation** — not discovered later when a notification fails to arrive.
5. **Silent degradation of attention must be impossible.** If the far side cannot report attention, the project says so once and its sessions never present the same confident "needs input" affordance as a local session. This is the promise Tortie sells; weakening it undetectably is the worst available outcome.
6. **Nothing new gets a dashboard.** No connection meters, no latency graphs, no host health panel, no "3 remote sessions" counter. A healthy remote host shows nothing at all.
7. **Adding a host is one command.** `tortie host add <name>` copies a small inspectable payload — a compatible tmux or the pinned one, `gmux-tmux.conf`, the continuity-root skeleton — and nothing else. The user adds a machine and never learns the word socket.

---

## 5. Build versus maintain, argued against the Zen

The Zen is not decoration here; it decides the question line by line. Each principle is applied to the two candidate answers: **operate infrastructure** (a Tortie fleet, a relay, a credential broker, a sandbox integration in the core) versus **attach to the user's own machine over SSH**.

| Zen principle | Operate infrastructure | R1 — SSH attach |
| --- | --- | --- |
| *"Anything durability-critical should be boring, inspectable and older than this product."* | Fails all three words. A relay, a control plane and a signed cross-OS Host protocol are new code, written by this product, in the path of live work, across a WAN, with a version-compatibility matrix. A sandbox SDK fails "older" and "inspectable" too. | Passes without argument. SSH (1995), tmux (2007), git (2005), and the user's own filesystem. The only new code is a host record and a staleness rule. |
| *"The shell outlives the window."* | Contradicted, not merely limited. A 24-hour ceiling, a 15-minute auto-stop that fires even with processes running, or a sleep that discards RAM after 30 seconds are not constraints to route around — they deny the thesis. | Strengthened. The shell now outlives the *machine the window is on*. |
| *"Hide the machinery."* | Cannot be hidden, because the user is paying for it. A fleet needs an account, a billing page, quotas, a plan chooser and a support path — machinery that must be visible by law and by decency. | `tortie host add <name>`. Vocabulary stays projects and sessions. |
| *"Not a supervisor's console."* | A managed offering grows a fleet view inevitably: what is running, what it costs, what to reap. That is the console the Zen refuses. | A healthy remote host renders nothing. |
| *"Protect human attention."* | Adds a second failure surface whose degradation is undetectable from the near side — the least visible way to break the one promise the product makes. | Same risk, but bounded and declarable: stated once per project at creation, and never presented as equivalent to local. |
| *"Borrow the shape… assemble, never reimplement."* | Reimplements a multiplexer control plane, a credential broker and a provisioning system that others already run better. | Assembles OpenSSH, tmux, git and, where the user wants it, Tailscale. |
| *"Not clever where it could be dull."* | A CRDT-synced worktree, a memory-snapshot resume, a relay with a KV-backed hostname rewriter: all clever, all in the durability path. | Dull on purpose. |
| `CLAUDE.md` parity guardrail: *does this serve the agentic-coding workflow, or does it exist because others have it?* | "Remote because OpenAI acquired Ona and Anthropic ships cloud sessions" is the second kind, and the guardrail says do not build it. | "Remote because my laptop sleeps" is the first kind — and it is satisfied by a machine the user already owns. |

**What "maintain" actually costs, stated concretely rather than waved at.** The honest reference is on this machine: `specstory-sync` is nine workers, five queues with dead-letter queues, cron sweeps, Durable Objects, R2 and Supabase, plus a device-auth flow — and that is a *sync* product, not a hosting one. A Tortie fleet adds an image, an updater, a reaper (stoa needed an admin reconciler whose entire job is killing sandboxes with no database row, guarded by a 15-minute grace period so it does not race setup), concurrency caps (specstory-sync enforces global and per-owner limits before claiming a shard), quotas, abuse handling, egress billing, an availability obligation for other people's live coding sessions, and custody of their GitHub and model-provider credentials.

**And the prior art proves the operator's doubt was right, more strongly than expected.** Both projects used sandboxes strictly ephemerally, and both wrote down why: `SANDBOX_TIMEOUT_MS = 30 * 60 * 1000` commented *"the cost backstop"*, `MAX_SANDBOX_TIMEOUT_MS = 60 * 60 * 1000` with user-facing copy saying "~55 minute session timeout". Every mechanism in both codebases exists to make compute **die reliably and cheaply**; Tortie's requirement is the exact inverse and none of it inverts. Two details sharpen this. First, `stoa`'s `SandboxManager.pause()` does not pause — it calls `this.sandbox.kill()` and returns the id, and `resume()` is a `Sandbox.connect()` to a still-live box — so **there is no in-house suspend/resume experience to inherit**, even from the vendor with the best snapshot story. Second, the one place stoa made a sandbox durable is the mistake not to repeat: conversation-ordering SQLite as "the durable source of truth" inside a box with a 55-minute ceiling. That is `CLAUDE.md`'s rule in a different costume — never move durability-critical state into the disposable compute.

**What does carry over from the prior art** — and should be reused if R1 is ever built: reconnect by stored identity then re-verify (stoa's `getOrReconnect`, which matches Tortie's own address-by-`@gmux-id` rule); machine-readable health written by a watchdog and probed rather than scraped (`.stoa/service-monitor.json` every 5 s, `--json` everywhere, restart on a heartbeat older than 15 s); sanitising remote-origin bytes before they enter the local store and renderer (`agent-content-safety.ts`: binary detection, control-character stripping, size caps, recursive JSON depth and breadth limits); short-lived scoped credentials; device-code authorisation for a browserless box; and any relay being strictly optional with a working direct fallback (stoa's Worker returns both the raw and branded URLs so the CLI degrades cleanly).

**The conclusion.** Building the infrastructure loses on every line of the Zen and costs a company change. Buying it is blocked by a technical fact, not a preference. Attaching to the user's own machine wins on every line — and is also, incidentally, the cheapest thing to build.

---

## 6. The phased plan

Verification tiers are per `CLAUDE.md`, chosen per item rather than promoted wholesale. Every phase is one Workflow: spec → parallel builders with disjoint file ownership → integrator → independent verifiers → fix round → commit.

### 6.1. Now — worth doing regardless of whether remote ever ships

| Phase | Contents | Why together | Tier | What the user can then say |
| --- | --- | --- | --- | --- |
| **A** | G1a (ENOSPC notice) + G5 (restore honesty) + G4 (power-loss-safe generations) | All small, all contained, and all three make later evidence trustworthy. Nothing should be built on a status field that can lie or a snapshot that can be the only copy and also be torn. | 2, with Tier 3 fault cases for G4 | "When Tortie says a session came back with its conversation, that is what happened — and when it didn't, it says so." |
| **B** | G3 stage 1 (tray residency) + G1 (checkpoint scheduler) | The scheduler is pointless without a process to run it. Ship as one claim with a measured number attached. | 3 | "Recent output is kept up to N minutes, whether or not the window is open." |
| **C** | G2 (integrity gate, `FULL` on critical commits, verified ring, reconstruction) + G9 (transport loss ≠ process loss) + orphan-socket detection pulled forward out of G8 | G2 reuses `migrate/userdata.ts` and depends on G4's generation semantics. G9 and orphan-socket detection are the two small items that turn frightening states into recoverable ones. | 3 | "A corrupt manifest or a vanished socket is a recoverable event, not a lost day." |
| **R0.5** | **Measure what the actual complaint is.** Run alongside A–C. Establish what share of interrupted work is "my laptop slept" versus "I was not at my machine". | If it is the former, the fix is `caffeinate` while sessions are active plus honest labelling of what a closed lid does — one day, not one quarter. **Rule this out before funding the expensive thing.** | 1 | Possibly: "closing the lid no longer stops your agents", for a day's work. |
| **D** | G6 (resume provenance) + G7 (spatial state) | Both are schema work on a manifest that has just gained integrity checks and backups, which is the right order. | 3 / 2 | "Tortie will tell you when it is only *fairly* sure which conversation this is." |

### 6.2. Waits for demand

| Stage | Contents | The gate that must be passed first |
| --- | --- | --- |
| **E** | G8 (bundled pinned tmux, `-S` socket inside the continuity root, no-kill handoff) + G3 stage 2 (the A3/A4 Host, in-process first, then signed `SMAppService`) | Phases A–D landed. These are packaging-risk items, correctly late. |
| **R1** | Remote attach: host record, SSH attach path, remote continuity root owned by the remote Tortie, locus on the project tab, the move-work gesture | **Phases A–C landed** (never before), **and** R0.5 showing the demand is real and is not "my laptop slept". |
| **R2** | Headless Linux Host for a box with no desktop: the A3/A4 Host gets a Linux build; the desktop speaks the A4 protocol over an SSH-forwarded Unix socket | The local Host shipped, proven and stable. This is reuse of a component that will exist anyway — which is exactly why it is cheap later and expensive now. |
| **Never by default** | A Tortie-operated fleet | If users without a spare machine ask, the answer is **provisioning assistance, not tenancy**: a documented cloud-init or image for Hetzner, Fly or EC2 that the user pays for and owns. This mirrors 26's B10 posture on off-device backup. |

### 6.3. The non-negotiable fault matrix, if remote is ever built

These belong in 26's fault matrix and gate any remote work.

| Boundary | Injected failure | Required invariant |
| --- | --- | --- |
| Transport loss on a healthy host | Drop SSH mid-session | `reconnecting`, then `unknown`. Never `restorable`. No snapshot-on-exit path runs. No restore button appears. |
| Host unreachable at launch | Start with the host down | Remote projects open read-only from cache with visible staleness. No local shadow session offered. |
| Two clients, one remote session | Attach from two machines | Identity reconciliation holds; neither client asserts liveness the other contradicts; no duplicate manifest row. |
| Restore against an unreachable host | Press restore while the link is down | Refused with a reason. Never a partial local recreation. |
| Clock skew | Skew the remote clock | Capture timestamps and staleness ages stay interpretable, or are marked unknown. |
| Version mismatch | Old local app / new remote Tortie, and the reverse | Explicit compatibility response. Never a silent partial protocol. |
| Remote reboot | Reboot the remote box | The remote Tortie's own restore path owns it; the local app reports what the remote reports and claims nothing more. |
| Untrusted remote bytes | Emit control sequences and binary from a remote pane | Sanitised before entering the local store and renderer, per `agent-content-safety.ts`. |
| Checkpoint scheduling at scale | 30 remote sessions on one link | Cadence is host-aware and **link-bounded**, not per-session naive. |
| Move with a dirty tree | Move a project with uncommitted and untracked files | Exact list of what travels and what is left behind, plus a required gesture. Never a silent partial transfer. |

---

## 7. Risks, and what is not verified

### 7.1. Unverified or inherited claims

- **Modal memory-snapshot expiry.** A sibling agent reported that Modal memory snapshots expire after 7 days. The current `modal.com/docs/guide/memory-snapshot` page fetched today does not state an expiry — it says only that Modal recaptures snapshots to keep up with runtime and security changes. **Treat the 7-day figure as unconfirmed.** The 24-hour maximum function timeout was confirmed directly.
- **GitHub Codespaces per-hour pricing** was not re-fetched today; the idle-timeout range (5–240 minutes) and the "terminal activity, either input or output" rule were confirmed from GitHub Docs. Any weekly cost figure for Codespaces should be re-checked before it is quoted externally.
- **Depot's 8-hour session limit** and the async-only characterisation come from secondary sources, not Depot's own docs.
- **Coder pricing tiers** come from secondary review sites; only the architectural fact — `coderd` is software you install and operate, with no vendor-hosted control plane — should be treated as firm.
- **Hetzner CX22 pricing** spreads €3.79–€4.35 across sources depending on region and VAT, and Hetzner raised CPX prices on 1 April 2026. Use the range, not a point.
- **Latency figures in §4.1** are typical-path estimates, not measurements taken for this document. If R1 is scheduled, measure the real path before writing UI copy about it.
- **Process note.** A sibling agent's full provider survey was lost to a concurrent overwrite of this file. The tables in §3 were rebuilt today from live first-party verification (E2B pricing and persistence, Modal timeouts, Daytona lifecycle, Codespaces timeouts, Ona timeouts, Fly pricing, Fly Sprites, Runloop, Claude Code on the web) plus that agent's reported findings where re-fetching was not economical. Items in the second category are flagged above.

### 7.2. Risks in the recommendation

- **The duplicate-agent hazard is live now.** G9 is ranked sixth on expected loss, but it is the only item in the list whose failure mode *destroys work rather than information*: two agents editing one worktree. If the ranking is compressed, move G9 up, not down.
- **Doing remote before Phases A–C** ships every current defect twice, on a machine the user cannot easily inspect. This is the single sequencing error to guard against, and it will be tempting precisely because R1 looks like a one-line change to the attach path.
- **R1 does not deliver attention across the wire while the local app is closed.** That needs the Host (Gate 2 in 26), and it is the same work whether or not remote exists. Say so in the copy; do not let the feature imply it.
- **Cross-OS conformance.** The agent registry's store paths, the login-shell PATH capture and the absolute-argv discipline all differ on Linux. `CLAUDE.md`'s universality rule makes the resume conformance matrix gain a host axis and an OS axis, both Tier 3. That cost is real and belongs in R1's estimate, not in a footnote.
- **Two Torties must interoperate across upgrades.** Even without a bespoke protocol, an old local app attaching to a new remote Tortie is a compatibility surface. It is much smaller than a custom Host protocol, but it is not zero.
- **The competitive answer will be asked.** Users will compare against Claude Code cloud sessions and Codex-plus-Ona and ask why Tortie has no cloud. The honest reply is the strong one: Tortie is neutral across eleven agents where each vendor's cloud holds only its own, and Tortie's version runs on a machine the user owns, with their keys, their `.env` files and their untracked work already present. Neutrality is the one thing the vendors structurally cannot copy.
- **The one trigger that genuinely reopens the sandbox question:** the agent vendors converging on **account-side conversation storage keyed by an ID rather than a home directory and a `realpath(cwd)`**. That single change dissolves the constraint in §1.2 and makes the sandbox model technically viable. Watch for it deliberately; nothing else on the horizon changes this answer. Secondary triggers, in descending strength: a sandbox vendor shipping genuine multi-day process continuity with an availability guarantee (none does today); measured demand from users with no second machine, *after* R1 has shipped and been used; the local Host being shipped and stable, which turns R2 into a build-target change; and a neutral credential-brokering standard Tortie could adopt rather than operate.

### 7.3. Sources re-verified live for the synthesis, 12 August 2026

First-party, fetched today for §3:

- [E2B pricing](https://e2b.dev/pricing) — Hobby free with a 1-hour session ceiling; Pro $150/month with 24 hours; 2 vCPU at $0.000028/s ($0.1008/h); RAM $0.0000045/GiB/s ($0.0162/GiB/h)
- [E2B sandbox persistence](https://docs.e2b.dev/sandbox/persistence) — pause preserves filesystem, memory and running processes; kept indefinitely with no TTL; ~1 s resume, ~4 s per GB to pause; "the service won't be accessible from the outside and all the clients will be disconnected"
- [Modal timeouts](https://modal.com/docs/guide/timeouts) — 300 s default, configurable "between 1 second and 24 hours"
- [Modal memory snapshots](https://modal.com/docs/guide/memory-snapshot) — CPU snapshots GA, GPU snapshots alpha; **no expiry stated on the page**
- [Daytona sandboxes](https://www.daytona.io/docs/en/sandboxes/) — 15-minute default auto-stop that "triggers even if there are internal processes running"; auto-archive after a continuously stopped interval, default 7 days
- [GitHub Codespaces timeout](https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces) — "terminal activity, either input or output, also resets the idle timeout"; the value "must be between 5 minutes and 240 minutes"
- [Ona (ex-Gitpod) workspace lifecycle](https://ona.com/docs/classic/user/configure/workspaces/workspace-lifecycle) — 30 minutes without user input by default, increasable "up to a maximum of 24 hours"; organisation `lockdown_at` lifetime policy
- [Fly.io pricing](https://fly.io/docs/about/pricing/) — shared-cpu-2x with 512 MB at $0.0056/h ($4.04/month); RAM ~$5 per GB per 30 days; volumes $0.15/GB/month; snapshots $0.08/GB/month; egress $0.02/GB in North America and Europe
- [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) — "Cloud sessions stop after a period of inactivity and the session's VM is reclaimed… Reopen the session from claude.ai/code to provision a fresh VM with your conversation history restored"; bundle fallback under 100 MB, "untracked files are not included", bundled sessions cannot push back

Secondary, fetched today and labelled as such:

- Fly Sprites — [Simon Willison on sprites.dev](https://simonwillison.net/2026/Jan/9/sprites-dev/) (sleeps after 30 s; filesystem persists on NVMe synced to object storage; running processes do not survive), [devclass](https://devclass.com/2026/01/13/fly-io-introduces-sprites-lightweight-persistent-vms-to-isolate-agentic-ai/), and the Fly community thread [*"Sprite: stay awake with tmux"*](https://community.fly.io/t/sprite-stay-awake-with-tmux/26836) — a Sprite stays awake only while a process started via exec or console is writing stdout to its TTY
- [Runloop devbox lifecycle](https://docs.runloop.ai/docs/devboxes/lifecycle) — suspend/resume preserves disk, not in-memory process state; timeouts must be extended periodically for long-running work
- Depot agent sandboxes — [Depot's announcement](https://depot.dev/blog/now-available-remote-agent-sandboxes) and third-party comparisons; async-only, no real-time interactive shell
- Coder — self-hosted `coderd` with no vendor-hosted control plane; pricing from review sites, not first-party
- Hetzner CX22 — [VPS for Devs](https://vpsfor.dev/posts/hetzner-cx22-pricing-2026/) and pricing aggregators; €3.79–€4.35/month depending on region and VAT, after the 1 April 2026 CPX increase

---

## Appendices — the three dimension write-ups

> These are the independent dimension write-ups the synthesis above rests on, kept whole because they carry the evidence, the line references and the sources. Appendix A specifies the local gaps in detail. Appendices B and C were written independently of each other and reached the same verdict: remote attach to machines the user already owns, no Tortie-operated infrastructure. Where the synthesis and an appendix differ in emphasis, the synthesis is the decision.

## Appendix A — Dimension 1: closing the local durability gaps (full write-up)

| Assessment fact | Value |
| --- | --- |
| Date | 12 August 2026 |
| Codebase assessed | `db3cd02` (Phase 17 shipped) |
| Input | [Durability assessment 26](26-tortie-durability-architecture-and-recovery.md), written at `07969f7` and re-read in full |
| Method | Every claim about current behaviour re-verified against `db3cd02` rather than inherited. Line references below are HEAD, not 26's. |
| Verdict | 26's findings all still hold. Nothing in Phases 16–17 closed them. The rename work closed A1 and, usefully, built the exact primitive that closes B2. |

#### 1.1. Why this ranking differs from assessment 26's

Assessment 26 assigns P0/P1/P2 by "what is required before a public daily-driver durability claim". That is the right frame for a release gate and the wrong frame for a backlog, because it ranks a truthfulness defect and a total-loss defect equally.

This ranking uses expected loss:

> **rank ≈ (how much of the user's work disappears) × (how often the triggering situation occurs) ÷ (cost to close)**

Two places where that reordering disagrees with 26, both worth stating because they change what gets built next:

- **Manifest protection moves up**, from B1/B2 in the middle of a long backup inventory to number two overall. It is the only single file whose loss is total across every project — and, decisively, the primitive that fixes it is already written and already shipped. `src/main/migrate/userdata.ts` takes online `VACUUM INTO` copies and verifies them by per-table row count (`DbVerification`, `method: 'vacuum-into' | 'raw-copy'`), and that machinery was exercised for real on the Tortie rename. B2 is largely a scheduling problem over code that exists.
- **The headless Host moves down**, from "the central architectural problem" to number three, and splits in two. 26 is right that watchfulness ending with Electron is the structural flaw. But `SMAppService`, a signed helper, a versioned protocol and a reconnect sequence is a multi-phase programme, and roughly 80% of the loss it prevents is prevented by a ten-line change to `window-all-closed` plus the tray Tortie already ships. Do the cheap part now; keep the Host as the honest end state.

Tiers follow `CLAUDE.md`. Most items here touch durability, so most are Tier 3 — but Tier 3 means the specific fault is injected and measured, not that the whole app is swept.

#### 1.2. The ranked backlog

| # | Gap | What is at risk | How often | Cost | Tier |
| ---: | --- | --- | --- | --- | --- |
| **G1** | No timed checkpoints — transcripts only survive a clean quit | Every session's readable output since the last quit, across all projects | Every unclean shutdown, and every reboot after the app was closed while agents kept working | M | 3 |
| **G2** | The manifest has no integrity gate, no verified copy, no quarantine, no reconstruction | Everything: all projects, all sessions, all resume evidence, all snapshot bindings | Rare per user-day, total when it happens; ENOSPC and `synchronous=NORMAL` power loss are the realistic triggers | S–M | 3 |
| **G3** | Watchfulness ends at `window-all-closed` | Post-quit output, exit receipts, late-captured conversation IDs, failure notices | Every time the user does the thing the product promises is safe | S now, L for the full Host | 3 |
| **G4** | Recovery objects are not power-loss-safe and there is exactly one generation | The single snapshot per session, replaced destructively, with no `fsync` and no predecessor | Any power loss inside the rename window; any interrupted write | S | 2–3 |
| **G5** | Restore reports `running` after partial failure | Nothing is destroyed; the user's *belief* is destroyed | Whenever snapshot replay or resume arming throws | S | 2 |
| **G6** | Weak and grace-accepted resume evidence is stored as strong | The user resumes the wrong conversation, or an empty one, and may not notice | Two same-agent sessions in one directory; slow provider writes | M | 3 |
| **G7** | Spatial state lives in renderer `localStorage`, outside the durable model | The arrangement of work — projects, splits, focus, editor tabs | Low, but the reconstruction cost is exactly what the Zen promises to remove | M | 2 |
| **G8** | The tmux substrate is borrowed and reached by convention (`-L gmux` under `TMPDIR`) | Every live session becomes unreachable while still running | Low, but indistinguishable from total loss when it happens | M–L | 3 |

Tail, deliberately below the line: reversible remove and transactional restart (26's B6), the continuity journal (B8), the portable encrypted bundle (B9), off-device generations (B10), the Agent Attention Contract (M7/M8). All real. None is where the next unit of engineering should go.

#### 1.3. The gaps in detail

##### G1 — A crash or power loss destroys every transcript back to the last clean quit

**What is unprotected today.** `src/main/restore/snapshots.ts` documents its own capture points in its header, and they are exhaustive: app quit via `shutdownGmuxCore` → `GmuxCore.snapshotAllSessions`; `GmuxCore.killSession` immediately before `kill-session`; and the control-client `%exit` handler. There is no timer. `src/main/sessions/core.ts:1067` sets one `setInterval` and it is the status poller. The module's own comment is honest: *"A hard crash without a quit can still lose scrollback TEXT until v1's timed snapshots land — documented loss window."*

Two things make this worse than it first reads.

First, the third capture point is not a capture point. The `server-exit` handler at `src/main/sessions/core.ts:551` starts snapshotting *after* the control connection reports `%exit`, and its own comment concedes the shape: *"if the server still lives (clean detach) the captures succeed; if it is truly dead they fail harmlessly."* Harmlessly for the app; not for the user, because the T2 path is precisely the case where the server is truly dead. So there are two real capture points, both requiring an orderly shutdown initiated inside the app.

Second, the loss is unbounded in the direction that matters most. The promised workflow is: start agents, close the app, come back later. During that whole period no checkpoint is taken, because the process that would take one has exited. If the machine then reboots, the snapshot replayed is the one from when the user closed the window — possibly eight hours stale. Tortie will still show a confident restore affordance for it.

**The fix.** 26's M3, staged.

1. An adaptive checkpoint scheduler in `src/main/restore/` (a new `checkpoint.ts`), driven by `GmuxCore`, never by the renderer. Trigger on content change with a maximum interval; hash the captured text and skip unchanged writes; stagger sessions so 16 panes do not capture in one tick; reduce cadence on battery; force a capture before sleep (`powerMonitor` `suspend` — not currently used anywhere in `src/`), before quit and before destructive actions.
2. Move the server-exit capture earlier: capture on the last healthy control-mode heartbeat rather than on `%exit`. Keep `%exit` as best-effort, stop treating it as the design.
3. State a recovery-point objective and put it in the UI copy. "Recent output is kept up to the last N minutes" is a promise Tortie can keep. "Recent output is kept" is not.

Not fully closed without G3 — a scheduler inside Electron does nothing once Electron has exited. G1 and G3 should land in one phase.

**How it would be proven.** A new `smoke:checkpoint` in the existing `GMUX_SMOKE` family (`src/main/index.ts`, the `smoke:*` scripts in `package.json`): sessions on an isolated `-S` socket and isolated `userData`, emitting known output continuously; `SIGKILL` the main process at a random point; relaunch and measure the byte distance between the last checkpoint and the true tail. Pass condition is a *measured* maximum RPO under continuous output, plus bounded CPU, disk writes and wakeups at 10, 50 and 100 sessions. Add full-screen TUI, wide-Unicode and 50,000-line scrollback fixtures — rendered `capture-pane` is where those break. `smoke:t3` still covers the reboot shape and is not a substitute.

**Cost.** Medium. One module, one scheduler, one harness, one genuine measurement pass. The measurement is the expensive half and the half that makes the claim real.

##### G2 — The manifest is a single unprotected point of total loss

**What is unprotected today.** `src/main/db/sqlite.ts` is the one opener and sets exactly three pragmas: `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`. The module is excellent on *why* those decisions belong in one place. It is silent on damage, because nothing handles it.

- No `quick_check` at boot. `ManifestStore` (`src/main/manifest/store.ts:544`) opens and immediately migrates. A corrupt page surfaces as whatever the first query throws.
- No `db.backup()` or scheduled `VACUUM INTO` ring. There is no second copy of the manifest anywhere on disk.
- No quarantine. An open failure throws `FS_FAILED` with the underlying message. Nothing preserves the damaged file, and nothing guards against a future path that opens read-write and lets default initialisation write an empty schema over the user's apparent state.
- No reconstruction. Reconciliation adopts only IDs the database already knows. A live session carrying `@gmux-id` and `GMUX_SESSION_ID` is, by the correct and deliberate rule in `CLAUDE.md`, *not ours* if the manifest has never heard of it. That rule is right. Its consequence is that an empty manifest strands every live session at once: Tortie will not adopt them, will not kill them, will not name them, and the user is left with orphaned tmux sessions they were never taught exist.

`synchronous = NORMAL` is the right default for throughput and the wrong setting for the handful of commits where losing the last transaction means losing a session. Declaration-before-spawn — `this.manifest.insertSession(record)` at `src/main/sessions/core.ts:1444`, whose comment reads *"durability record exists BEFORE the process does"* — is the boundary the whole architecture rests on. Under `NORMAL`, a power loss can lose that committed row while the spawned process survives.

**The fix.** 26's B1, B2 and M10, in that order — and the second is far cheaper than 26 implies.

1. **Integrity gate at boot.** `quick_check` in `openGmuxDatabase` for the manifest only (not `symbols.db`, which is disposable and should stay fast). On failure: rename to `manifest.quarantine-<ts>.db`, preserve the WAL and SHM alongside, and enter recovery instead of opening.
2. **`synchronous = FULL` for critical commits only.** Declaration, provider-ID capture, destructive intent, restore transitions, migration commits. Everything else stays `NORMAL`. Measure each critical commit's latency before and after; the number belongs in the commit message.
3. **A verified generational recovery ring, reusing shipped code.** Generalise `src/main/migrate/userdata.ts`'s `VACUUM INTO` + `DbVerification` row-count machinery out of `migrate/` into `src/main/manifest/recovery.ts`, keeping a bounded ring: pre-migration, post-migration verified, last known healthy shutdown, plus a small hourly and daily set. A copy is a *candidate* until it has been opened, integrity-checked and row-count-verified. Only then is it restorable.
4. **Deterministic reconstruction.** When the manifest is quarantined, scan live `-L gmux` sessions for the `@gmux-id` / `GMUX_SESSION_ID` stamps, propose a reconstruction, and require an explicit human decision. Never adopt by name. Never reset to empty because the file will not open.

**How it would be proven.** Extend the worker-thread SQLite tests — `src/main/db/__tests__/sqlite.test.ts` already reproduces the `SQLITE_BUSY_SNAPSHOT` race deterministically, which is the right precedent — with fixtures for truncated pages, a removed WAL, a corrupt index and a foreign-key violation. Then a new `smoke:recovery`: build a populated manifest, take a ring generation, corrupt the live database, boot, and assert (a) the damaged file still exists at its quarantine path, (b) a generation was restored into a temporary root and reconciled *without touching* the live database, and (c) live foreign tmux sessions were left alone. The disk-full case belongs here — see §4.

**Cost.** Small to medium, and the best cost-to-value ratio in this list, because step 3 refactors shipped, exercised code rather than writing new code.

##### G3 — Watchfulness ends when the last window closes

**What is unprotected today.** `src/main/index.ts:1702`:

```
app.on('window-all-closed', () => {
  app.quit();
});
```

with the comment *"Single-window app: quitting on last-window-close is correct on macOS too — the durable tmux server (not the GUI) is what keeps sessions alive."*

Half right. tmux does keep the processes. But quitting also disposes the activity monitor, the hook receiver, the session-ID harvesters, the manifest reconciler and the snapshot service, and calls `disposeTray()` on the way out. Everything Tortie knows how to observe stops being observed.

Three concrete losses beyond G1's missing checkpoints:

- **Exit receipts.** `resources/gmux-tmux.conf` uses `remain-on-exit failed`. A process that exits zero while Tortie is absent leaves no durable trace. On next launch the manifest sees a declared session with no live identity and classifies it `restorable`. The user is offered a restore for work that finished successfully hours ago — and if they take it, they get a fresh shell with an armed resume command pointing at a completed conversation.
- **Late conversation IDs.** Several agents write their session record after a delay or after the first turn. If the ID lands while Tortie is closed, the harvester that would have caught it is not running, and the session silently degrades to directory-only recovery.
- **Failures.** A process dying non-zero while the app is closed is exactly the event that should rise above the surface. It rises nowhere.

**The fix, in two stages that must not be conflated.**

*Stage 1 — tray residency. Do this first; it is nearly free.* Tortie already ships a tray (`src/main/tray/`, with `attention.ts` and `disposeTray()`). Change `window-all-closed` to hide rather than quit, keep `GmuxCore` alive, and make Quit an explicit act via the tray and the app menu. This preserves every observer for the overwhelmingly common case — the user closes the window and goes to lunch — at the cost of one idling Electron process. It needs an honest idle measurement (CPU, wakeups, RSS) and it needs the tray to make "Tortie is still watching" legible without becoming a dashboard: a session count is a counter, and the Zen rejects counters. The right tray affordance is nothing at all when everything is healthy, and one line when something needs a human.

*Stage 2 — the Host.* 26's A3/A4, unchanged and still correct: extract the Electron-independent domain services behind injected path, clock and process interfaces; run the Host in-process while preserving the protocol boundary; move it to a signed `SMAppService` LoginItem once fault tests cover the boundary. A LaunchAgent, never a privileged LaunchDaemon. Reboot remains reconstruction, not process checkpointing.

Stage 1 is roughly 80% of the loss reduction for roughly 5% of the effort, and it is reversible. Stage 2 is the honest end state and should not be skipped, but it must not block Stage 1.

**How it would be proven.** Stage 1: a new `smoke:tray` that closes the window, drives an agent to completion and to a failure inside tmux, waits past a checkpoint interval, reopens, and asserts the exit receipts, the checkpoint and the harvested ID are all present — plus a measured idle-resource line over 30 minutes with 10 sessions, recorded in the commit. Stage 2: the full fault matrix in 26 §13, killing helper and client independently.

**Cost.** Stage 1 small; Stage 2 large, and correctly a later phase.

##### G4 — Recovery objects are not power-loss-safe, and there is one generation

**What is unprotected today.** `captureSessionSnapshot` in `src/main/restore/snapshots.ts`:

```
const tmp = join(dir, `.${sessionId}.tmp`);
await writeFile(tmp, text, 'utf8');
await rename(tmp, final);
```

The comment claims *"Atomic write (tmp + rename) so a crash mid-write never corrupts the last good snapshot."* Against an application crash that is true, and it is a good primitive. Against power loss it is not: no `fsync` on the file before the rename, no `fsync` on the directory after it, so the rename can reach the disk while the data has not. The result is a zero-length or torn snapshot that has *replaced* the last good one. There is no last good one, because each session overwrites a single fixed path. There is no hash, line count, byte count, capture reason, generation ID or `COMPLETE` marker, so a truncated snapshot is indistinguishable from a short session.

The temporary name is per-session, which is better than 26's "fixed temporary name" reading, but two writers for one session can still collide: `killSession` snapshots immediately before `kill-session`, and `snapshotAllSessions` can be in flight from a quit at the same moment. Writes are not serialised per session.

**The fix.** 26's B3 and B4, scoped to the small continuity corpus and no further:

1. Unique temporary object; `fsync` the file; verify size and SHA-256; rename; `fsync` the containing directory; write the generation's `COMPLETE` marker last.
2. Serialise writers per session with a small in-process lock keyed by session ID.
3. Keep a bounded ring per session instead of one file — the last few, deduplicated by content hash — so the newest generation is never the only one. Pruning is a separate transaction that can never remove the current and the last verified predecessor together.
4. Carry the metadata that makes a snapshot inspectable: session UUID, generation and parent, reason, timestamp, cwd, line and byte counts, SHA-256. This is the cheap half of 26's M4 capsule, and it is what makes G2's reconstruction possible later.

**How it would be proven.** A `smoke:t1`-tier unit pass for the write sequence, plus a Tier 3 fault case: `SIGKILL` mid-write and assert the previous verified generation is intact and selected; simulate ENOSPC and assert no successful state is reported and the predecessor survives.

**Cost.** Small. A contained rewrite of one 100-line module plus a retention policy.

##### G5 — Restore reports `running` after partial failure

**What is unprotected today.** Verified at `db3cd02`, unchanged from 26 §6.5. `src/main/restore/restore.ts` catches both partial failures and records them:

```
let replayed = false;
...
} catch (err) {
  console.warn(`[gmux] snapshot replay failed for "${rec.name}": ...`);
}
let armedCommand: string | null = null;
...
} catch (err) {
  console.warn(`[gmux] could not arm resume for "${rec.name}": ...`);
}
```

and `src/main/sessions/core.ts:836` throws both away:

```
const outcome = await restoreSessionInTmux(rec);
const { info } = outcome;
...
status: 'running',
```

`replayed` and `armedCommand` are computed, returned, and destructured out of existence. The session becomes `running`. Because a `resumeArgv` still exists on the record, the renderer's resume presentation model (`src/renderer/app/resume.ts`) continues to describe the session as one whose conversation recovers — when nothing was typed into the pane.

This destroys no data. It destroys the only thing a recovery product sells, which is the accuracy of its own status.

**The fix.** The minimum useful slice of 26's A6, not the whole state machine:

1. Persist the restore outcome. Add the three stage results (`shell_created`, `transcript_replayed`, `resume_armed`) to the session record and derive the visible status from them: `restored_armed`, `restored_transcript`, `restored_shell_only`, `restore_failed`. `running` stops being reachable from a partial result.
2. Make the renderer's resume copy read the stage results rather than the presence of `resumeArgv`.
3. Journal the restore attempt before acting, so a crash between stages resumes or rolls back rather than skipping to healthy.

Items 1 and 2 are a day's work and remove what 26 calls "the most serious truthfulness defect". Item 3 begins the typed state machine.

**How it would be proven.** Tier 2 for items 1 and 2, Tier 3 for item 3: unit fixtures forcing `typeIntoPane` to throw at each stage, asserting the resulting status and the exact UI string; then a fault case killing the app between each pair of transitions, asserting the next launch neither duplicates the session nor overstates the result.

**Cost.** Small. The highest value-per-hour item in this list.

##### G6 — Weak resume evidence is stored as strong

**What is unprotected today.** 26 §6.7, re-confirmed. `src/main/manifest/harvest/stores.ts` produces source path, confidence and whether a grace timer accepted the candidate. None of it is persisted. What is persisted is a four-value `ResumeCapture`, derived in `resumeCaptureFor` at `src/main/sessions/core.ts:198` purely from the agent's *capture mechanism* — `preassigned` and a successful `preassigned-cmd` both return `armed`, `store-harvest` returns `capturing` and flips to `armed` when its watcher lands. Nothing in that function can express how good the evidence was. An exact correlation and a grace-timer guess become the same stored value, and the type calls that value a validated ID.

The failure this permits is specific and not hypothetical. `src/main/agents/registry.ts` shows several agents key their store by the working directory: Claude at `~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl`, Factory the same shape, Qwen at `~/.qwen/projects/<charSubstitute(realpath(cwd))>/chats/`, Cursor at `~/.cursor/chats/<md5hex(cwd)>/`, Pi with a flat store and no per-cwd key at all. Two Claude sessions started in one directory inside the grace window are two candidates in one directory, distinguishable only by timing. If the wrong one is accepted, restore arms a command that resumes somebody else's conversation, with full confidence.

**The fix.** 26's M5 plus the narrow half of M1:

1. Persist the provenance chain with each capture: source record, correlation key, confidence (`exact` / `weak` / `grace_accepted`), capture timestamp, original cwd, provider store root, and the provider and adapter versions in force.
2. Make `armed` a family rather than a value, and let weakness survive into the UI copy. "Resume conversation" is reserved for exact correlation or a passed marker-turn test. Weak evidence gets a different verb.
3. Wire the existing `conformance:resume` result into the record. The harness already proves semantic recall through the real path; today its result is evidence about the product rather than evidence about the session.

**How it would be proven.** `conformance:resume:capture` (~16 s, no turns, no tokens) already gates the registry and is the right cheap gate. Add adversarial fixtures: two same-agent agents in one directory with interleaved store writes, a stale store record, a copied repository, hidden process enumeration, and a reused session ID. The invariant is that ambiguity produces weak or unknown evidence, never an exact claim. The full `conformance:resume` roundtrip runs once for the phase.

**Cost.** Medium — mostly schema, plumbing and copy discipline, with the fixtures being the real work.

##### G7 — Spatial state lives outside the durable model

**What is unprotected today.** `src/renderer/state/layout.ts` stores split geometry in `localStorage`; `src/renderer/state/store.ts` keeps active project and workbench choices there too. It survives an ordinary restart, which is why it has never hurt anyone. It is not versioned, not backed up, not integrity-checked, not repairable, and it lives inside the Chromium profile rather than the continuity root.

One near miss is worth recording, because it proves the point. The Tortie rename could have lost every user's whole arrangement. `src/main/migrate/userdata.ts` copies the userData tree and skips a `SKIP_ENTRIES` set — `Cache`, `Code Cache`, `GPUCache`, `blob_storage`, `Crashpad`, `logs` and similar. `Local Storage` is not in that set, so the layout was carried. That was the correct call, but it was a judgement about a Chromium directory name, not a durability decision about the user's workspace. The next such judgement may go the other way.

**The fix.** 26's A7. Persist project-tab order, active project and session, session order, split tree and ratios, focus, editor tabs, workbench mode and window geometry in a versioned, main-process-owned schema in the manifest. Keep transient drag and animation state in the renderer, where it belongs. Include hot-exit for dirty editor buffers if Tortie continues to offer editing.

**How it would be proven.** Tier 2 plus one targeted fault: crash and reopen with several projects, splits and dirty buffers; migrate the layout schema forwards and backwards from a recovery generation; restore on a smaller or missing display without placing a window off-screen.

**Cost.** Medium. Mostly a migration of state ownership, plus a schema that has to be right first time because it will be migrated forever.

##### G8 — The substrate is borrowed, and reached by convention

**What is unprotected today.** `src/main/tmux/supervisor.ts` finds whatever tmux the system provides and talks to it over `-L gmux`, which resolves under tmux's temporary-directory convention. Two exposures follow. macOS can remove the socket pathname while the server is still alive, at which point every session is running and none is reachable — a state that presents as total loss and is in fact fully recoverable. And the tmux binary's version, build options and behaviour are outside Tortie's control on a machine Tortie has never seen.

`CLAUDE.md` is emphatic, and correct, that `-L gmux` must not be renamed casually: doing so strands sessions running right now. That constraint is the whole difficulty here — this is not a rename, it is a live migration.

**The fix.** 26's A2, with the no-kill lifecycle as the requirement rather than the caveat. Bundle and pin a signed tmux with its configuration. Move new servers to `-S` with a full path inside the continuity root. A new app version must discover the legacy `-L gmux` server, attach without killing it, and defer the socket handoff until its sessions drain or the user explicitly performs a verified migration. A GUI update must never imply a tmux restart. Verify the binary's hash, version and configuration at runtime, and accept the obligation to ship security updates for it.

Add the orphan case explicitly: detect a socket pathname that has disappeared while the server lives, and offer a no-kill recovery rather than reporting the sessions gone.

**How it would be proven.** Tier 3: old-client/new-server and new-client/old-server compatibility; socket pathname deletion and permission repair; an upgrade with active shells, full-screen TUIs and agents mid-turn; runtime hash and version verification. `smoke:t3` runs on an isolated `-S` socket as part of this work, which also pays down 26's A10.

**Cost.** Medium to large, mostly packaging risk rather than code risk. The item most likely to be deferred for good reasons — provided orphan-socket detection is pulled out and landed early, because that is the part that turns a frightening state into a recoverable one.

#### 1.4. The five questions, answered directly

**tmux server death (T2).** Better handled than the code's structure suggests, and worse than it should be. The `%exit` handler fires and sessions are correctly reclassified, but the snapshot it triggers is attempted after the server is gone and captures nothing (G1). T2 recovery therefore always falls back to the last quit-time snapshot. With G1's scheduler and G4's generations, T2 becomes "recover to the last verified checkpoint", which Tortie can state in the UI. Today it is "recover to whenever you last closed the app", which Tortie does not say out loud.

**Machine crash versus clean quit.** Wholly different outcomes today, and the interface does not distinguish them. A clean quit takes a full snapshot pass of every live session and is close to lossless for readable output. A crash takes nothing. The manifest is in better shape than the snapshots in both cases — intent is written before spawn, WAL keeps the database consistent — but `synchronous = NORMAL` means a power loss can still discard the last committed transaction, which at the worst moment is the declaration row for a session that did spawn. G1, G2 step 2 and G4 close the gap. Until they do, the honest statement is that Tortie protects orderly shutdowns well and disorderly ones barely.

**Snapshot cadence, and what a crash-without-quit loses.** Cadence is event-driven and every event is a shutdown event: quit, explicit close, observed server exit. No interval, no change detection, no pre-sleep hook. A crash without a quit loses *all terminal output produced since the last of those events*, for every session. In the promised workflow — close the window, let agents run, come back tomorrow — the last event is the window close, so the loss is the entire unattended period. If a session was created and the app has not quit since, there is no snapshot at all, and restore yields a shell plus an armed command with no transcript. This is G1, and it is number one for exactly this reason.

**Manifest corruption and backup.** There is no backup and no corruption handling. `openGmuxDatabase` sets pragmas and returns; `ManifestStore` migrates and proceeds. A damaged file produces an opaque `FS_FAILED`. No second copy on disk, no integrity check at any point in the lifecycle, no quarantine of the damaged file, and no way to rebuild from live tmux sessions still carrying their `@gmux-id` stamps. The mitigating fact is what makes this cheap: the verified-copy machinery already exists in `src/main/migrate/userdata.ts` and has been run against real user data. This is G2.

**Disk-full behaviour.** Untested, and in one place silent. Three paths matter:

- *Declaration.* A full disk makes the insert at `src/main/sessions/core.ts:1444` fail with `SQLITE_FULL`. Creation fails and the process is not spawned. Correct outcome, correct by accident rather than by test.
- *Checkpoint.* `writeFile` throws ENOSPC; `snapshotAllSessions` catches it and emits `console.warn`. The user is told nothing. Someone whose disk filled overnight will quit the app believing their transcripts were saved. This is the worst disk-full behaviour in the product and the smallest fix: surface a degraded-protection notice, exactly once, through the channel that later becomes the Recovery Centre.
- *Recovery ring and pruning.* Does not exist yet, so it cannot fail yet. When G2 and G4 land, build in from the start that pruning is a separate transaction which never removes the current generation and its last verified predecessor together, and that a failed write never advances the "current" pointer.

Disk-full deserves its own row in the fault matrix, with 26's invariant: *no successful state is reported, and previous generations remain intact.*

#### 1.5. What must not be re-litigated

Five things in this codebase are right and should be defended against well-meaning cleanup:

1. **tmux owns the processes and the app is a client.** Every remote proposal in Dimensions 2 and 3 preserves this.
2. **Intent is written before spawn** (`src/main/sessions/core.ts:1444`). The transactional boundary everything else assumes.
3. **Identity, never names.** `@gmux-id` plus the `GMUX_SESSION_ID` pane stamp, and the refusal to adopt anything carrying neither. G2's reconstruction must not weaken this to make reconstruction easier — the correct response to ambiguity is a human decision, not a name match.
4. **Resume is armed, not executed** (`src/main/restore/command.ts`). 26's Challenge 6 settled this. It stays settled.
5. **One opener, one pragma set, one migration runner** (`src/main/db/sqlite.ts`). It exists because the copies had already drifted once. Every change in G2 goes through it.

#### 1.6. Suggested sequence

| Phase | Contents | Why together |
| --- | --- | --- |
| **A** | G5 (restore honesty) + G4 (power-loss-safe generations) | Both small, both contained, both make later evidence trustworthy. Nothing should be built on a status field that can lie. |
| **B** | G3 stage 1 (tray residency) + G1 (checkpoint scheduler) | The scheduler is pointless without a process to run it. Ship as one claim: "recent output is kept up to N minutes, whether or not the window is open." |
| **C** | G2 (integrity gate, `FULL` on critical commits, verified ring, reconstruction) | Reuses `migrate/userdata.ts`. Depends on G4's generation semantics. |
| **D** | G6 (provenance) + G7 (spatial state) | Both are schema work on a manifest that has just gained backups, which is the right order. |
| **E** | G8 (bundled tmux, `-S` socket, no-kill handoff) and G3 stage 2 (the Host) | The two large, packaging-heavy items. Pull orphan-socket detection out of G8 and land it early, with Phase C. |

---

## Appendix B — Dimension 2: substrate choice and the build-versus-buy call (full write-up)

| Assessment fact | Value |
| --- | --- |
| Question | Should Tortie offer durable REMOTE sessions, and if so on what infrastructure — and specifically, is that infrastructure something Tortie should build and maintain? |
| Verdict | **Yes to remote attach. No to owned infrastructure, in any form — no hosted service, no sandbox integration in the core, no rented compute resold to users.** And not before Dimension 1 phases A–C have landed. |
| Relationship to Dimension 3 | Dimension 3 works the architecture and reaches a compatible conclusion. This section covers the substrate choice and the build-versus-buy call, and contributes the one piece of evidence that settles it. Substrate tables and the prior-art transfer matrix are in §9 and §10 below and are not repeated here. |

#### 2.1. The three products hiding inside one question

"Durable remote sessions" collapses three different products. Separating them is most of the analysis.

| Shape | What the user gets | Who owns the compute |
| --- | --- | --- |
| **Remote attach** | Tortie drives sessions on a machine the user already has — VPS, home Mac, work desktop, team dev host | The user |
| **Managed remote** | Tortie provisions a box per user, project or session, and bills for it | Tortie |
| **Sandbox-per-session** | Each session is an ephemeral microVM from a sandbox platform | The platform, rented by Tortie |

The operator's stated doubt — that a model designed for ephemeral runs may not suit sessions that must live for days — is well founded, and the evidence supports it more strongly than expected.

#### 2.2. The finding that settles it

The decisive constraint is not economic and not philosophical, though both agree. It is a property of the agents Tortie supports, and it is provable from this repository.

`src/main/agents/registry.ts` records, for every supported agent, where its resumable conversation lives:

| Agent | Session store |
| --- | --- |
| Claude | `~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl` |
| Codex | `${CODEX_HOME:-~/.codex}/sessions/<YYYY>/<MM>/<DD>/rollout-<ts>-<uuid>.jsonl` |
| Cursor Agent | `~/.cursor/chats/<md5hex(cwd)>/<sessionId>/store.db` |
| Gemini | `~/.gemini/tmp/<projectDir>/chats/session-<ts>-<first8>.jsonl` |
| Qwen | `~/.qwen/projects/<charSubstitute(realpath(cwd))>/chats/<sessionId>.jsonl` |
| Factory (droid) | `~/.factory/sessions/<dashEncode(realpath(cwd))>/<sessionId>.jsonl` |
| Pi | `~/.pi/agent/sessions/--<cwd sans leading /, [/\:]→->--/<ts>_<sessionId>.jsonl` |
| Antigravity | `~/.gemini/antigravity-cli/brain/<conversationId>/…` |
| Muse | `${XDG_DATA_HOME:-~/.local/share}/muse/sessions/<YYYY>/<MM>/<DD>/<id>/session.jsonl` |
| DeepSeek | `~/.deepseek/sessions/<sessionId>.json` |

Two properties hold across the whole table:

1. **The conversation is a file in a home directory.** Not a service, not an account-side record. It exists on the filesystem of the machine where the agent ran. Destroy that filesystem and the conversation is destroyed, whatever the manifest still says.
2. **For five of them the store directory is derived from `realpath(cwd)`.** Claude, Factory, Qwen, Pi and Cursor all encode the absolute working-directory path into the store location. A session restored at a different absolute path is a *different conversation* as far as the provider is concerned. 26 §6.6 records that Tortie already fails closed on this for Qwen and Pi, after a real defect where falling back to the project root produced a convincing but empty conversation.

Apply those to the three shapes:

- **Sandbox-per-session.** The home directory is destroyed on expiry, and the clone path is chosen by the provisioner rather than the user. Both properties are violated. Exact conversation resume — the thing an entire phase was spent making executable, and the thing that distinguishes Tortie from every product in the market inventory — cannot survive. What survives is a shell and a transcript, which is precisely the degraded mode Tortie is careful never to call resume.
- **Sandbox with a persistent volume mounted at a stable path.** Both properties can be satisfied, but only by pinning the mount path forever and treating the volume as the real product. At which point the sandbox platform is being used as an expensive, ceiling-limited VM, and the honest version of that design is a VM.
- **Remote attach to a durable box.** Both hold trivially and permanently, because it is a normal computer with a normal home directory. `~/.claude/projects/…` is exactly where it would be locally.

There is a second-order point that strengthens this. `conformance:resume` proves semantic recall by planting a nonce, destroying the tmux session, restoring the recorded command and requiring the resumed agent to join the old nonce to a new one. That harness is only meaningful if the provider store persists across the destruction. On a remote-attach host it runs unchanged. On a sandbox it would have to be rewritten to test something weaker — and a harness rewritten to test something weaker is how a product starts lying to itself.

#### 2.3. The economics, stated once

The substrate survey in Dimension 3 §9 has the full table. One comparison is worth isolating, because it is the number that makes "should we rent compute" answer itself.

E2B Pro at 2 vCPU and 4 GiB, running continuously: roughly $0.101/hour CPU plus $0.065/hour RAM is about $0.166/hour, or about **$121 per month for one sandbox**, on top of the **$150/month** platform fee that a session longer than one hour requires. A Hetzner CX22 with the same 2 vCPU and 4 GB is about **$4.59/month** and hosts as many tmux sessions as it has memory for.

Sandbox pricing is designed around boxes that exist for minutes. A box that exists for a month is priced accordingly, at roughly 25–60× the boring alternative — and it still carries a 24-hour ceiling that the boring alternative does not have, because a VPS has no session concept to impose one on. A limit that does not exist cannot be quietly changed by a vendor.

#### 2.4. What the prior art on this machine proves

Both `/Users/gdc/stoa` and `/Users/gdc/specstory-sync` used E2B, and both used it strictly ephemerally. Dimension 3 §10 has the transfer matrix. Two readings belong here because they bear directly on build-versus-buy.

**The TTLs were cost backstops, and they are written down as such.** `specstory-sync`'s `workers/lore-cloud-worker/src/sandbox.ts` opens with `/** 30-minute hard sandbox TTL — the cost backstop (arch line 309). */`. `launchSandbox` kills the box on any failure after create so that *"a failed launch never leaks a live (billed) sandbox"*; `killSandbox` is idempotent and never throws because *"a flaky kill must not abort the completion/watchdog path"*; the coordinator enforces global and per-owner concurrency caps before claiming a shard. `stoa` adds an admin reconciler whose entire job is finding live sandboxes with no database row and killing them, guarded by a fifteen-minute grace period so it does not race setup. Every one of those mechanisms exists to make compute die reliably and cheaply. Tortie's requirement is the exact inverse, and none of that machinery inverts.

**The one place a sandbox was made durable is the mistake not to repeat.** `stoa` made sandbox SQLite *"the durable source of truth for conversation ordering and SDK replay"* — inside a box with a 55-minute ceiling. That is `CLAUDE.md`'s rule violated in a different costume: "never move durability-critical state into the app" generalises to "never move durability-critical state into the disposable compute". A remote Tortie must keep its manifest, its snapshots and its provider stores on the durable machine, next to the tmux server that owns the processes.

#### 2.5. The recommendation

**Offer remote attach. Do not build, rent, or resell compute.**

Tortie should be able to open a project that lives on another machine and treat sessions there exactly as it treats local ones: same named sessions, same status semantics, same restore verbs, same manifest discipline, same refusal to adopt anything not carrying a Tortie identity. The machine is supplied by the user. Tortie supplies the client, the identity model, the evidence and the honesty.

Five things Tortie builds:

1. **A host record** in the manifest — hostname or tailnet name, user, optional jump host, and the resolved paths to tmux and the continuity root on that machine. Addressed by identity, never by display name, exactly as sessions are.
2. **A transport that is boring and older than this product.** OpenSSH, using the user's existing agent and config, with `ControlMaster` multiplexing so one authenticated connection serves many operations. No custom protocol, no daemon Tortie has to sign, no inbound ports. Where the user has Tailscale, hostnames resolve inside their tailnet and nothing is exposed to the internet. For flaky links, Eternal Terminal is the right *optional* upgrade rather than a requirement — it is TCP-based and, unlike mosh, supports tmux control mode, which is what the attach host speaks.
3. **A remote continuity root, with the same rules.** `manifest.db`, snapshots and capsules live on the *remote* machine, beside the tmux server that owns the processes and beside the provider stores that own the conversations. Everything in Dimension 1 applies there unchanged. The local Tortie holds a cache and a host list, never the authority. This is the single most important rule in the whole remote proposal, and it is the rule `stoa` broke.
4. **A typed unreachable state.** `stoa`'s `SandboxUnavailableError` is the pattern. "Cannot reach this host" must be its own state that triggers reconnection and shows the last known evidence with its age — never an empty list, never `restorable`, never anything that invites a destructive repair. Ambiguity becomes `degraded` or `unknown`, never an optimistic healthy state.
5. **A one-command bootstrap.** `tortie host add <name>` copies a small, inspectable payload: the pinned tmux binary or a check for a compatible one, `gmux-tmux.conf`, and the continuity root skeleton. Nothing else. This preserves "hide the machinery" — the user adds a host and never learns the word socket.

Six things Tortie never builds:

- A Tortie account, a Tortie control plane, or Tortie-hosted compute.
- A sandbox integration of any kind, in the core product.
- Any path that copies a live session between machines, or claims a resumed conversation on a machine whose provider store never held it.
- Any inbound listener on a user's machine.
- A credential broker. Agents authenticate on the box they run on; Tortie verifies presence in preflight and never stores, forwards or reads a token.
- A fleet view. A remote host that is healthy shows nothing.

**Why this is the Zen-consistent answer and not merely the cheap one.** "Anything durability-critical should be boring, inspectable and older than this product" selects SSH and tmux over a sandbox SDK without further argument. "Hide the machinery" survives because adding a host is one command and the vocabulary stays projects and sessions. "Not a supervisor's console" rules out the fleet view a managed offering would inevitably grow. And "the shell outlives the window" becomes literally stronger: the shell now outlives the *machine* the window is on.

#### 2.6. Sequencing, and what would change the answer

**Sequencing.** 26 put "remote Host attachment over SSH or a private mesh" first on its defer list, and Gate 4 says to expand only from observed need. That judgement remains correct in one specific respect: **remote attach must not ship before Dimension 1 phases A through C.** Building a remote continuity root before the local one has an integrity gate, verified copies and honest restore statuses means shipping the same defects twice, on a machine the user cannot easily inspect.

**Triggers for revisiting, stated in advance so a future decision is a judgement rather than a drift:**

1. **A cohort with no durable machine of their own.** If people want Tortie but have only a laptop, the answer is still not Tortie-hosted compute — it is a documented one-command setup on Hetzner, Fly or a Mac mini, and possibly a partnership. Reconsider only if that documented path is tried and observably fails.
2. **Provider stores move server-side.** If the agent vendors converge on account-side conversation storage keyed by an ID rather than a home directory and a realpath, §8's constraint dissolves and the sandbox model becomes technically viable. This is the one change that genuinely reopens the question, and it is worth watching for.
3. **Team use with shared hosts.** Several Tortie clients pointed at one dev box is remote attach with an authority problem, not a hosting problem. It raises the priority of the Host and the sole-mutation protocol; it does not change who owns the compute.
4. **A sandbox platform ships a genuinely durable, path-stable, indefinitely-lived box at VM prices.** E2B's indefinite paused retention is the closest today, and it still carries a 24-hour running ceiling and a documented disconnect on pause. If a platform removes both, revisit — as an alternative *transport target* for remote attach, never as a replacement for the user owning the machine.

---

## Appendix C — Dimension 3: the remote architecture (full write-up)

| Assessment fact | Value |
| --- | --- |
| Date | 12 August 2026 |
| Scope | Dimension 3 only: where a remote tmux server would live, how the app would attach, the repo problem, the manifest problem, agent auth, the UI, and whether Tortie should build and operate this. |
| Inputs | [Durability assessment 26](26-tortie-durability-architecture-and-recovery.md), [The Zen of Tortie](../ZEN-OF-TORTIE.md), [FINAL-REPORT §2](../FINAL-REPORT.md), committed Tortie source (read-only), prior art at `/Users/gdc/stoa` and `/Users/gdc/specstory-sync` (read-only), and live provider verification on 12 August 2026. |
| Verdict | **Not yet, and not on infrastructure we own.** Ship durable remote sessions on machines the user already owns, over plain SSH, with no vendor in the path. Revisit a Tortie-operated substrate only against the trigger conditions in §12.5. |
| Note | Written as a standalone dimension. Its internal section numbers (§1–§13 below) are local to this appendix; the trigger conditions it refers to as "§12.5" are at §11.5 of this appendix. |

---

### 1. The verdict in one page

Three findings decide this, and each is checkable.

**Finding 1 — the durable remote substrate the product would need does not exist as a product.** Every AI sandbox vendor verified on 12 August 2026 caps continuous runtime at 24 hours or less: E2B 1 hour on Hobby and 24 hours on Pro, Modal 24 hours, Vercel Sandbox 45 minutes on Hobby and 24 hours on Pro. Their persistence stories are snapshot-and-recreate, not "your process is still running". For a product whose first principle is that the live process outlives the window, a 24-hour ceiling is not a limitation to work around, it is a contradiction of the thesis. The only remote substrates on which a process can genuinely run for days are ordinary long-lived virtual machines and the user's own hardware.

**Finding 2 — Tortie's differentiators do not cross the wire.** Attention detection, resume capture, SpecStory capture and image drop are all machine-local by construction. The hook receiver is an HTTP server bound to `127.0.0.1`. The process oracle is one `ps -axo` snapshot of this machine. The resume harvesters watch `~/.claude/projects/**` and `~/.codex/sessions/**` under this machine's `homedir()`. Remote sessions reached by SSH alone give a terminal mirror, which is what cmux shipped as a beta feature — not Tortie's product. Remote sessions that keep the product intact require a second Tortie running on the far side, which is a distributed system with a compatibility matrix.

**Finding 3 — the repo problem and the manifest problem converge on the same expensive answer.** Every workable answer to "where does the code live" ends at "next to the process", and every workable answer to "who owns the truth about a session" ends at "the machine the process runs on". Both point at a remote Tortie Host. That is [assessment 26's A3](26-tortie-durability-architecture-and-recovery.md), which is not built yet even for the single-machine case, where it is far easier and where the product currently scores 63 out of 100 on the promise it has already made.

The cheap thing that captures most of the value is therefore not a new architecture. It is **Tortie on the other machine, attached over SSH**: the remote box runs an ordinary Tortie, owning its own tmux server, its own manifest, its own harvesters and its own hook receiver, and the local app attaches to that machine's panes as a client. There is no vendor, no relay, no credential broker, no fleet, and nothing durability-critical that Tortie has to invent.

---

### 2. Method and evidence standard

Four kinds of evidence, following the grading in assessment 26 §2.

| Grade | Meaning |
| --- | --- |
| Source | Read directly from committed Tortie source on 12 August 2026 |
| Prior art | Read directly from `/Users/gdc/stoa` or `/Users/gdc/specstory-sync` working trees |
| Vendor | Verified against first-party product documentation on 12 August 2026 |
| Secondary | Verified against reporting or third-party analysis, and labelled as such |

Provider claims were re-verified live rather than recalled. Where a number is quoted, the tier or plan it applies to is quoted with it, because the differences between tiers are the whole story for this decision.

---

### 3. What "remote" would actually have to move

Tortie is five planes stacked on one machine. The question "should sessions be remote" is really "which of these five planes moves, and what happens to the ones that do not".

| Plane | What owns it today | Source |
| --- | --- | --- |
| 1. PTY ownership | Private tmux server on socket `-L gmux` | `src/main/tmux/supervisor.ts` |
| 2. Attach and render | One `node-pty` per visible pane running `tmux attach-session -t =<name>`, plus one `tmux -C` control client as event bus | `src/main/attach/attach-host.ts`, `src/main/tmux/control-client.ts` |
| 3. Observation | Hook receiver, process oracle, screen oracle, pane oracle, resume harvesters | `src/main/activity/*`, `src/main/manifest/harvest/*` |
| 4. Durable record | SQLite manifest, text snapshots, resume recipes with absolute binary paths | `src/main/manifest/store.ts`, `src/main/restore/*` |
| 5. Workbench | git CLI, file watcher, tree, Monaco, ripgrep search, image drop, SpecStory capture | `src/main/git/*`, `src/main/specstory/*`, renderer |

Plane 2 is the only one that is cheap to move. It is roughly a one-line change in intent: instead of spawning `tmux attach-session`, spawn `ssh <host> tmux -L gmux attach-session`. That superficial cheapness is exactly what makes remote sessions look like a small feature.

Planes 3 and 5 are the ones that break silently, and they are the product.

#### 3.1 What breaks, precisely

**The hook receiver cannot be reached.** `src/main/activity/hooks.ts` creates a Node HTTP server and binds it with `server.listen(port, '127.0.0.1')`, with a 128-bit per-session token in the request path and a `Host` header check. Agent hook configuration points at `http://127.0.0.1:<port>`. An agent running on another machine cannot reach that address. The highest-fidelity attention source — the one that produces the `Notification` and `Stop` events behind "needs input" — is unavailable for every remote session unless something on the remote side receives hooks locally and forwards them.

**The process oracle observes the wrong machine.** `src/main/activity/process.ts` takes one `ps -axo pid=,ppid=,time=,stat=` snapshot, measured at 20.3 ms for about 1,000 processes, and derives two facts: the delta of CPU time over the session's subtree, and the presence of a `setsid`-ed tool child. Neither fact exists for a remote process. Running `ps` over SSH per tick, per host, replaces a 20 ms local syscall with a network round trip and a remote fork, and it is the single signal that survives a blocked tool call such as `sleep 25`.

**The resume harvesters watch the wrong filesystem.** `src/main/manifest/harvest/watch.ts` and `stores.ts` are rooted at `homedir()`, with `CODEX_HOME` as the only override. Conversation identity — the thing that turns "a shell came back" into "the agent still knows what it was doing" — is captured by watching provider stores under the local home directory. Without a remote watcher, remote sessions get directory-only recovery at best, which is the weakest of the four states the resume presentation model already distinguishes.

**The screen oracle becomes a network cost.** `capture-pane` works fine over SSH, but it becomes one round trip per poll per session. Assessment 26's M3 adaptive checkpoint scheduler is specified with bounded CPU and disk at 10, 50 and 100 sessions. Over a WAN it needs a fourth bound — link utilisation — or 30 remote sessions will saturate the connection with polling.

**SpecStory capture and image drop are local by construction.** `src/main/specstory/resolve.ts` resolves a bundled binary against `app.getAppPath()` and `homedir()`; the wrap path prepends that absolute path to the agent's argv. Image drop writes a local temporary file and types its path into the pane. Both silently mean nothing on a remote pane.

**The manifest records this machine's paths.** `src/main/tmux/resolve.ts` captures the login-shell PATH once and resolves argv to absolute binary paths so restores survive PATH drift. Those absolute paths are correct for exactly one machine. A manifest row that says `/opt/homebrew/bin/claude` is a lie about a Linux host, and a restore that acts on it fails in a way that looks like a Tortie bug.

This is the structural finding. **Remote sessions are not an attach-path change. They are a second instance of the observation and durability layers, on a different operating system, kept version-compatible with the first.**

---

### 4. Where the tmux server lives, and how the app attaches

#### 4.1 tmux has no network, and that is deliberate

The tmux server listens on a Unix domain socket. There is no TCP listener and no authentication layer, because the security model is filesystem permissions. Any remote design therefore needs a transport that is not tmux, and the standard one is SSH. This is not a limitation to route around; it is why the "boring and older than this product" test is passable at all. SSH is the oldest, most inspectable, most widely deployed piece of the whole design.

#### 4.2 Option R1 — SSH plus tmux control mode

The shipped precedent is cmux's remote tmux, documented as beta and opt-in behind a settings toggle. It spawns `ssh … tmux -CC attach` and parses the control-mode stream itself over SSH `ControlMaster` connections, mapping tmux sessions to workspaces, windows to tabs and panes to splits, bidirectionally. iTerm2 has done the same thing for over a decade: run `tmux -CC` on a remote host and get native windows that persist server-side; if the connection drops or the app quits, reconnect and `tmux -CC attach` restores the session state.

For Tortie this is a small change to plane 2 and nothing else. It is also where cmux stopped: its documentation covers mirroring existing tmux sessions and explicitly does not address how repositories reach remote machines, and its mirrors are not restored on relaunch.

**Latency, honestly.** Control mode requires a reliable stream channel. There is no local echo prediction: every keystroke costs one network round trip.

| Path | Typical round trip | What it feels like |
| --- | --- | --- |
| Same LAN or same city | 1–15 ms | Indistinguishable from local |
| Cross-country, same continent | 40–80 ms | Noticeable when editing in a TUI, acceptable in an agent prompt |
| Transatlantic | 90–140 ms | Perceptibly laggy typing; bulk output still fine |
| Hotel, mobile, congested wifi | 150–400 ms with jitter | Unpleasant for typing, occasionally unusable |

Two mitigations exist and only one of them is compatible. Mosh gives local predictive echo and survives address changes, but **mosh does not support tmux control mode**. Eternal Terminal does support control mode and reconnects automatically, but there is a documented pathological case where reattach with iTerm2's tmux mode takes 30 to 60 seconds after a laptop wake, against one to two seconds for mosh with plain tmux.

The saving grace is the workload. Agentic coding is mostly paste-a-paragraph then read-a-lot-of-output. Bulk output pipelines well and the existing watermark flow control (pause above 256 KB unacked, resume below 64 KB, 8 ms batching) already handles a firehose. It is single-keystroke TUI editing that hurts, and Tortie's editor is Monaco over files, not vim in a pane. **Remote agent panes are usable at continental distance. Remote TUI editing is where the user feels the wire.**

**Reconnection, honestly.** A dropped TCP connection freezes the mirror. cmux reconnects with capped exponential backoff. `ControlMaster`, `ServerAliveInterval` and `ExitOnForwardFailure` are the standard hygiene. Control mode was built for resynchronisation, and tmux 3.2 added the client-detached notification that makes it tractable.

#### 4.3 The latent bug this exposes today

There is a correctness problem waiting in the current code, and it should be fixed regardless of whether remote sessions are ever built.

The server-exit handler begins snapshotting when the tmux control connection reports exit, in `src/main/sessions/core.ts` around line 520. Locally, control-client exit is a good proxy for server death, because there is nothing between the client and the server but a Unix socket. Over a WAN, that proxy is wrong: the control client will exit every time the network flaps, and the remote server will be perfectly healthy. Assessment 26 §6.3 and §6.4 already flag the adjacent hazards — snapshotting after the useful moment, and misclassifying a clean exit as restorable.

The consequence over a network is worse than a bad snapshot. A remote session that is alive and working can be presented as `restorable`, and a "Restore all" then starts a **second agent on the same branch in the same working directory**. Two agents editing one worktree is a data-loss shape, not a cosmetic bug.

The fix belongs to A6 and A5: `unknown` must be a first-class state distinct from `restorable`, transport loss must never be treated as process loss, and liveness for a remote session must be answerable only by the machine that owns the process. Doing that work improves the local product on its own terms and is a precondition for anything remote.

#### 4.4 Option R2 — a relay or broker

The prior art is directly on this machine. stoa's Cloudflare Worker fronts E2B sandbox URLs by reading `tunnel:<id>` from KV and proxying, forwarding upgrade headers so WebSockets complete. Its own header comment is candid about why it exists: the raw sandbox URLs "look disposable when the share goes into Slack". KV entries expire after one hour via `expiration_ttl` "matching the e2b sandbox lifetime", and `stoa-web` returns both the raw and branded URLs so the CLI falls back when the Worker is unavailable.

That is a good design for what it is: a hostname rewriter with an explicit bypass. It is not a durable control plane, and stoa did not use it as one.

For Tortie, a relay means a Tortie-operated service sits in the path of the user's live coding session. The availability of that service becomes the availability of the user's work. Measured against "anything durability-critical should be boring, inspectable and older than this product", a bespoke relay is the opposite on all three counts. If reachability across NAT is the actual need, the boring answer already exists and the user owns it: a WireGuard mesh such as Tailscale, whose Personal plan as of the 8 April 2026 pricing change covers up to 6 users with unlimited user-owned devices at no cost. Tortie should document it and implement none of it.

One carry-over from stoa is worth keeping if any relay is ever built: **it must be strictly optional, with a working direct path when it is down.**

#### 4.5 Option R3 — a remote Tortie Host

This is the only design in which the product survives the wire. A headless Tortie Host on the remote machine owns the remote tmux server, the remote manifest, the remote harvesters, the remote hook receiver and the remote checkpoint scheduler. The desktop speaks assessment 26's A4 versioned JSON-RPC protocol to it over an SSH-forwarded Unix socket.

The architecture is right. The sequencing is wrong. A3 and A4 are P1 items that do not exist yet in the single-machine case, where the Host runs on the same OS as the app, shares one clock, one filesystem and one upgrade event. The two-machine version adds a signed Linux build, an update channel, protocol version negotiation, and an old-client-new-Host compatibility matrix. Building the distributed version of a component before the local version exists inverts the staging that assessment 26 explicitly recommended: extract the boundary, run it in-process, and only then move it into a signed helper once fault tests cover the domain boundary.

#### 4.6 The networked multiplexer that already exists, and why it was rejected

WezTerm is the one mainstream multiplexer with native remote multiplexing: SSH domains with `multiplexing = "WezTerm"` spawn a proxy on the remote host, and TLS domains bootstrap over SSH to obtain a key and then run over TLS. FINAL-REPORT §2.2 already excluded `wezterm-mux-server` for Tortie on the grounds of a private lockstep protocol with no stable release since February 2024.

The 2026 evidence supports that exclusion for exactly the reason that matters here. WezTerm issue #7692 describes a mux-server that stays alive with healthy memory while its control plane stops answering: `wezterm cli list` times out and new SSH-domain attaches hang. That is the specific failure mode a bespoke networked mux control plane produces — the process owner is fine, the thing that tells you about it is not — and it is the failure mode Tortie would be signing up to own.

---

### 5. The repo problem

The code being acted on must be present where the agent runs, and work must move between local and remote without the user losing anything. There are four ways, and each breaks something real.

| Option | Keeps dirty state | Keeps untracked files | Latency cost | What it actually breaks |
| --- | --- | --- | --- | --- |
| Clone and push | No | No | None | Uncommitted work, `.env` files, local-only branches, submodule credentials, build caches. The user must reconcile by hand, in both directions. |
| Synced worktree (Mutagen, Syncthing, Unison) | Yes | Yes | Low steady-state, high on churn | Conflict semantics with no human present. Two watchers over one tree that an agent is rewriting at machine speed while `npm install` churns tens of thousands of files. |
| Mounted filesystem (SSHFS, FUSE-T, NFS) | Yes | Yes | High and constant | Every `git status`, every ripgrep, every `node_modules` stat storm crosses the WAN. Worse, a network stall blocks the local app on the filesystem, which is a harder hang than a frozen terminal. |
| Remote is the source of truth | Yes | Yes | None for tools that run remotely | The project becomes remote-only. Editor, tree, git and search must all execute remotely, which requires R3. Opening the same project locally means a second checkout and a second truth. |

#### 5.1 What the shipped products actually chose

They all chose git, and they all chose it with visible seams.

**Claude Code on the web** clones "your current directory's GitHub remote at your current branch, not your local checkout, so push first if you have local commits". When GitHub is not available it falls back to bundling the local repository, and the limits of that fallback are the most instructive fact in this whole section: the bundle must be under 100 MB, it includes full history and uncommitted changes to tracked files, **untracked files are not included**, and a session created from a bundle cannot push back to a remote. Anthropic, with unlimited budget and full control of both ends, ships a 100 MB `git bundle` and tells the user to `git add` anything they want the agent to see.

**Moving back is the harder half, and Anthropic solved it by making the user do the reconciliation.** `--teleport` requires a clean working directory (it offers to stash), the same repository rather than a fork, the cloud branch already pushed to the remote, and the same account. The teleported session is a copy: new local work does not flow back to the cloud session.

**Cursor background agents** clone the repository into an isolated per-task VM with no shared state between agents.

**stoa** clones with an authenticated URL built as `https://x-access-token:${installationToken}@github.com/${owner}/${repo}.git` from a GitHub App installation token, and the sandbox manager runs `stoa git clone --materialize`.

#### 5.2 The dirty-tree seam, stated plainly

A user with uncommitted local changes who wants to move a session to another machine has exactly three honest options, and no product has found a fourth:

1. Commit or stash, and push. Untracked files stay behind unless added.
2. Bundle the repository and upload it, accepting a size ceiling and losing the ability to push back.
3. Refuse, and say why.

Coming back is the same list in reverse, plus the requirement that the local tree is clean before the remote branch can be checked out.

There is nothing to invent here. There is only a choice about how loudly to say it. Tortie's existing precedent is the right one: assessment 26 Challenge 6 kept the armed-but-unsubmitted resume command specifically because an agent can mutate a repository, deploy code and spend money, and the pause is a feature. **Moving work between machines deserves the same treatment: show exactly what will travel, name exactly what will be left behind, and require a gesture.**

#### 5.3 The conclusion the repo problem forces

Because the tree, the git panel, the file watcher, the search index and the editor all follow the code, **locus is a property of the project, not of the session.** A project tab that contains some local sessions and some remote sessions is a tab whose file tree, `git status` and search results are true for some of its panes and false for others. That is a product that lies to people about what the agent is looking at.

One project tab, one place. Mixed-locus projects should not be buildable.

---

### 6. The manifest across two machines

Three shapes are possible, and only one satisfies the invariants already written down.

**One local manifest with a host column.** Cheapest to build and wrong in the failure case. The local SQLite cannot learn that a remote agent exited, that the remote tmux server died, or that the remote box rebooted, until the app reconnects. Since the app is "absent" from the remote's point of view every time the network flaps, the local manifest is routinely stale about liveness. That produces the duplicate-agent failure in §4.3.

**A remote manifest per host, with a local index of hosts.** Authority follows the processes, which is what assessment 26's A5 authority matrix already says: "Process is live → tmux observation". The local store keeps a pointer and a cached projection that can be explicitly marked stale. When the host is unreachable, the answer is `unknown` — never `restorable`, never `running`.

**A synced manifest.** Two writers on durability-critical rows with no human present to resolve conflicts. Assessment 26 already cut "syncing an open SQLite directory through a consumer file-sync service" from the core design; a purpose-built two-way sync of the same data is the same mistake with more code.

The authority matrix extends cleanly if, and only if, the second shape is chosen:

| Fact | Authority | Supporting evidence | When the host is unreachable |
| --- | --- | --- | --- |
| A Tortie session was intended on host H | The manifest on H, mirrored into the local index at creation | Local index row | Intent is known; state is not |
| That session's process is live | tmux observation on H | Control events on H | `unknown` — never `restorable` |
| Provider conversation identity | Provider store on H, correlated to the pane on H | Harvest provenance on H | Last known, marked stale, with the age shown |
| Recent readable output | Verified checkpoint on H, mirrored opportunistically | Local cached copy with its capture time | Serve the cached copy, labelled with its age |
| Restore succeeded | The restore state machine on H | Stage receipts on H | Cannot be asserted at all |

The rule that falls out: **a machine may only assert liveness about processes it owns.** That single rule prevents the duplicate-agent failure, and it is the reason the manifest question and the repo question arrive at the same destination — a Tortie on the far side.

---

### 7. Agent auth and secrets

This is the obstacle that most often turns a clean design into a support burden, and it is worse for Tortie than for a single-agent product, because Tortie's value is that it is agent-agnostic.

#### 7.1 The per-agent matrix

Claude Code alone has three headless paths on a box with no browser: `ANTHROPIC_API_KEY`, which bills separately from a subscription; `claude setup-token` producing a `CLAUDE_CODE_OAUTH_TOKEN` valid for about a year and requiring Pro or Max; or forwarding the OAuth callback port and completing the browser flow from the laptop. Capability then varies by feature rather than by agent: `claude remote-control` accepts only subscription auth obtained through the interactive login, and specifically not the long-lived token.

Every other agent in Tortie's registry has its own auth shape, its own token store path and its own refresh behaviour. Tortie's registry today encodes launch, resume and capture per agent. A remote mode adds a third axis — how each agent authenticates without a browser — and CLAUDE.md classifies anything claimed to work universally across agents as Tier 3 verification. That is a per-agent, per-host, per-OS matrix that must keep passing, on top of the resume conformance matrix that already exists.

#### 7.2 What the serious implementations did

Neither of them put the user's credentials on the box.

Anthropic states that in Anthropic-hosted environments "sensitive credentials such as git credentials or signing keys are never inside the sandbox with Claude Code; authentication is handled through a secure proxy using scoped credentials". stoa mints a GitHub App installation token — short-lived by construction — and injects it into a clone URL, never a user personal access token.

Both of those are **credential brokers**. A broker is a service, with an availability obligation, a rotation story, an audit story and a breach story. It is not a feature that ships in a desktop app.

#### 7.3 The rest of the secret surface

Beyond the agent's own auth: `gh` authentication, signing keys, and the `.env` files a repository needs before its tests will run at all. SSH agent forwarding is the tempting shortcut and it is a real privilege escalation — anything with root on the remote can use the forwarded agent for as long as the connection is open. If forwarding is ever offered it must be off by default and per-host.

#### 7.4 The conclusion

If Tortie brokers credentials to boxes it operates, Tortie becomes a custodian of other people's GitHub and model-provider access. That changes what the company is, and it does so in service of a feature the product has not yet proven demand for.

If instead the remote box is the user's own machine, already logged in, with its own keys, the problem disappears rather than being solved. There is no broker, no scoped-token minting, no rotation, and no new class of incident. That is not a workaround. It is the same reasoning as assessment 26's B10, which chose a user-chosen destination over a Tortie cloud account for off-device backup.

---

### 8. What the interface must show

The Zen forbids teaching the product's internals and forbids multiplexer vocabulary. It does not forbid telling the truth about where work lives, and it cannot, because location changes what is true: which files can be opened, whether `git status` reflects what the agent sees, whether image drop works, whether SpecStory captured anything, and what restore means.

The distinction that resolves the tension: **hide the transport, show the locus.**

The user should never see SSH options, control-mode state, socket paths, reconnect backoff or round-trip times. The user must always be able to see which machine a project's work lives on, in the same quiet way a branch name sits in the interface.

Six rules follow.

1. **The locus badge lives on the project tab, not the session.** One short host name, styled like the branch indicator. Local projects show nothing, because local is the default and a badge on everything is a badge on nothing.

2. **Honest verbs extend, they do not multiply.** Assessment 26's M1 continuity certificate already chooses verbs from evidence. Remote adds one state and one rule: transport loss produces "Reconnecting", host unreachability produces "Unknown — cannot reach `<host>`", and neither may ever render as "restorable" or "running". A session whose liveness cannot be asserted must not offer a restore button.

3. **Moving work is a git operation and the interface says so.** "Move to `<host>`" shows exactly what will travel — commits to push, dirty tracked files, and a named list of untracked files that will be left behind — and requires a gesture. This is the armed-resume precedent applied to a second irreversible action.

4. **Degradation is stated once per project, not once per session.** If a remote project cannot receive hooks, cannot capture conversation identity, or cannot run SpecStory capture, that is a property of the project and it is said plainly when the project is created, not discovered later when a notification fails to arrive.

5. **Silent degradation of attention is the worst possible outcome and must be impossible.** The product's promise is that it will tell the user when something needs them. A remote session whose attention signals are quietly weaker than a local one's breaks that promise in the least detectable way. If the far side cannot report attention, the project must say so once and the sessions in it must never present the same confident "needs input" affordance as a local session.

6. **Nothing new gets a dashboard.** No connection meters, no latency graphs, no host health panel, no "3 remote sessions" counter. Assessment 26 Challenge 10 already ruled on this shape of temptation.

---

### 9. The substrate survey, verified 12 August 2026

#### 9.1 Sandbox products

| Product | Default lifetime | Maximum continuous runtime | Persistence model | Notable |
| --- | --- | --- | --- | --- |
| E2B | 5 minutes | 1 hour (Hobby), 24 hours (Pro) | Pause saves filesystem **and memory**; paused sandboxes kept indefinitely with no TTL; the runtime clock resets on resume | On pause, the service is unreachable and "all the clients will be disconnected" |
| Modal | 5 minutes | 24 hours | Filesystem snapshots to chain sandboxes; volumes; memory snapshots expire after 7 days | Docs explicitly recommend snapshot-and-restore for anything over 24 hours |
| Vercel Sandbox | 5 minutes | 45 minutes (Hobby), 24 hours (Pro/Enterprise) | Ephemeral; snapshots or persistent sandboxes for continuity | Firecracker microVM, 32 GB ephemeral NVMe |
| Cloudflare Sandbox SDK | Sleeps after 10 minutes idle, configurable | Can be kept alive until `destroy()` | State ephemeral; `createBackup()` / `restoreBackup()` across sleep | Containers and Sandboxes reached GA on 13 April 2026 |
| Daytona | Auto-stop after 15 minutes idle | Wall-clock TTL configurable | Running / Stopped / Archived / Deleted, auto-archive after 7 days stopped | Framed as persistent development environments rather than sandboxes |
| GitHub Codespaces | Idle timeout 30 minutes, settable 5–240 minutes | Stopped, not killed | Stopped codespaces retained 30 days by default, then deleted | The closest thing to a durable managed dev box, and it still stops on idle |

The pattern is unambiguous. Sandbox products are priced, engineered and documented around minutes-to-hours workloads. Their persistence is snapshot-and-recreate. E2B's indefinite retention of paused sandboxes is the closest to durable, and even there the paused sandbox is a storage object, not a running process: clients disconnect, services stop answering, and the thing that comes back is a restored image.

#### 9.2 Long-lived machines

| Substrate | Lifetime cap | Indicative cost | Notes |
| --- | --- | --- | --- |
| Fly Machines | None | shared-cpu-1x 1 GB at $5.92/month; shared-cpu-2x 2 GB at $11.83/month; volumes $0.15/GB/month; snapshots $0.08/GB/month with first 10 GB free; egress $0.02/GB in North America and Europe | Suspend uses Firecracker snapshots but is limited to machines of 2 GB or less, and snapshots are explicitly not guaranteed to survive deploys, host migration or maintenance |
| Hetzner Cloud CX22 | None | About €4.35/month for 2 vCPU, 4 GB, 40 GB NVMe | The cheapest credible always-on developer box |
| DigitalOcean | None | Basic from $4/month; 2 vCPU / 4 GB premium Intel at $24/month | |
| The user's own desktop | None | Already paid for | No vendor, no egress, no account, keys already present |

A 50 GB workspace on Fly is $7.50/month of volume on top of the machine, so a realistic durable box is roughly $20/month before egress; the same shape on Hetzner is under €5. Against that, E2B Pro is a $150/month subscription including 500 hours, with roughly $0.17/hour for a 2 vCPU / 4 GiB sandbox beyond it — and a 24-hour ceiling.

#### 9.3 What the agent vendors are doing, and what it means

**Anthropic** ships Claude Code on the web on Anthropic-managed VMs, with sessions that persist across browser close, `--cloud` to start one from the terminal and `--teleport` to pull one back. The most relevant line in the whole documentation set is in its troubleshooting section: "Cloud sessions stop after a period of inactivity and the session's VM is reclaimed… Reopen the session from claude.ai/code to provision a fresh VM with your conversation history restored." Even the vendor with the deepest possible integration does not keep the machine for days. It keeps the **conversation** and reprovisions the machine.

**OpenAI** announced on 11 June 2026 that it will acquire Ona, formerly Gitpod GmbH, explicitly so that Codex can keep working on a task for hours or days after the developer closes their laptop, describing Ona's contribution as "secure, persistent environments". Reporting at the time noted the transaction had not closed.

**Cursor** gives each background agent its own isolated Ubuntu cloud VM, cloned from the repository, which keeps working regardless of the user's connection.

Two conclusions follow, and they point in opposite directions.

The market has validated the *need*: durable work that is not tied to a laptop being awake is where agentic coding is going, and two of the largest players are spending acquisition money on it.

The market has also demonstrated the *shape of the answer*: each vendor is building it into their own single-agent product, with their own credential proxy, their own repository integration and their own conversation store. None of that is available to a neutral shell, and competing with it directly means building the same three things without the vendor's position.

---

### 10. What carries over from the prior art, and what does not

Both `/Users/gdc/stoa` and `/Users/gdc/specstory-sync` used remote compute ephemerally. That is not an oversight in those products; it is the correct shape for what they do, and the reason it does not transfer is precise.

#### 10.1 stoa, as built

Verified from the working tree: `MAX_SANDBOX_TIMEOUT_MS = 60 * 60 * 1000` in `packages/agent-sandbox/src/constants.ts`, and the user-facing capabilities text says "~55 minute session timeout". The template is `stoa-agent-v2` with 8 GB and 8 vCPU. The three-session architecture puts durable truth in Supabase, in-memory handles in a Vercel instance, and the ACP server process in the sandbox — where it "persists until sandbox expires (~55 min)". Notably, `SandboxManager.pause()` does not pause at all: it calls `this.sandbox.kill()` and returns the id, and `resume()` is `Sandbox.connect(sandboxId)` with three retries and backoff.

That is a meeting-length workload with the durable state deliberately kept outside the box. Tortie's durable state is the running process itself.

#### 10.2 What transfers

| Pattern | Where it came from | How it applies |
| --- | --- | --- |
| Reconnect by stored identity, then re-verify | stoa's `getOrReconnect`: read `sandbox_id`, `server_id`, `session_id` from Postgres, reconnect, list running servers, match `server_id`, seed the native session id, persist any change | Exactly the reconciliation a remote Tortie needs, and it matches Tortie's existing rule of addressing by `@gmux-id` rather than by name |
| Machine-readable health written by a watchdog and probed, never scraped | stoa's `stoa-service-watchdog.sh` writes `.stoa/service-monitor.json` every 5 seconds; `stoa service status --json` and `stoa status --json` exist so nothing parses human output; heartbeat older than 15 seconds restarts the watchdog | The correct liveness probe shape for a remote Tortie Host |
| Sanitise remote-origin content before it enters the local store | stoa's `agent-content-safety.ts`: binary detection, control-character stripping, size caps, recursive JSON depth and breadth limits | A remote pane's bytes are untrusted input into local SQLite and the renderer |
| Short-lived, scoped credentials rather than user tokens | GitHub App installation token in the clone URL | If credentials ever have to reach a box, this is the only acceptable shape |
| Device-code authorisation for a box with no browser | specstory-sync `DEVICE-AUTH.md`: 6-character code, 24-hour expiry, one-time use, device metadata captured | The right flow for authorising a headless machine against an account |
| Optional relay with a working fallback | stoa's Worker returns both `publicUrl` and `brandedUrl`; the CLI prefers branded only when present | Any relay Tortie ever adds must be bypassable by construction |

One anti-pattern also transfers, as a warning: specstory-sync issues a **10-year** device refresh token, stored in a table for revocation. That is a long tail of custodial risk for a convenience, and it is the kind of decision that looks free until it is not.

#### 10.3 What does not transfer

- **Ephemeral TTL as the lifecycle.** stoa could afford a 55-minute box because the truth lived in Supabase and a CRDT. Tortie's truth is a live PTY.
- **Serverless-client reconciliation.** stoa reconnects because the client is disposable and the sandbox is stable for an hour. Tortie's problem is the reverse over a horizon of days.
- **CRDT synchronisation of the working tree.** Automerge syncs documents. It is not a substitute for git over a worktree containing `node_modules`.
- **A hosted control plane as a requirement.** specstory-sync is nine workers, five queues with dead-letter queues, cron sweeps, Durable Objects, R2 and Supabase. That is the honest cost of "we run infrastructure", and it is exactly what assessment 26 Challenge 9 declined.

---

### 11. The call

#### 11.1 The case for building it

1. **The interruption is real and common.** A closed laptop lid is the most frequent interruption in a developer's day. Tortie's promise that the shell outlives the window is strictly weaker than "the work outlives the machine", and users will notice the gap.
2. **The market has validated it with money.** OpenAI acquired Ona explicitly for hours-to-days persistence; Anthropic ships cloud sessions with mobile monitoring and teleport.
3. **Tortie's version would be more general than any vendor's.** A remote Tortie could hold a long build, a dev server, a database migration, a `tail -f` and three different agents at once. Claude Code's cloud holds Claude Code. Codex's cloud holds Codex. Neutrality is a real differentiator, and it is the one thing the vendors structurally cannot copy.
4. **Two of the hardest ingredients already exist.** Sessions are addressed by immutable identity, and the manifest records resume recipes. Adding a host dimension looks, on paper, like a schema change.

#### 11.2 The case against

1. **It fails the Zen's boring-and-older test at exactly the layer that matters.** A remote Tortie Host is new code, written by this product, sitting in the path of live work, across a WAN, with a version-compatibility matrix. Assessment 26 had to argue hard to justify a *local* Host and concluded "keep, but stage it". That Host does not exist yet.
2. **It multiplies the invariants that are currently failing.** Today's scores: integrity and disaster recovery 5 out of 15, spatial continuity 4 out of 10, attention protection 10 out of 15, restore honesty 7 out of 10. Every open P0 gets harder with a second machine. A5 becomes a three-way authority problem. A6 gains an unreachable state that must not collapse into `restorable`. A9 becomes two binaries that must interoperate across an upgrade. B2 has to decide which disk holds the recovery copies. M2's conformance matrix gains a host and an operating system axis. Remote sessions would add a second promise to a product scoring 63 out of 100 on its first one.
3. **The differentiators do not cross the wire.** Without a remote Host, remote sessions are a terminal mirror — cmux's beta feature, not Tortie's product. With a remote Host, they are Tortie's product plus a fleet of second instances to keep compatible.
4. **Credentials become a custodial obligation.** Both serious implementations built credential brokers. Tortie is local-first with no account. Brokering GitHub and model-provider access to boxes changes what the company is.
5. **The substrate reduces to a hosting business.** No sandbox vendor supports days, so "infrastructure we build and maintain" means a fleet of ordinary VMs plus an image, an updater, a reaper, quotas, abuse handling, egress billing and a support surface — for a benefit the user can obtain from a €4.35/month machine they already control.
6. **It fails the parity guardrail's own test.** CLAUDE.md requires every proposal to answer whether it serves the agentic-coding workflow or exists because others have it. "Remote because OpenAI bought Ona" is the second. "Remote because my laptop sleeps" is the first — and that one is satisfied by the user's own desktop.

#### 11.3 The decision

**Do not build a Tortie-operated remote substrate. Do not build a bespoke remote protocol, relay or credential broker. Do build durable remote sessions on machines the user already owns, over plain SSH, and stage them so that each step is worth shipping on its own.**

The rest of this section makes that concrete enough to become a phase brief rather than a sentiment.

#### 11.4 The cheaper thing that gets most of the value

**Stage R0 — fix the WAN-shaped bugs that already exist. No remote anything.**

Scope: separate transport loss from process loss; make `unknown` a first-class state distinct from `restorable`; stop control-client exit from triggering the T2 recovery path unconditionally; make liveness assertable only by the owner of the process.

Why first: these are assessment 26's A5 and A6 with a sharper motivation. They improve the local product on its own terms, they are the precondition for anything remote, and they close the duplicate-agent hazard in §4.3. Tier 3 verification, because this is durability and session lifecycle.

Cost: contained. Value: independent of whether remote ever ships.

**Stage R0.5 — measure whether the problem is actually remoteness.**

Before any of this, establish what fraction of interrupted work is "my laptop slept" rather than "I was not at my machine". If it is the former, the fix is `caffeinate` while sessions are active plus honest labelling of what a closed lid does, and it costs a day rather than a quarter. This is the cheapest possible outcome and it should be ruled out before the expensive one is funded.

**Stage R1 — Tortie on the other machine. This is the 80%.**

The remote machine runs an ordinary Tortie. It owns its own tmux server on its own `-L gmux` socket, its own manifest, its own harvesters, its own hook receiver on its own loopback, and its own SpecStory capture. The local app attaches to its panes as a client.

What the local app adds is a client, not a second authority:

- Project tabs may be bound to a host. Locus is a property of the project (§5.3).
- The attach host spawns `ssh -o ControlMaster=auto -o ControlPersist=… -o ServerAliveInterval=15 <host> tmux -L gmux attach-session -t =<name>` in place of the local spawn. Rendering, batching and watermark flow control are unchanged.
- Liveness, session lists and restore state come from the remote Tortie's manifest, cached locally and explicitly stale-able. The remote's answer always wins; unreachable is `unknown`.
- Reachability is the user's own LAN, VPN or tailnet. Tortie documents it and implements none of it.

What this gets, for very little new durability-critical code:

| Question | Answer under R1 |
| --- | --- |
| Where does the tmux server live? | On the remote machine, owned by an ordinary Tortie, exactly as it is owned locally |
| How does the app attach? | OpenSSH plus `tmux attach-session`. No new protocol |
| Where does the code live? | Permanently on the machine where the work happens. The repo problem does not arise |
| How does work move between machines? | `git push`, as it already does. Tortie shows what travels and what stays |
| Where is the manifest? | One per machine, owned by the Tortie that owns the processes. A local index of hosts, and nothing more |
| How do agents authenticate? | They are already logged in on the user's own box. No broker |
| Does attention still work? | Yes on the far side, because the far side is a whole Tortie. Delivery to the near side requires the connection, and the interface must say so |

What R1 does not give: attention notifications from a remote session while the local app is closed, until the far side's Host work lands. That is Gate 2 in assessment 26 and it is the same work either way.

**Stage R2 — headless remote, only against measured demand.**

For a Linux box with no desktop, the Tortie Host built for the local case gets a Linux build and runs headless; the desktop speaks the A4 protocol over an SSH-forwarded Unix socket. This is reuse of a component that will exist anyway, not a new architecture — which is precisely why it is cheap later and expensive now.

**Never by default — a Tortie-operated fleet.**

If users without a spare machine ask for one, the answer is provisioning assistance, not tenancy: a documented image or cloud-init for Fly, Hetzner or EC2 that the user pays for and owns. This preserves local-first and account-free, and it mirrors the posture assessment 26 took on off-device backup in B10.

#### 11.5 What would change this answer

State the triggers now, so the decision is reviewable rather than permanent.

1. A sandbox vendor ships genuinely durable multi-day process continuity — not snapshot-and-restore — with an availability guarantee. Today none does.
2. Measured demand shows a material share of users have no second machine and want durable work anyway, after R1 has shipped and been used.
3. The local Host (A3, A4) is shipped, proven and stable, so that R2 is a build-target change rather than a new system.
4. A neutral credential-brokering standard emerges that Tortie can adopt rather than operate.

Until at least the first three hold, building this makes the product less able to keep the promise it has already made.

---

### 12. If it is built anyway — the non-negotiables

These belong in assessment 26's fault matrix and should gate any remote work.

| Boundary | Injected failure | Required invariant |
| --- | --- | --- |
| Transport loss on a healthy host | Drop the SSH connection mid-session | Session becomes `reconnecting` then `unknown`. It never becomes `restorable`. No snapshot-on-exit path runs. No restore button appears |
| Host unreachable at launch | Start the app with the host down | Remote projects open read-only from cache with visible staleness. No local shadow session is offered |
| Two clients, one remote session | Attach from two machines | Identity reconciliation holds. Neither client asserts liveness the other contradicts. No duplicate manifest row |
| Restore attempted against an unreachable host | Press restore while the link is down | Refused with a reason. Never a partial local recreation |
| Clock skew between machines | Skew the remote clock | Capture timestamps and staleness ages remain interpretable, or are marked unknown |
| Version mismatch | Old local app, new remote Tortie, and the reverse | Explicit compatibility response. Never a silent partial protocol |
| Remote reboot | Reboot the remote box | The remote Tortie's own restore path owns it. The local app reports what the remote reports, and claims nothing more |
| Untrusted remote bytes | Emit control sequences and binary from a remote pane | Sanitised before entering the local store and the renderer, per stoa's `agent-content-safety.ts` shape |
| Checkpoint scheduling at scale | 30 remote sessions on one link | Capture cadence is host-aware and link-bounded, not per-session naive |
| Move with a dirty tree | Move a project to a host with uncommitted and untracked files | Exact list of what travels and what is left behind, and a required gesture. Never a silent partial transfer |

---

### 13. Sources

Project evidence, read on 12 August 2026:

- [The Zen of Tortie](../ZEN-OF-TORTIE.md)
- [Durability, architecture and recovery assessment](26-tortie-durability-architecture-and-recovery.md)
- [Final architecture report §2](../FINAL-REPORT.md)
- `src/main/attach/attach-host.ts`, `src/main/tmux/resolve.ts`, `src/main/tmux/supervisor.ts`, `src/main/tmux/control-client.ts`
- `src/main/activity/hooks.ts`, `src/main/activity/process.ts`
- `src/main/manifest/harvest/stores.ts`, `src/main/manifest/harvest/watch.ts`
- `src/main/specstory/resolve.ts`, `src/main/sessions/core.ts`

Prior art on this machine, read-only:

- `/Users/gdc/stoa/packages/agent-sandbox/src/constants.ts`, `manager.ts`
- `/Users/gdc/stoa/stoa-web/lib/space-agent/AS-BUILT-ARCHITECTURE-V2.md`, `agent-registry.ts`, `agent-content-safety.ts`
- `/Users/gdc/stoa/stoa-web/e2b-template-v2/e2b.toml`
- `/Users/gdc/stoa/cloudflare-worker/src/index.ts`, `cloudflare-worker/README.md`
- `/Users/gdc/stoa/DEVELOPMENT.md`
- `/Users/gdc/specstory-sync/ARCHITECTURE.md`, `DEVICE-AUTH.md`

External primary sources, verified 12 August 2026:

- [E2B sandbox persistence](https://docs.e2b.dev/sandbox/persistence)
- [Modal Sandboxes](https://modal.com/docs/guide/sandboxes)
- [Vercel Sandbox pricing and limits](https://vercel.com/docs/sandbox/pricing)
- [Cloudflare Sandbox SDK — sandbox instances](https://developers.cloudflare.com/sandbox/)
- [Cloudflare Containers and Sandboxes GA changelog](https://developers.cloudflare.com/changelog/post/2026-04-13-containers-sandbox-ga/)
- [Daytona sandboxes](https://www.daytona.io/docs/en/sandboxes/)
- [GitHub Codespaces timeout](https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces) and [retention](https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/restricting-the-retention-period-for-codespaces)
- [Fly.io resource pricing](https://fly.io/docs/about/pricing/) and [machine suspend and resume](https://fly.io/docs/reference/suspend-resume/)
- [Tailscale pricing](https://tailscale.com/pricing) and [the April 2026 pricing update](https://tailscale.com/blog/pricing-v4)
- [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
- [Claude Code authentication](https://code.claude.com/docs/en/authentication)
- [cmux remote tmux (beta)](https://cmux.com/docs/remote-tmux)
- [iTerm2 tmux integration](https://iterm2.com/documentation-tmux-integration.html)
- [Eternal Terminal](https://eternalterminal.dev/) and [issue #366 on slow tmux-mode reattach](https://github.com/MisterTea/EternalTerminal/issues/366)
- [WezTerm multiplexing](https://wezterm.org/multiplexing.html) and [issue #7692 on mux-server control-plane hangs](https://github.com/wezterm/wezterm/issues/7692)
- [Zed remote development](https://zed.dev/docs/remote-development)
- [macFUSE](https://macfuse.github.io/)
- [Mutagen](https://mutagen.io/) and the [Docker acquisition](https://www.docker.com/blog/mutagen-acquisition/)

Secondary sources, labelled as such:

- OpenAI's acquisition of Ona, announced 11 June 2026 — [SiliconANGLE](https://siliconangle.com/2026/06/11/openai-acquires-ai-agent-orchestration-startup-ona/)
- E2B pricing detail — [Morph](https://www.morphllm.com/e2b-pricing), [Beam](https://www.beam.cloud/blog/e2b-pricing-explained)
- Hetzner CX22 pricing — [VPS for Devs](https://vpsfor.dev/posts/hetzner-cx22-pricing-2026/)
- DigitalOcean droplet pricing — [DigitalOcean](https://www.digitalocean.com/pricing/droplets)
- Cursor background agent environments — [Morph](https://www.morphllm.com/cursor-background-agents)

#### Additional sources for Dimensions 1 and 2

Project evidence, read at `db3cd02` on 12 August 2026:

- `src/main/db/sqlite.ts` — the one opener; `WAL` / `synchronous=NORMAL` / `busy_timeout`; `immediateTransaction`; `runMigrations`
- `src/main/db/__tests__/sqlite.test.ts` — the deterministic `SQLITE_BUSY_SNAPSHOT` worker-thread reproduction
- `src/main/restore/snapshots.ts` — capture points, single generation, tmp+rename without `fsync`
- `src/main/restore/restore.ts` and `src/main/restore/command.ts` — partial replay and arming outcomes; armed-not-executed
- `src/main/sessions/core.ts` — `resumeCaptureFor` (198), server-exit handler (551), `snapshotAllSessions` (783), restore outcome discarded (836), status poller (1067), declaration before spawn (1444)
- `src/main/manifest/store.ts` — open path and migrations
- `src/main/migrate/userdata.ts` — `VACUUM INTO` copies, `DbVerification` row-count evidence, `SKIP_ENTRIES`
- `src/main/agents/registry.ts` — per-agent session-store paths and `realpath(cwd)` keying
- `src/main/index.ts` — `window-all-closed` → `app.quit()`; the `GMUX_SMOKE` harness family
- `src/main/tray/` — the tray that already exists and is disposed on quit
- `src/renderer/state/layout.ts`, `src/renderer/state/store.ts`, `src/renderer/app/resume.ts`
- `resources/gmux-tmux.conf` — `remain-on-exit failed`
- `package.json` — `smoke:t1`, `smoke:t3`, `conformance:resume`, `conformance:resume:capture`

Prior art, read-only:

- `/Users/gdc/specstory-sync/workers/lore-cloud-worker/src/sandbox.ts` — 30-minute cost-backstop TTL, idempotent kill, kill-on-launch-failure
- `/Users/gdc/specstory-sync/workers/lore-cloud-worker/src/lore_cloud_worker.ts` — global and per-owner sandbox concurrency caps
- `/Users/gdc/stoa/stoa-web/app/api/v1/admin/reconcile-sandboxes/route.ts` — orphan sandbox reaper with a 15-minute grace period

External, verified 12 August 2026:

- [Claude Code Remote Control](https://code.claude.com/docs/en/remote-control) — local process must keep running; tmux or screen recommended for SSH; ~10-minute network-outage timeout
- [E2B pricing](https://e2b.dev/pricing) — tiers, session length, concurrency, per-second rates
- [Modal timeouts](https://modal.com/docs/guide/timeouts) — 5-minute default, 24-hour maximum
- [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode) — text-only, designed to be used over ssh
- [Mosh](https://mosh.org/) — roaming, and no tmux control mode
