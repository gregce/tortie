# Research 55, item 6. What the editor becomes, and whether a save may ever cross

Investigator 4. Written 2026-08-18 against the tree at `7a665d7`. Every claim
about this tree was checked in this session against the named file and symbol.
Nothing here is quoted from an older research document.

---

## The answer

Four rulings, in the order they should be acted on.

**1. The silent refusal is a defect and it must be fixed before anything else in
this item is built.** Today Tortie draws a chip on a remote file whose tooltip is
the literal string `'Edit the file'` (`modeOptions` in
`src/renderer/editor/EditorPanel.tsx`), lets the person type into Monaco because
`readOnly` in `src/renderer/editor/MonacoHost.tsx` does not test `tab.remote`,
leaves File then Save enabled in the native menu (`src/main/menu.ts`, the
`'save-file'` item carries no enabled condition), and then throws the work away
with no message. The fix is four strings and one boolean across three files. It
does not need a machine, a script or a measurement.

**2. Open any file on the machine should be built, and it needs NO new script.**
The `review-file` script in `src/main/machines/remote-scripts.ts` already reads
any path relative to a repository root on the far machine and returns both sides.
I proved the read is not confined to the repository by running the script text
against a path beginning `../`, and the working side came back with 5,464 base64
characters of a file above the root while the committed side came back empty.
What blocks open-any-file today is the ENTRY POINT, not the transport. The only
producer of a remote path in the product is `openReviewTab` in
`src/renderer/app/session-actions.tsx`, and it is fed by a list capped at 30
files by `REMOTE_REVIEW_MAX_FILES`.

**3. A save may cross, and it costs one new script, but it caps a file at 97,593
bytes and it breaks the strongest safety statement the machines layer makes.**
The cap is arithmetic, not preference: the bytes must ride as one positional
parameter inside one login shell argument, and `REMOTE_SCRIPT_MAX_BYTES` is
131,072. 53 of the 1,452 files tracked in this repository are larger than that
cap, being 3.6%. The safety statement is condition 35 of
`build/conformance-machines.mjs`, which fails unless the catalogue holds exactly
one write script and that script is named `image-put`, and condition 38, which
fails unless every write script's text contains the literal line
`if [ -f "$f" ]; then`. That literal is the rule "a file the person already had
is never opened for writing". A save is the deliberate opposite of it.

**4. So the save should NOT ship in the same phase as open-any-file, and it
should not ship as a plain save at all.** If the operator wants it, the shape
that survives is a compare-and-swap: the write carries the checksum of the bytes
Tortie read, the far side refuses when the file has moved since, and the refusal
is a visible sentence rather than a dropped boolean. Nothing weaker is honest,
because there is no file watcher on the far machine anywhere in this tree, an
agent is editing that folder while the person reads it, and a review tab never
refreshes after it opens.

---

## Section 1. What is true today, measured

Every row was checked this session. Symbols, not line numbers.

| # | Fact | Where it is decided | Value |
| --- | --- | --- | --- |
| 1 | A remote file opens only from the review list | `openRemoteReview` and `openReviewTab`, `src/renderer/app/session-actions.tsx` | 1 entry point in the whole product |
| 2 | The list is capped | `REMOTE_REVIEW_MAX_FILES`, `src/main/machines/remote-review.ts` | 30 files |
| 3 | Untracked and ignored files never appear | `parseRemoteReviewListing`, same file, the `'?'` and `'!'` skip | 0 untracked files reachable |
| 4 | Each side of a file is capped | `REMOTE_REVIEW_MAX_BYTES`, same file | 2,097,152 bytes |
| 5 | A save is refused | `save` in `src/renderer/editor/tab-io.ts`, the test `tab.remote !== undefined` | returns `false` |
| 6 | The refusal reaches nobody | `save(): Promise<void>` in `src/renderer/editor/store.ts` | the boolean is dropped at the store boundary |
| 7 | Monaco stays editable | `readOnly` in `src/renderer/editor/MonacoHost.tsx` | `tab.deleted \|\| tab.truncated \|\| tab.commit !== null` |
| 8 | The catalogue is frozen | `REMOTE_SCRIPTS`, `src/main/machines/remote-scripts.ts` | 7 scripts, 1 of them `mode: 'write'` |
| 9 | The tmux door is frozen too | `REMOTE_VERB_LEDGER`, `src/main/machines/exec-plane.ts` | 11 verbs |
| 10 | One command's ceiling | `REMOTE_SCRIPT_MAX_BYTES`, `src/main/machines/remote-scripts.ts` | 131,072 bytes |

### How much of the view layer knows a remote tab exists

I counted the string `remote` in each editor file.

| File | Occurrences of `remote` |
| --- | --- |
| `src/renderer/editor/store.ts` | 13 |
| `src/renderer/editor/tab-io.ts` | 6 |
| `src/renderer/editor/EditorPanel.tsx` | 0 |
| `src/renderer/editor/MonacoHost.tsx` | 0 |
| `src/renderer/editor/PierreDiff.tsx` | 0 |

The read-only claim lives entirely in the state layer. No file that draws
anything has heard of it. That is the whole shape of finding 2 below.

### What the far machine spends, measured on this Mac

I ran the exact text of the catalogue scripts under `/bin/sh` against this
worktree, which holds 1,452 tracked files. This measures the FAR SIDE's cost with
the network removed. `git` was run with `--no-optional-locks` so nothing was
written.

| Script | Input | Runs | Wall time | Answer size |
| --- | --- | --- | --- | --- |
| `review-file` | `src/main/sessions/core.ts`, 146,878 bytes | 5 | 0.03 s to 0.04 s | 195,840 base64 characters per side |
| `review-file` | `src/renderer/editor/tab-io.ts`, 17,820 bytes | 5 | 0.01 s to 0.02 s | 23,760 base64 characters per side |
| `review-list` | the whole worktree, clean | 5 | 0.02 s | 108 base64 characters |

### What the transport costs before any network

| Measurement | Runs | Result |
| --- | --- | --- |
| `/bin/sh -c 'printf x'` spawned through `execFile` | 20 | 2.68 ms mean |
| the `ssh` binary starting and reaching a refused port on 127.0.0.1 | 10 | 4.2 ms median, 3.1 ms to 6.2 ms |

So the local half of one remote call is about 4 ms and the far half is 10 ms to
40 ms. Neither is the cost that decides this design. The round trip to the
machine is, and it is unmeasured. See section 8.

### Whether the connection is warm when a save would happen

`sshOptions` in `src/main/machines/ssh.ts` puts `ControlMaster=auto`, a
per-machine `ControlPath` and `ControlPersist=60s` on every call.
`shellCommand` and `tmuxCommand` in `src/main/machines/context.ts` both use it,
and so does the control plane's long-lived child, whose plan is
`tmuxCommand(remoteContextFor(machineId), CONTROL_ATTACH_ARGS)` in
`src/main/machines/control-plane.ts`. So while a machine reads `connected` there
is an ssh client holding the master socket open, and an exec plane call opens a
new channel on it rather than doing a handshake. A save on a connected machine
pays one round trip, not a handshake. A save on a machine that went quiet pays a
full handshake, and 60 s of thinking time is enough to lose the master if the
control client is also gone.

---

## Section 2. The silent refusal, traced end to end

This is the sequence a person can perform today. Every step was read in this
tree.

```
  session menu -> "Review changes on <machine>…"      session-actions.tsx
        |                                              openRemoteReview
        v
  native popup, at most 30 file names                  REMOTE_REVIEW_MAX_FILES
        |
        v
  click one -> openReviewTab -> requestOpenFile        session-actions.tsx
        |         mode: 'diff', remote: {...}
        v
  store.openFromRequest builds the tab                 editor/store.ts
        canDiff = true   (because req.remote !== undefined)
        mode    = 'diff'
        |
        v
  ModeToggle draws a chip labelled "File"              EditorPanel.tsx
        title = 'Edit the file'                        modeOptions, last branch
        |
        v
  click it -> setMode(id, 'file') -> MonacoHost mounts MonacoHost.tsx
        readOnly = deleted || truncated || commit!==null
                 = false
        |
        v
  the person types. onDidChangeContent fires.
  markDirty(id, true) is REFUSED by the store          editor/store.ts markDirty
        so tab.dirty stays false, no dot on the tab,
        and the close prompt never fires
        |
        v
  cmd-S, or File > Save (always enabled)               menu.ts item('Save',...)
        -> ed.save() -> io.save(id) -> returns false    editor/tab-io.ts save
        -> store's save() is Promise<void>              editor/store.ts save
        -> the false is discarded. Nothing is shown.
        |
        v
  close the tab. disposeModels drops the buffer.
  No prompt, because dirty was never set.
```

Two strings on one tab contradict each other. `reviewTabTooltip` in
`src/renderer/app/machine-copy.ts` returns `'<name> on <machine>. This view is
read only.'` and it is the tab's tooltip. `modeOptions` in
`src/renderer/editor/EditorPanel.tsx` gives the chip beside it the title
`'Edit the file'`, because the branch that composes that title tests
`tab.commit !== null` and knows nothing about `tab.remote`.

The existing tests do not catch this. `src/renderer/editor/__tests__/remote-review-tab.test.ts`
holds 12 cases. Two of them are about immutability, being
`'never becomes dirty, so closing it can never offer to save it'` and
`'is never written back, even when a save is asked for'`. Both assert the STATE
layer's refusal. Neither mounts Monaco, so neither notices that the person can
type.

**The fix, and it is the cheapest thing in this whole item.** One boolean and
three strings.

| Change | File | Size |
| --- | --- | --- |
| add `\|\| tab.remote !== undefined` to `readOnly` | `src/renderer/editor/MonacoHost.tsx` | 1 clause |
| add a review arm to the read-only banner chain beside the `tab.commit !== null` arm | `src/renderer/editor/EditorPanel.tsx` | 1 arm |
| give the File chip a review title, and stop saying "Edit" | `src/renderer/editor/EditorPanel.tsx`, `modeOptions` | 1 string |
| the sentence itself, beside `reviewTabTooltip` | `src/renderer/app/machine-copy.ts` | 1 export |

Note what does NOT need to change. `markDirty` and `save` already refuse. The
defect is that three drawing files were never told.

---

## Section 3. A second defect found while tracing this, and it gets worse with open-any-file

A remote tab's identity is composed in `openFromRequest` in
`src/renderer/editor/store.ts` as

```
  `machine:${req.remote.machineId}:${req.relPath}`
```

The repository is not in it. Two sessions on one machine, in two different
repositories, both holding a changed `src/index.ts`, produce ONE tab id. The
second open takes the `existing !== undefined` branch, which calls
`get().activate(id)` and returns without reloading. The person clicks a file in
repository B and is shown repository A's file, with no sign that anything went
wrong.

The existing test named `'keys the tab by the machine, so it never collides with
a file here'` proves the machine-versus-this-Mac case and does not test the
repository-versus-repository case.

Today this is a wrong file on screen. With a save it becomes a write into the
wrong repository, because a save would use `tab.remote.repoPath`, which is
repository A's. Fixing it is one string. The id should carry `repoPath`.

---

## Section 4. Open any file. What it costs, which is almost nothing

### The read already works for any path

`review-file` in `src/main/machines/remote-scripts.ts` is

```
  cd "$1"
  a=$(git --no-pager show "HEAD:$2" | head -c "$3" | base64 ...)
  if [ -f "$2" ]; then b=$(head -c "$3" "$2" | base64 ...); fi
```

`$2` is used both as a git pathspec and as a filesystem path relative to the
folder. So any tracked or untracked file under the root reads correctly, and a
file with no changes returns two identical sides. I ran the text with
`$2 = ../p83-inv.txt` and the working side returned 5,464 base64 characters while
the committed side returned nothing, which shows the script has no containment of
its own.

`machines:reviewFile` in `src/main/machines/ipc.ts` passes `repoPath` and `path`
straight through to `reviewFileOn` with no validation of either. Today the only
producer of those values is main's own porcelain output, so nothing wrong reaches
the door in practice. The channel itself checks nothing.

### What the editor needs, and what it does not

| What open-any-file needs | Cost | Owner |
| --- | --- | --- |
| A way to name a file on the machine that is not on the changed list | a listing surface | items 3 and 5 of this research, not this item |
| A tab that is not a diff | `openFromRequest` currently forces `mode: 'diff'` and `canDiff: true` for every `req.remote`. An unchanged file would open as an empty diff | 1 branch in `src/renderer/editor/store.ts` |
| An identity that carries the repository | section 3 above | 1 string |
| An honest read-only state | section 2 above | 4 small changes |
| A new script | none | the read door is already general |

One saving worth naming. A `file-get` script that returns only the working copy
would halve the answer. For the largest file in this tree the measured answer was
195,840 base64 characters per side, so 391,681 bytes on the wire including the
separator and the markers. Half of that is a real reduction and it also removes a
`git show` from the far side's work. It is a new script, so it costs a catalogue
row, a reason and a gate pass. It is optional, and open-any-file works without
it.

### The 30 cap, and whether it bites

`REMOTE_REVIEW_MAX_FILES` is 30 and its comment says it is chosen "so a menu
stays a menu". A native macOS menu holds far more than 30 rows, so the cap is a
readability choice rather than a platform limit.

I measured how often a change in this product is bigger than 30 files, using this
repository's own history as the proxy. Over 303 commits, 40 of them touched more
than 30 files, being 13.2%, and 4 touched more than 100. A commit is a proxy for a
working tree, and this product's commits are unusually large because a whole
phase lands in one, so treat 13.2% as an upper estimate rather than a measurement
of a working tree.

The cap should not be raised. It should be replaced by the listing surface, which
is where a person picks from many files. That is item 3's decision and this item
defers to it.

---

## Section 5. What a write script would have to look like

Here is the smallest script text that could carry a save and still obey the seven
rules in the header of `src/main/machines/remote-scripts.ts`. I composed it this
session and measured the command it produces.

```
  set -e
  umask 077
  cd "$1"
  r=$(git rev-parse --show-toplevel 2>/dev/null || true)
  if [ -z "$r" ]; then printf '__TORTIE_RUN__norepo__TORTIE_RUN__\n'; exit 0; fi
  f="$2"
  if [ ! -f "$f" ]; then printf '__TORTIE_RUN__gone__TORTIE_RUN__\n'; exit 0; fi
  c=$(shasum -a 256 "$f" 2>/dev/null | cut -d' ' -f1 || true)
  if [ -z "$c" ]; then c=$(sha256sum "$f" 2>/dev/null | cut -d' ' -f1 || true); fi
  if [ "$c" != "$3" ]; then printf '__TORTIE_RUN__stale %s__TORTIE_RUN__\n' "$c"; exit 0; fi
  t="$f.tortie.$$"
  if printf '%s' "$4" | base64 -d > "$t" 2>/dev/null; then :; else printf '%s' "$4" | base64 -D > "$t"; fi
  mv "$t" "$f"
  n=$(wc -c < "$f" | tr -d ' ')
  c2=$(shasum -a 256 "$f" 2>/dev/null | cut -d' ' -f1 || true)
  printf '__TORTIE_RUN__wrote %s %s__TORTIE_RUN__\n' "$n" "$c2"
```

Four parameters, being the folder, the path inside it, the checksum of the bytes
Tortie read, and the new bytes encoded. `$3` is what makes it a compare-and-swap.
Without `$3` this is not a save, it is a race.

### The size, computed exactly

`composeRemoteScriptCommand` in `src/main/machines/remote-run.ts` builds
`shellQuoteArgv(['/bin/sh', '-c', text, 'tortie-file-put', ...args])`.
`shellQuoteArg` in `src/main/restore/command.ts` leaves a value alone when it
matches `/^[A-Za-z0-9_\-.\/=:@%+,]+$/`. The base64 alphabet is inside that set, so
an encoded payload costs nothing extra in quoting.

| Part | Bytes |
| --- | --- |
| the script text above | 764 |
| the quoted head, being `/bin/sh -c '<text>' tortie-file-put` | 793 |
| a 45 character repository path, the relative path and a 64 character checksum, quoted | 151 |
| separators | 2 |
| **left for the payload out of 131,072** | **130,126** |
| **source bytes that fit, after base64** | **97,593** |

### How often that cap bites, counted in this repository

| Set | Count | Over 90,000 bytes | Over 97,593 bytes | Over 131,072 bytes |
| --- | --- | --- | --- | --- |
| every tracked file | 1,452 | 58 | 53 | 39 |
| files under `src/` | 1,189 | 4 | 2 | 1 |
| files under `docs/` | 158 | 49 | 46 | 34 |

The two source files that do not fit are `src/main/sessions/core.ts` at 146,878
bytes and `src/renderer/icons/file-icons.generated.ts` at 126,078 bytes. Read the
table by row and the cap looks mild for code and harsh for prose. Only 2 of 1,189
source files are over it, being 0.17%, while 46 of 158 documents are, being 29%.
That matters because the files a person edits by hand on another machine are more
often the long ones, and this product's own backlog and research documents are
exactly the shape that does not fit. The
distribution under `src/` is a median of 6,606 bytes, a 90th percentile of 20,387
bytes and a 99th percentile of 56,331 bytes, so 97,593 is a cap most files clear
and the largest file in the product does not.

Compare the READ, which has no such problem. The answer comes back on stdout,
and `MAX_BUFFER_BYTES` in `src/main/machines/exec-plane.ts` is 67,108,864 bytes.
The read cap of 2,097,152 is a choice in `REMOTE_REVIEW_MAX_BYTES`, and no
tracked file in this repository reaches it. The largest tracked file is
`build/icon.icns` at 884,996 bytes.

**So the read scales to 2 MB and the write caps at 97.6 KB, a factor of 21, and
the asymmetry is entirely an artifact of where the bytes travel.**

### The gate changes a save forces

`build/conformance-machines.mjs` would have to be edited in three places, and
each edit weakens a stated rule.

| Condition | What it asserts now | What a save needs |
| --- | --- | --- |
| 35 | `writers.length !== 1 \|\| writers[0] !== 'image-put'` fails. The failure text says this is "the number that bounds what Tortie can do to another person's computer" | two writers, and the second named |
| 38 | every redirect target in a write script must be the literal `"$t"` | unchanged. The script above obeys it |
| 38 | the text must contain `mv "$t" "$f"` | unchanged. The script above obeys it |
| 38 | the text must contain the literal `if [ -f "$f" ]; then`, and the failure text says that check "is what makes the one write in this product safe to run twice" | the check must INVERT. A save requires the file to be there and replaces it. The checksum in `$3` becomes the new safe-to-run-twice argument, and the gate has to be taught that |

The third row is the one to argue about. It is not a formality. Today the
product can state, and check by reading text, that no command it sends can
replace a file somebody already had. After a save that sentence is gone and a
weaker one takes its place, being that no command it sends can replace a file
whose contents Tortie has not just read.

---

## Section 6. Why the seven scripts contain only one writer today

Not because writing is hard. Because the one writer has four properties that a
file save cannot have, and they are properties of the script text rather than of
a guard around it. `IMAGE_PUT`'s own header in
`src/main/machines/remote-scripts.ts` lists them.

| # | Property of `image-put` | Does a save keep it |
| --- | --- | --- |
| 1 | The name is chosen by Tortie and is content addressed. `remote-image.ts` composes it from the session id and a checksum of the bytes, so nothing a person typed and nothing a browser supplied reaches the far side as a name | **No.** A save's name is the file the person opened, which came from git's porcelain, which came from the far machine. It is a path that already exists and that the person did not choose |
| 2 | A file that is already there is never opened. The script prints `present` and stops | **No.** Replacing an existing file is the entire purpose |
| 3 | The decode goes to a temporary name and is moved, so a dead link leaves a `.part` file | **Yes.** The script in section 5 keeps this |
| 4 | Running it twice leaves the machine as running it once did, because the name is a checksum of the bytes | **Only with the checksum parameter.** Running the save twice with the same `$3` is safe the second time only because the second run finds a different checksum and refuses. That is a weaker guarantee than "the same bytes make the same file" |

There is a fifth reason that is not in that header and that I want on the record.
`image-put` writes into `"$HOME/.tortie/images"`, a directory Tortie made, with
mode 700. A save writes into the person's own repository. The blast radius of the
two is not comparable, and the catalogue's shape is what has kept them apart.

---

## Section 7. What can go wrong with a write that a read cannot

Eight things. Each row names where in this tree the mechanism lives.

| # | What goes wrong | Why a read is immune | Evidence in this tree |
| --- | --- | --- | --- |
| 1 | **Tortie cannot tell a failed write from a successful one.** Step 8 of `runRemoteScript` re-reads the connection generation and throws `MACHINE_NOT_CONNECTED` when it moved while the command was in flight, discarding the answer. The far side has already run | Discarding a read's answer costs a re-read | `runRemoteScript`, `src/main/machines/remote-run.ts`, the `after !== before` branch |
| 2 | **A timeout has the same shape.** `execFileP` is given `timeout` and `killSignal: 'SIGKILL'`, which kills the LOCAL ssh client. The far side's `mv` may already have run | A read that times out is retried for free | `execRemoteShell`, `src/main/machines/exec-plane.ts` |
| 3 | **The base can be arbitrarily stale.** A review tab is filled once by `loadRemoteDiff` and never refreshed. `worktreeTabsIn` in `src/renderer/editor/store.ts` excludes every tab with `remote !== undefined`, and there is no file watcher for a machine anywhere in this tree | A stale read is a stale picture. A stale write destroys the newer bytes | `worktreeTabsIn`, `src/renderer/editor/store.ts`; `refreshRepo`, `src/renderer/editor/tab-io.ts` |
| 4 | **An agent is editing that folder right now.** That is what the session on the machine is for. The person is reading the agent's work while the agent writes it | A read that loses the race shows an old file. A write that loses it deletes the agent's turn | the whole purpose of `openRemoteReview`, `src/renderer/app/session-actions.tsx` |
| 5 | **A truncated read becomes a truncating write.** `parseRemoteReviewPair` sets `truncated` when a side reaches `REMOTE_REVIEW_MAX_BYTES`, because the script uses `head -c "$3"`. Writing that buffer back would replace a 3 MB file with its first 2 MB | Reading the first 2 MB is a display cap | `parseRemoteReviewPair`, `src/main/machines/remote-review.ts`. Today `save` already refuses `tab.truncated`, and that refusal must survive any change |
| 6 | **A lossy decode round trip.** `holdsNul` sniffs only the first 8,192 bytes for a NUL. A file whose first NUL is past that is treated as text, `left.toString('utf8')` replaces every invalid sequence with U+FFFD, and writing it back destroys the file | An unreadable read renders as replacement characters and nothing is lost | `BINARY_SNIFF_BYTES` and `holdsNul`, `src/main/machines/remote-review.ts` |
| 7 | **`mv` replaces the inode, so mode, owner and any hard link go with it.** `umask 077` plus a fresh temporary file means a 755 file comes back 600 and stops being executable. 3 of the 1,452 tracked files in this repository are mode 755. The local save does not have this problem, because `fs.writeFile` in `src/main/fs/ipc.ts` truncates the existing inode | A read changes no metadata. `build/probe-remote-review.mjs` measures exactly that, comparing the size and modification time of every file under `.git` before and after | `IMAGE_PUT`'s `chmod 600 "$t"; mv "$t" "$f"`, `src/main/machines/remote-scripts.ts` |
| 8 | **Nothing on the path checks the path.** `machines:reviewFile` in `src/main/machines/ipc.ts` validates neither `repoPath` nor `path`, and the script itself has no containment, which I measured with a `../` path. Locally the picture is the same, because `fs:writeFile` in `src/main/fs/ipc.ts` only calls `resolvePath` and writes, while the Phase 12.9 operations in `src/main/fs/file-ops.ts` do prove containment in an open project root | An unchecked read of the person's own machine, under their own credentials, reveals nothing they could not already read. An unchecked write replaces anything that user can write | `machines:reviewFile` registrar, `src/main/machines/ipc.ts` |

Rows 1 and 2 are the pair worth stating plainly, because they are not fixable by
writing a better script. The exec plane can never know whether a command ran.
Every one of the seven scripts is safe under that uncertainty because a read that
may or may not have happened costs nothing. A save that may or may not have
happened is a person asking "is my work saved" and Tortie having no answer. The
checksum in `$3` is what turns that into an answerable question, because a
follow-up read settles it.

---

## Section 8. The three ways to carry the bytes

| Way | Cap on one file | Round trips per save | What it changes | Verdict |
| --- | --- | --- | --- | --- |
| An eighth script, bytes as one positional parameter | 97,593 bytes, computed in section 5 | 1 | `remote-scripts.ts` gains a row. `conformance-machines.mjs` conditions 35 and 38 change. `runRemoteWrite` already exists and needs nothing | **The only one that fits the existing shape.** Recommended if a save is built at all |
| The same script, bytes on the child's stdin | none from `MAX_ARG_STRLEN` | 1 | `execRemoteShell` must move from `execFile` to `spawn` and write stdin, since the promisified `execFile` gives no handle. The carriage already forwards stdin, because `shellCommand` in `context.ts` puts no `-n` and no `-T` on the argv. Gate condition 37 asserts a hostile value appears exactly once in the composed command as an argument, and a value on stdin appears zero times, so the gate needs a new class of parameter | **Removes the cap and is worth knowing about.** It is a second shape for the door, so it should not be built speculatively. Build it only when the 97,593 cap is measured to bite |
| `scp` or the `sftp` subsystem | none | 1 | a second program, a second argv, a second failure taxonomy, and a far sshd that has the subsystem enabled | **Rejected.** It is a second door with none of the catalogue's properties, no compare-and-swap, no marker protocol, and no gate that can read its text |

The point of the middle row is that the 97,593 cap is an artifact of using
`execFile`, not a property of ssh. That should be written down so a later round
does not treat the cap as a law of the transport.

---

## Section 9. The ruling, as work

| # | Work | Tier | Depends on a machine | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Make the read-only state honest. `readOnly` learns `tab.remote`, the banner gains a review arm, the File chip stops saying "Edit the file", and one sentence joins `machine-copy.ts` | Tier 1, gates plus one screenshot | No | **Do it in the next phase.** It is four small changes and it removes a defect where Tortie invites work and discards it |
| 2 | Put `repoPath` in the remote tab id, and add the two-repository test | Tier 1 | No | **Do it in the same commit.** It is one string |
| 3 | Open any file on the machine, reusing `review-file`, plus a branch so an unchanged file opens as a file rather than an empty diff | Tier 2 | Yes, for the latency number | **Do it, after the listing surface exists.** The editor half is small. It has no meaning without item 3's Explorer answer |
| 4 | A `file-get` script that returns only the working copy | Tier 2 | Yes | **Optional.** It halves the answer, measured at 195,840 characters per side for the largest file here. Defer until a latency number says it matters |
| 5 | A save, as the compare-and-swap script in section 5, with a size refusal at 97,593 bytes, a visible failure, and a follow-up read that settles rows 1 and 2 of section 7 | Tier 3, because it can destroy the person's work | Yes | **Do NOT build it in the same phase as item 3, and do not build it at all unless the operator asks.** It costs two conformance conditions, and the sentence it retires is the strongest one the machines layer has |

**Why I do not recommend the save on its own merits.** The person's job at a
review surface is to read what an agent did on another computer. When they want
to change something there, they have a session on that machine and they can tell
the agent. A save is Tortie writing into a folder that a process it started is
already writing into, with no watcher, no lock, and no way to know whether the
write landed. Every one of those three gaps is a fact about this tree that I
checked, not a preference.

**What would change my answer.** If the operator says he edits remote files by
hand and wants to keep doing it, item 5 is buildable and section 5 is the recipe.
It should then also carry the follow-up read, because without it Tortie cannot
answer "did it save".

---

## Section 10. What I did not measure

Listed so nothing here is silently trusted.

| # | Not measured | What would measure it |
| --- | --- | --- |
| 1 | **The round trip to a real machine.** No machine was contacted. The backlog itself records that Phase 83 never reached mac-pro, so the number this research was queued to depend on does not exist yet. Everything I timed was this Mac with the network removed | One `machines:reviewFile` call to mac-pro through `build/probe-remote-review.mjs` pointed at a real host, timed 20 times, reporting the median and the spread. Do it once with the control client running, so the ControlMaster socket is warm, and once after 90 s of idleness so the master has expired past `ControlPersist=60s`. The two numbers are different designs |
| 2 | **`MAX_ARG_STRLEN` on Linux.** The 131,072 that produces the 97,593 cap is the kernel's documented constant. `remote-scripts.ts` already says no Linux machine was contacted, and I did not contact one either. This Mac's own limit is 1,048,576 bytes on the whole invocation | Compose a command of 131,000 bytes and one of 132,000 bytes and send both to a Linux machine, recording which one the login shell refuses |
| 3 | **The `mv` metadata loss in row 7 of section 7.** I read the script text and counted the 3 executable files, and I did not perform a write. Performing one needs scratch files, and I was told to write nothing outside this directory | `stat -f '%p %u'` on a 755 file, run the `image-put` shape against it, `stat` again. Under `build/probe-remote-review.mjs`'s own safety rules, in a repository the probe made |
| 4 | **Whether a person actually types into a review tab.** I read every line of the path and it is open. I did not drive the real app | Open a review tab against a machine, press the File chip, type, press cmd-S, and read the screenshot. That is the Tier 2 probe for item 1 of section 9 |
| 5 | **How many changed files a real remote working tree holds.** The 13.2% in section 4 comes from this repository's 303 commits, which is a proxy for a working tree and an unusually large one, since a whole phase lands in a single commit here | `git status --porcelain=v2` on mac-pro's working folder, sampled while an agent is running there |
| 6 | **Whether the far side is BSD or GNU.** The scripts try both spellings of `stat`, `base64` and `shasum`, and I ran only the BSD arm because this Mac answers first | The same probe on a Linux machine, recording which arm answered |
| 7 | **The cost of the review menu itself.** I timed the far side's `review-list` at 0.02 s and did not time the native popup with 30 rows | A screenshot read with a timer, at Tier 2 |
