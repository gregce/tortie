# Research 66. Plugins after launch, and the decision that is being taken this week without anyone calling it one

**Status.** Research only, requested by the operator on 2026-08-25 as a correction to research 65.
It schedules nothing and changes no phase. The single deliverable is this document plus one record
entry in the backlog. The operator decides what, if anything, becomes a phase.

**Method.** Four research bands ran over the local tree and the live web, all read only, each told
that arguing from how many stars the repository has today was banned and that repeating research 65
or research 31 was worthless. Three adversaries then attacked the result, one attacking the
destination the bands converged on, one attacking the idea that waiting is free, and one attacking
the quality of the round itself. This document is the synthesis. Where the bands disagreed the
disagreement is stated rather than averaged away, and where an adversary broke a band's finding the
break is carried rather than smoothed over. Section 9 carries every limit.

**Marks.** A claim marked **measured** was run or read on this machine on 2026-08-25 at
`/Users/gdc/gmux` `083ce2d`, version 0.73.1, and names its path or command. Where I ran the command
myself it says so. A claim marked **fetched** came from the GitHub API, WebSearch or WebFetch on
2026-08-25. A claim marked **remembered** is a model's own knowledge with no check. A claim marked
**modelled** is an inference and the inference is named. No code was changed, no Electron was
started and no tmux was touched.

---

## 1. The answer

**The destination is still no third party code in any Tortie process, and the thing that replaces it
is other people's plugin ecosystems rather than one of Tortie's own.** Tortie already reads five
categories of them across eleven agents, and one of those categories is literally called `plugin`
(**measured**, `CONTEXT_CATEGORIES` at `src/shared/context-snapshot.ts`). The single most valuable
position available to a product that supervises thirteen agent harnesses is to be the one place a
person can see every skill, every MCP server and every hook their agents already have. That position
is better than owning one more ecosystem, it needs no refusal moved, and it is already half built.

**Tortie's own four tables stay Tortie's, and the reason is not secrecy. It is that their value is
the measurement and not the format.** Three of the four are already pure data in the shipping tree,
and a fourth band proved the fifth is expressible too. That proof is real work and it changes the
engineering question. It does not change the answer, because the gate that makes the keep map safe
to treat as untrusted data is a table of results the operator personally banked per provider
(**measured**, `build/conformance-overview.mjs`), so a row somebody else contributes arrives
ungated, into the surface that decides what a person reads about their own conversation. The product
already says this to a person's face: a configured agent is shown as unverified, because Tortie has
measured nothing about it (**measured**, `REFUSED_ROW_FIELDS` in `src/shared/agent-overlay.ts`).
Publishing the format is a way to make unattested rows at scale.

**The trigger is not stars, not forks, not a third party index, and not any number that moves with
audience size.** Ghostty's scripting request was opened fifteen months before Ghostty launched and
is still open at 60,000 stars (**fetched**). A signal that is on from before launch and never turns
off carries no timing information. The only honest trigger is the shape of the requests real people
file, and research 31's condition 1 needs one clause added to it: three named requests that
configuration cannot express **and that first party code should not absorb**. Against the eleven
real requests Tortie has received, that count is zero. Every one of them is something Tortie should
simply do.

**What he should do now, in this order.**

1. **Rule on `.tortie/` before the phase for issue 11 is written.** The one outside user has asked
   for a repository local, version controlled, portable project configuration directory
   (**measured**, `gh api repos/gregce/tortie/issues/11`). That is the container every plugin system
   in this category grew inside. It is queued as onboarding polish and refusal 8 does not currently
   know it is being asked. This is the live decision and it is free to take today.
2. **Ship the two documents research 65 already authorized and nobody wrote**, being the rewrite of
   refusals 1, 3 and 6, which are false against the tree, and the substrate documentation research
   31 promised twice. Both survived every attack in this round untouched.
3. **Take the one hardening that keeps every later door open and is worth doing if no door is ever
   opened**, which is turning the trusted sender set at `src/main/security/trusted-window.ts:84`
   from a set of window ids into a per caller channel policy. The Settings window holds all 190
   invoke channels today, including `sessions:kill`, `git:discard` and `fs:writeFile`
   (**measured**, and I re-derived the 190 from `docs/audits/contract-baseline.txt` myself).

**What he should not do.** Do not publish the agent table. Do not build the read only command yet,
because the manifest schema has moved seventeen times in sixteen days and the promise is the cost
rather than the code. Do not open `activity` on a configuration row, because the three values it can
select all belong to other people's agents. Do not build a view plugin ever, and the reason is not
isolation.

---

## 2. Why this document exists

### 2.1 The correction, in his words

Research 65 was delivered on 2026-08-25 and its headline reason for keeping the refusals was
adoption arithmetic. `gregce/tortie` had 4 stars and about 175 downloads, herdr had produced roughly
one plugin repository per 39 stars, and the ratio predicted zero plugins. The operator then said, in
his own words:

> i haven't really launched tortie yet so ...

He is right and it is a category error. Those are pre launch figures. They measure whether the
product has been put in front of anyone, not whether plugins would work for it. Research 65's own
section 10 lists eight things nobody measured and is unusually thorough about them, and it never
names this one, so the headline argument rested on a premise nobody flagged as load bearing.

The correction has already been written into the top of `docs/research/65-plugins-reconsidered.md`.
Two things about that correction should be said here, because the third adversary in this round
found them and they matter for anyone reading 65 later.

**The correction is honest in what it says and it leaves the refuted argument standing where a
reader will actually find it.** **Measured** by that adversary with `grep -n`, and re-checked by me:
line 808 of research 65 still reads "Tortie has 4 stars. The predicted plugin count is zero", line
995 still prices a whole rung at "zero plugins at 4 stars", line 1017 still gives the star count as
reason number one under the recommendation and calls it "the whole answer", and line 1039 still says
adoption "is what actually defeated the strongest attack on this position". Sections 9 and the
ladder are the two parts of that document a later round will quote, and both carry the refuted
argument with no marker on them.

**And the correction deletes the verdict's stated reason while leaving the verdict.** Four lines
under the correction the unchanged text still reads "the deciding reason is not security. It is that
`gregce/tortie` has 4 stars". Research 66 supplies the missing half. The verdict survives, and the
reason it survives on is in section 8 of this document rather than in any adoption number.

### 2.2 The new question, which is the one this document answers

Assume Tortie launches and finds an audience. **What plugin shape, if any, would be right then?**
Not whether to build it today. What the correct destination is, what would have to be true to start
walking toward it, and what decisions taken now would foreclose it or make it cheap.

### 2.3 What stands from research 65 and is not re-derived here

Three findings survive independently of any adoption number and this document builds on them.

- **Refusals 1, 3 and 6 in `CLAUDE.md` are false against the shipping tree.** A main process worker
  runs third party WebAssembly at `src/main/symbols/worker.ts`, the install sheet browses and
  installs from a remote catalog at `src/renderer/context/install/InstallSheet.tsx`, and
  `build/vendor/` holds four third party binaries.
- **Research 31 section 7.3 carries a three condition gate.** The update channel is met. The command
  layer is not. Three named requests configuration cannot express do not exist. Section 8 repairs
  condition 1, because this round found it is satisfiable by the wrong evidence.
- **The confirm gate defends `agents.json` but not `manifest.db`,** which is mode 0644 and holds
  argv and resume argv, so the shortest route past refusal 8 has no gate on it, accepted
  deliberately as the price of durability. I re-checked the mode myself with `ls -l` and it is
  `-rw-r--r--` (**measured**).

---

## 3. What extending a supervisor even means

Nobody had asked this. Every argument about plugins in research 31 and research 65 borrowed its
shape from editors, and an editor and a supervisor are not extended by the same act. The destination
band took the six plausible candidates apart against the tree, and the result reframes the whole
question.

| Candidate | Verdict | The evidence |
| --- | --- | --- |
| **A new agent** | **Real, and it is the only one that matters** | It already works. `resources/config/examples/01-minimal.json` adds a working durable agent in twelve lines of JSON, and `02-resume-with-a-flag.json` adds one that resumes its conversation |
| **A new status oracle** | **Collapses, and it is nearly empty** | `AgentActivityProfile` at `src/main/agents/registry.ts:291` is four scalars. Of the launchable agents, two have a native channel and the rest take the universal floor |
| **A new capture format** | **Collapses into the agent row** | `src/main/overview/keep-map.json` is 28,944 bytes of pure JSON covering thirteen providers, and its own note says a vendor change edits this file and not the code |
| **A new way to summarise a session** | **Collapses into the agent row** | The fold recipe is argv plus a reader, and four of the five argv builders are templates over four named slots |
| **A new thing that reacts to a session event** | **Genuinely new, and it is refusal 8 in person** | Nothing in the tree exposes a session event to anything a person writes |
| **A new place a session can live** | **Genuinely new, and it is not data** | 36,381 lines across 64 modules under `src/main/machines/` for one new place, which I re-counted myself (**measured**, `wc -l` and `ls | wc -l`; the band reported 62 modules and the line count is exact) |

**The pattern is the finding.** Four of the six collapse into one object, being a description of how
one agent harness behaves, because Tortie's supervising job is the same job for every agent and the
only thing that differs is the description. The two that do not collapse are the two where Tortie is
not supervising anything, which are drawing and reaching a new kind of computer.

**And there is a seventh candidate nobody listed, which is what a real user asks for first.** Give
my agent a new capability. That one does not belong to Tortie at all. It belongs to MCP, to skills
and to the agents' own hook systems, and Tortie already reads all of them. `CONTEXT_CATEGORIES` at
`src/shared/context-snapshot.ts:66` is `skill`, `mcp`, `hook`, `plugin`, `instruction`
(**measured**). Tortie ships a first class category called `plugin` whose whole job is to show a
person the plugins their agents already have.

**So Tortie's plugin system is other people's plugin systems.** That is not a consolation prize. It
is the strongest position available, it is already half built, and it needs no refusal moved.
`topic:mcp-server` returns about 25,600 repositories and `topic:claude-code-plugin` about 5,574 in
roughly ten months (**fetched** by the post launch band). A host that stands between an agent and
that is worse than a host that shows it to you.

---

## 4. The candidate shapes, costed and ranked

The unit of cost is the one thing in this tree that has been measured end to end, being the agent
overlay. **Measured** by the narrow shapes band and re-checked line by line by the third adversary:
`src/main/config/*.ts` is 3,578 lines, its tests are 2,696, `src/shared/agent-overlay.ts` is 874,
`resources/config/README.md` is 504 and `build/conformance-agents.mjs` is 751, for a total of
**8,403 lines**. That is the price of one narrow, gated, documented, conformance checked
configuration format in this codebase. It is a cost measurement and it is sound.

The same band then used the fact that no `agents.json` exists on the operator's machine as a demand
measurement, and that part is the banned move committed again at file granularity. I checked the
directory myself: `~/Library/Application Support/Tortie/gmux/config/` holds `README.md`,
`agents.schema.json`, `examples/` and `machines.json`, and there is no `agents.json`
(**measured**). `config-confirmations.json` holds exactly one confirmation ever and it is a machine
(**measured**, I read the file). Those are pre launch readings of an audience that does not exist,
they carry no information about post launch demand, and this document does not use them as a
baseline for value. The 8,403 lines stay. The zero rows go.

### The ranking, by value per unit of risk, after the adversaries

| Rank | Shape | Value | Execution surface | Cost | Verdict |
| --- | --- | --- | --- | --- | --- |
| **1** | **The substrate document** | High and immediate. Every integration written entirely outside Tortie, in any language | None | 0 | **Ship it.** Owed since Phase 23, survived every attack in this round |
| **2** | **A written ruling on `.tortie/`** | High and urgent. It is the decision being taken by accident | None | 0 | **Take it now.** Section 6.1 |
| **3** | **Per caller channel policy** | Real today, independent of plugins, and it only ever narrows | Reduces one | One module | **Recommend as its own phase.** Section 6.3 |
| **4** | **Terminal palette from the existing corpus** | Real. Themes are the largest category in every ecosystem measured, and 606 schemes already exist | **None** | 0.05 to 0.1 unit | **Cheap and safe at any date.** It is also not what anybody asked for |
| **5** | **Keep map provider blocks as published data** | High for the thing only Tortie has, and it is the shape the gate cannot check | **None.** Nothing in a map can start a process | 0.2 to 0.3 unit | **Held.** Section 4.2 breaks it |
| **6** | **A read only command over the manifest and tmux** | High want, and the promise is the cost rather than the code | **None** | ~0.05 unit of code, and a schema promise on top | **Wait.** Section 4.3 |
| **7** | **`activity` on an overlay row** | Near zero. The three values it can select all belong to other people's agents | None | 0.03 unit | **No** |
| **8** | **A subprocess protocol** | Would be high, and ACP already occupies the ground on terms Tortie cannot take | **Everything the account can do** | ~1 unit, and the parser half is unbounded | **No.** Section 4.4 |
| **9** | **A view plugin** | One plugin in sixty on research 65's own corpus, and it is an embedded browser | Everything, plus the bridge, plus the confirm sheet | 2 or more units | **Refuse permanently.** Section 4.5 |

### 4.1 The thing the round proved, and it is worth having on its own

Research 65 section 10 named as its load bearing unknown whether the four agent tables can be
expressed as data at all, and held the whole agent recipe idea on it. **Three of the four already
are data in the shipping tree, and the fourth was proved expressible.**

- **Context precedence** is data. `src/main/context/agent-context.ts` holds ninety location rows
  over eleven agents, served by thirteen readers named after file FORMATS rather than after agents,
  so an agent using ordinary file layouts costs a row and no code. Its own header says so.
- **The status oracle** is data, and it is the shallowest of the four rather than the deepest. It is
  four scalars per row, and `src/main/activity/oracles.ts` is 100 lines in total, which I checked
  myself with `wc -l` (**measured**).
- **The keep map** is data, literally a JSON file with its own conformance gate.
- **The fold recipe** was the one research 65 said could only be a closed shape list or an expression
  language, calling the second "code with a different file extension". The destination band wrote all
  five fold readers as declarative slot configurations in the grammar Tortie already ships, ran them
  through the shipped evaluator against the real captured bytes, and got ten correct out of ten with
  no throw across fifty hostile inputs. The third adversary re-ran the script and it reproduces
  exactly.

**The dichotomy was false and the third thing is already in the tree.**
`src/main/overview/reader/expr.ts` is a total evaluator with a closed operator set, no loops, no user
supplied functions, no input and no output, and an unknown operator throws by name rather than being
guessed. I counted its arms myself: `grep -c "case '"` returns **25** (**measured**). The destination
band reported fourteen predicates plus eight transforms plus three time formats, which is the same
surface counted a different way.

**So the engineering answer changed and the product answer did not.** Sections 4.2 and 7 say why.

### 4.2 Why the keep map should not be published, which is the finding that decides the destination

The gate that makes the keep map trustworthy cannot see a row somebody else wrote.

**Measured** by the first adversary and consistent with everything I read: `build/conformance-overview.mjs`
is not a schema validator. It is a table of expected results per provider over fourteen committed
fixtures, with entries naming the turn count, the answer count, the keep ratio and the banned
strings, and it fails when a ratio moves more than 0.05 from the banked figure. `CLAUDE.md` states
its whole purpose in one sentence: a vendor change shows up as a ratio that moves before it shows up
as an empty page.

A contributed provider block ships no fixture, no banked ratio and no trap list. Everything after
the thirteenth arrives ungated.

**And the product already says what such a row is worth.** `REFUSED_ROW_FIELDS` in
`src/shared/agent-overlay.ts` refuses the `unverified` field with this sentence, which I read myself
(**measured**):

> 'Tortie does not read unverified from configuration. A configured agent is always shown as
> unverified, because Tortie has measured nothing about it.'

The narrow shapes band found the same fact from the other side and filed it as a virtue, writing
that a new agent is expensive not because it needs code but because every field in the row was
measured on a real machine, and that handing the file to a stranger does not make the measurement
cheaper, it makes it unattested. **That sentence refutes the destination and it is correct.** You
cannot publish the cheap half and keep the expensive half, because the attestation is the value.

**Two measured base rates support the same conclusion from outside.**

- Where the ask is launch metadata, vendors do show up. The ACP Registry has about forty agent
  folders from roughly forty nine outside people since 2025-12-17, most with a single commit each
  (**fetched**). Its `agent.json` carries id, name, version, description and a distribution block,
  and **no field about resume, session stores, log formats, context precedence or status**. Most of
  Tortie's thirteen agents already have an entry there.
- Where the ask is session and log metadata, the measured contribution rate is zero.
  `Dicklesworthstone/cross_agent_session_resumer` does Tortie's hard table in Rust for sixteen or
  more providers, has 106 stars, has been active for six months, and has **144 commits and one
  contributor** (**fetched**). Nobody has ever added a provider to it.

**Modelled**, and the inference is the direction of the incentive: a keep map block is a public
statement of a vendor's internal log schema published as a commitment into somebody else's
repository. The vendor gains nothing they cannot get from their own documentation and takes on an
expectation about a format they change whenever they like. Declining is correct for them, and the
empirical support is the first bullet above, where the same vendors published the cheap third for
free and published this nowhere.

### 4.3 Why the read only command waits, when three bands wanted it first

The narrow shapes band ranked a read only `tortie list --json`, built as a separate program over
`manifest.db` and `tmux -L gmux`, at number one and priced it at about 0.05 of a unit. Two
adversaries broke it in different places and both breaks hold.

**The promise is the cost, not the program.** `src/main/manifest/schema.ts` says "EVERYTHING IN THIS
FILE IS IMMOVABLE" in its own header, carries seventeen migrations, and sits in a repository of 512
commits over sixteen days (**measured** by the second adversary). Publishing its column names turns
an internal invariant, revisable by him for his own reasons, into an external one held for
strangers. The band names this cost in one line and ranks the item first anyway.

**And its headline virtue is false for the field people most want.** `needs_input` is a persisted
column in `SESSION_STATUSES` at `src/shared/types.ts:77`, written by the activity monitor per
verdict and recomputed from tmux at each launch (**measured** by the first adversary from
`src/main/manifest/sessions-repository.ts:140`). With Tortie closed it is frozen at whatever was
true when the app quit. So a status bar built on the read only command shows `needs_input` forever
for a session that finished hours ago, in exactly the condition the band advertises as its
advantage.

**The document does the same work with none of the promise.** `sqlite3` against `manifest.db` and
`tmux -L gmux list-sessions` both work today for anybody who is told they work. Telling them is free.
The command adds convenience and a contract, and the contract is the part that is not cheap.

### 4.4 Why a subprocess protocol is not available, even though it is the shape the field picked

The Agent Client Protocol is JSON-RPC over stdin and stdout, it is at v1 with SDKs in five
languages, and it is implemented by Zed, the JetBrains IDEs, Neovim and Emacs (**fetched**). Its own
overview says agents typically run as subprocesses of the client, and clients provide the interface
between users and agents.

**Tortie's architecture is the exact inverse and it is the first line of `CLAUDE.md`.** Sessions
live in the private tmux server and the app is a disposable client. An ACP session dies when the
window that drew it dies. A Tortie that speaks ACP is a Tortie whose sessions do not survive quit,
crash or reboot, which is the entire product. This is **modelled** and the inference is that the
conversation state has nowhere durable to live when the renderer owns the transcript.

**And Zed already ran the experiment Tortie would be running.** It announced agent server extensions
on 2025-11-06, so an ACP compatible agent installed with one click. On 2026-01-28 it launched the
ACP Registry instead and said a unified distribution mechanism was the better long term answer,
because developers could push updates without waiting for Zed's review and publishing cycle. ACP
extensions were deprecated at v1.5.0, installed ones migrated, and their resources removed
(**fetched**). **The one product in the field that had a plugin type for a new agent deleted it
after eighty three days and replaced it with a data file submitted by pull request.**

The honest use of ACP for Tortie is a read: take identity, display name, icon and version from the
registry when a person names an agent, own everything after that, and never touch the distribution
block, whose `sha256` is optional. That is a fetch and a cache, not a plugin system.

### 4.5 Why a view plugin is refused permanently, and the reason is not isolation

`src/renderer/index.html` pins one policy line and `build/assert-preview-containment.mjs` asserts it
against the built output inside `npm run build`. The preview frame is an iframe with `sandbox=""`
carrying no keywords at all, which means scripts are off entirely. A view plugin is by definition a
thing that runs script, so it needs `allow-scripts`, and research 65 measured what happened when its
own probe turned that on.

Three things stack, and the third is the one that cannot be engineered around.

1. **The prize is the bridge.** 190 invoke channels, one of which types arbitrary bytes into any
   live session.
2. **The primitive under it failed three weeks ago.** CVE-2026-70601, a context isolation bypass
   giving a sandboxed renderer the preload's capabilities. **Remembered**, carried from research 65
   section 3.3 and re-fetched by nobody in this round.
3. **It defeats the confirm sheet.** The sheet is a renderer surface. Refusal 6 of the config gate
   stops a row changing while the sheet is open, and it does not stop the sheet showing one thing
   and hashing another.

**Every other shape in this document rests on that sheet. A view plugin is the one shape that can
lie to it.** That reason is stronger than refusal 1, it survives launch and any audience size, and
it is the best single argument the round produced.

---

## 5. What the field says about the launch to ecosystem path

### 5.1 The category has already answered, and the answer is not a plugin API

Every repository creation date below is **fetched** from the GitHub API and the third adversary
re-checked twelve of them independently.

| Product | Public launch | First extensibility surface | Full extension surface | Gap |
| --- | --- | --- | --- | --- |
| Warp | 2022 | Themes, `warpdotdev/themes` created 2021-09-23 | **Never.** Client open sourced under AGPL on 2026-04-28 instead | No plugin API in five years |
| Ghostty | 2024-12-26 | A key and value config file plus bundled themes | **Never.** Apple Shortcuts on macOS only, 2025-09-15 | Twenty months and counting |
| Zed | 2023 to 2024 | `zed-industries/extensions` created 2024-02-07 | `zed_extension_api` 0.0.1 on 2024-03-20 | About twelve months |
| Raycast | October 2020 | Script commands, repository created 2020-09-29 | `raycast/extensions` created 2021-09-21 | About twelve months |
| Obsidian | March 2020 | CSS themes and snippets | Plugin API alpha 2020-10-26 | About seven months |
| Wave Terminal | 2024 | JSON widgets that can run a command | **Never.** No third party code loads | Config only |
| Claude Code | 2025-02-22 | Markdown commands and `CLAUDE.md` | Plugins and marketplaces 2025-10-09 | About seven and a half months |
| Gemini CLI | 2025-04-17 | `GEMINI.md` and MCP config | Extensions 2025-10-08 | Three to six months, see the note |
| Codex | 2025-04-13 | AGENTS.md and MCP | Plugins, ninety or more by April 2026 | Under twelve months |

**Read the bottom three rows against the top two.** The three agent tools shipped an extension
surface within a year, and every one shipped the same unit, being a directory of files plus
declarations of subprocesses to run. **Not one of them loads third party code into the host
process.** Gemini's own announcement lists what an extension contains: one or more MCP servers,
context files, excluded tools, custom commands. Claude Code's is slash commands, subagents, hooks
and MCP servers in one bundle.

**So the destination shape the category picked is available to Tortie without moving refusal 1 at
all**, and Tortie is already reading it rather than owning it.

One correction to the band that built this table. Its headline range of three to eight months mixes
two bases: the Gemini row anchors its gap to Google's own launch language while its launch column
holds the repository creation date, and repository creation to extensions is 5.7 months
(**measured** by the third adversary). The direction is safe. The precise range is not.

### 5.2 What shipping early actually cost, with the specific thing that could not change

- **Firefox.** From a Mozilla engineer's own account: an XPCOM component used by add ons "simply
  could not be changed in incompatible ways", each one "was quickly accompanied by a
  `nsISomething2`", and "Mozilla delayed Electrolysis by years ... mostly because we did not want to
  lose all these add-ons" (**fetched**). The thing they could not change was running the browser in
  more than one process, and the exit was deleting every XUL add on at once in 2017.
- **VS Code, and this one points straight at Tortie.** Multi root workspaces is the exact analogue
  of Tortie's multi project tabs in one window, which `CLAUDE.md` names as one of the three reasons
  Tortie exists. The team spent four months making VS Code multi root aware, migrated all of its own
  extensions and published a guide telling everyone else to do the same. **Measured** today by the
  post launch band on `main`: `vscode.d.ts` line 13818 still exports `rootPath`, deprecated nine
  years ago, and the directory beside it holds about 178 separate proposed API files. The thing they
  could not change was the assumption that a window has one folder.
- **Zed.** Ten frozen `since_v*` interface worlds and 133,416 bytes of pure compatibility shim in
  the host, against thirteen published versions of the API crate since 2024-03-20, which is roughly
  one breaking interface revision every seven to eight weeks, each one kept forever (**measured** by
  the post launch band, and it matches research 65's independent count of ten worlds).
- **Zed again, on the velocity point.** It shipped slash command extensions in 2024, rewrote its
  assistant into the Agent Panel, and the extension point went with it. An author filed the bug on
  2026-04-13 and it was closed as not planned. The community proposal that followed is not an API.
  It is markdown files in `.zed/commands/`, lifecycle hooks configured as shell commands in
  `settings.json`, and skills (**fetched**).

`CLAUDE.md` records that this tree took 415 commits in thirteen days. **A host that changes at that
rate cannot hold a public interface, and Zed is the measured proof that it deletes extension points
by rewriting the surfaces they hang off.**

### 5.3 A review desk is no longer purchasable at his size, and this fact is dated 2026

Obsidian's own post of 2026-05-12 (**fetched**): more than four thousand plugins and themes, 120
million downloads, initial submissions manually reviewed but subsequent versions not, and they have
now automated scanning of every version because, in their words, they struggled to keep pace,
**"coding agents accelerate the creation of plugins"**, and the queue was only getting longer. They
cleared over 2,300 queued submissions once automation was on.

Every review desk argument in research 65 was priced against humans writing plugins. Obsidian is the
first vendor on record saying agents now write them faster than a small team can read them. **A one
person product cannot open a review desk in 2026.** It can automate or it can not review, and both
are choices to make knowingly rather than discover.

### 5.4 The observable trigger, and why every candidate fails except one

**The demand signal fires before launch and never stops.** Ghostty discussion 2353, "Scripting API
for Ghostty", was created 2023-10-01 (**fetched**). The repository was created 2022-03-29 and
version 1.0 shipped 2024-12-26. **The scripting request arrived fifteen months before the product
launched, it is still open, and it was last updated 2026-07-10 at 60,188 stars.** Warp's plugin
discussion opened roughly at launch in 2021 and the answer came in 2026 and was not a plugin system.
No threshold was crossed in either case.

- **Stars fail.** Ghostty refuses at 60,188. Warp refuses at 64,502. Zed is walking one of its
  extension surfaces back at 89,172. Raycast has fewer stars than any of them and one of the largest
  ecosystems in the set (**fetched**). Stars did not predict a single decision in the table, in
  either direction.
- **Forks fail as an instrument.** A fork carrying a patch measures the people who wanted a change,
  could not get it, and stayed. The people who wanted a change and left leave no trace at all, so
  there is no instrument for non adoption.
- **A consolidating third party index fires after the shape is already lost.** By the time one
  exists somebody else has invented the layout, the naming and the install method. `topic:ghostty`
  returns 862 repositories against a product with no extension surface at all, and `Awesome-Ghostty`
  appeared one day after 1.0 (**fetched**).
- **The one that works is the shape of the requests real people file**, and section 8 states it as
  something he could actually watch.

---

## 6. What is being foreclosed or kept cheap right now

### 6.1 The live one, and nobody in the round except one adversary saw it

**Fetched** by me with `gh api` on 2026-08-25: `gregce/tortie` has 4 stars, 0 forks, Apache-2.0, and
**eleven issues, every one filed by one outside person, `aronchick`**. Five are closed. Eight
arrived on 2026-08-17 and the rest by 2026-08-18. The backlog assesses all of them at its own line
5689 and its ruling on three of them, at line 92, is "Not addressed. Leave alone".

**Issue 11 is open and it asks for this**, and I read the whole body myself (**measured**):

```
.tortie/
  project.json       # optional portable identity and project preferences
  local/             # machine-private project state, ignored by Git
```

Its own words are that the directory "should represent the project's Tortie identity and
project-scoped preferences", that `project.json` should be **portable with the repository**, and
that Tortie must write down an explicit state contract saying what travels with the repository and
what stays private to the machine. To the issue author's considerable credit, the body already
refuses several of the dangerous readings by hand: it says the directory must not become a dumping
ground for secrets or transcripts, and it lists repository safety rules including not editing
tracked files and not exposing session argv or environment to git.

**It is still the container every plugin system in this category grew inside.** `.vscode/`,
`.zed/`, `.claude/` and `.cursor/` all began as project preferences, and every one of them acquired
its extension surface inside a directory that already existed and already travelled with the
repository, because that is the cheapest place to put it. That generalisation is **modelled** from
those four cases and it is not measured on Tortie.

**Here is the exact shape of the foreclosure.** Refusal 8 says a human confirms the bytes, out of
band of any agent turn, and the agreement is bound to a hash of the fields that decide what runs. A
file that arrives with a `git pull`, written by whoever last pushed, is precisely the case refusal 8
exists to stop, and **refusal 8 does not currently know it is being asked**, because the refusals
are written about code, registries and marketplaces and say nothing about a repository local
directory. The decision about whether anything in `.tortie/` may ever name something Tortie runs
will otherwise be taken on a Tuesday, by whoever writes that phase, framed as onboarding.

**This is what waiting actually costs.** It is not a missed ecosystem. It is that the surface gets
decided by accident while everybody is discussing whether to decide it.

### 6.2 What is already cheap, and it is cheap for a structural reason

Tortie never built the thing that forecloses a plugin surface, which is a codebase where reaching
state is easy and reaching it through an owner is optional. Five properties, each with a path,
verified by the foreclosure band and spot checked by me.

1. **There is one invoke door and it already learned a second question.** `src/main/typed-ipc.ts:28`
   is the only `ipcMain.handle` wrapper, held there by a test, and it already carries two admission
   checks before any handler runs, being the trusted sender assertion at line 41 and the quit gate
   at line 50. That quit gate is Phase 144 stage 1, commit `f711dac`, and **it is the proof of
   concept for a capability filter that nobody framed as one**: one line in one function changed the
   admission answer for all 190 channels at once.
2. **The bridge is already a capability object rather than a channel pipe.** `src/preload/index.ts`
   makes one `contextBridge.exposeInMainWorld` call with an object literal of named functions.
   Nothing in the exposed object forwards a channel name, and `InstalledGmuxApi` is an intersection
   of thirty four named member interfaces, so a smaller surface is already a legal type.
3. **The whole outward contract is enumerated byte for byte by a gate.** I read the file myself:
   `docs/audits/contract-baseline.txt` line 5 is `[ipc.invoke.channels] count=190`, generated by
   `build/contract-inventory.mjs` and checked in every stage (**measured**). Plus exactly two
   `ipcMain.on` send channels at `src/main/attach/attach-host.ts:280` and `:300`, which I found
   myself with `grep -rn "ipcMain.on("` (**measured**). VS Code needed proposed APIs because its
   surface was discovered rather than declared. Tortie's is declared.
4. **The confirm gate is a pattern that has already been reused once**, for machines, with its own
   conformance gate and a deliberate refusal to share the field type.
5. **The four tables are data or provably expressible as data**, which is section 4.1.

### 6.3 The one change that most reduces the later cost, and it is worth doing anyway

**Change `trustedSenders` at `src/main/security/trusted-window.ts:84` from a `Set<number>` of window
ids into a map from window id to the set of channels that window may invoke, and give the Settings
window the set it actually uses.**

I verified the shape myself: line 84 is `const trustedSenders = new Set<number>()` (**measured**).
Two windows pass through `applyTrustedWindowPolicy`, the main window at `src/main/index.ts:357` and
the Settings window at `src/main/settings/window.ts:65`, and both name the same preload file. **So
the Settings window can invoke `sessions:kill`, `git:discard`, `fs:writeFile` and all thirty seven
machines channels today.** The Settings renderer names four bridge members directly, being `log`,
`machines`, `scrollback` and `specstory`, and reaches more through shared modules, so four is a
floor rather than the count. Whatever the true number is, it is not 190 and the grant is 190.

Four reasons, in the order the weight falls.

1. **It is the only item on any band's list that changes what the product can refuse.** Every other
   proposal changes what Tortie can describe.
2. **It costs one module now and grows with the surface later.** Two windows and 190 channels today.
   In a year it is several hundred channels, more windows, and a policy table nobody kept.
3. **It pays before any plugin exists.** It closes a real over grant that Electron's own guidance
   would flag, in the one place the guidance says to close it.
4. **It can only ever narrow.** It adds no verb, no file a person writes, no index, no process
   start and no new trust surface. It cannot be cited by a later round as a step toward anything.

**The runner up, named because it is cheaper.** Add one column to
`docs/audits/contract-baseline.txt` marking each channel as internal only or as a candidate for an
outside caller, and have `build/contract-inventory.mjs` require the mark on every new channel. It
records the thing VS Code invented proposed APIs to recover, being which surface was ever meant to
be reachable from outside, written while the person who added each channel still remembers. It is
second only because a record can be ignored and a boundary cannot.

### 6.4 What is quietly not true about the append only rule

The base file header says existing declarations must not be changed and new ones may be appended.
The second adversary walked every commit that touched the baseline and found the count went 124 on
2026-08-15, then **156 on 2026-08-18, down from 158**, then 190 today (**measured** by that
adversary). Commit `d47ecd7`, whose subject is about shutdown ordering, removed two channels, and
diffing the first baseline against the current one names them as `app:setBadgeCount` and
`projects:rename`.

`projects:rename` is a plain user facing verb, exactly what an outside integration would have called
on day one, deleted eleven days after the repository went public inside a commit about something
else. **The surface has never been stable for a single week in either direction, and nothing in the
gate distinguishes a channel removed on purpose from one removed by accident.** That is an argument
against publishing any subset of it soon and an argument for the runner up in 6.3.

---

## 7. What the adversaries broke

Stated honestly, including what broke this document's own recommendation.

### 7.1 They broke the destination three bands converged on

- **The gate cannot see a contributed row.** Section 4.2. This is the fatal one and it is why the
  destination in section 1 is narrower than the one the bands proposed.
- **The proof of the fold as data covers a bit over half of its ground truth.** The third adversary
  counted the shipped test's assertions by field and found twenty two, of which the proof reproduces
  twelve, so 55 percent. The missing ones are `sawResult`, `costUsd`, `window` and `apiErrorStatus`.
  **The band's own gaps list names three of those and never names `sawResult`**, which is the field
  that separates "no answer" from "I could not read this" and is what the product shows a person
  when a fold fails. A whole shipped test case with no number in it, the pi reader ignoring a user
  message, was also not run. The proof is real and it proves the parse half of five readers, not
  four whole tables.
- **The proof was run against the corpus the grammar was designed from.** Ten out of ten on the
  thirteen providers the grammar was built after is a measurement of fit, not of coverage. No band
  named a result that would have made "the tables are data" false, and the cheap falsifying test,
  being take an unmeasured provider and write its block from its logs alone, was not run by anyone
  including the adversaries.
- **Three in thirteen already do not fit.** I counted the containers myself in
  `src/main/overview/keep-map.json`: eight `jsonl`, two `json-doc`, one `sqlite-cursor`, one
  `sqlite-cursoride` and one `none` (**measured**). Two need compiled readers named after one
  vendor and one gets nothing at all.
- **Zero of the eleven real outside requests would be served by any shape the round designed.** I
  read all eleven titles myself (**fetched**). Ten ask for the product to be different and the
  eleventh asks Tortie to read a folder.

### 7.2 They broke a band's measurement, and I arbitrated it myself

The narrow shapes band wrote that the fold recipes' `argv` and `env` are pure template substitution
over four named slots, confirmed by reading lines 110 to 220 of `src/main/overview/fold/recipes.ts`.
The destination band, using a different method, found a conditional. **I settled it with one
command**: `grep -n "PI_MODEL_DEFAULT ?" src/main/overview/fold/recipes.ts` returns line 415,
`...(model === PI_MODEL_DEFAULT ? [] : ['--model', model])` (**measured**). The narrow shapes band's
cited range covers two of the five argv builders. The purity claim is one conditional short of true,
and it was the basis of that band's half shape proposal.

### 7.3 They broke the round's own discipline in two places

- **The narrow shapes band committed the banned move again**, using the absence of an `agents.json`
  on a pre launch machine as a demand baseline for post launch shapes, and defeating itself in the
  same paragraph by naming the real cause. Section 4 keeps its cost unit and discards its demand
  claim.
- **The post launch band read a fork count of zero as a signal today.** It is right that this is
  the signal to watch after launch and it should have said in the same breath that today's reading
  is a reading of an instrument pointed at a product nobody has been shown.

### 7.4 They broke the convergence itself, and this one is aimed at me

The first adversary's charge is that four bands read one codebase and reported back the
architectural choice its author had already made five times, citing his own gates as the proof it
works, and that this is one measurement taken four times rather than four measurements agreeing. The
destination band says so in its own words: the destination is not a new mechanism, it is the
mechanism the codebase already converged on.

**That charge lands and I am not going to argue it away.** The defence is only this. The round did
produce two things that are not a restatement of the operator's preference: the fold proof, which is
a real result even at 55 percent coverage, and the section 4.2 finding, which **overturns** the
destination the bands wanted rather than confirming it. A round that ends by refusing the thing
three of its four bands recommended is not purely an echo. It is also not four independent
confirmations and this document does not claim to be one.

### 7.5 What defeated the adversaries, which is the honest other half

- **The substrate document survived every attack**, because it grants no capability that anybody
  running as this person does not already hold, and it is owed.
- **The terminal palette survived being attacked as premature, as an audience assumption and as a
  support burden.** The supply of 606 schemes exists, `src/renderer/terminal/theme.ts` is 21 hex
  values matching the same 16 plus 5 every scheme carries, `resolveTerminalTheme()` already re reads
  from CSS custom properties at mount, and `src/renderer/theme` has taken three commits in the
  project's whole life against `registry.ts`'s seventeen. One qualification the adversary added
  fairly: the only theme shaped request Tortie has ever received, issue 1, asks for a font family
  and size control in Settings, not for a palette file.
- **The "nobody contributes" claim is false for the launch third.** Forty agents from about forty
  nine outside people in eight months. Vendors do show up when the ask is cheap.
- **No ecosystem cost to waiting could be found, and the attempt was serious.** The direct
  competitor `smtg-ai/claude-squad` has 8,362 stars and 611 forks, and a search of its entire issue
  history for the words plugin or extension in a title returns **one, closed** (**fetched**). The
  category does not have a plugin ecosystem and its users are not asking for one.
- **And the argument against this whole document's calm, which I could not defeat either.** The loop
  that served the one outside user is the operator reading his own issue tracker and shipping five
  fixes in thirteen days. **That loop does not survive four hundred users.** It is one person's
  attention, and attention does not scale. But notice what that argues for: triage, a contribution
  guide, accepting pull requests against a public Apache-2.0 repository that currently has zero
  forks, and saying no in public. Every one of those is cheaper than any shape in this round, and
  **no plugin surface relieves attention. Every one of them consumes it**, because a published
  format with strangers' rows in it is a support obligation and the gate that would answer the
  support questions cannot see those rows.

---

## 8. The recommendation

### 8.1 The destination, stated so it can be argued with

**No third party JavaScript, TypeScript, WebAssembly or native code executes in any Tortie process,
including after launch and including at any audience size.** What replaces a plugin system is three
things, and Tortie already has two of them.

1. **Other people's ecosystems, read.** MCP, skills, hooks, instructions and the agents' own plugin
   systems, shown in one place across every harness a person runs. The differentiated position is
   the seeing, not the owning. Section 3.
2. **Tortie's own tables, kept, and kept as data internally.** The tables are already the right
   shape and the fold proof shows the last one can join them. Keeping them as data is good
   engineering and it makes a fourteenth agent cheap for the operator. **Publishing them is a
   different decision and the answer to that one is no**, because the gate cannot check a
   contributed row and the product already tells a person that such a row is unmeasured.
   Section 4.2.
3. **The substrate, documented honestly.** `manifest.db` and `tmux -L gmux` are readable by
   everything running as this person already. Saying so plainly costs one document, grants nothing
   new, and satisfies the thing research 31 said a refusal needs to be credible.

### 8.2 What would have to be true for this to be wrong

Four things, and each one is checkable rather than a matter of taste.

- **If somebody outside writes a working `agents.json` row and says so, and then hits the `activity`
  refusal, and says that too.** That is testable today with no code and it is the honest first
  signal. Nobody has done it, and there is no telemetry for it.
- **If the requests change shape.** If three named requests arrive that configuration cannot express
  and that first party code should not absorb, the answer moves. Section 8.3 says how to tell.
- **If the keep map gate can be made to check a row nobody banked a fixture for.** That would remove
  the section 4.2 objection, and nobody has proposed a way. A schema validator is not the same thing
  as the ratio gate, because the ratio is what catches a vendor change.
- **If a real second person appears who maintains a fork carrying a patch.** Tortie is public and
  Apache-2.0 with zero forks. Warp spent five years refusing a plugin API and its eventual answer
  was to hand over the source. **Tortie is already more open than Warp was, under a more permissive
  licence, today**, which means the thing Warp took five years to decide is already true here.

### 8.3 The trigger, as something he could actually watch

**Research 31 condition 1 is satisfiable today by the wrong evidence, and it needs one clause.**

As written it asks for three concrete named requests from the operator or real users that
configuration cannot express. **Eleven now exist, from a real user, each with a problem section and
a current behaviour section**, and at least eight of them cannot be expressed by configuration. So
the gate would read as met, and it would fire on evidence that argues for first party work rather
than for a peer. A gate that opens on the wrong evidence is worse than no gate.

**The repair is one clause.** Condition 1 should ask for three named requests that configuration
cannot express **and that first party code should not absorb, because they are one person's taste
rather than the product's job**. Against the eleven real requests that count is zero. Every one of
them is something Tortie should simply do.

**And the honest thing to say about the repair, which nobody in the round said.** It narrows a gate
that has never opened, and on the current evidence it is unsatisfiable. If he wants a gate that can
open, this is not it, and he should say so out loud rather than keep a condition that reads like a
promise. The alternative is to stop calling it a gate and call it what it is, which is a decision he
will take when he wants to, on evidence he will recognise.

**The instrument already runs and it cost nothing.** It is `github.com/gregce/tortie/issues`. It
produced eleven data points in thirteen days and it is the only place in this entire round where a
person outside the operator's head said what they wanted. Watch three things there:

- **The count of requests that are one person's taste rather than the product's job.** Today it is
  zero out of eleven. When it is three, the question is live.
- **The count of identically shaped requests to add a specific named harness**, and the median time
  from that harness existing to Tortie supporting it. That is the Zed signal, and Zed's own move was
  to leave the release path rather than to write an API.
- **A fork that carries a patch, and especially a second person maintaining one.** It cannot be
  gamed by a GitHub topic and it costs nothing to watch.

### 8.4 The three things to do now, and none of them is a plugin

1. **Rule on `.tortie/` in writing, before the phase for issue 11 exists.** The ruling this document
   recommends: `.tortie/project.json` may carry identity and presentation, and it may never name
   anything Tortie runs, being a binary, an argv, an environment value, a working directory, an
   agent id that selects a launch row, or a path Tortie executes. A machine private `local/` may
   hold state and is never portable. If a later phase wants a portable field that decides what runs,
   it goes through the confirm gate on the machine that will run it, per file, and the record says
   so in advance. It costs a paragraph today and it costs an argument in six months.
2. **Ship the two documents research 65 authorized**, being the refusal rewrite and the substrate
   documentation. They are still unwritten. Research 66 adds one sentence to each: the refusal
   rewrite must say that the boundary is about what executes and not about where a file came from,
   so that a repository local file is covered by it; and the substrate document must say, in those
   words, that `tmux -L gmux list-sessions` and `tmux -L gmux send-keys` are the same permission and
   that anything running as you already holds it.
3. **Recommend the per caller channel policy as its own phase**, on its own security evidence rather
   than on any plugin argument. Section 6.3. It is not queued by this record because it deserves its
   own charter, and its verifier should attack the claim that narrowing the Settings window's grant
   breaks nothing, by driving the real Settings window against every member it reaches transitively.

---

## 9. What is not true

Every limit of this research, stated plainly, and it is meant to be at least as thorough as research
65 section 10 was.

### 9.1 The premise this document rests on that nobody checked

**Tortie ships for macOS on Apple silicon only, and no band asked which strangers can run it.**
**Measured** by the third adversary and re-checked by me: `electron-builder.yml` has a `mac:` block
and no `win:` and no `linux:` block, at line 308 and nowhere else (**measured**, `grep -nE
"^(mac|win|linux):"` returns one line). The vendored search binary is
`@vscode/ripgrep-darwin-arm64`, `src/main/shell/shim.ts` execs `/usr/bin/open -n -b
com.itavero.tortie`, and the confirm seal uses the platform key store. The whole round assumed
"launch and an audience" is one event with one meaning. **The first thing a launched developer tool
in this shape hears is a request for the second platform, not a request for a plugin**, and every
mechanism proposed in this round assumes one operating system. This is the largest unchecked premise
in the document and it belongs at the top of this list rather than the bottom.

### 9.2 What nobody measured

- **Whether anyone other than the operator has ever written an `agents.json` row.** No telemetry
  exists for it and nobody looked for any.
- **Whether the keep map grammar covers a provider nobody has measured.** The one proof in the round
  ran against the corpus the grammar was designed from. The cheap falsifying test was named by an
  adversary and run by nobody.
- **Whether the fold's reporting half can be data.** `sawResult`, `costUsd`, `window` and
  `apiErrorStatus` were not modelled at all, and `readRateWindow` alone needs number extraction, per
  field defaults, struct construction and a timestamp that branches on magnitude to tell seconds
  from milliseconds. That is at least four capabilities, not the one the destination band named.
- **Whether `containers.ts`'s `json-doc` reader tolerates a notice printed before the JSON.** The
  proof supplied its own container for that case.
- **Whether an ACP session can be made durable.** Nobody read the `session/load` specification. The
  claim that ACP costs Tortie its durability is **modelled**.
- **What stops a competitor reading a published agent table and shipping the durable session product
  on top of it.** The destination band proposed publishing the one asset nobody else has and never
  asked this. No band touched it. It is moot under this document's answer and it would be the first
  question if that answer were reversed.
- **The true number of bridge members the Settings renderer needs.** Four are named directly, more
  are reached through shared modules, and nobody traced them. That number sizes the section 6.3
  change.
- **Whether narrowing the preload object per window needs a second preload file**, or whether main
  side narrowing at the invoke door alone is enough.
- **Whether a person can meaningfully confirm bytes their own agent wrote minutes ago.** This is
  research 65's open question. It is now known to be the shipping product's documented workflow
  rather than a hypothetical, because `resources/config/README.md:18` is a section headed "Paste
  this into an agent" holding a prompt block that tells the person's own coding agent to write the
  configuration (**measured**, I confirmed the heading and the shipped copy in the data directory).
  **It is more urgent than it was, not less, and it is still unstudied.**
- **What the terminal component does with hostile escape sequences replayed from a snapshot file.**
  Flagged in research 65, still unexamined, and it matters more for a palette than for anything else
  here because a colour is one of the things an escape sequence can set.
- **Whether the platform secret store actually prompts** when another process running as the same
  user asks for Tortie's key. Carried unchanged from research 65 and still **remembered**.
- **Whether any of the 190 invoke channels leaks a secret back to the renderer.** Channels were
  counted. No handler was audited.
- **Whether removing `projects:rename` on 2026-08-18 was deliberate.** The diff and the commit
  subject were read. The commit body was not.
- **Whether the eleven issues were written by a person or by that person's agent.** They are
  unusually well structured. It matters, because if agents are writing the requests as well as the
  configuration then the question of who shows up changes shape entirely, and nobody investigated.
- **Whether `aronchick` is a stranger or a colleague.** Nobody checked. If he is a colleague, section
  6.1 weakens as evidence about strangers and does not weaken as evidence about what requests look
  like.

### 9.3 What is remembered rather than verified

CVE-2026-70601 and its details, carried from research 65 section 3.3 and re-fetched by nobody in
this round. The AGENTS.md adoption figures, being more than 60,000 repositories and thirty or more
tools, which came back from a fetch but are somebody else's counts. Zed's v0.129.1 release notes
moving seven built in languages out to extensions, which is **load bearing for the trigger argument
in section 5** and rests on a search summary because the primary release page could not be reached.
The Codex plugin ship date. The Fig plugin store date and its "400 or more shell plugins" figure,
from a page that returned HTTP 503. Raycast's exact store launch date.

### 9.4 Numbers that disagreed, and how they were settled

- **The bridge channel count.** Research 65 said 204, one band said 169, another said 190. **190 is
  authoritative**, it is in `docs/audits/contract-baseline.txt` line 5, it is generated by
  `build/contract-inventory.mjs` and a gate compares it byte for byte. Plus exactly two `ipcMain.on`
  send channels. Anything above 192 is counting something else. I read both myself.
- **The machines module count.** One band said 62. It is **64** and the 36,381 line figure is exact.
  I ran both.
- **The age of the agent overlay format.** One band said ten days. `git log` on
  `src/shared/agent-overlay.ts` gives `89a5a9a` on 2026-08-13, so twelve days.
- **The fold recipe purity claim.** Settled in section 7.2 by one grep. The conditional is real.
- **Non test line counts.** One band reported 369,332 across 1,058 files against research 65's
  265,117 across 915. Different exclusion patterns, not reconciled, and neither should be used to
  divide anything.
- **The Zed extension count and its theme share.** 1,442 entries in the manifest, 612 returned for
  themes by the API, and the unfiltered query caps at 1,000, so the denominator for a percentage is
  not certain. The direction, that themes are the largest single category, is safe.

### 9.5 Method limits

The three adversaries re-derived the GitHub numbers themselves and otherwise took the bands' fetched
claims on trust, so no external page in section 5 was fetched twice by different agents. I fetched
the `gregce/tortie` repository, its eleven issues and the full body of issue 11 myself, and I ran
every local command marked as mine. No band drove the application, started an Electron or touched
tmux, by instruction, so nothing here is evidence about running behaviour.

**And the one that should be said last.** Research 65 was corrected because a premise nobody flagged
was load bearing. This document rests on the premise in 9.1 and on the premise that the eleven
issues are representative of what a launched audience would ask for. Eleven requests from one person
is a better instrument than four stars and it is still one person. If a later round finds that
premise load bearing and wrong, it should say so at the top of this document the way this one says
it at the top of 65.

---

## 10. Sources

Local, all read on 2026-08-25 at `083ce2d`: `src/main/security/trusted-window.ts`,
`src/main/typed-ipc.ts`, `src/main/attach/attach-host.ts`, `src/shared/agent-overlay.ts`,
`src/main/agents/registry.ts`, `src/main/activity/oracles.ts`, `src/main/context/agent-context.ts`,
`src/main/overview/keep-map.json`, `src/main/overview/reader/expr.ts`,
`src/main/overview/fold/recipes.ts`, `src/main/overview/fold/readers.ts`,
`src/main/manifest/schema.ts`, `src/renderer/terminal/theme.ts`, `src/shared/context-snapshot.ts`,
`src/main/machines/`, `resources/config/README.md`, `electron-builder.yml`,
`docs/audits/contract-baseline.txt`, `build/conformance-overview.mjs`, `CLAUDE.md`,
`docs/research/31-extensions.md`, `docs/research/65-plugins-reconsidered.md`, `docs/BACKLOG.md`.

External, fetched 2026-08-25: `api.github.com/repos/gregce/tortie` and its issues,
`api.github.com/repos/agentclientprotocol/registry`,
`api.github.com/repos/Dicklesworthstone/cross_agent_session_resumer`,
`api.github.com/repos/smtg-ai/claude-squad`, `api.github.com/repos/mbadolato/iTerm2-Color-Schemes`,
`api.github.com/repos/tmux-plugins/tpm`, `api.zed.dev/extensions`.
https://agentclientprotocol.com/protocol/overview ·
https://agentclientprotocol.com/registry ·
https://zed.dev/blog/acp-registry ·
https://zed.dev/blog/agent-extensions ·
https://zed.dev/blog/zed-decoded-extensions ·
https://zed.dev/docs/extensions/agent-servers ·
https://github.com/zed-industries/zed/issues/53760 ·
https://github.com/zed-industries/zed/discussions/57943 ·
https://github.com/ghostty-org/ghostty/discussions/2353 ·
https://ghostty.org/docs/install/release-notes/1-2-0 ·
https://github.com/warpdotdev/warp/discussions/435 ·
https://www.warp.dev/blog/warp-is-now-open-source ·
https://docs.waveterm.dev/customwidgets ·
https://obsidian.md/blog/future-of-plugins/ ·
https://yoric.github.io/post/why-did-mozilla-remove-xul-addons/ ·
https://github.com/microsoft/vscode/wiki/Adopting-Multi-Root-Workspace-APIs ·
https://code.visualstudio.com/api/advanced-topics/using-proposed-api ·
https://blog.google/innovation-and-ai/technology/developers-tools/gemini-cli-extensions/ ·
https://claude.com/blog/claude-code-plugins ·
https://www.raycast.com/blog/how-raycast-api-extensions-work ·
https://blog.jetbrains.com/fleet/2025/12/the-future-of-fleet/ ·
https://github.com/anthropics/claude-plugins-official/issues/585 ·
https://github.com/simonw/claude-code-transcripts

---

**Provenance.** Written 2026-08-25 by the synthesis agent of a four band, three adversary research
workflow, from `/Users/gdc/gmux` at `083ce2d`, version 0.73.1. No code was changed, no Electron was
started and no tmux was touched. This document corrects the headline of
`docs/research/65-plugins-reconsidered.md` and supersedes none of it.
