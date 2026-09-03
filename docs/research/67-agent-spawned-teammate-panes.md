# Research 67. Agent-spawned teammate splits

**Date:** 2026-08-26  
**Status:** Decision-ready feasibility research  
**Scope:** Local Tortie/gmux sessions first. Remote machines, background Host operation, and provider-native adapters are evaluated separately.  
**Question:** Can an agent running in Tortie safely create a teammate in a new visible split, how should that request cross Tortie's IPC boundary, and what useful work would the capability unlock?

---

## 1. Decision

**Proceed, but do not let agents call tmux directly.**

The generic capability is highly feasible because Tortie already ships both halves of the operation:

1. a durable, manifest-first `createSession` path; and
2. an app-side split tree whose leaves are ordinary Tortie sessions.

The missing piece is a narrow, authenticated agent-to-Tortie request path. The right v1 is a bundled `tortie teammate spawn` CLI talking to a Host-shaped broker in Electron main over a user-only Unix-domain socket. A per-session capability identifies the parent and authorizes only a bounded `teammate.spawn` operation. Main creates the child through the existing session core, records parent/child provenance, and asks the renderer to place the new session beside the parent. If the renderer is absent, full, or crashes, the child remains a valid ordinary Tortie session; only its presentation is deferred or falls back to its own surface.

The feasibility is not uniform:

| Capability | Feasibility now | Confidence | Why |
| --- | --- | --- | --- |
| Any enabled agent requests a same-project teammate through a Tortie CLI/tool | **High** | High | Reuses the complete create path and existing split model; only the broker, policy, provenance, and placement intent are new |
| Claude Code's native agent teams appear as Tortie splits | **Medium-high, experimental** | Medium | Claude documents tmux/iTerm2 split adapters, and cmux proves emulation works; the mode is experimental and its behavior changes between releases |
| Codex native subagents appear as independently interactive Tortie splits | **Medium, experimental** | Medium-low | OpenAI exposes structured multi-agent identities and events, but attaching CLI subagent threads to separate terminals currently depends on a changing app-server integration |
| An agent requests a teammate after Electron has quit | **Not available in v1** | High | tmux survives, but the session core, hook server, manifest authority, and renderer do not; the planned background Tortie Host is the proper solution |
| A remote agent requests a local or remote teammate | **Feasible later** | Medium | Tortie can already create remote sessions, but a safe return channel and cross-machine capability scope need their own protocol and threat-model work |
| Raw `tmux split-window` inside an agent | **Technically easy, architecturally wrong** | High | It bypasses manifest declaration, durable identity, launch policy, renderer layout, provenance, quotas, and user consent |

The product claim should therefore be narrow:

> An explicitly enabled Tortie session may ask Tortie to create a bounded number of durable teammate sessions in the same project. Tortie shows them beside the parent when space and a live renderer permit.

Do not claim that Tortie supplies the agents' task graph, mailbox, result synthesis, or write isolation. Provider-native teams may supply those. Tortie's contribution is trustworthy process creation, durable identity, visibility, direct interaction, and lifecycle evidence.

---

## 2. The important distinction: a teammate is not a pane

The current state of the art separates three concerns that are easy to conflate:

| Concern | Owns | Examples |
| --- | --- | --- |
| Agent orchestration | delegation, context, messages, task dependencies, results, cancellation | Claude Code agent teams; OpenAI Multi-agent |
| Process/session hosting | command launch, environment, cwd, persistence, process lifetime, terminal attachment | Tortie session core; tmux; cmux |
| Presentation | where the session is shown, split direction, focus, sizing, regrouping | Tortie renderer split tree; iTerm2, WezTerm, Zellij, cmux panes |

Claude Code makes the distinction visible: teammates are independent Claude instances with their own contexts and mailbox/task coordination, while “in-process” and “split panes” are alternative display modes for those teammates. Its current default is in-process; the split mode is optional and requires tmux or iTerm2. [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)

OpenAI's Multi-agent beta is even more explicitly UI-agnostic. It supplies hosted `spawn_agent`, messaging, follow-up, wait, interrupt, and list actions; each action and agent message has structured identity in the response stream. Nothing in that orchestration contract requires a terminal pane. [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)

This leads to the central design rule:

> Session creation must be correct without a split, and split placement must never be the proof that a teammate exists.

That rule fits Tortie's existing architecture. It also avoids making a renderer crash, a six-leaf layout limit, or a hidden window look like an agent-spawn failure.

---

## 3. What Tortie already has

### 3.1 The working in-repo sibling

The closest existing behavior is `splitSession` in [`src/renderer/terminal/terminal-menu.ts`](../../src/renderer/terminal/terminal-menu.ts#L71). It:

1. records the existing session IDs;
2. calls `quickCreate(session.agent)`;
3. identifies the newly created ordinary session; and
4. calls `useLayout.splitWith(projectPath, parentId, 'right', childId)`.

That is almost the desired operation. Agent spawning should match this sibling, with one intentional difference: **an agent-originated child must not steal focus from the human**. The current `splitWith` selects the new leaf at the end. The agent path needs a non-focusing placement action or option.

### 3.2 A split is already presentation over durable sessions

The layout store states the boundary directly: split leaves remain independent tmux-backed sessions, while the manifest and tmux layer never learn about split groups. Layout is presentation state in `localStorage`; losing it costs pixels, not sessions. See [`src/renderer/state/layout.ts`](../../src/renderer/state/layout.ts#L1) and [`src/renderer/state/split-tree.ts`](../../src/renderer/state/split-tree.ts#L1).

The split tree already supplies:

- stable session IDs as leaf IDs;
- left, right, top, and bottom placement;
- group reconciliation when sessions disappear;
- persisted ratios and remembered focus;
- a six-leaf maximum; and
- a fallback surface for every valid session not claimed by a saved layout.

Research 52 independently established that the project is the primary unit of work and the UI selects **surfaces**, where a surface is either one session or a split group. It also measured five live non-shell agents in each of two projects and a historical peak of six, so multi-session projects are already real usage rather than a hypothetical workflow. [`52-unit-of-work.md`](52-unit-of-work.md)

### 3.3 The durable create path is the asset to preserve

The renderer's typed request currently follows this route:

```text
renderer quickCreate
  -> window.gmux.sessions.create
  -> preload invoke('sessions:create')
  -> ipcMain handler
  -> GmuxCore.createSession
  -> MutationLedger.admit
  -> createLocalSession
```

The contract is visible in [`src/shared/ipc/base.ts`](../../src/shared/ipc/base.ts#L36), [`src/preload/sessions.ts`](../../src/preload/sessions.ts#L16), and [`src/main/ipc.ts`](../../src/main/ipc.ts#L88).

The core then performs the load-bearing work:

1. validate the project/machine/capture/agent request;
2. resolve the compiled agent launch plan and environment;
3. compose the complete manifest record;
4. insert the manifest row **before** spawning;
5. create the private tmux session;
6. bind the immutable tmux ID to the manifest UUID;
7. stamp `@gmux-id`, `@gmux-agent`, and the protected pane environment;
8. start provider-ID harvesting and launch-context capture; and
9. broadcast a fresh complete session projection.

The declaration-before-spawn ordering is explicit in [`src/main/sessions/create-local.ts`](../../src/main/sessions/create-local.ts#L489). The shutdown-safe mutation gate is explicit in [`src/main/sessions/mutation-ledger.ts`](../../src/main/sessions/mutation-ledger.ts#L1).

An agent-originated teammate must enter at `GmuxCore.createSession`, not below it.

### 3.4 Tortie already has a hardened process-to-main precedent

The Claude activity hook server in [`src/main/activity/hooks.ts`](../../src/main/activity/hooks.ts#L1) demonstrates that an agent process can safely reach Electron main without renderer IPC. It uses:

- loopback-only binding;
- a random 128-bit token per session;
- a token-to-session map and revocation;
- method, path, and `Host` validation;
- bounded body size and connections;
- no prompt-body logging; and
- stable per-session settings that are rewritten to the current port after app restart.

This is a useful security and restart precedent, but not the protocol to reuse unchanged. Hooks are advisory latency hints and may be dropped. Spawning a process is a durable mutation and requires an authenticated response, idempotency, quotas, audit, explicit errors, and shutdown admission.

### 3.5 The current tmux control client is not the public agent API

Tortie's long-lived control-mode client is an internal event bus. It sends normal tmux commands and receives `%sessions-changed`, rename, window, disconnect, and reconnect events, with pane output suppressed. [`src/main/tmux/control-client.ts`](../../src/main/tmux/control-client.ts#L1)

That use follows tmux's intended control-mode model: standard commands plus asynchronous notifications over a text protocol, with immutable IDs strongly recommended. [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode)

It should remain internal. Research 65 reached the relevant security conclusion: knowing the private tmux socket well enough to list sessions also grants the ability to `send-keys`; publishing the address publishes a write surface with no Tortie policy gate. [`65-plugins-reconsidered.md`](65-plugins-reconsidered.md)

---

## 4. Why direct tmux spawning fails Tortie's model

An agent already running inside Tortie's private tmux server can probably execute `tmux split-window` or `tmux new-session`. That proves mechanism, not product feasibility.

### 4.1 `new-session` creates a foreign object

A directly created tmux session lacks a valid manifest row, `@gmux-id`, protected `GMUX_SESSION_ID`, recorded launch argv, restore argv, provider identity, capture declaration, and launch context. Tortie's ownership rule deliberately refuses to adopt or kill a live session carrying neither durable identity stamp. Allowing an agent to add a guessed stamp would turn the identity boundary into spoofable metadata.

### 4.2 `split-window` violates the one-screen-per-session assumption

Today, one Tortie session is one tmux session with one active screen. Renderer splits compose multiple **Tortie sessions**, not multiple panes inside one tmux session. Research 64 records the same assumption after finding no `split-window` use in main. [`64-agent-dropped-to-shell.md`](64-agent-dropped-to-shell.md)

A raw tmux pane would be absent from:

- the manifest and restore model;
- the renderer session list and split tree;
- attention and provider-ID tracking;
- terminal attach/detach ownership;
- snapshots and Past Sessions;
- naming and project grouping; and
- lifecycle and error UX.

### 4.3 Raw tmux is overpowered

The needed authority is “create up to N same-project teammate sessions using compiled launch adapters.” The tmux socket grants far more: type into any managed session, kill sessions, change options, retarget clients, and create untracked objects. It cannot express Tortie's user intent or resource budget.

The tmux server should remain the PTY/process substrate. Tortie's session core should remain the mutation authority.

---

## 5. Recommended IPC and authority model

### 5.1 Shape

Add a small bundled CLI and a Host-shaped control broker:

```text
enabled parent agent
  -> tortie teammate spawn --name reviewer --task-file ...
  -> user-only Unix socket
  -> authenticate per-session capability
  -> validate policy + reserve idempotency key
  -> GmuxCore.createSession(existing durable path)
  -> persist parent/child request outcome
  -> broadcast sessions:changed
  -> publish pending placement intent
  -> renderer places child beside parent without focus
```

The broker can initially live in Electron main, but its interface should not import Electron or renderer types. Research 26 already recommends this exact staging for the eventual Host: establish the protocol boundary in main, then move the same authority into a signed user-level helper after fault tests prove it. [`26-tortie-durability-architecture-and-recovery.md`](26-tortie-durability-architecture-and-recovery.md)

### 5.2 Transport

Use a Unix-domain socket under Tortie's private user-data/control directory, with owner-only permissions and a fixed discoverable path. The child receives protected variables similar to:

```text
TORTIE_CONTROL_SOCKET=/private/user-owned/path/control.sock
TORTIE_SESSION_CAPABILITY=<random per-session secret>
TORTIE_SESSION_ID=<manifest UUID>
```

Tortie, not user or project configuration, must overwrite these names at spawn. Never put the secret in command-line arguments or logs. Persist enough capability state in a user-only control file to re-register a surviving session after Electron restarts; do not serialize the secret into the session manifest's general environment field.

This is capability scoping, not a same-user sandbox. A sufficiently hostile process running as the user can inspect another process, read user-owned files, or deliberately copy a bearer token. Socket permissions alone cannot change that. The security gain is that an ordinary enabled agent receives one project- and budget-scoped Tortie action instead of the private tmux socket's unrestricted write authority. Where the platform exposes reliable peer-process identity, descendant-of-parent-pane ancestry is worthwhile defense in depth, as cmux's default mode demonstrates, but correctness must not depend on ancestry surviving shells, wrappers, and provider subprocesses.

The external exemplar is cmux. Its CLI uses a Unix socket plus inherited workspace/surface IDs; managed `CMUX_*` identity and socket variables win over workspace overrides. Its socket supports access modes from off through ancestry-only, same-user automation, password, and unsafe full access. [cmux CLI contract](https://github.com/manaflow-ai/cmux/blob/main/docs/cli-contract.md), [cmux socket API](https://manaflow-ai-cmux.mintlify.app/automation/socket-api), [cmux environment variables](https://manaflow-ai-cmux.mintlify.app/automation/environment-variables)

Tortie should extract contextual identity and machine-readable request/response handling, but intentionally diverge in two ways:

1. grant only a per-session `teammate.spawn` capability rather than a general terminal-control API; and
2. route creation through manifest-first session creation rather than treating a pane as the durable object.

### 5.3 Request contract

Use a versioned, length-bounded JSON-RPC-style request. A v1 method needs only:

```json
{
  "id": "caller-generated-idempotency-key",
  "method": "teammate.spawn",
  "params": {
    "name": "reviewer",
    "agent": "same-as-parent",
    "task": "Review the authentication boundary",
    "side": "right"
  }
}
```

The server derives the parent session, project, cwd policy, machine, budget, and permission from the capability. The caller must not be able to provide or override them.

Return structured outcomes:

```json
{
  "ok": true,
  "requestId": "...",
  "childSessionId": "...",
  "placement": "applied|pending|separate-surface"
}
```

Typed refusals should distinguish at least: disabled, expired/revoked capability, parent ended, app unavailable, shutdown in progress, budget reached, unsupported agent adapter, invalid task/name, project mismatch, remote unsupported, provider version unsupported, and launch failure.

### 5.4 What v1 must not accept

Do not expose the renderer's general `CreateSessionInput` to the agent. In particular, reject or omit:

- arbitrary executable or argv;
- `extraArgs` supplied by the agent;
- arbitrary environment variables;
- arbitrary cwd or project path;
- `startAnyway` health-check bypass;
- local/remote machine selection;
- raw tmux targets, IDs, or commands; and
- focus, close, kill, type, or `send-keys` authority.

`task` is data for a compiled provider adapter, not a shell fragment. Each supported agent adapter must construct argv itself and be version-gated. A shell teammate can be a separate explicit capability later; it should not fall out of an empty `agent` field.

### 5.5 Capability policy

The safest initial user gesture is:

> Allow this session to create up to 3 teammates in this project until it ends.

Recommended v1 policy:

- off by default;
- enabled by a human outside the agent turn;
- parent session and project scoped;
- local machine only;
- maximum three concurrently live children;
- depth one: children cannot themselves spawn;
- same compiled agent kind as the parent by default;
- cwd fixed to the project or parent cwd after normal validation;
- no focus steal;
- capability revoked when the session is removed or explicitly disabled;
- visible parent/child provenance and a remaining-budget indicator; and
- no automatic cascade kill when the parent exits.

The concurrency default aligns with OpenAI's recommended default of three active subagents, but it is a Tortie resource policy, not a claim that three is universally optimal. OpenAI places the bound across the whole descendant tree; Tortie v1 should be stricter by disallowing nesting. [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)

Kitty is the security exemplar here. Its remote-control system is off unless enabled and can issue distinct passwords restricted to named action sets, including per-window grants. [kitty remote control](https://sw.kovidgoyal.net/kitty/remote-control/)

Tortie's narrower capability should behave like a one-action, one-parent kitty password.

### 5.6 Consent and Tortie's existing refusal

`CLAUDE.md` already states that a configuration change alone may not start a process: a human must confirm the launch-deciding bytes outside an agent turn. Agent spawning is not merely a configuration reload, but it has the same underlying risk—an agent can multiply processes and cost.

The user gesture above is the durable authorization. It binds the allowed action, agent adapter, project, parent, limit, depth, and lifetime. It must not authorize arbitrary future executable bytes, and an agent-written settings file must not be able to enable it.

---

## 6. Ordering, persistence, and failure semantics

### 6.1 Correct mutation order

The broker should use this order:

1. frame and size check;
2. authenticate capability and derive parent;
3. re-read parent status and enabled policy;
4. validate the bounded semantic request;
5. reserve the idempotency key and budget slot transactionally;
6. call the existing mutation-ledger-protected session create;
7. commit parent/child provenance and request outcome;
8. broadcast the full sessions projection;
9. publish or persist the placement intent; and
10. answer the caller.

A retry with the same idempotency key returns the same child or the same terminal failure. It must never create a second session.

### 6.2 Provenance data

Do not overload tmux user options or layout `localStorage` as the system of record. Add a narrow manifest-side relationship/request record with fields conceptually equivalent to:

| Field | Purpose |
| --- | --- |
| `request_id` | idempotency and audit identity |
| `parent_session_id` | capability-derived origin |
| `child_session_id` | durable child, nullable until creation succeeds |
| `origin` | generic CLI, Claude adapter, Codex adapter |
| `adapter_version` | explain provider drift |
| `task_hash` and safe label | correlation without retaining full prompt text |
| `requested_side` | presentation intent, not process truth |
| `status` and typed error | visible failure, retry, and support evidence |
| `created_at` | ordering and forensic context |

The full task prompt is sensitive and generally already exists in the provider transcript. Store a hash and a short user-visible label unless a later recovery requirement proves the full text necessary.

Parent/child is provenance, not ownership. Ending or removing the parent must not silently kill the child. This preserves Tortie's durable-session model and avoids turning provider cleanup bugs into data loss.

### 6.3 Placement intents bridge main and renderer

The existing split action lives only in the renderer and expects both session IDs to be present. Agent requests originate outside that renderer. Add one append-only typed main-to-renderer event and a small pending-intent read/ack path.

The renderer should:

1. wait until parent and child are in its session projection;
2. verify they still share the project target;
3. verify the target group is below six leaves;
4. place the child without changing human focus; and
5. acknowledge the intent.

If the group is full, the parent is not currently rendered, or layout reconciliation rejects the operation, acknowledge `separate-surface` and leave the child as its own ordinary session. Do not roll back or kill a successfully created child because presentation failed.

Persisting the **pending intent** closes a renderer reload race. The final split tree can remain renderer-owned presentation state in v1. The eventual background Host work in research 26 separately recommends moving durable spatial state into a versioned Host-owned schema.

### 6.4 App lifetime

Today `window-all-closed` quits Electron. The hook receiver, manifest core, reconciler, harvesters, and broadcasts stop even though tmux processes survive. An agent calling the v1 CLI after quit should receive an immediate, honest “Tortie control service is not running” error. It must not fall back to raw tmux.

The eventual background Host changes this answer cleanly: it becomes the sole mutation authority, owns the stable socket and manifest, and lets a later renderer reconcile pending placement. Research 26 already specifies a versioned local protocol, idempotency keys, monotonic sequence numbers, and snapshot/delta reconnect. Agent spawning is a strong additional use case for that planned boundary, not a reason to rush it.

### 6.5 Remote machines

Remote creation already exists in Tortie's renderer-to-main path, but an agent on a remote machine does not automatically possess a safe route back to the local main process. Do not tunnel the private tmux socket or reuse SSH command authority implicitly.

A later remote design should bind the capability to:

- the confirmed machine record;
- the parent session's remote identity;
- one project target on that machine;
- a versioned remote Host/CLI protocol; and
- a remote-local request ID that remains idempotent across link loss.

Until that exists, v1 should return `REMOTE_UNSUPPORTED` even if the child could technically be launched by the existing remote create code.

---

## 7. State of the art

### 7.1 Comparison matrix

| System | Agent/process control model | Context and targeting | Authorization | What Tortie should learn |
| --- | --- | --- | --- | --- |
| tmux control mode | text protocol accepts normal tmux commands and emits async `%` notifications | immutable session/window/pane IDs; user options | OS access to socket | reliable PTY substrate and event stream, not a safe product-level agent API |
| WezTerm CLI | CLI talks to GUI or mux server and creates/manipulates panes | `WEZTERM_UNIX_SOCKET`, `WEZTERM_PANE`, optional explicit IDs | local process/socket access | inherited contextual targeting makes agent commands ergonomic |
| Zellij CLI | `zellij action new-pane`, target current or named session | current session or explicit `--session` | local process access | machine-driven pane creation is ordinary, but is still below Tortie's durable session layer |
| iTerm2 Python API | API method splits a pane and returns a new Session object | caller holds a Session object | user enables Python API/scripts | return the created stable identity; don't infer “whatever became active” |
| kitty remote control | socket/CLI action protocol | window targeting and per-window control | off by default; per-action passwords and custom authorization | capability-scope the exact action rather than grant general terminal control |
| cmux | CLI and JSON-RPC-style Unix socket; provider-specific team adapters | inherited workspace/surface/socket identity; explicit IDs for nonlocal operations | ancestry-only default, same-user/password/open modes; protected env | closest external exemplar for agent-aware terminal integration |
| Claude Code agent teams | lead spawns separate Claude instances; shared task list and mailbox | provider team identity; in-process or tmux/iTerm2 display | experimental feature opt-in; teammate permissions inherit at spawn | adapter native orchestration into Tortie sessions; do not rebuild the mailbox |
| OpenAI Multi-agent | hosted root/subagent tree with structured actions and messages | agent names, call IDs, attributed events | API/application policy and concurrency setting | consume stable structured identities when available; keep the UI a projection |

Sources: [tmux control mode](https://github.com/tmux/tmux/wiki/Control-Mode), [WezTerm CLI](https://wezterm.org/cli/cli/index.html), [Zellij CLI control](https://zellij.dev/documentation/controlling-zellij-through-cli), [iTerm2 Session API](https://iterm2.com/python-api/session.html), [kitty remote control](https://sw.kovidgoyal.net/kitty/remote-control/), [cmux CLI contract](https://github.com/manaflow-ai/cmux/blob/main/docs/cli-contract.md), [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams), [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent).

### 7.2 cmux is the closest exemplar, including its failures

cmux has moved beyond generic pane creation into provider adapters:

- Claude teams compatibility maps the provider's expected tmux operations into native cmux panes.
- Codex teams watches app-server events, identifies spawned subagent threads, and attaches resumable threads to native panes.
- Its command surface returns and accepts explicit pane/surface/workspace identities.
- Its managed context variables prevent project configuration from spoofing the terminal's identity and control endpoint.

This proves the desired UX is possible. Its current issue tracker also exposes the hard parts:

- a Codex watcher failed before opening panes with a transport `Message too long` error even though subagent threads existed ([cmux #5508](https://github.com/manaflow-ai/cmux/issues/5508));
- a watcher missed a different `spawnAgent` completion event shape ([cmux #5698](https://github.com/manaflow-ai/cmux/issues/5698));
- rejected Codex spawns produced no visible pane and left the explanation only in a temporary log ([cmux #4700](https://github.com/manaflow-ai/cmux/issues/4700)); and
- Claude teammate panes inherited the GUI app's minimal `PATH` rather than the launcher's environment, breaking hooks that worked in the lead pane ([cmux #9150](https://github.com/manaflow-ai/cmux/issues/9150)).

These are not reasons to reject the feature. They identify four requirements:

1. provider events and attach protocols must be versioned adapters with canaries;
2. spawn failure and placement failure must be separate visible states;
3. a child must use Tortie's normal launch/environment path; and
4. logs are support evidence, never the only user-facing explanation.

### 7.3 Provider-native Claude teams

Claude Code's current documentation says:

- the feature is experimental and disabled by default;
- teammates are separate interactive Claude Code instances;
- in-process is the current default;
- split mode requires tmux or iTerm2;
- teammates share a task list and mailbox;
- permission requests can bubble to the lead;
- one team per session, no nested teams, fixed lead, and permissions fixed at spawn are current limitations; and
- orphaned tmux sessions and slow/stale lifecycle state are acknowledged failure modes.

[Claude Code agent teams](https://code.claude.com/docs/en/agent-teams)

For Tortie, there are two plausible modes:

1. **In-process pass-through:** force or retain Claude's in-process mode. Safe and immediately compatible, but there are no separate Tortie sessions to show.
2. **Scoped compatibility adapter:** only for a user-enabled session, prepend a bundled provider-specific shim that implements the small tmux/iTerm2 command dialect Claude teams actually uses and maps child creation to `teammate.spawn` plus placement. This is the cmux pattern.

The second is feasible but should follow the generic broker, be pinned to measured Claude versions, and fail back to in-process mode with a visible explanation. A global fake `tmux` on the user's path is unacceptable; the shim must exist only inside the explicitly enabled parent session.

### 7.4 Provider-native Codex subagents

OpenAI's official Multi-agent beta has the right abstract contract: separate contexts, structured agent/call identities, messaging, waiting, interruption, and attributed output events. It recommends three concurrent subagents for most work and warns against sequential chains and shared mutable resources. [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)

Codex also exposes settings for enabling agents and limiting concurrent spawned-agent threads. [OpenAI Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)

What is not yet an equally stable public contract is “attach this Codex CLI subagent thread as an independent interactive terminal process.” cmux demonstrates that app-server watching and resumable-thread attachment can work, while its open failures show event and transport drift.

Therefore:

- do not scrape the root TUI text for `Spawned ...`;
- do not treat an output event as proof that an attachable thread exists;
- prefer an official structured app-server/thread-attach contract when one is published;
- keep a Codex adapter behind version detection and a kill switch until then; and
- let generic `tortie teammate spawn` provide provider-independent value first.

This conclusion is an inference from OpenAI's official orchestration contract and cmux's current integration evidence; OpenAI does not document Tortie-style terminal attachment in the cited public guide.

---

## 8. Utility

### 8.1 What creates real value

Agent-spawned teammate splits would add five concrete capabilities:

1. **Parallel breadth.** A lead can fan research, review, test, or debugging hypotheses into independent contexts without the user manually creating and briefing every session.
2. **Immediate observability.** Each teammate becomes a normal Tortie session with visible output, attention state, direct keyboard access, saved output, and an honest lifecycle.
3. **Intervention.** The user can inspect a slow, confused, permission-blocked, or failed teammate directly instead of seeing only the lead's summary.
4. **Durable provenance.** Tortie can show which session created which child, through which adapter, for what safe label, and whether launch or placement failed.
5. **Provider portability.** A narrow generic spawn verb works across compiled agent kinds even when a provider has no native team UI; native adapters can add richer coordination without changing Tortie's session model.

The best workloads are corroborated across Anthropic and OpenAI: independent research/review lanes, competing debugging hypotheses, separate modules or test suites, and cross-layer work with clear ownership. Claude's agent-team guide names those use cases. OpenAI similarly recommends independent bounded tasks and warns against shared mutable state. [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams), [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)

Anthropic reports a 90.2% improvement over a single-agent baseline on its internal breadth-first research evaluation, but also about 15 times the token use of ordinary chat and explicitly cautions that most coding work has fewer truly parallelizable lanes. That is evidence for selective fan-out, not a general productivity multiplier. [Anthropic's multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)

### 8.2 What a split does not solve

A visible pane does not by itself provide:

- task decomposition quality;
- inter-agent messages or result synthesis;
- file-write isolation;
- merge/review flow;
- cost control beyond process counts;
- correct permission inheritance; or
- a guarantee that parallel work is faster.

Tortie's measured local history found several simultaneous agent sessions in the same project, but no session whose cwd differed from its project path. This means teammate coding currently shares one working tree. Parallel research, review, testing, and disjoint-file work are strong fits. Same-file implementation is not. Provider docs make the same warning: Claude teams do not create worktrees automatically, and OpenAI warns against contention on shared mutable resources. [`52-unit-of-work.md`](52-unit-of-work.md), [Claude Code parallel-agent approaches](https://code.claude.com/docs/en/agents), [OpenAI Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)

### 8.3 Product fit

Research 04 found that the broader agent-manager market mostly optimizes for worktree-per-task fan-out and diff review, while Tortie's distinctive workflow is durable, long-lived named terminals across projects. [`04-agent-managers.md`](04-agent-managers.md)

Agent-spawned teammates fit Tortie if they remain ordinary durable sessions. They do not fit if they turn Tortie into a task kanban, hide processes behind an orchestration dashboard, or make provider-native team state the source of truth for session survival.

The differentiator is not “we can draw several agents.” Many products can. It is:

> A teammate created by an agent is still a fully declared Tortie session: visible, interruptible, recoverable when evidence permits, and never lost merely because its lead or UI disappeared.

---

## 9. Recommended delivery sequence

### Stage 0. Protocol and durability spike

Build only a test-only broker and CLI against an isolated manifest and tmux socket. Prove:

- capability derives the parent; a claimed parent ID is ignored;
- duplicate request IDs create one child;
- manifest declaration precedes process existence;
- the normal PATH, hooks, capture, identity stamps, and launch context reach the child;
- invalid token, over-budget, nested, remote, oversized, and arbitrary-argv requests refuse before spawn;
- shutdown joins or refuses the mutation honestly; and
- no test process or manifest row escapes the isolated root.

Exit criterion: the agent route is structurally indistinguishable from normal `createSession` after authorization, with provenance as its one durable difference.

### Stage 1. Local, app-open generic teammate spawn

Ship behind an experimental setting:

- per-parent human enablement;
- bundled `tortie teammate spawn` CLI;
- same-project, same-agent, depth-one, maximum-three policy;
- request/provenance store;
- typed failures and idempotency;
- pending non-focusing renderer placement; and
- visible “spawned by” relationship and failure notice.

Do not ship remote support, arbitrary commands, background Host claims, or automatic parent-child cleanup.

### Stage 2. Claude Code adapter

After measuring the exact command dialect for pinned Claude versions:

- add a session-scoped compatibility shim only when the user enables native teammate splits;
- translate only the required create/list/select/message operations;
- preserve Tortie's normal launch environment;
- fall back to Claude's in-process mode on version or protocol mismatch; and
- exercise team cleanup, permission prompts, parent exit, app restart, and orphan recovery.

### Stage 3. Background Host

Move the already-tested broker, capabilities, manifest authority, and pending intents into the planned user-level Tortie Host. Then an agent may request a child while every UI window is closed, and the next renderer reconstructs the split from pending intent.

This stage should be justified by the broader continuity work in research 26, not by teammate spawning alone.

### Stage 4. Codex adapter and remote scope

Only after a stable structured thread-attach contract exists—or a version-gated adapter has a sufficiently strong canary suite—map Codex subagent identities to Tortie surfaces. Treat remote agent-origin requests as a separate security phase over the confirmed remote Host protocol.

---

## 10. Required acceptance matrix

| Case | Expected result |
| --- | --- |
| Enabled parent requests one child | One manifest-declared session appears and is placed beside parent without changing human focus |
| CLI retries after response loss | Same child ID returned; no second process or row |
| Renderer reloads between create and placement | Child survives; pending intent applies once after hydration |
| Parent group already has six leaves | Child opens as a separate surface with an honest placement outcome |
| Parent exits after request | Accepted child remains; provenance remains; no cascade kill |
| Parent is removed or capability disabled | New requests refuse; existing child is untouched |
| App begins shutdown during request | Mutation is either admitted and joined or refused before declaration; never half-owned |
| App is closed | CLI fails immediately and never calls tmux directly |
| Agent supplies cwd, remote machine, env, argv, or `startAnyway` | Schema or policy refusal before spawn |
| Child tries to spawn | Depth refusal before spawn |
| Fourth live child requested | Budget refusal before spawn |
| Capability copied to another Tortie session | It can act only as the original parent within that parent's project and remaining budget; it cannot acquire the receiving session's identity or broader authority |
| Prompt/task exceeds limit or is malformed | Bounded typed refusal; no payload logged |
| Claude provider version drifts | Adapter canary fails closed or falls back to in-process mode visibly |
| Codex spawn exists but is not attachable | “Agent spawned; separate interactive surface unavailable” rather than silence |
| Child hook needs user PATH | Same launch-plan/environment behavior as an ordinary Tortie create |
| tmux server reconnects | Manifest relationship and session identity remain authoritative; no duplicate child |

---

## 11. Open questions that do not block the decision

1. **Task delivery per provider.** The broker contract can be fixed now; each compiled adapter still needs measured argv/stdin behavior and safe prompt-size limits.
2. **Placement intent retention.** A short durable queue until renderer ack is sufficient for v1; the Host phase may absorb it into ordered client state later.
3. **Capability storage.** The hook settings precedent proves token reuse across app restarts. The implementation still needs a measured choice between a user-only token file and signed claims plus a revocation table.
4. **Permission presentation.** The default policy is clear, but the exact user surface—session menu, create dialog, or one-time banner—needs UI work.
5. **Cost evidence.** Process quota is enforceable immediately. Provider token/cost budgets need provider-specific telemetry and should not block the first local capability.
6. **Worktree option.** Useful for parallel coding, but it changes Tortie's measured project/cwd model and belongs to separate research rather than being smuggled into teammate spawning.

None of these changes the feasibility verdict or the core IPC shape.

---

## 12. Claim and evidence ledger

| Claim | Evidence | Strength / limitation |
| --- | --- | --- |
| Tortie can create the durable child without new process machinery | Current `sessions:create` → core → manifest-first create path | High; direct code evidence |
| Tortie can show the child beside its parent without tmux panes | Current `splitSession`, `splitWith`, split-tree model | High; shipped working sibling |
| Raw tmux would bypass ownership and durability | Identity rules, manifest-first create, one-screen assumption, private socket analysis | High; direct architecture evidence |
| A process-to-main capability channel is practical | Current authenticated hook server; cmux, WezTerm, kitty patterns | High; local precedent plus multiple primary exemplars |
| Generic agent-origin spawn is feasible in Electron main | Existing core is callable outside renderer IPC and mutation-ledger protected | High; implementation remains unbuilt |
| App-closed spawn requires the Host | Current Electron quit lifetime plus research 26 Host design | High |
| Claude-native split integration is feasible | Claude documents tmux/iTerm2 adapters; cmux implements native team panes | Medium; experimental and version-moving |
| Codex-native interactive split integration is feasible | Official structured multi-agent events plus cmux app-server implementation | Medium-low; public thread-attach stability is unresolved |
| Independent multi-agent work can improve breadth/coverage | Anthropic measured research eval; Anthropic/OpenAI use-case guidance | Medium-high for research, lower for coding; not Tortie-specific |
| Three is a reasonable initial concurrency cap | OpenAI recommended default plus Tortie's six-leaf UI bound | Medium; must be validated against local cost and UX |
| Users will value automatic teammate spawning | Existing simultaneous multi-session use and market/provider convergence | Medium; no direct Tortie user study of this exact feature yet |

### Evidence gaps after two research loops

- No public, stable OpenAI document was found for attaching a Codex CLI subagent thread to a second terminal. The report therefore does not treat cmux's app-server technique as a stable contract.
- Claude documents the user-visible team behavior but not a supported third-party adapter protocol. A compatibility shim must be derived from measured commands and pinned versions.
- No Tortie telemetry or interview directly measures how often the user would delegate from an agent instead of manually creating sessions. Existing multi-session counts establish adjacency, not demand.
- No implementation spike was run in this research turn. Feasibility is based on direct code-path inspection and external working systems, not a landed prototype.

These gaps are why the recommendation is staged and experimental rather than a full provider-neutral promise.

---

## 13. Source ledger

### Local architecture and prior research

- [`CLAUDE.md`](../../CLAUDE.md) — ownership, manifest, typed IPC, process-start consent, and private-substrate invariants.
- [`src/main/sessions/create-local.ts`](../../src/main/sessions/create-local.ts) — complete manifest-first local create path.
- [`src/main/sessions/mutation-ledger.ts`](../../src/main/sessions/mutation-ledger.ts) — shutdown admission and mutation joining.
- [`src/main/activity/hooks.ts`](../../src/main/activity/hooks.ts) — per-session loopback token precedent.
- [`src/main/tmux/control-client.ts`](../../src/main/tmux/control-client.ts) — internal tmux event bus.
- [`src/renderer/terminal/terminal-menu.ts`](../../src/renderer/terminal/terminal-menu.ts) — working create-then-split sibling.
- [`src/renderer/state/layout.ts`](../../src/renderer/state/layout.ts) and [`split-tree.ts`](../../src/renderer/state/split-tree.ts) — presentation-only split model.
- [`04-agent-managers.md`](04-agent-managers.md) — agent workspace market and architecture inventory.
- [`26-tortie-durability-architecture-and-recovery.md`](26-tortie-durability-architecture-and-recovery.md) — background Host and sole-mutation protocol.
- [`52-unit-of-work.md`](52-unit-of-work.md) — measured session counts, project unit, and surface semantics.
- [`60-tortie-orca-comparison.md`](60-tortie-orca-comparison.md) — Tortie's durability posture versus a broader daemon control plane.
- [`64-agent-dropped-to-shell.md`](64-agent-dropped-to-shell.md) — current one-screen-per-session assumption.
- [`65-plugins-reconsidered.md`](65-plugins-reconsidered.md) — private tmux socket as an ungated write surface.

### External primary sources

- [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Claude Code: Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
- [Claude Code: Run agents in parallel](https://code.claude.com/docs/en/agents)
- [OpenAI: Multi-agent guide](https://developers.openai.com/api/docs/guides/responses-multi-agent)
- [OpenAI: Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)
- [tmux: Control mode](https://github.com/tmux/tmux/wiki/Control-Mode)
- [WezTerm CLI](https://wezterm.org/cli/cli/index.html)
- [Zellij CLI control](https://zellij.dev/documentation/controlling-zellij-through-cli)
- [iTerm2 Python Session API](https://iterm2.com/python-api/session.html)
- [kitty remote control](https://sw.kovidgoyal.net/kitty/remote-control/)
- [cmux CLI contract](https://github.com/manaflow-ai/cmux/blob/main/docs/cli-contract.md)
- [cmux socket API](https://manaflow-ai-cmux.mintlify.app/automation/socket-api)
- [cmux environment variables](https://manaflow-ai-cmux.mintlify.app/automation/environment-variables)
- [cmux #4700: surface Codex spawn failures](https://github.com/manaflow-ai/cmux/issues/4700)
- [cmux #5508: Codex watcher transport failure](https://github.com/manaflow-ai/cmux/issues/5508)
- [cmux #5698: missed Codex spawn event](https://github.com/manaflow-ai/cmux/issues/5698)
- [cmux #9150: teammate PATH mismatch](https://github.com/manaflow-ai/cmux/issues/9150)

---

## 14. Bottom line

Agent-spawned teammate splits are a good fit for Tortie **if Tortie owns the spawn and treats the split as a projection**.

The minimal sound architecture is already visible in the codebase: reuse normal durable session creation, add a narrow per-session capability broker, record parent/child provenance and idempotency, then reuse the renderer's split tree without stealing focus. Raw tmux access is the wrong abstraction and a much larger permission than the feature needs.

The generic same-project capability is ready for an isolated spike. Claude-native panes are a credible second adapter. Codex-native interactive panes should wait behind a measured, version-gated contract. App-closed and remote requests belong to the planned Host and remote protocol respectively.

That sequence delivers the useful part early—parallel work that remains visible and durable—without binding Tortie's correctness to an experimental provider protocol or weakening its ownership model.
