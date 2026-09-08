# Research 84. Moving work between agents, and letting an agent start one

**Research phase 223. Decision document. Written 2026-09-07.**

**Charter.** The Phase 223 entry in `docs/BACKLOG.md`, [issue 14](https://github.com/gregce/tortie/issues/14),
his ask of 2026-09-07, `docs/ZEN-OF-TORTIE.md`, and **the Phase 23 refusals in `CLAUDE.md`, which bind
this document harder than any other**. He asked three things and said plainly *"do not necessarily
interpret this as written"* and *"we do not need to necessarily resume it"*, so the need this document
answers is **continue this work somewhere else**, and resume, replay, summary and re-prompt are all
candidate mechanisms rather than assumptions.

**Safety, stated before anything else.** `/Users/gdc/herdr` was read and never written; so were
`/Users/gdc/codex`, `~/.claude` and `~/.codex`. No herdr binary was built or run and no herdr server
was started. No agent CLI was spawned for a turn and no model turn was spent by any lane; `claude
--help`, `claude import --help` and `codex --help` were read, which take no turn and spend no token.
Nothing was written to `/Users/gdc/gmux`. The tmux server on socket `gmux` was never contacted. No
Electron was launched, because nothing was built. Every measurement below was taken with `python3`,
`rg`, `grep`, `strings` or `sed` at a shell over files opened read only. **The fix round ran no `git`
command inside `/Users/gdc/herdr` at all**, deliberately: a read-only `git` query there refreshes
`.git/index`'s stat cache and writes a byte, which is the only write the first round left behind, and
nothing in this document needs one — the version and HEAD in §1 were taken by the first round and are
not re-derived here.

**Five lanes measured this independently** — herdr, transfer, limit detection, delegation and the Zen
read — and this document is the integration. Where two lanes disagreed the disagreement is resolved in
place and the resolution says which reading won and how it was settled; §9 lists the ones that could
not be settled. The integrator re-derived six claims by hand rather than accepting them: the herdr
socket paths, the herdr method count, herdr's `agent.send_keys` guard, Tortie's danger-flag catalogue,
Claude Code's digest-bound import confirm, and the manifest's provenance columns. Two lane claims did
not survive that and are corrected below.

**A fix round then went back to the sources.** It corrected four claims of this document's own,
including one the integrator had marked as independently re-derived — see §9 — and added three
sections the first draft did not have: **§2.4b**, what a transfer WRONGLY carries, measured as a
census over his whole claude store; **§2.8**, the adversarial reading applied to the half this document
recommends rather than only to the half it refuses; and the second half of **§4.5**, naming where a
proposal is written, because a refusal whose permitted side has no mechanism gets one invented for it.
Rows in §10 marked **[F]** are its measurements. It re-read `/Users/gdc/herdr`, `/Users/gdc/codex` and
`~/.claude` and wrote to none of them; its own scripts are under `.p223/fix/`.

**What this document does not re-derive**, because it is already banked: `02-agent-resume.md` (how
every CLI agent resumes), `22-resume-audit.md`, `46-herder-study.md` (herdr at 0.8.0, read in full and
extended rather than repeated here), `57-i7-context-on-another-machine.md`, `62-session-overview.md`
and `63-provider-keep-map.md` (the per-provider reader), `67-agent-spawned-teammate-panes.md` (the
delegation architecture, already designed and never built), `72-subscription-usage.md` (the usage
meter), `81-codex-subagent-resume.md`, and the Phase 82 entry, which refused to build a conversation
replant on a fake far side.

---

## 0. The answer, and the refusal it touches

### 0.1 The three questions get three different answers, and none of them carries the others

**What herdr does.** It is a terminal multiplexer with a control plane. One Rust binary is a headless
server owning every pane's PTY, a TUI client, and a CLI over a JSON socket with **103 methods**, and
its stated thesis is that agents drive it. An agent inside a pane can split panes, set a pane's
environment, start any of 23 agent kinds, prompt them, wait until one is genuinely blocked, read their
screens, run arbitrary commands, install hooks into the person's own agent configuration files, and
stop the server. The only gate on all of it is that the socket file is mode `0600`. Its durability is
weaker than Tortie's in one specific and decisive way: a herdr server restart kills every process,
because the panes are its children. It has no usage-limit awareness of any kind.

**Transfer.** Work can move between two heterogeneous agents, and what moves is **prose**. Measured
over 60 pinned claude conversations, a claude → codex move through the only shipped importer's own
field list keeps **21.43%** of the bytes and loses **78.57%**. The reasoning is mostly not present to
lose — over 600 sampled transcripts, **69.4% of claude thinking blocks carry an empty string and
nothing but an opaque signature**, and **0 of 4,373 codex reasoning items carry a readable `content`
array**. The right reframing is that **the durable state of a coding session is the repository, not
the transcript**: 88.4% of 8,659 measured tool calls act on the working tree, which is still there and
fresher than any transcript. So the thing worth moving is the *intent*, and intent is a document.
**Recommend: a briefing a person reads and edits. Refuse the store replant, refuse the verbatim
replay, refuse anything automatic.**

**And one thing a transfer can do that is worse than losing anything, added by the fix round.** A
claude transcript is a `parentUuid` DAG, the shipped importer walks it line by line and never reads
that field, and `parentUuid` appears **0 times in all of Tortie's `src/`**. Over his whole store, 70
files carry a turn he **rewound past** — `do all of that and push commits to the CLI`, replaced by
`do all of that and locally commit first please` — and a line-sequential move carries both, in his
voice, with nothing saying which one survived. **§2.4b is that measurement and it is a constraint on
the recommended mechanism**, not a reason against it.

**Delegation.** **Refuse the agent-callable spawn, permanently and by name.** Not because an API is
dangerous in the abstract, but because of four measured facts about the only shipped example, and
because Tortie's own catalogue lists **21 danger flags across 10 of the 12 launchable agents in
`AGENT_FLAG_PRESETS`**, 16 of them read out of the agent's own help text. The only shape that could
ever be admitted is one where an agent **proposes** and a person confirms out of band — and this
document does not recommend building even that one yet, because **he is already delegating**: 792 of
his claude transcript files carry `<teammate-message teammate_id=`, 2,430 occurrences since February.
He is not blocked on the ability to delegate. He is blind to the teammates he already has.

### 0.2 The refusal this document touches, named

**Phase 23's eighth refusal**, in its own words:

> Nothing may cause a process to start on a configuration change alone. A human confirms the bytes,
> out of band of any agent turn, and the agreement is bound to a hash of the fields that decide what
> runs.

And the reasoning under it, which is about this product specifically:

> Tortie runs many agent processes at once under one user account, several deliberately launchable
> with their safeguards off, all with write access to the home directory. A configuration directory
> Tortie reads and an agent can write is an increase in privilege rather than a convenience.

**Refusal 8's letter does not cover an agent calling an interface to start another agent.** The
refusal names a configuration change as the trigger, and an agent-driven spawn has no configuration
step at all. Claiming otherwise would be a dodge, and a research phase that dodges is worthless.

**Refusal 8's reason covers it completely, and with more force.** Every clause of the second paragraph
is true of an agent-callable spawn, and the sentence that follows it — *a surface Tortie reads and an
agent can write is an increase in privilege rather than a convenience* — is the whole argument,
restated with the configuration file taken out and the privilege left in. Note also that the two
clauses of the refusal land differently: the trigger clause names an event, and the **confirmation
clause names no event at all**. It says when a human's agreement counts, and the qualifier doing the
work is *out of band of any agent turn*. An agent asking for a session is squarely in band.

So this document **states a new answer for a new question**, in the same words and for the same
reason:

> **No agent-issued request may start a process. An agent may only PROPOSE, and a person confirms
> the proposal out of band of the turn that made it, seeing the same summary the create sheet shows
> when they start a session themselves.**

That is not a widening. It is refusal 8's reason applied to a mechanism refusal 8 did not name, and it
is narrower than refusal 8 in exactly one respect: it admits a proposal where refusal 8 admits
nothing, because a proposal starts nothing.

**And the permitted side is named rather than left open**, because a refusal whose permitted half has
no mechanism is an invitation to invent one. §4.5 says where a proposal is written: **the agent's own
transcript**, which Tortie already resolves per session for eleven of the twelve CLI agents and
already reads redacted. The agent gains no capability it does not have — writing sentences is the only
thing it does — so *a proposal starts nothing* is a property of the mechanism rather than a promise,
and there is nothing to call.

**Nothing in this document widens a standing refusal.** §4 argues the new answer and attacks it. §7
recommends that he adopt it in `CLAUDE.md` as a ninth refusal in his own words; only he can do that,
and the recommendation stands whether or not anything else here is built.

**Two other refusals are in scope and a delegation proposal touches all three or none.** Refusal 2 —
no `tortie.d.ts`, no SDK, no contribution-point registry; *"if a proposal begins 'we will expose an
interface so extensions can…', it is this refusal."* And refusal 5 — no configuration mechanism may
set a session's status. §1.9 shows that the herdr shape collides with all three.

**One earlier ruling is superseded and it should be said out loud.** Research 46 sorted herdr's agent
orchestration surface as `U13 — REFUSE`, and closed the row with *"it stays refused until someone
writes a Phase 23 grade argument nobody has asked for."* He has now asked. §4 is that argument. Its
conclusion keeps the refusal on the mechanism herdr shipped and admits a strictly smaller one, so the
row moves from REFUSE to REFUSE-AS-SHIPPED, with a named narrower shape beside it.

### 0.3 One refusal that has never been written down, and this document proposes writing it

**Tortie has never written a byte into a provider's conversation store.** A scan of every file-writing
API over the two directories that know where those stores are returns nothing:

```
grep -rEn "writeFile|appendFile|createWriteStream|unlink|rename\(" \
     src/main/overview src/main/manifest/harvest | grep -v __tests__   # no output
```

`src/main/overview/` and `src/main/manifest/harvest/` are read-only by construction today. A store
replant would be the first write, into a directory an agent running under the same user can also
write. §2.6 recommends against it on evidence rather than on posture, and §7 asks that the read-only
posture be written down as a refusal so a later round cannot spend it without noticing.

---

## 1. What herdr does

Read only from `/Users/gdc/herdr` at **0.9.0**, `Cargo.toml:3`, HEAD `a9f3ad5f`
(`v0.9.0-1-ga9f3ad5f`). Nothing was written, built or run there. Research 46 read it at 0.8.0 and its
durability comparison still holds; this section is the delta, the part research 46 marked unverified,
and the three things the charter names: the session model, how it persists, and how it recognises
agent state.

### 1.1 The shape, in one paragraph

herdr is one Rust binary that plays three roles: a headless server that owns every pane's PTY and
emulates its terminal, a TUI client that draws streamed frames, and a CLI plus JSON socket API that
scripts and agents drive. Its three primitives are **layout**, **pane** and **agent**
(`docs/next/website/src/content/docs/agent-automation.mdx`). 0.9.0 removed the single-process
`--no-session` mode entirely (`CHANGELOG.md`, "Removed"), so every launch is now server plus client.
`ctrl+b q` detaches; `herdr server stop` ends it.

### 1.2 The session model, and exactly what persists

The nouns, from `docs/next/website/src/content/docs/concepts.mdx`:

- **Session** — a server namespace. The default session's state lives in the config dir; a named
  session lives under `sessions/<name>/` (`src/session.rs:157-171`). Each has its own sockets.
- **Workspace** — top-level project container, one per repo or task. Owns tabs.
- **Tab** — a layout inside a workspace. **Pane** — a real terminal. Splits right or down.
- **Agent** — *"a process Herdr recognizes inside a pane"*. Not a thing herdr owns; a thing it
  *identifies*. `agent start` *"requires an existing shell pane and never creates, splits, or moves
  layout"*. An agent **name** (`reviewer`) is an alias for the current occupant of a pane, cleared
  when that agent exits or is replaced.

**What is durable is one JSON file.** `src/persist/snapshot.rs:14-125` is the whole record, written to
`session.json` in the session's data dir (`src/persist/io.rs:11`). Per pane it holds exactly `cwd`,
`label`, `agent_name`, `managed_agent_kind`, `agent_session` (source, agent, kind, value) and
`launch_argv`, plus the layout as a BSP tree, tab and workspace names, ids and focus. That is all.

| Case | What survives |
| --- | --- |
| Client detaches, or SSH drops | Everything. Processes never stop. This is the strongest path. |
| Server or machine restart | Layout, cwd, focus, names. **Processes are gone.** Panes come back as fresh shells in their saved directories. |
| Restart with `[experimental] pane_history = true` | Also the recent screen text, replayed from `session-history.json`. Off by default because pane output contains secrets. |
| Restart, pane carrying a native session ref | herdr spawns a shell and **types the resume command into it**. |
| `herdr update --handoff` | Best effort live PTY transfer to the new server, so processes keep running. Experimental, opt-in, not available for Homebrew, mise or Nix installs. |

The restore-resume is worth being exact about, because it is the closest thing herdr has to Tortie's
manifest restore. `src/app/agent_resume.rs:264-280` spawns a `TerminalRuntime`, composes
`shell_command_from_argv(&plan.argv)`, appends `'\r'` and calls `try_send_bytes`. **It is a typed
shell line, not an exec.** The argv comes from a hardcoded per-agent table at
`src/agent_resume.rs:136-228` — `claude --resume <id>`, `codex resume <id>`, `copilot --resume=<id>`,
`pi --session <path|id>`, `omp --resume=<value>`, 17 agents — and the binary is a **bare name**, never
an absolute path, so a resume follows whatever `PATH` the new shell happens to get.

**Where the resume id comes from is the real design difference.** herdr does not parse anybody's
transcript store. It installs a hook into the agent's own configuration and the agent tells it:
`src/integration/assets/claude/herdr-agent-state.sh` is a `SessionStart` hook that checks `HERDR_ENV=1`
and `HERDR_PANE_ID` and calls `herdr pane report-agent-session` back through the socket, and
`herdr integration install claude` writes that script and edits the person's Claude settings JSON
(`src/integration/claude_settings.rs:61-92`). Tortie's equivalent, `src/main/activity/hooks.ts`,
refuses to touch the person's settings and passes `--settings` pointing at a file inside its own
userData. The bound herdr does place here is real: `plan()` returns `None` unless the reporting source
is in the hardcoded `is_official_agent_source` list (`src/agent_resume.rs:245-267`), so a plugin
reporting a session ref cannot cause a restart-time resume, and ids are validated non-empty, bounded
and control-character free (`:268-281`).

### 1.3 How it recognises agent state

Five public state words — `working`, `blocked`, `done`, `idle`, `unknown` — over four detected ones.
**The detected enum has four** (`src/detect/mod.rs:11-20`: `Idle`, `Working`, `Blocked`, `Unknown`);
`done` is derived, `(Idle, seen == false) => Done` (`src/app/api_helpers.rs:95-106`), meaning *idle and
the server has not seen you look at it*. Focus marks seen; reads do not; each TUI client tracks its own
Done badge, so the CLI and a client can legitimately disagree. That is a correction to the docs, which
present five as one vocabulary.

Three sources, arbitrated:

1. **Screen manifests** — 21 TOML files at `src/detect/manifests/`, one per agent, being regex rules
   over regions of the rendered terminal (`region = "bottom_non_empty_lines(12)"`,
   `region = "osc_title"`, with `priority`, `any`/`not`, `line_regex`, `contains`).
   `src/detect/manifests/claude.toml` matches spinner glyphs in the OSC title, `esc to interrupt`,
   `Waiting for N background agents to finish`. It is screen scraping, done carefully.
2. **Process detection** — the foreground process group of the pane's PTY.
3. **Integration hooks and plugins** — `pane.report_agent`, which can override screen rules; a "full
   lifecycle authority" makes screen rules non-authoritative.

Blocked is deliberately strict: only when the live bottom-buffer snapshot matches known approval or
question UI, otherwise it falls back to `idle` and labels the fallback
`default_known_agent_idle_fallback`. A working-to-idle transition is held for 3 confirmations at
100 ms, capped at 700 ms (`src/pane/agent_detection.rs:5-13,47-52`). `herdr agent explain` prints the
matched rule, the evidence per evaluated rule, the manifest source and version, and the fallback
reason. That last one is a genuinely good idea and Tortie has no equivalent.

**The manifests are remotely updated.** `src/detect/manifest_update.rs:16` —
`DEFAULT_CATALOG_URL = "https://herdr.dev/agent-detection/index.toml"`, fetched by `curl`
(`:509-557`), capped at 256 KiB, overridable by an environment variable, applied automatically without
a restart, disabled with `[update] manifest_check = false`. There is no signature check in that file;
the trust is TLS to herdr.dev. The content is data rather than code and a bad manifest can only
misclassify state — but state drives `agent wait`, notifications and sidebar rollups.

### 1.4 The agent-facing API, which is the half his question is about

Newline-delimited JSON over a Unix socket. **The API socket and the TUI client socket are two
different files**: `api_socket_path_for` is `<session data dir>/herdr.sock` and `client_socket_path_for`
is `<session data dir>/herdr-client.sock` (`src/session.rs:170` and `:184`), where the data dir is the
config dir for the default session and `sessions/<name>/` otherwise. *(One lane reported the API socket
as `herdr-client.sock`; that is the client socket. Settled by reading `src/session.rs` directly.)*
Resolution order for callers is `--session`, then `HERDR_SOCKET_PATH`, then `HERDR_SESSION`, then the
default. One request per line, `{"id":..,"method":"pane.split","params":{..}}`.

**The `Method` enum carries 103 methods** (`src/api/schema.rs:47`; counted by
`awk '/^pub enum Method \{/,/^\}/' src/api/schema.rs | grep -c 'serde(rename = '`, re-derived by the
integrator). `herdr api schema --json` prints the full JSON Schema, and
`docs/next/api/herdr-api.schema.json` is **10,859 lines** of it committed in the repository.

What matters for this document is the authority granted, and it is total:

| What a caller can do | Where | Reach |
| --- | --- | --- |
| Run any command in any pane | `pane.run`, `pane.send_text`, `pane.send_keys` | Types into any terminal, including one an agent is using |
| Launch any argv | `layout.apply` → `LayoutNode` carries `command: [string]`, `cwd`, `env` | `docs/next/api/herdr-api.schema.json`, `$defs.LayoutNode` |
| Set the environment of a new pane | `pane.split` `env` | Same schema; `normalize_launch_env` (`src/app/api/env.rs:3-32`) rejects only empty keys, `=` in keys and NUL |
| Start a named agent of 23 kinds | `agent.start` | `src/app/api/agents.rs:65`; kinds at `src/detect/mod.rs:43-79` |
| Prompt one, and wait on it | `agent.prompt` with `wait: {until, timeout_ms}`, `agent.wait`, `events.subscribe` | Server-owned, event-driven, pins the resolved occupant |
| Read one, including its scrollback | `agent.read`, `pane.read`, sources `visible`, `recent`, `detection` | For an idle recognised full-screen agent it drives the agent's own mouse-scroll to page back |
| Edit the person's own agent configuration | `integration.install` | `src/app/api/integrations.rs:32` calls `install_target` with no confirmation |
| Link and run a third-party plugin | `plugin.link`, `plugin.action.invoke` | Registers **enabled by default** and spawns the manifest's argv |
| Stop the server | `server.stop` | The first line a connection can send |

`agent.prompt` deserves credit: it **refuses an agent that is already `blocked`**, returning
`agent_blocked` without sending input, so automation cannot blindly answer somebody's approval dialog.
That is the best-designed safety property in the API. §4.3 shows what sits beside it.

### 1.5 What guards it, plainly

**Nothing beyond being able to open the socket file.** Research 46 recorded *"Herdr's socket
authentication was not verified. It is likely that any local process of the same user could spoof the
session id report."* Measured at 0.9.0 the guess was correct and understated.

| Question | Answer | Evidence |
| --- | --- | --- |
| Is there a token, capability or grant? | **No.** `ServerCapabilities` advertises features, it does not authorize | `src/api/server.rs:67` |
| Is the peer's identity checked? | **No.** Zero hits for `peer_cred`, `SO_PEERCRED`, `getpeereid`, `LOCAL_PEERCRED` under `src/` | grep over the whole tree |
| Is there a handshake before dispatch? | **No.** Read the first line, deserialize, dispatch | `handle_connection_with_stop`, `src/api/server.rs:156-300` |
| Can the API be turned off? | **No.** Started unconditionally at boot; the config is loaded six lines above and is not passed to it | `src/server/headless/bootstrap.rs:20`, `:26` |
| Is there a setting that scopes it? | **No.** 207 documented config keys, none naming an API, a socket, automation or an access mode | `docs/next/website/src/data/config-reference.json`; `src/config/model.rs:310` |
| Is delegation bounded? | **No.** No spawn quota, no pane cap, no agent count, no depth counter, no ancestry recorded. The only nearby constant is `MAX_AGENT_START_TIMEOUT` | grep over the agent path |
| What is the gate, then? | The socket file's mode, `0o600` | `SOCKET_PERMISSION_MODE`, `src/server/socket_paths.rs:12` |

So the authorization model is **"same user"** and nothing else. `agent start`'s arguments are filtered
for control characters and nothing else (`src/app/agents.rs:157-162`); the argv is shell-quoted
(`src/platform/macos.rs:62-77`) and typed into the pane's shell, so metacharacters cannot break out —
and the flags reach the agent unchanged. A pane started by `agent start` gets `HERDR_ENV=1` and the
pane, tab and workspace ids exactly as a human-opened one does (`src/pane.rs:138-161`), so the
delegated agent can immediately delegate again, and nothing in the session record distinguishes an
agent-started pane from a person-started one.

**The documented safety rule is a prompt, not an enforcement.** `skills/herdr/SKILL.md` opens by
telling the agent to run `test "${HERDR_ENV:-}" = 1` and, if it fails, to *"say that you are not
running inside Herdr and stop"*, which `docs/next/website/src/content/docs/agent-skill.mdx` calls "the
one guardrail". The server never reads `HERDR_ENV` on an incoming request. The same file carries *"Do
not close workspaces, tabs, panes, or sessions you did not create"*, *"Never run `herdr server stop`"*
and *"Inspect the blocked UI and ask the user before answering it"*. These are model instructions in a
Markdown file, and nothing enforces one of them.

### 1.6 What confirmation does exist, so this is fair rather than one-sided

1. `herdr plugin install <owner>/<repo>` — the **remote** install path — prints a preview of the
   source and the commands it will run, asks `Install this plugin? [y/N]`, refuses outright when stdin
   is not a terminal unless `--yes` is passed, and re-checks that the manifest did not change after
   the build step (`src/cli/plugin.rs:188-208,1294,1550-1556`). This is a genuine human gate. It is
   CLI-only, and `plugin.link` over the socket bypasses it entirely.
2. Remote server install or replacement asks before stopping remote pane processes, default **No** —
   tightened this release in `702aa1e4`, *"fix: require explicit consent for remote server
   replacement"*, which also added *"including shells, **agents**, dev servers, and tests"* to the
   warning text (`src/remote/attach.rs:94,98`).
3. `pane.close` and `tab.close` return `confirmation_required` when the close would take a worktree
   group with it (`src/app/api/panes.rs:1860-1870`).
4. `agent.prompt` refuses a blocked agent, as above.
5. Nested `herdr` inside a herdr pane is blocked by default (`src/main.rs:447-449`). It bounds the TUI
   nesting, not delegation.

**The direction of travel is worth naming.** The product that ships the most permissive agent API in
this comparison spent its 0.9.0 release adding a confirm, with No as the default, at the first place
where an automatic action could destroy work.

### 1.7 What herdr does that Tortie does not

- **A shipped agent-facing control surface**, with a published JSON schema, a CLI and an agent skill.
  Tortie has none, and research 67 designed one that was never built.
- **`agent wait --until blocked`**, an event-driven wait that ends when the far agent is genuinely
  blocked rather than on a timer. This remains the cleverest primitive in the product.
- **`herdr agent explain`**, which prints why a state was decided, the rule that matched and the
  fallback reason. Tortie's oracles decide silently.
- **Multiple simultaneous clients** viewing different tabs of one server, and live PTY handoff between
  server processes across an update.
- **Terminal-native distribution**: one Rust binary, no Electron, Linux and Windows too.
- **A combined agent list across machines with independent reconnects** (0.9.0), and *"missing server
  features disable only the affected action instead of preventing connection"*. Phase 224 owns that
  comparison; it is named here only so this document does not claim it.

### 1.8 What Tortie does that herdr does not

The durability comparison is unchanged at 0.9.0 and this document does not repeat research 46. Two
rows matter here. A herdr server crash kills every agent, because the panes are its children; Tortie's
app is a disposable client of a tmux server that owns the processes, and `session-state.mdx` states
the loss plainly. And herdr keeps one debounced JSON snapshot with no fsync and no backup generations,
against Tortie's SQLite manifest with declaration before spawn, a backup ring and a downgrade refusal.

Beyond durability: resume derived from the provider's own store with a measured per-agent descriptor
set and Phase 215's sub-agent distinction, against herdr's dependence on the agent volunteering its id
through a hook herdr installed; absolute binary paths in the manifest against bare names typed into a
shell; the whole credentials and logins domain, which herdr has nothing in; the usage meter, Context,
Architecture, redline, search and the git surfaces; and a read-only posture toward the person's
provider stores and configuration, which herdr does not share.

**One row that is new and belongs to this document: herdr has no usage-limit awareness at all.** The
first draft supported that with *"four hits, all of them `pane graphics layer limit`"*, and the fix
round refutes the search rather than the conclusion: the phrase `rate limit` **with a space** cannot
match `rate_limited`, which is how Rust spells it. A case-insensitive search over every `.rs`, `.toml`
and `.mdx` for `rate.?limit|usage.limit|quota|five hour|weekly limit` returns **35 files**, and every
Rust hit is herdr's own notification throttle — `API_NOTIFICATION_RATE_LIMIT: Duration =
Duration::from_secs(1)` at `src/app/api.rs:20`, `NotificationShowReason::RateLimited` at
`src/api/schema/common.rs:136` — plus the `socket-api.mdx` pages documenting it. It is how often a
toast may fire, not a provider quota. The two `pane graphics layer limit` hits are at
`src/app/api/pane_graphics.rs:233` and `:391`.

**The corrected search makes the claim stronger, not weaker.** Ask it of the detection layer alone,
where a limit would have to be recognised: **`src/detect/`, being the engine and all 21 manifests,
holds ZERO occurrences of any limit vocabulary**, and the only three occurrences of the bare word
`limit` anywhere under it are `validate_matcher_limits` in `src/detect/manifest.rs`, a regex
complexity cap. herdr's state machine has four words and none of them can mean *stopped by a quota*.
**So the delegation half of his question has shipped in a comparable product; the transfer half has
not.** Nothing in herdr addresses issue 14.

**One thing to take, and it costs nothing.** herdr's `agent start` returns only after detection sees
the agent ready, and returns `agent_not_ready` if it goes blocked during startup. Tortie's create path
returns when tmux has a session, not when the agent can take input. That is a small honesty
improvement available whatever else is decided.

### 1.9 Which of herdr's choices Tortie could not make without breaking a refusal

| herdr choice | The Tortie refusal it collides with |
| --- | --- |
| A socket API any local process can call to start an agent, split panes and run shell commands | **Refusal 8**, and larger — refusal 8's own reasoning is that a *file* an agent can write is an increase in privilege; an *interface* an agent can call removes the configuration step entirely |
| A published JSON Schema, a CLI and an agent skill built against it | **Refusal 2**, by its own words. 10,859 lines of schema in the repository is a `tortie.d.ts` in a different file extension |
| `plugin.link` and `plugin.action.invoke` running third-party argv, with the docs stating *"the entire Herdr CLI is the plugin API… it does not review or sandbox plugin code"* | **Refusal 1** in spirit (the plugins are separate processes, so this is the weaker collision) and **refusal 2** directly |
| The plugin marketplace at herdr.dev/plugins | **Refusal 3** |
| `pane.report_agent` letting an integration or plugin set a session's semantic state, feeding waits, notifications and rollups | **Refusal 5**, verbatim |
| Detection manifests fetched from a URL and applied without a restart | **Refusal 4** — a configuration mechanism deciding what the terminal layer reports — and the spirit of refusal 8; the manifest is data and cannot start a process, but it changes what *blocked* means |
| `agent start … -- --dangerously-skip-permissions` reachable from a caller that is itself a model | Refusal 8's stated reason word for word: *"several deliberately launchable with their safeguards off, all with write access to the home directory"* |

**The one place Tortie already has a local listener belongs beside this, so the comparison is not
overdrawn.** `src/main/activity/hooks.ts` binds `127.0.0.1` (`:237`, `:241`) and accepts exactly two
routes, `/h/<32 hex>` and `/u/<32 hex>` (`:386`), each carrying a 128-bit per-session token, with
`maxConnections = 32` (`:227`). It is one-way inbound telemetry — hook events and usage — and there is
no method on it that creates, starts, prompts or kills anything. **Tortie's loopback surface reports;
herdr's commands.** §4.3 attack 6 is about what would happen if a later round forgot that.

**The fair thing to say about herdr.** This is a coherent product decision, not an oversight. Its
README's own bullet is *"agent-native — agents drive herdr through the cli and socket api: they can
spawn panes, prompt each other, and wait until another agent is genuinely blocked."* A product whose
thesis is that agents drive it correctly concludes that the user account is the boundary and that the
agent's own judgement, guided by a well-written skill, is the control. Tortie's thesis includes
refusal 8. The two theses are incompatible, and neither is confused.

---

## 2. Transfer: what actually moves between two heterogeneous agents

This is issue 14's substance, and the standard it is held to is Phase 82's: *a person must never read
a continued conversation and get a new one.*

Two lanes measured this independently over his own stores, read only, never modified, never copied
out. His stores are live and being written while a phase runs, so a sample drawn twice is not the same
sample; the primary corpus is therefore **pinned once** by `.p223/b-transfer/pin-corpus.py` and every
number attributed to it is over that pinned list.

| | pool | sample | bytes | records |
| --- | --- | --- | ---: | ---: |
| claude 2.1.263, `~/.claude/projects/**/*.jsonl` | 3,769 files, 200 KB–20 MB | 60 | 86,755,841 | 12,484 |
| codex-cli 0.153.4, `~/.codex/sessions/**/*.jsonl` | 983 files, 200 KB–20 MB | 60 | 223,258,434 | 40,345 |

Corpus digest `ff9b763c126b16b7`. A second lane sampled differently — 500 random claude transcripts
between 100 KB and 8 MB, and a 400-file subsample for tool names — and agrees on every direction while
differing on levels for the reason §2.2 gives.

### 2.1 The finding that decides the section: a vendor has already shipped this, and it carries prose

`/Users/gdc/codex/codex-rs/external-agent-migration/` is a crate in the Codex source tree whose
`sessions/` module imports a **claude** or **cursor** conversation into a new codex thread. It is not a
proposal. It is shipped code with tests, and it is the most authoritative available answer to *what can
move between two heterogeneous agents*, because the vendor that receives the conversation wrote it.
The shipped 0.153.4 binary carries the user-facing half: `/import` is described as *"import setup, this
project, and recent chats from Claude Code"*, the menu offers *Tools & setup*, *Current project* and
*Last 30 days of chats*, and its whole session vocabulary is six names —
`external_agent_tool_call` with `input`, `description`, `command`, `file_path`;
`external_agent_tool_result` with `content`; and the marker `<EXTERNAL SESSION IMPORTED>`.

What the crate carries is `ConversationMessage { role, text, timestamp }`
(`sessions/mod.rs`). What it does with each block of a claude record is in
`sessions/records_common.rs::extract_message_text`:

| claude block | what the shipped importer does | where |
| --- | --- | --- |
| `text` | kept verbatim | `Some("text") =>` |
| `thinking` | **dropped, silently, with an empty match arm** | `Some("thinking") => {}` |
| `tool_use` | flattened to a prose note `[external_agent_tool_call: Bash]` with `description`, `command`, `file`, else the input truncated at **2,000 chars** | `tool_call_note` |
| `tool_result` | flattened to `[external_agent_tool_result]`, text truncated at **4,000 chars**; an error becomes `[external_agent_tool_result: error]` | `tool_result_note`, `TOOL_RESULT_MAX_LEN` |
| anything else, images included | the literal string `[external unsupported block: image]` | `Some(other) =>` |

And one detail that settles the Zen question in §5 on its own: a record whose only content is a tool
result is **re-roled from user to assistant** (`records_cla.rs:205`), because in the imported narrative
nobody said it. The importer then writes a **new thread with a new `ThreadId`**
(`app-server/src/external_agent_migration/session_importer.rs::persist_session`), in the same cwd,
seeded with that flattened text, and keeps a ledger row per imported session —
`ImportedExternalAgentSessionRecord` with `source_path`, `content_sha256`, `imported_thread_id`,
`imported_at`, `source_modified_at`, `connector_names`, `title`.

**So the vendor's own answer to "what transfers" is: prose, with the tool trace reduced to labelled
notes and truncated, the reasoning thrown away, images replaced by a placeholder, and the speakers
occasionally changed — written into a NEW thread, carrying a marker that says so, with a ledger row
naming the source and its hash.** That is a *retelling* of the conversation, not the conversation. It
is a good piece of engineering and it is honest about what it is.

**Claude Code 2.1.263 does the opposite: it imports configuration and no conversation at all.**
`claude import [codex|gemini]`, *"Import config from another AI coding agent into Claude Code"*, read
from `claude import --help` on 2026-09-07 by the integrator. There is no session id in it.

### 2.2 What a conversation is actually made of, measured

Over the 60 pinned claude conversations, by bytes on disk:

| Part | Bytes | Share of file |
| --- | ---: | ---: |
| Human ask text | 5,877,352 | 6.77% |
| Assistant answer text | 851,427 | 0.98% |
| Readable thinking text | 150,249 | 0.17% |
| Tool call inputs | 1,992,025 | 2.30% |
| Tool result text | 4,270,883 | 4.92% |
| Everything else — images, structured tool results, thinking signatures, sub-agent records, file-history snapshots, bookkeeping | the remainder | ~84% |

A second, independent reading over a different sample agrees in direction and differs in level:
restricted to genuinely interactive sessions (≥5 human turns, n=54 of a 500-file random sample), **the
human's prose plus the agent's prose is a median 1.7% of the session file** (p10 0.6%, p90 7.8%). The
pinned corpus's 7.75% is higher because most of his claude sessions are one-shot workflow agents
carrying a single enormous brief. Both levels are reported rather than averaged.

**The single most useful number in this section:**

| | claude | codex |
| --- | --- | --- |
| human ask turns per conversation | **median 1**, p90 14, max 84 | **median 3**, p90 17, max 43 |
| conversations with **zero** human asks | **6 of 60** | 0 of 60 |
| tool calls per conversation | median 3, p90 148, max 505 | median 49, p90 239, max 473 |

**The median conversation in this corpus is one human prompt and a great deal of tool traffic.** A
transfer built on "replay the conversation the person had" replays, at the median, one sentence. Six of
sixty have no human turn at all because a workflow started them, which is Tortie's own shape. Any
mechanism that carries only asks and answers is, for this operator, carrying the wrapper and leaving
the parcel — which is exactly why §2.6's recommended mechanism carries the path list and the git mark
as well.

Codex is the same story from the other side. Over the 60 pinned rollouts: human ask text 0.17%,
assistant answer 0.54%, tool output text 19.17%; its `event_msg/item_completed` echo alone is 23.65%
and its folded `compacted` records another 21.54%. Its message roles inside `response_item` are
assistant 967, **user 505, developer 251** — codex has a third role claude has no name for.

**The conclusion both readings support: the prose is a small minority of a session, and the majority is
a tool trace whose meaning is bound to the tool that produced it.**

### 2.3 What is simply not there to move

**Thinking is mostly not on disk.** Over 600 randomly sampled claude transcripts there are 1,803
thinking blocks, of which **1,252 (69.4%) carry an empty `thinking` string and nothing but an opaque
`signature`**; the 551 that carry text average 415 characters, and the average signature is 2,297
bytes. The pinned corpus reads the same way from the other direction:

| | blocks | readable text | vendor-bound blob | ratio |
| --- | ---: | ---: | ---: | ---: |
| claude `thinking` | 1,197, 100% carrying a `signature` | 150,249 B | 2,822,680 B of Anthropic `signature` | **18.8×** |
| codex `reasoning` | 4,373, 100% carrying `encrypted_content` | 151,544 B | 11,212,336 B of OpenAI `encrypted_content` | **74.0×** |

Only 1,526 of 4,373 codex reasoning items (34.9%) carry a non-empty `summary` array at all, and the
`content` array is present on 2,234 and **non-empty on zero**. And the claude bundle says in its own
words why the signature cannot travel, in a sample it ships:

> `// Signature MUST be preserved - the API rejects tampering`
> — `/Users/gdc/.local/share/claude/versions/2.1.263`, read 2026-09-07

Issue 14 concedes that thinking blocks will not transfer. The measurement says the concession is larger
and cheaper than it sounds: **on this machine the reasoning is mostly not present to lose.** It was
never written down in a form anyone but the issuing vendor can read. That is a real simplification of
the problem and it should be said in his terms — you are not giving up your agent's reasoning in a
transfer, because you never had it.

### 2.4 What the receiving agent has no place to put

Run the claude → codex move through the six slots the shipped importer names, over the pinned corpus:

| | Bytes | Share |
| --- | ---: | ---: |
| **KEPT** — user and assistant message text (7,264,553), tool result text (4,270,883), tool calls reduced to name/command/file_path/description (417,024) | 11,952,460 | **21.43%** |
| **LOST** — `toolUseResult`, claude's structured companion to the same result (17,891,450); pasted images (14,962,348); tool result images, `is_error`, ids and structure (3,064,009); thinking text and its signature (3,038,762); sub-agent sidechain records (2,337,351); the rest of every tool call input (1,852,332); file history snapshots (665,528) | 43,811,780 | **78.57%** |

**In plain words, what a person loses whichever direction they go.**

1. **Thinking, and more than the concession admits** — not only the reasoning but the cryptographic
   binding that made it usable at all. §2.3.
2. **Every image.** 41.65% of what a claude conversation's *messages* carry, and the importer names no
   image field. A session whose whole point was a screenshot arrives with the screenshot gone.
3. **The structure of every tool result.** Exit codes, `is_error`, the diff a patch applied, the list
   of files an edit touched. The text survives; whether it succeeded does not.
4. **Every sub-agent.** claude's sidechains (368 records, 2,337,351 bytes in the pinned corpus) have no
   destination, and codex refuses to resume its own sub-agent threads outright — the binary carries
   *"cannot resume an unloaded multi-agent v2 sub-agent through its parent"*, the string Phase 215 was
   built on.
5. **The tool identity.** claude's calls are `Bash` 862, `Edit` 662, `Read` 566, `Grep` 170, `Write`
   76; codex's are `exec_command` 1,891, `exec` 1,447, `shell` 1,042, `apply_patch` 288, `write_stdin`
   164. Neither side has the other's names, so a replayed call is prose about a tool rather than a tool
   call, and no `tool_result` can pair with a `tool_use_id` the receiving agent never issued.
6. **The third role.** 251 codex `developer` messages in 60 rollouts have no claude slot.
7. **The whole per-turn context.** codex's `turn_context` (2,055 records — model, effort, sandbox mode,
   cwd, per turn), `world_state` (332 records, 8.7 MB) and `compacted` (97 records, 48 MB of folded
   prior history). None has a claude counterpart.
8. **Token accounting and identity.** `message.model`, `message.usage`, `message.id`, `requestId`,
   `stop_reason`; codex's `token_count`, `session_meta.cli_version`, `originator`, `context_window`.
9. **File history.** claude's `file-history-snapshot` and codex's `ghost_snapshot`, each written by its
   own agent and readable by neither.
10. **The one thing NOT lost, worth saying:** `cwd` moves cleanly, and the paths the work touched move
    cleanly, because Tortie already extracts them.

**Reverse direction, codex → claude, is worse and has no importer at all.** Of the codex record kinds
counted, only two — `message` role user and role assistant — have an unambiguous claude slot, and they
are **1,472 of 40,345 records and 0.70% of the bytes**. claude has no `developer` role, no per-turn
context record and no place for a `world_state`.

### 2.4b What a transfer WRONGLY CARRIES, which §2.4 never asked

§2.4 enumerates what a move LOSES. Every mechanism in this document was then priced on that list
alone, and the list has no entry for **a record that arrives when it should not have**. That is a
different failure and a worse one, because a loss is a gap the receiving agent can notice and a wrong
carry is a fact it cannot.

**A claude transcript is not a list of records. It is a `parentUuid` DAG.** When the person rewinds —
goes back to an earlier turn and says something else — the CLI writes the new turn with its
`parentUuid` pointing before the rewind, and the branch that was there stays in the file. The live
conversation is the ancestor chain of the last record; the orphaned branch is a thing that was **said
and then ruled out**.

**Nothing in this chain reads that field.** The shipped importer's `read_session_import`
(`/Users/gdc/codex/codex-rs/external-agent-migration/src/sessions/records_cla.rs:97-152`) walks the
file with `reader.read_line` in a `loop`, drops `isMeta` and `isSidechain` (`:175-176`) and **never
mentions `parentUuid`** — the string appears zero times in the whole `sessions/` module. Neither does
Tortie: **`parentUuid` appears 0 times in all of `src/`**, and `src/main/overview/reader/lines.ts` is
by construction a line-sequential stream that decides on the raw bytes of each line on its own. So
§7 B5's *"the asks"*, composed from the overview store, inherits exactly the same blindness.

**Measured over his whole claude store, not a sample.** 19,194 files; 8,237 carry a top-level
conversation chain and 10,957 are all-sidechain `agent-*.jsonl`. `.p223/fix/rewind-split.py`:

| shape | points | files | abandoned importable records | abandoned human asks |
| --- | ---: | ---: | ---: | ---: |
| **genuine rewind** — the branch head's text DIFFERS from the ask that replaced it | 123 | **70** (0.8% of chained files) | 895 (**0.177%** of 504,629) | 156 (**0.487%** of 32,033) |
| **duplicate re-anchor** — same text, same timestamp, written at two parents | 15 | 12 (0.1%) | 900 | 85 |

Worst single file: 292 abandoned importable records. **The rate is small and the rate is not the
finding.** These are the ones, read out of the raw records:

| what he ruled out | what replaced it |
| --- | --- |
| `do all of that and push commits to the CLI` | `do all of that and locally commit first please` |
| `can we define intent lead time on slide 4?` | `can we define intent lead time on slide 5?` |
| `lets write a commit` | `restructure outline.md and then write a commit` |
| `yea i like by day` | `i like by day` |
| `it is very muted ` | `it is very muted, make the button opaque so it can be seen` |

The first row is the whole finding in one line: he cancelled *push* and asked for a local commit
instead. A line-sequential import carries both halves of each pair, in the person's own voice, in
file order, with nothing marking which one survived. **The second agent is told the thing that was cancelled, and
neither the person nor Tortie can tell.** That is §5.2's quiet failure in its sharpest form: not a
fact missing, a decision inverted, and the person finds out at the diff.

**Three of my own passes were wrong before this one and all three are recorded**, because the
correction is the method. Pass 1 counted every `parentUuid` fork and read 23.2% of files as forked;
most of those forks are `progress` records, an older claude bookkeeping class hanging beside the
conversation. Pass 2 collapsed the DAG to `user`/`assistant` records and still read 8.5%; hand-reading
the worst file killed that one too, because claude issues PARALLEL tool_use blocks as a chain of
assistant records and each `tool_result` user record's `parentUuid` points at the assistant record
that issued its call — the record names it in `sourceToolAssistantUUID`, so the branching is
mechanical. Pass 3 keys a rewind on a HUMAN ASK — `type: user`, real text, no `toolUseResult`, no
`sourceToolAssistantUUID` — whose effective conversation parent already had a child written earlier in
the file, and every rewind above was then read by hand in the raw records before the number was
written down. **Every intermediate rate was an artifact of the definition and each looked plausible.**

**[C] A fourth was produced independently after the fix round, which is the corroboration this
section wanted.** The verifier attacked pass 3 with a different definition — records not on the
ancestor chain of the file's LAST record, which is the definition that most directly answers what a
line-sequential importer wrongly carries — and read **86.74% of 504,799 importable records as
abandoned**, over the same 8,237 chained files pass 3 measured, so the two agree exactly on the corpus
boundary and disagree only on the definition. The committer re-ran it and reproduced that rate, then
measured the cause on the file it names as worst: of its 15,139 conversation records, **1,633 carry a
`parentUuid` that is not in the file at all** and **only 18 parents in it have more than one child**.
A claude file is a forest because its chain runs THROUGH other files, not because the person rewound,
so the last record's ancestor walk abandons almost everything and the rate is an artifact for a fourth
reason. Pass 3's ask-keyed definition is the robust one, and the reason to record this is that the
fourth wrong answer was found by somebody else, by a method chosen to disagree, and still looked
plausible.

**What follows for the mechanisms.** (d) the store replant is unaffected, being refused already. (a)
verbatim replay carries every abandoned branch by construction and this is a second reason to refuse
it as a default. (c) the deterministic handoff is **the one that must change**: composed from the asks
it would carry a cancelled ask beside its replacement, so a handoff that lists asks must walk the
`parentUuid` chain from the last record and take only the live ones, and must say in the artifact that
it did. (b) a model-written summary inherits whatever it is fed. **The fix is cheap and it is one
field**, and nothing in the tree reads it today, which is the point of writing this down before a
build phase composes the artifact from a line-sequential reader it already has.

### 2.5 The one thing that does survive intact, and it is the whole repository

Over 8,659 tool calls in 400 real claude transcripts: **Bash 35.9%, Read 24.5%, Edit 14.4%, Grep 8.7%,
Write 2.9%, Glob 2.0% — 88.4% of all tool traffic acts on the working tree.** WebSearch and WebFetch
together are 2.2%.

**[C] That number is a 400-file sample and the census says it is conservative.** It is load-bearing
for §2.8 and for the conclusion, so the committer re-derived it by a different frame: no size filter,
no sample, the whole store walked recursively rather than the top level of each project directory.
**19,246 files, 554,625 `tool_use` blocks, 64 times the sample, and the same six tools read 90.6%.**
The claim holds and the shipped 88.4% is low by 2.2 points. The per-tool mix does move — Bash 54.7%
against 35.9%, Read 17.4% against 24.5% — because the sampled frame excludes the sub-agent files where
Bash dominates. Nothing in this document rests on the mix, only on the aggregate, so the headline
number stays as it was measured rather than being restated from a wider frame. His store is live and
grew by one file and 170 blocks between the verifier's run and the committer's half an hour later,
which is why a census here is a reading with a timestamp and not a constant.

That is the reframing this section exists to produce. **The durable state of a coding session is the
repository, not the transcript.** A second agent opened in the same cwd already has everything those
8,659 calls were reading and writing, at a fresher version than the transcript records. What it does
not have is *why* — the constraint the human stated eleven turns ago, the approach that was tried and
rejected, the thing he said not to do.

So the transfer problem is not "move the conversation". It is "state the intent", and intent is prose,
and prose is small.

### 2.6 The four mechanisms, priced

Sizes are per conversation over the pinned corpus, at 4 bytes per token. The receiving window is not
guessed: `model_context_window` as codex itself records it over the pinned corpus is **258,400** on
11,390 of 12,732 readings and **272,000** on the other 1,342.

| Mechanism | What the person actually gets | Size | How they would know it worked | Verdict |
| --- | --- | --- | --- | --- |
| **(a) Verbatim replay as a prompt** | The whole ask, answer and tool trace pasted into a new agent. It has *read a transcript*; it did not do the work | claude median 170,986 B (~42,746 tok), p90 ~123,212 tok; **18 of 60 codex rollouts exceed 200k tokens**, 2 of 60 claude | Yes, by accident — one enormous first turn is unmistakable | **Refuse as the default.** It spends a sixth of the window at the median on a trace of work the repository answers in seconds, which is the opposite of what a person at a usage limit needs. Offer it only when he explicitly asks for the whole thing |
| **(b) A summary the model writes** | A briefing. claude already writes one when it compacts, and it is good: **480 of them across 9,615 scanned transcripts**, median 13,031 chars, opening *"This session is being continued from a previous conversation that ran out of context."* | ~13 KB | **No** — prose with no provenance, unless the sentence names where it came from | **The only honest candidate**, with one ordering constraint: **the agent that just hit its limit cannot write it.** It is written by the receiving agent or a third |
| **(c) A structured handoff Tortie composes** | Which agent was working, in which directory, on which branch, at which commit, what was asked, what it last said, which files it touched — every field of which Tortie **already extracts** | ~1.1 KB (~280 tok) on the real conversation driven, **9.7% of (a)** | Yes, if Tortie shows what it composed; it is deterministic, so it can be shown in full | **Best value per unit of risk**, and the only one that costs nothing to try. Two honest limits: the median-1 finding, so built from asks alone it is nearly empty and must carry the path list and the git mark; and §2.4b, so the asks it carries must be the LIVE ones, taken along the `parentUuid` chain from the last record rather than in file order |
| **(d) A store replant** of the Phase 82 shape | A session that *looks* resumed | n/a | **No, and that is the objection** | **Refuse.** 78.57% has no slot; the thinking cannot be forged because the signature is vendor-issued and the vendor's own bundle says the API rejects tampering; where a vendor wanted this the vendor built it, and it is still six slots into a new thread |

**Resolving (b) against (c), because two lanes ranked them differently.** They are not competitors. (c)
is deterministic, asks no model, invents nothing and costs no turn; (b) is a model artifact that can
say *why* in a way (c) cannot. The order is **(c) first, (b) as an addition to (c), (a) on request,
(d) never.**

**Two measured cautions on (b).** Reusing the provider's own compact summary covers exactly one of the
fourteen agents in `src/main/agents/registry.ts`: **codex writes none** — over 195 rollouts, 568
`compacted` records, **0 carry a prose message**; codex compaction is a `replacement_history` of real
messages folded into a window, not a written summary. And the fold machinery Tortie already has
(`src/main/overview/fold/spawn.ts`, recipes for claude, codex, cursor, grok and pi;
`fold/validate.ts`, which refuses a bad answer *whole* rather than trimming it) is tuned to write **one
sentence**, with `FOLD_ASK_MAX_CHARS` 600, `FOLD_ANSWER_MAX_CHARS` 1,200 and `FOLD_PROMPT_MAX_BYTES`
16,384. A briefing is a different artifact and needs its own recipe and its own validator. Reusing the
fold's prompt would be a mistake; reusing its **shape** — spawn one shot of a confirmed CLI, validate,
refuse whole — is exactly right.

**Delivery already exists and needs no new machinery.** `typeIntoPane(target, text, pressEnter)` at
`src/main/restore/restore.ts:301` is already used by `src/main/sessions/resume-in-place.ts:1215` with
**`pressEnter` false**, so Tortie types text into a session and the person presses Enter. The artifact
is still a document he can read and edit; the typed delivery is one line on top of it. **An earlier
draft called that Enter press "propose-and-confirm with the confirmation being the most ordinary act
there is", and §2.8 refutes it**: an Enter press is ordinary because it is unread, so the confirmation
is the document, not the keystroke.

### 2.7 How a person can tell which one they got — Phase 82's standard

The vendor has already shown what adequate looks like: codex writes `<EXTERNAL SESSION IMPORTED>` into
the transcript and records a ledger row carrying the source path and a `content_sha256` of it. Copy
that shape.

| mechanism | can the person tell? | what makes it tellable |
| --- | --- | --- |
| (a) replay | yes, by accident | a first line naming the source session and agent |
| (b) summary | no | the sentence must name the agent it came from, and the validator must refuse one that does not |
| (c) handoff | yes, if Tortie shows what it composed before typing it | show it; it is deterministic |
| (d) replant | no | nothing short of the vendor's own marker, which means the vendor's own importer |

**One gap for whichever build phase follows, and it needed correcting.** One lane reported that the
manifest has no provenance column at all. It has two, and they answer a different question:
`src/main/manifest/schema.ts:206` adds `resume_provenance`, and the comment at `:175` says it is
written *"whenever the conversation id is"* — it records **how the resume id was learned**, not where
the work came from. There is still no field that could say *this session was continued from that one*.
Whichever mechanism is chosen, the row needs one field and the session card one line, or Tortie will
be the only thing in the chain that cannot say where the work came from.

### 2.8 The adversarial reading, applied to the half this document RECOMMENDS

**This section is the fix round's, and the reason it exists is a defect in the shape of the document
rather than in any of its numbers.** The words *poisoned*, *compromised*, *untrusted* and *injection*
appear twice in the 1,465 lines this document had at the parent commit: once in §3.4 about agents
writing the phrase *usage limit*, and once at the head of §4.3, inside the half it REFUSES. They are never applied to §2 or to §7 B5,
which is the half it recommends building. A document that attacks only what it is already declining
has not attacked anything.

**The chain is real and every link of it is in the tree today.**

1. §2.5 measured **88.4% of 8,659 tool calls acting on the working tree**. Reading a file the agent did
   not write is the ordinary case, not the edge one.
2. Whatever that file says enters agent A's transcript as a `tool_result`, and from there the overview
   store.
3. The only filter on that store is `src/main/overview/redact.ts`, 81 lines. Read in full: **nine**
   `SECRET_PATTERNS` vendored from `@specstory/lore` plus **two** `TORTIE_PATTERNS`, eleven in all,
   every one of them a **secret shape** — `AKIA…`, `gh[pousr]_`, `xox[baprs]-`, `sk-`, `AIza`, a JWT,
   a PEM block, a bearer header, a `key = value` heuristic, then a Stripe key and an email address.
   **There is no instruction filtering of any kind, and there should not be**, because instruction
   filtering does not work. The point is only that nothing downstream may assume it exists.
4. §2.6 prices the deterministic handoff at ~1.1 KB and the model half at ~13 KB, and §7 B5 composes
   both from that store.
5. `typeIntoPane(target, text, false)` (`src/main/restore/restore.ts:301`) sends it into a pane.
6. Agent B may be running under one of claude's 2 or codex's 4 catalogued danger flags (§4.2).
7. The person presses Enter.

**So the two standards in this document must be made one.** §4.3 attack 1 sets the bar for the refused
half: a confirmation *"must carry information he does not already have"*, and one that *"degenerates
into 'Allow? [Y]' "* does not hold and the feature should be pulled rather than tuned. §2.6 then
describes B5's delivery as *"propose-and-confirm with the confirmation being the most ordinary act
there is."* **That sentence was wrong and it is corrected in place.** An Enter press is ordinary
precisely because it is unread; the ordinariness is the defect, not the reassurance. Attack 1's
standard is the standard, and it binds B5 exactly as it binds a spawn proposal.

**What that costs B5, stated as a constraint a build phase can be held to.**

- **The document is the confirmation, and the Enter press is not.** The briefing is opened in the
  editor, read and editable, before anything is typed anywhere. A path that composes and delivers
  without that step is not a narrower B5, it is a different feature, and it is refused.
- **Never the model half unread.** The deterministic ~1.1 KB is composed by Tortie out of fields Tortie
  extracted, and its worst case is a wrong path. The ~13 KB model half is written by a model that read
  agent A's transcript, and its worst case is text an attacker chose. They are not the same artifact
  and the surface must not present them as one.
- **The receiving agent's flags are the person's, at the create dialog, every time.** §4.3 attack 3
  says this for the spawn proposal. It is the same rule and it is worth saying twice: nothing about a
  briefing may pre-select a posture.
- **The provenance line §2.7 asks for is a safety field, not a courtesy.** *This text was composed from
  session X by agent Y* is what lets him distrust it. Without it the briefing is anonymous prose with
  no author.

**And the honest limit on all of it.** Nothing above prevents a poisoned instruction reaching agent B.
It is a person reading a document, and a person reading a document misses things. What it does is keep
the person the only route between one agent's output and another agent's input, and keep that route
one a person can actually read: **1.1 KB of fields, and 13 KB he opened**. That is the whole claim,
and it should be tested rather than asserted — the acceptance question attack 1 asks of a spawn
confirm is the acceptance question for this surface too.

---

## 3. Detecting the limit, which is issue 14's own open question

**The refusal this section touches: none, and that is deliberate.** Detection as specified below reads
a file the agent already wrote and starts nothing. Refusal 8 is engaged only by what a detection might
*offer* to do next, and §3.6 keeps the start on the person's press.

**Scope of the evidence.** One machine, one account, one day. Every number is from his own stores and
the shipped agent binaries on 2026-09-07, read only; nothing was deliberately exhausted, and no limit
was provoked, because provoking one costs his window.

### 3.1 What Tortie already sees, and the mechanics matter

The meter covers **two of the twelve CLI agents** Tortie launches: `USAGE_PROVIDERS` in
`src/shared/usage.ts:26` is `['claude', 'codex']`, and `src/main/agents/registry.ts` carries fourteen
entries, twelve CLI agents and two IDE ones. For the other ten Tortie knows nothing about quota, before
or after.

It has two sources and they are very different.

**The endpoint poll.** One HTTPS GET per provider to a host compiled into `src/main/usage/endpoints.ts`
— Anthropic's OAuth usage endpoint and OpenAI's `wham/usage`. It reads `five_hour`, `seven_day` and the
per-model `limits[]` rows, and codex's `rate_limit` windows, with `used_percent` and `resets_at` on
both (`src/main/usage/parse.ts`). `USAGE_POLL_MS` is fifteen minutes and main enforces it as well as
the renderer. **The renderer only asks while `document.visibilityState === 'visible' &&
document.hasFocus()`** (`src/renderer/state/usage.ts`, the `awake()` predicate). So the poll does not
run while he is away, which is exactly when a long run meets a limit. It is also **off by default per
provider**.

**The status line tap** (Phase 182), claude only. The managed script in `src/main/usage/statusline.ts`
posts at most one form body per pane per fifteen seconds carrying `five_pct`, `five_reset`,
`seven_pct`, `seven_reset`. It is live on his machine: his settings file has `usage: {claude: true,
codex: true, bar: "seven-day"}`, none of his settings names a `statusLine` so `claudeTapDecision`
installs, and the newest throttle stamp is 14:02 on 2026-09-07. That stamp is a measurement rather than
a presence check, because the script writes it *after* its `[ -n "$fp" ] || [ -n "$sp" ] || exit 0`
guard, so a stamp written today proves a payload carrying `used_percentage` was parsed out of claude
2.1.26x today and that Phase 182's key names have not moved.

**What the numbers are, and what they are not.** Percent used and a reset instant, per window. Neither
source ever carries *you are being refused*. `outcomeForStatus` in `src/main/usage/service.ts` maps 429
to `rate-limited`, but that is **the meter's own request** being limited and says nothing about the
agent's.

**And it is an account fact drawn as a login fact.** `deps.logins(provider)` means the meter reads the
credential of the *chosen* login. Since Phase 202 a session may run under a different login, and then
the meter on screen is about somebody else's plan. A limit stops every session on one account at once;
Tortie's meter follows one login.

**So Tortie does not need to detect a limit to know one is coming. It can already see the percentage
climb** — for two providers, while the window is focused, on the chosen login.

### 3.2 What each provider actually says when it refuses

**claude — the strongest signal in the product, and it is structured.** Claude Code writes the refusal
into the transcript, which is a file Tortie already resolves per session
(`src/main/overview/reader/resolve.ts`). The record is an assistant message carrying
`"error": "rate_limit"`, `"apiErrorStatus": 429`, `"isApiErrorMessage": true`, and a text block. Over
`~/.claude/projects` (19,194 files, 10 GB): **979 records with `isApiErrorMessage` in 571 files**, of
which **668 carry `error: "rate_limit"`**, across 433 files and 89 conversations, from 2026-05-29 to
**2026-09-06 — yesterday** — spanning 34 CLI versions from 2.1.154 to 2.1.263.

**But 429 alone is not a usage limit, and the vendor says so itself.** Of those 668:

| records | events¹ | what the vendor's own sentence says it is |
| ---: | ---: | --- |
| 463 | 156 | `You've hit your session limit · resets <local time> (<zone>)` — the five-hour window |
| 170 | 68 | out of usage credits, or reached your `<model>` limit |
| 12 | 5 | `You've hit your weekly limit · resets <date> at <time>` |
| 10 | 5 | monthly spend limit |
| 8 | 8 | `Server is temporarily limiting requests (not your usage limit) · Rate limited` |
| 5 | 5 | `Request rejected (429) · This request would exceed your account's rate limit` |

¹ records in one conversation, one family, within fifteen minutes, counted once.

**193 of 668 records — 28.9% — are not a time-window limit**, and 86 of the 247 events are not. Eight
of them are Anthropic writing *not your usage limit* into the error text on purpose. The other error
codes are cleanly separate: `authentication_failed` (401/403, *"Login expired · Please run /login"*),
`server_error` (500/522/529), `invalid_request` (*"Prompt is too long"*), `model_not_found`,
`max_output_tokens`. **Auth, network and limit do not collide.**

Three limits on that signal, all measured. The structured field is young and moving — 26 records from
2.0.37 to 2.0.73 carry no `error` field at all, and the `rate_limit` plus 429 pairing spans 2.1.154 to
2.1.263 only. **The reset is prose**, `resets 2:40am (America/New_York)`, not a timestamp; the
machine-readable one exists only in the `anthropic-ratelimit-unified-5h-reset` response header, and
**Tortie is not in the request path and never sees those headers** (the header names are in the shipped
binary: `-5h-utilization`, `-5h-reset`, `-7d-reset`, `-5h-surpassed-threshold`, `-status`, and an
`allowed_warning` status value — so there is a documented warning state before the refusal, on the wire,
where Tortie cannot reach it). And the transcript carries no running quota: a search of the whole
corpus for `"rate_limits"` returns **0 files**, which is why Phase 182 had to build a tap.

**codex — a better structured signal than claude's, and completely unexercised.** The `codex_error_info`
enum is in the shipped 0.153.4 binary as one string, and it separates the cases claude does not:
`ContextWindowExceeded SessionBudgetExceeded UsageLimitExceeded RateLimitExceeded … Unauthorized
BadRequest … ` with sibling fields `limit_id` and `resets_at`, and the serialized snake_case forms
(`usage_limit_exceeded`, `rate_limit_exceeded`) present too. Error events **are** persisted into the
rollout — 4 records in 25,999 files, shaped
`{"type":"event_msg","payload":{"type":"error","message":"…","codex_error_info":"internal_server_error"}}`
— so the slot exists and Tortie can read it.

And codex records its quota per turn, which claude does not. Over the 1,500 newest rollouts, **1,480
carry at least one `rate_limits` block**, 838,358 blocks in all, shaped
`{"primary":{"used_percent":2.0,"window_minutes":300,"resets_at":…},"secondary":{…10080…}}`, with
`plan_type` and an explicit `rate_limit_reached_type`. **For codex, limit state is a file read: no
request, no focus requirement, no credential.**

**But he has never hit a codex limit.** `rate_limit_reached_type` is null in **925,056 of 925,056**
occurrences across his 2026 rollouts; his five-hour maximum per rollout is median 22, p95 29, max 69,
and weekly median 25, p95 81, max 93. **His corpus holds zero `usage_limit_exceeded` records**, so that
a limit lands in that slot is inference from the same code path rather than a measurement. What Tortie
would see in the pane instead is `You've hit your usage limit.` with a `Try again at <date>` clause —
and the codex title oracle in `src/main/activity/oracles.ts` reads `idle` whenever the pane title is
the cwd basename, so a codex session stopped by a limit most likely reads *idle*, indistinguishable
from a finished turn. That last step is reasoned from the code and is **UNMEASURED**.

**The other ten — nothing, with one exemplar worth reading.** gemini distinguishes `TerminalQuotaError`
from `RetryableQuotaError` inside the CLI, keyed on `google.rpc.QuotaFailure` violations whose
`quotaId` contains `PerDay`/`Daily`, on `ErrorInfo.reason` of `INSUFFICIENT_G1_CREDITS_BALANCE` or
`MODEL_CAPACITY_EXHAUSTED`, and on `RetryInfo.retryDelay`; it persists errors as
`{"type":"error","content":"[API Error: <upstream Google JSON>]"}` — 40 such records in `~/.gemini/tmp`,
every one of them "API key not valid" (HTTP 400), so a limit landing in the same slot is **INFERRED**.
cursor-agent carries `RATE_LIMIT_EXCEEDED`, `USAGE_LIMIT`, `UsageLimitPolicyStatus` in its bundle and
its 205 store files hold none. grok (1,502 files), qwen, pi, omp, muse and deepseek hold no limit
refusal at all; every hit for "rate limit" or "429" in grok's store is his own document text or a tool
duration of 429 ms, inspected by hand. antigravity has no store on this machine; droid is not installed
and `resolve.ts` answers `no-store` for it by design.

**The exemplar is omp 18.0.11, and it is the honest picture of the state of the art.** Its whole
classifier is a cascade of lowercase substring tests — `n.includes("quota will reset")`,
`n.includes("rate limit")`, `n.includes("too many requests")`, `n.includes("presque")` — with a
companion regex over `GoUsageLimitError|FreeUsageLimitError|Monthly usage limit reached|…|billing` and
`429 || 402` as the status test, falling through to `UNKNOWN`. It matches the French word for *almost*.
A shipping product doing this job **from inside the agent, holding the raw error object**, ends up
matching strings. Tortie would be doing it from outside, on rendered pane text.

### 3.3 The verdict on distinguishability

**For claude, yes — from the transcript record, and only using the code and the sentence together. For
codex, yes in principle and unproven in practice. For the other ten, no.**

Two sharper statements, because the naive versions are both wrong.

1. **The structured code alone is not enough, even for claude.** A detector keyed on `error ==
   "rate_limit"` would have fired 86 times in 100 days on something a transfer would not fix, including
   on transient blips Anthropic explicitly labels *not your usage limit*. The working test is
   `isApiErrorMessage && error === "rate_limit" && text matches /^You've hit your (session|weekly)
   limit/`, which fires on 475 records and 161 events in his corpus and on none of the credit, spend,
   account-rate or transient records. **Its precision is 100% by construction**, because the sentence is
   what defines the class — and that is also its weakness: the real risk is the sentence changing, and
   the corpus shows both the sentence and the structured field moving inside four months.

2. **From the pane alone, no, for every provider including claude.** A pane-text classifier is what omp
   is, and Tortie would be running a worse version against a rendered TUI. Tortie has one pane-text
   route to a status today — the generic dialog detector in `src/main/activity/screen.ts`, which
   requires a rendered numbered dialog with a confirm hint — and whether claude's `/rate-limit-options`
   menu matches that shape is **UNMEASURED**.

### 3.4 The trap, which he already found and wrote down

427 of his transcript files contain the string *"usage limit"*, and the most frequent hits are **his own
orchestration briefs telling agents how to detect one**. His own standing order, recovered from those
files, says it exactly:

> A usage limit failure is ONLY an agent's LAST transcript line being an assistant text saying it hit
> a session or usage limit; the briefs contain that sentence as an instruction, so never grep the
> whole file.

**And the overshoot is measurable.** Across `~/.claude/projects`, **11,019 files contain "rate limit"
and 10,460 contain "429"**, against **571 files carrying the structured `isApiErrorMessage` marker** and
668 actual `error=rate_limit` records in all. A text search over the corpus overshoots the structured
truth by roughly **nineteen times at the file level**, before the 28.9% of real 429s that are not a
usage window.

That is the answer to issue 14's *"how would Tortie detect a limit"*: **not by reading the screen or
grepping the transcript.** Both are self-poisoning, because agents write about limits.

### 3.5 What a limit detection may and may not do to a status

The rules that bind: `CLAUDE.md` — *"needs input may only be triggered by session behavior, never by
the user's own input to that session"*; the Zen — *"no verdict ever touches a session's status"*; and
`SESSION_STATUSES` in `src/shared/types.ts:77-85`, seven values — `running`, `idle`, `needs_input`,
`exited`, `restorable`, `unknown`, `discarded` — whose design rule is that each later phase adds a
producer, not a member.

**May.** A limit the agent renders as a dialog in its own pane already reaches `needs_input` through the
existing screen detector, legitimately, because the session really is blocked on the person. That path
needs nothing new and must not be special-cased.

**May not.** Set any status because a *poll* said a number — the meter is outside the session, and a
percentage crossing a threshold is not the session doing anything. Set any status because a *transcript
record* was read — that is Tortie reading files, which is evidence about the session and not the
session's own publication of its state, and it arrives at file-watch latency. Add a member: `limited`
is not a status, because a limited session is alive, is not `exited` and is not `unknown`. Or reuse
`needs_input` to get attention, which would make the tray and the dock lie.

**The shape that fits** is the one `Session.restore` already established for provenance rather than
liveness: a fact carried **beside** the status, which the row may draw and the status field never
learns about.

### 3.6 The UX designed to that answer rather than to a wish

1. **Make the meter honest where it is cheap and true.** Codex's quota is in a file Tortie already
   resolves, on 1,480 of the 1,500 newest rollouts, fresh on every turn, with no request, no focus
   requirement and no credential read. Reading the rollout instead of — or as well as — polling OpenAI
   every fifteen minutes while focused is strictly better, and it is not a limit detector at all. It is
   the smallest true thing in this section.
2. **Never fire anything on a percentage.** It is a forecast, the poll behind it is stale exactly when
   it matters, and it is about a login rather than about the session that stopped.
3. **Fire only on a refusal the vendor wrote down, and require two conditions from it** — §3.3's code
   *and* sentence for claude, `usage_limit_exceeded` for codex when one is ever seen. **For the other
   ten, detect nothing and say nothing.** A blank is honest; a wrong caption is not.
4. **What the person sees is one line where they already look**, in the vendor's own words, naming the
   window and the reset — *Five-hour limit, resets 2:40am* — clearing itself when the next normal turn
   lands in that transcript. No modal, no status change, no sound, no automatic anything. This is the
   Zen's *"speaks only when something is worth the human's attention"*, and a limit his agent is about
   to wait out on its own is not worth an interruption.
5. **The transfer action is offered on every session, always, whether or not anything was detected.**
   This is the load-bearing recommendation rather than the fallback. It needs no per-provider work,
   covers all twelve agents including the ten Tortie is blind to, cannot fire on a blip, cannot be
   broken by a vendor rewording a sentence, and the person confirming is already the person who
   decides. **Detection then does one job: it saves him noticing. It never decides.**

**And the finding that should change how the transfer half is scoped: the provider Tortie can detect
best is the one that needs transfer least.** §5.4 measures why.

---

## 4. Delegation, and the refusal argued

### 4.1 What he is already doing, without Tortie

**792 of his claude transcript files, across 19 project directories, carry
`<teammate-message teammate_id=`, 2,430 occurrences, from 2026-02 through 2026-09.** Claude Code's
agent-teams feature is already in heavy use in his work, and Tortie's own overview reader had to learn
to drop those records. Codex ships the same thing as tools: in the pinned corpus its calls include
`spawn_agent` 9, `wait_agent` 9, `list_agents` 7 and `send_message` 55, alongside 265
`sub_agent_activity` events and 109 `inter_agent_communication_metadata` records. Both vendors also
ship a non-interactive door into a running session — `codex queue --thread <uuid> --message <TEXT>`,
and claude's `--bg`, `claude attach`, `claude agents`, `claude stop`, `claude respawn`.

That measurement reframes the delegation question. **He is not blocked on the ability to delegate.**
Delegation reached him through the providers. What he does not have is that those teammates are
**invisible to Tortie**: they are not sessions, they have no durable name, no manifest row, no status
dot, no restore, no place in the tab spine. His work is happening in a shape Tortie cannot see.

**So the gap is visibility, not spawning — and visibility touches no refusal at all.**

### 4.2 The refusal, argued

§0.2 stated the answer. Here is the argument, and then the attacks, because the charter's named
independent method is that the recommendation gets attacked rather than confirmed.

**Why the herdr shape must be refused.** It is not that an API is dangerous in the abstract. It is
these four facts together, all measured in §1.5:

1. The authority granted is arbitrary argv, arbitrary cwd, arbitrary env, and edits to the person's own
   agent configuration files.
2. The only gate is file mode `0600`, which is satisfied by every process the person runs.
3. There is no way to turn it off, scope it, or grant one action.
4. The documented safety rule is an instruction to a language model.

**And the premise refusal 8 rests on measures larger than the word "several" suggests.**
`src/main/agents/flags.ts` catalogues **21 flags marked `danger: true` across 10 of the 12 launchable
agents in `AGENT_FLAG_PRESETS`**, of which **16 carry `provenance: 'VERIFIED'`** and 5 `'RESEARCH'`,
meaning the exact flag was read out of that agent's own help text. Only droid and pi carry none. So
the premise is not that a couple of agents can be run unsafely; it is that unsafe launch is the
ordinary, catalogued, one-checkbox condition of **five agents in six** of the ones Tortie can start.

**That sentence read `27 … across 13 of the 15` until the fix round and the correction is the lesson
rather than the number.** 27, 22 and 13-of-15 are the sums of TWO constants attributed to one of
them. `AGENT_FLAG_PRESETS` (`:124`) holds the 12 launchable registry agents and carries 21 danger
flags, 16 VERIFIED and 5 RESEARCH, in 10 of its 12. `NON_REGISTRY_FLAG_PRESETS` (`:603`) holds three
more — amp, opencode and copilot — with 6 danger flags between them, and its own header says they are
*"NOT consumed by the create-session modal while they remain outside the registry"*. They are CLIs on
this machine that Tortie cannot launch at all, so counting them inside a sentence about *"nearly every
agent Tortie starts"* inflated the premise with agents the premise is not about. §10 marked the figure
**[I]** — re-derived by the integrator per object — which is what makes it worth writing down: a
re-derivation that reproduces the lane's arithmetic because it inherited the lane's boundary is the
class `CLAUDE.md`'s known-hosts paragraph exists to forbid. The re-derivation here is a brace-matched
parse of both constants separately (`.p223/fix/flags-parse.py`), and it prints the per-agent table so
the boundary is visible rather than assumed. **The conclusion is unchanged and is proportionally
stronger**: 10 of 12 is a higher share than 13 of 15. Only the count of agents the claim covers moved,
and it moved downward, toward the agents the refusal is actually about. The two that matter most were checked against the installed CLIs by `--help` alone, no turn
spent: `claude --dangerously-skip-permissions  Bypass all permission checks` and `codex
--dangerously-bypass-approvals-and-sandbox  Skip all confirmation prompts and execute commands without
sandboxing. EXTREMELY DANGEROUS`.

Tortie cannot make choice 1 without contradicting `CreateSessionInput`'s own design: research 67 §5.4
already listed arbitrary argv, `extraArgs`, arbitrary env, arbitrary cwd and `startAnyway` as things a
v1 must never accept, and it was right. Tortie cannot make choice 3 at all, because a capability that
cannot be turned off is not a capability, it is an attack surface with a manual.

**Why "an agent may propose" is not the same thing.** A proposal starts nothing. Its worst case is that
an agent queues proposals a person does not want, which is a nuisance against their attention and not a
change in what runs on the machine. That is a bound the Phase 23 reasoning can live with, because the
escalation refusal 8 names — *an increase in privilege* — requires something to start.

**If that shape is ever built, two clauses narrow it, and the narrowing is the recommendation.**

- **Reach is refused outright and permanently.** An agent may never send text, keys or a prompt into
  another session, its own included. *Start* is confirmable one act at a time; *reach* fires
  continuously and cannot be confirmed without a dialog per keystroke, which nobody would read.
- **A proposal carries intent and text, never argv.** It may name what should be continued and why, and
  may carry prompt text. It may **not** carry `extraArgs` (`src/shared/types.ts:537`), may not carry a
  flag, may not select a login, may not carry `machineId` (`:566`), and may not name a working
  directory outside the proposing session's own project root. Everything execution-bearing is chosen by
  the person at the create dialog they already use, from the catalogue the compiled world already
  contains. That is Phase 23's boundary sentence applied unchanged, with the strictest reading given to
  the least trusted writer in the system.

**Why the confirm must show what the create sheet shows.** Phase 86 exists because a person could press
⌘T and Return and start an agent with `--dangerously-skip-permissions` without ever being told, and its
fix was that one expression — `activePresets` — feeds both the summary's count and the argv that is
sent, so the two cannot disagree (`src/renderer/app/__tests__/create-options.test.ts`). A confirm for an
agent's proposal that shows less than that sheet is a regression against a defect the product already
fixed.

**The in-repo siblings already have the right shape and both are shipped.** `src/main/skills/run.ts`:
*"Nothing installs without a human confirming it, and the confirm shows the full command line…
`executeSkillsPlan` is the only thing that spawns… A one-call `install()` would make the confirmation a
convention that a later round could forget. Two calls make it the only route."* And
`src/main/manifest/reconstruct.ts` is closer still: there is no boot path into it at all, a caller
surveys, a person reads a plan, and `applyReconstruction` requires the exact acknowledgement constant
plus a **single-use token issued by the survey** (`:387-395`, `:662`, `:671`, `:683`), *"so a caller
cannot synthesise a plan and apply it blind, and cannot apply the same plan twice."* **A
machine-produced proposal that only a person can enact is already how Tortie adopts sessions.**

### 4.3 Attacking the recommendation, which is the point of this section

Assume agent A is compromised, or merely confused by a poisoned file it read, and can write whatever it
likes into whatever interface exists.

**Attack 1 — the confirm is a rubber stamp.** If an agent proposes three sessions and he clicks yes
three times a minute, the gate is theatre. **This attack lands, and it is the strongest one.** The
mitigation is not a budget, because a bounded rubber stamp is still a rubber stamp. It is that the
confirm must carry information he does not already have. If the dialog is short enough to skim and
complete enough to decide from, the gate holds; if it degenerates into "Allow? [Y]", it does not, and
the feature should be pulled rather than tuned. **A build phase must state, as an acceptance criterion,
what a person learns from the dialog that they did not know before it appeared.** This is empirical,
not a design question.

**Attack 2 — spawn with the safeguards off.** A asks for claude with
`--dangerously-skip-permissions`, or codex with `--dangerously-bypass-approvals-and-sandbox`. *herdr
does not stop it*: `start_agent` (`src/app/agents.rs:145`) validates args for control characters at
`:159` and composes `argv = [executable, ...args]` at `:197`; there is no denylist and no danger
catalogue, and herdr knows what such a pane looks like, because `(bypass permissions on)` is a
detection fixture at `src/detect/manifest/tests.rs:314`. *The proposal shape stops it only by the
no-argv clause, and a confirm dialog would not have.* This is the attack that proves display is not a
control: Tortie's danger seal exists (`src/main/settings/store.ts:307-346`) precisely because a
settings file an agent can write could pre-check the danger flag **and pre-fill the acknowledgement
beside it**. A proposal that shows `--dangerously-skip-permissions` and asks "start this?" is farming
exactly the click the seal was built to make unforgeable.

**Attack 3 — "same agent as the parent" propagates a dangerous posture.** If the child copies the
parent's launch plan, one human confirmation of that posture for one session silently becomes N.
**Lands.** The child's argv is composed from the registry defaults plus what the person confirms,
**never inherited from the parent**. The proposal names an agent and a task; the flags are the
person's, every time.

**Attack 4 — spawn in a directory the person did not intend.** `~/.ssh`, `~/.claude`, another
repository. With attack 2's flags this is read and write. *herdr does not stop it*: `pane split --cwd
<anything>` is the documented call and the only guard is prose in `SKILL.md` asking the model to
preserve `$PWD`. *Stopped by constraining cwd to the proposing session's project root* — a free-text
path with a confirm on it is the same attack with an extra step, because a plausible path is what a
person clicks past.

**Attack 5 — one agent gets another to do what the person refused it, and it is not about starting
anything.** A is denied a tool by its own permission configuration; B is running with its safeguards
off on the same screen; A prompts B. *herdr does not stop it, and the last safeguard inside the agent
is answerable over the socket.* `agent.prompt` refuses a blocked agent — that guard is real. **`agent.
send_keys` has no such check**: `handle_agent_send_keys` (`src/app/api/agents.rs:315`) resolves the
target, confirms the pane hosts the expected agent, encodes the keys and writes, and never asks whether
that agent is blocked. *(Re-read line by line by the integrator; the guard is genuinely absent.)* So
one agent can send `enter` to another agent's permission prompt. And beneath the agent layer entirely,
`handle_pane_send_text` (`src/app/api/panes.rs:1801`) writes arbitrary bytes to any pane's PTY with no
validation of any kind. **This is why reach is a permanent refusal rather than a confirmable act.**

**Attack 6 — the delegation loop.** A proposes B, B proposes C, each plausible alone. *herdr bounds
nothing*: its 27 `MAX_*` constants bound parse depth, layout apply size (`MAX_LAYOUT_PANES: 24`,
`MAX_LAYOUT_DEPTH: 16`, `src/app/api/layouts.rs:15-16`), matcher counts and metadata keys, and none of
them bounds how many agents may be started or how deep an agent-started agent may delegate. *Bounded
under the proposal shape by the only thing that can bound it — a person's clicking.* A loop that
produces proposals produces a list, and a list that grows without being enacted is visible and inert.

**Attack 7 — exhaust the usage quota.** *herdr does not stop it. Tortie today would not either*:
`src/main/usage/service.ts` reads a meter and enforces no budget, and no code path refuses a create
because a meter is low. Under the proposal shape the bound is human click rate. **And the reflexive
point is worth stating in his terms: issue 14 is a report about running out of quota, so a delegation
feature that can burn quota unattended makes the reported problem worse.**

**Attack 8 — the capability is a bearer secret, so the principal is wrong.** Any token in the pane
environment is readable by everything the agent runs, including a `Bash` call and anything it
downloaded. "The agent" is not a principal; "everything in that pane" is. *Lands against the herdr
shape; survived by the proposal shape*, because the worst a stolen proposal token can do is queue a
proposal, and every proposal meets the same human.

**Attack 9 — the one nobody named, and the one a build would walk into first.** **Tortie already binds
an agent-reachable HTTP surface in main.** `src/main/activity/hooks.ts` creates a server on `127.0.0.1`
(`:237`, `:241`), routes on `/^\/([hu])\/([0-9a-f]{32})$/` (`:386`), and writes the 128-bit token into
the agent's settings file as a URL (`:526`); the file is `0o600` (`:861`) and that is the whole
authentication. The path rides on the agent's own argv via `--settings`, baked into both argv and the
armed resume argv, so an in-pane agent can read its own command line and post. Today that channel can
move a status glyph and a usage number, which is bounded on purpose and is why refusal 5 exists. **The
finding is what happens next: this is the cheapest place in the codebase to add a "start a session"
route, it already exists, it already has a token, and it would bypass the confirm gate by
construction.** Any delegation build must name this channel as refused ground before somebody reaches
for it, and the reason is attack 2's reason — **`0600` does not separate the person from their agents,
because the agents are the person.**

**Attack 10, against the refusal rather than the recommendation — is refusing this just caution that
costs him a working feature?** Fairly asked. The answer is reversibility. A refused remote view costs a
person a read. A spawn that should not have happened has already run a process with write access to his
home directory, and there is no undo. Refusals belong where the mistake cannot be taken back.

**One thing the attack section must concede, because it is measured rather than assumed.** **An agent
inside a Tortie session can already start an agent process today.** It has a shell. The adjacent half
was measured on a scratch tmux socket (`.p223/forge-probe.sh`, socket `p223-forge-<pid>`, killed in a
trap; socket `gmux` never contacted): an ordinary process running as the user can create a session on a
named tmux socket and stamp it with `@gmux-id`, `GMUX_SESSION_ID` and `GMUX_MANAGED`, all of which read
back exactly as written. The identity stamps are not secrets and the socket name is in the repository.
**So the marginal thing an agent-callable spawn adds is not the process. It is Tortie's durable
machinery carrying it — a manifest row, restore across reboot, a name, a tab, and the person's belief
that everything in the tab spine is something they started.** That last item is the real asset, and it
is exactly what the confirmation protects. Nothing in the tree currently lets a forged tmux session
become a row: `reconstruct.ts` states that adoption is a person's decision, and that *"a live session
that carries neither an `@gmux-id` nor a `GMUX_SESSION_ID` is NOT OURS… there is no decision, no option
and no flag that turns it into a row."*

**Attack 11 — he does not need it.** 792 files and 2,430 teammate messages say he is already
delegating. **This attack lands hardest of all**, and it is why §7 does not recommend building the
broker.

### 4.4 The three shapes, priced

**Shape 1 — the herdr shape, a full agent-callable control API.** *Buys* the highest value of the three
and it is not close: real fan-out, no human in the loop, and the wait primitive that makes multi-agent
orchestration work rather than poll. *Costs* three refusals, not one — 8, because every act is inside an
agent turn; 2, because an agent-facing control surface is a published contract by definition, and
10,859 lines of committed JSON Schema is the precise thing refusal 2 was written about after bb froze
65 prop types and deleted them the next day; and 5, because `pane.report_agent` is a caller setting a
session's state. **Not buildable. Recommend refusing it permanently and recording it beside refusals 2,
5 and 8 so a later round does not re-open it as a convenience.**

**Shape 2 — propose-and-confirm, narrowed by §4.2's two clauses.** *Buys* transfer **completely** — the
inert record is exactly what carries work from a rate-limited claude to a codex — and delegation
**partially**: work gets queued, described and pre-filled, and the person presses start. *Costs* one
new durable record type, one surface, and a confirmation that must not become a habit. The real risk is
not technical: it is fatigue, and fatigue is bounded by scarcity, which is a design constraint on the
feature rather than a property of it. The second honest cost is that **it does not give fan-out without
attention.** It gives queued work, not autonomous work, and anyone hoping delegation means the agents
get on with it will be disappointed by design. **Buildable with the refusal intact, and it requires no
widening of anything.**

**Shape 3 — refusing outright.** *Buys* zero new attack surface, zero new UI, the Zen unchanged, and
attack 9's channel staying a two-route status channel forever. *Costs*, and this is where the two
halves of his ask separate: refusing **delegation** costs him very little, because the person can
already do it by hand — read what the agent wrote, open a session, paste — so the delta is convenience,
and convenience is the exact currency refusal 8 says not to pay in. Refusing **transfer** costs him the
thing he actually reported, and **transfer needs no agent-callable anything at all**: it is a record, a
person, and the create path that already exists.

**The recommendation, stated so he can act on it.** Build the transfer artifact. Refuse delegation as a
callable interface, permanently and by name. Note that transfer built as an inert proposal *is*
delegation minus one keypress and one pair of eyes — and that keypress is the entire security model, so
it is not a corner worth cutting later.

### 4.5 If the proposal shape is ever built: what a person sees, and the trail

*Answering the question the charter asks, not designing the API.*

**When they see it.** Never an interruption at the moment a proposal is written, because a proposal that
interrupts is a supervisor's console with a nicer name. A proposal is a quiet, durable, inert thing a
person finds when they next look, in the surface that already answers *what needs me now?*. Enacting one
opens the create dialog they already know, pre-filled with the parts a proposal is allowed to carry and
**blank in the parts it is not**, so the person's hand is on every field that decides what runs. Just
enough words: who proposed it, what it is for, one line.

**The trail.** A proposal is only useful as evidence if it survives the thing that produced it, so it is
durable and is never deleted by being enacted. It records the session that proposed it, the text as
written, when it was written, when a person acted, and what the person actually chose — because what
they chose will differ from what was proposed, and **the difference is the interesting record**. A
session started from a proposal says so on its own row, permanently, and that provenance is not a field
an agent can write. It is the answer to the only question that matters after something goes wrong: *did
I start this, or did something else ask me to?*

**Where a proposal is WRITTEN, which the first draft never said.** This is the fix round's, and the
gap it closes is the one most likely to be filled badly: across the 1,465 lines this document had at
the parent commit it named exactly one channel, attack 9's loopback server, and named it only to
refuse it. Its permitted half —
*an agent may only PROPOSE* — had no mechanism anywhere, one paragraph after naming the cheapest place
in the codebase to break the refusal. A refusal whose permitted side is unspecified is an invitation.

**The channel already exists and it is the agent's own transcript.** Tortie resolves one per session
today — `resolveSessionLog` in `src/main/overview/reader/resolve.ts` has a case for eleven of the
twelve CLI agents, droid alone answering `no-store` by design — reads both sides of every turn, and
redacts them through `src/main/overview/redact.ts` before anything is stored. A proposal written as
**ordinary agent output** therefore needs no listener, no port, no token, no route, no schema
published to anyone, and **no file an agent can write that Tortie was not already reading**.

**Its privilege delta is exactly zero, and that is the whole argument.** An agent can already write any
sentence it likes into its own transcript; writing sentences is the only thing it does. It gains no
capability by one of those sentences being noticed. Compare every other shape: the loopback route hands
the agent a caller, a socket hands it a caller, a configuration directory hands it a writable input to
something Tortie acts on. Here the agent's reach is unchanged and only **Tortie's reading** changes.
So *a proposal starts nothing* stops being a promise a later round can spend and becomes a **property
of the mechanism**: there is nothing to call.

**Three honest limits, so this is not sold as free.**

- **The marker is forgeable by anything the agent reads.** A poisoned file can contain it and an agent
  can echo it, so a proposal is not evidence that the agent decided anything. This is survivable only
  because a proposal is inert: the worst case is a list that got long, which §4.3 attack 6 already
  bounds and §4.2 already prices as a nuisance against his attention.
- **It is the closest this shape comes to refusal 2, and it must be named rather than waved past.** A
  documented marker is a surface somebody outside Tortie writes to. It is not a contribution point: it
  registers nothing, dispatches nothing, decorates nothing, re-exports no internal type, and carries no
  field that decides what runs — §4.2's no-argv clause is what keeps that true. **The day a marker
  carries a flag, a login, a machine or a path, it is refusal 2 and refusal 8 at once**, and that is
  the line a build phase states in its brief.
- **It arrives at file-watch latency and only where a store resolves.** Eleven of twelve, not twelve,
  and never instantly. A proposal is not a message.

**When a delegated agent delegates.** It proposes, exactly like any other agent, and a person confirms,
exactly like any other proposal. Research 67 §5.5 recommended depth one; under this shape the question
mostly dissolves, because **there is no chain**: every link is a human act, so the chain is a list of
things a person did. The one thing that must not exist is a proposal auto-confirmed because its
parent's was confirmed. **Consent does not inherit.** Provenance is still recorded transitively, so a
fan-out that starts to look like a tree is visible as a list that got long — a signal a person can act
on, rather than a tree nobody is watching, which is not.

---

## 5. The Zen read

The five questions in the brief, answered in the Zen's own terms.

### 5.1 Does delegation multiply agents without multiplying attention, or produce a tree nobody is watching?

**It produces the tree, unless the delegated agents become ordinary Tortie sessions — and what decides
it is whether the child gets a durable name, a manifest row and a status dot, not whether it gets a
pane.**

The Zen's goal is *"It lets more agents work without demanding more vigilance from the human."* Its
nightmare, two paragraphs later, is *"Not a supervisor's console. Tortie never asks the human to watch
an agent work."* Those are the same sentence read from two sides, and the thing that separates them is
whether Tortie can answer **what needs me now?** about the new agent. A child that is a full Tortie
session raises its hand when it is blocked and stays quiet otherwise, so it costs no vigilance. A child
that is a pane, or a provider-internal teammate, cannot raise its hand, so the only way to know what it
is doing is to watch it — which is the console the Zen refuses.

This is exactly the state he is in today, measured: 2,430 teammate messages in agents Tortie cannot
see. **He already has the tree. He does not have the hands.**

### 5.2 A transferred conversation against "boring, inspectable and older than this product"

It fails, and not narrowly.

A resumed session is inspectable in the strongest sense: the conversation is the same because it is
literally the same file replayed, and anyone can open it. A transfer's fidelity is not inspectable by
anybody — §2.1 shows the vendor's own importer silently dropping thinking with an empty match arm,
truncating tool results at 4,000 characters, replacing an image with `[external unsupported block:
image]`, and re-roling a user record as an assistant one. Every one of those is defensible and none is
visible in the result. And it is the opposite of *older than this product*: the mechanism would be a
per-provider rewriter against undocumented formats that move under it, and this corpus spans 34 CLI
versions in three months.

**What has he lost if the handoff was lossy and he did not notice?** Not facts — §2.5 measured 88.4% of
tool traffic acting on the working tree, which is still there and fresher than the transcript. He has
lost **the decisions**: the constraint stated eleven turns ago, the approach tried and rejected, the
thing he said not to do. And the failure mode is the quiet one. A second agent missing a fact fails
loudly, because it reads the file and finds out. A second agent missing a decision **redoes work that
was already done, or redoes the thing that was already ruled out**, confidently, and he finds out at the
diff. That is a worse failure than stopping.

**And §2.4b is the same sentence with the sign flipped, which is why it belongs here rather than only
in §2.** A lossy handoff omits a decision. A line-sequential handoff **states a decision that was
reversed**, in his own words, indistinguishable from one that stands. The receiving agent cannot fail
loudly on that one either, and it has strictly more confidence than the omission gives it.

### 5.3 Is transfer an extension of "the application may come and go, the session continues"?

**No. It is a different promise wearing that one's clothes, and the document must say so where he can
read it.**

The shell promise is verifiable and Tortie keeps it by *not* being involved: the process survives
because tmux owns it, and the conversation resumes because the same bytes are replayed by the same
agent. Nothing is claimed that cannot be checked.

A transfer claims that a second agent knows what the first knew. **Nobody can check that claim** — not
the person, not Tortie, not the receiving agent, which has no way to know what it was not told. It would
be the first unverifiable claim in a product whose Zen ends *"Nothing important gets lost."*

So the language matters more than the mechanism. A transferred session must never be presented as a
continuation, must never inherit the original's name, and must never carry a status implying the work
came with it. **A retelling, labelled a retelling.** Codex's own importer, which writes a new `ThreadId`
and a marker rather than pretending to resume, has this right.

### 5.4 What does he actually need? Read issue 14 again

He was working, he hit a five-hour limit, and the work stopped.

**Measured, on claude, the work does not stop.** 2.1.263 ships `autoContinueAtUsageLimit` — *"wait for
the limit to reset and continue the task automatically"* — plus `/rate-limit-options` and a
lower-priority mode. His own transcripts carry the CLI's own line:

> `Usage limit reached · continuing automatically at 9:50pm · esc or type to cancel`

and, when the window resets, the CLI injects:

> `Your claude.ai usage limit has reset. Continue the task you were working on when the limit was
> reached; do not repeat work that is already complete.`

— **53 occurrences of that exact sentence** in his store. The binary also ships the exceptions: the wait
does not happen when the reset is more than 24 hours out, when the session moved to the background, or
when Claude Code relaunched during the wait.

**The one thing that defeats that behaviour is the process dying, and that is precisely the thing Tortie
already prevents.** A person whose terminal is a window loses the wait when they close it. A person
whose session lives in Tortie's tmux server does not. Issue 14's literal case, on claude, is already
covered by the promise Tortie has been keeping since Phase 1 — and nobody has ever told him.

The counter-evidence, and it is his and it is real: of 70 top-level transcripts whose last window limit
is known, **33 continued in the same file and 37 ended there**, with gaps where it continued of 1, 1, 1,
1, 2, 3, 5, 5, 6, 11, 12, 12, 27, 43, 55, 55, 57, 64, 99, 146, 165, 184, 236, 331, 587, 669, 769, 916,
918, 1893, 1958, 4487 and 17107 minutes. The "ends there" number is an **upper bound** on abandoned
work, since a resumed conversation may continue in a new file. But it is not zero, which is why the
answer is a warning before the limit as well as a sentence after it.

What is genuinely missing is smaller and is Tortie's own fault. `SESSION_STATUSES` has seven values and
**none of them means "parked on a clock until 9:50pm"**, and nothing in `src/main/activity/` knows a
usage limit exists. So a session waiting four hours for a window to reset looks exactly like a session
that is working, and he cannot tell them apart by looking. That is the honest gap, and the honest answer
to it is a sentence beside the status, not a transfer and not an eighth status.

**And the cost is real and it is his**: 156 five-hour-limit events in 100 days, 37 of 70 top-level
transcripts ending at the limit, and 250 sub-agent transcripts stopping there. Whatever is built, it is
being built for something that happens to him roughly every other day.

**The smallest honest answer to issue 14 is therefore three things, in this order: tell him it is
coming, tell him a waiting session is waiting and when it will move, and keep the session alive so the
wait completes — which is already true.** A transfer is the largest possible answer to a question whose
smallest answer he does not yet have.

### 5.5 The same question for delegation

**The smallest thing that would help is not a spawn interface. It is telling him which of his sessions
has a team behind it.**

He runs teams already, 2,430 messages of them. Tortie's per-provider reader already parses
`<teammate-message>` well enough to drop it. Turning *this session has spawned teammates, and how many
have spoken since you last looked* into one derived bit on the session row costs almost nothing, needs
no new refusal, breaks no existing one, and answers the Zen's one question about work he currently
cannot see at all.

**And it is not the thing the issue describes.** The issue describes an agent calling Tortie to create a
session. That is the largest version of the need. The smallest version is that the agents he has already
created become visible where his work lives.

---

## 6. The smallest honest answers, stated plainly

| His need | The smallest honest answer | Why not more |
| --- | --- | --- |
| "I hit a five-hour limit and the work stopped" | **Tell him before it happens.** The meter already holds `used_percent` for claude and codex; a warning at a threshold he sets costs one comparison | It changes what he does, at nearly zero cost, and it is the only intervention that happens while he can still act |
| "I could not tell what the session was doing" | **A sentence beside the status: parked on the usage limit, continuing at 9:50pm.** claude's source is the structured record plus the sentence family; codex's is the `rate_limits` block already on disk | Seven statuses and none says this. It is a one-line honesty fix for a four-hour silence, and it must not become an eighth status |
| "The work stopped" | **It mostly did not, and the reason is Tortie.** Say so in the docs and the release notes | Nothing to build. He does not know a promise he already has is being kept |
| "I want to continue in another agent" | **A briefing he reads and edits, that starts nothing and is sent nowhere** | Every stronger mechanism claims a fidelity nobody can check |
| "I want an agent to start sessions" | **Show him the teammates he already has** | He is not blocked on spawning; he is blind to what he has spawned |

---

## 7. The honest total: what to build, in what order, what never, and roughly what it costs

Phase counts are judgement, not measurement, and are stated in the units the backlog uses.

### Refuse, permanently

**R1. An agent-callable interface that starts a process.** The herdr shape, and any shape where an
agent's request results in a launch. §0.2 states the new answer; §4.2 argues it; §4.3 attacks it.
**Recommendation: he adds it to `CLAUDE.md` as a ninth refusal in his own words.** This document may
recommend that and cannot do it. Name attack 9's loopback channel in the same breath, so the cheapest
place to break the refusal is refused ground before anybody reaches for it — **and name the permitted
side in the same sentence** (§4.5), being the agent's own transcript and nothing else, because a
refusal that says only what is forbidden gets a mechanism invented for it by whoever needs one first.

**R2. Reach between sessions.** Even under a proposal shape, an agent may never send text or keys into
another session. §4.3 attack 5 is the reason, and herdr's own `agent.send_keys` is the proof that the
guard on one door does not guard the next.

**R2 binds the CALLER absolutely and the CONTENT conditionally, and the fix round is writing that down
because the document contradicted itself without noticing.** As first written R2 said *"its own
included"* while §7 B5 said the briefing, whose model half is written by an agent, *"goes through the
existing `typeIntoPane(…, false)` path"*. Agent-authored text reaches another session's input in both;
only the caller differs — and §4.3 attack 5's harm is **content**, not caller, since `agent.send_keys`
is refused for what arrives rather than for who asked. One sentence settles it and it is the stricter
of the two readings:

> **No agent-issued request may ever cause Tortie to send anything into any session, and no text may
> reach a session's input until a person has seen it in a surface where they could change it. The
> caller is always a person; the author may be a model, and only after the person has read what the
> model wrote.**

The first clause is absolute and is what refuses `agent.send_keys` in every form. The second is what
B5 must satisfy, and §2.8 is what it costs. **Text an agent wrote that no person read never moves**,
which is the property both halves of R2 were reaching for.

**R3. A cross-agent store replant.** Phase 82's refusal stands and §2.1 strengthens it. The one vendor
who built this decided the honest answer was flattened prose in a new thread with a new id and a
marker; a Tortie replant claiming to be a continuation would claim more than the receiving vendor does.
**Write down the read-only posture too** (§0.3), and write it with the word §0.3 uses:
`src/main/overview/` and `src/main/manifest/harvest/` have never written a byte into a provider's
**conversation** store, and that is a property worth naming before it is spent. **The scope is not
decoration.** An earlier draft of this line dropped *conversation* and dropped the two directories,
and the sentence it left behind would be false the moment it was copied into `CLAUDE.md`:
`defaultStoreTarget` at `src/main/credentials/stores.ts:311` has written the vendor's own default
CREDENTIAL store for both providers since Phase 211, deliberately and at his instruction, being
codex's `auth.json` and claude's own keychain item. The refusal is about the transcript, and it is
worth having precisely because a credential write already exists a few directories away.

**R4. Automatic transfer of any kind.** No mechanism moves a conversation without the person reading
what moved. §5.3 is the reason.

**R5. Limit detection by reading the screen or grepping the transcript.** §3.4. Agents write about
limits, the overshoot is nineteen times at the file level, and 28.9% of his own 429s are not the thing
he means.

### Build, smallest first

**B1. The approaching-limit warning.** Tier 2. About **one phase**. The meter has the number; the work
is a threshold, a sentence and a place to put it. Refuses nothing, touches no session state. Fold in
the cheap honesty fix from §3.6.1 — read codex's quota from the rollout, which needs no request, no
focus and no credential — because it is the same surface and it makes the number true while he is away.

**B2. The waiting sentence.** Tier 2, and Tier 3 only if it touches session status, which it must not.
About **one phase**. This is a *note beside the row*, not an eighth `SessionStatus`, because a limit
wait is not a lifecycle state and the frozen status rule should not be reopened for it. A build brief
must carry §3.2's family table and §3.5's may/may-not, because 429 is not the question.

**B3. Say when a session has a team behind it.** Tier 2. About **one phase**. One derived bit from a
reader that already parses the tag. Nothing new is spawned, nothing new is stored, no refusal moves.

**B4. Tell him the promise he already has.** Tier 1. Part of another phase's commit. A CHANGELOG entry
and a docs paragraph saying that a session parked on a usage limit keeps waiting in Tortie and continues
by itself when the window resets — with the limit in the same sentence: it is claude's behaviour, and it
needs the process to stay alive.

### Build only if he asks for it, and narrowly

**B5. The handoff briefing.** Tier 2, and Tier 3 if it ever types into a pane. About **two phases**, one
for the composer and validator and one for the surface. A second recipe on Phase 138's existing fold
machinery (`src/main/overview/fold/`), which already spawns one shot of his own confirmed agent on a
prompt he can read, validates the answer, and **refuses the whole answer rather than trimming it**. The
fold's own prompt is deliberately the opposite of a briefing, so this is a **new recipe, not a reuse**.

Its bounds, and they are the whole design:

- It writes a **document**, opened in the editor, that he reads and edits.
- It **starts no session, sends nothing anywhere, and names no agent**. He carries it. If it is ever
  delivered into a pane, it goes through the existing `typeIntoPane(…, false)` path, under R2's second
  clause: the delivery is issued by the person and never by any agent, and **the confirmation is the
  document he opened, not the Enter he pressed** (§2.8).
- It is never called a continuation, never inherits a session's name, and the surface says in words that
  a second agent is being **told about** the work rather than **given** it.
- The deterministic half is composed first and always — agent, directory, branch, commit, the asks, the
  last answer, the files touched — because it is ~1.1 KB, invents nothing and costs no turn. The model
  half is an addition to it, written by the receiving agent or a third, **never by the agent that just
  ran out**.
- **The asks are the LIVE asks and this is an acceptance criterion, not a detail.** §2.4b measured that
  a claude transcript is a `parentUuid` DAG carrying turns the person rewound past, that `parentUuid`
  appears 0 times in `src/`, and that the reader this bullet would reuse
  (`src/main/overview/reader/lines.ts`) is line-sequential by construction. A briefing that lists
  `do all of that and push commits to the CLI` beside the `do all of that and locally commit first
  please` that replaced it is worse than one that says nothing. The composer walks back from the last
  record and takes that chain only, and a build phase proves it against the 70 files §2.4b names.
- It is composed from what the overview store already holds redacted plus the repository state, and
  **never from the tool trace**, because §2.5 shows the tool trace is recoverable from the repository
  and §2.4 shows it is 78.57% of what is lost anyway.
- Whichever mechanism is chosen, the manifest gains one field and the card one line saying where the
  work came from (§2.7).

**Not built, and named so a later round does not smuggle it in:** the broker, the CLI, the socket, the
capability token, the placement intent, and every other piece of research 67's Stage 1. Research 67's
architecture remains correct as architecture and it stays unbuilt, because §4.1 measured that the demand
it was designed for is already met by the providers, and §4.3's attack 11 is the reason.

---

## 8. What would change my mind

Stated per conclusion, because a recommendation that cannot be falsified is an opinion.

| Conclusion | What would overturn it |
| --- | --- |
| Refuse the agent-callable spawn (R1) | A confirmation surface that demonstrably teaches him something at the moment he confirms — measured, by having him use it and asked afterwards what he learned — plus a shape where the child's flags cannot be inherited. Attack 1 is the one to beat, and it is empirical |
| The proposal shape is safe enough | A path by which a queued proposal causes a start without a distinct human act. If one exists, the answer collapses back to a flat refusal |
| Delegation demand is already met (§4.1) | Him saying he wants Tortie to start them, having read §4.1. This is his product; a measurement of what he does is not a substitute for what he wants |
| Transfer is a different promise (§5.3) | A way for a person to CHECK that a transferred conversation carries what the original did. I could not construct one and neither did the vendor who shipped the importer |
| Refuse the store replant (R3) | A vendor publishing a stable, documented, versioned session-import format with a fidelity statement. OpenAI's crate is the closest thing and it is an internal crate against an unstable source format |
| The work does not stop on claude (§5.4) | Driving a real limit and watching the wait fail, especially across a Tortie restore. **This is the highest-value unmeasured thing in the document** and only he can do it, because it costs a window |
| Codex limit detection is reliable (§3.2) | A single codex refusal in his corpus. There are none: 925,056 nulls. The signal is proved present and the refusal is UNMEASURED |
| Prose is the only thing that moves (§2.1) | A receiving agent that accepts a structured tool trace from a foreign vendor. None of the fourteen in the registry does today |
| The claude sentence test is precise (§3.3) | The vendor rewording it. Both the sentence and the structured field moved inside four months in this corpus |
| A line-sequential briefing is safe enough (§2.4b) | A measurement showing the live-chain walk costs more than it buys — the rate is 0.8% of chained files, so a build phase may reasonably judge it out of scope. What would NOT overturn it is the rate being small, because the harm is a reversed decision rather than a missing one |
| The transcript is the right proposal channel (§4.5) | A marker that cannot be distinguished from ordinary agent prose in practice, or a latency measurement that makes a proposal useless. Either sends the shape back to a channel, and a channel is R1 |

---

## 9. What is not true, and what is UNMEASURED

- **No herdr behaviour was observed at runtime.** Nothing was built or executed there. Every herdr claim
  is from source, docs and git history at `a9f3ad5f`, and each is cited to a file.
- **The claim that any same-user process can drive herdr's socket was not demonstrated by driving it.**
  It is read from the absence of a peer check, the absence of a token, the fixed socket path and the
  0600 mode. Four independent readings and no experiment.
- **`/Users/gdc/codex` is a checkout on his machine, not a release.** The importer in §2.1 is the code
  in that tree; whether it is enabled in the codex build he runs was not checked, and **no import was
  performed**. `~/.codex/vendor_imports/` holds only skills, so there is no imported session on this
  machine to inspect, and running one would write to his store.
- **Two sentences one lane attributed to `claude import codex --dry-run` could not be reproduced.** The
  digest binding **was** verified independently by the integrator, twice: `claude import --help` at
  2.1.263 states *"On headless surfaces, pass `--yes=<digest>` from the `/import` preview"*, and the
  bundle itself composes *"`--yes` needs the scan digest from the preview so the confirm is bound to
  what was shown"* beside a `sha256` over the scanned items truncated to 32 hex, with a refusal when the
  digest no longer matches. The two further sentences about project-scoped config and argument
  substitution return **zero hits** across all four installed bundles (2.1.258, 2.1.259, 2.1.260,
  2.1.263), so they are **UNCONFIRMED** and are not relied on. What survives is the strongest external
  support this document has for refusal 8's confirmation clause, and it survives on its own.
- **Whether a hand-written transcript is accepted by either CLI on resume is UNMEASURED.** Settling it
  needs a planted store and a real `--resume` in a scratch profile, and this phase spends no turn. Phase
  82 refused the same measurement for the same reason. It does not change the verdict on the replant,
  which fails on the 78.57% before it ever reaches acceptance.
- **The claude auto-continue behaviour was read from his transcripts and never driven.** How it
  interacts with a session Tortie restored, or with an agent mid tool call, is unmeasured.
- **`rate_limit_reached_type` has never been non-null in his corpus.** What codex does at a refusal, and
  whether the codex title oracle reads a limited session as `idle`, are both unmeasured.
- **Whether claude's `/rate-limit-options` menu matches Tortie's generic dialog detector is
  UNMEASURED.**
- **One lane's note about the claude registry file** — that `~/.claude/sessions/<pid>.json` might read
  `status: waiting` with a limit reason, which would mean Tortie's existing tier-0 oracle already
  carries the fact — is **UNMEASURED**, and one `cat` of that file the next time he is stopped settles
  it.
- **The corpus is one person's, on one Mac, on a high-tier account.** Every percentage is his usage. The
  direction of the findings is unlikely to be personal; the numbers certainly are. The median-1-ask
  finding in particular is a property of how *he* works; on a corpus of hand-typed sessions the replay
  and handoff mechanisms would both look better than they do here.
- **The 37-of-70 figure for transcripts ending at a limit is an upper bound**, because a resumed
  conversation may continue in a new file. The lane that measured it said so first.
- **The two transfer measurements used different samples and different definitions** — 60 pinned
  conversations counting whole-file bytes, and 500 random files restricted to interactive sessions. They
  agree in direction and differ in level, and both levels are reported rather than reconciled into one.
- **Research 67 is not re-derived and not superseded.** Its architecture is sound. This document declines
  to build it for a reason research 67 could not have known, being §4.1's measurement.
- **Cost words are judgement.** The phase counts in §7 are not estimates of build effort taken from
  anything.
- **The fix round corrected four claims of this document's own and one of them was marked as
  independently re-derived.** The danger-flag figure (§0.1, §4.2, §10) summed two constants; the herdr
  limit search (§1.8) used a phrase that cannot match Rust's spelling; R3's recommended wording dropped
  the word *conversation* and would have been false if adopted; and §2.6 called an Enter press a
  confirmation. Each is corrected in place and says what it corrected. **None of them changed a
  conclusion**, which is the honest thing to report and is also the uncomfortable thing: four wrong
  supporting numbers under four right answers is exactly the state in which a later round inherits a
  wrong number and builds on it.
- **The rewind measurement in §2.4b is a census of his claude store and of nothing else.** codex was
  not measured for the same shape, and its rollout format is a flat event log rather than a DAG, so
  whether it records a rewound turn at all is **UNMEASURED**. cursor's importer
  (`records_cur.rs:148-149`) drops the same two flags and is presumed to share the blindness, unread.
- **Whether a person can TELL a briefing carried a cancelled ask is UNMEASURED and is the acceptance
  question for B5.** §2.4b proves the records are there; nobody has built the composer, so nobody has
  read one.
- **§2.8's chain is read from the code and was not driven.** No poisoned file was planted, no briefing
  was composed and nothing was typed into a pane, because the phase spends no turn. Every link is
  cited; the composition of them is reasoning.
- **§4.5's transcript channel is a shape, not a design.** No marker was chosen, nothing was written to
  recognise one, and the file-watch latency it would inherit was not measured.
- **One scratch file was lost during the run.** A lane deleted `.p223/claude-limit-files.txt`, an 18 KB
  file list belonging to another lane, believing it was its own. It is regenerable in seconds with
  `rg -l` and nothing in this document depends on it. Recorded because a research phase that hides its
  own small mistakes cannot be trusted with its large ones.

---

## 10. Evidence ledger

Every claim, where it came from, and how it was taken. Nothing below was recalled. Rows marked **[I]**
were re-derived by the integrator rather than accepted from a lane. Rows marked **[F]** were measured
or re-measured by the FIX ROUND, and where a fix-round row corrects an earlier one it says what it
corrects and where the earlier reading went wrong. A row marked **[C]** was measured by the COMMITTER,
and there is one, being the census behind §2.5.

| Claim | How it was taken |
| --- | --- |
| herdr 0.9.0, HEAD `a9f3ad5f` | `Cargo.toml:3`, `git log -1` in the checkout |
| **[I]** 103 methods in the `Method` enum | `awk '/^pub enum Method \{/,/^\}/' src/api/schema.rs \| grep -c 'serde(rename = '` |
| **[I]** API socket is `herdr.sock`, client socket is `herdr-client.sock` | `src/session.rs:170` and `:184`; `src/server/socket_paths.rs` |
| **[I]** `agent.send_keys` has no blocked check | `src/app/api/agents.rs:315-360`, read line by line |
| No peer credential check | grep for `peer_cred`, `SO_PEERCRED`, `getpeereid`, `LOCAL_PEERCRED` over `src/`, zero hits |
| API starts unconditionally | `src/server/headless/bootstrap.rs:20` and `:26`; config loaded and not passed |
| No config key gates it | 207 keys enumerated from `docs/next/website/src/data/config-reference.json`; `src/config/model.rs:310` |
| Socket mode 0600 is the only gate | `SOCKET_PERMISSION_MODE`, `src/server/socket_paths.rs:12` |
| Arbitrary argv over the API | `docs/next/api/herdr-api.schema.json`, `$defs.LayoutNode`, `$defs.PaneSplitParams` |
| `integration.install` edits agent config with no confirm | `src/app/api/integrations.rs:32`; paths in `src/integration/targets.rs` |
| What persists, and the restore matrix | `src/persist/snapshot.rs:14-125`, `src/persist/io.rs:11`, `docs/next/website/src/content/docs/session-state.mdx` |
| Resume is a typed shell line from a hardcoded table | `src/app/agent_resume.rs:264-280`; `src/agent_resume.rs:136-228`, `:245-281` |
| The hook that reports the session id | `src/integration/assets/claude/herdr-agent-state.sh`; `src/integration/claude_settings.rs:61-92` |
| Four detected states, `done` derived | `src/detect/mod.rs:11-20`; `src/app/api_helpers.rs:95-106` |
| Detection manifests and the debounce | `src/detect/manifests/`, `src/pane/agent_detection.rs:5-13,47-52` |
| Remote manifest catalog, no signature | `src/detect/manifest_update.rs:16`, `:506-557` |
| Delegation is unbounded; layout caps only | grep over the agent path; `src/app/api/layouts.rs:15-16`; `src/main.rs:447-449` |
| The plugin install confirm, and `plugin.link` bypassing it | `src/cli/plugin.rs:188-208,1294,1550-1556`; `src/app/api/plugins/mod.rs:68-87,177-222` |
| Remote replacement consent | commit `702aa1e4`; `src/remote/attach.rs:94,98` |
| The safety rule is a prompt | `skills/herdr/SKILL.md`; `docs/next/website/src/content/docs/agent-skill.mdx` |
| **[F]** herdr has no limit awareness | case-insensitive `rate.?limit\|usage.limit\|quota\|five hour\|weekly limit` over `*.rs`, `*.toml`, `*.mdx`: 35 files, every Rust hit herdr's own 1-second notification throttle (`src/app/api.rs:20`, `src/api/schema/common.rs:136`). Corrects a first-draft `rate limit` with a space, which cannot match `rate_limited` |
| **[F]** `src/detect/` holds no limit vocabulary at all | same search over `src/detect/`: 0 hits; the only three `limit` occurrences under it are `validate_matcher_limits`, `src/detect/manifest.rs:1000,1033,1051` |
| The shipped claude→codex importer | `/Users/gdc/codex/codex-rs/external-agent-migration/src/sessions/`, read only |
| Thinking dropped, tool notes truncated at 2,000 and 4,000 | `sessions/records_common.rs` |
| Tool-result-only records re-roled to assistant | `sessions/records_cla.rs:205` |
| New `ThreadId`, the marker and the ledger row | `app-server/src/external_agent_migration/session_importer.rs::persist_session`; `strings` over codex 0.153.4 |
| **[I]** Claude Code's digest-bound import confirm | `claude import --help` at 2.1.263; `strings` over the bundle, md5 `6a072a9285f67f7368c02641d8889e29` |
| Pinned corpus, 60 + 60, digest `ff9b763c126b16b7` | `.p223/b-transfer/pin-corpus.py`, output in `.p223/b-transfer/out-b-transfer-measurement.txt` |
| Byte census, slot maps, survival, move sizes | `.p223/b-transfer/census-*.py`, `slots*.py`, `survival.py`, `move-size*.py` |
| 69.4% of thinking blocks empty | `.p223/thinkscan.py` over 600 random transcripts |
| Interactive sessions at 1.7% portable | `.p223/handoff2.py` over 500 random transcripts |
| **[F]** The importer never reads `parentUuid`; Tortie never reads it either | `read_session_import`, `records_cla.rs:97-152` read in full; `grep -rn parentUuid` over `/Users/gdc/codex/codex-rs/external-agent-migration/src/sessions/` and over `src/`, zero hits in both |
| **[F]** 70 files carry a genuine rewind, 895 abandoned importable records, 156 abandoned asks | whole-store census, not a sample: `.p223/fix/rewind-split.py` over all 19,194 files, output `.p223/fix/out-rewind-split.txt`. Three earlier passes of my own were artifacts and are recorded in §2.4b and in the script's own header |
| **[C]** The fourth artifact, reproduced, and its cause | `.p223/rv/chain.py` re-run by the committer: 86.740% of 504,799 importable records off the last record's ancestor chain, 8,237 chained files agreeing with the fix round's boundary. Cause measured on the file it names worst: 1,633 dangling `parentUuid` references and 18 parents with more than one child, over the same `type`/`isSidechain` filter the script uses |
| **[F]** Every rewind quoted in §2.4b was read in the raw records | `.p223/fix/inspect2.py` over the named files; the branch head, its timestamp and the ask that replaced it printed side by side |
| **[F]** `redact.ts` is secret shapes only, with no instruction filtering | `src/main/overview/redact.ts` read in full, 81 lines, 9 `SECRET_PATTERNS` plus 2 `TORTIE_PATTERNS` |
| **[F]** The words *poisoned*, *compromised*, *untrusted*, *injection* appeared twice in 1,465 lines | `grep -cEi` over this document at the parent commit; §3.4 and the head of §4.3 |
| **[F]** `defaultStoreTarget` writes the vendor's own default credential store | `src/main/credentials/stores.ts:311`, read with its header; why R3's wording needed the word *conversation* |
| **[F]** `resolveSessionLog` has a case for 11 of the 12 CLI agents | `case '` over `src/main/overview/reader/resolve.ts`; droid answers `no-store` by design |
| Tool name distribution | `.p223/toolscan.py` over 400 transcripts, 8,659 `tool_use` blocks |
| **[C]** The same six tools read 90.6% over the whole store, so §2.5's 88.4% is conservative | census rather than sample: `.p223/rv/tools.py`, 19,246 files and 554,625 `tool_use` blocks, no size filter and a recursive walk. The per-tool mix moves and the aggregate does not; the sampled number is kept as measured |
| 480 compact summaries, median 13,031 chars | `.p223/compactscan.py` over 9,615 transcripts |
| 0 of 568 codex compactions carry prose | `.p223/codexcompact2.py` over 195 rollouts |
| The receiving window, 258,400 and 272,000 | `model_context_window` over the pinned corpus |
| Claude error taxonomy, 668 rate_limit records, 28.9% not a window | `.p223/c-detection/claude-api-error-taxonomy.txt` |
| 156 five-hour events, 37 of 70 transcripts ending at one | `.p223/c-detection/claude-limit-events.txt` |
| Codex `rate_limits` on disk, 1,480 of 1,500 rollouts | `.p223/c-detection/codex-rate-limit-history.txt` |
| `rate_limit_reached_type` null 925,056 of 925,056 | `rg` over `~/.codex/sessions/2026` |
| Claude's rate-limit response headers; `codex_error_info`; gemini and omp classifiers | `strings` over the shipped binaries, `.p223/c-detection/agent-binary-strings.txt`, `other-provider-stores.txt` |
| The auto-continue sentences, 53 occurrences | `rg` over `~/.claude/projects` |
| 792 files with `<teammate-message teammate_id=`, 19 project dirs | `rg -l` over `~/.claude/projects` |
| 11,019 files matching "rate limit" against 571 structured markers | `grep -rl` over `~/.claude/projects`, `.p223/limitscan.sh` |
| **[F]** 21 danger flags, 16 VERIFIED and 5 RESEARCH, 10 of the 12 launchable agents | brace-matched parse of `AGENT_FLAG_PRESETS` and `NON_REGISTRY_FLAG_PRESETS` SEPARATELY, `.p223/fix/flags-parse.py`, output `.p223/fix/out-flags.txt`. Corrects the `27 / 22 / 13-of-15` this row carried, which summed the two constants |
| **[F]** 6 more danger flags outside the registry, in amp, opencode and copilot | same parse; `NON_REGISTRY_FLAG_PRESETS`, `src/main/agents/flags.ts:603`, whose header says it is not consumed by the create-session modal |
| **[F]** 14 registry entries, 12 CLI and 2 `kind: 'ide'` with no flag entry | `id: '` and `kind: 'ide'` over `src/main/agents/registry.ts` |
| The two danger flags' own help text | `claude --help`, `codex --help`; no turn spent |
| **[I]** `resume_provenance` exists and answers a different question | `src/main/manifest/schema.ts:175`, `:206` |
| **[I]** Reconstruct's acknowledgement plus single-use token | `src/main/manifest/reconstruct.ts:29-40,140,387-395,662-683` |
| **[I]** The hooks loopback server's two routes and token | `src/main/activity/hooks.ts:227,237,241,386,526,861` |
| Tortie's seven statuses | `SESSION_STATUSES`, `src/shared/types.ts:77-85` |
| The usage meter's windows, poll and focus predicate | `src/main/usage/parse.ts`, `service.ts`, `endpoints.ts`, `statusline.ts`; `src/renderer/state/usage.ts`; `USAGE_PROVIDERS`, `src/shared/usage.ts:26` |
| Fourteen registry entries, twelve CLI agents | `id: '` count over `src/main/agents/registry.ts` |
| The fold's prompt, caps and whole-answer refusal | `src/main/overview/fold/compose.ts`, `spawn.ts`, `validate.ts` |
| `typeIntoPane` already used with `pressEnter` false | `src/main/restore/restore.ts:301`; `src/main/sessions/resume-in-place.ts:1215` |
| Plan-then-execute is the shipped confirm shape | `src/main/skills/run.ts` |
| Tortie writes nothing into a provider's store | `grep -rEn "writeFile\|appendFile\|createWriteStream\|unlink\|rename(" src/main/overview src/main/manifest/harvest`, no output |
| An agent can already stamp a tmux session itself | `.p223/forge-probe.sh`, scratch socket, killed in a trap; socket `gmux` never contacted |
| Phase 86's reason for the options summary | `src/renderer/app/__tests__/create-options.test.ts` |
