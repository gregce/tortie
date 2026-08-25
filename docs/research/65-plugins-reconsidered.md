# Research 65. Plugins reconsidered, and what the refusals are actually holding

**Status.** Research only, requested by the operator on 2026-08-25. It schedules nothing and
changes no phase. The single deliverable is this document plus one record entry in the backlog.
The operator decides what, if anything, becomes a phase.

**Method.** Six research bands ran over the local tree, over `/Users/gdc/herdr`, over
`/Users/gdc/pi`, over `/Users/gdc/orca` and over the live web, all read only. Every band read
`docs/research/31-extensions.md` and was told that re-running its argument is worthless and that
only new evidence or a changed situation justifies revisiting a refusal. Three adversaries then
attacked the result, one assuming the answer was converging on yes, one assuming it was
converging on no, and one attacking the quality of the research itself rather than either
position. This document is the synthesis. Where the bands disagreed, the disagreement is stated
rather than averaged away. WebSearch and WebFetch were available and were used, and the
`gh` command line was available and authenticated, so most external numbers here are fetched
rather than remembered. Section 10 carries every limit.

**Marks.** A claim marked **measured** was run or read on this machine on 2026-08-25 and names
its path or command. A claim marked **remembered** comes from a model's own knowledge with no
check. A claim marked **modelled** is an inference and the inference is named. Claims taken from
a band without my own re-check are attributed to that band.

---

## 1. The answer

### Correction, added 2026-08-25

**Read this before the answer below it.** After this document was delivered the operator said, in
his own words, "i haven't really launched tortie yet so ...". He is right, and it takes the
headline reason out.

The 4 stars, 0 forks and about 175 downloads are pre launch figures. They measure whether the
product has been put in front of anyone yet. They do not measure whether plugins would work for
it. Using them to predict a post launch ecosystem is a category error, because the thing being
predicted is on the other side of an event that has not happened. Section 10 lists eight things
nobody measured and is unusually thorough about them, and it does not list this one. So the
headline argument rested on a premise that nobody flagged as load bearing.

What falls and what stands:

- **The star ratio arithmetic falls.** One plugin repository per 39 stars applied to 4 stars
  predicts zero plugins, and that prediction is about today's audience rather than about plugins.
  It cannot carry the answer.
- **The claim that "no case in this category went the other way round" is weakened.** It was one
  case, herdr, generalised into a rule about the whole category. One download curve is not a law.
- **The three condition gate from research 31 section 7.3 stands.** It asks for three named
  requests configuration cannot express, a command layer shipped as first party work, and an
  update channel that has shipped. None of those three is an adoption number, so nothing above
  touches it.
- **The three false refusals stand.** Refusals 1, 3 and 6 were checked against the shipping tree
  on this machine and found false there, and a measurement of the tree does not depend on how many
  people have the product.

The rest of this document, being the threat model, the ladder, the herdr and pi readings and the
three things to do instead, is unchanged and was never resting on the star count.

**Research 66 asks the question again with launch as a given.** It assumes Tortie ships and finds
an audience, and it asks what plugin shape would be right then, what would have to be true to
start walking toward it, and which decisions taken now would foreclose it or make it cheap.

**The refusals stand. Do not build a plugin system, and the deciding reason is not security.**
It is that `gregce/tortie` has 4 stars, 0 forks and about 175 downloads across every release ever
(**measured**, `gh api repos/gregce/tortie` on 2026-08-25). herdr produced roughly one plugin
repository per 39 stars. Applying that ratio to Tortie predicts zero plugins, and that is
arithmetic rather than rhetoric. A plugin system is a multiplier, and Tortie does not yet have
the thing it multiplies. herdr's own download curve settles the order of events: it grew from 81
to 2,108 downloads in the seven weeks **before** its plugin system existed. The audience came
first and it made the plugins. Nothing in this research found a single case in this category
where it happened the other way round.

**But the refusals as written are false against the shipping tree in three places, and that is
the finding he should act on first.** Refusal 1 says no third party WebAssembly executes in any
Tortie process and names workers explicitly. `src/main/symbols/worker.ts` is a `worker_threads`
entry point of the main process whose own header says "PURE WASM, and that is the whole reason
this design was chosen", and it loads six grammars plus the runtime from `@vscode/tree-sitter-wasm`
(**measured**). Refusal 3 says no in application browse and install, and
`src/renderer/context/install/InstallSheet.tsx` searches a remote third party catalog, shows a
preview and a risk rating, and installs (**measured**). Refusal 6's surrounding narrative implies
no third party binary ships, and `build/vendor/` holds four. Every one of those exceptions is
good engineering that the operator wrote himself with a gate around it. That is exactly the
problem. **A rule its author routinely and correctly overrides, while quoting it verbatim to
refuse other people's proposals, stops being a boundary and becomes a veto dressed as a
principle.** The next round will either ignore the refusals or rediscover this on its own.

**And research 31 already contains the decision procedure nobody ran.** Section 7.3 defers the
peer behind three written conditions, all of which must be true. Condition 3, an update channel
that has shipped, is now met. Condition 2, a command layer shipped as first party work, is not
met: the only trace in the tree is one comment at `src/renderer/quickopen/parse.ts` reserving the
`>` prefix (**measured**). Condition 1, three named requests that configuration provably cannot
express, is not met and no band found them. **Under Tortie's own written rules the answer was
already no, for reasons that have nothing to do with any refusal, and six bands hunted for
evidence to overturn eight refusals without checking the gate that actually governs the decision.**

**What to do instead, and none of it is a plugin.** Three things, in this order:

1. **Make the words true.** Rewrite refusals 1, 3 and 6 to state what the product enforces, which
   is that the operator chose the exact bytes and pinned them, or a person confirmed them once out
   of band of any agent turn. Do this in its own edit with no plugin question attached, and make
   the replacement narrower than the original rather than broader.
2. **Ship the substrate documentation.** Research 31 promised it twice, called it "a README
   section, free, and true today", listed it under what ships regardless of the decision, and
   wrote that a refusal is only credible with an alternative attached. **Measured: the word
   "substrate" appears zero times in `DEVELOPMENT.md`, `README.md` and `docs/ZEN-OF-TORTIE.md`.**
   The refusal has been running without its own credibility condition for thirteen days. It costs
   one document and it must carry one honest sentence: the tmux socket is a write surface, not a
   read surface, and anything running as you can already drive your sessions.
3. **Build features, not a door.** Two small things earn their place on the measured evidence and
   need no refusal to move: a `kind` field on an already confirmed `agents.json` row so a terminal
   program can open in an overlay instead of becoming a durable session, and a session set format.
   A third, the agent recipe, is the highest value idea anyone produced and it is not ready,
   because nobody established whether the status oracle, the keep map, the context precedence and
   the fold recipe can be expressed as data at all.

**What the narrow shape is NOT.** It is not a plugin API, not an SDK, not a type definition file,
not a contribution registry, not a marketplace, not an index, not a verb an outside process can
call, and not a relaxation of refusal 1, 2, 3 or 8. If any proposal that follows contains the
word "plugin" in its user facing copy, it is not this.

---

## 2. What he asked, and what reopening Phase 23 means

### 2.1 His words

He asked, on 2026-08-25, whether Tortie should support plugins and how it might actually want to.
He said the project initially decided on pure configuration, but that `/Users/gdc/herdr` and
`/Users/gdc/pi` support plugins to great success, and that this is "not to make vscode and the
like." He wants deep research on the pros and cons, how plugins work elsewhere, the distribution
model, and what it might unlock for Tortie "to really take off."

### 2.2 The one place the existing refusals are aimed at a different target

`docs/ZEN-OF-TORTIE.md` refuses extensions exactly once, and it refuses them as furniture:

> **Not an IDE rebuilt from scratch.** Search across projects earns its place, because agents
> rewrite code faster than a human can track it. Structural search, replace-in-files, language
> servers, debuggers, task runners and extensions do not.

He is explicitly not asking for that. So the Zen's refusal is not aimed at the thing he pointed
at, and that is a real opening. It should be on the record before anything else in this document,
because it is the only place where reopening is warranted by the question rather than by the
evidence.

### 2.3 What reopening Phase 23 costs

Phase 23 is not a paragraph. **Measured**, from the tree today: `src/main/config/` is 3,578 lines
across ten modules plus 2,696 lines of tests, `src/shared/agent-overlay.ts` is 874 lines,
`resources/config/README.md` is 504 lines with a 281 line schema and seven worked examples,
`src/main/config/seal.ts` binds an approval to a macOS keychain item under Tortie's own signing
identity, and six named refusals are asserted against the **shipped bundle** by
`build/assert-bundle-refusals.mjs`, which is 1,820 lines. `src/main/machines/confirm.ts` is a
second confirm gate for a second domain with its own conformance gate and a deliberate refusal to
share the field type, with the reason written down.

That is the state of the thing being reopened. It works, it is proven by driving the real
application, it has been generalised once, and its trap was found in advance. **Reopening Phase
23 does not mean reopening a decision. It means proposing to spend that.**

---

## 3. What has actually changed since research 31, and it is less than it looks

`docs/research/31-extensions.md` was committed on 2026-08-12 in `0cb494a` and has **never been
amended** (**measured**, one commit in its history). Today is 2026-08-25. The permanent refusals
are thirteen days old, and `git log --oneline --since=2026-08-12 | wc -l` returns **415**
(**measured**).

So the honest test is not what changed in the world. Almost nothing did in thirteen days. The
test is what research 31 failed to look at, and what Tortie itself did in the meantime.

### 3.1 The scoreboard, honestly kept

The eleven fatal reviews were filed against four specific architectures. Here is what happened to
each killing argument. The prior art band produced the first version of this table and I have
corrected two rows.

| Killing argument | Status on 2026-08-25 |
|---|---|
| A `utilityProcess` is not a security boundary | **Unchanged.** Electron's own documentation still describes Node and message ports enabled, and no sandbox option |
| A memory limit does not bound `WebAssembly.Memory`, so the thread is not the unit of containment | **Unchanged** |
| The seven allowed verbs refute five of the twenty refusals | **Unchanged** |
| A filesystem grant inside a project root is arbitrary code execution through git configuration | **Unchanged** |
| Nothing in the design has an upstream to adopt | **Weakened.** Orca and herdr are now readable, and several mechanisms exist in Tortie's own tree |
| No way to patch what you ship | **Retired.** The updater shipped, `src/main/updates/` is twelve modules, and Orca demonstrates a signed remote revocation list as a second answer |
| `node:vm` is documented by Node as not a security mechanism | **Unchanged** |
| A registry row is argv, so the proposal grants the thing it forbids | **Unchanged, and now answered by the confirm gate** |
| The refusal list is not closed under the capabilities granted | **Unchanged** |
| A capped public surface is a promise this codebase cannot keep | **Strengthened.** The tree tripled and took 415 commits in thirteen days |
| The inert tier has more durable power than the process tier | **Fixed as a precondition.** Phase 21 completed the manifest, which all four proposals required |
| Three of the peer proposal's own refusals were false against the tree | **Fixed by the same precondition** |
| The process boundary is not the trust boundary, because the database and the socket are writable at the user's own account | **Still true, and it is not an objection to a plugin.** See section 3.2 |
| A peer is a persistence mechanism for prompt injection | **Live. This is the only surviving objection to the deferred peer shape** |
| The refusal list is drafted around the wrong verb | **Retired by refusal 8 and the confirm gate, both shipped** |
| The threat model omits the agent | **Answered by the sealed gate, twice** |
| The escalation chain exists today | **Retired by the Phase 18.5 seal** |
| Configuration is read on the restore path | **Retired by Phase 21** |
| The fork is the escape hatch | **Retired, the paragraph was deleted** |

**Two things must be said about this table and neither is comfortable.**

First, **almost everything retired was retired because Tortie built the fix, not because the
argument was wrong.** Every argument about isolation stands exactly where it stood. Second, and
this cuts the other way, **Tortie repaired six of its own document's findings in thirteen days.**
That is the measured repair rate of this codebase against this document, and it is evidence that
what remains is repairable rather than permanent. Both readings are true and the operator should
hold both.

### 3.2 The count that everyone repeated is wrong

`CLAUDE.md` says "The single line that ended all of them is the first refusal." **That is false
for five of the eleven fatal reviews.** Proposals C and D do not run third party code in any
Tortie process. C's whole design is a separate operating system process and D has no code at all.
Refusal 1 cannot have killed them. Their fatals were the tier inversion, three of C's own
refusals being false against the tree, the false slogan about the process boundary, a peer being
a persistence mechanism for injection, the wrong verb, the agent adversary, the escalation chain,
the restore path and the fork.

So the real breakdown is six fatals against designs that load code in process, and five fatals
against designs that already obey refusal 1. Do the subtraction against the shape everyone now
wants, which is a manifest naming a subprocess, and **the live objection list is one item long**,
being that a subprocess started on a trigger is a way for something that is not a person to cause
a process to start. That is refusal 8, and it is the one research 31 ranked as residual risk
number one on the explicit ground that a later round would come for it for convenience.

Thirteen days later, a later round arrived at exactly that refusal, by convenience, having found
the other seven either irrelevant or already satisfied. **The prediction was correct, and the
arrival itself is data.**

### 3.3 The four things that genuinely changed

**One. The cost picture moved by a factor of ten, and the number that carried the argument
measures nothing.** Research 31 compared against bb, an in process TypeScript SDK at 35,231 lines,
and called it 43 percent of everything Tortie had ever written. Tortie is now 265,117 non test
lines across 915 files (**measured**), so the same ratio is 13 percent. But the right comparator
is not bb. herdr's plugin host is about 2,926 lines of Rust plus a 1,269 line index worker, which
is 1.1 percent of Tortie today. Nobody in the 2026-08-12 review was shown 1.1 percent. They were
shown 43 percent. **That said, dividing another product's subsystem by this product's total
answers no question in either direction, and the tripling happened because one person wrote 415
commits in thirteen days, which means lines of code are not a measure of maintenance capacity.**

**Two. The deferred peer's mechanism is already built, for a first party purpose.**
`src/main/overview/fold/` holds `recipes.ts`, `compose.ts`, `spawn.ts`, `validate.ts`,
`scheduler.ts` and `readers.ts`. A binary resolved to an absolute path, run through the guarded
spawn helper on a named trigger, with a deadline, reaped by process group, its output parsed and
painted, chosen by the person through the confirm gate. That is the expensive part of rung 2 and
it exists. **What does not exist, and it is the whole difference, is a third party supplying the
recipe and the parser.** `readers.ts` is first party code and `spawn.ts`'s own header says there
is no HTTP client in that directory and there never will be one.

**Three. Two competitors built things research 31 did not see.** herdr shipped a plugin system on
2026-06-14 that violates none of the eight refusals, and it reached about 800 plugin repositories
in ten weeks. Orca built the design research 31 rejected, in Electron, with a per plugin forked
host, a closed seven kind capability set, a consent fingerprint, a content integrity hash and a
signed remote kill list, at 19,106 lines, and **still labels plugins experimental** at
`src/renderer/src/components/settings/plugins-search.ts:5`. The kill list is a mechanism research
31 does not contain anywhere and is a real answer to "you can never patch it".

**Four. The one genuinely new external fact points against relaxing anything.**
CVE-2026-70601, patched 2026-08-05, is a context isolation bypass by `Function.prototype.bind`
hijacking in which an attacker with script execution in a **sandboxed** renderer obtains the full
capabilities of the preload, including its IPC channels. Tortie is on Electron `^43.3.0` and is
not exposed. But the primitive any renderer plugin host would stand on failed three weeks ago,
and the prize for breaking it was exactly what Tortie's preload holds, being 204 channels, one of
which types arbitrary bytes into any live agent session. This is **remembered from the threat
model band's fetch** and I did not re-fetch it.

### 3.4 What did not change, and it is the largest part

Every argument in research 31 about isolation inside a process is untouched. A `utilityProcess` is
still not a boundary. `node:vm` is still documented by Node as not a security mechanism. A
sandbox whose guest may launch a program still has no boundary at the moment that matters. And
Tortie is still the one product in every table in section 4 whose configuration is routinely
written by prompt injectable agents rather than by a human.

---

## 4. How plugins work elsewhere

The unit, the trust model, the distribution and the bill. Compiled from the field band's fetches
on 2026-08-25 and not independently re-fetched by me except where marked.

### 4.1 Editors and application platforms

| System | Unit | Trust | Distribution | Thriving | The bill |
|---|---|---|---|---|---|
| VS Code | JavaScript in a separate extension host process, plus declarative contributions | Trust the author. Publisher verification, some scanning, no sandbox | First party marketplace, plus Open VSX for forks | Yes, by far the largest | The heaviest in the survey. Once an API ships it cannot easily change, which is why the whole proposed API machinery exists. In 2026 alone: the Nx Console extension with 2.2 million installs compromised and about 3,800 internal repositories exfiltrated, two AI extensions with 1.5 million combined installs exfiltrating developer files, and GlassWorm self propagating across at least 145 Open VSX extensions in two waves |
| Cursor | Inherited VS Code unit, unchanged | Marketplace proxy runs automated malware analysis | Open VSX | Yes, but borrowed | It pays a cost it did not choose. Microsoft's own extensions are not on Open VSX, so it ships first party replacements, and in January 2026 several VS Code forks were found recommending extensions that do not exist in Open VSX, an open door for name squatting |
| Zed | WebAssembly module against a WIT world, authored in Rust | Real sandbox, two key grant for process execution. Store entries unsigned | A pull request into the vendor's repository | Middling. 1,442 entries on main today | Ten concurrent WIT worlds and 5,372 lines of pure compatibility shim against about 23,000 lines of host. And it **removed** the category closest to Tortie: agent server extensions were deprecated at v1.5.0, and as of 2026-06-02 support was removed and installed ones migrate to the ACP Registry |
| Obsidian | JavaScript loaded into the app | Trust the author, Restricted Mode on by default. The vendor says it cannot reliably restrict plugins | Reviewed community store | Yes, large and long lived | On 2026-04-14 Elastic published REF6598: attackers used the legitimate Shell Commands and Hider plugins plus a shared vault to deliver a remote access tool on Windows and macOS. **No vulnerability was exploited. The intended feature was the whole attack** |
| Raycast | Node and React inside Raycast's runtime | A human review desk, no isolation | Reviewed public monorepo | Yes, over 2,000 extensions | A permanently staffed review desk paid out of subscription revenue |
| Sublime Text | Python module inside the editor | Trust the author | Package Control | Alive but stale | Twelve years on, still paying to move a Python version because packages are bound to it |
| Neovim | Lua or Vimscript in process | Trust the author | Git repositories plus a manager | Yes, the most vital community ecosystem here | Configuration bankruptcy and manager churn. The 2026 direction is the vendor absorbing the mechanism, with `vim.pack` in core |
| Figma | JavaScript in QuickJS compiled to WebAssembly, UI in a separate origin frame | Sandbox plus review | First party store | Yes | An entire second JavaScript engine, adopted after an earlier sandbox failed security review |

### 4.2 The terminal family, which is Tortie's own and which research 31 barely looked at

| System | Unit | Trust | Distribution | Thriving | The bill |
|---|---|---|---|---|---|
| tmux through TPM | A shell script calling the tmux command line | None at all | A list of git repository names in a config file | Yes, for about eighteen years, and the largest in the category | **Almost nothing.** tmux never wrote a plugin API. Plugins drive the command line it was already committed to |
| Zellij | WebAssembly module over Protocol Buffers, able to draw | Real sandbox, plugins cannot crash the multiplexer | Files, URLs, plus a manager | Smaller than tmux and growing | A WebAssembly runtime, a protobuf contract and a Rust toolchain for authors. Its curated list holds 88 plugins after about four years |
| kitty | Python programs the terminal runs | Trust the author | None | Modest but real | Low. The unit is a program |
| iTerm2 | Python scripts outside the app over a websocket | The user grants API access per script | None | Small | Low. The earlier example of the API being a socket rather than a module |
| Warp | MCP servers plus YAML themes | The user's own machine and config | The user's own MCP configuration | The extensibility is real, the plugin ecosystem does not exist | Nothing frozen. Its 2026 answer to extend me is a subprocess speaking a protocol somebody else specified |
| Ghostty | None | Not applicable | None | Not applicable | See section 4.4 |

### 4.3 The agent family

| System | Unit | Trust | Distribution | Thriving | The bill |
|---|---|---|---|---|---|
| Claude Code | A directory of markdown skills and commands, a hooks file whose entries are shell commands, and MCP subprocess declarations. **No third party code loads into the Claude Code process** | Trust the author, plus a local blocklist file naming plugins with a reason | A marketplace is a GitHub repository, and a known marketplaces file maps a name to a repository. Anyone can be one | Yes. The official catalog holds 289 entries from 127 authors including Google, SAP, Amazon Web Services, Grafana, Shopify and Oracle | Very little frozen. The contract is a directory layout and a hook name list. Twelve of the 39 first party plugins are language server plugins whose whole content is a subprocess declaration |
| herdr | A directory with a TOML manifest. Every entry point is an argv array | None, stated openly. Install shows a preview and asks, and a flag skips it | A GitHub topic and a 30 minute cron | Yes, about 800 repositories in ten weeks | See section 5 |
| pi | A TypeScript module in the same isolate, with terminal drawing, custom tools, event interception and hot reload | A project trust prompt that gates loading and not execution | npm, git, URL or a path in settings, plus a catalog page | About 5,400 published packages, top one at 590,228 monthly downloads | See section 5 |
| bb | TypeScript loaded into the server process and the host React tree | Installation is total trust | Bundled in the app | It built a marketplace table on 2026-07-13 and dropped it on 2026-07-15 | 35,231 lines with a 13,551 line public type file at version 0.4.1 |
| Orca | A forked host process per plugin worker, closed capability set, consent fingerprint, content hash, signed kill list | The strongest in the survey | Public and private catalogs | **Still labelled experimental** | 19,106 lines |

### 4.4 The ones that died, and what killed them

| System | What it had | What happened |
|---|---|---|
| Sourcegraph extensions | A real API, samples, a public registry | Deprecated. After September 2022 no new extensions on the public registry, and **the top four became native product features** |
| Atom | A large ecosystem and its own package manager | Announced sunset 2022-06-08, archived 2022-12-15. The ecosystem did not save the host |
| Arc Boosts | A customisation platform with a builder | The legacy builder is deprecated. Existing Boosts run but cannot be edited |
| Firefox legacy add-ons | The most powerful browser extension model ever shipped | Killed outright at Firefox 57 so the host could ship multiple processes. The purest example of an extension API blocking the host's own engineering |

**The pattern across the four is one sentence. The plugin system does not save a product, and a
product that is working does not need one to survive.**

### 4.5 The refusers, and whether the refusal held

Ghostty's position is not in its about page. It is in discussion 2353, open since 2023-10-01 and
still unanswered as of April 2026. Its author's stated reasoning is to avoid one solution that
tries to do everything, and on the traditional route of driving a terminal by escape sequences:
escape sequences can be sent by many sources, including by printing a file, so allowing them to
change configuration or windowing is very frightening, and the security story has always been the
blocker.

**The refusal held on scripting inside the process, and did not hold on extensibility itself.**
Ghostty's answer converged on the same place as Warp's, herdr's, tmux's and Claude Code's, being
a socket or a command line that a separate program talks to. And the blocker was never that third
party code is dangerous. It was that escape sequences are an unauthenticated channel any file can
write to. **That is a channel argument, and Tortie's confirm gate is an answer to exactly that
class of objection.**

Worth saying plainly: Ghostty's refusal is affordable because a terminal emulator's job is
finished when it draws the terminal. Alacritty made the same refusal and is routinely criticised
for it, and people get the missing features from tmux instead. **Both refusers are hosts that
other software extends.** Neither is the layer that has to orchestrate anything.

### 4.6 What actually makes an ecosystem take off

Five findings, in order of how much the evidence supports them.

**One. Distribution friction is the throttle and it is almost the whole story.**

| Publishing act | System | Result |
|---|---|---|
| Add a GitHub topic to a repository | herdr | about 800 repositories in 10 weeks |
| Put a JSON file in your own repository | Claude Code | 289 entries, 127 authors, including several large vendors |
| Push a git repository, the user pastes the name | tmux | eighteen years, largest in the category |
| Open a pull request into the vendor's repository | Zed | 1,442 entries |
| Package, publish and pass a human review desk | Raycast | over 2,000, and a permanent staffing cost |
| Nothing, because there is no index | pi extensions | unmeasurable |

The bottom row is the sharpest. pi has the most powerful extension model in this survey and, for
its in process extensions, no index at all, so there is no ecosystem to count. **Power did not
produce an ecosystem. Distribution did.** And pi's separate npm package catalog, which does have
an index, has about 5,400 entries, which makes the same point from the other side.

**Two. The unit has to be something the author already knows how to make.** herdr's unit is a
program you already wrote and its ecosystem is written in fifteen languages, 270 of them compiled.
No SDK can produce that spread. Zed's unit is a Rust crate against a WebAssembly interface world
that almost nobody already had.

**Three. Money is not the driver.** No system in this survey took off because of author revenue.

**Four. The ceiling in this category is about ninety useful plugins.** Zellij's curated list is
88 after four years of a real WebAssembly interface. herdr has 91 repositories above ten stars
after ten weeks of TOML files. Two opposite architectures, near identical star counts, converging
on the same number. That is two data points and it is **modelled**, so treat it as a strong hint
rather than a law. And about thirty percent of herdr's top sixty are things Tortie already ships
as first party product.

**Five. Every 2026 supply chain incident in this survey needed a registry the host operates.**
Nx Console, GlassWorm, the AI extension pair. Not one of them needed a plugin system. **That is
the strongest argument for keeping the spirit of refusal 3, being that Tortie must never operate
a hosted registry, while abandoning its letter, being that an index cannot exist.**

---

## 5. herdr and pi, in detail

He named both, and the distribution model is what he most wants to understand, so this section is
the longest.

### 5.1 What a herdr plugin is

A directory containing a TOML manifest named `herdr-plugin.toml` plus any programs the manifest
names. Nothing more. The vendor's own words:

> Herdr plugins are shareable, executable workflow packages. A plugin can be a Bash script,
> JavaScript app, Lua script, Rust binary, or any other argv command your machine can run.

> There is no separate plugin SDK or restricted command set. The entire Herdr CLI is the plugin
> API.

> Runtime action registration and native non-terminal plugin UI are not part of plugin v1.
> Actions, event hooks, panes, and link handlers are all declared in the manifest.

The manifest vocabulary is eight things: required metadata, optional description and platforms,
build commands run once at install, startup commands run once per server start, named actions,
event hooks bound to one of exactly 22 permitted event kinds, panes that open as a terminal pane
or popup or overlay, and link handlers that route a clicked URL to one of the plugin's own
actions. **Every single one is an argv array, and herdr does not put it through a shell.**

**No third party code enters a herdr process.** Every plugin command is an ordinary child process
spawned from a six line helper. A grep across herdr's whole source for landlock, seccomp or
sandbox returns zero matches. The containment that exists is three resource limits: at most 32
commands in flight, 64 KB of captured output per stream per command, and 200 retained log entries.

The vendor states the trust posture without euphemism:

> Herdr validates the manifest and keeps each plugin's config and state in its own directory, but
> it does not review or sandbox plugin code. Third-party plugins come from their authors, not
> Herdr; you are responsible for deciding whether to run them.

### 5.2 herdr's distribution model, which is the part he most wants

**The one sentence version: there is no distribution model. GitHub is the distribution model.
The marketplace is a cron job that writes a JSON file.**

**Publishing.** Make a public GitHub repository, put one or more `herdr-plugin.toml` on the
default branch at the root or any subdirectory, and add the GitHub topic `herdr-plugin`. That is
all. No account, no submission, no upload, no namespace reservation, no review queue. The vendor
says the index covers public GitHub repositories and is not a reviewed catalog.

**The index.** A Cloudflare Worker at 1,269 lines whose entire HTTP surface returns 404 to every
request it ever receives. It exists only to be woken by cron every 30 minutes. It then searches
GitHub for `topic:herdr-plugin is:public`, drops disabled, archived, forked and private
repositories and anything on a hand written blacklist held in a key value store, resolves each
default branch head, rescans only repositories whose head moved, walks the tree for manifests
under caps of 32 KB per manifest and 5,000 manifests total, records one star sample per day for
60 days so the site can show trending, and writes one JSON object to object storage. Two guards
exist and they are the only integrity logic in it: the run throws rather than publishing if the
repository inventory more than halved, and throws if head resolution dropped a repository that
was cached.

**The store front.** A static page that fetches that one JSON object. Object storage CORS allows
only GET and HEAD from the vendor's own origin, and the object itself is public.

**Installing does not go through the marketplace at all.** `herdr plugin install owner/repo` is a
shallow git clone straight from github.com: init, add remote, fetch depth 1, checkout detached at
the fetched head. It refuses any URL form and accepts only the owner and repository shorthand.

**What the marketplace stores.** Per manifest, exactly seven fields: path, id, name, version,
minimum host version, description and platforms, plus the exact head commit. **It never stores or
serves a byte of plugin code.**

**No signing.** herdr already has a SHA-256 verifier and points it at its own self update binary
and its remote attach payload, and applies none of it to plugins. That is a choice, not an
oversight. **No review.** The only lever is a blacklist added in 123 lines across three files,
currently holding two entries, which removes a repository from the website listing and **does not
stop the install from working**. **No update mechanism.** Reinstall from GitHub, which by default
fetches the current default branch head, whatever it now contains.

**Three integrity checks do exist and one is genuinely clever.** The interactive install prints
the id, name, version, source, ref, commit and **the full argv of every build command, every
startup command, every action, every event hook and every pane**, then asks. Non interactive
installs are refused unless the yes flag is passed. Build commands run after confirmation, so a
build script could rewrite the manifest to add commands the person never saw, and herdr reparses
the manifest after the build and **aborts the install if it differs from the previewed one**.

**And the gap that check cannot close.** It protects the manifest. A build script that rewrites
`dist/apply.js`, which the previewed manifest already names, is entirely within the rules. The
preview shows `node dist/apply.js`. It cannot show what that file contains, because the build
produced it.

### 5.3 The numbers, and the three that disagree

Three bands measured the same ecosystem on the same day and got three different sizes, because
they measured three different objects, and nobody reconciled them. Stated properly:

| Object | Count | Source |
|---|---|---|
| Repositories carrying the topic, raw GitHub search | 823 | the index's own source block |
| Repositories with a parseable manifest, indexed | 794 | the live index snapshot |
| Plugins, being manifests | 809 | the same snapshot |
| Plugins shown on the website | 762 across 749 repositories | the website, fetched separately |

Anyone quoting one of these onward will quote it as "the number of herdr plugins". It is not one
number.

**The shape of the ecosystem, from the live snapshot stamped 2026-08-25T05:31Z.** 635 distinct
owners. Median stars is **1**. 289 repositories have zero stars, 84 have ten or more, 26 have
fifty or more, and 16 have a hundred or more. 268 were pushed within seven days and 583 within
thirty. Languages: Rust 178, Shell 174, Python 134, JavaScript 116, Go 92, TypeScript 68, then a
tail including Lua, PowerShell and Swift. Declared platforms are overwhelmingly Linux plus macOS.
Only six repositories carry more than one manifest.

**The star leaderboard is misleading and every band that used it said so.** The top four are
`alvinunreal/oh-my-opencode-slim` at 8,386, `zenbu-labs/terminal-browser` at 2,166,
`zenbu-labs/terminal-code` at 1,566 and `openclaw/crabbox` at 1,330, and none of them is primarily
a herdr plugin. They added the topic. **Topic based discovery is gamed, and any proposal that
copies it inherits that.** The genuine plugins start around 514 stars.

**The number I trust most is 32 percent pushed in the last seven days.** That is not a vanity
count and it says the ecosystem is being worked on right now.

### 5.4 What herdr's ten weeks cost them

Plugins are cheap in raw commit terms: 33 of 1,152 commits since 2026-05-01 touched plugin code.
The initial build was not cheap: one commit on 2026-06-14 at 12,925 insertions across 74 files,
plus 1,734 insertions for the marketplace a week later.

And within ten weeks of shipping, all of this, read from their changelog and git log:

- `min_herdr_version` did not exist and had to be added as a compatibility gate **the day after
  version one shipped**.
- Live handoff destroyed the plugin registry, and the next install overwrote it.
- Plugins were session scoped and became user global. **A user visible breaking migration telling
  people to reinstall**, and the documentation still carries the note.
- The plugin config directory naming had to be reworked, and the wreckage is permanent: a legacy
  directory function still copies from two older layouts on first use, forever.
- Relative plugin commands resolved against the wrong directory. Plugin command arguments were not
  preserved. Linking required a running server, which broke authoring. Plugin pane working
  directory desynchronised, with fixes still landing on 2026-08-20.
- Plugin lifecycle events forced a change to how core git work is scheduled, to keep clients
  responsive.
- The hook event set was **deliberately capped at 22 kinds**, with a code comment saying it is
  intentionally narrower until high volume output change hook semantics are worked out.
- The registry is re-read from disk under a file lock on every hook eligible event, and the
  eligible list includes pane focus, so that is a locked file read on routine interface activity,
  permanently, because linking has no confirmation gate to hang a cache invalidation on.
- The registry loader swallows every error and returns an empty list, so a corrupted registry
  silently disables every plugin the person installed.

**Read that list carefully, because it is the actual cost and it is not the cost research 31 was
worried about. None of these is third party code compromising herdr.** Every one is herdr's own
state management, path handling, lifecycle ordering and process hygiene failing under a load it
had not carried before. The plugin registry became a durability surface, and durability surfaces
break. **Tortie's own tiering makes a plugin registry Tier 3 on the first question alone.**

### 5.5 The hole in herdr that is the best evidence for refusal 8

Two measured facts and one inference.

`herdr plugin link <path>` has **no preview and no confirmation**. It parses a path and one
optional disabled flag and writes the registry. It works with **no server running**, so it cannot
even be gated by an attached client. Contrast the install path, which does print a preview and
does ask.

And herdr's own integration documentation says: an agent running in a Herdr pane inherits
`HERDR_ENV`, `HERDR_PANE_ID`, `HERDR_BIN_PATH` and `HERDR_SOCKET_PATH`.

**Modelled, by the herdr band, and I did not execute it either:** compose those and an agent in a
pane can write a three line manifest with a startup hook, run `herdr plugin link` on it, and it is
registered globally, enabled by default, and runs on every future server start. No human sees
anything. Every link in that chain is measured from herdr's source and neither the band nor I
could find the check that breaks it.

**This is the single most important thing the herdr band found. Tortie's refusal 8 describes this
exact hole, and herdr has it open right now.** herdr's model works because herdr's users are
mostly watching one agent. Tortie runs many at once under one account, several deliberately
launchable with their safeguards off.

There is a second one. herdr's configuration file already ran arbitrary argv before plugins
existed, through shell, popup and pane key commands. **So plugins opened no new execution surface
for herdr.** Tortie's boundary is the opposite. herdr's precedent does not transfer as a
precedent. It transfers as a design that starts from a place Tortie deliberately refused to start
from.

### 5.6 pi, and the two things research 31 got wrong about it

A pi extension is one TypeScript or JavaScript file default exporting a function that takes one
argument. No manifest, no id, no version, no permission list, no build step. It is compiled in
memory and evaluated in the same isolate. There is no worker, no separate context, no realm and
no `vm` module in the path.

**There is no boundary and the vendor says so:**

> Pi does not include a built-in sandbox. Built-in tools can read files, write files, edit files,
> and run shell commands with the permissions of the pi process. Extensions are TypeScript modules
> that run with the same permissions.

> A partial in-process sandbox would be easy to misunderstand as a security boundary while still
> depending on the host shell, filesystem, package managers, credentials, and extension code.

**Research 31 said pi has no registry, no search, no ratings and no publisher identity. That was
already wrong when it was written.** There is a browsable catalog at `pi.dev/packages` reporting
about 5,454 entries with npm publisher names, monthly download counts, recency and a report link,
and its metadata fields were documented in pi's own repository on 2026-02-02, six months before
research 31 read the tree. The index key is an npm keyword anyone can add. Signing is the only
part of the original sentence that survives, and even there about 37 percent of a 1,000 package
sample carries npm trusted publishing provenance that pi does not check.

**Research 31 also cited pi's project trust prompt as a precedent for trusting configuration. It
is not a design posture. It is a patch for a CVE.** Two of pi's four published security
advisories, all dated 2026-06-08, are the extension mechanism:

- **CVE-2026-54325**, medium. Pi before 0.79.0 loaded project local extensions, which are
  executable modules loaded into the pi process, from a repository's own directory **without
  asking the user to trust that repository**. Reported 2026-05-25 by an outside researcher, fixed
  2026-06-05, published 2026-06-08.
- **CVE-2026-54328**, high, CVSS 7.3. Predictable temporary extension install paths allowing local
  privilege escalation on shared Linux hosts, with the stated impact being arbitrary extension code
  execution as the victim user.

**For roughly seven months and about 250 releases, pi loaded executable code out of any repository
you happened to change into, with no prompt at all.** pi arrived at refusal 8 by paying for the
alternative first and then being told. And pi's own advisory says the trust prompt is defence in
depth and user safety, not a sandbox, and does not make untrusted repositories safe.

**Three more measured facts about pi that research 31 did not have.** Installing a package runs
npm lifecycle scripts, because pi does not pass the ignore scripts flag for packages, while it
**does** pass it when updating itself. Of the 60 most downloaded pi packages, 9 declare an install
time lifecycle script and 2 pull a native addon, and the most downloaded package of all depends on
a native module that reads the operating system keychain. And missing packages named in settings
are installed automatically on session start with no prompt on the two resource loader paths,
because neither passes a callback.

**And the maintenance bill, which is the clearest number in this whole document.** pi's changelog
covers 271 releases over about nine months. It contains **44 sections headed Breaking Changes, and
39 breaking bullets that name extensions.** That is roughly one extension breaking change a week,
for nine months, from a team, with a security response process and a published advisory workflow.
The public surface is 149 to 154 exported names and it grew by 5 in the thirteen days between
research 31's read and this one.

**pi is not a counterexample to the refusals. pi is the experiment, running at scale, with the
receipts now public, and the receipts say the refusals were priced correctly.**

### 5.7 What pi's ecosystem actually wants, which is the useful part

Classified over the top 1,000 packages by name, description and keywords. A package can fall in
more than one bucket and 237 matched none.

| What it does | Count |
|---|---|
| Provider and model plumbing | 217 |
| Terminal interface, themes, status lines, widgets | 142 |
| Subagents, delegation, orchestration | 140 |
| Session handling, resume, checkpoints, export | 137 |
| Search, language servers, linting, formatting | 113 |
| Cost, token accounting, telemetry | 101 |
| Memory and context management | 98 |
| Permissions, sandboxing, secret scanning, approval gates | 80 |
| Bridging to the Model Context Protocol | 65 |
| Todo lists, plans, goals | 65 |
| Git and version control | 57 |
| Notifications and outbound hooks | 29 |

**The demand is agent capability, not host customisation.** The top package is an MCP adapter at
590,228 monthly downloads, which exists because pi does not ship MCP, so the community built the
bridge. And a visible slice of the ecosystem exists to put back the safety the host chose not to
have, including a permission enforcement extension at 30,000 monthly downloads with 186 published
versions.

**Almost every large bucket could be delivered by a mechanism other than loading code into the
host.** Model plumbing is a configuration table. MCP bridging is a protocol client. Subagents are
processes. Cost accounting is reading a log. The one bucket that genuinely wants to be code inside
the host is the 142 terminal interface entries, and that is exactly the surface pi has broken 39
times in nine months.

---

## 6. The threat model, tested rather than assumed

His question deserves the sharpest version of the objection to refusal 8, which is: an agent
Tortie launches already runs arbitrary code with his credentials, in his home directory, several
of them deliberately launchable with their own safeguards off, catalogued at
`src/main/agents/flags.ts`. **Tortie's entire product is starting those processes.** So does "an
agent can write the configuration" prove anything at all?

### 6.1 The premise is true, and it is stronger than `CLAUDE.md` states

**Measured** on this machine. The data directory is `drwx------`, which stops other **users** and
does nothing about other **processes of the same user**, which is what an agent in a pane is.
Inside it, `manifest.db` is `-rw-r--r--`, and so are `settings.json`, `config-confirmations.json`,
`machines.json` and `overview.db`. `src/main/tmux/env.ts` shows the whole of what a managed pane
gets added to its environment, being two variables, with no separate account and no sandbox of any
kind.

So an agent can write every configuration surface Tortie has, **plus the manifest**.

### 6.2 The confirm gate covers one of those surfaces, and it is not the one that runs things

`src/main/config/confirm.ts` states it itself: the restore path calls nothing there at all,
because by then the argv it needs was copied into the manifest row at create time and a session's
recovery must never depend on a file the user can delete. `src/main/restore/restore.ts` says the
same from its own side, that nothing there refuses a restore or rewrites an argv. And the manifest
holds `argv` and `resume_argv` as columns in a world readable file.

**So the shortest route past refusal 8 does not go through `agents.json`. It goes through
`manifest.db`, which has no gate on it at all.** Two things blunt it and both are real: the armed
resume is typed into the pane **without Enter**, by an explicit product decision, so a tampered
argv is a line sitting on screen waiting for a keypress, with the drift sentence printed above it;
and the snapshot replay path, which does press Enter, quotes its path through a helper whose safe
character class correctly excludes a leading equals sign. The threat model band could not
construct an injection through it.

**What this does to the argument.** It weakens the "configuration is a privilege increase"
framing slightly, because the same adversary already has an ungated path that the product accepted
as the price of durability. And it strengthens the general point, because it shows that once
Tortie trusts a file an agent can write, the trust has to be argued file by file, and one of the
files already lost the argument.

### 6.3 What a plugin would add that a configured agent does not, and it is exactly five things

"Arbitrary code execution with the person's credentials" is not one of them. The agent already has
that, deliberately. Five things are genuinely new:

1. **It runs when Tortie runs, not when a person starts a session.** An agent is a process a person
   deliberately started in a project and it dies with the session. A plugin loaded at boot is
   resident for as long as the application is, across every project, with no session to close.
   That is the difference between a capability and a persistence mechanism.
2. **It is inside the boundary both seals are drawn around.** The operator wrote this sentence
   himself, at `src/main/settings/store.ts`, in the list of what the danger seal does not cover:
   **"It says nothing about code running inside Tortie's own renderer."** Both seals encrypt with
   the platform secret store under a key bound to Tortie's own identity. That defends a file from a
   process outside Tortie. Code inside Tortie does not forge a seal. It asks Tortie to make one.
3. **It can drive what the person sees while they confirm.** The confirm sheet is a renderer
   surface. Refusal 6 of the config gate defends against a row changing while the sheet is open. It
   does not defend against the sheet showing one thing and hashing another, and the acknowledgement
   sentence is a constant in the same bundle.
4. **It holds the bridge.** 204 invoke and event channels, including one that types arbitrary bytes
   into any live session, which is a general purpose command execution primitive and an
   exfiltration channel in one, and 37 machines channels that reach other computers over an already
   confirmed connection **without needing to hold the credential**.
5. **It has no working directory.** An agent is anchored in a project path. A plugin is not, and
   neither is the bridge it would hold.

**And one correction that is often assumed the other way.** The machine key files are mode 0600
owned by the user, so an agent process **can already read them**. "A plugin could steal the ssh
keys and an agent could not" is false. What the plugin adds is that it can use the machines plane
without the key at all.

### 6.4 What contains an Electron application in 2026

| Mechanism | Genuinely contains | Does not contain |
|---|---|---|
| A forked utility process | Crashes and main thread blocking | **Nothing else.** Same account, same home directory, filesystem, network and child process modules all present |
| A renderer with the sandbox on | Real. The platform sandbox, no filesystem, brokered network | The preload, and as of CVE-2026-70601 not even reliably that. Tortie's own windows run with the sandbox off because the preload needs Node |
| A separate session partition | Cookies, storage, cache and the served policy | Process privileges. It is a data boundary, not a code boundary |
| A fully sandboxed frame on a custom scheme | A great deal, and Tortie already measured it: with same origin allowed a probe read the bridge object and 9,196 bytes of the password file, with scripts allowed a meta refresh fired, and with the served policy removed five requests reached a local sink | Inert content only, because scripts are off entirely. It cannot become a plugin host |
| WebAssembly | The strongest containment without help from the operating system | It is a compute sandbox. The moment you give it useful imports you have re-created the interface problem, and Zed's compatibility shim alone is 5,372 lines |
| A subprocess speaking a narrow protocol | Reach, not privilege. It gets exactly the messages you send and replies in shapes you accept | Anything the person's account can do. It is an interface boundary, not a security one |
| The platform application sandbox | Would be real containment | Tortie cannot adopt it. It spawns tmux, ssh, ripgrep, specstory and every agent binary outside any container |

**The honest conclusion. There is exactly one shape where third party code runs and reaches
nothing that matters, and Tortie is already running four instances of it**, being tmux, ripgrep,
the specstory binary and the bundled skills command line tool. The shape is: a program Tortie did
not write, pinned by hash, materialised at build time, re-signed under Tortie's identity, launched
as its own process from exactly one module, given an argv Tortie composed and a directory Tortie
chose, speaking back only through its own output in a format Tortie parses and validates.

It never touches the secret store, so it cannot make a seal. It never holds the bridge. It never
renders, so it cannot lie about what is being confirmed. It is Tortie's own child, so it can be
killed, deadlined and capped. **And it contains nothing in the security sense, because it runs as
the person, in their home directory, with their credentials on disk.**

### 6.5 So what is the real boundary

Not the origin of the bytes. Every one of the four exceptions in section 1 preserves the same
property, and it is the property the code has actually been holding for months:

> **The operator chose the exact bytes, pinned them by hash, and can be held responsible for them.
> Or a person confirmed them once, out of band of any agent turn.**

That sentence is narrower than "no third party code" in one direction and wider in another, and it
is far more defensible, because it is true. **It also excludes every plugin ecosystem in section 4,
which is why writing it down costs nothing and gains a great deal.**

---

## 7. What it would unlock, argued at full strength, then what survives

### 7.1 The strongest case, stated as strongly as it can be stated

The refusal that has been doing all the work is aimed at a target that barely exists. The
what-it-unlocks band read the top sixty plugins in a live marketplace in Tortie's exact category
and classified every one:

| Group | Share of the top sixty | What it is |
|---|---|---|
| Things Tortie already ships as first party product, and ships better | 18 of 60 | A git aware file viewer, a source control sidebar, code review sidebars, remote machines over ssh, four separate session renaming plugins, fuzzy jump, and a workspace snapshot and restore plugin that is Tortie's entire core product |
| Things Tortie refused for reasons that have nothing to do with code | 9 of 60 | Phone and watch clients, push notifications, token dashboards, kanban boards of dispatched prompts |
| Things that already work today through the shipped agent overlay | 7 of 60 | A file manager in a pane, an account manager, a sandboxed run command, a scratch shell |
| A file format, not code | 6 of 60 | Declarative workspace layouts, worktree setup, session sets |
| Genuinely needs something Tortie does not have | 20 of 60 | Nineteen need one verb an outside process can call. **One needs third party code inside the host process, and it is an embedded browser** |

**One plugin in sixty is blocked by refusal 1.** The refusal that ended eleven of twelve reviews
is nearly irrelevant against the real corpus, and the refusals that actually bite are 2 and 3,
which are product judgements about type definition files and store fronts, and 8, which bites the
verb surface.

And there is a Tortie shaped opportunity nobody else can take. Tortie's crown jewel is not the
window. It is the table of how thirteen agent harnesses actually behave: how each launches and
resumes, where each keeps its conversation store and what to read and skip in it, seven mutually
incompatible context precedence models in 1,349 lines, and eleven measured fold recipes. **Nobody
else has assembled this table.** Four conformance gates hold it. New harnesses ship faster than
Tortie's release cycle, and `agents.json` covers only the launch and resume third of it. A recipe
format that covered the whole table, with a public repository the agent vendors themselves could
contribute to, is the one asset whose value grows with the number of harnesses in the world rather
than with the number of Tortie users.

### 7.2 What survives the adversaries

**The ecosystem case is causally backwards, and the band that made it proved that itself.** herdr
grew 26 times over before its plugin system existed. Tortie has 4 stars. The predicted plugin
count is zero. And the ceiling in this category appears to be about ninety useful plugins, of
which thirty percent is furniture Tortie already ships. **The realistic upside is perhaps twenty
to thirty things, most of which are a phone client, a kanban board and a token dashboard that
Tortie has refused for reasons unrelated to code.**

**"Refusal 1 blocks almost nothing" is an argument for keeping refusal 1, not for spending it.**
If the strongest refusal in the document blocks one plugin in sixty, then relaxing it buys one
plugin in sixty. It is nearly free to keep and nearly worthless to spend.

**The narrow shape is not narrow, and herdr's own ten weeks are the proof.** Section 5.4 is what
happened to their version one. And the return channel everyone calls narrow is not narrow at
herdr at all: the entire command line interface is the plugin API, because it already existed for
other reasons and holding a subset would have been work with no payoff. **The narrow version
delivers nothing the corpus wants until it grows write verbs, and the write verbs are the thing
refusal 8 exists to refuse. There is no version that is both narrow and worth building.**

**The agent recipe is the most dangerous proposal in the pile and it is dressed as data.** Its own
band flagged the load bearing unknown: nobody checked whether the four tables can be expressed as
data. I looked at one quarter of it. The fold's per provider parsers are functions in
`readers.ts`. A recipe format covering the fold either enumerates a closed set of parse shapes, in
which case a new harness that does not match gets nothing, or accepts an expression the recipe
supplies, in which case it is code with a different file extension. A public recipe repository is
a marketplace with the word filed off, and the only two answers in the survey are a staffed review
desk or no review at all. A recipe carries argv, so every one needs a human confirmation, so
somebody proposes a bulk confirm, which is the erosion research 31 predicted. And it moves four
conformance gates from asserting properties of a compiled table to asserting properties of a table
the user can rewrite.

**And the first serious incident is not hypothetical. It has happened twice this year in the exact
shape, and research 31 cites neither.** In August 2025 the s1ngularity attack on Nx used a
malicious install script to find locally installed agent command line tools, including Claude
Code, Gemini CLI and Amazon Q, and invoke them **with their guardrails explicitly disabled** to
hunt for credentials. 2,349 credentials leaked to over 1,400 public repositories, and it appended
a shutdown command to shell startup files. The same actor's payload later appeared inside the
compromised Nx Console extension in May 2026. **That is Tortie's threat model, executed in the
wild, twice, against exactly the binaries Tortie exists to launch.** And Obsidian REF6598 in April
2026 is the same lesson from the other end: the plugins that got weaponised were the ones that run
shell commands, and no vulnerability was needed.

Tortie is signed with a Developer ID, notarized and stapled, under a bundle id belonging to a
named company owned by a named person. **The headline would not be "malicious plugin". It would be
"coding agent manager ships malware to its users", because that is the headline every one of the
2026 incidents got.**

### 7.3 Three moves that would weaken the refusals without anyone deciding to

Named here so they are visible when they are attempted.

**One, rewording refusal 3 while a proposal to relax it is live.** A refusal rewritten during that
argument is a refusal the argument rewrote, and the record will show it. Fix the wording in its
own edit with no plugin question attached, and make the replacement narrower rather than broader.
In particular, "no browse and install of things Tortie runs" is broader in one direction that
matters, because it silently concedes that browse and install of things Tortie does not run is
fine, and every future proposal will argue its plugin is one of those.

**Two, "the refusals are already broken so they are not real."** Every exception is a case where
the operator chose the exact bytes and pinned them. The list is not evidence the wall fell. It is
evidence the wall has a gate with one person's hand on it.

**Three, "the deferred peer is already built."** The spawner exists. The part a plugin needs, being
a third party supplying the recipe and the parser, is exactly the part that is not built and is
exactly the part that is code.

**And a fourth that arrived inside this research.** The harness prefixed two band reports with a
notice that their output matched an instruction shaped pattern, specifically
`dangerously-skip-permissions`, and neutralised the control tags. That is untrusted text moving
through this project's own agent pipeline, today, in a research task, and something had to defend
against it. Relaying it as instructed: both were benign, being quotations of the s1ngularity
flags, and the mechanism that caught it is the same class of mechanism a plugin proposal would
have to build for every string a plugin returns.

### 7.4 The question nobody asked, and it may be the most important one here

**When a Tortie user wants a plugin, who writes it?** Not one of the six bands asked. All six
modelled the author as a human stranger who publishes, which is why five of them spent their
strongest sections on distribution and ecosystem size. There are three answers and the evidence
changes completely under each.

- **A human stranger who publishes.** Then the arithmetic in section 1 settles it and every herdr
  measurement is evidence about Tortie's stage rather than about architecture.
- **The operator himself.** Then this is not a plugin question at all. It is the agent recipe
  question, distribution is irrelevant, and refusal 8 is satisfied by the gate that already ships.
- **The user's own agent.** This is the answer most native to what Tortie is, and pi already works
  this way, with the first line of its extension documentation telling people to ask the agent to
  build one. An agent written plugin is never published, so there is no marketplace, no ecosystem
  count, no review desk, no supply chain and no version contract with strangers, and the entire
  comparison set in section 4 becomes inapplicable. **And refusal 8 goes to maximum, because the
  author and the adversary become the same process.** A person would be asked to read and approve
  bytes a machine wrote for them minutes ago, repeatedly, in the one place the whole security
  argument rests.

**The shape that fits Tortie best is the shape that stresses its one live objection hardest.** That
question should be answered before any other, because it decides which of the six band reports is
evidence and which is background reading.

---

## 8. The options, as a ladder

Each rung with what it unlocks, what it costs, and what it forecloses. He decides. Section 9
recommends.

### Rung 0. Change nothing

**Unlocks:** nothing. **Costs:** nothing in code, and the running cost named in section 1, being
that three refusals stay false against the tree and the next round either ignores them or
rediscovers this. **Forecloses:** nothing.

### Rung 0.5. Make the words true, and ship the substrate document

**Unlocks:** a boundary sentence a future round has to argue with instead of a slogan it can
dismiss, plus every "watch my sessions" and "sync with my editor" integration written by other
people entirely outside Tortie.
**Costs:** two documents and no code. Research 31 priced the substrate document at free and true
today, and listed it under what ships regardless of the decision.
**Forecloses:** almost nothing, but not literally nothing, and the band that called it free was
wrong about that. **The socket is a write surface.** `tmux -L gmux list-sessions` and
`tmux -L gmux send-keys` are the same permission. Publishing the map publishes the address of a
write surface with no gate on it, and the document must say so in those words rather than calling
it read only. It also converts an internal freeze into a promise owed outward: `CLAUDE.md` already
freezes those identifiers for a durability reason, and once other software depends on the
documented shape, a migration that was a phase becomes a breaking change with strangers' software
attached. That is small. It is not zero.

### Rung 1. A tool row in the overlay that already exists

A `kind` field on an `agents.json` row so a confirmed program can open in an overlay rather than
becoming a durable session, plus honest words in the interface for what it is.
**Unlocks:** at least seven of the top sixty in the measured corpus, being a file manager, a git
interface, an account manager, a sandboxed run command, a scratch shell, and the whole "run a
terminal program beside my agents" category.
**Costs:** small. It reuses the confirm hash, the argv validator and the refused environment name
list unchanged.
**Forecloses:** nothing, and **no new trust surface whatsoever**, because the confirmation is
identical to the one a configured agent already passes. The only real objection is that it makes
the overlay format more attractive as a distribution target, which is a slope argument and a weak
one.

### Rung 1.5. A session set format

A file describing a set of sessions across projects, where every argv it names passes the gate
that already exists.
**Unlocks:** six of the top sixty, and the multi project version of them that only Tortie could
have, since nothing else has multi project tabs in one window. Research 48 already convicted the
idea on demand.
**Costs:** a format, a validator, and one decision about whether applying a set needs its own
confirmation on top of the per agent ones already given.
**Forecloses:** nothing. It adds no execution path.

### Rung 2. The agent recipe

Widen the configuration format from the launch and resume third of the agent table to the whole
of it, being the status oracle, the context precedence, the keep map and the fold recipe.
**Unlocks:** the fourteenth agent and every agent after it arriving as a file rather than as a
release, and the one asset whose value grows with the number of harnesses in the world.
**Costs:** unknown, and that is the point. **Nobody established whether those four tables can be
expressed as data at all**, and one quarter of the evidence I checked says at least the fold
cannot without either a closed shape list or an expression language. It also widens four
conformance gates onto user supplied data.
**Forecloses:** a great deal, quietly. A public recipe repository is a marketplace with the word
filed off, and a recipe carries argv.
**This rung needs a measurement phase before it can have a build phase.**

### Rung 3. A read surface an outside process can call

`tortie list --json` and nothing that writes.
**Unlocks:** the editor synchronisation and transcript search plugins in the corpus, written
entirely outside Tortie.
**Costs:** low. It is rung 0.5 in executable form.
**Forecloses:** the same outward promise as rung 0.5, and a little more, because a command line
surface is a contract in a way a document is not.

### Rung 4. A write verb an outside process can call

Focus that pane, type this there, give me that screen.
**Unlocks:** nineteen of the top sixty. It is the difference between an ecosystem of shell scripts
and an ecosystem of compiled modules.
**Costs:** this is refusal 8 at full force, and the operator already wrote the cap himself in the
Phase 51 entry: the moment anyone adds a flag such as `tortie --agent claude .`, any process on the
machine can start an agent in any directory, which is the exact shape refusal 8 exists to prevent.
**Forecloses:** the argument. **This is the real decision underneath his question, it is bigger
than the plugin question, and no band produced the Phase 23 grade argument for it.**

### Rung 5. A manifest naming subprocesses, plus an index

The herdr shape.
**Unlocks:** on the measured arithmetic, zero plugins at 4 stars.
**Costs:** section 5.4, plus a support channel with no second person in it, plus a permanent tax on
refactoring a tree that took 415 commits in thirteen days, plus either an install gate stricter
than the marketplace it copies or a gate that stops meaning anything. Tortie's own skills install
gate refuses a skill that merely **contains** an executable command.
**Forecloses:** the velocity that is currently producing Tortie's value.

### Rung 6. A plugin API with code in a Tortie process

**Unlocks:** one plugin in sixty, and it is an embedded browser.
**Costs:** everything in research 31, unchanged, plus CVE-2026-70601.
**Forecloses:** the product.

---

## 9. The recommendation

**Rungs 0.5, 1 and 1.5. Stop there. Answer the section 7.4 question before considering rung 2, and
refuse rungs 4 through 6.**

The reasoning, in order of how much weight it carries:

1. **Tortie does not have the audience a plugin system multiplies.** 4 stars, 0 forks, about 175
   downloads. This is the whole answer and it is not a security argument. It should be recorded as
   the reason, so that when it expires the decision gets reopened rather than defended with a
   security argument that will still say no when the correct answer has become yes.
2. **Tortie's own decision procedure already says no.** Two of research 31's three trigger
   conditions are unmet, and the unmet one that matters, the command layer, is not a coincidence:
   nineteen of the twenty plugins in the corpus that need something Tortie lacks need a command,
   and the command layer is the same thing seen from the inside.
3. **The refusal that would have to move is the one research 31 named as residual risk number one**,
   and this round arrived at it by convenience exactly as predicted.
4. **The evidence from the two products he named runs against the change, not for it.** herdr's
   link command is refusal 8's hole standing open. pi paid for refusal 8 with a CVE and 250
   releases of exposure, and pays about one extension breaking change a week with a team behind it.
5. **The upside is small.** One plugin in sixty needs refusal 1 to move. Thirty percent of the
   corpus is furniture Tortie already ships better. The category ceiling looks like ninety.
6. **Rungs 1 and 1.5 capture most of the real value and are not plugins.** They are Sourcegraph's
   ending, which is the correct one: the extensions people actually wanted became product features.

### What would have to be true for me to be wrong

Stated as conditions he could check, so this document can be falsified rather than believed.

- **Adoption.** If Tortie passes a few thousand stars and starts receiving unsolicited requests
  from people who are not him, the arithmetic in section 1 reverses and the whole recommendation
  should be re-derived. That, not "three named requests", is the honest trigger, because adoption
  is what actually defeated the strongest attack on this position.
- **The section 7.4 answer is "the user's own agent."** If the intended author is the person's own
  agent rather than a stranger, then the entire section 4 comparison set is inapplicable, the cost
  model collapses, and the only remaining question is whether a person can meaningfully confirm
  bytes a machine wrote for them minutes ago. Nobody has studied that and it is answerable.
- **The four agent tables turn out to be pure data.** If somebody measures rung 2 and finds the
  status oracle, the keep map, the context precedence and the fold recipe are all expressible
  without an expression language, rung 2 becomes much cheaper than I priced it and much more
  valuable than anything else on the ladder.
- **A command layer gets built for its own reasons.** Research 31 said it has independent value and
  should be justified on its own merits or not built at all. If it ships for reasons that have
  nothing to do with extensibility, rung 3 becomes nearly free and rung 4 becomes a live question
  that deserves its own Phase 23 grade round.
- **Somebody writes down three requests configuration provably cannot express.** None exist today.
  If three arrive from real users with the attempted configuration formulation and why it failed,
  the trigger fires and this document is superseded.

---

## 10. What is not true

Every limit of this research, stated plainly.

**Tool availability.** WebSearch and WebFetch worked for all six bands. The `gh` command line was
available and authenticated. The third adversary did not fetch anything from the web, so its
checks are local only. I ran my own checks on the local tree and on the GitHub API on 2026-08-25
and did not re-fetch any external page myself.

**What nobody measured.**

- **How many of herdr's manifests declare a startup hook.** That is the field that decides whether
  a plugin runs without a person present, and it is the exact number the refusal 8 argument needs.
  The index does not carry it and nobody cloned 794 repositories to find out. **Every argument in
  this document about whether herdr's model is safe enough to copy is missing its denominator.**
- **How many of herdr's or pi's published plugins anyone actually uses.** herdr's installs are a
  git fetch straight to GitHub that the marketplace never observes, so it is structurally blind.
  pi's npm download counts are real for the top 60 and unsampled below that.
- **Whether any herdr or pi plugin has ever been malicious.** No incident, no advisory, no security
  policy file in herdr's repository. Absence of a report over ten weeks is weak evidence.
- **Whether the four agent tables can be expressed as data.** The load bearing unknown under the
  most valuable idea in this document.
- **Whether Tortie's adoption numbers say anything at all about plugins.** They were taken as the
  headline reason without anyone asking whether a pre launch product's star and download counts
  can predict a post launch ecosystem. See the correction at the top of section 1.
- **Whether the platform secret store actually prompts** when another process running as the same
  user asks for Tortie's key. Two modules assert it does. Nobody tested it, because testing it
  means attempting to read his real keychain. It is **remembered**, and it is load bearing for both
  seals.
- **What the terminal component does with hostile escape sequences replayed from a snapshot file.**
  Snapshot files are agent writable and their contents are printed into a live terminal. Flagged
  and unexamined.
- **Whether any of the 204 bridge channels leaks a secret back to the renderer.** The channel names
  were read and a sample of handlers. Absence was not proved.
- **What the development build does to the seal.** In development Electron runs unsigned or ad hoc
  signed, and nobody knows what that does to the key's access control. That is where every agent in
  this repository actually runs.

**What is remembered rather than verified.** CVE-2026-70601 and its details. The VS Code, Obsidian,
Raycast, Figma, Sublime Text and Neovim rows in section 4, which come from one band's fetches. The
2026 supply chain incident figures. pi's advisory contents. Orca's line counts.

**Numbers that disagree and were not reconciled.** The herdr ecosystem size, four different figures
in section 5.3. The Zed extension count, where a directory listing caps at 1,000 and other sources
give 1,442. The ACP Registry agent count, where sources give 38, 40 and 50. Tortie's own download
total, reported as 175 by one band and 176 by another.

**Numbers that were computed on a shifting base.** The 265,117 line figure includes harness code:
`src/main/machines/remote-smoke.ts` alone is 3,120 lines and counts as non test under every band's
exclusion pattern. One band reported 265,117 lines across 1,504 files, which mixes two counts; the
correct pair is 265,117 non test lines across 915 files, or 419,386 total lines across 1,504 files
(**measured**).

**What a real decision would still need.** If rung 2 is ever considered, a measurement phase that
answers the data question before a build phase exists. If rung 4 is ever considered, a full Phase
23 grade round with its own adversaries, because nothing here is that. And before any of it, the
section 7.4 answer, because it decides which half of this document is evidence.

**One number to carry into every conversation that follows.** Research 31 is thirteen days and 415
commits old, has never been amended, and five of its own build instructions were already stale
after one day and 330 changed files, so Phase 23 had to overrule them to ship. Whatever a later
round concludes, it should conclude it from the tree as it is on that day, the way Phase 23 did.

---

**Provenance.** Written 2026-08-25 by the synthesis agent of a six band, three adversary research
workflow, from `/Users/gdc/gmux` at `60d5a321`, version 0.73.0. Local trees read read only:
`/Users/gdc/gmux`, `/Users/gdc/herdr` at `6e8b138d`, `/Users/gdc/pi` at `086c32e74` and ten days
stale, `/Users/gdc/orca` at `4fd93ead`. No code was changed, no Electron was started and no tmux
was touched.
