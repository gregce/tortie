# 146. How a Gemini and an Antigravity plan's usage can be read

Research 146, for Phase 373. Written 24 November 2026 against the worktree `wt-p373` at `e424fc64` (origin/main).
This is research only. No product file changed. It decides nothing and queues nothing: the build waits for his answers
(section 14).

**Who worked on it.** Four investigators on separate questions (Gemini, Antigravity, the fit with the meter, what
Google allows). Four adversaries, each told to refute one of them with sources of its own. Then one investigator who
drove `agy` once on his word, and an adversary on that reading. Then a judge. The writer made this document from the
judge's ruling. The writer launched nothing and asked the web nothing. It re-read the saved pages, the live record and
the tree, and re-ran the replay (section 6.5).

**The evidence boundary.** No credential was read. No keychain item was opened. No request carried a token, and no
Google quota or sign-in endpoint was called, with or without one. No role opened, listed or copied anything under
`~/.gemini`, an Antigravity profile, `~/.claude`, `~/.codex`, a browser profile or his live Tortie profile, with one
named exception: the live investigator read the SIZE and modified time of one settings file, `settings.json` in agy's
own folder, before and after its launch (section 11). `gemini` was never run. `agy` was launched once, on his word. No
address, id, token, client id or client secret appears below. The quota numbers shown are the ones the judge used.

**How a claim is marked.** **RAN** means measured in the one live launch. **BYTES** means read in a program file or in
source at a named version. **GOOGLE** means Google's own page, changelog, staff or repository collaborator.
**FORUM** means an account on Google's forum that answers in Google's voice and carries no Google flag. **THIRD
PARTY** means another project's source or words. **REPORT** means one person's account. **INFERRED** means reasoned.
Every page was read on 24 November 2026. A page that shows no date is called undated.

**Slips, disclosed.**

- The Gemini investigator's search printed the Gemini CLI's public client secret once in its own tool output. It is in
  no file.
- The fit investigator's test run wrote a results cache into Phase 371's `node_modules/.vite` through a link. It held
  a list of tests, and it was removed.
- Two launches of a scratch tmux 3.6a server crashed before any agent ran, and left two `tmux-*.ips` files in his
  DiagnosticReports.
- About 1.6 GB of shallow clones and archives sit in the phase's scratch folder. Nothing in them was executed.
- His shell history moved by 31 bytes at 17:25:47, from `751833 1795554792` to `751864 1795559147`, while the
  adversaries were at work and before the live launch. The main session found nothing of either running phase's that started a shell then, and reads it as his own typing. It did not move through the live
  work, the judge's or the writer's. His bash history read `23166 1790702242` throughout the live work.

---

## 1. What he asked

On 24 November 2026, beside a picture of the meter's two rows (Claude 36% wk, Codex 99% wk): "similar to the codex and
claude code, plan featuers, I would like to do it for antigravity and gemini subscriptions. Can we research how to do
so any get that queued as a phase?"

Later the same day he allowed the agents to be driven: "i think you can drive agy / gemini yourself, that way it will
be easier to get all the information you need for this phase", and "in a scratch repo that you clean up after".

Research 72 is the standing authority for the meter. Its section 5 allows three things in order: a status line tap that
reads no credential, then a read only request to the vendor that never refreshes a token, and never an agent started
only to be read. Its section 3 has one line each on Gemini and Antigravity, read out of orca's source on 30 August
2026. Both lines are out of date (section 15).

---

## 2. The answer

**Antigravity: yes, and without a credential.** `agy` already hands its plan numbers to a status line command, as JSON
on standard input. Google documents it. Since `agy` 1.4.10 (29 October 2026) a launch flag, `--settings`, sets that
command for one session and saves nothing. Tortie can use it for the sessions it starts. Tortie would ask Google for
nothing, hold no token and start no process of its own.

**Gemini: no row.** Google stopped serving a personal Google sign-in in the Gemini CLI on 18 June 2026. A row would be
blank always, or it would read a credential Google names as a breach. His Google AI plan's coding quota IS the
Antigravity row: one plan, two names.

**The one thing he should know before he says yes.** Google was asked in public, twice, whether another app may show
the status line's quota (18 August and 16 November 2026). It has not answered. Google has said no, in writing, to every
other way a program could read this number. It has said neither yes nor no to this one. No case is known of an account
limited for it. That is no known case, and not safety.

**What it would look like.** One row, `Antigravity`, with the Gemini group's two windows as used percents: `4% 5h · 2%
wk` on the day it was measured. The Claude and GPT group's two windows go on the hover card.

**What it would not do.**

- It is empty until the switch is on and an `agy` session has started from Tortie after that. A session wrapped by
  SpecStory capture does not count (section 13).
- It goes old while `agy` sits idle. It held a value 784 seconds old when measured, and nothing bounds that.
- It does not see what the Antigravity app spends until the next `agy` turn.
- It does not say a turn will be served. Google's automated blocks answer 429 "regardless of your remaining /usage plan
  quota" (GOOGLE, collaborator, antigravity-cli issue 1701, 2026-11-23).
- It says nothing of AI credits. The payload carries no such field.

---

## 3. What was read, and at which versions

| Thing | Version | How |
| --- | --- | --- |
| `agy` on his Mac | 1.5.16, 24 November 2026, sha256 `b746bd68eb15...` | read as a file; launched once (section 11) |
| `agy` for Linux arm64 | 1.5.16 | the adversary's own download and its own parser; never executed |
| `agy` older archives | 1.1.20 to 1.5.12 on macOS, 1.4.9 and 1.4.10 on Linux | searched for the `--settings` text |
| Antigravity.app on his Mac | 2.5.0, files of 30 July 2026 | read as a file. The public app is 2.35.1, so claims about the app are four months old |
| Gemini CLI on his Mac | 0.68.0 | read as files, whole tree equal to npm's archive |
| Gemini CLI source | 0.22.0 to 0.71.1 (25 tags, 12 npm artifacts) and main of 23 November 2026 | read as source |
| Other programs | orca, CodexBar, T3 Code, oh-my-pi, agy-hud, oh-my-posh and others, at their heads of 20 to 24 November 2026 | read as source; their behaviour was not run |
| Tortie | `e424fc64` | read; a scratch copy was type-checked and its usage service driven over fakes |
| Google's pages | all fetched on 24 November 2026 | dates named where the page shows one |

---

## 4. What the plans are today

**The Gemini CLI serves no personal plan.** Google's deprecation page says it stopped on 18 June 2026 for individuals,
Google AI Pro and Google AI Ultra, and that "you can no longer use the Login with Google option" (GOOGLE,
developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals, last updated 2026-10-09). The
README inside the installed 0.68.0 and inside 0.71.1, npm's newest on 24 November, says no free tier and no Google AI
plans (BYTES). Enforcement came in steps: some sign-ins with a project set worked until about 19 to 21 August 2026
(REPORT, gemini-cli issues 28912 and 29101). Code Assist Standard and Enterprise still work, with one daily limit. They
have not been sold new since 9 October 2026 and end through 2027 (GOOGLE, docs.cloud.google.com sunset page,
2026-11-10).

**Antigravity has two model groups, and each has a five hour and a weekly window.** "The models in a group share a
weekly limit and a five-hour limit" (GOOGLE, antigravity.google/docs/cli/commands/usage.md, undated). The groups are the
Gemini models, and the Claude and GPT models. Pro and Ultra have both windows. Free and Plus are weekly only (GOOGLE,
docs/plans.md, undated). No amounts are published.

**On his plan** (RAN, one account, one plan, one day): `plan_tier` names a paid Google AI plan (the tier is left out here: this repository is public). The bucket ids are exactly
`gemini-5h`, `gemini-weekly`, `3p-5h` and `3p-weekly`.

**One pool across surfaces.** Asked whether the command line and the desktop app differ, a repository collaborator
answered "They are the same. Both share the same quota pool and harness" (GOOGLE, antigravity-cli issue 490,
2026-06-26). Staff said the same of headless runs (GOOGLE, forum 185992, 2026-09-30). A forum answer says it of "all
connected Antigravity surfaces" (FORUM, 200467, 2026-11-18).

**The ids are the server's and they move.** None of the four is in `agy`'s bytes (BYTES, two operating systems). A fifth
bucket for the Argon model was live on Pro until about 20 November 2026 (antigravity-cli issue 1688). So the ids are a
compiled list, and an unknown one is dropped.

**The Gemini APP is a third thing.** gemini.google.com has its own five hour and weekly limits (GOOGLE,
support.google.com/gemini/answer/16275805, undated). They are a different pool from Antigravity's. There is no
acceptable way to read them (section 5.1, row 6).

**AI credits** are spent above the quota on Pro and Ultra when a person allows it (GOOGLE, docs/plans.md). So a full
window does not mean stopped. The meter would draw nothing about credits.

---

## 5. The sources, ranked

Lowest account risk first. "Could cost him the account" is said where Google's words say it.

### 5.1 Gemini

The first fact of this list is that a personal Google sign-in has no Gemini CLI plan to meter today.

| # | Source | Credential Tortie would touch | When it is blank | What the act could cost |
| --- | --- | --- | --- | --- |
| 1 | His own eyes: gemini.google.com, Settings, Usage limits; or `/stats` in a licensed `gemini` | none | always, it is not a meter | nothing |
| 2 | The footer a licensed session already draws ("N% used", no reset, the active model's pool) | none | always for a personal plan; otherwise whenever no licensed session is open | no Google sentence about a terminal reading its own screen, and no known case. Not worth building: one daily window, on a product that is ending |
| 3 | `GEMINI_CLI_ACTIVITY_LOG_TARGET` | none asked, but the file receives the refresh token and the prompts in the clear (BYTES, 0.68.0 and 0.71.1) | same as 2 | not known. Refused for what it writes |
| 4 | `POST cloudcode-pa` `v1internal:retrieveUserQuota` with the access token in `~/.gemini/oauth_creds.json`, after `loadCodeAssist` for a project | that access token | always for his plan, by the one captured answer: HTTP 403 `SUBSCRIPTION_REQUIRED` (THIRD PARTY, CodexBar PR 3139, 2026-08-22) | **it could cost him the account.** Google's Gemini CLI terms name third-party software directly accessing the services behind the CLI as a violation that may be grounds for suspension or termination |
| 5 | The same, refreshing the token as orca and CodexBar do | the refresh token, with the CLI's own client id and secret | as 4 | **worse than 4.** It is the "piggyback on Gemini CLI's OAuth" the FAQ names. Research 72 forbids refresh as well |
| 6 | The Gemini app's limits by browser cookies, or by Gemini.app's own service | his browser session, or a keychain group another app cannot read | often (CodexBar issue 5129, 2026-11-20, HTTP 302) | not known. It means reading his browser profile, which is refused outright |

Not sources at all: the CLI's hooks, a status line (it has none), its JSON output, ACP, telemetry and session records.
None carries the quota (BYTES, 0.71.1 and main).

### 5.2 Antigravity

| # | Source | Credential Tortie would touch | When it is blank | What the act could cost |
| --- | --- | --- | --- | --- |
| 1 | He types `/usage`, or reads Settings in the app | none | always, in Tortie | nothing; it is the supported place |
| **2** | **The status line payload, in sessions Tortie starts, through `agy --settings` (1.4.10 and later)** | **none** | until the switch is on and an `agy` session has started since; then about 2.5 to 3.5 s after launch. Never from the app or another terminal alone, and never from `agy -p` (1.4.7 and later). Old whenever idle | the vendor's own feature. No Google "no" was found against it and no "yes" either. The terms' letter is broad enough to cover it. No known case is not safety |
| 2b | The `title` command: same payload, same runner, and it takes only the window title | none | as 2 | as 2. Not measured. Kept in reserve for a person who has a status line of his own |
| 3 | Reading what `agy` draws: the `/usage` panel or its built-in line | none | nearly always. The built-in line showed no quota at 95 to 100 percent, and the panel shows only while open | no Google sentence either way. The panel prints his address. Not worth it |
| 4 | `agy -p /usage --output-format json` when he presses | `agy` reads its own keychain item | otherwise | **could cost him the account** by the newest words: "not supported ... carries risk" (FORUM, 203369, 2026-11-23). It was permitted on 2026-11-12 (199703). It starts a process and has opened a browser sign-in for others |
| 5 | The same on a timer, as orca does every 15 minutes | as 4 | rarely | **could cost him the account**: "not supported ... automated abuse protections". Also a timed vendor start, which research 72 refuses in spirit |
| 6 | `agy`'s own local server on 127.0.0.1 | a token, through a hidden flag or variable, or from a process Tortie did not start | `agy` 1.2.2 and later refuse a call without it | **could cost him the account.** Staff say prohibited "even over localhost" and name no penalty (186139, 2026-10-01). Staff called a quota monitor's background traffic "accurately flagged" (128747, 2026-03-09) |
| 7 | The cloud endpoint with his stored token, read only | keychain service `gemini`, account `antigravity`, or its file fallbacks | usually: `agy` rewrites the token about hourly and only while something runs | **could cost him the account**: "not permitted ... can result in account suspension" (FORUM, 203779, 2026-11-23) |
| 8 | A sign-in of Tortie's own, or a refresh | his Google account | rarely | **worse than 7.** It is the conduct Google enforces today |

Not sources: `agy`'s hooks (no quota field), a cached file (none found in the bytes), and ACP (no method; a `/usage`
command came in 1.4.0 and left in 1.5.0).

Rows 4 to 8 are how the other programs do it. orca runs row 5. CodexBar tries the local servers first and has a
sign-in of its own (its documents). T3 Code calls the endpoint with `agy`'s token. oh-my-posh reads the status line
payload, with no credential and no request. (THIRD PARTY source, at heads of 20 to 24 November 2026. Their behaviour
was not run.)

---

## 6. How the Antigravity source works

### 6.1 The payload

`agy`'s status line command gets one JSON object on standard input. Google's table says `quota` "maps quota bucket IDs
to their status: `remaining_fraction` or `remaining_amount`, `reset_time`, `reset_in_seconds`, and `disabled`
(optional)", beside `plan_tier` and `email` (GOOGLE, antigravity.google/docs/cli/statusline.md, undated; its example
says version 1.4.5; the same fields are in 1.5.16's bytes on two operating systems).

In the live launch (RAN, `live-readings-run-1-sl.jsonl`):

- 42 recorded runs, 761 to 1,540 bytes each. Standard input was closed every time. Reading took 2 ms at most.
- Each bucket carried exactly `remaining_fraction`, `reset_time` and `reset_in_seconds`. None carried `disabled`,
  `remaining_amount`, a window word or a group name. So the bucket id is the only statement of the window.
- The number is what REMAINS, 0 to 1. The meter draws used, so it subtracts once.
- `agy`'s environment reaches the command, so a value Tortie stamps on the pane is readable there.
- The payload also carries the person's address, folder, transcript path and conversation id. The address was there
  even with `AGY_CLI_HIDE_ACCOUNT_INFO` set.

### 6.2 The lever

`agy --settings <JSON or file>`. Its help text reads "Settings for this session only, never saved" (BYTES, 1.5.16,
offset 0x3f4b6da). The first release with it is 1.4.10, of 29 October 2026. It is absent in 1.4.9 (BYTES, archives of
two operating systems). It is in `--help` and is not in the docs' flag table, and the settings page's "Command-line
overrides" section does not name it (GOOGLE, docs/settings.md, undated). So Google could withdraw it without a word.

RAN: with `--settings` holding a `statusLine` block and `stack_with_default` true, the command ran. agy's own
`settings.json` did not move at launch. It grew by 70 bytes when the folder's trust question was answered, which is the
size of one trusted folder entry (arithmetic on the size; the file was not read).

An unknown key, a bad value or an unreadable file ends `agy` with an error (BYTES). An older `agy` does not know the
flag, and a Go program that meets an unknown flag stops (INFERRED). **So an ungated flag could stop every Antigravity
session from starting.** The build needs a version floor on the very file the pane runs.

### 6.3 When the number comes

Seconds after launch (RAN, with the process first seen at 1.3):

| Time | What happened |
| --- | --- |
| 2.70 | first run: no address, no quota |
| 3.78 | fourth run: **quota**, before any key, any turn and the trust answer |
| 4.97 | eighth run; then none while the trust question waited |
| 40.0 | the trust question was answered; two runs |
| 40.4 to 781.7 | idle, nothing pressed: no run and no change on the screen for 741 s |
| 781.7 | one typed character: two runs, with the numbers of 3.78 |
| 788.9 | `/usage` open: new numbers |
| 863.5 | the first idle run after one short turn: new numbers again |

So an absent quota means "not yet", and never zero. And **the number refreshes on work and not at idle.** agy asked its
server four times in 14 minutes: two about launch, one at `/usage`, one at about the end of the turn. The held value was
up to 784 s old and 1.0 point behind in the five hour window. Who spent that point is not known: another `agy` of his
was running, and late booking fits as well.

`agy` 1.5.16 also refreshes every 60 s while it streams (BYTES, and the changelog of 2026-11-24). That was not
exercised.

### 6.4 A full bucket's reset is a placeholder

At `remaining_fraction` 1.0 the reset is now plus 5 hours, or now plus 7 days, at the moment `agy` asked. It counts down
and jumps back at the next ask. `/usage` draws "Quota available" there and no countdown. Two roles derived this in two
ways. **The meter draws no reset on a full bucket.**

### 6.5 Tortie's Claude script would lose the number here

Tortie's Claude status line script posts at most once in 15 s and stamps the clock before it posts
(`src/main/usage/statusline.ts:73`, `:303-310`). The judge replayed the kept runs through that rule, and the writer ran
the replay again. 39 runs carry quota.

| Rule | Writes | Runs where the held number is not the payload's |
| --- | --- | --- |
| the Claude clock, one post in 15 s | 7 | 2. It drops the run that carried `/usage`'s new value for 16 s, and **never** posts the turn's final numbers |
| write when the four fractions change, exactly | 3 | 0 |
| write when they change at four decimals | 2 | 1, below what the meter draws |
| write when the whole block changes, countdown included | 33 | 0, but nearly every run writes |

An idle `agy` then runs nothing, so a lost last number stands until the next key or turn. In this recording the lost
value is 0.006 of a point and draws the same percent. A long turn would lose more. That was not measured.

**Two rules follow.** The script must decide on content and never on a clock. And what it compares must leave out
`reset_in_seconds`, because that counts down in every run. With it in, "the time the block last changed" is only the
time of the last run, and the age rule in section 13 fails. (The last two rows and this rule are the writer's. The
judge's "2 posts" is the four decimal row.)

### 6.6 A bad run is seen by him

- A run over 5 s is killed, and a run that exits non zero is a failure. The record holds kills at 5.01 and 5.05 s and
  three runs that exited 1. `agy` drew a "Statusline Error" block in the conversation for them (the driver's account
  and the strings in the bytes).
- After 30 failures in a row it stops running the command for the session (GOOGLE, statusline.md).
- A new run ends the one in flight with a SIGKILL to the `sh` alone. Its children live on (RAN: six starts and one end,
  twice, with three second sleepers outliving their shell; antigravity-cli issue 709, 2026-07-29, reports the same).
  Runs come about 300 ms apart.
- An empty output added no row, within this one launch. The same pane without the setting was not measured.

So the script finishes fast, prints nothing, exits 0 always, starts no background child, and leaves nothing harmful when
it is killed at any step.

---

## 7. Where the credentials are, for completeness

The recommended design reads none of them. Nothing below was opened.

- **Gemini CLI.** A plain file, `~/.gemini/oauth_creds.json`, mode 0600, at every version read, 0.22 to 0.71.1 (BYTES).
  A keychain item is used only when an environment variable asks for it. A running `gemini` refreshes the token.
- **Antigravity.** A generic password, service `gemini`, account `antigravity` (BYTES on two operating systems, and
  orca's source). There are file fallbacks (the same two sources).
- **A meter that reads and never refreshes would usually be blank.** `agy` rewrites its token about hourly and only
  while something runs. Other programs' users report exactly that (antigravity-cli issue 1045, 2026-11-23; T3 Code
  issue 40178, 2026-11-21). The token's real life was not measured.
- **Research 126's lesson does not arise.** It is what reading the wrong keychain item costs. This design reads none.

---

## 8. What Google allows

### 8.1 The words

| Date | Where | Who | Words |
| --- | --- | --- | --- |
| undated; the third-party sentence was there by 2026-07-27, and names "your Antigravity and/or Gemini CLI accounts" from 2026-09-11 (archive copies) | antigravity.google/terms | GOOGLE | using third party software, tools or services to access the Service is a breach, and "may be grounds for suspension or termination of your Antigravity and/or Gemini CLI accounts" |
| undated; the entry appeared between 2026-10-07 and 2026-10-10 (archive copies) | docs/faq.md | GOOGLE | "Wrapping `agy` inside third-party coding agents or applications, or automating account rotation, is not supported under consumer plans." |
| 2026-03-09 | forum 128747 | GOOGLE, staff | a quota monitor's background traffic was "accurately flagged". The user had offered it as his own suspicion, and forum answerers say elsewhere they cannot see enforcement logs (201416) |
| 2026-06-25 | antigravity-cli issue 397 | GOOGLE, collaborator | welcomed a third-party status line that shows quota ("nice ... Thanks for building it") |
| 2026-09-30 | forum 185992 | GOOGLE, staff | starting the unmodified `agy` locally is supported, with conditions |
| 2026-10-01 | forum 186139 | GOOGLE, staff | local server calls are prohibited "even over localhost" and fragile. The question was about an inference call, and the answer says "or any other". No account penalty is named |
| 2026-11-12 | forum 199703 | FORUM | `agy -p /usage` only on demand is permitted |
| 2026-11-23 | forum 203369 and 203283 | FORUM | `agy -p /usage` from an app is not supported, even read only. Of a file a person made by hand: reading "your own local saved file does not interact with Antigravity at all" |
| 2026-11-23 | forum 203779 | FORUM | reading or reusing the stored token for the quota endpoint is "not permitted ... and can result in account suspension" |

The order is a change of policy. The permissive answers come before the FAQ entry of 7 to 10 October 2026, and the
strict ones after it, with 199703 the exception.

### 8.2 The question that fits this design

Topic 178823 (18 August 2026) asks whether a desktop app may show quota from the documented status line, with no
token, no endpoint and no request. It has one post: the question. Topic 201373 (16 November 2026) asks nearly the same
for the desktop app, and has one post. Nobody in this phase posted anything. If he asks, 178823 is open.

The nearest favourable words are issue 397 and the sentence about a saved local file. Neither answers it.

### 8.3 Suspensions are real

- The refusal is a 403 with `TOS_VIOLATION`. It locks the official `agy` too. There is one reinstatement per account.
- Reports run from 26 October 2026 (195031, 196177), through a mass thread on 5 November (198498), to today.
- They are about clients doing inference on a borrowed sign-in. **No case is known of one quota read every fifteen
  minutes.** That is no known case, and not safety.
- One suspended account (201416, post 10, 2026-11-17) lists a custom agent, hooks and a status line as the only things
  it had added. He thinks the status line unlikely and blames the agent. The case shows no cause, and it must not be
  said that no such report exists.
- One man reports a suspension in the same hour as one headless run started by another local program (197943,
  2026-11-03). That run did inference.

---

## 9. How it fits the meter

**The windows fit as they are.** Five hours and a week are the meter's two windows. The Gemini group fills
`fiveHour` and `sevenDay`. The second group needs one optional group on the snapshot, for the card alone.

**One row, not two.** One Google account, one plan, one pool. Two groups as two rows would be one product drawn twice.
With no Gemini row the meter has three rows.

**Adding a provider today sends Codex's token under Google's name.** Make `UsageProviderId`
(`src/shared/usage.ts:24`) four members and widen the settings, and `src/main/usage/service.ts` still type-checks. Its
three `provider === 'claude' ? ... : codex` ternaries (`:334`, `:353`, `:378`) then read `~/.codex/auth.json` and ask
chatgpt.com with Codex's switch off. Two roles drove it over fakes, on two arms. No gate catches it. This is worth
fixing whatever he decides.

**`LoginProviderId` (`src/shared/logins.ts:37`) stays two.** Widened, a Google login falls through to Claude's keychain
item on some paths and to Codex's file on others, and almost nothing fails to compile.

**A row nobody asks for would never go stale.** Staleness is decided only when a read fails (`service.ts:387-430`). A
row that only receives would read `ok` for ever. Driven: three days later it still did. So age is decided when the
snapshot is composed.

**The words.** `signed-out` and `expired` can never be said from this source. A new state, `waiting`: "Shows after an
Antigravity session starts." Two lines in Settings become false and change (`src/renderer/settings/usage-copy.ts:72`,
`:78`). The refresh control is absent for this row, because pressing it would do nothing.

**The plan word.** A `Google AI <tier>` word passes the existing filter (`src/shared/usage.ts:203`, `:248`).

**The strip.** Three rows stay compact at a 960 px window: about 393 of 412 px. That is arithmetic from the CSS and
Apple's text measurer. It was not read in a running app.

**An older Tortie** reading newer settings drops the new switch and its next write turns it off
(`src/shared/settings.ts:314-322`). That is the safe direction.

**The phone, the menus and the IPC contract do not move.** Usage crosses no door route, and the contract baseline names
channels and no provider.

---

## 10. What fell, and to whom

| The claim | Fell to |
| --- | --- |
| `AGY_ACCOUNT` picks among several Google sign-ins per pane (attack-fit) | the bytes: the neighbouring string names a Plugins Manager account. The account rule is still needed, for `/logout` |
| The Gemini CLI throws before any Code Assist server exists (Gemini investigator) | its adversary, by reading `setup.ts`: the server is built first, and with no tier it POSTs `onboardUser`. So running `gemini` on a personal sign-in is not a read |
| No vendor sentence says the app and the CLI share a pool (Antigravity investigator) | its adversary: issue 490 |
| The suspension wave began on 14 November, 6 November earliest (policy investigator) | its adversary: 26 and 27 October |
| No report of a suspended status line user (policy investigator) | its adversary: 201416, post 10. Narrowed in section 8.3 |
| The terms make suspension certain, with no exception | the page: "may be grounds", and it exempts API key and enterprise access |
| Staff said a local server call could cost the account (policy investigator) | the post itself: prohibited and fragile, and no account penalty named |
| The fastest of the first eight runs was 273 ms apart (live) | the live adversary and the record: 284 ms there. 273 is between runs 11 and 12 |
| The payload followed the panel, and the turn, within 0.3 s (live) | the live adversary: 0.3 s is only the spacing of two runs |
| "An idle agy runs the command zero times" as a rule (live) | narrowed: one session, before any turn. `agy` also has a 60 s version control loop that notifies on a change (BYTES, not exercised) |
| "Typing does not refresh" (live) | narrowed: one keystroke ran the command and refreshed nothing |
| "agy started no helper process" (live) | the sampler saw none of 34 sub-second runs, so it cannot say that |
| "The id is shown only at exit" (live) | the payload carries it from the first turn |
| No per session setting and no account proof exist for a Google tap (fit investigator) | its adversary: `--settings`, and `email` in the payload |
| Per model buckets, so a new bucket list is needed (fit investigator) | its adversary: two groups with two windows. Only the dead Gemini CLI endpoint is per model |
| Four rows (fit investigator) | three |
| "The same shape as the Claude tap" (Antigravity investigator) | its adversary and the judge. Three differences: an unknown settings key ends `agy`, so a token has no home there; the clock loses the last number; a killed run would leave the file that holds the token |
| Two independent captures of the 403 (Gemini investigator) | its adversary: one. Issue 30320's token is Antigravity's |
| A personal Gemini subscription is only an Antigravity question (Gemini investigator) | its adversary: the Gemini APP has limits of its own |
| Research 72's section 3 lines | section 15 |
| "Write on change posts 2 times" read as exact (judge) | the writer's replay: 2 at four decimals, 3 exactly, and the countdown must be left out (section 6.5) |

---

## 11. What was driven live, and on whose word

His word is quoted in section 1. Everything here was one launch of the installed `agy` 1.5.16, from 17:42 to 17:58 on 24
November 2026, under his own sign-in.

- **Where.** A scratch git repository, in a scratch tmux server of its own at 120 by 40. Every other process had a
  scratch HOME. Automatic update was off by `agy`'s own variable. Stand-ins on the PATH refused `open`, `npm`, `npx`,
  `xdg-open` and `osascript`. None was called.
- **What was spent.** One `agy` launch of five allowed. One model turn of two, the words "Reply with the single word
  ok." One `/usage` of three. No `agy -p`, no `agy acp`, no approval, no sign-in, no sign-out, no browser. `gemini`
  was not launched. The kept record holds one launch.
- **Why it stopped there.** At the first turn `agy` drew "Sign-in update needed. Your sign-in is missing permissions
  that are now required, so some requests may fail. Run /logout to sign in again." The brief said to stop at any
  warning. The turn itself was answered. Google's changelog describes the notice as a newly required permission
  (GOOGLE, 1.5.4's entry). A third party ties it to a new OAuth scope (Antigravity-Manager changelog). By those words
  it is not a suspension and not a refusal. **It asks him to sign in again, and only he may do that.** A second reason
  not to launch `gemini`: on a personal sign-in it may POST, so it is not a read.
- **Agreement.** The payload and `/usage` agreed on all four buckets: 98.27 and 95.61 percent remaining, and two full.
- **Cleanup.** `agy` was quit by its own key and exited 0. No process, tmux server, socket or scratch folder of that
  launch remained. `~/.local/bin/agy` had the same size, time and sha256 before and after. Both history files were
  unmoved.
- **One thing seen on the way.** Every kept screen read `alt 0 mouse 0` on `agy` 1.5.16, and Tortie's registry records
  the 1.2.8 screen as full-screen with the mouse (`src/main/agents/registry.ts`, the Antigravity row's `screen`). His
  settings or the pane's TERM may explain it. It is not this phase's, and `conformance:resume:capture` owns it.
- **What the program itself left, for him to remove or keep.** One conversation in `/resume`, one trusted entry for a
  folder that no longer exists, one line of prompt history and one log file, all in `agy`'s own folder. Nothing of his
  was edited.

---

## 12. What is not known, and the reading that settles it

### 12.1 What is not known

1. Whether Google counts a status line script that hands quota to another app as third party software accessing the
   Service. Asked twice, unanswered.
2. What Google's detection reads, and whether any account was ever limited for a quota read alone at a low rate.
3. Whether he already has a `statusLine` or a `title` of his own. His settings file was never opened. If he has one, the
   tap stands aside and the row stays empty for him.
4. The pane with the setting against the pane without it, at one size.
5. Whether a drawn error block starts another run by itself. A killed run was followed at once both times, and a
   keystroke is not ruled out. The design assumes it loops.
6. `agy --conversation <id> --settings ...`, an inline JSON value, and the `=` and single dash spellings. Bytes or
   convention only, never run.
7. Whether the 60 s refresh while streaming fires, what a low, spent or disabled bucket looks like on his plan, and
   whether a subagent still zeroes the numbers (reported on 1.0.10, closed).
8. Whether quota keeps coming as `agy` moves to a second quota endpoint it already compares with the first, and whether
   the notice returns after he signs in again.
9. Who spent the point between 3.8 and 788 s.
10. Whether the `title` command draws an error block, and what an empty title does to the window title.
11. Everything about `gemini` live, and everything that exists only in an Antigravity app newer than 2.5.0.
12. How the row behaves for a Workspace, enterprise or API key sign-in. An absent quota must read as no plan window.
13. How a SpecStory wrapped `agy` passes the flag on.
14. Widths and rectangles in the running app with three rows.
15. Who wrote the 31 bytes to his zsh history.

Items 1, 2 and 15 no reading of ours can settle.

### 12.2 The one reading

The decisive reading has been taken. Nothing more is needed to decide WHETHER to build. One short reading should open
the build, on his word, because it decides details that cannot be had without his sign-in.

**Before it, he runs `/logout` in `agy` and signs in again himself.** Nobody else does.

It uses a scratch repository, a scratch tmux server, `AGY_CLI_DISABLE_AUTO_UPDATE=true` and the script below, removed
afterwards. No `agy -p`, no `agy acp`, nothing approved, no `/usage`, and one one-word turn. The judge allowed four
launches. Counted, the steps are five starts, and two of them (D) should end before `agy` draws anything. The SpecStory
question (section 14) adds one. So the number to ask him for is **six starts at most**.

| Step | What runs | What the answer decides |
| --- | --- | --- |
| A | plain `agy`, no setting, 120 by 40 then 80 by 24; the screen kept as a row count and a hash | with B: equal rows, the tap may ship on this shape. A row more or a moved hint: it does not, and `title` is measured instead |
| B | the same with `--settings` as INLINE JSON holding only `statusLine` (type, command, `stack_with_default`); the same readings; the time quota first comes; one turn; five idle minutes; one edit of a tracked file; and the script switched to `exit 1` with no key pressed for 30 s, then back | inline accepted: no file that can go missing. Refused: a 0600 file written before each launch and restore. `exit 1` starting more runs: "always exit 0" becomes a gate clause with a planted failure. **Quota missing: stop and report.** A tracked edit that runs nothing: "old while idle" is the copy |
| C | quit, then `agy --conversation <that id> --settings <inline>` | it runs: resumes get the flag too. It does not: launches only, and the row says so |
| D | two launches that should end at once: an unknown key, and an unknown key inside `statusLine` | they end: the floor and the launch guard are required. They start: the floor stays, for the flag alone |

It prints bucket ids that match a plain pattern, key names, each fraction as `0`, `between` or `1`, each reset as within
5 hours, within 7 days or other, whether an address is present, the plan word's length, run times, exit codes, row
counts and hashes. Never a value, an address, an id, a path or a screen.

The script (the judge's, tried over synthetic payloads and never over his). It needs `/usr/bin/jq`, which is on this
Mac. The shipped script may not assume it (section 13).

```sh
#!/bin/sh
# agy runs this as its status line (arg 1 = "status"). It prints NOTHING to the pane. It appends one line of SHAPES
# to shapes.txt beside it: key names and classes, never a value that names anybody. It opens no other file, starts
# no request and reads no credential.
umask 077
here=$(dirname "$0")
/usr/bin/perl -e 'alarm 3; exec @ARGV' /usr/bin/jq -r --arg k "$1" --argjson now "$(date +%s)" '
  def cls: if type=="number" then (if .<=0 then "0" elif .>=1 then "1" else "between" end) else type end;
  def rst: if .==null then "absent" elif type!="number" then type
           elif .<=0 then "not-future" elif .<=18060 then "within-5h" elif .<=86460 then "within-1d"
           elif .<=604860 then "within-7d" else "beyond-7d" end;
  def ok: test("^[a-z0-9][a-z0-9.-]{0,39}$");
  [ "t=\($now % 100000)", $k,
    "state=" + ((.agent_state // "absent") | if test("^[a-z_]{1,20}$") then . else "other" end),
    "email=" + (if (.email // "") == "" then "no" else "yes" end),
    "plan=" + (if .plan_tier==null then "absent" else "len\(.plan_tier|length)" end),
    "ver=" + ((.version // "absent") | if test("^[0-9.]{1,12}$") then . else "other" end),
    "quota=" + (if .quota==null then "absent" else "\(.quota|length)" end),
    ( (.quota // {}) | to_entries[] | (if (.key|ok) then .key else "other-id" end)
      + "{" + ([ .value|keys[] | if test("^[a-z_]{1,24}$") then . else "other-key" end ] | join(","))
      + " rem=" + (.value.remaining_fraction|cls)
      + " amount=" + (if .value.remaining_amount==null then "absent" else "present" end)
      + " off=" + ((.value.disabled // false)|tostring)
      + " reset=" + (.value.reset_in_seconds|rst) + "}" )
  ] | join(" ")' 2>/dev/null >> "$here/shapes.txt"
exit 0
```

---

## 13. The recommended build phase

Queued as Phase 374 only when he answers section 14. Tier 3: it puts a command in his agent's sessions on every turn, and
a mistake draws in his pane or stops a session starting.

**The design differs from every report in one place, and the replay is why. The script writes a file and posts
nothing.** On each run it cuts the quota, compares it with the last it wrote, and on a change replaces one 0600 file
named for the session under Tortie's own folder. Main reads that folder. This removes the token (which has no home in
`--settings`), curl, the local route, the token file a SIGKILL would leave, and the clock that loses the last number.
It survives Tortie being closed, which an idle `agy` would otherwise not repeat for hours. And it can finish inside the
300 ms kill.

1. **The provider table first.** `UsageProviderId` gains `antigravity`. `LoginProviderId` stays two, with one narrowing
   function. The three ternaries become one compiled table, in which Antigravity's entry has no host, no reader, no
   transport and no parser of an endpoint. Research 72's read only fetch must not be copied here: Google has said no to
   it in writing.
2. **The flag.** For the Antigravity row alone, straight after the program, holding `statusLine` only. Never recorded in
   the manifest. Held behind a 1.4.10 floor on the very file the pane runs, read as pi's floor is
   (`src/main/agents/detection.ts:1099`). A file that changed since the scan gets no flag until the next scan, because
   `agy` updates itself. Stand aside when the person's own flags carry `--settings` in any spelling, or his settings
   name a `statusLine` that is not switched off. Sessions on this Mac only. None for a SpecStory wrapped one.
3. **A launch guard.** A flagged `agy` that ends within a few seconds with an error turns the flag off for that file
   until it changes, with one log line.
4. **The script.** Generated whole by Tortie, 0700, in Tortie's own folder. No network, no credential, no project
   folder. A bounded read of standard input. No output, no error text, always exit 0, no background child, and a missing
   script exits 0 too. It keeps the four compiled bucket ids with fraction, reset and disabled, `plan_tier`, and a
   salted hash of the address made there. Never the address, a path, a title or an id. It compares without the
   countdown, and writes by write then rename.
5. **Reading it.** Main reads the folder by session id while the switch is on and the window is in front, and at boot.
   An unknown id is dropped and counted once. Used is 100 times (1 minus remaining), clamped. A `remaining_amount`, a
   disabled bucket, NaN or an absent value draws nothing. A full bucket draws no reset. A passed reset voids its window.
6. **Age** is the time the block last changed, because an unchanged run proves no new ask. Older than 30 minutes draws
   the stale glyph and its age, decided at compose time.
7. **Accounts.** The last writer's account wins whole. A new hash drops every held bucket first. A file with no hash is
   ignored. No address reaches IPC, a log or the snapshot.
8. **The snapshot** gains one optional second group and one state, `waiting`. No menu, door, phone or IPC channel
   changes.

**What it refuses.** Any read of a Google credential, keychain item or profile. Any request to a Google host. `agy -p`,
`agy acp`, a local server call or a timed start. Any edit of his `agy` settings. Composing or replacing a person's own
status line. A Gemini row. Credits. A promise of service. Remote machines. Switching accounts.

**If one part must wait.** The provider table with its gate, `conformance:usage`, needs none of his answers, changes
nothing a person sees, and is worth having alone. The Antigravity row waits for question 1 and the reading. Gemini is
not a split: it is refused until Google serves a personal plan there or publishes a quota route.

**Four things the tree adds, read by the writer, for the build's spec step.** A session with SpecStory capture on is
wrapped (`src/main/sessions/create-local.ts:703-721`; capture is off until a person turns it on for an agent,
`src/shared/settings.ts:100-110`), and the outline gives a wrapped session no flag. If his Antigravity sessions start with
capture on, his row stays empty for ever. That is worth settling before the build and not after. A restore does not
start the agent: it TYPES the resume command at a shell prompt, unexecuted (`src/main/restore/restore.ts:332`, `:1275-1305`). So inline JSON
on a resume is a long line the person sees and his shell keeps when he presses Return. A short path is better to look
at, and a missing file ends the session. The launch guard cannot see that session end either. And `jq` is at
`/usr/bin` on this Mac, but Tortie's floor is macOS 13 and no role checked what that ships, so the shipped script may not
assume it.

---

## 14. Questions for him

1. **Build the Antigravity meter from `agy`'s own status line, knowing Google was asked twice whether this is allowed and
   has not answered?** Default: yes, off until you switch it on, with that said in Settings in one line. You may ask
   Google yourself first (topic 178823 is open). Nobody will ask for you.
2. **Show no Gemini row, since a personal Google sign-in no longer works in the Gemini CLI and your Google AI plan's
   coding quota is the Antigravity row?** Default: yes, none. The Gemini app's own limits stay on gemini.google.com.
3. **May Tortie read one key, whether `statusLine` is present, in `~/.gemini/antigravity-cli/settings.json`, so that it
   stands aside when you have a status line of your own?** Default: yes, presence only. If no, the meter stays off
   unless you say you have none.
4. **On the face, the Gemini group's two windows, with Claude and GPT on the hover card?** Default: yes. The other choice
   is whichever group is fuller, which would name a different group from day to day.
5. **May the build start with the short reading of section 12.2, at most six `agy` starts (two of which should end at
   once) and one word of a turn, after you sign in again as `agy`'s notice asks?** Default: yes. Two things from the first reading are yours to remove
   if you wish: the one conversation in `/resume`, and the trusted entry for the removed scratch folder.

The writer adds one, because the judge's five leave it open. **Do your Antigravity sessions start with SpecStory capture
on?** Default: assume they may. The opening reading then adds one wrapped start, counted in the six, and the spec step
decides from it whether a wrapped session can carry the flag. If it cannot, the row says nothing for those sessions.

---

## 15. What in research 72 this supersedes

Section 3, "The other six, briefly", for both:

- **Gemini.** The endpoint is real. Captured on a personal plan, it answered 403 `SUBSCRIPTION_REQUIRED` (one capture,
  by others, 2026-08-22). Google stopped the sign-in on 2026-06-18. There is nothing to meter.
- **Antigravity.** orca no longer relabels a Gemini result. It runs `agy -p /usage` every 15 minutes (BYTES, orca's main
  of 2026-11-24), which Google's newest answer calls unsupported. The number it looked for is in `agy`'s own status
  line payload.

Section 5's ruling stands whole. Its first posture, the tap that reads no credential, is the one that fits. Its second,
the read only fetch, fitted Claude and Codex and is refused for Google.

---

## 16. Evidence

### 16.1 The tree at `e424fc64`

`src/shared/usage.ts:24` and `:26` (the two providers), `:36` (the states), `:75` (the scoped row), `:181`
(`usageHasNumbers`), `:190` (the clamp), `:203` (the plan word's cap). `src/shared/settings.ts:285`, `:292`, `:314`.
`src/shared/logins.ts:37`. `src/main/usage/service.ts:255`, `:334`, `:353`, `:378`, `:387-430`, `:495`, `:590`.
`src/main/usage/statusline.ts:73`, `:303-310`. `src/main/activity/hooks.ts:789` (the Claude tap's decision), `:965`
(the flag's splice). `src/main/sessions/create-local.ts:679-684` (the splice into the recorded argv).
`src/main/restart/extras.ts:80-92` (taking it out). `src/main/agents/registry.ts:1345` (the Antigravity row).
`src/main/agents/detection.ts:721`, `:1099` (the file that runs, and pi's floor). `src/main/restore/restore.ts:332`,
`:1275-1305`. `src/renderer/app/usage-copy.ts`, `src/renderer/settings/usage-copy.ts:72`, `:78`.

### 16.2 The scratch folder, `/private/var/tmp/tortie-wt/scratch/p373/`

`results/*.json` (the eight investigator and adversary answers), `*/report.md` and `*/notes.md` (their long forms),
`live-report.md` and `live-readings-*` (the one launch), `judge/` (the judge's replay, its saved pages of the day and
the script of section 12.2), `writer/replay2.py` (section 6.5's last three rows). The folder is the phase's scratch and
goes when the phase lands. What a later round needs is in this document.

### 16.3 The pages, all read on 24 November 2026

antigravity.google: `/terms`, `/docs/faq.md`, `/docs/plans.md`, `/docs/settings.md`, `/docs/changelog.md`,
`/docs/cli/statusline.md`, `/docs/cli/title.md`, `/docs/cli/commands/usage.md`, `/docs/cli/headless.md`,
`/docs/cli/reference.md` (all undated but the changelog, whose newest entry is 2026-11-24). developers.google.com,
Code Assist deprecations (2026-10-09). support.google.com/gemini/answer/16275805 (undated). discuss.ai.google.dev topics
128747, 139788, 178823, 185992, 186139, 186246, 195031, 196177, 197943, 198498, 199703, 200467, 201373, 201416, 203283,
203369, 203779. github.com/google-antigravity/antigravity-cli issues 397, 490, 709, 1045, 1629, 1688, 1701.
github.com/google-gemini/gemini-cli issues 28912, 29101, 29425, 30320. github.com/steipete/CodexBar PR 3139 and issue
5129.
