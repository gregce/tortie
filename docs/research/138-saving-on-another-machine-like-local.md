# 138. Saving on another machine like local: what replaces the typed folder

Written 4 October 2026 against the tree at `03a1b42c` ("docs(backlog): queue remote saving that behaves like
local"). This is documents only. No Electron and no Simulator was started, no model turn was spent, nothing was
installed, and no real host was reached, his Mac Pro included. The one far side anybody used was the loopback
machine from `build/scratch-machine.mjs`, on scratch sockets, with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`
and `TERM_SESSION_ID` unset, and every process was ended afterwards. Other far-side measurements ran the shipping
script texts under `/bin/sh` over scratch trees on this Mac, which is what the loopback machine runs. Nothing of his
was read beyond a count of one key in his `machines.json`. Scripts and outputs are in the session's scratchpad under
`p336r/`, and are not in the tree.

The round. Four investigators each owned a lens: the write path as built (tree), what the write root protects
(threat), why it is shaped as it is (history), and what other editors do (prior art). Four designers then each
proposed an architecture, called parity, one-press, smallest and strongest. Adversaries attacked each design three
times, on containment, on trust and on regressions against today. A judge ruled. A fact checker then re-read every
tree claim the ruling rests on and re-ran the ones that could be run. This document uses only claims the fact check
confirmed or corrected, and the judge's ruling. The writer also checked 3 things: the five call sites of the write
gate, the renderer files that read the write root, and the count of tracked files over the remote save cap. Section 7
lists what was corrected and what nobody could confirm, so no later round re-derives it.

This answers his words of 4 October 2026, "behave similar to local...", and the four questions in Phase 336's entry
(`docs/BACKLOG.md:39639-39698`). The build lane follows it at Tier 3.

## 1. The answer first

Saving on another machine can work in the projects he opens there without a trip to Settings, but not with nothing
asked at all. The first time he picks a folder by hand in the "Open a folder on a machine" window, it shows the folder
Tortie would save in, with any link resolved so he sees where it really is, and one press lets Tortie save there and
in every folder inside it. A project opened any other way, from recents, Home, a session or a restore, opens read
only and offers the same press. The grant is a new hashed field on the machine row, so an agent that edits Tortie's
files cannot make one: the edit moves the machine's hash and Tortie stops connecting until he confirms again. Every
write checks, on that machine and in the same call, that the folder is still the folder he agreed to. Whatever shape
is chosen, three faults in today's code must be fixed in the same phase: the far side's check for a repository's
metadata folder is case-sensitive and the save has none, a write root that is itself a link is followed, and a remote
project row widens the file gate on his Mac. Against it: this limits what Tortie itself writes. It is not a wall
against a program already running as him, which can already use Tortie's key file and Tortie's open ssh connection.

## 2. The threat, and what the write root protects today

### 2.1 How a write on another machine is gated

Five call sites ask the write gate, `confirmedWriteRoot` (`src/main/machines/remote-file.ts:235-254`):

| Verb | Call site | Answer with writes off |
| --- | --- | --- |
| Save | `remote-file.ts:310` | `writesOff` |
| New folder | `remote-entry.ts:252` | `writesOff` |
| Rename | `remote-entry.ts:361` | `writesOff` |
| Stage and unstage | `remote-stage.ts:536` | `writesOff` |
| Commit | `remote-commit.ts:407` | `refused`, with the sentence `commitWritesOff` (`remote-copy.ts:1045-1049`) |

The writer listed the sites with grep: exactly these five. They cover 6 of the 8 far-side write scripts. The gate
runs in this order: the row must be in the machines file, then `assertMachineMayConnect` checks the machine's hash
(`confirm.ts:653`), then a row with no `writeRoot` answers null and nothing is composed or sent. The tree investigator
drove every verb with writes off on the loopback machine: each sent no ssh at all and the far file stayed unchanged.
With writes on, the same verbs answered `wrote` (contents compared first), `made`, `moved`, `done` and `committed`,
and a save over a stale checksum answered `stale`.

The gate reads the in-memory snapshot of the machines file (`store.ts:154-161`), which a watcher refreshes about
300 ms after the file changes (`store.ts:428-449`). The header comment at `remote-file.ts:27-33` says it reads the
row on disk at call time. It does not.

`writeRoot` is the sixth execution-bearing field of the machine hash `sha256-machine-exec-v1` (`confirm.ts:239`). It
is the second key on `APPENDED_KEYS` (`confirm.ts:233-236`), and an appended key enters the hash text only when its
value is a non-empty string (`confirm.ts:289-291`). So a row with no root still hashes to the pin
`dbd8aa39…5d46` (`build/conformance-machines.mjs:2627-2628`). The fact checker measured that with a plain node
reimplementation. The history investigator measured `f09ddd90…9e66` for a root of `/Users/gdc`, with a
reimplementation of its own and with the shipping function. `writeRootField` (`schema.ts:233-251`) refuses a
relative path, a `..` step and a trailing slash. It accepts `/` and `.` steps (measured).

Two remote writes never ask the gate. The picture drop writes only under `~/.tortie/images`, with a name made from
the picture's checksum (`remote-image.ts:338-348`). A clone writes into a folder that must not exist yet, and main
checks only that its path is absolute (`remote-clone.ts:282-287`). Both use a registered machine context, which passed
the confirm gate when it was built (`context.ts:452`, `ready-context.ts:35`), and neither asks again at the press.
`remote-run.ts:229-237` says plainly that the script door itself has no gate.

"Stop Tortie saving files here" withdraws the machine's whole confirmation: `MachineRow.tsx:366-368` calls
`machines:forget` (`ipc.ts:878-893`), which clears the root and deletes the record (`confirm.ts:796-803`). The row
then reads `never` (`confirm.ts:561`).

He has never set a root. A count-only read of his `machines.json` found 0 `"writeRoot"` keys, last modified 18 August
2026.

### 2.2 Who can write the state this feature reads

| State | Where | What guards it |
| --- | --- | --- |
| Machine rows, `writeRoot` among them | `<userData>/gmux/config/machines.json`, written with a temp file and a rename and no mode (`store.ts:317-323`). His file is mode 644 | Nothing on the file. A row works only while a sealed confirmation covers its hash |
| Confirmations | `<userData>/gmux/config-confirmations.json`, sealed with `safeStorage` (`src/main/config/confirm-record.ts:92`) | The seal. A process running as him cannot make one without the keychain, which is the code's claim and was not measured. Putting back an old sealed copy works, an admitted limit (`src/main/config/seal.ts:35-43`) |
| Remote project rows | `remote_projects` in `<userData>/gmux/manifest.db`, keyed on machine and path text, with no device or inode (`src/main/manifest/schema.ts:462-469`) | Nothing. The manifest is SQLite in WAL mode (`manifest/store.ts:212`), with no exclusive lock in `src/main/manifest`. `listProjects` adds remote rows with no check (`projects-repository.ts:153-159`) |
| Recents | `<userData>/recents.json`. A remote row opens a folder on that machine (`src/main/ipc.ts:203-215`) | Nothing |
| Tortie's ssh key | `<userData>/gmux/machines/keys/machine-<12 hex>`, ed25519, no passphrase, file 0600 (`key-material.ts:91-94, 346-354`) | His account's file permissions |
| Tortie's shared ssh connection | A control socket in a 0700 folder under his own temp folder (`ssh.ts:157-225`), kept 60 s after the last use (`ssh.ts:71`) and held while the machine is connected (`control-plane.ts:1-30`) | His account only |

Measured. On a scratch database, a second SQLite connection inserted a remote project row while another held a read
open (exit 0). The open reader still saw the old count and its next read saw the new row, and `listProjects` holds no
long read, so for Tortie the row appears at once. The threat investigator measured the three files landing at mode
644 on scratch copies.

### 2.3 What the write root really protects

The entry's premise is that Tortie's ssh write is a privilege an agent on his Mac may not have
(`docs/BACKLOG.md:39667-39670`). The round found that mostly false while a machine is connected.

- Tortie's own key has no passphrase and any process running as him can read it. `IdentitiesOnly` is deliberately
  not set, so Tortie's ssh also offers keys he loaded into his own ssh agent (`ssh.ts:245-263`).
- Tortie's shared connection can be used with no key at all. The fact checker measured it on the loopback machine: a
  client holding no key and no agent ran a command on the far side through Tortie's live connection, and the same
  client with connection sharing turned off was refused at sign-in.

So against a program already running as him, the write root bounds nothing. What it does bound is Tortie's own blast
radius: a bug, a confused-deputy path or a wrong press in Tortie cannot rewrite his whole remote home. That is worth
keeping, and it is the form refusal 8 takes in this domain. A configuration an agent can write must not widen what
Tortie itself will do on another computer. This document says that in words so that no later round claims more for
the bound than this.

The entry's description of local saving needs one correction too. On his Mac, file operations are bounded by the open
projects: a guarded save, create, rename, move and trash all ask one gate (`src/main/fs/paths.ts:424-454`,
`file-ops.ts:292-297`). But a ⌘S of a file outside every project goes through the plain door `fs:writeFile`
(`src/main/fs/ipc.ts:250-267`), which the editor reaches for exactly that case (`tab-io.ts:1177`, `1348-1349`). So
"similar to local" means file operations inside the opened projects with nothing asked. No design in this round
proposes saving anywhere on another machine, and none should.

### 2.4 What other editors do

In every product surveyed, connecting is the grant. A person's own save on a remote host is bounded only by the ssh
sign-in and the remote account's file permissions:

- VS Code Remote-SSH reaches "files and folders anywhere on the remote filesystem". In its Restricted Mode "text
  editing is always supported", while agents, terminals, tasks, debugging and extensions are off.
- Zed keys trust per host by the host's name, and its trust check compares path components.
- JetBrains' trust dialog and Safe Mode stop builds and scripts, not editing. Nova's remote path is a starting
  folder. Coder grants per workspace.

The trust prompts these products have gate running code, not writing. The bounds they built are for agent writes, and
they converged on "the opened folder is writable, with protected folders inside it": Codex protects `.git` and
`.agents`, Zed protects Git metadata, and Cursor protects named paths. None of them protects its own trust record from
a writer running as the same user: Zed's is a plain SQLite row and VS Code's is shared application storage. That was
read from their source and was not measured as an attack. Tortie's typed write root is already stricter than all of
them.

The attacks these products met set the requirements for Tortie's bound:

- trust recorded against content, not a name (CVE-2025-54136)
- a writable root an agent cannot steer (CVE-2026-50548)
- a path comparison on a separator, not a prefix (CVE-2025-54794)
- no fall back to writing when a path cannot be resolved (CVE-2026-50549)
- links resolved or refused, never trusted, because a link disguised as an ordinary name sent writes into a person's
  ssh folder in six products (GhostApproval)
- a reserved-name check that holds on a case-insensitive volume (CVE-2025-59944)
- protected metadata inside the root, because an agent that writes a repository's metadata can escape (CVE-2026-26268)

### 2.5 Faults already in the tree

These exist today, whichever design is chosen.

1. A root that is itself a link is followed. The far side's link check starts below the root and never examines the
   root or its ancestors (`remote-scripts.ts:2421-2441`). The fact checker and the history investigator measured the
   shipping scripts over scratch trees: with a root that is a link, or that ends in one, a save and a new folder land
   in the folder the link names, and staging with the tab at the root stages in the outside repository. The Phase 242
   and 242.1 shapes, a link below the root, are still refused. Today this is reachable only through a root he
   confirms, and Phase 229 allowed a linked root on purpose (`docs/BACKLOG.md:23584-23591`). If a project's stored
   folder simply became the root, the part below the root would be empty, the check would examine nothing, and the
   242.1 escape would reopen. The fix is the folder identity check in section 4.3.
2. A repository's metadata folder is not protected the way it is locally. The save script has no refusal for `.git`
   at all (`remote-scripts.ts:2584-2587`), and main has none either. The new-folder, rename and staged-path guards
   refuse it, but compare case-sensitively (`remote-scripts.ts:2701-2706, 2919-2920`). Local folds case
   (`src/shared/fs-ops.ts:56-60`), because a case variant once cost a whole history (`fs-ops.ts:40-50`). The tree
   investigator and the fact checker measured a save replacing and creating files inside a repository's metadata
   folder. An adversary measured, on a case-insensitive volume, a case variant of the name reaching the real metadata
   folder through the shipping new-folder script too. Git can be made to act on what lands there, so a write there
   can become a program running on that machine on an ordinary git read. The fix folds case for the name match in
   every writer, on both sides.
3. A far-side refusal is reported as a write that may have happened. The new-folder guard exits with no answer, and
   main says the folder "may have been made" (`remote-entry.ts:271-282`). Nothing was made. This misleads but does
   not escape, and it is worth fixing alongside item 2.
4. Remote project rows appear with no human act. `rehomeRemoteSessions` runs on every feed event
   (`remote-rehome.ts:160-258`, called near `core.ts:1310`). Both its inputs come from tmux state on the far machine,
   the session's project option and its working folder (`remote-sessions.ts:393-396, 989-990, 2694-2695`), and any
   session carrying a non-empty Tortie id is treated as Tortie's own (`remote-sessions.ts:2666`). Measured: an
   ordinary tmux client on a scratch socket could change that project option, and a feed session reporting `/` made a
   project row at `/`. A project opened by hand stores the far side's echo of the path, only trimmed
   (`core.ts:3958`, `dir-list.ts:117`), and that echo keeps `..` steps, links and `/` as written. So a project row is
   never evidence that he chose a folder.
5. A remote project row widens the file gate on his Mac. Three readers turn `listProjects()` into a list of local
   roots with no machine attached: `src/main/fs/ipc.ts:124-127` (file operations), `:150-153` (drag out) and
   `src/main/fs/open-with.ts:604-606`. Measured with the shipping `writeGuarded`: with no rows it refused
   (`projectClosed`); a remote row naming a folder on this Mac let it write there; and a feed row at `/` let it write
   with a root of `/`. No renderer path sends a remote path to `fs:writeGuarded` today, so this is latent. The fix
   makes those three readers take local rows only.
6. The gate's own account of itself is stale. `conformance:machines` prints "Eight callers each ask
   confirmedWriteRoot" (`build/conformance-machines.mjs:8108-8109`). There are five call sites covering six scripts.

## 3. The four architectures and how each fared

The judge's rule: an architecture with a surviving fatal attack is refused.

| Design | The human act | Where the grant lives | Fatal attacks | Outcome |
| --- | --- | --- | --- | --- |
| parity | Opening a folder through any of Tortie's doors on a confirmed machine | A per-folder record in the sealed confirmation file, with the folder's device and inode pinned at the open | 1 of 3 | Refused |
| one-press | One press on the machine's confirm sheet, pre-filled with the opened folder, the first time | A seventh appended key on the machine row, `writeFolders`, sealed by the machine hash | 0 of 3 | Chosen as the base, with grafts |
| smallest | A box in the open dialog that sets today's `writeRoot` | `writeRoot`, unchanged | 2 of 3 | Refused |
| strongest | A sheet at the open whose first button is "Open and allow saving", with a fallback sheet at the first write | A per-project record in the sealed file, bound to the machine hash, the path and the folder's device and inode | 1 of 3 | Refused as a base, two ideas grafted |

### 3.1 Parity: the open is the grant

Opening a folder on a confirmed machine, through the open window, a recents row, Go to Session or Restore, makes main
mint a sealed per-folder grant. Each write compares the folder's identity with the pin taken at the open.

The fatal attack: its metadata refusal stayed case-sensitive, so on his own case-insensitive boot volume a write could
still land in a repository's real metadata folder, and from there git can be made to run a program on that machine.
An adversary measured this on two APFS volumes. A second route: a folder whose name hides a link to a sensitive
folder is pinned and granted by the open, with nothing on screen saying where it leads. And it is a regression: the
clicks that give a read-only tab today, recents and a session's folder among them, would mint a lasting write grant.

### 3.2 One-press

The first time he opens a given folder by hand, main draws the machine's confirm sheet with one new line naming the
folder. One press adds it to `writeFolders`, which the machine hash covers, and later opens of that folder or any
folder inside it ask nothing. Each write walked every component of the agreed folder from `/` and refused a link
anywhere.

No attack was fatal, but three majors were shared with the designs that died of them:

- its metadata check was case-sensitive, as parity's was
- its walk from `/` closed the link escape but refused any folder with a link anywhere above it. Folders reached
  through a link save today, such as those under `/tmp`, in a cloud-storage home, and the linked projects of Phases
  229 and 273. An adversary measured the regression
- the sheet could be pre-filled from recents and Home, which an agent can write

Its attackers found two more faults:

- the save sheet could re-confirm a machine whose details an agent had changed, so it could become a back door for
  the machine's own confirmation
- its "New since you last agreed" marker named one planted folder, but nothing for two planted folders or a swap
  (measured: an empty list). That gives false reassurance on the very sheet that seals a plant

### 3.3 Smallest: keep `writeRoot`, move the press

`writeRoot` stays as it is, with the far-side scripts byte for byte. The open dialog gains an unticked box that draws
today's write sheet for the folder being opened.

Two fatal attacks. First, the scripts keep trusting the root's spelling, so a link planted at the granted folder's
path, with no new press, sends every write to the folder the link names. In the adversary's case the link named
`~/.ssh`, and the write answered `wrote`. Second, one root per machine cannot let two projects in unrelated trees
both save. Widening the root grants folders nobody opened. Replacing it makes the first project stop saving the
moment the second opens. Both were measured against the design's own offer rule.

### 3.4 Strongest: a sealed grant per project

Each grant is its own sealed record, hashed over the machine's current hash, the folder's path and its device and
inode. It is minted from a sheet at the open or at the first write.

The fatal attack is a confused deputy. The sheet could be pre-filled from recents, the manifest or a session's folder
after a rehome, all of which an agent can write. "Allow saving" was the button Enter pressed, and there was no refusal
of a home folder. So his press would seal a folder an agent chose.

Three further weaknesses:

- binding each grant to the whole machine hash orphans every grant when he accepts a new tmux version or changes
  saving, and a forget followed by a re-confirm can bring old records back
- it also walked from `/`, with the same regression as one-press
- it asked `stat` in the BSD spelling first, which the tree's own comment says puts garbage into the answer on Linux
  (`remote-scripts.ts:2229-2238`)

Two of its ideas survive and are grafted: the folder's identity taken on the far side and compared at every write,
and the resolved folder shown on the sheet before the press.

## 4. The ruling: a hardened one-press

One-press is the only design with no surviving fatal, and its grant shape is the strongest on its own merits. A set
of folders lets two projects in unrelated trees both save, which one `writeRoot` cannot. Because the folders are
fields on the row, accepting a new tmux version re-hashes them with the row, where strongest's separate records would
be orphaned. But as written it shared three mechanisms that were fatal elsewhere, so it ships only with the grafts
below. With them, the judge found no fatal left, and refusal 8 holds on the same ground today's machine confirmation
holds: the seal.

### 4.1 The grant

- A new optional field `writeFolders` on the machine row (`src/shared/machines.ts:214`, `MACHINE_ROW_KEYS`) and on
  `MachineExecutionFields`, appended to `APPENDED_KEYS` after `writeRoot` (`confirm.ts:233-236`).
- Its value is one non-empty string: each folder as its absolute path, then a NUL character, then its far-side
  `<dev>:<ino>`, with the entries sorted bytewise and joined by newlines. It must be a string because a list falls out
  of the hash silently (measured by the history investigator on the shipping function).
- A row with no folders emits no key, so it still hashes to the condition 42 pin, and no machine anyone has confirmed
  is asked again.
- `schema.ts` gains `writeFoldersField`: sorted, unique, at most 32 folders, no control characters, and no folder
  equal to `writeRoot`. A new grant refuses `/`, a home folder, a folder directly inside a home folder, and any path
  with fewer than 3 components. Those refusals apply to new grants only, at the press. If the loader applied them, a
  row someone already confirmed with `writeRoot` set to `/` would be dropped whole and its machine would stop
  connecting.

### 4.2 The gate in main

A new module, `src/main/machines/write-grant.ts`, exports `agreedFolderFor(machineId, target)`. It replaces
`confirmedWriteRoot` at the five call sites in section 2.1. Its order:

1. The row must be in the machines file.
2. `assertMachineMayConnect` checks the hash, unchanged and first, so opening a project can never stand in for
   confirming the machine.
3. The candidates are the legacy `writeRoot`, if present, and each `writeFolders` entry.
4. The longest candidate that holds the target wins, by today's text comparisons (`relativeUnderRoot`,
   `remote-file.ts:203-212`; `rootHolds` and `rootRelativeCwd`, `remote-stage.ts:249-288`), with no case fold and no
   normalisation. If none holds it, the answer is `writesOff`.

It returns a branded `WriteGrant` carrying the folder's stored path and stored identity, and `runRemoteWrite` in
`remote-run.ts` requires the brand. That turns today's "discipline rather than a door" (`remote-run.ts:231-236`)
into a type the compiler checks.

### 4.3 The folder's identity on the far side

At the grant press, a new read script resolves the chosen folder and prints the device and inode of the folder it
names, taken through the folder itself rather than through any link to it. It asks `stat` in the GNU spelling first,
the order `remote-scripts.ts:2302-2305` already uses for the reason given at `remote-scripts.ts:2229-2238`.

Every write script (save, new folder, rename, stage, unstage and commit) takes the stored identity as one more
positional argument. Before the existing link walk, a prelude asks the identity again in the same call. On any
mismatch it prints a new answer word, `regrant`, and writes nothing. Main maps `regrant` to `writesOff` carrying a
prompt to grant the folder again. It must not reuse `outside`, and must not reuse `moved`: the commit script already
answers `moved` when the branch moved (`remote-scripts.ts:3172-3174`), and Tortie draws that as "something else
committed, press Refresh", which would be false here and which Refresh could never clear. An adversary measured that
collision through the shipping commit answer parser.

The check covers the leaf alone, by identity. A folder swapped for a link, or for a different real folder, changes
the identity and is caught. A project legitimately reached through a linked ancestor keeps saving, because its
identity is the same folder every time. An adversary measured this narrower check against the walk from `/`. The link
walk below the root, the leaf and staged-name link checks, the unlink and exclusive create, and the rest of the 242,
242.1 and 242.2 family all stay. The walk from `/` is not added.

This overrides one constraint the history investigator found in the 242 family, which was "no new outcome word, so
the contract baseline stays byte identical". The ruling needs a word that cannot be read as an existing outcome, so
the baseline moves on purpose (obligation 3).

### 4.4 Reserved names

- The save script gains the `.git` refusal it lacks (`remote-scripts.ts:2584-2587`).
- The save, new-folder, rename and staged-path guards (`remote-scripts.ts:2701-2706, 2919-2920`) refuse `.git` and
  `.ssh` in any case. They use POSIX bracket classes, matching local's folded `isProtectedFsPath`
  (`fs-ops.ts:56-60`).
- Main asks `isProtectedFsPath` before it composes anything.
- These refusals hold in every write script whatever the root, so a wrongly granted root cannot widen them.
- Stage and commit still write the repository's metadata, because that is what git does.

This is a match on a name, and it is distinct from `conformance:samefolder` rule 23, which forbids case-folding a
comparison of what a folder is. No folder identity is decided by case.

### 4.5 The human act

- The grant is offered in the "Open a folder on a machine" window (`src/renderer/app/RemoteProjectModal.tsx`).
- It is pre-filled only from a path he typed or picked in that window, in that same turn.
- The sheet names the resolved folder, so a folder whose name hides a link is shown as the folder it leads to.
- The first button is "Open read-only", with "Open and allow saving" second. Enter does not press the grant.
- Main supplies `MACHINE_CONFIRM_ACKNOWLEDGEMENT` (`confirm.ts:687-688`). The renderer never sends it.

Every other door opens read only and offers a native menu item, "Let Tortie Save Here…", which reopens the picker
so he chooses the folder again and sees where it leads. That covers recents rows, Home, Go to Session, a restore, a tab
after a rehome, and the first save in a read-only tab. `rehomeRemoteSessions` never mints a grant.

`machines:writeSheet` and `machines:allowWrites` (`src/main/machines/ipc.ts:783-848`) refuse unless the row is
`confirmed` at that instant. A changed machine goes to its own confirm sheet with its own label, so the save sheet
can never re-confirm a host, port or folder an agent planted. `machines:allowWrites` appends to `writeFolders`, and
rolls back if the seal fails.

### 4.6 The renderer

Main tells the renderer, per project and per tab, whether Tortie may save there, as a new field on the project view.
The contract baseline is regenerated.

The judge named these gates to re-point from the per-machine root to that fact. The writer read three of them today,
`tab-readonly.ts`, `ScmSection.tsx` and `machines-slice.ts`, and took the rest from the judge:

- `tab-readonly.ts:45-59`
- `MonacoHost.tsx:232-237`
- `store.ts:1565-1569`
- `Sidebar.tsx:167-176`
- `FilesSection.tsx:164-180`
- `FileTree.tsx:189-192`
- `ScmSection.tsx:828-829`
- `machines-slice.ts:252-257`
- the writes-off sentences in `editor.ts`, `explorer.ts`, `scm.ts` and `remote-copy.ts`'s `commitWritesOff`
- the toast in `tab-io.ts`

That list is incomplete. The writer's grep found 18 production files under `src/renderer` that read the write root
today. They include `use-tree-model.ts`, `remote-bridge.ts`, `use-tree-rename.ts`, `use-tree-menu.ts`, `tree-ops.ts`,
`EditorPanel.tsx` and `machines-store.ts`, so the build derives its list by grep rather than from this document. The
sentences also need new words, because an adversary measured one-press's sentences still sending him to Settings ›
Machines.

A file over the save cap must open read only. Today, once saving is on, a remote file over 90,000 bytes is refused
outright rather than opened (`tab-io.ts:593-627`), although the read cap is 2,097,152 bytes. With saving off it opens
read only. Turning saving on must not take reads away. In this tree alone, 177 tracked files are over 90,000 bytes
and within the read cap.

### 4.7 The companion fix on his Mac

The three readers in section 2.5 item 5 (`src/main/fs/ipc.ts:126`, `:152`, `src/main/fs/open-with.ts:606`) take only
rows with no machine. Then a remote project row, or a rehomed folder at `/`, can no longer widen the local guarded
save, drag out or Open With. The picture drop and clone stay gated by a confirmed machine and outside the folder bound
(section 4.10, question 4).

### 4.8 The contract and the gate

`build/conformance-machines.mjs` gains conditions, each with an ablation that must read red over an in-memory copy
with that rule broken:

- the seventh key in the hash
- the identity taken at the grant and compared at every write
- the case-folded refusals in every writer, the save included
- a grant minted only from the hand-chosen door
- the changed-machine guard
- the local readers' machine filter

It also corrects the "Eight callers" sentence to five call sites covering six scripts.
`docs/audits/contract-baseline.txt` is regenerated in the same commit, and the commit body names the lines that
moved.

### 4.9 What was refused from each design

| Refused | Why |
| --- | --- |
| Parity as a base | Its surviving fatal (section 3.1), and minting write grants from clicks that give read-only tabs today, which is a regression |
| Smallest as a base | Its two surviving fatals (section 3.3) |
| Strongest as a base | Its confused deputy (section 3.4). Also its whole-hash binding, which orphans grants, its walk from `/`, and its BSD-first `stat` |
| One-press's walk from `/` | It refuses folders reached through a link that save today, and is weaker than the identity check for the same safety |
| One-press's "New since you last agreed" marker | Blind to two planted folders and to a swap. The re-confirm sheet draws the whole folder list instead |
| Reusing `moved` or `outside` for an identity mismatch | It would be drawn as a different, false outcome (section 4.3) |
| Refusing a file open because of the save cap | It would take away reads he has today (section 4.6) |

### 4.10 The entry's four questions, answered

1. What human act stands in for the typed folder and the sheet: one press on a sheet that names the resolved folder,
   offered in the open window and pre-filled only from a folder he chose by hand there. It is closest to the entry's
   candidate (b), recorded on the machine row as a sealed field.
2. What bounds a write: the agreed folder, by the longest one that holds the target, compared as text in main. On the
   far side, the folder's identity is checked again in the same call as the write, the existing link walk runs below
   the folder, and the reserved names are refused in any case.
3. What happens to an existing `writeRoot`: it stays as one more allowed folder. Its hash is unchanged and nobody is
   asked again. It has no stored identity, so it keeps today's bound, and the linked-root fault in section 2.5 item 1
   still applies to it. Today he has none.
4. Whether the four verbs and the picture drop share one answer: no. The picture drop writes only a checksum-named
   file under `~/.tortie/images` and already refuses links (Phase 242.2), and a clone makes a folder that does not
   exist yet, which a folder bound cannot hold. Both stay gated by a confirmed machine and outside the folder bound,
   said in section 4.11.

### 4.11 What is not in this phase

- No change to how a session on another machine runs or scrolls. No change to confirming a machine, beyond the guard
  that keeps the save sheet from re-confirming one.
- No write outside an agreed folder, except under an existing `writeRoot`.
- The picture drop and clone stay outside the folder bound (question 4).
- Stage and commit still bound the tab's folder, not the repository root. A repository rooted above the agreed folder
  lets any path git reports be staged. That is 242.1's accepted trade (`remote-stage.ts:63-75`).
- Not a wall against a program that already holds his ssh credentials or Tortie's live connection (section 2.3).
- No remote conversation reading, needs-input detection or phone reply for remote sessions.
- No release.

## 5. The proof the build must produce

Tier 3: the gates, real data, and two independent methods, one an attack, with a fix round and an independent
reverify if any verdict is needs_work.

- `conformance:machines` at exit 0, with the new conditions and their ablations (section 4.8). A row with no
  `writeFolders` still hashes to `dbd8aa39…5d46`.
- The hostile cases on the loopback machine, each refused on its own reason word:
  - a folder that is a link to `~/.ssh` is shown as `~/.ssh` at the press, and if granted anyway is held to that
    folder's identity
  - the same folder swapped for a link after the grant answers `regrant` and writes nothing
  - a reserved metadata name in another case is refused on a case-insensitive far volume, at the metadata folder and
    inside it
  - a project row written straight into the manifest and a rehomed folder at `/` mint no grant and do not widen the
    local gate
  - a project on an unconfirmed machine is refused with "nobody has confirmed it"
- No regression through a linked ancestor, side by side at the parent and at HEAD: in a project reached through a
  linked ancestor (`/tmp`, or a planted link above the folder), a save, a new folder and a stage answer `wrote`,
  `made` and `done` at HEAD as they do at the parent.
- The 242 family re-run against the new bound: the arms a5, a5a to a5d, a8, a8a, a9, a10, a11 and a12, and 242.2's
  six-shape matrix, plus a new arm for a folder that is itself a link and one that ends in one.
- The four verbs in an opened project on the loopback machine and on his Mac Pro: at the parent, refused with writes
  off; at HEAD, a save with contents compared first, a rename, a new folder, a stage and a commit all succeed. A second
  project in an unrelated tree on the same machine also saves, which one `writeRoot` cannot do.
- A Linux far side for the identity check, as a per-row matrix: the GNU-first `stat` gives a clean device and inode,
  and a dropped or repointed link on ext4 is caught. This claim works across machines, so APFS alone does not prove
  it.
- One Electron probe for the renderer. After one grant press:
  - the editor takes a keystroke, the create buttons enable, Commit enables and a save writes
  - a 150 KB file in an agreed folder opens read only rather than being refused
  - a project opened from recents is read only, and "Let Tortie Save Here…" reopens the picker
  - no writes-off sentence names a Settings path that no longer applies
- A downgrade test. An adversary measured today's build against a row carrying `writeFolders`: it refused the row at
  boot as a field it does not know (`schema.ts:114-122`). When it next wrote the file, for an unrelated version
  accept, it deleted the row, because the store writes only the rows it loaded (`store.ts:317-323, 335-338`).
  Builds from this phase on must keep a row they refuse on disk when they write the file, without honouring or
  merging it. That is still the house rule that an invalid row is dropped whole from use. No change can reach a build
  already released, so a build at or before `03a1b42c` sharing the data directory would still delete the grant. The
  commit body must say so.

## 6. Questions for him

1. Phase 336 reopens your Decision 1 of 19 August 2026, where you chose a per-machine typed field over a per-folder
   confirmation (`docs/BACKLOG.md:8305-8340`). The hardened design is a per-folder confirmation whose surface is the
   open itself. A folder you pick by hand shows one sheet naming the folder it really is, and one press lets Tortie
   save there. A project opened any other way opens read only and offers the same sheet. Do you want Decision 1
   reopened this way? Recommended: yes. It is the only shape that is both similar to local and safe against an agent
   choosing the folder you approve.
2. How literally should "behave similar to local" be read? Local asks nothing. The only remote design that asks
   nothing is a grant an agent could make, and every adversary refuted it. The hardened design asks one press the
   first time you grant a folder tree, and a parent folder covers every folder inside it, so a whole tree costs one
   press. Is one press per tree acceptable, or do you want zero, which means accepting a grant an agent can make?
   Recommended: one press per tree, with a parent covering its children.
3. The picture drop and clone do not share the four verbs' answer (section 4.10, question 4). The design keeps both
   gated by a confirmed machine but outside the folder bound, and says so plainly. Accept that, or make them need a
   folder grant too? Recommended: keep them gated by the machine only. A folder grant buys nothing for either, and it
   would stop a picture being dropped into a read-only session, which works today.

## 7. What could not be confirmed

### 7.1 Refuted or corrected, and not used as first stated

| Claim before the attack | What the attack found |
| --- | --- |
| The picture drop answers `writesOff` (the round's own brief) | It never reads `writeRoot`. Nor does clone. The entry itself only asks whether they share one answer |
| "Eight callers each ask confirmedWriteRoot" (`conformance-machines.mjs:8108`) | Five call sites, covering 6 of 8 scripts |
| The write gate reads the row on disk at call time (`remote-file.ts:27-33`) | It reads the in-memory snapshot, which the watcher refreshes about 300 ms after a change |
| A planted manifest row is visible "at once" | An open reader keeps the old count until its next read. `listProjects` holds no long read, so the effect is the same |
| "Stop Tortie saving files here" leaves the row `changed` (research 85 §4.5) | The row reads `never` (`confirm.ts:561`) |
| A project row stores "the machine's OWN resolution" (comment in `core.ts`) | It stores the far side's echo, only trimmed (`dir-list.ts:117`) |
| On his Mac, Tortie saves only inside opened projects | File operations are bounded. A ⌘S outside every project goes through the plain door with no project check |
| Tortie's ssh write is a privilege an agent may not have | While a machine is connected, a program with no key can use Tortie's shared connection, and Tortie's key file is readable by his account |
| A list of roots falls out of the hash silently | True of the hash function. The file loader refuses a list and drops the whole row |
| 99 tracked files lie between the save cap and the read cap | 177 (`git ls-files` sizes over 90,000 and up to 2,097,152 bytes, run again by the writer) |
| Refuse `/` in `writeRootField` | Only for new grants. In the loader it would drop an already-confirmed row whole |
| A downgrade can be fixed by preserving unknown keys | Only in builds from this phase on. A released build deletes the row on its next write |
| Strongest's BSD-first `stat` order | Wrong on Linux, by the tree's own comment (`remote-scripts.ts:2229-2238`) |
| The judge's list of renderer gates is the whole list | 18 production renderer files read the write root |
| Cursor's open-folder autorun is CVE-2026-32202 | MITRE says that CVE is Windows Shell spoofing. No verified CVE exists for the Cursor flaw |
| CVE-2025-58335 is a Junie configuration attack | MITRE describes an information disclosure |
| Claude Code asks before writing outside its folder, in every mode | The quoted sentence applies "In Manual mode" |

### 7.2 Could not be confirmed

- The seal's real resistance to a forge by a process running as him. Nobody read the keychain, by rule. The refusal
  8 argument rests on it exactly as today's machine confirmation does, so the design adds no new wall and no new
  weakness. An old genuine sealed file can be put back (`seal.ts:35-43`).
- Device and inode identity on Linux. It was measured only on APFS. ext4 and XFS reuse inode numbers readily, which
  could let a stale pin pass for a folder deleted and made again. Neither the GNU `stat` spelling nor a dropped or
  repointed link on ext4 was measured.
- Whether the boot volume's device number survives a reboot. A remount reorders device numbers (an adversary measured
  that on scratch disk images), so a legitimate remount would answer `regrant`. That fails closed, and must be drawn
  as "this folder needs granting again", never as outside the folder.
- Whether a row turning `changed` tears down a live connection, which decides whether an agent's mid-session edit of
  the machines file stops writes at once. Not found in the code read and not driven.
- Whether a far process can change a session's working folder itself. Only the project option was measured as
  changeable. Under the hand-chosen-only rule it cannot mint a grant either way.
- Whether a dev build shares the installed app's data directory, which decides how likely the downgrade loss in
  section 5 is.
- Nothing was driven through Electron, through Tortie's own ssh path end to end, or on his Mac Pro. The Tier 3 runs
  in section 5 are owed.
- Whether his own ssh agent or `~/.ssh` setup would stop an agent. Not examined, by rule.
- Mode 644 for `manifest.db` was measured with the system `sqlite3`'s defaults, not Tortie's own creation path.
- Prior art: whether VS Code's or Zed's trust store can be written to mint trust; whether Zed's agent sandbox applies
  to SSH projects; Nova's limits beyond publishing; whether JetBrains' 2025.3 remote trust is keyed per host; Cursor
  1.3's "ask again on any change" detail; and the mechanisms behind CVE-2025-64660, CVE-2022-21991 and CVE-2020-17148
  beyond MITRE's generic text.

## 8. Evidence

### 8.1 Tortie's tree, at `03a1b42c`

| File and lines | What it shows |
| --- | --- |
| `src/main/machines/confirm.ts:184-189` | `writeRoot` counts as execution-bearing because it reaches a script as a positional argument |
| `confirm.ts:233-236, 239, 289-291` | `APPENDED_KEYS`, the algorithm name, an appended key emitted only as a non-empty string |
| `confirm.ts:372, 391` | The honesty paragraph and `writeHonestyOf` |
| `confirm.ts:534, 561, 564, 653, 687-688, 796-803` | Row status, `never`, `changed`, the connect gate, the acknowledgement, forget |
| `build/conformance-machines.mjs:2627-2628, 8108-8109` | The pin for a row with no root; the stale "Eight callers" sentence |
| `src/main/machines/schema.ts:114-122, 233-251` | A row with an unknown key refused whole; `writeRootField` |
| `src/shared/machines.ts:214` | `MACHINE_ROW_KEYS` |
| `src/main/machines/store.ts:154-161, 317-323, 335-338, 355-370, 382-397, 428-449` | Snapshot reads, the whole-file write of loaded rows, the two field writers, the watcher |
| `src/main/machines/remote-file.ts:27-33, 203-212, 235-254, 310` | The inaccurate header, the text containment, the gate, the save's call |
| `src/main/machines/remote-entry.ts:252, 271-282, 361` | New folder and rename calls; "may have been made" |
| `src/main/machines/remote-stage.ts:63-75, 249-288, 536` | The tab folder bound and its stated limit; `rootHolds`, `rootRelativeCwd`; the stage call |
| `src/main/machines/remote-commit.ts:407`, `remote-copy.ts:1045-1049` | The commit call and its writes-off sentence |
| `src/main/machines/remote-run.ts:229-237` | No gate in the script door |
| `src/main/machines/remote-image.ts:338-348`, `remote-clone.ts:282-287` | The picture drop and clone never ask the write gate |
| `src/main/machines/context.ts:452`, `ready-context.ts:35` | A context exists only after the confirm gate passed |
| `src/main/machines/remote-scripts.ts:2229-2238, 2302-2305` | Why GNU `stat` comes first |
| `remote-scripts.ts:2421-2441` | The link walk starts below the root |
| `remote-scripts.ts:2584-2612` | The save script: no `.git` refusal; leaf and staged-name link checks |
| `remote-scripts.ts:2701-2706, 2919-2920` | The case-sensitive `.git` guards |
| `remote-scripts.ts:3172-3174` | The commit's three answer words, `moved` among them |
| `src/main/machines/ipc.ts:783-848, 878-893` | The write sheet and allow writes; forget |
| `src/main/machines/ssh.ts:71, 157-225, 245-263, 267-305` | Connection sharing kept 60 s, the socket folder, `IdentitiesOnly` unset, the options |
| `src/main/machines/key-material.ts:91-94, 346-354` | Tortie's key: no passphrase, 0600 |
| `src/main/config/seal.ts:35-43`, `confirm-record.ts:92` | The admitted replay; the sealed record |
| `src/main/manifest/schema.ts:462-469`, `manifest/store.ts:212`, `projects-repository.ts:153-159` | The remote project table, WAL mode, remote rows added with no check |
| `src/main/sessions/core.ts:1305-1312, 3941-3972, 3958`, `src/main/machines/dir-list.ts:117` | Rehome on every feed event; the remote open; the echo stored |
| `src/main/machines/remote-rehome.ts:112, 160-258` | The rehome rule |
| `src/main/machines/remote-sessions.ts:393-396, 989-990, 2666, 2694-2695` | Rehome's inputs from far-side tmux state; any non-empty id treated as Tortie's |
| `src/main/fs/ipc.ts:124-127, 150-153, 250-267`, `src/main/fs/open-with.ts:604-606` | The three local root readers; the plain write door |
| `src/main/fs/paths.ts:424-454`, `file-ops.ts:292-297`, `src/shared/fs-ops.ts:40-60` | The local gate; what it covers; the case-folded protected name |
| `src/renderer/editor/tab-io.ts:593-627, 1177, 1348-1349` | The open refused over the save cap with saving on; the plain door for files outside projects |
| `src/renderer/editor/tab-readonly.ts:45-59`, `src/renderer/scm/ScmSection.tsx:826-830`, `src/renderer/state/machines-slice.ts:250-258` | Three of the renderer's per-machine gates |
| `src/renderer/settings/machines-copy.ts:298, 331`, `src/renderer/app/RemoteProjectModal.tsx` | "Let Tortie save files here…" and "Stop Tortie saving files here"; the open window |
| `docs/BACKLOG.md:8305-8340, 8450-8454, 8672, 23547, 23584-23591, 24725-24729, 39639-39698` | Decision 1; the Phase 101 rulings; "no per-project write confirmation"; one root per machine; a linked root allowed; setting it is his act; the Phase 336 entry |
| `docs/research/57-remote-parity.md:902-917`, `85-the-remote-gap.md:602-620`, research 102 to 105 | The three shapes offered; the two refusals rated "in between"; the 242 rehearsals |

### 8.2 Commands run, and what they returned

Paths are under the session scratchpad's `p336r/`.

| Who | Command or script | Exit | Result |
| --- | --- | --- | --- |
| Tree | `npm run -s conformance:machines` | 0 | PASS in 8.3 s, with the stale "Eight callers" line (`tree/conformance-machines.txt`) |
| Tree | vitest over the 11 remote write suites | 0 | 463 tests passed (`tree/vitest-writes.txt`) |
| Tree | `tree/orchestrate.mjs` and `tree/driver.ts` over the loopback machine (port 45049, socket `p336t-33349`) | — | Writes off: every verb refused with no ssh. Writes on: every verb done. A root that is a link: `wrote`, outside. A save inside the repository's metadata: `wrote`. A feed row at `/`. A remote row widening `writeGuarded` (`tree/loopback-report.json`) |
| History | `history/rederive-hash.mjs`, `history/shipping-hash.mts` | 0, 0 | Pin for no root; `f09ddd90…9e66` for `/Users/gdc`; a list value dropped from the hash |
| History | `history/root-anchor.mjs` over the shipping scripts | 0 | The link-root arms in section 2.5 item 1, scratch tree removed |
| History | vitest on the 242, 242.1 and 242.2 suites | 0 | 51 of 51 passed |
| Threat | File modes and a manifest insert on scratch copies | 0 | Mode 644 on all three files; the insert succeeded during an open read |
| Fact check | `factcheck/hash.mjs`, `factcheck/schema.mts` | 0, 0 | `pinMatch true`; `writeRootField('/')` returns `/` |
| Fact check | `factcheck/arms.sh`, 12 arms over a scratch tree | 0 | The A1 to A12 results behind section 2.5 items 1 and 2 |
| Fact check | `factcheck/contain.mts`, `factcheck/localgate.mts`, `factcheck/rehome.mts` | 0, 0, — | Main's text containment; the local gate widened by a remote row; the rehome rule's ancestors |
| Fact check | `factcheck/tmuxopt.sh` on a scratch tmux socket | 0 | An ordinary client changed the session's project option |
| Fact check | `factcheck/mux.mjs` on the loopback machine | 0 then 255 | A keyless client ran a far command through Tortie's shared connection; without sharing it was refused at sign-in |
| Adversary | `adv-parity/adv.mjs` over two APFS volumes | per arm, in the file | A case variant of the metadata name reached the real metadata folder; a root under `/tmp` saves today (`adv-parity/adv-result.json`) |
| Adversary | `adv-parity/downgrade.ts` | — | Today's build refused a row carrying `writeFolders` and deleted it on its next write (`adv-parity/downgrade-result.json`) |
| Adversary | `adv-parity/m.mts` | — | One-press's marker: one plant named, two plants and a swap named nothing (`adv-parity/m-result.json`) |
| Adversary | `adv-parity/commit-word.mts`, `adv-parity/remount.sh` | — | `moved` drawn as a moved branch; device numbers reordered on remount |
| Adversary | `adv-containment/m1-regression.sh`, `adv-containment/m4-narrower.sh` | — | The walk from `/` refuses linked ancestors; the leaf identity check keeps them saving |
| Writer | `grep -rn "confirmedWriteRoot(" src/main` | 0 | Five production call sites |
| Writer | `grep -rln "writeRoot\|WriteRoot" src/renderer`, tests left out | 0 | 18 production files |
| Writer | `git ls-files -z \| xargs -0 stat -f '%z' \| awk '$1>90000 && $1<=2097152'` | 0 | 177 |

A dash means the exit code was not recorded in the result file the writer read.

### 8.3 Prior art

Every page below was read on 4 October 2026. CVE texts were checked against MITRE at
`https://cveawg.mitre.org/api/cve/<id>`.

| Source | What it shows |
| --- | --- |
| https://code.visualstudio.com/docs/remote/ssh | Remote-SSH reaches files anywhere on the remote filesystem |
| https://code.visualstudio.com/docs/editing/workspaces/workspace-trust | Restricted Mode keeps text editing; parent-folder trust; Codespaces and containers trusted automatically |
| https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/workspaces/common/workspaceTrust.ts | Trust in shared application storage, longest-prefix match, canonical remote URIs |
| https://github.com/microsoft/vscode/issues/129410 | Parent-folder trust for SSH and WSL |
| https://code.visualstudio.com/updates/v1_104 | Agent edits to dotfiles and files outside the workspace ask first |
| https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh | A compromised remote can run code on the local machine |
| https://zed.dev/docs/remote-development, https://zed.dev/docs/worktree-trust, https://zed.dev/blog/secure-by-default | Remote projects by host and path; trust per host, gating settings and servers |
| Zed `crates/project/src/trusted_worktrees.rs:154-184, 512-516`, `crates/workspace/src/persistence.rs:986-991` (copies in `priorart/`) | The host keyed by name; a component prefix check; a plain SQLite trust table |
| https://www.jetbrains.com/help/idea/project-security.html, https://www.jetbrains.com/help/idea/security-model.html | Trust dialog, Safe Mode, trusted locations; remote identity by certificate and token |
| https://junie.jetbrains.com/docs/action-allowlist.html | Junie writes inside the project; writing outside is a separate action |
| https://cursor.com/docs/agent/security/run-modes | Cursor's protected paths and external-file protection, for the agent only |
| https://www.oasis.security/blog/cursor-security-flaw | Workspace Trust off by default; a task ran when a folder was opened |
| https://help.nova.app/remote-files/servers/ | Nova's remote path is the starting and publishing folder |
| https://coder.com/docs/user-guides/shared-workspaces, https://coder.com/docs/ai-coder/agent-boundaries, https://github.com/advisories/GHSA-qrwj-vh9x-gw5v | Per-workspace roles; a network-only agent boundary; a file API redirected by a malicious agent |
| Codex `codex-rs/protocol/src/protocol.rs:1121-1160`, `codex-rs/protocol/src/permissions.rs:2347-2372` (copy in `priorart/`) | `WritableRoot` with protected metadata names |
| https://code.claude.com/docs/en/security | The folder prompt, in Manual mode, is a permission prompt rather than a boundary |
| https://www.wiz.io/blog/ghostapproval-a-trust-boundary-gap-in-ai-coding-assistants | A disguised link into a person's ssh folder, six products, 8 July 2026 |
| https://research.checkpoint.com/2025/cursor-vulnerability-mcpoison/ | Approval keyed to a name (CVE-2025-54136), later bound to content |
| https://www.lakera.ai/blog/cursor-vulnerability-cve-2025-59944 | A case-sensitive check on a case-insensitive volume |
| https://github.com/zed-industries/zed/security/advisories/GHSA-x34m-39xw-g2wr | An agent wrote the editor's own settings (CVE-2025-55012) |
| https://embracethered.com/blog/posts/2025/github-copilot-remote-code-execution-via-prompt-injection/ | An agent wrote the editor's settings to approve its own tools (CVE-2025-53773) |
| https://maccarita.com/posts/idesaster/ | The class of agent writes to editor configuration |
| https://repello.ai/blog/vscode-copilot-workspace-trust-bypass | One trust gesture granting two powers |
| https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-coding-agent-sandbox-escapes-20260722-c/ | "If an agent gets to write the future inputs of systems, it was never sandboxed" |
| MITRE records for CVE-2026-50548, CVE-2026-50549, CVE-2025-68269, CVE-2022-46829, CVE-2025-54130, CVE-2025-61590, CVE-2025-68432, CVE-2025-54794, CVE-2026-26268, CVE-2026-12958 | The writable root steered by an agent; fall back on a failed resolve; untrusted remote projects over SSH; a Gateway token bypass; dotfile and workspace-file writes; project settings run at open; prefix matching; metadata hooks; a related link flaw |

## 9. His ruling, 4 October 2026

He was asked the questions in section 6 and answered:

- "Zero presses", and on reopening Decision 1: "I don't want any grants. I want it to act like i'm operating it
  locally."
- Pictures and clone: keep them as today, gated to a confirmed machine and outside any folder bound.
- The faults in section 2.5: fold their fixes into Phase 336.

So Phase 336 does not build the hardened one-press. A project open on a confirmed machine, however it was opened, is
a folder Tortie may write under, as a project open on his Mac is. There is no grant, no sheet and no Settings field,
and "Let Tortie save files here…" goes. What the ruling keeps from section 4, because none of it asks him anything:

- The folder's identity is pinned when the project is opened and compared at every write (section 4.3), so a folder
  swapped for a link, or for another folder, after the open is refused with its own outcome word.
- `/`, a home directory and its first-level children are never a folder Tortie writes under.
- `.git` and `.ssh` are refused in every writer in any case, on both sides (section 4.4).
- A changed machine writes nothing until it is confirmed again.
- The three local readers take local project rows only (section 4.7).
- A file is never refused for opening because of the save-size cap.

The risk he accepted, in one sentence: a project row that appears without his hand (an agent on his Mac editing
Tortie's project list, or a far session's tmux options as fault 4 describes) makes that folder writable by Tortie the
next time he presses Save in it. Section 2.3's finding stands beside it: while Tortie holds a machine open, a process
running as him can already run commands there, so the typed folder never walled off an agent.
