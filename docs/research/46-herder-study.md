# Research 46. The herdr study

**Research phase R46. Study document. Written 2026-08-15.**

Provenance. The task named /Users/gdc/herder. That path does not exist. The repo under study
is /Users/gdc/herdr, spelled without the second e. This file keeps the task's spelling in its
name. The repo is a clean clone of https://github.com/herdrdev/herdr at commit 9e6c2b4e,
dated 2026-08-14, with no local changes. The study was read only in every respect. Nothing
from herdr was executed. Every claim below comes from reading its source, its docs, and its
git history. Three investigators read the repo and a judge sorted their candidates. This
document is the merge of those four inputs.

## The verdict

Herdr's durability core is behind Tortie's, so the core comparison ends with no adoption.
Tortie should take nothing from herdr's storage layer. Herdr is ahead of Tortie in two
durability places:

- resume id acquisition, where the agent itself pushes its session id through a hook herdr
  installs into the agent's own configuration, and
- versioned per agent integration contracts with a user visible status surface.

Both land on gaps Tortie's research 33 already names. The best UX find is one bit, a state
that means finished while the human was elsewhere, and it supplies the trigger list that
research 44 needs. The spike sullied nothing. Zero code was copied, so no NOTICE entry is
required. Three follow ups are recommended at the end. The queue changes only on the
operator's word.

## 1. What herdr is, and the license answer

Herdr is a terminal workspace manager built for running many AI coding agents at once. Its
README calls it "the runtime your coding agents live on". It is one Rust binary, version
0.8.0, and it does not use tmux. Herdr is the multiplexer. The binary plays three roles.

- The server is a headless background process. It owns every pane's PTY, the pseudo terminal
  a process runs inside, through a vendored copy of portable-pty. It emulates the terminals
  with libghostty-vt, the vendored terminal core from Ghostty. It detects agent state. It
  renders every pane to a buffer in memory and streams the finished frames to attached
  clients over a binary socket.
- The client is a TUI in whatever terminal the user already has. It forwards input and draws
  the streamed frames. Detaching loses nothing because the server keeps running.
- The CLI and a JSON socket API let scripts and agents drive the workspace. The API has a
  published JSON schema. Agents inside panes get `HERDR_ENV=1` and a bundled skill file that
  teaches them to spawn panes, prompt other agents, and wait on state changes.

```
herdr, one process owns everything       Tortie, two processes split the risk

+------------------------------+         +----------------+    +----------------------+
| herdr server                 |         | Tortie app     |    | private tmux server  |
|   owns every agent PTY       |         | (disposable    |<-->| (socket -L gmux)     |
|   emulates the terminals     |         |  client)       |    |   owns every agent   |
|   detects agent state        |         +----------------+    +----------------------+
|   streams frames to clients  |         an app crash kills nothing;
+------------------------------+         the tmux server keeps running
a server crash kills every agent
```

Persistence is JSON under ~/.config/herdr, in three files:

- session.json, a snapshot of workspaces, tabs, the layout tree, and per pane metadata
- session-history.json, an opt in replay of raw screen output, off by default
- plugins.json, the plugin registry

Agent status uses five states, being blocked, working, done, idle, and unknown. Status comes
from two arbitrated sources. The first is regex matching on the tail of the screen, driven by
per agent TOML manifests, with more than 20 manifests shipped. The second is hooks herdr
installs into each agent's own configuration, which also report the agent's native session id
for resume. Restore after a server stop has four tiers:

- a layout snapshot, where processes do not survive and panes come back as fresh shells in
  their saved directory
- the opt in replay of saved screen history
- native agent conversation resume from hook reported session ids, on by default, with 17
  agents in the resume table
- an experimental live handoff that passes running PTYs to a replacement server during self
  update, unix only

Maturity, in numbers.

| Measure | Value |
|---|---|
| Lines of Rust under src | about 225,816 |
| Commits | 1409, from 2026-03-23 to 2026-08-14 |
| Releases in the changelog | 12, from 0.6.7 to 0.8.0 |
| Test functions | 3352 in src, plus 194 integration tests |
| GitHub workflows | 8 |
| Detection manifests | more than 20 agents |
| Native resume table | 17 agents |

The audience is the same as Tortie's audience, a person herding several coding agents in
parallel. It is a direct competitor in concept, built as a tmux replacement rather than a
tmux client. It is a third party project. The main author is Ogulcan Celik with 1081 of 1409
commits, and the operator has zero commits in its history.

### The license answer

Herdr's own source is Apache 2.0. The LICENSE file is the unmodified template with the
appendix placeholder unfilled. There is no NOTICE file, and a grep found zero copyright
headers under src. The vendor directory is not Apache 2.0.

| Component | License | Copyright holder |
|---|---|---|
| herdr source (src, docs, skills) | Apache 2.0 | no notices present in source |
| vendor libghostty-vt | MIT | Mitchell Hashimoto and Ghostty contributors |
| vendor portable-pty | MIT | Wez Furlong |

If a later phase ever vendors herdr source code, the obligations are these:

- ship the Apache 2.0 license text with the code
- retain existing copyright and attribution notices, which are effectively absent here
- mark modified files as changed
- record provenance under Tortie's own NOTICE discipline (repo, commit 9e6c2b4e, file list,
  license, modifications)
- take MIT attribution instead for anything copied from herdr's vendor directory

The Apache 2.0 text must travel with any Apache licensed code. It cannot be folded into an
MIT only notice. None of this constrains ideas. State names, restore tiers, and interaction
designs are not copyrightable, so reimplementing them from this study carries no license
obligation at all.

## 2. Durability compared, row by row

The short answer first. Herdr's storage discipline is thinner than Tortie's on every axis. It
keeps one JSON snapshot, saved on a 5 second debounce, written without fsync, the call that
forces data onto the disk. It keeps no backup generations, no integrity check, and no journal.
A snapshot that fails to parse is ignored with a log warning and the session starts empty.
Its process shape is also weaker against crashes, because the server owns the agent PTYs
directly, so a server crash kills every agent. Tortie's split loses nothing when the app dies.

| # | Concern | Herdr | Tortie | Verdict |
|---|---|---|---|---|
| 1 | Agent survival when the UI process dies | A server crash kills every agent, because the panes are its children | The tmux server owns the processes; an app crash loses nothing | Tortie already stronger |
| 2 | Restore source of truth and write discipline | One debounced JSON snapshot, no fsync, no backup generations, silent fresh start on parse failure | SQLite manifest with a write ahead log, intent written before spawn, quarantine and rebuild, a verified backup ring, downgrade refusal | Tortie already stronger |
| 3 | Scrollback persistence | Opt in raw ANSI in JSON, off by default because output can hold secrets | Verified snapshot capsules with an immutable backup ring | Tortie already stronger |
| 4 | Resume id acquisition | The agent pushes its own session id from a herdr owned hook the moment the conversation starts, with a sequence number and a source allowlist | File harvest with provenance; research 33 admits weak and grace timer matches arm as if validated | Herdr stronger, study it |
| 5 | Versioned per agent recovery contracts | A version stamp inside every installed hook asset, a minimum version table per capability, and a status command | Item A8 in research 33 is open and unowned | Herdr stronger, study it |
| 6 | Always on observer after the window closes | The product is the always running server, which proves the demand | Not built; research 26 section 6.1 and roadmap G3 name the gap | Herdr stronger as an existence proof; keep Tortie's split |
| 7 | Live update without stopping work | PTY file descriptors passed to a replacement server over SCM_RIGHTS, a unix feature that moves open file descriptors between processes | Unnecessary; the app is a disposable tmux client and updates without touching sessions | Different goals, no adoption |
| 8 | Unclean exit detection | None; a crash and a clean stop look identical at next boot | The durable attempt journal detects interruption | Tortie already stronger |
| 9 | Off machine copies | None; remote mode runs the server on the remote host and state stays per machine | A named open gap (B9, B10), but the local backup ring exists | Tortie already stronger |
| 10 | Event log versus snapshots | Whole state snapshot on a debounce, no journal | Attempt journal plus persisted restore stages | Tortie already stronger |
| 11 | Honest restoration language | A candid per scenario survival matrix in the docs | The resume presentation already distinguishes recovery tiers | Roughly equal; borrow the matrix as prose |

Row 4 deserves one paragraph, because it is the single most useful mechanism in the repo.
`herdr integration install <agent>` writes a herdr owned script into the agent's native hook
surface. For Claude Code the asset is stamped `HERDR_INTEGRATION_VERSION=8`. On the session
start hook the script reads the hook JSON, takes the session id and the transcript path, and
reports them over a unix socket with the pane id from an environment variable and a
nanosecond sequence number. The server accepts only fresher sequence numbers per source, caps
value sizes, and checks the reporting triple against a hardcoded allowlist. Resume commands
are built from that table only. So the agent itself pushes the resume id at the moment the
conversation exists, and no file format is scraped. Tortie's file harvest is the weaker shape
here, by Tortie's own written account in research 33.

One stance difference is deliberate and stays. Herdr fires resume automatically for every
eligible restored pane after the first client attach, without waiting for focus. Tortie arms
the resume command without pressing Enter and leaves the firing to the human. That is the Zen
speaking, not a herdr advantage, and it is refused in the adoption table below.

## 3. The UX candidates, in three buckets

Each candidate sits in exactly one bucket:

- FITS means inside the Zen as written.
- EXTENDS means it needs a new principle the operator must first agree to.
- VIOLATES means it crosses the Zen or a Phase 23 refusal.

| # | Interaction | Bucket | Reason in one sentence |
|---|---|---|---|
| 1 | Unseen completion state ("done" means finished while the human was elsewhere; focusing marks it seen; CLI reads do not) | EXTENDS | Finished work stays quietly marked until the human acknowledges it by going there. |
| 2 | Attention priority ordering of the session list (blocked first, then unseen done, then working, then idle) | FITS | Ordering by who needs a human answers "what needs me now" at a glance, and an order is not a counter. |
| 3 | Session navigator overlay with fuzzy search and single key state filters | FITS | A place you go that answers one question and adds no new concepts. |
| 4 | Open full scrollback in the editor | FITS | Reading what the agent did becomes a visit to an editor the user already knows. |
| 5 | Status explain verb (which rule matched, the evidence, a named fallback reason) | FITS | A wrong status becomes inspectable evidence instead of assurance. |
| 6 | Toast state stability delay | FITS | A state that flaps never reaches the human. |
| 7 | Jump to notification key | FITS | One key moves the human to the thing that spoke. |
| 8 | Cross project session cycling and last session across projects | FITS | Moving between threads is navigation, not a new concept. |
| 9 | Worktrees as grouped workspaces | FITS | Each parallel agent gets its own checkout while the whole body of work stays one group. |
| 10 | Move a session between projects and tabs without killing it | FITS | Reorganizing threads stays inside existing concepts. |
| 11 | Searchable keybinding help | FITS | A filter on an existing reference surface adds nothing conceptual. |
| 12 | Sound on rise (distinct completion and question sounds, background projects only, per agent mute) | EXTENDS | Tortie may speak aloud once when a question or completion rises, if the operator turned sound on. |
| 13 | Agent orchestration primitives plus a shipped skill file (prompt with wait, wait until blocked, and a verb that lets an external process set status) | EXTENDS | Sessions become instruments other agents may play, but the status setting half crosses the frozen status rule and the control half is the privilege increase refusal 8 names. |
| 14 | Remote attach and phone supervision | EXTENDS | The place you go can be reached from any terminal, and for Tortie that is architecture (research 28), not a widget. |
| 15 | Tab bar status area displaying the output of a polled command | VIOLATES | A strip of self updating values is a dashboard, and a configured command that runs on a timer executes rather than selects. |
| 16 | Caller installed sidebar projections (a socket method installs a filter and sort over the session list) | VIOLATES | Running code may not reshape the human's attention surface (refusal 4). |
| 17 | Sidebar row templates with script fed tokens and inline color | VIOLATES | Externally fed colored row text invites every agent to shout its own summary line. |
| 18 | Prefix mode, navigate mode, copy mode | VIOLATES | The Zen refuses prefix keys, attach rituals, and vocabulary from the layer underneath by name. |
| 19 | Plugin system and marketplace | VIOLATES | Refusals 2 and 3 are written against exactly this. |
| 20 | Custom keybindings that run an arbitrary shell string | VIOLATES | Configuration that executes a string on a keypress is the opposite of "configuration selects, never executes". |

Overlap with banked Tortie work, for the record.

| Banked work | Herdr's counterpart | What herdr adds |
|---|---|---|
| Catch Me Up (research 44) | No digest at all; its answer to "what happened while I was away" is the done state plus reading scrollback | The acknowledgement bit and its discipline; two products independently landed on the moment of return as the surface |
| Runs in SCM (research 45) | No CI surface | Nothing |
| Past Sessions | A native resume registry for 17 agents, no browsing UI | Nothing for the UX; the resume table belongs to the durability comparison |
| Remote sessions (research 28) | A thin remote client and a phone sized TUI layout | Evidence that phone supervision is read and jump, not typing |

## 4. The adoption table

Every candidate from both investigators, one verdict each. ADOPT means fits the Zen and can
be built when asked. ADAPT means the operator must first approve a new principle. REFUSE
means it crosses the Zen or a permanent refusal. ALREADY HAVE means Tortie's existing shape
is stronger. BANKED means existing research already owns it.

| # | Candidate | Verdict | Reason and shape |
|---|---|---|---|
| D1 | Push reported resume ids via an agent hook | ADAPT | The new principle reads as follows. Tortie may author a hook asset and install it into an agent's own hook surface, through Settings then Agents only, bound to the confirm hash, because installing a hook changes what runs in the agent. The hook runs in the agent's process tree, never in a Tortie process, so refusal 1 holds. The report becomes one more provenance source in the manifest, ranked above file harvest, with source and sequence persisted. The manifest stays the sole restore truth. |
| D2 | Versioned per agent resume contracts with a status surface | ADOPT | Closes research 33 item A8. Stamp each recipe in agents/registry.ts with a contract version. Persist the version used into the manifest row at harvest. Compare at restore and surface "recipe changed since capture" instead of arming silently. The gate stays conformance:resume:capture. |
| D3 | Restore single flight per conversation id | ADOPT | Single flight means only the first claim on a conversation id arms anything. During restore all, the second session with the same conversation ref arms nothing and says why. First test whether the manifest already makes duplicates impossible, which is unverified. |
| D4 | Live PTY handoff during self update | ALREADY HAVE | The tmux split makes it unnecessary. The app is a disposable client and updates without touching sessions. |
| D5 | Herdr's storage layer | ALREADY HAVE | Tortie is stronger on every storage row of the table in section 2. Nothing to take. |
| D6 | Auto firing resume without the human pressing Enter | REFUSE | Crosses "Bring the human only what needs a human". Tortie arms the command and leaves the firing to the human, and that stance is restated in src/main/restore/restore.ts. |
| D7 | Per scenario survival matrix in the docs | ADOPT | A prose table stating what survives a detach, an app crash, and a reboot. Fits "boring, inspectable". Tier 1 cost. |
| D8 | Always on observer after the window closes | BANKED | Research 26 section 6.1 and roadmap G3. Herdr proves the demand but fuses observer and PTY owner into one crashable process. Study the product shape, keep the split. |
| U1 | Unseen completion state | ADAPT | The new principle reads as follows. Finished work stays quietly marked until the human acknowledges it by going there. It derives from session behavior plus the human's own visit, so the frozen needs_input rule is untouched. One derived bit in renderer state, nothing in tmux or the manifest. It supplies the research 44 trigger list. |
| U2 | Attention priority ordering of the session list | ADOPT | Fits "What needs me now?". An order is not a counter. Depends on U1 for the rank of finished but unseen work. |
| U3 | State filtered session navigator | ADOPT | Generalize the current Cmd+J overlay from needs_input only to all states, with fuzzy search and single key filters. Needs input stays the default view. |
| U4 | Open full scrollback in the editor | ADOPT | tmux capture-pane of full history to a temp file, opened read only in the existing Monaco panel. Fits "assemble, never reimplement". Also the manual floor under research 44 phase A. |
| U5 | Status explain verb | ADOPT | Prints the matched oracle rule and its visible evidence, plus a named fallback reason when nothing matched. A user runnable cousin of conformance:context. Wrong dot reports arrive with evidence. |
| U6 | Toast state stability delay | ADOPT | Notify only if the state still holds when the delay expires, and suppress popups for the active session. Fits "vigilant, not noisy". |
| U7 | Jump to notification key | ADOPT | One key focuses the toast's target and closes the loop the toast opened. |
| U8 | Cross project session cycling | ADOPT | Tortie has Next and Previous within a project already. Extend across projects and add last session. |
| U9 | Worktrees as grouped work | ADOPT | Create a git worktree as a child of the project group. Removal is safe first and asks again before forcing. Branches are never deleted. Many agents on one repo stop colliding in one checkout. Medium cost, unmeasured. |
| U10 | Move a session between projects and tabs | ADOPT | Housekeeping inside existing concepts. The move must carry the manifest row and keep the @gmux-id addressing, never the name. |
| U11 | Searchable keybinding help | ADOPT | Minor. A filter on an existing reference surface. Tier 1. |
| U12 | Sound on rise | ADAPT | The new principle reads as follows. Tortie may speak aloud once when a question or a completion rises, only if the operator turned sound on. Silence stays the default. |
| U13 | Agent orchestration surface | REFUSE | The status reporting half crosses the frozen status rule, since an external process may never set a session's status (UI rules, refusal 5). The control half is an agent writable surface, which is the privilege increase refusal 8 names. The wait until blocked primitive is clever, and it stays refused until someone writes a Phase 23 grade argument nobody has asked for. |
| U14 | Remote attach and phone supervision | BANKED | Research 28. Herdr adds one piece of evidence, that phone supervision is read and jump, not typing. |
| U15 | Tab bar status area with a polled command | REFUSE | Crosses "Not a dashboard", and a configured command on a timer crosses "configuration selects, never executes" (refusal 8). |
| U16 | Caller installed projections over the session list | REFUSE | Crosses refusal 4. Running code may not reshape the human's attention surface. |
| U17 | Sidebar row templates with script fed tokens | REFUSE | Crosses "Not a dashboard" and invites every agent to shout its own summary line. The one aligned part, display kept strictly separate from semantic state, Tortie already holds as refusal 5. |
| U18 | Prefix, navigate, and copy modes | REFUSE | Crosses "Not a tool that teaches its own internals". The Zen names prefix keys and attach rituals directly. |
| U19 | Plugin system and marketplace | REFUSE | Crosses refusals 2 and 3 as written. Herdr's one compatible choice, plugins as out of process commands only, is already Tortie's boundary. |
| U20 | Keybindings that execute an arbitrary shell string | REFUSE | Crosses "configuration selects, never executes". Only the existing human confirmed executable gate could ever admit a cousin, and no one has asked. |

No candidate is left unsorted.

## 5. The sullying line

The spike itself sullied nothing. All three investigators copied zero code, so no NOTICE
entry is required now. Ideas, state names, and restore tiers are not copyrightable, and
reimplementing every adopted row above from Tortie's own substrate carries no license
obligation.

If a later phase ever vendors herdr code, the license permits it under these conditions:

- Herdr's own source is Apache 2.0. Vendoring requires shipping the Apache 2.0 license text,
  retaining any existing notices (there are effectively none, since herdr has no NOTICE file
  and no copyright headers), and marking modified files as changed.
- Herdr's vendor directory is not Apache 2.0. libghostty-vt is MIT (Mitchell Hashimoto and
  Ghostty contributors) and portable-pty is MIT (Wez Furlong). Vendoring those files takes
  MIT attribution instead.
- Tortie's own discipline still applies on top of the license, being a NOTICE record of
  repo, commit (9e6c2b4e), file list, license, and modifications.
- The Apache 2.0 text must travel with any Apache licensed code. It cannot be folded into an
  MIT only notice.

Nothing in the adoption table needs herdr code. Every adopt and adapt row is a design
reimplemented on tmux, the manifest, the registry, and the existing overlay. None of the
adoptions touch the permanent refusals. No third party code enters a Tortie process,
configuration still only selects, and the one install surface (D1) is gated behind the
existing human confirmation.

## 6. The recommendation

Three items, in priority order. Everything else in the adoption table closes with knowledge
and waits for the operator to ask. This document changes no queue.

1. Fold the unseen completion state (U1), attention ordering (U2), and the generalized
   navigator (U3) into research 44 as its trigger layer. Two products independently landed
   on the moment of return as the surface, which is a signal the banked idea is right. This
   is a research edit now and a Tier 2 phase when built, small cost, renderer state only. It
   needs the operator's explicit yes on the new principle in U1, since it is a new status
   concept.
2. Queue a durability phase for resume contract discipline, being D2 (versioned recipes,
   closes research 33 item A8) plus D3 (restore single flight). Tier 3, because it touches
   restore. Medium cost. Hold D1 (the push report hook) as a research follow up rather than
   building it now, because its confirm hash gating deserves its own written design before
   any install surface exists.
3. Queue one small UX phase pairing U4 (scrollback in the editor) with U5 (status explain).
   Tier 2, small cost. Both are inspection surfaces with no new state, and U4 doubles as the
   manual floor under research 44.

## 7. What is not true

- No herdr behavior was observed at runtime. Nothing was executed, so no measured numbers
  exist for its save latency, its loss windows, or its crash behavior. Every claim rests on
  source, docs, and git history.
- The no fsync claim comes from the write path in src/persist/io.rs. Power loss behavior of
  rename without fsync depends on the filesystem and was not measured.
- The fsync audit covered the session and history writers only. Other herdr writers, e.g.
  the plugin registry, were not audited line by line.
- Herdr's socket authentication was not verified. It is likely that any local process of the
  same user could spoof the session id report, since the defense is the source allowlist and
  sequence freshness, not caller identity.
- Whether Tortie's restore already prevents two sessions arming the same conversation id is
  unverified. No dedupe was found in src/main/restore/restore.ts, but the manifest's
  construction may make duplicates impossible in practice. D3 starts by testing that.
- Tortie side gap claims (A8 open, harvest provenance not persisted, B9 and B10 open, G3
  open) are taken from research 26 and 33 as written, not re proven against the current
  tree.
- The herdr docs read were the docs/next tree, which may be ahead of the shipped 0.8.0
  release in details such as the supported agent table and integration version numbers.
- The exact mechanism by which the herdr client spawns its background server was not traced
  to a code path.
- The claim that the headless server shares its crash surface with rendering and plugin code
  rests on module structure. No fault injection was performed, and tests/live_handoff.rs was
  not run.
- Download and star counts come from README badges. Whether the kangal-bot and akbash
  contributors are automation or humans was not determined.
- The cost words in the adoption table (small, medium, about a day) are judgment, not
  measured numbers.
- Visual details of herdr's TUI, e.g. the exact overlay layouts and the phone sized reflow,
  are read from rendering code and doc screenshots, not observed in use.
- The claims that Tortie lacks a given interaction are verified for the shortlist items and
  the status model. The minor items rest on the keymap listing and the component inventory
  only.
