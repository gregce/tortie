# 29 · The Context sidebar

A fourth activity-bar view beside Explorer, Search and Source Control, for the
**sidecar configuration agents actually run on** — skills, MCP servers, hooks,
plugins and the instruction files loaded alongside them.

Written **2026-08-12**. Category reference: VS Code's *Agent Customizations*
panel — a left rail of Overview / Agents / Skills / Instructions / Hooks /
MCP Servers / Plugins / Tools, with counts, a search field, a **New Skill**
button, and entries grouped by scope showing name + description. That panel is
the evidence that the category is real. It is **not** the justification, and §1
does not use it as one.

## How this document was produced, and what the marks mean

Three research passes ran in parallel against this machine and the live web on
2026-08-12 — **the substrate** (what exists on disk, per agent), **the
marketplace** (where these things come from, and the trust model), **the
design** (the panel itself, in Tortie's tokens and components) — and were then
reconciled into this single document. Reconciliation was not cosmetic: the
three passes disagreed about the skill count, about whether the reader should
read files or shell out to the agents' CLIs, and about whether installing from
a source belongs in v1. Each disagreement is resolved in place, and the
resolution is marked so a later reader knows a choice was made rather than
inherited. §2.1 also corrects a number, and §10 corrects a behaviour claim that
was true when the source pass ran and is no longer true today.

| Mark | Means |
|---|---|
| **VERIFIED** | Seen on this machine's disk, or printed by an agent's own binary in a read-only command run on 2026-08-12, or an HTTP endpoint hit on 2026-08-12. |
| **BINARY** | Extracted with `strings` from a shipped executable. Stronger than docs — it is the code that will run — weaker than a live listing. |
| **DOC** | The vendor's own documentation, fetched live on 2026-08-12. Believed, not proven, here. |
| **ABSENT** | Probed and not present on this machine. Says nothing about whether the agent supports it. |

Read-only discipline: nothing under any agent's config directory was created,
modified or deleted; every CLI call was a help, list or read; no agent session
was started; nothing under `src/**` was touched. Two files
(`~/.claude/plugins/known_marketplaces.json`, `~/.cursor/cli-config.json`)
changed *during* the survey because the user's own Claude Code and Cursor were
running. That is itself a finding — **these files move while you are looking at
them** (§2.11).

Secrets encountered (plaintext provider keys in `~/.qwen/settings.json` and
`~/.deepseek/config.toml`, a bearer token in an MCP `env` block in
`~/.cursor/mcp.json`) are deliberately not reproduced here, for the same reason
the design never renders them (§2.6).

## The answer, on one page

**Build it, and build it as agent-layer work.** Tortie's registry already
answers *how a session starts*: binary, argv, resume argv, icon, hotkey, launch
flags. Nothing in Tortie answers *what the session can do once it starts* —
that lives entirely in the sidecar config, and it is invisible from inside the
app today. Skills, MCP servers and hooks pass the guardrail on their own merits;
Tools and Overview — two of VS Code's eight tabs — are **refused** (§1.5).

**The substrate is one real standard and eleven bespoke filesystems.** Agent
Skills standardizes the *file* (`SKILL.md` + frontmatter) and nothing else: not
where skills live, not what scopes exist, not who wins a collision. There are
at least **seven mutually incompatible precedence models** across the twelve
agents, and two of them run in *opposite directions inside one product* — in
Claude Code, project settings beat personal settings while personal skills beat
project skills (VERIFIED against the docs today, §2.9). A panel that draws one
scope axis and orders it once will be wrong about half of what it shows.

**Default sources: two, named out loud.** **skills.sh** for skills — Vercel's
directory plus `npx skills` (MIT, two runtime dependencies, 76 agent targets),
chosen partly because it is the only source in the survey that hands a
third-party client a **free, unauthenticated, four-scanner content audit** it
can render *before* the install button (re-verified today, §3.2). **The official
MCP registry** (`registry.modelcontextprotocol.io`) for MCP servers, because
namespace-verified publishing is the only publisher-identity guarantee in the
category, with **Smithery** as a second listed source. Plugins go through the
agents' own marketplaces via their own CLIs. **Hooks get no marketplace, and
that is a refusal, not a gap.** Bring-your-own sources — a local directory, a
private repo, an alternate registry base URL — are first-class, not a
workaround.

**v1 is the local view; the source layer is v1.1.** v1 ships the resolved
per-agent picture, the scope treatment, the detail surface, the launch-time
context snapshot and the session readout, plus the local verbs that need no
network. Searching a registry and installing from it lands one phase later —
**but v1's object model carries the trust primitives** (content hash, executable
-content scan) so v1.1 is additive rather than a redesign (§13).

**The biggest risk is that installing is executing.** Not a metaphor: a
`SKILL.md` body can carry `` !`command` `` placeholders that **run before the
model sees the file** (VERIFIED in Claude Code's docs today, §3.7), and the
documented incident corpus — 1,184 malicious skills on one hub, 36.82% of 3,984
scanned skills carrying a flaw, 13.4% critical — **includes the registry
recommended above**. That is why install is staged behind pin-and-recheck rather
than shipped with the view. The risk that is live in v1 itself is quieter and
just as real: **the panel will be believed**, and disk state is not loaded state
(§14).

---

## 1. Why this belongs in Tortie — the scope-guardrail argument

`CLAUDE.md` caps parity work after Phase 14 and requires every proposal to
answer one question before a line is written: *does this serve the agentic-coding
workflow, or does it exist because IDEs have it?* The guardrail is a filter, not
a blessing, so it is applied to the whole first and then item by item.

### 1.1 This is the agent layer, which is the product

The guardrail names Tortie's differentiators as durable named sessions,
multi-project tabs in one window, and "the agent layer (registry, per-agent
icons/hotkeys/launch flags, agent-native status oracles…)". Every one of those
answers *how a session starts*. None answers *what the session will be able to
do once it starts*.

Tortie already owns the small half of that surface: per-agent launch flags in
Settings → Launch defaults (S13). The large half — which skills load, which MCP
tools exist, which hooks fire, which plugins are enabled — is the only part of
an agent's configuration that Tortie launches sessions against while being
unable to show it. The view closes the agent layer rather than extending the IDE.

### 1.2 It is invisible today, and the invisibility is measurable

| Live inventory, this machine, VERIFIED 2026-08-12 | Count |
|---|---|
| Distinct user-installed skills across ten agent roots (from 107 directory entries) | **33** |
| Canonical copies in the harness-neutral root `~/.agents/skills` | 25 |
| Harness config directories that fan those out by symlink | 26 |
| Vendor-bundled skills on top of that (Cursor's `skills-cursor`, Codex's `skills/.system`) | 20 + 6 |
| MCP servers configured across agents | 7 (Cursor) + 3 (Codex) + 1 (Claude user) |
| Plugins enabled | 6 Claude (+1 skills-dir) + 12 Codex |
| Repos under `~` carrying project skills | 10 (`.claude/skills`) + 9 (`.agents/skills`) |
| Repos under `~` carrying Claude hooks in `.claude/settings.json` | 6–7 |
| Repos under `~` carrying a project `.mcp.json` | 4 |

None of it is visible from any single place — not from any one agent, and
certainly not from a shell that runs all of them. The one place the machine
*does* report a conflict is `gemini skills list`, which prints eleven
`Skill conflict detected: … is overriding …` lines **to stderr**, where no human
reads them.

The failure this removes is concrete. When an agent does something surprising,
the operator's first question is "what was loaded?" — and answering it today
means leaving the app, recalling twelve directory layouts, and reasoning about
seven contradictory precedence rules (§2.9).

### 1.3 It is per-agent and per-scope, and only a multi-agent shell can answer it

A vendor's own UI can show you *its* skills. Only something that already knows
all twelve agents can answer the two questions this user actually asks: *"this
skill — which of my agents will load it?"* and *"this session is running `qwen`;
what did `qwen` actually get?"*

The ecosystem agrees, in the strongest way available: **four competitors ship an
import verb pointed at Claude Code** — `claude import [codex|gemini]`,
`gemini hooks migrate`, `muse skills import --from claude|codex`,
`agy plugin import [gemini|claude]`, plus `qwen extensions install` accepting a
Claude marketplace URL (all VERIFIED, §2.8). Those verbs exist because vendors
know their users run several agents and keep one configuration. Tortie is where
those users already sit. This is not parity work — there is no product to reach
parity with.

### 1.4 It connects to the one thing only Tortie has: durable session identity

Tortie writes the manifest row that launches an agent. It can therefore record
what the context *was* at launch and tell you, three hours later, that it has
changed — a question no configuration panel anywhere can answer, because no
configuration panel owns a session that outlives it (§8).

### 1.5 Per-artifact verdict

| Artifact | Verdict | Reason |
|---|---|---|
| **Skills** | **Build** | Agent-layer, cross-agent, standardized enough to render truthfully, completely invisible today. The one artifact where one file genuinely serves twelve agents. |
| **MCP servers** | **Build** | The agent's tool surface. They carry credentials, and Claude Code alone has three scopes plus a per-project approval gate that silently withholds servers (§2.8). A user who cannot see this cannot debug it. |
| **Hooks** | **Build, read-first** | Hooks execute shell commands on lifecycle events, with the user's full permissions — Claude Code's own docs say so in a warning box. Tortie starts the session; the operator has a standing right to see what will run inside it. The strongest safety argument in the set. |
| **Plugins** | **Build as a container** | A plugin is a bundle of the other three. Show it as a grouping with an enabled state and an inventory. Do not build a store. |
| **Instructions / rules** | **Build as a read-only chain** | Worth showing *which* memory files a session at this cwd picks up, because the walk is hierarchical, crosses out of the project, and no file tree can show it (§5.4). Editing them is the editor's job. |
| **Agents / subagents** | **Defer** | Real, but second-order; nothing about it is costing the user anything today. |
| **Tools** (VS Code's tab) | **Do not build** | It is a projection of MCP + built-ins, and enumerating it means **connecting to every server** — `claude mcp list` takes 2.5 s and health-checks over the network (§2.5). A live tool count is exactly the "number that rises on its own" the Zen forbids. Replaced by an on-demand per-server check (§7.4). |
| **Overview** (VS Code's landing tab) | **Do not build** | That is the dashboard. Refuse it. |

### 1.6 Where the Zen binds

*"Not a dashboard. No counters, no activity feeds, no progress theatre. A number
that rises on its own is not a signal, it is noise in a nicer font."*

A static inventory count beside a section header the user deliberately opened is
not that — it is the same object as the Source Control view's dirty count, which
DESIGN.md already sanctions. What is forbidden: any live tool count, any
health-poll badge on the activity bar, any notification when a config file
changes, and any rail badge at all (§5.1). The view is **pull, not push**: it
answers a question when asked and is silent otherwise. Its claim on "protect
human attention" is that it compresses twelve filesystem layouts and seven
precedence models into one vocabulary.

### 1.7 What it must not become

Stated here so a later round can be held to it. Not a marketplace browser — an
app store is a dashboard with a checkout (§3.1 draws the line between a *store*
and a *source*). Not a skill-authoring IDE — `SKILL.md` is markdown and Tortie
already has Monaco and a preview. Not an MCP inspector with a tool playground —
that is a debugger, and debuggers are on the refused list. Not a tool-call
activity feed — that is the supervisor's console the Zen forbids by name. Not a
counter on the rail. The v1 line is drawn in §13, and the permanent refusals are
listed there under **Never**.

---

## 2. The substrate — what exists on disk, per agent

This is the foundation the view sits on. Without it the view is fiction. Every
number and path below was measured on this machine on 2026-08-12 against the
eleven agent CLIs that are actually installed, not read off a docs page. Two
measurements overturned the design that would otherwise have been drawn: skills
are already **deduplicated across eight agents by symlink** (§2.2), and
precedence **inverts between categories** (§2.3).

**Installed agents (VERIFIED).** Eleven of the twelve registry CLIs resolve on
PATH right now:

```
claude        /Users/gdc/.local/bin/claude          (2.1.228)
codex         /Users/gdc/.local/bin/codex           (0.147.0, standalone bundle)
cursor-agent  /Users/gdc/.local/bin/cursor-agent
gemini        /Users/gdc/.npm-global/bin/gemini     (0.54.0)
qwen          /Users/gdc/.local/bin/qwen
muse          /Users/gdc/.local/bin/muse
pi            /Users/gdc/.npm-global/bin/pi
agy           /Users/gdc/.local/bin/agy             (antigravity)
deepseek      /Users/gdc/.npm-global/bin/deepseek   (deepseek-tui)
amp           /Users/gdc/.local/bin/amp
opencode      /Users/gdc/.opencode/bin/opencode
droid         NOT INSTALLED  (~/.factory/ exists but holds only skills/)
```

`droid` is the one agent in this document with no local ground truth. Every
droid row is DOC-only and the design must label it that way (§15).

### 2.1 The census, and why the count depends on which roots you read

The two research passes returned **25** and **33** for "how many skills". Both
are right, and the reconciliation is a design constraint rather than a
bookkeeping note. Counted directly today:

| Root | Entries | Class |
|---|---|---|
| `~/.agents/skills` (harness-neutral) | 25 | canonical copies |
| `~/.claude/skills` | 22 (20 symlinks) | user |
| `~/.codex/skills` (+ 6 bundled under `.system`) | 19 | user + vendor |
| `~/.cursor/skills` | 11 | user |
| `~/.gemini/skills` | 11 | user |
| `~/.config/opencode/skills` | 11 | user |
| `~/.config/agents/skills` (Amp's XDG variant) | 8 — all resolve into `~/.agents` | user |
| `~/.qwen/skills` · `~/.factory/skills` | 3 each | user |
| `~/.pi/agent/skills` | 2 — both resolve into `~/.agents` | user |
| `~/.deepseek/skills` · `~/.config/amp/skills` | 1 each | user |
| `~/.cursor/skills-cursor` | 20 — **real directories, none shared** | vendor-managed |

- **107 entries across the ten user roots → 33 distinct skills.**
- **137 entries across all thirteen roots → 53 distinct**, the extra twenty
  being Cursor's own shipped skills.
- **25** is the count of canonical copies in the neutral root; the other eight
  distinct user skills live only in one agent's tree and have never been shared.

Three rules follow, and they are the reason this is in the substrate section
rather than a footnote:

1. **A count is meaningless without its root set.** The section header's number
   is the resolved set for the *selected agent scope* — one agent's number when
   an agent is selected, the union of registry agents in `All agents` mode.
2. **Vendor-bundled roots are a separate class and never join the user's
   count.** Cursor's `skills-cursor` and Codex's `skills/.system` are the
   product, not the user's configuration. They render in a `Bundled` group,
   collapsed, excluded from the header count.
3. **Non-registry roots are read but not counted.** `~/.config/agents/skills`
   and `~/.pi/agent/skills` are read because that is where shared files
   physically live; they contribute to a skill's *agents* list only for agents
   Tortie can launch (§6.5).

Project scope is real and sparse: of ~700 folders under `~`, **10** carry
`.claude/skills/`, **4** carry `.mcp.json`, and **6** carry hooks in
`.claude/settings.json`. A typical repo carries none, which makes the empty
state (§11) a *common* screen, not an edge case.


### 2.2 The finding that shapes the whole list: one skill, eight agents, one inode

```
$ stat -f '%i' ~/.{claude,gemini,qwen,cursor,factory,codex}/skills/govuk-style/SKILL.md \
               ~/.config/{opencode,amp}/skills/govuk-style/SKILL.md \
               ~/.agents/skills/govuk-style/SKILL.md
246155641   ×9      # eight symlinks + one real file
```

Eight agent directories, one file. This is not an accident of this machine —
it is the ecosystem's own answer to cross-agent portability, and the agents
have grown to expect it: Claude Code's own documentation states that a skill
entry "can be a symlink to a directory elsewhere on disk… and if the same
target is reachable from more than one location, Claude Code loads the skill
once."

Three consequences, and all three are load-bearing:

1. **The list must dedupe by realpath**, or it shows 107 rows where there are
   33 things. A row is a *skill*, not a directory entry.
2. **"Which agents" is a property of the row**, computed for free from the same
   walk. The hardest question the mission asks — which agents does this apply
   to — is answered by an `fs.realpathSync` the reader already has to call.
3. **Installing a skill for another agent is one `symlink()`**, which is the
   gesture the ecosystem already uses. Tortie does not need an installer; it
   needs to expose the link (§9.2).

### 2.3 Precedence is per-category, and it *inverts*

This is the single most valuable thing the view can carry, because it is the
thing nobody knows, and a panel that assumed "project wins" would actively
mislead.

| Category | Precedence, highest first | Resolution | Evidence |
|---|---|---|---|
| **MCP servers** | local (`~/.claude.json` under the project path) → project (`.mcp.json`) → user (`~/.claude.json` top level) → plugin → connectors | **Whole entry wins. Fields are never merged across scopes.** | Claude Code MCP docs, "Scope hierarchy and precedence" |
| **Skills** | enterprise → **personal** → **project** → bundled | Whole skill wins; plugin skills are namespaced `plugin:name` and cannot collide | Claude Code skills docs: *"enterprise overrides personal, and personal overrides project"* |
| **Hooks** | no precedence | **They all merge and all run.** Duplicate identical handlers fire once | Claude Code hooks docs, "Hook merging across scopes" |
| **Settings keys** | managed → CLI args → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json` | Key-level override | Claude Code settings docs |

**Skills invert.** Your personal `~/.claude/skills/code-review` silently beats
the repo's `.claude/skills/code-review` that the team committed — the opposite
of every other config system a developer has internalised, and the opposite of
settings.json two rows below it. `gemini skills list` on this machine prints
the same inversion eleven times over (`~/.agents/skills/impeccable` overriding
`~/.gemini/skills/impeccable`).

**Hooks do not have precedence at all**, which is why §6.4 groups them by event
rather than by scope: printing hooks in a precedence order would imply a
resolution that does not happen, and the real risk with hooks is not "which one
wins" but "how many are about to run".
**Re-verified verbatim on 2026-08-12**, because the whole view rests on it and
one sentence of it is counter-intuitive:

> "When skills share the same name across levels, enterprise overrides
> personal, and personal overrides project."
> — code.claude.com/docs/en/skills

> "When the same server is defined in more than one place, Claude Code connects
> to it once, using the definition from the highest-precedence source. The
> entire server entry from that source is used; fields are not merged across
> scopes." — then, in order: 1. Local scope · 2. Project scope · 3. User scope ·
> 4. Plugin-provided servers · 5. claude.ai connectors.
> — code.claude.com/docs/en/mcp

> "Hook entries merge across settings levels rather than replacing each other:
> user, project, and local settings add their own hooks without removing
> managed ones." — code.claude.com/docs/en/hooks

Three artifact families in one product, resolving three different ways: skills
broadest-wins, MCP narrowest-wins-whole-entry, hooks not resolved at all.


### 2.4 Per-agent support matrix (12 registry agents + 2 the registry does not carry)

`✓` = verified on this machine today. `·` = documented, not exercised here.
`?` = unknown, and the design must degrade rather than guess.

| Agent | Skills | MCP | Hooks | Plugins | Instructions |
|---|---|---|---|---|---|
| claude | ✓ `~/.claude/skills`, `.claude/skills`, `~/.agents/skills` | ✓ `~/.claude.json` + `.mcp.json` | ✓ `settings.json` `hooks` | ✓ `~/.claude/plugins` + `enabledPlugins` | ✓ `CLAUDE.md`, `.claude/rules` |
| codex | ✓ `~/.codex/skills` + `.system` | ✓ `config.toml [mcp_servers]` | ✓ `[hooks.state]` with `trusted_hash` | ✓ `codex plugin list`, `.agents/plugins/marketplace.json` | ✓ `AGENTS.md` |
| gemini | ✓ `gemini skills list` | ✓ `gemini mcp list` | ✓ `gemini hooks` (incl. `migrate` from Claude) | ✓ `gemini extensions` | ✓ `GEMINI.md` |
| cursor | ✓ `~/.cursor/skills` + managed `skills-cursor` | ✓ `~/.cursor/mcp.json`, approval-gated | · `~/.cursor/hooks.json` | · `~/.cursor/plugins` | ✓ `.cursor/rules/*.mdc` |
| droid | ✓ `~/.factory/skills` | · `~/.factory/mcp.json` | · plugin `hooks/hooks.json` | · Factory plugins | · `AGENTS.md` |
| qwen | ✓ `~/.qwen/skills` | ✓ `qwen mcp list` (settings.json) | ? | ✓ `~/.qwen/extensions` | · `AGENTS.md` |
| deepseek | ✓ `~/.deepseek/skills` | · `~/.deepseek/config.toml` | ? | ? | ? |
| antigravity · muse · pi | ? | ? | ? | ? | ? |
| *(opencode)* | ✓ `~/.config/opencode/skills` | ✓ `opencode mcp` | · plugins | — | ✓ `AGENTS.md` |
| *(amp)* | ✓ `~/.config/amp/skills` | · `settings.json` | ? | — | ✓ `AGENTS.md` |

Two architecture conclusions:

- **The paths belong in the agent registry, not in the view.** Research 11 §2
  already made per-agent mechanics data (`resume.argv` templates rather than
  special-cased code); the same move applies here. Add a `context` block per
  agent to `src/main/agents/registry.ts` and the reader has **zero** per-agent
  branches. A `?` cell becomes an absent key, and an absent key becomes an
  absent section — not a crash and not a lie.
- **opencode and amp are not in the registry** (research 11 §"Not providers")
  and stay out. The neutral `~/.agents/` root is read regardless, because it is
  where the shared files actually live.

### 2.5 Cost: reading files beats asking the CLIs by two orders of magnitude

| Operation | Measured |
|---|---|
| Full cross-agent skill resolve: 107 entries, realpath dedupe, frontmatter head read | **11.1 ms** |
| `~/.claude.json` (1.17 MB, 2,036 project entries) read + parse | **4.6 ms** |
| `claude plugin list` | 0.23 s |
| **`claude mcp list`** | **2.5 s** — it health-checks every server over the network |

`claude mcp list` also *connects to remote services* to produce its output. A
sidebar that refreshed by shelling out would be slow, would emit network
traffic on a passive UI refresh, and would spawn other people's processes to
draw a list. **The reader reads files.** Health and tool discovery are explicit
on-demand verbs (§7.4). This is not a performance decision; it is the
anti-dashboard rule expressed as a data layer.

### 2.6 These files contain secrets, and the ecosystem already masks them

`~/.cursor/mcp.json` on this machine carries a live API key in an `env` block;
`~/.qwen/settings.json` and `~/.deepseek/config.toml` each carry a provider
key. `codex mcp list` already prints `KEY=*****` for every env value.

**Rule, absolute: Tortie never renders a config value that is a credential.**
Env keys are shown, values are replaced with `••••` and are not copyable. There
is no reveal affordance — the file is one click away in the editor, which is
the surface that already has the user's trust for showing file contents (§7.3).

### 2.7 The headline finding — one real standard, covering one of four artifacts

**There is exactly one real standard, and it covers exactly one of the four artifacts.**

* **Skills are standardized.** [Agent Skills](https://agentskills.io) is a published open
  spec (`github.com/agentskills/agentskills`), originally developed by Anthropic and
  released as an open standard. A skill is a directory containing `SKILL.md` with YAML
  frontmatter. Required fields: `name` (≤64 chars, lowercase alphanumeric + hyphens, no
  leading/trailing/consecutive hyphens, **must match the parent directory name**) and
  `description` (≤1024 chars). Optional: `license`, `compatibility` (≤500), `metadata`
  (string→string map), `allowed-tools` (space-separated, marked experimental). Optional
  sibling directories `scripts/`, `references/`, `assets/`. Loading is three-stage
  progressive disclosure: name+description at startup (~100 tokens), full body on
  activation (<5000 tokens recommended), bundled files on demand. A reference validator
  ships as `skills-ref validate`. (DOC, fetched 2026-08-12.)

  The spec's own client showcase names Claude Code, ChatGPT/Codex, Gemini CLI, Cursor,
  Amp, OpenCode, Factory, pi, GitHub Copilot, VS Code, Goose, Junie, Kiro, Roo Code,
  Trae, OpenHands, Mux, Letta, Firebender, and ~25 more. Of Tortie's twelve agents, the
  showcase covers eight; the remaining four (qwen, muse, antigravity, deepseek) were
  **verified locally** to read `SKILL.md` anyway (§2.10).

  The proof on this machine is stronger than any spec page: **one physical
  `~/.agents/skills/govuk-style/SKILL.md` is symlinked into 26 different harness
  config directories** — `.claude`, `.codex`, `.cursor`, `.gemini`, `.qwen`,
  `.deepseek`, `.factory`, `.copilot`, `.cline`, `.continue`, `.roo`, `.kiro`,
  `.junie`, `.trae`, `.mux`, `.openhands` and ten more — and is listed as a live skill
  by `gemini skills list`,
  `muse skills list --json`, and Claude Code's own skill roster simultaneously. One file,
  many harnesses, no translation layer. That is a standard working.

* **The spec standardizes the *file*, not the *filesystem*.** It says nothing about where
  skills live, what scopes exist, or who wins a name collision. Every agent invented
  those independently, and they disagree — see §2.9, which documents seven
  incompatible precedence models, two of which run in *opposite directions*.

* **MCP standardizes the wire protocol, not the config.** Every agent speaks MCP, and the
  server-entry *shape* has converged hard (`command`/`args`/`env` for stdio, a URL for
  remote). The **file that holds it has not converged at all**: `~/.claude.json` +
  `.mcp.json` (Claude), `[mcp_servers.*]` in `config.toml` (Codex), `~/.cursor/mcp.json`
  (Cursor), a `mcpServers` key inside `settings.json` (Gemini, Qwen), `~/.deepseek/mcp.json`
  (DeepSeek), `~/.factory/mcp.json` (droid), `amp.mcpServers` inside
  `~/.config/amp/settings.json` (Amp), an `mcp` key in `opencode.json` (OpenCode),
  `~/.gemini/config/mcp_config.json` (Antigravity). Ten agents, nine file conventions,
  four serializations (JSON, JSONC, TOML, and JSON-under-a-key-inside-a-settings-file).

* **Hooks are near-convergent by imitation, not by spec.** Claude Code's event vocabulary
  (`PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`)
  with `{matcher, hooks:[{type:"command", command, timeout}]}` has been copied
  structurally by Antigravity (`hooks.json`, same `matcher`/`hooks` wrapper, adds
  `PreInvocation`/`PostInvocation`) and paraphrased by Gemini CLI (`hooks` key in
  `settings.json`; `BeforeTool`/`AfterTool`/`BeforeAgent`/`AfterAgent`/`Notification`/
  `SessionStart`/`SessionEnd`) — and Gemini ships `gemini hooks migrate`, whose entire
  job is "migrate hooks from Claude Code to Gemini CLI". Amp uses a different vocabulary
  entirely (`session.start`, `agent.start`, `agent.end`, `tool.call`, `tool.result`) and
  implements them as TypeScript plugin modules rather than shell commands.

* **Plugins are bespoke everywhere — but they read each other's manifests.** Claude
  (`.claude-plugin/plugin.json` + marketplaces), Codex (`[plugins."name@marketplace"]` in
  `config.toml` + marketplace snapshots), Cursor (`~/.cursor/plugins/`, `--plugin-dir`),
  Gemini/Qwen (called **extensions**), Antigravity (`plugins/<name>/plugin.json`),
  Amp (TS/JS modules), OpenCode (`opencode plugin <module>`), muse (bundled
  `muse-core` plugin cache). The convergence is at the *edges*: the Codex binary
  contains string literals for **all three** of `.codex-plugin/plugin.json`,
  `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` (BINARY), and
  `qwen extensions install` accepts a "claude marketplace (marketplace-url:plugin-name)"
  source (VERIFIED).

**The verdict on the cross-cutting question: one real standard (Agent Skills, file
format only) plus a de-facto reference implementation (Claude Code's directory layout)
that everyone else reads as a compatibility target — sitting on top of N genuinely
bespoke filesystem layouts and N bespoke precedence rules.** A Context sidebar can
therefore render *skills* with one shared model and must render *scope and precedence*
per agent.

**The strongest single piece of evidence for "Claude Code is the reference
implementation":** it is not that Claude Code is popular, it is that four competitors
ship an *import verb* pointed at it, and three read its directories natively.

| Verb | What it does | Evidence |
|---|---|---|
| `claude import [codex\|gemini]` | "Import config from another AI coding agent into Claude Code" (`--dry-run`, `--yes`) | VERIFIED |
| `gemini hooks migrate` | "Migrate hooks from Claude Code to Gemini CLI" | VERIFIED |
| `muse skills import --from claude\|codex` | with `--scope`, `--dry-run`, `--force`, `--json` | VERIFIED |
| `agy plugin import [gemini\|claude]` | "Import plugins from gemini or claude" | VERIFIED |
| `qwen extensions install <claude marketplace>` | installs from a Claude marketplace URL | VERIFIED |
| Cursor reads `.claude/skills`, `~/.claude/skills`, `.codex/skills`, `~/.codex/skills` | "legacy compatibility" | DOC |
| Amp reads `.claude/skills`, `~/.claude/skills`, **and `~/.claude/plugins/cache/`** | in its documented search order | DOC |
| OpenCode reads `.claude/skills` and `~/.claude/skills` | alongside its own | DOC |
| Codex parses `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` | string literals in the shipped binary | BINARY |

And the vendor-neutral root is winning underneath all of it: **`~/.agents/skills` and
`.agents/skills` are read by Codex, Cursor, Gemini, Amp, OpenCode, pi, muse, deepseek,
droid and Antigravity** — that is 10 of 12, and it is the only path in this entire
document that more than half the agents agree on. (Amp adds an XDG variant,
`~/.config/agents/skills`, which also exists here with 8 skills in it.) Notably,
**Claude Code itself does not read `~/.agents/skills`** — this machine bridges the gap
with symlinks from `~/.claude/skills`, which is exactly the workaround a Context sidebar
should be able to explain.

### 2.8 Claude Code in full — the richest case, and the precedence trap

Claude Code is where a wrong answer costs the most, because it has the most layers. Its
precedence rules are documented below exactly, because **a UI that misrepresents
precedence is worse than none**.

#### The four artifact families and where they live

| Artifact | User scope | Project scope | Other |
|---|---|---|---|
| Settings | `~/.claude/settings.json` (VERIFIED) | `.claude/settings.json` (VERIFIED, 7 repos) | `.claude/settings.local.json` (gitignored, VERIFIED present); managed policy at `/Library/Application Support/ClaudeCode/managed-settings.json` on macOS, plus `managed-settings.d/`, a `com.anthropic.claudecode` plist, or a server-managed gateway (DOC) |
| Skills | `~/.claude/skills/<name>/SKILL.md` (VERIFIED, 22 entries — 20 of them symlinks into `~/.agents/skills`) | `.claude/skills/<name>/SKILL.md` (VERIFIED, 10 repos), plus **nested** `.claude/skills/` below cwd | Plugin skills; `~/.claude/commands/*.md` (legacy, still works); reserved folder name `synced` |
| MCP servers | `~/.claude.json` top-level `mcpServers` (VERIFIED — 1 server) | `.mcp.json` at repo root (VERIFIED, 4 repos) | **local** scope = `~/.claude.json` → `projects["<cwd>"].mcpServers` (VERIFIED key present) |
| Hooks | `hooks` key in any settings file | `hooks` key in `.claude/settings.json` (VERIFIED, 7 repos) | `hooks:` in a skill's own frontmatter (VERIFIED in `~/.agents/skills/lore/SKILL.md`); plugin-provided hooks |
| Plugins | `~/.claude/plugins/{installed_plugins.json, known_marketplaces.json, config.json, cache/, marketplaces/}` (VERIFIED) + `enabledPlugins` / `extraKnownMarketplaces` in `~/.claude/settings.json` (VERIFIED) | plugins declared in a repo's `.claude/settings.json` | session-only: `--plugin-dir <path>`, `--plugin-url <url>` |

Live plugin state (`claude plugin list`, VERIFIED): six marketplace plugins, all `user`
scope, all enabled — `cli-printing-press@cli-printing-press`, `gopls-lsp@claude-plugins-official`,
`last30days@last30days-skill`, `security-guidance@claude-plugins-official`,
`swift-lsp@claude-plugins-official`, `vercel@claude-plugins-official` — plus a separate
category the CLI prints under its own heading, **"Skills-directory plugins
(.claude/skills/*)"**: `lore@skills-dir` v3.9.0, loaded from `~/.claude/skills/lore`.

#### The precedence trap: settings and skills resolve in *opposite directions*

This is the single most important fact in this document for UI design.

**Settings precedence — narrowest wins** (DOC, code.claude.com/docs/en/settings):

```
1. command-line arguments          (highest)
2. managed / enterprise policy
3. .claude/settings.local.json
4. .claude/settings.json           (project)
5. ~/.claude/settings.json         (user)          (lowest)
```

**Skills precedence — broadest wins** (DOC, code.claude.com/docs/en/skills):

> "When skills share the same name across levels, enterprise overrides personal, and
> personal overrides project."

```
1. enterprise                      (highest)
2. ~/.claude/skills                (personal)
3. .claude/skills                  (project)
4. bundled skills                  (lowest)
```

So in Claude Code, a **project** `.claude/settings.json` beats your personal settings,
while a **personal** `~/.claude/skills/deploy` beats the project's `.claude/skills/deploy`.
Any panel that draws one "scope" axis and orders it once will be wrong about half its
content. The scope ladder has to be per-artifact.

**MCP precedence — a third, different order** (DOC):

```
1. local    (~/.claude.json → projects[cwd].mcpServers)   (highest)
2. project  (.mcp.json)
3. user     (~/.claude.json → mcpServers)                 (lowest)
```

with the explicit rule: *"the entire server entry from that source is used; fields are
not merged across scopes."* The three scopes match duplicates **by name**; plugins and
connectors match **by endpoint**.

#### Six more Claude Code details a correct UI must carry

1. **Project MCP servers are gated behind approval.** A server in `.mcp.json` is not
   loaded until approved interactively. `claude mcp list` shows unapproved servers as
   `⏸ Pending approval`, and rejected ones as `✘ Rejected (see disabledMcpjsonServers in
   settings)`. The approval state lives in `~/.claude.json` →
   `projects[cwd].enabledMcpjsonServers` / `disabledMcpjsonServers` (**both keys VERIFIED
   present**). A separate, unrelated pair `enabledMcpServers` / `disabledMcpServers` in
   the same file records per-project toggling of user- and local-scope servers. Two
   similarly named key pairs with disjoint meanings is a documented footgun; the UI must
   not conflate them. In an untrusted folder, approvals committed to
   `.claude/settings.json` are **ignored**, so a repo cannot approve its own servers.
2. **Symlinked skills are deduplicated by target.** "If the same target is reachable from
   more than one location, Claude Code loads the skill once." This machine's 20 symlinks
   from `~/.claude/skills` into `~/.agents/skills` therefore produce 20 skills, not 40 —
   but Gemini CLI, reading the same tree, prints eleven `Skill conflict detected` lines
   for exactly this reason (VERIFIED, §2.10). **A naive Context sidebar that walks roots
   and counts will over-count.** Resolve to realpath and dedupe.
3. **Nested project skills load lazily and get path-qualified names.** Skills in
   `.claude/skills/` below the working directory are not loaded at startup; they load the
   first time Claude reads or edits a file in that subdirectory. On a name clash both
   stay available and the deeper one is addressed as `apps/web:deploy`. A panel showing a
   static tree will therefore be showing things that are *available* but not yet *loaded*.
4. **A skill folder can be a plugin.** Adding `.claude-plugin/plugin.json` to a skill
   folder makes it load as `<name>@skills-dir` and lets it bundle agents, hooks and MCP
   servers. `claude plugin init` scaffolds exactly this at `~/.claude/skills/<name>/`.
   The Skills view and the Plugins view therefore overlap, and the overlap is by design.
5. **Skills carry a context budget.** The combined `description` + `when_to_use` text is
   truncated at **1,536 characters** in the startup listing, and total listing size is
   capped by `skillListingBudgetFraction` / `SLASH_COMMAND_TOOL_CHAR_BUDGET`. Visibility
   is separately controllable from settings via `skillOverrides`
   (`"on"` / `"name-only"` / `"off"`), which the interactive `/skills` menu writes into
   `.claude/settings.local.json`. Plugin skills are exempt from `skillOverrides`.
6. **Everything can be switched off at once.** `--safe-mode` starts "with all
   customizations (CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands and
   agents, output styles, workflows, custom themes, keybindings, and more) disabled" and
   sets `CLAUDE_CODE_SAFE_MODE=1`; `--bare` skips hooks, LSP, plugin sync and CLAUDE.md
   auto-discovery; `--setting-sources user,project,local` selects which layers load at
   all; `--strict-mcp-config` ignores every MCP source except `--mcp-config`. Qwen has
   the same escape hatch (`--safe-mode`). **These flags are launch-time argv**, which
   means Tortie's manifest already records whether a durable session was started with
   its customizations disabled — and the Context view must read that, not the disk, to
   tell the truth about a live session (§8).

### 2.9 Global vs local, per agent — the seven precedence models

"Global vs local" does not mean the same thing twice in this list. These are the actual,
irreconcilable models:

**Model A — narrowest wins (the IDE-settings intuition).** Claude Code *settings*:
CLI > managed > `settings.local.json` > project > user. Gemini CLI *settings*:
CLI > env > system > project > user > system-defaults.

**Model B — broadest wins (the inverse).** Claude Code *skills*: enterprise > personal >
project > bundled. This is the trap. In the same product, two artifact families resolve
in opposite directions.

**Model C — workspace wins, with an alias tier inside each level.** Gemini CLI *skills*:
built-in < extension < user < workspace, and *within* a tier `.agents/skills` beats
`.gemini/skills`. Note this is the opposite of Claude Code's skill order.

**Model D — no override at all.** Codex: *"If two skills share the same `name`, Codex
doesn't merge them; both can appear in skill selectors."* Nothing shadows anything; the
user disambiguates. Codex also exposes explicit registration with
`[[skills.config]] path=… enabled=false`.

**Model E — an ordered search path, first hit wins.** Amp's eleven-entry list
(`~/.config/agents/skills` → `~/.agents/skills` → `~/.config/amp/skills` →
`.agents/skills` → `.claude/skills` → `~/.claude/skills` → `~/.claude/plugins/cache` →
`amp.skills.path` → built-ins → personal repo → workspace repo). pi is the same idea
with a user-editable `skills: [...]` array.

**Model F — an explicit priority list with a declarative escape hatch.** Antigravity, in
its own shipped documentation: workspace project (hierarchical walk cwd → repo root) >
declared configurations (`skills.json` / `plugins.json` in the workspace) > global
discovery (`~/.gemini/config/`) > built-in > global declared. Its `skills.json` /
`plugins.json` schema supports `inherits` (chained config files) plus per-entry
`include_only` / `exclude` regex filters and three path-resolution rules
(absolute · `~/`-relative · repo-root-relative).

**Model G — a scope enum the CLI will tell you about.** muse: every skill carries an
explicit `scope` of `user | project | built-in | plugin`, and `enable`/`disable`/
`user-only` are per-scope operations. It is the only agent in the set that reports its
own resolution as structured data (§2.11).

A sidebar cannot flatten these. It can, however, do the one thing that is honest across
all of them: **show the resolved winner, and show the shadowed losers underneath it,
labelled with the file that produced each.**
### 2.10 The full matrix — agent × artifact, with paths, formats and evidence

Legend: **V** VERIFIED on disk / by live command · **B** from the shipped binary ·
**D** vendor docs only · **—** none found.

#### Skills

| Agent | User / global root | Project root | Also reads | Ev. |
|---|---|---|---|---|
| claude | `~/.claude/skills/` | `.claude/skills/` (+ nested, lazy) | `.claude/commands/*.md`; plugin skills; **not** `~/.agents/skills` | V |
| codex | `$CODEX_HOME/skills` → `~/.codex/skills` (built-ins under `skills/.system/`) | `$CWD/.agents/skills`, `$REPO_ROOT/.agents/skills` | `$HOME/.agents/skills`; admin `/etc/codex/skills` | V+B+D |
| cursor-agent | `~/.cursor/skills/`, `~/.agents/skills/` (+ Cursor-managed `~/.cursor/skills-cursor/`) | `.cursor/skills/`, `.agents/skills/` | legacy `.claude/skills`, `.codex/skills`, `~/.claude/skills`, `~/.codex/skills` | V+D |
| gemini | `~/.gemini/skills/`, `~/.agents/skills/` | `.gemini/skills/`, `.agents/skills/` | built-in + extension-provided skills | V+D |
| qwen | `~/.qwen/skills/` | `.qwen/skills/` (by symmetry) | shares the Gemini CLI codebase | V |
| muse | `~/.agents/skills/` (VERIFIED as muse's `user` scope) | project scope (`--source project`) | bundled `muse-core` skills; plugin skills | V |
| pi | `~/.pi/agent/skills/`, `~/.agents/skills/` | `.pi/skills/`, `.agents/skills/` (after trust) | extra roots via a `skills: [...]` array in settings | V+D |
| antigravity | `~/.gemini/config/skills/`; built-ins in `~/.gemini/antigravity-cli/builtin/skills/` | `.agents/` \| `.agent/` \| `_agents/` \| `_agent/` → `skills/` | `skills.json` declared roots, with `inherits`/`include_only`/`exclude` | V+D |
| deepseek | `~/.deepseek/skills/` (built-in `skill-creator`) | `.agents/skills` | `skills_dir` config key | V+B |
| droid | `~/.factory/skills/` | `<repo>/.factory/skills/`, `<area>/.factory/skills/` | legacy `.agents`/`.agent` at repo and home; mission-scoped; plugin-distributed | D (dir V) |
| amp | `~/.config/agents/skills`, `~/.agents/skills`, `~/.config/amp/skills` | `.agents/skills` (searched upward), `.claude/skills` | `~/.claude/skills`, `~/.claude/plugins/cache/`, `amp.skills.path`, built-ins, personal + workspace skill repos | V+D |
| opencode | `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills` | `.opencode/skills`, `.claude/skills`, `.agents/skills` | — | V+D |

#### MCP servers

| Agent | File | Format / key | Scopes | Ev. |
|---|---|---|---|---|
| claude | `~/.claude.json`; `.mcp.json` | JSON, `mcpServers` | user / project / local + enterprise managed; approval gate | V+D |
| codex | `~/.codex/config.toml` | TOML, `[mcp_servers.<name>]` (`command`,`args`,`env`,`cwd`,`enabled`, or bare `url`) | global; `CODEX_HOME` relocates | V |
| cursor-agent | `~/.cursor/mcp.json`, `.cursor/mcp.json` | JSON, `mcpServers` | global / project; per-server approve list via `mcp enable/disable` | V+D |
| gemini | `~/.gemini/settings.json`, `.gemini/settings.json` | JSON, `mcpServers` key inside settings | system-defaults / user / project / system | V+D |
| qwen | `~/.qwen/settings.json` | JSON, `mcpServers` | same layering; `qwen mcp approve/reject` for pending servers | V |
| muse | not surfaced by the CLI; no `mcp` subcommand | — | — | V(absent) |
| pi | not surfaced in the skills docs; extensions ship tools instead | — | — | D |
| antigravity | `~/.gemini/config/mcp_config.json` (**file exists here, 0 bytes**); `plugins/<n>/mcp_config.json` | JSON, `mcpServers`; stdio (`command`/`args`/`env`) or SSE (`serverUrl`) | global / plugin | V+D |
| deepseek | `~/.deepseek/mcp.json` (path printed by the CLI; file not yet created) | JSON; `mcp_config_path` config key | global | V+B |
| droid | `~/.factory/mcp.json`, `.factory/mcp.json` (project **and** any ancestor folder) | JSON, `mcpServers`; `type`, `disabled`, `disabledTools`, `timeout`, `connectTimeout` | user / folder / project | D |
| amp | `~/.config/amp/settings.json(c)`, `.amp/settings.json(c)` | JSON, **`amp.mcpServers`** (a dotted key, not a nested object) | user / workspace | D (file V) |
| opencode | `~/.config/opencode/opencode.json(c)`, project `opencode.json` | JSON, `mcp` key; `type:"local"` with `command:[...]` or `type:"remote"` with `url`; each has `enabled` | global / project | V+D |

#### Hooks

| Agent | Where | Event vocabulary | Ev. |
|---|---|---|---|
| claude | `hooks` key in any settings file; `hooks:` in SKILL.md frontmatter; plugin hooks | `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, … with `matcher` + `{type:"command", command, timeout, statusMessage}` | V |
| codex | `[hooks.state."<plugin>@<marketplace>:hooks/<file>.json:<event>:<idx>:<idx>"]` in `config.toml`, each with `trusted_hash = "sha256:…"` and `enabled` | `session_start`, `stop` seen live | V |
| gemini | `hooks` key in `settings.json`; `gemini hooks migrate` imports Claude's | `BeforeTool`, `AfterTool`, `BeforeAgent`, `AfterAgent`, `Notification`, `SessionStart`, `SessionEnd` | V+D |
| qwen | `qwen hooks` subcommand ("use `/hooks` in interactive mode"); `--safe-mode` disables hooks | Gemini-derived | V |
| antigravity | `hooks.json` in a customization root (`.agents/hooks.json`) or `plugins/<n>/hooks.json` | `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`; per-hook `enabled`; matcher is a regex over lowercased tool names | V (its own bundled docs) |
| deepseek | `hooks` table in `~/.deepseek/config.toml` | `hooks.rs`, `lsp_hooks.rs` in the binary; vocabulary not enumerated | B |
| amp | plugin lifecycle events, implemented as TS/JS modules | `session.start`, `agent.start`, `agent.end`, `tool.call`, `tool.result` | D |
| cursor-agent | a `create-hook` skill ships in `~/.cursor/skills-cursor/`, so hooks exist; no `~/.cursor/hooks.json` on this machine | — | V(partial) |
| muse / pi / opencode / droid | none found | — | — |

#### Plugins / extensions

| Agent | Concept | Where | Ev. |
|---|---|---|---|
| claude | plugins + marketplaces | `~/.claude/plugins/{installed_plugins.json, known_marketplaces.json, cache/, marketplaces/}`; `enabledPlugins` in settings; `.claude-plugin/plugin.json`; skills-dir plugins | V |
| codex | plugins + marketplace snapshots | `[plugins."<name>@<marketplace>"] enabled=true` and `[marketplaces.<name>]` in `config.toml`; cache at `~/.codex/plugins/cache/<marketplace>/<plugin>/` (12 enabled here: browser, documents, github, hyperframes, pdf, presentations, remotion, sites, specstory, spreadsheets, template-creator, visualize) | V |
| cursor-agent | plugins | `~/.cursor/plugins/local/`, `cursor-agent plugin`, `--plugin-dir` | V |
| gemini | **extensions** | `gemini extensions install/link/enable/disable`; `-e` / `--extensions` / `--list-extensions` at launch | V |
| qwen | **extensions** | `~/.qwen/extensions/extension-enablement.json`; transactional store at `~/.qwen/extension-store/{state.json,staging,rollback,transactions}`; installs from git, local path, archive, npm scope, **or a Claude marketplace** | V |
| muse | plugins | `~/.local/share/muse/plugins/cache/builtin/muse-core/` (13 bundled: create-plugin, create-skill, doctor, git, grill, grill-and-record, import, manage-settings, plan, …) | V |
| pi | **extensions / packages** | `pi install <source>`, `pi list`, `pi config` (TUI to enable/disable package resources, Tab switches scope); recorded in `~/.pi/agent/settings.json` | V |
| antigravity | plugins | `plugins/<name>/plugin.json` (+ optional `mcp_config.json`, `hooks.json`, `rules/`, `skills/`); enable state in `~/.gemini/config/config.json` under a `plugins` map keyed by **directory** name; `agy plugin list/enable/disable/import` | V+D |
| amp | plugins (TS/JS) | `.amp/plugins/`, `~/.config/amp/plugins/`; entry `plugin-name.ts` \| `.js` \| `plugin-name/index.ts` | D |
| opencode | plugins | `opencode plugin <module>` "install plugin and update config"; `--pure` runs without external plugins | V |
| deepseek / droid | none surfaced (droid: plugins can distribute skills) | — | V(absent) / D |

#### Instructions / rules / memory

| Agent | Files | Ev. |
|---|---|---|
| claude | `CLAUDE.md`, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, `.claude.local.md`; `@`-includes | V |
| codex | `AGENTS.md` (an empty `~/.codex/AGENTS.md` exists here); `~/.codex/rules/default.rules` (48 KB); `~/.codex/prompts/*.md` | V |
| cursor-agent | `.cursor/rules/*.mdc`, `~/.cursor/rules/*.mdc`; `~/.cursor/commands/*.md`; `~/.cursor/agents/*.md` | V |
| gemini / antigravity | `GEMINI.md`, `AGENTS.md`, `.agents/rules/*.md`; hierarchical walk cwd → repo root; rules with `trigger: model_decision` load lazily, `always_on` load unconditionally | V+D |
| deepseek | `deepseek init` creates `AGENTS.md`; config keys `instructions`, `notes_path`, `memory_path` | V+B |
| qwen | `~/.qwen/memories/`, `output-language.md` | V |
| opencode / amp / muse / pi / droid | `AGENTS.md` convention | D |

### 2.11 Constraints the design inherits

These are not design proposals; they are facts that constrain any design.

1. **Ask the agent, do not re-implement the resolver.** Five agents will report their own
   resolution, and one of them does it in JSON. `muse skills list --json` returns, per
   skill: `id`, `name`, `description`, `scope`, `source.type`, `path`, `activation`,
   `diagnostics[]`, `provenance`, and a `context_cost` object with `startup_bytes` and
   `startup_estimated_tokens`. `gemini skills list --all` prints name, `[Enabled]`,
   description and resolved `Location`, and volunteers `Skill conflict detected: "X" from
   A is overriding the same skill from B`. `claude plugin list` prints name, version,
   scope, status, and separates skills-dir plugins. `agy plugin list` and `pi list`
   report empty states cleanly. Per CLAUDE.md's "assemble, never reimplement", the
   Context view must treat these outputs as authority: re-deriving Claude Code's skill
   precedence in TypeScript is a fifth implementation of a rule that changes without
   notice. But shelling out on the render path costs 2.5 s and a network round trip
   (§2.5), so "treat as authority" cannot mean "call on every refresh". The
   reconciliation is in the box below this list.

2. **Deduplicate by realpath, not by path.** One `SKILL.md` is reachable from up to five
   roots per agent on this machine. Claude Code dedupes by target; Gemini reports a
   conflict for the same tree. Any count Tortie shows must resolve symlinks first, or it
   will show 40 skills where the agent sees 20.

3. **On-disk state is not loaded state, and Tortie is uniquely exposed to that.** Claude
   Code hot-reloads skill directories mid-session; Codex's own bundled `plugin-creator`
   skill instructs the user to *"use a new thread to try the updated plugin, so that
   Codex picks up new skills"*. Meanwhile a Tortie session can be days old, having
   survived quit and reboot. Worse, the session may have been launched with `--safe-mode`,
   `--bare`, `--setting-sources`, `--strict-mcp-config` or `-e/--extensions`, in which
   case *none* of the disk state applies. **The manifest already stores the full original
   argv** (an architecture invariant), so the honest framing for a session-scoped view is
   "what this session was started with", read from the manifest, with the disk state
   shown as "what a new session would get". Any panel that shows only the disk and
   implies it describes the running agent will lie, and durability-adjacent lies are
   exactly what the verification tiers exist to prevent.

4. **These files carry secrets and they move under you.** Provider API keys sit in plain
   text in `~/.qwen/settings.json` and `~/.deepseek/config.toml`; MCP `env` blocks carry
   bearer tokens (`~/.cursor/mcp.json`); OAuth material sits in
   `~/.gemini/antigravity-cli/antigravity-oauth-token` and `~/.codex/auth.json`. A view
   that renders MCP server config verbatim will paint credentials onto a screen the user
   may be sharing. Values must be masked by default — DeepSeek's own `config list` sets
   the precedent by printing `api_key = sk-5***5995`. Separately, two config files
   changed *during* this survey because the user's own agents were running: any cached
   read needs a watcher or an explicit refresh, and no write path can assume it owns the
   file.

5. **Cost is a first-class attribute, and the agents already measure it.** Skills are not
   free: the Agent Skills spec budgets ~100 tokens per skill at startup, Claude Code caps
   each listing entry at 1,536 characters and the whole listing at a configurable budget
   fraction, muse reports `startup_estimated_tokens` per skill, and the Codex binary emits
   telemetry named `codex.thread.skills.enabled_total`, `codex.thread.skills.kept_total`,
   `codex.thread.skills.truncated` and `codex.thread.skills.description_truncated_chars`
   (BINARY). With 25 shared skills fanned across 12 agents, "what is this costing me every
   turn" is a real question the substrate can answer honestly — and it is a *static*
   number attached to a thing the user chose, not a counter that rises on its own.

6. **Read-mostly is the correct v1.** Writing these files means being right about seven
   precedence models, four serialization formats, two files that mutate under you, and
   several that hold credentials. The safe surface is: show the resolved set, show what it
   shadows, name the exact file, and offer *Reveal in Finder* / *Open in editor* — Tortie
   already has an editor. Enable/disable toggles, where they are wanted, should be
   delegated to the agent's own verb (`gemini skills disable`, `muse skills disable
   --scope`, `claude plugin disable`, `agy plugin disable`, `cursor-agent mcp disable`,
   `qwen extensions disable`) rather than hand-edited into config. Creation
   (`New Skill`, VS Code's button) is well served by the agents' own scaffolders —
   `claude plugin init`, `gemini skills install`, `muse skills install`,
   `codex`'s `skill-creator`, `deepseek`'s `skill-creator`, `cursor`'s `create-skill`. §13.1 draws the final
   line: JSON-backed enable/disable through `jsonc-parser` is in v1; TOML and
   everything structural is "Open the file".


#### Resolved: files render, CLIs verify and mutate

The substrate pass and the design pass reached opposite conclusions here — *ask
the agent* versus *read the files* — and both had evidence. The reconciliation,
which is binding on the builder:

| Job | Mechanism | Why |
|---|---|---|
| **Render the list** | Read files. Registry-declared roots, realpath dedupe, frontmatter heads, JSON/TOML parse | 11.1 ms for the whole cross-agent resolve, offline, no child processes, no network (§2.5). A passive UI refresh must not spawn other people's programs. |
| **Mutate** (enable, disable, install, remove) | The agent's own verb — `gemini skills disable`, `muse skills disable --scope`, `claude plugin disable`, `agy plugin disable`, `cursor-agent mcp disable`, `qwen extensions disable` | The agent owns its own state transitions, and its verb writes the file the way it expects to read it. This is "assemble, never reimplement" applied to writes, where it costs nothing. |
| **Answer a live question** (is this server reachable, what tools does it expose) | The agent's verb or one direct connect — **on demand, never on refresh** | §7.4. It costs seconds and network, so it is a button, not a poll. |
| **Prove the resolver is right** | The agents' own listings, in the test suite | `gemini skills list --all` volunteers `Skill conflict detected: X is overriding Y` — eleven of them here — and `muse skills list --json` returns `scope`, `path`, `activation` and `context_cost.startup_estimated_tokens` per skill. These are **free oracles**: the conformance test diffs Tortie's resolved set against them (§16). |

So Tortie does not re-derive precedence *in production and hope* — it re-derives
it in a pure function and **proves it against the agents' own answers in CI**,
the same move `conformance:resume` makes for registry resume claims. That is the
only version of "do not reimplement the resolver" that survives a 2.5-second
`claude mcp list` on the render path.


---

## 3. Where the things come from — the marketplace question, and the trust model

§1 refuses a store. This section answers what is left over and cannot be
avoided: **where the artifacts in this view come from**, which source Tortie
should name as its default, and what has to be true before a button in Tortie
causes someone else's code to run on this machine. Installing a skill or an MCP
server is executing someone else's instructions inside your agents, with your
credentials — that sentence belongs in the design, not in a footnote, so it is
in §3.7.

**Every endpoint claim in this section was re-hit by the synthesizer on
2026-08-12**, after the marketplace pass wrote it, because a recommendation that
rests on an undocumented endpoint has to be checked twice:

| Call | Result today |
|---|---|
| `GET skills.sh/api/search?q=postgres&limit=2` | **200** in 0.99 s, unauthenticated — `supabase-postgres-best-practices` (343,376 installs), `prisma-postgres` (157,673) |
| `GET skills.sh/api/v1/skills/search?q=postgres` (the *documented* one) | **401** `authentication_required` — needs a Vercel OIDC bearer token |
| `GET add-skill.vercel.sh/audit?source=supabase/agent-skills&skills=…` | **200** in 0.22 s, unauthenticated — `ath: safe`, `socket: safe (0 alerts, score 90)`, `snyk: low`, `zeroleaks: safe (93)`, each with its scan date of 2026-04-16 |
| `GET registry.modelcontextprotocol.io/v0/servers?search=postgres&limit=1` | **200** in 0.36 s — namespaced `ai.waystation/postgres`, repository, version, `remotes[]`, `_meta.status: active` |
| `GET registry.smithery.ai/servers?q=postgres&pageSize=1` | **200**, unauthenticated — `qualifiedName`, `displayName`, verification and use-count fields |

The published API is a trap and the CLI's own API is open. Anyone designing from
the documentation would conclude Tortie cannot drive skills.sh at all.


### 3.1 Reconciling with §1's refusal

§1 refuses "a marketplace browser (an app store is a dashboard with a
checkout)", and §5.1 rejects the `extensions` codicon because it "would promise
a marketplace". **Both are right and this part does not overturn either.** The
distinction that makes them compatible:

- **A store is a place you browse.** Trending, featured, leaderboards, install
  counts ticking up, a landing surface you open with no goal. That is a
  dashboard, the Zen forbids it, and nothing here proposes it.
- **A source is a place you fetch from when you already know what you want.**
  No landing surface, no rail entry, no badge. It appears only when the user
  types a query or picks *Add…*, and it disappears when they are done.

So: **`layers` stays, `⌃⇧C` stays, no badge, no browse surface.** What this part
adds is a query field with a network fallback, a preview sheet, and five verbs
that shell out. If a later round grows a "featured" row, this section is the
thing it violated.

### 3.2 skills.sh — the operator's prior, investigated properly

**What it is** (measured). Vercel's open agent-skills directory plus a CLI,
`npx skills`. Version **1.5.22** here; npm package `skills`, binaries `skills`
and `add-skill`; **MIT, © 2026 Vercel, Inc.** (LICENSE read locally); repo
`vercel-labs/skills`, ~28.7k stars, actively developed. **Two runtime
dependencies** (`tar`, `yaml`) — which matters, because a marketplace path that
drags a hundred packages into a signed Electron app is a different proposal from
one that drags two.

**Coverage: skills only, and this is decisive.** The CLI's own compatibility
matrix has four rows — basic skills, `allowed-tools`, `context: fork`, hooks —
where "Hooks" means *a skill that declares hooks* (supported by 4 of 19 agents
listed), not hook management. There is **no MCP server management anywhere** in
the CLI or its API. It reads `.claude-plugin/marketplace.json` and `plugin.json`
only to discover skills declared inside them. So skills.sh can be the best
answer for one of the five categories in §4, and cannot be the answer for the
other four.

**How an install actually works** (measured). A source is `owner/repo`, a git or
GitLab URL, or a skills.sh pack URL (`/p/<slug>`) — resolved **through GitHub,
not through a package registry**. The CLI clones, finds `SKILL.md` files
(bounded depth-3 walk of `skills/`, `.agents/skills/` and the per-agent dirs,
plus manifest-declared paths), then installs **one canonical copy into
`~/.agents/skills/<name>` and symlinks it into each selected agent's
directory** — `--copy` opts out. **That is exactly the mechanism §2.2 measured
and §9.2 designs against**: the ecosystem's dedupe convention and this
registry's install model are the same fact seen twice.

State lands in `~/.agents/.skill-lock.json`, per skill:

```json
"lore": { "source": "specstoryai/getspecstory", "sourceType": "github",
          "sourceUrl": "https://github.com/specstoryai/getspecstory.git",
          "skillFolderHash": "6827e5eb1eeda096f609aa836f4438ffa9b1066b",
          "installedAt": "…", "updatedAt": "…" }
```

plus `lastSelectedAgents` (this machine remembers 13). Project scope writes
`skills-lock.json`; `skills experimental_install` restores from it. **The
`skillFolderHash` is the pin Tortie needs for §3.7 rule 4 and it is already
being written today.**

**The API, and the trap.** The *documented* `/api/v1/*` endpoints (leaderboard,
search, curated, detail, audit) **require a Vercel OIDC token** — measured:
`GET skills.sh/api/v1/skills/search?q=postgres` → `401
authentication_required`. Anyone designing against the published docs would
conclude Tortie cannot drive this registry. **The CLI does not use those
endpoints.** Recovered from its bundle and confirmed live, unauthenticated:

```
GET https://skills.sh/api/search?q=<q>&limit=<n>[&owner=<o>]         → 200
    {"query","searchType":"fuzzy|semantic","count",
     "skills":[{id,skillId,name,installs,source}]}
GET https://add-skill.vercel.sh/audit?source=<owner/repo>&skills=<a,b>  → 200
    {"<slug>":{"ath":{risk,analyzedAt},
               "socket":{risk,alerts,score,analyzedAt},
               "snyk":{risk,analyzedAt},
               "zeroleaks":{risk,score,analyzedAt}}}
GET https://add-skill.vercel.sh/t?...                                  → telemetry
```

Both hosts are env-overridable (`SKILLS_API_URL`, `SKILLS_DOWNLOAD_URL`), which
is the bring-your-own hook, free.

**The audit endpoint is the find of this research.** Four independent scanners
(`socket`, `snyk`, `zeroleaks`, and `ath` rendered as "Gen" in the CLI's table),
each with `risk ∈ safe|low|medium|high|critical` and a scan date, free, no auth,
~3s timeout in the CLI's own client. Measured response for
`supabase/agent-skills`:

```
{"supabase-postgres-best-practices":{"ath":{"risk":"safe",…},
 "socket":{"risk":"safe","alerts":0,"score":90,…},
 "snyk":{"risk":"low",…},"zeroleaks":{"risk":"safe","score":93,…}}}
```

No other source in this survey gives a third-party client a content-safety
signal it can render before an install. That single endpoint is most of why the
recommendation lands where it does.

**Telemetry, stated plainly.** Every install pings `add-skill.vercel.sh/t` with
the CLI version, the detected agent and a CI flag, unless `DISABLE_TELEMETRY` or
`DO_NOT_TRACK` is set. **Those pings are the install counts** that make the
registry rankable at all. Recommendation: Tortie leaves it on, discloses it in
one sentence on the source's row, and honours a single global "don't send usage
data" switch that exports `DO_NOT_TRACK=1` to every marketplace child process.
Silently disabling it is free-riding on a signal we consume; silently leaving it
undisclosed is worse. DESIGN-SPEC S3A's "gmux has no cloud component and never
phones home" was already qualified by Phase 15's SpecStory sign-in; the honest
rule now is **never unattended**, and this is the sentence that keeps it true.

**Scale, honestly.** The homepage advertised a figure over one million on
2026-08-12. That number is not verifiable as distinct skills and must not be
repeated in Tortie's UI. What *is* measured: search returns real entries with
install counts in the hundreds of thousands
(`supabase/agent-skills/supabase-postgres-best-practices` → 343,376) and the CLI
knows 76 agent targets — including `.factory/skills` for droid, `.pi/skills`,
`.qwen/skills`, and `.agents/skills` for codex/cursor/gemini/copilot/amp.
**Two of Tortie's ten launchable agents — muse and deepseek — are absent from
that table entirely.**

### 3.3 The alternatives, assessed rather than listed

**Official MCP registry** (`registry.modelcontextprotocol.io`) — measured live,
unauthenticated. `GET /v0/servers?search=postgres&limit=2` → 200, with a clean
schema: reverse-DNS `name`, `description`, `version`, `repository`, `packages[]`
(npm/pypi/oci with `registryBaseUrl`), `remotes[]` (streamable-http/sse), and
`_meta` carrying `status: active` plus publish timestamps. ~9,650 latest-server
records mid-2026 (read). Its trust story is the best in the category **and it is
structural**: names are namespaced and publishing requires proving the
namespace — GitHub OAuth or OIDC for `io.github.*`, DNS or HTTP verification for
domains. It proves **who** published, never **what** they published: no scanning,
no review, no signing. Anthropic operates it; GitHub, Microsoft and PulseMCP
back it.

**Smithery** — measured live: `GET registry.smithery.ai/servers?q=postgres` →
200 unauthenticated, returning `verified`, `useCount`, `remote`, `isDeployed`,
`bySmithery`, `inactive` and a relevance `score`. A richer quality vocabulary
than the official registry, ~6,000 servers (read), one-command installs,
client-aware config, hosted execution for many servers, and it has extended to
skills. It is a company's product with a commercial tier — a different kind of
dependency from a protocol registry, and the reason it is recommended as a
*listed* source rather than a default.

**mcp.so / PulseMCP / awesome-mcp-servers** — directories, in descending order
of usefulness. PulseMCP indexes 22,000+ servers (read) and is the broadest map.
mcp.so is a community catalogue; probed 2026-08-12, `mcp.so/api/servers` returns
the app shell — **no documented public API to drive**. `awesome-mcp-servers` is
a README. All three are places to read about servers. None is an install
mechanism and none can be a default.

**Claude Code plugin marketplaces** — not a marketplace, a *mechanism*, and the
most complete one in the ecosystem. A `marketplace.json` lists plugins; each
plugin's `source` is `github` / `url` / `git-subdir` / **`local`** / `archive`;
git sources take `ref` and `sha`, where the **`sha` is the effective pin**;
archives take `sha256` and **the install is refused on mismatch**. One plugin
carries skills, agents, hooks, MCP servers, LSP servers and commands — all of
§4's categories in one unit. Measured on the official directory
(`claude-plugins-official`): **287 entries — 148 `url`, 84 `git-subdir`, 2
`github`, 53 bare shorthand strings; 234 carry a commit `sha`, 83 carry a
`ref`.** So the mechanism supports exact pinning and the flagship directory
mostly uses it — which is the honest version of the claim, and the reason
§3.7 rule 4 records Tortie's own hash rather than trusting the catalogue's.
Enterprise controls exist (managed settings, allowlisted marketplaces, org sync
from private repos, reserved marketplace names).

**Codex has independently adopted a near-identical format** (measured):
`.agents/plugins/marketplace.json`, `.codex-plugin/plugin.json`, `.mcp.json`,
`skills/`, plus `policy: {installation, authentication}`. Three marketplaces are
configured here and **all three are `source_type = "local"`**. This is becoming
the cross-agent bundle format the way `SKILL.md` became the cross-agent skill
format, and it means the plugin verbs Tortie learns for Claude Code mostly
transfer.

**GitHub skill repos** — the substrate under everything above:
`vercel-labs/skills`, `anthropics/skills`, `mattpocock/skills`,
`supabase/agent-skills`, and the eight repos this machine installed from
(measured in `.skill-lock.json`). Zero infrastructure, arbitrary licences, no
review, no versioning beyond git. Essential as a *source type*; a shrug as a
*default*.

**Newer, and worth knowing.** (a) **agentskills.io** — the Agent Skills
specification, originated by Anthropic and released as an open standard, ~50
client implementations; the `skills` CLI validates against
`schemas.agentskills.io/discovery/0.2.0/schema.json` (that host did not resolve
from here on 2026-08-12 — flagged, not diagnosed). This spec is why `SKILL.md`
is portable at all. (b) **Docker MCP Catalog / Toolkit** — 270+ servers as
signed container images with SBOMs and build provenance, verifiable at runtime
with `docker mcp gateway run --verify-signatures`. **The only option in this
survey with cryptographic supply-chain guarantees**, and the only one costing a
Docker dependency. (c) Commercial skill stores (skills-hub.ai, Agensi, 2,000+
skills three months after launch) — no open API worth driving; skip. (d) Cursor
and Gemini now ship their own marketplace/extension mechanisms
(`cursor-agent plugin marketplace`, `gemini extensions`), which means "one
default" will keep re-opening as a question.

### 3.4 Assessed as a default for Tortie

| Source | Covers | Breadth | Quality signals | Programmatic install | Offline | Trust |
|---|---|---|---|---|---|---|
| **skills.sh** | skills | GitHub-wide, 76 agent targets | install counts + **4-scanner audit API**, free, unauthenticated | `npx skills` (MIT, 2 deps) + `/api/search` | install needs network; lockfile restore still clones | none at publish — anyone's repo; scanners are the only gate |
| **Official MCP registry** | MCP | ~9.6k | **namespace-verified publisher**, status, versions | plain REST, no auth (install still runs npx/uvx/docker) | remote only | strongest identity story; no content review |
| **Smithery** | MCP (+skills) | ~6k | `verified`, use counts, deployment state | REST + `smithery` CLI | hosted servers always need network | vendor-curated; commercial dependency |
| **Claude / Codex plugin marketplaces** | all five | 287 official + any repo | **SHA-pinned sources, archive digests, org allowlists** | `claude plugin …` / `codex plugin …` | **`local` source type works fully offline** | best mechanism; official directory curated by Anthropic |
| **Docker MCP catalog** | MCP | 270+ | **signatures + SBOM + provenance** | `docker mcp` | image cache | strongest; needs Docker |
| PulseMCP · mcp.so · awesome-* | MCP | 22k / large / large | popularity at best | none | n/a | directories, not distributors |

### 3.5 Recommendation — two defaults, named out loud, plus bring-your-own

1. **skills.sh for skills.** It is the operator's prior and it survives
   scrutiny: MIT, two dependencies, 76 agent targets, a working unauthenticated
   search API, and — uniquely — a free four-scanner audit endpoint that gives
   Tortie something real to show *before* an install. Its
   symlink-into-`~/.agents/skills` model is precisely the identity model §2.2
   measured and §9.2 designs against, so adopting it adds no new concept.
2. **The official MCP registry for MCP servers**, because namespace
   verification is the only publisher-identity guarantee in the category and it
   is protocol-level rather than vendor-level. **Smithery ships as a second
   listed source** — not a fallback, a source the user can add in one click —
   because its `verified` flag and hosted servers cover cases the official
   registry does not.
3. **Claude and Codex plugin marketplaces for plugins**, driven through their
   own CLIs. **Tortie hosts nothing and publishes nothing.**
4. **Hooks get no marketplace, and that is a refusal rather than a gap.** A hook
   is a shell command that runs unattended on a lifecycle event. A hook store is
   a malware delivery mechanism with a nice icon. Hooks arrive inside plugins,
   where the plugin's confirm (§9.1) already names every one of them, or the
   user writes them.
5. **Instructions get no marketplace either.** `CLAUDE.md` is the user's voice.

**Bring your own source, first-class from day one.** This adds a **sixth,
collapsed-by-default section** to §5's five — **SOURCES** — listing every
configured source with its kind and its last-refreshed time. `Add source…` accepts: a GitHub `owner/repo`, a git URL, a
**local directory**, a Claude or Codex marketplace, or an alternate registry
base URL (`SKILLS_API_URL` / `SKILLS_DOWNLOAD_URL` are already env-overridable;
`claude plugin marketplace add` and `codex plugin marketplace` both take local
paths — and Codex ships three `source_type = "local"` marketplaces on this
machine today). A team that vendors skills into a private repo, and an
air-gapped machine with a directory on disk, are first-class configurations and
not workarounds.

### 3.6 What "first class" means, concretely

Five verbs, each mapped to a measured mechanism. Nothing here invents a
protocol, and nothing here adds a browse surface.

| Verb | Where it lives | Mechanism (all measured) |
|---|---|---|
| **Search** | the §5 filter field. It filters what is installed; pressing ↩ on a query with no local match offers one row — *"Search skills.sh for 'postgres'"* — and that row is the entire storefront | `GET skills.sh/api/search`; `GET registry.modelcontextprotocol.io/v0/servers?search=`; `claude plugin list --available --json` (works offline against cached marketplaces) |
| **Preview before installing** | the §7 detail surface in a "not installed" mode: full description, file tree, **whether it ships `scripts/`**, source repo and commit, and the audit row with its scan date | `GET add-skill.vercel.sh/audit`; registry detail records; `claude plugin details <name>` |
| **Install** | one primary button in the preview, with scope (this project / all projects) and an agent picker defaulting to the detected fleet | `npx skills add <src> --agent … [-g] -y`; `claude plugin install <p> -s user\|project\|local`; `claude mcp add` / `codex mcp add` / `gemini mcp add` |
| **Update** | per-row verb, plus a section-level "Update all" that **lists what will change before it runs** | `npx skills update [name] [-g\|-p]`; `claude plugin update`; `claude plugin marketplace update` |
| **Remove** | confirm-gated per §9.3, naming every agent it disappears from | `npx skills remove --agent '*'`; `claude plugin uninstall`; `{claude,codex,gemini,amp} mcp remove` |

Two rules bind all five:

- **Every verb runs a child process whose full command line is shown in the
  confirm and is copyable from it.** The user can always see, and reproduce in a
  terminal, exactly what Tortie ran. This is the same instinct as §9.4's
  "open the file" boundary: when Tortie is a front-end for someone else's tool,
  it says so and shows the call.
- **Nothing installs without an explicit click.** No auto-update, no
  "recommended for this repo", no install on project open, no background
  refresh.

`claude plugin details` deserves its own line, because it is the best preview
payload in the ecosystem and nothing else exposes it. Measured:

```
vercel 0.45.1
  Skills (30) …  Hooks (2) SessionStart, SessionEnd  MCP servers (1) vercel
  Projected token cost   Always-on: ~2,950 tok  added to every session
  cdn-caching ~60 always-on / ~6.9k on-invoke · ai-gateway ~60 / ~7.8k · …
```

Six plugins are enabled on this machine. **Nothing anywhere shows a user what
their sessions pay before the first prompt.** Put the always-on number in the
preview and in the detail surface; where an agent cannot compute it, show the
honest proxy (description bytes, file count, `scripts/` present) and label it an
estimate rather than inventing a token count.

### 3.7 The trust story — installing is executing

#### Say it plainly, in the product

Installing a skill or an MCP server is **running someone else's instructions
inside your agents, with your credentials, on your machine**. A skill can carry
`scripts/` the agent will execute. An MCP server is a subprocess or a remote
endpoint that receives your tokens and returns text the model treats as
trustworthy. A hook is a shell command that runs on a lifecycle event with no
prompt at all. There is no sandbox between any of it and the user's home
directory.

#### The evidence, current as of 2026-08-12 (read)

- **ClawHavoc** — disclosed by Koi Security 2026-02-01: attackers mass-uploaded
  trojanised skills to OpenClaw's ClawHub, exploiting an upload model that let
  any GitHub account older than a week publish. First malicious skill
  2026-01-27; 341 found initially (~12% of the registry); Antiy ultimately
  catalogued **1,184** malicious skills across 12 accounts, one uploader
  responsible for 677. Payloads included Atomic macOS Stealer, harvesting LLM
  API keys, SSH keys, browser vaults and 60+ cryptocurrency wallet types.
- **Snyk "ToxicSkills"**, 2026-02-05: 3,984 skills analysed from ClawHub **and
  skills.sh** — 36.82% carried at least one security flaw, 13.4% a critical one,
  **76 confirmed malicious payloads**, 8 still live at publication; 91% of the
  malicious ones combined a conventional payload with prompt injection. *The
  recommended default in §3.5 is inside that corpus. That is exactly why the
  audit row is mandatory rather than decorative.*
- **CSA research note**, 2026-05-06, "SKILL.md and the new AI supply chain
  attack surface", plus arXiv work (PhantomSkill, SkillJect, POISE) showing
  payloads hidden in `scripts/` rather than in `SKILL.md` — **so a human who
  reads the skill body still misses them.** This is the single fact that makes
  "Bundles: scripts/ (4 files)" a first-class line rather than metadata.
- **Claude Code hooks CVEs** — Check Point, disclosed 2025-07 to 2025-10
  (GHSA-ph6w-f82w-28w6, CVE-2025-59536, CVE-2026-21852): hooks in a repo's
  `.claude/settings.json` ran automatically with no approval, so anyone with
  commit access could execute code on every collaborator's machine. The fix was
  a wording change in the trust dialog.
- **MCP-specific**: tool poisoning (instructions hidden in tool *descriptions*,
  which the model reads as trusted context) and rug pulls (a server mutating its
  tool list after approval). The consensus defence is **hash-pin at first
  approval and re-prompt on change** — scanning alone cannot catch a rug pull.
  Codex already does exactly this for hooks (`trusted_hash = "sha256:…"`,
  measured here, two entries, one enabled).


#### The finding that makes "installing is executing" literal, not rhetorical

Added in synthesis, VERIFIED against `code.claude.com/docs/en/skills` on
2026-08-12. A `SKILL.md` **body** can execute shell commands, and it does so
*before the model is involved at all*:

> "When this skill runs: 1. Each `` !`<command>` `` executes immediately (before
> Claude sees anything). 2. The output replaces the placeholder in the skill
> content. 3. Claude receives the fully-rendered prompt with actual PR data.
> **This is preprocessing, not something Claude executes.**"

The inline form is recognised wherever `` !` `` starts a line or follows
whitespace; a fenced ` ```! ` block does the same for multi-line commands. The
commands run through the Bash tool (or PowerShell) "the same way it runs
Claude's own shell commands" — session cwd, 2-minute timeout, full user
permissions. Claude Code ships a kill switch,
`"disableSkillShellExecution": true`, described as "most useful in managed
settings, where users cannot override it" — which is a vendor telling you this
is a supply-chain surface.

Three consequences for this design, and they upgrade §3.7's rule 3 rather than
restating it:

1. **The dangerous part of a skill can be the markdown itself.** The prior
   research — and every "read the SKILL.md before you install it" recommendation
   in the ecosystem — assumed executable content lives in `scripts/`. A reviewer
   skimming prose for intent will read straight past `` !`curl … | sh` ``.
2. **It is statically detectable, cheaply.** A regex over the body finds every
   injected command with no execution and no network. So the preview can print
   *what will run* rather than *whether something might*: **"Runs 2 shell
   commands when invoked"**, each command shown verbatim, mono, before the
   install button.
3. **It applies to skills Tortie already lists**, not only to ones it might
   install later. The scan is part of v1's detail surface (§7.2), which is how
   v1 carries a trust primitive it does not yet need.


#### Rules Tortie must follow

1. **Never install without an explicit, per-item click.** No bulk install, no
   restore-on-open, no auto-update, ever.
2. **Show the audit before the button.** The four-scanner row goes in the
   preview *with its scan date* — a stale clean scan is a different claim from a
   fresh one. Unscanned says "not scanned", never nothing.
3. **Make executable content loud.** "Ships 3 scripts" renders in `--warning` in
   the preview and again in the confirm. Prose-versus-code is the most
   decision-relevant fact about a skill and it is currently invisible everywhere.
4. **Pin, then watch the pin.** Record the resolved hash at install —
   `skillFolderHash` (skills.sh), `sha`/`sha256` (Claude marketplaces),
   `gitCommitSha` (`installed_plugins.json`) — re-hash on refresh, and **a
   changed hash disables the item and asks again**. This is the one control that
   stops rug pulls and it costs a stored string. It does **not** violate §9.1's
   "Tortie never keeps its own trust store": that rule forbids a second copy of
   an *approval decision* the agent already owns; this records what we
   downloaded, which no agent records for us.
5. **Never render remote text as trusted.** Registry descriptions are
   attacker-controlled strings — plain text only, no markdown, no links, no
   HTML, in the same spirit as S5B blocking remote images in markdown preview.
6. **Never store or display a secret.** MCP `env` values are redacted
   everywhere; the detail surface lists variable *names* only. Measured here:
   `~/.cursor/mcp.json` carries a plaintext API key. That is the norm, not an
   outlier.
7. **Defer to each agent's own approval mechanism.** Tortie surfaces "pending
   approval" (`claude mcp get` marks unapproved `.mcp.json` servers "⏸ Pending
   approval") and runs the agent's enable command. It never writes an approval
   into an agent's config to skip a prompt.
8. **Project scope is the dangerous scope.** Anything arriving from the
   repository — `.mcp.json`, `.claude/settings.json` hooks, `.agents/skills/` —
   is code the repo's authors chose for you. Group it first, mark it, never
   enable it silently on project open.

#### The warnings, as final copy (sentence case, no exclamation marks)

- **Install, code-carrying skill.** *"Install govuk-style from
  github.com/alphagov/…?"* / *"Skills run inside your agents. This one ships 3
  scripts that can run with your permissions."* / *"Scanned 16 April: Socket 0
  alerts, Snyk low."* / [Cancel] [Install]
- **Install, MCP server.** *"Add the supabase server?"* / *"An MCP server runs
  on your machine and can see whatever you give it access to. It needs
  SUPABASE_ACCESS_TOKEN."* / [Cancel] [Add server]
- **Changed after approval.** *"claude-tools changed since you approved it."* /
  *"Its contents no longer match what you installed. It is disabled until you
  review it."* / [Show what changed] [Re-enable]
- **Unpinned MCP command.** *"This server downloads a new version every time it
  starts."* / *"`npx -y @playwright/mcp@latest` resolves fresh code from npm at
  each session launch."* / [Pin the current version] [Leave it]
- **Project-scoped arrival.** *"This project adds 2 MCP servers and 1 hook."* /
  *"They come from the repository, not from you. Review them before enabling."*
  — a quiet section banner in the view, and **never a modal on project open**: a
  modal on open trains people to dismiss it.

### 3.8 Offline and air-gapped

- **Everything installed keeps working with no network.** The view reads
  directories, manifests and each agent's CLI. That is the default state and it
  must never render as an error.
- **Network happens only on**: search, preview-of-not-installed, install,
  update, and refresh-a-source. Each is a user action; each fails to a toast,
  never to a blocked view.
- **Air-gapped installs work through the source model, not a special mode**: a
  local directory source, a `local` Claude/Codex marketplace (three exist here
  already), or a skills repo cloned once. Use `--copy` instead of symlinks where
  a network home directory makes links unreliable.
- **One honest warning, and it is not only an air-gap concern.** An MCP server
  launched as `npx -y foo@latest` re-resolves code from the network at *every
  session start*. Measured: **two of this machine's seven Cursor servers do
  exactly that** (`@playwright/mcp@latest`, `@upstash/context7-mcp@latest`), and
  four of seven go through `npx` at all. Flag an unpinned command in the detail
  surface and offer to pin it. Air-gapped users get the same flag for the
  opposite reason: those servers will simply fail to start.

### 3.9 What this part could not answer

1. **The `ath` scanner** in the audit response is unidentified (the CLI renders
   it as "Gen"). Name it correctly in the UI or label the column generically —
   do not guess.
2. **Licensing of installed content.** The `skills` CLI is MIT; the skills are
   whatever their repositories say, and nothing enforces or displays a licence.
   Whether the agentskills.io spec has a licence frontmatter field is
   unverified. If the sheet shows a licence it must come from the repo, and
   "unknown" must be sayable.
3. **Whether an update can be previewed as a diff.** All three mechanisms record
   a commit hash, so "what changed" is computable in principle; whether it is
   cheap was not measured.
4. **muse and deepseek** are absent from skills.sh's 76-agent table. `muse
   skills` has its own `--json` CLI with `user|project|built-in|plugin` scopes,
   so muse is *manageable* but not *installable-into* from the default source.
   Decide whether the install picker hides those agents or shows them disabled
   with the reason.
5. **droid's MCP and hook surfaces** — the CLI is not installed here, so only
   `~/.factory/skills` (3 entries) is measured. Per the Phase 13.5 lesson, run
   `droid --help` before writing its registry row; a mined absence proves
   nothing.
6. **`schemas.agentskills.io` did not resolve** from this machine on 2026-08-12
   while `agentskills.io` did. Re-check before depending on the discovery schema.
7. **The skills.sh headline count** is unverifiable and must not be repeated in
   Tortie's UI.

---

## 4. The object model — one row shape, five payloads

Everything in this view is a **resolved entry**:

```
id          stable, category + name + agent-scope key
category    skill | mcp | hook | plugin | instruction
name        the user's word for it
summary     one line, from the artifact itself (§7.2)
scope       project | project-local | global | plugin | managed
sourcePath  absolute path to the file that defines the winner
agents      the registry agent ids that will load it   ← from §2.2's realpath walk
state       active | disabled | shadowing | shadowed | broken | managed
shadows     the same-named entries this one beats, with their scopes
hash        content hash, for the session snapshot (§8.2) and the install pin (§13.2)
executes    what runs when this loads: injected shell commands in the body,
            plus scripts/ — scanned statically, never run (§3.7)
```

**The list shows the RESOLVED set, never the union.** One row per effective
thing. A losing duplicate is not a row — it is a marker on the winner
(codicon `layers`) and a line in the detail view. The reasoning is the whole
point of the feature: a union list is an inventory of files, a resolved list
answers *what will my agent actually do*. The count in a section header is
therefore the number of things that will happen, not the number of files on
disk. (On this machine that is 33 rows instead of 107 — the resolved list is
also the shorter one.)

---

## 5. Sidebar anatomy

### 5.1 Activity bar item (S3)

Fourth item, after `source-control`, before the spacer. 48×48 hit area,
codicon **`layers`** at 24px, same states as every other rail item.

- **Why `layers`.** The subject of this view *is* stacked scopes resolving to
  one winner, and the icon says so. The runner-up was `plug`, rejected because
  it names one of the five categories; `extensions` was rejected outright
  because "extensions" is on the guardrail's refused list and the icon would
  promise a marketplace.
- **Shortcut `⌃⇧C`** — a new `view.context` row in `src/shared/keymap.ts`, and
  nothing else changes (DESIGN.md §11.4: adding a shortcut is a one-line data
  change; the ⌘/ overlay, Settings → Keyboard, the native View menu and the
  rail tooltip all render from it). `⌃⇧C` sits with `⌃⇧G`, and **`⇧⌘C` is
  deliberately left free** because DESIGN.md §4 uses it as the worked example
  of a user-recorded per-agent hotkey; taking it would make the documented
  example un-recordable.
- **No badge. Ever.** SCM badges a dirty count and Search badges a live match
  count; both are *actionable and transient*. A context count is inventory —
  "43" would sit there forever, which is precisely the Zen's "number that rises
  on its own is noise in a nicer font". The only number that could earn a badge
  is drift (running sessions whose context changed), and even that is refused
  in §8.4.

### 5.2 View header, in the 36px band (S3)

```
CONTEXT          [ all agents ˅ ]              ⟳
```

- `CONTEXT` — 11px/600 uppercase, +0.04em, `--text-muted`, exactly as
  `EXPLORER` (S3B).
- **Agent selector** — a `[h:24]` r-sm pill, hover `--bg-raised`: agent logo 14
  (or codicon `layers` for "all") · label 12px · codicon `chevron-down` 12.
  Click opens a **native** menu: `All agents` · separator · the installed
  registry agents, each with its logo, current one ✓-checked. Choosing an agent
  filters the whole view to what that agent loads. Persisted per project.
  Default is `All agents`, **except** when the view is opened from a session
  (§8.3), where it is that session's agent and the pill says so.
- `refresh` codicon 16 at the right — re-walks the trees. Present because the
  watcher can miss a directory that did not exist at start (a real limit in
  Claude Code's own live-reload, and honesty is cheaper than a lie).
- No `+`/"New skill" button in the band. Creation is a context-menu verb
  (§9.5); the band's actions are reserved for things that act on the whole view.

### 5.3 The filter — always visible, one component

`<FilterField icon="filter" placeholder="Filter context by name" />` from
`src/renderer/controls`, directly under the band, `--space-4` above and
`--space-3` below (the rhythm Phase 14.2 item 2 fixed; the same field, the
same geometry, no second implementation).

- `filter`, not `search`: it narrows a list already on screen. That distinction
  is the reason the component takes an `icon` prop at all.
- It filters **name and summary across every section at once**, which is the
  main value — "where is `jq` configured" spans a hook, an MCP env and a skill's
  `allowed-tools`.
- **While a filter is active, scope groups collapse and every row grows a scope
  chip** (§6.2). Grouping is the resting-state channel; the chip is the
  filtered-state channel. Never both — that is 8px of noise on every row for a
  fact the group header already stated.
- Esc clears the field and stops there (the component's own behaviour).

### 5.4 Sections

Five, all reorderable and collapsible for free — DESIGN-SPEC S3's section-drag
block already applies to "any view with ≥2 sections", and the sticky `[h:24]`
header with `gripper` and the native "Move section up/down" comes with it.

| Section | Default | Count is |
|---|---|---|
| `SKILLS` | expanded | resolved skills |
| `MCP SERVERS` | expanded | resolved servers |
| `HOOKS` | collapsed | handlers that will fire |
| `PLUGINS` | collapsed | enabled plugins |
| `INSTRUCTIONS` | collapsed | files in the loaded chain |

A sixth section, `SOURCES`, arrives with v1.1 and is collapsed by default
(§13.2). Vendor-bundled skills — Cursor's `skills-cursor`, Codex's
`skills/.system` — render as a `Bundled` group inside `SKILLS`, collapsed, and
**never** join the section count (§2.1).

**Space budget**, mirroring S3A: collapsed sections cost their 24px header; the
remaining height splits between expanded sections at equal weight, min 120px
each, each with its own scroll. Collapse state persists per project, order per
view app-wide.

**INSTRUCTIONS earns its place on one specific ground**, not on parity: the
**import chain is invisible**. This repo's agents load `/Users/gdc/CLAUDE.md` →
`@AGENTS.md` → `@.tessl/RULES.md` → plus `gmux/CLAUDE.md` — four files, three
hops, and the Explorer can only ever show you one of them because the other
three are outside the project. Listing the resolved chain in order, with the
hop that pulled each one in, is information no file tree can produce. `TOOLS`
is **not** a v1 section: enumerating tools means starting MCP servers (§7.4).

### 5.5 The row `[h:24]`

```
[icon 16][name 12px][summary 11px --text-muted, flex, ellipsis][marks][state]
```

- **icon** — per category: `lightbulb` (skill), `plug` (MCP), `symbol-event`
  (hook), `package` (plugin), `book` (instruction), all `--text-secondary`.
- **name** — 12px `--text-primary`, truncate end. Mono only where the artifact
  *is* a path or a command (DESIGN.md §1.8: mono is terminal-adjacent truth,
  never a technical costume) — so an MCP server's name is sans, its command is
  mono in the summary slot.
- **summary** — 11px `--text-muted`. Never wraps. Content per category in §7.2.
- **agent marks** — only in `All agents` mode: a `[h:16]` chip on `--bg-raised`,
  11px/600 `--text-secondary` tabular-nums, e.g. `8`, `aria-label` "loaded by 8
  agents", tooltip listing them. Not eight 14px logos: eight logos is 112px of a
  400px pane, and at 220px it is the whole row. The logos live in the hover card
  and the detail view, where there is room to name them.
- **state marks** — right lane, 12px, max two, in this order:

| Mark | Codicon | Colour | Means |
|---|---|---|---|
| shadowing | `layers` | `--text-secondary` | beats a same-named entry elsewhere |
| disabled | `circle-slash` | `--text-muted` | present but switched off |
| managed | `lock` | `--text-muted` | enterprise policy, read-only |
| broken | `error` | `--error` | file missing, parse failure, binary not found |
| changed | `history` | `--text-secondary` | differs from a running session's snapshot — **session mode only** (§8.3) |

**Broken is `--error`, not `--warning`, and that is deliberate.** DESIGN.md
§1.5's `--warning` is the same `#F5B84A` as `--status-attention`. A permanent
amber glyph in the sidebar would compete with the one colour the whole product
reserves for "an agent needs you". A hook whose script is missing is an error,
so it takes the error colour, and the amber budget stays intact.

Row states are the standard table: hover `--bg-raised`; selected `--bg-active`
+ 2px `--accent` left inset; `:focus-visible` `--focus-ring`. Click opens the
detail tab (§7.1). Hover ≥600ms opens the hover card (§7.5).

### 5.6 Scope group rows `[h:24]`

Identical geometry to S3A's Staged/Changes group rows — label 11px/600
`--text-secondary`, count 11px `--text-muted` — so this view inherits a
component instead of describing one.

| Group label | What it is | Committed? |
|---|---|---|
| `This project` | `.claude/skills/`, `.mcp.json`, `.claude/settings.json` | yes — shared with the team |
| `This project, only you` | `.claude/settings.local.json`, MCP *local* scope inside `~/.claude.json` | no |
| `All your projects` | `~/.claude/**`, `~/.agents/**`, `~/.claude.json` top level | n/a |
| `From plugins` | plugin-provided, namespaced | with the plugin |
| `Managed` | enterprise policy — shown when found, never editable | n/a |

**Two project groups, not one, and this is not pedantry.** `claude mcp add`
defaults to *local* scope, which lives in your home directory and is invisible
to everyone else on the team. Folding it into "This project" would tell the
user their server is shared when it is not. That is the exact class of quiet
lie this view exists to end.

### 5.7 Wireframe — wide (sidebar 400px, its max)

Legend: `▤` `lightbulb` · `⚯` `plug` · `⟐` `symbol-event` · `▦` `package` ·
`▭` `book` · `⧉` `layers` · `⊘` `circle-slash` · `🔒` `lock` · `✕` `error`

```
┌────────────────────────────────────────────────────────────────┐
│ CONTEXT            [▤ all agents ˅]                        ⟳   │ band [h:36]
├────────────────────────────────────────────────────────────────┤
│  ⌕ Filter context by name                                      │ FilterField [h:28]
│                                                                │
│ ▾ SKILLS                                                    33 │ section  [h:24]
│    This project (3)                                            │ group    [h:24]
│  ▤ agent-browser        Drive a headless browser to ver…   3   │ row      [h:24]
│  ▤ frontend-design      Use when building or reviewing …   3   │
│  ▤ vercel-react-best…   React best-practices reviewer f…   3   │
│    All your projects (30)                                      │
│  ▤ impeccable           Use when the user wants to desi…   8 ⧉ │
│  ▤ govuk-style          Write and edit in GOV.UK / GDS …   8   │
│  ▤ comprehensive-com…   Use when the user says "let's w…   6   │
│  ▤ diagnose-before-e…   Use when behavior is surprising…   4   │
│  ▤ specstory-guard      Install a pre-commit hook that …   6   │
│    Show 25 more                                                │
│                                                                │
│ ▾ MCP SERVERS                                                5 │
│    This project (1)                                            │
│  ⚯ everything           npx @modelcontextprotocol/serv…    1   │
│    This project, only you (1)                                  │
│  ⚯ playwright           npx @playwright/mcp                1   │
│    All your projects (2)                                       │
│  ⚯ Gmail                https://gmailmcp.googleapis.co…    1   │
│  ⚯ Google Drive         https://drivemcp.googleapis.co…    1   │
│    From plugins (1)                                            │
│  ⚯ vercel:vercel        https://mcp.vercel.com             1 ⊘ │
│                                                                │
│ ▾ HOOKS                                                      4 │
│    PostToolUse (2)                                             │ group = EVENT
│  ⟐ impeccable           node …/impeccable/scripts/hoo…     1   │
│  ⟐ security-guidance    sg-python.sh security_reminde…     1   │
│    Stop (1)                                                    │
│  ⟐ impeccable           node …/impeccable/scripts/hoo…     1   │
│    SessionStart (1)                                            │
│  ⟐ security-guidance    sg-python.sh ensure_agent_sdk…     1 ✕ │
│                                                                │
│ ▸ PLUGINS                                                    6 │
│ ▸ INSTRUCTIONS                                               4 │
└────────────────────────────────────────────────────────────────┘
```

### 5.8 Wireframe — ~300px (the tier the mission asks about)

Summaries survive but truncate hard; the agent chip loses its lane to the state
marks; group labels drop their parenthetical counts to the right edge.

```
┌────────────────────────────────────────────┐
│ CONTEXT      [▤ all ˅]                 ⟳   │
├────────────────────────────────────────────┤
│  ⌕ Filter context by name                  │
│                                            │
│ ▾ SKILLS                                33 │
│    This project                          3 │
│  ▤ agent-browser      Drive a headl…   3   │
│  ▤ frontend-design    Use when buil…   3   │
│  ▤ vercel-react-b…    React best-pr…   3   │
│    All your projects                    30 │
│  ▤ impeccable         Use when the …   8 ⧉ │
│  ▤ govuk-style        Write and edi…   8   │
│  ▤ comprehensive-…    Use when the …   6   │
│    Show 27 more                            │
│                                            │
│ ▾ MCP SERVERS                            5 │
│    This project                          1 │
│  ⚯ everything         npx @modelcon…   1   │
│    This project, only you                1 │
│  ⚯ playwright         npx @playwrig…   1   │
│    All your projects                     2 │
│  ⚯ Gmail              https://gmail…   1   │
│  ⚯ Google Drive       https://drive…   1   │
│    From plugins                          1 │
│  ⚯ vercel:vercel      https://mcp.v…   1 ⊘ │
│                                            │
│ ▸ HOOKS                                  4 │
│ ▸ PLUGINS                                6 │
│ ▸ INSTRUCTIONS                           4 │
└────────────────────────────────────────────┘
```

### 5.9 Wireframe — 220px (the sidebar minimum, DESIGN.md §2.2)

Summary drops entirely to the hover card and detail tab. The agent chip drops.
Name and state are all that survive, and that is the correct survival order:
*what is it* and *is something wrong with it*.

```
┌──────────────────────────────┐
│ CONTEXT   [▤ all ˅]      ⟳   │
├──────────────────────────────┤
│  ⌕ Filter context by name    │
│ ▾ SKILLS                  33 │
│    This project            3 │
│  ▤ agent-browser             │
│  ▤ frontend-design           │
│  ▤ vercel-react-best-pra…    │
│    All your projects      30 │
│  ▤ impeccable             ⧉  │
│  ▤ govuk-style               │
│    Show 27 more              │
│ ▾ MCP SERVERS              5 │
│    This project            1 │
│  ⚯ everything                │
│    This project, only you  1 │
│  ⚯ playwright                │
│    All your projects       2 │
│  ⚯ Gmail                     │
│  ⚯ Google Drive              │
│    From plugins            1 │
│  ⚯ vercel:vercel          ⊘  │
│ ▸ HOOKS                    4 │
└──────────────────────────────┘
```

**Responsive tiers, stated as rules rather than drawn:**

| Tier | Pane width | Row carries |
|---|---|---|
| T1 | ≥ 340px | icon · name · summary (flex, ≥140px) · agent chip · state |
| T2 | 260–339px | icon · name · summary (flex, ≥80px) · agent chip · state |
| T3 | 220–259px | icon · name · state — summary and chip move to hover card |

The summary is dropped, never wrapped: rows are 24px everywhere else in this
app and a two-line context row would break the one rhythm the sidebar has.
Group counts move from `(n)` inline to a right-aligned column below T1 so the
label never truncates — a truncated `This project, only y…` is worse than no
count.

### 5.10 Native context menus (DESIGN.md §3 — never DOM-drawn)

Every row, group header and section header carries one, via `ui:popupMenu`.

**Skill row.** Open · Reveal in Finder — Enable for… ▸ *(submenu: every
installed agent, ✓ where present)* · Disable for… ▸ — Copy name · Copy path —
Move to Trash.
**MCP row.** Open the file it is defined in · Check connection… (§7.4) —
Enable / Disable — Copy command — Remove….
**Hook row.** Open the script · Open the file it is defined in — Disable —
Copy command.
**Plugin row.** Open the plugin folder · Open its marketplace entry — Disable —
Remove….
**Shadowed marker (`⧉`) is also a menu target**: "Show the entry this beats".
**Group header.** Open the file this group comes from · Reveal in Finder.
**Section header.** Move section up / down (from S3) · Collapse all.

---

## 6. Scope, made unmistakable

### 6.1 The three questions every row must answer

1. *Where does it come from?* → the group it sits in (resting), or its chip
   (filtered).
2. *Does it win?* → it is in the list at all; if it beats something, `⧉`.
3. *Who loads it?* → the agent chip, or the whole view when an agent is picked.

### 6.2 The scope chip (filtered state only)

`[h:16]` r-sm on `--bg-raised`, 11px/600 `--text-secondary`, before the name:

| Chip | T1/T2 | T3 (220px) |
|---|---|---|
| project | `project` | codicon `root-folder` 12 |
| project, only you | `yours` | codicon `account` 12 |
| all your projects | `global` | codicon `globe` 12 |
| plugin | `plugin` | codicon `package` 12 |
| managed | `managed` | codicon `lock` 12 |

**Scope is never a colour.** DESIGN.md spends its entire colour budget on
state: accent = selection/focus, amber = attention, the git ramp = git. A fifth
chromatic vocabulary for scope would be the first decoration in the product.
Scope is carried by **position** (grouping), then **words**, then **shape**
(codicons) — three non-chromatic channels, in that order of preference, which
is also the order in which they survive narrowing.

### 6.3 Inherited vs overridden

The winner is the row. The loser is a mark plus a line in the detail view:

- Row gains `⧉` `layers` 12 `--text-secondary` in the state lane.
- Tooltip: **"Also defined in this project. The global one wins."** — the
  sentence names both ends and the direction, because with skills the direction
  is the surprising half (§2.3).
- Detail view (§7.2) prints the full stack, winner first, losers at
  `--text-muted` with the word **not used**, each an "Open" target.
- No strikethrough on losers: strikethrough already means *deleted on disk* in
  the tree and the SCM list (S3B), and reusing it here would say the file is
  gone when it is merely outranked.

### 6.4 Merged vs replaced — different words, different grouping

| Category | Grouped by | Because |
|---|---|---|
| Skills, MCP servers, plugins | **scope, printed in precedence order for that category** | one wins; the reading order *is* the resolution order |
| Hooks | **event** (`PostToolUse`, `Stop`, …), scope as a per-row chip | they all run; a precedence order would imply a resolution that does not happen |
| Instructions | **load order of the chain**, with the hop that pulled each file in | they all load, concatenated; order is the only fact that matters |

Two words, used consistently and never interchangeably: **wins** (whole-entry
replacement) and **also runs** (merge). The section header for hooks says
`4 will run`, not `4 configured` — a merged count is a promise about behaviour.

### 6.5 Which agents

- `All agents` mode: the numeric chip; tooltip names them; the detail view
  shows the logos with per-agent ✓/✗ and makes each a toggle (§9.2).
- Specific-agent mode: the chip disappears, because it would say the same
  number on every row. Redundancy at 24px is not reassurance, it is clutter.
- The chip counts **registry agents only**. `amp` and `opencode` hold symlinks
  to the same inode here but Tortie cannot launch them, so counting them would
  overstate what Tortie knows.

### 6.6 Degradation summary

Dropped in this order as the pane narrows: agent chip tooltip detail → summary
text → agent chip → group counts inline → scope chip words become glyphs.
**Never dropped at any width:** the row's name, its group membership, and its
state marks. Those three are the feature.

---

## 7. Understanding, not listing

### 7.1 Two surfaces, and why not three

- **Hover card** (600ms, the commit-hover-card component from DESIGN.md §3,
  narrowed to 420px): the glance. Name · full description (wrapped, up to 4
  lines) · scope sentence · the agent logos · absolute path in mono 11 with a
  copy affordance. Dismiss on Esc or pointer-out. This alone answers "what is
  `impeccable`" without a click, at any pane width, including 220px where the
  summary is not in the row at all.
- **Detail tab in the editor panel** (S5): the read. Clicking a row opens a
  `context:<id>` tab — a third tab kind alongside the two diff kinds S5C
  already defines, so the tab model is not being extended, only populated.

Rejected: inline row expansion (the HISTORY pattern). A skill's description is
routinely 800+ characters — `impeccable`'s is 1,000 — and expanding that inside
a 300px sidebar would push every other row off screen to read one.

The detail tab is **a rendered header card over the artifact's own content**,
so the second half is always the truth on disk:

```
┌ impeccable                                    [Open SKILL.md] ┐
│ Skill · all your projects · ~/.agents/skills/impeccable       │
│ Loaded by  ◆claude ◆codex ◆gemini ◆cursor ◆qwen ◆droid        │
│ ⧉ Also at ~/.gemini/skills/impeccable — not used   [Open]     │
│ Trigger    automatic, when the description matches            │
│ Bundles    scripts/ (4 files) · reference/ (11 files)         │
│ Pre-approved tools   Bash(npx impeccable *) · Bash(node …)    │
├───────────────────────────────────────────────────────────────┤
│ (the rendered SKILL.md body — the S5B markdown preview)       │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 What "the artifact itself" yields, per category

Every field below was read out of a real file on this machine today.

| Category | Row summary | Detail header adds |
|---|---|---|
| **Skill** | `description`, first clause | full description · `license` · `compatibility` · `allowed-tools` · `user-invocable` / `disable-model-invocation` rendered as **"you invoke it with `/name`"** vs **"the agent loads it when relevant"** · `argument-hint` · bundled `scripts/`, `references/`, `assets/` counts · body via markdown preview |
| **MCP server** | `command` + first arg, or the URL — mono | transport · full argv (mono, wrapped) · `cwd` · env **keys only, values `••••`** · enablement state · `[Check connection]` (§7.4) · which file defines it |
| **Hook** | the command's leaf, mono | event · `matcher` · `if` condition · `timeout` · `statusMessage` · `async` · handler type (`command`/`http`/`mcp_tool`/`prompt`/`agent`) · **the script's own source**, opened read-only in the tab below the card |
| **Plugin** | `description` from `.claude-plugin/plugin.json` | version · author · homepage · marketplace + commit SHA (all four are in `installed_plugins.json`) · **what it contributes**: n skills, n hooks, n MCP servers, n subagents, each a link into its own row |
| **Instruction** | first non-heading line | the load chain, in order, with the `@import` that pulled each file in · byte size per file and a chain total (the honest cost of the always-loaded context) |

The trigger line for skills is the highest-value single field in the view and
it is not in the standard: it is *derived*. `user-invocable: true` +
`disable-model-invocation: unset` → "the agent loads it when relevant, or you
type `/impeccable`". `disable-model-invocation: true` → "only when you type
`/name`". A `paths` glob → "only when working on files matching `src/**/*.tsx`".
That sentence is the answer to "what actually makes this fire", which is what a
user opening this panel is nearly always asking.

### 7.3 The secrets rule, restated where a builder will hit it

Values under `env`, and any key matching `/(_?(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)S?)$/i`
anywhere in a rendered config fragment, render as `••••`. Not truncated, not
hover-to-reveal, not copyable. The header card says
**"3 environment values are hidden. Open the file to see them."** with the
`[Open]` target — the editor is the surface that already owns showing file
contents, and it makes the decision to expose a key an explicit act.

### 7.4 Listing an MCP server's tools means starting it

There is no offline manifest of an MCP server's tools; `tools/list` requires an
initialized session, which for a stdio server means **spawning someone else's
process** and for an HTTP server means a network call with credentials. This is
the same class of act as §9.1's install confirmation, so it gets the same
treatment: it is a **verb, never a refresh**.

`[Check connection]` in the detail card, and "Check connection…" in the row's
native menu. It runs one connect, lists tool names + one-line descriptions,
caches the result against the server's config hash, and stamps the card
**"Checked 3 minutes ago"** — never "Connected", which would imply a live state
Tortie is not maintaining. Nothing polls. Nothing checks on view open. Nothing
checks on refresh. A stale cache is shown with its age, because an honest stale
answer beats a network call the user did not ask for.

### 7.5 Keyboard

`↑↓` moves, `→`/`←` expand/collapse groups and sections, `↩` opens the detail
tab, `Space` opens the hover card without leaving the list (the only way to
reach it without a pointer), `⌫` is Move to Trash on a skill row with the same
confirm as S3E, `⇧F10` / menu key opens the native menu — all inherited from
the list conventions the Explorer and SCM lists already implement.

### 7.6 Understand before install — the same surface, in a not-installed mode

The detail surface is where §3's source layer lands when it lands (§13 puts it
in v1.1). It is **the same component in a third mode**, not a new screen:
`browse` and `session` already exist (§8.3); `preview` adds a header card for
something that is not on disk yet, over the artifact's own fetched content.

What the card must carry, in this order — the order is the argument:

| Line | Content | Source |
|---|---|---|
| **What runs** | *"Runs 2 shell commands when invoked"*, each command verbatim in mono · *"Ships 3 scripts"* with the file list · *"No executable content"* when the scan is clean | Static scan of the fetched `SKILL.md` body for `` !`…` `` and ` ```! ` blocks (§3.7), plus a `scripts/` listing. **No execution, no network beyond the fetch.** |
| **Where it comes from** | `owner/repo`, the resolved commit, the licence, or **"licence unknown"** when the repo does not say | Registry record + git |
| **What it has been scanned by** | the four-scanner row **with its scan date** — *"Scanned 16 April: Socket 0 alerts, Snyk low, ZeroLeaks 93"* — or **"Not scanned"**, never blank | `GET add-skill.vercel.sh/audit` |
| **What it will cost** | always-on token estimate where the agent computes one (`claude plugin details` prints *"~2,950 tok added to every session"*), otherwise the honest proxy — description bytes, file count — **labelled an estimate** | agent CLI, or measured from the file |
| **Who gets it** | the agent picker, defaulting to the detected fleet, with agents the source cannot target shown disabled **with the reason** (muse and deepseek are absent from skills.sh's 76-agent table) | registry ∩ source capability |
| **The command** | the exact child-process command line, copyable | §3.6's rule |

Three rules that make this "understanding" rather than a product page:

- **It opens from a query, never from a browse surface.** Pressing ↩ in the
  filter with no local match offers exactly one row — *"Search skills.sh for
  'postgres'"* — and that row is the entire storefront (§3.6).
- **Remote text is never trusted text.** Registry descriptions are
  attacker-controlled strings: plain text only, no markdown, no links, no
  images, the same rule S5B already applies to remote images in preview.
- **The primary button names the consequence, not the verb.** Where executable
  content was found, the confirm repeats it — *"This one ships 3 scripts and
  runs 2 shell commands with your permissions"* — because §3.7's incident data
  says the body is where the payload hides.


---

## 8. The session connection, done quietly

### 8.1 What Tortie can honestly know

I checked. A Claude Code transcript **does not record what context it loaded** —
443 `system` records across a 12 MB session on this repo, and not one carries a
skills or MCP manifest. So "read the session's context out of the session" is
not available, for any agent.

But Tortie **owns the launch**. It writes the manifest row with argv and
resume_argv; it is the process that decided this agent starts in this cwd at
this moment. It is therefore the only thing on the machine that can know what
the config looked like *then*.

### 8.2 The context snapshot

At launch, alongside the manifest row Tortie already writes, record the
resolved set for `(agent, cwd)` — id, category, name, scope, sourcePath,
content hash. Measured cost: **~15 ms** (§2.5), against a session launch that
already spawns a tmux pane and a CLI.

Four rules, and they are what keep this from touching durability:

1. **Advisory, never durability-critical.** A failed or missing snapshot must
   never fail a launch, block a restore, or change a resume argv. It is a
   nullable blob keyed by session id.
2. **Written once, at launch.** Never updated for a live session — the point is
   that it is a record of *then*.
3. **Restore re-snapshots**, because a restored session genuinely re-reads
   config, and carrying the old snapshot forward would be a lie with a
   timestamp on it.
4. **Deleting it is always safe.** Old rows are pruned with their sessions.

### 8.3 The readout: a mode of the same view, on demand

Session context menu (S4B) and the identity strip's `⋯` gain one item:
**"Context for this session…"**. It opens the Context view with the agent
selector pinned to that session:

```
┌────────────────────────────────────────────────────────────────┐
│ CONTEXT       [◆ claude-3 ˅]                               ⟳   │
├────────────────────────────────────────────────────────────────┤
│ Started 3h ago. 2 things have changed since.        [Show all] │  ← only when >0
│  ⌕ Filter context by name                                      │
│ ▾ SKILLS                                                    26 │
│  ▤ impeccable         Use when the user wants to des…      ⟳   │  changed
│  ▤ govuk-style        Write and edit in GOV.UK / GDS …         │
│ ▾ MCP SERVERS                                                4 │
│  ⚯ everything         npx @modelcontextprotocol/serv…      ＋  │  added since
│  ⚯ playwright         npx @playwright/mcp                      │
└────────────────────────────────────────────────────────────────┘
```

This is **one component in two modes**, which is DESIGN.md §11.1's rule applied
before the drift rather than after it: `AgentGrid` became one component only
after the ⌘T copy had already rotted. The Context view and the session readout
render the same store with `mode: 'browse' | 'session'`; session mode adds the
diff marks and the header line, and changes nothing else.

Copy is precise about the mechanism, because the mechanism is the whole point:
- changed → **"Changed since this session started. It is still running the old
  version."**
- added → **"Added since this session started. This session has not loaded it."**
- removed → **"Removed since this session started. This session is still
  running it."** *(the one nobody expects, and the one that bites)*

### 8.4 Arguing it against "not a dashboard"

The Zen's refusals are specific: no counters, no activity feeds, no progress
theatre, and never asking the human to watch an agent work. Three tests:

**Is it a counter that rises on its own?** No — nothing in this view changes
except when a human or an agent edits a config file, and the snapshot itself is
frozen at launch. There is no clock behind any number here.

**Does it demand vigilance?** No, and this is where the design spends its
discipline: **there is no ambient signal at all.** No rail badge, no toast when
a watched file changes, no dot on the session tab, no banner over the terminal.
A user who edits `.mcp.json` while three sessions run sees *nothing*, because
they already know what they did — telling them would be the product performing
attentiveness at them. The drift information exists only where it is asked for:
in the readout, and on the detail card of the artifact that changed
("2 running sessions started before this change").

**Is it a supervisor's console?** No. It answers a question the human asks
after something surprising happens — "why did that agent not use the skill I
just wrote" — and the honest answer ("it started before you wrote it") takes
one keystroke instead of twenty minutes. That is compressing a field of
activity into one meaningful signal, delivered on request. It is the same shape
as the restore machinery: the state is tracked continuously and *announced*
only at the moment a human can act on it.

The one line that would break all three tests, and is therefore refused: a live
count of drifting sessions on the activity-bar rail.

### 8.5 What it must never grow into

No per-session tool-call log. No token accounting. No "context health" score.
No timeline. Each of those is a dashboard wearing this feature's clothes.

---

## 9. Install, remove, enable — and the confirmation

### 9.1 "This executes someone else's code"

Enabling an MCP server, a hook, or a plugin arms a program to run on the user's
machine, unattended, on the next launch. It gets a modal confirm — not a toast,
not an inline switch — and the modal is built out of **facts, not warnings**.

```
┌───────────────────────────────────────────────────────────┐
│  Enable "security-guidance" for Claude Code               │  20/600
│                                                           │
│  This plugin runs its own programs while agents work.     │  13 --text-secondary
│                                                           │
│  On session start      hooks/ensure_agent_sdk.py          │  11 mono
│  After every edit      hooks/security_reminder_hook.py    │
│  When a turn ends      hooks/security_reminder_hook.py    │
│                                                           │
│  From  claude-plugins-official · v2.0.6                   │  11 --text-muted
│        github.com/anthropics/claude-plugins-official      │
│        commit 27d2b86                                     │
│                                                           │
│  Sessions running now are not affected.                   │  13 --text-secondary
│                                                           │
│                        [ Cancel ]  [ Enable ]             │
└───────────────────────────────────────────────────────────┘
```

Five rules behind that layout:

1. **Name what runs and when, in the user's words.** "On session start", "After
   every edit" — not `SessionStart` and `PostToolUse`. The event names are in
   the detail view for people who want them.
2. **Name where it came from, down to the commit.** The marketplace, version and
   `gitCommitSha` are already in `installed_plugins.json`; showing them costs
   nothing and is the only provenance the user will ever get.
3. **Not destructive-styled.** DESIGN.md reserves `--error` fills for confirms
   that destroy something. This creates capability. The primary button is a
   normal `--accent` primary and it names the verb.
4. **No "don't ask again", no checkbox.** A confirmation that can be switched
   off is decoration.
5. **State the blast radius honestly**, which for every agent measured here is
   "next launch, not now" (§10).

**Tortie never keeps its own trust store.** Codex already persists
`trusted_hash` per hook in `config.toml`, and Claude Code has its own workspace
trust dialog. A Tortie-side "approved" record would be a second source of truth
for a decision the agent re-makes anyway, and the growth guardrails forbid
exactly that. Tortie's modal gates *the config edit*; the agent's own gate still
runs afterward, and the modal says so when Tortie knows one exists:
**"Codex will also ask you to trust this hook the first time it runs."**

### 9.2 Install for other agents — the symlink, exposed

The highest-value install verb needs no installer. Skill row → "Enable for…" →
a submenu of installed registry agents with ✓ where present. Checking one
creates `~/.<agent>/skills/<name>` → the canonical target; unchecking removes
the link and only the link.

- The canonical target is `~/.agents/skills/<name>` when it exists, otherwise
  the realpath of whichever copy the user clicked.
- If the target is a **real directory** inside one agent's tree, Tortie offers
  to move it to `~/.agents/skills/` first and link back — one sentence, one
  button, and the user can decline and get a link into the agent tree instead.
- No confirmation modal: a skill is markdown that an agent reads. The
  code-execution gate belongs on `scripts/`, and the honest place to say so is
  the detail card's "Bundles: scripts/ (4 files)" line, which is a link.
- Toast: **"`govuk-style` is now available to Codex."** Not "installed" —
  nothing was downloaded.

### 9.3 Remove

- **Skills** (a directory Tortie can own): `shell.trashItem`, the only deletion
  in the app (S3E), with S3E's exact confirm shape — *Delete "govuk-style"?* /
  *It moves to the Trash, so you can put it back from Finder.* / **[Move to
  Trash]** destructive. If the entry is a symlink, the confirm changes to
  *Remove the link to "govuk-style"?* / *The skill itself stays in
  `~/.agents/skills`.* — because trashing a symlink and trashing a skill are
  different acts and must never share a sentence.
- **Config entries** (a server or a hook inside someone's JSON): removal is a
  text edit, which raises the write question in §9.4.
- **Plugins**: Tortie flips `enabledPlugins` and offers *Remove* only as
  "Open the plugin folder" — the cache is the plugin manager's, not Tortie's.

### 9.4 What Tortie is allowed to write

**JSON, surgically, with `jsonc-parser`** — the same library VS Code itself
uses to edit `settings.json` without reformatting the user's file. Its
`modify()`/`applyEdits()` produce a minimal text edit that preserves key order,
indentation and comments. That covers `.mcp.json`, `.claude/settings.json`,
`.claude/settings.local.json` and `~/.claude.json` — every write v1 needs. This
is the "assemble, never reimplement" rule: no hand-rolled JSON writer touches a
1.17 MB file that 2,036 projects depend on.

It is a **new dependency** — checked 2026-08-12: `jsonc-parser@3.3.1`, MIT,
**zero transitive dependencies**, not currently in the tree and not reachable
through Monaco. A ~30 KB dep-free MIT package to avoid hand-rolling a
format-preserving JSON writer is the trade the guardrail asks for; note it in
`THIRD-PARTY-NOTICES.md` with the codicons entry.

**TOML and JSONC-with-schema are read-only in v1.** Codex's `config.toml` is
9,700 lines here, carrying hook trust hashes and env policy; no round-trip TOML
writer preserves that faithfully. For those, every write verb is replaced by
**"Open the file"**, which jumps the editor to the exact line — cheap, because
Tortie already has Monaco and an open-file bus. An honest capability boundary
beats a lossy writer, and the boundary is visible: the row's menu simply has no
Disable item, and the detail card says **"Codex keeps this in `config.toml`.
Tortie can show it, not change it."**

**Before any write: back up.** Copy the target to
`<userData>/gmux/context-backups/<timestamp>-<name>` first. It costs a
millisecond and it is the difference between a bug and a lost afternoon.

### 9.5 Creating

One verb, in the SKILLS section header's context menu and the empty state:
**"New skill…"**. It follows S3E's create gesture exactly — no modal: the row
appears in the list, born in rename mode, seeded `untitled-skill`, uniquified.
On commit Tortie writes the two-field minimum the spec requires
(`name`, `description`) and **opens SKILL.md in the editor**, because a create
that leaves you looking at a list is half a gesture (S3E's own words). Esc or
an empty name and the disk was never touched.

Nothing else is created here. No hook builder, no MCP wizard — those are forms
over file formats that change quarterly, and the file is one click away.

---

## 10. What happens to a running session when its context changes

The honest answer, per category, measured or documented today:

| Change | Effect on a session already running |
|---|---|
| Edit a **SKILL.md** body | **Picked up live** by Claude Code (it watches skill directories). A directory that did not exist at launch is not watched — that needs a restart |
| Add/remove a **skill directory** | Live for existing roots; a brand-new top-level skills root needs a restart |
| **MCP server** added, removed or edited | **Not picked up. Restart required.** Loaded at session startup only, in every agent measured |
| **Hook** added, removed or edited in settings | **Picked up live** by Claude Code today — *this row was "restart required" when the design pass ran, and changed under us. See the correction below* |
| **Plugin** enabled/disabled/updated | Not picked up; `/reload-plugins` reloads plugins, skills, agents, hooks *and* plugin MCP servers in place |
| **Instructions** (`CLAUDE.md`, `AGENTS.md`) | Loaded at startup; a mid-session edit does not retroactively change the context already sent |

So: **much of it needs a new session, and starting one is the one thing Tortie
must never do to a running session.** Ending a session to pick up a config change
would throw away exactly the thing the product exists to protect.

**Correction, made in synthesis on 2026-08-12, and the reason this table cannot
be hard-coded.** The hooks row above said *"Not picked up. Restart required."*
That was true of the behaviour the ecosystem documented for most of 2025 and it
is **no longer what Claude Code's documentation says today**:

> "Direct edits to hooks in settings files are normally picked up automatically
> by the file watcher." — code.claude.com/docs/en/hooks

Live-reload for skills, then live-reload for hooks: the agents are moving in one
direction, quickly, and any sentence Tortie prints about "you will need a new
session" is a claim with a short shelf life. Three design consequences:

1. **This table is registry data, not prose in a component.** Each
   (agent, category) pair carries one of three values — `live`,
   `next-session`, `unknown` — in `src/main/agents/registry.ts`, next to the
   paths (§2.4).
2. **`unknown` is a first-class value with its own sentence.** *"Tortie does not
   know whether Codex picks this up while it is running."* Guessing here is
   worse than admitting it, because the user's next action depends on the
   answer.
3. **It needs a cheap executable check, like resume does.** `CLAUDE.md` already
   makes registry resume claims executable with
   `conformance:resume:capture` (~16 s, no turns, no tokens) after the phase
   where a documented claim silently rotted. The same move applies: a
   `conformance:context` capture that, per installed agent, reads the config
   roots the registry declares, runs the agent's own list verb, and diffs the
   two — turning §2.4 and this table from documentation into a gate. Run it on
   the same trigger as the resume capture: any commit touching
   `agents/registry.ts`, and after any agent-CLI upgrade.


### 10.1 Tortie's answer: the armed reload

Tortie already has an idiom for "the right command, ready, not run": restore
types the resume command into the pane and leaves it for the human
(DESIGN.md §6.8 — *armed, never executed*). Reuse it exactly.

When the readout shows drift and the session's agent has an in-place reload
command, the readout's header line offers it:

> **Started 3h ago. 2 things have changed since.**  [Reload in this session]

`[Reload in this session]` **types** `/reload-plugins` into that session's
prompt and stops. It does not press Enter. The toast says so:
**"`/reload-plugins` is ready in `claude-3` — press Enter to run it."** —
verbatim the shape of the restore toast, because it is verbatim the same
promise.

Where the registry says `next-session` and no reload command exists — MCP
servers everywhere, hooks in every agent that has not followed Claude Code — the
line states the fact and offers nothing:

> **Started 3h ago. 1 MCP server was added since.**
> *`claude` reads MCP servers when a session starts, so this one is not
> available here. Your next session will have it.*

That sentence is the feature. It is the twenty minutes of confusion this whole
view exists to delete, and it costs one line of copy.

### 10.2 Refusals, so a later round does not add them

Tortie must not end and relaunch a session to apply a config change, even
offered behind a confirm. It must not press Enter on a reload. It must not
write config into a running agent's stdin beyond the armed command. And it must
not display a session as "running with N skills" when it can only prove "was
launched with N skills" — the readout's header always names the launch time.

---

## 11. Empty and error states (copy final — sentence case, no exclamation marks)

1. **No context anywhere.** Title: *"No skills, servers or hooks yet"*. Body:
   *"Skills, MCP servers and hooks change how your agents behave. Tortie reads
   them from this project and from your home folder."* Primary: **[New skill…]**.
2. **Project has none, but you do.** No empty state. The project groups are
   simply absent (S3A's Branches precedent — "not an error: the group is hidden").
3. **Filter matches nothing.** One quiet line under the sections: *"Nothing
   matches "jq"."*
4. **A file will not parse.** The section still renders; one row in `--error`
   with codicon `error`: *".mcp.json could not be read — line 12"*, click opens
   the editor at that line. The rest of the view is unaffected — one bad file
   must never blank the panel.
5. **A hook's script is missing.** Row keeps its place with the broken mark.
   Detail card: *"The script this hook runs is not on disk. The agent will log
   an error and keep going."*
6. **Managed by policy.** Group renders with `lock`; menu carries Open and Copy
   only. One line under the group: *"Set by your organisation. Tortie can show
   these, not change them."*
7. **Agent not installed.** In `Enable for…`, the row is disabled with the
   registry's own missing-CLI caption, reusing DESIGN.md §6.5(a) verbatim.
8. **Not a git repo / not a project.** The view works normally — context is not
   a git concept.

---

## 12. Data layer (shape only, so ownership is decided before code)

- `src/shared/context.ts` — the §4 types. Append-only during parallel work.
- `src/main/agents/registry.ts` — gains a `context` block per agent (§2.4). No
  reader has a per-agent branch.
- `src/main/context/**` — one domain, small export surface: `scan(cwd)` walks
  the registry's paths, dedupes by realpath, parses frontmatter heads and JSON,
  and `resolve()` applies the §2.3 precedence table. Pure functions over a
  filesystem port, so the precedence rules are unit-testable without a disk.
- **One IPC registrar**, `context:*`, through the single typed preload bridge.
- **Watching reuses the existing `@parcel/watcher`** already in the tree for
  `git:changed` (S3E). No second watcher, ever. Debounce 200ms, re-resolve only
  the roots that changed — 11 ms for the whole set means incremental work is not
  worth the bug surface.
- `src/renderer/context/**` — view, sections, rows, detail tab, colocated CSS.
  `FilterField`, the section header, the group row, the hover card and the
  native-menu bridge are all imported, not rebuilt.
- The snapshot (§8.2) is a nullable blob on the manifest's session row, written
  by the launch path, read by nothing durability-critical.


---

## 13. v1 versus deferred

The three passes disagreed about one line: the design pass put "marketplace
browsing and one-click install from a registry" in *deferred*, the marketplace
pass argued bring-your-own sources are "first class from day one". **Resolved by
staging, not by compromise.**

### 13.1 v1 — the local view, and it earns its place with these and no more

1. Activity-bar item (`layers`, `⌃⇧C`), one sidebar view, **no rail badge**.
2. Five sections — Skills, MCP servers, Hooks, Plugins, Instructions — with
   resolved counts, S3 drag-reorder, per-project collapse state, and the
   `Bundled` group excluded from counts (§2.1).
3. `FilterField` across all sections; scope chips while filtering.
4. Scope grouping in per-category precedence order; hooks grouped by event; the
   two project groups (§5.6).
5. The resolved-set rule, with `⧉` shadowing marks and the "wins" / "also runs"
   vocabulary.
6. Agent applicability by realpath dedupe; agent selector in the band.
7. Hover card + `context:<id>` detail tab: the derived trigger sentence, masked
   secrets, **and the executable-content scan** (§3.7) — which v1 does not
   strictly need and ships anyway, because it is the primitive v1.1 is built on.
8. `[Check connection]` for MCP, on demand, cached with an age stamp.
9. Enable / disable for JSON-backed config via `jsonc-parser`, with the §9.1
   confirm and a pre-write backup. Read-only + "Open the file" for TOML.
10. "Enable for…" — the cross-agent symlink verb, with the shared-target warning
    (§14, R8).
11. New skill (S3E gesture) and Move to Trash (S3E confirm).
12. Launch-time context snapshot, the session readout, and the armed reload.
13. All three responsive tiers down to 220px.
14. `conformance:context` — the cheap capture gate that keeps §2.4 and §10
    executable rather than documented.

**The object model carries two fields v1 does not use** (§4): `hash`, and the
executable-content result. They cost nothing now and they are the difference
between v1.1 being additive and v1.1 being a redesign.

### 13.2 v1.1 — the source layer, one phase later, gated on its own risk

Deliberately *next*, not *never*, and deliberately not bundled with the view:
this is the only part of the feature that can execute someone else's code, and
it deserves its own spec, its own verifier and its own Tier 3.

1. **SOURCES**, a sixth section, collapsed by default: every configured source
   with its kind and last-refreshed time. `Add source…` accepts a GitHub
   `owner/repo`, a git URL, a **local directory**, a Claude or Codex
   marketplace, or an alternate registry base URL (`SKILLS_API_URL` /
   `SKILLS_DOWNLOAD_URL` are already env-overridable). Air-gapped and
   private-repo teams are configurations, not workarounds.
2. **Search as a filter overflow**: ↩ on a query with no local match offers one
   row per configured source. No landing surface, no trending, no featured.
3. **The preview mode** of the detail surface (§7.6), with the audit row, the
   executable-content scan and the always-on token estimate.
4. **Install / update / remove**, each shelling out to the agent's or the
   source's own CLI, with the full command line visible and copyable in the
   confirm.
5. **Pin and re-check**: record the resolved hash at install, re-hash on
   refresh, and **a changed hash disables the item and asks again**.

### 13.3 Deferred, each with the reason

- **Writing TOML** (codex, deepseek). Needs a round-trip-safe writer that
  preserves 9,700 lines of `config.toml` including hook trust hashes. "Open the
  file" is 95% of the value at 0% of the risk.
- **A `TOOLS` section.** Requires standing connections to every server. The
  per-server on-demand check covers the real question (§7.4).
- **Forms over hooks, MCP servers and plugin config.** Forms over formats that
  change quarterly; the file is one click away.
- **Skill authoring aids** — frontmatter linting, `skills-ref validate`,
  description tuning. Real value, wrong product: `skill-creator` exists in three
  agents already.
- **Subagents / `~/.claude/agents`.** Second-order; nothing is costing the user.
- **Diffing context between two sessions**, and context in the project-switch
  picker. Interesting, unrequested.
- **Cross-machine sync.** Not Tortie's job.
- **Docker MCP catalog integration** (signed images, SBOMs — the only
  cryptographic supply-chain story in the survey). Revisit if Tortie ever wants
  a *hard* trust guarantee; it costs a Docker dependency.

### 13.4 Never

- A rail badge counting context, or any count that changes without a human.
- An ambient notification when a config file changes under a running session.
- Ending or relaunching a session to apply a config change.
- Pressing Enter on a reload command.
- Rendering a secret.
- A Tortie-side trust store duplicating a decision the agent already owns.
- A "featured", "trending" or "recommended for this repo" surface. If a later
  round grows one, this line is what it violated.

---

## 14. Risks

Ordered by consequence, not by likelihood. Each carries the evidence it rests
on, the mitigation already in the design, and what is left over after it.

### R1 — Installing a skill executes someone else's instructions · **highest**

**What goes wrong.** A user clicks Install in Tortie. The skill's `SKILL.md`
body contains `` !`curl … | sh` ``, which Claude Code executes *before the model
sees the file* (VERIFIED, §3.7); or its `scripts/` run when the agent follows
the instructions; or an MCP server's tool *descriptions* carry injected
instructions the model reads as trusted. There is no sandbox between any of it
and the home directory, and Tortie's UI supplied the button.

**Evidence, all read on 2026-08-12.** ClawHavoc: 1,184 malicious skills
catalogued across 12 accounts on one hub, payloads including Atomic macOS
Stealer harvesting LLM API keys, SSH keys, browser vaults and 60+ wallet types.
Snyk ToxicSkills: of 3,984 skills analysed **from ClawHub and skills.sh**,
36.82% carried a security flaw, 13.4% critical, 76 confirmed malicious payloads;
91% of the malicious ones combined a conventional payload with prompt injection.
Research (CSA, PhantomSkill, SkillJect, POISE) finds payloads in `scripts/`
rather than in the visible prose. Claude Code hooks CVEs (CVE-2025-59536,
CVE-2026-21852): hooks committed to a repo's `.claude/settings.json` ran with no
approval, so commit access equalled code execution on every collaborator's
machine. **The recommended default source is inside that corpus.**

**Mitigation.** Install is not in v1 (§13.2). When it lands: audit row with scan
date before the button, executable-content scan printed verbatim, pin-then-watch
the hash with auto-disable on change, per-item explicit click, no auto-update,
project scope grouped first and never enabled silently, remote text never
rendered as markdown, and the agent's own approval prompt left in place rather
than pre-approved.

**Residual.** Scanners are not proof, a clean scan has a date, and a
namespace-verified publisher proves *who*, never *what*. Tortie's honest claim
is "here is what is known about this, including when it was last checked" — not
"this is safe". That sentence has to survive contact with a designer who wants a
green tick.

### R2 — Config changes under a running session, and the panel is believed · **high**

**What goes wrong.** The view shows the filesystem. A Tortie session may be
three days old, may have survived a reboot, and may have been launched with
`--safe-mode`, `--bare`, `--setting-sources user`, `--strict-mcp-config` or
`-e/--extensions`, in which case **none** of the disk state applies to it. The
user reads the panel, concludes the running agent has the skill they just wrote,
and spends twenty minutes wondering why it is ignoring them. Worse, the reverse:
they delete a hook, see it vanish from the list, and the running session keeps
executing it.

**Evidence.** Claude Code hot-reloads skills and (as of today) hooks, but not a
skills root that did not exist at launch; Codex's own bundled `plugin-creator`
tells the user to "use a new thread… so that Codex picks up new skills"; the
`--safe-mode` family are launch-time argv, and Tortie's manifest already records
them. A transcript records nothing: 443 `system` records in a 12 MB session and
not one context manifest.

**Mitigation.** The launch snapshot is the truth for a live session, read from
the manifest, with the disk shown as "what a new session would get" (§8). The
readout's header always names the launch time, so the claim is "was launched
with", never "is running". The armed reload types the command and never presses
Enter. Per-(agent, category) reload semantics are registry data with an
`unknown` state (§10). And Tortie **never** restarts a session to apply a config
change — that would throw away the thing the product exists to protect.

**Residual.** For every agent except Claude Code, the reload semantics are
inferred; that is what `unknown` and `conformance:context` are for.

### R3 — A write path corrupts a shared configuration file · **high**

**What goes wrong.** Tortie writes `~/.claude.json` — measured today at
**1.23 MB with 2,036 project entries** — and truncates it, reorders it, drops
comments, or writes it while Claude Code is writing it. The user loses MCP
configuration for every project on the machine.

**Evidence.** Two config files changed *during* the read-only survey because the
user's own agents were running. Codex's `config.toml` is 9,700 lines here and
carries hook trust hashes.

**Mitigation.** `jsonc-parser` `modify()`/`applyEdits()` — the library VS Code
itself uses, MIT, zero transitive dependencies — for minimal, format-preserving
edits; a copy to `<userData>/gmux/context-backups/<timestamp>-<name>` before
every write; re-read and compare mtime immediately before applying, and abandon
the edit with a toast if the file moved; TOML read-only. Tier 3 from the first
line of code, with byte-comparison of before/after for each edit shape including
a file with comments and one with CRLF.

**Residual.** No file lock exists between Tortie and another process writing the
same JSON. The mtime check narrows the window; it does not close it. Prefer the
agent's own verb (§2.11) wherever one exists, because it is the process the
agent expects to be doing the writing.

### R4 — The panel misrepresents precedence, confidently · **medium-high**

**What goes wrong.** A single "scope" axis, ordered once, is wrong about half
the view: skills resolve broadest-first, MCP narrowest-first, hooks not at all,
and Gemini's skills resolve the opposite way to Claude Code's while Codex does
not resolve at all ("both can appear in skill selectors"). A user trusts the
order and edits the file that does not win.

**Mitigation.** Per-category ladders (§2.3), seven documented models (§2.9),
hooks grouped by event rather than scope, "wins" versus "also runs" as fixed
vocabulary, and the shadowed entry always reachable from the winner. The
conformance oracle diffs Tortie's resolution against `gemini skills list`'s
eleven conflict lines and `muse skills list --json`.

**Residual.** Enterprise/managed scope — the top of two ladders — is absent on
this machine and therefore untested. Do not draw a ladder rung that has never
been exercised (§15).

### R5 — The counts are wrong, or right about the wrong thing · **medium**

107 entries are 33 skills; 137 entries across all roots are 53, of which 20 are
Cursor's own product. A naive walk double-counts symlinks; a generous root set
inflates the number with vendor bundles; a narrow one hides a skill the agent
will actually load. **Mitigation:** dedupe by realpath, count the resolved set
for the selected agent scope, keep vendor bundles in their own collapsed group
(§2.1). **Residual:** the number will still differ from what any single agent
prints, because each agent reads a different subset of roots — which is the
feature, and the section header's tooltip should say which roots it read.

### R6 — Feature drift into the dashboard the Zen forbids · **medium**

The pressure is real and directional: a badge, then a "featured" row, then a
tools tab, then token accounting, then a timeline. Each is individually
defensible. **Mitigation:** §13.4's Never list, the "store versus source"
distinction (§3.1), and the fact that every refusal in this document names the
thing it refuses so a reviewer can point at it. **Residual:** none of this
survives a round that does not read the document.

### R7 — A credential appears on a screen that is being shared · **medium**

Measured here: a live API key in `~/.cursor/mcp.json`'s `env` block, provider
keys in `~/.qwen/settings.json` and `~/.deepseek/config.toml`. **Mitigation:**
keys shown, values `••••`, not copyable, no reveal affordance, "Open the file"
instead — the editor already owns showing file contents, and opening it is an
explicit act (§2.6, §7.3). `codex mcp list` already sets this precedent by
printing `KEY=*****`. **Residual:** a skill body or a hook command can contain a
secret in plain sight; the mask is keyed on config shape, not on content.

### R8 — One symlink, eight agents: the blast radius of a small gesture · **medium**

A shared skill is one inode reached from up to eight directories. Editing it
changes it for every agent; "Move to Trash" on the canonical copy removes it
everywhere while the seven dangling links remain. **Mitigation:** the trash
confirm has two different sentences — *Remove the link to "govuk-style"? The
skill itself stays in `~/.agents/skills`.* versus the full delete — and the
detail card always names the other agents that share the target. "Enable for…"
says *available to*, never *installed*, because nothing was downloaded.
**Residual:** an edit made in the editor, outside this view, still silently
changes eight agents' behaviour. The view can only make the sharing visible; it
cannot make the edit local.

### R9 — This document rots · **medium, and certain**

Between the source passes and this synthesis, one behaviour claim already went
stale (hooks now live-reload, §10). Agent CLIs change monthly.
**Mitigation:** every per-agent claim lives in the registry, not in prose, and
`conformance:context` makes it executable — the same lesson `conformance:resume`
learned the expensive way. **Residual:** DOC-only rows (all of droid) cannot be
kept honest by a gate that runs against installed binaries; they must render as
"not detected on this machine".

### R10 — Quiet network traffic from a passive surface · **low-medium**

`claude mcp list` health-checks servers over the network (2.5 s measured); the
skills CLI pings `add-skill.vercel.sh/t` on install; two of this machine's seven
Cursor MCP servers run `npx …@latest`, re-resolving code from the network at
**every session start**. **Mitigation:** the reader reads files and never
shells out on refresh (§2.11); every network call is a user-initiated verb;
install telemetry is disclosed in one sentence on the source's row and a single
global "don't send usage data" switch exports `DO_NOT_TRACK=1` to every
marketplace child process; unpinned `@latest` commands are flagged in the detail
surface with an offer to pin. **Residual:** Tortie cannot stop an agent it
launched from making its own network calls; it can only stop being the thing
that caused them.

---

## 15. What is not verified

Nothing in this list should be built on without a check first. It is deliberately
long, because a shorter one would be a lie.

**Agents and paths**

1. **droid is not installed here.** Every droid row is DOC-only. Install it
   before writing its registry row, or ship it behind "not detected on this
   machine". Per the Phase 13.5 lesson, a mined absence proves nothing.
2. **muse and pi expose no MCP surface at all** — muse has no `mcp` subcommand,
   pi's docs do not mention MCP. Whether they support it is unresolved; render
   "not supported", never an empty section.
3. **Codex's docs and its shipped binary disagree** about `~/.codex/skills`. The
   binary wins (the directory exists here with six built-ins under `.system`),
   but flag it as doc drift.
4. **Cursor's hooks file is unlocated.** `~/.cursor/skills-cursor/create-hook/`
   proves hooks exist; no `~/.cursor/hooks.json` is present and the docs page did
   not name a path. Read that skill before designing the Cursor hooks row.
5. **Qwen's MCP file shape is inferred** from the shared Gemini codebase — no
   `mcpServers` key exists here to confirm it. Verify with a throwaway server in
   a scratch `QWEN_*` home.
6. **Antigravity's global skills root is inferred**: its docs name
   `~/.gemini/config/` but `skills/` does not exist there yet.
7. **Amp's and OpenCode's paths are documentation-derived** apart from the
   directories that happen to exist here. Neither is in the registry, and neither
   should be added on this evidence.
8. **Enterprise / managed scope was never exercised.** No
   `/Library/Application Support/ClaudeCode/managed-settings.json` here, no
   Gemini system paths. It is the top rung of two ladders and it is theoretical
   for this user.
9. **Reload semantics beyond Claude Code are unmeasured.** Only Claude Code's
   live-reload behaviour was read from current documentation today; every other
   cell of §10 is inference. This is precisely what the `unknown` state exists
   for.
10. **A minor count discrepancy stands**: 6 versus 7 repos carrying hooks in
    `.claude/settings.json`, depending on the walk's depth limit. Small, but it
    is the same class of error as R5 and it should be nailed down by the
    conformance capture rather than argued about.

**Sources and trust**

11. **The `ath` scanner** in the audit response is unidentified (the CLI renders
    it as "Gen"). Name it correctly or label the column generically. Do not guess.
12. **Licensing of installed content is unenforced and undisplayed.** The
    `skills` CLI is MIT; the skills are whatever their repositories say. "Unknown"
    must be sayable in the preview.
13. **Whether an update can be previewed as a diff** was not measured. All three
    mechanisms record a commit hash, so it is computable in principle.
14. **muse and deepseek are absent from skills.sh's 76-agent table.** Decide
    whether the install picker hides them or shows them disabled with the reason.
15. **droid's MCP and hook surfaces** are entirely unmeasured (CLI absent).
16. **`schemas.agentskills.io` did not resolve** from this machine on 2026-08-12
    while `agentskills.io` did. Re-check before depending on the discovery schema.
17. **The skills.sh headline scale figure** (advertised above one million) is not
    verifiable as distinct skills and must never be repeated in Tortie's UI.
18. **The audit endpoint is undocumented.** It was recovered from the CLI's own
    bundle and re-verified twice today, but Tortie would be depending on a private
    API: treat a non-200 as "not scanned", never as an error, and never block an
    install path on it being up.

**Design claims that need a measurement before they are trusted**

19. **The ~15 ms launch snapshot** is derived from the 11.1 ms resolve plus a
    hash pass; it has not been measured inside the actual launch path.
20. **`jsonc-parser` is a new dependency** (3.3.1, MIT, zero transitive deps,
    not currently in the tree, not reachable through Monaco). Confirm it stays
    dep-free at the version pinned, and add it to `THIRD-PARTY-NOTICES.md`.
21. **`@parcel/watcher` on twelve config roots** is assumed cheap because it is
    already in the tree for `git:changed`. Watching home-directory trees with
    hundreds of entries is a different workload; measure before shipping the
    watcher, and fall back to the explicit refresh (§5.2) if it is not.

---

## 16. Verification tier

Mixed, per item, per `CLAUDE.md`'s instruction not to promote a whole round.
State this table in the phase brief so the choice is reviewable.

- **Tier 1** — icons, section chrome, copy, collapse and reorder (all inherited
  components), plus the three responsive tiers by screenshot at 400 / 300 /
  220 px.
- **Tier 2** — the resolver against this machine's real trees: it must produce
  **33 skills from 107 entries** and reproduce the **eleven overrides**
  `gemini skills list` prints on stderr. That output is a free oracle; diff
  against it rather than eyeballing the list. Same tier for the detail tab, the
  hover card and the executable-content scan (which has an exact expected
  answer: run it over `~/.agents/skills/**` and compare against a `grep`).
- **Tier 3, earned three times.**
  **(a) Every write path** — a corrupted `~/.claude.json` breaks 2,036
  projects' MCP configuration, which is squarely "can lose user data".
  Byte-compare before and after for each edit shape, including a file with
  comments and one with CRLF, plus a verified backup and a proven mtime-conflict
  abort.
  **(b) The launch snapshot**, because it touches the manifest and the launch
  path: prove a snapshot failure never blocks a launch or a restore, and that
  `smoke:t3`'s claude and non-claude restore shapes both still pass. Add
  `conformance:resume:capture` to the gate list for any commit touching
  `agents/registry.ts`.
  **(c) The install path, when v1.1 lands** — it executes third-party code. An
  adversarial verifier pair, a deliberately hostile fixture skill carrying both
  a `` !`…` `` body command and a `scripts/` payload, and proof that the
  hash-change auto-disable fires.
- **Universality claims** — §2.4's matrix and §10's reload table are claims that
  something works across agents, and inherit Tier 3's per-agent matrix
  requirement **for the agents actually installed**. A `?` row is verified by
  proving the view degrades to an absent section, not by guessing.
- **New gate**: `conformance:context` (§10), on the same trigger as
  `conformance:resume:capture`.

---

## Sources

**Measured on this machine, 2026-08-12** (read-only): eleven installed agent
CLIs and their help/list output — `claude` 2.1.228, `codex` 0.147.0, `gemini`
0.54.0, `cursor-agent`, `qwen`, `muse`, `pi`, `agy`, `deepseek`, `amp`,
`opencode`; `~/.claude/`, `~/.claude.json` (1.23 MB, 2,036 projects),
`~/.claude/plugins/{installed_plugins,known_marketplaces}.json` and
`marketplaces/claude-plugins-official/.claude-plugin/marketplace.json`,
`~/.codex/config.toml` and `~/.codex/.tmp/bundled-marketplaces/openai-bundled/**`,
`~/.cursor/{mcp.json,skills,skills-cursor}`, `~/.gemini/`, `~/.qwen/`,
`~/.deepseek/`, `~/.pi/agent/`, `~/.factory/`, `~/.agents/` and
`~/.agents/.skill-lock.json`, `~/.config/{agents,amp,opencode}/`,
`~/.local/share/muse/`, and the `skills` CLI's own bundle
(`~/.npm/_npx/*/node_modules/skills/{LICENSE,package.json,dist/cli.mjs}`), read
to recover the API hosts it actually calls.

The single best documentation source found anywhere in the survey is offline and
on this disk: Antigravity's own bundled customization guide at
`~/.gemini/antigravity-cli/builtin/skills/agy-customizations/`
(`SKILL.md` plus `docs/{hooks,json_configs,mcp_servers,plugins}.md`), which
specifies that product's skills, rules, plugins, hooks and MCP model completely.

**Endpoints hit 2026-08-12** (each re-verified in synthesis):
[skills.sh/api/search](https://skills.sh/api/search) ·
[add-skill.vercel.sh/audit](https://add-skill.vercel.sh/audit) ·
skills.sh/api/v1/skills/search (401) ·
[registry.modelcontextprotocol.io/v0/servers](https://registry.modelcontextprotocol.io/v0/servers) ·
[registry.smithery.ai/servers](https://registry.smithery.ai/servers) ·
mcp.so/api/servers (returns the app shell — no public API).

**Specifications and vendor documentation, fetched live 2026-08-12**

- [Agent Skills](https://agentskills.io) and its [specification](https://agentskills.io/specification) — `SKILL.md` format, frontmatter fields, progressive disclosure
- [Claude Code — Skills](https://code.claude.com/docs/en/skills) — scope precedence, symlink dedupe, live change detection, injected `` !`command` `` execution, `disableSkillShellExecution`, `skillOverrides`, listing budgets
- [Claude Code — MCP](https://code.claude.com/docs/en/mcp) — the five-level scope hierarchy, whole-entry precedence, `.mcp.json` approval gate and workspace trust
- [Claude Code — Hooks](https://code.claude.com/docs/en/hooks) — event vocabulary, merge-across-scopes, file-watcher pickup, `disableAllHooks`
- [Claude Code — Settings](https://code.claude.com/docs/en/settings) · [plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Gemini CLI skills](https://geminicli.com/docs/cli/skills) · [configuration](https://geminicli.com/docs/reference/configuration) · [hooks](https://geminicli.com/docs/hooks/) · [Tailor Gemini CLI with hooks](https://developers.googleblog.com/tailor-gemini-cli-to-your-workflow-with-hooks/)
- [Codex — build skills](https://learn.chatgpt.com/docs/build-skills) · [Cursor — skills](https://cursor.com/docs/context/skills) · [Factory — skills](https://docs.factory.ai/cli/configuration/skills) and [MCP](https://docs.factory.ai/cli/configuration/mcp) · [Amp manual](https://ampcode.com/manual#agent-skills) · [OpenCode](https://opencode.ai/docs/skills) · [pi skills](https://github.com/badlogic/pi-mono)
- [VS Code — customize agent behavior](https://code.visualstudio.com/docs/agent-customization/overview) · [Agent Skills in VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills) · [agent plugins](https://code.visualstudio.com/docs/agent-customization/agent-plugins) — the reference panel
- [The MCP Registry](https://modelcontextprotocol.io/registry/about) and [modelcontextprotocol/registry](https://github.com/modelcontextprotocol/registry) · [Smithery CLI](https://smithery.ai/docs/concepts/cli) · [Docker MCP Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/) · [PulseMCP](https://www.pulsemcp.com/servers) · [mcp.so](https://mcp.so/)
- [skills.sh](https://skills.sh) and [vercel-labs/skills](https://github.com/vercel-labs/skills)
- [Comparing hook systems in AI coding CLIs](https://lilting.ch/en/articles/gemini-cli-hooks-research) · [How to share SKILL.md across AI agents](https://www.agensi.io/learn/how-to-share-skills-across-ai-agents)
- Claude Code issues [#24057](https://github.com/anthropics/claude-code/issues/24057), [#46426](https://github.com/anthropics/claude-code/issues/46426), [#40059](https://github.com/anthropics/claude-code/issues/40059) — MCP reload requires restart

**Security**

- [Snyk — ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — 3,984 skills analysed from ClawHub and skills.sh
- [ClawHavoc / ClawHub](https://cybersecuritynews.com/clawhavoc-poisoned-openclaws-clawhub/) — 1,184 malicious skills
- [CSA — SKILL.md agent context poisoning](https://labs.cloudsecurityalliance.org/research/csa-research-note-skill-md-agent-context-poisoning-20260506/) · [CSA — MCP tool poisoning](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-tool-poisoning-ai-agent-exfiltration-2/) · [Agentic MCP security best practices](https://labs.cloudsecurityalliance.org/agentic/agentic-mcp-security-best-practices-v1/)
- [Check Point — RCE via Claude Code project files](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/) — CVE-2025-59536, CVE-2026-21852, GHSA-ph6w-f82w-28w6
- [PhantomSkill, arXiv 2606.19191](https://arxiv.org/html/2606.19191)

**Tortie's own authorities and prior research**

`CLAUDE.md` (scope guardrail, growth guardrails, UI rules, verification tiers) ·
`docs/ZEN-OF-TORTIE.md` · `DESIGN.md` §1–§7, §11 · `docs/DESIGN-SPEC.md`
S3/S3A/S3B/S3E/S4B/S5/S5B/S5C/S13 ·
`docs/research/11-agent-registry.md` (the twelve agents, their binaries and
stores) · `docs/research/22-resume-audit.md` (why registry claims must be
executable, not documented) · `src/renderer/controls/FilterField.tsx` ·
`src/renderer/app/ActivityBar.tsx` · `src/shared/keymap.ts`.
