# Phase 336: save in a project on another machine the way you save on your Mac (SPEC)

Subject: `feat(machines): save in a project on another machine the way you save on your Mac`
First body line: `Phase 336: remote saving bound to the projects you opened`
Semver: Minor, unreleased. Tier 3. Written 2026-10-04 in `/private/tmp/wt-p336` at `e58b0c30` (origin/main `2867bc39`
plus the held research 138 commit). Nothing committed, staged or stashed.

Charter, in his words. 4 October 2026, on hearing that saving on another machine still needs Settings › Machines › "Let
Tortie save files here…": "behave similar to local...". His ruling on research 138's questions, the same day: "Zero
presses ... I don't want any grants. I want it to act like i'm operating it locally." Pictures and clone stay as today.
The faults research 138 §2.5 found are folded into this phase. His standing rules: a phase lands only when a side by
side against today shows no scenario worse, and the part that regresses is removed; a remote surface carries no
explanatory text just because it is remote; Tortie never auto-ends a session.

Binding sources: this file; `docs/BACKLOG.md` "## Phase 336" (`:39639-39698`) and the three running-log lines of
2026-10-04 about it (`:40771`, `:40773`, `:40777`); research 138 WHOLE, where §9 (his ruling) overrides §4 wherever they
differ. Kept from §4 because none of it asks him anything: the folder's identity pinned at the open and compared at
every write (§4.3); `/`, a home folder and its first-level children never a folder Tortie writes under; `.git` and
`.ssh` refused in every writer in any case, on both sides (§4.4); a changed machine writes nothing until confirmed
again; the local readers take local project rows only (§4.7); a file never refused for OPENING because of the save
cap (§4.6). Faults 1, 2, 3, 5 and 6 of §2.5 are closed here; fault 4 is the risk he accepted (research 138 §9, last paragraph).

**REVISED BY THE ADVERSARY ROUND (§Attack, at the foot).** The attack measured five gaps in the first draft and this
file now carries the closures in place. Where a decision below says "(§Attack Gn)", §Attack holds the measurement
behind it. The far check now compares folders by device and inode, never by path text, because the macOS `/bin/sh`
keeps a typed spelling where dash does not (G1). The script works inside the folder it checked rather than through
its path (G2). Main's reserved-name match folds every spelling an APFS volume folds (G3). An existing `writeRoot` is
chosen before any project, so it behaves exactly as today (G4). Every refusal sentence is true of every shape that
reaches it (G5).

**ONE QUESTION FOR HIM, AND IT DOES NOT BLOCK THE BUILD (§16 Q1).** The never-list's "first-level children of a home
folder" makes a project at `~/<name>` read only on another machine. That is where his own projects sit on this Mac
(`/Users/gdc/gmux`). The build implements the rule as kept, as ONE shared predicate and ONE far-side line, so narrowing
it is a two-line change with its gate clause.

## 0. What changes for a person, in one table

| Today (the parent, `2867bc39`) | After this phase |
| --- | --- |
| A project open on a confirmed machine is read only until he types a folder in Settings › Machines and confirms a sheet | Every project open on a confirmed machine saves, renames, makes folders, stages and commits, as on his Mac, with nothing asked |
| One typed folder per machine (`writeRoot`), so two projects in unrelated trees cannot both save | Every open project is its own folder; nested projects use the deepest |
| A folder that is itself a link, or is swapped for one after it was typed, is followed (fault 1) | The folder's identity is pinned when it is opened and compared on that machine in the same call as every write; a different folder answers its own word, `folderChanged` |
| `file-put` has no `.git` refusal; the other writers refuse `.git` case-sensitively (fault 2) | Every writer refuses `.git` and `.ssh` in any case and in every spelling an APFS volume folds to them, in main before composing and on the far side before writing |
| A far refusal of a reserved name ends with no answer, read as "may have been made" (fault 3) | Every far refusal prints its word inside the markers; no write script names `exit 1` |
| A remote project row widens the local file gate, drag out, Open With and the Redline baseline store on this Mac (fault 5) | Those four readers take local rows only |
| The gate's account of itself says "Eight callers" (fault 6) | Six folder-bound scripts cross one typed door, `runFolderWrite`, and the gate says so |
| With saving on, a remote file over 90,000 bytes is refused at OPEN | It opens read only |
| A row carrying a `writeRoot` saves under it | Unchanged: it hashes as today, stays confirmed, and still saves under that folder with today's far texts, because a write it holds is decided by it before any project inside it (§Attack G4) |

## 1. The design in one paragraph

Main decides every write on another machine in ONE new module, `src/main/machines/write-folder.ts`: the row must be in
the machines file, `assertMachineMayConnect` passes (so a changed machine writes nothing), and the folder Tortie writes
under is the deepest of that machine's OPEN project folders that holds the target (a legacy `writeRoot` is one more
candidate, and when it holds the target it is chosen first, §Attack G4), chosen by ONE shared pure function
(`src/shared/remote-write-folder.ts`) the renderer also uses to decide whether a tab is an edit surface. A project folder
whose text is home-shaped (`/`, `/Users`, `/home`, a home, its first-level children) is never a candidate. The
folder's far identity (`<dev>:<ino>` of the folder itself, GNU `stat` first) is pinned in a new manifest table when the
project is opened by hand, or by the first write for a row that has none. Each of the six folder-bound write scripts
takes that pin as its last positional. A new prelude above the existing link walk then works on that machine, in the
same call. It enters the folder with `cd -P`, and from then on the script names the folder as `.` (§Attack G2). It
compares device and inode, never path text (§Attack G1), and refuses four things. A folder whose identity is not the
pin answers `notsame`. A folder that is `/`, is the account's home, holds it or sits directly inside it answers
`offlimits`. A folder that is, or sits inside, a `.git` or `.ssh` folder of its parent (in any spelling the volume
folds) answers `protected`. An account whose home cannot be read answers `nohome`. A folder-bound script can only be sent through `runFolderWrite`, which takes a branded
`WriteFolder` that only `write-folder.ts` can make and appends the pin itself. Nothing is asked of him, no machine row
gains a key, no hash moves, and the Settings block that set a folder is removed with its two channels.

## 2. Measured for this spec (this Mac only, no Electron, no ssh, no tmux)

Scripts and outputs in `scratchpad/p336/spec/` (not in the tree). Every shell ran with `env -i`, a scratch HOME, an
empty ZDOTDIR, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; the scratch tree was removed by an `EXIT` trap.

**M1, the candidate prelude over scratch trees, under `/bin/sh` and `/bin/dash`** (`measure.sh` over `prelude.sh` and
`pin.sh`; exit 0). Both shells agreed on 17 of 18 rows:

| Row | Shape | Answer |
| --- | --- | --- |
| 1 | the pinned folder | pass |
| 2, 3 | `.GIT/config`, `src/.Ssh/x` below it | `protected` |
| 4 | `.github/x` | pass (the bracket class does not over-match) |
| 5 | pin `-` (legacy root) at `$HOME` | pass, unchanged from today |
| 6, 7 | a project at `$HOME`, at `$HOME/child` | `offlimits` |
| 8 | a project at `$HOME/code/proj` | pass |
| 9 | a project that is an ancestor of `$HOME` | `offlimits` |
| 10 | `/` | `offlimits` |
| 11, 12 | a folder that is a link to `$HOME/.ssh`, to `$HOME` | `offlimits` (the resolved path is what is judged) |
| 13 | a folder under a LINKED ANCESTOR | pass, and its pin equals the real folder's (`16777231:756536630` both) |
| 14 | the pinned folder swapped for a link | `notsame` |
| 15 | swapped for a new real folder at the same path | `notsame` (a new inode) |
| 16 | the original put back | pass |
| 18 | a folder whose name holds `[ab]*` | pass (quoted case patterns are literal) |

**Row 17 split the shells**: with `HOME` empty, `/bin/sh` (bash) refused `cd -P ""` and answered `offlimits`, while
`/bin/dash` stayed in the working folder and answered **pass**. So the far rule must refuse an empty or relative
`$HOME` by itself before it resolves anything (D9). Debian's `/bin/sh` is dash.

**M2, the hashes that must not move** (`hash.mts` under the pinned tsx over this tree's `confirm.ts`, exit 0), for the
gate's base row `pop-os` (`build/machines-conformance-probe.mts:237-244`):

| Row | `machineExecutionHash` |
| --- | --- |
| no `writeRoot` | `dbd8aa39c1dd0154b556593a2a4ef56e2471afd575d98f3f8431abe20c445d46` (condition 42's pin, `build/conformance-machines.mjs:2627-2628`) |
| `writeRoot: '/Users/gdc'` | `f09ddd90382dc9e6f52326f9b4938c00a37031e6c96f2f757573ca18af6d9e66` (research 138 §2.1's value, confirmed) |
| `writeRoot: '/Users/gdc/code'` | `4273b4f1c49df5b60c90c86f2a63d019581ca64cdaa3aa4da88526532044e3db` |

**M3, the two `stat` spellings on this Mac.** `stat -c '%d:%i' .` → exit 1, "illegal option -- c" on stderr and NOTHING
on stdout; `stat -f '%d:%i' .` → `16777231:756536588`, exit 0. So GNU first is silent here (research 138 §4.3 and
`remote-scripts.ts:2229-2238`). No Linux machine was available; the GNU branch is read, not run (§13).

**M4, the reads this spec rests on** (grep over this tree, each exit 0):

| Claim | Result |
| --- | --- |
| Call sites of `confirmedWriteRoot(` under `src/main` | five: `remote-file.ts:310`, `remote-entry.ts:252`, `:361`, `remote-stage.ts:536`, `remote-commit.ts:407` |
| Production renderer files naming `writeRoot`/`WriteRoot` | 18 (research 138 §4.6's count holds) |
| `listProjects().map((p) => p.path)` under `src/main` | **FOUR**, not three: `fs/ipc.ts:126` (file operations and `fs:writeGuarded`, through `fsDeps` at `:201` and `:311-314`), `fs/ipc.ts:152` (drag out), `fs/open-with.ts:606`, and `baselines/ipc.ts:55` (the Redline baseline store), which research 138 §2.5 item 5 missed |
| Scripts reading the removed Settings sheet | `build/probe-p242-write-path.mjs` (launch C) and the four photograph probes `build/probe-p10{1,2,3,4}-shot.mjs` |
| `machines:writeSheet`, `machines:allowWrites` | baseline lines 160 and 126; `src/preload/machines.ts:178,182`; `src/main/machines/ipc.ts:788,824`; `src/renderer/settings/machines-store.ts:950-1003`; tests `src/main/machines/__tests__/ipc.test.ts`, `src/renderer/settings/__tests__/p101-allow-writes.test.ts` |
| sshd `SetEnv` | OpenSSH_9.9p2's own `sshd_config(5)`: "Environment variables set by SetEnv override the default environment"; NOT driven here (D23 asks the builder to drive it) |

**M5 to M9 are the adversary round's**: M5 APFS folding (`fold.mjs`), M6 the two shells' `pwd -P` (`pwdcase.sh`), M7 the
draft's D9 prelude splitting the shells (`run-d9.sh`), M8 the identity prelude agreeing under both shells
(`run-id.sh`/`run-anchor.sh`), M9 the check-to-write window (`race.sh`); the loopback machine run is `loop.mts`. They
are in §Attack, with their scripts and outputs.

## 3. Decisions, each with its source

**D1. No grant, no sheet, no Settings field.** A project open on a confirmed machine, however it was opened (the open
window, a recents row, Home, Go to Session, a restore, a rehome, a remote create), is a folder Tortie may write under.
Source: his ruling (research 138 §9). The Settings › Machines "Saving files" block goes (research 138 §9), with
`machines:writeSheet` and `machines:allowWrites` (D17).

**D2. The folder is chosen by ONE shared pure function.** `pickWriteFolder(target, { projects, legacyRoot }, mode)` in
`src/shared/remote-write-folder.ts`. The order is the decision (§Attack G4):
1. A legacy root that holds the target is chosen, `kind: 'legacy'`, whatever projects lie inside it. That is today's
   bound byte for byte (pin `-`, today's far texts), so a machine carrying a `writeRoot` loses no write it has today.
   Without this, a project opened inside a legacy root would take the write. That folder's pin would then refuse a
   folder deleted and made again at its path (an ordinary re-clone) as `folderChanged`, where today it saves.
2. Otherwise the DEEPEST project candidate that holds the target, `kind: 'project'`.
3. Otherwise `{ refused: 'never', path }` when a never-listed project (D4) is the only holder, else
   `{ refused: 'outside' }`.

`mode: 'file'` requires the target strictly below the folder (today's `relativeUnderRoot`, `remote-file.ts:203-212`).
`mode: 'folder'` accepts the folder itself (today's `rootHolds`, `remote-stage.ts:249-258`). A rename asks a third
form, `pickWriteFolderForPair(from, to, …)`: the deepest candidate holding BOTH ends, so a rename across two nested
projects is held by the outer one rather than refused (the link walk below the outer folder still runs on both ends).

THE TEXT IS FOR CHOOSING, AND THE STORED PATH IS WHAT CROSSES. Comparisons use `posix.resolve` on both sides, exactly as
`relativeUnderRoot` does today, with the separator required, no case fold and no Unicode normalisation (rule 23's
spirit; this is a path comparison). The answer's `path` is the project row's STORED path byte for byte, the string
`dir-list` echoed at the open (`core.ts:3995`). It is the string `folder-pin` read, the key the pin is stored under, and
the folder positional sent to the far side. A stored path holding `.`, `..` or a doubled slash is therefore pinned,
keyed and sent as one string. The far side resolves it physically, and both the identity check and the far home rules
judge the physical folder (D5), so a text normalisation that disagrees with a link on that machine cannot move a write.
The relative part is computed from the two resolved texts, as today. Answers `{ path, kind }` or a refusal. Source:
research 138 §4.2 (longest holder) and the need for main and the renderer to agree. Condition 113 drives the shared
function, `relativeUnderRoot` and `rootRelativeCwd` over one corpus and requires agreement. The corpus includes a
legacy root holding a project, nested projects, a rename across them, and stored paths holding `.`, `..` and `//`.

**D3. Only that machine's OPEN project rows are candidates.** `remoteManifest().listRemoteProjects()` filtered to
`machineId`. A closed tab is not a folder Tortie writes under. A project row on another machine never widens this one.
Source: "a project open on a confirmed machine".

**D4. The never-list, text half (main and renderer).** `neverWriteFolder(path)` is judged on `posix.resolve(path)` (so
a `.` or `..` step cannot dodge it) and is true for `/`; `/Users` and `/home`; `/Users/<x>`, `/home/<x>`, `/root`,
`/var/root`; any direct child of those four home shapes; and any path whose segments fold to `.git` or `.ssh` by
`isProtectedRemotePath` (D10). It is a TEXT rule and it is a pre-filter, not the safeguard: main cannot see the far
home or follow a far link, so a project at `/opt/me` that is a link to the far `$HOME`, or at a path that is a home on
that machine but not this one, passes it and is caught only by the far prelude (D5). Main and the renderer call the
same function, so the renderer draws a never-listed project read only before any round trip. Source: research 138 §9
("`/`, a home directory and its first-level children are never a folder Tortie writes under"), with two stated
extensions and their reasons: a folder HOLDING a home folder (`/Users`, `/home`) covers every file the home rule
protects, and a folder inside a reserved folder is the reserved folder's contents. Its cost, stated: `/Users/Shared/x`
is refused as a home child. It applies to PROJECT candidates only, never to a legacy `writeRoot` (D16).

**D5. The never-list, far half (every write, by identity).** The draft compared the far home against the folder's
`pwd -P` text. §Attack G1 refuted it: on the loopback machine the far `/bin/sh` is bash, and `cd -P "$HOME"; pwd -P`
keeps the spelling it was handed, so a folder typed in another case than the home (`/USERS/gdc`, `.ßh`) read `pass`
under `/bin/sh` while `/bin/dash` folded it and read `offlimits` (§Attack M6, M7). A path text comparison cannot be
trusted on either side. So the far half compares the SAME `<dev>:<ino>` identity the pin is, never text. The prelude
(D9) reads the account's home identity once, then walks from the folder upward by `..`, and prints, in this order:
`nohome` (an empty or relative `$HOME`, or a home whose identity cannot be read); `notsame` (the folder's own identity
is not the pin, or cannot be read); `offlimits` (the folder is `/`, is the home, holds it as an ancestor, or is a
direct child of it); `protected` (the folder is, or sits inside, a `.git` or `.ssh` of a parent, matched by comparing
the identity of `<parent>/.git/.` and `<parent>/.ssh/.` against each walked folder, so the volume's own folding
decides, §Attack G3). It is skipped for a legacy root (pin `-`), today's behaviour byte for byte (M1 row 5, §Attack
M8). Main maps `offlimits` and `nohome` to `writesOff` naming the folder (D11). Source: research 138 §9's never-list,
judged on what the far side really IS, driven under both shells in §Attack M8 (every row agrees between `/bin/sh` and
`/bin/dash`).

**D6. The folder's identity is pinned at the open and compared at every write.** The identity is the far `<dev>:<ino>`
of the folder (through the folder, so a linked ancestor keeps one identity, §Attack M8 row 10), read by a new READ
script `folder-pin` (one value; `stat -c '%d:%i'` first, then `stat -f '%d:%i'` over `"$1/."`; prints the pair or
`none`). The pin is the identity of `"$1/."`, the same expression the prelude's first walk step reads, so a pin and a
check taken the same way agree. Source: research 138 §4.3, kept by research 138 §9.
- `addRemoteProjectAdmitted` (`src/main/sessions/core.ts:3981`) pins after the row is stored, for a new row AND for a
  row already open (`alreadyOpen`), so opening a folder again by hand is how a person re-pins it. A failed pin read never
  fails the open and never clears an existing pin.
- A row with no pin (every row from before this phase, and every row a rehome or a remote create makes, which run no far
  read of their own: `remote-rehome.ts:229`, `:305`, `:388`) is pinned by the first write: one `folder-pin` read, then
  the write carrying that pin. Source: research 138 §9's accepted risk already makes such a row writable at the next Save.
- `notsame` NEVER re-pins. Only a hand open does. Otherwise a second Save would quietly adopt the swapped folder.
- A pin read that answers `none` answers the verb `folderChanged` and stores nothing: Tortie cannot tell that it is the
  folder that was opened, which is what the word means.

**D7. The pin store is a new manifest table, `remote_folder_pins`, migration `019-remote-folder-pins`.**
`(machine_id TEXT NOT NULL, path TEXT NOT NULL, identity TEXT NOT NULL, pinned_at INTEGER NOT NULL, PRIMARY KEY
(machine_id, path))`, keyed like `remote_projects`' `UNIQUE(machine_id, path)` (`src/main/manifest/schema.ts:462-469`).
Additive by research 27 §4.3: a build at schema 13 to 18 has never heard of it and writes nothing there, so
`MANIFEST_SCHEMA_VERSION` 18 → 19 and `MANIFEST_MIN_COMPATIBLE_VERSION` stays 13, with the house paragraph. It lives in
its own repository file, NOT in `projects-repository.ts`, because that file is pinned by digest in
`conformance:samefolder` rule 4 (`build/p274/conformance-samefolder.mjs:517-520`) and the pin is not that file's
question. A closed tab leaves its pin (inert, since only open rows are candidates); a rehome that re-opens the folder
meets the old pin, and a hand open overwrites it. An identity not matching `^[0-9]{1,20}:[0-9]{1,20}$` reads as no pin.
What a planted pin can do, stated: make a write go where the never-list (D5) still allows, which is no more than the
planted project row research 138 §9 accepted. A planted pin can never widen the home or reserved rules, because those
are judged on the far side by identity in the same call and never from the stored pin. Source: a pin taken at the open
must outlive a quit, or a swap made while Tortie was closed is adopted silently.

**D8. The prelude stands in all six folder-bound scripts, above the link walk and above every line that writes.**
`file-put`, `dir-new`, `entry-rename`, `git-stage`, `git-unstage`, `git-commit`. The pin is the LAST positional of each:

| Script | Positionals after this phase (main composes all but the pin; `runFolderWrite` appends the pin) | params |
| --- | --- | --- |
| `file-put` | folder, rel, expect, payload, **pin** | 4 → 5 |
| `dir-new` | folder, rel, **pin** | 2 → 3 |
| `entry-rename` | folder, relFrom, relTo, **pin** | 3 → 4 |
| `git-stage`, `git-unstage` | repo root, path list, folder, cwd rel, **pin** | 4 → 5 |
| `git-commit` | repo root, guard sha, message, folder, cwd rel, **pin** | 5 → 6 (the message stays `$3`) |

The link walk (`noLinkWalk`, `remote-scripts.ts:2421`), the leaf and staged-name checks, the unlink and exclusive
create, the checksum-before-write rule and the rest of the 242, 242.1 and 242.2 family stay exactly as they are below the
prelude. The walk from `/` is NOT added (research 138 §4.9). Source: research 138 §4.3.

**D9. The prelude's text** (one builder in `remote-scripts.ts`, `folderCheck(folderVar, pinVar, fields)`, so six
scripts carry one spelling). It is identity-based and anchored, which §Attack G1 and G2 forced; §Attack M8 drove the
shape below under `/bin/sh` and `/bin/dash` and every row agreed:

```sh
if [ "$PIN" != - ]; then
  case "$FOLDER" in /*) ;; *) <print badname>; exit 0;; esac
  case "$HOME" in /*) ;; *) <print nohome>; exit 0;; esac
  if stat -c '%d:%i' / >/dev/null 2>&1; then wq=c; else wq=f; fi      # one stat dialect, chosen once
  wh=$(<stat wq> "$HOME/.") ; [ -n "$wh" ] || { <print nohome>; exit 0; }
  cd -P -- "$FOLDER" 2>/dev/null || { <print notsame>; exit 0; }       # G2: from here the folder is "."
  wd=. ; wn=0 ; wp=
  while :; do
    wx=$(<stat wq> "$wd") ; [ -n "$wx" ] || { <print notsame>; exit 0; }
    [ "$wn" = 0 ] && [ "$wx" != "$PIN" ] && { <print notsame>; exit 0; }
    [ "$wx" = "$wp" ] && break                                          # reached / (its .. is itself)
    [ "$wx" = "$wh" ] && [ "$wn" -le 1 ] && { <print offlimits>; exit 0; }   # the home, or a child of it
    wg=$(<stat wq> "$wd/../.git/.") ; ws=$(<stat wq> "$wd/../.ssh/.")
    { [ "$wx" = "$wg" ] || [ "$wx" = "$ws" ]; } && { <print protected>; exit 0; }
    wp=$wx ; wd="$wd/.." ; wn=$((wn + 1))
    [ "$wn" -gt 255 ] && { <print notsame>; exit 0; }                   # a cycle fails closed
  done
  [ "$wn" -le 1 ] && { <print offlimits>; exit 0; }                     # the folder IS / or the home
  # the home as a descendant of the folder: walk up from the home, refuse if the folder is an ancestor
  wd="$HOME/.." ; wp=$wh
  while :; do
    wx=$(<stat wq> "$wd") ; { [ -z "$wx" ] || [ "$wx" = "$wp" ]; } && break
    [ "$wx" = "$PIN" ] && { <print offlimits>; exit 0; }
    wp=$wx ; wd="$wd/.."
  done
fi
```

`<stat wq>` is `[ "$wq" = c ] && stat -c '%d:%i' "$1" || stat -f '%d:%i' "$1"` folded into one helper (GNU first, M3);
the dialect is chosen ONCE from `stat -c … /` so a Linux run never puts a BSD usage banner into an answer (the reason
`remote-scripts.ts:2229-2238` gives). `<print …>` is `printf '__TORTIE_RUN__<word> <none × (fields − 1)>__TORTIE_RUN__\n'`,
the script's own field count (file-put 3, dir-new 2, entry-rename 2, stage and unstage 2, commit 3). THE REASON THE
FOLDER MUST BE `.` AND NOT `$FOLDER` (§Attack G2, M9): if the prelude reads the pin through `"$FOLDER"`, then every
later line that writes also reaches the folder through `"$FOLDER"`, and a link swapped in during the round trip between
the pin read and the write lands the payload outside — measured at `wrote` with the victim overwritten. With `cd -P`
done ONCE and `.` used from then on by the prelude AND by every write line below it (the `f="./$2"`, the `cd .` the
cwd verbs already do), there is one resolution and the swap is a no-op: the open descriptor still names the folder that
was checked. The builder changes the writers' own `"$1"` to `.` after the `cd -P` for exactly this reason; the gate
(§8, condition 115) reads that every write line below the prelude reaches its target through the anchored `.` and never
re-reads `"$FOLDER"`. Every positional is read double quoted. It names no mutating program and no `exit 1`. The builder
may restate it to meet the catalogue's text rules; the gate reads the clauses, not this layout.

**D10. Reserved names: `.git` and `.ssh`, in every case AND every spelling the volume folds, both sides.** §Attack G3
measured APFS folding more than ASCII case: `.SSH`, `.Ssh`, `.ßh`, `.ſsh` (long s), `.ſſh` and `.ẞh` (capital sharp s)
all resolve to one `.ssh` folder on this Mac's data volume (§Attack M5), and the draft's ASCII bracket guard let a
`file-put` of `.ßh/authorized_keys` land in the real `.ssh` while answering `wrote` (§Attack M8, the loopback run). So:
- **Main is the complete gate, because every Tortie write goes through it.** `isProtectedRemotePath(rel)` in
  `src/shared/remote-write-folder.ts` folds each segment by `foldReservedSegment`: `s.normalize('NFKC')`, strip the
  zero-width and format characters (`­​-‏‪-‮⁠-⁯﻿`), `.toLowerCase()`, then
  `ß → ss`; a segment that folds to `.git` or `.ssh` is a hit. §Attack M5 validated it: 13 reserved spellings caught,
  12 near-misses (`.github`, `x.git`, `.gitignore`, dotless-ı, `.config`) passed. It is asked for every relative path,
  both ends of a rename, every staged path and every cwd relative part, before anything is composed; a hit answers the
  new outcome `protected` (commit: `refused` with its sentence) with zero sends.
- **The far FOLDER is caught by identity, so any fold is caught even if main is bypassed.** The prelude (D9) compares
  each walked folder's `<dev>:<ino>` against `<parent>/.git/.` and `<parent>/.ssh/.`, so a project folder that IS, or
  sits inside, a `.git`/`.ssh` — in any spelling the volume folds — answers `protected` (§Attack M8 rows 5, 6, 6b, 11,
  11b). This needs no name match at all.
- **The far REL keeps the ASCII bracket backstop, and the residual is stated.** `WRITE_PATH_GUARD_2`,
  `WRITE_PATH_GUARD_3` (`remote-scripts.ts:2701-2706`) and `INDEX_PATH_GUARD` (`:2919`) match `.git` and `.ssh` with
  POSIX bracket classes as whole segments, print `protected` and exit 0; `file-put` gains the guard it lacks
  (`:2585-2587`); the three cwd verbs guard their cwd relative part the same way. A NON-ASCII fold of a reserved name in
  the RELATIVE PATH (not the folder) is refused by main on every product path, and a caller that bypasses main to drive
  the text directly already holds his shell (research 138 §2.3), so the far rel bracket guard is a backstop in ASCII
  case and the non-ASCII-rel-with-main-bypassed case is a stated residual rather than an escape. The folder case, which
  is the one a planted project row or a swap could reach without his hand, is closed by identity above. This is a NAME
  match, distinct from `conformance:samefolder` rule 23 (no folder identity is decided by case); the fold lives in
  `src/shared/`, outside rule 23's derived file set.
- It holds whatever the folder, legacy roots included. Stage and commit still write the repository's metadata, because
  that is what git does (research 138 §4.4). Local saving is unchanged: `isProtectedFsPath` stays `.git` only.
- Source: research 138 §9, §4.4, §2.5 item 2. Its cost is local's own: a real `.GIT` folder on a case-sensitive
  volume is refused too (`src/shared/fs-ops.ts:40-60`).

**D11. The new outcome word is `folderChanged`, never `moved` and never `outside`.** Far word `notsame`. It joins
`MachineFilePutOutcome`, `MachineMakeDirOutcome`, `MachineRenameOutcome`, `MachineIndexWriteOutcome` and
`MachineCommitOutcome`; `protected` joins the first four. `offlimits`, `nohome` and the never-list all map to the
EXISTING `writesOff` with the result's `writeRoot` field naming the folder; `writesOff` with `writeRoot: null` keeps
meaning "outside every project" — the field's comment says so (it is "the folder this write was bound by" from now on,
kept by name so the contract is appended to rather than renamed). `nohome` is drawn with the same never-list chip as
`offlimits`: both mean Tortie will not write in or around a home folder on that machine, and a person never needs to
know which branch fired. Source: research 138 §4.3 (the commit script already answers
`moved` for a moved branch, `remote-scripts.ts:3176-3200`, drawn as "press Refresh", which Refresh could never clear
here). The sentences are in §10.

**D12. Fault 3: no far refusal is silent.** Every guard in the six write texts prints a word inside the markers and
exits 0: `protected` (D10), `offlimits`, `notsame`, and `badname` for the shape guards (an absolute relative part, a
relative part holding `..`, an empty staged list, a non-absolute folder). Main maps `badname` to a thrown `INVALID_INPUT`
whose sentence says nothing was written ("Tortie cannot change a name holding two dots in a row on <label>. Nothing was
written." for the one shape a person can reach, a file named like `a..b.md`, today's stated false refusal,
`remote-scripts.ts` FILE_PUT property 1). The six texts name no `exit 1`. Source: research 138 §2.5 item 3.

**D13. One typed door (fault 6).** `RemoteScript` gains `bound: 'folder' | 'machine'` on every write row (six folder,
two machine: `image-put`, `git-clone`) and `folderArg` (the index of the folder positional) on the six. `runRemoteWrite`
refuses a folder-bound id with a named sentence before anything is composed; the new
`runFolderWrite(ctx, folder: WriteFolder, scriptId, args, options)` refuses a machine-bound id, refuses `args` whose
`folderArg` element is not `folder.path`, and appends `folder.pin` (`-` for a legacy root). `WriteFolder` carries a
`unique symbol` brand declared and constructed only in `write-folder.ts`. The stale sentences are corrected:
`build/conformance-machines.mjs:8108-8109` ("Eight callers each ask confirmedWriteRoot"), `remote-run.ts:229-237` ("no
writes gate in this function … a discipline rather than a door"), and `remote-file.ts:27-33` (the gate reads the
in-memory snapshot the watcher refreshes about 300 ms after a change, `store.ts:79,154-161,438-447`, not "the row on
disk at call time"). `confirmedWriteRoot` is deleted. Source: research 138 §2.5 item 6, §4.2, §7.1.

**D14. The order of each verb** (all five, decided before anything is composed unless named):
1. the row is in the machines file (else `INVALID_INPUT`, unchanged);
2. `assertMachineMayConnect` (`confirm.ts:653`), FIRST, so opening a project never stands in for confirming a machine;
3. `pickWriteFolder` (D2, D3, D4) — legacy root first, then the deepest project; a rename asks `pickWriteFolderForPair`
   for the folder holding BOTH ends: `outside` → `writesOff` with no folder; `never` → `writesOff` naming the folder;
4. `isProtectedRemotePath` over every path the verb names → `protected`;
5. the verb's own pre-checks, unchanged (size, `..`-names per D12, line breaks in staged names, `outsideRoot` for a
   rename whose two ends, after `pickWriteFolderForPair`, still fall under different folders);
6. `readyRemoteContext` (unchanged);
7. the pin: stored, or one `folder-pin` read (D6) — a READ, so no write send counter moves. The pin read is a separate
   round trip, and the write that follows carries that pin; the write's own anchored prelude (D9) re-reads the live
   folder's identity and compares it to the carried pin, so a swap between the pin read and the write answers `notsame`
   (§Attack G2 is why this is safe even though the two are separate calls);
8. one `runFolderWrite` per command (stage chunks unchanged), the send counter moving immediately before it;
9. the answer: `notsame` → `folderChanged`, `offlimits`/`nohome` → `writesOff` naming the folder, `protected` →
   `protected`, `badname` → the D12 throw, `outside` → `outsideRoot` (unchanged), everything else unchanged.

Commit keeps its message check first and its review read, sha guard and staged-set check where they are
(`remote-commit.ts:375-544`); its refusals stay `refused` with main's sentences, plus the new `folderChanged`.

**D15. The local readers take local rows only (fault 5).** A new `src/main/fs/project-roots.ts` exports
`localRootsOf(projects)` (pure: rows with no `machineId` or `machineId === 'local'`) and `localProjectRoots()` (the lazy
`getGmuxCore()` read the four copies make today). `defaultFileOpsDeps` (`fs/ipc.ts:121-128`, which `fs:writeGuarded`
uses), `defaultDragOutDeps` (`:148-154`), `defaultOpenWithDeps` (`fs/open-with.ts:601-610`) and `baselineStore`
(`baselines/ipc.ts:49-58`) call it. The fourth was found by this spec (M4). Source: research 138 §9 and §4.7. The local
gate itself (`src/main/fs/paths.ts`, `guarded-write.ts`) is untouched.

**D16. An existing `writeRoot` stays, hashes as today, and stays writable — with today's bound.** It is a candidate
chosen BEFORE any project (D2, §Attack G4): a target it holds is bound by it, pin `-`, far prelude skipped, so it is
today's far texts byte for byte and a project opened inside it never takes a write away from it nor subjects it to a
pin that would refuse an ordinary re-clone. The never-list does not apply to it; the reserved names (D10) do. Why it
stays writable: it is his typed, hashed, sheet-confirmed act, stronger than an open; making it
read only would make a scenario worse than today for anyone who has one, and would leave the hashed sheet line "May
replace files under this folder on that machine: …" (`confirm.ts:469-471`) false while the machine stays confirmed. Why
no pin for it: a pin would be a new agreement nobody read. Its stated limit: research 138 §2.5 item 1 (a root that is a
link is followed) still applies to a legacy root, and only to it. He has none (research 138 §2.1, a count of 0). Its
hash is unchanged by construction: `APPENDED_KEYS`, `NORMALIZE`, `MACHINE_ROW_KEYS` and the hash function are not
touched (M2 pins both values). `machines:forget` still clears it with the confirmation (`ipc.ts:878-893`), reached by
the row's existing "Withdraw confirmation" button. `MACHINE_WRITE_HONESTY` is still drawn only for a row carrying one.

**D17. `machines:writeSheet` and `machines:allowWrites` are removed** — handlers (`src/main/machines/ipc.ts:750-848`,
with `writeRootOrThrow`), preload (`src/preload/machines.ts:178,182`), the two input types and two bridge methods in
`src/shared/ipc/machines/filesystem.ts`, the bridge table and count in `src/shared/ipc/machines.ts:163-215` (32 → 30),
and `machines-store.ts`'s `writeSheet`, `clearWriteSheet`, `allowWrites`, `writeSheets`, `allowing`. Nothing in Tortie
can then set a `writeRoot`; a hand-edited `machines.json` carrying one still reaches the confirm sheet as today (it is a
hashed field) and is his act there. `setMachineWriteRoot(id, null)` stays for forget. Source: research 138 §9 ("'Let Tortie save
files here…' goes"); a dormant channel that writes a hashed field is surface a later round could re-wire.

**D18. The renderer asks the same question main does.** `MachineStateView` gains `savesInProjects?: boolean`, set by
`machineStateViewOf` (`machine-state.ts:133-187`) by exactly the rule that decides `writeRoot` there today: true only
for a confirmed row. `machineWriteRootFor` (`machines-slice.ts:252-257`) is replaced by
`remoteWriteFolderIn(states, projects, machineId, path, mode)` → `{ folder } | { refused: 'unconfirmed' | 'outside' |
'never', folder? }`, which calls D2's function over the window's `projects` for that machine and the view's
`writeRoot`. Every one of the 18 files re-points to it for the path it is about (a tab's path in `'file'` mode; the
tree's target folder, the Explorer header's project root and the Source Control tab's cwd in `'folder'` mode). It stays
presentational; main is the safeguard. Source: research 138 §4.6 (the file list is DERIVED by grep, not taken from the
document).

**D19. A file over the save cap opens read only.** `tab-io.ts:593-627` stops refusing the open; it patches a new
`saveCapped: true` on the tab, and `tabIsReadOnly` (`tab-readonly.ts:45-58`) reads it as a fifth reason for a remote tab.
The second parameter keeps its type (`string | null`, now "the folder Tortie may write this tab under"), so
`auto-save.ts:177`'s `tabIsReadOnly(tab, null)` is untouched. Source: research 138 §9 ("a file is never refused for opening because of
the save-size cap"), research 138 §4.6 (177 tracked files sit between the caps).

**D20. Pictures and clone are unchanged.** `image-put` and `git-clone` stay machine-bound (D13), gated by a confirmed
machine and outside any folder bound. Source: research 138 §9.

**D21. A changed machine writes nothing until confirmed again** — by D14 step 2 in main, and in the renderer by
`savesInProjects: false` for an unconfirmed row. No new code beyond those two; condition 121 drives it.

**D22. No hash moves and no machine becomes unconfirmed.** No machine row key, no execution field, no change to
`confirm.ts` code (comments only). The only new durable state is D7's table, which an older build ignores, so the
downgrade loss research 138 §5 described (a released build deleting a row whose key it does not know) cannot arise.

**D23. The loopback machine can lend a scratch HOME.** `build/scratch-machine.mjs` gains opt-in
`SCRATCH_MACHINE_SCRATCH_HOME=1` (default off, so every other probe's sshd configuration is byte for byte today's):
`<yard>/home`, made 0700, appended as `HOME=<yard>/home` to the one `SetEnv` line `setEnvLine` composes
(`scratch-machine.mjs:177-183`), beside the quiet shell, which it requires. The builder DRIVES it (`echo "$HOME"` through
the scratch machine reads the yard's home) before the probe relies on it, and the result goes in §As built. If sshd will
not override `HOME`, the probe's far home arms (this spec §9, arm H8) run against the far side's real `$HOME` only through the node
script arm (`probe:p336:script`), never through the app, and the run says so. Reason: on the loopback machine the far
`$HOME` is otherwise HIS REAL HOME on this Mac, which no arm may write toward.

**D24. `HELPER_USER_FLOOR` 165 → 166** for `build/p336/probe-p336.mjs` (`build/assert-electron-teardown.mjs:420`). The
retired drives (§8.5) keep their import of `electron-run.mjs`, so no file leaves the population.

## 4. Main side, the write path (builder A)

### 4.1 First, append-only: `src/shared/remote-write-folder.ts` (new) and the outcome words

`src/shared/remote-write-folder.ts` (pure, no `node:` import; the renderer imports it):

```ts
export const REMOTE_PROTECTED_SEGMENTS: readonly ['.git', '.ssh'];
export function isProtectedRemotePath(rel: string): boolean;          // any segment, case-folded
export function neverWriteFolder(path: string): boolean;              // D4
export type WriteFolderMode = 'file' | 'folder';
export type WriteFolderPick =
  | { readonly path: string; readonly kind: 'project' | 'legacy' }
  | { readonly refused: 'outside' }
  | { readonly refused: 'never'; readonly path: string };
export function pickWriteFolder(
  target: string,
  candidates: { readonly projects: readonly string[]; readonly legacyRoot: string | null },
  mode: WriteFolderMode
): WriteFolderPick;                                                   // D2
```

`src/shared/ipc/machines/filesystem.ts`: `'folderChanged' | 'protected'` appended to the three unions; the comments on
`writeRoot` in the three result types say D11's meaning; `MachineWriteSheetInput`, `MachineAllowWritesInput` and the
two bridge methods removed (D17). `src/shared/ipc/machines/scm.ts`: `'folderChanged' | 'protected'` appended to
`MachineIndexWriteOutcome`, `'folderChanged'` to `MachineCommitOutcome`. Builders B and D code against these.

### 4.2 `src/main/machines/write-folder.ts` (new)

Exports: `WriteFolder` (branded; `machineId`, `row`, `path`, `kind`, `pin`), `writeFolderFor(machineId, target, mode)`
(sync: D14 steps 1 to 3; answers a candidate or a refusal; contacts nothing), `readyWriteFolder(ctx, candidate)` (async:
step 7; answers a `WriteFolder` or `'folderChanged'`), `pinOpenedFolder(machineId, path)` (D6; never throws), and the
`folder-pin` answer parser. It reads pins through `remoteManifest().remoteFolderPin(machineId, path)` and writes them
through `remoteManifest().setRemoteFolderPin(machineId, path, identity)` (builder D's signatures, §6.2). It is the only
file that declares the brand symbol and the only one that builds a `WriteFolder` (condition 114). No log line names a
path's contents or a payload.

### 4.3 `src/main/machines/remote-scripts.ts`

- `folder-pin`: a new READ, params 1, after the last read in `REMOTE_SCRIPTS` and before the writers' block or at the
  foot, wherever condition 35's walk and `ALLOWED_WRITERS` read it as a read; `REMOTE_SCRIPT_COUNT` 29 → 30. Text: `set
  -e`, `umask 077`, `case "$1" in /*) ;; *) <print none>;; esac`, `d="$1"`, GNU then BSD `stat` over `"$d/."` (the same
  `"$1/."` the prelude's first walk step reads, so the pin and the check agree), print the pair or `none`. Reason line:
  "It prints one folder's device and inode and writes nothing."
- D8's positional for each of the six writers, D9's prelude via one builder, D10's guards, D12's `badname` words, and
  the `bound`/`folderArg` fields (D13). Every existing clause below the prelude is unchanged.
- Comments that name `confirmedWriteRoot` or say "a machine that carries none cannot be saved to" (`:23`, `:743`, the
  FILE_PUT header) are corrected.

### 4.4 `src/main/machines/remote-run.ts`

`runFolderWrite` (D13); `runRemoteWrite` refuses a folder-bound id (new exported sentence, e.g.
`FOLDER_SCRIPT_THROUGH_MACHINE_DOOR`) at step 2 beside `WRITE_THROUGH_READ_DOOR`; the header's "no writes gate"
paragraph rewritten to what is true.

### 4.5 The five verbs

`remote-file.ts` (`putFileOnMachine`; delete `confirmedWriteRoot`; header fixed per D13), `remote-entry.ts`
(`makeRemoteDir`, `renameRemoteEntry`; a rename asks `pickWriteFolderForPair` for the deepest folder holding BOTH ends,
and `outsideRoot` when none does — so a rename within one project, or across two nested projects held by the outer one,
is allowed and the far rename walks both rels under that one folder), `remote-stage.ts` (`writeIndexOnMachine`;
`parseIndexWriteAnswer` learns `notsame`, `offlimits`, `nohome`, `protected`, `badname`), `remote-commit.ts`
(`commitOnMachine`; `parseCommitAnswer` learns the same), each in D14's order.
`remote-copy.ts` (main-composed commit sentences, §10). `remote-clone.ts` and `remote-image.ts`: comments only.

### 4.6 `src/main/machines/remote-smoke.ts`

Its arm 10k (`:1327-1350`) sends `git-commit` through `runRemoteWrite`; after D13 that is refused at step 2. The arm
asserts the new folder-door sentence for `git-commit` through `runRemoteWrite`, keeps the read-door arm, and moves the
not-answering arm to `image-put` (a machine-bound write) so it still proves step 4. Named in §As built.

### 4.7 `src/main/sessions/core.ts` — `addRemoteProjectAdmitted` only (`:3981-4012`)

After `upsertRemoteProject` and the tombstone clear: `await pinOpenedFolder(input.machineId, stored)`. Nothing else in
the file moves. It must not name `sameFolder` (`conformance:samefolder` rule 6).

### 4.8 Main tests (builder A; new files `p336-` prefixed)

- `src/shared/__tests__/p336-remote-write-folder.test.ts`: D2's table (nested projects; a legacy root holding a project
  — the legacy root wins, §Attack G4; `/a/bx` not under `/a/b`; stored paths holding `.`, `//`, `..`; mode `file`
  refusing the folder itself and mode `folder` accepting it; `pickWriteFolderForPair` over a rename within one project,
  across two nested projects held by the outer, and across two unrelated projects refused; another machine's rows absent
  by construction); D4's table both ways (including `/var/www/site`, `/tmp/x`, `/private/tmp/x`, `/Users/x/code/p`
  passing); `isProtectedRemotePath`/`foldReservedSegment` over `.GIT`, `.Git/x`, `a/.sSH/b`, the Unicode folds
  `.ßh`, `.ſsh`, `.ẞh`, and `.github`, `x.git`, `.gitignore`, `.gıt` (dotless i) passing (§Attack M5
  is the ground truth these rows are taken from).
- `src/main/machines/__tests__/p336-write-folder.test.ts`: D14's order over a scripted row store, manifest and runner (a
  changed row throws with zero composes; `outside` and `never` send nothing; `protected` sends nothing; a missing pin
  makes one `folder-pin` read then the write; a stored pin makes no read; `notsame` stores nothing; `none` answers
  `folderChanged`); `runFolderWrite` appends the pin and refuses a mismatched folder argument; `runRemoteWrite` refuses
  all six folder-bound ids with zero sends; `pinOpenedFolder` swallows a throwing read and keeps the old pin.
- `src/main/machines/__tests__/p336-far-prelude.test.ts`: runs the SHIPPING six texts and `folder-pin` under `/bin/sh`
  AND `/bin/dash` over scratch trees in a scratch directory, every spawn with `env` = `PATH`, a scratch `HOME`, a scratch
  `ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, removed in a `finally`: §Attack M8's rows per shell through
  each script's real answer (`pass`, `offlimits` for a home/child/ancestor typed in another case, `protected` for a
  `.ssh`/`.git` folder reached by identity including the `.ßh`/`.ſsh` folds, `notsame` for a swap or a new
  folder at the path, `nohome` for an empty or relative `$HOME`, `badname` for a relative folder), AND the check-to-write
  race: a link swapped in between the `folder-pin` read and the write answers `notsame` with the victim unchanged
  (§Attack M9, the anchored `.` is what makes this hold). Far bytes read back (md5 of a victim file outside, the real
  `.git/config`, no file made where a refusal stood); pin `-` reproduces the 242 family's answers unchanged; both shells
  must agree on every row (§Attack G1); no text names `exit 1`.
- Every existing test the positional and door changes break (`p101-remote-file`, `p102-remote-entry`,
  `p103-remote-stage`, `p104-remote-commit`, `p242-link-refusal`, `p242-1-cwd-link-refusal`, the catalogue and
  `remote-run` tests): the argument lists gain the pin (`-` where the test is about a legacy root, which keeps its
  meaning); each edit named in §As built. `p2422-image-staged-name` is untouched (D20).

## 5. Renderer (builder B)

- `src/renderer/state/machines-slice.ts`: `remoteWriteFolderIn` (D18); `machineWriteRootFor` removed.
- The 18 files, re-pointed (the list is the grep `grep -rln "writeRoot\|WriteRoot\|machineWriteRootFor" src/renderer`
  minus tests, not research 138's): `editor/{tab-io.ts, tab-readonly.ts, MonacoHost.tsx, EditorPanel.tsx, store.ts}`,
  `tree/{FileTree.tsx, FilesSection.tsx, use-tree-model.ts, use-tree-rename.ts, use-tree-menu.ts, remote-bridge.ts,
  tree-ops.ts}`, `app/Sidebar.tsx`, `scm/{ScmSection.tsx, p104-commit-drive.ts}`, `settings/{MachineRow.tsx,
  machines-store.ts}`, plus `editor/tab-types.ts` (`saveCapped`). Every switch over the five outcome unions handles the
  new words (TypeScript's exhaustiveness names them; grep `'outsideRoot'` under `src/renderer`).
- `tab-io.ts`: D19; `saveOnMachine` asks `remoteWriteFolderIn` and on a refusal toasts §10's sentence with NO "Open
  settings" button (`:923-944`).
- `EditorPanel.tsx`: the read-only chip by reason (§10); no chip on an edit surface, as today.
- `src/renderer/machines/{editor.ts, explorer.ts, scm.ts}`: §10's sentences; every sentence that sends him to Settings ›
  Machines goes (`remoteFileChip`, `remoteSaveRefused`, `remoteEntryWritesOffLabel`, `remoteWritesNotConfirmed`).
- `settings/MachineRow.tsx`: `SavingFiles` (`:307-460`) and its call (`:739`) removed; `machines-copy.ts`:
  `savingOffExplain`, `BTN_ALLOW_WRITES`, `WRITE_ROOT_LABEL`, `BTN_CONFIRM_WRITES`, `CONFIRMING_WRITES`,
  `savingOnLine`, `STOP_SAVING_EXPLAIN`, `BTN_STOP_SAVING` and `SAVING_TITLE` removed (each import site with it). The
  row still draws a legacy folder in its confirmed lines and its `writeHonesty` paragraph (`:595-597`), and Withdraw
  (`:625-633`) still clears it.
- Tests: new `src/renderer/state/__tests__/p336-write-folder-in.test.ts`,
  `src/renderer/editor/__tests__/p336-remote-tab-writable.test.ts` (an open project is an edit surface; outside and
  never are read only; a changed machine is read only; a 150 KB remote file opens read only with its chip),
  `src/renderer/machines/__tests__/p336-sentences.test.ts` (§10 byte for byte; none names "Settings" or "then
  Machines"), `src/renderer/settings/__tests__/p336-no-saving-block.test.tsx`. **Updated: EVERY renderer test the
  rename, the removed copy constants or the new outcome-union words break — DERIVED, not hand-listed, because the first
  draft named a fixed set that was both wrong and short (§Attack G5).** Builder B takes the union of two greps under
  `src/renderer` with tests included — `machineWriteRootFor\|writeRoot\|WriteRoot\|outsideRoot` and
  `BTN_ALLOW_WRITES\|savingOffExplain\|WRITE_ROOT_LABEL\|BTN_CONFIRM_WRITES\|CONFIRMING_WRITES\|savingOnLine\|STOP_SAVING\|SAVING_TITLE` —
  runs its vitest after the production edits, and updates every file that reddens, each named in §As built (a match on
  `outsideRoot` that is a redline sentence, e.g. `p227`/`p273`, is judged and left alone if green). Retired (deleted,
  named in the commit body, because the thing each pinned no longer exists): `p101-allow-writes.test.ts`,
  `p101-saving-block.test.tsx`, `p242-acceptance-copy.test.ts`.

## 6. Main state, the pin store and the local readers (builder D)

### 6.1 Contract and bridge
`src/shared/ipc/machines/presence.ts`: `savesInProjects?: boolean` appended to `MachineStateView` with the house comment.
`src/shared/ipc/machines.ts`: the table and the count (D17). `src/preload/machines.ts`: the two methods removed.
`src/main/machines/ipc.ts`: the two handlers and `writeRootOrThrow` removed; the Phase 102/103/104 comments that say
"the one confirmed field" corrected. `machine-state.ts`: `savesInProjects` (D18). `confirm.ts`, `schema.ts`,
`store.ts`: comments only (`confirm.ts:384`'s "Three doors" is two; `store.ts:376` stops naming `allowWrites`).

### 6.2 `src/main/manifest/remote-folder-pins.ts` (new), `schema.ts` (migration 019), `store.ts`
```ts
export interface RemoteFolderPin { readonly machineId: string; readonly path: string; readonly identity: string; readonly pinnedAt: number }
// ManifestStore:
remoteFolderPin(machineId: string, path: string): RemoteFolderPin | undefined;   // D7's regex, else undefined
setRemoteFolderPin(machineId: string, path: string, identity: string): void;     // upsert; refuses a bad identity
```

### 6.3 `src/main/fs/project-roots.ts` (new), `fs/ipc.ts`, `fs/open-with.ts`, `baselines/ipc.ts` (D15)

### 6.4 Tests (new files `p336-` prefixed)
`src/main/manifest/__tests__/p336-folder-pins.test.ts` (019 additive over a schema-18 file; version 19, min 13; set,
get, overwrite; a malformed stored identity reads as none); `src/main/fs/__tests__/p336-local-roots.test.ts` (pure
filter; the SHIPPING `writeGuarded` with a remote row naming a folder on this Mac answers `projectClosed`, and with the
same folder as a local row writes); `src/main/machines/__tests__/p336-saves-in-projects.test.ts`. Updated:
`src/main/machines/__tests__/ipc.test.ts`, `src/shared/__tests__/p125-machines-surface.test.ts`, and every manifest test
that pins the version or the migration list, each named.

## 7. The menus (the phase brief says this)

- **The application menu bar** (`src/main/menu.ts`): unchanged.
- **The Explorer's right-click menu on a project on another machine** (native, through `ui:popupMenu`,
  `tree-menu.ts:126-200`, `use-tree-menu.ts:203-224`): New File, New Folder and Rename now appear in any folder Tortie
  may write under, with no Settings visit. Its closing disabled line reads "Tortie cannot move files on <label> to the
  Trash." there, and §10's writes-off label elsewhere; it never names Settings.
- **Settings › Machines** (a settings surface, not a native menu): the Saving files block is gone from every row — the
  folder field, its Browse… picker, the confirm sheet, "Let Tortie save files here…", "Confirm saving on this machine"
  and "Stop Tortie saving files here".
- Not menus, named for completeness: the Explorer header's New file and New folder buttons and Source Control's Stage,
  Unstage and Commit enable by the same rule; the refused-save toast loses its "Open settings" button.

## 8. Gates and tools (builder C)

### 8.1 `conformance:machines` (`build/conformance-machines.mjs`, data `build/machines-conformance-probe.mts`)

Header paragraph "PHASE 336 APPENDED 113 TO 121 and left the list where it was" in the house shape. Each condition is
asked over the SHIPPING source (read with the TypeScript parser or by matching braces) and, where it can be, DRIVEN; each
has a one-clause ablation in `ablation:p336` that must read red on the condition that owns it.

| # | Fails when | Ablation (one clause, red on this condition) |
| --- | --- | --- |
| 113 the folder | `confirmedWriteRoot` is named under `src/`; any of the five verbs does not reach `writeFolderFor` before composing; `assertMachineMayConnect` is not asked before the candidates (order read in `writeFolderFor`'s body); candidates come from anything but that machine's open rows plus its legacy root; a legacy root holding the target is NOT chosen before a project inside it (§Attack G4); a rename does not use `pickWriteFolderForPair`; DRIVEN: D2's corpus answers wrong, or the shared pick and main's `relativeUnderRoot`/`rootRelativeCwd` disagree on any row | (a) the confirm call removed; (b) candidates from every machine; (c) shortest holder wins; (d) never-list skipped for projects; (e) a project inside a legacy root takes the write (legacy-first removed) |
| 114 the door | `runRemoteWrite` admits a folder-bound id, or `runFolderWrite` a machine-bound one; the catalogue's write rows are not exactly six `folder` and two `machine`; `runFolderWrite` does not append the pin last or does not compare the `folderArg` element; the brand symbol is declared or a `WriteFolder` literal built outside `write-folder.ts`; DRIVEN over a scripted exec: every refusal leaves zero sends | (a) the folder-bound check removed from `runRemoteWrite`; (b) the pin not appended; (c) the folder comparison removed; (d) `bound` flipped on one row |
| 115 the identity | `folder-pin` is not a one-value read or names BSD `stat -f` before GNU `stat -c`; any of the six texts lacks the prelude, holds it below `noLinkWalk` or below any line that writes, does not `cd -P` into the folder and name it `.` from then on (§Attack G2), lets any write line below the prelude reach its target through `"$FOLDER"`/`"$1"` rather than the anchored `.` (§Attack M9), compares the folder's identity against anything but its LAST positional, or prints a refusal with the wrong field count; main maps `notsame` to anything but `folderChanged`, or stores a pin after `notsame`; DRIVEN under `/bin/sh` AND `/bin/dash` and the two must AGREE (§Attack G1): a pinned folder writes; a link swap and a new folder at the path answer `notsame` with the far bytes unchanged; a linked ancestor writes; a link swapped in between the `folder-pin` read and the write answers `notsame`, victim unchanged | (a) the prelude removed from one script, named; (b) BSD first; (c) a write line below the prelude re-reads `"$FOLDER"` instead of `.`; (d) `notsame` mapped to `outsideRoot`; (e) `setRemoteFolderPin` called on `notsame` |
| 116 the never-list | D4's table answers wrong either way; the far prelude lacks any of D5's branches (empty or relative `$HOME`, an unreadable home identity → `nohome`; the folder's own identity not the pin → `notsame`; the folder's identity equal to `/`, to the home, to an ancestor of the home, or a child of the home → `offlimits`), compares HOME or the folder by path TEXT rather than by identity (§Attack G1), or applies to pin `-`; DRIVEN under a scratch `HOME` and both shells: a home, a home child, a home ancestor and a folder that is a link to the home each answer `offlimits` with nothing written, an empty `$HOME` answers `nohome`, and a legacy root AT the scratch `HOME` still writes | one ablation per branch (identity-home-equal, home-ancestor, home-child, empty-home, pin-`-`-skipped) and the three main (D4) rows |
| 117 reserved names | main's `foldReservedSegment` does not fold a Unicode spelling that an APFS volume folds (§Attack M5: `.ßh`, `.ſsh`, `.ẞh` must fold; `.github`, `x.git`, `.gıt` must not), or `isProtectedRemotePath` is not asked for every path a verb names before composing; the far FOLDER prelude does not refuse a `.git`/`.ssh` folder BY IDENTITY (so any fold); any of the six texts drops its ASCII rel bracket backstop, `file-put` lacks it, or any write text names `exit 1`; DRIVEN on this Mac's case-insensitive volume: main refuses `.GIT/config`, `.Git/hooks/x`, `.gIT/x`, a rename into `.SSH/`, a staged `.Ssh/x`, a cwd of `.GIT`, AND the Unicode folds `.ßh/x`, `.ſsh/x`, each `protected` with zero sends and the real `.git` md5 unchanged; the far prelude refuses a project folder that IS `.ssh` typed `.ßh` by identity | (a) the fold narrowed to ASCII (`.toLowerCase()` only); (b) `.ssh` dropped from `foldReservedSegment`; (c) `file-put` ASCII guard removed; (d) one `exit 1` restored; (e) main's check removed from rename's second end; (f) the far folder identity-`.ssh` compare removed |
| 118 the open pins | `addRemoteProjectAdmitted` does not call `pinOpenedFolder` after the upsert, or lets its failure reach the result; the write path pins when a pin is stored; `rehomeRemoteSessions`, `openTabsForRemoteCreate` or `releaseFoldersAfterFailedRemoteCreate` names a pin function; DRIVEN: a second open with a new identity overwrites the pin, a throwing read leaves the open `ok` and the old pin in place | (a) the call removed; (b) the call's error propagated; (c) the write path re-pins over a stored pin |
| 119 local readers | `src/main/fs/project-roots.ts` does not filter rows carrying a machine; any of the four deps does not call `localProjectRoots`; any file under `src/main` maps `listProjects()` to paths elsewhere; DRIVEN: the SHIPPING `writeGuarded` with a remote row naming a folder on this Mac answers `projectClosed` | one ablation per reader (four) and one for the filter |
| 120 nothing he confirmed moves, and no door asks him | `APPENDED_KEYS` is not exactly `acceptedTmuxVersion`, `writeRoot`, or `MACHINE_ROW_KEYS` changed; the base row with `writeRoot: '/Users/gdc'` does not hash to M2's `f09ddd90…9e66` (a literal, taken at the parent, beside condition 42's); `machines:writeSheet` or `machines:allowWrites` is named in `src/`; `BTN_ALLOW_WRITES` or "Let Tortie save files here" is named in `src/renderer`; any write sentence under `src/renderer/machines/{editor,explorer,scm}.ts` or `remote-copy.ts`'s commit set, called with a fixed label, says "Settings" or "then Machines" | (a) a channel re-added to preload; (b) one sentence restored; (c) `writeRoot` dropped from `APPENDED_KEYS` |
| 121 a changed machine | DRIVEN over the row store: a row whose hash moved makes each of the five verbs throw the gate's own sentence with zero composes and zero sends, and `machineStateViewOf` answers `savesInProjects: false` for it and `true` for a confirmed row | (a) `savesInProjects` from the file rather than the status |

Existing conditions are RE-POINTED, never weakened, each edit named in §As built: condition 86m's "Eight callers"
sentence (fault 6); 38, 50 and `WRITE_PATH_GUARD`/`INDEX_PATH_GUARD` (`:3183`, `:4171`) for D10 and D12; 80 (no
refusal word below the first write) gains the new words; 88's ten-line slice still reads `noLinkWalk` from the line that
names the value; `REMOTE_SCRIPT_COUNT` 29 → 30 and every count sentence; the catalogue's params and field counts for D8;
79 stays (the field is still hashed).

### 8.2 `ablation:p336` (`build/p336/ablation.mjs`)

Every ablation in §8.1's table (about 45), plus the vitest-owned clauses: D19 (the open refused again), D18 (a tab in an
open project read only; a never-listed project editable), D10's Unicode fold in the renderer's tab read-only rule, the
anchored-`.` write-line clause (115c, red in `p336-far-prelude.test.ts` where the swap-in-the-window arm writes the
victim), and the `nohome` branch (red in the prelude test under both shells). Each edits the shipping source in place,
runs the one owner, requires red on THAT owner, and restores every file by sha256 in a `finally` (the `ablation:p320`
shape, `build/p3201/ablation.mjs`). `--list` prints the arms without running.

### 8.3 `probe:p336:script` (`build/p336/script-arms.mjs`, node only, no Electron, no ssh, no tmux)

Reads the SHIPPING texts through `build/p336/far-texts.mts` under the pinned tsx and runs them under `/bin/sh` and
`/bin/dash` over scratch trees with main BYPASSED (the far half alone): this spec's §9 shapes H1 to H4 and H8, §Attack
M8's rows (every one asserted to AGREE between the two shells, G1), the check-to-write race (M9, the victim read back
unchanged), and the 242 family's arms with pin `-`. On this Mac's case-insensitive boot volume always; on a
case-sensitive APFS image (`hdiutil`, no sudo, detached and deleted in a `finally`, the `conformance:samefolder`
precedent) when `P336_CASE_VOLUME=1`, to show a `.git`/`.ssh` FOLDER still refused there by identity and a `.GIT` rel
name treated as a separate folder (the far rel backstop's accepted ASCII limit on a separating volume). Every shell with
the scratch HOME, ZDOTDIR, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, removed in a `finally`. Registered in
`package.json` and classified in `build/verification-checks.mjs`.

### 8.4 `probe:p336` (`build/p336/probe-p336.mjs`) — §9

Registered as `node build/harness-socket.mjs --fresh gmux-p336 'export GMUX_CONFIG_ROOT="$GMUX_HARNESS_DIR"; export
SCRATCH_MACHINE_QUIET_SHELL=1; export SCRATCH_MACHINE_SCRATCH_HOME=1; if [ "${P336_FAR:-loopback}" = real ]; then node
build/p336/probe-p336.mjs; else node build/with-scratch-machine.mjs -- node build/p336/probe-p336.mjs; fi'`, classified
`electron`. `--grader-self-test` grades recorded fixtures (`build/p336/fixtures/`: an honest HEAD record, an honest
parent record, and mutations made in code) and starts NOTHING: every grade clause must read red on its own break (a
refused arm answering `wrote`, a victim md5 moved, the real `.git` md5 moved, a parent arm missing, a "Settings" string
drawn, the 150 KB file refused, the dotfiles moved, a `-L gmux` count moved). Knobs: `P336_PARENT_CHECKOUT` (a built
parent), `P336_ARMS`, `P336_KEEP`, `P336_FAR=real` (verifiers only, through `build/p3201/real-machine.mjs`).

### 8.5 Tools touched beside the probe

- `build/scratch-machine.mjs`: D23.
- `build/p3201/real-machine.mjs`: refusal 4 also accepts a `gmux-p336…` harness socket; nothing else; its
  `--self-test` gains that row and a refusal for `gmux-p336` without a pid.
- `build/probe-p242-write-path.mjs` and `build/probe-p10{1,2,3,4}-shot.mjs` drive the removed sheet. Each now refuses
  at start, exit 2, with one sentence naming Phase 336 and `probe:p336`, unless given `--self-test` where it has one;
  `probe-p242-write-path.mjs` keeps exporting `ATTACK_ARMS`, which `probe:p336` imports. They are never run as
  photographs by anyone in this phase.
- `docs/ACCEPTANCE-p242.md`: one opening paragraph saying Phase 336 removed the controls it names and that saving now
  follows the projects opened on a machine.
- `build/assert-electron-teardown.mjs`: D24. `build/background-fixtures.mjs`, `build/known-hosts-fixtures.mjs`: only if
  a new shape walks past either gate.

## 9. The proof, run rather than read (verifiers only, under the lock; HEAD and the parent `2867bc39`, one Electron at a time)

Every app run goes through `build/electron-run.mjs`, with a scratch profile, HOME and socket `gmux-p336-<pid>`, the
scratch `agents.json` that renames the Gemini, Qwen, Antigravity, Grok and Droid binaries before every launch and is read
back through `agents:list` (the `probe:p332` practice), no model turn, and every far folder under the loopback yard (or,
on his Mac Pro, under `/tmp/p3201-<pid>/far/`). The PARENT RUNS FIRST on a profile the HEAD run then reuses, so the HEAD
run is also the proof that a confirmed machine stays confirmed and that migration 019 meets a real schema-18 manifest.

| Arm | Drives | Graded at HEAD (the parent's reading printed beside it) |
| --- | --- | --- |
| L (legacy) | at the parent, `<far>/legacy` set as `writeRoot` through the parent's own `machines:writeSheet` and `machines:allowWrites`; at HEAD the same profile | HEAD reads the row `confirmed` with no re-confirm, its hash equal to the parent's record; a save, a new folder, a stage and a commit under `<far>/legacy` answer `wrote`, `made`, `done`, `committed` at both builds |
| A (the verbs) | `projects:addRemote` of `<far>/p336-a/repo` (a git repo, identity by `git config --local`), then putFile (contents compared first), makeDir, rename, stage, unstage, commit | parent: `writesOff` × 5 and commit `refused`; HEAD: `wrote` (far sha256 = payload), `made`, `moved`, `done`, `done`, `committed` |
| A2 (a second tree) | `<far>/p336-b/other`, unrelated to A | HEAD: a save `wrote` (one `writeRoot` could not do both) |
| B (linked ancestor) | `<far>/link-above/repo` with `link-above` a link to `real-above`; the yard itself sits under a linked `/tmp` or `$TMPDIR` | HEAD: save `wrote`, new folder `made`, stage `done`; the parent under the legacy root at the same linked spelling answers the same (no scenario worse) |
| H1 (swap for a link) | after a good save in A, its folder replaced by a link to `<far>/victim-dir` | each of the five verbs `folderChanged`; victim md5 and listing unchanged; then `projects:addRemote` of the same path (a hand open) re-pins and a save `wrote` |
| H2 (swap for a new folder) | the folder moved away and a new one made at the path | `folderChanged`, nothing written in either |
| H3 (opened at a link into `.ssh`) | `<far>/innocent` → `<scratch home>/.ssh`, opened by hand (and a second row `<far>/inn2` → `<scratch home>/.ßh`, the sharp-s fold, §Attack M5) | putFile `new` answers `protected` for BOTH (the far prelude catches the folder BY IDENTITY, D10, so the fold needs no name match); nothing appears in `<scratch home>/.ssh` |
| H4 (reserved, other case and Unicode fold) | putFile `.GIT/config`, putFile `new` `.Git/hooks/pre-commit`, makeDir `.gIT/x`, rename into `.SSH/`, stage with a cwd of `.GIT`, AND putFile `.ßh/x`, makeDir `.ſsh/x` | `protected` each (the Unicode folds refused by main's `foldReservedSegment`, §Attack M5, with zero sends); the real `.git/config` md5, `.git/hooks` listing and `.ssh` listing unchanged; parent: printed |
| H5 (planted rows) | with the app down, `/usr/bin/sqlite3` inserts remote rows into the scratch profile's manifest: at `/`, at the scratch far `HOME`, at an ordinary scratch folder `<far>/planted` | `/` and HOME: `writesOff`, nothing written; `<far>/planted`: `wrote`, printed as THE RISK HE ACCEPTED (§9 of research 138), graded only as "behaves as ruled" |
| H5L (the local gate) | `fs:writeGuarded` with `root` = `<far>/planted`, which on the loopback machine is a folder on this Mac | HEAD: `projectClosed`, file unchanged; parent: `wrote` (fault 5 measured at the parent) |
| H6 (changed machine) | the scratch `machines.json` port edited while the app runs, then put back | each verb throws the gate's own sentence, far bytes unchanged, `savesInProjects` false; after the edit is undone, writes resume with no confirm |
| H8 (home rules) | projects at the scratch far `HOME` and `HOME/child` (D23), and at `HOME/child/grand` | `writesOff` naming the folder twice, then `wrote`; on his Mac Pro this arm is NOT run (his real home) |
| R (renderer, one launch) | in A: open a file, read Monaco's `readOnly` and the tab's dirty state after one typed character, save; the Explorer header buttons; Commit enabled with a staged file; a 150,000-byte file in A; a project opened from Home's recents; the Settings window's Machines row | editor writable and the save `wrote`; buttons enabled; Commit enabled; the large file OPENS read only with §10's chip (parent with a legacy root: refused); the recents project writable; no `data-machines-action="browse-writes"`, no "Let Tortie save files here…", and no drawn string on any remote write surface names "Settings" |

**Also, verifiers:** `probe:p336:script` (both shells; the case-sensitive image once); `npm run typecheck && npm run
build && npm run smoke:t1`, `npm test`, `npm run smoke:t3`, `npm run smoke:remote`; `conformance:machines`,
`ablation:p336` (every arm red on its owner), `conformance:samefolder`, `conformance:save`, `conformance:redline`,
`conformance:remoteclose`, `gate:contract`. Electrons, tmux servers, far folders, sshd and ssh agents counted ONCE, at
the end, by CLAUDE.md's command.

**His Mac Pro (verifiers only, `P336_FAR=real`, through `build/p3201/real-machine.mjs`):** arms L, A, A2, B (`/tmp` is
a linked ancestor there), H1, H2 and H4 at the parent and at HEAD, every folder under `/tmp/p3201-<pid>/far/`, removed
in the harness's `finally`; his `-L gmux` session count equal before and after (the harness's one count-only read);
`~/.zsh_history`, `~/.bash_history` and `~/.zshrc` size and modified time equal or the run FAILS; whether his volume
folds case printed from a far read before H4 is graded; no history file written there; install nothing.

**The removal rule.** A row worse than the parent removes the part that owns it: a renderer row → the renderer keeps
today's read-only rule for that surface; an identity row that refuses a folder the parent saved under a legacy root →
the prelude stays skipped for that kind; a verb that writes where the parent refused for a reason this spec did not
rule → that verb lands writes off. A second needs_work on one problem goes to him.

## 10. Words (builder B composes them in `src/renderer/machines/`, builder A the commit ones in `remote-copy.ts`)

| Where | Sentence |
| --- | --- |
| Read-only chip, outside every project | `This file is on <label>, outside the projects you opened there, so Tortie only shows it.` |
| Read-only chip, never-list | `Tortie does not save in a home folder, a folder directly inside one, or a folder holding one, on <label>.` |
| Read-only chip, over the save cap | `That file is <n> bytes and Tortie saves files up to 90,000 bytes on <label>, so it is shown read only.` (the cut-read form says "over <n>") |
| Save refused, `writesOff` with no folder | `Tortie saves on <label> only inside a project you opened there. Nothing was written.` |
| Save refused, `writesOff` naming a folder | the never-list chip + ` Nothing was written.` |
| `folderChanged` (save) | `<folder> on <label> is not the folder you opened any more, so Tortie wrote nothing. Open it again to save there.` |
| `protected` (save) | `Tortie does not touch .git or .ssh folders on <label>. Nothing was written.` (local's own refusal is "Tortie does not touch the .git folder.") |
| Explorer and Source Control | the same three with "changed nothing" / "Nothing was changed." |
| Tree menu note, writable | `Tortie cannot move files on <label> to the Trash.` |
| Tree menu note and header titles, not writable | the writes-off label without "Nothing was …" |
| Commit (main) | `commitWritesOff`: `Tortie commits on <label> only in a project you opened there, so it committed nothing.`; `commitFolderChanged`: `<folder> on <label> is not the folder you opened any more, so Tortie committed nothing. Open it again to commit there.`; `commitProtected`: `Tortie does not commit from inside a .git or .ssh folder on <label>, so it committed nothing.`; the never-list: `Tortie does not commit in a home folder, a folder directly inside one, or a folder holding one, on <label>.` |

No tmux vocabulary; no sentence names Settings; nothing explains that the machine is remote.

**CHANGELOG** (integrator), `## Unreleased` → `### Added`, one line, the commit link added by the follow-up docs commit:

`- Saving, renaming, making folders, staging and committing now work in every project you open on another machine, as they do on your Mac, with nothing to turn on in Settings; Tortie still does not save in a home folder or a folder directly inside one, or inside a .git or .ssh folder there, and a file too large to save on that machine opens read only`

**CLAUDE.md** (integrator): the `conformance:machines` row's Touching column adds `src/shared/remote-write-folder.ts`,
`src/main/manifest/remote-folder-pins.ts` and migration 019 in `src/main/manifest/schema.ts`,
`addRemoteProjectAdmitted` in `src/main/sessions/core.ts`, `src/main/fs/project-roots.ts` and the `listProjectRoots`
deps in `src/main/fs/ipc.ts`, `src/main/fs/open-with.ts` and `src/main/baselines/ipc.ts`, and the write sentences in
`src/renderer/machines/{editor,explorer,scm}.ts` and `src/renderer/settings/{MachineRow.tsx,machines-copy.ts}`; its
proof column gains one sentence for 113 to 121 and `ablation:p336`. The probes table gains `probe:p336` (the app run,
§9, cost measured by the verifier) and `probe:p336:script` (node only). No CLAUDE.md row names the write root today, so
none is rewritten.

**Contract baseline** (integrator, obligation 3): `node build/contract-inventory.mjs --out
docs/audits/contract-baseline.txt`; the lines that move are `[ipc.invoke.channels]` 247 → 245 (`machines:allowWrites`
and `machines:writeSheet` gone), `[sqlite.identity]` `user_version=19`, `[sqlite.migrations]` count 19 with
`019-remote-folder-pins`, and `[sqlite.schema]` objects 12 with the new table. The outcome words do not move it (the
inventory does not list unions; research 138 §4.3 said otherwise).

**Commit body** carries: the measurements; the four readers (not three); the retired tests and probes by name; the
floor 165 → 166; that a build from before this phase sharing the profile ignores the pin table and loses nothing; and
that a Linux far side was not measured (§13).

## 11. Builders, disjoint files

- **builder-a-writepath** (writes §4.1 FIRST): `src/shared/remote-write-folder.ts` (new),
  `src/shared/ipc/machines/filesystem.ts`, `src/shared/ipc/machines/scm.ts`, `src/main/machines/write-folder.ts` (new),
  `src/main/machines/{remote-scripts,remote-run,remote-file,remote-entry,remote-stage,remote-commit,remote-copy,remote-clone,remote-image,remote-smoke}.ts`,
  `src/main/sessions/core.ts` (`addRemoteProjectAdmitted` only), §4.8's tests and every existing test under
  `src/main/machines/__tests__` and `src/shared/__tests__` that its changes break, except those builder D owns.
- **builder-b-renderer**: everything in §5, and every test under `src/renderer` it names.
- **builder-c-proof**: `build/conformance-machines.mjs`, `build/machines-conformance-probe.mts`, `build/p336/*` except
  this file (probe, script arms, far texts, ablation, fixtures), `build/scratch-machine.mjs`,
  `build/p3201/real-machine.mjs`, `build/probe-p242-write-path.mjs`, `build/probe-p10{1,2,3,4}-shot.mjs`,
  `docs/ACCEPTANCE-p242.md`, `build/assert-electron-teardown.mjs`, `build/verification-checks.mjs`, `package.json`, and
  `build/{background,known-hosts}-fixtures.mjs` only if needed.
- **builder-d-state**: everything in §6 (`src/shared/ipc/machines/presence.ts`, `src/shared/ipc/machines.ts`,
  `src/preload/machines.ts`, `src/main/machines/{ipc,machine-state,confirm,schema,store}.ts`,
  `src/main/manifest/{schema,store,remote-folder-pins}.ts`, `src/main/fs/{project-roots,ipc,open-with}.ts`,
  `src/main/baselines/ipc.ts`), `src/main/machines/__tests__/ipc.test.ts`,
  `src/shared/__tests__/p125-machines-surface.test.ts`, the manifest tests, and §6.4's new files.
- **Integrator**: `CHANGELOG.md`, `CLAUDE.md`, `docs/audits/contract-baseline.txt`; reconciles the four builders
  (A codes against D's two `ManifestStore` methods; B against A's shared module and D's view field; A removes the two
  channel/method definitions in `filesystem.ts` while D moves the bridge count in `machines.ts` and removes the two
  preload methods, so the integrator checks the two halves meet by running `gate:contract` and typecheck); runs the
  battery that launches no Electron; writes §As built.

Every builder and the integrator: no Electron; no `-L gmux`; no ssh to any host but the loopback machine; every shell a
test starts with a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; every process started ended
by pid in a `finally`; no commit, stage or stash; `npm run -s typecheck` and its own vitest files, exits and counts
reported. Builder C also runs `conformance:machines`, `ablation:p336 --list`, `probe:p336:script` and
`probe:p336 --grader-self-test` (which start no Electron) and D23's `HOME` measurement.

## 12. The verifier's brief (Tier 3)

At least two independent methods, one an attack, each named in the verdict:
1. **Attack** with a corpus of its own through the SHIPPING texts and the live app: a pin planted in the manifest for a
   link target; a link swapped in during the round trip between the pin read and the write (D6's first-write path, which
   §Attack G2's anchored `.` closes — the attack must confirm the swap answers `notsame`, not `wrote`); a reserved name
   in a Unicode fold the volume folds (`.ßh`, `.ſsh`, §Attack M5) as the folder AND as the relative path; a
   folder typed in a different case than the home or the `.ssh` it resolves to, under BOTH `/bin/sh` and `/bin/dash`
   (§Attack G1 is the reason both shells are mandatory); a folder name holding `*`, `[`, a space and a newline; `$HOME`
   unset, relative and pointing at `/`; a folder `cd -P` cannot enter; a legacy root with a project opened inside it,
   confirming the legacy root still takes the write (§Attack G4); two nested projects with the outer one never-listed.
2. **Re-derive**: its own oracle for the never-list and the identity (a separate implementation over `fs.realpathSync`
   and `fs.statSync`, or another language) over a tree corpus of its own, compared row for row with the far texts'
   answers; and the hash literals in condition 120 recomputed by its own reimplementation.
3. **Real data**: the Mac Pro row of §9, with `tmux -V`, node, both session counts and the three dotfiles before and
   after.
4. **The parent measured** in every arm.
Report once, at the end, the Electrons, tmux servers, sshd, agents and far directories left.

## 13. What is NOT in this phase

- **A Linux far side is unmeasured.** No Linux machine was reachable; the GNU `stat -c '%d:%i'` branch is read, not
  run; ext4 and XFS reuse inode numbers, so a folder deleted and made again at the same path may pass the pin (stated,
  not fixed); `entry-rename`'s existing BSD-first `stat -f '%d %i'` exists check (`remote-scripts.ts:2858-2915`) is
  unchanged and on Linux refuses a case-only rename as `exists` (fails closed).
- No change to the picture drop or clone; no folder bound on either.
- No change to confirming a machine: the sheet gains no line, no field is hashed anew, no hash moves.
- No pin for a legacy `writeRoot`, so research 138 §2.5 item 1 still applies to one; no way to set a new one in Tortie.
- No write outside an open project's folder except under an existing `writeRoot`.
- No auto save of a file on another machine (`auto-save.ts:172`, unchanged) and no Trash there.
- No wall against a program running as him, which can use Tortie's key file and live connection (research 138 §2.3).
- Stage and commit still bound the tab's folder, not the repository root (242.1's trade, `remote-stage.ts:63-75`).
- A remount that changes a folder's device number answers `folderChanged` until he opens the folder again (fails closed).
- No change to local saving: `isProtectedFsPath` stays `.git` only, `fs:writeFile` unchanged.
- No application menu change; no remote conversation reading, needs-input detection or phone reply for remote sessions.
- No release.

## 14. What the entry and the research got wrong, or left open

1. Research 138 §2.5 item 5 named three local readers; there are four (`baselines/ipc.ts:55`, M4).
2. Research 138 §4.3 and §4.8 said the outcome word moves the contract baseline; the inventory carries no unions, and
   the baseline moves for the two removed channels and migration 019 instead (§10).
3. Research 138 §4.3's prelude, run under dash, passes an empty `$HOME` (M1 row 17); D9 refuses it first.
4. Research 138 §5's downgrade loss does not arise under his ruling: no machine row changes shape (D22).
5. The entry's question 3 ("kept as an additional allowed folder, or folded away") is answered: kept, today's bound (D16).
6. Five scripts outside `src/` drive the Settings sheet this phase removes; left alone they would fail mid-run, so each
   now refuses by name (§8.5).
7. Research 138 §9's never-list, read literally, makes `~/<name>` read only on another machine (§16 Q1).

## 15. Attack first

- The round trip between the pin read and the first write on a rehomed row (D6): a swap there must answer `notsame`.
  The anchored `.` (§Attack G2) is what makes it hold; the attack confirms it answers `notsame`, not `wrote`.
- dash and bash both, everywhere the prelude runs, and the two must AGREE on every row (§Attack G1 is the reason).
- A folder reached through a linked ancestor must keep saving at HEAD wherever the parent's legacy root saved (B).
- A legacy root with a project opened inside it: the legacy root still takes the write (§Attack G4).
- A reserved name in a Unicode fold the volume folds, as the folder and as the relative path (§Attack G3, M5).
- The renderer and main disagreeing about one path (condition 113's agreement corpus, and R).
- `.GIT` on his Mac Pro's volume, whatever its case rule turns out to be; and a `.ssh` FOLDER by identity, which holds
  whatever the volume's case rule is.

## 16. For him

**Q1 (does not block the build).** Research 138 §9 keeps "`/`, a home directory and its first-level children are never
a folder Tortie writes under". Read literally, a project at `~/<name>` on another machine (the depth of
`/Users/gdc/gmux` on this Mac) stays read only, with the never-list sentence on its tabs; before this phase he could
have saved there by typing that folder in Settings, which this phase removes. The build follows the rule as kept.
Recommended: narrow the first-level clause to a home's first-level children whose names start with a dot, plus
`Library`, which keeps every folder the clause was for (`.ssh` is refused by name anyway, `.config`, `.aws`, `.gnupg`,
`Library`) and makes `~/<project>` save as it does on his Mac. It is one predicate in `src/shared/remote-write-folder.ts`
and, because the far prelude now judges the home-child case BY IDENTITY (§Attack G1) and identity carries no name, one
extra far clause that reads the child's basename before the home-child refusal, with condition 116's two rows.

---

## §Attack. The adversary round, measured, and what the revision closed

The spec writer's draft was attacked before anything was built. Five gaps were found and measured; each is closed in
place above. The scripts are in `scratchpad/p336/adversary/` (NOT in the tree): `fold.mjs`, `foldfn.mjs`, `pwdcase.sh`,
`prelude-id.sh`, `prelude-anchor.sh`, `prelude-d9.sh`, `run-id.sh`, `run-anchor.sh`, `run-d9.sh`, `race.sh`, `loop.mts`.
Every shell ran `env -i`/`env` with a scratch `HOME`, scratch `ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`;
every tree was removed in an `EXIT`/`finally`; the loopback run went through `build/with-scratch-machine.mjs` under a
lock slot and left zero processes, zero far directories, and `git status --short` showing only `?? build/p336/`.

**G1 — a path-text comparison is not portable, so the far half must use identity (fixed: D5, D9).** The draft's D9
compared the far `$HOME`'s `pwd -P` text against the folder's. §Attack M7 drove the draft's own D9 text
(`prelude-d9.sh`) under both shells over a home/child/ancestor typed in a different case and over `.ßh`/`.ſsh`:

```
HOME typed upper        sh    pass      dash  offlimits
HOME child typed upper  sh    pass      dash  offlimits
ancestor typed upper    sh    pass      dash  offlimits
link text .ßh/keys      sh    pass      dash  offlimits
folder typed .ſsh/keys  sh    pass      dash  offlimits
```

macOS `/bin/sh` is bash 3.2 (§Attack M6, `pwdcase.sh`: `cd -P` keeps the spelling it was handed), `/bin/dash` folds it
(returns the stored case). A path-text rule therefore passes on the machine the product actually runs on. The revision
compares `<dev>:<ino>` on both sides, which both shells read identically. M8 (`run-id.sh`, then `run-anchor.sh`) drove
the identity prelude over 27 shapes under both shells and every row agreed: `pass` for the pinned folder, a home
grandchild, a linked ancestor and a glob/space/newline name; `offlimits` for the home, a home child, a home ancestor
and a link to the home, each typed in another case; `protected` for a `.ssh`/`.git` folder reached by name, link, or
the `.ßh`/`.ſsh` fold; `notsame` for a swap, a new folder and a deletion; `nohome` for an empty, relative or missing
`$HOME`; `badname` for a relative folder. The loopback run (`loop.mts`) reproduced the split on the real machine
(`specD9` read `pass` where `identity` read `offlimits`/`protected`).

**G2 — a check through `"$FOLDER"` and a write through `"$FOLDER"` are two resolutions, so a swap in the window escapes
(fixed: D9, D14 step 7).** `race.sh` drove two variants: variant A reads the pin through `"$1/."` then, after a 1 s
window, writes `"$1/$2"`; variant B does `cd -P -- "$1"` once and writes through `.`. A link swapped into the folder's
path during the window:

```
sh/dash  A answered wrote    victim=PAYLOAD   original-folder-file=absent   (ESCAPE)
sh/dash  B answered wrote    victim=orig      original-folder-file=PAYLOAD  (held)
```

So the prelude enters the folder with `cd -P` ONCE and every line below — the identity check AND every write — names
the folder as `.`. One resolution, and the swap is a no-op against the open descriptor. This also closes D6's
first-write round-trip race for free: the pin is read in one call and carried to the write, whose own anchored prelude
re-reads `.`'s identity and compares it to the carried pin.

**G3 — APFS folds more than ASCII case, so a reserved name needs a real fold in main and identity on the far side
(fixed: D10).** `fold.mjs` made `.ssh` and `.git` and stat'd 18 spellings against them on this Mac's data volume. SAME
folder: `.SSH`, `.Ssh`, `.ſsh` (long s), `.sſh`, `.ſſh`, `.ẞh` (capital sharp s), `.ßh` (sharp s), `.GIT`. Not that
folder: zero-width and fullwidth variants, dotless `.gıt`, `.gİt`. The loopback run drove the draft's ASCII bracket
guard on the relative path:

```
shippingFilePut (today, no .git guard on file-put): wrote  -> landed in .ssh
specAsciiGuard .ßh/authorized_keys:                 wrote  -> landed in .ssh  (ESCAPE)
specAsciiGuard .SSH/authorized_keys:                protected
```

`foldfn.mjs` validated the revision's `foldReservedSegment` (NFKC, strip format chars, lowercase, `ß→ss`): 13 reserved
spellings caught, 12 near-misses passed, 0 wrong. Main folds for every product write; the far FOLDER is caught by
identity in any fold; the far REL keeps the ASCII backstop with its residual stated (D10).

**G4 — a project opened inside a legacy root must not take the write away from the root (fixed: D2, D16).** The draft
said a project "wins a tie with the legacy root". But a legacy root has no pin and no never-list, while a project inside
it gets a pin — so opening a project inside his confirmed `writeRoot` would subject writes there to a `folderChanged`
refusal on an ordinary re-clone, a scenario WORSE than today. The revision chooses a legacy root that holds the target
FIRST, so a `writeRoot` machine behaves exactly as today whatever is opened inside it. (He has no `writeRoot` today, so
this is latent; the gate drives it anyway, condition 113e.)

**G5 — the renderer test list was hand-enumerated, wrong and short (fixed: §5).** The draft named nine renderer tests
to update; `grep -rln "writeRoot\|WriteRoot\|machineWriteRootFor\|outsideRoot" src/renderer --include='*.test.ts*'`
returns 17, and the removed copy constants break `machines-copy.test.ts` besides. The list is now DERIVED from two
greps plus "every test the change reddens", each named in §As built, so a builder cannot leave a red test by following
a stale list.

**What the attack did NOT change, stated so the reverify does not re-litigate it.** The D23 scratch-HOME lending is
still needed for the APP arm H8, and was NOT exercised here: §Attack's far-home rows used a per-command
`env HOME=<scratch>` in the main-BYPASSED script path (`loop.mts` confirmed the loopback far `$HOME` is otherwise his
real home), which the product's own ssh cannot inject, so the app arm still rests on D23's `SetEnv` and builder C must
drive it (D23). The Linux `stat -c` branch and ext4 inode reuse remain unmeasured (§13). The far REL non-ASCII-fold
residual with main bypassed remains stated, not closed (D10), because every product write folds in main first.

---

## §As built (the integrator, 2026-10-05)

Four builders wrote disjoint halves in `/private/tmp/wt-p336` over `e58b0c30`; the integrator reconciled them, ran the
battery that starts no Electron, and wrote this section. Nothing is committed, staged or stashed. Where a decision
below departs from the sections above, this section is what the tree holds and says why.

### What each builder built, and where it departs from the spec

**Builder A, the write path (§4).** `src/shared/remote-write-folder.ts` (new; it also exports `resolveRemotePath` and
`relativeInFolder`, because the module may import no `node:` module), `src/main/machines/write-folder.ts` (new; the
brand is declared and built there alone), `folder-pin` at the foot of the catalogue (30 scripts), `folderCheck` in all
six folder-bound texts (params 5, 3, 4, 5, 5 and 6), `relGuards` (`badname`, then `protected`, `.git` and `.ssh` in
any ASCII case, `file-put` included), `runFolderWrite` and the `runRemoteWrite` refusal
`FOLDER_SCRIPT_THROUGH_MACHINE_DOOR`, the five verbs in D14's order, the §10 commit sentences plus one name refusal
sentence for D12 (`remoteNameRefused`), and the one `await pinOpenedFolder(...)` in `addRemoteProjectAdmitted`.
Departures:
1. **The git verbs reach the repository FROM THE CHECKED FOLDER (`repoAnchor`).** D9 said these verbs "already do
   `cd .`"; the tree ended with `cd "$r"` / `cd "$1"`, a second resolution by path, so a folder swapped for a link
   after the check would still have moved git to another repository. `repoAnchor` steps into the tab's folder from
   `.` and climbs by `..` comparing device and inode with the root's. It adds no git line. A held `stat` swaps the
   repository for a link inside that window and the stage lands in the one the climb found (the far-prelude test's
   second race; reverting to `cd "$r"` reddens it).
2. A stored project path may hold `..` (D2 sends it as one string); the `..` refusal on the folder is kept for a legacy
   root only.
3. The `stat` dialect is chosen before the legacy branch (the anchor needs it there too); a legacy root that cannot be
   entered answers the word its verb already used (`missing`, `noparent`, `gone`, or `notsame` for the git verbs).
4. The first-write pin is stored after the read and BEFORE the write, so a swap between the two leaves the original
   folder's pin in place; `notsame` stores nothing.
5. Outcomes that moved, with their tests: a path no folder holds is `writesOff` with no folder (with a legacy root it
   was `outsideRoot`); a rename no single folder holds is `outsideRoot` naming the source's folder when the source is
   in one, else `writesOff`.
6. Stage: the two-dots check runs after the "was this path reported" check, so `../x` keeps
   `STAGE_PATH_NOT_REPORTED`; reserved names are asked of a rename's second staged path too; a far `badname` throws on
   the first chunk and is `partial` on a later one.
7. Commit: a pin read that throws answers `offline`.
8. A legacy root that is itself inside `.git` or `.ssh` is refused `protected` (D10 holds for legacy roots).
Existing tests updated: `p101-remote-file`, `p102-remote-entry`, `p103-remote-stage`, `p104-remote-commit`,
`p242-link-refusal`, `p242-1-cwd-link-refusal`, `remote-scripts`, and `p231-liveness` (its door list lacked
`runFolderWrite`). `remote-smoke.ts` arm 10k now asserts the folder-door sentence for `git-commit` through
`runRemoteWrite`, keeps the read-door arm, and moves the not-answering arm to `image-put` (§4.6); it is NOT driven here
(`smoke:remote` starts an Electron). Builder A's own ablation: 30 arms, 29 red; the one green arm is the "folder is
`/`" line after the walk, which the home-ancestor walk already catches (`/` is an ancestor of every home); the line is
kept because D9 asks for it.

**Builder B, the renderer (§5).** `remoteWriteFolderIn(states, projects, machineId, path, mode)` replaces
`machineWriteRootFor` and answers a folder or `unconfirmed`, `outside` or `never`; a row is `unconfirmed` when
`savesInProjects === false`, or when it carries neither `savesInProjects: true` nor a non-empty `writeRoot`.
`remoteTabWriteFolder` gives MonacoHost, the store's dirty rule and the panel one answer. Departures:
1. **`saveCapped` is `{ bytes, over }`, not `true`** (§5, D19), because the band prints the size and says "over" for a
   read cut at its ceiling.
2. Sentences §10 does not list, in the builder's words: the `unconfirmed` band, its save sentence, its Explorer label
   and its commit label; `remoteStageOutsideRoot` reworded to drop "given permission".
3. The save-cap band stands before the cut-file band (a remote read cut at its ceiling is also over the save cap);
   commit tabs get neither.
4. `app/__tests__/machine-vocabulary.test.ts`: §10's "… .git or .ssh folders …" tripped its `ssh` word rule, so the
   dotted folder name is stripped before matching, and a new case shows `ssh` and `sshd` elsewhere are still caught.
Retired: `p101-allow-writes.test.ts`, `p101-saving-block.test.tsx`, `p242-acceptance-copy.test.ts`. Updated:
`p101-remote-open` (rewritten for D19), `p101-remote-save`, `p903-c-remote-save`, `p903-c-remote-copy`,
`p104-commit-box`, `p101-machine-write-root` (its legacy half), `p102-remote-entry`, `p233-remote-move`,
`p127-tree-hooks`, `p233-remote-commit-tab`, `machines-copy`, `machines-section`, `p903-b-tree-menu-remote`.

**Builder C, the proof (§8).** Conditions 113 to 121 and the re-points, `ablation:p336` (50 arms), `probe:p336:script`,
`probe:p336`, D23, the retired drives, `HELPER_USER_FLOOR` 165 → 166. Departures:
1. **`ablation:p336` edits a CLONE, not the tree in place** (§8.2), as `ablation:p320` does, so four builders writing
   one worktree could not lose work; every clone file is restored and checked by sha256.
2. `ablation:p336` registered and classified (gate:checks requires it); `probe:p336` classified `remote`, not
   `electron` (§8.4), by that file's own rule for a probe wrapped in the loopback machine (`probe:p320` is the
   precedent).
3. Clauses that need the machines store, the manifest or the confirm record cannot run in a plain node probe; the gate
   header names them and each has a vitest-owned ablation arm: a changed row composing nothing, the pin read once, a
   stored pin not read again, `pinOpenedFolder` swallowing a failed read, a second hand open overwriting the pin.
4. The gate drives the 29 adversary shapes through `file-put` and `git-stage` only (115 reads every text for the one
   shared prelude builder); the swap and race arms run all six; `probe:p336:script` runs the full six-script matrix.
5. Condition 119 has ONE named exception, the core's fold scheduler (`listProjects()` mapped to paths for
   `openProjectPaths`, which gates no file and predates this phase); it must match exactly once.
6. Re-pointed, not weakened: 38 (four containment lines, each refusal a word that exits 0, plus the reserved-name line
   `file-put` lacked); 50b and `INDEX_PATH_GUARD` (a shape line and a reserved-name line each, `.git` and `.ssh` in any
   ASCII case); 80 (the five new words); 81, 84 and 86 (the door is `runFolderWrite`, the gate `writeFolderFor`, every
   folder-bound param count gained the pin); 86m (the "Eight callers each ask confirmedWriteRoot" sentence replaced
   with a true account of the door); 88 (the walk root is `.`; 88l reads the third door, floor 60 → the measured 67);
   `REMOTE_SCRIPT_COUNT` 29 → 30; 115's GNU-first check also reads the first line that stats the folder itself.
7. **D23 was driven on the loopback machine under a lock slot, and it works**: `echo "$HOME"` reads `<yard>/home` under
   the login shell, `/bin/sh` and `/bin/dash`; `cd && pwd -P` lands there; `ZDOTDIR` and `HISTFILE=/dev/null` are set;
   the home is 0700 and nothing was written into it; his `~/.zsh_history` size and modified time did not change.
8. The D10 residual reproduced as stated: with main BYPASSED, `file-put .ßh/x` and `dir-new .ſsh/d` land inside the
   real `.ssh` on APFS; main's fold refuses both on every product path (condition 117).
9. `probe-p336.mjs`'s app-run path was never run by any builder (see "the accidental run" below for the one time it
   was). Its fixtures are hand-written to the honest shape; `P336_KEEP=1` writes real records that can replace them.
   On the real row H3, H5 and H8 do not run, and H5L is loopback only. The swap victim is a git repository, because
   stage and commit read the repository before they reach the pin; H2 drives the three path verbs only for that reason.

**Builder D, state, the pin store and the local readers (§6).** Migration `019-remote-folder-pins` (`PRIMARY KEY
(machine_id, path)`, no separate index), `MANIFEST_SCHEMA_VERSION` 18 → 19, `MIN` stays 13; `RemoteFolderPins`
upserting in a `durableTransaction`; `localRootsOf` keeps a row only when `(machineId ?? 'local') === 'local'` (an empty
machine id reads as remote, so the local gate fails closed); the four local readers call `localProjectRoots()`;
`savesInProjects` from the confirmation and never from `writeRoot`. Departures and corrections:
1. **The counts in D17 were wrong.** "32 → 30" is Phase 101's own historical sentence; the machines bridge held 38
   channels and 38 preload calls and the contract 105 members, and now holds 36, 36 and 103. The true numbers are in
   the files.
2. `machine-state.test.ts` (outside D's listed set) gained `savesInProjects: true` in one `toEqual`.

### What the integrator changed, and why

- **`docs/audits/contract-baseline.txt` regenerated** (obligation 3). Exactly the lines §10 predicted moved and no
  other: `[ipc.invoke.channels]` 247 → 245 (`machines:allowWrites` and `machines:writeSheet` gone), `user_version`
  18 → 19, `[sqlite.migrations]` 18 → 19 with `019-remote-folder-pins`, `[sqlite.schema]` 11 → 12 objects with the
  `remote_folder_pins` table. `gate:contract` then passed byte for byte.
- **`CHANGELOG.md`**: §10's item under `## Unreleased` → `### Added`, with no commit link (the follow-up docs commit adds
  it).
- **`CLAUDE.md`**: the `conformance:machines` row's Touching column gains §10's files (the deps function is
  `localProjectRoots`, not `listProjectRoots`); its cost is measured (~17 s, three runs) and says it now starts
  `/bin/sh` and `/bin/dash` with `git` and `shasum` under them; its proof column gains one sentence for 113 to 121 and
  `ablation:p336`. The probes table gains `probe:p336` (cost not yet measured; with the self-test warning below) and
  `probe:p336:script` (~24 s measured).
- **A tooltip that became false.** The tab strip drew "<name> on <label>. This view is read only." on EVERY remote tab
  that is not a commit (`reviewTabTooltip`, `src/renderer/machines/review.ts`, through `tabTooltipIdentity` in
  `src/renderer/editor/tab-identity.ts`). It was already false of a tab under a legacy write folder and would have been
  false of every tab inside an open project. The strip (`EditorTabs.tsx`) now hands `tabTooltipIdentity` the editor's
  own answer (`tabIsReadOnly` through `remoteTabWriteFolder`, the same reading MonacoHost makes), and the second
  sentence is drawn only when the tab is read only; a caller that cannot ask keeps the old sentence by default. New
  test `src/renderer/editor/__tests__/p336-remote-tab-tooltip.test.ts` (6 tests); two one-clause ablations (the
  sentence made unconditional; the strip back to the one-argument call) each reddened it, restored by sha256.
- `src/renderer/editor/use-editor-menu.ts`: the "four reasons" comment on `writable` no longer counts.
  `src/main/machines/__tests__/machine-state.test.ts`: a comment that said a row with no `writeRoot` "grants no
  saving" now says what is true since this phase.
- **The four adapter probes are retired**, the five drives' treatment (§8.5): `build/probe-p101-save.mjs`,
  `probe-p102-entry.mjs`, `probe-p103-stage.mjs` and `probe-p104-commit.mjs` sent the folder-bound scripts through
  `runRemoteWrite`, which now refuses them at step 2b, so each would have failed at its first send. They were on no
  builder's list (builder C found them). The integrator did NOT port them because a port could not be run here: each
  counts his `-L gmux` server, which no Phase 336 builder or integrator may touch, and an unrun port is a claim. Each
  now refuses at start, exit 2, with one sentence naming `probe:p336:script`, and its header says exactly what a port
  needs (`runFolderWrite` with a legacy folder and pin `-`, `-` appended to every direct `/bin/sh` run, and the legs
  that expected a silent `exit 1` re-read for D12's words). Each was run once and printed its refusal with exit 2.
  THE COVERAGE THEY CARRIED OVER A REAL LINK (a mode kept, `stale`, `missing`, `nosum`, `nomode`, the temporary name,
  an ssh killed mid-save) IS NOT RE-PROVED IN PHASE 336; `probe:p336:script` and the far-prelude vitest run the
  shipping texts over scratch trees on this Mac.
- **Duplicated blocks extracted** (the scan below): `productionSources()` in `build/conformance-machines.mjs` (the
  Phase 320.1 and Phase 336 blocks each carried one 16-line source walker), `optionalLoader()` in
  `build/machines-conformance-probe.mts` (two 14-line module loaders), and `runHeldThenSwap()` in
  `src/main/machines/__tests__/p336-far-prelude.test.ts` (the two race arms' 25-line held-spawn harness, its kill still
  in a `finally`). `conformance:machines` and the far-prelude file were re-run green after each.

### The duplicate scan

A 10-line window scan (`scratchpad/p336/integrator/dups.py`: comment, import and bracket-only lines dropped, windows
hashed over `src/` and `build/`, reported only where a window overlaps a line this phase added) found NO duplicate in
production source under `src/`. Inside the phase's own files it found the three blocks above, now extracted. Left as
found, by house practice: per-file test fixtures and `vi.mock` blocks (`p336-remote-tab-writable` beside
`p101-remote-open` and three others, `p336-saves-in-projects` beside `machine-state`, `p336-no-saving-block` beside
`machines-section`, the `p102`/`p103`/`p104` test setups), which `vi.mock` hoisting keeps per file; and
`build/p336/ablation.mjs`'s clone-and-restore harness, copied from `build/p3201/ablation.mjs` as every phase's ablation
copies its predecessor's (`p275`, `p276`, `p293`, `p296`, `p306`, `p313`, `p314`, `p321`, `p323`, `p331` share the
same lines), which a shared module across those eleven would fix and this phase does not.

### Commands, exit codes and numbers (integrator, this worktree)

Every shell the integrator started ran with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and no
`TERM_SESSION_ID`. Final runs, after every integrator edit, each exit 0:

| Command | Result |
| --- | --- |
| `npm run -s typecheck` | exit 0; 1404 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` | exit 0, 35 s; `HELPER_USER_FLOOR` 166 counted against 166; the contract inventory byte for byte |
| `npx vitest run` (the whole suite) | exit 0, 47 s; 1072 files passed, 2 skipped; 19,480 tests passed, 14 skipped (the first run, before the integrator's edits: 1071 files, 19,474 tests, exit 0) |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | exit 0, 54 s; UNSIGNED on purpose, so no keychain was asked for an identity; electron-builder downloaded its Electron and dmgbuild archives into the scratch `HOME`'s cache; `release/` removed afterwards |
| `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, then `npm run -s gate:contract` | exit 0, the lines named above |
| `npm run -s conformance:machines` | exit 0, 17 s (three runs: 17, 17, 17); 113 to 121 green |
| `npm run -s ablation:p336` | exit 0, 796 s; 50 of 50 arms red on the condition or case that owns them, as a delta against a green base (machines; main, 101 cases; renderer, 39 cases); every clone file restored by sha256, and its own report says the worktree was never written |
| `npm run -s probe:p336:script` | exit 0, 24 s; 253 rows under `/bin/sh` and `/bin/dash`, every one agreeing; the D10 residual printed, not graded |
| `node build/p336/probe-p336.mjs --grader-self-test` | exit 0; 43 clauses, 61 checks, nothing started |
| `conformance:samefolder` | exit 0, 4 s; 9 of 9 ablations red; its disk image detached (no image of it left in `hdiutil info`) |
| `conformance:containment` | exit 0, 2 s; 52 readings, 10 of 10 ablations red |
| `conformance:redline-write` | exit 0, 18 s; 30 readings, 17 of 17 ablations red |
| `conformance:save`, `conformance:redline`, `conformance:remoteclose`, `conformance:farattach` | exit 0 each (1 s, 28 s, 1 s, 1 s) |
| `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | exit 0 each; 258 check scripts classified; 166 of 166; 3 long-lived starts each ended in a `finally`; 19 scripts reach `build/ssh-run.mjs` |
| `node build/probe-p10{1,2,3,4}-*.mjs` (the four retired) | exit 2 each, with the refusal sentence |

NOT run by the integrator, by the brief: `npm run smoke:t1`, `smoke`, `smoke:t3` (the main session's landing battery)
and `smoke:remote` (it starts an Electron).

### THE ACCIDENTAL RUN, said plainly

The integrator's brief listed `npm run -s probe:p336 -- --grader-self-test`. That spelling does NOT reach the grader:
`probe:p336` is `node build/harness-socket.mjs --fresh gmux-p336 '<command>'`, and `harness-socket.mjs` reads its
first two arguments and silently ignores the rest, so the flag never reached `probe-p336.mjs` and the WHOLE APP RUN
started, HEAD only (no `P336_PARENT_CHECKOUT`), on the loopback machine, without a lock slot. It ran 42 s and:
- launched ONE Electron through `build/electron-run.mjs`, which ended it in its `finally` ("p336-head: ended 1 process
  the teardown found still running"); no Electron of the run was left (the only Electrons afterwards were his own
  `electron-vite dev` from `/Users/gdc/gmux`, started 3 October, and other applications);
- started the scratch sshd and its scratch tmux, ended by pid ("killed only the pids this run recorded: 75083, 75086,
  75096, 75753"), no `gmux-p336` socket left;
- read his `-L gmux` server's session COUNT once before and once after (65 and 65) through the probe's
  `countOperatorSessions`, and his three dotfiles' size and modified time (unmoved). That count is a read the
  integrator's rules forbid; it is reported, not excused;
- left its harness directory under `$TMPDIR` (`harness-socket.mjs` keeps a run's profile on purpose) and its report
  under `out/p336/`; both were removed by the integrator after the report was copied to the integrator's scratch.
Its grades, which are a FIRST run of the app path and not a verification: PASS on L (with no parent, so its parent
half is vacuous), A (`wrote`, `made`, `moved`, `done`, `done`, `committed`; far sha256 equal to the payload's;
commits 1 → 2), A2, B, H1, H2, H3, H4, H5L, H6, H8 and RUN (gmux 65 → 65, no dotfile moved, 0 Electrons left, no far
folder left). FAIL on two:
- **H5** answered `writesOff` with no folder for all three planted rows, because a run with no parent never plants: the
  plant needs the manifest a parent launch makes (`existsSync(MANIFEST)` is false before HEAD's first launch), yet the
  arm is graded as a failure rather than as not run. A probe defect; the verifier's run with a parent plants.
- **R** opened the project but read the editor as `missing` (the Explorer row click on `notes.md` or the
  `__gmuxP96RemoteSurfaces` seam), found fewer than two Explorer header buttons, and never opened the 150 KB file; it
  did find no "Settings" string drawn and neither removed name in the built renderer. Whether this is the probe or the
  product is NOT established here. The renderer's behaviour is driven in vitest (`p336-remote-tab-writable`,
  `p336-write-folder-in`), and §9's R arm is the verifier's to settle.
The self-test itself was then run the right way, `node build/p336/probe-p336.mjs --grader-self-test`: exit 0, 43
clauses, 61 checks, nothing started. CLAUDE.md's `probe:p336` row now says which spelling to use.

### Left for the verifier (build/p336/SPEC.md §9 and §12)

- `smoke:remote` (arm 10k changed, §4.6) and `npm run smoke:t1`, `smoke`, `smoke:t3`: not run here, by the brief.
- `probe:p336` with the parent first: arms R and H5 above; the app run's cost for CLAUDE.md's row.
- His Mac Pro row through `build/p3201/real-machine.mjs`.
- §16 Q1 stands: a project at `~/<name>` on another machine is read only with the never-list band.
- The Linux far side is unmeasured (§13).

### The fix round (the fixer, 2026-10-05)

Two verdicts came back: Lens 1 (the attack) approved with three tooling notes, and Lens 2 (the parent and the app,
driven through the doors a person uses) answered needs_work on two majors. The fix ran once, over every major and
minor of both. Nothing is committed, staged or stashed. Every shell the fixer started ran with a scratch `HOME` and
`ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; the fixer launched no Electron.

#### What was worse than today, and how it was removed

**Lens 2's one `worse: true` row: two drawn sentences true at the parent and false at HEAD.** The open window's caption
read "Tortie reads this folder on <label>. It writes there only where you have let it save." and Home's open-on-machine
row "The folder stays on that machine. Tortie writes there only where you have let it save." Phase 336 removed the only
act that let it save, so both sent him looking for a grant that no longer exists, on the first surface he meets. A true
replacement has to name the folders Tortie never writes in on another machine (a home folder, a folder directly inside
one, a folder holding one, every `.git` and `.ssh` folder), which is a paragraph on a sheet whose local twin says nothing
about saving, against his rule that a remote surface carries no explanation just because it is remote; and a claim of
parity with this Mac would be false for exactly the projects he keeps at `~/<name>` (§16 Q1). So the write clause is
REMOVED, not reworded, and so is the caption's "Tortie reads this folder", which on its own reads as "and only reads":
- `src/renderer/machines/project-tab.ts`: `openRemoteHonesty(label)` is now `The folder stays on <label>.` and
  `OPEN_ON_MACHINE_SUBTITLE` is `The folder stays on that machine.`; the file header and both doc comments say why.
- **A third sentence of the same class, found by the fixer's own scan** (every export of every module under
  `src/renderer/machines/`, `src/main/machines/remote-copy.ts` and `src/renderer/settings/machines-copy.ts` called with a
  fixed label and every outcome word, 3,297 composed strings, matched for grant phrases; it found these three and no
  fourth): `commitOutsideRoot` in `src/main/machines/remote-copy.ts` said "outside the folder Tortie was given permission
  to write in". Builder B had already taken that clause out of Stage's sentence for the same outcome; the commit one was
  left. It now says Stage's words byte for byte: `That folder on <label> is outside the projects you opened there.
  Nothing was changed.` The comment in `src/main/machines/remote-stage.ts` that quoted the old words now quotes the new.
- Tests: `src/renderer/app/__tests__/p903-c-remote-copy.test.ts` and `p92-home-machine-row.test.tsx` pin the new words
  (the first also refuses `let it save` and `writes there`); `src/renderer/machines/__tests__/p336-sentences.test.ts`
  gains a block that calls every export of `project-tab.ts` and refuses a grant phrase, Settings, `then Machines` and
  the word remote; `src/main/machines/__tests__/p104-remote-commit.test.ts` pins `commitOutsideRoot` and requires it to
  equal `remoteStageOutsideRoot` from the renderer.
- **Condition 120 widened, with ablations** (Lens 2's fix). The probe (`build/machines-conformance-probe.mts`) now loads
  `src/renderer/machines/project-tab.ts` beside the three write-surface modules, and the gate
  (`build/conformance-machines.mjs`) asks every drawn sentence, the commit set included, for
  `/let it save|let Tortie save|given permission|you have let|where you let/i` as well as Settings, and cannot-judges if
  the probe drew nothing from `project-tab.ts`. `ablation:p336` gains `a120d` (Home's row with the parent's second
  sentence put back) and `a120e` (the commit's "given permission" sentence put back); each reddened C120 alone
  (`P336_ONLY=a120d,a120e,a120b`, exit 0, 77.4 s, 3 of 3 red on C120). The gate's header and CLAUDE.md's
  `conformance:machines` row say so; the Touching column adds `project-tab.ts`.
- One stale comment of the same class, corrected: `src/renderer/tree/tree-menu.ts` said New File crosses "on a machine
  a person has let Tortie save on"; it now names the folder bound. Comments in older test files that say the same thing
  of their fixtures were left as found.

#### Tooling

**`smoke:remote` wrote into his real `~/.zsh_history` (Lens 2's second major).** The far sessions of the loopback
machine run his login zsh with his rc files, and one that exits writes his history; `smoke:remote` was one of eight
loopback scripts that never set the quiet shell. `package.json`'s `smoke:remote` now exports
`SCRATCH_MACHINE_QUIET_SHELL=1` (an empty `ZDOTDIR` of the yard's own; macOS's `/etc/zshrc` then points `HISTFILE` at
`$ZDOTDIR/.zsh_history`, read from this Mac's `/etc/zshrc` line 15). MEASURED by the fixer under a lock slot, no
Electron: a machine built with the quiet shell (`build/with-scratch-machine.mjs`), a far tmux server on a scratch socket
(`-L p336fx<pid>`, ended with `kill-server` in a `finally`), one login shell given one typed line and then ended. The
pane's `ZDOTDIR` was the yard's, the typed line landed in the yard's `zdot/.zsh_history`, and his `~/.zsh_history` read
`732653` bytes with the same modified time before and after (it already held the verifier's 150 bytes); `~/.bash_history`
and `~/.zshrc` unmoved. It does NOT set `SCRATCH_MACHINE_SCRATCH_HOME`: its arm 10a looks for an agent under the far
account's home (with a moved home an agent installed under the real one is not found, and the search walks on down
the registry's list, which reaches agents this repository's runs never start; read from the code, not run), and its arm
17a compares the folder tmux falls back to with the home the machine states. MEASURED: with the scratch home on, a far command still starts in `/Users/gdc` (`pwd -P`) while `$HOME`
names the yard's, so 17a would differ by construction. `build/scratch-machine.mjs`'s `quietShellFor` comment records
both measurements. `smoke:remote` itself was NOT run by the fixer (it starts an Electron); the reverifier runs it.
**For him:** his `~/.zsh_history` gained about 150 bytes from Tortie's smoke sessions at 03:18:40 on 5 October, written
by the Lens 2 verifier's `smoke:remote` run; nobody has read or edited the file. Seven other loopback scripts still do
not set the quiet shell and would do the same if run: `probe:p306`, `probe:p317`, `probe:p318`, `probe:p3167`,
`probe:p326`, `smoke:p93remote`, `smoke:capture:remote`. They are outside this phase and left as found.

**`probe:p336`'s R arm could never pass (both lenses, identical at the parent and at HEAD).** A file opened from a
repository's Explorer lands in the review's Diff mode, and an unchanged committed file there draws "No changes" with no
Monaco editor, so the arm waited out its 30 s on `notes.md` every time. `build/p336/probe-p336.mjs`'s `rendererArm` now
opens `a.txt` (plain text) and presses the editor's own File radio (`.ed-mode button[role="radio"][aria-label="File"]`,
`ModeToggle` in `src/renderer/editor/EditorPanel.tsx`) before it waits for text or reads the editor, for `big.txt` too,
and records `file`, `editorMode` and `bigMode`; the save is read back from `a.txt`. Before pressing File for `big.txt`
it waits 2.5 s, as the Lens 2 driver did, because the tab it left still draws its switch with File already on until the
new tab's panel replaces it. The keystroke clause and the 150 KB clause each also require the reading's `mode` to be
`file`, so a side of the review (read only for a reason that has nothing to do with the save cap) can never stand in for
the editor a person types into; two refused edits prove it (`mode: 'diff'` must fail each). The three hand-written HEAD
fixtures carry `a.txt`'s values, and the two whose big file opened carry its mode. Grader self-test: exit 0, 44
clauses, 152 checks, nothing started. The arm is NOT run by the fixer; its reading is the reverifier's. CLAUDE.md's
`probe:p336` row now carries Lens 2's measured cost (74 s with the parent first).

#### Not fixed, and why

- **His Mac Pro row (Lens 2, minor).** His ssh agent held no identity (`ssh-add -l` exit 1 in the verifier's run), and
  the documented remedy reads a credential under `~/.ssh` or his live profile, which this run's rules forbid. It needs
  him: load a key his Mac Pro trusts into his agent, or allow a scratch agent loaded by path; then a verifier runs
  `P336_FAR=real` for L, A, A2, B, H1, H2 and H4 at the parent and at HEAD. No Linux row either (§13).
- **The two nits** (Lens 2): a project at a child of a far home that is not spelled like a home draws as an edit surface
  and every save is refused with the never-list sentence (D4's stated limit, every sentence true); and "Open it again"
  after `folderChanged` is reached through File › Open Folder on a Machine… while the tab is open. Neither is worse than
  the parent, and neither is required by the ruling.
- `smoke:remote`, `smoke:t1`, `smoke`, `smoke:t3` and `probe:p336` start an Electron and were not run by the fixer.

#### Commands, exit codes and numbers (fixer, this worktree, after every edit)

| Command | Result |
| --- | --- |
| `npm run -s typecheck` | exit 0, twice (after the source edits and at the end); 1404 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` | exit 0 twice (31 s, then 29 s after the last edit); `HELPER_USER_FLOOR` 166 counted against 166 (no script reaching `build/electron-run.mjs` was added); 258 check scripts classified; 3 long-lived starts each ended in a `finally`; 19 scripts reach `build/ssh-run.mjs`; the contract inventory byte for byte |
| `node node_modules/vitest/vitest.mjs run` (the whole suite) | exit 0, 43 s; 1072 files passed, 2 skipped; 19,483 tests passed, 14 skipped (the integrator's 19,480 plus the fixer's three) |
| `node build/conformance-machines.mjs` | exit 0, 16 s (twice, 16 and 16); 113 to 121 green, 120 now drawing from `project-tab.ts` and asking for a grant phrase |
| `P336_ONLY=a120d,a120e,a120b node build/p336/ablation.mjs` | exit 0, 77.4 s; the two new arms and the old Settings arm each newly red on C120 alone |
| `node build/p336/ablation.mjs` (every arm) | exit 0, 741 s; 52 of 52 red on the condition or case that owns them as a delta against a green base (machines; main, 101 cases; renderer, 41 cases); every clone file restored by sha256, the worktree never written, no clone left under `/private/tmp` |
| `node build/p336/probe-p336.mjs --grader-self-test` | exit 0; 44 clauses, 152 checks, nothing started |
| `npm run -s probe:p336:script` | exit 0, 23 s; 253 rows under `/bin/sh` and `/bin/dash`, every one agreeing |
| `npm run -s gate:contract` | exit 0; byte for byte (this round moves no contract line) |
| `conformance:save`, `conformance:remoteclose`, `conformance:farattach`, `conformance:containment`, `conformance:samefolder`, `conformance:redline-write`, `conformance:redline` | exit 0 each (0, 1, 0, 2, 4, 18, 28 s); containment 10 of 10 ablations red, samefolder 9 of 9 with its image detached, redline-write 17 of 17 |
| `node build/probe-p10{1,2,3,4}-{save,entry,stage,commit}.mjs` (the four retired adapter probes) | exit 2 each, with the refusal sentence |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | exit 0, 47 s; UNSIGNED on purpose; electron-builder's archives went to the scratch `HOME`'s cache, removed afterwards with `release/` |
| The quiet-shell measurement (`SCRATCH_MACHINE_QUIET_SHELL=1 node build/with-scratch-machine.mjs -- node <fixer scratch>/quiet-far.mjs`, under lock slot `electron.lock`) | exit 0; pane `ZDOTDIR` the yard's, the typed line in the yard's `zdot/.zsh_history`, his `~/.zsh_history` 732653 bytes with the same modified time before and after; recorded pids 96979, 96982, 96992 ended by the runner |
| The scratch-home measurement (both knobs, `pwd -P` and `$HOME` over one connection, same slot after release and retake) | exit 0; `/Users/gdc` and the yard's `home`; recorded pids 98566, 98569, 98579 ended |
| At the end | both lock slots free; 14 Electron-family processes by CLAUDE.md's command, none naming `wt-p336`, `gmux-p336` or a fixer socket (Lens 1 counted the same 14); no `p71-scratch` sshd or tmux, no ablation clone, no disk image of the gates attached; `~/.zsh_history`, `~/.bash_history` and `~/.zshrc` size and modified time equal from before the fixer's first far shell to the end; `git diff e58b0c30 --stat` 112 tracked files (the integrator's 109 plus `project-tab.ts`, `p92-home-machine-row.test.tsx` and `tree-menu.ts`), and no untracked file outside the phase's own |

## §As built, his ruled round (the fixer, 2026-10-05)

His ruling of 2026-10-05, "Narrow tool fix, then land", after the reverify answered needs_work: the product (`src/main`,
`src/renderer`, `src/shared`, `src/preload`, `ios`) is approved by both lenses' live evidence and does not change, and
the fix is three tools. This round changed no file under `src/` or `ios/` (none is newer than the round's first file,
read with `find -newer`), and nothing is committed, staged or stashed. Every shell it started ran with a scratch `HOME`
and `ZDOTDIR`, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`, and a `tmux` first on `PATH` that refuses `-L gmux` (and a
`-S` naming a `gmux` socket) and logs the refusal, so nothing of this round read his server.

### 1. `smoke:remote` runs with the quiet shell and passes whole

**The cause, measured before anything was changed.** With the quiet shell a far zsh reads none of his rc files, so its
prompt is macOS's `/etc/zshrc` default, `%n@%m %1~ %# `, which on this Mac in `/tmp` is `gdc@Gregs-MacBook-Pro-2 tmp % `,
30 columns. Arm 10a types the armed resume command, `/Users/gdc/.local/bin/claude --resume <36-character id>`, 74
columns, into an 80-column far pane and counts it in `capture-pane -p -J` as ONE contiguous string. zsh breaks a long
line itself, tmux never marks the row as wrapped, `-J` has nothing to join, and the gate read 0 while the product's own
counter (`countOccurrences` in `src/main/machines/remote-arm.ts`, which removes white space for exactly this reason)
read 1. The fixer drove it on a scratch tmux socket with no Electron: an 80-column detached pane, a login zsh with an
empty `ZDOTDIR` of the fixer's own, the command typed with `send-keys -l`. Contiguous 0, spaces removed 1, the screen
`gdc@Gregs-MacBook-Pro-2 tmp % /Users/gdc/.local/bin/claude --resume 84e4e8c8-d86` and `3-433f-be9d-f2f40e4578bb` on two
rows; with a `.zshrc` setting a two-column prompt, contiguous 1, spaces removed 1, one row. The product's counter is
right and was not touched.

**The fix is in the harness.** `build/scratch-machine.mjs` gains `shortPromptFor` and `SHORT_PROMPT_ZSHRC`:
`SCRATCH_MACHINE_SHORT_PROMPT=1` writes ONE file, `<yard>/zdot/.zshrc`, mode 0600, before sshd starts, setting
`PROMPT='%# '` and an empty `RPROMPT`. It requires the quiet shell and throws without it, because the only `ZDOTDIR` it
may write into is the yard's own. It is OFF by default, so `probe:p95`, `probe:p292:remote`, `probe:p320`,
`probe:p320:skew` and `probe:p336`, which set the quiet shell and were measured with the default prompt, keep the far
shell they were measured with; the sshd configuration is byte for byte the same either way, because the prompt is a
file in the yard and not a `SetEnv` value (`build/p3201/skew.mjs`'s three `setEnvLine` rows are untouched). The machine
object reports the file as `shortPrompt`, and `build/with-scratch-machine.mjs` says it in one line, so a log shows
which prompt a gate read. `package.json`'s `smoke:remote` now exports `SCRATCH_MACHINE_QUIET_SHELL=1` and
`SCRATCH_MACHINE_SHORT_PROMPT=1`. The scratch HOME the ruling names is the run's own: `smoke:remote` was run under a
scratch `HOME` and `ZDOTDIR` on this Mac. It still does NOT set `SCRATCH_MACHINE_SCRATCH_HOME`, for the fix round's two
measured reasons (10a looks for an agent under the far account's home and would walk down the registry's list; 17a
compares the folder tmux falls back to with the home the machine states).

**The run.** `npm run smoke:remote` under lock slot `electron.lock`: exit 0 in 59.9 s, the build included. 10 to 10k
and 11 to 20i all passed, among them `10a ... the screen of $4 shows the command 1 time(s)` and `running zsh rather than
claude, with the resume command typed once and no key pressed after it`, 10b, 10c, 10d, 10e, 10f, 10g, 10h, 10i, 10j and
all three 10k lines; the log ends `PASS`. The yard's `zdot` held the `.zshrc` (126 bytes) and the far shells' own
history (105 bytes, the three `printf 'TORTIE-P84-…'` lines of steps 13 and 19a), which is the positive control that
the far shells wrote a history and that it landed in the yard. His `~/.zsh_history` and `~/.bash_history` read
`732653 1791184720` and `23166 1790702242` (size and modified time only) before and after. Two things it did that are
the gate's own design, said plainly rather than changed: 10a creates a session running his installed Claude Code
(`/Users/gdc/.local/bin/claude --session-id <id>` in `/tmp`, far `HOME` his) and ends it, typing nothing and spending no
turn; and step 11's count of his server went through the refusing `tmux`, was refused twice (10:37:54 and 10:38:20)
and so read "0 before and after", which says nothing about his server. One `chrome_crashpad_handler` of the run
(its `--database` under the run's own profile) outlived the app, reparented to launchd at 2 MB; the fixer ended it by
pid with SIGTERM, and removed the run's harness directory. Before the run and after it, 14 Electron-family processes by
CLAUDE.md's command, the same pids.

### 2. Condition 120 reads a grant typed into a component

The reverify planted the parent's exact caption at `src/renderer/app/RemoteProjectModal.tsx:255` and condition 120
stayed green, because it judged only what the probe DREW by calling the copy modules' exports, and a component that
types its sentence draws nothing the probe can call. `build/conformance-machines.mjs` now imports `typescript` (as
`conformance-choices.mjs` and `conformance-pocket.mjs` do) and, in `textRunsOf`, reads every production source under
`src/` (1,404 files, about 1.2 s) for every piece of TEXT: a string literal, a template's literal parts, JSX text and a
JSX attribute's string. A `+` chain is one run from its top, a template's parts are joined around a `…` for each hole,
and a JSX element's children are one run, each with its white space folded, so a sentence typed across lines or
literals reads as it is drawn. Comments are not text and are never read, which keeps every doc comment that quotes a
removed sentence legal. The scan is proved on eight fixtures of its own (`GRANT_SCAN_FIXTURES`: five shapes that must be
found, three that must not, the last of them `src/main/machines/errors.ts`'s own "would not let Tortie in") before its
answer over the tree is trusted; a misread fixture, or fewer than 1,000 sources read, cannot be judged. `GRANT` gains
four phrases that name the same grant (`let Tortie write`, `allowed Tortie to save`, `permission to save or write`,
`writes there only where`), each read over the whole tree first with a broader calibration pattern; the calibration's
five hits (`permission to …` in `src/main/fs/errors.ts`, `would not let Tortie in` twice, `turn saving back on` twice
in `src/renderer/state/resume.ts`) are none of them a grant and none matches. The header and CLAUDE.md's
`conformance:machines` row say so; the Touching column adds `RemoteProjectModal.tsx`.

**The plants, in `ablation:p336`** (`build/p336/ablation.mjs`, each restored and checked by sha256 in its clone):

| Arm | File | What is typed | Why only the scan finds it |
| --- | --- | --- | --- |
| `a120f` | `src/renderer/app/RemoteProjectModal.tsx` | the reverify's plant: the parent's caption as JSX text around `{label}` | a component; the probe calls no export of it |
| `a120g` | `src/renderer/settings/MachineRow.tsx` | "Saving on this machine is on because you / let it / save." on three lines | no single source line names the grant |
| `a120h` | `src/renderer/tree/tree-menu.ts` | `'New File… (Tortie was given ' + 'permission' + ' here)'` | no piece of the chain names it alone |
| `a120i` | `src/renderer/tree/FilesSection.tsx` | ``title={`Refresh files in ${…}, where you allowed Tortie to save`}`` | a template with a hole, and a widened phrase |

`P336_ONLY=a120f,a120g,a120h,a120i,a120d,a120e,a120b`: exit 0, 167.3 s, 7 of 7 newly red on C120 alone against a green
base. THE COUNTER-PROOF, the fixer's own: in a clone of its own with the literal block switched off (`&& false`), the
base and each of the four plants read exit 0 with no condition 120 line, and with it on the base reads exit 0 and each
plant exit 1 on condition 120 naming its file and line (`RemoteProjectModal.tsx:255`, `MachineRow.tsx:394`,
`tree-menu.ts:220`, `FilesSection.tsx:585`); the gate and every planted file restored by sha256, the clone removed.

### 3. The probe's nits

- **It exits on its PASS path.** `build/cdp-client.mjs`'s `call` arms a timeout it never clears, and the probe's
  `bridge` asks for 180 s, so the reverify's run printed PASS at 46.8 s and exited at 226 s, holding node, the scratch
  machine and `harness-socket.mjs` up in between. `run()` now ends with `process.exit(0)` after `PASS`, as its FAIL and
  UNREADABLE paths already did; the shared client is not touched.
- **RUN never grades a count nobody made.** `countOperatorSessions` pipes `list-sessions` through `2>/dev/null | wc -l`,
  so a refused read (the reverify's own wrapper), no server or a timeout read "0", and RUN graded "0" against "0" as
  "his count did not move" (the reverify's record: `gmuxBefore` "0", `gmuxAfter` "0", PASS). The probe now reads
  `tmux -L gmux list-sessions -F x` WITH ITS EXIT STATUS, on this Mac for the loopback row and on the machine for the
  real row (the far shell prints `p336-status=$?` after the listing). The pure readers `hisCountOf` and `hisCountOfFar`
  answer a count only for exit 0 and one `x` per line, and null otherwise with the reason; `runCountUnreadable` makes
  RUN UNREADABLE (exit 2) when either half is null, and RUN's other clauses are still graded, so a dotfile that moved or
  an Electron left is still a FAIL beside it. The record carries `gmuxWhyBefore` and `gmuxWhyAfter`. The count after is
  read inside the `finally`, while the real row's connection is still open. A verifier whose `tmux` refuses `-L gmux`
  therefore reads RUN UNREADABLE by design. The real row is read from the code, not run: his ssh agent holds no
  identity (the fix round's finding).
- **The grader self-test** gains twelve checks (a refused count, a timed-out one, no server, a listing that is not one
  `x` per session, three sessions, the far form's three shapes, RUN unreadable before and after, the honest record
  readable, the clause by name): 44 clauses, 164 checks, nothing started.
- **CLAUDE.md's `probe:p336` row** now says the cost as measured (about 50 s to its verdict with the parent first,
  46.8 s by the reverify, and that it took 226 s until this round because of the timers), the count WITH its exit status
  and what a refusing wrapper reads, and what H5 does with no parent: no manifest before HEAD's launch to plant into,
  so H5 reads UNREADABLE and the run exits 2, never a pass, and `P336_ARMS` leaves it out to read the rest at HEAD alone.

### Commands, exit codes and numbers (fixer, this worktree, after every edit)

His `~/.zsh_history` and `~/.bash_history`, size and modified time only, read before and after EVERY command below that
started a shell, a far session or the app: `732653 1791184720` and `23166 1790702242` every time, never moved.

| Command | Result |
| --- | --- |
| The wrap measurement (scratch socket `-L p336rfx<pid>`, `-f /dev/null`, ended with `kill-server` in a trap, no Electron) | exit 0; default prompt: contiguous 0, spaces removed 1, two rows; short prompt: contiguous 1, spaces removed 1, one row |
| `npm run smoke:remote` (lock slot `electron.lock`, released after) | exit 0, 59.9 s; 10 to 10k and 11 to 20i passed, `PASS`; 10a "shows the command 1 time(s)"; the yard's `.zshrc` 126 bytes and its history 105 bytes; two `-L gmux` reads refused by the fixer's `tmux` |
| `node build/conformance-machines.mjs` / `npm run -s conformance:machines` | exit 0 both (26.5 s, then 17.9 s); 113 to 121 green |
| `P336_ONLY=a120f,a120g,a120h,a120i,a120d,a120e,a120b node build/p336/ablation.mjs` | exit 0, 167.3 s; 7 of 7 newly red on C120 |
| The counter-proof (the fixer's scratch `counterproof.mjs`, its own clone) | exit 0, 186 s; scan off: base and four plants exit 0, no C120 line; scan on: base 0, each plant 1 on C120 at its file and line; restored by sha256, clone removed |
| `node build/p336/ablation.mjs` (every arm) | exit 0, 995.8 s; 56 of 56 red on the condition or case that owns them as a delta against a green base (machines; main, 101 cases; renderer, 41 cases), the four new plants among them; every clone file restored by sha256, the worktree never written, no clone left under `/private/tmp` |
| `node build/p336/ablation.mjs --self-test`, `--list` | exit 0; 11 fixtures; 56 arms (C120 9) |
| `node build/p336/probe-p336.mjs --grader-self-test` | exit 0; 44 clauses, 164 checks, nothing started |
| `npm run -s typecheck` | exit 0, 2.4 s; 1404 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` | exit 0, 32.0 s; `HELPER_USER_FLOOR` 166 of 166; 258 check scripts classified; the contract inventory byte for byte |
| `node node_modules/vitest/vitest.mjs run` (the whole suite) | exit 0, 45.2 s; 1072 files passed, 2 skipped; 19,483 tests passed, 14 skipped (the fix round's numbers exactly: no product change) |
| `npm run -s gate:background`, `gate:electron`, `gate:knownhosts`, `gate:checks` | exit 0 each (0.9, 0.8, 1.8, 0.4 s); 3 long-lived starts each ended in a `finally`; 166 of 166 against a floor of 166; 557 files read, none outside `build/ssh-run.mjs` handing ssh to a spawn; 258 check scripts classified |
| At the end | both lock slots free; 14 Electron-family processes by CLAUDE.md's command, the same pids as before the round's first command, none naming `wt-p336` or a run of this round; no `p71-scratch` directory and no `p336rfx` socket left; the fixer's `tmux` logged exactly two refusals, both `smoke:remote`'s step 11; `git diff e58b0c30 --stat` 113 tracked files (the fix round's 112 plus `build/with-scratch-machine.mjs`); after the gate's last comment edit, `conformance:machines` (exit 0, 20.2 s), `build` (exit 0, 36.3 s), the four gates (exit 0 each), `typecheck` (exit 0) and the grader self-test (PASS) were run once more |

### Not done, and why

- `probe:p336` itself was not run (the ruling lists only its self-test); its PASS-path exit and RUN's status-aware
  count are read from the code and proved on the grader's fixtures, and the next app run is their first reading.
- `smoke:remote`'s own step 11 still counts his server through `2>/dev/null | wc -l` in `src/main/machines/remote-smoke.ts`,
  so under a refusing `tmux` it reads "0 before and after" and passes; that file is under `src/main` and the ruling
  keeps it as it is.
- The seven other loopback scripts the fix round named (`probe:p306`, `probe:p317`, `probe:p318`, `probe:p3167`,
  `probe:p326`, `smoke:p93remote`, `smoke:capture:remote`) still do not set the quiet shell; outside the ruling.
- `smoke:remote` leaves one `chrome_crashpad_handler` behind (it launches `electron .` directly, not through
  `build/electron-run.mjs`); this round ended its own by pid and changed nothing about it.

## §As built, Phase 336.1 (the builder, 2026-10-05)

His report on 2026-10-05, on `0.110.0 (c981efde-dirty)`: "when i try to make a new folder or new file it is greyed out?"
His project `~/dev` on his Mac Pro is a folder directly inside a home, which this phase never-listed on both sides (D4,
D5, and §16 Q1, which said so and asked). His ruling, asked: "Yes, fix it now". Only the home folder ITSELF, a folder
that HOLDS the home (`/`, `/Users`, `/home`) and `/` stay off limits; a folder directly inside a home (`~/dev`) or
directly under `/` (`/tmp`, `/workspace`, `/opt`) is written like any other opened project; `.ssh` and `.git` stay
refused by name and by identity wherever they are, and a link named like a project that leads to the home or to its
`.ssh` is still refused. The pin, the anchored `.`, the legacy `writeRoot` path (D16) and the local readers (D18) do
not change. Built in `/private/tmp/wt-p3361` at origin/main `3f52411e`; nothing committed, staged or stashed.

### What changed, in the two places that decide

1. **Main's text half, `neverWriteFolder`** (`src/shared/remote-write-folder.ts`). True for `/`; `/Users` and `/home`;
   a home itself (`/Users/<x>`, `/home/<x>`, `/root`, `/var/root`); any path with a segment that folds to `.git` or
   `.ssh`. Nothing deeper: the three depth lines read `<= 2`, `=== 1` and `=== 2` where they read `<= 3`, `<= 2` and
   `<= 3`. The stated cost moves from `/Users/Shared/x` (now written) to `/Users/Shared` (still read as a home).
   `/var` stays unlisted, as it was: it holds `/var/root` only, and the far side refuses it by identity when the
   account's home is there.
2. **The far prelude, `folderCheck`** (`src/main/machines/remote-scripts.ts`). The home clause is
   `[ "$wx" = "$wh" ] && [ "$wn" = 0 ]` (the folder IS the home, at the first step of the walk) where it was
   `-le 1` (the home or a folder directly inside it). The holder walk up from `$HOME/..` is unchanged. The line after
   the first walk reads `[ "$wn" = 1 ]` where it read `-le 1`, which is the SAME rule written as what it does: the walk
   stops at `/` (whose `..` is itself) one step after it began only when the folder is `/`, so `-le 1` never refused a
   direct child of `/` and the entry's charter read it wrong (measured below). The `protected` identity check, the pin
   comparison and the anchored `.` are byte for byte what they were.

### What the parent really refused, measured with its own texts

The builder dumped the parent's far texts before any edit (`far-texts.mts` over the unedited tree, sha256
`aebde8fc…`) and ran them beside HEAD's under `/bin/sh` and `/bin/dash` (the builder's `attack.mjs`, scratch only; a
scratch home under this scratchpad, a second scratch home made under `/Users/Shared` so a home exists that `/private`
does not hold, both removed in a `finally`; no ssh, no tmux, no Electron). Both shells agreed on every row.

| Row (`file-put` unless named) | Parent `c06175f6`'s texts | HEAD |
| --- | --- | --- |
| a home's direct child, `~/dev` (home under `/private`, and home under `/Users`) | `offlimits`, nothing written | `wrote`, on disk |
| `~/dev` `dir-new`, `entry-rename` | `offlimits`, `offlimits` | `made`, `moved`, on disk |
| `/private`, a direct child of `/`, with the home under `/Users` (it holds nothing of it), written through into the scratch tree | **`wrote`** | `wrote` |
| `/private` with the home AT `/` (a direct child of the home too) | `offlimits` | `wrote` |
| `/usr`, a direct child of `/`, a sha for an absent file (past the check, nothing written) | `missing` | `missing` |
| `/private` holding the home (home under `/private`) | `offlimits` | `offlimits` |
| the home itself; `/`; `/Users` and `/Users/Shared`, each holding the home | `offlimits` | `offlimits` |
| a link named `dev` leading to the home | `offlimits` | `offlimits` |
| a link leading to `~/.ssh`; `~/.SSH`, `~/.ẞh`, `~/.ßh`, `~/.ſsh` | `protected` | `protected` |
| `~/.ssh`'s listing before and after | `authorized_keys` | `authorized_keys` |

**So the parent already wrote in a direct child of `/` that is not the home's child and does not hold the home, on
both sides** (main's text rule never listed `/tmp`, `/workspace` or `/opt`; the far tail reached `/` alone). What 336.1
changes for `/`'s children is the case where `/` IS the home (`HOME=/`), and main's `/root/<x>` and `/var/root/<x>`.
The entry's attack row "`/tmp/x`'s parent `/tmp` written at HEAD and refused at the parent" therefore cannot hold: on
the loopback machine `/tmp` (`/private/tmp`) neither is the far home's child nor holds the yard's home, and it is
written at BOTH builds. A `/` child is refused at either build only when it holds the far home, which is the holder rule
and is unchanged. The discriminating rows for `/` are `HOME=/` (above, and M8 9d and H8 below).

### What his ruling admits that §16 Q1's recommendation kept, stated

Q1 recommended narrowing to non-dot children plus `Library`. His ruling is wider: a project opened at `~/.config`,
`~/.aws`, `~/.gnupg`, `~/.kube` or `~/Library` on a confirmed machine is now a folder Tortie writes under, as it is on
his Mac. Only `.ssh` and `.git` are refused by name and identity. The planted-row risk he accepted in research 138 §9
(a project row an agent writes into the manifest is a folder a person's own save can then reach) widens by the same
amount: a planted row at a home's direct child was refused on both sides at the parent and is admitted now. It is still
only ever written by a person's own press, the pin and the anchored `.` still bind the write to the folder that was
checked, and the home itself, its holders, `/`, `.ssh` and `.git` stay refused on the far side by identity whatever the
manifest says.

### The words

`remoteNeverFolderLine` (`src/renderer/machines/editor.ts`): "Tortie does not save in a project that is a home folder
or holds one, on <label>." (and with " Nothing was written." / " Nothing was changed." after it, as before).
`remoteCommitRefusedLabel('never')` (`src/renderer/machines/scm.ts`) and `commitNeverFolder`
(`src/main/machines/remote-copy.ts`): "Tortie does not commit in a project that is a home folder or holds one, on
<label>." It names the PROJECT because "does not save in a home folder" alone reads as every folder in one, which is
what 336.1 stops being true. The CHANGELOG item 336 wrote under `## Unreleased` now says "Tortie still does not save in
a project that is a home folder or holds one, or inside a .git or .ssh folder there", its commit link kept. Comments
naming the old depth moved with it (`remote-file.ts`, `machines-slice.ts`, `project-tab.ts`, the two `src/shared/ipc`
comments, `build/scratch-machine.mjs`); no contract line moved (`gate:contract` byte for byte).

### The gates, re-pointed rather than weakened

- **Condition 116** (`build/conformance-machines.mjs`): the home clause must read `"$wn" = 0`; a NEW negative clause is
  red on any `"$wx" = "$wh" ] && [ "$wn" -le N` (the Phase 336 depth, the greyed-out `~/dev`); the top line must read
  `"$wn" = 1`, and a NEW negative clause is red on a depth rule there. The probe's never-list table
  (`build/machines-conformance-probe.mts`) is 40 rows, 19 true and 21 false (floor 25): homes and holders `true`, `.ssh`/`.Git`/`.ẞh`
  directly inside a home `true`, `~/code`, `~/gmux`, `~/dev`, `~/.config`, `/root/x`, `/var/root/x`, `/Users/Shared/x`,
  `/tmp`, `/workspace`, `/opt`, `/srv` `false`. Condition 113's corpus: "a home child is never-listed" became "a home
  child is a project like any other", and two rows were added (`/Users` never-listed; `/workspace` a project).
- **The far half** (`build/p336/script-arms.mjs`): M8 row 3 (a home child typed upper case) is a pass through all six
  scripts; row 9d is `HOME=/` with the folder `/` itself (`offlimits`), because no row can write directly in
  `/private`; H8 is six rows (the home `offlimits`, its child and grandchild `wrote`, a link named `dev` to the home
  `offlimits`, `/private` holding the home `offlimits`, `/private` with `HOME=/` `wrote` through into the run's own
  scratch tree); H3 gains the far `.ssh` opened directly as `.SSH` and `.ẞh`, `protected`.
- **`ablation:p336`** (`build/p336/ablation.mjs`): a116a now drops the home-itself clause (`= 0` to `= -1`); a116b is
  TURNED ROUND, putting the Phase 336 depth back (`= 0` to `-le 1`) and proving the gate reads his defect as red, with
  a116b-v doing the same against the far-prelude suite; a116f drops main's home (`<= 2` to `<= 1`); a116f2 and
  a116f2-v put main's Phase 336 depth back (`<= 2` to `<= 3`) against the gate and the renderer's tab rule; a116h's
  `from` follows the new `/root` line; a116i removes the far `/` line, which no driven row can isolate because `/`
  also holds every home and the holder walk refuses it, so condition 116 reads it as text; a-d18b-v's owner follows
  the renamed renderer case.
- **`probe:p336`** (`build/p336/probe-p336.mjs`): H8 is re-graded and extended to his scenario. Six clauses: the far
  home `writesOff` naming the folder; a link named like a project (`<far>/dev`) that leads to the home `writesOff`; the
  home's child `wrote`; a grandchild `wrote`; in `~/dev`, a repository directly inside the far home, every verb
  `wrote, made, moved, done, done, committed`; and the Explorer's New File and New Folder enabled there (the buttons
  in his screenshot). `setupFar` makes `~/dev` and the link. R's Explorer reading moved into two helpers,
  `showExplorer` and `headerButtons`, which H8 calls too. The hand-written HEAD fixtures carry the new shape; the
  hostile one's wrong answer is the defect he reported (the child refused); the RECORDED accidental run, kept byte
  for byte, is a Phase 336 HEAD and so the parent's reading, and it now fails H8's four 336.1 clauses, as listed in
  `RECORDED_FIXTURES`. **The probe's parent leg drives `2867bc39`'s Settings sheet, which Phase 336 removed, so it
  cannot run `c06175f6`**: the probe reads H8 at HEAD, and the parent's H8 is the recorded accidental run (child
  `writesOff`).
- **Tests**: the shared never-list (homes and holders true; a home's direct children, `/`'s direct children and
  `/Users/Shared/x` false; dot steps both ways; reserved names directly inside a home true), main's write-folder (a
  folder holding a home `writesOff`; `~/dev`, `/home/u/dev`, `/root/dev`, `/workspace`, `/tmp` each pinned and
  written), the far prelude under both shells (the home, an ancestor, `/`, a link to the home, a link NAMED `dev` to
  the home, the home typed upper case and `/private` holding the home all `offlimits`; `~/dev` written, made and
  renamed, the home's child typed upper case written, `/private` with `HOME=/` written; `.SSH` and a link named `dev`
  into `.ssh` `protected`), the renderer's slice and tab rule (`~/dev` an edit surface that saves), and the five
  sentence pins.

### Run, with exit codes

Every command ran with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`. His history
files read `732999 1791229874` and `23166 1790702242` before and after every command that started a shell, never moved.

| Command | Result |
| --- | --- |
| The parent's far texts dumped before any edit (`loadFarTexts` over the unedited tree) | exit 0; 30 scripts, sha256 `aebde8fc…` |
| The builder's `attack.mjs` (the table above; parent and HEAD texts, `/bin/sh` and `/bin/dash`) | exit 0; both shells agreed on every row; both scratch roots removed; `/Users/Shared` listed the same before and after |
| `npm run -s typecheck` | exit 0; 1404 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` | exit 0, 34 to 35 s; `HELPER_USER_FLOOR` 166 of 166; 258 check scripts classified; the contract inventory byte for byte |
| `node_modules/.bin/vitest run` (the whole suite) | exit 0, 48 to 55 s; 1072 files passed, 2 skipped; 19,488 tests passed, 14 skipped (five new cases, one in each of the shared, main write-folder, far-prelude, renderer slice and tab-rule suites) |
| The ten touched suites alone | exit 0; 10 files, 250 tests |
| `node build/conformance-machines.mjs` | exit 0, 18 to 20 s; 113 to 121 green; the far half 146 rows under both shells, every one agreeing (five more than the parent's: H8's three and H3's two) |
| `node build/p336/script-arms.mjs` (`probe:p336:script`, all six scripts) | exit 0, 26.5 s; 258 rows: pin 4, m8 168, h1 16, h2 12, h3 6, h4 9, h8 6, m9 7, legacy 30; the two D10 residuals printed as before; cs not run |
| `node build/p336/ablation.mjs` (every arm) | exit 0, 1103.0 s; 60 of 60 newly red on the condition or case that owns them against a green base (machines; main, 104 cases; renderer, 43 cases); every clone file restored by sha256, the worktree never written, no clone left |
| `node build/p336/ablation.mjs --self-test` | exit 0; 11 fixtures |
| `node build/p336/probe-p336.mjs --grader-self-test` | exit 0; 48 clauses, 168 checks, nothing started (Phase 336's 44 and 164; H8 grew from two clauses to six) |
| `npm run -s gate:contract`, `gate:checks`, `gate:background`, `gate:knownhosts` | exit 0 each; byte for byte; 258 classified; 529 files, 3 long-lived starts each ended in a `finally`; 557 files, none outside `build/ssh-run.mjs` |
| At the end | after the last comment edit, typecheck, build, `conformance:machines`, the whole vitest, both self-tests and the four gates were run once more, every one exit 0; no `/private/tmp/p336-*` left |

### Not done, and why

- **No Electron.** The builder launches none; `probe:p336` (H8 as above) is the verifier's app run, at HEAD only for
  the reason given.
- **No Linux far side** (none is available): the GNU `stat` branch is read, as in Phase 336.
- **The case-sensitive volume arm** (`P336_CASE_VOLUME=1`) was not run; it is about reserved names, which did not move.

### The fix round, Phase 336.1 (the fixer, 2026-10-05)

The verifier answered `needs_work` on one minor and one nit, and on nothing worse than today: all ten of its
no-regression rows read `worse: false`, so nothing was removed. It ran the far texts of `c06175f6` and HEAD over ssh to
the loopback machine (276 rows, `/bin/sh` and `/bin/dash` agreeing), three ablations of its own, and one app run per
build that pressed New file, New folder, F2, Cmd+S, Stage and Commit in `~/dev` and through a `/Users/Shared` link to
it; the parent drew his greyed-out screenshot and HEAD wrote every press to the far disk.

- **Minor, fixed.** `docs/ACCEPTANCE-p242.md`'s preface (lines 7 and 8, which Phase 336 added) said "Tortie still never
  saves in a home folder or a folder directly inside one", which the HEAD app run showed false. It now reads "Tortie
  still never saves in a project that is a home folder or holds one, or inside a `.git` or `.ssh` folder there", the
  CHANGELOG item's own words. No gate reads the file: `build/probe-p242-write-path.mjs` names it in a comment only.
- **Where the old wording still stands, and why.** A grep of the tree (`node_modules`, `out`, `.git` and `vendor` left
  out) for "directly inside one" finds it in research 138 (a historical record), in `docs/BACKLOG.md`'s 336.1 charter,
  which quotes it, and in this file: §10's word table and its CHANGELOG draft (the record of what Phase 336 specified,
  superseded by "The words" above) and this section's own account of the old rule. Nothing a person reads in the app
  or in a checklist still says it. Every `src/` comment or test name that says "directly inside a home" (or "the home")
  says such a folder is written, or names Phase 336's old refusal as history.
- **Nit, owed to the follow-up docs commit.** The CHANGELOG item now describes Phase 336 and 336.1 and carries only
  `c06175f6`'s link, because a commit cannot name its own hash. The follow-up docs commit that writes the running-log
  line appends 336.1's as `, ([`<hash>`](https://github.com/gregce/tortie/commit/<hash>))`.

#### Commands, exit codes and numbers (fixer, this worktree, after the edit)

Every command ran with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`. No Electron, no
ssh, no tmux. His history files read `732999 1791229874` and `23166 1790702242` before and after every command that
started a shell, never moved.

| Command | Result |
| --- | --- |
| `npm run -s typecheck` | exit 0; 1404 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` | exit 0, 33 s; `HELPER_USER_FLOOR` 166 of 166; 258 check scripts classified; the contract inventory byte for byte |
| `node_modules/.bin/vitest run` (the whole suite) | exit 0, 48 s; 1072 files passed, 2 skipped; 19,488 tests passed, 14 skipped |
| `node build/conformance-machines.mjs` | exit 0, 19 s; the far half 146 rows holding, the shells agreeing on every one |
| `node build/p336/script-arms.mjs` | exit 0, 23.1 s; 258 rows under both shells, agreeing; the two D10 residuals printed as before; cs not run |
| `node build/p336/ablation.mjs` (every arm) | exit 0, 1036.5 s; 60 of 60 newly red on the condition or case that owns them against a green base (machines; main, 104 cases; renderer, 43 cases); every clone file restored by sha256, no clone left |
| `node build/p336/ablation.mjs --self-test` | exit 0; 11 fixtures |
| `node build/p336/probe-p336.mjs --grader-self-test` | exit 0; 48 clauses, 168 checks, nothing started |
| `npm run -s gate:contract`, `gate:checks`, `gate:background`, `gate:knownhosts` | exit 0 each; byte for byte; 258 classified; 529 files, 3 long-lived starts each ended in a `finally`; 557 files, none outside `build/ssh-run.mjs` |

The worktree's delta against `3f52411e` is now 31 files (the verifier's 30 and `docs/ACCEPTANCE-p242.md`); nothing
committed, staged or stashed. The reverify is a re-read of the preface's two lines and the grep above.

## §As built, Phase 336.1, his ruled round (the main session, 2026-10-05)

The reverify answered needs_work on one sentence: the never-folder refusal also covers a project whose path holds a
`.git` or `.ssh` segment (`isProtectedRemotePath` inside `neverWriteFolder`), so "a project that is a home folder or
holds one" was a false reason there. His ruling, "Fix the wording, then land". The three sentences
(`remoteNeverFolderLine` in `src/renderer/machines/editor.ts`, `remoteCommitRefusedLabel`'s never arm in
`src/renderer/machines/scm.ts`, `commitNeverFolder` in `src/main/machines/remote-copy.ts`) now read "…a project that is a
home folder or holds one, or in a .git or .ssh folder, on <label>." The seven pins in four renderer test files moved with
them. `docs/ACCEPTANCE-p242.md` already read true after the fix round. Re-run: typecheck, vitest over src/renderer,
src/main/machines and src/shared (565 files, 10,276 tests), conformance:machines, conformance:phonecopy and probe-p336's
grader self-test, all exit 0; his history stat unchanged across the run.
