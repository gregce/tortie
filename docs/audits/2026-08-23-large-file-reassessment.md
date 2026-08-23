# Phase 128 · What shared types, the agent registry and the Git service should become

**Phase 128. Ruling document. Written 2026-08-23, measured at commit `bfb4e29` with a clean tree.**

Three evidence lanes each read one file and answered four questions about it, being how many reasons
to change it has, who depends on it and in which direction, what the earlier architecture runs took
out of it, and what a split would cost and buy. An adversary then attacked all three lanes and the
ruling that followed them. This document is the ruling. It carries every number the adversary
corrected, and it says where the adversary won.

**Spend.** Zero. No agent CLI was invoked. No model was reached by any lane, by the adversary or by
this author. Nothing in this round cost money.

**Safety.** No Electron process was started by anyone in this round. `npm run shot` was never run. No
tmux command of any kind was run, not even a read only `list-sessions`. The operator's own checkout
at `/Users/gdc/gmux` was never entered. His manifest was never opened. Nothing under `/Users/gdc`
outside the scratch worktree was read, written or moved. Free memory was 4.6 GB when this document
was started. The only commands run against the tree were `git`, `grep`, `wc`, `node` on two build
gates, `npm run typecheck` and `npm run build`. One throwaway type probe was written to the
scratchpad and deleted. `git status` was clean before the round and holds only this document and
`docs/BACKLOG.md` after it.

---

## 1. The answer

**Nothing is split. All three files stay where they are.** Each one has more reasons to change than
is healthy, at six, eight and six, and each one still fails the test that decides a split, which is
whether any consumer wants one of those reasons without the others. Size was never the reason and
the backlog entry said so. Once size is set aside there is nothing left in any of the three cases.
Ruling against a split was named as a good outcome and it is the outcome, three times out of three.
**The architecture programme's work on these three files is finished. The programme itself should
not be declared finished on this phase's evidence, and section 7 says why.**

| File | Lines | Ruling | Reasons to change | Production importers | Importers wanting one reason | Lines taken out by Runs A to D | Deciding reason |
|---|---:|---|---:|---:|---:|---:|---|
| `src/shared/types.ts` | 1,526 | **LEAVE** | 6 | 152 | many, but none that shrinks a rebuild | 0 | Every one of the six sections is imported by both the `web` project and the `main` project, and `src/shared/ipc` names five of the six, so no extraction shrinks any rebuild set. Measured saving from the best available extraction was 1.7 s on a 7.09 s typecheck, for a section that is 4.9% of the file. |
| `src/main/agents/registry.ts` | 1,724 | **LEAVE** | 8 | 26 | 13, of which 6 are runtime | 0 | 51 executable statements in 1,724 lines, one runtime out edge to a terminal leaf, and 0 of the 182 commits since 2026-08-17 touched it. The one column this codebase has already extracted from it, being `src/main/agents/flags.ts`, produced a hand copied agent id list that nothing in the tree derives. |
| `src/main/git/service.ts` | 1,642 | **LEAVE** | 6 | 3 | 0 | 0 | Not one importer wants one reason. Two IPC registrars between them touch 27 of its 34 public methods, and 38 internal calls from five of the six reasons land in one 97 line validation core that also holds the only per repo cache. |

Reasons to change, counted on its own, is the wrong test. Counted alone it says split all three, at
six, eight and six. What decided every case was the second question. Section 8 writes both questions
down so a later round has a rule rather than a fresh argument.

---

## 2. What was re-measured, and by whom

The three lanes were not taken on trust. The author re-measured every claim that decides a verdict,
and the adversary then re-measured the author. This table lists the claims that moved.

| Claim | Who said it | What the measurement says | Standing |
|---|---|---|---|
| `types.ts` has 166 production importers | lane A | 152 files name `@shared/types`, out of 212 total | lane A withdrawn, 152 stands |
| `registry.ts` has 7 importers that want one reason, all `import type` | the first ruling | 13 files name exactly one registry symbol and 6 of those are runtime value imports | corrected in section 4 |
| Five production files are larger than 1,724 lines | the first ruling | Seven are | corrected in section 7 |
| An agent added to the registry and missing from `flags.ts` compiles clean | lane B | It does not. TS7053 fires at two index sites | overturned in section 4 |
| The compiler protects the `flags.ts` mechanism | the first ruling | It protects two index sites. Three other sites are cast and would not error | narrowed in section 4 |
| The architecture programme should stop | the first ruling | The three files judged are two of the three coldest large files in the tree | refuted, see section 7 |

---

## 3. `src/shared/types.ts`, 1,526 lines

**Ruling: LEAVE.**

### Reasons to change: six

Every one of the 77 exported declarations was assigned to a subject by hand and the line ranges
measured. The six subjects are not laid out in six blocks. They are laid out in 13 contiguous topic
blocks with 12 topic switches, because git occupies five separate ranges and session, filesystem and
errors occupy two each.

| Reason to change | Lines | Share of file | Exported declarations | Commits that added lines inside it |
|---|---:|---:|---:|---:|
| Git and source control | 595 | 39.0% | 44 | 7 |
| Session durability | 535 | 35.1% | 16 | 16 |
| Agent registry wire shapes | 142 | 9.3% | 5 | 4 |
| Agent input tables | 109 | 7.1% | 9 | 4 |
| Error code alphabet | 74 | 4.9% | 1 | 7 |
| Filesystem payloads | 41 | 2.7% | 3 | 3 |

Of the 28 commits that ever touched the file, 18 touched exactly one reason. 23 distinct phases are
named inside it, from Phase 3 to Phase 116.

### Who depends on it

152 production files and 60 test files name `@shared/types`. The direction is a pure sink. The file
has one import statement, being `import type { MachineColor } from './machines'`, and `./machines`
imports nothing. Nothing in the file names main, renderer or preload, so there is no layer inversion
to fix.

78 exports, of which 76 are `type` or `interface` and 2 are `const` arrays. Exactly one production
file value imports it, being `src/main/manifest/codecs.ts`, which reads `SESSION_STATUSES` and
`RESUME_CAPTURES` as parse whitelists. The file therefore has one runtime in edge and zero runtime
out edges. A node with zero runtime out edges cannot belong to a strongly connected component larger
than itself, so it was not in any of the seven components Run B cut and it cannot be in a future one.
`src/preload` names the file zero times and reaches these shapes through `src/shared/ipc` instead,
which is the one door Phase 125 established.

Every one of the six sections is imported by both the `web` project and the `main` project. Five of
the six are also named directly by `src/shared/ipc`.

### What Runs A to D took out of it

Nothing. Not one line. `git show --numstat` against this path is empty for all six commits, being
`3d883ab`, `9b99ab4`, `8ce91a0`, `43b12fd`, `82c4eff` and `a60dc8e`. Phase 122 rewrote 16 files under
`src/shared` and left this one alone.

### Cost and benefit of a split

| Split shape | Importer files rewritten | What it buys, measured | Deciding reason |
|---|---:|---|---|
| Facade directory, `src/shared/types/` with an `index.ts` | 0 | 6.95 s against a 6.97 s baseline, which is noise | TypeScript follows the declaration graph through a re-export, so every consumer still depends on every leaf. It buys a shorter file and adds a second facade rule with its fixtures to the boundary gate. |
| Direct imports, no facade | 212 | 6.77 s against 6.97 s for the filesystem section | It breaks `build/conformance-machines.mjs`, whose `ALLOWED_TRUTH_IMPORTS` list is the literal `['@shared/types', './remote-copy']`, so `src/main/machines/status-truth.ts` fails its own gate on the day it names a leaf. |
| Extract the git section, 595 lines | about 29 | not measured | `src/shared/ipc/git.ts` names it at four import sites, and 21 of its production importers are in the renderer while 6 are in main, so both projects still rebuild. |
| Extract the error alphabet, 74 lines | 12 | 1.7 s, from 7.09 s to 5.37 s | The only measured win in the file. The error union changed in 7 of 28 commits, so the extraction would have saved about 12 seconds of typecheck across the file's whole life, and the remaining 1,456 lines still cost 7.09 s. |

The claimed benefits that do not survive measurement are these. It does not remove a cycle, because
the file has zero outgoing runtime edges already. It does not shrink a rebuild set, because all six
sections are imported by both projects. It does not shrink the renderer bundle, because 226 of the
227 import sites use `import type` and erase. It does not reduce merge conflicts under parallel
builds, because `CLAUDE.md` already makes `src/shared/*` append only and names the integrator as the
reconciler, and no conflict in this file is on record.

### The trigger that would change this ruling

Revisit when either of these becomes true. First, a section of this file stops being imported by both
the `web` and the `main` project, or `src/shared/ipc` stops naming it. That is the condition that
makes an extraction shrink the rebuild set, and today it holds for one section out of six. Second, a
single reason to change accounts for more than 20 commits to this file inside one 30 day window. The
rate today is 28 commits in 11 days across six reasons.

---

## 4. `src/main/agents/registry.ts`, 1,724 lines

**Ruling: LEAVE.**

### Reasons to change: eight

1,580 of the 1,724 lines attribute to one of eight field families, each with its own research
document and its own phase.

| Reason to change | Lines | Last fired |
|---|---:|---|
| Resume mechanics change | 421 | 2026-08-15 |
| An agent is added, or renames its binary, or moves its store | 405 | 2026-08-16 |
| The install map is re-read | 240 | 2026-08-16 |
| Launch mechanics change | 174 | 2026-08-15 |
| The specstory capture column changes | 103 | 2026-08-11 |
| Image drop changes | 86 | 2026-08-10 |
| Activity detection changes | 84 | 2026-08-10 |
| The Shift+Enter table changes | 67 | 2026-08-10 |

Eight is over the healthy count. What decides the file is how those eight arrive. Six of the sixteen
commits in the file's whole history are single column sweeps, and every one of the six happened once
and has not recurred. Five of the six fired inside a six day window from 2026-08-10 to 2026-08-16.
The install column's own stated cadence, written at lines 316 to 319, is once per quarter.

### What the file is made of

The audit's claim that the registry is mostly declarative is true and understated. 57.5% of the file
is one data literal. The whole file holds 51 executable statements and 29 branch points, which is one
statement per 34 lines. Two functions hold 14 of the 29 branch points and both are argv builders. The
file contains no `require(`, no `node:` import, no `electron` import, no `fs` and no `process.env`.

68.2% of its bytes are evidence a person reads, being 33,539 bytes of comment and 27,137 bytes of
prose inside `notes`, `quirks`, `source`, `note` and `status` values. No production code reads a
registry entry's `notes`. The single read of `quirks` is `src/main/config/overlay.ts:1125`, which
copies the array forward and never displays or acts on the strings. The repository states this
independently at `src/renderer/__tests__/user-visible-name.test.ts:179`, which allowlists the file
with the reason that it is documentation as data.

### Who depends on it

26 production importers, all in the main process. Zero in the renderer, zero in the preload and zero
in shared. Two build probes, nine test files and five dynamic `await import()` sites in tests.
Nothing the registry imports imports it back.

**This corrects the first ruling, which said 7 importers want one reason and all of them use
`import type`.** The real count, taken by listing the imported symbols for every production importer,
is 13 files that name exactly one registry symbol, and 6 of those are runtime value imports.

| File | What it names | Form |
|---|---|---|
| `src/main/activity/state-machine.ts` | `AgentActivityProfile` | type |
| `src/main/machines/remote-harvest.ts` | `AgentHarvestKey` | type |
| `src/main/manifest/harvest/claim-strength.ts` | `AgentHarvestKey` | type |
| `src/main/manifest/harvest/remote.ts` | `AgentHarvestKey` | type |
| `src/main/manifest/harvest/stores.ts` | `AgentHarvestKey` | type |
| `src/main/specstory/sync.ts` | `SpecstoryProviderId` | type |
| `src/main/specstory/wrap.ts` | `SpecstoryProviderId` | type |
| `src/main/context/agent-context.ts` | `AGENT_REGISTRY` | value |
| `src/main/drop/ipc.ts` | `imageDropTable` | value |
| `src/main/manifest/harvest/watch.ts` | `getRegistryEntry` | value |
| `src/main/menu.ts` | `getRegistryEntry` | value |
| `src/main/restore/restore.ts` | `getLaunchableEntry` | value |
| `src/main/settings/store.ts` | `LAUNCHABLE_AGENT_IDS` | value |

So the erasure argument does not carry this file. `src/main/drop/ipc.ts` wants the image drop reason
alone and `src/main/settings/store.ts` wants the launch reason alone, and neither import is erased.
The ruling still stands, on the two facts below.

### Structure

In degree 26, out degree 1. The file has two import statements. One is type only from
`@shared/types` and erases. The other names three constants from `@shared/agent-defaults`, which is
76 lines with one import of its own that is also type only. So the one runtime out edge lands on a
terminal leaf, and the import boundary gate already forbids that leaf naming `src/main`.

```
  26 production importers ──▶  src/main/agents/registry.ts
                                        │  one runtime edge
                                        ▼
                              src/shared/agent-defaults.ts   76 lines
                                        │  type only, erased
                                        ▼
                                   (terminal)
```

### What Runs A to D took out of it

Nothing, and no run edited it at all. 182 commits landed since 2026-08-17 and 0 of them touched this
file. The last commit to touch it is dated 2026-08-16. Four consecutive architecture phases examined
the module graph, the compile graph, the contract surfaces and the renderer shells, and none of them
found anything here worth moving.

The file's own history shows the pressure on it was always about the correctness of external facts
rather than about structure. Five of its sixteen commits are `fix(`, and each corrects a measurement
about a third party CLI. Lines 29 to 39 record that nine of the ten launchable resume rows were once
wrong because the data was mined from a capture tool that never needed to resume anything. That is a
research failure. No commit in the file's history shows an editor changing the wrong row or the wrong
column.

### Cost and benefit of a split

| Shape | Lines it removes | What it buys | Deciding reason |
|---|---:|---|---|
| Split by column, one file per field family | up to 992 | The six column sweeps land in one file each | Each agent's row becomes eight objects in eight files, and a compile checked object literal becomes a runtime merge. Adding an agent goes from 129 insertions in one place to eight edits joined by hand. |
| Extract the types to `registry-types.ts` | 387 | Seven type only importers stop naming the big file | Zero runtime change, because all of them erase already. 270 of the 387 lines are doc comments explaining why each field exists, and they would move one file away from the rows that must fill them. |
| Extract the 14 helpers to `registry-argv.ts` | 274 | Data separated from behaviour, one clean seam | It moves 6.4% of the file to answer a complaint about the other 93.6%. The complaint is about the eight data columns and this shape does not touch them. |
| Extract the prose out of `notes` and `quirks` | 0 lines, 27,137 bytes | 27 KB off the main process bundle | It breaks `build/probe-p139-caption.mjs`, which reads the file by path and parses it with `/\n {4}id: '([a-z0-9]+)',/g`, so a moved row makes the probe return an empty list without throwing. It also contradicts the allowlist reason in `user-visible-name.test.ts:179`. |

Two other costs bind every shape. `build/probe-p139-caption.mjs:132` reads this exact path and
depends on the exact four space indentation of its entries. `src/renderer/__tests__/user-visible-name.test.ts:179`
names this exact path as an allowlist entry, so moving the `notes` and `quirks` puts their "gmux"
strings in a file with no allowlist row and turns that test red. Four conformance gates would need
re-baselining, being `conformance:agents` at 0.92 s, `conformance:installs` at 0.63 s,
`conformance:context` at 0.62 s and `conformance:resume:capture`, which was not run here because it
launches Electron. 107 prose cross references name this file by literal path, 31 of them in
`docs/research`.

### The precedent, and it is the decisive cost

This codebase has already extracted one column from this registry. `src/main/agents/flags.ts` is 670
lines, holds the per agent launch flag catalogs, and has zero import statements. Its own header says
why, being that the ids stay string literals so the module takes no dependency on the registry. So
the launchable agent id list exists twice, once as `LAUNCHABLE_AGENT_IDS` derived from the registry
rows and once as a hand written union `RegistryAgentId` at `flags.ts:36`. Nothing in the tree derives
one from the other.

**Lane B's reading of that precedent was wrong and this ruling overturns it.** Lane B wrote that an
agent added to the registry and forgotten in `flags.ts` compiles clean and silently gets no launch
flags. It does not. The adversary added `| 'newagent'` to `AgentRegistryId` at `src/shared/types.ts:851`
on the real tree and ran `npm run typecheck`. TS7053 fired at `src/main/settings/store.ts(123,19)`
and `(141,19)`, plus TS2741 at `src/main/conformance/cases.ts(44,14)` and
`src/main/context/agent-context.ts(1205,7)`. `LaunchableAgentId` is
`Exclude<AgentRegistryId, 'cursoride' | 'copilotide'>` and `AGENT_FLAG_PRESETS` is
`Record<RegistryAgentId, AgentFlagCatalog>`, so indexing the second with the first is an error, and
all seven tsconfig files set `strict: true`. The tree was restored and the typecheck is green again.

**The overturn has a narrower scope than the first ruling claimed, and the adversary was right about
that too.** The compiler protects two index sites, not the mechanism. Three other sites are cast and
would not have errored.

| Site | Code | Effect |
|---|---|---|
| `src/main/manifest/agents.ts:571` | `AGENT_FLAG_PRESETS[agent as keyof typeof AGENT_FLAG_PRESETS]` | cast, no error |
| `src/main/conformance/cases.ts:94` | the same cast | cast, no error |
| `src/main/machines/remote-arm.ts:202` | `(AGENT_FLAG_PRESETS as Record<string, {...} \| undefined>)[...]` | cast, no error |

So the correct statement is this. The drift lane B described cannot happen silently at the two
uncast index sites, and it is not prevented by any derived type. What the precedent still shows, and
this is why it decides the case, is that extracting one column from this registry produced a second
list of agent ids that a person has to keep in step by remembering. The two lists agree today because
both carry all eleven launchable agents. Nothing keeps them that way. Lane B's proposal to bind
`flags.ts` back to the registry is not queued by this phase, because the compile error above means
the case it was written to prevent already fails a gate.

---

## 5. `src/main/git/service.ts`, 1,642 lines

**Ruling: LEAVE.**

### Reasons to change: six

Every one of the 1,642 lines was assigned to exactly one reason and the totals sum to 1,642 with no
line counted twice. 79 lines are the file header and imports and 25 are blank separators.

| Reason to change | Lines | Example of a change request that lands here |
|---|---:|---|
| History graph, scope and divergence | 429 | the history pane should let me pin a ref set |
| Remotes, push, pull, fetch, sync and failure wording | 292 | the push error should mention a token |
| Branches, tags, checkout, cherry-pick | 266 | add revert to the commit context menu |
| Working tree status and staging | 254 | the Changes list should show submodule state |
| Blob reads and historical diffs | 200 | a merge commit should diff against the second parent too |
| Input validation, git dir, sequencer state | 97 | a ref with a `#` should be rejected |

Six is above the healthy count. The history says these six have never collided. The file has eight
lifetime commits and six of them are substantive, and each one landed inside a single reason. Only
one commit in the file's life edited two reasons at once, and that commit was a five feature release.
Since 2026-08-15 the file has not been edited at all, across 8 days and roughly 25 phases. 0 of the
182 commits since 2026-08-17 touched it.

The file is 34 public methods, 20 private methods, 6 top level functions and 1 interface, in 1,154
code lines. That averages 21 code lines per member. The longest member is `graphLog` at 81 lines.
There is no member in this file that is itself hard to read.

### Who depends on it, and this is what decides the case

Three production importers, all inside `src/main/git`, plus one lazy dynamic import.

| Importer | Form | Methods it uses | Reasons it spans |
|---|---|---:|---|
| `src/main/git/ipc.ts` | runtime | 8 | three |
| `src/main/git/depth-ipc.ts` | `import type`, erased | 18 | four |
| `src/main/git/index.ts` | barrel re-export | none | all |
| `src/main/fs/image.ts` | `await import('../git')` at line 182 | 1 | one |

**Not one importer wants one reason.** The fourth row is the only single reason consumer in the tree
and it does not survive inspection. Its own comment at line 179 says the fs channels must not drag
the git service into the module graph. The thing it is avoiding is `src/main/git/ipc.ts`, because
`getGitService` lives there beside `registerGitIpc` and the `RepoWatcher` map. Splitting `service.ts`
into six files would leave that dynamic import exactly where it is.

Five files under `src/main/machines/` import from this directory and not one of them names
`./service`. They take `../git/parsers` or `../git/exec`. That is Phase 126's outcome and it means
the remote source control lane exerts zero pull on this file.

Inside the file, one reason is a shared base the other five call into.

```
  status/staging  ─┐
  history graph   ─┤
  blob reads      ─┼──▶ validation + resolveGitDir + gitDirCache
  branches        ─┤        97 lines, 38 inbound call sites
  remotes/sync    ─┘
```

`assertIsRepo` has 14 call sites across three reasons. `assertSafeRef` has 8 across two.
`NOT_A_REPO_RE` has 6 across five. `gitDirCache` at line 142 is the only instance state besides
`repoPath`, and three methods in three different reasons read it. Six separate classes would each
carry their own copy of that cache, or the phase would have to invent a shared context object.

### Structure

Two inbound runtime edges and four outbound. `depth-ipc.ts` uses `import type` so it adds no runtime
edge. Every outbound edge lands on a leaf or on a module that only reaches leaves, so a cycle through
this file is not currently possible.

### What Runs A to D took out of it

Nothing, and this corrects the phase brief's own framing. Phase 126 did not take seven parser
functions out of `service.ts`. It took them out of the git barrel. `82c4eff` created
`src/main/git/parsers.ts`, being 60 lines of pure re-export holding no function bodies, and changed
`index.ts` to re-export through it. `service.ts` is byte identical to what it was on 2026-08-15, and
it imported the parsers directly from `./parse` and `./graph-parse` both before and after.

So the honest answer to whether Phase 126 relieved the pressure on this file is no, because there was
no pressure on this file to relieve. The pressure Phase 126 measured was on `src/main/machines/`,
where a remote read module asking for `parseGraphLog` received `GitService`, `registerGitIpc` and
`getGitService` in its runtime graph. The fix routed around `service.ts` rather than into it.

### Cost and benefit of a split

| Cost | Measurement |
|---|---|
| New files | 6 domain files plus a facade class |
| Test call sites to rewrite | 153 `svc.<method>` calls across 7 integration suites totalling 1,701 lines, plus `harness.ts` |
| New public surface invented | at least 4 private helpers become cross module exports |
| Shared instance state to solve | `gitDirCache`, read by 3 methods in 3 different reasons |
| IPC channels at risk | 26 `git:*` channels, of which 20 are distinct |
| Gates to re-baseline | typecheck, build, test, both structural gates, `p126-boundary.test.ts`, `smoke:t1` and `smoke:t3` |

Nothing would break silently. Every failure mode here is a compile error or a red test. Two things
could go wrong without a type checker noticing, and both are about ordering. `remoteOpError` consults
`AUTH_MAYBE_RE` only after `NO_REMOTE_REPO_RE`, and the comment at lines 120 to 125 says why, being
that a mistyped path otherwise reads as an authentication problem. That ordering has no unit test.
`graphLog` batches its calls into two rounds on purpose so the commit rows and the ahead and behind
numbers describe one instant, and splitting the history reason from the remotes reason puts
`lastFetchedAt` on the far side of a module boundary from the `Promise.all` that batches it.

The benefit is a shorter file and one testability gain that does not need a split. Four pure top
level functions in this file are module private and have zero references anywhere outside it, being
`remoteOpError` at 63 lines, `resolveScopeRefs` at 44, `toDivergenceInfo` at 31 and `isBinaryBuffer`
at 4. Adding the word `export` to those four declarations makes every one of them unit testable in
place, with no move, no new file, no importer touched and no gate re-baselined.

### Two smaller findings, named and not queued

Both are Tier 1 and neither is a split. They are recorded here so a later cleanup round does not have
to rediscover them, and the phase does not queue them because the backlog entry told it not to
manufacture work.

1. **Seven public methods on `GitService` have zero production callers.** They are `isRepo`,
   `divergence`, `showHeadBuffer`, `firstParent`, `currentBranch`, `upstreamRef` and `resolveGitDir`.
   `upstreamRef` and `resolveGitDir` have zero callers of any kind outside the file. That is roughly
   90 lines of public surface, and shrinking a public surface is a better change than moving a
   private one.
2. **`src/shared/types.ts` lines 390 to 403 are an orphaned documentation block.** The 14 line JSDoc
   comment headed "What a captured session's row tells the renderer (Phase 15)" is immediately
   followed at line 404 by a second JSDoc comment, so TypeScript attaches only the second one to
   `SessionCaptureNotice`. The first block describes `SessionCapture`, which sits at line 421 with no
   documentation of its own. Fourteen lines of written explanation currently reach no reader on hover.

### What is copied and what is owned

`CLAUDE.md` names VS Code's git parsers as precedent for vendoring. None of `service.ts` is vendored.
`NOTICE` lines 57 to 67 name exactly two files as copied from microsoft/vscode, being
`src/main/quickopen/scorer.ts` and `src/renderer/scm/graph/layout.ts`. What this file carries is nine
comments citing VS Code's behaviour as the model to match. Following another product's behaviour is
not the same as loading its code.

---

## 6. What the four runs bought

**Two standing gates, four large files cut by roughly half, and 122,910 bytes off the chunk a
person's launch loads, for 399 file changes across seven phases.**

| Run | Phases | What changed, with numbers | Files touched |
|---|---|---|---:|
| A | 121, 122, 124 | A path with a space now round-trips in recents. Every member of an installed bridge is required. The TypeScript reference graph matches the real one. | 127 |
| B | 123 | 7 strongly connected components across 38 modules went to 0. It shipped `build/assert-no-runtime-cycles.mjs`. | 46 |
| C | 125, 126 | `src/shared/ipc/machines.ts` went from 3,117 lines to a 273 line barrel over 9 domain files holding the same 105 members. `src/main/sessions/core.ts` went from 4,080 to 3,045. Remote source control stopped reaching into private local leaves. | 47 |
| D | 127 | `App.tsx` went from 1,632 lines to 351. `FileTree.tsx` went from 1,789 to 678. 122,910 bytes of probe code left the 3,525,030 byte chunk. It added a directory wall with 10 fixtures. | 179 |
| **Total** | **7 phases** | **2 gates, 43 fixtures** | **399** |

Both gates were run for this document and both are green.

```
no runtime cycles: 15 fixtures behaved, 832 production files,
2918 runtime edges (dynamic counted), 0 strongly connected components          0.60 s

import boundaries OK: 28 fixtures behaved, 833 production files, 4877 imports,
0 violations (1 sole-owner package rule, 2 layers with no platform access,
1 facade directory, 1 directory wall)                                          0.09 s
```

Neither gate hardcodes its printed file count, so adding files does not move a number that has to be
re-baselined by hand.

---

## 7. Should the architecture programme stop

**No, not on this phase's evidence, and the first draft of this ruling was wrong to say otherwise.**
The three files judged here are finished and no further work on them is warranted. The programme as a
whole cannot be closed on three samples that were chosen by the audit and turn out to be among the
coldest large files in the tree.

The first draft argued that a programme whose remaining work returns nothing three times has
finished. That argument fails on the churn record. Two of the three files judged have not been edited
in seven days, and the file with the most edits in the tree over the last six days was never looked
at.

| File | Lines | Lifetime commits | Commits since 2026-08-17 | Judged this phase |
|---|---:|---:|---:|---|
| `src/renderer/machines/presentation.ts` | 2,948 | 30 | **30** | no |
| `src/main/machines/ipc.ts` | 1,726 | 25 | **25** | no |
| `src/main/sessions/core.ts` | 3,045 | 58 | 21 | no |
| `src/main/machines/remote-scripts.ts` | 2,934 | 16 | 16 | no |
| `src/main/machines/remote-smoke.ts` | 3,120 | 13 | 13 | no |
| `src/main/machines/remote-sessions.ts` | 2,917 | 13 | 13 | no |
| `src/renderer/scm/ScmSection.tsx` | 1,843 | 19 | 9 | no |
| `src/shared/types.ts` | 1,526 | 28 | 8 | yes |
| `src/main/agents/registry.ts` | 1,724 | 16 | **0** | yes |
| `src/main/git/service.ts` | 1,642 | 8 | **0** | yes |

**Seven production files are larger than the largest file judged, not five.** The first draft listed
five and omitted `src/renderer/scm/ScmSection.tsx` at 1,843 lines and `src/main/machines/ipc.ts` at
1,726. The count comes from every `.ts` and `.tsx` under `src`, excluding `__tests__` directories and
`.test.` files.

### The one candidate, measured and deliberately not queued

Applying this phase's own test to `src/renderer/machines/presentation.ts` returns a different answer
from the three files judged, and the honest thing is to record that rather than to leave the absence
of a candidate standing as evidence.

| Measurement | `presentation.ts` | The three judged files |
|---|---|---|
| Lines | 2,948 | 1,526, 1,724, 1,642 |
| Reasons to change | 21 banner sections, of which 15 name a distinct phase | 6, 8, 6 |
| Production importers | 41 | 152, 26, 3 |
| Importers naming exactly one exported symbol | 14 | many, 13, 0 |
| Importers naming symbols from exactly one banner section | about 20 | not measured, 13, 0 |
| Commits since 2026-08-17 | 30 of 182 | 8, 0, 0 |
| Exports that are types | 3 of 249 | 76 of 78, some, none |

The single symbol importers were counted by listing the named imports of every production importer.
Examples are `src/renderer/app/AgentGrid.tsx`, which takes only `agentNotOnMachineAria`, and
`src/renderer/editor/EditorPanel.tsx`, which takes only `remoteFileChip`. The section aligned
importers are larger still. `src/renderer/scm/RemoteBranchSection.tsx` takes 21 symbols and 20 of
them begin with `branch`. `RemoteHistorySection.tsx` takes 19 and 17 begin with `history`.
`RemoteRunsSection.tsx` takes 15 and 13 begin with `runs`. `QuickOpenPalette.tsx` takes 8 and all 8
begin with `quickOpen`.

**Three facts cut the other way and a future round has to weigh them rather than skip them.** First,
the file's own header states a design decision, being that one module is one file for a reviewer who
wants to know what Tortie claims about a machine it cannot see, and a vocabulary audit reads the file
and the surfaces that use it. Second, at least six test files name the path
`src/renderer/machines/presentation.ts` as a literal string, so a split has the same re-baselining
cost the registry has. Third, all 249 exports are sentences about one subject, which is a machine
Tortie cannot see, so a reader could count the reasons to change as one rather than 21.

**This phase does not queue that work and does not rule on it.** It was not this phase's subject, it
was not read end to end by anyone, and queueing a phase on a file nobody judged would be the same
mistake in the other direction. What is recorded here is the measurement and the fact that this
phase's own trigger is met on it. The operator decides whether one more audit phase runs.

### One thing Run D did that changes how silence should be read

`git show --numstat a60dc8e` contains `0 0 src/renderer/{app/machine-copy.ts => machines/presentation.ts}`,
which is a rename with no line changed. Run D picked up a 2,948 line file, moved it to a new
directory, and judged nothing about it. So a run's silence about a file means only that the file did
not block the run's own subject. Both structural gates do walk all 832 files, so their silence is
real evidence of no cycle and no boundary break for every file including this one. Their silence is
not evidence about responsibility, and this phase should not have read it that way.

---

## 8. The principle, for `CLAUDE.md`'s growth guardrails

**It sharpens the wording already there. It does not contradict it.** The current guardrail says to
organize by domain rather than by accretion, and to split when a file accumulates unrelated domains
rather than because it crossed an arbitrary length. That refusal of line count is right and this
phase confirms it. What the wording lacks is a second test, and without one all three files here
would have been split for nothing, because each of them does accumulate unrelated domains.

The wording below has three clauses rather than two. The two clause version was written first and an
adversary refuted it, because it gave an answer only when the second number is zero and this phase's
own registry ruling has that number at 13.

> **Reasons to change is the first test, demand is the second, and recency is the third. A split
> needs all three.** A file having several unrelated reasons to change is not enough on its own.
> Before proposing a split, state four numbers: how many reasons to change the file has, how many of
> its importers name exactly one of those reasons, how many of the last hundred commits touched it,
> and how many lines the last architecture rounds took out of it.
>
> If no importer wants one reason on its own, the split moves lines and buys nothing, and the ruling
> is to leave the file alone. Zero on the second number is a ruling, not a gap in the evidence.
>
> If the second number is above zero, the third number decides. A file no commit has touched in a
> week is not costing anyone anything, whatever its shape, and a split of it is work with no reader.
> Before proposing a split of a file that is still being edited, check whether this codebase has
> already extracted a column from it, and say what that extraction produced. `src/main/agents/flags.ts`
> is the example: it took one column out of the agent registry and produced a second list of agent
> ids that nothing derives.
>
> Two facts follow from measuring rather than from arguing, and both are narrow. A file whose exports
> are almost all types has no runtime out edges, so it cannot join a cycle and cycle risk is never a
> reason to split it. That says nothing about a file whose exports are almost all functions. A
> section whose consumers include both the `web` project and the `main` project, or that
> `src/shared/ipc` names, does not shrink any rebuild set by moving, because the contract every
> process imports still reaches it.
>
> Phase 128 applied this to `src/shared/types.ts`, `src/main/agents/registry.ts` and
> `src/main/git/service.ts`, at 1,526, 1,724 and 1,642 lines with 6, 8 and 6 reasons to change, and
> left all three.

**This phase does not paste that text into `CLAUDE.md`.** The two clause version was refuted, the
three clause version above is the repair, and the repair has not been through an adversary. Pasting
an unattacked rule into the file that binds every future round is the same mistake this phase was
written to avoid. The text is here, in one block, ready for the operator or for a later round to
place.

---

## 9. Every defect the adversary raised

Eight defects were raised against the first draft of this ruling. Six are accepted and fixed in the
text above. Two are accepted with a narrower scope than the adversary gave them. None is dropped.

| # | Defect | Answer | Where |
|---:|---|---|---|
| 1 | The stop recommendation rests on the three coldest large files | **Accepted.** The stop recommendation is withdrawn. The churn table is in the document and two of the three files judged have 0 commits in 182. | section 7 |
| 2 | The ruling's own test, applied to `presentation.ts`, says split, and the ruling cited its absence as evidence | **Accepted.** Re-measured independently: 41 production importers, 14 naming exactly one symbol, about 20 naming one section, 21 banner sections, 30 of the last 182 commits. Recorded as the one candidate, with the three facts that cut the other way, and deliberately not queued. | section 7 |
| 3 | "Five files are larger" is wrong, seven are | **Accepted and fixed.** `ScmSection.tsx` at 1,843 and `machines/ipc.ts` at 1,726 were missing. The corrected table lists all seven with their churn. | section 7 |
| 4 | The registry row saying "7, all `import type`" is false | **Accepted and fixed.** Re-counted from the named imports of every production importer and reached the adversary's numbers exactly: 13 files name one symbol and 6 of those are runtime. The full list is in the document. | section 4 |
| 5 | The proposed `CLAUDE.md` wording gives no answer when the second number is above zero, and omits recency, which is what actually decided all three cases | **Accepted.** The wording now has three clauses and asks for four numbers. Recency is the third clause and the `flags.ts` precedent test sits beside it. The wording is not pasted into `CLAUDE.md` this phase, because the refuted version and its repair have not both been attacked. | section 8 |
| 6 | The type erasure argument is narrow and the ruling implied a generality it did not test | **Accepted.** The clause now says explicitly that it says nothing about a file whose exports are almost all functions, and the `presentation.ts` row records 3 types out of 249 exports. | sections 7 and 8 |
| 7 | Run D renamed `presentation.ts` with `R100` and judged nothing, so a run's silence is weaker evidence than the ruling claimed | **Accepted.** The rename is quoted. Silence from a run now means only that the file did not block that run's subject. The gates' silence still counts for cycles and boundaries, because both gates walk all 832 files. | section 7 |
| 8 | The `flags.ts` overturn is correct but its stated scope is too wide, because three index sites are cast | **Accepted with the narrower scope.** The three cast sites are listed. The corrected sentence is that the drift cannot happen silently at the two uncast sites and is not prevented by any derived type. Lane B's proposal is still not queued, because the compile error means the case it was written to prevent already fails a gate. | section 4 |

The adversary's own recommendation was to keep all three LEAVE verdicts, replace the stop
recommendation with one more audit phase on `presentation.ts`, and correct the two tables. This
document keeps the three verdicts, corrects both tables, and goes half way on the phase. It records
the measurement and the fact that the trigger is met, and it leaves the decision to queue with the
operator, because no lane read that file end to end and this phase should not queue work on a file
nobody judged.

---

## 10. What is not true

**What nobody ran.**

- No Electron process was started by any lane, by the adversary or by this author. No screenshot was
  taken. `npm run shot` was never run.
- No tmux command of any kind was run, not even a read only `list-sessions`.
- `npm run test`, `npm run smoke:t1` and `npm run smoke:t3` were not run in this phase. `npm run
  typecheck` and `npm run build` were run once each, at the end, to prove the tree is sound.
- `npm run conformance:resume:capture` was not run, because it launches Electron. Three of the four
  conformance gates that touch the registry were run by lane B and all three passed. The fourth is
  reasoned, not measured.
- No packaging was run, so no number in this document is a measured bundle byte count. The 27,137
  byte prose figure for the registry is source size. Run D's 122,910 bytes is quoted from Phase 127's
  own commit, not re-measured here.

**Numbers taken from a lane rather than re-measured by the author.**

- Every compile time figure in section 3, being 7.35 s cold, 0.21 s warm, and the experiment results
  from 5.34 s to 7.32 s. `tsc -b` was not run for timing by the author or by the adversary. Lane A's
  conclusion that a facade split buys 0.0 s is reasoned from its own runs and is not independently
  confirmed. The runs were 2 to 3 per condition on one machine with a warm cache and no statistical
  treatment, and the spread within a condition was 0.02 s to 0.35 s.
- Lane A's classification of `types.ts` into six sections, its figure that 89.8% of production
  importers name one section, and its per commit historical mapping, which lane A itself called
  approximate.
- Lane B's byte breakdown of the registry, being 68.2% evidence and 27,137 bytes of prose, and its
  statement and branch counts of 51 and 29.
- Lane C's figure of 153 test call sites in the git suites. A grep for `svc.` across `src` returns
  194 references, all in tests. The two numbers count different things and were not reconciled.
- Lane C's line partition of `service.ts` into six reasons summing to 1,642, and its count of 26
  `git:*` channels.

**Numbers that disagree, with the disagreement left visible.**

- `types.ts` production importers. Lane A said 166, the adversary said 153, this author counts 152
  files naming `@shared/types` out of 212 total. The direction of the argument does not change at any
  of the three figures.
- `registry.ts` production importers. Lane B said 26. A grep for `agents/registry'` finds 24 files
  with static named imports, and the difference is import forms this grep pattern does not match. The
  26 is carried because lane B enumerated them and the single symbol count of 13 was reproduced
  exactly against both lists.

**Judgements that are not measurements.**

- The reason to change counts of 6, 8 and 6 are readings, not measurements. The line ranges are
  exact and each partition sums to the file's length. The grouping is a judgement about what a person
  would edit together. A different reader could merge two of the registry's eight families or split
  one of `types.ts`'s six. Every count stays above one, which is all the argument needs.
- The 21 reasons to change for `presentation.ts` is the banner count. The claim that about 20 of its
  41 importers name symbols from one section is a reading of symbol prefixes against banner headings.
  The 14 that name exactly one symbol is exact and was produced by listing every importer's named
  imports.

**Assumptions.**

- That `strict: true` implies `noImplicitAny` in the TypeScript version this repository pins. That is
  standard behaviour and the adversary's probe run confirms the error fires with the project's own
  compiler, but the pinned version was not read out of `package.json`.
- That each lane read the file it was given. No lane read either of the other two files. This author
  read targeted ranges of `types.ts`, `registry.ts`, `flags.ts`, `settings/store.ts`,
  `presentation.ts`, `probe-p139-caption.mjs` and `user-visible-name.test.ts`, and read none of the
  three files end to end.
- That the tree at `bfb4e29` is what ships. `git status` was clean at the start of the round, the
  adversary's one type probe was reverted, and the only files this commit carries are this document
  and `docs/BACKLOG.md`.

**What was not judged.**

- `src/main/machines/remote-smoke.ts`, `src/main/sessions/core.ts`, `src/renderer/machines/presentation.ts`,
  `src/main/machines/remote-scripts.ts`, `src/main/machines/remote-sessions.ts`,
  `src/renderer/scm/ScmSection.tsx` and `src/main/machines/ipc.ts`. Only their size, their churn and
  their export counts were measured. Two of them read as single purpose from the outside, being
  `remote-smoke.ts` with 1 export and 1 importer, and `machines/ipc.ts` with 1 export, 1 importer and
  37 handler registrations. Neither was read end to end and neither is ruled on here.
