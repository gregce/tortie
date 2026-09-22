# Phase 312 — the detector answers with rows, not a boolean

The spec is the phase's entry in `docs/BACKLOG.md` (`## Phase 312`). This file records only
what the build DID, where it differs from that entry, and the matrix the entry names as the
phase's own proof. It is written at integration, so every number in it was read off this
worktree rather than recalled.

The one sentence: `detectDialog` in `src/main/activity/screen.ts` has recognised a numbered
choice on any agent's pane since Phase 13 and threw the rows away in the expression that
computed the verdict. Those rows are now a second answer beside the verdict, they ride
`activity:changed`, and Catch Me Up draws them. **The verdict's own clause is untouched**, so
no status can move and the measured 57/57 recall and 0/386 false positives do not have to be
re-earned.

---

## §As built — every difference from the entry

### 1. `options: string[]` became `options: SessionChoiceOption[]`

The entry's literal signature is
`detectDialogRows(capture): { atChoice: boolean; question: string | null; options: string[] }`.
What ships carries `options: SessionChoiceOption[]`, which is `{ marker: string; text: string }`.

The split is made from the entry's own two capture groups —
`(\d{1,2})[.)]\s+(\S.*)$` names the marker and the text separately — and it is made once, in
the collector. The reason is mechanism 7's draw site: the phone mock
(`docs/design/phone/Choice.html`) draws a number chip beside each option's text, so a joined
row would make the desktop face a second reader of that grammar and the phone a third. The
marker is carried as the agent's own numeral and never as the array index, because an agent
that draws 1, 2, 4 — or that was caught half-repainted — would be misreported by a generated
one, and the numeral is the one part of the row a person acts on.

### 2. `question` is a field on `SessionActivityInfo`, not a member of the choice object

The entry says the question rides `activity:changed` beside `excerpt`, which is what shipped:
`question?: string` on `SessionActivityInfo`. It is NOT inside `SessionChoiceInfo`, so there is
one question field on the channel rather than two — which is what mechanism 6's precedence rule
needs to be expressible at all.

**Phase 311 declares the same field, with the same name, type and 200-character clip.**
Whichever phase lands second deletes one declaration. See the open concerns below: the
precedence itself is NOT implemented in this worktree, because the hook's question does not
exist here.

### 3. `CHOICE_MAX_OPTIONS` is 20; both character caps are 200

The entry requires "capped in count and each option in length, both as named constants with one
call site each" and does not name the values.

| Constant | Value | Where the value comes from |
| --- | --- | --- |
| `CHOICE_MAX_OPTIONS` | 20 | The build's own. The 24-row window already bounds the list, so this can only bite a screen that is nothing but numbered rows |
| `CHOICE_OPTION_MAX_CHARS` | 200 | Phase 311's `QUESTION_MAX` |
| `CHOICE_QUESTION_MAX_CHARS` | 200 | Phase 311's `QUESTION_MAX`, because both phases fill the same question field and a row cannot be clipped two ways |

A third constant exists rather than two because the entry asks for one call site each. A clip
appends `…`, because an option cut in silence reads as a different choice from the one the
agent drew. Every string passes `redactText` (`src/main/overview/redact.ts`) BEFORE the clip.

### 4. A clause the entry does not name: `choiceStart`

Collection begins at the LAST row in the window whose marker is `1`, and everything above it is
the screen rather than the choice.

It is not an optimisation. Without it the committed `gemini-trust-gate.txt` reads **four**
options — gemini leaves `4. Be specific for the best results`, from its "Tips for getting
started" list, eighteen rows above the dialog box and inside the 24-row window — **and loses its
question**, because the stray row sits below the real question and the question is taken from
above the first option. With it: three options and `Do you trust the files in this folder?`.
The LAST such row rather than the first, because a dialog is drawn at the bottom of the screen
and a numbered list above it is prose. It never has to guess: the verdict cannot be true unless
`OPT1` matched a row in the same window, so there is always a `1` to find.

`OPTION_WRAP_ROWS = 2` is also the build's own, for the entry's wrapped-option attack.

### 5. Where the clear is decided

The entry does not say how a choice stops being drawn. It is decided in `commit()`, the one
funnel every status change in the monitor passes through (`deps.onStatus` has exactly one call
site) — so it covers the poll, claude's hook and the person's own keystroke (Phase 9.2) alike —
and NOT by a capture, because a session that stops needing input may never be captured again and
a surface would go on drawing an answered choice for as long as it lived. `{ atChoice: false }`
is an explicit message, so no surface reads a clear out of an absence.

### 6. `atChoice` is gated on `needs_input`, and the gate is spelled once

Rows are put on the channel only while the state machine's state for that session is
`needs_input`. A dialog is on the screen for a tick or two before `DIALOG_CONFIRM_TICKS`
confirms it, and options drawn beside a `working` dot would be one surface contradicting
another. The gate is main's; `choiceOptionsFor` in `src/renderer/choice.ts` takes no status
argument, so no second surface has to remember it.

### 7. Fifteen agents is thirteen panes, plus a floor that is wider than fifteen

The entry counts fifteen registry rows. Two of them — `cursoride` and `copilotide` — are
`kind: 'ide'`, `launchable: false`, commented "capture-only: not a terminal process, never a
tmux pane" and "capture-only: app watcher, never a tmux pane". They have no pane, so no
`capture-pane`, so no choice, ever. **Thirteen rows can be at a choice, not fifteen.**

In the other direction the claim is WIDER than the entry's: `DEFAULT_ACTIVITY` in
`registry.ts` is `tier: 'screen'`, and its own header says the floor "must be good enough to
ship as the ONLY signal for an unknown CLI". An agent this build has never heard of gets the
screen read too, and therefore gets the rows too.

### 8. Universality is weaker than "every agent", and it is measured

The phase covers **every agent whose menu the existing verdict already recognises** — which is
not every agent. Three of the thirteen committed captures are real numbered choices the
detector cannot see, at the parent and at HEAD alike, and one agent does not number its options
at all. The clauses that miss them are `HINT` and `OPT1`/`OPT2`, the regexes the 0/386 floor was
measured with, and the entry forbids touching them. Widening them is a measured phase of its
own. Every miss is pinned in `p312-choices.test.ts` as a parent-equal miss, so a later round
that closes one has to move the line deliberately.

---

## The matrix

### The control — the floor did not move

Measured by extracting the parent's own `detectDialog` (`git show
a31999fc:src/main/activity/screen.ts`, which has no imports and loads standalone) and running
it against HEAD's over the same bytes, fixture by fixture. **The verdict moved on 0 of 13.**

| capture | parent | HEAD | options | question |
| --- | --- | --- | --- | --- |
| `claude-permission-prompt` | true | true | 3 | `Do you want to make this edit to note.txt?` |
| `claude-workspace-trust` | true | true | 2 | null |
| `codex-signin-choice` | true | true | 3 | null |
| `gemini-trust-gate` | true | true | 3 | `Do you trust the files in this folder?` |
| `antigravity-signin-choice` | false | false | 0 | null |
| `claude-theme-picker` | false | false | 0 | null |
| `muse-trust-gate` | false | false | 0 | null |
| `claude-idle` | false | false | 0 | null |
| `claude-post-answer` | false | false | 0 | null |
| `codex-idle` | false | false | 0 | null |
| `pi-idle` | false | false | 0 | null |
| `qwen-idle` | false | false | 0 | null |
| `shell-idle` | false | false | 0 | null |

The third option of the permission prompt — `3. No` — is carried for the first time; `OPT1` and
`OPT2` carry literal digits, so it has been invisible since Phase 13. `claude-workspace-trust`
is the gate that draws options with no question row, and it answers null rather than inventing
one. `claude-theme-picker` holds SEVEN numbered rows and must answer none, which is what proves
the "collect only where the verdict says yes" clause is doing work.

### Per agent

Five real dialog captures were taken for this phase, each from an agent started in its own tmux
under a scratch HOME with the credential environment scrubbed, read with `capture-pane -p -t
<paneId>` — the same call `monitor.ts` makes. No agent had an account, so no turn was taken and
no capture holds a line of anybody's conversation. They carry no control bytes, because
`capture-pane` without `-e` strips the escapes.

| agent | pane? | real dialog capture | verdict sees it | rows carried |
| --- | --- | --- | --- | --- |
| claude | yes | `claude-permission-prompt`, `claude-workspace-trust`, `claude-theme-picker` | 2 of 3 | 3 and 2; the theme picker is blind (no `HINT` and no `QUEST` phrase in the window) |
| codex | yes | `codex-signin-choice` | yes | 3, each with its indented subtitle joined on |
| gemini | yes | `gemini-trust-gate` | yes | 3, question carried, out of a `│ … │` box, with a stray prose `4.` correctly excluded |
| antigravity | yes | `antigravity-signin-choice` | **no** | 0 — its hint reads `↑/↓ Navigate · enter Select`, matching no `HINT` clause |
| muse | yes | `muse-trust-gate` | **no** | 0 — it draws `1  Trust and continue`, whitespace-separated, where `OPT1` needs `1.` or `1)` |
| qwen | yes | none (idle capture only) | unmeasured | gemini's renderer is forked byte-identical, so the shape matches |
| pi | yes | none | **would not fire** | its selector draws `const cursor = isSelected ? "> " : "  "` and no numeral anywhere, confirmed in `dist/modes/interactive/components/config-selector.js:329` and in `trust-selector.js` |
| cursor | yes | none | likely would not fire | no numeral pattern found in its bundle |
| deepseek, omp, grok, opencode | yes | none | unmeasured | compiled bundles; the registry rows are `tier: 'screen'` |
| droid | — | — | — | not installed on this machine, so not gradeable |
| cursoride, copilotide | **no** | — | — | structurally out of scope: `kind: 'ide'`, `launchable: false`, never a tmux pane |

Gemini's default numbering was confirmed independently of the capture: `showNumbers = true` and
`String(itemIndex + 1).padStart(` both appear in its shipped bundle.

Taking a real dialog for the remaining agents means signing each one in and steering it into a
permission prompt, which is the operator's credentials and tokens several times over. It is the
verifier's, not a builder's or an integrator's.

---

## What this phase does NOT do, as built

- **No press, no digit, no reply, no Enter.** The renderer's block holds no button, no anchor,
  no input, no `role`, no `tabindex` and no handler attribute, asserted over the rendered
  markup. The list is a `<ul>` and never an `<ol>`, because an `<ol>` generates its numerals
  from position and would quietly tell a person to press a key the agent did not offer. The
  block draws the phone mock's own line, `Answer this in the session.`, byte for byte.
- **Nothing is written.** The whole diff, new files included, contains no `writeFile`, no
  `mkdir`, no `rename`, no `unlink`, no `spawn`, no `exec`, no `homedir` and no read of `HOME`.
  No agent configuration is touched, which is why research 127 §10's six conditions remain
  unspent.
- **Nothing is logged.** The diff contains no `console.`, no logger call and no `log.` on any
  path that holds a row. `broadcastEvent` does not log its payload.
- **No new channel, no new status, no manifest column.** `docs/audits/contract-baseline.txt` is
  byte-identical after regeneration and zero lines moved: the inventory covers invoke channels,
  sqlite identity, storage keys, env names, smoke modes and bundle refusals, and has no section
  for interface members. `SessionStatus` gains no member and `state-machine.ts` still calls
  `detectDialog`.
- **No extra capture and no new cadence.** `detectDialogRows` reads the capture the tick already
  took; `MAX_CAPTURES_PER_TICK` does not move.

---

## §As built — the FIX ROUND (2026-09-21), every change and the verdict it answers

Two independent verifiers both answered `needs_work`. Between them they named three majors, five
minors and six nits. Every major and every minor is fixed at its named place below, with the arm
that proves it. **No clause of the detector's floor was lowered, so nothing had to be REMOVED
under the operator's standing rule** — every fix lands in the collector, which is a SECOND answer
computed beside the verdict, and the verdict's own loop is byte-identical to `a31999fc`. That was
measured, not assumed: the parent's `detectDialog` was extracted from the parent commit and run
beside this head over all thirteen committed captures, both padded and raw, and over every capture
the suite composes — **0 verdicts moved.**

### The three majors

**M1 — the three missing deliverables** (both lenses). `build/conformance-choices.mjs` and
`build/p312/ablation.mjs` now exist, both are declared in `package.json`, both are classified in
`build/verification-checks.mjs`, and CLAUDE.md's path-triggered table gains the row naming both
against `src/main/activity/screen.ts`. The gate asks **20 clauses** — the entry's eight, the three
about the draw site, five the fix round added, and the readers clause — reads source only and
spawns nothing, exactly as the entry specifies, because the BEHAVIOUR is driven over the thirteen
committed captures in the five p312 vitest files. It reads every file with its **comments
blanked**, and that is load-bearing rather than tidy: three clauses read FALSE on the shipping tree
before that view existed, because `CHOICE_OPTION_MAX_CHARS` is named twice in code and twice in
docblocks and `ChoiceBlock.tsx`'s own comment says the block is "never an `<ol>`", which is exactly
the string the no-`<ol>` clause looks for. `ablation:p312` breaks the SHIPPING source **17 times,
one clause each, and every arm reddens the check that owns it**; the entry's own arm — the verdict
made to read the generalised collector — is arm 1 and reddens clause 1. Every file is read once
before anything is written, restored in a `finally`, on a throw and on a signal, and proved by
sha256 after every arm. One needle carries the comment above it on purpose: `forget` deletes from
`choiceClears` four hundred lines higher with the same indentation, and the first spelling of that
arm edited the wrong occurrence and read GREEN.

**M2 — mechanism 6 had no code.** `src/main/activity/question.ts` is new and holds
`composeQuestion(fromHook, fromScreen)`: the hook's words win, an empty body is no answer rather
than a blank question, and the two are never merged. `choiceUpdate` fills the channel's `question`
through it and through nothing else. **It is called with a null hook argument in this worktree on
purpose** — Phase 311 is what produces a hook question — so 311's landing is a change to that one
argument rather than a decision about precedence taken after both halves exist. Clause 9 of the
gate refuses any other writer of the field, and `p312-question.test.ts` drives the precedence over
both arguments.

**M3 — the question was produced and read by nothing.** It is now drawn twice, which is what
mechanism 7 asks for. In the choice block it sits above the note and the rows, because it is the
sentence the rows answer. In the ⌘J attention row it takes the excerpt's own cell when main has
one: **a trade, stated.** That row has exactly one cell for what a session is saying, the panel is
560px wide, and a seventh cell would take width from the folder and the name that Phase 93 put
there. The two strings come off the same channel, redacted and capped the same way, and where both
exist the question is the better one — a blocked session's last screen line is usually the hint row
drawn UNDER the question. With no question the cell draws exactly what it always drew, asserted
both ways in `p93-attention-row.test.tsx`.

### The five minors

**L2-M1 — a numbered block drawn BELOW the dialog captured the whole collection**, so the options
came off the stray block while the gate's real question stayed drawn above them. It is the only
shape found in this phase that made the rows WRONG rather than absent, and the verifier built it
from claude's OWN numbered code gutter with one character changed. Two halves fix it, and both are
needed: `choiceStart` takes the lowest `1` whose markers from there down **only increase**, falling
back to the highest `1` when every block repeats or drops; and `collectOptions` **ends the block at
the first marker that does not increase**. A menu counts up; a gutter, a diff or a half-repainted
list does not. The attack and its one-character control are both in the suite, and the stated limit
— a CLEAN list below a dialog still wins, as at the parent — is in `choiceStart`'s own block and in
the entry's refusals.

**L1-minor-4 — only one of the three Catch Me Up levels drew the options**, and it is the level a
person reaches LEAST from a blocked session: the level is decided by where the keyboard is, so
pressing the chord while sitting in the session that is asking drew nothing at all. The block is
now ONE component, `src/renderer/overview/ChoiceBlock.tsx`, rendered by `ProjectLines`,
`SessionConversation` and `SessionColumns`. Three faces would have been three places to forget the
refusals. Gate clause 10 refuses a second draw site and requires all three levels; the suite
renders all three.

**L2-minor-3 — a stray "do you want" in the agent's prose became the question of a gate that asks
none.** The committed `claude-workspace-trust.txt` is that gate, and one prose line above it was
attributed to it outright. `collectQuestion` now walks UP from the first option and **gives up**
past `CHOICE_QUESTION_INK_ROWS` inked rows. Four is measured: gemini's box draws three inked rows
between its question and its options (seven raw, because the box pads with blanks), claude's
permission prompt draws zero, and the attack crossed eight. Giving up answers null, which is the
direction that has to be right — a miss draws nothing, where a wrong question puts one sentence of
the agent's on another sentence's gate.

**L1-minor-6 — a row with a THREE-digit marker was glued onto the option above it**, so a screen
drawing `1. Alpha`, `2. Beta`, `100. Hundred` came back as two options, the second reading
`Beta 100. Hundred`. `NUMBERED` is a new literal and a fifth clause of the wrap rule: a row a
person reads as numbered is never a continuation, whatever this module can make of its marker.

**L2-minor-5 — the count cap cuts in silence while the character cap marks.** Written down rather
than changed, and the reason is in `CHOICE_MAX_OPTIONS`' own block: the only shape the array
carries is an option with a marker a person could press, so a twenty-first row saying "and three
more" would be a row nobody drew with a marker nobody offered. Saying "there were more" needs a
COUNT field on the channel, which is a contract change and not a constant. It is now also a refusal
in the entry.

**L1-minor-5 — the entry's universality claim was measurably too strong.** Corrected in place,
with the verifier's live drive of eleven installed agents as the measurement: thirteen rows can
have a pane, five of the eleven installed draw a real numbered choice, the measured verdict sees
two of them, and every unregistered CLI is covered through `DEFAULT_ACTIVITY`'s screen tier. Three
more stale statements in the entry were corrected: the "no committed codex, gemini or qwen dialog
capture" sentence, the `buildProjectLine` citation, and `detectDialogRows`'s signature.

### The nits

**Fixed, because it loses an option.** `OPT_ANY` now carries the `s` flag. Without it a row holding
a stray CR, U+2028 or U+2029 after the first character of its text made the collector fail where
the verdict's `OPT1` — which has no `.*` and no `$` — still matched, so the verdict was TRUE with
that option MISSING from the list. With the flag, `OPT1` matching implies `OPT_ANY` matching with
marker `1`, which also means `DialogRows` can no longer hold `{ atChoice: true, options: [] }`.

**Fixed, because it is a message that did not exist at the parent.** `choiceUpdate` returns null
when the mark would be `NO_CHOICE_MARK` and none was ever set, so a session that was never at a
choice is told so ZERO times rather than once. It is the question `noteChoiceGone` two methods
below already asked, answered the same way.

**Fixed, and one guard REMOVED with it.** The clears are drained AFTER the verdicts, because a
clear is decided BY a verdict and draining first shipped this tick's clear on the next one. The
first spelling added a second guard in the drain; the ablation proved that guard could be deleted
with nothing going red, because `choiceUpdate`'s own `choiceClears.delete` already does the work.
Two guards for one rule are two places it can be removed in silence, so the second one is gone and
the reachable shape — a hook out of `needs_input` and back in before the tick — is driven in
`monitor.test.ts`.

**Stated, not changed.** The wrap join puts a space back where a terminal hard-wrap put none, so a
secret split across the wrap travels; the fix needs the pane width and the rstrip destroys exactly
that, and guessing it from the widest row would run real wrapped words together on any screen
holding a box. The OPT1/OPT_ANY anchoring asymmetry is now closed by the `s` flag and the remaining
structure is written down. And `detectDialogRows` is computed twice per tick on a pane at a choice:
measured at 1.78 → 13.12 µs worst case and 4.64 → 8.99 µs on a real gemini gate, which at six
captures a second is under 80 µs/s, so the sentence in the module says the second computation is
deliberate.

### What the fix round did NOT do, and why

- **No new capture.** The verifiers' finding that qwen's and omp's provider gates number nothing
  is recorded here and in the entry rather than committed as fixtures: taking a capture means
  driving a real agent on a scratch tmux server, which is the verifier's step and not a fixer's.
- **No app run, no probe, no Electron, no `npm run build`.** A fixer's commands are `typecheck`,
  the targeted vitest files, the two new scripts and `contract-inventory --check`. The reverifier
  drives the app.
- **No widening.** No press, no digit, no reply. The blind menus — claude's theme picker,
  antigravity's login, muse's trust gate — are still blind at this head exactly as at the parent,
  because reaching them means widening `HINT` or the separator, which is the measured floor and a
  phase of its own.

## §Reconciled onto 311

Phase 311 landed first (`a6aec811` plus `d27acd8e`). This section is the round that made the two
phases one tree. It is not a merge: the source of 312 predicted this round in writing, in the comment
above `composeQuestion`, and what was owed was a wiring line, a judgement, and the tests that encode it.

### 1 — The hook argument, wired

`choiceUpdate` called `composeQuestion(null, rows.question)` and wrote `update.question` itself;
`uiUpdate` then wrote the same field from `st.question`, the hook's half, twenty lines later. **The
wiring was not one line, and the reason is that the two halves were two WRITERS of one field on one
tick.** The later line won by position, and only the hook's half was tracked in `questionOnWire` — so
a screen question went out and was never cleared.

What the round did instead, and it is item 2's answer: **`uiUpdate` is the ONE place the question is
decided.** `choiceUpdate` now returns `SessionChoiceInfo | null` and answers about the CHOICE alone,
stamping the screen's reading onto the state as it goes; `uiUpdate` composes
`composeQuestion(e.st.question, e.st.screenQuestion)`, compares it against `questionOnWire`, and makes
the one assignment. `conformance:choices` clause 9 now pins the call's two arguments AND that
`update.question` is assigned exactly once in `monitor.ts`.

`SessionState` gains `screenQuestion: string` beside `excerpt` and `question`. The screen's reading is
HELD rather than recomputed because a blocked session is not captured on every tick —
`MAX_CAPTURES_PER_TICK` is 6 and a pane in copy mode is not captured at all — so a composer that read
the screen only when a capture arrived would blank the question on those ticks and send it again on the
next, flickering the row at 1 Hz. `ablation:p312` arm 20 is that ablation and it goes red.

The "IT IS DELIBERATELY CALLED WITH A NULL HOOK ARGUMENT IN THIS PHASE" paragraph in `question.ts` is
gone, and the paragraph that replaced it says both arms are wired and what a later round is looking at
if it finds one unused again.

### 2 — The judgement: a Claude dialog with no hook draws the SCREEN'S question

Decided on the merits, from the tree and both entries, and it is a PRECEDENCE rather than a per-agent
filter — `composeQuestion` takes two strings and knows no agent id.

1. **It is the line Phase 311 opens by naming.** 311's Semver: a blocked row "draws the last inked line
   of the screen, which for every committed Claude dialog is the hint row — `Esc to cancel · Tab to
   amend` — while the question the agent actually asked sits five lines above it". In
   `claude-permission-prompt.txt` that question is line 18 and the hint row is line 23. The screen's
   `QUEST` row IS the line 311 says a person wants. Suppressing it for Claude keeps the defect for
   exactly the rows both phases were written for.
2. **Claude has real hookless dialogs, and 311 says so itself.** Its own test comment: "Claude's own
   workspace-trust dialog fires no hook, which is why the first blocked row after a restore was exactly
   the row that was wrong." The theme picker is another. Filtered out, those rows keep drawing the hint.
3. **312's mechanism 6 contemplates both existing for Claude and says which wins.** "For a Claude
   session both answers can exist … the hook's wins." That is precedence. Exclusivity would have needed
   an agent argument, and neither entry asks for one.
4. **Claude's OPTIONS are already drawn from the screen** — the committed Claude fixtures are what
   312's option regexes were measured on. Drawing Claude's options with no question above them, while
   every other agent gets both, is incoherent.
5. **The safety argument does not move.** The screen's question passes the same `redactText` and the
   same 200-character cap, and `screen.ts` already prefers a MISS to a lie: a question it cannot place
   within `CHOICE_QUESTION_INK_ROWS` answers null, which is what `claude-workspace-trust.txt` does.

The hook still wins where both exist, which is now proved live in the monitor rather than only on the
function.

### 3 — The tests, and what each one says now

No test was weakened. Across the five files: **259 `expect(` to 298, and 123 `it(` to 129.**

| Arm | It asserted | It asserts now | Why the new one is the truth |
| --- | --- | --- | --- |
| `puts it on the wire once…` | two ticks of the dialog fixture put NO question on the wire | they put the fixture's own `QUEST` row on it, and the hook's answer then REPLACES it | the precedence, driven through the monitor for the first time; before, no arm proved the hook wins over a screen that has an answer |
| `ignores a null or empty question…` becomes `a hook with no question of its own adds nothing and BLANKS nothing` | a null hook draws nothing | a null or empty hook leaves the screen's answer standing, and contributes nothing of its own on a screen with no answer | `composeQuestion`'s own rule ("a hook that fires with no body must not blank the row the screen can still read"), asked of the monitor. Two arms where there was one |
| `clears it after a forget that keeps the handback` | hook question, then the clear | the screen's row first, then the hook's over it, then the clear | same clear, plus the precedence on the way in |
| `clears it after a forget that keeps NOTHING` | the clear, then silence | the clear ONCE, then the GATE'S OWN question, because the dialog never left the screen and the new life is genuinely blocked on it | silence would mean a blocked row drawing the hint line again |
| `draws the true screen line on a session restored at a dialog that fires no hook` | `question: ''` and the gate's last inked line | unchanged, and it now proves MORE: the workspace-trust gate's question is six inked rows up and in words `QUEST` does not match, so a miss is still a miss and 312 invents nothing | the arm survives the judgement rather than contradicting it |
| `says nothing about the question on an ordinary tick` | three ticks of the DIALOG fixture say nothing | three ticks of a QUIET screen say nothing | a blocked session at a readable gate IS news; saying nothing about it is the defect both phases exist to fix. The "ordinary tick" is the session that never blocks, which is the half of the old arm that was always the point |
| `monitor.test.ts` `sends the new rows when the agent draws a different choice` | `question` UNDEFINED on a gate-to-gate change | `question` is `''`, the explicit clear | THE REVERIFIER'S RECORDED HOLE. Absent is "no news", so the row went on asking `Do you want to make this edit to note.txt?` over a folder-trust gate |
| `monitor.test.ts` `sends one message per session per tick` | `{ sessionId, excerpt, choice }` | `{ sessionId, excerpt, question: '', choice }` | the clear rides the one message, and `toEqual` is exact, so the added key is a stronger claim |
| `p312-choice.test.ts` `readQuestion` of an empty string | `undefined` | `null`, main's own clear | the function's own doc predicted it: "When Phase 311 lands a question that outlives a choice, it sends its own clear and this reader gains the `null` arm" |
| `p312-choices-drawn` `draws no question for a session that is not at a choice` | the whole row byte-identical to a row with no question at all | no BLOCK, and Phase 311's own cell says it once, with the rest of the row unchanged | a hook fires for tool calls that draw no numbered choice, which is the whole reason 311's cell exists |
| `p311-question-row` `applies the question…` | the raw unchecked read of the update's own field | `readQuestion(u)` once, that field named nowhere, and exactly ONE delete | the store held three lines deciding one record |

Six arms are NEW: `drops the hook's sentence when the screen draws a DIFFERENT gate`, `keeps the
hook's sentence while the screen holds the SAME gate` (its control), `holds the screen's question
through ticks that capture nothing`, `draws the SCREEN'S question on a session restored at a gate it
can read`, `says the screen's question ONCE, and then carries news and not a heartbeat`, and `says the
question ONCE on a row that is at a choice`.

### 4 — The clear, across both phases, and the two holes that were left

- **The screen's question was never cleared.** Fixed by the single decision point: `questionOnWire`
  now tracks the COMPOSED answer, so the clear fires whatever source filled it. Proved by
  `monitor.test.ts`'s gate-to-gate arm flipping from `undefined` to `''` and by ablation 21.
- **The hook's sentence outlived the gate it named.** Not in either phase's tests, and the wiring
  CREATED it: a session that answers one gate and is shown another with no second hook never leaves
  `needs_input`, so 311's clear — which runs when the WAIT ends — never runs, and the hook's stale
  sentence won over the truer reading of the gate now on the screen. The hook's answer is now dropped
  when the screen's own choice moves from one REAL choice to a DIFFERENT one. `had === undefined` and
  `NO_CHOICE_MARK` are deliberately not that signal, because the hook arrives BEFORE claude's frontend
  paints the dialog — the control arm pins it. Ablation 22 is the proof it can go red.
- **The renderer had the same duplication.** `subscriptions.ts` held an unchecked read of the update's
  field (311's) AND a delete keyed on the choice clearing (312's compensation for main omitting the
  clear). `readQuestion` gained its `null` arm, the store reads through it alone, and the choice going
  away no longer says anything about the question.
- **One visible collision, drawn.** A Catch Me Up row at a choice drew the same sentence twice, once in
  311's `overview-line-question` cell and once as the block's subject. The question is drawn ONCE:
  311's cell when there are no rows under it, the block when there are. `atNumberedChoice` is asked
  rather than re-spelled. `ChoiceBlock` gains 311's measured `title`, so a 200-character question keeps
  its tail at all three levels — the two that never had 311's cell gain it.
- **The contract's own doc block** had lost `SessionStatus` gains no member and the clear's sentence in
  the resolution, and still said one phase would delete the other's declaration. Both repaired.

### 5 — The floor, re-proven

Method: the PARENT's own `screen.ts` extracted from `a31999fc` and both `detectDialog`s run over the
same bytes — 13 committed fixtures plus 7 inline shapes (empty, one blank line, prose with a stray
`do you want`, a tidy numbered list, options with no hint, a CRLF gate, a gutter under a gate).

**20 captures, 6 fired at the parent, 0 moved.** `screen.ts` is untouched by this round.

### 6 — What was run

| Check | Result |
| --- | --- |
| `npm run -s typecheck` | clean, 0 errors; 7,593 imports and 0 boundary violations, 0 cycles |
| `npx vitest run --no-cache src/main/activity src/renderer/app src/renderer/overview src/renderer/state src/renderer/__tests__` | 152 files, 2,823 tests, all pass |
| `npm run -s conformance:choices` | PASS, 20 of 20 clauses |
| `node build/p312/ablation.mjs` | OK, **23 of 23** ablations reddened the check that owns them (6 are this round's), every file back byte for byte by sha256 |
| `npm run -s conformance:phonecopy` | PASS |
| `node build/contract-inventory.mjs --check` | OK, byte for byte against the baseline |
| `node build/assert-background-teardown.mjs` | PASS |
| `node build/assert-electron-teardown.mjs` | PASS, floor 148 |
| `node build/verification-checks.mjs` | PASS, exit 0 |
| control bytes | **0** across all 17 files this round touched, counted in node over code points |

One control byte was FOUND and removed rather than introduced: `p311-question.test.ts` carried a raw
U+009F inside the last entry of the hostile-shapes array, landed by Phase 311's own commit, on a line
that reads as ASCII carrying two escapes. It is now written as an escape, which composes the identical
string and says what the shape is for.

### What this round did NOT do

- **No Electron, no probe, no app run, no `npm run build`, no package, no smoke.** Every command under
  90 seconds.
- **No change to `screen.ts`**, so the detector's floor is untouched and was re-proven rather than
  re-earned.
- **No press, no digit, no reply.** The options are still drawn and never pressable.
- **No widening of `QUEST`.** The gates whose question cannot be placed still answer a miss.
- **No per-agent filter on the question.** The precedence is the whole mechanism, and adding an agent
  id to `composeQuestion` is what refusing the judgement above would have cost.
