# Research 48. What people actually want, mined from 30 days

**Status.** A spike the operator asked for on 2026-08-15. It changes no queue and no phase.
Nothing here is scheduled. The operator decides what, if anything, becomes a phase.

**The answer first.** Four candidates survive. They are worth two pieces of work, not four.

1. Tortie tells you outside its own window when a session needs you.
2. A session that moved while you were away carries a mark until you look at it.
3. `tortie .` from the shell opens a folder as a project tab.
4. A session stopped by a refused provider says so instead of going quiet.

Items 1, 2 and 4 are one feature with three triggers. Item 3 is small and independent, and its
evidence was struck, so it stands on the Zen alone and on the operator's own judgement.

Eleven candidates were considered. Seven were convicted as gimmicks. Eighteen further items in
the corpus were killed before that because they are about pricing, model quality or vendor
politics, and no shell around an agent can change any of those.

Two of the four survivors would EXTEND the Zen. Section 10 states the principle each one asks the
operator to accept, in one sentence each, because neither should be built by accident.

---

## 1. Method, and where it is weak

**The corpus.** Three queries were run with the last30days engine on 2026-08-15 over the window
2026-07-16 to 2026-08-15. The raw files are outside the repository, in the session scratchpad. The
totals below come from each file's own footer.

| Query | Items | Sources | Strength |
| --- | --- | --- | --- |
| claude code, codex, cursor session workflow complaints | 131 across 9 sources. Reddit 22 items with 2,464 points and 1,054 comments. Hacker News 20 items. TikTok 48 items with 162,688 views | r/cursor, r/ClaudeAI, r/AI_Agents, Hacker News | Richest. Most of this report rests on it |
| tmux, zellij, wezterm, ghostty frustrations and feature requests | 66 across 5 sources. GitHub 21 items with 276 comments. X 12 items. TikTok 14 items | cyberuni/cyber-mux, rbcministries/clickup-todo-cli, r/claude | Good on mechanism, thin on named pain |
| developers switching editors, missing features | 76 across 7 sources. Reddit 7 items. Hacker News 0 items | r/BestofRedditorUpdates, r/CoherencePhysics, Fireship | Weak, and partly a keyword trap |

**The editors query partly missed, and the numbers say how badly.** All 7 of its Reddit items came
from r/BestofRedditorUpdates and r/CoherencePhysics, which have nothing to do with editors. Hacker
News returned nothing at all. 20 of its 76 items carry the engine's own `date:low` marker, meaning
the date is not trusted, and several of those are years old. Its highest engagement item is a
Roblox mouse cursor tutorial at 569,002 views. Its most quoted YouTube channel is Fireship, whose
top item in the file is dated 2026-04-06 and therefore falls outside the window. Two of the eleven
candidates below lean on this file, being candidate 8 and part of candidate 3. Both are marked.

**How evidence was weighed.** A single post with no replies is weak. The same complaint stated by
unrelated people in unrelated places is strong. A vendor describing the pain its own product sells
against is not a user reporting pain, and every such source is named as a seller in the tables
below. Seven of the strongest looking sources in this corpus are sellers.

**What was done to each candidate.** Every one was tested three times.

- The Zen test. FITS means it needs no new principle. EXTENDS means Tortie would have to adopt a
  named principle on purpose. VIOLATES means it shouts, counts, decorates, or turns Tortie into a
  dashboard.
- The permanent refusals. No third party code in a Tortie process, no marketplace, no telemetry,
  no cloud component, no tmux vocabulary in the interface, and nothing sets a session status
  except session behavior.
- A prosecution. Each candidate was argued against on six counts, being thin evidence, borrowed
  envy, solved elsewhere, hidden cost, loud by nature, and demo rather than daily.

**Code claims were checked, not assumed.** Every statement in this document about what Tortie's
code does today was verified by reading the tree on 2026-08-15. The file and line are given each
time. No app was run, no tmux server was contacted, and no manifest was opened.

---

## 2. What people already get from Tortie

This section exists because it is the strongest result in the report. Sixteen distinct wants stated
by people in the last 30 days are already shipped. Tortie built them before these people asked.

| Want, merged from the corpus | Evidence | Where Tortie answers it |
| --- | --- | --- |
| One window holding many parallel agent sessions, each with a place | 9 items across all three files. Hacker News Agent-Manager at 98 points and 80 comments, an r/ClaudeCode thread at 104 comments, @darrinhenein, @dev_au_bonnet, @tequilafunks, codeagentswarm, nimbalyst | Project tabs with ⌘1 to ⌘9, per tab session lists, splits, 12 agents |
| Sessions survive closing the app, a crash, a reboot and a closed laptop | 6 items. @grok, moltamp, sweettoolbox, @networkchuck at 473 likes | The private tmux server on socket `-L gmux`. The app is a client |
| The agent comes back still knowing what it was doing | moltamp names it for agents rather than for shells | Armed resume commands per agent, Phases 13.5 and 21, the resume conformance suites |
| Agents should get real panes, not an embedded shell widget | @hackerdocc, 2026-07-31 | Every session is a real tmux pane |
| A pane needs a stable handle you can address later | cyber-mux PR 78, which calls it the deciding question for building a backend | `@gmux-id` plus the `GMUX_SESSION_ID` pane stamp, and immutable `$-id` addressing |
| Every backend should log the same way | pi-extensions PR 40, which reports 4 of 7 backends with no logging at all | Phase 35, uniform logging |
| Keep session state on my own machine, with no hosted component | codersera, claude-tap, and the 467 point plaintext sessions thread with 129 comments | No telemetry, no cloud, a local manifest and local captures |
| Do not make me learn a new keymap, and do not make the multiplexer the interface | The most repeated theme in the multiplexers file. @typecraft_dev at 608 likes and 47 replies, @tequilafunks, @hackerdocc, mattblr | No prefix keys and no attach ritual. macOS accelerators only, from one source in `src/shared/keymap.ts` |
| Keybindings should be discoverable | moltamp, corroborated by a dotfiles pull request that rewrote 12 bindings at once | ⌘/ opens the full map with a plain sentence on every row, and Settings shows the same list |
| Directional focus movement across splits without hunting | 3 items. KoalaVim PR 153, smart-splits.nvim, the wezterm topic page | `Alt+Cmd` arrows move focus across splits and step through sessions |
| Jump straight to whatever needs attention | vibeisland, konsole-pal, mattblr | ⌘J lists every session waiting on you across all projects and jumps to the one you pick |
| Browse past sessions and read them back | 3 items, including the Show HN for Galda, "Come back to Claude Code/Codex without digging through Git" | Past Sessions from Phase 29, plus the SpecStory capture of every conversation |
| Read agent output as structure, not a wall of text | @jacksontechnologies | Markdown and HTML render in place, untrusted pages in a sandboxed frame |
| Choose which model or which flags run a session | 3 YouTube channels with about 350,000 combined views, plus r/codex | agents.json defines an agent with its own launch flags, icon and hotkey |
| Adapters must be tested against the real binary, not a mock | cyber-mux PR 108, which reports 4 of 6 adapters mocked only | `conformance:resume`, `conformance:agents`, `conformance:context`, `smoke:t3` |
| Never require or touch the user's own tmux setup | ai-conductor issue 1414, and the whole adapter cluster | A private socket and a private config. Tortie never adopts a session it did not create |

Three items in the corpus are arguments for the Zen rather than requests, and they are worth
recording because they defend refusals Tortie already made.

- @tequilafunks, X, 2026-08-02, on why he left another tool: "I like Ghostty and didn't want tmux
  itself to become the UI."
- The Pi Stack article argues that every added feature puts latency and bugs on the hot path.
- A Fireship video objects that the newest agent interfaces ask the developer to run a swarm. The
  video is dated 2026-04-06, which is outside the window, so it is context and not evidence.

---

## 3. Already queued or held

These six wants appear in the corpus and are already on the board. Nothing here is a new finding.
The board is not edited by this document.

| Want | Evidence | Where it sits |
| --- | --- | --- |
| A digest of what happened while you were away | 5 sources, including two TikToks at 6,986 and 5,110 views | Phase 44 and Phase 45, both HELD on 2026-08-15 by the operator |
| See CI results where the code is | Not in this corpus. Operator driven | Phase 46, queued |
| It should run on a fresh machine with nothing installed first | @malikontech, and moltamp on sane defaults | Phase 41, bundled tmux 3.7b |
| Open this file in the app I choose | @_rizwan_manzoor running two tools on one repository, @RhysSullivan | Phase 39, Open With |
| An agent installed the wrong way should say so, not die silently | The NixOS wiki page on downloaded binaries that will not run. The operator hit the same shape on a second Mac | Research 47, agent installs |
| Versioned per agent resume contracts with a visible status | The herdr study, research 46 | Recommended, waiting on the operator |

---

## 4. Killed before judging, because they are not about the product

Eighteen items were removed before the Zen test. They are loud, and several are the loudest things
in the corpus, but no terminal shell can answer them.

| Item | Evidence weight | Why it was killed |
| --- | --- | --- |
| Both providers halved their limits this week | 243 upvotes, the highest voted comment in the corpus | Pricing. Tortie cannot change a provider's quota |
| One subscription should take over when the other runs out | Moderate | Pricing and vendor billing |
| Route between providers to stay inside a subscription | Moderate | Pricing. The product half, choosing which model runs a session, is already answered by agents.json |
| A plugin burned 30 dollars in a day | Weak | Pricing |
| Per session cost accounting including subagents | Moderate | Pricing, and the display form is a counter |
| Agents are too slow | Weak. Both posts came from one account selling a competing agent | Model quality |
| Claude is verbose and deceptive | Weak | Model quality |
| Show me more of the agent's thinking while it works | 1,135 likes, the largest single post in the corpus | Model output style. Tortie does not write the agent's output |
| Long sessions get dumber | Strong | Model quality. The resume half of it is already shipped and is listed in section 2 |
| Cursor reserves the right panel for its own model | 64 points, 35 comments | Another vendor's product politics |
| Cursor intentionally breaks the Claude Code integration | Weak | An accusation about a vendor with no evidence attached |
| Elon is not getting my logins | 74 likes | Vendor trust drama aimed at one company |
| Anthropic just killed Cursor and every other IDE | Weak | Promotion with no want inside it |
| Zed changed its default base keymap in a release | Weak | A vendor changelog entry. Nobody reported being harmed by it |
| Permission prompt fatigue, you approve 97 percent of them | Moderate | The prompts belong to the agent, not to the shell around it. Tortie's own confirm gate exists deliberately against this argument |
| A 2022 merge conflict tutorial | None | Outside the window. A retrieval artifact |
| Free repository giveaways, course adverts, tier lists, an acquisition rumour | None | Promotion. The miners already counted these as noise |
| Editors are slow and eat memory | 4 items across 3 platforms, including an Instagram reel at 63,158 views | Not a feature anyone can ship. It survives as a standing constraint, stated in section 11 |

One item was killed only in half. The rate limit complaint is pricing, and it leaves a product
shaped residue that survives as candidate 6.

---

## 5. The eleven candidates, with classification

| # | Candidate | Zen verdict | Prosecution verdict |
| --- | --- | --- | --- |
| 1 | Reach me when I am not looking at Tortie | EXTENDS | SURVIVES, bounded |
| 2 | A session that finished while you were away should not read as idle | EXTENDS | SURVIVES, reframed |
| 3 | Start a session in its own git worktree, in one step | FITS | GIMMICK as scoped |
| 4 | See what one session changed | EXTENDS | GIMMICK |
| 5 | Hand one session's record to another session | FITS | GIMMICK as a phase |
| 6 | A session stopped by a refused provider should say so | FITS | SURVIVES, demoted |
| 7 | Named session sets you can apply to a project | FITS | GIMMICK |
| 8 | `tortie .` from the shell | FITS | SURVIVES, evidence struck |
| 9 | Images an agent prints should draw in the terminal | FITS | GIMMICK |
| 10 | Let me re-record any shortcut, not only agent hotkeys | EXTENDS | GIMMICK |
| 11 | A scratch session summoned over the layout | EXTENDS | GIMMICK |

Nine further wants were tested and failed on a refusal rather than on the prosecution. They are in
section 7 and should not be re-argued.

---

## 6. The seven convictions, and the reason for each

The killed list is as useful as the survivor list, because the same arguments will arrive again.

### Candidate 3. Start a session in its own git worktree, in one step

**Evidence.** Four sources. The r/ClaudeAI thread has 14 comments and none of them were captured,
so we know people asked how to stop agents colliding and we do not know that anyone answered
"worktree". One is a README. One is a vendor sentence, being nimbalyst, "For multi-session Claude
Code workflows, no IDE covers session orchestration, kanban boards, or worktree isolation." One is
a TikTok with **3 views**. The mechanism came from the analyst more than from the corpus.

**The conviction is cost.** Creating the worktree is the small quarter of the job. The rest is
installing dependencies in the new tree, copying the `.env` the repository does not commit,
deciding what happens to the tree when the session is removed, pruning trees whose branches
merged, and refusing to delete a tree holding uncommitted work. A create verb with no remove verb
leaves stale directories on disk within a month, in a product whose promise is that nothing gets
lost. Build the whole lifecycle and Tortie is managing the user's branches, which is orchestration
and is out of scope.

**A correction worth keeping.** It was claimed that `isOutsideProject` already marks a worktree
session, so the display half exists. It does not. `src/renderer/app/session-actions.tsx:30` returns
true whenever `session.cwd` is not inside `session.projectPath`, and its own comment says the
directory could be "a git worktree or any other directory". There is no worktree awareness in the
tree today.

**What might have been worth building, and is not asked for either.** Tortie noticing that two live
sessions in one project both have the repository dirty. That is a data loss shape, so it would be
Tier 3, and no source in the corpus asks for it.

### Candidate 4. See what one session changed

Git already answers what changed, for free, and Tortie already draws it in the sidebar. The part
git cannot answer is which of three agents did it, and the exact answers to that are one commit per
session or one worktree per session, both available today.

The proposed mechanism does not hold. It leans on the SpecStory capture to list files a session
edited. That capture records what the agent said in its turn. It does not record what the agent's
shell commands did, so a formatter, a codemod, an install or a subagent changes files that never
appear in the transcript. That makes the attribution a lower bound with an unknown error rate,
offered in the one surface whose job is to decide what a human reviews.

The evidence is also weaker than it looks. Two of the three sources are about review in general
rather than about attribution, and the third is a 45 upvote comment about keeping a MISTAKES.md
file, which was connected to this candidate by inference.

### Candidate 5. Hand one session's record to another session

The corpus convicts this itself. The best witness is the r/AI_Agents poster with 15 comments, who
wrote: "Been bouncing between cursor, claude code and codex depending on what im doing. every time
I switch the new agent has zero clue what the last one decided." He then reports that he tried the
manual version, that it "lasted about a week", and that the files "got stale so the agents acted on
dead info". The failure was not the keystrokes. It was that a human triggered copy goes stale as
soon as the source keeps moving. A menu item that copies a transcript fails on the same schedule.

The market says the same thing. Five shared memory products launched on Hacker News inside this
window, being Vibsync at 3 points, Bourdon at 3, Tandem at 4, MemU at 4 and Wienerdog at 9. Five
teams shipped it in 30 days and drew 23 points between them.

The version that would work is a summary rather than a copy, because a full transcript is much
larger than the receiving agent's useful context. A summary needs a model. A model in Tortie is
either third party code in a Tortie process, which refusal 1 forbids, or a hosted call, which the
no cloud refusal forbids. The useful version is unbuildable inside the boundary and the buildable
version is the one the corpus reports failing.

**What survives.** A context menu item in Past Sessions that copies the transcript path. That is a
chore, not a candidate.

### Candidate 7. Named session sets you can apply to a project

Three sources, and not one of them names a pain. moltamp lists "discoverable keybinds, sane
defaults, reusable layouts" in a marketing sentence. A bot post describes what tmux can script.
codeagentswarm lists its own screenshot. Nobody says creating sessions by hand slowed them down.

Layout files exist because tmux sessions die. tmuxinator, teamocil, tmuxp and zellij layouts are
all answers to "I lost my setup, how do I get it back without typing". Tortie removed that problem
with the private server and restore. Building the template now imports a workaround along with the
thing it worked around. A template is also applied once per project, so a user with 6 projects
touches it 6 times ever.

### Candidate 9. Images an agent prints should draw in the terminal

Three unrelated repositories hit this in 15 days, being senpi PR 389 on graphics disabled inside
tmux, SuperLightTUI issue 329 on multiplexers modelled as one boolean, and hermes-agent PR 66538 on
synchronized output wrongly trusted under Zellij. Every one of them is a TUI author fixing their own
rendering. No Tortie user, and nobody in the corpus, reports that an agent's image failed to draw.

There is also a probable technical mismatch. All three sources concern the Kitty graphics protocol
forwarded through tmux passthrough to Ghostty, kitty or WezTerm, which implement it natively.
Tortie's terminal is xterm.js, and `package.json` lines 56 to 59 carry `@xterm/addon-fit`,
`@xterm/addon-web-links` and `@xterm/addon-webgl` with no image addon. The available xterm.js image
addon is understood to implement SIXEL and the iTerm inline image protocol rather than the Kitty
protocol. **That last point is unverified.** No network call was made and the package is not
installed, so its documentation was not read. If it is right, adding the addon does not make any of
the corpus cases work.

Two facts that are verified. `resources/gmux-tmux.conf` line 18 already sets
`allow-passthrough on`, so the bytes already arrive. Whether they currently draw as visible rubbish
or are silently dropped was not checked, and that answer decides whether this is a defect rather
than a feature.

### Candidate 10. Let me re-record any shortcut, not only agent hotkeys

**The half built claim does not hold.** `src/shared/keymap.ts:173` declares `readonly assignable:
boolean`. 60 rows set it false and 1 sets it true, and that one is the per agent template inside
`agentKeymapEntries`. The field itself is read in exactly one place in the tree,
`src/shared/__tests__/keymap.test.ts:159`. There is a recorder in Settings, and it serves the per
agent hotkeys only.

**The cost is a second keymap system.** Many keymap rows carry a `menuAction` and are mirrored into
the native macOS menu, and a macOS menu accelerator fires before the renderer sees the key. So
rebinding those means rebuilding the native menu at runtime, revalidating against chords the system
reserves, and handling collisions with menus Tortie does not own. Every shortcut added afterwards
pays that tax.

**The evidence cancels itself.** @typecraft_dev, at 608 likes and 47 replies, wrote "I changed
default keybindings to match tmux." @hackerdocc wrote the opposite, being "1st term multiplexer
with ok keybindings (tmux sux in this regard)". @tequilafunks wants ⌘T, ⌘1 and ⌘W, which Tortie
already gives him. Satisfying the loudest voice means letting a user install prefix keys, and "no
prefix keys" is one of the Zen's named refusals. The Zen also says attention spent learning the
tool is attention taken from the work, and a rebinding screen is attention spent on the tool.

Refusal 4 says no configuration mechanism may implement, replace, decorate or intercept the tab
spine. Rebinding ⌘1 is at minimum decoration of the tab spine, and a proposal would have to answer
that line rather than walk past it.

### Candidate 11. A scratch session summoned over the layout

The multiplexers file lists this twice at the same score. Both entries are the same author and the
same repository, being cyberuni/cyber-mux issue 99 and the pull request that closes it. The miner's
own note on one of them reads "not specifically about user pain". So the true count is one builder
writing about two upstream projects, and the corpus flags it as not a pain.

It contradicts the Zen's own section heading, "Give every thread a place". tmux 3.7's floating pane
command buys Tortie nothing, because Tortie's layout is drawn by the renderer rather than by tmux.
The unanswered question is what happens to a floating session across a restart, and any answer to
that is a restore path change, which is Tier 3. That is the most expensive verification in the
project spent on the weakest evidence in the set.

---

## 7. Nine wants that die on a refusal

These were not prosecuted, because a refusal ends the argument before cost or evidence matter.

| Want | Evidence weight | Which refusal |
| --- | --- | --- |
| Reach my sessions from a phone | Moderate. 3 items in 10 days, including Remux at 11 likes and 4 replies | No cloud component. Research 28 and 33 already settled this, being do not build remote session infrastructure |
| An interface letting agents read and type into terminals | Weak. One voice, 4 likes, no replies | Refusals 4 and 5. It is a contribution point, and it hands an agent the ability to move Tortie's state |
| Extensions, and a place to get them | Strong in the editors file, 3 items | Refusals 2 and 3. Settled by research 31 and not to be re-litigated |
| Show me what the session costs and what fills the context | Moderate. 5,626 views, 164 likes | Not a dashboard. A number that rises on its own is noise in a nicer font |
| Vim motions everywhere I edit | Strong. 4 items, about 1.6 million combined views | The scope cap. Parity work closed after Phase 14, and this is editor furniture |
| Sandboxed or containerized agent environments | Moderate. 20,702 views and 1,224 likes, and promotional | It needs a third party runtime inside the boundary, and it makes Tortie a supervisor's console |
| Share a live session with another person | Weak. One clause in one post with 1 like | No cloud component |
| Voice input and spoken summaries | Weak. Ski at 15 points, Heard at 168 views | Every shipped form needs either third party code in process or a hosted service |
| Sessions that warn each other about breaking changes | Moderate. 6,986 views | Tortie would write into a session it does not own, and it would set state from outside session behavior |

---

## 8. The four survivors, ranked

Each axis is scored 1 to 5. COST is inverted, so 5 is cheap and 1 is a subsystem.

| Rank | Candidate | DEMAND | FIT | LEVERAGE | COST | Total |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Reach me outside the window | 3 | 3, EXTENDS | 5 | 3 | 14 |
| 2 | An unread mark for a session that moved while you were away | 2 | 4, EXTENDS narrowly | 4 | 4 | 14 |
| 3 | `tortie .` from the shell | 1 | 5 | 3 | 4 | 13 |
| 4 | A refused provider should say so | 2 | 5 | 3 | 2 | 12 |

Two ties were broken. Candidates 1 and 2 both total 14, and 1 ranks first because 2 depends on it.
Candidates 3 and 4 were close, and 3 ranks higher because its cost is known and 4's is not.

The score does not carry the scheduling fact. Candidate 3 is the only one that can ship on its own.
The other three are one phase.

---

## 9. The survivors written up

### 9.1 Reach me when I am not looking at Tortie

**What it is.** Tortie sends one macOS notification when a session crosses into a state that
already rises above the surface inside the app, being it needs input, it failed, or it finished.
The notification reports the state and never sets it. Clicking it focuses that session.

**Zen verdict.** EXTENDS. The principle is stated in section 10.

**Best single piece of evidence.** @mattblr, TikTok, 2026-07-20, 50 likes, 2,834 views, 9 comments:
"The biggest thing is that you get a ping and a visual notification when an agent needs your input,
when it's blocked, or when it's done." He is the only outside human in this cluster. The other five
sources are four sellers and one Tortie research document. Demand is scored 3 rather than 2 because
four separate teams shipped this feature in 30 days, which is market evidence even though it is not
a user reporting pain.

**Why it fits the product.** The Zen says the product succeeds when the developer can look away
without anxiety. Tortie's answer stops at the window edge, so the promise is silent at the moment
it is needed most.

**What is true in the code today.** Electron's `Notification` class is never imported anywhere in
`src/`. There is no dock badge call. The channel exists in the type surface at
`src/shared/ipc/app.ts:43` as `'app:setBadgeCount'`, with the comment "Mirror the global
NEEDS_INPUT count onto the Dock badge", and nothing calls it. Phase 29 then refused it in plain
words in the backlog: "No badge and no count anywhere. Nothing notifies." A previous round designed
this and stopped. The plumbing is typed for the wrong answer, so the spec has to refuse it again in
writing.

**The form that must be refused.** One notification per transition. No badge. No count. No inbox.
No history. No sound unless the user turns it on. A per session mute. The "durable attention
inbox" shape from konsole-pal is the part to refuse, because a queue that accumulates is a
dashboard with a scrollbar.

**A correction to an argument made against it.** It was claimed that Tortie already consumes Claude
Code's `Notification` hook, so a user can get a ping today. The code says the opposite, and gives a
measured reason. `src/main/activity/hooks.ts:54` reads: "`Notification` is deliberately absent: it
is debounced ~6 s after a permission request and its idle variant fires a full 60 s after `Stop`,
so it is a nudge, never a state." So a user who wires that hook by hand gets a signal 6 seconds
late, and Tortie's own oracles are faster. Nobody should build this feature on that hook.

**Tier 3.** It claims to work across agents, and CLAUDE.md sends universality claims to Tier 3
without argument. The reason is recorded in the backlog under Phase 13, where the qwen, gemini, pi
and droid rows of the activity matrix are floor verified by stand-in rather than live. Four of
twelve agents would fire notifications off a floor nobody has watched against the real binary.

**The one thing that would make me drop it.** A measured false ping rate above zero on the agents
with exact oracles. A wrong silence costs the user some waiting. A wrong ping costs the user their
attention, which is the one thing the Zen says cannot be multiplied. If the live matrix cannot
reach zero false pings for claude, codex and shell, ship nothing rather than ship it for a subset.

### 9.2 An unread mark for a session that moved while you were away

**What it is.** When a session crosses into needs input, failed or finished while the Tortie window
is not focused, Tortie remembers that the human has not seen it and draws a small mark on that
session until they do.

**Zen verdict.** EXTENDS, narrowly. The principle is in section 10.

**Best single piece of evidence.** codeagentswarm, 2026-08-11: "You lose track of which terminal is
doing what, you miss when an agent finishes, and switching between sessions is a constant context
switch." This is a seller describing its own feature list, which is why demand is 2. The strongest
support is not from the corpus. It is research 46, which calls this the best finding in the herdr
study.

**Why the shape matters more than the feature.** The first version of this proposal made it a
seventh member of `SESSION_STATUSES`. That breaks a rule in CLAUDE.md while leaving the sentence in
the file, because the mark is set by two things at once, being the session stopped and the human
was not looking. The second half is window focus, which is not session behavior.
`src/shared/types.ts:71` holds exactly seven statuses today, being running, idle, needs_input,
exited, restorable, unknown and discarded. The codebase already contains the correct pattern for
this class of fact, because a degraded restore is deliberately kept out of `SESSION_STATUSES` and
carried on `Session.restore` instead, on the stated reasoning that it is provenance and not
liveness. The unread mark is the same shape and belongs beside the status, never inside it.

**What it would take.** One boolean held beside the session and not persisted in the manifest. A
trigger, which for claude already exists, because `src/main/activity/hooks.ts` maps `Stop` to idle
as a measured "the agent finished its turn" event. Clearing rules, which are the fiddly part,
because focusing the window is not the same as looking at that session. One small mark in the
session row and in the ⌘J list.

**Tier 2, inside the phase above.** It touches no status type, no manifest and no restore path.
It reads the same transition stream as 9.1, so it inherits that phase's per agent matrix and should
be verified there rather than on its own.

**The one thing that would make me drop it.** If it cannot be built without adding a member to
`SESSION_STATUSES`. It also dies with 9.1, because on its own it is a mark for an event the human
was never told about.

### 9.3 `tortie .` from the shell

**What it is.** An optional shell command that opens a folder as a project tab in the running
Tortie window. It opens a folder and does nothing else.

**Zen verdict.** FITS. No new principle. The Zen already says editors, terminals, tabs and
shortcuts live where practiced hands go looking for them.

**Best single piece of evidence, and it is struck.** @RhysSullivan, X, 2026-07-26, 599 likes, 9
reposts, 64 replies: "running `cursor {filename}` now opens the agent view by default making it not
actually possible to view the file, so then you have to click on the IDE toggle, then rerun the
command has added enough friction to my workflow that i might just go back to vscode". That is 599
people agreeing that a vendor changed a default. It is not a request for a Tortie command. Both
sources for this candidate sit in the editors file, which is the keyword trap described in section
1, and both are scored 0 by the miner's own scoring. **This is an operator hunch, not a corpus
finding, and it should be labelled that way in any proposal.**

**What it would take.** An install action in Settings that writes a shim to the user's PATH, done
on purpose and once. Argv handling in the existing handler at `src/main/index.ts:160`, which today
reads nothing and only calls `showAppWindow()`.

**The line that must be written before any code.** If `tortie .` opens a folder it is harmless. The
moment anyone adds a flag such as `tortie --agent claude .`, any process on the machine can start
an agent in any directory, which is the exact shape refusal 8 exists to prevent. The cap belongs in
the proposal, not in a later review.

**Cheap to check first.** There is no `setAsDefaultProtocolClient`, no `open-file` handler and no
`open-url` handler anywhere under `src/main`, verified by grep. So `open -a Tortie <folder>` costs
zero code today, and whether it already does anything useful is unverified. Somebody should try it
before this gets a phase number, because it may already be half true.

**Tier 2.** Gates, one probe that a second launch with a path argument opens the right project tab,
and one probe of the PATH install and its removal.

**The one thing that would make me drop it.** A first proposal that cannot hold the cap. If it
arrives asking for a flag that selects an agent or starts a session, it has become a remote control
for a process the user did not confirm, and it should be refused rather than trimmed.

### 9.4 A session stopped by a refused provider should say so

**What it is.** When an agent stops because its provider refused the request, the session says it
was blocked instead of going quiet and reading as idle. It is one more trigger inside 9.1 rather
than a feature of its own.

**Zen verdict.** FITS. A failure is exactly what the Zen says should rise above the surface.

**Best single piece of evidence.** sessionwatcher.com, 2026-08-07: "Claude Code limits feel
stricter during heavy sessions because you get locked out completely." This is a seller. The 243
upvote comment about halved limits is the loudest item in the whole corpus and it does not count
here, because those people want more quota rather than a shell that tells them they ran out.

**Why cost is scored 2.** Nobody has measured how any agent CLI signals a refusal. The likely
answer is a line of prose on screen that changes with each release. Detecting that means a per
agent pattern run against captured screen text, re-verified after every agent upgrade. That is the
class of fragile claim `conformance:resume` and `conformance:agents` exist to keep out, and no
conformance suite covers this one.

**Order of work.** Research first, being read the refusal output of claude, codex and one floor
oracle agent. Build only if the signal is stable, at Tier 3, with a conformance suite in the same
commit.

**The one thing that would make me drop it.** If the refusal signal for claude and codex is prose
that varies between releases. A pattern that will be wrong in six weeks is worse than silence,
because it would put a session into a blocked reading that is false.

### 9.5 The fifth slot is empty, on purpose

The operator asked for a top 5. Four candidates survived, and no convicted item deserves promotion
on this corpus. If a fifth item is wanted, the honest answer is the smallest remainder of a
convicted one, and there are two.

| Remainder | What survives | Why it is not ranked |
| --- | --- | --- |
| Candidate 5 | A "Copy transcript path" item in the Past Sessions row menu | It is a chore, not a candidate. Five teams shipped the full version this month and drew 23 Hacker News points between them |
| Candidate 3 | Tortie noticing that two live sessions in one project both have the repository dirty | No source asks for it. It is a data loss shape, so it would be Tier 3, on zero evidence |

---

## 10. What would extend the Zen, and the principle each one asks for

Two of the four survivors would change what Tortie is allowed to do. Neither should be built until
the operator accepts the sentence next to it. The other two need no new principle.

| Candidate | Zen verdict | The principle, in one sentence |
| --- | --- | --- |
| Reach me outside the window | EXTENDS | Tortie may speak outside its own window, and only for the signals that already rise above the surface inside it |
| An unread mark for a session that moved while you were away | EXTENDS | Tortie records whether the human has seen an event, which makes the human's own attention an input to what Tortie draws |
| `tortie .` from the shell | FITS | None needed |
| A refused provider should say so | FITS | None needed |

Both extensions point the same way, which is that Tortie starts to model the human's attention and
not only the sessions' state. That is a real change and it is the thing to accept or refuse, rather
than the notification itself.

Three limits hold in both cases, and they are what keep the extension from becoming a dashboard.

- A notification reports a status. It never sets one. The status rule does not move.
- No number that rises on its own appears anywhere, in the dock, in the window or in a list.
- The mark is per session and it clears when the human looks. Nothing accumulates.

---

## 11. What is not true

- **The editors query partly failed.** All 7 of its Reddit items were off topic, Hacker News
  returned 0, and 20 of its 76 items carry the engine's `date:low` marker. Every strength rating
  taken from that file is strong relative to that file only. Candidate 8 rests on it entirely and
  its evidence is struck. Part of candidate 3 rests on it.
- **One TikTok account carries three of the four survivors.** @mattblr, at 50 likes and 2,834
  views, is the only outside human in 9.1, one of three sources in 9.2, and one of three in 9.4. No
  second independent user voice was found for any of them. He may be right. He is one person.
- **A large share of the usable evidence is sellers.** codeagentswarm, nimbalyst, sessionwatcher,
  vibeisland, konsole-pal and Heard all sell against the pain they describe. Each is named as such
  where it is used.
- **Several of the loudest items are titles with no captured discussion.** The 98 point
  Agent-Manager launch with 80 comments and the 104 comment parallel sessions thread both arrived
  without their bodies. The topics drew heavy traffic and what was argued is unknown.
- **Candidate 4's detection cost is a guess.** No agent CLI's refusal output was read. The COST
  score of 2 is not a measurement.
- **Candidate 9's technical objection is unverified.** Whether the xterm.js image addon implements
  the Kitty graphics protocol was not checked, because no network call was made and the package is
  not installed. Whether bytes arriving through `allow-passthrough on` currently draw as rubbish or
  are silently dropped was also not checked.
- **Candidate 8 was not tested.** Whether `open -a Tortie <folder>` already opens a project was not
  tried, because no app was run.
- **9.1's cost score assumes the transition stream is usable as it stands.** `src/main/activity/`
  was read by its exports, its hooks header and its event map, not line by line.
- **No number is attached to what any survivor costs at startup or at rest.** The corpus contains 4
  separate complaints that editors are slow and eat memory. Tortie is Electron plus Monaco plus
  xterm.js. Nothing here should ship without that number measured.
- **The standing argument against building anything.** Three people in one month said the category
  is unnecessary. The top comment on a 16,452 view video is "Just use Tmux". @cyb3rnaut_, on
  2026-08-09, wrote "I've tried all sorts of multiplexer solutions, zellij, wezterm, ghostty, and
  nothing worked as well as just tmux for my workflow." A third said a tiling window manager makes
  the whole category irrelevant. Tortie's answer is that it never asks them to learn a multiplexer,
  and every candidate above should be judged against whether it keeps that answer true.
