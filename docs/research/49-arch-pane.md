# Research 49. The Arch pane, a map of the project built from the code

**Status.** Research only, requested by the operator on 2026-08-15. It schedules nothing and
changes no phase. The single deliverable is this document. The operator decides what, if
anything, becomes a phase.

**Method, and where it broke.** The workflow commissioned twelve verified research bands, four
competing designs, twelve adversarial attacks and three independent judgments. The twelve bands
ran. One design arrived at the judges and at synthesis and three did not, so only three of the
twelve attacks had a target and the other nine never ran. All three judges reported the same
absence independently, and the three missing designs are not on disk in the session scratchpad
either. So this document compares one design against the evidence rather than four designs against
each other. Section 3.1 accounts for every attack, one row each. Section 3 says what the absence
costs the confidence of the recommendation, and section 12 lists it first among the things that are
not true.

---

## 1. The answer

**Build the extractor. Do not build the canvas yet. Put a measured gate between them.**

The deterministic half of this feature is cheap and correct, and nothing in nine research bands
matches its cost. It computes a project map from the code using tools the app already ships:

- the tree-sitter parser
- ripgrep
- git

On this repository the scan takes about 1.2 s cold and about 0.4 s on a warm rescan. Both of those
figures are **projected** from measured parts and neither was measured end to end. The scan costs
zero tokens. It adds two new npm packages, and both are permissive and pure JavaScript. It changes
none of the following:

- No network access is used.
- No new spawned process is added.
- No entitlement changes.
- The Content Security Policy does not change.
- No native code enters the bundle.

The drawn half does not hold up against the evidence on this repository, and it holds up better on
others. I ran the recommended design's own import resolution rules over six of the operator's
repositories this morning. On gmux, across 621 non-test source files under `src/`, the complete set
of distinct cross-group edges is **three**, and all three point at `shared`. Adding a path-alias
resolver the design does not currently specify adds no new edge at all. It only raises the weight
on the three edges that are already there. There are **zero** edges between `main`, `renderer` and
`preload`, which are the three processes that make up the product. The reason is structural rather
than a bug. 65 renderer files call `window.gmux` and none of them import the preload, because that
is what a bridge is for, and the 149 declared invoke channels are strings rather than imports. An
import graph draws the couplings a codebase makes cheap and misses the ones it deliberately makes
expensive.

The other five repositories are denser, and they change the shape of the answer. Two Next.js
applications produce 14 and 13 distinct cross-group edges. A third Next.js application produces 8.
A Go command line tool produces 6. A Cloudflare Worker produces 0. The measured median across all
six repositories is **7**. Section 3.3 gives the full table. So gmux is the least favourable case
in the operator's own corpus rather than a typical one, and the gate below settles the question
with that number rather than with this paragraph.

Set that beside what a canvas costs Tortie. The largest recent feature phase in this repository is
4,982 insertions across 34 files, and the median is about 2,300 insertions. Both of those are
measured. A canvas slice is six pieces of new code:

- a hand-written SVG surface
- a layout engine binding
- a layout reconciliation algorithm
- a graph keyboard model with no ARIA pattern behind it
- a new `EditorMode` arm
- a conformance gate with a git fixture

Together those are an **estimated** 7,500 to 11,500 insertions across 40 to 55 files. That estimate
is judge 3's and section 12.2 records what it rests on. It is two to three phases, and on this
repository it buys a drawing with three edges.

All three judges reached the same conclusion by three different routes and none of them was told
the others' verdicts.

**What to build, in order.**

The owned-code column is an estimate in every row. Section 12.2 says what each estimate rests on.
The tiers are the ones in section 11 and they are per phase, not per table.

| # | Phase | What ships | Owned code, estimated | Tier | Tokens |
|---|---|---|---|---|---|
| A | Map freshness | One `git log` per existing AS-BUILT document, comparing the document's last commit to HEAD, shown as a plain sentence. No pane, no drawing, no schema | 100 to 300 lines | 1 and 2 | 0 |
| B | Structure and provenance | Import edges from five new tree-sitter queries, the alias resolver, nine provenance classifiers with an evidence receipt each, an edge table in the disposable `symbols.db`, surfaced as a **sidebar list**. No MCP server and no drawing | 1,500 to 2,500 lines | 2, plus a conformance gate | 0 |
| **Gate** | **Measure** | Run phase B's extractor over the operator's real repositories and count distinct cross-group edges after alias resolution. It is free, because phase B computes them anyway. **Pass value: the median repository produces at least 8 edges.** See below | 0 | n/a | 0 |
| C1 | Serve the structure to the user's own agents over MCP stdio | Hand-written newline-delimited JSON-RPC framing, no SDK, passed on the argv of a session the user creates | about 400 lines | **3**, because the argv lands in the manifest and touches restore | 0 |
| C2 | The canvas | Only if the gate passes | 4,000 to 7,000 lines | 2 | 0 |
| D | The names overlay | `.tortie/arch.names.json`, its schema, its validator, rename following, the naming-prompt composer | 800 to 1,200 lines | 2 | About $0.04 to $0.15 per naming pass, and the pass is optional |
| E | The checkable contract | Coverage percentage, divergences at weight 2 or more, the unmapped-file check | 400 to 700 lines | 2 | 0 |

**The gate has a number, and it is 8.** Proceed to phase C2 only if the median repository in the
operator's own set produces at least 8 distinct cross-group edges at the level 0 partition after
alias resolution. The number 8 is the low end of GitDiagram's shipped budget of 8 to 30 edges,
quoted in section 9.7, which is the only shipped per-level edge budget found in the whole survey.
**Measured today by a stand-in script rather than by phase B's extractor, the median across six of
the operator's repositories is 7, so the gate does not pass.** It is close, and two of the six
repositories clear it comfortably at 13 and 14. Phase B replaces the stand-in with the real
extractor, and the gate is re-run then.

Phase A is the highest value item in the entire corpus and it needs none of the rest. Thirteen of
the operator's 30 AS-BUILT documents are more than 250 commits behind their own repository, one of
them by 583 commits, and nothing told anyone. Phase A would have caught all thirteen for about 200
lines of code and no tokens.

**A Zen change is required, and the proposed one is not the minimum.** Two of its four edits should
be accepted and two rejected. The full text and the single accept-or-reject decision are in
section 8.

---

## 2. What the operator asked for

### 2.1 His words

He sent a north star, quoted here in full because every section below is measured against it.

> "What I most acutely lack when working on big LLM-built projects is a macro-scale overview. Here
> is my pie-in-the-sky setup:
>
> - A giant wall, blackboard (E Ink?) preferably, that is a digital, infinitely zoomable canvas
> - All the major components of the projects are visible (Mermaid-style, boxes-and-arrows
>   diagrams), connections, dataflows, etc.
> - You would just stand in front of it and point and riff: What is happening over in this piece?
>   Where is that data coming from? Which API?
> - You could have the interface rendered as well, and talk through the design: Make these headers
>   bigger, let us use sans serif fonts here, can we do a more playful animation moving between
>   these sections?
> - But most importantly, you could have collaborators stand there with you and talk through it
>   all, pointing, riffing, all the while Claude or whatever listens, responds, implements
>
> This kind of interface, combined with thousands or tens of thousands of tokens per second
> response times, is a tool I look forward to using."

And here is his own framing of the ask. He wants a new first class pane called Arch, beside the
file explorer, search, SCM and Context panes. It maps the project architecture, built with LLMs, into a visual
interface you can explore. Its state must be more abstracted than a file tree, but not so deep
that a person cannot reason about it. It should be like a canvas. It could be kept up to date in a
separate shadow git repo if that helps, augmented by an LLM, so that named parts are easy to
inspect. He said the Zen of Tortie may need to be upgraded for this, because he considers the
feature important.

### 2.2 The plain reading of what is underneath it

Six wants are in that paragraph. They are not equally deliverable and they are not equally
important, and separating them is most of the work of this document.

| # | The want, stated plainly | Deliverable inside Tortie today? | Where it lands |
|---|---|---|---|
| 1 | Know what this project is made of, above the level of files | **Yes** | Phase B, as a list. Phase C2, as a drawing |
| 2 | Know which parts we wrote and which we borrowed | **Yes, and better than any human-written document** | Phase B. A person forgets to update a dependency list. `package.json` cannot |
| 3 | Know when the description no longer matches the code | **Yes, and this is the cheapest item** | Phase A |
| 4 | Ask where data comes from and which API | **Partly.** An import edge does not answer either question. A URL literal answers the second one badly | Phase B for the literal scan. The rest is not extractable |
| 5 | Stand at a wall and point, with a collaborator beside you | **No** | Not deliverable. See below |
| 6 | An agent listening to the conversation and implementing | **No** | Not deliverable. See below |

Wants 5 and 6 break the charter outright and no design in this workflow delivers them.

- A shared wall with two people at it needs a hosted service. Research 48 killed a hosted
  component twice already, once as reaching sessions from a phone and once as sharing a live
  session with another person, both on the same rule.
- Voice needs `com.apple.security.device.audio-input` plus a usage string.
  `build/entitlements.mac.plist` carries three entitlements and a comment saying that adding one
  is a paragraph in a phase brief rather than a quiet addition.
- An agent that listens and implements is the agent the operator already runs in a Tortie session.
  Tortie itself may never call a model provider. The renderer's Content Security Policy has no
  `connect-src` and `build/assert-preview-containment.mjs` pins the string byte for byte.
- The rendered interface, with headers made bigger and fonts changed by conversation, is a
  different product. Nothing in this workflow addresses it.

So the honest translation of the ask is wants 1 to 4, on one machine, for one person, with no
network. That is a smaller feature than the paragraph describes, and the operator should read that
sentence before reading anything else in this document.

### 2.3 The one thing he already does that nobody built for him

He has written **30 distinct AS-BUILT-ARCHITECTURE.md documents** across his projects, totalling
52,719 lines. The median is 1,174 lines and the largest is 7,050. Twenty-seven of the 30 draw the
system with box-drawing characters, and there are 555 unlabelled code fences across the corpus
whose only reason to exist is that plain text was the only canvas available.

That corpus is the specification for this feature, and section 9 derives the whole design from it
rather than from anything invented here. It is also the strongest single piece of evidence that
the need is real, because he did the work by hand thirty times with no tool asking him to.

It is also the strongest evidence for phase A. Measured against git history:

| Document | Commits behind at the time of measurement |
|---|---|
| `intent/intent-cli/pkg/tui` | 583 |
| `intent/intent-web/lib/arena-agent` | 441 |
| `stoa/stoa-cli/pkg/tui` and five siblings | 377 each |
| `getspecstory/lore` | 307 |
| `stoa/stoa-web` and both `space-agent` documents | 291 |
| `specstory-sync/workers/lore-cloud-worker` | 256 |
| `findunmet/docs/architecture` | 13 |
| `deadreckon/docs` | 0 |

**Counting the groupings in that table, thirteen of the 30 documents are more than 250 commits
behind.** An earlier draft of this document said eight in four places, which did not match its own
table. The figure is thirteen.

Fourteen of the 30 carry a self-reported `Last Updated` line. Sixteen do not. The self-reported
ones cannot be trusted, because the number is typed by whoever last remembered.

---

## 3. The verdict table

### 3.1 The workflow failure, stated first

The workflow was designed to produce four competing designs. Only one reached the judges. Either
only one was produced, or only one survived propagation, and which of those happened is not
recoverable from what is on disk. The three judges each opened their judgment by saying so, and none
of them knew what the others would say.

| Judge | What arrived in that judge's context | What that judge did |
|---|---|---|
| Judge 1, the charter and refusals seat | Design 1 in full, plus its three attacks | Scored design 1, left three rows empty, refused to invent scores |
| Judge 2, the retention seat | Design 1 in full, plus its three attacks | Same |
| Judge 3, the build-and-keep cost seat | Design 1 in full, plus its three attacks | Same |

**The twelve attacks, one row each.** The workflow commissioned three adversarial attacks per
design. Only design 1 existed, so only its three attacks could run. The other nine had no target.

| Attack | Target design | Report arrived? | What it produced, and where the fix lands |
|---|---|---|---|
| 1 | Design 1 | Yes | Findings reached synthesis inside the design-1 attack set. **Which of the six mandatory fixes in section 4.2 came from which of adversaries 1 and 3 is not recoverable**, because the attack files are not on disk and only adversary 2 is cited by name in the material that reached synthesis |
| 2 | Design 1 | Yes | The timing measurements in section 4.7, being the ripgrep enumeration and content scan, the `git ls-tree` batch, the `git log --name-only` walk on two repositories, and the monorepo projection in section 12.2. It also corrected design 1's 33 ms costing of the content scan to 120 ms warm and 270 ms cold |
| 3 | Design 1 | Yes | Same as attack 1. Not separately attributable |
| 4, 5, 6 | Design 2 | **Never delivered** | Design 2 was never produced, so its attacks had no target and produced nothing |
| 7, 8, 9 | Design 3 | **Never delivered** | Same |
| 10, 11, 12 | Design 4 | **Never delivered** | Same |

**No adversary finding was rejected at synthesis.** Every finding that reached this document was
adopted, which is itself a weak signal, because a set of findings with no rejections in it is more
likely to be incomplete than to be perfect.

Three independent reports of the same absence is corroboration rather than a single glitch. The
practical effect on this document is precise and should not be overstated or understated.

- It **does not** weaken the evidence. The twelve research bands ran and are intact, and they are
  the reusable part.
- It **does not** weaken the measurements. Every number below was measured by an adversary, by a
  judge or by me, and the load-bearing ones were re-measured at synthesis.
- It **does** weaken the claim that the recommended shape is the best shape. It is the best of
  one, improved by three adversaries and three judges. If one of the three missing designs
  solved the empty-graph problem in section 3.3, this recommendation would change.

### 3.2 The scores

Scores are out of 10 and are the mean of the three judges where they agreed within one point, and
the range where they did not. Design 1 is the only design with content behind its row.

| Design | Honesty when wrong | Staying current | Month three | User cost | Owned code | Licence risk | Fit | Mean | Deciding reason |
|---|---|---|---|---|---|---|---|---|---|
| **1. Static first, "Ground Truth"** | 4 to 6 | 9 | 3 | 9 | 3 to 5 | 9 | 5 | **6.0 to 6.6** | **Recommended in part.** The extractor is the best engineering in the workflow and it is cheap. The canvas draws three edges on gmux and 0 to 14 across six of the operator's repositories, at a median of 7, so it is deferred behind a measured gate |
| 2. NOT DELIVERED | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Never reached any judge or synthesis. Not scored, and no score was invented for it |
| 3. NOT DELIVERED | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Same |
| 4. NOT DELIVERED | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Same |

**Where the judges disagreed, and both readings.**

| Axis | Judge 1 | Judge 2 | Judge 3 | The disagreement, stated rather than averaged |
|---|---|---|---|---|
| Honesty when wrong | 6 | 6 | 4 | Judges 1 and 2 scored the omissions as fixable and directional, since the design fails toward silence rather than invention. Judge 3 scored the same facts harder because a blank space between two boxes is unfalsifiable, and gave it 4. Both readings are defensible. The 4 is the one to act on, because the fix is cheap and the difference between the two scores is exactly the missing-edge vocabulary |
| Cost to Tortie in owned code | 5 | 5 | 3 | Judges 1 and 2 read the design's own module list. Judge 3 measured the repository's actual phase sizes and the closest analogue subsystem, and produced 7,500 to 11,500 insertions across 40 to 55 files. Judge 3's number is the only one with a measurement behind it, and it is the one this document uses |
| What to do about the canvas | Build three narrower things instead. No gate proposed. **The three items are not recoverable.** They were not itemised in the judgment text that reached synthesis and judge 1's report is not on disk, so this document cannot say what they were or give a deciding reason on each | Build the extractor, not the pane. No gate proposed | Fund three phases with a measured edge-count gate before the canvas | All three say defer. Only judge 3 proposed a mechanism for un-deferring it. This document adopts judge 3's gate, because a permanent no to something the operator asked for explicitly should have a way back. **Judge 1's alternative is unreviewable and is recorded as such rather than reconstructed** |

**Where all three agreed, without conferring.**

1. The extractor should be built.
2. The canvas should not be built first, and possibly not at all.
3. Zen edits 1 and 3 should be accepted and edits 2 and 4 rejected.
4. The design's headline claim, that a model can never create a node, is false as written, because
   section 9.2 of the design lets a model create groups and a group is a level 0 box.
5. The licence position is clean and correctly reasoned.

### 3.3 The measurement that decided it

I re-ran this myself at synthesis rather than trusting the adversary report, because it is the
single most load-bearing number in the document. The first pass ran on gmux alone. A later pass ran
the same rules over five more of the operator's repositories, because gmux is an Electron
application whose three processes talk over 149 string channels and a preload bridge, which is the
shape most hostile to an import graph. A sample of one, taken on the least favourable case, is not
a basis for a recommendation.

**On gmux.** The design resolves a path alias only from a `tsconfig.json` `paths` block or a Vite
alias block that parses as JSON. Tortie's root `tsconfig.json` is `{"files": [], "references": [...]}`
and has no `paths` block. The four `paths` blocks live in `tsconfig.main.json`,
`tsconfig.preload.json`, `tsconfig.node.json` and `tsconfig.web.json`. The Vite alias is
`alias: { '@shared': resolve(__dirname, 'src/shared') }`, which is a TypeScript call expression and
does not parse as JSON.

Across 621 non-test source files under `src/`:

| Edge set | Distinct edges | Detail |
|---|---|---|
| Cross-group edges the design resolves today | **3** | `preload -> shared` at 20 imports, `main -> shared` at 1, `renderer -> shared` at 1 |
| Cross-group edges with a full alias resolver added | **3, unchanged** | The alias resolver adds **no new edge**. It raises the weight on the same three, to `renderer -> shared` at 218, `main -> shared` at 180 and `preload -> shared` at 20. An earlier draft of this document reported 5 here, which double counted two node pairs that the relative-import pass had already found |
| Edges between `main`, `renderer` and `preload` | **0** | In both cases |
| Bare package specifiers, correctly not repository edges | 624 | |

Every resolved edge points at `shared`. The two couplings that are the product, being the renderer
talking to main across 149 declared invoke channels and 65 files calling `window.gmux`, are not
drawn in either case.

**On five more of the operator's repositories.** Same rules, same definition of a group, being the
top-level directory partition under the source root, which is the level 0 partition in section 9.7.
An edge is a distinct ordered pair of groups, matching the design's `ArchEdge` id of
`${fromId}|${kind}|${toId}`, so repeated imports between the same pair raise the weight and do not
add an edge.

| Repository | Kind | Source files | Groups | Distinct cross-group edges | Heaviest edge |
|---|---|---|---|---|---|
| `stoa/stoa-web` | Next.js application | 1,198 | 11 | **14** | `app -> lib` at 1,092 |
| `intent/intent-web` | Next.js application | 878 | 11 | **13** | `app -> lib` at 670 |
| `findunmet` | Next.js application | 392 | 8 | **8** | `app -> lib` at 364 |
| `stoa/stoa-cli` | Go command line tool | 326 | 4 | **6** | `cmd -> pkg` at 161 |
| `gmux` | Electron application | 621 | 4 | **3** | `renderer -> shared` at 218 |
| `specstory-sync/workers/lore-cloud-worker` | Cloudflare Worker | 35 | 3 | **0** | none |

**The median is 7.** Three findings follow and the third is the one that matters.

1. **gmux is the worst case in the corpus, not the typical one.** The three Next.js applications
   produce 8 to 14 edges, which is 2.7 to 4.7 times gmux's 3.
2. **A degenerate partition produces a degenerate graph.** The Cloudflare Worker scores 0 because
   all 35 of its source files sit under one directory, so the top-level partition puts them in one
   group. The fix is a partition that descends when the top level has fewer than 5 members, which
   is the subtree-proportional rule in section 4.2.6, and phase B must implement it or the gate
   measures the partition rather than the code.
3. **The level 1 partition is a different world, and it is too dense rather than too sparse.** At a
   two-segment partition, `stoa/stoa-cli` produces 119 distinct edges across 39 groups and
   `findunmet` produces 230 across 77 groups. That is well past Ghoniem's twenty-vertex
   legibility limit in band 6, so level 1 needs the cap and the clustering in section 9.7 rather
   than more edges.

The general form of the sparse case is still real and it is still the reason the gate exists. A
well-factored codebase hides its real seams behind interfaces, channels, dependency injection,
events and string keys, precisely so that they are not imports. So the better the architecture, the
emptier an import-derived map. The tool is most informative on the code the operator is least
interested in looking at. What the five extra repositories change is the scope of that claim. It
describes a process-boundary application like gmux, and it does not describe a Next.js application
where `app`, `lib`, `components` and `hooks` import each other directly.

---

## 4. The recommended design in full

This is Design 1's extractor, with the six fixes the adversaries proved are mandatory, staged so
the canvas is a separate decision. It is written at the level a phase brief could be built from.

### 4.1 The shape, before the detail

```
  THE CODE  (the user's repository, working tree)
      |
      |  ripgrep enumerate  ---+
      |  manifest read      ---+   all in main plus worker_threads.
      |  tree-sitter parse  ---+   no model. no network. no new spawn path.
      |  literal scan       ---+
      |  git oids + log     ---+
      v
  arch tables inside symbols.db      <userData>/gmux/symbols.db      DISPOSABLE
  the whole graph. deleting the file costs one rescan.
      |
      |  merged at read time with
      v
  .tortie/arch.names.json     in the user's repo, tracked, about 12 KB
  names, one-line summaries, group labels, doc pointers.
  NO node list. NO edge list. NO coordinates.
      |
      v
  gmux.arch.*     localStorage, per project
  which group is open, which node is selected, scroll position.
```

Three properties follow from that shape and they are the reason to keep the premise.

1. **The graph cannot go stale, because it is recomputed rather than stored.** Only names can age,
   and section 7 says how that is measured.
2. **Tortie never writes into the user's repository.** The user's own agent writes the names file,
   in a session the user already created, and the user commits it. Tortie has a read path and a
   validate path and no write path at all.
3. **Tortie adds no spawn path.** The only child processes are ripgrep and git, both of which
   Search and SCM already spawn on every repository change today.

#### 4.1.1 Which surface each phase occupies, and why it moves

The operator asked for a pane beside Explorer, Search, SCM and Context. The recommendation starts
there and then moves the drawing to an editor tab. That is a real change from the ask and it should
not be discovered halfway down this document.

| Phase | Surface | Why |
|---|---|---|
| A | No new surface. One line on the Explorer row for a matching document, and one line at the top of the markdown preview | Phase A has nothing to put in a pane. It annotates two surfaces that already exist |
| B | **The sidebar rail**, as a new `'arch'` entry in `SIDEBAR_VIEW_IDS`, drawn as a list | This is the pane the operator asked for. A list of parts with provenance and a receipt fits the rail, because the rail already holds the Explorer tree and the Context list |
| C1 | No surface at all | It is an MCP server the user's own agent reads. Nothing is drawn |
| C2 | **An editor tab**, as a new `EditorMode` arm | Measured, the rail cannot hold the drawing. At a default 1440 px window the sidebar is about 300 px wide and the editor region is about 500 px, and a level 0 drawing of 5 to 9 boxes is about 620 px. The drawing does not fit either region without scrolling, and the rail is the worse of the two by 200 px |
| D | The panel inside whichever of B or C2 exists | Names and prose attach to a selected node |
| E | The same panel, plus one header line | A coverage percentage is a sentence, not a surface |

So the feature is a rail pane first and an editor tab later, and both can exist at once. The rail
list is the durable half and it is what phase B ships. The editor tab is the half behind the gate.

### 4.2 The data model, field by field

This lives in a new leaf module, `src/shared/arch.ts`, following the `src/shared/symbols.ts`
precedent of putting payload shapes beside the channel declarations.

#### The node

```ts
export type ArchNodeKind =
  | 'system'     // the repository. exactly one.
  | 'group'      // a partition over components. level 0.
  | 'component'  // a directory. level 1.
  | 'module'     // one file. level 2, materialised on demand only.
  | 'package'    // a declared dependency. has no path in this repository.
  | 'binary'     // an executable this repository spawns.
  | 'service'    // an external network endpoint.
  | 'store'      // a database, a bucket or a durable file location.
  | 'platform';  // a deployment target.

export type ArchProvenance =
  | 'own' | 'vendored' | 'dependency' | 'native' | 'tool'
  | 'service' | 'store' | 'generated' | 'platform';

export interface ArchEvidence {
  relPath: string;       // repo-relative, POSIX separators, no leading "./", no ".."
  line: number;          // 1-based. 0 means the whole file is the evidence.
  quote: string;         // verbatim from the file, at most 200 characters. never paraphrased.
  contentHash: string;   // 40 hex. the hash of the BYTES READ, not the HEAD blob. see 4.2.1.
}

export interface ArchNode {
  id: string;                 // ^[a-z0-9][a-z0-9._/-]{0,127}$  derived from the path.
  kind: ArchNodeKind;
  parentId: string | null;    // null only for the single 'system' node.
  generatedName: string;      // always present. from the path, or the package name.
  paths: string[];            // repo-relative. empty for package, service, platform.
  contentId: string | null;   // git tree oid for a directory, blob oid for a file.
  provenance: ArchProvenance;
  provenanceEvidence: ArchEvidence | null;  // null only for 'own'.
  fileCount: number;
  symbolCount: number;
  byteCount: number;
  languages: Record<string, number>;  // grammar id to file count.
  unparsedFileCount: number;          // files here in a language with no grammar.
  unfollowedCallFileCount: number;    // MANDATORY FIX 2. see 4.2.2.
  extractorVersion: string;           // bumping it invalidates every cached row.
}
```

Three notes that matter more than the field list.

- **The id is derived from the path**, e.g. `main.symbols` for `src/main/symbols`. It is not a
  uuid and it is not an index. The layout band measured that a shuffled node array moves nodes by
  an average of 1,037 px on a 4,224 px drawing, so id stability is what keeps the picture still.
- **`provenance` is required.** It has no `unknown` value that everything falls into, and every
  value except `own` carries a receipt naming the file and the line that decided it. This is the
  one job where a manifest reader beats a human author, because a person forgets to update a
  dependency list and `package.json` cannot.
- **`unparsedFileCount` and `unfollowedCallFileCount` are on the node**, not only in a summary
  line, so a part built mostly of Swift says so where the user is looking.

#### 4.2.1 Mandatory fix, read one tree

Design 1 enumerates and parses the working tree in steps 2 and 6 and takes content ids from
`git ls-tree HEAD` in step 9. Those disagree for every dirty file, and this repository has 26
modified files and 3 new files right now, which is the normal state of a machine running agents.

Three consequences, all bad and all avoidable.

| Consequence | Why it matters |
|---|---|
| `ArchEvidence.blobOid` names a blob the quote was not read from | The receipt is the design's own strongest claim, and it becomes a false statement |
| The header sentence reads `Read from HEAD at <sha>` | It did not read from HEAD. That sentence is the one nominated to stop the reader transferring old staleness fear onto the new pane |
| The incremental cache key `(relPath, blobOid)` has no value for an untracked file | Either the file is reparsed on every refresh, or it is cached against null and an agent's edits to a new file are invisible until it is committed |

**The fix.** Read the working tree everywhere, and replace `blobOid` with the hash of the bytes
actually read, computed with `git hash-object` semantics and never written to the object store. It
equals the blob oid when the file is clean and is a truthful receipt when it is not. The header
sentence becomes `Read from the working tree at <sha> plus 29 uncommitted changes.`

#### 4.2.2 Mandatory fix, a vocabulary for the edge that is not there

This is the difference between judge 3's honesty score of 4 and judges 1 and 2's score of 6, and
it is the fix that closes it.

Design 1 has two words for a drawn arrow, being `extracted` and `inferred`, and no word at all for
an arrow that exists in the code and cannot be seen. A blank space between two boxes renders
identically whether the extractor looked and found nothing or could not look. A drawn arrow can be
clicked and disproved by its own receipt. A missing arrow cannot be clicked, so the belief in it is
never tested.

**The fix, costing one field and one pass that already runs.** During the literal ripgrep scan,
count per node the files containing a construct this reader does not follow.

| Construct | Why the import scan misses it |
|---|---|
| `window.gmux` or any global object dispatch | 65 files in this repository. Not an import |
| A declared IPC channel string used with `invoke` or `handle` | 149 channels in this repository. Pairing them is string matching |
| A dynamic `import(` with a non-literal specifier | The target is not in the syntax |
| A `require(` with a non-literal argument | Same |
| A dependency-injection container registration | The edge is created at runtime |
| A `Reflect` call or a string-keyed dispatch table | Same |

Store the count as `unfollowedCallFileCount`. Show it in the node's own panel, and show one line
in the header, e.g. `41 files use a call form this reader does not follow. Some arrows are
missing.` This does not recover the arrows. The tool then reports that arrows are missing instead
of omitting them without comment.

#### The edge

```ts
export type ArchEdgeKind =
  | 'contains' | 'imports' | 'declares' | 'spawns'
  | 'reads' | 'writes' | 'calls' | 'deploys-to';

export type ArchDerivation = 'extracted' | 'inferred';

export interface ArchEdge {
  id: string;               // `${fromId}|${kind}|${toId}` . deterministic, so it is also the key.
  fromId: string;
  toId: string;
  kind: ArchEdgeKind;
  derivation: ArchDerivation;   // 'extracted' = the syntax says so. 'inferred' = a literal matched.
  weight: number;               // how many file-level facts rolled up into this edge.
  label: string | null;         // one or two words, extracted verbatim, never written.
  evidence: ArchEvidence[];     // at most 8, in path order. the rest are counted in weight.
  extractorVersion: string;
}
```

`derivation` has exactly two values on purpose. Graphify ships three, adding `ambiguous`, and a
third value invites an argument about which bucket a case belongs in. Two values map onto two line
styles, which is all a drawing can carry legibly.

#### The overlay, and why it cannot invent a component

```ts
export interface ArchOverlayEntry {
  id: string;              // MUST resolve to an ArchNode.id. an unresolved row drops whole.
  name?: string;
  summary?: string;        // one sentence, at most 200 characters.
  notes?: string;          // markdown. BOUNDED at 8,000 characters. see 4.2.3.
  group?: string;          // SEE THE BLOCKING DECISION BELOW.
  docPath?: string;        // repo-relative markdown file. SAME PATH RULES AS ArchNode.paths.
  docAnchor?: string;
  namedAtTree: string;     // the node's contentId when this row was written. drives staleness.
  author: 'human' | `agent:${string}`;
}

export interface ArchOverlay {
  schema: 1;
  writtenAtCommit: string; // 40 hex. the commit the writer was looking at.
  entries: ArchOverlayEntry[];  // maxItems 512. sorted by id, ascending, by UTF-8 bytes.
}
```

There is no `nodes` array and no `edges` array. A model handed this schema has no way to express a
component, a module, a package, a service, a store or any edge between them.

#### 4.2.3 Blocking decision, the `group` field

All three judges flagged this and one called it fatal to the premise as written. The design's own
premise says a model "may never create a node", and its section 9.2 says the model "may create a
group by naming one that no component currently carries". A group is what a level 0 box is. So the
model can author every box on the default screen, and nothing in the schema, the validator or the
proposed conformance gate rejects it.

**Take one of two positions and write it into the schema. Do not ship both sentences.**

| Position | What it costs | What it buys |
|---|---|---|
| **A, recommended for round one.** Drop `group` entirely. Grouping is the deterministic directory partition in section 9.7 and the overlay renames only | The model cannot fix a bad partition | The premise becomes literally true, the gate can prove it, and the Zen sentence "A person may never move a box the code did not put there" stops being false |
| B. Keep the override, rewrite the premise | The premise becomes a longer sentence naming six node kinds and all edges | A person can regroup. Requires a second gate assertion that the level 1 node set and edge set are byte-identical with and without the overlay applied, and a marker on the level 0 drawing when a partition override is in effect |

#### 4.2.4 Mandatory fix, `docPath` and `notes` are the only agent-written fields that reach a reader

`ArchNode.paths` has stated path rules. `ArchOverlayEntry.docPath` had none, and it is the only
path field an agent writes. An agent writing `"docPath": "../../.ssh/config"` would have its
contents rendered in the prose panel of the main renderer.

Three fixes, all small.

1. Apply the `paths` rule to `docPath`, being POSIX separators, no leading `./`, no `..` segment.
2. Resolve it and verify with `realpath` that the result is still inside the repository root before
   reading. Reject the row whole with a named reason otherwise. `src/shared/fs-ops.ts` already
   refuses `.git` at any depth and is where the existing helper lives.
3. Render `notes` and the `docPath` section through the **existing** markdown pipeline at
   `src/renderer/editor/markdown/pipeline.ts`, which composes `rehype-raw` then `rehypeSanitize`
   with the project schema. Do not write a second pipeline. Bound `notes` at 8,000 characters and
   drop the row whole above it with a named reason.

#### 4.2.5 Mandatory fix, follow a rename before dropping a row

Renaming a directory changes every id under it, so every name the user wrote for that subtree is
dropped as unresolved. Renaming a directory is one of the most common architectural edits there is,
and this is data loss in the one file the design puts in the user's repository.

The fix is one git process on the overlay read path only. For any entry whose id does not resolve,
run `git log --diff-filter=R -M --name-status` once and try the renamed path. The staleness band
measured that command at 115.8 ms over 217 commits. Report the recovery rather than performing it
silently, e.g. `3 names followed a rename from src/main/sessions.`

#### 4.2.6 Mandatory fix, a deterministic budget instead of a clock

Design 1 caps a scan with a 20 s wall clock deadline and draws the partial graph. That makes the
node set, the edge set and therefore the grouping a function of machine load, which contradicts
the word the design is named after. The proposed conformance gate cannot catch it, because the
fixture is small enough that it never reaches the deadline.

| Replace | With |
|---|---|
| A 20 s wall clock deadline that yields a partial graph | A file-count cap and a byte cap applied over a canonically sorted file list, so exceeding the budget still produces reproducible output |
| A flat prefix cap in directory order | A subtree-proportional cap, so every top-level directory gets a share and no branch of the alphabet vanishes whole |
| A clock as the budget | A clock only as a hard abort that produces **no graph at all** and says so. A missing map states that it is missing. A timing-dependent map does not state that its contents depend on machine load |

#### 4.2.7 Mandatory fix, persist the coverage record with the graph

A scan truncated by a cap must not be indistinguishable from a complete one after the app
restarts. Store the coverage record on the scan row, being parsed count, total count, per-language
unparsed counts, and which cap fired. The graph read channel returns it, so the header line is a
property of the stored graph rather than of the scan that happened to produce it.

### 4.3 The on-disk format and its location

**Purpose-built JSON with a hand-written JSON Schema, at `.tortie/arch.names.json` at the
repository root, tracked in git.** Plus arch tables in the disposable `symbols.db`, opened through
`openGmuxDatabase`. Plus `gmux.arch.*` in localStorage for view state.

#### Why not a published format

The format band's finding was that criterion 1, meaning a model can write it, and criterion 4,
meaning a manual layout survives, cannot be satisfied by the same file, because one requires no
coordinates and the other requires them. Under this design that conflict disappears, because there
is no manual layout to preserve. The layout is a function of the graph and the graph is a function
of the code, so every format that demands coordinates is excluded on its first field.

| Format | SPDX or standing | Deciding reason it loses |
|---|---|---|
| **Purpose-built JSON plus a hand-written schema** | Ours | **Chosen.** The only shape with no node array, which is what makes the premise structural rather than aspirational |
| JSON Canvas 1.0 | MIT | Four required pixel fields on every node. Spec file unchanged since 2024-04-11. No metadata mechanism, and issues about extensibility have been open for 2 years 5 months |
| Mermaid text | MIT | No metadata slot at all, so a box cannot map to a file. Its only linking construct is `click`, disabled by the default `securityLevel: 'strict'` |
| D2 | MPL-2.0 | Position keys `top` and `left` work only in TALA, which D2's own documentation calls proprietary and closed source and lists "Not free" as a con |
| Structurizr JSON | Apache-2.0 | `ElementView` carries `x` and `y` as int, and it drags the whole C4 metamodel. It is a Java serialization artifact, not something a model authors |
| GraphML | Specification only | The cleanest typed metadata of any candidate, and it never left release candidate in 23 years. Schema dated 2003-03-18 |
| CALM 1.2 | Apache-2.0 | `relationship-type` is a closed set of exactly five. It cannot say "spawns a subprocess" |
| Excalidraw | MIT | Four fields per element are documented as random or regenerated on every change, so two writes are never byte-equal |
| tldraw `.tldr` | Proprietary | The licence forbids production use, enforces a licence key and states the software may transmit usage data |
| LikeC4 | MIT | Round-trips a layout by writing a base64 msgpack blob into a JSDoc comment. 892 bytes of unreadable text for an eight node view |
| Markdown with frontmatter | n/a | No node identity, no edge model, no validation. Correct for prose, and this design uses it for exactly that through `docPath` |

#### Why inside the repository

| Reason | Weight |
|---|---|
| The freshness number requires the names and the code to share one git history. `git rev-list --count <writtenAtCommit>..HEAD` is meaningless across two repositories | Decisive. This is the highest value affordance in the corpus evidence |
| The names travel with the project and arrive in the pull request diff. At 12 KB that is a review a person can actually do, which a 375 KB document is not | Strong |
| Cline shipped an out-of-repo shadow git repository for its checkpoints, deleted that code, and now writes private refs inside the user's own repository under `refs/cline/checkpoints/...`. Roo Code kept the shadow and ships an error reading `Checkpoints can only be used in the original workspace` | Strong. Two products tried both answers and the one that changed its mind moved toward the repository |

**On the operator's shadow repository idea.** The band tested it properly and it loses, but not for
the reason one would guess. A custom ref such as `refs/tortie/arch` genuinely works, costs about
1.0 KB per revision packed, survives `git clean -xdff` and never touches the working tree. It
leaks into four places, being `git log --all`, `git for-each-ref`, `git push --mirror` and
`git bundle create --all`. It loses on one thing that matters more than any of those. Split the
map from the code and the "377 commits behind" number cannot be computed, and that number is the
feature. A separate `GIT_DIR` with `core.worktree` loses harder, because it binds an absolute path
at init and returns `fatal: this operation must be run in a work tree` after a move, which is
exactly the error Roo Code ships.

#### Byte rules, so two writes are identical

No format on the list specifies deterministic serialization, so this is engineered.

1. A hand-fixed key order in the writer, documented in the schema so an agent produces the same
   order.
2. `entries` sorted by `id`, ascending, by UTF-8 bytes.
3. Two-space indent, LF line endings, one trailing newline.
4. No wall-clock timestamp anywhere. `writtenAtCommit` is the only time-like field and git supplies
   the date.
5. A tracked `.gitattributes` line reading `.tortie/arch.names.json merge=binary`. This needs no
   per-clone configuration, because `binary` is one of git's three built-in merge drivers, and it
   turns a concurrent edit into one clean whole-file conflict instead of corrupted JSON with
   markers inside it.

`resources/config/agents.schema.json` is 281 lines and is the precedent for the schema.
`src/main/config/overlay.ts` is the precedent for the narrow hand-written parser. `ajv` is already
a devDependency at `^8.20.0`, so a build-time validation gate over the schema and its examples
costs no new package.

### 4.4 The packages, with licences

Every SPDX identifier below was read from a LICENSE file or a published `package.json` on
2026-08-15, not recalled.

**The operative test for refusal 6, stated once so the rejections below are consistent.** Refusal 6
forbids third-party native code inside the signed bundle, and the table below both ships native
code and rejects packages for shipping native code. The distinction is the number of binaries and
where they come from, and it is worth stating plainly because an operator reading the table will
ask.

| Shape | Example in this table | Allowed? | Why |
|---|---|---|---|
| One binary per package, built from source on this machine at install time, then signed with Tortie's own identity and stapled into the notarized bundle | `better-sqlite3` | **Yes, and it already ships** | `electron-rebuild` compiles it locally, so the bytes in the bundle are bytes Tortie produced and signed. Library validation stays on, because nothing loads a library signed by somebody else |
| One prebuilt binary per package, downloaded from npm and re-signed with Tortie's identity | `@vscode/ripgrep` | **Yes, and it already ships** | One binary, one platform, one signature applied by Tortie's own notarization step. The audit surface is one file |
| A set of per-platform prebuilt binary packages that npm selects between at install time, e.g. 18 or 19 `optionalDependencies` | `typescript@7`, `knip` through `oxc-parser`, `ast-grep` through `@ast-grep/napi`, `@anthropic-ai/claude-agent-sdk` | **No** | The identity of the binary is chosen by the package manager rather than by the build, the set changes between releases without a code change here, and each one is a separately signed artifact from a separate publisher. Signing all of them under Tortie's identity is not a step anyone can audit, and not signing them needs `com.apple.security.cs.disable-library-validation` app-wide and permanently |

So the operative test is this. **One native artifact that Tortie's own build produces or re-signs is
allowed. A per-platform set that npm resolves is not.** Every rejection row below that cites
refusal 6 cites it for the third shape.

| Package | SPDX | Native code? | Status | Verdict for a signed Apache 2.0 binary |
|---|---|---|---|---|
| `web-tree-sitter` 0.26.12 | MIT | No, pure WASM | Already shipped | Compatible. Its `Tree.getChangedRanges(other)` is present in the installed types and unused today |
| `@vscode/tree-sitter-wasm` 0.3.1 | MIT | No | Already shipped | Compatible. Six grammars at 4.8 MB. No seventh is added |
| `@vscode/ripgrep` 1.18.0 | MIT | Binary, signed with Tortie's identity | Already shipped | Compatible. The only gitignore implementation in the app |
| `better-sqlite3` ^13.0.3 | MIT | Yes, signed with Tortie's identity | Already shipped | Compatible |
| `fuzzysort` 4.0.1 | MIT | No | Already shipped | Compatible. p50 ranking round trip 2 ms at 60,000 files |
| `react-markdown` 10.1.0 with `rehype-sanitize` 6.0.0 | MIT | No | Already shipped | Compatible. Renders the prose panel |
| `@vscode/codicons` ^0.0.46-24 | MIT, icons CC-BY-4.0 | No | Already shipped | Compatible. The nine provenance glyphs |
| `ajv` ^8.20.0 | MIT | No | Already a devDependency | Compatible. Never ships |
| **`@dagrejs/dagre` 3.1.1** | **MIT** | **No** | **NEW, phase C2 only** | Compatible. Published 2026-08-08. One transitive dependency, `@dagrejs/graphlib` 4.0.5, also MIT. No platform packages. Note the scope: the unscoped `dagre` last published 2019-12-03 and must never be cited |
| **`d3-hierarchy` 3.1.2** | **ISC** | **No** | **NEW, phase C2 only, and probably not even then** | Compatible. Zero dependencies. Last published 2022-04-02. Its only use is treemap area encoding, which is not in the first canvas slice, so it should not enter the bundle until it is called |

**The rejections, with the deciding reason on each.**

| Rejected | SPDX | Deciding reason |
|---|---|---|
| `elkjs` 0.12.0 | **EPL-2.0 OR GPL-3.0-or-later** | EPL-2.0 section 3.1(a) attaches a source-availability obligation to distributing the binary, and the GPL arm is worse. 7,858 KB unpacked against dagre's 1,380 KB, for layout quality that does not matter at 30 nodes. GitHub's detector reports NOASSERTION, so a badge would get this wrong |
| Graphviz via `@viz-js/viz` 3.29.0 | Wrapper declares MIT, core is **EPL-2.0** | Graphviz moved from CPL-1.0 to EPL-2.0 effective 2026-03-07. The tarball ships **no LICENSE file at all**. A permissive wrapper does not relicense the EPL bytes inside the wasm |
| Graphviz via `@hpcc-js/wasm-graphviz` 1.28.0 | Wrapper Apache-2.0, core **EPL-2.0** | Same, and the package ships only the Apache text with no Graphviz notice anywhere |
| `tldraw` 5.3.1 | **Proprietary** | The Conditions section says "Not to use the Software in Production Environments" and "Not to disable, change, or interfere with the Software's License Key enforcement". The Technical enforcement section says the software "may collect and transmit usage data to tldraw", which the CSP blocks, which would put Tortie in breach of a licence it cannot satisfy |
| `@xyflow/react` 12.11.3 | MIT | Licence is fine. Its viewport is an inline `transform` with `transform-origin: 0 0`, which is the mechanism `src/renderer/zoom/regions.ts` rejected because the layout box stops agreeing with `clientX`. Its base stylesheet carries 34 hardcoded colour literals, and it ships a minimap, a control bar, an attribution panel and its own icons |
| `mermaid` 11.16.1 | MIT | 81,589 KB unpacked, 1,171 files, 21 runtime dependencies including `katex` and `roughjs`, to produce a static SVG. Keep it as a text export target, which costs nothing |
| `@cosmograph/cosmos` 3.4.1 | **CC-BY-NC-4.0** | Non-commercial only. Tortie belongs to an LLC. Note that `@cosmos.gl/graph` at the same version number is MIT from a different repository, so anyone reaching for this renderer must name the right one |
| `@joint/core` 4.3.1 | MPL-2.0 | File-level copyleft, and the paid tier is where the layout work lives |
| `gojs` 4.0.3 | Proprietary | Commercial licence |
| `bpmn-js` 18.24.0 | MIT **with a watermark clause** | Its LICENSE says the bpmn.io watermark "MUST NOT be removed or changed" and "must stay fully visible". Its base framework `diagram-js` is plain MIT with zero occurrences of the word watermark, which is why `diagram-js` is the credible fallback and `bpmn-js` is not |
| `@modelcontextprotocol/sdk` 1.30.0 | MIT | Licence is fine and maintenance is fine, with 1.30.0 published 2026-07-27. It loses on dependency weight. 17 runtime dependencies including `express`, `hono`, `cors` and `jose`, to obtain newline-delimited JSON-RPC. The specification itself says the stdio binding "is just newline-delimited JSON-RPC over a byte stream". Hand-write the framing |
| `@anthropic-ai/claude-agent-sdk` 0.3.233 | **`"SEE LICENSE IN README.md"`** | Not an SPDX grant, and it declares 8 optional platform-specific binary packages. **Refusal 6, third shape**, being a per-platform set npm resolves rather than one artifact Tortie's build produces. Latest 0.3.233 published 2026-08-14, so it is actively maintained and that is not the reason it loses |
| `knip` 6.32.2 | ISC | Depends on `oxc-parser`, which is a Rust napi binding with 19 platform packages, plus `oxc-resolver` with at least 19 more. **Refusal 6, third shape.** `knip` itself is excellently maintained, last released 2026-08-11, so maintenance is not the reason it loses |
| `universal-ctags` | **GPL-2.0**, no linking exception | A source-offer obligation on a notarized bundle, and it gives strictly less than tree-sitter already gives |
| `semgrep` | **LGPL-2.1** | Licence, and its cross-file dataflow is the paid Pro engine only |
| `Sourcebot` | **FSL-1.1-ALv2** | Source available, not open source, with a competing-use ban |

**Deferred rather than rejected.** `@scip-code/scip` 0.9.0, Apache-2.0, 163,122 bytes unpacked,
one pure-JavaScript dependency `@bufbuild/protobuf` 2.14.0, no native code. It is the only legal
route to accurate cross-file references, and it reads an artifact rather than producing one. Out
of scope for round one because Tortie must never run the indexer and no round-one repository will
have a SCIP file. It is the right answer if the gate in section 1 fails on edge count and someone
still wants edges.

**Packages named elsewhere in this document but never proposed for the bundle.** These appear only
inside a rejection or as an existing transitive dependency, so they carried a licence and no
maintenance signal. The last-publish dates were read from the npm registry on 2026-08-15. None of
them changes a verdict.

| Package | SPDX | Latest | Published | Where it appears |
|---|---|---|---|---|
| `@dagrejs/graphlib` | MIT | 4.0.5 | 2026-08-03 | The one transitive dependency of `@dagrejs/dagre` |
| `dagre-d3-es` | MIT | 7.0.14 | 2025-12-03 | Mermaid's layout engine, in band 4 |
| `graphology-metrics` | MIT | 2.4.0 | 2025-05-21 | The PageRank rejection in band 6 |
| `graphology-communities-louvain` | MIT | 2.0.2 | 2024-12-17 | The community-detection row in band 6 |
| `rehype-raw` | MIT | 7.0.0 | 2023-08-26 | Already in the existing markdown pipeline, named in fix 4.2.4 |
| `plantuml-parser` | Apache-2.0 | 0.4.0 | 2023-03-27 | The ArchUnitTS rejection in band 10 |

### 4.5 Process boundaries

| Process | What runs there | Modules |
|---|---|---|
| **Main** | The scan orchestrator, the manifest reader, the provenance classifier, the import resolver, the roll-up, persistence, the overlay reader and validator, the IPC registrar | `src/main/arch/service.ts`, `manifests.ts`, `provenance.ts`, `resolve.ts`, `rollup.ts`, `persist.ts`, `overlay.ts`, `ipc.ts` |
| **worker_threads** | tree-sitter parsing only. Reuses `src/main/symbols/pool.ts` at at most six transient workers. **No new resident pool**, per research 19 §O5, which allows one resident worker for quick open and at most six transient for symbols and refuses a third without deleting one of these | `src/main/symbols/pool.ts`, `worker.ts`, `extract.ts` |
| **Spawned** | ripgrep, twice per scan. git, twice per scan. Nothing else, ever | `src/main/search/resolve.ts`, `src/main/git/` |
| **Renderer** | The store, the list or the drawing, the keyboard, the side panel, the header line | `src/renderer/arch/**` |
| **Preload** | One const object of invoke wrappers, added to the single `api` object. There is exactly one `contextBridge.exposeInMainWorld` call in the codebase and this adds none | `src/preload/arch.ts` |

The import boundary rule is enforced at `npm run typecheck` by `build/assert-import-boundaries.mjs`.
It gains one line: `src/main/arch/**` may not be imported from `src/main/manifest/**` or
`src/main/restore/**`, so Arch can never appear on the create path or the restore path.

### 4.6 The IPC surface

One new domain file, `src/shared/ipc/arch.ts`, joining the three compositions in
`src/shared/ipc/index.ts`. Six invoke channels and one event channel. **There is no write channel,
and that deliberate absence is what keeps refusal 8 clean.**

| Channel | Contract | Notes |
|---|---|---|
| `arch:scan` | `{repoPath, mode: 'full' \| 'incremental'}` returns `{started, scanning, epoch}` | **Corrected from Design 1.** It must actually mirror `symbols:ensure`, which returns immediately and guards re-entry with an `indexing` flag and an `epoch` counter. Design 1 declared it as returning the full result, which means it is awaited and two overlapping scans both persist |
| `arch:graph` | `{repoPath, level, groupId?}` returns the level plus the persisted coverage record | Never starts a scan. Answers from the database and reports what is missing |
| `arch:evidence` | `{repoPath, edgeId?, nodeId?}` returns evidence plus a truncated count | Fetched on selection only |
| `arch:overlay` | `{repoPath}` returns accepted entries, rejected rows with field and reason, `writtenAtCommit`, `commitsBehind`, and a **whole-file failure arm** | The whole-file arm is a fix. An agent writing the file non-atomically produces a parse failure that is not a bad row, and falling back to directory names for a moment is worse than saying so |
| `arch:namingPrompt` | `{repoPath, groupIds?}` returns prompt text, target path, estimated tokens, node count | Composes only. Runs nothing, spawns nothing, writes nothing. **Composed from extractor output only, never from overlay values**, and asserted in the conformance gate with a marker string, so one agent's text cannot reach another agent's input |
| `arch:release` | `{repoPath}` | Mirrors `symbols:release` |
| `arch:progress` (event) | `{repoPath, phase, parsed, total, epoch}` | Throttled to at most one message per repository per 120 ms, as symbols does |

Five edits wire it, and all five follow the Phase 42 pattern:

1. The domain file.
2. Four lines in `src/shared/ipc/index.ts`.
3. A preload file added to the one `api` object.
4. A main registrar with a disposer.
5. A call from `installMainCapabilities` in `src/main/capabilities.ts`.

Outside the IPC domain, and only when a pane exists: `'arch'` added to `SIDEBAR_VIEW_IDS` and
`SIDEBAR_VIEW_LABELS`, one `--zoom-arch` rule in `zoom.css`, one `KeymapEntry` in group `views`
**with `menuAction: 'show-arch'`**, `'show-arch'` in the `MenuActionId` union, and one View menu
item. The menu item matters because `src/shared/keymap.ts` line 771 records that Context shipped
without one by accident, and Arch should not repeat it.

### 4.7 The numbers

Measured parts are marked. Projections are marked and must be re-measured before they are quoted
to anyone.

| Operation | Repository | Value | Source |
|---|---|---|---|
| Symbols cold build | gmux | 351 ms | Measured, recorded in `src/main/symbols/service.ts` |
| Symbols cold build | 645-file TypeScript repo | 300 ms | Measured, same |
| Symbols cold build | 285-file Go repo | 453 ms | Measured, same |
| Incremental parse | per changed file | 1.25 ms | Measured, same |
| `rg --files` | cmux, 12,925 files | 20 ms warm, 40 ms cold | Measured by adversary 2 |
| `rg` content scan, 5 patterns | cmux, 12,925 files | 120 ms warm, 270 ms cold | Measured by adversary 2. **Design 1 costed this at 33 ms, which was from a small crate tree** |
| `git ls-tree -r -d` into `cat-file --batch-check` | gmux, 153 directories | 33.6 ms, one process | Measured by adversary 2 |
| The same, as 20 separate `git rev-parse` calls | gmux | 275.3 ms | Measured. 8.2 times worse for one eighth of the work |
| `git log --name-only` | gmux, 218 commits | 110 ms warm, 200 ms cold | Measured by adversary 2 |
| `git log --name-only` | cmux, 9,275 commits | 500 ms warm, 1,290 ms cold | Measured. **This scales with history depth and Design 1 did not budget for it** |
| `git log --diff-filter=R -M` | gmux, 217 commits | 115.8 ms | Measured by the staleness band |
| Full five-rung git pass | gmux | 414.4 ms, five processes | Measured by the staleness band |
| Context warm scan, ten agents | gmux | 67 ms to 85 ms | Measured, recorded in the Context source |
| Context cold page cache | gmux | 596 ms | Measured, same |
| SQLite fsync median at `synchronous=NORMAL` | n/a | 0.0116 ms, against 4.1083 ms at FULL with fullfsync | Measured, recorded in `src/main/db/sqlite.ts` |
| **Arch cold scan** | **gmux, 621 non-test source files** | **about 1.2 s** | **Built from measured parts. Not itself measured** |
| **Arch warm rescan** | gmux | **about 0.4 s** | Projection |
| **Arch incremental after a 20-file change** | gmux | **about 200 ms** | Projection: 60 ms enumeration, 90 ms git, 25 ms parse, 20 ms roll-up |
| **Arch cold scan** | **a 5,000-file repository** | **about 2.5 s to 4 s** | **Projection only. Must be measured before it is quoted** |
| **Arch cold scan** | a 25,000-file repository at the cap | about 12 s to 18 s | Projection only |
| Optional naming pass, one turn, no tool calls | any | about 7,600 input and 2,500 output tokens, so **$0.04 on Claude Sonnet 5 list prices**, and **$0.05 to $0.15 modelled for a CLI, which bills differently from list prices**, in about 20 s | Arithmetic over verified 2026-08-15 prices of $2 per million input and $10 per million output. **No agent was run**, so the CLI figure is a model rather than an observation |
| Agent driven to read the repository and write the document | a 5,000-file repository | **$9.10 on Sonnet 5 in 14 to 30 minutes**, or $22.74 on Opus 5 in 20 to 41 minutes, or $3.51 on Haiku 4.5 | Modelled by the agent band from verified prices. Turn counts are modelled, not observed |

Here is the comparison that carries the premise. A first map costs about $0.04 to $0.15 and about
25 seconds this way, against about $9.10 and 14 to 30 minutes for the agent-authored route. That is a
factor of roughly 100 in cost and roughly 40 in wall clock, and it is why the naming pass can be
re-run casually whenever names drift.

---

## 5. The twelve research bands

Each band ran a live web sweep on 2026-08-15 and then a second pass that re-read primary sources
rather than search snippets. Every SPDX identifier below came from a LICENSE file or a package
manifest. The candidate tables are the reusable part of this document, so they are preserved in
full rather than summarised.

**One methodological warning that applies to all twelve.** The session's WebSearch budget of 200
calls was exhausted before the deep pass began. Every band therefore verified by fetching URLs it
already knew, by the GitHub REST API, by the npm and PyPI registry APIs, by the arXiv and Crossref
APIs, and by downloading tarballs. That is stronger evidence per claim and weaker coverage overall.
A tool that only surfaces through a search engine could be missing from every table below.

### Band 1. Deterministic extraction of a code graph

**The answer.** Two things can produce a code graph inside a signed bundle and Tortie already owns
one. The first is the `web-tree-sitter` pass that `src/main/symbols/` already runs, extended with
import captures and an edge table. The second is reading a SCIP index somebody else produced,
which is now a solved problem because an official pure-JavaScript SCIP reader exists. Everything
else is an external binary, a native npm package, a JVM process or a server.

**The honest limit, checked in the tree.** `src/main/symbols/queries.ts` is 245 lines and every
capture in all five hand-authored queries is a `@definition.*`. There is not one `@reference.call`
and not one import capture. `src/main/symbols/persist.ts` is 254 lines and creates two tables with
no edge table. Upstream tags queries do carry `@reference.call`, but that capture is a bare name
inside one file, so turning it into an edge is name matching. code2flow says of its own name
matching that a perfect call graph for a dynamic language is "not possible", and Jelly, which does
real analysis, calls its own results "intentionally not fully sound". **An Arch canvas that draws
call arrows from tags queries will draw wrong arrows.**

| Candidate | What it does | SPDX | Last release | Maintenance | Key number | Verdict |
|---|---|---|---|---|---|---|
| **web-tree-sitter** | Parses source to a syntax tree in WASM | MIT | 0.26.12, 2026-08-08 | Very active | Tortie's own cold build 351 ms, 1.25 ms per changed file | **Use.** Already in the bundle, pure WASM, no codesigning cost |
| **@scip-code/scip** | Generated TypeScript reader for the SCIP schema | Apache-2.0 | 0.9.0 | Actively tracking the spec | 163,122 bytes unpacked, one dependency, zero native packages | **Use, later.** Makes reading a SCIP artifact a dependency rather than a build |
| **@bufbuild/protobuf** | Pure JavaScript protobuf runtime | (Apache-2.0 AND BSD-3-Clause) | 2.14.0 | Active | Zero runtime dependencies | Use, as the transitive of the above |
| SCIP protocol | The wire format | Apache-2.0 | v0.9.0, 2026-06-29 | Active. Repo moved to `scip-code/scip` | 10 language indexers listed | Consider the format. Reject the Go CLI for the bundle |
| rust-analyzer `scip` | Emits a resolved SCIP index for Rust | MIT OR Apache-2.0 | n/a | Active | `cmd scip` confirmed in `flags.rs` | Consider as a user-confirmed executable only |
| typescript@6.x | The JavaScript TypeScript compiler API | Apache-2.0 | 6.0.0-beta | End of the JS line | Zero dependencies, main is `lib/typescript.js` | Consider. Needs a build assertion pinning below 7.0.0 forever |
| typescript@7.x | The Go native compiler | Apache-2.0 | 7.0.2 | Very active | **18 platform packages in `dependencies`**, not merely optional | **Reject.** Refusal 6 |
| ts-morph | Wrapper over the compiler API | MIT | 28.0.0 | Active | 2 runtime dependencies | Consider. Same coverage limit as typescript@6 |
| dependency-cruiser | File and module import edges plus rules | MIT | 18.2.0, 2026-08-10 | Excellent | 18 runtime dependencies, **zero** native | Consider. Rejected only because tree-sitter can do this in one pass for all six grammars |
| es-module-lexer | Extracts ESM import and export metadata | MIT | 2.3.1 | Active | Zero dependencies | Consider. Covers only ESM |
| knip | Module and export-level edges | ISC | 6.32.2, 2026-08-11 | Excellent | **19 native platform bindings via `oxc-parser`**, plus more via `oxc-resolver` | **Reject.** Refusal 6 |
| madge | Import edges, cycles | MIT | 8.0.0, **2024-08-05** | Stalled 2 years | 2 years since release | Reject. Superseded |
| skott | File import edges | MIT | not shown | Active, 379 commits | Unverified | Reject. No advantage over dependency-cruiser |
| jelly | A real JavaScript call graph | BSD-3-Clause | 0.13.0, 2026-05-11 | Alive, Aarhus University | README offers `--timeout` for "partial (unsound) results" | **Reject.** It says of itself that it models the language "intentionally not fully soundly" |
| stack-graphs | Incremental cross-file name resolution from tree-sitter | Apache-2.0 OR MIT | crate 0.10.0, 2024-12-13 | **Archived 2025-09-09** | 20 months since publish | **Reject.** Dead, and it was the theoretically perfect fit |
| tree-sitter-graph | A DSL for building graphs from a syntax tree | Apache-2.0 OR MIT | not shown | Not archived | Unverified | Reject for round one. It gives a construction language and no resolution rules |
| github/semantic | Multi-language analysis in Haskell | MIT | n/a | **Archived 2025-04-01** | 16 months read-only | Reject |
| Sourcetrail | Interactive source explorer with a graph | GPL-3.0 | n/a | **Archived 2021-12-14** | 4 years 8 months | Reject. See section 6 |
| universal-ctags | Symbol definitions only | **GPL-2.0**, no linking exception | p6.2.20260802.0 | Very active | 0 edge kinds | Reject twice. Licence, and it gives less than tree-sitter |
| ast-grep | Structural pattern matching | MIT | 0.45.1, 2026-08-07 | Very active | `@ast-grep/napi` has 9 native platform packages | Reject twice. Refusal 6, and it produces matches rather than a graph |
| semgrep | Findings. Cross-file dataflow is the paid tier | **LGPL-2.1** | n/a | Very active | Free tier is "within the boundaries of a single function or file" | Reject twice |
| Sourcebot | Self-hosted code search | **FSL-1.1-ALv2** | n/a | Active | Competing-use ban for 2 years | Reject |
| codanna | Local code intelligence, tree-sitter, 15 languages | Apache-2.0 with attribution | v0.13.2, 2026-08-04 | Very active | **76,000 to 249,000 symbols per second** parser throughput | Reject for the bundle, it is a Rust binary. Read it anyway, it is the nearest existing product |
| scip-typescript | Resolved references for TS and JS | Apache-2.0 | v0.4.0, **2025-10-02** | Slowing | 10 months | Reject for the bundle. Needs `tsconfig.json` plus installed `node_modules` |
| scip-go | Resolved references for Go | Apache-2.0 | v0.2.7, 2026-05-25 | Healthy | 5 releases in 5 weeks | Reject for the bundle. Needs the Go toolchain |
| scip-java | Resolved references for Java and Kotlin | Apache-2.0 | v0.13.1, 2026-07-02 | Healthy | v0.13.0 dropped Scala | Reject for the bundle. Needs a JDK and a working build |
| scip-python | Resolved references for Python | Apache-2.0 | v0.6.6, **2025-09-05** | Slowing | 11 months | Reject for the bundle |
| scip-ruby | Resolved references for Ruby | Apache-2.0 | v0.4.7, 2025-11-07 | README says "Experimental" | Binaries for 2 platforms only | Reject |
| scip-clang | Resolved references for C and C++ | Apache-2.0 | not shown | Badge says Beta | Needs a compilation database | Reject for the bundle |
| LSIF and lsif-node | The older index format | MIT | not shown | **No deprecation notice exists** | scip-java removed LSIF output in 2026-03 | Reject. Superseded in practice. Do not claim it is officially dead |
| Kythe | The richest published schema | Apache-2.0 | v0.0.76, 2026-07-16 | Alive but slow, 11 releases since 2024-03 | Still v0.0.x after 11 years | Reject. Bazel-scale infrastructure |
| Meta Glean | Facts about source code, queried in Angle | BSD-3-Clause | **Zero releases, empty feed** | Meta-internal first | 0 published releases | Reject. A server plus a database |
| Joern | Code property graph with dataflow | Apache-2.0 | v4.0.604, 2026-08-15 | Extremely active | Requires JDK 21 | Reject. A second runtime |
| code2flow | Heuristic call graph | MIT | zero GitHub releases | 126 commits | README admits a perfect callgraph is "not possible" | Reject |
| pyan, pyan3 | Python call graph | GPL-2.0 | pyan **archived 2026-03-26** | pyan3 revived | 1 language | Reject |
| tach | Python module edges | MIT | v0.35.0, 2026-05-12 | Active | Ships per-platform wheels | Reject. Native, Python only |
| import-linter | Python module edges plus layer rules | BSD-2-Clause | 2.13 | Active | Requires `grimp>=3.14` | Reject as code. **Steal its contract vocabulary**, see band 10 |
| grimp | A queryable Python import graph | BSD-2-Clause | 3.15 | Active | Per-platform wheels | Reject. Native |
| go callgraph | Call graph with four algorithms | BSD-3-Clause | part of `x/tools` | Active | Needs SSA, so needs type checking | Reject for the bundle |
| jdeps | Class and module edges | GPL-2.0 with Classpath Exception | ships with the JDK | Stable | Reads `.class` or a JAR, never source | Reject. Needs a compiled artifact |
| cargo-modules | Rust module tree | **MPL-2.0** | 0.27.0 | Active | 1 language | Reject |
| Blarify | Code graph for LLMs via language servers | MIT | n/a | Active | Requires Neo4j or FalkorDB | Reject. A graph database at runtime breaks offline |

**The gap this band could not close.** No published, measured timing exists for any of these tools
on a repository of about 10,000 files. Both tools most likely to publish one give only qualitative
advice. Any timing claim in a phase brief must be measured, not cited.

### Band 2. LLM assisted repository mapping, what actually exists in 2026

**The answer.** The state of the art is a two-tier pipeline, confirmed in the source of three
independent tools. It runs in these steps:

1. A deterministic parse builds a symbol and call graph.
2. A community-detection pass partitions that graph. It decides both how many components exist and
   which files belong to each one.
3. A language model is handed the finished groups and is allowed only to name and describe them.

CodeBoarding states it in a module docstring, quoted verbatim: "resolution-tuned Leiden over a
weighted meta-graph of inter-cluster call edges picks both the component count (the modularity peak
over `[low, high]`) and the membership. The LLM only names the result."

The single most relevant project found in the whole sweep is **`1st1/lat.md`**, MIT, TypeScript,
1,831 stars. It resolves a documentation reference such as `[[src/auth.ts#validateToken]]` against
real source using `web-tree-sitter` ^0.26.6, which is the same parser Tortie ships at 0.26.12, and
it fails a CI check when the symbol no longer exists. That is the operator's staleness problem
solved, offline, with no native binaries, in the exact language and on the exact parser Tortie has
today. Nothing in its checking path calls a model.

| Candidate | What it does | SPDX | Last release | Maintenance | Key number | Verdict |
|---|---|---|---|---|---|---|
| **1st1/lat.md** | Markdown knowledge graph with bidirectional code links and a `lat check` drift gate | **MIT** | npm 0.12.2, 2026-07-29 | 1,831 stars, pushed 2026-08-12, CI runs its own check | Uses `web-tree-sitter` ^0.26.6 | **Use as the model.** Vendor the design, not the package, which pulls `@libsql/client` and a WASM embedding model |
| **CodeBoarding** | Leiden partition over an LSP call graph, model names the groups | **MIT** | v0.13.1, 2026-07-28 | 2,388 stars, 541 commits, pushed 2026-08-14 | `TOP_LEVEL_COMPONENTS_MIN = 5`, `MAX = 8` | **Consider the algorithm, reject the package.** Needs `leidenalg`, Docker, downloaded language servers and a pinned Node runtime |
| NanoNets/Graft | Tier 1 pure tree-sitter graph, optional model summaries | MIT | no releases, 4 tags | 2,817 stars, created 2026-07-03 | 124 files: 0.74 s cold, 0.18 s warm | Consider the tier split. Too young, and its README contradicts itself on committing the graph |
| Graphify-Labs/graphify | tree-sitter AST plus Leiden, every edge tagged EXTRACTED or INFERRED | **Apache-2.0** | v0.9.44, 2026-08-15 | 199 contributors, 1,449 commits | 37 tree-sitter grammars | Consider the edge provenance model. Python, so not a dependency |
| mex-memory/mex | Project wiki plus deterministic tree-sitter graph, `mex check` | MIT | v0.7.1, 2026-08-05 | 1,444 stars | `mex check` runs "without spending AI tokens" | Consider the drift check. Overlaps lat.md and is less precise |
| tt-a1i/archify | Agent skill that validates its own output before delivery | MIT | v2.14.0, 2026-08-11 | **12,956 stars but only 6 contributors and 145 commits** | Last-known-good fallback | Consider the trust model only. The star ratio is unexplained |
| ahmedkhaleel2004/gitdiagram | File tree plus README into a model, typed JSON graph, repair loop | MIT | no releases, pushed 2026-08-15 | 15,889 stars, hosted commercial | `MAX_GRAPH_NODES = 34`, `MAX_GRAPH_ATTEMPTS = 3` | Reject as a tool. **Study the repair loop.** It never reads source code |
| braedonsaunders/codeflow | tree-sitter map in the browser, no model at all | MIT | no releases | 4,921 stars, 12 contributors | Zero model calls | Consider. Proves a tree-sitter WASM map renders client side |
| AsyncFuncAI/deepwiki-open | Self-hosted DeepWiki clone | MIT | no releases | 17,649 stars, 266 open issues | Pipeline undocumented | Reject. No stated grounding mechanism |
| potpie-ai/potpie | Code knowledge graph plus agents | Apache-2.0 | v2.0.0, 2026-07-03 | 5,577 stars | Now indexes Linear, Jira, Confluence | Reject. Scope moved to enterprise trackers |
| oh-my-mermaid | Claude Code skill, agent reads code and draws | MIT | v0.2.0, 2026-03-25 | 4 months idle | No verification step | Reject |
| thisAAY/archeyes | Bidirectional architecture skill | MIT | none | **7 stars, 0 forks** | 7 stars | Reject |
| harshkedia177/axon | Graph code intelligence engine | **NONE** | none | 768 stars | **No LICENSE file at all** | Reject. No licence means all rights reserved |
| blarApp/blarify | LSP or SCIP into Neo4j | MIT | none | 231 stars | Requires a graph database | Reject |
| vitali87/code-graph-rag | tree-sitter into Memgraph | MIT | v0.0.639, 2026-08-14 | 4,360 stars | Requires Memgraph | Reject |
| giancarloerra/SocratiCode | AST chunking plus embeddings | **AGPL-3.0** | v1.12.0, 2026-08-14 | 3,255 stars | 5,300+ files to 55,437 chunks | **Reject on licence.** Network copyleft, plus Docker, Qdrant, Ollama |
| abhigyanpatwari/GitNexus | tree-sitter plus LadybugDB in the browser | **PolyForm Noncommercial 1.0.0** | v1.6.10-rc.204 | 171 contributors | Browser WASM ceiling about 5,000 files | **Reject on licence** |
| EuniAI/Prometheus | Knowledge graph agent | **GPL-3.0** | none | 1,123 stars | Strong copyleft | Reject on licence |
| yamadashy/repomix | Packs a repo into one file | MIT | v1.18.0, 2026-08-04 | 27,869 stars | Claims about 70 percent token reduction | Reject as a dependency. Tortie already has tree-sitter |
| Aider-AI/aider repo map | tree-sitter tags plus PageRank into a token budget | Apache-2.0 | **v0.86.0, 2025-08-09** | Last commit 2026-05-22, **1,802 open issues**, zero commits in 12 weeks | `map_tokens = 1024` | **Vendor the algorithm, not the package.** The most deployed code map in the world, and **it has never published a benchmark of its own effect** |
| cased/kit | Codebase mapping toolkit | MIT | pushed 2026-03-03 | 5 months idle | 1,308 stars | Reject |

**Hosted products, all rejected on offline and on no cloud component.**

| Product | Verified status on 2026-08-15 | Key number |
|---|---|---|
| DeepWiki, by Cognition | Live. Tagline reads "Index your code with Devin" | **Medium effort 5 to 10 ACUs per wiki, high effort 20 to 40 ACUs.** The only published cost-to-build figure in the category. **No refresh, staleness or accuracy policy is stated anywhere in its documentation** |
| Devin repo indexing | Live | "a few minutes", no number published |
| Cursor codebase indexing | Live | No index-time number. "File paths are encrypted before being sent to Cursor's servers" |
| Windsurf | `docs.windsurf.com/context-awareness/overview` returns **307** to `docs.devin.ai/...` | Absorbed into Cognition's documentation |
| Augment Code | Live, products are Cosmos and a Context Engine | None published |
| Sourcegraph Cody | `repos/sourcegraph/cody` returns **404**, the public snapshot has been archived since 2024-09-02, and 10 recent blog posts never mention it. **However `sourcegraph.com/docs/cody` is still live with no deprecation notice** | Not asserted as discontinued |

**How the good tools handle being wrong**, which is the reusable part.

| Project | Mechanism, verified in source |
|---|---|
| CodeBoarding | Four referential-integrity checks, none semantic: every cluster group assigned, every component has a key entity, every expected file classified, every relation names a component that exists |
| CodeBoarding | Repair, never regenerate: "You must CORRECT the output below. Do NOT regenerate from scratch." |
| CodeBoarding | `REGROUP_DRIFT_BUDGET = 0.10`, with the stated reason that "a two-line diff can select a different near-optimal partition and reshuffle which component owns what" |
| CodeBoarding | `_inherit_ids` gives each new group the id of the previous component whose code it mostly holds, weighted by method count, because "a regrouping that renamed every component would light up the whole diagram" |
| CodeBoarding | `CLUSTERING_SEED = 42`, with the comment "Leiden/Louvain are non-deterministic without it" |
| lat.md | `lat check` errors include `broken link [[X]] - symbol "S" not found in "F"` and `broken link [[X]] - file "F" not found`. Runs in CI on every push |
| Graphify | Per-edge provenance: "every inferred relationship is marked `EXTRACTED`, `INFERRED`, or `AMBIGUOUS`. You always know what was found vs guessed" |
| GitDiagram | Schema, plus path existence against the real tree, plus up to 3 repair attempts |
| DeepWiki | **None found.** The documentation makes no statement about accuracy, hallucination, staleness or refresh cadence |

**One vendor tension worth recording.** Anthropic's own memory documentation says the `/doctor`
checkup "cuts content Claude can derive from the codebase, such as directory layouts, dependency
lists, **and architecture overviews**". The same page lists project architecture as a recommended
use for CLAUDE.md. The honest reading is that derivable architecture prose should not be pinned
into every context window, not that it is worthless. An Arch pane is one answer to where the
derived version should live. `lat.md` is an existing competing answer.

### Band 3. Canvas and graph rendering libraries

**The answer.** If a canvas is ever built, hand-written SVG in the renderer laid out by
`@dagrejs/dagre` beats every framework, and the deciding argument is not performance. The
operator's own 30 documents never open with more than 9 boxes and the deepest level tops out near
30. Every WebGL library in this table exists to solve a problem that starts around 10,000 items.

**The measurement that removes WebGL from consideration on a second ground.** Chromium sets
`prefs.max_active_webgl_contexts = 16u` on every platform except Android, and Blink then calls
`ForciblyLoseOldestContext` with the message "WARNING: Too many active WebGL contexts. Oldest
context will be lost." Tortie already spends one context per visible terminal pane through
`@xterm/addon-webgl`. A canvas that opens a context competes with terminals the operator is
watching, and the loser is chosen by age rather than importance.

| Candidate | What it does | SPDX from the file | Last release | Maintenance | Key number | Verdict |
|---|---|---|---|---|---|---|
| **@xyflow/react 12.11.3** | Node and edge canvas, nodes are DOM divs | MIT, webkid GmbH | 2026-08-12 | 546 commits, 34 authors | **57.8 KB gzip measured**, zero eval, zero network, zero WebGL | Licence fine. **Rejected on three grounds**: its viewport uses `transform` with `transform-origin: 0 0`; its stylesheet has 34 hardcoded colour literals; it ships a minimap, controls, attribution and its own icons |
| **@dagrejs/dagre 3.1.1** | Layered positions, no rendering at all | **MIT** | 2026-08-08 | 111 commits, 11 authors | **16.4 KB gzip**, one MIT dependency | **Use.** Smallest maintained layered layout. It draws nothing, so it brings no CSS, no icons and no menu |
| **d3-hierarchy 3.1.2** | Tree, treemap, pack. Coordinates only | ISC | 2022-04-02 | Finished rather than abandoned | **5 KB gzip**, zero dependencies | Consider, for containment and area-encoded size |
| diagram-js 15.24.0 | SVG diagram framework, base under bpmn-js | **MIT**, the word watermark appears **zero** times | 2026-08-11 | 244 commits, Camunda-funded | `Canvas.js` is 9 KB gzip | Consider as the fallback. Node content is SVG, so every piece of Tortie's chrome must be redrawn |
| cytoscape 3.34.1 | Graph library, Canvas2D | MIT | 2026-08-11 | 178 commits, institutionally funded | 133 KB gzip. **Its own performance page states no number** | Consider only if the DOM model fails. Nodes are canvas-drawn, so text, icons, menus and accessibility all become ours |
| sigma 3.0.3 / 4.0.0-beta.2 | WebGL graph renderer over graphology | MIT | 3.0.3 on 2026-04-30, beta on 2026-08-14 | **322 commits on the `v4` branch**, newest 2026-08-14 | 46 KB gzip plus a WebGL context | Reject. It draws a point cloud, not labelled boxes. **Not rejected for being dead, which it is not** |
| graphology 0.26.0 | Graph data structure only | MIT | 2025-01-26 | 5 commits in 12 months | 13 KB gzip | Reject. No renderer |
| @antv/x6 3.1.8 | SVG diagram engine | MIT, Alipay.inc | 2026-08-11 | 201 commits | 162 KB gzip. **`fetch(` appears in 7 files** | Reject. Three times dagre's bytes and its own interaction stack |
| @antv/g6 | Graph library | MIT | **`latest` tag is 5.1.1 from 2026-05-08 while 5.3.1 shipped 2026-05-19** | 332 open issues | 390 KB per Bundlephobia | Reject. A `latest` tag three months behind a shipped stable is a process signal |
| vis-network 10.1.1 | Canvas2D network view | Apache-2.0 OR MIT | 2026-08-07 | **252 commits of which 207 are renovate[bot]** | Docs claim "up to a few thousand nodes" with no frame rate | Reject. One human maintainer |
| konva 10.3.1 | Canvas2D scene graph | **MIT.** GitHub reports NOASSERTION only because of a dual copyright preamble | 2026-08-15 | 237 commits | 54 KB gzip | Reject. No graph semantics, so layout, routing and hit testing all become ours |
| fabric 7.4.0 | Canvas2D object model | MIT | 2026-05-18 | 466 open issues | not measured | Reject. Same as konva with more bytes |
| pixi.js 8.19.0 | WebGL and WebGPU renderer | MIT | 2026-06-04 | 234 commits, 64 authors | **25 files in `lib/` call `new Function`** | **Reject.** It throws at renderer init under this CSP. `pixi.js/unsafe-eval` exists and is grep-clean, and it still has no graph semantics |
| deck.gl 9.3.10 | WebGL2 data layers | MIT | 2026-08-11 | 361 commits, OpenJS | **The only published figure with hardware named**: 1M items at 60 FPS, 10 to 20 FPS near 10M, on 2015 MacBook Pros | Reject. Built for roughly 33,000 times the needed scale |
| @cosmos.gl/graph 3.4.1 | GPU force graph | **MIT** | 2026-08-13 | 353 commits | 179 KB gzip plus a WebGL context | Reject. A force-directed point cloud with no labelled boxes |
| @cosmograph/cosmos 3.4.1 | The same renderer, Cosmograph's copy | **CC-BY-NC-4.0**, verified in the tarball | 2026-07-31 | Separate repository now | Same code lineage | **Reject on licence.** Two packages at the same version from two repositories under two incompatible licences |
| @excalidraw/excalidraw 0.18.1 | Whiteboard component | MIT in package.json, **no LICENSE file in the tarball** | 2026-04-20 | 3,323 open issues | **48 MB unpacked, 468 font files, main chunk 731 KB gzip.** Bundle references `libraries.excalidraw.com` and `json.excalidraw.com` | Reject. Its in-app library browser is refusal 3 word for word |
| tldraw 5.3.1 | Whiteboard canvas | **Proprietary** | 2026-08-14 | 1,609 commits | Forbids Production Environments outright | **Reject on licence, three ways** |
| mermaid 11.16.1 | Static SVG from diagram text | MIT | 2026-08-04 | Very active | **948 KB gzip measured** | Reject as a dependency. Keep as a text export |
| @joint/core 4.3.1 | SVG diagram framework | **MPL-2.0** | 2026-07-27 | 141 commits | 139 KB gzip | Reject. File-level copyleft plus a paid tier |
| gojs 4.0.3 | Canvas2D diagram library | **Proprietary** | 2026-07-17 | 19 commits | n/a | Reject on licence |
| bpmn-js 18.24.0 | BPMN editor over diagram-js | **MIT with a watermark clause** | 2026-08-11 | 262 commits | The watermark "must stay fully visible and not visually overlapped" | **Reject on licence.** This is the MIT-plus-watermark trap and it is real |
| ngraph.graph 20.1.2 | Graph data structure | BSD-3-Clause | 2026-02-14 | 14 commits | 8.6 KB | Reject. Not a renderer |
| ngraph.forcelayout 3.3.1 | Force layout | BSD-3-Clause | **2022-10-04** | 4 commits | n/a | Reject. Force layout is wrong here |
| rete 2.0.6 | Node editor | MIT | 2025-06-30 | **0 commits on the default branch** | none | Reject. Dormant |
| reaflow 5.4.1 | React node diagrams | Apache-2.0 | 2025-04-08 | **0 commits**, last push 2025-06-04 | 2,493 stars | Reject. Dead for over a year. The repository does exist, contrary to the first sweep |
| @projectstorm/react-diagrams 7.0.4 | React diagrams | MIT | **2024-02-15** | 320 open issues | none | Reject |
| litegraph.js 0.7.18 | Canvas2D node graph | MIT | **2024-01-08** | last push 2024-08-01 | none | Reject. Abandoned |
| force-graph 1.51.4 | Canvas2D force graph | MIT | 2026-04-16 | one author | not measured | Reject |
| elkjs 0.12.0 | Layered layout with ports and nesting | **EPL-2.0 OR GPL-3.0-or-later** | 2026-07-17 | 60 commits | **455 KB gzip, 28 times dagre** | Reject on licence. Reconsider only if nested containment layout becomes essential |
| @hpcc-js/wasm-graphviz 1.28.0, @viz-js/viz 3.29.0 | dot layout in WebAssembly | Wrappers Apache-2.0 and MIT, **Graphviz is EPL-2.0** | 2026-07-24, 2026-08-05 | Active | 636 KB and 468 KB. **Neither tarball ships a Graphviz notice, and `@viz-js/viz` ships no LICENSE file at all** | Reject on licence |
| d3-zoom 3.0.0 | Pan and zoom emitting a transform | ISC | 2021-06-10 | Stable d3 module | 85 KB unpacked | Consider only if Arch gets a camera, and only after claiming the DESIGN.md S14 exception in writing |
| data-navigator 3.0.0 | An accessible keyboard layer over an existing drawing | **MIT**, Carnegie Mellon | 2026-06-03 | 64 stars, small team | 321 KB, **zero dependencies** | **Consider, and read it either way.** The only project found whose navigation model is edges with a direction |
| Perfetto `VirtualOverlayCanvas` | Floating canvas over a scrolling container | Apache-2.0 | live, Google | 194 authors | 1,201 lines, of which **353 are a Mithril component** | Reject for now. Record it as the answer if a flow ever needs thousands of drawn steps |

**Two integration hazards worth carrying into any phase brief.**

1. A duplicate `zustand` is real. `npm ls zustand` on a clean install with React Flow prints
   `zustand@4.5.7` nested and `zustand@5.0.15` at the top level. The bytes are about 1.4 KB
   gzipped. The growth guardrail against a parallel generation of the same library is the concern.
2. Tree-shaking buys nothing on React Flow. A bundle of the full surface and a bundle of four
   exports both came to 57.8 KB gzipped.

### Band 4. Graph layout engines, and the stability problem

**The answer.** The literature term is **preserving the mental map**, and the founding paper is
confirmed through Crossref rather than recalled: Misue, Eades, Lai and Sugiyama, "Layout Adjustment
and the Mental Map", Journal of Visual Languages and Computing, volume 6, issue 2, pages 183 to
210, 1995, DOI 10.1006/jvlc.1995.1010.

ELK's four-phase INTERACTIVE mode is the only built-in mental-map preservation in any candidate,
and on a flat graph it is excellent. At nine boxes, adding one node moves the average box 14 px
under INTERACTIVE against 293 px for a fresh layout, on a drawing 600 px wide. **On a nested graph
it fails**, which is the case the operator's own corpus draws almost every diagram in. It first
throws `UnsupportedGraphException`, and once configured at every level it produces overlapping
boxes. At 320 nodes in 20 containers it left 125 overlapping node pairs and moved the average node
5,674 px, against 50 px and zero overlaps for a plain fresh layout.

**Interactive mode also decays about four times faster than first reported.** On a 40-node map,
twenty successive single-node additions took exact edge crossings from 33 to 246, where a fresh
layout at the same point would have had 58. By the fifth edit the interactive drawing has 1.9
times the crossings of a fresh one. By the twentieth it has 4.2 times.

| Candidate | What it does | SPDX from the file | Last release | Maintenance | Key number | Verdict |
|---|---|---|---|---|---|---|
| **elkjs 0.12.0** | Sugiyama layered plus 10 other algorithms | **EPL-2.0 OR GPL-3.0-or-later** | 2026-07-17 | 6.12M weekly downloads | Flat graph, add one node to nine: **14 px mean move** against 293 px fresh. Nested: **broken**, 125 overlapping pairs at 320 nodes | **Reject on licence.** It is the only engine with working per-phase mental-map preservation on a flat graph, and Tortie's own drawings are nested |
| **@dagrejs/dagre 3.1.1** | Sugiyama layered | MIT | 2026-08-08 | 3.94M weekly | **3,905 ms at 1,000 nodes** and highly variable, 3,905 to 13,759 ms. **226,741 ms at 4,000 nodes.** No pinning | **Use anyway**, because Arch draws 5 to 30 nodes. At that size it is under 10 ms and the 1,000-node figure never applies |
| d3-dag 1.2.2 | Sugiyama layered | MIT | 2026-07-05 | one maintainer | **41,838 ms at 1,000 nodes**, 1,860 ms at 500. Incidentally stable at 35 px mean move at 100 nodes | Reject. Its stability is a side effect of input ordering, not a feature, and it is unusable above about 300 nodes |
| d3-hierarchy 3.1.2 | Trees only | ISC | 2022-04-02 | Finished. 21.2M weekly | Trees are inherently stable | Consider, in reserve |
| d3-force 3.0.0 | Force directed | ISC | 2021-06-05 | Finished. 19.9M weekly | 2 percent of nodes moved more than a tenth of the radius, with `fx`/`fy` pinning | Reject for interactive use. Force settling breaks the 250 ms animation cap |
| forceatlas2 in graphology | Force directed | MIT | 2022-10-17 | 300K weekly | **The least stable measured, 70 percent of nodes moved** | Reject |
| Graphviz `dot` via @viz-js/viz | Sugiyama, Graphviz 15.1.1 in wasm | Declares MIT, **ships no licence file**, core is **EPL-2.0** | 2026-08-05 | 4,342 stars | **Fastest measured: 214 ms at 1,000 nodes.** No pinning in `dot` | Reject. No stability story for the layered engine, plus a hidden EPL obligation |
| Graphviz `neato` and `fdp`, pinned | Stress and force with real `pin` support | Same EPL trap | Same | Same | Perfect pinning, wrong picture | Reject |
| webcola 3.4.0 | Constraint and stress | MIT | **2019-05-10** | Every 2026 commit is a README edit | not benchmarked | Reject. Seven years |
| @msagl/core 1.1.24 | Sugiyama plus incremental IPsepCola | MIT, Microsoft | 2026-04-24 | pushed 2026-08-12, 29,364 weekly | not benchmarked | **Consider, as the fallback.** The only other maintained MIT engine with a real incremental algorithm, though its incremental support is in the force family |
| @antv/layout 2.0.0 | Many algorithms | MIT | 2026-02-11 | 284K weekly | 11 MB unpacked | Reject |
| @antv/layout-wasm | WebAssembly layouts | MIT | **`latest` is 1.4.2 from 2024-09-06, but 1.6.2 was published 2026-05-19 on another tag** | Ambiguous | n/a | Reject. A release channel you cannot trust |
| cytoscape with fcose | Rendering framework plus layout | MIT | cytoscape 2026-08-11, fcose **2023-01-17** | 13.8M weekly | not benchmarked | Reject. Taking a rendering framework to get a layout function |
| mermaid | A renderer, layout by `dagre-d3-es` | MIT | 2026-08-04 | 13.6M weekly | Inherits dagre's instability | Reject as an engine |
| @mermaid-js/layout-elk | Mermaid's ELK adapter | MIT, but **EPL-2.0 arrives transitively** | 2026-06-25 | active | same as elkjs | Reject. It hides the EPL one level down where an audit misses it |
| D2, now `d2lang/d2` | A diagram language with three backends | **MPL-2.0** | pushed 2026-08-12, 24,940 stars | Healthy | n/a | Reject. A separate Go binary, and file-level copyleft |
| TALA | Proprietary layout engine for D2 | **Proprietary** | n/a | Commercial | n/a | Reject outright |
| eland 0.2.4 | New TypeScript Sugiyama | ISC | 2026-07-24 | **five weeks old, no repository URL, 25 weekly downloads** | n/a | Reject |
| @layerd/wasm 0.1.0 | New WebAssembly layered layout | MIT | 2026-05-25 | **one version, one star, 4 weekly downloads** | n/a | Reject |
| @unovis/dagre-layout | A maintained dagre fork | MIT | 2026-07-28 | 212K weekly | Same instability | Reject |
| @ellbur/lplayout 1.4.0 | Linear-programming DAG layout | **WTFPL** | 2025-05-26 | 19 weekly | n/a | Reject. No legal review signs off WTFPL in a shipped product |

**The stability rules that matter more than the engine choice.**

1. **Emit nodes and edges in a canonical order every time**, sorted by id. This was measured. A
   reversed node array moves nodes by 1,147 px mean and 2,695 px max on a 4,224 px drawing. A reversed edge
   array moves 1,330 px mean and 4,224 px max. A shuffled array moves 1,037 px mean. Inserting a
   node in the middle rather than appending costs **0 px extra** for ELK, Graphviz and d3-dag, and
   it costs dagre 148 px to 458 px.
2. **Cache the layout by the hash of the sorted node id set plus the sorted edge id set.** Edge
   `weight` must not be in the edge id, so ordinary churn inside existing module pairs moves
   nothing. This is the overwhelmingly common case.
3. **On a nested graph, prefer a fresh layout with `considerModelOrder = NODES_AND_EDGES`.**
   This was measured on an irregular ten-container graph. Fresh layout with stable input order came
   to 282 px mean. All-INTERACTIVE came to 1,888 px mean. `considerModelOrder` came to **226 px mean
   with zero overlaps**.
4. **Offer a visible re-arrange action**, and say what changed rather than that something changed.

### Band 5. The on-disk format for the map

**The answer.** Every published format loses, and mostly for the same reason. The full candidate
table and the reasoning are in section 4.3, because the format decision is part of the
recommendation rather than a survey result. Three findings from the band belong here.

**The tool that solved the round trip, and what it cost.** LikeC4, MIT, writes its saved layout as
a base64 msgpack blob inside a `@likec4-generated(v1)` JSDoc comment in the `.c4` source. I had the
blob decoded and its keys are `hash`, `autoLayout`, `x`, `y`, `width`, `height`, `nodes` and
`edges`. For an eight node view that is 892 bytes of unreadable text. It round trips perfectly, it
diffs as a wall of base64, and it cannot be hand edited. That is the honest price of putting the
semantic map and the layout in one file, and Tortie should not pay it. Its `hash` field is worth
copying as the guard for a layout made against an older view.

**The determinism finding.** No format in the survey specifies deterministic serialization. Not
one. So byte stability is engineered whichever way the decision goes, and the four rules are in
section 4.3. RFC 8785, the JSON Canonicalization Scheme, is Informational, an Independent
submission from 2020 with 2 errata, and it sorts keys by UTF-16 code unit, which would scatter the
fields a person scans for. A hand-fixed key order gives the same byte stability and a readable
file.

**One trap for a JSON Canvas export, if one is ever written.** Its preset colour values are
"intentionally not defined so that applications can tailor the presets", which suits Tortie's token
rule. Preset `"3"` is yellow, and `DESIGN.md` line 97 says "No yellow, ever". Tortie must never
emit preset 3.

### Band 6. Choosing the level of abstraction a person can hold

**The answer.** Do not let an algorithm choose the boxes and do not let the model choose them
either. Choose the count first from a fixed human budget, then let the directory structure choose
the membership, then let a model only name what came out. Four independent sources, three of them
primary, put the top level at 5 to 10 boxes and the second level at about 20.

| Source | Kind | Top level | Second level | Verbatim |
|---|---|---|---|---|
| CodeBoarding `cluster_helpers.py` | Shipped MIT code | **5 to 8** | **3 to 8** | `TOP_LEVEL_COMPONENTS_MIN = 5`, `MAX = 8` |
| CodeBoarding `constants.py` | Shipped MIT code | n/a | **20**, ceiling **55** | `DEFAULT_TARGET_CLUSTERS = 20  # Sweet spot for human comprehension and LLM context` |
| CodeBoarding `claude_prompts.py` | Shipped MIT code | **max 10** | n/a | "Central components (max 10)" |
| GitDiagram `prompts.ts` | Shipped MIT code | **5 to 10** | **12 to 22 nodes, 0 to 6 groups, 8 to 30 edges** | "Most repositories use 12-22 nodes, 0-6 groups, and 8-30 edges" |
| SARIF, ESEC/FSE 2023 §3.4 | Peer-reviewed | n/a | **20 to 30** | "we suggest 20 to 30 clusters as a suitable setup for quickly understanding an architecture" |
| Ghoniem, Fekete, Castagliola, InfoVis 2004 | Controlled experiment, 326 citations | n/a | **20 vertices** | "when graphs are bigger than twenty vertices, the matrix-based visualization performs better than node-link diagrams on most tasks. Only path finding is consistently in favor of node-link diagrams" |
| The operator's own 30 documents | Measured corpus | **4 to 9** | n/a | Not one document opens with more than 9 top-level boxes |
| C4 model | The most cited framework | **No number** | No number | I checked four pages. None states a count. Its own diagrams page says "the system context and container diagrams are sufficient for most software development teams" |
| Cowan 2001, 6,871 citations | Psychology | **about 4 chunks** | n/a | "A single, central capacity limit averaging about four chunks is implicated" |
| Nielsen, 2009-12-06 | Practitioner | Does not cap a visible list | n/a | "It's a common misconception that limited short-term memory implies that menus should be similarly limited to 7 items" |

**Two things follow that a reader would not guess.** C4 declines to answer the question, so anyone
citing C4 as the source of a box limit is inventing it. And Cowan's four is the wrong limit,
because a drawn diagram is on screen, so the reader recognises rather than recalls. The limit that
binds a canvas is legibility, which is Ghoniem's twenty.

**Does an algorithm beat the directory structure a person already chose? No.** Four verified
results.

| Evidence | The number |
|---|---|
| SARIF Table 5, accuracy across nine projects with published ground truth | Best baseline MoJoFM 47, SARIF 61. Cluster coverage: LIMBO 0, Bunch-NAHC 1, best baseline 14, SARIF 20. **Even the winner reproduces one ground-truth component in five** |
| SARIF Table 8, ablation | **Removing the folder structure costs 16.0 percent of MoJoFM, 25.5 percent of cluster coverage and 30.6 percent of ARI.** The paper's own sentence: "The removal of folder structure has the greatest negative impact on most metrics" |
| E-SC4R, 30 Java projects, 300 releases | Where expert ground truth is unavailable, "several authors have chosen to use the directory structure or package structure ... to create an artificial ground truth" |
| Link, Behnamghader, Garcia, Medvidovic, on ARC | Non-deterministic. "MojoFM values between the same version of Apache Chukwa have had an average value of less than 72%". Changing **one letter in a comment** produced a MojoFM of 61.4, "a change of 38.6%" |
| SARIF Table 7, runtime on a 40-core server with 188 GB | **Bunch-SAHC takes 668,733.4 seconds on Chromium, which is 7.7 days.** ACDC 28,259 s. SARIF 4,499 s. Louvain in JavaScript takes 937.9 ms at 50,000 nodes and 994,713 edges |

Their conclusion on PKG, the method that reports nothing but the package structure, is the design
brief for this feature: "PKG fulfills all our criteria for a value aid in maintenance, save for the
one which requires its result to represent an architecture." The directory structure has every
property you need except meaning, and meaning is the one thing a model adds cheaply.

**PageRank overvalues the wrong things, and this corrects a common instinct.** SARIF §3.2 gives the
worked case: "in the dependency graph, PageRank may overvalue utility functions like parsers. For
example, in Libxml2, the most important function identified by PageRank is `xmlStrEqual` ... this
function has nearly no indication on the architecture since it is accessed by almost every module."
Their fix is Inverse PageRank, propagating importance from callees to callers. Aider reaches the
same place crudely with `if len(defines[ident]) > 5: mul *= 0.1`.

| Ranking package | SPDX | The deciding fact |
|---|---|---|
| `graphology-metrics` PageRank | MIT | **It has no personalisation vector.** Line 106 of `pagerank.js` is `x[i] += dangleSum * p + (1 - alpha) * p` with `p` uniform. Cannot express "rank relative to the file the user has open" |
| `ngraph.pagerank` | MIT | 1,446 weekly downloads, no release in 4 years, and also no personalisation vector |
| **Write our own** | n/a | About 30 lines of power iteration. Chosen on **capability**, not on download counts |
| `graphology-communities-louvain` | MIT | 169,157 weekly. Exposes `resolution`, a seedable `rng` and a dendrogram. 52.7 ms at 1,000 nodes, 937.9 ms at 50,000 |
| `@mapequation/infomap` | **GPL-3.0-or-later** | Reject on licence |
| `fast-leiden` | **GPL-3.0-or-later** | Reject twice. Licence and native code |
| `leiden-ts` 0.1.0, `ngraph.leiden` 0.3.0, `@aflsolutions/graphology-communities-leiden` 1.1.1 | MIT | Reject on maturity. Recheck the last one in a year, it is the only correctly licensed Leiden with a real API shape |
| `jlouvain` | ISC | 2016. 2,368 ms where graphology takes 52.7 ms |

**The rule this produces for Tortie**, as an ordered list rather than a single score.

1. **The written map wins, unconditionally.** Any part named in the project's own document is drawn
   whatever it scores.
2. **The directory structure fills the gaps.** Deterministic, runs once, works on every repository,
   survives a one-character edit, and every placement explains itself in one word.
3. **Rank the remaining nodes only to decide what gets bundled**, never to decide what the groups are.
   Use inverse PageRank with damping 0.85, aider's ubiquity damping at 0.1 for a name defined in
   more than 5 files, and size in indexed symbols encoded as box area.
4. **Community detection is a button, never a default**, and probably not in round one at all.
5. **Never regenerate identity.** Carry the previous grouping forward, rebuild only past a 0.10
   modularity gap, and inherit ids by weighted majority.

### Band 7. Discontinued products, and what the ones still sold have in common

Condensed here and given full weight in section 6, because it is the strongest argument against
building this at all.

**The answer.** Not one product still sold in this survey sells a persistent picture a human is
expected to visit. Every product still sold does one of two things. It either generates the picture
on demand from a live index and stores nothing, or it makes the model executable so that it fails a
build. A third pattern arrived in the last twelve months, being feed the agent rather than the
human, and three commercial products moved to it independently.

### Band 8. Staleness, provenance, and containing a wrong map

**The answer.** Git already is the content-addressed tree, and the whole verification pass is cheap
enough to be uninteresting. A full five-rung check over this repository measured **414.4 ms in five
git processes**, with no network and no new dependency. The expensive part is not detecting that
something changed. It is classifying why a check failed, because most failures are not lies.

**The finding that costs nothing.** `web-tree-sitter` 0.26.12 is already a dependency and its type
definitions already expose `getChangedRanges(other: Tree): Range[]`, documented as returning
"a sequence of ranges whose syntactic structure has changed". Tortie calls neither `edit` nor
`getChangedRanges` today. This is the cheap way to ignore a commit that only reformatted a file,
so that drift means something.

| Candidate | What it does | SPDX | Last release | Maintenance | Key number | Verdict |
|---|---|---|---|---|---|---|
| **git tree objects** | A content hash over every directory, maintained on commit | already installed | n/a | n/a | **153 subtree hashes in 33.6 ms, one process** | **Use.** The exact question a node asks, answered by a tool already on the machine |
| **`getChangedRanges`** | Ranges whose syntactic structure changed | MIT | 0.26.12 | already a dependency | Zero new bytes. Unused today | **Use** |
| **`src/main/context/hash.ts`** | Sorted-path per-file digest with a versioned algorithm and a cheap-head mode | Tortie's own | in tree | live | about 1 ms in `head` mode | **Reuse.** Do not write a second digest |
| **`@parcel/watcher`** | Watching plus `writeSnapshot` and `getEventsSince` | MIT | 2.6.0, 2026-07-20 | Healthy | Answers what changed while closed, with no resident process | Use, with a correction. **It documents no completeness signal at all** |
| difftastic | Structural diff using tree-sitter | MIT | 0.70.0, 2026-08-07 | 25,779 stars | `DEFAULT_GRAPH_LIMIT = 3_000_000`, then it falls back to a line diff **and says so** | Reject as a dependency. **Adopt its budget pattern** |
| diffsitter | Same idea, smaller | MIT | **v0.9.0, 2025-04-27** | pushed yesterday but no release in 15 months | 2,394 stars | Reject. Push activity is dependabot |
| GumTree | AST edit-script computation | **LGPL-3.0** | v4.0.0-beta8, 2026-07-15 | Active, still beta | Real defaults are `bu_minsize` 1000, `bu_minsim` 0.5, `st_minprio` 1 | Reject on licence, plus a JVM |
| srcML | XML representation of source | **GPL-3.0** | v1.1.0, 2025-08-14 | 158 stars | n/a | Reject on licence |
| SCIP | Language-agnostic index format | Apache-2.0 | v0.9.0, 2026-06-29 | Moved to `scip-code/scip` | Needs one indexer process per language | Reject as a dependency. Read the format |
| github/stack-graphs | Incremental name resolution | Apache-2.0 | n/a | **Archived 2025-09-09** | "no longer supported or updated by GitHub" | Reject. Dead |
| Kythe | Server-scale indexing | Apache-2.0 | pushed 2026-07-16 | Active | 2,147 stars | Reject. Wrong size by three orders of magnitude |
| Glean | Meta's code index store | **BSD** | pushed 2026-08-15 | Active | Needs a Haskell toolchain | Reject |
| watchman | Watching daemon | MIT | v2026.08.10.00 | 13,674 stars | `is_fresh_instance` | Reject the daemon. **Steal the field** |
| ast-grep | Structural pattern search | MIT | 0.45.1, 2026-08-07 | 15,529 stars | Would be a fourth signed binary | Consider later |
| comby | Structural search and rewrite | Apache-2.0 | **1.8.1, 2022-06-28** | **No release in four years** | 2,668 stars | Reject |
| dependency-cruiser | Computes and validates the JS import graph | MIT | v18.2.0, 2026-08-10 | 7,063 stars, pure JS | 1.0 MB unpacked, **but needs the 23 MB TypeScript compiler at runtime for TS edges** | Reject for now |
| madge | Module dependency graph | MIT | **no releases published** | pushed 2026-01-21 | 10,156 stars | Reject |
| lychee | Link checker | Apache-2.0 | v0.24.2, 2026-05-01 | 3,836 stars | n/a | Reject the binary. **Use the pattern** |
| MarkdownSnippets | Transclusion of code into markdown | MIT | pushed 2026-08-15 | 248 stars | n/a | Reject the tool. **Use the pattern**: evidence is a reference, never a paraphrase |
| Structure101 | Commercial architecture erosion tool | Proprietary | n/a | **Acquired by Sonar. The FAQ answer to "still available for sale?" is "No"** | n/a | Reject. Dead |
| Sonargraph | Architecture rule DSL and drift detection | Proprietary | n/a | Active. **Shipped an MCP server 2026-08-13** | n/a | Reject as software. The pivot is the finding |
| Lattix | Dependency structure matrices | Proprietary | n/a | **Site returned HTTP 403 twice, liveness unconfirmed** | n/a | Reject |

**Two published papers arrived within the last eleven weeks and both matter.**

| Paper | Date | Finding |
|---|---|---|
| ReCite, arXiv 2608.03734 | Submitted 2026-08-04 | Its three stages are detect unresolved function-form symbols, trace each through git history, then generate repair suggestions. On Linux kernel v6.18-rc1 it found **869 stale references**. Of 200 sampled repairs, **178 (89.0 percent) gave useful guidance and 85 (42.5 percent) were directly applicable**. **50 of 75 submitted patches were accepted upstream** |
| Context rot, arXiv 2606.09090 | Submitted 2026-06-08 | Studies `CLAUDE.md`, `AGENTS.md` and `.cursorrules`. Applying an existing README consistency checker to 356 repositories "identifies stale code element references in **23.0% of repositories**" |

The 42.5 percent figure is the one to carry, because it is the measured rate at which offering the
repair beats reporting the break. The 23.0 percent figure is the rate of stale references this
feature would start from.

**Package hallucination, for calibration.** arXiv 2605.17062, last revised 2026-08-09, measured
rates "between 4.62% (Claude Haiku 4.5) and 6.10% (GPT-5.4-mini)" across five frontier models and
nearly 200,000 prompts. That is the error rate a model-authored node list would carry, and it is
the reason the recommended overlay has no node list in it.

**The honesty vocabulary, from four verified exemplars.**

| Tool | Vocabulary, verified verbatim | States | How the reason is shown |
|---|---|---|---|
| Dagster | `Unsynced`, with three causes. "Unsynced status is _not_ transitive in Dagster" | 2 plus a reason | Hover an information icon |
| Argo CD | Health is `Healthy`, `Progressing`, `Degraded`, `Suspended`, `Unknown`. Sync is a separate axis | 5 on one axis, 2 on the other | **Two independent axes, never merged** |
| C2PA | `Well-formed`, then `Valid`, then `Trusted`. Bindings are hard, being "one or more cryptographic hashes", or soft | 3 escalating | Named status codes |
| Swimm | `up to date`, `outdated`, **`potentially out of date`** | 3 | A failing CI check |
| Sourcegraph | "Sourcegraph automatically uses Precise Code Navigation whenever available, and Search-based Code Navigation is used as a fallback" | 2 tiers | **Not surfaced in any documentation I could reach** |

Three rules survive verification and all three are adopted in section 7. Never a boolean. Two axes
rather than one. And the count goes in the panel, never on the node.

### Band 9. Where the map lives, including the shadow git repository

**The answer.** Keep the map inside the user's own repository as an ordinary tracked text file that
the user's agent writes and Tortie only ever reads. Do not build a shadow git repository. The
reasoning is in section 4.3. The measurements are here, because they are the reusable part.

| Candidate | Mechanics | Verdict, with the deciding reason |
|---|---|---|
| **Tracked file in the repo** | The agent writes it, the user commits it, Tortie reads it | **Use.** The only option where `git rev-list --count <map-commit>..HEAD` is meaningful. Survives `git clean -xdff`. Changes with the branch, which is correct |
| **`.gitattributes` with `merge=binary`** | One tracked line | **Use.** Zero per-clone setup, because `binary` is one of git's three built-in merge drivers. Verified working from a tracked `.gitattributes` alone |
| Custom ref `refs/tortie/arch` | `commit-tree` with a private `GIT_INDEX_FILE` and a compare-and-swap `update-ref` | **Consider as an opt-in second mode.** 3 loose objects per revision, 200 revisions packed from 2,516 KB to **200 KB**, so about 1.0 KB per revision. Leaks into four places: `git log --all`, `git for-each-ref`, `git push --mirror`, `git bundle create --all`. Loses the freshness number |
| Separate `GIT_DIR` plus `core.worktree` | A repository in app data whose work tree is the project | **Reject.** Binds an absolute path at init. After `mv` it returns `fatal: this operation must be run in a work tree`. **And it does not even hide the map file, which still shows as `?? ARCH.json` in the user's own status** |
| Linked `git worktree` | A checked-out orphan branch | **Reject.** Writes `.git/worktrees/<name>/` inside the user's repo, appears in `git status` and `git worktree list`, and `git clean -xdff` leaves a `prunable` entry |
| Orphan branch | A branch with no shared history | **Reject.** Appears in `git branch -a`, which is the list users read most |
| `git notes` on a custom ref | A note attached to a commit | **Reject.** Silently orphaned by `git commit --amend`, confirmed with `error: no note found for object`. The only fix writes `notes.rewriteRef` into the user's `.git/config` |
| jujutsu, colocated | A separate version control system | **Reject.** Apache-2.0 and healthy at v0.44.0 on 2026-08-06 with 30,987 stars, and it adds a 9.7 MB third-party native binary, **writes `refs/jj/*` into the user's repository** to prevent GC, and adds a visible `.jj/` directory. Note that `jj util gc` does exist and issue #12 closed 2025-12-13, so the common objection that it has no GC is stale |
| isomorphic-git | Git reimplemented in JavaScript | **Reject.** MIT and healthy at 1.41.4 on 2026-08-13, and it is a second git implementation in a process that already shells out to git |
| nodegit | Node bindings over libgit2 | **Reject.** MIT wrapper over a GPLv2 core, and **its last stable release was 2020-07-28**, six years ago |
| libgit2 | Git as a C library | **Reject.** GPL-2.0 with a linking exception, which permits a closed binary, and it is native code duplicating a capability Tortie has |
| dugite | A git binary plus a wrapper | **Reject.** It bundles its own git binary and Tortie already resolves one |
| SQLite in `<userData>/gmux/` | A disposable derived cache | **Use, for the derived cache only.** Measured **50 of 50 writes in 0.086 s** under five-process contention, against **5.68 s and 133 attempts** for the same work through a git ref, and **15 of 50 landing** with no retry loop |
| `manifest.db` | Tortie's durability-critical database | **Reject.** The map is regenerable. `build/contract-inventory.mjs` byte-compares the manifest schema |

**What comparable tools do, and what it costs them.** Every row was read on this machine.

| Tool | Where per-project state lives | Identified by | Survives a rename? |
|---|---|---|---|
| VS Code | `<userData>/User/workspaceStorage/<id>/` | `md5(folderUri.fsPath + birthtime)`, in a file whose banner says `NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE` three times | **No** |
| Cursor | The VS Code scheme | Same | **No** |
| Zed | One SQLite file | `CREATE UNIQUE INDEX ix_workspaces_location ON workspaces(remote_connection_id, paths)` | **No** |
| JetBrains | Two places. `.idea/` in the project, caches at `~/Library/Caches/JetBrains/` | The `.idea` half moves with the directory | **The shared half yes, the cache half no** |
| Claude Code | `~/.claude/projects/<absolute path with slashes turned into dashes>` | A pure path slug | **No** |
| **Cline, current** | **`refs/cline/checkpoints/{sessionId}/{runCount}` inside the user's own repository** | The repository itself | **Yes** |
| Cline, former | An out-of-repo shadow repository, **now deleted from the tree** | The workspace path | It no longer exists |
| Roo Code | `<globalStorageUri>/tasks/<taskId>/checkpoints/.git` with `core.worktree` at the project | The absolute path | **No, and it refuses to run** |

**What path-keying costs, measured on this machine today.**

| Measurement | Value |
|---|---|
| Cursor `workspaceStorage` folders | 572 |
| Of those, pointing at a directory that no longer exists | **232, which is 40.8 percent** |
| Total size of Cursor `workspaceStorage` | 122 MB |
| `~/.claude/projects` directories | 2,595 |
| Total size of `~/.claude/projects` | **8.0 GB** |

Every path-keyed tool on this machine leaks. The two that do not are the two that keep their state
inside the repository.

**The JetBrains mechanism is worth copying and it is better than expected.** The IDE writes a
tracked `.gitignore` inside the shared directory naming the per-user files. On this machine it
reads `/shelf/`, `/workspace.xml`, `/dataSources/`, `/dataSources.local.xml`. So the shared model
and the per-user view state live in one directory and a committed ignore file decides which half
travels.

**Identity for the derived cache**, measured across an `mv` that both renamed and moved a directory
on one APFS volume.

| Candidate | Stable? | Trap |
|---|---|---|
| Absolute path | **No** | What VS Code, Cursor, Zed and Claude Code all use |
| Directory `st_ino` | **Yes** | Reused after deletion. Changes on a cross-volume move or a restore from backup |
| `st_dev` | Yes within a volume | Changes on remount |
| Directory birthtime | **Yes** | VS Code uses it as salt for the opposite purpose |
| Root commit SHA | Yes for a full clone | **A `--depth 1` clone reports a different root.** Measured: full `3ca093ac`, shallow `8f88d917` |
| A UUID in `.git/config` | Yes | A write into the user's git configuration, which `src/shared/fs-ops.ts` refuses |

Key the cache by `(st_dev, st_ino)` with the last known path as a display column. Losing the cache
costs a re-parse.

### Band 10. The map as a checkable contract rather than a picture

**The answer.** A map can be a checkable contract, the technique has a name and a 1995 origin, and
the checkable part is smaller and more fragmented than the field's marketing suggests. The
technique is the **reflexion model**: Murphy, Notkin and Sullivan, FSE 1995, DOI
10.1145/222124.222136, 476 citations, with a journal version at IEEE TSE 2001 volume 27 issue 4
pages 364 to 380, DOI 10.1109/32.917525. Its vocabulary is convergence, divergence and absence.

**Three different things can be asserted and no single tool asserts all three.**

| Assertion | Plain statement | dependency-cruiser | import-linter | ArchUnit PlantUML | ArchUnitTS |
|---|---|---|---|---|---|
| **Divergence** | An edge exists that the map never drew | Yes, `forbidden` and `allowed` | Yes, all six contract types | Yes, the whole mechanism | Yes |
| **Edge absence** | The map draws an arrow and no code realizes it | **Yes**, `required`, direct and transitive, **but module-scoped only** | No | **No, verified in source** | Present as `checkCoherence`, **never called** |
| **Box absence** | The map draws a box and no code matches it | No | **Yes, by default** | No | No |
| **Unmapped code** | A file falls in no box | Partial | **Yes**, `exhaustive = true` | **Yes**, "Class %s is not contained in any component" | Inverse switch only |
| **Overlapping boxes** | A file matches two boxes | No | No | **Yes** | No |

**Two facts decide the design.** No tool derives any of these from a drawing, so every one makes
you write the map twice, once as globs for the rule engine and once as the picture. And **nothing
validates against Mermaid**, which is the notation the operator named. ArchUnit reads PlantUML.
ArchUnitTS's diagram feature is 22 lines wrapping `plantuml-parser` 0.4.0, last released
2023-03-27. dependency-cruiser can emit Mermaid and cannot read it.

| Candidate | What it does | SPDX | Last release | Maintenance | Verdict |
|---|---|---|---|---|---|
| dependency-cruiser | Rule engine over the JS import graph, emits dot, archi, mermaid, d2 | MIT | 18.2.0, 2026-08-10 | 7,063 stars, 2 maintainers | **Consider then reject.** The only tool that can state a required edge, and `scope: folder` supports only `moreUnstable`, `circular` and `path`, so a box-level arrow is inexpressible |
| ArchUnit | Java. Layers, slices, cycles, `adhereToPlantUmlDiagram` | Apache-2.0 | v1.5.0, 2026-08-04 | 3,797 stars | **Study.** Its unmapped-class violation string is the wording to copy |
| ArchUnitTS | TypeScript port | MIT | 2.4.0, 2026-07-26 | 457 stars, **1 maintainer** | **Reject.** Bus factor of one, `typescript` as a runtime dependency, and the diagram feature rests on a parser last released 2023-03-27 |
| ts-arch | Same family | MIT | **5.4.1, 2024-12-23** | 1 maintainer | **Reject.** No release in 20 months, declares `typescript ^3.8.3`, and lists the npm squatter packages `fs` and `path` as dependencies |
| import-linter | Python. Six contract types | BSD-2-Clause | 2.13, 2026-07-03 | 1,135 stars | **Study.** The only tool with both box-absence and `exhaustive` checks. Its contract vocabulary is the best in the field |
| tach | Python. Declared `depends_on` | **MIT** | 0.35.0, 2026-05-12 | 2,788 stars | Wrong language. The declaration shape is worth copying. **Its README badge is dynamic and its LICENSE is MIT, so the earlier report of a contradiction was wrong** |
| eslint-plugin-boundaries | Element types by glob | MIT | 7.2.0, 2026-08-09 | 957 stars | Reject. Runs inside ESLint |
| Nx module boundaries | Tags plus `depConstraints` | MIT | 23.1.1, 2026-07-30 | Active | Reject. 120 direct dependencies, and Tortie is not a monorepo |
| Sheriff | Tags plus `depRules`, `index.ts` encapsulation | MIT | 0.19.6, 2025-09-22 | 312 stars | Reject as a dependency. **Zero runtime dependencies**, and its barrel-file rule already matches how Tortie's panes are built |
| Sonar Architecture | Draw the intended architecture, deviations become issues | Commercial | n/a | Active | **Reject on licence.** "not available in SonarQube Community Build" |
| dep-tree | `.dep-tree.yml` with allow and deny | MIT | **v0.23.4, 2025-03-22** | 17 months quiet | Reject. A Go binary |
| Deptrac | PHP layers | MIT | 4.7.1, 2026-07-23 | New home `deptrac/deptrac`. **`qossmic/deptrac` is archived** | Wrong language |
| PyTestArch | Python import rules | Apache-2.0 | 4.0.1, 2025-08-08 | 170 stars | Wrong language |
| **arch-go** | Go. Rules plus a **compliance threshold percentage** | **MIT** | v2.1.2, 2026-02-03 | **The live project is `arch-go/arch-go` at 270 stars. `fdaines/arch-go` has 2 stars and stopped in 2024** | Wrong language. **The threshold idea is the one to copy** |
| Spring Modulith | Verifies module rules, then generates the diagram | Apache-2.0 | n/a | 1,163 stars | **Study.** The clearest statement of the opposite strategy |
| ArchGuard | Architecture governance platform | MIT | n/a | 673 stars | Reject. A Kotlin backend server plus Docker plus a database |
| Konsist | Kotlin | Apache-2.0 | **v0.17.3, 2024-12-08** | 20 months | Wrong language |
| ArchUnitNET | .NET | Apache-2.0 | 0.13.3, 2026-03-05 | 1,346 stars | Wrong language |
| NetArchTest | .NET | MIT | **pushed 2024-07-29** | 2 years quiet | Wrong language |
| go-arch-lint | Go, YAML components | MIT | v1.17.0, 2026-08-05 | 529 stars | Wrong language |
| Semgrep | Pattern rules | **LGPL-2.1** | n/a | 16,235 stars | Reject on licence |
| madge, skott, arkit, LikeC4, Structurizr | Graphs and drawings | MIT, MIT, MIT, MIT, Apache-2.0 | various | various | Reject for this band. None checks code against a drawing |

**Measured on Tortie, by the band and reproduced at synthesis.** A hand-drawn 8-box map with 14
arrows, checked against the real imports, produced 12 convergences, 14 divergences and 2 absences.
One of the two absences is `UI -> Bridge`, which is real, correct and load-bearing, and which no
import-based tool can see. Two further measurements matter more than the totals.

| Measurement | Value | What it means |
|---|---|---|
| Total cross-box import weight | 703 | |
| Weight explained by a drawn arrow | **541, being 77.0 percent** | A first-draft map written in about ten minutes explains 77 percent of the real coupling. That is the number to show, and it moves when the code drifts |
| Divergences at edge weight 1 or more | 14, carrying 23.0 percent of weight | |
| Divergences at edge weight 2 or more | **9, carrying 22.3 percent** | Moving the threshold from 1 to 2 removes 5 of 14 findings for 0.7 percentage points. **The cheapest noise reduction available** |
| Unmapped files, with a catch-all `main/` box | **0 of 621** | The check is vacuous |
| Unmapped files, no catch-all box | **78 of 621, being 12.6 percent** | Grouped by directory it names the missing boxes directly: `main/harness` 11, `main/log` 11, `main/updates` 10, `main/actions` 9 |

**The rule that follows.** A box may not have a catch-all glob. Ban it, and the unmapped report
tells you which boxes you forgot to draw. Allow it, and the single best drift signal returns zero
for ever.

**Should it block a commit? No.**

| Position | Verdict | Deciding reason |
|---|---|---|
| Block on any divergence | Rejected | The first honest map produced 14 divergences and 6 came from one bad catch-all box. A gate wrong 43 percent of the time on its first run gets switched off, and Tortie's gate culture depends on gates being believed |
| Show nothing | Rejected | This is what the AS-BUILT corpus does today, and thirteen documents are more than 250 commits behind |
| **Mark divergences of weight 2 or more, and state coverage in one line** | **Recommended** | A divergence is a drawing state and not an error. It is the arrow the operator did not draw. Clicking it opens the first file |

Both mature tools ship a ratchet. ArchUnit has `FreezingArchRule` with a
`TextFileBasedViolationStore`. dependency-cruiser has `depcruise-baseline`, which writes
`.dependency-cruiser-known-violations.json`, after which `--ignore-known` prints
`⚠ 20 known violations ignored`. **A warning for whoever writes the brief.** A baseline file is a
second thing to keep current and an agent can write it. If one exists it must be regenerated
deliberately by a person, never rewritten by the app when it notices a new violation.

**The one idea worth copying from import-linter.** Its
`unmatched_ignore_imports_alerting = "error"` default fails the contract when an **exemption** stops
matching anything. That is what stops an exemption list going out of date, and Tortie already has an
exemption list of exactly this kind in `build/assert-import-boundaries.mjs`.

### Band 11. Having the user's own agent build the map

**The answer.** Drive the user's own agent, in three layers and in this order:

1. Tortie computes the structural half with no model at all.
2. Tortie serves that structure to the agent over an MCP stdio server that it launches nothing for.
3. Only then does Tortie compose an argv and ask a person to press one button.

The band adds no new npm dependency. It adds no new licence exposure. It changes no Content
Security Policy and no entitlement.

Eleven of the fourteen agent CLIs checked resolve to a binary on this machine, and nine can be
driven non-interactively with a documented machine-readable output.

| CLI | Non-interactive invocation | SPDX | Notes that decide anything |
|---|---|---|---|
| **claude** 2.1.233 | `claude -p ... --output-format json --allowedTools ... --model sonnet --max-budget-usd N --autocompact 200000` | Proprietary | **`--max-budget-usd` is the only hard dollar cap of any candidate, and it works only in print mode.** So the estimate can be an enforced ceiling. **Never add `--bare`**: `claude --help` says "Anthropic auth is strictly ANTHROPIC_API_KEY or apiKeyHelper via --settings (OAuth and keychain are never read)" |
| **codex** 0.147.0 | `codex exec ... --sandbox workspace-write -C <repo> -o <file> --output-schema <f> --json` | Apache-2.0 | **`-o` writes the map to disk with no write tool granted at all.** Smallest permission grant of any candidate |
| **gemini** 0.54.0 | `gemini -p ... -o json --approval-mode auto_edit` | Apache-2.0 | **1,000 model requests per user per day free**, 60 per minute. A whole map build is about 12 percent of one free day |
| **agy** 1.1.13 | `agy -p ... --output-format json --print-timeout 60m` | Not established | **`--print-timeout` defaults to `5m0s`**, which kills a 20 to 40 minute build silently |
| **cursor-agent** 2026.08.11 | `cursor-agent -p ... --output-format json --force` | Proprietary | Its parameters page documents **no token or cost field in any output format** |
| **qwen** 0.21.9 | `qwen -p ... -o json` | Apache-2.0 | Gemini CLI fork. Free tier claim unverified |
| **opencode** 1.18.16 | `opencode run ... --format json --agent build --dir <repo>` | MIT | Bring your own provider, including a local model. **The only candidate that can satisfy the offline rule end to end** |
| **amp** | `amp -x ... --stream-json` | Proprietary | **The installed build is dated 2025-10-15**, about 10 months old |
| **pi** 0.84.2 | `pi -p ... --mode json` | MIT | Bring your own provider. No usage reporting in `--help` |
| **muse** 0.1.0 | `muse exec --prompt-file <f> --json` | Not established | Pre-1.0 |
| **codewhale** | `codewhale exec ...` | MIT | Published 2026-08-13 |
| **deepseek** | `deepseek exec ...` | n/a | **`deepseek exec --help` exposes no flags at all** |
| **droid** | `droid exec ... --output-format json --auto medium` | Proprietary | Documented result has no token or cost field |
| **aider** | `aider --message ... --yes` | Apache-2.0 | **Reject.** One PyPI release in twelve months and no push in 85 days, with 1,802 open issues |

**MCP, the direction that reduces the cost.** The current protocol revision is **2026-07-28**, and
it added `server/discover` as a mandatory RPC. The stdio transport is "newline-delimited messages
over the standard streams of a **client-launched subprocess**", so **the agent launches the server
and Tortie runs no daemon and opens no port**. Tortie already runs `ELECTRON_RUN_AS_NODE=1` in
`src/renderer/context/install/plan-adapter.ts`, and `electron-builder.yml` comments on it
deliberately so the machine needs no node, npm or npx.

Pass the server on the argv of a session the user is already creating, which is an act the user
already confirmed. Three forms are verified from installed binaries: `claude --mcp-config`,
`amp --mcp-config`, and `codex -c mcp_servers.tortie.command=...`. **Never pass
`--strict-mcp-config`**, which `claude --help` documents as "Only use MCP servers from
--mcp-config, ignoring all other MCP configurations", because that silently disables every server
the user configured.

**The arithmetic that decides the direction.** File reading is 77 percent of everything added to
context during a map build. Handing the agent a module inventory with sizes and import edges as one
tool result of about 25,000 tokens collapses that phase from 90 turns to about 25.

| | Turns | Average context | Cumulative input | Cost on Sonnet 5 |
|---|---|---|---|---|
| Without MCP structural tools | 122 | 130,000 | 15.9 M | **$9.10** |
| With them | 55 | 95,000 | 5.2 M | **$5.01** |

That is a 45 percent cut on a first build, and a larger cut on refresh. It also accrues on every
ordinary agent turn, not only during a map build.

**One trap for the manifest.** An MCP server path baked into a session's argv becomes durable
state, and CLAUDE.md requires absolute binary paths in the manifest. If `Tortie.app` moves, restore
of that session breaks for a reason unrelated to the agent. That puts the MCP direction at Tier 3.

**The confirm gate, and why it barely exists here.** The precedent is already in the tree.
`src/renderer/context/install/plan-adapter.ts` compares a rendered command line against the one
that will run, token by token, and its own comment says why: "A confirm that shows one thing while
another runs is worse than no confirm, so this module compares them TOKEN BY TOKEN and reports a
mismatch. A mismatch is a HARD blocker."

Under the recommended design there is nothing to confirm, because Tortie spawns nothing new. The
naming pass composes text and hands it into a session the user picked, and the user presses Return.
**The verb may not create a session.** If it could, a canvas would become a way to start a process.

A stored "map command for this project" would be a configuration row naming an executable, and the
existing gate in `src/main/config/confirm.ts` would apply verbatim, including the seal held outside
the configuration directory. Its own comment states the reason: "The hash says which bytes were
agreed to. The seal says that Tortie is the one who recorded the agreement."

**What must never be built**, and each row is a refusal rather than a preference.

| Tempting | Why it is refused |
|---|---|
| A watcher that rebuilds the map when files change | Refusal 8's stated reason. Tortie runs many prompt-injectable agent processes with home-directory write access |
| A nightly schedule | A process start with no person present, spending the operator's weekly window while asleep |
| Rebuilding **the graph** on project open or app launch | Same. **This row is about the scan**, meaning ripgrep enumeration, tree-sitter parsing and the roll-up. It does not forbid a `git log` on a document the user has just opened or is looking at in the Explorer, which is a read of data git already maintains and which SCM performs today on every repository change. Section 10.2 states when phase A performs that read |
| A git hook Tortie installs | A repository write plus an automatic process start |
| Reusing a confirmation for a different model or agent | Both are execution-bearing fields |
| Fanning the build across agent teammates | Claude Code's own documentation measures agent teams at "approximately 7x more tokens than standard sessions" in plan mode |

### Band 12. Canvas user experience at scale, and keyboard first navigation

**The answer.** Use discrete named levels reached by a key, not continuous semantic zoom. Use
cue-based focus, not a fisheye and not a minimap first. Do not bundle edges. And the keyboard model
has to be invented, because the survey turned up an absence rather than an answer.

**Why continuous semantic zoom loses, with the spacing measured.**

| System | Range | How detail appears | Spacing per detail step |
|---|---|---|---|
| Google Maps Static API | 0 to 21 and beyond | Five named steps, precision doubles per level | 5 levels, a factor of 32 |
| Mapbox and MapLibre | 0 to 24 | Per layer `minzoom` and `maxzoom`, a hard cut | Author's choice, several levels |
| Perfetto UI | Continuous, keyboard driven | **No level-of-detail switch at all.** W and S zoom, A and D pan, F centres then fits | n/a |
| **Tortie panel zoom** | **0.75 to 2.0** | One shared accessibility control | **The whole ladder is a factor of 2.67** |

Tortie's entire camera range is less than one tenth of one Google Maps detail step. It cannot carry
four levels of an Arch model, and a second larger camera inside the pane would be a second answer
to a question `DESIGN.md` §1.4 already answers with "Zoom is a MULTIPLIER over one base size, never
a competing setting".

**Focus and context.** The classification is Cockburn, Karlson and Bederson, ACM Computing Surveys
2009, DOI 10.1145/1456650.1456652, 647 citations. It names **four** approaches, not three, and the
fourth is the cheapest and the one to adopt.

| Approach | The abstract's own words | Fit |
|---|---|---|
| Overview plus detail | "uses a spatial separation between focused and contextual views" | This is the minimap. Secondary at best |
| Zooming | "uses a temporal separation" | Refused above |
| Focus plus context | "minimizes the seam between views by displaying the focus within the context" | This is the fisheye. Refused, because a per-node non-uniform transform reintroduces the mismatch between the layout box and `clientX` |
| **Cue based** | "selectively highlight or suppress items within the information space" | **Adopt.** `--graph-dim: 0.45` already exists at `src/renderer/styles/tokens.css` line 89 and the SCM commit graph already uses it for exactly this |

**Edge bundling is refused.** The evidence is arXiv 2607.20089, Wallinger and Kobourov, an IEEE VIS
short paper submitted 2026-07-22 over a corpus of 102 papers of which 49 contain explicit bundling
tasks. Its abstract says bundling "simultaneously enables tasks (bundle-level and global reasoning)
and disables others (element-level precision)". Two of the operator's three questions are
element-level, and those two are the reason the feature exists.

| The operator's question | Scope | Does bundling help? |
|---|---|---|
| "What is happening over in this piece?" | Global | Yes |
| "Where is that data coming from?" | Element | **No, it actively disables this** |
| "Which API?" | Element | **No** |

Tortie already agrees with this internally. `--graph-bundle: var(--text-muted)` in `tokens.css`
carries the note "no hue at all", so a bundle is already something to de-emphasise rather than to
read.

**Keyboard navigation, where the survey found nothing.**

| Tool | Move focus between nodes | Follow an edge from the keyboard | Traversal? |
|---|---|---|---|
| **Data Navigator**, CMU, MIT, zero dependencies | `move(id, direction)` over author-defined `navigationRules` | **Yes, and it is the only one.** Its edges carry `direction: 'source'` or `direction: 'target'` | **Yes** |
| Perfetto UI | "." and "," move between adjacent slices on the same track | No | Partial |
| Highcharts accessibility | Left and right between points, up and down between series | n/a | Two axes over a fixed ordering |
| React Flow | Tab through nodes and edges | **No.** Arrow keys move the node itself | No |
| Chrome DevTools performance | W, S, A, D | No | No |
| Obsidian Canvas | None documented | No | No |
| CSS Spatial Navigation, W3C | Arrow keys to the geometrically nearest candidate | No | Geometric only |
| Miro | Claims WCAG 2.2 AA and "keyboard navigation across the board", names no keys | Unknown | Claimed, unspecified |

The ARIA Authoring Practices Guide has 32 patterns and **none of them is a graph, a node link
diagram, a canvas or a map**. Treegrid is the nearest fully specified pattern.

**The finding the first sweep missed.** `aria-flowto` is the standards-track mechanism for exactly
the verb this needs. WAI-ARIA 1.2 says, verbatim, that with "multiple ID references, assistive
technologies SHOULD present the referenced elements as path choices", and that "The name of the
path can be determined by the name of the target element". The Graphics Module lists it as an
inherited property on all three graphics roles. **I could not verify that VoiceOver supports it**,
and VoiceOver is the only screen reader that matters for a macOS-only app, so emit it because it is
correct and one attribute, and build the real keys with Tortie's own handler.

The geometric alternative loses. CSS Spatial Navigation has been a W3C Working Draft since November
2019 without advancing, five of its features are marked at risk, and the specification says of its
own scoring formula that it "seems to give good answers". A key whose destination depends on pixel
layout is not predictable.

**Handing a selection to an agent.** Send short plain text naming paths and edges. Do not send an
image and do not send file contents. Figma's MCP server is the closest product and its default tool
`get_metadata` returns "a sparse XML representation of your selection containing just basic
properties", with `get_screenshot` as a separate call the agent must choose. Arch has an advantage
Figma does not, because its nodes already carry repository-relative paths, and 73 percent of the
operator's own code references are already backticked paths.

**One gap with no precedent anywhere.** Perfetto is the only surveyed tool that can address a
selection by URL, using `ts`, `dur`, `pid` and `tid`. Nothing addresses a canvas region by an
identifier that survives a re-layout. If an Arch selection must be quotable later, that identifier
is new design work.

---

## 6. Discontinued products, and what the ones still sold have in common

This section is the strongest argument against building the canvas, so it gets its own weight
rather than a paragraph. Every status below was checked live on 2026-08-15.

### 6.1 The products that were discontinued

| Product | What it was | Licence | Status verified today | The number |
|---|---|---|---|---|
| **Sourcetrail** | Interactive source explorer with a code graph. The closest historic product to Arch | GPL-3.0 | **Archived.** GitHub reports `archived: true`, last push 2021-12-13. The README says the project "was archived by the original autors and maintainers of Sourcetrail by the end of 2021" | **16,490 stars.** 355 open issues frozen. 4 watchers |
| **CodeSee** | Hosted codebase maps and visual pull request review | Proprietary | **Gone.** `codesee.io` fails to connect and `www.codesee.io` returns HTTP 404. Assets went to GitKraken on 2024-05-14. In the `Codesee-io` organization both product repositories are archived with a last push of 2023-07-26 | Raised **$10M** |
| **Structure101** | Levelized structure map, dependency structure matrices, architecture enforcement | Proprietary | **No longer sold.** Sonar's own FAQ answers the question "Will Structure101 products still be available for sale?" with **"No"** | n/a |
| **Visual Studio Architecture Explorer** | Browse and diagram solution structure | Proprietary | **Removed, announced 2014-10-24.** The stated cause is quoted in full below | n/a |
| **Structurizr cloud service** | Hosted C4 diagram rendering | n/a | **End of life.** The EOL page lists four products and gives no dates. The author's stated reason is that "usage has since steadily declined" | The C4 author killed his own hosted service |
| **Structurizr Lite, CLI and Java** | Local C4 tooling | MIT and Apache-2.0 | **All three repositories archived on 2026-02-01.** The core `structurizr/structurizr` repository is **not** archived and was pushed 2026-06-29 | Consolidated rather than abandoned |
| **GitHub repo-visualizer** | GitHub's own repository diagram Action | MIT | **Archived, and it was dead long before the flag.** Last release and last real commit both **2023-04-18** | 2 years 10 months dead before archiving |
| **github/semantic** | Multi-language parsing and analysis | MIT | **Archived 2025-04-01** | 16 months read-only |
| **github/stack-graphs** | Incremental cross-file name resolution | Apache-2.0 OR MIT | **Archived 2025-09-09.** "This repository is no longer supported or updated by GitHub" | Crate last published 2024-12-13. It was the theoretically perfect fit for this feature |
| **CodeCity** (Wettel) | The original 3D code city, 2007 | **Academic, non-commercial only** | Long dormant. Its own FAQ says it is "developed in VisualWorks Smalltalk under an academic license, limited to non-commercial use" | Cannot be used commercially at all |
| **mxGraph** | Diagramming library | NOASSERTION | **Archived 2020-11-13** | 6 years |

**The 2014 cause of death, quoted exactly**, because it is the one that applies most directly to a
level 2 that falls through to the Explorer tree:

> "complicated to use, and many of its capabilities are already subsumed by the solution explorer,
> class view and object browser"

### 6.2 The products still sold, and how they are built

Not one product still sold in this survey sells a persistent picture a human is expected to visit.

| Product still sold | The pattern | Evidence |
|---|---|---|
| **SciTools Understand** | Generate on demand from a live index, store nothing. Graphs are an entry point, never the product | 30 years old. Now ships AI summaries on a graph node click |
| **VS Code Map** | Same. It survived Microsoft's own 2014 cull because it generates on demand | Enterprise edition only, optional component install. Its own docs concede "memory limitations may prevent you from expanding all the groups" |
| **NDepend** | The graph sits beside quality gates rather than above them | Its docs state: "Before NDepend v2020.1 ... the NDepend Dependency Graph was not able to show more than a few dozens boxes and then became un-understandable". **The only vendor in the survey who states in writing where their graph stopped working** |
| **ArchUnit** | Make the model executable so it fails a build. **There is no picture, only a red build** | Apache-2.0, pushed 2026-08-14, 3,797 stars |
| **Lattix** | Survives because an auditor requires it | Featured news is a $1.45M F-16 airworthiness contract. Site returned HTTP 403 to two attempts, so liveness unconfirmed |
| **Softagram** | Attach the picture to a moment rather than to a place. It draws on a pull request | $19 per active developer per month |
| **IcePanel and Ilograph** | Survive by never promising freshness. **Neither makes any code-sync claim** | IcePanel says "Modelling keeps diagrams in sync", which is about its own model, not the code |
| **Moderne** | The model became a tool rather than a view. **It draws no diagrams at all** | Fixed 38,000 call sites across 400 repositories in one recipe. "The agent plans, Moderne executes" |
| **Swimm** | **Pivoted away entirely.** Its home page headline is now "Agentic modernization, delivered". Documentation and drift appear nowhere on it | It used to be documentation that detects its own drift. This is the most damning single data point in the survey |

### 6.3 The pattern that is growing, and which this design refuses

Three commercial products still sold, in different countries and different market segments, independently
stopped selling the picture to humans and started selling it to coding agents. All three moves are
inside the last twelve months.

| Who | The move | Date verified |
|---|---|---|
| **Sonargraph** | Shipped an MCP server that "can guide any coding agent with MCP support to understand and respect architectural rules", and can "export known architecture violations that can then be fixed by the coding agent" | News item dated **2026-08-13**, two days before this research |
| **CAST Imaging** | "Headless via MCP ... with no interface required", supporting Claude among others. Its headline claim is "Achieve 2X+ AI accuracy" | Live 2026-08-15 |
| **CodeScene** | Stopped selling pictures and started selling a number framed as agent performance: "The average enterprise codebase scores 5.15 out of 10. AI needs 9.5 to work reliably" | Live 2026-08-15 |

An agent reads the whole map on every turn and never stops opening it. It is the only reader in the
entire survey with no retention problem. **Tortie is the only product in the survey that already
runs the agents**, so it is the only one that gets that reader for free. Design 1 rejected this
direction in one line. All three judges said that rejection was the largest missed opportunity in
the proposal.

### 6.4 The control experiment

**Atlas Architecture Explorer.** A fully local VS Code architecture view that makes no network
requests of any kind. Version 0.1.5, last updated **2026-07-23**, which is three weeks before this
research. It is built to almost exactly the specification the operator described.

**It has 10 installs.**

That is one data point from an unmarketed extension and it should not be read as more than that. It
is also the only install figure obtainable for a tool of this exact shape, and it is the closest
thing to a controlled test that exists.

### 6.5 The one thing this survey proves is real

Rost, Naab, Lima and von Flach Chavez surveyed **147 industrial participants across eight
countries** in 2013 at Fraunhofer IESE. Their top-ranked problem was **outdated architecture
documentation at 25 occurrences**, ahead of inadequate granularity at 19 and implementation out of
sync at 17. Their own comparison against Lethbridge, Singer and Forward in 2003 reads "almost no
improvement has been achieved within a whole decade". Nothing published since overturns it, which
makes this a 23-year unbroken finding.

The same survey supports the operator on one point. Its fourth finding is that developers want "a
more interactive way of working with architecture documentation" with better navigation and
Google-like search, and the authors conclude that "static architecture documents as they are common
are not adequate for serving the needs of developers".

**So the need is real and the picture is what dies.** That is the whole argument for phase A and
phase B and the whole argument against phase C2 without a gate.

---

## 7. Staleness, provenance, and being wrong

### 7.1 The exact record kept per node

Two axes, never merged into one. This follows Argo CD, which separates sync from health, and it
exists because a `Decision` node recording why one approach beat another is permanently
uncheckable and must not render like a failure.

| Axis | What it measures | Values | How it is shown |
|---|---|---|---|
| **Coverage** | Whether the extractor could read this at all | `checked`, `partly-checked`, `unverifiable`, with a reason | Per node in the panel. One counted line in the header |
| **Confidence** | Whether the syntax says so or a literal matched | `extracted`, `inferred` | Edge line style. Solid and dashed. Nothing else |
| **Name age** | Whether the name predates the code it describes | An integer count of commits | A plain sentence in the panel. **Never on the box** |

The unverifiable reasons are a closed set, and each is a plain word rather than a code:
`runtime-artifact`, `gitignored`, `template`, `framework-convention`, `not-a-path`, `prose`,
`budget-exceeded`, `no-grammar`, `unfollowed-call-form`.

### 7.2 The check, rung by rung, with the measured cost

Every number is measured on this repository, best of three, timed outside the shell.

| Rung | The claim it checks | Command | Measured |
|---|---|---|---|
| 0 | The anchor still exists | `git ls-tree -r HEAD --name-only` | 19.5 ms to build the set, then under 1 ms per lookup |
| 1 | The subtree is unchanged | `git ls-tree -r -d` into `git cat-file --batch-check` | **33.6 ms for all 153 directories** |
| 1, done wrong | The same, one process per directory | 20 separate `git rev-parse` calls | **275.3 ms.** 8.2 times worse for one eighth of the work |
| 2 | Which anchors were touched | `git log --name-only`, 50 commits | 24.0 ms |
| 2 | The same over all history | `git log --name-only`, 217 commits | 132.9 ms |
| 3 | The path moved rather than vanished | `git log --diff-filter=R -M --name-status` | 115.8 ms |
| 4 | The path was deleted, and when | `git log --diff-filter=D --name-only` | 120.4 ms |
| **All** | | five git processes | **414.4 ms** |

Rungs 3 and 4 scale with history depth rather than file count, so on a 9,275-commit repository the
freshness walk alone was measured at 500 ms warm and 1,290 ms cold. That is the cost that must be
budgeted with a commit-count ceiling and an honest `budget-exceeded` state.

### 7.3 Why a miss is usually not a lie

This is the most important correctness finding in the whole workflow and it is why a raw broken
reference count must never be shown.

The band resolved every backticked path in four of the operator's own documents against HEAD. The
document **5 commits behind** resolved **64.6 percent** of its path claims. The document **463
commits behind** resolved **90.5 percent**. A raw badge would have shown the current document as
worse than the old one.

Six causes of a miss, of which only the last is a lie.

| Cause | Example from the corpus | A lie? |
|---|---|---|
| Runtime artifact, never committed | `state.json`, `update-check.json` | No |
| Gitignored build input | `pnpm-lock.yaml` | No |
| Template with a placeholder | `skills/<name>/SKILL.md` | No |
| Framework convention, not a repository file | `next/image`, `loading.tsx` | No |
| Not a path at all, mis-classified | `try/catch`, `0/30` | No |
| Genuinely gone or never existed | the residue | **Yes** |

ReCite reached the same structure independently on the Linux kernel, which makes this established
rather than one agent's finding.

### 7.4 What the canvas or the list actually shows

Six rules, each with a source.

1. **Nothing is coloured for state.** `DESIGN.md` spends colour on state alone and reserves amber
   for "needs you". `--git-modified` is measured at ΔE2000 4.5 from `--status-attention` and
   terminal bright yellow at 6.0, which is why yellow is banned outright. A stale name marked amber
   is one step from a node that looks like it needs the user, and it does not.
2. **Provenance is carried by geometry and a glyph, never by hue.** See section 9.5.
3. **The graph is never marked stale, because it is never stale.** The header says so once, in the
   same sentence as the coverage counts, and saying it plainly is what stops a reader transferring
   the old fear about drawn diagrams onto this one.
4. **The count goes in the panel for the selected node, never on the box.** The Zen refuses
   counters on drawn objects and this rule is what keeps section 8's amendment small.
5. **Focus is cue-based.** Selecting a node dims everything not touching it using the existing
   `--graph-dim: 0.45`.
6. **Silence is never the answer to a question that was never asked.** Borrowed from difftastic,
   whose `DEFAULT_GRAPH_LIMIT = 3_000_000` exists so it can degrade to a line diff and say so.

### 7.5 The four things Tortie can honestly assert, and nothing more

- Every drawn box matches at least one real file.
- Every drawn box matches at most one region, so boxes do not overlap.
- Every real edge above weight 2 rolls up into a drawn arrow, for the edge kinds this reader
  follows.
- Every file lands in some box, provided no box has a catch-all glob.

That is a small claim and it is worth making, because all four break silently today and each one
breaking is a specific sentence the pane can show.

### 7.6 Six things that cannot be checked mechanically

The first four are permanent and the last two are merely hard.

| # | What | Why |
|---|---|---|
| 1 | Why the edge exists | A checker can prove one module imports another. It can never say whether that is the design or an accident. No provenance category in the corpus carries purpose |
| 2 | Whether the grouping is right | There is no mechanical level between 4 boxes and 136. The boxes are a judgement about what the product is |
| 3 | An edge absence, reliably | `UI -> Bridge` is real, correct, load-bearing and produced a false absence. Any edge crossing a global object, a string channel, a process boundary, a subprocess argv, a database table or the filesystem is invisible to an import scan |
| 4 | Behavioural edges in general | Structural edges are computable. `spawns`, `reads from`, `writes to`, `emits`, `authenticates with` and `transitions to` are what the corpus drawings spend their arrows on |
| 5 | Deliberate absence | findunmet states there is no Sentry, no PostHog, no Redis and no Resend. A checker cannot confirm a chosen negative |
| 6 | Whether the reason is still true | A decision paragraph can be perfectly current in structure and obsolete in reasoning, because the constraint that forced it went away |

---

## 8. The Zen question

The operator said the Zen may need upgrading and that he considers the feature important enough to
change it for. It does need a change. **The change proposed by the design is not the minimum honest
one.** Two of its four edits should be accepted and two rejected, and all three judges said so
independently.

Present the whole of section 8.4 to the operator as one accept-or-reject decision.

### 8.1 The exact current words

From `docs/ZEN-OF-TORTIE.md`, read on 2026-08-15.

The section header, at line 102:

> ## What Tortie is not
>
> A principle that forbids nothing is decoration. These are the refusals:

The first refusal, at lines 106 to 107:

> - **Not a dashboard.** No counters, no activity feeds, no progress theatre. A
>   number that rises on its own is not a signal, it is noise in a nicer font.

The second refusal, at lines 108 to 111:

> - **Not an IDE rebuilt from scratch.** Search across projects earns its place,
>   because agents rewrite code faster than a human can track it. Structural
>   search, replace-in-files, language servers, debuggers, task runners and
>   extensions do not.

The three that follow, unchanged and quoted so the operator can see what is being left alone:

> - **Not a supervisor's console.** Tortie never asks the human to watch an agent
>   work.
> - **Not a tool that teaches its own internals.** No prefix keys, no attach
>   ritual, no vocabulary borrowed from the layer underneath.
> - **Not clever where it could be dull.** Anything durability-critical should be
>   boring, inspectable and older than this product.

### 8.2 The four proposed edits, and the verdict on each

| Edit | Verdict | Reason |
|---|---|---|
| **1. A new section, "Show the shape of the work"** | **Accept, with one line corrected** | Purely additive. It removes nothing and it states the product reason honestly. Its closing line is currently false, see 8.3 |
| **2. Weakening "Not a dashboard"** | **Reject** | It is the one genuine weakening in the set, it fails its own test, and shipped precedent in this repository makes it unnecessary. See 8.5 |
| **3. A new refusal, "Not a diagram you maintain"** | **Accept** | Additive. It loosens nothing, and it is the guard that stops edit 1 being read later as permission to ship an authored diagram surface |
| **4. Appending a clause to the search bullet** | **Reject** | CLAUDE.md's parity cap already reads "unless the user explicitly asks otherwise", so the explicit ask is the mechanism the charter already provides. Writing it into the Zen converts one operator decision into standing precedent, and the next proposal will cite the sentence instead of asking. **The exact proposed clause cannot be quoted.** See 8.5 |

### 8.3 The exact proposed words, as they should be accepted

**Insert as a new section after "Give every thread a place" and before "Hide the machinery".**

> ## Show the shape of the work
>
> Agents write more code than a person can read.
>
> A file tree answers where something is. It cannot answer what this project is made of, which
> parts speak to each other, or which of those parts we wrote and which we borrowed. When most of
> the code arrived from an agent, that second question is the one a person needs, and today it
> lives only in the head of whoever last read the whole thing.
>
> So Tortie draws the project as parts and connections, coarse on purpose, computed from the code
> rather than described by anyone. The drawing is a reading of the repository, and it is thrown
> away and read again. Nothing about it is remembered except the names, because a name is the one
> thing a machine cannot get right.
>
> A person may improve the names. A person may never add a part the code does not contain.

**The last line is the correction, and it is coupled to the blocking decision in section 4.2.3.**
The design's own wording was "A person may never move a box the code did not put there". Its
section 9.2 lets a model create groups and reassign membership, and a group is what a level 0 box
is, so that sentence is false as the design stands. Which closing line is correct depends on which
position section 4.2.3 takes, so the two candidates are printed here side by side.

| If section 4.2.3 takes | The `group` field | The closing line of the new Zen section reads |
|---|---|---|
| **Position A, recommended** | Dropped. Grouping is the deterministic directory partition and the overlay renames only | "A person may improve the names. A person may never move a box the code did not put there." |
| Position B | Kept, with the premise rewritten | "A person may improve the names. A person may never add a part the code does not contain." |

**The second line is true under both positions**, which is why it is the one printed in the
blockquote above. If the operator takes position A he may use either line. If he takes position B
he must use the second one. Accepting the Zen text therefore also requires choosing A or B, and
section 8.4 states that as one decision rather than two.

**Add as a new bullet in "What Tortie is not", after "Not an IDE rebuilt from scratch".**

> - **Not a diagram you maintain.** Tortie never asks a person to draw the architecture, keep it
>   current or learn a notation. It reads the code and draws what is there. A person may name what
>   it found, and may never add to it.

### 8.4 The decision, which has two coupled parts

**Accept:** one new section of 150 words, and one new refusal bullet of 43 words. Both counts
exclude the headings. Both edits are additive. The Zen gains a principle and a refusal, and loses
nothing.

**Reject:** the weakening of "Not a dashboard", and the clause appended to the search bullet.

**And choose A or B in section 4.2.3 at the same time**, because the closing line of the new Zen
section depends on it. The two candidate lines are printed side by side in section 8.3. Accepting
the Zen text without choosing a position leaves the Zen carrying a sentence whose truth is not yet
settled, which is the exact fault this section is correcting.

That is the whole change. Nothing else in the Zen moves.

### 8.5 Why the dashboard weakening is not needed, and the shipped precedent that replaces it

The design proposed appending this to the dashboard refusal:

> One exception, and it is narrow. A count of what Tortie could not read, or of how far a
> description has fallen behind the code it describes, measures the product's own honesty rather
> than the user's activity. It is never coloured, it never appears on a drawn object, and it goes
> to zero when the gap closes.

Three reasons to refuse it, and the third settles it.

1. **It fails its own test on its primary case.** The clause promises the number "goes to zero when
   the gap closes". The count of files in no part never closes on a repository written in a
   language Tortie has no grammar for, and the design makes that permanent on purpose. A Swift
   project carries a nonzero number for ever. That is a counter that rises on its own and never
   falls, admitted by a clause written as though it could not happen.
2. **The category is a class rather than a surface.** "Measures the product's own honesty rather
   than the user's activity" equally describes a count of files Search could not index, a count of
   sessions whose status oracle could not read the output, and a count of agents whose resume
   command could not be harvested. A later round will cite this sentence.
3. **The honest half already shipped without an amendment.** `src/renderer/scm/freshness.ts` puts
   the age of the last fetch on screen, which is a number that rises on its own with the clock. It
   shipped in Phase 14.5 under the Zen exactly as it stands. Its own header states the rule and the
   voice, quoted verbatim:

> "a compact age beside the Sync glyph, but ONLY in the one state where silence would be a lie ...
> Voice: quiet and factual. It reports when we last looked; it never scolds"

**So the mechanism is already in the tree and it costs no Zen text.** Show the name-age sentence
only when a name is older than the code it describes. Cite `scm/freshness.ts` in the phase brief as
the precedent. And **delete the unmapped-file counter entirely**, because under the recommended
directory grouping it was measured at 0 of 621 with a catch-all box and it names an artifact of
where the algorithm cut rather than a defect anyone can fix.

**On edit 4, and why it is described rather than quoted.** Edit 2 is quoted in full above, so the
operator can read the words before rejecting them. Edit 4 cannot be given the same treatment. The
design document that proposed it is not on disk in the session scratchpad, and the clause was not
carried verbatim into the material that reached synthesis. All that survives is its target, being
the "Not an IDE rebuilt from scratch" bullet, and its effect, being to name an architecture view as
a second thing that earns its place beside cross-project search. **So the operator is being asked
to reject a described edit rather than a quoted one, and that is a weaker position than the one he
is in on edit 2.** The rejection does not depend on the wording. It depends on the mechanism, which
is that CLAUDE.md already carries "unless the user explicitly asks otherwise" and the Zen does not
need a second copy of it. If the operator wants the quoted text before deciding, edit 4 should be
held over rather than rejected on this document's word.

### 8.6 What must not change, and why this feature is the pressure that would erode it

| Refusal | Why an Arch pane is exactly the pressure |
|---|---|
| 1, no third-party code executes in any Tortie process | The next ask after a canvas is always a custom node renderer, and a renderer is code |
| 2, no SDK, no contribution-point registry | "Let people define their own node types" is a contribution registry with a different name |
| 3, no marketplace | Diagram templates would be a store's first product |
| 4, no mechanism may implement or intercept Explorer, SCM, search, terminal, tab spine, manifest, tmux or Context data | Arch reads all of those, so it is the most plausible route to a mechanism that also writes them |
| 5, no mechanism may set a session's status | A node marked stale is one small step from a node marked amber, and amber has exactly one meaning |
| 6, no third-party native code in the signed bundle | A native layout engine is the plausible temptation, and the entitlement it would force on is app-wide and permanent |
| 7, the renderer CSP is never relaxed | This is the refusal the LLM step will be asked to bend, and bending it once opens the renderer to every host |
| 8, nothing starts a process on a configuration change alone | Freshness is the feature's whole appeal, and automatic freshness is exactly the bypass |
| tmux safety and the manifest as the restore source of truth | Arch is presentation. It must never appear on the create path or the restore path |
| Not a dashboard | Counts on nodes are the first thing anyone adds to a canvas |
| Not a supervisor's console | A canvas that updates while agents work is a console |

**One exclusion is needed to keep refusal 8 clean, and it is one line rather than an argument.** A
write to `.tortie/**` must not itself trigger a rescan. A change there re-reads and revalidates the
names file only, which is a file read. Without that line, an agent writing the names file starts
one ripgrep process and two git processes, which is a process starting on a configuration change in
the literal words of the refusal.

**One property of the design makes refusal 8 mechanical rather than argued.** Tortie adds no spawn
path anywhere. Its only child processes are ripgrep and git, both of which Search and SCM already
spawn on every repository change today.

---

## 9. What the pane should show, derived from the operator's own corpus

This section answers a direct request. Nothing in it is invented. Every node kind, every edge kind,
every provenance category and every box count is read out of the 30 AS-BUILT-ARCHITECTURE.md
documents the operator has already written by hand.

### 9.1 The corpus, measured

Thirty-three files match `AS-BUILT-ARCHITECTURE*.md` under `/Users/gdc`, excluding `node_modules`,
`.git` and `.claude/worktrees`. Four are copies of the same Lore document, so the distinct count is
**30**.

| Measure | Value |
|---|---|
| Distinct documents | 30 |
| Total lines | 52,719 |
| Shortest | 187 lines, `stfu/docs/AS-BUILT-ARCHITECTURE.md` |
| **Median** | **1,174 lines**, `stoa/stoa-web/lib/space-agent/AS-BUILT-ARCHITECTURE.md` |
| **Longest** | **7,050 lines**, `findunmet/docs/architecture/AS-BUILT-ARCHITECTURE.md` |
| Documents using box-drawing characters | **27 of 30** |
| Unlabelled code fences, being the ASCII drawings | 555 |
| Markdown tables | 662 |

**There is no generator.** Nothing in the operator's tooling produces these documents. The
convention is
transmitted by imitation, and the imitation chain is documented in the files themselves, e.g.
deadreckon's document says "Modeled on `/Users/gdc/Downloads/AS-BUILT-ARCHITECTURE.md` (the
Printing Press)". Four related artifacts exist and together they are the nearest thing to a
specification.

| Artifact | What it is |
|---|---|
| `deadreckon/skills/narrator-as-built/SKILL.md` | A machine-checked generator, but for a single deadreckon **run** rather than a project. Its JSON output names the sections: `subject`, `system_overview`, `components`, `topology`, `file_layout`, `external_interactions`, `cross_references` |
| `deadreckon/crates/deadreckon-core/src/docs.rs:22` | `pub const RUN_AS_BUILT: &str = "RUN-AS-BUILT.md";`. The document is a first-class output of a binary, not a habit |
| `.agents/skills/lore/scripts/lib/patterns.mjs:148` | A detector the operator wrote so his own corpus miner recognises the activity: `{ id: 'as-built-doc', label: 'Produce/refresh an AS-BUILT map', ... }`. **He called it a map, not a document** |
| `.agents/skills/goal-rider-author/SKILL.md:44` | A read instruction for the next agent: "Look for a 'what's shipped vs thin' section if one exists; it grounds the goal in reality" |

**If the pane needs a stable input format, it will have to define one, because none exists.**

### 9.2 The shared skeleton, with counts

Counted by heading match at any level, across all 30 distinct documents.

| Section | Docs | Tier | Real titles found in the corpus |
|---|---:|---|---|
| System Overview | **29 / 30** | Always | "System Overview", "1. System Overview & Mental Model", "Product Surfaces" |
| Layout or Inventory | **26 / 30** | Always | "Component Map", "Package Structure", "Repository Layout & Install Topology", "File-System Layout", "Binary Module Layout (post-decompose)" |
| Table of Contents | **24 / 30** | Always | |
| Data Flow or Lifecycle | **23 / 30** | Usually | "Data Flow Diagrams", "End-to-End Run Lifecycle", "Session End Pipeline", "Live message flow" |
| Architecture | 21 / 30 | Usually | "High-Level Architecture", "The Two-Layer Architecture", "Storage Architecture" |
| Security, Tokens or Auth | 20 / 30 | Usually | "Tokens & Auth Contracts", "Permission Model" |
| Data Model or Schema | 19 / 30 | Usually | "Database Schema", "Corpus Schema", "State Machine & Persistence" |
| Configuration | 19 / 30 | Usually | "Configuration & BYOK", "Configuration & Local Run" |
| Deployment or Build | 18 / 30 | Usually | "Distribution & Self-Update", "Release Path", "Packaging" |
| API Surface | 15 / 30 | Sometimes | "API Routes", "CLI Surface", "HTTP / RPC Surface" |
| Gaps or Roadmap | 14 / 30 | Sometimes | **"What's Built vs Scaffolding-Thin"**, "What's Shipped vs Thin", "Forward Bridges (V1 Candidates)" |
| A "Last Updated" stamp | 14 / 30 | Sometimes | `**Last Updated**: 2026-06-10` |
| Design Decisions | 13 / 30 | Sometimes | "Key Design Decisions", "Design Provenance & Decisions", "Organizing Principles" |
| A scope note in a blockquote | 13 / 30 | Sometimes | `> **Scope note**:`, `> **Vocabulary note**:` |
| Core Concepts or Glossary | 12 / 30 | Sometimes | |
| **External Dependencies** | **10 / 30** | Sometimes | "External Service Integrations", "Technology Stack", "External tools used at runtime", "Provider Model" |
| Performance | 6 / 30 | Rare | |
| Observability | 6 / 30 | Rare | |
| Testing | 4 / 30 | Rare | |

**The shape that matters.** Four sections carry the load and appear in 23 to 29 of 30. A pane that
renders only those four is already useful. A pane that demands all nineteen will never have a
complete input.

### 9.3 Node kinds

Derived from what the sections actually enumerate.

| Node kind | Identified by | Repository anchor | Source section | Docs |
|---|---|---|---|---|
| **System** | Product name plus a one-line subject | Repository root | System Overview | 29 / 30 |
| **Layer** | A named horizontal band, e.g. "Runtime Orchestration" | Usually none. It is a grouping | The architecture drawing | 21 / 30 |
| **Component** | A name plus a one-line responsibility | A directory, sometimes one file | Component Map | 26 / 30 |
| **Module** | A filename inside a component | One file path, sometimes a line range | The per-component table | 26 / 30 |
| **Symbol** | A backticked identifier | A function, struct, exported const | Component tables, "Key entrypoints" | 796 mentions corpus-wide |
| **Route** | A method plus a path template, e.g. `POST /api/v1/lore/run` | A handler file | API Routes | 15 / 30 |
| **Command** | A CLI verb, e.g. `stoa scribe sync` | A `cmd/` file | CLI Surface | 6 / 30 |
| **Table** | A database table plus key columns | A migration file | Database Schema | 19 / 30 |
| **StateEnum** | A named set of states, e.g. `sharding -> running -> reducing -> done` | An enum in code | State Machine | 19 / 30 |
| **Store** | A durable location, e.g. `~/.specstory/lore.db`, an R2 bucket | A path or a bucket name | Storage Layout | 26 / 30 |
| **Process** | A separately scheduled runtime, e.g. a daemon, a sandbox, a launchd agent | An entrypoint plus a launch mechanism | Process topology | 14 / 30 |
| **ExternalService** | A vendor name, e.g. Supabase, Stripe, Anthropic, LiveKit, E2B | Not in the repository. Reached by URL | External Service Integrations | 10 / 30 |
| **Dependency** | A package name plus a pinned version | A manifest | Technology Stack | 10 / 30 |
| **Config** | An environment variable or a config key | `.env.example`, `wrangler.jsonc` | Configuration | 19 / 30 |
| **Decision** | A titled paragraph asserting a choice and its reason | **Nothing. It is prose** | Key Design Decisions | 13 / 30 |
| **Gap** | A titled claim about what is missing or thin | Sometimes a `V1-CANDIDATES.md` reference | What's Shipped vs Thin | 14 / 30 |
| **Doc** | A sibling document | A `.md` path | Cross-references | 29 file links |

**The recommended design collapses these seventeen to nine**, because `Layer` becomes `group`,
`Route`, `Command`, `Table` and `StateEnum` are not extractable without framework knowledge, and
`Symbol`, `Config`, `Decision`, `Gap` and `Doc` live in the panel rather than as boxes. Section
9.8 says exactly what that costs.

### 9.4 Edge kinds

| Edge kind | Reads in the document as | From to To | How the drawings show it | Extractable? |
|---|---|---|---|---|
| **contains** | Indentation in a tree block | System to Component to Module | Tree characters | **Yes, from the filesystem** |
| **imports** | "depends on", a dependency matrix | Component to Component or Dependency | A table with checkmarks in 3 documents | **Yes** |
| **deploys to** | "deployed on Vercel", "LaunchAgent" | Component to Platform | A wrapping outer box labelled with the platform | **Yes, from a platform manifest** |
| **spawns** | "spawns", "shells out to", "subprocess" | Process to Process | A nested box, or a downward arrow | **Partly.** 78 uses of "subprocess", 56 of "spawn". Only a literal argv is recoverable |
| **reads from** | "reads", "loads", "queries", "GET" | Component to Store or Table | A leftward arrow | **Partly** |
| **writes to** | "writes", "upserts", "appends", "POST" | Component to Store or Table | A rightward arrow into a cylinder | **Partly** |
| **emits or subscribes** | "emits to outbox", "fan-out" | Component to Queue to Component | A fork of three or more arrows, in 8 documents | **Partly.** Only where the channel is a declared constant |
| **calls** | "calls", "invokes", "dispatches to" | Module to Symbol | A plain arrow. Very common | **No.** Name matching draws wrong arrows |
| **authenticates with** | "Bearer", "minted by", "verified by" | Process to Process, carrying a token | A labelled arrow naming the token | **No.** 20 / 30 documents carry it |
| **transitions to** | An arrow between states | State to State | An inline arrow or a lifecycle block | **No.** 19 / 30 documents carry it |
| **supersedes or deprecates** | "deprecated", "superseded by", "legacy" | Component to Component | Struck through, or a heading suffix | **No.** 8 documents, 45 mentions |
| **documented in** | A markdown link | Any node to Doc | A link | **Yes**, 29 links |

**The load-bearing observation.** Every edge in the corpus is either **structural**, meaning
derivable from the repository, or **behavioural**, meaning it describes runtime. Structural edges
are computable. Behavioural edges are the ones the operator writes by hand today, and they are the
ones his drawings spend their arrows on. Six of twelve are drawable, three partly, three lost.

### 9.5 The provenance taxonomy, with the mechanical test for each

This is the deliverable the operator asked for by name, and it is the single strongest reason to
build phase B.

| # | Category | Exact phrasing found in the corpus | Docs | The mechanical test | Verdict |
|---|---|---|---|---|---|
| 1 | **Written in this repository** | "the code gmux owns", "hand-curated", "first-party", "written once" | 30 / 30 implicitly | Any tracked file not under a dependency directory, not matched by the ignore answer, and carrying no vendored-from header | **Fully computable** |
| 2 | **Vendored copy of someone else's code** | "forked at upstream `6cf59b1`", "vendored", "copied rather than reinvented", "adapted from" | 5 docs use "vendor" with 17 hits, 12 docs use copied or adapted with 20 hits, 2 name a fork SHA | A `vendor/` or `third_party/` directory is mechanical. **A fork with the upstream SHA in a README is not**, unless the repository records it. findunmet records it. Most do not | **Partly** |
| 3 | **Package dependency compiled in** | A `Library \| Version \| Purpose` table, "go.mod highlights", "zero dependencies", "SPM only" | 10 with the section, 15 mention a manifest across 100 hits | Parse `package.json`, `go.mod`, `Cargo.toml`, `Package.swift`, `requirements.txt`. Version and licence come from the lockfile | **Fully computable** |
| 4 | **Native code linked in** | "Rust FFI", "static lib via cgo", "`libautomerge_ffi.a` (~22MB static library)", "crate-type = [\"staticlib\"]" | 21 docs, 122 hits | Presence of a `.a`, `.so`, `.dylib` or `.node`, a `build.rs`, a cgo import, or an `#include` of a generated header | **Fully computable** |
| 5 | **Separate command line tool spawned at runtime** | A `Tool \| Caller \| Purpose` table, "shells `claude --dangerously-skip-permissions -p`", "`sandbox-exec`", "`bwrap`", "`launchctl`" | 4 use "shells out" with 6 hits, 9 use "subprocess" with 78, 16 use "spawn" with 56, 1 has a dedicated table | A grep for `exec`, `spawn`, `Command::new`, `exec.Command` finds the call sites. **Turning a call site into "this is `claude`" needs the literal argv, which is often a variable** | **Partly** |
| 6 | **External network API** | "External Service Integrations", "`fetch` against `https://api.anthropic.com/v1/messages`. No SDK" | 8 use the phrase with 15 hits, 10 have the section | Two signals are mechanical: an SDK package in the manifest, and a URL literal in the source. **Neither tells you the purpose.** `generativelanguage.googleapis.com` is findable. "best-effort cover art for the gallery, degrades to SVG" is not | **Partly** |
| 7 | **Database or durable store** | "Supabase Postgres", "SQLite via `node:sqlite`", "the journal is the system of record", "Cloudflare R2" | 19 have a schema section, 26 have a storage section | A `supabase/migrations/` directory, a `.sql` file, a SQLite open, an R2 binding. **Existence yes. Semantics no.** "Postgres is the canonical copy, Storage is the bulk-byte source" is prose | **Existence only** |
| 8 | **Generated artifact** | "generated by XcodeGen", "two codegen scripts before `next build`", "`.next/`, `dist/`, `target/`" | 10 docs, 17 hits | Build-output directories, ignore entries, and a generated-file header. **The narrator skill already ships the mechanical rule as an exclusion list** | **Fully computable** |
| 9 | **Platform service** | "deployed on Vercel in region `cle1`", "macOS `launchd` service", "E2B sandbox", "Vercel cron, every minute", "`pg_cron`" | 18 have a deployment section | Manifest files are mechanical: `vercel.json`, `wrangler.jsonc`, a LaunchAgent plist, `livekit.toml`, a Dockerfile, a workflow file. **The runtime posture is not** | **Partly** |

**The ratio, stated as a number.** Four of nine are fully computable. Four are partly computable
with a mechanical detection step and a model-written explanation. One is computable only for its
existence. **Zero of nine give you purpose.** A pane that computes everything it can and asks a
model only for the prose is doing roughly 60 percent of the work locally.

**Where no mechanical test exists at all**, stated plainly so nobody builds it and finds out later.

| # | What cannot be computed | The evidence |
|---|---|---|
| 1 | **Purpose.** Every category can be detected and none can be explained | The corpus never lists a dependency without saying why. `harmonica v0.2.0` is mechanically a Go module. "Spring-based animations" is the operator's sentence |
| 2 | **The fork point and the reason for forking** | findunmet says the Go runner "forked at upstream `6cf59b1`" and points at `runner/README.md` for why. Nothing in the repository states that as data |
| 3 | **The honest gap list** | Categories 1 to 9 describe what exists. "What's Built vs Scaffolding-Thin" describes what does not work yet and has **zero mechanical signal**. deadreckon spends 140 lines on it, findunmet 125, and `goal-rider-author/SKILL.md` tells the next agent to read it first |

### 9.6 The visual encoding for provenance, with the rejected encodings

**Recommendation, in three layers, spending zero colour tokens:**

- One containment boundary.
- One codicon glyph badge.
- One filterable legend.

The hue budget is measured rather than assumed. `src/renderer/styles/tokens.css` §1.4b states:
"Six, not more: min pairwise ΔE2000 falls off a cliff at seven (19.5 to 12.2, two blues colliding)"
and "No yellow. `--git-modified` is ΔE2000 4.5 from `--status-attention` and xterm brYellow is
6.0". The six lanes `--graph-lane-1` to `--graph-lane-6` are already spent on the SCM commit graph.
Nine provenance categories against a measured ceiling of six, with amber and yellow unavailable and
the six already spoken for, settles the question without an argument.

| Encoding | Categories it can carry | Survives at level 0, boxes about 100 by 40 px | Survives a future light theme | Verdict and deciding reason |
|---|---|---|---|---|
| **Containment, an outer boundary** | 2 per boundary, and nesting adds more | **Yes.** A boundary is the largest shape on screen | Yes, it is a stroke and a label | **Recommended, layer one.** It carries the one bit that matters, being ours or not ours. It is also the grammar the operator already draws by hand, since findunmet nests `entrypoint.sh` inside the sandbox box and puts Anthropic in a separate box outside |
| **Glyph badge, one codicon in a fixed corner** | 9 or more, because a glyph is read rather than discriminated | **No.** It needs level 1 or a hover | Yes, a monochrome glyph inherits the text token | **Recommended, layer two.** From level 1 down |
| **A filterable legend, nine toggleable rows** | 9 | n/a, it is chrome | Yes | **Recommended, layer three.** "Show me only what we did not write" is one click, and it does not depend on anyone reading a colour correctly. Also how GitHub's dependency graph does it: "Use `relationship:` to filter ... Possible values are `direct`, `transitive`, and `inconclusive`" with **no colour at all** |
| Node shape, e.g. a cylinder for a store | Several | Yes | Yes | **Partially adopted.** dependency-cruiser already does this with `shape: "folder"` and `shape: "box3d"`, and the corpus already draws a store as a cylinder. **Shape carries the node kind, not the provenance.** Two facts, two channels |
| Fill hue, one per category | 6 measured maximum | Yes | **No.** Every hue needs re-measuring when a light theme lands | **Rejected.** 9 categories against a ceiling of 6, and it fails WCAG 2.2 Success Criterion 1.4.1 at Level A on its own, which reads "Color is not used as the only visual means of conveying information" |
| Fill hue for 3 groups, badge for the other 6 | 9 | Yes | Partly | **Rejected, and it is second place.** It works, and it spends 3 of the app's 6 hues on a fact the badge already carries, and it gives the SCM lane ramp a second meaning |
| Border style, solid against dashed | 2, perhaps 3 | **Poorly.** A dash needs several dashes to read as a dash, which fails below about 24 px node height | Yes | **Rejected as primary, adopted as reinforcement** on the outside nodes, where it costs nothing |
| Opacity or a faded fill | 2, and it fails contrast at the faded end | Yes | **No.** The same alpha reads as a different lightness on a light background | **Rejected.** `--graph-dim: 0.45` is already reserved for cue-based focus, so reusing opacity would put two meanings on one channel |
| Swimlanes, one per category | 3 to 5 before the drawing gets too tall | Yes | Yes | **Rejected.** 9 lanes destroys the dataflow layout, and vertical position is already spoken for by layer |
| Texture or hatch fill | 3 at best | **No**, a hatch aliases at small size | Yes | **Rejected.** No precedent in any tool checked |
| A coloured outer ring | Same as fill | Marginally | No | **Rejected.** The same hue budget problem on a thinner target that needs more contrast |
| Text label on the node | Unlimited | **No**, there is no room on a 100 by 40 px box | Yes | **Rejected on the box, free in the panel** |

**What existing tools do, for calibration.**

| Tool | Encoding | Categories | The number |
|---|---|---|---|
| dependency-cruiser | Two channels for one fact. `node_modules` gets `fillcolor: "#c40b0a1a"`, a red wash at 10 percent alpha, plus a matching `fontcolor` | 3 | **Its default theme carries 14 distinct fill colours and 3 shapes**, because file extension identity is also on the fill channel. This is the worked example of hue overload |
| GitHub dependency graph | A text relationship label used as a filter | 3 | **No colour at all** |
| C4 model | Nothing prescribed. External systems are defined by scope | 0 by the standard | "The C4 model is notation independent, and doesn't prescribe any particular notation" |
| ArchiMate | Colour by layer, as convention only | 3 | "Formally, color has no meaning in ArchiMate" |
| Microsoft Threat Modeling Tool | Containment by a boundary line | 2 per boundary, nesting | "The Threat Modeling Tool allows users to specify trust boundaries ... to show where different entities are in control". The worked example is the provenance case exactly |

**The one thing worth reinforcing with colour, if anything, is freshness**, because freshness is
state rather than identity and `DESIGN.md` permits colour for state. It is also the one place where
the obvious colour is forbidden, because amber means "needs you" and nothing else. So a freshness
indicator is a number and a word, e.g. "377 commits behind", and never a coloured dot.

### 9.7 The screen by screen picture, with the box count at each level

Three drawn levels plus one path view. Not four, because C4's own site says the system context and
container diagrams are sufficient for most teams, and CodeBoarding's `--depth-level` default of 3
is described in its README as a safety valve rarely needed.

#### Level 0, the one screen

**Between 5 and 9 boxes. Hard cap 10.** The corpus proves the number. Rookery draws 5 top-level
boxes. findunmet draws 5. The lore worker draws 5. altarum draws 4. deadreckon draws 5. stoa-cli
draws 5 bands. Not one document in the corpus opens with more than 9, across a 187-line document
and a 7,050-line document alike.
The operator converged on this number by hand thirty times.

| What is on screen | Detail |
|---|---|
| One box per **group** | Arranged the way the drawings arrange them, with inputs at the top and stores at the bottom |
| Every box filled by **provenance** | Written here is inside the boundary. A package, a service or a platform is outside it, the way findunmet and the lore worker already draw it |
| Every box carries a **freshness sentence** in the panel when selected | Computed from git, not from a `Last Updated` string. Never a dot on the box |
| Arrows carry a one or two word label | The route, the protocol or the verb, extracted verbatim, never written |
| One line of text at the top | The `subject`, e.g. "Electron plus tmux shell for agentic coding" |

He should be able to stand back and read it. No scrolling and no panning. Over the cap, merge the
lowest-weight siblings into one bundle node carrying a count, following Sourcetrail, whose docs
say "A bundle node combines multiple nodes ... The name describes what kind of nodes are bundled.
The number tells how many".

#### Level 1, a group opened

**Between 12 and 22 boxes, 8 to 30 edges, at most 6 subgroups.** That is GitDiagram's shipped
budget verbatim. The corpus sets the same range from the other direction. The lore worker's
coordinator has 5 components and its box runtime has 12. stoa-cli has 38 packages. stoa-web's
community module has 30 files. Above 22 the pane clusters by directory and shows a count.

| What changes from level 0 | Detail |
|---|---|
| Box **area encodes size** | In indexed symbols. **stoa-cli is the only document of the 30 that gives this today**, and it is the only one where a reader can see at a glance that `pkg/service` at 25,800 lines dwarfs `pkg/blob` at 220 |
| Fill still encodes nothing, and the badge still encodes provenance | A vendored fork looks different from something written here |
| The panel shows the component's paragraph | Taken verbatim from the overlay, or from the `docPath` section of the existing AS-BUILT file |
| Deprecated components are struck through, not hidden | The corpus needs this and says so in prose today, e.g. a whole section titled "Incremental Decision Extraction (Deprecated)" |

#### Level 2, a component opened

**Do not draw a graph. Fall through to the Explorer tree filtered to this component, plus a
dependents list in the panel.**

This is a change from Design 1 and it is deliberate. Ghoniem, Fekete and Castagliola measured
node-link losing to a matrix above twenty vertices, and SARIF's own recommendation tops out at 30
clusters. Tortie already has a tree that scales past that, and building a matrix instead is new
work against the assemble rule. The dependents list answers the question a graph would have
answered, and it costs nothing.

#### Level 3, a path

**Up to 4 hops.** This is the level with no equivalent in the file tree and it is the closest thing
to an answer for "where is that data coming from". Select two nodes and draw the extracted paths
between them. Above 4 hops, say `no path within 4 hops` rather than drawing a tangle.

Ghoniem et al. also measured the constraint that makes this necessary. Visual path finding "is
difficult to carry out visually when the distance between the extremities is greater than two or
three arcs". A person cannot trace a five-hop dataflow by eye on either representation, so the path
must be highlighted for them, which is what Sourcetrail's "To Target Symbol" mode does.

#### The persistent surfaces at every level

| Surface | Why, from the corpus |
|---|---|
| **The prose panel, always present** | Non-negotiable. The corpus's value is roughly 40 percent structure and 60 percent reasons, and the reasons only exist as text. A canvas that shows the keyset pagination edge and drops the paragraph explaining the microsecond-to-millisecond truncation has made the reader worse informed |
| **The provenance legend, nine toggleable rows** | Answers the operator's question directly, in one click |
| **The gap list** | Fourteen of thirty documents have it and `goal-rider-author/SKILL.md` tells the next agent to read it first. It should never be more than one click away |
| **The coverage line** | One sentence, with counts, naming what could not be read and which languages have no grammar |

### 9.8 How code references already resolve, and the two forms that do not

Counted across the 30 distinct documents. This is why a pane can jump from a box to a file with no
new authoring format.

| Form | Example | Count | Share | Can a pane jump on it? |
|---|---|---|---|---|
| **Backticked path** | `` `pkg/service/watcher.go` `` | **2,901** | **about 73 percent** | **Yes.** Resolve against the repository root. Exact |
| **Backticked symbol with parentheses** | `` `finalizeSource()` `` | 796 | about 20 percent | **Yes, via the existing symbols store.** A name lookup lands on the definition |
| Anchor link inside the document | `[System Overview](#system-overview)` | 449 | navigation, not code | Yes, but it navigates the document |
| **Path with a line number** | `` `state.rs:435-445` `` | **176** | about 4 percent | **Yes, and it is the most precise.** Concentrated in five documents. **Twenty-five documents use it zero times** |
| Markdown link to a file | `[HOW-IT-WORKS.md](HOW-IT-WORKS.md)` | 29 | under 1 percent | Yes. Almost always a sibling document |
| Bare package or crate name | `automerge 0.8`, `@livekit/agents@1.2.8` | inside the 100 manifest mentions | small | **Only to the manifest entry.** It cannot resolve to a file in this repository, which is the point of it |
| Prose reference with no backticks | "the event-tailer emits enrichment events" | uncounted, very common | | **No.** Too loose to distinguish from an English word |

**Resolving only backticked paths and backticked symbol names covers about 93 percent of the
corpus's code links with no ambiguity.** The format lat.md uses, `[[src/auth.ts#validateToken]]`,
is therefore 93 percent already written in the operator's own habit.

### 9.9 What the corpus does badly and a map would fix

| # | The failure | The evidence |
|---|---|---|
| 1 | **They go stale and nothing detects it** | Thirteen documents more than 250 commits behind, one at 583. Fourteen carry a self-reported stamp and sixteen do not |
| 2 | **They cannot express "in parallel"** | The stoa-web supabase document writes `(parallel with sequential pipe)` as a comment **inside** an ASCII drawing, because the drawing cannot show concurrency |
| 3 | **They give no size or weight signal** | stoa-cli lists 38 packages with line counts and is **the only document of the 30 that does**. Everywhere else a 180-line file and a 319-line file are equal boxes |
| 4 | **Deprecation is prose, not structure** | A section titled "Incremental Decision Extraction (Deprecated)" with a note "trigger still fires but no edge function invoked". The stoa-cli TUI document corrects itself in prose: "Earlier drafts of this doc enumerated `ViewChatList` and `ViewChatThread`. Those constants do not exist in `model.go`" |
| 5 | **There is no canonical document per project** | findunmet has two and the newer says "It supersedes the chronological `/AS-BUILT-ARCHITECTURE.md` at the repo root". `intent-web/lib/arena-agent` has both a document and a V2 and nothing says which is live. **Thirteen documents open with a hand-written scope note whose job is to disambiguate this** |

### 9.10 What the corpus does well and a map would lose

| # | The strength | An example, verbatim |
|---|---|---|
| 1 | **The reasons** | "Postgres stores `updated_at` at microsecond precision, but the cursor round-trips through the JS Date / driver boundary, which is millisecond-precision. So both the ordering AND the keyset comparison truncate ... Keep both sides ms." No box and no arrow carries that |
| 2 | **The rejected alternative** | "Chose materialized paths over adjacency lists because a single `ORDER BY path` query delivers the whole tree in traversal order; no recursive CTE per topic render." Thirteen documents carry a decisions section and its whole content is roads not taken |
| 3 | **The negative space** | "There is no Helicone-style AI gateway and no Sentry. There is no Resend ... There is no Upstash / Redis. There is no PostHog." A visual map has no vocabulary for what deliberately does not exist |
| 4 | **The failure mode and its fix** | The lore worker explains that returning `markdown_content` through the Worker "buffers 150+ MB and trips a Cloudflare Worker's 128 MB memory ceiling (error 1102 to 503)". These are the sentences that stop the next agent redoing the bug |

**The synthesis of 9.9 and 9.10.** The documents are weak exactly where a computed view is strong,
meaning structure, scale, freshness and concurrency. They are strong exactly where a computed view
is weak, meaning reasons, alternatives, absences and failure modes. **So the pane must be a
computed structure with an attached prose panel, and the prose is the part the operator already
writes.**

### 9.11 On the shadow repository, judged against the corpus

The operator suggested a separate shadow repository. The corpus argues against it and for a tracked
file, for three reasons.

1. The staleness measurement only works because the document and the code share one git history.
   Split them and "377 commits behind" cannot be computed, which is the pane's most valuable single
   number.
2. Twenty-nine of the corpus's file links are relative paths to sibling documents in the same tree.
   A shadow repository breaks all of them.
3. `rookery/AGENTS.md` already carries the update instruction and it works because the document is
   in the diff the reviewer sees: "If you notice the structure is being modified from what this
   document describes, make sure to eventually update this document too."

What **is** worth a separate store is the derived layout and the view state, being node positions,
collapse state and pinned views. Those are per user, change constantly, and belong in
`gmux.arch.*` localStorage or in the disposable database, never in the user's repository.

---

## 10. The first slice, written as a phase

**Phase A. Map freshness.** No pane, no drawing, no schema, no canvas, no new dependency, no
tokens.

### 10.1 What it does

For every markdown document in the project matching a small set of names, being
`AS-BUILT-ARCHITECTURE.md`, `ARCHITECTURE.md` and any `docs/architecture/*.md`, compute how far the
code has moved since the document last changed, and say so in one sentence.

Two numbers per document, both from git and both cheap.

| Number | Command | Measured cost |
|---|---|---|
| Commits to the repository since the document last changed | `git log --format=%H -1 -- <doc>` then `git rev-list --count <sha>..HEAD` | Under 30 ms per document on a 218-commit repository |
| Commits touching the directories the document names, since then | `git log --name-only <sha>..HEAD` once, intersected with the document's backticked paths folded to directories | 132.9 ms over 217 commits, once for the whole set |

Plus one resolution number, which is the honest half.

| Number | How | Why it matters |
|---|---|---|
| The share of backticked paths in the document that still resolve at HEAD | One `git ls-tree -r HEAD --name-only` set, built in 19.5 ms, then a set lookup per path | The band measured 64.6 percent on a document 5 commits behind and 90.5 percent on one 463 commits behind. **The raw number is misleading**, so it is reported only alongside the six-way classification in section 7.3 |

### 10.2 Where it appears

One line in the Explorer, on the row for a matching document, and one line at the top of the
markdown preview when such a document is open. Both follow the `scm/freshness.ts` rule exactly, in
all three of its parts:

- The line appears only in the state where silence would be a lie.
- It is never coloured.
- The voice is quiet and factual.

Example copy, and this is the whole user-visible surface of phase A:

```
docs/AS-BUILT-ARCHITECTURE.md is 377 commits behind. 24 of those touched
the parts it describes. 12 of its 148 paths no longer resolve.
```

**When the git read happens, and why it is not the thing band 11 refuses.** Band 11 refuses
rebuilding the graph on project open, because the graph scan runs ripgrep and tree-sitter over the
whole tree. Phase A runs no scan. It runs `git log` on one document. Even so, running it for every
matching document at project open would be work nobody asked for, so phase A computes lazily:

- On the markdown preview line, the read runs when the document is opened.
- On the Explorer row, the read runs when the row becomes visible, and the result is cached against
  the repository HEAD so it is computed once per document per commit.
- Nothing is computed at app launch, and nothing is computed for a document nobody has looked at.

At under 30 ms per document that is one read at the moment a person is already looking at the file.

### 10.3 What it deliberately leaves out

| Left out | Why |
|---|---|
| Any drawing | Phase C2, behind the gate |
| Any node, edge or graph | Phase B |
| Any provenance | Phase B |
| The `.tortie/arch.names.json` overlay, its schema and its validator | Not needed. Phase A reads documents that already exist |
| Any new npm dependency | None is needed |
| Any model call | None is needed |
| A count of documents that are stale, anywhere in the chrome | That would be a counter, and section 8 refuses it |

### 10.4 Verification

**Tier 1 for the copy and the placement. Tier 2 for the git arithmetic.**

The tier is per item rather than promoted whole, per the CLAUDE.md rule.

| Item | Tier | How it is verified |
|---|---|---|
| The Explorer row line and the preview line | 1 | `npm run typecheck && npm run build && npm run test && npm run smoke:t1`, plus one screenshot read through `GMUX_SHOT` with `GMUX_SHOT_DRIVE` opening a project that has such a document |
| The commit arithmetic | 2 | A new unit test over a fixture repository built at test time with `GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`, `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` pinned, so the commit oids are reproducible. Assert the count after a known number of commits, after a rename, and after the document itself is edited |
| The path resolution rate and its six-way classification | 2 | The same fixture, with one path of each of the six causes in section 7.3 present, asserting that only the sixth is counted as broken |
| The measured cost | 2 | One targeted probe reporting wall clock on this repository and on a repository with more than 5,000 commits. **The number must be measured, not projected**, before it is quoted |

**Nothing in phase A is Tier 3**, because nothing writes `manifest.db`, nothing touches tmux,
nothing appears on the restore path, and nothing spawns a process the app does not already spawn.

### 10.5 Why this is the first slice and not the extractor

Three reasons, in order.

1. **It is the only item in the whole corpus with a clear action attached to a number that
   generates itself.** Thirteen of the operator's 30 documents are more than 250 commits behind and
   nothing told anyone.
2. **It is 100 to 300 lines.** The median recent phase in this repository is about 2,300
   insertions, so phase A is roughly one tenth of a normal phase.
3. **It tests the premise cheaply.** If the operator looks at the freshness line for a month and
   never acts on it, that is strong evidence against every phase after it, and it cost 300 lines to
   learn.

---

## 11. The phases after it

| Phase | What ships | Owned code | Tier | What it unlocks | What it forecloses |
|---|---|---|---|---|---|
| **A. Map freshness** | Section 10 | 100 to 300 lines | 1 and 2 | The staleness signal, on documents that already exist | Nothing |
| **B. Structure and provenance, as a list** | Five new tree-sitter import queries beside the five existing definition queries. The alias resolver reading all four project tsconfigs. Nine provenance classifiers with an evidence receipt each. An edge table in `symbols.db`. A sidebar list, not a drawing. The `arch:*` IPC domain minus the naming channel | 1,500 to 2,500 lines | 2, plus `npm run conformance:arch` | Answers "which parts did we not write" with a receipt. Answers part of "where is that data coming from" through the literal scan. **Produces the edge count the gate needs** | Nothing. Every later phase reads it |
| **Gate. Measure the edge count** | Run phase B's extractor over the operator's own repositories and count distinct cross-group edges after alias resolution. **It is free, because phase B computes them anyway.** Pass value: the median repository produces at least 8 edges at the level 0 partition, 8 being the low end of GitDiagram's shipped 8 to 30 edge budget in section 9.7 | 0 | n/a | The decision on phase C2, with a number instead of an argument. **Measured today with a stand-in script the median is 7, so the gate does not pass as things stand** | Nothing |
| **C1. Serve the structure to the agent over MCP stdio** | Module inventory, sizes, provenance, git history per part. Hand-written newline-delimited JSON-RPC framing, no SDK. Passed on the argv of a session the user creates | about 400 lines | **3**, because the argv lands in the manifest and touches restore | Cuts a map build from 122 turns to about 55, and pays off on every ordinary agent turn. This is the reader with no retention problem | Nothing |
| **C2. The canvas** | Hand-written SVG in a new `EditorMode` arm, `@dagrejs/dagre` for positions, three levels per section 9.7, treegrid keyboard plus `]`, `[` and `-`, the layout cache keyed by graph hash | 4,000 to 7,000 lines | 2 | The picture the operator asked for | Nothing, but it is the phase to stop at if the gate says stop |
| **D. The names overlay** | `.tortie/arch.names.json`, its hand-written schema, its `ajv` build gate, the narrow validator, rename following, the `arch:namingPrompt` composer, and the send-to-session verb | 800 to 1,200 lines | 2 | Good names instead of directory paths. Per-node name age. The `docPath` bridge into the 30 existing documents | Nothing |
| **E. The checkable contract** | Coverage as a weighted percentage. Divergences at weight 2 or more. The unmapped-file check with catch-all globs banned. `unmatched_ignore_imports_alerting` semantics on the exemption list | 400 to 700 lines | 2 | **The only mechanism in the whole survey that gives the pane a reason to be reopened**, because it changes state on its own without being a counter | Nothing |

**Two ordering notes.**

C1 before C2 is deliberate and it is the change all three judges pushed for. The agent reader has no
retention problem, the work is smaller, and it pays off whether or not the canvas is ever built.

Phase E is where the month-three problem actually gets solved, and it is last only because it needs
phase B's edges and phase D's map. If the operator wants to reorder anything, moving E before C2 is
the reorder to consider.

### 11.1 What the whole programme costs, and when the operator sees something

**Everything, if every phase is built, is an estimated 7,200 to 12,100 lines of owned code.** The
canvas is 4,000 to 7,000 of that, which is 56 to 58 percent of the total for the one phase behind a
gate that does not currently pass. Without the canvas the programme is an estimated 3,200 to 5,100
lines.

| Phase | Owned code, estimated | Running total without C2 | Running total with C2 |
|---|---|---|---|
| A | 100 to 300 | 100 to 300 | 100 to 300 |
| B | 1,500 to 2,500 | 1,600 to 2,800 | 1,600 to 2,800 |
| C1 | about 400 | 2,000 to 3,200 | 2,000 to 3,200 |
| C2 | 4,000 to 7,000 | n/a | 6,000 to 10,200 |
| D | 800 to 1,200 | 2,800 to 4,400 | 6,800 to 11,400 |
| E | 400 to 700 | 3,200 to 5,100 | 7,200 to 12,100 |

For scale, the median recent feature phase in this repository is about 2,300 insertions and the
largest is 4,982. So A plus B is 0.7 to 1.2 of a normal phase in total size. A through E without the
canvas is 1.4 to 2.2 normal phases. Adding the canvas takes that to 3.1 to 5.3, so the canvas
roughly doubles the whole programme.

**Against the phase queue.** The active queue in `docs/BACKLOG.md` was rewritten on 2026-08-12 and
every row in it is now marked shipped, so there is no pending phase this work would displace.
Nothing here schedules anything. If the operator wants this work, each of A, B, C1, C2, D and E is
its own phase, which is **six phases in total, or five if the canvas is never built**. Phase A is
the smallest phase in the queue's history at roughly one tenth of a normal one. Phase B is about the
size of a normal one.

### 11.2 What is on screen at the end of phase B

Phase A gets this treatment in section 10.2 and phase B is the phase actually being recommended, so
it gets it here too.

**One sentence a person can picture.** A new icon in the sidebar rail opens a list of the project's
parts, each one a directory with a name, a size, a provenance word and a receipt you can click to
open the file and line that proves it.

**What it is not.** There is no drawing, no box, no arrow and no canvas. The list is a list, and it
looks like the Explorer and the Context view rather than like a diagram.

Sample copy for this repository, and this is the whole user-visible surface of phase B. The file
counts and the edge weights are measured. The symbol counts, the line numbers and the unfollowed-call
count are placeholders, because phase B has not been built and nothing has counted them.

```
ARCH                                          gmux
Read from the working tree at 3f9a11c plus 29 uncommitted changes.
621 files in 6 languages. NN files use a call form this reader does
not follow, so some connections are missing.

  main                        278 files   N,NNN symbols   written here
  renderer                    296 files   N,NNN symbols   written here
  shared                       36 files     NNN symbols   written here
  preload                      11 files      NN symbols   written here

  better-sqlite3              dependency   package.json:NN
  @vscode/ripgrep             dependency   package.json:NN
  tree-sitter grammars        vendored     resources/grammars/README:N
  claude, codex, gemini       tool         src/main/agents/registry.ts:NN
  tmux                        tool         resources/gmux-tmux.conf:N

  connections                 3 found
    renderer -> shared        218 imports
    main -> shared            180 imports
    preload -> shared          20 imports
```

Selecting a row opens the panel on the right with the same four things every time:

- The provenance receipt, as a quoted line from a named file.
- The freshness sentence from phase A, if the part has a document.
- The list of parts this one connects to.
- The paths that make the part up.

Nothing in the list is coloured. The only number that changes on its own is the commit count, and it appears
in the panel rather than on the row, per section 7.4.

---

## 12. What is not true

Everything below is an admission. Each item is either unverified, estimated, or a part of the
operator's north star that no design in this workflow delivers.

### 12.1 The workflow itself

- **Three of the four designs were never delivered.** Not to any of the three judges and not to
  synthesis. They are not on disk in the session scratchpad. So the recommendation is the best of
  one, improved by three adversaries and three judges, and it is not the winner of a competition.
  If one of the three solved the empty-graph problem in section 3.3, this document would change.
- **The WebSearch budget of 200 calls was exhausted before the deep verification pass began.** Every
  band verified by fetching URLs it already knew, by registry and repository APIs, and by
  downloading tarballs. That is stronger evidence per claim and weaker coverage overall. **A
  candidate that only surfaces through a search engine is missing from every table.**
- **No agent was run and no tokens were spent** verifying any agent CLI's actual JSON output. Every
  schema claim comes from `--help` on an installed binary or from documentation.
- **Nine of the twelve commissioned adversarial attacks never ran**, because their target designs
  were never produced. The attack table in section 3.1 marks each one.
- **Two of the three attacks that did run cannot be attributed.** Only adversary 2 is named in the
  material that reached synthesis, and the attack files are not on disk. So section 4.2's six
  mandatory fixes are stated without saying which adversary found which, and no adversary finding
  is recorded as rejected.
- **Judge 1's alternative recommendation is unreviewable.** The judgment that reached synthesis says
  judge 1 would "build three narrower things instead" and does not name the three. The report is not
  on disk, so this document records the gap rather than reconstructing it.
- **The exact wording of Zen edit 4 is lost.** Edit 2 is quoted in full in section 8.5. Edit 4 is
  described and not quoted, because the design document is not on disk and the clause was not
  carried verbatim into synthesis. Section 8.5 says what follows from that.

### 12.2 Numbers that are estimated rather than measured

| Claim | Status |
|---|---|
| Arch cold scan of about 1.2 s on this repository | **Built from measured parts, not itself measured.** Nothing was run |
| Arch cold scan of 2.5 s to 4 s at 5,000 files, and 12 s to 18 s at 25,000 | **Projection only.** Must be measured before it is quoted to anyone |
| Arch incremental refresh of about 200 ms | Projection from measured components |
| Owned code of 7,500 to 11,500 insertions across 40 to 55 files for a canvas slice | **Judge 3's estimate**, anchored on measured phase sizes and the measured 15,122 source lines of the Context pane. It is an estimate |
| A cold monorepo open of 13 s to 21 s at 40,000 files | Arithmetic over measured parts by adversary 2. Never measured |
| The naming pass at about 7,600 input and 2,500 output tokens | **A model, not an observation.** Turn count and read depth are constructed from the corpus's 97 backticked paths per document |
| The agent-authored route at $9.10 on Sonnet 5 | Modelled. Prices verified 2026-08-15. **Characters per token at 3.0 is an estimate, and the plausible range of 2.7 to 3.5 moves the total by roughly 20 percent** |
| The 92 percent to 8 percent prompt cache split | An assumption. The totals are sensitive to it |
| Wall clock of 14 to 30 minutes for an agent-authored map | **Rests on an assumed 7 to 15 seconds per turn. This is the weakest number in the document** |
| Per-turn latency for any model | Never measured |
| The naming pass at $0.05 to $0.15 through a CLI | **Modelled, not measured.** No agent was run. A CLI bills differently from list prices and the spread reflects that, not an observation |
| Owned code of 100 to 300 lines for A, 1,500 to 2,500 for B, about 400 for C1, 800 to 1,200 for D and 400 to 700 for E, and the totals in section 11.1 built from them | **All five are estimates and none is a measurement.** They are anchored on three measured things, being this repository's phase sizes at a median of about 2,300 insertions and a maximum of 4,982, the 15,122 source lines of the Context pane as the nearest analogue subsystem, and the file counts in the module lists in sections 4.5 and 4.6. **These are the numbers the operator will budget against, so they are the ones most worth re-deriving before anything is scheduled** |
| The cross-group edge counts for six repositories in section 3.3 | **Measured, but not by phase B's extractor.** A 100-line stand-in script read `from` and `require` specifiers with a regular expression, resolved relative paths and `tsconfig.json` `paths` aliases, and grouped by the top-level directory. It does not parse with tree-sitter, it does not follow `export ... from` re-exports, and it does not resolve a directory import to its `index.ts`. So the counts are a floor rather than an exact figure, and phase B's real extractor should be expected to find the same edges plus a few more. **The gate must be re-run with the real extractor before it decides anything** |
| The median of 7 that the gate is measured against | Follows from the six counts above and from the choice of those six repositories. A different six would give a different median. The six were chosen because section 2.3 already measured their documents, not because they are representative of anything |

### 12.3 Licences and maintenance I could not confirm

| Item | What is unverified |
|---|---|
| `agy` and `muse` | **No licence could be established.** No public repository found |
| `qwen` free tier | The `-o json` flag is verified locally and the repository is Apache-2.0. **No page states a request allowance** |
| `scip-python` | Apache-2.0 read from the repository footer, not the LICENSE file. Its siblings are all Apache-2.0 and I assumed the same |
| `codanna` | "Apache-2.0 with attribution required" is the README's own phrasing. **The NOTICE file was not fetched, so the requirement is unknown** |
| Lattix | `lattix.com` returned HTTP 403 twice. **Liveness unconfirmed.** Rejected on being closed and non-embeddable, which is true either way |
| Sourcegraph Cody | The repository 404s and the public snapshot has been archived since 2024-09-02, and `sourcegraph.com/docs/cody` is still live with no deprecation notice. **I am not asserting Cody is discontinued** |
| Structurizr end-of-life dates | The docs page confirms EOL and **states no dates**. Any date quoted elsewhere should be marked unverified |
| `@bufbuild/protobuf` unpacked size | Confirmed to have zero runtime dependencies and no native packages. Size not measured |
| EPL-2.0's actual effect on a signed closed binary | **This is a reading of section 3.1(a), not legal advice.** It is the reason three technically strong options are rejected, so it should be confirmed before elkjs or Graphviz is reconsidered |
| Bundle sizes after tree shaking | Every size quoted is an unpacked tarball or a standalone esbuild bundle. **The real delta inside Tortie's bundle was not measured** |
| `tldraw`'s exact watermark clause | The proprietary status, the production-use ban, the licence key and the usage-data transmission are all verified verbatim. A standalone watermark clause was not extracted, and the verdict does not depend on it |
| `d3-hierarchy` maintenance | Last published 2022-04-02. Called finished rather than abandoned, which is a judgement |
| `aider` | Not archived and no shutdown notice exists. **The dormancy verdict is a judgement** from one release in twelve months and no push in 85 days |

### 12.4 Research I could not reach

| Source | Why it matters | What happened |
|---|---|---|
| Tzerpos and Holt 2000 on ACDC | The claimed cluster size bound of 20 | `cs.yorku.ca` and `eecs.yorku.ca` returned no route or 404. **The number 20 is unverified** |
| Garcia et al. ASE 2013 and Lutellier et al. TSE 2017 | The original architecture recovery benchmarks | Read as abstracts only. The per-technique numbers here are SARIF's reproduction |
| Yoghourdjian's graph visualisation survey | The best source for what graph sizes have been tested on people | ScienceDirect blocked the session |
| Healey 1996 on effective colours | A hard number for categorical colours | The abstract states no number. **The six-hue ceiling comes from Tortie's own measurement, not from the literature** |
| Munzner's channel effectiveness ranking | Would order the encoding table in 9.6 | Not retrieved. **No ranking is asserted anywhere above** |
| The Fraunhofer up-to-dateness percentages | Would put a number on "how often is documentation stale" | The figures are bar charts and the extraction gave axis labels without values. Only the ranked problem list survived |
| CodeCity's exact metric-to-geometry mapping | The original code city encoding | Both paper PDFs 404 and the FAQ does not state it |
| draw.io, Figma and Miro keyboard behaviour | Would fill three rows of the keyboard table | Every documentation URL returned 404 or 403. **The Miro row carries only its own marketing claim** |
| Any day-30 or month-3 retention figure for any tool in the survey | The single most decision-relevant number | **Nobody publishes one.** The retention argument rests on practitioner testimony and on Atlas's 10 installs |
| ReCite and Context rot full texts | Two papers from the last eleven weeks | **Abstracts only.** Every number quoted from them appears in the abstract verbatim |
| `aria-flowto` support in VoiceOver | Decides whether screen reader edge traversal works | a11ysupport.io returned a page with no support data. **Assume it does nothing until tested** |

### 12.5 Parts of the operator's north star this does not deliver

Stated plainly, because he should read this list before he reads the recommendation again.

| What he described | Delivered? | Why not |
|---|---|---|
| A giant wall, infinitely zoomable | **No** | Even in phase C2 the surface is an editor tab. At a default 1440 px window the editor region is about 500 px wide and a level 0 drawing is about 620 px, so it scrolls. There is no camera, and adding one requires claiming the `DESIGN.md` S14 exception in writing first |
| Mermaid-style boxes and arrows | **Partly** | Boxes yes. Arrows only for the edge kinds an import scan and a literal scan can see. On this repository that is three edges, all pointing at `shared` |
| Standing in front of it and pointing | **No** | It is a pane in a window on a laptop |
| "What is happening over in this piece?" | **Partly** | Structure, size and provenance yes. Behaviour no |
| "Where is that data coming from?" | **Barely** | An import edge does not answer it. A path view of up to 4 hops answers a narrower version of it. Behavioural edges, being reads, writes, spawns and calls, are the ones that would answer it and they are the ones that cannot be extracted |
| "Which API?" | **Partly** | A URL literal in the source and an SDK package in a manifest are both mechanical. **Neither tells you the purpose**, and `rg -n 'https://' src` answers the same question today in under a second |
| Rendering the interface and talking through the design | **No** | Nothing in this workflow addresses it. It is a different product |
| Collaborators standing there with you | **No** | Needs a hosted service. Research 48 killed a cloud component twice |
| Claude listening, responding, implementing | **No** | Tortie may never call a model provider. The renderer CSP has no `connect-src` and `build/assert-preview-containment.mjs` pins the string. The nearest legal shape is that the operator types into a session he already has open, which is what he does today |
| Voice input | **No** | Needs `com.apple.security.device.audio-input`, which is a paragraph in a phase brief and an entitlement change |
| Thousands of tokens per second | **No** | Not a Tortie property |

### 12.6 Things this design admits it cannot do, restated in one place

- It cannot say **why** anything is the way it is.
- It cannot show the **road not taken**, which is the entire content of 13 of the 30 documents.
- It cannot express **deliberate absence**, e.g. "there is no Sentry and no PostHog".
- It cannot draw an **ordered flow** with a reason attached to specific steps, which is the section
  23 of 30 documents carry and where the operator spends most of his ASCII characters.
- It cannot express **concurrency**.
- It cannot draw a **call graph**, and drawing one from tags-query name matching would draw wrong
  arrows.
- It cannot draw arrows for the **six languages it has no grammar for**, and adding a seventh
  grammar is a deliberate act with a size cost.
- It cannot **rank importance**. It knows which part is bigger and which is more connected. It does
  not know which one matters.
- It cannot tell you a name is **wrong**, only that it is **old**.
- It cannot be **read outside Tortie**, beyond an optional mermaid text export that carries no
  provenance and no evidence.

### 12.7 Things I did not do

I ran no git command that writes. I edited no repository file except this one. I launched no
Electron, ran no build, ran no test, and started no tmux server. I read the tree read-only and ran
read-only `git log`, `grep`, `wc` and a few Node scripts that read files and print counts. The
scratch files are all under
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/` with an
`r49` prefix. The four that produced numbers quoted above are `r49syn-edges.mjs`,
`r49-fix-edges.mjs`, `r49-fix-edges-go.mjs` and `r49-fix-edges-go-d2.mjs`.

**On the file count of 621, because a reviewer counted 629.** The exclusion rule was not stated
before and it is this. 621 is the count of `.ts` and `.tsx` files under `src/` after removing every
file inside a `__tests__` directory. Re-measured today:

| Rule | Count |
|---|---|
| Every `.ts` and `.tsx` file under `src/` | 905 |
| The same, minus files inside a `__tests__` directory | **621** |
| The same, also minus `.d.ts`, `.test.*` and `.spec.*` files | 620 |

There is exactly one `.d.ts` file under `src/` and no `.test.*` or `.spec.*` file outside a
`__tests__` directory, which is why the last two rows differ by one. **I could not reproduce a count
of 629 under any exclusion rule I tried**, and the difference changes no conclusion either way.

The working tree is dirty with Phase 41's uncommitted work. Every measurement I made used the
working tree as it stands, and any line number I cite in `src/main/tmux/` or
`src/renderer/state/` may move.

---

## 13. Sources

URLs that carried real weight. All fetched on 2026-08-15 unless a date is given.

**The corpus and the local tree**
- The 30 distinct `AS-BUILT-ARCHITECTURE.md` documents under `/Users/gdc`, read directly
- `/Users/gdc/deadreckon/skills/narrator-as-built/SKILL.md`
- `/Users/gdc/.agents/skills/lore/scripts/lib/patterns.mjs`
- `/Users/gdc/.agents/skills/goal-rider-author/SKILL.md`
- `/Users/gdc/DataGripProjects/cursor_491/.idea/.gitignore`
- `src/renderer/state/sidebar-views.ts`, `src/renderer/styles/tokens.css`,
  `src/renderer/scm/freshness.ts`, `src/renderer/editor/tab-types.ts`,
  `src/renderer/index.html`, `src/main/symbols/queries.ts`, `src/main/symbols/persist.ts`,
  `src/main/db/sqlite.ts`, `src/main/config/confirm.ts`, `src/main/config/paths.ts`,
  `src/shared/fs-ops.ts`, `docs/ZEN-OF-TORTIE.md`, `DESIGN.md`, `CLAUDE.md`

**Deterministic extraction**
- https://github.com/github/stack-graphs
- https://github.com/scip-code/scip and https://registry.npmjs.org/@scip-code/scip/latest
- https://registry.npmjs.org/@bufbuild/protobuf/latest
- https://registry.npmjs.org/web-tree-sitter/latest
- https://registry.npmjs.org/typescript/7.0.2 and .../6.0.0-beta
- https://registry.npmjs.org/oxc-parser/latest
- https://raw.githubusercontent.com/universal-ctags/ctags/master/COPYING
- https://github.com/bartolli/codanna

**LLM-assisted mapping**
- https://raw.githubusercontent.com/CodeBoarding/CodeBoarding/main/static_analyzer/cluster_helpers.py
- https://raw.githubusercontent.com/CodeBoarding/CodeBoarding/main/static_analyzer/constants.py
- https://raw.githubusercontent.com/CodeBoarding/CodeBoarding/main/static_analyzer/graph.py
- https://raw.githubusercontent.com/CodeBoarding/CodeBoarding/main/agents/validation.py
- https://raw.githubusercontent.com/ahmedkhaleel2004/gitdiagram/main/src/server/generate/prompts.ts
- https://raw.githubusercontent.com/Aider-AI/aider/main/aider/repomap.py
- https://aider.chat/docs/repomap.html and https://aider.chat/2023/10/22/repomap.html
- `1st1/lat.md`, its README and its `lat check` implementation
- https://docs.devin.ai/work-with-devin/deepwiki
- https://code.claude.com/docs/en/memory

**Rendering, layout and licences**
- https://github.com/tldraw/tldraw/blob/main/LICENSE.md
- https://raw.githubusercontent.com/kieler/elkjs/master/LICENSE.md
- https://gitlab.com/graphviz/graphviz/-/raw/main/LICENSE and https://graphviz.org/license/
- The published tarball LICENSE files for `@dagrejs/dagre`, `@dagrejs/graphlib`, `d3-hierarchy`,
  `bpmn-js`, `diagram-js`, `konva`, `@cosmos.gl/graph`, `@cosmograph/cosmos`
- https://registry.npmjs.org/ for 37 packages, plus https://api.npmjs.org/downloads/point/last-week/
- https://raw.githubusercontent.com/visgl/deck.gl/master/docs/developer-guide/performance.md
- https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/md/performance.md
- Chromium `content/renderer/webgraphicscontext3d_provider_impl.cc` and
  `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`

**Formats**
- https://jsoncanvas.org/spec/1.0/
- https://github.com/ocwg/spec/blob/main/spec/v0.7.0/spec.md
- http://graphml.ethz.ch/specification.html
- https://learn.microsoft.com/en-us/visualstudio/modeling/directed-graph-markup-language-dgml-reference
- https://www.rfc-editor.org/info/rfc8785
- https://github.com/finos/architecture-as-code/blob/main/calm/release/1.2/meta/core.json
- https://d2lang.com/tour/positions/ and https://d2lang.com/tour/tala/
- https://mermaid.js.org/syntax/flowchart.html and .../architecture.html
- https://docs.structurizr.com/dsl/language

**Discontinued products**
- https://github.com/CoatiSoftware/Sourcetrail
- https://www.gitkraken.com/blog/gitkraken-launches-devex-platform-acquires-codesee
- https://sonarsource.com/structure101/
- https://docs.structurizr.com/eol and https://docs.structurizr.com/cloud
- https://devblogs.microsoft.com/devops/upcoming-changes-in-visual-studio-architecture-and-design-tools/
- https://learn.microsoft.com/en-us/visualstudio/modeling/map-dependencies-across-your-solutions
- https://www.ndepend.com/docs/dependency-structure-matrix-dsm
- https://www.hello2morrow.com/products/sonargraph
- https://www.castsoftware.com/products/imaging
- https://codescene.com/ and https://swimm.io/ and https://www.moderne.ai/
- https://marketplace.visualstudio.com/items?itemName=AtlasCodeVSC.atlas-architecture-explorer
- https://wettel.github.io/codecity-faq.html

**Staleness and contracts**
- https://arxiv.org/abs/2608.03734 (ReCite)
- https://arxiv.org/abs/2606.09090 (Context rot)
- https://arxiv.org/abs/2605.17062 (package hallucination)
- https://docs.dagster.io/guides/build/assets/asset-versioning-and-caching
- https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- https://spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html
- https://docs.swimm.io/features/keep-docs-updated-with-auto-sync/
- https://raw.githubusercontent.com/Wilfred/difftastic/master/src/options.rs
- https://raw.githubusercontent.com/parcel-bundler/watcher/master/README.md
- https://developer.apple.com/library/archive/documentation/Darwin/Conceptual/FSEvents_ProgGuide/UsingtheFSEventsFramework/UsingtheFSEventsFramework.html
- https://facebook.github.io/watchman/docs/cmd/query.html
- https://raw.githubusercontent.com/TNG/ArchUnit/main/archunit/src/main/java/com/tngtech/archunit/library/plantuml/rules/PlantUmlArchCondition.java
- https://raw.githubusercontent.com/seddonym/import-linter/master/docs/contract_types/layers.md
- https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md

**Where the map lives**
- https://raw.githubusercontent.com/cline/cline/main/sdk/packages/core/src/hooks/checkpoint-hooks.ts
- https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/src/services/checkpoints/ShadowCheckpointService.ts
- https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/platform/workspaces/node/workspaces.ts
- https://raw.githubusercontent.com/zed-industries/zed/main/crates/workspace/src/persistence.rs
- https://raw.githubusercontent.com/jj-vcs/jj/main/docs/git-compatibility.md
- https://git-scm.com/docs/gitattributes and https://git-scm.com/docs/git-notes

**Agents and MCP**
- https://platform.claude.com/docs/en/about-claude/pricing
- https://code.claude.com/docs/en/costs
- https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://google-gemini.github.io/gemini-cli/docs/quota-and-pricing.html
- https://cursor.com/docs/cli/reference/parameters
- https://docs.factory.ai/droid-exec/overview.md
- `--version` and `--help` on eleven installed CLIs

**Abstraction level and perception**
- https://arxiv.org/pdf/2311.04643 (SARIF, Tables 5, 7 and 8)
- https://arxiv.org/pdf/1901.07700 (Link et al.)
- https://arxiv.org/pdf/2107.01766 (E-SC4R)
- https://hal.science/hal-00343819/document (Ghoniem, Fekete, Castagliola, InfoVis 2004)
- https://arxiv.org/abs/2607.20089 (edge bundling task taxonomy)
- https://api.crossref.org/works?query.bibliographic=Layout+Adjustment+and+the+Mental+Map
- https://api.openalex.org/works/https://doi.org/10.1109/32.917525 (reflexion model)
- https://www.nngroup.com/articles/short-term-memory-and-web-usability/
- https://c4model.com/diagrams
- https://www.w3.org/TR/graphics-aria-1.0/ and the WAI-ARIA 1.2 `aria-flowto` section
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src







