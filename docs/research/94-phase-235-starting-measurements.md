# 94. Phase 235, starting measurements

The measure step for Phase 235, the remote nits round. Written 2026-09-08 against the tree at
`1bbcd7c1`, which is the parent every number here was read at. The charter is the Phase 235 entry in
docs/BACKLOG.md and research 85 section 7's nits paragraph with sections 2 and 4.5. Nothing here was
built. The tree was read, the operator's Mac Pro was driven under Phase 224's bounds, and the five
gates the charter names were run to log files.

Everything under `.p235/` in this tree is this step's own: the probe that took the parent reading,
the far side fixture it wrote and removed, the five run reports, the blackhole timing, the
classifier reading and the gate logs. `.p[0-9]*/` is gitignored, so none of it is committed; this document is.

## 1. The answer first

All five hold at the parent and every one of them is now a number rather than a description. Two
things the charter implies are not true of the tree and are named here so the round does not follow
them: the probes it says are committed under `.p224/` are in no commit anywhere (section 5), and a
confirm hash that moves does not clear a machine's held agent answer, so it is not the gesture that
reproduces item 5 (section 4.2).

- **Items 1 and 2 hold and are one file.** Right clicked on a real tab holding a real file on his
  Mac Pro, the strip's menu carried **eight rows** and every one of them is a row the local tab
  carries, `Reveal in Finder` and `Copy Path` included; the only difference between the two menus in
  that run is `Keep Open`, which is about preview and not about machines. `tabMenuItems`
  (`EditorTabs.tsx:31`) never reads `tab.remote`, although the tab carries it. The tree menu two
  directories away already refuses the first verb and puts the machine in front of the second, and
  this phase can call that code rather than write its own.
- **Item 3 holds and both halves of the race are now measured rather than reasoned.** Research 85
  reasoned the 11 ms from two constants. Driven at 192.0.2.1 through `build/ssh-run.mjs` with the
  product's own options, ssh took **10,013 ms** and printed
  `ssh: connect to host 192.0.2.1 port 22: Operation timed out`, against a version read killed at
  10,000 ms. Asked of the SHIPPING classifier, that sentence answers `unreachable`, which is one of
  the eight classes that mean unreached; the empty string the killed child leaves answers `unknown`,
  which is not. The whole defect is 13 ms wide.
- **Item 4 holds exactly as research 85 wrote it.** Driven with one execution bearing field rewritten
  on disk and nobody re-confirming, the row read `changed`, `usable: false`, the link read `refused`,
  and the tab drew both false sentences: "Tortie is not connected to Greg’s Mac Pro, so it cannot
  read that folder." and "Greg’s Mac Pro did not answer, so Tortie could not read what changed." The
  machine answers ssh in the same run and Tortie never asked it. **0** actions were offered anywhere
  on the tab and the word "confirm" appeared **0** times in the whole document, while main held the
  true sentence and Settings held the button.
- **Item 5 holds, on one machine in one run, and the two numbers are 9 and 0.** Connected, the
  new-session grid drew 13 tiles with **9 unavailable**, each reading "<agent>, not on Greg’s Mac
  Pro"; on the same machine in a run where the sign in never succeeded, the same 13 tiles were drawn
  with **0 unavailable** and every one reading "Start <agent>", over an answer of twelve `unknown`
  with `askedAt: null`. The empty state under it then offers nine agents that machine does not have.

The whole parent reading, item by item, is section 4, and the five gates the charter names were green
at the parent (section 6).

## 2. The charter's citations, checked against the tree

Every row was read at `1bbcd7c1`. `git diff 761776a HEAD` over the files research 85 cited for these
five items moves nothing that changes any of them: `EditorTabs.tsx`, `prepare.ts`, `errors.ts` and
`agents.ts` are byte identical to the tree research 85 was written against, `machine-agents.ts`
changed only its liveness call (Phase 231) and `machine-state.ts` only gained the `feed` field.

| Charter says | Tree at `1bbcd7c1` | Drift |
|---|---|---|
| `tabMenuItems` in `src/renderer/editor/EditorTabs.tsx:30` | `function tabMenuItems(tab: EditorTab)` is at **:31**; `Copy Path` at :77 copying `tab.path`, `Copy Relative Path` at :86, `Reveal in Finder` at :92 with `disabled: !canReveal() \|\| tab.deleted` at :94 | One line. Research 85's table cites `:91`, which is the `items.push({` above the label. Content unchanged since `761776a` |
| "never reads `tab.remote`, although the tab carries that field" | Holds. `EditorTab.remote?: OpenFileRemoteRef` is `src/renderer/editor/tab-types.ts:174`; the string `remote` does not appear in `EditorTabs.tsx` at all | Holds |
| "`fs:reveal` opens Finder on this Mac" | `canReveal()` is `src/renderer/tree/fs-bridge.ts:29` and answers whether the bridge has `reveal`; it knows nothing about a machine | Holds |
| "Copy Path drops the machine prefix the Explorer adds" | Holds, and the prefix is one shared function. `pathsForClipboard(rootPath, canonicals, relative, machineLabel)` at `src/renderer/tree/tree-menu.ts:345`, called at `src/renderer/tree/use-tree-menu.ts:73` with `relative \|\| remote === null ? null : remote.label`, and the toast is `REMOTE_COPIED_WITH_MACHINE` at `src/renderer/machines/explorer.ts:204` | Holds. The tab strip calls neither |
| "`REMOTE_VERSION_TIMEOUT_MS = 10_000`" | `src/main/machines/prepare.ts:89`, used at `:179` and `:196` | Holds |
| "the phrase table's unreached branch is reached by reading what stderr HAD said" | `UNREACHED_CLASSES` at `prepare.ts:145` holds eight, including `timed-out` and `client-missing`. `PHRASE_TABLE` at `src/main/machines/errors.ts:110-157` holds FIVE entries and produces `not-resolved`, `no-server`, `refused`, `unreachable` and `auth-refused` — and **no phrase in it can ever produce `timed-out` or `client-missing`**, so those two members of `UNREACHED_CLASSES` are unreachable from a classified string | The charter's second door, "the timeout answering its own class", has no phrase to answer with today. It is a new class assignment rather than a table row |
| "the child was killed before stderr was read" | `spawnTmux` at `src/main/machines/exec-plane.ts:604` passes `timeout` and `killSignal: 'SIGKILL'` to `execFile`; `classifyExecFailure` at `:780` reads `e.stderr ?? ''` and asks `classifyMachineOutput(stderr)` at `:813` | Holds |
| "a row whose confirm hash moved says the machine did not answer" | Holds, and the mechanism is one branch. `machineStateViewOf` at `src/main/machines/machine-state.ts:124` returns `link: 'refused'` for `!row.confirmed` whatever the link facts say, and carries the row's own refusal on `detail`. The tree store then answers `notConnected` and `FilesSection.tsx:415-421` draws `remoteTreeNotConnected`; the Source control store's failed read draws `scm.ts:141` | Holds, measured in 4.1. Phase 230's rule that a stale view keeps its rows and draws nothing applies only AFTER a good read has landed, so a tab opened on a machine whose row moved draws both sentences from the first frame |
| "the same action Settings carries" | Settings draws `BTN_CONFIRM_CHANGED`, "Confirm the new details", at `src/renderer/settings/MachineRow.tsx:503`; the tab's own action, `MachinePrepareAction`, is drawn only while the link reads `quiet` (`src/renderer/machines/prepare-action.ts:38`), and a changed row reads `refused` | The action the tab needs is the CONFIRM one, not Phase 232's Prepare. `prepareActionOffered`'s own header says why `refused` is excluded, and this phase is the round that gives `refused` its own answer |
| "the disconnected new-session grid offers more than a connected one" | The mechanism holds. `machineAgentsView` at `src/main/machines/machine-agents.ts:330` binds a held answer to the connection generation and answers `unknown` for every agent otherwise; `machineAgentsFor` at `src/renderer/state/machines-slice.ts:216` INVENTS `{askedAt: null, agents: []}` for a machine with no view; `buildAgentOptions` at `src/renderer/state/agents.ts:293` greys only on a positive `absent` | Holds. But see section 4: the trigger is a machine that never signed in, not a confirmation that moved |
| "10 of 14 tiles are unavailable on a positive absence" | **9 of 13 is what the tree draws.** Measured off the DOM on a connected tab: 13 tiles, being 12 agents and Shell; 4 available (Claude Code, Cursor, Codex, Shell) and 9 unavailable, each with `aria-disabled="true"` and the aria label "<agent>, not on Greg’s Mac Pro". Main's own line in the same run: "greg-s-mac-pro answered about 12 agent name(s) in 34 ms. 3 were found and 9 were not", the three being `/Users/gdc/.local/bin/{claude,cursor-agent,codex}` | Both halves are one off. This document does not reconcile them and does not need to: what the phase must move is the DIFFERENCE between the connected grid and the disconnected one, and both counts are taken here in one run |

## 3. The data flow of the surfaces this phase touches, in ten lines

1. `<profile>/gmux/config/machines.json` is read by `src/main/machines/store.ts`; the agreement
   record `config-confirmations.json` is read by `src/main/machines/confirm.ts`, and the two
   together give each row its `state` and `confirmed`.
2. `machineStateViewOf` (`machine-state.ts:124`) composes one `MachineStateView` per row. **An
   unconfirmed row is `link: 'refused'` before any link fact is consulted**, and carries the row's
   own refusal sentence; a confirmed row takes the link and feed the control plane recorded.
3. `src/main/machines/control-plane.ts` writes `MachineLinkFacts`; `src/main/machines/liveness.ts`
   holds the two predicates, and `remote-run.ts` asserts one of them before a script byte is
   composed. `machines:state` pushes the views to the renderer's `useApp.machineStates`.
4. `prepareMachine` (`prepare.ts:196`) reads the version twice, the second read over the login shell
   door; a failure goes `classifyExecFailure` → `classifyMachineOutput` → `PHRASE_TABLE`, and only a
   member of `UNREACHED_CLASSES` makes `readRemoteTmuxVersion` answer `unreached`. Everything else
   answers `unreadable`, and `composeUnmeasuredDetail` (`errors.ts:503`) then names the program.
5. `machine-agents.ts` holds ONE answer per machine, keyed by bare launch name and stamped with the
   connection generation, written to no disk; `machines:agents` and `machines:agentsChanged` carry
   it to the renderer.
6. `machineAgentsFor` (`machines-slice.ts:216`) invents an empty view for a machine it has no row
   for, and `buildAgentOptions` (`agents.ts:293`) greys a tile only on a positive `absent`, so an
   absent answer and an empty answer are drawn as opposites of each other.
7. The Explorer's tree store answers a status word; `FilesSection.tsx:388-421` turns it into one of
   six sentences from `src/renderer/machines/explorer.ts`, and since Phase 230 draws none of them
   once a good read has landed — which means a tab whose machine was never read draws its sentence
   from the first frame and a tab that read once and then lost the machine draws nothing.
8. Source control, History, Branch, Runs and Context each have their own "did not answer" sentence
   in `src/renderer/machines/`, one file per surface.
9. `MachinePrepareAction` is drawn under those sentences and renders nothing unless
   `prepareActionOffered` reads `link === 'quiet'`, so a `refused` machine gets no action anywhere
   on the tab.
10. The editor tab strip is the one surface that composes its menu inline: `tabMenuItems`
    (`EditorTabs.tsx:31`) reads the `EditorTab` and nothing else, `showNativeMenu` sends it to
    `ui:popupMenu`, and `menu-popup.ts:136` raises the native menu — while the tree's own menu is a
    module of its own, `tree-menu.ts`, which takes `remote` and `caps` and is pinned by tests.

## 4. The parent reading, taken on his Mac Pro

One probe, `.p235/probe-p235-parent.mjs`, under Phase 224's bounds with the socket bound Phase 224's
committer added. Per run it made and removed one scratch git repository on his machine under
`~/tortie-p235-scratch-<pid>`, and drove up to five Electrons one after the other and never at once,
on one scratch profile with its own `machines.json`, its own `known-machines` and its own
confirmations; his own data directory was never opened for writing. It ran five times, because the
first pass could not reach two of the surfaces and section 9 says why; the readings below are from
the passes that reached them, and the census of what was left is section 10.

The five launches, and what each is for: **A** confirms the two rows in Settings through the real
buttons; **B** prepares his Mac Pro and registers the two projects, one on the far side and one
local; **C** reads the two tab menus, the connected grid and the blackhole's sentence; **D** reads
the tab after one execution bearing field moved on disk; **E** reads the grid on the same machine
with a row that cannot sign in. The second row in every profile is `192.0.2.1`, documentation address
space that routes nowhere, and it is what item 3 is driven against.

### 4.0 Items 1 and 2 — the editor tab strip on a machine

Both menus were composed by the shipping `tabMenuItems` and read from main's own print of the item
list, which is what `ui:popupMenu` was handed. The remote tab is the one whose identity names the
machine, `core1.ts on Greg’s Mac Pro. This view is read only.`

| Tab | Rows the menu carried |
|---|---|
| local | Close · Close Others · Close to the Right · Close Saved · Close All · **Keep Open** · Copy Path · Copy Relative Path · **Reveal in Finder** |
| **on his Mac Pro** | Close · Close Others · Close to the Right · Close Saved · Close All · Copy Path · Copy Relative Path · **Reveal in Finder** |

**The only difference between the two is `Keep Open`, which is there because the local tab was a
preview tab and the remote one was not.** Every verb is the same verb on both, including the two
this phase is about. For comparison, the same file's row in the Explorer offers four verbs on a
remote row and `p903-b-tree-menu-remote.test.ts` pins that `Reveal in Finder` is not among them.

`Reveal in Finder`'s enabled state is `!canReveal() || tab.deleted` (`EditorTabs.tsx:94`) and reads
enabled here: `canReveal()` answers whether the bridge has a `reveal` at all, the local tab's row was
live in the same run, and the tab was not deleted. See section 9 for why a driver cannot read the
flag itself.

`Copy Path` copies `tab.path` verbatim (`EditorTabs.tsx:79`), which for that tab is
`/Users/gdc/tortie-p235-scratch-<pid>/src/core/core1.ts` — an absolute path that names a folder on
the OTHER computer with nothing saying so. Both machines' home is `/Users/gdc`. The Explorer's own
Copy Path on the same file would put `Greg’s Mac Pro:` in front of it, through
`pathsForClipboard`, and say so in a toast. **The clipboard VALUE could not be read back in the
harness** (`navigator.clipboard.readText` throws `Document is not focused` in a shot launch, and the
renderer's `writeText` does not reach the system pasteboard from an unfocused window either), so
that last line is read from the source and from `tree-menu.ts`'s own pinned tests rather than
measured. The run saved the person's pasteboard and put it back, and `pasteboardRestored` read true.

### 4.1 Item 4 — a row whose confirm hash moved

One execution bearing field, `remoteTmuxPath`, was rewritten in the scratch profile's own
`machines.json` before the launch, and nobody re-confirmed it. What Tortie then held and what it drew
are two different things.

| Read | Value |
|---|---|
| `machines:rows` | `{"id":"greg-s-mac-pro","state":"changed","usable":false}` |
| `machines:state` | `link: "refused"`, `everAnswered: false` |
| main's own sentence, on `MachineStateView.detail` | "Tortie will not connect to **greg-s-mac-pro**, because its details changed after you confirmed them. Read the change and confirm it again if it is what you want. Nothing was started." |
| **What the tab's Explorer drew** | **"Tortie is not connected to Greg’s Mac Pro, so it cannot read that folder."** |
| **What the tab's Source control drew** | **"Greg’s Mac Pro did not answer, so Tortie could not read what changed."** |
| Actions offered anywhere on the tab | **0** (`[data-machines-action="prepare"]`) |
| Occurrences of the word "confirm" in the whole document | **0** |

Both drawn sentences are false: that machine answers ssh in this same run, and Tortie never asked
it. Research 85's reading is reproduced exactly, and Phase 230 did not soften it. **The two numbers
the phase must move are 0 and 0**: no action and no word saying what happened.

Three things beside the finding, each a fact this step measured and none of them queued:

1. **Main's true sentence names the machine by its id**, `greg-s-mac-pro`, where the two false ones
   name it by its label, `Greg’s Mac Pro`. If the phase draws main's sentence on the tab rather than
   writing a new one, it inherits that, and the naming rule in this house says a machine is called
   what the person called it.
2. **`machines.prepare` on a changed row answers JSON on a surface.** Its result read
   `class: "unknown"`, headline "Tortie will not sign in to this machine." and
   `detail: "{\"code\":\"INVALID_INPUT\",\"message\":\"Tortie will not c…"`, because
   `prepareMachine`'s context catch at `src/main/machines/prepare.ts:255` is `detail: sentenceOf(err)`
   and that error's message is a serialised payload. `MachinePrepareAction` puts `result.detail` on
   a hover title and Settings draws it in a block, so machinery can reach a person's screen. It is
   one line and it sits inside item 4's own file set.
3. **The contrast that proves the gap is a state and not a bug in one view.** In launch E the same
   machine, confirmed but unable to sign in, read `link: "quiet"` and the tab drew Phase 232's
   action, "Prepare this machine", **1** button. A `refused` row gets **0**. `prepareActionOffered`
   excludes `refused` deliberately and says so in its header; this phase is the round that gives
   `refused` the answer it does not have.

### 4.2 Item 5 — the disconnected grid offers more than a connected one

The same machine and the same 13 tiles, in one profile, read in launch C and again in launch E.

| The machine | `machines:agents` | Tiles | Unavailable |
|---|---|---|---|
| connected, signed in | 3 `present` (`/Users/gdc/.local/bin/{claude,cursor-agent,codex}`), 9 `absent`, `askedAt` set | 13 | **9**, each `aria-disabled="true"` reading "<agent>, not on Greg’s Mac Pro" |
| confirmed, never signed in this run | 12 `unknown`, `askedAt: null` | 13 | **0**, every one reading "Start <agent>" |

Main's own line for the connected read: "greg-s-mac-pro answered about 12 agent name(s) in 34 ms. 3
were found and 9 were not. The composed command was 1728 bytes against a cap of 131072." The empty
state under the grid then says "Click one to start it in tortie-p235-scratch-59098", which on the
disconnected reading offers nine agents that machine does not have.

**One thing the charter implies and the tree does not do.** A confirm hash that moves does NOT clear
a held answer *within a run*: in this step's first pass the app prepared the machine, the file then
changed under it, and the grid kept all nine greyed tiles. `machineAgentsView` binds an answer to the
CONNECTION generation, and a confirmation change does not bump it. So the state that offers
everything is a run in which the sign in never succeeded, which is the ordinary case for a machine
that was asleep at launch — research 85 section 4.4's own case. A round that tests item 5 by editing
`machines.json` mid-run will measure no change and conclude wrongly.

### 4.3 Item 3 — the unreached machine described as an unreadable program

Four readings, and together they close the 11 ms research 85 could only reason about.

| Reading | Value |
|---|---|
| one ssh to 192.0.2.1 with the product's nine options, through `build/ssh-run.mjs` | **10,013 ms**, exit 255, stderr `ssh: connect to host 192.0.2.1 port 22: Operation timed out` |
| the version read's own deadline, `REMOTE_VERSION_TIMEOUT_MS` | **10,000 ms**, `killSignal: 'SIGKILL'` |
| `classifyMachineOutput('')`, which is what the killed child leaves | **`unknown`** — not one of the eight unreached classes |
| `classifyMachineOutput('ssh: connect to host 192.0.2.1 port 22: Operation timed out')` | **`unreachable`** — one of the eight |

So the phrase table has the right answer and never sees the string, by **13 ms**, and
`readRemoteTmuxVersion` falls through to `{kind: 'unreadable'}` at `prepare.ts:205`. What a person
then reads is `composeUnmeasuredDetail` at `errors.ts:503`: "The program at /usr/local/bin/tmux on
this machine would not report its version. Tortie will not use a program it cannot identify. Nothing
was changed on either machine." Nothing was learned about any program on that machine, because
nothing reached it.

The classifier readings were taken by running the SHIPPING module under node
(`.p235/classify.mts`), not by reading the table.

### 4.4 Item 3, on the surface — what a person reads about a machine nothing reached

`machines.prepare` driven against the blackhole row in the same app run:

```
class:      "version-unmeasured"
headline:   "Tortie has not measured the program this machine runs."
detail:     "The program at /usr/local/bin/tmux on this machine would not report its version.
             Tortie will not use a program it cannot identify. Nothing was changed on either machine."
durationMs: 20,013
```

Twenty seconds, being the two version reads at 10,000 ms each, and at the end of them a sentence
about a program on a machine nothing ever reached. The class it should carry is one of the eight in
`UNREACHED_CLASSES`, and `COPY.unreachable` in `errors.ts:179` already holds the right words:
"Tortie could not reach this machine." with "Nothing was changed on either machine. The machine may
be off, asleep, or off the network."

## 5. The `.p224` probes, and what a verifier can actually re-run

**The charter's brief says the probes that took research 85's numbers are committed under `.p224/`
in this tree. They are not, and they are in no commit anywhere.** `.gitignore`'s last rule is
`.p[0-9]*/`, "Phase working directories", so every one of the eleven files research 85 section 11
names lived only in `/private/tmp/wt-p224/`, which no longer exists. `git log --all -- .p224`
prints nothing. A verifier planning to "re-run the p224 probe" must know this before it plans.

What survives is the SHAPE, and it is committed, because Phase 234 copied it forward:

| research 85's probe | What it did | What a verifier runs instead |
|---|---|---|
| `far-fixture.mjs` | made and removed the scratch repository on his Mac Pro | `build/p234/far-fixture.mjs`, which its own header says is a copy of it with the p234 prefix. `.p235/far-fixture.mjs` in this tree is that file with the prefix changed again, and it is what took the reading below |
| `probe-p224.mjs`, `b`, `c`, `d`, `e`, `f` | the five views, the writes, the boot comparison, the disconnected tab | nothing survives. `build/probe-p234-arch.mjs` is the p224-shaped app run with a grader and is the file to copy: the carriage, the five refusals, the far and local session census, the `finally` teardown and the launch helper are all in it |
| `blackhole.mjs` | the 10,011 ms ssh at 192.0.2.1 | `.p235/blackhole.mjs`, thirty lines over `build/ssh-run.mjs`, re-derived it at **10,013 ms**. This is the one research 85 number a verifier can re-take in ten seconds with no Electron and no far machine |
| `far-final.mjs`, `far-sockets-remove.mjs` | the closing count and the socket sweep | `build/real-machine.mjs`'s `listFarSessions`, `countOperatorSessions`, `hostKeyFileFacts` and `identityFilesUnmoved`, plus this document's own `finally`, which kills the scratch server AND unlinks its socket on both computers |

**Three of the five items need no far machine at all to take a parent reading**, which is worth
saying because it makes the fix round cheap:

- Items 1 and 2 are pure renderer composition over one `EditorTab`. Nothing about them asks a
  machine anything. The only reason the reading below was taken over the real link is that
  `tabMenuItems` is not exported, so today there is no way to ask it except by opening a real remote
  tab and right clicking it.
- Item 3 is two pure functions and one ssh to an address that routes nowhere.
- Item 5's arithmetic is `machineAgentsView` and `buildAgentOptions`, both pure.

Item 4 needs a machine row and a rewrite of one field, and no far side at all: the sentence comes
from `machineStateViewOf`, which never asks the machine anything for an unconfirmed row.

## 6. The gates the charter names, run at the parent

Each was run once, to its own log under `.p235/logs/`, and read from the log rather than piped.

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0. "no runtime cycles: 15 fixtures behaved, 1216 production files, 4167 runtime edges, 0 strongly connected components" |
| `npm run build` | exit 0, with `assert-hermetic-checks` classifying 174 check scripts and `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte` |
| `npm run conformance:machines` | **PASS**. "A machine confirmation is bound to the six fields that decide what runs, to the prefixed id, and to nothing else. Nothing was started by this gate." |
| `npm run conformance:remoteclose` | 1 file, **11 of 11** tests, 497 ms |
| `npm run gate:knownhosts` | 293 files under `build/`, 19 through the helper, **36 fixtures of which 32 must fail and every one did** |
| `npm run smoke:t1` | **6 of 6 PASS**, and its scratch server ended on `-L gmux-smoke-t1-wt-p235-<pid>` |

`gate:electron` and `gate:background` run inside `npm run build`, so they are green in that line.
`HELPER_USER_FLOOR` reads 97 at `build/assert-electron-teardown.mjs:161`.

## 7. The smallest set of files the builder must touch

Five items, and they are in four places. Nothing here needs a new channel, so
`docs/audits/contract-baseline.txt` does not move and the commit body has no line to name.

**Items 1 and 2 — one file today, and it should become two.**

- `src/renderer/editor/EditorTabs.tsx` holds `tabMenuItems` inline and unexported, so nothing can
  pin it. `src/renderer/tree/tree-menu.ts` is the house shape for the same job: a module of its own
  that takes what it needs and is pinned by `src/renderer/tree/__tests__/p903-b-tree-menu-remote.test.ts`,
  which asserts that a remote row's menu does NOT contain `Reveal in Finder` and that Copy Path
  carries the machine. Extracting `tabMenuItems` to `src/renderer/editor/tab-menu.ts` is what lets
  this phase's test be that test's sibling, and it is the smaller change of the two, because the
  alternative is exporting a function whose only caller is forty lines below it.
- The machine prefix is `pathsForClipboard` in `src/renderer/tree/tree-menu.ts`, already exported,
  already taking `machineLabel` as its fourth argument and already leaving a RELATIVE path alone.
  Call it. The label comes from `machineLabelFor(machineStates, id)` in
  `src/renderer/state/machines-slice.ts`, and the toast a person then reads is
  `REMOTE_COPIED_WITH_MACHINE` in `src/renderer/machines/explorer.ts`. Writing a second prefixer
  would be the defect the growth guardrail names.
- `src/renderer/editor/tab-types.ts` needs nothing: `EditorTab.remote` is already there.

**Item 3 — one file, and the charter's two doors are not equally open.**

- `src/main/machines/prepare.ts`. The cheap door is `readRemoteTmuxVersion`'s catch: ask whether the
  child was killed on the deadline rather than whether the phrase table recognised its silence, and
  answer `{kind: 'unreached', cls: 'timed-out'}`, which is already a member of `UNREACHED_CLASSES`
  and already has copy in `errors.ts`'s `COPY` table. The evidence the fix works is the class, not
  the sentence.
- The other door, "reading what stderr HAD said before the kill", needs
  `src/main/machines/exec-plane.ts` to stream stderr rather than take `execFile`'s buffered
  `e.stderr`, which is a change to the one spawn shape every far side verb goes through. It is the
  larger door and this document does not recommend it for a nits round.
- `src/main/machines/errors.ts` is touched only if the round decides `timed-out` should also be
  reachable from a phrase, which it is not today. Note that `client-missing` is unreachable from
  `PHRASE_TABLE` too, and nothing in this phase needs it to become reachable.

**Item 4 — two files, and the action is the confirm one.**

- `src/renderer/machines/prepare-action.ts` and `src/renderer/app/MachinePrepareAction.tsx` are the
  Phase 232 shape to follow, and following it is one predicate and one component: a machine whose
  row moved gets a row-scoped action that opens Settings at that machine, the way the Prepare button
  reaches `machines.prepare`. The label is Settings' own `BTN_CONFIRM_CHANGED`, imported rather than
  retyped, which is the rule that file's header already states.
- The sentence must be ONE short line and it must come from `src/renderer/machines/`, because the
  vocabulary audit reads that directory. Main already composes the correct words and puts them on
  `MachineStateView.detail`; the tab can draw that rather than write a second one, and if it does
  the round must fix that main's sentence names the machine by its **id**, `greg-s-mac-pro`, where
  every other sentence in the product names it by its label.
- The four views that mount the action are `src/renderer/tree/FilesSection.tsx`,
  `src/renderer/scm/ScmSection.tsx`, the Search sidebar and the Context sidebar, and Phase 232
  already put `MachinePrepareAction` in all four.

**Item 5 — one file, and the ruling is already written in it.**

- `src/main/machines/machine-agents.ts`. `machineAgentsView` drops a held answer whose generation
  moved, which is what turns nine absent tiles into nine offered ones. The charter's ruling,
  "disconnected offers what was last known, or nothing, never more", is a change to what that
  function answers when `live` is null and `row` is not: it can answer the last known presences with
  a stale mark, or it can answer nothing at all and the grid can draw nothing.
- If the answer is "nothing at all", the second file is `src/renderer/state/machines-slice.ts`,
  whose `machineAgentsFor` INVENTS an empty view for a machine with no row, and an invented empty
  view is precisely "offer everything". The round has to decide which of the two invents.
- `src/renderer/state/agents.ts` should not move. `buildAgentOptions`'s "only a positive absent may
  grey a tile" is research 58's ruling and this phase is not the round that changes it.

## 8. Where a rebase will conflict, so the committer knows before it happens

Six phase worktrees are open beside this one, and five of them are in the editor.

| Phase | What it is | Overlap with this phase |
|---|---|---|
| **241, right-click in the editor** | a native menu on the Monaco body | **The real one.** Its Group C names `Copy Path`, `Copy Relative Path` and a reveal "if a reveal already exists to call", composed from `tree-menu.ts:295` and `result-menu.ts:111`. It is the SAME two verbs on the SAME kind of tab, one surface lower. If this phase extracts `src/renderer/editor/tab-menu.ts` and Phase 241 writes its own composer, the product ends with two editor menus that answer the remote question differently, which is exactly the defect item 1 is. **The committer should tell whichever lands second to call the first's composer.** No file is shared today, so git will merge them silently and the divergence will be invisible in the diff |
| **240, the guarded save** | `src/renderer/editor/tab-io.ts:693` and `src/main/fs/` | None. It touches the save path; this phase touches the menu that sits above it. `tab-io.ts` is untouched here |
| **236, 237, 238, 239, the redline** | `src/renderer/editor/redline*`, `rewind.ts`, `baseline.ts`, `RedlineDocument.tsx` | None by file. `conformance:redline` rule 9's file set is DERIVED as every file under `src/renderer/editor` named `redline*`, `Redline*`, `rewind.ts` or `baseline.ts` with a floor of fourteen, so **a new `tab-menu.ts` does not enter that set and does not move that floor**. A new file named `redline-anything` would, and this phase writes none |
| **230, the staleness rewrite** | `src/renderer/machines/`, `FilesSection.tsx`, `ScmSection.tsx` | Landed. Its rule decides WHEN item 4's two false sentences are drawn: only while `readAt === null`, which is exactly a tab whose machine was never read. If another staleness round is queued it will touch the same four views item 4's action is mounted in |
| **any other remote round** | `src/main/machines/ipc.ts` | Phase 232 and Phase 233 both added handlers there and git merged them with no conflict, because they sit in different blocks. This phase adds no channel, so `ipc.ts` need not move at all |

One more, and it is a gate rather than a phase. `npm run conformance:machines` reads
`src/main/machines/` and `npm run conformance:logins` reads `src/main/logins/`; item 3's change is
inside the first and item 4's is not inside either, being renderer copy. `gate:knownhosts` and
`gate:background` scan `build/`, so a probe this phase commits raises `HELPER_USER_FLOOR` in the
same commit — it reads **97** at `build/assert-electron-teardown.mjs:161` in this tree, four above the 91 the
Phase 234 entry records, so phases have been raising it under each other and it is the one integer
two phases in flight can both want to change.

## 9. What this step did not measure, and why

- **The Explorer's tree was never read off the DOM.** Pierre's file tree lives inside
  `file-tree-container`'s shadow root (`src/renderer/tree/FileTree.tsx:272`), and two passes of this
  probe read the Explorer sidebar as the single word `EXPLORER` with the tree invisible to both a
  plain `innerText` read and a walk that follows open shadow roots. The remote editor tab was opened
  from Source control instead, which draws plain rows and opens the same tab. **A verifier planning
  to read the remote tree off the DOM should budget for this rather than discover it**, and should
  reach the tree through `hostRef.current.querySelector('file-tree-container').shadowRoot` the way
  the component's own code does.
- **The enabled flag on a native menu row is not readable from a driver.** `window.gmux` is exposed
  through `contextBridge` with `contextIsolation: true`, so the bridge object is frozen: an
  assignment to `window.gmux.popupMenu` is accepted and does nothing, and
  `Object.defineProperty(window, 'gmux', …)` throws `Cannot redefine property`. Both were driven in
  this tree. What main prints under `GMUX_SHOT_POPUP_PICK` is the label list and the picked id
  (`src/main/menu-popup.ts:112`), and it does not carry `enabled`. So the reading below is that the
  row is OFFERED, and its enabled state is read from the source: `disabled: !canReveal() ||
  tab.deleted`, with `canReveal()` true in the same run because the local tab's Reveal works.
  **A phase that wants `enabled` in a probe should add it to that one printed line**, which is a
  harness knob and not a product surface.
- **No agent turn, no token, and nothing was installed on either computer.**
- **The 90,000 byte ceiling, the write verbs and the five nav views were not re-measured.** They are
  research 85's and this phase does not move them.

## 10. What was left on either computer

Read at the end of the last run, after the `finally`.

**His Mac Pro.** `-L gmux` held `gmux-control created 1787879931 attached 1` before every run and the
same one after, and it was only ever LISTED. `/private/tmp/tmux-501` held `gmux` alone before and
`gmux` alone after: **this phase's own scratch server was killed AND its socket unlinked in the same
`finally`**, which is the bound Phase 224's committer added and which Phase 224 itself did not keep.
`ls -d /Users/gdc/tortie-p235-scratch-*` answered nothing. The one scratch repository each run made
was removed by its own teardown, which printed `GONE`. `~/.ssh` and `~/.gitconfig` were never written;
the git identity the fixture needs is set with `git config --local` inside the scratch repository.
Nothing was installed and no agent ran.

**This Mac.** `-L gmux` held **19** sessions before and 19 after, only ever listed.
`/private/tmp/tmux-501` was left holding `gmux` alone plus whatever another phase's run was holding at
that moment; every `gmux-p235-*` socket this phase made was unlinked, and never while a process held
it. Tortie's own `known-machines` stayed at 113 bytes and `~/.ssh/known_hosts` at 2,215 bytes, both
byte identical before and after every run, and every ssh went through `build/ssh-run.mjs`, which
`gate:knownhosts` is what enforces. His `~/Library/Application Support/Tortie` was never opened for
writing: every run had its own profile under `/private/tmp/p235-run-<pid>/profile` with its own
`machines.json`, `known-machines` and confirmations. The system pasteboard is saved before the run and
put back in the `finally`.

**One leaving that was this step's own and was cleaned by hand.** The first pass of the probe had no
socket unlink in it, and it left `gmux-p235-67483` on both computers. Both were removed the same
minute, after `lsof` said nothing held either, and the unlink is in the probe's `finally` now. That is
the same defect research 85 section 10 records for Phase 224, met again by the first script written
after it, which is the argument for the bound rather than the reminder.

## 11. One note for the verifier, on the operator's rule

His rule of 2026-09-07 is that a remote tab feels almost identical to a local one and that the
verifier reads the two faces side by side. This step did not compute the remote-only sentence set,
because none of the five items adds a sentence to a resting face: items 1 and 2 REMOVE a row and
change what a verb copies, item 3 changes which of two existing sentences a refusal picks, item 5
changes which tiles are drawn, and item 4 is the one that adds anything — and the charter binds it to
"one short sentence and the same action Settings carries", which is a control's label plus one line.

What this step DID read on a remote tab, so a verifier knows the standing baseline before the phase
touches it: on a machine that could not sign in, the tab carried
"Greg’s Mac Pro did not answer, so Tortie could not read what changed.", the button
"Prepare this machine", and the bar "Tortie could not reach Greg’s Mac Pro. Sessions you started
there are not shown here, and Tortie did not end any of them." The first and third are Phase 230's
and Phase 232's, the second is a control's label, and none of them is this phase's to defend.
