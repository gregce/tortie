# Research 55, investigator 2. What the Explorer and the file operations become

Measured 2026-08-18 against the tree at `/private/tmp/.../wt-r55`, which is the working copy of
this repository. Every path and symbol below was read this session. Every number below was
produced this session unless it is in section 9, which is the list of things nobody measured.

---

## 0. The answer

**A directory listing crosses as a script, and it is the eighth and last script the Explorer
needs. It is not the seven scripts' shape.** The seven scripts in
`src/main/machines/remote-scripts.ts` each answer about one thing. A listing must answer about
many directories in one call, because the Explorer's fan-out is what breaks first, not the
bytes and not the latency.

**A different transport is not needed and should not be built.** One call carrying 120
directories cost 59.0 ms of far-side work and 14,196 bytes of command against the 131,072 byte
cap in `REMOTE_SCRIPT_MAX_BYTES`. The `MAX_BUFFER_BYTES` constant in
`src/main/machines/exec-plane.ts` is 64 MB, and the largest answer measured here was 900,193
bytes. The frozen script door carries this feature with room left over.

**Most of the file operations must refuse.** Of the 11 items the tree's context menu builds in
`src/renderer/tree/tree-menu.ts`, 4 must refuse outright, 2 can cross only after somebody
writes a safety property that does not exist yet, 3 can cross as read scripts, and 2 change
meaning rather than refusing. The single line that decides most of it is in
`src/main/fs/file-ops.ts`, being **delete means trash**, and `shell.trashItem` has no far-side
equal.

**The thing the thin design genuinely cannot do is notice a change.**
`src/main/watcher/repo-watcher.ts` is built on `@parcel/watcher`, which watches a local
directory through FSEvents. A folder on another machine has no change feed at all. That is the
one honest gap, and it is a polling decision rather than a transport decision.

---

## 1. What is there today, counted

| Thing | Count | Where |
| --- | --- | --- |
| Scripts Tortie may run on another machine | 7 | `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` |
| Of those, scripts that write | 1 | `remoteWriteScripts()`, and `build/conformance-machines.mjs` check 35 to 40 fails unless the answer is exactly `image-put` |
| `fs:*` IPC channels | 13 | `registerFsIpc` in `src/main/fs/ipc.ts` plus `registerImageIpc` in `src/main/fs/image-ipc.ts` |
| File-operation verbs in main | 6 | `FileOpsService` in `src/main/fs/file-ops.ts`, being createFile, createFolder, rename, duplicate, move, trash |
| Items the tree's context menu can build | 11 | `buildTreeMenu` in `src/renderer/tree/tree-menu.ts` |
| Programs a read script may never name | 11 | `MUTATING_PROGRAMS` in `build/conformance-machines.mjs` |

The seven scripts, read from the file this session.

| id | mode | params |
| --- | --- | --- |
| machine-facts | read | 0 |
| store-list | read | 3 |
| store-head | read | 2 |
| store-copy | read | 2 |
| image-put | **write** | 2 |
| review-list | read | 1 |
| review-file | read | 3 |

---

## 2. What one remote call costs, measured

### 2.1 The method

I could not measure end to end against mac-pro. This Mac holds no key mac-pro trusts, which
`docs/BACKLOG.md` already records for Phase 83 and which I confirmed this session. The exact
refusal was `gdc@100.113.101.95: Permission denied (publickey,password,keyboard-interactive)`.

So the cost is measured in two halves that add.

1. The **fixed cost and the round trip count** come from a loopback sshd started by
   `scratchYard` and `scratchMachine` in `build/scratch-machine.mjs`, with a separate relay
   process in between that delays every byte by a chosen amount in each direction. The relay
   runs in its own process because `spawnSync` blocks Node's event loop, and an in-process
   relay never serves.
2. The **network round trip time** comes from mac-pro itself, over the tailnet, with ICMP.

### 2.2 The round trip count, measured by slope

The ssh options are the product's own, being `ControlMaster=auto`, `ControlPersist`,
`BatchMode=yes` and `StrictHostKeyChecking=yes`, composed by `sshOptions` in
`src/main/machines/ssh.ts`. Each row is the median of 9 runs of `ssh ... true`.

| Injected round trip | Cold call, opening the ControlMaster | Warm call, reusing it |
| --- | --- | --- |
| 0 ms | 59.6 ms | 7.8 ms |
| 20 ms | 221.3 ms | 54.2 ms |
| 50 ms | 463.8 ms | 117.4 ms |
| 100 ms | 858.5 ms | 219.6 ms |

Least squares over those four points gives two straight lines.

```
   warm call  =  2.11 x RTT  +  10.2 ms
   cold call  =  7.99 x RTT  +  61.2 ms
```

So one remote script call over a warm connection costs a little over two network round trips.
A call that has to open the connection first costs eight. `SSH_CONTROL_PERSIST_SECONDS` in
`src/main/machines/ssh.ts` is 60, so a person who leaves the Explorer alone for a minute pays
the cold price on the next click.

### 2.3 The tailnet, measured against mac-pro

`tailscale status` lists `gregs-mac-pro` at `100.113.101.95`. `tailscale ping` answered
`pong from gregs-mac-pro (100.113.101.95) via 192.168.1.47:41641 in 8ms`, so the path is
direct rather than relayed. 60 ICMP packets at 0.3 s spacing gave this.

| min | p50 | p90 | p99 | max |
| --- | --- | --- | --- | --- |
| 5.96 ms | 9.26 ms | 105.82 ms | 192.45 ms | 198.04 ms |

**The tail is the number that matters, and it is 11 times the median.** A design priced at
9.26 ms is priced for one call in two. Three TCP connections to port 22 took 15.4 ms, 9.8 ms
and 8.8 ms, which agrees with the median rather than the tail.

Putting the two halves together, one warm remote call costs 29.7 ms at the median round trip
and 233.5 ms at the ninetieth percentile, before the far side does any work.

---

## 3. What a directory listing costs

### 3.1 One directory, measured on loopback

Two candidate script texts, each run 9 times against three real directories I built with 50,
500 and 5000 files. Shape A is `find -maxdepth 1` with one `stat` exec, which is the shape
`STORE_LIST` in `remote-scripts.ts` already uses. Shape B is a shell loop that prints one
letter and the name.

| Entries | Shape A time | Shape A answer | Shape B time | Shape B answer |
| --- | --- | --- | --- | --- |
| 50 | 13.8 ms | 9,053 bytes | 11.5 ms | 1,429 bytes |
| 500 | 18.9 ms | 89,521 bytes | 19.9 ms | 14,029 bytes |
| 5000 | 63.2 ms | 900,193 bytes | 91.4 ms | 140,029 bytes |

Warm `ssh true` in the same harnesses measured 6.6 ms and 7.8 ms, so the far side's own work is
the number in the table minus about 7 ms.

**Shape A wins on time and shape B wins on bytes.** Shape B is 6.4 times smaller because it
prints no modification time, no size and no directory prefix. Shape B is 45 percent slower at
5000 entries because a shell loop runs one iteration per entry while `find` runs one process.
The renderer needs only what `FsDirEntry` in `src/shared/types.ts` holds, being a name, a path
and a kind, so shape B carries everything `prepare` in `src/renderer/tree/store.ts` reads.
Nothing in the tree reads a size or a modification time.

### 3.2 The same three directories, read locally

`readdir` with `withFileTypes`, median of 20 runs, for comparison.

| Entries | Local read | Local result as JSON |
| --- | --- | --- |
| 50 | 0.05 ms | 8,773 bytes |
| 500 | 0.31 ms | 87,124 bytes |
| 5000 | 2.30 ms | 875,125 bytes |

**A remote listing of 50 entries costs 730 times what the local one costs.** That ratio, not
the absolute time, is what makes the Explorer's current refresh behaviour wrong on a remote
folder. Section 5 says why.

### 3.3 One folder expansion, priced on the operator's tailnet

Warm call overhead from section 2.2, plus the far-side work from section 3.1 shape A.

| Entries | At p50 round trip, 9.26 ms | At p90 round trip, 105.82 ms |
| --- | --- | --- |
| 50 | 36.5 ms | 240.3 ms |
| 500 | 41.6 ms | 245.4 ms |
| 5000 | 85.9 ms | 289.7 ms |

The bytes are not in these numbers. Transfer time is in section 9, because I could not measure
throughput to mac-pro without an account on it.

**A folder open costs 36 ms half the time and 240 ms one time in ten.** The charter asked
whether the answer was nearer 40 ms or nearer 400 ms. It is 40 ms at the median and it is 240
ms in the tail, so the design has to be built for the tail.

---

## 4. The fan-out is what breaks, and it breaks at 30

This is the measurement that decides the shape of the eighth script.

`execRemoteShell` in `src/main/machines/exec-plane.ts` runs one `ssh` process per call. There is
no batching anywhere in `runRemoteScript` in `src/main/machines/remote-run.ts`, and its own
header says so, being "It does not retry. It does not cache."

So I ran N calls at once through one ControlMaster against the loopback machine, whose sshd
carries the stock settings that `scratchMachine` writes.

| N at once | Wall clock | Failures |
| --- | --- | --- |
| 5 | 10 ms | 0 |
| 10 | 12 ms | 0 |
| 12 | 47 ms | 0 |
| 16 | 99 ms | 0 |
| 20 | 108 ms | 0 |
| 24 | 92 ms | 0 |
| 30 | 109 ms | **3** |
| 40 | 129 ms | **2** |
| 50 | 156 ms | **10** and **16** in two runs |
| 100 | 233 ms | **35** |

Every failure carried the same first line.

```
mux_client_request_session: session request failed: Session open refused by peer
```

That is OpenSSH's `MaxSessions`, whose default is 10. When the multiplexed channel is refused,
the client opens a fresh TCP connection instead, and those run into `MaxStartups`, whose
default is `10:30:100` and which drops a share of new connections at random.

**I proved the cause rather than inferring it.** I wrote `MaxSessions 400` and
`MaxStartups 400` into the far side's configuration and ran the same harness again.

| N at once, caps raised to 400 | Wall clock | Failures |
| --- | --- | --- |
| 50 | 50 ms | 0 |
| 100 | 94 ms | 0 |

**Tortie installs nothing on the far machine, so it cannot raise those caps.** The safe
unbatched fan-out on a machine nobody configured is 24 calls at once, measured, and the first
failures appear at 30.

---

## 5. The Explorer's current refresh behaviour is wrong on a remote folder

Three facts from this tree, and together they are the problem.

1. `refreshLoaded` in `src/renderer/tree/store.ts` re-lists **every** cached directory, with
   `Promise.all` and no limit on how many run at once.
2. It is called from `FilesSection.tsx` on every debounced `git:changed`, and the debounce is
   `REPO_CHANGED_DEBOUNCE_MS` in `src/renderer/state/repo-changed.ts`, which is 150.
3. `saveExpanded` in `src/renderer/tree/FileTree.tsx` persists up to 500 expanded directories,
   and an effect in the same file calls `loadDir` once per persisted directory when the root
   listing finishes.

For a local folder this is correct and cheap, because section 3.2 measured one listing at 0.05
ms to 2.30 ms. For a folder on another machine it means up to 500 ssh processes fired together,
against a far side that refused 3 of 30. On a repository several agents are writing, the 150 ms
window means it can happen roughly seven times a second.

Project open, priced unbatched with a ceiling of 24 calls at once.

| Expanded directories restored | Waves | At p50 round trip | At p90 round trip |
| --- | --- | --- | --- |
| 10 | 1 | 36 ms | 240 ms |
| 50 | 3 | 110 ms | 0.72 s |
| 500, the persisted cap | 21 | 0.77 s | 5.0 s |

---

## 6. So the listing is a script, and here is its shape

### 6.1 Batched, measured

One script text, one `find` invocation, many roots, depth 1. Median of 5 runs on loopback.

| Directories in one call | Time | Answer bytes | Command bytes |
| --- | --- | --- | --- |
| 10 | 32.6 ms | 38,621 | 1,367 |
| 40 | 51.6 ms | 123,629 | 4,787 |
| 100 | 62.3 ms | 225,137 | 11,717 |
| 120 | 59.0 ms | 258,889 | 14,196 |

The command grows by about 117 bytes per directory. `REMOTE_SCRIPT_MAX_BYTES` is 131,072, so
about 1,120 directories fit in one command, which is more than twice the 500 the tree persists.

I also measured a batched script that loops in the shell and runs one `find` per directory, and
it was worse. It cost 43.5 ms at 10 directories, 136.1 ms at 40 and 312.2 ms at 100. On loopback
that is slower than the same directories fetched as separate parallel calls, which cost 27 ms,
97 ms and 233 ms. **One `find` with many roots is the shape. A loop is not.**

Over the tailnet the comparison inverts, because separate calls each pay 2.11 round trips and
are capped at 24 at once, while the batched call pays 2.11 round trips once.

| 120 directories | At p50 round trip | At p90 round trip |
| --- | --- | --- |
| One batched call | 82 ms | 286 ms |
| 120 separate calls, 5 waves of 24 | 0.18 s | 1.2 s |

### 6.2 The three ways the eighth script differs from the seven

| # | What has to change | Why, with the symbol |
| --- | --- | --- |
| 1 | The parameter count stops being fixed | `runRemoteScript` in `remote-run.ts` throws when `args.length !== script.params`. `RemoteScript.params` is one number. A listing takes a variable number of roots |
| 2 | One answer has to frame many roots | `parseRemoteScriptAnswer` reads one payload between one marker pair. A listing needs a separator per root inside that payload |
| 3 | A newline in a directory name has to be handled rather than dropped | `STORE_LIST`'s own comment accepts dropping such a line, because no agent store writes such a name. A person's project folder is not an agent store, and a row that is silently missing from the Explorer tells the person the folder holds less than it does |

Point 3 has a clean fix that costs nothing, being to encode each name on its own with base64 and
join with a space, the way `REVIEW_LIST` already returns two base64 words. Then no byte in a
name can be a separator.

### 6.3 What passes the gate as written, and what does not

`build/conformance-machines.mjs` reads the script texts. A `dir-list` script that names `find`,
`stat`, `base64` and `tr` names none of the 11 programs in `MUTATING_PROGRAMS`, uses `2>/dev/null`
as its only redirection, and carries `mode: 'read'`. It passes the existing gate unchanged.

Rules 1 and 2 in the section 6.2 table need the gate's condition 35 to learn about a variadic
parameter count. That is an amendment to a gate, not a hole in one.

### 6.4 The ruling

> **Add exactly one read script, `dir-list`, that takes many roots and answers with one framed
> block per root. Do not add a per-directory script. Do not add a transport.**

And a second ruling that is about the renderer rather than the wire.

> **`refreshLoaded` must stop being the remote refresh path.** On a remote project the Explorer
> refreshes with one batched call, on a timer the person can see, and never on a 150 ms
> debounce. Section 7 says what the timer replaces.

---

## 7. What the Explorer loses, and it is the watcher

`src/main/watcher/repo-watcher.ts` imports `@parcel/watcher` and subscribes to a local
directory. Its `DEFAULT_DEBOUNCE_MS` is 300. `src/main/watcher/bus.ts` fans that one
subscription out to git and to quick open.

**None of that can reach a folder on another machine, and nothing in the frozen script design
can replace it.** A watcher is a process that stays running on the machine holding the files and reports each
change. The only ways to have one are to install something, which research 51 section 5
rejected, or to poll.

Polling is affordable at the batched shape and unaffordable at the current one.

| Poll period | Cost per poll at 120 open directories, p50 | Share of wall clock spent listing |
| --- | --- | --- |
| 150 ms, today's debounce | 82 ms | 55 percent |
| 1 s | 82 ms | 8.2 percent |
| 2 s | 82 ms | 4.1 percent |
| 5 s | 82 ms | 1.6 percent |

At the p90 round trip the 150 ms row costs 286 ms per poll, which is more than the period, so
the polls would pile up. **A remote Explorer polls at 2 s or slower, and it says so on screen.**

There is a cheaper signal available and it is worth naming. `review-list` already runs
`git status --porcelain=v2` on the far machine, so a remote project that is a repository can
learn that something changed from one call rather than from a listing of every open folder. It
says that a tracked file changed. It says nothing about a file created outside the repository
or inside an ignored folder, so it is a hint rather than a watcher.

---

## 8. Which file operations could ever cross, and which must refuse

The deciding rules, quoted from the tree.

- `src/main/fs/file-ops.ts` header: "DELETE MEANS TRASH. Nothing here calls unlink or rm."
- `src/main/machines/remote-scripts.ts`, `IMAGE_PUT` property 1: "nothing a person typed and
  nothing a browser supplied reaches the far side's file system as a name."
- `build/conformance-machines.mjs` line 2342: the catalogue may hold exactly one write script,
  and it must be `image-put`.
- `src/main/fs/paths.ts`, `resolveInsideRoot`: every containment guard runs `realpath` on this
  Mac's disk.

| Verb | Symbol it runs today | Verdict | The deciding reason |
| --- | --- | --- | --- |
| Open, Open in New Tab | `fs:readFile`, `readTextCapped` in `src/main/fs/ipc.ts` | **Can cross** | `STORE_HEAD` and `REVIEW_FILE` already read a capped, base64 encoded far-side file. The 5 MB `READ_CAP_BYTES` becomes a wire budget as well as a memory one |
| Expand a folder | `fs:readDir` in `src/main/fs/ipc.ts` | **Can cross, batched** | Sections 3 to 6 |
| View an image | `fs:readImage`, `createImageReader` in `src/main/fs/image.ts` | **Can cross** | `STORE_COPY` already answers with size, checksum and capped bytes in one call |
| Save, being command S | `fs:writeFile`; refused today at `save` in `src/renderer/editor/tab-io.ts` by `tab.remote !== undefined` | **Can cross only with a new safety property** | `image-put` is safe to run twice **because** `remoteImageName` in `src/main/machines/remote-image.ts` is a checksum of the bytes and the script never opens a file that exists. A save overwrites a file that exists, so it inherits none of that. It needs a write to a temporary name, a rename, and a precondition naming the checksum the file had when it was opened |
| Rename | `fs:rename` in `src/main/fs/file-ops.ts` | **Could cross, and the guard has to move** | `resolveInsideRoot` proves containment with `realpath` on this Mac. Main cannot `realpath` a path on another computer, so the whole four-family refusal has to be rewritten inside the script text, where a gate can read it |
| Duplicate | `fs:duplicate`, `copyNameFor` in `src/main/fs/file-ops.ts` | **Could cross, and it needs a second write script** | It needs `cp`, which is one of the 11 in `MUTATING_PROGRAMS`, and the Finder copy naming loop has to run on the far side because only the far side knows which names are taken |
| Move | `fs:move` | **The plain case could cross. The overwrite branch must refuse** | A confirmed overwrite trashes the displaced entry before renaming, which is what makes it recoverable. Trash cannot cross, so a remote overwrite would be a plain destruction wearing the same words |
| New File, New Folder | `fs:createFile`, `fs:createFolder`, `createEntry` in `src/main/fs/file-ops.ts` | **Must refuse as the catalogue stands** | The name is typed by a person into the tree's inline rename row. `IMAGE_PUT` property 1 forbids exactly that. Either that rule is amended in writing with its own reason, or these two stay local |
| Move to Trash | `fs:trash`, `FileOpsDeps.trashItem` | **Must refuse** | `shell.trashItem` is macOS Finder. On Linux there is no equal, and on a far Mac it would be `mv` into `~/.Trash` with no Put Back record. The menu label in `tree-menu.ts` says where the file is going, and remotely it would not be true |
| Reveal in Finder | `fs:reveal`, `shell.showItemInFolder` | **Must refuse** | It opens Finder on this Mac. Given a remote path it reveals whatever this Mac happens to hold there, or nothing. This is the same defect research 54 finding 15 named for the sidebar |
| Open With | `fs:openWith`, `fs:openWithApps` in `src/main/fs/open-with.ts` | **Must refuse** | It launches an application bundle on this Mac against a local path |
| Copy Path, Copy Relative Path | `actions.copyPaths` in `tree-menu.ts` | **Changes meaning, does not refuse** | The path is real, it is just real somewhere else. It has to be copied as the far machine spells it, and the person has to be told which machine that is |
| Drag a row into a session pane | `beginTreeDrag` in `src/renderer/terminal/drop/tree-drag.ts`, and the drop lands through `src/renderer/terminal/drop/insert.ts` | **Half of it is already ruled on. The other half must refuse** | A dropped row is bracket-pasted into the pane as an absolute path. `src/renderer/terminal/drop/remote.ts` already refuses this for a local file dropped on a remote session, and carries only images, through `image-put`. The direction a remote project adds is the reverse one, being a row from a far machine's tree dropped on a local session, and it has to refuse for the same reason |

Counted, that is 4 refusals, 2 that need new safety work, 4 that can cross as reads, 1 that
changes meaning and 1 gesture that is half ruled on already.

**Tortie has ruled on this exact question once before, and the ruling supports the table.**
`src/renderer/terminal/drop/remote.ts` says it in its own header, being "A path only means
something on the machine it is a path on. So a drop on a remote session attaches IMAGES, whose
bytes Tortie carries to that machine, and refuses everything else, whose bytes it will not
carry." Its next paragraph says why a folder is refused, being that "uploading a tree is a
synchronise rather than an attach, which is a different product with a different set of promises
about what it overwrites." Every write verdict in the table above is that same sentence applied
to the Explorer.

**The honest summary of that table.** A remote project folder can be browsed, opened and read
with the design that already exists. It cannot be edited with it. Every write verb either
refuses, or needs a property nobody has written, or needs a second write script and an amendment
to a gate that currently names `image-put` by hand.

---

## 9. What I did not measure

| # | Not measured | What would measure it |
| --- | --- | --- |
| 1 | Anything end to end against mac-pro | An ssh key mac-pro trusts. The refusal this session was `Permission denied (publickey,password,keyboard-interactive)`, which is Phase 83's own blocker unchanged. `build/real-machine.mjs` is ready for it and refuses without `GMUX_REAL_MACHINE_HOST` and `GMUX_REAL_MACHINE_CONFIRM` |
| 2 | Throughput to mac-pro, so no transfer time is in any table | Sending a known payload over the tailnet and timing it. A 900 KB listing takes 36 ms on a 200 Mbit link and 0.36 s on a 20 Mbit one, and that difference decides whether shape A or shape B is right |
| 3 | Whether mac-pro's `MaxSessions` is the default 10 | One line from `sshd -T` on that machine, or the same concurrency harness pointed at it |
| 4 | Anything on Linux | A Linux machine. The GNU `stat -c` branch of `STORE_LIST`, the `base64 -d` spelling and `MAX_ARG_STRLEN` are all untested here, and `REMOTE_SCRIPT_MAX_BYTES`'s own comment says so |
| 5 | The listing shapes against a real project with many nested directories on a far machine | Points 1 and 3. My 120 directory list came from this repository and my 50, 500 and 5000 entry folders were built for the run |
| 6 | Whether Chromium's renderer stays responsive while 500 listings resolve | Driving the real app with a remote project, which needs point 1 |
| 7 | Any cost of the ignored store's calls, which the tree also fires as the listing grows | The `sync` action of `useTreeIgnored` in `src/renderer/tree/ignored.ts` reaches `git:checkIgnore`, declared in `src/shared/ipc/git.ts`. It is a second remote call family this document did not price |

---

## 10. What is not true

- **It is not true that the seven scripts already carry a listing.** `STORE_LIST` takes a fixed
  three parameters, filters by modification time, and returns absolute paths for one root. It
  answers a different question.
- **It is not true that the frozen script door is the bottleneck.** The bottleneck measured here
  is OpenSSH's per-connection session limit on a machine Tortie is not allowed to configure.
- **It is not true that a remote Explorer needs a Tortie Host.** Every number in sections 3 and 6
  fits inside the thin design. The Host argument, if it is made at all, has to be made about the
  watcher in section 7 and about the write verbs in section 8, not about listing a folder.
- **It is not true that the existing refresh behaviour survives the crossing.** `refreshLoaded`
  is correct for a 0.05 ms local call and wrong for a 36 ms remote one.
- **It is not true that a remote save is a small addition to `image-put`.** They share a door and
  nothing else. `image-put` is safe to run twice because it refuses to open a file that exists,
  and a save exists to open a file that exists.
