# 31 · Extensibility — should Tortie have an extension system, and what kind

**Research phase R31. Decision document. Written 2026-08-12, superseding the first-pass landscape
draft of the same number.**

This is the record of the largest remaining architectural question in the product. It ends in a
recommendation, a set of permanent refusals, a staged plan with trigger conditions, and — the part
that matters most in a year — the **losing arguments preserved intact**, including every fatal
finding filed against the design that won.

**Provenance.** Four independent architecture proposals were written to a common brief and each was
attacked by three independent adversaries (security-and-trust; durability-and-first-class-surfaces;
three-year-maintenance-and-the-Zen) — twelve reviews in total, of which **eleven returned fatal or
critical**. Three prior arts were deep-read from their working trees on this machine, strictly
read-only: `/Users/gdc/bb` @ `aefe3ea`, `/Users/gdc/zed` @ `b13f6c7` (v1.17.0), `/Users/gdc/pi` @
`9795d60`. Every number about a codebase in this document was measured, not recalled. Every external
claim was verified live on 2026-08-12 with a version and a date. Nothing under
`/Users/gdc/gmux/src` was modified while this was written.

**Tortie measurements taken 2026-08-12** against `main` with a concurrent Phase 18 build in the tree:
105,919 lines of `.ts`/`.tsx` under `src/`, **81,286 of them non-test**.

---

## 1. THE RECOMMENDATION

**Tortie will never load third-party code into any of its processes.** Not into main, not into
either renderer, not into the preload, not into a worker or a `utilityProcess`, not as WASM, not as
a native addon. That single line is the architecture, and it eliminates the VS Code model, the bb
model, the Obsidian model, the Raycast model, the Neovim model, the Emacs model and the Zed model in
one stroke.

What Tortie builds instead is **Tortie Config: configuration, not code**. Tortie already ships its
differentiators as declarative tables — a 12-row agent registry, flag presets, a 65-chord keymap, a
106-token palette. It does not need an API. It needs a *door* onto tables that already exist in
exactly the right shape, plus a human-confirm step on anything that can cause a process to start.

Beyond that door there is a ladder with deliberately wide rungs, and **nothing above rung one gets
built without a written trigger firing first**:

| Rung | What it is | Third-party code runs where | Cost | Verdict |
|---|---|---|---|---|
| **P0 — Manifest completeness** | Persist into `manifest.db` every registry field the restore path reads today. Not an extension feature; a **prerequisite** that all four proposals independently required. | nowhere | ~1 migration, ~1 field, 1 test | **BUILD FIRST.** Independent value. Ship it whether or not R31 ever produces a door. |
| **1 — The Table** | Validated JSON overlays for the registries Tortie already ships as data: agents, themes, keymap, project presentation defaults. Human-confirm on anything execution-bearing. | nowhere | low hundreds of lines | **BUILD.** This is the answer. |
| **2 — The Peer** | A third-party **program**, run as its own OS process on a named trigger, returning content Tortie's own renderers paint into an editor tab. No SDK, no return channel into the UI, never on the create or restore path. | its own OS process, at the user's privileges, and Tortie says so in those words | ~1 spawner reusing `runGuarded`, ~1 effect validator | **DEFER** behind three named requests Tier 1 provably cannot serve. |
| **3 — The Panel** | Interactive third-party UI. If ever: adopt **MCP Apps (SEP-1865)** wholesale. Never a Tortie UI API. | a sandboxed, opaque-origin frame on its own Electron `session` partition | high, real | **DEFER** behind written criteria (§7.4). |

And the refusals that make the principle real, stated once here and in full in §6.7: no
`tortie.d.ts`; no marketplace; no contribution point into Explorer, SCM, search, the terminal, the
tab spine, the manifest or the tmux layer; no third-party native code in the signed bundle; the main
renderer's CSP is never relaxed.

**The one-sentence version for the operator:** *Tortie gets a config directory, not a plugin system
— and the thing that makes it safe is not a sandbox, it is that the config can only select from
choices Tortie already compiled in, and that a human confirms anything that can start a process.*

### 1.1 Why this and not the obvious alternative

The VS Code model is right about exactly one thing, and it is worth stating plainly rather than
dismissing: **a genuinely separate extension-host process with a stable, versioned API is the only
model that has survived a decade of hostile third-party code.** Its process separation is materially
stronger than bb's `jiti.import()` or pi's same-isolate loading. Zed's WASM host is the only thing
in the field that beats it, and it beats it at ~23,000 lines.

So VS Code's *mechanism* is right. Its *price* is exactly what a one-person product cannot pay, and
the *category* it protects — IDE furniture — is precisely the category `CLAUDE.md` capped after
Phase 14. Right answer, wrong product. The steer against it holds on merit, not on taste.

### 1.2 The three findings that decided it

**(a) 35,231 lines, at version 0.4.1.** bb's plugin infrastructure, excluding its thirteen
first-party plugins, measures 35,231 lines with a **13,551-line public `.d.ts`** and 70+ contribution
points. Tortie's entire non-test tree is 81,286. Zed's *version-shim tax alone* — ten concurrently
maintained WIT worlds, 5,372 lines of pure backward-compatibility code — is 6.6% of everything
Tortie has ever written, and it is the category of code you can never delete.

**(b) Zed is deleting the extension category closest to Tortie's product.** ACP agent-server
extensions were deprecated in Zed v1.5.0 (announced 2026-01-28) in favour of the **ACP Registry**: a
curated JSON manifest, CDN-served, with SHA-256-pinned binary distributions. Everything Zed *keeps*
in its WASM extension system is the IDE furniture Tortie capped. Everything Zed *removes* is
Tortie's product. When the most extension-serious editor of 2026 met the "which program do I run,
with what argv" problem, it answered with a **table row**, not a plugin.

**(c) Tortie has an adversary none of the prior art has.** Every product cited as precedent for
"config is trusted as the user's own hand" — Obsidian's Restricted Mode, pi's project trust, VS
Code's Workspace Trust, Zed, Raycast — has a **human** as the only routine writer of its config.
Tortie routinely runs dozens of concurrent, prompt-injectable agent processes under the same uid,
several deliberately launchable with their sandboxes off, all with write access to `$HOME`. A
hot-reloading, documented, agent-writable config directory that can define argv and hotkeys is a
**privilege increase**, not a neutral convenience. This finding does not kill config-first. It
dictates its controls, and it is why rung 2 is deferred rather than shipped: a trigger-fired
subprocess is a persistence mechanism for prompt injection.

---

## 2. The question, and why it is being asked now

### 2.1 The question

Seventeen phases have shipped. The parity scope was capped after Phase 14. What remains is
durability, the agent layer, correctness and consolidation — and one unanswered structural question
that every subsequent decision quietly depends on: **is there a supported way for someone who is not
the operator to change what Tortie does, and if so, what shape does it take?**

The question is not "should users be able to customise Tortie". They already can: settings, launch
flag presets, hotkeys, scrollback depths, capture defaults. The question is whether Tortie grows a
**mechanism** — a noun, a lifecycle, a contract with strangers — and if so where its boundary sits.

### 2.2 Why now, and not later or earlier

Four forcing functions, in order of weight.

**The thirteenth agent.** The registry is a 12-way TypeScript literal union
(`src/shared/types.ts:503-515`). Adding an agent today touches the union, the ~660-line registry
literal, an SVG, the `LOGOS` map, the renderer's short-label mirror, and possibly
`SpecstoryProviderId`. It requires a source edit, a typecheck, a build, a smoke run and a release.
For a product whose thesis is *the agent layer*, the agent layer is the least extensible part of it.

**Later is more expensive than now.** Every phase adds surface. `docs/research/25-codebase-context.md`
§4 records that the internal IPC contract has already partially failed its own guardrails: G9 FAIL,
with `shared/ipc.ts` carrying 35 APPENDED blocks and a nine-level alias ladder before Phase 16
reconciled it. If the internal contract drifted like that in seventeen phases, a *public* one
started later — with more surface to freeze — drifts worse. Decide the boundary before there is more
of it.

**Earlier would have been wrong.** bb is the control experiment: repo first commit 2026-02-11,
`packages/plugin-sdk` first commit 2026-07-02. bb shipped explorer, threads, agents and hosts first,
*then* refactored features out into plugins. Nothing was built plugin-first. A plugin API designed
before the product knows its own seams freezes the wrong seams.

**Context forces the vocabulary question.** `docs/research/29-context-sidebar.md` is designing a
sidebar that inventories the skills, MCP servers and hooks *the agents already own*. If Tortie
independently grows a rival hook system in a Settings pane, the product ships two vocabularies for
one idea and the Context panel's thesis is undermined by its own host. R31 has to answer where
Tortie's own extensibility sits relative to the agents'.

### 2.3 What binds the answer

Five constraints, in the order they kill ideas.

1. **`ZEN-OF-TORTIE.md`, the named tiebreaker.** *"Anything durability-critical should be boring,
   inspectable and older than this product."* A plugin host is none of the three. *"Not a
   dashboard. Not a supervisor's console. Not a tool that teaches its own internals."* An SDK is a
   tool that teaches its own internals as its primary activity. And line 111 lists **extensions** by
   name among the refusals — scoped, correctly, by its heading *"Not an IDE rebuilt from scratch"*
   (see §6.8 for the honest reading of that scope).
2. **`CLAUDE.md`'s scope guardrail.** *"Justify parity work… does this serve the agentic-coding
   workflow, or does it exist because IDEs have it?"* and *"Assemble, never reimplement."* An
   extension system built because IDEs have one fails the first test. A UI protocol *authored* by
   Tortie fails the second.
3. **The growth guardrails.** One typed preload bridge; organise by domain; `src/shared/*` is
   append-only during parallel builds. A public contract is the same discipline problem with
   strangers' working software attached.
4. **The durability boundary.** Sessions live in the private tmux server; the manifest is the source
   of truth for restore. **No extension mechanism may run on the create path or the restore path,
   write `manifest.db`, or issue a tmux command.**
5. **What must stay first-class.** Explorer, SCM, search, durable sessions, paned projects and
   Context. None of them becomes an extension; none of them gains a contribution point; no
   third-party code runs in their process. §6.6 states the mechanism for each.

---

## 3. Prior art

Three deep reads on this machine, then the wider 2026 landscape. Each entry ends with **the one
lesson** it contributes.

### 3.1 `/Users/gdc/bb` — a typed TypeScript plugin SDK, and what it actually costs

`bb` describes itself as *"an agentic IDE that builds itself… control, customize and automate
itself."* It is the closest thing on this machine to a Tortie-shaped product that has already built
the thing R31 is deciding about, which makes its measurements the most valuable data in the
document. Read at `main` @ `aefe3ea49`.

**What a bb plugin is.** A directory with a `bb` block in `package.json`. The entire manifest schema
is 86 lines (`packages/domain/src/plugin-manifest.ts:72`): name, description, branding icon, a
**required** `server` entry, an optional `app` entry, skill roots, themes. **There is no permissions
field, no capability declaration, no activation events, no contribution-point manifest.** A
`bb.capabilities` concept exists in the management UI (`plugin-service.ts:1172 capabilitySummary`)
but it is descriptive: it enumerates what a plugin contributes for a "what's included" panel.
Nothing is asked; nothing is denied.

**The isolation model: there isn't one.** `apps/server/src/services/plugins/plugin-runtime.ts:1085`
loads plugin server code with `await jiti.import(...)` directly into the bb server's Node process. A
repo-wide grep of the plugin stack for `node:vm`, `isolated-vm`, `new Worker`, `worker_threads`,
`utilityProcess` returns **zero** matches. Frontend plugins are lazily `import()`ed ES modules
mounted into the host's own React tree; the SDK's own words
(`packages/plugin-sdk/src/app-contract.ts:822`) are *"**Trusted** same-origin JavaScript/TypeScript
mounted once per active frontend generation."* The only thing actually blocked is native addons, and
that is incidental (`ERR_DLOPEN_FAILED` under Electron's ABI, plus `--ignore-scripts` at install).

**bb is strictly less isolated than VS Code**, which at least runs extensions in a separate
Extension Host process. bb's posture is: *installation is total trust.* Its own design doc
(`docs/plugin-sidebar-thread-list.md:667`) admits the open question out loud — *"Decide whether
`delete` and `archive` need any plugin permission gate beyond installation trust."*

**The measured cost.** This is the number to carry into every argument below.

| | lines |
|---|---|
| `plugin-sdk` + `plugin-registry` + `plugin-build` + `apps/server/src/services/plugins`, excluding tests and excluding the plugins themselves | **35,231** |
| …of which `apps/server/src/services/plugins` alone | 10,711 |
| …of which `packages/plugin-sdk` alone | 22,072 |
| `bundled-types/bb-plugin-sdk.d.ts` — the public API surface | **13,551** |
| the 13 first-party plugins | 85,269 |
| the SDK's version | **0.4.1** |

bb's plugin *infrastructure* — not its plugins — is **43% of Tortie's entire non-test source tree**,
and its public `.d.ts` alone is larger than Tortie's `shared/ipc.ts` (2,295) plus `keymap.ts`
(1,066) plus `registry.ts` (1,233) plus `settings.ts` (242) combined, by a factor of nearly three.

**The most important architectural retreat in the repo, and it took one day.** The SDK once exposed
components. `app-contract.ts:1330`, written into the contract file itself:

> *"Components are deliberately NOT part of this surface (**removed 2026-07-03**)… **Freezing 65
> component prop types here made every host component change a plugin-breaking change.**"*

The plugin system landed 2026-07-02. The component API was removed 2026-07-03. What replaced it is
`packages/plugin-registry` — 57 shadcn-style registry items of vendored React source that plugin
authors copy and own. The SDK now ships exactly three components, each justified as a *product
capability*, not a UI kit.

**And bb built a marketplace and deleted it two days later.** Migration
`0066_smooth_shinko_yamashiro.sql` (PR #636, 2026-07-13) created a `marketplaces` table;
`0072_bizarre_the_liberteens.sql` (PR #721, **2026-07-15**) contains `DROP TABLE marketplaces`. What
shipped instead, from `plugin-catalog-service.ts:26`: *"The plugin store over the official plugins
bundled with the app. Entries install from the local bundled copy — **no network, no remote
catalog**."*

**Three things worth stealing from bb regardless of the verdict.**

- **The hand-copied DTO rule** (`docs/plugin-sidebar-thread-list.md`): *"`ThreadListEntry` changes
  whenever the app needs a field; a plugin contract must not."* A public type is hand-written and
  narrow, never a re-export of an internal one. This is the single most important structural
  protection in §6.
- **The host keeps the chrome; the third party gets the scroll area.** An earlier bb revision that
  passed the New-thread/search row down as a prop was **reverted**, because *"a plugin could silently
  drop it."*
- **Status is data, not components.** bb hands plugins the *resolved output* of its own precedence
  function as a string, so *"a plugin gets bb's precedence for free… and cannot drift from it."*

> **The one lesson.** The SDK is the expensive part and the store is the cheap part — the opposite of
> the intuition. bb paid 35,231 lines and a permanent 13,551-line public contract at v0.4.1, watched
> its component API die in a day, deleted its marketplace in two, and its highest-value plugins ship
> in the box and install over no network. Every one of those outcomes is obtainable with zero of that
> machinery.

### 3.2 `/Users/gdc/zed` — the WASM sandbox, and the two things everyone gets wrong about it

Zed v1.17.0, HEAD `b13f6c711`, 2026-08-12. Extensions are WebAssembly components on
`wasm32-wasip2`, linked with `wasmtime_wasi::p2`, wasmtime pinned at **36.0.12**. Subsystem size:
`extension_host` 10,341 + `extension_api` 5,174 + `extension` 2,797 + `extensions_ui` 2,845 +
`language_extension` 832 + `extension_cli` 690 + `debug_adapter_extension` 243 + `theme_extension`
92 ≈ **23,000 lines**, before wasmtime itself (19 `wasmtime-*` and 13 `cranelift-*` crates in
`Cargo.lock`, built at `opt-level = 3`). Zed ships a JIT compiler inside a text editor.

**What the boundary genuinely buys, and it is real.** The WASI context preopens **exactly one
directory** — `<extensions>/work/<extension-id>` — with no sockets and no other paths. Ambient
authority is eliminated; every reach outside is a named host import. Path-escape defence
(`wasm_host.rs:753-804`) is lexical normalisation → canonicalise the nearest existing ancestor →
prefix check, with real regression tests for `..` and for symlinks pointing outside. Epoch
interruption with a 100 ms ticker bounds a runaway extension. Each extension is a single-threaded
actor; calls serialise. Ten frozen WIT snapshots mean a 2024 extension still loads in 2026. **That
versioning discipline is the best thing in the design.**

**Misconception 1: "Zed extensions are sandboxed, therefore safe."** The shipped defaults
(`assets/settings/default.json:2166-2170`) are:

```json
"granted_extension_capabilities": [
  { "kind": "process:exec",   "command": "*", "args": ["**"] },
  { "kind": "download_file",  "host": "*",    "path": ["**"] },
  { "kind": "npm:install",    "package": "*" }
]
```

Default-allow-everything with an opt-in *restriction*. Nothing in `extensions_ui` surfaces
capabilities at install time — the only match for `capabilit` in that crate is a test fixture. And
the capability system governs the **side door** while leaving the front door open:
`grant_exec` is checked in exactly one place (`process::run_command`), whereas
`language-server-command`, `context-server-command` and `get-dap-binary` all have the extension
*return* `{command, args, env}` which the **host** then spawns with no capability check at all
(`crates/language_extension/src/extension_lsp_adapter.rs:160-257`). `http-client::fetch` is entirely
ungated: arbitrary HTTP to any host, no declaration, no prompt. Zed says so itself in
`docs/src/ai/sandboxing.md:23` — the OS-level sandbox it built applies to the Agent and *"does not
sandbox… extensions."*

**Misconception 2: "Zed extensions can build UI."** They cannot. The WIT world at
`since_v0.8.0/` is 633 lines across 12 files and **not one exported function draws anything**. Every
export answers *"which program do I run, with what argv, and what JSON config do I hand it."* The
three resources are `worktree`, `project` (whose entire API is `worktree-ids`), and a
`key-value-store` with exactly one method — **`insert`**. There is no `get`. An extension has
write-only access to its one persistence primitive. Themes, icon themes and snippets — the
categories with the most users — are **pure JSON and SVG with no WASM at all** (`theme_extension` is
92 lines).

**The decisive event.** `docs/src/extensions/agent-servers.md` is nine lines long and is a tombstone:
*"As of Zed `v1.5.0`, ACP extensions have been deprecated in favor of the ACP Registry."*
`mcp-extensions.md` carries the same planned fate; tracking issue `zed-industries/zed#59351`
(opened 2026-06-15) is still open. The replacement, from
`crates/project/src/agent_registry_store.rs:21`, is
`https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json` — fetched live 2026-08-12:
**52 agents, `"extensions": []`**. Each entry is pure data: id, name, version, repository, icon, and
a `distribution` that is `{npx: …}` or per-target `{archive, cmd, args, sha256, env}`. **No
third-party code runs inside Zed.** The agent is its own process speaking ACP over stdio.

And the install path is *more* hardened than the extension store, which is the tell:
`agent_server_store.rs:1218-1300` verifies the declared `sha256`, falls back to the GitHub release
digest, keys the cache directory on the hash, requires `cmd` to be relative and start with `./`, and
rejects any `cmd` containing `..`. Meanwhile the extension store's own download
(`extension_host.rs:773`) checks `Content-Length` and nothing else — the source admits at
:1649 that the checksum file it wants *"we'll create when downloading normal extensions"* does not
exist.

One more direction-of-travel data point: when Zed needed a new extension point in 2026
(`language_model_providers`), it added **declarative manifest data with no WIT surface whatsoever** —
`{name, icon}` in TOML, whose only use is hiding a superseded built-in provider.

> **The one lesson.** When the thing being extended is *"which external program to run and how"*, the
> correct artefact is a **registry row**, not a plugin — and the industry converged on this in
> January 2026 *after* paying for the alternative first. Secondary: a WASM sandbox whose default
> grant is `process:exec *` buys memory safety, not trust. Do not pay 23,000 lines for it.

### 3.3 `/Users/gdc/pi` — the self-extensible agent, and the two ideas worth stealing

pi @ `9795d6023`, monorepo version **0.84.1**, first commit **2025-08-09** — one year old, ~84 minor
releases. Its extension subsystem is **5,346 lines** against bb's 35,231, for a comparable
capability set.

**"Self extensible" resolves to four unceremonious mechanisms that compose.**

1. **The host ships its own API spec inside the binary and points the agent at it by absolute path.**
   `src/core/system-prompt.ts:131-138` injects the paths of `docs/extensions.md` (**2,992 lines**) and
   `examples/extensions/` (**79 entries**) into every session, with the instruction to read them
   before implementing. Both are in the npm `files` array, so they are on disk next to every install.
   The agent does not need the API in its weights.
2. **The extension unit has zero ceremony.** One `.ts` file default-exporting `(pi: ExtensionAPI) =>
   void`. No manifest, no id, no version, no build step, no registration command. Discovery is a
   one-level scan of `~/.pi/agent/extensions/` and `<cwd>/.pi/extensions/`. **"Install" is literally
   `write(path, source)`** — a tool the agent already has.
3. **`/reload` swaps the extension runtime in-process without ending the conversation.**
4. **The agent can pull that lever itself.** `examples/extensions/reload-runtime.ts` demonstrates it,
   and `pi.registerTool()` works after startup — a tool call can mint tools the model calls later in
   the same turn (`AgentToolResult.addedToolNames`).

**Be honest about the API size, because it cuts against the "new approach" narrative.**
`src/core/extensions/types.ts` is **1,728 lines**: 26 named members over 58 signatures, 33 event
types, a full `ctx.ui` namespace, and interception down to mutating provider HTTP headers. It is a
`vscode.d.ts` in miniature, and growing. What pi discarded is not the API — it is **the ceremony
around it**. Hot reload is not free either: `runner.ts` carries a hand-maintained `assertActive()`
on ~40 accessors because a `ctx` captured before a reload must not silently drive a dead runtime.

**Trust posture, stated plainly by the vendor.** `docs/security.md`: *"Pi does not include a built-in
sandbox… Extensions are TypeScript modules that run with the same permissions… A partial in-process
sandbox would be easy to misunderstand as a security boundary."* The only guard is a one-time
per-directory project-trust prompt, and that prompt gates *input loading*, not execution. There are
no timeouts: a grep for `setTimeout|Promise.race` over `runner.ts` and `loader.ts` returns nothing,
and handlers are awaited sequentially — one extension awaiting a promise that never settles wedges
the turn.

**Two genuinely excellent ideas, and neither is an extension-system idea.**

- **Built-in tools are factories over an operations port.** `createBashTool`, `createReadTool`,
  `createEditTool`… each takes a typed operations interface. `examples/extensions/gondolin/`
  re-creates all seven built-ins against a QEMU micro-VM backend: same names, same schemas, same
  prompt text — only the *implementation of the effect* changes. That is dependency inversion, not
  plugin architecture. (Note the symmetry: the mechanism that makes Gondolin elegant is the same one
  that lets a hostile extension replace `read` and `write` with something that lies.)
- **Extension state lives in the conversation tree, not in a plugin store.** State is persisted in
  tool-result `details` and reconstructed by walking the branch on `session_start`. It therefore
  forks when the conversation forks and compacts when it compacts, for free, with no migration code
  and no second durability system. **Tortie should adopt the principle whether or not it ever ships
  extensions: there should be exactly one durable store, and it should be the one that already has
  to be correct.**

**Distribution: sources, not a store.** `npm:`, `git:`, a URL, or a local path, written into
`settings.json`. No registry, no search, no ratings, no publisher identity, no signing. The doc's
only safety mechanism is a sentence.

> **The one lesson.** Publish the **contract**, not the **toolkit**. `docs/extensions.md` opens,
> before its first heading, with *"pi can create extensions. Ask it to build one for your use case."*
> For a product whose users have twelve coding agents one keystroke away, the SDK's entire purpose —
> making authoring cheap — is already satisfied. What is scarce is a contract an agent can read
> without guessing. A JSON Schema plus worked examples plus a conformance test is a complete
> authoring story, and it is most of why pi is 5,346 lines where bb is 35,231.

### 3.4 The wider 2026 landscape

**Raycast** — no meaningful isolation; extensions are Node plus a React renderer inside Raycast's own
runtime. The controls are policy: reviewers check for Keychain access, external analytics, and
integrity-verified binary dependencies. UI is first-class and constrained — extensions compose
Raycast's *own* components, which is the best UI containment strategy in the survey and is achieved
by **API poverty, not sandboxing**. Distribution is a public monorepo with human review; over 2,000
extensions by April 2026, and the reported failure mode is quality dispersion. Revenue is the
subscription — the store monetises the product, not the authors, so review is a permanent operating
expense the vendor subsidises. **Lesson: taking third-party code in-process buys you a permanent
human review desk. Tortie is one operator. Do not buy a review desk.**

**Obsidian** — the honest confession. Verbatim from `obsidian.md/help/plugin-security`: *"Due to
technical limitations, Obsidian cannot reliably restrict plugins to specific permissions or access
levels."* Plugins can read files, reach the internet, and install additional programs. Mitigations
are submission review, automated malware scanning, and **Restricted Mode on by default** — nothing
third-party runs until the user turns it off. The documented cost includes a community plugin abused
to deploy a RAT, and the quieter cost every Obsidian user knows: a minor version bump breaks a plugin
you depend on and the vendor cannot fix it. **Lesson: steal Restricted Mode (inert until explicitly
trusted, per scope) and steal the honesty; refuse the mechanism. "We cannot restrict plugins" is a
sentence Tortie must never have to write about durable agent sessions.**

**Warp and the agentic terminals** — the closest competitor category. Warp's answer to "add
capability" in 2026 is **MCP servers**, described in its own materials as *"acting like plugins"*;
its visual customisation is **YAML theme files under `~/.warp/themes/`**. There is no Warp plugin
API. **Lesson: the nearest neighbour independently landed on exactly rung 1 + rung 2 — declarative
files for appearance, subprocesses over a protocol for capability. Tortie arriving there is
convergence, not timidity.**

**Ghostty** — the deliberate refusal, with a real alternative attached. No scripting runtime, no
plugin system, by explicit design; customisation is configuration. The escape hatch is
**libghostty**, a C-ABI library that *is* the terminal engine. Ghostty's answer to "extend me" is
*"embed me"*. **Lesson, and it applies directly: a refusal is only credible with an alternative.
Tortie's equivalent already exists and is undocumented — the durable layer lives outside the app.
Anyone can read `manifest.db`, observe `tmux -L gmux`, and parse the SpecStory transcripts. That is
Tortie's libghostty and it costs nothing to document.**

**Neovim and Emacs** — maximal extensibility, in-process, no isolation, total UI power, paid for in
config bankruptcy and plugin-manager churn. The 2026 data point that matters: **Neovim 0.12.0
(2026-03-29) shipped `vim.pack`, a plugin manager in core** — Lua, zero external dependencies, an API
of `add`/`update`/`del`. **Lesson: even in the maximalist tradition, 2026's direction of travel is
fewer, more official, more boring mechanisms, because the vendor gets blamed for the ecosystem's
fragility regardless and eventually absorbs it.**

**Figma** — the UI-heavy analogue and the cost of doing it right. Plugin logic runs in **QuickJS
compiled to WASM** — a whole second JavaScript engine — with plugin UI in a **separate-origin
iframe**, after an earlier Realms-based sandbox failed security review in 2019. **Lesson:
third-party UI plus a same-process document model costs you an entire embedded JS engine. That is
the real price tag on building rung 3 yourself.**

**Tauri plugins** — compile-time Cargo crates baked into the binary. Runtime injection of an external
plugin is an open request, not a feature. **Lesson: "plugin" here means what Tortie's guardrails
already call "a module". Worth naming only because "we should have plugins like Tauri" sounds like
third-party extensibility and is not.**

**MCP Apps (SEP-1865)** — the substrate arrived. Verified live 2026-08-12: SEP-1865 reached stable
**2026-01-26** as the first official MCP extension, and is supported by Claude (web and desktop),
VS Code Insiders, Goose and Postman. Its rules are stricter than anything Tortie would write: UI
resources use the **`ui://`** scheme with MIME `text/html;profile=mcp-app`, predeclared so hosts can
prefetch and review before execution; hosts **MUST** render in a sandboxed iframe, web hosts **MUST**
use a cross-origin double-iframe; hosts **MUST construct the CSP from resource metadata**, defaulting
to `default-src 'none'; connect-src 'none'` and widening only to explicitly declared domains, never
loosening; the View→Host JSON-RPC surface is seven methods. **Lesson, and it is the largest single
one in this section: the "extension with a UI" problem was standardised in January 2026 by the two
vendors whose agents Tortie launches. If Tortie ever needs third-party UI it must implement *this*,
not a fourth thing — and the reason is not convenience, it is that widening someone else's spec is
not in your power.**

**WASI 0.3 / the component model** — WASI 0.3.0 released 2026-06-11, native async in the component
model, WASI 1.0 with LTS targeted late 2026 / early 2027. It would buy genuine memory isolation and
language-agnostic authoring. It loses anyway: Zed's deployment demonstrates the ceiling (the moment
an extension launches a real program the sandbox is bypassed, and launching real programs is
Tortie's entire job); it has no UI story; it costs a wasmtime embedding, a WIT world to version
forever, and a Rust toolchain for authors in an all-TypeScript codebase; and it lands as a **new
native dependency inside a signed .app** (§4.6). **Lesson: the right answer to a question Tortie does
not have.**

### 3.5 The comparison table

| | bb | Zed | pi | Raycast | Obsidian | Warp | Ghostty | **Tortie (recommended)** |
|---|---|---|---|---|---|---|---|---|
| **Isolation** | none — `jiti.import` into the server process; frontend into the host React tree | WASM `wasm32-wasip2`, one preopen dir, epoch interruption — but default grant is `process:exec *` and returned commands are unchecked | none — jiti into the same V8 isolate; no timeouts | none — Node in the host runtime | none, stated by the vendor | subprocess / HTTP (MCP) | N/A — nothing loads | **none needed — no third-party code exists in any Tortie process** |
| **UI story** | 70+ contribution points into first-class surfaces | **zero** — no WIT function draws; themes are JSON+SVG | full TUI, can replace the app's chrome | compose the host's own components (API poverty) | total — plugins reshape the app | themes only | the app's own, always | **host renders everything; a deferred peer returns *content*, not components** |
| **Distribution** | bundled in-app; built a marketplace and dropped the table two days later | store, unsigned + unchecksummed; **agents moved to a CDN JSON registry with SHA-256 pins** | `npm:`/`git:`/URL/path in settings; no registry | reviewed public monorepo, 2,000+ | reviewed + malware-scanned community store | user's own MCP config | none | **a file the user puts there; if ever curated, an ACP-Registry-shaped manifest with hashes** |
| **Trust model** | installation is total trust | two-key grant for `exec` only; default allows everything | project-trust prompt gates loading, not execution | **human review desk** | Restricted Mode + review + scanner | user's own machine | N/A | **human-confirm on anything execution-bearing; closed enums everywhere else** |
| **Author burden** | TS package, SDK version pin, host-fetched toolchain | Rust + `wasm32-wasip2` + wasi-sdk, PR to a submodule repo | one `.ts` file, no build | TS package + review cycle | TS package + review | a JSON config entry | N/A | **a JSON file an agent can write from a published schema** |
| **Host burden** | **35,231 lines**, 13,551-line `.d.ts`, at v0.4.1 | **~23,000 lines** + wasmtime; **10 WIT worlds, 5,372 lines of shim** | 5,346 lines + `assertActive()` on ~40 accessors | runtime + permanent review staffing | runtime + scanner + apology surface | an MCP client | zero | **low hundreds of lines; no new process, dependency, entitlement or CSP change** |
| **Direction of travel, 2026** | growing contribution points | **removing** its most product-adjacent categories | agent-authored, no store | growing, review-bound | stable, breakage-taxed | MCP-only | unchanged refusal | — |

---

## 4. Tortie's existing seams

Measured against the working tree 2026-08-12: 477 `.ts`/`.tsx` files, 105,919 lines. The framing
question for this section is not "where could we add an API" but **"which seams are already an API in
all but name, and which must never become one."**

### 4.1 The physical shape, which constrains everything

**One window, one preload, two renderer entries.** `contextIsolation: true`, `nodeIntegration:
false`, **`sandbox: false`** (`src/main/index.ts`, `src/main/settings/window.ts`). `sandbox: false`
is required by the preload; it means the renderer is *not* a Chromium sandbox boundary, so
third-party JS there would be a full compromise, not a contained one.

**The CSP forbids third-party JS in the renderer and permits it in a worker.**
`src/renderer/index.html:8`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: gmux-asset:; font-src 'self' data:; worker-src 'self' blob:
```

`script-src 'self'` makes a VS-Code-style in-renderer extension host **physically impossible without
relaxing the CSP**. `worker-src 'self' blob:` is already open — a Blob-URL Web Worker is a
same-origin, DOM-less, structured-clone-only sandbox the current CSP permits today. That is an
unremarked-on isolation primitive, and it is the only one Tortie has for free.

**Main already runs three kinds of out-of-process work** — `node:worker_threads` (symbol pool,
quickopen), guarded `child_process.spawn` (`src/main/proc/guarded.ts`, 239 lines, written from a
measured 19-hour orphan leak), and long-lived PTY clients. **`utilityProcess` is not used anywhere**,
and `src/main/search/engine.ts:10` explicitly rejects it with a measured reason ("no utilityProcess,
no worker … a second copy of every 4 MB payload").

**There is no runtime code loading of any kind.** Zero dynamic `require` of external code, zero
user-supplied JS, zero manifest discovery. Every dynamic `import()` is a Vite chunk of first-party
code. Tortie today has **no notion of a third party**. That is not a gap to apologise for; it is why
the guardrail tests below are still green.

### 4.2 The three guardrails that actively block a naive plugin API

- **G1 `ipc-single-bridge.test.ts`** — five assertions: nothing registers an invoke handler except
  `main/typed-ipc.ts`; nothing sends a static event except `main/typed-events.ts`; nothing subscribes
  except the preload; every `EVT_*` has a payload in `AllEventPayloadMap`; **every channel in
  `AllEventPayloadMap` is subscribed by the preload**. That last one is decisive: a third party
  structurally cannot introduce a statically-named event channel, because the preload is a build-time
  artifact. Its own docblock says *"the fix when this fails is never to widen an allow-list."* The
  `RAW_IPC_ALLOWED` map has five entries, each naming a **mechanism**; two exist because their
  channel names are computed at runtime (`term:data:<id>`, `search:results:<id>`). That is the only
  honest escape hatch.
- **G2 `keymap-single-source.test.ts`** — a modifier glyph in executable source is a build failure.
  Any contributed chord must go through `KEYMAP`.
- **G3 `canvas-color-single-source.test.ts`** — holds the three copies of the canvas colour to one
  value. A theme system must reckon with this test's existence, which is a good sign: the token story
  is already policed.

### 4.3 The seam inventory

Rated **A** = already an API in all but name · **B** = one refactor away · **C** = would have to be
invented · **X** = must never become an extension point.

| # | Seam | Where | Rating | Note |
|---|---|---|---|---|
| S1 | Typed preload bridge, `GmuxInvokeChannelMap` | `shared/ipc.ts` (2,295), `preload/index.ts`, `main/typed-ipc.ts` | **B** | Good, boring RPC. Closure is total and *tested*. |
| S2 | Per-domain main registrars | 18 × `register<Domain>Ipc(ipc, deps?)`, called from one static list | **A** | This is already `activate(context)` with injected deps. |
| S3 | Template channels | `termDataChannel()`, `searchResultsChannel()` | **A** | The only sanctioned dynamic namespace, exempt **by mechanism**. |
| S4 | Optional-extras + feature detection | 33 `Gmux*Extras` interfaces, 69 detection sites | **A** | See §4.4 — the biggest finding. |
| S5 | The agent registry | `main/agents/registry.ts` (1,233; ~660 one literal; 12 rows) | **B** | Highest-value, highest-risk door. §4.5. |
| S6 | Registry projections over IPC | `agents:list`, `agents:multilineKeys`, `drop:strategies`, `agents:flagPresets` | **A** | The registry is already a wire format. |
| S7 | Activity oracle tier selection | `AgentActivityProfile` → closed impl set | **B** | Data selects; never supplies. |
| S8 | Keymap merge point | `keymapSections(extra)`, `KeymapSource` | **A** | Already has a third-party merge parameter *and* collision refusal. |
| S9 | Native menus as data over IPC | `ui:popupMenu` / `PopupMenuInput` | **A** | Declarative UI across a process boundary, already shipping. |
| S10 | Sidebar view / activity bar | hardcoded ternary, closed union | **C** | |
| S11 | Editor viewer dispatch | closed `EditorMode` union | **C** | |
| S12 | Settings schema | `shared/settings.ts` (242) + sanitised store (262) | **C**, and see §4.6 | |
| S13 | Themes / tokens | `tokens.css`, 106 tokens, **dark-only, no theme mechanism** | **C** | |
| S14 | Codicon names | arbitrary string → font glyph | **A** (already open) | |
| S15 | `gmux-asset:` protocol | `main/assets/protocol.ts` | **B** | Re-checks the extension *after* `realpath`. |
| S16 | Worker / child-process isolation | worker_threads, `runGuarded`, `worker-src blob:` | **B** | |
| S17 | **Durability core** | tmux `-L gmux`, manifest, restore, harvest | **X** | |
| S18 | Launch-argv interposition | `main/specstory/wrap.ts` (221) | **B, and must stay shut** | §4.7. |
| S19 | Tortie-as-extension-of-agent | `main/activity/hooks.ts` (336) | **A** (inverted) | §4.7. |
| S20 | Renderer store | one `create<AppState>` | **C** | |
| S21 | Open-file bus | `state/open-file.ts` | **A** | Eight emitters, one consumer; a ninth is one line. |
| S22 | **Command layer** | **does not exist** | **C, and it is the keystone** | §4.8. |
| S23 | userData layout | `<userData>/gmux/**` | **A** | A `config/` sibling has precedent and a migration story. |
| S24 | Per-project config | **does not exist** — verified: nothing in `src/` reads `.tortie/` | **C** | |

### 4.4 S4 — capability negotiation is already Tortie's native idiom

This is the largest finding in the seam map. Tortie has spent seventeen phases doing, between preload
and renderer, exactly what an extension host does between host and extension: **publish an optional
surface and let the consumer feature-detect it.** Thirty-three `Gmux*Extras` interfaces, every method
optional, 69 detection sites, and — critically — a *documented degradation* at each one, in a
consistent house style:

- `GmuxSpecStoryExtras`: *"Without it the Settings section renders one honest line instead of dead
  controls."*
- `ExplorerHeader`: *"An older preload without the mutation channels hides nothing here — it
  **disables**, because a create button that vanished would read as a missing feature rather than as
  a build that cannot write files."*
- `GmuxGitGraphExtras`: *"an older preload leaves the history pane on its flat single-column render
  rather than throwing."*

An extension design does not need to invent version negotiation for Tortie; it needs to **reuse
this**. The only thing that changes is that today the negotiation is between two halves of one build
and is compile-time-checkable. Pointed at a third party it becomes a runtime contract — a real change
in kind, but the vocabulary and the discipline already exist and are written down in 33 places.

### 4.5 S5 — the agent registry is Tortie's own answer to extensibility, chosen twice on evidence

`AgentRegistryEntry` is a ~30-field record of pure data — no Electron, no I/O, unit-testable
anywhere. Five properties should bind any design:

1. **Data replaced a `default:` branch, and that was the point.** From its docblock: *"There is now
   no default branch at all — the launch spec is composed from registry DATA… an agent whose capture
   route is unknown says 'unsupported' out loud instead of pretending."* Research 22 found **nine of
   ten resume rows wrong**, two producing a dead pane, because a distinction with nowhere to live got
   guessed in a default branch nobody reviewed. An extension API is a far larger surface of places
   for a distinction to have nowhere to live.
2. **It encodes honest ignorance as a first-class value.** `AgentIdCapture` has an
   `{ mode: 'unverified' }` variant; `confidence: 'high'|'medium'|'low'`; `verified:
   'verified'|'partial'|'unverified'`. A registry that can say "I don't know" is a registry whose
   claims can be trusted.
3. **Data selects from a CLOSED set of implementations.** `AgentActivityProfile.native` is
   `'claude-session-registry' | 'pane-title-oracle' | 'shell-keypad'` — three in-tree functions. The
   registry chooses *which*; it can never supply *what*. **That is the line, and it is the whole
   trust model of the recommendation.**
4. **It is closed by a TypeScript union in shared code** (`AgentRegistryId`, 12 literals), which is
   what makes `Partial<Record<LaunchableAgentId, …>>` exhaustively checkable in settings.
5. **It already crosses the process boundary as data.** Four IPC projections serialise it to the
   renderer. The registry is already a wire format, which is most of the distance to a manifest.

### 4.6 S12 — the settings sanitiser is the pattern, and it is already correct

`src/main/settings/store.ts:101-160` is Tortie's existing answer to "untrusted JSON on disk", and it
is the model Tortie Config should copy verbatim:

- unknown agent ids are **dropped**, not errored;
- malformed accelerators are dropped; duplicate chords are dropped (*"one chord, one action"*);
- `launchDefaults` flags are filtered against `catalogedFlags(id)` — an allowlist derived from
  `AGENT_FLAG_PRESETS` restricted to `provenance === 'VERIFIED'`;
- `captureDefaults` stores only `true`, because *"an explicit false is the absence of the key, which
  keeps a hand-edited file from teaching the map a third state"*;
- `scrollbackLines` is clamped, with the reason written down: the value reaches
  `tmux set-option -g history-limit`, so *"a hand-edited settings.json asking for 50,000,000 lines is
  a memory-exhaustion footgun, and it must be caught HERE."*

Closed enums, drop-don't-throw, clamp at the boundary, and a comment naming the hazard. That is
Tortie Config's schema discipline, already written, already tested.

### 4.7 S18/S19 — the two seams that define the durability line

`main/specstory/wrap.ts` is a **command decorator on the durable launch path**: it rewrites launch
*and* resume argv, and **refuses rather than mangles** when it cannot round-trip. It is the most
obviously generalisable seam in the codebase and the most dangerous to open, because whatever is
injected there is written into `manifest.db` and re-executed after a reboot, **possibly with the
injector uninstalled**.

`main/activity/hooks.ts` is the inverse — Tortie extending someone else's agent — and its docblock is
the best-written extension-safety rule already in this codebase:

- *"NOTHING outside gmux's own userData is ever written — not `~/.claude`, not `~/.codex/config.toml`,
  not `~/.zshrc`."*
- *"nothing here may ever be load-bearing. Every path degrades silently."*
- *"`claude --settings <path>` REFUSES TO START when the file is missing… A session's ability to
  start must never depend on a file the app owns."*
- an env kill switch, `GMUX_DISABLE_AGENT_HOOKS=1`.

That last rule is the one an extension system violates first, and the honest note is that
`hooks.ts` **already bakes `--settings <path>` into both argv and the armed resumeArgv**. So the
codebase's actual invariant is narrower than the slogan: *argv may depend on a file Tortie owns and
writes, and must never depend on a file a third party owns.* §6.2 promotes the narrow version to a
law and pays the migration that makes it true.

### 4.8 S22 — the command layer does not exist, and it is the keystone

Three of the four proposals independently reinvented `ui:popupMenu` as their UI substrate. That
convergence is strong evidence the seam is real. It is also evidence that a UI contribution is
**worthless today**: a contributed menu item whose only possible handler is a built-in verb is a
feature with no users, because there is no addressable verb namespace to point it at.

**The command layer is therefore the true prerequisite for any UI contribution — and it is
first-party work with independent value.** Build it for Tortie's own sake (a ⌘K palette, a testable
verb registry, a single place where "reveal this file" is named). If a later rung ever arrives, it
becomes the substrate. If it never arrives, Tortie still got a command palette.

### 4.9 The MCP-is-already-an-extension-system argument

This deserves stating as a first-class finding, because it changes what "Tortie has no extension
system" means.

**Tortie's users already have a working, standardised, well-distributed extension system for the
thing they most want to extend — and it is not Tortie's.** It is MCP, plus Agent Skills, plus the
agents' own hooks. `docs/research/29-context-sidebar.md` measures the substrate: one real standard
(Agent Skills standardises `SKILL.md` + frontmatter and nothing else), eleven bespoke filesystems,
**seven mutually incompatible precedence models**, and — for MCP specifically — an official registry
with namespace-verified publishing.

Three consequences follow.

1. **Most "I want to extend Tortie" requests are actually "I want to extend my agent"**, and the
   correct answer is an MCP server or a skill, which the user can already install and which works in
   every agent they use, not just inside Tortie. A Tortie plugin API would be a *worse* answer to the
   same question: narrower reach, one host, one maintainer.
2. **Tortie's job there is to be a good citizen, not a competitor.** Resolve, show, snapshot at
   launch, never execute. That is Context, and it ships regardless of R31's verdict — it is
   orthogonal work, not a tier of this design.
3. **If Tortie ever needs third-party UI, MCP Apps is already the substrate its users' servers speak**
   (§3.4). Adopting it means a Tortie panel is visible in the same place, under the same rules, as
   every other MCP server — and it means the contribution surface is one Tortie cannot be lobbied to
   widen.

The corollary is the strongest argument in the document for building very little: **the general-purpose
extension mechanism for an agentic shell is already running in every pane.** A user who wants Tortie
to do something new can ask the agent sitting in front of them. What they cannot do is add a
thirteenth agent, retheme the app, or rebind a chord — and those are exactly the three things rung 1
fixes.

---

## 5. The four proposals, and every attack filed against them

Four independent architectures were specified to a common brief. Each was reviewed by three
independent adversaries. **Eleven of twelve reviews returned fatal or critical.** The proposals are
summarised fairly here and the attacks are attached unsanitised — including, and especially, those
against the winner. In a year the losing arguments will be the most valuable part of this document,
because they are the reasons a future round must not re-litigate.

### 5.0 The finding that hit all four, and is therefore not a discriminator

Six of the twelve adversaries independently found the same defect, and I confirmed it by reading the
tree. **An `AGENT_REGISTRY` row is argv, resume_argv and env — and the restore path reads the live
registry rather than the manifest.**

- `src/main/manifest/agents.ts:137-190` — `buildLaunchSpec` composes `spec.argv` from
  `entry.launch.argv`, `spec.resumeArgv` from `entry.resume.template`, `spec.env` from
  `entry.launch.env`; the manifest persists all of it.
- `src/main/tmux/resolve.ts:299-303` — `resolveBinaryAgainst` short-circuits: any input containing
  `/` (tilde first expanded) is returned verbatim if it is an executable file. **A row naming
  `~/Library/Application Support/Tortie/…/bin/agent` never touches PATH.**
- `src/main/restore/restore.ts:63-81` — restore asks the **registry**, not the manifest, for
  `resume.requiresOriginalCwd`, with its own comment explaining why: *"The manifest cannot answer
  this: `AgentLaunchSpec.requiresOriginalCwd` is set at launch and never persisted, so restore has to
  ask the registry."* And the fallback is:

```ts
} catch {
  // An id the registry does not launch has no armed resume to protect.
  return false;
}
```

That `catch` is the conversation-loss path. Any design that lets a user add a row creates a class of
session whose restore correctness depends on a file the user can delete, and whose failure mode for a
pi-shaped agent is — in the registry's own words — *"a SILENT new empty session under the same id."*
That is the Zen's one promise broken quietly.

Because every proposal hits this equally, **it cannot choose between them. It is a precondition.**
It becomes P0 in §7, and it has independent value: the defect exists today for any agent id the
registry stops carrying, extension system or not.

### 5.1 Proposal A — "Patch": a capability-bounded contribution boundary where the protocol is the ABI

**The design.** Third-party code never enters main or either renderer. Every Patch runs inside
`patch-host`, one Electron `utilityProcess` forked from a first-party module in the signed asar;
inside it, each Patch is one `worker_thread` — the thread, not the module, is the unit of trust,
timeout and termination, because V8 has no epoch interruption and `worker.terminate()` is the only
preemption primitive. A Patch is defined by a protocol (Patch-RPC: newline-delimited JSON-RPC 2.0),
not a language: the v1 runner is a **core `.wasm` module with no WASI at all** — no preopens, no
clock, no random, no stdio, four exports and two imports — which is strictly tighter than Zed. A v2
`process` runner speaks the same protocol over stdio. The host holds every handle; the Patch holds
only data. **A Patch never mutates — it returns effects**, drawn from a closed seven-verb vocabulary
(`open-file`, `reveal-in-explorer`, `toast`, `set-view`, `copy-to-clipboard`, `open-external`,
`request-refresh`), each of which the host validates against current state before applying any.
Twenty enumerated refusals, each with a named enforcement mechanism. Trust model: *installation is a
grant, not a blank cheque.*

**Verdict: rejected. 3 of 3 adversaries fatal, one critical.**

**Attacks, verbatim in substance:**

- **The foundational claim misquotes Electron.** The proposal cites the docs as naming
  `utilityProcess` for hosting "untrusted services". I re-fetched the page today: that sentence is
  the description of the **`disclaim` option** — *"the utility process will disclaim responsibility
  for the child process… for purposes of security policies like Transparency, Consent, and Control
  (TCC)"* — i.e. TCC attribution, not confinement. What the docs actually say about the process is
  that `fork` *"creates a child process with **Node.js and Message ports enabled**"*, and the
  complete option list (`env, execArgv, cwd, session, partition, stdio, serviceName,
  allowLoadingUnsignedLibraries, disclaim, respondToAuthRequestsFromMainProcess`) contains **no
  sandbox option**. Tortie's own prior research had already banked this: *"`utilityProcess` is not a
  security boundary either. Node is enabled; it is a crash/memory boundary."*
- **The resource story is provably unimplementable with the chosen primitive, and it was measured.**
  `worker.terminate()` on a spinning core-wasm module: **11 ms, works** — credit where due. But
  `resourceLimits: { maxOldGenerationSizeMb: 32 }` did **not** bound `WebAssembly.Memory`, which grew
  to **1,252 MiB and was never killed**. So the blast radius is the process, not the thread,
  contradicting the proposal's stated unit of containment; one Patch takes all eight, and on a laptop
  with dozens of live sessions it means swap.
- **Five of twenty "can never do" items are refuted by the proposal's own seven allowed verbs.**
  `copy-to-clipboard` defeats "never write to a pty" (the user pastes). `open-external` defeats
  "never make a network request to an unlisted host". `PopupMenuItem.icon` is a 32×32 PNG data URL,
  which defeats "never draw a pixel".
- **A filesystem grant inside a project root is arbitrary code execution, and it lands on the restore
  path.** `src/main/git/exec.ts` spawns the system `git` from main, continuously, for status. Git
  reads `.git/config` from the working tree, where `core.fsmonitor = <path>` makes git **execute**
  that path on every `git status`; `core.hooksPath`, `alias.*` and `core.sshCommand` are the same
  story. And `claude --settings` *merges* with project settings, so writing one
  `<root>/.claude/settings.json` injects hooks into every future launch **and every future restore**
  of every claude session in that project — an artefact that uninstalling the Patch cannot reach.
- **It violates "assemble, never reimplement" at the root.** Patch authors a wire protocol, a runtime
  ABI, a UI toolkit of 11 view primitives, a capability model, a grant UI, a path canonicaliser, a
  quota enforcer, a hash pinner and a copy linter. Not one has an upstream. Meanwhile MCP Apps went
  stable seven months ago and the first-pass R31 draft already named it as the answer for this layer.
- **Shipping a third-party code host before shipping an update channel is not a defensible ordering.**
  The entire enforcement rests on V8's wasm sandbox in a process with full user privileges, in an app
  with **no auto-updater** — `docs/research/27-release-and-updates.md` is a plan. Chrome ships wasm
  sandbox-escape fixes in days; Tortie ships them never.

**What survives:** the **effects vocabulary** — a closed set of verbs, host-validated, each of which
the user could perform themselves in one click. It is the single best idea in the field and it is
grafted into rung 2 (§6.4). Also Zed's path-escape algorithm, adopted line-for-line if scoped
filesystem reads ever exist.

### 5.2 Proposal B — "The Narrow Contract" (`@tortie/api`): a typed SDK with a hard-capped surface

**The design.** Extensions are TypeScript packages against a versioned contract of **at most 60
members**, executed in one Electron `utilityProcess` — the Contract Host — spawned lazily after first
paint and after first restore. Three boundaries in decreasing strength: the process boundary; a
capability router that refuses any call whose capability is not in the intersection of the user's
grant set and the manifest declaration, **default-deny, frozen at install, re-asked on widening**;
and a `node:vm` context per extension, **named as weak in the proposal itself**. Extensions
contribute *descriptions* — a registry row, a view tree in a semantic VDL where no field accepts a
colour, a class, a selector or a pixel; menu items as `PopupMenuItem[]` through the existing
`ui:popupMenu` seam. Twenty enumerated NEVERs. A guardrail test fails the build if any file under
`main/tmux/**`, `main/manifest/**`, `main/restore/**`, `main/attach/**` or `main/specstory/**`
imports the Contract Host.

**Verdict: rejected. 3 of 3 adversaries fatal, one critical.**

**Attacks:**

- **There is no security boundary.** Boundary 1 is the same `utilityProcess` misreading as A: a crash
  and memory boundary sold as a privilege boundary. Boundary 3 is conceded not to be one — Node's own
  docs open with *"The `node:vm` module is not a security mechanism. Do not use it to run untrusted
  code."* Compose them and **the capability router lives inside the attacker's address space**,
  separated from hostile code only by a mechanism the proposal admits is not a boundary. One `vm`
  escape and the extension holds the real `process`, the real `require`, and the transport handle to
  main, and simply calls past the router.
- **CAN #1 and NEVER #5 are the same sentence with opposite signs.** "Contribute an agent-registry
  row as pure manifest data — no code runs" versus "Never influence argv or resume_argv… a
  plugin-owned argv can permanently strand a live session". Per §5.0, a registry row *is* argv. The
  proposal states the reason for its own prohibition and then grants the thing.
- **The NEVER list is not closed under the capabilities granted.** `exec` and `fs.read` transitively
  void at least five refusals, including "never touch `manifest.db`" (it is a file) and "never read
  what a human typed into a session" (scrollback snapshots are files).
- **The maintenance premise is falsified by this repo's own churn.** A 60-member cap is a promise
  about the future made by a codebase that accreted 35 APPENDED blocks and a nine-level alias ladder
  in its *internal* contract across 17 phases.
- **The Zen names extensions in its refusals**, and this proposal is the exact species refused.

**What survives, and it is more than any other loser contributes:**

1. **The VDL discipline generalised to schemas**: *every property is semantic, and there is no field
   that accepts a colour literal, a class name, a selector, a pixel, or a `var()` chain.* This is a
   stronger guarantee than G3 gives first-party code, because it is enforced by the **absence of a
   field** rather than by a lint.
2. **Default-deny with an install-time grant, frozen thereafter, re-asked on any widening** — the
   correct inversion of Zed's verified default-allow-everything.
3. **The honesty about `node:vm`.** Saying plainly what a mechanism cannot protect is a design
   deliverable, not a caveat. bb does not do this; pi does. Tortie will.

### 5.3 Proposal C — "Peers, Not Plugins": agent-native extensibility

**The design.** *"Tortie's process boundary is its trust boundary."* Three tiers named for what they
physically are. **Tier P (Peers)** — third-party code as its own OS process speaking a protocol
Tortie did not author: argv + env + exit code + stdout in v1, MCP and ACP deferred. Trust model
stated without euphemism: *the OS is the sandbox, and it is a weak one*; the confirm modal says so in
those words. What Tortie genuinely owns is enumerated and honest — separate process, killable via
`runGuarded`, visible in `ps` and in its own Context row, time-bounded at 5 s with a 1 MiB output cap,
and off the durable path. **Tier O (Overlays)** — schema-validated JSON adding rows to registries
Tortie already ships as data. **Tier F (Files the agents own)** — skills, hooks, MCP configs: *"not
Tortie's extension system — they are the agents', and Tortie is a citizen of them."* Twelve
structural refusals. Three trust states, and **a file appearing on disk is never `enabled`**.

**Verdict: closest runner-up, and genuinely the same design one stage further along. 3 of 3
adversaries fatal.**

**Attacks:**

- **Tier O is not inert, and it has *more* durable power than Tier P with *none* of Tier P's five
  controls.** Per §5.0. Tier P gets a confirm modal, a deadline, an output cap, pid ownership, `ps`
  visibility and exclusion from the durable path. Tier O gets none of them, **plus** persistence,
  **plus** post-reboot re-execution, **plus** survival of uninstall because the argv is already in
  `manifest.db`. The design inverted its own risk ordering, and the tier it ships first is the
  dangerous one.
- **Refusals 2, 3 and 11 are each false against the tree.** Rule 2 forbids contributing argv; Tier O
  contributes argv on day one. Rule 3 says restore never reads the extension set; `restore.ts:23`
  imports `getLaunchableEntry` and calls it at :74 and :87. Rule 11 says nothing survives uninstall;
  a manifest row with an overlay's argv does, and its failure is silent.
- **"The process boundary IS the trust boundary" is false as stated.** The durable state is not
  behind a process boundary — it is `<userData>/gmux/manifest.db` and a socket, both writable by any
  peer running at the user's uid **by design**. Rules 2, 3 and 11 are therefore policy, not
  structure, which is the exact thing the proposal claims to have eliminated.
- **A peer is a persistence mechanism for prompt injection.** Enable state lives in Tortie's settings
  store and is "never writable by an overlay" — true and irrelevant, because it is writable by a peer.

**What survives, and three of these are grafted into the recommendation:**

1. **"The process boundary IS the trust boundary", stated without euphemism**, is exactly the right
   register for a confirm sheet, *provided the sentence is "this runs as you, with your files and
   your credentials; Tortie does not sandbox it"* rather than a capability-theatre checklist.
2. **"Rendered results, not rendered components"** — the best single idea in the field and the escape
   valve rung 1 lacks. A peer returns *content*; Tortie renders it with renderers it already ships
   (the markdown pipeline, Pierre for diffs, Monaco for files). The output surface is an **editor
   tab** — `EditorMode` gains one first-party arm — not a panel. No new chrome, no new layout, no new
   focus rules, no new empty states, and the third party is never in the render path so it cannot
   regress a frame.
3. **MCP Apps as the only future interactive-UI substrate**, with C's three written build criteria
   kept, plus two corrections C's own security adversary supplied and which must be in the spec
   before anyone builds it (§6.5).

### 5.4 Proposal D — "The Closed World": configuration, not code

**The design.** No extension at any tier: no plugin noun, no host, no SDK, no install verb. Widen the
declarative tables Tortie already owns; make the *agents'* extension systems visible through Context;
engineer the fork as the escape hatch. **The boundary, in one sentence: configuration SELECTS; code
SUPPLIES; Tortie accepts selections and never suppliers** — generalising
`AgentActivityProfile.native`, where the row chooses *which* of three in-tree functions and can never
supply *what*. Three trust zones: the compiled world (absolute, by construction); user configuration
(trusted as the user's own hand, blast radius bounded by schema); project configuration (**the only
genuinely new privilege**, guarded twice — a per-directory trust gate, and structurally by a separate
smaller `ProjectPrefsV1` type with no field that can carry argv, a binary, an env var or a path).
Twenty-two enumerated refusals. Configuration is read at boot, on explicit reload, and on a watcher
debounce — **never on the session-create path and never on the restore path**.

**Verdict: WINNER — the spine, not the text. 2 of 3 adversaries fatal, and the tiebreaker lens
declined to kill it.**

**The attacks, unsanitised — this is the part that matters in a year:**

- **[FATAL, security] The boundary sentence is refuted by the proposal's own item 10.**
  *"Configuration SELECTS; code SUPPLIES"* versus, forty lines later, *"User scope may define an
  agent row's argv."* An argv **is** the supplier; `execvp(argv[0], argv)` is the most direct
  code-supply primitive on the machine — strictly more direct than a WASM module behind a capability
  check. The boundary holds for exactly one field it cites and is then abandoned for the field that
  matters. And refusals 1–6 forbid execution "in Tortie's main process / renderer / worker", which is
  a careful and unstated narrowing: **the design never forbids configuration from causing execution
  on the user's machine, which is the thing that actually costs them their work. The list is drafted
  around the wrong verb.**
- **[FATAL, security] The threat model omits the only adversary this product uniquely has: the
  agent.** Zone 2 is justified as *"same trust as `~/.zshrc`: the user wrote or reviewed the file."*
  That is a category error and it is the single most important sentence in the review. Every
  precedent cited for that posture — Obsidian, pi, VS Code, Zed, Raycast — has a **human** as the only
  routine writer of its config. Tortie runs dozens of concurrent, prompt-injectable agents under the
  same uid with write access to `$HOME`.
- **[HIGH, security] The escalation chain exists today, before any extension work.** `settings.json`
  is plain user-writable JSON with an atomic-rename write and no integrity check →
  `launchDefaults[agentId]` holds persisted flags → `dangerAcknowledged` skips the confirm modal by
  key → `presets.ts:11-12` documents that hotkey quick-create takes `defaultLaunchArgsFor(id)` with
  **no modal** → `integration.ts:42` passes it to `sessions.create({extraArgs})` → extraArgs land in
  both `argv` and `resume_argv`.
  **Correction, measured by me and stated because the record must be accurate:** the chain is real
  but **narrower** than reported. `sanitizeSettings` filters `launchDefaults` against
  `catalogedFlags(id)` — an allowlist of that agent's `provenance === 'VERIFIED'` presets — so an
  injected agent **cannot** inject arbitrary argv through settings.json. What it *can* do is
  pre-enable a **cataloged danger flag** (`--dangerously-skip-permissions`,
  `--dangerously-bypass-approvals-and-sandbox`) and add its key to `dangerAcknowledged`, so the next
  hotkey press launches with the sandbox off, durably, with no modal. That is a smaller hole and a
  real one. **It is a bug to file this week, independent of R31**, and the existing sanitiser is
  simultaneously the reason it is small and the template for fixing it.
- **[FATAL, durability] The durability law is already false.** *"Configuration is NEVER read on the
  restore path"* — `restore.ts:23` imports `getLaunchableEntry`; the moment `agents.json` merges into
  that registry, restore reads user configuration. There are exactly two exits and the proposal does
  not notice the fork in the road: **(a)** user rows participate in restore, and the stated law is
  fiction; or **(b)** user rows are materialised into the manifest at create time, which is correct
  and **violates the proposal's own prohibition #8** ("configuration is not persistence; a config
  file has no state") and requires a schema migration the proposal claims never to need.
- **[FATAL, durability] The fork as escape hatch is the most dangerous mechanism in the document.**
  A forked Tortie run against the same `<userData>/gmux/` writes the same `manifest.db` and drives
  the same `-L gmux` socket, with none of the invariants the fork's author has read.
- **[MAJOR, maintenance/Zen] Three headline claims are false against the working tree**, and the two
  choices that distinguish D from a generic config answer — refusing hooks outright, and naming the
  fork as the escape hatch — are the two the reviewer judged **wrong**. The verdict was nonetheless
  *not fatal*, and the reasoning is quoted because it is the tiebreaker doing its job: *"Marking it
  fatal would push the decision toward a code-hosting design that fails the Zen far harder."*

**Why it still wins.** Its two fatals reduce to (a) the shared registry/restore defect, which is a
**prerequisite for all four** and now P0, and (b) the fork paragraph, which is fixed by **deleting
one paragraph**. Every remaining repair is a subtraction or a small addition. No other proposal's
fatals had that property: A's require a different isolation primitive, B's require a real sandbox,
C's require inverting its own tier ordering. **D's spine is the only one of the four that survives
its own attacks.**

### 5.5 What the four proposals converged on, and what that means

Three of four independently reinvented `ui:popupMenu` as their UI substrate (§4.8 — the seam is real,
the contribution is worthless without a command layer). All four independently required the manifest
to become restore-complete (§5.0 — a prerequisite, not a feature). Three of four independently
concluded that *any* interactive third-party UI should be MCP Apps rather than a Tortie API. And
every one of the four, in its own vocabulary, arrived at the same primitive: **third parties supply
data or run as programs; the host owns every pixel and every handle.** The disagreement was only ever
about how much machinery to build around that primitive. The answer this document gives is: **the
least that is honest.**

---

## 6. The recommendation in full — Tortie Config

### 6.1 The architecture

There is no extension object, no host, no SDK, no lifecycle, no install verb, no uninstall path, no
version negotiation and no plugin manager, because there is no plugin. There is a **config
directory** and a **merge function**.

```
<userData>/gmux/config/            ← user scope. Trusted as the user's own hand,
  agents.json                        with a human-confirm gate on execution-bearing fields.
  themes/<name>.json
  keymap.json
  assets/<agent-id>.svg

<project>/.tortie/                 ← project scope. Inert until the project is trusted,
  project.json                       and structurally incapable of causing execution.
```

Three zones, and the trust argument for each is different:

1. **The compiled world.** Everything in `src/`. Signed, notarised, one authorship. The only place
   code lives. Enforced by a test (G4 below) rather than by memory.
2. **User configuration.** JSON under `<userData>/gmux/config/`, validated against narrow
   hand-written schemas. The blast radius is bounded by the schema, and the schema's fields are
   closed enums wherever a value selects behaviour. Where a field *is* execution-bearing —
   `binaries`, `launch.argv`, `resume.template`, `versionProbe`, `launch.env`, `idCapture.argv` — a
   **human confirms it once, out of band of any agent turn**, and the confirmation is bound to a hash
   of that row (§6.3).
3. **Project configuration.** A separate, smaller type — `ProjectPrefsV1`, **not** a filtered view of
   the user type — carrying sidebar section order, the project's default agent chosen from agents
   *already installed and confirmed*, search excludes, and the tab colour. It has no field that can
   carry argv, a binary name, a resume template, an executable path, an env var, or a filesystem path
   outside the project. A cloned repository cannot cause a process to start. It is additionally inert
   until the project is trusted once, explicitly.

**The merge.** `built-in registry < user overlay < project overlay (presentation only)`. Unknown ids
create rows; known ids patch fields. An invalid row is **dropped whole**, never merged partially, and
surfaces as a visible badged error naming the field and the reason — never a silent drop, never a
crash. This is the settings sanitiser's discipline (§4.6) applied to a second file.

**When it is read.** At boot, on an explicit "Reload configuration" action, and on a watcher debounce.
**Never on the session-create path. Never on the restore path.** §6.2 is what makes that sentence
true rather than aspirational.

### 6.2 The boundary, stated exactly

> **Configuration selects from choices the compiled world already contains, or names an executable
> the user has personally confirmed. Tortie never accepts an implementation, never accepts a
> component, and never accepts a value it has not validated against a closed set — and every value
> the restore path will ever need is copied into the manifest at create time, so a session's
> recovery never depends on a file that can be deleted.**

Four clauses, each with a mechanism.

**(a) Selection, not supply.** `activity`, `resume.strategy`, `imageDrop`, `multilineKey`,
`idCapture.mode`, `specstory.provider` are closed unions over in-tree implementations. An unknown
value is not an error and not a guess — the row loads with that facet degraded to the honest default
and the row is **badged `unverified` in the UI**, reusing the registry's existing honesty vocabulary.

**(b) Execution-bearing fields are confirmed by a human, once, against a hash.** This is the control
that answers the agent-adversary finding, and it is the one genuinely new mechanism in the design.
The execution-bearing subset of `agents.json` is hashed; a row whose hash Tortie has not seen
confirmed is **loaded as data and refused for launch**, showing an "Enable <name>" affordance that
opens a sheet stating what will run. Changing an execution-bearing field re-arms the gate. Changing a
presentation field does not. This is Zed's two-key model with the default inverted, applied to the
one thing that matters.

**(c) The manifest becomes restore-complete (P0).** `requiresOriginalCwd` — and any other registry
field the restore path reads — is **persisted into the manifest row at create time**. `restore.ts`
stops importing `getLaunchableEntry` for correctness-bearing data and reads the manifest. The
`agentDisplayName` lookup may stay registry-backed, because it is cosmetic and its fallback (`return
agent`) is honest. **This is P0 because it is the only clause that makes clause (d) enforceable**, and
because the defect it fixes exists today.

**(d) Uninstall is total.** Because the manifest is complete, deleting `agents.json` cannot change how
an existing session restores. The row's argv was copied at create time and lives where every other
session's argv lives. A session created by a config row and a session created by a compiled row are
byte-identical in the manifest, and restore cannot tell them apart — **which is the point.**

**(e) The tmux layer, the manifest and the create/restore paths gain no reader of config.** Enforced
by G4: a test that fails the build if any file under `main/tmux/**`, `main/manifest/**`,
`main/restore/**`, `main/attach/**` or `main/specstory/**` imports the config module.

### 6.3 What configuration can never do

Enumerated, and each is enforced by the absence of a field or by a named test — not by policy.

**Execution**
1. Never run code in main. No `jiti`, no `vm`, no `require` of a user path, no native addon.
2. Never run code in either renderer. `script-src 'self'` stays in both HTML entries forever, and a
   test asserts the literal string.
3. Never run code in a worker, a `utilityProcess`, or a Blob-URL worker.
4. Never load WebAssembly authored outside the bundle.
5. Never evaluate a string as code in any language, including CSS `expression()`, `url()`, a `var()`
   chain, or `@import` inside a theme value.
6. Never cause a process to start without a human confirmation bound to the exact bytes that will
   run. *(This is the refusal the winning proposal was missing.)*

**Process, socket, store**
7. Never open, address or name a tmux session. No socket string, no `-L` value, no session id, no
   pane id, no `send-keys`.
8. Never read or write `manifest.db`. Configuration is not persistence.
9. Never write anywhere outside `<userData>/gmux/config/`. Tortie writes config files; nothing else
   does. Never `~/.claude`, never `~/.tmux.conf`, never the project.
10. Never influence `argv`, `resume_argv`, `env` or `cwd` **from project scope**. Enforced by
    `ProjectPrefsV1` being a different TypeScript type, not a runtime filter.
11. Never supply a binary path Tortie has not resolved. A row *names* a binary; Tortie finds it —
    and because `resolveBinaryAgainst` returns any `/`-containing path verbatim (§5.0), an absolute
    or tilde path in a row is precisely what clause (b) confirms.

**Behaviour**
12. Never add a status oracle, resume strategy, capture provider, image-drop strategy or multiline-key
    behaviour. A row selects from the closed union; it cannot extend it.
13. Never change how "needs input" is computed. `CLAUDE.md`'s rule — user input to a session may never
    raise that session's own attention flag — is compiled in.
14. Never register an IPC channel, static or template. There is no `plugin:*` namespace.
15. Never subscribe to, emit or observe a Tortie event.
16. Never veto, delay, cancel or observe a lifecycle transition.

**UI**
17. Never add a view, panel, webview, iframe, tab, status-bar item, notification, toast, badge, editor
    decoration, tree decoration or context-menu item.
18. Never supply CSS, a selector, a class name, a stylesheet or a `<style>` block. **No field in any
    schema accepts a colour literal, a class name, a selector, a pixel value or a `var()` chain**
    (grafted from B). A theme supplies **values for existing tokens** and nothing else; unknown token
    names are ignored and counted in Settings.
19. Never supply markup, inline SVG or a DOM node. An agent icon is an image file rendered in an
    `<img>` through the existing `gmux-asset:` protocol in a fixed slot — never inlined, so it cannot
    carry script. (`assets/protocol.ts` already re-checks the extension *after* `realpath`, so a
    `logo.png` symlink to `id_rsa` is refused.)
20. Never reorder, hide, disable, rename or replace Explorer, Search, Source Control or Context in the
    activity bar. Their presence and labels are compiled in. Only the *initial* section order *within*
    a sidebar — an ordering the user can already change by dragging — may be seeded.

**Distribution**
21. Never be fetched by Tortie. No URL install, no git install, no npm install, no registry, no update
    check, no marketplace, no catalog, no "browse".
22. Never have an identity, version, author, enable/disable lifecycle or uninstall path beyond the
    per-row confirm state. There is no plugin object, so there is no plugin manager to build.

### 6.4 The UI story

**Rung 1 contributes no UI at all**, and that is deliberate: an icon in an existing slot, a chord in
an existing chord table, token values for an existing palette, and a section order the user can
already drag. Nothing new is drawn, so nothing new can be drawn badly.

**If rung 2 is ever earned, the UI story is "rendered results, not rendered components"** (grafted
from C, hardened with A's effects vocabulary):

- A peer returns **content**, not a view tree: markdown, a unified diff, a file path, a table.
- Tortie paints it with renderers it already ships — the markdown pipeline, Pierre for diffs, Monaco
  for files.
- The output surface is an **editor tab**. `EditorMode` gains one first-party arm. No panel, no new
  chrome, no new focus rules, no new empty states, and the third party is never in the render path so
  it cannot regress a frame.
- The only *actions* a peer may request are a closed **effects vocabulary** — `open-file`,
  `reveal-in-explorer`, `toast`, `copy-to-clipboard`, `open-external`, `request-refresh` — each
  validated by the host against current state before any is applied, each something the user could do
  themselves in one click, none touching durability. **The entire write surface of the extension layer
  is one line of enum.**
- Menu contributions, if ever, are `PopupMenuItem[]` through the existing `ui:popupMenu` seam — which
  means the "native menus only, never DOM-drawn" rule holds automatically — and they are **worthless
  until the command layer (S22) exists**, so the command layer is the gate, not the menu API.

**Rung 3, if it ever happens, is MCP Apps implemented to the letter with nothing added.** The value
of adopting the standard is that widening it is not in Tortie's power. Two corrections from C's
security adversary must be in the spike's spec before anyone writes code:

- **CSP is not inherited across a document boundary.** The parent's `<meta>` CSP does not constrain a
  `tortie-app://` child. The protocol handler must **serve** `Content-Security-Policy: default-src
  'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'` with **no `connect-src`**.
  `sandbox="allow-scripts"` stops same-origin access; it does not stop `fetch(…, {mode:'no-cors'})`,
  `new Image().src`, or `sendBeacon`. Without the served header, hash-pinned reviewed HTML is a
  source-exfiltration channel with a review step that provides false assurance.
- **Opaque origins cannot be authenticated.** `allow-scripts` without `allow-same-origin` makes every
  `postMessage` arrive as `origin: "null"`, so the host cannot tell which app sent a tool call.
  Transfer a per-frame `MessagePort` at load time and accept messages only on that port. **Never
  authenticate by origin.**

### 6.5 Distribution, trust and honesty

**Distribution is a file the user puts there.** No fetch, no registry, no store, no browse-and-install.
If a curated list is ever wanted it is an **ACP-Registry-shaped JSON manifest in a repo with SHA-256
pins**, fetched on demand and never browsed — because that is what Zed converged on after paying for
the alternative, and because a store UI is a dashboard with a checkout.

**Authoring is agent-authored, and that is the whole toolchain.** Ship, on disk next to the app and
linked from the docs by absolute path: a **generated JSON Schema** for each config type, **six worked
examples**, and the **conformance test**. Point Tortie's own documentation at those paths the way pi
points its system prompt at `docs/extensions.md`. "Add support for my agent" then becomes a thing the
user's agent does by reading a versioned spec — no SDK, no scaffolder, no bundler, no registry. This
is why pi is 5,346 lines where bb is 35,231.

**And pair it with the confirm gate, because in Tortie the agent that writes the overlay is also the
adversary the overlay must be protected from.** That sentence is the difference between adopting pi's
authoring economics and adopting pi's trust posture. Tortie takes the first and refuses the second.

**Honesty is a deliverable.** Three sentences that must appear in the product, not just the docs:

- On the confirm sheet for an execution-bearing row: *this names a program on your machine and Tortie
  will run it as you, with your files and your credentials.*
- On the project-trust prompt: what trusting does and what it cannot do. (Obsidian's lesson: honest
  copy is part of the mechanism.)
- Wherever a peer ever appears: *Tortie does not sandbox this.* No capability checkboxes implying
  confinement that does not exist.

### 6.6 Versioning

**The overlay types are hand-written, narrow, and deliberately not the internal types.** This is bb's
`ThreadListEntry` rule (§3.1) and it is the single most important structural protection here, because
it is what stops the config door from becoming a `vscode.d.ts` by accretion.

- `AgentOverlayV1` lives in `src/shared/`, carries an explicit `"schema": 1`, and is **not**
  `AgentRegistryEntry`. It omits everything internal: `status`, `confidence`,
  `reconstructionTarget`, `unverified`, `specstory`, `kind` (always `'cli'`), `launchable` (always
  `true`).
- A unit test asserts the mapping from `AgentOverlayV1` onto the internal type, so **drift fails CI
  rather than shipping**. `registry.ts` stays free to change; measured churn on the internal type is
  eight material changes in eight phases, and the overlay type must be free to stay still while the
  internal one moves.
- A new field is `schema: 2` with a converter, never an APPENDED block. This is the G9 lesson applied
  *before* the first appended block instead of after the thirty-fifth.
- `ProjectPrefsV1` is a **separate, smaller type**, not a subset view — so "project scope cannot carry
  argv" is a fact about the type system, not a rule someone can forget in a refactor.

### 6.7 The permanent refusals

Write these into `CLAUDE.md` when this lands, so a later round is held to them the way the
tmux-safety rules bind today.

1. **No third-party JavaScript, TypeScript, WebAssembly or native code executes in any Tortie
   process.** Not main, not the renderers, not the preload, not a worker, not a `utilityProcess`.
2. **No `tortie.d.ts`, no SDK package, no contribution-point registry.** If a proposal begins "we'll
   expose an interface so extensions can…", it is this refusal.
3. **No marketplace, no store UI, no in-app browse-and-install, no update badge, no extension count on
   the activity rail.**
4. **No extension mechanism may implement, replace, decorate or intercept** Explorer, SCM, search, the
   terminal, the tab spine, the manifest, the tmux layer, or Context's own data.
5. **No extension mechanism may set a session's status.**
6. **No third-party native code inside the signed bundle.** It would require
   `com.apple.security.cs.disable-library-validation` app-wide and permanently, against a
   configuration whose current note reads *"ZERO entitlements are needed."*
7. **The main renderer's CSP is never relaxed.** Third-party HTML, if ever hosted, gets its own
   `session` partition and its own served CSP.
8. **Nothing may cause a process to start on a config change alone.** A human confirms the bytes.

### 6.8 Reading the Zen honestly

`ZEN-OF-TORTIE.md:111` lists **extensions** among the refusals, in a sentence with structural search,
replace-in-files, language servers, debuggers and task runners, under the heading *"Not an IDE rebuilt
from scratch."*

That refusal must be read at its own scope, and read honestly in both directions.

**It refuses the IDE extension**: a third-party module that reaches into the editor's guts to add IDE
furniture. That is rung 3 and most of rung 2, and both are deferred. **It does not, and cannot
sensibly, refuse a thirteenth row in the agent registry**, because the agent registry *is* the
product — it sits in the same sentence as "search earns its place because agents rewrite code faster
than a human can track it."

But the Zen binds rung 1 too, in three places that changed the design:

- *"Hide the machinery."* A config file the user must learn is machinery. So the confirm gate is a
  sheet with a sentence, not a permissions matrix; errors are badged rows, not a log to parse; and
  there is no plugin manager because there is no plugin.
- *"Not a dashboard."* No counts, no "3 extensions installed", no health widget.
- *"Anything durability-critical should be boring, inspectable and older than this product."* JSON
  parsed at boot into a table, with the values copied into SQLite at create time, is as boring as this
  gets. A plugin host is none of the three, which is why the tiebreaker lens declined to kill the
  config answer even while finding three of its claims false.

### 6.9 How Explorer, SCM, search, durable sessions, paned projects and Context stay first-class

Mechanism by mechanism. This is the section the operator asked for explicitly.

| Must stay first-class | How the design protects it |
|---|---|
| **Explorer** | No contribution point exists, at any rung. The overlay types have no field that can express a tree, a decoration, a file action or a row. Rung 2 cannot render. Rung 3 renders only inside its own frame, and MCP Apps' seven View→Host methods contain nothing that addresses a host view. Nothing new runs in the renderer, so nothing can slow a keystroke. |
| **SCM** | Same, plus: no mechanism may spawn `git` on Tortie's behalf or write the status-map store. A future peer may run `git` **as its own process** — which is what a shell script does — and SCM learns about it the way it learns about an agent's commit today, through the existing watcher. And the `.git/config` execution vector A's adversary found (`core.fsmonitor`, `core.hooksPath`) is closed at rung 1 by construction: **no config mechanism grants filesystem write access to a project.** |
| **Search** | Untouched. ripgrep resolution, the engine and the store gain no seam. There is no search-provider interface, deliberately — refusing the interface is the protection. |
| **Durable sessions** | The hardest guarantee and the most explicit. **P0 makes the manifest restore-complete**, so restore reads no config and an uninstalled row cannot strand a session. G4 fails the build if `main/tmux/**`, `main/manifest/**`, `main/restore/**`, `main/attach/**` or `main/specstory/**` imports the config module. Config is read at boot, not at create. An invalid row is dropped before it can produce a launch spec. `conformance:resume:capture` (~16 s, no turns) extends to cover overlay rows, so a user's resume template is **executable, not asserted**. And the confirm gate means no row can start a process the human has not seen. |
| **Paned projects** | Nothing addresses the tab spine, the split tree or the layout store. Project scope is trust-gated and presentation-only *by type*, so a cloned repository cannot alter a workspace's shape or start anything. |
| **Context** | Protected by **integration, not separation** — and by scope. Context's job is to show the skills, MCP servers and hooks the **agents** own; it ships regardless of R31 and is not a tier of this design. Tortie Config deliberately grows **no rival hook system**, so the product never has two vocabularies for "things that run when something happens". If rung 2 is ever earned, its peers appear **inside** Context as one more group with the same row grammar, scope semantics and executable-content scan. If rung 3 is ever earned, it arrives as MCP — a category Context already manages. The extension story strengthens Context's thesis instead of competing with it. |
| **Performance** | Rung 1 is JSON parsed once at boot; it cannot touch a frame. No new process, no new dependency, no new IPC family, no CSP change, no entitlement change. The existing CI budgets are unaffected because nothing new runs in Tortie's processes — which is the whole design restated as a performance property. |

The general principle, stated once so it can be enforced: **third-party contributions may supply data
that Tortie's own code reads, or run as programs beside Tortie — never as code inside it, and never
as an implementation of a Tortie surface.**

---

## 7. The staged plan

Costs are engineering estimates for a workflow of the shape `CLAUDE.md` mandates (spec → parallel
builders → integrator → independent verifiers → fix round → commit), not raw line counts.

### 7.1 P0 — Manifest completeness (build first, unconditionally)

**Not an extension feature. A latent durability defect with independent value.**

- Persist `requiresOriginalCwd` — and audit for any other registry field the restore path reads for
  correctness — into the manifest row at create time. Schema migration.
- `restore.ts` reads the manifest for correctness-bearing data. The cosmetic `agentDisplayName`
  lookup may stay registry-backed with its honest fallback.
- **Verification tier 3.** It touches durability and restore. Full battery plus
  `conformance:resume:capture`, plus a real quit-and-restore of a session whose agent id the registry
  no longer carries — the exact case that silently loses a conversation today.
- **Also file this week, separately:** the `dangerAcknowledged` / `launchDefaults` hotkey path
  (§5.4). The narrow fix is that a *danger* preset never auto-applies on a modal-less quick-create,
  regardless of `dangerAcknowledged`; the acknowledgement should gate the modal's friction, not the
  flag's application.
- **Cost:** small. One phase, or a slice of one.

### 7.2 Rung 1 — Tortie Config (the smallest useful v1)

**The smallest useful v1 is one file: `<userData>/gmux/config/agents.json`, user scope only,
launch-and-resume only, behind the confirm gate.** Everything else in this rung is additive and can
land later or never.

| Step | Deliverable | Verification tier | Gate |
|---|---|---|---|
| **C1** | `AgentOverlayV1` in `src/shared/`; generated JSON Schema; six worked examples; `overlay.ts` load/validate/merge; user scope only; the confirm gate and its hash binding; `conformance:agents` | **Tier 3** — touches the agent registry, resume and the launch path, and universality across agents is claimed | full battery **+ `conformance:resume:capture`** (mandatory per `CLAUDE.md` for any commit under `agents/registry.ts` or `manifest/agents.ts`) **+ a per-agent matrix proving a synthetic thirteenth agent launches, resumes and restores across a real quit** **+ an adversarial verifier proving an unconfirmed row cannot start a process** |
| **C2** | The renderer mirror fix. `renderer/state/agents.ts` carries a static mirror of the registry that nothing type-checks; an eleventh launchable agent already needs a renderer edit. A user-supplied thirteenth makes that latent defect immediate. | Tier 2 | gates + one screenshot read |
| **C3** | Theme overlays — values for the 106 tokens, validated against the token list. G3 becomes the thing that *enables* theming rather than merely restraining it. | Tier 2 | gates + screenshot read + a token-coverage test |
| **C4** | Keymap overlays — rebind existing ids only; cannot introduce ids, so G2's single-source test is unchanged. Chords route through `keymapSections(extra)` with a third `KeymapSource`, inheriting collision refusal and `builtInOwner(accel)` messaging for free. | Tier 2 | gates + the existing keymap tests |
| **C5** | Project scope: `ProjectPrefsV1`, the trust gate, the honest prompt copy. | **Tier 3** — a new trust boundary | adversarial verifier: a hostile `.tortie/` must be provably unable to alter argv, name a binary, set an env var or start anything; the trust gate must survive a restart and a project rename |
| **C6** | G4, the import-boundary test; the CSP literal test; the refusals written into `CLAUDE.md` | Tier 1 | gates |

**Cost:** low hundreds of lines of product code plus schemas, examples and tests. Compare 35,231.

**Sequencing note.** C1 must not land before P0. C5 must not land before C1, because the trust gate's
value depends on the confirm gate existing.

### 7.3 Rung 2 — The Peer (deferred behind a written trigger)

**Trigger — all three must be true:**

1. **Three concrete, named requests** exist that rung 1 provably cannot express, from the operator or
   real users, written down with the attempted rung-1 formulation and why it failed.
2. **The command layer (S22) exists** as first-party work, with its own justification, and has shipped
   at least one phase before.
3. **An update channel exists.** `docs/research/27-release-and-updates.md` has shipped, not merely
   been written. Shipping any third-party execution surface before a way to patch it is not a
   defensible ordering, and the same argument that killed proposal A applies here.

**Contract if built, complete in one paragraph — which is the test that it is the right size.** A
peer is an executable named in config, confirmed by a human, spawned through `runGuarded` on a named
trigger with JSON on stdin, a 5 s deadline and a 1 MiB output cap. It returns **content** and a list
of **effects** from the closed vocabulary. It has **no return channel into Tortie's state**: it cannot
render, cannot toast on its own initiative, cannot badge, and **cannot set a session's status**. It
never runs on the create or restore path. It is rate-limited per trigger per session. It appears
inside Context as one more group with the same row grammar. And the confirm sheet says, in those
words, that Tortie does not sandbox it.

**Cost:** moderate, and mostly in the effect validator and the honest UI, not the spawner.

### 7.4 Rung 3 — The Panel (deferred behind written criteria)

Build only when **all** are true:

1. Three concrete panel requests exist that rungs 1 and 2 cannot serve **and that are not dashboards**
   — the Zen refuses counters, feeds and progress theatre regardless of who renders them.
2. MCP Apps has a post-2026-07-28 stable spec and at least two non-authoring hosts ship conformant
   implementations.
3. A spike proves Electron can host it **without touching the main window's CSP**: a separate
   WebContents on its own `session` partition, host-**served** per-resource CSP via
   `onHeadersReceived`, cross-origin double-frame per the spec, `MessagePort`-authenticated
   postMessage relay only, byte-compared main-window CSP before and after.

And when built: **implement the spec, add nothing.** No Tortie-specific `ui/*` method, ever.

### 7.5 What ships regardless of R31

- **Context** (`docs/research/29-context-sidebar.md`) — orthogonal work, not a tier. It is how Tortie
  is a good citizen of the extension systems its users already have (§4.9).
- **The substrate documentation** — a README section, free, and true today. The durable layer already
  lives outside the app: `tmux -L gmux` with the `@gmux-*` options, `manifest.db`, `GMUX_SESSION_ID`
  in every pane's env, the SpecStory transcripts. Anyone can build against it, and Tortie cannot break
  them by accident because those are the exact identifiers `CLAUDE.md` already forbids renaming.
  **Read-only guidance only** — document how to observe, and state that writing `manifest.db` or
  killing sessions Tortie owns is unsupported and will lose work. This is Tortie's libghostty, and a
  refusal is only credible with an alternative attached.

---

## 8. What this explicitly does not do, and the residual risks

### 8.1 What it does not do

- **It does not produce a community.** No marketplace, no gallery, no author economy, no network
  effect. If Tortie ever needs one to survive, this decision is wrong and must be revisited on that
  ground — not on capability grounds.
- **It does not let anyone add a UI surface.** No panels, no views, no decorations, no status items,
  at rung 1. That is a real capability gap and it is deliberate.
- **It does not let anyone change behaviour that is not already a closed enum.** A user who wants a
  *new kind* of status oracle, a *new* resume strategy or a *new* image-drop mechanism must file a
  request against Tortie, not write a file. Rung 1 opens the table; it does not open the
  implementations behind it.
- **It does not solve automation.** "Notify me in Slack when a session needs input" and "stash my work
  when a session exits" are rung 2, deferred. Today the honest answer is that the substrate is
  scriptable from outside (§7.5).
- **It does not add a sandbox**, because it adds nothing to sandbox. If a future round adds a code
  host, every isolation argument in this document must be re-run from scratch — and A's measured
  finding (a 32 MB `resourceLimits` cap did not bound `WebAssembly.Memory`, which reached 1,252 MiB)
  is the first thing that round should read.
- **It does not make Tortie's internals stable.** `registry.ts` remains free to change; only the
  narrow overlay type is a contract.

### 8.2 Residual risks, ranked

1. **The confirm gate erodes.** This is the highest risk, because it is the only control standing
   between an agent-writable file and a launched process, and it is exactly the kind of friction a
   later round will want to remove for convenience. *Mitigation:* it is refusal #8 in `CLAUDE.md`; the
   hash binding makes bypass a code change rather than a settings toggle; and C1's verification
   includes an adversarial verifier that must prove an unconfirmed row cannot start anything.
2. **The overlay schema becomes a public API nobody can break.** The sharpest attack on the winner,
   and the mitigation is structural rather than disciplinary (§6.6). *Residual:* discipline is still
   required to keep `schema: 2` a converter rather than an appended block. The mapping test makes
   drift loud; it cannot make it impossible.
3. **A user's `agents.json` is wrong in a way that costs a conversation.** P0 removes the
   uninstall-strands-restore class. What remains is a row whose `resume.template` simply does not
   work. *Mitigation:* `conformance:agents` and `conformance:resume:capture` make the claim executable
   at ~16 s and no token cost; a row that has not passed is **badged `unverified`, not rejected** —
   the registry's own honesty vocabulary.
4. **Project trust is clicked through.** Users click through prompts; Obsidian's RAT incident required
   exactly that. *Mitigation:* `ProjectPrefsV1` is structurally incapable of causing execution, so a
   clicked-through project trust costs the user a tab colour and a section order, not a process. **The
   type is the control; the prompt is the courtesy.**
5. **Demand turns out to be UI-shaped after all.** If the real want is panels, this document defers the
   answer by two rungs and the operator waits. *Mitigation:* the trigger conditions are written and
   falsifiable, and rung 3's answer (adopt MCP Apps) is already specified so the deferral is a delay,
   not a re-decision.
6. **The command layer never gets built, so rung 2 stays gated behind first-party work.** *Assessment:*
   acceptable — the command layer has independent value and should be justified on its own merits or
   not built at all.
7. **A second maintainer arrives and wants an SDK.** *Mitigation:* §6.7 and this document. The point of
   preserving the losing arguments in §5 is that a future round has to defeat the measured evidence,
   not the summary.

---

## 9. Open questions for the operator, and what was reasoned rather than measured

### 9.1 Questions

1. **Is the thirteenth agent the real motivation?** This is the most load-bearing question in the
   document. If the concrete want is "Tortie should support the CLI I use that isn't in the twelve",
   then **P0 + C1 closes it in one phase and everything else can wait indefinitely.** If the want is
   something else, say what — the whole ladder is calibrated to a demand curve that is roughly nine
   parts table row to one part everything else, and it would change if the curve does.
2. **Should Tortie ever accept configuration the operator did not write?** The design assumes
   "occasionally, and read as source before use". If the honest answer is "no, only mine", then C5
   (project scope, trust gate) can be **struck rather than deferred**, and the confirm gate can be a
   single global acknowledgement instead of per-row hash binding. That is a materially smaller v1.
3. **Themes: v1 or never?** Tortie is committed to one dark identity (`DESIGN.md`). C3 is cheap
   because `tokens.css` is already single-source — but shipping user themes means screenshots, docs
   and the brand stop being one thing. Worth a deliberate yes or no rather than arriving by accident
   through C1's door.
4. **Ratify the refusals (§6.7) as `CLAUDE.md` guardrails?** They are only worth writing if they bind
   later rounds the way the tmux-safety and no-tmux-vocabulary rules do.
5. **Is the fork acceptable as an escape hatch at all?** D named it; its durability adversary called it
   the most dangerous mechanism in the document, because a forked Tortie against the same
   `<userData>/gmux/` drives the same socket and writes the same manifest. This document deletes it as
   a *sanctioned* answer. If the operator wants it back, it needs a userData-namespacing story first.

### 9.2 Measured versus reasoned

**Measured on this machine, 2026-08-12** — re-checkable:

- All Tortie line counts, file paths and code quotations, including `restore.ts:63-81`,
  `manifest/agents.ts:137-190`, `tmux/resolve.ts:299-303`, `settings/store.ts:87-133`,
  `renderer/index.html:8`, `shared/types.ts:503-515`.
- The `launchDefaults` allowlist correction in §5.4 — I read `catalogedFlags` and
  `sanitizeSettings` directly rather than accepting the reviewer's stronger claim.
- bb, Zed and pi line counts, file paths and quotations, from three independent deep reads of the
  working trees.
- Electron's `utilityProcess` option list and the exact wording of `disclaim`, re-fetched today.
- MCP Apps SEP-1865 status (stable 2026-01-26; hosts shipping: Claude web and desktop, VS Code
  Insiders, Goose, Postman), re-verified today.
- The A-proposal adversary's two isolation measurements: `worker.terminate()` at 11 ms on a spinning
  wasm module, and `resourceLimits: {maxOldGenerationSizeMb: 32}` failing to bound
  `WebAssembly.Memory` at 1,252 MiB.

**Reasoned, not measured** — flagged so a future round knows what to re-derive:

- **The demand curve** (§4.9, §9.1). "Nine in ten requests are a table row" is an inference from the
  registry's shape and from what the neighbouring products' users ask for. It is not survey data, and
  question 1 exists because it should be.
- **The cost estimate for rung 1.** "Low hundreds of lines" is an estimate from the shape of the
  existing sanitiser and merge code, not from a spike.
- **The confirm gate's UX.** That a per-row hash-bound confirmation is tolerable rather than annoying
  is a judgement. If it proves annoying, the failure mode is that users disable it, which is the
  worst outcome in the document — so it should be prototyped early in C1, not late.
- **The claim that project scope is structurally safe.** It is structurally safe *given*
  `ProjectPrefsV1` as specified. Whether that type survives contact with real project-preference
  requests is untested, and C5's adversarial verifier exists to find out.
- **That MCP Apps will still be the right rung-3 answer whenever rung 3 is considered.** It is the
  right answer today. The trigger conditions in §7.4 require re-verifying it rather than assuming it.
- **The three-year maintenance projection.** Grounded in Zed's measured 29-month history (ten WIT
  worlds, 5,372 lines of shim) and bb's five-month one, but extrapolated to Tortie's team of one.

---

*Prior art read read-only 2026-08-12: `/Users/gdc/bb` @ `aefe3ea`, `/Users/gdc/zed` @ `b13f6c7`
(v1.17.0), `/Users/gdc/pi` @ `9795d60` (0.84.1). External sources verified live 2026-08-12: Electron
`utilityProcess` docs; Node `vm` docs; Zed `assets/settings/default.json:2166-2170`,
`crates/extension_api/wit/since_v0.8.0/**`, `docs/src/extensions/{capabilities,agent-servers}.md`,
`docs/src/ai/sandboxing.md`; the ACP Registry at
`cdn.agentclientprotocol.com/registry/v1/latest/registry.json` (52 agents) and zed.dev/blog/acp-registry
(2026-01-28); MCP SEP-1865 (stable 2026-01-26) and the 2026-07-28 spec release candidate;
obsidian.md/help/plugin-security; developers.raycast.com; Neovim 0.12.0 (2026-03-29) `vim.pack`; WASI
0.3.0 (2026-06-11). Tortie measurements from the working tree at `main` with a concurrent Phase 18
build present; no file under `src/` was read for state and none was modified.*
