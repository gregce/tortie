# Phase 311 — the question the hook already delivers

The spec is the Phase 311 entry in `docs/BACKLOG.md`. This file is the
integrator's record of what was BUILT, and it exists for one reason: every
place the built thing differs from the entry, so the verifier reads the
difference here instead of discovering it.

## §As built

Numbered against the entry's own mechanism numbers where one applies.

### 1. `gate:contract` does not move, and mechanism 4's obligation cannot be met

Mechanism 4 says `docs/audits/contract-baseline.txt` is "regenerated in the same
commit with the moved line named in the body". **No line moves, and the commit
body must say so rather than name one.**

`build/contract-inventory.mjs` inventories six sections — `[ipc.invoke.channels]`,
`[sqlite.*]`, `[localStorage.keys]`, `[env.names]`, `[harness.smoke.modes]` and
`[bundle.refusals]`. It never inventories an EVENT channel: the baseline holds
`activity:noteInput` (an invoke channel) and does not hold `activity:changed` at
all. `SessionActivityInfo.question?` is an optional field on the payload of an
event channel, so the inventory is unchanged. Re-derived twice, at the parent and
at HEAD: `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`
rewrites the file byte-identically, and `--check` exits 0 with "the inventory
matches docs/audits/contract-baseline.txt byte for byte".

### 2. Both the clip AND a cap of its own, in that order

Mechanism 2 says the composed text goes "through `redactText` and then through a
clip of its own, `QUESTION_MAX = 200`". The builder brief said it should reach
the EXISTING `clip` "rather than new ones". `clip` (`src/main/overview/turn-view.ts:30-33`)
is hard-wired to `CLIP_CHARACTERS = 4_000` and takes no length, so the two
readings cannot both be literally true of one call.

As built, `src/main/activity/question.ts:153-158` does:

```
clip(words).text  ->  redactText(...)  ->  slice(0, QUESTION_MAX)
```

The order is deliberate and it is the opposite of the entry's. `clip` FIRST
bounds the input to the redactor, which is a real defence rather than a tidiness:
`SECRET_PATTERNS` holds twelve regexes, one of them a `[\s\S]*?` private-key
rule, and a 1 MiB `tool_input` would otherwise be walked by all twelve. The 200
is applied LAST, so it is the drawn cap and nothing a 4,000-character cut could
split can reach the answer — only the first 200 characters are ever returned.
Redaction still runs over every character that can reach the row.

### 3. The composition is `<tool_name> <value>`, and the mock's shapes are owed

Mechanism 5 says "the new sentence is the only new string in the shipping code",
and the Semver paragraph says the row says what is being asked "in the agent's
own words". So the leaf composes the tool's name and the one telling value of
its input, joined by one space, and writes no sentence: `Bash rm -rf build`,
`Edit /Users/example/webapp/src/auth/session.ts`, `Task` on its own.

`docs/design/phone/Main.html` draws `Run rm -rf build?` and `Apply patch to 4
files?`. **Neither is owned by any module and neither is producible by the
leaf** — `Apply patch to 4 files` would need a count of files that no telling key
gives. The ledger classifies the shape as `data`, and the integrator rewrote its
reason, which had said the shape was "composed in main from the hook body". It is
not; it is the mock's illustration. **This is the ledger's one soft spot and the
verifier should know it**: the rule is a regex (`/^(?:Edit|Run|Apply patch to)
.+\?$/`) rather than a comparison against the leaf, so the mock can draw a
question shape Tortie does not compose and the gate will pass it. Classified
`data` rather than `owed` because no phase is queued to write such a sentence,
and mechanism 5's "the new sentence is the only new string in the shipping code"
is why none was written here. **CLOSED IN THE FIX ROUND — see §F4 below.** A
verifier attacked exactly this and the gate exited 0; the shape rule is now three
rules declared by their exact words, with an ablation.

The telling keys, in order, first own key holding a non-empty string winning:
`command`, `file_path`, `notebook_path`, `pattern`, `url`, `query`, `path`,
`description`. What is absent is the point — `content`, `new_string`,
`old_string` and `prompt` carry the body of a file or the text of a turn, and
leaving them out is a cheaper promise than clipping them would be.

### 4. The clear is driven by the STATE, and it travels as an explicit empty string

The entry does not say what ends a question. As built there is no second hook:
`uiUpdate` (`monitor.ts:979`) sets `e.st.question = ''` whenever the session is
not `needs_input`, so a wait ended by the person typing into the pane, by the
dialog leaving the screen or by any other route clears the row on the next tick.
The clear rides the wire as `question: ''`, never as an absence, carrying Phase
141's sentence at `sessions.ts:187-199` in the same words. The renderer deletes
the record on `''` and leaves it alone on `undefined`
(`subscriptions.ts:828-835`). The two halves agree.

`forget(id, true)` carries `questionSent` across (`monitor.ts:391-397`) so the
clear survives the accelerated path claude's own `SessionEnd` takes. **SUPERSEDED
BY §F1 BELOW.** That covered ONE of the four forgets, and both verifiers drove the
other three: the memory no longer lives in the state at all.

### 5. The question rides the next poll tick, not an out-of-band broadcast

Set and clear both live in `uiUpdate`, which is where the excerpt is stamped, so
the channel's own promise of at most one message per poll tick
(`sessions.ts:171-174`) is kept. **`probe:p311` must allow one tick — up to about
a second — between the POST and the read.**

### 6. `noteHookEvent`'s new parameter is THIRD, and `reason` moved to fourth

`noteHookEvent(sessionId, state, question?, reason?)`. `reason` had no caller at
the parent (`origin/main:src/main/sessions/core.ts:947` passes two arguments) and
has none now, so nothing positional broke. There is exactly one call site,
`src/main/sessions/core.ts:955`.

### 7. Mechanism 6 was unbuilt by either builder and is built here

The entry's mechanism 6 — "the phase adds a rule to the copy gate below that no
file under `src/main/activity/` names a log call on a line that can reach the
body or the question" — was in neither builder's assignment and neither wrote it.
It is now in `build/p311/copy-drift.mjs` as a second rule beside the copy
judgement, and it reads what it is about rather than a list:

- Every production `.ts` under `src/main/activity/` is read (11 modules today).
- Log call sites are DISCOVERED by shape — `log.info(`, `console.error(`,
  `logLine(` and the rest — and each call's arguments are taken by matching
  brackets, with comments blanked first so prose can neither satisfy nor break a
  rule.
- A call whose arguments name `body`, `payload`, `question`, `tool_input`,
  `tool_name`, `toolInput`, `excerpt`, `capture`, `screen` or `prompt` as a whole
  word fails by file and line and the word it named.
- `question.ts` may name NO log call at all, honest or not.
- `LOG_CALL_FLOOR = 2` asserts the finder still finds the two honest calls that
  exist (`hooks.ts:716` and `:734`, both `usage.tap.*` with a fixed reason word).
  A needle that stops matching is how `conformance:handback` passed for 1,156
  commits while the thing it guarded was unguarded.

Four ablations run under `--self-test`, three red and one green:

| Ablation | Must be |
| --- | --- |
| a log call in `hooks.ts` naming the body | red |
| a log call in the question leaf, even one naming nothing | red |
| a log call naming the composed question | red |
| **control:** an honest log call carrying a fixed reason word | **green** |

The control is what stops the rule degenerating into a ban on logging.

### 8. Two real drifts in the mock, fixed by the integrator

`conformance:phonecopy` was RED on its first run, on two strings nobody planted.
Both fixes are in the MOCK, because the gate's charter is that the mock may not
invent a word Tortie does not say, and in both cases Tortie is the one telling
the truth:

| File | Was | Now | Tortie says |
| --- | --- | --- | --- |
| `docs/design/phone/End.html:41` | `End ‘nightly-tests’?` (U+2018/U+2019) | `End 'nightly-tests'?` | `` title: `End '${session.name}'?` `` — `src/renderer/state/resume.ts:998`, ASCII |
| `docs/design/phone/Choice.html:40` | `Grok CLI · docs-site` | `Grok · docs-site` | `displayName: 'Grok'` — `src/main/agents/registry.ts:1386`. `Grok CLI` exists only in two test fixtures |

The first is precisely the curly/straight failure the entry names as the gate's
proof fixture, found for real rather than synthetically.

### 9. `OUTCOME_WAITING` keeps its full stop, and the mock is why

`The agent is waiting for you.` ends with a stop and its nine sibling `OUTCOME_*`
constants do not (`'Answered'`, `'The agent is still working'`, `'Done, and git
agrees'`). The entry writes the stop inside the backticks, and **the mock draws
it with the stop on two screens** — `docs/design/phone/Choice.html:44` and
`Session.html:44`. The mock is Phase 309's own deliverable and the operator saw
it, so the stop is kept. If house consistency is wanted instead it is one
character in `copy.ts` and one in the ledger.

### 10. Two ledger transforms declared rather than failed

Both are real differences between the phone's copy and the desktop's, named here
so the choice is reviewable:

- **Status words are sentence-cased on the phone.** The mock says `Working`,
  `Needs input`, `Failed (exit 1)`; `src/renderer/app/status.ts` says `working`,
  `needs input`, `failed (exit …)`. Declared per rule as a named `sentenceCase`
  transform — first character only, every other byte still compared — with the
  reason that the label starts a line on the phone. Six one-word mock edits and
  dropping the transform from six rules would make the phone lowercase instead.
- **The mock's `read 4:32 PM` is 12-hour and `formatReadClock`
  (`src/renderer/overview/clock.ts:57-60`) is 24-hour `HH:MM`.** The WORD `read `
  is pinned against `readAtHeader`; the clock is declared as data, with the
  reason that digits are a formatter's output and the phone's formatter is the
  device's.

### 11. Raw control bytes shipped in three files and were escaped

`src/main/activity/question.ts` (2 lines), its test (4 lines) and
`build/p311/copy-drift.mjs` (2 lines) carried raw C0 bytes — ESC, NUL, BEL, BS,
US, DEL. `src/shared/__tests__/source-scan.test.ts` forbids any byte under 0x20
outside tab, newline and return in `src/`, and it was RED. Every one is now a
`\uXXXX` escape and the test passes. No behaviour changed: the regexes and the
fixtures are the same characters.

### 12. One off-by-one in the entry's citations

The entry gives `SECRET_PATTERNS` at `redact.ts:31`; it is `:32` (line 31 is the
last line of the vendored-extract comment). Every other citation in the entry was
checked and is exact, including `MAX_BODY_BYTES` `:133`, `isSubagentPayload`
`:117-127`, the four dropped lines `:438-441`, `onEvent` `:136`,
`claudeHookSettings` `:514-543` with `PermissionRequest` at `:533`,
`claudeHookDir` `:450-452`, `claudeHookSettingsPath` `:454-456`, the log rule
`:186-190`, `excerptFromCapture` `screen.ts:102-109` with `EXCERPT_MAX = 120`,
`noteHookEvent` `monitor.ts:397-404`, `uiUpdate` `:921` / `:928-932`,
`EVT_ACTIVITY_CHANGED` `sessions.ts:179`, Phase 141's sentence `:187-199`,
`clip` `turn-view.ts:30-33`, and `registry.ts:333` / `:547`.

### 13. Not built, and why

- **`probe:p311` does not exist.** The entry's ONE app run is unwritten and was
  in no builder's assignment. Builders and the integrator are forbidden from
  launching Electron, and an untested probe is worse than none. `data-question`
  on `.attention-excerpt` (`AttentionOverlay.tsx:151`) was added for it to read.
  **WRITTEN IN THE FIX ROUND — see §F2 below.** Both verifiers called its absence
  major: a named app run that does not exist is a reader a later round cannot
  re-run.
- **The excerpt is still not redacted.** Untouched on purpose — the entry's own
  refusal. No `redact` reaches `screen.ts` or `uiUpdate`'s excerpt branch.
- **Nothing for the other fourteen agents.** Phase 312's.

## What was re-derived rather than accepted

| Claim | Method | Reading |
| --- | --- | --- |
| The hook file's path, name and shape do not move | `git diff origin/main` is exactly 2 hunks, and lines 1–132, 145–437 and 442–end sha256-match the parent | three identical pairs of hashes |
| No log line carries payload | grep for every log call under the new path, then the gate above asserts it | 2 call sites in the domain, both `usage.tap.*` with a fixed reason |
| An over-cap body composes nothing | driven through the shipping leaf | `''` → null; a 64 KiB prefix → null |
| A subagent payload drives nothing | driven through the shipping leaf | `agent_id` → null, `agent_type` → null |
| The leaf never throws, never leaks a token, never returns over the cap | integrator's own hostile driver, 15 shapes, 66 assertions | all green; `sk-ant-api03-…` → `[REDACTED:api-key]`, an address → `[REDACTED:email]` |
| The field is absent, not empty, when there is no question | `update.question` is assigned only inside the comparison against what the window holds (§F1 moved the right-hand side out of the state) | no key on an ordinary tick, the first tick included |
| `__proto__` cannot inject a `tool_name` | driven | null |
| A file's contents cannot reach a row | driven — `content` is not a telling key | null for `{"tool_name":"Write","tool_input":{"content":…}}` |

## §As built — THE FIX ROUND (both verdicts came back needs_work)

Two independent verifiers ran, each naming its own independent method: one drove
THE APP RUN NOBODY HAD RUN, at HEAD and at a clean built parent, and the other
drove the whole seam from a real POST on the shipping socket through to the drawn
markup with the renderer's own reducer sliced verbatim out of `subscriptions.ts`.
They agreed on the two majors, found them by different routes, and between them
raised four minors and seven nits. Every one is answered below, at the place it
was named, and nothing else was widened.

### F1. A stale question could outlive a forget, and the fix is NOT where either verdict put it

**The defect, driven rather than read.** `forget(sessionId, keepHandback = false)`
deletes the session's state without emitting anything, and `uiUpdate` never runs
for a session that is no longer in `deps.sessions()`, so no clear could be sent.
The renderer never prunes `questions`. On the next life under the same id — End,
a dead pane, `releaseSessionResources`, or simply leaving the list — the row drew
the PREVIOUS life's question, and because `data-question` was set it never fell
back to the true screen line. The first blocked row after a restore is exactly the
case that fires no hook, claude's own workspace-trust dialog, so the wrong sentence
was what a person would see at the worst moment, and it survived until a real
`PermissionRequest` arrived for that session or the app restarted. **This is the
one row in the no-regression table that read worse at HEAD than at the parent**:
today's stale EXCERPT self-heals within a second because main captures every
blocked session every tick, and a stale question had no such repair.

**It is repaired rather than removed, and the reason the clause could not simply
be dropped**: the clause is "the row prefers the question over the excerpt", which
is the whole of mechanism 5, and removing it removes the phase. The repair is
inside a file the phase already changed and it adds no mechanism.

**Both verdicts prescribed a sentinel `questionSent` inside `freshState` — that
was not taken, and this is why.** A sentinel makes the FIRST tick of EVERY session
carry an explicit `question: ''`, because a brand-new state's `question` would
differ from its sentinel. That is a message on a channel whose promise is that it
carries news, it is a reading one verifier measured and recorded ("a tick with no
news emits NO UPDATE AT ALL"), and it would have been a second regression traded
for the first. So the memory of what the WINDOW holds was moved OUT of the state
instead:

| Was | Is |
| --- | --- |
| `SessionState.questionSent: string`, `''` in `freshState` | gone from the state entirely |
| `forget(id, true)` carried it across, and the other three forgets lost it | `SessionActivityMonitor.questionOnWire`, a `Map<string, string>` beside `states`, which no forget touches |
| `if (e.st.question !== e.st.questionSent)` | `if (e.st.question !== (this.questionOnWire.get(id) ?? ''))` |

It outlives a state the way a ROW outlives it. An entry exists only while
something is on the wire, so what survives a forget is one short string per
session that was blocked when it was forgotten, cleared on that session's next
tick whenever it comes back, and cleared wholesale in `dispose()`.

**Pinned by three new arms in `src/main/activity/__tests__/p311-question.test.ts`,
over the shipping monitor**: a `forget(id, false)` then a tick emits exactly one
`''`; a session that leaves the list, comes back under the same id and reaches
`needs_input` from the OTHER committed dialog fixture draws that fixture's own
last inked line and says `''` about the question; and the control — no `question`
key on any ordinary tick, the first tick included. Ablated: `questionOnWire.delete`
added to `forget` reddens 3 of 3 arms, and the file was restored byte for byte
(`diff` clean) and re-run green. 28 of 28 pass.

### F2. `probe:p311` is written, and the phase's one app run exists

`build/p311/probe-p311.mjs`, wired as `probe:p311` in `package.json`, classified
`electron('probe:p311')` in `build/verification-checks.mjs`, with a row in
CLAUDE.md's probe table and `HELPER_USER_FLOOR` raised from 147 to 148 in the same
commit (`gate:electron` re-run: 148 counted against a floor of 148).

Ten arms in one launch: the parent reading taken LIVE (the row draws the fixture's
hint line with no `data-question`), the row after a real `PermissionRequest`, the
rectangle (one line, `nowrap`, `ellipsis`) and the whole question reachable in the
row's own label, the Catch Me Up outcome and the question under it, the cap read
out of the leaf rather than copied, redaction on the drawn row, the clear when a
SECOND committed dialog arrives with no hook, a control shell row before and after,
and `app.log` afterwards against four planted needles. It reuses `withElectron`,
`withoutDevRenderer`, `wsConnect`, `cdpEval` and `pickRendererTarget` rather than
carrying copies, names its own socket so the helper's `finally` ends the tmux
server with the app, refuses (exit 2) a checkout with no build, and reads
`QUESTION_MAX` out of the source so the cap arm cannot drift from the leaf.

**What it does NOT prove, said rather than left to be discovered.** Arm J drives a
pane death and a `sessions.restore`, but whether a restored session reaches
`needs_input` from inert scrollback is not this phase's to decide, so that arm
PRINTS what it read and never fails the run; the deterministic pin for a question
outliving a forget is F1's monitor arms. **And the fixer did not run it** — a fixer
launches no Electron under this phase's rules — so its first live run is the
reverifier's. Its mechanics are a verifier's own working run
(three launches, exit 0) with assertions and exit codes added.

### F3. The question is reachable on the ⌘J row, and the 200 stays

The verifier measured the shipped width: panel a fixed 560px, spans dot 8 / icon 16
/ name 83 / path 206 / excerpt 152 / age 21, and a 200-character question wants
1,445px in 152px — about twenty characters on screen, with the row's `title` and
`aria-label` carrying neither. `attentionRowLabel(session, question = '')` now
appends the question after Tortie's own ` · ` separator, so the whole of it is on
the hover and in the accessible name, exactly as the whole untruncated path already
is. Four arms in `p311-question-row.test.tsx`, including the no-regression one: with
no question the label is what it was before this phase, byte for byte.

**Catch Me Up's line got the same clause**, because it has the same shape at a
different size: `.overview-line-question` is about 1,109px, which draws roughly 155
of the 200 characters, and the element now carries the question as its `title`.
One arm in `p311-question-under-line.test.tsx`.

**The other repair the verdict offered was NOT taken.** Capping `.attention-path`
so it elides would take the folder's TAIL from every row drawn today, and
`attentionPathText`'s own comment says that tail "is the half that tells two rows
apart" — a regression for every row in exchange for twenty more characters on one.
No stylesheet rule moves in this phase.

**`QUESTION_MAX = 200` survives its own reading** and the measurement is now in the
constant's own comment: one line and tail-truncated on both surfaces, about twenty
characters drawn on the ⌘J row where the whole is in the label, and about 155 of
them on Catch Me Up's 1,109px line.

### F4. The copy gate can no longer pass a question the mock invents

The `data` rule was a shape, `/^(?:Edit|Run|Apply patch to) .+\?$/`, over the one
string class this gate exists for. A verifier changed the mock's `Run rm -rf build?`
to `Run make install and then deploy?` — a sentence no payload can compose — and
`conformance:phonecopy` exited 0. It is three rules now, declared by their EXACT
words with the reason on each, so a fourth invented question fails by name, and
that attack is a committed self-test arm (`a question shape Tortie cannot compose
→ red`). The gate's own ledger and the entry's mechanism 7 both now say plainly
that the mock draws `Run rm -rf build?` while the leaf composes `Bash rm -rf
build`, that `Apply patch to 4 files` is not producible at all, and that a verb map
is a later phase's with the product choice the operator's.

### F5. The minors and nits, each at its named place

| Named | Answered |
| --- | --- |
| Mechanism 4's contract-baseline obligation cannot be met | The entry now says the baseline does not move and WHY (the inventory covers channel names and invoke shapes, not an event payload's fields), so the commit body names no line. `--check` exit 0 |
| `AskUserQuestion`, `ExitPlanMode` and an `mcp__…` tool compose only a machine name | Documented at both named places rather than widened: a paragraph on `TELLING_KEYS` naming all three and the reason, and a refusal in the entry saying it is a decision and that widening it is its own entry. The narrow nested arm was the verdict's other option and was declined as mechanism the entry does not carry |
| The body read counts characters against bytes (`hooks.ts:410-416`) | Not touched — pre-existing and outside this diff. Recorded as a refusal in the entry with the measured numbers (80,061 bytes admitted, 1.22x the cap, a split `é` becoming two U+FFFD) and the one-line repair named for its own entry |
| The log rule is a word denylist, and its `why` read stronger | The rule's `why` no longer says "may name only a fixed reason word", and the gate's header states the limit: a renamed binding is outside a text rule, which is why the leaf's own arm refuses it every log call |
| `SECRET_PATTERNS` is `redact.ts:32`, not `:31` | Corrected in the entry, re-read at the parent |
| `hooks.ts:191` is `GmuxHookServer`, not its `handle` | Corrected: the class at `:191`, `handle` at `:346`, both re-read at the parent |
| `QUESTION_MAX` re-exported from the domain index with no consumer | Dropped from `index.ts`; the constant stays with the leaf and its test, and the index says why |
| A non-CSI escape leaves its letters; a lone surrogate mid-string survives | Both measured readings added to the leaf's own header, so a later round does not chase a residual the grammar refuses on purpose |
| `OUTCOME_WAITING` is the only outcome sentence ending in a full stop | LEFT AS IS and put to the operator. The mock draws the stop on `Choice.html:44` and `Session.html:44` and the mock is Phase 309's own deliverable; changing it is one character in `copy.ts` AND one in the mock, which is a copy decision rather than a fix |
| `End.html`'s apostrophes were straightened in the MOCK | Named for the running log: the drift was real and `resume.ts:998` writes ASCII, so the mock was the side judged wrong. A later round that wants the typographic pair changes the confirm title and the mock together |

### F6. What was NOT changed, and why

- **No CSS.** No rule in `app.css` or `overview.css` moves — see F3.
- **No renderer-side prune of `questions`.** Both verdicts warned against it: after
  an End the row is still in `s.sessions` as restorable with the same id, so a prune
  keyed on leaving the list never fires, and one keyed on a reconcile can drop a
  live record. Main is told to say the clear instead.
- **No nested read of `tool_input`** — see F5.
- **No new copy.** The only new shipping string is still `The agent is waiting for
  you.`; the row's label gains a separator and no word.
