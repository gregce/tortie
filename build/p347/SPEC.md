# Phase 347 — ⌘C only copies, a path broken over rows opens, and a file in an ignored folder updates while you watch (issues 41, 40 and 33) (SPEC)

The spec for `docs/BACKLOG.md`'s `## Phase 347` entry (`:42118-42155`), reconciled with the tree at `af2662e6`
(origin/main). Every `file:line` below was re-read at that commit in `/private/tmp/wt-p347`. Where this file and the
entry disagree, this file is the build's authority and §13 says why. Nothing committed, staged or stashed.

- **Subject.** `fix(terminal): Cmd+C only copies, and an ignored file updates while you watch`
- **First body line.** `Phase 347: three of John's bugs`
- **Semver.** Patch, released as 0.111.2 on his word. Main is at 0.111.1. The release commit is not this phase's.
- **Tiers.** Issue 41 Tier 2, issue 40 Tier 2, issue 33 Tier 3, each verified at its own tier (CLAUDE.md, "the four rules that stop the waste", rule 4).
- **Contract change: yes, two lines** (one invoke channel, one env name, §8). **Native menus: none move** (§8.3).
- **Binding sources.** The entry; his triage and rulings of 12 October ("Nothing" for issue 41, all three in one phase);
  issues 41, 40 and 33 read with `gh issue view` (read only); research 107 (refusals 5, 6, 8), research 111 §4,
  research 115 §4 (the wrapped join over tmux); Phase 151 (`src/main/watcher/ignored-roots.ts`); Phase 276's
  `node:fs` watch (`src/main/env/watch.ts:1-90`); Phase 334 (`build/p334/SPEC.md`, the return doors and their floor).
- **His standing rules that bind:** no scenario worse than today (a part that regresses is removed, not argued);
  for issue 33, never lose a byte a person typed; just enough words on any surface.

## 0. What changes for a person

| Today (`af2662e6`) | After this phase |
| --- | --- |
| ⌘C in a session with nothing selected sends the interrupt; at Claude Code's, Codex's or pi's prompt that clears what you typed (issue 41, half an hour of notes) | ⌘C with nothing selected does nothing: no byte reaches the session and the clipboard is untouched. With a selection it copies, as today. ⌃C is still the interrupt |
| Settings then Keyboard and the ⌘/ overlay say "Copy or interrupt … With nothing selected it sends the interrupt" | They say "Copy" and that ⌘C does nothing with nothing selected and ⌃C interrupts |
| A path the terminal shows broken over two or three rows is not clickable on any row (issue 40); in the agent's own break shape a fragment can open a DIFFERENT file that happens to exist at the fragment's spelling | Pointing at any row of it underlines the whole path across its rows and a click opens the whole path, with its line; a fragment is never opened in place of a whole path that exists |
| A file in an ignored folder, open in a tab, does not change on screen while an agent writes it; it updates only when you switch back to its tab, return to its project or click into the editor (Phase 334, 0.111.0) | It updates while you watch, within about half a second, in Source and in Redline. A tab with unsaved typing is never replaced, exactly as for a tracked file today |

## 1. The reading (cited, do not re-derive)

### 1.1 Issue 41 — every path a ⌘C in a terminal can take

| Path | Code | What it does at the parent |
| --- | --- | --- |
| Keydown in the focused xterm (local AND remote sessions, split panes, session focus mode: one handler per pane) | `TerminalPane.tsx:354` attaches `terminalKeyHandler` (`src/renderer/terminal/keys/index.ts:87`); `case 'c'` at `:158-167` | selection (`hasSelection`, `capture/index.ts:143-148`, history selection included) → `copySelection`; none → `term.input(ETX)` (`:166`, `ETX = '\u0003'` at `:59`). `preventDefault()` + `return false` both ways |
| The Edit menu's `role: 'copy'` (`src/main/menu.ts:811`) | Never reached from a focused terminal: the renderer's keydown runs first and its `preventDefault()` suppresses the accelerator (`keys/index.ts:4-15`, `menu.ts:10-23`, measured). Clicked with the mouse, it runs Chromium's copy, which xterm answers only with a selection | no byte, ever |
| The terminal's right-click menu, Copy | `terminal-menu.ts:148-153`: `disabled: !selected`; its hint is `keyDisplay('terminal.copyOrInterrupt')`, i.e. the glyph `⌘C` only | copies, disabled without a selection; no byte |
| A session on another machine | The same renderer handler; the byte travels `term.input` → onData → the attach, where main's `routeKey` only routes bytes it is handed. A census of `src/` finds ETX written nowhere else (`grep` for `\u0003`/`\x03`: only `keys/index.ts:59,166`; `src/shared/ipc/pocket.ts:1423`'s `'C-c'` is the phone's key name, out of scope) | the same ETX |
| ⌃C | `isPlainMeta` is false, the handler returns `true` and xterm sends its own `\x03` | unchanged by this phase |

**Where the binding's words are drawn.** One row, `src/shared/keymap.ts:442-451` (`id: 'terminal.copyOrInterrupt'`,
`action: 'Copy or interrupt'`, `explain` naming the interrupt). Drawn by Settings then Keyboard
(`src/renderer/settings/KeyboardSection.tsx:259` `.kb-action`, `:264` `.kb-explain`) and the ⌘/ overlay
(`src/renderer/app/ShortcutsOverlay.tsx:249`, action only). The id is referenced once more, `terminal-menu.ts:151`
(glyph only). Keymap ids are not in `docs/audits/contract-baseline.txt` and the row is `assignable: false`, so no
setting stores it. Prose that states the old rule: `keys/index.ts:18-22` (header), `menu.ts:21-23` (header),
`docs/DESIGN-SPEC.md:410`. **Not this repository** (named for the operator, not edited):
`/Users/gdc/tortiedotsh/src/data/docs.ts:590` (the note "Command C has two terminal meanings") and `:1362` (the
shortcut table row "Copy selected text, or interrupt when nothing is selected").

### 1.2 Issue 40 — how a path link is found today

- One provider, `PathLinkProvider` (`src/renderer/terminal/path-links.ts:169-339`), registered after
  `WebLinksAddon` (`TerminalPane.tsx:387-388`). `provideLinks` (`:181-229`) reads ONE row and the row above, both
  as drawn (`translateToString(true)`), with `Terminal.cols` as the width, and calls `pathSpansInRow`
  (`src/shared/path-spans.ts:456-477`). Refusal 5 (a remote pane offers nothing) is its first statement (`:186`).
  Each span's door is asked through `drop:prepare { classify: true }` (`:290-301`), cached per spelling (`:264-289`),
  asked again at the click (`:312-339`).
- Refusal 8 (`edgeRefusal`, `path-spans.ts:430-448`) refuses a span whose last cell is the pane's last column, and a
  span at the head of a row whose predecessor FILLED its last column and ended on a path character. A predecessor
  that stops short of the last column refuses nothing.
- The header (`path-spans.ts:19-82`) records why nothing rejoins rows: research 111 §4.2 (a blind glue that resolves
  is not evidence) and research 115 §4 (the pane is a tmux client's visible screen; `isWrapped` flags are present and
  WRONG after a resize reflow and a copy-mode repaint, arms 4 and 5).
- `conformance:pathdoors` (`build/conformance-pathdoors.mjs`) pins the grammar and the doors; rule 13 (`:1418-1510`)
  reads `provideLinks`' text for `width: this.term.cols`, `cellColumns(lineAbove)`, `aboveEnd:` and no `?? 0`.

### 1.3 Issue 33 — what the bus sees, and the door a change can ask

- The worktree watcher (`src/main/watcher/repo-watcher.ts:230-266`) subscribes the repository with an exclusion plan
  built ONCE at start from `git ls-files --others --ignored --exclude-standard --directory` (`ignored-roots.ts:265-296`):
  `.git` plus ignored DIRECTORIES, eight kernel paths then anchored userspace regexes (`planWorktreeIgnore`,
  `:243-258`). Ignored single FILES are deliberately not excluded (`parseIgnoredRoots`, `:137-158`), and a directory
  that becomes ignored after the start is not excluded until the watcher restarts (`:96-104`). The plan is a local of
  `watch()` (`repo-watcher.ts:243`) and is not kept.
- `onChange` → `emitRepoChanged` (`bus.ts:55-66`) → `broadcastGitChanged` (`git/ipc.ts:93-102`) → `git:changed` to
  every window → the renderer's one bus (`src/renderer/state/repo-changed.ts`, 150 ms resetting) wakes the git store,
  the tree, SCM runs, SCM depth and the editor (`store.ts:887-890`, `io.refreshRepo`). Main's window is 300 ms and does
  NOT reset (`repo-watcher.ts:105`, `:404-425`).
- The editor's walk, `refreshRepo` (`src/renderer/editor/tab-io.ts:1827-1977`), reads only tabs `walkedByRefresh`
  admits (`store.ts:482-…`, `:628-629`) and reloads a tab only when it is clean before and after the read, the model is
  the same and `savedContents` did not move (`conformance:save` rules 22 and 26). Its serializer runs one walk per repo
  and queues one.
- Phase 334's doors: `rereadOnReturn(id)` (`store.ts:1513-1519`) asks the walk's predicate, skips a raster image, then
  `returnFloor.admit` (`REREAD_FLOOR_MS = 1_000`, leading edge, a refused call is DROPPED, `reread-on-return.ts`),
  then `rereadRepo` (`store.ts:1503-1505`, `void io.refreshRepo(repoPath)`, unfloored).
- Tortie's own saves of a file in a project go through `fs:writeGuarded` (`src/renderer/editor/save-write.ts:98`,
  auto save through the same function, `auto-save.ts:20`), which REPLACES the file by `renameSync(staged, abs)`
  (`src/main/fs/guarded-write.ts:548`): every save is a rename-over.
- `src/renderer/tree/ignored.ts:372-413` holds the window's only ignore answers (`git:checkIgnore`), for rows the tree
  has loaded and nothing else.
- Siblings this phase copies the shape of: `src/main/env/watch.ts` (Phase 276: `node:fs` watch, `persistent: false`,
  injected seams so the gate opens no real watcher, an `OFF_ENV` knob read per start at `:160`, `:566`);
  `src/main/search/ipc.ts:35-55` (a per-sender sink: `WeakSet` of hooked senders, `once('destroyed')`,
  `isDestroyed()` before every send).

## 2. Measured for this spec (no Electron, no agent, no shell of his; every scratch removed in a `finally`)

All harnesses are under `<scratchpad>/p347/spec/measure/` (scratch, not committed; each description is enough to
rebuild it). Node 22.23.1 (the `.nvmrc` line; Electron 43.3.0 carries its own), Apple silicon, macOS 15, load
average 6 to 7. The vitest ones run with `vitest.measure.config.ts` rooted at this worktree. His history files read
`736814 1791821213` and `23166 1790702242` before and after every run.

### 2.1 Issue 41, the parent's handler (`m41-keys.measure.test.ts`, the SHIPPING `terminalKeyHandler`, capture mocked)

| Key | Bytes written | Handed to xterm | `preventDefault` | Copied |
| --- | --- | --- | --- | --- |
| ⌘C, nothing selected | `"\u0003"` | no | yes | — |
| ⌘C, a selection | none | no | yes | 1 |
| ⌃C | none from the handler | **yes** (xterm sends its own) | no | — |

### 2.2 Issue 40, the shape and the parent (`m40-join.measure.test.ts`, the SHIPPING `pathSpansInRow` and a prototype of D7)

- **The issue's own rows are 45, 42 and 30 columns.** A soft wrap of the same 118-character path at any width W is
  W, W, …, remainder (45/45/27 at 45, 47/47/23 at 47, 49/49/19 at 49). No width gives 45/42/30, so **issue 40 is
  the agent's own break, made before the last column, after a `-` and after a `/`**. The real Codex 0.160.0 capture
  `build/fixtures/reply/codex-approval-long-0.160.0.txt` rows 35-36 shows the same breaker (after `p318-`, with a
  5-column continuation indent) landing exactly on column 120 of 120. Both shapes occur and both are covered.
- **The parent over the issue's rows**, a scratch truth in which only the whole path exists: at widths 46 to 52 the
  grammar asks the door about all three fragments (`/Users/…/arcturus-`, `labs/rook/…/software-factory/`, and
  `.planning/brainstorming.md:134`, which names `<base>/.planning/brainstorming.md`); none exists, so no link. At
  width 45 refusal 8 refuses rows 1 and 2 and still asks about row 3. **So the parent opens nothing, unless a
  fragment's own spelling happens to exist, and then it opens that other file.** Over a soft wrap at 30, 47, 60 and
  80 columns the parent offers nothing on any row (refusal 8).
- **The prototype join (D7)** finds the whole path, line 134, from every row at widths 45 to 49; at 50 the first
  boundary fails J3 (45 + 5 is not more than 50) and the join of rows 2-3 names a path that does not exist (fails
  closed); at 52 there is no join. Over the soft wraps it joins every row to the file at all four widths.
- **Over every committed real capture** (`build/fixtures/reply`, 37 files, 1,372 rows of Claude Code 2.1.287 and
  Codex 0.160.0 at 120 columns): 4 boundaries meet J1 to J3, all four inside one long command broken by the agent
  (`p318-long-argument-…`), and **0 of them is path shaped**, so the join offers nothing new there.

### 2.3 Issue 33, what the bus sees (`m33-bus.measure.test.ts`, the SHIPPING `RepoWatcher` over real FSEvents)

A scratch repository with `.gitignore` holding `notes/` and `*.log`, `later/` added to it AFTER the watcher started;
1,000 ms settle per step; beside it one `fs.watch` per file.

| Write | Bus (`onChange`) | One `fs.watch` on the file |
| --- | --- | --- |
| `notes/a.md` in place (an ignored directory) | **0** | 1 |
| `debug.log` (an ignored FILE in a tracked directory) | 1 | 1 |
| `src/x.md` (tracked) | 1 | 1 |
| `later/b.md` (a directory ignored after the watcher started) | 1 | 1 |
| 800 files written beside `notes/a.md` | 0 | **0** |
| `notes/a.md` replaced by rename | **0** | 1 |

The plan held `.git` and `notes` and no overflow. **The set the bus is blind to is exactly the running watcher's
exclusion plan**, which is narrower than "ignored" (rows 2 and 4) and can be wider (a directory un-ignored after the
start stays excluded).

### 2.4 Issue 33, one `fs.watch` on one file (`watch-measure.mjs`, `fifo-measure.mjs`, node only; the one `/bin/sh` with a scratch HOME, ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`)

| Shape | Events on the watch | After it, an in-place write at the same path |
| --- | --- | --- |
| in place (`writeFileSync`), append, `/bin/sh` `printf >`, `utimes` | 1 `change`, 0.3 to 23 ms | seen |
| rename over (temp then `rename`, which is every Tortie save, §1.3) | 1 `rename` | **MISSED** (the watch is on the old inode) |
| unlink; unlink then recreate; rename away | 1 `rename` | missed or gone |
| a sibling file written | 0 | seen |

- **The arm race:** a write in the same synchronous turn as `fs.watch` is seen 0 times of 20; a write one loop turn
  later 20 of 20 (libuv registers the kevent on the next poll).
- 200 writes 5 ms apart: 200 events (the kernel does not coalesce). Write-to-event latency over 30 writes: median
  0.77 ms, p90 1.52, max 3.70.
- Cost: **exactly 1 descriptor per watch** at 64, 256 and 1,000 watches; arming 0.009 to 0.028 ms each; about
  1.4 KB of RSS each at 1,000; every descriptor back on close. `launchctl limit maxfiles` reads **256** soft for a
  GUI app (kernel `maxfilesperproc` 184,320). The reverify measured that Electron 43.3.0's main process (which
  carries Node 24.18.1) raises a soft limit of 256 to 1,048,575 by itself, so 256 does not bind the shipping
  runtime; W11 reads it in Tortie itself (amended at the build, §As built).
- **`fs.watch(path)` on a FIFO never returns**: a child node arming it was still blocked when its 3 s timeout
  killed it. In Electron's main that would freeze the app. A descriptor opened `O_RDONLY | O_NONBLOCK` opens a FIFO
  in 0 ms and `fstat` says FIFO; a watch armed through `/dev/fd/<n>` on a descriptor `fstat` called a regular file,
  then `close(n)`, sees `change` and `rename` exactly as a path watch does and holds one descriptor of its own.

### 2.5 Issue 33, what Phase 334's floor would do to change notices (`m33-floor.measure.test.ts`, the SHIPPING `createRereadFloor`)

Writes coalesced into main's 300 ms non-resetting window, each window's end one notice, each notice put through the
1,000 ms leading-edge floor:

| Writes | Notices | Admitted | Last write shown without a look |
| --- | --- | --- | --- |
| one | 1 | 1 | yes |
| two, 400 ms apart (issue 33's step 4) | 2 | 1 | **no** |
| two, 900 ms apart | 2 | 1 | **no** |
| two, 1,500 ms apart | 2 | 2 | yes |
| ten, 100 ms apart | 4 | 1 | **no** |
| one every 250 ms, written at 0, 250, …, 2,750 ms | 6 | 3 | **no** |

The last row depends on where the schedule ends: the same writes run on to 3,000 ms make 7 notices, 4 admitted, and
the last one shown (the attack verifier, over the SHIPPING floor). D17 does not rest on that row: issue 33's step 4
and the other drop rows re-derive identically, and so does three writes 350 ms apart (dropped).

### 2.6 Cited, not re-measured

The walk costs about 11 ms per open tab and it is the `git show` spawn (`build/p334/SPEC.md` §2); ten clean tabs per
project is the reachable ceiling (`MAX_TABS = 10`, `store.ts:213`).

### 2.7 Issue 33, the re-arm attacked (fix round; `fixer/gate.mjs`, `drive.mjs`, `fds.mjs`, node only)

Both verifier lenses broke the first draft of D14 (§As built, the fix round). `gate.mjs` is a faithful miniature of
D13 to D15 as they now read (the gate, the check, the bounded retries, the 300 ms window whose flush re-arms);
`drive.mjs` attacks it over real files under a scratch root, `fds.mjs` counts `/dev/fd`. Node 22.23.1, no shell, the
FIFOs made by `/usr/bin/mkfifo` and the second writer a `node -e` child, both ended before the `finally` removed the
root. `check` is how the gate waits before its identity check: `none` (the first draft), `single` (one `setImmediate`)
or `double` (two, D14 as amended).

| Arm | Shape | none | single | double |
| --- | --- | --- | --- | --- |
| F1 | a rename-over in the same synchronous turn as the FIRST arm | dead (no event, later in-place write missed) | recovered | recovered |
| F2 | a re-arm inside a `rename` callback, and a rename-over in the first check phase after it | — | **dead** | recovered |
| F3 | a separate process renames over the file twice, 0, 1 and 3 ms apart, 150 pairs each; read 40 ms after each pair | (verifier: 2 of 150 dead at 1 ms) | 0 of 150 at 1 ms | 0 of 450 off the file, a later write seen |
| F6 | 100 rename-overs 5 ms apart | — | — | 101 arms, 3 notices, one after the last rename, on the file after, a later write seen |

With the gate, every arm (`double`): **F4** a link to a file outside the repository renamed over the armed file: the
re-arm refused at G2, 0 events from two writes to the outside file, 0 descriptors on it; a declared link to outside
not armed, a declared link to a file inside `notes/` armed and its target's write seen. **F5** a folder of the path
swapped for a link to an outside copy between G1 and G3: refused at G4. **F7** delete then recreate after 10 and
100 ms: armed again by the window's flush; after 400 ms and 3 s: dormant (L7). **F8** a FIFO renamed over the file:
refused at G3 with no hang; a link to a FIFO declared: refused. **Descriptors** (`fds.mjs`): 12 at rest, 76 with 64
armed, still 76 after a FIFO, an outside link and 20 re-arms, 12 after `dispose`. Before the bounded retry at G5 was
added, F3 at 0 ms left 32 of 150 entries dormant at 40 ms (all re-armed by the next flush); with it, 0.

## 3. Decisions, each with its source

### Issue 41

- **D1. ⌘C with nothing selected does nothing.** The no-selection branch keeps `event.preventDefault()` and
  `return false` and writes no byte (§2.1's first row becomes "none"). Source: his ruling "Nothing"; the issue.
  `preventDefault` stays so the Edit menu's `role: 'copy'` never acts on the chord and xterm never sees it
  (`keys/index.ts:4-15`); with nothing selected there is nothing for either to do, and "nothing" must not depend on that.
- **D2. Ctrl+C, the selection branch, the history selection, ⌘A, ⌘K and every other key are unchanged.**
  Source: the entry's "What is NOT".
- **D3. The row says what the key does now.** `id: 'terminal.copy'` (renamed: the old id names a behaviour that no
  longer exists; two references, `keymap.ts` and `terminal-menu.ts:151`), `action: 'Copy'`, `explain:
  'Copies the selected text. With nothing selected it does nothing, so a draft at an agent’s prompt is never cleared; ⌃C is the interrupt.'`
  Source: the entry's mechanism 1; CLAUDE.md "just enough words". Drawn by Settings then Keyboard and the ⌘/ overlay
  with no code change there.
- **D4. The prose that states the old rule is corrected in this repository**: `keys/index.ts:18-22`,
  `menu.ts:21-23` (comments), `docs/DESIGN-SPEC.md:410` (design authority). The site's two lines (§1.1) are named in
  the report for the operator.

### Issue 40

- **D5. Both shapes, one rule, and `isWrapped` is not read.** The proof of a join is the drawn text, the pane's
  width and the door. Source: §2.2 (issue 40 is the agent's own break before the last column; Codex also breaks on
  it); research 115 §4 arms 4-5 (the flag is present and wrong after the two repaints a row routinely passes through,
  while the DRAWN rows are tmux's own correct repaint).
- **D6. Where it lives.** A pure function in `src/shared/path-spans.ts`, beside refusal 8, over drawn rows; the
  provider gathers the rows and asks the door. Source: the module split of Phase 247 (grammar pure, provider does IO).
- **D7. The join rule.** Rows `top..bottom` (the hovered row among them) are ONE path when every boundary `k|k+1`
  holds all of:
  - **J1** row k's drawn text ends in its last token, and that token ends on a path character (`PATH_CHARACTER`,
    `path-spans.ts:129`);
  - **J2** row k+1's content after the gutter (`GUTTER`, `:126`) and any spaces begins with a path character; a row
    strictly inside the join holds exactly one token after its gutter;
  - **J3 (the break was forced)** row k's drawn end column plus the width in columns of row k+1's first UNIT (its
    first token up to and including the first `/` or `-`, or the whole token) is greater than `Terminal.cols`, so no
    breaker of that width could have put the unit on row k;
  - **J5 (folder then bare name)** when row k's piece ends in `/` and row k+1's first token (its line suffix
    stripped) holds no `/`, row k's drawn end must BE the last column — so a word wrap of "…in `docs/`" above
    "`README.md` is…" is never glued, while a soft wrap that happens to split there still is;
  - **J6 (the screen's edges)** no join whose top row is buffer row 0 with its piece at the row's head, and none
    whose bottom row is the buffer's last row with its piece reaching that row's drawn end: the rest of that path is
    in tmux's history or not yet printed;
  - **J7 (short of the edge, only after `/` or `-`; the second fix round)** when row k's drawn end is short of the
    last column, row k's piece must end in `/` or `-`: those are the only places a breaker breaks inside a path
    (UAX #14; issue 40 breaks after `arcturus-` and `software-factory/`, Codex after `p318-`), so a word wrap that left
    `…/README.md` two cells short of the edge above `.bak beside it` is never glued into `README.md.bak`, which the
    app lens found opening in place of the `README.md` the parent opened;
  - **caps**: at most 8 rows and 1,024 characters in the joined token (`MAX_JOIN_ROWS`, `MAX_JOIN_CHARS`; 1,024 is
    macOS's `PATH_MAX`).
  
  The joined text runs from the top row's last token through each middle row to the bottom row's first token, and
  goes through the SAME grammar: `tokensInRow`, `looksLikePath`, `stripDecoration` (so `:134` is the line).
  **J4**: the join is offered only when the door accepts the joined target. Source: §2.2 (issue rows joined at 45 to
  49, nothing new in 1,372 real rows); research 111 §4.2 (22 of its 39 false glues were a folder span followed by a
  name inside it, which J5 refuses short of the last column; its other 17 had a span that was not there, the shape a
  true program break also has). J7's source: the app lens's verdict (§As built, the second fix round), measured with
  the shipping `joinedPathAt`: it keeps 15 of 15 joins on issue 40's rows at 45 to 49 columns, 78 of 78 from
  `probe:p347`'s agent-break and soft-wrap composers at 60 to 240, and 4 of 4 over `build/fixtures/reply`, and refuses
  14 of 14 hostile word-wrap joins. It only ever removes a join, so every shape it refuses reads as at the parent.
- **D8. One link, first cell to last; fragments yield only to a join that opened.** The provider returns ONE
  `ILink` whose range starts at the top piece's first cell and ends at the bottom piece's last, so hovering any row
  underlines every part and a click opens the joined target at its line. Per-row spans whose cells lie inside an
  accepted join's range are not returned. **When the join's door refuses, the per-row spans are exactly today's**
  (refusal 8 as spelled at the parent). Source: the entry's mechanism 2; his no-regression rule. Refusing a fragment
  merely because the shape suggests a join was weighed and REFUSED: a greedy word wrap meets J1 to J3 at almost every
  prose boundary, so it would take the link off the last word of many wrapped rows that open the right file today.
- **D9. Unchanged:** refusal 5 first; the click asks the door again; the cache is keyed by the joined target exactly
  as `keyFor` keys any target; a hover writes nothing and reads no bytes.
- **D10. The header changes with the code.** The paragraphs of `path-spans.ts:39-44` and `:66-82` that say "nothing
  here ever rejoins two rows" are rewritten to say what this phase joins, by which proof, and why it does not
  contradict research 115 §4 (it never reads the flag), in the same commit. `conformance:pathdoors` gains rule 17 (§6.2).

### Issue 33

- **D11. Main decides which files, from the running watcher's own plan.** `RepoWatcher` keeps the plan it built and
  answers `excludes(canonicalPath)`: true when the path equals or sits under one of `plan.paths` (`.git` included),
  or its POSIX path relative to `watchRoot` matches one of `plan.overflow`; false outside `watchRoot`. Source: §2.3
  (the blind set is the plan, not "ignored"); `tree/ignored.ts` knows loaded rows only. The file is canonicalised by
  `canonicalPathSync` (`src/main/fs/folder-identity.ts`, Phase 274's one canonicalising realpath), never by a bare
  `realpathSync`, never case-folded, never normalised. **And so are the plan's kernel paths, once, when the watcher
  keeps them** (amended at the build, from the reverify's minor; §As built): git on macOS reports an ignored folder's
  name composed while the disk may store it decomposed, and the kernel still excludes that folder, so each
  `plan.paths` entry is passed through `canonicalPathSync`, which asks the filesystem for the stored name, keeping
  its own spelling if that throws. The overflow matchers are kept as the subscription has them (they match text in
  userspace, so they mirror the bus as written).
- **D12. The window declares; main narrows.** The window sends the set its walk reads: every tab
  `walkedByRefresh` admits with a non-empty `repoPath` and an absolute `path`, minus a draft never saved
  (`tab.draft != null && tab.savedContents === ''`, the walk's own skip, `tab-io.ts:1842`), deduplicated, in `tabs`
  order. It re-sends when the KEY moves: the set plus each tab's `deleted`, so a tab the walk marks deleted, or finds
  again, re-declares. Typing (a patch that moves neither) sends nothing. Remote tabs are never declared
  (`walkedByRefresh` refuses `remote`). Source: the entry ("files open from another machine keep today's behaviour");
  one predicate, so the declared set cannot drift from the walked set (Phase 334 D2's rule).
- **D13. The primitive: `node:fs`'s watch on ONE FILE, armed through a descriptor of its CANONICAL path.**
  `openSync(canonical, O_RDONLY | O_NONBLOCK | O_NOFOLLOW)`, `fstatSync(fd, { bigint: true }).isFile()` or refuse,
  `watch('/dev/fd/' + fd, { persistent: false }, …)`, then `closeSync(fd)` in a `finally`; the handle keeps the `dev`
  and `ino` `fstat` read. It is reached only through D14's gate, which hands it the canonical path. Never the
  directory, never `@parcel/watcher`, never an exclusion path, never recursive. Source: §2.4 (one descriptor each; 800
  files of churn beside the file cost 0 events; a plain `fs.watch(path)` on a FIFO hangs the thread and a
  stat-then-watch leaves that race open); §2.7 F8 (a FIFO renamed over the file, and a link to one, both refused with
  no hang); `O_NOFOLLOW` because a canonical path holds no link, so a link at its leaf was put there after the gate
  read it; Phase 276's `env/watch.ts:31-55` (same primitive, same reasons the watcher domain's budget is not touched).
- **D14. One gate for every arm, and a check once the kernel holds the watch.** `armChecked(entry)` is the ONLY
  caller of `armFile`, and every arm goes through it: the declaration's; the re-arm after a `rename` or `error` event,
  which first closes the old watch (every Tortie save is a rename-over, §1.3, so without a re-arm the first auto save
  would end the watch, issue 33's own step 3); the flush's re-arm of a dormant entry; and the check's. In order, with
  nothing awaited:
  - **G1** `c1 = canonical(path)` (`canonicalPathSync`; a throw: dormant);
  - **G2** `plan.excludes(c1)`, asked of the entry's repository's running watcher, held since the declaration (false:
    dormant);
  - **G3** `armFile(c1, …)` per D13 (null: dormant — gone, not a regular file, a link at the leaf, unreadable);
  - **G4** `c2 = canonical(path)` and `plan.excludes(c2)` again (either fails: the handle closed, dormant), so a folder
    of the path swapped for a link while G1 to G3 ran is refused before any watch is kept;
  - **G5** `identity(c2)` (`lstatSync(c2, { bigint: true })`, a regular file) equals the handle's `dev` and `ino`,
    Phase 274's identity and never a name. If not, the file was replaced while it was being opened: the handle closed
    and G1 to G5 tried again, at most `ARM_RECHECKS = 3` more times, then DORMANT with the window opened (D15) so its
    flush tries once more;
  - **G6** armed: the window opened (D15), and `afterKernelSees(check)`.

  **The check.** `afterKernelSees(fn)` is `setImmediate(() => setImmediate(fn))`. libuv hands a new file watch to the
  kernel at the start of the loop's NEXT poll, so a replace landing between the open and that poll leaves the watch on
  an unlinked inode that never reports again and never goes dormant (issue 33's symptom, for the life of the tab). One
  check phase is not enough when the arm ran inside a watch callback, which is where every re-arm after a `rename`
  runs, because that phase comes before the next poll; the second always comes after one. The check, if the entry
  still holds that handle, asks G1, G2 and G5 again: all equal ends it and resets the count; anything moved closes the
  handle and runs the gate again, at most `ARM_RECHECKS` consecutive times, after which the entry is dormant with the
  window opened. Once the check has passed, a replace is reported by the watch itself as `rename`.

  A DORMANT entry holds no descriptor and is re-armed, through the gate, by the next flush of its repository or the
  next declaration; nothing waits for a file that is gone to come back (L7). Source: §2.4 (after a rename-over the
  old watch misses every later write); §2.7 F1 and F2 (a replace in the gap left the watch dead with no check, and with
  ONE check phase in F2; two recovered both), F3 (a separate writer's pairs of rename-overs: 0 of 450 left off the
  file, against 2 of 150 dead at 1 ms with no check), F4 and F5 (a link swapped in after the first arm, and a folder
  swapped under the open: both refused, 0 events from the outside file); both verifier lenses' attacks on the first
  draft, which re-armed on `rename` with `armFile(path)` alone and no check.
- **D15. Coalescing.** Per repository, a window of `DEFAULT_DEBOUNCE_MS` (300, imported from `repo-watcher.ts:105`,
  never a second copy) that does NOT reset: the first event opens it, its end sends one notice. **Every arm, first or
  re-arm, opens the window too**, so a write that landed before the kevent was registered (§2.4's arm race) or between
  the window's own read at open and the arm is read by the walk that notice causes. A REFUSED arm opens it only when
  G5 or the check ran out of tries, because then the file is still being replaced; a path that is gone, outside the
  plan or not a regular file opens nothing, or a missing file would send a notice every 300 ms. Source: §2.4 (200 events for 200
  writes; 0 of 20 same-turn writes seen); `repo-watcher.ts:400-425` (the bus's own rule, measured there to keep
  churn from starving).
- **D16. Delivery: a notice of its own, to the window that declared.** `git:openFileChanged` with the declared
  `repoPath` string, sent only to the senders that declared an entry in that repository, never to a destroyed one.
  **Not `git:changed`**: that wakes `git status`, the tree, SCM history and runs for a write git does not track.
  Source: §1.3 (`repo-changed.ts`'s four other subscribers spend on every event).
- **D17. The door is `rereadRepo`, unfloored, and not `rereadOnReturn`.** On a notice the store asks: any tab of that
  `repoPath` that `walkedByRefresh` admits? Then `get().rereadRepo(repoPath)`, the road every door takes
  (`store.ts:1503-1505` → `io.refreshRepo`, its serializer, rules 22 and 26, the model-identity check). The 1,000 ms
  return floor is NOT in this path. Source: §2.5 (that floor drops the last write in 4 of 6 schedules, and a dropped
  last write is issue 33 again); Phase 334 D6 (the bus is not floored because it is the event that says the disk
  changed, and this notice is that event for a file the bus cannot see). The rate is bounded by D15's window and the
  serializer, exactly as the bus bounds a tracked file.
- **D18. The cap: 64 armed watches across the app** (`OPEN_FILE_WATCH_CAP`). A declared entry past the cap holds no
  descriptor and its tab keeps Phase 334's behaviour (it updates when looked at); one `info` line per declaration that
  reaches the cap, counts only. At most 512 entries are read from one declaration (`OPEN_FILE_DECLARE_MAX`). Source:
  §2.4 (one descriptor each; a GUI app's launchd soft limit is 256, which Electron 43.3.0 raises, so the cap is a
  budget rather than a ceiling forced on it); `MAX_TABS = 10` per
  project, so 64 is six projects of tabs all in ignored folders.
- **D19. Every way a watch ends.** A tab closed, evicted, its preview slot reused, renamed, or its project closed: the
  declaration shrinks and main closes what left it. The window destroyed or its renderer gone (`destroyed`,
  `render-process-gone`): everything that sender declared. A repository unwatched (`unwatchGitRepo`,
  `git/ipc.ts:151-161`): that repository's entries. Quit: `disposeGitIpc` (`git/ipc.ts:163-172`, already awaited in the
  ordered disposer, `capabilities.ts:834`) disposes every watch and clears every timer. A watch callback arriving after
  its entry closed does nothing. Two declarations from one sender run one after the other; the later one's set wins.
  Source: the entry ("ends when it closes, its project closes or the app quits"); `search/ipc.ts:35-55`.
- **D20. The knob, `GMUX_NO_OPEN_FILE_WATCH=1`**, read at each declaration: arm nothing, close what is armed, answer
  0. Source: Phase 276's `OFF_ENV` (`env/watch.ts:153-160`): it makes the parent's behaviour reachable at HEAD, which
  `probe:p334` needs (its A-arms measure the return doors, and its A0 control reads the blind bus, which this phase
  ends) and which the ablation flips.
- **D21. What main never does.** It reads no byte of a watched file, writes nothing, starts no process, logs no file
  path (counts and the repository only), and arms nothing outside a local watcher's exclusion plan AT ANY ARM (D14's G2
  and G4, at the declaration and at every re-arm), so a symlink in an ignored folder whose canonical target is outside
  the repository is not watched, and a watched file replaced by such a link is not watched from then on. G3 can open a
  file outside for the moment before G4 refuses it, when a folder is swapped mid-gate (§2.7 F5); it is closed
  unwatched and no byte of it is read. Source: research 107 refusal 3's spirit; D11; §2.7 F4 and F5.

## 4. The build, file by file

### 4.1 Builder `copy` — issue 41

- `src/renderer/terminal/keys/index.ts`: in `case 'c'`, the `else` arm writes nothing; it keeps a two-line comment:
  `// PHASE 347 (issue 41, his ruling "Nothing"). No selection → no byte. An agent reads ⌃C's byte as "clear what I typed"; ⌃C is still the interrupt, handed to xterm above.`
  `ETX` and its comment go (no other reader). Header `:18-22` rewritten to say ⌘C copies a selection and otherwise
  does nothing, and why `preventDefault` stays.
- `src/shared/keymap.ts:442-451`: D3's id, action and explain; nothing else in the row moves.
- `src/renderer/terminal/terminal-menu.ts:151`: `keyDisplay('terminal.copy')`.
- `src/main/menu.ts:21-23`: the header's sentence becomes "⌘C in a terminal is decided by src/renderer/terminal/keys/,
  which sees the key before the Edit menu's `role:'copy'` and suppresses it". No code line moves.
- `docs/DESIGN-SPEC.md:410`: "⌘C copies a selection and does nothing without one (Phase 347, issue 41); ⌃C is the
  interrupt. It is decided in the renderer, …" (the rest of the bullet kept).
- NEW `src/renderer/terminal/keys/__tests__/p347-copy-only.test.ts` (§5.1).

### 4.2 Builder `paths` — issue 40

- `src/shared/path-spans.ts`, appended exports (nothing existing renamed or reordered):

  ```ts
  export const MAX_JOIN_ROWS = 8;
  export const MAX_JOIN_CHARS = 1_024;
  /** One drawn row: its text as `translateToString(true)` answers and its own column map (`cellColumns`). */
  export interface DrawnRow { text: string; columns: number[] }
  /** A path the rows top..bottom draw as one token, with its first and last cell. */
  export interface JoinedSpan {
    target: string; line?: number; text: string;
    top: number; bottom: number;           // buffer row indices, 0-based
    startColumn: number;                    // 0-based column of the first cell, on `top`
    endColumn: number;                      // 0-based column ONE PAST the last cell, on `bottom`
  }
  /**
   * `rows(i)` answers buffer row i as drawn, or null past either end. `last` is the last buffer row index.
   * Null unless rows top..bottom meet J1, J2, J3, J5 and J6 at every boundary and the joined token passes the
   * grammar (`looksLikePath`, `stripDecoration`). It never asks a door: J4 is the provider's.
   */
  export function joinedPathAt(rows: (i: number) => DrawnRow | null, y: number, last: number, width: number): JoinedSpan | null;
  export function joinBoundary(above: DrawnRow, below: DrawnRow, width: number): boolean; // J1, J2 (head), J3, J5, J7
  ```
  Columns come from each row's own map, never a string index (the reason `cellColumns` exists, `:479-508`). Header
  per D10.
- `src/renderer/terminal/path-links.ts`, inside `provideLinks` and `linksFor` only: after today's per-row spans are
  found, call `joinedPathAt` with a reader over `buffer.getLine(i)` (`translateToString(true)` and
  `cellColumns(line)`), `buffer.length - 1` and `this.term.cols`. Ask the door about the joined target beside the
  row's spans (one `Promise.all`, the same `doorFor` and cache). When it accepts: one `ILink` with
  `range: { start: { x: startColumn + 1, y: top + 1 }, end: { x: endColumn, y: bottom + 1 } }`, `text`, and
  `activate` opening the joined target at its line through the existing `open`; row spans inside that range are
  dropped. When it refuses, the row's spans are returned exactly as today. Rule 13's four readings of `provideLinks`
  must still hold (keep `width: this.term.cols`, `cellColumns(lineAbove)`, `aboveEnd:` and no `?? 0`). Header gains
  one paragraph pointing at D7 and D8.
- `build/conformance-pathdoors.mjs`: rule 17 (§6.2).
- NEW `src/shared/__tests__/p347-path-join.test.ts` and `src/renderer/terminal/__tests__/p347-path-links-join.test.ts` (§5.2).

### 4.3 Builder `main-watch` — issue 33, main and the contract

- `src/main/watcher/repo-watcher.ts`: `private plan: WorktreeIgnorePlan | null = null;` set in `watch()` from the
  `plan` it already builds (`:243`), and

  ```ts
  /**
   * PHASE 347. True when the worktree subscription never delivers an event for this
   * canonical path: it is one of the plan's kernel paths (`.git` included) or under
   * one, or its POSIX path relative to the root matches an overflow matcher. False
   * outside the root. The plan is fixed for the life of the subscription.
   */
  excludes(canonicalPath: string): boolean;
  ```
  `dispose()` sets `plan` back to `null` as its first step after the `disposed` test, so an entry still holding a
  stopped watcher answers false at G2 and G4 and arms nothing (D14).
- NEW `src/main/watcher/open-files.ts`, header stating D11 to D21 and §2.3 to §2.5 in a few lines each, `node:fs`
  only:

  ```ts
  export const OPEN_FILE_WATCH_CAP = 64;
  export const OPEN_FILE_DECLARE_MAX = 512;
  /** D14: how many more times G1 to G5, or the check, may re-arm one entry in a row before it goes dormant. */
  export const ARM_RECHECKS = 3;
  export const OPEN_FILE_WATCH_OFF_ENV = 'GMUX_NO_OPEN_FILE_WATCH';
  export interface OpenFileEntry { repoPath: string; path: string }
  /** D11: one repository's running watcher. Synchronous over the plan it holds; false once it is stopped. */
  export interface OpenFilePlan { excludes(canonicalPath: string): boolean }
  export interface FileIdentity { readonly dev: bigint; readonly ino: bigint }
  export interface ArmedFile extends FileIdentity { close(): void }
  export interface OpenFileWatchDeps {
    /** D11: the repository's running watcher after `ensureWatcher`, held by every entry of it; null when there is none. */
    planFor(repoPath: string): Promise<OpenFilePlan | null>;
    /** D14 G1 and G4: `canonicalPathSync`; a throw answers null. */
    canonical(path: string): string | null;
    /** D13: open the CANONICAL path O_RDONLY|O_NONBLOCK|O_NOFOLLOW, fstat isFile, watch /dev/fd/N, close N; null when refused. */
    armFile(canonicalPath: string, onEvent: (kind: 'change' | 'rename' | 'error') => void): ArmedFile | null;
    /** D14 G5: `lstat` of a canonical path; its dev and ino when it is a regular file, else null. */
    identity(canonicalPath: string): FileIdentity | null;
    /** D14: runs `fn` once the kernel holds every watch armed before the call (two check phases). */
    afterKernelSees(fn: () => void): void;
    setTimeout(fn: () => void, ms: number): { clear(): void };
    send(senderId: number, repoPath: string): void;
    env(): NodeJS.ProcessEnv;
    log(level: 'info' | 'warn', message: string): void;
  }
  export interface OpenFileWatches {
    declare(senderId: number, entries: unknown): Promise<{ watched: number }>;
    dropSender(senderId: number): void;
    dropRepo(repoPath: string): void;
    dispose(): void;
    /** For tests and the probe's reading through logs; never a surface. */
    counts(): { armed: number; dormant: number; capped: number };
  }
  export function createOpenFileWatches(deps: OpenFileWatchDeps): OpenFileWatches;
  /** The production arm, D13 exactly. */
  export function armFileByDescriptor(canonicalPath: string, onEvent: (kind: 'change' | 'rename' | 'error') => void): ArmedFile | null;
  /** The production G5 read. */
  export function fileIdentity(canonicalPath: string): FileIdentity | null;
  /** The production wait, `setImmediate(() => setImmediate(fn))`, with D14's reason in its comment. */
  export function afterKernelSees(fn: () => void): void;
  ```
  Entries are keyed by the declared `path`; one armed watch per path however many senders declared it. An entry holds
  its repository's `OpenFilePlan` from the declaration on. Every arm is D14's gate, `armChecked`, the one function that
  calls `deps.armFile`; a path is armed only when the cap has room and G1 to G5 pass. Window per D15 keyed by the
  declared `repoPath`. `dispose` closes every handle and clears every timer, and a check or a callback that arrives
  after its entry closed does nothing.
- `src/main/watcher/index.ts`: export the module's public names.
- `src/main/git/ipc.ts`:
  - one module-level `createOpenFileWatches({...})` whose `planFor` normalises the repo path exactly as
    `normalizeRepoPath` does (a directory, or null), calls `ensureWatcher`, awaits the watcher and answers it (null when
    it could not start); whose `canonical` is `canonicalPathSync` (`src/main/fs/folder-identity.ts`) with a throw
    answering null; whose `armFile`, `identity` and `afterKernelSees` are the module's three production exports; and
    whose `send` is `webContents.fromId(id)` guarded by `isDestroyed()`;
  - `handle(ipc, 'git:watchOpenFiles', (event, entries) => …)`: on the first call from a sender, hook `once('destroyed')`
    and `render-process-gone` to `dropSender` through a `WeakSet` (the `search/ipc.ts:35-55` shape); input not an array
    → `gmuxError('INVALID_INPUT', …)`; entries not `{ repoPath: string; path: string }` with an absolute path and both
    at most 4,096 characters are skipped;
  - `unwatchGitRepo` calls `dropRepo(key)`; `disposeGitIpc` calls `dispose()` before it awaits the watchers.
- `src/shared/ipc/git.ts` (append only): `GitOpenFileEntry`, `GitOpenFilesInvokeChannelMap` with
  `'git:watchOpenFiles': { req: [entries: GitOpenFileEntry[]]; res: { watched: number } }`,
  `EVT_GIT_OPEN_FILE_CHANGED = 'git:openFileChanged'` with its payload map `[repoPath: string]`, and
  `GmuxGitOpenFilesExtras` (`watchOpenFiles?`, `onOpenFileChanged?`, optional and feature-detected like
  `checkIgnore`). `src/shared/ipc/index.ts` composes them where `GitIgnoreInvokeChannelMap` and `GmuxGitIgnoreExtras`
  are composed (`:95`, `:101`, `:291`, `:413`) and adds the payload map to `AllEventPayloadMap`.
- `src/preload/git.ts`: `watchOpenFiles: (entries) => invoke('git:watchOpenFiles', entries)`,
  `onOpenFileChanged: (cb) => on(EVT_GIT_OPEN_FILE_CHANGED, cb)`.
- `build/conformance-watcher.mjs`: rules W347-1 to W347-8 (§6.1).
- NEW tests: `src/main/watcher/__tests__/p347-open-files.test.ts`, `p347-excludes.test.ts`,
  `p347-open-files.native.test.ts` (§5.3; the last is in the native lane, `*.native.test.ts`).

### 4.4 Builder `editor-watch` — issue 33, the window

- NEW `src/renderer/editor/open-file-watch.ts` (pure apart from what it is handed):

  ```ts
  import type { GitOpenFileEntry } from '@shared/ipc';
  import type { EditorTab } from './tab-types';
  export function watchedFilesOf(tabs: readonly EditorTab[], walked: (t: EditorTab) => boolean): GitOpenFileEntry[];
  /** The set plus each tab's `deleted`, so a tab marked deleted, or found again, re-declares (D12). */
  export function watchKeyOf(tabs: readonly EditorTab[], walked: (t: EditorTab) => boolean): string;
  export function startOpenFileWatch(deps: {
    subscribe(listener: () => void): () => void;
    tabs(): readonly EditorTab[];
    walked(t: EditorTab): boolean;
    declare?: (entries: GitOpenFileEntry[]) => Promise<unknown>;
    onChanged?: (cb: (repoPath: string) => void) => () => void;
    changed(repoPath: string): void;
  }): () => void;
  ```
  Declares once at start and again only when `watchKeyOf` moves; a rejected declare is swallowed (watching is an
  enhancement, as `ensureWatcher` says of itself). No timer.
- `src/renderer/editor/store.ts`, `init` only, directly after the `onRepoChanged(…)` block (`:887-890`), with one
  comment line naming Phase 347 and D17:

  ```ts
  startOpenFileWatch({
    subscribe: (l) => useEditor.subscribe(l),   // `create<EditorState>((set, get) => …)` at :507 takes no api; the store exists by the time `init` runs
    tabs: () => get().tabs,
    walked: walkedByRefresh,
    declare: gmux.git.watchOpenFiles?.bind(gmux.git),
    onChanged: gmux.git.onOpenFileChanged?.bind(gmux.git),
    changed: (repoPath) => {
      if (!get().tabs.some((t) => t.repoPath === repoPath && walkedByRefresh(t))) return;
      get().rereadRepo(repoPath);
    }
  });
  ```
  Do not touch `markDirty`, `patchTab`, `closeMany`, `rereadRepo`'s body, `rereadOnReturn`, `walkedByRefresh` or the
  eviction seam (`ablation:p268`, `conformance:save` and `conformance:redline` anchor on their text).
- NEW `src/renderer/editor/__tests__/p347-open-file-watch.test.ts` (§5.4).
- `build/conformance-save.mjs`: rules 28 and 29, appended after 27c with their rule 0 fixtures and one line each in
  the header's rule list; `build/p268/ablation.mjs`: one arm each (§6.3). Nothing else in either file moves.

### 4.5 Builder `probe`

- NEW `build/p347/probe-p347.mjs` and `build/p347/stand-in.sh`, and grader fixtures under `build/p347/fixtures/` (§7).
- `build/p334/probe-p334.mjs`: its HEAD launch env gains `GMUX_NO_OPEN_FILE_WATCH: '1'` (D20) with one comment line;
  nothing else.
- `build/p247/path-open.mjs`: arm E's HEAD grading becomes "the wrapped absolute path opens THE WHOLE FILE from
  either row, and nothing opens from a cell outside it"; its header paragraph for E says why (Phase 347, D7).

### 4.6 The integrator

`package.json` (`"probe:p347": "npm run build && node build/harness-socket.mjs --fresh gmux-p347 'node build/p347/probe-p347.mjs'"`),
`build/verification-checks.mjs` (`electron('probe:p347')` with a comment in the `probe:p334` shape),
`build/assert-electron-teardown.mjs:487` (`HELPER_USER_FLOOR` 172 → 173, obligation 1),
`docs/audits/contract-baseline.txt` (regenerated, obligation 3, §8.2), `CLAUDE.md` (§8.4), `CHANGELOG.md` (§10).

## 5. The unit tests, and the clause each owns

Every clause read from source is proved on in-memory ablations that must go red (the p334 R11/R12 pattern); nothing
here opens a real watcher except the native file.

### 5.1 `p347-copy-only.test.ts` (copy)

- K1 ⌘C, no selection: nothing written, `preventDefault` called, returns `false`.
- K2 ⌘C, a selection: `copySelection` once, nothing written. K3 a history selection alone counts (the mock's
  `hasSelection` true with `term.hasSelection()` false).
- K4 ⌃C: returns `true`, nothing written, no `preventDefault`.
- K5 the keymap row: `keymapEntry('terminal.copy')` holds D3's action and explain; no row's id or action names
  `copyOrInterrupt` or "interrupt" for `Cmd+C`.
- K6 the census: no file under `src/renderer` outside tests writes `\u0003` or `\x03` (comments blanked). Ablation:
  `term.input('\u0003')` planted back in a copy of `keys/index.ts` reads red.

### 5.2 `p347-path-join.test.ts` and `p347-path-links-join.test.ts` (paths)

- PJ1 issue 40's rows at widths 45 to 49 join to the whole path with `line: 134` from each of the three rows; 50 and
  52 offer no join that names the file.
- PJ2 a soft wrap of the same path at 30, 47, 60 and 80 joins from every row.
- PJ3 a Codex-shaped break (5-space continuation indent, a break after `-` on the last column) joins; a Claude Code
  `⎿` gutter on the continuation row joins.
- PJ4 J1 to J6 and both caps, one fixture each that turns the join off: a row ending in `,`; a continuation row
  starting with a space-led sentence; a middle row with two tokens; a predecessor short enough that the unit fits
  (J3); `…/docs/` short of the last column above `README.md is …` (J5) and the same at the last column (joins); a
  join reaching buffer row 0 at its head and one reaching the last row's drawn end (J6); nine rows; 1,025 characters.
- PJ5 columns: a row carrying `⚠️ ` before the path draws its range in CELLS (the rule 11 shape).
- PL1 the provider, driven with a stub buffer and a stub `classify`: one link spanning top to bottom when the door
  accepts the join; the per-row spans inside it are not returned; outside it they are.
- PL2 the door refuses the join: the links are exactly the parent's per-row links (compared with the same buffer run
  through today's per-row path).
- PL3 the join and a fragment both exist: the link opens the joined target (the stated ambiguity, §12 L8).
- PL4 a remote pane: nothing asked, nothing returned (refusal 5 first). PL5 the click asks the door again and opens
  `underBase ?? path` with the joined line.
- PJ6 (the second fix round) J7: the app lens's row, `…/src/README.md` 46 columns long above `.bak beside it, just in
  case.`, refused from either row at 47 to 52 and joined at 46 (the last column, a terminal wrap); a row short of the
  edge ending on `.`, `_`, a digit, a letter, `~` or `@` refused beside `-` and `/` controls; issue 40's rows at 47
  still joined; L4's `moved …/src/` above `lib/util.ts today` still joined (the trade, stated).
- PL6 (the second fix round) the provider over PJ6's rows with README.md AND README.md.bak both doors: at 47, 48 and 49
  columns both rows read exactly as with the join switched off, README.md.bak is never asked, the path's own row opens
  README.md and `.bak` is no link. Red, with PJ6, when J7 is taken out.

### 5.3 Main (main-watch)

`p347-excludes.test.ts`: E1 a kernel path and a file under it; `.git/COMMIT_EDITMSG`; a prefix sibling (`notes2/x`
against `notes`) false; an overflow regex; outside the root false; a watcher with no plan false; E7 the same watcher
after `dispose()` false for a path it answered true for before.

`p347-open-files.test.ts`, every seam faked and the clock driven:
- O1 only entries `excludes` answers true for are armed. O2 `armFile` returning null leaves the entry dormant with no
  descriptor counted.
- O3 `change` events: one notice per repository per 300 ms window that does not reset; 200 events over 1.2 s make
  4 or 5 notices and one comes after the last event.
- O4 `rename` when the file is back: the old handle closed, a new one armed, a notice. Gone: dormant, a notice; the
  next flush re-arms it if it is back.
- O5 every arm (first or re-arm) opens a window.
- O6 a declaration replaces: an entry that left is closed; an unchanged entry is not re-armed and opens no window.
- O7 the cap: 1,000 declared, 64 armed, 936 capped; closing tabs frees slots and the next declaration arms more;
  two senders share one handle per path.
- O8 `dropSender`, `dropRepo` and `dispose` close every handle and clear every timer; a callback after close does
  nothing.
- O9 the knob: `GMUX_NO_OPEN_FILE_WATCH=1` arms nothing, closes what is armed, answers 0.
- O10 two overlapping declarations from one sender: the later set wins.
- O11 notices go only to senders that declared that repository, with the declared string, never to a destroyed one.
- O12 input: a non-array throws `INVALID_INPUT`; a relative path, a non-string and the 513th entry are skipped.
- O13 THE GATE'S ORDER, every seam recording its calls: `canonical`, `excludes`, `armFile`, `canonical`, `excludes`,
  `identity`, then the window and `afterKernelSees`, for the declaration, the `rename` re-arm, the flush re-arm and the
  check's re-arm alike, and `armFile` reached from nowhere else. G2 false: `armFile` never called. G4 false: the
  handle closed, dormant, no window. G5 mismatched: closed and retried, three more tries then dormant WITH a window;
  matched on the second try: armed with one window. A refusal at G1, G3 or G4 opens no window.
- O14 THE CHECK: run by the faked `afterKernelSees`; equal ends it; a moved identity closes the handle and re-arms; four
  moves in a row leave the entry dormant with a window; a check whose entry closed, or whose handle was replaced by a
  `rename` in between, does nothing.

`p347-open-files.native.test.ts` (native lane): the SHIPPING module over a scratch repository and the SHIPPING
`RepoWatcher`, hermetic git, real `armFileByDescriptor`:
- N1 `notes/a.md` (excluded) is armed; `src/x.md`, `debug.log` and `later/b.md` (§2.3) are not.
- N2 an in-place write, a rename-over (the guarded write's shape), an unlink then a recreate inside the window: each
  ends in a notice, and an in-place write after the rename-over still makes one.
- N3 800 files written beside the armed file: no notice.
- N4 a FIFO declared as a tab path: refused, the declaration resolves in under 1 s, no descriptor held.
- N5 a symlink in `notes/` to a file outside the repository: not armed.
- N5b THE LINK SWAP (both lenses' attack): an armed `notes/c.md` replaced by renaming a symlink to a file outside the
  repository over it: one notice for the swap, then the entry dormant, no descriptor of the process on the outside
  file (`/dev/fd` read with `fstat` identities), and two writes to the outside file 400 ms apart send no notice.
- N5c a folder of the declared path swapped for a link to an outside copy between G1 and G3, through a seam the test
  injects into `canonical`: refused at G4, no descriptor held.
- N7 THE RE-ARM GAP (the attack lens's major): (a) a rename-over in the same synchronous turn as the first arm, and
  (b) a re-arm inside a `rename` callback followed by a rename-over in the first check phase after it: in both, 100 ms
  later the entry's handle is the path's inode and a later in-place write sends a notice. (b) is run a second time with
  `afterKernelSees` swapped for ONE `setImmediate` and must find the watch dead, which is why the production wait is two.
- N8 a separate `node -e` writer, killed in a `finally`, renames over the file twice 0 and 1 ms apart, 100 pairs each:
  40 ms after every pair the handle is the path's inode, and every pair's second bytes are followed by a notice.
- N6 1,000 declared files: the process's descriptor count (`/dev/fd`) rises by exactly 64 and returns to its start
  after `dispose`.

### 5.4 `p347-open-file-watch.test.ts` (editor-watch), the real store over a stub bridge

- R1 `watchedFilesOf`: a history, review, map, diagnostics and compare tab, an empty `repoPath`, a relative path and a
  never-saved draft are left out; an image and an SVG tab are in; a path is listed once.
- R2 one declaration at start; none for a typing patch (`markDirty`); one each for an open, a close, an eviction, a
  rename and a `deleted` flip.
- R3 a notice for a repository with a walked tab walks once (counted as `readFile` calls); for a repository with none,
  nothing; two notices 10 ms apart are both asked (the serializer joins them), never floored.
- R4 THE SAFETY CLAUSE through the notice: a DIRTY tab whose file changed keeps its buffer and `savedContents`; a
  keystroke after the walk's read was opened (p334's `holdNextRead`) keeps the typing; the same tab clean takes the
  new bytes.
- R5 the wiring, read from `store.ts`: `init` calls `startOpenFileWatch(` once; its `changed` names `rereadRepo(` and
  neither `rereadOnReturn(` nor `refreshRepo(`. Ablations: `rereadOnReturn` substituted (red, with §2.5's reason in
  the message), the `walkedByRefresh` test removed (red), the call removed (red).
- R6 THE NEVER-SAVED DRAFT beside a watched file (the attack lens's minor): a repository holding a watched
  `notes/a.md` and a draft never saved; a notice for that repository leaves the draft not `deleted`, editable, its
  buffer and `savedContents === ''` intact, while `notes/a.md` takes its new bytes. The builder runs it once in a
  `cp -Rc` clone with `tab-io.ts`'s skip (`if (tab.draft != null && tab.savedContents === '') continue;`) removed, and
  records it red in §As built; the clone is removed and the worktree's files compared by sha256 afterwards.

## 6. The gate clauses, each with its one-clause ablation

### 6.1 `conformance:watcher`, rules W347-1 to W347-8 (builder `main-watch`), read with the house scanner over the shipping source and proved on plants

| Rule | Holds | Ablation that must read red |
| --- | --- | --- |
| W347-1 | `open-files.ts` imports no `@parcel/watcher` and adds no entry to any `ignore` array; the eight-path budget is untouched | an `import watcher from '@parcel/watcher'` planted |
| W347-2 | the one `watch(` in the module is in `armFileByDescriptor`, on a `/dev/fd/` path, after an `fstatSync(…).isFile()` test and an open with `O_NONBLOCK` and `O_NOFOLLOW`, with the descriptor closed in a `finally` | `watch(path, …)` on the path; `O_NONBLOCK` removed; `O_NOFOLLOW` removed; the `isFile` test removed; the `finally` removed (five plants) |
| W347-3 | the module reads no file's bytes and writes nothing: no call to `readFile`, `read(`, `createReadStream`, `writeFile`, `rename(`, `renameSync(` or `unlink` (the event kind `'rename'` is a string, not a call) | a `readFileSync(path)` planted |
| W347-4 | a `rename` or `error` event closes the watch and calls `armChecked`; the flush calls `armChecked` for its repository's dormant entries; a successful arm opens the window | the re-arm removed; the `rename` arm calling `armFile` directly; the flush's re-arm removed; the window removed from the arm path (four plants) |
| W347-5 | `OPEN_FILE_WATCH_CAP` is declared once and read where arming is decided | the cap test removed |
| W347-6 | the window length is the imported `DEFAULT_DEBOUNCE_MS` and the timer is not reset by a later event | a literal `300`; a `clearTimeout` on the window before re-setting it |
| W347-7 | THE ONE GATE: `deps.armFile(` is called once in the module, inside `armChecked`; before it `canonical(` then `excludes(`, after it `canonical(`, `excludes(` and `identity(` with a `dev` and an `ino` comparison, all before the window opens; G5's retry and the check's re-arm are each bounded by `ARM_RECHECKS` | the G2 `excludes` removed; the G4 re-ask removed; the identity comparison removed; a second `armFile(` call outside the gate; the bound removed (five plants) |
| W347-8 | THE CHECK: `armChecked` hands the check to `afterKernelSees(` after every successful arm, and the production `afterKernelSees` body is two nested `setImmediate(` | the `afterKernelSees(` call removed; the production body reduced to one `setImmediate` (two plants) |

### 6.2 `conformance:pathdoors`, rule 17 (builder `paths`)

Drives `joinedPathAt` over a fixture table (PJ1 to PJ5's shapes) and reads `provideLinks`/`linksFor` for the wiring:
the join's door asked through the same `doorFor`; one range from `startColumn + 1` on `top + 1` to `endColumn` on
`bottom + 1`; row spans dropped only inside an ACCEPTED join's range. One ablation per clause on a copy of the
shipping source, each red: J1, J2 (head and middle-row), J3, J5, J7, J6 top, J6 bottom, the row cap, the character cap,
the door clause (offering a join the door refused), the fragment clause (dropping row spans when the join was
refused), and the range clause (a range ending on `top`). Rule 13 stays green unedited. The rule's header names
research 115 §4 and says the join reads no `isWrapped`.

### 6.3 `conformance:save`, rules 28 and 29 (builder `editor-watch`), the two clauses the walk's safety rests on

Both were unowned at the parent: the attack verifier deferred the first by one task and removed the second in a
clone, and the whole editor suite (1,064 tests) and `conformance:save` stayed green both times. This phase makes the
walk run far more often for files in ignored folders, so each gets an owner. Each rule is proved first on in-memory
fixtures (rule 0's pattern: a shape that must be caught and one that must not), and each gets one arm in
`build/p268/ablation.mjs` over the SHIPPING source, restored by sha256 in its `finally`.

| Rule | Holds | Plant that must read red |
| --- | --- | --- |
| 28 | `src/renderer/editor/MonacoHost.tsx:311-315`: the callback handed to `model.onDidChangeContent(` calls `markDirty(` as a statement of its OWN body, not inside a nested function (`setTimeout`, `queueMicrotask`, `requestAnimationFrame`, a `.then(`) and with no `await` before it, so a keystroke is dirty before any walk can read the tab clean (`refreshRepo` says its safety depends on this, `tab-io.ts:1885-1886`) | `setTimeout(() => markDirty(tab.id, …), 0)` (the verifier's X7) |
| 29 | `tab-io.ts`'s `refreshRepo` (`:1842`): the loop's first statement is the `continue` on `tab.draft != null && tab.savedContents === ''`, before `readDir(`, `readFile(` and any `patch(` | the skip removed (the verifier's X9); the skip moved below the existence check |

`MonacoHost.tsx` and `tab-io.ts` themselves are not edited.

## 7. `probe:p347` — the one app run, at the parent and at HEAD

**Shape.** `build/p347/probe-p347.mjs`, `probe:p334`'s two-build shape. Two Electrons ONE AFTER THE OTHER, never at
once: the parent first (`P347_PARENT_CHECKOUT`, a BUILT checkout of `af2662e6`; absent, the same checkout, or no
`out/main/index.js` → exit 2 with the sentence), then HEAD. Each through `withElectron` inside
`build/harness-socket.mjs` (`--remote-debugging-port=0`, `--use-mock-keychain`, `env: withoutDevRenderer({ HOME:
<scratch home>, ZDOTDIR: <scratch home>, HISTFILE: '/dev/null', GMUX_TMUX_SOCKET: <the harness socket>, GMUX_PROBES:
'1', GMUX_PATH_OPEN_RECORD: <file> })` with `TERM_SESSION_ID` removed), on its own scratch profile. Before each launch
`writeHiddenAgents(profile, 'p347')` and `hiddenAgentsPrecheck`, after it `AGENTS_LIST_EXPR` read back and
`hiddenAgentsScanVerdict` ok, or exit 2 before any arm. It stats `~/.zsh_history` and `~/.bash_history` (`%z %m`)
before and after each launch and exits 2 if either moved. No `-L gmux`, no screenshot, no agent, no token: every
session is a plain `shell` session that runs `build/p347/stand-in.sh`. Every process it starts is ended by pid in a
`finally`; the scratch directory is removed there too. `--grader-self-test` grades the fixtures under
`build/p347/fixtures/` (a clean row per arm, each arm's disagreement named, an unreadable arm exit 2 and never a pass)
and launches nothing. `P347_ARMS` picks arms, `P347_KEEP=1` keeps the scratch for re-derivation, the report goes to
`P347_REPORT` or beside the harness directory, never under `out/`.

**The stand-in** (`stand-in.sh`, POSIX sh): `prompt <log>` puts the tty raw (`stty raw -echo`), draws `> ` and the
bytes typed so far, appends every byte it reads to `<log>` as two hex digits per line, clears its draft on `03`
exactly as the three agents do, and redraws; `print <file>` `cat`s a file of rows the probe composed. The probe
composes issue 40's rows itself at the pane's real width (`tmux display -p '#{pane_width}'` on the harness socket):
an agent-break layout (break after `/` or `-` when the next unit does not fit) and a one-line print (the terminal
wraps it).

| Arm | What | HEAD | Parent |
| --- | --- | --- | --- |
| K1 | the prompt holds `p347 draft notes` (typed by CDP `insertText`); ⌘C (CDP key events, meta) with nothing selected | the log gains no byte; `capture-pane -p` still shows the draft | the log gains `03`; the draft is gone |
| K2 | drag-select a printed row; ⌘C | the clipboard (read in main through `--inspect`, as `probe:p320`'s R5 reads) holds the row; no byte | same |
| K3 | ⌃C | the log gains `03` | same |
| K4 | Settings then Keyboard, the ⌘C row's `.kb-action` and `.kb-explain`; the ⌘/ overlay's `.shortcut-action` | D3's words | "Copy or interrupt" and the old explain |
| P1 | the agent-break layout of a real path (scratch tree, the file exists), ≥ 3 rows; hover each row's first path cell (CDP mouse at the cell's rectangle from `.xterm-screen`'s box and `cols`/`rows`), read `.xterm-cursor-pointer`; click the middle row | pointer on every row; the editor tab opened is the WHOLE file at its line (tab name and the line read through `__gmuxP268.read()`) | no pointer; nothing opens |
| P2 | the same path printed on one line, the terminal wrapping it | same as P1 | same as P1 |
| P3 | P1 with a file planted at the last row's fragment spelling under the project | the whole file opens | **the planted fragment file opens** (the parent's wrong-file hazard, live) |
| P4 | a broken path whose join names no file | nothing opens | nothing opens |
| P5 | `…/sub/` short of the last column above `README.md is …`, both `sub/README.md` and `README.md` existing | `README.md` (the project's) opens, as at the parent | `README.md` opens |
| P6 | (the second fix round) the app lens's word wrap: `mkP6 kkk… hw6/README.md` ending exactly 2 cells short of the last column above `.bak beside it, just in case.`, with `hw6/README.md.bak` planted; hover both rows, press the path, then press `.bak` | a pointer on the path and none on `.bak`; the path's press opens `hw6/README.md`, never `.bak`; the press on `.bak` opens nothing (J7) | the same |
| W0 | control: `docs/tracked.md` in Source, written by `/bin/sh` | updated within 2,500 ms | same |
| W1 | `notes/a.md` (an ignored folder; the files are created BEFORE launch, the watcher reads ignored roots once) in Source, focused, written in place ×5, no gesture | 5 of 5 shown within 1,500 ms | 0 of 5 after 2,500 ms |
| W2 | `notes/b.md` in Redline, ×3 | 3 of 3 (`savedContents` and the drawn text) | 0 of 3 |
| W3 | rename-over writes (`printf > t && mv t a.md`) ×3 | 3 of 3 | 0 of 3 |
| W4 | auto save on (`setPolicy('afterDelay', 500)`): type `P`, it lands (a rename-over by the guarded write); then the shell writes | the shell's bytes shown; no stop, no toast | stop `stale` on the next typing |
| W5 | dirty is never reloaded: auto save off, type `D`, write | buffer old + `D`, dirty, disk the writer's; ⌘S opens the three-answer dialog; Cancel | identical |
| W6 | the attack: 20 shell writes 50 ms apart while the probe types 20 characters 60 ms apart, auto save on | every typed character is in the final buffer or on disk; no character lost | same |
| W7 | delete then recreate at +50 ms; delete then recreate at +3 s | first: the new bytes, no deleted banner left; second: "This file was deleted on disk." until a look, then the new bytes | first: nothing until a look; second: same |
| W8 | close the tab; the shell writes; `lsof -p <the app's main pid>` | the file is not in main's descriptors | not watched at either point |
| W9 | close the project | none of its files in main's descriptors | same |
| W10 | `src/x.md` (tracked) and `debug.log` (`*.log`) open | neither in main's descriptors; both update by the bus | not in descriptors; both update |
| W11 | three projects, every tab in an ignored folder (30 tabs) | main's descriptor count rises by exactly the armed count and the main pid's count at rest plus 64 is printed | no rise |
| W13 | the link swap: `notes/c.md` open; the shell renames a link to `<scratch>/outside/secret.txt` over it, then writes `secret.txt` three times 400 ms apart, no gesture; then a look | main's descriptors never name `secret.txt` (`lsof`); at most the swap itself is shown, none of the three later writes until the look; after the look both builds show the same bytes | nothing until the look; the look shows the same bytes |
| W14 | pairs of replaces back to back (`mv t1 a.md; mv t2 a.md` in one `/bin/sh` line) ×30, 1,500 ms apart | the second file's bytes of every pair shown within 1,500 ms | 0 of 30 |
| W12 | quit with watches armed | the app exits through the helper inside the parent's quit time plus 2 s; `app.log` holds no watcher error | baseline |
| RUN | history stats unmoved; Electrons counted once at the end with the `ps -Ao pid,ppid,rss,comm` line from CLAUDE.md | 0 left | 0 left |

Every door-free reading waits at least 1,200 ms after the previous gesture in the same repository, so Phase 334's
doors are never what a W-arm measures; the probe moves focus away from the editor before each W write (focus in the
terminal) and back only after the reading. **Exit** 0 when every row grades at both builds, 1 with each disagreeing
row named, 2 when a precondition or an arm cannot be read. Measured: 561 s for both builds, `probe:p347` alone under
the lock, by the app verifier on 2026-10-12 (51 rows, exit 0), before the second fix round added P6, which adds a few
seconds a build.

## 8. Gates, obligations, contract, menus, CLAUDE.md

### 8.1 Gates (CLAUDE.md's path table)

| Touching | Gate |
| --- | --- |
| everything | `npm run typecheck && npm run build && npm test` (inside `build`: `gate:electron`, `gate:background`, `gate:simulator`, `gate:knownhosts`, `gate:checks`, `conformance:ios`, `conformance:harnessprobes`, `gate:contract`) |
| `src/main/watcher/**` | `conformance:watcher` (W347 rules added); `conformance:samefolder` (its derived set scans `src/main/watcher` for bare `realpathSync(`) |
| `src/renderer/editor/store.ts` | `conformance:save`, `conformance:redline` (rule 40 reads `store.ts` for `rereadRepo`), `ablation:p268` (its anchors in `store.ts`) |
| `build/conformance-save.mjs`, `build/p268/ablation.mjs` (rules 28 and 29, §6.3) | `conformance:save`, `ablation:p268` |
| `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts` | `conformance:pathdoors` (rule 17 added) |
| `src/main/menu.ts` (a comment) | `conformance:handback` (its trigger list names `menu.ts`) |
| the contract (`src/shared/ipc/**`, an env name) | `gate:contract` after the baseline is regenerated; `conformance:facts` once (it reads every baseline channel as `IPC serves`) |
| new tests and the new probe | `gate:checks`, `gate:electron` (floor 173) |

Builders run `npm run typecheck` and their own test files; `main-watch` also runs `npm run test:native -- p347`,
`conformance:watcher` and `conformance:samefolder`; `paths` runs `conformance:pathdoors`; `editor-watch` runs the whole
`npm test`, `conformance:save`, `conformance:redline` and `ablation:p268`. Builders and the integrator launch no
Electron (`smoke`, `smoke:t1`, `smoke:t3` and `package` are the verifiers', under the lock).

### 8.2 Obligations and the contract

- **Obligation 1:** `HELPER_USER_FLOOR` 172 → 173 (`build/assert-electron-teardown.mjs:487`).
- **Obligation 3:** `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`. Expected movement,
  and nothing else: `[ipc.invoke.channels]` 248 → 249 (`git:watchOpenFiles`), `[env.names]` 117 → 118
  (`GMUX_NO_OPEN_FILE_WATCH`). The event `git:openFileChanged` is not in the inventory. The commit body names both lines.
- No storage key, no schema, no smoke mode moves.

### 8.3 Menus

**No native menu moves.** Edit then Copy is the system's `role: 'copy'`, unchanged. The terminal's right-click Copy
keeps its label and its `⌘C` hint (only the id it reads moves). Issue 40 and 33 add no surface. What moves is the
keymap row's words, drawn in Settings then Keyboard and the ⌘/ overlay. The phase brief says so.

### 8.4 CLAUDE.md (integrator)

- A `probe:p347` row in "Probes and app runs": trigger `src/renderer/terminal/keys/index.ts`, `joinedPathAt` and the
  join in `path-links.ts`, `src/main/watcher/open-files.ts`, `excludes` in `repo-watcher.ts`, the watch wiring in
  `git/ipc.ts`, `open-file-watch.ts` and its line in `store.ts`, or `build/p347/**`; the run as §7 says.
- The `conformance:pathdoors` row gains one sentence for rule 17 (the join, its proof, no `isWrapped`). The
  `conformance:watcher` row gains one for W347 (the per-file watch never touches the eight-path budget, arms through a
  descriptor through one gate that asks the exclusion plan at every arm and checks the inode once the kernel holds the
  watch, reads no byte). The triggers of both rows already cover the touched paths; `src/main/watcher/` stays the
  watcher row's trigger.
- The `conformance:save` row gains one sentence for rules 28 and 29 (a keystroke in Monaco marks the tab dirty in the
  change listener itself, and the walk skips a never-saved draft before it reads anything), and its trigger list gains
  `MonacoHost.tsx`'s change listener and `refreshRepo`'s draft skip.

## 9. Verification, per item at its own tier

**Issue 41, Tier 2.** The gates; `probe:p347` K1 to K4 at both builds; one independent method: **the attack** — the
verifier writes its own key harness that drives the shipping handler with every modifier combination on `c` and `C`
(⌘, ⌘⇧, ⌘⌥, ⌘⌃, ⌃, ⌃⇧, a dead-key compose) and a selection that ends between two keydowns, and greps the built
renderer bundle (`out/renderer/**`) for `\u0003`; the only byte that may reach a session from `c` is ⌃C's, through
xterm.

**Issue 40, Tier 2.** The gates; `probe:p347` P1 to P6 at both builds (P6 the second fix round's J7, the app lens's
word wrap, which must read as the parent at HEAD); one independent method: **run over real data** —
re-run `build/p253/wrap-reflow-probe.mjs`'s five arms (its scratch tmux server, a real attach client under node-pty,
replayed into the shipping xterm) and drive `joinedPathAt` over the replayed buffer: arms 1, 2, 4 and 5 must join to
the path and arm 3 must find no rows, which is the direct answer to research 115 §4. Optional and cheap: a hostile
fixture of the verifier's own (a `tree` listing at the right edge, a numbered list of paths, a diff stat, a path
followed by an em dash).

**Issue 33, Tier 3.** The gates; `probe:p347` W0 to W12 at both builds (real files, a real ignored folder, a real
outside writer: the per-row matrix); and TWO independent methods, one an attack:
1. **The attack** (the verifier's own harness over the SHIPPING main module and real files, not the builders' tests):
   two replaces racing into the re-arm gap, from a second process and from inside the first check phase (§2.7 F1 to F3:
   the handle ends on the path's inode); a link to an outside file swapped in after the first arm, and a folder of the
   path swapped mid-gate (no watch kept on anything outside, no notice from an outside write);
   a rename storm (100 rename-overs 5 ms apart: the last bytes always produce a notice after the last rename); a
   delete and recreate at 10, 100, 400 and 3,000 ms; a FIFO swapped in for the file between two declarations (no hang,
   bounded by 1 s); a symlink retargeted outside the repository; 1,000 declared entries with the descriptor count read;
   a sender destroyed mid-window; `dispose` with timers pending; and the window side over held reads — a keystroke in
   the same tick as a notice's walk, an `adoptWritten` landing inside it, the model rebuilt mid-read. Nothing typed is
   lost and nothing leaks.
2. **The parent** `af2662e6`: W1 to W4 read 0 at the parent and N of N at HEAD; W5, W6, W8 to W10 read identically at
   both (no scenario worse); and `probe:p334` at HEAD with its new knob reads as it did at `b07c12f1`.
3. Optional: re-derive §2.4's per-watch descriptor cost and §2.5's table with the verifier's own timer.

**Lock.** Verifiers only: `zsh /private/tmp/tortie-ops/lock.sh try p347`, released on the same command line as the
work. Count Electrons once, at the end.

## 10. CHANGELOG items (`## Unreleased`, `### Fixed`; the follow-up docs commit adds each link)

- ⌘C in a session now only copies: with nothing selected it does nothing, where it used to send the interrupt that Claude Code, Codex and pi read as clearing what you had typed at their prompt; ⌃C still interrupts. Reported by [John Berryman](https://github.com/JnBrymn) in [#41](https://github.com/gregce/tortie/issues/41)
- A file path a narrow session shows broken over two or more rows now underlines across all of them and opens the whole path, whether the terminal wrapped it or the agent broke it; a path whose first part has scrolled above the top of the session still does not open. Reported by [John Berryman](https://github.com/JnBrymn) in [#40](https://github.com/gregce/tortie/issues/40)
- A file open in the editor now shows an agent's changes while you watch it, even in a folder your repository ignores, where it used to update only when you looked away and back; what you are typing is never replaced. Reported by [John Berryman](https://github.com/JnBrymn) in [#33](https://github.com/gregce/tortie/issues/33)

## 11. What is NOT in this phase (the entry's, kept, with this spec's additions)

- **No change to ⌃C, to the interrupt itself, or to any other binding. No setting to bring the old ⌘C back.** No
  keymap row added for ⌃C.
- **No link for a path the doors would refuse whole**, no change to which kinds of file open, no new door, no new
  path channel (refusal 6: the join asks `drop:prepare` like every span).
- **No reading of `isWrapped`, no tmux capture per hover, no `capture-pane -J` round trip** (research 115 §4's cost).
- **No watching of ignored DIRECTORIES**, no `@parcel/watcher` subscription, no change to the watcher's exclusion set
  or its eight-path budget, nothing for files open from another machine, nothing for a file opened from outside the
  project root.
- **No change to `refreshRepo`, its serializer, its rules 22 and 26, `rereadOnReturn`, `REREAD_FLOOR_MS`, the save
  doors or their sentences**, and no change to how the walk applies bytes (Phase 334's L7, the caret after a reload,
  stays queued).
- **No timer or poll in the window**; main's only timers are the per-repository windows.
- **Not issues 39, 26, 32, 34, 23 or 14. No release** (the 0.111.2 release commit is the main session's).

## 12. Stated limits (true at HEAD; each no worse than the parent except L4, a trade stated for the operator)

- **L1 (41).** A person who pressed ⌘C to stop an agent now presses ⌃C; ⌘C does nothing there.
- **L2 (40).** Blank cells between an agent's break and the right edge, and a continuation row's indent, are inside
  the link's range: they are underlined with it and a click on them opens it.
- **L3 (40).** Not joined, and therefore as at the parent: a path broken right after a folder's `/` before a bare file
  name short of the last column (J5); a path whose first part is above the top of the screen or which runs past its
  bottom row (J6, the scrollback lives in tmux); an agent that wraps narrower than the pane (J3 fails closed); more
  than 8 rows or 1,024 characters.
- **L4 (40), a trade rather than "no worse".** Where both the whole path and a fragment's own spelling are real files,
  the link opens the whole path. That is the fix for issue 40's wrong-file hazard (P3) and the trade has a second
  face: a folder token ending 1 to 3 cells short of the right edge (`moved src/`) above a row that starts with a
  relative path (`lib/util.ts today`), where both `src/lib/util.ts` and `lib/util.ts` exist, opens `src/lib/util.ts`
  from the lower token's cells, where the parent opened `lib/util.ts`. Read as an agent's break after `/`, issue 40's
  own row 2 to row 3 boundary, HEAD is right and the parent was wrong; read as a prose word wrap, HEAD opens a file the
  text did not name. No rule over the drawn rows can tell the two apart: J5 and J7 cannot refuse it without refusing
  issue 40 itself. The attack lens measured it at 231 cells of 387 layouts, all in this shape (§As built, the second fix
  round). For the operator's ruling.
- **L5 (33).** Each notice walks every open tab of that repository (about 11 ms a tab, §2.6), so an agent writing one
  ignored file continuously costs a walk every 300 ms while it writes, exactly what a tracked file costs today.
- **L6 (33).** Typing in the few hundred milliseconds between an agent's write and the walk keeps the typing; the
  next save then refuses as it does today for a tracked file.
- **L7 (33).** A file deleted and created again later than its repository's next window shows "This file was deleted
  on disk." until a look (Phase 334's doors) re-reads it.
- **L8 (33).** Past 64 watched files, a tab updates only when looked at, as in 0.111.0, until a slot frees: a closed
  tab, a window that goes or a project that closes arms capped tabs at once, whichever window declared them (the
  second fix round; before it, only that window's next declaration did). A watched file holds one descriptor, so a disk
  holding an open, watched file reads as in use until the tab closes.
- **L9 (33).** Files open from another machine, and a file outside the project root opened with the project's
  repository, are not watched (the bus never saw them either).
- **L10 (33).** A FOLDER of a watched path swapped for a link AFTER the check has passed sends no event (the watch is on
  the file, not its folders), so the watch stays on the original file; a notice it sends makes the walk read the path
  through the new link, which is what a look does today. A watched file replaced by a link to outside goes dormant
  after one notice (D14), and the tab is then as in 0.111.0. A declared path that is ITSELF a link inside the
  ignored folder, retargeted by a rename-over after the check, keeps the watch on its old target, so a write to the
  new target sends no notice and the tab updates on a look, as in 0.111.0 (amended at the build, the reverify's nit).
- **L11 (40, added at the build).** A path broken right before a `[` (`pages/` above `[slug].tsx`) is not joined,
  because J2 reads the path characters refusal 8 reads and `[` is not one of them; the rows read as at the parent.
- **L12 (40, added at the build, rewritten at the second fix round).** Short of the last column a row joins only after
  `/` or `-` (J7), so a word wrap below a path that stops short is never glued to it. A path whose last character
  lands ON the last column, above a row whose first word could not have fitted either, still takes that word into the
  joined token, because that is exactly what a terminal wrap draws: where the door refuses the joined target every row
  reads as at the parent, and where it accepts it (a file of that joined name exists) the join opens it, where the
  parent offered nothing on either row (refusal 8 leaves a path that reaches the last column unlinked).
- **L13 (40, added at the build).** A terminal wrap that lands just before the `:` of a line suffix stops the join at
  the row above, because `:` is not a path character: the link opens the file without its line and the last row gets
  no link. The parent offered nothing there.
- **L14 (40, added at the second fix round).** The door's hover answer is cached for 30 s, as every underline's is
  (`CACHE_MS`). A join hovered while its file existed, whose file is then deleted, still draws its underline for up to
  30 s and still keeps the fragment rows' own links off; the first press asks the door afresh, opens nothing and caches
  the refusal in place of the old answer, so the next hover reads every row as at the parent. With J7 the fragments it can hide are a piece
  ending in `/` or `-` above, or the lower piece of an L4 shape.

## 13. What the entry got wrong, and what this spec changed

1. **"…the window then asks the same door Phase 334's return asks … and the same floor."** The same door, yes
   (`rereadRepo` and `refreshRepo`'s refusals); the same floor, no: §2.5 measured it dropping the last write in 4 of
   6 schedules, issue 33's step 4 among them. The notice is coalesced by main's 300 ms window, as the bus is (D17).
2. **"a path the agent itself broke at the pane's last column"**: issue 40's own rows (45/42/30) are broken BEFORE the
   last column; J3 covers at-or-before by asking whether the next unit could have fit (D7, §2.2).
3. **"both a soft wrap (isWrapped) …"**: the flag is not read; research 115 arms 4-5 measured it wrong after the
   everyday repaints. The drawn rows, the width and the door are the proof (D5).
4. **"files … that sit inside an ignored directory"**: precisely, inside the running watcher's exclusion plan. An
   ignored file in a tracked directory and a directory ignored after the start already reach the bus (§2.3) and are
   not watched; a directory un-ignored after the start is still excluded and is watched (D11).
5. **"the terminal menu's hint"**: it draws the glyph `⌘C` only, which stays true; only the keymap row's words move,
   drawn by Settings then Keyboard and the ⌘/ overlay (§1.1).
6. Not in the entry: every Tortie save is a rename-over (`guarded-write.ts:548`), so the watch must re-arm or the
   first save ends it (D14); and `fs.watch` on a FIFO hangs the calling thread (§2.4), hence the descriptor arm (D13).
7. Not in the entry: `probe:p334`'s A0 control and `probe:p247`'s arm E would read wrong at HEAD; both are updated
   here (§4.5), `probe:p334` through the knob (D20).
8. Not in the entry: the parent can open a WRONG file from a fragment of an agent-broken path whenever the fragment's
   spelling exists (§2.2, arm P3).

9. Not in the first draft of this spec, found by both verifier lenses (§As built, the fix round): D14's re-arm
   skipped D11 (`open` follows a link, so a file replaced by a link to outside was watched outside the repository,
   worse than today), and it trusted the kernel to hold the watch from the open (a second replace before the next poll
   killed it silently). Both are now D14's gate and check, measured in §2.7.

## 14. Who owns what (disjoint)

| Builder | Owns | Does not touch |
| --- | --- | --- |
| `copy` | `src/renderer/terminal/keys/index.ts`, `src/shared/keymap.ts`, `src/renderer/terminal/terminal-menu.ts`, `src/main/menu.ts` (header comment only), `docs/DESIGN-SPEC.md` (`:410` only), `src/renderer/terminal/keys/__tests__/p347-copy-only.test.ts` | everything else |
| `paths` | `src/shared/path-spans.ts`, `src/renderer/terminal/path-links.ts`, `build/conformance-pathdoors.mjs`, `src/shared/__tests__/p347-path-join.test.ts`, `src/renderer/terminal/__tests__/p347-path-links-join.test.ts` | `TerminalPane.tsx`, `path-doors.ts`, main |
| `main-watch` | `src/main/watcher/open-files.ts` (new), `src/main/watcher/repo-watcher.ts`, `src/main/watcher/index.ts`, `src/main/git/ipc.ts`, `src/shared/ipc/git.ts`, `src/shared/ipc/index.ts`, `src/preload/git.ts`, `build/conformance-watcher.mjs`, `src/main/watcher/__tests__/p347-open-files.test.ts`, `p347-excludes.test.ts`, `p347-open-files.native.test.ts` | `ignored-roots.ts`, `bus.ts`, the renderer |
| `editor-watch` | `src/renderer/editor/open-file-watch.ts` (new), `src/renderer/editor/store.ts` (`init` only), `src/renderer/editor/__tests__/p347-open-file-watch.test.ts`, `build/conformance-save.mjs` (rules 28 and 29 only), `build/p268/ablation.mjs` (their two arms only) | `tab-io.ts`, `reread-on-return.ts`, every other store member; imports `GitOpenFileEntry` and the two bridge members by the names in §4.3 |
| `probe` | `build/p347/probe-p347.mjs`, `build/p347/stand-in.sh`, `build/p347/fixtures/**` (all new), `build/p334/probe-p334.mjs` (the env line), `build/p247/path-open.mjs` (arm E) | `package.json`, every `src/` file |
| integrator | `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `docs/audits/contract-baseline.txt`, `CLAUDE.md`, `CHANGELOG.md` | the builders' files except to reconcile |

`docs/BACKLOG.md` (the running log and the entry's reconciliation) is the committer's.

## §As built, the fix round (the fixer, 2026-10-12, at `af2662e6` plus this untracked file; nothing committed)

**What was fixed.** No Phase 347 code exists: `git diff af2662e6` is empty and `build/p347/` holds this file alone,
because the person asked only what the fix to issue 33 would be. Both verifier lenses therefore attacked THIS SPEC,
and both answered `needs_work` on D14. The fix round's object is the spec. Every major and minor is answered below;
the one row a lens graded worse than today is removed.

| Finding | Lens, severity | What changed here |
| --- | --- | --- |
| The re-arm gap: a second replace between the open and the kernel's registration leaves the watch on a dead inode, with no event and no dormant state | attack, major | D14's CHECK after every arm, two check phases later (`afterKernelSees`), and G5's identity test with `ARM_RECHECKS` bounded retries; D15: a refusal opens the window only when the file is still moving; tests O13, O14, N7, N8; gate rules W347-7, W347-8; probe arm W14; §9's attack. Measured in §2.7 F1 to F3 and F6 |
| The re-arm follows a link: a watched file replaced by a link to a file outside the repository gets the OUTSIDE file watched | app, major (graded worse than today); attack, minor | REMOVED by routing every arm through one gate that asks the exclusion plan before the open (G2) and again after it (G4), opening the canonical path with `O_NOFOLLOW`; D13 and D21 rewritten; tests N5b, N5c; W347-2's fifth plant; probe arm W13; L10. Measured in §2.7 F4 and F5 |
| Nothing owns MonacoHost's synchronous dirty mark, which the walk's "never replace typing" rests on | attack, minor | `conformance:save` rule 28 with its fixtures and an `ablation:p268` arm (§6.3); `MonacoHost.tsx` not edited |
| Nothing owns the walk's skip of a never-saved draft | attack, minor | R6 (red on the skip removed, run once in a clone and recorded here by the builder) and `conformance:save` rule 29 with an `ablation:p268` arm (§6.3); `tab-io.ts` not edited |
| §2.5's last row depends on its endpoint | attack, nit | The row names 0 to 2,750 ms and a note says what 3,000 ms reads; D17 unchanged |
| The lens's app runs could not run | app, minor | Not a spec defect. Owed to the build: `probe:p347` W0 to W14 at the built parent and at HEAD under the lock, and §9's attack with the gap and link shapes |
| The explanations' wording (the watch is armed "through the handle it just checked"; a gone file is NOT waited for; eight is the kernel's cap and the rest are filtered in userspace) | both, nits | In the fix round's report, not here; D13, D14 and §1.3 already say it this way |

Also corrected while re-reading: W347-3's word list names calls, not the event kind `'rename'` the module must spell;
D12's citation of the draft skip is `tab-io.ts:1842`, not `:1841`.

**Found by the fix round, beyond what either lens proposed.** The attack lens's remedy, one `setImmediate` after the
arm, closes the gap only for an arm made outside a poll callback. Every re-arm after a `rename` IS made inside one,
and that check phase runs before the poll that registers the new watch: §2.7 F2 kills the watch with one check phase
and recovers with two. And without G5's bounded retry, a separate writer's back-to-back replaces left 32 of 150 entries
dormant 40 ms after the pair (each re-armed by the next flush, so nothing was lost, only up to 600 ms of latency);
with it, 0 of 450.

**No regression rows, re-graded on the amended spec (node-level, §2.7; the app rows are owed to `probe:p347`).**

| Scenario | Today | This spec | Worse |
| --- | --- | --- | --- |
| A watched file replaced by a link to a file outside the repository | nothing outside is watched; a look reads through the link | nothing outside is watched (0 events, 0 descriptors on it, F4); one notice for the swap, whose walk reads through the link exactly as a look does | no |
| Two replaces land before the kernel holds the watch | no update until a look | the check re-arms onto the path's file (F1, F2, F3: 0 of 450 left off it) | no |
| A folder of the path swapped for a link while the gate runs | nothing is watched | refused at G4; the outside file is opened for that moment and closed unwatched, no byte read (F5) | no |
| A FIFO renamed over the file, or a link to one declared | nothing is watched | refused, no hang (F8) | no |
| Descriptors | 0 | 1 per armed watch, none left by a refusal or a re-arm, back to rest on `dispose` (12, 76, 76, 12) | no |

**Commands (each with his history read before and after: `736814 1791821213` and `23166 1790702242` every time).**
Every child ran with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.

| Command | Exit | Reading |
| --- | --- | --- |
| `node fixer/drive.mjs <scratch>` (first draft of the miniature, no G5 retry) | 0 | 51.1 s; F1 to F9 as §2.7, F3 at 0 ms 32 of 150 dormant at 40 ms, 0 after the next flush; scratch removed |
| `node fixer/drive.mjs <scratch>` (the miniature as D14 now reads) | 0 | 37.6 s; §2.7's table; scratch removed |
| `node fixer/fds.mjs <scratch>` | 0 | 12, 76, 76, 12 |
| `git status --short`; `git diff af2662e6 --stat` | 0; 0 | `?? build/p347/` only; 0 tracked files changed |
| `gh issue view 33 --repo gregce/tortie` (read only) | 0 | step 3 is the person writing with auto save on, a rename-over (D14's reason) |
| `npm run -s conformance:watcher` | 0 | PASS, under 1 s |
| `npm run -s conformance:save` | 0 | OK, every rule passed, 1 s |
| `npx --no-install vitest run` p334-reread-on-return, p334-reread-floor, p282-watcher-race | 0 | 3 files, 65 tests passed, 1 s |
| `df -h /` | 0 | 32 GiB free |

No Electron, no lock slot, no parent build, no app run: there is no HEAD to compare with the parent. The miniature and
its drivers live in `<scratchpad>/p347/fixer/` (`gate.mjs`, `drive.mjs`, `fds.mjs`, their `.out.json`, and
`SPEC.before.md`, this file before the fix round, sha256 `2a6c2b3d…86ef`); they are scratch, not the build, and the
native tests N5b to N8 are what the build must pass in their place.

## §As built, the build (the integrator, 2026-10-12, at `af2662e6` plus the uncommitted delta; nothing committed, staged or stashed)

Five builders on disjoint files, then this integration. Every file below is in `git diff af2662e6` or new under it;
nothing else moved. No Electron was launched by any builder or by the integrator (§8.1): `probe:p347` at the built
parent and at HEAD, and §9's independent methods, are the verifiers', under the lock.

**What was built, by owner.**

| Owner | Files | As built |
| --- | --- | --- |
| `copy` (41) | `src/renderer/terminal/keys/index.ts`, `src/shared/keymap.ts`, `src/renderer/terminal/terminal-menu.ts`, `src/main/menu.ts` (header, still three lines), `docs/DESIGN-SPEC.md:410`, NEW `keys/__tests__/p347-copy-only.test.ts` | D1 to D4 as written: the no-selection arm writes nothing and keeps `preventDefault()` and `return false`; `ETX` removed; the row is `terminal.copy`, `Copy`, D3's explain byte for byte. K1 to K6, 48 tests; 20 of them red against the parent's handler swapped in; the census reads 632 production files under `src/renderer` for six spellings of the byte and the raw byte, with 7 plants red and 2 controls green |
| `paths` (40) | `src/shared/path-spans.ts` (appended; header :39-44 and :66-82 rewritten, and the `GUTTER` comment, which also said "never to join two rows"), `src/renderer/terminal/path-links.ts`, `build/conformance-pathdoors.mjs` (rule 17), NEW `p347-path-join.test.ts`, `p347-path-links-join.test.ts` | D5 to D10 as written; `joinedPathAt` never reads `isWrapped`. Unknown columns or width answer "no join" (J3 and J5 compare so that NaN refuses). A hovered row that ENDS one broken path and BEGINS another answers, from that row, the join ending on its first token, and the other from the row below (the spec was silent; the builder's choice). A row span is dropped when it shares a cell with an ACCEPTED join (`sharesCellWithJoin`), which for a piece of the join's own token is lying inside it. Rule 17: 40 join readings and 6 provider readings, 7 of 7 wiring plants caught, 20 of 20 ablations red; the gate's header now says about 11 s, measured. L11 to L13 added to §12 |
| `main-watch` (33, main) | NEW `src/main/watcher/open-files.ts`; `repo-watcher.ts`, `watcher/index.ts`, `src/main/git/ipc.ts`, `src/shared/ipc/git.ts` (appended), `src/shared/ipc/index.ts`, `src/preload/git.ts`, `build/conformance-watcher.mjs` (W347-1 to W347-8), NEW `p347-open-files.test.ts`, `p347-excludes.test.ts`, `p347-open-files.native.test.ts` | D11 to D21 as the fix round amended them: `armChecked` the only caller of `deps.armFile`, G1 to G6 in order with nothing awaited, the check through `afterKernelSees` (two nested `setImmediate`), both retries bounded by `ARM_RECHECKS`. W347-3 also refuses a `deps.log(` whose arguments name a path (D21); 24 plants each red on the rule that owns it, a plant whose anchor is missing or doubled failing the gate. Both `repoPath` and `path` must be absolute; a capped entry is retried by any later declaration, so one window's closed tabs free slots for another's |
| `editor-watch` (33, window) | NEW `src/renderer/editor/open-file-watch.ts`; `store.ts` (`init` only, one import and the `startOpenFileWatch({...})` call after `onRepoChanged`); NEW `p347-open-file-watch.test.ts`; `build/conformance-save.mjs` (rules 28 and 29 with 10 rule 0 fixtures, 8 caught and 2 left alone); `build/p268/ablation.mjs` (arms 33 to 35, `MonacoHost.tsx` added to its restore and sha256 set) | D12 and D17 as written; the notice listener is subscribed BEFORE the first declaration; a refused or throwing declaration is swallowed; no timer. 37 tests; 17 one-clause clone ablations all red. **R6, as §5.4 asks:** in a `cp -Rc` clone with `tab-io.ts`'s `if (tab.draft != null && tab.savedContents === '') continue;` removed, R6 goes red and nothing else in the file does; the clone was removed and the worktree compared by sha256 |
| `probe` | NEW `build/p347/probe-p347.mjs`, `stand-in.sh`, `fixtures/readings.json`, `fixtures/breaks.json`; `build/p334/probe-p334.mjs` (HEAD's env gains `GMUX_NO_OPEN_FILE_WATCH: '1'`, D20); `build/p247/path-open.mjs` (arm E regraded: the wrapped path opens the whole file from its head row and from its tail row, and a press past its end opens nothing) | §7's arms plus **W15**, the reverify's D11 minor in the app: a folder stored decomposed (`café-nfd`) ignored by a `.gitignore` line written composed, three in-place writes, 3 of 3 at HEAD and 0 of 3 at the parent. K arms read the copy through a recorder on main's `clipboard.write` over `--inspect`, never his pasteboard. W12 passes if HEAD quits within the parent's time plus 2 s. 105 breaks, each turning only its own row |
| integrator | `package.json` (`probe:p347`), `build/verification-checks.mjs` (`electron('probe:p347')`), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 172 → 173), `docs/audits/contract-baseline.txt`, `CLAUDE.md`, `CHANGELOG.md`, and two comments that still stated the old rule: `src/renderer/terminal/TerminalPane.tsx:347-349` ("with NO selection it sends SIGINT") and `src/renderer/terminal/capture/index.ts:139-141` ("rather than sending an interrupt"), both corrected with their line counts kept (D4's intent; the copy builder named them, and they are no builder's) | see below |

**Where the build departs from the text above, and why.**

1. **The two bridge members are REQUIRED, not optional (§4.3).** Phase 122's `installed-bridge-required.test.ts`
   asserts that `InstalledGitApi` has no optional member, and `checkIgnore`, which §4.3 cites as the model, is itself
   required. The window still feature-detects through `gmux.git.watchOpenFiles?.bind(gmux.git)` and
   `startOpenFileWatch` refuses to start without both, so a main from before this phase keeps 0.111.0's behaviour.
2. **D11, the reverify's minor, is answered in the code, and D11 above is amended to say so.** `RepoWatcher` keeps
   `exclusionViewOf(plan)`: each kernel path passed through `canonicalPathSync` once, keeping its own spelling if
   that throws, and the overflow matchers as the subscription has them. Nothing is normalised or case-folded
   (`conformance:samefolder` rule 23: 113 files, 0 `.normalize(` on a path). `p347-excludes.test.ts` E8 drives it:
   a folder stored decomposed (`63616665cc812d6e6664`) and a `.gitignore` pattern written composed; on this Mac git
   hands the subscription the composed spelling (asserted), a byte compare against it answers false (asserted), and
   `excludes` answers true; the test reads red with the respelling removed. Probe arm W15 is the app's reading.
3. **The reverify's three nits.** L10 gains the retargeted-link clause; §2.4 and D18 cite Electron 43.3.0 raising
   the soft limit (and its Node 24.18.1), the cap of 64 unchanged; the third nit was on the fix round's explanation,
   not on this file, and the module's header says "every Tortie save of a file in a project is a rename-over".
4. **`build/conformance-save.mjs` and `build/p268/ablation.mjs` were written by `editor-watch`,** as §4.4 and §14
   give them, although the builder table handed to the build listed only its three source files.

**The contract (obligation 3).** `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` moved
exactly the two lines §8.2 names: `[ipc.invoke.channels] count=248` → `249`, adding `git:watchOpenFiles`, and
`[env.names] count=117` → `118`, adding `GMUX_NO_OPEN_FILE_WATCH`. `git:openFileChanged` is an event and is not in the
inventory. No storage key, schema or smoke mode moved. **Obligation 1:** `HELPER_USER_FLOOR` 172 → 173 for
`build/p347/probe-p347.mjs`; `gate:electron` reads 173 reaching the helper against 173. **Native menus:** none move
(§8.3); the right-click Copy keeps its label and `⌘C` hint, and only the keymap row's words change.

**A gate that was red before this phase.** `conformance:pathdoors` rule 5 fails with one finding,
`src/main/pocket/ipc.ts names shell.open* and is not declared here`, and it fails IDENTICALLY at `af2662e6` (the
parent's own gate run here over a `git archive` of the parent, exit 1, the same single finding). It has failed since
`700f54ed` (Phase 333.1, 2026-10-08), which added `shell.openExternal`/`shell.openPath` at `src/main/pocket/ipc.ts:261-262`
and `:2234`; every one opens a compiled constant or an https `login.tailscale.com` address after a check. Neither that
file nor the gate's `DECLARED` list is this phase's, and declaring a new door to LaunchServices widens a security
gate, so it is left for the operator: one `DECLARED` entry for `src/main/pocket/ipc.ts` turns it green. Every other
rule of that gate passes, rule 17 among them.

**Commands (the integrator; scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` and
`TERM_PROGRAM` unset; his history read `736814 1791821213` and `23166 1790702242` before and after every one, never
moved).** Load average 10 to 28.

| Command | Exit | Reading |
| --- | --- | --- |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` | 0 | the two lines above, nothing else |
| `npm run typecheck` | 0 | 10 s; import boundaries 1,427 files, 0 violations; no runtime cycles |
| `npm run build` | 0 | 43 s; every gate inside it green, `gate:electron` 173 against 173, `gate:contract` byte for byte |
| `npm test` | 1, then 0 | the first run: 21,171 passed and ONE failure, `src/main/proc/__tests__/guarded.test.ts` "kills the child the deadline had not reached yet" (`no pid in …/slow.pid`, a pid file read before its child wrote it, at load 28; not a file this phase touches; nothing it started was left running); that file alone 3 of 3 green; the whole suite again, 0: 1,134 files, 21,172 passed, 14 skipped, 69 s |
| `npx vitest run p347 --reporter=verbose` | 0 | 7 files, 169 tests: copy-only 48, open-file-watch 37, path-join 32, path-links-join 19, open-files 19, open-files.native 11, excludes 3 |
| `npm run test:native -- p347` | 0 | 1 file, 11 tests, 23 s |
| `npm run conformance:watcher` | 0 | W347-1 to W347-8 hold, 24 plants red |
| `npm run conformance:samefolder` | 0 | 9 of 9 ablations red, both kinds of volume, 5 s |
| `npm run conformance:pathdoors` | 1 | rule 5 alone, pre-existing (above); the parent's gate over the parent's tree: 1, the same finding |
| `npm run conformance:save` | 0 | rules 28 and 29 pass |
| `npm run conformance:redline` | 0 | every rule, 32 s |
| `npm run ablation:p268` | 0 | 35 ablations, each red on its own rule, the tree restored by sha256, 14 s |
| `npm run conformance:handback` | 0 | PASS (`menu.ts`, `keymap.ts`) |
| `npm run conformance:machines` | 0 | 27 s; `terminal-menu.ts` is one of condition 54's files |
| `npm run conformance:facts` | 0 | 56 s; every baseline invoke channel read, 0 extras, 56 ablations red; its rule 17 reads the floor 173 |
| `npm run gate:contract` | 0 | byte for byte |
| `npm run gate:checks` | 0 | 268 check scripts classified (`probe:p347` among them) |
| `npm run gate:electron` | 0 | 173 reach the helper, floor 173 |
| `npm run gate:background` | 0 | 3 starts, each ended in a `finally` |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | a clean row at both builds, 105 breaks each turning only its own row |
| `node build/p334/probe-p334.mjs --self-test` | 0 | 87 breaks |
| `node build/p247/path-open.mjs --self-test` | 0 | PASS |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run package` (scratch HOME, `ELECTRON_CACHE` and `ELECTRON_BUILDER_CACHE` his existing caches, read only) | 0 | 56 s; unsigned (no keychain search), the cached Electron 43.3.0 zip used with its mtime unchanged; after-pack's `assert-skills-cli` ran the packed binary as node and it exited; `release/` (831 MB) removed after |

After the last command: no process of this run left, no `p347` socket under `/private/tmp/tmux-501/`, and no
Electron of this checkout in the census (`ps -Ao pid,ppid,rss,comm`); the two lines it shows are his own installed
Tortie and a crashpad of his checkout, both started before this run.

**Not this repository (named for the operator, not edited).** `/Users/gdc/tortiedotsh/src/data/docs.ts:590` ("Command C
has two terminal meanings") and `:1362` ("Copy selected text, or interrupt when nothing is selected") say the old ⌘C;
`:605` ("A path wrapped onto a second row of the pane stays plain, because the pane cannot say where it began") should
say that a path broken over rows opens whole, and that one whose start has scrolled above the session, or which runs
past its last row, stays plain.

**Owed to the verifiers.** `probe:p347` at a BUILT parent (`P347_PARENT_CHECKOUT`) and at HEAD under the lock (not yet
measured, about 8 minutes expected), and §9's independent methods per item at its own tier.

## §As built, the second fix round (the fixer, 2026-10-12, at `af2662e6` plus the uncommitted delta; nothing committed, staged or stashed)

Two lenses verified the build. The attack lens answered `approved` with two minors and two nits; the app lens answered
`needs_work` with one major, one minor and one nit. Every major and minor is answered in the code or, where no code can
answer it, stated for the operator. The one row a lens graded worse than today is REMOVED.

| Finding | Lens, severity | What changed |
| --- | --- | --- |
| A word wrap that leaves a path short of the last column, above a row whose first word is path-shaped, joined into a DIFFERENT existing file (`…/README.md` above `.bak beside it` opened `README.md.bak` where the parent opened `README.md`) | app, major (graded worse) | REMOVED by **J7** in `joinBoundary` (`src/shared/path-spans.ts`): a row short of the last column joins only when its piece ends in `/` or `-`. D7 gains J7; the header's last section and `joinBoundary`'s and `joinedPathAt`'s comments say so. Unit PJ6 (`p347-path-join.test.ts`) and PL6 (`p347-path-links-join.test.ts`); `conformance:pathdoors` rule 17 gains 3 join readings, 4 boundary readings, 2 provider readings over the lens's rows with BOTH files doors (they must equal today's links) and the J7 ablation; `probe:p347` gains arm **P6** (the lens's fixture at both builds, graded the same at both: the path opens `README.md`, `.bak` is no link), its layout checker gains J7, and 7 breaks. L12 rewritten |
| `conformance:pathdoors` rule 5 red, before this phase | app, minor; attack, minor | One `DECLARED` row for `src/main/pocket/ipc.ts` (Phase 333.1, `700f54ed`): Tailscale's compiled download page and app bundle on a person's setup press, which a harness launch never reaches, and the approval URL only after `approvalOpens` (https, exactly `login.tailscale.com`, no port, no credentials). Read in the file before it was declared: no call takes a path or anything the renderer sent. **It widens a security gate's declared doors, so the commit body must name it** (or the operator moves it to a commit of its own); with it the gate is green |
| L4 is a trade, not "no worse" | attack, minor | §12's heading and L4 now state the trade and its prose shape (231 cells of 387 layouts in the lens's every-cell run) for the operator's ruling. No code: J5 and J7 cannot refuse it without refusing issue 40 itself, and J7 keeps it because the folder's piece ends in `/` |
| A freed slot reached another window's capped tabs only on that window's next declaration | attack, nit | `armCapped()` in `src/main/watcher/open-files.ts`, asked after a declaration (as before), a window's end (`dropSender`) and a project's end (`dropRepo`). Unit O7b, red with either call removed. L8 amended |
| The due-timer shape is the only one that kills a one-phase check | attack, nit | No change: N7b is already a behaviour test that reads red with one check phase (the lens's own M1 turned the native lane red) |
| The stale 30 s door cache keeps a deleted join's underline and hides the fragments' links | app, nit (inside the major) | Stated as **L14**; with J7 the fragments it can hide are a piece ending in `/` or `-` or the lower piece of an L4 shape, and the first press re-asks the door and puts the refusal in the cache |
| `probe:p347` "not yet measured" | app, nit | §7 and the CLAUDE.md row record 561 s for both builds (the app lens's run) |

**J7, re-derived over the shipping `joinedPathAt` (`rederive.mts` in the fixer's scratch, pinned tsx, nothing started).**
Issue 40's rows at 45 to 49 columns from each of the three rows: 15 of 15 still join to the whole file at line 134.
`probe:p347`'s own composers (agent break for P1 and P3, soft wrap for P2) at every width from 60 to 240: 1,640 of
1,640 rows still join to the composed path. The committed text captures under `build/fixtures/reply` at their widest
row and up to three columns past it: 2 joins, both kept, 0 refused by J7, 0 new. The lens's hostile rows, from both
rows: refused at 47, 48 and 49 by J7 (joined before it), refused at 50 to 52 by J3 as before, and joined at 46, the
last column, which is what a terminal wrap draws (L12; refusal 8 leaves that row's path unlinked at the parent).

**No regression rows, re-graded for what this round touched.**

| Scenario | Today | This build | Worse |
| --- | --- | --- | --- |
| A path a word wrap left 1 to 3 cells short of the edge, above `.bak beside it`, `README.md.bak` existing | opens `README.md` | opens `README.md`; `.bak` is no link (PL6, P6) | no (was yes) |
| The same with no `README.md.bak` | opens `README.md` | opens `README.md` | no |
| Issue 40's rows, the composers' breaks and soft wraps, the reply captures | as the build's rows | every join kept (above) | no |
| A path ending ON the last column above a path-shaped word whose joined name exists | no link on either row (refusal 8) | the joined file opens (L12) | no |
| `moved src/` short of the edge above `lib/util.ts today`, both files existing | opens `lib/util.ts` | opens `src/lib/util.ts` | the trade, L4 |
| Another window's capped tabs when a window or a project closes | update on a look | armed at once, never past 64 | no |

**Commands (scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset; his history
read `736814 1791821213` and `23166 1790702242` before and after every one, never moved).** Load average 4 to 8. No
Electron, no lock slot, no parent build.

| Command | Exit | Reading |
| --- | --- | --- |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` | 0 | byte for byte the integrator's baseline (`cmp`): this round moves no contract line |
| `npm run typecheck` | 0 | 5 s; import boundaries 1,427 files, 0 violations; no runtime cycles |
| `npm run build` | 0 | 36 s; every gate inside it green, `gate:electron` 173 against 173, `gate:contract` byte for byte |
| `npm test` | 0 | 51 s; 1,134 files, 21,178 passed (the integrator's 21,172 plus PJ6, PL6's four and O7b), 14 skipped |
| `npm run test:native -- p347` | 0 | 1 file, 11 tests, 24 s |
| `npx --no-install vitest run p347` | 0 | 7 files, 175 tests |
| `npm run conformance:watcher` | 0 | W347-1 to W347-8 hold, every plant red |
| `npm run conformance:samefolder` | 0 | 113 files, 0 `.normalize(` on a path, 9 of 9 ablations red |
| `npm run conformance:pathdoors` | 0 | **green, every rule**: rule 5 six files, every one declared; rule 17 47 join readings and 8 provider readings as pinned, 21 of 21 ablations red (J7's among them), 7 of 7 wiring plants |
| `npm run conformance:save` | 0 | every rule, 28 and 29 among them |
| `npm run conformance:redline` | 0 | every rule, 31 s |
| `npm run ablation:p268` | 0 | 35 ablations each red on its own rule, the tree restored by sha256 (and `git status` and a sha256 of every modified file compared before and after) |
| `npm run conformance:handback` | 0 | PASS |
| `npm run conformance:facts` | 0 | 49 s; 56 ablations red, 0 extras |
| `npm run gate:contract`, `gate:checks`, `gate:electron`, `gate:background` | 0, 0, 0, 0 | byte for byte; 268 check scripts classified; 173 against 173; 3 starts, each ended in a `finally` |
| `node build/p347/probe-p347.mjs --grader-self-test` | 0 | a clean row at both builds, 115 breaks each turning only its own row, P6's composer at six widths |
| `node build/p334/probe-p334.mjs --self-test`; `node build/p247/path-open.mjs --self-test` | 0; 0 | 87 breaks; PASS |
| one-clause ablations by hand, each restored and checked by sha256 | — | J7 removed: PJ6 red (1 of 33) and PL6 red (4 of 23); `armCapped()` removed from `dropSender`, then from `dropRepo`: O7b red each time |

**Owed to the reverify.** `probe:p347` P6 (and P1 to P5 beside it) at a BUILT parent and at HEAD under the lock: P6 is
graded the same at both builds and is the live answer to the major; and the reverify's own independent step.

**Files this round changed** (all inside the phase's delta): `src/shared/path-spans.ts` (J7 and its comments),
`src/shared/__tests__/p347-path-join.test.ts` (PJ6), `src/renderer/terminal/__tests__/p347-path-links-join.test.ts`
(PL6), `build/conformance-pathdoors.mjs` (rule 17's J7 readings and ablation; rule 5's `DECLARED` row),
`src/main/watcher/open-files.ts` (`armCapped`), `src/main/watcher/__tests__/p347-open-files.test.ts` (O7b),
`build/p347/probe-p347.mjs` (P6, J7 in `layoutProblems`), `build/p347/fixtures/readings.json` and `breaks.json` (P6),
`build/p247/path-open.mjs` (one comment, the one-left case J7 changed), `CLAUDE.md` (the `probe:p347` and
`conformance:pathdoors` rows), and this file (D7, §4.2, §5.2, §6.2, §7, §9, §12, this section).

**Not this repository.** The integrator's three `tortiedotsh/src/data/docs.ts` lines stand; nothing this round adds a
site line.

## §His ruling of 2026-10-13: issue 40 is held for Phase 347.1

The second reverify of the main session's J8 fix answered needs_work on issue 40 again (an absolute or `~/` folder at the
top of a list item, short of the edge, re-pointed a link the parent opened on the row below: 7,557 cells in 191 of 20,425
list layouts with the existence door; a `-` top likewise). Under the method a second needs_work goes to him, and he chose
"Ship 41 + 33, redo 40": Phase 347 lands issues 41 and 33 as 0.111.2, and issue 40 becomes Phase 347.1 with the
reverifier's rule, a joined link never takes a cell from a row span the door already accepts, re-measured on the
files-only door the product ships. Taken out of this tree, back to `af2662e6` byte for byte: `src/shared/path-spans.ts`,
`src/renderer/terminal/path-links.ts`, `build/p247/path-open.mjs`, the two p347 join test files, rule 17 of
`build/conformance-pathdoors.mjs` (rule 5's row for `src/main/pocket/ipc.ts` is kept: it was red since 333.1) and the
CHANGELOG item; `probe:p347` keeps its P1 to P6 graders but leaves them out of a default run (`HELD_ARMS`). The issue 40
work is kept for 347.1 outside the tree. Also from that reverify: the session-only conflict note now applies to ⌃C
alone, because ⌘C and ⌘A belong to the Edit menu outside a session, with tests for all three.
