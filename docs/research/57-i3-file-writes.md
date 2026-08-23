# Research 57, investigator 3. The file writes on another machine

**Question.** Save, new file, new folder, rename, duplicate and trash, on a folder that
lives on another computer. One mechanism or several. Atomicity, the size limit, the
encoding, the permissions, what a half written file looks like, and what a dead link
leaves behind. Whether `image-put` is a model. Whether trash is built at all.

Everything below was read or run against this tree on 2026-08-19. Where a number came
from running something, the section says what was run. Where it came from reading a
constant, the section names the file and the symbol. Section 15 lists what was not
measured.

---

## Section 1. The ruling, first

| Operation | Verdict | Mechanism | New write script |
| --- | --- | --- | --- |
| Save an open file | **BUILD** | `file-put`, compare and swap on a sha256, temporary name then `mv` | `file-put` |
| New file | **BUILD** | the same `file-put`, with the word `new` in place of the expected checksum and an empty payload | none, it is `file-put` |
| New folder | **BUILD** | `dir-new`, one non recursive `mkdir` guarded by `-e` | `dir-new` |
| Rename, and the tree's move | **BUILD** | `entry-rename`, one `mv` guarded by `-e` on the destination | `entry-rename` |
| Duplicate | **DO NOT BUILD NOW** | if ever asked for, a file only, as a read followed by a `file-put`, and no new script at all | none |
| Trash | **DO NOT BUILD, EVER, AS A DELETE** | there is no far side equal of `shell.trashItem`, and the tree already records this refusal | none |

So the answer to "one mechanism or several" is both, and the split is the useful part.

- **One mechanism** for everything that decides whether a byte may leave this Mac. One
  door, being `runRemoteWrite` in `src/main/machines/remote-run.ts`. One catalogue, being
  `REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts`. One marker pair. One
  connected only check. One generation check. One containment line in the script text.
  One answer vocabulary. One local size refusal before anything is composed.
- **Three script texts**, because the product's own gate refuses a shared one. Condition
  38 of `build/conformance-machines.mjs` gives each write script its own redirection rule
  and fails a write script that has none. Its comment says why, being that two writes of
  different shapes cannot share one rule. A save redirects into a temporary name. A
  `mkdir` redirects nowhere. A `mv` redirects nowhere. Those are three shapes and the
  gate is built to hold three rules.

The number of write scripts in the catalogue goes from 2 to 5, and it goes there in two steps, being 3 after the save phase and 5 after the Explorer phase. That number is what the
gate's own failure text calls "the number that bounds what Tortie can do to another
person's computer", so this document states the move plainly rather than letting a phase
brief do it quietly.

---

## Section 2. What exists today, counted rather than described

Run this session against `src/main/machines/remote-scripts.ts` by importing the module.

| Script id | Mode | Params | Script text bytes |
| --- | --- | --- | --- |
| `machine-facts` | read | 0 | 224 |
| `store-list` | read | 3 | 359 |
| `store-head` | read | 2 | 152 |
| `store-copy` | read | 2 | 425 |
| `image-put` | **write** | 2 | 592 |
| `review-list` | read | 1 | 328 |
| `review-file` | read | 3 | 304 |
| `dir-list` | read | 2 | 545 |
| `program-find` | read | 3 | 359 |
| `repo-find` | read | 3 | 644 |
| `tree-list` | read | 3 | 701 |
| `git-clone` | **write** | 2 | 608 |

Twelve scripts. Two write. `remoteWriteScripts()` returns them in catalogue order and
`ALLOWED_WRITERS` in `build/conformance-machines.mjs` holds the exact list
`['image-put', 'git-clone']`.

Other current facts that bound this question.

| Fact | Value | Where |
| --- | --- | --- |
| Longest command the door will send | 131,072 bytes | `REMOTE_SCRIPT_MAX_BYTES`, `src/main/machines/remote-scripts.ts` |
| Largest image the product sends | 90,000 bytes | `REMOTE_IMAGE_MAX_BYTES`, `src/shared/ipc/machines.ts` |
| Largest side of one remote file read | 2,097,152 bytes | `REMOTE_REVIEW_MAX_BYTES`, `src/main/machines/remote-review.ts` |
| Answer buffer for any remote command | 67,108,864 bytes | `MAX_BUFFER_BYTES`, `src/main/machines/exec-plane.ts` |
| Default deadline for one script | 15,000 ms | `REMOTE_RUN_TIMEOUT_MS`, `src/main/machines/remote-run.ts` |
| Deadline for the one existing write | 60,000 ms | `REMOTE_IMAGE_TIMEOUT_MS`, `src/main/machines/remote-image.ts` |
| Seconds before ssh calls a link dead | 15 | `SSH_SERVER_ALIVE_INTERVAL_SECONDS` 5 times `SSH_SERVER_ALIVE_COUNT_MAX` 3, `src/main/machines/ssh.ts` |
| Programs a `read` script may never name | 11 | `MUTATING_PROGRAMS`, `build/conformance-machines.mjs` |

The renderer refuses a remote save today and says so out loud. `save` in
`src/renderer/editor/tab-io.ts` returns false for any tab with `remote !== undefined` and
raises `remoteSaveRefused` from `src/renderer/machines/presentation.ts`. The tree's context
menu drops New File, New Folder, Rename, Duplicate and Move to Trash for a remote row,
and `TreeMenuCapabilities.readOnlyNote` in `src/renderer/tree/tree-menu.ts` carries the
reason for each in its own comment.

---

## Section 3. Is `image-put` a model to follow, or a special case

**It is both, and separating the two halves is the whole answer.** Two of its properties
are the model. Four of them are special case and a save cannot copy any of the four.

### The two properties to copy

| Property | The text that carries it | Why a save needs it |
| --- | --- | --- |
| The bytes are decoded into a temporary name and then moved into place with `mv "$t" "$f"` | `IMAGE_PUT`, `src/main/machines/remote-scripts.ts` | `mv` inside one directory is `rename(2)`, so the destination is the old bytes or the new bytes and never a mixture |
| The answer names the size and the sha256 the far side now holds, and this Mac compares both before it treats the write as done | `putOneImage`, `src/main/machines/remote-image.ts` | a write nobody checked is a claim rather than a fact |

### The four properties that do not carry over

| Property of `image-put` | Why a save cannot copy it |
| --- | --- |
| It writes only into `$HOME/.tortie/images`, a folder Tortie makes with mode 700. The path is a constant in the script text | A save writes into the person's own repository, at a path the renderer chose. The blast radius is different and the containment has to be enforced rather than assumed |
| Nothing a person typed reaches the far side as a name. `remoteImageName` composes it from the session id and 16 hexadecimal characters of the checksum | A save's path IS what the person picked. `image-put` carries no containment line because it needs none, and a save needs one |
| Safe to run twice because a file that is already there is never opened. Condition 38 of the gate reads the literal line `if [ -f "$f" ]; then` and fails without it | A save must replace a file that is already there. The `-f` refusal has to invert, so the safe to run twice argument has to be rebuilt from something else |
| It degrades to a size only comparison when the machine has no checksum program, and logs that it did | A save must not degrade. A size match with a different checksum is a different file, and the thing at risk is a person's work rather than a picture |

**So the ruling is that `image-put` is the model for the landing and not for the
decision.** Copy its temporary name and its `mv`. Do not copy its `-f` refusal, its fixed
directory or its checksum fallback.

---

## Section 4. Atomicity

**Ruling. Every write lands with a single `rename(2)` inside the destination's own
directory, or it is a single `mkdir`, or it is a single `mv`. Nothing writes the real
name in place.**

The three shapes.

| Operation | Landing | Atomic |
| --- | --- | --- |
| `file-put` | decode into `.<name>.tortie-part` in the same directory, `chmod` it, then `mv` it onto the name | Yes. Same directory means same filesystem, so `mv` is `rename(2)` |
| `dir-new` | one `mkdir "$d"`, never `mkdir -p` | Yes. `mkdir(2)` either makes the directory or fails with `EEXIST` |
| `entry-rename` | one `mv "$from" "$to"` after `[ -e "$to" ]` answered no | Yes on one filesystem. Across filesystems `mv` copies and unlinks and is not atomic, and a repository does not usually straddle one |

The temporary name sits in the destination's own directory on purpose. A temporary file
under `~/.tortie` would make the `mv` a cross filesystem copy on any machine whose home
and whose projects are on different volumes, and a cross filesystem `mv` is a copy
followed by an unlink rather than a rename.

**What in place writing would buy, and why it loses.** Truncating the existing file and
writing into it keeps the inode, so the mode, the owner, every hard link and every
extended attribute survive. It also means an interrupted write leaves a truncated source
file on a machine where an agent may be running a build against it. Choosing between a
half written source file and a lost extended attribute is not close, so the temporary
name wins and section 8 says exactly what it costs.

---

## Section 5. The size limit

**Ruling. 90,000 bytes for one save, refused on this Mac before anything is composed,
reusing `REMOTE_IMAGE_MAX_BYTES` rather than inventing a second number. A file over the
cap opens READ ONLY, and the refusal is at open time rather than at save time.**

### Why there is a cap at all

The payload travels uphill, inside the one command that reaches the far side as one
argument of its login shell. `composeRemoteScriptCommand` in
`src/main/machines/remote-run.ts` builds `shellQuoteArgv(['/bin/sh', '-c', text, name,
...args])`. `SAFE_ARG` in `src/main/restore/command.ts` is
`/^[A-Za-z0-9_\-./=:@%+,]+$/`, and every character of the base64 alphabet is inside it, so
an encoded payload is passed through unquoted and costs nothing extra. Base64 costs 4
bytes for every 3.

The read has no such problem, because an answer comes back on stdout and `MAX_BUFFER_BYTES`
is 67,108,864 bytes. **The read scales to 2 MB and the write caps at about 97 KB. The
asymmetry is entirely about which direction the bytes travel.**

### The ceiling, measured this session

Composed with the real `composeRemoteScriptCommand` shape and the real `shellQuoteArgv`.

| Shape | Script text | Composed at max payload | Headroom under 131,072 | Raw bytes that fit |
| --- | --- | --- | --- | --- |
| today's `image-put` with a 90,000 byte image | 592 | 120,687 | 10,385 | 97,788 |
| the proposed `file-put` in section 12, with a 45 character repository path and a 38 character relative path | 1,516 | 1,863 plus the payload | 9,211 at a 90,000 byte payload | 96,906 |

**The ceiling is not a constant. It moves with the length of the repository path and the
length of the path inside it.** That is why the product must refuse against a fixed
smaller number on this Mac rather than publish the arithmetic ceiling. 90,000 leaves 9,211
bytes of slack, which is room for about 9,200 more characters of path.

### How often 90,000 bites, counted in this repository

Counted this session over `git ls-files` in this worktree.

| Set | Files | Over 90,000 | Over 97,000 | Over 131,072 |
| --- | --- | --- | --- | --- |
| every tracked file | 1,571 | 60 | 55 | 40 |
| tracked under `src/` | 1,279 | 6 | 4 | 1 |
| tracked under `docs/` | 174 | 49 | 46 | 34 |

Read it by row. The cap costs 0.47% of the source files and 28.2% of the documents. The
largest tracked file is `docs/BACKLOG.md` at 902,675 bytes, and it is the operator's own
working document. So the honest sentence is that remote save will cover nearly all code
and will refuse most of this project's own prose.

### Lifting the cap later, and the one way that works

| Option | Round trips for 902,675 bytes | Deciding reason |
| --- | --- | --- |
| Keep one round trip, cap at 90,000 | refused | **Chosen for the first phase.** No change to `execRemoteShell`, no change to gate condition 37, no new carriage. The refusal is honest and it is at open time |
| Chunk the payload across several commands | 11 | **Rejected.** An append is not safe to run twice, so every chunk needs a session id, an ordering rule and a cleanup for orphaned parts. It multiplies the failure surface by the number of chunks to remove a cap that costs 0.47% of source files |
| Send the payload on the child's stdin instead of in the command | 1, with no cap at all | **Deferred to its own phase.** It is the right long term shape and it is the only one that removes the cap. It costs a move from `execFile` to `spawn` in `execRemoteShell`, because the promisified `execFile` gives no stdin handle, and it costs gate condition 37 a new class of parameter, since a value on stdin appears zero times in the composed command rather than once |
| `scp` or `sftp` | 1 | **Rejected.** A second carriage, a second authentication path and no marker protocol. Every property the catalogue exists to hold would have to be rebuilt for it |

**Ruling on the deferral.** Build the argument door first. Build the stdin door only when
a person is actually refused, and record the refusal so that trigger is a number rather
than a feeling.

### The one guard on the ceiling has a defect today

`runRemoteScript` in `src/main/machines/remote-run.ts` tests
`command.length > REMOTE_SCRIPT_MAX_BYTES`. `String.length` counts UTF-16 code units and
the constant is named in bytes. A path holding CJK characters counts 1 per character and
costs 3 bytes, so the check can pass a command that is over the real limit. At a 90,000
byte payload there are 9,211 bytes of slack, so it would take roughly 4,600 such
characters in one path to bite. It is not reachable in practice and it is still the wrong
arithmetic in the one guard that bounds the write. **Fix it with `Buffer.byteLength` in
the same phase.**

---

## Section 6. Encoding

**Ruling. The transport is base64 and adds no encoding question at all. The one encoding
hazard that exists is already in the local editor, and the remote path inherits it rather
than adding to it.**

Three facts, each read this session.

1. **Base64 cannot break the answer protocol.** `REMOTE_SCRIPT_MARKER` is
   `__TORTIE_RUN__`. The underscore is not in the base64 alphabet, so a payload can never
   contain a marker. This is the same reason `STORE_HEAD` and `REVIEW_FILE` already encode
   their answers.
2. **The bytes that leave this Mac are the bytes that land.** `base64 -d` is tried first
   and `base64 -D` second, which is the two spelling dance `IMAGE_PUT` already carries for
   the difference between this Mac and a Linux machine.
3. **The lossy step is the decode to text, and it is local.** `readTextCapped` in
   `src/main/fs/ipc.ts` returns `buf.subarray(0, offset).toString('utf8')` after sniffing
   only for a NUL byte in the first 8,192 bytes. `parseRemoteReviewPair` in
   `src/main/machines/remote-review.ts` does exactly the same, returning
   `right.toString('utf8')` after the same NUL sniff. An invalid UTF-8 byte becomes U+FFFD
   in both, so a read then write round trip would replace it. **The local save has this
   defect today and nobody has hit it.** The remote save must not be held to a higher bar
   than the local one, so the rule is that it carries the same NUL sniff and nothing more.

The one thing worth adding, and it is cheap. On the read, compare
`Buffer.from(decoded, 'utf8')` against the bytes that arrived. When they differ the file
did not survive the decode, and the tab opens read only. That closes the hazard for the
remote path and it would close it for the local path with the same three lines.

**What is deliberately NOT normalised.** No trailing newline is added. No line ending is
converted. Monaco keeps the end of line it read, so a CRLF file stays CRLF, and the bytes
that go back are the bytes the editor holds.

---

## Section 7. Permissions, and this is where the temporary name costs something

Every script in the catalogue begins `set -e` and then `umask 077`, and condition 35 of
`build/conformance-machines.mjs` fails a script that does not. That is right for
`~/.tortie/images` and it is wrong for a person's repository.

**Measured this session on this Mac, macOS 15.7.9 on arm64.** A file at mode 755 with a
second hard link and one extended attribute, put through the `image-put` shape.

| Property | Before | After a temporary name plus `mv` |
| --- | --- | --- |
| mode | 755 | **600** |
| hard link count | 2 | **1**, and the other link still holds the old bytes |
| extended attribute `com.tortie.test` | present | **gone** |
| content | old | new |

A `mkdir` under `umask 077` was measured at mode **700** where the parent was 755.

**Ruling. Every write reads the mode it should land at and applies it to the temporary
name before the `mv`, using the two spellings of `stat` the catalogue already uses
elsewhere.** Measured this session, this Mac answers `stat -f '%Lp'` and rejects both
`stat -c '%a'` and `chmod --reference`, so the fallback order matters and `--reference` is
not available.

| Case | Mode the new thing gets |
| --- | --- |
| a save over a file that exists | the mode that file already had, read before the write |
| a new file | 644 when the containing directory is readable by group and by other, otherwise 600. One `case` over the last two octal digits decides it |
| a new folder | the mode of its parent directory |
| a rename | unchanged, because `mv` moves the inode |

Re-measured with the fix in place, the 755 file came back **755**.

**What is still lost by a save, and it is stated rather than hidden.**

- Every hard link other than the path being saved keeps the old bytes.
- Extended attributes and ACLs on the file are gone.
- The owner becomes the account the connection signs in as, when the file was owned by
  someone else and the directory was writable.

None of these has a fix that keeps the atomic landing, so they are the price of section 4
and the phase brief says so.

**A symlink is refused.** `[ -f "$f" ]` is true for a symlink to a file, and `mv`
replaces the symlink with a regular file rather than writing through it. The local save
follows the link, because `fs.writeFile` does. Following it on the far side means
resolving a path that the textual containment check can no longer bound, so the ruling is
that a symlink answers `symlink` and is not written. There are 0 tracked symlinks in this
repository and 0 symlinks under `src/` and `docs/` on disk, so the cost is measured at
nothing here.

---

## Section 8. What a half written file looks like

**There is no half written file. There is a whole leftover file beside it.**

Measured this session. A 90,000 byte payload was decoded into `k.txt.tortie-part` and the
shell was killed with SIGKILL before the `mv`.

```
  -rw-r--r--  1 gdc  wheel     17  k.txt
  -rw-------  1 gdc  wheel  90000  k.txt.tortie-part
  k.txt still holds "ORIGINAL CONTENT"
```

The destination was byte identical to what it held before. That is the whole argument for
section 4.

**The leftover is the cost, and it has three consequences.**

| Consequence | Answer |
| --- | --- |
| It accumulates | It does not, because the temporary name is deterministic rather than `$$`. `IMAGE_PUT` uses `"$f.part.$$"` today and nothing in this tree ever removes those. The save uses `.<name>.tortie-part`, so the next successful save of that same file truncates and reuses it. The set is bounded by the number of files ever interrupted, and each one is reclaimed by the next save of that file |
| Git sees it | It would. `REVIEW_LIST` runs `git status --porcelain=v2 --branch -z --untracked-files=all`, so a leftover appears in the remote Changes list as an untracked file. The reader in `src/main/machines/remote-review.ts` drops any entry whose base name starts with a dot and ends `.tortie-part`, and the Explorer hides the same |
| It could destroy a real file of that name | Only if a person keeps a file named `.<something>.tortie-part` in their repository. The leading dot and the suffix together make that unlikely, and the phase brief names the risk rather than pretending it is zero |

`IMAGE_PUT`'s own leftover is an existing defect this document found while answering.
Nothing in `src/main/machines/*.ts` removes `~/.tortie/images/*.part.*`, and a dropped
image upload leaves one forever. The save phase should give `image-put` the same
deterministic temporary name, which costs one line and removes an unbounded folder.

---

## Section 9. What happens when the link dies mid write

`runRemoteScript` in `src/main/machines/remote-run.ts` says it in its own header, being
that a command that failed may or may not have run. Four cases follow from that, and the
design's job is to make three of them harmless and the fourth honest.

| When the link dies | On that machine | What Tortie can tell | What the person sees |
| --- | --- | --- | --- |
| before the command arrives | nothing happened | nothing | the buffer stays dirty, and one sentence says Tortie does not know whether the file was saved |
| after the decode, before the `mv` | the file is untouched, a `.tortie-part` sits beside it | nothing | the same sentence. The next save reclaims the part file |
| after the `mv`, before the answer arrives | **the file is saved** | nothing | the same sentence, and the next save answers `same` and self heals |
| the generation moved while the command was in flight | either state | step 8 of `runRemoteScript` discards the answer and throws `MACHINE_NOT_CONNECTED` | the same sentence |

**The third row is the reason the compare and swap is not optional.** Without it, a save
whose answer was lost is a save the person repeats blindly. With it, the repeat computes
the current checksum, finds it equal to the checksum of the bytes being sent, answers
`same` and writes nothing. The write becomes safe to run twice AND self healing, which is
the property the catalogue's own header demands of every script and the property a naive
save does not have.

**Deadlines.** `execRemoteShell` hands `timeout` to `execFile` with
`killSignal: 'SIGKILL'`, which kills the ssh client on this Mac. Whether the far side's
shell also dies is a property of how sshd closes the channel, and it was not measured. See
section 15. `GIT_CLONE`'s own header already records the same unknown for a clone.

**Ruling on the deadline value.** 60,000 ms, reusing `REMOTE_IMAGE_TIMEOUT_MS`'s number,
because a 90,000 byte save carries the same bytes as a 90,000 byte image. `dir-new` and
`entry-rename` carry no payload and take the 15,000 ms default.

**Ruling on the sentence.** When a save's answer does not arrive, Tortie says it does not
know whether the machine saved the file, and it keeps the buffer dirty. It never says the
save failed, because in one of the four rows the save worked.

---

## Section 10. Trash. The ruling is that it is not built

**Do not build a delete on a remote tab. The tree already says so and this document
confirms it rather than reversing it.**

`TreeMenuCapabilities.readOnlyNote` in `src/renderer/tree/tree-menu.ts` carries this,
written in Phase 90.3:

> Move to Trash is absent PERMANENTLY. `shell.trashItem` has no far side equal, and a
> remote `rm` would turn a recoverable delete into an unrecoverable one.

The evidence behind that, checked this session.

| Option for a remote delete | Deciding reason |
| --- | --- |
| `rm` on the far side | **Refused.** `rm` is the first name on `MUTATING_PROGRAMS` in `build/conformance-machines.mjs`. The local service's own header says "DELETE MEANS TRASH. Nothing here calls unlink or rm", and it injects `shell.trashItem` so that the promise is structural rather than a note. A remote `rm` would make one half of the product's delete recoverable and the other half not, and a person cannot see which tab they are on at the moment they press the key |
| Ask the far side to use its own trash | **Refused.** On macOS the recoverable delete is `NSFileManager trashItemAtURL`, reached from Electron as `shell.trashItem`. There is no supported command line for it. `osascript` telling Finder to delete needs a logged in window server session and an Automation permission prompt on a machine nobody is watching. On Linux the equivalent is the freedesktop trash specification, being a `files` directory plus an `info` file per entry, and it is a different mechanism from the Mac one |
| Move it into a Tortie owned quarantine folder | **Refused for now, and it is the only one worth revisiting.** It is a reimplementation of a trash can, which the scope guardrail's second rule names directly. It grows without bound and nothing empties it, so the failure mode is a person's disk filling up with no surface that says so |
| Do not offer a delete | **Chosen.** The person has a terminal on that machine, in Tortie, in the same window, and an agent that can delete a file when asked |

**The one condition under which this reopens.** If the operator asks for it after living
with the gap, the answer is the quarantine folder, with the folder shown in the Explorer,
its size stated in the UI, and a manual Empty. It is never `rm` behind a menu item.

**And note what is NOT being refused.** `entry-rename` moves a file, and a person can move
a file into a folder they made. That is not a delete and it is fully reversible from the
same menu.

---

## Section 11. Duplicate. The ruling is not now, and never as a new script

Local duplicate is `cp` with `recursive: kind === 'dir'`, `force: false`,
`errorOnExist: true` and `preserveTimestamps: true`, in `createFileOps` in
`src/main/fs/file-ops.ts`, with `copyNameFor` finding a free name by statting up to 200
candidates.

| Remote shape | Deciding reason |
| --- | --- |
| a fourth write script running `cp -Rp` | **Refused.** A folder copy has no bound Tortie can enforce. The deadline kills the ssh client on this Mac and section 15 records that nobody has measured whether the far side's `cp` stops. `GIT_CLONE`'s header already documents exactly this leftover for a clone, and a second unbounded write is a second copy of a known problem |
| a file only duplicate, as a `review-file` read followed by a `file-put` with the word `new` | **The shape to use if it is ever asked for.** It costs no new script, no new gate branch and no widening of the writer list. It costs 2 round trips, it caps at 90,000 bytes, and it loses the source's mode |
| not built | **Chosen for now.** It is the least used of the six and it is the only one with a zero cost workaround, being that the person duplicates the file in the terminal that is already open on that machine |

---

## Section 12. The three script texts, and what each one answers

These are written to the seven rules in the header of `src/main/machines/remote-scripts.ts`
and to conditions 35 to 38 of `build/conformance-machines.mjs`. The `file-put` text below
is the one measured in section 5, at 1,516 bytes.

### `file-put`, five parameters

The five values it reads.

- `$1` is the folder on that machine.
- `$2` is the path inside it.
- `$3` is the sha256 Tortie believes that file holds now, or the word `new`.
- `$4` is the sha256 of the bytes being sent.
- `$5` is those bytes, encoded.

```
  set -e
  umask 077
  case "$2" in /*|*..*|.git|.git/*|*/.git|*/.git/*) exit 1;; esac
  cd "$1"
  f="$2"
  if [ -L "$f" ]; then  printf '__TORTIE_RUN__symlink none__TORTIE_RUN__\n'; exit 0; fi
  if [ -e "$f" ] && [ ! -f "$f" ]; then
    printf '__TORTIE_RUN__notfile none__TORTIE_RUN__\n'; exit 0
  fi
  c=$(shasum -a 256 "$f" 2>/dev/null | cut -d' ' -f1 || true)
  if [ -z "$c" ]; then c=$(sha256sum "$f" 2>/dev/null | cut -d' ' -f1 || true); fi
  if [ -z "$c" ] && [ -f "$f" ]; then
    printf '__TORTIE_RUN__nosum none__TORTIE_RUN__\n'; exit 0
  fi
  if [ "$c" = "$4" ]; then
    printf '__TORTIE_RUN__same %s__TORTIE_RUN__\n' "$c"; exit 0
  fi
  ...  the mode branch of section 7, then
  t="$f.tortie-part"
  if printf '%s' "$5" | base64 -d > "$t" 2>/dev/null; then :; else printf '%s' "$5" | base64 -D > "$t"; fi
  chmod "$m" "$t"
  mv "$t" "$f"
  ...  then wc -c, then shasum again, then
  printf '__TORTIE_RUN__wrote %s %s__TORTIE_RUN__\n' "$n" "${g:-nosum}"
```

The answer vocabulary, and six of the eight words are ordinary states rather than
failures.

| Word | Means | What the person is told |
| --- | --- | --- |
| `wrote` | the file now holds the sent bytes, with its size and checksum | the tab goes clean |
| `same` | the file already held exactly these bytes, and nothing was written | the tab goes clean. This is the self heal of section 9 |
| `stale` | the file changed on that machine since Tortie read it, and nothing was written | the file changed over there, with an offer to re-read |
| `gone` | a save was asked for and the file is not there | the file is no longer on that machine |
| `exists` | a new file was asked for and something is already at that name | that name is taken |
| `symlink` | the path is a symlink | Tortie does not save through a link on another machine |
| `notfile` | the path is a directory or a device | that path is not a file |
| `nosum` | the machine has no `shasum` and no `sha256sum` | Tortie will not save without a way to check, and it names the two programs |

`nosum` is the one place this design is stricter than `image-put`, which falls back to
comparing sizes. A save does not fall back, because the thing at stake is a person's work.

### `dir-new`, two parameters

`$1` is the folder and `$2` is the path inside it. It carries the same containment line.

- `exists` when anything is already at that path.
- `denied` when the parent directory is not writable by the account that signed in.
- `made` after one non recursive `mkdir` and one `chmod` to the parent's mode.

It is safe to run twice, because the second run answers `exists`.

### `entry-rename`, three parameters

`$1` is the folder, `$2` is the path now and `$3` is the path wanted. Both paths carry the
containment line. There are four answers and every one of them is determined.

| `$2` | `$3` | Answer |
| --- | --- | --- |
| there | absent | `moved`, after one `mv` |
| there | there | `exists`, nothing done |
| absent | there | `done`, which is a repeat of a `moved` whose answer was lost |
| absent | absent | `gone` |

That table is the whole safe to run twice argument for this script, and it is stronger
than a `-e` guard alone, because it can tell a repeat apart from a source that was never
there.

### What every one of the three carries

- `set -e` then `umask 077`, as condition 35 requires.
- The containment line, being `case "$2" in /*|*..*|.git|.git/*|*/.git|*/.git/*) exit 1;;
  esac`. `REVIEW_FILE` already carries the first half of it. **This refuses a real file
  whose own name holds two dots in a row, e.g. `notes..md`, and that false refusal is
  taken on purpose and is already taken by `review-file` today.** Counted this session,
  0 files in this repository have two dots in a row in a name, so the cost here is zero.
  The `.git` half is new and is what stops a save rewriting `.git/config` on somebody
  else's machine.
- Every positional read double quoted, as condition 36 requires.
- Every value crossing as a positional parameter, never inside the text.

---

## Section 13. What each new writer costs the gate, and the property that is lost

`build/conformance-machines.mjs` has to change in exactly two places per script, and one
sentence the product can say today stops being true.

| Gate condition | Today | After |
| --- | --- | --- |
| 35, `ALLOWED_WRITERS` | the exact list `['image-put', 'git-clone']`, and the failure text calls it "the number that bounds what Tortie can do to another person's computer" | `['image-put', 'git-clone', 'file-put', 'dir-new', 'entry-rename']`, in catalogue order |
| 38, the per id redirection rule | a branch for `image-put`, a branch for `git-clone`, and an `else` that fails any write with no rule of its own | three more branches. `file-put` takes `image-put`'s rule unchanged, being that every redirection aims at `"$t"` and the text holds `mv "$t" "$f"`. `dir-new` and `entry-rename` take a new rule, being that they carry no redirection other than `2>/dev/null` and name exactly one mutating program each |
| 38, the safe to run twice literal | `image-put` must hold `if [ -f "$f" ]; then`, and `git-clone` must hold `if [ -e "$d" ]; then` | `file-put` cannot hold either, because it replaces a file that is there. Its literal is the compare and swap, being that the text holds both `if [ "$c" = "$4" ]` and a branch that exits without writing when `"$c" != "$3"` |

**The sentence that is lost, said plainly.** Today the product can state, and check by
reading text, that **no command it sends can replace a file somebody already had.** Both
writers refuse a destination that exists. After `file-put` that sentence is gone and a
weaker one takes its place, being that **no command it sends can replace a file whose
current contents Tortie did not just verify by checksum.** That is a real reduction in a
checkable property and it is the price of the feature. It should appear in the phase's
commit body rather than only here.

**Two more places a phase must touch, from CLAUDE.md's own rules.**

- `src/renderer/tree/tree-menu.ts`, because the tree's context menu is native through
  `ui:popupMenu` and its `readOnlyNote` comment currently states why four verbs are
  absent. A phase that lands three of them updates that comment in the same commit.
- `src/renderer/machines/presentation.ts`, because every sentence the renderer says about a
  machine lives there, and `remoteSaveRefused` and `remoteFileChip` both become wrong the
  day a save works.

---

## Section 14. The phases, ordered

The operator's stated order is search, then scrollback, then save, then the git writes. So
the save phase is third overall, and these rows are its internal order.

| # | Phase | What a person can do afterwards | Size | Tier | Risk | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Remote save** | Press Save on a file that is on another machine and have it written there, or be told exactly why it was not | large | **3** | highest in the programme. It writes a person's files on a computer they are not looking at | nothing beyond what ships |
| 1a | inside phase 1, the read side | A remote tab opens read only above the write cap and above a lossy decode, so the refusal comes before the typing rather than after it | small | 3 | a person typing into a tab that can never save | `MonacoHost.tsx`'s `readOnly` expression, which today reads `tab.deleted \|\| tab.truncated \|\| tab.commit !== null` and does not know about a remote cap |
| 1b | inside phase 1, the byte count fix | nothing visible | tiny | 1 | none | `runRemoteScript`'s `command.length`, which should be `Buffer.byteLength` |
| 1c | inside phase 1, the `image-put` leftover | nothing visible, and `~/.tortie/images` stops growing part files forever | tiny | 2 | none | `IMAGE_PUT`'s `"$f.part.$$"` |
| 2 | **Remote new file, new folder and rename** | Make a file, make a folder and rename or move an entry in the Explorer of a folder on another machine | medium | **3** | a rename can lose a file to a name nobody expected | phase 1, because it reuses `file-put` for the new file |
| 3 | **The stdin door** | Save a file of any size, including this project's own 902,675 byte backlog | medium | **3** | it changes the one door every remote command goes through | a counted record of people being refused by the 90,000 cap |
| none | **Remote duplicate** | **NOT BUILT.** Section 11. If ever asked for, it is a file only, as a read plus a `file-put`, and it adds no script | none | none | none | none |
| none | **Remote trash** | **NOT BUILT, EVER, AS A DELETE.** Section 10. The tree already records this permanently | none | none | none | none |

**Why Tier 3 on rows 1, 2 and 3.** CLAUDE.md puts anything that can lose or destroy user
data at Tier 3, and every row here writes a person's files. The verification shape already
exists and should be copied rather than reinvented. `build/probe-remote-image.mjs` is the
model, being a live probe whose far side is this Mac, with a scratch HOME, with the
operator's server counted before and after, and with no `pkill` in the file.

**What a `build/probe-remote-save.mjs` must prove, and each one is a measurement rather
than an assurance.**

1. A save of a 90,000 byte file lands byte identical, checked by sha256 on both sides.
2. A save over a file at mode 755 leaves it at mode 755.
3. A save whose shell is killed after the decode leaves the destination byte identical and
   one part file beside it.
4. A second save of the same bytes answers `same` and does not touch the modification time.
5. A save whose expected checksum does not match answers `stale` and writes nothing.
6. A path holding `..`, a path starting with `/` and a path holding `.git` are each refused
   with nothing written, verified by comparing the tree before and after.
7. A save of 90,001 bytes is refused on this Mac before any command is composed.
8. `git status --porcelain` in the scratch repository is byte identical before and after
   every refusal, which is what `build/probe-remote-review.mjs` already does for reads.

---

## Section 15. What was NOT measured, and what would measure it

| Not measured | Why it matters | What would measure it |
| --- | --- | --- |
| Anything against a real second machine | Every number in sections 5, 7 and 8 was produced on this Mac with no ssh in the path. The round trip cost of a save, and the transfer time of 120,000 bytes over the operator's tailnet, are both unknown to this document | `build/real-machine.mjs` with `GMUX_REAL_MACHINE_HOST` and `GMUX_REAL_MACHINE_CONFIRM` set, running the phase's own probe against the Mac Pro |
| Whether killing the local ssh client stops the far side's shell mid write | It decides which of the four rows in section 9 a timeout produces, and therefore whether a timed out save can still land | Start a `file-put` with a `sleep` between the decode and the `mv`, kill the local ssh with SIGKILL, then read the destination on the far side after the sleep would have ended |
| `MAX_ARG_STRLEN` on a Linux machine | 131,072 is the kernel's documented constant and no Linux machine was contacted by this document, exactly as `REMOTE_SCRIPT_MAX_BYTES`'s own comment already admits | `getconf ARG_MAX` plus a binary search with a growing argument, on the machine in question |
| Whether every target machine has `shasum` or `sha256sum` | It decides how often `nosum` refuses a save. This Mac has both, at `/usr/bin/shasum` and `/sbin/sha256sum` | `program-find` already answers this shape of question. One read against each machine the operator uses |
| The cost of a tree refresh after a create or a rename | Nothing tells the Explorer that a folder on another machine changed, because there is no watcher for a machine anywhere in this tree | `REMOTE_TREE_DEPTH`'s own comment records 101.0 ms and 68,610 bytes for a 1,445 entry answer on the operator's Mac Pro on 2026-08-19. I read that constant rather than re-running it |
| Behaviour on a case insensitive far side | `sameEntry` in `src/main/fs/file-ops.ts` exists because a case only rename on a case insensitive volume reports the destination as existing. `entry-rename`'s `[ -e "$3" ]` would answer `exists` for a case only rename and refuse it | Run a case only rename through the script on a case insensitive volume and on a case sensitive one |
| Cross filesystem `mv` inside one repository | `entry-rename` is atomic only within one filesystem | `stat -f '%d'` on both paths before the `mv`, and refuse when the device numbers differ |

---

## Section 16. The three defects this investigation found in the current tree

These are not proposals. They are wrong today.

| # | Defect | Where | Cost |
| --- | --- | --- | --- |
| 1 | The one guard on the command size counts UTF-16 code units against a limit named in bytes | `runRemoteScript`, `src/main/machines/remote-run.ts`, the `command.length > REMOTE_SCRIPT_MAX_BYTES` branch | not reachable today at a 90,000 byte payload, and it is the wrong arithmetic in the guard that bounds every write |
| 2 | Nothing ever removes `~/.tortie/images/*.part.*` on a machine. `IMAGE_PUT` names its temporary file with `$$`, so every interrupted upload leaves a new one | `IMAGE_PUT`, `src/main/machines/remote-scripts.ts` | an unbounded folder in a person's home directory, with no surface that shows it |
| 3 | A remote tab is editable in Monaco. `readOnly` is `tab.deleted \|\| tab.truncated \|\| tab.commit !== null` and does not include `tab.remote`, so a person types freely into a tab whose every save is refused | `MonacoHost.tsx`, `src/renderer/editor/` | the refusal sentence exists and arrives after the typing. It should arrive before it |
