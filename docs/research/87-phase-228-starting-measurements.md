# 87. Phase 228, starting measurements

The measure step for Phase 228, the remote face, just enough words. Taken at `88dcfad`, the parent
of the phase, on 2026-09-07 between 22:20 and 22:30. Nothing was built. The charter is the Phase 228
entry in docs/BACKLOG.md and research 85 section 3.3; this document says what the tree holds against
that entry, what the verifier can re-run, what the remote face reads on his Mac Pro today, that the
gates are green at the parent, and which files the builder touches and which of them another phase
in flight will touch too.

The probes are under `.p228/` in this tree. `probe-p228-measure.mjs` took the reading,
`far-fixture.mjs` made and removed the scratch repository, `word-count.mjs` counted the copy strings,
and `p228-measure-63591.json` is what the run printed with every paragraph and every control off the
DOM. The gate logs are under `.p228/logs/`.

## 1. The charter's citations against the tree

Every file and line the entry cites still says what the entry says it says.

| cited | in the tree at `88dcfad` | holds |
|---|---|---|
| `src/renderer/machines/scm.ts` `remoteChangesBand` :24 | :24 | yes, 25 words |
| `scm.ts` `REMOTE_SCM_SECTIONS_NOTE` :183 | :183 | yes, 49 words |
| `scm.ts` `remoteCommitStanding` :213 | :213 | yes, 29 words |
| `src/renderer/machines/explorer.ts` `remoteTreeReadOnly` :84 | :84 | yes, 8 words, a hover title |
| `explorer.ts` `remoteTreeCanWrite` :101 | :101 | yes, drawn only with a write root |
| `explorer.ts` `remoteTreeReadAt` :19 | :19 | yes, an alias of `remoteReadAt` |
| `src/renderer/machines/search.ts` `searchOnMachineLine` :33 | :33 | yes, 22 words |
| `search.ts` `SEARCH_FILTERS_ON_THIS_MAC` :93 | :93 | yes, 34 words |
| `src/renderer/machines/presentation.ts` `remoteReadAt` :59 | :59 | yes, 9 words |
| `presentation.ts` `machineReadAt` :64 | :64 | yes, 9 words |
| draw site `src/renderer/scm/ScmSection.tsx` | :894 standing, :1380 band, :1465 read-at, :1495 note | yes |
| draw site `src/renderer/tree/FilesSection.tsx` | :158 to :159 the menu note, :373 the read-at line | yes |
| draw site `src/renderer/app/Sidebar.tsx` | :230 and :244, the two disabled titles | yes |
| draw site `src/renderer/search/QueryBlock.tsx` | :198, :212, :223, all three as `title=` | yes, titles only |
| tests `p903-c-remote-copy.test.ts`, `p903-b-tree-menu-remote.test.ts` | 1,034 and 256 lines | yes |

### Drift, being what the entry says that the tree does not, or what the tree draws that the entry does not name

1. **The 26 word band on every view is not named in the mechanism.** `remoteBandTitle` (6 words,
   "Files live on Greg's Mac Pro.") and `REMOTE_BAND_BODY` (20 words) live in
   `src/renderer/machines/project-tab.ts:44` and `:59`, and `MachineBand` in
   `src/renderer/app/Sidebar.tsx:133` draws them at the top of ALL FIVE views, at `:426`, `:437`,
   `:448`, `:465` and `:473`, with `src/renderer/app/machine-band.css` beside it. The entry's counts
   include it (Explorer 35 is this band plus the read-at line) and the entry's first bullet, "The
   machine band comes off", names the Source control band `remoteChangesBand` and not this one. The
   sentence that follows, "The tab already names the machine in the tab spine and the project
   header", is the reason this one comes off too. Without it, Explorer can never read 0, and neither
   can any other view. The builder must take a decision on it and the verifier's set rule will find
   it if the builder does not.
2. **The search note the entry sizes at 22 words is the 34 word one.** Research 85's "48" on Search is
   the band at 26 plus `searchOnMachineLine` at 22, which is drawn AFTER a search, under the results,
   by `src/renderer/search/SearchView.tsx:196`. The idle face carries the band plus
   `SEARCH_FILTERS_ON_THIS_MAC` at 34 words, drawn as the idle body by
   `src/renderer/search/ResultsList.tsx:510`, so the idle Search face reads **60** words rather than
   48. The entry's "search filters note (22 words) becomes the three disabled controls" is the right
   move for the 34 word note. The 22 word grep line is a second remote only sentence the entry does
   not mention at all, and it too has no local equivalent. Two draw sites the entry does not name,
   `ResultsList.tsx` and `SearchView.tsx`, are where the two sentences are.
3. **The Context view is not in the entry and it carries 60 words.** `contextOnMachineLine` (17) and
   `CONTEXT_NESTED_NOT_LISTED` (17) in `src/renderer/machines/context.ts:107` and `:118` are drawn by
   `src/renderer/context/ContextView.tsx:884` and `:885` under the sections, above the band's 26. The
   local Context face draws no paragraph. The entry cites `context.ts` only as the home of
   `remoteReadAt` and `machineReadAt`, and those are in `presentation.ts`.
4. **The Architecture view is not in the entry and it carries 45 words**, the band plus the 19 word
   refusal in `src/renderer/arch/copy.ts:41`. Phase 234 owns Architecture on a machine. Whether the
   refusal stays as a sentence until then, or becomes the disabled "Open the map" button's title,
   which today reads "This build cannot draw the map.", is a decision the entry does not make. The
   verifier's rule, "EMPTY on every view", reads it either way.
5. **Twelve paragraphs of 245 words sit under the three collapsed Source control groups.** History,
   Branch and Runs ship collapsed. Expanded, they draw seven, four and one sentences from
   `src/renderer/machines/history.ts`, `branch.ts` and `runs.ts` through `RemoteHistorySection.tsx`,
   `RemoteBranchSection.tsx` and `RemoteRunsSection.tsx`, every one of them a remote only sentence
   and none with a local equivalent. The verbatim list is in section 3. The entry does not name
   these files. A resting face at first visit does not show them, so the entry's count of 138 is
   right for what it counted, and a verifier that expands the groups will read 406.
6. **On his face today the commit caption is 23 words, not 7.** His row has no write root, so the
   Source control view draws `remoteWritesNotConfirmed` under the disabled Commit button, "Tortie has
   not been given permission to write on Greg's Mac Pro. Open Settings, then Machines, and confirm
   that machine. Nothing was sent." Research 85 drove with a write root, so it read
   `remoteCommitNothingStagedYet`, 7 words. His resting Source control face reads **161** words in
   seven paragraphs. The same sentence is the button's hover title, so the entry's plan to move the
   hooks and signing line onto the Commit button's title lands on a title that already carries a
   sentence, and Phase 229 owns the caption's wording, so the builder must not rewrite it.
7. **The cited draw site for the search note is a title, not prose.** `QueryBlock.tsx:198`, `:212` and
   `:223` already put `SEARCH_FILTERS_ON_THIS_MAC` on the three disabled filter controls as their
   `title`. The entry's "becomes the three disabled controls it describes, with one hover title each"
   is half done at the parent: the controls are disabled and titled, and the 34 word sentence is
   drawn a second time as the idle body. What comes off is the body, and the titles want shortening
   to one short label each, because the same 34 words on three hovers is the paragraph three times.
8. **`conformance:machines` pins the two Context sentences the operator's rule takes off.** Condition
   58h of `build/conformance-machines.mjs` (`:5292` to `:5318`) fails unless
   `src/renderer/context/ContextView.tsx` names `contextOnMachineLine`, `CONTEXT_NESTED_NOT_LISTED`
   and `contextCutLine`, and the entry says that gate stays green. The reading is a text scan of that
   one file for the three identifiers, `build/machines-conformance-probe.mts:2755` and `:2837`, so
   an import left behind with no draw keeps the gate green and fails `typecheck` instead. Taking the two note lines off the
   Context face the plain way, by deleting the two draws at `ContextView.tsx:884` and `:885`, turns
   the gate red. It is the only renderer sentence any gate reads, so it is the one place the entry's
   "stays green" and its "EMPTY on every view" pull against each other, and the brief has to say
   which wins before the builder starts.

## 2. The data flow of the surfaces this phase touches, in ten lines

1. Main answers a status word, counts and rows for one read; no sentence a person reads crosses the
   channel (`src/main/machines/*`, `machines:listTree`, `machines:reviewFiles`, `machines:searchContent`,
   `machines:readContext`).
2. Every sentence about a machine is composed in `src/renderer/machines/<view>.ts`, one file per view,
   taking the machine's `label` from the machines slice, never a name the component composes.
3. `Sidebar.tsx` reads `useMachineWrite()` once per tab and hands the label to `MachineBand`, drawn
   above all five views, and to the two disabled create buttons' titles.
4. `FilesSection.tsx` reads the tree store's `remote` entry and draws `remoteTreeReadAt` under the rows
   when `status === 'ok'`.
5. `ScmSection.tsx`'s remote arm reads `remote-changes.ts`'s store and draws band, commit box with
   standing line and caption, read-at line, the three group components, then the sections note.
6. The three groups read their own stores and draw their own band, read-at and notes from
   `history.ts`, `branch.ts`, `runs.ts`.
7. `SearchView.tsx` draws `searchOnMachineLine` under the results whenever `mode` is `repo` or `walk`;
   `ResultsList.tsx` draws the idle body and "Searching…"; `QueryBlock.tsx` disables the three
   filters and titles them.
8. `ContextView.tsx` draws `contextReadingOn` while loading and the two note lines under the
   sections when `remoteMode === 'context'`.
9. The tests pin the strings: `p903-c-remote-copy.test.ts` holds `EVERY`, the set every rule reads,
   and `p104`, `p105`, `p106`, `p107`, `p98`, `elsewhere-copy` pin the per view draw.
10. `build/conformance-machines.mjs` reads `src/main/machines/remote-copy.ts` and the far side
    scripts, and ONE renderer file: condition 58h at `:5292` to `:5318` fails unless
    `src/renderer/context/ContextView.tsx` names `contextOnMachineLine`, `CONTEXT_NESTED_NOT_LISTED`
    and `contextCutLine`. No other renderer sentence is read by any gate; `grep` for
    `REMOTE_BAND_BODY`, `remoteChangesBand`, `REMOTE_SCM_SECTIONS_NOTE`, `SEARCH_FILTERS_ON_THIS_MAC`
    and the rest under `build/` finds nothing that scans for them.

## 3. The parent reading, taken on his Mac Pro

One run of `.p228/probe-p228-measure.mjs`, pid 63591, three Electrons one after the other on one
scratch profile at `/private/tmp/p228-run-63591/profile` and the scratch socket `gmux-p228-63591`,
through `build/electron-run.mjs`. The machine was confirmed in the scratch profile with NO write
root, which is his own row's state. The same 26 file fixture with three commits, two modified files,
two untracked files and a side branch on both sides. The remote tab and the local tab were visited in
the order Explorer, Search, Source control, Context, Architecture, each view settled for at least
2.5 s and until the sidebar text had not moved for 1.5 s, and every prose element and every control
was read off `[data-slot="sidebar"]`.

### 3.1 Words of standing prose, remote against local

| view | remote words | remote paragraphs | local words | local paragraphs |
|---|---|---|---|---|
| Explorer | **35** | 3 | 0 | 0 |
| Search, idle | **60** | 4 including the 3 word "Search across" heading the local face also draws | 0 read; the local idle body is 17 words in `ResultsList.tsx:549` | see note |
| Search, after a query | **48** | 3 | 0 | 0 |
| Source control, resting | **161** | 7 | 0 | 0 |
| Source control, groups expanded | **406** | 19 | 0 | 0 |
| Context | **60** | 4 | 0 | 0 |
| Architecture | **45** | 3 | 44, being the reading itself | 3 |

The local Search idle face was not read, because the probe left the remote query in the box and the
store re-ran it on the local tab, so the local Search face read rows. The local idle body is in the
source at `ResultsList.tsx:549`, "Matches stream in as they are found. Case, whole word and regular
expressions are the three toggles beside the box.", 17 words. The verifier should clear the box before
switching tabs; the parent number for the remote face does not depend on it.

### 3.2 Every remote only paragraph, verbatim, with the element it sits in

Explorer:

- `.machine-band-title` [6] "Files live on Greg's Mac Pro."
- `.machine-band-body` [20] "Tortie reads what is in this folder on that machine. It writes there only where you have let it save."
- `p.files-remote-note` [9] "Read at 22:27. Press Refresh to read it again."

Search, idle, with the file filters shown:

- the band, 26, as above
- `p.search-empty-title` [3] "Search across tortie-p228-scratch-63591" (local draws the same heading)
- `p.search-empty-body` [34] "Include, exclude and the ignore files toggle work on this Mac only. On another machine Tortie searches the files git knows about, or every file in the folder when it is not a repository."

Search, while it waits, at 28 ms after the query: the band and `p.search-empty-body` "Searching…", 1
word, 0 rows. At 161 ms: 8 rows and the grep line. The local face had 8 rows at 27 ms with no
sentence in between. So the remote face does draw one word while it waits; what it does not do is
stream.

Search, after a query:

- the band, 26
- `p` in `.search-machine-note` [22] "Tortie searched this project on Greg's Mac Pro with that machine's own grep. A pattern that works here can behave differently there."

Source control, resting:

- the band, 26
- `p.scm-remote-band` [25] "These changes are on Greg's Mac Pro. Tortie can stage them, unstage them and commit them there. It cannot undo a change on that machine."
- `div.scm-commit-caption` [23] "Tortie has not been given permission to write on Greg's Mac Pro. Open Settings, then Machines, and confirm that machine. Nothing was sent."
- `p.scm-remote-commit-standing` [29] "Hooks and signing run on Greg's Mac Pro. If a key there needs a passphrase typed, Tortie cannot answer it and the commit will wait until it gives up."
- `p.scm-remote-note` [9] "Read at 22:27. Press Refresh to read it again."
- `p.scm-remote-note` [49] "Tortie shows the changed files, the history, the branch and the runs for a folder on another machine. It does not show the files one commit changed there. What this view can change on that machine is which files are staged and whether they are committed, and nothing else."

Source control, History, Branch and Runs expanded, in addition:

- `p.scm-remote-band.rhist-band` [22] "Tortie asked Greg's Mac Pro for the commits in this folder. It read that machine's own answer and it changed nothing there."
- `p.rhist-read-at` [9] "Tortie read this from Greg's Mac Pro at 22:27."
- `p.rhist-not-live` [16] "This does not refresh. Read it again to see anything committed on Greg's Mac Pro since."
- `p.rhist-refs` [27] "The marks on a row name branches and tags as Greg's Mac Pro holds them. Tortie did not read when that machine last fetched from a server."
- `p.rhist-pages-fresh` [31] "Tortie reads the branches on Greg's Mac Pro again for every page. If a branch there changed in between, the lines on the left can be drawn differently after Load more."
- `p.rhist-no-write` [27] "Tortie does not change anything in that folder on Greg's Mac Pro. This group only reads, so it offers no checkout, no branch and no cherry pick."
- `p.rhist-files` [24] "The files one commit changed are not read for a folder on another machine. Open a session on Greg's Mac Pro to read them."
- `p.scm-remote-band.rbranch-band` [24] "Tortie asked Greg's Mac Pro which branch is checked out in this folder. It read that machine's own answer and it changed nothing there."
- `p.rbranch-not-live` [16] "This does not refresh. Read it again to see whether the branch over there has moved."
- `p.rbranch-no-switch` [16] "Tortie does not change what is checked out on Greg's Mac Pro. This group only reads."
- `p.rbranch-only-current` [21] "Tortie reads only the branch that is checked out on Greg's Mac Pro. It does not list the other branches there."
- `p.runs-branch-line` [12] "The branch checked out on Greg's Mac Pro is main at b4d7061."

Context:

- the band, 26
- `p` in `.ctx-remote-note` [17] "Tortie read these files on Greg's Mac Pro. Installing, enabling and pinning work on this Mac only."
- `p` in `.ctx-remote-note` [17] "Skills kept in folders inside this project are not listed when the project is on another machine."

Architecture:

- the band, 26
- `p.arch-note` [19] "A contract is read on the computer its repository is on, and this build cannot ask that computer anything."

### 3.3 Controls, remote against local

Explorer header, both faces, six controls with the same labels. Remote disables New file and New
folder with the title "Tortie only reads files on Greg's Mac Pro." on each; local has them enabled
with their own names as titles. Everything else is identical. This is the shape the entry wants
everywhere, and the title stays until Phase 229.

Search, remote: the three filter controls are disabled, each titled with the full 34 word note. Local:
enabled, the toggle titled with its own one liner. The header's three buttons are the same on both.

Source control refresh controls, remote: **five**, "Read what changed on that machine again" (titled
with the read-at sentence), "Refresh changes", "Refresh history", "Refresh branch", "Refresh runs".
Local: **two**, "Refresh git status", "Refresh branches". Phase 230 owns these. The remote Commit
button is "Commit on Greg's Mac Pro", disabled, titled with the 23 word caption; the local one is
"Stage all & commit", disabled, titled "Enter a commit message". The local face has Discard and
Delete on every row and a Git actions menu; the remote face has neither, drawn as absent, which is
research 57's refusal drawn the way the entry wants.

Context, remote: the Refresh control is titled "Read the files on Greg's Mac Pro again. Tortie cannot
see a change made on that machine until you press this." (21 words); local: "Read the configuration
again. The watcher cannot see a directory that did not exist when this view opened." (16 words). Both
are titles and both explain; the remote one is not a sentence that appears only on the remote face in
the entry's sense, but it is longer than the local one. Local has "Search skills.sh"; remote draws no
such control, which is an absent verb drawn as absent.

Architecture, remote: "Open the map" disabled, titled "This build cannot draw the map."; "Read the
code again" disabled with the local title. Local: both enabled.

### 3.4 The one clock

Every view that reads "Read at 22:27" read it from this Mac's clock at the moment the answer landed,
which is `readClockTime` in `presentation.ts:45`. The entry leaves this line until Phase 230.

### 3.5 Timings, for the record only

Rail present and both tabs present at 0 ms after the driver started (the boot had finished under the
8 s shot delay). `machines.prepare` answered `prepared`, "The program at /usr/local/bin/tmux was
already running on this machine, so Tortie left it running". Query to first row: remote 161 ms,
local 27 ms with the query already in the box. Each view settled in 2,520 to 2,958 ms, which is the
probe's own floor of 2.5 s rather than anything the view did.

### 3.6 The settings page, read once and not the subject of this phase

The Machines page in the scratch profile after Confirm drew fourteen sentences of explanation under
the one row, being what it runs, what confirming seals, the key it has, what Prepare does, and what
Saving files means. The entry says Settings, Machines is Phase 229's and the nits round's, so the
reading is in `p228-measure-63591.json` under `launchAFull.machinesPageAfterConfirm` and nothing here
counts it.

## 4. What the verifier can re-run from `.p224/`, and what it should run instead

`.p224/probe-p224.mjs` with `driver.mjs` is the run research 85 section 3.3 was read from. Its
`driveView` samples the whole sidebar text and its result JSON holds `finalText` per view, which is
where the research's counts were taken by hand. It also drives the write path, the blackhole machine
and the stalled tab, which this phase does not need, and it confirms a write root, which his row does
not have. Its launch A settings drive, its B1 add drive and its `launch()` helper are the parts worth
keeping.

`.p228/probe-p228-measure.mjs` is that probe cut to this phase and it is what the verifier should
re-run at HEAD, because it reads the same thing at the parent: every prose element with its class and
word count, every control with its title and disabled state, on both faces, for all five views, with
the Source control groups expanded and the search filters shown, and the search face sampled every
25 ms while it waits. Run it the same way, `GMUX_REAL_MACHINE_HOST=gregs-mac-pro.tail2ddfe1.ts.net
GMUX_REAL_MACHINE_CONFIRM=<the same> node .p228/probe-p228-measure.mjs`, and compare the
`faces.views.remote.*.paragraphs` arrays against the ones in `p228-measure-63591.json`. The
independent method the entry asks for, the set of remote text nodes with no local equivalent, is the
set difference of those arrays per view, and the parent's set is section 3.2 above, whole.

Two things the verifier should add to it. Clear the search box before switching to the local tab, so
the local idle body is read off the DOM rather than off the source. And read the Explorer's context
menu on a remote file through the shot mode popup knob, because `remoteTreeReadOnly` is also the
last disabled row of that menu (`FilesSection.tsx:158`) and the entry says that title stays.

`.p224/far-final.mjs` is the far side closing count and it is worth running as is after the verifier's
run, with the prefix in its `ls -d` changed to `tortie-p228-scratch-*`. `.p224/far-sockets-remove.mjs`
should not be needed, because this phase's probe unlinks its socket in the same `finally` that kills
the server, and the verifier checks that `farSocketsAfter` reads `gmux` alone.

## 5. The gates at the parent, green

All six, run to files under `.p228/logs/` and read from the files.

| gate | log | exit | what the last line says |
|---|---|---|---|
| `npm run typecheck` | `gate-typecheck.txt` | 0 | shared types OK, no runtime cycles over 1,186 production files |
| `npm run build` | `gate-build.txt` | 0 | contract inventory matches the baseline byte for byte |
| `npm run smoke:t1` | `gate-smoke-t1.txt` | 0 | ended the scratch server on `gmux-smoke-t1-wt-p228-58907` |
| `npm run conformance:machines` | `gate-conformance-machines.txt` | 0 | PASS, nothing was started by this gate |
| `npm run conformance:remoteclose` | `gate-conformance-remoteclose.txt` | 0 | vitest green |
| `npm run gate:knownhosts` | `gate-gate-knownhosts.txt` | 0 | 278 files read, 19 reach the helper, 36 fixtures and 32 failed as they must |

`gate:knownhosts` is part of `npm run build`, so it ran twice, once inside the build and once alone.
`.p228/` is a new directory under the tree and not under `build/`, so the two build gates that walk
`build/` do not read it; the verifier's probe, if it moves under `build/`, must route every ssh through
`build/ssh-run.mjs`, which this one does by way of `build/real-machine.mjs`, and must reach
`build/electron-run.mjs`, which it does, and must raise `HELPER_USER_FLOOR` in the same commit.

## 6. The smallest set of files the builder must touch

To do what the entry says and nothing more:

- `src/renderer/app/Sidebar.tsx`: `MachineBand` comes off, or is reduced to nothing, on all five
  views. Leave `:230` and `:244`, which are Phase 229's.
- `src/renderer/app/machine-band.css`: removed with it, or left as dead CSS and named as such.
- `src/renderer/machines/project-tab.ts`: `remoteBandTitle` and `REMOTE_BAND_BODY` deleted, or kept
  exported with no importer and a test pinning that no component imports them.
- `src/renderer/scm/ScmSection.tsx`: `:1380` the band and `:1495` the sections note come off;
  `:894` the standing line moves to the Commit button's `title`, which today is `disabledReason`, so
  the builder composes one title from both or picks one; `:1465` the read-at line stays.
- `src/renderer/machines/scm.ts`: `remoteChangesBand` and `REMOTE_SCM_SECTIONS_NOTE` deleted or left
  unimported; `remoteCommitStanding` stays as the title's source.
- `src/renderer/search/ResultsList.tsx`: `:510` the idle body becomes the local idle body, or nothing;
  the import of `SEARCH_FILTERS_ON_THIS_MAC` goes.
- `src/renderer/search/QueryBlock.tsx`: the three titles become one short label each rather than the
  34 word note three times.
- `src/renderer/search/SearchView.tsx`: `:196` the grep line comes off, since the local face carries
  no equivalent; the entry does not name it and the verifier's rule will.
- `src/renderer/machines/search.ts`: `SEARCH_FILTERS_ON_THIS_MAC` and `searchOnMachineLine`
  replaced by the three short titles or deleted.
- `src/renderer/context/ContextView.tsx` and `src/renderer/machines/context.ts`: `:884` and `:885`
  come off, since local draws nothing there; the entry does not name them and the verifier's rule will.
  **This one turns `conformance:machines` red as it stands**, by condition 58h (drift item 8), and the
  entry says that gate stays green. The builder either keeps the three names reachable from
  `ContextView.tsx` in the shape the entry allows, being a hover title on the Refresh control or a
  disabled control's label, or changes the condition in `build/conformance-machines.mjs`, which puts a
  `build/` file in the commit and `gate:knownhosts` in the battery. The brief should rule which.
- `src/renderer/scm/RemoteHistorySection.tsx`, `RemoteBranchSection.tsx`, `RemoteRunsSection.tsx`
  with `src/renderer/machines/history.ts`, `branch.ts`, `runs.ts`: the twelve sentences under the
  groups, if the verifier expands the groups, which the entry's app run does not say it does. The
  builder should ask the brief for a ruling before touching them, because the entry's "What is NOT
  in this phase" does not exclude them and its mechanism does not include them.
- `src/renderer/arch/copy.ts:41` and its draw site: the Architecture sentence, same ruling needed,
  Phase 234 owns the view.
- Tests: `src/renderer/app/__tests__/p903-c-remote-copy.test.ts` (`EVERY` and the per sentence
  cases at `:247` to `:316`), `src/renderer/tree/__tests__/p903-b-tree-menu-remote.test.ts`,
  `src/renderer/app/__tests__/elsewhere-copy.test.ts`, `src/renderer/scm/__tests__/p104-commit-box.test.ts`,
  `src/renderer/search/__tests__/p98-remote-search.test.ts`, and `p105`, `p106`, `p107` only if the
  group sentences move; plus the new test the entry asks for, that no component imports a sentence
  taken off the face.
- `docs/BACKLOG.md`, the running log line, and `CHANGELOG.md`.

Not touched: `src/main/**`, so `conformance:machines` and `conformance:remoteclose` run for the
record only; `build/**` unless the verifier's probe moves there; the contract, since no channel moves.

## 7. Where a rebase will conflict

Phases 225, 228 and 229 launched together, 227 takes 225's slot when it lands, 230 follows.

| file | 228 | 229 | 230 | 225 / 227 |
|---|---|---|---|---|
| `src/renderer/app/Sidebar.tsx` | band, `:133` and five draw lines | `:191`, `:195`, `:230`, `:244` the create titles | `:344` decorations guard | |
| `src/renderer/machines/scm.ts` | band, note, standing | `:348` `remoteCommitDisabledReason` | | |
| `src/renderer/machines/explorer.ts` | tests only | `:170` `remoteEntryWritesOff` as the title | | |
| `src/renderer/scm/ScmSection.tsx` | `:894`, `:1380`, `:1465`, `:1495` | | `:795` `machineAnswering`, the five refresh buttons | |
| `src/renderer/tree/FilesSection.tsx` | `:373` stays | | `:231` to `:233` the sign-in hook | |
| `src/renderer/machines/presentation.ts` | `remoteReadAt` stays | | removes it | |
| `src/renderer/search/*` | idle body, titles, grep line | | `store.ts` remote arm | |
| `src/renderer/scm/RemoteRunsSection.tsx` | only if the group ruling says so | | `:58` and the hook | |
| `src/renderer/machines/` as a directory | copy modules | `dir-picker.ts`, `editor.ts` | one new hook | |
| `src/renderer/editor/tab-io.ts` | | `:459` the toast button | | 225 re-seeds here |
| `src/renderer/editor/redline-copy.ts` | | | | 227 |
| `build/electron-run.mjs` | | | | 225 |
| `build/ssh-run.mjs` | | | 230 | |

Phase 225 and 227 touch nothing this phase touches; the only shared directory is `src/renderer/machines/`
and they do not enter it. The real overlap is with 229 in `Sidebar.tsx` and `scm.ts`, both launched
now, and with 230 in `ScmSection.tsx` and `presentation.ts`, which is why the entry leaves the read-at
line and the five refresh buttons alone.

## 8. What this run did on his machines, counted

Far side, before: the `gmux` server held exactly one session, `gmux-control`, created 1787879931
(27 August), attached; two tmux processes, being the bundled tmux that started that server eleven
days ago and the `/usr/local/bin/tmux` client holding `gmux-control`; one socket file under
`/private/tmp/tmux-501`, `gmux`; `~/.ssh/authorized_keys` 88 bytes, 18 August, and no `known_hosts`.

Far side, after: the same one session with the same creation time, still attached; the same two
processes and no other; the scratch server on `gmux-p228-63591` killed and its socket file unlinked
in the same `finally`, so the socket directory holds `gmux` alone; `ls -d /Users/gdc/tortie-p228-scratch-*
/Users/gdc/tortie*` answers nothing; `authorized_keys` unchanged and still no `known_hosts`.

This Mac: the local `gmux` server held 13 sessions before and after, listed only; Tortie's own record
file 113 bytes and `~/.ssh/known_hosts` 2,215 bytes, both unmoved; the ssh agent holds no identities;
no Electron of this run survives, the eleven Electron family processes on the machine at the end
being his own app and the Phase 229 worktree's probe; the local scratch socket file
`/private/tmp/tmux-501/gmux-p228-63591`, dead, was unlinked by hand after the run, because
`build/electron-run.mjs` kills the scratch server and does not unlink either, which is the same
finding research 85 section 10 recorded for the far side and is worth one line in the helper.

Nothing was written under `/Users/gdc/gmux`. No token was spent. No agent was started anywhere.
