# 93. Phase 234, starting measurements

The measure step for Phase 234, Architecture on a machine. Written 2026-09-08 against the tree at
`f57f697b`, which is the parent every number here was read at. The charter is the Phase 234 entry in
docs/BACKLOG.md and research 85 section 2 new gap 1 and section 7 phase six. Nothing here was built.
The tree was read, the far side was driven once under Phase 224's bounds, and the gates the charter
names were run to log files.

Everything under `.p234/` in this tree is this step's own: the probe that took the parent reading,
the far side fixture it wrote and removed, the report and the one photograph it kept, and the eight
gate logs.

## 1. The answer first

The defect is exactly what the charter says and it is smaller on the face than research 85
described, because Phase 228 already took the sentence off. On a tab whose folder is on his Mac Pro
the Architecture view draws the word ARCHITECTURE and nothing else: 12 characters of pane text, 0
reading rows, no subject, no repository line, no model slot, no contract, stable at 0.5, 2, 5, 10
and 15 seconds after the rail press, with both header actions disabled, the map control titled "The
map works on this Mac only" and the re-read control carrying the local title. The local tab holding
the SAME repository drew 5 rows, the line "31 files, mostly TypeScript; 5 parts, the biggest src/core
(19%); 2 connections between parts; 7 of 7 imports lead inside the repository." and read the contract
on disk, including dropping the hostile component whole. That pair, 0 rows against 5 and 12
characters against 1,719, is the number the phase must move, and the probe that took it is
`.p224`-shaped and re-runnable.

Four things in the charter have drifted from the tree and the builder must not follow them
literally, listed in section 2: `ArchView.tsx:182` no longer draws a sentence, `machines:readFile`
does not exist, `src/main/arch/map.ts` is a pure composer and cannot hold the machine arm, and the
reading gate's three fixtures are JSON data rather than trees, so "run them through the remote arm by
ssh" needs a materialiser nobody has written.

## 2. The charter's citations, checked against the tree

| Charter says | Tree at `f57f697b` | Drift |
|---|---|---|
| "Architecture draws one sentence on a remote tab and nothing else" | Since `c75be4cb` (Phase 228, fix round finding 3) `ArchView.tsx:209` returns `null` when `status === 'elsewhere'`; `ARCH_ELSEWHERE` was deleted from `src/renderer/arch/copy.ts`. The pane draws its header and nothing under it. Measured: 12 characters of text, which is the header word | The sentence is gone. The defect is the empty pane and the two disabled controls, not a sentence |
| `src/renderer/arch/ArchView.tsx:182` reads `localPathOf(target)` | Line 181 now: `const repoPath = target === null ? null : localPathOf(target);`. The store's own read is `src/renderer/arch/state/document-actions.ts:88-96`, where `refresh()` sets `status: 'elsewhere'` when `localPathOf(target)` is null and never calls `api.load` | Off by one line; the load-refusal lives in the store, not the view |
| "main is never asked" | True. `document-actions.ts:95` returns before `archBridge()`; the B2 log holds no far side script for the arch view | Holds |
| "no architecture script among the 25" | `REMOTE_SCRIPTS` at `src/main/machines/remote-scripts.ts:2715` holds 25 ids, `machine-facts` through `git-commit`; none reads a tree for imports or a `docs/arch/` | Holds |
| "`src/main/arch/` never names a machine id" | `grep machine src/main/arch/` finds prose only, at `load.ts:90`, `schema.ts:5`, `map.ts:14,23`, `payload.ts:17,68`, `check-coordinator.ts:642`. No `machineId` anywhere | Holds |
| "a machine arm in `src/main/arch/map.ts` that composes the same `ArchLoad` from far-side answers" | `map.ts` is the level 1 map composer, pure by its own header: "No clock, no random, no file read, no process, no store". `ArchLoadResult` is composed by `readArch` in `src/main/arch/check-coordinator.ts:147-201`, and the facts by `runOneCheck` (`:238-397`) and `scanFactsOnly` (`:411-475`) | The arm belongs in the coordinator, or a sibling of it, and `map.ts` stays pure or `conformance:arch` rule 5 goes red |
| "`docs/arch/` on that machine is read through `machines:readFile`" | No such channel. The 37 `machines:` channels are at `docs/audits/contract-baseline.txt:118-154`. The one far side file read is `machines:reviewFile`, which runs `review-file` (`remote-scripts.ts:2764`) and answers the HEAD copy and the working copy of ONE path under a byte cap per side; the `store-head` and `store-copy` scripts read one file's first bytes for the image path | A new read script or a new use of `review-file` is needed; the channel name in the charter names nothing |
| "The checkers under `src/main/arch/` take an injected git seam and read files" | True. `createArchGitRunner` in `git-facts.ts:52` wraps `runGit`; `loadArchDocument` takes an `ArchFileSystem` (`load.ts:68`) with `readFile` and `readDir`; `readArchTreeFacts` (`tree-facts.ts:93`) and `scanArchImports` (`scan.ts:176`) read the working tree directly with `node:fs` | Holds for the contract read and the git calls. The scan and the tree facts are NOT behind a seam; they `statSync` and `readFile` absolute paths |
| "the model slot ... is LOCAL and is fed the far-side facts" | The slot is `[data-slot="arch-reading-model"]` in `ArchDrill.tsx:170`; on the local face it read "No model reading yet." with 0 buttons | Holds; nothing to move |
| `conformance:reading` "must stay green and gain remote arms" | The gate is classified `pure` at `build/verification-checks.mjs:152` and its header says "IT SPAWNS ONE PLAIN NODE and nothing else. No git, no Electron, no tmux". Its fixtures are `build/fixtures/reading/{gmux,cargo,clients}.json`, each a JSON bag of `trackedFiles`, `imports`, `treeFacts` and `definitions`, not a directory | A remote arm that goes by ssh cannot live inside a `pure` commit gate. It belongs in a probe like `build/probe-p201-reading.mjs`, and the fixtures must be materialised as real trees before ssh can read them |
| `conformance:arch` "first claim extended to the machine arm" | Rule 1 scans every recorded `ArchGitCall` argv for the fixture's hostile strings, over an injected git seam (`build/conformance-arch.mjs` header). The record is `record: ArchGitCall[]` in `check-coordinator.ts:267` | Extends cleanly IF the remote arm records what it sends the same way; a far side script is one command line and its args are the thing to scan |

Two more facts the charter does not state and the builder needs.

**The store and the watch are keyed by a local path.** `archRepoKey` at `src/main/arch/db.ts:82`
is `statSync(repoPath)` then `dev:ino`, falling back to `path:<repoPath>` only when the stat throws.
Both his machines put his home at `/Users/gdc` (research 85 section 2). A remote folder whose path
also exists on this Mac would therefore be keyed to the LOCAL directory's inode and share its fact
rows, its verdicts and its `lastValid` document. `watchArchRepo(repoPath)` at `watch.ts:116` arms an
FSEvents stream on that same string. The remote arm must key on the target, machine id and path,
the way `targetKey` in `src/shared/workspace-target.ts` does for the Context store, and must never
arm the watch.

**The scan reads every parseable file's bytes.** `scanArchImports` walks the tracked list, stats
each file (`scan.ts:220`) and parses the stale ones with the resolver, up to `ARCH_SCAN_FILE_CEILING`
= 50,000. `readArchTreeFacts` reads each file up to `MAX_READ_BYTES` for its line count and declared
name. A remote arm needs the CONTENTS of the tracked source files, not their names. On the 26 file
fixture that is trivial; on his real repositories it is the bulk content door research 57 refused
for Symbols. The far side answer per script is one argument of the far login shell, capped at
4,194,304 bytes by `repo-files` and 90,000 by `review-file`. The builder has to choose between
sending the parse to the machine, which is a process on the machine and is refused, or reading the
bytes across in pages under the existing cap, and the entry does not decide this. Whatever is chosen
is the phase's ceiling and belongs on the face as a disabled action's label, never a paragraph.

## 3. The data flow, ten lines

1. `ArchView` → `targetOfProject(project)` → `syncProject(target)` (`document-actions.ts:54`).
2. `refresh()` → `localPathOf(target)`; null → `status: 'elsewhere'`, return. **Nothing crosses.**
3. Local: `archBridge().load({ cwd })` → `arch:load` → `checks.load` = `readArch` (coordinator `:147`).
4. `readArch` → `watchArchRepo(cwd)`; `loadArchDocument(createArchFileSystem(cwd))` reads `docs/arch/` with `node:fs`.
5. First load schedules `requestArchCheck` → `runOneCheck` (contract) or `scanFactsOnly` (none).
6. Both: `git ls-files -z` through `createArchGitRunner(cwd)` → `runGit(cwd, argv)`, argv from `argv-guard.ts`.
7. `scanArchImports` stats and parses each tracked file with `node:fs`; `readArchTreeFacts` reads lines and declared names; rows land in the SQLite `ArchStore` keyed by `archRepoKey(cwd)`.
8. Contract path adds `rev-parse HEAD`, `cat-file --batch`, `log --name-only`, `status --porcelain` via `gatherFacts` (`run.ts:116-154`), then `runCheckers`.
9. `arch:map` → `archMapReadFacts(cwd)` → `composeArchMap` (pure, `map.ts`) → boxes, sentences via `readingFacts` and `sentenceOf`; `arch:mapUpdated` is pushed when the scan lands.
10. Renderer draws rows from `[data-slot="arch-reading"] li[data-group]`, the model slot, then the contract cockpit; the header's two actions read `repoPath !== null` and `status !== 'elsewhere'`.

The remote arm has to enter at line 2 with a machine target, replace lines 4, 6 and 7 with far side
reads through `runRemoteRead` (`remote-run.ts:206`), and leave lines 8 to 10 exactly as they are.
The Context view is the sibling that already did this: `src/renderer/context/store.ts:246-292`
branches on `localPathOf` and calls `machines.readContext`, `src/main/machines/ipc.ts:1638` handles
it, `src/main/machines/remote-agent-context.ts:352` runs the script and parses, `src/shared/ipc/machines/context.ts:123`
declares the channel and `src/preload/machines.ts:163` exposes it.

## 4. The .p224 probes, and what the verifier can re-run

All under `.p224/` in this tree, copied from Phase 224's worktree.

| Probe | What it took | Re-runnable for the parent of THIS phase? |
|---|---|---|
| `probe-p224.mjs` launch A | confirms the machine in a scratch profile, turns Architecture on in Settings | Yes, whole. This step's `.p234/probe-p234-parent.mjs` launch A is a copy with the writes block and the blackhole row removed |
| `probe-p224.mjs` launch B2 with `driver.mjs` `driveView('Architecture', ...)` | first change, first content, settle and `finalText` of the sidebar per view on the remote and local tabs; the Architecture row of research 85 section 3.1 | The Architecture cell only, and its `finalText` on the remote side is stale: it read the Phase 228 sentence, which the tree no longer draws. The selector `'.arch-row, [data-arch-row], .arch-part'` matches nothing on the current reading either, so `contentRows` was 0 on BOTH sides in `.p224/results/p224-run-65838.json`; the local reading was proved by `finalText` alone |
| `probe-p224-local.mjs` `archFill` (`:453-465`) | the local reading FILLING, gated on `[data-slot="arch-reading-repo"] .rd-line` not starting with `0 files`; the 38 ms | Yes, unchanged; it is the local half of the parity pair |
| `far-fixture.mjs` | the 26 file scratch repository with three commits, a side branch and two untracked files, made and removed under `~/tortie-p224-scratch-<pid>` | Yes. `.p234/far-fixture.mjs` is the same shape with a `docs/arch/` added, four components of which one is hostile, one edge, an empty baseline, and imports from `src/ui` into `src/core` and from `tests` into `src/core`, so the local reading has connections to count |
| `far-final.mjs` | the closing census, processes, sessions, scratch dirs, sockets, `~/.ssh` mtimes | Yes, whole, and the verifier should run it last |
| `far-sockets-remove.mjs` | removed the ten dead `gmux-p224*` sockets | Not needed if every run unlinks its own, which `.p234/probe-p234-parent.mjs` does; run it only against a `gmux-p234` prefix if a run dies before its `finally` |
| `blackhole.mjs`, `probe-p224b/c/d/e/f.mjs` | disconnected tab, boot comparison, write controls, trees, watcher | Not this phase's subject |

What the verifier should re-run, in order: `.p234/probe-p234-parent.mjs` at the parent to see 0
rows and at HEAD to see the same rows the local side draws; `build/probe-p201-reading.mjs`'s
`PANE_READ` and `FILLED` expressions (`:196-260`) against the remote tab, because that is the read
the reading's own gate trusts and it carries the ten hover facts per row; and `far-final.mjs`.

## 5. The parent reading

Taken 2026-09-08 by `.p234/probe-p234-parent.mjs` on his Mac Pro at `gregs-mac-pro.tail2ddfe1.ts.net`,
three Electrons one after the other on the scratch profile `/private/tmp/p234-run-59382/profile` and
the scratch socket `gmux-p234-59382`, the report at `.p234/results/p234-parent-run-59382.json` and the
photograph at `.p234/results/B2-faces.png`. The far fixture was `/Users/gdc/tortie-p234-scratch-59382`
and the local one `/private/tmp/p234-run-59382/local-fixture`, both made by the same script and both
reading `commits=3 dirty=4 files=33 tracked=31 branches=2`. Sign in took 246 ms, `machines.prepare`
answered `prepared`, "This machine is ready.", in 1,884 ms.

### The remote face

| Reading | Value |
|---|---|
| pane text | `ARCHITECTURE`, 12 characters |
| pane children | 2, the header and nothing drawn under it |
| reading rows `[data-slot="arch-reading"] li[data-group]` | 0 at 500, 2,000, 5,000, 10,000 and 15,000 ms |
| subject, repository line, model slot | absent, absent, absent |
| Components section, Contract section | absent, absent |
| header action 1 | "Open the map", disabled, title "The map works on this Mac only" |
| header action 2 | "Read the code again", disabled, title identical to the local one |
| sidebar text | `ARCHITECTURE` |
| far side scripts the view sent | none; the B2 log holds no `[gmux-remote]` line for it |

Read again after the local face had filled: identical, 12 characters, 0 rows, both controls
disabled.

### The local face, the same repository

| Reading | Value |
|---|---|
| filled | at the first sample after the rail press |
| subject | `p234-fixture` |
| repository line | `31 files, mostly TypeScript; 5 parts, the biggest src/core (19%); 2 connections between parts; 7 of 7 imports lead inside the repository.` |
| model slot | `No model reading yet.`, 0 buttons |
| rows | 5: `other` "everything else" 42%, `src-core` "core" 19%, `src-ui` "ui" 19%, `lib` 16%, `tests` 3% |
| row sentence, core | `6 files, TypeScript; made of core1, core2, core3, core4, core5 and 1 more; used by src/ui and tests; uses no other part.` |
| row sentence, ui | `6 files, TypeScript; made of panel1, panel2, panel3, panel4, panel5 and 1 more; uses src/core; no other part uses it.` |
| row sentence, lib | `5 files, TypeScript; made of helper1, helper2, helper3, helper4, helper5; imports no other part and none imports it.` |
| row sentence, tests | `1 file, TypeScript; made of core.test; uses src/core; no other part uses it.` |
| row sentence, other | `13 files, mostly JSON; 1 small folder (docs) and 3 root files; not code.` |
| hover facts per row | 6, 5, 5, 4, 5 |
| contract | read: "5 checks hold, none a promise", "1 broke" at `component:core#boundary` over the six `src/ui/panelN.tsx` imports, "2 files would not load", being the hostile component and its planted field, and "1 of 3 parts have had code land under them since the contract last changed" |
| header action 1 | "Open the map", enabled, "Draws this repository as a small map in a full size tab..." |
| header action 2 | "Read the code again", enabled |
| pane text | 1,719 characters |

Every sentence above is a pin for the parity proof: at HEAD the remote face must draw these five
rows with these sentences and these facts, the same line, and the same contract verdicts, from the
same repository on his machine.

### Words on the remote face that are not on the local one

None. The remote pane's whole text is the header word. The one difference is a disabled action's
title, "The map works on this Mac only", seven words, which is the shape the operator's rule allows.
At HEAD the map control must be enabled on the remote tab or keep a label of that size; the entry
also allows one short label saying the model's answer is about that folder, and nothing else.

### The bounds ledger for this run

| Fact | Before | After |
|---|---|---|
| far `-L gmux` sessions | `gmux-control`, created 1787879931, attached 1 | the same, still attached |
| far tmux processes | 4 | 4 |
| far `/private/tmp/tmux-501` | `gmux gmux-p230-47909` | `gmux gmux-p230-47909`; this run's `gmux-p234-59382` was killed and UNLINKED in the `finally` |
| far `~/tortie-p234-scratch-*`, `~/tortie*` | none | none; teardown answered GONE |
| local `-L gmux` sessions | 14 | 14, listed only |
| local `/private/tmp/tmux-501` | `gmux gmux-p230-47909` | the same; `gmux-p234-59382` UNLINKED after `lsof` found no holder |
| Tortie's record file, `~/.ssh/known_hosts` | 113 bytes, 2,215 bytes | 113 bytes, 2,215 bytes, unmoved |
| ssh agent | no identities | no identities |
| his machines.json, his profile | not opened | not opened |
| token spent, agent started | none | none |

`gmux-p230-47909` on both sides belongs to Phase 230's run, which was live during this step, and it
was left alone. An earlier `gmux-p230-24189` on this Mac was held by a live tmux, pid 28229, when
this step began and was gone before the run; neither was touched. The far tmux process count of 4
against research 85's 2 is that same run's server and client.

## 6. The gates at the parent

All eight run to log files under `.p234/logs/`, none piped through `tail`.

| Gate | Log | Result |
|---|---|---|
| `npm run typecheck` | `parent-typecheck.log` | exit 0 |
| `npm run build` | `parent-build.log` | exit 0; contract inventory byte for byte the baseline |
| `npm run smoke:t1` | `parent-smoke-t1.log` | 6/6, exit 0 |
| `npm run conformance:arch` | `parent-conformance-arch.log` | PASS, exit 0 |
| `npm run conformance:reading` | `parent-conformance-reading.log` | OK, 19 ablations each red, exit 0 |
| `npm run conformance:machines` | `parent-conformance-machines.log` | PASS, exit 0 |
| `npm run conformance:remoteclose` | `parent-conformance-remoteclose.log` | exit 0 |
| `npm run gate:knownhosts` | `parent-gate-knownhosts.log` | 19 scripts reach the helper, 36 fixtures, exit 0 |

## 7. The smallest set of files, and where a rebase will fight

### The builder touches

| File | Why |
|---|---|
| `src/main/machines/remote-scripts.ts` | the read scripts: one for the tracked list with `ls-files -z` semantics plus `rev-parse HEAD`, one for file contents in pages under the 4,194,304 byte answer cap with each path guarded like `review-file`'s `case "$2" in /*\|*..*) exit 1;; esac`, and the `docs/arch/` read, which is a directory listing plus the same content read; every id `mode: 'read'`; `ALLOWED_WRITERS` does not grow |
| a NEW `src/main/machines/remote-arch.ts` | the runner and parser beside `remote-agent-context.ts`, because `MODULE_FACT` in `liveness.ts:194` pins which module asks which question; it asks the link, and it records every argument it sends so `conformance:arch` rule 1 can scan them |
| `src/main/arch/check-coordinator.ts`, or a sibling `remote-load.ts` under `src/main/arch/` | the machine arm composing `ArchLoadResult` and the map compose inputs from far side answers, keyed by target rather than by `archRepoKey(cwd)`, never calling `watchArchRepo`; `map.ts` untouched |
| `src/main/arch/load.ts` | an `ArchFileSystem` over the far side read; the interface at `:68` already has the shape |
| `src/shared/ipc/arch.ts` | `ArchRepoInput` (`:88`) and `ArchMapInput` gain an optional `machineId`, or a new `machines:readArch` channel is declared under `src/shared/ipc/machines/`; one baseline line per channel |
| `src/preload/machines.ts` or `src/preload/arch.ts` | one line per channel |
| `src/main/machines/ipc.ts` or `src/main/arch/ipc.ts` | the handler |
| `src/main/machines/liveness.ts` | a `CHANNEL_FACT` row per new channel, `'link'` |
| `src/main/machines/__tests__/p231-liveness.test.ts` | `:168` pins 21 channels and `CHANNEL_MODULE` names each handler module; both move |
| `src/renderer/arch/state/document-actions.ts` | `refresh()` `:88-96` and `check()` take the machine branch instead of `'elsewhere'` |
| `src/renderer/arch/ArchView.tsx`, `ArchHeader.tsx` | `repoPath` (`:181`, `:115`) becomes a target key so the drill map and the map tab key a remote repository; `canDraw`, `canCheck` and `onMachine` at `ArchHeader.tsx:128-131` |
| `src/renderer/arch/state/map-actions.ts` | `drills[repoPath]` at `:196,:232` keyed by the same target key |
| `src/renderer/arch/copy.ts` | `ARCH_MAP_ON_THIS_MAC` (`:56`) goes if the map draws, and the one short model label the entry allows; nothing else |
| `build/conformance-machines.mjs` | `REMOTE_SCRIPT_COUNT` 25 → 25 plus the new ids at `:2926`; the new ids classified as reads by condition 35's walk |
| `src/main/machines/__tests__/remote-scripts.test.ts` | `:146` "holds twenty five scripts" moves with it |
| `docs/audits/contract-baseline.txt` | regenerated with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`; the commit body names the line(s) |
| `build/conformance-arch.mjs` | rule 1 extended to the recorded far side arguments; the hostile plant from `.p234/far-fixture.mjs`'s `hostile.json` is the same shape as `bad-lead-anchor.json` and `extra-field.json` |
| a NEW probe under `build/` for the app run and the by-ssh reading arm | `HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` rises in the same commit; the far socket is unlinked in its `finally` |
| `src/renderer/arch/__tests__/p201-reading.test.tsx` and `src/renderer/machines/__tests__/p228-off-the-face.test.ts` | the first pins the label on the machine header and must move with it; the second must stay green, so no sentence with the forbidden words returns |

### Where another phase in flight is likely to touch the same lines

- **Phase 233**, `/private/tmp/wt-p233` at `d92f1e96`, one research commit above `4bd24042`, at its
  measure step and NOT landed. Its own file list (research 92 section 6) names `remote-scripts.ts`
  (one new read script appended to the catalogue tail), `build/conformance-machines.mjs`
  (`REMOTE_SCRIPT_COUNT` 25 → 26 at `:2926`), `docs/audits/contract-baseline.txt` (regenerated),
  `src/main/machines/ipc.ts` (a handler beside `machines:readHistory`), `src/preload/machines.ts`
  and `src/shared/ipc/machines/scm.ts`. Every one of those meets this phase at the SAME lines: both
  append to the end of `REMOTE_SCRIPTS`, both bump the one integer, both add a `CHANNEL_FACT` row and
  move the 21 in `p231-liveness.test.ts:168`, and both regenerate the baseline. Whichever lands
  second rebases the catalogue tail, the count and the baseline by hand, and the count must equal the
  catalogue rather than either phase's arithmetic. Phase 233's renderer files, `RemoteHistorySection.tsx`,
  `remote-history.ts`, `use-tree-model.ts`, `use-tree-drag.ts` and `tree-ops.ts`, do not meet this
  phase.
- **Phases 225, 226 and 227** landed at `4860380`, `df8046cc` and `f76bbda`; the redline files do not
  meet this phase. The only shared surface is `build/` for `gate:knownhosts`, `gate:electron` and
  `gate:background`, and `HELPER_USER_FLOOR` if both add a probe under `build/`.
- **Phases 228 to 232** are all in this tree. Nothing else is in flight on `src/main/arch/` or
  `src/renderer/arch/`; the last commit to either is `c75be4cb` (Phase 228).
- **Phase 235**, the nits round, is queued and not started; item 5 touches the new-session grid and
  items 1 and 2 `EditorTabs.tsx`, none of which this phase names.

## 8. What was not measured

- The far side cost of the reads the phase must add. The parent sends nothing for this view, so
  there is no link timing to move; the first reading at HEAD is the number.
- A repository larger than 31 tracked files on the far side. The ceiling the content read must
  carry, and what the face says when it is hit, are the builder's to choose and the verifier's to
  drive.
- The model slot with an agent chosen. The scratch profile names no agent, so "No model reading
  yet." is the only state read; the entry says the slot stays local and the run spent no token.
- A Linux far side. One arm64 Mac over Tailscale, as in research 85.
- The `conformance:reading` fixtures as real trees. Independent method one needs `gmux.json`,
  `cargo.json` and `clients.json` materialised from their `trackedFiles`, `imports` and `treeFacts` on
  the far side before ssh can read them, and the shipping `reading-conformance-probe.mts` composes
  from the JSON, not from files. That materialiser does not exist and this step did not write it.
