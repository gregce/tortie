# Research 89: Phase 230, the starting measurements

**Date.** 2026-09-08. **Tree.** `/private/tmp/wt-p230` detached at `41405d7`, which is the tip of
`main` after Phase 228 landed. **Machine.** The operator's Mac Pro, `gregs-mac-pro.tail2ddfe1.ts.net`,
under Phase 224's bounds plus the socket unlink Phase 228's committer added. **Phase.** 230, nothing
stays stale. **Charter.** `docs/BACKLOG.md` "Phase 230 — a remote view re-reads by itself, and the
stale sentence goes" and research 85 sections 4.1, 3.2 and 7 phase two.

This is the measure step. It built nothing. It re-read every file and line the charter cites, drew
the data flow of the surfaces the phase touches, said which of research 85's probes take the parent
reading, took that reading on his Mac Pro, ran the gates the charter names at the parent, and named
the files the builder touches and where a rebase can conflict.

## 1. The answer first

**The number the phase must move is a set of NULLS.** With the Mac Pro answering, on the parent:

| view, after the link came up with no press | parent | what the charter wants |
|---|---|---|
| Source control, Changes group | first row **100 ms** after `connected` (Phase 90.3's one retry) | unchanged |
| Source control, History group | "Tortie is not connected to Greg's Mac Pro, so it could not read the history." still on screen **30,011 ms** after `connected` | rows, with no press |
| Source control, Branch group | the same sentence for the branch at **30,011 ms** | rows |
| Source control, Runs group | the same sentence at **30,011 ms**, and it is the BRANCH sentence, because `runsNotConnected` is `branchNotConnected` (`machines/runs.ts:108`) | the group re-reads, answers `notGitHub` on this fixture and disappears, the way the local section is absent |
| Context | "Tortie is not connected to Greg's Mac Pro, so it read nothing." at **45,684 ms** after `connected`, looked at again with the link up | rows |
| Search | "Tortie is not connected to Greg's Mac Pro, so it searched nothing." at **61,078 ms** after `connected` with the query still in the box; a NEW query typed at that moment answered **6 results in 608 ms**, so the machine was answering the whole time | the held query re-runs |
| Explorer | rows at once when looked at again, because its retry is per mount (`FilesSection.tsx:244`) | unchanged, and the clock under it comes off |
| a file written by Tortie's own door (`putFile`, `wrote` in 93 ms) | Source control: **not in 30 s**; after a synthetic window focus: **no**; after a tab switch away and back: **no**; Explorer looked at afterwards: **no**. `Refresh changes` showed it in **204 ms**, `Refresh files` in **102 ms** | both views show it with no press |
| the same on the local tab (`fs.createFile`) | in the Source control view in **613 ms** with no press | the number beside the remote one |
| the Explorer row for `NOTES-untracked.md` | remote: `data-item-git-status` **null** on all nine rows, no U; local: `untracked`, drawn with a U | the remote row carries the U from `remote-changes.ts` |
| refresh controls on Source control | remote **5**, local **2** | 2 |

Every remote view but Changes and the Explorer keeps a false sentence on screen with the link up,
which is research 85 §4.1 restated with the link's own clock beside it, and nothing at all re-reads
after a write, a focus or a tab switch. The link's transition itself is what a person cannot see:
`linkAtStart` read `quiet`, and it read `connected` **20,403 ms** after the driver began, because the
blackhole row was walked first.

Three things the re-read found that the charter does not say, each in section 2 or 8: the decoration
guard is at `Sidebar.tsx:323` and there is a SECOND one at `FilesSection.tsx:417`; local has THREE
refresh labels in the source and two on this fixture; and after a write only the verb's own store
re-reads today, so the write moment is a new fan-out and not a wiring.

## 2. The charter's citations, re-read against `41405d7`

Every file and line the Phase 230 entry names, read again in this tree, with what it says now.

| the entry says | the tree at `41405d7` | drift |
|---|---|---|
| `machineAnswering` at `src/renderer/state/machines-slice.ts:147` | `export function machineAnswering(` is line 147; answers true for `connected` and `polling` and nothing else | none |
| consumed at `src/renderer/tree/FilesSection.tsx:233` | the call is at line 239, inside the `useMemo` at 237; the effect that spends the one retry runs 244 to 265 | six lines, same code |
| the eight lines at `FilesSection.tsx:225-250` | the `remoteAnswering` memo and the `retried` ref start at 237, the effect at 244 and ends at 265; the comment above it runs 215 to 236 | the block is 237 to 265 |
| consumed at `src/renderer/scm/ScmSection.tsx:795` | TWO call sites: 780, which Phase 229 added for the commit box's identity precheck, and 1144, which is the Phase 90.3 retry the entry means; the retry effect is 1147 to 1167 | the line moved to 1144 and there is a second consumer the entry does not name |
| the 11.5 s measurement at `ScmSection.tsx:1059` | the sentence is at 1134, in the comment above the retry | moved |
| `src/renderer/scm/RemoteRunsSection.tsx:58` records the decision | "There is no automatic second read when a machine starts answering" is line 58, the paragraph runs to 64 | none |
| `src/renderer/app/Sidebar.tsx:344` returns null whenever the target has no local path | line 344 is `const windowWidth = useWindowWidth();`. The decoration source is the `scmStatusFiles` selector at 318 to 326, whose `if (localRepoPath === null) return null;` is line 323. And it is not the only guard: `src/renderer/tree/FilesSection.tsx:410-421` builds the remote `FileTree` with `statusFiles={[]}` and `isRepo={false}` whatever the sidebar passes, so a remote tree is undecorated twice | the line is 323, and the entry names one guard where the tree has two |
| `src/renderer/scm/remote-changes.ts` holds the tracked and untracked lists keyed by machine and path | `files` at 157 and `untracked` at 161 on the entry, keyed by `targetKey` (`<machineId>:<path>`), each row a `MachineReviewFile` with `path`, `origPath`, `status`, `indexState`, `worktreeState` (`src/shared/ipc/machines/scm.ts:70-93`) | none |
| the "no timer" statement at `remote-changes.ts:65` and `presentation.ts:55` | "NO TIMER, ANYWHERE" is the paragraph at 65 to 71 of `remote-changes.ts`; `presentation.ts` 53 to 67 is the `remoteReadAt` doc comment, which says in capitals that Phase 230 removes it and `machineReadAt` | none |
| History, Branch, Runs, Context and Search do not subscribe | `grep machineAnswering src/renderer` finds `FilesSection.tsx`, `ScmSection.tsx` and the slice, nothing else; `RemoteHistorySection.tsx:480`, `RemoteBranchSection.tsx:351` and `RemoteRunsSection.tsx` read on `!collapsed && available` and at no other moment; `search/store.ts` reads on a query; `context/store.ts` reads on target | none |
| the five remote refresh buttons against local's two | remote Source control: `Read what changed on that machine again` (`BranchHeader.tsx:366`), `Refresh changes` (`ScmSection.tsx:1510`), `Refresh history` (`RemoteHistorySection.tsx:409`), `Refresh branch` (`RemoteBranchSection.tsx:295`), `Refresh runs` (`RemoteRunsSection.tsx:248`). Local: `Refresh git status` (`BranchHeader.tsx:548`), `Refresh branches` (`BranchesView.tsx:460`), AND `Refresh runs` (`RunsSection.tsx:149`), which is drawn only for a repository with a GitHub origin | local has THREE labels in the source and two on this fixture, because the fixture has no GitHub origin; the count of "two" is a reading of the face, not of the code |
| the read-at clock Phase 228 left | `remoteReadAt` drawn at `ScmSection.tsx:1541` and as the `<TIME>` span plus hover at `BranchHeader.tsx:359-360,369`; `machineReadAt` under each expanded group at `RemoteHistorySection.tsx:435`, `RemoteBranchSection.tsx:315`, `RemoteRunsSection.tsx:279` (through `runsReadAt`); the Explorer's `remoteTreeReadAt` is an alias in `machines/explorer.ts:21` | none, and the alias means the Explorer's line comes off with the same edit |
| the write verbs answer `wrote`, `made`, `moved`, `done` | `putFile` → `wrote` read at `editor/tab-io.ts:519`; `makeDir` → `made` and `renameEntry` → `moved`/`done` read at `tree/tree-ops.ts:495,518`; stage, unstage and commit re-read the Changes group inside `remote-changes.ts:639-660` already | none |

Two other things the re-read found that the entry does not say and the builder needs:

- **After a write, only the verb's own store re-reads today.** `use-tree-rename.ts:119,142` calls the tree's `refreshLoaded()` after a create, a folder or a rename, so the Explorer already re-reads after ITS OWN write; `remote-changes.ts` re-reads Changes after stage, unstage and commit; and the editor's save (`tab-io.ts:519`) re-reads nothing anywhere. There is no bus a remote write lands on, the way `onRepoChanged` in `state/repo-changed.ts` is the local one. Mechanism item 2 is therefore a new fan-out, not a wiring.
- **Nothing in the renderer listens to window focus for a remote view.** `grep "addEventListener('focus'"` under `src/renderer` finds `settings/SpecStorySection.tsx:560` and `state/usage.ts:158`, and `visibilitychange` in `AppearanceSection`, `modifier-held.ts` and `DiagnosticsTab`. The focus moment in item 2 is new code.

## 3. The data flow of the surfaces this phase touches, in ten lines

```
main: signInToConfirmedMachines (core.ts:1063) walks confirmed rows ONE AT A TIME; each prepareMachine
  ├─ sets the link fact; EVT 'machines:stateChanged' → renderer machines-slice.machineStates[]
  │     └─ machineAnswering(states, id) = link ∈ {connected, polling}         (machines-slice.ts:147)
  ├─ Explorer   tree/store.ts  ← machines:listTree   read on target; ONE retry when answering flips true   (FilesSection.tsx:237-265)
  ├─ Changes    scm/remote-changes.ts ← machines:reviewFiles  read on target + after stage/unstage/commit; ONE retry (ScmSection.tsx:1144-1167)
  ├─ History    scm/remote-history.ts ← machines:readHistory  read on first expand only            (RemoteHistorySection.tsx:480)
  ├─ Branch     scm/remote-branch.ts  ← machines:readBranch   read on first expand only, plus Phase 229's precheck (ScmSection.tsx:780-799)
  ├─ Runs       scm/remote-runs.ts    ← machines:readRuns     read on first expand only            (RemoteRunsSection.tsx:58 says so)
  ├─ Search     search/store.ts       ← machines:searchContent read on a query, one answer, no stream (store.ts:373-435)
  ├─ Context    context/store.ts      ← machines:readContext  read on target                       (store.ts:230-275)
  └─ Decorations: Sidebar.tsx:323 hands the tree null for a remote target, and FilesSection.tsx:417 hands FileTree statusFiles={[]};
      the rows Pierre would paint as data-item-git-status come from use-tree-model.ts:365 treeGitLane(statusFiles) and never see remote-changes.ts
```

The writes: `putFile` (editor save, Explorer new file), `makeDir`, `renameEntry` (Explorer), `stage`/`unstage`/`commit` (Changes rows and box) all go renderer → preload → `machines:*` → `runRemoteScript` → ssh. None of them announces itself to any store but the one that issued it.
## 4. The parent reading on his Mac Pro

`.p230/probe-p230-parent.mjs`, report `.p230/report-parent.json`, log `.p230/logs/parent-run.log`,
run directory `/private/tmp/p230-measure-parent-88805`. ONE scratch profile, FOUR Electrons one
after the other and never at once, all through `build/electron-run.mjs` with `tmuxSocket` set so the
helper ends the local scratch server; every ssh through `build/ssh-run.mjs` by way of
`build/real-machine.mjs`; the far fixture `.p230/far-fixture.mjs` under
`/Users/gdc/tortie-p230-scratch-88805`, 26 files, 3 commits, 4 dirty, 2 branches, removed in the
`finally`; the far scratch server on `gmux-p230-88805` killed and its socket UNLINKED in the same
`finally`, and the local `/private/tmp/tmux-501/gmux-p230-88805` unlinked after `lsof -U` named no
holder. No agent, no token, no keychain, no `-g`, no `-w`.

### 4.1 How the machine was made DOWN, then UP, on real hardware

The charter says "open a remote tab with the machine DOWN (a second scratch machine row at 192.0.2.1,
the way `.p224/blackhole.mjs` did), read the sentence, bring the real machine up". The way this step
read that: the scratch `machines.json` holds the blackhole row FIRST and the Mac Pro SECOND, both
confirmed. `signInToConfirmedMachines` (`src/main/sessions/core.ts:1063`) walks them one at a time,
and the blackhole's two version reads hold the Mac Pro's sign-in behind them for about twenty
seconds (research 85 §4.2). So on this boot the Mac Pro is DOWN as far as every renderer store knows,
the tab is opened and every view read in that window, and then the real machine comes up by itself.
Nothing was unplugged and no network was touched. The link read `quiet` when the driver began
(`linkAtStart`) and `connected` at **20,403 ms** (`up.connectedAtMs`), with the driver's own wait
for it **7,882 ms** after the last view was read.

Launch A1 confirmed the Mac Pro row alone and allowed writes under the scratch root through the
settings window's own controls (`open-writes`, `write-root`, `allow-writes`). Launch A2 rewrote the
file with the blackhole first and the Mac Pro row READ BACK from what A1 left, because `writeRoot`
is the sixth execution bearing field of the confirm hash (`src/main/machines/confirm.ts:36`) and
lives in the row (`store.ts:391`); the first run of this probe rewrote the row from a constant, the
hash moved, the row read unconfirmed with `confirmButtons: 2`, the fresh confirm bound a row with no
root, and `putFile` answered `writesOff`. That run is kept as
`.p230/report-parent-run1-writeroot-lost.json` and its stale readings agree with run 2 to the
millisecond class; only its write leg is void. Run 2's A2 read `confirmButtons: 1` and the Mac Pro
row confirmed with its root. Launch B1 prepared the Mac Pro and registered the two projects. Launch
B2 is the reading.

### 4.2 What every view said while the machine was down

Read off `[data-slot="sidebar"]` with the link still `quiet`, at the renderer clock since the driver began:

| view | at | on the face |
|---|---|---|
| Explorer | 2,705 ms | "Tortie is not connected to Greg's Mac Pro, so it cannot read that folder." 0 rows |
| Search, `needle-alpha` typed | 6,011 ms | "No results" and "Tortie is not connected to Greg's Mac Pro, so it searched nothing." 0 rows |
| Context | 8,013 ms | "These agent files live on Greg's Mac Pro." then "Tortie is not connected to Greg's Mac Pro, so it read nothing." 0 rows |
| Source control, Changes | 12,521 ms | "Greg's Mac Pro did not answer, so Tortie could not read what changed." 0 rows. NOTE the Changes group says DID NOT ANSWER where every other view says NOT CONNECTED for the same link state, which is research 85 §4.5's third sentence and Phase 231 item 3's label, not this phase's |
| History, expanded by the driver | 12,521 ms | "Tortie is not connected to Greg's Mac Pro, so it could not read the history." |
| Branch, expanded | 12,521 ms | "Tortie is not connected to Greg's Mac Pro, so it could not read the branch." |
| Runs, expanded | 12,521 ms | "Tortie is not connected to Greg's Mac Pro, so it could not read the branch." — the BRANCH sentence, because `runsNotConnected` returns `branchNotConnected` (`src/renderer/machines/runs.ts:108-110`) |

All seven read stale (`down.staleSet` every key true). The Context view also draws "These agent
files live on Greg's Mac Pro." above its sentence; Phase 228's set read Context at 0 remote-only
nodes AFTER a read landed, and this line is the not-connected body, so the verifier should read it
against the local face in the same state before calling it a finding.

### 4.3 What happened when the link came up, with Source control in front and no press

`up.scm.firstRowAfterConnectMs`, sampled every 100 ms for 30 s from the moment `machines.state()`
first answered `connected`:

| group | first row after `connected` | at 30,011 ms |
|---|---|---|
| Changes | **100 ms**, 6 rows (2 modified, 2 untracked, each a Stage button and a row) | rows, with "Read at 03:34. Press Refresh to read it again." under them |
| History | **null** | the not-connected sentence |
| Branch | **null** | the not-connected sentence |
| Runs | **null** | the branch sentence under RUNS |

The face at 30 s therefore carried a Commit box, four changed files and a clock in the top half
and three sentences saying Tortie is not connected in the bottom half, all under one folder name.

Then each view that was not in front, looked at again with the link up:

| view | at once | after waiting | since `connected` |
|---|---|---|---|
| Explorer | 8 rows, "Read at 03:35. Press Refresh to read it again." | — | 30,314 ms |
| Context | the not-connected sentence, 0 rows | still it at 15 s | 45,684 ms |
| Search, `needle-alpha` still in the box | the not-connected sentence, "No results" | still it at 15 s; the same value re-entered is a no-op to React's value tracker so it re-ran nothing; a NEW query `needle-beta` answered **6 results in 6 files in 608 ms** | 61,078 ms |

The Explorer recovers when looked at because its retry effect (`FilesSection.tsx:244-265`) runs on
mount with `remoteAnswering` already true and the held answer `notConnected`; it is not a re-read on
activation and it will not fire a second time on the same mount. Context and Search hold their
answer per target and nothing asks again.

### 4.4 A write by Tortie's own door, timed to the two views

Source control in front, 6 rows drawn, then `machines.putFile({ path: <root>/p230-watch-remote.md,
expect: 'new' })` → `{"outcome":"wrote","bytes":13}` in **93 ms**.

| moment | did `p230-watch-remote` appear? |
|---|---|
| 30 s with no press | **no** (`scmAppearedWithoutPressMs: null`); the face at 30 s is byte for byte the face before the write |
| a synthetic `window` `focus` event and a `visibilitychange`, 5 s | **no** |
| the local tab selected and the remote tab selected again, 5 s | **no** |
| the Explorer looked at, 15 s | **no** (`explorerAtOnce: false`) |
| `Refresh changes` pressed | **204 ms** |
| `Refresh files` pressed | **102 ms** |

Research 85 read never-in-30 s and 203 ms after the press; this step reads the same, and adds that
neither of the two moments the charter names, focus and activation, reads today. The synthetic
focus is a limit: a real focus is a main-side window event, and the verifier's independent method
is the real one. On the local tab, `fs.createFile` under the same fixture appeared in the Source
control view in **613 ms** with no press (research 85: 513 ms).

### 4.5 The Explorer's decorations, remote against local

Every `[role="treeitem"]` under `file-tree-container`'s shadow root, with Pierre's
`data-item-git-status` read off the row or its first descendant carrying it:

| row | remote | local |
|---|---|---|
| `docs`, `lib`, `src`, `tests`, `.gitignore`, `package.json`, `README.md` | null | null |
| `NOTES-untracked.md` | **null, no mark** | **`untracked`, drawn with a U** |
| `p230-watch-remote.md` (the file written above, after `Refresh files`) | null, no mark | — |

The remote tree draws nine rows and not one decoration. The tracked, modified files sit under
`lib/` and `src/core/`, which the driver did not expand, so the M lane was not read; the U lane on
the root row is the reading, and it is the row the charter names.

### 4.6 The refresh controls, counted from their labels on both faces

| view | remote | local |
|---|---|---|
| Source control | 5: `Read what changed on that machine again`, `Refresh changes`, `Refresh history`, `Refresh branch`, `Refresh runs` | 2: `Refresh git status`, `Refresh branches` |
| Explorer | `Refresh files` | `Refresh files` |
| Context | `Read the configuration again` | `Read the configuration again` |
| Search | `Run this search again` | `Run this search again` |

Only Source control differs, and by three. `RunsSection.tsx:149` would give local a third,
`Refresh runs`, on a repository with a GitHub origin; this fixture has none and the Mac Pro has no
`gh` (`farGh: NO-GH`), so the Runs group there answers `notGitHub` after a read and vanishes.

## 5. What the parent reading says the phase must make true

Stated as the numbers the verifier reads at HEAD against this section:

1. History, Branch and Runs: a first row (or, for Runs on this fixture, the group gone) within the
   same order as Changes after `connected`, with no press. Parent: null, null, null at 30 s.
2. Context and Search: rows when looked at with the link up, and the held query re-run. Parent:
   stale at 45.7 s and 61.1 s.
3. After `putFile` answers `wrote`: the Source control row and the Explorer row with no press.
   Parent: null in 30 s, null after focus, null after a tab switch.
4. `NOTES-untracked.md` on the remote tree carries `data-item-git-status="untracked"`. Parent: null.
5. Source control on a machine carries the same refresh controls as local. Parent: 5 against 2.
6. The clock, "Read at HH:MM. Press Refresh to read it again.", is gone from the Explorer, the
   Changes group, the branch header's `<TIME>` span and the three groups. Parent: drawn in all six
   places once a read lands.
7. The remote-only sentence set of `.p228/verify/read-faces.mjs` stays empty; the phase may not
   answer a stale sentence with a longer one.
## 6. The `.p224` probes, and which of them the verifier re-runs

All under `.p224/` in this tree, committed with research 85. What each took and what of it the
verifier can re-run to take the parent reading of what THIS phase fixes:

| probe | what it measured | re-run for Phase 230? |
|---|---|---|
| `probe-p224f.mjs` `watchDrive` | THE number this phase is built on: a file made on each side while the tab is open. Local `fs.createFile` → 513 ms to the Source control row; far `machines.putFile` → never in 30 s; then `Refresh changes` → 203 ms. Also counts the refresh controls on both Source control faces | YES, whole. It is the research 85 §4.1 reading. Its A launch confirms the write root in the settings window, which this phase's probe copies; its socket is never unlinked, which this phase's probe fixes |
| `probe-p224f.mjs` `treeDrive` | the Explorer's rows on both faces read from the `file-tree-container` shadow root, `[role="treeitem"]` | YES for item 4, adding `data-item-git-status` per row, which is what Pierre paints and what `.p230/probe-p230-parent.mjs` reads |
| `probe-p224b.mjs` | the boot with a blackhole row at 192.0.2.1 FIRST: Source control's first row at 19,789 and 19,777 ms | YES as the way to make the Mac Pro DOWN at boot for about twenty seconds on real hardware. This phase's probe uses exactly that: the blackhole row first, the Mac Pro second, and reads the views before the link comes up |
| `probe-p224.mjs` `mainDriver` | the five views timed on both faces, the write verbs, `remoteSidebarBeforePrepare` and `AfterPrepare` | the `driveView` sampler for the connected-to-first-row timings; the rest is research 85 §3 and not this phase |
| `probe-p224e.mjs` | the trees side by side, the Quick Open reading | not needed |
| `probe-p224c.mjs`, `probe-p224d.mjs` | the boot comparison and the write controls | not needed; §4.2 is Phase 232 |
| `blackhole.mjs` | one ssh to 192.0.2.1: 10,011 ms | not needed, the number is not this phase's |
| `far-fixture.mjs` | the 26 file, three commit, two untracked, one side branch repository under `~/tortie-p224-scratch-<pid>` | YES, copied to `.p230/far-fixture.mjs` under the p230 prefix; `.p228/verify/far-fixture.mjs` is the same file under the p228 prefix |
| `far-final.mjs`, `far-sockets-remove.mjs` | the closing count and the ten dead sockets | the count, yes; the unlink is now inside the `finally` |
| `src/renderer/app/remote-boot-drive.ts` (not `.p224`, shipped) | the Phase 90.3 harness drive: injects a machine row, moves its link through quiet → connected → settled → second sign in, and COUNTS reads on the tree store and the Changes store; A 1, B 2, C 2, D 3 | YES for the hook's test in the charter's proof list: it is the one place that counts reads, and extending its two subscriptions to the History, Branch, Runs, Search and Context stores is how "exactly once per sign-in and never on a timer" becomes a count rather than a sentence. `build/probe-remote-project.mjs` calls it through `GMUX_SHOT_JS` |
| `.p228/verify/probe-p228-verify.mjs` + `read-faces.mjs` | every visible text node on the remote face not on the local face, per view | YES for the operator's rule: the set must stay empty of sentences after this phase, and it is the reader that fails a stale-sentence rewrite that adds words |

## 7. The gates at the parent, run to log files

All at `41405d7`, logs under `.p230/logs/`, nothing piped to `tail`.

| gate | log | result |
|---|---|---|
| `npm run typecheck` | `typecheck.log` | exit 0: 1,188 production files, 4,048 runtime edges, 0 cycles; shared types OK |
| `npm run build` | `build.log` | exit 0, contract inventory byte identical to `docs/audits/contract-baseline.txt` |
| `npm run smoke:t1` | `smoke-t1.log` | 6/6 PASS, exit 0; its scratch server on `gmux-smoke-t1-wt-p230-54791` ended by the harness |
| `npm run conformance:machines` | `conformance-machines.log` | PASS, exit 0 |
| `npm run conformance:remoteclose` | `conformance-remoteclose.log` | exit 0, 508 ms |
| `npm run gate:knownhosts` | `gate-knownhosts.log` | exit 0: 279 files read, 19 reach `build/ssh-run.mjs`, 36 fixtures of which 32 must fail and did |

`npm test` was not run by this step; it is the integrator's battery and the charter's hook test is what changes it.

## 8. The smallest set of files the builder must touch

Renderer only, plus one probe. Nothing under `src/main` and no channel, so no contract line moves.

**The hook and its five new consumers (mechanism 1 and 2):**
- NEW `src/renderer/machines/use-remote-reread.ts` (name is the builder's): the `remoteAnswering` + `retried` shape lifted from `FilesSection.tsx:237-265` and `ScmSection.tsx:1144-1167`, plus the three moments: tab activation, window focus, and a write landing. Its test goes beside it under `src/renderer/machines/__tests__/`.
- `src/renderer/tree/FilesSection.tsx` (237-265 replaced by the hook; the header comment at 20 "REFRESH IS THE ONLY THING THAT RE-READS A MACHINE" rewritten; the `remoteTreeReadAt` line under the tree comes off).
- `src/renderer/scm/ScmSection.tsx` (1144-1167 replaced; 1538-1543 the clock comes off; the comment block at 1045-1075 that says CLICKING A COMMIT DOES NOTHING stays).
- `src/renderer/scm/RemoteHistorySection.tsx` (480-482 gains the hook; 433-436 the `machineReadAt` line comes off; the header's "does not refresh" bullets at 19 rewritten).
- `src/renderer/scm/RemoteBranchSection.tsx` (351-353; 313-316; header bullet at 18 and the paragraph at 67).
- `src/renderer/scm/RemoteRunsSection.tsx` (the wiring at the bottom; 277-280; the "What is NOT true" paragraph at 56-64 which records the decision this phase reverses).
- `src/renderer/search/store.ts` remote arm (`runRemote` at 373-435: a `notConnected` answer with a query in the box is what the hook re-runs).
- `src/renderer/context/store.ts` (`readRemote` at 230-275).
- `src/renderer/scm/BranchHeader.tsx` (359-371: the `<TIME>` span and the hover come off; the `Read what changed on that machine again` button is one of the three that go).

**The write moments (mechanism 2, second half):** a small announce in `src/renderer/editor/tab-io.ts:519` (`wrote`), `src/renderer/tree/tree-ops.ts:495,518` and `use-tree-rename.ts:119,142` (`made`, `moved`, `done`), and `src/renderer/scm/remote-changes.ts:639-660` (stage, unstage, commit already re-read Changes; History and Branch need to hear a commit). The local analogue is `src/renderer/state/repo-changed.ts`; a remote one keyed by `targetKey` is the shape.

**The sentence and the clock (mechanism 3):** `src/renderer/machines/presentation.ts` (`remoteReadAt` 53-69 and `machineReadAt` below it come off, and `readClockTime` stays only if `quick-open.ts:30` still needs it), `src/renderer/machines/explorer.ts:21` (`remoteTreeReadAt` alias), `src/renderer/machines/runs.ts:73` (`runsReadAt` wrapper), and the "did not answer" sentences in `machines/history.ts:84`, `branch.ts:57`, `runs.ts:119`, `scm.ts:141`, `search.ts:65`, `context.ts:88`, `explorer.ts:45` where the entry wants a stale read to say what is on screen instead.

**Decorations (mechanism 4):** `src/renderer/app/Sidebar.tsx:318-326` (the selector reads `remote-changes.ts`'s entry for the target when `localRepoPath === null`, composing `GitFileStatus` rows from `MachineReviewFile.status`), `src/renderer/tree/FilesSection.tsx:410-421` (`statusFiles={[]}` and `isRepo={false}` for the remote tree become the fed values), and `src/renderer/tree/git-status.ts` whose header says decorations come from THE SCM STORE and names the other machine's badge as the wrong-machine hazard. Ignored dimming is a separate lane (`tree/ignored.ts`) fed by `fs:*` on this Mac and stays off for a remote tree unless the builder reads it from the machine, which the entry does not ask.

**The refresh buttons (mechanism 5):** `ScmSection.tsx:1505-1516`, `RemoteHistorySection.tsx:405-414`, `RemoteBranchSection.tsx:291-300`, `RemoteRunsSection.tsx:244-253`, `BranchHeader.tsx:362-374`. Local carries `Refresh git status` and `Refresh branches` on this fixture, and `Refresh runs` (`RunsSection.tsx:149`) only with a GitHub origin, so "the two local has" is a face reading and the remote view should carry the same two AND the same conditional third.

**Tests that pin what changes:** `src/renderer/app/__tests__/p903-c-remote-copy.test.ts:172-177,688,788,833` (pins `remoteReadAt`'s exact sentence and the `remoteTreeReadAt` alias), `src/renderer/scm/__tests__/p107-remote-history.test.tsx:667,751,864`, `p106-remote-branch.test.tsx`, `p105-remote-runs.test.tsx:534` (the `Refresh history/branch/runs` labels and `machineReadAt` under the group), `src/renderer/state/__tests__/machines-slice.test.ts` (`machineAnswering`), and `build/conformance-machines.mjs` conditions around 5128 and 5313, whose sentences say reads happen "on the first expand, on Load more and on Refresh, and at no other time", which this phase makes false and must rewrite in the same commit.

**The probe list:** `build/probe-p167-scale.mjs:212` (`P167_SURFACES` default gains the remote views, per the charter's proof), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` +1 if a new probe under `build/` launches Electron), and `.p230/` for the app run.

### Where a rebase may conflict

- **Phase 227 (redline, in flight at `/private/tmp/wt-p227`, head `eb5ac08`, not in main):** touches `build/probe-p167-scale.mjs` (35 lines since its base `6b8b1c1`: the redline surface) and `build/conformance-redline.mjs`. THE ONE SHARED FILE IS `build/probe-p167-scale.mjs`, and both phases edit near the `SURFACES` default at line 212. Everything else 227 touches is `src/renderer/editor/`, `src/main/menu.ts`, `src/renderer/app/menu-actions.ts`, `src/shared/keymap.ts`, `src/shared/ipc/app.ts`, `package.json`, none of which this phase touches.
- **Phase 231 (the liveness gate, worktree at `/private/tmp/wt-p231`, still at `41405d7` with a clean tree, its measure step running against the Mac Pro on `gmux-p231-78176` while this step ran):** its charter is main only, `src/main/machines/remote-run.ts`, `machine-state.ts`, `exec-plane.ts`. No file in common. BUT its item 3 gives the not-connected refusal a label and its item 1 splits the link fact in two, and this phase's hook keys on `machineAnswering`, which reads ONE link fact from `MachineStateView.link`; if 231 lands first with a second fact on the view, the hook should ask the LINK fact, and if 230 lands first, 231's split must keep `machineAnswering` answering the link. Say so in the commit body whichever lands second.
- **Phase 229 landed at `2202fae` and Phase 228 at `b53e665`:** both already under this tree. 229's identity precheck at `ScmSection.tsx:780-799` is the second `machineAnswering` consumer and must keep its `connected &&` guard when the retry above it moves into the hook.
- **Phase 235 (nits) and 233 (the two halves):** queued, not started; 235 item 4 rewrites the confirm-hash-moved sentence in the same `machines/*.ts` files this phase edits, and 233 touches the History rows. Neither has a worktree.

## 9. What this step did on his machines, counted before and after

Far side, `.p230/far-count-before.txt` and `far-count-after.txt`, plus the probe's own before and
after in its report: `-L gmux` held **`gmux-control created 1787879931 attached 1`** and nothing
else, before, after run 1, after run 2 and at the end; the socket directory `/private/tmp/tmux-501`
there held `gmux` alone before and at the end, with `gmux-p230-49518` and `gmux-p230-88805` each
unlinked in its run's `finally`; no `tortie-p230-scratch-*` and no `tortie*` under his home at the
end; the two tmux processes there at the end are the two that were there at the start, being the
bundled server from 11 days ago and the `/usr/local/bin/tmux` client holding `gmux-control`; no
process of this phase; `~/.ssh` 96 bytes, `~/.ssh/authorized_keys` 88 bytes, `~/.gitconfig` 140
bytes, all with the mtimes they had before. One thing that was there mid-run and was not this
step's: run 1's after-count read `gmux gmux-p231-78176` in the far socket directory and the same
name locally, which is Phase 231's measure step running against the same machine at the same
moment; it was gone by run 2's end and this step did not touch it.

This Mac: `-L gmux` 13 sessions before and after, listed only; ssh agent empty before and after;
`~/Library/Application Support/Tortie/gmux/machines/known-machines` 113 bytes and
`~/.ssh/known_hosts` 2,215 bytes, unmoved by every launch (`identityFilesUnmoved: true` in both
reports); `/private/tmp/tmux-501` holds `gmux` alone at the end (it held Phase 227's two verifier
sockets and `.run` files mid-run, not this step's); Electron count once at the end **11**, being his
own Tortie (three renderers on his Application Support profile, the bare `Tortie` main and its
crashpad), the crashpads of Chrome, Granola, Screen Studio and Slack, and one crashpad under
`/Users/gdc/gmux/node_modules/electron`, which is his checkout and not this worktree; none on a
p230 profile. Nothing under `/Users/gdc/gmux` was written, staged, reset or committed.

## 10. What was not measured

- A REAL window focus. The driver dispatched a synthetic `focus` on `window`, which reaches
  listeners and reaches no main-side `browser-window-focus`. Nothing listens to either today, so
  the parent reading is the same, but the verifier's independent method is the real one.
- The Runs group with rows. The fixture has no GitHub origin and the Mac Pro has no `gh`, so Runs
  on this machine can only be read as a sentence that stays or a group that goes.
- The M lane on the remote tree. `lib/` and `src/core/` were not expanded.
- An outside write by ssh, which is the verifier's method and not this step's.
- Anything on a Linux far side or a large repository. One arm64 Mac over Tailscale, 26 files.
