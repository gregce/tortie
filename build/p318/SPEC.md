# Phase 318 — Reply: one tap on a numbered choice, or one message, from the phone — SPEC

Written by the spec step on 2026-10-02 in `/private/tmp/wt-p318` at `c1a5fd38`, a LOCAL snapshot commit (never pushed)
of Phase 317's APPROVED tree (End from the phone behind Face ID, one signed write route `POST /v1/end`, the ledger, at
most once) on top of Phase 316.6's tree (the tab bar, Settings, Unpair) on origin/main. Every `file:line` below was
re-read at that commit on this date. Nothing in this file was measured on a running app or a real agent: no Electron,
no Simulator, no tmux server and no agent was started by this step. The capture step that followed (his ruling 2 of
2026-10-02) ran the installed Claude Code 2.1.287 and Codex 0.160.0 under a scratch HOME at 0 model turns; what it
measured, and every place it changed this file, is §Revision R20 to R27.

Read with it, whole: `docs/BACKLOG.md` "## Phase 318" (the entry, 2026-09-30), `docs/research/135-the-reply-door.md`
(binds), `build/p317/SPEC.md` and its three "§As built" sections (the door this phase adds to), `build/p317/ENTRY.md`
(317 as built), `docs/research/137-paseo-and-the-phone.md` §5 (a write sent as the app goes to the background), and
`docs/research/133-codex-scroll.md` §2 (the second, independent record of Codex's approval rows).

**The order of authority.** His three rulings of 2026-09-30 override the entry and research 135 wherever they differ.
317 as built overrides the entry's picture of 317 wherever they differ. Where this file departs from the entry or the
research for any other reason, §3 says so row by row and gives the reason.

His rulings, in his words, and what each moves:

1. **"Only for End."** Face ID guards End alone. A press on a choice and a message ask no Face ID, no Touch ID and no
   passcode. The entry's default ("every write asks for Face ID first") is answered no.
2. **"Yes, allow them."** Every option of a numbered choice the phone may press is pressable, the options that widen
   the agent's permissions for the rest of the session included. The entry's default ("widening options
   unpressable") is answered no.
3. **"/" and "!" may be typed in a message.** Slash commands and shell escapes reach the agent as typed. The entry's
   default ("a message starting with `/` or `!` refused") is answered no.

His two rulings of 2026-10-02 answer §14's two questions, in his words, and bind every role:

4. **"Only when idle at its prompt."** The phone offers the message box ONLY while the agent sits idle at its own
   prompt (D14 as written). While the agent works the phone shows no message box; a numbered question is answered with
   the buttons.
5. **"Yes, scratch home, no turns."** The capture step and the verifiers MAY run his installed Claude Code and Codex,
   once each per need, under a SCRATCH home (never his), with loopback stand-ins for their APIs and zero model turns,
   to capture and commit the real permission and prompt screens. The same day: **"u can use the subs on those accounts
   if that works"**: where a stand-in API cannot make the agent draw the real screen, the fewest real turns under his
   own sign-in (one or two each, said how many), in a scratch project under `/private/tmp`, with a harmless prompt,
   the permission question answered No or Esc. Every other test still answers a stand-in, and nobody reads his
   conversation stores. The capture step needed no real turn: the stand-in APIs drew every screen (§Revision R20).

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p …/scratchpad/electron.phone-wait && echo p318 > …/electron.phone-wait/p318-<role>`, then
  `zsh …/scratchpad/lock.sh try p318 phone` (prints the slot or exits 1; retry every 60 s in a NEW command), remove the
  wait file once a slot is held, and release with `zsh …/scratchpad/lock.sh release <dir>` on the same command line.
- `/Users/gdc/gmux` is read only. Nobody but the committer commits, stages or stashes. `git diff c1a5fd38` in this
  worktree is exactly 318's delta. Install nothing.
- Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid: a
  process is ended by the pid its starter holds, in a `finally`.
- No real Tailscale, no real DNS, no real APNs: the door is published only through `build/p330/tailscale-standin.mjs`
  and names only `build/p332/dns-standin.mjs`. His keychain and credentials are never read.
- **No model turn, and no real agent answers a test.** Every agent a test or a probe answers is a stand-in
  (`build/p318/stand-in.mjs`, §7.4) drawing committed screens. Gemini, Qwen, Antigravity and Grok are never started,
  and a scratch `agents.json` renames their binaries (and Droid's) before every launch. The one exception is his
  ruling 5 above: the capture step and the verifiers may run his installed Claude Code and Codex, once each per need,
  under a scratch HOME (and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset) with loopback API stand-ins and 0
  model turns, recording each agent's version and its binary's realpath, size, mtime and sha256 before and after (an
  install that moved is a finding). Nothing under `~/.claude` or `~/.codex` is ever read.
- Any local shell a test starts runs with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID`
  unset.
- Simulators only through `build/simulator-run.mjs`. Every `xcodebuild` uses
  `-derivedDataPath …/scratchpad/p318/dd-<role>`, deleted before the role returns. No screenshot, no recording.
- No raw control byte, bidi, zero-width or BOM character in any committed file. Test texts that need one build it
  from a code point at run time.
- Keep out of 316.7's files: the Sessions tab's list (`ListScreen.swift`, `SessionsScreen.swift`), its grouping and
  sort words. A door field this phase needs goes beside 317's on `/v1/session`; the list answers are not reshaped.

---

## 1. The answer first

**What a person can do after this phase.**

1. On the iPhone, a Claude Code or Codex session that is asking to run a shell command shows each option as a
   button, in the agent's own words and numbers, under the command it will run. One tap answers it. Nothing asks for
   Face ID. The options that give the agent more room for the rest of the session are buttons too. When the command is
   not drawn whole (long, multi-line, or holding a secret), only `No` is a button. Claude Code's file edit and file
   create questions stay unpressable until a later round measures them on the real agent (his ruling 5 allows it; this
   phase's capture measured the Bash prompt, §Revision R22).
2. A Claude Code or Codex session on this Mac that is waiting for him at its own empty prompt (not working, not asking
   a question) shows a message box above the End bar: `Message this session`, a Send button, and `Goes to this session
   as one message.` under it. Send puts the words into the session exactly as a paste at the Mac would, then presses
   Return. **While the agent is working no box is drawn** (his ruling 4 of 2026-10-02, "Only when idle at its prompt";
   §Revision R15: a message's Return can land on a permission question the agent draws in the same few milliseconds and
   approve it). `/` and `!` go in as typed.
3. The phone says what happened, in the Mac's own words: nothing for a press that was taken (the session reads again
   and no longer waits), `Sent` for a message, and otherwise the Mac's sentence for what is known. A message whose
   answer did not come keeps its words in the box, and pressing Send again on the same words within a minute asks the
   Mac about that same message rather than sending it twice.
4. The Mac asks him to allow the phone door once more after the update, because the door's route list (a hashed field)
   gains two routes. The confirm lines name them in words.

**Nothing else changes for a person**: no Mac surface is added, renamed or removed; `src/main/menu.ts` does not move,
and the gate asserts it. A session on another machine, a shell, and every agent but Claude Code and Codex draw
exactly what they draw today on the phone: options under `Answer this in the session.` and no message box, with no
word about why.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **Two more `POST` rows on 317's one closed table**, `/v1/choose` and `/v1/say`, each `reads: false`, `signed: true`, `windowOnly: false`, no query string, its own body cap. They go to 317's ONE write path (`src/main/pocket/writes.ts`) and its ledger. No second gate, ledger or route family | research 135 §1 item 1, §7 ruling 6; the task |
| D2 | **The signed bodies.** choose `{ mark, marker, question, session, write }`; say `{ session, text, write }`. `question` is the question id main minted (§5.3), never the question's text. An unknown or missing key refuses the body whole, `refused malformed`, as 317's end does | research 135 §2.7, §4.11; 317 D2 |
| D3 | **The caps, from the worst body the phone can send for a text the Mac must answer in words.** choose 512 (worst 267 bytes); say **32,768** (a 4,096-byte text of C0 controls, each escaped `\u00XX`, is 24,771 bytes, and the Mac must answer it `refused character`, not the door `oversized`; `"`, `\`, LF or Swift's `\/` give 8,387). end stays 512 | §5.1.3; §Revision R10 |
| D4 | **The ledger key gains the verb** (`phone`, `verb`, `write`), and one write is in flight per phone and per session ACROSS verbs, so an End and a message cannot overlap on one session | 317's fix round, Lens 1 nit: "Phase 318 must fold the verb into `keyOf`" |
| D5 | **The last check reaches into the verb.** 317's last check (quit, door stopping, phone still paired) is handed to `choose` and `say` as `still()`, and each verb asks it again in its OWN final synchronous check, with its race token, immediately before the one tmux spawn that acts. A verb that finds `still()` false answers 200 `refused stopped` with nothing typed | research 135 §4.11 step 6; a press reads the screen (awaited) before it types, so 317's check-then-act would otherwise leave tens of milliseconds where a Removed phone could still type |
| D6 | **The question id**: a 64-bit random prefix per process and ONE PROCESS-WIDE counter; each bump of a session takes the next value of it, so no two sessions ever hold the same non-zero id. Bumped synchronously in main on every hook event, every keystroke from the Mac's own attach client (never a pane report, R14), every phone write, every monitor tick whose choice moved, appeared or went, and every committed status that is not `needs_input` (the way most choices go, §Revision R16). An id whose count is 0 (a session never bumped) is never offered and never matched. One process-wide instance in NEW `src/main/reply/question-id.ts` | research 135 §2.6, §2.7; §Revision R2 (a counter per session gave two sessions the same id) |
| D7 | **The hook's question is kept beside the id**, with whether it is a Bash `PermissionRequest` that says its command WHOLE (`hookBash`, D12), and both survive exactly one bump, the choice first appearing on the screen after that hook, because Claude's `PermissionRequest` arrives 10 to 25 ms BEFORE its dialog is drawn. Any other bump clears both | the same rule `choiceUpdate` already keeps (`src/main/activity/monitor.ts:1197-1212`); without it a Claude choice could never be pressable |
| D8 | **A press is the digit alone, never an Enter**: `copy-mode -q -t <pane>` then `send-keys -t <pane> -l -- <marker>` (the `%`-pane the reading captured, inside the `$`-session the final check holds, §Revision R19 b), the marker one of the fresh rows' own, `1` to `9`. Sent as TWO one-command lines over the core's control client (`core.control`, the path `runScrollCommand` already prefers for ~1 ms round trips, `src/main/sessions/core.ts:2575-2589`), both written in one synchronous statement; only when the control client is not connected, as the one spawned list `copy-mode -q -t $id ; send-keys -t $id -l -- <marker>` | research 135 §2.3, §2.7; §Revision R7 (a spawned list measured p99 10 to 61 ms to land under this machine's load, the control lines 1.1 to 2.6 ms) |
| D9 | **A message is a bracketed paste**: `load-buffer -b tortie-say-<write id> -` with the words on standard input, then ONE list (aimed at the reading's pane, §Revision R19 b) `copy-mode -q -t $id ; paste-buffer -p -d -b <name> -t $id ; send-keys -t $id Enter`, and `delete-buffer` in a `finally` when the list did not run | research 135 §3.1 to §3.4, the judge's measured bytes on tmux 3.6a and 3.7b |
| D10 | **The load-buffer runs BEFORE the final check**, so the paste list is the one spawn after it. A buffer changes nothing in a session; the paste does | D5's rule, "nothing awaited between the last check and the act", holds for the message too |
| D11 | **Only measured, compiled press shapes are pressable**: Claude Code's numbered BASH permission prompt (identified by a `PermissionRequest` hook naming the tool `Bash`, a `Do you want to` question and consecutive markers) and Codex's command approval (its one question row read from the screen, its first and last option, and its `$` line, §Revision R20, R21). Both measured on the real agents by the capture step (Claude Code 2.1.287, Codex 0.160.0, `build/fixtures/reply/`). Claude's Edit and Write prompts are NOT admitted: research 135 §7 ruling 1 admits them only once measured, and this phase's capture measured the Bash prompt only (§Revision R22). Every other dialog, every other agent and every row on another machine is unpressable | research 135 §2.2, §7 ruling 1; refusal 5: compiled, never configured; §Revision R4, R20 to R22 |
| D12 | **"Says what will run."** An allow option (and, under his ruling 2, a widening one) is pressable only when what will run is said whole: Claude's drawn question is EXACTLY `Bash ` followed by the hook body's own `tool_input.command`, byte for byte (so nothing was flattened, stripped, redacted or cut on the way: `oneLine` turns a newline into a space and drops a CSI sequence, `src/main/activity/question.ts:107-109`), decided by NEW pure `src/main/reply/hook-says.ts`; Codex's `$` line is the one `$` row of its dialog, every row under it to the options blank, unredacted, under the cap (§Revision R20). Neither holds a bidi, zero-width or control character (§Revision R27). Otherwise only the options whose text starts `No` are pressable | research 135 §2.8, §8 row 6 ("the default is unpressable"); §Revision R4 (`echo ok` LF `rm -rf ~` draws `Bash echo ok rm -rf ~`), R20 (three real Codex approvals the first rule read as saying a command they did not), R27 |
| D13 | **The foreground is read fresh** at the reader and at the press: `readProcSnapshot`, `foregroundProgram`, `readProcessCommand`, `commandRunsAgent` over `binaryCandidatesFor` and `bundledRootsFor`. Never `agentHoldsTerminal`, `noteForeground` or `foregroundToRead` | research 135 §2.8: `agentHoldsTerminal` answers false for every Codex session; `conformance:choices` clause 23 pins `noteForeground` and `foregroundToRead` to one call site |
| D14 | **A message is offered only at the agent's own empty prompt, while the agent waits for him**: Claude Code or Codex, on this Mac, status `running` or `idle` (never `needs_input`), the agent's own reader fresh and reading **`idle` only** (`claudeVerdict` idle, `codexTitleVerdict` idle; never busy or working, §Revision R15), the agent holding the terminal, and NEW `src/main/reply/input-row.ts` reading the prompt row empty, with its caret at the start, over a STYLED capture taken as the LAST read before the final check. It fails closed | his ruling 4 of 2026-10-02, "Only when idle at its prompt"; research 135 §3.5 (a message anywhere else answers a choice, merges with a draft, or runs in a shell); §Revision R15 (a message sent while the agent works can land on a permission question drawn between the check and the paste, and its Return approves it), R17 (a draft drawn dim), R23, R24 (the real prompt rows) |
| D15 | **The text rules**: 1 to 4,096 bytes of UTF-8; ESC, every C0 control but LF, DEL, every C1 control and a lone surrogate are REFUSED, never stripped; `/` and `!` allowed (his ruling 3). Three refusal words, each with its own sentence | research 135 §3.3, §7 ruling 4; his ruling 3 |
| D16 | **Read back at 300 ms after a press.** ANSWERED is decided by the screen or the agent's own hook, never by a keystroke: no choice on the screen, its mark moved, the window changed, or a hook event arrived since the press. A desk keystroke or a focus report alone is not an answer. Answered is `done`; then `noteUserInput`, the desk's own funnel, unless a hook came since the press or the read-back screen draws a choice (a hook spoke for the status, and Claude's `PermissionRequest` is the NEXT question; a choice drawn is a question the monitor's tick speaks for). **Amended by the fix round of 2026-10-04**: it first read "ONLY when nothing at all has moved the id since the press's own bump", and a tick's `choice-gone` inside the read-back moves the id for the very question the press answered, so a phone No left the Mac at needs input 11 times in 60 with nothing on the phone able to clear it (§As built, the fix round). The same window still drawn and no hook is `failed` with "Your answer was typed and the question is still there." A press is never retried | research 135 §2.7 step 6, §5; §Revision R3, R11 |
| D17 | **A message is `done` when tmux answers.** It reached the session as a paste at the desk would. No `noteUserInput`: a message is refused on every `needs_input` row, so there is nothing to release | research 135 §3.6, §5, §8 row 8 ("whether 'sent' is enough": it is, and the read-back of a submission is the agent's, not Tortie's) |
| D18 | **What the door serves about a reply is on `/v1/session` alone**, as one new field beside 317's `endConfirm`: `reply: { question, mark, pressable, command, canSay }`. `/v1/blocked` and its rows do not change. **The press half is bound to what the same answer draws**: the composer hands the reader the `question` and `choices` it is serving, and `pressable` is empty unless the fresh reading's composed question and options equal them exactly, because those two fields come from the activity map, which moves only on the monitor's tick | the press and the box are drawn only on the Session screen; `blocked()` is synchronous and feeds the push engine's rows (`src/main/capabilities.ts:392-396`), and a fresh capture per row would make it neither; the task: "never reshape the list answer"; §Revision R1 |
| D19 | **The outcome words are 317's four** (`done`, `refused`, `failed`, `busy`). The refusal reasons gain `changed`, `unpressable`, `unsayable`, `stopped`, `empty`, `long`, `character`. Every sentence is a named constant in main; the phone draws it verbatim | 317 D4, X6; one decoder on the phone |
| D20 | **The sentences live in NEW `src/shared/reply-copy.ts`**, with `POCKET_WRITE_SENTENCES.stopped` beside 317's busy and unreadable. `REPLY_ANSWER_IN_SESSION` is the Mac's `CHOICE_NOT_PRESSABLE` (`src/renderer/choice.ts:57`) spelled once more for main and held equal by a test, as 317 held `SESSION_CHANGED` | main cannot import the renderer; 317 §5.2's precedent; no renderer edit, so `conformance:choices` is not touched |
| D21 | **No change to the shared session gate.** The entry's `canChoose` and `canSay` in `src/shared/session-gates.ts` are not added: the reply's conditions are narrower than "live" (a press needs `needs_input`, a message `running` or `idle`, both on this Mac) and are spelled once, in `src/main/reply/gate.ts` | the gate's "live" is End's and narrower words would be a second meaning of one name. (The earlier reason, that 316.7 edits `session-gates.ts`, was false: 316.7 adds `src/shared/session-list.ts` and does not touch `session-gates.ts`, `/private/tmp/wt-p3167/build/p3167/SPEC.md` §6.3, §11.) `conformance:manager` still RUNS, because `pocket-writes.ts` is in its trigger list (`CLAUDE.md:291`, T25), §Revision R6 |
| D22 | **`ExecTmuxOptions` gains `stdin`**, honoured for this Mac's context and REFUSED before any spawn for another machine's, so the words never travel to one. The tmux binary and socket come from the one resolver every caller uses | research 135 §3.3, entry S5.2; the remote arm's rule 1 does not move |
| D23 | **The attach host gains `onInput(sessionId)`**, called in the same synchronous handler as the write, for a LOCAL client only, and **only for a chunk that is not a pane report** (a focus report, a colour report or a device-attributes answer: `isPaneReport`, moved token for token from `src/renderer/terminal/keys/` to NEW `src/shared/pane-report.ts`, the renderer files re-exporting it). This is Phase 325's planned seam; whichever of 318 and 325 lands second shares it, filter included | research 135 §2.7, §5; §Revision R14 (every Mac window blur and every return to a session sends a report down the same channel, and under D7 each would clear a waiting Claude dialog's hook question for good) |
| D24 | **The phone: buttons for the pressable options, a message strip above the End bar, no Face ID.** A `ReplyRunner` per write, made at the press and registered with the app before its write starts; `wentAway()` stops it, which withholds a write whose bytes were not yet handed (317's mechanism). Nothing is retried, queued or persisted. **One write id is kept, in memory**: a message whose answer did not come (`.noAnswer`, or a `busy` answer to a re-send) keeps its write id beside its words, and Send on the same session with byte-identical words (compared as UTF-8 bytes) within 60 s sends THAT id again, which the Mac's ledger answers with what it recorded instead of typing it twice. Edited words, another session, or 60 s later is a fresh id. A press never reuses one (its question id already refuses a second act) | his ruling 1; research 137 §5 (Paseo #3464); 317 D6, D15; §Revision R13 (§1 item 3 promised this and no mechanism delivered it) |
| D25 | **The message field turns off smart quotes, smart dashes and smart insert**, because they rewrite what he typed (`--` to an em dash breaks `!git log --oneline`); autocorrect and dictation stay as iOS has them | his ruling 3 makes shell escapes a supported message |
| D26 | **Check-to-land is measured by NEW `measure:p318`**, the SHIPPING writer through the pinned tsx against real tmux (vendored 3.7b, and Homebrew 3.6a when present) on scratch sockets, at least 200 presses per build, over the SHIPPING `TmuxControlClient` on a scratch `ControlTransport` (`src/main/tmux/control-client.ts:132-150`, its documented seam): p99 under 15 ms, graded. The spawned fallback list is measured beside it and printed, not graded. The app run reports request-to-land beside it and is not graded on 15 ms | the check-to-act stretch is synchronous; the act-to-land stretch is NOT immune to load when it is a process spawn (measured by the adversary at load average 95 to 200: a spawned list p99 9 to 24 ms on 3.7b and 11 to 61 ms on 3.6a; two control lines p99 1.1 ms and 2.6 ms), §Revision R7; an in-app stamp would add a `GMUX_*` name and move `gate:contract`, which nothing else here moves |
| D27 | **The phone's Simulator arms ride `probe:p316` as an arm group, `reply`**, and the Mac's ride NEW `probe:p318`; `SIMULATOR_USER_FLOOR` stays 2 and `HELPER_USER_FLOOR` rises 162 to 163 | 317's own shape (`probe:p317` plus `probe:p316`'s `end` group) |
| D28 | **The confirm hash moves**: the route list gains `choose` and `say`; the line reads `Lets an allowed phone end a session, answer a numbered question and send a session one message`; `POCKET_DOOR_HONESTY` says the same. The hash algorithm does not change | research 135 §4.6; refusal 8 |
| D29 | **R4's membership pin moves on purpose**, from `d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6` (317, five lines) to **`0e8c9f46733b7fe7b706f071fa68bbedf135145757cef2e39d686feb9f5a7841`** (seven sorted lines, `--write-route-pin`'s method; research 135 §4.1 measured `0e8c9f46…`). With 316.7's `GET /v1/sessions` too it would read `d95ecd272da5fbab8eadd9379ecce4eace9fd69c963be996aa6726ae7a22cf77`; whichever lands second re-derives it, and the commit names both values | the task; 317 §4.3 |
| D30 | **The phone's build number is 6** on this snapshot (317 wrote 5); the replay makes it one above main's at landing. 316.7 moves no build number (its §13), so it is 6 whichever lands first, unless main moved it. `conformance:ios` rule letters (ae), (af), (ag) are 318's; (aa) stays 316.7's | 317 §4.3; App Store Connect refuses a build number it has seen; §Revision R9 |

**Subject.** `feat(pocket): answer a choice or send one message from the phone`

**First body line.** `Phase 318: the reply door`

**Semver.** Minor on the Mac (two routes on the phone's door; the door asks again); the iPhone app 1.0.0, build 6 on
this snapshot. Unreleased under his rule that nothing ships until the phone works end to end; it rides the one
TestFlight build after this phase.

**Tier 3**, on four of CLAUDE.md's questions: it can lose or corrupt the person's work (one press runs whatever command
the agent proposed; one message can end a session, clear a conversation or run a shell command); it sends his words
somewhere (from the phone, over the public internet behind Funnel, into a session); it is a write on a door that faces
the internet; it claims to work across agents, so the evidence is a per-row matrix. The independent methods are in
§7.7: four, one an attack, plus the parent measurement.

**Menus.** No change. No Mac surface is added, renamed or removed; Settings then Phone draws one changed sentence and
one changed confirm line, which are words on an existing surface. `src/main/menu.ts` is asserted unchanged.

---

## 2. The tree at this head, re-read

| What | At `c1a5fd38` | Note |
| --- | --- | --- |
| The closed table | `src/main/pocket/door/table.ts:65-71`, five rows; `end` at `:70` | 318 adds two rows after `end` |
| Write body caps | `src/main/pocket/door/limits.ts:53`, `POCKET_WRITE_BODY_CAPS = Object.freeze({ end: 512 })` | in the door's limits, not the shared contract (317's SPEC said the contract; the build put it here) |
| The wire's write routes | `src/main/pocket/door/wire.ts:107` (`DoorWriteRoute = Extract<…, 'end'>`), `:274` (`WRITE_ROUTES = ['end']`), `:277-283` (`writePathOf`), `:300-318` (validation) | generic over the list |
| The listener | `src/main/pocket/door/listener.ts:230-233` (`bodyCapOf`, generic), `:495` (a write's query refused), `:516` (a write's target is its path), `:543-568` (a late write cut, `writesCut`; `state.writes`) | needs no edit |
| `server.ts`'s write branch | `src/main/pocket/server.ts:185-193` | generic; needs no edit |
| The one write path | `src/main/pocket/writes.ts`: `END_KEYS` `:82`, `parseEndBody` `:158-166`, `keyOf` `:240` (phone and write only), the handler `:256-330`, the `route.id !== 'end'` guard `:260`, the last check `:310`, the act `:311`, the one log line `:322` | 318 widens it |
| `PocketFacts`, `PocketWrites`, `PocketEndOutcome` | `src/main/pocket/routes.ts:158`, `:253-261`, `:263-267`; `endOffer?` `:241`; `rowOf` `:309`; `session()` `:521-567`, `endConfirm` `:565`; `pocketWriteRouteIds()` (`end` only) | 318 adds members and one field |
| The one End implementation | `src/main/sessions/pocket-writes.ts:155-195` (`createPocketWrites`) | 318 composes `choose` and `say` into it |
| The wiring | `src/main/capabilities.ts:375` (`createPocketWrites({ core: () => pocketCore })`), `:376-385` (`createPocketFacts`, `endOffer` `:384`), `:392-396` (the alerts read `blocked().rows`) | |
| The write handler's deps | `src/main/pocket/ipc.ts:482-487` (`shuttingDown`, `stillPaired`, `writes`) | needs no edit |
| The contract | `src/shared/ipc/pocket.ts`: `POCKET_ROUTE_IDS` `:77-88`, `POCKET_WRITE_ROUTE_IDS` `:97`, `PocketSessionDetail.endConfirm` `:301`, `PocketWriteReason` `:414`, `POCKET_WRITE_SENTENCES` `:444-447`, `POCKET_DOOR_HONESTY` `:762-764` ("…Nothing on it can type into a session…", false after this phase) | |
| The confirm lines | `src/main/pocket/pairing.ts:407-409` (`WRITE_CLAUSES`, `end` only), `:427` (route line), `:431-432` (the write line, joined with ` and `) | |
| The End words | `src/shared/lifecycle-words.ts:156` (`LIFECYCLE_SESSION_CHANGED`), `:168` (`SESSION_NOT_FOUND`), `:170` (`END_FAILED`) | reused for the reply's `gone` and `changed` |
| The Mac's unpressable sentence | `src/renderer/choice.ts:57`, `CHOICE_NOT_PRESSABLE = 'Answer this in the session.'` | renderer: main may not import it |
| The hook path | `src/main/sessions/core.ts:1042-1057` (`onEvent` → `questionFromHookBody` → `noteHookEvent`), `:1067` (`onSessionEnd`) | 318 bumps the id here |
| The attach host | `src/main/sessions/core.ts:1002-1019` (constructed with `onData`, `onExit`); `src/main/attach/attach-host.ts:126-156` (`AttachHostOptions`), `:279-288` (`onInput`, `client.pty.write(data)` at `:285`) | 318 adds `onInput` |
| The tmux id | `src/main/sessions/core.ts:712` (`liveIds`, private); `scrollTarget` `:2605-2607` is private | 318 adds a public read, `tmuxIdOf` |
| The monitor | `src/main/activity/monitor.ts`: deps `:167`, `onTurnBoundary?` `:216`; `noteHookEvent` `:488`; `noteUserInput` `:516-522`; the caller of `choiceUpdate` `:1098`; `choiceUpdate` `:1176-1219`; `choiceMarkOf` `:1314-1317` (not exported); the registry `this.claude` `:388` | 318 exports `choiceMarkOf`, adds one dep and one read method |
| The verdict | `src/main/activity/state-machine.ts:366` (`const numbered = screen !== null && detectDialog(screen);`), `nativeVerdict` `:273`, `foregroundProgram` `:491`, `foregroundToRead` `:506`, `noteForeground` `:526`, `commandRunsAgent` `:628` (three arguments: command, candidates, roots), `bundledRootsFor` `:726`, `binaryCandidatesFor` `:937` | read only |
| Processes | `src/main/activity/process.ts:95` (`readProcSnapshot`), `:232` (`readProcessCommand`) | read only |
| The oracles | `src/main/activity/oracles.ts:25` (`claudeVerdict`), `:63` (`codexTitleVerdict`) | read only |
| The screen | `src/main/activity/screen.ts:41` (`normalizeCapture`), `:48` (`hashScreen`, 12 hex), `:106` (`detectDialog`), `:234-261` (`DialogRows`), `:291` (`detectDialogRows`), `:655` (`detectShapes`) | read only |
| Pane facts | `src/main/activity/panes.ts:92-108` (`PANE_FORMAT`), `parsePaneLines` | read only |
| The hook question | `src/main/activity/question.ts:51` (`QUESTION_MAX = 200`), `questionFromHookBody` (redacted, then cut at the cap) | read only |
| Redaction | `src/main/overview/redact.ts:74` (`redactText`), the mark `[REDACTED:<name>]` | read only |
| The exec plane | `src/main/machines/exec-plane.ts:149` (`ExecTmuxOptions`), `:584-597` (`execOn`), `:607` (`spawnTmux`, the one spawn shape), `classifyExecFailure`; `src/main/tmux/supervisor.ts:378` (`execTmux`) | 318 adds `stdin` |
| The phone's Session screen | `ios/Tortie/Screens/SessionScreen.swift`: header `:1-22` ("Pressing an option the agent drew is still Phase 318's"), `choices` `:280-294`, `OptionRow` `:371-397`, the End bar inset `:191-196` | |
| The phone's End | `ios/Tortie/Screens/EndBar.swift`: `EndRunnerRegistry` `:36-39`, `EndRunner` `:57-105`, `EndModel` `:177-276` | the pattern the reply follows |
| The phone's write path | `ios/Tortie/Door/DoorClient.swift`: `end` `:237-239`, `signedPost` `:321-355`, `WriteRoute` `:488-503`, `EndBody` `:508-512`, `WriteId` `:517-537`, `WriteResult` `:542-583`; `DoorLimits.timeout` 15 s `:162` | |
| The phone's contract | `ios/Tortie/Door/Contract.swift`: `PocketWriteAnswer` `:298-342` (closed `Verb`, `Outcome`, `Reason`; invariants), `PocketSessionDetail` `:431-480` | |
| The phone's seams | `ios/Tortie/Screens/DoorWords.swift:44-72` (`DoorReading.writer`, `DoorWriting.end`), `endSentence(for:)`; `ios/Tortie/App/TortieApp.swift:300-306` (`wentAway`), `:448-456` (the registry), `:585-615` (`SessionRoute`), `:643-675` (`PairedReader`) | |
| The phone's words | `ios/Tortie/Style/Copy.swift:145` (`answerInTheSession`), `:413-454` (End's words, `endNoAnswer` `:454`); `ios/TortieTests/CopyTests.swift:187-199` refuses `Message this session`, `Send`, `Sending…`, `Goes to this session as one message.` | |
| The owed copy | `build/p311/copy-drift.mjs:833-852`, four rows owed to Phase 318 | |
| The gates | `build/conformance-pocket.mjs`: `ROUTE_PIN` `:788`, `FORBIDDEN` `:1105-1145`, `LOGGABLE_POISON` `:1536-1537` with its scope `:1538-1539`, X1 to X12 `:5357-6300`; rule ids taken: A to X (Y and Z free). `build/conformance-ios.mjs`: `PHONE_BUILD = '5'` `:2865`, (ab) to (ad) `:4408-4450`, `OWNER_CHECK_ABSENT`. `build/assert-import-boundaries.mjs:281-300` (the `main/pocket/` wall) | |
| Floors | `HELPER_USER_FLOOR = 162` (`build/assert-electron-teardown.mjs:391`); `SIMULATOR_USER_FLOOR = 2` (`build/assert-simulator-teardown.mjs:108`) | |
| Committed screens | `src/main/activity/__tests__/fixtures/`: `claude-permission-prompt.txt` (a real, older Claude Edit prompt: `Do you want to make this edit to note.txt?`, `1. Yes`, `2. Yes, allow all edits during this session (shift+tab)`, `3. No`), `claude-idle.txt`, `codex-idle.txt` (its prompt row `› Write tests for @filename` is Codex's PLACEHOLDER, which a plain capture cannot tell from typed text), `claude-trust-2-1-280.txt`, `claude-theme-picker.txt`, `claude-workspace-trust.txt`, `codex-signin-choice.txt`; `build/fixtures/questions/a-codex.jsonl` id `a-codex-0002` (the update prompt) | **No committed capture of Claude Code 2.1.285's Bash prompt or Codex 0.159.1's command approval exists.** Research 135's captures were in scratch and are gone. Their words survive in research 135 §2.2 and, for Codex, independently in research 133 §2 (`› 1. Yes, proceed (y)`, `› 2. Yes, and don't ask again for commands that start with \`…\` (p)`, `› 3. No, and tell Codex what to do differently (esc)`). **Since the capture step: real captures of Claude Code 2.1.287 and Codex 0.160.0 are committed under `build/fixtures/reply/` (§7.3, §Revision R20 to R27)** |

---

## 3. Where the entry, 317 as built and his rulings are reconciled

| # | The entry or research says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "Every write asks for Face ID first … unless he rules otherwise" | He ruled "Only for End" | No owner check on a reply (D24); rule (af) holds it |
| 2 | Widening options "drawn but cannot be pressed" | He ruled "Yes, allow them" | Every option of a compiled shape is pressable when what will run is said (D11, D12). The compiled shapes are Claude's Bash prompt and Codex's command approval, each measured by the capture step; Claude's Edit and Write prompts are not admitted, because research 135 §7 ruling 1 admits them only once measured and the capture measured the Bash prompt only |
| 3 | A first `/` or `!` refused | He ruled they may be typed | Allowed (D15) |
| 4 | "`rowOf` adds, for each blocked row, `questionId`, `choiceMark` … `pressable`" | `blocked()` is synchronous and its rows feed the push engine; the press is drawn on the Session screen alone | One `reply` field on `/v1/session` only (D18) |
| 5 | `pressable` "on each option" | `SessionChoiceOption` is the activity channel's type (`src/shared/ipc/sessions.ts:271-280`), pinned by `conformance:choices` clause 8 | A separate list of markers, `reply.pressable` |
| 6 | "`src/shared/session-gates.ts` gains `canChoose` and `canSay`" | 316.7 is editing that file in parallel; the reply's conditions are narrower than "live" | `src/main/reply/gate.ts` (D21) |
| 7 | The caps, "pinned by a test" | `POCKET_WRITE_BODY_CAPS` lives in `door/limits.ts` | choose 512, say 32,768 there (D3; §Revision R18) |
| 8 | The ledger keyed on phone and write id | 317's fix round asked for the verb | `keyOf(phone, verb, write)` (D4) |
| 9 | The last check before "the act" | For a press, the act is a keystroke after awaited reads | The verb asks `still()` again in its own final check (D5) |
| 10 | "The same window still drawn: outcome `not-taken`, 'Nothing was changed.'" | 317's outcomes are `done`, `refused`, `failed`, `busy`, and the phone decodes a closed set | `failed` with `REPLY_NOT_TAKEN` (D19) |
| 11 | The press list "copy-mode -q ; send-keys -l -- <digit>" over `-t <$id>` | `liveIds` holds the `$`-id and is private | `core.tmuxIdOf(id)` (§5.6) |
| 12 | "The probe … check-to-land … a harness-only stamp" | A stamp needs a `GMUX_*` name, which moves `gate:contract` | Measured by the shipping writer outside Electron (D26) |
| 13 | "`SIMULATOR_USER_FLOOR` … by one, for `probe:p318`" | 317 put its phone arms in `probe:p316` | `probe:p316`'s `reply` group; the floor stays 2 (D27) |
| 14 | S0 "measures … over the stand-in and the real agents under a scratch HOME" | His ruling 5 of 2026-10-02 allowed it; the installs had moved to Claude Code 2.1.287 and Codex 0.160.0 | The capture step ran both at 0 model turns and committed their real screens (§7.3); the shapes are compiled from those, and fail closed (§Revision R20 to R27) |
| 15 | Method 3, "the real Claude Code 2.1.285 and Codex 0.159.1" | His ruling 5; the versions moved | A per-row matrix over the stand-ins drawing the committed real screens, and the real agents' rows under ruling 5, once each per need, at 0 model turns (§7.8 method 4) |
| 16 | "`HELPER_USER_FLOOR` … 156 at `2abdea43` … rises by one over whatever 317 left" | 162 at this snapshot | 163 |
| 17 | `docs/design/phone/Choice.html` "loses its disabled message strip (`:65-66`)" | The strip sits under the options at the snapshot, and Choice.html draws a GROK session | Choice.html loses the strip and stays the unpressable case (Grok is never pressable); NEW `Answer.html` draws a pressable Claude choice |
| 18 | Session.html's strip | Session.html draws a `Needs input` session, where no text box is drawn | Session.html loses the strip; Composer.html is the strip's mock, redrawn |
| 19 | "the outcome `sent`" | The phone decodes `done` | `done`, and the phone draws `Sent` (a phone word) |
| 22 | "A message sent while the agent is working waits for the turn to end" | A message's Return lands wherever the agent's focus is when the paste arrives, and a working agent draws a permission question at a moment of its own (research 135 §2.4: 45 to 127 ms after a commit, with no model round trip); the paste is a process spawn after the check (p99 9 to 61 ms under load, §Revision R7) | A message only while the agent reads idle (D14, §Revision R15), as his ruling 4 of 2026-10-02 confirms ("Only when idle at its prompt") |
| 20 | 317's G1 widening already holds `text`, `message`, `words`, `label`, `typed`, `reply` | true (`build/conformance-pocket.mjs:1536-1537`) | G1's scope gains `src/main/reply/**` (Y12) |
| 21 | N1 "no route names the push" | 317 did it | stands |

---

## 4. The base, and the replay

### 4.1 The base, already made

`/private/tmp/wt-p318`'s `HEAD` is `c1a5fd38`, made by the main session. 318's work goes on top, UNCOMMITTED, so
`git diff c1a5fd38` (plus the untracked files `git status --short` lists) is exactly 318's delta. The integrator's first
act is to check that and nothing more: `git rev-parse HEAD` reads `c1a5fd38…`, nothing is staged, and
`git diff --stat c1a5fd38` names only files §10 assigns.

### 4.2 Two phases move under this one, and the main session reconciles them at landing

- **316.6's last check switches markdown off** (`MarkdownCaps.pieces` to 0, every answer drawn as today). It may touch
  `ios/Tortie/Screens/SessionScreen.swift`. 318's edits to that file are confined to the header comment, the `choices`
  section and `OptionRow`, and the bottom `.safeAreaInset`, so a three-way merge meets 316.6's lines only by accident.
- **316.7 builds in `/private/tmp/wt-p3167` from the same snapshot.** Files both phases edit, each by appending its own
  block and never reshaping the other's: `src/main/pocket/door/table.ts` (a row each), `door/wire.ts`
  (`SIGNED_ROUTES` theirs, `WRITE_ROUTES` ours), `src/shared/ipc/pocket.ts`, `src/main/pocket/routes.ts` (`sessions()`
  theirs, `session()`'s `reply` ours), `build/conformance-pocket.mjs` (R2 and R4 both; O2, O3 theirs; Y1 to Y18 ours),
  `build/ablation-p313.mjs`, `build/p313/hostile-client.mts`, `build/conformance-ios.mjs` ((aa) theirs; (ae) to (ag)
  ours; `PHONE_BUILD`), `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `build/p316/probe-p316.mjs`,
  `ios/TortieUITests/P316DriveUITests.swift`, `ios/Tortie/Door/Contract.swift`, `ios/Tortie/Door/DoorClient.swift`,
  `ios/Tortie/App/TortieApp.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/Tortie/Style/Copy.swift`,
  `ios/Tortie.xcodeproj/project.pbxproj` (the build number), `CHANGELOG.md`, `CLAUDE.md`, `docs/design/phone/index.html`,
  and (added by §Revision R9, each named in 316.7's own §11 or §12) `ios/Tortie/Screens/DoorWords.swift` (`DoorReading`
  theirs, `DoorWriting` ours), `build/p316/node-phone.mjs`, `build/p316/hostile-door.mjs`, `build/p316/vectors.mjs` and
  `ios/TortieTests/Fixtures/vectors.json` (regenerated over both), `build/p313/hostile-client.mjs`,
  `src/main/pocket/__tests__/{routes,door-wire,server,pairing}.test.ts`,
  `src/renderer/settings/__tests__/p316-phone-section.test.tsx`, `ios/TortieTests/{CopyTests,DoorVectorTests}.swift`,
  `build/p317/probe-p317.mjs` (`ROUTE_LINE`: the UNION of both phases' routes, sorted; `WRITE_LINE` and the honesty
  sentence are 318's), `build/assert-electron-teardown.mjs` (both raise `HELPER_USER_FLOOR` from 162 to 163, so the
  second to land sets **164**), `package.json` and `build/verification-checks.mjs` (a script each).
  Whichever lands second re-derives R4 (D29), takes the build number of D30, sums the floors, and runs the full battery
  on the merged tree. A conflict or a red gate stops the replay and goes to the operator; nobody resolves a conflict by
  dropping a clause.
- **The landing cleans up after itself** (his rule of 2026-10-01): once the follow-up docs commit is pushed and no
  running process names the path (`ps -Ao command | grep <path>`), the worktree is removed with `git worktree remove
  --force` and `prune`, every parent or clone the verifiers made, `…/scratchpad/p318*` with every DerivedData, and the
  stale `gmux-p318-*` and `p318-v-*` socket files whose server is gone. Never a path another phase in flight uses, and
  never under `/Users/gdc`. The landing report says the space freed, measured with `df -k /private/tmp` before and
  after.

---

## 5. The design

### 5.1 The two rows, on 317's door

#### 5.1.1 The table, the wire and the caps

`src/main/pocket/door/table.ts`, after `end`, frozen with the rest, and the header comment's write sentence widened to
"exactly `end`, `choose` and `say`":

```ts
{ id: 'choose', method: 'POST', path: '/v1/choose', reads: false, windowOnly: false, signed: true },
{ id: 'say', method: 'POST', path: '/v1/say', reads: false, windowOnly: false, signed: true }
```

`src/main/pocket/door/limits.ts:53`: `POCKET_WRITE_BODY_CAPS = Object.freeze({ end: 512, choose: 512, say: 32_768 } as const)`,
its comment naming both worst cases (§5.1.3).

`src/main/pocket/door/wire.ts`: `DoorWriteRoute = Extract<PocketRouteId, 'end' | 'choose' | 'say'>` and
`WRITE_ROUTES = ['end', 'choose', 'say']`. Nothing else in `door/**` moves: the listener's cap lookup, query refusal,
target rule, late-write cut and revoked-socket rule are already generic over `route.reads`.

`src/shared/ipc/pocket.ts`: `POCKET_ROUTE_IDS` gains `'choose'` and `'say'` (each with its one-line comment);
`POCKET_WRITE_ROUTE_IDS = ['end', 'choose', 'say']`; the header's write paragraph says exactly what the three can do.

#### 5.1.2 The bodies, parsed strictly in main

`src/main/pocket/writes.ts` gains `parseChooseBody` and `parseSayBody` beside `parseEndBody`, through the same one
`JSON.parse` (`objectOf`) and the same echo rule (a well-formed `write` is echoed even from a malformed body):

| Verb | Keys, sorted and joined, exactly | Each value, read one character at a time |
| --- | --- | --- |
| end | `batch,session,write` | unchanged |
| choose | `mark,marker,question,session,write` | `session` and `write` as end's; `question` is 16 lowercase hex, `-`, then 1 to 16 decimal digits with no leading zero but `0` itself (the id's own shape, §5.3); `mark` is exactly 12 lowercase hex (`hashScreen`'s shape); `marker` is exactly one character `1` to `9` |
| say | `session,text,write` | `session` and `write` as end's; `text` is a string, any string: its rules are the verb's (§5.5.1), each with its own sentence |

Anything else is 200 `refused malformed` with `POCKET_WRITE_SENTENCES.unreadable`, and the ledger records nothing. A
duplicate key in a body passes (`JSON.parse` keeps the last), as 317 recorded and left: every body is signed by the
phone's key, and nothing acts twice.

#### 5.1.3 The caps, computed

Measured by this step with `JSON.stringify` and a slash-escaping pass standing for Swift's `JSONEncoder`:

- choose, worst `{"mark":"<12>","marker":"9","question":"<16 hex>-9007199254740991","session":"<128>","write":"<32>"}`:
  **267 bytes**. The cap is 512.
- say, worst: a 4,096-byte text of `"`, `\` or LF, each escaped to two bytes by both encoders, or of `/`, which Swift
  escapes to `\/`: **8,387 bytes** either way. 1,024 four-byte emoji: 4,291. **But the phone does not apply the text
  rules before it sends** (it decides nothing), so a 4,096-byte text of C0 controls, which both encoders escape as
  `\u00XX` (six bytes for one), is **24,771 bytes** (re-derived by the adversary with `JSON.stringify`), and at a
  16,384 cap the door would drop it `oversized` (404, "did not take it") instead of the Mac answering
  `refused character` with its sentence. The cap is **32,768**, which holds that and an encoder escaping every
  astral character as a surrogate pair (3x). A text longer than about 5,400 characters may still exceed it and is
  answered by the door's 404, which the phone draws as `Your Mac did not take it. Nothing was sent.`, a true sentence.

A vitest (`src/main/pocket/__tests__/p318-body-caps.test.ts`) and an XCTest (`ReplyClientTests`) each encode the worst
bodies their own way and assert each is at most its cap.

#### 5.1.4 The one write path, widened — `src/main/pocket/writes.ts`

The seven steps stay in their order, each named in the code. What changes:

1. **Step 1** parses by `route.id`: `parseEndBody`, `parseChooseBody` or `parseSayBody`. The guard at `:260` becomes
   "a host with no writes, a read, or an id not in `POCKET_WRITE_ROUTE_IDS` answers 404".
2. **Step 2**: `keyOf(phone, verb, write)`, joined by a newline no part can hold (D4).
3. **Step 3**: one in flight per phone and per session, ACROSS verbs (the two sets do not change shape).
4. **Step 4**: the last check is unchanged, and the act starts in the next statement. For `choose` and `say` the
   handler builds, beside the act, `const still = (): boolean => !deps.shuttingDown() && !door.stopping() &&
   deps.stillPaired(verifiedPhone);` and hands it to the verb (D5).
5. **Step 5**: `replySettled(() => writes.choose({ sessionId, question, mark, marker }, still))` or
   `writes.say({ sessionId, text }, still)`, the same "cannot throw past here" wrapper as `endSettled`, a rejection
   reading `failed` with `REPLY_FAILED`.
6. **Step 6** records and answers.
7. **Step 7**, one log line: `the phone's ${verb}: ${outcome}` with `{ session }`. Never the body, the write id, a
   header, a sentence, the question id, the mark, the marker or the text.

Every 404 is still produced before step 5; after it every answer is 200 marked `acted`, which `bind.ts` never replaces.

#### 5.1.5 `PocketWrites`, widened — `src/main/pocket/routes.ts`

```ts
/** What a press echoes: the question id and the mark it was shown, and the option pressed. */
export interface PocketChooseInput { sessionId: string; question: string; mark: string; marker: string }
/** One message, as the phone sent it. */
export interface PocketSayInput { sessionId: string; text: string }
/**
 * The door's last check, handed to a verb that reads before it acts (Phase 318, D5): the quit, this door instance
 * stopping, the signing phone still paired. The verb asks it AGAIN in its own final synchronous check, with nothing
 * awaited between that and the keystroke.
 */
export type PocketStillAllowed = () => boolean;

export interface PocketWrites {
  end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome>;
  /** Press one option of a measured question. Answers an outcome and never throws. */
  choose(input: PocketChooseInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
  /** Send one message. Answers an outcome and never throws. */
  say(input: PocketSayInput, still: PocketStillAllowed): Promise<PocketReplyOutcome>;
}

export type PocketReplyRefusal =
  'gone' | 'changed' | 'unpressable' | 'unsayable' | 'stopped' | 'empty' | 'long' | 'character';
export type PocketReplyOutcome =
  | { outcome: 'done' }
  | { outcome: 'refused'; reason: PocketReplyRefusal; sentence: string }
  | { outcome: 'failed'; sentence: string };
```

`pocketWriteRouteIds()` answers the write rows' ids read from the table, exactly `['end', 'choose', 'say']`.

`src/main/sessions/pocket-writes.ts` stays the one place `PocketWrites` is implemented: `createPocketWrites` gains a
dep `reply: Pick<PocketWrites, 'choose' | 'say'>` (the verbs of §5.6, handed in by `capabilities.ts`) and its returned
object gains `choose: (input, still) => deps.reply.choose(input, still)` and the same for `say`. Nothing else in the file
moves; `end` and `endOffer` are byte for byte 317's.

#### 5.1.6 The answer and the sentences

`src/shared/ipc/pocket.ts`: `PocketWriteReason` gains `'changed' | 'unpressable' | 'unsayable' | 'stopped' | 'empty' |
'long' | 'character'`; `POCKET_WRITE_SENTENCES` gains `stopped: 'Your Mac stopped answering this phone. Nothing was
done.'`; `PocketWriteAnswer`'s five fields and their invariants do not change. `PocketWriteOutcome`'s comment says
`failed` truly once a press can be typed and not known to be taken: "`failed`: it was asked for and is not known to
have happened; the sentence says what is known" (§Revision R11).

NEW `src/shared/reply-copy.ts`, imports nothing, each constant one line with the reason it exists above it:

```ts
/** The Mac's own words for a choice the phone may not press: CHOICE_NOT_PRESSABLE (src/renderer/choice.ts:57), held equal by a test. */
export const REPLY_ANSWER_IN_SESSION = 'Answer this in the session.';
/**
 * A press was typed and, 300 ms later, the same window was drawn and no hook had come. It does NOT say
 * "nothing was changed": an identical next question can be drawn in the same window (research 135 §2.6),
 * so all Tortie knows is what this says.
 */
export const REPLY_NOT_TAKEN = 'Your answer was typed and the question is still there.';
/** A press was typed and the screen could not be read after it. */
export const REPLY_TYPED_UNREAD = 'Your answer was typed, and Tortie could not read the session after it.';
/** tmux refused the press or the message. */
export const REPLY_FAILED = 'Tortie could not type into this session.';
/** Not at its own empty prompt, asking something, something already typed there, or not an agent Tortie sends to. */
export const REPLY_NOT_READY = 'This session is not ready for a message. Nothing was sent.';
export const REPLY_TEXT_EMPTY = 'There is no message to send.';
export const REPLY_TEXT_LONG = 'That message is too long to send. Nothing was sent.';
export const REPLY_TEXT_CHARACTER = 'That message holds a character Tortie does not send. Nothing was sent.';
```

No sentence names a tmux word (CLAUDE.md's UI rules), and a vitest holds that.

#### 5.1.7 The confirm lines, the honesty sentence

`src/main/pocket/pairing.ts`: `WRITE_CLAUSES = { end: 'end a session', choose: 'answer a numbered question', say: 'send
a session one message' }`, still keyed by `PocketWriteRouteId`; the clauses are joined as a list, commas between all
but the last two and ` and ` before the last, in `POCKET_WRITE_ROUTE_IDS`' order. The line reads `Lets an allowed phone
end a session, answer a numbered question and send a session one message`, and the route line `Answers these and nothing
else: blocked, choose, end, pair, say, session, turns`. The hash moves by the route list (refusal 8); the algorithm
`sha256-pocket-exec-v3` does not.

`POCKET_DOOR_HONESTY` becomes `'A phone you allow can end a session, answer a numbered question and send a session one
message. It can change nothing else on this Mac.'` It still names no Face ID (317 D13). `PhoneSection.tsx` draws it by
name and does not move; `src/renderer/settings/__tests__/p316-phone-section.test.tsx` follows the words.

### 5.2 What the door serves — one field on `/v1/session`

`src/shared/ipc/pocket.ts`:

```ts
/**
 * What the phone may do with one session's question or prompt, decided in main over ONE fresh reading at the
 * answer's `at` (Phase 318). A client draws it and decides nothing: a press and a message are asked again by id.
 */
export interface PocketReplyOffer {
  /** The question id main minted, echoed by a press. Null exactly when `pressable` is empty. */
  question: string | null;
  /** The choice's mark when this was read, echoed by a press. Null exactly when `question` is. */
  mark: string | null;
  /** The markers of the options that may be pressed now, each one of `choices`' own markers, in drawn order. */
  pressable: string[];
  /** The command the agent asks to run, when the question does not say it (Codex's `$` line). Null otherwise. */
  command: string | null;
  /** Whether one message may be sent now. */
  canSay: boolean;
}
export const POCKET_NO_REPLY: PocketReplyOffer  // frozen: null, null, [], null, false
```

`PocketSessionDetail` gains `reply?: PocketReplyOffer` beside `endConfirm`, optional for 317's reason (hand-built
literals in files no builder owns); **absent reads `POCKET_NO_REPLY`** on both sides, and the door's one composer always
sets it.

`PocketFacts` gains one OPTIONAL read member,
`replyOffer?(session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer>`, where
`interface PocketReplyDrawn { readonly question: string | null; readonly choices: readonly SessionChoiceOption[] }` is
declared beside it in `routes.ts` (main only, never on the wire), handed in by `capabilities.ts` through
`createPocketFacts` (`src/main/pocket/facts.ts`, a passthrough like `endOffer`). Absent (the push seam, the tests),
every session reads `POCKET_NO_REPLY`. `routes.ts`'s `session()` asks it beside `catchUp` and `lastTurn`, after the
refresh and the second lookup, handing it `{ question: base.question, choices: base.choices }`, the very two values
this answer serves (§Revision R1), and composes `reply` FIELD BY FIELD (a fresh array of strings for `pressable`), so
nothing else can leave. A `replyOffer` that rejects reads `POCKET_NO_REPLY`, and the read still answers.

**Why `drawn` is handed in (R1).** `base.question` and `base.choices` come from the activity map
(`src/main/sessions/activity-now.ts`), written only when the monitor's tick broadcasts (`core.ts:1107-1111`); a hook's
question reaches it on the NEXT tick (`monitor.ts:483-486`), and a choice only on a tick that captured the pane. The
reader's capture is fresh. Without the binding, a phone reading between Claude's `PermissionRequest` for command B and
the next tick drew command A's question (the map's) over options that, on Claude 2.1.285, read the same for different
commands (one mark covered six commands, research 135 §2.6), while `question`, `mark` and `pressable` were B's: the tap
the person made on A approved B, and every check at the press passed.

### 5.3 The question id — NEW `src/main/reply/question-id.ts`

Imports `node:crypto` and nothing else. One process-wide instance, `replyTurns`, and a factory for tests.

```ts
export type TurnCause = 'hook' | 'desk' | 'phone' | 'choice-appeared' | 'choice-moved' | 'choice-gone' | 'status';
/** What a Bash `PermissionRequest` said: its command whole (`'whole'`), or not whole (`'partial'`). */
export type HookBash = 'whole' | 'partial';
export interface QuestionTurn {
  /** `<prefix>-<n>`. A string on the wire, never a number. */
  readonly id: string;
  /** The process-wide count this session last took. 0 for a session never bumped: never offered, never matched. */
  readonly n: number;
  /** Hook events this session has had, ever (the read-back's "a hook since the press", D16). */
  readonly hooks: number;
  /** The hook's composed question that belongs to this n, or null. */
  readonly hookAsk: string | null;
  /** Null unless the hook that belongs to this n was a `Bash` `PermissionRequest` (D11, D12). */
  readonly hookBash: HookBash | null;
}
export interface QuestionIds {
  current(sessionId: string): QuestionTurn;
  /** A hook event. `ask` and `bash` are a `PermissionRequest`'s, else null. */
  hook(sessionId: string, ask: string | null, bash: HookBash | null): void;
  bump(sessionId: string, cause: Exclude<TurnCause, 'hook'>): void;
}
export function createQuestionIds(prefix: string): QuestionIds;   // prefix: 16 lowercase hex
export const replyTurns: QuestionIds;                               // randomBytes(8), chosen once
```

- **ONE PROCESS-WIDE COUNTER (§Revision R2).** Every bump of any session takes `++next`, and the session's `n` becomes
  that value. So no two sessions ever hold the same non-zero id, and a press body naming session B with session A's
  question id is refused `changed` whatever the two screens show. (A counter PER session, as first written, gave every
  session `<prefix>-1` at its first dialog; two Claude sessions at the same count drawing prompts with one mark, which
  2.1.285 draws for different commands, would have taken a body with one session's id and the other's question.)
- The id is `<prefix>-<n>`: a string on the wire, never a number, so the phone's rule (k) on door numbers never reaches
  it. A session never bumped reads `n = 0`, and `n = 0` is never offered (the reader leaves `pressable` empty) and never
  matched (the press refuses `changed`). An id from before a restart never matches one after it.
- **D7, the one exception.** `hook(id, ask, bash)` takes the next count, adds one to `hooks`, and keeps `ask` (an empty
  string reads as null) and `bash`. A `choice-appeared` bump whose previous event was `hook` does NOT take a count and
  keeps both: it is the dialog the hook announced appearing. Every other bump takes a count and clears both.
- The map holds one small entry per session id ever seen. Session ids are never reused, so an entry is never wrong;
  the memory is a few dozen bytes a session.

**Who bumps, and nowhere else** (Y13 pins every call site):

1. `src/main/sessions/core.ts`'s hook `onEvent`: the composed question is computed ONCE into a const `asked`, exactly
   the expression of today (`state === 'needs_input' && body !== undefined ? questionFromHookBody(body) : null`), then
   `replyTurns.hook(sessionId, asked, asked !== null && body !== undefined ? hookBashOf(body, asked) : null)`, then
   `this.activity.noteHookEvent(sessionId, state, asked)` exactly as today. `onSessionEnd` calls
   `replyTurns.hook(sessionId, null, null)` first. `hookBashOf` is NEW pure `src/main/reply/hook-says.ts` (below).
2. The attach host's new `onInput(sessionId)` (D23), wired in core's `new AttachHost({ … })` as
   `onInput: (id) => replyTurns.bump(id, 'desk')`. In `attach-host.ts`, the listener calls `this.options.onInput?.(
   req.sessionId)` in the same synchronous handler, right after `client.pty.write(data)`, only when the client is LOCAL
   (`req.machine === undefined`) **and `!isPaneReport(data)`** (§Revision R14). A pane report is forwarded exactly as
   today and moves nothing: `resources/gmux-tmux.conf:49` sets `focus-events on`, so every blur and focus of the Mac's
   window sends `ESC [ O` / `ESC [ I` down this channel, and every return to a session sends two device-attributes
   answers (`src/renderer/terminal/TerminalPane.tsx:439-440` hands them to `scroll.sendReport`, which is
   `gmux.term.sendInput` on the same channel, `src/renderer/terminal/scroll/surface.ts:454-456`). Under D7 a bump
   clears the hook's question, so without the filter a Claude dialog that was on screen when he walked away from the
   Mac would never be pressable from the phone. `isPaneReport` and its three kinds move token for token from
   `src/renderer/terminal/keys/{pane,focus,color,device}-report.ts` to NEW `src/shared/pane-report.ts`; each renderer
   file keeps its name and re-exports its own members, so no renderer importer moves.
3. The monitor's new dep `onChoiceMoved?(sessionId: string, kind: 'appeared' | 'moved' | 'gone')`, called at the caller
   of `choiceUpdate` (`monitor.ts:1098`) when it returns non-null: `'gone'` for `{ atChoice: false }`, `'appeared'`
   when the previous mark was absent or `NO_CHOICE_MARK`, `'moved'` otherwise. `choiceUpdate`'s own body does not move.
   Core wires `onChoiceMoved: (id, kind) => replyTurns.bump(id, \`choice-${kind}\`)`.
4. The writer, synchronously, immediately before each act (§5.6).
5. **Core's `onStatus` wiring** (§Revision R16): `onStatus: (id, status) => { if (status !== 'needs_input')
   replyTurns.bump(id, 'status'); this.applyDetectedStatus(id, status); }`. A choice goes, most of the time, because
   the session stopped waiting: `commit` then queues the clear through `noteChoiceGone` and the tick's drain
   (`src/main/activity/monitor.ts:1237-1241`, `:663-669`), which never passes the caller of `choiceUpdate` at `:1098`,
   so item 3's `'gone'` alone misses it, and research 135 §2.7's "every tick that finds the choice gone" was not met.
   With this, a hook's question can never survive a wait that ended (a `PermissionRequest` whose dialog Claude never
   drew, approved by another hook or its classifier, then a later dialog that fires none). The monitor does not move.

**`src/main/reply/hook-says.ts` (pure, §Revision R4).** `export function hookBashOf(body: string, asked: string):
HookBash | null`. One `JSON.parse` inside a `try` (null on a throw); null unless the body is an object with no own
`agent_id` and no own `agent_type` (a subagent never speaks for the session, as `question.ts` says), an own `tool_name`
exactly `Bash`, and an own `tool_input` object with an own `command` that is a non-empty string. Then `'whole'` exactly
when `asked === 'Bash ' + command`, byte for byte, and `command` holds none of §Revision R27's characters, else
`'partial'`. Measured on the real bodies (`build/fixtures/reply/claude-permission-requests-2.1.287.json`, §Revision
R22): `touch p318-one.txt` composes `Bash touch p318-one.txt` (whole); the two-line, blank-line and 302-character
commands compose flattened or cut questions (partial). Equality is the whole test: `questionFromHookBody`
flattens control characters and newlines to spaces, collapses whitespace, strips CSI sequences, trims, redacts and cuts
at `QUESTION_MAX` (`src/main/activity/question.ts:107-109`, `:171-186`), so the drawn question equals `Bash <command>`
only when none of those changed a byte. Measured shape it refuses: a command `echo ok` LF `rm -rf ~` is drawn
`Bash echo ok rm -rf ~`, which reads as one `echo`. It imports nothing; it never logs; it reads nothing but `body`.

### 5.4 The reader — NEW `src/main/reply/reader.ts`, `gate.ts`, `press-shapes.ts`, `input-row.ts`

#### 5.4.1 The gate — `gate.ts` (pure)

```ts
export type ReplyKind = 'press' | 'say';
/** Why a session is not one the phone may reply to, or null when it may (before any reading). */
export function replyGate(session: Session | undefined, kind: ReplyKind, tmuxId: string | null):
  null | 'gone' | 'unpressable' | 'unsayable' | 'changed';
```

In this order: no session → `gone`; `session.machine !== undefined` or `session.agent` not `claude` or `codex` →
`unpressable` (press) or `unsayable` (say); for a press, status not `needs_input` → `changed`; for a message, status not
`running` or `idle` → `unsayable`; `tmuxId === null` → `changed` (press) or `unsayable` (say). The remote and agent arm is
first, so a row on another machine is refused before any tmux call is composed (Y10).

#### 5.4.2 One fresh reading

`reader.ts` exports `readReply(session, kind, deps)`, used by the door's `replyOffer` AND by the writer, so the offer and
the press read the screen one way:

1. `list-panes -t <$id> -F PANE_FORMAT`, parsed by `parsePaneLines` (one pane per session; the active one wins). The
   reading keeps `pane.paneId`; the act targets THAT pane (§Revision R19 b).
2. `readProcSnapshot()`, then the pane's foreground program by `foregroundProgram(proc, pane.panePid)`, then its whole
   command by `readProcessCommand(pid)`, then `commandRunsAgent(command, binaryCandidatesFor(agent),
   bundledRootsFor(agent))`. Any null along the way reads "not the agent".
3. For a message, the agent's own reader fresh: `core.activity.nativeReadingOf(sessionId, agent, cwd, pane, proc)`,
   NEW on the monitor: `nativeVerdict(pane, activityProfileFor(agent), st, cwd, this.claude, proc)` for a tracked
   session, else null. It writes nothing. For a Codex message, also tmux's own cursor:
   `display-message -p -t <paneId> '#{cursor_x}\t#{cursor_y}'` (§Revision R17).
4. **LAST**, so the screen is the youngest thing the final check reads (§Revision R15): for a press,
   `capture-pane -p -t <paneId>` (the plain screen the detector was measured on); for a message,
   `capture-pane -p -e -t <paneId>` (styled, D14). The process reads above take a `ps` each (tens of milliseconds),
   and as first written the capture came before them.

Every read is awaited. A read that fails reads as "not pressable" and "cannot say". `reader.ts` calls `detectDialogRows`
(never `detectDialog` or `detectShapes`), `choiceMarkOf` (exported from `monitor.ts`, one keyword), and none of
`noteForeground`, `foregroundToRead` or `agentHoldsTerminal`.

#### 5.4.3 The press shapes — `press-shapes.ts` (pure, compiled)

```ts
export type PressShapeId = 'claude-permission' | 'codex-command-approval';
export interface PressReading {
  readonly shape: PressShapeId;
  /** The fresh rows' own markers, `1` to `k`, consecutive. */
  readonly markers: readonly string[];
  /** The markers whose option text starts `No`. */
  readonly deny: readonly string[];
  /** What will run, said whole, or null. */
  readonly runs: string | null;
  /** The command to draw, when the question does not say it (Codex), else null. */
  readonly command: string | null;
}
export function readPress(input: {
  agent: string; screen: string /* normalized plain capture */; rows: DialogRows;
  hookAsk: string | null; hookBash: HookBash | null;
}): PressReading | null;
export function pressableOf(reading: PressReading): readonly string[];  // runs !== null ? markers : deny
```

Common to both: `rows.atChoice`, 2 to 9 options, markers exactly `1`, `2`, … `k` in drawn order, each one character.

- **`claude-permission`** (Claude Code's BASH prompt, and nothing else; §Revision R4): `agent === 'claude'`;
  `hookBash` non-null (a `Bash` `PermissionRequest` named this wait, D7) and `hookAsk` non-null; `rows.question`
  starts `Do you want to`. `deny`: options whose text starts `No`. `runs` is `hookAsk` exactly when `hookBash ===
  'whole'` (D12: the drawn question is `Bash ` and the command byte for byte), else null. `command` is null: the drawn
  question already carries it. Claude's Edit (`Do you want to make this edit to …?`) and Write (`Do you want to create
  …?`) prompts, and every tool but `Bash` (`AskUserQuestion`, `ExitPlanMode`, `Task`, `WebFetch`, every `mcp__` tool,
  whose composed question can hold a space and a value without saying what will run), answer null: research 135 §7
  ruling 1 admits Edit and Write only once measured on the real agent, which this phase's capture did not do. Measured
  on 2.1.287 (`claude-bash-*.txt`, §Revision R22): the question row `Do you want to proceed?`, then `1. Yes`, `2.` a
  widening option whose words follow Claude's own permission suggestion (`Yes, and always allow access to <folder>
  from this project` for a command that writes there), `3. Yes, and switch to auto mode · auto mode handles these
  prompts for you`, `4. No`; the rows, and so the choice mark, are the same for every command in one folder.
- **`codex-command-approval`** (measured on Codex 0.160.0's real approvals, §Revision R20, R21, R25): `agent ===
  'codex'`; the normalized screen holds EXACTLY ONE row whose trimmed text is `Would you like to run the following
  command?`, and that row is the question row (it is read from the screen and never from `rows.question`, which is
  null once the dialog's rows put it more than `CHOICE_QUESTION_INK_ROWS` above the options, R21; a screen that draws
  the question twice reads null, R20); option 1's text starts `Yes, proceed`; the last option's text starts `No, and
  tell Codex` (two or three options: Codex leaves out "don't ask again" for some commands, R25). `deny`: the last.
  `runs` and `command`: between that question row and the first option row, EXACTLY ONE row whose trimmed text starts
  `$` (with or without a space after it), that row starts `$ `, and EVERY row after it up to the first option row is
  blank (a multi-line, blank-line, wrapped or folded command reads null, R20); its command non-empty, shorter than
  `QUESTION_MAX - 1`, holding no `…`, holding none of R27's characters, and equal to `redactText` of itself. Each real
  approval in `build/fixtures/reply/` carries the command Codex was really asked to run (`real-captures.json`,
  `truth.command`), and `press-shapes.test.ts` holds that `runs`, whenever it is not null, equals it.

Every other screen answers null: Claude's trust gates, theme picker, API-key list and first-run Security notes (none
fires a hook), Claude's Edit and Write prompts, Codex's sign-in list, update prompt and trust gate, a non-agent
program's numbered dialog, a resized Claude dialog whose hook ask was cleared (fails safe, research 135 §9 item 1: no
second hook comes, so that dialog stays unpressable until it is answered at the Mac). **The tables are compiled constants that
no configuration reaches** (refusal 5; Y7). His ruling 2 is `pressableOf`: every marker when `runs` is said.

#### 5.4.4 The empty prompt — `input-row.ts` (pure, compiled)

```ts
export function promptIsEmpty(
  agent: 'claude' | 'codex',
  styled: string,
  /** tmux's cursor for the pane, 0-based; null for Claude, and null (not empty) when Codex's could not be read. */
  cursor: { x: number; y: number } | null
): boolean;
```

Over a capture taken with `-e`, it reads SGR itself (attributes reset, dim `2`, normal intensity `22`, inverse `7`/`27`,
foreground `30`-`37`, `90`-`97`, `38;5;n`, `38;2;r;g;b`, `39`), and a character counts as PLACEHOLDER when it is drawn
dim or in a grey foreground (`90`, or `38;5;` 240 to 250), and as the CURSOR when it is drawn inverse and is a space, or
is the first character of a placeholder run.

- **Claude**: the last row whose text, its SGR removed and left-trimmed, starts `❯` and has a row of at least ten `─`
  directly above and directly below. Empty when everything after `❯` is spaces, placeholder or cursor. Two rows inside
  the rules (a multi-line draft), a stray `1`, or any typed character: not empty. **The caret (§Revision R17)**: when
  the row holds an inverse cell (Claude Code draws its caret as one), that cell must be the FIRST cell after `❯` and
  its one space; an inverse cell anywhere later means something sits before the caret, and the row is not empty
  whatever style that something is drawn in.
- **Codex**: the last row whose stripped text starts `› ` and is not an option row (`› 1.`), above the footer. Empty
  when everything after `› ` is spaces, placeholder or cursor, and no row between it and the footer holds a typed
  character. **The caret (§Revision R17)**: Codex draws the terminal's own cursor, so tmux's `#{cursor_y}` must be that
  row and `#{cursor_x}` the first column after `› ` (`promptIsEmpty(agent, styled, cursor)`, the cursor null for
  Claude); a cursor that cannot be read, or sits anywhere else, is not empty.
- **No row found, or more than one candidate: not empty.** It fails closed.
- **What the real agents draw** (the capture step, §Revision R23, R24): Claude Code 2.1.287 draws NO placeholder on
  its empty row, its caret as an inverse space right after `❯ ` while focused, and **no caret at all after a focus-out
  report** (his Mac window not focused, which is the phone's usual case), so the rule must never require a caret: the
  blurred fixture reads empty. A typed draft and the long-paste token `[Pasted text #1 +39 lines]` are drawn in the
  default colour, with the caret after them; a three-line paste puts three rows inside the rules. Codex 0.160.0 draws
  `›` bold, its placeholder (`Ask Codex to do anything` in these runs; Codex rotates them) dim (SGR 2), the terminal
  cursor visible at the first column after `› ` on the prompt row and unmoved by focus reports, a draft and the
  long-paste token `[Pasted Content 1879 chars]` (256-colour cyan, `38;5;6`) in colour, and a multi-line draft's
  continuation rows indented two with no glyph, the cursor on the last.
- **What it cannot see** (§13): a draft drawn dim or grey on a Claude row that shows no inverse cell reads as a
  placeholder. No real capture drew a draft so: the pasted-text tokens of both agents are drawn in colour, never dim
  or grey (§Revision R23, R24). The reconstructed dim-draft fixtures stay as the fail-closed arms of R17.

`codex-idle.txt` is why the capture is styled: its row `› Write tests for @filename` is Codex's placeholder and reads
as typed text without the style; the real `codex-prompt-empty-0.160.0.ansi` draws another placeholder the same way.

#### 5.4.5 The offer, composed — `replyOffer(session, drawn)`

For a session that `replyGate` refuses for both kinds, `POCKET_NO_REPLY` with nothing read. Otherwise, for a
`needs_input` row, the press offer: `n0 = replyTurns.current(id)` read BEFORE the reading, `n1` AFTER; when they differ,
or `n1.n === 0`, or the foreground is not the agent, or `readPress` answers null, `pressable` is empty. **And (§Revision
R1) `pressable` is empty unless what this answer DRAWS is what was just read**: `composeQuestion(n1.hookAsk,
rows.question)` (`src/main/activity/question.ts:247`, the one precedence the monitor uses, called here as a READ; it
writes no `update.question`, so `conformance:choices` clause 9 is untouched) equals `drawn.question`, and `rows.options`
equals `drawn.choices` element for element, the same length, each `marker` and `text` equal. Else `question = n1.id`,
`mark = choiceMarkOf(choice, rows.question ?? '')` over the rows just read, `pressable = pressableOf(reading)`, `command
= reading.command`, `canSay: false`. **The `mark` a press echoes is the reply's own** (§Revision R19 c):
`hashScreen(JSON.stringify([choiceMarkOf(choice, rows.question ?? ''), reading.command ?? '']))`, so for Codex it also
covers the `$` line the phone draws (two approvals whose options name the same prefix share a choice mark and differ only
there); for Claude, whose command is the hook's and is bound by the question id, it is the choice mark under one more
hash. For a `running` or `idle` row, the message offer: `canSay` is true exactly when the foreground is the agent, the
native reading is `idle` (never `working`, §Revision R15), and `promptIsEmpty` answers true; the press fields are null and
empty. Nothing in the reader logs.

The binding costs a press nothing it should have: the phone reads after a push alert, which fires on a confirmed
`needs_input` (two ticks, `DIALOG_CONFIRM_TICKS`), by when the map holds the tick's question and choice. In the window
between a hook and the next tick the phone draws the options unpressable for one read, which is the side that does
nothing, and `probe:p318`'s press arms poll `/v1/session` (bounded, 5 s) until the offer is pressable before they press.

### 5.5 The text rules — NEW `src/main/reply/text-rules.ts` (pure)

```ts
export const REPLY_TEXT_MAX_BYTES = 4_096;
export function textRefusal(text: string): null | 'empty' | 'long' | 'character';
```

In this order, by code unit: a length of 0 is `empty`; a high surrogate not followed by a low one, or a low one not
preceded by a high one, is `character`; U+0000 to U+001F except U+000A, U+007F, and U+0080 to U+009F are `character`
(TAB and CR included); then `Buffer.byteLength(text, 'utf8') > 4,096` is `long`. Nothing is stripped, trimmed or
normalized, ever: a message is exactly his bytes. `/` and `!` pass (his ruling 3). U+2028, skin tones, a ZWJ family,
a flag and a decomposed `é` pass (research 135 §3.7: delivered exact on both builds).

### 5.6 The writer — NEW `src/main/reply/writer.ts`, the one module outside the door that types

```ts
export interface ReplyCore {
  listSessions(): readonly Session[];
  tmuxIdOf(sessionId: string): string | null;          // NEW public read on core: liveIds.get(id) ?? null
  readonly manifest: { getSession(id: string): Pick<ManifestSessionRecord, 'status'> | undefined };
  /**
   * The core's own control client (`core.control`, public at `core.ts:708`), structurally. The press's two lines go
   * here while it is connected (D8); `TmuxControlClient` satisfies it as it stands.
   */
  readonly control: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> };
  readonly activity: {
    noteUserInput(sessionId: string): void;
    nativeReadingOf(sessionId: string, agent: string, cwd: string, pane: PaneFacts, proc: ProcSnapshot | null):
      ActivityVerdict | null;
  };
}
export interface ReplyDeps {
  core(): ReplyCore | null;
  turns: QuestionIds;
  /** Production: execTmux. Tests and measure:p318 inject a runner on a scratch socket. */
  run?: (args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }) => Promise<string>;
  readProc?: () => Promise<ProcSnapshot | null>;
  readCommand?: (pid: number) => Promise<string | null>;
  sleep?: (ms: number) => Promise<void>;
  /** measure:p318 only: called in the final check's statement list, immediately before the spawn. */
  onLastCheck?: (sessionId: string) => void;
}
export function createReplyVerbs(deps: ReplyDeps):
  Pick<PocketWrites, 'choose' | 'say'> & { offer(session: Session, drawn: PocketReplyDrawn): Promise<PocketReplyOffer> };
export const REPLY_READ_BACK_MS = 300;
```

`capabilities.ts` builds it once: `createReplyVerbs({ core: () => pocketCore, turns: replyTurns })`, hands `{ choose,
say }` to `createPocketWrites` and `offer` to `createPocketFacts` as `replyOffer` (`(session, drawn) =>
reply.offer(session, drawn)`). `pocketCore` is the `GmuxCore`, whose `control` is the one control client; `ReplyCore`
names it structurally, so no new export is needed.

**Errors are told apart by code alone** (`isGmuxError`); no `.message` of a caught value is read anywhere in
`src/main/reply`, because a failed tmux command's text holds its argv (research 135 §4.8). **Nothing in
`src/main/reply` logs**: the one log line per write is `writes.ts`'s.

#### 5.6.1 `choose(input, still)`, in this order

1. `replyGate(row, 'press', tmuxId)` over `core.listSessions()` and `core.tmuxIdOf(id)`; a refusal answers with its
   reason (`gone` reads `SESSION_NOT_FOUND` when the manifest holds no record, `LIFECYCLE_SESSION_CHANGED` when it does;
   `unpressable` reads `REPLY_ANSWER_IN_SESSION`; `changed` reads `LIFECYCLE_SESSION_CHANGED`).
2. `turns.current(id).id !== input.question` → `changed`, nothing read.
3. The fresh reading (§5.4.2), awaited.
4. **The final check, synchronous, with nothing awaited from here to the act**: `still()` (false → `stopped`,
   `POCKET_WRITE_SENTENCES.stopped`); `turns.current(id).n !== 0` and `turns.current(id).id === input.question`;
   `core.tmuxIdOf(id) === T`, the `$`-id step 1 read and the reading used (§Revision R12); the row re-read from
   `core.listSessions()` still `needs_input` and on this Mac; the foreground is the agent; `readPress` non-null over
   this reading and the CURRENT `hookAsk` and `hookBash`; the reply's mark over this reading (§5.4.5) `=== input.mark`;
   `input.marker` among the reading's markers and in `pressableOf(reading)`. Any false → `changed`,
   `LIFECYCLE_SESSION_CHANGED`, nothing typed.
5. In the same statement list: `const at = turns.bump(id, 'phone')` taken as `turns.current(id)` right after the bump
   (its `n` and `hooks` are the press's own, kept for step 7), `deps.onLastCheck?.(id)`, then the act, started in the
   very next statement (D8, §Revision R7), aimed at `P`, the `%`-pane the reading read and captured (§Revision R19 b;
   `T` is still the session the final check holds): when `core.control.connected`, BOTH lines written in that one
   statement, `Promise.allSettled([control.sendCommand(line(['copy-mode', '-q', '-t', P])),
   control.sendCommand(line(['send-keys', '-t', P, '-l', '--', input.marker]))])`, where `line(args)` is
   `args.map(quoteTmuxArg).join(' ')` (`src/main/tmux`'s own quoting, the one `runScrollCommand` uses,
   `core.ts:2581-2589`; one command per call, because a `;` list over the control client desyncs its queue,
   `core.ts:2577-2580`); otherwise the one spawned list
   `run(['copy-mode', '-q', '-t', P, ';', 'send-keys', '-t', P, '-l', '--', input.marker])`. Never an Enter, in either
   form or any other call.
6. **The act's outcome is the `send-keys` line's** (§Revision R19 a): it rejected → `failed`, `REPLY_FAILED`; it
   resolved → on to the read-back, whatever the `copy-mode` line answered (as first written, `Promise.all` read a
   refused `copy-mode` as "could not type" while the digit had been written and may have landed). The spawned list
   rejecting → `failed`, `REPLY_FAILED`. (A control client that drops after writing is the one case where this sentence
   may be false; it is stated in §13 rather than guessed at.)
7. The read-back, at `REPLY_READ_BACK_MS` after the act started: a fresh plain capture, then `now = turns.current(id)`.
   **Answered** (§Revision R3) when the rows are not at a choice, or their mark differs, or the normalized window differs
   from step 3's, or `now.hooks > at.hooks` (the agent's own hook, such as Claude's `PostToolUse`, since the press). A
   desk keystroke, a focus report or a phone bump alone is NOT an answer. **Not taken** when none of those: `failed`,
   `REPLY_NOT_TAKEN`. A capture that fails: `failed`, `REPLY_TYPED_UNREAD`. Never a retry.
8. Answered: `core.activity.noteUserInput(id)` when `later.hooks === at.hooks && !rows.atChoice` (no hook since the
   press, and no choice on the read-back screen), then `done`. **As the fix round of 2026-10-04 amended it**: this step
   first read "ONLY when `now.n === at.n`", on the reasoning that whatever moved the id had already spoken for the
   status. A tick does not: a session at `needs_input` is captured on every tick, and after a decline both real agents
   go from their question straight to idle with no hook (Claude Code 2.1.287's registry, Codex 0.160.0's title), so the
   tick that lands inside the 300 ms read-back answers `choice-gone` and moves the id while `commitVerdict` refuses
   `needs_input` to `idle`. The release was skipped and nothing on the phone could clear it. A hook still spoke for
   itself (`noteHookEvent`), a desk keystroke the desk's own `activity:noteInput` (`src/main/ipc.ts:187-188`), and a
   choice still drawn is a question the tick speaks for. The ONE call of `noteUserInput` in
   `src/main/reply` is this one. (As first written, the release ran whenever the press read as answered: after Claude
   approved command A, ran it, and asked command B, B's `PermissionRequest` had already committed `needs_input` when the
   read-back released it, `monitor.ts:516-522` committing `working` for whatever the session was waiting on.)

#### 5.6.2 `say(input, still)`, in this order

1. `textRefusal(input.text)` → `empty` (`REPLY_TEXT_EMPTY`), `long` (`REPLY_TEXT_LONG`) or `character`
   (`REPLY_TEXT_CHARACTER`).
2. `replyGate(row, 'say', tmuxId)`; `gone` as for a press; `unsayable` reads `REPLY_NOT_READY`.
3. `n0 = turns.current(id).n`.
4. The buffer, BEFORE the reading (D10): `name = 'tortie-say-' + writeId` where `writeId` is a fresh 32-hex id minted
   here (`randomBytes(16)`; the phone's write id never names a tmux object), and `run(['load-buffer', '-b', name, '-'],
   { stdin: Buffer.from(input.text, 'utf8') })`. From here a `try … finally` holds `delete-buffer -b <name>` for every
   path on which the paste list did not run or failed.
5. The fresh reading (§5.4.2, styled), awaited, its capture last.
6. **The final check, synchronous**: `still()` (→ `stopped`); `turns.current(id).n === n0` (no desk keystroke, hook,
   choice move or status change since step 3: a draft typed at the Mac during the reading refuses); `core.tmuxIdOf(id)
   === T`; the row still listed, on this Mac, `running` or `idle`; the foreground the agent; the native reading `idle`
   (never `working`, §Revision R15); `promptIsEmpty(agent, styled, cursor)`. Any false → `unsayable`,
   `REPLY_NOT_READY`, nothing pasted.
7. `turns.bump(id, 'phone')`, `deps.onLastCheck?.(id)`, then in the very next statement the paste list, aimed at the
   pane `P` the reading captured (§Revision R19 b):
   `run(['copy-mode', '-q', '-t', P, ';', 'paste-buffer', '-p', '-d', '-b', name, '-t', P, ';', 'send-keys', '-t', P,
   'Enter'])`.
8. tmux answers → `done`. A rejection → `failed`, `REPLY_FAILED`. No `noteUserInput` (D17).

**No argv element and no error message ever holds the words** (Y4): the text reaches exactly one place, the `stdin` of
`load-buffer`. `paste-buffer -p` brackets the paste because Claude Code and Codex ask for bracketed paste (research 135
§3.3); the gate's agent check is what keeps the message away from a program that does not.

#### 5.6.3 `ExecTmuxOptions.stdin` — `src/main/machines/exec-plane.ts`

`ExecTmuxOptions` gains `stdin?: Buffer`. In `spawnTmux`, before `tmuxCommand` composes anything: `if (options.stdin !==
undefined && ctx.kind === 'remote') throw gmuxError('INVALID_INPUT', 'Tortie types only into sessions on this Mac.',
'refused stdin for a remote context')`. For a local context, `running.child.stdin?.end(options.stdin)` right after the
spawn. With no `stdin`, nothing about the spawn changes for any other caller. The two `execFileP` call sites `conformance:machines` counts stay two.

#### 5.6.4 The core's three edits and the monitor's three — `src/main/sessions/core.ts`, `src/main/activity/monitor.ts`

- core: the hook bump (§5.3 item 1), `onInput` and `onChoiceMoved` wired (items 2, 3), the `'status'` bump in the
  `onStatus` wiring (item 5, §Revision R16), and `tmuxIdOf(sessionId: string): string | null` beside `activityOf`
  (`:979`), one line.
- attach host: `onInput?(sessionId)` on `AttachHostOptions`, called after `client.pty.write(data)` for a local client
  when `!isPaneReport(data)` (§Revision R14). `src/shared/pane-report.ts` holds the four predicates and their constants
  moved token for token; `src/renderer/terminal/keys/{pane,focus,color,device}-report.ts` each become a re-export of
  their own members (no renderer importer, test or `TerminalPane.tsx` line moves).
- monitor: `export function choiceMarkOf` (one keyword); the dep `onChoiceMoved?` and its one call at `:1098`;
  `nativeReadingOf(…)`, a read. `choiceUpdate`, `noteUserInput`, `noteHookEvent`, `readForegrounds` and the verdict do not
  move; `conformance:choices` and `conformance:handback` run unedited and must read what they read at the parent.

### 5.7 The phone — `ios/`

Builds on the snapshot. Every drawn word is `Copy.swift`'s or the door's. No `print(`, no log, no new colour, no
`LocalAuthentication`.

#### 5.7.1 The client — `Door/DoorClient.swift`, `Door/Contract.swift`

- `WriteRoute` gains `.choose(session:question:mark:marker:)` and `.say(session:text:)`, targets `/v1/choose` and
  `/v1/say`, verbs `.choose` and `.say`. NEW `ChooseBody { mark, marker, question, session, write }` and
  `SayBody { session, text, write }`, encoded in `signedPost` alone with `.sortedKeys` (Swift escapes `/`; the Mac parses
  JSON, and the cap holds it). `DoorClient.choose(…)` and `say(…)` each call `signedPost` once. Nothing retries.
- **`say(_:text:write:door:)` takes `write: String?`** (§Revision R13): nil mints a fresh id through `WriteId.fresh()`
  as today; a non-nil id (only ever one this app minted for an earlier say whose answer did not come, handed back by
  `ReplyModel`) is used as it is, after `WriteId.isWellFormed`. `signedPost` gains the one optional parameter; `end`
  and `choose` always pass nil. `WriteResult` and its classification do not change: a reused id's recorded answer
  echoes that id, so `WriteResult.of` reads it as an answer. 317's comment "one per call, never kept" becomes "one per
  call, kept only by a say whose answer did not come".
- `PocketWriteAnswer.Verb` gains `choose`, `say`; `Reason` gains `changed`, `unpressable`, `unsayable`, `stopped`,
  `empty`, `long`, `character`. An unknown word still makes the answer unreadable (`.noAnswer`).
- NEW `PocketReplyOffer` decoded from `reply` (absent: the empty offer). An offer whose `pressable` is non-empty while
  `question` or `mark` is null, or whose `question` is non-null while `pressable` is empty, reads as the empty offer.

#### 5.7.2 The seams — `Screens/DoorWords.swift`, `App/TortieApp.swift`

- `DoorWriting` gains `choose(_ sessionId: String, question: String, mark: String, marker: String) async ->
  WriteResult` and `say(_ sessionId: String, text: String, write: String?) async -> WriteResult`; `PairedReader`
  implements both through the client.
- `DoorWords.replySentence(for: WriteResult) -> String`, non-optional and never empty: an answered non-`done` answer's
  sentence; `.notTaken` and a withheld `.notSent` → `Copy.replyNotTaken`; `.noAnswer` → `Copy.endNoAnswer` (its words
  are true of any write); any other `.notSent` → `sentence(for:)`.
- NEW `protocol ReplyRunnerRegistry: AnyObject { func registerReply(_:); func releaseReply(_:) }`, adopted by
  `AppModel`, which keeps `liveReplies: [ReplyRunner]`; `wentAway()` also calls `stop()` on every live reply runner.
  317's `EndRunnerRegistry` and `liveRunners` do not move.

#### 5.7.3 The model — NEW `Screens/Reply.swift`

- `ReplyRunner` (one write): its `verb` fixed at the press, `stop()` cancels its task, `run()` makes ONE awaited write
  through the writer and is the app's ONLY call of the writer's `choose` and `say`.
- `ReplyModel` (one per Session screen, built by `SessionRoute` from `reader.writer`; nil draws no button and no box):
  `text` (the box, in memory only), `phase` (`idle`, `pressing(marker)`, `sending`), `pressLine` and `sayLine` (never
  empty strings). `press(marker, offer, reread)` and `send(reread)` each: do nothing unless `idle` (and, for send,
  `text` non-empty); make a `ReplyRunner`, register it, then start its task. **No owner check is named** (his ruling 1;
  rule (af)).
- After a write: `done` → the press reads again and draws nothing (the session reads again and no longer waits); a
  message clears the box and `sayLine` reads `Copy.replySent`. Any other result → the line reads
  `DoorWords.replySentence(for:)`, the text stays in the box, and the screen reads again; after `.noAnswer` the line
  reads `endNoAnswer` only when that read succeeded, else the read's own consequence (317 §5.8.3's rule).
- **THE KEPT SAY** (§Revision R13, D24): `ReplyModel` holds at most one `KeptSay { session, bytes: [UInt8], write,
  at }`, in memory. It is SET after a say answered `.noAnswer`, or `.answered` with outcome `busy` when that say carried
  a kept id (the first may still be acting); it is CLEARED on any other answer to a say, on any edit of the box that
  changes its UTF-8 bytes, and when 60 s have passed since `at` (read at Send, never by a timer). `send(reread)` passes
  `kept.write` exactly when `kept.session == sessionId`, `Array(text.utf8) == kept.bytes` and less than 60 s have
  passed; otherwise nil. Swift's `String ==` is NOT the comparison (it answers true for `é` and `e` + U+0301, which are
  different bytes the Mac would type differently). 60 s keeps the re-send inside the Mac ledger's life (twice the
  signature clock, `POCKET_WRITE_LEDGER_MS`, counted from when the Mac RECORDED the first, which is after it was sent).
  Leaving the screen forgets it with the box, and a Mac that restarted forgets its ledger: both are §13's.

#### 5.7.4 The Session screen — `Screens/SessionScreen.swift`, NEW `Screens/MessageStrip.swift`

- `choices`: an option whose marker is in `reply.pressable` is a `Button` (the chip and the text in the accent, the
  same 54-tall card, `ID.sessionChoicePress(n)`), and every other option is drawn exactly as today. `Copy.answerInTheSession`
  is drawn above the options only when at least one is not pressable. While a press runs every option is off and the
  pressed one draws a progress mark. `pressLine` sits under the options (`ID.sessionReplyLine`).
- The card draws `reply.command` as one more line under the question when it is non-null (`ID.sessionCommand`), the
  agent's words verbatim, with NO line limit (`lines: nil`), as the question already is (`SessionScreen.swift:264`);
  every option's text keeps its `lines: nil` (`:387`). "Says what will run" is the PHONE's promise too: a command or
  an option cut on the screen would let a person approve what they could not read (§Revision R19 d).
- **The message strip** (`MessageStrip`), drawn only when `reply.canSay` is true: `MessageField` (a `UIViewRepresentable`
  over `UITextView` with `smartQuotesType`, `smartDashesType` and `smartInsertDeleteType` `.no`, growing to five lines,
  the placeholder `Copy.messagePlaceholder` drawn over it when empty, accessibility label the same words), a Send
  button (the arrow image, accessibility label `Copy.send`, enabled exactly when `text` is non-empty and no write runs),
  and one line under them: `sayLine`, else `Copy.sending` while sending, else `Copy.oneMessage`.
- Both sit in the bottom `.safeAreaInset` in one `VStack`: the strip, then 317's `EndBar`, so the strip docks above the
  End bar and both above the tab bar. **While the field is focused the End bar is not drawn**, so nothing destructive
  sits beside the keyboard.
- The header comment says pressing an option and sending a message are here, and that neither asks Face ID.

#### 5.7.5 The words — `Style/Copy.swift`, `/// Phone:` each with its reason

`send = "Send"`, `messagePlaceholder = "Message this session"`, `oneMessage = "Goes to this session as one message."`,
`sending = "Sending…"`, `replySent = "Sent"`, `replyNotTaken = "Your Mac did not take it. Nothing was sent."`.
`CopyTests.swift` drops the first four from its refused list and keeps the rest.

#### 5.7.6 Identifiers, plist, build

`Identifiers.swift` gains `sessionChoicePress(n)`, `sessionReplyLine`, `sessionCommand`, `sessionMessageStrip`,
`sessionMessageField`, `sessionMessageSend`, `sessionMessageLine`. `Info.plist` does not move (Face ID's purpose string
still says End, which is true). `project.pbxproj`: `CURRENT_PROJECT_VERSION = 6` in all six configurations (D30).

### 5.8 What does not change

`killSession`, End and End these; the manifest and its schema; the tmux layer beyond the one `stdin` option; every status
rule (refusal 5: no route and no verb sets a status; `noteUserInput` after a read-back that shows the question answered
is the desk's funnel, and nothing else in `src/main/reply` names a status setter); `menu.ts`; the IPC contract and its
baseline (`gate:contract` byte for byte); `/v1/blocked`, `/v1/turns` and every list answer; the signature, the nonce
memory and the clock; the QR; Funnel; the door process's import wall (W2); the push and the alerts; Phase 89's typing
door, `sendArmedResumeText`, `ARMED_RESUME_GUARD` and the remote arm's rule 1; the numbered verdict and
`conformance:choices`; Face ID on End.

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own against a green base, restored by sha256 in
a `finally`; an arm whose anchor text is absent FAILS by name.

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`) and `ablation:p313`

- **R2 widened**: the write ids are EXACTLY `end`, `choose`, `say`, each `POST`, signed, outside any window, with a cap.
- **R4**: re-pinned with `--write-route-pin` to `0e8c9f46…` (D29); the comment names both values.
- **R3**: `FORBIDDEN` gains `main/reply/` and `../reply/` (the door names nothing of the writer); every other word stands.
- **X1 to X12 widened**: X1's order and "never 404 after the act" over all three verbs; X2's strict parse over the three
  key sets; X3's ledger key with the verb; X4 across verbs; X5 `PocketWrites` exactly `end`, `choose`, `say`, implemented
  once in `pocket-writes.ts`; X6 the answer's five fields, and every sentence a named constant from
  `lifecycle-words.ts`, `src/shared/reply-copy.ts` or `POCKET_WRITE_SENTENCES`; X11 one log line per write; X12
  `WRITE_CLAUSES` keyed by the closed list, the joined line, and `POCKET_DOOR_HONESTY` naming the three.
- **NEW Y1 to Y18, over `src/main/reply/**` (and, for Y17, `src/main/attach/attach-host.ts` and `src/shared/pane-report.ts`) with the TypeScript parser:**

| Rule | Holds |
| --- | --- |
| Y1 | The caps: `end` 512, `choose` 512, `say` 32,768, keyed by the closed list (§Revision R18) |
| Y2 | `writes.ts` hands `still` to `choose` and `say`, built from the same three asks as its own last check; `say`'s `text` reaches only `writes.say(` |
| Y3 | `writer.ts`'s only tmux argv are, element for element: the press's two control lines and its spawned list, `load-buffer -b <name> -`, the paste list, `delete-buffer -b <name>`, and the reader's `list-panes … -F PANE_FORMAT`, `display-message -p -t <pane> '#{cursor_x}\t#{cursor_y}'` and `capture-pane -p [-e] -t <pane>`; the press and the paste aim at the reading's pane (§Revision R19 b); `-l` only before `--` and the marker; no `Enter` in the press list; no `send-keys` without `-t`; no `send-keys -l` anywhere but the press |
| Y4 | No argv element in `src/main/reply` is derived from the text; the text's one sink is `stdin:`; the buffer name derives from a writer-minted id; `delete-buffer` sits in a `finally` |
| Y5 | In `choose` and `say`, the final check's statements, then `bump(`, then `onLastCheck?.(`, then the act (the press's `Promise.allSettled([` of its two control lines, or its spawned list; the say's paste list), with no `await` between the first `still(` of the final check and the act; in the reader, the `capture-pane` call is the last awaited read before the final check (§Revision R15) |
| Y6 | `noteUserInput(` is called once in `src/main/reply`, in `choose`, on the answered branch after the read-back; no other status setter (`noteHookEvent`, `applyDetectedStatus`, `setStatus`, `onStatus`, `commit(`) is named there |
| Y7 | `press-shapes.ts`, `input-row.ts`, `text-rules.ts`, `gate.ts`, `hook-says.ts` and `question-id.ts` import no configuration, settings, overlay or agent-registry module, no `node:fs`, no `child_process` and no tmux module; the shape tables are `Object.freeze`d literals |
| Y8 | Nothing in `src/main/reply` reads `.message` of a caught value; errors by `isGmuxError(` alone |
| Y9 | No log call anywhere in `src/main/reply` |
| Y10 | `replyGate`'s remote and agent arm precedes every `run(` call in the verbs; `spawnTmux` refuses `stdin` for `ctx.kind === 'remote'` before `tmuxCommand(` |
| Y11 | No file under `src/main/pocket` imports `src/main/reply` (and the import wall says the same, §6.5) |
| Y12 | G1's scope: `src/main/pocket/**`, `pocket-writes.ts` and `src/main/reply/**` |
| Y13 | `replyTurns`' `hook(` and `bump(` are called from exactly: core's hook `onEvent` and `onSessionEnd`, core's `onInput`, `onChoiceMoved` and `onStatus` wiring (the last guarded by `!== 'needs_input'`, §Revision R16), and `writer.ts` twice; the prefix is `randomBytes(8)` once; the id is composed as a string |
| Y14 | `reader.ts` calls `detectDialogRows(` and `choiceMarkOf(`, and none of `detectDialog(`, `detectShapes(`, `noteForeground(`, `foregroundToRead(`, `agentHoldsTerminal(`; `routes.ts` composes `reply` field by field with a fresh `pressable` array |
| Y15 | `text-rules.ts` and `writer.ts` call no `.replace(`, `.trim`, `.normalize(` or `.slice(` on the text; `REPLY_TEXT_MAX_BYTES` declared once |
| Y16 | `PocketFacts.replyOffer` is optional; `PocketSessionDetail.reply` is optional; `POCKET_NO_REPLY` is frozen |
| Y17 | `attach-host.ts` calls `onInput?.(` exactly once, inside the input listener, after `client.pty.write(`, in an `if` that reads `req.machine === undefined` and `!isPaneReport(` of the same `data`; `isPaneReport`, `isFocusReport`, `isColorReport` and `isDeviceReport` are declared once each, in `src/shared/pane-report.ts`, and the four renderer files declare none of them (re-exports only) (§Revision R14) |
| Y18 | The say's gate reads the native reading's state as `idle` and nothing else (no `working` literal in `gate.ts`, `reader.ts` or `writer.ts`'s say path); the offer's `canSay` the same (§Revision R15) |

`ablation:p313` gains one arm per Y clause and per widened clause (about 30), each red on the rule that owns it.

### 6.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

In-process, the shipping write path over a recording fake `PocketWrites` (the fake's `choose` and `say` record their
inputs and ask `still()`). Each arm asserted on its reason or outcome and on the recorder: an honest `choose` and `say`
(done, one call each); the same bytes again (404 `replay`); the same write id with a fresh nonce (the recorded body,
one call); the same write id under another verb (a separate entry: the ledger keys on the verb); an `end` and a `say`
on one session at once (`busy`); each body with a fifth or missing key, a `question` of 15 hex, a leading-zero counter,
a `mark` of 11 or 13 hex or upper case, a `marker` of `0`, `10` or `a`, a non-string `text` (each `refused malformed`,
the write id echoed when well formed); a `say` body over 32,768 bytes (404 `oversized`, never forwarded; §Revision R18); a query on
`/v1/say` (404 `route`); a `GET` signature on a `POST` (404 `signature`); over another phone's connection (404
`channel`); the phone removed before the act (404, no call) and during it (the fake's `still()` reads false and it
answers `refused stopped`, 200, acted, never 404); the door stopping during a `say` (200, not replaced); main's answer
later than the bound (the connection cut, `writesCut` 1).

### 6.3 `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, `test:ios`, the vectors

- **(ab) widened**: `signedPost` called by `end`, `choose` and `say` alone; its bodies `EndBody`, `ChooseBody`, `SayBody`
  with exactly their keys; `WriteId.fresh` the one source of a write id.
- **NEW (ae) THE REPLY WRITES.** The writer's `choose(` and `say(` each called ONCE in the app, in `ReplyRunner.run`;
  no `while`, `repeat` or retry around either; nothing in `Reply.swift`, `MessageStrip.swift` or the write path trims,
  normalizes or replaces the message text (`trimmingCharacters`, `precomposed`, `decomposed`, `replacingOccurrences`,
  `filter(` on it); `MessageField` sets the three smart types `.no`; Send's `.disabled(` reads the empty text and the
  running phase; the `Words(` that draws `reply.command`, and `OptionRow`'s text, pass `lines: nil` (§Revision R19 d).
- **NEW (af) NO OWNER CHECK ON A REPLY.** `Reply.swift`, `MessageStrip.swift` and the choice press in
  `SessionScreen.swift` name no `OwnerCheck`, `LAContext`, `evaluatePolicy` or `confirm(`; `OWNER_CHECK_ABSENT` gains
  the two new files (his ruling, "Only for End").
- **NEW (ag) A REPLY IS SENT ONCE OR NOT AT ALL.** Every `ReplyRunner(` made at the press and registered before its
  task starts; `AppModel.wentAway()` stops every registered reply runner; nothing persists a message or a write
  (`PERSISTS` over the two new files); a press or a send while one runs does nothing. **The one kept id** (§Revision
  R13): a write id passed to `DoorClient.say` is either nil or `KeptSay.write`; `KeptSay` is assigned only from a say's
  own `WriteResult` (`.noAnswer`, or `busy` on a kept id), compared with `Array(…utf8)` and never `String ==`, and
  bounded by a 60 s constant declared once; `choose(` and `end(` never pass an id; `WriteId.fresh()` stays the one
  source of a NEW id.
- **(t) widened**: every signed request presents the identity, the two new writes included; the hostile door's reply
  arms named. **(v) widened**: `replySentence(for:)` is non-optional and never empty. **(s)**: build 6. **(b)**:
  `VISIBLE_CALLS` unchanged; every new word is `Copy`'s or the door's. **(l)** stands whole.
- `ablation:p316` gains one arm per new or widened clause (about 14).
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): the four owed 318 rows leave and become owned by
  `ios/Tortie/Style/Copy.swift`; `Sent` and the not-taken sentence are judged; NEW `Answer.html`'s words are judged (the
  options are data, the agent's own); the floors rise to the counts the run matches, said in the report; two self-test
  mutations: `Send` renamed in the mock must go red, and `REPLY_ANSWER_IN_SESSION` changed by one letter must go red
  against `CHOICE_NOT_PRESSABLE`.
- **`test:ios`** (`build/p316/test-ios.mjs`): its Node door gains `POST /v1/choose` and `/v1/say`, verifying the
  signature over method, path and body with `node-phone.mjs`'s `verifySigned` and answering a fixed write answer that
  echoes the id, with 317's two hold modes. NEW `P318ReplyTransportTests` drive the SHIPPING `DoorClient`: a door that
  holds the raw socket for 2 s before the handshake, the task cancelled at 0.5 s, counts ZERO requests and reads
  `.notSent(.cancelled)`; a door that holds its answer, the task cancelled after the request arrived, answers.
- **The vectors** (`build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`): two more request vectors, a
  `choose` and a `say` whose text holds `/`, `"`, LF and an emoji, each body written as Swift writes it (sorted keys,
  `\/`), each accepted by the shipping verifier over the phone's channel, and one with a body byte changed refused
  `signature`. `DoorVectorTests` checks the Swift encoder and signer reproduce both byte for byte.

### 6.4 `conformance:choices`, `conformance:handback`, `conformance:machines`

Not edited. Each runs and must read what it read at `c1a5fd38`: the verdict line, `choiceUpdate`'s single
`detectDialogRows` call, `noteForeground` and `foregroundToRead` at their one call site, the caps at one definition (no
`CHOICE_*` cap is named in `src/main/reply`), `HandbackState`'s home, and the exec plane's two `execFileP` sites.

### 6.5 The other gates

- **`build/assert-import-boundaries.mjs`**: the `main/pocket/` wall's `forbidden` gains `main/reply/`, its `why` gaining
  one sentence (and losing "every route in it is a read", false since 317).
- **`gate:electron`**: `HELPER_USER_FLOOR` 162 → 163 for `build/p318/probe-p318.mjs`, in the same commit.
- **`gate:simulator`**: no new script reaches the helper; `SIMULATOR_USER_FLOOR` stays 2.
- **`gate:background`**, **`gate:checks`**: `probe:p318` and `measure:p318` classified in
  `build/verification-checks.mjs`; every stand-in, tmux server and node phone they start is killed in a `finally` that
  names it; `measure:p318` spawns the pinned tsx only.
- **`gate:contract`**: unchanged, byte for byte (`node build/contract-inventory.mjs --check`): no channel, no `GMUX_*`
  name, no manifest column.
- **`conformance:push`** stays green: the push seam's host has no writes, and its facts no `replyOffer`.
- **CLAUDE.md** (the integrator): the pocket row names the two write rows, Y1 to Y18 and `src/main/reply/**`; a NEW
  path-triggered row for `src/main/reply/**`, `src/main/attach/attach-host.ts`'s `onInput`, `src/shared/reply-copy.ts`
  and `ExecTmuxOptions.stdin` (`conformance:pocket`, `conformance:pocket:hostile`, `conformance:machines`); the ios row
  names (ae), (af), (ag) and build 6; the probes table gains `probe:p318` and `measure:p318`, and `probe:p316`'s row one
  sentence for its `reply` group, each one line in the house style.

---

## 7. The proof, run rather than read

### 7.1 The battery

`typecheck`, `build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`, `gate:background`,
`gate:checks`, `gate:knownhosts`), `test`, `smoke:t1`, `smoke`, `smoke:t3`, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run
package`; `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`, `conformance:choices`,
`conformance:handback`, `conformance:machines`, `conformance:phonecopy`, `conformance:push`, `ablation:p316`,
`node build/p316/vectors.mjs --check`; `test:ios` in Debug and Release on iOS 26.3 and 18.3 (verifiers, under the
lock); `probe:p311` once (the hook path in `core.ts` and the monitor's `uiUpdate` are touched); `probe:p292` once
(verifiers, under the lock: `src/renderer/terminal/keys/pane-report.ts` and its three kinds become re-exports of
`src/shared/pane-report.ts`, §Revision R14, and its trigger row names that file). `git diff c1a5fd38 --
src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity/state-machine.ts src/main/activity/screen.ts
src/renderer/choice.ts` is empty.

### 7.2 Vitest (the builders')

- `src/main/reply/__tests__/question-id.test.ts`: two instances never share an id; the id's shape; every cause, `status`
  included; the hook ask kept through exactly one `choice-appeared` and cleared by every other bump; `n` never reused.
  The core wiring: a committed status that is not `needs_input` bumps once, a `needs_input` commit bumps nothing
  (§Revision R16).
- `press-shapes.test.ts`, over `build/fixtures/reply/` (§7.3): every fixture's `PressReading` or null, exactly; a hook
  ask that is a tool name alone, one 199 characters long, and one holding `[REDACTED:` each leave only `No` pressable;
  his ruling 2 (Claude 2 and 3, Codex 2 pressable when `runs` is said); a Codex command that wraps reads null. Over the
  real captures (§Revision R20, R21): on every real approval `runs` is null or equals `real-captures.json`'s
  `truth.command`; `codex-approval-0.160.0.txt` and `codex-approval-no-reason-0.160.0.txt` say their command; the
  blank-line, hidden-line and spoofed-question approvals read `runs` null (the first two keep the shape, so No is a
  button; the spoofed one reads no shape); the long, tall and hidden-line-with-reason approvals keep the shape with
  `runs` null although `rows.question` is null; the four real Claude bodies give `hookBash` `whole` for the one-line
  command alone; a command or hook command holding one of R27's characters, built from a code point at run time,
  reads not said.
- `input-row.test.ts`: every input-row fixture; no row and two rows read not empty; a Claude row whose inverse cell sits
  after a dim run reads not empty; a Codex row whose cursor is not at the first column after `› `, or is null, reads
  not empty (§Revision R17). Over the real captures, against `real-captures.json`'s `truth.typed`: empty exactly when
  nothing was typed, the focused and the blurred (no caret) Claude rows and the after-decline rows of both agents
  included; every draft, stray `1`, three-line paste and long-paste token reads not empty, the Codex ones with the
  cursor read from the manifest (§Revision R23, R24).
- `text-rules.test.ts`: every C0 but LF, DEL, C1, ESC, both lone-surrogate orders refused; 4,096 bytes with a multibyte
  character on the boundary passes and 4,097 is `long`; `/`, `!`, U+2028, an emoji, a ZWJ family and a decomposed `é`
  pass unchanged; the empty string is `empty`.
- `reader.test.ts` and `writer.test.ts`, over a fake core, a recording `run` and a fake process table: the exact argv;
  the text in `stdin` alone; `delete-buffer` on every failure path; each final-check refusal spawns nothing after the
  check; `bump` before the spawn; the capture is the last read before the final check and the act aims at its pane
  (§Revision R15, R19 b); a refused `copy-mode` line beside a resolved `send-keys` line goes on to the read-back
  (§Revision R19 a); two Codex approvals with one choice mark and different `$` lines give two reply marks (§Revision
  R19 c); a `say` while the native reading is `working` is refused `unsayable` and spawns nothing after the check; `still()` false → `stopped` and no spawn; the read-back's three verdicts;
  `noteUserInput` on answered alone; an error whose `.message` is a canary never reaches an outcome; an id that moves
  during the reader's capture serves an empty offer.
- `src/main/pocket/__tests__/writes.test.ts` widened: the two parses, the verb in the key, one in flight across verbs,
  `still` handed in, the one log line holding no canary text. `p318-body-caps.test.ts` (§5.1.3). `routes.test.ts`: the
  `reply` field composed field by field, absent and rejecting `replyOffer` read the empty offer, `pocketWriteRouteIds()`
  exactly three. `pairing.test.ts`: the joined line and the moved hash.
- `src/shared/__tests__/p318-reply-copy.test.ts`: `REPLY_ANSWER_IN_SESSION` equals `CHOICE_NOT_PRESSABLE` read as text
  from `src/renderer/choice.ts`; no sentence holds `pane`, `window` or `prefix`.
- `src/main/attach/__tests__/attach-host.test.ts`: `onInput` once per write for a local client, in the same turn, never
  for a remote client, another sender or a cleaned client, and never for a chunk that is exactly a focus report, a
  colour report or a device-attributes answer, while a chunk that holds one AND a keystroke still calls it
  (§Revision R14). `src/shared/__tests__/p318-pane-report.test.ts`: the shared predicates answer what the renderer's
  three test files already assert, and each renderer file's export is the shared function (`===`).
- The monitor: `onChoiceMoved` with each kind exactly when `choiceUpdate` answers non-null; `nativeReadingOf` answers
  `nativeVerdict`'s value and writes nothing.
- The exec plane: `stdin` refused for a remote context before any spawn; written and ended for a local one.

### 7.3 The committed screens — NEW `build/fixtures/reply/`

**The REAL screens are committed** (the capture step, §Revision R20 to R27): captured on 2026-10-02 from the installed
Claude Code 2.1.287 and Codex 0.160.0, launched as Tortie launches them (Claude with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1`,
Codex with `CODEX_SCROLLBACK_ARGS`), under a scratch HOME with loopback API stand-ins and 0 model turns, on the vendored
tmux 3.7b under a copy of `resources/gmux-tmux.conf`, at 120x40. Each file's first line names its source. A `.txt` is
`capture-pane -p` with trailing whitespace trimmed per row (the repository's fixture convention; `normalizeCapture`
does the same). A `.ansi` is `capture-pane -p -e` with ESC, every other byte below 0x20 but LF, and each trailing space
of a row written `\xNN`, and a backslash written `\\`; the loader drops the first line and decodes with
`/\\(\\|x[0-9a-f]{2})/g`, so no raw control byte is committed (the writer proved every file decodes to the captured
bytes exactly). `real-captures.json` records, per file, the agent, version, binary sha256, launch, size, tmux's cursor
(`x`, `y`, `visible`), the pane title, Claude's registry status, what is on screen, and the TRUTH: the command the
agent was really asked to run (`truth.command`), or exactly what was typed into the prompt (`truth.typed`).
`claude-permission-requests-2.1.287.json` holds the four real `PermissionRequest` bodies, in the order of the
`claude-bash-*` screens.

- **Press shapes, real**: `claude-bash-2.1.287.txt` (a one-line command), `claude-bash-multiline-2.1.287.txt`,
  `claude-bash-long-2.1.287.txt`, `claude-bash-blank-line-2.1.287.txt`; `codex-approval-0.160.0.txt` (with the model's
  Reason row), `codex-approval-no-reason-0.160.0.txt`, `codex-approval-multiline-0.160.0.txt`,
  `codex-approval-long-0.160.0.txt` (its question row past `CHOICE_QUESTION_INK_ROWS`), `codex-approval-tall-0.160.0.txt`
  (folded into `[… N lines] ctrl+a view all`), `codex-approval-reason-newline-0.160.0.txt`,
  `codex-approval-hidden-line-reason-0.160.0.txt`, and the three HOSTILE approvals the first rule read wrongly (R20):
  `codex-approval-blank-line-0.160.0.txt`, `codex-approval-spoofed-question-0.160.0.txt`,
  `codex-approval-hidden-line-0.160.0.txt`. `claude-edit.txt` stays a copy of the REAL committed, older
  `claude-permission-prompt.txt` (Claude's Edit and Write prompts were not captured, D11). The planned reconstructions
  `claude-bash-2.1.285.txt` and `codex-approval-0.159.1.txt` are not made: the real ones replace them.
- **Not press shapes**: the committed `claude-trust-2-1-280.txt`, `claude-theme-picker.txt`, `claude-workspace-trust.txt`,
  `codex-signin-choice.txt`, and window `a-codex-0002` (the update prompt); RECONSTRUCTED, because no real capture of
  them was made: Claude's first-run Security notes (research 135 §2.2: two options, read as a choice), a non-agent "Do
  you want to proceed? 1. Yes 2. No" screen (research 135 §2.8), and a resized Claude Bash prompt (built from
  `claude-bash-2.1.287.txt` re-wrapped at a narrower width).
- **Input rows, real** (`.ansi`): `claude-prompt-empty-2.1.287.ansi` (focused, caret), `claude-prompt-empty-blurred-2.1.287.ansi`
  (after a focus-out report: no caret, still empty), `claude-prompt-draft-…`, `claude-prompt-draft-blurred-…`,
  `claude-prompt-stray-1-…`, `claude-prompt-pasted-…` (three rows inside the rules), `claude-prompt-pasted-long-…`
  (the token, default colour), `claude-prompt-after-decline-…`; `codex-prompt-empty-0.160.0.ansi` (placeholder dim,
  cursor 2,9), `codex-prompt-draft-…`, `codex-prompt-stray-1-…`, `codex-prompt-pasted-…`, `codex-prompt-pasted-long-…`
  (the token, `38;5;6`), `codex-prompt-after-decline-…`. RECONSTRUCTED, the one shape no real agent drew: a Claude draft
  drawn dim whose inverse caret follows it, and a Codex dim run with the cursor after it (the fail-closed arms of R17).

Every RECONSTRUCTED fixture says so on its first line.

### 7.4 The stand-in — NEW `build/p318/stand-in.mjs`

In the shape of `build/p321/stand-in.mjs`: not an agent, runs none, draws only committed screens, told through
`cmd-<pid>.json` in `P318_STANDIN_DIR`, ended on SIGHUP, SIGTERM, SIGINT, its directory removed, or a ceiling. The
probe's scratch login shell resolves `claude` and `codex` to `/bin/sh` wrappers that `exec -a <name>` it, and the probe
refuses to start if either name resolves anywhere else. It:

- puts its terminal in raw mode, asks for bracketed paste (`ESC[?2004h`), and **logs every byte it reads with a
  monotonic timestamp** (`process.hrtime.bigint()`) **and the serial of the screen drawn when it read it** to
  `reads-<pid>.jsonl`, so which question a byte answered is read from the log and never from the writer;
- draws a press shape; commits on a digit that is one of its markers; drops a digit read in the first 200 ms after it
  drew (Claude, research 135 §2.2); draws the next screen about 60 ms after a commit when told to;
- in Claude mode writes `$HOME/.claude/sessions/<pid>.json` (`idle`, `busy`, `waiting`), and POSTs `PermissionRequest`
  (about 20 ms before it draws), `PostToolUse`, `UserPromptSubmit` and `Stop` to the hook URL in the `--settings` file
  its own argv names, as Claude does;
- draws the committed REAL screens of §7.3, so its dialogs have the real layout (Claude's dashed command box under
  `Bash command`, Codex's `Environment:` and `Reason:` rows above the `$` row);
- in Codex mode sets its title by OSC 2 (`[ ! ] Action Required | <dir>` alternating with `[ . ] Action Required |
  <dir>`, as Codex 0.160.0 does, §Revision R24; a braille frame while working; `<dir>` idle);
- echoes a bracketed paste into its prompt row and "submits" it on the CR, logging `submitted`; in `working` mode
  queues it and submits at its turn's end, logging both;
- can hand its terminal to a foreground child (`/bin/cat` of a fixture) for the false-choice arm, ended by pid.

### 7.5 `measure:p318` — the shipping writer, outside Electron (`build/p318/measure-writer.mjs` → `drive-writer.mts`)

The pinned tsx runs the SHIPPING `src/main/reply/writer.ts` and `reader.ts` with an injected `run` bound to scratch
servers `-L p318-v-<pid>-37b` (the vendored tmux) and `-L p318-v-<pid>-36a` (Homebrew's 3.6a, when present; else that
row is UNREADABLE), each under a copy of `resources/gmux-tmux.conf`, killed and its socket unlinked in a `finally`, with
the stand-in in its panes and a fake core whose `nativeReadingOf` is the real `nativeVerdict` over the stand-in's
registry file and title. No Electron, no door.

| Arm | Holds |
| --- | --- |
| M1 | **Check-to-land**: at least 200 presses per tmux build, `onLastCheck` stamped with `process.hrtime.bigint()`, the stand-in's read of the byte on the same clock: p50, p99 and max printed; **p99 under 15 ms** on each build |
| M2 | The message frames, read from the stand-in's log: `hello phone`, `a\;b\\c\`, `-R ls -la;` LF `second line ; 👍🏽 é`, `/exit`, `!touch x`, `x;`, 4,096 bytes: each exactly `ESC[200~ <bytes, LF as CR> ESC[201~ CR`; `tmux list-buffers` empty after each |
| M3 | From copy mode: `#{pane_in_mode}` 1 before and 0 after, for a press and a message, the bytes as M2 |
| M4 | Each final-check refusal spawns nothing after the check (the recording `run` counts zero calls past the reads) |
| M5 | The read-back: answered; not taken (a press inside the stand-in's 200 ms drop); unread (the pane killed before the read-back) |
| M6 | **The say's window (§Revision R15)**: at least 200 messages per tmux build, the reader's last capture and `onLastCheck` stamped, the stand-in's read of the paste's first byte on the same clock: capture-to-land and check-to-land p50, p99 and max PRINTED (not graded). This is the window inside which a draft typed at the Mac, or a question an agent drew on its own, is not seen; idle-only (D14) is what keeps an agent from drawing one there |
| M7 | The press's outcome is the `send-keys` line's (§Revision R19 a): a scratch control transport that answers `%error` to `copy-mode` and `%end` to `send-keys` reads the read-back's verdict, never `REPLY_FAILED` |

### 7.6 `probe:p318` — the Mac side, ONE Electron (`build/p318/probe-p318.mjs`)

`node build/harness-socket.mjs --fresh gmux-p318 '… node build/with-scratch-machine.mjs -- node
build/p318/probe-p318.mjs'`. One Electron through `withElectron`, a scratch profile, `HOME` and socket
`gmux-p318-<pid>`; the stand-in Tailscale behind its preflight and per-second sampler; the DNS stand-in in the probe's
own process; the `agents.json` renames read back through `agents:list`; two node phones (`build/p316/node-phone.mjs`,
which gains `chooseOption` and `sayText` over its existing `signedPost`). Sessions: two Claude stand-ins, two Codex
stand-ins, a shell, a shell whose foreground program prints a numbered dialog, and a shell on the loopback scratch
machine. A desk keystroke is typed into the Mac's own terminal through CDP, so it passes the attach host. Every child is
ended by pid in a `finally`. No vendor process runs and no token is spent.

| Arm | Holds |
| --- | --- |
| R0 | The door reads `changed`; its lines hold the route line with `choose` and `say` and `Lets an allowed phone end a session, answer a numbered question and send a session one message`; the confirm block draws `POCKET_DOOR_HONESTY`; Allow |
| R1 | Claude, `1` pressed from phone A: 200 `done`; one byte `31` in the stand-in's log after its draw; `/v1/blocked` read within 50 ms of the answer no longer lists the row |
| R2 | Codex, `3` (No): `done`; one byte `33` |
| R3 | His ruling 2: Claude `2` and Codex `2` offered and pressed: `done` |
| R4 | A hook command 250 characters long, and one carrying a token shape: only `No` offered; a hand-made `1` refused `changed` with nothing typed |
| R5 | A message at each stand-in's empty prompt: `done`; the log holds exactly the bracketed bytes and its `submitted` |
| R6 | A message mid-turn (§Revision R15): `/v1/session` reads `canSay` false while each stand-in works; a hand-made `say` is refused `unsayable` with `REPLY_NOT_READY`; the stand-in's log gains no byte; the same stand-in once idle offers the box again |
| R7 | `/v1/session` on a `needs_input` row: `canSay` false; a hand-made `say` refused `unsayable`; the trust-gate screen: no option pressable and `canSay` false |
| R8 | The remote shell: the empty offer; a hand-made `choose` refused `unpressable` and `say` `unsayable`; the scratch machine's tmux saw no command from either |
| R9 | **The race**, both agents: a desk `1` typed at 0, 5, 15, 30, 50, 120, 200 and 400 ms before the phone presses its question's LAST marker, so the two bytes differ. Graded from the stand-ins' logs, which name the drawn question beside every byte: every phone byte landed on the question the phone was shown, or the press was refused `changed` with no phone byte in the log. A desk byte landing on the next question is the desk's own, printed and not graded. **Every trial's desk byte must be in the stand-in's log** (the fix round of 2026-10-04: as first built no desk byte reached any stand-in and the arm passed with nothing raced) |
| R10 | Two identical successive questions on each agent: the second press with the first's question id refused `changed` |
| R11 | The Mac's window resized between the read and the press (§Revision R19 f). So that option 2 re-wraps and the mark moves: the earlier offer's press refused `changed` with no byte; the next read offers the Codex approval again at its new mark and draws the Claude dialog unpressable (§13 item 8 b). So that nothing re-wraps: the press is `done` (a resize is not input, and nothing the press binds moved). Each printed with the widths used |
| R12 | A numbered dialog printed by a non-agent foreground program in a Claude session, its hook posted: nothing pressable; a hand-made press refused `changed` |
| R13 | A draft typed at the Mac into each stand-in's prompt: `canSay` false; a hand-made `say` refused `unsayable`; the log gains no byte from the phone. A desk keystroke is TerminalPane's: the session's project and the session brought in front (its terminal mounted), `noteTerminalInput`, then the bytes (the fix round) |
| R14 | The text arms: `/exit`, `!touch x`, `-R`, `x;`, `a\;`, a text holding `ESC[201~` (refused `character`), a TAB, a CR, a lone surrogate (refused), 4,096 bytes (delivered exactly), 4,097 (refused `long`), and the empty string (refused `empty`); each delivered exactly or refused for its own reason |
| R15 | Replays: the same bytes again (404); the same write id fresh-signed (the recorded body, one act by the log); phone B Removed on the Mac (refused before HTTP); the door switched off while a press reads back (200 or a cut, never 404, one act at most). **R15b (§Revision R13)**: a `say` whose answer the probe's relay cuts after main logged the act, then the SAME write id and words re-signed: the recorded `done`, and the stand-in's log holds exactly ONE `submitted`; the same words under a fresh id (what the phone sends after 60 s or after an edit) is a second message, printed, so the arm shows what the kept id buys |
| R16 | A dialog-shaped message into each stand-in: no `needs_input` for 10 s |
| R17 | **Pane reports move nothing (§Revision R14)**: with a Claude stand-in's Bash dialog pressable, the Mac's window is blurred and focused through CDP five times, and the session is left and returned to five times (the device-attributes answers): the question id does not move, `/v1/session` still offers the press with the same `question`, and a press made with the offer read BEFORE them is `done`. A real keystroke typed through CDP afterwards moves it and the stale press is refused `changed` (the control), the keystroke's bytes in the stand-in's log. The reports are also sent down the report road by hand (`sendReport`'s `term.sendInput`), so the arm does not rest on tmux's focus mode alone (the fix round) |
| R18 | `app.log`, every file under the profile and `HOME` except the sessions' own saved screens, and `ps -ww` sampled every 500 ms through R5 to R16: no byte of any message text (each a fresh canary); no `tortie-say-` buffer left; one log line per write that acted; the menus read as at the parent. **Narrowed by the fix round of 2026-10-04**: `<profile>/gmux/snapshots/` is the scrollback Tortie keeps at quit (`snapshotAllSessions('app-quit')`), and it holds a delivered message as the agent drew it on its screen, exactly as it holds words typed at the desk; what 318 itself writes (its log line, its tmux buffer, its process argv) holds none. Its hits are counted and printed, not graded |
| R20 | **The fix round's arm (2026-10-04)**: six No presses per agent, each after a random wait of up to 2 s so it lands anywhere in the monitor's tick: every press `done` with its one digit committed, and no session left at `needs_input` for the last 2 s of a 6 s watch while its stand-in sits idle at its prompt (the run lens measured 11 of 60 stuck before the release rule was amended, D16) |
| R19 | Request-to-land (the node phone's request written to the stand-in's read), p50 and p99, printed and not graded (D26) |
| RN | **No regression**: ⌘J's rows and Catch Me Up's lines for the same sessions read the same at the parent and at HEAD (each build's suffix the same length, `parent` and `headrn`, because a Catch Me Up option line names the folder and wraps where its length puts it, and every clock time read as `<time>`, because the two builds' sessions start minutes apart; the parent's ended Claude stand-ins' registry files are swept before the HEAD launch, because the helper ends the scratch tmux server with each launch and a stale `waiting` file on a reused pane id made a HEAD session read needs input); `/v1/session`'s answer time for a Claude row at both, the difference printed and held under 150 ms at p50 |
| RP | With `P318_PARENT_CHECKOUT` (`c1a5fd38`), a second Electron after the first, never at once: `POST /v1/choose` and `/v1/say` refused 404 `route` with nothing forwarded; the stand-ins' logs gain no byte; the lines name neither; one write route |

### 7.7 `probe:p316`, arm group `reply` — the phone (`P316_ARMS=reply`)

Its existing machinery: one Electron, the stand-in Tailscale, the relay, Simulators made one at a time by
`withSimulator`. `ios/TortieUITests/P316DriveUITests.swift` gains the steps `reply-press`, `reply-say`, `reply-none`,
`reply-refused`, `reply-home`, `reply-focus`. The sessions are §7.6's stand-ins.

| Arm | Simulator | Holds |
| --- | --- | --- |
| P1 | 26.3 | A waiting Claude stand-in: its options are buttons (`session-choice-press-<n>`), no strip; tap Yes: one byte `31`, the screen reads the session again and it no longer waits; **no Face ID prompt appears and `end-confirming` is never drawn** |
| P2 | 26.3 | A Codex approval: the command line drawn under the question; tap No: `33` |
| P3 | 26.3 | An idle Claude stand-in: the strip's frame between the content and the End bar's top, the End bar above the tab bar; type, Send: `Sending…` then `Sent`, the box empty, the stand-in's log exact |
| P4 | 26.3 | No strip on a waiting row, on the shell, on the remote row; options unpressable under `Answer this in the session.` on the remote row |
| P5 | 26.3 | A draft typed at the Mac, then Send: `This session is not ready for a message. Nothing was sent.` drawn, the text still in the box |
| P6 (Paseo #3464) | 26.3 | Type, Send, Home at once, the relay holding the connection before its handshake: on return `Your Mac did not take it. Nothing was sent.`, the stand-in's log gains no byte in 20 s more |
| P7 | 26.3 | The same for a press, the relay passing: at most one byte; on return the screen reads the session's truth (graded like 317's E5: whichever happened is printed and passes only when honest) |
| P8 | 26.3 | The field focused: the End bar is not in the tree; the strip above the keyboard |
| P9 | 18.3, the floor | P1 and P3 |
| P10 (§Revision R13) | 26.3 | An idle Claude stand-in; type, Send, the relay CUTS the answer after main logged the act: `Your Mac did not answer. This is the session as it reads now.` and the words still in the box; Send again: `Sent`, the box empty, the relay saw the SAME write id twice, and the stand-in's log holds ONE `submitted`. Then edit one character and Send: a fresh id |
| RH | 26.3, hostile | `build/p316/hostile-door.mjs` reply arms: a 200 with another write id (no answer's path), a 200 `refused changed` (its sentence drawn), an unknown reason word, a cut after the request (re-read; the no-answer line only when the re-read succeeded), a 404 (not taken), a late answer past 15 s, a 200 `done` for a say (`Sent`, the box cleared): each ends in its drawn line, and the hostile door counts exactly one `POST` per press or Send |
| RP | 26.3, with `P318_PARENT_IOS` (`c1a5fd38`'s `ios/`) | options unpressable and no strip |

### 7.8 The independent methods (four, one an attack) and the parent

1. **The attack**, live: R9 to R15, the hostile client's arms, RH, and the verifier's own (a `choose` whose `question` is
   a valid id of ANOTHER session, a `mark` from before a resize, a `say` of 4,096 bytes all `\`, a press on a Gemini or
   shell row, a body with the keys in another order). Each asserted on the REASON it was refused and on the stand-in's
   log, never on the writer's report alone.
2. **Re-derive the bytes**: the verifier writes a raw recorder of its own (a program that is not the stand-in), reads
   every byte a session received through R1 to R16 and M2, and byte-compares it with the expected frame; which question
   a press answered is read from the stand-in's log and must agree with the door's outcome line by line.
3. **Re-derive the offer**: the verifier's own reader of the press rules and the input-row rule, importing neither
   module, run over every fixture in `build/fixtures/reply/` and over the screens R1 to R13 captured: its `pressable` and
   `canSay` equal the door's on every one.
4. **The per-row matrix**: {Claude stand-in, Codex stand-in} × {allow, deny, widening, a stale press after the Mac's,
   identical successive questions, a message at the prompt, a message mid-turn (refused), over a draft (typed and drawn dim), `/` and `!`, 4,096 and 4,097 bytes}.
   Over the real agents too, under his ruling 5: the installed Claude Code and Codex, once each per need, under a
   scratch HOME with loopback API stand-ins and 0 model turns (the capture step's harness, §Revision R20, is the
   shape: a stand-in API answering a marked prompt with one canned tool call, declined), each agent's version and
   binary realpath, size, mtime and sha256 recorded before and after.
5. **The parent**: RP on both sides, and the parent's confirm hash against HEAD's (they differ by the route list only).

### 7.9 No regression against today

| Scenario | Today (`c1a5fd38`) | At HEAD | Verdict |
| --- | --- | --- | --- |
| A person who never pairs a phone | — | every Mac surface reads the same; one extra function call per keystroke (a map increment) and per choice move | same, measured by RN and R18 |
| A paired phone after the update | reads, ends | the door asks Allow once | the cost every route-adding phase pays; the CHANGELOG says it |
| `/v1/session` for a Claude or Codex row | refresh and reads | plus up to four tmux and process reads | RN prints the difference; over 150 ms at p50 fails, and the reading is narrowed before landing |
| `/v1/blocked`, the push, the alerts | as today | untouched | same by construction |
| A session screen | options unpressable | buttons for the pressable ones; a strip on a sayable session | the content still ends above them (P3 frames) |
| End | as 317 | as 317, its bar under the strip, hidden while typing | same |

---

## 8. The CHANGELOG items

Under `## Unreleased`, `### Added`; the follow-up docs commit adds the link.

- `- From the iPhone app you can answer a Claude Code or Codex session's numbered question with one tap, including the options that give the agent more room, or send it one message as if you had pasted it at your Mac and pressed Return, slash commands and ! included; a message can be sent only while the agent is waiting for you at its prompt, not while it works, asks you something or has something typed in it at your Mac, other agents are still answered on your Mac, and your Mac asks you to allow the phone door again once after this update`

**A sentence this phase makes false, his to reword.** Phase 316's item says "It only reads and ends sessions, so you
still answer them on the Mac, which must be awake with Tortie open". The smallest true edit replaces that clause with
"Your Mac must be awake with Tortie open"; the proof builder makes it and the commit body says the wording is his.

---

## 9. His checklist — NEW `build/p318/CHECKLIST.md` (the proof builder's)

For the ONE TestFlight build after this phase, in his words, each row saying what to open, press and see, then "Not
covered yet" and a table of where every word it names was found:

1. Run Tortie from main after 318 and open Settings then Phone. **You should see** the door ask again, naming `choose`
   and `say`, and `Lets an allowed phone end a session, answer a numbered question and send a session one message`.
   Allow.
2. In a scratch folder, ask Claude Code to run `ls`. On the iPhone, open that session. **You should see** its options
   as buttons. Tap `Yes`. **You should see** the session move on, at the Mac and on the phone, with no Face ID.
3. Ask Codex to run `ls` in another scratch folder. On the iPhone, **you should see** the command under the question.
   Tap `No`.
4. Open an idle Claude Code session. Type `say hello`, press Send. **You should see** `Sent`, and the message submitted
   at the Mac.
5. With that session open on the iPhone and the box drawn, type a few letters into it at the Mac without pressing
   Return, then type a message on the iPhone and press Send without pulling to refresh. **You should see** `This session
   is not ready for a message. Nothing was sent.`, and your letters untouched at the Mac. Pull to refresh: **you should
   see** no box while your letters are there.
6. Ask Claude Code for something that takes a while, and open the session on the iPhone while it works. **You should
   see** no message box (your ruling, "Only when idle at its prompt"); it appears once the session is waiting for you
   again.

**Not covered yet**: Gemini, Qwen and every other agent (never pressable); an iPad and a Touch ID iPhone (333.4); a
Claude Code or Codex release after 2.1.287 and 0.160.0 that draws its question or prompt differently (the phone then
shows no button or no box until the screens are captured again).

---

## 10. Builders, disjoint files, and who owns what is shared

Four builders in `/private/tmp/wt-p318` at once, on `c1a5fd38`. The Mac's door and verbs are split at the
`PocketWrites` seam (§5.1.5, §5.6) because the verbs are the larger half; each codes against the names pinned in §5.
No file is in two lists. Builders run `npm run -s typecheck` and the vitest files they own (or `xcodebuild
build-for-testing` with `-derivedDataPath …/scratchpad/p318/dd-<role>`, deleted before returning); they launch no
Electron, boot no Simulator, run no probe and no whole `npm test`; they never commit, stage or stash.

| Builder | Owns |
| --- | --- |
| **door** (the door, the contract, the composition) | `src/main/pocket/door/table.ts`, `door/limits.ts`, `door/wire.ts`; `src/main/pocket/writes.ts`, `routes.ts`, `facts.ts`, `pairing.ts`; `src/shared/ipc/pocket.ts`; `src/main/sessions/pocket-writes.ts`; `src/main/capabilities.ts` (the pocket and reply wiring only); tests `src/main/pocket/__tests__/{writes,routes,pairing,facts,door-wire,server}.test.ts`, NEW `src/main/pocket/__tests__/p318-body-caps.test.ts`, `src/main/sessions/__tests__/p317-pocket-writes.test.ts` (the delegation), `src/renderer/settings/__tests__/p316-phone-section.test.tsx` (the sentence); `build/p313/hostile-client.mts` and `hostile-client.mjs` (its PASS line); `build/p316/node-phone.mjs` (`chooseOption`, `sayText`) |
| **verbs** (what reads and types) | NEW `src/main/reply/{question-id,hook-says,gate,press-shapes,input-row,text-rules,reader,writer}.ts` and their tests under `src/main/reply/__tests__/`; NEW `src/shared/reply-copy.ts` and `src/shared/__tests__/p318-reply-copy.test.ts`; `src/main/activity/monitor.ts` (the export, the dep and its call, `nativeReadingOf`) and its test; `src/main/attach/attach-host.ts` and `src/main/attach/__tests__/attach-host.test.ts`; NEW `src/shared/pane-report.ts` and `src/shared/__tests__/p318-pane-report.test.ts`, and `src/renderer/terminal/keys/{pane,focus,color,device}-report.ts` (each a re-export only, §Revision R14); `src/main/sessions/core.ts` (the bumps, the three wirings, `tmuxIdOf`); `src/main/machines/exec-plane.ts` (`stdin`) and its test; NEW `build/fixtures/reply/**` |
| **phone** (the Swift app) | `ios/Tortie/Door/DoorClient.swift`, `Door/Contract.swift`; `ios/Tortie/Screens/SessionScreen.swift`, `DoorWords.swift`, `Identifiers.swift`; NEW `ios/Tortie/Screens/Reply.swift`, `MessageStrip.swift`; `ios/Tortie/App/TortieApp.swift`; `ios/Tortie/Style/Copy.swift`; `ios/Tortie.xcodeproj/project.pbxproj` (the build number, and file references only if the project needs them); tests NEW `ios/TortieTests/{ReplyTests,ReplyClientTests,P318ReplyTransportTests,ReplyFakes}.swift`, and `CopyTests.swift`, `DoorVectorTests.swift`, `WriterTests.swift` |
| **proof** (the gates, the probes, the words) | `build/conformance-pocket.mjs`, `build/ablation-p313.mjs`, `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `build/p316/test-ios.mjs`, `build/p316/hostile-door.mjs`, `build/p316/probe-p316.mjs`, `build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`, `ios/TortieUITests/P316DriveUITests.swift`; NEW `build/p318/{stand-in.mjs,probe-p318.mjs,measure-writer.mjs,drive-writer.mts,CHECKLIST.md}`; `build/assert-electron-teardown.mjs` (the floor), `build/assert-import-boundaries.mjs` (the wall), `build/background-fixtures.mjs` if a new shape appears; `package.json` (`probe:p318`, `measure:p318`), `build/verification-checks.mjs`; `CHANGELOG.md`; `docs/design/phone/{Session,Choice,Composer,index}.html` and NEW `Answer.html`; `docs/research/127-the-phone.md` (`:664-665` and `:1311-1312`, each edited in place to point to research 135) |

**Shared files and their one owner.** `src/shared/ipc/pocket.ts` and `src/main/pocket/routes.ts` (the contract and
`PocketWrites`) are **door**'s; `src/shared/reply-copy.ts` and `src/shared/pane-report.ts` are **verbs**'; `Copy.swift` and `project.pbxproj` are
**phone**'s; `package.json`, `build/verification-checks.mjs` and `CHANGELOG.md` are **proof**'s; `build/fixtures/reply/**`
is **verbs**' and the stand-in only reads it; **`CLAUDE.md` is the integrator's**, written from every builder's report
after reconciling; `docs/audits/contract-baseline.txt` is the integrator's and must not move; this file is the spec's,
and the integrator appends "§As built — 318"; **`docs/BACKLOG.md` belongs to the main session**, which makes the three
in-place edits the entry names (Phase 316 item 6's `send-keys -l` and Phase 317's successor paragraph pointing to
research 135 §3.1; Phase 89's "Tortie never presses it" gaining its one clause; Phase 325's line becoming "The phone
writer (Phase 318) is the second writer `conformance:ownwords` must see; whichever phase lands second wires it"), and
the running-log lines.

**The integrator** checks the base first (§4.1); reconciles the pinned names across the four (`createReplyVerbs`,
`PocketChooseInput`, `PocketSayInput`, `PocketStillAllowed`, `PocketReplyOutcome`, `PocketReplyOffer`, `POCKET_NO_REPLY`,
`replyTurns`, `nativeReadingOf`, `tmuxIdOf`, `onInput`, `onChoiceMoved`, `choiceMarkOf`, the reasons and the sentence
names); runs §7.1 whole except what needs the lock; `xcodebuild build-for-testing` Debug and Release for the Simulator
SDK and an unsigned Release device archive with `test-ios.mjs --read-app`; scans the delta for control, bidi,
zero-width and BOM characters and for duplicated blocks of ten lines or more; writes CLAUDE.md's rows; appends "§As
built — 318".

**The verifiers** (two lenses, each under the lock, phone slot first): Lens 1, the attack and the re-derivations (§7.8
methods 1 to 3, `conformance:pocket:hostile`, `measure:p318`, RP); Lens 2, the app runs (`probe:p318`, `probe:p316`
`reply` on 26.3 and 18.3, `test:ios` in Debug and Release on both, `probe:p311` once). Each names the step it did that
the builders did not.

---

## 11. What this sends to 316.7, 325, 333 and the main session

- **316.7**: no file of its list is touched; the shared files of §4.2 merge by blocks; R4 and the build number are
  whichever lands second's; its (aa) stays free, and 318 takes (ae) to (ag).
- **325**: `AttachHostOptions.onInput` exists; 325's tap shares it (one seam, called once per local write), and
  `conformance:ownwords` must see the phone writer as the second writer.
- **333.1, 333.3**: rule letters after (ag). 333.3's sample answers `reply` as the empty offer.
- **333.4**: drive a press and a message on an iPad and the newest iOS.
- **Owed entries, named and not queued** (research 135 §9): a resize that clears Phase 311's hook question;
  `typeIntoPane`'s missing `--`; Codex's unread trust gate; the numbered verdict's missing foreground gate. And the
  held-hook road (research 135 §2.9), named and not queued.

---

## 12. What is NOT in this phase

**The refusals that stand.**

- **No press for any dialog not measured and compiled**: Gemini, Qwen, Antigravity, Cursor, OpenCode, Muse, Grok; Claude's
  trust gates, theme picker, API-key list and first-run notes; Codex's trust gate, sign-in list and update prompt. A
  press shape is compiled, never configured (refusal 5).
- **No Enter after a digit, ever**, in the same list or a second call.
- **No message to any agent but Claude Code and Codex**, none into a shell or a pane whose agent has left, none on a
  `needs_input` row, none over a prompt that is not empty, and **none while the agent works** (D14, §Revision R15; his
  ruling 4 of 2026-10-02, "Only when idle at its prompt").
- **No `send-keys -l` for words**, anywhere.
- **Nothing on another machine.** No `stdin` to a remote context; no change to Phase 89's door, `sendArmedResumeText`,
  `ARMED_RESUME_GUARD` or the remote arm's rule 1.
- **No status setter and no "seen it".** `noteUserInput` after a read-back that shows the question answered is the
  desk's funnel; nothing else in `src/main/reply` touches a status.
- **No Face ID on a reply**, and no switch for it (his ruling).
- **No second write gate, ledger or route family**, and no field on `/v1/blocked` or any list answer.
- **No retry, no queue, nothing persisted**: a message is in memory in the box until Send, and a write either happened
  once or did not.

**The designs set aside.** A held `PermissionRequest` hook answering Claude with no keystroke (research 135 §2.9); a
`PreToolUse` hook for its `tool_use_id`; a biometry-bound third key; a ledger on disk; Interrupt (Esc); an in-app
check-to-land stamp (D26); a confirmation before a press (the entry's "one tap").

**No release.**

---

## 13. Open concerns handed to the verifiers

1. **The real screens.** Captured and committed from Claude Code 2.1.287 and Codex 0.160.0 (§7.3, §Revision R20 to
   R27). A later release of either may draw them differently; where the reading can see the difference the phone
   draws no button or no box, the side that does nothing, and the screens are captured again the same way.
2. **Check-to-land in the app** is not measured (D26); `measure:p318` is. If the verifier judges the Electron spawn
   path different enough to matter, the measurement it wants is an in-app stamp, which is a `gate:contract` change and
   the main session's call.
3. **Pane reports** (focus, colour, device attributes) move nothing since §Revision R14, and R17 proves it both ways. A
   REAL keystroke at the Mac while a Claude dialog waits (an arrow key, a stray letter) still clears the hook's question
   (D7), so that dialog is then answered at the Mac: the side that does nothing.
4. **A tmux client outside Tortie** types without passing the attach host, so its keystrokes do not bump the id
   (research 135 §2.7). Not an arm; stated.
5. **The `/v1/session` cost** (RN). If it exceeds 150 ms at p50, the reader is narrowed (a press reading only for
   `needs_input` rows, a message reading only for `running` or `idle` rows, which it already is) before landing.
6. **Codex's `$` line**: a command Codex wraps, folds, draws on more than one row or draws with a blank line in it
   reads as not said, so only No is pressable (§Revision R20, R21, each a committed real capture); a screen that
   draws the question row twice reads no shape and draws no button.
7. **The replay** onto main after 316.6 and 316.7 (§4.2): a conflict is the operator's, not a builder's.
8. **Claude dialogs that are drawn unpressable, stated so a verifier does not chase them** (§Revision R19 e): (a) a
   dialog that follows another within one monitor tick with a DIFFERENT mark (a quick command approved, the next
   command's dialog already up): `choiceUpdate` clears the hook's question on any move between two real choices
   (`src/main/activity/monitor.ts:1206-1213`), whether or not a new hook came, and the `'moved'` bump clears the ask
   too, so the phone draws it under `Answer this in the session.`; a dialog whose predecessor's command ran past the
   read-back is pressable, because the release in between leaves the mark empty. The fix is the monitor's (keep the
   hook's question across a move when a hook arrived since the last reading) and belongs with research 135 §9 item 1's
   owed entry, which this widens; (b) a resize while it waits (research 135 §9 item 1); (c) the Mac app restarted while
   it waits (the new process never saw its hook); (d) a press that was typed and not taken (the phone's own bump clears
   the ask). Codex needs no hook, so none of these reaches it.
9. **The say's window** (§Revision R15): from the reader's last capture to the paste landing is a spawn (M6 prints it).
   A draft typed at the Mac inside it, by someone else at the keyboard, merges with the message. Idle-only is what keeps
   an agent from drawing a question there; Claude's registry reads `shell` (a background shell still running) as idle
   too, and whether a finishing background shell can start a turn on its own was not measured.
10. **The kept say** (§Revision R13) is forgotten when the screen is left (with the box) and when the Mac restarts within
   60 s (with its ledger, research 135 §4.4): both are the person deciding again with the session drawn in front of them.
11. **A `tortie-say-…` buffer** survives in the private tmux server if Tortie dies between `load-buffer` and the paste
   (the `finally` never ran). It holds his words in memory until the server exits; nothing reads it, and R18 reads that
   a run leaves none. A sweep at boot is a later round's if a verifier finds one.
12. **Codex's `$` line** (D12), measured by the capture step on Codex 0.160.0 (§Revision R20): every line of a
   command is drawn, continuation rows unprefixed at the `$` row's indent, a blank line of the command as a blank row,
   a long line wrapped unprefixed, a very tall command folded into `[… N lines] ctrl+a view all` with the real question
   still on screen, and a newline in the model's justification dropped. The rule as first written passed three real
   hostile approvals and was replaced. What no screen rule can see: a character Codex draws as nothing at all (a
   carriage return inside the command, say), which the drawn command omits while the shell receives it. Not measured;
   stated.

---

## 14. The two questions for him — answered 2026-10-02

1. **A message while the agent works** (§Revision R15). Asked: a message ends with Return, and a permission question
   the agent draws in the few milliseconds between Tortie's last look and the message landing takes that Return as Yes;
   did he want the box while the agent works too, accepting that race? **His answer: "Only when idle at its prompt."**
   The phone offers the message box only while the agent sits idle at its own prompt, as D14 was written; while the
   agent works it draws no box, and a numbered question is answered with the buttons. Nothing moved: D14, R6, M6, §12
   and §13 item 9 stand as written.
2. **The real screens.** Asked: may the capture step and the verifiers run the installed Claude Code and Codex under a
   scratch HOME with loopback API stand-ins and 0 model turns, to commit their real permission prompts and prompt rows?
   **His answer: "Yes, scratch home, no turns"**, and the same day, **"u can use the subs on those accounts if that
   works"** (the fewest real turns under his own sign-in where a stand-in cannot draw a screen). The capture step ran
   them with stand-in APIs alone, spent no real turn, and committed what they drew (§7.3); §Revision R20 to R27 say
   where the real screens differ from the reconstructions and what the reader changed.

---

## 15. §Revision — the adversary of this spec, 2026-10-02

Written by the adversary in `/private/tmp/wt-p318` at `c1a5fd38`, re-reading every `file:line` below on this date. It
started no Electron, no Simulator, no tmux server and no agent, and spent no model turn. Its own independent steps:
the R4 pins re-derived with `printf | shasum -a 256` (the five lines `d1fefb71…`, the seven `0e8c9f46…`, the eight with
316.7's `GET /v1/sessions` `d95ecd27…`, each equal to D29's), and the worst bodies re-encoded with `JSON.stringify` (C0
text 24,771, quote or slash text 8,387, choose 267, each equal to D3's). Everything else is a reading of the tree.

### R1 to R12, applied in place by an earlier pass

This file already cited "§Revision R1" to "R12" when this pass began, with no section of that name in it; R5 and R8 are
cited nowhere. They are recorded here from the text they left, each re-checked against the tree: **R1** the press half
of `reply` is bound to the question and choices the same answer draws (`routes.ts:530` composes them through `rowOf`, `:344-345`,
from the activity map, which moves only on a tick, D18, §5.2); **R2** one process-wide counter (D6); **R3** "answered" read from
the screen or a hook, never a keystroke (D16); **R4** Claude's Bash prompt only, its command said whole by
`hook-says.ts` (`question.ts:113-115` flattens and trims, D11, D12); **R6** no edit to `session-gates.ts`, and
`conformance:manager` still runs (D21); **R7** the press over two control lines (the earlier pass's scratch measurement
is under `…/scratchpad/p318/adversary/`, D8, D26); **R9** the files both phases edit and the build number (§4.2, D30);
**R10** the say cap 32,768 (D3); **R11** `noteUserInput` only when nothing moved the id since the press (D16, §5.6.1
step 8; amended by the fix round of 2026-10-04 to "no hook since the press and no choice on the read-back screen"); **R12** the `$`-id the reading used, re-checked at the final check (§5.6.1 step 4).

### R13 to R19, this pass's, each applied above

| R | Finding | Evidence | Applied |
| --- | --- | --- | --- |
| **R13** (major) | **A message whose answer did not come is typed twice when he presses Send again.** §1 item 3 promised that Send on the same words within a minute "asks the Mac about that same message rather than sending it twice", and nothing in §5.7 did it: `DoorClient.signedPost` mints a fresh id on every call ("Not one id per phone or per session: one per call, never kept", `ios/Tortie/Door/DoorClient.swift:322`), the box keeps the words after `.noAnswer` (§5.7.3), and once the agent has taken the first message its prompt is empty again, so `canSay` is true and the second Send is a new write the ledger has never seen (`src/main/pocket/writes.ts:240`, `:278-283` key on the id). A press needs nothing: its question id moved with the first press's bump, so a second press on the same offer is refused `changed` | the lines cited; research 135 §4.4 A8 (the same paste sent twice was submitted twice by both agents) | D24; §5.7.1 (`say(_:text:write:door:)`), §5.7.2, §5.7.3 (`KeptSay`, UTF-8 bytes, 60 s); (ag); R15b; P10 |
| **R14** (major) | **Under D7 every pane report makes a waiting Claude dialog unpressable for good.** `resources/gmux-tmux.conf:49` sets `focus-events on`, so every blur and focus of the Mac's window sends `ESC [ O` / `ESC [ I`, and every return to a session two device-attributes answers (`src/renderer/terminal/keys/focus-report.ts:14-17`, `device-report.ts:5-20`); `TerminalPane.tsx:439-440` hands them to `scroll.sendReport`, which is `gmux.term.sendInput` on the very channel the attach host writes from (`surface.ts:454-456`, `src/preload/terminal.ts:33-35`, `attach-host.ts:279-288`). The spec bumped on every write there, and D7 clears the hook's question on every bump that is not the dialog appearing; no second hook comes for that dialog. So a Claude question that was on screen when he locked the Mac or walked to another app could never be pressed from the phone, which is the phase's main scenario. §13 item 3 had judged it "refuses a correct press, which fails safe"; that was research 135's reading, made before D7 existed. Tmux takes device and colour answers off the client's input before any key table (`device-report.ts:27-33`, `color-report.ts:40`), and a focus report reaches an agent only as a focus event, so none of them can answer a dialog: excluding them costs the race nothing | the lines cited | D23; §5.3 item 2; §5.6.4; NEW `src/shared/pane-report.ts` (moved, the renderer re-exports); Y17; attach-host and pane-report tests; R17 rewritten; §7.1 adds `probe:p292`; §13 item 3; verbs owns the five files |
| **R15** (major) | **A message sent while the agent works can approve a permission question it never showed.** D14 allowed `busy` and `working`. A working agent draws a question at a moment of its own (research 135 §2.4, 45 to 127 ms after a commit, no model round trip); Claude's hook leads its dialog by only 10 to 25 ms (§2.6), Codex gives no warning at all; the say's act is a spawned list after the check, which R7's own measurement put at p99 9 to 24 ms on 3.7b and 11 to 61 ms on 3.6a under load; and the reading took the capture FIRST, then two `ps` reads. A question drawn inside that window takes the paste's Return as its answer, and both agents open their approval with option 1, Yes, selected (research 133 §4.5 for Codex; research 135 §3.5: 3 of 3 Claude messages approved the tool, and a Codex message pressed `p` and wrote a permanent allow rule). That is the race the press's whole design closes, left open on the other verb. An agent waiting at its prompt draws no question on its own | the lines cited; `src/main/activity/oracles.ts:25-38`, `:63-72` | D14 (idle only); §1 item 2; §3 row 22; §5.4.2 (the capture LAST); §5.4.5; §5.6.2 step 6; Y5, Y18; R6 now a refusal; M6 prints the window; CHANGELOG; §12; §13 item 9; §14 question 1 |
| **R16** (minor) | **The `'gone'` bump misses the way most choices go.** A choice usually goes because the session stopped waiting: `commit` calls `noteChoiceGone` (`monitor.ts:1254`, `:1237-1241`) and the tick's drain sends `{ atChoice: false }` (`:663-669`); neither passes the caller of `choiceUpdate` at `:1098`, and `choiceUpdate` returns null whenever the state is not `needs_input` (`:1181`). So the id did not follow research 135 §2.7's "every tick that finds the choice gone", and a `PermissionRequest` whose dialog Claude never drew (another hook or its classifier approved it) left its question alive for the next dialog that fires none. R1's binding happens to catch that today, because the monitor clears its own copy on the same tick (`:1127-1130`); two records that should move together should not rely on it | the lines cited | D6; `TurnCause` gains `status`; §5.3 item 5 (core's `onStatus` wiring, the monitor untouched); §5.6.4; Y13; the question-id test |
| **R17** (moderate) | **A draft drawn dim or grey reads as an empty prompt.** §5.4.4 counts any dim or grey run as placeholder wherever it sits; it has no notion of where the caret is, so a draft styled that way (a pasted-text token is the likeliest) reads empty, and the message merges with it: the side that does something, against "it fails closed". Claude Code draws its caret as an inverse cell; Codex draws the terminal's own cursor, which tmux reports | §5.4.4 as written; research 133 §4.7 (Codex's real cursor under ratatui is the same reading tmux gives) | §5.4.2 step 3 (Codex's cursor read); §5.4.4 (the caret rules, `promptIsEmpty(agent, styled, cursor)`, what it still cannot see); Y3; fixtures; tests |
| **R18** (consistency) | **Three places still said 16,384** after R10 moved the say cap to 32,768: §3 row 7, Y1, and §6.2's hostile arm, which would have pinned and attacked the wrong number. And R4's NEW `src/main/reply/hook-says.ts` was in no builder's list and outside Y7's pure set | `grep -n 16,384` and `grep -n hook-says` over this file | the three rows; §10's verbs row; Y7 |
| **R19** (minor) | (a) `Promise.all` over the press's two control lines read a refused `copy-mode` as "Tortie could not type into this session." while the `send-keys` line had been written and may have landed: the outcome is the `send-keys` line's (`Promise.allSettled`), M7. (b) The act aimed at the session (`$`-id) while the reading captured a pane: the private config keeps tmux's default prefix (`resources/gmux-tmux.conf` sets none), so a window can be made in a session from the Mac, and the act now aims at the `%`-pane the reading captured, as the monitor already addresses panes (`monitor.ts:1294`). (c) For Codex the press's mark did not cover the `$` line the phone draws, and two approvals whose option 2 names the same prefix share a choice mark: the reply's own mark hashes the choice mark with the command (§5.4.5), with nothing on the wire changing shape. (d) The phone must draw the command and every option whole (`lines: nil`), (ae). (e) The Claude dialogs drawn unpressable, the say's window, the kept say's limits, a buffer left by a crash and Codex's `$` line, each stated (§13 items 8 to 12). (f) Arm R11 promised "refused `changed`; the next read offers the press again" after a resize; a resize bumps nothing, and when it moves the mark it clears the Claude hook's question for good, so the arm now grades what the design does | the lines cited | D8, D9, §5.4.2, §5.4.5, §5.6.1 steps 4 to 6, §5.6.2 step 7, §5.7.4, Y3, Y5, (ae), M7, R11, §13 |

### Attacked and found to hold

- **The wrong session.** A press and a message name a session id; the gate reads the row from `core.listSessions()`
  (`core.ts:2703`, synchronous) and the target from `liveIds` (`:712`), which holds only Tortie's own sessions, so a
  session that carries neither `@gmux-id` nor the pane stamp is never reached; the final check re-reads both with
  nothing awaited, and the ledger's one write per session holds across phones (`writes.ts:299`). A paired phone can
  write to any local idle Claude or Codex session it can name, listed or not on its screen; that is the authority the
  confirm line he allows names, not a gap.
- **The wrong option.** The marker is the agent's own number from the fresh rows; the mark covers the question and
  every option in order (`monitor.ts:1314-1317`), now with Codex's command; R1 binds them to what the same answer draws.
- **A press typed twice.** The phone's own bump moves the id, so a second press on the same offer is refused `changed`;
  `replySettled` cannot throw past the act; nothing retries.
- **A message typed into a session that stopped waiting.** The final check reads `n === n0` (desk keystrokes, hooks,
  choice moves and, since R16, status changes), the row, the foreground, the native reading and the prompt, with nothing
  awaited before the paste; R15 removes the agent-drawn question from the window that remains.
- **`/` and `!`.** They reach only the agent's own empty prompt, through a bracketed paste: a pane whose agent has left
  fails the foreground check (`commandRunsAgent`, `state-machine.ts:628`), and a shell never receives the words. Their
  meaning inside the agent (a slash command, a shell escape, Claude completing `/cle` to `/clear`) is his ruling 3.
- **Status.** No route and no verb sets a status: the one call is `noteUserInput`, the desk's funnel, after a read-back
  that saw the question answered and only when nothing else moved the id; R16's bump is an id and never a status; a
  message is refused on every `needs_input` row and, since R15, while the agent works, and R16's dialog-shaped echo arm
  stands. The person's own input never raises `needs_input` by any path this phase adds.
- **317 and 316.7.** 318 changes `keyOf` (the verb, 317's own fix-round nit), `pocketWriteRouteIds()`, the confirm
  line's join, the honesty sentence, and 317's phone comment "one per call, never kept" (R13); End's body, offer,
  verdict, bar and runner are byte for byte 317's. It touches none of 316.7's files beyond the shared ones §4.2 lists,
  each by appending; `routes.ts`' `session()` is 318's alone (316.7 keeps its bytes, `/private/tmp/wt-p3167/build/
  p3167/SPEC.md` §6.2 step 3). R14's five files are in neither 316.7's list nor 317's.

### R20 to R27, the capture step's, 2026-10-02

Written by the capture step in `/private/tmp/wt-p318` at `c1a5fd38` under his rulings 4 and 5 (the top of this file),
holding the lock's phone slot. **What ran.** The installed Claude Code 2.1.287 (`~/.local/share/claude/versions/2.1.287`,
sha256 `6eab8333…41ea`) and Codex 0.160.0 (`@openai/codex` 0.160.0, native binary sha256 `112fae7a…1b4b`), each
launched as Tortie launches it (Claude with `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` and `--permission-mode default
--settings <hook file>`; Codex with `--no-daemon -c tui.fullscreen_transcript=false`), each on its own scratch tmux
server addressed by `-S /private/tmp/p318cap-<agent>-<pid>/tmux.sock` (never `-L gmux`, never the default server),
the vendored tmux 3.7b under a copy of `resources/gmux-tmux.conf`, at 120x40. The environment was built from nothing:
a scratch HOME, ZDOTDIR and TMPDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`, `HTTPS_PROXY` and `ALL_PROXY` at the
closed `127.0.0.1:9` with `NO_PROXY` loopback, the auto-updaters off, and a `security` stub first on `PATH` that
answers 44 (Claude asked it for two scratch-scoped names per launch, `Claude Code-credentials-<hash>` and `Claude
Code-<hash>`, both refused; Codex none). Codex took a made-up key through `codex login --with-api-key` into the
scratch `CODEX_HOME`, with `daemon_auto_start = false` and the file credential store. The APIs were stand-ins on
127.0.0.1 in the capture's own process: an Anthropic Messages stand-in answering a prompt that carries a marker with
ONE canned `Bash` tool call and everything else `ok`, and a Responses stand-in answering with ONE canned
`exec_command` (`sandbox_permissions: require_escalated`, as `build/p331/mock-responses.mjs` does); Claude's hooks
went to a recorder in Tortie's own hook shape (`src/main/activity/hooks.ts`). Every question was declined with Esc,
and every scratch project folder was empty afterwards: no command ran.

**The counts.** Claude Code launched 6 times and Codex 11 (one Codex refused its configuration, R25; two runs were
lost to the capture's own stand-in bugs and re-run), each run ending with its server killed and every pid it saw
under its pane ended by pid, its socket and run directory removed. **Model turns 0, tokens 0, and no real turn under
his sign-in** (ruling 5's follow-up was not needed: the stand-ins drew every screen). An `lsof` sample every 1.5 s of
every process under each pane saw 0 peers off loopback in every run. His `~/.claude` and `~/.codex` were never read;
none of his files was written; no Claude messaging socket of a scratch pid was left in `/tmp/cc-socks`. The two
installs read the same realpath, size, mtime and sha256 before the first launch and after the last. **Its independent
steps**: the SHIPPING `detectDialogRows`, `questionFromHookBody`, `redactText` and `commandRunsAgent` at `c1a5fd38`
run through the pinned tsx over the real captures and process lines; a judge of its own that ran this file's Codex
rule as first written, and its replacement, over every real approval against the command Codex was really asked to
run; and two complete runs of each agent compared row for row (identical but for the scratch path, Claude's spinner
verb and clock, and Codex's random greeting line).

| R | Where the real screen differs from the reconstruction | Evidence | What the reader changes, and where it is applied |
| --- | --- | --- | --- |
| **R20** (major) | **Codex's `$` rule as first written says a command that is not what Yes runs, on three real approvals.** Codex 0.160.0 draws every line of a command: continuation rows UNPREFIXED at the `$` row's indent, a blank line as a blank row. (a) `echo ok` LF LF `touch p318-gap.txt` draws `$ echo ok`, a blank row, then `touch p318-gap.txt`: "the next row blank" held, so the rule said `echo ok`. (b) A command whose first line is empty draws its real `$` row as `$` alone (it trims to no `$ `), then its lines, then a line `$ ls` with blank rows under it: the rule saw one `$ ` row and said `ls`. (c) A command whose later lines draw a second `Would you like to run the following command?`, `Environment: local` and `$ ls` nearest the options: the shipping detector takes the nearest question, and the rule said `ls`. On each, the phone would draw the short command with Yes as a button, and Yes runs the whole command. This is D12's promise broken by the agent's own words (a model, or a prompt injection, writes the command) | `codex-approval-blank-line-0.160.0.txt`, `codex-approval-hidden-line-0.160.0.txt`, `codex-approval-spoofed-question-0.160.0.txt`, each with `truth.command` in `real-captures.json`. The judge over all ten real approvals: the rule as first written wrong on 3, the replacement on 0, while both still say the two honest one-line commands | **§5.4.3's Codex shape replaced**: exactly ONE row on the screen whose trimmed text is the question; between it and the first option row exactly ONE row whose trimmed text starts `$` (space or not), that row starts `$ `, and EVERY row after it to the first option row blank; plus R27. D11, D12, §7.2 (the truth test), §7.3, §13 items 6 and 12 |
| **R21** (moderate) | **The shipping detector reads no question for a tall Codex dialog**, so the shape as written (`rows.question` starts the question) read null and drew NO button, not even No, against §1 item 1. The question row sits above `Environment:`, `Reason:` (when the model sends a justification) and the command rows; past `CHOICE_QUESTION_INK_ROWS` (4) ink rows `detectDialogRows` answers `question: null`: a 302-character command with a Reason row, a 51-line command, the hidden-line command with a Reason row | `codex-approval-long-0.160.0.txt`, `codex-approval-tall-0.160.0.txt`, `codex-approval-hidden-line-reason-0.160.0.txt`: `detectDialogRows` `question: null` on each, the three options read. The judge: the replacement keeps the shape on all three with `runs` null | **The Codex shape reads its question row from the screen** (R20's one row), never from `rows.question`. D18's binding does not move: it compares `composeQuestion(n1.hookAsk, rows.question)` with what the same answer draws, and both are null together. §5.4.3, D11 |
| **R22** (none to change) | **Claude Code 2.1.287's Bash prompt**, against research 135's 2.1.285 words: under a rule and `Bash command`, a `Tip:` row and the tool's description, the command drawn WHOLE in a dashed box (a multi-line or wrapped command behind a `│ ` gutter), then `Do you want to proceed?`, `1. Yes`, `2.` a widening option whose words follow Claude's own permission suggestion (`Yes, and always allow access to <folder> from this project` for a command that writes there; research 135 saw `don't ask again for: \`ln *\``), `3. Yes, and switch to auto mode · auto mode handles these prompts for you`, `4. No`, `Esc to cancel · Tab to amend`. The rows, and so the choice mark (`2b3a198fc5e4`), were the SAME for three different commands in one folder: the question id and the hook are the identity, as designed. The `PermissionRequest` body names `tool_name` `Bash` and `tool_input` `{ command, description }` with `permission_suggestions`, no `agent_id`; `questionFromHookBody` composes `Bash touch p318-one.txt` for the one-line command (whole), and flattens the two-line and blank-line commands and cuts the 302-character one at 200 (partial). The hook led the dialog's first sighting by 12 to 45 ms at a 50 ms poll; the registry read `waiting`, `waitingFor: "permission prompt"` at the dialog and `idle` at the prompt | `claude-bash-2.1.287.txt`, `-multiline-`, `-long-`, `-blank-line-`; `claude-permission-requests-2.1.287.json`; `real-captures.json` `claudeRegistry` | None to the reader: `rows.question` starts `Do you want to`, four consecutive markers, `deny` is `4`, and `hookBash` is `whole` for the one-line command alone. §5.3 (`hook-says.ts`) and §5.4.3 now cite the real bodies and words; the stand-in draws this layout (§7.4). Claude's Edit and Write prompts were not captured and stay out (D11) |
| **R23** (one rule stated) | **Claude Code 2.1.287's prompt row**: `❯ ` between two rules of `─` (`38;5;244`), the row opening with the SGR reset of the rule's colour; **no placeholder** on an empty row; the caret an inverse space right after `❯ ` while focused, and **no caret at all after a focus-out report** (the Mac window not focused, the phone's usual case), the caret coming back on focus-in or a keystroke; a draft, a stray `1` and the long-paste token `[Pasted text #1 +39 lines]` in the default colour with the caret after them; a three-line paste as three rows inside the rules (so no `❯` row has a rule directly below it). With `COLORTERM=truecolor` in the server's environment Claude drew the same 256-colour SGR | the eight `claude-prompt-*.ansi` fixtures with `truth.typed`; `raw-claude-truecolor` in the capture's scratch | The rule must never require a caret: it reads the blurred row empty because everything after `❯` is spaces, as §5.4.4 is written. §5.4.4 ("What the real agents draw", "What it cannot see"), §7.2 (`input-row.test.ts` over `truth.typed`) |
| **R24** (none to change) | **Codex 0.160.0's prompt row**: `›` bold, its placeholder dim (SGR 2; `Ask Codex to do anything` in these runs, `Write tests for @filename` in the committed `codex-idle.txt`: Codex rotates them), the terminal cursor visible at the first column after `› ` on the prompt row and unmoved by focus reports, a draft moving it; a three-line paste's continuation rows indented two with no glyph, the cursor on the last; the long-paste token `[Pasted Content 1879 chars]` in `38;5;6`, neither dim nor grey; the footer one blank row below. Header and footer in 24-bit colour with no `COLORTERM`. The title is the folder's name at rest and alternates `[ ! ] Action Required | <dir>` and `[ . ] Action Required | <dir>` at an approval; `codexTitleVerdict` reads both through `Action Required` | the six `codex-prompt-*.ansi` fixtures with `cursor` and `title` in `real-captures.json` | None to the reader (§5.4.4's Codex rule reads every real row as the truth says). The stand-in alternates its title the same way (§7.4) |
| **R25** (none to change) | **Codex 0.160.0's approval and its versions.** The installs had moved since research 135, before this step began: Claude Code 2.1.285 to 2.1.287, Codex 0.159.1 to 0.160.0. Codex 0.160.0 refuses `approval_policy = "untrusted"` ("is no longer supported; remove this setting"), so a command approval comes from an escalation under `on-request`. Under the question row it draws `Environment: local`, then `Reason: <justification>` only when the model sends one (a newline in it is dropped: `Lists the folder first$ ls` stays on one row), then the `$` row; options `› 1. Yes, proceed (y)`, `2. Yes, and don't ask again for commands that start with \`<prefix>\` (p)` (wrapping at a five-space indent) and `3. No, and tell Codex what to do differently (esc)`, or only the first and last for some commands; `Press enter to confirm or esc to cancel`. After a decline the transcript reads `✗ You canceled the request to run …` and then `• Ran <command> └ (no output)` although nothing ran | `codex-approval-0.160.0.txt`, `-no-reason-`, `-reason-newline-`, `-spoofed-question-`, `-tall-`; the scratch projects empty after every run | None beyond R20 and R21: the shape takes two or three options (first `Yes, proceed`, last `No, and tell Codex`), as D11's "2 to 9" already allows. Fixture names carry the real versions (§7.3) |
| **R26** (none to change) | **D13 on the real processes.** Claude Code holds the pane's terminal itself (its pgid is the tty's foreground group) and starts `caffeinate -i -t 300` in its own group during a turn, still running at the dialog; Codex's `node ~/.local/bin/codex` launcher holds it, the native binary in its group. `commandRunsAgent` over `binaryCandidatesFor` answers true for both holders and false for `caffeinate` | the capture's `ps -o pid,ppid,pgid,tpgid` at each screen, read through the shipping rule | None: `foregroundProgram` returns the pane's own program for both, as D13 needs |
| **R27** (recommended, applied) | **What the phone draws as "what will run" may hold a character that reads differently there.** The phone lays text out with bidi; the Mac compares code points. A command holding a bidi control could read on the phone as another command, byte-equal on the Mac | first principles, not measured live: a capture holding such a character cannot be committed under §0 | `runs` null, and `hookBash` `partial`, when the command holds U+061C, U+200B to U+200F, U+202A to U+202E, U+2060 to U+2064, U+2066 to U+206F, U+FEFF or any C0 or C1 control; test texts built from code points at run time. D12, §5.3, §5.4.3, §7.2 |


## The main session's standing rule (2026-10-02), binding on every role

Never read his conversation stores: his Claude Code and Codex logs, and anything under `~/.claude` or `~/.codex`. Real data for any test means the committed fixtures (`docs/research/assets/63-fixtures`, `build/fixtures/**`) or this repository's own files. A verifier on 2026-10-02 read 6,000 of his transcripts through main's reader because a brief named only his keychain and credentials; that must not happen again. If a measurement genuinely needs his live transcripts, stop and ask the operator.

---

## §As built — 318 (the integrator, 2026-10-03)

Written by the integrator in `/private/tmp/wt-p318` at `c1a5fd38`, with nothing committed, staged or stashed. It started
no Electron and no Simulator and held no lock; its three `xcodebuild` runs went through `build/simulator-run.mjs`'s
`xcodebuildRun` (no device, no test action) with `-derivedDataPath …/scratchpad/p318/dd-integrator`, deleted before it
returned. **An earlier run of this role was killed at 04:22 the same morning**, part way through `ablation:p313` and the
iOS builds. Its six seam edits (below) were re-read and kept; its two orphaned clones (`/private/tmp/p313-ablation-6195-…`,
`/private/tmp/p316-ablation-…`) and its DerivedData were removed; every gate below was run again by this run and none of
its results is reported here.

### The base (§4.1)

`git rev-parse HEAD` reads `c1a5fd38ba80483a6bad2619c893047d3ac4a5c9`, nothing is staged, and `git diff c1a5fd38` plus
the untracked files name 146 files (71 modified, with 7,518 lines added and 640 removed, and 75 new): the four
builders' lists (§10), the integrator's seam edits, `CLAUDE.md` and this file. None of 316.7's files is touched (`ListScreen.swift`, `SessionsScreen.swift`, `src/shared/session-gates.ts`), and
`git diff c1a5fd38 -- src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity/state-machine.ts
src/main/activity/screen.ts src/renderer/choice.ts` is empty.

### The seams, reconciled from both sides

| File (no builder's) | What it needed | Done |
| --- | --- | --- |
| `src/main/pocket/__tests__/ipc.test.ts` | two hand-built `PocketWrites` with `end` alone (`:1514`, `:1544`), and the route ids pinned at five (`:1712`) | each fake gains `choose` and `say`; the pin reads the seven ids |
| `src/main/pocket/ipc.ts` | the read composer's exhaustive switch says "no default arm" over the route ids | `case 'choose': case 'say':` beside `end`, all three returning null (writes never reach it) |
| `ios/Tortie/Screens/EndBatch.swift` | the switch over `PocketWriteAnswer.Reason` was no longer exhaustive (exit 65) | the seven new reasons join `.malformed?`, drawing the Mac's own sentence |
| `ios/TortieTests/EndTests.swift` | `"say"` was its example of a verb the app does not know | `"interrupt"` |
| `build/p317/probe-p317.mjs` | `ROUTE_LINE` and `WRITE_LINE` held 317's words, so its W1 arm failed at HEAD | the seven routes and the three clauses, and its self-test's route list |
| `build/p292/probe-p292.mjs` | its staleness list did not watch `src/shared/pane-report.ts` (the verbs builder's finding 5) | `SHARED_SOURCES` names it |
| `src/main/sessions/__tests__/p125-core-split.test.ts` | **found by this run**: "declares no method the list above does not name" read `['tmuxIdOf']` and failed; no builder's set ran it | `'tmuxIdOf'` added with its reason, as the file asks a phase to |

The pinned names agree across the four (each compiled against the others: `npm run -s typecheck` exit 0):
`createReplyVerbs`, `ReplyCore`, `PocketChooseInput`, `PocketSayInput`, `PocketStillAllowed`, `PocketReplyOutcome`,
`PocketReplyRefusal`, `PocketReplyOffer`, `PocketReplyDrawn`, `POCKET_NO_REPLY`, `replyTurns`, `nativeReadingOf`,
`tmuxIdOf`, `onInput`, `onChoiceMoved`, `choiceMarkOf`, the seven reasons, `POCKET_WRITE_SENTENCES.stopped` and the eight
`REPLY_*` sentences. `src/main/capabilities.ts` builds `createReplyVerbs({ core: () => pocketCore, turns: replyTurns })`
once and hands `choose` and `say` to `createPocketWrites` and `offer` to `createPocketFacts` as `replyOffer`, each as an
arrow; `GmuxCore` satisfies `ReplyCore` structurally.

### Where the build departs from or adds to this file, by builder

- **door.** `replyOf` in `routes.ts` enforces the offer's own rules (R1's invariants): only markers of options the same
  answer draws, in drawn order, once each; the press half all or nothing (question, mark and at least one marker, else
  null, null, `[]`, null); `canSay` only for exactly `true`. `question`'s shape admits a count of `0`, which the verb then
  refuses `changed`. Measured worst bodies: end 199, choose 267, a 4,096-byte text of C0 controls 24,771, the widest
  legal encoding of 1,024 emoji 12,483. Four `ablation:p313` anchors moved with the shapes (R2e, X3e, X5a, X12a).
- **verbs.** `readReply(session, kind, tmuxId, deps)` takes the `$`-id it read, so the final check holds it; the offer is
  composed in `reader.ts` (`replyOffer`) and the writer's `offer` delegates. **Claude Code 2.1.287 draws a NO-BREAK SPACE
  (U+00A0) after its `❯` on the composer row** (and after `⎿` before `Waiting…`), never noticed by §5.4.4's "`❯ `";
  `input-row.ts` accepts either, and the committed fixtures carry the real byte (it is in none of §0's forbidden
  classes). "No" must be a word, so an option reading `Not now` is not a deny. For Codex the prompt is the LAST `› ` row
  that is not an option row, because the real after-decline capture holds earlier transcript `› ` rows. The read-back
  compares the last 24 inked rows. **§7.2 against R4**: a 199-character question that is exactly `Bash <command>`, uncut,
  says its command whole, so all its options are pressable; the builder followed D12 and R4 and pinned it. The cursor
  read is the exported `CURSOR_FORMAT` (`'#{cursor_x}\t#{cursor_y}'`). `load-buffer` sits inside the `try`, so a failed
  load also runs `delete-buffer`.
- **phone.** `say` returns `SentWrite { result, write }`, so the model can keep the id the client really used and never
  mints one; an offer that is inconsistent reads as the empty offer, one with a missing or wrongly typed field refuses the
  whole session answer; the message box keeps his words and its line after any send that did not go through; after a
  sent message the screen does not reload, so `Sent` stays; the kept id is compared as UTF-8 bytes and counted from the
  first send. A pressable option is a SwiftUI `Button`, which merges its children, so a UI test reads
  `session-choice-press-n`. `.scrollDismissesKeyboard(.interactively)` on the Session screen. Build 6 in all six
  configurations.
- **proof.** `HELPER_USER_FLOOR` 162 → **163** (D27; whichever of 318 and 316.7 lands second sets 164). R4's pin moved on
  purpose from `d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6` to
  `0e8c9f46733b7fe7b706f071fa68bbedf135145757cef2e39d686feb9f5a7841` (`d95ecd27…` with 316.7's `GET /v1/sessions`).
  `probe:p318` R10 lets the first Codex press read `REPLY_NOT_TAKEN` honestly and requires the digit on the first
  question; P10 proves the re-sent id by one act line and one submit, because the relay cannot see the id through TLS;
  P4's remote row is R8's. The proof builder imported `measure-writer.mjs` once while its run code sat at top level, which
  started the live measurement for about 2.5 minutes on scratch socket `-L p318-v-11710-37b`; it ended that server and its
  five pids by pid, removed the directory, and put the run behind `isEntry()`.

### The integrator's own re-derivation (an independent method)

`…/scratchpad/p318/integrator/run2/rederive.mts` (written by the killed run, read whole and re-run by this one, which
added six arms and four plants marked `run2`) composes the SHIPPING door write path (`createPocketWriteHandler`) with
the SHIPPING `createPocketWrites` and `createReplyVerbs`, which no builder drove end to end (the door builder used a fake
`PocketWrites`, the verbs builder called the verbs directly), over fakes of its own: two Claude sessions drawing the
committed real screens, a recording `run` and control client, a microtask fence that numbers every synchronous run, and a
`Proxy` recording every member the verbs touch on the core. Its option reader is its own regular expression, not
`detectDialogRows`. **36 arms, 0 failed**: ORDER (the door's last check and the verb in one synchronous run;
the verb's final `still()`, its bump and its act in another; the capture the last read; for a message `load-buffer`
before the reading), ONCE (a re-signed write id types nothing again, a second press on one offer is refused `changed`,
two phones on one session give one keystroke and one `busy`, an End in flight makes a message on the same session
`busy`, a say re-sent under its id pastes nothing), NAMED (every tmux target is the named session's `$`-id or `%`-pane; a
body naming B with A's question id, a session Tortie does not hold and a row on another machine each compose no tmux call
at all), NO STATUS (the only core member reached beyond reads and the control client is `noteUserInput`, once for an
answered press whose id did not move, never when a hook moved it during the read-back, never for a message; a message on
a waiting row or while the agent reads `working` is refused with nothing pasted and its buffer deleted). **Its ablation**,
one plant at a time in a `cp -Rc` clone: eleven plants, ten red on the arm that owns them (an `await` before the bump, an `await` between the door's last check and the verb, no early question-id check, a status call in the say, the act aimed at the session rather than the pane, no per-session claim, a read after the capture, the gate's machine arm removed, `noteUserInput` on every answered press, the verb out of the ledger key), and the eleventh, the writer's idle test removed, green. The say's idle test is held TWICE, by the reader's early stop and by the
writer's final check; removing either alone leaves the arm green, removing both turns it red.

### The commands, each run once by this run

| Command | Exit | What it read |
| --- | --- | --- |
| `npm run -s typecheck` (after the seam edits, and again after the `p125-core-split` edit) | 0, 0 | 1,398 production files, 0 import violations, 0 runtime cycles, shared types OK |
| vitest, the targeted set (`src/main/reply`, `src/main/pocket`, `src/main/activity`, `src/main/attach`, `exec-plane.test.ts`, `src/main/sessions`, `src/shared`, `src/renderer/terminal`, `p316-phone-section.test.tsx`) | 1 | 135 files, 2,834 of 2,835: `p125-core-split.test.ts` read `['tmuxIdOf']`, fixed above; that file then 45 of 45 |
| `npm test` (the whole suite) | 1 | 1,050 files, 18,476 passed, 7 skipped, 1 failed: `src/main/proc/__tests__/guarded.test.ts`, "no pid in …/slow.pid", at a load average of 244 to 384 (other sessions' `npm ci` and builds); not in 318's delta, and 10 of 10 alone three times running |
| `conformance:pocket` | 0 | 83 rules, 15,094 checks; again after `npm run build`, 15,101 with `U5` reading the built `out/main/pocket-door.js` |
| `conformance:pocket:hostile` | 0 | 154 arms (119 at the parent) |
| `conformance:ios` | 0 | 30 rules over 35 app files, 39 test files, 85 files under `ios/`; (ae), (af), (ag), (s) build 6 |
| `conformance:phonecopy` (`copy-drift.mjs --self-test`) | 0 | phonecopy OK |
| `conformance:choices`, `:handback`, `:machines`, `:manager`, `:push` | 0 each | 27 clauses and 33 self-tests; PASS; PASS; 61 rules, 2,442 checks; 26 rules, 2,347 checks |
| `ablation:p313` | 0 | 271 of 271 ablations red on the rule that owns them, measured as a delta against a green base, every clone file restored by sha256, 1,585 s |
| `ablation:p316` | 0 | 257 of 257 arms red on the rule that owns them, 590 s |
| the builders' clause ablations, re-run from their scratch scripts over fresh clones | 0, 0, 0 | door 48 of 48 red (79 s); verbs 135 arms, 130 red and the 5 marked shadowed green (206 s); phone, built from a copy of this `ios/`, 67 of 67 red (182 s), its macOS harness 34 tests, 0 failed |
| the integrator's re-derivation and its ablation | 0 | 36 of 36 arms; plants as above, 10 of 11 red alone and the 11th red once the reader's early stop is removed with it |
| `gate:simulator`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 each | 2 against a floor of 2; byte for byte; hermetic; 163 against a floor of 163; 3 starters each ended in a `finally`; 19 scripts through `ssh-run.mjs` |
| `vectors.mjs --check`, `test-ios.mjs --self-test`, `hostile-door.mjs --self-test` | 0 each | 8 signed requests, 3 of them writes, 2 tampered write bodies; 30 checks; 42 arms |
| `measure-writer.mjs --self-test`, `probe-p318.mjs --grader-self-test`, `probe-p316.mjs --grader-self-test`, `probe-p317.mjs --grader-self-test`, `probe-p292.mjs --self-test` | 0 each | 7 graders and 25 clauses; 24 graders and 76 clauses; the reply group's 61 cases; 13 graders and 61 clauses; 76 fixtures |
| `xcodebuild build-for-testing`, Debug, Simulator SDK | 0 | TEST BUILD SUCCEEDED, 28.6 s, no warning in the app's sources |
| `xcodebuild build-for-testing`, Release (`ENABLE_TESTABILITY=YES`), Simulator SDK | 0 | TEST BUILD SUCCEEDED, 54.4 s, no warning in the app's sources |
| `xcodebuild archive`, Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO` | 0 | ARCHIVE SUCCEEDED, 32.1 s; `CFBundleVersion` 6, `CFBundleShortVersionString` 1.0.0 |
| `node build/p316/test-ios.mjs --read-app` on the archive, and on the Release Simulator app | 0, 0 | 1 and 12 Mach-O files: none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam |
| `npm run -s build` | 0 | 67 s; every gate inside it green, `conformance:ios` PASS, the contract inventory byte for byte |
| hidden characters over the 146 files | none | 0 control, bidi, zero-width, BOM, CR or trailing space; no tab outside `project.pbxproj`; 22 no-break spaces, all in Claude Code's real captures (finding above) |
| duplicated blocks of ten lines that 318 added | 21 runs | listed under the open concerns; none extracted |

### Open concerns, for the verifiers and the main session

1. **Nothing has run live yet.** `probe:p318`, `probe:p316` with its `reply` group on 26.3 and 18.3, `test:ios` in Debug
   and Release on both runtimes, `measure:p318`, `probe:p311` once and `probe:p292` once are the verifiers', under the
   lock; `smoke:t1`, `smoke`, `smoke:t3` and `package` start an Electron and were not run here. The phone builder could
   not prove these XCTests red without a Simulator: `testWentAwayStopsEveryLiveReplyRunner`,
   `testLeavingAtTheSendSendsNothing`, `testAReplyAsksNoOwnerCheck`, `testTheDrawingCarriesTheOffer`,
   `testASayUsesAKeptIdOnlyWhenWellFormed`, `testAChooseIsAskedOnce`, `testASayCancelledBeforeItBeganIsWithheld`,
   `testTheRepliesReachTheWriterThroughTheExistential`, `testTheReplyWritesAreTheDoorsByteForByte`, the
   `P318ReplyTransportTests` and `CopyTests`.
2. **Duplicated blocks, not extracted.** `build/p318/probe-p318.mjs` repeats `build/p317/probe-p317.mjs`'s scaffolding in
   eleven runs (the door's bring-up, pairing, the word readers, about 230 lines); it and `measure-writer.mjs` repeat
   `build/p332/probe-p332.mjs`'s `grade()`; `stand-in.mjs` repeats `build/p321/stand-in.mjs`'s command poll;
   `P318ReplyTransportTests.swift` repeats `P317WriteTransportTests.swift`'s door setup in three runs;
   `p318-monitor.test.ts` repeats `p311-question.test.ts`'s fake deps; `writer.ts` and `writer.test.ts` share one import
   list. Each follows the per-phase probe convention or is test-only, and extracting would edit 317's probe and tests,
   which nobody can run live in this round. A shared door-run module is a consolidation round's.
3. **A message's paste is one tmux list**, `copy-mode ; paste-buffer ; send-keys Enter`. If tmux refuses after the paste
   landed, the answer reads `failed` with "Tortie could not type into this session." while the words sit unsubmitted at
   the prompt. Not measured; as §5.6.2 step 8 is written.
4. **The say's idle test is held twice** (the reader's early stop and the writer's final check), so removing either
   alone reddens nothing; the verbs builder's W27 and this run's ablation both show it. Two guards, on purpose.
5. **Claude Code's no-break space** after `❯` is in the committed fixtures as the real byte. If a later round's scan
   treats U+00A0 as hidden, those fixtures are the exception, and `input-row.ts` must keep reading both spaces.
6. **§7.2 against R4**: a 199-character question that is exactly `Bash <command>` says it whole; the build follows D12.
7. **R16's race** (the verbs builder's finding 4): a stale `busy` read of Claude's registry committing `running` between
   the `PermissionRequest` hook and the registry's own `waiting` clears the hook's question, and that dialog then draws
   no button. The side that does nothing.
8. **`build/p316/vectors.mjs`** carries an mtime of 04:22:52 from the killed integrator run, after every other delta
   file; what that run wrote is not known. Its content is the proof builder's described change, it passes `--check`, and
   its scan is clean.
9. **`ios/Tortie/Screens/ConversationScreen.swift`'s header** still says nothing on the phone can type into a session
   "until Phase 318"; it stays true of that screen (no box is drawn there) and is no builder's file, so it was left.
10. **The 316.7 merge**: R4 becomes `d95ecd272da5fbab8eadd9379ecce4eace9fd69c963be996aa6726ae7a22cf77`,
    `HELPER_USER_FLOOR` 164, `probe-p317.mjs`'s `ROUTE_LINE` gains `sessions`, the build number per D30, and every
    shared file of §4.2 merges by blocks. `docs/BACKLOG.md`'s three in-place edits and the running-log lines are the
    main session's, and CHANGELOG's 316 item reworded by the proof builder ("Your Mac must be awake with Tortie open")
    is his to reword.

---

## §As built — the fix round (the fixer, 2026-10-04)

Written by the fixer in `/private/tmp/wt-p318` at `c1a5fd38`, with nothing committed, staged or stashed. Two lenses
answered `needs_work`: the attack lens (lens 1) and the run lens (lens 2). Every major and every minor is answered below.
One scenario was worse than today, a phone No leaving the Mac at needs input, and it is FIXED rather than removed; one
minor (the integrator's concern 7) is left as it fails, safe, with the reason. `HELPER_USER_FLOOR` stays 163 (no new
script reaches `build/electron-run.mjs`); R4's route pin does not move (no route changed); the menus do not move;
`git diff c1a5fd38 -- src/main/menu.ts docs/audits/contract-baseline.txt src/main/activity/state-machine.ts
src/main/activity/screen.ts src/renderer/choice.ts` is still empty, and none of 316.7's files is touched.

### 1. A phone No left the Mac at needs input (lens 2, major, worse than today): fixed

**What was wrong.** D16 and §5.6.1 step 8 released the session (`noteUserInput`, the desk's funnel) only when nothing
at all had moved the question id since the press, on the reasoning that whatever moved it had already spoken for the
status. A tick does not. A session at `needs_input` is captured on every tick; after a decline both real agents go from
their question straight to idle with no hook (Claude Code 2.1.287's registry goes `waiting` to `idle`, Codex 0.160.0's
title goes to the folder's name, by the capture step's own records); so a tick landing inside the 300 ms read-back
answered `choice-gone`, moved the id, and the release was skipped, while `commitVerdict` refuses `needs_input` to
`idle`. The phone said `done`, the Mac said Needs input, and the phone could not clear it (no box is offered on a
waiting row). The run lens measured 11 of 60 phone Nos stuck against 11 of 127 Mac keystrokes.

**The rule now** (`src/main/reply/writer.ts` step 8):
`if (later.hooks === at.hooks && !rows.atChoice) core.activity.noteUserInput(id);` — the release runs unless a hook
came since the press (it spoke for the status itself, and Claude's `PermissionRequest`, the one hook meaning waiting,
is the NEXT question) or the read-back screen draws a choice (the next question, or the same one again, which the
monitor's own tick speaks for). A `choice-gone` or a `status` bump raises no question; a desk keystroke since the press
released the session itself, and a second release is a no-op (`noteUserInput` acts only on `needs_input`). §Revision
R11's case, Claude approving A, running it and asking B, is held twice: B's hook moves `hooks`, and B's dialog is on
the read-back screen. The one window it does not hold is a dialog drawn after the read-back's capture and seen by a
tick in the few milliseconds before the synchronous release; that release is undone by the next tick, which reads the
dialog still drawn and raises it again from `working` (the numbered verdict and the agents' own readers both may), so
the cost is a flicker, where the old rule's cost was a status nothing could clear. D16, §5.6.1 step 8 and R11's summary
are amended in place, each marked "the fix round of 2026-10-04".

**Proof.** (a) `writer.test.ts` 37 tests: the R11 case now draws the next question on the read-back screen; new are
"the same choice still drawn: no release", "THE FIX ROUND'S CASE" (a `choice-gone` and a `status` bump inside the
read-back, each released once) and "a hook since the press over a screen with no choice: no release". Ablated four ways
by hand: the old count guard reddens 2, an unconditional release 4, the hooks clause alone 2, the screen clause alone 1.
(b) The run lens's own deterministic reproduction (`…/scratchpad/p318/run/vt/stuck.test.ts`, copied to
`…/fixer/vt/`, unedited), whose middle arm ASSERTS the bug (`noteUserInput` called 0 times), now fails that assertion:
called 1 time. (c) The integrator's re-derivation with two arms of the fixer's (a tick's `choice-gone`, and a `status`,
bumped inside the read-back): 38 of 38; its ablation, the M10 anchor moved to the new line and M10b (the count guard
back) added: 12 plants, 11 red (M10b on the two new arms) and M9 green as the integrator recorded (held twice).
(d) The verbs builder's ablation, W19 re-anchored and W19b to W19d added (count guard, no screen clause, no hook
clause): 138 arms, 133 red, the 5 marked shadowed green, 0 not as expected. (e) `conformance:pocket` Y6 now requires
the guard to name `.hooks ===` and `!….atChoice` and refuses a guard on the id's count; `ablation:p313` Y6a re-anchored,
Y6c (the count guard back) and Y6d (the screen clause dropped) added, 273 in all, each red on Y6. (f) `probe:p318` R20,
new: six No presses per agent at a random point in the tick, each graded on the stand-in's commit and on main's status
for 6 s while the stand-in idles at its prompt.

**Also found, not this phase's, owed.** The Claude registry reader (`src/main/activity/claude-registry.ts`) keys its
entries by pane id, takes whichever file it read last for a pane, and never asks whether the file's pid is alive. A
Claude Code ended hard (a crash, a SIGKILL, a power cut) leaves its `waiting` file behind, and after the private tmux
server restarts (a reboot) a new session given the same pane id reads needs input with its agent idle. It is the
parent's code and a status rule, so this round did not touch it; for 318 it fails safe (the message box is withheld,
because the native reading says waiting), but it wants an entry of its own.

**Not this phase's, and owed (for the main session to queue).** The run lens also measured a pre-existing Mac-side race
at both builds (about 9% with the stand-ins, 6 of 65 at the parent): the desk's own release lands before the agent has
updated its waiting signal, a tick re-reads that signal and raises `needs_input` again, and then the agent's idle is
refused. It is a status rule (§5.8 says every status rule does not move), it is the parent's, and at the Mac any
keystroke clears it. The phone's release lands 300 ms after its keystroke, after both stand-ins had updated their signal
in R20's trials, but a phone user has no keystroke to clear it if it happens, so it wants an entry of its own.

### 2. `test:ios` red on both runtimes (lens 2, major): fixed

`ios/TortieTests/SettingsTests.swift` reads `1.0.0 (6)` (D30; build 5 was 317's). `ios/TortieTests/TokensTests.swift`
needed the mocks to spell all fifteen token colours, and 318 had removed the only `#565B66` (`--text-disabled`) when it
took the message strip off `Session.html` and `Choice.html`, both screens that need input, where his ruling ("Only when
idle at its prompt") puts no box. The app still draws that colour, the strip's placeholder and its Send at rest
(`MessageStrip.swift:88`, `:113`), on a session idle at its own prompt, and no mock drew that screen. **Decision**: a new
mock, `docs/design/phone/Idle.html` ("3b · At its prompt"), an idle Claude Code session with the strip at rest above the
End bar and the tab bar; `TokensTests` reads ten mocks; `index.html` says fifteen screens. Its words and data are
`Composer.html`'s and `Session.html`'s, so `conformance:phonecopy` judges it with the rules that exist (15 screens, 397
segments, 61 owned rules matched, floor 61). Rejected: adding `Composer.html` to the test (it spells the iOS keyboard's
`#252931` and an arrow `#0D1117` the app does not draw), keeping a `#565B66` in a needs-input mock (a box his ruling
forbids there), retiring the token (the app draws it).

### 3. `probe:p318` could not test seven of its claims (lens 1 major, lens 2 major): fixed

`front()` brings the session's project forward (`__gmuxP95.openLocal`, which activates an open project) and then the
session, and reads back that it is active with its terminal drawn; `desk()` is TerminalPane's keystroke,
`noteTerminalInput` then `term.sendInput`; `report_()` is `sendReport`'s, the bytes alone; `recover()` brings a stand-in
back to idle by WORKING and never by withdrawing a question (the monitor keeps a withdrawn question at `needs_input` for
good, which is why R5, R14, R15 and R16 were refused `unsayable` before they tested anything); all 22 `idleAgain` calls
are `recover`. R9 fronts its session and grades a new clause, every trial's desk byte in the stand-in's log, and answers
the NEXT question at the Mac with its No; R11 fronts before it resizes, and because the window alone stops narrowing
the terminal at 79 columns (wider than option 2's 70), it narrows the rest of the way with the terminal's own zoom (⌘+
on its focused textarea, put back with ⌘0) and is unreadable unless the pane lands between the question row and option
2 (69 columns in the fixer's run); R13 fronts and types with `desk()`; R14's
`'a\;'` (which is `a;` in JavaScript) is `'a\\;'`; R17 fronts, adds five focus-report pairs and a device-attributes
answer down the report road, makes its five returns with `front()`, and grades that the control's arrow reached the
stand-in; R5 recovers first; RN's suffixes are `parent` and `headrn`, the same length, so the Catch Me Up line that
names the folder wraps at the same place; R18 skips `<profile>/gmux/snapshots/` (the quit-time scrollback holds a
delivered message as the agent drew it, exactly as it holds desk typing), counting and printing those hits. R15b recovers first,
waits until the stand-in holds one live Funnel child, and the probe's `forwarderPort()` dials the NEWEST live child
rather than the oldest: with R15 now running whole, its door off and on left the stopped child alive for a moment beside
the new one, and the fixer's first run read R15b red with no cut and no act, the relay having dialled the stopped
child (a staging defect of the probe, not of the door: the re-signed write 800 ms later acted once). Two more staging defects showed only in a run WITH the
parent, and both are fixed: the helper ends the scratch tmux server with each launch, so the HEAD launch's panes are
numbered from `%1` again, and the parent's ended Claude stand-in left `<pid>.json` saying `waiting` for `%1`, which
HEAD's `claude-a` was then given (the fixer's kept run: pid 50322 and claude-a both on `%1`); Tortie's Claude registry
reader keys by pane id and asks no pid, so `claude-a` read needs input with its stand-in idle and R5, R14, R15b, R16 and
R20 failed on it. The probe now sweeps the scratch HOME's registry files whose process is gone after the parent launch,
as Claude Code's own exit would have, and prints how many (1). And RN's lines differed only by each session's
`started HH:MM`, minutes apart at the two builds, so `normalizeRn` reads every clock time as `<time>` (a self-test case
each way). R20 is new (above). The grader self-test reads 25 graders and 80 clauses (24 and 76 before), each red on its own break.

### 4. `probe:p316`'s reply group never drove P6, P10 and P7 (lens 2, minor): fixed

After each of the waits `p6`, `p10` and `p7` the step list goes `back` then `open:<the session>`, which reads the session
as the screen's own `.task` does: the wait's pull alone did not, because after P5 the box held his words and had the
keyboard, and the drag dismissed the keyboard (`.scrollDismissesKeyboard(.interactively)`) instead of refreshing. P6
and P7 read UNREADABLE, never red, when no Send or no press was made (`sent`, `pressed`), with a self-test case each
(63 cases). The last arm counts only this run's devices, `p316-<pid>-`, and prints the others as another run's (the
nit). Driven live for the first time, P6 and P7 passed at once, and P10 read UNREADABLE twice with the phone's lines and
main's acts exactly a cut's (the first send acted and its words stayed, the re-send under the kept id acted nothing more,
the edit acted once): the door ends each connection after its one answer (one request per connection,
`Connection: close`), so its close beat the relay's own cut, the held answer never reached the phone, and the relay
counted no cut. The relay now counts that end as the cut it is (the phone had sent its request and the door's bytes were
held), holds by TLS record type rather than a 10 ms window (`tlsClientRecords`: the door's bytes pass until the phone
sends its first application data record, which is its Finished and then its request; two self-test cases), and writes
the cut connection's account into the report (`p10diag`).

### 5. `probe:p313`'s C0 still demanded 317's one write (lens 2, minor): fixed

`WRITES_ARE_318S`: the write rows are exactly `end`, `choose` and `say`, in that order, each a signed POST to
`/v1/<id>` alive outside any window, read from the shipping `door/table.ts`. When 316.7 lands it adds a READ route,
which this does not count.

### 6. R18's sentence (lens 1 minor, lens 2 minor): narrowed

§7.6's R18 row now excludes the sessions' own saved screens and says why; what 318 itself writes (its log line, its tmux
buffer, its process argv) still must hold no word of a message, and does.

### 7. The integrator's concern 7, a hook's question cleared by a stale `running` (lens 2, minor): left, fails safe

Not changed, on purpose. For Claude Code the dialog's rows are the same for every command in a folder, so the hook's
words are the only thing that says what Yes will run. Keeping them across a `status` bump would, if a later
`PermissionRequest` were lost (a hook server restart, a refused post), put one command's words over another command's
dialog and make Yes run what the phone never showed. Today that dialog draws no button and says "Answer this in the
session.", which is today's behaviour for every question. The run lens's own fix line allows landing with it accepted;
the operator decides.

### Files this round changed

`src/main/reply/writer.ts`, `src/main/reply/__tests__/writer.test.ts`, `build/conformance-pocket.mjs`,
`build/ablation-p313.mjs`, `build/p318/probe-p318.mjs`, `build/p318/SPEC.md`, `build/p316/probe-p316.mjs`,
`build/probe-p313.mjs` (new to the delta), `ios/TortieTests/SettingsTests.swift` (new to the delta),
`ios/TortieTests/TokensTests.swift` (new to the delta), `docs/design/phone/Idle.html` (new), `docs/design/phone/index.html`.
The delta is now 150 files: 74 modified and 76 new.

### The commands, each run by this round (the integrator's list, then the live runs)

The fixer held lock slot `electron.lock2` for the live runs, one at a time; its `xcodebuild` runs went through
`test-ios.mjs` and `probe-p316.mjs` with derived data under `…/scratchpad/p318/dd-fixer*`, deleted before it returned.

| Command | Exit | What it read |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,398 production files, 0 import violations, 0 runtime cycles, shared types OK |
| vitest, the integrator's targeted set | 0 | 135 files, 2,839 of 2,839 |
| `npm test` (the whole suite) | 0 | 1,049 files passed and 1 skipped; 18,480 tests passed, 7 skipped, 0 failed (60 s) |
| `conformance:pocket` | 0 | 83 rules, 15,101 checks (Y6 as amended) |
| `conformance:pocket:hostile`, `:ios`, `:phonecopy`, `:choices`, `:manager`, `:handback`, `:machines`, `:push` | 0 each | 154 arms; 30 rules, 85 files under `ios/`; 15 screens, 397 segments, 61 owned rules; 27 clauses; 61 rules; PASS; PASS; 26 rules |
| `gate:simulator`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 each | 2 against 2; byte for byte; hermetic; 163 against 163; 3 starters in a `finally`; 19 through `ssh-run.mjs` (again after the probe edits) |
| `vectors.mjs --check`, `test-ios.mjs --self-test`, `hostile-door.mjs --self-test` | 0 each | 8 signed requests; 30 checks; 42 arms |
| `measure-writer.mjs --self-test`, `probe-p318.mjs --grader-self-test`, `probe-p316.mjs --grader-self-test`, `probe-p317.mjs --grader-self-test`, `probe-p292.mjs --self-test`, `probe-p313.mjs --grader-self-test` | 0 each | 7 graders, 25 clauses; 25 graders, 80 clauses (and the normaliser's two cases); the reply group's 65 cases; 13 graders, 61 clauses; 76 fixtures; N1 |
| `npm run -s build` | 0 | 34 s, every gate inside it green |
| `ablation:p313` | 0 | 273 of 273 red on the rule that owns them (Y6a, Y6c, Y6d among them), 1,150 s |
| `ablation:p316` | 0 | 257 of 257, 385 s |
| the builders' clause ablations, re-run over fresh clones | 0, 0, 0 | door 48 of 48 (46 s); verbs 138 arms, 133 red and the 5 shadowed green, W19 to W19d red (77 s); phone, its macOS harness 34 of 34 and 67 of 67 red (125 s) |
| the integrator's re-derivation and its ablation, with the fixer's two arms | 0, 0 | 38 of 38; 12 plants, 11 red and M9 green as recorded |
| the run lens's deterministic reproduction, unedited | 1, as it must | its assertion of the bug (`noteUserInput` called 0 times) now fails: called 1 time |
| hidden characters over the 150 files | none | 0 control, bidi, zero-width, BOM, CR or trailing space; 22 no-break spaces, all Claude Code's real captures |
| duplicated blocks of ten lines 318 added | 21 runs | the integrator's same 21; none new |
| `test:ios`, iOS 26.3 | 0 | Debug 414 executed, 0 failures; Release 411, 0 failures; the archive and both apps read clean (no NetworkExtension, TailscaleKit, coverage or Release DEBUG seam); the write doors 3 ends, 2 presses, 5 messages verified |
| `test:ios`, iOS 18.3 | 0 | Debug 414, 0 failures; Release 411, 0 failures |
| `probe:p318`, HEAD only, run 1 | 1 | 21 passed; R15b red (the relay dialled a stopped Funnel child), R11 unreadable (79 columns), RN unreadable (no parent) |
| `probe:p318`, HEAD only, run 2 | 2 | 23 passed, 0 failed, RN unreadable (no parent); R11 at 69 columns, R15b green |
| `probe:p318` with the parent (`c1a5fd38`, extracted by `git archive` and built in scratch), runs 3 and 4 | 1, 1 | the registry collision and the clock times above (20 and 19 passed) |
| `probe:p318` with the parent, run 5 | 0 | **25 of 25**: RP; R0 to R20 (R20 12 of 12 done, 0 samples of needs_input in any trial; R9 16 of 16 refused `changed` with the desk byte on the question shown and no phone byte; R11 69 columns, both marks moved, both refused, Codex re-offered and Claude not, the still case done; R13 5 desk bytes kept, `unsayable`; R17 21 reports, the id unmoved, the stale press done, the arrow landed and the control refused; R15b cut after the act, one submit); RN, `/v1/session` p50 2.8 ms at the parent and 45.8 ms at HEAD; R18 0 hits outside the 7 saved-screen hits, 393 process samples, 0 buffers, 72 lines for 72 acts, the menus unmoved; RUN |
| `probe:p316`, `P316_ARMS=reply`, runs 1 and 2 | 2, 2 | 32 passed each; P6 (withheld, the not-taken line, no act, nothing in 20 s) and P7 (the digit landed, the screen moved on) driven and green; P10 unreadable, counting no cut (above) |
| `probe:p316`, `P316_ARMS=reply`, run 3 | 0 | **33 passed, 0 failed, 0 unreadable**: P1 to P8 and P10 on iOS 26.3 (P10: the cut connection's door answer held, 1,599 bytes, and ended by the door, the line `Your Mac did not answer. This is the session as it reads now.`, the words kept; the re-send under the kept id one act and one submit; the edit a fresh id), P9's P1 and P3 on the 18.3 floor, RH's eight hostile reply arms, RUN, Q1, N10, MD3, K2, no Electron and no Simulator of this run left |
| `probe:p313` | 0 | 26 arms, C0 among them: 13 of 13 contract channels answering and the write routes exactly `POST /v1/end`, `/v1/choose` and `/v1/say`, each signed (27 s) |

Counted once, at the end: no Electron of this round's runs is left (the 21 lines on the machine are the operator's own
dev Tortie, Cursor, Slack, Chrome, the release Tortie's crash handler and 316.7's reverifier's run), no `p316-` device of
this round is left (the one booted is 316.7's), no stand-in, scratch tmux server or harness directory of this round is
left, its derived data and the extracted parent are deleted, and lock slot `electron.lock2` is released.
`git -C /private/tmp/wt-p318 status` shows nothing staged and nothing committed; the delta is 150 files.

### For the reverifier

Re-run live, at least: the run lens's experiment over the phone's No (`…/scratchpad/p318/run/exp/probe-exp.mjs`,
`V_EXP=1`), which should now read the phone's stuck rate at or below the Mac keystroke's; `probe:p318` WITH its parent
(build `c1a5fd38` first), which this round read 25 of 25; `probe:p316` with `P316_ARMS=reply` (33 of 33);
`test:ios` on both runtimes; and `probe:p313`. Attack the new release rule where it is thinnest: a dialog drawn after the
read-back's capture and seen by a tick before the release (the flicker this round argues is self-correcting), and a hook
since the press that is not a question. A `PostToolUse` commits `working` itself, so it needs no release; a `Stop`
arriving straight after a press, with no `working` between, would commit `idle`, be refused from `needs_input`, and
leave the session where the old rule left it too. The capture step measured no hook at all after a decline from Claude
Code 2.1.287, so this round follows the run lens's own rule (no hook since the press, no choice on the screen) rather
than reading the hook's kind.
