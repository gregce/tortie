# Phase 325.1 — "2. a" — Tortie knows his own words by what he typed, not by when — SPEC

Written by the spec step on 2026-11-08 in `/private/var/tmp/tortie-wt/wt-p3251`, a detached worktree at origin/main
`de9ea8f2` ("docs(backlog): 353 landed, seven items; link its changelog"), which carries Phase 353 as landed
(`99e0d298`). **`git diff de9ea8f2` in the worktree must be exactly Phase 325.1's delta**, this file included.
origin/main moves while the phase runs (Phases 357.1, 361.1 and 360 run beside it, and 360 may edit
`src/main/sessions/core.ts`); nobody here rebases, pulls or merges, and the main session moves the tree at landing. The
charter is `docs/BACKLOG.md` "## Phase 325.1" (`:45025`), bound as written except where §0.1 says the tree or a
measurement wins, and through it "## Phase 325" (`:35573`), `build/p353/SPEC.md` (D325-1 to D325-10, M325 and M325-7,
§13 items 5 to 10, "### The move to main and the drop of 325") and 325 as built, kept at
`/private/var/tmp/tortie-wt/scratch/owed-p3251/`. His ruling of 2026-11-08 ("2. a"): ship the seven, and redo the eighth
so it checks what he actually typed instead of guessing from timing. His standing rulings bind: no regression against
today; just enough words; no tmux vocabulary in anything a person reads; "needs input" only from the session's behaviour,
never from his own input to it, AND a real question is never held by timing alone; nothing released, tagged,
version-bumped, archived or uploaded; his session count is allowed (2026-11-02), being `build/electron-run.mjs`'s
read-only `list-sessions` of `-L gmux` and nothing else.

| | |
| --- | --- |
| Subject | `fix(activity): know his own words by what he typed, not by when` (the entry's) |
| First body line | `Phase 325.1: his own words are known by what he typed` |
| Semver | Patch, unreleased, Mac only, released on his word |
| Lane | Build: Spec → Build (THREE builders, disjoint files) → Integrate → Verify (two lenses, reviewed together) → [Fix once → Reverify] → Commit |
| Tier | **3**: it decides when a session reads needs input for every agent Tortie starts (`CLAUDE.md:270`), he reported the misreading, and it reads his words where they enter main. A per-agent matrix over the committed captures, two independent methods at least, one an attack (§10) |
| Menus | **No change.** No surface is added, renamed or removed; `src/main/menu.ts` is edited by nobody (the integrator records its sha256 at the start and the end) |
| Contract | **No change.** No channel, no `SessionActivityUpdate` field, no schema, no `gmux.*` key, no `GMUX_*` name, no smoke mode. `docs/audits/contract-baseline.txt` does not move (`gate:contract` byte for byte) |
| `HELPER_USER_FLOOR` | **184 → 185** (`build/assert-electron-teardown.mjs:598`): `build/p3251/probe-p3251.mjs` reaches `build/electron-run.mjs` (obligation 1). `OPERATOR_ARGV_CEILING` stays 94 |
| CHANGELOG | One item under `## Unreleased`, `### Fixed` (§5), no commit link (the follow-up docs commit adds it) |
| Built parent | **Kept for you**: `/private/var/tmp/tortie-wt/scratch/p3251/spec/parent` is `de9ea8f2` (a `cp -Rc` of this worktree, `.git` removed, `node_modules` with the three WebGL hunks and `build/vendor` carried) with `out/` built by the spec step (`npm run build`, exit 0, 52.6 s). Use it as `P3251_PARENT_CHECKOUT`. Do not edit it; delete nothing in it |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `wt-p3571*`, `wt-p3611*`, `wt-p360*`,
  `wt-docs` or their scratch. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p3251/<role>/`, never under
  `/private/tmp`, which macOS cleans; a probe's `TMPDIR`, every scratch tmux server's `TMUX_TMPDIR` and every ablation's
  clone root (`P3251_SCRATCH`, `P313_SCRATCH`, `P328_SCRATCH`) point there too.
- **PRIVACY, BINDING.** What he types is held only in main's memory, per session, bounded, cleared on submit, at the
  session's end and at its cap; never logged, never written to disk, never sent to the renderer, the phone or a push,
  never in a probe's report beyond counts and lengths. Probes and tests type MADE-UP words a stand-in draws, never
  anything of his.
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** Name `tmuxSocket` on a
  launch whose census you want; a run's own tmux commands aim only at its scratch socket, with the checkout's vendored
  tmux (`build/vendor/tmux/bin/tmux`, 3.7b). A census finding naming a session your run did not make is his: note it and
  run once more.
- **No real agent runs, not even for a version.** Every agent is a stand-in (`build/p321/stand-in.mjs`, or
  `build/p318/stand-in.mjs` for codex) behind a scratch bare name drawing the committed screens; every launch hides
  every probed registry row but its stand-ins (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides(standIns))` from
  `build/hidden-agents.mjs`) and reads `agents:list` back (`standInsOnlyVerdict`), a run whose answer is not ok being
  UNREADABLE. **A real `gemini` sits in `/usr/local/bin` and a real `omp` in `/opt/homebrew/bin`** (read by name only,
  §2.8), folders the app's scan searches whatever its PATH, so gemini and omp are HIDDEN in every app run and never stood
  in; their rows are covered by the vitest matrix. `conformance:resume:capture`, which starts real agents, is not run by
  any role of this phase (§13).
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.claude.json`, `~/.codex`, any agent's or
  conversation store, his shell history's contents, or his live Tortie profile. Real data means the COMMITTED captures:
  `build/fixtures/questions/` (18 recordings, 1,238 windows, `labels.json`), `build/fixtures/reply/`,
  `src/main/activity/__tests__/fixtures/`, `build/fixtures/screen/keys-encoding.json`.
- His shell history is never written by us: every command that starts no Electron and needs no `/bin/ps` runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` with a scratch `HOME` and `ZDOTDIR`,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset (the spec step's wrapper is
  `/private/var/tmp/tortie-wt/scratch/p3251/spec/sb.sh`; copy it for your role). `/bin/ps` will not start under it, so
  the four native tests that start `/bin/ps` (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell
  that never exits" 1) fail inside it by design: name each, never run them outside it. What needs `/bin/ps`, `lsof`,
  ssh or Electron runs outside it with the same environment, and says so. Record ONLY `stat -f '%z %m' ~/.zsh_history
  ~/.bash_history` before and after every run (`743166 1793987027` and `23166 1790702242` at this step's start and end);
  never read the files. A move across an unblocked run: start nothing for 3 minutes and stat again; moved again is his;
  still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal. Never signal a probe while its own teardown runs. His Tortie (a bare
  `Tortie` process, pid 692 today) and his tmux server are never touched; his Tortie has the same bundle id as every build
  you run, so never send an Apple Event, run `osascript` or `open` an app. Every Electron goes through
  `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and socket. Every process you
  start ends in a `finally`; count Electrons once at the end with CLAUDE.md's command. No Simulator; nothing under `ios/`
  moves. No real Tailscale, DNS, APNs or ssh to a real host; a remote session is ONLY the loopback machine of
  `build/scratch-machine.mjs` (`scratchYard`, `scratchMachine`, the quiet shell and a scratch far home, as `probe:p340`
  builds it), never `build/with-scratch-machine.mjs`'s `isolated()`; never `smoke:remote` or `smoke:machines`.
- Never import a `build/` script to inspect it; read it as text. Importing `build/electron-run.mjs`,
  `build/hidden-agents.mjs`, `build/cdp-client.mjs`, `build/cdp-target.mjs` and the stand-ins to USE them is how a probe
  launches.
- The lock has three slots shared with the other phases: `zsh /private/tmp/tortie-ops/lock.sh try p3251-<role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap` or `finally`. Every probe, Electron run, package build and timing measurement holds one. `df -h /`
  before any build or clone; under 8 GB free, wait and report. Count `~/Library/Logs/DiagnosticReports` by NAME and mtime
  only, before and after every Electron run. npm runs with `npm_config_update_notifier=false`; never `npm install` or
  `npm ci` anywhere (this worktree's `node_modules` carries all three hunks of `patches/@xterm+addon-webgl+0.19.0.patch`,
  `addon-webgl.mjs` sha256 `e4ab05d2…`, and a `cp -Rc` of it carries them too).

## 0.1 What the entry got wrong or left open at this tree (the tree and the measurements win; each item binds)

1. **"The tap keeps … a bounded record" is kept, but not in the tap.** The record must be read by the verdict (activity)
   and written by four writers, of which the attach host is one (§4.4): the desk's tap, the phone's keys, the phone's
   paste and a restore's replay. So main keeps it BESIDE THE VERDICT, as a field of the session's activity state
   (`SessionState`, `src/main/activity/state-machine.ts:77`), fed by the tap and the other three; it is still main's
   memory, per session, and it goes with that state when the session ends (`forget`, `monitor.ts:455`). The attach host
   holds nothing (D3251-1).
2. **The tap is Phase 318's `onInput` and it carries the chunk.** `onInput?: (sessionId: string) => void`
   (`src/main/attach/attach-host.ts:190`), called once, after `client.pty.write(data)` (`:328`), under
   `req.machine === undefined && !isPaneReport(data)` (`:331-333`), wired in `core.ts:1217-1219` to
   `replyTurns.bump(sessionId, 'desk')`, pinned by `conformance:pocket` Y17 (`build/conformance-pocket.mjs:8784-8822`,
   which reads the call and its guard, never its arguments) and Y13 (one `'desk'` bump in `onInput`). 325.1 hands the
   same call the chunk it wrote. 325's counter (`src/main/attach/input-facts.ts`, counts only) is NOT re-added; its
   escape-sequence grammar (D325-1) is reused inside the record's reader (D3251-2).
3. **It reproduces at the parent, per agent** (§2.1, M1): `1. to cancel` / `2. x` typed and pasted into every committed
   idle input row read needs input in **3,660 of 4,740** cells at `de9ea8f2`'s shipping verdict: antigravity 104 of 104,
   claude 464 of 464, codex 824 of 824, gemini 40 of 40, grok 480 of 480, opencode 292 of 292, pi 392 of 392, qwen 1,064
   of 1,064; cursor 0 of 668 and omp 0 of 412, because `→` and `╰─` are outside `OPT1`'s mark set
   (`src/main/activity/screen.ts:74`), and his longer words, whose numbered rows are his second and third lines, read
   needs input 20 of 20 there and at a bash prompt.
4. **325 lost real questions to time, and shapes with them** (§2.2, M2; §2.3, M3). Re-measured with 325 applied to a
   scratch copy: Claude Code 2.1.280's trust gate, Codex's update prompt and antigravity's two run permissions were
   raised 0 of 20 times when drawn 0.2, 0.5 or 1.0 s after his last key, qwen's second permission 0 of 20 at 0.2 s, and
   gemini's trust gate at 12.4 to 13.2 s against the parent's 3.2 to 3.9 s; on 353's own trade scene 325 raised 0 of 20
   at every delay up to 1.2 s and 18 of 20 at 1.5 s. Claude Code's gate and qwen's permissions are Phase 321 SHAPES:
   325's `own` withheld `dialog = numbered || shaped` whole. 325.1 asks its rule of the numbered verdict only (D3251-6).
   Phase 321's shapes need no rule: their tail-0 clause refuses his words in an input box (321 measured 0 of 31,631).
5. **353's three stated limits were timing artefacts and go** (§2.4, M4): words typed ahead while the agent works
   (C16), words on a screen the agent repaints at rest (C17, 19 of 20 amber at the parent), and a pause longer than
   `QUIET_MS` before the completing character (C18) all read needs input at the parent and none at 325.1's prototype.
6. **Item 7 of 325's entry stays earned, and content makes it exact** (§2.4, C9; M325-7): a restored session whose
   replayed snapshot ends on gemini's committed trust gate reads needs input 20 of 20 at the parent; with the replay's
   own text in the record, 0 of 20, and gemini's own gate after his Enter is raised 20 of 20. The snapshot replay is
   typed by `typeIntoPane` (`src/main/restore/restore.ts:314-323`, called at `:1198`), never through the tap, so the
   restore hands the record what it replayed (D3251-10). The drift notice (`:1255`), the armed resume (`:1266`) and
   Phase 141's resume in place (`src/main/sessions/resume-in-place.ts:1215`) type one line each, which cannot make two
   numbered rows; they are not attributed, as 353 found.
7. **The phone types without the tap.** Phase 337's keys verb types by `send-keys -H` and named keys
   (`src/main/screen/keys.ts:398-418`) and Phase 348's paste by `paste-buffer -p` (`src/main/screen/paste.ts:193`), both
   straight to tmux. They are his words (the UI rule names his input, not his keyboard), and 353's status lens found the
   same gap as a major problem; both hand the record what they typed (D3251-8). Phase 318's reply writer is exempt by
   name (D3251-9).
8. **The echoed prompt stays as today**, because the record is cleared on submit (the entry's item 3): his
   dialog-shaped words, sent, then echoed by the agent and answered in a few rows inside the 24-row window, read needs
   input at the parent and at 325.1 (C11, 20 of 20 each). A stated limit, owed its own entry (Q2).
9. **Citations at this head**: `inferredVerdict` is `state-machine.ts:344-449` (the numbered line `:396`, the shapes
   `:397-400`, `const dialog = numbered || shaped;` `:401`, strong evidence `:406-415`, clause A `:424-429`, the dialog
   arm `:437-444`); `SessionState` `:77-197`, `freshState` `:217-243`, `agentHoldsTerminal` `:808`; `noteUserInput`
   `monitor.ts:535-541`, `noteGeometryChange` `:552-556`, `ensureState` `:481`, the verdict loop `:654-664`,
   `choiceUpdate` `:1224`; `BORDER` `screen.ts:73`, `OPT1` `:74`, `OPT2` `:75`, `HINT` `:76-77`, `QUEST` `:78`,
   `DIALOG_ROWS` `:81`, `dialogWindow` `:97`, `detectDialog` `:106-108`, `detectDialogRows` `:291-310`; the restore's
   `const { info } = outcome;` `core.ts:2113`, `this.liveIds.set(sessionId, info.sessionId);` `:2148`, with no await
   between them.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The record | Per session, beside the verdict: the lines he has typed or pasted and not sent, with a cursor, read from the bytes the terminal received (printable characters and a paste's text; control bytes and escape sequences only as the editing keys they are), at most 16,384 characters, cleared on submit, on Ctrl-C, at the cap and when the session ends. Main only; never logged, stored or sent |
| 2 | The match | A line he typed is ON THE SCREEN when consecutive rows, each with its border stripped and an optional mark that holds no letter or digit (the agent's prompt, a box, a quote mark), spell exactly that whole line with whitespace ignored. Never a substring of one row |
| 3 | The rule | A numbered dialog is his when the numbered verdict, asked again of the same screen with every character his lines drew replaced, reads no question. Asked beside the dialog line, of the numbered verdict only, never while the session is blocked, never of Phase 321's shapes. No clock anywhere in it |
| 4 | The writers | The desk's tap (the chunk `onInput` already sees), the phone's keys and paste (what each typed), and a restore (the text its replay printed). Phase 318's reply writer is exempt by name |
| 5 | The proof | Vitest over every committed window and question (the per-agent matrix, fed and unfed on one clock), a gate with in-memory self-tests, an ablation over the shipping source, and one app run per build, parent first, typing through the pane's own xterm |

Measured on a prototype of exactly this design (§2): his words grey in every one of 4,740 cells and every rest cell where
the parent reads them as a question; every recorded question raised exactly as the parent raises it at 0.2, 0.5, 1, 2
and 5 s after his last key; of 28,576 one-line records tried against every recorded numbered question, none held a
question unless the line was one of that question's own rows.

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D3251-1 | The record is `SessionState.ownWords: OwnWords` (`src/main/activity/state-machine.ts`), made by `freshOwnWords()` in `freshState`, written only through the monitor's `noteOwnWords(sessionId, data)` and `noteReplayedScreen(sessionId, text)` (each through `ensureState`, so a write before the first tick is held), read only by the rule. It goes when the state goes: `forget` (End, a dead pane, a release, leaving the list; claude's `SessionEnd` hook's `forget(…, true)` builds a fresh state, so his draft goes with the agent that ended) and `dispose`. No module-level map holds it | §0.1 item 1; entry mechanisms 1, 3, 4 ("cleared … when the session ends", "never leaves main") |
| D3251-2 | The reader `noteOwnWordsOn(words, data)` in a NEW pure leaf `src/main/activity/own-words.ts`, over code points, with 325's escape grammar (D325-1) and a line editor: **outside a bracketed paste** a printable character (not C0, DEL or C1) is inserted at the cursor; CR is a submit and CLEARS the record; ETX (Ctrl-C) clears it; LF (Ctrl-J) and ESC then CR or LF (Alt-Enter) break the line at the cursor; BS and DEL delete the character before the cursor (at a line's start they join it to the line above); CSI `D`/`C` with no parameter or `1`, and SS3 `D`/`C`, move the cursor one character; CSI `H`/`F` (no parameter or `1`), SS3 `H`/`F`, CSI `1~`/`7~` and CSI `4~`/`8~` move it to the line's start or end; CSI `3~` deletes the character at it. **Inside a bracketed paste** (CSI `200~` to CSI `201~`, its state kept per session across chunks) a printable character is inserted, CR, LF or CR LF break the line, TAB is a space, and nothing submits. **Everything else counts nothing and changes nothing**: every other C0 (TAB outside a paste, Ctrl-A, -E, -U, -W, -K among them), C1, every other CSI (Up, Down, modified arrows, function keys, focus and device reports, SGR mouse), an X10 mouse report (`ESC [ M` and its three raw bytes), OSC, DCS, SOS, PM, APC (to BEL or ST), every other SS3, and ESC with any other character (Alt and a key) | Entry mechanism 1 ("printable characters only, the paste's text, no control bytes, no escape sequences"); the cursor keys are read as the edits they are because a mid-line fix in each line otherwise leaves his words amber (C8c: 20 of 20 at the parent, 20 of 20 with the prototype's editor switched off, 0 with it); Up and Down are not modelled (C8b, a stated limit) |
| D3251-3 | `OWN_WORDS_MAX = 16_384` characters (code points, a line break counting one), declared once in `own-words.ts`: when one more character would pass it the record is cleared first, so a paste longer than the cap leaves its tail | Entry mechanism 3 ("on the record's cap"). The window can draw at most `DIALOG_ROWS` (24) × `POCKET_SCREEN_MAX_COLS` (512) = 12,288 characters; the phone's longest paste is `POCKET_PASTE_MAX_TEXT_BYTES` (16,384 bytes); Claude Code 2.1.287 and Codex 0.160.0 draw a long paste as one placeholder row (`build/fixtures/reply/claude-prompt-pasted-long-2.1.287.ansi`, `codex-prompt-pasted-long-0.160.0.ansi`) |
| D3251-4 | THE MATCH. A row's FORM is the row with the verdict's own border strip (`raw.replace(BORDER, '')`) and every whitespace character (JS `\s`, U+00A0 among them) removed; a record line's form is the same over its text. A record line whose form is empty or holds no letter and no digit is ignored (it cannot carry `OPT1`, `OPT2`, `HINT` or `QUEST`). A line is DRAWN on rows i..j (consecutive, none blank) when each row's form, after a MARK (a prefix holding no `\p{L}` and no `\p{N}`, possibly empty, the shortest one that completes the tile), continues the line's form exactly: row i's rest is a prefix of it, each next row's rest follows, and row j's rest ends it. Every character of every row's rest in such a tile is HIS. Wraps are tiles (word or hard), boxes are stripped, Claude Code's `❯` and U+00A0, Codex's `›`, gemini's and qwen's `>`, grok's `│ ❯`, opencode's `┃`, omp's `╰─` and cursor's `→` are marks | Entry mechanism 1 ("the spec chooses the exact match rule … the dialog's rows found verbatim"); the brief's "never a substring of one row"; every agent's input row read off its committed windows and the reply captures (§2.1, §2.8) |
| D3251-5 | THE RULE `dialogIsHisWords(screen, words)`: true when at least one of his characters is on the screen AND `detectDialogRows(<the same screen with each of his characters replaced by U+2591 ░>).atChoice` is false. No row becomes blank, so the window (`dialogWindow`, the last 24 rows after trailing blanks) is the same window; ░ is in no class `BORDER`, `OPT1`, `OPT2`, `HINT` or `QUEST` reads. It asks the ONE spelling of the predicate and never `detectDialog` (`conformance:choices` clause 3 allows one production caller of that, the state machine) | Entry mechanism 1 ("his own only when its text is what he typed") and 2. It also keeps his words that only FINISH rows the agent drew from raising (C4, 20 of 20 at the parent, 0 here), which an "every option row is his" rule would not; Q1 |
| D3251-6 | WHERE: in `inferredVerdict`, the line after `const dialog = numbered || shaped;` (which does not move): `const own = numbered && !shaped && st.state !== 'needs_input' && screen !== null && dialogIsHisWords(screen, st.ownWords);`, and the dialog arm reads `if (dialog && !own) {`. `own` is read nowhere else. A tick whose dialog is his reads as if no dialog were drawn (the count zeroed, a blocked session released only as the parent releases it, the weak tail) | Entry ("beside inferredVerdict, never replacing the numbered verdict or Phase 321's shapes"); §0.1 item 4 (never a shape); 353's arm A15 (never while blocked: his words cannot release a question a hook raised) |
| D3251-7 | THE DESK WRITER. `AttachHostOptions.onInput` becomes `(sessionId: string, data: string) => void`; the SAME one call, after the write, under the same guard, is `this.opts.onInput?.(req.sessionId, data)` (Y17 reads the call, not its arguments). Core's arrow keeps `replyTurns.bump(sessionId, 'desk')` first and adds `this.activity.noteOwnWords(sessionId, data)` (the integrator's seam S1) | §0.1 item 2; entry mechanism 1 |
| D3251-8 | THE PHONE WRITERS. `ScreenKeysDeps` and `ScreenPasteDeps` gain `noteOwnWords?(sessionId: string, data: string): void`. keys.ts calls it once, for a session on this Mac (`machine === null`), when the act typed (`result.any`), after the funnel and the grace, in a try of its own, with `ownBytesOf(input.keys)`: each text item's characters, and each named key as the bytes tmux sends for it in the normal mode, from a frozen table keyed by `POCKET_SCREEN_KEY_NAMES` (imported, never re-spelled): `Escape` 1b, `Tab` 09, `BTab` 1b5b5a, `Enter` 0d, `BSpace` 7f, `Up` 1b5b41, `Down` 1b5b42, `Left` 1b5b44, `Right` 1b5b43, `C-a` to `C-z` 01 to 1a, `PPage` 1b5b357e, `NPage` 1b5b367e. paste.ts calls it once, when the list succeeded (`pasted`), after the funnel, in a try of its own, with `ESC [ 200 ~` + the text + `ESC [ 201 ~`. The integrator wires both to `pocketCore?.activity.noteOwnWords` (seam S3) | §0.1 item 7; the bytes are `build/fixtures/screen/keys-encoding.json`'s 3.7b normal mode for the 27 names it measured, and the C0 rule for `C-b`, `C-f`, `C-k`, `C-n`, `C-p`, `C-q`, `C-s`, `C-v`, `C-x`, `C-y` |
| D3251-9 | Phase 318's reply writer (`src/main/reply/writer.ts`) hands nothing, named in the gate's `OWN_EXEMPT` with its reason: its say always ends with Return, a submit, so his message never stays unsent in an input row; its press types the agent's own single digit, of which no row can be made | 353's `COUNT_EXEMPT` (its fix round), kept |
| D3251-10 | THE RESTORE. `RestoreOutcome`'s `armed` and `transcript` arms gain `replayedTail?: string`, set in `restoreSessionInTmux` only after the replay's `typeIntoPane` succeeded (`restore.ts:1198`): the replayed body read back (`readFileSync`), its escape sequences removed (`stripAnsi`, `src/main/restore/command.ts:10`), its trailing blank lines dropped, its last `REPLAY_TAIL_ROWS` (24, the dialog window's own `DIALOG_ROWS`) lines; a read that fails leaves it undefined, and the replay then reads as at the parent. `restoreRecordOf` maps fields by name, so it is never stored. Core, immediately after `const { info } = outcome;` (`:2113`) and before `this.liveIds.set` (`:2148`), with nothing awaited between: `if (outcome.kind !== 'shell_only' && outcome.replayedTail !== undefined) this.activity.noteReplayedScreen(rec.id, outcome.replayedTail);` (seam S2). `noteReplayedOn(words, text)` reads the text as a bracketed paste followed by one line break, so his typing starts a fresh line | §0.1 item 6; 325's entry item 7 (earned, M325-7); 353's D325-8 and S5, done by content and not by a note |
| D3251-11 | `screen.ts`'s `BORDER` gains `export` (one word), so the match strips rows and lines exactly as the verdict does; `own-words.ts` uses it only as `.replace(BORDER, …)` (its `g` flag makes `.test` stateful) | One spelling of the strip; `conformance:choices` clause 4 reads `const BORDER = …` as a substring, which still matches |
| D3251-12 | A NEW GATE `conformance:ownwords` (`build/conformance-ownwords.mjs`, pure, spawns nothing, the TypeScript parser), its clauses O1 to O10 (§4.6), each asked again over in-memory copies with its rule broken, every copy red, and an unedited control green | Entry mechanism 5; `conformance:choices` clauses 18 to 24 are the precedent; the name is 353's, which never landed |
| D3251-13 | `ablation:p3251` (`build/p3251/ablation.mjs`): each clause taken out of the SHIPPING source in a clone, one at a time, the owning vitest row or gate clause red BY NAME, every file restored by sha256, an unedited control green first and last; arms A1 to A21 (§4.7), among them the four the brief names: a time window put back (A1, A2), the record logged (A3), the record not cleared on submit (A4), the match loosened to a substring of one row (A5) | Entry mechanism 5; `build/p325/ablation.mjs` (kept in `owed-p3251/pre-drop/`) is the shape |
| D3251-14 | `conformance:phonecopy`'s log rule (`build/p311/copy-drift.mjs:2850-3014`): `own-words.ts` joins `question.ts` as a leaf that may name NO log call at all; `PAYLOAD_WORDS` gains `ownWords`, `data` and `text`; two self-test mutations (a log call in the leaf, a log call in `monitor.ts` naming `ownWords`) beside the control | Entry mechanism 4 ("No payload in any log … conformance:phonecopy's rule for src/main/activity/") |
| D3251-15 | `conformance:pocket` Z7 (`:10252-10295` for keys, `:17997-18027` for the paste) AMENDED ON PURPOSE: a paste's text may reach the record's writer ONCE, after the act, beside `pasteRefusal(` and `loadWords(`; a text item's `.t` may reach `ownBytesOf(` ONCE; `ablation:p313` gains Z7w (a second read of the paste's text into the writer) red on Z7 | 353's fix round amended Z7 the same way for its counter |
| D3251-16 | ONE app run, `probe:p3251` (§8), one Electron per build, the parent first; `HELPER_USER_FLOOR` 184 → 185 | CLAUDE.md rule 1 ("one app run per phase") |
| D3251-17 | Nothing else moves: the numbered verdict's loop, its literals and line; the shapes and their gate; strong evidence and clause A; the release (`noteUserInput`, `activity:noteInput`, the renderer's gate at `src/renderer/state/sessions-slice.ts:1706-1716`); every constant and both cadences; no status, no copy, no surface, no menu, no channel | Entry "What is NOT"; 325's entry refusals |
| D3251-18 | His two questions are built on their defaults (§14): the rule of D3251-5 (Q1), and the record cleared on send (Q2) | The entry's own requirement 3, and the measured trade (§2.4, §2.5) |

## 2. What the spec step measured, how, and the numbers

Every run here was under the history block; none started an Electron, a tmux server, an agent or `/bin/ps`. Scratch,
scripts and results: `/private/var/tmp/tortie-wt/scratch/p3251/spec/` (`m3251-driver.ts` the scene driver, `logs/*.json`
the readings, `measure/parent/` the parent's test files, `proto/` the prototype, `p325/` 325 as kept). THREE scratch
copies of this worktree, each a `cp -Rc` with `.git` removed: `parent` (de9ea8f2, later built clean), `p325`
(`item-325.patch` applied with `--exclude=CHANGELOG.md --exclude=CLAUDE.md`, whose two docs hunks no longer apply after
353's docs commit) and `proto` (de9ea8f2 plus a scratch prototype of this design: `src/main/activity/own-words.ts`,
`export` on `BORDER`, the `ownWords` field and the `own` line). The driver runs each copy's OWN shipping
`nativeVerdict`, `worthProbing`, `foregroundToRead`, `noteForeground`, `inferredVerdict` and `commitVerdict` for one
session on a virtual clock, the monitor's per-tick order, tmux's whole-second activity stamp, the renderer's release, and
the foreground read for a row that lists a shape; 10 tick phases at 1 s and 2 s (20 runs a cell). "Fed" hands each
build's own-words entry his bytes; "unfed" hands nothing, and read **equal to the parent in every cell of B and C** at
both 325 and the prototype, so the comparison is one clock and one driver.

### 2.1 M1: his words, per agent (set A)

`1. to cancel` / `2. x` typed key by key (a line feed between lines) and pasted (bracketed, CR between lines) into the
input row of every committed `not-question` window that draws one (325's finders, read off the windows), one phase a
window spread over the ten, both cadences; and the resting window of every recording plus a bash prompt with three texts
(that one; `Do you want me to proceed?` / `1. Yes, go ahead` / `2. No, stop`; `Two ways to do this:` / `1. keep the
cache` / `2. drop it` / `Would you like me to pick one?`), each typed with line feeds, typed with Alt-Enter and pasted,
20 runs a cell.

| Agent | Windows with an input row | Cells | Parent needs input | 325 | 325.1 |
| --- | --- | --- | --- | --- | --- |
| antigravity | 26 | 104 | **104** | 0 | **0** |
| claude | 116 | 464 | **464** | 0 | **0** |
| codex | 206 | 824 | **824** | 0 | **0** |
| cursor | 167 | 668 | 0 (`→` is no mark of `OPT1`) | 0 | **0** |
| gemini | 11 (one, `a-gemini-0005`, already a question by itself, left out) | 40 | **40** | 0 | **0** |
| grok | 120 | 480 | **480** | 0 | **0** |
| omp | 103 | 412 | 0 (`╰─` is no mark of `OPT1`) | 0 | **0** |
| opencode | 73 | 292 | **292** | 0 | **0** |
| pi | 98 | 392 | **392** | 0 | **0** |
| qwen | 266 | 1,064 | **1,064** | 0 | **0** |
| all | 1,186 | 4,740 | **3,660** | 0 | **0** |

The rest cells (18 recordings and bash × 3 texts × 3 ways × 20 runs): the parent 20 of 20 in every cell except the
short text on cursor's three windows, omp's and bash (0 of 20, the same mark reason; the two longer texts 20 of 20
there); 325 0 everywhere; 325.1 0 everywhere. droid (not installed), deepseek and muse have no committed idle window;
the rule reads no agent, so they take the generic case (§10).

### 2.2 M2: every recorded question, drawn d s after his last key (set B)

He types `please look at the tests` (no submit) into the agent's own screen just before the question (composed into its
input row where it draws one), his last key at T; the question's own windows are drawn from T + d at their recorded
offsets (`labels.json`'s `first`), until his recorded answer. Raised of 20, and the median first needs-input tick in
seconds after the draw.

| Question (recording) | Read by | Parent, d = 0.2 / 0.5 / 1 / 2 / 5 s | 325 | 325.1 |
| --- | --- | --- | --- | --- |
| gemini trust gate (a) | numbered | 20/20 each, 3.2 / 3.9 / 3.4 / 3.4 / 3.4 | 20/20, **13.2 / 12.9 / 12.4** / 3.4 / 3.4 | = parent, every cell |
| qwen run permission 1 (a) | qwen's shape | 20/20, 4.7 / 5.7 / 5.0 / 5.0 / 5.0 | 20/20, 5.2 / 5.9 / 5.4 / 5.0 / 5.0 | = parent |
| qwen run permission 2 (a) | qwen's shape | 20/20, 4.2 / 4.9 / 4.4 / 4.4 / 4.4 | **0/20** at 0.2; then as the parent | = parent |
| antigravity run permission 1 (a) | numbered | 20/20, 3.2 / 3.9 / 3.4 / 3.4 / 3.4 | **0/20, 0/20, 0/20**; 20/20 at 2 and 5 | = parent |
| antigravity run permission 2 (a) | numbered | the same | **0/20, 0/20, 0/20** | = parent |
| Claude Code 2.1.280 trust gate (a) | Claude's shape | 20/20, 3.2 / 3.9 / 3.4 / 3.4 / 3.4 | **0/20, 0/20, 0/20** | = parent |
| Codex update prompt (a) | numbered | 20/20, 3.2 / 3.9 / 3.4 / 3.4 / 3.4 | **0/20, 0/20, 0/20** | = parent |
| gemini trust gate (b) | numbered | 20, 20, 19, 19, 19 of 20; 6.9 / 6.5 / 7.1 / 7.1 / 7.1 | as the parent, 7.2 / 6.9 / 7.1 | = parent |
| cursor ×5, opencode's outside folder, antigravity's folder trust | (no reading at this head) | 0/20 at every delay | 0/20 | 0/20 |

The last row is Phase 321's fix round (their shapes removed), the same at all three builds; not this phase's.

### 2.3 M3: 353's trade scene (set D)

antigravity at rest (`a-antigravity-0032`), `please look at the tests` typed, antigravity's numbered run permission drawn
d s after his last key, the pane silent or writing every 0.25 s before it; raised of 20.

| d (s) | 0.1 | 0.2 | 0.5 | 1 | 1.2 | 1.5 | 2 | 3 | 5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| parent (silent and writing) | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 |
| 325 | **0** | **0** | **0** | **0** | **0** | **18** | 20 | 20 | 20 |
| 325.1 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 |

### 2.4 M4: the attack rows (set C), needs input or raised of 20

| Row | Parent | 325 | 325.1 |
| --- | --- | --- | --- |
| C1 his unsent line equals a row of the question the verdict does not need (antigravity's `4. No, cancel`): raised | 20 | 20 | 20 |
| **C1b his unsent line equals the ONLY `OPT1` row of Claude's numbered trust gate: raised** | 20 | 20 | **0, the residual (Q1)** |
| C2 his unsent line a substring of that row (`Yes, I trust`): raised | 20 | 20 | 20 |
| C2b his unsent line holds that whole row inside a longer line: raised | 20 | 20 | 20 |
| C3 his dialog-shaped words SENT (CR), then the agent draws the same rows: raised | 20 | 20 | 20 |
| C3b the same, cleared with Ctrl-C: raised | 20 | 20 | 20 |
| **C3c the same, NOT sent: raised** | 20 | 20 | **0, the residual (Q1)** |
| C4 his `esc to cancel` / `do you want` under the agent's numbered prose: needs input | 20 / 20 | 0 / 0 | **0 / 0** |
| C5 his words left in the row while the agent draws a real question above them: raised after the draw | 20 | 20 | 20 |
| C5 (his words alone, before it): needs input | 20 | 0 | **0** |
| C6 a paste split over two messages | 20 | 0 | **0** |
| C7 a typo erased with Backspace | 20 | 0 | **0** |
| C8 an arrow edit in the second line only | 20 | 0 | **0** |
| C8b Up, then edits in both lines (a vertical move) | 20 | 0 | **20, a stated limit** |
| C8c a mid-line fix with Left in each line, one line at a time | 20 | 0 | **0** |
| C20 committed text in two chunks and a line feed (an IME or dictation commit) | 20 | 0 | **0** |
| C22 each of his lines drawn behind the agent's own `>` | 20 | 0 | **0** |
| C9 a restore replaying gemini's trust gate (M325-7): needs input | 20 | 0 | **0** |
| C9b then his Enter and gemini's own gate: raised | 20 | 20 | 20 |
| C11 his words sent and echoed by the agent | 20 | 20 | **20, a stated limit (Q2)** |
| C12 long lines wrapped at 60 columns | 20 | 0 | **0** |
| C14 a digit, `y`, Enter, an arrow or Esc answering, the next question 30, 400 and 1,000 ms later: raised | 20 each | 20 each | 20 each |
| C15 his command and Enter in a shell, then a new program's gate: raised | 20 | 20 | 20 |
| C16 typed ahead while the agent works, it finishes with his words drawn (353 §13 item 5) | 20 | 20 | **0** |
| C17 his words while the agent repaints its footer every 5 s (353 §13 item 5) | 19 | 19 | **0** |
| C18 a 1.5 / 2.5 / 4 s pause before the completing character (353 §13 item 6) | 20 / 20 / 20 | 0 / 6 / 19 | **0 / 0 / 0** |

### 2.5 M5: the corpus boundary (which typed lines can hold a real question)

Every committed screen the numbered verdict reads as a question (9 labelled question windows, 2 `not-question` windows
it reads as questions, and the 5 numbered fixtures `claude-workspace-trust.txt`, `antigravity-run-permission.txt`,
`gemini-trust-gate.txt`, `claude-permission-prompt.txt`, `codex-signin-choice.txt`: 16) against every distinct inked row
of every committed window and of those fixtures, plus 16 short answers and texts (`y`, `1`, `a`, `Yes`, `No`, `cancel`,
`to cancel`, `Esc to cancel`, `continue`, …): 1,786 one-line records, **28,576 checks**
(`logs/proto-corpus3.json`). **56 pairs held a question, and every holding line was a whole row of that very
question** (its border stripped, a letter-free mark allowed): 2 to 4 rows each, being the rows that alone carry one of
its predicates; every one of the 16 can be held so; no other line held any question, and no short answer held any. (A
first run also put the unnumbered `antigravity-trust-gate.txt` and `muse-trust-gate.txt` in the list, where the rule is
never asked; they were taken out.)

### 2.6 M6: cost (prototype, `proto/src/main/activity/__tests__/m3251-corpus.test.ts`)

The rule runs only on a capture where the numbered verdict fired, no shape did, the session is not blocked and the
record holds a line: 14 µs with a one-line record, 20 µs with three lines, 98 µs with 24, 88 µs with a full 16,384, 76 µs
on his own words (Claude's numbered trust gate the screen). The reader: 0.13 µs a key, 92 µs a 4 KB paste (325's counter
0.03 µs and 27.5 µs). Six captures a tick at most (`MAX_CAPTURES_PER_TICK`, `monitor.ts:97`).

### 2.7 M7: the parent's own tests for the tap, the phone writers and the verdict

`node node_modules/vitest/vitest.mjs run` at the parent copy over `attach-host.test.ts` (the `onInput` rows: once per
write from a local client right after it, never for a report, never remote, never for another sender), 
`p3201-route-remote-input.test.ts`, `core-wiring.test.ts`, `keys.test.ts`, `p348-paste.test.ts`, `p312-choices.test.ts`,
`p321-shapes.test.ts`, `p321-masking.test.ts`, `signals.test.ts`, `monitor.test.ts`: **10 files, 355 tests, exit 0**.
And 325 as kept, in its copy: `p325-own-words.test.ts` 39 of 39 (its sweep 4,744 cells, 3,660 amber by its frozen
pre-321 parent rule, 0 at 325; its trade lost 20 of 20 at 0.1, 0.5 and 1 s; its M325-7 row raised the replayed gate
through the shipping monitor class with no note).

### 2.8 M8: the paths his words take, read and run

- **The desk.** Every byte the window sends a local session enters main at `attach-host.ts:314-335`; reports leave by
  `sendReport` on the same channel and are filtered by `isPaneReport` (`src/shared/pane-report.ts`) before `onInput`.
  Typed keys are one `onData` chunk each (`TerminalPane.tsx:442-450`); a desk paste is ONE chunk, xterm's own encoding,
  read in the shipped bundle (`node_modules/@xterm/xterm/lib/xterm.mjs`): `function Al(s){return
  s.replace(/\r?\n/g,"\r")}` and `function kl(s,t){return t?"\x1B[200~"+s+"\x1B[201~":s}`. A file drop and an
  Architecture delivery are `term.paste` (`src/renderer/terminal/drop/insert.ts:67-75`, its fallback writing the markers
  itself); an IME or dictation commit arrives as committed text; text queued while scrolled back goes after copy mode is
  left (`surface.ts:840`, `:925`). All of it is HIS, and all of it reaches the tap.
- **The phone.** keys (`keys.ts:279-296`, `send-keys -H` and names) and paste (`paste.ts:193`, `paste-buffer -p`) type
  without the tap and are his; 318's say and press (`writer.ts`) are his and exempt (D3251-9).
- **Tortie's own text.** `typeIntoPane` (`restore.ts:314-323`): the snapshot replay (` cat <path>; printf <sep>` and
  Enter, `command.ts:87-89`) prints the old screen and is attributed (D3251-10); the drift notice, the armed resume and
  Phase 141's resume in place are one line each.
- **Where the record is never read**: a session on another machine (the tap's call is local-only, and
  `remote-sessions.ts:1180` never produces needs input), the hook's native verdict and Codex's title oracle (they speak
  first: `monitor.ts:661-663`).
- **The scanned folders**, by name only: `/usr/local/bin/gemini` and `/opt/homebrew/bin/omp` exist; no other agent name
  sits in `/opt/homebrew/bin` or `/usr/local/bin`.

### 2.9 M9: the built parent

`npm run build` in `scratch/p3251/spec/parent` (the measurement files moved out first): exit 0, 52.6 s; `gate:electron`
583 files, 184 reach the helper against a floor of 184; `gate:background` 32 of 32; `gate:simulator` 5 of 5;
`gate:knownhosts` 613 files; `assert-hermetic-checks` 284 check scripts, 1,192 test files; `conformance:harnessprobes`
6 clauses and 16 ablations; stapler self-test 31, 18, 28; the contract inventory byte for byte.

## 3. The tree at this head, re-read (what each builder starts from)

| What | Where, at `de9ea8f2` |
| --- | --- |
| The tap | `src/main/attach/attach-host.ts`: `onInput` option `:168-190`, `AttachClient` `:215-239`, the listener `:313-336` (the remote road `:322-327`, the write `:328`, the call `:331-333`); its tests `src/main/attach/__tests__/attach-host.test.ts:579-672` |
| Core's wiring | `src/main/sessions/core.ts`: the attach host's options `:1206-1220` (`routeRemoteInput` `:1213`, `onInput` `:1217-1219`); the restore wrapper `:2082` (`restoreSessionInTmux`), `const { info } = outcome;` `:2113`, `this.liveIds.set(…)` `:2148`; `activitySessions` `:1451-1466`; the 318 test that lifts the arrow `src/main/reply/__tests__/core-wiring.test.ts` |
| The monitor | `src/main/activity/monitor.ts`: `forget` `:455-479`, `ensureState` `:481-488`, `noteHookEvent` `:507-527`, `noteUserInput` `:535-541`, `noteGeometryChange` `:552-556`, `runTick` `:590-707` (verdict `:661-664`), `choiceUpdate` `:1224-1274`, `captureScreens` `:1322-1348` |
| The verdict | `src/main/activity/state-machine.ts`: `SessionState` `:77-197`, `freshState` `:217-243`, `inferredVerdict` `:344-449`, `weakVerdict` `:457-478`, `releaseNeedsInput` `:485-495`, `agentHoldsTerminal` `:808-817` |
| The screen | `src/main/activity/screen.ts`: `normalizeCapture` `:41-45`, `BORDER` `:73`, `OPT1` `:74`, `OPT2` `:75`, `HINT` `:76-77`, `QUEST` `:78`, `DIALOG_ROWS` `:81`, `dialogWindow` `:97-104`, `detectDialog` `:106-108`, `detectDialogRows` `:291-310`, `detectShapes` `:655-665` |
| The phone | `src/main/screen/keys.ts`: `ScreenKeysDeps` `:164-195`, `keysRefusal` `:246-270`, `localArgvs` `:279-296`, the act `:398-418`, the funnel `:426-432`, the grace `:436-442`; `src/main/screen/paste.ts`: `ScreenPasteDeps` `:83-98`, the act `:211-221`, the funnel `:227-233`; `src/main/capabilities.ts`: `createScreenKeys` `:435-452`, `createScreenPaste` `:454-466`; `POCKET_SCREEN_KEY_NAMES` `src/shared/ipc/pocket.ts:2109-2114`; tests `src/main/screen/__tests__/keys.test.ts`, `p348-paste.test.ts` |
| The restore | `src/main/restore/restore.ts`: `RestoreOutcome` `:134-200`, `restoreRecordOf` `:261-301`, `typeIntoPane` `:314-323`, `restoreSessionInTmux` `:943`, the replay `:1180-1209`, the arms `:1282-1306`; `stripAnsi` `src/main/restore/command.ts:10`, `buildSnapshotReplayCommand` `:87-89`; `resolveSnapshot` `src/main/restore/snapshots.ts:485-512` |
| The release (unchanged) | `src/main/ipc.ts:187-189` (`activity:noteInput`); `src/renderer/state/sessions-slice.ts:1706-1716`; `TerminalPane.tsx:442-455` |
| Gates beside it | `build/conformance-choices.mjs` (clause 1 `:258-274`, 2 `:280-291`, 3 `:293-306`, 4 `:317-334`, 19 `:883-960`, 20 `:963-981`, 21 `:983-1008`); `build/p311/copy-drift.mjs:2850-3014`; `build/conformance-pocket.mjs` Y13 (`:8608-`), Y17 (`:8784-8822`), Z7 (`:10252-10295`, `:17997-18027`); `build/ablation-p313.mjs`; `build/p312/ablation.mjs`, `build/p321/ablation.mjs` (its needle `'  const dialog = numbered || shaped;'` at `:286` must still match once), `build/p328/ablation.mjs`; `build/assert-electron-teardown.mjs:598` |
| The stand-in | `build/p321/stand-in.mjs`: ops `:459-497`, the input echo `:501-519` (printable text, CR and LF a new line and never a submit, BS and DEL, Ctrl-U, every escape sequence dropped); `STAND_IN_AGENTS`/`BARE_NAME` `:94-112` (no codex: `build/p318/stand-in.mjs` stands in for claude and codex) |
| 325 as kept | `/private/var/tmp/tortie-wt/scratch/owed-p3251/` (`item-325.patch`, `pre-drop/` with 30 files, `README.md`): reusable as text, never as the rule: the escape grammar of `input-facts.ts`, the scene driver and `INPUT_ROW` finders of `p325-own-words.test.ts`, the clone-and-restore shape of `build/p325/ablation.mjs`, the TS-parser clauses of `build/conformance-ownwords.mjs`, and `build/p353/probe-status.mjs`'s dropped arms S-a to S-e (the page kit that types through the pane's own xterm, the restore arm) |
| This step's prototype | `/private/var/tmp/tortie-wt/scratch/p3251/spec/proto/src/main/activity/own-words.ts` and its tests; `/private/var/tmp/tortie-wt/scratch/p3251/spec/m3251-driver.ts`. Read as text; nothing there is committed |

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The record and its reader (builder `words`)

`src/main/activity/own-words.ts` (new, pure; imports `BORDER` and `detectDialogRows` from `./screen` and nothing else;
no log call; no clock):

```ts
export const OWN_WORDS_MAX = 16_384;
export interface OwnWords { lines: string[][]; col: number; size: number; inPaste: boolean } // or an equivalent shape
export function freshOwnWords(): OwnWords;
export function noteOwnWordsOn(words: OwnWords, data: string): void;   // D3251-2, D3251-3
export function noteReplayedOn(words: OwnWords, text: string): void;   // D3251-10: a paste of `text`, then a line break
export function dialogIsHisWords(screen: string, words: OwnWords): boolean; // D3251-4, D3251-5
```

`state-machine.ts`: `SessionState` gains `ownWords: OwnWords` (its doc says what is held, that it never leaves main and
that nothing logs it), `freshState` sets `ownWords: freshOwnWords()`. `monitor.ts` gains, beside `noteUserInput` and
`noteGeometryChange`:

```ts
noteOwnWords(sessionId: string, data: string): void { noteOwnWordsOn(this.ensureState(sessionId).ownWords, data); }
noteReplayedScreen(sessionId: string, text: string): void { noteReplayedOn(this.ensureState(sessionId).ownWords, text); }
```

Each commits nothing, captures nothing, reads no `ps`, raises and releases nothing, names no log call.

### 4.2 The match and the rule (builder `words`)

As D3251-4 and D3251-5, exactly. In words a builder can test: for every line of the record whose form holds a letter or
a digit, for every row i of the screen, try the marks of row i from the shortest; the first that lets rows i, i+1, …
spell the line's whole form (each next row with its own shortest mark that continues it, no blank row inside) is a tile;
the characters from each row's rest to the end of its border-stripped text are his. Union the tiles of every line and
start row. No tile → false. Otherwise build the counterfactual capture (each row unchanged except his characters, each
replaced by ░) and answer `!detectDialogRows(counterfactual).atChoice`. The prototype's `tile` and `hisWordsMadeIt` do
exactly this (`proto/src/main/activity/own-words.ts`).

### 4.3 The verdict's seam (builder `words`)

D3251-6, in `inferredVerdict`, with a comment naming this SPEC and the UI rule; the dialog arm `if (dialog && !own) {`;
`noteAgentLeft` and `noteReturn` do NOT touch the record (his draft is cleared by his own Enter, which a resume needs).
Nothing else in the file moves: `ablation:p321`'s needle `'  const dialog = numbered || shaped;'` and `ablation:p328`'s
needles match exactly once still.

### 4.4 The writers (builder `writers`; the seams are the integrator's)

1. `attach-host.ts`: D3251-7; the option's doc rewritten in just enough words (it hands the chunk to main's record of
   what he typed; the host reads nothing of it; never for a report; never remote).
2. `keys.ts`: D3251-8; `ownBytesOf(keys)` reads each `.t` through `push(` into a list joined with `''` (no template, no
   array literal, no `+`: Z7's own rule), and its named-key table is `Object.freeze`d, keyed by `POCKET_SCREEN_KEY_NAMES`.
3. `paste.ts`: D3251-8, the one extra read of `input.text` being the writer's argument.
4. `restore.ts`: D3251-10; `REPLAY_TAIL_ROWS = 24` declared once with its reason; `replayTailOf(path)` names no log call
   and reads nothing but the replayed body.

### 4.5 The integrator's seams (`src/main/sessions/core.ts`, `src/main/capabilities.ts`)

- **S1** (`core.ts:1217-1219`): `onInput: (sessionId, data) => { replyTurns.bump(sessionId, 'desk');
  this.activity.noteOwnWords(sessionId, data); }`, its comment saying the chunk goes to main's record of what he typed and
  nowhere else. `src/main/reply/__tests__/core-wiring.test.ts` lifts this arrow over a `this` of `{}`: it gains an
  `activity` stub and asserts the bump first and the note second (`[['bump','s1','desk'], ['words','s1',data]]`), so
  removing the bump still reddens it (353's file 1, the same consequence).
- **S2** (`core.ts`, immediately after `:2113`): D3251-10's line.
- **S3** (`capabilities.ts:435-466`): `createScreenKeys({ …, noteOwnWords: (sessionId, data) =>
  pocketCore?.activity.noteOwnWords(sessionId, data) })` and the same arrow for `createScreenPaste`.

### 4.6 The gate: `conformance:ownwords` (builder `words`)

`build/conformance-ownwords.mjs`, pure, the TypeScript parser over the source (comments are trivia), each clause a
function of the tree asked once and then over in-memory copies with its rule broken one way at a time, every copy red;
an unedited control green; a summary line naming the clauses and the self-tests.

| Clause | Rule |
| --- | --- |
| O1 | THE WRITERS AND NO OTHER: in production, the monitor's `noteOwnWords` is called (as `….activity.noteOwnWords(`) exactly three times, by core.ts's attach-host `onInput` arrow and by capabilities.ts's two arrows (keys, paste), each an arrow of two parameters calling `pocketCore?.activity.noteOwnWords(` with them, and the verbs' own `deps.noteOwnWords?.(` once each in keys.ts and paste.ts (O9); `noteReplayedScreen(` exactly once, in core.ts, after `const { info } = outcome;` and before `this.liveIds.set(sessionId, info.sessionId)` with no `await` between; `noteOwnWordsOn(` and `noteReplayedOn(` only in monitor.ts, once each |
| O2 | THE TAP: attach-host.ts calls `onInput` once, as `?.(req.sessionId, <the identifier pty.write is handed>)`, after that write and under the Y17 guard; `onInput` is typed `(sessionId: string, data: string) => void` |
| O3 | NO CLOCK: own-words.ts names no `Date`, `performance`, `setTimeout`, `setInterval`, `now`, `activityAt`, `QUIET_MS` or identifier ending `_MS`; `dialogIsHisWords` has exactly two parameters; the `own` initializer names `numbered`, `shaped`, `st.state`, the literal `'needs_input'`, `screen`, `dialogIsHisWords` and `st.ownWords`, and nothing else (no `ctx`, `pane`, `quiet`, `reflowing`, `now`) |
| O4 | NEVER LOGGED, NEVER LEAVES MAIN: own-words.ts names no log call and imports only `./screen`; no log call in attach-host.ts's input listener, core.ts's `onInput` arrow and the method holding S2, monitor.ts's two methods, capabilities.ts's two arrows or restore.ts's `replayTailOf` names `data`, `text`, `ownWords`, `replayedTail` or `input`; no file under `src/renderer`, `src/preload`, `src/shared`, `src/main/pocket`, `src/main/push` or `src/main/alerts` names `ownWords`, `OwnWords`, `noteOwnWords`, `noteReplayedScreen`, `replayedTail` or `dialogIsHisWords` |
| O5 | THE RECORD FORGETS: `OWN_WORDS_MAX = 16_384` declared once; the reader's carriage-return-outside-a-paste branch and its ETX branch reach the clear; the record is a field of `SessionState`, made in `freshState`, and no module-level `Map`, `Set` or `let` in own-words.ts or monitor.ts holds an `OwnWords` |
| O6 | WHOLE LINES ONLY: own-words.ts compares a row's form with a record line only by `startsWith(` over successive rows and a final position equal to the line's length; it calls no `includes(`, `indexOf(`, `lastIndexOf(`, `search(` or `match(` between them; its mark test names `\p{L}` and `\p{N}` |
| O7 | BESIDE THE VERDICT: `const dialog = numbered || shaped;` unchanged; `own` declared once, the next statement, in `inferredVerdict`; read once, in the dialog arm's `dialog && !own`; own-words.ts calls `detectDialogRows(` exactly once and never `detectDialog(` or `detectShapes(`; `dialogIsHisWords` assigns nothing through its parameters |
| O8 | THE REPLAY'S ROWS: restore.ts's `REPLAY_TAIL_ROWS` literal equals screen.ts's `DIALOG_ROWS` literal; `replayedTail` is assigned only after the replay's `typeIntoPane` resolved |
| O9 | THE PHONE'S BYTES: keys.ts's named-key table has exactly the keys of `POCKET_SCREEN_KEY_NAMES` (imported); `noteOwnWords?.(` is called once in keys.ts and once in paste.ts, each after that file's one `noteUserInput(`, inside the act's success test, in a try of its own |
| O10 | THE EXEMPT, NAMED: every production file that calls `noteUserInput(` (the desk's funnel, called wherever his input lands) also calls a record writer (`noteOwnWords`: keys.ts, paste.ts, capabilities.ts) or is named in `OWN_EXEMPT` with its reason: `src/main/ipc.ts` (the renderer's release; the desk's words reach the record through the tap) and `src/main/reply/writer.ts` (D3251-9). A new caller fails by name |

O1 and O9's wiring halves read red at a builder's tree until the integrator's S1 to S3: the builder reports them by name
and proves them on its self-tests, which plant the seams in memory.

### 4.7 The attack: `ablation:p3251` (builder `words`)

`build/p3251/ablation.mjs`, the shape of `owed-p3251/pre-drop/build/p325/ablation.mjs`: a `cp -Rc` clone of `src/`,
`build/fixtures/`, `vitest.config.ts`, `package.json` and the tsconfigs under `P3251_SCRATCH` (required; refuse a root
under `/private/tmp`), `node_modules` symlinked; each arm's needle matches the shipping source exactly once; its owners
(vitest rows by name, gate clauses by id) each go red; other reds printed, not failures; every edited file restored and
checked by sha256 before the next arm; the worktree's bytes asserted unmoved at the end; the clone removed in a
`finally` and on a signal; `P3251_ONLY` picks arms.

| Arm | The plant | Owners |
| --- | --- | --- |
| A1 | A TIME WINDOW PUT BACK: `own` gains `&& ctx.now - pane.activityAt <= QUIET_MS` | p3251 "his words over every committed idle window never read needs input", O3 |
| A2 | TIME INSTEAD OF CONTENT: `dialogIsHisWords(screen, st.ownWords)` replaced by "the record holds a line and the pane wrote within `QUIET_MS`" | p3251 "every recorded question drawn 0.2, 0.5 and 1 s after his last key is raised as with no record", p3251 the trade scene, O3 |
| A3 | THE RECORD LOGGED: `getLog('activity').info('own', { ownWords })` planted in `noteOwnWords` (and, a second arm, any log call in own-words.ts) | `conformance:phonecopy`, O4 |
| A4 | NOT CLEARED ON SUBMIT: the carriage-return-outside-a-paste branch no longer clears | own-words "a carriage return outside a paste clears", p3251 "his words sent, then the agent draws the same rows: raised" (C3), O5 |
| A5 | LOOSENED TO A SUBSTRING OF ONE ROW: the tile replaced by "a row's form includes the line's form, or the line's form includes the row's" | own-words "a line holding a question's row inside it holds nothing" (C2b) and "a substring of a row holds nothing" (C2), O6 |
| A6 | THE COUNTERFACTUAL DROPPED: any tile makes the dialog his | p3251 "his words in the row, a real question drawn above them: raised" (C5) |
| A7 | THE MARK LOOSENED: letters allowed in a mark | own-words "the agent's own words before his line are no mark" (gemini's `Do you trust the files in this folder?` with his line `trust the files in this folder?`: raised) |
| A8 | ASKED WHILE BLOCKED: `st.state !== 'needs_input'` dropped | p3251 "a question a hook raised over his words is never released by them" |
| A9 | A SHAPE WITHHELD: `!shaped` dropped | p3251 "a screen both numbered and shaped, its rows his, is raised" (synthetic) |
| A10 | THE CAP REMOVED | own-words cap rows, O5 |
| A11 | CTRL-C NO LONGER CLEARS | own-words, p3251 C3b |
| A12 | THE PASTE STATE RESET EACH CHUNK | own-words "a paste split over two chunks", p3251 C6 |
| A13 | THE BORDER STRIP ON RECORD LINES DROPPED | p3251 "a restore replaying gemini's boxed trust gate reads no needs input" (C9) |
| A14 | S2 REMOVED (core.ts) | O1 |
| A15 | A FIFTH WRITER: `noteOwnWords(` planted in another production file | O1 |
| A16 | THE CURSOR KEYS IGNORED | own-words cursor rows, p3251 C8c |
| A17 | BACKSPACE NO LONGER ERASES | own-words, p3251 C7 |
| A18 | ALT-ENTER NO LONGER A LINE BREAK | own-words |
| A19 | THE KEYS WRITER REMOVED | O9, keys.test "the record is handed what was typed" |
| A20 | THE PASTE WRITER REMOVED | O9, p348-paste "the record is handed the paste" |
| A21 | THE REPLAY TAIL NOT SET | p3251-replay-tail "a replay hands its last 24 rows", O8 |

### 4.8 Tests

**`words`**:
- `src/main/activity/__tests__/own-words.test.ts` (new): the reader, one row per class of D3251-2 (every byte class
  inside and outside a paste; a report alone and beside a key; SGR and X10 mouse with printable raw bytes; a paste split
  over two chunks; CR LF in a paste; the cursor keys in both CSI and SS3 forms and with a modifier (ignored); Ctrl-C,
  CR; BS at a line's start; wide, combining and astral characters); the cap (one past clears; a paste longer than the
  cap keeps its tail); the replay entry; the match (every agent's mark from its committed windows and the reply captures,
  boxes, wraps at word and hard boundaries, a blank row breaks a tile, a line with no letter or digit ignored, C2, C2b,
  A7's row); **the corpus boundary** of §2.5 driven over the committed files with the property asserted (every holding
  line a whole row of its question) and the counts printed; the cost, printed, bounded generously.
- `src/main/activity/__tests__/p3251-own-words.test.ts` (new): the shipping state machine on a virtual clock, this
  SPEC's driver (`m3251-driver.ts`, rewritten in the house style), every scene run FED and UNFED and compared tick for
  tick (unfed is the parent's reading, by construction: an empty record answers false): set A over every committed idle
  window (fed never needs input; unfed reads 3,660 of 4,740, the row failing if fewer than half, or the row proves
  nothing); set B per recorded question and delay (fed raised exactly as unfed, the same first tick); set C row by row
  with §2.4's expectations, the stated limits asserted as limits (C8b and C11 equal unfed; C1b and C3c held); set D; the
  monitor class rows (a replayed screen noted before the first tick, held, then his Enter and the agent's own gate raised;
  a hook-raised question over his words never released by them; his words in a seventh session while six are blocked;
  the two drivers agree tick for tick). **Every existing row in `signals.test.ts`, `p312-*.test.ts`, the `p321-*` files,
  `p328-writes-without-drawing.test.ts`, `monitor.test.ts`, `reflow.test.ts`, `turn-boundary.test.ts`,
  `p318-monitor.test.ts` and the Phase 141 tests stays green unchanged**; a row that must change is a finding.

**`writers`**:
- `attach-host.test.ts` (new rows only; the existing six `onInput` rows unchanged, a one-parameter callback still being
  assignable): the chunk handed is the chunk written, byte for byte, for a key, a bracketed paste and a chunk holding a
  report and a key; nothing for a report alone; nothing for a remote client.
- `keys.test.ts` (new rows): the writer handed `ownBytesOf` once after an act that typed, in order after the funnel;
  nothing after a refusal, a `changed`, a failed act or a session on another machine; the named-key table against
  `build/fixtures/screen/keys-encoding.json`'s 3.7b normal mode for the names it holds, and the C0 rule for the rest.
- `p348-paste.test.ts` (new rows): the writer handed the bracketed paste once after a paste that landed; nothing after a
  refusal or a failed list.
- `src/main/restore/__tests__/p3251-replay-tail.test.ts` (new): a replay hands its last 24 plain rows (escape sequences
  stripped, trailing blanks dropped); nothing for `shell_only`, a failed replay, no snapshot, or an unreadable body;
  `restoreRecordOf` never carries it.

**INTEGRATOR**: `core-wiring.test.ts` per S1. `gate:checks` runs because test files are added.

### 4.9 The stand-in (builder `probe`)

`build/p321/stand-in.mjs`, existing ops byte for byte (`probe:p321` and `probe:p353:status` import it): its input echo
gains bracketed-paste state across chunks (the markers dropped, a CR or LF between them a new line), the line editor of
D3251-2 for Left, Right, Home, End, Delete and Backspace (so the row it draws after a mid-line fix is what an agent's
editor draws; today it drops every escape sequence and would append), and a new `{ op: 'input', on, submit: true }`
under which a CR outside a paste clears its input row (a submit, as an agent's), while without `submit` it stays a new
line as today. All of it only while `input` is on, so the two probes that import it read what they read today. If codex is stood in, its bare name and version line are added as the
other rows are, or `build/p318/stand-in.mjs` is used for it; the probe states which.

## 5. Words

No user-visible word moves but the CHANGELOG's. The integrator adds ONE item under `## Unreleased`, `### Fixed`, after
353's six, in the house style, with no commit link:

```
- Words you type or paste into a session, at the Mac or from your iPhone, no longer turn it amber as if the agent were asking, and neither does a question a restored session showed before it closed; a question the agent asks just after you type still shows at once
```

## 6. What moves on purpose (each named in the integrator's report)

| What | Owner | Why |
| --- | --- | --- |
| `AttachHostOptions.onInput` gains a second parameter; Y17 still reads one call after the write under the same guard | writers | D3251-7 |
| `conformance:pocket` Z7 admits one more sink for a paste's text and a text item's characters; `ablation:p313` gains Z7w | writers | D3251-15 |
| `conformance:phonecopy`'s log rule gains a leaf and three words, and two self-test mutations | words | D3251-14 |
| `screen.ts`'s `BORDER` exported | words | D3251-11 |
| `core-wiring.test.ts` hands the lifted arrow an activity stub and asserts the note after the bump | integrator | S1 |
| `RestoreOutcome` gains `replayedTail?` on two arms (never stored, never on a channel) | writers | D3251-10 |
| `HELPER_USER_FLOOR` 184 → 185 | integrator | D3251-16 |

## 7. The gates that move, and the path-triggered gates the changed files trigger (CLAUDE.md's table, read at this head)

- `conformance:ownwords` (new) and `ablation:p3251` (new).
- `conformance:choices` (`state-machine.ts`'s `inferredVerdict`, `screen.ts`): UNCHANGED, run green; its clauses 1 to 4
  and 21 hold the verdict, and `ablation:p312` and `ablation:p321` (whose needles must still match once) stay green.
- `conformance:handback` (`state-machine.ts`, `monitor.ts`), `ablation:p328` (`state-machine.ts`): unchanged, green.
- `conformance:phonecopy` (`src/main/activity/**`): amended (D3251-14).
- `conformance:push` (the push rides needs input): unchanged, green.
- `conformance:pocket`, `conformance:pocket:hostile` (`onInput` in `attach-host.ts`, the `replyTurns` bumps in `core.ts`,
  `src/main/screen/**`, `capabilities.ts`): Z7 amended; every other rule unchanged; then `ablation:p313`.
- `conformance:machines` (condition 110 reads the attach host's remote input hook; `src/main/screen/**`'s row names it):
  unchanged, green; then `ablation:p320`.
- `measure:p337 -- --check` (`src/main/screen/**`'s row): its drive refuses a `TMUX_TMPDIR` outside `/tmp`
  (`build/p337/drive-screen.mts:77`), so it cannot run under §0; 353's fix round recorded the same. The keys verb's bytes
  and timing do not move (one call after the act's promise settled); Z4, Z8 and keys.test hold the order. Owed to the
  main session if the row binds.
- `conformance:shellenv` (`restore.ts` is one of its two call sites): green.
- `conformance:resume:capture` (`restore/**`): **NOT RUN by any role** (it starts real agents to their first screen;
  §0). The resume's composition does not move, only an outcome field after the replay; the main session decides at
  landing, as 353's landing recorded.
- `gate:checks` (test files added; the gate and the ablation classified), `gate:electron` (185), `gate:background` (the
  stand-ins and tools the probe starts), `gate:contract` (byte for byte), `conformance:harnessprobes`: inside
  `npm run build`.
- Not triggered, run as cheap no-regression checks because `core.ts` and `restore.ts` move: `conformance:endtree`,
  `conformance:farattach`, `conformance:remoteclose`, `conformance:manager`.

## 8. The app run: `probe:p3251` (`build/p3251/probe-p3251.mjs`, builder `probe`)

`"probe:p3251": "npm run build && node build/harness-socket.mjs --fresh gmux-p3251 'node build/p3251/probe-p3251.mjs'"`.
In `probe:p321`'s and the dropped `probe:p353:status` S arms' shape: ONE Electron at a time through
`build/electron-run.mjs`, the built parent FIRST (`P3251_PARENT_CHECKOUT`, absent or unbuilt exits 2) then HEAD, each on
its own scratch profile and `HOME`, the socket the harness hands it (`gmux-p3251-…`) named as `tmuxSocket`; no Tortie
window focused, so the poll runs at 2 s, driven and MEASURED per arm as `probe:p353:status` does (a `GMUX_TMUX_BIN`
wrapper noting each tick; an arm whose span did not tick every 2 s is UNREADABLE). The stand-ins are the real rows
cursor, qwen, opencode, antigravity, claude, grok and pi (and codex if stood in) under their bare names, each resolving
to its wrapper or the run exits 2; gemini and omp hidden (§0); every other probed row hidden and `agents:list` read back.
**His words go through the pane's own xterm** (`term.input(ch, true)` for a key, a line feed between lines, and
`term.paste(text)`, the Terminal found through the React fiber of its mount as the dropped S arms' page kit finds it), so
they cross `onData`, `term:input`, the attach host and the tap as his do; byte shapes xterm does not make (a split
paste, Alt-Enter, a cursor key) go through `window.gmux.term.sendInput`, the path `onData` feeds. Never `send-keys`.
Made-up words only.

| Arm | What | Graded (HEAD; the parent READ, UNREADABLE when its premise does not hold, never a failure) |
| --- | --- | --- |
| W | §2.1's three texts, typed and pasted, into each stand-in's input row and a bash shell's prompt | no needs input in main's status and no ⌘J row over at least 6 polls after his last key; the parent's needs input where its verdict reads a question |
| Q | `please look at the tests` typed, then the stand-in draws a real question 0.2, 0.5, 1, 2 and 5 s after his last key: Claude Code 2.1.280's trust gate (claude row, its registry file absent), qwen's second permission (qwen row), antigravity's run permission, Codex's update prompt and gemini's trust gate (each under a row that reads the numbered verdict; the probe names the row) | raised at every delay, the first needs-input poll no later than the parent's plus one poll |
| C | his unsent line equal to a whole row the question needs (C1b), and a substring of it (C2), then that question drawn | C2 raised; C1b held and PRINTED as the residual (Q1) |
| S | his dialog-shaped words, then Enter under `submit`, then the stand-in draws the same rows | raised |
| R | a stand-in session whose snapshot ends on a committed numbered gate (claude's workspace trust or antigravity's run permission) is restored (its scratch server ended between the two launches of a build, Restore through the bridge) | the replayed gate grey; his Enter on the armed resume, then the stand-in's own gate raised |
| F | the window loses focus and gets it back while a real question is drawn (focus reports through the pane's xterm) | raised |
| E | his words with a typo fixed by Backspace, and a mid-line fix with Left | grey |
| RUN | — | no Electron, stand-in, tool or socket of the run left; the census unchanged; history unmoved; DiagnosticReports unchanged by name and mtime |

`--grader-self-test` grades recorded fixtures for every arm (each clause shown red on its own break) and starts
nothing. `P3251_ARMS` picks arms; `P3251_KEEP=1` keeps the tick log and the status polls (counts and states only, no
screen text) for the verifier's re-derivation. Every stand-in pid and tool ended by pid in a `finally`, the socket file
unlinked, Electrons counted once at the end. The phone's writers are not driven here (no door): vitest and the gates hold
them, and a verifier may drive them (§10).

## 9. Builders, disjoint files, and the seams

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| **words** (the record, the match, the verdict's seam, the gate, the attack) | `src/main/activity/own-words.ts` (new); `src/main/activity/state-machine.ts`; `src/main/activity/monitor.ts`; `src/main/activity/screen.ts` (`export` on `BORDER`, nothing else); `src/main/activity/__tests__/own-words.test.ts` (new); `src/main/activity/__tests__/p3251-own-words.test.ts` (new); `build/conformance-ownwords.mjs` (new); `build/p3251/ablation.mjs` (new); `build/p311/copy-drift.mjs` |
| **writers** (the tap, the phone, the restore, their gate rows) | `src/main/attach/attach-host.ts`; `src/main/screen/keys.ts`; `src/main/screen/paste.ts`; `src/main/restore/restore.ts`; `src/main/attach/__tests__/attach-host.test.ts`; `src/main/screen/__tests__/keys.test.ts`; `src/main/screen/__tests__/p348-paste.test.ts`; `src/main/restore/__tests__/p3251-replay-tail.test.ts` (new); `build/conformance-pocket.mjs` (Z7); `build/ablation-p313.mjs` (Z7w) |
| **probe** (the app run) | `build/p3251/probe-p3251.mjs` (new); `build/p321/stand-in.mjs` |
| **INTEGRATOR** | `src/main/sessions/core.ts` (S1, S2); `src/main/capabilities.ts` (S3); `src/main/reply/__tests__/core-wiring.test.ts`; `CLAUDE.md`; `CHANGELOG.md`; `package.json`; `build/verification-checks.mjs`; `build/assert-electron-teardown.mjs`; `docs/audits/contract-baseline.txt` (must NOT move) |

### 9.2 The seams, stated exactly so the three build at once (in one worktree)

- **S1, S2, S3**: §4.5. Each builder's tree compiles without them: a one-parameter `onInput` arrow is assignable to the
  widened type, the phone verbs' `noteOwnWords` is optional, `replayedTail` is optional, and the monitor's two methods
  exist before anyone calls them.
- **S4 (integrator)**: `package.json` gains `"conformance:ownwords": "node build/conformance-ownwords.mjs"`,
  `"ablation:p3251": "node build/p3251/ablation.mjs"` and `probe:p3251` (§8; the shape the probe builder reports wins);
  `build/verification-checks.mjs` classifies the gate `pure`, the ablation `pure(…, NEEDS.vitest)` and the probe
  `electron`, each with its comment, so `gate:checks` reads both ways.
- **S5 (integrator)**: `HELPER_USER_FLOOR` 184 → 185 with its comment naming `build/p3251/probe-p3251.mjs`.
- **S6**: every builder runs `npm test` under the history block with a scratch `HOME`; the four `/bin/ps` natives fail
  there by design and are named, not counted. A typecheck error in another builder's file is that builder's seam, named,
  never fixed.

### 9.3 The builders' briefs (the workflow hands each its own, with §0, §0.1 and §1.1)

**words**:

> THIS IS A BUILD. Build Phase 325.1's record, match, rule and verdict seam exactly as build/p3251/SPEC.md §0.1, §1.1
> (D3251-1 to D3251-6, D3251-11 to D3251-14) and §4.1 to §4.3, §4.6 to §4.8 say, in the files of §9.1's words row only.
> (1) src/main/activity/own-words.ts: the reader of D3251-2 (325's escape grammar, kept as text in
> /private/var/tmp/tortie-wt/scratch/owed-p3251/pre-drop/src/main/attach/input-facts.ts, plus the line editor), the cap
> of D3251-3, `noteReplayedOn`, and `dialogIsHisWords` (D3251-4, D3251-5) calling detectDialogRows once; pure, no log
> call, no clock, imports only ./screen. The spec step's prototype is
> /private/var/tmp/tortie-wt/scratch/p3251/spec/proto/src/main/activity/own-words.ts: read it as text; write the module
> in the house style. (2) state-machine.ts: the `ownWords` field and freshState; the `own` line right after
> `const dialog = numbered || shaped;` exactly as D3251-6; the arm `if (dialog && !own) {`; nothing else moves. (3)
> monitor.ts: `noteOwnWords` and `noteReplayedScreen` through ensureState, committing nothing. (4) screen.ts: `export` on
> BORDER, nothing else. (5) The two vitest files of §4.8 (the driver is
> /private/var/tmp/tortie-wt/scratch/p3251/spec/m3251-driver.ts; read it as text); every existing activity test green
> unchanged. (6) build/conformance-ownwords.mjs (O1 to O10, each with in-memory self-tests; O1 and O9's wiring halves
> read red until the integrator's S1 to S3: prove them on your self-tests and name them), build/p3251/ablation.mjs (A1
> to A21; P3251_SCRATCH required, never under /private/tmp; A14 and A15 need the integrated tree: name them), and
> build/p311/copy-drift.mjs's log rule (D3251-14). Do NOT edit src/main/sessions/core.ts, src/main/capabilities.ts or any
> writers file. Refusals: SPEC §12 whole; no constant, no status, no copy, no renderer change, no channel, no log of his
> bytes. Run, with exit codes: npm run typecheck; your vitest files and the full vitest under the history block with a
> scratch HOME (name the four /bin/ps native failures); npm run conformance:choices; npm run conformance:handback; npm
> run conformance:phonecopy; npm run conformance:push; node build/conformance-ownwords.mjs; node build/p3251/ablation.mjs
> (the arms your tree can hold); npm run ablation:p312 and ablation:p321 in a clonefile copy of the worktree (p312 edits
> its tree in place; p321's clone root moved to your scratch in the copy); npm run ablation:p328 (P328_SCRATCH). Do NOT
> launch an Electron or any agent. package.json and build/verification-checks.mjs are the integrator's: report the lines
> you need. Report every file changed, every command with its exit code and PASS line, and the history stats.

**writers**:

> THIS IS A BUILD. Build Phase 325.1's writers exactly as build/p3251/SPEC.md §0.1 (items 2, 6, 7), §1.1 (D3251-7 to
> D3251-10, D3251-15) and §4.4, §4.8 say, in the files of §9.1's writers row only. (1) attach-host.ts: `onInput?:
> (sessionId: string, data: string) => void`; the ONE call, in the same place and under the same guard, hands
> `(req.sessionId, data)`; its doc in just enough words. (2) keys.ts: `noteOwnWords?` in ScreenKeysDeps; `ownBytesOf`
> and its frozen 37-name table keyed by POCKET_SCREEN_KEY_NAMES; the one call for a session on this Mac when the act
> typed, after the funnel and the grace, in a try of its own. (3) paste.ts: `noteOwnWords?` in ScreenPasteDeps; the one
> call with the bracketed text when the list succeeded, after the funnel, in a try of its own. (4) restore.ts:
> `replayedTail?` on the armed and transcript arms, `REPLAY_TAIL_ROWS = 24`, `replayTailOf` (read back, stripAnsi,
> trailing blanks dropped, the last 24 lines; a failed read leaves it undefined), set only after the replay's
> typeIntoPane resolved; restoreRecordOf untouched. (5) The tests of §4.8 (writers); the existing attach-host onInput rows
> unchanged. (6) build/conformance-pocket.mjs Z7 amended on purpose (D3251-15) and build/ablation-p313.mjs's Z7w. Do NOT
> edit src/main/sessions/core.ts or src/main/capabilities.ts (S1 to S3 are the integrator's) or any words file.
> Refusals: SPEC §12 whole; no byte the verbs type moves; no log call anywhere on these paths; nothing in the resume's
> composition moves. Run, with exit codes: npm run typecheck; your vitest files and the full vitest under the history
> block with a scratch HOME (name the four /bin/ps native failures); npm run conformance:pocket; npm run
> conformance:pocket:hostile; npm run conformance:machines; npm run conformance:shellenv; npm run ablation:p313 with
> P313_SCRATCH, at least every arm on keys.ts, paste.ts and attach-host.ts and Z7w (name the count); npm run
> ablation:p320 for condition 110 if your time allows, else name it. Do NOT launch an Electron or any agent. Report every
> file changed, every command with its exit code and PASS line, and the history stats.

**probe**:

> THIS IS A BUILD. Build build/p3251/probe-p3251.mjs (probe:p3251) exactly as build/p3251/SPEC.md §8 says, and the
> stand-in changes of §4.9 in build/p321/stand-in.mjs (existing ops byte for byte: probe:p321 and probe:p353:status
> import it), in the files of §9.1's probe row only. Lift what serves from the dropped arms S-a to S-e of
> /private/var/tmp/tortie-wt/scratch/owed-p3251/pre-drop/build/p353/probe-status.mjs (its page kit, its restore arm, its
> cadence measurement), read as text. One Electron at a time through build/electron-run.mjs inside
> build/harness-socket.mjs, the built parent FIRST (P3251_PARENT_CHECKOUT; the spec step's is
> /private/var/tmp/tortie-wt/scratch/p3251/spec/parent), scratch profile, HOME and socket, tmuxSocket named; stand-ins
> under bare names (exit 2 unless each resolves to its wrapper; gemini and omp hidden, their real binaries sitting in
> scanned folders); every other probed row hidden and agents:list read back; his made-up words through the pane's own
> xterm, never send-keys; a --grader-self-test that starts nothing, every arm's grader shown red on its own break. The
> integrator raises HELPER_USER_FLOOR; report the line you need. Run, with exit codes: node --check of both files; node
> build/p3251/probe-p3251.mjs --grader-self-test; npm run build (it carries gate:electron, which must then read your new
> script against the floor the integrator sets, and gate:background); `node --check build/p321/stand-in.mjs` and a read
> (as text) of every export `build/p321/probe-p321.mjs` and `build/p353/probe-status.mjs` import from it, each still
> there. NEVER run `build/p321/probe-p321.mjs` with any flag: it has no self-test flag and starts its whole app run
> (build/p353/SPEC.md M3 row 15). Do NOT launch an Electron: the app run is the verifiers'. Report every file changed,
> every command with its exit code, and the history stats.

## 10. The proof, run rather than read (Tier 3)

Two lenses review together. Each names, in its verdict, the step it took that the builders did not. Independent methods,
named before the work starts: (1) **run over real data**, the committed captures, per agent, in the verifier's OWN
harness through the shipping monitor class and the shipping attach-host listener; (2) **attack**; (3) **measure the
parent commit**, the built parent kept at `scratch/p3251/spec/parent` beside HEAD; (4) **re-derive**, the verifier's own
matcher written from §4.2's words and never from the code.

### 10.1 Lens S: the behaviour

- **The fault and the floor, through the path his keys take**: the verifier's own harness drives the SHIPPING attach host
  (its `term:input` listener over a fake sender, as `attach-host.test.ts` does) wired to the SHIPPING monitor, parent and
  HEAD side by side, over every committed idle window and every committed question: his words typed and pasted per
  agent (the parent reproduces §2.1's 3,660 of 4,740, HEAD 0, per row with its denominator); every recorded question at
  0.2, 0.5, 1, 2 and 5 s after his last key raised by HEAD no later than the parent's first tick (§2.2); the trade scene
  (§2.3); C1 to C22 (§2.4), the stated limits read as stated.
- **The per-agent matrix**: every launchable registry row (claude, cursor, codex, gemini, droid, deepseek, antigravity,
  muse, qwen, pi, omp, grok, opencode), a shell and `DEFAULT_ACTIVITY`, with its own compiled profile: the rows with
  committed windows over them, the rest over a synthetic input row, each reading his words grey and a real numbered
  question raised as the parent.
- **Re-derive** (method 4): the verifier's own matcher from §4.2's words, run beside the shipped rule over the §2.5
  corpus (28,576 pairs) and the attack rows; any pair where the two disagree is a finding, its own or the rule's.
- `probe:p3251` at both builds (§8).

### 10.2 Lens A: the attack

- **Bytes**: every escape class of D3251-2 through the real listener, split across chunks (a sequence, a paste, an
  Alt-Enter), X10 mouse with printable raw bytes, NUL, surrogate halves, a 64 KB chunk, a 20,000-character paste (the
  cap), a paste whose closing marker never arrives (its effect stated: line breaks stay lines until the next marker or
  the cap), into an unblocked and a blocked session.
- **Edits**: Backspace, Left, Right, Home, End, Delete, Up, Down, Tab, Ctrl-U, -W, -K, -A, -E: grey where the editor
  models the key, as at the parent where it does not (C8b's class), never worse than the parent.
- **The coincidence family**: one-line and multi-line unsent drafts equal to, inside, around and a substring of each
  committed question's rows; held exactly where §2.5 says, raised everywhere else.
- **Real questions near his words**: drawn above, below and in place of his input row; at every delay; while the agent
  writes; Phase 321's two shapes with his words in the record; a hook-raised question over his words; a seventh session
  while six are blocked.
- **The restore**: the replay at a narrower and a wider pane than the snapshot (wraps), a snapshot that fails to read
  back, a `shell_only` restore, his Enter then the agent's own gate.
- **Another machine** (the loopback machine, §0): his words into a remote session read exactly as the parent reads them
  (never needs input), and the record is never written for it.
- **The phone**: the keys and paste verbs over a recording runner (their own tests' shape), every named key's bytes, a
  refused and a failed act handing nothing.
- **His words are never kept**: a planted log call on the tap's `data`, on `noteOwnWords`'s argument, inside
  own-words.ts, on the restore tail and on each phone writer's argument, each turning `conformance:ownwords`,
  `conformance:phonecopy` or `conformance:pocket` red, beside a control log call carrying a fixed word that stays green;
  and a `grep -r` of the built `out/renderer` and `out/preload` for any record identifier (none may appear).
- **The parent**: every attack row read at the built parent too; a row worse at HEAD than at the parent is a finding.

### 10.3 At the end, once

The Electron count of CLAUDE.md (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v
defunct`, run outside the block with the scratch environment; his `/Applications/Tortie.app` and other apps' crashpads
are not ours), no `p3251` socket left under a scratch `TMUX_TMPDIR` or `/private/tmp/tmux-501/`, every lock slot
released, the history stats, DiagnosticReports unchanged by name and mtime.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `df -h /` (8 GB or more free); `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; `shasum -a 256 src/main/menu.ts`
   (recorded; it must read the same at step 22).
2. S1, S2 (`src/main/sessions/core.ts`), S3 (`src/main/capabilities.ts`), `core-wiring.test.ts`; confirm the builders'
   reports; S4 (`package.json`, `build/verification-checks.mjs`); S5 (`build/assert-electron-teardown.mjs`, 185).
3. `CHANGELOG.md`: §5's item under `## Unreleased`, `### Fixed`, after 353's six, no link.
4. `CLAUDE.md`, rows only: a NEW `conformance:ownwords` row (its paths: `src/main/activity/own-words.ts`, the `own` line
   and the `ownWords` field in `state-machine.ts`, `noteOwnWords` and `noteReplayedScreen` in `monitor.ts`, the `onInput`
   call in `attach-host.ts`, the `onInput` arrow and the restore's note in `core.ts`, the record writers in
   `src/main/screen/keys.ts` and `paste.ts` and their wiring in `capabilities.ts`, `replayedTail` in `restore.ts`; ~1 s,
   spawns nothing; what it holds in one paragraph; `ablation:p3251` the attack beside it); the `conformance:phonecopy`
   row gains `own-words.ts` as a leaf with no log call; the reply row's `onInput` sentence says it now hands the chunk to
   main's record of what he typed, never logged; `conformance:pocket`'s Z7 sentence gains the record's writer; the
   probe table gains `probe:p3251`. Nothing else.
5. `npm run typecheck`
6. `npm run build` (carries `gate:electron` 185 and 94, `gate:background`, `gate:knownhosts`, `gate:checks`,
   `gate:simulator`, `conformance:harnessprobes`, `gate:contract` byte for byte)
7. `npm test`, under the history block with a scratch `HOME` (the four `/bin/ps` natives named, nothing else red)
8. `npm run conformance:ownwords`
9. `npm run conformance:choices`, `npm run conformance:handback`, `npm run conformance:phonecopy`, `npm run conformance:push`
10. `npm run ablation:p3251` (`P3251_SCRATCH` under the integrator's scratch; every arm, A14 and A15 included)
11. `npm run ablation:p312` and `npm run ablation:p321` in a clonefile copy of the worktree (p312 edits its tree in place;
    p321's clone root moved to the scratch in the copy), the copy removed after; `npm run ablation:p328` (`P328_SCRATCH`)
12. `npm run conformance:pocket`, `npm run conformance:pocket:hostile`, then `npm run ablation:p313` (`P313_SCRATCH`;
    the whole run if time allows, else every arm on `attach-host.ts`, `keys.ts`, `paste.ts`, `capabilities.ts` and
    `core.ts` and Z7w, the count named)
13. `npm run conformance:machines`, then `npm run ablation:p320` (condition 110), or the arms on `attach-host.ts`, named
14. `npm run conformance:shellenv`
15. `npm run conformance:endtree`, `npm run conformance:farattach`, `npm run conformance:remoteclose`,
    `npm run conformance:manager`
16. `node build/p3251/probe-p3251.mjs --grader-self-test`
17. `npm run smoke:t1`, under a lock slot
18. `npm run package:dir -- -c.mac.identity=null`, UNSIGNED, with `build/p351/SPEC.md` §9.1's `env -u` line and a
    scratch `HOME` and `ELECTRON_BUILDER_CACHE`, under a lock slot
19. NOT run here: `conformance:resume:capture` (real agents; §7), `measure:p337 -- --check` (§7), `smoke`, `smoke:t3`
    (they start `electron .` outside `build/electron-run.mjs`): the main session's at landing
20. `git -C /private/var/tmp/tortie-wt/wt-p3251 diff --stat de9ea8f2` and `git status --short` (only §9.1's files and
    this SPEC)
21. A ten-line duplicate scan of the added files against `src/` and `build/` (the probe and ablation boilerplate the
    house's probes share is named, not extracted)
22. `shasum -a 256 src/main/menu.ts` (the same as step 1); the end-of-run count (§10.3); `stat` again.

## 12. What is NOT in this phase

- No change to what counts as a numbered choice or a named shape: `BORDER`'s value, `OPT1`, `OPT2`, `HINT`, `QUEST`,
  `DIALOG_ROWS`, the verdict's loop and line, `DIALOG_SHAPES`, `detectShapes`, the foreground gate. No change to the
  push or the phone's door.
- No time window, burst, mark, stamp or clock in the rule, ever: a real question is never held by timing.
- No change to the release (`noteUserInput`, `activity:noteInput`, the renderer's gate) or to what his typing does to
  running and idle; no constant moved (`QUIET_MS`, `DIALOG_CONFIRM_TICKS`, `DIALOG_CLEAR_TICKS`, `AMBIGUOUS_WINDOW_MS`,
  `REFLOW_GRACE_MS`, `MAX_CAPTURES_PER_TICK`, both cadences).
- Nothing he typed is logged, stored, written to disk, sent to the renderer, the phone or a push, or kept past submit,
  Ctrl-C, the cap or the session's end. No copy of his words outside the one record.
- No renderer, preload, channel or contract change; no surface, copy or menu.
- No change to the six other items 353 landed; nothing for Phase 319's class (screens the agent draws that the verdict
  misreads), pi's widened answer, or questions 321's fix round left unread (cursor, opencode, antigravity's folder trust).
- Nothing for text Tortie cannot see (another tmux client, a script's `send-keys`), and nothing for a session on another
  machine, which never reads needs input.
- Not built, stated: the echoed prompt (Q2); an edit after Up or Down; an agent that draws its own text after his words on
  the same row; an agent that rewrites what he typed (a placeholder, a completion, an `@` mention); a paste into a
  program that did not ask for bracketed paste (its lines submit there and stay lines here); Phase 318's reply writer
  (exempt, D3251-9).
- No live agent, no real recording, no conversation store, no release, tag, version bump, archive or upload.

## 13. For the main session at landing

- **Owed its own entry**: the echoed prompt (Q2's default): his dialog-shaped words, sent, then echoed by the agent and
  answered within the 24-row window, read needs input at the parent and here (C11, 20 of 20).
- **Stated limits, in the commit body, not the CHANGELOG** (nobody is likely to meet them): an unsent line equal word for
  word to a row the question needs holds that question until he sends or clears it (§2.5, C1b, C3c; Q1); an edit after
  Up or Down (C8b); an agent's own text after his words on one row (cursor's `ctrl+c to stop` row is the one seen, in
  `b-cursor-0021`, and its `→` mark keeps his first row from making `OPT1` anyway); a paste whose closing marker never
  arrives.
- **Gates not run by this phase's roles**: `conformance:resume:capture` (real agents; `restore.ts` gains one outcome field
  after the replay, the resume's composition untouched) and `measure:p337 -- --check` (refuses a scratch `TMUX_TMPDIR`
  outside `/tmp`); `smoke`, `smoke:t3`.
- The commit body names: the new gate and ablation, the probe (`HELPER_USER_FLOOR` 185), Z7's amendment, phonecopy's leaf,
  `BORDER`'s export, the outcome field, and every red-on-purpose row of §6.
- Scratch to remove after landing: `/private/var/tmp/tortie-wt/scratch/p3251/` (the spec step's three copies, the built
  parent among them) and `/private/var/tmp/tortie-wt/scratch/owed-p3251/` (325 as kept, no longer owed).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

- **Q1.** If a line you have typed and not sent is, word for word, one of the rows that makes the agent's question a
  question, Tortie takes that question for your words until you send or clear what you typed. Of 1,786 lines tried
  against every recorded question, only a question's own rows ever did this. Keep it (the default)? The other way counts
  the question as the agent's whenever any of its options is not one of your lines; that question then always shows, but
  your own words that finish a numbered list the agent wrote turn amber again (20 of 20 today).
- **Q2.** Tortie forgets what you typed the moment you send it, as you asked, so words of yours that look like a question
  and that the agent repeats in its answer can still turn the session amber, as today. Keep forgetting on send (the
  default, and a later phase of its own), or remember what you sent until the agent's next turn?

## 15. The spec step's commands, exit codes and numbers

| # | Command (scratch `/private/var/tmp/tortie-wt/scratch/p3251/spec/`) | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `743166 1793987027`, `23166 1790702242`; 49 GiB free |
| 2 | `cp -Rc` the worktree to `parent`, `rm parent/.git`, `cp -Rc parent p325` (history block) | 0 | clonefile copies |
| 3 | `git apply --check owed-p3251/item-325.patch` in `p325` | non-zero | `CHANGELOG.md` and `CLAUDE.md` hunks do not apply after 353's docs commit |
| 4 | `git apply --exclude=CHANGELOG.md --exclude=CLAUDE.md owed-p3251/item-325.patch` in `p325` | 0 | 325's code back on de9ea8f2 |
| 5 | vitest `p325-own-words.test.ts` in `p325` (history block, `sb.sh`) | 0 | 39 of 39, 18.9 s; sweep 4,744 cells, 3,660 amber by its frozen parent, 0 at 325; trade 0.1, 0.5, 1 s lost 20 of 20; cost 0.03 µs a key, 27.5 µs a 4 KB paste |
| 6 | `cp -Rc parent proto`; the prototype written into `proto` (scratch only) | 0 | `own-words.ts`, `BORDER` exported, `ownWords`, `own` |
| 7 | vitest `m3251-{parent,p325,proto}.test.ts`, three rounds as the scenes and the prototype were corrected (C5's real question moved inside the window; C8b and C8c split; the record's lines stripped of borders; the cursor editor added) | 0, 0, 0 each round | the final round's readings are §2.1, §2.2 and §2.4: `logs/{parent,p325,proto}-{A,B,C}.json`, `logs/{p325,proto}unfed-B.json`, `logs/protounfed-C.json` (unfed equal to the parent in every cell) |
| 8 | vitest `m3251-corpus.test.ts` in `proto`, three runs (the fixtures' own rows added as records; then the fixtures the verdict does not read as questions taken out) | 0, 0, 0 | 2 tests each, 2.6 s; §2.5 from the third (`logs/proto-corpus3.json`: 16 questions, 1,786 records, 28,576 checks, 56 held, every one by the question's own row) and §2.6 (`logs/proto-cost.json`) |
| 9 | vitest `m3251-d.test.ts` in all three | 0, 0, 0 | §2.3 (`logs/*-D.json`) |
| 9b | set C again in `proto` with its cursor editor switched off (`P3251_NO_EDITOR=1`, a scratch-only switch, the file restored and compared after) | 0 | C7 0, C8 0, C8b 20, **C8c 20** of 20 (`logs/proto-noeditor-C.json`): the editor is what keeps C8c grey |
| 10 | vitest of the parent's 10 tap, phone and verdict files | 0 | 10 files, 355 tests (§2.7) |
| 11 | measurement files moved out of `parent`; `npm run build` in `parent` (history block) | 0 | 52.6 s; 184 against 184; 284 check scripts; 1,192 test files; contract byte for byte (§2.9) |
| 12 | a read of xterm's shipped bundle for its paste functions | — | `Al` and `kl` (§2.8) |
| 13 | `ls` by name of agent names in `/opt/homebrew/bin` and `/usr/local/bin` | 0 | `gemini` and `omp` present (§0, §2.8) |

**History**: `~/.zsh_history` `743166 1793987027` and `~/.bash_history` `23166 1790702242` at the start, before and after
every run, and at the end: never moved. **Left behind**: no process of this step (it started no Electron, tmux server,
agent or `/bin/ps`), the three scratch copies and the logs under `scratch/p3251/spec/` (the built parent kept for the
verifiers). **Not run, and why**: an app run at the parent (the probe that types through the pane's own xterm is the
`probe` builder's; the verifiers run it at both builds), real agents and the banked corpus (refused; gone), the loopback
machine (the verifiers' attack), `conformance:resume:capture` and `measure:p337` (§7).

## §As built — the integrator (2026-11-08, 21:41 to 22:16, at `de9ea8f2` plus the uncommitted phase)

Written by the integrator in `/private/var/tmp/tortie-wt/wt-p3251`. Nothing was committed, staged or stashed; nothing was
rebased, pulled or merged; `/Users/gdc/gmux` was not touched. Scratch, every log and two scripts of its own
(`p313-pick.mjs`, which reads `build/ablation-p313.mjs` as TEXT and lists the arms whose `file` is one this phase touched,
and `dupscan.mjs`, the ten-line scan) are under `/private/var/tmp/tortie-wt/scratch/p3251/integrator/`. Every command ran
under the history block (`integrator/sb.sh`: `no-history.sb`, a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`,
`SHELL=/bin/sh`, `TMPDIR` under `/var/tmp/…/integrator/tmp`, so the preview protocol test's symlink row has its symlink,
`TERM_SESSION_ID` and `TERM_PROGRAM` unset) except the three a row names. This role started no Electron app.

### The seams, as built (each in §4.5's shape; every builder report confirmed against the tree)

- **S1**, `src/main/sessions/core.ts`, the attach host's `onInput`: `(sessionId, data) => { replyTurns.bump(sessionId,
  'desk'); this.activity.noteOwnWords(sessionId, data); }`, inside `new AttachHost({…})`, with three lines of comment (the
  chunk goes to main's record of what he typed and nowhere else; never logged).
- **S2**, `core.ts`, the statement right after `const { info } = outcome;`: `if (outcome.kind !== 'shell_only' &&
  outcome.replayedTail !== undefined) this.activity.noteReplayedScreen(rec.id, outcome.replayedTail);`. `rec` is
  `this.mustGetSession(sessionId)`, so `rec.id` is the id the monitor keys by. Between it and `this.liveIds.set(sessionId,
  info.sessionId);` stand only Phase 119's flip, `restoredStatus` and `reportRestoreStages`, nothing awaited. It stays on
  one line, the SPEC's own text, which A14's needle and O1 both read; no gate here reads line length.
- **S3**, `src/main/capabilities.ts`: `noteOwnWords: (sessionId, data) => pocketCore?.activity.noteOwnWords(sessionId,
  data)` in `createScreenKeys({…})` and `createScreenPaste({…})`, each right after the verb's `noteUserInput` line. Never
  the first property, because `ablation:p313` Z32c and `conformance:pocket`'s P350 self-test match
  `createScreenPaste({\n    core: () => pocketCore,\n`; the keys verb's `noteRepaint` line is byte for byte (Z32a, Z32b).
- **`src/main/reply/__tests__/core-wiring.test.ts`**: the desk-bump row keeps its title, lifts the arrow over a `this`
  holding an `activity` stub, hands it a made-up chunk (`1. to cancel`, a line feed, then `2. x` inside paste markers) and
  asserts `[['bump','s1','desk'], ['words','s1',data]]`, so taking out either the bump or the note reddens it.
- **S4**: `package.json` gains `probe:p3251` (the probe builder's shape, after `probe:p353:starts`), `ablation:p3251`
  (after `ablation:p328`) and `conformance:ownwords` (after `conformance:choices`); `build/verification-checks.mjs` gains
  `pure('conformance:ownwords')`, `electron('probe:p3251')` and `pure('ablation:p3251', NEEDS.vitest)`, each with its
  comment. `gate:checks` reads 286 check scripts against the parent's 284: the gate and the probe, because `ablation:`
  is not in its check family; the ablation's entry names a script that exists, which is the other direction.
- **S5**: `HELPER_USER_FLOOR` 184 → 185 in `build/assert-electron-teardown.mjs`, its paragraph naming
  `build/p3251/probe-p3251.mjs` (the probe builder's words). `OPERATOR_ARGV_CEILING` stays 94.
- **CHANGELOG.md**: §5's item verbatim, the seventh under `## Unreleased`, `### Fixed`, no commit link (6 of the 7 items
  carry one, 353's).
- **CLAUDE.md**, rows only: a new `conformance:ownwords` row after `conformance:choices` (its paths, ~1 s, spawns nothing,
  one paragraph, `ablation:p3251`'s 22 arms, the two stated limits); the `conformance:phonecopy` row (`own-words.ts` a leaf
  with no log call, `ownWords`, `data` and `text` among the payload words, the two new mutations); the reply row's
  `onInput` sentence; one sentence closing the `conformance:pocket` row (Z7's one more road a verb, `ablation:p313` at 823
  arms, `Z7u`, `Z7v`, `Z7x`, `Z7y` and `Z7z` the record's; CLAUDE.md held no sentence naming Z7, so the new one stands
  beside the row's last arm count); and a `probe:p3251` row after `probe:p353:starts`. Every changed row keeps its cell
  count (4, and 3 in the probe table).
- **Unmoved**: `docs/audits/contract-baseline.txt` (`gate:contract` byte for byte) and `src/main/menu.ts`, sha256
  `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3` at the start and at the end.

### What the builders decided beyond this spec, each kept

1. **`Z7w` became `Z7x`** (writers). Phase 348 already holds `Z7w`, so D3251-15's arm is `Z7x`, and four more arms each
   own a new Z7 clause: `Z7y` before the act, `Z7z` `ownBytesOf` handed to the measuring seam, `Z7v` a `.t` pushed onto an
   argv, `Z7u` `ownBytesOf` pushing twice. 823 entries; `p313-pick.mjs` read 823 unique ids back.
2. **`NAMED_KEY_BYTES`** (writers) names the table, typed `Record<PocketScreenKeyName, string>` so the compiler holds it
   to the contract's 37; `ownBytesOf`, `REPLAY_TAIL_ROWS` and `replayTailOf` are exported for their tests.
3. **The tile search's budget** (words): `TILE_BUDGET = 50_000` comparisons a line, rows and positions remembered, line
   forms deduplicated, an exhausted line left unplaced so the screen reads as the parent reads it (a contrived 40-row
   screen fell from 530 ms to 6 to 13 ms).
4. **A2's window is `2 * QUIET_MS`** (words): the dialog arm is reached only after `QUIET_MS` of quiet, so §4.7's literal
   window could never act.
5. **C6b, C7b and a monitor-class row** (words) own the p3251 halves of A12, A17 and A8; O5 also asks that the cap is used;
   phonecopy's log pattern now catches `getLog('x').info(…)`, which A3's plant otherwise slipped past (the base still
   finds 2 log calls, against a floor of 2).
6. **The stand-in** (probe): `bracketed: true` writes `ESC[?2004h` once (xterm's `paste()` sends no markers without it);
   Alt-Enter breaks a line; Ctrl-U empties the row as before; Ctrl-C is not modelled.
7. **The probe** (probe): codex is not stood in (its update prompt is drawn under the opencode row, gemini's gate under
   pi's); its shell is `/bin/zsh`, because macOS's bash 3.2 asks for no bracketed paste; each Q draw lands 550 ms before a
   tick; split paste and Alt-Enter stay vitest-only (the tile rule reads them grey even with A12 or A18 planted, so an
   app run cannot tell them apart); HEAD's `app.log` must hold none of the made-up words.

### §11, in order, at the integrated tree

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `df -h /`; `stat` the history; `shasum -a 256 src/main/menu.ts` | — | 50 GiB free; `743166 1793987027`, `23166 1790702242`; `fe62e1dd…22ca3` |
| 2 | S1 to S5 and `core-wiring.test.ts` (above) | — | `conformance:ownwords` read before the build: PASS, 10 clauses, 60 self-tests (O1 and O10 green once the seams stood) |
| 3 | CHANGELOG.md | — | one item, after 353's six, no link |
| 4 | CLAUDE.md | — | four rows of the gate table touched, one of them new, and one row added to the probe table |
| 5 | `npm run typecheck` | 0 | 5.6 s (incremental): 87 fixtures, 1,440 production files, 8,227 imports, 0 violations; no runtime cycles over 1,437 files and 5,034 edges; shared types OK |
| 6 | `npm run build` | 0 | 51.7 s. `gate:electron` 586 files, **185 reach the helper against a floor of 185**, 94 aim an argv at `-L gmux` under 94, 32 shell lines under 32, 32 of 32 ablations; `gate:background` 588 files, 3 start, 32 of 32 fixtures; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:knownhosts` 616 files, 19 reach `build/ssh-run.mjs`, 38 fixtures; `gate:checks` 286 check scripts, 55 `tsxCli()` importers against 54, 1,195 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations; stapler 31, 18, 28; the contract inventory byte for byte |
| 7 | `npm test` (load average 14.5) | 1 | 117.7 s: 1,195 files (3 failed, 1,188 passed, 4 skipped), 22,851 tests (4 failed, 22,824 passed, 23 skipped): exactly the four `/bin/ps` natives (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell that never exits" 1), which the history block refuses by design |
| 8 | `npm run conformance:ownwords` | 0 | PASS, all 10 clauses and 60 self-tests, 1.8 s |
| 9 | `conformance:choices`, `handback`, `phonecopy`, `push` | 0 each | 27 clauses and 33 self-tests; PASS; `phonecopy OK` (12 activity modules, 2 log calls against a floor of 2, both new mutations red and the control green; 113 owned rules, 95 words judged against the Mac); 26 rules, 2,411 checks |
| 10 | `npm run ablation:p3251` (`P3251_SCRATCH=integrator/abl3251`) | 0 | **PASS in 68.1 s, 22 of 22 arms** (A1 to A21 and A3b), **A14 and A15 among them**, every owner red; the control's 36 owners green first and last; the clone gone |
| 11 | `ablation:p312`, then `ablation:p321`, in a clonefile copy of the worktree (`.git` removed; p321's clone root moved to `integrator/abl321` in the copy); the copy removed after; `ablation:p328` (`P328_SCRATCH`) | 0, 0, 0 | 23 of 23, 73.8 s; 33 of 33, 110.5 s; 10 of 10, 128.1 s |
| 12 | `conformance:pocket`; `conformance:pocket:hostile`; `ablation:p313` (`P313_SCRATCH`), `P313_ONLY` the 59 arms whose `file` is `attach-host.ts` (1), `keys.ts` (22), `paste.ts` (21), `capabilities.ts` (13) or `core.ts` (2), `Z7w` and the five new ones among them | 0, 0, 0 | 192 rules, 25,811 checks, 11.5 s (Z7 83 checks); 363 arms, 17.3 s; **PASS in 717.7 s, 59 of 59**, each newly red on the rule that owns it, the 13 base checks green before and after, the worktree never written. Not the whole 823: at about 12 s an arm it is near three hours |
| 13 | `conformance:machines`; `ablation:p320 --only` its 2 arms on `attach-host.ts` (`o3`, `o7`, condition 110) and its 12 on `core.ts` (`m6`, `e21`, `e13`, `e16`, `o6`, `o8`, `o10`, `f2c`, `f3c`, `f4b`, `x13`, `g7`), in a clonefile copy with its clone root moved to `integrator/abl320`, the copy removed after | 0, 0 | PASS, 24.7 s; **PASS in 307.1 s, 14 of 14** (base machines green, base main 373 cases green) |
| 14 | `conformance:shellenv` | 0 | PASS, 0.9 s |
| 15 | `conformance:endtree`, `farattach`, `remoteclose`, `manager` | 0 each | 16 rules and 84 self-tests; 11 rules; 11 tests; 72 rules, 2,919 checks |
| 16 | `node build/p3251/probe-p3251.mjs --grader-self-test` | 0 | PASS, 101 cases, nothing started, no `out/p3251/` written |
| 17 | `npm run smoke:t1` | — | **NOT RUN**: the workflow's integrator brief forbids it ("Do NOT run smoke:t1, smoke, smoke:t3, smoke:remote or smoke:machines"), which this role followed over this list; the main session's at landing |
| 18 | `npm run package:dir -- -c.mac.identity=null`, UNSIGNED, `build/p351/SPEC.md` §9.1's `env -u` line (plus `TERM_SESSION_ID` and `TERM_PROGRAM`), scratch `HOME`, `ELECTRON_BUILDER_CACHE=integrator/eb-cache`, slot `electron.lock` taken and released from the script's `EXIT` trap | 0 | 33 s. `after-pack: 27 Mach-O files, every one holds arm64 code` (log line 577) before the first `after-pack: CFBundleName` (578); specstory, rg and tmux signed ad hoc; 7 externalized requires present; skills 1.5.22 runs; `skipped macOS code signing  reason=identity explicitly is set to null` (587); `@electron/rebuild` rebuilt nothing (`pty.node` keeps its 17 September time). No seeded cache was left (p351's and p356's scratch are gone), so the Electron 43.3.0 arm64 zip was downloaded once into the scratch `HOME` (122,102,881 bytes, the size p351 recorded). The lock script and the `df` ran outside the block with `ZDOTDIR` in the scratch and `HISTFILE=/dev/null`; the package ran inside it. DiagnosticReports: 104 files, unchanged by name and mtime |
| 19 | `conformance:resume:capture`, `measure:p337 -- --check`, `smoke`, `smoke:t3` | — | NOT RUN (real agents; a `TMUX_TMPDIR` outside `/tmp` refused; Electron outside the helper): the main session's at landing |
| 20 | `git diff --stat de9ea8f2`; `git status --short` | 0 | 22 tracked files, 1,127 insertions, 63 deletions; 8 new files (`build/conformance-ownwords.mjs`, `build/p3251/{SPEC.md,ablation.mjs,probe-p3251.mjs}`, `own-words.ts`, `own-words.test.ts`, `p3251-own-words.test.ts`, `p3251-replay-tail.test.ts`): exactly §9.1's 29 files and this SPEC |
| 21 | the ten-line duplicate scan (`dupscan.mjs`: every run of ten non-blank trimmed lines of the eight new files looked up among every code file under `src/` and `build/`, vendor left out) | 0 | `own-words.ts`, `own-words.test.ts`, `p3251-own-words.test.ts` and `conformance-ownwords.mjs`: 0. `p3251-replay-tail.test.ts`: one 11-line block, its `beforeEach` and `rec()` scaffolding, as `restore/__tests__/outcome.test.ts` writes its own (each restore test file keeps its own builder; named, not extracted). `ablation.mjs`: four blocks, the clone-and-restore tail `p321`, `p328` and `p313`'s ablations share. `probe-p3251.mjs`: 22 blocks, the probe kit `probe-status.mjs`, `probe-p321.mjs`, `probe-p346.mjs`, `probe-p323.mjs`, `probe-p316.mjs` and `probe-p292.mjs` share (`cdpForMain`, `termOf`, `endByPid`, `hellos`, `historyStat`, the tick wrapper). Both named, not extracted, as §11 says |
| 22 | `shasum -a 256 src/main/menu.ts`; the Electron count; the history | — | `fe62e1dd…22ca3`, as at step 1; below |

### Integrator checks of its own

- `conformance:agents` (PASS, 4.3 s), `conformance:stoppedlist` (PASS, ten rules over 1,437 files, 51 ablations and a
  control), `conformance:credentials` (OK, 46 s; it also reads CLAUDE.md, as do `conformance:containment`, OK, 52 readings
  and 10 of 10 ablations, and `conformance:logins`, OK, 23 s), each run because `core.ts`, `restore.ts`, `capabilities.ts`
  or CLAUDE.md moved; none of their named functions did.
- The built `out/renderer` and `out/preload` hold none of `ownWords`, `OwnWords`, `noteOwnWords`, `noteReplayedScreen`,
  `replayedTail`, `dialogIsHisWords`, `noteOwnWordsOn` or `OWN_WORDS_MAX`; each is in exactly one `out/main` file.
- Every name `probe-p321.mjs` (6), `probe-status.mjs` (4) and `probe-p3251.mjs` (9) imports from the stand-in is still
  exported, read as text.

### At the end (22:16)

- His shell history: `743166 1793987027` and `23166 1790702242` at the start, before and after every run, and at the end;
  never moved.
- Electrons (CLAUDE.md's count, outside the block with the scratch environment, 22:14): six lines, none this role's: his
  `Tortie` (pid 692, parent 1) and the crashpads of `/Applications/Tortie.app`, Slack, Chrome, Granola and Cursor. No
  `p3251` socket under `/private/tmp/tmux-501/`; this role started no tmux server.
- Every lock slot free (the one taken released from its trap); no ablation clone or worktree copy left; `release/` (the
  unsigned package) and `out/` are ignored by git.
- Left for the verifiers: the built parent at `scratch/p3251/spec/parent` (untouched); this role's logs.

### The fix round (2026-11-09, 00:30 onward, the fixer, once; both verify lenses answered `needs_work`)

Written by the fixer in `/private/var/tmp/tortie-wt/wt-p3251`. Nothing committed, staged or stashed; nothing rebased,
pulled or merged; `/Users/gdc/gmux` untouched. Scratch and every log: `/private/var/tmp/tortie-wt/scratch/p3251/fixer/`
(`logs/`, the scratch runner `t/` with `held.test.ts` and `hintonly.test.ts`, `run-probe.sh`, the probe's `phome/` and
`ptmp/`). Every command ran under the history block (`fixer/sb.sh`, as the integrator's) except the probe and the counts
at the end, which name themselves.

#### What the lenses found, and what was done

| Finding (lens, severity) | Done | Where |
| --- | --- | --- |
| A line he typed and erased with a key the record did not model stayed his (Ctrl-U, Ctrl-W, Up, Esc Esc): a real question needing that line, raised 8 of 8 at the parent, held 0 of 8 (lens 1 major; lens 2 major, Q4) | FIXED. The reader reads Ctrl-W and Alt-Backspace (a word back, its whitespace first, the most any editor takes), Ctrl-K (to the line's end) and Ctrl-A, -B, -D, -E, -F (Home, Left, Delete, End, Right) as the edits they are, and FORGETS the whole record on Ctrl-U, Up and Down in any form, Ctrl-P, -N, -R, -G, -Z, -\ and Escape pressed twice (in one message or two, keys and never time: `OwnWords.escAlone`). Forgetting reads the screen as the parent does; a line kept after the screen dropped it is the one thing that could hold a question | `own-words.ts` reader |
| The phone's message (318's say) sent his line and the record kept it (lens 2, Y2) | FIXED. A message that landed hands the record its closing Enter alone, `core.activity.noteOwnWords?.(id, '\r')`, after `pasted = true`, in a try of its own, never his words; `ReplyCore.activity` gains the optional member; `writer.ts` leaves `OWN_EXEMPT` | `src/main/reply/writer.ts`, O1, O10 |
| The phone's paste into a program that asked for no bracketed paste SENT its lines and the record kept them (lens 2, PP2) | FIXED. The record is handed the paste as tmux types it to such a program, `input.text.replace(LINE_FEED, '\r')`: exact there, and for a program that asked for brackets a record holding less than the screen, which reads as the parent and never holds. `conformance:pocket` Y15 lets exactly that one `.replace(` through (the second argument of `noteOwnWords(` in `paste.ts`, never typed), and `p348-paste.test.ts`'s text row the same | `paste.ts`, `build/conformance-pocket.mjs` Y15, `ablation-p313` |
| One unsent line spelling several of a question's rows joined held it (lens 2, Q7) | FIXED. A line never runs on into a row that reads as numbered, Phase 312's own rule (`NUMBERED`, exported, no `g` flag) | `own-words.ts` `tileFrom`, `screen.ts` |
| A line that is one of a real question's rows held it: its only first option (C1b, the spec's residual), its question sentence (lens 2, RQ1), an option with more below (lens 2, Q3) | FIXED by narrowing the rule. When his rows give the numbered dialog only ONE of the three classes the verdict counts and the agent's rows the rest, the dialog is his only when nothing of the agent's that the verdict counts, nor a numbered row, lies below his rows, and, when his rows give it no option, his first such row sits behind a mark (an input row is drawn behind the agent's prompt; a question's own hint line is led by none). His own dialog-shaped words give it two or three classes and stay his whatever the agent draws around them (antigravity's `esc to cancel` under his input row while it works, which the "below" clause alone turned amber in set A's first cell). The per-row classes are `dialogEvidenceRows` (new in `screen.ts`, the verdict's own window and regexes, one bit a class), asked once | `own-words.ts` `dialogIsHisWords`, `screen.ts` |
| `conformance:ownwords` O3 was a denylist: a window read through `process.uptime()` passed every clause and all 22,824 tests (lens 2 major) | FIXED. O3 holds `own-words.ts` to an ALLOWLIST of the globals it computes with (`Math`, `Set`, `Map`, `String`, `Number`, `Array`, `Object`, `undefined`, `Infinity`, `NaN`), three new self-tests (`process.uptime()`, `globalThis`, `Intl`); a vitest row moves every clock the process has (`Date` by fake timers, `performance.now`, `process.uptime`, `process.hrtime` and its `bigint`) an hour forward between his words and the rule; `ablation:p3251` A23 plants the lens's window and reads red on both | `build/conformance-ownwords.mjs`, `own-words.test.ts` |
| A carriage return inside a message with his text was never tested (lens 2 minor) | FIXED. Rows for `text\r`, `ab\rcd`, and the phone's `ownBytesOf([{t}, {k:'Enter'}])` (and C-u, Up, Escape twice, C-w, BSpace) through the reader; A34 | `own-words.test.ts` |
| Probe arm R read `--resume` over `capture-pane -J`, which a shell's wrapped line splits (`--resu` / `me`; lens 2 minor, 3 of 3 UNREADABLE) | FIXED. Every row break is taken out before the read | `probe-p3251.mjs` |
| `TILE_BUDGET` was a line's, not a call's: 381 ms, and 987 ms median (1,333 max), a call on contrived records (lens 2 minor) | FIXED. One budget for the whole screen, his newest line placed first, so the lines left are left unplaced (read nearer the parent); A31 | `own-words.ts` |
| Core's `onInput` arrow was not pinned: his chunk broadcast to the renderer read red only through a test's `ReferenceError` (lens 2 nit) | FIXED. O1 holds the arrow to exactly the bump and then the note, a self-test planting a third statement; A35 plants the lens's `broadcast` | `build/conformance-ownwords.mjs` O1 |
| His `~/.zsh_history` moved during lens 1's app run (lens 1 minor) | Operational, nothing to fix in code. The fixer started from `743319 1794200266` (the value after that move, which did not move again in lens 1's three minutes, so his) | — |
| A Phase 321 shape drawn above his visible dialog-shaped draft: the parent raised it only because his own words formed the numbered verdict, HEAD grey; with ordinary words below neither build raises it, 0 of 32 (lens 1 nit, synthetic) | NOT FIXED, STATED, and NOT DROPPED: the shape's own tail-0 clause refuses it whatever the rule does, and the only way to raise it again is to read his own words as the agent's question (the fault, for claude 464 and qwen 1,064 cells of set A). Both agents whose shapes 321 reads hide their input row while asking (the committed captures) | for the commit body |
| Phase 312's choice reader takes his lines below a real question as its options (C5; lens 2 nit) | Out of this phase; equal at both builds; its own entry | for the main session |

#### The rule as it stands

`dialogIsHisWords(screen, words)` is true when (1) a line of his record is drawn on the screen (D3251-4's match, a
continuation never a numbered row), (2) the numbered verdict over the screen with his characters replaced by ░ reads no
question (D3251-5, the one spelling, unchanged), and (3) when the agent's rows give the dialog two or all three of the
verdict's classes (`OPT1`, `OPT2`, `HINT`-or-`QUEST`), no row of the agent's that carries one, nor a numbered row, lies
below his topmost row that carries one, and, if none of his rows carries an option, that topmost row of his is drawn
behind a mark. No clock anywhere, one comparison budget a call. The verdict's line, `own`, the shapes, the release and
every constant are unmoved (`conformance:choices` 27 clauses, `ablation:p312` 23, `ablation:p321` 33, all green).

#### Q1, restated for him (the build is on this default)

If a line you have typed and not sent is, word for word, the LAST option of the agent's question with nothing of the
question below it (no further option and no hint line), Tortie takes that question for your words until you send or clear
what you typed. No committed question has that shape: of 28,576 one-line records against every committed question, the
spec step's rule was held by 56 (every one a row of its own question), this round's rule by none. The price: a hint or a
question sentence of yours with no prompt mark before it (pi's input row, opencode's, a second line of yours) that only
finishes numbered rows the agent drew reads as needs input, as it does today (0 of 1,213 committed idle windows hold the
agent's own first and second options without a hint, so no committed screen shows it).

#### The measurements (every one through the shipping source, under the history block)

- **Set A** (`p3251-own-words.test.ts`): 4,740 cells, the parent 3,660 amber, HEAD 0, per agent as §2.1 (antigravity
  104/104, claude 464/464, codex 824/824, gemini 40/40, grok 480/480, opencode 292/292, pi 392/392, qwen 1,064/1,064 at the
  parent; 0 everywhere at HEAD; cursor and omp 0 at both). The resting cells: 171 cells of 20 runs, the parent amber in all
  20 in 156, HEAD in none.
- **Set B and D**: every recorded question at 0.2, 0.5, 1, 2 and 5 s after his last key, and the trade scene at 0.1 to 5
  s, fed exactly as unfed tick for tick (the rule can only make a question MORE the agent's than before, never less).
- **Set C**, now 37 rows: C1b RAISED (the spec's residual), C1c (his line the gate's own hint line) RAISED, the erased
  family (Ctrl-U, Ctrl-W word by word, Ctrl-A then Ctrl-K, Up, Down, Esc Esc, each then a question whose lowest row is his
  erased line) raised 20 of 20 at both, RQ1, Q7, PP2 and Y2 raised 20 of 20 at both, the new residual (his last-option
  line, a synthetic question with no hint) held, C3c (all three rows of the gate typed, not sent) held as before, C4 and
  C5 as before, C8b now equal to the parent by design (Up forgets).
- **The corpus boundary** (`own-words.test.ts`, `scratch/t/held.test.ts`): 16 questions, 1,786 one-line records, 28,576
  checks; held: 56 (the spec step) → 15 (the agent's rows below his, the classes alone) → 6 (numbered rows below counted
  too; all six a question's own hint line: Claude Code's workspace trust, Codex's update prompt and sign-in choice,
  antigravity's run permission three times) → **0** (the prompt mark).
- **The hint-only shape** (`scratch/t/hintonly.test.ts`): 0 of 1,213 committed idle windows hold the agent's own first
  and second option rows and no hint.
- **The cost** (`own-words.test.ts`, load average 2 to 9): the rule 18.1 µs (1 line), 20.3 (3), 76.9 (24), 110.8 (a full
  record), 108.8 (his own words); the contrived worst, one line, 5,472 µs; the attack's 390 contrived lines over 20 block
  rows, 4,869 µs (lens 2 measured 381,000 µs and up before); the reader 0.07 µs a key and 101.7 µs a 4 KB paste.

#### Commands, exit codes and numbers

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `743319 1794200266`, `23166 1790702242`; 89 GiB free |
| 2 | `conformance:ownwords` (after each change; last run) | 0 | PASS, 10 clauses, **81 self-tests** (72 before: +3 O1, +3 O3, +1 O5, +2 O7) |
| 3 | `own-words.test.ts` and `p3251-own-words.test.ts` | 0 | 54 and 46 tests, 100 in all (was 39 and 44); 37.5 s |
| 4 | `writer.test.ts`, `p348-paste.test.ts`, `keys.test.ts`, `core-wiring.test.ts` | 0 | 140 tests |
| 5 | `npm run typecheck` | 0 | 6 s; import boundaries 0 violations over 1,440 files; no runtime cycles over 1,437 files and 5,034 edges |
| 6 | `npm run build` (twice; the last after every change) | 0, 0 | 47 s each; `gate:electron` 185 against 185; 286 check scripts; contract byte for byte; `src/main/menu.ts` still `fe62e1dd…22ca3` |
| 7 | `npm test` (load average 9, under a slot) | 1 | 67 s; 1,195 files; 22,876 tests: **22,848 passed**, 23 skipped, 5 failed: the four `/bin/ps` natives the block refuses by design (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell that never exits" 1) and `resolve.test.ts` "hung shell that forks" (its grandchild's pid file not written within 1.2 s under load; the file alone passed 40 of 40 three times; `src/main/tmux` untouched, as lens 2 saw) |
| 8 | `conformance:choices`, `handback`, `phonecopy`, `push` | 0 each | 27 clauses; PASS; OK; 26 rules, 2,411 checks |
| 9 | `conformance:pocket`, `conformance:pocket:hostile` | 0, 0 | 192 rules, 25,815 checks, 13.9 s; 363 arms, 17.6 s |
| 10 | `conformance:machines`, `conformance:shellenv` | 0, 0 | PASS, 30 s; PASS |
| 11 | `ablation:p3251` (`P3251_SCRATCH=fixer/abl3251`, under a slot), first run | 1 | 36 arms: A5, A7 and A9's owners stayed GREEN, the new rule protecting their scenes too; each owner was given a scene only its own clause decides (the last-option question for A5, a hint after the agent's first word for A7, his whole words above Claude Code 2.1.280's unnumbered gate for A9) |
| 12 | `ablation:p3251`, after the prompt mark (A36, A37 added) | 1 | 38 arms: A5 and A24 green (the mark masks the substring scenes and RQ1); A5 given the last-option question, RQ1 left out of A24's owners (two clauses guard it, so neither alone reddens it), A5 and A24 then 2 of 2 red |
| 13 | `ablation:p3251`, the whole | 0 | **PASS in 103.9 s, 38 of 38 arms** (A1 to A37 and A3b), every owner red; control 55 of 55 green first and last; the clone gone |
| 14 | `ablation:p313`, `P313_ONLY` the 43 arms on `paste.ts` (22) and `writer.ts` (21), `Z7x`, `Z7y` and the new `Y15x` among them (`P313_SCRATCH=fixer/abl313`, under a slot) | 0 | **PASS in 492.6 s, 43 of 43**, each newly red on the rule that owns it; 824 entries in all |
| 15 | `ablation:p312`, then `ablation:p321` with its clone root moved to `fixer/abl321`, in a clonefile copy of the worktree (`.git` removed), under a slot | 0, 0 | 23 of 23 in 68 s; 33 of 33 in 129.3 s |
| 16 | `node build/p3251/probe-p3251.mjs --grader-self-test` | 0 | PASS, 168 cases, nothing started |
| 17 | the built `out/renderer` and `out/preload` for ten record names (`ownWords` … `dialogEvidenceRows`, `EVIDENCE_OPT1`) | — | none in either; each in one `out/main` file |
| 18 | `probe:p3251` at both builds, the built parent first (`P3251_PARENT_CHECKOUT=scratch/p3251/spec/parent`, `P3251_KEEP=1`), from the worktree through `build/harness-socket.mjs --fresh gmux-p3251`, OUTSIDE the history block (Electron and `/bin/ps`) with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TMPDIR` and `TMUX_TMPDIR` under `fixer/ptmp`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset, under one slot (`fixer/run-probe.sh`) | 0 | **PASS, 1,795 s, four launches, every arm at both builds**, the monitor at 0.47 to 0.51 ticks a second. Parent: W the fault in 36 of 42 numbered cells (48 cells, 36 ⌘J rows); Q 25 of 25 raised, first needs input 4,868 to 5,047 ms after the draw, 314 to 469 ms past its own ticks; C all four raised; S raised; R the replayed gate needs input and its own gate raised; F raised; E both fixes amber. HEAD: W 0 of 48 needs input and 0 ⌘J rows, every watch read through; Q 25 of 25 raised, 4,693 to 4,855 ms after the draw, 150 to 302 ms past its own ticks, each no later than the parent's plus one poll; **C: C1b, C2, C1c and C1u raised** (C1u's stand-in row emptied by Ctrl-U); S raised; **R READ, as it had not been in 3 of 3 attack-lens runs**: the replayed gate grey and its own gate after his Enter raised; F raised; E both grey; LOG none of his words in the app log or on the console, his record in none of 663 files. RUN clean: 92 processes seen, 0 left, 0 needing a kill; no Electron of the run; the census and teardown clean; his history unmoved; no crash report |

#### The files this round changed (all inside `git diff de9ea8f2`)

`src/main/activity/own-words.ts`, `src/main/activity/screen.ts` (`dialogEvidenceRows`, `EVIDENCE_OPT1`/`_OPT2`/`_HINT`, and
`export` on `NUMBERED`; the verdict's loop, literals and window untouched), `src/main/reply/writer.ts` and
`src/main/reply/__tests__/writer.test.ts` (NEW to this phase's diff: the message's Enter), `src/main/screen/paste.ts`,
the two activity test files, `src/main/screen/__tests__/p348-paste.test.ts`, `build/conformance-ownwords.mjs`,
`build/conformance-pocket.mjs` (Y15's one exemption), `build/ablation-p313.mjs` (`Z7x` and `Z7y` follow the record's copy;
`Y15x` new, 824 entries), `build/p3251/ablation.mjs` (A20's needle; A22 to A37), `build/p3251/probe-p3251.mjs` (arm C
four cases, every one graded raised; arm R's premise), this SPEC and `CLAUDE.md` (the `conformance:ownwords` row, the
`conformance:pocket` row's 325.1 sentence, the reply row's, the `probe:p3251` row).

#### For the commit body and the main session

- Moved on purpose: `conformance:ownwords` O1 (four writers, the message's Enter, core's arrow exact), O3 (an allowlist),
  O5 (Ctrl-U), O7 (`dialogEvidenceRows` once), O10 (`writer.ts` out of `OWN_EXEMPT`); `conformance:pocket` Y15 (the
  record's one copy); `p348-paste.test.ts`'s text row (one `.replace(`); `ReplyCore.activity.noteOwnWords?`; three
  constants and a function exported from `screen.ts`.
- Stated limits for the commit body: the residual of Q1 above; a hint line of his with no prompt mark that only finishes
  the agent's numbered rows reads as today; the Phase 321 shape above a visible dialog-shaped draft (synthetic, above);
  the echoed prompt (Q2, unchanged); a split escape sequence; an agent that rewrites what he typed; Phase 312's choice
  reader over his lines (C5, its own entry).
- Not run by this role, and why: `smoke`, `smoke:t1`, `smoke:t3` and `package:dir` (the integrator's brief left them to
  landing; this round moved no packaged file); `conformance:resume:capture` (real agents) and `measure:p337 -- --check`
  (a scratch `TMUX_TMPDIR` outside `/tmp` refused), as §7; `ablation:p328` and `ablation:p320` (`state-machine.ts` and
  `attach-host.ts` untouched this round); a session on the loopback machine and the phone's door live (the tap's local
  guard is pinned by Y17 and O2; the writers by their verbs' tests).

#### At the end (02:29)

- His shell history: `743319 1794200266` and `23166 1790702242` at this round's start, around the probe (its own reads
  agree) and at the end; it never moved in this round. (Lens 1 saw `.zsh_history` grow 153 bytes at 23:57:46 while no
  shell of its own was alive and not again in three minutes, so it was his; this round started from that value.)
- `~/Library/Logs/DiagnosticReports` and its `Retired/`: 98 entries by name and mtime, the same before and after the probe.
- Electrons (CLAUDE.md's count, outside the block, 02:29): six lines, none this round's: his `Tortie` (pid 692, parent 1)
  and the crashpads of Slack, Chrome, `/Applications/Tortie.app`, Granola and Cursor. No `p3251` socket under
  `/private/tmp/tmux-501/` or the probe's `TMUX_TMPDIR`. Every lock slot free, each taken released from its trap.
- Removed: the round's clonefile copy of the worktree and every ablation clone (each harness removed its own). Left for
  the reverify: `scratch/p3251/fixer/` (33 MB of logs, the scratch runner, the probe's kept world under `ptmp/`), the
  built parent `scratch/p3251/spec/parent` untouched, and `out/p3251/probe-p3251.json` (ignored by git).

### His ruled round (2026-11-14)

Written by the ruled round's builder in `/private/var/tmp/tortie-wt/wt-p3251`, rebased by the main session onto origin/main
`8645875e` (Phases 362, 365, 366 and 361.1's guard). Nothing committed, staged or stashed; nothing rebased, pulled or
merged; `/Users/gdc/gmux` untouched. Scratch, logs, clones and harnesses: `/private/var/tmp/tortie-wt/scratch/p3251/ruled-builder/`.
The parent is `/private/var/tmp/tortie-wt/wt-p3251-parent` (`8645875e`), built once here (`npm run build`, exit 0, 178 s).

His ruling, "325.1 a": one more short round. Lines only count as his when they form one block that starts at the input's
prompt mark, so a copied question that the agent draws is not mistaken for his. Pi and OpenCode draw no prompt mark, so
test those two first; if the false amber comes back there, bring it to him before landing.

#### What was built, and where each piece comes from

| Piece | What it does | Source |
| --- | --- | --- |
| The block | His rows that the numbered verdict counts must be ONE run of his rows, and the run must begin on a row where his first line starts an input (`oneBlockFromHisStart`). A copy of a question in his draft is broken by the question's own blank rows and rows of the agent's, or its first line (a line of his before the copy) is on none of the question's rows | The ruling |
| The input's start | "The input's prompt mark", read as where an input row starts: his first line behind the agent's prompt mark (a mark that holds no letter or digit), or, for an agent that draws none, at the row's start under a row that holds no letter or digit (pi's rule, the blank line above opencode's box). A copied option or hint row sits under the agent's row above it and starts no input (`startsAnInput`) | The ruling; the reading for the two agents that draw no mark is this round's, measured both ways below |
| Two of a question's rows | The fix round's checks (nothing of the agent's that the verdict counts, nor a numbered row, below his rows; a hint of his behind a mark) now also apply when his rows give one or two of the three classes, not only when the agent's rows give two: `agentLacks < 2 \|\| (hisLacks > 0 && hisLacks < 3)`. Two option rows typed word for word are the agent's once its hint or next option lies below them | The brief ("or two of its rows"); the block alone leaves them held, since both rows are one run behind the agent's own `›` or `●`, which reads as a prompt mark |
| The replay | `OwnWords.replayed`, set by `noteReplayedOn` and cleared with the record: a restore's replayed page is a page the shell printed, its blank rows part of it, and is not asked for a block. The restore arms its resume and waits for his Enter, so no agent runs in that time | New, needed: the block alone turned C9 and probe arm R amber again |
| The line bound | His first line and at most a screen's rows of his newest are placed; the one budget of 50,000 now counts every step (each mark of each row tried for a line), not only the comparisons | Item 4 of the brief, the last round's cost finding |
| O5 | `conformance:ownwords` O5 refuses an object or array literal built at module level in own-words.ts, and any write to a member of a name declared there (an assignment, `++`, `--`, `delete`, a mutating method, `Object.assign` and kin); and (new, the same hole spelled another way) a call, `new` or tagged template run when the module loads, since an IIFE can keep a counter in a closure with neither; 8 self-tests, the reverify's RV-P2 and RV-P3 among them, every one red | Item 5; the last round's nit |
| The guard | `build/conformance-ownwords.mjs` and `build/p311/copy-drift.mjs` end through a byte-for-byte copy of `conformance-pocket.mjs`'s `exitWhenWritten`, clause 9's first remedy (its header: a measured row "is not seen until its row is measured again" when a gate grows) | Item 3 |
| The probe's shell alone | Arm W ends with the shell alone: each text typed and pasted into the shell with every agent's input row empty and no session in a question (`others` recorded). A shell cell that needs input at HEAD passes only where the parent read the same text there as needs input too, and one the parent read grey is a failure; 10 grader cases and 2 reviewer cases, 180 in all. It replaces the exemption this round first wrote, which called the shell's two cells "as the parent" while the parent's own cells beside the agents were grey | The app run (below); the standing ruling that a scenario worse than the parent is a defect |

Kept from the fix round, unchanged: the record, its reader and every writer; the tile; the counterfactual; the shapes and
the needs-input clause in `own`; no clock. No constant, status, copy, surface, menu or channel moved; `src/main/menu.ts`
and `docs/audits/contract-baseline.txt` are untouched by the phase (`git diff 8645875e` names neither).

#### Set A first, pi and opencode first (lens 1's matrix, `verify-matrix/tools/vm-matrix.test.ts`, run in clones of each build, every number today)

His three dialog-shaped texts typed and pasted into every committed idle window's input row, at both cadences, through
each build's shipping monitor class.

| Agent | Cells | Parent | Last round's HEAD | This round | The literal reading (a visible mark required) |
| --- | --- | --- | --- | --- | --- |
| pi | 1,176 | 1,176 | 0 | **0** | **1,176** |
| opencode | 876 | 876 | 0 | **0** | **876** |
| antigravity | 312 | 312 | 0 | 0 | not run |
| claude | 1,392 | 1,392 | 0 | 0 | not run |
| codex | 2,448 | 2,448 | 0 | 0 | not run |
| cursor | 2,004 | 1,336 | 0 | 0 | not run |
| gemini | 96 | 96 | 0 | 0 | not run |
| grok | 1,440 | 1,440 | 0 | 0 | not run |
| omp | 1,236 | 824 | 0 | 0 | not run |
| qwen | 3,192 | 3,192 | 0 | 0 | not run |
| all | 14,172 | 13,092 | 0 | **0** | pi and opencode every cell |

The literal reading brings the false amber back on every pi and opencode cell, which is what his ruling said to test
first. The build reads the prompt mark as the input's start, so set A stays 0 for all ten agents. The spec's own set A
(`p3251-own-words.test.ts`, 4,740 cells) reads parent 3,660, HEAD 0; its resting cells read 0 everywhere but the six at
bash's prompt (below).

**Live, the installed Claude Code (his relayed request: "you can run real harnesses / claude code and codex to test the
fix to issue 44").** Claude Code 2.1.325 (the committed captures are 2.1.287), run by `ruled-builder/tools/real-claude.mjs`
in a scratch tmux server of the vendored tmux, under a scratch HOME (its first-run state written there, in its own
`.claude.json`; none of his stores read), the base URL and every proxy at the closed port `127.0.0.1:9`, the updater,
telemetry and non-essential traffic off, a made-up API key, and no model turn (Enter never pressed at its input row).
Offline it first refused to start ("Unable to connect to Anthropic services"), so the scratch HOME's config was marked
onboarded and the folder trusted. Its input row draws his first line behind `❯` and the rest indented two, as 2.1.287
did; a four-line paste is folded into `[Pasted text #1 +3 lines]`. The three texts pasted and typed (Alt-Enter between
lines), each capture judged by each build's shipping code (`real-judge.test.ts`): **the parent reads needs input on 5 of
5 screens that draw his words, the last round's HEAD and this round 0 of 5**; the folded paste is no question at any
build. The tmux server was ended in a `finally`, the agent's pid read gone afterwards. **Codex was not started**: a Codex
TUI under a scratch `CODEX_HOME` starts its own `setsid` shared daemon, which outlives the pane and installs a package
(build/p323/SPEC.md §2), a side effect past this round's refusals; its committed 0.160.0 input rows are set D below.

#### The shell, in the app (probe arm W)

The full run's arm W read 2 of HEAD's 48 cells as needs input, both the shell's: the two pasted texts the parent's own
verdict reads as a question, his first line behind zsh's `~/project % `, a prompt that holds letters, so no input starts
there and the block has no start. The parent's same two cells were grey, and that grey was not a reading. Beside them
its fault held six of the seven agents amber (six for most of each watch, four or five at a few of its first polls, over
the three runs); a session in a question takes one of the tick's six captures first (`MAX_CAPTURES_PER_TICK`,
`src/main/activity/monitor.ts:99`, `always.slice(0, 6)` in `captureScreens`); and zsh never sets the keypad flag here
(`keypad_flag` 0 at rest, after a paste and after a command, measured on the vendored tmux 3.7b with this probe's zsh
files), so only its screen can raise the shell, and the parent never read that screen. So arm W now ends with the shell
alone. The re-run at both builds (1,031 s, the parent first, exit 0): **the parent alone 2 of 2 pasted questions needs
input, HEAD alone 2 of 2**, every alone cell equal to the parent's (first needs input after 8 and 9 polls; each typed
text working through its whole watch at both builds); HEAD's two cells beside the agents need input as the parent alone
does; the agents 0 of 40 at HEAD, 36 of 40 at the parent; RUN clean, no crash report. The typed cells beside the agents
stay working longer at HEAD (31 to 36 polls, the parent 17 to 20 then idle) for the same reason: alone, the parent reads
them working through the whole watch too. The last round's HEAD held both pasted cells grey (lens 1's kept run): the
block gives a shell's own pasted questions back to the parent's reading.

#### The copies: the reverify's own scenes, at the parent, the last round's HEAD and this round

| Scene (the reverify's harness, through each build's shipping monitor) | Parent | Last HEAD | This round |
| --- | --- | --- | --- |
| `rv-monitor`: a copy of 6 questions pasted after a line of his, as a placeholder and drawn as rows, two rows typed (3 kinds), ordinary words (controls), 8 hostile keys | 29 scenes, 16 cells each | 15 scenes held 0/16 where the parent raised 16/16 | **29 of 29 equal to the parent** |
| `rv-cross`: a copy of an earlier prompt, then a later one (6 kinds) | 16/16 each | 0/16 in 4 kinds | **16/16 each** |
| `rv-pairs`: every ordered pair of one agent's questions, a copy of one, then the other | claude 112/112, codex 264/264, gemini 144/144, antigravity 12/12 | 72, 84, 96, 0 | **112, 264, 144, 12** |
| `rv-held` (the rule alone): one line, every pair of a question's rows, the whole question pasted | held 0/663, 0/6,726, 0/34 (by construction) | 0, 80, 34 | **0, 0, 0** |

And this round's own (`ruled-builder/tools/rb-held.test.ts`, the rule alone over 33 distinct committed numbered questions,
every run of a question's inked rows from row a to row b, typed and pasted, 13,752 checks):

| Family | Last HEAD | This round | The literal reading |
| --- | --- | --- | --- |
| the run as his whole draft | 4,086 held | **300 held** (gemini 222 of 4,196, claude 72 of 3,334, codex 2 of 5,048, the non-agent prompt 4 of 56, antigravity 0 of 1,118) | 0 |
| the run after a line of his own | 4,086 held | **0** | 0 |
| a terminal copy, blank rows kept, whole and after a line of his | 4,086 and 4,086 | 300 and 0 | not run |

#### Sets B, D, E and F (lens 1's matrix at both builds)

- **B**, every recorded question drawn 0.2 to 2 s after his last key, 800 cells a variant: ordinary 512/512, ordinary left
  below 320/320, a record holding option text 512/512, dialog replaced 512/512, parent and HEAD alike; raised at both,
  2,176 cells on the same tick, none later, none earlier. **Dialog left below: parent 800/800, HEAD 320/800**, and HEAD
  equals the parent's ordinary-left-below cell for cell, 800 of 800: the 480 cells are 15 questions (cursor's five,
  qwen's two permissions and two fixtures, opencode's outside folder, antigravity's folder trust and sign-in, Claude
  Code's 2.1.280 folder trust and its fixture, Claude's theme picker), raised at the parent only because his own words
  formed the numbered question. Unchanged by this round.
- **D**, his lines in Claude Code 2.1.287's and Codex 0.160.0's real input rows: as lens 1 wrote it, parent 64/72, HEAD
  16/72; the 16 are the two `stray-1` captures, where its splice lands in the BANNER row behind `Claude Code v2.` and
  `>_ OpenAI Codex (v0.` (it finds the first row holding `1`), a prompt that holds letters. With his lines put in the real
  input row (`VM_D_INPUT=1`): **parent 72/72, HEAD 0/72**.
- **E**, every launchable row over a synthetic input row: his words parent 90/96, HEAD 0/96; a real question 0.5 s after
  his last key raised 90/96 at both, none lost.
- **F**, a line typed then erased with Ctrl-U, Ctrl-W, Up, Esc Esc, Ctrl-C or Backspace, or left: 21 of 21 rows raised as
  the parent raises them.

#### The cost

The rule places his first line and at most a screen's rows of his newest distinct lines, on one budget of 50,000
steps, so it considers at most one more line than the screen has rows. The reverify's two cost files at the last HEAD
and at this round, three alternating rounds under one slot (load average 9 to 15), the median of the three: 8,191
distinct one-character lines at the cap 9.3 ms at the last HEAD, **0.17 ms** now; 4,000 short lines under 150 rule rows
7.5 ms, now 1.3 ms; 300 lines of 40 marks under 150 rule rows 4.9 ms, now 1.9 ms; 390 lines of 40 blocks under 20 block
rows above Claude's gate 4.0 ms, now **2.6 ms, the worst median measured** (its rounds 1.2, 3.4 and 2.6 ms; its slowest
single call 6.5 ms, the last HEAD's slowest 12.1 ms); Gemini's gate under 900 markdown headings 2.4 ms, now 0.42 ms. Two
rows are slower than at the last HEAD, both under 0.25 ms: one line of 16,383 letters (0.11, now 0.23 ms) and
antigravity's 24-line permission (0.13, now 0.15 ms). Two earlier rounds at load 39 to 67 read the same order. The parent
reads no record and spends none of this.

#### Restated for him (Q1, and the limits; this replaces the fix round's "Q1, restated for him")

**Q1.** If the whole of what you have typed and not sent is, from its very first line, a word-for-word copy of a
question's own rows, from its question line or its first option downward, and the agent then draws that same question
with no gap between those rows, Tortie takes it for your words until you send or clear what you typed. With any words of
yours before the copy, the question shows as it does today. Over every committed question: 300 of 13,752 such copies, none
once a line of yours comes first.

**The reading the ruling left to test.** Read literally, "starts at the input's prompt mark" needs a visible mark
before your first line. Pi and OpenCode draw none, and with that reading every one of their 2,052 set-A cells turns
amber again, as you said to test first. So Tortie reads the mark as where your input starts: behind the agent's mark,
or, for pi and OpenCode, at the start of the row under the input's edge. That keeps your own words grey for all ten
agents, and its price is Q1 above: the literal reading holds none of those 13,752 copies.

The other limits, each measured today:
- A question drawn above a visible draft of yours that itself looks like a numbered question reads as it would above
  ordinary words, which for some agents is not at all (set B, 480 of 800 cells, 15 questions).
- Your own dialog-shaped words read as the parent reads them when your first line is not drawn whole: behind a prompt
  that holds letters, as a shell's (bash's `bash-5.2$`, the six longer-text resting cells, 20 of 20 amber at both
  builds; zsh's `~/project %` in the app, both pasted questions needs input at both builds, which the last round held),
  or lens 1's banner splice above; or when a blank line of yours falls between them.
- A hint or question line of yours with no prompt mark before it that only finishes numbered rows the agent drew reads
  as the parent reads it (the fix round's, unchanged); the echoed prompt (Q2, unchanged); a split escape sequence; an
  agent that rewrites what you typed.

#### Still worse than the parent, with numbers

- Set B's dialog left below: 480 of 800 cells (above).
- Q1: 300 of 13,752 copies held (above); the last round's HEAD held 4,086.
- The shell beside agents the parent wrongly raises (probe arm W): both pasted questions need input at HEAD where the
  parent's cells are grey, because there the parent's six false ambers take every capture and it never reads the
  shell's screen; alone, both builds read the shell alike, 2 of 2 needs input.
- The cost: a numbered screen with his words on it costs a read the parent never makes, worst median 2.6 ms and slowest
  call 6.5 ms measured (above).

#### Commands, exit codes and numbers

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `746290 1794669389` and `23166 1790702242` at the start; 85 GiB free |
| 2 | lens 1's set A at the parent and the last HEAD (clones, history block) | 0, 0 | 13,092/14,172 and 0/14,172, 19.2 s and 33.3 s |
| 3 | set A with the narrowing, pi and opencode first, then all; the literal reading on pi and opencode | 0 each | pi 0/1,176, opencode 0/876, all 0/14,172; literal 1,176 and 876 |
| 4 | the reverify's `rv-monitor`, `rv-cross`, `rv-pairs`, `rv-held` at three builds; `rb-held` at four readings | 0 each | the tables above |
| 5 | lens 1's sets B, D, E, F at both builds; D in the real input row | 0 each | above |
| 6 | `own-words.test.ts` and `p3251-own-words.test.ts` | 0 | 113 tests (100 before; 13 rows new, 6 changed on purpose: the fix round's Q1 residual and C3c now raised, the resting row's bash cells read as the parent) |
| 7 | `npm run typecheck` | 0 | 9.7 s; 1,446 files, 8,248 imports, 0 violations; no runtime cycles over 1,443 files |
| 8 | `npm run build` | 0 | 64 s; `gate:electron` 188 against 188; `assert-hermetic-checks` PASS, 288 check scripts, clause 9: 20 piped gates, 3 finishing their writes, 17 measured; the contract byte for byte |
| 9 | `npm test` (one slot, history block, load 14 to 26) | 1 | 23,052 passed, 23 skipped, 11 failed: the four `/bin/ps` natives the block refuses (`process-table.native` 1, `ps.native` 2, `p269-env-names` 1); the native FSEvents watcher tests `store-watch.native` 1, `p365-process.native` 2 and `repo-watcher.native` 3, which fail at the parent too under the same block (3 and 5 of 10 in two runs, a different set each time; the phase touches none of their files); and `ttfr.integration`'s 60 ms bound under load (75 ms) |
| 10 | `conformance:ownwords`, `phonecopy`, `choices`, `handback`, `push`, `gate:checks` | 0 each | 10 clauses and **89 self-tests** (81 before; 88 at first, then the IIFE plant; **97 and 7 honest copies** after the gate review that followed this round, his second ruled round's correction); OK; 27 clauses; PASS; 26 rules, 2,417 checks; PASS |
| 11 | `ablation:p3251` (one slot) | 1, 0, 0 | first run 8 arms' owners green (A4, A11, A22, A25, A28, A29, A30, A31): the block protected their scenes. Each given a scene only its own clause decides (a draft that is a gap-free copy of a question's two options, the one shape the rule still holds), A25 and A31 their last owners dropped (no committed one-line record and no bounded cost row tells them apart now); then those 8 of 8 red; then the whole: **PASS in 143.5 s, 51 of 51 arms** (A1 to A50 and A3b), control 72 of 72 green first and last |
| 12 | the reverify's two cost files at both rules, twice (one slot) | 0 each | the cost above |
| 13 | `npm run build` in the parent | 0 | 178 s |
| 13b | `real-claude.mjs` (history block): the installed Claude Code 2.1.325, scratch HOME, no network, no model turn; three runs (the first two stopped at its offline first-run screen, then at a footer the driver did not know); `real-judge.test.ts` over its captures at three builds | 1, 1, 0; 0, 0, 0 | 5 screens drawing his words: parent 5 needs input, last HEAD 0, this round 0; the tmux servers ended, the agent's pid gone, the three stale sockets removed |
| 13c | `conformance:containment`, `conformance:logins` (they read CLAUDE.md, which this round edits) | 0, 0 | OK, 52 readings and 10 of 10 ablations; OK, 27 of 27 ablations |
| 14 | `probe:p3251` at both builds, the parent first (one slot, outside the block with the scratch environment), 1,804 s | 1 | the parent: every arm PASS (W the fault, 36 of 42; Q first needs input 4,581 to 5,093 ms; C, S, R, F, E). HEAD: Q, C, S, R, F, E and LOG PASS (R: the replayed gate grey, its own gate raised); **W FAIL, 2 of 48 cells, the shell's two pasted questions** (above); **RUN FAIL, 5 Electron crash reports** written in its windows (below); 92 processes seen, 0 left |
| 14b | arm W at both builds before the shell-alone pass, under an exemption since removed, 739 s | 1 | the parent 36 of 42; HEAD W PASS only under that exemption (the shell's two cells needs input beside the agents, the parent's grey); RUN FAIL, 1 Electron crash report |
| 14c | arm W at both builds with the shell alone (`P3251_ARMS=W`), 1,031 s | 0 | the parent alone 2 of 2, HEAD alone 2 of 2, equal cell for cell; HEAD W PASS (46 cells, 40 asked, none needs input; the shell's 4 cells need input as the parent alone); LOG and RUN PASS, no crash report |
| 15 | `node build/p3251/probe-p3251.mjs --grader-self-test` | 0 | 180 cases (171 before; the exemption's 3 replaced by 10, and 2 reviewer cases), nothing started; **186** after the probe review that followed this round added 6 (his second ruled round's correction) |
| 16 | `ruled-builder/tools/kp.sh`: zsh's keypad flag on the vendored tmux, a scratch socket and HOME (history block) | 0 | `keypad_flag` 0 at rest, after a paste and after a command; the server ended in its trap |
| 17 | `npm run build`, final (history block) | 0 | 65 s; `gate:electron` 188 of 188; `assert-hermetic-checks` PASS, 20 piped gates read by 24 harnesses, 3 finishing their writes, 17 measured at most 42,917 bytes against 49,152; the contract byte for byte |
| 18 | `ablation:p3251`, final (one slot, history block) | 0 | PASS in 117.3 s, **52 of 52 arms** (A1 to A51 and A3b), control 72 of 72 green first and last, every clone file restored by sha256 |
| 19 | the reverify's two cost files, three alternating rounds at both rules (the same slot) | 0 each | the cost above |
| 20 | after the last `CLAUDE.md` edit: `conformance:ownwords`, `containment`, `logins`, `credentials`; vitest over `src/main/{activity,attach,reply,screen,restore}` (history block) | 0 each | 89 self-tests (97 and 7 honest copies after the gate review that followed); 52 readings, 10 of 10; OK; OK in 52 s; 60 files, 1,431 tests |

#### The files this round changed (all inside `git diff 8645875e`)

`src/main/activity/own-words.ts` (the block, the input's start, the replay mark, the line bound, the step budget, the
two-row checks, its header's limits), `src/main/activity/__tests__/own-words.test.ts` and
`src/main/activity/__tests__/p3251-own-words.test.ts` (the ruled round's rows, the changed residual rows),
`build/conformance-ownwords.mjs` (O5, its self-tests, `exitWhenWritten`), `build/p311/copy-drift.mjs` (`exitWhenWritten`),
`build/p3251/ablation.mjs` (A38 to A51, A26's needle, owners), `build/p3251/probe-p3251.mjs` (arm W's shell alone and its
grader), `CLAUDE.md` (the `conformance:ownwords` and `probe:p3251` rows) and this file.

#### At the end

- His shell history: `746321 1794670684` and `23166 1790702242` before and after every run of this round and at its end.
  It moved once, at 10:38 (+31 bytes), while only history-blocked commands of mine ran, and not again in three minutes,
  so it was his; this round took that value from then on.
- Electrons, counted once at the end with CLAUDE.md's command: none of this round's. His Tortie (pid 94808), another
  round's build under `wt-p360` and other apps' crash handlers only.
- Crash reports, by name and time only, none opened: six `Electron-2026-11-14-*.ips` were written while my probe runs ran
  (11:56:55, 12:01:31, 12:02:18, 12:03:25 and 12:11:30 in the full run, 12:25:21 in the first W re-run), none in the last.
  My runs' own profiles hold no crash dump, their logs name no crash, no launch threw and every app answered to its
  teardown. Other rounds ran Electrons in the same windows (one held a slot beside each run, another ran a battery of 151
  Electron harnesses), so whose they are is not known.
- No `p3251` socket left under `/private/tmp/tmux-501` or the runs' own `TMUX_TMPDIR`; every slot of mine released.

### His second ruled round (2026-11-16)

Written by the second ruled round's builder in `/private/var/tmp/tortie-wt/wt-p3251`, rebased by the main session onto
origin/main `9a04292b` (Phase 359, and Phase 368's issue 44: its width tables moved to `src/shared/{cells,cell-widths}.ts`,
`-x`/`-y` and the attach at the shown size, `-T` hyperlinks on the attach). Nothing committed, staged or stashed; nothing
rebased, pulled or merged; `/Users/gdc/gmux` untouched. Scratch, logs, clones and harnesses:
`/private/var/tmp/tortie-wt/scratch/p3251/a-builder/`. The parent is `/private/var/tmp/tortie-wt/wt-p3251-parent`
(`9a04292b`), its `out/` built once here (`npm run build`, history block, scratch HOME, exit 0, 62.5 s); nothing else in it
was touched. 368's merged code was read beside this phase's: the tap's one `onInput` call still follows `client.pty.write`
under the local and no-report guard, and the restore's note still sits between `const { info } = outcome;` and the live id.

**His ruling** ("360 a 325.1 a", 2026-11-16). He read: two kinds of drafts still turn amber, the same as today, a draft with
a blank line between its numbered lines, typed or pasted on the Mac (all 18,896 test cases, pi and opencode among them),
and numbered text pasted from the iPhone (6,546 of 7,086); the round before had fixed most of these, and the change he
chose on 14 November brought them back. He chose (a): one more short round; Tortie counts a blank line inside his draft as
part of his typing and records a paste from the phone in full; then check again and land it; one known limit could grow a
little (a draft that starts with a copy of an agent's question can hold that question when the agent asks it, 300 of
13,752 test cases), and the round measures it again. **The rebase renamed this phase's `ablation:p313` arm `Z7x` to `Z7t`**
(Phase 368's width arm took `Z7x` first): every earlier mention in this file of `Z7x` as this phase's arm (the integrator's
"`Z7w` became `Z7x`", the fix round's "`Z7x` and `Z7y` follow the record's copy") means `Z7t`.

#### What was built, and where each piece comes from

| Piece | What it does | Source |
| --- | --- | --- |
| His blank rows | `withHisBlankRows` (`src/main/activity/own-words.ts`): a run of blank rows (no form once the border is stripped) between two rows of his counts as his, for the block his counted rows must form, when his record holds EXACTLY that many blank lines between a line whose tile ENDS on the row above the run and one whose tile BEGINS on the row below it (`recordHoldsBlankLines`); the walk up to where his input starts goes through them too. A blank row his record does not hold (the agent's own, one more or fewer than he typed, or before a line not drawn below it) still breaks the block | The ruling; the last reverify's major problem 2 |
| A blank line is whitespace alone | `isBlankLine`: a line of his counts as a blank line only when nothing but whitespace is on it. A line of a box's marks (`│      │`, which a terminal selection of gemini's boxed question carries) has no form either but is not a blank line he typed, and never stands for the box's blank rows | New, measured: read by its form, a copy of a boxed question held it, 704 copies instead of 300 with the blank rows left out and 1,238 with them kept (gemini 222 to 626), and gemini's whole question pasted held it (1 of 33) |
| Only the lines the rule places | The record is searched among his first and newest lines (as many as the screen has rows, each with the blank lines beside them), the lines the rule places, so an old, unplaced copy of his lines with a blank line between them holds no blank row, and a record at its cap costs no more than one a screen long | New, the cost bound written as a rule |
| The phone's paste recorded whole | `src/main/screen/paste.ts`: the act's ONE list is now `copy-mode -q -t P ; display-message -p -t P #{bracket_paste_flag} ; paste-buffer -p -d -b N -t P`; the display types nothing and prints `1` for a pane that asked for bracketed paste, so it is the mode `paste-buffer -p` brackets under (read in the same list, before the paste, so a list that fails there types nothing). The record is handed the paste as the pane received it: every line break a carriage return, between `ESC [ 200 ~` and `ESC [ 201 ~` when the flag printed `1` (byte for byte what xterm sends for the same paste at the desk), and with no markers when it printed `0`, nothing (tmux before 3.7, Homebrew's 3.6a) or anything else, the reading before this round, so no line a program sent is ever kept unsent. The bracket is still the server's to put on (Phase 348's D58) | The ruling; the last reverify's major problem 1 and its fix ("hand the record the bracketed text when the pane asked") |
| Gates moved on purpose | `conformance:pocket` PS4's argv gains the display (two new self-test plants, the flag read after the paste and read of another pane, each red); Y15's exemption also lets the record's one `.replace(` through inside the template that brackets it, as `noteOwnWords(`'s second argument and nowhere else; the hostile client's PSH1 list (`build/p313/hostile-client.mts`, new to this phase's diff); `ablation:p313` re-points `PS4a`, `Z7t` and `Z7y` and adds `PS4f` (the flag read after the paste, red on PS4 and the hostile client) and `Y15t` (the typed text's line breaks changed inside a template, red on Y15), 833 entries | The paste's change; obligation 2's spirit (a new shape goes into the gate in the same commit) |
| `ablation:p3251` | A20, A33 and A38 re-pointed (A33 is now the paste bracketed whatever the program asked); A52 his blank rows not counted, A53 any blank run between two rows of his counted, A54 the blank lines not counted, A55 every line of his record asked, A59 a line of box marks read as a blank line, A56 the paste never bracketed, A57 the flag read loosely, A58 the flag not read; 60 arms | Every new rule has an arm |
| Tests | `own-words.test.ts`: the ruled round's row whose last assertion read a blank line of his as breaking the block now reads it as his (changed on purpose, the ruling); 6 new rows (his blank rows typed, pasted and with Alt-Enter in five input-row shapes; a blank row his record does not hold; one more or fewer; box marks; only the lines placed; Q1 with its blank rows). `p3251-own-words.test.ts`: set A with a blank line between his lines over every committed idle window, typed, pasted and with Alt-Enter, 7,110 cells, unfed (the parent) 6,570, fed 0. `p348-paste.test.ts`: the act's argv (its title names the flag), the record handed the bracketed paste when the flag reads 1, recorded whole exactly as the desk's paste, a pane that did not ask, 3.6a's empty answer and four other answers keeping the reading before, and the flag read in the act's own list just before the paste; the rig's runner answers what tmux prints | The ruling; every rule has a row |
| The probe | Arm W's texts gain `gap`, his question and options with a blank line between them, typed and pasted, beside the agents and in the shell alone; arm C's comment now says all four of its cases are graded; `gradeEdits`' dead "read needs input" clause taken out (it could never fire once `premise` is null), as the probe review did in `gradeWords` | The ruling; the last round's probe review |
| Words | `CLAUDE.md`: the `conformance:ownwords` row (the blank rows, the paste, 97 self-tests and 7 honest copies, 60 arms, Q1 restated with today's numbers), the `conformance:pocket` row (the paste's flag, 833 arms), the `probe:p3251` row. `CHANGELOG.md`: the item ends "unless what you have typed starts with a copy of that same question", true as measured. This file: the ruled round's rows 10, 15 and 20 corrected (97 self-tests and 7 honest copies; 186 cases) | The brief |

Kept from his ruled round, unchanged: the record, its reader and every writer but the paste's handoff; the tile; the
block and where an input starts; the counterfactual; the shapes and the needs-input clause in `own`; no clock. No
constant, status, copy, surface, menu or channel moved; `src/main/menu.ts` and `docs/audits/contract-baseline.txt` are
untouched (`gate:contract` byte for byte).

#### The tmux flag, measured on the two builds (`a-builder/tools/flag-measure.mjs`, history block)

Exactly the paste's new list, on a scratch socket under a scratch `TMUX_TMPDIR`, into a pane whose program asked for
bracketed paste and one that did not, the server ended in a `finally`:

| tmux | Program | The list printed | What the program received |
| --- | --- | --- | --- |
| vendored 3.7b | asked | `1\n` | 29 bytes, `ESC [ 200 ~` … `ESC [ 201 ~`, its line break a carriage return |
| vendored 3.7b | did not ask | `0\n` | 17 bytes, no markers, its line break a carriage return |
| Homebrew 3.6a | asked | `\n` (no such flag before 3.7) | 29 bytes, bracketed |
| Homebrew 3.6a | did not ask | `\n` | 17 bytes, no markers |

Every buffer was gone after the list (`-d`). Tortie's own tmux is the vendored 3.7b, so the phone's paste into an agent is
recorded whole; on a tmux older than 3.7 (a development build without its vendored tmux, or an override) the record keeps the reading before
this round, the paste's last line.

#### The reverify's attack, at four builds (`a-builder/tools/ba-attack.test.ts`, history block)

The ruled reverifier's own harness (`ruled-reverify/tools/blank-attack.test.ts`) through each build's OWN shipping
`SessionActivityMonitor` on a virtual clock over every committed idle window with an input row, 2,362 cells a text and way
(1,181 windows, 2 s and 1 s cadences): its eight texts and two of this round (`1. to cancel` / blank / `2. x`, and the same
with two blank lines), each typed key by key, pasted at the desk as xterm brackets a paste, and pasted from the phone, the
record handed WHAT EACH BUILD'S OWN PASTE VERB HANDS for a pane that asked for bracketed paste (its shipping
`createScreenPaste` over a runner that answers the list's flag line with `1`: nothing at the parent, carriage returns at
the fix round and his ruled round, the bracketed paste at HEAD). 70,860 cells a build. The four builds: the parent
(`9a04292b`); the fix round's rule (its `own-words.ts`, sha256 `ffd1402d…`, on today's tree), the round before his first
ruling; his ruled round's HEAD (this round's start); this round's HEAD.

| Cells reading needs input | Parent | Fix round | Ruled round | HEAD |
| --- | --- | --- | --- | --- |
| The reverify's blank-line drafts, typed or pasted at the desk (4 texts) | 18,896 / 18,896 | 0 | 18,896 | **0** |
| The set-A texts pasted from the phone | 6,546 / 7,086 | 2,454 | 6,546 | **0** |
| This round's two texts (a blank line, two blank lines, between his options), every way | 10,932 / 14,172 | 92 | 7,380 | **0** |
| pi and opencode, every text and way | 10,260 / 10,260 | 1,368 | 6,840 | **0** |
| Every cell | 64,380 / 70,860 | 9,184 | 44,092 | **0** |

Per agent at HEAD, 0 in every cell of all ten (antigravity 1,560, claude 6,960, codex 12,240, cursor 10,020, gemini 480,
grok 7,200, omp 6,180, opencode 4,380, pi 5,880, qwen 15,960). 0 cells amber at HEAD and grey at the parent, the fix round
or the ruled round. **THE STOP RULE: pi 0 of 5,880 and opencode 0 of 4,380 cells read grey by the fix round and amber at
HEAD.** The same numbers before and after the box-marks narrowing (`ba-head.json`, `ba-head2.json`).

#### Lens 1's matrix (`ruled-builder/tools/vm-matrix.test.ts`, sets A, B, D, E, F), at the four builds

- **A**, his three dialog-shaped texts in every committed idle input row, both cadences: parent 13,092 / 14,172 (pi
  1,176 / 1,176, opencode 876 / 876), fix round 0, ruled round 0, **HEAD 0** (pi 0, opencode 0).
- **B**, every recorded question 0.2 to 2 s after his last key, 800 cells a variant: ordinary 512 / 512, ordinary left
  below 320 / 320, a record holding option text 512 / 512, dialog replaced 512 / 512, raised at both, 2,176 cells on the
  same tick, none later, none earlier. Dialog left below: parent 800 / 800, HEAD 320 / 800, the same 480 cells (15
  questions) his ruled round stated, unmoved.
- **D**, Claude Code 2.1.287's and Codex 0.160.0's real input rows: parent 64 / 72, HEAD 16 / 72 (the two `stray-1`
  banner splices, as before); in the real input row (`VM_D_INPUT=1`) parent 72 / 72, **HEAD 0 / 72**.
- **E**, every launchable row over a synthetic input row: his words parent 90 / 96, HEAD 0 / 96; a real question 0.5 s
  after his last key raised 90 / 96 at both, none lost.
- **F**, a line typed and erased (Ctrl-U, Ctrl-W, Up, Esc Esc, Ctrl-C, Backspace) then a question holding it: 21 of 21
  rows raised as the parent raises them.

#### The copies (the reverify's scenes; the rule alone over every committed question)

| Scene, through each build's shipping monitor | Parent | Ruled round | HEAD |
| --- | --- | --- | --- |
| `rv-monitor`, 29 scenes of copies, placeholders, two rows typed, controls and hostile keys, 16 cells each | the reading | 29 of 29 equal to the parent | **29 of 29 equal to the parent** |
| `rv-cross`, a copy of an earlier prompt then a later one, 6 kinds | 16 / 16 each | 16 / 16 each | **16 / 16 each** |
| `rv-pairs`, every ordered pair of one agent's questions | claude 112, codex 264, gemini 144, antigravity 12 | the same | **the same** |
| `rv-held` (the rule alone): one line, every pair, the whole question pasted | — | 0 / 663, 0 / 6,726, 0 / 34 | **0, 0, 0** |
| The live Claude Code 2.1.325 captures his ruled round recorded (`real-judge`), 5 numbered screens drawing his words | 5 need input | 0 | **0** |

#### Q1, measured again (`rb-held.test.ts` and the reverify's `q1-rederive.test.ts`, 33 committed numbered questions)

Every run of a question's rows from row a to row b as his draft, typed and pasted: the rows a person selects (blank rows
left out; a box's empty rows, which hold `│`, are inked and stay in) and a terminal copy (the blank rows kept as blank
lines), each alone, with a line of his after it, and after a line of his.

| Family (13,752 checks each) | Ruled round | HEAD before the box-marks narrowing | **HEAD** |
| --- | --- | --- | --- |
| The rows he selects, as his whole draft | 300 | 704 (gemini 222 to 626) | **300** (gemini 222, claude 72, codex 2, the non-agent prompt 4) |
| The same with a line of his after the copy | 300 | 704 | **300** |
| A terminal copy, blank rows kept, as his whole draft | 300 | 1,238 | **748** (codex 384, gemini 222, claude 116, antigravity 18, the non-agent prompt 8) |
| The same with a line of his after the copy | 300 | 1,238 | **748** |
| Either, after a line of his | 0 | 0 | **0** |
| One line, any two rows, the whole question pasted (628, 6,248, 33 checks) | 0, 0, 0 | 0, 0, 1 | **0, 0, 0** |

Where the 748 start (the reverify's classification, by the first row with ink): the first option 248 (162 with no gap
inside the copy, 86 with one), the question line 152 (76 and 76), another row 348 (346 with a gap: a title or a lead-in
whose row above has no letter or digit, such as antigravity's `Requesting permission for:` and `Run this command?`, Claude
Code's `Accessing workspace:`, Codex's `Welcome to Codex…` and `Update available!`; 2 with none, Codex's command row). So
the growth his ruling allowed is confined to a terminal copy that keeps the question's blank rows: 448 more of 13,752,
none after a line of his and none for the rows a person selects.

#### The live rig on real tmux (`a-builder/rig/rr-rig.test.ts`, the reverify's rig and this round's scenes)

The vendored tmux 3.7b on a scratch socket, the SHIPPING `AttachHost` (its `term:input` listener and a real node-pty
attach client) wired to the SHIPPING monitor as core.ts wires them, the phone's paste through EACH BUILD'S OWN paste verb
and its list on real tmux (so at HEAD the flag the program's own mode set), `build/p321/stand-in.mjs` drawing committed
screens with bracketed paste on, 1 s ticks, nine samples a scene; under one slot, the parent and HEAD alternated.

| Scene (claude, pi, opencode and qwen rows unless named) | Parent | Fix round | Ruled round | HEAD |
| --- | --- | --- | --- | --- |
| A draft with blank lines pasted at the desk (RRB1), typed (RRB2), a blank line between his options typed (RRQ2) | 6-7 of 9 amber | 0 | 6 of 9 | **0 of 9**, every readable run |
| His question-shaped words pasted from the phone (RRP1, PP1 into claude), and with a blank line (RRQ1) | 6-7 of 9 | 0 | 6 of 9 | **0 of 9** |
| zsh with a letterless prompt, the blank-line draft pasted (RRB3); claude's control paste (RRC) | 7 of 9 | 0 | 6, 0 | **0 of 9** |
| His ordinary words pasted from the phone, then a real question (RRQ3), claude, opencode, pi | raised, +2.5 to +3.8 s | +2.6 to +3.3 s | +3.3 to +3.6 s | **raised, +2.4 to +3.6 s** |
| The same, qwen's row | not raised | not raised | not raised | not raised (at every build, 8 runs: the scene, not this phase) |
| A line pasted from the phone into a program that asked for no brackets, then a question with it as its lowest row (PP2) | raised, +2.7 to +3.8 s | +2.8 s | +3.8 s | **raised, +2.8 to +3.6 s** |

Unread, each a stand-in that did not apply a command within 3 s at load averages of 28 to 194 (his own work): the parent
4 scene runs, HEAD 3, the ruled round 1; the same scene read in another run at that build.

#### The cost (`a-builder/tools/atk-cost{,2,3,4}.test.ts`, one slot, the ruled round's HEAD and this round alternated)

The reverify's two cost files and this round's own (his drafts with blank lines: two options with a blank line between,
two blank lines in a question of his, 40 lines of his each followed by a blank line, a record of 5,400 blank-separated
lines at its cap, and 200 rows of output above 60 blank-separated lines of his), six rounds, three with each build first,
load averages 20 to 52; each figure the median of the six per-row medians of five calls in a fresh process:

- Worst median at HEAD 3.07 ms (300 lines of 40 marks under 150 rule rows), the ruled round's 1.83 ms on the same row;
  slowest single call at HEAD 6.0 ms, the ruled round's 10.2 ms (on 4,000 short lines under 150 rule rows). That first
  row runs none of this round's code (no line of it is placed), so the difference is the engine warming a larger
  function: warmed with 100 calls and timed over 300 more
  (`atk-cost4`, six rounds), the same row reads 1.40 ms at HEAD and 1.38 ms at the ruled round, and 4,000 short lines under
  150 rule rows 1.09 and 1.09 ms.
- Where this round's code does run: his two options with a blank line between 0.07 ms (both, the ruled round reading them
  as not his); 40 blank-separated lines then his options 0.68 ms cold and 0.18 ms warm at HEAD, against the ruled round's
  0.55 and 0.14 ms answering early; a record at its cap of blank-separated lines 0.13 ms (0.07); 200 rows above 60 such
  lines 1.62 ms (1.29). Of the other rows, 20 block rows over 390 lines read 1.39 ms (1.27), every one of the rest
  within 0.1 ms of the ruled round's median, and 4,000 short lines under 150 rule rows faster at HEAD (1.39 ms, 1.59).
- The parent reads no record and spends none of this.

#### Restated for him (Q1, the limits; this replaces his ruled round's "Restated for him")

**Q1.** If what you have typed and not sent BEGINS with a word-for-word copy of an agent's question, from a row an input
could start on (its question line, its first option, or a row behind a mark or under a blank row, such as a title the
question draws above itself), and the agent then draws that same question, Tortie takes it for your words until you send
or clear what you typed, whatever you typed after the copy. That holds when the question draws no gap between the rows
that make it a question, or when your copy keeps those gaps as blank lines, which this round's change counts as yours.
With any words of yours before the copy, the question shows as it does today. Over every committed question: 300 of
13,752 copies of the rows a person selects (as before), and 748 of 13,752 terminal copies that keep the blank rows (300
before this round); none once a line of yours comes first.

The other limits, each measured today:
- A question drawn above a visible draft of yours that itself looks like a numbered question reads as it would above
  ordinary words, which for some agents is not at all (set B, 480 of 800 cells, 15 questions; unmoved).
- Your own dialog-shaped words read as the parent reads them when your first line is not drawn whole: behind a prompt
  that holds letters, as a shell's (bash's `bash-5.2$`; zsh's `~/project %`), or lens 1's banner splice (set D, 16 of 72),
  or when a hint or question line of yours with no prompt mark before it only finishes numbered rows the agent drew.
- A paste from the iPhone into a program on a tmux older than 3.7 (a development build without its vendored tmux, or an
  override; a packaged Tortie always runs its own 3.7b) keeps only its last line in the record, as before this round.
- The echoed prompt (Q2), a split escape sequence and an agent that rewrites what you typed, unchanged.

#### Still worse than the parent, with numbers

- Set B's dialog left below: 480 of 800 cells (15 questions) the parent raises only because his own words form the
  numbered question; HEAD reads them as the parent reads ordinary words below, unmoved by this round.
- Q1: 748 of 13,752 terminal copies of a question (blank rows kept) and 300 of 13,752 copies of the rows a person selects,
  held while the draft begins with the copy; the parent raises every one. His ruled round held 300 and 300.
- The cost: a numbered screen with his words on it costs a read the parent never makes: worst five-call median 3.07 ms and
  slowest call 6.0 ms at HEAD (1.40 ms warmed), against the ruled round's 1.83 ms, 10.2 ms and 1.38 ms;
  where his blank rows are read, up to 0.33 ms more than the ruled round (200 rows above 60 blank-separated lines of his).
- The shell beside agents the parent wrongly raises (probe arm W, his ruled round's finding): graded against the parent's
  shell alone, as that round wrote.


#### Commands, exit codes and numbers

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `746902 1794858458` and `23166 1790702242` at the start (his own Terminal moved `.zsh_history` on 2026-11-16 before this round); 63 GiB free |
| 2 | `a-builder/tools/flag-measure.mjs` (history block, scratch sockets, the servers ended in a `finally`) | 0 | the flag table above |
| 3 | vitest `own-words.test.ts`, `p3251-own-words.test.ts`, `p348-paste.test.ts` (worktree, history block) | 0 each | 71, 49 and 27 tests (65, 48 and 24 before: 6 rows new and 1 changed on purpose; 1 new; 3 new and 4 changed on purpose, the act's argv and title, the record's bracketed handoff, the flag a pane that did not ask prints, and the text check's spelling) |
| 4 | `npm run typecheck` | 0 | 1,457 production files, 8,305 imports, 0 violations; no runtime cycles over 1,454 files and 5,085 edges |
| 5 | `conformance:ownwords` (its file unchanged) | 0 | PASS, 10 clauses, 97 self-tests red, 7 honest copies green |
| 6 | `conformance:pocket`, `conformance:pocket:hostile`, `conformance:phonecopy`, `conformance:choices`, `conformance:machines` | 0 each | 192 rules, 25,982 checks (PS4's two new self-test plants red); 363 arms (PSH1 the new list); OK; 27 clauses and 33 self-tests; PASS |
| 7 | `ablation:p313`, `P313_ONLY=Z7t,Z7y,Z7z,Z7v,Z7u,Y15x,PS4a,PS4f,Y15t`, `P313_SCRATCH` in this role's scratch (one slot) | 0 | **PASS in 208.0 s, 9 of 9**, each newly red on the rule that owns it: `Z7t`, `Z7y`, `Z7z`, `Z7v`, `Z7u` on Z7; `Y15x` and `Y15t` on Y15; `PS4a` on PS4 (and PS7 and the hostile client); `PS4f` on PS4 and the hostile client; the 13 base checks green before and after, the clone gone |
| 8 | `ablation:p3251`, before the box-marks narrowing (one slot) | 0 | PASS in 172.7 s, 59 of 59 arms, control 81 of 81 green first and last |
| 9 | `npm run build` in the parent, once (history block, scratch HOME) | 0 | 62.5 s; the contract byte for byte |
| 10 | `npm run build` at HEAD, three times, the last after the narrowing | 0, 0, 0 | 156.2, 59.8 and 67.2 s; `gate:electron` 191 reach the helper against 191; `gate:background` 603 files, 4 start, 32 of 32 fixtures; `assert-hermetic-checks` 293 check scripts; the contract byte for byte |
| 11 | the reverify's attack at the parent, the fix round, the ruled round and HEAD; again at the final HEAD | 0 × 5 | 70,860 cells a build, the table above; about 1.5 to 3 minutes a build |
| 12 | lens 1's matrix, sets A, B, D, E and F, at the four builds and the final HEAD; set D in the real input row at the parent and the final HEAD | 0 each | above |
| 13 | `rb-held` and `q1-rederive` at the ruled round, at HEAD before the narrowing and at the final HEAD | 0 each | above |
| 14 | `rv-monitor`, `rv-cross`, `rv-pairs`, `rv-held` and `real-judge` at the parent, the ruled round and the final HEAD | 0 each | above (`rv-held` reads the rule alone and has nothing to read at the parent) |
| 15 | the live rig, 28 scenes at the four builds (one slot), then the parent and the final HEAD alternated, RRQ3 and PP2 twice more each (one slot) | 0 each | above |
| 16 | `ablation:p3251` after the narrowing (one slot) | 1, then 0 | the first run FAILED only on the harness's own check that the worktree never moved, because this builder edited a comment in `p348-paste.test.ts` while it ran (all 60 arms red on their owners, control 82 of 82); run again with nothing edited: **PASS in 195.7 s, 60 of 60 arms** (A1 to A59 and A3b), control 82 of 82 green first and last, every clone file restored by sha256 |
| 17 | `npm test` (one slot, history block, load averages 50 to 190) | 1 | 23,402 passed, 24 skipped, 13 failed: the four `/bin/ps` natives the block refuses (`process-table.native` 1, `ps.native` 2, `p269-env-names` 1); the FSEvents natives `store-watch.native` 1, `p365-process.native` 3 and `repo-watcher.native` 4, and `preview/protocol`'s symlink row, all nine failing in a clone of the parent under the same block too (9 of 46 there); that preview row passes 36 of 36 with `TMPDIR` spelled under the `/var` link, as the integrator's was |
| 18 | `conformance:credentials`, `conformance:containment`, `conformance:logins` (they read `CLAUDE.md`, which this round edits; run before its last edit, a few words of the `probe:p3251` row's measured time, and not run again after it because of the history rule below) | 0 each | OK; 52 readings and 10 of 10 ablations; OK |
| 19 | `node build/p3251/probe-p3251.mjs --grader-self-test` | 0 | PASS, 186 cases, nothing started |
| 20 | the cost, six rounds alternated, and the warmed cost, six rounds (one slot each) | 0 each | above |
| 21 | `probe:p3251` at both builds, the parent first (`P3251_PARENT_CHECKOUT` the parent, `P3251_KEEP=1`), from the worktree through `build/harness-socket.mjs --fresh gmux-p3251`, one slot, OUTSIDE the history block (Electron and `/bin/ps`) with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TMPDIR` and `TMUX_TMPDIR` under this role's scratch, `TERM_SESSION_ID`, `TERM_PROGRAM` and `TMUX` unset; 21:54:25 to 22:34:57, 2,432 s, four launches, load averages 9 to 160 | 2 | **Every arm PASS at both builds.** The parent: W the fault in 48 of 57 numbered cells (64 cells, the four texts typed and pasted into seven stand-ins and zsh, `gap` among them), the shell alone 3 of 3; Q first needs input 4,473 to 5,078 ms after the draw; C all four raised; S raised; R the replayed gate needs input and its own gate raised; F raised; E the fault. HEAD: W 61 cells, 54 numbered by the parent's own verdict, none needs input and no ⌘J row over at least 6 polls after his last key, main's status read through every watch, and the shell's 6 lit cells behind its lettered prompt needing input as the parent reads the same texts in the shell alone; Q 25 of 25 raised, each no later than the parent's plus one poll; C C1b, C2, C1c and C1u raised; S raised; R the replayed gate grey and its own gate raised after his Enter; F raised; E both fixes grey; LOG none of his words in the app log or on its console, his record in none of the build's 672 files. **RUN UNREADABLE, the run's exit 2 with it: his `.zsh_history` grew 75 bytes (746,902 to 746,977) at 22:27:53, during HEAD's launches** (below) |

#### The files this round changed (all inside `git diff 9a04292b`)

`src/main/activity/own-words.ts` (his blank rows, `isBlankLine`, the header's limits), `src/main/screen/paste.ts` (the flag
read in the act's list, the record handed the paste as the pane received it), `src/main/activity/__tests__/own-words.test.ts`,
`src/main/activity/__tests__/p3251-own-words.test.ts`, `src/main/screen/__tests__/p348-paste.test.ts`,
`build/conformance-pocket.mjs` (PS4, Y15, two self-test plants), `build/p313/hostile-client.mts` (PSH1, new to this
phase's diff), `build/ablation-p313.mjs` (`PS4a`, `Z7t`, `Z7y` re-pointed, `PS4f`, `Y15t`), `build/p3251/ablation.mjs` (A20,
A33, A38 re-pointed, A52 to A59), `build/p3251/probe-p3251.mjs` (W's `gap` text, arm C's comment, `gradeEdits`),
`CLAUDE.md` (the `conformance:ownwords`, `conformance:pocket` and `probe:p3251` rows), `CHANGELOG.md` (the item's limit
clause) and this file.

#### At the end

- **His shell history MOVED during this round's one unblocked run.** `~/.zsh_history` read `746902 1794858458` at the
  round's start (20:40) and before and after every history-blocked run; it read `746977 1794886073` after the app run,
  75 bytes more, written at 22:27:53, while HEAD's two launches of `probe:p3251` ran outside the block. Every shell of that
  run had a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` in its environment, and the probe's own `.zshenv` and
  `.zshrc` set `HISTFILE=/dev/null` and `SAVEHIST=0` (`probe-p3251.mjs:1540-1543`); 75 bytes is one or two entries of
  zsh's own history format, and his own Terminal moved the file earlier today. The rule was followed: nothing started
  for three minutes, then `stat` again at 22:38:29, `746977 1794886073`, not moved again. Since it did not move again,
  this builder started nothing more (no run, no ablation, no gate) and reports it: whose the 75 bytes are is not shown
  here. `~/.bash_history` read `23166 1790702242` throughout. After the probe ended (22:34:57) only reads ran: `stat`, a
  `grep` and a line count of the probe's own files, the three-minute wait, and the one end-of-run count below; then the
  editing tools alone.
- Crash reports, by name and time only, none opened: 37 entries at the start; at the end 38, two added
  (`SFA-ckks.json_2026-11-16-222652…diag` and `SFA-local.json_2026-11-16-222653…diag`, system diagnostics, not this
  run's programs) and one `SFA-sos` diagnostic of 10:21 rotated out by the system. No Electron or Tortie crash report.
- Electrons, counted once at the end with CLAUDE.md's command (outside the block, scratch `HOME` and `ZDOTDIR`): seven
  lines, none this round's: his `Tortie` (pid 94808, parent 1) and the crash handlers of Slack, Granola, Cursor, Claude,
  Chrome and `/Applications/Tortie.app`. No tmux server of this round alive; no `p3251` socket under
  `/private/tmp/tmux-501/` or the probe's `TMUX_TMPDIR`; twelve inert socket files of ended scratch servers stay in this
  role's scratch (`a-builder/rig/run-*/tmux`, `a-builder/tmp/tmux-flag`). Every lock slot free, each taken released from
  its trap.
- `git diff 9a04292b` is the phase's delta: 25 tracked files (this round adds `build/p313/hostile-client.mts`) and the
  same 8 new files. Left for the reverify: this role's clones (`a-builder/c-{parent,fix,ruled,head,head2}`), its
  harnesses under `a-builder/tools/` and `a-builder/rig/`, every log under `a-builder/logs/`, the probe's kept world under
  `a-builder/ptmp-all/` and `out/p3251/probe-p3251.json` (ignored by git).

### The probe review, the reverify and the landing (2026-11-17)

**The probe review** (`scratch/p3251/a-gatereview/`) fixed two grader defects, both in this phase's files:
- `conformance:pocket` PS4 looked the flag's name up by its first declaration in the file, so a local const shadowing
  `BRACKET_PASTE_FLAG` inside the verb left all 192 rules green (PSH1 and 2 of 27 rows of `p348-paste.test.ts` still
  caught it). The name now counts as its literal only when it is bound once, as a module-level const holding a string
  literal, and a third PS4 self-test plant (the shadowing const) reads red: 192 rules, **25,984 checks, three plants**
  (rows 6 and "Gates moved on purpose" above give the builder's 25,982 and two).
- `probe:p3251`'s `gradeWords` passed a W reading that never asked this round's `gap` text. `wordsUnasked` now reads W
  UNREADABLE unless it holds every session, text and way and the shell alone, and, at HEAD, each text and way was read as
  needs input at the parent in at least one agent's cell whose premise held. The grader self-test is **193 cases** (row 19
  above gives the builder's 186); the ruled round's two kept runs, which never typed `gap`, now read W UNREADABLE.
- Found, not this phase's: the older CURSOR_FORMAT rule (`build/conformance-pocket.mjs:8056-8060`) has the same
  first-declaration lookup. Owed.

**The reverify** (`scratch/p3251/a-reverify/`) answered **approved**, with five methods no earlier role used: the phone's
paste through HEAD's shipping verb on real tmux 3.7b and 3.6a (on 3.7b, 26 of 26 recorded byte for byte as the pane
received it and as xterm encodes it); 99,000 seeded random drafts against the ruled round's rule (710 held at HEAD and
not before, every one beginning with a copy of a screen row and keeping its blank rows exactly; none the ruled round held
released); a wrapped line beside his blank line; Q1 end to end through each build's monitor (150 and 374 of 6,876 typed
copies held, half the rule-alone counts); set B with a blank-line draft left below. Its re-runs: the four blank-line
shapes 18,896 amber at the parent and 0 at HEAD; the phone's set-A pastes 6,546 of 7,086 and 0; all 70,860 cells 64,380
and 0; pi 0 of 5,880 and opencode 0 of 4,380 at HEAD, so the stop rule did not fire; live on 3.7b, 25 scenes 6 to 7 of 9
amber at the parent and 0 of 9 at HEAD; `probe:p3251` whole, exit 0, every arm PASS at both builds, RUN PASS (2,418 s);
his history never moved.

Its findings, and what the landing did:
- (minor) No row or arm told apart the two maps that bound his blank rows: with `endsOn` and `beginsOn` swapped, a line
  of his the input row wraps, beside his blank line, read amber (25 of 25 of the reverify's cases, 3 of 3 of the
  review's) with every test and arm green. **Landed**: `own-words.test.ts` gains the review's three screens, typed and
  pasted, as one row (`his blank line beside a line of his the input row wraps, …`, green at HEAD), and `ablation:p3251`
  gains A60, the swap, red on that row (`P3251_ONLY=A60`, PASS in 3.1 s, its control green): **61 arms**.
- (minor) Set B with a draft that holds a blank line, left below the question: parent 200 of 200 raised, the ruled round
  200, HEAD 80 of 200, the same 15 questions set B names, cell for cell what the parent reads with ordinary words below.
  This round's blank-line change extends set B's class (480 of 800) to a draft with a blank line; stated beside it.
- (nit) The counts above; the paste's doc comment (`ScreenPasteDeps.noteOwnWords` now names the markers and the flag);
  "only a development override can name one" (now: a development build without its vendored tmux, or an override). Each
  corrected at landing.
- (nit) A stand-in under load missed one command once; run again alone it read as the others. Nothing in the code.
