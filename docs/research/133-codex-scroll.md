# 133. Codex 0.158 in Tortie: why the wheel walks its prompt history, and how it scrolls again

Phase 331's research. Written 2026-09-29 against the tree at `217f47e5` ("docs(backlog): the Funnel measurement
passed"). **Codex was never built or run from source.** His checkout of Codex, `/Users/gdc/codex` at `b1e72963c3`,
was read only. What ran was the real installed `codex-cli 0.158.0` on this Mac, always under a scratch `HOME` and a
scratch `CODEX_HOME` holding a dummy API key written by `codex login --with-api-key`, with `daemon_auto_start = false`
and `check_for_update_on_startup = false`. The adversary's approval arms also pointed Codex at a local mock
Responses server on `127.0.0.1` inside the arm's own process. **No model turn was spent and no token was used**, and
every Codex session record went to a scratch store. His `~/.codex/auth.json`, his Codex session store, his keychain,
his Claude directories and his APNs key were never read. His `~/.codex/config.toml` was read for key counts only.
His `-L gmux` server and his default tmux server were never touched. Nothing was installed, and no update Codex
offered was taken.

Every tmux server ran on its own `-L p331-*` socket with the vendored tmux 3.7b and Tortie's own
`resources/gmux-tmux.conf`. Investigator B started two Electrons, one after the other, under the shared lock. Each
went through `build/electron-run.mjs` on a scratch profile and on sockets `gmux-p331b-84887` (the parent) and
`gmux-p331b-95411` (a candidate build). Both were built from APFS clones in the scratchpad, because this worktree's
`node_modules` and `build/vendor` hold no files (§10).

**The round.** Investigator A read both sides' source, the release history and Tortie's launch and resume path.
Investigator B captured Codex's bytes in scratch tmux and reproduced the defect in the real renderer, then measured
a candidate fix. One adversary attacked both reports before a word of this was written, with fourteen tmux arms of its
own. A judge ruled on every disagreement. §6 records what the attack killed, so no later round re-derives it. The
harnesses and raw results are under the session's scratchpad (`scratchpad/p331/{b,adv}/`) and are not in the tree.

This answers the operator's report of 2026-09-29, verbatim:

> in the new version of codex cli installed on my machine, you can't scroll up in the window. when you try to scroll
> up in the window or press up / down arrows it shows you prompt history. Please look at /users/gdc/codex and also
> reproduce and then queue a build phase so we can fix

## 1. The answer first

1. **Codex 0.158 now opens a fullscreen view by default, and inside Tortie that view asks for no mouse.** The
   fullscreen transcript (`tui.fullscreen_transcript`) arrived on 2026-09-20 and became the default on 2026-09-22.
   On entry, Codex asks tmux whether the mouse is on, a check added on 2026-09-23. It asks Tortie's own server,
   found through `$TMUX`, and Tortie's server answers `mouse off` (`resources/gmux-tmux.conf:63`). Codex reads that
   as "do not take the mouse" and asks only for alternate-scroll mode 1007. tmux's own help for the option says the
   opposite: "Applications inside panes can use the mouse even when 'off'."
2. **Tortie's wheel router then hands the wheel to xterm, and xterm turns it into cursor keys.** tmux reports
   `#{alternate_on}` 1 and `#{mouse_any_flag}` 0. The session is therefore not Tortie's to scroll
   (`src/renderer/terminal/scroll/surface.ts:211`), and `handleWheel` returns true (`:325`). xterm.js sits in its own
   alternate buffer under `tmux attach`, so it has no scrollback, and it types `ESC O A` or `ESC O B` for each notch
   (`@xterm/xterm` 6.0.0, `CoreBrowserTerminal.ts:806-840`). Codex's composer reads those as prompt history. None of
   the conversation is in tmux's history (`#{history_size}` 0), so there is nothing for Tortie to scroll anyway.
3. **Reproduced in the real renderer at `217f47e5`.** Three real wheel notches over a Codex session made xterm send
   exactly `["\eOA","\eOA","\eOA"]`. The composer went from `› Ask Codex to do anything` to `› P331-HISTORY-TWO`, the
   screen did not move, and tmux never entered copy mode (§4.2).
4. **It is also a safety defect.** With an approval open, the same arrow keys move the highlighted answer. Two
   notches land on `2. Yes, and don't ask again for commands that start with …`, which is a standing allow rule if
   he then presses Enter (§4.5). The two halves were measured apart: the approval with tmux `send-keys Up`, and the
   key each notch sends in the app. The build's app run joins them.
5. **The arrow-key half of his report is how Codex has always worked.** Up and Down recall prompts in every Codex
   mode and every version measured. Only the wheel is new. The wheel half is Phase 12.3's founding defect come back:
   `src/main/tmux/scroll.ts:4-12` records the same `ESC O A` walking "the agent's PROMPT HISTORY" in 2026-08, and item
   2 of that header, "claude and codex both draw in the NORMAL buffer", was true on 0.147 and is false on 0.158.
6. **The fix: Tortie launches and resumes every Codex in Codex's own Scrollback mode**, `-c
   tui.fullscreen_transcript=false`. That is exactly the inline Codex Tortie measured and shipped against on 0.147.
   The two tokens go into the codex registry row's launch argv and its resume template. Tortie's two helpers that
   recover a person's own flags learn to set those two tokens aside. A boot pass recomposes the resume argv of every
   Codex row recorded before the phase, because restore arms the RECORDED argv word for word. In tmux, the spelling
   was measured on create and on resume in every argv position. In the app, the two sibling spellings
   (`--no-alt-screen`, `-c tui.alternate_screen="never"`) were measured, and the wheel scrolled Tortie's own history
   with nothing reaching Codex. The app measurement of this exact spelling is owed to the build (§8).
7. **He can fix his own sessions today, before any build.** In any Codex session, type `/tui` and choose
   Scrollback. That writes `tui.fullscreen_transcript = false` to his `config.toml` and takes effect at each
   Codex's next launch or restore. Until then, plain PageUp and PageDown (Fn+Up and Fn+Down) scroll the fullscreen
   view, but not while an approval is open, because PageUp there selects `1. Yes, proceed`.
8. **It depends on the machine.** Codex looks for `tmux` only in fixed system directories and never on `PATH`. His
   Mac has `/opt/homebrew/bin/tmux`, so the check runs and the defect fires. On a Mac with no Homebrew, MacPorts,
   nix or `/usr/local` tmux, the check fails, Codex takes the mouse, and today's fullscreen Codex scrolls itself
   through Tortie's existing mouse route. The fix moves those people to inline Codex too. That is a trade, not a
   strict regression, and it is his first question (§12).
9. **Claude Code does not share this shape, as far as anything here shows.** Research 130 read Claude's fullscreen
   renderer as asking for the mouse, which takes the route that works. The phase is Codex only and touches no router
   code.

## 2. Codex's side

### 2.1 Which codex Tortie launches

One install, reached two ways. `/Users/gdc/.local/bin/codex` is a symlink to `/Users/gdc/.bun/bin/codex`, which
points to bun's global `@openai/codex/bin/codex.js` (package version 0.158.0). That Node launcher spawns
`@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex`, 239,662,592 bytes, dated Sep 28 23:10. Both
paths print `codex-cli 0.158.0`.

Tortie gets the first. Detection walks the login-shell `PATH`, and `.local/bin` comes first on his. It records
`join(dir, bin)` without resolving symlinks (`src/main/agents/detection.ts:441-449`,
`src/main/tmux/resolve.ts:1204-1220`). The pane then runs the bare name through the same `PATH` (Phase 12.7 F3).
Investigator B read his live panes with `ps`, never signalling them, and found `node /Users/gdc/.local/bin/codex
resume <id> --yolo`. In B's app run the pane's child was the same vendor binary.

A third copy, `/Users/gdc/.npm-global/bin/codex`, comes later on `PATH` and is broken. `--version` there fails with
`spawn …/vendor/aarch64-apple-darwin/codex/codex ENOENT`. Nothing reaches it.

### 2.2 When the default changed

| Commit | Date | Change |
| --- | --- | --- |
| `7daaabc795` (#8555) | 2026-01-09 | `tui.alternate_screen` (`auto`, `always`, `never`) and `--no-alt-screen` |
| `e53c444964` (#44691) | 2026-09-11 | The warning "Codex is ignoring N unrecognized configuration setting(s)" |
| `a2de8fedcc` (#46849) | 2026-09-20 | `tui.fullscreen_transcript`, default false, and its entry in the background-server allowlist |
| `2f34d236f5` (#46883) | 2026-09-20 | The `/tui` picker, which writes `tui.fullscreen_transcript` |
| `5106a5234f` (#47178) | 2026-09-22 | "Enable the fullscreen transcript by default" |
| `4b664e0ef0` (#47399) | 2026-09-23 | "Respect tmux mouse settings in fullscreen and overlays", the `#{mouse}` check |

The alternate screen itself has been `auto`'s default since January. What changed in September is the fullscreen
transcript on top of it: Codex owns the conversation in its own memory and writes none of it to the terminal's
scrollback. `TranscriptMode::resolve` (`codex-rs/tui/src/transcript_mode.rs`) is `Owned` only when
`fullscreen_transcript` and the alternate screen are both on. The config doc reads "Own the fullscreen transcript,
including scrolling, selection, and search. Defaults to `true`" (`codex-rs/config/src/types.rs:859-862`).

The checkout's tags are sparse. `rust-v0.155.0-alpha.9` (2026-09-15) holds none of the September changes after
#44691, `rust-v0.161.0-alpha.1` (2026-09-29) holds all of them, and there are no 0.156 to 0.158 tags. `CHANGELOG.md`
has no entry and points to the releases page. So the release is inferred from the installed binary's strings:
`#{mouse}` (#47399) is present, as is `right_click_paste` (#48118, 2026-09-25, 13 hits). 0.158.0 was therefore cut
after 2026-09-25 and carries both #47178 and #47399. The behaviour settles it independently (§2.3).

**`auto` has no rule that picks inline mode inside tmux.** `determine_alt_screen_mode`
(`codex-rs/tui/src/lib.rs:2120-2134`) returns inline only for `--no-alt-screen`, for `never`, and under `auto` for
Terminal.app over SSH. The identity check behind that last case is skipped whenever a multiplexer is detected
(`codex-rs/tui/src/terminal_probe.rs:282-296`). No `TERM` rule and no environment variable selects inline mode. A
grep of every `CODEX_*` environment read in `codex-rs` finds none that switches the screen mode. The command line
and `config.toml` are the only levers.

### 2.3 What Codex writes at start

Captured with `pipe-pane` from the installed 0.158.0 in a scratch tmux 3.7b under Tortie's config, and re-decoded
for this document from `scratchpad/p331/b/raw-*.bin`. Byte offsets are from the start of the pane's output.

| Launch | Bytes, in order | tmux reads |
| --- | --- | --- |
| Default (`auto`, fullscreen) | `?2004h` (bracketed paste) @0, `CSI >4;0m`, `CSI >5u` (kitty keyboard push, flags 5) @15, `?1004h` (focus) @20, `CSI 6n`, `OSC 10;?`, `OSC 11;?`, `CSI ?u`, `CSI c`, `?2026h` @55 (synchronized update), `?25l`, **`?1049h` @69**, `CSI >4;0m`, `CSI >5u` @84, **`?1007h` @89**. No 1000, 1002, 1003 or 1006 anywhere in 9,161 bytes | `alternate_on` 1, `mouse_any_flag` 0, `history_size` 0, and still 0 after 150 printed lines |
| `-c tui.fullscreen_transcript=false` | The same probes and push through `?2026h` @55, then drawing. No 1049, no 1007, no mouse in 11,126 bytes | `alternate_on` 0, `history_size` 11 at start |
| `--no-alt-screen`, `-c tui.alternate_screen="never"` | The same as the row above | `alternate_on` 0 |
| Default, with the scratch server's `mouse` set `on` | As the default row through `?1049h` @69 and `CSI >5u` @84, then `?1007l` @89, `?1000h` @97, `?1002h` @105, `?1006h` @113, `?1003h` @121 | `mouse_any_flag` 1 |
| Default, `mouse` still `off`, with `TMUX` and `TMUX_PANE` unset | As the row above, except the push is `CSI >7u` (flags 7) at @15 and @84 | `mouse_any_flag` 1, `mouse_sgr_flag` 1 |

The push is flags 5 inside tmux because tmux's `extended-keys-format` defaults to `xterm` (tmux 3.7b
`options-table.c`), which Tortie does not set, and Codex reads that through the same query (§2.4). Without the query
Codex pushes flags 7. Inline mode also sends one `ED2` + `ED3` clear and replays the transcript after a command
finishes (`\e[3J` @7088 in the `false` capture; §4.8).

### 2.4 Why it asks for no mouse

`options()` in `codex-rs/tui/src/tui/tmux.rs:23-44` runs only when `TMUX` or `TMUX_PANE` is set, which tmux does for
every pane. It resolves `tmux` through `codex_utils_path::system_executable` (`:28`), which "Finds an installed
helper without consulting PATH" (`codex-rs/utils/path-utils/src/system_commands.rs:13-14`). The fixed directories are
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, nix, the Xcode tool directories, `/usr/bin`, `/bin`,
`/usr/sbin` and `/sbin`. On his Mac only `/opt/homebrew/bin/tmux` exists (Homebrew's 3.6a). Tortie's bundled tmux
lives under the app's resources (`src/main/tmux/resolve.ts:1467`), outside every one of them.

`read_options` (`:46-66`) sends `display-message -p -t $TMUX_PANE '#{extended-keys-format}\t#{mouse}'`. A 3.6a client
can ask the 3.7b server because both speak protocol 8. It sets `MouseCapture::DisabledByTmux` on `0` or `off`
(`:59`). If the check cannot run, the default is mouse capture on.

`AlternateScreen::enter` (`codex-rs/tui/src/tui/alternate_screen.rs:85-100`) records that answer, and
`configure_input` (`:102-124`) then does one of two things. If capture is allowed it writes `DisableAlternateScroll`,
`EnablePointerCapture` (`?1000h ?1002h ?1003h`, `:57`) and `?1006h` (`:115`). Otherwise it turns the mouse off and
writes `EnableAlternateScroll` (`:120`), which is `?1007h` (`codex-rs/tui/src/tui.rs:270`).

Tortie's config is explicit that `off` does not take the mouse from programs (`resources/gmux-tmux.conf:59-62`), and
so is tmux's own help for the option (vendored `tmux-3.7b/options-table.c:771-773`). Codex reads the option as a
statement about what programs may do. That misreading is upstream's, and §9 holds the report text.

### 2.5 How the fullscreen view scrolls

Read from source and measured in tmux on the installed 0.158.0:

- **The wheel** moves 3 rows per report (`transcript_view/input.rs:224-233`), but only when Codex holds the mouse,
  which under Tortie on his Mac it does not.
- **Plain PageUp and PageDown** move one page, height − 1 rows (`:318-346`), unless an open popup or list binds the
  key first (`app/owned_transcript.rs:452-466`). Measured: one PageUp took the view to the `>_ OpenAI Codex` header in
  a 40-row pane and showed `↓ Back to bottom · esc`; two PageDown returned to live. Over an open approval, PageUp
  selects `1. Yes, proceed` and PageDown selects `3. No…` (adversary).
- **Ctrl+Home, Ctrl+End, Alt+< and Alt+>** jump to the start or the latest line, and **Esc or Enter** returns to the
  latest.
- **Ctrl+T** opens the transcript pager (`keymap.rs:1647`), where Up, Down, `j` and `k` scroll a line
  (`:1869-1870`), and F3 searches.
- **Up and Down in the main view are always the composer's history.** Measured: with the transcript scrolled back
  to `P331-SEQ-77`, Up put `! seq -f P331-SEQ-%g 1 150` and then `› P331-HISTORY-THREE` in the composer while the
  view stayed put.

Tortie takes only Shift+PageUp and Shift+PageDown, and only when it owns the view
(`src/renderer/terminal/keys/index.ts:139-152`). Plain PageUp already reaches Codex, which is why Fn+Up works today.

### 2.6 The three spellings that turn fullscreen off

| Spelling | Screen | The Ctrl+T pager | Codex's shared background server | Can a later flag undo it? | Older Codex |
| --- | --- | --- | --- | --- | --- |
| `-c tui.fullscreen_transcript=false` | Inline, Codex's own "Scrollback" mode | Stays on the alternate screen; tmux history 37, 37 while open, 37 after, no `ED3` | Kept by source: the allowlist admits the key when its value is a bool (`codex-rs/tui/src/daemon_startup.rs:63`); not measured (§8) | Yes. A later `-c …=true` wins (`codex-rs/config/src/overrides.rs:9-15`, measured) | Before 2026-09-11 silently ignored; 2026-09-11 to 09-19 one warning line; those builds had no fullscreen anyway |
| `--no-alt-screen` | Inline | Drawn inline: history 37, then 72 while open, then 27 after close, one `ED3` | Kept by source (no exclusion names it) | No. The CLI ORs it in, `interactive.no_alt_screen \|= …` (`codex-rs/cli/src/main.rs:1065`, `:2676`) | Unknown argument before 2026-01: a dead pane |
| `-c tui.alternate_screen="never"` | Inline | Drawn inline, as the row above | **Dropped, visibly.** The footer reads `⚠ 1 warning · f2 to view`; F2 reads "Running without the shared background server: command-line configuration overrides (-c, --enable, --disable, or --search) requires embedded mode." (measured with the server's default on; "No warnings" with it off) | Yes | Accepted since 2026-01 |

All three put `-c` before or after `resume <id>` without trouble (§4.4). `--no-alt-screen` is accepted in either
position too (`resume_and_fork_preserve_no_alt_screen`, `codex-rs/cli/src/main.rs:3889-3897`). Codex's first frame
already honours `-c`, so the screen never flashes fullscreen first: no `?1049h` appears in any `false` capture.

`-c` beats `config.toml`. The adversary wrote `[tui] fullscreen_transcript = true` into a scratch config: a bare
launch gave `alternate_on` 1, and a launch with `-c tui.fullscreen_transcript=false` gave 0. So Tortie's flag
overrides a person who chose Fullscreen in `/tui` or by hand. Codex's own picker says as much: "Restart to apply.
Launch overrides still apply." (`codex-rs/tui/src/chatwidget/tui_mode_picker.rs:36`; the save message at
`codex-rs/tui/src/app/tui_mode_picker.rs:24` says the same).

A `-c` key that a given Codex does not know becomes an error only under `--strict-config`, a flag Tortie never
passes (`codex-rs/cli/src/main.rs:314`). The `Tui` struct's `deny_unknown_fields` applies to the schema only
(`codex-rs/config/src/types.rs:801-804`).

### 2.7 His own config

Read for key presence only, as counts: `alternate_screen` 0, `fullscreen_transcript` 0, `transcript_v2` 0,
`no.alt.screen` 0, and one `[tui]` table. He gets 0.158's defaults, and so the owned view. Nothing he set would be
overridden by the fix.

## 3. Tortie's side

### 3.1 The wheel router

`handleWheel` (`src/renderer/terminal/scroll/surface.ts:305-325`) is xterm's custom wheel handler, wired at
`src/renderer/terminal/TerminalPane.tsx:317`. Returning false cancels xterm's own handling; returning true hands the
event on. It chooses between four routes, from main's reading of the pane (`STATE_FORMAT`,
`src/main/tmux/scroll.ts:134-145`, which carries `#{alternate_on}` and `#{mouse_any_flag}`):

1. **No pane on this Mac** (Phase 95 and Phase 320, `:318-320`). The wheel goes on only if xterm's mouse mode is
   one that reports it (`wheelReachesProgram`, `:103-105`). Otherwise it is swallowed.
2. **The program asked for the mouse** (`innerMouse`). The wheel goes on, and xterm sends it as an SGR report.
3. **The program is on the alternate screen with no mouse** (`innerAlt`, plain vim). The wheel goes on, and xterm
   sends cursor keys, "which is what scrolls that app's own buffer" (`surface.ts:22-25`).
4. **Otherwise**, Tortie owns the view and scrolls tmux's history through copy mode.

Routes 2 and 3 are `view.owned === false` (`:211`, `owned: !state.innerAlt && !state.innerMouse`). Phase 292 added one
exception: a pane already parked in copy mode keeps the wheel whatever the program does next (`:325`, `&&
!this.state.inMode`). main also reports `history` as 0 for an alternate-screen pane that is not parked
(`scroll.ts:190`), so the scrollbar draws no thumb.

Fullscreen Codex under Tortie is route 3. xterm's branch (`CoreBrowserTerminal.ts:806-840`) runs because the custom
handler did not return false and `!this.buffer.hasScrollback`. That holds for every Tortie pane, because `tmux
attach` puts xterm in its alternate buffer (`scroll.ts:4-12`). The branch sends `ESC + (applicationCursorKeys ? 'O' :
'[') + (deltaY < 0 ? 'A' : 'B')`. **Codex's `?1007h` plays no part.** tmux 3.7b's `input.c` has no case for mode
1007, so it is never forwarded, and xterm makes the arrow keys on its own. Drag-select and Shift+PageUp also turn off
when `!view.owned` (`src/renderer/terminal/scroll/drag-select.ts:273`, `:343`; `keys/index.ts:149`).

### 3.2 How Codex is launched, resumed and restored

- **The row.** `src/main/agents/registry.ts:696-785`: `launch.argv: ['codex']` (`:726`), `resume.template: ['resume',
  SESSION_ID_SLOT]` (`:731`), id capture by harvest, available at the first turn. Its notes were measured on 0.147.0,
  and so is the flag catalog (`src/main/agents/flags.ts:193`, `helpVerifiedVersion: 'codex-cli 0.147.0'`).
- **Create.** `launchArgvFor` (`registry.ts:1945-1959`) is `[argv0, ...launch.argv.slice(1), ...preAssign,
  ...extraArgs]`. `buildLaunchSpec` (`src/main/manifest/agents.ts:727-790`) records the person's extras into the
  launch argv and the resume argv. A session on another machine composes through the same function
  (`src/main/machines/remote-sessions.ts:1315-1321`, and `resumeArgvFor` at `:1659`).
- **Resume.** `resumeArgvFor` (`registry.ts:1999-2017`) is `[argv0, ...template, ...extras]`, with the extras trailing
  unless the row says `leading`. His live panes show exactly `codex resume <id> --yolo`.
- **Harvest and its rescues.** `composeResumeArgv` (`src/main/sessions/resume-argv.ts:47-78`) is the one composition
  for the harvest (`src/main/sessions/id-harvest.ts:218`), the boot rescue and admission (`:408`, `:438`, `:532`,
  `:635`) and Phase 215's repair (`src/main/sessions/codex-repair.ts:240`). The harvest passes the create path's own
  extras. The others pass `agentExtrasOf(rec)` (`src/main/sessions/launch-plan.ts:101-104`), which is
  `rec.argv.slice(1)`. That silently assumes the registry's `launch.argv` is argv[0] alone, as it is for every row
  today (the thirteen `launch` blocks in `registry.ts`).
- **Restore arms the recorded argv.** `armableResume` starts from `const recorded = [...(rec.resumeArgv ?? [])]`
  (`src/main/restore/restore.ts:777`). A registry change therefore reaches no row already written. The block at
  `restore.ts:320-334` gives the reason: "Every fact in `ManifestSessionRecord.agentContract` is a fact about the
  session that was created, not about the agent Tortie ships today."
- **Found while writing, read and not driven: Restart.** `recoverLaunchExtras` (`src/main/restart/extras.ts:96-150`)
  rebuilds the launch argv with no extras through the registry and takes what follows (`:135-136`). If the registry's
  launch argv gains two tokens, a Codex row written before that no longer starts with the rebuild. The function then
  answers null, and Restart comes back without the person's flags: his `--yolo` would be dropped. The same helper
  that fixes `agentExtrasOf` has to serve this caller.
- **Found while writing: the row's contract is write-once.** `sessions-repository.ts:358-359` merges a contract only
  into a row that has none. So a repair can move a row's resume argv but not its `agentContract.resumeTemplate`,
  which records the template in force at launch and stays true of the launch.
- **The gates.** `conformance:agents` section 2 composes a resume argv from the parsed row and requires it to equal
  the registry's (`build/conformance-agents.mjs` header). That is consistency, not a literal pin. A flag placed in the
  registry moves both sides and stays green. A flag spliced at a call site also stays green and covers nothing.
  `conformance:resume:capture` launches the real agent through create and capture with no turns. Full
  `conformance:resume` runs the real round trip with two short turns per agent. No test under `src/` or `build/`
  names `fullscreen_transcript`, `no-alt-screen` or `alternate_screen`.
- **Two parsers that treat `-c` as special.** The SpecStory wrap puts the inner argv in ONE quoted token after
  specstory's own `-c` (`src/main/specstory/wrap.ts:186-199`), so `isWrappedArgv` and `unwrapArgv` (`:204-222`) and
  `commandRunsAgent` (`src/main/activity/state-machine.ts:630-650`, `indexOf('-c', 2)`) still find specstory's `-c`
  first. `.`, `_` and `=` are in `SPECSTORY_SAFE` (`wrap.ts:65`), so the pair quotes without escapes. This holds by
  ordering rather than by design, and the build tests it.

### 3.3 Claude Code

Research 130 §2.2 read Claude Code 2.1.280's fullscreen renderer as asking for 1049 and the mouse
(`1000+1002+1003+1006` or `1000+1006`), with no tmux check that decides capture. That makes `innerMouse` 1, the wheel
travels as an SGR report, and Claude scrolls itself. Research 130 records that as how a local fullscreen Claude
scrolls. Research 130 §9 also read, from the bundle, that Claude prints a hint telling the person to `set -g mouse
on` when it sees tmux's `mouse` off. That is a hint, not a capture decision. His Claude runs the classic renderer
(`tui: 'default'`, research 130 §2.3), and the judge there corrected the claim that fresh installs always get
fullscreen. The installed 2.1.285 lives under `~/.local/share/claude`, which this round was not allowed to read, so
whether a newer Claude also decides capture from tmux's `mouse` is unverified. A launch flag for Codex fixes nothing
for Claude. A router rule broad enough to cover both would change vim, less and htop.

## 4. The live reproduction

### 4.1 In tmux

§2.3's bytes and readings, captured by investigator B and re-captured independently by the adversary with its own
harness (`adv/adv-arm.mjs`): fullscreen gave `1049h` 1, `1007h` 1, no mouse mode and kitty push 5. With `TMUX` and
`TMUX_PANE` unset it gave `1000h`, `1002h`, `1003h` and `1006h` once each, `1007h` 0, kitty 7 and `mouse_any_flag` 1.

### 4.2 In the app, at the parent

`scratchpad/p331/b/probe-parent.json`. One Electron through `withElectron`, a scratch profile and `HOME`, socket
`gmux-p331b-84887`, the vendored tmux 3.7b through `GMUX_TMUX_BIN`. The session was made through the renderer's own
create path (`__gmuxShotDrive({agent:'codex'})`). A local `!seq` printed 150 lines, and the composer's history was
seeded with three entries.

| Reading | Before the wheel | After three notches |
| --- | --- | --- |
| tmux | `alternate_on` 1, `mouse_any_flag` 0, `history_size` 0, `pane_current_command` `node`, `mouse` option `off` | `pane_in_mode` 0, `scroll_position` empty, `history_size` 0 |
| xterm | buffer `alternate`, `mouseTrackingMode` `none`, `applicationCursorKeys` true | `onData` during the wheel: `["\eOA","\eOA","\eOA"]` |
| The screen | Top row `    P331-SEQ-16`; composer `› Ask Codex to do anything` | Top row unchanged; composer `› P331-HISTORY-TWO` (one Up for the `!seq`, one for `THREE`, one for `TWO`) |

The wheel was three CDP `Input.dispatchMouseEvent` `mouseWheel` events, each three cells up, and the page saw
three wheel events. Codex also collapses long command output in both modes (`… +101 lines (ctrl+t to view
transcript)`), so the transcript tmux later holds is Codex's own rendering of it.

### 4.3 The candidate, in the app

`probe-fix.json`, socket `gmux-p331b-95411`. A scratch build whose `create-local.ts` appended a flag by session
name. **That splice is not the fix.** It is how the measurement was taken, and §6 item 8 is why a splice must never
ship.

| Session | Before | xterm sent | After |
| --- | --- | --- | --- |
| `p331-plain` (control, no flag) | `alternate_on` 1, history 0 | `\eOA` ×3 | composer `P331-HISTORY-TWO`, identical to the parent |
| `p331-inline` (`--no-alt-screen`) | `alternate_on` 0, history 11 at start, 33 before the wheel | nothing | `pane_in_mode` 1, `scroll_position` 18; top of the screen Codex's greeting line, `P331-SEQ-1` visible; composer unchanged |
| `p331-cinline` (`-c tui.alternate_screen="never"`) | `alternate_on` 0, history 23 | nothing | `pane_in_mode` 1, `scroll_position` 18; the same |
| `p331-mouse` (`env -u TMUX -u TMUX_PANE` prefixed) | `alternate_on` 1, `mouse_any_flag` 1, `mouse_sgr_flag` 1, xterm `any` | `\e[<64;77;15M` ×3 | Codex's own view moved from `SEQ-16` to `SEQ-7` with `↓ Back to bottom · esc`; composer unchanged; `pane_in_mode` 0 |

The chosen spelling, `-c tui.fullscreen_transcript=false`, was not among the app sessions. The router reads only
`alternate_on` and `mouse_any_flag`, and B measured both at 0 for this spelling in tmux, with `history_size` rising
from 11 to 22 over a `!seq`. It will take route 4 by the same code, but the build's app run has to drive it.

### 4.4 Resume

All against one scratch rollout. B's arms: plain `resume <id>` gave `alternate_on` 1, `1049h` and `1007h`, history 0.
`resume <id> --no-alt-screen`, `-c … resume <id>` and `resume <id> -c …` each gave `alternate_on` 0 and replayed the
conversation into tmux history (88, 142 and 196 lines, growing because each run added a `!seq`). The adversary's arms,
with the chosen key:

| Resume argv | `alternate_on` | tmux history | Note |
| --- | --- | --- | --- |
| `resume <id>` | 1 | 0 | `1049h` once |
| `resume <id> -c tui.fullscreen_transcript=false --yolo` | 0 | 24 | header still reads `permissions: YOLO mode`, so trailing extras survive |
| `-c tui.fullscreen_transcript=false resume <id>` | 0 | 12 | |
| `resume <id> --yolo --no-alt-screen` | 0 | 24 | |
| `resume <id> -c …=false -c …=true` | 1 | 0 | the later flag wins |

This matches the registry's 0.147 note that launch flags are not restored by `codex resume`: the flag has to be on
both argvs.

### 4.5 An approval under the wheel's keys

The adversary's mock provider answered a prompt with an `exec_command` call carrying
`sandbox_permissions=require_escalated`, and the real 0.158.0 opened its real approval with the first row selected
(`adv/out/arm-auto-approval.json`):

| Key sent with `send-keys` | Selected row afterwards |
| --- | --- |
| (at open) | `› 1. Yes, proceed (y)` |
| Up | `› 3. No, and tell Codex what to do differently (esc)` |
| Up | `› 2. Yes, and don't ask again for commands that start with \`touch p331-approved.txt\` (p)` |
| PageUp | `› 1. Yes, proceed (y)` |
| PageDown | `› 3. No, and tell Codex what to do differently (esc)` |

`alternate_on` stayed 1 throughout. With `TMUX` unset, three SGR wheel reports left the selection on `1. Yes,
proceed` (`arm-unset-approval.json`).

**In the chosen mode the approval is not on the alternate screen**, so the wheel never reaches it. Under `-c
tui.fullscreen_transcript=false` the same approval opened with `alternate_on` 0, `mouse_any_flag` 0 and
`history_size` 11. The capture holds no `?1049h`, no `?1007h` and no mouse mode in 11,376 bytes
(`arm-fsfalse-approval.json`, re-read for this document). Tortie's router therefore owns the wheel over it (route 4)
and scrolls tmux's history. A typed Up still moves the selection (`› 3. No…`), which is Codex's keyboard, not the
wheel. This is a tmux reading; the build's app run drives the wheel over it.

### 4.6 The Ctrl+T pager

With `-c tui.fullscreen_transcript=false`, after a `!seq`: tmux history 37; Ctrl+T opened the pager on the alternate
screen (`alternate_on` 1) with history 37; `q` closed it with history 37; no `ED3`. With `--no-alt-screen`: 37, then
72 while open with `alternate_on` 0, then 27 after close, with one `ED3`. In the chosen mode the pager is an
alternate-screen program that asked for no mouse, so Tortie's route 3 sends it arrow keys, which is what scrolls it,
exactly as for vim.

### 4.7 What Tortie's detectors read in both modes

The adversary ran the shipping `detectDialogRows`, `detectDialog` and `codexTitleVerdict` under the pinned tsx over
both approval screens (`adv/out/approval-*.txt`). Fullscreen: `atChoice` true, question `Would you like to run the
following command?`, three options, title `[ ! ] Action Required | proj`, verdict `needs_input`/native. Inline: the
same question and options, title `[ . ] Action Required | proj`, the same verdict. Codex's status comes from its
title (`activity: { tier: 'native', native: 'pane-title-oracle' }`), and Phase 321's shapes do not list Codex. Inline
mode costs no attention signal.

### 4.8 Inline mode's clear and replay

After a command finishes, and when the Ctrl+T view closes under `--no-alt-screen`, inline Codex clears the screen and
the scrollback (`\e[r\e[0m\e[H\e[2J\e[3J\e[H`) and prints the whole transcript again from its header. tmux 3.7b
treats `CSI 3J` as clear-history (`input.c:1727-1735`). B parked a reader in copy mode 15 lines back across one such
clear: `pane_in_mode` stayed 1, `scroll_position` stayed 15 and the copy cursor stayed on `P331-SEQ-144`, while
`history_size` went from 36 to 76 at +3.5 s. The distance-from-live figure moves; the reader does not. Both replay
paths predate the 0.147 measurements: resize reflow in `5591912f0b` (2026-04-25, #18575) and consolidation reflow in
`5248e3da2b` (2026-05-10). This is the world Tortie already shipped.

## 5. Every candidate fix and what it costs

| | What he sees | What it costs | What it breaks | Ruling |
| --- | --- | --- | --- | --- |
| **(a1) `-c tui.fullscreen_transcript=false` on create and resume** | The wheel, the scrollbar, Shift+PageUp, drag-select and ⌘C across the whole conversation, and Capture, Read last lines, saved output and restore snapshots over all of it. Up and Down still recall prompts | Overrides a Fullscreen choice made in `/tui` or `config.toml` (he has none). Old rows need a boot recompose (a manifest write). Two helpers must learn the fixed tokens. Codex builds of 2026-09-11 to 09-19 print one warning line. Loses Codex's own page scrolling, jumps, keyboard selection, fixed composer and reflow, all keyboard-only under Tortie anyway | Nothing measured. Running processes stay fullscreen until they restart | **Chosen** |
| (a2) `--no-alt-screen` | As (a1), but the pager is drawn inline and its close clears history (37 → 27) | Kills Codex older than January 2026 (unknown argument, dead pane). No later flag can undo it, so no opt-back preset could ever exist | Pager history | Rejected |
| (a3) `-c tui.alternate_screen="never"` | As (a2) | A visible `⚠ 1 warning` footer and Codex off its shared background server on every Tortie launch | The daemon | Rejected |
| (b) Router sends PageUp/PageDown for Codex | The view jumps a page per notch | A trackpad flick sends dozens. History surfaces stay at one screen | Over an approval PageUp selects `1. Yes, proceed`. Applied broadly it changes vim and less, which Phase 12.3 routes to arrow keys on purpose | Rejected |
| (c) Swallow the wheel | Nothing scrolls, and nothing pops | His report still holds | Applied broadly, vim and less stop scrolling | Rejected as the fix; the known safe fallback, and what Phase 320 already does remotely (`surface.ts:309-319`) |
| (d) Launch with `env -u TMUX -u TMUX_PANE` | Codex takes the mouse and scrolls its own view (measured in the app) | argv[0] becomes `env`, against the absolute-binary and bare-name rules (`conformance:agents` section 1). The agent's own `tmux` commands reach his DEFAULT server. Kitty flags 5 → 7, unmeasured against the LF Shift+Enter route (`registry.ts` codex `multilineKey`). Codex's clipboard route changes (`clipboard_copy.rs:231-233`) | Drag-select and ⌘C go to Codex. Capture and Read last lines stay at one screen | Rejected |
| (e) Router writes unrequested SGR wheel reports | Codex's view moves 3 rows a notch (adversary: `SEQ-20` → 17 → 14 → 11, composer untouched) | Rests on crossterm's lenient parser (`codex-rs/tui/src/tui/event_stream.rs:304`). Needs to know Codex holds the terminal, and tmux reads the pane's command as `node` | Sent to vim or less the bytes arrive as keystrokes. Unmeasured over an approval. History surfaces stay at one screen | Rejected |
| (f) Tortie's tmux `mouse on`, globally or for Codex sessions | Codex takes the mouse | tmux then takes every click, drag and right-click and draws its own menu and selection (`gmux-tmux.conf:51-58`) | Drag-select in xterm and the one native context menu. Not raised by the round and not measured; rejected on the config's own recorded reasons | Rejected |
| (g) Report upstream | Nothing, until Codex changes | A report | Nothing | In parallel, not a fix; §9 holds the text |

**Why (a1) and not (a2) or (a3)**, in one place:

1. It is Codex's own named mode, "Scrollback: Native terminal copy, paste and scrollback" (the `/tui` picker).
2. The pager stays off tmux's history.
3. The background-server allowlist admits it.
4. A person's later `-c …=true` can undo it.
5. It works in both argv positions on resume with `--yolo` kept.
6. An old Codex ignores it rather than dying on it.
7. It leaves the wheel router, which vim, less, htop and fullscreen Claude depend on, exactly as it is.

**The no-regression reading.** Against today's build on his Mac, every scenario is equal or better: the wheel
scrolls instead of walking history, the approval hazard goes, and the history surfaces hold the whole conversation.
The costs are two:

- A person who deliberately wants fullscreen Codex in Tortie loses it until an opt-back exists. That is §12 question
  2, and on his Mac fullscreen Codex has no working wheel anyway.
- On a Mac without a trusted-directory tmux, today's fullscreen Codex scrolls through the mouse route and becomes an
  inline Codex that scrolls through Tortie's history. That is §12 question 1.

## 6. What the attack killed

Each was upheld by the judge after the adversary or a second measurement refuted it.

1. **"Codex runs fullscreen and asks for no mouse" (the main session's hypothesis) was right about the result and
   wrong about one link.** Codex asks for the mouse by default, and declines only because it asks Tortie's tmux and
   reads `mouse off`. Measured three ways: `TMUX` set gives 1007 and no mouse, `TMUX` unset gives the mouse, and the
   server's `mouse on` gives the mouse.
2. **"The defect is prompt history."** It also moves an open approval's selection onto a standing allow rule (§4.5).
3. **"The arrow keys reach Codex because Codex asked for 1007."** tmux 3.7b drops 1007. xterm sends the keys because
   it is on its alternate buffer under `tmux attach` and nothing asked it for the mouse.
4. **"The background-server exclusion under `-c tui.alternate_screen` is silent"** (investigator A). The warning is
   visible in the footer and on F2 (investigator B).
5. **"Older Codex warns about an unknown `-c` key since May 2026"** (investigator A). The warning landed on
   2026-09-11 (`e53c444964`), so only builds of the nine days before the key existed show it, and 0.147 and older
   ignore it silently (the judge, `git log -S`).
6. **"`--no-alt-screen` and the chosen spelling are equivalent."** They differ on the pager (§4.6), on the daemon for
   `never`, on whether a later flag can undo them, and on Codex older than January.
7. **"Inline mode's clear and replay is a regression"** (investigator B's worry). Both paths predate 0.147 (§4.8).
8. **"A registry change fixes his sessions."** Restore arms the recorded argv (`restore.ts:777`). Without a boot
   recompose his existing rows restore fullscreen for good.
9. **"The gates pin the argv byte for byte, so a mistake would go red."** `conformance:agents` compares the row with
   the registry, so both sides move together. B's `create-local.ts` splice stayed green and covered nothing.
10. **"The router could send PageUp/PageDown for Codex."** It selects approval answers and moves a page per notch.
11. **"Launching without `TMUX` is harmless."** argv[0], the default server, the clipboard route and the keyboard
    flags all move.
12. **"Every Mac hits this."** Only a Mac with tmux in one of Codex's trusted directories (§2.4).
13. **"Codex's `auto` might pick inline inside tmux."** No rule does (§2.2).

## 7. The judge's rulings

| Question | Ruling |
| --- | --- |
| Is the hypothesis right? | Right about the result, wrong about one link: Codex declines the mouse because Tortie's tmux answers `off` |
| Which codex does Tortie launch? | `/Users/gdc/.local/bin/codex`, the same install as `.bun/bin/codex`; the npm-global copy is broken and unreached |
| When did the default change? | The fullscreen transcript: key 2026-09-20, default 2026-09-22; the tmux check 2026-09-23; both in 0.158.0 (inferred from the binary's strings and settled by its bytes). `auto` has no tmux rule |
| Reproduced in the renderer? | Yes, at `217f47e5` (§4.2) |
| Only prompt history? | No. A safety defect too; the phase brief says so, and the app run must join the two measurements |
| Is the arrow-key half a defect? | No. The fix claims only the wheel |
| Which spelling? | `-c tui.fullscreen_transcript=false`. Its in-app measurement is owed to the build |
| Is the `-c tui.alternate_screen` exclusion silent? | No; B is right |
| How old a Codex warns? | Only builds of 2026-09-11 to 09-19; 0.147 and older ignore the key |
| Where must the flag live? | In the codex row's `launch.argv` tail and `resume.template`, never at a call site; `agentExtrasOf` must set the fixed tokens aside when they lead |
| Does a registry change reach his sessions? | Not alone. A boot recompose pass is part of the fix; running processes stay fullscreen until they restart |
| Candidate (d)? | Rejected |
| Candidates (b) and (e)? | Rejected |
| Candidate (c)? | Rejected as the fix; the known safe fallback |
| Is inline mode's replay a regression? | No; a stated limit on the distance figure |
| Does inline mode cost an attention signal? | No |
| Does it depend on the machine? | Yes; stated, and his first question |
| Claude Code? | No evidence of the same shape; the phase is Codex only and touches no router code |
| Can the build run in this worktree? | Not as it stands; it re-copies `node_modules` and `build/vendor` first |
| What can he do today? | `/tui` → Scrollback; meanwhile Fn+Up and Fn+Down, never over an approval |
| Tier and methods | Tier 3: measure the parent, and attack. Gates `conformance:agents`, `conformance:resume:capture` and one full `conformance:resume` |

## 8. What stays unmeasured, and why

- **The chosen spelling in the app.** B's app arms ran `--no-alt-screen` and `-c tui.alternate_screen="never"`. The
  chosen spelling was measured in tmux at `alternate_on` 0 and `mouse_any_flag` 0, which is all the router reads.
  The build's probe drives it.
- **Whether `-c tui.fullscreen_transcript=false` keeps Codex's shared background server.** It rests on
  `daemon_startup.rs:63`. Starting that server from a scratch `CODEX_HOME` runs `prepare_install` and
  `ensure_managed_updater`, which install a package, so it was not started. Under his own home the server is already
  running (his `ps` shows `…/app-server-daemon/releases/0.159.0-aarch64-apple-darwin/bin/codex app-server
  --listen unix:// --managed-daemon`, a release ahead of the 0.158.0 client). A run there would add a trust entry to
  his `config.toml`. That is §12 question 3.
- **The wheel over an approval in the app.** The two halves were measured apart (§4.5 and §4.2).
- **A Mac without a trusted-directory tmux.** Homebrew's tmux cannot be removed here. B's in-app arm with `TMUX`
  unset stands in for it, because Codex takes the same default when the check cannot run.
- **Claude Code 2.1.285.** Not read (§3.3).
- **A session on another machine.** No machine was reached. A new remote Codex gets the flag through
  `remoteLaunchArgv`, and inline mode would put its conversation into the far tmux's history, where Read last lines
  reaches it. The wheel there stays Phase 320's until Phase 320.1 lands.
- **Codex older than 0.158 given the key.** Read from source and `git log`, not run. No other Codex is installed and
  nothing was installed.
- **Restart and a row written before the phase** (§3.2). Read, not driven.
- **What a real trackpad's momentum does in inline Codex.** CDP wheel events only. Research 130 §6 item 4's momentum
  finding is Tortie's own and unchanged here.
- **A full `conformance:resume` on 0.158.** It spends two real turns under his sign-in and is the build's to run.

## 9. Found on the way, and not this phase

- **The report for OpenAI**, which the build writes nowhere and files nowhere unless he says so:

  > Codex 0.158 (`4b664e0ef0`, #47399) reads tmux's `mouse` option as whether an application may take the mouse:
  > `#{mouse}` of `0`/`off` sets `MouseCapture::DisabledByTmux`, and the fullscreen view then writes `?1007h` and no
  > mouse modes. tmux's own help for the option says "Applications inside panes can use the mouse even when 'off'"
  > (tmux 3.7b `options-table.c`), and many hosts that render their own chrome set it off for that reason. In such a
  > host the owned transcript has no working wheel: the outer terminal, on its alternate buffer with no mouse,
  > turns the wheel into Up/Down, which the composer reads as history, and over an approval moves the selection.
  > Suggest capturing the mouse regardless of tmux's `mouse` option, or reading `#{mouse_any_flag}` of the pane
  > rather than the server option.

- **Two vendors read tmux's `mouse off` as meaning something about programs.** Codex decides capture from it.
  Claude, by research 130 §9's reading, prints advice to turn it on. Neither is Tortie's defect.
- **Codex 0.158 fetches `https://github.com/openai/plugins.git` at start.** The adversary's process table showed
  `git remote-https https://github.com/openai/plugins.git` under Codex, writing into the scratch `HOME`. It is a
  network read that no model turn caused. The build's probe states it, and turns it off if a config key does.
- **His running Codex background server is 0.159.0 while the client is 0.158.0.** The server updates itself.
- **The flag catalog says `--yolo` is "NOT present in codex-cli 0.147.0 --help"** (`flags.ts`). His panes resume
  with it, and the adversary's resume kept `permissions: YOLO mode`. The build re-reads both `--help` pages on
  0.158.0.
- **A broken third codex on his `PATH`** (§2.1). It is shadowed today. Nothing in Tortie is wrong about it.

## 10. What this round left behind

- **Model turns: 0. Tokens: 0.** Every Codex session record went to a scratch store:
  `scratchpad/p331/b/home/.codex`, `b/app-*/h/.codex` and `adv/home/.codex`.
- **Electrons: 2**, both B's, one at a time under the lock. Each was ended by `withElectron`, and the lock was
  released on the same command line. Neither run left a process of its own alive, by pid, at the end
  (`ourPidsAliveAfterTeardown: []`, `ourPidsAliveAtEnd: []` in both result files).
- **tmux:** B's and the adversary's scratch servers were ended, and their dead socket files removed. Every server was
  on a `p331-*` or `gmux-p331b-*` socket. His `-L gmux` server and his live Codex panes were read with `ps` and never
  signalled.
- **Nothing was installed** and no Codex update was accepted. No file under `/Users/gdc/gmux`, `/Users/gdc/codex`,
  `/Users/gdc/tortiedotsh` or `/Users/gdc/superset` was written. His `config.toml` was read as key counts.
- **This worktree cannot build as it stands.** `/private/tmp/wt-p331/node_modules` and `build/vendor` hold
  directories and 0 regular files (A, B and the judge each counted). The build re-copies them with `cp -Rc` from his
  checkout and confirms `build/vendor/specstory/bin/specstory --version` before it starts.
- **The evidence is in scratch, which does not survive a reboot.**

## 11. What this queues

**Phase 331, the build**, entered in `docs/BACKLOG.md`. Tier 3, a `fix`, so a patch, unreleased under his rule.

1. The codex row carries `-c tui.fullscreen_transcript=false` on its launch argv and its resume template, from one
   constant.
2. `agentExtrasOf` and `recoverLaunchExtras` share one helper that sets the registry's fixed launch tokens aside.
3. A boot pass recomposes every recorded Codex resume argv that lacks them, in Phase 215's rules.
4. The 0.147 notes and the flag catalog are re-read on 0.158.0.
5. `scroll.ts`'s stale header item is corrected.
6. `conformance:resume` gains one reading, that a Codex pane is not on the alternate screen, so the run owed after
   any Codex upgrade catches the next default change.
7. The app run drives the wheel over the composer and over an approval, at the parent and at HEAD.

No wheel-router change, no Claude change, no opt-back preset, and no change to tmux's `mouse` option.

## 12. The rulings it needs from him

1. **"Should every Codex run inline in Tortie?"** The build launches and resumes every Codex with `-c
   tui.fullscreen_transcript=false`, so the wheel, the scrollbar, drag-select, Capture and Read last lines work over
   the whole conversation, as they did on 0.147. It overrides a Fullscreen choice made in `/tui` or `config.toml`;
   he has none set. On a Mac without Homebrew or MacPorts tmux, it also replaces a fullscreen Codex whose own mouse
   scrolling works with an inline one. **Default:** yes, inline everywhere.
2. **"Should Tortie offer a 'Fullscreen view' launch preset for Codex** (`-c tui.fullscreen_transcript=true`, which
   wins because it comes later)?" **Default:** no preset in this phase. On his Mac a fullscreen Codex still turns the
   wheel into arrow keys that move approval choices, so a preset waits for a wheel route that is safe.
3. **"May the verifier launch Codex once under his own sign-in and Codex home**, in a scratch folder with zero
   turns, to confirm the override keeps Codex's shared background server (no `1 warning` footer)?" It adds a trust
   entry for that folder to his `config.toml`. **Default:** no. The claim rests on `daemon_startup.rs:63` and is stated
   as a limit.
4. **"May a verifier read the installed Claude Code bundle** (2.1.285, under `~/.local/share/claude`) to check
   whether Claude now asks tmux about the mouse too?" **Default:** no. Claude stays out of this phase, and a Claude
   report would get its own.
5. **"Should the problem be reported to OpenAI?"** **Default:** the text in §9 stays in this document and nothing is
   filed.
