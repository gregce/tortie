# Research 55. A project folder that lives on another machine

## 0. The answer

**Build the remote project folder on the door that already exists. Do not build a Tortie Host. The
whole design is one new frozen script that takes a root, a depth and a cap, and one rule that says
Tortie asks for a subtree and never for a folder. Every write stays on this Mac, and of the thirteen
workspace surfaces counted in Section 14.3, five cross and eight refuse.**

**The latency measurement the charter said could not be taken WAS taken, this session, against the
operator's own Mac Pro over his own tailnet.** The charter states that this Mac holds no ssh key that
his Mac Pro accepts, and that Phase 83 therefore never produced the number. That is no longer true.
`ssh -o BatchMode=yes 100.113.101.95 true` signed in on the first attempt with no password and no
prompt. So this document contains real round trip numbers rather than loopback floors, and the two
harnesses that produced them are saved at `docs/research/assets/55-probe-real-machine.mjs` and
`docs/research/assets/55-probe-batching.mjs` so anybody can run them again.

Three qualifications belong in the same paragraph as the numbers, and none of them is small.

1. `tailscale ping` answers `pong from gregs-mac-pro (100.113.101.95) via 192.168.1.47:41641`. That
   is a direct path over the local network, not a wide area path. Every number below is a
   same building number. A Mac Pro reached from a hotel is a different machine for this purpose and
   nobody has measured that.
2. The round trip has a long tail even on that local network. Over 60 ICMP packets the median is
   7.98 ms and the ninetieth percentile is 89.77 ms, which is 11 times the median. The design has to
   be built for the tail, not for the median.
3. I did not drive the app. Every number is a harness talking to `ssh`, shaped exactly like
   `sshOptions` in `src/main/machines/ssh.ts` composes it.

The four numbers that decide the design.

| Measurement | Value |
| --- | --- |
| One folder of 41 entries, one call, warm connection | 30.8 ms at the median |
| The same folder read locally by `fs:readDir`'s own `readdir` | 0.045 ms at the median |
| Nine folders as nine calls, one after another | 409.7 ms at the median |
| Nine folders as ONE call carrying a whole subtree | 55.5 ms at the median |

A remote folder listing costs 684 times a local one. That ratio is what forces the design, and the
design that answers it is the fourth row. One call per gesture, never one call per row.

**The seven charter questions, ruled.**

| # | Question | Ruling |
| --- | --- | --- |
| 1 | What carries the machine through the project model | A new table `remote_projects`, migration 015, additive. NOT a rebuild of `projects` and NOT a bump of `MANIFEST_MIN_COMPATIBLE_VERSION` |
| 2 | What a listing and an expansion cost | 30.8 ms for one folder, 65.5 ms for a whole 1,695 entry repository in one call, 210.6 ms when the connection went cold. Measured on mac-pro |
| 3 | What the Explorer becomes | One new frozen read script taking root, depth and cap. It is the SAME script Phase 84 item 6 already queues as `machines:listDir`, and only one of the two may be written |
| 4 | What the git sidebar becomes | Read only, and the read set is exactly the Changes group, which `review-list` already answers in 57 ms. No git write ever crosses |
| 5 | What search becomes | Refused, with a labelled empty state. Quick Open and the symbol palette refused with it. ripgrep is not installed on mac-pro and I measured that |
| 6 | What the editor becomes | Fix the silent refusal now in four small changes. Open any file needs no new script. Do NOT build a remote save in the same phase, and not at all unless the operator asks |
| 7 | Whether the no install rule survives | It survives. A project folder is read traffic, and every read it needs is one command the far machine's own programs already answer |

**The item 15 label. It is not its own phase, and it is not a stopgap.** Research 54 item 15 asks for
a "Files live on <machine>" label on the Explorer, the git sidebar, search and Quick Open. The string
appears zero times in `src/`, so it was specified twice and written never. Shipped alone it discloses
a destructive write instead of stopping it, so it must ship in the same commit as the refusal that
stops the write. It is also permanent rather than temporary, because after a project carries a machine
those four surfaces still need to say which machine. Two of the four refuse outright, being search
and Quick Open, and a third is read only, being the git sidebar. Section 11 gives the ruling in
full.

**The two defects that lead.** Two things in this tree are wrong today, cost a few lines each, and are
blocked on none of the seven questions. A remote review tab is fully editable, Cmd-S is enabled on it,
and the save returns `false` with no message at all. And a remote create with an empty Directory field
sends THIS Mac's project path to the other computer as the far side's working directory, and stamps it
on that machine's tmux server as `@gmux-project`. Both are cases of Tortie asserting something untrue.
They should be fixed before any of the design below is built. Section 12 has both.

---

## 1. The latency measurement, and why the charter said it could not be taken

The backlog row reads "83, for the latency number. Phase 83 did not produce it, because it never
reached mac-pro." Three of the five investigators reported `Permission denied
(publickey,password,keyboard-interactive)` and filed the question as unanswerable.

I attempted it once and it worked.

```
$ ssh -o BatchMode=yes -o ConnectTimeout=8 100.113.101.95 'echo REMOTE_OK; uname -a; hostname'
REMOTE_OK
Darwin Mac 24.6.0 Darwin Kernel Version 24.6.0: ... RELEASE_ARM64_T6020 arm64
Mac
```

`BatchMode=yes` means no password and no keyboard prompt was possible, so the sign in used a key this
Mac already offers. I did not investigate which key, and I did not install one. **What the operator
must do to close this is therefore nothing.** The gap the charter describes is closed already, and the
one command that produces the number from now on is

```
node docs/research/assets/55-probe-real-machine.mjs 100.113.101.95 /tmp/r55-501 \
  /usr/share /Users/gdc/dev /Users/gdc/.oh-my-zsh /Applications
```

Two things follow that the round should record. Phase 83's blocker row in the backlog is stale and
should be re-tested rather than trusted. And `npm run probe:realmachine`, which the backlog names as
the probe that needs a key, can run now.

**What is still not measured about the link.** The probe never used Tortie's own key file, because
`IdentityFile` appears zero times under `src/main/machines` and the product names no key on any ssh
command. So this session proved that a connection is possible, not that Tortie's connection is
possible. Phase 84 item 7 is the phase that closes that, and it is already queued.

---

## 2. What the far machine is, read this session

Every row was read with one read only ssh command. Nothing was written on that machine, no tmux
server was contacted and no file of the operator's was modified.

| Fact | Value | Why it matters here |
| --- | --- | --- |
| Processor | Apple M2 Ultra, 24 cores | Far side compute is not the limit. A whole repository walk is 65 ms |
| System | macOS, Darwin 24.6.0 | BSD `find` and BSD `stat`. There is no `find -printf` and the listing script must work without it |
| ssh | OpenSSH_9.9p2 | Multiplexing behaves as documented |
| `MaxSessions` | commented out in `/etc/ssh/sshd_config`, so the default 10 | The concurrency knee measured in Section 3 sits exactly there |
| `MaxStartups` | commented out, so the default `10:30:100` | Beyond ten at once, new connections are opened and some are refused |
| git | 2.39.5 (Apple Git-154) | `review-list` works. `status --porcelain=v2` is available |
| ripgrep | **not installed**. `command -v rg` answered nothing | This alone decides charter question 5 |

Two directory facts used below. `/Users/gdc/.oh-my-zsh` on that machine holds 1,214 files in 481
directories, which is a realistic small project. `/Users/gdc` holds 5,923 entries within three levels.

---

## 3. The transport, measured on the real machine

All numbers below are from `docs/research/assets/55-probe-real-machine.mjs` and
`docs/research/assets/55-probe-batching.mjs`, run this session against 100.113.101.95 with the same
nine ssh options `sshOptions` in `src/main/machines/ssh.ts` composes, in the same order. Every raw
row those two harnesses printed is saved at `docs/research/assets/55-measurements.txt`, so no number
in this document is a figure nobody can re-read.

### 3.1 The floor

| What | n | min | p50 | p90 |
| --- | --- | --- | --- | --- |
| ICMP round trip | 60 | 5.82 ms | 7.98 ms | 89.77 ms |
| `ssh` client start on this Mac, no network at all | 20 | 2.44 ms | 2.75 ms | not taken |
| Cold connection, `true` | 10 | 170.3 ms | 210.6 ms | 300.0 ms |
| Warm multiplexed, `true` | 20 | 29.3 ms | 35.9 ms | 123.8 ms |

A warm call costs 35.9 ms at the median, of which 2.75 ms is starting the local `ssh` binary. The
remaining 33 ms is about four round trips of the measured 7.98 ms plus the far side's own shell start.

`SSH_CONTROL_PERSIST_SECONDS` in `src/main/machines/ssh.ts` is 60, so a minute of no traffic returns
the person to the 210.6 ms cold price. On a design that polls, that never happens. On a design that
waits for a click, it happens constantly.

### 3.2 One folder, one call

The script shape is the door's own shape, being one `/bin/sh -c` argument holding constant text, the
script name, and the caller's values as positional parameters. Two listing shapes were timed. "stat"
runs `find ... -exec stat -f '%HT %m %z %N' {} +`. "two walk" runs `find` twice, once for directories
and once for everything else, and marks a directory with a trailing slash.

| Folder | entries | shape | answer bytes | p50 | p90 |
| --- | --- | --- | --- | --- | --- |
| `/usr/share` depth 1 | 41 | stat | 1,853 | 30.8 ms | 33.9 ms |
| `/usr/bin` depth 1 | 915 | stat | 43,843 | 49.3 ms | 63.1 ms |
| `/usr/share` depth 2 | 794 | stat | 48,890 | 55.1 ms | 147.4 ms |
| `/usr/share` depth 3 | 10,043 | stat | 648,665 | 268.8 ms | 301.2 ms |
| `/usr/share` depth 3 | 10,043 | two walk | 364,612 | 110.5 ms | 146.7 ms |
| `.oh-my-zsh` whole tree, depth 9 | 1,695 | stat | 112,574 | 65.5 ms | 130.6 ms |
| `.oh-my-zsh` whole tree, depth 9 | 1,695 | two walk | 71,778 | 68.7 ms | 143.6 ms |

The local comparison, taken with the same `readdir(dir, { withFileTypes: true })` call that
`fs:readDir` in `src/main/fs/ipc.ts` makes.

| Folder | entries | p50 |
| --- | --- | --- |
| `/usr/share` | 41 | 0.045 ms |
| `/usr/bin` | 915 | 0.407 ms |
| `/Users/gdc` | 891 | 0.370 ms |

**684 times** for the small folder and **121 times** for the large one. The cost is the round trip
and not the work, which is why the answer is to make fewer calls rather than smaller ones.

**The two walk shape wins and it is the shape to ship.** It costs 2.4 times less than the stat shape
at ten thousand entries, and it carries 44 percent fewer bytes. It is also the exact information
`fs:readDir` returns today, which is a name, a path and a kind. Nothing in the tree reads a size or a
modification time off a tree row.

### 3.3 Batching, which is the whole design

Nine directories, being the nine child directories of `/Users/gdc` on mac-pro, read three ways.

| Shape | p50 | p90 |
| --- | --- | --- |
| Nine calls, one after another | 409.7 ms | 504.8 ms |
| Nine calls at once | 43.8 ms | 119.1 ms |
| ONE call carrying nine roots as nine parameters | 55.5 ms | 160.7 ms |
| ONE call carrying the whole subtree to a depth | 42.3 ms at depth 2, 119.1 ms at depth 3 | 81.1 ms and 279.3 ms |

Serial is 7.4 times worse than one subtree call. That is the number the Explorer's design turns on.

### 3.4 Fan out, and where it breaks

Calls issued at the same moment through one ControlMaster, three rounds each.

| At once | p50 wall clock | Failures |
| --- | --- | --- |
| 2 | 29.4 ms | 0 of 6 |
| 4 | 34.9 ms | 0 of 12 |
| 6 | 36.3 ms | 0 of 18 |
| 8 | 44.8 ms | 0 of 24 |
| 10 | 44.8 ms | 0 of 30 |
| 12 | 279.1 ms | 0 of 36 |
| 16 | 289.6 ms | 0 of 48 |
| 24 | 415.2 ms | 0 of 72 |
| 50 | 742.7 ms | 3 of 150 |

**The knee is at ten and it is exactly `MaxSessions`.** Up to ten calls ride the one authenticated
connection and cost what one call costs. The eleventh opens a new TCP connection and pays the cold
price, which is why twelve at once costs 6.2 times what ten at once costs.

This refutes the shape of investigator 2's finding without changing its conclusion. Investigator 2
measured 16 failures out of 50 against a scratch sshd on this Mac and concluded that fan out fails.
Against mac-pro, 50 at once failed 3 times out of 150 and the rest simply cost more. **So fan out
degrades rather than breaks, and the rule that follows is a limit rather than a refusal.**

**The rule: at most eight calls outstanding to one machine at any moment.** Eight rather than ten,
because the existing pollers in `remote-harvest.ts`, `remote-capsule.ts` and `remote-store-sync.ts`
already hold their own in flight calls on that same connection, each with the comment "One in flight
per link. A slow machine cannot queue passes behind itself."

---

## 4. Question 1. What carries the machine through the project model

### 4.1 What is there now

| Thing | Count | Where |
| --- | --- | --- |
| Fields on `Project` | 3, being `id`, `path` and `name` | `src/shared/types.ts`, `interface Project` |
| Columns on `projects` | 3, and `path` is `TEXT NOT NULL UNIQUE` | `MIGRATIONS[0]`, `001-initial`, `src/main/manifest/schema.ts` |
| Migrations | 14, and not one rebuilds a table | `MIGRATIONS` in `src/main/manifest/schema.ts` |
| `MANIFEST_SCHEMA_VERSION` | 14 | same file |
| `MANIFEST_MIN_COMPATIBLE_VERSION` | 13 | same file |
| Non test renderer files | 326 | `src/renderer` |
| Of those, naming `projectPath`, `project.path` or `projectRoot` | 41 | measured with one grep |
| Of those, naming any project rooted path including `repoPath` and `rootPath` | 85 | measured with one grep |
| Non test main files naming one of those three | 56 | `src/main` |
| Invoke channels in `src/shared/ipc/` | 161 | 162 lines matching `req:`, one of which is a comment |
| `git:*` invoke channels | 27, of which 16 write | 28 keys, one being the event `git:changed` |
| Of the 27, carrying a repository path | 27. Six take a bare `repoPath: string` and the other 21 take an input type that holds `repoPath` | checked every input interface by name |
| `machines:*` invoke channels | 17 | all invoke, no event among them |

The 41 and the 85 are read counts, not work counts. The honest work count is smaller, because a whole
subsystem usually converts a project into a path once. The four conversion sites are

| Surface | The line that converts |
| --- | --- |
| Git sidebar header | `const repoPath = project?.path ?? null` in `BranchHeader.tsx` |
| Git sidebar body | `const repoPath = project?.path ?? null` in `ScmSection.tsx` |
| Search | `repoPath: useApp.getState().activeProject()?.path ?? null` in `src/renderer/search/store.ts` |
| Explorer | `void setRoot(project?.path ?? null)` in `FilesSection.tsx` |

Four lines decide whether four surfaces are pointed at a folder on this Mac. That is where the machine
test goes, and it is the reason this feature is affordable at all.

### 4.2 The blocker, and the ruling that avoids it

`projects.path` is `TEXT NOT NULL UNIQUE`, and `upsertProject` in
`src/main/manifest/projects-repository.ts` relies on it with `ON CONFLICT(path)`. The same absolute
path on two machines is one key. `addProject` in `src/main/sessions/core.ts` also refuses a path that
is not a directory on this Mac, with `isDirectory` before anything else runs.

Investigator 1 ruled that the fix is a rebuild of the `projects` table, moving
`MANIFEST_MIN_COMPATIBLE_VERSION` from 13 to 15, and called it the first table rebuild this manifest
has ever done. Adversary 2 pointed at a cheaper precedent and it is correct. **Migration
`007-restore-attempts` is a `CREATE TABLE IF NOT EXISTS` that added a shape without touching an
existing table and without moving the minimum.**

**Ruling. Add a table, do not rebuild one.**

```
remote_projects (
  id         TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  path       TEXT NOT NULL,   -- absolute, on that machine
  name       TEXT NOT NULL,
  UNIQUE(machine_id, path)
)
```

Why this wins on every axis that matters.

| Property | Rebuild of `projects` | New `remote_projects` table |
| --- | --- | --- |
| Migrations that already do this | 0 of 14 | 1 of 14, being `007-restore-attempts` |
| `MANIFEST_MIN_COMPATIBLE_VERSION` | must move 13 to 15, because `ON CONFLICT(path)` fails without the unique index | stays 13 |
| What an older build does after a downgrade | reads a table its upsert cannot use | shows the local projects and no remote ones, which is true rather than wrong |
| Same path on two machines | allowed | allowed |
| Cost inside `ProjectsRepository` | rewrite `upsertProject` | `list()` reads both tables, `upsert` picks by machine |

`Project` then gains one optional field, following the precedent already set for sessions. `Session`
carries `machine?: SessionMachine` with the comment "Absent means it runs here", added by migration
`013-machine-id` which wrote `addColumnIfMissing` and one `UPDATE`. `Project` gains `machine?:
SessionMachine` on exactly the same terms, so every existing reader that does not know about machines
continues to read a local project correctly.

One more change follows and it is not free. Sessions join projects by `project_path` today. With two
projects at one path the join key becomes the pair of `machine_id` and `project_path`. `sessions`
already carries `machine_id`, so this is a query change and not a schema change.

### 4.3 The channel that has to be added rather than changed

`projects:add` is in the frozen Phase 2 contract at the top of `src/shared/ipc/base.ts`, whose header
reads "FROZEN". A machine bearing add is therefore an appended channel, and the precedent for that is
`projects:pickDirectoryFor` in `src/shared/ipc/projects.ts`.

### 4.4 The browser records that collide, and there are more than anybody counted

Investigator 1 said two `localStorage` records are keyed by an absolute project path and called the
collision surface "exactly two records". Adversary 1 found four and adversary 2 found five. I counted
**eight** records keyed by an absolute project or repository path, plus three keyed by a session
working directory, plus one that carries a repository path inside its value.

| Record | Module and symbol | How the path appears |
| --- | --- | --- |
| `gmux.splitLayouts` | `src/renderer/state/layout.ts`, `LS_LAYOUTS` | record key |
| `gmux.editorWidth` | `src/renderer/editor/panel-width.ts` | record key |
| `gmux.treeOpen.<rootPath>` | `src/renderer/tree/FileTree.tsx`, `LS_OPEN_PREFIX` | appended to the key |
| `gmux.scm.historyScope.<repoPath>` | `src/renderer/scm/history-scope.ts`, `storageKey` | appended to the key |
| `gmux.scm.historyCollapsed.<repoPath>` | `src/renderer/scm/HistorySection.tsx` | appended to the key |
| `gmux.scm.changesCollapsed.<repoPath>` | `src/renderer/scm/ScmSection.tsx` | appended to the key |
| `gmux.scm.runsCollapsed.<repoPath>` | `src/renderer/scm/RunsSection.tsx` | appended to the key |
| `gmux.scm.branchesCollapsed.<repoPath>` | `src/renderer/scm/BranchesView.tsx` | appended to the key |
| `gmux.context.agent.<cwd>` | `src/renderer/context/store.ts`, `AGENT_KEY` | appended to the key |
| `gmux.context.collapsed.<id>.<cwd>` | `src/renderer/context/ContextView.tsx` | appended to the key |
| `gmux.context.bundled.<id>.<cwd>` | `src/renderer/context/ContextView.tsx` | appended to the key |
| `gmux.quickopen.recents` | `src/renderer/quickopen/recents.ts` | `repoPath` field on every entry |

`gmux.treeOpen.` is the expensive one, and it is the one investigator 1 missed while calling the loss
"a pane arrangement and a panel width, not work". It holds the expanded directory set, capped at 500
by `saveExpanded` in `FileTree.tsx`, and a restore effect in the same file calls `loadDir` once per
persisted directory. A remote project at `/Users/gdc/gmux` on mac-pro would inherit this Mac's
expanded set for the same string and then fire up to 500 remote listings on first open.

The fix is not two modules. `write` in `src/renderer/state/layout.ts` refuses any key that does not
start with `/`, and `migrateLegacyLayouts` in the same file treats every non path key as a legacy
project UUID to adopt or to drop. A key shaped `mac-pro:/Users/gdc/gmux` is refused by the first and
misread by the second. So the change is one guard, one migration and eight key composers.

---

## 5. Question 3. What the Explorer becomes

### 5.1 The ruling

**One new frozen read script, three parameters, and a rule that Tortie asks for a subtree.**

```
set -e
umask 077
case "$1" in /*) ;; *) exit 1;; esac
if [ -d "$1" ]; then
  o=$({ find "$1" -mindepth 1 -maxdepth "$2" -name .git -prune -o -type d -print 2>/dev/null | sed 's|$|/|';
        find "$1" -mindepth 1 -maxdepth "$2" -name .git -prune -o ! -type d -print 2>/dev/null; } | head -n "$3")
else
  o=
fi
printf '__TORTIE_RUN__%s__TORTIE_RUN__\n' "${o:-none}"
```

It obeys the seven rules in the header of `src/main/machines/remote-scripts.ts` as they stand, and it
passes conditions 35 to 38 of `build/conformance-machines.mjs` without any amendment. I checked each
one against the gate source.

| Condition | What it checks | Why this script passes |
| --- | --- | --- |
| 35 | ids unique, exactly one writer named `image-put`, a reason of 30 characters or more, `set -e` then `umask 077`, an even marker count | it is a `read`, it begins with the two lines, and it prints one marker pair |
| 36 | no backtick, every declared parameter read, no parameter above the declared count, every read double quoted | it declares 3 and reads `"$1"`, `"$2"` and `"$3"`, all double quoted |
| 37 | one `shellQuoteArgv` call, the script text appearing once, a hostile value appearing exactly once as a quoted argument | composition is `composeRemoteScriptCommand` and this script composes nothing itself |
| 38 | a read script names none of the eleven mutating programs and carries no redirection other than `2>/dev/null`, and names no git verb outside rev-parse, status and show | it names `find`, `sed`, `head` and `printf`, none of which is on `MUTATING_PROGRAMS`, and it names no git verb |

Measured cost of the composed command with a real root, from the batching harness, is 392 bytes
against the 131,072 byte `REMOTE_SCRIPT_MAX_BYTES`.

### 5.2 The variadic design is refused, and here is why

Investigator 2 ruled for one script carrying many roots and priced it at 120 directories per call,
saying it "passes the existing gate unchanged". Three things are wrong with that and I checked all
three.

1. **Nine roots is a hard ceiling.** `positionalsOf` in `build/machines-conformance-probe.mts` reads
   only `$1` to `$9`, with the literal test `if (next < '1' || next > '9') continue;`. Rule 2 in the
   header of `remote-scripts.ts` says the same. `${10}` is not matched. The 120 root command
   investigator 2 measured cannot be declared.
2. **Condition 35 is not the parameter condition.** Condition 35 is the catalogue's shape and
   condition 36 is the parameter walk. Investigator 2 names the wrong one.
3. **The workaround switches a check off.** A script declaring `params: 0` and reading `"$@"` passes
   condition 36 vacuously, and condition 37 contains the line `if (row.params === 0) continue;`
   before the hostile value checks, so a zero parameter script is never given a hostile value at all.
   Step 3 of `runRemoteScript` in `src/main/machines/remote-run.ts` also throws when
   `args.length !== script.params`, so the variadic shape needs a change in the door as well as two
   changes in the gate.

The subtree design needs none of that, and it measured faster. **One call at depth 2 covering nine
folders costs 42.3 ms. One call with nine parameters costs 55.5 ms.**

### 5.3 The eighth script already has a claimant, and only one may be written

`docs/BACKLOG.md` Phase 84 item 6 already queues "A remote folder picker. One `machines:listDir`
channel and one frozen script, the eighth." Investigator 2 called its listing script "the eighth and
last one the Explorer needs" and never mentioned the queued one.

**Ruling. They are one script and one channel.** A folder picker is a listing at depth 1 with a cap. An
Explorer expansion is a listing at depth 2 or 3 with a cap. The picker ships first because Phase 84 is
already queued, and it must be written with the depth parameter present from the start so the Explorer
adds no script at all.

### 5.4 What breaks in the Explorer as it stands

| Symbol | File | What is wrong for a remote root |
| --- | --- | --- |
| `refreshLoaded` | `src/renderer/tree/store.ts` | re-lists every cached directory with `Promise.all` and no limit, on every debounced repo change. `REPO_CHANGED_DEBOUNCE_MS` in `src/renderer/state/repo-changed.ts` is 150 |
| `saveExpanded` | `src/renderer/tree/FileTree.tsx` | persists up to 500 directories, and a restore effect calls `loadDir` once per persisted directory |
| `LS_OPEN_PREFIX` | `src/renderer/tree/FileTree.tsx` | keys the expanded set by absolute root path, so two machines at one path share one set |
| the watcher | `src/main/watcher/repo-watcher.ts` | `@parcel/watcher` over FSEvents, native, and it must sit beside the files |

For a remote root, `refreshLoaded` becomes one subtree call at the depth of the deepest expanded
directory, not one call per directory. The watcher becomes a poll. At 65.5 ms for a whole 1,695 entry
repository, a poll every 2 seconds costs 3 percent of one connection and is affordable. **Say on
screen that a remote folder updates on a timer rather than instantly.** Nothing else in the product
polls a directory, and a person who does not know will read a stale row as a bug.

---

## 6. File operations on a remote project

`buildTreeMenu` in `src/renderer/tree/tree-menu.ts` builds 11 verbs. The deciding sentence is in
`src/main/fs/file-ops.ts`, and it is "DELETE MEANS TRASH. Nothing here calls unlink or rm.
`trashItem` is injected (Electron's `shell.trashItem` in production) so a delete is recoverable from
Finder by construction." **`shell.trashItem` has no equal on the far side.** There is no shell command
that puts a file in another Mac's Trash with a working Put Back.

| Verb | Ruling for a remote project | Deciding reason |
| --- | --- | --- |
| Open | crosses as a read | `review-file` already reads any path relative to a root. See Section 9 |
| Open in New Tab | crosses as a read | same |
| Open With | refuse | `src/main/fs/open-with.ts` launches an application on this Mac |
| Reveal in Finder | refuse | `fs:reveal` calls `shell.showItemInFolder`, which is this Mac's Finder |
| Copy Path | crosses, meaning changes | the copied string names a file on another computer. It must carry the machine or it is a lie |
| Copy Relative Path | crosses unchanged | a relative path is true on both machines |
| New File | refuse in this round | needs a second write script. Section 9 prices it |
| New Folder | refuse in this round | same |
| Rename | refuse | needs a write script AND an overwrite check that `resolveInsideRoot` gives locally and no script gives remotely |
| Duplicate | refuse | same |
| Move to Trash | **refuse permanently, not just in this round** | `shell.trashItem` has no far side equal, and a remote `rm` would turn a recoverable delete into an unrecoverable one. That is a downgrade in a safety property the product states in its own source |

Four cross, five refuse in this round, one refuses permanently and one changes meaning. The
containment guard `resolveInsideRoot` has five consumer modules today, being `fs/file-ops.ts`,
`fs/paths.ts`, `fs/open-with.ts`, `preview/protocol.ts` and `search/context.ts`. None of them can
answer for a folder on another machine, so containment on the far side has to live inside the script
text. Section 9 says how.

---

## 7. Question 4. What the git sidebar becomes

### 7.1 The ruling

**Read only, and the read set is exactly the Changes group. No git write ever crosses, in this round
or a later one.**

The founding rule of the script catalogue is that every script is safe to run twice, stated in the
header of `remote-scripts.ts` and enforced by step 8 of `runRemoteScript`, which throws when the
connection generation moved while a command was in flight. `git commit` run twice is two commits. A
door whose safety property is idempotence cannot carry a verb that is not idempotent.

The read set costs nothing new to build. `review-list` already exists, already runs `git rev-parse
--show-toplevel` and `git status --porcelain=v2 --branch -z --untracked-files=all`, and already feeds
`src/main/git/parse.ts`, which is the same parser the local sidebar uses. Measured on mac-pro this
session:

| Repository | answer bytes | p50 | p90 |
| --- | --- | --- | --- |
| `/Users/gdc/dev` | 106 | 57.2 ms | 140.3 ms |
| `/Users/gdc/.oh-my-zsh` | 226 | 59.5 ms | 110.8 ms |

`ALLOWED_GIT_VERBS` in `build/conformance-machines.mjs` is `['rev-parse', 'status', 'show']` and
condition 38 fails any script naming any other verb, with the sentence "anything else turns a review
into something that changes a repository". Read only over ssh would add about 8 more verbs and full
git would add 20. Neither is proposed here.

### 7.2 The refusal that removes research 54 finding 15, and where it actually goes

Investigator 3 ruled that the local git service must refuse a project whose machine is not this Mac,
and put the check in `normalizeRepoPath` in `src/main/git/ipc.ts`, calling it "one function decides".
**Both adversaries refuted that and they are right. I checked it myself and it is worse than they
said.**

1. `normalizeRepoPath` receives a bare path string. Its signature is
   `function normalizeRepoPath(repoPath: string): string`. It has no project id and no machine id,
   and no git channel carries one. It is also not exported.
2. To decide, it would have to look the project up by path. The case the check exists to stop is the
   case where two projects share a path string on two machines, which is the case Section 4.2's
   design creates. The lookup is ambiguous exactly when the check matters.
3. It is not the only route to git. `src/main/actions/repo.ts` imports `runGit` from `../git` and
   calls it with a `repoPath` that never passes `normalizeRepoPath`. `src/main/projects/index.ts`
   imports `runGitOrThrow` and calls `git init` on a path the same way. `src/main/fs/image.ts`
   imports `getGitService` dynamically for `showAtRefBuffer`. `runGit` and `runGitOrThrow` are
   mentioned 59 times across 7 non test files in `src/main`, of which 45 are in
   `src/main/git/service.ts`.

**Ruling. The refusal goes where the project becomes a path, in the renderer, at the four conversion
sites in Section 4.1, plus one main side guard on the write half.** In the renderer a project with a
machine yields `repoPath = null`, which every one of the four surfaces already handles because a
person can have no project open. In main, the guard takes the machine as an argument rather than
guessing from a path, and it belongs on the 16 writing channels rather than on all 27.

There is a smaller fact neither investigator stated, and it changes when the guard matters.
`normalizeRepoPath` already throws when the path is not a directory on this Mac. So once a project
carries a remote path, all 27 git channels already refuse for any path that does not also exist here.
**The new check earns its place in exactly one case, being when both machines hold the same absolute
path.** That is the operator's own case, because his repositories are mirrored, so the check is
needed. It is not needed for the reason investigator 3 gave.

### 7.3 What the defect actually destroys

Investigator 3 wrote that the defect is "a recursive delete on the wrong computer's copy". That
overstates it and the sentence should be corrected. `discard` in `src/main/git/service.ts` calls
`this.status()` first and deletes only paths whose `indexState` is `'?'` in that repository's own
status, with `rm(join(this.repoPath, rel), { force: true, recursive: true })`. So the file destroyed
is always one this Mac's own sidebar was displaying at that moment. **What is wrong is the person's
belief about which machine they are looking at, not the target of the delete.** That is still a
serious defect and it is still why the label in Section 11 must ship with the refusal rather than
before it.

---

## 8. Question 5. What search, Quick Open and symbols become

### 8.1 The ruling

**All three refuse on a remote project, each with a sentence saying why.**

The deciding measurement is one line. **ripgrep is not installed on mac-pro.** `command -v rg`
answered nothing this session. Tortie ships its own ripgrep, and `src/main/search/resolve.ts` records
it at 4,528,512 bytes, built for darwin arm64 only because `electron-builder.yml` builds one target
family. I did not weigh the binary myself, because this worktree has no `node_modules`.

The three ways out and why each is refused.

| Option | Deciding reason it is refused |
| --- | --- |
| Ship ripgrep to the far machine | 4,528,512 bytes becomes about 6,038,016 base64 bytes, which is 47 sends against the 131,072 byte `REMOTE_SCRIPT_MAX_BYTES`. The catalogue permits exactly one write script, `image-put`, whose target is `$HOME/.tortie/images`, and condition 35 holds that at one. It is also the wrong architecture for a Linux machine, and no Linux machine has been measured |
| Require ripgrep on the far machine | It is not there on the operator's own second machine, which is the only far machine that exists. Requiring it makes the feature not work on the machine it was built for |
| Use the far machine's own `git grep` | `ALLOWED_GIT_VERBS` is three verbs and condition 38 fails `grep`. The probe extracts verbs with `/git (?:--no-pager )?([a-z-]+)/g`, so it is caught. Investigator 5 recommended this and never said it fails the gate |

The stronger reason sits in the tree already. The header of `src/main/search/args.ts` reads "A search
that disagrees with itself between machines is worse than a search that is missing a flag." Two
different engines over two different ignore rules is exactly that disagreement.

### 8.2 Quick Open is refused for a different reason, and the door is left open honestly

Adversary 2 correctly noted that Quick Open uses ripgrep only for the file list, and that the ranking
in `src/main/quickopen/worker.ts` is local `fuzzysort` plus the vendored VS Code scorer. So the engine
identity argument does not transfer. A remote file list is affordable and I measured it, being 65.5 ms
for a whole 1,695 entry repository in one call.

**It is still refused in this round, and the reason is the ignore rules.** `rg --files` respects
`.gitignore` and `find` does not. A Quick Open list built from `find` would carry `node_modules`,
which makes it useless. The only correct list comes from `git ls-files -co --exclude-standard`, and
`ls-files` fails condition 38 exactly as `grep` does. **That is an amendment to the rule the door is
built on, and this round refuses to make it quietly.** If the operator wants remote Quick Open, the
next round decides condition 38 deliberately and prices what else `ls-files` opens.

### 8.3 Symbols

Refused, and it is the cheapest refusal to justify. `src/main/symbols/files.ts` spawns
`rgBinaryPath()` with `buildListFilesArgs()` and then parses each file. Indexing this repository is
1,452 tracked files. At the measured warm floor of 35.9 ms per call that is 52 seconds of round trips
before any parsing, and there is no batched shape for reading 1,452 files through a door capped at
2,097,152 bytes per answer.

---

## 9. Question 6. What the editor becomes

### 9.1 The silent refusal is a defect and the fix is four changes

This is not a design question. Today Tortie invites the edit, accepts the typing and discards it.

| What is true | Where |
| --- | --- |
| Monaco is editable on a remote review tab | `const readOnly = tab.deleted \|\| tab.truncated \|\| tab.commit !== null` in `src/renderer/editor/MonacoHost.tsx`. `tab.remote` is absent |
| The chip says "Edit the file" | `modeOptions` in `src/renderer/editor/EditorPanel.tsx`, the last branch |
| The tab's own tooltip contradicts it | `reviewTabTooltip` in `src/renderer/machines/presentation.ts` says "This view is read only." Two contradictory strings on one tab |
| The refusal reaches nobody | `save` in `src/renderer/editor/tab-io.ts` begins `if (tab.commit !== null \|\| tab.remote !== undefined) return false;` and prints nothing. The store's `save(): Promise<void>` drops the boolean, and both callers write `void ed.save()` |
| File then Save is always enabled | `item('Save', 'save-file', accel('editor.save'))` in `src/main/menu.ts`, and the `item` helper sets no `enabled` |
| The view layer has never heard of a remote tab | occurrences of the word `remote`: `store.ts` 13, `tab-io.ts` 6, `EditorPanel.tsx` 0, `MonacoHost.tsx` 0 |

The four changes are one line each. `readOnly` gains `|| tab.remote !== undefined`. `modeOptions`
says the file is on another machine. `save` surfaces the refusal as a toast. The menu item is disabled
for a remote tab.

### 9.2 A second defect found while tracing, and it is a collision

`openFromRequest` in `src/renderer/editor/store.ts` composes a remote tab id as
`` `machine:${req.remote.machineId}:${req.relPath}` ``, with no repository path in it. Two repositories
on one machine holding the same relative path, being `README.md` for example, are one id. The second
open finds `existing !== undefined` and only calls `activate(id)`, so the person is shown the other
repository's file with no sign that anything went wrong. The comment above that line explains why the
machine is in the id and does not notice that the repository is not.

### 9.3 Open any file needs no new script, and it needs a containment rule that does not exist

`review-file` reads any path relative to a root. Its text is `cd "$1"` then `git show "HEAD:$2"` and
`head -c "$3" "$2"`. **It has no containment at all, and I proved it this session.** Running the exact
script text with `../above.txt` as the second parameter returned the base64 of a file above the root:

```
$ sh -c '<REVIEW_FILE text>' tortie-review-file /tmp/r55-501/repo ../above.txt 1000000
__TORTIE_RUN__none c2VjcmV0IGFib3ZlIHJvb3QK__TORTIE_RUN__
```

`reviewFileOn` in `src/main/machines/remote-review.ts` passes `input.path` straight through, and the
handler for `machines:reviewFile` in `src/main/machines/ipc.ts` validates neither argument. Today the
path always comes from a `review-list` answer, so nothing exploits it. The moment "open any file"
ships, the renderer chooses the path.

**Ruling. Containment goes inside the script text, and a new conformance condition asserts it.** A
line such as `case "$2" in /*|*..*) exit 1;; esac` is constant text, is checkable by reading the file,
and cannot be removed without the gate failing. A guard in main would be a second copy of a rule the
far side has to enforce anyway.

### 9.4 The save

**Do not build it in this round, and not as a plain save at any time.**

| Fact | Number | Where |
| --- | --- | --- |
| Composed command cap | 131,072 bytes | `REMOTE_SCRIPT_MAX_BYTES` in `remote-scripts.ts`, checked in step 6 of `runRemoteScript` |
| Largest source file that fits, base64 in argv | 97,593 bytes | investigator 4's arithmetic, which I checked. `SAFE_ARG` in `src/main/restore/command.ts` accepts the whole base64 alphabet, so the payload costs no quoting |
| Tracked files over that cap | 53 of 1,452, being 3.6 percent | measured. Under `src/` it is 2 of 1,189 and under `docs/` it is 46 of 158 |
| Read cap for comparison | 2,097,152 bytes, riding stdout under a 67,108,864 byte buffer | `MAX_BUFFER_BYTES` in `src/main/machines/exec-plane.ts` |
| Writers the gate permits | exactly 1, named `image-put` | condition 35 |
| What forecloses stdin | `execRemoteShell` in `exec-plane.ts` is a promisified `execFile` | there is no stdin path anywhere under `src/main/machines` |

The 21 times asymmetry between reads and writes is purely an artifact of `execFile` having no stdin.
Investigator 5 attributed the cap to `REMOTE_IMAGE_MAX_BYTES`, which is 90,000 and lives in
`src/shared/ipc/machines.ts`. That constant governs images and nothing else, so investigator 5's cap
is the wrong constant.

If a save is ever built it must be a compare and swap carrying the checksum of the bytes Tortie read,
because step 8 of `runRemoteScript` discards the answer when the connection generation moved. Tortie
therefore cannot tell a landed write from a lost one, and a plain save would overwrite an agent's work
on the far machine with no way to know it had. That is the reason, and it is stronger than the size
cap.

---

## 10. Question 7. Whether the no install rule survives

**It survives, and the honest re-examination makes the answer stronger rather than weaker.**

Research 51 section 5 rejected a Tortie Host "for now" on a residency contradiction, being that a Host
would have to do something useful while the Mac is away. Investigator 5 correctly observed that this
argument does not decide the present question, because a project folder asks nothing of a machine
while the Mac is away. So the Host has to be priced against this feature on its own terms.

**What a Host would buy, measured.**

| Capability | What the thin design gives | What a Host would give |
| --- | --- | --- |
| Directory listing | one call, 30.8 ms for 41 entries and 65.5 ms for a whole repository | a few milliseconds less. The round trip dominates and a Host still pays it |
| Change notification | a poll, 65.5 ms per pass, no event feed | a real FSEvents feed. **This is the one genuine win** |
| Content search | refused | ripgrep on the far side. **This is the second genuine win** |
| Open a file | already works through `review-file` | the same |
| Save a file | one new script with a checksum guard, capped at 97,593 bytes | unbounded and streamed |
| Git reads | already works through `review-list` | the same |
| Git writes | refused | possible, and the reason to refuse them is not transport |

**What a Host would cost, counted this session.**

| Cost | Count |
| --- | --- |
| Lines in the eight `src/main` domains that answer a project's questions today | 13,378 lines in 55 files, being git 3,272, symbols 2,347, fs 1,824, quickopen 1,531, projects 1,453, search 1,323, preview 1,143 and watcher 485 |
| Of those files, importing from `electron` | 10, so they cannot be lifted into a headless process unchanged |
| Native modules and shipped binaries per platform | `@parcel/watcher` plus ripgrep plus the bundled tmux |
| Release targets today | 1, being darwin arm64, per `electron-builder.yml` |
| Release targets a Host needs | at least 3, being darwin arm64, linux x64 and linux arm64 |
| Update mechanisms for a Host | 0. The Mac app has `autoUpdater.setFeedURL` and a Host has nothing |
| Version drift risk, measured | 44 commits changed the `version` field in `package.json` since the repository's first commit, and inside one repository where both files ride the same commit stream `CHANGELOG.md` is 10 versions behind at 0.31.0 against 0.41.0 |

The last row is the deciding one. A Host is a second program that has to agree with the Mac app about
a wire format, and this project cannot keep two files in one repository in agreement across 44
version bumps. Two programs on two machines with two release channels is a harder problem than the one
it already loses.

**The two losses are real and the document should say so plainly.** A remote folder has no change
feed and no content search, and no frozen script can be either of those things. Both are stated on
screen rather than papered over.

---

## 11. The "Files live on <machine>" label. The ruling the backlog asks for

The backlog asks whether this label is a phase worth queueing now or a stopgap for a design about to
replace it. **It is neither. It is a permanent part of the design, and it ships inside the phase that
adds the refusal rather than as a phase of its own.**

The evidence for each half of that ruling.

| Claim | Evidence |
| --- | --- |
| It was specified twice and written never | the string "Files live on" appears 0 times in `src/`. It appears in `docs/BACKLOG.md`, `docs/research/51-remote-machines.md` and `docs/research/54-remote-parity.md` |
| The four surfaces have no machine awareness at all | `MachineBadge` renders at 6 sites in 4 files, being `SessionDock.tsx`, `SessionStrip.tsx`, `SessionRail.tsx` and `TerminalRegion.tsx`, and every one is a session surface. The word "machine" appears 3 times in `src/renderer/scm`, all unrelated prose, 0 times in `src/renderer/search`, 1 time in `src/renderer/quickopen`, and 6 times in `src/renderer/tree`, all unrelated prose |
| It is not a stopgap | after a project carries a machine, the Explorer still needs to say which machine, and search, Quick Open and symbols still refuse. A refusal with no reason on it is worse than the label |
| It must not ship alone | on its own it discloses a destructive write instead of stopping it. `discard` deletes untracked files with `rm` and `force` and `recursive`, and `discardCopy` in `src/renderer/scm/selection.ts` names a base filename that both machines can hold |
| It is cheap where it goes | the four conversion sites in Section 4.1 are where the machine is already known |

**So the ruling in one sentence. The label ships in the same commit as the check that makes the git
sidebar, search and Quick Open refuse a remote project, it is written once in `machine-copy.ts` beside
the sentences already there, and it stays in the product afterwards.**

---

## 12. Two defects that are not blocked on any of the above

Both are present in this tree, both cost a few lines, and both are cases of Tortie asserting something
that is not true. Neither needs the project model, the new script or any decision in this document.

### 12.1 The editable review tab with the silent save

Covered in Section 9.1 with all six pieces of evidence. Four one line changes plus the tab id fix in
Section 9.2.

### 12.2 A remote create sends this Mac's path to the other computer

`CreateSessionModal.tsx` deliberately leaves the Directory field empty when a machine is chosen, and
its own comment says so: "PHASE 70: not while a machine is chosen. The empty field is deliberate
there, and this would refill it with a path that exists on this Mac and means nothing on the other
machine." The submit then omits `cwd` entirely, at `...(cwd.trim().length > 0 ? { cwd: cwd.trim() } : {})`.

Main fills it back in. `createSession` in `src/main/sessions/core.ts` calls `remoteCreate` with
`cwd: input.cwd ?? input.projectPath`, and `input.projectPath` is this Mac's path. That value then

1. becomes the `-c` argument of the far machine's `tmux new-session`, in `remoteCreateArgs`, so the
   create fails with `REMOTE_DIR_MISSING` when the path is not there,
2. is written into the durable manifest row by `writeRemoteRow`, whose own comment claims "every path
   in the row belongs to that machine",
3. is stamped on the far machine's tmux server as `@gmux-project`, which `REMOTE_STAMPS` lists and
   `REMOTE_LIST_FORMAT` reads back.

Phase 84 item 5 already queues the create side fix, being a folder existence check before the create
and sending no `-c` at all for an empty field. **The stamp is the part nobody has queued.** Changing
it is not free, because `remote-restore.ts` reads `@gmux-project` back off the far server and
re-stamps from it, and `pane-env-rescue.ts` writes it again. After a change, one durable option on a
live server holds the local path for old sessions and the remote path for new ones, with no version
on the stamp. CLAUDE.md names the `@gmux-*` session options as identifiers live data is bound to, so
this needs a deliberate decision rather than a quiet edit.

### 12.3 The corrected version of investigator 1's third finding

Investigator 1 reported that every remote session is marked with the worktree chip because
`isOutsideProject` compares `cwd` against `projectPath`. **That is backwards and I checked it.** The
default remote create sets `cwd` to `input.projectPath`, so the two strings are the same value by
construction and `isOutsideProject` in `src/renderer/app/session-actions.tsx` returns false. The chip
appears only when the person typed a different remote directory, which is the one case where a chip
naming a different folder is correct. Suppressing the chip for any session with a machine would remove
a true signal. **The real defect in that area is 12.2, which investigator 1 observed and did not
connect to its own finding.**

---

## 13. Where the investigators were refuted, and what I checked myself

The instruction was to take the adversary unless I could check the tree and show otherwise. Here is
every place that mattered, with what I did.

| # | Claim | Who said what | My check and ruling |
| --- | --- | --- | --- |
| 1 | Condition 35 is the parameter condition | i2 said yes, adversary 1 said no | Read `build/conformance-machines.mjs`. 35 is the catalogue shape, 36 is the parameter walk. **Adversary.** i2's variadic script also fails step 3 of `runRemoteScript`, which neither found |
| 2 | A variadic script passes the gate | i2 said yes | `positionalsOf` in `build/machines-conformance-probe.mts` reads `$1` to `$9` only, and condition 37 skips the hostile check for a zero parameter script. **Adversary, and the design is replaced by the subtree call in Section 5.1** |
| 3 | Fan out breaks past 24 | i2, measured on loopback | Measured on mac-pro. 0 failures at 24, 3 of 150 at 50. It degrades rather than breaks. **Neither, and Section 3.4 replaces both** |
| 4 | `normalizeRepoPath` is where the machine refusal goes | i3 said yes, both adversaries said no | Read the function. It takes a bare string, is not exported, and `actions/repo.ts` and `projects/index.ts` reach git without it. **Adversaries, and Section 7.2 puts the check somewhere else** |
| 5 | The `projects` table must be rebuilt | i1 said yes, adversary 2 said a new table is the precedent | Read migration `007-restore-attempts`. It is `CREATE TABLE IF NOT EXISTS`. **Adversary, and Section 4.2 rules for a new table** |
| 6 | Two `localStorage` records collide | i1 said two, adversary 1 said four, adversary 2 said five | Counted them. **Twelve records carry a path, of which eight are keyed by a project or repository path.** Everybody undercounted |
| 7 | Every remote session shows the worktree chip | i1 said yes, adversary 1 said no | Read `createSession` and `CreateSessionModal`. **Adversary. Section 12.3** |
| 8 | The save cap is `REMOTE_IMAGE_MAX_BYTES` | i5 said yes, adversary 1 said no | Read `src/shared/ipc/machines.ts`. It is the image contract's own limit. **Adversary. The real cap is 97,593 bytes** |
| 9 | 175 channels, `git:*` 28, `machines:*` 19 | i5 and i3 | Counted. 161 invoke channels, 27 git invoke, 17 machines invoke. 175 counts events too. **Adversaries** |
| 10 | `git grep` and `git ls-files` are affordable | i5 said yes | Read condition 38 and `ALLOWED_GIT_VERBS`. Both verbs fail. **Adversary. Section 8** |
| 11 | The gate has 46 conditions | i5 | The header enumerates 1 to 45. **Adversary** |
| 12 | Discard is "a delete on the wrong computer's copy" | i3 | Read `discard`. It deletes only paths in this repository's own status. **Adversary. Section 7.3 corrects the sentence and keeps the ruling** |
| 13 | The eighth script is new | i2 | `docs/BACKLOG.md` Phase 84 item 6 already queues `machines:listDir` as the eighth. **Adversary 2, and Section 5.3 merges them** |
| 14 | `review-file` has no containment | i4 | Ran the exact script text with `../above.txt` and got the file. **Confirmed, and Section 9.3 rules on it** |
| 15 | The latency number cannot be taken | the charter, i1 through i5, both adversaries | `ssh` signed in on the first attempt. **All eight were wrong, and Section 1 says so** |

Counts I reproduced exactly and which therefore stand: 326 non test renderer files, 41 and 85 under
the two project path definitions, 56 main files, 161 invoke channels, 27 git channels of which 16
write, 17 machines channels, 14 migrations with `MANIFEST_SCHEMA_VERSION` 14 and
`MANIFEST_MIN_COMPATIBLE_VERSION` 13, `projects.path TEXT NOT NULL UNIQUE`, 11 mutating programs, 3
allowed git verbs, 7 scripts of which 1 writes, `REMOTE_SCRIPT_MAX_BYTES` 131,072,
`REMOTE_RUN_TIMEOUT_MS` 15,000, `REMOTE_REVIEW_MAX_FILES` 30, `SSH_CONTROL_PERSIST_SECONDS` 60,
`REPO_CHANGED_DEBOUNCE_MS` 150, the 500 cap in `saveExpanded`, 6 `MachineBadge` render sites in 4
files, 5 consumers of `resolveInsideRoot`, 4 consumers of `rgBinaryPath`, and 1,452 tracked files in
this repository.

---

## 14. The options, with the deciding reason on every row

### 14.1 The shape of the whole feature

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| A frozen subtree listing script on the existing door | **BUILD** | Every read a project folder needs is one command the far machine's own programs answer. One call carries a whole 1,695 entry repository in 65.5 ms. It passes conditions 35 to 38 with no amendment |
| A variadic listing script carrying many roots | reject | The gate reads `$1` to `$9` only, the zero parameter workaround switches condition 37 off, and it measured slower than the subtree call, being 55.5 ms against 42.3 ms |
| One call per folder, as the Explorer does locally | reject | Nine folders in series cost 409.7 ms against 55.5 ms batched. At 500 persisted directories it is minutes |
| A Tortie Host on the far machine | reject | It buys an event feed and a search. It costs 13,378 lines across 8 domains, 10 of whose files import electron, 3 release targets against 1 today, and 0 update mechanisms. This project is already 10 versions out of agreement between two files in one repository |
| A different transport, such as sftp or a long lived channel | reject | `execRemoteShell` is a promisified `execFile` with a 15,000 ms timeout and `SIGKILL`. There is no long lived shape on this door, and no scp, rsync or sftp appears anywhere in `src/` or `build/`. A resident poller is a new carriage, not a design choice inside the existing one |
| Do nothing, and keep the label only | reject | The label alone discloses a destructive write instead of stopping it |

### 14.2 The project model

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| New table `remote_projects`, `UNIQUE(machine_id, path)` | **BUILD** | Additive, precedent `007-restore-attempts`, `MANIFEST_MIN_COMPATIBLE_VERSION` stays 13, and an older build after a downgrade shows local projects only, which is true |
| Rebuild `projects` to drop `UNIQUE(path)` | reject | The first table rebuild this manifest would ever do, and `ON CONFLICT(path)` in `upsertProject` fails without the unique index, so the minimum must move 13 to 15 |
| Add `machine_id` and keep `UNIQUE(path)` | reject | The operator cannot open `/Users/gdc/gmux` here and on mac-pro at the same time, which is his own case |
| Namespace the path string, such as `mac-pro:/Users/...` | reject | `write` in `src/renderer/state/layout.ts` refuses any key not starting with `/`, and 41 renderer files read the path as a filesystem path |

### 14.3 Per surface

| Surface | Verdict | Deciding reason |
| --- | --- | --- |
| Explorer | crosses, on the new script, polled | One call carries a whole repository in 65.5 ms. There is no change feed and it is polled and labelled |
| Open a file | crosses, on `review-file` | The script already reads any path relative to a root. It needs a containment line first |
| Copy Relative Path | crosses | A relative path is true on both machines |
| Copy Path | crosses with the machine named | The bare string names a file on another computer |
| Git sidebar, Changes group | crosses, read only, on `review-list` | 57 ms measured, and the parser is already shared |
| Git sidebar, everything else | refuse | 16 of 27 channels write, and no write is idempotent |
| Search | refuse | ripgrep is not on mac-pro, shipping it is 47 sends against a one write catalogue, and `git grep` fails condition 38 |
| Quick Open | refuse | The only correct file list needs `git ls-files`, which fails condition 38. A `find` list disagrees with `.gitignore` |
| Symbols | refuse | 1,452 files at a 35.9 ms floor is 52 seconds of round trips before any parsing |
| Save a file | refuse in this round | It needs a second write script, a compare and swap, and two conformance conditions. Step 8 cannot tell a landed write from a lost one |
| New File, New Folder, Rename, Duplicate | refuse in this round | Each needs a write script and a containment property nobody has written |
| Move to Trash | refuse permanently | `shell.trashItem` has no far side equal, and a remote `rm` downgrades a recoverable delete into an unrecoverable one |
| Open With, Reveal in Finder | refuse permanently | Both launch a program on this Mac |

---

## 15. What is not true and what nobody checked

Every item here is something this document does not know. Each row names the probe that would close it.

| # | Not measured | Consequence | What would close it |
| --- | --- | --- | --- |
| 1 | Any number over a wide area link | `tailscale ping` reports a direct path via `192.168.1.47`, so every number is a same building number. A Mac Pro reached from elsewhere is unmeasured | Run `docs/research/assets/55-probe-real-machine.mjs` from outside the house |
| 2 | Anything through Tortie's own ssh options as the app composes them | My harness copies the nine options from `sshOptions` by hand. It does not name Tortie's key file, because `IdentityFile` appears 0 times under `src/main/machines`. So a connection is possible, not Tortie's connection | Phase 84 item 7, then `npm run probe:realmachine` |
| 3 | `npm run conformance:machines` | This worktree has no `node_modules` and the gate fails to load electron. Every claim about conditions 35 to 40 comes from reading `build/conformance-machines.mjs` and `build/machines-conformance-probe.mts` | Run it in a checkout with dependencies installed |
| 4 | Anything on Linux | The 131,072 that produces every size cap is a documented kernel constant nobody in this round has tested. BSD `stat -f` and GNU `stat -c` differ and only BSD was exercised | One Linux machine on the tailnet, then the same two harnesses |
| 5 | The app driven with a remote project | Nobody confirmed by screenshot that a person can type into a review tab, although I read every line of the path and it is open | Drive the app with a machine configured and open a review tab |
| 6 | A large remote repository | The largest thing measured is `.oh-my-zsh` at 1,695 entries, 112,574 bytes and 65.5 ms. This repository is 1,452 tracked files and it is not on mac-pro | Clone one repository over there and re-run the depth 9 row |
| 7 | `git status` on a repository with many changes | Both `review-list` measurements were on nearly clean repositories, at 106 and 226 answer bytes | Measure against a working tree with 200 changed files |
| 8 | The size of the shipped ripgrep | 4,528,512 bytes is quoted from the header of `src/main/search/resolve.ts` and was not weighed | `ls -l` in a checkout with dependencies installed |
| 9 | Whether closing the ssh channel kills the far command | Unknown, and it decides what a timed out listing leaves behind | Start a long `find` and drop the connection |
| 10 | Whether `MaxSessions` is 10 on any other machine | mac-pro's `/etc/ssh/sshd_config` has it commented out, so the default applies there. No other machine was read | Read the file on each machine the operator adds |
| 11 | The four conversion sites are the only ones | I found four by grep. A fifth that converts a project into a path some other way would escape the refusal in Section 7.2 | A conformance condition that fails when a project's `path` is read outside a named list of modules |

### Where this document's claims come from

This document integrates five investigator reports and two adversarial reviews, and it rules. Every
claim about this tree was checked with a file path and a symbol name against the worktree at
`7a665d7`, whose tree is the one commit `069ef77` carries. Every number about a machine was measured
this session. Where an adversary refuted an investigator I checked the tree myself before deciding,
and Section 13 records each of those decisions. The commit that banks this document sits on
`f6cd1ad`, which landed after the checking and changed 30 files. Of the symbols this document names,
the one that moved is in `src/renderer/state/layout.ts`, and `LS_LAYOUTS`, `migrateLegacyLayouts` and
the `startsWith('/')` guard all survive that change unaltered.

Two process notes belong here rather than in a footnote. I ran no git command that writes, and I wrote
only inside `docs/research/`. On the far machine I ran only `find`, `stat`, `git rev-parse`, `git
status`, `git show`, `head`, `wc`, `ls`, `uname`, `sysctl`, `grep` and `true`. I started no tmux
server there, opened no manifest, and wrote no file.
