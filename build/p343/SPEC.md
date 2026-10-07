# Phase 343: a link to a folder opens in the Explorer, read only through the link (SPEC)

Subject: `feat(tree): a link to a folder shows as a folder and opens`
First body line: `Phase 343: a linked folder opens in the Explorer, read only through the link`
Semver: Minor, unreleased, rides the next release. Tier 2, with the ATTACK as the independent method. Written 2026-10-06
in `/private/tmp/wt-p343` at `ae8767c2` (origin/main; no source file differs from `b22cf903`, where the entry measured).
Nothing committed, staged or stashed.

Charter. Issue 36, filed 2026-09-29 by John Berryman (JnBrymn): "Here .claude/skills is symlinked to .agent/skills, but
you can see that it looks like a file of unknown type. It would be nice to easily interact with its contents." He
reported it and wrote no code, so the commit body and the changelog item name him as REPORTER, never as a contributor.
The operator asked for a quick phase for the next release. His standing rules bind it: a phase lands only when a side by
side against today shows no scenario worse, and the part that regresses is removed; remote feels identical to local,
with no extra words because it is remote.

Binding sources: this file; `docs/BACKLOG.md` "## Phase 343" (`:40131-40656`) WHOLE, including its "Rulings" (his three
answers of 2026-10-06) and its "Attack (2026-10-06)" section. Where this file departs from the entry it says so in a
D-row with the reason, and §15 lists every departure. His rulings, which nothing here reopens:

1. A link that leaves the project: **"Open it, read only."**
2. A file opened from the Explorer through a link that stays in the project: **"Read only in 343"**; editing through an
   in-project link on both computers is Phase 343.1.
3. (not asked; the entry's recommendation) a link to a FILE keeps today's ⌘S through Phase 240's plain door.
4. (not asked; the entry's recommendation) Linux far side unmeasured, stated.
5. The far folder at a walk's last level that opens empty: **"Yes, fold it in"** as mechanism 7.7, PROVIDED
   `probe:p343` shows the defect at the parent; if the parent does not show it, 7.7 is dropped and the finding is
   recorded as refuted (§10, arm R0).

## 0. What changes for a person

| Scenario | Today (`ae8767c2`) | After this phase |
| --- | --- | --- |
| The issue, `.claude/skills -> ../.agent/skills`, on this Mac | A file of unknown type; a click opens a tab reading "Could not open skills" | A folder marked `⤷` (one chain row `.claude/skills` while `.claude` holds only the link); opens to `a-skill/` and `notes.md`; files open read only |
| A link to a folder outside the project, on this Mac | The same unknown file | Opens and lists, read only (the named widening of READING, ruling 1) |
| A linked folder on another machine | An empty folder that never asks; New File inside refused `outside` | Opens to what is inside, read only, and keeps it across Refresh |
| A far link to a folder the account cannot read, or whose target went away | An empty folder | Opens to nothing; the Explorer keeps every row (without 7.4 the whole Explorer is replaced by a refusal) |
| A folder three levels down in a project on another machine | Opens empty and asks nothing (A6; R0 confirms at the parent) | Opens to its files, one far read (7.7) |
| A link to a file, in or out of the project | Opens; ⌘S writes through it by the plain door | Unchanged, plus the mark |
| A dangling or looping link | A file; the tab says ENOENT or ELOOP | Unchanged, plus the mark |
| A link to a FIFO, on this Mac | A click hangs a read on one of main's file threads (A5) | Inert, as a real FIFO is |
| Dimming with a linked folder open, after a revalidation | (not reachable) | `node_modules/`, `ignored.log`, `.venv`, `bazel-out`, pnpm packages all still dimmed (without rule 6 the whole tree undims, A4) |
| A file opened from the Explorer through a link: typing in Monaco or Redline, ⌥⌫, auto save, ⌘S on a clean tab | Not reachable | Refused; Redline says the existing read-only sentence; ⌘S writes nothing (without §6's six places, written through the link, S2) |
| The same file opened from Context or a link in a document | Opens and saves through the link | Unchanged |
| Right-click a link row | Open, Open in New Tab, Open With, History, New File…, New Folder…, Rename…, Duplicate, Move to Trash, Reveal in Finder, Copy Path, Copy Relative Path; Open and Open in New Tab open a tab reading "Could not open skills"; Open With hands the linked folder to another app; History shows the link's own commits; New File… and New Folder… land in the folder that holds the link | Every item but Open and Open in New Tab (a click on the row now opens the folder); Open With and History act on the link itself, as today (D9, the fix round); New File… and New Folder… land in the same folder; Move to Trash's confirm adds one sentence |
| Header New File / New Folder with a link row, or a row under it, selected | (link row) lands in the folder holding the link | The folder holding the OUTERMOST link above the selection |
| A drop over a link row, from the tree or Finder | On this Mac, lands in the folder holding the link. On another machine a tree move over it is refused ("…that folder is outside it. Nothing was changed.") and a Finder drop is refused (Phase 154) | On this Mac, lands in the folder holding the link, as today, with that folder ringed. On another machine a tree move lands there too, where today it was refused, and a Finder drop stays refused. Never INTO the link. The same on a row that folds the link with the one folder it holds (`.claude3 / skills / only`), on the link's segment or off every segment (D25, the fix round, the narrow fix and the folded-row fix) |
| A move or a Finder drop over a row UNDER a link (a file or a folder inside it, or a segment under the link) | Not reachable | Refused. A move draws no ring on either computer, nor does a Finder drop on this Mac; on another machine a Finder drop keeps Phase 154's refused ring and toast, as on every row there (D25, the narrow fix) |
| A row under a link: F2, ⌫, Delete, a drag (in the tree, to a terminal, to Finder) | Not reachable | Refused; nothing starts |
| A folder of 1,000 links (pnpm `node_modules`) | 0.34 ms a listing | about 12 ms a listing (S3, one lane), only when that folder is listed |
| A link into a network mount that stopped answering | Never statted | Read as today's leaf after at most 250 ms, once; every later listing stats no link until that stat returns, so main's four file threads can lose at most one to links (S4) |
| Ten or more expanded far links on Refresh or reopen | Not reachable | At most nine far reads at once beside the root's |

## 1. The design in one paragraph

Main's `fs:readDir` stats each LINK (and only links) through one lane with a 250 ms wait, and adds one optional field
`link` saying what the link points at; `kind` stays `symlink`, so every other reader is unchanged. The far `tree-list`
text passes `find -H` only when the folder asked about is itself a link and marks every link line with `//` (to a
folder) or `///` (any other link). The Explorer draws a link to a folder as a folder with `⤷`, opens it one level per
click, and asks two pure questions everywhere it already asks the `.git` question: is this row UNDER a link (sources),
and is this folder AT OR UNDER a link (destinations). A file opened from the Explorer under a link carries one tab flag,
`throughLink`, set at creation only, and six places that decide whether a tab's bytes can reach a disk refuse it. git
is asked about a link row in today's leaf spelling and never about a path under it. On another machine a walk that is
not the tab's root never touches the tab's status or line, at most nine such walks run at once, Refresh re-reads the
expanded links, and a folder at a walk's last level gets no cached empty list (7.7). No write rule moves anywhere:
`paths.ts`, `file-ops.ts`, `guarded-write.ts`, the save doors, the baseline store and every far write text stay byte
for byte.

## 2. Measured for this spec (this Mac, plain node, no Electron, no ssh, no tmux)

Scripts and outputs are in `scratchpad/p343/spec/` (NOT in the tree). Every run used `env -i` with a fixed PATH, a
scratch HOME and ZDOTDIR, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; the shipping TypeScript of THIS worktree was
loaded unmodified through the attack's resolve hooks (`register.mjs`/`register2.mjs`, repointed from
`/private/tmp/wt-issues` to `/private/tmp/wt-p343`; `zustand` read from this worktree's `node_modules`). Fixture:
`make-fixture.sh` (the attack's, unchanged), exit 0. His `~/.zsh_history` read `733966 1791325581` and
`~/.bash_history` `23166 1790702242` before the first command and after the last; neither moved. No process outlived a
script (counted once at the end).

### 2.1 Re-runs of the entry's measurements (same answers)

| Id | Script | Exit | Result |
| --- | --- | --- | --- |
| M1 | `m1-listing.mjs` | 0 | 19 links, every one `symlink` today; following: 15 folder, 2 file, `dangling` ENOENT, `self` ELOOP |
| M4 | `m4-remote.mjs` | 0 | Shipping `tree-list`, `/bin/sh` and `/bin/dash`: every link to a folder printed with `/`, cached `[]`, expand asks nothing; the link as root `ok 0`; with `find -H` `.claude/skills` answers 3 rows and `linkFsRoot` `ok 6710` |
| M7 | `m7-watcher.cjs` | 0 | A write through `.claude/skills/` arrives as `create …/.agent/skills/…`; through `linkOut/` and directly in `outside/` nothing arrives |
| M8 | `m8-remote-root-link.mjs` | 0 | `find -H` link to `/`: depth 3 `ok 6710`, median of 3 runs 278 ms; depth 1 `ok 21`, 10 ms |
| M11 | `m11-remote-refresh.mjs` | 0 | `mergeRemoteGroups` empties a link's rows on a root Refresh: 1 row before, 0 after |
| A1 | `a1-far-denied.mjs` | 0 | With `-H`, both shells: link to `/var/root` `denied`, to a `0300` folder `denied`, target removed `missing` |
| A3 | `a3-duplicate.mjs` (on a copy) | 0 | Duplicate of the link row copies the LINK (`skills copy -> ../.agent/skills`, `linkFsRoot copy -> /`), answer `kind: "file"`; Duplicate of `.claude/skills/notes.md` WRITES `.agent/skills/notes copy.md`; under `linkOut` refused `outside` |
| A4 | `a4-ignored-store.mjs` × 4 (real git) | 0 | `folderlink` and `pnpm`: after a revalidation `(nothing dimmed)`; `rule6-as-written`: `.venv`, `bazel-out`, `node_modules/pkgb` lost; `rule6-revised`: all five kept |
| A5 | `a5-fifo-link.mjs` | 0 | `open(link to FIFO, 'r')` has not returned after 3 s |
| A6 | `a6-depth-edge.mjs` | 0 | `a/b/c/d.txt` at depth 3: lines `/a/ /a/b/ /a/b/c/`, cache key for `a/b/c` is `[]` |
| A8 | `a8-git-links.sh` (on a copy) | 0 | Leaf spelling `node_modules/ ignored.log .venv bazel-out` exit 0; `.venv/` exit 128 "beyond a symbolic link"; `.claude/skills/` exit 128; `node_modules/pkgb/b.js` exit 128; `git log -- .claude/skills/notes.md` 0 lines, `-- .agent/skills/notes.md` 1 line; `git show HEAD:.claude/skills/notes.md` exit 128 |

M2, M5, M9 and M10 measure write rules this phase does not touch (`paths.ts`, `file-ops.ts`, the far write texts) and
were not re-run here; S2 below re-reads the one of them the read-only decision rests on, and the verifier's main-side
driver (§12) re-runs them all at both builds.

### 2.2 New measurements

**S1, the far text this spec prescribes** (`s1-far-text.mjs`, exit 0). The candidate in §4.4, run beside the shipping
text under `/bin/sh` and `/bin/dash` over the fixture: an ordinary root answers BYTE FOR BYTE what the shipping text
answers once the marks are removed (`ok 35`, both shells, `ALL ORDINARY ROOTS BYTE IDENTICAL: true`), and so does `/`
at depth 1 (`ok 21`; macOS's `/etc`, `/tmp`, `/var` marked `//`, `/.VolumeIcon.icns` `///`, no line starting `//`).
Every link line is marked: 15 `//` and 4 `///` (`dangling`, `linkFile`, `self`, `linkFileOut`); names ending `@`, `.`
and a space print unmarked. As roots: `.claude/skills` `ok 3`, `chainA` `ok 3` (a chain of two links followed to its
end), `loopRoot` `ok 35` with 19 marked lines below and none descended, `linkOut` `ok 3`, `linkFile` `notdir`,
`dangling` and `self` `missing`. A root written with a trailing slash prints no `//` inside any line.

**S2, ⌘S on a CLEAN tab opened through a link** (`s2-clean-save.mjs`, exit 0). `saveOnce` (`tab-io.ts:1543`) has no
clean short circuit ("An explicit ⌘S on a clean tab still writes", `tab-io.ts:1751-1757`), so the SHIPPING
`writeGuarded` was driven with the bytes the tab holds:

```
.claude/skills/notes.md -> {"outcome":"wrote",...,"bytes":6}
   real file <fx>/proj/.agent/skills/notes.md: inode 774891218 -> 774965478, mtime moved true, bytes same true
linkOut/secret.txt      -> {"outcome":"refused","why":"outside","reason":"That path is outside the project."}
```

So a ⌘S with no typing REPLACES the target file of an in-project link, and through a link out of the project it raises
the `outside` sentence that `save-sentences.ts:103-113` says a person should never meet. The entry's five places do not
include `saveOnce`; this is the sixth (D11).

**S3, what a link stat costs a listing, by lane** (`s3-lanes.mjs`, exit 0, 200 reads each after 20 warm-ups, measured
while the machine's load average was 34):

| Folder | readdir alone (today) | + stat, all at once | + stat, 1 lane | + stat, 2 lanes |
| --- | --- | --- | --- | --- |
| 1,000 folder links (pnpm) | 0.34 ms (p95 0.45) | 2.64 ms (p95 3.94) | 12.33 ms (p95 20.58) | 9.46 ms (p95 12.86) |
| 5,000 files and 50 links | 1.97 ms (p95 4.21) | 2.15 ms (p95 3.79) | 2.63 ms (p95 3.74) | 2.81 ms (p95 4.77) |

**S4, what requests that never return do to every other file request** (`s4-pool.mjs`, exit 0; each N in a child node
with the default pool of four, killed in a `finally`; a blocked FIFO `open` stands in for a `stat` into a mount that
stopped answering, which libuv cannot cancel either):

```
0 blocked request(s) in a pool of 4: stat answered in 0.2 ms
1 .. 3 blocked:                      stat answered in 0.1 ms
4 blocked request(s) in a pool of 4: stat had not answered after 2000 ms
```

So a folder holding four links into a dead mount, statted all at once as the entry's mechanism 1 reads, would stop
every file read and write in main. `src/main/agents/health.ts:163-188` records the same dose response and the house
answer to it: a 250 ms wait, ONE stranded request tolerated, and every later check answering at once while it is
outstanding. D3 takes that answer.

**P1, rule 6 prototyped over the shipping store** (`proto/patch.mjs` patches a SCRATCH COPY of
`src/renderer/tree/ignored.ts`; `proto/run.mjs` drives it with real git over the A8 repository; exit 0). Link rows asked
in leaf spelling, nothing under a link asked, hits keyed back onto the folder spelling:

```
after opening        : .venv/ .venv/secret.txt bazel-out/ bazel-out/x.txt ignored.log node_modules/ node_modules/pkgb/ node_modules/pkgb/b.js
after a revalidation : (the same eight)
```

git never exited 128, the ignored links stay dimmed AND the rows under them are covered, and `src/linkIgnored/`
(a link to `node_modules/pkg` that is not itself matched) and `.claude/skills/` stay undimmed, which is true.

## 3. Decisions, each with its source

**D1. The Explorer's opening is read only; nothing else changes.** From the Explorer, through a link, Tortie reads and
never writes, on both computers. Context (`src/renderer/context/open-detail.ts:154-173`), a link inside a document
(`MarkdownPreview.tsx:124-138`), a terminal path link and every other opener are untouched and keep saving as today.
Source: the entry's decision; rulings 1 and 2.

**D2. Main's listing says what a link points at, in a new optional field; `kind` does not move.** `FsLinkTarget =
'dir' | 'file' | 'other' | 'none'` and `FsDirEntry.link?: FsLinkTarget`, present only on a `kind: 'symlink'` entry whose
stat answered: `dir` and `file` by `isDirectory()`/`isFile()`, `other` for anything else (FIFO, socket, device), `none`
for any stat error (ENOENT, ELOOP, EACCES, ENOTDIR). ABSENT means not known, and every reader treats absent exactly as
today's leaf. No `realpath`, no containment call, no channel added or renamed. Source: entry mechanism 1; M1.

**D3. The stat is bounded the way `health.ts` bounds its inspections.** In a new `src/main/fs/link-target.ts`: ONE lane
(at most one link stat in flight in main at any moment); a listing waits for its links at most `LINK_STAT_WAIT_MS = 250`
(health.ts's own figure) and reads every link not answered by then as absent; a stat still running when its listing's
wait ends is STRANDED, and while one is stranded every listing starts no link stat and reads its links absent at once
(one stranded stat tolerated, as `health.ts` tolerates one, so links can hold at most one of the four pool threads
however many dead mounts a project links to); a link already being statted is not statted a second time (the in-flight
answer is shared); a stat a listing's wait gave up on before it STARTED is never started. Cost: S3, 12.33 ms median at
1,000 links, nothing measurable at 50. Source: entry mechanism 1 ("the spec measures and names it") and attack 10; S3,
S4; `src/main/agents/health.ts:163-188`. The entry's own bound (no second stat of the SAME link) alone fails S4: four
different stale links stop main.

**D4. An unanswered link keeps the kind its folder's previous listing gave it.** In the renderer's `readInto`
(`src/renderer/tree/store.ts:167-187`) an entry `kind: 'symlink'` with no `link` takes the `link` the same name had in
that folder's cached listing, if any; only a link never answered reads as today's leaf. Without this a slow or gated
listing (D3) turns an OPEN linked folder into a leaf on the next watcher tick and the diff removes its whole subtree.
Local only: the far marks (D14) are never partial. Source: this spec, derived from D3.

**D5. How a link row is drawn.** `link === 'dir'` → a folder (trailing slash in `treeInput`, sorted with the folders by
`sortEntries`). `link === 'other'` → INERT, by the rule a real FIFO already gets (`FileTree.tsx:502`). Anything else
(`file`, `none`, absent) → today's leaf and today's click. Every link row, folder or leaf, carries the row decoration
`⤷` (U+2937) in `var(--text-muted)` titled `Link`; the conflict `!` keeps the lane when both apply. A loop opens one
level per click (expansion is per click, a chain row's open state is its last folder's and starts closed, restored
expansion is capped at 500). Source: entry mechanism 2; A5; VS Code's `explorerDecorationsProvider.ts:26-29`.

**D6. Two pure questions, beside the `.git` one, in `src/renderer/tree/tree-paths.ts`.** `TreeLinks = { folders,
rows }`: the canonical spellings of every link row the loaded listing drew as a folder, and of every link row at all.
`isUnderLink(canonical, links)` is true when an ancestor of the path is in `links.folders` (strictly below);
`isAtOrUnderLink(dirCanonical, links)` adds the folder itself. Built from the rows under the tab's root only, so a link
ABOVE the root never counts (issue 25's project opened through a link still saves). SOURCES ask "under"; DESTINATIONS
ask "at or under". Source: entry mechanism 3; attack 3 and 4.

**D7. A create that would land at or under a link lands in the folder holding the OUTERMOST link above it instead.**
One helper, `outsideLinks(dirCanonical, links)`, answers `parentOf(outermost link)` for a folder at or under a link and
the folder itself otherwise. The header's New File / New Folder (`headerDestDir`) and the link row's own menu use it,
so both land exactly where they land today (today the link row is a leaf whose New File… lands in its parent). On a row
UNDER a link the menu offers no create at all (today unreachable). Source: the entry's table row for the header, and
his "no scenario worse than today" for the menu. DEPARTS from the entry's §Menus, which removed New File… and New
Folder… from the link row: that removed a gesture that works today.

**D8. After main answers for a link, the tree takes the kind from its OWN row.** Main answers `kind: 'file'` for a link
because `kindOf` reads `lstat` (`src/main/fs/file-ops.ts:245`; A3). The move (`tree-ops.ts:863-866` and its
`followMoves`/`resync`), trash (`:1258-1276`) and duplicate (`:1216-1218`) arms read `links.folders` and use `dir` for a
link row drawn as a folder, as `finishRename` already does from the event (`:791-794`), so a folder row is never removed,
moved or added under a file's spelling, its cached listing is forgotten (`forgetUnder`), and the tabs under it follow a
move. Source: entry mechanism 3; A3.

**D9. The menu.** For a right-clicked row under a link, or a selection holding any row under a link: New File…, New
Folder…, Rename…, Duplicate, Move to Trash and History are absent, and the menu ends with ONE disabled line, `Read only
through a link`, which on another machine REPLACES the machine's own note (never beside it). Open, Open in New Tab, Open
With (as main decides it today), Reveal in Finder and both Copy Path rows stay. A link row itself keeps every item it has
today but Open and Open in New Tab, and gets no footnote (D7, D24). Source: entry mechanism 4; attack 8 (History through
a link is an empty history); for the link row, the verifiers' side by side against the parent (D24).

**D24 (the fix round). The link row keeps Open With and History, aimed at the LINK.** Drawn as a leaf at the parent, the
link row carried the file rows' Open, Open in New Tab, Open With and History, as main built the menu (both verifiers read
it). A folder row offers none of the four, so as first built the link row lost all four, and two of them worked today: Open
With handed the linked folder to another app, and History showed the link's own commits (`git log -- .claude/skills`, 1
commit on the attack's fixture; a path past the link has none). Both are worse than today without them, so
`TreeMenuTarget.linkRow` keeps both on a link row drawn as a folder, on this Mac, ahead of New File…, each aimed at the
link's own spelling (`.claude/skills`, never `.claude/skills/`): main is asked about the same path, and History opens the
same tab the parent opened. Open and Open in New Tab are not kept: at the parent they opened a tab that read "Could not
open skills", and a click on the row now opens the folder. On another machine neither is offered, as a far folder (which a
far link always was) never had them. A link row UNDER a link keeps Open With and loses History, as every row under a link
does. Source: verifier lens 1's and lens 2's menus at both builds; his rule, no scenario worse than today.

**D25 (the fix round, corrected by the narrow fix). A drop over a link row lands beside the link, from Finder and from the
tree; a drop over any row UNDER a link lands nothing.** At the parent, ON THIS MAC, a drop over the link row landed in the
folder holding it, because the library aims a drop over a FILE row at that file's folder. ON ANOTHER MACHINE at the parent
the link was already drawn as a folder, the library aimed a tree move INTO it, and the far write refused it with "…that
folder is outside it. Nothing was changed." (the reverify's own drive, `rdrive3`, arms B, C and D at the parent); a Finder
drop there was refused, as every Finder drop onto a machine is (Phase 154). As first built, both were refused on this Mac,
which is worse than today. The rule now: a drop over the link row ITSELF (its folder row, or its segment of a chain row)
lands in the folder holding the link, never INTO the link; on this Mac that is today's answer, and on another machine a
tree move now lands there where today it was refused, which is no scenario worse. Everything under a link is read only,
so a move dropped over ANY row under a link is refused, with no ring, on both computers (the narrow fix, his ruling of
2026-10-07): `besideLinkDrop` is also handed the row under the pointer (`rowFromEvent`) and refuses a FILE row under a
link, the one row the library aims at the folder holding it, which for a file directly inside a linked folder is the link
itself; as the fix round left it, a move over `.claude2/skills/notes.md` was carried to `.claude2/` with `.claude2/` ringed,
on both computers. A folder row and a segment under a link were already refused, because the library aims a drop over one
at that very folder; the file test is asked of a file row alone, because a chain row folded INTO a link (`.claude /
skills / a-skill` when the link holds one folder) has its deepest folder as its row while the pointer is on the link's own
segment, and that drop is the link row's. From Finder, `importTargetFor` aims a link row as it aims a file
row (the host already draws the ring on the destination folder). From the tree, the library still refuses the link row
(`canDrop`, D6), so it moves nothing and draws nothing, and the tree's HOST carries the move: `besideLinkDrop(dragged,
folder, links, row)` answers the folder holding the link only when the folder under the pointer, read THE LIBRARY'S OWN WAY
(`dropDirFromEvent` in `row-events.ts`: a chain row's segment, then a folder row, then a file row's folder), is exactly a
link row, so a drop the library accepted (a chain row's outer segment) is never carried a second time; it applies the
library's own refusals (a folder dropped beside a link inside it, a dragged row under a link, `.git`), the drop is read
again from the drop event itself, and the move goes through the same `ops.drop(…, false)` the empty-space root drop has
used since Phase 12.9, which refuses again at or under a link (D8). The ring is the import ring on that folder, the root's
ring when it is the root, and, when that folder is folded into a chain row (`.claude` holding only the link is drawn
`.claude / skills`), the chain row that shows it, never the whole box, which would say the root (`boxOfRow`, from Finder
and from the tree alike; at the parent `.claude` had its own row and that row was ringed). On another machine Finder drops stay refused (Phase 154) and a tree move behaves as on this Mac.
Source: verifier lens 2's parent measurement (`drops.linkRow.landed` true at the parent, false as first built); the
reverify's far drive at the parent; his rule; his ruling on the second needs_work, "Narrow fix, then land".

**D10. Move to Trash over a link says only the link moves.** When any target is a link row, the confirm body gains one
sentence (§8). The probe reads it and CANCELS (D21). Source: entry mechanism 4.

**D11. A file opened from the Explorer under a link is read only in SIX places, set at creation only.** `openRel`
(`FileTree.tsx:498-529`) adds `throughLink: true` to the request when the row is under a link (D6; never for the link
row itself, so a link to a file keeps ruling 3's behaviour). The store applies it only when it CREATES the tab
(`src/renderer/editor/store.ts`, the `const tab: EditorTab = {…}` at `:1029-1137`); a request that lands on an open tab
(`:933-985`) leaves that tab as it is, so a dirty tab is never turned read only under a person's edits. The six:
1. `tabIsReadOnly` (`src/renderer/editor/tab-readonly.ts:57-71`), in its first `if`, before the remote reason (so it
   wins over `remoteWriteFolderIn` and also stops auto save, which asks this function at `auto-save.ts:177`, the tab
   strip, Monaco and the editor menu's Save and reshape rows);
2. `markDirty`'s refusal list (`store.ts:1565-1582`);
3. `redlineTypable` (`src/renderer/editor/redline-edits.ts:195-206`);
4. the Redline rewind and undo press (`RedlineDocument.tsx:441-490`): before `pressRedline` is called and before a byte
   is read, the press answers `refuse('readOnly')`, whose sentences already exist (`redline-sentences.ts:32`, `:162`);
5. `keepsBaseline` (`src/renderer/editor/baseline-durable.ts:81-89`, with the field added to `BaselineTab`'s `Pick`), so
   nothing read through a link is stored in Tortie's durable baseline store;
6. **`saveOnce` (`src/renderer/editor/tab-io.ts:1543`), NEW**: one silent `return false` beside the commit, map, report
   and compare refusals and BEFORE the remote branch (`:1579`), because ⌘S on a clean tab writes (S2).
The doors themselves (`writeGuarded`, the plain door, `saveOnMachine`) are not touched. Tabs are not persisted (no tab
reaches `localStorage` in `src/renderer/editor/`, read), so the flag lives as long as the tab. Source: entry mechanism 5;
attack 2; S2.

**D12. One band.** `EditorPanel.tsx`'s chain (`:1022-1104`) draws `Read only · opened through a link` with the lock
codicon and the `ed-banner-readonly` class, as the FIRST arm after `deleted`. Source: entry mechanism 5.

**D13. git is never asked about a path past a link, and a link row is still asked as today.** `pathsToAsk`
(`src/renderer/tree/ignored.ts:143-157`) takes `links` (required) and drops every path strictly under a link folder on
BOTH arms (the ordinary sync and the revalidation, `:331-334`); `sync` sends a link folder row to git in its leaf
spelling (`.venv`, never `.venv/`) and keys a hit back onto the folder spelling before `commit` (`:284-295`), so
`coveredByIgnored` dims the rows under an ignored link as under any ignored folder. `answered` holds the canonical
spelling. `treeGitLane` (`src/renderer/tree/decorations.ts:80-101`) takes the link folders (required) and keys a
porcelain row whose path is a link folder onto the folder spelling, so `?? newLink` keeps its mark on the `newLink/` row.
Source: entry mechanism 6; A4, A8, P1.

**D14. The far walk follows a link only when it is the folder asked about.** §4.4's text: `h=-H` only inside `if [ -L
"$p" ]`, `find $h "$p"` on both walks, every other line of today's text unchanged, and a link line marked `//` (to a
folder) or `///` (any other link). Every ordinary listing on every machine is byte for byte today's (S1). Never `find -L`
or `-follow`: a later round that "simplifies" `-H` to `-L` walks every loop to the depth cap. Source: entry 7.1; A7, S1.

**D15. The far answer carries the mark; `kind` keeps today's meaning.** `RemoteTreeEntry.link?: 'dir' | 'leaf'`;
`entryOfLine` reads `///` first (`{ kind: 'file', link: 'leaf' }`), then `//` (`{ kind: 'dir', link: 'dir' }`), then
today's `/`. `kind` is still what `[ -d ]` said, so a reader that ignores `link` reads today's answer. Source: entry 7.2.

**D16. The cut.** `groupRemoteEntries` (`src/renderer/tree/remote-plan.ts:57-77`) turns an entry carrying `link` into
`kind: 'symlink'` with `link: 'dir'` for a far link to a folder and NO field for a far `leaf` link (today's leaf, D2),
and gives a link no key (no empty list), so expanding it asks the machine once with the link as the root.
`mergeRemoteGroups` (`:87-104`) keeps every cached key at or under a link row the answer names, because that walk never
descended it (M11). A far link that is not a folder opens as today: `review-file` (`remote-scripts.ts:968-981`) reads a
regular file only, so a far link to a FIFO cannot hang a read the way a local one can, and it stays a leaf rather than
going inert. Source: entry 7.3; M4, M11.

**D17. A walk that is not the tab's root never sets the tab's status or line.** In `treeInto` (`store.ts:240-296`), for
`dir !== root.path`: the opening `set` (`:247-249`) is not made; a `missing`, `notdir`, `denied`, `unreachable` or
`notConnected` answer leaves that folder unlisted (its key absent), as a failed child read does on this Mac
(`:176-185`); an `ok` answer only merges entries and never moves `remote.status`, `root`, `readAt`, `total`, `shown`,
`truncated` or `loading`. So a capped walk of a link (a link to `/`) is not announced: stated in §14. Source: entry 7.4;
A1.

**D18. Never more than nine walks at once besides the root's, for EVERY non-root walk.** A count in `store.ts`, not a
clock (Phase 90.3's NO TIMER rule, `store.ts:23-30`, stands): `REMOTE_EXTRA_READS = 9`; a tenth waits in FIFO order; a
waiting LAZY load re-checks the cache when its turn comes and is dropped if a walk already covered it; `setRoot` drops
every waiter. WIDER than the entry's "nine link reads": with 7.7 every folder at depth 3 is a walk of its own, and the
restore effect (`use-tree-model.ts:684-691`) calls `loadDir` for every persisted folder at once, so links alone are not
what can pass the far machine's ceiling (research 56 §1.5: ten at once 46.3 ms median, eleven 258.8 ms; research 55:
failures from thirty). Source: entry 7.5, widened.

**D19. Refresh re-reads the expanded links.** Remote `refreshLoaded` (`store.ts:404-418`) starts the root's walk and a
walk of every cached key that is a link drawn as a folder, together (through D18's count); when the root's answer lands,
it walks every link key the merged cache now names that it did not start with (a real folder replaced by a link keeps a
stale key otherwise, because D16 keeps keys at a link). A folder opened past a walk's depth still keeps what it has, as
Phase 90.3 rules. Source: entry 7.5 ("keeps it across Refresh") and the verifier's shape "a real folder replaced by a
link" in the entry's attack list.

**D20. 7.7, provided the parent shows it.** `groupRemoteEntries(root, entries, depth)`, `depth` REQUIRED, gives a folder
whose `depthUnder(root, path) === depth` no key, so expanding it asks the machine once, which is what the module header
(`remote-plan.ts:12-18`) already states. Callers pass `REMOTE_TREE_DEPTH`. If arm R0 at the parent shows the folder
opening with its files, the fix round removes this change and its test and the changelog sentence, and §As built records
the finding as refuted. Source: ruling 5; A6.

**D21. The probe never empties anything into his Trash.** `shell.trashItem` moves into the account's real `~/.Trash`
whatever `HOME` says. Arm L4 reads the confirm's body and presses Cancel, as `build/probe-p154-drop.mjs:25-34` does; the
trash arithmetic (D8) is driven in the unit lane with an injected `fsOps`. Source: that precedent; the brief's rule
against writing under his home. DEPARTS from the entry's L4, which trashed for real.

**D22. The far machine's own count of walks in flight.** Arm R4 counts on the far side: the probe writes a `.zshenv`
into the loopback yard's OWN `ZDOTDIR` (never his) that puts a scratch folder first on PATH holding a `find` wrapper,
which appends `S <pid>` before and `E <pid>` after running `/usr/bin/find`; the open count of `tortie-tree-list` walks
is read from that log. Source: the entry's R4 ("the far side's own count").

**D23. No new gate.** `conformance:machines` condition 51 gains its clause (§9.1); every new unit rule is shown red by
`ablation:p343` (§9.2); the doors a hook wires are the app run's (§10). Source: CLAUDE.md growth guardrails; Tier 2.

## 4. Main and the far side (builder A; writes §4.1 FIRST)

### 4.1 First, append-only: the shared types

- `src/shared/types.ts`: export `type FsLinkTarget = 'dir' | 'file' | 'other' | 'none'` beside `FsDirEntry`
  (`:775-786`); add `link?: FsLinkTarget` with a comment saying when it is present and that absent is today's leaf;
  rewrite the `kind` comment (`:780-784`): links are still `symlink`, and the tree opens a link to a folder one level per
  click rather than never following it.
- `src/shared/ipc/machines/filesystem.ts`: `RemoteTreeEntry.link?: 'dir' | 'leaf'` with its comment; correct the false
  comment at `:173` (a link to a folder is not reported as a file: it is `dir` with `link: 'dir'`, any other link is
  `file` with `link: 'leaf'`, a socket is a file) and `:102` ("It reaches nothing outside the folder it was asked about"
  becomes: it walks only below that folder, and when that folder is itself a link it walks what the link points at).

### 4.2 `src/main/fs/link-target.ts` (new)

`createLinkTargets(deps: { stat(path: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>; waitMs?: number;
timer?: … })` returns `linkTargetsOf(dir: string, names: readonly string[]): Promise<Map<string, FsLinkTarget>>`, and a
pure `entriesOf(abs, dirents, links): FsDirEntry[]` that the handler maps with (so the field is tested without
electron). D3 is all of it: one lane, `LINK_STAT_WAIT_MS = 250`, one stranded stat closes the gate until it returns, a
path in flight shared, a dropped stat never started. Production builds ONE instance at module scope over
`node:fs/promises` `stat`. It names no `realpath`, no `lstat` and nothing from `paths.ts`. Its header says what
`health.ts` says about a thread nothing can cancel, with S4's numbers.

### 4.3 `src/main/fs/ipc.ts`, `fs:readDir` only (`:205-224`)

After `readdir`, `await linkTargetsOf(abs, <names of the symlink dirents>)`, then `entriesOf`. `entryKind` (`:67-81`)
does not change. No other handler in the file is touched (`fs:writeFile`, `fs:writeGuarded` and their log lines are
read by `conformance:save` rules 15 to 17 and `conformance:redline-write`).

### 4.4 `src/main/machines/remote-scripts.ts`, `TREE_LIST` (`:1403-1427`) and its header (`:1344-1401`)

The text, exactly (S1's candidate):

```
set -e
umask 077
p="$1"
h=
if [ -L "$p" ]; then h=-H; fi
if [ ! -e "$p" ]; then
  printf '__TORTIE_RUN__missing %s\n__TORTIE_RUN__\n' "$p"
elif [ ! -d "$p" ]; then
  printf '__TORTIE_RUN__notdir %s\n__TORTIE_RUN__\n' "$p"
elif [ ! -r "$p" ] || [ ! -x "$p" ]; then
  printf '__TORTIE_RUN__denied %s\n__TORTIE_RUN__\n' "$p"
else
  o=$(find $h "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print 2>/dev/null |
    head -n "$3" |
    while IFS= read -r f; do
      if [ -L "$f" ]; then
        if [ -d "$f" ]; then printf "%s//\n" "$f"; else printf "%s///\n" "$f"; fi
      elif [ -d "$f" ]; then printf "%s/\n" "$f"; else printf "%s\n" "$f"; fi
    done)
  c=$(find $h "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print 2>/dev/null | wc -l | tr -d " ")
  printf '__TORTIE_RUN__ok %s %s\n%s__TORTIE_RUN__\n' "${c:-0}" "$p" "${o:-}"
fi
```

`$h` is the one unquoted expansion and it is not a positional: it is empty or the constant `-H`, so condition 36 (every
positional double quoted) reads as today. The text still names only `find`, `head`, `printf`, `wc`, `tr`, `read` and
`test`, still prunes `.git`, still reads its depth from `$2` and caps with `head -n "$3"`, still has exactly two
`2>/dev/null` and two `find ` walkers, and the bundle refusal `machine.tree-list-prunes-git` fragments
(`build/assert-bundle-refusals.mjs:1135-1144`) are untouched. The header: the seven properties stay true and an EIGHTH
is added ("It passes `-H` to `find` only when the folder it was asked about is itself a link, so it walks what that link
points at and never follows a link below it; it never names `find -L` or `-follow`"); property 6 gains one clause (a
link that points at a `.git` folder, expanded by hand, is walked, read only); "What it cannot do" gains the line marks.

### 4.5 `src/main/machines/tree-list.ts`, `entryOfLine` (`:112-116`)

D15, in that order: `///`, then `//`, then `/`. `parseTreeList` is unchanged (a marked line still begins with the root).

### 4.6 Main tests (new files `p343-` prefixed)

- `src/main/fs/__tests__/p343-link-target.test.ts`: over a scratch tree, the four answers (a FIFO made with
  `/usr/bin/mkfifo` for `other`; `dangling` and `self` for `none`); `entriesOf` keeps `kind: 'symlink'` and adds the
  field; with an injected stat that NEVER answers: the listing returns within `LINK_STAT_WAIT_MS` plus 100 ms with the
  link absent, a second listing of a folder with a DIFFERENT link starts zero stats and returns at once, and after the
  hung stat answers a third listing stats again; an injected stat records the most in flight at once, which must be 1
  over a folder of 50 links; the same path asked by two listings at once is statted once; a folder with no links stats
  nothing; a stat a listing gave up on before it started is never started.
- `src/main/machines/__tests__/p343-tree-list-links.test.ts`: the SHIPPING text under `/bin/sh` and `/bin/dash` over a
  scratch tree with the environment built from nothing (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, fixed PATH, no
  `TERM_SESSION_ID`), the shape of `p336-far-prelude.test.ts:47-101`. Today's text is kept in the test as a literal and
  an ordinary root must answer it byte for byte once the marks are removed, on both shells; every S1 row; and the two
  shells agree on every row.
- `src/main/machines/__tests__/p903-b-tree-list.test.ts`: `entryOfLine` on `//`, `///`, a name ending `@`, `.` or a
  space, and the order (a `///` line is never read as a folder).

## 5. The Explorer (builder B)

Codes against §4.1's types and `OpenFileRequest.throughLink` (§6.1, builder C writes it first).

- `src/renderer/tree/tree-paths.ts`: `TreeLinks`, `isUnderLink`, `isAtOrUnderLink`, `outsideLinks` (D6, D7);
  `importTargetFor(row, pendingPath, links)` (`:208-224`, `links` required) answers null under a link, so a Finder drop
  over a row under one paints nothing, and (the fix round, D25) aims a link row like a file row, at the folder holding it;
  `besideLinkDrop` (D25), handed the row under the pointer since the narrow fix, refusing a file row under a link;
  `linkAimOf` and `importRowFor` (the folded-row fix), with `chainFromEvent` in `row-events.ts`.
- `src/renderer/tree/header-actions.ts`: `headerDestDir(selected, links)` (`:25-29`) answers `outsideLinks(...)`.
- `src/renderer/tree/use-tree-model.ts`: `treeInput` (`:349-366`) adds the slash for `link === 'dir'` and returns
  `links: TreeLinks`; a `linksRef` written on every render (the `canRenameHereRef` pattern, `:341-342`) and exposed on
  the bridge; `canDrag` (`:428-457`) refuses any path under a link; `canDropInto` (`:463-474`) refuses a folder at or
  under a link; `renaming.canRename` (`:538-546`) refuses a path under a link; the row decoration (`:387-399`) keeps the
  conflict `!` first and otherwise answers `⤷` for any row `treeInput.kinds` calls `symlink` (D5); `syncIgnored` (`:712`)
  passes the link folders; `treeGitLane` is given them (`gitState`, `:374-382`).
- `src/renderer/tree/FileTree.tsx`: `openRel` (`:498-529`) is inert for `kind === 'other'` OR a link whose `link` is
  `other`, and adds `throughLink: true` for a path under a link (local and remote alike); `newEntryTarget` (`:268`) passes
  the links.
- `src/renderer/tree/use-tree-menu.ts`: `openable` (`:186`) as `openRel`; `destDir` through `outsideLinks`; the target
  gains `underLink` (the clicked row or any selected row under a link).
- `src/renderer/tree/tree-menu.ts`: `TreeMenuTarget.underLink`; D9's rules in `buildTreeMenu` (`:128-330`), including the
  remote create and rename flags; `LINK_READ_ONLY_NOTE` exported, replacing the machine note at the footnote (`:324-326`);
  the header comment's "WHAT CROSSES" list gains one line for a row under a link.
- `src/renderer/tree/tree-ops.ts`: `TreeOpsContext.links(): TreeLinks` (read through the ref, so the verbs are NOT
  rebuilt on every listing; `use-tree-rename.ts:189-201` passes it); the second doors refuse under a link: `startRename`
  (`:1098-1101`), `onRenameCommitted` for a rename (`:1167-1182`), `duplicate` (`:1209`), `trash`'s filter (`:1239`),
  `drop` (`:1299-1301`, destination at or under, sources under), `importPaths` (`:1320-1323`) and `newEntry` (`:1048`,
  destination at or under); D8's kind arithmetic in `applyMove` (`:863-866`, `:892-903`), `trash` (`:1255-1276`) and
  `duplicate` (`:1216-1218`); D10's body clause in `trash`.
- `src/renderer/tree/use-tree-drag.ts`: the drag-out filter (`:209-212`) drops paths under a link; `importTargetFor`
  (`:318`) gets the links.
- `src/renderer/tree/ignored.ts`, `src/renderer/tree/decorations.ts`: D13.
- `src/renderer/tree/store.ts`: `sortEntries` (`:48-55`) sorts a link to a folder with the folders; D4's carry in
  `readInto`; D17 in `treeInto`; D18's count; D19 in `refreshLoaded`; the Phase 90.3 header gains one paragraph for the
  count and keeps NO TIMER.
- `src/renderer/tree/remote-plan.ts`: D16, D20; the header's rule paragraph gains the link and last-level sentences;
  a pure `loadedLinkFolders(cache): string[]` for D19.
- `src/renderer/tree/index.ts`: re-exports follow any signature change.

Tests (new files `p343-` prefixed under `src/renderer/tree/__tests__/`, plus every existing one the required parameters
break, being at least `p903-b-remote-plan.test.ts`, `p903-b-tree-store-remote.test.ts` (its `:110-124` case no longer
needs to delete a key by hand), `header-actions.test.ts`, `p154-import-target.test.ts`, `ignored*.test.ts`,
`decorations.test.ts`, `tree-menu.test.ts`, `p903-b-tree-menu-remote.test.ts`):
- the predicates: under, at, the link row, a loop (`loopRoot/loopRoot/x`), a chain, a link under a link, a link ABOVE
  the root that must not count; `outsideLinks` for a nested link (outermost wins);
- `headerDestDir` and `importTargetFor` on a link row and under one;
- `buildTreeMenu` under a link and on a link row, local and remote, a mixed selection, ONE footnote, History absent;
- `createTreeOps` with a fake ctx and fake `fsOps`: every second door refuses under a link and sends nothing; a trash,
  a move and a duplicate of a link row answered `kind: 'file'` remove, move or add the FOLDER row and call
  `forgetUnder`; the trash body carries D10's sentence only when a target is a link row;
- `pathsToAsk` on both arms emits `.venv` (never `.venv/`) and nothing under any link; a fake `checkIgnore` that answers
  `[]` (git's exit 128) whenever it is handed a folder-spelled link or a path under a link shows the whole set kept
  across a revalidation; a hit keyed onto `.venv/` covers `.venv/x`; `treeGitLane` keys `newLink` onto `newLink/`;
- `groupRemoteEntries` gives a link no key, a far `leaf` link no field, and (7.7) a depth-3 folder no key;
  `mergeRemoteGroups` keeps a link's rows across a root answer (M11's shape, 1 row before and after);
- the store over a scripted `listTree`: a non-root `denied`, `missing` and capped answer leave `remote` exactly as it
  was; with ten gated walks the most in flight beside the root's is 9; a waiting lazy load covered by an earlier walk
  is dropped; Refresh with one expanded link costs the root plus one; a folder replaced by a link is walked after the
  root lands; `readInto` carries a link's kind across a listing with no field.

## 6. The editor (builder C)

### 6.1 First, append-only

`src/renderer/state/open-file.ts`: `throughLink?: true` on `OpenFileRequest`, after `remote` (`:232`), with a comment
saying it is the Explorer's (D1). `src/renderer/editor/tab-types.ts`: `throughLink?: true` on `EditorTab`, after `remote`
(`:193`), optional so every fixture is still a tab.

### 6.2 The six places and the band

D11 and D12 in `store.ts` (creation `:1090`, `markDirty` `:1565-1582`), `tab-readonly.ts`, `redline-edits.ts`,
`RedlineDocument.tsx`, `baseline-durable.ts`, `tab-io.ts` (`saveOnce`) and `EditorPanel.tsx`. `markDirty`'s refusal is
added to the list in the `if`, so Phase 268's order (patch, then arm; `conformance:save` rule 14) is untouched.

### 6.3 Tests

`src/renderer/editor/__tests__/p343-through-link.test.ts`: `tabIsReadOnly` true with the flag, local, and remote WITH a
write folder; `markDirty` leaves a flagged tab clean; `redlineTypable` false; `keepsBaseline` false for a lexically
in-repo prose file; `save` on a flagged tab, clean, sends nothing through a fake bridge (`fs.writeGuarded`,
`fs.writeFile`, `machines.putFile` all uncalled) and raises no toast; the flag at creation only (first open flagged then
an unflagged open of the same file stays read only; first open unflagged then a flagged open stays editable); the press
refuses with the read-only sentence and no bridge call, driven through the rendered `RedlineDocument` in the shape
`p227-redline-journal.test.tsx` uses or through a pure helper the builder extracts; the band's words in the panel.

## 7. The menus (the phase brief says this)

- **The application menu bar** (`src/main/menu.ts`): unchanged. No accelerator moves.
- **The Explorer's right-click menu** (native through `ui:popupMenu`, composed by `buildTreeMenu`): on a row under a
  link, New File…, New Folder…, Rename…, Duplicate, Move to Trash and History are absent and one disabled line ends the
  menu, `Read only through a link`, the only footnote on that row on either computer; on a link row, every item stays
  but Open and Open in New Tab (D24): Open With and History act on the link itself, as today, and New File… and New
  Folder… land in the folder holding the link, as today. Move to Trash's confirm (a DOM dialog, not a menu) adds D10's
  sentence over a link.
- **The editor's right-click menu** on a tab opened through a link: Save and the reshape rows are absent, by the rule
  that already removes them from a read-only tab (`editor-menu.ts:225-231`).
- Not menus, named for completeness: the Explorer header's New File and New Folder aim per D7; F2, ⌫ and Delete do
  nothing on a row under a link.

## 8. Words

| Where | Words |
| --- | --- |
| Explorer menu footnote, row under a link | `Read only through a link` |
| Editor band, tab opened through a link | `Read only · opened through a link` |
| Move to Trash confirm, one link among the targets | today's body, then ` Only the link moves, and what it points to stays.` |
| Move to Trash confirm, two or more links | today's body, then ` Only the links move, and what they point to stays.` |
| Row decoration tooltip | `Link` |
| Redline press refused | the existing `readOnly` sentences, unchanged |

No tmux word, no sentence explains that a machine is remote, and nothing names Settings.

## 9. Gates and tools (builder D)

### 9.1 `conformance:machines` condition 51 (`build/conformance-machines.mjs:4540-4575`, data `build/machines-conformance-probe.mts:4049-4061`)

The probe's `treeList` row gains `followsRootLinkOnly`: the text holds `if [ -L "$p" ]; then h=-H; fi` once, `h=-H`
appears exactly once, both walks read `find $h "$p"`, no `find` is followed by `-L` before its path, and `-follow` does
not appear. Condition 51 fails with one sentence when it is false: a walk that follows links follows every loop to the
depth cap, and one that follows a link below its root lists folders outside the one asked about. The header paragraph
says PHASE 343 WIDENED 51 in the house shape. One-clause ablations, each red on 51: `h=-H` made unconditional; `-H`
written `-L`; `-follow` added to the first walk; the second walk losing `$h`.

### 9.2 `ablation:p343` (`build/p343/ablation.mjs`)

The `ablation:p340` shape (`build/p340/ablation.mjs`): one clause at a time broken in the SHIPPING source of a `cp -Rc`
clone of `src/`, `build/` and `resources/` under `/private/tmp` (node_modules symlinked), each required to turn its OWNER
red (a named vitest case or condition 51), plus one control arm that edits a comment and must stay green; the worktree's
bytes are asserted unmoved by sha256 and the clone is removed in a `finally`; `--list` prints the arms and runs nothing.
At least one arm per rule:

| Owner | Arms (one clause each) |
| --- | --- |
| `p343-link-target` | all links statted at once; no wait; the stranded gate removed; a path in flight statted twice; a gave-up stat started anyway; `entriesOf` writing `kind: 'dir'` for a link |
| `p343-tree-list-links`, `p903-b-tree-list` | the `//` mark printed as `/`; `entryOfLine` reading `/` before `//` |
| condition 51 | §9.1's four |
| tree tests | `isUnderLink` answering false; a link above the root counted; `outsideLinks` taking the innermost link; `importTargetFor` aiming into a link; a second door removed (duplicate, newEntry, trash, drop, importPaths, startRename, onRenameCommitted, one arm each); the kind taken from main in trash, move and duplicate; History kept under a link; the footnote beside the machine note; the D10 sentence missing |
| ignored, decorations | a link asked in folder spelling; a path under a link asked on the revalidation arm; a hit left in leaf spelling; `treeGitLane` not keying a link |
| remote plan and store | a link given `[]`; 7.7 removed; `mergeRemoteGroups` not keeping link keys; a non-root `denied` setting `remote.status`; the count raised to 99; Refresh not walking links; the after-root walk removed; D4's carry removed |
| editor | the flag removed from each of the six places (six arms); the flag applied on landing on an open tab |
| hooks, `p343-link-hooks` (the fix round) | the attack's seven: FileTree's open sending no `throughLink`, `canDrag`, `canDrop`, `canRename`, the menu asking the clicked row and not the selection, the drag start's third door, the link row's New File aimed into the link; and the fix round's own: the link row losing Open With and History, History aimed at the folder spelling, a Finder drop over the link row refused, a tree move over it carried nowhere, the drop's folder read without the chain row's segment, `besideLinkDrop` without the self rule, the folder folded into a chain row ringed as the whole box |
| far root (the fix round) | the root of a far walk trimmed again (a name ending in a space opens empty) |
| the narrow fix, `p343-links` and `p343-link-hooks` | `besideLinkDrop` not asking a file row under a link; the drop, and then the dragover, handing it no row; a link row at the project root drawing no ring (the reverify's r5) |
| the folded-row fix, `p343-links` and `p343-link-hooks` | `linkAimOf` not reading the area off every segment as the link row, or reading a point on a segment as it; `importRowFor` handing on the row, reading a file row, or aiming a row no link touches; `chainFromEvent` reading no segments; the move's drop, its dragover and the Finder dragover each reading the library's folder alone; a refused dragover leaving the root's ring or the row's ring lit (the reverify's rv-x3 and rv-x4) |

### 9.3 `probe:p343` (`build/p343/probe-p343.mjs`) and its fixture (`build/p343/fixture.mjs`)

`fixture.mjs` exports `makeLinkFixture(dir, { home })`, written in node (no shell): the entry's `make-fixture.sh` tree
(the issue's link, the eighteen hostile links, `src/linkIgnored`), the attack's additions (`.venv -> ../outside`,
`bazel-out -> ../outside/sub` both ignored, `node_modules/.pnpm/pkgb` with `node_modules/pkgb -> .pnpm/pkgb`,
`linkVarRoot -> /var/root`, `linkLocked -> ../locked` made `0300`, `linkGone -> ../gone`, `linkPipe -> pipe` over a
FIFO), `deep/a/b/c/d.txt` (R0), ten links `ten/l0 … ten/l9` to ten small folders (R4), an UNTRACKED `newLink -> src`,
`linkHome` pointing at a stand-in home with `.ssh/id_standin` under the probe's scratch HOME, a second project for
`linkOther`; committed with `git -c user.name=t -c user.email=t@t` under a scratch HOME with `GIT_CONFIG_NOSYSTEM=1` and
`GIT_CONFIG_GLOBAL=/dev/null`. Registered by the integrator, the `probe:p341` shape:

```
"probe:p343": "node build/harness-socket.mjs --fresh gmux-p343 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; export SCRATCH_MACHINE_QUIET_SHELL=1; export SCRATCH_MACHINE_SCRATCH_HOME=1; node build/with-scratch-machine.mjs -- node build/p343/probe-p343.mjs'",
"ablation:p343": "node build/p343/ablation.mjs"
```

classified in `build/verification-checks.mjs` as `remote('probe:p343')` and `pure('ablation:p343', NEEDS.vitest)`.
Knobs: `P343_PARENT_CHECKOUT` (a BUILT parent, run first), `P343_ARMS`, `P343_KEEP=1`, `P343_OUT_DIR`. Exit 0 every arm
passed, 1 one failed, 2 could not run or an arm was UNREADABLE (never a pass). Its header says what it drives, refuses
and needs, in the house shape. `node build/p343/probe-p343.mjs --grader-self-test` (NEVER through `npm run`, which hands
the flag to `harness-socket.mjs` and starts the app, Phase 336's lesson) grades `build/p343/fixtures/` (an honest HEAD
record, an honest parent record) and mutations made in code, and starts NOTHING; every grade clause must read red on its
own break: a row under a link offering Rename, a footnote missing or doubled, a write landing (a census sha256 moved), a
real file's inode moved by a ⌘S, a baseline record under a link, dimming lost after the revalidation, the Explorer
replaced by a refusal in R3, eleven far walks in flight, R0 at the parent showing the files (the "7.7 refuted" verdict),
a dotfile moved, an Electron left.

How it drives, using techniques this repository already ships and adding NO product harness drive: rows, kinds, marks,
dimming and git marks are read from the tree's shadow DOM (`data-item-path`, `data-item-type`, the decoration section,
`data-item-git-status`); keys and text through CDP `Input.dispatchKeyEvent` / `Input.insertText`; drags through
`Input.dispatchDragEvent` (`build/probe-p237-attack.mjs`), a Finder drop with `data.files`; the native menu read AS MAIN
BUILT IT with `--inspect`, `Menu.prototype.popup` recorded and nothing opened, and an item pressed by calling its own
`click` there (`build/p320/probe-p320.mjs`, arm R5); what the renderer asked main through logpoints in the shipped
chunks where needed (`build/p341/probe-p341.mjs`). The machine is added, confirmed and prepared, and the far project
opened, as `probe:p341` does.

### 9.4 Tools touched beside the probe

`build/assert-electron-teardown.mjs`: `HELPER_USER_FLOOR` 169 → 170 (`:457`) and its sentence (obligation 1).
`build/background-fixtures.mjs` / `build/known-hosts-fixtures.mjs`: only if a new shape walks past either gate.

## 10. The proof, run rather than read (verifiers only, under the lock; the parent `ae8767c2` then HEAD, one Electron at a time)

One launch per build through `build/electron-run.mjs`'s `withElectron`, ended in its `finally`, each on its own scratch
profile, a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset and the socket `gmux-p343-<pid>`,
inside `build/with-scratch-machine.mjs` with `SCRATCH_MACHINE_QUIET_SHELL=1` and `SCRATCH_MACHINE_SCRATCH_HOME=1`;
`build/hidden-agents.mjs`'s overlay written before each launch and `agents:list` read back before any arm; no model turn,
no agent. Local fixture `<harness>/p343/local`, far fixture `<harness>/p343/far`, removed in the `finally` unless
`P343_KEEP=1`. His `~/.zsh_history`, `~/.bash_history` and `~/.zshrc` size and modified time read before and after; a
move fails the run. Electrons counted ONCE, at the end, by CLAUDE.md's command. Never `-L gmux`.

| Arm | Drives | Graded at HEAD (the parent's reading printed beside it) |
| --- | --- | --- |
| L1 | the issue's shape; `.claude` holds only the link | one chain row `.claude/skills` with `⤷`, a folder; opens to `a-skill/` and `notes.md`; `notes.md` opens with the band |
| L2 | every fixture link row | each row's drawn kind and mark equal the probe's OWN `lstat`/`stat` reading (folder iff stat says folder; FIFO inert; every link marked): the verifier's re-derivation |
| L3 | the doors, on a row under `.claude/skills`, a row under `linkOut`, and the link row: each menu as main built it; F2; ⌫; Delete; a drag in the tree onto `src/`; a drag start toward a terminal and toward Finder; a Finder drop onto a row under the link and onto the link row; header New File and New Folder with a row under the link selected and with the link row selected (a name typed, Return); New File… pressed from the link row's own menu; Duplicate pressed on the link row; `linkIn/index.ts` typed into in Monaco then ⌘S; a CLEAN ⌘S on `.claude/skills/notes.md` and on `linkOut/secret.txt`; `notes.md` in Redline after a `/bin/sh` appended a line to `.agent/skills/notes.md`: typed into, then ⌥⌫ on the change; a wait past auto save's delay with auto save on (the setting written as `probe:p268` writes it) | D9's items exactly; no inline editor, no dialog, no drag session, nothing dropped; creates land in `.claude/` (the probe lists `.claude/` and `.agent/skills/`); the duplicate draws `skills copy` as a folder with `⤷`; no tab dirty; Redline toasts `notes.md is read-only, so it cannot be rewound.`; no toast on either ⌘S; the inode and modified time of `.agent/skills/notes.md`, `src/index.ts` and `outside/secret.txt` unmoved by any ⌘S; the census below |
| L4 | Move to Trash on the link row | the confirm's body ends with D10's sentence; Cancel pressed (D21); the link and its target unchanged |
| L5 | dimming after a revalidation: `.claude/skills`, `src/linkIgnored`, `node_modules/` and `node_modules/pkgb` opened; a file written in the project; a wait past `INVALIDATE_MIN_MS` (`ignored.ts:88`, 10 s) and the watcher's debounce; then `fresh.log` created as the witness and awaited dimmed (bounded 30 s) | `node_modules/`, `ignored.log`, `.venv`, `bazel-out`, `node_modules/pkgb` and its rows, and `fresh.log` dimmed; `newLink` carries the untracked mark on its row; rows under `.claude/skills` undimmed. Read straight after the expand this passes with D13 absent (A4), which is why it waits |
| L6 | a `/bin/sh` writes into `.agent/skills` and one into `outside/`, each ended in a `finally` | the first row shows under `.claude/skills` with no Refresh; the second under `linkOut` only after Refresh |
| L7 | a click on `linkPipe` | returns at once, opens no tab |
| C1 | `.claude/skills/a-skill/SKILL.md` opened from Context, one character typed, ⌘S | saves through the link at BOTH builds (D1's control); its bytes excluded from the census |
| R0 | far `deep/a/b` (the walk's last level) expanded | parent: empty and NO far walk of `deep/a/b` → 7.7 stays; if the parent shows `c/`, the run prints `7.7 REFUTED` and exits 1 at HEAD. HEAD: `c/` shown after one far walk |
| R1 | the far fixture | L1's and L2's rows and marks; `.claude/skills` opens and keeps its rows across Refresh; R's menu under the link ends with the link footnote and no machine note; `notes.md` there opens read only with the band; a clean ⌘S sends no far write (far inode and modified time unmoved) |
| R2 | far `linkFsRoot` opened once | rows under it inside the 20 s deadline (`REMOTE_TREE_TIMEOUT_MS`); the Explorer's line is still the root's (no "showing 4,000 of …") |
| R3 | far `linkVarRoot`, `linkLocked`, and `linkGone` after its target is removed, each expanded; then the tab closed and reopened | the Explorer keeps its rows every time and never draws a refusal; parent printed |
| R4 | the ten `ten/l*` links expanded, then Refresh; then the tab closed and reopened (restored expansion) | the far side's own count (D22) never exceeds ten walks in flight; parent printed |
| RUN | the whole run at HEAD | the sha256 of every file under both fixtures, the stand-in home and the second project equal before and after, except the paths the probe itself wrote (L3's creates and duplicate, L6, L5's writes, C1), listed by name; no file under the profile's `gmux/baselines/` names a relPath at or under a link row (`.claude/skills/`, `linkIn/`, `linkOut/`, `linkHome/`, `linkFsRoot/`, `up/`, `loopRoot/`) |

**Also, verifiers:** `npm run typecheck && npm run build && npm run smoke:t1`, `npm test`, `npm run smoke`, `npm run smoke:t3`; `conformance:machines`, `conformance:save`, `conformance:redline` (floor unchanged unless a builder added a
`redline*`/`Redline*`/`baseline*` file), `conformance:redline-write`, `conformance:containment` (must read as at the
parent: `paths.ts` is the safety claim and is not touched); `ablation:p343` (every arm red on its owner, the control
green); `probe:p336` at HEAD with `P336_ARMS` leaving out H5 (no parent manifest), because `tab-readonly.ts` is its path;
`probe:p268` at HEAD, because the `markDirty` seam is its path. NOT run: `smoke:remote`, `smoke:machines`.

**The removal rule.** A row worse than the parent removes the part that owns it: the band or a menu rule back to today;
a far rule back to today's text; 7.7 dropped when R0 refutes it. A second needs_work on one problem goes to him.

## 11. Builders, disjoint files

- **builder-a-main** (writes §4.1 FIRST): `src/shared/types.ts` (the `FsDirEntry` block only),
  `src/shared/ipc/machines/filesystem.ts`, `src/main/fs/link-target.ts` (new), `src/main/fs/ipc.ts` (`fs:readDir` only),
  `src/main/machines/remote-scripts.ts` (`TREE_LIST` and its header only), `src/main/machines/tree-list.ts`, §4.6's tests,
  and every existing test under `src/main` its changes break.
- **builder-b-tree**: every file in §5 and the tests it names.
- **builder-c-editor** (writes §6.1 FIRST): `src/renderer/state/open-file.ts`,
  `src/renderer/editor/{tab-types,store,tab-readonly,redline-edits,RedlineDocument,baseline-durable,tab-io,EditorPanel}`
  and §6.3's tests, plus every existing
  editor test its changes break.
- **builder-d-proof**: `build/conformance-machines.mjs` (condition 51 and its header only),
  `build/machines-conformance-probe.mts` (the `treeList` row only), `build/p343/*` except this file (fixture, probe, ablation, fixtures),
  `build/assert-electron-teardown.mjs`, `build/verification-checks.mjs`, and `build/{background,known-hosts}-fixtures.mjs`
  only if needed.
- **Integrator**: `CHANGELOG.md`, `CLAUDE.md`, `package.json` (the two scripts in §9.3), `docs/audits/contract-baseline.txt`
  (expected NOT to move: no channel, storage key, `GMUX_*` name, smoke mode or bundle refusal changes; 
  `node build/contract-inventory.mjs --check` runs inside `npm run build`, and if it moves the integrator regenerates and says
  which line and why); reconciles B against A's types and C's request field; runs the battery that launches no Electron
  (`npm run typecheck`, `npm run build`, `npm test`, every gate in §10 that starts no Electron, 
  `node build/p343/probe-p343.mjs --grader-self-test`, `npm run ablation:p343`); writes §As built.

Every builder and the integrator: no Electron; no `-L gmux`; no ssh; every shell a test starts with a scratch HOME and
ZDOTDIR, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`; every process started ended by pid in a `finally`; no commit,
stage or stash; `npm run -s typecheck` and its own vitest files, exits and counts reported. Builder A runs
`conformance:save`, `conformance:redline-write` and `conformance:containment`; builder C runs `conformance:save` and
`conformance:redline`; builder D runs `conformance:machines`, `npm run -s ablation:p343 -- --list`,
`node build/p343/probe-p343.mjs --grader-self-test`, `node build/assert-electron-teardown.mjs`,
`node build/assert-background-teardown.mjs` and `node build/assert-hermetic-checks.mjs`. NEVER touch a file under
`/private/tmp/wt-p3371` or a file Phase 337.1 owns (§16).

## 12. The verifier's brief (Tier 2)

The gates, ONE app run per build (§10, parent first), and at least one independent method, named in the verdict:
1. **Attack** (the phase's method), driven through the doors a person has, with shapes of the verifier's OWN beyond
   the fixture: a link swapped from an in-project target to `/` while its folder is open; a link replaced by a real
   folder of the same name, and a real folder replaced by a link while a file under it is open (that tab stays as it was
   opened, which is today's behaviour, D11); a link whose name holds a newline; a chain of forty links; a folder of four
   links into a FIFO-backed stand-in for a dead mount if the verifier can build one without installing anything (a stat
   cannot be made to hang without a mount; S4's open stands in); remote and local each.
2. **Re-derive**: L2's kinds and marks from the verifier's own `lstat`/`stat`, and R4's count from the far log by a
   reader of its own.
3. **The parent measured** in every arm; R0 decides 7.7.
4. The main-side driver the entry described (every write through the SHIPPING `createFileOps`, `writeGuarded` and the
   far `file-put`, `dir-new`, `entry-rename` under `/bin/sh` and `/bin/dash`, each answer equal to the parent's) as the
   check that no write rule moved; it cannot see a renderer door, so it is not the attack.
Report once, at the end, the Electrons, tmux servers, sshd, agents and far directories left.

## 13. The changelog, CLAUDE.md and the commit

**CHANGELOG** (integrator), `## Unreleased` → `### Added`, one line; the commit link is added by the follow-up docs
commit after the last word, as the house rule says:

`- A link to a folder now shows in the Explorer as a folder marked as a link and opens to show what is inside, on your Mac and on another machine; a file you open from the Explorer through a link is read only, and a linked folder outside the project updates when you press Refresh. A folder three levels down in a project on another machine also opens to show its files now, where it opened empty. Reported by [John Berryman](https://github.com/JnBrymn) in [#36](https://github.com/gregce/tortie/issues/36)`

If R0 refutes 7.7, the second sentence goes with it. `Reported by`, never `Contributed by` (precedents in the
`## Unreleased` entries for issues 31 and 35).

**CLAUDE.md** (integrator): the `conformance:machines` row's proof column gains one sentence: "Since Phase 343
condition 51 also holds that `tree-list` hands `find` `-H` only when the folder asked about is itself a link and never
`-L` or `-follow`, so a walk never follows a link below its root; `ablation:p343` is the attack beside it." The probes
table gains a `probe:p343` row: when `src/main/fs/link-target.ts`, `fs:readDir` in `src/main/fs/ipc.ts`, the link rules
in `src/renderer/tree/{tree-paths,tree-ops,tree-menu,use-tree-model,ignored,decorations,store,remote-plan}.ts`,
`TREE_LIST` in `src/main/machines/remote-scripts.ts`, or the `throughLink` reasons in the editor; cost "about N minutes
for both builds" as the verifier measures it; the shape of §10 in one paragraph. No Touching column changes (every path
is already under a row or under none).

**Commit body** carries: the measurements (S1 to S4, P1, and the re-runs); the six places, saying the sixth is new; the
D3 bound and its precedent; the floor 169 → 170 and the probe it counts; what R0 found at the parent; `Reported by John
Berryman (JnBrymn) in issue 36.`; that a Linux far side is unmeasured. Conventional subject, the phase label on the first
body line, NO trailers of any kind.

## 14. What is NOT in this phase

- **No write through a link from the Explorer, on either computer**, to an in-project target either, although main would
  admit it (ruling 2; Phase 343.1).
- **No change to Context, a link inside a document or any other opener**; a file they open by a link's spelling opens
  and saves as today.
- **No change to any write rule**: `paths.ts`, `file-ops.ts`, `guarded-write.ts`, `save-write.ts`, the save doors in
  `tab-io.ts` (one silent refusal is added ABOVE them, D11), main's baseline store, and the far `noLinkWalk`, `file-put`,
  `dir-new` and `entry-rename`, byte for byte.
- **No change to a link to a FILE**: it opens, and ⌘S writes through it by Phase 240's plain door (ruling 3).
- **No search, Quick Open, Catch Me Up, Architecture or Context through a link**; ripgrep keeps not following links.
- **No git status, dimming or history for rows under a link that is not ignored**, because git does not look past one.
- **No watch on a link's target outside the project or in a folder the watcher leaves out**; Refresh re-reads it.
- **No announcement of a capped link walk** (D17): a link to `/` on another machine shows its first 4,000 entries
  without the "showing" line, which stays the root's.
- **No bound on the readdir of a folder reached through a link** (a stated limit, the attack's): D3 bounds the link STATS
  only, so a folder opened through a link into a network mount that has stopped answering is listed by a readdir nothing
  bounds, holding one of main's file threads, exactly as a project that lives on such a mount does today. 343 extends the
  reach to mounts outside the project; it cannot be driven here without mounting something, which nobody may install.
- **A far link that is not a folder stays a clickable leaf** (D16); a local link to a FIFO is inert.
- **No new depth for a far walk, and no single far call carrying several roots.**
- **No change to Open Folder or Add a Project's folder pickers** (`src/main/machines/dir-list.ts`, the local picker).
- **No Linux far side measured, no BusyBox `find`.** The far change is POSIX `find -H` and `test -L`, measured under
  macOS's `/bin/sh` and `/bin/dash`; Phase 342's Linux matrix should add one linked-folder row (ruling 4).
- **The tree-list `.git` prune is by name**: a link that points at a `.git` folder, expanded by hand, is walked and
  listed read only, locally and far (§4.4).
- **No probe empties his Trash** (D21).
- **No release of its own.**

## 15. What the entry got wrong, or left open

1. **Five places were six** (S2): ⌘S on a clean tab writes through the link, so `saveOnce` refuses (D11).
2. **The bound on mechanism 1 was unspecified, and "no second stat of the same link" alone is not a bound** (S4: four
   different stale links stop every file request in main). D3 takes `health.ts`'s answer: one lane, 250 ms, one
   stranded stat closes the gate.
3. **An unanswered stat would collapse an open linked folder** on the next slow listing; D4 carries the last kind.
4. **7.5 counted link reads only**; with 7.7 every depth-3 folder is a walk and the restore effect starts them all at
   once, so the count covers every non-root walk (D18).
5. **7.5's "at once" Refresh misses a real folder replaced by a link** (D16 keeps that key), so a second pass walks what
   the root's answer newly names (D19).
6. **§Menus removed New File… and New Folder… from the link row**, a gesture that works today; they stay, aimed where
   they land today and where the header lands (D7).
7. **L4 trashed for real**, which writes into his own `~/.Trash`; it reads and cancels (D21), the `probe:p154` precedent.
8. **7.1's gate clause "never names `-L`"** cannot be literal: the text names `[ -L ]` twice. The clause is about
   `find`'s options (§9.1).
9. **Property 6 of the far header** ("a repository's internals never cross") is not true of a link to a `.git` folder
   expanded by hand; stated in the header and §14.
10. **R4's count** needed a method; D22 is the far side's own.
11. **The far mark for "any other link"** needed a meaning in the renderer: a far `leaf` link is today's leaf with no
    field (D16), never `other`, because `other` is inert and a far link to a file opens today.
12. **(the fix round) This spec's own D9 and §0 were wrong about the link row.** D9 said it kept every item it had, and
    as built it lost Open With and History, both working today; §0 named the refused drop over it "the one gesture that
    changes", and it was worse than today. Both were rewritten to today's behaviour (D24, D25).

## 16. Beside Phase 337.1

337.1 is built in `/private/tmp/wt-p3371` and touches, of the files this phase also touches, `CHANGELOG.md`,
`CLAUDE.md` and `build/conformance-machines.mjs` (its hunks are at `:439` and from `:11765`; condition 51 is at
`:4540`). It may also raise `HELPER_USER_FLOOR` and add `package.json` and `build/verification-checks.mjs` lines. At
landing, whichever phase lands second merges onto the first: the floor is the count of both phases' new Electron
scripts, both changelog lines stand under `## Unreleased`, and both CLAUDE.md sentences stand. No builder here edits a
file under that worktree.

## §As built (the integrator, 2026-10-07)

Four builders wrote disjoint halves in `/private/tmp/wt-p343` over `ae8767c2`; the integrator reconciled the seams, added
the two scripts, wrote the CHANGELOG item and the CLAUDE.md rows, made one product change of its own (I1 below), ran the
battery that starts no Electron, and wrote this section. Nothing is committed, staged or stashed, and `git diff ae8767c2`
is this phase's delta alone: 45 tracked files changed (1,456 insertions, 246 deletions) and 14 new files, this spec
among them. `probe:p343` has NEVER RUN: builders and the integrator launch no Electron, so every claim in
§10, R0 above all, is the verifier's to read. Where this section departs from the sections above, it is what the tree
holds and says why.

### What each builder built, and where it departs from the spec

**Builder A, main and the far side (§4).** §4.1's types first (`FsLinkTarget`, `FsDirEntry.link?`,
`RemoteTreeEntry.link?`, the two false comments corrected); `src/main/fs/link-target.ts` (new: `createLinkTargets`,
`entriesOf`, `targetOf`, `LINK_STAT_WAIT_MS = 250`, `LINK_STAT_LANES = 1`, one production instance over `stat`; no
`realpath`, `lstat`, `paths.ts` or electron); `fs:readDir` alone in `src/main/fs/ipc.ts`, `entryKind` unchanged;
`TREE_LIST` whose text, dumped through tsx, is IDENTICAL to §4.4, with the header's eighth property, property 6's clause
and the marks paragraph; `entryOfLine` reading `///`, `//`, `/` in that order. Departures:
1. `entriesOf(abs, {name, kind}[], links)` takes name and kind pairs rather than dirents, because `entryKind` stays in
   `ipc.ts` (which imports electron) and the handler classifies first.
2. A queued stat that another listing still waiting also asked for is KEPT when one listing gives up; a listing already
   waiting when another strands a stat waits out its own 250 ms. While a stat is stranded the one lane is full, so no
   queued stat can start until it returns.
3. `p343-tree-list-links.test.ts` also reads the text (`h=-H` once, both walks `find $h "$p"`, no `find … -L`, no
   `-follow`, two `2>/dev/null`), overlapping condition 51 on purpose so its ablation arms have a vitest owner too.

**Builder B, the Explorer (§5).** Every file §5 names. Departures, each B's own:
1. `TreeOpsContext.links?()` and `TreeMenuTarget.underLink?` are OPTIONAL (absent reads as no link rows and false), so
   six tree-ops test rigs and `p153-menu-glyphs.test.ts`, outside B's list, still compile; the one production caller
   (`use-tree-rename.ts`) always passes `links`, and `use-tree-rename` reads `linksRef?.current` because
   `p341-create-across-push` mounts it with no ref.
2. ⌫ over a mixed selection trashes the rows not under a link and drops the rest, as `.git` rows are dropped; the menu
   for such a selection has no Move to Trash at all (D9).
3. `treeInputOf` (in `tree-paths.ts`) builds the tree's input, `inert` and `links` from the listing, so it is tested
   without a tree; `treeRowDecoration` and `LINK_MARK` (U+2937) are in `decorations.ts`; `canonicalAnswer` keys git's
   leaf spelling back onto the folder spelling.
4. D18 is `REMOTE_EXTRA_READS = 9`, first come first served, NO timer; a waiting lazy load covered since is dropped;
   `setRoot` resolves every waiter `false` at once.

**Builder C, the editor (§6).** `throughLink?: true` on `OpenFileRequest` and `EditorTab`; the store copies it only when
it CREATES a tab; the six places (`tabIsReadOnly`'s first `if`, `markDirty`'s list, `redlineTypable`, the Redline press
through a new exported pure helper `pressRefusedUpFront(tab)` asked before `pressedElement` and `pressRedline`,
`keepsBaseline` with the field in `BaselineTab`'s `Pick`, and `saveOnce`'s silent `return false` before the remote
branch); the band `Read only · opened through a link`, first after `deleted`, `ed-banner-readonly` and the lock. No file
named `redline*`, `Redline*` or `baseline*` was added, so `conformance:redline` rule 9 still counts 24 against 24.
A STATED CONSEQUENCE of "creation only" (D11), not a departure: a link inside a document or a terminal path link to the
same spelling shares the Explorer's tab id, so whichever opener CREATED the tab decides; a tab the Explorer opened through
a link stays read only when a document link lands on it, and one a document link opened first stays editable when the
Explorer lands on it. Context opens use their own ids and never collide.

**Builder D, the proof (§9).** Condition 51's clause (`followsRootLinkOnly` plus `linkWalkFaults`, the failure line
beginning `condition 51:`), `HELPER_USER_FLOOR` 169 → 170, the two classifications, `fixture.mjs`, `probe-p343.mjs`
(2,028 lines), `ablation.mjs`, and two HAND-WRITTEN grader records. Departures:
1. Condition 51 also requires the `h=` line BEFORE the `if [ -L ]` test, so `$h` can never carry a value the far
   environment set; its own arm, `a-c51e` (five arms on 51, not §9.1's four).
2. Each build gets FRESH fixtures at `<harness>/p343/<build>/{local,far}` rather than one shared pair (§10), because the
   parent's arms write and HEAD must not meet them; the stand-in homes live under each build's scratch HOME.
3. The RUN baseline clause sets C1's own path aside by name (Context keeps today's behaviour, D1, and may record a
   baseline there).
4. A census folder entry means its listing, never its subtree, except `far:gone/**`, the folder R3 deletes.
5. No product harness drive: the probe uses the Phase 95 and Phase 268 drives, the shadow DOM and CDP input.
6. Arms that would otherwise pass vacuously read UNREADABLE when their control fails (F2 and ⌫ on `README.md` must open
   the rename box and the confirm, a drag of `README.md` must be intercepted, a Finder drop onto `src/` must land, the
   far root's walk must appear in the find log, Context must list `a-skill`).

### What the integrator changed

**I1. Quick Open's recents never record a through-link open** (`src/renderer/quickopen/recents.ts`, one `return` beside
the `commit` refusal, and one case in `src/renderer/quickopen/__tests__/p903-c-roots.test.ts`). Found while tracing the
`throughLink` field from `openRel` to the editor: the open-file bus has a second subscriber, `startRecordingRecents`,
which keyed every tree open into the palette's recents by `(root, relPath)`. A file the Explorer opened read only through
a link would then come back from Quick Open's empty query as a PLAIN open, editable, saving through an in-project link and
raising the `outside` sentence through one that leaves the project, one step past ruling 2 and the S2 finding. Before
this phase the Explorer could not open such a file, so the palette never held one: leaving it out is exactly today's
palette, which is the "no scenario worse than today" choice. Proved both ways: the case is green, and the line removed
turns exactly that case red (1 failed, 10 passed). It is `ablation:p343`'s arm `a-ed8`, owned by that case;
`EDITOR_TESTS` gains the palette suite and the self-test's editor count is 8. Context, a document link and a terminal
path link are untouched (D1); only the palette's memory of an Explorer open is.

**I2. `src/renderer/tree/__tests__/p230-remote-decorations.test.ts:133`**: `treeGitLane(files, [])` becomes
`treeGitLane(files, [], new Set())`, the third argument D13 makes required. The one compile error in the tree after the
builders, outside B's list.

**I3. `package.json`**: `probe:p343` (after `probe:p340:script`) and `ablation:p343` (after `ablation:p340`), exactly
§9.3's text.

**I4. `build/verification-checks.mjs`**: the `ablation:p343` comment names Quick Open's recents beside the six places.
Comment only.

**I5. CHANGELOG.md**: §13's line verbatim, last under `## Unreleased` → `### Added`, `Reported by`, no commit link (the
follow-up docs commit adds it). If R0 refutes 7.7, its second sentence goes.

**I6. CLAUDE.md**: the `conformance:machines` row's proof gains §13's sentence after Phase 337's; the probes table gains
`probe:p343` after `probe:p340:script`, its Touching column the paths §13 names (the six editor places spelled out), its
cost `not yet measured` for the verifier to fill. No Touching column of the gates table changes.

**I7. The contract baseline does NOT move**: `node build/contract-inventory.mjs --check` reads byte for byte, inside
`npm run build` and alone (no channel, storage key, `GMUX_*` name, smoke mode or bundle refusal changed).

### The seams, checked

- B's `openRel` sets `throughLink: true` only for `isUnderLink(rel, treeInput.links)`; the request reaches the store
  unchanged through `requestOpenFile` → `onOpenFile` → `openFromRequest(req)`; C's store copies it at creation alone. The
  Explorer's other `requestOpenFile` calls (`tree-ops.ts:439`, `:801`) open a file just created, which D7's doors keep out
  of every link, so they carry no flag. Every menu Open and Open in New Tab goes through `openRel`.
- B's `remote-plan.ts` and store read A's `RemoteTreeEntry.link` and `FsDirEntry.link`; `groupRemoteEntries` is given
  `REMOTE_TREE_DEPTH` at its one production call.
- D's ablation shapes were re-checked against the final tree: `--self-test` 16 of 16, every shape present once, every
  owner a real case title.

### The battery (integrator, no Electron, every command under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`)

The machine's load average read 51.72 (1 min) and 150.42 (5 min) when the battery began; memory 52 percent free.

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | import boundaries 1,420 files, 0 violations; 0 runtime cycles; shared types OK |
| `npm run -s build` | 0 | 35 s; inside it `gate:electron` 170 against a floor of 170, `gate:background` 3 starts each ended in a `finally`, `gate:simulator`, `gate:knownhosts`, `gate:checks` 263 classified, `conformance:ios`, `conformance:harnessprobes`, and the contract byte for byte |
| `npm test` | 0 | 1,113 files passed, 2 skipped; 20,426 tests passed, 14 skipped; 70.5 s |
| `npm run package` (`CSC_IDENTITY_AUTO_DISCOVERY=false`, so no keychain is read and the app is unsigned) | 0 | 80 s; `release/` removed after |
| `conformance:machines` | 0 | 30 s; `tree-list read 3 851 all quoted` |
| `conformance:save` | 0 | every rule, 0 to 27c |
| `conformance:redline` | 0 | 33 s; rule 9, 24 files against a floor of 24 |
| `conformance:redline-write` | 0 | 20 s; 30 readings, 17 of 17 ablations red |
| `conformance:containment` | 0 | 2 s; 52 readings, 10 of 10 ablations red (`paths.ts` untouched) |
| `conformance:samefolder` (its rule 23 walks `src/main/fs`, which gained `link-target.ts`) | 0 | 4 s; §8 on both kinds of volume, 9 of 9 ablations red; no image left attached |
| `conformance:pathdoors` | 1 | ONE finding, `src/main/pocket/ipc.ts names shell.open*`, and the SAME finding at the parent `ae8767c2` (run over a `git archive` of it, removed after): not this phase's, and no path this phase touches is under the gate |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background` (each alone) | 0 each | as inside the build |
| `node build/p343/probe-p343.mjs --grader-self-test` | 0 | 51 clauses, 111 checks, nothing started |
| `P343_FIXTURE_DIR=<scratch> node build/p343/fixture.mjs --self-test` | 0 | 37 links each read as its stat says, everything removed |
| `node build/p343/ablation.mjs --self-test` / `--list` | 0 / 0 | 16 of 16; 54 arms: main 8, machines 5, tree 32, editor 8, control 1 |
| `npm run -s ablation:p343` | 0 | 289.8 s; 54 arms, all 53 ablations newly red on the condition or case that owns it, the control green; every base green; every clone file restored by sha256, the worktree never written, the clone gone |

His `~/.zsh_history` read `733966 1791325581` and `~/.bash_history` `23166 1790702242` before the first command, around
every run above, and after the last; neither moved. `electron-builder` fetched its Electron zip and `dmgbuild` bundle into
the scratch HOME's cache, because that HOME had none; nothing was installed on the machine, and the scratch HOME was
removed at the end.

### What is still owed, and by whom

- **The app run** (§10, verifiers, under the lock, parent first): every L, C, R and RUN arm, and above all R0, which
  decides 7.7. If R0 shows `c/` at the parent, the fix round removes D20's change, its test and the changelog's second
  sentence, and this section records 7.7 as refuted.
- **The cost of `probe:p343`** in CLAUDE.md's probes table, measured by that run.
- **`probe:p336` (without H5) and `probe:p268` at HEAD**, §10's "Also" list, because `tab-readonly.ts` and the
  `markDirty` seam are their paths.
- **The attack** (§12), I1's palette door among the shapes to try: a file opened from the Explorer through a link, closed,
  then reopened from Quick Open's empty query must not appear there.
- **Pre-existing, not this phase's**: `conformance:pathdoors` is red at `ae8767c2` on `src/main/pocket/ipc.ts`'s
  `shell.openExternal`, which the gate's table of declared doors does not name.

### The fix round (2026-10-07, the fixer; it runs once)

Both verifiers answered `needs_work`: lens 1 (the attack, 13 ablations of its own and the parent measured beside HEAD)
with two minors and four nits, lens 2 (the app run, `probe:p343` at the parent and at HEAD plus five drives of its own)
with one major, two minors and two nits. R0 printed `7.7 STANDS` in the app and in lens 2's own drive and lens 1's unit
reading, so 7.7 stays. Every major and minor is fixed below; a part that was worse than today is put back to today, never
argued; each nit is fixed, stated, or left for a named later round with its reason. No Electron was launched, nothing was
committed, staged or stashed, and no file under `/Users/gdc/gmux` or `/private/tmp/wt-p3371` was touched.

**F1, the link row's menu (lens 1 minor 1, lens 2 minor 2; D9 rewritten, D24 new).** As built, a link to a folder drawn
as a folder lost every file-row item, and two of them worked at the parent: Open With (it handed the linked folder to
another app) and History (the link's own commits). `TreeMenuTarget.linkRow` (`src/renderer/tree/tree-menu.ts`) keeps both
on the link row, ahead of New File…, aimed at the LINK's spelling (`toRel`, so `.claude/skills`): main is asked Open With
about the same path the parent asked, and History opens the same tab. `use-tree-menu.ts` sets `linkRow` for a link folder
row with at most one row selected and asks Open With about the link's own spelling. Open and Open in New Tab are not kept:
at the parent they opened a tab reading "Could not open skills", and a click on the row now opens the folder; losing an
item that only produced an error is not a scenario worse than today. On another machine neither is offered, as a far link
(always a folder there) never had them. Open With and History are now built once (`openWithItem`, `historyItem`) for the
file row and the link row, so the two cannot drift. `probe:p343`'s `LINK_ROW_KEPT` is now every row the PARENT's link row
offered less Open and Open in New Tab, and its self-test holds that list against the review's parent record.

**F2, a drop over the link row (lens 2 minor 3; §0 rewritten, D25 new).** At the parent a drop from Finder or from the
tree over the link row landed in the folder holding it; as built both were refused, worse than today. From Finder,
`importTargetFor` (`tree-paths.ts`) now aims a link row as it aims a file row. From the tree, the library still refuses the
link row and moves nothing, and the host carries the move (`use-tree-drag.ts`): `besideLinkDrop` (`tree-paths.ts`)
answers the folder holding the link only when the folder under the pointer, read the library's own way by
`dropDirFromEvent` (`row-events.ts`, which mirrors `resolveDropTargetFromElement` in @pierre/trees: a chain row's segment,
then a folder row, then a file row's folder), is exactly a link row, so a drop the library accepted is never carried twice;
the drop event itself is read again, the library's self or descendant refusal is applied, and the move goes through the
root drop's own `ops.drop(…, false)`, which refuses again at or under a link. The ring is drawn on the destination; when
that folder is folded into a chain row (`.claude / skills`), `boxOfRow` now rings the chain row that shows it rather than
the whole box, which would say the root. One ordering changed beside it, stated: the host now asks whether the drop is
over a row BEFORE it reads the root arm, so a drop over a row is never carried as an empty-space root drop even when the
last dragover was over the empty space (before, that drop would have reached both the library's move and the root's).

**F3, the wiring had no owner (lens 1 minor 2).** New `src/renderer/tree/__tests__/p343-link-hooks.test.ts` runs the
SHIPPING `useTreeModel`, `FileTree`, `useTreeMenu` and `useTreeDrag` once each under a stand-in React whose hooks are the
identity (the attack's method), the four stores stood in by their values, @pierre/trees' model hook recording its options,
and a fake `window.gmux`; it draws nothing, runs no effect and touches no disk. 20 cases: `canDrag`, `canDrop`,
`canRename` and the row mark (H1); FileTree's open gesture putting `throughLink` on exactly a file under a link, and none
on a link to a file or on the link's own spelling (H2); the composed menu, a selection holding a row under a link, New
File… and New Folder… on the link row landing in `.claude/`, Open With and History kept and aimed at the link, neither on
another machine (H3); a drag of a row under a link starting nothing with and without ⌥, a Finder drop over the link row
landing in `.claude/` and none under it, a move over the link row and over a root-level link landing beside it, the chain
row's link segment and its outer segment, every other row left to the library, the chain row's ring, and the same move on
another machine (H4). `ablation:p343` gains 15 arms in `TREE_TESTS` and `MAIN_TESTS`: the attack's seven with its own find
strings (`a-hk1` to `a-hk7`, its x1 to x6 and x10), the fix round's own (`a-hk8`, `a-hk9`, `a-dr1` to `a-dr5`) and `a-fr1`
below; `a-mn1`'s shape moved into `historyItem`, and `a-tp4` names the under-link refusal its line now owns.

**F4, the probe never closed the far tab (lens 2 major).** `closeAndReopen` (`build/p343/probe-p343.mjs`) clicked the tab's
close and never answered `Close 'proj'?` (`projects-slice.ts` `closeProject`), so the tab never closed, R3's and R4's
reopen tested nothing, and the confirm left up ate R4's first click (`ten/l0` never walked, the run's one FAIL). It now
presses ONLY that confirm's own `Close project` and only under a `Close '…'?` title (a new page-kit reader,
`confirmClose`), cancels anything else, requires the tab count to drop (`tabCount`), cancels an editor tab's Save prompt
if one holds the close, and a close that did not happen reads UNREADABLE. R4 also refuses to start with a confirm up, and
reads the far log in three windows (`parseFindLog` gained an end line): the clicks walk the ten, Refresh walks the ten,
the reopened tab walks the ten, and never more than ten at once. R3 and R4 gained the clause "the far tab was really
closed before it reopened", R4 "Refresh walked the ten links again" and "the reopened tab walked the ten links again", each
with its break and a refusal of the first run's own shape. L3's link-row drop now has its own file name and is graded on
WHERE it landed (`.claude/` at both builds, by the census). The four grader records gained those fields (the review's
head record lists them in `handWritten`, with a `fixRound` note).

**F5, the far root was trimmed (lens 1 nit 3).** `parseTreeList` (`src/main/machines/tree-list.ts`) trimmed the root, so a
far folder or link whose name ends in a space dropped every line and opened empty while it listed on this Mac. The root is
now the rest of the line with only a carriage return taken off. Cases in `p903-b-tree-list.test.ts` and, under `/bin/sh`
and `/bin/dash` through the shipping text and parser, in `p343-tree-list-links.test.ts`; arm `a-fr1`.

**F6, the stated limit (lens 1 nit 5).** §14 now states that D3 bounds link stats only, so a folder opened through a link
into a mount that stopped answering is listed by an unbounded readdir, as a project on such a mount is today.

**Left, with the reason.** Lens 1 nit 4 (`git check-ignore` exits 128 on a pathspec-magic name and the batch answers
nothing) is reachable today through such a project-root name and is not this phase's; a later round can ask with literal
pathspecs or split the batch on 128. Lens 1 nit 6 (`build/scratch-machine.mjs`'s `isolated()` runs ssh without
`-F /dev/null` and the yard key) is shared tooling outside this phase's files and beside 337.1's runs; it is recorded for
the round that owns that helper. Lens 2 nit 4 (`probe:p336` without H5 and `probe:p268` at HEAD) is still owed: both read
`tmux -L gmux list-sessions`, which this round's briefs forbid, so they wait for the operator to allow that read-only count
or for a round that may run it. Lens 2 nit 5: CLAUDE.md's `probe:p343` row now carries the measured cost (717 s, the parent
450 s and HEAD 266 s, under a load average near 150, measured before F4) and the fix round's arms; it is re-measured by
the reverify.

**The fixer's commands** (every one under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID`; no
Electron, no tmux, no ssh, no agent, no token):

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` (three times) | 0 | 1,420 production files, 0 boundary violations, 0 runtime cycles |
| `npm run -s build` (twice) | 0 | 58 s and 31 s; `gate:electron` 170 against a floor of 170 (no new script reaches the helper), the contract byte for byte |
| `npm test` | 0, 1, 0 | 1,114 files and 20,457 tests passed, 14 skipped (the final run, 50 s); the middle run, under a load average near 180, failed 3 timing cases in `symbols/store.test.ts` and `p277-store-close-and-policy.test.ts`, files this round did not touch, which passed 23 of 23 alone three times out of three |
| `conformance:machines` (twice) | 0 | `tree-list read 3 851 all quoted` |
| `conformance:save`, `conformance:redline`, `conformance:redline-write`, `conformance:containment`, `conformance:samefolder` | 0 each | every rule; 24 against a floor of 24; 17 of 17; 10 of 10; 9 of 9, no image left attached |
| `conformance:pathdoors` | 1 | the same one finding the parent has (`src/main/pocket/ipc.ts`), not this phase's |
| `gate:contract`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | as inside the build |
| `node build/p343/probe-p343.mjs --grader-self-test` | 0 | 57 clauses, 196 checks, nothing started |
| `P343_FIXTURE_DIR=<scratch> node build/p343/fixture.mjs --self-test` | 0 | 37 links, everything removed |
| `node build/p343/ablation.mjs --self-test` / `--list` | 0 / 0 | 16 of 16; 69 arms: main 9, machines 5, tree 46, editor 8, control 1 |
| `npm run -s ablation:p343` | 0 | 208 s; 68 ablations each newly red on its owner, the control green, every clone file restored by sha256, the clone gone |

His `~/.zsh_history` read `733966 1791325581` and `~/.bash_history` `23166 1790702242` before the first command, around
every command above that started a shell, and after the last; neither moved.

**Owed to the reverify** (independent of this round, under the lock, parent first): `probe:p343` again, every arm, R3 and
R4 above all (the close made real) and L3's link row and drop; and, by its own drive, a MOVE dragged inside the tree over
the link row at both builds (the probe intercepts and cancels tree drags, so it does not carry one), with the ring's
rectangle read, over a plain link row and over the chain row `.claude / skills`, and on the loopback machine.

## §As built — 343's narrow fix (2026-10-07)

The reverify answered `needs_work` a second time, and the operator ruled: **"Narrow fix, then land"**. The fix runs once and
touches the reverify's three items and nothing else. No Electron was launched, nothing was committed, staged or stashed,
and no file under `/Users/gdc/gmux` was touched; every command ran with `/private/tmp/wt-p343` or the fixer's scratch as its
working directory.

**N1, the probe's link-row drop handed a file nothing wrote (tooling, major).** `build/p343/probe-p343.mjs` drops
`p343-dropped-link.txt` on the link row (L3, the fix round's own name) but wrote only `p343-dropped.txt` and
`p343-dropped-control.txt` into the build's `drops` folder, so the drop carried no file and L3 failed at both builds on a
correct product. The file is now written beside the other two. So that a drop can never again hand a name nothing wrote,
`unwrittenDrops(source)` (exported, pure) reads the probe's own code lines, every `await finderDrop(ctx, …,
join(ctx.drops, NAME))` against every `    writeFileSync(join(drops, NAME), …` by line start (so no string or comment is
counted), and the grader self-test holds it both ways: the shipping file answers `[]`, and the same file with the
link-row write removed answers `["p343-dropped-link.txt"]`. 196 checks became 198.

**N2, a move over a row under a link was carried beside the link (product, minor, introduced by F2).** As the fix round
left it, a tree move dropped over a FILE row directly inside a linked folder (`.claude2/skills/notes.md`) was carried to the
folder holding the link (`.claude2/i.md`) with `.claude2/` ringed, on this Mac and on another machine: `dropDirFromEvent`
reads a file row as its parent folder, as the library does, that folder is the link, and `besideLinkDrop` answered
`beside`. His ruled shape, built: everything under a link is read only, so a move dropped over ANY row under a link is
refused like the folder row's, with no ring drawn; a drop on the link row itself keeps landing beside it.
- `besideLinkDrop(dragged, dirUnderPointer, links, rowUnderPointer)` (`src/renderer/tree/tree-paths.ts`) gains a REQUIRED
  fourth parameter, the row under the pointer as `rowFromEvent` reads it, and refuses a FILE row under a link before
  anything else. A folder row or a chain segment under a link was already refused by the folder test, because the library
  aims a drop over one at that very folder. The file test is asked of a file row alone, deliberately: @pierre/trees folds
  a folder that holds exactly one folder into its parent's chain row (`path-store/src/flatten.js`), so once a link that
  holds one folder is opened, `.claude / skills / a-skill` is ONE row whose path is `.claude/skills/a-skill/`, under the
  link, while the pointer may be on the link's own segment, and that drop is the link row's.
- Both callers in `src/renderer/tree/use-tree-drag.ts` (the dragover, which draws the ring, and the drop, which moves) hand
  it the row they already read. Required, so a later caller cannot leave it out and reopen the hole without a compile
  error.
- Tests. `p343-links.test.ts`: every existing `besideLinkDrop` case passes the row it stands for, and a new case, "a move
  dropped over ANY row under a link is refused, and only the link row itself lands beside it", holds a file row inside
  `.claude/skills/` and `linkIn/`, a link to a file inside a link, a folder row under the link, the link row itself
  (`.claude/`) and the chain row folded into the link with the pointer on the link's segment (`.claude/`).
  `p343-link-hooks.test.ts` H4, through the SHIPPING `useTreeDrag` on this Mac and on another machine: a move over
  `.claude/skills/notes.md` and over `.claude/skills/a-skill/` leaves the dragover unprevented with `dropEffect` `none`,
  sets no state at all (no row ring, no root ring) and calls `ops.drop` never; the link row in the same mount still lands
  in `.claude/`, ringed. With the file test removed the new cases go red (the ablation below).
- `ablation:p343` gains `a-dr6` (the file test removed), `a-dr7` (the drop handing no row) and `a-dr8` (the dragover handing
  no row), each newly red on its owner.

**N3, the nits.**
1. §0's drop row and D25 said the move over a link row lands beside it "as today" on both computers. On another machine
   at the parent the link was already a folder, the library aimed the move INTO it, and the far write refused it ("…that
   folder is outside it. Nothing was changed.", the reverify's `rdrive3`, arms B, C and D at the parent). Both now say it
   per computer: on this Mac as today; on another machine a tree move lands beside the link where today it was refused
   (no scenario worse), and a Finder drop stays refused (Phase 154). §0 gains a row for a drop over a row under a link
   (refused, no ring, both computers); §5 and §9.2 name the narrow fix. The fix round's F2 paragraph above is left as it was
   written; this paragraph corrects it.
2. CLAUDE.md's `probe:p343` cost is the reverify's measurement: about 13 minutes, 775 s in all, the parent 512 s and HEAD
   262 s, at a load average of 5 to 11, with R3's and R4's close made real.
3. The reverify's r5 (a link row at the project root arming no root ring, `armRoot(false)`) now has an owner: H4's "a move
   over a link at the root lands at the root, under the root's ring" requires the dragover to set exactly `true` and the
   drop `false`; `ablation:p343`'s `a-dr9` is that arm, newly red. The reverify's r1 (the link row's Open With subject in
   folder spelling) is an EQUIVALENT MUTANT and no test can own it: `absOf` (`tree-paths.ts:38-41`) trims the canonical
   slash before the subject leaves the renderer, so `.claude/skills/` and `.claude/skills` reach main as the same absolute
   path at the apps query and at the launch alike. H3's link-row case now also presses the submenu's `Open in Default App`
   and requires the LAUNCH to hand main `/p/proj/.claude/skills`, beside the query it already read; r1 applied in a clone
   leaves that case green (21 of 21, `scratchpad/p343/fixer-2/r1.mjs`), which is the equivalence, measured.

**Files changed by this round:** `build/p343/probe-p343.mjs`, `build/p343/ablation.mjs`, `build/p343/SPEC.md`, `CLAUDE.md`,
`src/renderer/tree/tree-paths.ts`, `src/renderer/tree/use-tree-drag.ts`, `src/renderer/tree/__tests__/p343-links.test.ts`,
`src/renderer/tree/__tests__/p343-link-hooks.test.ts`.

**The fixer's commands** (every one under a scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` or
`SSH_AUTH_SOCK`; no Electron, no tmux, no ssh, no agent, no token; load average 9 to 15):

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 18 s; 1,421 production files, 0 boundary violations, 0 runtime cycles, shared types OK |
| `npm run -s build` | 0 | 36 s; `gate:electron` 170 against a floor of 170 (no new script reaches the helper), `gate:background` 3 starts each in a `finally`, `gate:checks` 263 classified, `conformance:ios`, `conformance:harnessprobes`, the contract byte for byte |
| vitest over `src/renderer/tree`, `src/main/fs`, `src/main/machines` | 0 | 149 files, 3,422 tests passed, 14 s |
| `conformance:machines` | 0 | 24 s; `tree-list read 3 851 all quoted` |
| `conformance:containment` | 0 | 2 s; 52 readings, 10 of 10 ablations red |
| `gate:electron`, `gate:background`, `gate:checks`, `gate:contract` (each alone) | 0 each | as inside the build |
| `node build/p343/ablation.mjs --self-test` / `--list` | 0 / 0 | 16 of 16; 73 arms: main 9, machines 5, tree 50, editor 8, control 1 |
| `npm run -s ablation:p343` | 0 | 245 s; bases green (main 58, tree 115, editor 30 cases, machines); 72 ablations each newly red on its owner, `a-dr6` to `a-dr9` among them, the control green; every clone file restored by sha256, the clone gone |
| `node build/p343/probe-p343.mjs --grader-self-test` | 0 | 57 clauses, 198 checks, nothing started |
| `node scratchpad/p343/fixer-2/r1.mjs` | 0 | the hook suite 21 of 21 at base and 21 of 21 with r1 applied in a `cp -Rc` clone; the clone removed, the worktree's `use-tree-menu.ts` unmoved by sha256 |

His `~/.zsh_history` read `733966 1791325581` and `~/.bash_history` `23166 1790702242` before the first command, around
every command above, and after the last; neither moved.

**Owed to the operator's landing, not to a further round** (his ruling): `probe:p343` was not re-run by this round, which
launches no Electron. N1 is a tooling fix whose effect is that L3's drop now carries a file; N2 changes no gesture the
probe drives (it intercepts and cancels tree drags). `probe:p336` (without H5) and `probe:p268` at HEAD stay owed as the
fix round recorded, for the same reason.

## §As built — 343's folded-row fix (2026-10-07)

The reverify after the narrow fix found one product minor, worse than today, and two nits, and the operator ruled: **"Tiny
fix + recheck that case"**. This round is the tiny fix and items 1 to 3 alone; the recheck is the reverify's. No Electron
was launched, nothing was committed, staged or stashed, and no file under `/Users/gdc/gmux` was touched; every command ran
with `/private/tmp/wt-p343` or this round's scratch as its working directory, under a scratch HOME and ZDOTDIR,
`HISTFILE=/dev/null`, no `TERM_SESSION_ID` or `SSH_AUTH_SOCK`. The shared lock was not taken: it guards Electron runs, and
this round started none.

**G1, a row that folds a link with the one folder it holds (product, minor, worse than today).** Once a link holding
exactly ONE folder is opened, @pierre/trees folds the link and that folder into one chain row (`.claude3 / skills / only`,
or `onefold / only` beside `hold/h.txt`) whose path is its DEEPEST folder, under the link. A Finder drop read the row and
never the segment, so it landed nothing anywhere on that row; a move off every segment (the row's icon) landed nothing.
At the parent both landed beside the link. The named fix, built:
- `chainFromEvent(event)` (`src/renderer/tree/row-events.ts`, new, beside `dropDirFromEvent`) reads the chain row under
  the pointer: every segment the row draws (`data-item-flattened-subitem`, outermost first, read from the row element
  across the shadow boundary, the reach `boxOfRow` already makes) and the one the pointer is on, null when it is on the
  row but off every segment. Null for a row that is not a chain row.
- `linkAimOf(dirUnderPointer, chain, links)` (`tree-paths.ts`, new, pure) is the folder a drop is aimed at for the link
  rule: the library's own answer (`dropDirFromEvent`, which knows the segment), except OFF every segment of a row that
  folds a link, where it is the OUTERMOST link the row folds, because that point was the link's row at the parent. On a
  segment it is that segment: the link's own segment is the link row, a segment above it is that folder, a segment
  under it is still under the link. A row that folds no link keeps the library's answer.
- The MOVE (`use-tree-drag.ts`, the dragover that draws the ring and the drop that moves) hands `besideLinkDrop` that aim
  (`linkAimFromEvent`, one module-level reader) where it handed `dropDirFromEvent`. So the icon of a folded row lands
  beside the link, ringed; the link's segment is unchanged; the outer segment is still the library's own move (it aims
  there and accepts it); a segment under the link stays refused with no ring.
- The FINDER drop is aimed the way the move is: `importRowFor(row, aim, links)` (`tree-paths.ts`, new, pure) hands
  `importTargetFor` the aimed folder in place of the row for a FOLDER row at or under a link, and the row itself
  otherwise. `importTargetFor` then gives a link folder the link-row answer (beside it), a folder above the link that
  folder, and anything under the link nothing. So on a folded row the link's segment, the outer segment and the icon
  land beside the link (`.claude3/`, `hold/`; a link at the root lands at the root), the ring on the chain row that
  shows that folder; a segment under the link lands nothing.
- Unchanged, by construction and by the existing cases (none of which was edited but item 2's): a plain link row, a chain
  row ENDING at the link (`.claude / skills`, every point lands `.claude/` as before), a file row under a link (refused:
  `importRowFor` never replaces a file row, whose folder the library reads as the link), a folder row under a link, a
  chain row wholly under a link, and every row no link touches. On another machine a Finder drop is still refused before
  any aim is read (Phase 154), and a move behaves as on this Mac.

Decisions, each stated. (1) An ORDINARY chain row (`a / b / c`, no link) keeps Phase 154's Finder reading, its deepest
folder wherever the pointer is, although the library's move aims by segment there: aiming every Finder drop by segment
would move a gesture no link touches, and the ruling was that everything else stays. (2) Off every segment the aim is the
OUTERMOST link the row folds; a link inside it is under that link, and an outermost link that is itself under a link
outside the row is refused by the rules that already refuse a row under a link. (3) `importRowFor` and `linkAimOf` are new
pure functions beside the old ones rather than new required parameters, so `importTargetFor`'s Phase 154 cases and
`besideLinkDrop`'s narrow-fix cases are read exactly as they were.

What changes, by point (Finder drop / tree move; this Mac; the parent's answers are the reverify's drive, `rv2-drive`):

| Point on the row | Parent | Before this fix | After |
| --- | --- | --- | --- |
| `.claude3 / skills / only`, the link's segment | `.claude3/` / `.claude3/` | nothing / `.claude3/` | `.claude3/` / `.claude3/` |
| the outer segment `.claude3` | `.claude3/` / `.claude3/` (its own row; not driven) | nothing / `.claude3/` (the library's; not driven) | `.claude3/` / `.claude3/` (the library's) |
| the icon, off every segment | `.claude3/` / `.claude3/` | nothing / nothing | `.claude3/` / `.claude3/` |
| the segment under the link `only` | not drawn | nothing / nothing | nothing / nothing, no ring |
| `onefold / only`, the link's segment | `hold/` / `hold/` | nothing / `hold/` | `hold/` / `hold/` |
| the icon, off every segment | not driven | nothing / nothing | `hold/` / `hold/` |
| the segment under the link | not drawn | nothing / nothing | nothing / nothing |

The After column is read from the shipping hooks in the unit lane, not from the app, and the Before column from the reverify's HEAD drive where it drove that point; the app recheck is owed (below).

Tests that fail when the new aiming is removed. `p343-link-hooks.test.ts` H4, through the SHIPPING `useTreeDrag` over
the reverify's two shapes (a `FOLDED` listing; the stand-in element gained `segments` and `querySelectorAll`): "THE FOLDED
ROW from Finder", the link's segment, the outer segment, the icon (with the chain row's ring read) and the segment under
the link, for both shapes; "THE FOLDED ROW moved in the tree", the same four points on this Mac and on another machine,
each graded on where `ops.drop` landed and on every ring set, with the library's own `canDrop` read to show the icon's
drop is carried once. `p343-links.test.ts`, a new describe, "a row that folds a link with the one folder it holds": the
aim at each point, the move and the Finder drop composed as the hook composes them (a root-level link included), and
every other Finder drop kept (a file under a link, a plain link row, a row under one, an ordinary chain row).

**G2, the refusal case's nit (the reverify's rv-x3 and rv-x4).** H4's "a move dropped over ANY row under a link is refused
with no ring" now LIGHTS a ring first in the same mount, three ways (the link row, which rings `.claude/`; a link at the
root and the empty space, which arm the root's ring), then requires the refusal's dragover to set exactly `[null]` (the
row ring put out) or exactly `[false]` (the root's ring put out), and the drop to call no `ops.drop`. `ablation:p343`'s
`a-dr10` (rv-x3) and `a-dr11` (rv-x4) are those mutants, both now newly red. The reverify's rv-x5 and rv-x7, also green in
its run, were not in the ruling and are left as they are.

**G3, the nit in §0.** The row for a drop over a row UNDER a link now says that a move draws no ring on either computer
and a Finder drop draws none on this Mac, while on another machine a Finder drop keeps Phase 154's refused ring and toast,
as on every row there. The row above it names the folded row; §5 names the three new functions, and §9.2 gains the
round's arms.

`ablation:p343`: `a-dr7` and `a-dr8` follow the call they break (`linkAimFromEvent(e.nativeEvent, linksRef.current)` where
`dropDirFromEvent(e.nativeEvent)` was), and eleven arms are added: `a-fd1` (the area off every segment not read as the
link row), `a-fd2` (a point ON a segment read as it), `a-fd3` (`importRowFor` handing on the row), `a-fd4` (`importRowFor`
reading a FILE row), `a-fd5` (`importRowFor` aiming a row no link touches), `a-fd6` (`chainFromEvent` reading no
segments), `a-fd7`, `a-fd8` and `a-fd9` (the move's drop, its dragover and the Finder dragover each reading the library's
folder alone), `a-dr10` and `a-dr11` (G2). CLAUDE.md's `probe:p343` row names `importRowFor`, `linkAimOf` and
`chainFromEvent` beside the functions it named.

**Files changed by this round:** `src/renderer/tree/row-events.ts`, `src/renderer/tree/tree-paths.ts`,
`src/renderer/tree/use-tree-drag.ts`, `src/renderer/tree/__tests__/p343-link-hooks.test.ts`,
`src/renderer/tree/__tests__/p343-links.test.ts`, `build/p343/ablation.mjs`, `build/p343/SPEC.md`, `CLAUDE.md`.

**The fixer's commands** (load average 17 to 33):

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 9 s; 1,421 production files, 8,075 imports, 0 boundary violations, 0 runtime cycles, shared types OK |
| `npm run -s build` | 0 | 36 s; `gate:electron` 170 against a floor of 170, `gate:checks` 263 classified, `conformance:harnessprobes`, the contract byte for byte |
| vitest over `src/renderer/tree` and `src/main/fs` | 0 | 48 files, 818 tests passed |
| `conformance:machines` | 0 | 22 s; `tree-list read 3 851 all quoted` |
| `conformance:containment` | 0 | 2 s; 52 readings, 10 of 10 ablations red |
| `gate:electron`, `gate:background`, `gate:checks`, `gate:contract` (each alone) | 0 each | 170 against 170; 3 starts each in a `finally`, 19 of 19 fixtures; 263 classified; the contract byte for byte |
| `node build/p343/ablation.mjs --self-test` / `--list` | 0 / 0 | 16 of 16; 84 arms: main 9, machines 5, tree 61, editor 8, control 1 |
| `npm run -s ablation:p343` | 0 | 259 s; bases green (main 58, tree 121, editor 30 cases, machines); 83 ablations each newly red on its owner, `a-fd1` to `a-fd9`, `a-dr10` and `a-dr11` among them, the control green; every clone file restored by sha256, the clone gone |
| `node build/p343/probe-p343.mjs --grader-self-test` | 0 | 57 clauses, 198 checks, nothing started |

His `~/.zsh_history` read `734376 1791391290` and `~/.bash_history` `23166 1790702242` before the first command, around
every command above, and after the last; neither moved. (The zsh figure differs from the earlier rounds' `733966
1791325581` before this round began: his own terminals write it.)

**Owed to the reverify** (his "recheck that case"; under the lock, parent first): the reverify's own drive (`rv2-drive`)
over `.claude3 / skills / only` and `hold`'s `onefold / only` at HEAD, a Finder drop and a tree move on the link's segment,
the outer segment, the icon and the segment under the link, on this Mac, and the tree move on the loopback machine, with
where each landed and the ring's rectangle read; and every other row of its table unchanged. `probe:p336` (without H5) and
`probe:p268` at HEAD stay owed as the fix round recorded.
