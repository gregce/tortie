# Research 70. Spreading the word: how to talk about Tortie and how to show it

**Status.** A study the operator asked for on 2026-08-30. It changes no queue and no phase. It names
experiments, each with a prediction and a number that decides it, and the operator picks which to run.

**The answer first.** One tweet on 2026-08-26 did more than the previous fourteen days combined, and
the numbers say exactly why. It was the only piece of Tortie writing that (a) named the field it sits
in, (b) said in one sentence what is different, and (c) showed thirteen seconds of the real app. Every
proposal below is a way to do those three things again, on a schedule, without the operator having to
be witty on demand.

Five things to do, in the order they pay back:

1. **Get listed where the category is being compared.** Three roundups ranked this category in
   August and Tortie is in none of them. It IS in `andyrewlee/awesome-agent-orchestrators`: the
   maintainer added it himself on 2026-08-26, fourteen hours after the tweet, which is the tweet's
   least visible and most durable effect. The three roundups are the cheapest reach still open, and
   they compound, because those pages are what the recap accounts on TikTok and X read.
2. **Ship the "quit test" as the signature demo.** Nobody in the field shows what happens when you
   kill the app. Tortie's whole promise is that the work survives it. Thirteen seconds, `kill -9`,
   reopen, everything is there. Put it in the README, on tortie.sh, and pin it.
3. **Turn the changelog into the posting calendar.** Five releases shipped in the six days around the
   tweet and none of them was announced. The changelog is already written in "what a person can now
   do" voice. A script drafts one post per release into Ordinal for review; the operator approves or
   deletes. That is the automated half. The human half is which one gets a video.
4. **Answer the recurring question where it is asked.** r/ClaudeCode asks "how do you run multiple
   agents at once" about once a week, and the answers name cmux, herdr, Orca and tmux. A real answer
   with the durability angle, once a week, by the operator, no link unless asked for.
5. **Keep the cat.** The tweet's hook was "I drive my agents with a cat." It is the one thing in the
   field that is not a killer whale, a conductor or a mission control. Mascot, name and the calm
   register are one asset. Do not professionalise it away.

The rest of this document is the evidence, the voice, the shot list, the pipeline, a four week
calendar and the refusals.

---

## 1. What the tweet did, measured

All numbers read on 2026-08-30 from the GitHub API and the screenshot the operator supplied. The
repository has been public since 2026-08-12.

**The post.** 2026-08-26 09:13. 22.4K views, 100 likes, 193 bookmarks, 8 reposts, 5 replies, one
13 second video of the real window. Bookmarks at almost twice likes is the tell: people saved it to
try later rather than to agree with it. That is a download intent signal, and the download numbers
confirm it.

**Repository traffic by day, unique visitors.**

| Day | Uniques | Note |
| --- | --- | --- |
| 08-16 | 30 | First public mention, probably a LinkedIn post |
| 08-17 | 22 | |
| 08-18 to 08-25 | 2 to 12 a day | Eight days of nothing |
| **08-26** | **53** | The tweet |
| **08-27** | **67** | The day after, larger than the day of |
| 08-28 | 16 | |
| 08-29 | 15 | Back to a floor three times the old one |

**Stars by day.** 3 on 08-16, 1 on 08-19, then **15 on 08-26 and 16 on 08-27**, then 2, 1, 3. 31 of
the 41 stars came in the 48 hours after the post.

**Downloads by release.** Every release before the tweet had between 6 and 31 downloads. v0.76.1,
which was the current release when the tweet went out, has **303**. That is ten times the previous
best (v0.31.0, 49) and more than every other release combined. Nothing else changed that day.

**Where the visitors came from, 14 day window.** t.co 57 uniques, tortie.sh 67, github.com 22,
linkedin.com 23, Google 4. Read together: the tweet sent people to tortie.sh first, and tortie.sh sent
them on to the repository. The site is doing its job as the landing, and LinkedIn is a real second
channel at about 40 percent of X.

**What is missing from the measurement.** tortie.sh runs Vercel Analytics (`BaseLayout.astro`
imports it), so the site's own numbers exist and were not read for this document. The operator should
read them for 08-26 and 08-27 and put the download click count beside the 303. There is no in-app
telemetry, by design, and this document proposes none. Downloads per release from the GitHub API is
the metric, and it is enough.

**The decay.** Two days of lift, then a floor about three times the old floor. That is the normal shape
of one post. The question this document answers is how to make the next lift not depend on one lucky
sentence.

---

## 2. Why that sentence worked, so it can be written again

The tweet, verbatim:

> hAvE yOu hEaRD aBoUt: omniagent, paseo, orca, t3code, herdr, cmux, etc etc?
>
> ofc but I drive my with agents sessions with a cat.
>
> 👉tortie.sh
>
> a calm agent multiplexer that feels like vscode, doesn't make you learn tmux and does everything it
> can to save your work

Four things, each of which is reusable on its own.

**It named the field.** The mocking case on the first line is the joke, but the list is the work. A
reader who already knows three of those names is exactly the reader Tortie wants, and the list told
them in one line that this is the same category. Every other Tortie sentence so far ("a calm agent
multiplexer with familiar IDE features") assumes the reader knows what an agent multiplexer is. Most
do not, and the ones who do learned the word from cmux's or Orca's launch, not Tortie's.

**It was self-aware about the crowd.** "etc etc" admits there are too many of these. The field is
loud, and the corpus in section 3 is full of people saying so. A product that agrees the field is
noisy, and then says it is the quiet one, has said its whole positioning in the shape of the sentence.

**The cat is a differentiator, not a decoration.** Every other product in the list is named for
power or control: an orchestrator, a conductor, a herder, a killer whale, a mission control. "I drive
my agents with a cat" is funny because it is the opposite register, and the opposite register is the
product. The Zen document says calm; the cat says it in one word. Keep it.

**Three promises, each one demoable.** Feels like VS Code. Does not make you learn tmux. Does
everything it can to save your work. Every one of those is a thirteen second video. Section 5 is the
shot list.

**And it showed the real window.** Not a rendered explainer, not a slide, a screen recording with the
actual session list and a hand cursor. The corpus says the same thing about every post that moved in
this category: real UI, short, one idea.

The one thing to fix: the typo ("drive my with agents sessions"). It did not matter here and it will
not always be forgiven. The Ordinal review step in section 6 exists partly for this.

---

## 3. Where the category is being discovered right now

Run on 2026-08-30 with the last30days engine over 2026-07-31 to 2026-08-30, 48 items across six
sources, plus reading the referenced pages. Recent evidence is thin (22 of 48 items in the last seven
days), so weights are indicative. The raw file is outside the repository in `~/Documents/Last30Days/`.

### 3.1 The channels, ranked by what they produced for somebody in the last month

| Channel | Evidence | What it rewards | Tortie today |
| --- | --- | --- | --- |
| **r/ClaudeCode and r/ClaudeAI** | "Orca ADE is incredible", 147 points, 85 comments, 08-23. "How are you running multiple coding agents at the same time?", 79 comments, 08-20. "How do you actually manage multiple parallel Claude Code sessions without losing your mind?", 08-12, where the answers name cmux and tmux. "What do people mean by my harness", 222 points, 114 comments | A user's own enthusiasm post, or an honest answer to a recurring question. Vendor posts get downvoted | Absent. Not one mention in the window |
| **Roundup pages and lists** | amux.io "Best AI Agent Multiplexers Compared (2026): 12 Tools Ranked", 08-13. nimbalyst.com "Open Source Agent Workspaces 2026: 8 Tools Compared", 08-13. @T_Zahil "I tested 10 AI coding orchestrators: Conductor, Codex, Orca, Paseo, T3 Code and more", 08-07 | A clear one-liner, a licence, a platform, an install command, and a README somebody can read in a minute. These pages are the source material for the next row | **In none of the three.** Listed in `andyrewlee/awesome-agent-orchestrators` since 08-26 (#178, added by the maintainer the day of the tweet). The three roundups are the largest gap in the document |
| **TikTok recap accounts** | @github.signals on Bohay, 9,557 views, 316 likes, 08-20. @the_contextian on T3 Code, @azthnews (Vietnamese) and @farodev.io (Portuguese, 1,272 views) on Orca | These accounts read GitHub READMEs and lists and produce 30 second explainers. Their scripts are the README's first paragraph plus the star count plus the install line. Non-English creators relay the same material a week later | Absent, and reachable only through the row above |
| **X, the operator's own post** | This tweet, 22.4K. @1jehuang "I run 20 coding agents in parallel, launching Jcode", 828 likes. @elijahmuraoka_ "My tmux tweet got 350K views overnight so I open sourced my setup", 310 likes | A personal claim about how the author works ("I run 20 agents"), then the tool as the answer. Follow-ups that ride the first post | One post. No follow-up. Five releases since, unannounced |
| **LinkedIn** | 23 uniques to the repo in 14 days, about 40 percent of X | The same post, in longer form, with the video | One post on 08-16, apparently |
| **Persona hooks** | "How DHH runs 16 AI agents in parallel using herdr", r/AI_Agents, 08-28 | A named person people already follow, doing the thing | None. Section 7 has a candidate |
| **Hacker News** | Zero items about any of these tools in the window. "Show HN: terminal-code – VS Code inside the terminal" is the nearest | A technical writeup with a mechanism in it. Not a product launch | Untried. The tmux-as-durability-layer story is the right shape for it, section 5.4 |
| **Google** | 4 uniques | Comparison queries | tortie.sh/compare exists and is the right asset. It needs the category pages to be indexable and linked |

### 3.2 What people say the pain is, in their words

These are the sentences to write toward, because they are the sentences a reader recognises.

- "you end up with ten different windows open, half of which are stuck waiting for permission while
  you forget about them" (the Bohay recap, 9.5K views). This is ⌘J and the needs-input badge.
- "If I have several Claude Code [instances]..." then two problems, from the Conductor thread. The
  second problem is always losing track, and the first is usually them stepping on each other.
- "Continuity failures at least announce themselves when compaction eats something. The room quietly
  rotting doesn't." (11 upvotes, the "humble guide" thread). This is Catch Me Up and the story
  column, and nobody else in the field has it.
- "I've tried cmux months ago, then I moved to herdr cause I do dev work on pc and Mac and then bb as
  of last few weeks" (the Orca thread). People are churning through these tools monthly. That cuts
  both ways: they will try Tortie, and they will leave unless the durability is felt in the first
  session.
- "Use tmux. Then /rename each Claude session to something memorable." The top practical answer in
  the "without losing your mind" thread is literally Tortie's mechanism done by hand. The reply
  writes itself, and section 7 writes it.

### 3.3 What the winners are NOT doing that Tortie can

Every product in the list demos parallelism: five agents, sixteen agents, twenty agents, worktrees,
live diffs. Not one of them demos the failure. Nobody kills the app on camera. Nobody reboots. Nobody
shows the resume command arming itself. Research 60 established that Orca has real durability too,
so this is not a claim that Tortie is alone in having it. It is a claim that Tortie is alone in being
ABOUT it, and the demo that proves it is uncontested.

---

## 4. How to talk about it: the voice, the sentences, the words to stop using

### 4.1 The position, in one line and in three

The one line, keep it: **a calm agent multiplexer that feels like VS Code, doesn't make you learn
tmux, and does everything it can to save your work.**

The three, for anywhere longer:

1. **Your agents keep running when the app doesn't.** Quit it, crash it, reboot. The sessions were
   never inside the window.
2. **One window, every project, every agent.** Tabs per project, named sessions per tab, eleven
   agents, and one key that jumps to whichever one is waiting on you.
3. **It reads back to you.** Catch Me Up shows what every session has been doing since you looked,
   word for word from the agent's own log.

### 4.2 The register

The Zen document already has the register and the marketing should not invent a second one. Plain
words. Short. Say what a person can do. Admit a limit in the same breath. Refuse things out loud.
Never a superlative. The tweet's lowercase and typo were part of its charm on X and should NOT be
carried to the README, the site or LinkedIn, where the same reader expects the changelog's voice.

Words to use because the corpus uses them: sessions, agents, one window, keeps running, survive,
resume, what needs me, quiet, calm, tmux (as the thing you do not have to learn).

Words to stop using in public copy: multiplexer as the first noun (it is correct and it is jargon;
lead with the promise, then name the category), orchestrate, harness (the 222 point thread proves
nobody agrees what it means), durable (a builder's word; say "keeps running" or "survives"),
manifest, restore (say "comes back").

### 4.3 Say it by contrast

The tweet worked partly because it named the neighbours. Keep doing that, honestly, because
tortie.sh/compare already does it with evidence and dates. The contrast sentences that are true and
differentiating:

- "Not a mission control. There is no dashboard, no counters, no feed. One key takes you to the
  session that needs you and the rest stay quiet."
- "Not an orchestrator. You run the agents. Tortie keeps them alive and tells you when one is
  waiting."
- "Not a new IDE. It looks like the one you have. It just remembers."
- "Not tmux. It is tmux, underneath, and you will never see it."

### 4.4 The self-aware move, reusable

"hAvE yOu hEaRD aBoUt" is a one-time joke, but the shape, agreeing the field is crowded and then
stepping sideways, is a template. Variants that are not a repeat:

- "there are now more agent managers than agents. mine is a cat. tortie.sh"
- "everyone is shipping mission control for coding agents. I shipped a place to leave them running
  and come back. tortie.sh"
- "the eleventh agent multiplexer this month, and the first one that shows you what happens when
  you kill it" (over the quit test video)

### 4.5 Sentences that answer the recurring Reddit question

Written for r/ClaudeCode, as the operator, in the first person, no link in the body. If somebody asks,
the link goes in a reply. These are drafts, and the point of writing them here is that the good answer
is mostly the same every week.

> I run them in one window with a session per thread of work, named, and the sessions live in a
> private tmux server so closing the window or the app doesn't touch them. The part that took the
> longest to get right was not the running, it was coming back: after a restart each session shows
> its last screen and has its own `--resume` typed and waiting, so you decide when to reconnect the
> conversation. I built this into a Mac app because I got tired of doing it by hand, but the
> pattern works with plain tmux too: one session per task, `/rename` it, and never run an agent in a
> terminal that dies with the window.

That answer gives the tmux users something and only names the app in one clause. It is the register
the subreddit rewards, and it is true.

---

## 5. How to show it: the shot list

The tweet proved thirteen seconds of real window beats anything produced. Every item below is a
screen recording of the shipped app, under twenty seconds, one idea, no voiceover, no music, a
caption in the post rather than on the video. The five README GIFs in `docs/readme/` are the right
raw material and the wrong length; they were made for a page, not a feed.

### 5.1 The signature: the quit test

Three sessions visible, one of them mid-turn with output scrolling. Cursor moves to the Dock, or a
terminal types `kill -9` against the Tortie pid. The window vanishes. Two seconds of desktop.
Reopen. The same three sessions, the same output, the one that was mid-turn has kept going and is
further along. End on the session list. Twelve to fifteen seconds.

Caption: "this is what happens when you kill Tortie. (the agents didn't notice.)"

This is the post to pin, the video to put first on tortie.sh and in the README, and the answer to
"why not just use tabs in Ghostty". Then do it again with a reboot, longer, for the site only: the
restore shows the scrollback, the resume command arms, the operator presses Enter, the agent
answers with context.

### 5.2 One promise, one clip

| Clip | What is on screen | Seconds | Caption shape |
| --- | --- | --- | --- |
| ⌘J | Working in project A. A badge lights on a session in project B. ⌘J. You are there, the question is on screen | 8 | "one key to whichever agent is waiting on you" |
| Eleven agents | ⌘T, the agent grid, start Codex beside Claude beside Gemini in one project | 10 | "claude, codex, cursor, gemini, pi, grok… one window" |
| Catch Me Up | ⇧⌘U, the project page with one line per session, open one, the exchanges, Return jumps into the live session | 15 | "what did they all do while I was at lunch" |
| Feels like VS Code | ⌘P across projects, a file, a diff against HEAD, back to the session | 10 | "you already know how to use it" |
| Story | The story column on a session, the timeline of one line summaries, one press shows the turns | 10 | "every session keeps its own story" |
| The cat | The status bar cat, the menu behind it | 5 | no caption, or "the cat has a menu" |

Six clips plus the quit test is seven posts, which is seven weeks of one video a week, or a two week
burst. Each clip is also a README row and a docs page hero, so the recording pays three times.

### 5.3 The live demo is an asset nobody else has

`demo/` runs the real renderer in a browser against a fixture bridge, and tortie.sh embeds it as a
click-to-try hero. Not one product in the corpus lets a reader try it without installing. This should
be a post of its own ("try it in the browser first, nothing installs") and it should be the link in
every reply where somebody is skeptical. The demo README's own "not yet" list (search and quick open
answer empty, fixture content is first draft) is the work that makes that post safe to make.

### 5.4 The long form, once

One technical writeup for Hacker News and for the site: "The app is disposable. The session is not."
The private tmux server, why `-L gmux` and never the user's server, addressing sessions by identity
rather than name, the manifest, why agents are launched by bare name (the `pkill -f` finding from
Phase 12.7), what the resume arm does and why it waits for Enter, and the honest list of what does
not survive. Research 26 and research 33 are most of the draft. Hacker News had zero items about any
of these tools in the window, which means either nobody has tried or the product-launch shape does
not work there. A mechanism writeup with a bundled `tmux` and a `kill -9` in it is the shape that
does.

### 5.5 The release cadence is itself a story

Twenty-five versions between 08-21 and 08-30, five tagged releases in six days, and community PRs
merged with credit in the body. "What shipped this week" as one screenshot and five bullets from the
changelog is a weekly post that costs nothing, because the changelog is already written in that voice.
Section 6 automates the draft.

---

## 6. The pipeline: what a script does and what a person does

The operator asked for a mix of manual and automated. The split that fits this codebase's own rules
(a human confirms, out of band, before anything goes anywhere) is: **scripts draft and measure,
people approve and record.**

### 6.1 Automated: release to draft post

Every tagged release already produces a CHANGELOG section whose lead paragraph says what the release
is about in two or three sentences and whose bullets say what a person can now do. That is a post.

A script, `build/release-posts.mjs` or a plain shell script outside the tree, run after each release:

1. `gh release view <tag> --json body` and take the lead paragraph and the Added bullets.
2. Write one X draft (the lead paragraph, trimmed to the first two sentences, plus `tortie.sh`), one
   LinkedIn draft (the lead paragraph and the three strongest bullets), and one Reddit-safe paragraph
   (no link, first person) into a dated markdown file.
3. Hand the files to the `ordinal-ops` skill the operator already has, which creates them in Ordinal
   as ForReview. Nothing is scheduled until a person flips it.
4. Append a row to a local CSV: tag, date, download count at draft time.

The operator reads the drafts in Ordinal, fixes the sentence a script cannot write, attaches the clip
if there is one, and schedules or deletes. The typo in the winning tweet is the argument for the
review step.

### 6.2 Automated: the number that decides whether it worked

A second script, weekly or on demand, that prints the table in section 1 fresh: downloads per
release, stars per day, repository uniques per day, referrers. All of it is four `gh api` calls with
no auth beyond what `gh` already has. Put it beside the posting log and the question "did that post
work" has an answer within 48 hours. The rule of thumb from the one data point: a post worked if the
current release gains 100 downloads in the following three days. A post that produced views and no
downloads was entertainment.

### 6.3 Semi-automated: recording the clips

The probes under `build/` already drive the real app through `withElectron`, and Phase 140's helper
ends what it starts in a `finally` block. A recording probe that opens a fixed scratch profile, seeds
three sessions from a script, performs one of the section 5.2 gestures and captures the window at
60 fps would make the clips reproducible per release rather than a one-off screen recording. The
GIFs in `docs/readme/` are evidence it has been done by hand once. This is worth doing only if the
weekly clip actually becomes weekly; if it is seven clips once, CleanShot is faster. **Whatever is
built obeys the machine discipline section of CLAUDE.md: one Electron, ended in `finally`, and
`npm run gate:electron` stays green.**

### 6.4 Manual, and it cannot be otherwise

- The Reddit answers. A script posting to r/ClaudeCode would be detected and would poison the well.
  One honest answer a week from the operator's own account.
- The list submissions in section 7.1, once each.
- The pinned post and the profile. The X bio should say the sentence and link tortie.sh.
- Replying to every one of the five replies and every mention. 193 people bookmarked it; a fraction
  of them will say something later, and the reply is the second touch.

---

## 7. The experiments, each with a prediction

Ranked by expected downloads per hour of the operator's time. Every one names the number that says it
worked, so it can be stopped.

### 7.1 Get listed (one afternoon, once)

- `andyrewlee/awesome-agent-orchestrators` already lists Tortie (added by the maintainer in #178 on
  08-26, the day of the tweet) under Parallel Coding Agents, Desktop & Web, with a line that is close
  to the tweet's sentence. Nothing to do there beyond keeping the README's first paragraph true.
- Email or DM the authors of the amux.io and nimbalyst roundups with the one line, the licence, the
  platform, the download link and the quit test video. Both pages were dated 08-13 and both are
  "2026" pages that will be revised. Offer the compare page on tortie.sh as a reciprocal citation,
  which is true and useful to them.
- Reply to @T_Zahil's "I tested 10 orchestrators" thread with the one line and the video. Not a
  pitch, a "you missed one, and it's the one that's about the failure case".

Prediction: 30 to 80 repository uniques in the week after each listing lands, and the TikTok recap
accounts pick it up within two weeks of a roundup revision. Decide by referrer counts.

### 7.2 The quit test post (one recording, one post)

Post it as a reply to the original tweet first, so it inherits the thread, then as its own post two
days later with the section 4.4 caption. Prediction: it does at least half the original's views and
a higher bookmark ratio, because it is the proof the original only claimed. Decide by downloads on the
release current that day.

### 7.3 The weekly answer on r/ClaudeCode (thirty minutes a week, eight weeks)

Search the subreddit for that week's "how do you run multiple" thread. Post the section 4.5 answer,
adapted to what the person actually asked. Prediction: the first three produce nothing measurable,
the fourth or fifth produces a "what app is this" reply, and the referrer table shows reddit.com by
week six. Stop at eight if reddit.com never appears.

### 7.4 The release post, every release (five minutes a release after 6.1 is built)

Prediction: each release post produces 20 to 40 downloads on its own, small, but it turns the
download floor from 15 a day into a sawtooth that never returns to 15. Decide after four releases by
comparing the floor.

### 7.5 A persona (unknown cost, high variance)

The herdr post that moved this week was "how DHH runs 16 agents". Tortie has one heavy user already:
aronchick filed eleven issues, which is more engagement than anybody except the operator, and
jakehildreth has two merged PRs. Ask each of them, once, whether they would write or record how they
use it. Do not script it, do not incentivise it. Prediction: one of two says yes, and a user's post
outperforms the operator's on Reddit by the subreddit's own rules.

### 7.6 The Hacker News writeup (one day of writing, once)

Section 5.4. Prediction: the widest variance of anything here. A front page result is 2,000 to 5,000
uniques and a hundred stars in a day; the median outcome is 40 uniques. Do it once, on a Tuesday
morning US time, title it after the mechanism and not the product, and do not do it again for a
quarter regardless of outcome.

### 7.7 The live demo post (one post, after the demo README's "not yet" list is shorter)

"try it in the browser, nothing installs, then decide". Prediction: a higher click rate to tortie.sh
than the video posts and a lower download rate, because it satisfies curiosity in place. Worth it
because the compare page and the docs are one click from there.

---

## 8. A four week calendar, if the operator wants one

| Week | Automated | Manual |
| --- | --- | --- |
| 1 | Build 6.1 and 6.2. Run 6.2 once to baseline | Record the quit test. Post it as a reply, then alone. Submit 7.1, all three. Update the X bio |
| 2 | First release post goes through Ordinal | Record ⌘J and Catch Me Up. Post one. First r/ClaudeCode answer. Ask aronchick and jakehildreth |
| 3 | Release posts continue | Post the second clip. LinkedIn long form with the quit test. Second answer. Read Vercel Analytics against the CSV |
| 4 | Read 6.2 and decide which of 7.2 to 7.5 continue | Draft the Hacker News writeup from research 26 and 33. Do not post it yet |

At the end of week 4 the CSV says which channel produced downloads per hour, and the calendar for the
next four weeks is whichever two rows won.

---

## 9. What NOT to do

These follow from the Zen document and from the corpus, and they are the ones a growth instinct will
argue for later.

- **No in-app "share" or "star us" prompt, no update badge, no counter.** The product is the calm one.
  A nag inside it contradicts the only thing the marketing says.
- **No telemetry to measure the marketing.** Downloads per release from GitHub and Vercel Analytics on
  the site are enough, and section 1 shows they are enough.
- **No paid promotion, no engagement farming, no scripted Reddit.** r/ClaudeCode downvotes vendors
  and upvotes users. One detected astroturf is the end of that channel.
- **No feature built for a demo.** The corpus is full of demos of twenty parallel agents. Tortie's
  demo is the quit test, and the quit test is already true. If a clip needs a feature, the clip is
  wrong.
- **No superlative and no ranking of competitors in Tortie's own voice.** The compare page ranks
  nothing and says so. The tweet named the neighbours without ranking them; keep that.
- **No second name and no professionalised cat.** The bundle id, the socket name and the CSS classes
  still say gmux and that is fine and deliberate. Public copy says Tortie, always, and the cat is the
  brand.
- **No "finish off" of the register.** A launch video with music and a voiceover would be the first
  Tortie artefact that does not sound like Tortie.

---

## 10. What this document did not do

It did not read the tortie.sh Vercel Analytics, which the operator has access to and which would put a
click count beside the 303 downloads. It did not read the five replies to the tweet or the quote posts,
which would say who the 22.4K were. It did not check whether a Homebrew cask exists (`brew search
tortie`), and if one does not, "brew install --cask tortie" is a line the recap accounts want and the
README lacks. It sampled one month of one
engine's view of the internet, with Hacker News and YouTube returning nothing in the window, so the
absence of those channels above is an absence of evidence and not evidence of absence.

Nothing here is queued. The operator picks.
