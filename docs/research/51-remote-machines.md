# Research 51. Remote machines

**Decision document. Written 2026-08-16.** It rules on one question. The operator runs four
machines over tailscale, all inside tmux, and reaches them today with a raw terminal, which he calls
clunky. He wants what Tortie already does locally, being intuitive menus, hidden complexity and
durable named sessions, extended to those machines with the same durability guarantees.

**Provenance and safety.** This round ran a distillation of research 28 against the tree at
`a648cbd`, a seam map read directly from the current sources, a field survey by live fetch of
primary pages on 2026-08-16, two full competing designs, and two adversarial reviews of both. Every
tree claim below carries a file path, verified this session; line numbers will drift and symbol
names will not. No repository file was written except this one. No git command that writes was run.
`~/.ssh/config` was read once and counted, never modified. No key, passphrase or known_hosts entry
was touched. No ssh connection was opened. Web claims not verified on a live page are listed in
section 8, not silently trusted.

---

## 0. The answer

Build the thin design. Tortie drives each remote machine's own tmux over a plain `/usr/bin/ssh`
subprocess, in control mode for events and through `ssh -t` for visible panes. Nothing installs on
the remote machine. No broker, no relay, no daemon, no fleet. This is the carriage iTerm2 has run in
production since roughly 2012, and it is the only shape the field survey found that pays neither the
matched-daemon version lattice nor a vendor tenancy. Durability stays exactly where the house rules
already put it, in a tmux server beside the processes, and the Mac app stays what it already is,
being a disposable client, now to five servers instead of one.

The competing design, a headless Tortie Host installed on every machine, is rejected for now. Its
verdict row is in section 5 and its residency contradiction is in section 8. It is not refuted
forever. It is the only shape that can ever give machine-local harvest, machine-local oracles and
attention history recorded while the Mac is away, and nothing in the thin design blocks building it
later on the same machine profiles and the same attach seam.

The smallest slice that helps the four-machine scenario this month is rungs M0 through M3 of the
ladder in section 6. That slice gives the operator every machine in one window, durable named
sessions created and attached from native menus, and honest status when a link drops. It ships with
the restore verb refused for every remote row. The duplicate-agent hazard research 28 ranked as the
one failure that destroys work fires only through restore acting on stale truth, so a v0 that never
offers remote restore cannot fire it. Restore arrives at M5, behind the partition harness.

Three sentences of first-run copy are part of the design, not an appendix:

- Existing tmux sessions on your machines are never adopted and never touched. Tortie sessions are
  created fresh, inside Tortie.
- While this Mac is closed or asleep, your remote agents keep running, and nothing can create a new
  Tortie session anywhere.
- Attention signals such as needs input work while this Mac is connected. They have gaps, never
  queues.

---

## 1. What research 28 said, and what survived it

Research 28 (1201 lines, written 2026-08-12) surveyed ten sandbox vendors and four self-managed
substrates, ruled out every vendor on process-continuity ceilings of 24 hours or less, ruled out
conversation portability because five (now more) agents key their stores to `realpath(cwd)` under a
home directory, and concluded that remote means an ordinary machine the user owns, reached over his
own tailnet, with no broker and no relay ever. Research 33 then superseded its gap ranking, and
Phases 19 to 21 closed most of the gaps. The standing decision in docs/BACKLOG.md, "do not build
remote session infrastructure, ever", refers to rented compute and stays true; this document is
about the operator's own machines, which 28 named as the first choice substrate.

| Conclusion of 28 | Status on 2026-08-16 | Evidence |
| --- | --- | --- |
| Buy nothing, rent nothing, no sandbox vendor | Stands, unweakened | Vendor ceilings unchanged; store keying now spans 13 agents (`src/main/agents/registry.ts`) |
| R1 shape, a whole Tortie on the far side | Superseded in part | This document keeps R1's client-side half and drops the far-side Tortie; section 5 |
| One manifest per machine, liveness only asserted by the machine that owns the process | Stands as a rule, restated | Section 4.4 implements it with one local manifest and a per-machine reconcile boundary |
| Locus is a property of the project tab, hide the transport | Stands, softened | Sessions carry a machine badge in one rail; the fleet-console failure mode is named in section 8 |
| No broker, no relay, no keys in Tortie files | Stands | Reaffirmed against Happy and VS Code Tunnels in the field survey |
| Gate R1 behind gaps A to C and a demand measurement (R0.5) | Partly satisfied | See the gap table below; R0.5 is answered by the operator's own scenario, which is "I was not at my machine", not "my laptop slept" |
| G-list ranking as a to-do list | Superseded by research 33 | Phases 19 to 21 executed it; this document does not re-plan closed gaps |
| Eleven agents | Stale | The registry holds 13 ids since Phase 59 |
| Line numbers cited in 28 | Stale | Current anchors are used throughout this document |

The gap ledger, so no rung below re-plans a closed item:

| Gap from 28 | Status | Where |
| --- | --- | --- |
| G1a silent ENOSPC | Closed, Phase 19 | `src/main/durable/error.ts`, notice via `src/main/notice/` |
| G1 timed checkpoints | Open | `src/main/power/index.ts` captures on suspend only; no timer exists |
| G2 manifest integrity, ring, reconstruction | Closed, Phases 19 and 20 | `src/main/db/integrity.ts`, `src/main/manifest/recovery.ts`, `ring-schedule.ts` |
| G3 tray residency, the local Host | Open | `src/main/index.ts` still quits on window-all-closed |
| G4 power-loss-safe generations | Closed, Phase 19 | `src/main/durable/`, proven by `smoke:fault` 16 of 16 |
| G5 restore honesty | Closed, Phase 19 | `src/shared/restore-status.ts`, restore journal |
| G6 resume provenance | Closed, Phase 21 | migration `008-agent-recovery-contract` |
| G7 spatial state in localStorage | Open, deliberate | `src/renderer/state/layout.ts` |
| G8 borrowed tmux | Closed by a different mechanism, Phase 41 | Bundled 3.7b, tested-pair gate, `src/main/tmux/version.ts`; the socket is still `-L gmux` |
| G9 transport loss read as process loss | Open, and load bearing here | `unknown` exists in `src/shared/types.ts` with no producer; `refresh()` in `src/main/sessions/core.ts` still flips every non-exited row to `restorable` on `TMUX_UNREACHABLE` |

G9 is the precondition 28 named for anything remote, it is the one item of its A to C gate that
never landed, and four machines on a tailnet multiply its trigger rate by four. It is rung M0.

---

## 2. The field, surveyed live

Every row was checked against a primary page on 2026-08-16 except where section 8 says otherwise.
The one-sentence verdict of the survey is that nothing on the market gives durable named agent
sessions across several machines from one window, and the one carriage that installs nothing on the
far side is tmux control mode spoken to the remote machine's own tmux over plain ssh.

| Product | What it proves for this design | Verdict |
| --- | --- | --- |
| iTerm2 tmux integration | The whole carriage. Remote tmux is the durability layer, zero remote install, in production since about 2012. Its two documented limits are both layout-mirroring artifacts, and Tortie owns rather than mirrors, so neither transfers | Steal the carriage |
| Tailscale SSH | Node identity replaces keys, revocation is an ACL edit, free tier covers 4 personal machines. Removes the entire key problem for this operator | Steal the auth posture |
| Happy (23.4k stars) | The needs-input event must be produced beside the process, then carried. Its price is a relay and a wrapped agent binary, both refused by charter | Steal the semantic, refuse the relay |
| WezTerm mux domains | Requires a matched wezterm on the remote; last stable release 2024-02-03. This is the matched-daemon lattice in the wild | Refuse the shape, keep `local_echo_threshold_ms` as a later idea |
| Zellij web client | Newest durable-remote design (v0.43.0, 2025-08-05); tokens hashed, shown once, revocable; presumes zellij installed remotely | Refuse the in-app server, note the token discipline |
| mosh | Settled the G9 vocabulary 14 years ago, being that a dropped link and a dead process are different events. No release since 2022-10-31, visible state only | Take the doctrine, not the dependency |
| Eternal Terminal | Reconnecting TCP with scrollback; needs `etserver` remotely; no release since 2023-07-07 | Refuse |
| VS Code Remote-SSH | Logic runs where the data is, which this design honors by labeling rather than faking. Its bootstrap auto-downloads and executes a server, which is refusal 8 exactly | Steal the placement rule, refuse the bootstrap |
| VS Code Remote Tunnels | Azure relay, 10 tunnels per account, the CLI silently deletes one at the cap | Refuse; this is what a vendor cap looks like |
| Ghostty | ssh integration is terminfo forwarding with graceful fallback | Nothing to refuse; not a competitor here |
| Termius | Synced host vaults, $10 to $20 per user per month, no session durability at all | Refuse cloud vaults for execution-bearing rows |
| Coder | A control plane for fleets you provision; the operator's machines already exist | Refuse for this operator |
| Claude Code web and mobile | Even Anthropic's remote story is orchestration, not a durable remote terminal. The niche is unoccupied | Confirms the gap |

The three steals, stated once:

1. Drive the remote machine's own tmux in control mode over a plain ssh subprocess. Client and
   server are then the same remote binary, so the Phase 41 wire pair is same-version by
   construction and no Tortie binary crosses the wire.
2. Tailnet identity instead of keys, `tailscale status --json` instead of host forms. Tortie stores
   a host alias behind the config confirm hash and nothing else.
3. Happy's placement of the attention signal. A client that computes needs input from a stream it
   holds must say "while connected" and mean it. The alternative needs software beside the process,
   which is the rejected design.

The trap every failed product falls into is putting its own software on the far machine before
anything works, and every one thereby inherits a bootstrap step, an N by M version lattice across
self-updating nodes, and a per-OS binary matrix. The bundled tmux 3.7b is a macOS arm64 binary and
cannot be copied to a Linux box, so Tortie would inherit all three at once.

---

## 3. The seams this design plugs into

The current tree, verified this session, gives the design its exact insertion points.

| Seam | Today | What the design does with it |
| --- | --- | --- |
| `execTmux` (`src/main/tmux/supervisor.ts`) | One door for every tmux command, `execFile` against the local socket | Gains a per-machine context; remote verbs become `execFile('/usr/bin/ssh', [..., host, 'tmux', ...])` |
| `getTmuxContext()` (supervisor.ts) | A process-wide singleton | Becomes `MachineContext`, one per machine; every caller already flows through it |
| Control client (`src/main/tmux/control-client.ts`) | One long-lived local `tmux -C` child; reconnect loop 500 ms to 10 s | Same line protocol over an ssh pipe; the first reconnect step becomes a transport check, never a local `ensureServer()` |
| Attach host (`src/main/attach/attach-host.ts`) | One node-pty per visible session; `AttachHostOptions.tmuxBin` already injects the binary; flow control is transport blind | Spawns `ssh -t host tmux -L gmux -u attach-session -t =name`; batching, watermarks and detach semantics untouched |
| `reconcileManifest` (`src/main/manifest/reconciliation.ts`) | Already pure over a `LiveTmuxSession[]` list | Called per machine with that machine's snapshot; the algorithm does not change |
| Identity stamps | `@gmux-id` session option plus `GMUX_SESSION_ID` pane env, both living in the tmux server | Travel with a remote server for free; this half of durability is already remote-ready |
| Config confirm gate (`src/main/config/confirm.ts`, `seal.ts`) | Rows launch nothing until a person confirms a hash of execution-bearing fields | The machine row copies the pattern verbatim |
| Shell shim cap (Phase 51, `src/main/shell/argv.ts`) | Opens a folder and refuses everything else, with refusal 8 as the stated reason | Binding precedent for any machine bootstrap command |

What does not exist today, stated plainly. There is no ssh transport code anywhere under `src/main`
or `src/shared`. `TESTED_TMUX_PAIRS` holds exactly one pair. The manifest has no machine column.
Harvest, preflight, the install map and snapshot capture all read the local disk. Reconcile cannot
express "unreachable" as distinct from "gone".

---

## 4. The recommended design

### 4.1 The carriage, three planes per machine

| Plane | Local mechanism today | Remote mechanism |
| --- | --- | --- |
| Exec, one-shot verbs | `execFile(bin, ['-L','gmux','-f',conf, ...])` | `execFile('/usr/bin/ssh', ['-o','BatchMode=yes', host, 'tmux','-L','gmux', ...verb])` |
| Control, the event bus | Local `tmux -C new-session -A -s gmux-control` child | `ssh host tmux -L gmux -C new-session -A -s gmux-control` over pipes, identical bytes |
| Attach, visible panes | node-pty spawns the bundled tmux attach | node-pty spawns `ssh -t host tmux -L gmux -u attach-session -t =name` |

Consequences that are settled by this choice:

- The bundled macOS 3.7b never meets a distro tmux. The remaining version question is Tortie's
  control-mode parser against the remote tmux's dialect. That is a per-version measurement, made
  the Phase 41 way, before any version is trusted. Section 7 prices it and names the unresolved
  posture choice, being a tested list versus a measured floor.
- The conf file does not travel. Remote servers boot with `-f /dev/null` so the remote user's
  `~/.tmux.conf` is never read, then every option of `resources/gmux-tmux.conf` is asserted by
  `set-option` commands from one shared constant list, so the file and the list cannot drift. The
  repair path already exists as `BOOT_SERVER_OPTIONS` in `src/main/sessions/core.ts`. The option
  re-assert runs on every "no server" detection, not only at machine confirm, so a reborn server
  never runs with a default `history-limit`.
- Remote PATH capture mirrors the local rule. Panes inherit PATH from the tmux client that created
  them, so once per connect Tortie runs the remote login shell for its PATH and writes it into the
  remote server env. This step is ordered before the first mutating verb after any connect or
  reboot, because the bare-name launch rule (Phase 12.7 F3) is only safe after it.
- One ssh ControlMaster per machine (`ControlMaster=auto`, `ControlPersist=60s`), control path
  under a short hashed `/tmp` name to respect the 104-byte unix socket limit. `ServerAliveInterval`
  and `ServerAliveCountMax` are set explicitly, because without them a tailnet drop is not an error
  but a hung pipe, and the control plane would sit in "healthy" for minutes. The exact values are a
  section 7 measurement.
- Exec verbs are at-least-once and the design says so. Sleep or a drop can freeze the reply after
  the remote command ran. Creation is safe under this because identity rides the `new-session` line
  itself as pane env, and the pane-env rescue that re-binds a marked but unclaimed session is
  ported to the exec plane at rung M4. The `@gmux-id` option stamp remains a second command, and a
  session identifiable only by pane env is the case the rescue exists for.

Rejected carriage alternatives:

| Alternative | Deciding reason |
| --- | --- |
| Forwarded unix socket, local bundled client | Every distro tmux is an untested wire pair, and the untested direction hangs rather than errors (measured, header of `src/main/tmux/version.ts`); the pair table becomes unbounded |
| In-process ssh library | Puts key handling and crypto inside a Tortie process; `/usr/bin/ssh` keeps authentication in the OS, the agent and the tailnet |
| mosh or Eternal Terminal as transport | mosh has had no release since 2022-10-31 and syncs visible state only; ET needs a remote daemon; both refused, mosh's doctrine kept |
| Tortie daemon on the remote | The rejected design of section 5 |

### 4.2 The machine object

A machine is a configuration row that names an execution target, so it takes the config overlay
template, never the settings store.

- `machines.json` beside `agents.json` under `<userData>/gmux/config/`. Row fields are `id`,
  `label`, `color`, `host`, `user` (optional), `port` (optional) and `remoteTmuxPath` (optional).
- Execution-bearing fields are `host`, `user`, `port` and `remoteTmuxPath`. Label and color are
  presentation. The row is confirmed by the `executionHash` pattern of `src/main/config/confirm.ts`,
  sealed outside the config directory via `src/main/config/seal.ts`. An invalid row is dropped whole
  with a visible error naming the field and the reason. A `conformance:machines` gate, sibling of
  `conformance:agents`, proves the hash moves for every execution-bearing field and for none of the
  presentation ones.
- `remoteTmuxPath` is resolved to an absolute path at confirm time by `command -v` over the exec
  plane, and the absolute path is what the hash binds. The honesty line is printed in Settings and
  in this document. The confirm gate seals which path runs. It can never seal the bytes at that
  path, on a machine full of agents with write access to the home directory. The Settings field is
  not labeled with tmux vocabulary; it sits behind an advanced disclosure with a plain label.
- Refusal 8, exactly. Writing a machine row starts nothing. Editing one invalidates its hash and it
  stops working until re-confirmed. The first ssh process for a machine spawns on the person's own
  click in Settings, out of band of any agent turn. Reconnect on wake is written into the record
  now, so a later round cannot blur it. A reconnect traces to a standing confirmation plus a power
  event, never to a configuration change, and it stops the moment the hash is invalid. The boundary
  is between "reconnect on wake" and "connect on file write", and only the first is legal.
  - AMENDED BY PHASE 68, and the amendment is one word. This bullet used to say the first ssh
    spawns on the person's "confirm click". The build spawns it on their Test the connection click
    instead, which comes first in the same flow, because the hash a confirmation binds to covers
    the absolute program path and the machine has to report that path before there is anything to
    confirm. Measured in the live probe: the confirm click starts zero ssh processes, sampled at
    150 ms. The property this bullet is here to protect is unchanged, because the click is still a
    person's own click in Settings, out of band of any agent turn. The sentence moved to match the
    code rather than the code moving to match the sentence, and that choice is deliberate: making
    the confirm click spawn a second ssh would add a connection nobody asked for.
- Discovery. The Add Machine picker offers names from `tailscale status --json`, run from a pinned
  absolute path resolved and shown at pick time, never a bare name served by PATH, because a
  planted binary earlier on PATH is exactly the attack the confirm gate exists for. Enumerating
  `~/.ssh/config` is not the source. The operator's config holds exactly 1 Host entry and it is an
  unrelated IP. Manual entry remains for hosts off the tailnet.
- Keys. Tortie writes no keys, no passphrases and no ssh config, on either machine, ever.
  Authentication is the user's ssh agent, config and tailnet. Tailscale SSH makes the whole key
  question disappear for this operator.
- Host keys. AMENDED BY PHASE 68, because the original bullet promised something the interactive
  connection test cannot deliver and the first build broke the promise in practice. It said Tortie
  writes no known_hosts entries ever. Answering ssh's own host key question IS a known_hosts write,
  by definition, so the two halves of that bullet contradicted each other. The first build passed
  `StrictHostKeyChecking=ask` and named no file, ssh used its default, and answering the question in
  Tortie added three lines to the operator's `~/.ssh/known_hosts`. Measured read only at 932 bytes
  before a probe run and 1229 bytes after.
  - What is true now. The command names two files with `UserKnownHostsFile`. First is a file inside
    Tortie's own data directory, `<userData>/gmux/machines/known-machines`, and being first is what
    makes it the only file a new key is ever added to. Second is the person's `~/.ssh/known_hosts`,
    read and never written, so a machine they have known for years whose key has since changed still
    raises the alarm on Tortie's first contact instead of looking like a machine nobody has met.
  - Measured against a scratch sshd on 127.0.0.1. A new key wrote 99 bytes to Tortie's file and 0
    bytes to the second. A wrong key placed in the second file produced REMOTE HOST IDENTIFICATION
    HAS CHANGED and left that file byte for byte as it was. A full ten step probe run left the
    operator's file at 1229 bytes, unchanged.
  - So the promise, in the words it can be kept in: Tortie never adds a line to any file in the
    person's home directory. `build/conformance-machines.mjs` reads the argv and fails when the
    option is missing, when either file is missing from it, when the order is reversed, or when
    Tortie's path is unquoted. The Machines section says all of this on screen, in
    `HONESTY_OWN_RECORD`.
- The one interactive moment. Steady state runs `BatchMode=yes` so broken auth fails fast. First
  contact may need a host-key answer, and that belongs to setup. The Add Machine flow runs one
  visible connection test in a small terminal view inside Settings, the user answers ssh's own
  prompt there, and that is the last time ssh vocabulary is on screen. Tortie never proxies or
  stores the answer.
- The failure vocabulary. A small error taxonomy maps ssh stderr classes to plain copy, golden-filed
  per tested remote version. An expired key, an ACL change and a dead machine may share calm
  "unreachable" copy. A changed host key may not. ssh is warning about possible interception, and
  that case gets its own alarming state, never calm copy.

### 4.3 Durability truth and the manifest

Durability truth lives in each remote machine's own tmux server, beside the processes. The Mac app
was already a disposable client to one server and becomes a disposable client to five. When the Mac
sleeps or quits, remote agents keep running and remote tmux keeps absorbing their output
server-side, which is the attach host's designed failure mode today.

The one local manifest gains a `machine_id` column on session rows, one migration. There is no
remote manifest, no sync protocol and no remote store of Tortie state. What the manifest can promise
about a machine it cannot reach:

| Fact | Promise level |
| --- | --- |
| Created on machine M with this argv, cwd and env names | Full; written locally at create time. The local `existsSync(cwd)` check is skipped for remote rows because `-c cwd` is evaluated server-side |
| Absolute agent binary path | Per-machine only; captured by `command -v` over the exec plane at create, meaningful on machine M and nowhere else. Phase 49 already made install facts per-machine facts |
| Alive right now | Only through that machine's live control plane; never asserted while unreachable |
| A resume id that continues the conversation | Degraded and labeled; harvest is connected-only polling, and provenance (Phase 21) records the weaker source so restore refuses rather than pretends |
| Scrollback capsule | Connected-only, link-bounded cadence; every capsule shows its capture time, and a capsule can be hours old |

Env passthrough keeps the migration 011 discipline with one relocation. Values are probed fresh
from the REMOTE login shell, because they are the remote machine's secrets, and Mac-side values
never travel to a remote command line. The byte path of a value from the remote probe to the remote
`new-session` line is a section 7 trace, and if the value would transit the Mac process or the
remote `ps` output, composition moves fully to the remote side.

### 4.4 Status truth, G9 gets its producer

The rule in one sentence. Only a completed `list-sessions` over a machine's live control plane may
flip that machine's rows to `restorable`, and every transport event writes `unknown`.

| Event | Row status | Restore verb | Evidence recorded |
| --- | --- | --- | --- |
| Control plane healthy, session in list | Live statuses as today | Not offered | Reconcile pass |
| Control plane healthy, session absent | `restorable` | Offered (from M5) | Which pass, at what local receipt time |
| Link drops, times out, or the master dies | `unknown` for every row on that machine | Disabled, reason "machine unreachable" | Transport error class |
| Mac resumes from sleep | All remote rows `unknown` until the first reconcile completes | Disabled until then | Power event |
| Transport up, remote server not running | `restorable`, because "no server" from a reachable machine is evidence | Offered (from M5) | The taxonomy distinguishes "connection refused" from "server has no sessions" |
| `%exit` on a live control plane | Exited flow as today | Per existing rules | Control-mode event |

Three details the adversaries forced, kept here so they are not lost:

- The discrimination between "sshd refused" and "tmux said no server" is parsing ssh exit 255
  against the remote command's own exit and stderr. It is doable and fragile, and it is golden-filed
  per tested remote tmux version before the control plane ships.
- Clock skew rules. `snapshotAt` is taken before the ssh exec is issued, never on receipt, or the
  round trip flips just-created sessions. Remote mtimes are compared only with other remote mtimes.
  Every "last seen" fact is stamped with local receipt time.
- `unknown` is machine state presented as the machine dimming its sessions, never a new
  session-behavior status, so the fixed status semantics hold. It is never "needs input".

M0 gives `unknown` its producer at the reconcile boundary and disables restore while unreachable.
Whether the local socket adopts the same boundary in the first cut is a small open decision; on the
local box, socket unreachability and server death are the same box, so current behavior is
defensible there and only there.

### 4.5 The agent layer across the wire, honestly

The Phase 48 finding generalizes. Every differentiator that reads a disk must run where the disk
is, or say that it did not run.

| Facility | Remote answer | Label shown |
| --- | --- | --- |
| Launch and create | Full; remote PATH capture, `command -v` for the manifest path, `-e KEY=value` on the remote new-session line | None needed |
| Needs input and status oracles | Work while connected, silent while not | Copy says "while connected"; whether an oracle re-derives the waiting state from the screen on reattach is a section 7 measurement per oracle family |
| Preflight (`src/main/agents/health.ts`) | Thin remote check at create, `command -v` plus `test -x` | "Basic check only" until a measured exec-plane probe lands |
| Install map (Phase 49) | Not collected at first | "Not collected for this machine" |
| Harvest and resume ids | Connected-only polling of known store paths, low cadence; the registry knows the patterns for all 13 agents | Provenance records the weaker source; restore obeys the row |
| Restore | Recreate over the exec plane with the row's per-machine argv, capsule replay, resume armed only when provenance clears the Phase 21 bar | A remote restore may recreate the shell and cwd and decline to arm resume, saying why |
| SpecStory capture | Not available remotely under this design | Plain label on remote sessions |
| Explorer, SCM, search, editor | Not available for remote projects, not faked | "Files live on <machine>"; the review gap is named in sections 6 and 8 |
| Image drop | Deferred to M6 via one exec-plane write | Deferred |

### 4.6 The durability promises, stated out loud per failure case

These are the sentences the product prints, decided now so the copy cannot drift into overclaim.

| Failure | What actually happens | The promise printed |
| --- | --- | --- |
| The Mac sleeps mid-anything | Remote agents keep running; remote tmux absorbs output; an in-flight create is re-bound by the pane-env rescue at the next reconcile | "Your remote sessions kept running. Snapshots resume when this Mac reconnects." Capsules show their capture time |
| The tailnet drops for 40 seconds | Every row on that machine goes `unknown`; restore and input are disabled; nothing flips to `restorable`; needs-input transitions during the gap are gone, not queued | "Machine unreachable. Your sessions are untouched; Tortie just cannot see them." |
| A remote machine reboots | After a completed "no server" probe over a live transport, rows become `restorable`; PATH capture and option re-assert run before any mutation; the newest resume id may predate the reboot | "Resume may be older than the last thing you watched. The row shows what it can promise." |
| Two Macs point at one machine | The second Mac sees marked sessions its manifest never issued, reports them and never adopts or kills them; restoring from two Macs can double-run one conversation and no guard exists anywhere today | "Sessions belong to the Mac that created them. A second Mac is a spectator." The double-run gap is a section 7 decision |
| Something creates a session remotely while the Mac is away | Impossible for Tortie sessions; raw sessions created by hand are listed as not ours forever | The first-run copy of section 0 |
| The remote tmux is an unmeasured version | The machine is refused before first attach with a screen naming the found version, the supported set, and the upgrade command the user can run himself | Phase 41's refusal screen with the remedy attached |
| Clocks disagree between machines | No liveness judgment ever compares a remote clock with a local one | Nothing to print; the rule is internal |
| A machine dies forever | Rows sit at `unknown` until the person uses the forget-machine gesture, which converts them to tombstones; capsules are local, so Past Sessions keeps the scrollback at last-capture staleness; conversations die with the remote disk | "Forgetting this machine keeps the story of its sessions. The conversations on it are gone." |

The last row is a genuine advantage of the thin design over the rejected one. Because capsules live
on the Mac, a dead machine leaves its scrollback behind. Under the Host design the manifest, the
capsules and the attention history would all die with the machine.

---

## 5. The verdict table

| Design | Verdict | Deciding reasons |
| --- | --- | --- |
| Thin attach, this document | Build | Zero remote install; no version lattice beyond one measured dialect axis; durability already lives in the right place; plugs into `AttachHostOptions`, the control-client line protocol and the confirm gate as they exist today; first operator value in the M0 to M3 slice |
| Headless Tortie Host per machine | Rejected for now, kept as a possible later tier | Both adversaries wounded it. Its unattended claims (checkpoints, attention history, partition-proof harvest) are true only with a resident daemon the design made optional, hand-installed and hand-updated on four machines, against the Zen's own "no server to tend". Its "duplicate agent impossible by construction" claim is false under spawn-on-connect, where two Macs mean two Hosts on one manifest with separate in-memory locks. Its "version question stays home" claim moved the parser-dialect matrix without removing it. Its first phase is 2 to 4 weeks of extraction refactor with no visible feature, priced from an import census rather than a spike. And in the total-loss case it keeps less than the thin design, because truth dies with the machine |
| Forwarded socket, local bundled client | Rejected | Unbounded untested wire pairs that hang rather than error |
| In-process ssh library | Rejected | Crypto and key temptation inside a Tortie process |
| mosh or ET transport | Rejected | Abandoned or daemon-requiring; doctrine kept |
| Any relay or broker, hosted or self-hosted | Rejected permanently | Research 28's standing rule, reaffirmed against Happy and VS Code Tunnels |
| Any sandbox or rented fleet | Rejected permanently | Research 28's vendor table, unchanged |

What the rejected Host design alone could ever deliver, recorded so the deferral is honest: harvest
read beside the store files, oracles beside the process with attention history across gaps, a
checkpoint timer on a machine that does not sleep, and a pinned Linux tmux shipped in its tarball.
If those become worth four hand-tended daemons, the machine profiles, the confirm gate and the
attach seam built here are its groundwork, not its rework.

---

## 6. The phase ladder

Sizes are S, M, L. Tiers follow the CLAUDE.md rules; everything touching durability or claiming
universality is Tier 3.

| Rung | Contents | Size | Tier | Gate before it |
| --- | --- | --- | --- | --- |
| M0 | `unknown` gets its producer at a per-machine reconcile boundary; restore disabled while unreachable; machine-level Unreachable presentation. This fixes a live local defect and is worth shipping even if remote stops here | M | 3 | None |
| M1 | `machines.json`, confirm gate and seal, `conformance:machines`, Settings surface, tailscale picker from a pinned absolute path, the one visible connection test | M | 2 plus the conformance gate | M0 |
| M2 | `MachineContext` replaces the singleton; exec plane over ssh with the at-least-once discipline; remote server boot with `-f /dev/null` plus command-asserted options; PATH capture ordered before first mutation; version probe and refusal screen with remedy; error taxonomy golden files; keepalive values set from measurement | L | 3 | M1, plus the dialect measurement for the versions the four machines actually run |
| M3 | Attach over `ssh -t` in node-pty; create, kill and rename remote; machine badge; session list by exec-plane polling; restore refused for every remote row with a visible "coming" label; vocabulary audit. First visible operator value | L | 3 | M2 |
| M4 | Control plane per machine replaces the poll; per-machine reconcile; `machine_id` migration; the section 4.4 case table live; pane-env rescue over the exec plane; partition harness in the spirit of `smoke:fault` | L | 3 | M3 |
| M5 | Remote restore enabled; per-machine argv capture; capsule replay; provenance-gated resume arming; forget-machine tombstone; the ten-row fault matrix from research 28 executed against a real tailnet machine | M | 3 | M4, fault matrix green |
| M6 | Connected-only harvest polling; remote env value probe with the traced byte path; image upload; a read-only remote review answer, being repository state read over the exec plane into the existing diff surfaces, priced at this rung rather than promised | M | 3 for harvest, 2 for the rest | M5 |

Two sequencing notes, because the adversaries pulled in different directions here and section 8
records the disagreement:

- M0 is unconditional and first. Both adversaries agreed no remote verb ships before `unknown` has
  a producer.
- Restore-less attach at M3 lands before the full partition harness at M4. The hazard that
  justified putting status machinery ahead of everything fires only through the restore verb, and
  M3 refuses that verb for every remote row. This moves operator value from rung five to rung
  three. The cost is that M3's status display runs on polling and shows `unknown` coarsely; the
  copy at M3 says so.

The parity cap of the scope guardrail is respected. Nothing in this ladder builds IDE furniture for
remote machines. The M6 review item reuses existing diff surfaces over the exec plane or it does
not happen.

---

## 7. Open questions blocking a build, each priced

| # | Question | What it blocks | Price |
| --- | --- | --- | --- |
| 1 | The dialect posture. Tested list (`TESTED_REMOTE_TMUX_VERSIONS`) or measured floor. A list refuses a machine after a routine `pacman -Syu`; a floor needs evidence that the parser degrades safely above it. Measure the bundled parser against 3.2a, 3.3a and 3.4 (the likely spread on Ubuntu 22.04, Debian 12 and Ubuntu 24.04) plus whatever the four machines actually run | M2 | 1 to 2 days for a harness, about half a day per version after; the posture choice itself is the expensive part because a list is a recurring per-release cost |
| 2 | The error taxonomy golden files, ssh exit 255 against remote exits and stderr, including the host-key-changed alarm case | M2 | About 1 day per tested ssh and tmux combination |
| 3 | Keepalive and ControlMaster behavior over tailscale ssh, dead-peer timing, master death detection | M2 and M4 | Half a day of measurement on the operator's own tailnet |
| 4 | The env value byte path. Does a passthrough value transit the Mac process, the ssh argv, or remote `ps` output on the way to `new-session -e` | M3 creates with passthrough | Half a day to trace; 1 to 2 days if composition must move remote |
| 5 | Oracle re-derivation. Per oracle family, does a fresh attach after a gap re-produce "needs input now" from the current screen | The honesty of the M3 copy | About 1 day across the 13 agents' oracle families |
| 6 | The cross-Mac double-run. Accept and document, or add a claim marker in the tmux server that a second Mac's restore checks | M5 copy | A decision, or 2 to 3 days for a server-side claim option |
| 7 | Interactive attach latency over the tailnet. Research 28's figures were typical-path estimates, never measurements | M3 acceptance | Half a day with the four machines |
| 8 | Whether the local socket adopts the M0 reconcile boundary immediately or keeps current behavior in the first cut | M0 scope | A decision inside the M0 brief |
| 9 | Agent store path patterns on Linux for the 13 agents, for connected-only harvest | M6 | 1 to 2 days on one real Linux box |

---

## 8. What is not true

**What the design can never do, by its own choice:**

- No attention while the Mac is closed or asleep. No Tortie process exists off the Mac. Needs-input
  signals stop at the last connected moment, and every piece of copy says "while connected".
  Closing this permanently requires software beside the remote process, which is the rejected
  design at its full price.
- No local-grade conversation resume for remote sessions. Connected-only harvest can miss the
  newest resume id written during a partition. Provenance labeling makes this honest; nothing makes
  it equal. In the Zen's own terms, remote sessions get table stakes, being a recovered process,
  and not always the promise, being a conversation that resumes. That sentence is the headline
  honesty line of this document, not a footnote.
- No migration of the operator's existing sessions. The raw tmux sessions on his four machines
  carry no `@gmux-id` and no pane stamp, and the house rule that unmarked sessions are never
  adopted is absolute. Day one shows four reachable machines and none of his current work. He
  recreates sessions inside Tortie. This is first-run copy.
- No IDE for remote projects, and no SpecStory capture on remote sessions.
- No truth about an unreachable machine. `unknown` is the ceiling, and a genuinely dead remote
  session stays un-restorable until the machine is reachable again or the person forgets it.
- No roaming between Macs, and no guard today against two Macs double-running one conversation.
- No non-tmux remotes. Windows hosts and tmux-less boxes are out of scope.

**Unverified claims, stated plainly:**

- No ssh connection was opened this round. Every remote mechanism above is designed against
  documented ssh and tmux behavior, not measured end to end. The M2 gate exists because of this.
- The minimum tmux version for control mode was not established from a primary page. Control mode
  dates to tmux 1.8 by prior knowledge only, and no Linux tmux version has been measured against
  the parser in either direction.
- The distro version spread (3.2a on Ubuntu 22.04, 3.3a on Debian 12, 3.4 on Ubuntu 24.04) is prior
  knowledge, not a live fetch, and the four machines' actual versions are unknown.
- Licenses in the field survey marked as prior knowledge in the field scan (WezTerm MIT, Zellij
  MIT, Eternal Terminal Apache 2.0, iTerm2 GPLv2, the VS Code server terms) were not fetched.
- ControlMaster multiplexing and keepalive behavior over tailscale ssh are untested.
- Latency figures for remote attach are inherited estimates from research 28, not measurements.
- Whether each needs-input oracle is level-triggered from screen content is asserted per family,
  not measured.
- The claim that the pane-env rescue makes at-least-once creation safe assumes the rescue ports to
  the exec plane cleanly; that port has not been prototyped.

**Where the two adversaries disagreed, presented as disagreement:**

- Sequencing. The scenario adversary held that no remote verb should ship before the full status
  machinery, including the partition harness, matching research 28's A to C gate. The product
  adversary held that restore-less attach is safe by construction because the duplicate-agent
  hazard fires only through the restore verb, and that omitting restore collapses the path to
  operator value by two rungs. This document takes the product adversary's ordering, keeps M0
  unconditional and first as both demanded, and accepts the cost that M3's status display is
  coarse. If a way is found for a non-restore verb to act on stale truth destructively, the
  ordering reverts.
- The worth of the Host design. Its own author called the thin design "an excellent v0" and the
  two designs non-conflicting. The scenario adversary called the Host wounded but repairable. The
  product adversary called it not approvable as written until the residency contradiction is
  resolved, and priced its steady state as four hand-tended servers against the Zen's "no server to
  tend". This document sides with the product adversary on the verdict and with the author on the
  groundwork claim, being that machine profiles and the attach seam carry forward if the Host is
  ever built.
- The one-rail question. The Host author ruled one machine per project tab, after research 28. The
  product adversary observed that the same repository on four machines then becomes four tabs,
  which organizes the rail by machine and turns it into a fleet console. This document prefers one
  rail with a machine badge on sessions, and treats project-level locus as a presentation decision
  to be settled in the M3 design review, not a rule inherited silently.

**Assumed, and stated as assumption:**

- The operator's machines can run a tmux version the parser gets measured against.
- `BatchMode=yes` auth succeeds steady-state on his tailnet, which Tailscale SSH makes true without
  Tortie handling any key.
- The renderer can present machine unreachability by dimming sessions without adding a new
  session-behavior status, keeping the fixed status semantics intact.

---

Key paths for the build phases: `src/main/tmux/supervisor.ts`, `src/main/tmux/control-client.ts`,
`src/main/tmux/resolve.ts`, `src/main/tmux/version.ts`, `src/main/attach/attach-host.ts`,
`src/main/manifest/reconciliation.ts`, `src/main/sessions/core.ts`, `src/main/config/confirm.ts`,
`src/main/config/seal.ts`, `src/main/shell/argv.ts`, `src/shared/types.ts`,
`src/shared/restore-status.ts`, `docs/research/28-remote-sessions.md`,
`docs/research/33-durability-reconciliation.md`, `docs/research/43-bundled-tmux.md`.
