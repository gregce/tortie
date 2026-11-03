# Phase 352 — "would we be able to batch them into a big phase? that is logical based on parts of the codebase they touch" and "can we consolidate these as less batches? i don't think they should take a week and can probably be reviewed together" — files, folders and checks — SPEC

Written by the spec step on 2026-11-02 in `/private/var/tmp/tortie-wt/wt-p352`, a detached worktree at origin/main
`8b63abc1` ("docs(backlog): queue 352 and 353, the older entries in two phases by the code they touch"). **`git diff
8b63abc1` in the worktree must be exactly Phase 352's delta**, this file included. origin/main moves while the phase
runs (Phase 350 lands beside it); nobody here rebases, pulls or merges. The charter is `docs/BACKLOG.md` "## Phase 352"
(`:44220`) and the nine entries it names, each binding as written with its mechanism, its proof and its refusals:
274.1 (`:28243`), 274.2 (`:28304`), 274.3 (`:28345`), 283 (`:29122`), 285 (`:29355`), 290 (`:30357`), 307
(`:32585`), 308 (`:32667`) and 310 (`:32997`). His standing rulings bind: no regression against today; just enough
words; nothing released, tagged, version-bumped, archived or uploaded; his session count is allowed (2026-11-02), being
`build/electron-run.mjs`'s read-only `list-sessions` of `-L gmux` and nothing else.

| | |
| --- | --- |
| Subject | `fix(editor): rewind and auto save hold, and folder names agree` (the section's; see §13 if 283 stays closed) |
| First body line | `Phase 352: files, folders and checks` |
| Semver | Patch, unreleased, Mac only, released on his word |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (three lenses, reviewed together) → [Fix once → Reverify] → Commit |
| Items built | **290, 274.1, 274.3, 285, 307, 308, 310** (seven) |
| Items closed | **283** (did not reproduce in 13 runs at this tree, 11 of them under load, §2.1) and **274.2** (its entry's deciding measurement is one his standing rules forbid us to take; its default without it is "leave it alone", §2.3, Q1) |
| Tier, per item | **3**: 290, 285, 310 (and 283, 274.2, closed). **2**: 274.1, 307, 308. **1**: 274.3. Each verified at its own tier, reviewed together (CLAUDE.md, "Mixed rounds verify per item at its own tier") |
| Menus | **No change.** `src/main/menu.ts` is not edited by anyone; its sha256 at this head is `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3` and must read the same at the end (307's refusal, carried) |
| Contract | **No change.** No channel, schema, `gmux.*` key, `GMUX_*` name or smoke mode; `docs/audits/contract-baseline.txt` does not move |
| `HELPER_USER_FLOOR` | **Unchanged at 179.** No new script reaches `build/electron-run.mjs` (D22) |
| CHANGELOG | Four items under `## Unreleased`, `### Fixed` (§5): 290, 274.1, 274.3, 310. None for 285, 307, 308 |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p350*`.
- Scratch lives under `/private/var/tmp/tortie-wt/scratch/p352/<role>/`, never under `/private/tmp`, which macOS cleans.
  A probe's `TMPDIR` points there too (the harness run folder is `${TMPDIR}/<socket>`).
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** No command, script or
  verb of yours aims at it, ever: not a count, not a `capture-pane`, nothing. **The committed probes this phase runs
  (`probe:p268`, `probe:p277`, `probe:redlinemoveon`, `probe:p237*`) each count `-L gmux` THEMSELVES at this head** (§3):
  run them only once this phase has converted them (D18); a parent measurement of one runs a scratch copy with that
  count removed and `tmuxSocket` named, the way §2.1's copy is made (`/private/var/tmp/tortie-wt/scratch/p352/spec/bin/make-p268-copy.mjs`).
  A census finding naming a session your run did not make is his own activity: note it and run that probe once more.
  A session of your run's making on `-L gmux` is a major problem: stop and report.
- **No real agent runs, not even for a version.** Every app run hides every probed registry row first
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))` from `build/hidden-agents.mjs`) and reads the app's own
  `agents:list` back (`AGENTS_LIST_EXPR`, `standInsOnlyVerdict(list, { standIns: [] })`), a run whose answer is not ok
  being UNREADABLE. Measured why (§2.1, run 0): the committed `probe:p268` hides nothing, and its launch ran the
  installed `cursor-agent` (it wrote a session log in the run's `TMPDIR` and announced `analytics.track cli.launch`
  toward `api2.cursor.sh`) and `opencode` (a temp folder) for their versions.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.claude.json`, `~/.codex`, any agent's or
  conversation store, his shell history's contents, or his live Tortie profile. Real data means committed fixtures:
  310 reads `docs/research/assets/63-fixtures/` and records `build/p300/generate-codex-records.mjs` synthesises.
- His shell history is never written by us: every command that does not launch an Electron runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. `/bin/ps` will not start under it, so the four
  native tests that start `/bin/ps` (`src/main/proc/__tests__/ps.native.test.ts` among them; name each as it fails)
  fail inside it by design: never run them outside it, and run the native lane as the two files 308 moves (§10.4). Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run that starts a shell or the app. His own
  terminals append on their own: a move across an unblocked run means start nothing for 3 minutes and stat again;
  moved again is his, still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming them;
  every process you start ends in a `finally` (a load generator above all: bounded by a hard deadline, killed by pid in
  a `finally`, counted at the end). Never signal a probe while its own teardown runs. Every Electron goes through
  `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and socket. No Simulator;
  nothing under `ios/` moves. No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or `smoke:machines`.
- Never import a `build/` script to inspect it; read it as text. Importing `build/electron-run.mjs` and
  `build/hidden-agents.mjs` to USE them is how a probe launches, and driving `electron-run.mjs`'s exported pure census
  functions is how `gate:electron` already proves them.
- The lock has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p352 <role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` from a `trap`. Every
  probe, app run, package build and timing measurement holds one; Phase 350 takes slots too. `df -h /` before any
  build; under 8 GB free, wait and report.

## 0.1 What the entries got wrong at this tree (the tree wins; each correction is binding on the builders)

**274.1** (`tortie .` from a shell that spells the folder its own way)
1. **The fix the entry names does not fix it.** The shim is `#!/bin/sh`, and `/bin/sh` on this Mac is bash
   (`/private/var/select/sh -> /bin/bash`). Its builtin `pwd -P` resolves symlinks textually and KEEPS THE TYPED CASE:
   after `cd …/proj/realname` it answered `…/proj/realname` where the disk says `…/Proj/RealName` (§2.2). Only the
   external `/bin/pwd -P` (which calls `getcwd`) answers the disk's spelling, on the boot volume and on a freshly attached
   APFS image whose first lookup since mount was the wrong case. It also equals `realpathSync.native`, which is what the
   Finder door (`src/main/shell/arrival.ts:79`, `canonicalPathSync`) stores.
2. **It is not only case.** `pwd -P` also resolves symlinks and `/var → /private/var`, so a first open through a
   symlinked folder stores the target's path, exactly as a Finder or Dock arrival already does. The entry never named it.
3. **The measurement the entry said decides it cannot be taken**: it reads his shell history, which is never read.
4. **An installed shim is never rewritten.** `shimStatus` reads only the marker (`shim.ts:179-193`) and Settings offers
   `Remove` alone when the command is installed (`src/renderer/settings/GeneralSection.tsx:160-166`), so the change
   reaches a person who installed the command before only after Remove then Install. Stated in the CHANGELOG item, Q2.
5. Citations: `shim.ts:102` is unchanged; `addProject` is now `src/main/sessions/core.ts:3963` (entry `:3083`); the argv
   door is `pickShellOpenPath` (`src/main/shell/argv.ts`) feeding `noteShellOpenArgs` (`src/main/index.ts:254-273`),
   which keeps the argument byte for byte.

**274.2** (a mis-spelled project reads its agent context as empty) — **closed for this phase**
1. Its deciding measurement (key shapes in his `~/.claude.json` against Tortie's launch cwds, "the phase does not start
   without it") reads an agent's store, which his standing rule and this brief forbid; and no real agent may run here,
   so the direct substitute (one Claude Code launch from a mis-spelled folder in a scratch `HOME`) is forbidden too.
2. What was measured instead (§2.3): tmux hands the program it starts TWO spellings, `PWD` = the `-c` spelling Tortie
   passed and `getcwd` = the disk's (3.7b vendored and 3.6a); research 22 VERIFIED Claude Code's session store under
   `dashEncode(case-correct realpath(cwd))` (claude 2.1.227). Both point to Claude Code keying by the disk's spelling,
   which is what the entry's second key would ask. Neither proves the `~/.claude.json` key itself, and a second key is
   untrue in one world (Claude Code keying by `PWD`, with an entry under the disk's spelling only), so building it could
   be worse than today there. The entry's two outcomes are "a second key" or "leave it alone"; without its measurement
   the no-regression answer is the second. Q1 offers him the three ways to decide it.
   **CORRECTED BY THE VERIFY LENS AND THE FIX ROUND (§As built, The fix round): that world does not exist.** The folders
   lens read Claude Code 2.1.316's own program text, read only, and ran no agent and read no store of his: it keys
   `~/.claude.json`'s `projects` by `hIe()`, the canonical git root, else `normalize(NFC(resolve(originalCwd)))`, where
   `originalCwd` is `NFC(realpathSync(process.cwd()))`, and `saveCurrentProjectConfig` writes `projects[hIe()]`. It never
   keys by `PWD` or by the spelling it was launched with. So the incident still happens at the parent and at HEAD alike
   (a wrong-case or decomposed stored path misses the composed key), and a second key by Claude Code's own rule would be
   true for this version. It is still not built: it needs `.normalize('NFC')`, which the entry refuses ("No
   case-folding and no `.normalize()`"), so it is his to decide (Q1, rewritten).
3. Citations: the lookup is `src/main/context/read/mcp.ts:281` (entry `:280-281`), the empty answer `:282`, the file's
   own size note `:268-269`; `scan.ts:151` unchanged.

**274.3** (an invisible character in a quoted path)
1. `src/main/fs/paths.ts:120-126` is now Phase 273's `FsPathRefusal` union and quotes nothing. The quoting sites a
   person reads are, measured (§2.4): `src/main/fs/errors.ts`'s `friendly` (11 sentences) and its `FALLBACK` pair;
   `paths.ts:284` (`"<name>" could not be read (<errno>).`) and `:794` (`"<name>" is no longer there.`);
   `src/main/fs/file-ops.ts:417`, `:486`, `:616`; `src/renderer/tree/entry-name.ts:68`; and
   `src/renderer/editor/save-sentences.ts`'s `saveRefusalSentence` (`:156-158`) and `staleSaveTitle` (`:169-171`).
   `paths.ts:658` and `:721` quote only `.` or `..` and need nothing.
2. **New, measured, in the same lines**: `saveRefusalSentence` fills `{name}` with a STRING replacement, so a file name
   holding `$'`, `$&`, `` $` `` or `$$` is mangled (§2.4: `a$'b.md` printed the template's tail twice). The function
   form of `replace` fixes it for free; it is in (D7).
3. A photograph cannot show the defect (the character has no glyph); the proof reads code points from the DOM (§10.2).
4. `assertBasename('​')` accepts a name that is only a zero-width space. What is refused does not change (the
   entry's refusal); it is noted, not built.

**283** (a file outside every project, written by the timer once) — **closed**: 13 runs of arm G at this head, 11 under
a 12-burner load (load average 13 to 155), 0 repeats, every per-tick reading constant (§2.1). Its entry closes it with
the readings rather than changing a rule nothing has shown to be wrong.

**285** (a probe goes red because he used his own machine)
1. The census lines the entry cites still stand: `liveSessionNames` `build/electron-run.mjs:539-550`, `censusFinding`
   `:568-591`, the read above the spawn `:934-938` (`const censusBefore = tmuxSocket !== null ? liveSessionNames() :
   null;`), the read after teardown `:1083-1097`.
2. **The population moved** (§2.5, the spec's own reader, comments removed): 109 scripts under `build/` besides the
   helper and its gate aim `'-L', 'gmux'` in argv form (entry: about 130); 101 of them reach the helper, 42 passing
   `tmuxSocket: null` only, 41 omitting the key, 18 naming a socket (entry: 117, 43, 51).
3. **His ruling of 2026-11-02 changes mechanism 5.** No script but `electron-run.mjs` may name `-L gmux`, so "lose
   their bare comparison and PRINT THE TWO NUMBERS" is no longer possible: the converted probes lose the count entirely
   and the helper's census covers them (D18). The ceiling counts every script that aims a tmux argv at `-L gmux` at all,
   not only those that turn a count into a failure (D17).
4. **Tabs do not survive a client without a UTF-8 locale.** `list-sessions -F` with tab separators answered `_` for
   every tab to a client with no `LANG` (3.6a and 3.7b, measured, §2.5), and tabs with `-u` or `LANG=en_US.UTF-8`. The
   new reader therefore passes `-u`, and **rule 5f's scanner must then learn to find the verb past a client flag**: its
   regex today is `\[\s*'-L'\s*,\s*'gmux'\s*,\s*'([A-Za-z-]+)'` (`build/assert-electron-teardown.mjs:1415`), which
   finds no argv in `['-u', '-L', 'gmux', 'list-sessions', …]` and would read `-u` as the verb of `['-L', 'gmux', '-u',
   …]`, so either placement turns 5f red unless the scanner moves with it (D16).
5. **308's finding 2 was never folded in.** 308 told the next round to edit 285 in place with three clauses (the WENT
   arm flips to a note only when the launch's own announcement SPOKE and agreed; rule 5f widens over every script that
   reaches the helper; the guard reads nothing new); 285's text was not edited. They bind here (D14, D16).
6. `gmux-control` is unstamped by design (`src/main/tmux/control-client.ts:116`, `RESERVED_TMUX_NAMES` in
   `src/main/tmux/names.ts:54`), so judgement (b) fails a probe if his own app creates it mid-run. That is "what the
   probe could have done" (a probe's app pointed at his server makes it too) and stays fatal, stated.
7. Six research scripts aim a COMPUTED verb at `-L gmux` (`['-L', 'gmux', ...a]`) and do not reach the helper:
   `build/p245/refused-family.mjs`, `build/p245/root-cost.mjs`, `build/p247/offer-cost.mjs`, `build/p250/funnel.mts`,
   `build/p253/funnel-before-after.mts`, `build/p253/vscode-catches.mts`, and a seventh the checks lens found and the
   ceiling did not count until the fix round, `build/p245/corpus-scan.mjs:187` (`const SOCKET = 'gmux'; ['-L', SOCKET,
   ...a]`, which runs `list-sessions`, `show-options`, `list-panes` and `capture-pane -p -S -` against his live sessions).
   Out of 5f's scope by 308's wording, inside the ceiling; Q5.
8. `DEVELOPMENT.md`'s lines moved: the census and count sentences are now at `:157-162`, `:287`, `:300`, `:316`,
   `:354`, `:371`, `:448-449` and `:532` (entry: 99, 225, 238, 254, 292, 309-310, 386-387, 470).
9. `gate:electron`'s arms: 5d at `:1581-1640` (it REQUIRES `censusFinding(['a','b'], ['a','b','shell-1-6'])` to be a
   finding, which is today's defect pinned: PASS at this head, §2.5), 5f's scanner and fixtures at `:1411-1426`, 5h at
   `:1173-1410`, the census ablation's `from` string at `:1493`.

**290** (a rewind's caution belongs to the file) — reproduces exactly as written (§2.6) IN THE UNIT RIG. **At the parent
BUILD the File view's tail no longer does** (the editor lens, three app runs): since Phase 334 the Redline view focuses
its scroller on every mount (`RedlineDocument.tsx:421-424` at the parent) and the arrival read on focus
(`:1183-1195`, floor 1 s) loads a CLEAN tab, so after the File view's ⌘Z the parent reads "NO READ in 2500 ms" with
`savedContents` the agent's text, and then draws two changes, the rewound one not among them, with nothing drawn
backwards. The chain to `[wrote REWOUND, wrote AGENT]` still runs at the parent through a DIRTY arrival, which that read
skips: a tab switch or a project switch and back while dirty, ⌘S then Cancel then a switch, and a second rewind. Arm M's
tab sub-arm (the fix round) drives the first of those. Citations moved:
`RedlineDocument.tsx`'s hold is `:333`, emptied on `tab.id` at `:389-392` (entry `:372-377`); `adoptWritten` is
`tab-io.ts:2048` (unchanged); `markDirty` is `store.ts:1543-1621` (entry `:1457`); the STATED LIMITS block is
`p2822-second-undo.test.ts:841` with its two seeds at `:872` and `:886` (entry `:829`). Every accept is refused while
ANY hold stands on the tab (`redline-accept.ts:123`, `deps.holds.length > 0`), so ⌥↩ asks a list, not a landed flag.

**307** (two gate clauses whose sentence is wider than their test) — every shape reproduces (§2.7). Moved:
`gate:background` now reads **578 files, 3 starts, 19 of 19 fixtures** (entry 443, 2); `gate:knownhosts` **606 files,
19 reaching `build/ssh-run.mjs`, 36 fixtures, 32 must fail** (entry 471). `menu.ts`'s sha256 is `fe62e1dd…` (entry
`71e73039…`); Session `:895`, End Session `:913`, the resume row `:930`, `...agentHotkeyItems()` `:971`, Project
`:1002`, View `:1016`, Catch Me Up `:1132`. `menuNeedle`, `closingParen` and `itemCallAround` are in
`build/handback-conformance-probe.mts` (`:339`, `:351`, `:407`, caller `:442`), not in `conformance-handback.mjs`;
`placedAfterEndSession` is `conformance-handback.mjs:389`, the sentence `:458`, the table label `:777`. **"Byte
identical" cannot hold for whole lines**: each gate's files-read count rises by exactly the scripts the phase adds under
`build/` (one, `build/p307/ablation.mjs`), and `gate:background`'s fixture count by exactly the fixtures mechanism 5
adds. Every other word of each line is byte identical.

**308** (the native watcher lane under a busy Spotlight) — the drop mechanism reproduces (§2.8). Moved:
`repo-watcher.ts`'s `observation` is `:296`, `noteDrop` `:478`, the flush `:505` (entry `:210`, `:376-395`,
`:405-421`); the test's lines are as cited within one. Under this phase's history block the whole `npm run
test:native` cannot be green (the four `/bin/ps` tests), so its "ten consecutive runs" are of the two files 308 moves
(§10.4).

**310** (the scanner copies a line it is about to reject)
1. `src/main/overview/reader/lines.ts:240` (`const c = Buffer.from(seg);`) is unchanged.
2. **The copy is wider than the entry says.** It is not only head-ADMITTED lines: a line shorter than the head window
   stays undecided until it ends, so it is copied whatever the head then decides. Measured (§2.9): 3,030 lines, 95,244,780
   bytes; 3,120 copies of 95,241,750 bytes; 1,030 parsed, 1,000 rejected on the head and 1,000 on the whole line, under
   the default 512-byte head and the 4 MiB wide head alike.
3. **A consumer KEEPS the line**: `build/overview-conformance-probe.mts:334-344` (stage 2 of `--stages`, which
   `measure:p300-split` drives) pushes `line` into `admitted` and parses the array after `scanFile` returns. A view into
   the reused chunk would be overwritten under it. The one production consumer (`containers.ts:178-206`) parses inside
   the callback and keeps nothing. So the fast path states its contract and that instrument copies what it keeps (D21).

## 1. The answer first

| Item | Verdict | One line |
| --- | --- | --- |
| **290** | **build** (Tier 3) | The rewind's owed read moves from the mounted view's array to a mark on the tab, set where `adoptWritten` refuses and cleared by a clean read or a save; two doors pull the read and ⌥↩ asks it. The parent's chain `[wrote REWOUND, wrote AGENT]` reproduces (§2.6) |
| **274.1** | **build** (Tier 2) | The shim asks `/bin/pwd -P` (not the builtin, measured to keep the typed case), with today's `pwd` as the fallback, so a first `tortie .` stores the disk's spelling, as Finder does; since the fix round only for a path of plain printable ASCII, every other path handed on as the shell spells it, as today |
| **274.3** | **build** (Tier 1) | One pure `visibleName` in `src/shared/` writes every invisible character as `<U+XXXX>` in the fs refusal sentences and the save sentences; the save sentence stops reading `$` patterns in a file's name |
| **285** | **build** (Tier 3) | The helper's census reads rows by `$-id` with `-u` and judges each fresh session by identity: this launch's manifest or scratch root, or still unstamped after a re-read, fails; anything else is his and is a note. A session that went, or one renamed, is a note only after an agreeing announcement. Seven probes lose their own count; the ceiling holds the rest. Since the fix round it reads only around a launch that names a scratch socket (D15 dropped) |
| **307** | **build** (Tier 2) | One receiver test in `build/scan-source.mjs`; the background gate drops a regex receiver and a declaration header and nothing else; the handback gate gains menu membership and true adjacency; `ablation:p307` |
| **308** | **build** (Tier 2) | Every negative assertion re-takes its window on a counted drop (three at most, then fails); the settle sleeps become a sentinel barrier; the store test prints its disk reads on timeout |
| **310** | **build** (Tier 3) | A line wholly inside the chunk is handed to the parse as a view, copying nothing; a line that crosses a chunk is copied as today; no count moves |
| **283** | **closed** | 13 runs, 0 repeats (§2.1) |
| **274.2** | **closed** | Left alone; its premise was refuted by the verify lens (§0.1 274.2), and the second key Claude Code's rule would need is a `.normalize()` the entry refuses; Q1 |

### 1.1 The decisions, each with its reason

| Id | Item | Decision | Reason (where it comes from) |
| --- | --- | --- | --- |
| D1 | 283 | Closed with every reading, nothing built | Entry: "if twenty loaded runs do not reproduce it, say so and close the entry with the readings, rather than changing a rule nothing has shown to be wrong", and refusal 1. The brief capped the measurement at 20 minutes; 13 runs fit (§2.1) |
| D2 | 274.2 | Closed: left alone | Entry: the measurement chooses between a second key and "leaving it alone", and "the phase does not start without it"; his standing rule forbids the measurement. No regression against today forbids the second key unmeasured (§0.1). CORRECTED IN THE FIX ROUND: the lens's read of Claude Code 2.1.316's program text answers the measurement's question (it keys by the composed realpath or the git root), and the second key it implies needs a `.normalize()` the entry refuses, so it stays closed for his word (Q1) |
| D3 | 274.1 | `abs=$(cd "$dir" 2>/dev/null && { /bin/pwd -P 2>/dev/null \|\| pwd; }) \|\| {` replaces `:102`; IN THE FIX ROUND, only for a path of plain printable ASCII (§As built, The fix round) | The entry's subject ("the shim hands main the folder the disk has"); M2741: only the external `/bin/pwd -P` gives it; `/bin/pwd` by absolute path so no PATH entry can stand in for it; the logical `pwd` as fallback keeps today's answer wherever the physical read fails (new, no regression) |
| D4 | 274.1 | No change to `addProject`, the argv door, `arrival.ts` or Settings | Entry's refusals ("No change to addProject … No canonicalising of a path anywhere else", "Nothing about a folder dropped on the Dock or opened from Finder"). The installed-shim limit is said in the CHANGELOG item and asked (Q2) |
| D5 | 274.3 | One pure helper `visibleName(text: string): string` in a new `src/shared/visible-name.ts`, exported once | One rule, used by main and renderer alike (`src/shared/` is append-only for a NEW file). The escape set: every code point of `\p{Default_Ignorable_Code_Point}`, `\p{Cc}`, `\p{Zl}`, `\p{Zp}`, and `\p{Zs}` other than U+0020, written `<U+XXXX>` (uppercase hex, at least four digits); EXCEPT U+200D when the code point before it is `\p{Extended_Pictographic}`, `\p{Emoji_Modifier}` or U+FE0F and the one after it is `\p{Extended_Pictographic}`, and U+FE0E/U+FE0F when the code point before is `\p{Emoji}`, so an emoji sequence keeps its glyph. Everything else passes byte for byte. Node 22's V8 12.4 answered `Default_Ignorable_Code_Point`, `Zs`, `Cc`, `Cf`, `Extended_Pictographic` and `Emoji` as expected (measured); Electron 43's V8 15 is newer. No `.normalize()`, no case folding (Phase 274's rule 23) |
| D6 | 274.3 | The sites are exactly §0.1 274.3 item 1's list | Entry: "the phase surveys the actual quoting sites rather than assuming this one". Out: session names (`subscriptions.ts:783,789`), dialog and tab titles other than `staleSaveTitle`, `redline-sentences.ts`'s held sentences (no fs refusal), the shim's own shell message, `src/main/manifest/reconstruct.ts:792` (not a person's surface) |
| D7 | 274.3 | `saveRefusalSentence` and `staleSaveTitle` fill the name with a FUNCTION replacer and `visibleName` | New, measured (§2.4): the string form reads `$` patterns in the name. Same line, no new surface |
| D8 | 290 | The mark is a field on the tab, `rewindOwesRead: boolean` in `src/renderer/editor/tab-types.ts`, false by default, never persisted | Entry mechanism 1 ("lives with the tab in the store … dies with the tab"); `tab-types.ts:201` already says tabs are not persisted. One name, so the gates and the probe read one spelling |
| D9 | 290 | Set in `adoptWritten` at its two refusals (a dirty tab; `savedContents !== was`); cleared by `refreshRepo`'s walk when it reloads that tab clean, and by a completed save of that tab | Entry mechanism 1. A clear only on those two, so nothing else can let a mark go unread |
| D10 | 290 | Two doors pull the read (`useEditor.getState().rereadRepo(tab.repoPath)`): (1) `markDirty`'s dirty-to-clean edge when the mark stands, placed AFTER `patchTab(…)` and `autoSave.noteChanged(id)`; (2) a Redline mount over a clean tab whose mark stands, and the existing `[tab.dirty]` effect asking `tab.rewindOwesRead \|\| <a landed hold of this mount>` | Entry mechanism 2; `conformance:save` rule 14's order kept and extended, never relaxed. The OR keeps every read Phase 282.2 pulls today and adds the mark's, so the change only ever reads more (no regression) |
| D11 | 290 | ⌥↩ asks the mark: `pressAccept`'s deps gain `owed: boolean` from the live tab, and `owed` answers `held` exactly as a non-empty `holds` does; the sentence is today's (`acceptDirty` on a dirty tab, `accept` on a clean one) | Entry mechanism 3: "No new sentence" |
| D12 | 290 | Phase 282.2's refusal "no read when no landed hold exists" is lifted for the mark only; "no read on the way into dirty" and "no adoption of remembered bytes" stand | Entry mechanism 4 |
| D13 | 285 | The reader: `spawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT])`, `CENSUS_FORMAT = '#{session_id}\t#{@gmux-id}\t#{session_created}\t#{session_name}\t#{session_path}'`, split at the FIRST FOUR tabs (the path takes the rest), keyed by `$-id`; a line that does not split into five, or whose id is not `^\$\d+$`, is an UNREADABLE row and fails closed | Entry mechanism 1, with §0.1 285 item 4: `-u` measured necessary; a session NAME never holds a raw tab (measured: 3.6a stores `a<TAB>b` as the four characters `a\tb`, 3.7b refuses it, `invalid session name: a_b`), so name before path splits unambiguously. `list-sessions` stays the one verb; `-u` is a client flag |
| D14 | 285 | The judgement, pure and exported, per FRESH `$-id`: **(a)** FAIL when its `@gmux-id` is in this launch's scratch `manifest.db`; **(a')** FAIL when its `session_path`, raw or resolved, is under one of this launch's scratch roots (both `/tmp` and `/private/tmp`, `/var` and `/private/var` spellings); **(b)** FAIL when its `@gmux-id` is empty and still empty in ONE re-read at least a second later; **(c)** otherwise a NOTE naming id and name, exit unchanged. Per `$-id` that WENT: FAIL, unless at least one `[gmux-socket]` line was captured and every one equalled the scratch socket this launch asked for, then a NOTE. A rename is nothing. The ids come from `/usr/bin/sqlite3 <userDataDir>/gmux/manifest.db 'SELECT id FROM sessions;'` after teardown (the run's own scratch database, never his), ids checked against `^[A-Za-z0-9-]{1,64}$`; when that read fails on an existing file and a fresh STAMPED session exists, FAIL ("could not tell this launch's sessions from his") | Entry mechanism 2 and 3, and 308's clauses 1 and 3. The scratch roots: the realpath of the composed env's `GMUX_HARNESS_DIR` when it names a directory, and the realpath of `dirname(userDataDir)` unless that is a system temporary root (`/tmp`, `/private/tmp`, `/var/tmp`, `/private/var/tmp`, `os.tmpdir()` or its realpath) or his home or one of its ancestors |
| D15 | 285 | The census reads on EVERY launch (the `tmuxSocket !== null` guard goes). DROPPED IN THE FIX ROUND: his allowance of 2026-11-02 names launches that name a socket, and a launch that names none failed on his ending a session where the parent ran no census (§As built, The fix round) | Entry mechanism 4. Still `list-sessions` alone, still only from the helper. His allowance of 2026-11-02 named launches that name a socket; asked as Q3, built as the entry says |
| D16 | 285 | Rule 5f widens: its scanner runs over the helper AND every script under `build/` that imports `electron-run.mjs`; it finds `'-L', 'gmux'` anywhere in a bracketed argv, skips client flags (`-u`, `-2`, `-8`, `-v`) on either side of it, and reads the first other element as the verb; a spread or a computed element there is an unreadable verb and is refused; any verb but `list-sessions` is refused | 308's clause 2 and §0.1 285 item 4. New fixtures: `['-u', '-L', 'gmux', 'list-sessions', …]` → list-sessions; `['-u', '-L', 'gmux', 'kill-server']` → kill-server; `['-L', 'gmux', '-u', 'new-session']` → new-session; `['-L', 'gmux', ...a]` → refused |
| D17 | 285 | `gate:electron` gains a CEILING: the count of scripts under `build/`, comments stripped with `scan-source.mjs`'s `stripComments`, other than `electron-run.mjs` and `assert-electron-teardown.mjs`, that aim `'-L', 'gmux'` in argv form, may only fall; it is **102** after this phase (109 today less the seven of D18), with a fixture proving it can fail. **105 since the fix round**, the detector reading every spelling 5f reads, with no script added | Entry mechanism 5 and his ruling (§0.1 285 item 3). The spec's own count: 109 (§2.5) |
| D18 | 285 | Seven probes are converted: `build/probe-p237-typing.mjs`, `probe-p237-attack.mjs`, `probe-p237-attack2.mjs`, `probe-p237-attack3.mjs`, `build/p268/probe-p268-autosave.mjs`, `build/p277/probe-p277-save.mjs` (checks builder) and `build/probe-redline-move-on.mjs` (editor builder, beside arm M). Each: (i) its own `-L gmux` count and the finding it raises are deleted; (ii) `tmuxSocket: socket` is named on its one launch, unless it reads its scratch server after `withElectron` returns (then it stays `null` and D15 covers it); (iii) it hides every probed agent row and reads `agents:list` back, a not-ok answer being a finding | Entry mechanism 5 ("p237, p268, p277 and redline-move-on first"), his ruling, and §0's no-agent rule (measured: run 0, §2.1) |
| D19 | 307 | The entry's ten mechanism items, as written, with §0.1 307's citations | Entry |
| D20 | 308 | The entry's five mechanism items, as written | Entry |
| D21 | 310 | In `scanFile`, when nothing of the line is held from an earlier chunk (`held.length === 0`) and the line ends in this chunk (`nl !== -1`), the line is `seg` itself and `Buffer.from` is not called; a line that crosses a chunk is copied exactly as today. The header states the contract: **`line` is valid only during `onLine`**. `build/overview-conformance-probe.mts`'s stage 2 copies what it keeps (`admitted.push(Buffer.from(line))`) | Entry mechanism 1, §0.1 310 items 2 and 3. `peakLineBuffer` stays `line.length`, so every accounting field is unchanged |
| D22 | all | No committed probe for 274.1 and 274.3; their app run is the verifier's own, in one launch (§10.2) | Phase 351's D9 precedent for a Tier 2 one-off; keeps `HELPER_USER_FLOOR` at 179 and the classification table still |
| D23 | integrator | `package.json` is the integrator's: one line, `"ablation:p307": "node build/p307/ablation.mjs"` beside `ablation:p296`; classified `pure('ablation:p307', …)` in `build/verification-checks.mjs` | Two builders' work meets in neither file otherwise; `gate:checks` needs both lines together |
| D24 | integrator | `smoke:t1` runs; `smoke` and `smoke:t3` do NOT run in this phase | Both start `electron .` from `harness-socket.mjs`'s shell line, not through `build/electron-run.mjs`, which this phase's rule forbids; nothing they exercise (session durability) moves here. The main session decides at landing (§13) |
| D25 | 310 | 310's timing runs under Electron's engine through the committed `measure:p300-split` (`ELECTRON_RUN_AS_NODE=1`, no app, no window, waited for synchronously), under a lock slot | The entry: "a timing taken under plain node is not evidence here". `gate:electron` does not count that spawn as starting an Electron. Stated for the main session (§13) |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block except the app runs, which launch an Electron. Scripts and logs are under
`/private/var/tmp/tortie-wt/scratch/p352/spec/` (`bin/`, `logs/`, `m2741/`, `m2742/`, `m2743/`, `m283/`, `m285/`,
`m290/`, `m307/`, `m308/`, `m310/`). The build: `npm run build` at `8b63abc1`, exit 0, 47.6 s, every gate in it green.

### 2.1 M283: `probe:p268`'s arm G, under load (item 283)

**The instrument.** A scratch copy of the committed probe, made by `bin/make-p268-copy.mjs` from its text with every
change asserted: imports and `REPO` by absolute path to the worktree; **its own `tmux -L gmux list-sessions` count
removed** and `tmuxSocket: socket` named, so the helper's census guards the run instead; every probed agent row hidden
and `agents:list` read back; and arm G sampling, every 100 ms from the `openOutside` call to the end, the outside tab's
`dirty`, `savedContents` and buffer lengths, its stop, its `repoPath` (read off `TabButton`'s React props), the tab
count and names, the toasts, the confirm dialog and the file's mtime and size, with the wait lengthened from 10 to 15
delay periods. Runner `bin/m283-run.zsh` → `bin/m283-run.mjs`: one lock slot for the whole run; 12 burner processes
(`node -e` busy loops, each ending itself at the budget's deadline and killed by pid in the `finally`); one probe at a
time through `build/harness-socket.mjs --fresh gmux-p352s` with `TMPDIR` under the scratch; no new run after 13.5 min.

| Run | Load (1-min) at start | Exit | Wall | Arm G |
| --- | --- | --- | --- | --- |
| 0 (validation, unloaded; agents NOT hidden) | 3.9 | 0 | 75 s | `{"opened":true,"mtimeMoved":false,"textMoved":false,"dirty":true,"stopped":null}` |
| 1 (validation, unloaded) | 5.5 | 0 | 74 s | the same |
| 2 to 12 (12 burners) | 13.0, 46.8, 49.3, 61.9, 57.8, 116.8, 90.5, 155.0, 111.5, 109.7, 117.8 | 0 each | 74 to 76 s | the same, 11 of 11 |

Per tick, all 13 runs: 180 to 183 ticks over 18.6 to 18.8 s, worst gap 109 to 157 ms; **the file's mtime never moved**;
the tab's `repoPath` was the project (`…/p268/alpha`) on every tick; the tab went dirty 1.43 to 1.46 s after the open
and stayed dirty; no confirm dialog; one toast throughout (arm C's stop). No census finding in any run. Every burner
ended (12 of 12), the slot was released, no Electron of the run remained. **Run 0's agents:** before the hidden-agents
overlay was added, the app's boot scan ran `cursor-agent` (a log under the run's `TMPDIR`,
`session-2026-11-02T22-39-00-491Z-57331-1.log`, naming `analytics.track cli.launch` and `api2.cursor.sh`) and
`opencode` (a temp folder) for their versions. Runs 1 to 12 hid every row: `agents: ok: nothing resolved`.

With the entry's own eight non-repeats, arm G has now read correctly 21 times since its one failure on 2026-09-17,
13 of them at this head. D1.

### 2.2 M2741: what the shim hands main, for one folder spelled seven ways (item 274.1)

`bin/m2741.zsh`, `bin/m2741b.zsh`: the shim's own lines lifted from `composeShimContent`'s array with only the `exec`
line replaced by `printf %s\\n "$abs"` (`m2741/shim-copy.sh`), run from `zsh -f` after a `cd`, beside `pwd -P` in
`/bin/sh`, the external `/bin/pwd -P`, zsh's `pwd -P`, and Node's `realpathSync.native`, `realpathSync` and
`process.cwd()`. The folder: `<scratch>/m2741/disk/Proj/RealName`; a symlink `disk/link → Proj/RealName`; `Café` (NFC).

| Spelling the shell `cd`'d into | `$PWD` | **shim today** | `sh pwd -P` | **`sh /bin/pwd -P`** | `realpathSync.native` |
| --- | --- | --- | --- | --- | --- |
| exact | `…/Proj/RealName` | `…/Proj/RealName` | the same | the same | the same |
| wrong case `…/proj/realname` | `…/proj/realname` | **`…/proj/realname`** | **`…/proj/realname`** | **`…/Proj/RealName`** | `…/Proj/RealName` |
| symlink `…/link` | `…/link` | `…/link` | `…/Proj/RealName` | `…/Proj/RealName` | `…/Proj/RealName` |
| `/var/tmp/…` | `/var/tmp/…` | `/var/tmp/…` | `/private/var/tmp/…` | `/private/var/tmp/…` | `/private/var/tmp/…` |
| NFD `Café` | `…/Café` | `…/Café` | `…/Café` | (not read) | `…/Café` |
| typed `tortie proj/realname` from `disk` | `…/disk` | `…/proj/realname` | `…/proj/realname` | (boot volume, as row 2) | `…/Proj/RealName` |
| a freshly attached APFS image, FIRST lookup wrong case | `…/mnt/proj/realname` | `…/mnt/proj/realname` | `…/mnt/proj/realname` | **`…/mnt/Proj/RealName`** | `…/mnt/Proj/RealName` |

zsh's `pwd -P` and Node's `process.cwd()` gave the disk's case in every row (the reporter's own `pwd -P` was zsh's).
The image was made by `hdiutil create -fs APFS` (case-insensitive), detached, re-attached, and detached in a `trap`.

### 2.3 M2742: what a program tmux starts sees (item 274.2, closed)

`bin/m2742-tmux.zsh`: `env -i … tmux -L p352-spec-tmux-<pid> -f /dev/null new-session -d -c <disk>/proj/realname --
node -e …` (scratch socket, `kill-server` in a `trap`), on both binaries:

| tmux | `process.env.PWD` | `process.cwd()` |
| --- | --- | --- |
| 3.7b (`build/vendor/tmux/bin/tmux`) | `…/proj/realname` | `…/Proj/RealName` |
| 3.6a (`/opt/homebrew/bin/tmux`) | `…/proj/realname` | `…/Proj/RealName` |

Which of the two Claude Code keys `~/.claude.json`'s `projects` by is the unmeasured question (§0.1 274.2).

### 2.4 M2743: the sentences a person reads (item 274.3)

`m2743/m2743.mts` and `m2743/m2743-dollar.mts` through the pinned tsx, over the SHIPPING `fsOpMessage`,
`resolveIncomingSource`, `assertBasename`, `entryNameVerdict` and `saveRefusalSentence`:

- Every sentence carried the character raw: U+200B, U+00A0, U+202E, U+FEFF, U+00AD and the U+200D of an emoji pair,
  in `friendly`'s ENOENT and EEXIST sentences, in `resolveIncomingSource`'s `"<name>" is no longer there.`, and in the
  renderer's `"<name>" already exists here.`. U+202E (right-to-left override) makes `"invoice<RLO>dm.exe" is no longer
  there.` draw reversed.
- Two pairs that draw identically and name different files: `"notes​.md" is no longer there.` against `"notes.md" is no
  longer there.` (U+200B), and `"my notes.md" …` with U+00A0 against U+0020: `sameWhenDrawn: true, equalBytes: false`.
- `saveRefusalSentence('projectClosed', name)`: `a$'b.md` → `Tortie did not save a, because its project is not open —
  open it again and save. Nothing was written.b.md, because …`; `a$&b.md` → `… save a{name}b.md, …`; `` a$`b.md `` →
  `… save aTortie did not save b.md, …`; `a$$b.md` → `… save a$b.md, …`; `plain.md` as written.
- `assertBasename('​')` accepted the name (§0.1 274.3 item 4).

### 2.5 M285: the census, its population and its format (item 285)

- **Today's judgement is a names diff and its own gate requires that.** `gate:electron` 5d drives
  `censusFinding(['a','b'], ['a','b','shell-1-6'])` and fails unless it is a finding; at this head it passed inside
  `npm run build` ("the announcement reader and the census judged their fixtures"). A session he starts during a launch
  that names a socket therefore fails that probe by name; one he ends does too.
- **The format** (`bin/m285-format.zsh`, a scratch server `-L p352-spec-fmt-<pid>` with a session named `one two`
  stamped `@gmux-id p352-foreign-id`, ended in a `trap`), `list-sessions -F
  '#{session_id}\t#{@gmux-id}\t#{session_created}\t#{session_path}\t#{session_name}'`, read with `od -c`:

| Client | 3.6a | 3.7b |
| --- | --- | --- |
| `env -i` (no `LANG`) | `$0_p352-foreign-id_1793659956_/private/…` (every tab `_`) | the same |
| `LANG=en_US.UTF-8` | tabs | tabs |
| no `LANG`, `-u` | tabs | tabs |

- **The population** (`bin/m285-population.mjs`, `bin/m285-ceiling.mjs`, the spec's own readers, comments stripped by a
  stripper of their own): 585 scripts under `build/` (vendor excluded); 111 aim `'-L', 'gmux'` in argv form, 109 besides
  the helper and its gate; verbs seen `list-sessions` (every script that names a literal), `kill-server` and
  `new-session` (only the gate's planted fixtures), and `...` (the six of §0.1 285 item 7). 101 of the 109 import the
  helper: 42 pass `tmuxSocket: null` only, 41 omit the key, 18 name a socket somewhere. The ceiling after D18: 102.

### 2.6 M290: the stated limits, at the parent (item 290)

`node node_modules/vitest/vitest.mjs run src/renderer/editor/__tests__/p2822-second-undo.test.ts --reporter=verbose`:
exit 0, **7 of 7 pass**, among them `A TAB SWITCH AND BACK, then the undo: no read, ⌥↩ accepts the rewound change
unsaid, and the rhythm writes the rewind away` (1,426 ms) and `A LOOK AT THE FILE VIEW AND BACK (the mode chip), then
the undo: the same chain, to the same end` (1,523 ms). Both end in `theChainToItsEnd` (`:848`), which asserts
`main.writeLog` equal to `['wrote REWOUND', 'wrote AGENT']`: the defect, pinned as passing.

### 2.7 M307: the two gates over planted shapes (item 307)

`bin/m307.mjs`, in a scratch clone of the worktree's files (`m307/clone`, `cp -Rc`, no `.git`; the worktree never
written), each plant removed in a `finally` and each edited gate restored:

| Shape | Exit | Reading at this head |
| --- | --- | --- |
| `gate:background` as the tree stands | 0 | `578 files under build/ were read, 3 start a process … 19 of 19 fixtures behaved.` |
| `const raw = 'sleep 900';` beside `/^rgba?\(([^)]*)\)$/i.exec(raw)` | 1 | one finding, `a runner that does not stop by itself, held as nothing at all` |
| the same with the regex in a named constant `RGB.exec(raw)` | 1 | one finding, held as nothing |
| `function other(cmd) { return spawn('/bin/sh', ['-c', cmd]); }` beside `const cmd = 'while :; do :; done'` | 1 | **two** findings on the same line (the header and the call) |
| `cp.spawn('/bin/sh', ['-c', LOOP], { detached: true })` | 1 | one finding, `detached` (must stay found) |
| `let before = 'while :; do :; done';` planted above `STARTERS` in the gate itself | 1 | **four** findings in its own source, at `:232`, `:249`, `:316`, `:352` (the entry's `:230`, `:247`, `:314`, `:350` plus the two planted lines) |
| `gate:knownhosts` as the tree stands | 0 | `606 files … 19 scripts reach build/ssh-run.mjs … 36 fixtures, 32 of which must fail` |
| `const prog = 'ssh'; export const m = /x/.exec(prog);` | 1 | rule 1, `exec(prog, ...) starts ssh itself`, and rule 1c |
| `conformance:handback` as the tree stands | 0 | PASS, `rows in the Session menu 1`, `placed after End Session yes` |
| the three rows moved whole into the Project submenu | **0** | PASS, the same two lines |
| `Next Session`, a separator and `Previous Session` between End Session and Resume | **0** | PASS |

`npm run ablation:p296` in the clone: PASS, 11 arms, 8.2 s.

### 2.8 M308: a dropped batch fires (item 308)

`m308/m308.mts` over the SHIPPING `RepoWatcher` (the committed case 3's shape: `scratch/` ignored, churn inside it,
2,000 ms, then read), `TMPDIR` under the scratch, with the 12 burners running (load 85 to 96):

| Churn (writes + deletes) | Rep | Fires from the churn | Drops | Re-scans scheduled / completed | The committed negative assertion |
| --- | --- | --- | --- | --- | --- |
| 400 | 1, 2, 3 | 0 | 0 | 0 / 0 | green |
| 4,000 | 1 | 1 | 1 | 1 / 1 | **red** |
| 4,000 | 2 | 0 (and one fire inside the 800 ms settle) | 0 | 0 / 0 | green (the settle is the clock) |
| 4,000 | 3 | 1 | 1 | 1 / 1 | **red** |

Each drop logged `Events were dropped by the FSEvents client. File system must be re-scanned.` The committed two files,
once, native lane, after the load (`fseventsd` 1,893,824 KB, `mds_stores` 4,976 KB): exit 0, 5 of 5.

### 2.9 M310: the scanner's copies (item 310)

`m310/m310-copies.mts` over the SHIPPING `scanFile` and `compileHead` (plain node 22.23.1 / V8 12.4; the count is
engine-independent, the timing is not and is not taken here), a synthetic record of 3,000 short lines (a third rejected
on the head, a third rejected on the whole line, a third kept) and 30 lines of 3 MiB that cross 1 MiB chunks, counting
`Buffer.from` calls on a byte view:

| Head | Lines | Parsed | Rejected on head | Rejected on whole | Line copies | Bytes copied | File bytes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 512 (default) | 3,030 | 1,030 | 1,000 | 1,000 | 3,120 | 95,241,750 | 95,244,780 |
| 4 MiB (wide) | 3,030 | 1,030 | 1,000 | 1,000 | 3,120 | 95,241,750 | 95,244,780 |

`conformance:overview` at the parent: exit 0, PASS, 3.0 s.

## 3. The tree at this head, re-read (what each builder starts from)

| What | Where, at `8b63abc1` |
| --- | --- |
| 290: the hold, its reset, the rewind, the accept, the release, the clean effect | `src/renderer/editor/RedlineDocument.tsx:333`, `:389-392`, the press `:470-575` (`adoptWritten` `:550`, `landHold` `:560`), the accept `:619-668` (`holds: rewindHolds.current` `:663`), the release layout effect `:927-933`, the `[tab.dirty]` effect `:966-968` |
| 290: the accept's refusal | `src/renderer/editor/redline-accept.ts:71-74` (`holds?`), `:114-123` (`pressAccept`, `holds.length > 0` → `held`) |
| 290: the holds and the sentences | `src/renderer/editor/redline-press.ts:91-103` (`RewindHold`), `:118-121`, `:136-145` (`landHold`), `:213-226` (`releaseHolds`); `src/renderer/editor/redline-sentences.ts:217-236` |
| 290: the adoption, the walk, the queue | `src/renderer/editor/tab-io.ts:2048-2059` (`adoptWritten`), `:1827` (`refreshRepo`), `:2021-2041` (`queuedRefresh`) |
| 290: the dirty edge, the reread, the cap | `src/renderer/editor/store.ts:1543-1621` (`markDirty`; the patch then `noteChanged` at `:1609-1620`), `:1517-1518` (`rereadRepo`), `:215` (`MAX_TABS = 10`) |
| 290: the gates | `build/conformance-save.mjs:1714-1742` (rule 14); `build/conformance-redline.mjs:5134` (rule 40's header), its clause 7 at `:5546-5596` (it requires `rewindHolds.current` and `landed` before the `rereadRepo(` call) |
| 290: the probe | `build/probe-redline-move-on.mjs` (one launch, `tmuxSocket: null` `:3095`, its own count `:1157-1165`, arms O, L, C, R, T, U, Z, X; `REDLINEMOVEON_ARMS` picks arms; a built checkout elsewhere is how arm U reads a parent, header `:322`) |
| 274.1 | `src/main/shell/shim.ts:79-83` (the comment), `:102`; `src/main/shell/__tests__/shim.test.ts:73-106` (runs only the refusing paths, never `open`); `src/main/harness/shim-smoke.ts:56-60` (byte-compares the installed file to `composeShimContent`) |
| 274.3 | §0.1 274.3 item 1's sites; tests that pin them with plain names: `src/renderer/editor/__tests__/p240-save-sentences.test.ts`, `p273-refusal-words.test.ts`, `p240-guarded-save.test.ts`, `p268-auto-save.test.ts`, `src/renderer/tree/__tests__/entry-name.test.ts`, `src/main/fs/__tests__/file-ops.test.ts`, `p273-alias-containment.test.ts`, `p250-relative-base.test.ts`, `open-with.test.ts` |
| 285 | §0.1 285 items 1 and 9; `refuseProfileReason` `build/electron-run.mjs:242-261`; the socket refusal and the announcement `:389-525` (NOT weakened) |
| 307 | `build/assert-background-teardown.mjs:126` (`NODE_SPAWNS`), `:155-170` (`spawnersIn`), `:189` (`withValues`), `:230`, `:247` (`aliasesOf`), `:342` (the call regex), `:350`; `build/assert-known-hosts-scoped.mjs:473-476` (the declaration guard); `build/scan-source.mjs:147` (`callArguments`), `:216` (`closeOf`); `build/background-fixtures.mjs` (19 fixtures) |
| 308 | `src/main/watcher/__tests__/repo-watcher.native.test.ts` (header `:1-13`, `waitFor` `:30-40`, settles `:69`, `:122`, `:171`, `:229`, negatives `:89-96`, `:98-104`, `:175-182`, `:237-244`); `src/main/config/__tests__/store-watch.native.test.ts:66-84`; `vitest.config.ts:35-45`, `:69` |
| 310 | `src/main/overview/reader/lines.ts:152-261` (`scanFile`; the copy `:240`; `finishLine` `:186-211`); `src/main/overview/reader/containers.ts:178-206`; `build/overview-conformance-probe.mts:317-344` |
| Integrator | `CHANGELOG.md:7-17` (`## Unreleased`, `### Added`, `### Fixed` holds 351's item); `package.json` `ablation:p296` line; `build/verification-checks.mjs`; CLAUDE.md's rows for `gate:electron`, `gate:background`, `gate:knownhosts`, `conformance:handback`, `conformance:save`, `conformance:redline`, `conformance:overview` and the probe rows for `probe:p268` |

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 290 — the tab owes the read (builder `editor`)

1. `tab-types.ts`: `rewindOwesRead: boolean` on `EditorTab`, documented (D8). Every place that constructs a tab sets
   `false`; a reopened tab starts `false` (it reads the file fresh).
2. `tab-io.ts`, `adoptWritten`: split the one early return so each refusal sets the mark before returning:
   `if (tab.dirty || tab.savedContents !== was) { deps.patch(id, { rewindOwesRead: true }); return; }`. The success arm
   does not touch it.
3. `tab-io.ts`: the walk (`refreshRepo`) clears it in the same patch that reloads that tab clean; a save of that tab that
   completes (the guarded write or the plain door answering written) clears it. Nothing else clears it.
4. `store.ts`, `markDirty`: on the dirty-to-clean edge, AFTER `patchTab(id, patch)` and `autoSave.noteChanged(id)`, when
   the tab's mark stands, call `get().rereadRepo(tab.repoPath)`. Rule 14's order is unchanged; rule 14 is extended to
   read that the pull follows `noteChanged` and stands on the clean edge only (§7).
5. `RedlineDocument.tsx`: (a) a mount effect: when the view mounts or its `tab.id` changes onto a CLEAN tab whose mark
   stands, pull the read once; (b) the `[tab.dirty]` effect reads `tab.rewindOwesRead || rewindHolds.current.some((h)
   => h.landed !== null)` (D10); (c) the accept passes `owed: live.rewindOwesRead` to `pressAccept` (D11).
6. `redline-accept.ts`: `owed?: boolean` in the deps beside `holds`; `owed === true` answers `held` exactly where a
   non-empty `holds` does. No new sentence (`redline-sentences.ts` is not edited).
7. `p2822-second-undo.test.ts`: the two seeds flip into `describe` blocks of their own, naming 290: after the switch,
   the mode chip and a File-view undo, a read is pulled, the rewound change leaves the picture, ⌥↩ before the read
   answers today's sentence, and `main.writeLog` never reads `wrote AGENT`. The other two STATED LIMITS (`ONE ⌘Z TOO
   MANY`, `THE UNDO IS NOT TEMPORARY`) stay as they are: 282.2's P3 and P4 are not this phase.
8. A new `src/renderer/editor/__tests__/p290-owed-read.test.ts`: the mark set at both refusals and only there; cleared by
   a clean walk and by a completed save and by nothing else; the two doors; ⌥↩ held on the mark; and the entry's attack
   list, each with its own case: the tab evicted at `MAX_TABS` (10), closed and reopened, a project switch, a save in
   flight when the mark is set, two rewinds setting it twice, and the pulled read racing the watcher's own tick.
9. `build/probe-redline-move-on.mjs`: arm M (the attack's arm, entry: "mode chip to File, a click in Monaco, ⌘Z once,
   chip back to Redline"; and the dirty variant, "File and back on the dirty tab, and ⌥↩ on the rewound change"), graded
   on the disk, the write log and the picture; selectable by `REDLINEMOVEON_ARMS=M`; red at the parent's build with the
   readings the entry quotes (no read in 2.5 s, `savedContents` the agent's text, ⌥↩ taking 3 → 2 with no toast; the
   dirty variant 4 → 3) and green at HEAD's. **Measured at the parent build (the editor lens, then the fix round): no
   read in 2.5 s and nothing after it, because Phase 334's arrival read heals a clean tab; the dirty variant 4 → 3 with
   no toast. The fix round added a THIRD sub-arm, `tab` (another file and back while dirty, ⌥↩, ⌘Z back to clean, the
   rhythm), which is where the parent build still loses the rewind.** AND the D18 conversion of this file. Run only its `--self-test`/grader
   fixtures here; the verifier runs the arm.

### 4.2 274.1 — the shim asks the disk (builder `folders`)

1. `shim.ts:102` becomes `'abs=$(cd "$dir" 2>/dev/null && { /bin/pwd -P 2>/dev/null || pwd; }) || {',` and the comment
   at `:79-80` says why in the file's voice: the builtin `pwd -P` of `/bin/sh` keeps the typed case (measured,
   2026-11-02), `/bin/pwd -P` asks the volume and agrees with the Finder door, and the logical `pwd` is the fallback.
   Nothing else in the composed content moves; `shim-smoke.ts` byte-compares against the same function, unchanged.
2. `shim.test.ts`: a case that writes the composed content with ONLY its `exec /usr/bin/open` line swapped for `printf`
   (never runs `open`), `cd`s into a wrong-case spelling of a folder it made under its temp directory, and expects the
   disk's spelling; a case through a symlink expecting the target; a case where the physical read cannot answer is not
   needed (no portable way to make `/bin/pwd -P` fail while `cd` works).

### 4.3 274.3 — what cannot be seen is written out (builder `folders`)

1. `src/shared/visible-name.ts` (new): `export function visibleName(text: string): string` (D5), with a header naming
   the entry, the measurement (§2.4) and the limits (a literal `<U+…>` already in a name reads the same as an escape;
   tag sequences such as subdivision flags are escaped).
2. The sites (D6): `src/main/fs/errors.ts` `friendly` and both `FALLBACK` uses; `paths.ts:284` and `:794`;
   `file-ops.ts:417`, `:486`, `:616`; `entry-name.ts:68`; `save-sentences.ts` `saveRefusalSentence` and `staleSaveTitle`
   with a function replacer (D7). Only the quoted name passes through `visibleName`; `detail` fields, log lines and every
   path a program reads stay byte for byte.
3. Tests: `src/shared/__tests__/visible-name.test.ts` (each class of D5 escaped; U+0020 and every printable ASCII byte
   untouched; an emoji ZWJ family, a keycap and a VS16 heart drawn as written; U+202E, U+200B, U+00A0, U+FEFF, U+00AD,
   U+2028 escaped; idempotent on its own output); cases added to `p240-save-sentences.test.ts` (the four `$` shapes
   quoted as written) and `entry-name.test.ts`.

### 4.4 285 — the census that blames him (builder `checks`)

1. `build/electron-run.mjs`: `liveSessionRows()` (D13) replaces `liveSessionNames()` as the census reader and stays the
   ONLY place in the file that names `-L gmux`; `censusVerdict(input)` (D14), pure and exported, answering
   `{ failures: string[], notes: string[] }`; `withElectron` reads before the spawn on every launch (D15), reads after
   the teardown, re-reads once a second later when a fresh row is unstamped, reads the launch's own manifest ids only when
   a fresh row needs them, throws the failures when the body returned normally and prints them when it threw (as today),
   and prints every note. The header's STATED LIMIT paragraph (`:552-566`) is rewritten to what is now true. The socket
   refusal, the announcement and the profile refusal do not change.
2. `build/assert-electron-teardown.mjs`: 5d's census half becomes the identity fixtures (every row of D14, a rename, an
   unreadable row, a WENT under a silent and under a spoken announcement, an unreadable manifest beside a stamped fresh
   row); 5f per D16 with its four new fixtures; 5h re-pointed at the unconditional read; the census ablation's `from`
   string follows the new line, and one ablation per clause of the judgement ((a), (a'), (b), the re-read, the WENT
   flip's two conditions, the fail-closed manifest read), each red on its own clause; the ceiling (D17) with a fixture
   that must fail. The printed PASS sentence says the census judges by identity.
3. The six probes of D18 (and `probe-redline-move-on.mjs` by the editor builder, the same three steps).
4. `DEVELOPMENT.md`: the lines of §0.1 285 item 8 say what is true (a probe fails for what it could have done; his own
   start of a session is a note; his end of one is a note when the launch's announcement agreed).
5. Not touched: `build/probe-p165-paint.mjs` (its own identity census, under the ceiling), the six research scripts
   (Q5), every other bare count (the ceiling).

### 4.5 307 — a call by what it is, a row by its menu (builder `checks`)

The entry's mechanism 1 to 10 at the citations of §0.1 307, in `build/scan-source.mjs` (the receiver test, exported,
beside `closeOf` and `callArguments`), `build/assert-background-teardown.mjs`, `build/assert-known-hosts-scoped.mjs`
(its regex arm only; its printed line does not move), `build/background-fixtures.mjs` (the six new shapes of mechanism
5), `build/handback-conformance-probe.mts` (the Session submenu's span by `closeOf`, `closingParen` deleted,
`itemCallAround(offset)`), `build/conformance-handback.mjs` (membership, adjacency, two table lines), and a new
`build/p307/ablation.mjs` (sibling copies, sha256 restore in a `finally`; arms: the receiver test removed, each of its
three regex shapes removed alone, the declaration guard removed, the membership clause removed, the adjacency clause
removed; controls: the shapes that must stay found). `src/main/menu.ts` is NOT edited.

### 4.6 308 — the native lane fails for the code (builder `checks`)

The entry's mechanism 1 to 5 in the two test files only: every negative assertion reads `rw.observation.drops` beside
its baseline and re-takes a dropped window at most three times, then fails printing the drops; the four settle sleeps
become a sentinel write in a watched path and a `waitFor` of its fire; `store-watch.native.test.ts` prints
`agentOverlayDiskReads()` on timeout; both headers carry the rule as text. `repo-watcher.ts` and `vitest.config.ts` are
NOT touched.

### 4.7 310 — the view, not the copy (builder `reader`)

1. `lines.ts`: D21 at `:236-243`; the header gains the contract and the reason (Phase 300's verify, CORRECTION 5:
   copies pile up as external memory on V8 15 until a scavenge the read never triggers).
2. `build/overview-conformance-probe.mts`: stage 2 keeps copies (`Buffer.from(line)`), with a comment saying the scanner
   hands a view valid only during the callback.
3. A new `src/main/overview/__tests__/p310-scan-views.test.ts`: over a small `chunkSize`, a line that ends exactly at a
   chunk's last byte, a line that crosses one, two and many chunks, a trailing line with no newline (not consumed), an
   empty line, a head decided mid-line both ways, and the wide head; every `ScanAccounting` field and every `onLine`
   byte equal to a reference reader written in the test (copying everything), and a count of `Buffer.from` calls on a
   view equal to the number of segments of lines that cross a chunk and no more.
4. Nothing in `containers.ts`, the keep map, `fold.ts` or any count moves.

## 5. Words

No user-visible word moves but these:

- **274.3**: a quoted name's invisible characters, as `<U+XXXX>` (D5). No sentence's template changes.
- **The CHANGELOG** (integrator), four items under `## Unreleased`, `### Fixed`, after 351's item, in the house style, with
  NO commit link (the follow-up docs commit that writes the running-log line adds it):

```
- A change you rewound while typing in the same file can no longer be accepted by mistake after you switch tabs, look at the File view or undo there: ⌥↩ waits until Tortie has read the file again, so a later ⌥⌫ cannot put the agent's words back over your rewind
- `tortie .` opens a folder under the name it has on disk, as opening it from Finder does, so a terminal that spells the folder differently, or reached it through a link, no longer names its tab; a path with a character outside plain ASCII is still opened as the terminal spells it. If you installed the tortie command before, remove it and install it again in Settings
- When Tortie says it could not do something with a file or folder, a character you cannot see in its name is written out as its code, such as <U+200B>, so two names that look the same are told apart, and a name with a $ in it is quoted as it is
- The first Catch Me Up of a very long conversation opens faster
```

## 6. What moves on purpose (each red ON PURPOSE in the same commit, and named in its report)

| What | Builder | Why |
| --- | --- | --- |
| `p2822-second-undo.test.ts`'s two STATED LIMITS seeds | editor | They pin the defect (§2.6) |
| any test that pins Phase 282.2's `[tab.dirty]` effect reading the holds alone (`p2822-after-undo.test.ts`, `p282-view-presses.test.ts`, only if one does) | editor | D10's OR |
| `conformance:redline` rule 40 clause 7 (requires `rewindHolds.current` and `landed`) | editor | Re-pointed: it requires the mark in what decides the call, and still refuses a read on the way into dirty and an adoption; its ablations stay red |
| `conformance:save` rule 14 | editor | Extended to read the pull after `noteChanged`, on the clean edge |
| `gate:electron` 5d (requires a names diff to be a finding), 5f's regex, 5h's census needle, the census ablation's `from` | checks | §0.1 285 items 4 and 9 |
| `gate:background`'s fixture count (19 → 25), every gate's files-read count (+1, `build/p307/ablation.mjs`) | checks | §0.1 307 |
| `conformance:handback`'s two moved-row shapes (exit 0 → 1) | checks | The membership and adjacency clauses |
| the committed native watcher assertions that read a drop as a failure | checks | 308 |
| `measure:p300-split`'s stage 2 timing (it now copies what it keeps) | reader | §0.1 310 item 3 |
| the seven probes' own `-L gmux` counts | checks, editor | D18 |

## 7. The gates that move

- `conformance:save` (`build/conformance-save.mjs`, editor): rule 14 extended; rule 13 unchanged (274.3 keeps
  `autoSaveStopSentence`'s body as it is, so the folders builder must not touch it).
- `conformance:redline` (`build/conformance-redline.mjs`, editor): rule 40 clause 7 re-pointed; rule 9's derived file
  set and floor rise only if a new `redline*`/`Redline*` file is added (none is planned).
- `gate:electron` (`build/assert-electron-teardown.mjs`, checks): 5d, 5f, 5h, the ablations, the ceiling 102.
- `gate:background`, `gate:knownhosts` (checks): as §4.5; `ablation:p307` new.
- `conformance:handback` (checks): membership and adjacency; `ablation:p296` must stay green over the shared matcher.
- Unchanged and run: `conformance:redline-write`, `ablation:p268`, `conformance:containment`, `conformance:samefolder`,
  `ablation:p274`, `conformance:overview`, `gate:checks`, `gate:contract`.

## 8. The app runs (none new is committed; D22)

- `probe:redlinemoveon` arm M (290), at the parent's build and HEAD's, through HEAD's converted probe.
- `probe:p277` and `probe:p268` (290's gates; 285's real run), converted (D18).
- `probe:p300` (310), at both builds, interleaved.
- The verifier's own one launch for 274.1 and 274.3 (§10.2).

## 9. Builders, disjoint files, and the seams

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| **editor** (290) | `src/renderer/editor/tab-types.ts`; `src/renderer/editor/tab-io.ts`; `src/renderer/editor/store.ts`; `src/renderer/editor/RedlineDocument.tsx`; `src/renderer/editor/redline-accept.ts`; `src/renderer/editor/redline-press.ts` (comments only, if one must name the mark); `src/renderer/editor/p277-save-drive.ts` (only if arm M needs a reading it lacks); `src/renderer/editor/__tests__/p2822-second-undo.test.ts`; `src/renderer/editor/__tests__/p2822-after-undo.test.ts` and `p282-view-presses.test.ts` (only if one pins the holds-only condition); `src/renderer/editor/__tests__/p290-owed-read.test.ts` (new); `build/conformance-save.mjs`; `build/conformance-redline.mjs`; `build/probe-redline-move-on.mjs` |
| **folders** (274.1, 274.3) | `src/main/shell/shim.ts`; `src/main/shell/__tests__/shim.test.ts`; `src/shared/visible-name.ts` (new); `src/shared/__tests__/visible-name.test.ts` (new); `src/main/fs/errors.ts`; `src/main/fs/paths.ts`; `src/main/fs/file-ops.ts`; `src/renderer/tree/entry-name.ts`; `src/renderer/editor/save-sentences.ts`; `src/renderer/editor/__tests__/p240-save-sentences.test.ts`; `src/renderer/tree/__tests__/entry-name.test.ts`; `src/main/fs/__tests__/file-ops.test.ts` (only if a case must move) |
| **checks** (285, 307, 308) | `build/electron-run.mjs`; `build/assert-electron-teardown.mjs`; `DEVELOPMENT.md`; `build/probe-p237-typing.mjs`; `build/probe-p237-attack.mjs`; `build/probe-p237-attack2.mjs`; `build/probe-p237-attack3.mjs`; `build/p268/probe-p268-autosave.mjs`; `build/p277/probe-p277-save.mjs`; `build/scan-source.mjs`; `build/assert-background-teardown.mjs`; `build/background-fixtures.mjs`; `build/assert-known-hosts-scoped.mjs`; `build/handback-conformance-probe.mts`; `build/conformance-handback.mjs`; `build/p307/ablation.mjs` (new); `src/main/watcher/__tests__/repo-watcher.native.test.ts`; `src/main/config/__tests__/store-watch.native.test.ts` |
| **reader** (310) | `src/main/overview/reader/lines.ts`; `build/overview-conformance-probe.mts`; `src/main/overview/__tests__/p310-scan-views.test.ts` (new) |
| **INTEGRATOR** | `CLAUDE.md`; `CHANGELOG.md`; `build/verification-checks.mjs`; `package.json`; and any file two builders both need (none is planned) |

The checks builder's 285 files and its 307/308 files are disjoint too, so a workflow may split it into two builders
without moving a file.

### 9.2 The seams, stated exactly so the four build at once

1. **The ceiling (D17) counts `probe-redline-move-on.mjs`, which the editor builder converts.** The checks builder sets
   102; until the editor builder's conversion is in the tree, `gate:electron` reads 103 against it and is red. Each
   builder reports it; the integrator confirms 102 with both in.
2. **The seven conversions are one recipe** (D18, written once in each brief). The editor builder applies it to
   `probe-redline-move-on.mjs` exactly as the checks builder applies it to the other six.
3. **`conformance:save` reads `save-sentences.ts`** (rule 13 reads `autoSaveStopSentence`'s body; rule 15 pins a
   template's bytes). The folders builder changes only `saveRefusalSentence` and `staleSaveTitle`'s bodies; if a rule
   still goes red, it names the rule and stops (the gate is the editor builder's file).
4. **`gate:background`'s and `gate:knownhosts`' files-read counts** rise by one for `build/p307/ablation.mjs`; nothing
   else under `build/` is added by any builder.
5. Every builder runs `npm test` under the history block with a scratch `HOME`; the four `/bin/ps` native tests fail
   there by design and are named, not counted.

### 9.3 The builders' briefs (the workflow hands each its own)

**editor**:

> THIS IS A BUILD. Build Phase 290 exactly as build/p352/SPEC.md §1.1 D8-D12, §4.1 and §6-§7 say, in the files of
> §9.1's editor row only. (1) `rewindOwesRead: boolean` on EditorTab (tab-types.ts), false wherever a tab is made, never
> persisted. (2) tab-io.ts `adoptWritten`: each of its two refusals (a dirty tab; `savedContents !== was`) patches
> `rewindOwesRead: true` before returning; the success arm does not touch it. The walk clears it in the patch that
> reloads that tab clean, and a completed save of that tab clears it; nothing else does. (3) store.ts `markDirty`: on the
> dirty-to-clean edge, AFTER `patchTab(id, patch)` and `autoSave.noteChanged(id)`, call `get().rereadRepo(tab.repoPath)`
> when the mark stands. (4) RedlineDocument.tsx: a mount (and `tab.id` change) onto a CLEAN tab whose mark stands pulls
> the read once; the `[tab.dirty]` effect asks `tab.rewindOwesRead || rewindHolds.current.some((h) => h.landed !== null)`
> (it must keep every read it pulls today); the accept passes `owed: live.rewindOwesRead`. (5) redline-accept.ts:
> `owed?: boolean` answers `held` exactly as a non-empty `holds` does. No sentence changes. (6) Flip
> p2822-second-undo.test.ts's two STATED LIMITS seeds (`:872`, `:886`) and add the File-view undo: a read is pulled, the
> rewound change leaves the picture, ⌥↩ before the read answers today's sentence, and the write log never reads `wrote
> AGENT`; leave `ONE ⌘Z TOO MANY` and `THE UNDO IS NOT TEMPORARY` as they are. (7) New p290-owed-read.test.ts with the
> mark's set and clear rules and the entry's attack list (MAX_TABS eviction at 10, close and reopen, a project switch, a
> save in flight, two rewinds, the read racing the watcher's tick). (8) conformance:save rule 14 extended to read the
> pull after `noteChanged` and on the clean edge only, never relaxed; conformance:redline rule 40 clause 7 re-pointed to
> require the mark in what decides the `rereadRepo(` call, keeping its other refusals and its ablations red. (9)
> build/probe-redline-move-on.mjs: arm M (§4.1 step 9), selectable by REDLINEMOVEON_ARMS=M; AND the D18 conversion of
> this file: delete its own `-L gmux` count (`:1157-1165` and the finding it raises), name `tmuxSocket: socket` on its
> one launch unless it reads its scratch server after withElectron returns, write
> `writeHiddenAgents(profile, '<prefix>', hiddenAgentsBesides([]))` from build/hidden-agents.mjs before the launch and
> read `AGENTS_LIST_EXPR` back with `standInsOnlyVerdict(list, { standIns: [] })`, a not-ok answer a finding. Run, with
> exit codes: npm run typecheck; your vitest files and the full vitest under the history block with a scratch HOME (name
> the four /bin/ps native failures); npm run conformance:save; npm run ablation:p268; npm run conformance:redline; npm
> run conformance:redline-write; the move-on probe's own fixtures/self-test if it has one. Do NOT launch an Electron.
> Report every file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

**folders**:

> THIS IS A BUILD. Build Phases 274.1 and 274.3 exactly as build/p352/SPEC.md §0.1, §1.1 D3-D7, §4.2 and §4.3 say, in
> the files of §9.1's folders row only. 274.1: shim.ts `:102` becomes
> `'abs=$(cd "$dir" 2>/dev/null && { /bin/pwd -P 2>/dev/null || pwd; }) || {',` and the comment at `:79-80` says why
> (the builtin `pwd -P` of /bin/sh keeps the typed case, measured; /bin/pwd -P asks the volume and agrees with the Finder
> door; the logical pwd is the fallback); nothing else in the composed content moves. shim.test.ts gains a run of the
> composed content with ONLY its `exec /usr/bin/open` line swapped for printf (never run open), from a wrong-case `cd`
> into a folder it made in its temp directory (expect the disk's spelling) and through a symlink (expect the target).
> No change to addProject, argv.ts, index.ts, arrival.ts or Settings. 274.3: a new src/shared/visible-name.ts exporting
> `visibleName(text)` that writes as `<U+XXXX>` (uppercase hex, at least four digits) every code point of
> \p{Default_Ignorable_Code_Point}, \p{Cc}, \p{Zl}, \p{Zp} and \p{Zs} other than U+0020, except U+200D when the code
> point before it is \p{Extended_Pictographic}, \p{Emoji_Modifier} or U+FE0F and the one after it is
> \p{Extended_Pictographic}, and U+FE0E/U+FE0F when the code point before is \p{Emoji}; no .normalize(), no case
> folding. Apply it to the quoted name only at exactly these sites: src/main/fs/errors.ts `friendly` and both FALLBACK
> uses; paths.ts `:284` and `:794`; file-ops.ts `:417`, `:486`, `:616`; entry-name.ts `:68`; save-sentences.ts
> `saveRefusalSentence` and `staleSaveTitle`, both with a FUNCTION replacer (`.replace('{name}', () => …)`), which also
> stops a `$'`, `$&`, `` $` `` or `$$` in a file name mangling the sentence (measured, SPEC §2.4). Do not touch
> `autoSaveStopSentence`'s body, any template's bytes, a detail field, a log line or a path a program reads. Tests: a new
> src/shared/__tests__/visible-name.test.ts (each class escaped, U+0020 and printable ASCII untouched, an emoji family, a
> keycap and a VS16 heart as written, idempotent on its own output) and cases in p240-save-sentences.test.ts (the four
> `$` shapes) and entry-name.test.ts. Run, with exit codes: npm run typecheck; your vitest files and the full vitest
> under the history block with a scratch HOME (name the four /bin/ps native failures); npm run conformance:containment;
> npm run conformance:samefolder; npm run ablation:p274; npm run conformance:save (if a rule goes red, name it and stop:
> that gate is the editor builder's file). Do NOT launch an Electron. Report every file changed, every command with its
> exit code, and the history stats. Hard rules: SPEC §0.

**checks**:

> THIS IS A BUILD. Build Phases 285, 307 and 308 exactly as build/p352/SPEC.md §0.1, §1.1 D13-D20, §4.4-§4.6, §6 and
> §7 say, in the files of §9.1's checks row only. 285: in build/electron-run.mjs a reader `liveSessionRows()` running
> `spawnSync('tmux', ['-u', '-L', 'gmux', 'list-sessions', '-F', CENSUS_FORMAT])` with
> `CENSUS_FORMAT = '#{session_id}\t#{@gmux-id}\t#{session_created}\t#{session_name}\t#{session_path}'`, split at the
> first four tabs, keyed by `$-id`, a malformed line an unreadable row that fails closed; it stays the ONLY place in the
> file naming -L gmux and list-sessions its only verb. A pure exported `censusVerdict` with D14's rules exactly ((a)
> the launch's own manifest ids, read after teardown by `/usr/bin/sqlite3 <userDataDir>/gmux/manifest.db 'SELECT id
> FROM sessions;'`, ids checked against ^[A-Za-z0-9-]{1,64}$, a failed read on an existing file beside a stamped fresh
> row a failure; (a') the scratch roots of D14, both /tmp and /private/tmp spellings; (b) unstamped after one re-read a
> second later, gmux-control included; (c) a note; a WENT session a failure unless at least one [gmux-socket] line was
> captured and every one equalled the scratch socket asked for, then a note; a rename nothing). The census reads on every
> launch (the `tmuxSocket !== null` guard goes); failures are thrown or printed as today, notes printed. Do not weaken
> the socket refusal, the announcement or the profile refusal. In build/assert-electron-teardown.mjs: 5d's census
> fixtures become D14's rows; 5f's scanner finds '-L', 'gmux' anywhere in a bracketed argv, skips client flags (-u, -2,
> -8, -v) and reads the first other element as the verb, refuses a spread or computed one, and runs over the helper AND
> every build/ script that imports electron-run.mjs, with the four fixtures of D16; 5h re-pointed; one ablation per
> clause of the judgement, each red on its own clause, the census ablation's `from` following the new line; a CEILING of
> 102 on the scripts under build/ (comments stripped with scan-source.mjs's stripComments) other than electron-run.mjs
> and assert-electron-teardown.mjs that aim '-L', 'gmux' in argv form, with a fixture that must fail (gate:electron reads
> 103 until the editor builder converts probe-redline-move-on.mjs; say so). Do NOT touch HELPER_USER_FLOOR (179).
> Convert build/probe-p237-typing.mjs, probe-p237-attack.mjs, probe-p237-attack2.mjs, probe-p237-attack3.mjs,
> build/p268/probe-p268-autosave.mjs and build/p277/probe-p277-save.mjs: delete each one's own -L gmux count and the
> finding it raises; name `tmuxSocket: socket` on its one launch unless it reads its scratch server after withElectron
> returns; hide every probed agent row with writeHiddenAgents(profile, '<prefix>', hiddenAgentsBesides([])) before the
> launch and read AGENTS_LIST_EXPR back with standInsOnlyVerdict(list, { standIns: [] }), a not-ok answer a finding.
> DEVELOPMENT.md's census and count sentences (SPEC §0.1 285 item 8) say what is now true. 307: the entry's mechanism
> 1-10 (docs/BACKLOG.md :32617-32628) at SPEC §0.1 307's citations; src/main/menu.ts is NOT edited (sha256 fe62e1dd…
> before and after). 308: the entry's mechanism 1-5 (docs/BACKLOG.md :32767-32786) in the two native test files only;
> repo-watcher.ts and vitest.config.ts untouched. Run, with exit codes: npm run typecheck; npm run build (it carries
> gate:electron, gate:background, gate:knownhosts, gate:checks); node build/conformance-handback.mjs; npm run
> ablation:p296; node build/p307/ablation.mjs; the two native files under VITEST_LANE=native with TMPDIR under your
> scratch, under the history block; the full vitest under the history block with a scratch HOME (name the four /bin/ps
> native failures); each converted probe's own self-test where it has one. Do NOT launch an Electron; never aim anything
> at -L gmux. package.json and build/verification-checks.mjs are the integrator's: report the lines you need. Report every
> file changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

**reader**:

> THIS IS A BUILD. Build Phase 310 exactly as build/p352/SPEC.md §0.1 310, §1.1 D21 and §4.7 say, in the files of
> §9.1's reader row only. In src/main/overview/reader/lines.ts `scanFile`: when `held.length === 0` and the line ends in
> this chunk (`nl !== -1`), hand the line on as `seg` itself, calling no Buffer.from; a line that crosses a chunk is
> copied exactly as today; `peakLineBuffer` stays `line.length`; the header states that `line` is valid only during
> `onLine` and why (Phase 300's CORRECTION 5). In build/overview-conformance-probe.mts stage 2, keep copies
> (`admitted.push(Buffer.from(line))`) with a comment saying why. A new src/main/overview/__tests__/p310-scan-views.test.ts
> over a small chunkSize: a line ending at a chunk's last byte, lines crossing one, two and many chunks, a trailing line
> with no newline, an empty line, a head decided mid-line both ways, the wide head; every ScanAccounting field and every
> onLine byte equal to a copy-everything reference reader written in the test, and Buffer.from on a view called only for
> lines that cross a chunk. No count, keep rule, parse or fold changes. Run, with exit codes: npm run typecheck; your
> vitest file and the full vitest under the history block with a scratch HOME (name the four /bin/ps native failures);
> npm run conformance:overview (its table byte identical to the parent's: diff it against
> /private/var/tmp/tortie-wt/scratch/p352/spec/m310/conformance-overview-parent.log); npm run conformance:samefolder. Do
> NOT launch an Electron and do not run measure:p300-split (the verifier's, under a lock slot). Report every file
> changed, every command with its exit code, and the history stats. Hard rules: SPEC §0.

## 10. The proof, run rather than read

### 10.1 What each builder runs before it returns

The commands in its brief (§9.3), each with its exit code and PASS line, and the history stats before and after.

### 10.2 Lens B: folder names and the reader (274.1 Tier 2, 274.3 Tier 1, 310 Tier 3)

- **274.1, one app run** (the verifier's own scratch probe, one launch through the helper, hidden agents, a lock slot),
  at the parent's build and HEAD's: a folder `<scratch>/Proj/RealName` reached by a wrong-case `cd`; the SHIPPING
  `composeShimContent` (through the pinned tsx) with only its `exec` line swapped, run under `/bin/sh` from there, gives
  the argv; the app boots with it (`withElectron` `args`); read the project tab's label and tooltip from the DOM and the
  stored row with `sqlite3` of the scratch manifest. Parent: `realname`, the wrong-case path stored; HEAD: `RealName`,
  the disk's path. A symlinked folder the same way (HEAD stores the target, as `resolveShellArrival` answers). The
  independent method: re-derive §2.2's table with the verifier's own reader (every row, both builds).
- **274.3**, in the same launch: one refusal whose name holds U+200B (e.g. a rename onto a name that exists, or a drop of
  a vanished file), its toast's text read from the DOM as code points: `<U+200B>` at HEAD, the raw character at the
  parent. No photograph (it cannot show the defect). The gates of §11.
- **310, Tier 3**: `conformance:overview` byte-identical tables at both builds; the verifier's OWN reader re-deriving
  every count and every Catch Me Up page over the 14 committed fixtures and `build/p300/generate-codex-records.mjs`'s
  records at both builds (method 1, re-derive); `measure:p300-split` (`P300_SIZES=p50,p99,big,huge`) at both builds
  interleaved, plus the verifier's reader-alone harness under Electron's engine with a forced collection after each of
  three reads: HEAD's first read under the parent's, the third not above the first, external memory after collection at
  the parent's (method 2, measure); the attack (method 3): chunk-boundary lines at every offset of a small chunk, the
  18.5 MB single line, a record growing while read, a wide-head file, and an `onLine` that keeps the buffer (documented
  invalid, and the one production consumer shown not to); `probe:p300` at both builds (first-huge, page-first,
  page-after-sheet, pass-161 worst gap under 20 ms, every count identical). His no-regression table: every reading,
  today and HEAD; a scenario worse is removed.

### 10.3 Lens A: the editor (290, Tier 3)

- The parent measurement: §2.6's seeds pass at the parent and their flipped forms pass at HEAD; the write log never reads
  `wrote AGENT` at HEAD.
- `probe:redlinemoveon` arm M (`REDLINEMOVEON_ARMS=M`, HEAD's converted probe), against the parent's build (red, the
  entry's readings) and HEAD's (green).
- The attack (method 1): the mark against a tab evicted at `MAX_TABS`, closed and reopened, a project switch, a save in
  flight, two rewinds, the read racing the watcher's tick, driven by the verifier's own rig through real events.
- Re-derive (method 2): the verifier's own reading of when a read is owed, compared with the mark over every case.
- Gates: typecheck, build, test, smoke:t1, conformance:save, ablation:p268, conformance:redline, conformance:redline-write,
  `probe:p277`, `probe:p268` (both converted).

### 10.4 Lens C: the checks (285 Tier 3, 307 Tier 2, 308 Tier 2)

- **285, the parent measurement on a SCRATCH socket**: the verifier's harness starts `-L gmux-p352v-<pid>`, plants each
  shape (his: stamped with a foreign id under a home-like path; this launch's: an id in a scratch manifest; unstamped;
  under the scratch root, both spellings; a vanished one; a rename; a fresh `gmux-control`), reads rows with its own
  reader, and drives the parent's `censusFinding` (names) and HEAD's `censusVerdict` (rows): his shape RED at the parent,
  a NOTE at HEAD; every other shape as D14. Ended in a `finally`.
- **The attack** (method 1): then builds a probe-made session the judgement would call his, and reports what it took.
- **Re-derive** (method 2): its own judgement from the rule, compared row by row with the helper's.
- **One real run**: `npm run probe:p277` (converted) exits 0; if he opens a session meanwhile, a note names it.
- **307**: `npm run ablation:p307` (every arm red on its clause, every control green, every file's sha256 restored);
  §2.7's table re-run at HEAD (the colliding regex shapes, the declaration header and `/x/.exec(prog)` now 0 findings;
  the member-form loop, a spread starter and a regex through a parameter still reported; the moved rows exit 1 naming the
  menu each row was found in); the counts re-derived by the verifier's own reader at both builds (dot-preceded candidate
  sites, promoted functions, declaration sites); `conformance:handback` PASS at both; `ablation:p296` green; `menu.ts`
  sha256 `fe62e1dd…` at both.
- **308**: the planted drop (4,000 churn in the ignored folder): the committed test red, the fixed test green; the
  watcher blinded for real (Phase 151's `<name>/**` glob restored in a scratch copy): the fixed test red; ten consecutive
  runs of the two files under the native lane at HEAD and ten at the parent, `fseventsd` and `mds_stores` read with
  `ps -Ao pid,rss,comm` before and after each and all twenty recorded (whether Spotlight reindexes is the machine's, said
  as read); wall time of the file at both.
- Gates: `gate:electron` with the new arms and the ceiling, `gate:background`, `gate:knownhosts`, `gate:checks`,
  typecheck, build.

### 10.5 At the end, once

The Electron count of CLAUDE.md (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v
defunct`; his `/Applications/Tortie.app` and other apps' crashpads are not ours), no `p352` or `gmux-p352` socket left
under `/private/tmp/tmux-501/`, every lock slot released, the history stats.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `df -h /` (8 GB or more free); `stat -f '%z %m' ~/.zsh_history ~/.bash_history`.
2. Reconcile §9.2: confirm `gate:electron`'s ceiling reads 102 with all seven conversions in.
3. `package.json`: `"ablation:p307": "node build/p307/ablation.mjs",` beside `ablation:p296`.
   `build/verification-checks.mjs`: `pure('ablation:p307', 'node and the repository; it edits sibling copies of the two gates under the system temporary directory and restores every file by sha256 in a finally, and spawns only node', 'never skips; a copy that will not load is a failure of the arm, not a pass')`.
4. `CHANGELOG.md`: §5's four items. `CLAUDE.md`: `gate:electron`'s row (the identity census, its rules, the ceiling);
   `gate:background`'s and `gate:knownhosts`' rows (add `build/scan-source.mjs`; `ablation:p307` is the attack beside
   them); `conformance:handback`'s row (membership and adjacency); `conformance:save`'s row (rule 14 extended);
   `conformance:redline`'s row (rule 40 clause 7 reads the mark); `conformance:overview`'s row (the scanner's view and its
   contract); the `probe:p268` row (it hides every agent and counts nothing itself). Nothing else.
5. `npm run typecheck`
6. `npm run build` (carries `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:checks`, `gate:contract`)
7. `npm test`, under the history block with a scratch `HOME` (the four `/bin/ps` native failures named, nothing else red)
8. `npm run conformance:save`
9. `npm run ablation:p268`
10. `npm run conformance:redline`
11. `npm run conformance:redline-write`
12. `npm run conformance:containment`
13. `npm run conformance:samefolder`
14. `npm run ablation:p274`
15. `npm run conformance:overview` (table byte identical to `/private/var/tmp/tortie-wt/scratch/p352/spec/m310/conformance-overview-parent.log`)
16. `npm run conformance:handback`
17. `npm run ablation:p296`
18. `npm run ablation:p307`
19. `VITEST_LANE=native node node_modules/vitest/vitest.mjs run src/main/watcher/__tests__/repo-watcher.native.test.ts src/main/config/__tests__/store-watch.native.test.ts` (history block, `TMPDIR` under the scratch)
20. `npm run smoke:t1`, under a lock slot
21. `npm run package:dir -- -c.mac.identity=null`, UNSIGNED, with `build/p351/SPEC.md` §9.1's `env -u` line and a scratch `HOME`, under a lock slot (the Electron zip may be fetched once into that `HOME`)
22. `shasum -a 256 src/main/menu.ts` (`fe62e1dd…`); `git diff --stat 8b63abc1` (only §9.1's files and this SPEC)
23. The end-of-run count (§10.5); `stat` again.

## 12. What is NOT in this phase

- Nothing an entry refuses: each entry's "What is NOT in this phase" carries in whole (290: no non-undoable reload, no
  sentence, no adoption of remembered bytes; 274.1: no `addProject` change, no canonicalising elsewhere, nothing about
  Finder; 274.3: no change to what is refused, no normalisation, no new surface; 285: no verb but `list-sessions`, no
  weakening of the socket refusal or the announcement, no rewrite of every bare count; 307: `menu.ts` not edited, no AST
  parser, `NEVER_STOPS` and `DETACHED` unchanged, no fixture loosened; 308: `repo-watcher.ts` and `vitest.config.ts`
  untouched, no skip, no retry attribute, no raised timeout; 310: nothing admitted, parsed or counted moves, not the
  paths flag, not a worker).
- 283 and 274.2 are not built (§1). 327 is not in this phase; 319 and 318.1 stay parked.
- No release, tag, version bump, archive or upload. Nothing under `ios/`.
- Not the other `$`-pattern replacement this spec found (`redline-sentences.ts:235`'s held sentence: not an fs refusal),
  and not `assertBasename` accepting a zero-width-only name: both queued by the main session, not built.
- No Settings surface for an outdated installed shim (Q2).

## 13. For the main session at landing

- 283 and 274.2 close with this file's §2.1 and §2.3; the running log and both entries say so. 285's entry gains 308's
  three clauses as built (D14, D16). If 283 stays closed, the subject's "auto save hold" no longer describes anything
  built: `fix(editor): rewinds hold across tabs, and folder names agree` fits what lands.
- **Disclose to him**: run 0 of §2.1 let the app run `cursor-agent` and `opencode` for their versions (the committed
  `probe:p268` hides no agent), and `cursor-agent`'s own log names an analytics launch toward `api2.cursor.sh`. Every
  later run hid them, and D18 makes the converted probes hide them.
- D24 (`smoke`, `smoke:t3` not run) and D25 (`ELECTRON_RUN_AS_NODE` for 310's timing) are the main session's to accept.
- Scratch to remove after landing: `/private/var/tmp/tortie-wt/scratch/p352/` (this step's `m307/clone` is a full
  `cp -Rc` of the worktree's files, `node_modules` included, and `m283/tmp` holds 13 harness run folders).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

- **Q1 (274.2), rewritten in the fix round.** Claude Code 2.1.316's own program text (read only; no agent ran and no
  file of yours was read) keys a project in `~/.claude.json` by its folder's git root, or else by the folder's real path
  with its accents composed. So the Context panel misses a project's local servers and approvals whenever Tortie stored
  the folder spelled any other way: a wrong case, or an accent the disk keeps decomposed. A second lookup by Claude Code's
  own rule would find them, and it needs Tortie to compose the accents of a path, which the entry forbids. Do you want it
  (a) left alone (the default), or (b) built, the rule lifted for that one lookup?
- **Q2 (274.1).** `tortie .` will open a folder under its name on disk, the way Finder does, including a folder reached
  through a link, which then shows the link's target; since the fix round only for a path of plain ASCII, so a folder
  with an accent opens as the terminal spells it, as today. A tortie command you already installed keeps the old script until
  you Remove and Install it again in Settings. Is that fine as said in the release note (the default), or do you want
  main to correct the folder the command hands it (reaches every installed command at once; the entry refused it), or
  an Update button in Settings later?
- **Q3 (285), answered by the fix round's default.** The census reads around a launch that names a scratch socket and
  only there, as you allowed on 2026-11-02; the entry's widening to every launch (D15) was dropped, because a launch
  naming no socket then failed when you ended a session, where the parent read nothing. Widen it later only on your word.
- **Q4 (283).** The auto save write outside a project did not repeat in 13 runs, 11 of them under heavy load (21 since
  its one failure in September). Close it (the default)?
- **Q5 (285).** Seven old research scripts (Phases 245, 247, 250, 253; the seventh, `build/p245/corpus-scan.mjs`, found
  by the checks lens, reads your live sessions' contents with `capture-pane`) can aim any tmux command at your live
  server and do not go through the guarded helper. Delete them, or leave them counted under the ceiling and never run
  (the default)?

## 15. The spec step's commands, exit codes and numbers

| # | Command (scratch `/private/var/tmp/tortie-wt/scratch/p352/spec/`) | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `npm run build` (history block) | 0 | 47.6 s; `[electron-teardown] 576 files … 179 … floor of 179`; `[background-teardown] 578 files … 3 start … 19 of 19`; `[known-hosts] 606 files … 19 scripts … 36 fixtures, 32`; `assert-hermetic-checks: PASS. 276 check scripts`; contract inventory OK |
| 2 | `bin/make-p268-copy.mjs` (two passes) | 0 | the copy names `'gmux'` only in its refusal; diff = the five intended changes |
| 3 | `bin/m283-run.zsh` ×2 unloaded (slot `electron.lock`) | 0, 0 | 75 s and 74 s; arm G correct |
| 4 | `bin/m283-run.zsh`, 12 burners, 16.5-min budget (slot `electron.lock`) | 0 | 11 runs in 13.9 min, every exit 0, arm G correct 11 of 11; burners 12 of 12 ended |
| 5 | `bin/m283-ticks.mjs` over the 13 runs | 0 | §2.1 |
| 6 | `bin/m2741.zsh`, `bin/m2741b.zsh` (history block; one `hdiutil` image, detached in a `trap`) | 0 | §2.2 |
| 7 | `bin/m2742-tmux.zsh` (history block; scratch sockets ended in a `trap`) | 0 | §2.3 |
| 8 | `m2743/m2743.mts`, `m2743/m2743-dollar.mts` (pinned tsx) | 0 | §2.4 |
| 9 | `bin/m285-format.zsh`, `bin/m285-nametab.zsh` (scratch sockets ended in a `trap`), `bin/m285-scan.mjs`, `bin/m285-population.mjs`, `bin/m285-ceiling.mjs` | 0 | §2.5; D13 |
| 10 | `vitest run src/renderer/editor/__tests__/p2822-second-undo.test.ts` | 0 | 7 of 7 |
| 11 | `cp -Rc` of the worktree's files into `m307/clone`; `bin/m307.mjs`; `ablation:p296` and `conformance:handback` in the clone | 0 | §2.7; ablation 8.2 s; handback 0.67 s |
| 12 | `m308/m308.mts` under load; the two native files once | 0, 0 | §2.8 |
| 13 | `m310/m310-copies.mts`; `npm run conformance:overview` | 0, 0 | §2.9; 3.0 s |

**History**: `~/.zsh_history` read `742100 1793638187` and `~/.bash_history` `23166 1790702242` at the start, before and
after every app run, shell and load run, and at the end: never moved. **Left behind**: no Electron of this step, no
`p352` socket, no attached image, no burner; every lock slot released. **Not run, and why**: 283's twenty loaded runs
(the brief capped the measurement at 20 minutes; 13 fit); 274.1's and 274.3's app run, 290's arm M, 310's Electron-engine
timing and `probe:p300` (the verifier's, against built code that does not exist yet); the whole native lane (four
`/bin/ps` tests cannot pass under the history block); 274.2's population count and any real agent (forbidden).

## §As built — the integrator (2026-11-02, at `8b63abc1` plus the uncommitted phase)

Four builders reported, then the integrator reconciled the seams, wrote the shared files and ran §11. Scratch, scripts
and every log: `/private/var/tmp/tortie-wt/scratch/p352/integrator/` (`bin/`, `logs/`). Nothing was committed, staged or
stashed; `/Users/gdc/gmux` was not written.

### Files

`git diff --stat 8b63abc1`: 44 tracked files, 4,555 insertions and 764 deletions, and 6 new files. Every one is in §9.1
or is this SPEC, except **`build/conformance-containment.mjs`, one line** (the integrator's seam, below).

| Owner | Files |
| --- | --- |
| editor (290) | `tab-types.ts`, `tab-io.ts`, `store.ts`, `RedlineDocument.tsx`, `redline-accept.ts` under `src/renderer/editor/`; `p2822-second-undo.test.ts`, `p2822-after-undo.test.ts`, `p282-view-presses.test.ts`, `p290-owed-read.test.ts` (new, 23 tests); `build/conformance-save.mjs`, `build/conformance-redline.mjs`, `build/probe-redline-move-on.mjs`. Not touched: `redline-press.ts`, `p277-save-drive.ts` |
| folders (274.1, 274.3) | `src/main/shell/shim.ts`, `shim.test.ts`; `src/shared/visible-name.ts` (new, 116 lines), `visible-name.test.ts` (new, 330 lines); `src/main/fs/errors.ts`, `paths.ts`, `file-ops.ts`; `src/renderer/tree/entry-name.ts`, `entry-name.test.ts`; `src/renderer/editor/save-sentences.ts`, `p240-save-sentences.test.ts`. Not touched: `file-ops.test.ts` |
| checks (285, 307, 308) | `build/electron-run.mjs`, `assert-electron-teardown.mjs`, `DEVELOPMENT.md`, the six probes of D18; `build/scan-source.mjs` (173 lines added, none removed), `assert-background-teardown.mjs`, `background-fixtures.mjs`, `assert-known-hosts-scoped.mjs`, `handback-conformance-probe.mts`, `conformance-handback.mjs`, `build/p307/ablation.mjs` (new); the two native test files. `HELPER_USER_FLOOR` stays 179 |
| reader (310) | `src/main/overview/reader/lines.ts`, `build/overview-conformance-probe.mts`, `p310-scan-views.test.ts` (new, 28 tests) |
| integrator | `package.json` (`ablation:p307` after `ablation:p296`); `build/verification-checks.mjs` (`pure('ablation:p307', …)` with its comment); `CHANGELOG.md` (§5's four items, verbatim, last under `## Unreleased` then `### Fixed`, no link); `CLAUDE.md` (the eight rows of §11 step 4: `gate:electron`, `gate:background`, `gate:knownhosts`, `conformance:handback`, `conformance:save` (and its trigger column gains the store's `adoptWritten` action), `conformance:redline`, `conformance:overview`, `probe:p268`; `gate:background` and `gate:knownhosts` gain `build/scan-source.mjs` as a trigger; and one sentence of the `probe:p349` row, which said the census never runs for a launch with `tmuxSocket: null` and which D15 made untrue); `build/conformance-containment.mjs:555` |

`src/main/menu.ts` sha256 `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3` at the end, as at the
start. `docs/audits/contract-baseline.txt` did not move (`gate:contract` byte for byte).

### Decisions that moved from this spec, or that it left open, each kept

**editor (290).**
- D8: `rewindOwesRead` is OPTIONAL on `EditorTab` (`rewindOwesRead?: boolean`), the store setting `false` on every tab it
  makes and every reader asking `=== true`. Required, `tsc -b` failed with 6 errors in 6 test files outside the row,
  one of them `audit-0914-auto-save.test.ts`, which `conformance:save` rule 24 requires to ship byte for byte.
- D9: the mark is set by the STORE's `adoptWritten` action right after `./tab-io`'s adoption answers, and only for a tab
  the adoption left holding bytes other than the ones the write wrote; `tab-io.ts`'s `adoptWritten` body is unchanged.
  §4.1 step 2's literal shape could not be built: `ablation:p268` arms 19 to 21 look for the exact text
  `if (tab.dirty || tab.savedContents !== was) return;`, and `adopt-written.test.ts` (outside the row) requires a refusal
  to patch nothing. `conformance:save` gains rule 30 to hold where the mark moves.
- Two refinements, each to keep no scenario worse: no mark when the refusing tab already holds the written bytes (a walk
  read them first, and nothing would clear it); and the walk's EQUAL read clears a standing mark (an agent writing its
  words back after the rewind; without it ⌥↩ stayed refused after a switch until a save, where the parent accepts).
  `completeSave` clears only a standing mark, so `p240-guarded-save.test.ts`'s 7 exact-patch assertions stay green.
- D10 reads twice on a Redline undo while the mark stands (the store's clean edge and the `[tab.dirty]` effect); the
  second walk finds nothing. `p2822-after-undo.test.ts` and `p282-view-presses.test.ts` count one more read and walk.
- Door 2 calls `rereadRepo` through a local, because `p334-redline-view-wiring.test.ts` requires
  `useEditor.getState().rereadRepo(tab.repoPath);` exactly once in `RedlineDocument.tsx`.
- `conformance:redline` rule 40: clause 7 asks the mark AND the landed hold; new clause 8 (the mount's door, keyed on
  `[tab.id]` alone); clause 1 requires `owed: …rewindOwesRead` in the accept.

**folders (274.1, 274.3).**
- `friendly` quotes the name in 12 sentences, not §0.1's 11; all 12 and both `FALLBACK` uses pass `visibleName`.
- Idempotence: read literally, D5 is not idempotent (`a️‍🎉` → `a<U+FE0F>‍🎉` → `a<U+FE0F><U+200D>🎉`),
  so a joiner counts a U+FE0F before it only when that U+FE0F was itself kept. Stated in the header, tested and ablated.
- `staleSaveTitle` is a template literal in this tree (no `replace`, so no `$` pattern is read); `visibleName` is
  applied inside it. The four `$` shapes are tested on it and on all 12 save sentences.
- The header states its limits: a literal `<U+…>` reads like an escape; tag sequences are written out; a ZWJ or ZWNJ that
  Persian or the Indic scripts shape with is written out; digits, `#` and `*` count as emoji, so `1️` keeps its
  selector; 32 Cf code points are outside D5's set (U+FFF9 to FFFB and U+13430 to 1343F draw nothing and pass raw).
- Not covered, by D6: `autoSaveStopSentence`'s link arm still quotes the raw name.

**checks (285, 307, 308).**
- A session's identity is its `$-id` WITH its creation time (a restarted server numbers from `$0` again); fixture and
  ablation.
- A reading tmux could not answer fails closed: only `no server running on` and `error connecting to … (No such file or
  directory)` read as an empty server (both measured on 3.6a and 3.7b). An unreadable row fails unless the identical line
  was there before the launch. A manifest never asked beside a stamped new session fails. The census and `sqlite3` calls
  carry a 10 s timeout.
- `liveSessionNames` (now a wrapper over `liveSessionRows`) and `censusFinding` are kept because
  `build/p261/probe-p261-socket.mjs` imports both.
- 5f finds the enclosing bracket by reading BACKWARD (a forward reader misplaced `probe-p64-arch.mjs:257`, where
  `stripComments` loses its place after nested template literals); it covers the helper and 192 importers. The ceiling
  reads only the `'-L', 'gmux'` pair: counting the attached `-Lgmux` picked up a comment in `p324/probe-p324.mjs` (110).
- 307: one addition, arm S1: the named-regex shape does not apply inside a function that takes that name as a parameter.
  Counts at HEAD over 579 files, parent rule → HEAD: promoted functions 609 → 207, dot-preceded candidate sites 1,127 →
  247, declaration sites 521 → 0. The gate's own source with §2.7's plant: 4 findings at the parent, 2 at HEAD (both
  `form.exec(before)`, a loop variable no shape covers).
- `DEVELOPMENT.md:532` kept as written: a dated measurement that is still true.

**reader (310).** The copy site is `const c = held.length === 0 && nl !== -1 ? seg : Buffer.from(seg);`; both stage-2
pushes copy, which puts the copy inside `decideMs` (§6). The test adds the ten committed JSONL records under
`docs/research/assets/63-fixtures`, each through its provider's rules, with a guard that fails when a record is added
unlisted, and a view kept past the call shown overwritten by the next chunk. Its ablations in a clone: parent `lines.ts`
26 of 28 red, `held.length` check removed 22, newline check removed 23, always a view 23, probe copy removed 1.

**integrator.**
- **`build/conformance-containment.mjs:555`, outside §9.1.** Rule 9's ablation "the ancestor walk rethrows the raw errno"
  quoted `paths.ts:284`'s old line in its `from` string, so after 274.3 it found nothing to edit and the gate went red
  (the folders builder stopped and named it, as §9.1 says). The needle now quotes the line as it stands
  (`\"${visibleName(basename(current))}\" could not be read (${token}).`); the arm still replaces the whole throw with
  `throw err;`, and the gate reads 10 of 10 ablations red. No other `build/` needle quotes a removed source line: the
  integrator's scan (`bin/needles.mjs`) read the 21 removed lines' longest quote-free runs against 608 files under
  `build/` and found only that one and `conformance-redline.mjs`'s deliberate "holds alone" ablation shape.
- `verification-checks.mjs`'s needs text says what the script does (the checks builder's correction of §11 step 3): it
  clones `src/` and `build/` under the system temporary directory, edits copies of the three gates, `scan-source.mjs`
  and `src/main/menu.ts` there, restores every file by sha256 in a `finally`, removes the clone, and spawns only node.
- A ten-line duplicated-block scan (`bin/dupes.mjs`) over the 45 changed source and script files found 20 windows, all
  import lists and header comments the p237, p268 and p277 probes share, and two setup sequences inside
  `p290-owed-read.test.ts`; no logic block to extract.

### §11, in order, at the integrated tree

Every command ran under the history block (`sandbox-exec -f …/no-history.sb`) with `HOME` and `TMPDIR` under the scratch
(`TMPDIR` spelled `/var/tmp/…`, because `protocol.test.ts` requires a temporary folder reached through a symlink), except
`ps`, which cannot start there.

| # | Command | Exit | Wall | Reading |
| --- | --- | --- | --- | --- |
| 1 | `df -h /`; history stats | — | — | 63 GiB free (62 GiB before the package); `742100 1793638187`, `23166 1790702242` |
| 2 | `node build/assert-electron-teardown.mjs` (§9.2) | 0 | 2.8 s | 577 files; 179 reach the helper against a floor of 179; the census judged 22 by identity; list-sessions the only verb by the helper and the 192 scripts that import it; 24 of 24 ablations; **102 other scripts aim an argv at -L gmux, under a ceiling of 102 that refused 1 of the 2 counts it was shown**. Every converted probe names `'gmux'` only in its own socket refusal |
| 3 | `package.json`, `verification-checks.mjs`; `node build/assert-hermetic-checks.mjs` | 0 | — | PASS, 276 check scripts (an `ablation:*` name is not a check family; the entry is held by the second loop), 83 pure |
| 4 | `CHANGELOG.md`, `CLAUDE.md`, `conformance-containment.mjs:555` | — | — | as above |
| 5 | `npm run typecheck` | 0 | 3.4 s | 1,435 production files, 8,180 imports, 0 violations; 4,996 runtime edges, 0 cycles |
| 6 | `npm run build` | 0 | 60.9 s | `[background-teardown] 579 files … 3 start … 25 of 25 fixtures`; `[known-hosts] 607 files … 19 scripts … 36 fixtures, 32 of which must fail`; hermetic PASS (1,167 test files); `conformance:ios` PASS, 54 rules; `gate:onlyadd` PASS; harnessprobes 6 clauses, 16 ablations; contract inventory byte for byte |
| 7 | `npm test` | **1** | 64.2 s | 1,167 files (4 failed, 1,161 passed, 2 skipped); 21,921 tests: **5 failed**, 21,902 passed, 14 skipped. The four `/bin/ps` tests (`spawnSync /bin/ps EPERM`): `process-table.native.test.ts` "sees this process under its true parent and walks the chain to it"; `ps.native.test.ts` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid"; `p269-env-names.test.ts` "kills a shell that never exits, on the deadline, leaving no survivor". **The fifth**: `repo-watcher.native.test.ts` "ignores churn inside an ignored directory and still sees a tracked edit (Phase 151)", 15,139 ms, at `:318`: the POSITIVE 8 s wait for the tracked edit after the quiet window, at a load average of 27 inside the parallel suite. The same 8 s positive wait is the parent's (`:186` there), 308 forbids raising it, and the checks builder measured positive timeouts at both builds under load (parent 3 of 4 green, HEAD 3 of 4). Row 19 runs the two files alone: green |
| 8 | `npm run conformance:save` | 0 | 0.7 s | every rule; `14. and pulls a rewind's owed read after both, on the way out of dirty and only while the tab's mark stands (Phase 290)`; rule 30 with `6 of 6 ablations of the SHIPPING source` |
| 9 | `npm run ablation:p268` | 0 | 18.9 s | PASS, 35 ablations, the tree restored byte for byte by sha256 |
| 10 | `npm run conformance:redline` | 0 | 26.0 s | every rule; rule 40 `20 of 20 ablations of the SHIPPING source`; rule 41 13 of 13 |
| 11 | `npm run conformance:redline-write` | 0 | 17.2 s | 30 readings, 17 of 17 ablations |
| 12 | `npm run conformance:containment` | 0 | 1.6 s | 52 readings, 10 of 10 ablations red (after the needle) |
| 13 | `npm run conformance:samefolder` | 0 | 3.4 s | §8 on both kinds of volume, 9 of 9 ablations |
| 14 | `npm run ablation:p274` | 0 | 1.4 s | 13 of 13; 8 files restored by sha256 |
| 15 | `npm run conformance:overview` | 0 | 2.9 s | PASS. **Byte identical**: the parent log less its `time` line and HEAD's log less npm's four header lines both hash `2f69f488b9e6df78953de2041568940e07f37df6666a4dadd3a4f8341b199008` |
| 16 | `npm run conformance:handback` | 0 | 0.8 s | PASS; rows in the Session menu 1; placed after End Session yes; in the Session menu yes; the row after End Session `item('Resume Conversation', 'resume-conversation', undefined, 'terminal')` |
| 17 | `npm run ablation:p296` | 0 | 7.8 s | PASS, 11 arms, 7 red on their sentences, 4 green |
| 18 | `npm run ablation:p307` | 0 | 33.9 s | PASS, 11 of 11 (R1, R2, R3, R4, S1, D1, B1, B2, K1, M1, M2), the four controls found under every arm; the worktree's 5 files unmoved, `menu.ts` `fe62e1dd0563`; the clone removed |
| 19 | the two native files, `VITEST_LANE=native` | 0 | 14.9 s | 2 files, 5 of 5, load average 8.6 to 7.4 |
| 20 | `npm run smoke:t1` | — | — | **NOT RUN**: the workflow's own instruction to this integrator says "Do NOT run smoke:t1", against this SPEC's D24 and step 20; the prohibition was kept. The main session's at landing |
| 21 | `npm run package:dir -- -c.mac.identity=null`, §9.1 of `build/p351/SPEC.md` (one lock slot, `electron.lock`) | 0 | 30.1 s | `after-pack: 27 Mach-O files, every one holds arm64 code` before the first `CFBundleName` line; specstory, rg and tmux signed ad hoc; 7 externalized requires present; skills 1.5.22 runs; `skipped macOS code signing reason=identity explicitly is set to null`. The Electron zip was seeded by APFS clone from `scratch/p350/integrator/home` (43.3.0, sha256 `ee939d15…`) and its size and mtime did not move (`122102881 1786298401`), so only `SHASUMS256.txt` was fetched. `release/mac-arm64/Tortie.app` is gitignored |
| 22 | `shasum -a 256 src/main/menu.ts`; `git diff --stat 8b63abc1` | — | — | `fe62e1dd…`; as under Files |
| 23 | the end-of-run count (§10.5) | — | — | no Electron of this run: the bare `Tortie` (pid 90306, started 27 October) and its crashpad are his `/Applications/Tortie.app`, the other crashpads Granola, Chrome, Cursor and Slack; no `p352` or `gmux-p352` socket under `/private/tmp/tmux-501/`; all three lock slots free; no process names the scratch or the worktree; no disk image of ours attached |

Also run, by the paths changed: `conformance:watcher` 0 (0.6 s), `gate:checks` 0 (0.7 s), `gate:contract` 0 (0.9 s).
The probes' own grader self-tests, run with `node <probe> --self-test` (never through `npm run probe:*`, which launches
the app) under one lock slot: `probe-p268-autosave.mjs` 0, 9 fixtures; `probe-p277-save.mjs` 0, 12 fixtures;
`probe-redline-move-on.mjs` 0, 104 of 104. The four p237 probes have none.

**History**: `~/.zsh_history` `742100 1793638187` and `~/.bash_history` `23166 1790702242` at the start, before and after
every run, and at the end: never moved.

### Not run, and why

- `smoke:t1` (row 20), and `smoke` and `smoke:t3` (D24).
- Every app run and probe arm (`probe:redlinemoveon` arm M, `probe:p277`, `probe:p268`, `probe:p300`, the 274.1/274.3
  launch) and `measure:p300-split`: the verifiers', against this tree.
- The four `/bin/ps` tests outside the history block: never.

### Found, not this phase's, owed an entry (for the main session)

- **The reader's own scanner defect, in the parent too** (the reader builder, measured): `chunk.indexOf(10, i)` in
  `scanFile` is not bounded by the `n` bytes just read, so when a record's last line has no newline yet and the last read
  is short, the search runs into the previous read's bytes and "finishes" the line with stale bytes; at the shipping
  1 MiB chunk a 1.5 MiB record read `lastCompleteOffset` 1,573,264 against a size of 1,573,047, its last line 255 bytes
  (39 real, 216 stale), identical at both builds. Proposed: `if (nl >= n) nl = -1;`. It would move a count, which 310
  refuses; a Tier 3 entry of its own. 310's verifier's "record growing while read" attack meets it at both builds alike.
  **Worse than first written (the folders lens, re-stated by the fix round):** the chunk is a `Buffer.allocUnsafe`, so
  the bytes past `n` may never have held this file at all; it is UNINITIALIZED MEMORY and the result is
  NONDETERMINISTIC run to run within one build (869 or 870 lines, and `lastCompleteOffset` up to 1,760,864 on a
  1,678,030-byte file, at both builds). The owed entry says so, and its fix bounds the search to `n` (`if (nl >= n) nl =
  -1;`, or search `chunk.subarray(0, n)`).
- With `CDPATH` set, the shim's `cd` can print a path into `abs` (the folders builder): the same before and after 274.1.
- Reading the census on EVERY launch (D15) means a launch that names no socket and whose app reaches his server now
  fails if it makes anything there, `gmux-control` among them when his app is not running (the checks builder). That is
  D14 (b) as written.
- `release/` in the worktree holds the unsigned package; the integrator's scratch is 135 MB. Both go at landing.
- **D15 meets a ruling of his for Phase 349, so Q3 is not only a widening.** `build/p349/probe-p349.mjs:128-136` says
  "nothing it starts lists that server, not even to count (his ruling, the fix round of 2026-10-31)", and that it
  "never runs its layer-4 census of `-L gmux`" because it passes `tmuxSocket: null`. With D15 the helper's read-only
  `list-sessions` now runs around that probe's launches too. His allowance of 2026-11-02 named launches that name a
  socket. The integrator corrected the `probe:p349` row of `CLAUDE.md` to what the code now does; the probe's own header
  is outside every list here and still says the census never runs. If he answers Q3 "no", D15 goes, the header is true
  again and the row's sentence goes back to what it said.

### The fix round (2026-11-02, 22:19 to about 23:55, the fixer, at `8b63abc1` plus the uncommitted phase)

Three lenses answered `needs_work` (the editor on 290, the folders on 274.1, 274.2 and 274.3, the checks on 285 and 307;
283, 310 and 308 approved). The fix ran once. Every major and minor is answered; no item is dropped whole. Two PARTS were
dropped because each was a scenario worse than the parent: 274.1's physical path for a path that is not plain ASCII, and
285's D15. Scratch, scripts and every log: `/private/var/tmp/tortie-wt/scratch/p352/fixer/` (`bin/`, `logs/`). Nothing
was committed, staged or stashed; `/Users/gdc/gmux` was not written; nothing aimed at `-L gmux` but the helper's own
`list-sessions`.

#### What each finding got

| Lens | Finding | Sev. | What the fix did (source) |
| --- | --- | --- | --- |
| editor | rule 30's shipping check asked one walk clear, not two (A8, A9 green) | minor | `markProblems(m)` in `build/conformance-save.mjs` is now the ONE reading the shipping check, the fixtures (`markOk`) and the shipping ablations ask, and it wants exactly two; shipping ablations for each of the walk's two clears (lens fix) |
| editor | `pressAccept`'s refusal on the mark held by no gate (A19 green) | minor | rule 19 arm **19g** drives the SHIPPING `pressAccept` (`build/redline-accept-probe.mts`, `heldOnMark`): held on the mark with no hold, nothing advanced or refused; the same press with no mark accepted; `nothing` before it; held before the plan's `baselineMoved`. Its ablation removes `\|\| deps.owed === true` (lens fix, placed in rule 19 because that rule drives the shipping accept) |
| editor | the mark's direction read nowhere (A5, A14, A16, A18 red only on anchors) | minor | `markSign` in `conformance-save.mjs` gives rule 14 an `inverted` and an `unread` answer; `markSignIn` and `markPolarityOf` in `conformance-redline.mjs` read `!`, `&&`, `\|\|` and brackets (and a `const` the body declares) for clauses 1, 7 and 8, early return and guard alike. Fixtures: 3 in rule 14, 4 in rule 40. Shipping ablations: rule 14's inversion, and rule 40's mount, clean transition and accept inversions, each red on its own sentence (lens fix) |
| editor | arm M's parent reading no longer happens at the parent build | minor | the arm M header, `mParent` and §0.1/§4.1 say what the parent build reads; the entry's quote kept as `mUndoEntry`; a THIRD sub-arm, `tab` (another file and back while dirty, ⌥↩, ⌘Z back to clean, the rhythm), the lens's arm V shape (lens fix) |
| editor | 283's arm G cannot name a cause | nit | not done (optional, as the lens says) |
| folders | 274.1 stores a decomposed folder's bytes where the shell typed it composed, and the Context panel then misses Claude Code's composed key | major | the shim asks `/bin/pwd -P` ONLY for a path of plain printable ASCII (`LC_ALL=C /usr/bin/tr -d ' -~'` leaves nothing); any other byte hands on the logical `pwd`, the parent's answer. Nothing normalises a path (Phase 274's rule 2, the entry's refusal). "Drop the part that regresses" (new; the lens offered a second key, which needs `.normalize()`, or dropping 274.1) |
| folders | 274.2's closure premise refuted by Claude Code 2.1.316's own text | major | §0.1, §1, D2 and Q1 rewritten with the measured rule; still unbuilt, because the second key needs `.normalize('NFC')` and the entry refuses it: his word (lens fix) |
| folders | the CHANGELOG's "names a file in a message" is untrue for raw quoting sites | minor | the REFUSAL sites the survey missed now pass `visibleName`: `autoSaveStopSentence`'s link arm, the Explorer's copy-in skip toast (`tree-ops.ts`), project create's two refusals (`src/main/projects/create.ts`) and the clone collision that ships create's sentence by name (`src/shared/clone-copy.ts`); the CHANGELOG narrowed to "When Tortie says it could not do something with a file or folder"; the Delete and Replace confirmations stay as D6 left them (lens fix, both halves) |
| folders | the reader's scanner reads uninitialized memory | minor | the owed entry under "Found, not this phase's" now says so and bounds the search to `n`; 310 refuses a count move, so not built here (lens fix) |
| folders | a link opens under its target's name, unsaid | nit | one clause in the CHANGELOG item |
| folders | U+2800 draws blank and passes raw | nit | a stated limit in `visible-name.ts` |
| folders | "960 MiB first read 1122 ms" not reproduced | nit | the commit body cites the lens's numbers: HEAD 1,455 to 1,583 ms against the parent's 1,669 to 1,846 ms |
| checks | 5f reads the literal pair alone, so four spellings ended his session as a note | major | 5f reads every spelling the script itself writes: the pair; `-Lgmux`; `-L` with a name declared `'gmux'`, a template of such names, or a `+` of literals and names; `-S` or `-S…` with a path that is `gmux` or ends `/gmux` (also a template's tail and a `join` or `resolve` whose last part says it); an argv holding a name declared as a `-L` or `-S` flag. 14 new fixtures (10 must fail; 4 controls, one the run-time-computed STATED LIMIT). The ceiling's detector reads the same, which moves it to **105** with no script added (lens fix) |
| checks | a destructuring ASSIGNMENT rebinding a regex name dropped a start (v01, v02, k02) | major | `boundOtherwise` in `build/scan-source.mjs` also reads every destructuring assignment target (`assignmentTargetsOf`, `openerBefore`, a member access refused); the three shapes are fixtures, `R2` in `build/known-hosts-fixtures.mjs` beside an `R1` control (lens fix) |
| checks | two byte-identical bodies read at the first one's place (v03) | major | `spawnersIn` asks at EVERY place a body's text occurs (`placesOf`); one place reading a start promotes (lens fix) |
| checks | a slash after a postfix `++` dropped a start (v04) | minor | `receiverOf` declines both literal shapes after a postfix `++` or `--`; `stripComments` is not changed, which keeps every other gate's reading as it was (lens fix, its second option) |
| checks | three census trade-offs unstated (rename unseen, restart fails, late stamp) | minor | a rename is judged as a session that went is (a note after an agreeing announcement, a failure otherwise); his server restarting is read as his after an agreeing announcement (an unstamped session that appeared under the name of an unstamped one that went); the late stamp is stated. Header STATED LIMITS and DEVELOPMENT.md (new for the first two: each was a scenario worse than the parent) |
| checks | D15 reads his server around launches his allowance does not name | minor | **D15 DROPPED**: the census reads only around a launch that names `tmuxSocket`; 5h requires that guard and refuses a read on every launch; the `probe:p349` row of CLAUDE.md is back to the parent's sentence (lens fix, "if he says no"; dropping is the no-regression default) |
| checks | Q5 misses `build/p245/corpus-scan.mjs` | minor | §0.1 and Q5 name it; the ceiling counts it (lens fix) |
| checks | 308's lane red under the machine's stream | minor | no code change; the commit body must not claim the ten greens or the planted-drop proof from this machine state (lens fix) |
| checks | CLAUDE.md and SPEC numbers stale | nit | the `gate:electron` row is rewritten; this section's numbers supersede §As built's (`ablation:p307` was 12 arms and `gate:background` 28 fixtures before this round; 15 and 32 now) |

#### Files the fix round touched

`build/electron-run.mjs`, `build/assert-electron-teardown.mjs`, `build/scan-source.mjs`,
`build/assert-background-teardown.mjs`, `build/background-fixtures.mjs`, `build/known-hosts-fixtures.mjs` (new to the
delta), `build/p307/ablation.mjs`, `build/conformance-save.mjs`, `build/conformance-redline.mjs`,
`build/redline-accept-probe.mts` (new to the delta), `build/probe-redline-move-on.mjs`, `src/main/shell/shim.ts`,
`src/main/shell/__tests__/shim.test.ts`, `src/renderer/editor/save-sentences.ts`,
`src/renderer/editor/__tests__/p240-save-sentences.test.ts`, `src/renderer/tree/tree-ops.ts`, `src/main/projects/create.ts`,
`src/main/projects/__tests__/create.test.ts`, `src/shared/clone-copy.ts`, `src/shared/visible-name.ts`, `CHANGELOG.md`,
`CLAUDE.md`, `DEVELOPMENT.md` and this SPEC. Six of them are outside §9.1's lists (`known-hosts-fixtures.mjs`,
`redline-accept-probe.mts`, `tree-ops.ts`, `create.ts` with its test, `clone-copy.ts`), each named above.
`src/main/menu.ts` still hashes `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3`.
`git diff --stat 8b63abc1`: 50 tracked files, 6,209 insertions and 772 deletions, and the same 6 untracked paths.

#### Commands, exit codes and numbers

Every command ran under the history block with `HOME` and `TMPDIR` under the scratch, except the Electron launches and
`ps`.

| Command | Exit | Wall | Reading |
| --- | --- | --- | --- |
| `node build/assert-electron-teardown.mjs`, before the ceiling moved | 1 | 3 s | everything green but `105 scripts … the ceiling is 102` (the three it newly reads) |
| `npm run typecheck` | 0 | 9 s | 1,435 production files, 8,183 imports, 0 violations; 4,999 runtime edges, 0 cycles |
| `npm run build` | 0 | 48 s | `[electron-teardown]` 577 files, 179 against a floor of 179, census judged **26** by identity, the 192 importers, **32 of 32** ablations, **105** under a ceiling of 105 (refused 1 of 2), 32 under 32; `[background-teardown]` 579 files, 3 starts, **32 of 32** fixtures; `[known-hosts]` 607 files, 19 scripts, **38 fixtures, 33** must fail; hermetic PASS (276); contract inventory byte for byte |
| `npm test` | 1 | 53 s | 1,167 files (4 failed, 1,161 passed, 2 skipped); 21,927 tests: **6 failed**, 21,907 passed, 14 skipped. The four `/bin/ps` tests (EPERM under the block, by design) and two of `repo-watcher.native.test.ts` ("attaches the dotgit watcher after a late git init", "ignores churn inside an ignored directory…"), both at the 8 s barrier, with `fseventsd` at 100 % of a CPU and 6.0 GB |
| `npm run conformance:save` | 0 | 0.6 s | 85 fixtures behaved, 57 must fail; rule 30 **9 of 9** shipping ablations |
| `npm run ablation:p268` | 0 | 18.4 s | 35 ablations, the tree restored by sha256 |
| `npm run conformance:redline` (first run) | 1 | — | the accept probe would not load: the arm's `e2` clashed with a name the file declares; renamed `markChange` |
| `npm run conformance:redline` | 0 | 24.4 s | rule 19 **7 arms, 7 of 7** ablations moved; rule 40 **76 of 76** fixtures (68 must fail), **23 of 23** shipping ablations; rule 41 13 of 13 |
| `npm run conformance:redline-write` | 0 | 15.7 s | 30 readings, 17 of 17 |
| `npm run conformance:containment` | 0 | 1.5 s | 52 readings, 10 of 10 |
| `npm run conformance:samefolder` | 0 | 5.6 s | both volumes, 9 of 9; rule 23 over 114 files: 0 case folds, 0 `.normalize(` |
| `npm run ablation:p274` | 0 | 1.3 s | 13 of 13 |
| `npm run conformance:overview` | 0 | 2.9 s | the table equals the parent log's line for line (60 lines; the parent log's one extra line is its `time` line) |
| `npm run conformance:handback` | 0 | 0.5 s | PASS |
| `npm run ablation:p296` | 0 | 7.0 s | 11 arms, 7 red, 4 green |
| `npm run ablation:p307` | 0 | 45.3 s | **15 of 15** arms (R1 to R7, S1, D1, B1 to B3, K1, M1, M2); new plants `assigned`, `twins`, `postfix`; R5 and R6 also read the known-hosts gate red on its fixture `R2` alone |
| `npm run conformance:context`, `conformance:watcher`, `gate:checks`, `gate:contract`, `conformance:phonecopy` | 0 each | under 3 s each | PASS |
| `npm run ablation:p343` (it edits `tree-ops.ts` copies) | 0 | 227 s | 84 arms, the control left everything as it found it |
| `node build/probe-redline-move-on.mjs --self-test` | 0 | 1 s | **122 of 122** grader fixtures |
| `vitest run src/main/shell/__tests__/shim.test.ts` | 0 | 1 s | 26 of 26; the composed and decomposed cases ran (APFS folds both) |
| the two native files, `VITEST_LANE=native`, HEAD then the parent (`wt-p352-parent-checks`), one after the other | 1, 1 | 48 s, 28 s | 4 of 5 red at BOTH builds, same cases, `fseventsd` 100 % and 6.0 GB throughout: the machine's stream, as the checks lens measured |
| `npm run package:dir -- -c.mac.identity=null`, §9.1 of `build/p351/SPEC.md`, one lock slot | 0 | 33.2 s | `after-pack: 27 Mach-O files, every one holds arm64 code`; the seeded Electron zip's size and time unmoved (`122102881 1786298401`) |

#### The runs each fix reaches

- **Arm M, at HEAD and at the parent build** (`REDLINEMOVEON_ARMS=M`, then `REDLINEMOVEON_CHECKOUT=/private/var/tmp/tortie-wt/wt-p352-parent-editor`,
  one lock slot, one Electron each). HEAD exit 0 in 52 s: undo read 2 ms after the File view's ⌘Z; dirty ⌥↩ held 4 → 4
  with the way out said; **tab** ⌥↩ held 4 → 4 with the way out said, the read 1 ms after ⌘Z made the tab clean, the
  rhythm's ⌥↩ 2 → 1 on `linden`, nothing drawn backwards, the disk the rewind. Parent exit 1 in 56 s with exactly the
  six findings `mParent` holds: undo NO READ in 2,500 ms with `savedContents` the agent's text (and then 2 changes,
  nothing taken back); dirty ⌥↩ 4 → 3 unsaid; tab ⌥↩ 4 → 3 unsaid, NO READ, the rewind drawn backwards, and the agent's
  word written back on disk. `A0` "agents: ok" at both.
- **The editor lens's twenty ablations of the shipping source** (its `bin/ablate.mjs`, re-pointed at a clone of this
  tree): the control green on both gates, and **20 of 20 red on a clause of their own**, never only on another
  ablation's anchor. The seven that were green or anchor-only now read: A5 rule 14 "asks the tab's mark the wrong way
  round"; A8 and A9 rule 30 "refreshRepo clears the mark 1 time(s), where each of its two clean reads clears it once";
  A14 rule 40 "the mount asks the tab's mark the wrong way round"; A16 "the clean transition asks the tab's mark the
  wrong way round"; A18 "the accept hands pressAccept the tab's mark the wrong way round"; A19 rule 19 "the shipping
  accept read the wrong thing for 19g". Every file restored by sha256.
- **274.1 and 274.3 in the app** (the folders lens's `p352v-app.mjs`, re-pointed at this tree, one lock slot, one
  Electron): the wrong-case `cd` handed `…/Proj/RealName`, tab `RealName`, the Context scan finding Claude Code's key
  (`p352-key-disk`); the link handed `…/Real2/Target`; the decomposed folder typed composed handed `…/Caf\u{E9}` as typed,
  stored so, and the Context scan finding Claude Code's own composed key (`p352-key-nfc-claude-rule`), which is the
  parent's reading and was the major; the New file reason `"dup<U+200B>.md" already exists here.`; problems none.
- **274.1's shell table at both shims** (the folders lens's scripts over the parent's composed shim and this tree's): boot
  volume 18 reachable, HEAD the disk's spelling in 15 and the parent in 6; a case-sensitive APFS image 15 reachable, 10
  and 6; a fresh case-insensitive image 18, 15 and 6. **No row worse than the parent on any volume**: every row with a
  byte past ASCII (decomposed typed composed, composed typed decomposed, a zero-width space, a no-break space, a name
  ending in a newline) hands exactly the parent's answer. Both images detached and deleted, 0 attached after. The four
  edge cases (a deleted folder, an unreadable ancestor, CDPATH, a home through a link) read as the lens read them.
- **285's census, attacked** (the checks lens's `census-attack.mjs` re-pointed: the unmodified readers of both builds over
  47 plants on scratch servers reached by `-S` path, a PATH shim forwarding only the census's own `list-sessions`; tmux
  3.7b and 3.6a, identical): R6 the launch renames his session reads a NOTE after an agreeing announcement and FAIL after
  a silent one (it was nothing); H5 his rename the same; H6 his server restarting reads notes (8) after an agreeing
  announcement (it was a failure, and the parent read nothing); every run-caused plant the lens listed still fails;
  R7, R8 and R11 after an agreeing announcement stay notes, the entry's ruled design resting on 5f. A launch that names
  no socket is not read at all now, so the matrix's `none` rows are the parent's "no census".
- **285 end to end** (the lens's `census-e2e.mjs` re-pointed, the scratch socket named to the helper): 10 of 10 as
  expected through the unmodified `withElectron`, among them E6 and E7 (a launch naming no socket: no census, as at the
  parent), E8 (his rename after an agreeing announcement: a note), E9 (a rename the app said nothing about: rejected)
  and E10 (his server restarting with `gmux-control` back: notes, exit unchanged). No stand-in left.
- **The lens's own plants, in a clone**: `gate:background` now finds v01, v02, v03 and v04 (and v07 to v15 as before),
  not v05 and v06; `gate:knownhosts` finds k02 and k03, not k01; `gate:electron` refuses each of the four 5f spellings
  (`plant-5f.mjs:5` to `:8`, "aims "kill-server" at -L gmux") and counts 106 against 105.
- **`probe:p277`** at HEAD (one lock slot, one Electron, the converted probe): exit 0 in 68 s, 4 of 4 arms, agents ok, no
  census note or finding.

#### No regression against today, the rows the lenses marked worse

| Scenario | Today | HEAD before the fix | HEAD now |
| --- | --- | --- | --- |
| `tortie .` into a folder the disk stores decomposed, typed composed; the Context panel's Claude local scope | composed path stored, Claude's key found | decomposed stored, key MISSED | composed stored, key found, as today |
| A launch that names no socket, he ends a session | no census | FAIL | no census, as today |
| His server restarts mid-launch and his app brings `gmux-control` back (agreeing announcement) | nothing | FAIL | notes, exit unchanged |
| The launch renames one of his sessions, silent announcement | FAIL | nothing | FAIL |
| The launch renames one of his sessions, agreeing announcement | FAIL | nothing | note: the entry's ruled design, resting on 5f (no importer may aim `rename-session` at his server in any spelling it writes) |
| A probe script ends his session through `-Lgmux`, a name declared `'gmux'`, `'g' + 'mux'` or a `-S` path | census FAIL | gate green, census note | gate:electron refuses the script |
| v01, v02, v03, v04, k02 | found | missed | found |
| 308's planted drop under a 0.35 to 15 s stream | 2 of 4 green, by a late fire | 4 of 4 red at the barrier | unchanged (approved; the machine, at both builds) |

The rows that stay notes after an agreeing announcement where today failed (a session that went, his server ended, a
rename, a session stamped by an app that is not this launch, outside its scratch folders) are the entry's own design as
308 ruled it, and they rest on two things: the app said, every time it spoke, that it used the scratch socket, and 5f
refuses every spelling of his server a script writes. A socket name computed at run time and a command line a script
hands a shell are the STATED LIMITS, in the helper's header and DEVELOPMENT.md.

#### Not run, and why

- `smoke:t1`, `smoke` and `smoke:t3`: D24 and the brief; with D15 dropped `smoke:t1`'s launch, which names no socket, is
  no longer read by the census, so it is not Q3's case any more.
- The four `/bin/ps` native tests outside the history block: never.
- 308's ten consecutive greens and its planted-drop proof: not attainable on this machine now (`fseventsd` at 100 % and
  6 GB, red at both builds alike); the commit body must not claim them.
- 274.2's second key: unbuilt, his word (Q1).
- 283's optional arm G fields: not done.
- In the editor lens's ablation re-run the clone's vitest found no tests (its `node_modules` is a symlink), so that
  column was not read; the lens's own run had every ablation red in vitest.

**History**: `~/.zsh_history` `742100 1793638187` and `~/.bash_history` `23166 1790702242` at the start, around every
shell, app run and probe, and at the end: never moved. Disclosed: the clone made at 23:01 (`cp -Rc`, `ln`, `ls`, `du`)
and the heredocs that wrote a few scratch scripts ran in the tool's own shell outside the block; the stats did not move.
**Left behind**: no Electron of this round (the bare `Tortie`, pid 90306, is his `/Applications/Tortie.app`; the other
crashpads are Granola, Chrome, Cursor and Slack), no `p352`, `p352f`, `p277` or `redlinemoveon` socket under
`/private/tmp/tmux-501/`, no attached image, every lock slot released.
