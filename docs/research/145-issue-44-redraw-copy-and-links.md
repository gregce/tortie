# 145. Issue 44: a reply drawn over itself, a copied line that breaks, and links that do nothing

Research 145, for Phase 367. Written 14 November 2026 against the worktree `wt-r145` at `8645875e` (origin/main,
Electron 43.8.7, bundled tmux 3.7b). This is research only. No product code changed, and nothing under `src/`,
`build/`, `resources/` or `ios/` was edited.

What ran, all of it in scratch under `/private/var/tmp/tortie-wt/scratch/r145/`:

- **Real agents, on his word of 14 November 2026**: "you can run real harnesses / claude code and codex to test the fix
  to issue 44". Claude Code 2.1.325, the reporter's 2.1.319 from its installed folder, and Codex 0.167.1 ran under his
  own sign-in, each as the pane's own command in a scratch tmux server on a socket under scratch. None ran on `-L gmux`
  or his default server. Only the agent had `HOME=/Users/gdc`; every other process had a scratch HOME. Claude ran with
  `--safe-mode --tools ""`, which runs no tool. Codex ran with `-s read-only -a never --no-daemon`, its shell tools off
  and `check_for_update_on_startup=false`. Each role answered Claude's folder question for its own scratch folder. 53
  real turns in all (section 12.4).
- **Scratch tmux**: the vendored 3.7b with a copy of `resources/gmux-tmux.conf`, Homebrew's 3.6a, and a plain or empty
  config where a layer had to be isolated.
- **Replays**: recorded pane bytes, written back at their recorded times and size into fresh scratch panes and into
  unopened `@xterm/xterm` 6.0.0 terminals made with the pane's own options, one layer at a time.
- **Five Electron runs**: three by the redraw investigator and two by the links investigator. Each went through
  `build/electron-run.mjs` inside `build/harness-socket.mjs`, with a scratch profile, HOME and socket, the probed agents
  hidden, under the shared lock. No real agent ran in the app. A stand-in program wrote the agents' recorded bytes into
  a session on the app's own scratch socket.
- **The writer** launched nothing. It read the eight reports and their records, the tree, tmux 3.7b's and xterm
  6.0.0's sources and the installed Gemini packages' `package.json` files, and wrote this document from the judge's
  ruling.

No role read his live profile, app.log, keychain, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` or any conversation
store. What the agents wrote there is theirs. `-L gmux` was named only by `build/electron-run.mjs`'s census, and the
app runs pointed `TMUX_TMPDIR` at scratch, so even that read nothing of his. No Tailscale, DNS, APNs, ssh host or
Simulator was used.

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `746290 1794669389` and
`23166 1790702242` when the first two roles started. At 10:38:04 the zsh history grew by 31 bytes, to
`746321 1794670684`, while the redraw and links investigators were running only file reads and writes, none of them
through a shell that keeps history. The redraw investigator stopped, waited three minutes and read it again unmoved.
From then until this writer's last read it read `746321 1794670684` and `23166 1790702242` before and after every
run, by every role. This document cannot say what wrote the one line at 10:38:04.

**Strays, disclosed.** Some first read-only commands, a few heredocs, `ps` and `kill` checks ran in a tool shell
beside `sandbox-exec` rather than under it. The agents adversary's drivers ran outside it because they need
`/bin/ps`, with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and `SHELL=/bin/sh`. None of those writes history.

- Two roles imported `withElectron` from `build/electron-run.mjs`, the one way to route an Electron through it.
- The redraw investigator wrote the hidden-agents overlay by hand rather than through `build/hidden-agents.mjs`. It
  also ran `npm run build`, which wrote only the ignored `out/`.
- The links investigator did not wait three minutes after the history move. It noticed nine minutes later, and the
  redraw investigator's wait covers the same window.
- The agents investigator deleted one Codex startup capture that showed a warning naming a setting from his own
  config, and reports nothing from it.
- Two stray processes were ended by pid after `ps -p` read their command lines: a deadlocked replay driver and its
  tmux server, and an early stand-in's scratch tmux server and writer.
- The task named `/private/tmp/tortie-ops/lock.sh`. It no longer exists. The roles that ran Electron used
  `/private/var/tmp/tortie-ops/lock.sh`, slot `electron.lock2`, released each time.

**How claims are cited.** Every claim about Tortie is a `file:line` in the tree at `8645875e`. Every claim about tmux
is a line of the vendored source under `build/vendor/tmux/work/tmux-3.7b/`, and about xterm a line under
`node_modules/@xterm/xterm/src/`. Every other agent was read from its installed package as text and never run. Each
finding is marked **MEASURED**, **READ** or **INFERRED**.

**The round.** Four investigators: the redraw, the copy, the links, and every agent against all three. Each had an
adversary, who attacked it by running rather than reading. A judge ruled on every disagreement and settled two by
reading source: what copy mode does to the wrap mark (section 4.3), and which Gemini packages are installed
(section 7). This document is that ruling.

**The question.** GitHub issue 44, opened 8 November 2026: "Long Claude Code reply redraws as overlapping text; copying
a wrapped line inserts line breaks". Tortie 0.114.1, sessions in the bundled tmux, Claude Code 2.1.319, Codex
0.166.0, macOS 15 and zsh. A long Markdown reply rendered its top "with two frames composited", a line reading
`Tomorrow:athe-Riverbend…`, the lower part clean, and Ctrl+L in Claude Code worked around it. A long shell command
wrapped over three rows pasted as three commands, so the shell ran the first and then tried
`--force-with-lease=…` as a command. The reporter's comment of 10 November added a third: Claude Code's links are not
clickable, because the private server lacks tmux's `hyperlinks` feature. He asked for a diagnosis, and whether the
fix serves the other agents Tortie runs, so that a phase can be queued.

## 1. The answer first

**Symptom 1, the overlapping redraw.** Claude Code's inline renderer, the one Tortie launches it in
(`CLAUDE_INLINE_ENV`, `src/main/agents/registry.ts:666`), moves its cursor by relative steps and writes only the cells
it believes changed since its last frame. It jumps over the spaces between words instead of writing them. When the
rows under it are no longer the rows it remembers, the old letters stay in the gaps it jumps over. That is
`Tomorrow:athe-Riverbend` exactly, and it was reproduced. Two things Tortie owns make the rows differ, and one
Anthropic owns:

1. **A size change while Claude draws.** tmux moves the pane's rows the moment the size changes, but tells the program
   the second and later sizes of a burst up to 250 ms later. For that time Claude draws onto rows that have moved.
   Tortie sends sizes it does not need to:
   - every tab attaches its client at 80 by 24 and fits it a moment later. The app on this Mac won that race in 27 of
     27 returns, and it is lost whenever the fit is more than a few milliseconds late;
   - every session is created at 80 by 24;
   - every layout change goes to tmux at once.

   Claude's recorded reply, played back by a program that does not react, turned into the exact signature in the real
   app when the pane was made 5 rows shorter for 8 ms (`7. Includeaamsmallatrashibag,ohand…`). Real Claude does react,
   so with it the signature came in 2 rows of 1 run in 10. What every size change did reliably with real Claude was
   duplicate, lose or cut rows of the reply in the scrollback.
2. **Emoji widths.** Tortie's terminal counts 9,498 characters one cell wide that tmux draws two wide, every emoji
   among them. On the bundled tmux 3.7b, which redraws the whole pane when a frame closes, that shifts the rest of each
   emoji row one cell left and leaves a stale letter at the row's end. On a tmux older than 3.7, tmux passes Claude's
   partial frames straight through, and Claude's own emoji reply showed the reporter's exact pattern in 118 of 177
   readings: `6. 📝oJot downrtrail notns:twhat worked`. Tortie meets an older tmux on any other machine whose tmux is
   3.2a to 3.6b, and on this Mac in a server still running from before Tortie shipped its own.
3. **Claude's own renderer** leaves old layouts of a block taller than the pane in the scrollback with no size change
   at all. Ctrl+L repaints only the visible rows and never repairs scrollback.

Which of the two Tortie causes the reporter met is not settled. It depends on whether the reply held emoji, what tmux
their server runs, and whether the pane changed size mid-reply (section 9). One build phase fixes both.

**Symptom 2, the copy.** Claude Code and Codex break long lines themselves before the terminal sees them. tmux marked
0 of Claude's rows as wrapped at a steady width, so `capture-pane -J` and xterm's wrap flag have nothing to join, and
the row-fills rule joins the wrong rows. Every join rule measured over their real rows makes some real command wrong.
The agent's own copy is exact: Claude's `/copy` gave the command on one line. Tortie does own three smaller copy
defects:

- after the pane narrows, Copy carries cells nobody can see, which put another paragraph's Chinese text inside a
  command;
- a selection made while scrolled back drops the wraps tmux holds, so a Codex URL came out as two lines in 6 of 6
  views, although a drag that scrolls keeps them;
- copied lines end in blanks a terminal with no tmux would not hold.

**Symptom 3, links.** The reporter is right about tmux. Claude Code and Codex both send real links (OSC 8) in a
Tortie pane. tmux keeps them and strips them before Tortie's terminal, because Tortie's client lacks the `hyperlinks`
feature. For Claude that loses the address entirely, because it draws a Markdown link's words only. One client flag on
Tortie's own attach, `-T hyperlinks`, forwards them on 3.6a and 3.7b with no server option. It must land with a link
handler. Without one, a click shows xterm's own "Do you want to navigate" question and then opens nothing.

**The other agents.** Every fix Tortie can make is its own and works whatever the agent:

- **Fewer size changes** spare Codex, pi, omp, cursor, muse and Gemini a full redraw each time. cursor keeps only its
  last 10 turns after each one.
- **tmux's widths** serve anything that prints emoji, the shell included.
- **The copy fixes** serve the shell and Codex most.
- **Links** become clickable for Claude, Codex and cursor, which send them today, and for pi while any tab is showing
  a terminal. pi then hides the address text, so a hover must show it. They probably do for muse, grok and
  Antigravity too.
- **No effect.** Gemini, Qwen, deepseek and omp send no links in Tortie and will not. Qwen, deepseek, Antigravity and
  opencode run full screen and keep no tmux history, so they cannot leave old frames there.

What to do, in order:

1. **Reply to the reporter now** (section 11, question 1): Claude's `/copy` for commands, and two facts we need from
   them.
2. **Queue one build phase, 368, in three parts** (section 10). The redraw part: attach and create at the size the
   pane will show, no size Tortie does not need, tmux's widths in Tortie's terminal, and a scrollback that never holds a
   half-drawn frame. The copy part: copy what is drawn, and copy a scrolled-back selection the way tmux joins it. The
   links part: forward them, and open them with a handler.
3. **Report upstream on his word**: Claude's renderer and its resize handler to Anthropic, and Codex's partial link
   targets to OpenAI.

The findings that change what gets built:

- **The width fix needs no new dependency.** Tortie already holds tmux 3.7b's measured width table and its joining
  rules for the phone (`src/main/screen/cell-widths.ts:1-35`, `cells.ts`). A Unicode 11 addon would still differ from
  tmux on 84 of 281 measured sequences.
- **The reporter's server option is the wrong spelling.** `set -as terminal-features` grows by one element on every
  re-assert and can never read back equal. The client flag needs no server option at all, and an indexed element
  `terminal-features[99]` works if a server option is wanted.
- **"Copy as one line" makes commands wrong.** It turns Codex's `acme-` / `platform` into two arguments and destroys
  real multi-line code in 12 of 12 cases.
- **Spawning at the fitted size is not enough alone.** Every session is also created at 80 by 24, so its first attach
  is always one resize. A restored Claude was left with items 10 to 12 twice.

## 2. What was measured, by method

### 2.1 Real agents in scratch tmux

Each role recorded the pane's bytes with `tmux pipe-pane` or a node-pty logger, and read the grid with
`capture-pane -p -e -F -N -S - -E -` at marks. Prompts asked for long Markdown with headings, numbered steps, emoji,
fenced code holding one shell command over 200 characters, prose past the width, and links. Most panes were 100 to
140 columns, some only 10 rows tall, and one was narrowed to 45 columns. The adversaries used prompts and sizes of
their own, and the agents adversary ran the reporter's own
Claude 2.1.319. Size changes were made with `resize-window`, with an attach client resized after a set delay, or by
killing and respawning the client the way a Tortie tab switch does (`src/main/attach/attach-host.ts:475`).

### 2.2 Replays, one layer at a time

The same recorded bytes went three ways:

- straight into an unopened xterm 6.0.0 with no tmux, to tell Claude's own output from tmux's emulation;
- through a scratch tmux into a node-pty client that answers tmux's queries as xterm.js does, fed to an xterm with
  Tortie's options, to compare tmux's grid with what the terminal holds, cell by cell;
- stepped through tmux one recorded read at a time, to read the terminal after every partial frame.

A clean recording replayed this way matched the live run exactly: 322 frames, 0 lasting differences, 87 of 87 rows.

### 2.3 The real app, by record and replay

A real agent needs his HOME, which the app must not have, so the app ran on a scratch HOME. A stand-in program
replayed Claude's and Codex's recorded bytes at their recorded times and size into a session on the app's own scratch
socket. The redraw investigator's runs (`app/run-93798`, `run-16357`, `run-1760`) drove tab and project switches, a
census of 54 steps, and a viewport made 5 rows shorter for 8 ms and 60 ms mid-reply. The links investigator's runs
(`app/run-31747`, `run2-65410`) read xterm's link providers and links. In those runs `window.open` and
`window.confirm` were wrapped so no address left the page.

### 2.4 Reading

tmux 3.7b's source, xterm 6.0.0's source, the Claude Code binaries for 2.1.319 and 2.1.325 read as text at named
offsets, Codex's source in his clone, and every other agent's installed package, read as text and never run. The
committed screens under `build/fixtures/**` hold no OSC sequence (0 of 194 files) and no wrap marks, by construction.

## 3. Symptom 1: the reply drawn over itself

### 3.1 What the signature is

`Tomorrow:athe-Riverbend` is `Tomorrow: the Riverbend` with an `a` in the first gap and a `-` in the second. Claude
draws word gaps as cursor jumps: 1,697 `CSI n G` against 659 spaces in one reply (MEASURED). It moves vertically by
relative steps (234 `CUU` and 513 `CUD` in one reply, no `CUP`) and writes only what changed since its last frame
(READ, the classic renderer near offset 296578170 of the 2.1.325 binary). So a new row written onto a row that holds
other text keeps the other text's letters wherever the new row has a gap. The gaps of a fresh row are never written,
because Claude believes them blank. Anything that moves the rows under Claude, or makes the terminal hold different
cells from tmux, produces this pattern.

### 3.2 Cause (a): a size change while Claude draws

**What tmux does.** READ:

- `window.c:1192-1213`: the grid is resized at once, and reflowed on the normal screen only.
- `screen.c:394-474`: shrinking deletes rows below the cursor and pushes top rows into history. Growing pulls them
  back.
- `server-client.c:1589-1655`: the first size of a burst reaches the program at once. Any later size waits for a
  250 ms timer, and a burst that ends where it began is sent as its last-but-one size, then the final size 10 ms later.
- `window.c:1192-1218`: a resize also ends a frame the program had open.

MEASURED (redraw investigator, `bin/seq-test.mjs`): an 80 by 24 transient reached the program at +1 ms and its return
at +253 ms. A pair made while the timer ran reached it at +252 and +264 ms. After a 30-24-30 row transient, history
went from 35 to 32 rows and the cursor from row 26 to 29, so the content moved down three rows.

**What Claude does.** READ, the same text in 2.1.319 (offset 276955323) and 2.1.325 (296648668):
`handleResize=()=>{if(!this.syncTerminalSize())return;…`. It returns early when the size it reads has not changed. Its
writer clamps vertical moves to the screen height less one, and its full reset clears only the visible rows, with no
`CSI 3J`. INFERRED: a program that reads its size after both halves of a 10 ms pair sees no change and never repaints,
which would leave damage on the visible screen until Ctrl+L. Real Claude caught 4 of 4 pairs in the one run that
looked for this.

**The signature from it.** MEASURED:

| Mid-reply, Claude's recorded bytes replayed by a program that does not react, tmux 3.7b unless named | Rows garbled | Rows lost |
| --- | --- | --- |
| 80 by 24 for 10 ms, then back | 2 | 5 |
| Height only, 120 by 24 | 2 | 5 |
| Width only, 80 by 30 | 0 | 0 |
| Re-attach at 80 by 24, fitted 30 ms later | 2 | 5 |
| The same on Homebrew's 3.6a | 2 | 5 |
| Re-attach at the fitted size | 0 | 0 |
| Re-attach at 80 by 24 under `window-size manual` | 0 | 0 |

In the real app, with the stand-in replaying Claude's reply, the window's viewport made 5 rows shorter for 8 ms or
60 ms mid-reply left the same garbled rows in both arms (`app/run-1760`). One was
`7. Includeaamsmallatrashibag,ohand sanitizer,randeaotrowelksoayouecannfolloweleave-no-tracetpracticesgproperly windy`
where the control arm holds `7. Include a small trash bag, hand sanitizer, and a trowel…`. The control had 0 garbled
and 0 lost.

**With real Claude it is rarer, and something else is reliable.** MEASURED over ten real Claude transcripts from two
roles, with a detector of the adversary's own: letters-only runs of 15 or more not in `/usr/share/dict/words`, or a
rule glyph between letters. Only the redraw investigator's c3 held the signature, in two rows:

- `3. Runrtheitestrsuite locallyland confirm everything passes.`;
- `──5.─Delete─merged─local─branches…`, the prompt box's rule drawn through a list row.

An exact repeat at the same size, version, config and resize sequence held none (a7). INFERRED: real Claude learns of
the size within 250 ms and repaints its visible rows, so only rows that scroll off in between keep the damage. What
every resize shape did reliably with real Claude was row-level damage in the scrollback:

| Run (real Claude) | What changed | Letter rows | Row damage |
| --- | --- | --- | --- |
| a2, 2.1.325 | three single permanent resizes | 0 | 5 steps duplicated, at two widths |
| a4 | three drags, a size every 16 ms | 0 | B01 and B02 four times, F06 twice, one row cut |
| a5 | four re-attaches, fitted after 12 to 20 ms | 0 | 12 steps duplicated, one row cut at 80 columns |
| a6 | the c3 shape on Homebrew 3.6a, empty config | 0 | 2 lost, 3 duplicated |
| t3, 2.1.319 | four tab switches mid-reply, fitted after 15 ms | 0 | 13 of 21 starts duplicated, up to 4 copies; rows cut mid-word |
| t5, 2.1.319 | four switches mid-reply, another prompt, the client sized at spawn | 0 | none: 0 repaints at any attach |

Ctrl+L left the scrollback byte-identical in every run that tried it (section 3.5).

**Where Tortie sends sizes.** READ, then MEASURED:

- **Every attach spawns its client at 80 by 24.** `src/main/sessions/core.ts:3974-3979` passes no size, so
  `attach-host.ts:107-108` and `:263-266` spawn at 80 by 24. The renderer fits, attaches, then pushes the fitted size
  (`src/renderer/terminal/TerminalPane.tsx:589-597`). `sessions:attach` carries a session id only
  (`src/shared/ipc/base.ts:48`), though the host's request already has `cols` and `rows` (`attach-host.ts:199-201`).
  - In tmux, when the fit came 0 to 2 ms after the spawn, 80 by 24 never reached the pane, in either rig. With the fit
    5 to 15 ms late it began to, the threshold differing between the two rigs, and 30 ms late it always did. When the
    race is lost, the program believes 80 by 24 for about 250 ms. The grid itself goes back at once (a5:
    `#{pane_width}` read 100 at every 100 ms snapshot while Claude drew 80-column frames).
  - In the real app on this Mac, tab and project switching made no size change at all, in 27 returns of 27.
  - When the race was lost with real Claude, a second copy of the reply landed in the scrollback (t3, mid-reply), and
    of the conversation at idle (i325a). Sized at spawn, none did (t5, i325b).
- **Every session is created at 80 by 24.** `src/main/tmux/sessions.ts:186` passes no `-x` or `-y`, and tmux's
  `default-size` is 80x24 (`options-table.c:610-616`). The first attach is therefore always one resize, whatever the
  attach does. A Claude resumed at 80 columns and then repainted at the fitted width left items 10 to 12 twice (cold1,
  no turn).
- **Every layout change goes to tmux at once.** A `ResizeObserver` fits on the next animation frame
  (`TerminalPane.tsx:523-525`), and xterm's resize goes straight to tmux (`:468-472`). An 8 ms change reached the pane.
- Tortie's config leaves `window-size` at `latest` (`options-table.c:1537-1543`), and control clients do not count
  toward it (`resize.c:69-96`).

Which Tortie surface, if any, makes a transient size on its own was not settled. Only tab and project switches were
counted.

### 3.3 Cause (b): emoji widths

**The mismatch.** READ: Tortie's terminal uses xterm's own Unicode 6 widths. `TerminalPane.tsx:254-275` sets no
Unicode version, `package.json:360-363` lists no Unicode addon, and xterm ships only
`common/input/UnicodeV6.ts`. tmux 3.7b draws with utf8proc and with `variation-selector-always-wide` on by default
(`options-table.c:550-556`).

MEASURED against the committed `build/fixtures/screen/tmux-widths.json` and `tmux-sequences.json`: tmux draws 9,498
code points two cells wide that Tortie's terminal counts one. 94 of the 281 measured sequences differ, among them
every emoji tested: 13 in one rig, 17 of 59 glyphs in another, including ✅ ❌ ⚡ ✨ 🚀 📝 🔧 🧠 and every VS16
sequence such as ⚠️ ℹ️ ✔️ ⚙️. None of the agents' own interface glyphs differ (⏺ ✻ ⎿ ❯ ● ─ │ ›).

Claude and Codex both agree with tmux. Their grids line up with tmux's at 48 of 48 steps (Codex) and over Claude's
emoji reply, so the terminal is the odd one out. Turning `variation-selector-always-wide` off instead would break both
agents: fed through a narrow-width grid model, Claude's own bytes left `7. 🔋 Recharge the powert bank` in a complete
frame (MEASURED, model only).

**On the bundled 3.7b.** READ: tmux holds a program's frame until it closes and then redraws the whole pane
(`input.c:1956-1960`; `CHANGES:3`: "Fix so that the end of a synchronized update again triggers a redraw"). So the
terminal never sees half a frame, and the mismatch shows only as a shift. MEASURED:

- the rest of every emoji row is drawn one cell left, and a stale cell is left at the row's end. Real Claude 2.1.325
  (t7) left `…keep a plastic bag in the daypack soo` where tmux holds `…so`, and `…before the bus and bringg`. A footer
  `…put 8 to 12   · /effort` was held for 4.8 s (c4).
- over Claude's emoji reply, the terminal differed from tmux's grid in 2,811 row readings with today's widths, and in
  204 with tmux's widths. A reply with no emoji gives 294 either way.
- Ctrl+L did not repair t7's two rows. A re-attach did.

**On a tmux older than 3.7.** READ: application sync arrived in 3.7 (`CHANGES:292`). Before it tmux forwards every
partial update, and only the cells its own grid changed, so a cell the terminal holds wrong is never corrected.
MEASURED: Claude's emoji reply, stepped through Homebrew's 3.6a with Tortie's config, showed mid-row damage in 118 of
177 readings, 1 to 9 rows each, between 6.2 s and 57.5 s:

- `6. 📝oJot downrtrail notns:twhat worked` where tmux holds `6. 📝 Jot down trail notes: what worked`;
- `Recharge the powertbank, headlxam, and camera battetres`;
- rows with no emoji are hit too.

The same stream through 3.7b showed none.

Who runs a server older than 3.7:

- every session on another machine whose tmux is 3.2a to 3.6b. Tortie tests nine far versions, 3.2a to 3.7c
  (`src/main/tmux/version.ts:214-417`).
- on this Mac, a server still running from before Tortie shipped its own tmux. The tested pair is a 3.6a server with
  the 3.7b client (`build/tmux-release.json:5`, `version.ts:112-114`), and a warm server is kept across an update
  (`src/main/tmux/supervisor.ts:519-537`).

**Outside a frame, even on 3.7b.** A program that writes cells outside a synchronized frame gets partial updates on
3.7b too. A stand-in's cell written at an absolute column after an emoji read `A✅BCDqqGHIJ` in the terminal where
tmux holds `A✅BCqqFGHIJ` (MEASURED). Claude and Codex put almost everything inside frames: in one Claude reply, only
2,512 of 57,606 bytes were outside, its banner.

**The phone already draws tmux's widths** (Phase 337, `src/main/screen/cell-widths.ts:1-35`). The Mac's terminal is
the one surface that does not.

### 3.4 Claude's own renderer, with no size change

MEASURED:

- a reply holding one 45-row table, in a 100 by 30 pane, left the table in 7 different layouts in the scrollback, with
  steps 9 and 10 twice. Claude moved up at most 29 rows, and sent `CSI 3J` 0 times.
- a plain long reply left one row duplicated and the `Evening wrap-up` heading lost (c1). Another left one code row and
  one rule duplicated (c8). A 10-row pane composited the echo of the prompt (t8).
- the same bytes in an xterm with no tmux gave the same rows: 138 of 138, 163 of 163 and 213 of 213.

So this damage is Claude's, not tmux's or Tortie's, and only Anthropic can fix it. A plain long reply in a tall pane
was clean (cl-in1, 167 rows).

### 3.5 What Ctrl+L does

MEASURED:

- Claude's Ctrl+L is `ESC[H`, then `ESC[2K` on each visible row, then a repaint of those rows.
- tmux's scrollback was byte-identical before and after in every run: 6 of 6 for one role, and 211 rows, 87 of 87,
  183 of 183 and 124 of 124 in others.
- Codex's Ctrl+L empties the scrollback (255 lines to 1, 214 to 25, 219 to 1).

So Ctrl+L can only clear rows on the visible screen. INFERRED: what it cleared for the reporter was on the visible
screen, which fits cause (b) on a server older than 3.7, or cause (a) if Claude missed a size change. Or the reporter
was scrolled back. In Tortie any keystroke first returns a scrolled-back reader to live output (`TerminalPane.tsx`,
"Typing ALWAYS returns to live output first"), which hides the scrollback rather than repairing it.

### 3.6 Scrolling while a reply renders

Tortie's scrollback is tmux copy mode, which copies the pane as it stands at entry (`src/main/tmux/scroll.ts:976`).
MEASURED: three entries placed inside an open frame each froze one half-drawn row in the scrolled-back view, a rule
where the prompt sits and a step cut short. That is row damage, not letters. Claude's frames stay open up to 451 ms
(c1) and 651 ms (c8), and a reply sits half-drawn 0.08 to 2.3 percent of its time. tmux 3.7b reports
`#{synchronized_output_flag}` (`format.c:2011-2020`, `:3644-3645`), and Tortie already re-freezes a view in place on
3.7b (`refreeze`, `scroll.ts:368`).

## 4. Symptom 2: the copy that breaks a line

### 4.1 Who breaks the line

MEASURED:

- **Claude.** At a steady width it marks no row wrapped: 0 of 116 rows at 120 columns, 0 of 97 at 140, 0 of 120 at
  100, 0 of 168 at 100 and 0 of 92 at 60, inline and full screen. Its 331-character command was 3 rows at 120 columns
  (117, 120 and 98 cells) and 5 at 90, with `  git push` alone on the first. Continuation rows are indented two
  spaces. A token longer than the space left is cut at the last column.
- **Codex.** It breaks prose and code itself, inside a path after a `-` too (`…/projects/acme-` then
  `platform/build/…`). It leaves only a bare URL wider than the pane to the terminal: 1 of 109 rows marked at 140
  columns, 5 of 122 at 60.
- **No tmux.** Replayed into an xterm with no tmux, the same bytes give 0 rows `isWrapped`: 139 for Claude, 178 for
  Codex. A plain terminal shows the same breaks.
- **The reporter's failure.** Pasting the 90-column copy runs `git push`, then `--force-with-lease=origin/…` as a
  command, which zsh reports as "no such file or directory".

After a narrowing, tmux does mark rows. Its reflow made 49 of 202 of Claude's rows wrapped at 90, 54 of 202 at 96 and
84 of 268 at 64. Codex clears and redraws at the new width, so it gains none. This fits research 107's 17.3 percent of
Claude rows joined by `-J` in his live panes against 6 of 8,096 Codex rows
(`docs/research/107-phase-245-clickable-paths.md:282-284`) (INFERRED).

### 4.2 What Tortie's Copy does

READ:

- **On screen**, a selection is `term.getSelection()` (`src/renderer/terminal/capture/index.ts:286-296`), which joins
  only rows xterm marked wrapped.
- **A drag that scrolled** is held as history positions and composed from the server with `-J`
  (`history-selection.ts:73-79`, `history-copy.ts:182-215`, `src/main/capture/service.ts:157-159`).
- **The "no -J" note** the reporter read (`src/main/capture/ipc.ts:9`) describes Capture Last N Lines
  (`service.ts:149-163`) and is stale for the range read.

So for the reporter's command `-J` changes nothing: there is no mark to join. Their second claim, that rows tmux draws
are never marked wrapped, is also wrong. On the live screen xterm's flag matched tmux's mark on 14 of 14 rows of a
shell-style program, and on 24 of 24 rows of Codex at 60 columns, all five URL continuations included (MEASURED).

### 4.3 Three defects Tortie does own

**1. After a narrowing, Copy carries cells nobody can see.** READ: a tmux client draws in xterm's alternate buffer,
which has no scrollback, so xterm neither reflows nor trims its rows when the width shrinks (`Buffer.ts:248-257`,
`:296-302`). `getSelection` reads the first and middle rows of a selection to their own length (`BufferLine.ts:524-529`,
`SelectionService.ts:228-252`).

MEASURED in the shipping xterm, fed through Tortie's attach shape, but not in the Electron app:

- after 140 to 96 columns on real Claude, 12 of 36 screen rows held cells past the width;
- a Copy of the reply's `rsync` command, taken in a scrolled-back view, held Chinese text from another paragraph after
  84 spaces, with a reflow break inside a token.

The path links already refuse such cells (`src/shared/path-spans.ts:63-66`, and rule J9 at `:101-107`). Copy, and
Copy as HTML (`capture/serialize.ts:318` bounds a row by its length), do not.

**2. A selection made while scrolled back drops the wraps tmux holds.** The judge settled this by reading:

- copy mode draws its own copy of the screen, row by row, and marks no row wrapped (`window-copy.c:4901-4987`);
- tmux lets the terminal wrap a row only when the row it draws is marked (`tty-draw.c:186-191`);
- xterm clears a row's flag only on an explicit line feed or an erase (`InputHandler.ts:731`, `:1156`, `:1170`), so a
  row copy mode redraws in place keeps whatever flag it had, and a row it scrolls into view has none.

That reconciles the two measurements, each true in its own condition:

- MEASURED: Codex's wrapped URL came out as 2 lines in 6 of 6 views scrolled with `scroll-up`, and whole through `-J`
  in 6 of 6. On the live screen and after a fresh attach it was whole.
- MEASURED: a shell-style program's flags survived copy mode entered without scrolling (14 of 14). After a narrowing,
  2 of 14 flags were wrong.

In Tortie every row above the live screen is seen through copy mode. Today the same rows therefore copy differently
depending on whether the drag scrolled.

**3. Trailing blanks.** READ: tmux draws runs of fewer than 10 blank cells as real spaces (`tty-draw.c:46-91`,
`:243-249`). xterm keeps them, because a written space has content. MEASURED: copies ended lines with up to 4 spaces
on 3.7b (`origin` and then 4 spaces, at 90 columns) and up to 81 on 3.6a, where a terminal with no tmux holds none.
The history path keeps them too, because `-J` keeps trailing spaces (`cmd-capture-pane.c:237-240`).

### 4.4 The agent's own copy is exact

MEASURED:

- **Claude's `/copy`.** It opened a picker listing "Full response 5525 chars · 75 lines" and each code block. Enter
  gave a stand-in `pbcopy` 5,869 bytes of Markdown with the command on one line, identical to what was asked. A second
  role's two runs gave 4,631 and 4,761 bytes, with the paths command and the long token each whole.
- **Claude full screen** (`CLAUDE_CODE_NO_FLICKER=1`, not Tortie's launch). It copies on select, joining its own soft
  rows: 331 characters on one line. Its screen buffer keeps a soft-wrap flag per row (READ).
- **Codex's `/copy`** copies the last response only (READ). It was not run, because it writes the Mac's clipboard
  natively.
- **Every other agent** ships a copy of its own (READ, section 7).

They also send OSC 52. Claude's one 7,835-byte OSC 52 reached the attach client through `allow-passthrough on`
(`resources/gmux-tmux.conf:18`). Tortie's terminal drops it: xterm handles OSC 0, 1, 2, 4, 8, 10, 11, 12, 104, 110, 111
and 112 (`InputHandler.ts:292-331`), and nothing under `src/` registers 52. OSC 52 is the only way an agent's own copy
on another machine can reach this Mac's clipboard. muse and cursor send none.

### 4.5 Every join rule measured makes a real command wrong

MEASURED by the copy adversary: exact or indentation-only targets, at a steady width. Its targets were a one-line
`rsync`, a backslash continuation over three lines, two separate commands, a 164-character token, a 156-character URL,
a command in inline code, and prose, a table and Chinese text.

| Rule | Claude, 140 columns | Claude, 100 | Codex | How it fails |
| --- | --- | --- | --- | --- |
| Today | 2 of 11 | 2 of 11 | 2 of 6 | The agent's breaks become line breaks |
| One line: trim each row, join with a space | 5 of 11 | 5 of 11 | 1 of 6 | `acme- platform` (two arguments); `docker run --rm \ -v …`; `git fetch origin git status --short`, in 12 of 12 real multi-line blocks |
| Compose through tmux with `-J` | 2 of 11 | 2 of 11 | 3 of 6 | Exact only where tmux marked a wrap |
| Row fills the pane | 2 of 11 | 2 of 11 | 3 of 6 | Glues words at the edge (`sothe`, `bringabout`; 0 of 11 edge rows right in another rig) |
| Join when the next word could not have fitted | 10 of 11 | 8 of 11 | 4 of 6 | Cannot tell a word ending at the last column from a cut token |

The last rule is Phase 347's J3, which joins only behind a path door's own answer (`src/shared/path-spans.ts:93-95`).
For Copy nothing checks the result. A row that ends at the last column on a word boundary and one cut mid-token have
the same shape: Claude's rows 73 and 89 in one capture. A code block's continuation keeps the same indent as its first
row, so INFERRED: two genuine lines, the first long and the second starting with a long word, would paste as one
command. Its false-join rate over real code was not measured.

## 5. Symptom 3: links

### 5.1 tmux keeps links and strips them

READ:

- tmux writes a link to a client only through the `Hls` capability (`tty.c:2592-2607`).
- Only the `hyperlinks` feature adds `Hls` (`tty-features.c:96-109`).
- The default `xterm*` element of `terminal-features` has no such feature (`options-table.c:527-537`).

MEASURED on 3.6a and 3.7b, with Tortie's config and with an empty one, through clients that answer tmux's queries as
xterm.js does:

- Tortie's client reads `client_termfeatures=bpaste,ccolour,clipboard,cstyle,focus,RGB,title`.
- None of 10 test links reached it, and none of real Claude's. Their text did.
- tmux keeps every link in its grid: `capture-pane -F` marks the rows `H`, and `-e` carries them. It keeps at most 5,000
  across the server (`hyperlinks.c:43`, `:173`).
- It forwards every scheme unchanged (`javascript:`, `data:`, `file:`, `vscode:`, `mailto:`), strips control
  characters from an address, and drops one larger than its 1 MB input buffer.

### 5.2 For Claude that loses the address

READ, the same rule in 2.1.319 and 2.1.325: Claude sends links when `TERM_PROGRAM` is `tmux` and
`TERM_PROGRAM_VERSION` is 3.4 or later, which tmux sets in every pane (`environ.c:266`). A setting or `FORCE_HYPERLINK`
overrides that.

MEASURED:

- for a Markdown link Claude draws the words only. Today items such as "the notes file" or "see the key guide." show
  no address anywhere, and none can be clicked, copied or read.
- with `TERM_PROGRAM_VERSION=3.3a` or `FORCE_HYPERLINK=0`, it draws `words (address)` and sends no link. A far machine
  on tmux 3.3a shows Claude's addresses better than this Mac does today.

Codex always sends links and also draws `words (address)`, so today a click on its drawn address works through the
web-links reading (`TerminalPane.tsx:371-374`).

### 5.3 Two ways to forward them

Both MEASURED on 3.6a and 3.7b:

- **The client flag**, `-T hyperlinks` on Tortie's own attach. Real Claude's 16 of 16 links and Codex's 74 of 74
  reached that client. It needs no server option and keeps nothing in a warm server. It is parsed by the client
  (`tmux.c:457-458`, sent at `client.c:466`). An unknown feature name is ignored, but `-T nosuch,hyperlinks` lost
  `hyperlinks`, because an unknown name ends the parse.
- **A server element**, `set -s terminal-features[99] "xterm*:hyperlinks"`. It stays one element when set twice, reads
  back exactly with `show-options -sv terminal-features[99]`, and parses in the drift test's regex as name, scope and
  value (`src/main/tmux/__tests__/server-options.test.ts:37`). A client attached before it keeps its old features,
  because features are read only at attach (`tty-term.c:589-601`; `options.c:1180` has no branch for them). A new
  client then receives every link, including links already in the scrollback.

The reporter's `set -as terminal-features ',xterm*:hyperlinks'` adds a duplicate element on every re-assert. Its
read-back, one line per element, can never equal the wanted value (`src/main/machines/remote-server.ts:481-490`). The
drift test reads its scope as `-as`, which the row type does not allow (`src/main/tmux/server-options.ts:78`). A
whole-value row drops `clipboard`, `ccolour` and `cstyle`. Adding `Hls` through `terminal-overrides` took, but left
`hyperlinks` out of `client_termfeatures`, which pi reads.

### 5.4 Forwarding alone is worse than today

READ, and MEASURED in the app:

- Tortie sets no `linkHandler` (`TerminalPane.tsx:254-275`; no `linkHandler` or `registerOscHandler` anywhere under
  `src/renderer`).
- So xterm's default runs: a `confirm("Do you want to navigate to …?")`, then `window.open()` with no address
  (`OscLinkProvider.ts:114-128`). Main denies a window that is not http or https
  (`src/main/security/trusted-window.ts:60-65`, `:135-137`), so nothing opens. The console said "Opening link blocked
  as opener could not be cleared".
- xterm offers http and https targets only, unless `allowNonHttpProtocols` is set, and ignores an address `new URL`
  cannot parse, such as a relative one (`OscLinkProvider.ts:72-82`).
- Its link wins over the web-links reading on the same cells (`Linkifier.ts:153-173`). The app's providers read
  `["wt","v2","PathLinkProvider"]`, in that order.
- With the server element applied by hand and a re-attach, xterm registered 10 links for the test session, 4 for
  Claude and 7 for Codex. A test handler's hover, leave and activate received the full address.

### 5.5 What a handler must face

MEASURED:

- **Look-alike addresses.** tmux forwards a right-to-left override, a look-alike host (`аpple.com`, which parses to
  `xn--pple-43d.com`), `www.google.com@evil.example`, `https:example.com`, and addresses of 3,000 and 65,536 bytes.
- **Raw gate.** Main's gate is a raw-string pattern, `^https?:` (`trusted-window.ts:60`).
- **Words that are another address.** Claude drew `https://example.org/looks-safe` with a link to
  `https://example.com/really-elsewhere`. Today a click opens the words. With forwarding, the target.
- **A URL Claude cut across rows.** Today the web-links reading opens 114 of its 188 characters. The link's target is
  whole on both rows, with one id.
- **`Foo_(bar)`.** Today a click opens `https://en.wikipedia.org/wiki/Foo_`. The target is exact.
- **Codex's echo** of a person's own `[a](b)` text carries a broken target
  (`https://example.org/safe](https://example.com/actual-target)`). Today the first address opens.
- **Partial targets.** While streaming, Codex briefly links partial targets (`…/2026/11/14/a-`). The finished rows
  carry the whole address.

READ: xterm builds one link per row (`OscLinkProvider.ts:33-106`), so a handler's `range` covers one row of a link
that wraps.

### 5.6 Which client answers an agent's question

READ: pi asks `tmux display-message -p '#{client_termfeatures}'` and turns links on only when it lists `hyperlinks`
(`pi-tui/dist/terminal-image.js:19-46`). It keeps the answer for the life of the process (`:5`, `:91-96`), and with
links on it draws no URL text (`components/markdown.js:532-535`).

MEASURED: when the pane's own session has no client, tmux answers for the best client of any session
(`cmd-find.c:113-117`, `cmd-display-message.c:119-122`). With only Tortie's control client attached, it answers
nothing. So pi's links depend on whether any Tortie tab was showing a terminal when pi first asked, not on its own
tab.

### 5.7 Passthrough, and the phone

- **Passthrough links already arrive today.** MEASURED: an OSC 8 wrapped for tmux's passthrough reaches the terminal
  through `allow-passthrough on`, whatever the features say. It is not in tmux's grid, so a redraw loses it.
- **Never force them.** READ: Qwen wraps links this way when `FORCE_HYPERLINK` forces them inside tmux
  (`chunk-O5BDEWBC.js`, `wrapForMultiplexer`). Tortie sets no `FORCE_HYPERLINK`; it sets only `LANG` and `PATH` in the
  server environment (`src/main/tmux/supervisor.ts:549`, `:577`).
- **The phone draws text only.** MEASURED: it draws a link's words with no address (`src/main/screen/sgr.ts:242-257`).
  Nothing here changes it.

## 6. The candidate fixes

| Fix | What it serves | What it costs | What it breaks or leaves | Evidence |
| --- | --- | --- | --- | --- |
| **A1.** Attach the client at the pane's fitted size | Every agent: no lost race, so no 80 by 24 step at a return | `sessions:attach` gains a size, the contract baseline moves; a pane with no size yet must wait for its first fit | Nothing measured. Does not cover a new session (A2) or a real resize | Sized at spawn: 0 repaints and 0 duplicates for Claude 2.1.319 and 2.1.325 and for Codex (t5, i325b, icxb), against 13 and 7 duplicated starts and 4 clear-and-replay pairs when fitted 15 ms late (MEASURED in tmux) |
| **A2.** Create a session at the size it will be shown | Every agent's first frame, and every restore | The create request, or main, must know the size; a phone-made or boot-time session takes the last one | Not measured | The defect (cold1, MEASURED); the fix INFERRED |
| **A3.** No size Tortie does not need | Every inline agent | A census first; each transient removed where it starts | A settle on a person's own drag would leave the terminal and tmux at different sizes for its length; not measured | 8 ms reaches tmux (MEASURED); which surface makes one on its own is not settled |
| **A4.** tmux's widths in Tortie's terminal | Anything that prints emoji; the exact signature on a server older than 3.7 | Tortie's own table moves to `src/shared/`, with its pins; xterm's provider API is marked experimental | A server on another tmux version differs on some code points (3.6a on 4,515, `cell-widths.ts:28-31`) | 2,811 to 204 row readings (MEASURED in replay) |
| **A5.** Re-freeze a scrolled-back view once the frame closes | Agents that draw in frames: Claude, Codex, pi, Gemini | One format read at entry; 3.7b only | Nothing measured | Three frozen half-drawn rows (MEASURED); the fix INFERRED |
| **B1.** Copy within the width, to the last drawn cell | Every agent and the shell | Copy, the menu's snapshot and Copy as HTML change; a deliberate trailing space is not kept | Nothing measured | 12 of 36 rows past the width (MEASURED, library) |
| **B2.** A scrolled-back selection composed from tmux, as a drag that scrolls already is | The shell, Codex's URLs, tmux's reflow rows | One read per copy; on another machine two `execOn` calls (`src/main/machines/remote-pane-history.ts:189-196`) | Not on the alternate screen, where `-J` glues unrelated text (research 142 §2.4); a stale mark joins wrongly there as it does today | 6 of 6 whole through `-J` (MEASURED) |
| **C1.** Forward links with `-T hyperlinks` on the attach | Claude, Codex, cursor, pi, and probably muse, grok, Antigravity | The attach argv and its goldens (`src/main/attach/__tests__/attach-plan.test.ts:92-260`); a far tmux below 3.2, where `-T` does not exist, would refuse the flag (INFERRED) | Pi hides URL text once links are on; must ship with C2 | 16 of 16 and 74 of 74 (MEASURED) |
| **C1′.** The server element `terminal-features[99]` | The same | A new `server-options.ts` row, its five pinned re-assert names (`server-options.test.ts:98-118`), `conformance:machines` rows, Phase 342's measurement on 3.2a to 3.7c | A client attached before it gets no links | MEASURED working on both builds |
| **C2.** A link handler | Every agent that sends links | `TerminalPane.tsx`'s options, a hover line, a refusal of a user part and of an address over 2,048 bytes, as the phone refuses (`ios/Tortie/Markdown/Caps.swift:98`) | Words that are another address need a rule (question 4) | Hover, leave and activate fire with the full address (MEASURED) |
| `FORCE_HYPERLINK=0` in Claude's launch | Claude's addresses as text, no hidden targets | His ruling, `conformance:agents` | Does not reach other machines; leaves cut URLs cut; the person's own Claude setting beats it | MEASURED (C3) |
| An OSC 52 handler | Every agent's own copy, from another machine too | Tier 3: any program in any session could write the clipboard; must refuse the read form, which Gemini sends, cap the size and say so | Writes twice on this Mac | READ |
| Claude full screen | Copy on select exact; no tmux history to composite | Reverses Phase 331 | Search, capture and Read last lines hold one screen | MEASURED (c5) |
| `window-size manual` and explicit sizing | Removes every resize Tortie did not ask for | Tortie must size every window itself | A missed size leaves a session stuck | Replay only |
| Copy as one line, or any join of an agent's own breaks | The reporter's command | | Wrong commands (section 4.5) | MEASURED, refused |

Only Anthropic can fix these:

- repaint on every size signal, even when the size reads unchanged, which is what tmux's two-step pair exists to force;
- redraw rows that have scrolled off, or clear and replay as Codex, pi and cursor do;
- write the spaces between words;
- send links only when the client can show them.

Only OpenAI can stop Codex linking partial targets while it streams.

## 7. The agent table

`(M)` measured, `(R)` read, `(I)` inferred. Launch and class are each row's compiled record in
`src/main/agents/registry.ts`. cursoride and copilotide are capture-only and never a pane (`registry.ts:2116-2150`).
Gemini is installed three times, as 0.54.0 (`~/.npm-global`, 6 August), 0.60.0 (`/usr/local`, 21 September) and 0.68.0
(nvm, 12 November). The judge read the three `package.json` files; which one Tortie runs depends on his login PATH,
which was not read.

### 7.1 Each agent against each symptom

| Agent: launch, class | Renderer, version read | Old frames in tmux history | Emoji widths | Who breaks long lines; its own copy | Links in a Tortie pane today |
| --- | --- | --- | --- | --- | --- |
| claude: env `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` (`:805`), switch-to-inline (`:838-850`) | Ink fork with a cell-diff screen, relative moves, frames; 2.1.319 and 2.1.325 (M, R) | Yes: at every size change, and with no size change when it re-lays out a block taller than the pane (M) | Agrees with tmux; Tortie's terminal does not: shift and stale cell on 3.7b, the signature on 3.6a (M) | Itself, 0 rows marked; tmux's reflow marks rows after a narrowing; `/copy` exact (M) | Sends them, words only, so the address is lost (M) |
| codex: argv `-c tui.fullscreen_transcript=false` (`:997`, `:1005`), switch-to-inline (`:1035-1045`) | ratatui and crossterm, absolute moves, scroll regions, frames; 0.167.1 (M, R) | No: clears screen and scrollback and replays at every size change; Ctrl+L empties it (M) | Agrees with tmux; stale cells at row ends on 3.7b (M); older servers (I) | Itself, after `-` in paths too; the terminal for a bare URL (M); `/copy`, last response only (R) | Sends them, words and `(address)` (M) |
| cursor: env `FORCE_COLOR=1` (`:899-901`), inline-already (`:930`) | Ink fork, 2026.09.28 (R) | No: clears and reprints its last 10 turns at every size change (R, `:930-935`) | Not measured (I: as any emoji) | Itself (R: Ink; 92 indented continuations in its screens); "Copy message", no OSC 52 (R) | Always, with a dim ` (url)` (R) |
| gemini: inline-already (`:1123-1131`) | Ink, `eraseLines`, frames (`?2026` 18 times); 0.54.0, 0.60.0, 0.68.0 (R) | Unlikely; misplaced lines rather than letters (I) | (I) | Itself (R: 4 and 4 continuations); `/copy`, OSC 52 and its read form (R) | None; draws `text (url)` (R) |
| qwen: fullscreen-with-mouse (`:1622-1630`) | Ink, Gemini's fork, 0.22.0 (R) | No history to keep them (I) | (I) | Itself (R: 16, 1 and 1); `/copy N`, OSC 52 (R) | None while `TMUX` is set (R) |
| pi: argv `--tui-mode regular` from 0.84.0 (`:1713-1726`), switch-to-inline | pi-tui 0.84.2, whole lines erased and rewritten in frames, full clear at a size change (R) | No letters; misplaced lines possible (I) | (I) | Itself (R: 2 and 14); "Copy last agent message", OSC 52 (R) | None: its probe finds no `hyperlinks` (R) |
| omp: inline-already (`:1809-1816`) | pi-tui lineage, 18.0.11; replays at a size change (R, research 134) | Unlikely (I) | (I) | Itself (I); `/copy [code\|cmd]`, OSC 52 (R) | None: needs a terminal it recognises (R) |
| muse: inline-already (`:1524-1531`) | ratatui, 1.4.18; replays at a size change (R, research 134) | Unlikely (I) | (I) | Itself (I); `pbcopy` or `wl-copy`, no OSC 52 (R) | A writer that probes clients and skips control clients (R) |
| grok: unknown (`:1950-1958`) | ratatui with `insert_before`, autowrap off, 1.0.77 (R) | Unknown | (I) | Itself, autowrap off (R); `/copy [N] [file]`, OSC 52 (R) | A writer that probes clients (R) |
| deepseek: fullscreen-with-mouse (`:1312-1320`) | ratatui, deepseek-tui 0.8.26 (R) | No history to keep them (I) | (I) | Itself (I); its copy not read | None (R) |
| antigravity: fullscreen-with-mouse (`:1437-1446`) | bubbletea and lipgloss (R) | No history to keep them (I) | (I) | Itself (R: 7 continuations); `/copy n`, OSC 52 (R) | A writer that probes clients (R) |
| opencode: fullscreen-with-mouse (`:2072-2080`) | opentui (R) | No history to keep them (I) | (I) | Itself (I); "Copy last assistant message", OSC 52 (R) | Strings present, not traced (R) |
| droid: unknown (`:1193-1199`) | Not installed | Unknown | Unknown | Unknown | Unknown |
| The plain shell, zsh | Writes in order, no frames (I) | No (I) | Shift and stale cell for emoji (I); letters after a cell update outside a frame (M, stand-in) | The terminal wraps program output, marked (M); zsh breaks a typed command itself (M, research 142 §2.4) | Some programs send `file://` links, which xterm does not offer (I) |

### 7.2 Which fix serves which agent

| Agent | A1 attach at the fitted size | A2 create at the shown size | A3 no needless size | A4 tmux's widths | A5 scrollback between frames | B1 copy what is drawn | B2 scrolled-back copy from tmux | C1 and C2 links |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude | No duplicated reply at a lost return (M in tmux) | No duplicated tail at a restore (defect M; fix I) | Fewer damaged rows (I) | Shift, stale cells and the 3.6a signature gone (M in replay; 3.6a I) | No frozen half-drawn rows (defect M; fix I) | No hidden text after a narrowing (M, library) | tmux's reflow rows whole (M) | Labels clickable, cut URLs whole (M forwarding; handler I) |
| codex | No transcript replay at a lost return (M in tmux) | One replay fewer (I) | Fewer replays (I) | No stale row ends (I) | (I) | Little: it clears at a size change (M) | Its URLs whole (M) | Clicks open the target; its echo needs question 4 (M) |
| cursor | Keeps its scrollback past 10 turns (I) | (I) | Fewer clears (I) | (I) | (I) | (I) | (I) | Clickable (I) |
| gemini | No redraw (I) | (I) | (I) | (I) | (I) | (I) | (I) | No change (R) |
| qwen | No repaint (I) | (I) | (I) | (I) | No history to scroll (I) | (I) | xterm's path kept on its alternate screen (R) | No change (R) |
| pi | No full redraw (I) | (I) | (I) | (I) | (I) | (I) | (I) | On while a tab shows a terminal at its first probe; URL text hidden, so hover must show it (R, I) |
| omp | No replay (I) | (I) | (I) | (I) | (I) | (I) | (I) | No change (R) |
| muse | No replay (I) | (I) | (I) | (I) | (I) | (I) | (I) | Probably on (I) |
| grok | (I) | (I) | (I) | (I) | (I) | (I) | (I) | Probably on (I) |
| deepseek | No repaint (I) | (I) | (I) | (I) | No history (I) | (I) | xterm's path kept (R) | No change (R) |
| antigravity | No repaint (I) | (I) | (I) | (I) | No history (I) | (I) | xterm's path kept (R) | Probably on (I) |
| opencode | No repaint (I) | (I) | (I) | (I) | No history (I) | (I) | xterm's path kept (R) | Not known |
| droid | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown |
| The plain shell | No reflow at a return (I) | (I) | (I) | Emoji drawn as tmux holds them (I) | Not applicable | (I) | Long output lines whole when scrolled back (M, stand-in) | Not applicable for `file://` (I) |

Every fix in 7.2 is Tortie's own and works whatever the agent. A row marked (I) is a claim about an agent nobody ran.
The build phase measures the two rows it can run, Claude and Codex, and reads every other row from its recordings.

## 8. What was ruled out, and how

| Claim | What killed it | Where it went |
| --- | --- | --- |
| tmux's emulation garbles Claude's reply | The same bytes in an xterm with no tmux give the same rows (138 of 138, 163 of 163, 213 of 213) | Ruled out |
| Tortie's tmux config causes it | The same damage on Homebrew's 3.6a with an empty config (a6, rp36) | Ruled out |
| The reporter's Claude 2.1.319 behaves differently | The same resize handler text; run, it duplicated on tab switches as 2.1.325 does (t2, t3) | Ruled out |
| Ctrl+L repairs the scrollback | Byte-identical before and after, in every run | Ruled out |
| `-J` rejoins the reporter's command | Claude marks 0 rows wrapped at a steady width | Ruled out |
| "Rows tmux draws are never marked wrapped" (the reporter) | Live, xterm's flag matched tmux's mark on 14 of 14 and 24 of 24 rows | Wrong; true only of a scrolled-back view |
| "The history path composes without `-J`" (the reporter) | `history-copy.ts:188-194`, `src/main/tmux/history-lines.ts:97-100` | Wrong for Copy; the note at `src/main/capture/ipc.ts:9` is stale |
| The row-fills rule rejoins it | Glues word wraps, inserts indents, joins the prompt box's rules | Refuted |
| Copy as one line | Codex 1 of 6; real multi-line code 0 of 12 | Refuted |
| "tmux never soft-wraps their rows" (the copy investigator) | Codex's bare URLs, and every row tmux reflows after a narrowing (49 of 202 in the investigator's own capture) | Corrected |
| "C4 has no effect on agent rows" | It makes Codex's URLs and Claude's reflow rows whole | Corrected; it is B2 |
| A Unicode 11 addon matches tmux | It differs on 84 of 281 measured sequences; ⚠️ 🏞️ 1️⃣ ➡️ ❄️ stay one cell | Refuted; Tortie's own table instead |
| Turn `variation-selector-always-wide` off | Both agents assume a VS16 sequence is two cells | Rejected |
| "I reproduced the reporter's exact signature" (the redraw investigator) | Real, but 2 rows in 1 run of 10; an exact repeat gave 0 | Held, as rare with real Claude |
| "Re-attach at the fitted size: 0 against 2 garbled" proves the cure | A program that never repaints; real Claude through lost races gave duplication, not letters | Corrected: A1 cures the duplication (M) |
| "The pane stays 80 by 24 for about 250 ms" | The grid returns at once; only the program believes 80 by 24 (a5) | Corrected |
| "Without tmux's delay no interleaving occurs" (c7) | One run with none cannot show it, when the rate with the delay is 1 run in 10 | Not supported |
| "Tortie causes a resize pair at every attach" (the agents investigator) | Only when the fit is a few milliseconds late; 27 of 27 returns in the app had none | Corrected |
| "A plain reply is clean" | A 10-row pane composited the prompt's echo (t8) | Corrected: clean in a tall pane |
| The reporter's `-as` append | Grows by one element per re-assert; never reads back; the drift test reads `-as` as the scope | Rejected for the client flag or `[99]` |
| `Hls` through `terminal-overrides` | `client_termfeatures` then lacks `hyperlinks`, which pi reads | Worse |
| An agent's link probe follows its own tab (the agents investigator) | tmux answers for the best client of any session (`cmd-find.c:113-117`, feat1) | Corrected |
| Confirm when a link's drawn text differs, read from `range` | `range` is one row of a wrapped link | Best effort only |
| Claude on another machine runs full screen | It runs its own default, which depends on the person's settings (research 134 §2) | Corrected |
| Gemini 0.60.0 and 0.54.0, or 0.68.0 and 0.60.0 | All three are installed (section 7) | Settled by reading |
| `capture-pane -e` carries "internal ids" | It carries the program's own id or none; only the client stream carries `id=tmuxN` | Corrected |

Held under attack: tmux's resize mechanism; Claude's early return on an unchanged size, in both versions; the
signature in the real app with a transient; Codex's clear and replay; Claude breaking its own lines; Claude's `/copy`;
OSC 52 dropped; links stripped and forwarded by either route; the default activate opening nothing.

## 9. What is not settled

- **Which cause the reporter met.** Three things decide it: whether their reply held emoji, what tmux their server
  runs, and whether the pane changed size mid-reply. Their machine and its load are unknown, and a lost attach race
  needs a fit that is late by a few milliseconds.
- **Whether real Claude ever misses a 10 ms pair.** That is the case that would leave damage on the visible screen
  until Ctrl+L. It caught 4 of 4.
- **Whether any Tortie surface makes a transient size on its own.** Only tab and project switches were counted. Window
  drags, splits, zoom and full screen were not driven in the app.
- **The fixes themselves.** A1 was measured in tmux, A4 in replay and B1 in the library. The link handler is not built.
  None was measured in the app with real bytes.
- **Every agent but Claude and Codex**, live: old frames, wrap marks, and whether they send links.
- **Older far tmux.** 3.2a to 3.5a for the client flag and the widths. The far attach's terminal type over ssh is
  INFERRED. tmux added OSC 8 in 3.4 and draws links in copy mode only from 3.5 (`CHANGES:601`, `:772`), so on a far 3.4
  a scrolled-back link may draw as text (INFERRED).
- **pi's timing.** Whether pi first asks before or after Tortie attaches.
- **Renderer memory.** Many large link targets: xterm keeps a link while any row marker lives
  (`OscLinkService.ts:30-100`), and its OSC limit is 10 MB.
- **Claude on 3.6a.** Why it left no stale cells after a narrowing.
- **The Mac's Catch Me Up.** It holds the agent's own text, but whether a copy from it keeps the lines was not
  measured.
- **His history.** What wrote the 31 bytes of zsh history at 10:38:04.

## 10. What it means for the build phase

One phase, 368, resolves issue 44 in three parts. It is Tier 3:

- it changes how every session is created and attached;
- it claims to serve every agent;
- the operator relayed a user's report;
- it hands addresses an agent printed to the person's browser.

**The redraw.** A1 and A2 take away the 80 by 24 steps for every agent. A3 starts with a count, at the parent, of the
sizes each surface sends, and removes every transient Tortie makes on its own. A person's own drag stays as today
unless a settled size measures no worse. A4 puts tmux's widths, from Tortie's own measured table, into all three
terminals the renderer builds (`TerminalPane.tsx:254`, `capture/history-copy.ts:107`, `capture/index.ts:722`). A
server on another version must draw no code point worse than today. A5 re-freezes a scrolled-back view once a frame
closes. None of this changes an agent's launch: Claude and Codex stay inline under Phase 331.

**The copy.** B1 bounds every copied row by the pane's width and ends it at its last drawn cell. B2 holds a
scrolled-back selection as history positions, so it is composed as a drag that scrolled already is. The alternate
screen keeps xterm's path. Nothing joins rows an agent broke itself. The reply to the reporter points to the agent's
own copy.

**The links.** C1 puts `-T hyperlinks` on the local attach (`src/main/attach/attach-plan.ts:160-169`). The far attach
gets it only for far versions the spec measures, so a far tmux older than 3.2 that a person accepted keeps today's
attach. C2 adds a handler:

- http and https only;
- a click takes the web-links route, so main's gate decides;
- a hover shows the address a click opens, with its host in ASCII;
- an address with a user part or over 2,048 bytes is not offered;
- where today's web-links reading finds an address on the clicked cell, a click opens what it opens today, unless the
  link's target is that address continued on the link's next row. That keeps every link that works today and adds
  the ones that do not. Question 4 is his choice.

**The proof** is the parent beside HEAD in one app run per build, with recorded real bytes. Real Claude Code and Codex
run in scratch tmux under his word of 14 November. The attack adds a loaded Mac, the loopback machine on 3.6a and 3.7b,
and hostile link targets. Every other agent is read from its recordings.

## 11. Questions for him

1. **Reply to the reporter now?** Recommended: yes. Here is a draft:

   > Thanks for the careful report. Copying: Claude Code breaks a long line itself when it draws it, so no terminal
   > can tell the rows were one line. Its own `/copy` copies the reply or one of its code blocks with the command
   > whole, and that works in Tortie today. The overlapping text: we reproduced it. It happens when the rows move
   > under Claude Code's renderer while it draws, and Tortie causes some of those moves. A fix is queued, together
   > with drawing emoji at the width tmux uses. Could you tell us what `#{version}` reads on Tortie's private server
   > (the one you read `terminal-features` from), and whether that reply had emoji in it? Links: you were right about
   > tmux. A fix is queued that forwards them and opens them on a click.

2. **One phase, 368, in its three parts, or three phases?** Recommended: one. One app run and one probe drive all
   three in a Claude and a Codex session.
3. **How links reach the terminal.** The attach's client flag, or the reporter's server option in its indexed form?
   Recommended: the client flag. It needs no server option, no re-assert, and no change to the drift test.
4. **A link whose words are an address and whose target is another.** Open the words, as today; open the target and
   show it on hover, as browsers and the Markdown preview do; or ask first, naming the target's host, as the phone
   does? Recommended: open the words. It keeps every link that works today, and his rule is that no scenario gets
   worse.
5. **Claude's addresses as plain text instead**, by `FORCE_HYPERLINK=0` in its launch? Recommended: no. The links
   become clickable, and the hover shows the address.
6. **Let an agent's own copy reach this Mac's clipboard (OSC 52)?** This is the only way for a session on another
   machine. Recommended: not in 368. It would be a Tier 3 phase of its own, because any program in any session could
   then write his clipboard.
7. **A "Copy as One Line" item?** Recommended: no. Every join rule measured makes some real command wrong without a
   sign.
8. **Claude full screen instead of inline**, for its exact copy-on-select? Recommended: no. Keep Phase 331.
9. **Report upstream?** Recommended: yes, on his word, as research 143's better-sqlite3 report was. Anthropic: repaint
   on every size signal, rows above the screen, links only for a client that shows them. OpenAI: partial link
   targets, and the echo's parse.

## 12. Evidence

### 12.1 Tortie at `8645875e`

- **Attach and create.** `src/main/sessions/core.ts:3974-3979` (attach, no size), `:806` (the local re-assert);
  `src/main/attach/attach-host.ts:107-108`, `:199-201`, `:263-279`, `:475`, `:572-578`;
  `src/main/attach/attach-plan.ts:156-186`; `src/shared/ipc/base.ts:48`; `src/preload/sessions.ts:21`;
  `src/main/ipc.ts:135`; `src/main/tmux/sessions.ts:186`; `src/main/sessions/create-local.ts:709`;
  `src/main/restore/restore.ts:1113`.
- **The pane.** `src/renderer/terminal/TerminalPane.tsx:254-275` (options), `:371-374` (web links), `:468-472`
  (resize), `:523-525` (fit), `:589-597` (attach then fit).
- **Copy.** `src/renderer/terminal/capture/index.ts:184-209`, `:260-297`, `:722`; `capture/history-selection.ts:73-79`;
  `capture/history-copy.ts:107`, `:127-146`, `:182-215`; `capture/serialize.ts:318`;
  `src/renderer/terminal/scroll/drag-select.ts:380`; `src/main/capture/ipc.ts:9`;
  `src/main/capture/service.ts:149-163`; `src/main/tmux/history-lines.ts:97-100`;
  `src/main/machines/remote-pane-history.ts:189-196`; `src/shared/path-spans.ts:63-107`.
- **tmux on this Mac.** `src/main/tmux/scroll.ts:368`, `:459-465`, `:976`; `src/main/tmux/server-options.ts:74-98`;
  `src/main/tmux/__tests__/server-options.test.ts:37`, `:98-118`; `src/main/tmux/version.ts:112-114`, `:214-417`;
  `src/main/tmux/supervisor.ts:519-537`, `:549`, `:577`; `src/main/machines/remote-server.ts:481-490`;
  `resources/gmux-tmux.conf:18`; `build/tmux-release.json:3`, `:5`.
- **Widths and links.** `src/main/screen/cell-widths.ts:1-35`; `src/main/screen/sgr.ts:242-257`;
  `src/main/security/trusted-window.ts:60-65`, `:135-137`; `src/renderer/editor/markdown/markdown-impl.tsx:244-258`;
  `ios/Tortie/Markdown/Caps.swift:98`; `package.json:360-363`.
- **The registry.** `src/main/agents/registry.ts:647`, `:666`, `:805`, `:838-850`, `:899-901`, `:930-935`, `:997`,
  `:1005`, `:1035-1045`, `:1123-1131`, `:1193-1199`, `:1312-1320`, `:1437-1446`, `:1524-1531`, `:1622-1630`,
  `:1713-1726`, `:1809-1816`, `:1950-1958`, `:2072-2080`, `:2116-2150`.

### 12.2 tmux 3.7b and xterm 6.0.0, as vendored and installed

- **tmux.** `window.c:1192-1218`; `screen.c:394-474`; `server-client.c:1589-1655`; `input.c:1956-1960`; `CHANGES:3`,
  `:292`, `:601`, `:772`; `options-table.c:508-516` (`set-clipboard` external), `:527-537`, `:550-556`, `:610-616`,
  `:1537-1545`; `resize.c:69-96`; `tty.c:2592-2607`; `tty-features.c:96-109`; `tty-draw.c:46-91`, `:186-191`,
  `:243-249`; `tty-term.c:589-601`; `options.c:1180`; `window-copy.c:4901-4987`; `cmd-capture-pane.c:232-240`;
  `cmd-find.c:113-117`; `cmd-display-message.c:119-122`; `hyperlinks.c:43`, `:173`; `format.c:2011-2020`,
  `:3644-3645`; `environ.c:266`; `tmux.c:457-458`; `client.c:466`; `tmux.h:3161`.
- **xterm.** `common/buffer/Buffer.ts:248-257`, `:296-302`; `common/buffer/BufferLine.ts:524-529`;
  `browser/services/SelectionService.ts:203-262`; `common/InputHandler.ts:292-331`, `:731`, `:1156`, `:1170`;
  `browser/OscLinkProvider.ts:33-128`; `browser/Linkifier.ts:153-173`; `browser/CoreBrowserTerminal.ts:160`;
  `common/services/OscLinkService.ts:30-100`; `common/input/UnicodeV6.ts`; `typings/xterm.d.ts:1867-1882` (the
  experimental Unicode provider); `addon-web-links/src/WebLinksAddon.ts:21`. `patches/@xterm+xterm+6.0.0.patch` only
  cancels a pending selection redraw on dispose.

### 12.3 The scratch folders, under `/private/var/tmp/tortie-wt/scratch/r145/`

- **The redraw investigator** (`redraw/`):
  - real runs `runs/c1` to `c8`, `i1`, `x1` and `x2`;
  - replays under `replays/`, analyses under `an/`;
  - the app runs `app/run-93798`, `run-16357` and `run-1760`;
  - the instruments in `bin/` (`seq-test.mjs`, `race.mjs`, `damage.mjs`, `client-widths.mjs`).
- **The redraw adversary** (`redraw-adv/`):
  - real runs `runs/a1` to `a7`;
  - stepped replays `replays/s1-c4-37b-copy` and `s3-c4-36a`;
  - `bin/stepped.mjs`, `steps-analyze.mjs`, `ledger-check.mjs`, `width-compare.mjs`, `midframe.mjs` and
    `agent-width-model.mjs`.
- **The copy investigator** (`copy/`):
  - `runs/cc-inline-120`, `cc-inline-90`, `cx-inline-120`, `cc-alt-120`, `cc-alt-drag2-120` and `standin-120`;
  - the stand-in `pbcopy` outputs beside them;
  - `bin/rig.mjs`, `xt.mjs` and the `an-*.mjs` analyses.
- **The copy adversary** (`adv-copy/`):
  - `runs/cc-37-gmux-140`, `cc-36-plainenv-100`, `cx-37-gmux-140` and `cx-36-plainenv-100`, each with
    `eval/results.json`;
  - `runs/st-36-100` and `st-37-70`;
  - `bin/eval.mjs`, `replay.mjs`, `t-stale.mjs` and `live-url.mjs`;
  - `cfg/truth.json`.
- **The links investigator** (`links/`):
  - `runs/vend37b-*`, `brew36a-*`, `arr-*`, `claude1` to `claude4` and `codex1`;
  - `app/run-31747` and `run2-65410`;
  - `tools/osc8-tmux.mjs`, `array-semantics.mjs`, `app-links.mjs` and `app-links2.mjs`;
  - `conf/gmux-tmux-links.conf`.
- **The links adversary** (`adv-links/`):
  - `runs/t1-*`, `t2-*`, `t3-vend`, `t4-vend`, `claude-c1`, `claude-c2-v33`, `claude-c3-fh0` and `codex-x1`;
  - `tools/t1-osc8.mjs`, `t2-dashT.mjs`, `t3-pi-topology.mjs` and `t4-hostile.mjs`.
- **The agents investigator** (`agents/`):
  - `runs/cl-in1` to `cl-in4`, `cl-fs1`, `cl-idle`, `cx-in1` to `cx-in4`, `cx-fs1`, `attach-size` and `feat-probe`;
  - `bin/drive.py`, `edge.py` and `rows.py`.
- **The agents adversary** (`adv-agents/`):
  - `runs/t1` to `t8`, `i325a`, `i325b`, `icxa`, `icxb`, `cold1`, `race1`, `wid1`, `wid2`, `wrap1`, `feat1`, `rp36`
    and `rp37`, with `runs/history-stats.log`;
  - `bin/drive.cjs`, `lockstep.cjs`, `xreplay.cjs`, `widths2.cjs` and `wrapflags.cjs`.

### 12.4 The real turns

| Role | Claude Code | Codex | Notes |
| --- | --- | --- | --- |
| Redraw investigator | 8 (c1 to c8) | 2 (x1, x2) | c6 had no `USER`, so Claude was not signed in and made no model call |
| Redraw adversary | 6 (a1, a2, a4 to a7) | 1 (a3) | Two launches stopped at the folder question; two Codex launches died at start without `node` on the server's PATH |
| Copy investigator | 6 | 1 | One launch chose "No, exit" at the folder question; `/copy` made no model call |
| Copy adversary | 2 | 2 | Claude also drew its own prompt suggestion |
| Links investigator | 2 | 1 | One was a 420 s loop in plan mode after a cut paste |
| Links adversary | 3 (C1 to C3) | 1 (X1) | |
| Agents investigator | 5 | 5 | Plus launches with no turn: `--continue` at idle, `--help`, `codex features` |
| Agents adversary | 7: 6 on 2.1.319, one refused by its safeguards, and 1 on 2.1.325 | 1 (t6) | Plus three `--continue` launches and three Codex starts with no turn |
| Judge and writer | 0 | 0 | |
| **All** | **39** | **14** | **53 turns**, each under his own sign-in: Claude with no tools, Codex read-only |

### 12.5 Commands the writer ran

Each ran under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` unless noted.

- `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, exit 0, at 13:20:06 and at 13:57:52: `746321 1794670684` and
  `23166 1790702242` both times.
- `git log`, `git show` and `git status` in the worktree, exit 0: `8645875e`, no changes before this file; the tmux pin
  `3.7b` since `2c225e46` (15 August 2026), with its tested pair a 3.6a server and a 3.7b client.
- `grep` and `sed` over the tree, the vendored tmux source, `node_modules/@xterm/xterm/src` and the scratch records,
  exit 0 each. Among them: `t7.out`, `t7/cap-scrolled-back/diff.json`, `run-1760/r145-F8.tmux.txt`, the two stepped
  replays' `summary.json` and `steps.jsonl`, and `adv-copy/bin/eval.mjs`.
- `grep -m1 '"version"'` over the three installed Gemini `package.json` files, exit 0: 0.60.0 (`/usr/local`), 0.68.0
  (nvm v22.23.1) and 0.54.0 (`~/.npm-global`).
- The Electron count, CLAUDE.md's command, with `/bin/ps` outside the sandbox because it is setuid, exit 0: his own
  Tortie (pid 94808) and its crash handler, and other apps' crash handlers. No process carried a `--user-data-dir`, and
  none was this round's.
- `python3 -I` over this document (`scratch/r145/judge/mdcheck.py`), exit 0: headings in order, every table row as
  wide as its header, backticks balanced, no line over 120 characters outside a table.
