# 142. Text that wraps to the phone's width

Research 142. Written 13 October 2026 against the tree at `104f704a` ("docs(backlog): defer 318.1"). This is documents
only. Nothing was built, installed, signed into or started: no app, Electron, Simulator, ssh session, agent or model
turn. No keychain, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, conversation store or live Tortie profile was read, and
the socket `-L gmux` was never touched.

What did run, all of it here:

- **Scratch tmux servers.** The vendored 3.7b (`build/vendor/tmux/bin/tmux`) and, for investigator A, Homebrew's 3.6a.
  Each had its own socket `-L r142-<role>-<pid>` under a scratch `TMUX_TMPDIR`, a copy of `resources/gmux-tmux.conf`, a
  scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset. Committed captures, or the worktree's own
  shell output, were drawn into panes and read back with `capture-pane` with and without `-F`, `-J`, `-N` and `-T`.
  Every server was ended with `kill-server`, and its socket and folder removed, in a `finally` or a trap.
- **Scripts over committed fixtures.** Python and Node readers; the shipping `composePage` through the worktree's
  TypeScript runner; one Swift script that asked CoreText for SF Mono's advance.
- **Investigator D** made shallow `git clone`s of public repositories and read the unauthenticated GitHub API. Nothing
  in them was built or run.
- **The writer** re-ran the judge's two rigs under its own socket names, ran `-V` and `strings` on the two tmux
  binaries, and fetched three Apple documentation pages.

`stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `737549 1791921744` and `23166 1790702242` before and after every
run, by every role. No process, socket or folder was left in `/private/tmp` or `/private/tmp/tmux-501`. One stray is
disclosed: a bare `tmux -L r142-invB-help list-commands` by investigator B left an empty socket file with no server
behind it, and it was removed.

Every claim about Tortie is a `file:line` in the tree at `104f704a`. Every claim about another product cites a public
page or a line in a shallow clone (section 10).

**The round.** Four investigators each owned a lens. A read what tmux knows about a soft wrap. B read what agents draw.
C read the phone today. D read how other products handle the phone's width. Three adversaries then attacked the four
reports: one on correctness over real screens, one on the product, and one on whether it can be built in the order
proposed. A judge ruled on every disagreement and re-derived the disputed numbers on two rigs of its own. That ruling is
this document's spine. The writer re-read the citations this document leans on and re-ran the judge's rigs.

**The question.** A user of the iPhone public beta wrote: "Needs native text rather than a video stream: makes for better
text selection, smaller bandwidth, better dependability, and infinite scrolling." His reading, which this research
tests: it looks like a picture because the Terminal keeps the Mac's width, so on a phone you pinch and pan sideways
rather than read text that wraps. He asked for research into text that wraps to the phone's width.

His standing ruling is not reopened: "the phone never changes the size of a session on his Mac. It draws the Mac's
width; he zooms, pans or turns the phone sideways" (`docs/BACKLOG.md:40492-40493`, Phase 337's ruling 2). Native iOS
selection is a separate candidate phase, 337.5. It is in scope here only where wrapping changes how selection must work.

## 1. The answer first

Do not wrap text inside the Terminal. Send the user a reply now, with no code. Then fix the gap the user actually named,
which is selection.

His reading is half right. The width is why it looks like a picture. The Terminal opens fitted to the phone, so a
120-column session draws at 5.4 pt upright on an iPhone 16 Pro, and a 142-column one at 4.3 pt. Apple's minimum is
11 pt. But wrapping cannot fix this for agents, and agents are what people read on it:

- **Agents break their own lines at the Mac's width, and tmux marks none of those breaks as a wrap.** Of 166 Claude Code
  2.1.287 rows and 242 Codex 0.160.0 rows in the committed captures, 0 would re-wrap under candidate (a).
- **tmux's wrap mark is often wrong after a program redraws in place.** Re-wrapping by it would put text on the phone
  that no program wrote. Today the phone draws the Mac's rows exactly.
- **Re-wrapping every row garbles boxes, rules and footers, and moves the text while he reads.** The Terminal's history
  depends on every row being one cell tall.

Of the user's four reasons, three are already true or mostly true. It is text, not video. An idle session sends almost
nothing. The phone scrolls back to the oldest line tmux kept. The fourth, selection, is false today: it is a custom
450 ms long press with no handles, no loupe and no edit menu.

What to do, in order:

1. **Now: the reply in section 9.** No code, and no new words in the app.
2. **Two small phone-only fixes, neither of them wrapping.** Turn on the Terminal's directional lock. Make the fitted grid
   fill the width on @2x phones. The @2x fill goes to 333.4 as a finding, because its matrix includes the iPhone SE. The
   lock goes in the next phone phase that edits the Terminal.
3. **Native selection (337.5), as a research-first phase, ahead of any wrapping** (question 3). If he still wants text
   wrapped to the phone, the only route measured to be no worse than today is a separate, read-only Read page in ⋯ that
   wraps each Mac row at the phone's width. Its value is mostly native selection, so it is decided inside 337.5, not
   built as this research's own phase.
4. **Bank the soft-wrap mechanism, do not build it** (section 4.1). If a later phase uses it, it is for Copy or a read
   page only, never a visual re-wrap. Its first step is a probe of real Claude Code and Codex panes.

Research 142 queues no phase. Nothing here needs 333.12 or a Mac release.

The findings that change what gets built:

- **Fit to width is already the default.** "The Terminal first fits the view's width"
  (`ios/Tortie/Screens/ScreenGrid.swift:41`). The layout uses `chosen ?? fitted` (`ScreenScroller.swift:413`), and
  `chosen` starts nil in each new view (`:156`). So candidate (d) describes today.
- **The wrap mark goes stale after common redraws.** A row rewritten and then cleared to the end of the line keeps its
  mark. Measured: `status: ok` + 30 spaces + 60 `A`s read as one line, where the Mac shows `status: ok` on a row of its own
  (section 2.4).
- **tmux 3.6a cannot report the mark per row, and his Mac's server may be 3.6a.** `capture-pane -F` exists in 3.7b and
  fails the whole read on 3.6a. The tested pair is server 3.6a with client 3.7b (`build/tmux-release.json:5`), and a
  3.6a server that is already running passes the version gate (`src/main/tmux/supervisor.ts:529-531`).
- **zsh does not mark a typed long command as wrapped.** So joining by the mark on Copy does not fix copying a command
  typed in macOS's default shell (section 2.4).
- **Catch Me Up is already text wrapped to the phone,** but only an agent's turns, never tool or shell output, and it is
  not selectable.
- **SwiftUI's own text selection selects a range only on iOS 27.** "In iOS 26 or earlier, this brings up a system menu
  with menu items appropriate for the current context. These menu items operate on the entire contents of the `Text`
  view" (Apple's `textSelection(_:)` page, fetched by the writer). The app supports iOS 18. This bears on how 337.5
  selects.

His three rules hold. No scenario is worse than today: everything recommended here leaves the Terminal drawing exactly
what it draws now. Tortie never ends a session: nothing here touches one. Just enough words: no new word on any screen.

## 2. What was measured

### 2.1 What a person sees today

**It opens fitted, and fitted text is too small to read.** The fitted cell is the view's width over the Mac's columns
(`ScreenGrid.swift:64-67`), snapped down to the display's pixel (`ScreenRows.swift:256-262`). Investigator C measured
SF Mono's advance at 0.618 per point with CoreText on macOS. That reproduces the cells 337.3 measured on an iPhone 16 Pro:
40 rows of 6.67 pt upright, and a 750 by 382 pt grid sideways (`build/p3373/SPEC.md:911-912`). From it, re-derived by
the judge and checked by the writer:

| Device and view | 80 columns | 120 columns | 142 columns | 200 columns |
| --- | --- | --- | --- | --- |
| iPhone 16 Pro upright (402 pt wide, @3x) | 8.1 pt | 5.4 pt | 4.3 pt | 3.2 pt |
| iPhone 16 Pro sideways (750 pt inside the safe area) | | 9.7 pt | 8.1 pt | 5.9 pt |
| iPhone SE upright (375 pt, @2x; arithmetic, not measured on a device) | | 4.9 pt | 4.0 pt | 2.4 pt |

Apple's minimum text size on iOS is 11 pt ("iOS, iPadOS | 17 pt | 11 pt",
https://developer.apple.com/design/human-interface-guidelines/typography, fetched by the writer). Fitted text reaches it
only up to about 57 columns upright on a 16 Pro, and about 107 sideways.

**How wide his Mac is was not read.** Tortie's default window is 1440 by 900 (`src/main/index.ts:356-357`) with a 13 px
terminal font (`src/renderer/terminal/theme.ts:182`). One probe's pane measured 142 columns at the parent and wider at
HEAD (`build/p337/SPEC.md:1774`), so 142 is one run's width, not a default. Every committed real capture is 120 by 40
(`build/fixtures/reply/real-captures.json`).

**The gestures behave like a photo.**

- A double tap moves between fitted and 12 pt (`ScreenGrid.swift:82-87`). At 12 pt a 16 Pro shows about 55 columns
  upright, so one 142-column row is about 2.6 screens wide: a 639 pt pan for every line read.
- A pinch scales the drawn rows by a transform while the fingers move, and sets the font once they lift
  (`ScreenScroller.swift:284-296`). Whether that looks blurry on a device was not measured.
- A single tap waits for the double tap to fail (`ScreenScroller.swift:240-243`), then raises the keyboard.
- The scroll view never sets `isDirectionalLockEnabled` (its init is `ScreenScroller.swift:190-214`). Apple's default is
  false, so a sideways pan drifts up and down.

**On @2x phones the fitted grid falls short of the width.** The snap is downward. An SE at 200 columns draws 300 of
375 pt. A 16 Pro at 142 columns draws 378.7 of 402 pt (judge and adversary 3, `fit.mjs`). It is a phone-only defect.

**Scrollback.** It is one UIKit scroll view with one cell size, history above the live rows, each row placed by its
index in tmux's own numbering (`ScreenScrollback.swift:16-29`). "Every row is one cell tall" (`:27-28`). "A page then
FILLS reserved rows and moves nothing" (`:34-35`). The phone holds at most 3,000 rows (`:236`) and pages back 100 rows
at a time (`:232`) to tmux's oldest line, 25,000 by default (`resources/gmux-tmux.conf:35`).

**Catch Me Up.** Each turn's ask and answer, wrapped to the phone (`ios/Tortie/Screens/ConversationScreen.swift:1-12`).
It has no tool or shell output. Answers are clipped at 4,000 characters (`src/main/overview/turn-view.ts:27`). Upright
it is two taps, ⋯ then Catch Me Up (`ios/Tortie/Screens/SessionScreen.swift:527`). Sideways the bars are hidden
(`ios/Tortie/Screens/Screen.swift:228`, `:376`), so it cannot be reached. It is not selectable.

### 2.2 The user's four reasons, against the tree

| What the user asked for | Today | Evidence |
| --- | --- | --- |
| Native text, not video | True | Main composes the screen from `capture-pane -p -e` (`src/main/screen/read.ts:207-209`) into rows of text runs (`src/shared/ipc/pocket.ts:1452-1472`), and the phone draws text |
| Smaller bandwidth | True when idle. Not a safe claim while busy | A 120 by 40 Claude Code picture is 9,848 B as compact JSON (`build/fixtures/screen/sample-claude-2.1.287.json`). An unchanged poll is held 10 s (`src/main/screen/watch.ts:75`). While output changes the tick is 100 ms (`:71`), each answer is a whole picture, and nothing is compressed: `grep` finds no gzip, deflate or `Content-Encoding` under `src/main/pocket` or `ios/Tortie/Door`. That is a ceiling near 98 KB/s, by arithmetic, not measured |
| Better dependability | Not measured by this round | |
| Infinite scrolling | Mostly true | Back to tmux's oldest line, with 3,000 rows held (`ScreenScrollback.swift:232-236`). Pages land at most every 250 ms with 8 rows of overlap, so at most about 368 new rows a second. A fling may outrun that and show reserved rows as blank ground until they fill. Not measured on a device |
| Better text selection | False | A custom long press of 450 ms (`ios/Tortie/Screens/ScreenSelection.swift:4-7`, `:44-49`). A `grep` of `ios/Tortie` for `textSelection`, `isSelectable` and `isDirectionalLockEnabled` finds nothing |

**The user had paired a real Mac.** Apple approved phone build 9 for the public group on launch day (`docs/BACKLOG.md`,
the running-log line of 2026-10-12). Build 9 carries 337.3's Terminal (`docs/BACKLOG.md:43401`). See a sample arrived in
build 10 (`:43419`). The sample's sessions are 80 columns (`ios/Tortie/Sample/sample.json`, `"cols":80`), which fit at
8.1 pt. So App Review, and anyone who tries the sample, sees a more readable Terminal than pairing gives.

### 2.3 What tmux knows about a soft wrap

- **tmux marks a row wrapped in one place:** when a character is written past the last column with autowrap on
  (`screen_write_linefeed`, `build/vendor/tmux/work/tmux-3.7b/screen-write.c:1673`). The mark is cleared on the line
  above a whole-line clear or a moved region (`grid.c:710`, `:738`, `:752`).
- **tmux 3.7b prints the mark per row.** `capture-pane -F` puts a prefix before each row, `W` for wrapped and `-` for
  none (`cmd-capture-pane.c:242`, `:282`). Its option string is `ab:CeE:FHJLMNpPqS:Tt:` (`:45`). The man page leaves `W`
  out; the code prints it.
- **3.6a has no `-F`.** The writer read `ab:CeE:JMNpPqS:Tt:` from `strings /opt/homebrew/bin/tmux` (`tmux -V`: 3.6a).
  Investigator A measured that 3.6a answers `unknown flag -F` with exit 1, and `%error` over a control client, failing
  the whole read. The 3.7b CHANGES file names no `-F` entry, so which of 3.7, 3.7a and 3.7b added it is not settled.
- **Adding `-F` changes nothing else.** With the prefix removed, `capture-pane -p -F -e` was byte-identical to
  `capture-pane -p -e` in 68 of 68 captures, and the shipping `composePage` built identical pages from both in 292 of
  292 (12,152 rows). It is still one line per row, so the reads that split by count still hold (investigator A).
- **`-J` cannot be used on history pages.** The same range is 128 lines without `-J` and 117 with it, on 3.7b and 3.6a.
  That breaks the page reader's exact line count and the one-index-per-line space (investigator A). The page argv is
  `scrollback.ts:189-194`, and `conformance:pocket` Z9 refuses any other flag, "no -a, no -J"
  (`build/conformance-pocket.mjs:8980`).
- **A server without `-F` can recover the mark from two captures.** Lining `-p -T -N` rows up against `-p -J` lines
  reproduced 3.7b's marks exactly: 68 of 68 captures, 1,117 rows, 0 wrong, on 3.7b and on 3.6a. The two reads are not
  taken at the same instant, so a mismatch must mean "no mark", never a guess. Not measured on 3.2a or 3.3a, which have
  no `-T` (investigator A).
- **The mark alone loses trailing spaces.** 777 of 2,113 marked rows (37%) end in a space that today's trimmed capture
  drops. Joining today's rows by the mark glued words together in 520 of 4,144 logical lines, for example
  `…01.123ZINFO`. With `-F -e -N -T` the join was exact in 4,144 of 4,144 (investigator A).
- **The cost is small.** On a 120 by 40 pane over a control client: 2,091 B without `-F` and 2,171 B with; p50 0.109 ms
  against 0.112 ms. A 128-row page: 9,272 B against 9,529 B. These were taken at a load average near 720, so they are
  noisy. A `wraps` list on the wire was 11 B at p50 and 86 B at most over 292 pictures (investigator A).
- **A version gate must read the running server, not the bundled binary.** The one tested pair is server 3.6a with
  client 3.7b (`build/tmux-release.json:5`; `src/main/tmux/version.ts:112-114`). A server already running is checked
  by `assertServerVersionUsable` (`version.ts:892`, called at `src/main/tmux/supervisor.ts:531`), so a 3.6a server
  keeps serving across an update until it is ended. The running server's version is read by `readServerVersion`
  (`version.ts:665`).
- **The alternate screen.** tmux reflows history only off the alternate screen. On it, a marked row kept its mark while
  a narrowing cut it (investigator A), and `-J` glued `less` 581.2's prompt to the file's text (adversary 1, `e6.py`).
  Main already keeps `depth` off the alternate screen (`src/main/screen/compose.ts:339-342`).

### 2.4 When the mark is wrong

The judge's rig (`judge/rig.sh`), re-run by the writer on `-L r142-writer-<pid>`. A 40-column pane, output processing
off, 100 `A`s written, then each redraw below. "Guard" is adversary 3's rule: honour `W` only when the marked row has
ink in its last column.

| Case | What the Mac shows | Marks on rows 0 and 1 | `capture-pane -J` reads | Guard |
| --- | --- | --- | --- | --- |
| G1a: nothing redrawn | the 100 `A`s over three rows | W, W | the 100 `A`s, right | joins, right |
| G1b: row 0 rewritten as `status: ok`, then cleared to the end of the line from column 11 | `status: ok`, then two rows of `A`s | W, W | `status: ok` + 30 spaces + 60 `A`s as one line | rejects row 0 |
| G2: row 0 overwritten with 40 `B`s, row 1 with `short line two`, no erase | three separate rows | W, W | 40 `B`s + `short line two` + 46 `A`s as one line | joins, wrong |
| G3: row 0 cleared whole (EL 2), then text | `status: ok`, then the `A`s | -, W | `status: ok` alone | no join on row 0 |
| G4b: 60 columns narrowed to 30, then each row redrawn as `line N` and cleared to the end | `line 1` to `line 6` | W, - | `line 1` + 24 spaces + `line 2` | rejects row 0 |
| G5: 60 `P`s, then CR, up a row, `progress 50%` | `progress 50%PPP…` over two rows | W, - | `progress 50%` + 48 `P`s | joins, as the Mac shows |

After G4b, widening the pane back to 60 makes tmux's own display show `line 1                        line 2` on one row
(G4c). Under candidate (a) the phone would show that wrong join at once, while the Mac shows it only after a widen.

Adversary 1 measured 15 redraw primitives on a 40 by 8 pane (`adv1/e1.py`). Eight left a stale mark: a write then a
clear to the end of the line, on row 0 or row 1; a full-width rewrite then CR LF; cells overwritten with no erase, as
ratatui does; spaces written over a row; a progress bar redrawn with CR; a clear to the start of the line from column 6;
and text with CR LF and no erase. Whole-line clears, a clear from the first column, Ink's per-row clear, and line insert
or delete left none. The source agrees: a line feed that is not a wrap never clears the mark
(`screen-write.c:1671-1673`), and a partial clear never touches it.

On a real agent screen (adversary 1, `e9.py`), `build/fixtures/reply/codex-approval-long-0.160.0.txt` was drawn over a
120 by 40 pane that earlier output had left with 26 marked rows:

- **Ink's per-row clear:** 0 marks stay, and every joined line is right.
- **Each row written, then cleared to the end of the line:** the Mac's rows equal the fixture byte for byte, so today's
  phone is right. But rows 26, 28, 34 and 35 stay marked, and `-J` joins `› 1. Yes, proceed (y)` + 99 spaces +
  `2. Yes, and don't ask again …` into one 237-character line. On a 57-column phone, "2." would start in the middle of
  option 1's line.
- **Cells written padded to 120 with no erase:** 17 rows stay marked.

After a narrowing from 120 to 78 and the agent's own redraw at 78 (`e10.py`), a stale mark puts a 5-column hanging indent
inside a command argument: `p318-long-     argument-03`. Research 115 measured one pane going from 144 to 78 columns when
an editor tab opened (`docs/research/115-phase-253-the-paths-vscode-catches.md`, §4, arm 4).

**The guard narrows the hazard but does not close it.** It rejects G1b and G4b, whose last cell is blank. It lets G2's
stale full-width overwrite through, and G5's progress bar, where the join matches the Mac.

**Shells** (the judge's `judge/shells.sh`, re-run by the writer: a 40-column pane, an 81-character
`echo word01 … word11` typed with `send-keys -l`, entered, then recalled with Up):

| Shell | The command as typed | Its output | The same command recalled with Up |
| --- | --- | --- | --- |
| zsh 5.9, `zsh -f` | -, -, - (no mark) | W, - | W, W, - |
| bash 3.2, `--norc --noprofile` | W, W, - | W, - | marked (adversary 1) |

zsh breaks the line it is editing itself, so two identical commands are marked differently. Joining by the mark on Copy
would still copy a typed zsh command as `…word0`, a line break, then `5 word06…`, which is today's defect, unchanged.

### 2.5 What agents draw

Investigator B, over the 56 committed captures at 120 by 40 (34 in `build/fixtures/reply`, 22 in
`src/main/activity/__tests__/fixtures`):

- **The captures carry no soft-wrap information, by construction.** They were taken with `capture-pane -p` or `-p -e`
  (`build/fixtures/reply/real-captures.json`, the `capture` field). Drawn back into panes they give 0 joins under `-J`.
- **A soft wrap needs ink in the last column.** The only Claude Code 2.1.287 rows that reach column 120 with a row below
  are its 28 rules. The only Codex 0.160.0 ones are two continuation rows of `codex-approval-long-0.160.0.txt`, and the
  5-column hanging indent below each shows the agent broke them. So candidate (a) would re-wrap 0 of 166 Claude Code
  rows and 0 of 242 Codex rows.
- **This agrees with Phase 347.** Issue 40's rows are the agent's own break, and Codex's breaker lands on column 120 of
  120 (`build/p347/SPEC.md:113-117`). It agrees with the agents' own trackers too: Claude Code "dynamically renders
  physical \n … to mimic word-wrapping" (https://github.com/anthropics/claude-code/issues/22073), and Codex keeps its own
  logical wrap (https://github.com/openai/codex/issues/22109).

Under candidate (b), rows wider than the 57 columns a 16 Pro shows at 12 pt:

| | Claude Code 2.1.287 (12 captures) | Codex 0.160.0 (16 captures) |
| --- | --- | --- |
| Rows wider than 57 | 55 of 166 (33%) | 43 of 242 (18%) |
| Would garble | 39: rules 28, two-column footer 8, gutter 3 | 10: footer 5, gutter 4, two-column 1 |
| Re-wrap readably, but ragged | 16 | 33 |

Other agents are worse at 57 columns. Gemini: 19 of 29 rows over, 18 of them box or rule rows. Cursor: 57 of 73, 53
box rows. OpenCode: 16 of 37, 13 sidebar or box rows.

The worst cases under (b): Claude Code's prompt box (a rule, `❯`, a rule) becomes 7 rows with 6-column stubs, and its
footer splits over three rows, leaving `/effort` alone on the last. Codex's option 2, drawn as 4 rows, becomes 10, with
the word split after `p318-` twice.

**His live panes do have soft wraps that the fixtures cannot show.** Research 107 found 6,875 of 39,807 rows in five
Claude panes joined by `-J` (17.3%), against 6 of 8,096 in ten Codex panes
(`docs/research/107-phase-245-clickable-paths.md:282-284`, tmux 3.6a, 8 September 2026). Whether those are prose let out
unwrapped, or rows tmux reflowed after resizes, is not settled. Narrowing the 12 Claude captures from 120 to 78 marks 49
rows, and 39 of the lines they rejoin are rules, footers and gutters (investigator B, `exp4.py`).

### 2.6 Shell output under candidate (a)

Adversary 2 drew real shell output from the worktree (`git log --oneline`, `grep -rn`, `ls -l` and a `git show` diff)
into scratch 3.7b panes and read `capture-pane -p -F` (`adv2/rig.sh`). The judge re-derived the counts from the same
captures. Of the logical lines, 1,128 are wider than the 54 columns a phone shows at 12 pt.

| Mac width | Wider than 54 | Marked by tmux | Left at the Mac's width |
| --- | --- | --- | --- |
| 120 columns | 1,128 | 127 (11.3%) | 1,001 |
| 142 columns | 1,128 | 44 (3.9%) | 1,084 |

So under (a) about one wide line in nine re-wraps at 120 columns, and one in 26 at 142. The rest stay at the Mac's
width, so you still pinch and pan, past a screen that mixes the two.

### 2.7 What a change would touch

- **A re-wrap done only on the phone cannot press the wrong option.** Keys carry the drawn turn and dialog mark
  (`ios/Tortie/Screens/ScreenKeys.swift:207-209`). The mark hashes the Mac-width plain text (`windowMarkOf`,
  `src/main/screen/compose.ts:108-115`). In the 42 option rows of the 34 committed screens, 0 continuation pieces read as
  an option number at 57 or 45 columns (adversary 1). This holds only while the re-wrap never touches `plain`.
- **Any re-wrap inside the Terminal breaks its history rules.** A page that lands with wraps changes row heights, so the
  text jumps while he reads. A wrap width that follows the zoom re-lays the rows on every pinch. One line also splits
  across the history and the live screen in 37 of 40 states for 300-character lines (adversary 1, `e11.py`).
- **A soft-wrap mark on the wire would be an optional answer key.** For example a `wraps` list beside `lines` on
  `PocketScreen` and `PocketScrollbackAnswer` (`src/shared/ipc/pocket.ts:1452-1472`, `:1541-1560`). The phone's decoder
  reads only keys it names (`ios/Tortie/Door/Contract.swift:1205-1210`), and `gate:onlyadd` allows an optional key
  (`build/assert-door-only-adds.mjs:14-17`). It needs no 333.12, because the pairing hash covers the sorted routes only
  (`src/main/pocket/pairing.ts:295`). It must never be a new query name. An older Mac refuses an unknown name
  (`src/main/pocket/routes.ts:960`, `:1174`), and the phone turns that refusal into `.backToList`
  (`ios/Tortie/Door/DoorClient.swift:619-620`; `ios/Tortie/Screens/DoorWords.swift:273-274`).
- **The contract baseline does not move.** It holds no door answer field: `grep -c 'PocketScreen\|wraps'
  docs/audits/contract-baseline.txt` reads 0.
- **The revision would have to hash the marks.** It hashes `reading.styled` (`src/main/screen/watch.ts:196-204`), so a
  change to the marks alone would not move it.
- **Gates that move on purpose for candidate (a)'s Mac half:** `conformance:pocket` Z9
  (`build/conformance-pocket.mjs:8892`, `:8980`), `conformance:machines` conditions 124 and 140, `ablation:p313` arms Z9e
  and Z9f, and `measure:p337 -- --check` (14 to 19 minutes). For any change inside the Terminal: `conformance:ios` rules
  (aq), (as), (aw) and (k), their `ablation:p316` arms, about 3,900 lines of Terminal tests, and `probe:p316` PS2 (whose
  labels must equal `capture-pane -p` rows), PS3, PS6, PS10 to PS16 and 337.3's PF and PL arms.

## 3. How others do it

Read by investigator D on 13 October 2026, from shallow clones and public pages (section 10.3 and 10.4). The writer did
not re-fetch them, apart from the three Apple pages.

- **Every product that shows text wrapped to the phone gets it by resizing the host's terminal**, so the program wraps
  itself again. SSH clients send their size by protocol (https://www.rfc-editor.org/rfc/rfc4254#section-6.7). Blink:
  "To adjust size of current terminal, pinch the screen" (https://docs.blink.sh/). Moshi's fix for wrapped code is
  "Widen the terminal first (rotate to landscape, smaller font, or run on iPad) so the agent emits unwrapped lines"
  (https://getmoshi.app/docs/clipboard). Orca, Paseo, VibeTunnel, cmux by default, Superset, Termix, Happier and Omnara
  resize too (research 139 §3.7). His ruling forbids it. herdr issue #2404 shows the harm: with a 65-column phone
  attached, agent tools "repaint their transcripts at that narrow width. The narrow output is committed to scrollback as
  hard-wrapped lines, so it does not come back", and panes held four or five copies of one transcript at alternating
  widths (https://github.com/herdrdev/herdr/issues/2404).
- **Products that keep the host's width scale the grid down or crop it.** cmux: "the phone renders the exact shared grid
  scaled to its width and pinned to the bottom. Pinch zooms and pans" (`docs/shared-terminal-sizing.md:285-288`). Orca's
  desktop mode fits by `Math.min(1, vpWidth / termWidth)` (`mobile/src/terminal/document/viewport-transform.ts:52-68`).
  Paseo slices each row to the columns that fit and hides the rest
  (`packages/app/src/terminal/native-renderer/terminal-grid-view.native.tsx:91-100`). Tortie already matches cmux and
  Orca.
- **One attempt re-wraps a host-width grid on the phone, and it has not shipped.** cmux PR #11419
  (https://github.com/manaflow-ai/cmux/pull/11419), open since 1 September 2026, cuts each trimmed row at the phone's
  column count, character by character, with no word boundary and no case for the alternate screen. Its own note: "These
  images verify desktop isolation; they do not verify iPhone rendering." It answers cmux issue #11303, the same complaint
  as this user's (https://github.com/manaflow-ai/cmux/issues/11303).
- **Undoing an agent's own breaks is a heuristic, used only when copying.** Orca PRs #25434 and #25440, both open, join
  a row to the one above only when the next row's first word would not have fit, and never across bullets, numbers,
  code fences or box drawing (https://github.com/stablyai/orca/pull/25434,
  https://github.com/stablyai/orca/pull/25440). Paseo joins only rows its emulator marked as wrapped, and only on Copy
  (`packages/app/src/terminal/native-renderer/terminal-selection.ts:330-332`).
- **Products that wanted readable agent text built a conversation view.** Claude Code's Remote Control "shows the
  conversation in your terminal as it happens" (https://code.claude.com/docs/en/remote-control). Moshi's Chat View is "a
  visual layer over the coding agent … The terminal remains the source of truth" (https://getmoshi.app/docs/chat-view).
  Catch Me Up is Tortie's.
- **A wrap switch exists for tool output, not for a live terminal.** Oppi's "Wrap Text" is off by default and never
  changes the output (https://github.com/duh17/oppi, `docs/document-viewers.md:198-208`). No product re-wraps the
  history while keeping the live screen a grid.
- **Local reflow causes bugs even in mature emulators.** Paseo issue #6502 lost 40 of 280 Hangul syllables after a widen
  and a narrow (https://github.com/getpaseo/paseo/issues/6502). SwiftTerm's own comment names the stale-mark hazard of
  section 2.4 (`Sources/SwiftTerm/Terminal.swift:2650-2656`).
- **Nobody offers unlimited scrollback on the phone.** Moshi's buffer has "no setting to change its length"
  (https://getmoshi.app/docs/scrolling). mosh issue #122 has been open since 2012
  (https://github.com/mobile-shell/mosh/issues/122). Paseo keeps 1,000 lines by default
  (https://github.com/getpaseo/paseo/pull/6148).
- **Selection elsewhere is a long press with handles.** Moshi, Orca, Attach and TermRover. Where a product re-wraps,
  each drawn cell must map back to its source: cmux keeps a `sourceColumn` per cell
  (`MobileTerminalRenderGridFrame+Viewport.swift:9-14` at the PR's head).

A citation in the brief is corrected: `mobile/src/terminal/document/fit-scale.ts:42-46` is Orca's, not Paseo's
(`docs/research/139-a-live-session-on-the-phone.md:666`). Orca's reason, "resizing only the WebView xterm changes cursor
coordinates and makes TUI repaint chunks duplicate or overlap", is about replaying a byte stream. Tortie sends composed
pictures, so that hazard does not carry over. The hazards that do are the ones measured in section 2.4.

## 4. The candidates, and why

| Candidate | Verdict | Why |
| --- | --- | --- |
| (a) Re-wrap on the phone only the lines tmux soft-wrapped | **No, for the Terminal.** Banked for Copy or a read page (4.1) | 0 of 408 agent rows qualify (2.5). About 11% of wide shell lines at 120 columns and 4% at 142 (2.6). A stale mark puts text on the phone that no program wrote, where today is exactly right (2.4). 3.6a has no `-F`. It breaks the history's one-row-one-cell rule. It needs a Mac release and a phone build, at Tier 3 on both |
| (b) Re-wrap everything on the phone | **No, as a default** | Garbles 39 of 55 wide Claude Code rows and most box rows of Gemini, Cursor and OpenCode (2.5). Text jumps when a page lands, and on every pinch if the width follows the zoom. The one attempt elsewhere has not shipped |
| (c) A reading mode: history re-wrapped, live screen a grid | **Refuted** | One line splits across the two in 37 of 40 states (2.7). Rows change shape as they are carried into history (`ScreenScrollback.swift:47-54`). The history it would re-wrap is still the agent's own breaks, so it is (a)'s no-op or (b)'s garble |
| (d) Fit to width as the default | **Keep. It is today** | `ScreenGrid.swift:41`; `ScreenScroller.swift:413` |
| (e) Make Catch Me Up the answer, and say so in the app | **In the reply only** | It is already wrapped to the phone. It has no tool or shell output, is clipped at 4,000 characters, is two taps upright and out of reach sideways, and is not selectable. Making it one tap reverses his 337.3 ruling, "an ellipses in the top right" |
| (f) Leave it, and answer the user | **Yes, now** | Makes nothing worse. Corrects three of four premises. Leaves selection open, which 337.5 answers |
| (g) A Read page in ⋯ (investigator C's candidate) | **The only wrap measured to be no worse than today.** Decide it inside 337.5 | It is (b) on a page he opens, so the Terminal does not change (4.2) |

### 4.1 The mechanism banked for later

If a later phase uses tmux's soft-wrap mark, it needs all of these:

- `capture-pane -F` on a running server of 3.7 or later, asked with `readServerVersion`; or the two-capture fallback
  (`-p -T -N` against `-p -J`), with "no mark" whenever the two reads disagree;
- the main screen only;
- the last-column-ink guard;
- `-N -T` in the capture, or the count of blanks the composer dropped, for an exact join;
- an optional answer key, never a query name, and the revision hashing the marks;
- as its first step, a probe of real Claude Code and Codex panes on 3.7b, before and after a narrowing, counting marked
  rows and stale ones.

Even then it is wrong on a full-width overwrite with no erase (G2), and it does not reach a command typed in zsh. It is
Tier 3: it claims to work across agents and machines.

### 4.2 The Read page, if he wants text wrapped to the phone

- Read-only, in ⋯ beside Catch Me Up, upright only.
- It wraps each Mac row at the phone's width as native text. It uses rows the phone already holds plus the live rows,
  frozen when it opens. It makes no new read, so it adds nothing to the Mac's page queue.
- Phone only. It touches no `src/` file. One change sits outside its own file: the history is `@State private` to the
  Terminal's page (`ios/Tortie/Screens/Screen.swift:286`, `:308`), so `Screen.swift` must hand out a copy.
- Its limits: agent prose wraps ragged (54, 54, then 10 columns, repeating), rules become stacks of dashes, and it sits
  beside Catch Me Up, so a stranger has to ask which one to use.
- Gates: `conformance:ios` (ay5) goes red on purpose, because the menu must be exactly `Button,EndMenuItem`
  (`build/conformance-ios.mjs:11760`); (an) keeps it upright; (ao) needs its own cover; `conformance:phonecopy` reads its
  word; (al) and (z) apply if it is selectable.
- Tier 2 if it is not selectable. Tier 3 if it is, because the system edit menu's Share, Translate and Look Up send his
  words off the Mac.
- A read-only `UITextView` gives wrapping, handles, the loupe and a double tap on a word from UIKit (adversary 2).
  SwiftUI's `.textSelection` selects a range only from iOS 27. So this page is one way of delivering 337.5, and is
  decided there.

### 4.3 The two small fixes

- **The directional lock.** One property on the Terminal's scroll view. Apple: "If this property is true and the user
  begins dragging in one general direction (horizontally or vertically), the scroll view disables scrolling in the other
  direction. If the drag direction is diagonal, then scrolling doesn't lock and the user can drag in any direction until
  the drag completes. The default value is false"
  (https://developer.apple.com/documentation/uikit/uiscrollview/isdirectionallockenabled, fetched by the writer). So a
  diagonal pan still works. Tier 2.
- **Fill the width on @2x phones.** Up to 75 pt is left empty on an SE at 200 columns. The mechanism is the phase's, and
  it must keep cells on whole pixels and leave @3x phones as they are. Tier 2.

## 5. Order

- **Nothing is queued by this research.** The reply goes now.
- **The @2x fill** goes to 333.4 as a finding: 333.4 is in flight in its own worktree, and its matrix includes the SE.
  If 333.4 does not take it, it rides with the lock.
- **The lock** goes in the next phone phase that edits the Terminal.
- **337.5, or a Read page:** after 333.4, which owns `build/p316/**`; after 345, with which it shares `Copy.swift`,
  `conformance-ios.mjs`, `probe-p316.mjs` and `TortieApp.swift`; never beside 337.2, 337.4 or 346's phone half. Its app
  run waits for 337.2's repair of `probe:p316`'s screen group, which reads the same failures at the parent
  (`docs/BACKLOG.md:43419`), or it uses a UI-test file of its own.
- **Candidate (a), if ever built:** a Mac release and a phone build, after 333.11.1, which owns
  `build/assert-door-only-adds.mjs`, and never beside 346 or 333.12, which share `src/shared/ipc/pocket.ts` and
  `build/conformance-pocket.mjs`.

## 6. What was refuted

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| "No stale marks after redraws in place" (investigator A, claim 8) | True only for whole-line erases. G1b, G2 and G4b keep stale marks; 8 of 15 primitives leave one (adversary 1); s1 to s3 (adversary 3) | Any use of the mark needs the guard, and is still wrong on G2 |
| "The mark stays right through a resize" (investigator A, claim 5) | True only for output never redrawn. G4b joins `line 1` and `line 2` | Stated in 2.4 |
| Copy that joins by the mark is a small phone piece (investigator C, piece 17) | It needs a Mac change; zsh does not mark a typed command; joining today's trimmed rows glues words in 520 of 4,144 lines | Banked in 4.1, not small |
| Candidate (a) regenerates the contract baseline (investigator C) | The baseline holds no door answer field; `grep -c` reads 0 | No baseline change |
| Candidate (d) is a change | It is today's default (`ScreenGrid.swift:41`) | Kept |
| "Paseo never reflows locally: `fit-scale.ts:42-46`" (the brief) | That file is Orca's (research 139:666). Paseo crops | Corrected in section 3 |
| The directional lock makes a diagonal pan take two strokes (adversary 2) | Apple: a drag that starts diagonally does not lock | A diagonal pan still works |
| A reading mode (c) keeps the live grid honest | One line straddles the two in 37 of 40 states | Refuted |
| The bundled tmux means `-F` is always there on this Mac | A 3.6a server already running passes the gate; the tested server is 3.6a | Any gate reads the running server |
| The user may have been on See a sample | Build 9, the public build, has no sample; it came in build 10 | The user paired a real Mac |
| SwiftUI's `.textSelection` makes Catch Me Up selectable cheaply | On iOS 26 and earlier it acts on the whole text only | 337.5 chooses its mechanism |
| Citations: `compose.ts:440-448` (adversary 1), `version.ts:885-960` (adversary 3), `scrollback.ts:248-252` (investigator B), `build/p337/SPEC.md:1103` (investigator C) | The depth rule is `compose.ts:339-342`; the gate starts at `version.ts:892`; the page arithmetic is `pageRange` at `scrollback.ts:181-186`; 142 columns is `:1774`, one run's width | Corrected here |

Held under attack: the Terminal is already text; fitted text is too small upright; the @2x shortfall; three of four
premises true and selection false; tmux 3.7b's `-F` and 3.6a's lack of it; `-J` breaks history pages; the alternate
screen is unsafe; (a) re-wraps almost nothing on agent screens; (b) garbles agent screens as a default; any in-Terminal
re-wrap breaks the history's rules; a phone-only re-wrap cannot press the wrong option; nothing needs 333.12; wrapping to
the phone has only ever been done by resizing the host.

## 7. What is not settled

- How often real Claude Code 2.1.x and Codex 0.160.0 panes carry marked rows, stale ones included, especially Codex's
  ratatui redraws after a narrowing. No agent run was allowed.
- Where research 107's 17.3% of Claude rows joined by `-J` came from: prose let out unwrapped, or reflow after resizes.
- On a device: whether the pinch looks blurry while the fingers move, and whether a fling shows blank reserved rows.
- A busy session's real bandwidth over Funnel. 98 KB/s is a ceiling, not a measurement.
- What "better dependability" meant to the user. This round did not measure it.
- The cost of drawing native selection inside the grid (`UITextInteraction` over custom-drawn rows).
- His real terminal widths, and which tmux his `-L gmux` server runs.
- Which release first had `-F` (3.7, 3.7a or 3.7b), 3.7c's behaviour, and the two-capture fallback on 3.2a and 3.3a.
- Whether this user was reading an agent or a shell. The reply could ask.
- Whether iPad compatibility mode runs at @2x and so shows the SE's shortfall.

## 8. Questions for him

1. Build any wrapping inside the Terminal?
   Recommended: no.
2. Send the reply in section 9 now, with no new words in the app?
   Recommended: yes.
3. Queue native selection (337.5) as a research-first phase, ahead of any wrapping?
   Recommended: yes.
4. Should 337.5 select in the grid itself, or on a Read page?
   Recommended: in the grid, so there is one surface, as in Safari. The Read page is the cheaper fallback, and the only
   route that also wraps.
5. Open the Terminal at reading size instead of fitted?
   Recommended: no. Fitted is the glance view, and matches cmux and Orca.
6. Make Catch Me Up one tap, or reachable sideways?
   Recommended: no. Keep his 337.3 ⋯.
7. The two small fixes: the lock in the next phone phase that edits the Terminal, and the @2x fill offered to 333.4?
   Recommended: yes.
8. A probe of real agent panes with `-F` before anything uses tmux's mark?
   Recommended: yes, as that phase's first step, not now.

## 9. The reply he can send

> Thanks, this helps. It is already native text, not video: your Mac sends the terminal's characters, an idle session
> sends almost nothing, and you can scroll up through everything your Mac kept. It keeps your Mac's width because the
> phone never resizes a session on your Mac, so it opens shrunk to fit. Double-tap to read at full size, turn the phone
> sideways for whole lines, or tap ⋯ then Catch Me Up for the agent's own words wrapped to your phone. Selecting text the
> iPhone way, with handles, is not there yet, and it is what we are looking at next.

Send the last sentence only if 337.5 is queued (question 3). Otherwise end with "Thanks for flagging it." If he wants to
know whether wrapping could ever help this user, add: "Were you reading an agent or a shell?" The reply avoids "stream",
as his beta wording does, and claims nothing about bandwidth while a session is busy.

## 10. Evidence

### 10.1 The tree at `104f704a`

`ios/Tortie/Screens/ScreenGrid.swift:36-48, 41, 64-67, 82-87, 155-160`;
`ios/Tortie/Screens/ScreenScroller.swift:150-157, 190-214, 230-243, 270-296, 411-413`;
`ios/Tortie/Screens/ScreenRows.swift:228-240, 256-262`; `ios/Tortie/Screens/ScreenScrollback.swift:1-60, 228-236`;
`ios/Tortie/Screens/ScreenSelection.swift:1-30, 44-50, 190-225`; `ios/Tortie/Screens/ScreenKeys.swift:205-210`;
`ios/Tortie/Screens/Screen.swift:222-232, 284-288, 306-309, 372-380`; `ios/Tortie/Screens/SessionScreen.swift:527`;
`ios/Tortie/Screens/ConversationScreen.swift:1-12`; `ios/Tortie/Screens/Reply.swift:1-9`;
`ios/Tortie/Screens/DoorWords.swift:272-275`; `ios/Tortie/Door/DoorClient.swift:617-621`;
`ios/Tortie/Door/Contract.swift:1205-1210`; `ios/Tortie/Sample/sample.json` (`"cols":80`); the iOS deployment target,
18.1, in the project file.

`src/main/screen/read.ts:204-210`; `src/main/screen/watch.ts:68-76, 194-205`; `src/main/screen/scrollback.ts:179-195,
462-469`; `src/main/screen/compose.ts:108-116, 255-260, 335-344`; `src/main/machines/remote-screen.ts:63-67, 89-97`;
`src/shared/ipc/pocket.ts:1452-1475, 1541-1550`; `src/main/pocket/pairing.ts:290-297`;
`src/main/pocket/routes.ts:953-969, 1174`; `src/main/overview/turn-view.ts:25-29`;
`src/main/tmux/version.ts:108-114, 663-668, 890-895`; `src/main/tmux/supervisor.ts:529-533`; `src/main/index.ts:354-360`;
`src/renderer/terminal/theme.ts:180-184`; `resources/gmux-tmux.conf:35`; `build/tmux-release.json:1-12`.

`build/conformance-pocket.mjs:8890-8894, 8978-8982`; `build/conformance-ios.mjs:11756-11763`;
`build/assert-door-only-adds.mjs:14-19`; `docs/audits/contract-baseline.txt` (no `PocketScreen`, no `wraps`);
`build/p337/SPEC.md:1101-1105, 1772-1776`; `build/p3373/SPEC.md:909-915`; `build/p347/SPEC.md:110-130`;
`build/fixtures/reply/real-captures.json`; `build/fixtures/reply/codex-approval-long-0.160.0.txt`;
`build/fixtures/screen/sample-claude-2.1.287.json`; `src/main/activity/__tests__/fixtures`.

`build/vendor/tmux/work/tmux-3.7b/cmd-capture-pane.c:45, 242, 282, 295`; `screen-write.c:1661-1673`;
`grid.c:710, 738, 752`; `CHANGES` (no `-F` entry between 3.6b and 3.7b).

`docs/BACKLOG.md:40488-40496` (Phase 337's rulings), `:43401`, `:43419` and the 2026-10-12 launch line;
`docs/research/107-phase-245-clickable-paths.md:276-290`; `docs/research/115-phase-253-the-paths-vscode-catches.md:231-268`;
`docs/research/139-a-live-session-on-the-phone.md:237-247, 660-670`.

### 10.2 Commands and numbers

The judge's rigs, re-run by the writer under `-L r142-writer-<pid>` and `-L r142-writer2-<pid>` with
`TMUX_TMPDIR=/private/tmp/r142w-<pid>`, each ended by `kill-server` and `rm -rf` in a trap:

- `bash judge/rig.sh`: G1a to G5 in section 2.4, each read with `capture-pane -p -F`, `capture-pane -p -J`, and
  `capture-pane -p -N` for the guard. Every row matched the judge's reading.
- `bash judge/shells.sh`: zsh 5.9 (`-f`) and bash 3.2 (`--norc --noprofile`) at 40 by 12. zsh typed `- - -`, its output
  `W -`, recalled `W W -`; bash typed `W W -`.
- `strings /opt/homebrew/bin/tmux | grep '^ab:CeE'` gives `ab:CeE:JMNpPqS:Tt:` (3.6a); the same on
  `build/vendor/tmux/bin/tmux` gives `ab:CeE:FHJLMNpPqS:Tt:` (3.7b).
- History before and after: `737549 1791921744` and `23166 1790702242`.

The other roles' scripts are in the session scratchpad under `r142/`: investigator A's `harness.mjs`, `align.mjs`,
`cost.mjs` and `composeeq.mts`; investigator B's `classify.py`, `exp1.py` to `exp4.py` and `rewrap.py`; investigator C's
`swift/cells.swift`, `py/rowlens.py` and `tm/wrapflags.sh`; adversary 1's `e1.py`, `e3.py`, `e5.py`, `e6.py`, `e9.py`,
`e10.py` and `e11.py`; adversary 2's `rig.sh`, `widths.py`, `fit.py`, `cap-F-120.txt` and `cap-F-142.txt`; adversary
3's `stale.sh`, `stale2.sh` and `fit.mjs`. The scratchpad is not kept.

### 10.3 Pages read

Fetched by the writer on 13 October 2026:

| Source | What it shows |
| --- | --- |
| https://developer.apple.com/design/human-interface-guidelines/typography | iOS default 17 pt, minimum 11 pt |
| https://developer.apple.com/documentation/uikit/uiscrollview/isdirectionallockenabled | A diagonal drag does not lock; the default is false |
| https://developer.apple.com/documentation/swiftui/view/textselection(_:) | Range selection on iOS 27 or later; a whole-text menu on iOS 26 or earlier |

Read by investigator D on 13 October 2026:

| Source | What it shows |
| --- | --- |
| https://www.rfc-editor.org/rfc/rfc4254#section-6.7 | An SSH client sends its window size |
| https://docs.blink.sh/ | A pinch resizes the terminal |
| https://getmoshi.app/docs/gestures , https://getmoshi.app/docs/clipboard , https://getmoshi.app/docs/chat-view , https://getmoshi.app/docs/scrolling | Moshi resizes; widen first; Chat View; a fixed buffer |
| https://github.com/manaflow-ai/cmux/pull/11419 , https://github.com/manaflow-ai/cmux/issues/11303 | The one re-wrap attempt, open; the same complaint |
| https://github.com/herdrdev/herdr/issues/2404 | Resizing leaves agent transcripts at several widths |
| https://github.com/anthropics/claude-code/issues/22073 , https://github.com/anthropics/claude-code/issues/42296 , https://github.com/anthropics/claude-code/issues/43113 | Claude Code breaks its own lines |
| https://github.com/openai/codex/issues/22109 | Codex keeps its own logical wrap |
| https://github.com/stablyai/orca/pull/25434 , https://github.com/stablyai/orca/pull/25440 | Re-joining an agent's breaks on Copy |
| https://code.claude.com/docs/en/remote-control | A conversation view on the phone |
| https://github.com/duh17/oppi | A wrap switch for tool output |
| https://github.com/getpaseo/paseo/issues/6502 , https://github.com/getpaseo/paseo/issues/6137 | Reflow bugs; short phone scrollback |
| https://github.com/mobile-shell/mosh/issues/122 | mosh has no scrollback |
| https://apps.apple.com/us/app/attach-ssh-native-tmux/id6760011289 | A native tmux client with on-demand history |
| https://termrover.sh/blog/termius-alternatives/ | A loupe for selection |

### 10.4 The clones

Shallow clones under the scratchpad's `r142/investigator-d/clones/`, read only. stablyai/orca at `ba07bd71`:
`mobile/src/terminal/document/fit-scale.ts:42-46`, `viewport-transform.ts:52-68`, `reflow.ts:7-14`,
`surface-touch-gestures.ts:222-226`, `text-scaling.ts:13-18`; `mobile/app/terminal-settings.tsx:279`;
`docs/site/content/docs/mobile.mdx:23, 103`. getpaseo/paseo at `b1a63848`: `docs/architecture.md:308`;
`packages/server/src/terminal/terminal-size-ownership.ts:11-30`;
`packages/app/src/terminal/native-renderer/terminal-grid-view.native.tsx:91-100, 312-323`,
`terminal-selection.ts:330-332`, `headless-terminal-state.ts:209-218`. manaflow-ai/cmux at `a4ed8a2d` (sparse):
`docs/shared-terminal-sizing.md:90-91, 285-288`;
`Packages/iOS/CmuxMobileTerminal/Sources/CmuxMobileTerminal/GhosttySurfaceView+ScaledGrid.swift:6-12`; and PR #11419 at
`6107cdf8`: `docs/terminal-viewport.md:36-49`, `MobileTerminalRenderGridFrame+Viewport.swift:9-14, 21-35, 155-260`.
migueldeicaza/SwiftTerm at `96fd0320`: `Sources/SwiftTerm/Terminal.swift:1271-1276, 2650-2656`, `Buffer.swift:910-912`.
amantus-ai/vibetunnel at `f78324f`: `ios/VibeTunnel/Models/TerminalWidth.swift:5-36`;
`web/src/client/components/terminal.ts:436-457`. happier-dev/happier at `b9dab16` (sparse) and blinksh/blink at
`a90b442` were read for width behaviour.
