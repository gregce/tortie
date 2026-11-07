# 144. An agent's door into Tortie

Research 144. Written 6 November 2026 in the phase 359 worktree (`/private/var/tmp/tortie-wt/wt-p359`), against the
tree at `v0.114.1`. It is the promotion of the git-ignored spike notes under `SCRATCH/` — `agent-tortie-skills-brainstorm.md`,
`agent-tortie-skills-IMPLEMENTATION-NOTES.md`, `automation-experiment/` and `skill-injection-spike/` — so that no
later round has to depend on a folder that is not committed. The binding specification this document serves is
`build/p359/SPEC.md`; where the two disagree, the SPEC wins and this document is the wrong one.

**What this document is not.** It is not the accept case for "an agent reads Tortie's own docs and obeys them". The
spike measured **catalog presence at three fixed versions and nothing else**: no model prompt received the skill, no
model followed it, and no operation was called by an agent. Everything below that says an agent *can* is about a
launch argument and a socket, never about model behaviour.

**Nothing was started for this document.** No app, Electron, tmux server, agent, model turn, keychain, `~/.ssh`,
`~/.claude`, `~/.codex` or live Tortie profile was read or touched. Every number is quoted from the spike records
committed with this phase's SPEC, and every claim about Tortie is a `file:line` in this tree.

---

## 1. The question

An agent launched by Tortie is, to Tortie, a pane. It can see a terminal and it cannot see the product: the sessions,
the projects, the file the person is looking at. Four things were worth knowing before designing anything.

1. **Could an agent be given knowledge of Tortie's own behaviour** without asking a person to install anything?
2. **Could an agent call Tortie** — end a session, open a file — without a macOS Automation prompt, an Apple Event,
   a network listener, or a third-party plugin host?
3. **What does each installed agent actually support** for session-scoped, additive instructions?
4. **What must never be reachable** from the thing that answers?

## 2. The two spikes, and what each measured

### 2.1 Apple Events (`SCRATCH/automation-experiment/`)

A first-party Objective-C++ N-API addon registered with `NSAppleEventManager`, plus a packaged `.sdef`, both built
and ran. `/usr/bin/sdef <bundle>` read the dictionary.

The result that decided the design: **every** send, including one from a direct child of the target Electron host,
returned `-1744` (consent required) from `AEDeterminePermissionToAutomateTarget(..., askUserIfNeeded = false)`.
Nothing was ever sent, so Apple Event *receipt* was never exercised either. Two further limits: the addon was ad-hoc
signed and the sender was not `osascript`, so no clean-account cold-consent test ran; and preflight does not reserve
permission, which means a send-time `kAEDoNotPromptForUserConsent` is required on every send, not only at ask time.

Beside it, in the same host, **a Unix-domain socket answered three exact nonce replies** using the same native
operation body. That is the finding this phase is built on: the private socket answered with zero consent machinery,
and the Apple Event route could not answer at all without a prompt that a headless launch cannot get.

### 2.2 Session-scoped skill injection (`SCRATCH/skill-injection-spike/`)

Each agent ran under a no-fork, no-network, read/write-fenced sandbox (`run-command.mjs`; the fence, teardown and
no-fork evidence are `fence-check.json`, `teardown-check.json`, `nofork-check.json`), in a fresh scratch world per
run, with a closed PATH and no inherited config or credentials. No model turn was sent. omp needed a fixed fake API
key string (`sk-ant-FAKE-…`) only to select a default model, and the network was denied.

For each agent a **harness-owned catalog** was read three ways — control (no injection), injected (one harmless
`tortie-injection-probe` skill outside every default discovery root), and missing (same mechanism, a path that does
not exist). A pass requires the fixture skill's name and description in the harness's own catalog in the injected run
and absent in both others. A flag being accepted, help output, or a file existing does not count.

| Agent | Version | Session-local mechanism | Catalog read | Result |
| --- | --- | --- | --- | --- |
| Claude Code | 2.1.312 | `--plugin-dir <plugin containing skills/>` | `initialize` control request, stream-json (44 → 45 commands) | **Listed** as `tortie-spike:tortie-injection-probe` |
| Pi | 1.5.0 | `--skill <skill dir>` | RPC `get_commands` | **Listed** as `skill:tortie-injection-probe`, scope `temporary` |
| omp | 18.10.4 | `--plugin-dir <plugin>`, or `--config` with `skills.customDirectories` | `available_commands_update` at RPC start (47 → 48) | **Listed** by both routes |
| Codex | 0.167.0 | app-server `skills/extraRoots/set` (needs `experimentalApi`) | app-server `skills/list` (5 → 6) | **Listed at the app-server protocol only**; no route for the interactive `codex` Tortie launches was found |
| Cursor Agent | 2026.06.04 | `--plugin-dir` is in `agent --help` | none found — no non-model catalog enumerates skills | **Unverified** |
| OpenCode | 2.0.29 | inline `OPENCODE_CONFIG_CONTENT` skills paths | `debug config`, `debug agents` | **Not measured**: every catalog command, control included, failed with "Failed to start server", consistent with the fence blocking a listen |

Not tested, not installed in Tortie's searched locations: Gemini, Droid, DeepSeek, Antigravity, Muse, Qwen, Grok. Not
tested, capture-only rows: the Cursor IDE and VS Code.

**Three of six pass, and they pass on a launch argument that scopes to one process.** Claude Code, Pi and omp each
listed the skill with nothing written into any home or project skill directory. That is the preferred route and the
only one this phase ships.

## 3. The decisions the spikes forced

These are the standing decisions, and each is now a rule in the SPEC rather than a preference:

- **Skills only.** A folder with `SKILL.md` and reference files. No `commands/`, no custom slash commands. An agent
  may still surface a skill as `/name`; that is the agent's behaviour, not Tortie's.
- **One entry skill that is a table of contents** into task references (docs lookup, navigation, history, lifecycle),
  with the bundled docs version-matched. No reliance on a source checkout or on the website.
- **Help is not authorisation.** When asked how to do something the integration supports, the skill says "you can
  just ask me and I'll do it; I can also show you how", waits for the choice, then acts or explains. A how-to
  question must not become an action.
- **Per-session injection only.** Nothing is written to personal or project skill directories, ever.
- **Never an Automation prompt from an internal agent.** The socket is the internal route; Apple Events remain
  available to external scripting later, and would be a second thin adapter over one operation body.
- **Ending a live agent needs native human confirmation, enforced in the operation path.** Remove and Close project
  are separate operations from End and are not in this phase's catalogue at all.
- **Settings → Agents, one global switch, default off**, read on every request (`src/shared/settings.ts`,
  `src/main/settings/store.ts`, `src/renderer/settings/AgentsSection.tsx`).

## 4. What this phase built on those decisions

The SPEC's §1 and §2 are the design; the four points a later round is most likely to undo are:

1. **The switch is a sealed danger state**, not a plain boolean. `agentAccess` joins `DangerState`, so it is written
   with the same seal as the other dangerous settings and a file that says `true` with no covering seal reads as
   `false` (`src/main/settings/store.ts`). A pre-359 seal opens and covers `false`; that is deliberate, so an upgrade
   never turns the door on.
2. **Delivery is composed, never recorded.** The pair goes into the launch argv and the address into the pane
   environment at launch time and is **not written to the manifest**, so restore composes from the current switch and
   the current bundle. A retained session therefore receives nothing after the switch is turned on: it must still
   carry the original pane environment (`src/main/agent-access/delivery.ts`, and the create/restore/restart call sites).
3. **One private socket, one request, one answer.** `<userData>/gmux/agent.sock`, parent `0700`, socket `0600`, one
   `listen` in the whole tree, inode-safe stale cleanup, an absolute request deadline, a size cap, and a refusal
   rather than a truncation when the address would exceed macOS's `sun_path` bound
   (`src/main/agent-access/service.ts`, `socket.ts`).
4. **The catalogue is closed.** `facts` and `listSessions` read; `open` opens one file in the editor. Every other
   operation name is refused. `open` asks containment and the path door and only ever the *editor* door
   (`src/main/agent-access/open.ts`). No log line carries a request field, a path, a find string, a session id or a
   project id.

## 5. What this phase does not claim

- **No model was given the skill.** Catalog presence at three versions is the whole evidence. Whether the skill
  reaches the model's prompt, survives resume with the argument re-applied, or is followed, is unmeasured.
- **Additivity is untested.** Claude Code's and Pi's spike runs reduced the baseline (`--setting-sources ''`,
  `--tools ''`, `--no-skills`), so a person's own skills alongside Tortie's were never exercised.
- **Codex, Cursor and OpenCode are not delivered to.** No interactive launch route was found for Codex's app-server
  path; Cursor's flag is unverified; OpenCode's catalog could not be read inside the fence. They launch byte-identical
  to the parent.
- **The other seven launchable rows** (Gemini, Droid, DeepSeek, Antigravity, Muse, Qwen, Grok) were never installed
  during the spike and are not delivered to.
- **No external scripting surface.** No `.sdef`, no Apple Event handler, no network listener. The socket is local,
  owner-only, and answered only while the switch is on.

## 6. Re-running what is left

The spike scripts live only under `SCRATCH/` and are deliberately not committed. A later round that wants the two
open measurements — model-facing prompt inclusion for the three passing agents, and additivity beside a person's own
skills — needs a scoped decision on a model turn and a fresh fence, and should reuse the protocol strings recorded in
`SCRATCH/skill-injection-spike/RESULTS.md` rather than re-deriving them:

```text
Claude  --bare --print --input-format stream-json --output-format stream-json --tools '' \
        --strict-mcp-config --setting-sources '' --plugin-dir <bundle>
Pi      --mode rpc --no-session --no-skills --no-extensions --no-context-files --no-mcp --no-tools --skill <dir>
omp     --mode rpc --no-session --no-extensions --no-lsp --no-pty                 (plus the pair)
Codex   app-server --listen stdio:// --disable plugins   then initialize, initialized,
        skills/extraRoots/set, skills/list
```

Three reusable cautions from the harness, which cost a launch each to learn: pass `persistence: false` for a custom
entry file or Electron reads `YES` as the app path and shows "Error launching app"; copy `Electron.app` with
verbatim symlinks or the framework links point back at `node_modules`; and do not pass `tmuxSocket` to a minimal host,
which reads the operator's live `-L gmux` server.

## 7. Where the evidence is

| Subject | File |
| --- | --- |
| The binding specification, the closed catalogue, the ownership split, the gates | `build/p359/SPEC.md` |
| Delivery matrix and refusal cases, driven | `build/conformance-agent-access.mjs` |
| Every rule planted against, one at a time | `build/ablation-p359.mjs` |
| The app run (the switch, the delivery, the door, in one Electron) | `build/p359/probe-p359.mjs` |
| The bundle's five files and their bytes, asserted before signing | `build/assert-agent-skills.cjs` |
