# Research 55, investigator 5. Whether the no install rule survives a remote project folder

**Decision document. Written 2026-08-18 against the tree at `7a665d7`.** It answers one question
from the Research 55 charter, being question 7, and it answers nothing else. Every claim about this
tree carries a file path and a symbol name read this session. Every number was measured this
session or is marked unmeasured in section 8.

**Safety, stated first.** No command in this round touched the operator's tmux server, his manifest,
his userData, or the installed Tortie.app. No git command that writes was run. No file was written
outside `docs/research/`. The measurements used a scratch sign in server on 127.0.0.1 built by
`build/scratch-machine.mjs`, which listens on loopback only, keeps its own host key and its own
`TMUX_TMPDIR`, and was killed by pid at the end of each run. The far side of every measurement is
this Mac. No tailnet host was contacted, because this Mac still holds no key any of them trust.

---

## 0. The answer

**The no install rule survives. Build the remote project folder on the door that already exists, and
do not build a Tortie Host.**

A remote project folder can be usable with nothing installed on the far machine, and the reason is
that a project folder is read traffic. Every read a project tab needs is already expressible as one
command that the far machine's own programs answer. Measured on loopback, one multiplexed command
costs 6.5 ms, a whole folder listing costs 10.9 ms, a `git status --porcelain=v2` costs 24.7 ms, a
read of an 83,187 byte file costs 9.1 ms, and a stat of every one of 1,453 files in the repository
costs 23.5 ms in a single call. Those are the numbers a design can be built on.

There is one rule that decides whether it feels usable, and it is not the transport. **One command
per gesture, never one command per row.** Twenty folder listings cost 158.5 ms when each is its own
ssh call and 49.0 ms when they ride one call, at zero network latency. The gap grows by the round
trip time on every extra call, so the serial shape is the one that becomes unusable on a slow link
and the batched shape is the one that does not.

Three things genuinely cannot be done with nothing installed, and each has a thin answer that is
honest rather than equal.

| # | What nothing installed cannot do | The thin answer this document rules for |
| --- | --- | --- |
| 1 | Event driven change notification. `@parcel/watcher` is a native module using the operating system's own event feed, and it must run beside the files | Poll over the exec door on a timer, and print that the view is as fresh as the last poll. A whole tree stat of 1,453 files costs 23.5 ms over the wire and 48 ms to 104 ms of far side processor time on the operator's own 28,696 file repository |
| 2 | Content search. `src/main/search/engine.ts` parses ripgrep's NDJSON, and Tortie ships a ripgrep for darwin arm64 only | Search tracked files with the far machine's own `git grep`, labelled as tracked files only, or refuse search on a remote project. Never send a binary |
| 3 | Symbols. The tree sitter grammars are six wasm files that run in a local worker | Defer. It needs file bytes, which the door can carry, and it is not what a project folder is for |

The one write a project folder needs, being a file save, does not need a Host either. It needs one
new script beside the seven in `src/main/machines/remote-scripts.ts`, shaped like the `image-put`
script that is already there, with a hash guard so a save can never overwrite a change an agent made
while the person was typing. That is a 12 line script and one rule change, not a daemon.

**The Host is still the wrong purchase, and this document's reason is different from research 51's.**
Research 51 rejected it on the residency contradiction, being that its unattended promises need a
resident daemon while its design called the daemon optional. That argument is about attention and
harvest, and it does not decide a project folder, because a project folder asks nothing of a machine
while the Mac is away. The reason a Host is wrong for THIS feature is that it would buy two
capabilities, being an event feed and a fast search, at the price of a second shipped product that
must stay version matched with a repository that cut 45 versions in the last 10 days and whose own
CHANGELOG.md is 10 versions behind the version in package.json. Section 6 prices it in full.

---

## 1. What was measured, and how

The harness was `scratchYard` and `scratchMachine` from `build/scratch-machine.mjs`, started from a
throwaway script that was never saved into the repository. It generated its own host key and user
key, started `sshd -D` on 127.0.0.1 port 47356 and 47357, and used a control socket under `/tmp` so
the client could multiplex. Every measurement is a wall clock time around `spawnSync('/usr/bin/ssh',
...)` from node, so it includes the cost of starting the local ssh client process.

The client options were the ones the product itself composes in `src/main/machines/ssh.ts`, being
`BatchMode=yes`, `ControlMaster=auto`, a `ControlPath`, and `ControlPersist`. The product's persist
window is `SSH_CONTROL_PERSIST_SECONDS`, which is 60.

One thing the first run found is worth recording, because the product already guards against it. A
control socket path under the scratchpad directory was 105 bytes and every command failed with
`unix_listener: path ... too long for Unix domain socket` and exit 255. That is exactly the failure
`CONTROL_PATH_MAX_BYTES` in `src/main/machines/ssh.ts` exists to refuse early, and it is set to 100
against a system limit of 104. The refusal is real and the guard is correct.

---

## 2. The round trip floor, measured on loopback

Zero network latency. Median of n calls, milliseconds.

| What one call does | Median | Min | Max | n |
| --- | --- | --- | --- | --- |
| A fresh connection for every command, no multiplexing | 34.7 | 33.4 | 37.5 | 10 |
| The first connection, master setup included | 35.9 | not taken | not taken | 1 |
| A multiplexed command that does nothing (`true`) | 6.5 | 5.6 | 10.3 | 20 |
| Of that, spawning the local ssh client alone (`ssh -V`) | 2.49 | not printed | not printed | 20 |
| One folder listing through a login shell with markers, 279 bytes back | 10.9 | 9.7 | 14.2 | 10 |
| The same listing locally with `readdirSync` | 0.0 | 0.0 | 0.1 | 10 |
| `find` over the whole repository, 1,453 files, 191,202 bytes back | 18.0 | 17.5 | 20.4 | 5 |
| `git status --porcelain=v2 --branch -z`, 79 bytes back | 24.7 | 23.1 | 25.2 | 5 |
| The same `git status` run locally | 13.9 | 13.7 | 14.6 | 5 |
| Read one 83,187 byte file with `cat` | 9.1 | 8.7 | 10.3 | 5 |

The batching result is the one that decides the design.

| Shape | Median | Bytes back | n |
| --- | --- | --- | --- |
| 20 folder listings, one ssh call each | 158.5 | 712 | 3 |
| The same 20 listings inside ONE ssh call | 49.0 | 12,878 | 5 |
| A depth 3 recursive listing of `src` in one call | 16.2 | 141,272 | 3 |
| A stat of every file in the repository in one call | 23.5 | 240,453 | 3 |

Read the first two rows together. Twenty calls cost 7.9 ms each even when the network costs nothing,
because each one starts a local process and opens a channel. One call that does the same twenty jobs
costs 49.0 ms and returns eighteen times more data. On a link with a round trip time of R, the
serial shape adds about twenty round trips and the batched shape adds about one.

---

## 3. What a project folder asks for, counted against this tree

The contract in `src/shared/ipc/` holds 175 channels. Sixty eight of them carry a path that today
can only be a path on this Mac.

| Domain | Channels | What it needs from the far side | Thin verdict |
| --- | --- | --- | --- |
| `fs:*` | 13 | One directory listing per expansion, one file read per open, a write per save, plus create, rename, move, duplicate and trash | Listing and read are solved and measured. Save needs one new guarded script. Trash and reveal have no far side meaning and should be refused |
| `git:*` | 28 | Status, diff, log, show | Status and both sides of a file already ride the door today, in `REVIEW_LIST` and `REVIEW_FILE` in `src/main/machines/remote-scripts.ts`. The 20 write verbs stay refused |
| `projects:*` | 9 | The project record itself | Needs a machine on `Project`, which today is three fields at `src/shared/types.ts`, being id, path and name |
| `search:*` | 3 | ripgrep | Not present remotely. See section 4.2 |
| `symbols:*` | 4 | Six tree sitter wasm grammars and file bytes | Defer |
| `quickopen:*` | 2 | A path list | Solved thin. See section 4.3 |
| `preview`, `drop`, `recents` | 9 | Local shell integration | No far side meaning. Refuse and say so |

Sixty eight channels is the size of the surface. The number of files that would have to learn about a
machine is smaller than that surface and larger than the charter's estimate. Counted this session,
excluding tests, 71 files under `src/renderer` and 56 files under `src/main` name `projectPath`,
`repoPath` or `project.path`.

The manifest side is one migration. The `projects` table is created in migration `001-initial` in
`src/main/manifest/schema.ts` with three columns and `path TEXT NOT NULL UNIQUE`. That UNIQUE is the
part a machine breaks, because the same absolute path on two machines is two projects. So carrying a
machine means migration 015 and `MANIFEST_SCHEMA_VERSION` moving from 14 to 15.

What exists on the far side today is small, and it is worth stating exactly so nobody thinks this
feature is nearly built. `REMOTE_VERB_LEDGER` in `src/main/machines/exec-plane.ts` holds 11 tmux
verbs. `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` holds 7 scripts, of which exactly
one writes. Of the 17 `machines:*` channels, three touch files on the far side, being
`machines:putImage`, `machines:reviewFile` and `machines:reviewFiles`.

---

## 4. The four hard parts, each priced thin

### 4.1 Change notification, which is the only real loss

The local design has one file system subscription per repository, in
`src/main/watcher/repo-watcher.ts`, feeding `emitRepoChanged` in `src/main/watcher/bus.ts`, which
both the git sidebar and quick open subscribe to as peers. That subscription is `@parcel/watcher`, a
native module that reads the operating system's own event feed. It cannot run on a machine where
nothing is installed.

Polling is the thin answer, and it is affordable. A stat of every file in a 1,453 file repository
costs 23.5 ms in one call at zero network. On the operator's own repository, which holds 28,696
files outside `.git`, a full `find` walk costs 48 ms to 104 ms of processor time, measured on this
Mac. A cheaper poll is the `REVIEW_LIST` script that already exists, which returns the whole
`git status --porcelain=v2 --branch -z --untracked-files=all` payload in one round trip.

Two honest consequences follow, and both belong in the copy rather than in a footnote.

- A remote project's view is as fresh as the last poll, and the interval is visible.
- A remote save can land on a file an agent changed since the last poll. That is why the save script
  in section 4.4 carries a hash guard instead of trusting the poll.

A resident process is not the same thing as an installed program, and the distinction matters here.
Tortie already keeps two long lived processes on a remote machine, being that machine's own tmux
server and the control mode client attached to it. A poller that is one more long lived command over
the same door installs nothing on the far disk. So the choice between polling on a timer and holding
a loop open is a design choice inside the thin design, not the boundary between thin and installed.

### 4.2 Search, where the answer is a refusal rather than a workaround

`src/main/search/args.ts` passes `--json` and `src/main/search/engine.ts` parses ripgrep's NDJSON
through `parseRgLine`. The binary comes from `@vscode/ripgrep`, resolved in
`src/main/search/resolve.ts`, and the copy installed in the operator's tree is
`@vscode/ripgrep-darwin-arm64`. Tortie has no ripgrep for any other platform and
`electron-builder.yml` builds one target family, being mac dmg and zip on arm64.

Three options, and the rejected ones are shown with their deciding reason.

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| Send a ripgrep binary to the far machine and run it | Rejected | It is an install by any honest reading. It also needs a write of an executable and a `chmod`, which is precisely what condition 38 of `build/conformance-machines.mjs` and rules 5 and 6 of `remote-scripts.ts` are written to prevent |
| Require the person to install ripgrep | Rejected | It moves the install from Tortie to the person and calls that a difference. It also breaks on the first machine where the person cannot install packages |
| Use the far machine's own `git grep` over tracked files, labelled | Recommended | git is already required by `REVIEW_LIST`, the far side already answers `git rev-parse`, and the honest label is that untracked and ignored files are not searched. A second parser is the cost, and it is small |

If the second parser is judged not worth it, refuse search on a remote project and say so. That is a
better product than a search that silently covers a different set of files from the one the person
sees in the tree.

### 4.3 Quick Open, which is solved thin and costs one call

The quick open worker in `src/main/quickopen/worker.ts` spawns `rg --files` and holds the path
strings, then scores them locally. The scoring is what makes it feel fast, and the scoring already
happens on the Mac.

Measured on the operator's own repository at `/Users/gdc/gmux`, `rg --files` returns 1,445 paths in
52,969 bytes, in 25 ms to 27 ms. The equivalent thin call is the far machine's own
`git ls-files -co --exclude-standard`, which needs git and nothing else. For comparison, a plain
`find` over the same tree returns 28,696 paths and 1,609,399 bytes, because it does not honour
`.gitignore`, so the git form is 30 times smaller and is the one to use.

So a remote project's quick open is one round trip for the list and then local scoring. There is no
per keystroke traffic, and the 5.1 ms median keystroke figure recorded in `docs/BACKLOG.md` for the
local case is not put at risk by the machine boundary.

### 4.4 Saving a file, which is one script and one rule change

Today a remote file cannot be saved, and the refusal is silent. In `src/renderer/editor/tab-io.ts`
the `save` function returns false when `tab.remote !== undefined`, with no toast and with Monaco
left editable. That is the defect the charter names, and it is real.

The thin fix is a second write script. The existing `IMAGE_PUT` script in `remote-scripts.ts`
already does every hard part, being a base64 payload carried as a positional parameter, a write to a
temporary name, a `chmod`, a `mv` into place, and a checksum computed with `shasum -a 256` falling
back to `sha256sum`. A save script is that script with a guard added, being that it reads the
current file's checksum first and refuses the write when it does not match the checksum the Mac read
when it opened the file. A refusal is then a visible message that names the conflict, which is
strictly better than the local editor's behaviour, because locally the watcher is what protects the
person and remotely nothing does.

Two constraints have to move, and they should move deliberately rather than quietly.

- Rule 6 in the header of `remote-scripts.ts` says exactly one script has `mode: 'write'`, and
  condition 35 of `build/conformance-machines.mjs` checks the count. It becomes a rule about shape
  rather than a rule about count, being that every write script writes to a temporary name, moves it
  into place, and is safe to run twice.
- `REMOTE_SCRIPT_MAX_BYTES` is 131,072 and `REMOTE_IMAGE_MAX_BYTES` is 90,000, because the payload
  rides in one argument of the far machine's login shell. No file under `src/main/machines` uses
  stdin at all, checked this session by grep. A file larger than about 90,000 bytes therefore cannot
  be saved through the door as it stands. The fix is to send the payload on the ssh child's stdin
  instead of in argv, which has no such cap, and it is a change to `remote-run.ts` rather than a new
  transport.

The git write verbs are a different matter and this document rules against them. `REVIEW_LIST` and
`REVIEW_FILE` hard code their git verbs to `rev-parse`, `status` and `show`, and condition 38 checks
that no caller can supply a verb. Letting a caller choose the verb is the exact hole that rule
closes, so stage, commit and discard stay refused on a remote project. Finding 15 of research 54,
being that the sidebar can commit to this Mac's copy while the person looks at another machine, is
fixed by putting the machine into the project model, not by adding write verbs to the far side.

---

## 5. Research 51 section 5, re-examined against this feature

Research 51's verdict row for the Host says it was rejected for now, and its section 8 records the
deciding argument as the residency contradiction, being that the Host's unattended promises need a
daemon that is always resident while the design made the daemon optional, hand installed and hand
updated on four machines.

That argument does not decide this feature, and pretending it does would be dishonest. The
residency contradiction is about what happens while the Mac is away, being harvest, attention
history and checkpoints. A project folder asks nothing of the far machine while the Mac is away. A
tree that is not being looked at needs no listing, and a file that is not open needs no read. So if
the Host were going to be justified by anything, a project folder is a fair place to argue it, and
that is why the charter reopened the question.

Here is the re-examination, done against the numbers rather than against the old argument.

| What a Host would add for a project folder | What the thin design gives instead | Is the gap worth a second product |
| --- | --- | --- |
| An event driven watcher | A poll costing 23.5 ms per call on the wire and 48 ms to 104 ms of far side processor time on the operator's own tree | No. The loss is freshness between polls, and the copy can state it |
| Fast content search over every file | `git grep` over tracked files, or a refusal | No, and this is the closest call in the table. It is a real loss and it is one capability |
| Batched operations with no per call process spawn | One ssh call per gesture at 6.5 ms of floor, batched | No. The batched call already removes the amplification, and 6.5 ms of that floor is 2.49 ms of local process spawn |
| Symbols and an index kept warm on the far machine | Deferred | No. Nothing in the scope guardrail asks for remote symbols |
| A save with no round trip risk | A hash guarded save that refuses on conflict | No. The guard is better than the local behaviour, not worse |

The honest summary is that the Host would buy an event feed and a search. Everything else on the
list the thin door already does, at a cost that a batched design hides.

---

## 6. The Host, priced honestly

This section prices it anyway, because the charter asks for a price rather than a dismissal.

### 6.1 What would have to be built, counted from this tree

| Item | Count, measured this session |
| --- | --- |
| Lines under `src/main` that answer a project folder's questions today, excluding tests, across `fs`, `git`, `search`, `symbols`, `quickopen`, `watcher`, `preview` and `recents` | 12,326 lines in 52 files |
| Of those files, ones that import from `electron` and therefore cannot move as they are | 12 |
| Native modules a far side would need built for its own platform | 3, being `@parcel/watcher`, `better-sqlite3` and `node-pty` |
| Shipped binaries a far side would need for its own platform | 2, being ripgrep and tmux, plus 6 tree sitter wasm grammars |
| Release targets `electron-builder.yml` produces today | 1 family, being mac dmg and zip on arm64 |
| Release targets a Host needs before it is useful on the operator's machines | 3 at least, being macos arm64, linux x64 and linux arm64 |
| Update mechanism the Mac app has | 1, being `autoUpdater.setFeedURL` in `src/main/updates/updater.ts` |
| Update mechanism a Host would have on day one | 0 |

### 6.2 What keeping versions matched would cost the operator

This is the part that decides it, and it is measurable rather than rhetorical.

| Measurement | Value |
| --- | --- |
| Bumps of the `version` field in package.json, 2026-08-09 to 2026-08-18 | 45 |
| Bumps on the last five of those days | 8, 11, 8, 10, 8 |
| Version in package.json at `7a665d7` | 0.41.0 |
| Newest version section in CHANGELOG.md, last written 2026-08-16 | 0.31.0 |
| Machines the operator runs | 4 |
| Remote tmux versions Tortie has had to measure so far, in `TESTED_REMOTE_TMUX` | 3 |
| Server and client tmux pairs measured together, in `TESTED_TMUX_PAIRS` | 1 |

Read the first and fourth rows together. Inside one repository, where both files sit in the same
commit stream and one agent writes both, a hand maintained companion drifted 10 versions behind in
two days. A Host is that same obligation across four machines, three build targets, and a wire
protocol, maintained by a person who is not watching for it. The daily rate above is not a fair
estimate of the RELEASE rate, and the honest version of the claim is in section 8. What it does show
is the rate at which the thing a Host would have to match is being changed.

The cost is not the first build. It is that after every change to the wire, four machines are wrong
until someone fixes them, and the failure shows up as a project folder that stops answering rather
than as a message that says a version is mismatched. Tortie already pays a small version tax for the
thin design, being the three measured remote tmux versions, and that tax is bounded because tmux
changes a few times a year and its protocol is not Tortie's to break.

### 6.3 The rule that would have to be broken to install it

A Host has to reach the far machine somehow. The door that exists refuses to carry it, and the
refusal is structural rather than a matter of taste.

| Rule, in `src/main/machines/remote-scripts.ts` and `build/conformance-machines.mjs` | What a Host install needs |
| --- | --- |
| Rule 5 and condition 38, a read script may not name `rm`, `mv`, `cp`, `chmod`, `chown` and others | An install writes, moves and marks a file executable |
| Rule 6 and condition 35, exactly one script writes, and its redirections aim at a temporary name | An install writes a binary of several megabytes |
| `REMOTE_SCRIPT_MAX_BYTES`, 131,072 bytes for the whole command, with no stdin path anywhere in `src/main/machines` | A binary is 100 to 1,000 times that |
| Refusal 8 in CLAUDE.md, nothing may cause a process to start on a configuration change alone | A Host is a process that starts on the far machine and stays |

None of these is a law of physics. All of them are rules the operator can change, and this document
does not claim the Host is impossible. It claims the door was deliberately built so that installing
software is a decision somebody has to take on purpose, and that decision has not been earned by a
project folder.

---

## 7. What would change this ruling

Stated so the deferral can be falsified rather than repeated.

| Trigger | Why it would flip the answer | How to test it |
| --- | --- | --- |
| A measured round trip time to mac-pro above roughly 150 ms | Batching hides about one round trip per gesture. At 150 ms a folder expansion is a visible wait and an editor open is worse | Put a key on mac-pro, then time 20 multiplexed `true` calls and compare against `tailscale ping` |
| The operator asking for full search across untracked files on a remote project | `git grep` cannot answer it and the only other answer is a binary on the far side | Ask him once, plainly, with the tracked files limit named |
| Attention while the Mac is asleep becoming a requirement | This is research 51's own case and it is unchanged by this feature | It is a product decision, not a measurement |
| A second person using Tortie against shared machines | Version matching by hand stops being one person's problem and becomes a support surface | Not applicable yet |

If none of those become true, the Host stays unbuilt and the four machines stay clean.

---

## 8. What is not true, and what was not measured

**Measured on the wrong machine.** Every timing in section 2 was taken with this Mac talking to
itself over loopback with a scratch sign in server. The far side has this Mac's processor and this
Mac's disk. A slower far machine makes the work part of each number larger, and the network part is
absent entirely.

**The tailnet number does not exist.** No round trip time to mac-pro or to any other machine of the
operator's was measured, because this Mac holds no key any of them trust. `docs/BACKLOG.md` records
the same gap for Phase 83. What would close it is one key on mac-pro and then two measurements,
being 20 multiplexed `true` calls timed from the app's own carriage, and `tailscale ping` for the
underlying round trip. Until then, the sentence "a folder open costs 40 ms rather than 400 ms" in
the charter is unanswered by me.

**How many round trips one multiplexed command costs is unmeasured.** On loopback the round trip
time is too small to separate from the process spawn, so I cannot say from measurement whether a
multiplexed exec costs one round trip or three. That factor is what turns a measured ping into a
predicted gesture cost, and it should be measured on the same visit as the ping.

**`npm run conformance:machines` was not run.** The worktree this round used has no `node_modules`,
so the gate failed to load and I read its 46 numbered conditions rather than executing them. The
rule claims in sections 4.2, 4.4 and 6.3 are read from the source text of
`build/conformance-machines.mjs` and `src/main/machines/remote-scripts.ts`, not from a passing run.

**The version bump rate is not the release rate.** Forty five bumps of package.json in 10 days is a
measurement of the repository. CHANGELOG.md records 9 version sections, so the number of builds the
operator actually installed is smaller than 45 and I did not measure it. The claim the Host pricing
rests on is the rate of change of the thing a Host would have to match, and that is what 45 measures.

**Far side program availability is unknown.** Whether mac-pro or any Linux machine of the operator's
has ripgrep, which git version it runs, and whether it answers `shasum` or `sha256sum`, were not
checked, because no machine was contacted. The existing `MACHINE_FACTS` script prints four values
and none of them is a program list, so a design that depends on far side programs needs that script
to grow or needs a probe of its own.

**The poll cadence is not designed here.** I measured what one poll costs. I did not choose an
interval, and a chosen interval needs the tailnet number first.

**The label question is not mine.** Research 54 item 15 asks for a "Files live on <machine>" label,
and grep confirms no such string exists anywhere under `src/renderer` or `src/main` today. Whether
it ships as a stopgap is the round's ruling and not this investigator's.

**Two things I assumed.** I assumed the far machine has git, because `REVIEW_LIST` already depends
on it and shipped. I assumed the operator's machines run a POSIX shell that the seven existing
scripts already work against, which is true for every machine those scripts have been run on and is
unverified for machines nobody has contacted.

---

Paths and symbols this document relied on, all read this session at `7a665d7`.
`src/shared/types.ts` (`Project`, `CreateSessionInput.machineId`),
`src/shared/ipc/base.ts`, `src/shared/ipc/git.ts`, `src/shared/ipc/search.ts`,
`src/shared/ipc/machines.ts` (`REMOTE_IMAGE_MAX_BYTES`),
`src/main/manifest/schema.ts` (`MIGRATIONS`, `001-initial`, `MANIFEST_SCHEMA_VERSION`),
`src/main/machines/exec-plane.ts` (`REMOTE_VERB_LEDGER`, `VERBS_THIS_RUNG_REFUSES`),
`src/main/machines/remote-scripts.ts` (`REMOTE_SCRIPTS`, `REMOTE_SCRIPT_MAX_BYTES`,
`REMOTE_SCRIPT_MARKER`, `MACHINE_FACTS`, `IMAGE_PUT`, `REVIEW_LIST`, `REVIEW_FILE`,
`remoteWriteScripts`), `src/main/machines/remote-review.ts` (`REMOTE_REVIEW_MAX_FILES`,
`REMOTE_REVIEW_MAX_BYTES`), `src/main/machines/ssh.ts` (`SSH_CONTROL_PERSIST_SECONDS`,
`CONTROL_PATH_MAX_BYTES`, `composeControlPath`), `src/main/tmux/version.ts`
(`BUNDLED_TMUX_VERSION`, `TESTED_TMUX_PAIRS`, `TESTED_REMOTE_TMUX`),
`src/main/watcher/repo-watcher.ts`, `src/main/watcher/bus.ts` (`emitRepoChanged`),
`src/main/search/args.ts`, `src/main/search/engine.ts`, `src/main/search/parser.ts`
(`parseRgLine`), `src/main/search/resolve.ts`, `src/main/quickopen/worker.ts`,
`src/main/updates/updater.ts`, `src/renderer/editor/tab-io.ts` (`save`),
`src/renderer/tree/store.ts` (`listInto`), `src/renderer/tree/ignored.ts`,
`src/renderer/app/session-actions.tsx` (`reviewListTitle`),
`build/scratch-machine.mjs` (`scratchYard`, `scratchMachine`, `refuseRealSockets`),
`build/conformance-machines.mjs`, `electron-builder.yml`, `package.json`, `CHANGELOG.md`,
`docs/ZEN-OF-TORTIE.md`, `docs/research/51-remote-machines.md`,
`docs/research/54-remote-parity.md`, `docs/BACKLOG.md`.
